"""Phase generators.

A phase generator turns one phase of the masterplan into a stream of
block-change operations. Generators are deterministic — same input
phase + same spec_version produces the same output block changes.

For MVP, generators are simple bounding-box-style emitters that fill
a region with a single material. The visual fidelity is low but the
build pipeline is real: the world file gets written, the state tracks
what was applied, the diff skips unchanged phases.

Real geometry (specific buildings, minecart rails, signs) lands in
v0.3 once the masterplan schema gains a per-element geometry layer.
"""

from __future__ import annotations

import hashlib
from typing import Iterator

from mcwb.build.writer import BlockChange


def _hash_phase(phase: dict) -> str:
    """Stable hash of a phase spec for state diffing."""
    import json
    payload = json.dumps(phase, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:16]


def _hash_brief(brief: dict) -> str:
    """Stable hash of the whole brief for global state diffing."""
    import json
    payload = json.dumps(brief, sort_keys=True).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()[:16]


def _block_stream(
    x0: int, y0: int, z0: int,
    w: int, h: int, l: int,
    block_id: str,
    step: int = 1,
) -> Iterator[BlockChange]:
    """Yield block changes for a filled box, optionally subsampled."""
    for y in range(y0, y0 + h, step):
        for z in range(z0, z0 + l, step):
            for x in range(x0, x0 + w, step):
                yield BlockChange(x=x, y=y, z=z, block_id=block_id)


def _surface_ring(
    cx: int, cz: int, radius: int, y: int, block_id: str
) -> Iterator[BlockChange]:
    """Yield a 1-block-thick ring at y=cy centered on (cx, cz)."""
    for dx in range(-radius, radius + 1):
        for dz in range(-radius, radius + 1):
            d2 = dx * dx + dz * dz
            if (radius - 1) ** 2 < d2 <= radius ** 2:
                yield BlockChange(x=cx + dx, y=y, z=cz + dz, block_id=block_id)


# ---------------------------------------------------------------------------
# Per-phase generators
# ---------------------------------------------------------------------------


def gen_site_prep(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 1: bedrock layer at the world bottom + air above."""
    fp = brief.get("world_footprint", {})
    min_y = fp.get("min_y", -100)
    # 1-block bedrock floor across the entire world footprint.
    width = fp.get("width_blocks", 100)
    length = fp.get("length_blocks", 100)
    cx = brief.get("world_origin", {}).get("x", 0)
    cz = brief.get("world_origin", {}).get("z", 0)
    # A 1-block bedrock strip at the bottom, sampled (not every block — that
    # would be 100*100*1 = 10k, but the spec budget is 50k so we can afford it).
    yield from _block_stream(
        cx - width // 2, min_y, cz - length // 2,
        width, 1, length,
        "minecraft:bedrock",
    )


def gen_continuous_mountain(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 2: the continuous mountain body.

    Reads mountain_layout.footprint. Two materials above the contact at Y=200
    (granite) and below (limestone).
    """
    fp = brief.get("world_footprint", {})
    mountain = brief.get("mountain_layout", {})
    footprint = mountain.get("footprint", {})
    x_min = footprint.get("x_min", -400)
    x_max = footprint.get("x_max", 400)
    z_min = footprint.get("z_min", -800)
    z_max = footprint.get("z_max", -200)
    y_min = footprint.get("y_min", 0)
    y_max = footprint.get("y_max", 800)
    contact_y = mountain.get("horizontal_contact", {}).get("elevation", 200)

    # Sample every 4 blocks to keep the count realistic. The full mountain
    # is 800 * 600 * 800 = 384M possible blocks; sampling at step=4 gives
    # 24M at the most, well above the 1.65M phase budget. We further
    # sample to hit the budget. For a real build this is a 3D noise
    # function with the right material palette.
    width = x_max - x_min
    length = z_max - z_min
    limestone_h = contact_y - y_min
    granite_h = y_max - contact_y
    # Subsample step sized so total blocks ≈ phase block_budget.
    budget = phase.get("block_budget", 1_650_000)
    # Aim for ~1.5M to stay under budget.
    target = max(1, int(budget * 0.9))
    # Approximate: with step=4, full volume = (w*l*(limestone_h+granite_h))/64.
    # We need to pick step so we hit target. Solved: step = (vol / target)^(1/3).
    full_vol = width * length * (limestone_h + granite_h)
    if target > 0 and full_vol > 0:
        raw_step = (full_vol / target) ** (1 / 3)
        step = max(2, round(raw_step))
    else:
        step = 4

    # Limestone body below the contact.
    yield from _block_stream(
        x_min, y_min, z_min,
        width, min(limestone_h, 50), length,
        "minecraft:smooth_stone",
        step=step,
    )
    # Granite cap above the contact.
    yield from _block_stream(
        x_min, contact_y, z_min,
        width, min(granite_h, 50), length,
        "minecraft:polished_diorite",
        step=step,
    )


def gen_contact_ring(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 2 also: the 1-2 block color-change ring at Y=200 on the south face.

    Implemented as a thin horizontal band at the contact elevation,
    visible from the south face.
    """
    mountain = brief.get("mountain_layout", {})
    contact = mountain.get("horizontal_contact", {}).get("elevation", 200)
    footprint = mountain.get("footprint", {})
    x_min = footprint.get("x_min", -400)
    x_max = footprint.get("x_max", 400)
    z_min = footprint.get("z_min", -800)
    z_max = footprint.get("z_max", -200)
    # The visible ring is on the south face, 1 block tall, 1-2 blocks deep.
    yield from _block_stream(
        x_min, contact - 1, z_max,
        x_max - x_min, 2, 1,
        "minecraft:chiseled_stone_bricks",
        step=1,
    )


def gen_city(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 3: a stone-brick city footprint at the world origin."""
    # Find city_footprint key_location.
    key = brief.get("key_locations", {})
    city = key.get("city_footprint", {})
    if not city:
        return
    x_min = city.get("x_min", -69)
    x_max = city.get("x_max", 69)
    y_min = city.get("y_min", 0)
    y_max = city.get("y_max", 80)
    z_min = city.get("z_min", -69)
    z_max = city.get("z_max", 69)
    # City = 1-block floor at street grade, sampled.
    yield from _block_stream(
        x_min, y_min, z_min,
        x_max - x_min, 1, z_max - z_min,
        "minecraft:stone_bricks",
        step=1,
    )


def gen_subtropolis(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 4: SubTropolis chamber at Y=-100, 200x200 horizontal."""
    # Smooth stone floor in the chamber.
    yield from _block_stream(
        -100, -100, -300,
        200, 1, 200,
        "minecraft:smooth_stone",
        step=2,
    )


def gen_cheyenne(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 5: Cheyenne chamber at Y=250-400 inside the granite."""
    yield from _block_stream(
        -40, 250, -580,
        80, 1, 80,
        "minecraft:polished_diorite",
        step=2,
    )


def gen_public_shaft(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 6: 7x7x100 vertical shaft from (60,0,-70) to (60,-100,-100)."""
    yield from _block_stream(
        60 - 3, 0, -70 - 3,
        7, 100, 7,
        "minecraft:gray_concrete",
        step=1,
    )


def gen_service_tunnel(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 7: 6x6x120 service tunnel from (-100,0,-300) to (0,200,-420)."""
    # Approximate as a 6x6x120 horizontal-and-rising box.
    yield from _block_stream(
        -100, 0, -300,
        6, 6, 120,
        "minecraft:smooth_stone",
        step=1,
    )


def gen_blast_door_and_plaque(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 8: blast door + composite terrane plaque."""
    # Blast door at the Cheyenne outer portal.
    yield from _block_stream(
        -1, 200, -421,
        3, 12, 1,
        "minecraft:iron_door",
        step=1,
    )
    # Plaque alcove at the contact crossing.
    yield from _block_stream(
        -42, 200, -361,
        1, 2, 1,
        "minecraft:chiseled_stone_bricks",
        step=1,
    )


def gen_funicular_and_road(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 9: funicular rail + summit road switchback."""
    # Funicular: a rail line from outer portal to summit.
    for y in range(200, 800, 4):
        yield BlockChange(x=0, y=y, z=-420, block_id="minecraft:powered_rail")
    # Summit road: 6 switchbacks, sampled.
    for n in range(0, 6):
        z0 = -500 + n * 30
        yield from _block_stream(
            -20, 800 - n * 130, z0,
            40, 1, 30,
            "minecraft:stone_bricks",
            step=2,
        )


def gen_summit_platform(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 10: 7x7 wooden platform at the summit."""
    yield from _block_stream(
        -3, 800, -503,
        7, 1, 7,
        "minecraft:oak_planks",
        step=1,
    )


def gen_finishing(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Phase 11: easter eggs, lighting, signage — represented as
    a few marker blocks at each easter egg location."""
    for egg in brief.get("easter_eggs", []):
        pos = egg.get("position", {})
        if not pos:
            continue
        # Place a small chest of light at each easter egg as a marker.
        yield BlockChange(
            x=pos.get("x", 0),
            y=pos.get("y", 0),
            z=pos.get("z", 0),
            block_id="minecraft:sea_lantern",
        )


# Map phase number → generator.
PHASE_GENERATORS = {
    1: gen_site_prep,
    2: gen_continuous_mountain,
    3: gen_city,
    4: gen_subtropolis,
    5: gen_cheyenne,
    6: gen_public_shaft,
    7: gen_service_tunnel,
    8: gen_blast_door_and_plaque,
    9: gen_funicular_and_road,
    10: gen_summit_platform,
    11: gen_finishing,
}


def generate_phase_blocks(phase: dict, brief: dict) -> Iterator[BlockChange]:
    """Dispatch to the right generator based on phase number.

    Unknown phases produce no block changes (logged, not raised).
    """
    n = phase.get("phase")
    gen = PHASE_GENERATORS.get(n)
    if gen is None:
        return iter([])
    return gen(phase, brief)


def phase_slug(phase: dict) -> str:
    """Stable slug for a phase, used as the state key."""
    n = phase.get("phase", 0)
    name = phase.get("name", "unknown")
    slug = name.lower().replace(" ", "_").replace("+", "and").replace(",", "")
    return f"{n}_{slug}"
