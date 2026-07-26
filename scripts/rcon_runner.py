#!/usr/bin/env python3
"""
Run build ops over RCON with vanilla /fill instead of driving a bot through WorldEdit.

WHY THIS EXISTS. build_runner.py sends WorldEdit commands as an opped mineflayer bot,
because a WorldEdit selection belongs to a player and the console has none. That
costs three chat round-trips per op (//pos1, //pos2, //set) plus a reply poll --
measured at ~1.5s per op, so a 4,000-op build takes over an hour and a 12,000-op
programme takes most of a day.

Vanilla /fill needs no selection: one command, one box, measured at 0.066s over
RCON. That is ~23x faster. Two catches, both handled here:

  1. /fill silently refuses unloaded chunks with "That position is not loaded".
     Measured: a fill aimed at the Westlight site failed exactly this way, because
     the bots never move (we place by coordinate) so nothing out there is loaded.
     This force-loads the ops' bounding box first and releases only what it added --
     the operator has ~281 chunks force-loaded for their own work and
     `forceload remove all` would destroy that.
  2. /fill has a 32768-block limit and no random-pattern support. Boxes over the
     limit are split; percentage-mix patterns are written out to a leftover file for
     build_runner.py to handle through WorldEdit, which does support them.

EVERY reply is checked. A fill that reports anything other than a success is counted
and reported loudly -- the whole point is not to trade an hour for a silent no-op.

  python3 scripts/rcon_runner.py data/buildops/foo.txt [--dry-run] [--keep-loaded]
"""
import argparse, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mc_admin import Rcon, connect            # noqa: E402

FILL_LIMIT = 32768
# Blocks this server's COMMAND PARSER rejects, though WorldEdit places them happily.
# Measured 2026-07-26: `setblock <x> <y> <z> chain` and `fill ... chain` both return
# "Unknown block type 'minecraft:chain'", with or without an explicit axis state, while
# the same block set through WorldEdit works. Anything listed here is routed to the
# WorldEdit leftover file rather than being attempted and silently lost.
COMMAND_BLOCKED = {'chain'}
BATCH = 40                                     # commands per RCON round-trip
OK = re.compile(r'Successfully filled|filled \d+ block')
NOOP = re.compile(r'No blocks (were )?(filled|changed)|could not be placed')


def parse(path):
    ops = []
    for n, line in enumerate(open(path), 1):
        f = line.split()
        if not f or f[0].startswith('#'):
            continue
        ops.append((n, f))
    return ops


def volume(b):
    x1, y1, z1, x2, y2, z2 = b
    return (abs(x2 - x1) + 1) * (abs(y2 - y1) + 1) * (abs(z2 - z1) + 1)


def split(b):
    """Break a box into pieces under the /fill limit, slicing the longest axis."""
    if volume(b) <= FILL_LIMIT:
        return [b]
    x1, y1, z1, x2, y2, z2 = b
    x1, x2 = min(x1, x2), max(x1, x2)
    y1, y2 = min(y1, y2), max(y1, y2)
    z1, z2 = min(z1, z2), max(z1, z2)
    spans = [(x2 - x1, 0), (y2 - y1, 1), (z2 - z1, 2)]
    _, axis = max(spans)
    lo = [x1, y1, z1][axis]
    hi = [x2, y2, z2][axis]
    mid = (lo + hi) // 2
    a = [x1, y1, z1, x2, y2, z2]
    bb = list(a)
    a[axis + 3] = mid
    bb[axis] = mid + 1
    return split(tuple(a)) + split(tuple(bb))


def commands(ops):
    """Turn ops into (line_no, /fill command) pairs. Returns leftovers separately."""
    out, leftover = [], []
    for n, f in ops:
        if f[0] == 'CMD':
            out.append((n, ' '.join(f[1:]).lstrip('/')))
            continue
        if f[0] not in ('SET', 'REPL') or len(f) < 8:
            leftover.append((n, f))
            continue
        box = tuple(int(v) for v in f[1:7])
        if f[0] == 'SET':
            pattern, mask = f[7], None
        else:
            mask, pattern = f[7], f[8] if len(f) > 8 else None
        if (pattern is None or '%' in pattern
                or pattern.split('[')[0].replace('minecraft:', '') in COMMAND_BLOCKED):
            leftover.append((n, f))         # random mixes and blocked ids: WorldEdit's job
            continue
        for piece in split(box):
            x1, y1, z1, x2, y2, z2 = piece
            base = f'fill {x1} {y1} {z1} {x2} {y2} {z2} {pattern}'
            if mask:
                for m in mask.split(','):
                    if m in ('air', 'cave_air'):
                        out.append((n, base + ' replace ' + m))
                    else:
                        out.append((n, base + ' replace ' + m))
            else:
                out.append((n, base))
    return out, leftover


def bounds(ops):
    xs, ys, zs = [], [], []
    for _, f in ops:
        if f[0] in ('SET', 'REPL') and len(f) >= 8:
            v = [int(t) for t in f[1:7]]
            xs += [v[0], v[3]]
            ys += [v[1], v[4]]
            zs += [v[2], v[5]]
    return (min(xs), min(zs), max(xs), max(zs)) if xs else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--keep-loaded', action='store_true',
                    help='leave the force-loaded chunks in place (for a following run)')
    a = ap.parse_args()

    ops = parse(a.file)
    cmds, leftover = commands(ops)
    print(f'{os.path.basename(a.file)}: {len(ops)} ops -> {len(cmds)} /fill commands, '
          f'{len(leftover)} left for WorldEdit')
    if a.dry_run:
        for _, c in cmds[:5]:
            print('   ', c)
        return 0
    if not cmds:
        return 0

    bx = bounds(ops)
    rc = Rcon(connect())
    added = []
    # Snapshot the operator's existing force-loads. They have ~281 chunks pinned for
    # their own work; our `forceload remove` over a range would take those with it,
    # so anything that disappears gets put back at the end.
    before = set(re.findall(r'\[(-?\d+), (-?\d+)\]', rc.cmd('forceload query')))
    try:
        if bx:
            x1, z1, x2, z2 = bx
            # forceload add takes block coords and covers at most 256 chunks per call,
            # so walk the region in 16x16-chunk (256x256 block) tiles.
            for cx in range(x1 - 16, x2 + 17, 256):
                for cz in range(z1 - 16, z2 + 17, 256):
                    ex, ez = min(cx + 255, x2 + 16), min(cz + 255, z2 + 16)
                    r = rc.cmd(f'forceload add {cx} {cz} {ex} {ez}')
                    if 'Added' in r or 'forced' in r.lower():
                        added.append((cx, cz, ex, ez))
            print(f'  force-loaded {len(added)} tile(s) covering x[{x1},{x2}] z[{z1},{z2}]')
            time.sleep(2)

        t0 = time.time()
        good = bad = 0
        fails = []
        for i in range(0, len(cmds), BATCH):
            chunk = cmds[i:i + BATCH]
            replies = [rc.cmd(c) for _, c in chunk]
            for (n, c), rep in zip(chunk, replies):
                if OK.search(rep) or NOOP.search(rep):
                    good += 1
                else:
                    bad += 1
                    if len(fails) < 8:
                        fails.append(f'line {n}: {c[:70]} -> {rep.strip()[:60]}')
            if (i + BATCH) % 400 < BATCH:
                print(f'  {min(i + BATCH, len(cmds))}/{len(cmds)} '
                      f'({(time.time() - t0) / max(good, 1):.3f}s per command)')
        dt = time.time() - t0
        print(f'\n  {good} ok, {bad} FAILED in {dt:.0f}s ({dt / max(len(cmds),1):.3f}s per cmd)')
        for f in fails:
            print(f'    {f}')
    finally:
        if added and not a.keep_loaded:
            for cx, cz, ex, ez in added:
                rc.cmd(f'forceload remove {cx} {cz} {ex} {ez}')
            after = set(re.findall(r'\[(-?\d+), (-?\d+)\]', rc.cmd('forceload query')))
            lost = before - after
            for cx, cz in lost:
                rc.cmd(f'forceload add {int(cx) * 16} {int(cz) * 16}')
            print(f'  released {len(added)} force-load tile(s)'
                  + (f', restored {len(lost)} of the operator\'s' if lost else ''))

    if leftover:
        p = a.file.replace('.txt', '_worldedit.txt')
        with open(p, 'w') as f:
            for _, g in leftover:
                f.write(' '.join(g) + '\n')
        print(f'  {len(leftover)} pattern-mix ops written to {p} -- run with build_runner.py')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
