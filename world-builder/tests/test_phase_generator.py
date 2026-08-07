"""Tests for the phase generators."""

from __future__ import annotations

from mcwb.build.phase_generator import (
    generate_phase_blocks,
    phase_slug,
    PHASE_GENERATORS,
)


def test_all_11_phases_have_generators() -> None:
    """The 11 phases of the combined-complex masterplan all have a generator."""
    for n in range(1, 12):
        assert n in PHASE_GENERATORS, f"no generator for phase {n}"


def test_phase_slug_stable() -> None:
    p = {"phase": 3, "name": "City + Houston Tunnel", "block_budget": 1_000}
    assert phase_slug(p) == "3_city_and_houston_tunnel"


def test_site_prep_produces_blocks() -> None:
    brief = {
        "world_footprint": {"width_blocks": 100, "length_blocks": 100, "min_y": -100},
        "world_origin": {"x": 0, "y": 0, "z": 0},
    }
    phase = {"phase": 1, "name": "Site Prep", "block_budget": 50_000}
    blocks = list(generate_phase_blocks(phase, brief))
    assert len(blocks) > 0
    # Site prep is a 1-block bedrock floor.
    assert all(b.block_id == "minecraft:bedrock" for b in blocks)
    assert all(b.y == -100 for b in blocks)


def test_unknown_phase_produces_nothing() -> None:
    blocks = list(generate_phase_blocks(
        {"phase": 99, "name": "Future Phase", "block_budget": 100},
        {},
    ))
    assert blocks == []
