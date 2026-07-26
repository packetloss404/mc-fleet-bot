#!/usr/bin/env python3
"""
build_status.py — one command that says which builds are actually finished.

Reads builds/manifest.yaml and, for every unit, runs BOTH checks:

  PLACED   verify_ops.py samples the unit's ops files against the world.
           Catches "this never ran" and "this ran and half of it is missing".
  WALKABLE reachability.mjs flood-fills from an entry point to the places a
           player has to be able to get to.
           Catches "every block landed and the thing is still unusable".

Both are needed. The Moot Hall descent scored PLACED 5/5 and was a sealed shaft.
Seven other ops files scored MISSING because a deadlocked sequencer meant they were
never run at all, and nothing noticed for hours.

It also flags ops files on disk that are absent from the manifest — an unlisted
build is one nobody is checking, which is how things get forgotten.

  python3 scripts/build_status.py [--only <name>] [--refresh] [--samples 5]

Exit 1 if any live unit is incomplete. Retired units are reported and never fail.
"""
import argparse, os, subprocess, sys
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OPS = os.path.join(ROOT, 'data', 'buildops')
MANIFEST = os.path.join(ROOT, 'builds', 'manifest.yaml')
G, R, Y, DIM, RST = '\033[32m', '\033[31m', '\033[33m', '\033[2m', '\033[0m'


def sh(cmd, timeout=1800):
    return subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT, timeout=timeout)


def placed(files, samples):
    """Returns (verdict, detail). MISSING here usually means 'never ran'."""
    present = [os.path.join('data', 'buildops', f) for f in files
               if os.path.exists(os.path.join(OPS, f))]
    absent = [f for f in files if not os.path.exists(os.path.join(OPS, f))]
    if not present:
        return 'NO-OPS', f'{len(absent)} ops file(s) not on disk'
    r = sh(['python3', 'scripts/verify_ops.py', *present, '--samples', str(samples)])
    hits = tot = 0
    worst = []
    for line in r.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 3 and parts[1] in ('BUILT', 'PARTIAL', 'MISSING') and '/' in parts[2]:
            h, t = parts[2].split('/')
            hits += int(h)
            tot += int(t)
            if parts[1] != 'BUILT':
                worst.append(f'{parts[0]} {parts[2]}')
    if not tot:
        return 'SKIP', 'nothing independently verifiable'
    if hits == tot:
        return 'PLACED', f'{hits}/{tot}'
    return ('MISSING' if hits == 0 else 'PARTIAL'), f'{hits}/{tot} ' + '; '.join(worst[:2])


def one_walk(frm, to, pad, budget):
    r = sh(['node', 'scripts/reachability.mjs', '--from', frm, '--to', to,
            '--pad', str(pad), '--budget', str(budget)])
    bad, notes = 0, []
    for line in r.stdout.splitlines():
        t = line.strip()
        if t.startswith('UNREACHABLE'):
            bad += 1
            notes.append(t.replace('UNREACHABLE ', ''))
        elif 'budget exhausted' in t:
            notes.append('budget exhausted -- inconclusive')
    return bad, notes


def walkable(walks, budget):
    bad, notes = 0, []
    for w in walks:
        pad = w.get('pad', 14)
        frm = ','.join(str(v) for v in w['from'])
        to = ';'.join(','.join(str(v) for v in t) for t in w['to'])
        b, n = one_walk(frm, to, pad, budget)
        bad += b
        notes += n
        # A player falls any distance but climbs only one block, so a one-way check
        # passes on a hole in the floor. Every basement in this town passed that way.
        if w.get('both_ways'):
            for t in w['to']:
                tk = ','.join(str(v) for v in t)
                b, n = one_walk(tk, frm, pad, budget)
                bad += b
                notes += [f'(return) {x}' for x in n]
    if bad == 0:
        return 'WALKABLE', ''
    return 'BLOCKED', '; '.join(notes[:2])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--samples', type=int, default=4)
    ap.add_argument('--budget', type=int, default=400000)
    ap.add_argument('--refresh', action='store_true',
                    help='pull a fresh region snapshot first (checks read the snapshot)')
    a = ap.parse_args()

    man = yaml.safe_load(open(MANIFEST))
    units = man['units']
    if a.only:
        units = [u for u in units if u['name'] == a.only]
        if not units:
            print(f'no unit named {a.only}')
            return 2

    if a.refresh:
        print('refreshing snapshot...')
        sh(['python3', 'scripts/world_snapshot.py', '--near=-85,-400', '--radius', '250'],
           timeout=1800)
        sh(['python3', 'scripts/world_snapshot.py', '--near=-360,-560', '--radius', '120'],
           timeout=1800)

    listed, fails = set(), 0
    print(f'\n  {"unit":26} {"placement":22} {"traversal":12} notes')
    print('  ' + '-' * 96)
    for u in units:
        listed.update(u.get('ops', []))
        name = u['name']
        if 'planned' in u:
            print(f'  {Y}{name:26} {"PLANNED — not built":22} {"-":12}{RST} '
                  f'{" ".join(u["planned"].split())[:44]}')
            fails += 1
            continue
        if 'retired' in u:
            print(f'  {DIM}{name:26} {"retired":22} {"-":12} '
                  f'{" ".join(u["retired"].split())[:44]}{RST}')
            continue
        if 'placement_na' in u:
            pv, pd = 'SKIP', ' '.join(u['placement_na'].split())[:40]
        else:
            pv, pd = placed(u.get('ops', []), a.samples)
        if u.get('walk'):
            wv, wd = walkable(u['walk'], a.budget)
        else:
            wv, wd = 'n/a', u.get('walk_na', f'{R}NO WALK CHECK AND NO REASON GIVEN{RST}')
        ok = pv in ('PLACED', 'SKIP') and wv in ('WALKABLE', 'n/a')
        if not ok:
            fails += 1
        col = G if ok else R
        note = (pd + ('  ' + wd if wd else '')).strip()
        print(f'  {col}{name:26} {pv:22} {wv:12}{RST} {note[:44]}')

    stray = sorted(f for f in os.listdir(OPS)
                   if f.endswith('.txt') and f not in listed
                   and not f.startswith(('fix', 'dm')))
    if stray:
        print(f'\n  {Y}{len(stray)} ops file(s) on disk but NOT in the manifest{RST} '
              f'-- nobody is checking these:')
        for f in stray:
            print(f'    {f}')
        fails += 1

    print(f'\n  {fails} problem(s)\n' if fails else f'\n  {G}all units complete{RST}\n')
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
