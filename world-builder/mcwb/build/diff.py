"""Phase-level diff against the world state.

Given a masterplan and the current world state, figure out which phases
need to be (re)applied. A phase is dirty when:

- The state has no record of it (never applied)
- The state's spec hash for the phase doesn't match the current phase hash
- The brief_version changed since the last apply (entire brief is dirty)

If the brief_version changed, EVERY phase is dirty. If only individual
phase specs changed, only those phases are dirty.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from mcwb.state import State


@dataclass(frozen=True)
class PhaseDiff:
    phase_number: int
    phase_name: str
    slug: str
    is_dirty: bool
    reason: str  # "new" | "changed" | "unchanged" | "brief_changed"
    spec_hash: str


def _hash_payload(payload: Any) -> str:
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()[:16]


def compute_diff(masterplan: Any, state: State | None) -> list[PhaseDiff]:
    """Walk the masterplan's phases and return a diff per phase.

    If state is None (fresh world), all phases are dirty ("new").
    If state.brief_version != masterplan.version, all phases are dirty
    with reason="brief_changed".
    """
    brief = masterplan.brief
    phases = brief.get("phases", [])
    diffs: list[PhaseDiff] = []

    brief_version_changed = (
        state is not None
        and state.brief_version != masterplan.version
    )

    for phase in phases:
        if not isinstance(phase, dict):
            continue
        n = phase.get("phase", 0)
        name = phase.get("name", "unknown")
        spec_hash = _hash_payload(phase)
        # Use the phase's own hash as the slug key in state, so it
        # survives renames.
        from mcwb.build.phase_generator import phase_slug
        slug = phase_slug(phase)

        if state is None:
            diffs.append(PhaseDiff(n, name, slug, True, "new", spec_hash))
            continue

        if brief_version_changed:
            diffs.append(PhaseDiff(n, name, slug, True, "brief_changed", spec_hash))
            continue

        record = state.phases.get(slug)
        if record is None:
            diffs.append(PhaseDiff(n, name, slug, True, "new", spec_hash))
        elif record.spec_hash != spec_hash:
            diffs.append(PhaseDiff(n, name, slug, True, "changed", spec_hash))
        else:
            diffs.append(PhaseDiff(n, name, slug, False, "unchanged", spec_hash))

    return diffs
