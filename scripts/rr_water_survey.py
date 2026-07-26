#!/usr/bin/env python3
"""
Measure the standing water in the Raven Rock tunnel bores. READ ONLY -- sends no fills.

Why this exists: the gravel-clearance pass (rr_gravel_fix.py) had to include water in its
"open bore" test, because excluding it made the tread survey fail across 63 consecutive
T1a stations. That exposed a separate defect the gravel work does not address -- long
stretches of T1, C2 and part of T3b are standing in water, in places well over head
height. Draining is a different job with different risks (the aquifer above N3 and the N7
reservoirs are both nearby), so this script only reports depth and extent so the decision
can be made with numbers.

Depth is measured at each station's centreline as the number of consecutive water blocks
from the walk level upward, so 1 means ankle-deep and 2+ means the head is submerged.

Usage: python3 scripts/rr_water_survey.py [leg ...]
"""

from __future__ import annotations

import sys

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M
import rr_gravel_fix as G


def runs(vals):
    """Compress a sorted list of ints into (start, end) runs."""
    out = []
    for v in vals:
        if out and v == out[-1][1] + 1:
            out[-1][1] = v
        else:
            out.append([v, v])
    return [(a, b) for a, b in out]


def main() -> int:
    legs = sys.argv[1:] or G.ORDER
    s = G.Session()
    try:
        for lid in legs:
            axis, a_lo, a_hi, expect = G.expectation(lid)
            box, mine = G.preload(s, axis, a_lo, a_hi, expect)
            try:
                axis, stations, gaps = G.survey_leg(s, lid)

                def at(a, perp, y):
                    return (a, y, perp) if axis == 'x' else (perp, y, a)

                wet, depths = [], {}
                for st in stations:
                    a, c, walk = st['a'], st['centre'], st['walk']
                    d = 0
                    for y in range(walk, walk + 12):
                        if s.is_block(at(a, c, y), 'water'):
                            d += 1
                        else:
                            break
                    if d:
                        wet.append(a)
                        depths[a] = d
                if not wet:
                    print(f'{lid}: dry at all {len(stations)} stations')
                    continue
                deep = [a for a in wet if depths[a] >= 2]
                print(f'{lid}: {len(wet)}/{len(stations)} stations standing in water, '
                      f'{len(deep)} of them over head height (depth >= 2)')
                print(f'  max depth {max(depths.values())} blocks; wet {axis} runs: '
                      + ', '.join(f'{a}..{b}' for a, b in runs(wet)))
                if deep:
                    print(f'  submerged {axis} runs: '
                          + ', '.join(f'{a}..{b}' for a, b in runs(deep)))
            finally:
                G.unload(s, mine)
    finally:
        print(f'{s.probes} probes, {s.notloaded} NOT-LOADED (not evidence)')
        s.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
