"""QA verifier.

Runs the 10-point acceptance list from the contractor brief against a
built world. Each check returns a ``CheckResult`` with pass/fail and
evidence. Some checks are mechanical (a block exists at coords) and
some are visual (a journey takes 30-45 min) — visual checks are
noted as "deferred" for v0.3 and don't fail the build.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str
    deferred: bool = False  # visual checks we can't run yet


@dataclass
class VerificationReport:
    build_id: str
    checks: list[CheckResult] = field(default_factory=list)

    @property
    def passed(self) -> bool:
        return all(c.passed for c in self.checks if not c.deferred)

    @property
    def total(self) -> int:
        return len(self.checks)

    @property
    def passed_count(self) -> int:
        return sum(1 for c in self.checks if c.passed)


def _read_jsonl(path: Path) -> list[tuple]:
    if not path.exists():
        return []
    out: list[tuple] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                v = json.loads(line)
                if isinstance(v, list) and len(v) == 4:
                    out.append(tuple(v))
            except json.JSONDecodeError:
                continue
    return out


def _block_at(blocks: list[tuple], x: int, y: int, z: int) -> str | None:
    for entry in blocks:
        if entry[0] == x and entry[1] == y and entry[2] == z:
            return entry[3]
    return None


def _any_block_at(blocks: list[tuple], x: int, y: int, z: int) -> bool:
    return _block_at(blocks, x, y, z) is not None


def run_verification(world_dir: Path, masterplan: Any) -> VerificationReport:
    """Run the mechanical QA checks against ``world_dir``.

    Mechanical checks:
      1. World has a summary file (build was applied)
      2. State file exists
      3. State build_id matches brief
      4. All 7 centerpieces have a marker block near their position
      5. All 9 easter eggs have a marker block at their position
      6. Each phase from the brief has a record in the state
      7. World file (.mcwb-blocks.jsonl or amulet level.dat) is non-empty

    Visual checks (deferred for v0.3):
      - silhouette reads from 1 mile
      - contact ring visible
      - journey takes 30-45 min
      - return takes 13 min
      - blast door visible from approaching minecart
    """
    brief = masterplan.brief
    report = VerificationReport(build_id=masterplan.build_id)

    # 1. Summary file.
    summary_path = world_dir / ".mcwb-summary.json"
    if not summary_path.exists():
        report.checks.append(CheckResult(
            name="world has summary",
            passed=False,
            detail=f"missing {summary_path}; the world was never written to",
        ))
        return report
    report.checks.append(CheckResult(
        name="world has summary",
        passed=True,
        detail=str(summary_path),
    ))

    # 2. State file.
    state_path = world_dir / ".mcwb-state.json"
    if not state_path.exists():
        report.checks.append(CheckResult(
            name="state file exists",
            passed=False,
            detail=f"missing {state_path}",
        ))
    else:
        report.checks.append(CheckResult(
            name="state file exists",
            passed=True,
            detail=str(state_path),
        ))

    # 3. State build_id matches.
    if state_path.exists():
        with state_path.open("r", encoding="utf-8") as f:
            st = json.load(f)
        if st.get("build_id") != masterplan.build_id:
            report.checks.append(CheckResult(
                name="state build_id matches",
                passed=False,
                detail=f"state has {st.get('build_id')!r}, brief has {masterplan.build_id!r}",
            ))
        else:
            report.checks.append(CheckResult(
                name="state build_id matches",
                passed=True,
                detail=f"build_id={masterplan.build_id}",
            ))

    # 4-6: read block log if available.
    blocks = _read_jsonl(world_dir / ".mcwb-blocks.jsonl")
    if not blocks:
        report.checks.append(CheckResult(
            name="world has blocks",
            passed=False,
            detail="no block log found; the build wrote zero blocks",
        ))
    else:
        report.checks.append(CheckResult(
            name="world has blocks",
            passed=True,
            detail=f"{len(blocks):,} block changes",
        ))

    # 4. Centerpieces.
    cp_count = 0
    for cp in brief.get("centerpieces", []):
        pos = cp.get("position", {})
        x, y, z = pos.get("x"), pos.get("y"), pos.get("z")
        if _any_block_at(blocks, int(x), int(y), int(z)):
            cp_count += 1
    report.checks.append(CheckResult(
        name="centerpieces present",
        passed=cp_count == len(brief.get("centerpieces", [])),
        detail=f"{cp_count}/{len(brief.get('centerpieces', []))} centerpieces have a block at their position",
    ))

    # 5. Easter eggs.
    ee_count = 0
    for egg in brief.get("easter_eggs", []):
        pos = egg.get("position", {})
        x, y, z = pos.get("x"), pos.get("y"), pos.get("z")
        if _any_block_at(blocks, int(x), int(y), int(z)):
            ee_count += 1
    report.checks.append(CheckResult(
        name="easter eggs present",
        passed=ee_count == len(brief.get("easter_eggs", [])),
        detail=f"{ee_count}/{len(brief.get('easter_eggs', []))} easter eggs have a block at their position",
    ))

    # 6. All phases recorded.
    from mcwb.build.phase_generator import phase_slug
    if state_path.exists():
        with state_path.open("r", encoding="utf-8") as f:
            st = json.load(f)
        recorded = set(st.get("phases", {}).keys())
        expected = {phase_slug(p) for p in brief.get("phases", []) if isinstance(p, dict)}
        missing = expected - recorded
        report.checks.append(CheckResult(
            name="all phases recorded",
            passed=not missing,
            detail=(
                f"all {len(expected)} phases recorded" if not missing
                else f"missing phases: {sorted(missing)}"
            ),
        ))

    # 7. Visual checks (deferred).
    for visual in (
        "silhouette reads from 1 mile",
        "contact ring visible on south face",
        "journey duration 30-45 min",
        "return duration ~13 min",
        "blast door visible from approaching minecart",
    ):
        report.checks.append(CheckResult(
            name=visual,
            passed=True,
            detail="deferred to v0.3 (visual check, no mechanical runner yet)",
            deferred=True,
        ))

    return report
