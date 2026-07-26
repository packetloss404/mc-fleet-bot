#!/usr/bin/env python3
"""Declarative, repeatable world audit. Reads a YAML spec of what SHOULD exist and
checks it against the world, offline, from region files.

Why this exists
---------------
Every audit on this world so far has been hand-rolled, and they were wrong in BOTH
directions. On 2026-07-25 alone:

  * "0 of 4 storehouse chests exist" -- all four existed, evenly spaced.
  * "0 of 5 crafting tables" -- four existed.
  * "0/11 shaft landings found" -- fifteen existed. Every probe was off by one in y.
  * Floating debris "at y77-78" -- already cleared before the report was written.

And in the other direction, real defects that no probe found: two half-beds, a floating
parapet, an untraversable shaft, 41 waterlogged blocks re-flooding a tunnel.

The common cause is that a human (or an agent) picked coordinates by hand, probed a few
of them, and generalised. This tool removes that step: assertions are written ONCE
against measured geometry, then re-run identically forever.

Three properties it enforces that the hand-rolled audits did not
---------------------------------------------------------------
1. ABSENT and UNREADABLE are different results. If any chunk in an assertion's box is
   missing from the snapshot, the verdict is UNKNOWN, never FAIL. Conflating those is
   what trap #7 documents, and it is how "not loaded" became "missing" in three
   separate surveys.
2. Whole layers, not sample points. A `ring` or `layer` assertion counts every block in
   a horizontal slice, so a wall course cannot be declared missing because someone
   probed one block outside the wall plane.
3. Materials match by EXACT name. `stone` never matches `stone_bricks`. A substring
   filter is what silently dropped a tower's structure from a restore on 2026-07-25.

Baselines are the point
-----------------------
`--baseline` diffs this run against a stored one and reports what CHANGED. Running it
on a schedule turns "somebody noticed the tower was gone" into "the audit went red the
night it happened". That is the difference between this and another one-off survey.

Usage
-----
  audit.py SPEC.yaml                        run and print a report
  audit.py SPEC.yaml --refresh              pull a fresh world snapshot first
  audit.py SPEC.yaml --json out.json        write machine-readable results
  audit.py SPEC.yaml --baseline prev.json   diff against a previous run
  audit.py SPEC.yaml --only cottages        run one group
  audit.py SPEC.yaml -v                     show evidence for passing checks too

Exit codes: 0 all passed · 1 one or more FAIL · 2 no failures but some UNKNOWN
            3 spec or tooling error
"""
import argparse
import json
import re
import subprocess
import sys
import os
from datetime import datetime, timezone

try:
    import yaml
except ImportError:
    print('audit.py needs PyYAML (python3 -m pip install pyyaml)', file=sys.stderr)
    sys.exit(3)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
CENSUS = os.path.join(HERE, 'block_census.mjs')
SNAPSHOT = os.path.join(HERE, 'world_snapshot.py')
DEFAULT_REGIONS = os.path.join(ROOT, 'data', 'worldsnap', 'region')

PASS, FAIL, UNKNOWN = 'PASS', 'FAIL', 'UNKNOWN'


# ----------------------------------------------------------------- census bridge
class CensusError(RuntimeError):
    pass


def census(box, regions, material=None, include_air=False, states=False):
    """Run block_census.mjs over a box and parse its report.

    Returns {'cells', 'chunks_read', 'chunks_absent', 'total', 'tally': {name: n}}.
    `tally` keys are full block names exactly as the world reports them.
    """
    cmd = ['node', CENSUS, '--regions', regions, '--box', *[str(v) for v in box]]
    if material:
        cmd += ['--material', material]
    if include_air:
        cmd.append('--include-air')
    if states:
        cmd.append('--states')
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if p.returncode != 0:
        raise CensusError(p.stderr.strip() or f'census exited {p.returncode}')

    out = p.stdout
    m_cells = re.search(r'cells=(\d+)', out)
    m_chunks = re.search(r'chunks:\s*(\d+) read,\s*(\d+) absent', out)
    m_total = re.search(r'non-air:\s*(\d+)', out)
    tally = {}
    for line in out.splitlines():
        m = re.match(r'\s+(\d+)\s+(minecraft:\S+)\s*$', line)
        if m:
            tally[m.group(2)] = int(m.group(1))
    return {
        'cells': int(m_cells.group(1)) if m_cells else 0,
        'chunks_read': int(m_chunks.group(1)) if m_chunks else 0,
        'chunks_absent': int(m_chunks.group(2)) if m_chunks else 0,
        'total': int(m_total.group(1)) if m_total else 0,
        'tally': tally,
    }


def matched(tally, materials):
    """Sum blocks whose name matches any entry EXACTLY.

    Exact, never substring. `stone` must not match `stone_bricks`, `deepslate` must not
    match `deepslate_brick_stairs`. A substring filter silently ate a tower's structure
    during a restore on 2026-07-25; this is that bug made unrepresentable.
    Entries may omit the `minecraft:` prefix.
    """
    want = set()
    for m in materials:
        want.add(m if ':' in m else f'minecraft:{m}')
    return sum(n for name, n in tally.items() if name.split('[')[0] in want)


# ----------------------------------------------------------------- assertions
def ring_cells(x1, x2, z1, z2):
    """Cell count of a 1-block-wide perimeter at one y."""
    w, d = abs(x2 - x1) + 1, abs(z2 - z1) + 1
    return 2 * w + 2 * d - 4 if w > 1 and d > 1 else w * d


def run_check(chk, regions):
    """Evaluate one assertion. Returns (verdict, detail, evidence)."""
    kind = chk.get('type')
    box = chk['box']
    if len(box) != 6:
        return FAIL, 'box must be [x1,y1,z1,x2,y2,z2]', {}

    mats = chk.get('materials') or ([chk['material']] if chk.get('material') else [])
    include_air = kind in ('empty', 'air_fraction')
    c = census(box, regions, include_air=include_air)

    # Unreadable chunks poison the result. Report UNKNOWN rather than inventing a
    # verdict -- absence of evidence is not evidence of absence.
    if c['chunks_absent'] > 0:
        return UNKNOWN, f"{c['chunks_absent']} chunk(s) missing from snapshot", c

    # `exclude:` subtracts sub-boxes from the tally. Needed whenever a building stands
    # INSIDE the area being asserted on: a "no abandoned furniture on the plaza" check
    # flagged the town hall's own strongroom chests and archive barrels, because the
    # plaza box necessarily contains the hall. Carving the region into strips by hand
    # is error-prone and the errors look exactly like real findings, which is the whole
    # failure mode this tool exists to remove.
    excluded = 0
    for ebox in chk.get('exclude', []):
        e = census(ebox, regions, include_air=include_air)
        if e['chunks_absent'] > 0:
            return UNKNOWN, f"{e['chunks_absent']} chunk(s) missing under an exclude box", e
        for name, n in e['tally'].items():
            c['tally'][name] = max(0, c['tally'].get(name, 0) - n)
            excluded += n
        c['total'] = max(0, c['total'] - e['total'])
        c['cells'] = max(0, c['cells'] - e['cells'])

    ev = {'cells': c['cells'], 'non_air': c['total'], 'excluded': excluded,
          'top': dict(list(c['tally'].items())[:6])}

    if kind == 'solid':
        got, want = c['total'], c['cells']
        ok = got >= want * chk.get('min_fraction', 1.0)
        return (PASS if ok else FAIL), f'{got}/{want} cells solid', ev

    if kind == 'empty':
        solid = sum(n for name, n in c['tally'].items()
                    if name.split('[')[0] not in ('minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'))
        return (PASS if solid == 0 else FAIL), f'{solid} solid block(s) present, expected 0', ev

    if kind in ('contains', 'layer', 'ring'):
        got = matched(c['tally'], mats) if mats else c['total']
        if kind == 'ring':
            want = chk.get('min', ring_cells(box[0], box[3], box[2], box[5]))
        else:
            want = chk.get('min', 1)
        tol = chk.get('tolerance', 0)
        ok = got >= want - tol
        label = '+'.join(mats) if mats else 'any'
        return (PASS if ok else FAIL), f'{got} of {label}, expected >= {want - tol}', ev

    if kind == 'absent':
        got = matched(c['tally'], mats)
        return (PASS if got == 0 else FAIL), f'{got} of {"+".join(mats)}, expected 0', ev

    if kind == 'count':
        got = matched(c['tally'], mats)
        want = chk['expect']
        tol = chk.get('tolerance', 0)
        ok = abs(got - want) <= tol
        return (PASS if ok else FAIL), f'{got} of {"+".join(mats)}, expected {want}+-{tol}', ev

    return FAIL, f'unknown assertion type "{kind}"', ev


# ----------------------------------------------------------------- driver
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('spec')
    ap.add_argument('--regions', default=DEFAULT_REGIONS)
    ap.add_argument('--refresh', action='store_true', help='pull a fresh world snapshot first')
    ap.add_argument('--json', dest='json_out')
    ap.add_argument('--baseline', help='previous --json output to diff against')
    ap.add_argument('--only', help='run only groups whose name contains this')
    ap.add_argument('-v', '--verbose', action='store_true', help='show evidence for passes too')
    a = ap.parse_args()

    try:
        with open(a.spec) as f:
            spec = yaml.safe_load(f)
    except Exception as e:
        print(f'cannot read spec: {e}', file=sys.stderr)
        return 3

    if a.refresh:
        near = spec.get('snapshot', {}).get('near')
        radius = str(spec.get('snapshot', {}).get('radius', 200))
        if near:
            print(f'refreshing snapshot near {near} r={radius} ...')
            subprocess.run(['python3', SNAPSHOT, f'--near={near}', '--radius', radius],
                           cwd=ROOT, capture_output=True, text=True)

    results, counts = [], {PASS: 0, FAIL: 0, UNKNOWN: 0}
    print(f"\n  {spec.get('name', a.spec)}")
    print(f"  {datetime.now(timezone.utc).isoformat(timespec='seconds')}\n")

    for group in spec.get('groups', []):
        gname = group.get('name', '?')
        if a.only and a.only.lower() not in gname.lower():
            continue
        print(f'  \033[1m{gname}\033[0m')
        for chk in group.get('checks', []):
            cname = chk.get('name', chk.get('type', '?'))
            try:
                verdict, detail, ev = run_check(chk, a.regions)
            except CensusError as e:
                verdict, detail, ev = UNKNOWN, f'census failed: {e}', {}
            counts[verdict] += 1
            results.append({'group': gname, 'check': cname, 'verdict': verdict,
                            'detail': detail, 'box': chk['box'], 'evidence': ev})
            colour = {'PASS': '\033[32m', 'FAIL': '\033[31m', 'UNKNOWN': '\033[33m'}[verdict]
            print(f'    {colour}{verdict:<7}\033[0m {cname}')
            if verdict != PASS or a.verbose:
                print(f'            {detail}')
        print()

    total = sum(counts.values())
    print(f'  {counts[PASS]} passed · {counts[FAIL]} failed · {counts[UNKNOWN]} unknown '
          f'({total} checks)')
    if counts[UNKNOWN]:
        print('  UNKNOWN means chunks were missing from the snapshot -- not that the '
              'thing is absent.\n  Re-run with --refresh before believing anything about them.')

    # ---- baseline diff: the reason to run this on a schedule
    if a.baseline:
        try:
            with open(a.baseline) as f:
                prev = {(r['group'], r['check']): r['verdict'] for r in json.load(f)['results']}
        except Exception as e:
            print(f'\n  baseline unreadable: {e}')
        else:
            regressions, fixes, new = [], [], []
            for r in results:
                key = (r['group'], r['check'])
                was = prev.get(key)
                if was is None:
                    new.append(r)
                elif was == PASS and r['verdict'] == FAIL:
                    regressions.append(r)
                elif was == FAIL and r['verdict'] == PASS:
                    fixes.append(r)
            print('\n  \033[1mSince baseline\033[0m')
            if regressions:
                print('    \033[31mREGRESSED\033[0m — these passed before and fail now:')
                for r in regressions:
                    print(f'      {r["group"]} / {r["check"]}: {r["detail"]}')
            if fixes:
                print('    \033[32mFIXED\033[0m:')
                for r in fixes:
                    print(f'      {r["group"]} / {r["check"]}')
            if new:
                print(f'    {len(new)} new check(s) not in the baseline')
            if not (regressions or fixes or new):
                print('    no change')

    if a.json_out:
        with open(a.json_out, 'w') as f:
            json.dump({'spec': spec.get('name', a.spec),
                       'at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
                       'counts': counts, 'results': results}, f, indent=2)
        print(f'\n  wrote {a.json_out}')

    return 1 if counts[FAIL] else (2 if counts[UNKNOWN] else 0)


if __name__ == '__main__':
    sys.exit(main())
