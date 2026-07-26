#!/usr/bin/env python3
"""
Generate build ops for the Ravensreach Concert Hall — a 1/8-scale SoFi Stadium.

Design follows the three-part identity test from the SoFi research:
  1. a milky translucent canopy floating free on skinny columns, open air under its brim
  2. a double-sided oval ring of light hovering over the floor (the Infinity Screen)
  3. a bowl you enter from the TOP, because the floor is buried

Emits phase files for scripts/build_runner.py. Nothing here touches the world.

Geometry, all derived from the research's 1/8 scale table:
  grade y=67 (town level)   floor y=55 (12 below grade)   rim y=81
  screen y70-74 (15 above floor)   canopy y83 rim -> y89 peak (34 above floor)
"""
import math, os, sys

CX, CZ = -85, -513          # bowl centre
GRADE, FLOOR = 67, 55
RIM = 81
BOWL_A, BOWL_B = 50, 40     # bowl outer radii -> x[-135,-35] z[-553,-473]
CAN_CZ = -506               # canopy centre (shifted south: the roof tails over the plaza)
CAN_A, CAN_B = 63, 56       # canopy radii  -> x[-148,-22] z[-562,-450]

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'buildops')
os.makedirs(OUT, exist_ok=True)


class Ops:
    """Emits absolute-coordinate ops only.

    An earlier version drove WorldEdit's //cyl, which is centred on the PLAYER. That
    silently failed: the bot falls between the /tp and the command reaching the server
    (measured: a cyl aimed at y=100 landed at y=98, one aimed at y=104 landed at y=101),
    so rings landed at unpredictable heights and fills/carves missed each other. Ellipses
    are therefore rasterised here in Python and emitted as //pos1//pos2//set boxes, which
    depend on nothing but the numbers."""

    def __init__(self):
        self.ops = []

    def cmd(self, c):
        self.ops.append('CMD ' + c)

    def set(self, x1, y1, z1, x2, y2, z2, pattern):
        self.ops.append(f'SET {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {pattern}')

    def repl(self, x1, y1, z1, x2, y2, z2, mask, pattern):
        self.ops.append(f'REPL {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {mask} {pattern}')

    def _rows(self, ra, rb, ria=0.0, rib=0.0):
        """Rasterise an ellipse (or annulus) into (dz_from, dz_to, outer_dx, inner_dx)
        groups, merging consecutive rows that share the same extents."""
        raw = []
        for dz in range(-int(rb), int(rb) + 1):
            t = 1.0 - (dz / rb) ** 2 if rb else 1.0
            if t < 0:
                continue
            ox = int(round(ra * math.sqrt(t)))
            ix = -1
            if rib and abs(dz) <= rib:
                t2 = 1.0 - (dz / rib) ** 2
                if t2 > 0:
                    ix = int(round(ria * math.sqrt(t2)))
            raw.append((dz, ox, ix))
        out, i = [], 0
        while i < len(raw):
            j = i
            while j + 1 < len(raw) and raw[j + 1][1:] == raw[i][1:]:
                j += 1
            out.append((raw[i][0], raw[j][0], raw[i][1], raw[i][2]))
            i = j + 1
        return out

    def disc(self, cx, y, cz, pattern, ra, rb):
        for za, zb, ox, _ in self._rows(ra, rb):
            self.set(cx - ox, y, cz + za, cx + ox, y, cz + zb, pattern)

    def ring(self, cx, y, cz, pattern, ra, rb, ria, rib):
        for za, zb, ox, ix in self._rows(ra, rb, ria, rib):
            if ix < 0:
                self.set(cx - ox, y, cz + za, cx + ox, y, cz + zb, pattern)
            else:
                self.set(cx - ox, y, cz + za, cx - ix - 1, y, cz + zb, pattern)
                self.set(cx + ix + 1, y, cz + za, cx + ox, y, cz + zb, pattern)

    def shell(self, cx, y, cz, pattern, ra, rb, t=1):
        """A hollow outline t blocks thick — the //hcyl replacement."""
        self.ring(cx, y, cz, pattern, ra, rb, max(ra - t, 0), max(rb - t, 0))

    def write(self, name):
        p = os.path.join(OUT, name)
        with open(p, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops -> {p}')
        return p


def bowl_radius(y):
    """Radius of the VOID at height y — everything outside this, inside the bowl
    footprint, is structure. The step between consecutive y values is the seating rake."""
    if y <= FLOOR:
        return 26, 16                                   # performance floor
    if y <= 64:                                         # lower bowl, 1:1.6 rake, 9 rows
        i = y - FLOOR
        return 26 + 1.6 * i, 16 + 1.6 * i
    if y <= 67:                                         # concourse / club band
        return 42, 32
    j = math.ceil((y - 67) / 2)                         # upper tier, 2 up per 1 back
    return 42 + j, 32 + j


# ---------------------------------------------------------------- phase 1: site
def phase_site():
    o = Ops()
    x1, x2 = CX - CAN_A, CX + CAN_A
    z1, z2 = CAN_CZ - CAN_B, CAN_CZ + CAN_B
    # strip everything above grade: trees, hillsides, the lot
    o.set(x1, GRADE + 1, z1, x2, 120, z2, 'air')
    # drain and consolidate below grade — the NW corner of the site is lake
    o.repl(x1, 40, z1, x2, GRADE, z2, 'water,lava', 'stone')
    o.repl(x1, 45, z1, x2, GRADE, z2, 'air,cave_air', 'stone')
    o.set(x1, GRADE, z1, x2, GRADE, z2, 'grass_block')
    return o.write('ch1_site.txt')


# ---------------------------------------------------------------- phase 2: bowl
def phase_bowl():
    o = Ops()
    # Reset: the first attempt at this bowl was built with //cyl and landed at the
    # wrong heights, so put the site back to virgin graded ground before rebuilding.
    o.set(CX - 52, 45, CZ - 42, CX + 52, GRADE - 1, CZ + 42, 'stone')
    o.set(CX - 52, GRADE, CZ - 42, CX + 52, GRADE, CZ + 42, 'grass_block')
    o.set(CX - 52, GRADE + 1, CZ - 42, CX + 52, 92, CZ + 42, 'air')
    # Then, level by level: fill the full footprint, carve the void back out. The
    # step between one level's void radius and the next IS the seating rake.
    for y in range(FLOOR, RIM + 1):
        ra, rb = bowl_radius(y)
        if y == FLOOR:
            pat = 'gray_concrete'
        elif y <= 64 or y >= 68:            # seating treads — charcoal, per photographs
            pat = '60%black_concrete,40%gray_concrete'
        else:                               # the premium club band reads warmer
            pat = 'polished_andesite'
        o.disc(CX, y, CZ, pat, BOWL_A, BOWL_B)
        o.disc(CX, y, CZ, 'air', round(ra), round(rb))
    # performance floor + stage end (north)
    o.disc(CX, FLOOR - 1, CZ, 'smooth_stone', 27, 17)
    o.set(CX - 26, FLOOR, CZ - 16, CX + 26, FLOOR, CZ + 16, 'gray_concrete')
    o.set(CX - 20, FLOOR, CZ - 16, CX + 20, FLOOR + 2, CZ - 10, 'blackstone')
    o.set(CX - 19, FLOOR + 3, CZ - 15, CX + 19, FLOOR + 3, CZ - 11, 'polished_blackstone')
    return o.write('ch2_bowl.txt')


# ------------------------------------------------------- phase 3: seats & access
def phase_seats():
    o = Ops()
    # Seat colour is baked into phase 2 (one pass, not two). This phase adds the
    # things that make the bowl legible: the club band's rail and lighting, and the
    # vomitories you actually walk through.
    o.shell(CX, 66, CZ, 'dark_oak_fence', 42, 32)
    o.shell(CX, 68, CZ, 'copper_bulb', 43, 33)
    # aisle steps radiating out through the seating, so the tiers are climbable
    for ang in range(0, 360, 30):
        r = math.radians(ang)
        for y in range(FLOOR + 1, RIM + 1):
            ra, rb = bowl_radius(y)
            x = CX + round((ra + 1) * math.cos(r))
            z = CZ + round((rb + 1) * math.sin(r))
            o.set(x, y, z, x, y, z, 'polished_andesite')
    # vomitories: four stair shafts from the grade-level concourse down into the bowl
    for dx, dz in ((-30, 0), (30, 0), (0, -26), (0, 26)):
        for i in range(13):
            y = GRADE - i
            x, z = CX + dx, CZ + dz
            o.set(x - 2, y, z - 2, x + 2, y + 3, z + 2, 'air')
            o.set(x - 2, y - 1, z - 2, x + 2, y - 1, z + 2, 'polished_andesite')
    return o.write('ch3_seats.txt')


# ------------------------------------------------------- phase 4: canyons (E/W)
def phase_canyons():
    """SoFi's bowl is NOTCHED, not a clean ring: two landscaped canyons carry planted
    paths from grade down to the lowest level. They break the symmetry."""
    o = Ops()
    for side in (-1, 1):
        for i in range(13):                       # terraced steps, grade -> floor
            y = GRADE - i
            xo = side * (BOWL_A - i)
            x = CX + xo
            o.set(min(x, CX + side * 26), y, CZ - 5, max(x, CX + side * 26), y + 4, CZ + 5, 'air')
            o.set(x - 2, y, CZ - 5, x + 2, y, CZ + 5, 'stone_bricks')
            o.set(x - 2, y + 1, CZ - 4, x + 2, y + 1, CZ - 3, 'grass_block')
            o.set(x - 2, y + 1, CZ + 3, x + 2, y + 1, CZ + 4, 'grass_block')
            if i % 3 == 0:
                o.set(x - 1, y + 2, CZ - 4, x + 1, y + 2, CZ - 3,
                      '40%azalea,30%flowering_azalea,30%fern')
                o.set(x - 1, y + 2, CZ + 3, x + 1, y + 2, CZ + 4,
                      '40%azalea,30%flowering_azalea,30%fern')
        # a trickle of water down the west canyon only
        if side < 0:
            o.set(CX - BOWL_A, GRADE, CZ, CX - 27, GRADE, CZ, 'water')
    return o.write('ch4_canyons.txt')


# --------------------------------------------------- phase 5: the Infinity Screen
def phase_screen():
    """A dual-sided oval RING, not a flat board. The ring shape is what makes people
    say SoFi — a jumbotron would kill it. Undulating bottom edge, hung on chains."""
    o = Ops()
    SA, SB = 22, 12
    for y in range(70, 75):
        o.shell(CX, y, CZ, 'black_concrete' if y in (70, 74) else 'sea_lantern', SA, SB)
        if y not in (70, 74):
            # outward and inward faces: backlit "content"
            o.shell(CX, y, CZ, '40%cyan_stained_glass,35%light_blue_stained_glass,'
                              '25%magenta_stained_glass', SA + 1, SB + 1)
            o.shell(CX, y, CZ, '40%cyan_stained_glass,35%light_blue_stained_glass,'
                              '25%magenta_stained_glass', SA - 1, SB - 1)
    # undulating: two deeper panels on the long axis
    for dx in (-SA, SA - 1):
        o.set(CX + dx - 1, 68, CZ - 4, CX + dx + 1, 69, CZ + 4, 'sea_lantern')
        o.set(CX + dx - 2, 68, CZ - 5, CX + dx + 2, 69, CZ + 5,
              '40%cyan_stained_glass,35%light_blue_stained_glass,25%magenta_stained_glass')
    # hung from the canopy grid
    for ang in range(0, 360, 45):
        r = math.radians(ang)
        x, z = CX + round(SA * math.cos(r)), CZ + round(SB * math.sin(r))
        o.set(x, 75, z, x, 82, z, 'chain')
    return o.write('ch5_screen.txt')


# -------------------------------------------------------- phase 6: canopy + brim
def phase_canopy():
    """One continuous sheet that touches nothing. Milky frit ETFE = WHITE stained
    glass, not clear. Frost-White perforated brim = white concrete speckled with
    calcite and diorite. A 2-block open gap runs the whole perimeter — non-negotiable."""
    o = Ops()
    ETFE = 'white_stained_glass'
    GRID = 'light_gray_stained_glass'
    BRIM = '55%white_concrete,25%calcite,20%diorite'
    # stepped dome: annulus per level, y83 at the brim rising to y89 at the peak
    steps = [(83, 63, 56), (84, 56, 48), (85, 48, 39),
             (86, 39, 29), (87, 29, 19), (88, 19, 10), (89, 10, 0)]
    for y, ro, ri in steps:
        b_o, b_i = round(ro * CAN_B / CAN_A), round(ri * CAN_B / CAN_A)
        pat = BRIM if y == 83 else ETFE
        o.disc(CX, y, CAN_CZ, pat, ro, max(b_o, 1))
        if ri:
            o.disc(CX, y, CAN_CZ, 'air', ri, max(b_i, 1))
    # the cable net read as an orthogonal grid — light still passes, grid still reads
    for x in range(CX - 56, CX + 57, 5):
        o.repl(x, 84, CAN_CZ - 56, x, 89, CAN_CZ + 56, ETFE, GRID)
    for z in range(CAN_CZ - 56, CAN_CZ + 57, 5):
        o.repl(CX - 63, 84, z, CX + 63, 89, z, ETFE, GRID)
    # tension net slung beneath the glass
    for x in range(CX - 50, CX + 51, 10):
        o.repl(x, 83, CAN_CZ - 50, x, 88, CAN_CZ + 50, 'air', 'chain')
    # compression ring where ETFE meets brim
    o.shell(CX, 83, CAN_CZ, 'polished_deepslate', 56, round(56 * CAN_B / CAN_A), 2)
    # 12 skinny columns, standing OUTSIDE the bowl, and nothing else
    for ang in range(0, 360, 30):
        r = math.radians(ang)
        x = CX + round(57 * math.cos(r))
        z = CAN_CZ + round(50 * math.sin(r))
        o.set(x, GRADE, z, x, 82, z, 'polished_deepslate')
        o.set(x - 1, 82, z, x + 1, 82, z, 'polished_deepslate_wall')
        o.set(x, 82, z - 1, x, 82, z + 1, 'polished_deepslate_wall')
    # roof vents: four panels in a different glass, two genuinely open
    o.set(CX - 30, 85, CAN_CZ - 24, CX - 24, 87, CAN_CZ - 18, 'light_blue_stained_glass')
    o.set(CX + 24, 85, CAN_CZ + 18, CX + 30, 87, CAN_CZ + 24, 'light_blue_stained_glass')
    o.set(CX - 30, 85, CAN_CZ + 18, CX - 24, 87, CAN_CZ + 24, 'air')
    o.set(CX + 24, 85, CAN_CZ - 24, CX + 30, 87, CAN_CZ - 18, 'air')
    # the LED pucks: point-down light under the whole canopy
    for x in range(CX - 55, CX + 56, 9):
        for z in range(CAN_CZ - 48, CAN_CZ + 49, 9):
            o.set(x, 82, z, x, 82, z, 'end_rod[facing=down]')
    return o.write('ch6_canopy.txt')


# ------------------------------------------- phase 7: plaza, approach, lake, park
def phase_plaza():
    """The canopy overshoots the bowl by a whole plaza at one end — that asymmetric
    tail is what separates the silhouette from a generic oval arena. Approach reads
    park -> lake with waterfall -> under the brim -> plaza -> rim -> descend."""
    o = Ops()
    pz1, pz2 = CZ + 42, CAN_CZ + 56          # -471 .. -450, the covered plaza
    o.set(CX - 46, GRADE, pz1, CX + 46, GRADE, pz2,
          '50%smooth_stone,25%polished_andesite,25%stone_bricks')
    # food stalls / gathering, kept low so the canopy still reads as the roof
    for dx in (-34, -18, 18, 34):
        x = CX + dx
        o.set(x - 4, GRADE + 1, pz1 + 4, x + 4, GRADE + 4, pz1 + 10, 'air')
        o.set(x - 4, GRADE + 1, pz1 + 4, x + 4, GRADE + 3, pz1 + 4, 'spruce_planks')
        o.set(x - 4, GRADE + 1, pz1 + 10, x + 4, GRADE + 3, pz1 + 10, 'spruce_planks')
        o.set(x - 4, GRADE + 4, pz1 + 4, x + 4, GRADE + 4, pz1 + 10, 'dark_oak_slab')
        o.set(x - 3, GRADE + 1, pz1 + 5, x + 3, GRADE + 1, pz1 + 5, 'smooth_quartz')
        o.set(x - 3, GRADE + 3, pz1 + 6, x + 3, GRADE + 3, pz1 + 6, 'lantern[hanging=true]')
    # Rivers Lake: a 12ft waterfall stepping down to two 4ft falls, at 1/8 -> 2 then two 1
    lx, lz = CX + 52, CZ + 60
    o.set(lx - 16, GRADE - 3, lz - 10, lx + 16, GRADE, lz + 10, 'air')
    o.set(lx - 16, GRADE - 4, lz - 10, lx + 16, GRADE - 4, lz + 10, 'gravel')
    o.set(lx - 15, GRADE - 3, lz - 9, lx + 15, GRADE - 1, lz + 9, 'water')
    o.set(lx - 4, GRADE + 2, lz - 10, lx + 4, GRADE + 2, lz - 10, 'water')
    o.set(lx - 10, GRADE, lz - 9, lx - 6, GRADE, lz - 9, 'water')
    o.set(lx + 6, GRADE, lz - 9, lx + 10, GRADE, lz - 9, 'water')
    o.set(lx - 17, GRADE, lz - 11, lx + 17, GRADE, lz + 11, 'stripped_spruce_log')
    o.repl(lx - 15, GRADE - 3, lz - 9, lx + 15, GRADE, lz + 9, 'stripped_spruce_log', 'water')
    return o.write('ch7_plaza.txt')


if __name__ == '__main__':
    want = sys.argv[1:] or ['site', 'bowl', 'seats', 'canyons', 'screen', 'canopy', 'plaza']
    fns = dict(site=phase_site, bowl=phase_bowl, seats=phase_seats, canyons=phase_canyons,
               screen=phase_screen, canopy=phase_canopy, plaza=phase_plaza)
    for w in want:
        fns[w]()
