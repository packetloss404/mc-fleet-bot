#!/usr/bin/env python3
"""
BFS-based tunnel tracer and normaliser for Raven Rock.

Why BFS instead of walking an axis
----------------------------------
rr_enlarge_tunnels.py walks a leg's dominant axis and measures the cross-section at each
station. That works for gently curving bores, but it failed on the two hard cases:

  * S1  -- its centreline drifted 1 block per station until it had wandered 22 blocks off
           axis (z=-15 -> z=-37) and was tracing tunnel T3, which shares the corridor.
           Rock was cut along a path belonging to neither tunnel.
  * T2b -- a dogleg whose real route bows more than 6 blocks off the straight line between
           its documented endpoints, so the axis clamp (added after S1) correctly refused
           to cut anything at all.

This script instead FLOOD-FILLS the connected air volume from a seed inside the tunnel.
The route is then a fact discovered from the world rather than an assumption, so curves,
doglegs and descents are all handled without special cases.

Guards, because a flood fill in a cave-riddled rock mass is dangerous
--------------------------------------------------------------------
* BOUNDS      -- BFS may never leave an explicit box. Caverns and other tunnels are
                 excluded by putting them outside the box.
* MAX_NODES   -- a hard node cap. If BFS hits it, the run reports "flooded" and refuses to
                 cut, because hitting the cap means it escaped into something large.
* CHAMBERS    -- a station whose measured section exceeds MAX_BORE_WIDTH is a room, not a
                 bore (blast vestibules, the rotunda, cavern mouths). Reported and skipped.
* AXIS CLAMP  -- defence in depth: even a BFS-derived station is clamped to a corridor
                 around the planned centreline.
* TREAD MASK  -- every cut is `air replace #minecraft:base_stone_overworld`. Treads are
                 stone_bricks, liner is stone_bricks/concrete, lights are lanterns: none
                 are in that tag, so none can be deleted. Tunnel floors on this project
                 were destroyed twice by headroom clears; this makes that impossible.

Modes
-----
  trace     : BFS + report the discovered route. Read-only.
  enlarge   : BFS, then widen +2 / raise ceiling +2 (floor untouched).
  normalise : BFS, then force the bore to an EXACT target section, both cutting rock inside
              the target and SEALING stray air outside it. Used to repair S1, whose width
              now varies 5-13 where it should be 7. Sealing is confined to a thin shell so
              it cannot reach a neighbouring tunnel.

Usage
  python3 scripts/rr_bfs_tunnel.py trace     T2b
  python3 scripts/rr_bfs_tunnel.py enlarge   T2b --apply
  python3 scripts/rr_bfs_tunnel.py normalise S1  --apply
"""

from __future__ import annotations

import argparse
import sys
from collections import deque

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M

ROCK = '#minecraft:base_stone_overworld'
MAX_NODES = 30000
MAX_BORE_WIDTH = 11
Y41 = 41

# id: seed point, bounds (x1,y1,z1,x2,y2,z2), dominant axis, planned centreline endpoints,
#     axis deviation allowance, and for normalise: the exact target section.
JOBS = {
    'T2b': dict(
        seed=(-150, 3, 189),
        bounds=(-156, -14, 126, -48, 9, 196),
        axis='x',
        line=((-150, 190), (-45, 130)),      # (axis, perp) at each end
        deviation=10,                         # a dogleg bows; wider than the axis tracer allowed
        target=None,
    ),
    # S1 runs straight at z=-15 from Cavern A's east wall to the shaft. The convergence
    # zone with T3b (they share the endpoint (76,-12,-15)) is EXCLUDED from normalise by
    # starting at x=100: below that the two tunnels legitimately merge and sealing there
    # could bury T3.
    'S1': dict(
        seed=(150, -10, -15),
        bounds=(98, -18, -24, 194, -2, -6),
        axis='x',
        line=((100, -15), (192, -15)),
        deviation=6,
        target=dict(halfwidth=3, height=8),   # 7 wide (centre +/-3), 8 tall
    ),
}


class Session:
    def __init__(self):
        self.cli = M.connect()
        self.r = M.Rcon(self.cli)
        self.notloaded = 0
        self.probes = 0

    def cmd(self, s):
        return self.r.cmd(s)

    def is_air(self, p):
        x, y, z = p
        self.probes += 1
        v = M.classify_probe(self.cmd(f'execute if block {x} {y} {z} minecraft:air'))
        if v == 'NOT-LOADED':
            self.notloaded += 1
            return None
        return v == 'MATCH'

    def close(self):
        self.cli.close()


def bfs(s: Session, seed, bounds, job=None):
    """Flood the connected air volume, confined to a TUBE around the planned route.

    A plain box bound is not enough: T2b's bore turns out to be connected to an extensive
    natural cave system (that corridor scans as 34% air), so a box-bounded flood hit the
    node cap immediately. Confining the flood to a tube of `deviation` around the
    interpolated centreline follows the dogleg while refusing to chase caves that branch
    away from it.
    """
    x1, y1, z1, x2, y2, z2 = bounds
    axis = job['axis'] if job else None
    dev = job['deviation'] if job else None

    def inside(p):
        if not (x1 <= p[0] <= x2 and y1 <= p[1] <= y2 and z1 <= p[2] <= z2):
            return False
        if axis is None:
            return True
        a = p[0] if axis == 'x' else p[2]
        perp = p[2] if axis == 'x' else p[0]
        return abs(perp - expected_perp(job, a)) <= dev

    start = s.is_air(seed)
    if start is None:
        raise SystemExit(f'seed {seed} is in an unloaded chunk — forceload it first')
    if not start:
        raise SystemExit(f'seed {seed} is not air — pick a seed inside the bore')

    seen = {seed}
    vol = []
    q = deque([seed])
    flooded = False
    while q:
        if len(vol) >= MAX_NODES:
            flooded = True
            break
        p = q.popleft()
        vol.append(p)
        for d in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)):
            n = (p[0] + d[0], p[1] + d[1], p[2] + d[2])
            if n in seen or not inside(n):
                continue
            seen.add(n)
            air = s.is_air(n)
            if air:
                q.append(n)
    return vol, flooded


def stations(vol, axis):
    """Group voxels by their coordinate along the dominant axis."""
    ai = 0 if axis == 'x' else 2
    pi = 2 if axis == 'x' else 0
    out = {}
    for p in vol:
        out.setdefault(p[ai], []).append((p[pi], p[1]))
    return out


def expected_perp(job, a):
    (a0, p0), (a1, p1) = job['line']
    if a1 == a0:
        return p0
    frac = (a - a0) / (a1 - a0)
    return round(p0 + (p1 - p0) * frac)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['trace', 'enlarge', 'normalise'])
    ap.add_argument('job', choices=sorted(JOBS))
    ap.add_argument('--apply', action='store_true')
    args = ap.parse_args()

    job = JOBS[args.job]
    axis = job['axis']
    x1, y1, z1, x2, y2, z2 = job['bounds']

    s = Session()
    try:
        fl = s.cmd(f'forceload add {x1} {z1} {x2} {z2}')
        print(f'forceload: {fl.strip()[:100]}')

        print(f'BFS from {job["seed"]} within {job["bounds"]} ...')
        vol, flooded = bfs(s, job['seed'], job['bounds'], job)
        print(f'  discovered {len(vol)} air voxels in {s.probes} probes'
              + (f', {s.notloaded} NOT-LOADED' if s.notloaded else ''))
        if flooded:
            print(f'  ABORT: BFS hit the {MAX_NODES}-node cap, meaning it escaped into a '
                  f'large connected void. Refusing to cut. Tighten `bounds` and retry.')
            return 1

        st = stations(vol, axis)
        keys = sorted(st)
        print(f'  route spans {axis}[{keys[0]},{keys[-1]}] across {len(keys)} stations')

        boxes, chambers, skipped = [], [], 0
        for a in keys:
            perps = [p for p, _ in st[a]]
            ys = [y for _, y in st[a]]
            ep = expected_perp(job, a)
            lo = max(min(perps), ep - job['deviation'])
            hi = min(max(perps), ep + job['deviation'])
            if hi < lo:
                skipped += 1
                continue
            walk, ceil = min(ys), max(ys)
            width = hi - lo + 1
            if width > MAX_BORE_WIDTH:
                chambers.append((a, lo, hi, width))
                continue

            if args.mode == 'normalise' and job['target']:
                hw, h = job['target']['halfwidth'], job['target']['height']
                c = ep                      # normalise onto the PLANNED centreline
                nlo, nhi = c - hw, c + hw
                ytop = walk + h - 1
            else:
                nlo, nhi = lo - 1, hi + 1
                ytop = ceil + 2

            if axis == 'x':
                boxes.append(('cut', (a, walk, nlo, a, ytop, nhi)))
                if args.mode == 'normalise':
                    # thin shell either side + one course above: seals stray voids without
                    # reaching a neighbouring tunnel
                    boxes.append(('seal', (a, walk, nlo - 2, a, ytop + 2, nlo - 1)))
                    boxes.append(('seal', (a, walk, nhi + 1, a, ytop + 2, nhi + 2)))
                    boxes.append(('seal', (a, ytop + 1, nlo, a, ytop + 2, nhi)))
            else:
                boxes.append(('cut', (nlo, walk, a, nhi, ytop, a)))
                if args.mode == 'normalise':
                    boxes.append(('seal', (nlo - 2, walk, a, nlo - 1, ytop + 2, a)))
                    boxes.append(('seal', (nhi + 1, walk, a, nhi + 2, ytop + 2, a)))
                    boxes.append(('seal', (nlo, ytop + 1, a, nhi, ytop + 2, a)))

        bad = [b for k, b in boxes if b[4] > Y41]
        if bad:
            print(f'  ABORT: {len(bad)} box(es) exceed the y41 excavation ceiling, e.g. {bad[0]}')
            return 1

        print(f'  {sum(1 for k, _ in boxes if k == "cut")} cut boxes, '
              f'{sum(1 for k, _ in boxes if k == "seal")} seal boxes, '
              f'{len(chambers)} chamber stations skipped, {skipped} off-corridor stations skipped')
        for a, lo, hi, w in chambers[:8]:
            print(f'    chamber @ {axis}={a} perp[{lo},{hi}] width={w}')

        if args.mode == 'trace' or not args.apply:
            for kind, b in boxes[:8]:
                verb = f'air replace {ROCK}' if kind == 'cut' else 'stone replace air'
                print(f'  DRY {kind:4s} fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} {verb}')
            print(f'  ... {len(boxes)} boxes total (nothing sent)')
        else:
            cut = sealed = 0
            for kind, b in boxes:
                verb = f'air replace {ROCK}' if kind == 'cut' else 'stone replace air'
                res = s.cmd(f'fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} {verb}')
                if 'Successfully filled' in res:
                    n = int(res.split('filled')[1].split('block')[0].strip())
                    if kind == 'cut':
                        cut += n
                    else:
                        sealed += n
                elif 'No blocks' not in res:
                    print(f'  WARN {res.strip()[:80]}')
            print(f'  CUT {cut} rock, SEALED {sealed} stray air')

        s.cmd(f'forceload remove {x1} {z1} {x2} {z2}')
    finally:
        s.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
