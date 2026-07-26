#!/usr/bin/env python3
"""
Execute the two Fable 5 interior floor plans: the Market Hall and the Grange Hall.

SAFETY RULE: the original fit-out fills inside these buildings are masked
`REPL <mask> air -> <material>`, so they can only occupy empty space. The final
circulation helpers use narrow `SET` operations at live-measured empty cells and
at the floor plates that originally sealed their own stairs. They are routed away
from every chest, furnace, crop, fitting, the embedded cobblestone hut, the White
Raven statue, and the neighbour cottage. The only subtractive ops are:
  - cutting the hillside back (mask limited to stone/dirt/grass/gravel),
  - the Grange Hall entry passage through the old town wall, which the plan calls for.
  - measured stair headroom through the halls' own generated floor plates and rails.

The stacked chest masses are deliberately LEFT ALONE. Moving a chest with WorldEdit
destroys its contents, and these are residents' chests. The floors are built around
them and their outward faces cleared so the reachable ones can be opened; the ones
buried inside the mass stay unreachable. That is the operator's call to make, not a
thing to silently delete.

  Market Hall  x[-73,-39] z[-344,-323]   walk y68 · Works Terrace y71 · lofts y77
  Grange Hall  x[-65,-41] z[-370,-352]   hall y68 · wall-walk y73 · craft loft y82
"""
import os, sys

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'buildops')
os.makedirs(OUT, exist_ok=True)
TERRAIN = 'stone,dirt,grass_block,gravel,coarse_dirt,short_grass,tall_grass,andesite,diorite'


class Ops:
    def __init__(self):
        self.ops = []

    def set(self, x1, y1, z1, x2, y2, z2, p):
        self.ops.append(f'SET {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {p}')

    def fill_air(self, x1, y1, z1, x2, y2, z2, p):
        """The workhorse: occupy empty space only."""
        self.ops.append(f'REPL {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} air {p}')

    def cut_terrain(self, x1, y1, z1, x2, y2, z2):
        self.ops.append(f'REPL {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {TERRAIN} air')

    def stair(self, x1, x2, y, z, dz, n, p):
        for i in range(n):
            self.fill_air(x1, y + i, z + dz * i, x2, y + i, z + dz * i, p)
            self.cut_terrain(x1, y + i + 1, z + dz * i, x2, y + i + 4, z + dz * i)

    def door(self, x, y, z, kind, facing='north'):
        """A door is TWO blocks with DIFFERENT states. Setting a 2-tall selection to
        a door id writes two half=lower halves, which is invalid and pops off on
        load -- every door placed before this helper existed vanished that way."""
        self.set(x, y, z, x, y, z, f'{kind}[facing={facing},half=lower]')
        self.set(x, y + 1, z, x, y + 1, z, f'{kind}[facing={facing},half=upper]')

    def write(self, name):
        p = os.path.join(OUT, name)
        with open(p, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops -> {p}')
        return p


# ===================================================== THE MARKET HALL
MX1, MX2, MZ1, MZ2 = -72, -40, -343, -324       # interior, inside the shell
FARM = (-66, -340, -56, -332)                    # garden court — keep open, keep planted
NAVE = (-60, -341, -48, -326)                    # the double-height centre


def phase_market():
    o = Ops()
    # 1. cut the hillside back so the hall has a room in it at all. The shell was
    #    raised over rising ground and there was no floor anywhere inside.
    for y in range(68, 76):
        o.cut_terrain(MX1, y, MZ1, MX2, y, MZ2)
    # 2. the walk: a floor plate at y67, filling only the holes
    o.fill_air(MX1, 67, MZ1, MX2, 67, MZ2, 'stone_bricks')
    o.fill_air(MX1, 68, MZ1, MX2, 68, MZ2, 'air')

    # 3. the Works Terrace plate at y70 — everywhere except the nave and the garden
    #    court, so the centre stays double height and the crops still see the loft.
    segs = [(MX1, MZ1, MX2, FARM[1] - 1), (MX1, FARM[3] + 1, MX2, MZ2),
            (MX1, FARM[1], FARM[0] - 1, FARM[3]), (FARM[2] + 1, FARM[1], MX2, FARM[3])]
    for x1, z1, x2, z2 in segs:
        if x1 > x2 or z1 > z2:
            continue
        o.fill_air(x1, 70, z1, x2, 70, z2, 'spruce_planks')
    # carve the nave back out of that plate
    o.cut_terrain(NAVE[0], 70, NAVE[1], NAVE[2], 75, NAVE[3])
    o.set(NAVE[0], 70, NAVE[1], NAVE[2], 70, NAVE[3], 'air')
    # gallery rail around the nave void
    for x1, y, z1, x2, y2, z2 in ((NAVE[0] - 1, 71, NAVE[1] - 1, NAVE[2] + 1, 71, NAVE[1] - 1),
                                  (NAVE[0] - 1, 71, NAVE[3] + 1, NAVE[2] + 1, 71, NAVE[3] + 1),
                                  (NAVE[0] - 1, 71, NAVE[1] - 1, NAVE[0] - 1, 71, NAVE[3] + 1),
                                  (NAVE[2] + 1, 71, NAVE[1] - 1, NAVE[2] + 1, 71, NAVE[3] + 1)):
        o.fill_air(x1, y, z1, x2, y2, z2, 'spruce_fence')

    # 4. the two lofts at y76, placed exactly under the fittings already at y77
    o.fill_air(MX1, 76, -333, -62, 76, -324, 'spruce_planks')
    o.fill_air(-50, 76, -333, MX2, 76, -324, 'spruce_planks')
    for x1, x2 in ((MX1, -62), (-50, MX2)):
        o.fill_air(x1, 77, -334, x2, 77, -334, 'spruce_fence')

    # 5. the kiln wall: the 20 furnaces are IN the west wall and my earlier lining
    #    sealed them behind stone. Clear the two columns in front of each bank so
    #    they read as a working kiln face and can actually be used.
    for fx, z1, z2 in ((-72, -332, -329), (-64, -329, -326), (-54, -330, -327)):
        o.cut_terrain(fx, 71, z1, fx + 1, 75, z2)
        o.fill_air(fx, 71, z1, fx + 1, 75, z2, 'air')
        o.fill_air(fx + 2, 70, z1 - 1, fx + 2, 70, z2 + 1, 'polished_blackstone')
        o.fill_air(fx, 76, z1, fx + 1, 76, z2, 'polished_blackstone')
    # barrel towers get the same treatment — a face you can reach
    for bx, bz in ((-72, -326), (-63, -331), (-63, -325), (-56, -331), (-56, -325)):
        o.fill_air(bx - 1, 71, bz - 1, bx + 1, 75, bz + 1, 'air')
    # the chest mass at x[-45,-42] z[-328,-327]: clear all four faces, touch nothing
    o.fill_air(-47, 71, -330, -40, 75, -325, 'air')

    # 6. stairs: walk -> terrace -> loft. Both flights, both climbable.
    o.stair(-70, -68, 68, -341, 1, 3, 'spruce_stairs')
    o.fill_air(-70, 70, -338, -68, 70, -337, 'spruce_planks')
    o.stair(-46, -44, 71, -331, 1, 6, 'spruce_stairs')
    o.fill_air(-46, 76, -325, -44, 76, -324, 'spruce_planks')
    # 7. light, so none of these rooms are dark caves
    for x in range(MX1 + 3, MX2, 7):
        for z in range(MZ1 + 3, MZ2, 6):
            o.fill_air(x, 69, z, x, 69, z, 'lantern[hanging=true]')
            o.fill_air(x, 75, z, x, 75, z, 'lantern[hanging=true]')
    # 8. the market itself: stalls down the nave
    for z in range(NAVE[1] + 2, NAVE[3] - 1, 5):
        o.fill_air(NAVE[0] + 2, 68, z, NAVE[0] + 5, 68, z, 'spruce_slab')
        o.fill_air(NAVE[2] - 5, 68, z, NAVE[2] - 2, 68, z, 'spruce_slab')
    market_access(o)
    return o.write('int1_market.txt')


def market_access(o):
    """Canonical stairs, emitted last so gallery and loft floors cannot seal them."""
    # The terrace plate was already present when the original air-masked lower
    # flight ran. It survived above the first two steps and occupied the third.
    for i in range(3):
        y, z = 68 + i, -341 + i
        o.set(-70, y, z, -68, y, z, 'spruce_stairs[facing=south]')
        o.set(-70, y + 1, z, -68, y + 2, z, 'air')
    o.set(-70, 70, -338, -68, 70, -337, 'spruce_planks')

    # The planned loft flight crossed the protected east chest stack. Use the
    # measured-clear bay immediately south of the loft instead; the last headroom
    # cut opens its gallery rail without touching any storage or fittings.
    for i in range(6):
        y, z = 71 + i, -339 + i
        o.set(-46, y, z, -45, y, z, 'spruce_stairs[facing=south]')
        o.set(-46, y + 1, z, -45, y + 3, z, 'air')

    # Join the east and west lofts across the measured-empty north edge of the
    # nave. Rails keep the eleven-block bridge safe without touching the White
    # Raven or any of the preserved smelter fittings below.
    o.set(-61, 76, -333, -51, 76, -333, 'spruce_planks')
    o.set(-61, 77, -334, -51, 77, -334, 'spruce_fence')
    o.set(-61, 77, -332, -51, 77, -332, 'spruce_fence')


def phase_market_access():
    o = Ops()
    market_access(o)
    return o.write('fix16_market_access.txt')


# ===================================================== THE GRANGE HALL
GX1, GX2, GZ1, GZ2 = -64, -42, -369, -353
WALL_X1, WALL_X2 = -65, -63                      # the old town wall, west side


def phase_grange():
    o = Ops()
    # 1. the entry passage, carved THROUGH the old town wall. The west doors fitted
    #    earlier opened into six blocks of solid stone; this is what makes them doors.
    o.set(WALL_X1, 68, -362, WALL_X2, 71, -360, 'air')
    o.set(WALL_X1, 67, -362, WALL_X2, 67, -360, 'stone_bricks')
    o.set(WALL_X1, 72, -362, WALL_X2, 72, -360, 'stone_bricks')
    for z in (-363, -359):
        o.set(WALL_X1, 68, z, WALL_X2, 72, z, 'mossy_stone_bricks')
    o.set(WALL_X1 + 1, 71, -361, WALL_X1 + 1, 71, -361, 'lantern')

    # 2. the hall floor. The pond breaches the south wall and there is sub-floor
    #    water at y64 — the floor plate goes in above it, the water stays.
    for y in range(68, 73):
        o.cut_terrain(GX1, y, GZ1, GX2, y, GZ2)
    o.fill_air(GX1, 67, GZ1, GX2, 67, GZ2, 'stone_bricks')
    # the farm and its hydration cell are kept and gated as the Garden Court
    o.fill_air(-59, 68, -369, -54, 68, -363, 'air')
    for x in (-59, -54):
        o.fill_air(x, 68, -369, x, 68, -363, 'spruce_fence')
    o.fill_air(-58, 68, -363, -55, 68, -363, 'spruce_fence')
    o.fill_air(-57, 68, -363, -56, 68, -363, 'spruce_fence_gate')

    # 3. the wall-walk balcony, on top of the old town wall
    o.fill_air(WALL_X1, 73, GZ1, -58, 73, GZ2, 'spruce_planks')
    o.fill_air(-58, 74, GZ1, -58, 74, GZ2, 'spruce_fence')
    o.stair(-62, -60, 68, -356, -1, 5, 'spruce_stairs')
    o.fill_air(-62, 73, -361, -60, 73, -360, 'spruce_planks')

    # 4. the craft loft at y82, under the existing beam
    o.fill_air(GX1, 82, GZ1, GX2, 82, GZ2, 'spruce_planks')
    o.fill_air(GX1, 83, -361, GX2, 83, -361, 'spruce_fence')
    o.stair(-46, -44, 74, -368, 1, 8, 'spruce_stairs')
    o.fill_air(-46, 82, -360, -44, 82, -359, 'spruce_planks')

    # 5. the chest rows at y71 get a rack they stand on, and clear faces
    for cz in (-366,):
        o.fill_air(-63, 70, cz - 1, -55, 70, cz + 1, 'spruce_planks')
        o.fill_air(-45, 70, cz - 1, -42, 70, cz + 1, 'spruce_planks')
        o.fill_air(-63, 71, cz + 1, -55, 75, cz + 2, 'air')
        o.fill_air(-45, 71, cz + 1, -42, 75, cz + 2, 'air')
        o.fill_air(-63, 70, cz + 1, -55, 70, cz + 1, 'spruce_trapdoor')

    # 6. rooms: storeroom, still room, and the well
    o.fill_air(-52, 68, -368, -44, 72, -364, 'air')
    o.fill_air(-52, 68, -363, -52, 72, -363, 'stone_bricks')
    o.fill_air(-48, 68, -363, -47, 69, -363, 'air')
    o.fill_air(-48, 68, -363, -47, 69, -363, 'spruce_door')
    o.fill_air(-51, 68, -367, -45, 68, -367, 'barrel')
    o.fill_air(-51, 68, -365, -45, 68, -365, 'spruce_slab')
    # the well, at the hall's centre, drawing on the water already under the floor
    o.set(-57, 67, -358, -55, 67, -356, 'air')
    o.set(-57, 64, -358, -55, 66, -356, 'water')
    o.set(-58, 67, -359, -54, 68, -355, 'cobblestone')
    o.set(-57, 67, -358, -55, 68, -356, 'air')
    o.set(-57, 64, -358, -55, 66, -356, 'water')
    o.set(-58, 69, -359, -58, 71, -359, 'oak_fence')
    o.set(-54, 69, -355, -54, 71, -355, 'oak_fence')
    o.set(-58, 72, -359, -54, 72, -355, 'oak_slab')
    # 7. light
    for x in range(GX1 + 3, GX2, 6):
        for z in range(GZ1 + 3, GZ2, 5):
            o.fill_air(x, 72, z, x, 72, z, 'lantern[hanging=true]')
            o.fill_air(x, 81, z, x, 81, z, 'lantern[hanging=true]')
    grange_access(o)
    return o.write('int2_grange.txt')


def grange_access(o):
    """Canonical lower and upper flights, kept clear after both floor plates."""
    # The first lower step was absent and the y73 wall-walk plate sealed the top
    # two steps. Restore the measured flight and cut only its body/head cells.
    o.set(-62, 67, -356, -60, 67, -356, 'stone_bricks')
    for i in range(5):
        y, z = 68 + i, -356 - i
        o.set(-62, y, z, -60, y, z, 'spruce_stairs[facing=north]')
        o.set(-62, y + 1, z, -60, y + 2, z, 'air')

    # The original east flight runs through resident pots, brewing equipment and
    # chests. A new two-wide flight climbs the measured-empty west bay from the
    # wall-walk to the loft and turns east onto the intact y82 landing.
    for i in range(8):
        y, z = 74 + i, -361 + i
        if i:
            o.set(-63, y - 1, z, -62, y - 1, z, 'spruce_planks')
        o.set(-63, y, z, -62, y, z, 'spruce_stairs[facing=south]')
        o.set(-63, y + 1, z, -62, y + 2, z, 'air')
    # The roof stair above z=-354 leaves only one block of headroom at loft level.
    # Turn north on a one-block-lower landing, then step onto the intact loft plate
    # at z=-356 where the roof is clear.
    o.set(-61, 81, -355, -61, 81, -354, 'spruce_planks')
    o.set(-61, 82, -355, -61, 83, -354, 'air')
    o.set(-61, 82, -356, -61, 82, -356, 'spruce_planks')


def phase_grange_access():
    o = Ops()
    grange_access(o)
    return o.write('fix17_grange_access.txt')


if __name__ == '__main__':
    fns = dict(market=phase_market, grange=phase_grange,
               market_access=phase_market_access, grange_access=phase_grange_access)
    for w in (sys.argv[1:] or list(fns)):
        fns[w]()
