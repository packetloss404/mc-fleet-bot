#!/usr/bin/env python3
"""
Ravensreach civic quarter: the Library, the Central Pavilion, the Amsterdam-style
town square, and the walkways that tie the town together.

Sited around what is already there. In particular a resident cottage occupies
x[-95,-75] z[-420,-399] — beds, chests, a cartography table — so the north axis
steps around it rather than through it. Nothing here touches that footprint.

  Library   x[-144,-111] z[-448,-426]   3 storeys above, 3 below   (west)
  Pavilion  x[-105,-65]  z[-449,-425]   open colonnade             (on axis)
  Square    the existing plaza, repaved, with two canals flanking the Moot Hall

Emits ops for scripts/build_runner.py — absolute coordinates only.
"""
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'buildops')
os.makedirs(OUT, exist_ok=True)


class Ops:
    def __init__(self):
        self.ops = []

    def set(self, x1, y1, z1, x2, y2, z2, p):
        self.ops.append(f'SET {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {p}')

    def repl(self, x1, y1, z1, x2, y2, z2, m, p):
        self.ops.append(f'REPL {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {m} {p}')

    def room(self, x1, y, z1, x2, z2, h, wall, floor_p, ceil_p=None):
        """Hollow box: floor, walls, ceiling, clear interior."""
        self.set(x1, y, z1, x2, y, z2, floor_p)
        self.set(x1, y + 1, z1, x2, y + h, z2, 'air')
        self.set(x1, y + 1, z1, x2, y + h, z1, wall)
        self.set(x1, y + 1, z2, x2, y + h, z2, wall)
        self.set(x1, y + 1, z1, x1, y + h, z2, wall)
        self.set(x2, y + 1, z1, x2, y + h, z2, wall)
        if ceil_p:
            self.set(x1, y + h + 1, z1, x2, y + h + 1, z2, ceil_p)

    def stair_run(self, x, y, z, dz, n, p, w=3):
        """A flight climbing +1 y per step in the +dz direction."""
        for i in range(n):
            self.set(x, y + i, z + dz * i, x + w - 1, y + i, z + dz * i, p)
            self.set(x, y + i + 1, z + dz * i, x + w - 1, y + i + 4, z + dz * i, 'air')

    def write(self, name):
        p = os.path.join(OUT, name)
        with open(p, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops -> {p}')
        return p


# ============================================================ THE LIBRARY
LX1, LX2 = -144, -111
LZ1, LZ2 = -448, -426
LEVELS = [('B3', 46), ('B2', 53), ('B1', 60), ('Ground', 67), ('First', 75), ('Second', 83)]


def phase_library_shell():
    o = Ops()
    # grade the site: the library stands on a natural hill
    o.set(LX1 - 3, 44, LZ1 - 3, LX2 + 3, 66, LZ2 + 3, 'stone')
    o.set(LX1 - 3, 67, LZ1 - 3, LX2 + 3, 67, LZ2 + 3, 'stone_bricks')
    o.set(LX1 - 3, 68, LZ1 - 3, LX2 + 3, 110, LZ2 + 3, 'air')
    # six floor plates, each with its own wall band
    for name, y in LEVELS:
        h = 6 if y >= 67 else 5
        wall = 'deepslate_bricks' if y < 67 else 'stone_bricks'
        o.room(LX1, y, LZ1, LX2, LZ2, h, wall, 'polished_andesite',
               'stone_bricks' if y != 83 else None)
        # window bands on the above-ground storeys — tall and narrow, library-ish
        if y >= 67:
            for x in range(LX1 + 3, LX2 - 1, 4):
                o.set(x, y + 2, LZ1, x + 1, y + 5, LZ1, 'glass_pane')
                o.set(x, y + 2, LZ2, x + 1, y + 5, LZ2, 'glass_pane')
            for z in range(LZ1 + 3, LZ2 - 1, 4):
                o.set(LX1, y + 2, z, LX1, y + 5, z + 1, 'glass_pane')
                o.set(LX2, y + 2, z, LX2, y + 5, z + 1, 'glass_pane')
    # the atrium: a light well cut through all three upper floors, railed
    ax1, ax2, az1, az2 = -132, -123, -441, -433
    for _, y in LEVELS[3:]:
        o.set(ax1, y, az1, ax2, y, az2, 'air')
        o.set(ax1 - 1, y, az1 - 1, ax2 + 1, y, az1 - 1, 'dark_oak_fence')
        o.set(ax1 - 1, y, az2 + 1, ax2 + 1, y, az2 + 1, 'dark_oak_fence')
        o.set(ax1 - 1, y, az1 - 1, ax1 - 1, y, az2 + 1, 'dark_oak_fence')
        o.set(ax2 + 1, y, az1 - 1, ax2 + 1, y, az2 + 1, 'dark_oak_fence')
    o.set(ax1, 90, az1, ax2, 90, az2, 'glass')          # skylight over the atrium
    # pitched roof
    for i in range(8):
        o.set(LX1 - 1 + i, 90 + i, LZ1 - 1, LX2 + 1 - i, 90 + i, LZ2 + 1, 'deepslate_tiles')
        o.set(LX1 + i, 90 + i, LZ1, LX2 - i, 90 + i, LZ2, 'air')
    o.set(LX1 + 7, 97, LZ1, LX2 - 7, 98, LZ2, 'deepslate_tiles')
    return o.write('lib1_shell.txt')


def phase_library_stairs():
    """A single stair core serving all six levels, plus the grand atrium stair."""
    o = Ops()
    sx, sz = -118, -444          # service core, NE corner
    for _, y in LEVELS[:-1]:
        h = 6 if y >= 67 else 5
        o.set(sx - 1, y, sz - 1, sx + 3, y + h + 1, sz + 5, 'air')
        for i in range(h + 1):
            o.set(sx, y + i, sz + i, sx + 2, y + i, sz + i, 'polished_andesite')
        o.set(sx - 1, y, sz - 1, sx + 3, y, sz + 5, 'polished_andesite')
        o.set(sx + 3, y + 1, sz - 1, sx + 3, y + h, sz + 5, 'lantern')
    # grand stair in the atrium, ground -> first -> second
    for base in (67, 75):
        for i in range(8):
            o.set(-131, base + i, -440 + i, -126, base + i, -440 + i, 'dark_oak_planks')
            o.set(-131, base + i + 1, -440 + i, -126, base + i + 4, -440 + i, 'air')
        o.set(-132, base + 1, -440, -132, base + 8, -433, 'dark_oak_fence')
        o.set(-125, base + 1, -440, -125, base + 8, -433, 'dark_oak_fence')
    return o.write('lib2_stairs.txt')


def phase_library_fit():
    """Stacks, reading rooms, and the deep vault. Every shelf stands on a real floor
    and every level is reachable — the two things the annex got wrong."""
    o = Ops()
    fit = {
        46: ('deepslate_bricks', 'the vault'),          # B3
        53: ('bookshelf', 'closed archive'),            # B2
        60: ('bookshelf', 'general stacks'),            # B1
        67: ('bookshelf', 'entrance + issue desk'),     # Ground
        75: ('bookshelf', 'reading room'),              # First
        83: ('bookshelf', 'rare books + map room'),     # Second
    }
    for y, (mat, _) in fit.items():
        # ranges of stacks running east-west, with aisles you can actually walk
        for z in range(LZ1 + 3, LZ2 - 2, 4):
            for band in ((LX1 + 2, -134), (-121, LX2 - 2)):
                o.set(band[0], y + 1, z, band[1], y + 3, z, mat)
                o.set(band[0], y + 1, z + 1, band[1], y + 3, z + 1, 'air')
        o.set(LX1 + 2, y + 5, LZ1 + 2, LX2 - 2, y + 5, LZ2 - 2, 'air')
        for x in range(LX1 + 4, LX2 - 2, 6):
            for z in range(LZ1 + 4, LZ2 - 2, 6):
                o.set(x, y + 4, z, x, y + 4, z, 'lantern[hanging=true]')
    # ground floor: issue desk and catalogue, facing the door
    o.set(-136, 68, -430, -128, 68, -430, 'dark_oak_slab')
    o.set(-136, 68, -431, -128, 69, -431, 'polished_andesite')
    o.set(-134, 68, -429, -130, 68, -429, 'lectern')
    o.set(LX1 + 16, 68, LZ2, LX1 + 17, 69, LZ2, 'air')          # the front doors
    o.set(LX1 + 16, 68, LZ2, LX1 + 17, 69, LZ2, 'dark_oak_door')
    # reading room: long tables under the windows
    for z in (LZ1 + 5, LZ1 + 13):
        o.set(-140, 76, z, -134, 76, z, 'dark_oak_slab')
        o.set(-140, 76, z + 1, -134, 76, z + 1, 'air')
    # rare books: display cases and the map room
    o.set(-140, 84, LZ1 + 4, -136, 84, LZ1 + 12, 'chiseled_bookshelf')
    o.set(-122, 84, LZ1 + 4, -118, 85, LZ1 + 12, 'air')
    o.set(-122, 84, LZ1 + 4, -118, 84, LZ1 + 12, 'smooth_quartz')
    # the vault at B3 — iron doors, no windows, a single lit chamber
    o.set(-134, 47, -440, -122, 50, -432, 'air')
    o.set(-134, 47, -440, -122, 47, -432, 'polished_deepslate')
    o.set(-128, 47, -432, -127, 48, -432, 'iron_door')
    o.set(-133, 48, -439, -123, 49, -439, 'chiseled_bookshelf')
    o.set(-130, 51, -436, -126, 51, -436, 'sea_lantern')
    return o.write('lib3_fit.txt')


# ============================================================ CENTRAL PAVILION
PX1, PX2 = -105, -65
PZ1, PZ2 = -449, -425


def phase_pavilion():
    """The hinge of the quarter: open on all four sides, glass-roofed, linking the
    town (south), the library (west) and the concert hall (north)."""
    o = Ops()
    o.set(PX1 - 2, 60, PZ1 - 2, PX2 + 2, 66, PZ2 + 2, 'stone')
    o.set(PX1 - 2, 67, PZ1 - 2, PX2 + 2, 67, PZ2 + 2,
          '50%smooth_stone,30%polished_andesite,20%stone_bricks')
    o.set(PX1 - 2, 68, PZ1 - 2, PX2 + 2, 95, PZ2 + 2, 'air')
    # colonnade: paired columns on a 5-block rhythm, arcaded
    for x in range(PX1, PX2 + 1, 5):
        for z in (PZ1, PZ2):
            o.set(x, 68, z, x, 77, z, 'polished_diorite')
            o.set(x, 78, z, x, 78, z, 'polished_diorite_wall')
    for z in range(PZ1, PZ2 + 1, 6):
        for x in (PX1, PX2):
            o.set(x, 68, z, x, 77, z, 'polished_diorite')
            o.set(x, 78, z, x, 78, z, 'polished_diorite_wall')
    # entablature and a shallow glass vault
    o.set(PX1, 79, PZ1, PX2, 79, PZ2, 'smooth_quartz')
    o.set(PX1 + 1, 79, PZ1 + 1, PX2 - 1, 79, PZ2 - 1, 'air')
    for i in range(6):
        o.set(PX1 + i, 79 + i, PZ1 + i, PX2 - i, 79 + i, PZ2 - i, 'light_gray_stained_glass')
        o.set(PX1 + 1 + i, 79 + i, PZ1 + 1 + i, PX2 - 1 - i, 79 + i, PZ2 - 1 - i, 'air')
    o.set(PX1 + 6, 85, PZ1 + 6, PX2 - 6, 85, PZ2 - 6, 'light_gray_stained_glass')
    # a central fountain, benches, and lighting
    cx, cz = (PX1 + PX2) // 2, (PZ1 + PZ2) // 2
    o.set(cx - 4, 67, cz - 4, cx + 4, 67, cz + 4, 'polished_diorite')
    o.set(cx - 3, 67, cz - 3, cx + 3, 67, cz + 3, 'water')
    o.set(cx - 1, 68, cz - 1, cx + 1, 69, cz + 1, 'polished_diorite')
    o.set(cx - 1, 70, cz - 1, cx + 1, 70, cz + 1, 'water')
    for dx in (-14, 14):
        for dz in (-8, 8):
            o.set(cx + dx - 2, 68, cz + dz, cx + dx + 2, 68, cz + dz, 'dark_oak_slab')
    for x in range(PX1 + 2, PX2, 8):
        for z in range(PZ1 + 3, PZ2, 8):
            o.set(x, 77, z, x, 77, z, 'lantern[hanging=true]')
    return o.write('pav1.txt')


# ============================================================ AMSTERDAM SQUARE
def phase_square():
    """Amsterdam in four moves: klinker paving laid in bands, two canals flanking the
    Moot Hall with humped brick bridges, a terrace of narrow stepped-gable houses
    closing the south side, and elms with Amsterdammertjes along the quays."""
    o = Ops()
    SX1, SX2, SZ1, SZ2 = -105, -65, -395, -346
    # 1. klinker paving — banded, not a single flat tone
    o.set(SX1, 67, SZ1, SX2, 67, SZ2, '55%bricks,25%mud_bricks,20%granite')
    for z in range(SZ1, SZ2 + 1, 6):
        o.set(SX1, 67, z, SX2, 67, z, 'polished_granite')
    # the Moot Hall footprint is not paved over
    o.set(-100, 67, -392, -70, 67, -376, 'stone_bricks')

    # 2. the two canals, west and east of the hall, running north-south
    for cx1, cx2 in ((-105, -102), (-63, -60)):
        o.set(cx1, 64, SZ1, cx2, 67, -356, 'air')
        o.set(cx1, 63, SZ1, cx2, 63, -356, 'gravel')
        o.set(cx1, 64, SZ1, cx2, 66, -356, 'water')
        # quay walls and coping
        o.set(cx1 - 1, 64, SZ1, cx1 - 1, 67, -356, 'mossy_stone_bricks')
        o.set(cx2 + 1, 64, SZ1, cx2 + 1, 67, -356, 'mossy_stone_bricks')
        o.set(cx1 - 1, 67, SZ1, cx1 - 1, 67, -356, 'smooth_stone_slab')
        o.set(cx2 + 1, 67, SZ1, cx2 + 1, 67, -356, 'smooth_stone_slab')
        # humped brick bridges
        for bz in (-386, -368):
            o.set(cx1 - 1, 67, bz - 2, cx2 + 1, 67, bz + 2, 'bricks')
            o.set(cx1 - 1, 68, bz - 2, cx2 + 1, 68, bz + 2, 'bricks')
            o.set(cx1 - 1, 66, bz - 1, cx2 + 1, 66, bz + 1, 'bricks')
            o.set(cx1 - 1, 69, bz - 2, cx1 - 1, 69, bz + 2, 'cobblestone_wall')
            o.set(cx2 + 1, 69, bz - 2, cx2 + 1, 69, bz + 2, 'cobblestone_wall')
        # Amsterdammertjes: the little bollards along both quays
        for z in range(SZ1 + 2, -357, 4):
            o.set(cx1 - 2, 68, z, cx1 - 2, 68, z, 'polished_deepslate_wall')
            o.set(cx2 + 2, 68, z, cx2 + 2, 68, z, 'polished_deepslate_wall')

    # 3. the canal-house terrace closing the south side — narrow, tall, gabled
    z_front, z_back = -352, -346
    gables = ['step', 'bell', 'step', 'neck', 'bell', 'step', 'neck']
    palette = ['bricks', 'red_terracotta', 'bricks', 'brown_terracotta',
               'bricks', 'red_terracotta', 'bricks']
    x = SX1 + 1
    for i, g in enumerate(gables):
        w = 5 if i % 2 == 0 else 6
        if x + w > SX2:
            break
        mat = palette[i % len(palette)]
        top = 84 + (i % 3)                     # deliberately uneven rooflines
        o.set(x, 67, z_back, x + w - 1, top + 6, z_front, 'air')
        o.set(x, 67, z_back, x + w - 1, 67, z_front, 'stone_bricks')
        for zz in (z_back, z_front):
            o.set(x, 68, zz, x + w - 1, top, zz, mat)
        o.set(x, 68, z_back, x, top, z_front, mat)
        o.set(x + w - 1, 68, z_back, x + w - 1, top, z_front, mat)
        # tall narrow windows, one band per storey
        for fy in range(70, top - 2, 5):
            o.set(x + 1, fy, z_front, x + w - 2, fy + 2, z_front, 'glass_pane')
            o.set(x + 1, fy, z_back, x + w - 2, fy + 2, z_back, 'glass_pane')
            o.set(x + 1, fy - 1, z_back + 1, x + w - 2, fy - 1, z_front - 1, 'spruce_planks')
        o.set(x + w // 2 - 1, 68, z_front, x + w // 2, 69, z_front, 'air')
        o.set(x + w // 2 - 1, 68, z_front, x + w // 2, 69, z_front, 'spruce_door')
        # the gable itself
        if g == 'step':
            for s in range(4):
                o.set(x + s, top + 1 + s, z_front, x + w - 1 - s, top + 1 + s, z_back, mat)
        elif g == 'bell':
            for s, inset in enumerate((0, 0, 1, 2)):
                o.set(x + inset, top + 1 + s, z_front, x + w - 1 - inset, top + 1 + s, z_back, mat)
        else:                                   # neck gable
            o.set(x + 1, top + 1, z_front, x + w - 2, top + 3, z_back, mat)
            o.set(x + 2, top + 4, z_front, x + w - 3, top + 4, z_back, mat)
        # hoisting beam and pulley over the street — the giveaway detail
        o.set(x + w // 2, top + 1, z_front - 1, x + w // 2, top + 1, z_front - 1, 'oak_log')
        o.set(x + w // 2, top, z_front - 1, x + w // 2, top, z_front - 1, 'chain')
        o.set(x + w // 2, top - 1, z_front - 1, x + w // 2, top - 1, z_front - 1, 'lantern')
        x += w + 1

    # 4. the monument: a slim white column on the square's south axis
    mx, mz = -85, -360
    o.set(mx - 3, 67, mz - 3, mx + 3, 67, mz + 3, 'smooth_quartz')
    o.set(mx - 2, 68, mz - 2, mx + 2, 68, mz + 2, 'quartz_stairs')
    o.set(mx - 1, 68, mz - 1, mx + 1, 82, mz + 1, 'quartz_pillar')
    o.set(mx, 83, mz, mx, 84, mz, 'chiseled_quartz_block')
    o.set(mx - 1, 85, mz - 1, mx + 1, 85, mz + 1, 'sea_lantern')
    # street trees and lamps on the square proper
    for tx in range(SX1 + 6, SX2 - 4, 12):
        for tz in (-372, -358):
            o.set(tx, 68, tz, tx, 72, tz, 'oak_log')
            o.set(tx - 2, 73, tz - 2, tx + 2, 75, tz + 2, 'oak_leaves')
    for lx in range(SX1 + 3, SX2, 9):
        for lz in range(SZ1 + 5, SZ2, 11):
            o.set(lx, 68, lz, lx, 71, lz, 'cobblestone_wall')
            o.set(lx, 72, lz, lx, 72, lz, 'lantern')
    return o.write('sq1.txt')


# ============================================================ WALKWAYS
def phase_walkways():
    """Common roads. The town had none — buildings simply did not connect."""
    o = Ops()
    PAVE = '60%stone_bricks,25%andesite,15%cobblestone'

    def road(x1, z1, x2, z2, w=5):
        """A graded, lit road between two points, orthogonal legs."""
        if x1 != x2:
            a, b = sorted((x1, x2))
            o.set(a, 66, z1 - w // 2, b, 66, z1 + w // 2, 'dirt')
            o.set(a, 67, z1 - w // 2, b, 67, z1 + w // 2, PAVE)
            o.set(a, 68, z1 - w // 2, b, 71, z1 + w // 2, 'air')
            for x in range(a, b, 11):
                o.set(x, 68, z1 - w // 2 - 1, x, 70, z1 - w // 2 - 1, 'cobblestone_wall')
                o.set(x, 71, z1 - w // 2 - 1, x, 71, z1 - w // 2 - 1, 'lantern')
        if z1 != z2:
            a, b = sorted((z1, z2))
            o.set(x2 - w // 2, 66, a, x2 + w // 2, 66, b, 'dirt')
            o.set(x2 - w // 2, 67, a, x2 + w // 2, 67, b, PAVE)
            o.set(x2 - w // 2, 68, a, x2 + w // 2, 71, b, 'air')
            for z in range(a, b, 11):
                o.set(x2 - w // 2 - 1, 68, z, x2 - w // 2 - 1, 70, z, 'cobblestone_wall')
                o.set(x2 - w // 2 - 1, 71, z, x2 - w // 2 - 1, 71, z, 'lantern')

    # the north axis: plaza -> around the cottage -> pavilion -> concert hall
    road(-85, -395, -85, -398, 7)
    road(-85, -398, -108, -398, 7)          # jog west around the resident cottage
    road(-108, -398, -108, -437, 7)
    road(-108, -437, -85, -437, 7)
    road(-85, -437, -85, -449, 7)
    # library spur
    road(-108, -437, -127, -437, 5)
    road(-127, -437, -127, -426, 5)
    # Ring road tying the outlying buildings to the square.
    # RE-ROUTED 2026-07-26. The first version ran straight through three cottages --
    # road() clears y68-71 to air, which took out their walls and, in Cottage Mason,
    # two fittings and half a bed. Roads now keep clear of the cottage footprints:
    #   Cottage Scout    x[-64,-52] z[-350,-340]
    #   Cottage Mason    x[-58,-46] z[-380,-370]
    #   Cottage Surveyor x[-91,-79] z[-407,-400]
    road(-85, -336, -50, -336, 5)           # to the Market Hall, south of Cottage Scout
    road(-50, -336, -50, -364, 5)           # east of Cottage Scout, not through it
    road(-50, -364, -41, -364, 5)           # into the Grange Hall's east door
    road(-50, -345, -66, -345, 5)           # Market Hall spur
    return o.write('walk1.txt')


if __name__ == '__main__':
    fns = dict(libshell=phase_library_shell, libstairs=phase_library_stairs,
               libfit=phase_library_fit, pavilion=phase_pavilion,
               square=phase_square, walkways=phase_walkways)
    for w in (sys.argv[1:] or list(fns)):
        fns[w]()
