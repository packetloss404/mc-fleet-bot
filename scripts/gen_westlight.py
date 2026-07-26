#!/usr/bin/env python3
"""
WESTLIGHT — the stacked stadium complex at (-360,-560), out west of Ravensreach.

Two venues, one structure, one floating canopy:

  y14-17   foundation raft
  y18      THEATRE FLOOR          the enclosed house, modelled on YouTube Theater
  y19-33   orchestra, fan-raked   15 rows facing an end stage
  y35      parterre concourse
  y36-46   balcony, cantilevered  11 rows
  y47-49   sky grid               flat technical ceiling -- NOT a fly tower
  y50-53   theatre structural lid
  y54-57   TRANSFER SLAB          4 courses minimum; a ceiling below, ground above
  y58      STADIUM FIELD          nine blocks below town grade
  y59-81   stadium bowl           23 terraces, 2-deep treads, rake 1:2
  y67      GRADE CONCOURSE        you walk in at grade, the field is below you
  y82-83   promenade and parapet
  y84-87   OPEN LIGHT BAND        continuous gap -- the canopy touches nothing
  y88-94   canopy                 radii 74x66, on 12 columns at 70x62

The canopy is deliberately BIGGER than the one in town (74x66 vs 63x56) and its
columns stand further out (70x62 vs 57x50). That is the one change that makes an
honest 10,000 possible: the previous site was capped at ~6,200 by plan area inside
the column ring, and no rake or balcony trick beats a geometric ceiling.

Emits ops for scripts/build_runner.py -- absolute coordinates only.
"""
import math, os, sys

WX, WZ = -360, -560
GRADE, FIELD = 67, 58
TH_FLOOR = 18
CAN_A, CAN_B = 74, 66           # canopy radii
COL_A, COL_B = 70, 62           # column ring
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

    def door(self, x, y, z, kind, facing='north'):
        self.set(x, y, z, x, y, z, f'{kind}[facing={facing},half=lower]')
        self.set(x, y + 1, z, x, y + 1, z, f'{kind}[facing={facing},half=upper]')

    def _rows(self, ra, rb, ria=0.0, rib=0.0, half=None):
        raw = []
        for dz in range(-int(rb), int(rb) + 1):
            if half == 'south' and dz < 0:
                continue
            if half == 'north' and dz > 0:
                continue
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
            while (j + 1 < len(raw) and raw[j + 1][1:] == raw[i][1:]
                   and raw[j + 1][0] == raw[j][0] + 1):
                j += 1
            out.append((raw[i][0], raw[j][0], raw[i][1], raw[i][2]))
            i = j + 1
        return out

    def disc(self, cx, y, cz, p, ra, rb, half=None, y2=None):
        for za, zb, ox, _ in self._rows(ra, rb, half=half):
            self.set(cx - ox, y, cz + za, cx + ox, y2 or y, cz + zb, p)

    def ring(self, cx, y, cz, p, ra, rb, ria, rib, half=None, y2=None):
        yy = y2 or y
        for za, zb, ox, ix in self._rows(ra, rb, ria, rib, half=half):
            if ix < 0:
                self.set(cx - ox, y, cz + za, cx + ox, yy, cz + zb, p)
            else:
                self.set(cx - ox, y, cz + za, cx - ix - 1, yy, cz + zb, p)
                self.set(cx + ix + 1, y, cz + za, cx + ox, yy, cz + zb, p)

    def shell(self, cx, y, cz, p, ra, rb, t=1, y2=None):
        self.ring(cx, y, cz, p, ra, rb, max(ra - t, 0), max(rb - t, 0), y2=y2)

    def write(self, name):
        path = os.path.join(OUT, name)
        with open(path, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops')
        return path


def zr(xr):
    """The complex keeps a constant 8-block difference between its semi-axes, so it
    reads as an oval rather than a circle without becoming a slot."""
    return xr - 8


# =========================================================== 0. SITE
def phase_site():
    o = Ops()
    x1, x2 = WX - CAN_A - 6, WX + CAN_A + 6
    z1, z2 = WZ - CAN_B - 6, WZ + CAN_B + 6
    o.set(x1, GRADE + 1, z1, x2, 130, z2, 'air')          # strip trees and hillside
    o.repl(x1, 10, z1, x2, GRADE, z2, 'water,lava', 'stone')
    o.repl(x1, 12, z1, x2, GRADE, z2, 'air,cave_air', 'stone')
    o.set(x1, GRADE, z1, x2, GRADE, z2, 'grass_block')
    return o.write('wl0_site.txt')


# =========================================================== 1. THE THEATRE
def phase_theatre():
    """A fan-shaped end-stage house inside a deep blue drum, with a flat technical
    sky grid overhead and a three-level lobby crescent wrapped around the outside.
    Modelled on YouTube Theater, which is itself a theatre tucked under a stadium."""
    o = Ops()
    DRUM_A, DRUM_B = 46, zr(46)          # drum inner face
    LOB_A = 58                            # lobby outer face
    STAGE_Z = WZ - 30                     # end stage sits at the north end

    # --- excavate the whole cavity and found it
    o.disc(WX, 14, WZ, 'deepslate_bricks', LOB_A + 3, zr(LOB_A) + 3, y2=17)
    o.disc(WX, TH_FLOOR, WZ, 'air', LOB_A + 1, zr(LOB_A) + 1, y2=53)
    o.disc(WX, TH_FLOOR - 1, WZ, 'polished_deepslate', LOB_A + 1, zr(LOB_A) + 1)

    # --- THE BLUE DRUM: the single strongest identity move. You circulate around it
    #     in the lobby, then pass THROUGH it into the house.
    o.shell(WX, TH_FLOOR, WZ, 'blue_concrete', DRUM_A + 2, DRUM_B + 2, 2, y2=50)
    for y in range(TH_FLOOR + 3, 50, 5):                  # panel seams
        o.shell(WX, y, WZ, 'blue_terracotta', DRUM_A + 2, DRUM_B + 2, 2)

    # --- the fan bowl. Rows are elliptical arcs centred on the STAGE, not the room,
    #     so every seat faces the same place. Only the half facing the stage is built.
    for i in range(15):                                    # orchestra, rake 1:2
        rad = 14 + 2 * i
        y = TH_FLOOR + 1 + i
        o.disc(WX, y, STAGE_Z, 'dark_prismarine_stairs', 44, zr(44) + 6, half='south')
        o.disc(WX, y, STAGE_Z, 'air', rad, zr(rad) + 6, half='south')
    o.disc(WX, TH_FLOOR, STAGE_Z, 'gray_concrete', 13, 13, half='south')   # flat floor
    # parterre concourse, then the CANTILEVERED balcony -- it overhangs rather than
    # terracing back, which is what says "modern concert hall" and not "amphitheatre"
    o.ring(WX, 35, STAGE_Z, 'polished_andesite', 40, zr(40) + 6, 34, zr(34) + 6,
           half='south')
    for i in range(11):
        rad = 36 + i
        y = 36 + i
        o.disc(WX, y, STAGE_Z, 'dark_prismarine_stairs', 47, zr(47) + 6, half='south')
        o.disc(WX, y, STAGE_Z, 'air', rad, zr(rad) + 6, half='south')
    o.ring(WX, 47, STAGE_Z, 'dark_oak_fence', 47, zr(47) + 6, 46, zr(46) + 6,
           half='south')

    # --- the stage: 34 x 17, a soft black portal rather than a masonry arch
    o.set(WX - 17, TH_FLOOR, STAGE_Z - 17, WX + 17, TH_FLOOR, STAGE_Z, 'dark_oak_planks')
    o.set(WX - 17, TH_FLOOR + 1, STAGE_Z, WX + 17, TH_FLOOR + 1, STAGE_Z,
          'polished_blackstone_slab')
    for dx in (-15, 15):                                   # portal legs
        o.set(WX + dx - 2, TH_FLOOR + 1, STAGE_Z + 1, WX + dx + 2, 33, STAGE_Z + 1,
              'black_wool')
    o.set(WX - 13, 30, STAGE_Z + 1, WX + 13, 33, STAGE_Z + 1, 'black_wool')  # border
    o.set(WX - 17, TH_FLOOR + 1, STAGE_Z - 17, WX + 17, 33, STAGE_Z - 17, 'black_wool')
    # the SkyDeck: a tension-wire grid over the stage, dense, walkable, no fly loft
    for x in range(WX - 16, WX + 17, 3):
        o.set(x, 43, STAGE_Z - 16, x, 43, STAGE_Z, 'polished_blackstone_slab')
    for z in range(STAGE_Z - 16, STAGE_Z + 1, 3):
        o.set(WX - 16, 43, z, WX + 16, 43, z, 'polished_blackstone_slab')
    o.repl(WX - 16, 43, STAGE_Z - 16, WX + 16, 43, STAGE_Z, 'air', 'iron_bars')
    for dx in range(-12, 13, 6):                           # chain hoists and fixtures
        o.set(WX + dx, 40, STAGE_Z - 8, WX + dx, 42, STAGE_Z - 8,
              'minecraft:iron_chain')
        o.set(WX + dx, 39, STAGE_Z - 8, WX + dx, 39, STAGE_Z - 8, 'ochre_froglight')
    for dx in range(-14, 15, 7):                           # the L-ISA speaker hangs
        o.set(WX + dx, 34, STAGE_Z + 2, WX + dx, 38, STAGE_Z + 2, 'black_concrete')
        o.set(WX + dx, 39, STAGE_Z + 2, WX + dx, 42, STAGE_Z + 2,
              'minecraft:iron_chain')

    # --- the sky grid over the HOUSE, and the lid above it
    o.disc(WX, 47, WZ, 'black_concrete', DRUM_A, DRUM_B)
    for x in range(WX - 44, WX + 45, 6):
        o.set(x, 44, WZ - 36, x, 44, WZ + 36, 'polished_blackstone_slab')
    for z in range(WZ - 36, WZ + 37, 6):
        o.set(WX - 44, 44, z, WX + 44, 44, z, 'polished_blackstone_slab')
    for x in range(WX - 42, WX + 43, 12):
        for z in range(WZ - 30, WZ + 31, 12):
            o.set(x, 45, z, x, 46, z, 'minecraft:iron_chain')
            o.set(x, 43, z, x, 43, z, 'ochre_froglight')
    o.disc(WX, 48, WZ, 'polished_deepslate', DRUM_A + 2, DRUM_B + 2, y2=53)

    # --- THE LOBBY CRESCENT: three levels between the drum and a backlit façade.
    #     The façade is the trick that stops an underground room reading as a cave --
    #     it gives the light a direction, like daylight through glass.
    for lvl, y in enumerate((TH_FLOOR, 29, 40)):
        o.ring(WX, y, WZ, 'polished_diorite', LOB_A, zr(LOB_A), DRUM_A + 3, DRUM_B + 3)
        o.ring(WX, y + 1, WZ, 'air', LOB_A - 1, zr(LOB_A) - 1, DRUM_A + 3, DRUM_B + 3,
               y2=y + 9)
        # bars east and west on every level
        for ang in (90, 270):
            r = math.radians(ang)
            bx = WX + round((LOB_A - 5) * math.cos(r))
            bz = WZ + round((zr(LOB_A) - 5) * math.sin(r))
            o.set(bx - 4, y + 1, bz - 1, bx + 4, y + 1, bz + 1, 'polished_blackstone')
            o.set(bx - 4, y + 2, bz - 1, bx + 4, y + 2, bz + 1, 'dark_oak_slab')
            o.set(bx - 4, y + 3, bz - 2, bx + 4, y + 4, bz - 2, 'dark_oak_trapdoor')
            o.set(bx - 3, y + 3, bz - 2, bx + 3, y + 3, bz - 2, 'amethyst_block')
    o.shell(WX, TH_FLOOR, WZ, 'smooth_quartz', LOB_A + 2, zr(LOB_A) + 2, 1, y2=50)
    o.shell(WX, TH_FLOOR + 1, WZ, 'white_stained_glass', LOB_A + 1, zr(LOB_A) + 1, 1,
            y2=49)
    o.shell(WX, TH_FLOOR + 1, WZ, 'sea_lantern', LOB_A + 3, zr(LOB_A) + 3, 1, y2=49)
    # the three-storey chandelier down the lobby atrium, and the 360 bar on level 3
    o.set(WX, 41, WZ + zr(LOB_A) - 3, WX, 49, WZ + zr(LOB_A) - 3,
          'minecraft:iron_chain')
    o.set(WX - 1, 38, WZ + zr(LOB_A) - 4, WX + 1, 40, WZ + zr(LOB_A) - 2,
          'pearlescent_froglight')
    o.set(WX - 2, 20, WZ + zr(LOB_A) - 5, WX + 2, 37, WZ + zr(LOB_A) - 1, 'air')
    o.ring(WX, 41, WZ, 'dark_oak_slab', LOB_A - 8, zr(LOB_A) - 8, LOB_A - 9,
           zr(LOB_A) - 9)

    # --- back of house, and the club: the old members' room, rebuilt as the theatre's
    #     private box lounge off the balcony's west side
    o.set(WX - 57, 36, WZ - 6, WX - 40, 42, WZ + 10, 'air')
    o.set(WX - 57, 35, WZ - 6, WX - 40, 35, WZ + 10, 'red_carpet')
    o.set(WX - 57, 43, WZ - 6, WX - 40, 43, WZ + 10, 'polished_blackstone')
    for dz in (-5, 9):
        o.set(WX - 56, 36, WZ + dz, WX - 41, 40, WZ + dz, 'red_concrete')
    o.set(WX - 56, 36, WZ - 4, WX - 56, 40, WZ + 8, 'red_wool')
    o.set(WX - 50, 36, WZ + 1, WX - 44, 36, WZ + 3, 'sea_lantern')
    o.set(WX - 50, 37, WZ + 1, WX - 44, 37, WZ + 3, 'black_stained_glass')
    o.set(WX - 55, 36, WZ - 3, WX - 55, 37, WZ + 7, 'polished_blackstone')
    o.set(WX - 54, 36, WZ - 3, WX - 54, 36, WZ + 7, 'dark_oak_slab')
    for dz in range(-2, 8, 3):
        o.set(WX - 52, 36, WZ + dz, WX - 52, 36, WZ + dz, 'dark_oak_stairs')
    o.set(WX - 48, 42, WZ + 2, WX - 46, 42, WZ + 2, 'redstone_lamp')

    # --- THE TRANSFER SLAB. Four solid courses minimum, on twelve radial ribs. From
    #     below it is a coffered ceiling; from above it is simply ground.
    o.disc(WX, 54, WZ, 'stone_bricks', LOB_A + 3, zr(LOB_A) + 3, y2=56)
    for ang in range(0, 360, 30):
        r = math.radians(ang)
        for t in range(20, LOB_A + 4, 2):
            x = WX + round(t * math.cos(r))
            z = WZ + round(zr(t) * math.sin(r)) if t > 8 else WZ
            o.set(x - 1, 51, z - 1, x + 1, 53, z + 1, 'polished_deepslate')
    o.disc(WX, 57, WZ, 'coarse_dirt', LOB_A + 3, zr(LOB_A) + 3)

    # --- CIRCULATION, LAST. Floors, shells and the transfer slab above used to
    #     overwrite access work silently, so every carve belongs at the end.

    # Three radial passage levels match the ACTUAL lobby floors (18 / 29 / 40).
    # The old 5x5 drum punches at feet y19 and y36 stopped inside the seating mass:
    # they connected the lobby to a blue wall, not to the house. These passages run
    # from the outer lobby through both the drum and the relevant seating tier.
    def radial_passages(floor_y, inner_a, inner_b):
        for ang in (150, 180, 210, 330, 0, 30):
            r = math.radians(ang)
            ix = WX + round(inner_a * math.cos(r))
            iz = WZ + round(inner_b * math.sin(r))
            ox = WX + round((LOB_A - 3) * math.cos(r))
            oz = WZ + round((zr(LOB_A) - 3) * math.sin(r))
            steps = max(abs(ox - ix), abs(oz - iz))
            for n in range(steps + 1):
                t = n / steps if steps else 0
                x = round(ix + (ox - ix) * t)
                z = round(iz + (oz - iz) * t)
                if abs(math.cos(r)) >= abs(math.sin(r)):
                    o.set(x, floor_y, z - 2, x, floor_y, z + 2,
                          'polished_andesite')
                    o.set(x, floor_y + 1, z - 2, x, floor_y + 4, z + 2, 'air')
                else:
                    o.set(x - 2, floor_y, z, x + 2, floor_y, z,
                          'polished_andesite')
                    o.set(x - 2, floor_y + 1, z, x + 2, floor_y + 4, z, 'air')

    radial_passages(TH_FLOOR, 12, 10)   # lobby -> theatre floor / lower orchestra
    radial_passages(29, 32, 30)         # middle lobby -> upper orchestra
    radial_passages(40, 38, 36)         # upper lobby -> balcony

    # The west upper passage used to stop at x=WX-38, still inside the balcony's
    # solid raked seating. Continue it to the open house, then descend five blocks
    # inside the members' lounge. The two-wide stair uses the north edge of the room
    # so it does not overwrite the bar or the black-glass dance floor.
    o.set(WX - 37, 40, WZ - 2, WX - 20, 40, WZ + 2, 'polished_andesite')
    o.set(WX - 37, 41, WZ - 2, WX - 20, 44, WZ + 2, 'air')
    for i, x in enumerate(range(WX - 46, WX - 41)):
        y = 35 + i
        o.set(x, y, WZ - 2, x, y, WZ - 1,
              'polished_andesite_stairs[facing=east]')
        o.set(x, y + 1, WZ - 2, x, y + 4, WZ - 1, 'air')
    o.set(WX - 41, 40, WZ - 2, WX - 41, 40, WZ - 1, 'polished_andesite')
    o.set(WX - 41, 41, WZ - 2, WX - 41, 44, WZ - 1, 'air')

    # The lobby itself was three isolated rings. Two 3-wide flights in the south
    # crescent join the measured floor plates without consuming auditorium seats.
    def lobby_flight(x1, x2, z1, floor1, floor2, facing):
        step = 1 if x2 > x1 else -1
        for i, x in enumerate(range(x1, x2 + step, step)):
            y = floor1 + i
            o.set(x, y + 1, z1, x, y + 4, z1 + 2, 'air')
            o.set(x, y, z1, x, y, z1 + 2,
                  f'polished_andesite_stairs[facing={facing}]')
        o.set(x1 - 1, floor1, z1, x1, floor1, z1 + 2, 'polished_andesite')
        o.set(x2, floor2, z1, x2 + 1, floor2, z1 + 2, 'polished_andesite')

    lobby_flight(WX - 16, WX - 5, WZ + 43, TH_FLOOR, 29, 'east')
    lobby_flight(WX + 5, WX + 16, WZ + 43, 29, 40, 'east')

    # Grand south-forecourt switchback. Grade is floor y67 (feet y68); the public
    # theatre entry is the parterre floor y35 (feet y36). Three stacked flights fit
    # the 13x8 court, with ten blocks of vertical clearance between reused lanes.
    sx1, sx2 = WX - 7, WX + 7
    sz1, sz2 = WZ + 48, WZ + 55
    o.set(sx1, 35, sz1, sx2, 70, sz2, 'air')
    o.set(sx1, 35, sz1, sx1, 69, sz2, 'smooth_quartz')
    o.set(sx2, 35, sz1, sx2, 69, sz2, 'smooth_quartz')
    o.set(sx1, 35, sz2, sx2, 69, sz2, 'smooth_quartz')
    o.set(sx1, 70, sz1, sx2, 70, sz2, 'white_stained_glass')
    # The stadium's outer seating mass reaches z=WZ+60 at grade. Continue the
    # entrance through it to open forecourt grass; otherwise the stair has a door
    # in its own wall and six solid blocks immediately outside that door.
    o.set(WX + 4, 67, sz2, WX + 7, 67, WZ + 61, 'polished_andesite')
    o.set(WX + 4, 68, sz2, WX + 7, 71, WZ + 61, 'air')

    # Top flight: east/grade to west/y56.
    for i, x in enumerate(range(WX + 6, WX - 6, -1)):
        y = 67 - i
        o.set(x, y, WZ + 52, x, y, WZ + 54,
              'polished_andesite_stairs[facing=east]')
        o.set(x, y + 1, WZ + 52, x, y + 4, WZ + 54, 'air')
    o.set(WX - 7, 56, WZ + 49, WX - 5, 56, WZ + 54, 'polished_andesite')

    # Middle flight: west/y56 to east/y45.
    for i, x in enumerate(range(WX - 6, WX + 6)):
        y = 56 - i
        o.set(x, y, WZ + 49, x, y, WZ + 51,
              'polished_andesite_stairs[facing=west]')
        o.set(x, y + 1, WZ + 49, x, y + 4, WZ + 51, 'air')
    o.set(WX + 5, 45, WZ + 49, WX + 7, 45, WZ + 54, 'polished_andesite')

    # Bottom flight: east/y45 to west/parterre y35.
    for i, x in enumerate(range(WX + 6, WX - 5, -1)):
        y = 45 - i
        o.set(x, y, WZ + 52, x, y, WZ + 54,
              'polished_andesite_stairs[facing=east]')
        o.set(x, y + 1, WZ + 52, x, y + 4, WZ + 54, 'air')
    o.set(WX - 7, 35, WZ + 49, WX - 4, 35, WZ + 54, 'polished_andesite')

    # The north wall opens at the bottom and at upper-lobby level. A broad, lit
    # corridor continues under the stadium footing to the parterre's south tip.
    o.set(WX - 5, 36, sz1, WX + 5, 39, sz1, 'air')
    o.set(WX - 4, 40, sz1, WX + 4, 40, WZ + 52, 'polished_andesite')
    o.set(WX - 4, 41, sz1, WX + 4, 44, WZ + 52, 'air')
    o.set(WX - 5, 35, WZ + 2, WX + 5, 35, sz1, 'polished_andesite')
    o.set(WX - 5, 36, WZ + 2, WX + 5, 39, sz1, 'air')
    o.set(WX - 5, 40, WZ + 2, WX + 5, 40, sz1, 'sea_lantern')
    return o.write('wl1_theatre.txt')


# =========================================================== 2. THE STADIUM BOWL
def phase_bowl():
    """23 terraces, 2-deep treads, rake 1:2. The field sits nine blocks below town
    grade so grade itself lands on a mid-bowl concourse: you walk in at ground level
    and the pitch is already below you, which is the SoFi move that survives here."""
    o = Ops()
    o.disc(WX, FIELD, WZ, 'grass_block', 21, zr(21))                  # the field
    o.disc(WX, FIELD, WZ, 'gray_concrete', 12, zr(12))                # concert floor
    o.set(WX - 14, FIELD, WZ - 26, WX + 14, FIELD + 2, WZ - 18, 'blackstone')
    o.set(WX - 13, FIELD + 3, WZ - 25, WX + 13, FIELD + 3, WZ - 19, 'polished_blackstone')

    # Fill the full footprint at each level, then carve the void back out. The step
    # between one level's void radius and the next IS the seating rake, and a solid
    # disc costs half the ops of an annulus ring -- 1 run per raster row, not 2.
    seats = 0
    for i in range(23):
        xr = 22 + 2 * i
        y = FIELD + 1 + i
        pat = ('dark_oak_planks' if 65 <= y <= 67          # the premium club band
               else 'smooth_stone')
        o.disc(WX, y, WZ, pat, 69, zr(69))
        o.disc(WX, y, WZ, 'air', xr, zr(xr))
        seats += int(math.pi * (xr + zr(xr) - 1)) * 2
    # promenade and parapet
    o.ring(WX, 82, WZ, 'polished_andesite', 68, zr(68), 66, zr(66))
    o.ring(WX, 83, WZ, 'smooth_stone', 69, zr(69), 68, zr(68))
    o.shell(WX, 84, WZ, 'stone_brick_wall', 69, zr(69), 1)
    # outer fascia, so the drum reads as a building and not a spoil heap
    o.shell(WX, FIELD, WZ, 'stone_bricks', 69, zr(69), 2, y2=81)
    o.shell(WX, 80, WZ, 'waxed_cut_copper', 69, zr(69), 2)
    # eight radial aisles and the grade-level ring concourse
    for ang in range(22, 360, 45):
        r = math.radians(ang)
        for i in range(23):
            xr = 22 + 2 * i
            x = WX + round((xr + 1) * math.cos(r))
            z = WZ + round((zr(xr) + 1) * math.sin(r))
            o.set(x - 1, FIELD + 2 + i, z - 1, x + 1, FIELD + 2 + i, z + 1,
                  'polished_andesite')
    o.ring(WX, GRADE, WZ, 'polished_andesite', 40, zr(40), 37, zr(37))
    o.ring(WX, GRADE + 1, WZ, 'air', 40, zr(40), 37, zr(37), y2=GRADE + 4)
    # seven vomitory tunnels in at grade, plus a service ramp
    for ang in range(0, 360, 51):
        r = math.radians(ang)
        x = WX + round(69 * math.cos(r))
        z = WZ + round(zr(69) * math.sin(r))
        o.set(x - 2, GRADE, z - 2, x + 2, GRADE + 3, z + 2, 'air')
        o.set(x - 2, GRADE - 1, z - 2, x + 2, GRADE - 1, z + 2, 'polished_andesite')
        o.set(x - 2, GRADE + 4, z - 2, x + 2, GRADE + 4, z + 2, 'sea_lantern')
    # berm the north, east and west flanks so the drum sits low from three sides
    for ang in list(range(200, 340, 10)) + list(range(0, 20, 10)):
        r = math.radians(ang)
        for t in (76, 80, 84):     # clear of the canopy columns at radius 70x62 --
                                   # a berm at 72 would bury their bases in grass
            x = WX + round(t * math.cos(r))
            z = WZ + round(zr(t) * math.sin(r))
            o.set(x - 4, GRADE, z - 4, x + 4, GRADE + 3, z + 4, 'grass_block')
    print(f'    bowl gross tread blocks: ~{seats}')
    return o.write('wl2_bowl.txt')


# =========================================================== 3. THE CANOPY
def phase_canopy():
    """Bigger than the town's: radii 74x66 on columns at 70x62, brim underside y88.
    Same identity -- milky white frit glass, an orthogonal cable grid, a Frost-White
    perforated brim, and a continuous open band beneath it so it touches nothing."""
    o = Ops()
    ETFE, GRID = 'white_stained_glass', 'light_gray_stained_glass'
    BRIM = 'white_concrete'
    steps = [(88, 74, 66), (89, 66, 57), (90, 57, 46),
             (91, 46, 34), (92, 34, 22), (93, 22, 11), (94, 11, 0)]
    for y, ro, ri in steps:
        o.disc(WX, y, WZ, BRIM if y == 88 else ETFE, ro, max(zr(ro), 1))
        if ri:
            o.disc(WX, y, WZ, 'air', ri, max(zr(ri), 1))
    for x in range(WX - 66, WX + 67, 5):
        o.repl(x, 89, WZ - 58, x, 94, WZ + 58, ETFE, GRID)
    for z in range(WZ - 58, WZ + 59, 5):
        o.repl(WX - 66, 89, z, WX + 66, 94, z, ETFE, GRID)
    o.shell(WX, 88, WZ, 'polished_deepslate', 66, zr(66), 2)     # compression ring
    for x in range(WX - 60, WX + 61, 10):
        o.repl(x, 88, WZ - 52, x, 93, WZ + 52, 'air', 'minecraft:iron_chain')
    for ang in range(0, 360, 30):                                # the twelve columns
        r = math.radians(ang)
        x = WX + round(COL_A * math.cos(r))
        z = WZ + round(COL_B * math.sin(r))
        o.set(x, GRADE, z, x, 87, z, 'polished_deepslate')
        o.set(x - 1, 87, z, x + 1, 87, z, 'polished_deepslate_wall')
        o.set(x, 87, z - 1, x, 87, z + 1, 'polished_deepslate_wall')
    for x in range(WX - 63, WX + 64, 9):                         # the LED pucks
        for z in range(WZ - 54, WZ + 55, 9):
            o.set(x, 87, z, x, 87, z, 'end_rod[facing=down]')
    o.set(WX - 34, 90, WZ - 26, WX - 28, 92, WZ - 20, 'light_blue_stained_glass')
    o.set(WX + 28, 90, WZ + 20, WX + 34, 92, WZ + 26, 'light_blue_stained_glass')
    return o.write('wl3_canopy.txt')


def phase_texture():
    """Scatter the accents that make a big surface read as material rather than paint.
    Each of these is ONE WorldEdit masked replace across the whole complex, which is
    exactly why the geometry above is laid down in flat single materials first: 1,540
    per-row mix ops cost ~38 minutes through a bot, four //replace passes cost seconds."""
    o = Ops()
    x1, x2, z1, z2 = WX - 80, WX + 80, WZ - 72, WZ + 72
    o.repl(x1, FIELD, z1, x2, 84, z2, 'smooth_stone', '65%smooth_stone,35%stone_bricks')
    o.repl(x1, TH_FLOOR, z1, x2, 47, z2, 'dark_prismarine_stairs',
           '65%dark_prismarine_stairs,35%blue_wool')
    o.repl(x1, 88, z1, x2, 88, z2, 'white_concrete',
           '55%white_concrete,25%calcite,20%diorite')
    o.repl(x1, TH_FLOOR, z1, x2, 50, z2, 'blue_concrete',
           '85%blue_concrete,15%blue_terracotta')
    return o.write('wl4_texture.txt')


def phase_bowl_access():
    """Final-state public circulation for the stadium bowl.

    This is deliberately a separate, last phase. The original facade "vomitories"
    were only five-block pockets at the outer shell and never reached the grade
    concourse. Its radial aisle tiles were also emitted before the concourse carve,
    which removed the middle steps. Keeping the route here prevents either the bowl
    shell or its texture pass from silently sealing it again.
    """
    o = Ops()

    # Continue the existing south-forecourt passage through the seating belt to the
    # live grade-concourse tip. The x offset avoids the theatre switchback beside it.
    o.set(WX + 6, GRADE, WZ + 30, WX + 8, GRADE, WZ + 55,
          'polished_andesite')
    o.set(WX + 6, GRADE + 1, WZ + 30, WX + 8, GRADE + 4, WZ + 55, 'air')

    # A three-wide, 1:2 aisle climbs from the east edge of the field to the rim.
    # Each clearance carve precedes the next tread restoration, so adjacent treads
    # remain connected while still leaving two blocks of player headroom.
    for i in range(24):
        x = WX + 22 + 2 * i
        y = FIELD + 1 + i
        o.set(x - 1, y, WZ - 1, x + 1, y, WZ + 1, 'polished_andesite')
        o.set(x - 1, y + 1, WZ - 1, x + 1, y + 3, WZ + 1, 'air')

    return o.write('wl5_bowl_access.txt')


if __name__ == '__main__':
    fns = dict(site=phase_site, theatre=phase_theatre, bowl=phase_bowl,
               canopy=phase_canopy, texture=phase_texture,
               bowl_access=phase_bowl_access)
    for w in (sys.argv[1:] or list(fns)):
        fns[w]()
