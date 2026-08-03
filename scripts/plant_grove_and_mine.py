#!/usr/bin/env python3
"""Plant the northern oak grove and stake out the northern mine.

Grove: SOUTH of Worker Town (between the town and the envelope's north edge),
       so it sits on the natural route between the fleet's home and MSA.
Mine:  NORTH of Worker Town, kept well clear of the grove so mining never eats
       the trees -- the same discipline the original south-east pair used.

Trees are BUILT (log + leaf geometry via /setblock and /fill) rather than planted
as saplings: saplings need random ticks and light to grow, which is slow and not
verifiable in one pass. Built trees are immediate and probe-verifiable.

Chunks must be loaded for /fill and /setblock to take effect, so this force-loads
the work area and releases it at the end.
"""
import sys
sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin

Y_LO, Y_HI = 40, 130

# --- grove: staggered rows south of town, x[-125,-55], z[-332,-314] -----------
GROVE = []
for i, x in enumerate(range(-125, -54, 12)):        # 6 columns
    for j, z in enumerate((-332, -323, -314)):      # 3 rows
        GROVE.append((x + (6 if j == 1 else 0), z)) # stagger the middle row
MINE = (-85, -440)          # centre; radius 20 -> x[-105,-65] z[-460,-420]

def passed(res):
    return bool(res) and 'failed' not in res.lower() and 'error' not in res.lower()

class R:
    def __init__(self, r): self.r = r; self.n = 0
    def c(self, s):
        self.n += 1
        return self.r.cmd(s)
    def is_air(self, x, y, z):
        return passed(self.c(f'execute if block {x} {y} {z} minecraft:air run time query gametime'))
    def match(self, x, y, z, spec):
        return passed(self.c(f'execute if block {x} {y} {z} {spec} run time query gametime'))
    def surface(self, x, z):
        if not self.is_air(x, Y_HI, z) or self.is_air(x, Y_LO, z): return None
        lo, hi = Y_LO, Y_HI
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.is_air(x, mid, z): hi = mid
            else: lo = mid
        return lo

def tree(r, x, z, h=5):
    """One small oak: h-tall trunk, 5x5 leaf slab, 3x3 cap."""
    y = r.surface(x, z)
    if y is None: return None, 'no-surface'
    if r.match(x, y, z, 'minecraft:water'): return None, 'water'
    if r.match(x, y, z, '#minecraft:leaves') or r.match(x, y, z, '#minecraft:logs'):
        return None, 'already-tree'
    base = y + 1
    top = base + h - 1
    r.c(f'setblock {x} {y} {z} minecraft:dirt')                       # firm footing
    r.c(f'fill {x} {base} {z} {x} {top} {z} minecraft:oak_log')
    # leaf slab two layers thick at trunk top-1, keeping the trunk clear
    r.c(f'fill {x-2} {top-1} {z-2} {x+2} {top} {z+2} minecraft:oak_leaves replace minecraft:air')
    r.c(f'fill {x-1} {top+1} {z-1} {x+1} {top+1} {z+1} minecraft:oak_leaves replace minecraft:air')
    r.c(f'fill {x} {base} {z} {x} {top} {z} minecraft:oak_log')       # re-assert trunk
    return y, 'ok'

def main():
    cli = mc_admin.connect()
    try:
        rc = mc_admin.Rcon(cli); r = R(rc)
        print('force-loading work area...')
        print(' ', r.c('forceload add -135 -470 -45 -305'))

        print('\n--- GROVE ---')
        planted = []
        for (x, z) in GROVE:
            y, why = tree(r, x, z)
            print(f'  ({x:>5},{z:>5}) {"y=%d" % y if y else "--":>6}  {why}')
            if y: planted.append((x, y, z))

        print(f'\nplanted {len(planted)}/{len(GROVE)} trees')

        print('\n--- verify a sample (probe the trunk 2 above ground) ---')
        for (x, y, z) in planted[:6]:
            ok = r.match(x, y + 2, z, 'minecraft:oak_log')
            print(f'  ({x:>5},{z:>5}) trunk@y{y+2}: {"OK" if ok else "MISSING"}')

        print('\n--- MINE staging pad ---')
        mx, mz = MINE
        my = r.surface(mx, mz)
        print(f'  surface at ({mx},{mz}) = y{my}')
        if my:
            # a modest stone-brick apron so the site is visibly a mine, not bare ground
            r.c(f'fill {mx-4} {my} {mz-4} {mx+4} {my} {mz+4} minecraft:stone_bricks')
            r.c(f'fill {mx-1} {my} {mz-1} {mx+1} {my} {mz+1} minecraft:air')      # collar
            r.c(f'fill {mx-1} {my-6} {mz-1} {mx+1} {my-1} {mz+1} minecraft:air')  # starter shaft
            r.c(f'fill {mx-2} {my+1} {mz-2} {mx+2} {my+1} {mz+2} minecraft:torch replace minecraft:air')
            ok = r.match(mx, my - 3, mz, 'minecraft:air')
            print(f'  starter shaft open at y{my-3}: {"OK" if ok else "NO"}')
            print(f'  MINESITE => x={mx} y={my} z={mz} radius=20')

        print('\nreleasing forceload...')
        print(' ', r.c('forceload remove all'))
        print(f'total rcon commands: {r.n}')
    finally:
        cli.close()

if __name__ == '__main__':
    main()
