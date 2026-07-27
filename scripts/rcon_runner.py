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
# Measured 2026-07-26: the legacy `chain` / `minecraft:chain` id is absent on this
# 1.21.11 server; its registry name is `minecraft:iron_chain`. Keep the legacy id
# blocked so an old ops file cannot silently lose rigging. New generators must emit
# `minecraft:iron_chain`, which works through vanilla /fill and needs no WorldEdit.
COMMAND_BLOCKED = {'chain'}
BATCH = 40                                     # commands per RCON round-trip
OK = re.compile(
    r'Successfully filled|filled \d+ block|Changed the block at|Modified block data of'
)
NOOP = re.compile(
    r'No blocks (were )?(filled|changed)|could not be placed|'
    r'Could not set the block|Nothing changed\. The specified properties'
)


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


def split_masks(mask):
    """Split a comma-delimited material mask without splitting block states.

    REPL historically allowed masks such as ``air,cave_air``. Modern guarded
    operations also use exact states such as
    ``lantern[hanging=false,waterlogged=false]``; a plain ``str.split(',')``
    corrupts that state into two invalid commands.
    """
    masks, start, depth = [], 0, 0
    for i, char in enumerate(mask):
        if char == '[':
            depth += 1
        elif char == ']':
            depth = max(0, depth - 1)
        elif char == ',' and depth == 0:
            masks.append(mask[start:i])
            start = i + 1
    masks.append(mask[start:])
    return [entry for entry in masks if entry]


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
                for m in split_masks(mask):
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
            # forceload add takes block coords and covers at most 256 chunks per
            # call. Tile in CHUNK space, aligned to chunk boundaries. A previous
            # block-space loop started at unaligned x1-16/z1-16 coordinates; an
            # apparently 256x256 block tile could therefore touch 17x17=289 chunks
            # and be rejected as "Too many chunks", leaving edge ops unloaded.
            min_cx, max_cx = x1 // 16, x2 // 16
            min_cz, max_cz = z1 // 16, z2 // 16
            for chunk_x in range(min_cx, max_cx + 1, 16):
                for chunk_z in range(min_cz, max_cz + 1, 16):
                    end_chunk_x = min(chunk_x + 15, max_cx)
                    end_chunk_z = min(chunk_z + 15, max_cz)
                    cx, cz = chunk_x * 16, chunk_z * 16
                    ex, ez = end_chunk_x * 16 + 15, end_chunk_z * 16 + 15
                    r = rc.cmd(f'forceload add {cx} {cz} {ex} {ez}')
                    # Record the tile whatever the reply says. An earlier version only
                    # recorded it when the reply contained 'Added' or 'forced'; the
                    # server actually answers "Marked N chunks ... for force loading",
                    # so nothing was ever recorded and nothing was ever released --
                    # 167 chunks were left pinned across a session before anyone looked.
                    # Releasing a tile we did not add is harmless; the `before` snapshot
                    # below puts back anything of the operator's that goes with it.
                    added.append((cx, cz, ex, ez))
                    if 'Marked' not in r and 'force loading' not in r:
                        print(f'  note: unexpected forceload reply: {r.strip()[:60]}')
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
