#!/usr/bin/env python3
"""
Waypoint-guided tunnel enlargement -- for tunnels the axis tracer cannot handle.

Background
----------
Two Raven Rock legs defeated the axis tracer (scripts/rr_enlarge_tunnels.py):

  * S1  -- its self-recentring centreline drifted 1 block per station until it was 22
           blocks off axis and tracing a DIFFERENT tunnel (T3, which shares the corridor).
  * T2b -- a descending dogleg. Its route is actually close to the straight interpolation,
           but the tracer seeds each station's walk level from the previous station, and
           when that seed is wrong the floor search fails; half its stations found no bore
           and the rest were rejected by the axis clamp.

The fix is to stop inferring the route. TREADS are unambiguous built geometry -- tunnel
floors here are stone_bricks while the surrounding rock and natural caves are not -- so the
tread path was surveyed directly and is supplied here as a WAYPOINT POLYLINE. Each station
seeds its centre and walk level by interpolating between waypoints, then measures the local
air section from that reliable seed and enlarges it.

This also solves the problem that broke naive approaches on T2b: its bore is MERGED into a
natural cave system (that corridor scans ~34% air), so an air-flood cannot tell bore from
cave. A tread-derived centreline can.

Safety, unchanged from the axis tracer
--------------------------------------
* Cuts are `air replace #minecraft:base_stone_overworld`. Treads/liner/lanterns are not in
  that tag, so they CANNOT be deleted -- the failure that destroyed tunnel floors twice.
* Cuts start at the walk level, so the tread is outside the box as well.
* Every box is asserted against the y41 excavation ceiling before being sent.
* A station measuring wider than MAX_BORE_WIDTH is a chamber, not a bore: reported, skipped.
* Measured sections are clamped to DEVIATION of the waypoint centreline, so a station can
  never wander into an adjoining void.

Usage
  python3 scripts/rr_enlarge_waypoints.py T2b
  python3 scripts/rr_enlarge_waypoints.py T2b --apply
"""

from __future__ import annotations

import argparse
import sys

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M

ROCK = '#minecraft:base_stone_overworld'
WIDEN_EACH_SIDE = 1
RAISE_CEILING = 2
MAX_BORE_WIDTH = 11
DEVIATION = 5
SEARCH = 12
Y41 = 41

# Waypoints are (axis_coord, walk_y, perp_coord), surveyed from the stone_bricks tread path.
# walk_y is tread_y + 1, i.e. the block a player stands in.
JOBS = {
    'T2b': dict(
        axis='x',
        step=3,
        waypoints=[
            (-152, 6, 192), (-146, 3, 186), (-140, 2, 182), (-134, 2, 179),
            (-128, 1, 177), (-122, 0, 174), (-116, -1, 170), (-110, -1, 167),
            (-104, -2, 163), (-98, -3, 161), (-92, -3, 158), (-86, -4, 154),
            (-80, -5, 151), (-74, -5, 147), (-68, -6, 144), (-62, -7, 140),
            (-56, -7, 137), (-50, -8, 133),
        ],
        margin=12,
    ),
    # S1: straight at z=-15, but tunnel T3 runs PARALLEL and desperately close -- at x=120-130
    # only ONE block of rock (z=-18) separates their treads, and at x=100 the two treads
    # actually overlap. So S1 is widened ASYMMETRICALLY, biased to +z (centre -14 instead of
    # -15), which keeps the z=-18 dividing wall intact. A symmetric widen, or any sealing
    # pass, would breach S1 into T3 or bury it.
    # Starts at x=100: below that the two tunnels legitimately merge at their shared endpoint
    # (76,-12,-15) and nothing should be cut there.
    'S1': dict(
        axis='x',
        step=3,
        waypoints=[(100, -11, -14), (130, -11, -14), (160, -11, -14), (192, -11, -14)],
        margin=12,
    ),
}


def interp(waypoints, a):
    """Linear interpolation of (walk_y, perp) along the waypoint polyline at axis coord a."""
    pts = sorted(waypoints, key=lambda w: w[0])
    if a <= pts[0][0]:
        return pts[0][1], pts[0][2]
    if a >= pts[-1][0]:
        return pts[-1][1], pts[-1][2]
    for i in range(len(pts) - 1):
        a0, y0, p0 = pts[i]
        a1, y1, p1 = pts[i + 1]
        if a0 <= a <= a1:
            f = 0 if a1 == a0 else (a - a0) / (a1 - a0)
            return round(y0 + (y1 - y0) * f), round(p0 + (p1 - p0) * f)
    return pts[-1][1], pts[-1][2]


class Session:
    def __init__(self):
        self.cli = M.connect()
        self.r = M.Rcon(self.cli)
        self.notloaded = 0

    def cmd(self, s):
        return self.r.cmd(s)

    def is_air(self, x, y, z):
        v = M.classify_probe(self.cmd(f'execute if block {x} {y} {z} minecraft:air'))
        if v == 'NOT-LOADED':
            self.notloaded += 1
            return None
        return v == 'MATCH'

    def close(self):
        self.cli.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('job', choices=sorted(JOBS))
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--target', action='store_true',
                    help='cut a fixed section on the tread centreline instead of widening '
                         'the measured void (use where the bore has merged with caves)')
    ap.add_argument('--halfwidth', type=int, default=4, help='target mode: centre +/- this (default 4 = 9 wide)')
    ap.add_argument('--height', type=int, default=9, help='target mode: air courses above the walk level')
    args = ap.parse_args()

    job = JOBS[args.job]
    axis, step, wps, margin = job['axis'], job['step'], job['waypoints'], job['margin']
    a_lo = min(w[0] for w in wps)
    a_hi = max(w[0] for w in wps)
    p_lo = min(w[2] for w in wps) - margin
    p_hi = max(w[2] for w in wps) + margin

    s = Session()
    boxes, chambers, misses = [], [], 0
    try:
        if axis == 'x':
            fl = s.cmd(f'forceload add {a_lo - margin} {p_lo} {a_hi + margin} {p_hi}')
        else:
            fl = s.cmd(f'forceload add {p_lo} {a_lo - margin} {p_hi} {a_hi + margin}')
        print(f'forceload: {fl.strip()[:100]}')

        for a in range(a_lo, a_hi + 1, step):
            seed_y, seed_p = interp(wps, a)

            def at(pv, yv):
                return (a, yv, pv) if axis == 'x' else (pv, yv, a)

            # confirm the seed is inside the bore; nudge up if it sits in the tread
            walk = None
            for dy in (0, 1, 2, -1, 3):
                v = s.is_air(*at(seed_p, seed_y + dy))
                if v:
                    walk = seed_y + dy
                    break
            if walk is None:
                misses += 1
                continue

            ceil_air = walk
            for y in range(walk, walk + SEARCH):
                if s.is_air(*at(seed_p, y)):
                    ceil_air = y
                else:
                    break

            knee = walk + 1
            lo = hi = seed_p
            for d in range(1, SEARCH):
                if s.is_air(*at(seed_p - d, knee)):
                    lo = seed_p - d
                else:
                    break
            for d in range(1, SEARCH):
                if s.is_air(*at(seed_p + d, knee)):
                    hi = seed_p + d
                else:
                    break

            lo = max(lo, seed_p - DEVIATION)
            hi = min(hi, seed_p + DEVIATION)
            width = hi - lo + 1

            if args.target:
                # FIXED-ENVELOPE mode. Used where the bore has MERGED with natural caves
                # (T2b's corridor scans ~34% air), so "measure the void and add 2" would
                # just enlarge a cave. Instead cut an exact section on the tread centreline:
                # a guaranteed tunnel of the right size, without draining or filling the
                # caves it happens to intersect.
                nlo, nhi = seed_p - args.halfwidth, seed_p + args.halfwidth
                ytop = walk + args.height - 1
            else:
                if width > MAX_BORE_WIDTH:
                    chambers.append((a, lo, hi, width))
                    continue
                nlo, nhi = lo - WIDEN_EACH_SIDE, hi + WIDEN_EACH_SIDE
                ytop = ceil_air + RAISE_CEILING
            a_end = a + step - 1
            box = ((a, walk, nlo, a_end, ytop, nhi) if axis == 'x'
                   else (nlo, walk, a, nhi, ytop, a_end))
            boxes.append(box)
            print(f'  {args.job} @ {axis}={a:>5} walk y{walk:<4} ceil y{ceil_air:<4} '
                  f'perp[{lo},{hi}] -> [{nlo},{nhi}] ytop y{ytop}')

        bad = [b for b in boxes if b[4] > Y41]
        if bad:
            print(f'ABORT: {len(bad)} box(es) above the y41 ceiling, e.g. {bad[0]}')
            return 1

        print(f'\n  {len(boxes)} boxes, {len(chambers)} chamber stations skipped, '
              f'{misses} stations with no bore at the seed')
        for c in chambers[:8]:
            print(f'    chamber @ {axis}={c[0]} perp[{c[1]},{c[2]}] width={c[3]}')

        if args.apply:
            cut = 0
            for b in boxes:
                res = s.cmd(f'fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} air replace {ROCK}')
                if 'Successfully filled' in res:
                    cut += int(res.split('filled')[1].split('block')[0].strip())
                elif 'No blocks' not in res:
                    print(f'  WARN {res.strip()[:80]}')
            print(f'  CUT {cut} blocks of rock')
        else:
            print('  (dry run, nothing sent)')

        if s.notloaded:
            print(f'  NOTE {s.notloaded} NOT-LOADED probes -- not treated as evidence')
    finally:
        s.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
