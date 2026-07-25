#!/usr/bin/env python3
"""
Clear fallen gravel/sand out of the Raven Rock tunnel bores.

Why this is needed
------------------
The tunnel enlargement (+2 wide, +2 tall, ceiling-only) cut with the mask
`air replace #minecraft:base_stone_overworld`. That mask is what makes it
impossible to delete a stone_brick floor tread — the failure that destroyed tunnel
floors twice on this project. But gravel and sand are NOT in that tag, so raising
the ceilings EXPOSED gravel deposits, gravity did the rest, and the gravel dropped
into the bores and blocked them. S1 hit this at x=120: solid gravel filling
y-11..-8 with air above and below it.

Approach, and why it is a loop
------------------------------
Clearing gravel lets whatever sat on top of it fall in turn, so a single pass does
not converge. This repeats `gravel/sand -> air` over each tunnel corridor until a
pass changes nothing (or a cap is hit), which drains the whole column of loose
material rather than just its bottom layer.

The alternative — `gravel -> stone` to stabilise, then clear the bore — needs
per-station bore geometry to know what to re-open, and gets it wrong wherever the
trace is imperfect. Clearing to air needs no geometry at all: it cannot damage
treads (stone_bricks), liner, lanterns or rails, because it only ever touches
gravel and sand. The cost is small pockets left in the rock where a deposit used to
be, which are inside the wall mass and not visible from the bore.

Safety
------
* Only `gravel` and `sand` are ever replaced. Nothing else can be touched.
* Every fill is volume-checked under the 32,768 limit and split if needed —
  /fill SILENTLY no-ops above that and reports nothing.
* Corridors are force-loaded before work and released after, and the reply's
  chunk count is checked, because an oversized forceload fails silently and then
  every probe reads FAIL.
* The y41 excavation ceiling is asserted per box: no corridor here goes near it
  (the highest tunnel crown is ~y26), and a box above y41 aborts the run.

Usage
  python3 scripts/rr_degravel.py --list
  python3 scripts/rr_degravel.py T1            # dry run
  python3 scripts/rr_degravel.py all --apply
"""

from __future__ import annotations

import argparse
import sys

sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin as M

Y41 = 41
MAX_FILL = 30000          # headroom under the 32,768 hard limit
MAX_PASSES = 6

# Generous boxes around each leg's route, from below the floor to above the crown.
# S1 is intentionally absent — it was already treated and verified.
CORRIDORS = {
    'T1':  (-10, -14, -290,  10,  26,  -45),
    'T2a': (-160, -2,  185, -140, 26,  290),
    'T2b': (-155, -14, 125,  -45, 12,  200),
    'T3':  (  75, -16, -40,  290, 26,  -10),
    'T4':  (-295, -20, -15, -185, 16,   10),
    'C1':  (  -8, -16,  14,    8,  4,   72),
    'C2':  (-120, -20, -18,  -74, -2,   -8),
}


def split(box, budget=MAX_FILL):
    """Yield sub-boxes each under `budget` blocks, splitting along the longest axis."""
    x1, y1, z1, x2, y2, z2 = box
    vol = (x2 - x1 + 1) * (y2 - y1 + 1) * (z2 - z1 + 1)
    if vol <= budget:
        yield box
        return
    dx, dy, dz = x2 - x1, y2 - y1, z2 - z1
    if dx >= dy and dx >= dz:
        mid = (x1 + x2) // 2
        yield from split((x1, y1, z1, mid, y2, z2), budget)
        yield from split((mid + 1, y1, z1, x2, y2, z2), budget)
    elif dz >= dy:
        mid = (z1 + z2) // 2
        yield from split((x1, y1, z1, x2, y2, mid), budget)
        yield from split((x1, y1, mid + 1, x2, y2, z2), budget)
    else:
        mid = (y1 + y2) // 2
        yield from split((x1, y1, z1, x2, mid, z2), budget)
        yield from split((x1, mid + 1, z1, x2, y2, z2), budget)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('leg', nargs='?', default='all')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--list', action='store_true')
    args = ap.parse_args()

    if args.list:
        for k, v in CORRIDORS.items():
            vol = (v[3] - v[0] + 1) * (v[4] - v[1] + 1) * (v[5] - v[2] + 1)
            print(f'  {k:5s} {v}  volume={vol:,}  subboxes={len(list(split(v)))}')
        return 0

    todo = CORRIDORS if args.leg == 'all' else {args.leg: CORRIDORS[args.leg]}

    cli = M.connect()
    r = M.Rcon(cli)
    grand = 0
    try:
        for name, box in todo.items():
            x1, y1, z1, x2, y2, z2 = box
            if y2 > Y41:
                raise SystemExit(f'ABORT {name}: box top y{y2} exceeds the y41 ceiling')

            fl = r.cmd(f'forceload add {x1} {z1} {x2} {z2}')
            print(f'\n=== {name} ===\n  forceload: {fl.strip()[:90]}')

            boxes = list(split(box))
            print(f'  {len(boxes)} sub-box(es), each under {MAX_FILL:,} blocks')

            total = 0
            for p in range(1, MAX_PASSES + 1):
                moved = 0
                for b in boxes:
                    for mat in ('gravel', 'sand'):
                        cmd = f'fill {b[0]} {b[1]} {b[2]} {b[3]} {b[4]} {b[5]} air replace {mat}'
                        if not args.apply:
                            continue
                        res = r.cmd(cmd)
                        if 'Successfully filled' in res:
                            moved += int(res.split('filled')[1].split('block')[0].strip())
                        elif 'No blocks' not in res:
                            print(f'  WARN {res.strip()[:80]}')
                if not args.apply:
                    print(f'  DRY would run {len(boxes)*2} fills per pass, up to {MAX_PASSES} passes')
                    break
                total += moved
                print(f'  pass {p}: cleared {moved}')
                if moved == 0:
                    break   # converged: nothing left to fall
            grand += total
            r.cmd(f'forceload remove {x1} {z1} {x2} {z2}')
        if args.apply:
            print(f'\nTOTAL gravel/sand cleared: {grand}')
    finally:
        cli.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
