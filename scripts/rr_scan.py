#!/usr/bin/env python3
"""
Batched region scanner for the Raven Rock / MSA builds.

Why: `mc_admin.py probe` opens one SSH connection per invocation, which makes
grid surveys unusably slow (and hammers sshd). This opens ONE connection and runs
hundreds of `execute if block` tests over it, then reports a compact map.

It also honours the lesson that cost this project real time: the server replies
"That position is not loaded" for unloaded chunks, which is NOT the same as "the
block is absent". Unloaded positions are counted and reported separately, never
folded into a negative result.

Usage:
  # where is water in a box, excluding the N7 reservoirs?
  python3 scripts/rr_scan.py water -185 -18 -35 -115 -1 15 --step 4 \
      --exclude -170 -34 -130 -26

  # map air (voids) in a box
  python3 scripts/rr_scan.py air -157 26 286 -143 62 299 --step 3

Exclusions are XZ rectangles (x1 z1 x2 z2) and may be repeated; matches inside an
exclusion are reported separately so you can see what you chose to protect.
"""

from __future__ import annotations

import argparse
import sys
sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')

import mc_admin as M


def chunked(seq, n):
    for i in range(0, len(seq), n):
        yield seq[i:i + n]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('block', help='block id to test for, without the minecraft: prefix')
    ap.add_argument('coords', nargs=6, type=int, metavar=('X1', 'Y1', 'Z1', 'X2', 'Y2', 'Z2'))
    ap.add_argument('--step', type=int, default=4, help='sample stride in x/z (default 4)')
    ap.add_argument('--ystep', type=int, default=2, help='sample stride in y (default 2)')
    ap.add_argument('--exclude', nargs=4, type=int, action='append', default=[],
                    metavar=('X1', 'Z1', 'X2', 'Z2'), help='XZ rect to report separately')
    ap.add_argument('--batch', type=int, default=180, help='commands per RCON round trip')
    args = ap.parse_args()

    x1, y1, z1, x2, y2, z2 = args.coords
    x1, x2 = min(x1, x2), max(x1, x2)
    y1, y2 = min(y1, y2), max(y1, y2)
    z1, z2 = min(z1, z2), max(z1, z2)

    def excluded(x, z):
        for ex1, ez1, ex2, ez2 in args.exclude:
            if min(ex1, ex2) <= x <= max(ex1, ex2) and min(ez1, ez2) <= z <= max(ez1, ez2):
                return True
        return False

    points = [(x, y, z)
              for y in range(y1, y2 + 1, args.ystep)
              for x in range(x1, x2 + 1, args.step)
              for z in range(z1, z2 + 1, args.step)]

    cli = M.connect()
    hits, hits_excluded, notloaded, misses, errors = [], [], 0, 0, []
    try:
        r = M.Rcon(cli)
        for batch in chunked(points, args.batch):
            for (x, y, z) in batch:
                res = r.cmd(f'execute if block {x} {y} {z} minecraft:{args.block}')
                verdict = M.classify_probe(res)
                if verdict == 'MATCH':
                    (hits_excluded if excluded(x, z) else hits).append((x, y, z))
                elif verdict == 'NOT-LOADED':
                    notloaded += 1
                elif verdict == 'no':
                    misses += 1
                else:
                    errors.append((x, y, z, verdict))
    finally:
        cli.close()

    print(f'scanned {len(points)} points for minecraft:{args.block} '
          f'in x[{x1},{x2}] y[{y1},{y2}] z[{z1},{z2}] step={args.step} ystep={args.ystep}')
    print(f'  MATCH      : {len(hits)}')
    print(f'  MATCH (excl): {len(hits_excluded)}   <- inside a protected rect, left alone')
    print(f'  no         : {misses}')
    print(f'  NOT-LOADED : {notloaded}   <- NOT evidence; force-load before trusting absence')
    if errors:
        print(f'  ERRORS     : {len(errors)} e.g. {errors[:2]}')

    if hits:
        ys = sorted({p[1] for p in hits})
        xs = sorted({p[0] for p in hits})
        zs = sorted({p[2] for p in hits})
        print(f'\n  hit extent: x[{xs[0]},{xs[-1]}] y[{ys[0]},{ys[-1]}] z[{zs[0]},{zs[-1]}]')
        print(f'  hit y-levels: {ys}')
        print('\n  first 40 hits:')
        for p in hits[:40]:
            print(f'    {p}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
