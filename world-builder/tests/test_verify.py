"""Tests for the QA verifier."""

from __future__ import annotations

from pathlib import Path

import pytest

from mcwb.spec import load_masterplan
from mcwb.verify import run_verification

# mcwb lives inside mc-fleet-bot as world-builder/, so the masterplans it
# consumes are two directories up. The previous default was an absolute
# Windows path that also omitted `docs/`, so these tests skipped on every
# machine including the author's. Env var still wins for deployed runs.
_REPO_PLAN_DIR = (
    Path(__file__).resolve().parents[2] / "docs" / "masterplans" / "04-combined-complex"
)



def test_verify_fresh_world_fails_summary_check(tmp_path: Path) -> None:
    brief_path = Path(
        _REPO_PLAN_DIR / "04-contractor" / "contractor-brief.json"
    )
    if not brief_path.exists():
        pytest.skip(f"brief not found: {brief_path}")
    plan_dir = brief_path.parent.parent
    plan = load_masterplan(plan_dir)
    report = run_verification(tmp_path, plan)
    assert not any(
        c.passed for c in report.checks
        if not c.deferred and c.name in ("world has summary", "state file exists")
    )


def test_verify_after_build_passes(tmp_path: Path) -> None:
    """Build a synthetic world and verify it."""
    from tests.test_build import SYNTHETIC_BRIEF, _SyntheticMasterplan
    from mcwb.build import run_build
    from mcwb.build.writer import JsonWorldWriter

    world = tmp_path / "world"
    plan = _SyntheticMasterplan(SYNTHETIC_BRIEF)
    run_build(plan, world, writer=JsonWorldWriter())

    report = run_verification(world, plan)
    # The mechanical checks should all pass.
    mechanical = [c for c in report.checks if not c.deferred]
    for c in mechanical:
        assert c.passed, f"check {c.name!r} failed: {c.detail}"


def test_verify_handles_missing_world(tmp_path: Path) -> None:
    from tests.test_build import SYNTHETIC_BRIEF, _SyntheticMasterplan
    plan = _SyntheticMasterplan(SYNTHETIC_BRIEF)
    report = run_verification(tmp_path / "never_built", plan)
    assert any(not c.passed for c in report.checks)
