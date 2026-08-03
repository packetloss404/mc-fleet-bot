"""Masterplan loader.

A masterplan is a directory produced by an upstream planner (e.g.
mc-fleet-bot). The canonical layout mcwb looks for::

    <plan_dir>/
      build-info.json
      04-contractor/
        contractor-brief.json     # binding spec
        contractor-brief.md       # narrative (optional, for LLM enrichment later)

The loader resolves both files, validates the brief against
``schemas/contractor-brief.schema.json``, and returns a typed
``Masterplan`` object.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from jsonschema import Draft7Validator

from mcwb import __spec_version__

# Where the bundled JSON Schema lives. The schema is also the contract;
# any change to it is a spec version bump.
_SCHEMA_PATH = Path(__file__).resolve().parent.parent.parent / "schemas" / "contractor-brief.schema.json"


class MasterplanError(Exception):
    """Raised when a masterplan directory is missing, malformed, or invalid."""


@dataclass(frozen=True)
class ValidationResult:
    """Outcome of validating a masterplan: hard errors and soft warnings."""

    errors: list[str]
    warnings: list[str]

    @property
    def ok(self) -> bool:
        return not self.errors


@dataclass(frozen=True)
class Masterplan:
    """A loaded and validated masterplan."""

    plan_dir: Path
    build_info: dict[str, Any]
    brief: dict[str, Any]
    validation: ValidationResult

    @property
    def build_id(self) -> str:
        return self.brief["build_id"]

    @property
    def version(self) -> str:
        return self.brief["version"]

    @property
    def spec_version(self) -> str:
        return self.brief.get("spec_version", "0.0")

    @property
    def edition(self) -> str:
        return self.brief.get("edition", "java")

    @property
    def block_budget_total(self) -> int:
        return int(self.brief["block_budget_total"])

    @property
    def phases(self) -> list[dict[str, Any]]:
        """Build phases, sorted by phase number. Each is a dict with
        ``phase``, ``name``, ``block_budget``, and optional metadata."""
        phases = list(self.brief["phases"])
        phases.sort(key=lambda p: p.get("phase", 0) if isinstance(p, dict) else 0)
        return phases

    @property
    def phase_budget_total(self) -> int:
        """Sum of all phase block_budget fields. The author's own sum,
        which may differ from ``block_budget_total`` by a few percent."""
        return sum(
            int(p.get("block_budget", 0))
            for p in self.brief["phases"]
            if isinstance(p, dict)
        )


def _read_json(path: Path) -> dict[str, Any]:
    try:
        with path.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError as e:
        raise MasterplanError(f"file not found: {path}") from e
    except json.JSONDecodeError as e:
        raise MasterplanError(f"invalid JSON in {path}: {e}") from e
    if not isinstance(data, dict):
        raise MasterplanError(f"{path} must be a JSON object, got {type(data).__name__}")
    return data


def _load_schema() -> dict[str, Any]:
    if not _SCHEMA_PATH.exists():
        raise MasterplanError(f"bundled schema missing: {_SCHEMA_PATH}")
    return _read_json(_SCHEMA_PATH)


def _validate(brief: dict[str, Any]) -> list[str]:
    """Return a list of human-readable validation errors. Empty = valid.

    These are hard errors (schema violations, missing required fields, etc.).
    """
    schema = _load_schema()
    validator = Draft7Validator(schema)
    return [
        f"{'.'.join(str(p) for p in err.absolute_path) or '<root>'}: {err.message}"
        for err in sorted(validator.iter_errors(brief), key=lambda e: e.absolute_path)
    ]


def _check_phase_budget(brief: dict[str, Any]) -> tuple[list[str], list[str]]:
    """Cross-field check: sum of phase block_budget fields vs block_budget_total.

    Returns (errors, warnings). Per-phase sum mismatches are warnings, not
    errors — the author may have inherited blocks from sibling masterplans
    that aren't double-counted in the per-phase budgets. We surface the
    drift so the author can decide.
    """
    errors: list[str] = []
    warnings: list[str] = []
    phases = brief.get("phases")
    total = brief.get("block_budget_total")
    if isinstance(phases, list) and isinstance(total, int):
        phase_sum = 0
        for i, p in enumerate(phases):
            if not isinstance(p, dict):
                continue
            budget = p.get("block_budget")
            if isinstance(budget, (int, float)):
                phase_sum += int(budget)
            else:
                errors.append(f"phases[{i}].block_budget is missing or not a number")
        if total > 0:
            drift = (phase_sum - total) / total
            if abs(drift) > 0.05:
                direction = "over" if drift > 0 else "under"
                warnings.append(
                    f"phases sum to {phase_sum:,} blocks but block_budget_total "
                    f"is {total:,} ({abs(drift):.1%} {direction}). The author may "
                    f"be excluding inherited site blocks from per-phase counts, "
                    f"or this is a real inconsistency to investigate."
                )
    return errors, warnings


def _check_phase_count(brief: dict[str, Any]) -> list[str]:
    """Cross-field check: len(phases) should equal phase_count."""
    errors: list[str] = []
    phases = brief.get("phases")
    count = brief.get("phase_count")
    if isinstance(phases, list) and isinstance(count, int):
        if len(phases) != count:
            errors.append(
                f"phases has {len(phases)} entries but phase_count is {count}"
            )
    return errors


def _check_phase_numbers_unique(brief: dict[str, Any]) -> list[str]:
    """Cross-field check: phase numbers must be unique 1..N.

    Catches the easy mistake of having two phases with the same ``phase``
    field, which would silently break the phase diff logic in v0.2.
    """
    errors: list[str] = []
    phases = brief.get("phases")
    if not isinstance(phases, list):
        return errors
    seen: set[int] = set()
    duplicates: list[int] = []
    for p in phases:
        if not isinstance(p, dict):
            continue
        n = p.get("phase")
        if isinstance(n, int):
            if n in seen:
                duplicates.append(n)
            seen.add(n)
    if duplicates:
        errors.append(f"duplicate phase numbers: {sorted(set(duplicates))}")
    return errors


def _check_spec_version(brief: dict[str, Any]) -> list[str]:
    """Warn if the brief targets a spec version newer than this tool knows about."""
    errors: list[str] = []
    spec_version = brief.get("spec_version")
    if spec_version and spec_version != __spec_version__:
        # Permissive: only an error if major version differs.
        try:
            brief_major = int(spec_version.split(".")[0])
            tool_major = int(__spec_version__.split(".")[0])
            if brief_major > tool_major:
                errors.append(
                    f"brief targets spec_version {spec_version} but mcwb "
                    f"{__spec_version__} only supports major {tool_major}; "
                    f"upgrade mcwb"
                )
        except (ValueError, IndexError):
            errors.append(f"spec_version {spec_version!r} is not a valid MAJOR.MINOR string")
    return errors


def _ensure_spec_version(brief: dict[str, Any]) -> dict[str, Any]:
    """Inject spec_version, edition, and java_version if missing.

    Existing briefs predate these fields. We default-inject so downstream
    code can rely on them, and so the schema's required-field check passes.
    """
    if "spec_version" not in brief:
        brief = dict(brief)
        brief["spec_version"] = __spec_version__
    if "edition" not in brief:
        brief = dict(brief)
        brief["edition"] = "java"
    if "java_version" not in brief:
        # Heuristic: pull from mod_dependencies (e.g. "CubicWorld 2,048" doesn't
        # help; we just default to 1.21 since that's the current palette).
        # If the brief has an explicit java_version field elsewhere, prefer that.
        brief = dict(brief)
        brief["java_version"] = "1.21"
    return brief


def load_spec(plan_dir: Path) -> tuple[dict[str, Any], ValidationResult]:
    """Load and validate the contractor brief in ``plan_dir``.

    Returns ``(brief, validation)``. The brief is the raw dict (with
    default-injected fields applied). The validation result separates
    hard errors (always raised via ``MasterplanError``) from soft warnings
    (surfaced to the user).
    """
    plan_dir = plan_dir.resolve()
    if not plan_dir.is_dir():
        raise MasterplanError(f"plan_dir is not a directory: {plan_dir}")

    brief_path = plan_dir / "04-contractor" / "contractor-brief.json"
    if not brief_path.exists():
        raise MasterplanError(
            f"contractor brief not found at {brief_path} "
            f"(expected: <plan_dir>/04-contractor/contractor-brief.json)"
        )

    brief = _read_json(brief_path)
    brief = _ensure_spec_version(brief)

    errors: list[str] = []
    warnings: list[str] = []
    errors.extend(_validate(brief))
    errors.extend(_check_spec_version(brief))
    phase_errors, phase_warnings = _check_phase_budget(brief)
    errors.extend(phase_errors)
    warnings.extend(phase_warnings)
    errors.extend(_check_phase_count(brief))
    errors.extend(_check_phase_numbers_unique(brief))

    if errors:
        bullet = "\n  - ".join(errors)
        raise MasterplanError(
            f"masterplan at {plan_dir} failed validation:\n  - {bullet}"
        )

    return brief, ValidationResult(errors=[], warnings=warnings)


def load_build_info(plan_dir: Path) -> dict[str, Any]:
    """Load ``build-info.json``. Optional — returns empty dict if missing."""
    plan_dir = plan_dir.resolve()
    info_path = plan_dir / "build-info.json"
    if not info_path.exists():
        return {}
    return _read_json(info_path)


def load_masterplan(plan_dir: Path) -> Masterplan:
    """Load a masterplan directory: brief + build-info, both validated.

    The returned ``Masterplan.validation`` carries the full result:
    hard errors (always raised via ``MasterplanError``) and soft warnings
    (surfaced for the author to review).
    """
    build_info = load_build_info(plan_dir)
    brief, validation = load_spec(plan_dir)
    return Masterplan(
        plan_dir=plan_dir.resolve(),
        build_info=build_info,
        brief=brief,
        validation=validation,
    )
