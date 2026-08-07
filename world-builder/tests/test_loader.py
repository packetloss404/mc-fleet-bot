"""Tests for the masterplan loader.

The primary fixture is the real ``04-combined-complex`` masterplan from
``D:/projects/mc-fleet-bot/masterplans/`` — a full production spec
authored independently. If these tests pass, the schema is sound and
the loader handles real-world input.

The source path is configurable via the ``MCWB_FIXTURE_PLAN_DIR`` env var
so the tests work on machines where the masterplan lives elsewhere.
"""

from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

from mcwb.spec import MasterplanError, load_masterplan


# Resolve the canonical fixture path. The fixture is the user's real
# masterplan — copied in once at test-collection time.
FIXTURES_DIR = Path(__file__).resolve().parent / "fixtures"
SOURCE_PLAN_DIR = Path(
    os.environ.get(
        "MCWB_FIXTURE_PLAN_DIR",
        r"D:\projects\mc-fleet-bot\masterplans\04-combined-complex",
    )
)
FIXTURE_PLAN_DIR = FIXTURES_DIR / "04-combined-complex"


def _ensure_fixture() -> None:
    """Copy the source masterplan into the test fixtures dir if missing."""
    if not SOURCE_PLAN_DIR.exists():
        pytest.skip(
            f"source masterplan not found at {SOURCE_PLAN_DIR} — "
            f"this test requires the real mc-fleet-bot 04-combined-complex brief"
        )
    FIXTURES_DIR.mkdir(parents=True, exist_ok=True)
    if not FIXTURE_PLAN_DIR.exists():
        shutil.copytree(SOURCE_PLAN_DIR, FIXTURE_PLAN_DIR)


def test_real_masterplan_loads() -> None:
    """The real 04-combined-complex brief must validate clean."""
    _ensure_fixture()
    plan = load_masterplan(FIXTURE_PLAN_DIR)
    assert plan.build_id == "04-combined-complex"
    assert plan.edition in ("java",)  # MVP supports java only
    assert plan.block_budget_total > 0
    assert len(plan.phases) == plan.brief.get("phase_count")


def test_real_masterplan_has_key_sections() -> None:
    """Sanity check that all the canonical sections are present."""
    _ensure_fixture()
    plan = load_masterplan(FIXTURE_PLAN_DIR)
    for key in (
        "scale",
        "world_footprint",
        "mountain_layout",
        "horizontal_zones",
        "subterranean_zones",
        "key_locations",
        "inter_site_connections",
        "block_palette",
        "centerpieces",
        "easter_eggs",
        "visitor_journey",
    ):
        assert key in plan.brief, f"missing required section: {key}"


def test_real_masterplan_phase_budget_balances() -> None:
    """Phase block counts should sum close to block_budget_total.

    Drift >5% is a soft warning, not a hard error — authors may inherit
    blocks from sibling masterplans. The test asserts the warning is
    surfaced rather than silently swallowed.
    """
    _ensure_fixture()
    plan = load_masterplan(FIXTURE_PLAN_DIR)
    total = plan.block_budget_total
    phase_sum = plan.phase_budget_total
    drift = abs(phase_sum - total) / max(total, 1)
    if drift > 0.05:
        # Drift is real; we expect a warning to have been raised.
        assert any("drift" in w or "phases sum" in w for w in plan.validation.warnings), (
            f"phase budget drift {drift:.1%} but no warning surfaced"
        )
    else:
        # Tight budget — should be no drift warning.
        assert not any("drift" in w for w in plan.validation.warnings)


def test_missing_brief_raises() -> None:
    """A directory without contractor-brief.json fails fast with a useful error."""
    with pytest.raises(MasterplanError, match="contractor brief not found"):
        load_masterplan(FIXTURES_DIR)


def test_nonexistent_dir_raises() -> None:
    """A path that isn't a directory at all fails fast."""
    with pytest.raises(MasterplanError, match="not a directory"):
        load_masterplan(FIXTURES_DIR / "does-not-exist")


def test_spec_version_is_injected_for_legacy_briefs() -> None:
    """Old briefs without spec_version get the current version injected."""
    _ensure_fixture()
    plan = load_masterplan(FIXTURE_PLAN_DIR)
    # The real 04-combined-complex brief pre-dates the spec_version field.
    # The loader should inject it so downstream code can rely on it.
    assert "spec_version" in plan.brief
    assert plan.spec_version == "0.1"
