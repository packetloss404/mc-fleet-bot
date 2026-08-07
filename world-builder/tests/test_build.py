"""End-to-end build tests.

Builds a synthetic small masterplan through the full pipeline, asserts
the world file is written, the state is updated, and re-running is a
no-op (idempotent).
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mcwb.build import run_build
from mcwb.build.writer import JsonWorldWriter
from mcwb.spec import load_masterplan


SYNTHETIC_BRIEF = {
    "spec_version": "0.1",
    "build_name": "Tiny Test World",
    "build_id": "tiny-test",
    "version": "1.0",
    "edition": "java",
    "java_version": "1.21",
    "description": "A tiny synthetic masterplan for end-to-end tests",
    "scale": {"global_block_size": "1 block = 1 meter"},
    "build_height_required": 256,
    "build_height_recommended": 384,
    "mod_dependencies": [],
    "recommended_mod": "vanilla",
    "render_distance_chunks": 8,
    "simulation_distance_chunks": 6,
    "world_footprint": {
        "width_blocks": 64,
        "length_blocks": 64,
        "height_blocks": 128,
        "min_y": 0,
        "max_y": 128,
    },
    "world_origin": {"x": 0, "y": 0, "z": 0},
    "compass_orientation": "north=-z, east=+x, up=+y",
    "mountain_layout": {},
    "horizontal_zones": {},
    "subterranean_zones": {},
    "key_locations": {
        "spawn": {"x": 0, "y": 64, "z": 0, "description": "spawn point"},
        "city_footprint": {
            "x_min": -10, "x_max": 10, "y_min": 60, "y_max": 65,
            "z_min": -10, "z_max": 10, "description": "tiny city",
        },
    },
    "inter_site_connections": {},
    "individual_sites": {},
    "block_palette": {},
    "phases": [
        {"phase": 1, "name": "Site Prep", "block_budget": 4096, "estimated_time_hours": 0.1},
        {"phase": 3, "name": "City", "block_budget": 4096, "estimated_time_hours": 0.1},
    ],
    "block_budget_total": 8192,
    "phase_count": 2,
    "centerpieces": [
        {
            "id": "spawn_marker",
            "name": "Spawn Marker",
            "type": "marker",
            "position": {"x": 0, "y": 64, "z": 0},
            "block_spec": "minecraft:stone",
        }
    ],
    "easter_eggs": [],
    "visitor_journey": {},
}


class _SyntheticMasterplan:
    def __init__(self, brief):
        self.brief = brief
        self.build_id = brief["build_id"]
        self.version = brief["version"]
        self.spec_version = brief["spec_version"]
        self.edition = brief["edition"]
        self.block_budget_total = brief["block_budget_total"]
        self.phases = brief["phases"]


def test_build_end_to_end(tmp_path: Path) -> None:
    """A fresh build writes blocks + summary + state + litematic files."""
    world = tmp_path / "world"
    plan = _SyntheticMasterplan(SYNTHETIC_BRIEF)
    state, results = run_build(plan, world, writer=JsonWorldWriter())

    # 2 phases + 1 centerpieces marker.
    assert len(results) == 3
    # Each phase writes blocks; the centerpieces marker is also a write.
    assert all(r.blocks_written > 0 for r in results)

    # State was written.
    state_file = world / ".mcwb-state.json"
    assert state_file.exists()
    loaded = json.loads(state_file.read_text(encoding="utf-8"))
    assert loaded["build_id"] == "tiny-test"
    assert loaded["brief_version"] == "1.0"
    assert len(loaded["phases"]) == 2

    # Summary was written.
    assert (world / ".mcwb-summary.json").exists()

    # Block log was written.
    log = world / ".mcwb-blocks.jsonl"
    assert log.exists()
    lines = [l for l in log.read_text(encoding="utf-8").splitlines() if l]
    assert len(lines) > 0

    # Litematic was emitted for the spawn marker centerpieces.
    lit_dir = world / "litematics"
    assert lit_dir.exists()
    assert any(lit_dir.glob("*.litematic"))


def test_build_is_idempotent(tmp_path: Path) -> None:
    """Re-running the same build produces zero new phase blocks.

    Note: the centerpieces marker is always written (it's a marker, not
    a phase), so the second run writes at least 1 block.
    """
    world = tmp_path / "world"
    plan = _SyntheticMasterplan(SYNTHETIC_BRIEF)
    run_build(plan, world, writer=JsonWorldWriter())

    # Second run: phase diffs are clean, only the centerpieces marker writes.
    state2, results2 = run_build(plan, world, writer=JsonWorldWriter())
    phase_results = [r for r in results2 if r.phase_number != 99]
    assert all(r.blocks_written == 0 for r in phase_results)


def test_build_handles_brief_version_change(tmp_path: Path) -> None:
    """Bumping the brief version dirties every phase."""
    world = tmp_path / "world"
    plan_v1 = _SyntheticMasterplan(SYNTHETIC_BRIEF)
    run_build(plan_v1, world, writer=JsonWorldWriter())

    # Bump the version and rerun.
    plan_v2 = _SyntheticMasterplan({**SYNTHETIC_BRIEF, "version": "2.0"})
    state, results = run_build(plan_v2, world, writer=JsonWorldWriter())
    phase_results = [r for r in results if r.phase_number != 99]
    assert all(r.blocks_written > 0 for r in phase_results)
    assert state.brief_version == "2.0"
