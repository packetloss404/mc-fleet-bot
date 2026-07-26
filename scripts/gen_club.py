#!/usr/bin/env python3
"""
Back of house under the concert hall, and the members' club beneath it.

The route is deliberate and sequenced: stage door -> dressing corridor -> greenroom
-> a hidden panel in the greenroom's back wall -> a long descending approach ->
the vestibule and members' desk -> a double-height grand entrance -> the Red Room.

Levels, all below the concert hall's performance floor at y55:
  greenroom / back of house   floor y49, head y50-54
  the approach stair          y49 down to y36
  the club                    floor y36, head y37-46

Emits ops for scripts/build_runner.py. Must run AFTER ch2_bowl, which backfills
the whole site to solid stone from y45 up.
"""
import os, sys

CX, CZ = -85, -513
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

    def hollow(self, x1, y1, z1, x2, y2, z2, wall, floor_p, ceil_p):
        """Carve a room out of solid rock and line it."""
        self.set(x1 - 1, y1 - 1, z1 - 1, x2 + 1, y2 + 1, z2 + 1, 'stone')
        self.set(x1, y1, z1, x2, y2, z2, 'air')
        self.set(x1, y1 - 1, z1, x2, y1 - 1, z2, floor_p)
        self.set(x1, y2 + 1, z1, x2, y2 + 1, z2, ceil_p)
        for a, b in ((z1, z1), (z2, z2)):
            self.set(x1, y1, a, x2, y2, b, wall)
        for a, b in ((x1, x1), (x2, x2)):
            self.set(a, y1, z1, b, y2, z2, wall)

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


def phase_backstage():
    """Greenroom and dressing rooms under the stage end of the bowl."""
    o = Ops()
    # Greenroom, behind and below the stage end. It stops at y53 so its stone shell
    # tops out at y54 — one below the bowl floor. An earlier version reached y55 and
    # would have stamped a stone patch through the north seating tier.
    o.hollow(CX - 20, 49, CZ - 33, CX + 20, 53, CZ - 19,
             'polished_blackstone_bricks', 'dark_oak_planks', 'polished_blackstone')
    # a stair up to the stage floor at y55, so performers can actually get on stage
    for i in range(7):
        o.set(CX + 14, 49 + i, CZ - 20 + i, CX + 18, 49 + i, CZ - 20 + i, 'dark_oak_planks')
        o.set(CX + 14, 50 + i, CZ - 20 + i, CX + 18, 53 + i, CZ - 20 + i, 'air')
    o.set(CX + 14, 55, CZ - 15, CX + 18, 57, CZ - 14, 'air')
    # greenroom fit: sofas, a long table, mirrors, catering counter
    o.set(CX - 18, 49, CZ - 31, CX - 8, 49, CZ - 31, 'red_wool')
    o.set(CX - 18, 50, CZ - 32, CX - 8, 50, CZ - 32, 'dark_oak_trapdoor')
    o.set(CX - 4, 49, CZ - 29, CX + 6, 49, CZ - 29, 'dark_oak_slab')
    o.set(CX - 4, 49, CZ - 27, CX + 6, 49, CZ - 27, 'dark_oak_stairs')
    o.set(CX + 10, 49, CZ - 31, CX + 18, 49, CZ - 31, 'smooth_quartz')
    o.set(CX + 10, 50, CZ - 31, CX + 18, 51, CZ - 31, 'glass')
    for x in range(CX - 16, CX + 17, 8):
        o.set(x, 53, CZ - 26, x, 53, CZ - 26, 'lantern[hanging=true]')
    # dressing rooms off a corridor
    o.hollow(CX - 20, 49, CZ - 18, CX + 20, 52, CZ - 16,
             'polished_blackstone_bricks', 'dark_oak_planks', 'polished_blackstone')
    for i, dx in enumerate((-18, -11, -4, 3, 10)):
        o.hollow(CX + dx, 49, CZ - 15, CX + dx + 5, 52, CZ - 10,
                 'deepslate_bricks', 'dark_oak_planks', 'polished_blackstone')
        o.set(CX + dx + 2, 49, CZ - 16, CX + dx + 3, 50, CZ - 16, 'air')
        o.set(CX + dx + 2, 49, CZ - 16, CX + dx + 3, 50, CZ - 16, 'dark_oak_door')
        o.set(CX + dx + 1, 49, CZ - 14, CX + dx + 4, 49, CZ - 14, 'smooth_quartz')
        o.set(CX + dx + 1, 50, CZ - 14, CX + dx + 4, 51, CZ - 14, 'glass')
        o.set(CX + dx + 2, 52, CZ - 12, CX + dx + 3, 52, CZ - 12, 'sea_lantern')
    return o.write('cl1_backstage.txt')


def phase_hidden_way():
    """The hidden panel and the long descent. The panel reads as part of the
    greenroom's wine racking until it opens."""
    o = Ops()
    # a wine-rack alcove in the greenroom's west wall — the panel
    o.set(CX - 21, 49, CZ - 28, CX - 21, 52, CZ - 24, 'air')
    o.set(CX - 22, 49, CZ - 28, CX - 22, 52, CZ - 24, 'chiseled_bookshelf')
    o.set(CX - 22, 49, CZ - 26, CX - 22, 50, CZ - 26, 'air')       # the way through
    o.set(CX - 21, 53, CZ - 28, CX - 21, 53, CZ - 24, 'redstone_lamp')
    # antechamber behind the panel
    o.hollow(CX - 28, 49, CZ - 28, CX - 23, 52, CZ - 24,
             'polished_deepslate', 'polished_blackstone', 'polished_blackstone')
    o.set(CX - 26, 52, CZ - 26, CX - 25, 52, CZ - 26, 'redstone_lamp')
    # the descent: a switchback stair from y49 to y37, widening as it goes so the
    # arrival reads as an event rather than a corridor
    y = 48
    z = CZ - 26
    for leg in range(4):
        w = 3 + leg
        for i in range(3):
            if leg % 2 == 0:
                o.set(CX - 28 - i, y, z - w, CX - 28 - i, y + 4, z + w, 'air')
                o.set(CX - 28 - i, y - 1, z - w, CX - 28 - i, y - 1, z + w, 'polished_blackstone')
            else:
                o.set(CX - 34 + i, y, z - w, CX - 34 + i, y + 4, z + w, 'air')
                o.set(CX - 34 + i, y - 1, z - w, CX - 34 + i, y - 1, z + w, 'polished_blackstone')
            y -= 1
        # a landing between legs, lit red, each one deeper in colour
        o.set(CX - 36, y, z - w - 1, CX - 26, y + 4, z + w + 1, 'air')
        o.set(CX - 36, y - 1, z - w - 1, CX - 26, y - 1, z + w + 1, 'polished_blackstone')
        o.set(CX - 36, y + 5, z - w - 1, CX - 26, y + 5, z + w + 1, 'polished_blackstone')
        o.set(CX - 36, y, z - w - 1, CX - 36, y + 4, z + w + 1, 'red_concrete')
        o.set(CX - 26, y, z - w - 1, CX - 26, y + 4, z + w + 1, 'red_concrete')
        o.set(CX - 35, y + 4, z - w, CX - 27, y + 4, z - w, 'redstone_lamp')
        z -= 4
    return o.write('cl2_hiddenway.txt')


def phase_club():
    """The club itself: vestibule, a double-height grand entrance, and the Red Room.
    Members only — the desk is the first thing you meet and the only way through."""
    o = Ops()
    KX, KZ = CX - 31, CZ - 40                 # club centre
    # vestibule and members' desk
    o.hollow(KX - 8, 37, KZ + 14, KX + 8, 41, KZ + 20,
             'polished_blackstone_bricks', 'polished_blackstone', 'polished_blackstone')
    o.set(KX - 5, 37, KZ + 17, KX + 5, 38, KZ + 17, 'dark_oak_planks')
    o.set(KX - 5, 39, KZ + 17, KX + 5, 39, KZ + 17, 'smooth_quartz_slab')
    o.set(KX - 4, 37, KZ + 19, KX + 4, 37, KZ + 19, 'lectern')      # the members' ledger
    o.set(KX - 8, 37, KZ + 15, KX - 8, 40, KZ + 19, 'red_wool')     # coat wall
    o.set(KX - 7, 39, KZ + 15, KX - 7, 39, KZ + 19, 'dark_oak_trapdoor')
    o.set(KX - 6, 41, KZ + 16, KX + 6, 41, KZ + 18, 'redstone_lamp')

    # the grand entrance: double height, a sweeping stair down into the room
    o.hollow(KX - 14, 37, KZ + 2, KX + 14, 46, KZ + 13,
             'polished_blackstone_bricks', 'red_concrete', 'polished_blackstone')
    for i in range(9):
        o.set(KX - 6, 45 - i, KZ + 12 - i, KX + 6, 45 - i, KZ + 12 - i, 'red_concrete')
        o.set(KX - 6, 46 - i, KZ + 12 - i, KX + 6, 49 - i, KZ + 12 - i, 'air')
        o.set(KX - 7, 46 - i, KZ + 12 - i, KX - 7, 47 - i, KZ + 12 - i, 'polished_blackstone_wall')
        o.set(KX + 7, 46 - i, KZ + 12 - i, KX + 7, 47 - i, KZ + 12 - i, 'polished_blackstone_wall')
    # arrive from the vestibule at the TOP of that stair
    o.set(KX - 3, 45, KZ + 13, KX + 3, 47, KZ + 14, 'air')
    o.set(KX - 3, 44, KZ + 13, KX + 3, 44, KZ + 14, 'red_concrete')
    # a chandelier over the stair
    for r, yy in ((1, 45), (2, 44), (3, 43)):
        o.set(KX - r, yy, KZ + 7 - r, KX + r, yy, KZ + 7 + r, 'chain')
    o.set(KX - 3, 42, KZ + 4, KX + 3, 42, KZ + 10, 'redstone_lamp')
    o.set(KX - 2, 41, KZ + 5, KX + 2, 41, KZ + 9, 'sea_lantern')
    # columns and drapery
    for dx in (-12, -6, 6, 12):
        o.set(KX + dx, 37, KZ + 3, KX + dx, 45, KZ + 3, 'polished_blackstone')
        o.set(KX + dx, 37, KZ + 12, KX + dx, 45, KZ + 12, 'polished_blackstone')
        o.set(KX + dx - 1, 38, KZ + 2, KX + dx + 1, 44, KZ + 2, 'red_wool')

    # THE RED ROOM — the main salon
    o.hollow(KX - 20, 37, KZ - 16, KX + 20, 44, KZ + 1,
             'red_concrete', 'red_carpet', 'polished_blackstone')
    o.set(KX - 20, 36, KZ - 16, KX + 20, 36, KZ + 1, 'dark_oak_planks')
    o.set(KX - 3, 37, KZ + 1, KX + 3, 40, KZ + 1, 'air')            # from the entrance
    # a sunken dance floor at the centre, lit from beneath
    o.set(KX - 9, 36, KZ - 10, KX + 9, 36, KZ - 3, 'sea_lantern')
    o.set(KX - 9, 37, KZ - 10, KX + 9, 37, KZ - 3, 'black_stained_glass')
    o.set(KX - 10, 37, KZ - 11, KX + 10, 37, KZ - 2, 'polished_blackstone_slab')
    # the bar along the west wall
    o.set(KX - 19, 37, KZ - 14, KX - 19, 38, KZ - 3, 'polished_blackstone')
    o.set(KX - 18, 37, KZ - 14, KX - 18, 37, KZ - 3, 'dark_oak_planks')
    o.set(KX - 18, 38, KZ - 14, KX - 18, 38, KZ - 3, 'smooth_quartz_slab')
    o.set(KX - 19, 39, KZ - 14, KX - 19, 41, KZ - 3, 'red_stained_glass')
    for z in range(KZ - 13, KZ - 3, 2):
        o.set(KX - 16, 37, z, KX - 16, 37, z, 'dark_oak_stairs')
    # velvet booths around three sides, each screened
    for dx in (-13, -7, 7, 13):
        o.set(KX + dx - 2, 37, KZ - 1, KX + dx + 2, 40, KZ - 1, 'red_wool')
        o.set(KX + dx - 2, 37, KZ - 2, KX + dx + 2, 37, KZ - 2, 'dark_oak_stairs')
        o.set(KX + dx, 38, KZ - 2, KX + dx, 38, KZ - 2, 'dark_oak_slab')
    for dz in (-14, -8):
        o.set(KX + 14, 37, KZ + dz, KX + 18, 40, KZ + dz, 'red_wool')
        o.set(KX + 14, 37, KZ + dz + 1, KX + 18, 37, KZ + dz + 1, 'dark_oak_stairs')
    # chandeliers and wall sconces
    for x in range(KX - 15, KX + 16, 10):
        for z in range(KZ - 13, KZ, 6):
            o.set(x, 43, z, x, 43, z, 'chain')
            o.set(x, 42, z, x, 42, z, 'redstone_lamp')
    for z in range(KZ - 14, KZ, 4):
        o.set(KX + 19, 40, z, KX + 19, 40, z, 'redstone_torch')
        o.set(KX - 19, 40, z, KX - 19, 40, z, 'redstone_torch')

    # private salons off the back — doors, and each its own colour of red
    reds = ['red_wool', 'red_concrete', 'red_terracotta', 'crimson_planks',
            'red_wool', 'red_concrete']
    for i in range(6):
        sx = KX - 18 + i * 7
        o.hollow(sx, 37, KZ - 25, sx + 5, 41, KZ - 18,
                 reds[i], 'red_carpet', 'polished_blackstone')
        o.set(sx + 2, 37, KZ - 17, sx + 3, 38, KZ - 17, 'air')
        o.set(sx + 2, 37, KZ - 17, sx + 3, 38, KZ - 17, 'crimson_door')
        o.set(sx + 1, 37, KZ - 24, sx + 4, 37, KZ - 22, 'dark_oak_planks')
        o.set(sx + 1, 38, KZ - 24, sx + 4, 38, KZ - 22, 'red_carpet')
        o.set(sx + 2, 41, KZ - 21, sx + 3, 41, KZ - 21, 'redstone_lamp')
        o.set(sx, 39, KZ - 20, sx, 40, KZ - 19, 'red_stained_glass')
    # the corridor serving them
    o.hollow(KX - 20, 37, KZ - 17, KX + 20, 40, KZ - 16,
             'polished_blackstone_bricks', 'red_carpet', 'polished_blackstone')
    for x in range(KX - 17, KX + 18, 6):
        o.set(x, 40, KZ - 17, x, 40, KZ - 17, 'redstone_lamp')
    return o.write('cl3_club.txt')


if __name__ == '__main__':
    fns = dict(backstage=phase_backstage, hidden=phase_hidden_way, club=phase_club)
    for w in (sys.argv[1:] or list(fns)):
        fns[w]()
