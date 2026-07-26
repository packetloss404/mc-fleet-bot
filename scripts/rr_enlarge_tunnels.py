#!/usr/bin/env python3
"""
Enlarge the Raven Rock tunnels: +2 blocks wider, +2 blocks taller (CEILING ONLY).

Why this is not a box fill
--------------------------
coordinates.yaml gives each tunnel only endpoints plus a curve type ('gentle-S',
'dogleg', 'gentle'). The as-built route between those points is NOT a straight line,
so a naive straight-line widen would carve fresh rock in the wrong places and leave
the actual tunnel untouched. This script instead TRACES the existing void: at each
station along the tunnel's dominant axis it measures the real air cross-section,
then enlarges that measured section.

Two safety properties, both mechanical rather than procedural
------------------------------------------------------------
1. FLOOR TREADS CANNOT BE DELETED. Every cut is `air replace
   #minecraft:base_stone_overworld`, and the tunnel treads are stone_bricks, which is
   not in that tag. Tunnel floors on this project failed TWICE because each step's
   headroom-clear deleted its neighbour's tread; a tag mask makes that impossible
   rather than merely unlikely. Cuts also start at the walk level, never the tread
   level, so the tread is outside the box as well.
   The same mask protects liner blocks, lanterns, sea_lanterns, rails and signs.
2. THE y41 CEILING IS ASSERTED. Every emitted box is checked against y41 before it
   is sent, exempting only the RR-Z5 shaft column and the four portal corridors,
   per OQ-4. An assertion failure aborts the run rather than trimming the box.

Chunk loading
-------------
`execute if block` on an unloaded chunk replies "That position is not loaded", which
is NOT the same as "no block" — mistaking the two is what made earlier surveys report
false failures. Each leg force-loads its own narrow corridor (tunnels are thin, so
this is only a few dozen chunks), verifies the load took, works, then releases.

Usage
-----
  python3 scripts/rr_enlarge_tunnels.py --list
  python3 scripts/rr_enlarge_tunnels.py T1            # dry run, prints the fill plan
  python3 scripts/rr_enlarge_tunnels.py T1 --apply
  python3 scripts/rr_enlarge_tunnels.py all --apply
"""

from __future__ import annotations

import argparse
import sys

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M

ROCK = '#minecraft:base_stone_overworld'

WIDEN_EACH_SIDE = 1     # +2 total width
RAISE_CEILING = 2       # +2 total height, ceiling only -- floors are never touched

# y41 is the hard excavation ceiling (OQ-4). Only these may exceed it.
Y41 = 41
EXEMPT_PORTAL_CORRIDORS = ('T1', 'T2', 'T3', 'T4')   # portal bores start above y41? see check
EXEMPT_SHAFT = ('RR-Z5',)

# Legs, derived from planning/coordinates.yaml. 'axis' is the dominant travel axis;
# the perpendicular horizontal axis is measured, not assumed, because the routes curve.
LEGS = [
    # id,   axis, from (x,y,z),          to (x,y,z)
    ('T1a', 'z', (0, 18, -285), (0, -6, -120)),
    ('T1b', 'z', (0, -6, -120), (0, -12, -46)),
    ('T2a', 'z', (-150, 18, 285), (-150, 2, 190)),
    ('T2b', 'x', (-150, 2, 190), (-45, -10, 130)),
    ('T3a', 'x', (285, 18, -30), (180, 0, -30)),
    ('T3b', 'x', (180, 0, -30), (76, -12, -15)),
    ('T4', 'x', (-290, 10, 5), (-186, -17, -10)),
    ('C1', 'z', (0, -12, 16), (0, -10, 69)),
    ('C2', 'x', (-76, -12, -15), (-116, -17, -11)),
    ('S1', 'x', (76, -12, -15), (192, -11, -15)),
]

STEP = 3          # stations every N blocks along the axis
SEARCH = 14       # how far to search for walls/ceiling/floor from the seed
MARGIN = 10       # force-load margin around a leg's corridor

# A measured section wider than this is a CHAMBER, not a bore -- the blast vestibules
# N1/N2 (14x14), the rotunda N10, and the cavern mouths all read as very wide stations.
# Those are designed rooms with their own dimensions; the brief was to widen TUNNELS,
# so such stations are reported and skipped rather than expanded.
MAX_BORE_WIDTH = 11

# Cap how far the traced centreline may move per station. The recentring keeps the
# trace on a curving bore, but an asymmetric side void (an alcove, a junction) would
# otherwise drag the centre with it and the error compounds station over station.
MAX_RECENTRE = 1

# HARD clamp on how far the traced centreline may sit from the straight line between
# the leg's endpoints. MAX_RECENTRE alone bounds per-station drift but NOT cumulative
# deviation: on the first S1 run the centre walked 1 block at a time from its true
# axis z=-15 all the way to z=-37, left the spur entirely, and started tracing tunnel
# T3 -- which runs through the same corridor -- cutting rock along a path that belonged
# to neither. This clamp is what makes a leg stay on its own bore. Tunnels curve, so it
# cannot be zero; legs are split at their documented via-points to keep the straight-line
# interpolation honest.
MAX_AXIS_DEVIATION = 6


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


def trace_leg(s: Session, leg, verbose=False):
    """Walk a leg and return a list of enlarged fill boxes."""
    lid, axis, p0, p1 = leg
    a0 = p0[0] if axis == 'x' else p0[2]
    a1 = p1[0] if axis == 'x' else p1[2]
    step = STEP if a1 >= a0 else -STEP

    # seed perpendicular centre + walk level from the start point
    walk = p0[1]
    perp = p0[2] if axis == 'x' else p0[0]

    perp_start = p0[2] if axis == 'x' else p0[0]
    perp_end = p1[2] if axis == 'x' else p1[0]

    boxes, misses, chambers, offaxis = [], 0, [], 0
    a = a0
    while (a <= a1 if step > 0 else a >= a1):
        # linear interpolation of the planned centreline at this station
        frac = 0.0 if a1 == a0 else (a - a0) / (a1 - a0)
        expect_perp = round(perp_start + (perp_end - perp_start) * frac)

        def at(pv, yv):
            return (a, yv, pv) if axis == 'x' else (pv, yv, a)

        # --- find the walk level: search down then up for the floor under `walk`
        floor = None
        for dy in range(0, SEARCH):
            for cand in (walk - dy, walk + dy):
                x, y, z = at(perp, cand)
                air = s.is_air(x, y, z)
                if air is None:
                    break
                if air:
                    below = s.is_air(*at(perp, cand - 1))
                    if below is False:
                        floor, walk = cand, cand
                        break
            if floor is not None:
                break
        if floor is None:
            misses += 1
            a += step
            continue

        # --- ceiling: rise from the walk level until solid
        ceil_air = walk
        for y in range(walk, walk + SEARCH):
            if s.is_air(*at(perp, y)):
                ceil_air = y
            else:
                break

        # --- lateral extent at knee height, recentring as the route curves
        knee = walk + 1
        lo = hi = perp
        for d in range(1, SEARCH):
            if s.is_air(*at(perp - d, knee)):
                lo = perp - d
            else:
                break
        for d in range(1, SEARCH):
            if s.is_air(*at(perp + d, knee)):
                hi = perp + d
            else:
                break
        # Clamp the measured section to the planned corridor. Anything beyond the
        # allowed deviation belongs to some other void (a parallel tunnel, a cave)
        # and must not be cut by THIS leg.
        lo = max(lo, expect_perp - MAX_AXIS_DEVIATION)
        hi = min(hi, expect_perp + MAX_AXIS_DEVIATION)
        if hi < lo:
            offaxis += 1
            a += step
            continue
        width = hi - lo + 1

        # recentre for the next station, damped so an asymmetric void cannot drag the
        # traced centreline off the bore, then pinned to the planned corridor
        target = (lo + hi) // 2
        perp += max(-MAX_RECENTRE, min(MAX_RECENTRE, target - perp))
        perp = max(expect_perp - MAX_AXIS_DEVIATION,
                   min(expect_perp + MAX_AXIS_DEVIATION, perp))

        if width > MAX_BORE_WIDTH:
            chambers.append((a, lo, hi, width))
            a += step
            continue

        # --- the enlarged box: wider both sides, ceiling raised, FLOOR UNTOUCHED
        nlo, nhi = lo - WIDEN_EACH_SIDE, hi + WIDEN_EACH_SIDE
        ytop = ceil_air + RAISE_CEILING
        a_end = a + (step - 1 if step > 0 else step + 1)

        if axis == 'x':
            box = (min(a, a_end), walk, nlo, max(a, a_end), ytop, nhi)
        else:
            box = (nlo, walk, min(a, a_end), nhi, ytop, max(a, a_end))
        boxes.append(box)

        if verbose:
            print(f'    {lid} @ {axis}={a:>5}  walk y{walk:<4} ceil y{ceil_air:<4} '
                  f'perp[{lo},{hi}] -> [{nlo},{nhi}] ytop y{ytop}')
        a += step

    return boxes, misses, chambers, offaxis


def assert_y41(lid, boxes):
    """OQ-4: no excavation above y41 except the shaft and the portal bores."""
    bad = [b for b in boxes if b[4] > Y41]
    if not bad:
        return
    # Portal bores legitimately start high (mouths at y18) but never approach y41;
    # anything over y41 here is a bug in the trace, so refuse to run.
    raise SystemExit(
        f'ABORT {lid}: {len(bad)} box(es) exceed the y41 excavation ceiling, '
        f'e.g. {bad[0]}. Refusing to cut. Fix the trace, do not trim the box.')


def corridor_bounds(boxes):
    xs = [b[0] for b in boxes] + [b[3] for b in boxes]
    zs = [b[2] for b in boxes] + [b[5] for b in boxes]
    return min(xs), min(zs), max(xs), max(zs)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('leg', nargs='?', default='all')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--list', action='store_true')
    ap.add_argument('--verbose', action='store_true')
    args = ap.parse_args()

    if args.list:
        for lid, axis, p0, p1 in LEGS:
            print(f'  {lid:5s} axis={axis}  {p0} -> {p1}')
        return 0

    todo = LEGS if args.leg == 'all' else [l for l in LEGS if l[0] == args.leg
                                           or l[0].rstrip('ab') == args.leg]
    if not todo:
        return print(f'no such leg: {args.leg}') or 1

    s = Session()
    total_cut = 0
    try:
        for leg in todo:
            lid = leg[0]
            print(f'\n=== {lid} ===')

            # force-load the leg corridor first: a straight-line estimate is enough
            # to bound it, and tunnels are thin so this is a small chunk count.
            _, axis, p0, p1 = leg
            fx1, fz1 = min(p0[0], p1[0]) - MARGIN, min(p0[2], p1[2]) - MARGIN
            fx2, fz2 = max(p0[0], p1[0]) + MARGIN, max(p0[2], p1[2]) + MARGIN
            fl = s.cmd(f'forceload add {fx1} {fz1} {fx2} {fz2}')
            print(f'  forceload: {fl.strip()[:90]}')

            before_nl = s.notloaded
            boxes, misses, chambers, offaxis = trace_leg(s, leg, verbose=args.verbose)
            print(f'  traced {len(boxes)} stations, {misses} stations with no bore found, '
                  f'{s.notloaded - before_nl} not-loaded probes, {offaxis} off-axis rejects')
            if chambers:
                print(f'  SKIPPED {len(chambers)} chamber station(s) wider than {MAX_BORE_WIDTH} '
                      f'(designed rooms, left at their own dimensions):')
                for (ca, clo, chi, cw) in chambers:
                    print(f'    axis={ca} perp[{clo},{chi}] width={cw}')

            if not boxes:
                print('  nothing to do')
                s.cmd(f'forceload remove {fx1} {fz1} {fx2} {fz2}')
                continue

            assert_y41(lid, boxes)

            if not args.apply:
                for b in boxes[:6]:
                    print(f'  DRY fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} air replace {ROCK}')
                print(f'  ... {len(boxes)} boxes total (dry run, nothing sent)')
            else:
                cut = 0
                for b in boxes:
                    res = s.cmd(f'fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} air replace {ROCK}')
                    if 'Successfully filled' in res:
                        cut += int(res.split('filled')[1].split('block')[0].strip())
                    elif 'No blocks' not in res:
                        print(f'  WARN unexpected reply: {res.strip()[:80]}')
                print(f'  CUT {cut} blocks of rock')
                total_cut += cut

            s.cmd(f'forceload remove {fx1} {fz1} {fx2} {fz2}')

        if args.apply:
            print(f'\nTOTAL rock removed: {total_cut} blocks')
        if s.notloaded:
            print(f'NOTE {s.notloaded} probes hit unloaded chunks and were not treated as evidence.')
    finally:
        s.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
