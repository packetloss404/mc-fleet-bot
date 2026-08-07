"""Tests for the phase diff logic."""

from __future__ import annotations

from typing import Any

from mcwb.build.diff import compute_diff
from mcwb.state import State, PhaseRecord


class _FakeMasterplan:
    """Minimal masterplan shim for the diff tests."""

    def __init__(self, build_id="b1", version="1.0", phases=None):
        self.build_id = build_id
        self.version = version
        self.spec_version = "0.1"
        self.edition = "java"
        self.brief: dict[str, Any] = {
            "spec_version": "0.1",
            "edition": "java",
            "java_version": "1.21",
            "version": version,
            "phases": phases or [],
        }


def test_fresh_world_marks_all_phases_dirty() -> None:
    plan = _FakeMasterplan(phases=[
        {"phase": 1, "name": "Site Prep", "block_budget": 50_000},
        {"phase": 2, "name": "Mountain", "block_budget": 1_000_000},
    ])
    diff = compute_diff(plan, state=None)
    assert len(diff) == 2
    assert all(d.is_dirty for d in diff)
    assert all(d.reason == "new" for d in diff)


def test_unchanged_phases_are_clean() -> None:
    phases = [
        {"phase": 1, "name": "Site Prep", "block_budget": 50_000},
        {"phase": 2, "name": "Mountain", "block_budget": 1_000_000},
    ]
    plan = _FakeMasterplan(version="1.0", phases=phases)

    # Build the state by computing the diff once.
    from mcwb.build.diff import _hash_payload
    from mcwb.build.phase_generator import phase_slug

    state = State(
        build_id="b1", brief_version="1.0", spec_version="0.1",
        edition="java", java_version="1.21", applied_at=0.0,
    )
    for p in phases:
        state.phases[phase_slug(p)] = PhaseRecord(
            phase_number=p["phase"],
            spec_hash=_hash_payload(p),
            blocks_written=p["block_budget"],
            applied_at=0.0,
        )

    diff = compute_diff(plan, state)
    assert len(diff) == 2
    assert not any(d.is_dirty for d in diff)


def test_changed_phase_is_dirty() -> None:
    plan_v1 = _FakeMasterplan(version="1.0", phases=[
        {"phase": 1, "name": "Site Prep", "block_budget": 50_000},
    ])
    plan_v2 = _FakeMasterplan(version="1.0", phases=[
        {"phase": 1, "name": "Site Prep", "block_budget": 75_000},  # budget changed
    ])
    from mcwb.build.diff import _hash_payload
    from mcwb.build.phase_generator import phase_slug
    state = State(
        build_id="b1", brief_version="1.0", spec_version="0.1",
        edition="java", java_version="1.21", applied_at=0.0,
    )
    state.phases[phase_slug(plan_v1.brief["phases"][0])] = PhaseRecord(
        phase_number=1, spec_hash=_hash_payload(plan_v1.brief["phases"][0]),
        blocks_written=50_000, applied_at=0.0,
    )
    diff = compute_diff(plan_v2, state)
    assert len(diff) == 1
    assert diff[0].is_dirty
    assert diff[0].reason == "changed"


def test_brief_version_change_dirties_everything() -> None:
    plan_v1 = _FakeMasterplan(version="1.0", phases=[
        {"phase": 1, "name": "Site Prep", "block_budget": 50_000},
    ])
    plan_v2 = _FakeMasterplan(version="2.0", phases=[
        {"phase": 1, "name": "Site Prep", "block_budget": 50_000},
    ])
    from mcwb.build.diff import _hash_payload
    from mcwb.build.phase_generator import phase_slug
    state = State(
        build_id="b1", brief_version="1.0", spec_version="0.1",
        edition="java", java_version="1.21", applied_at=0.0,
    )
    state.phases[phase_slug(plan_v1.brief["phases"][0])] = PhaseRecord(
        phase_number=1, spec_hash=_hash_payload(plan_v1.brief["phases"][0]),
        blocks_written=50_000, applied_at=0.0,
    )
    diff = compute_diff(plan_v2, state)
    assert all(d.is_dirty for d in diff)
    assert all(d.reason == "brief_changed" for d in diff)
