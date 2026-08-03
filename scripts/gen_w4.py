#!/usr/bin/env python3
"""
W4 — Ravensgate, the Westlight approach, and the stadium district.

This generator implements the final 2026-07-26 designs recovered from the project
transcripts and fitted to the live terrain:

* Ravensgate replaces the temporary glass pavilion with an edged civic room: south
  stoa, library loggia, Bell-Gate campanile, belvedere, and Long Water.
* The approach uses two raised crossings over the real lake.  Its grey-to-white
  material change happens at White Bridge before it enters Gatehead Square.
* Westlight District is a compact, walkable crescent south of the stadium: seven
  shophouses, tavern, food hall, inn/beacon, park, baths, boathouse, and boardwalk.

All output is absolute-coordinate build ops for scripts/rcon_runner.py.  The final
files contain a few deliberately repeated sentinel placements; build_status samples
those final-state operations instead of phases whose ground is later overwritten.
"""
from __future__ import annotations

import math
import os


OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'buildops')
os.makedirs(OUT, exist_ok=True)
GRADE = 67


class Ops:
    def __init__(self) -> None:
        self.ops: list[str] = []

    def set(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int,
            block: str) -> None:
        self.ops.append(
            f'SET {min(x1, x2)} {min(y1, y2)} {min(z1, z2)} '
            f'{max(x1, x2)} {max(y1, y2)} {max(z1, z2)} {block}'
        )

    def door(self, x: int, y: int, z: int, kind: str = 'spruce_door',
             facing: str = 'north') -> None:
        self.set(x, y, z, x, y, z,
                 f'{kind}[facing={facing},half=lower,open=true]')
        self.set(x, y + 1, z, x, y + 1, z,
                 f'{kind}[facing={facing},half=upper,open=true]')

    def wall_ring(self, x1: int, y1: int, z1: int, x2: int, y2: int, z2: int,
                  block: str) -> None:
        self.set(x1, y1, z1, x2, y2, z1, block)
        self.set(x1, y1, z2, x2, y2, z2, block)
        self.set(x1, y1, z1 + 1, x1, y2, z2 - 1, block)
        self.set(x2, y1, z1 + 1, x2, y2, z2 - 1, block)

    def foundation(self, x1: int, z1: int, x2: int, z2: int,
                   floor: str = 'polished_andesite', clear_to: int = 92) -> None:
        self.set(x1, 62, z1, x2, GRADE - 1, z2, 'stone')
        self.set(x1, GRADE, z1, x2, GRADE, z2, floor)
        self.set(x1, GRADE + 1, z1, x2, clear_to, z2, 'air')

    def write(self, name: str) -> str:
        path = os.path.join(OUT, name)
        with open(path, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops')
        return path


def bresenham(a: tuple[int, int], b: tuple[int, int]) -> list[tuple[int, int]]:
    """Integer x/z line, including both endpoints."""
    x1, z1 = a
    x2, z2 = b
    dx, dz = abs(x2 - x1), abs(z2 - z1)
    sx = 1 if x1 < x2 else -1
    sz = 1 if z1 < z2 else -1
    err = dx - dz
    out = []
    while True:
        out.append((x1, z1))
        if x1 == x2 and z1 == z2:
            break
        e2 = 2 * err
        if e2 > -dz:
            err -= dz
            x1 += sx
        if e2 < dx:
            err += dx
            z1 += sz
    return out


def circle_rows(radius: int) -> list[tuple[int, int]]:
    return [(dz, int(math.sqrt(max(0, radius * radius - dz * dz))))
            for dz in range(-radius, radius + 1)]


def phase_ravensgate_civic() -> str:
    o = Ops()

    # Exact temporary-pavilion demolition.  Keep its deep foundation and repave it;
    # nothing outside the measured pavilion envelope is removed.
    o.set(-105, 68, -449, -65, 95, -425, 'air')

    # Arrival lane and the Garth.
    o.set(-110, 66, -427, -107, 66, -420, 'stone')
    o.set(-110, 67, -427, -107, 67, -420, 'cobblestone')
    o.set(-105, 67, -446, -65, 67, -432, 'stone_bricks')
    o.set(-105, 67, -446, -105, 67, -432, 'deepslate_tiles')
    o.set(-65, 67, -446, -65, 67, -432, 'deepslate_tiles')
    o.set(-105, 67, -446, -65, 67, -446, 'deepslate_tiles')
    o.set(-105, 67, -432, -65, 67, -432, 'deepslate_tiles')
    o.set(-86, 67, -446, -84, 67, -433, 'polished_diorite')
    # Compass rose.
    o.set(-88, 67, -440, -82, 67, -440, 'polished_diorite')
    o.set(-85, 67, -443, -85, 67, -437, 'polished_diorite')
    o.set(-85, 67, -440, -85, 67, -440, 'waxed_exposed_copper')

    # South stoa: real depth, continuous bench, and an open colonnade.
    o.set(-105, 68, -431, -65, 68, -426, 'polished_andesite')
    o.set(-105, 69, -426, -65, 74, -426, 'stone_bricks')
    for x in range(-103, -66, 4):
        o.set(x, 69, -431, x, 69, -431, 'chiseled_stone_bricks')
        o.set(x, 70, -431, x, 72, -431, 'stone_bricks')
        o.set(x, 73, -431, x, 73, -431, 'polished_andesite')
        o.set(x, 74, -431, x, 74, -431, 'stone_bricks')
        o.set(x, 73, -430, x, 73, -430, 'lantern')
    o.set(-105, 69, -431, -105, 74, -431, 'stone_bricks')
    o.set(-65, 69, -431, -65, 74, -431, 'stone_bricks')
    o.set(-105, 75, -431, -65, 75, -431, 'stripped_spruce_log')
    o.set(-105, 76, -431, -65, 78, -426, 'deepslate_tiles')
    o.set(-103, 69, -427, -67, 69, -427,
          'spruce_stairs[facing=north]')
    # Relief and clerestory prevent the back wall reading as a bunker.
    o.set(-86, 70, -426, -84, 72, -426, 'chiseled_stone_bricks')
    for x in range(-101, -68, 4):
        o.set(x, 73, -426, x, 73, -426, 'glass_pane')

    # West loggia and a new library door on the court.
    o.set(-111, 68, -447, -106, 68, -433, 'polished_andesite')
    o.set(-111, 69, -447, -111, 77, -433, 'stone_bricks')
    for z in (-445, -442, -434):
        o.set(-106, 69, z, -106, 73, z, 'stone_bricks')
        o.set(-107, 74, z, -106, 74, z, 'polished_andesite')
    o.set(-111, 75, -447, -106, 77, -433, 'deepslate_tiles')
    o.set(-111, 68, -438, -111, 70, -437, 'air')
    o.door(-111, 68, -438, facing='east')
    o.door(-111, 68, -437, facing='east')
    o.set(-111, 71, -439, -111, 77, -436, 'stone_bricks')
    o.set(-111, 78, -438, -106, 78, -437, 'deepslate_tiles')
    o.set(-110, 72, -440, -110, 72, -440, 'lantern')
    o.set(-110, 72, -435, -110, 72, -435, 'lantern')

    # Bell-Gate: a narrow, shadowed passage with a 42-block campanile above it.
    o.wall_ring(-110, 68, -432, -106, 103, -428, 'stone_bricks')
    for x, z in ((-110, -432), (-106, -432), (-110, -428), (-106, -428)):
        o.set(x, 68, z, x, 103, z, 'polished_deepslate')
    o.set(-109, 68, -432, -107, 71, -428, 'air')
    o.set(-106, 68, -431, -106, 71, -429, 'air')
    for y in (79, 90):
        o.wall_ring(-110, y, -432, -106, y, -428, 'deepslate_tiles')
    for y in (76, 84, 92):
        o.set(-108, y, -432, -108, y, -432, 'glass_pane')
        o.set(-108, y, -428, -108, y, -428, 'glass_pane')
    # Belfry openings and lantern/bell.
    o.set(-109, 98, -432, -107, 101, -432, 'air')
    o.set(-109, 98, -428, -107, 101, -428, 'air')
    o.set(-110, 98, -431, -110, 101, -429, 'air')
    o.set(-106, 98, -431, -106, 101, -429, 'air')
    o.set(-108, 99, -430, -108, 99, -430, 'bell[attachment=ceiling,facing=north]')
    o.set(-108, 102, -430, -108, 102, -430, 'lantern[hanging=true]')
    o.set(-111, 103, -433, -105, 103, -427, 'stone_brick_slab[type=top]')
    o.set(-110, 104, -432, -106, 104, -428, 'oxidized_cut_copper_stairs')
    o.set(-109, 105, -431, -107, 105, -429, 'oxidized_copper')
    o.set(-109, 106, -431, -107, 106, -429, 'oxidized_cut_copper_stairs')
    o.set(-108, 107, -430, -108, 108, -430, 'oxidized_copper')
    o.set(-108, 109, -430, -108, 109, -430, 'lightning_rod')

    # Belvedere and stepped water table.
    o.set(-106, 68, -455, -64, 69, -449, 'stone_bricks')
    o.set(-106, 70, -455, -64, 70, -449, 'polished_andesite')
    o.set(-102, 68, -447, -68, 68, -447, 'stone_brick_stairs[facing=south]')
    o.set(-102, 69, -448, -68, 69, -448, 'stone_brick_stairs[facing=south]')
    o.set(-106, 71, -455, -89, 71, -455, 'stone_brick_wall')
    o.set(-81, 71, -455, -64, 71, -455, 'stone_brick_wall')
    o.set(-106, 71, -455, -106, 71, -449, 'stone_brick_wall')
    o.set(-64, 71, -455, -64, 71, -449, 'stone_brick_wall')
    o.set(-87, 70, -453, -83, 70, -452, 'sea_lantern')
    o.set(-88, 71, -454, -82, 71, -454, 'stone_bricks')
    o.set(-88, 71, -451, -82, 71, -451, 'stone_bricks')
    o.set(-88, 71, -453, -88, 71, -452, 'stone_bricks')
    o.set(-82, 71, -453, -82, 71, -452, 'stone_bricks')
    o.set(-87, 71, -453, -83, 71, -452, 'water')
    o.set(-85, 71, -454, -85, 71, -454, 'water')
    o.set(-85, 67, -458, -85, 70, -455, 'water')
    o.set(-86, 67, -458, -86, 70, -455, 'stone_bricks')
    o.set(-84, 67, -458, -84, 70, -455, 'stone_bricks')
    for z, y in ((-456, 69), (-457, 68), (-458, 67)):
        o.set(-102, y, z, -90, y, z, 'stone_brick_stairs[facing=north]')
        o.set(-80, y, z, -68, y, z, 'stone_brick_stairs[facing=north]')
    return o.write('rg1_civic.txt')


def phase_ravensgate_park() -> str:
    o = Ops()
    # Stilling basin and the 76-block Long Water.  Water is two blocks deep but all
    # player routes stay on broad coping/walks, so it is a vista rather than a trap.
    o.set(-89, 64, -462, -81, 64, -458, 'deepslate_tiles')
    o.set(-89, 65, -462, -89, 67, -458, 'smooth_stone')
    o.set(-81, 65, -462, -81, 67, -458, 'smooth_stone')
    o.set(-88, 65, -462, -82, 67, -462, 'smooth_stone')
    o.set(-88, 65, -462, -82, 66, -458, 'water')
    o.set(-88, 64, -538, -82, 64, -463, 'deepslate_tiles')
    o.set(-89, 64, -538, -89, 67, -463, 'smooth_stone')
    o.set(-81, 64, -538, -81, 67, -463, 'smooth_stone')
    o.set(-88, 65, -538, -82, 66, -463, 'water')
    o.set(-93, 67, -538, -90, 67, -459, 'dirt_path')
    o.set(-80, 67, -538, -77, 67, -459, 'dirt_path')
    for z in range(-466, -539, -6):
        for x in (-94, -76):
            o.set(x, 68, z, x, 71, z, 'oak_log')
            o.set(x - 1, 72, z - 1, x + 1, 74, z + 1, 'oak_leaves')
        if (z + 466) % 12 == 0:
            o.set(-92, 68, z, -90, 68, z, 'spruce_stairs[facing=east]')
            o.set(-80, 68, z, -78, 68, z, 'spruce_stairs[facing=west]')
    for z in range(-466, -539, -12):
        o.set(-90, 68, z, -90, 70, z, 'spruce_fence')
        o.set(-90, 71, z, -90, 71, z, 'lantern')

    # Round pool and eye-catcher.
    for dz, ox in circle_rows(7):
        o.set(-85 - ox, 64, -544 + dz, -85 + ox, 64, -544 + dz,
              'deepslate_tiles')
        if ox > 1:
            o.set(-85 - ox + 1, 65, -544 + dz, -85 + ox - 1, 66,
                  -544 + dz, 'water')
        o.set(-85 - ox, 65, -544 + dz, -85 - ox, 67, -544 + dz,
              'smooth_stone')
        if ox:
            o.set(-85 + ox, 65, -544 + dz, -85 + ox, 67, -544 + dz,
                  'smooth_stone')
    o.set(-93, 68, -562, -77, 68, -551, 'grass_block')
    o.set(-91, 69, -561, -79, 69, -552, 'grass_block')
    # Octagonal tempietto.
    for x, z in ((-82, -556), (-88, -556), (-85, -553), (-85, -559),
                 (-83, -554), (-87, -554), (-83, -558), (-87, -558)):
        o.set(x, 70, z, x, 73, z, 'stone_bricks')
    o.set(-88, 74, -559, -82, 74, -553, 'stone_brick_slab')
    o.set(-87, 75, -558, -83, 75, -554, 'oxidized_cut_copper')
    o.set(-85, 76, -556, -85, 76, -556, 'oxidized_copper')
    o.set(-85, 74, -556, -85, 74, -556, 'lantern[hanging=true]')

    # West road handoff: path, rond-point, cross, and paired columns.
    o.set(-123, 67, -462, -96, 67, -458, 'gravel')
    o.set(-123, 67, -500, -121, 67, -459, 'gravel')
    o.set(-148, 67, -502, -120, 67, -498, 'gravel')
    for dz, ox in circle_rows(10):
        o.set(-130 - ox, 67, -500 + dz, -130 + ox, 67, -500 + dz, 'gravel')
    for dz, ox in circle_rows(7):
        o.set(-130 - ox, 67, -500 + dz, -130 + ox, 67, -500 + dz,
              'grass_block')
    o.set(-131, 68, -501, -129, 68, -499, 'stone_bricks')
    o.set(-130, 69, -500, -130, 72, -500, 'stone_bricks')
    o.set(-132, 71, -500, -128, 71, -500, 'stone_bricks')
    o.set(-130, 73, -500, -130, 73, -500, 'lantern')
    for x, z in ((-144, -504), (-144, -496)):
        o.set(x - 1, 67, z - 1, x + 1, 68, z + 1, 'stone_bricks')
        o.set(x, 69, z, x, 75, z, 'polished_granite')
        o.set(x - 1, 76, z - 1, x + 1, 76, z + 1,
              'chiseled_stone_bricks')
        o.set(x, 77, z, x, 77, z, 'lantern')
    return o.write('rg2_park.txt')


def phase_ravensgate_final() -> str:
    o = Ops()
    for x, y, z, b in (
        (-85, 67, -440, 'waxed_exposed_copper'),
        (-103, 70, -431, 'stone_bricks'),
        (-111, 68, -438, 'spruce_door[facing=east,half=lower,open=true]'),
        # Copper lightning rods weather in-world, so sample the stable oxidized cap
        # immediately below it rather than encoding a time-sensitive block state.
        (-108, 108, -430, 'oxidized_copper'),
        (-85, 66, -500, 'water'),
        (-85, 76, -556, 'oxidized_copper'),
        (-144, 75, -504, 'polished_granite'),
    ):
        o.set(x, y, z, x, y, z, b)
    return o.write('rg3_final.txt')


def phase_approach() -> str:
    o = Ops()
    # Keyframes fit the archived alignment to the measured shore.  Vertical changes
    # are interpolated slowly enough that every course is player-climbable.
    key = [
        (-148, 67, -500), (-158, 68, -506), (-170, 71, -506),
        (-182, 68, -506), (-224, 69, -496), (-288, 69, -497),
        (-305, 72, -497), (-322, 69, -497), (-336, 68, -492),
        (-344, 67, -486), (-352, 67, -486),
    ]
    stations: list[tuple[int, int, int]] = []
    for (x1, y1, z1), (x2, y2, z2) in zip(key, key[1:]):
        line = bresenham((x1, z1), (x2, z2))
        for i, (x, z) in enumerate(line[:-1]):
            t = i / max(1, len(line) - 1)
            y = round(y1 + (y2 - y1) * t)
            stations.append((x, y, z))
    stations.append(key[-1])

    seen: set[tuple[int, int, int]] = set()
    for i, (x, y, z) in enumerate(stations):
        if (x, y, z) in seen:
            continue
        seen.add((x, y, z))
        white = x <= -305
        deck = 'polished_diorite' if white else 'stone_bricks'
        o.set(x, y, z - 2, x, y, z + 2, deck)
        o.set(x, y + 1, z - 1, x, y + 4, z + 1, 'air')
        # Open piers hold the deck over water without turning the lake into a dam.
        if i % 8 == 0:
            support = 'smooth_quartz' if white else 'stone_bricks'
            o.set(x, 62, z - 2, x, y - 1, z - 2, support)
            o.set(x, 62, z + 2, x, y - 1, z + 2, support)
        if i % 12 == 0:
            post = 'quartz_pillar' if white else 'spruce_fence'
            lamp = 'sea_lantern' if white else 'lantern'
            o.set(x, y + 1, z - 2, x, y + 2, z - 2, post)
            o.set(x, y + 3, z - 2, x, y + 3, z - 2, lamp)

    # Bridge parapets and the Panorama stopping bay.
    for x in range(-182, -157):
        o.set(x, 72 if -174 <= x <= -166 else 70, -509,
              x, 72 if -174 <= x <= -166 else 70, -509, 'stone_brick_wall')
        o.set(x, 72 if -174 <= x <= -166 else 70, -503,
              x, 72 if -174 <= x <= -166 else 70, -503, 'stone_brick_wall')
    o.set(-232, 69, -500, -224, 69, -492, 'polished_andesite')
    o.set(-231, 70, -500, -225, 70, -500, 'spruce_stairs[facing=south]')
    for x in (-231, -225):
        o.set(x, 70, -493, x, 72, -493, 'spruce_fence')
        o.set(x, 73, -493, x, 73, -493, 'lantern')
    for x in range(-322, -287):
        y = 72 - min(3, abs(x + 305) // 6)
        o.set(x, y + 1, -500, x, y + 1, -500, 'smooth_quartz')
        o.set(x, y + 1, -494, x, y + 1, -494, 'smooth_quartz')
    return o.write('ar1_road.txt')


def phase_approach_final() -> str:
    o = Ops()
    # Gatehead owns the western abutment at district grade. Reassert that ownership
    # here too, so replaying the road after the district cannot resurrect ar1's raised
    # temporary deck through the finished street.
    o.set(-336, 67, -499, -318, 67, -494, 'polished_diorite')
    o.set(-336, 68, -499, -318, 74, -494, 'air')
    for x, y, z, b in (
        (-148, 67, -500, 'stone_bricks'),
        (-170, 71, -506, 'stone_bricks'),
        (-224, 69, -496, 'stone_bricks'),
        (-305, 72, -497, 'polished_diorite'),
        # Gatehead's later street phase flattens this abutment to district grade.
        (-322, 67, -497, 'polished_diorite'),
        (-352, 67, -486, 'polished_diorite'),
    ):
        o.set(x, y, z, x, y, z, b)
    return o.write('ar2_final.txt')


def simple_house(o: Ops, box: tuple[int, int, int, int], top: int,
                 wall: str, roof: str, door: tuple[int, int, str],
                 floors: tuple[int, ...] = (72,)) -> None:
    x1, z1, x2, z2 = box
    o.foundation(x1, z1, x2, z2, clear_to=max(110, top + 10))
    o.wall_ring(x1, 68, z1, x2, top, z2, wall)
    for y in floors:
        if y < top:
            o.set(x1 + 1, y, z1 + 1, x2 - 1, y, z2 - 1, 'spruce_planks')
    # Regular windows on both long faces.
    for x in range(x1 + 2, x2 - 1, 4):
        for y in range(69, top, 5):
            o.set(x, y, z1, x, y + 1, z1, 'glass_pane')
            o.set(x, y, z2, x, y + 1, z2, 'glass_pane')
    # A readable stepped roof; the solid courses also seal the rain.
    half = max(1, min(5, (x2 - x1) // 2))
    for k in range(half + 1):
        o.set(x1 - 1 + k, top + 1 + k, z1 - 1,
              x2 + 1 - k, top + 1 + k, z2 + 1, roof)
    dx, dz, facing = door
    o.set(dx, 68, dz, dx, 69, dz, 'air')
    o.door(dx, 68, dz, facing=facing)


def pavilion(o: Ops, box: tuple[int, int, int, int],
             door: tuple[int, int, str]) -> None:
    x1, z1, x2, z2 = box
    o.foundation(x1, z1, x2, z2, clear_to=82)
    o.wall_ring(x1, 68, z1, x2, 74, z2, 'white_stained_glass')
    for x, z in ((x1, z1), (x1, z2), (x2, z1), (x2, z2)):
        o.set(x, 68, z, x, 75, z, 'stripped_dark_oak_log')
    o.set(x1 - 1, 75, z1 - 1, x2 + 1, 75, z2 + 1, 'smooth_quartz')
    dx, dz, facing = door
    o.set(dx, 68, dz, dx, 70, dz, 'air')
    o.door(dx, 68, dz, facing=facing)


def phase_westlight_ground() -> str:
    o = Ops()
    # A connected sequence of public rooms, founded over the real shore instead of
    # erasing the whole lakefront with one rectangular grade operation.
    for box, mat in (
        ((-352, -500, -336, -472), 'polished_diorite'),   # Gatehead
        ((-406, -481, -352, -471), 'polished_diorite'),   # High Street
        ((-384, -498, -352, -479), 'calcite'),            # Lantern Plaza
        ((-318, -494, -294, -462), 'gravel'),             # Stableyard
        ((-404, -448, -352, -446), 'cobblestone'),        # back lane
    ):
        x1, z1, x2, z2 = box
        o.foundation(x1, z1, x2, z2, floor=mat, clear_to=74)
    # Continuous stadium axis and the High Street carriageway.
    # The live public stadium entry is offset east of centre at x[-356,-353].
    # Continue that exact opening south instead of slicing a new trench through the
    # bowl's south fascia.
    o.set(-356, 67, -506, -353, 67, -471, 'smooth_quartz')
    o.set(-356, 68, -506, -353, 71, -499, 'air')
    o.set(-406, 67, -478, -352, 67, -474, 'polished_andesite')
    o.set(-406, 67, -481, -352, 67, -479, 'calcite')
    o.set(-406, 67, -473, -352, 67, -471, 'calcite')
    # Fountain in Lantern Plaza. The live stadium entry is immediately east, so the
    # basin has a real y68 rim and sits one block west of the archived sketch. The
    # first uncontained version sent ten flowing-water cells into the public tunnel.
    o.set(-365, 67, -497, -357, 67, -489, 'smooth_quartz')
    o.set(-365, 68, -497, -357, 68, -497, 'smooth_quartz')
    o.set(-365, 68, -489, -357, 68, -489, 'smooth_quartz')
    o.set(-365, 68, -496, -365, 68, -490, 'smooth_quartz')
    o.set(-357, 68, -496, -357, 68, -490, 'smooth_quartz')
    o.set(-364, 68, -496, -358, 68, -490, 'water')
    o.set(-361, 68, -493, -361, 72, -493, 'smooth_quartz')
    o.set(-361, 73, -493, -361, 73, -493, 'sea_lantern')
    # Remove the old basin's east-edge spill and reassert all four entry head courses.
    o.set(-356, 68, -505, -353, 71, -489, 'air')
    # Clock wayshrine.
    o.wall_ring(-344, 68, -492, -340, 82, -488, 'stone_bricks')
    o.set(-343, 68, -492, -341, 71, -492, 'air')
    o.set(-342, 78, -492, -342, 78, -492, 'gold_block')
    o.set(-342, 80, -490, -342, 80, -490, 'bell[attachment=ceiling,facing=north]')
    o.set(-345, 83, -493, -339, 83, -487, 'deepslate_tile_stairs')
    o.set(-342, 84, -490, -342, 84, -490, 'lantern')
    return o.write('wd1_ground.txt')


def phase_westlight_buildings() -> str:
    o = Ops()
    simple_house(o, (-334, -492, -320, -476), 77, 'stone_bricks',
                 'deepslate_tiles', (-334, -484, 'west'), floors=(72,))
    o.set(-336, 67, -485, -334, 67, -483, 'polished_diorite')
    o.set(-336, 68, -485, -335, 72, -483, 'air')
    pavilion(o, (-334, -514, -318, -500), (-326, -500, 'south'))
    simple_house(o, (-316, -482, -302, -466), 74, 'spruce_planks',
                 'dark_oak_planks', (-316, -474, 'west'), floors=())
    o.set(-336, 67, -499, -318, 67, -494, 'polished_diorite')
    o.set(-336, 68, -499, -318, 74, -494, 'air')

    # Seven deliberately varied High Street fronts, each with a bed and trade fitting.
    plots = [
        (-404, -397), (-396, -390), (-389, -383), (-382, -377),
        (-373, -366), (-365, -359), (-358, -353),
    ]
    fittings = ('cartography_table', 'stonecutter', 'loom', 'smithing_table',
                'barrel', 'fletching_table', 'crafting_table')
    for i, ((x1, x2), fitting) in enumerate(zip(plots, fittings)):
        top = 76 + (i % 3)
        simple_house(o, (x1, -470, x2, -448), top,
                     'calcite' if i >= 3 else 'stone_bricks',
                     'deepslate_tiles', ((x1 + x2) // 2, -470, 'north'),
                     floors=(72,))
        o.set(x1 + 1, 68, -468, x1 + 1, 68, -468, fitting)
        o.set(x2 - 1, 73, -466, x2 - 1, 73, -465,
              'red_bed[facing=south,part=foot]')
        o.set((x1 + x2) // 2, 72, -470, (x1 + x2) // 2, 72, -470,
              'lantern[hanging=true]')

    pavilion(o, (-402, -502, -386, -484), (-394, -484, 'south'))
    o.set(-396, 67, -483, -392, 67, -482, 'calcite')
    o.set(-396, 68, -483, -392, 74, -482, 'air')
    # Beacon Inn, with its 40-block white mast.
    simple_house(o, (-428, -496, -408, -464), 82, 'white_concrete',
                 'deepslate_tiles', (-408, -480, 'east'), floors=(72, 77))
    o.wall_ring(-420, 83, -490, -412, 103, -482, 'white_concrete')
    for y in (88, 96):
        o.wall_ring(-420, y, -490, -412, y, -482, 'dark_oak_log')
    # The inn's stepped roof originally filled y84..87 inside the mast, leaving
    # the advertised lower tower lounge as a solid deepslate plug. Author the
    # actual three-level tower and its continuous, ladder-free spiral here so a
    # rebuild cannot restore the sealed volume.
    o.set(-419, 84, -489, -413, 102, -483, 'air')
    for floor_y in (88, 96):
        o.set(-419, floor_y, -489, -413, floor_y, -483, 'dark_oak_planks')
    beacon_spiral = (
        (-418, -488, 'east'),
        (-417, -488, 'east'),
        (-416, -488, 'south'),
        (-416, -487, 'south'),
        (-416, -486, 'west'),
        (-417, -486, 'west'),
        (-418, -486, 'north'),
        (-418, -487, 'north'),
    )
    for y in range(78, 97):
        x, z, facing = beacon_spiral[(y - 78) % len(beacon_spiral)]
        o.set(x, y, z, x, y, z,
              f'quartz_stairs[facing={facing},half=bottom]')
        o.set(x, y + 1, z, x, y + 2, z, 'air')
    o.set(-421, 103, -491, -411, 103, -481, 'smooth_quartz')
    o.set(-420, 104, -490, -412, 104, -482, 'white_stained_glass')
    o.set(-418, 105, -488, -414, 105, -484, 'sea_lantern')
    o.set(-416, 106, -486, -416, 107, -486, 'lightning_rod')

    # Brew-barn/music hall.
    simple_house(o, (-352, -468, -326, -446), 77, 'stone_bricks',
                 'dark_oak_planks', (-344, -468, 'north'), floors=(72,))
    o.set(-346, 67, -471, -342, 67, -469, 'calcite')
    o.set(-346, 68, -471, -342, 74, -469, 'air')
    for x in range(-348, -329, 6):
        o.set(x, 68, -450, x, 68, -450, 'barrel')
        o.set(x, 68, -454, x, 68, -454, 'note_block')
    return o.write('wd2_buildings.txt')


def phase_westlight_waterfront() -> str:
    o = Ops()
    # Shorelight Park and open-air baths.
    o.foundation(-292, -494, -262, -462, floor='grass_block', clear_to=78)
    o.set(-290, 67, -492, -264, 67, -490, 'dirt_path')
    o.set(-278, 67, -492, -276, 67, -464, 'dirt_path')
    o.set(-294, 67, -486, -290, 67, -482, 'dirt_path')
    o.set(-294, 68, -486, -290, 72, -482, 'air')
    for x in (-288, -282, -270, -264):
        for z in (-488, -476, -464):
            o.set(x, 68, z, x, 71, z, 'oak_log')
            o.set(x - 2, 72, z - 2, x + 2, 74, z + 2, 'oak_leaves')
    o.set(-288, 64, -480, -276, 66, -466, 'smooth_quartz')
    o.set(-286, 67, -478, -278, 67, -468, 'water')
    o.set(-287, 68, -479, -277, 68, -479, 'quartz_stairs[facing=south]')
    o.set(-287, 68, -467, -277, 68, -467, 'quartz_stairs[facing=north]')

    # Skiff House, boardwalk, and fishing jetty on piles.
    o.set(-286, 62, -512, -274, 66, -502, 'dark_oak_log')
    o.set(-286, 67, -512, -274, 67, -502, 'spruce_planks')
    o.wall_ring(-286, 68, -512, -274, 73, -502, 'spruce_planks')
    o.set(-287, 74, -513, -273, 74, -501, 'dark_oak_planks')
    o.set(-281, 68, -502, -279, 70, -502, 'air')
    o.door(-280, 68, -502, facing='south')
    o.set(-282, 67, -501, -278, 67, -493, 'spruce_planks')
    o.set(-282, 68, -501, -278, 72, -493, 'air')
    # The Skiff gangway crosses the raised causeway at x=-280. Re-emit the causeway
    # after clearing gangway headroom, then give both shores one-block stair courses;
    # the earlier flat gangway made this a one-way two-block drop.
    o.set(-286, 69, -499, -274, 69, -495, 'stone_bricks')
    o.set(-286, 70, -498, -274, 73, -496, 'air')
    for z, y in ((-501, 67), (-500, 68), (-494, 68), (-493, 67)):
        o.set(-281, y, z, -279, y, z, 'stone_brick_stairs[facing=south]')
        o.set(-281, y + 1, z, -279, 73, z, 'air')
    o.set(-270, 66, -510, -266, 66, -500, 'dark_oak_log')
    o.set(-270, 67, -510, -266, 67, -500, 'spruce_planks')
    o.set(-276, 67, -514, -260, 67, -511, 'spruce_planks')
    # The archived boardwalk was x[-312,-304], which passed through the enlarged
    # live bowl (the earlier design used a smaller radius). Restore only the cells
    # that belong to its y67 premium ring, then place the promenade outside x=-291.
    for z in range(-556, -513):
        dz = z + 560
        outer = int(69 * math.sqrt(max(0.0, 1.0 - (dz / 61) ** 2)))
        inner = int(40 * math.sqrt(max(0.0, 1.0 - (dz / 32) ** 2))) if abs(dz) <= 32 else 0
        for x in range(-312, -303):
            dx = abs(x + 360)
            if inner < dx <= outer:
                o.set(x, 67, z, x, 67, z, 'dark_oak_planks')
    # Restore the six courses occupied by the first, incorrectly fitted waterfall.
    o.set(-312, 67, -547, -304, 67, -540, 'dark_oak_planks')
    o.set(-312, 68, -547, -304, 72, -540, 'smooth_stone')

    o.set(-286, 67, -556, -278, 67, -513, 'spruce_planks')
    for z in range(-554, -513, 8):
        o.set(-285, 62, z, -285, 66, z, 'dark_oak_log')
        o.set(-279, 62, z, -279, 66, z, 'dark_oak_log')
        o.set(-283, 68, z, -283, 70, z, 'spruce_fence')
        o.set(-283, 71, z, -283, 71, z, 'soul_lantern')
    # White Bridge crown descends and doglegs east to the Brimside boardwalk.
    for i, z in enumerate(range(-498, -503, -1)):
        y = 71 - i
        o.set(-309, y, z, -305, y, z, 'smooth_quartz')
        o.set(-308, y + 1, z, -306, 76, z, 'air')
    o.set(-305, 67, -504, -287, 67, -501, 'smooth_quartz')
    o.set(-305, 68, -504, -287, 76, -501, 'air')
    o.set(-290, 67, -513, -287, 67, -501, 'smooth_quartz')
    o.set(-290, 68, -513, -287, 74, -501, 'air')
    # Lit waterfall screen tied into the stadium's east terrace.
    o.set(-286, 67, -546, -278, 72, -540, 'calcite')
    o.set(-285, 68, -545, -279, 71, -541, 'sea_lantern')
    o.set(-284, 72, -546, -280, 72, -546, 'water')
    o.set(-284, 67, -547, -280, 71, -547, 'water')
    return o.write('wd3_waterfront.txt')


def phase_westlight_final() -> str:
    o = Ops()
    for x, y, z, b in (
        (-342, 84, -490, 'lantern'),
        (-361, 73, -493, 'sea_lantern'),
        (-326, 68, -500, 'spruce_door[facing=south,half=lower,open=true]'),
        (-400, 68, -470, 'spruce_door[facing=north,half=lower,open=true]'),
        (-416, 106, -486, 'lightning_rod'),
        (-344, 68, -468, 'spruce_door[facing=north,half=lower,open=true]'),
        (-282, 67, -474, 'water'),
        (-280, 68, -502, 'spruce_door[facing=south,half=lower,open=true]'),
        (-282, 67, -535, 'spruce_planks'),
    ):
        o.set(x, y, z, x, y, z, b)
    return o.write('wd4_final.txt')


def main() -> None:
    phase_ravensgate_civic()
    phase_ravensgate_park()
    phase_ravensgate_final()
    phase_approach()
    phase_approach_final()
    phase_westlight_ground()
    phase_westlight_buildings()
    phase_westlight_waterfront()
    phase_westlight_final()


if __name__ == '__main__':
    main()
