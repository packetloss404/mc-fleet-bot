#!/usr/bin/env python3
"""
Verify that a build-ops file actually landed in the world.

build_runner.py reports what it ISSUED, which is not the same as what exists. A
deadlocked sequencer, a killed process or a silently-refused command all leave the
runner's tally looking healthy. This samples the ops themselves and checks the world.

  python3 scripts/verify_ops.py data/buildops/*.txt [--samples 6]

For each file it picks SET ops spread through the file, reads the block at the
centre of each op's box out of the region snapshot, and reports how many match the
material the op asked for. Ops whose pattern is a percentage mix are matched against
any of the listed materials. REPL and CMD ops are skipped -- a masked replace that
found nothing to replace is not evidence of failure.

Exit code 1 if any file scores below the pass threshold.
"""
import argparse, json, os, random, re, subprocess, sys

CENSUS = os.path.join(os.path.dirname(__file__), 'block_census.mjs')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def materials(pattern):
    """Pull the block names out of a WorldEdit pattern, dropping weights/states."""
    out = []
    for part in pattern.split(','):
        part = part.strip()
        if '%' in part:
            part = part.split('%', 1)[1]
        part = part.split('[', 1)[0]
        if part and not part[0].isdigit():
            out.append(part.replace('minecraft:', ''))
    return out


def read_block(x, y, z):
    r = subprocess.run(['node', CENSUS, '--box', str(x), str(y), str(z),
                        str(x), str(y), str(z), '--include-air', '--list'],
                       capture_output=True, text=True, cwd=ROOT, timeout=180)
    for line in r.stdout.splitlines():
        # Read the coordinate-bearing line, not the aggregate tally above it. The
        # old sign check only admitted position lines whose X coordinate began with
        # "-", so every positive-coordinate build sampled as `None`.
        m = re.match(r'\s*-?\d+\s+-?\d+\s+-?\d+\s+minecraft:(\S+)\s*$', line)
        if m:
            return m.group(1)
    return None


def box(f):
    x1, y1, z1, x2, y2, z2 = (int(v) for v in f[1:7])
    return x1, y1, z1, x2, y2, z2


def centre(f):
    x1, y1, z1, x2, y2, z2 = box(f)
    return (x1 + x2) // 2, (y1 + y2) // 2, (z1 + z2) // 2


def covered_later(pt, later):
    """True if any subsequent op writes over this point. A build file legitimately
    overwrites itself -- a wall gets a window cut into it, a room is carved out of a
    fill. Sampling such a point and calling it MISSING is the checker being wrong,
    not the build. Only points nothing later touches are evidence of anything."""
    x, y, z = pt
    for g in later:
        x1, y1, z1, x2, y2, z2 = box(g)
        if x1 <= x <= x2 and y1 <= y <= y2 and z1 <= z <= z2:
            return True
    return False


def check(path, samples):
    raw = []
    for line in open(path):
        f = line.split()
        if f and f[0] in ('SET', 'REPL') and len(f) >= 8:
            raw.append(f)
    ops = []
    for i, f in enumerate(raw):
        if f[0] != 'SET' or f[7] == 'air':
            continue
        if not covered_later(centre(f), raw[i + 1:]):
            ops.append(f)
    if not ops:
        return path, None, 'no independently verifiable SET ops'
    random.seed(len(ops))
    # Scale by the number we can actually draw. The previous denominator stayed
    # at the caller's requested sample count even when there were fewer eligible
    # ops, producing duplicate early indexes and never checking later operations.
    sample_count = min(samples, len(ops))
    picks = [ops[i * len(ops) // sample_count] for i in range(sample_count)]
    hit = miss = 0
    misses = []
    for f in picks:
        cx, cy, cz = centre(f)
        want = materials(f[7])
        got = read_block(cx, cy, cz)
        if got and any(w == got for w in want):
            hit += 1
        else:
            miss += 1
            misses.append(f'({cx},{cy},{cz}) want {"/".join(want[:2])} got {got}')
    return path, (hit, miss), misses


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('files', nargs='+')
    ap.add_argument('--samples', type=int, default=6)
    a = ap.parse_args()
    bad = 0
    for p in sorted(a.files):
        name = os.path.basename(p)
        path, score, detail = check(p, a.samples)
        if score is None:
            print(f'  {name:28} SKIP   {detail}')
            continue
        hit, miss = score
        total = hit + miss
        verdict = 'BUILT' if hit == total else ('PARTIAL' if hit else 'MISSING')
        if hit != total:
            bad += 1
        print(f'  {name:28} {verdict:8} {hit}/{total}')
        if hit != total:
            for m in detail[:3]:
                print(f'      {m}')
    sys.exit(1 if bad else 0)
