#!/usr/bin/env python3
"""
Confirm the T3b gravel pass left spur S1 and the wall between them intact.

T3b and S1 run parallel through the same corridor separated by one block of rock at
z=-18. Part of that wall was gravel (x=119, 121, 122 and x=130..133), so a gravel-masked
clear pass would have opened holes straight into S1. rr_gravel_fix.py handles the plane
by turning its gravel to stone and clamping T3b's clear boxes to z<=-19; this script
checks that both halves of that actually held:

  1. the z=-18 plane contains no gravel or sand left, and none of the columns that were
     gravel have become air; and
  2. S1's own bore is still continuous open space on its centreline with its treads
     under it -- i.e. nothing was buried by the hardening pass and nothing was drained.

Usage: python3 scripts/rr_check_s1_divider.py
"""

from __future__ import annotations

import sys

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M

# columns of the divider that a probe found to be gravel before the fix
WAS_GRAVEL = [(119, -4), (119, -5), (119, -6), (121, -4), (121, -5), (121, -6),
              (122, -5), (122, -6), (130, -4), (131, -4), (132, -4), (133, -4)]

S1_X = (100, 192)
S1_WALK = -11          # waypoint walk level; tread sits one below
S1_PERP = -14          # S1 centreline z


def main() -> int:
    cli = M.connect()
    r = M.Rcon(cli)

    def probe(x, y, z, bid):
        return M.classify_probe(
            r.cmd(f'execute if block {x} {y} {z} minecraft:{bid}'))

    mine = []
    try:
        for cx in range(5, 13):
            for cz in range(-3, 0):
                if 'Marked' in r.cmd(f'forceload add {cx * 16} {cz * 16}'):
                    mine.append((cx, cz))
        print(f'force-loaded {len(mine)} chunks (others left alone)')

        # --- 1. the divider plane
        spoil, opened, notloaded = [], [], 0
        for x in range(96, 181):
            for y in range(-13, 13):
                v = probe(x, y, -18, 'gravel')
                if v == 'NOT-LOADED':
                    notloaded += 1
                    continue
                if v == 'MATCH':
                    spoil.append((x, y, 'gravel'))
                if probe(x, y, -18, 'sand') == 'MATCH':
                    spoil.append((x, y, 'sand'))
        for (x, y) in WAS_GRAVEL:
            if probe(x, y, -18, 'air') == 'MATCH':
                opened.append((x, y))
        print(f'divider z=-18, x[96,180] y[-13,12]: '
              f'{len(spoil)} spoil blocks left, {notloaded} unreadable')
        print(f'  of the {len(WAS_GRAVEL)} columns that were gravel, '
              f'{len(opened)} are now AIR (must be 0): {opened}')

        # --- 2. S1's own bore
        blocked, no_tread = [], []
        for x in range(S1_X[0], S1_X[1] + 1):
            feet = probe(x, S1_WALK, S1_PERP, 'air')
            head = probe(x, S1_WALK + 1, S1_PERP, 'air')
            tread = probe(x, S1_WALK - 1, S1_PERP, 'stone_bricks')
            if feet != 'MATCH' or head != 'MATCH':
                blocked.append(x)
            if tread != 'MATCH':
                no_tread.append(x)
        n = S1_X[1] - S1_X[0] + 1
        print(f'S1 centreline z={S1_PERP} walk y{S1_WALK}, x[{S1_X[0]},{S1_X[1]}] '
              f'({n} stations): {len(blocked)} not open, {len(no_tread)} without a tread')
        if blocked:
            print(f'  not open at x={blocked[:30]}')
        if no_tread:
            print(f'  no tread at x={no_tread[:30]}')
    finally:
        for (cx, cz) in mine:
            r.cmd(f'forceload remove {cx * 16} {cz * 16}')
        print(f'released {len(mine)} chunks')
        cli.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
