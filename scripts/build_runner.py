#!/usr/bin/env python3
"""Execute a list of WorldEdit fills through an opped bot, fast, then verify.

Why not we_admin.py for this
----------------------------
`we_admin.py` polls for a reply after every command, which is right for a one-off
destructive operation and far too slow for a build with hundreds of fills -- the reply
rides a ~2s status push, so per-op verification costs minutes per hundred blocks placed.

This trades per-op confirmation for throughput, and buys the safety back two ways:
  * every operation goes through WorldEdit, so the WHOLE run is undoable with `//undo N`
  * the result is verified afterwards with block_census.mjs against expected counts

That is the correct trade for CONSTRUCTIVE work, where a wrong fill is re-cuttable. It
is NOT the right trade for demolition -- run destructive steps through we_admin.py, or
with --verify-each, so a refusal is caught before the next command compounds it.

Build file format (one op per line, blank lines and # comments ignored):

    # comment
    SET   x1 y1 z1 x2 y2 z2 <pattern>
    REPL  x1 y1 z1 x2 y2 z2 <mask> <pattern>
    CMD   <raw worldedit or server command>

`pattern` is full WorldEdit syntax, so weighted mixes work:
    SET -75 -12 -45 75 40 15 70%stone,20%mossy_cobblestone,10%andesite

Usage:
    build_runner.py FILE [--bot NAME] [--dry-run] [--verify-each] [--limit N]
"""
import argparse
import json
import sys
import time
import urllib.request

API = 'http://127.0.0.1:3001'


def say(bot, msg, timeout=15):
    req = urllib.request.Request(
        f'{API}/api/bots/{bot}/say',
        data=json.dumps({'message': msg}).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def replies_since(bot, since, timeout=15):
    with urllib.request.urlopen(f'{API}/api/bots/{bot}/server-messages?since={since}',
                                timeout=timeout) as r:
        return [m['text'] for m in json.load(r).get('messages', [])]


FAIL_MARKERS = ('not permitted', 'permission', 'denied', 'unknown command', 'incorrect',
                'invalid', 'make a region selection', 'too large', 'error', 'failed', 'cannot')


def check(bot, since, label):
    """Read back and classify. Returns (ok, texts)."""
    time.sleep(2.5)
    texts = replies_since(bot, since)
    ok = True
    for t in texts:
        low = t.lower()
        if 'block change limit set to' in low:
            continue
        if any(f in low for f in FAIL_MARKERS):
            ok = False
    if not texts:
        ok = False
    return ok, texts


def parse(path):
    ops = []
    for n, raw in enumerate(open(path), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        parts = line.split()
        kind = parts[0].upper()
        if kind == 'CMD':
            ops.append(('CMD', line[3:].strip(), n))
        elif kind == 'SET':
            box = parts[1:7]
            ops.append(('SET', (box, ' '.join(parts[7:])), n))
        elif kind == 'REPL':
            box = parts[1:7]
            ops.append(('REPL', (box, parts[7], ' '.join(parts[8:])), n))
        else:
            raise SystemExit(f'{path}:{n}: unknown op "{kind}"')
    return ops


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file')
    ap.add_argument('--bot', default='Architect')
    ap.add_argument('--dry-run', action='store_true')
    ap.add_argument('--verify-each', action='store_true',
                    help='read back every op (slow; use for destructive runs)')
    ap.add_argument('--limit', type=int, default=0, help='stop after N ops')
    ap.add_argument('--pace', type=float, default=0.45,
                    help='seconds between commands; too fast trips chat-spam kicks')
    a = ap.parse_args()

    ops = parse(a.file)
    if a.limit:
        ops = ops[:a.limit]
    print(f'{len(ops)} operations from {a.file}, bot={a.bot}'
          f'{" (DRY RUN)" if a.dry_run else ""}')

    if not a.dry_run:
        # Raise the change limit once. A stale `//limit 500` from an earlier session
        # would silently truncate large fills -- exactly the failure this run must not
        # have, because a truncated build looks like a finished one.
        say(a.bot, '//limit -1')
        time.sleep(2)

    done = failed = 0
    for kind, payload, lineno in ops:
        if kind == 'CMD':
            cmds = [payload]
        elif kind == 'SET':
            box, pattern = payload
            cmds = [f'//pos1 {box[0]},{box[1]},{box[2]}',
                    f'//pos2 {box[3]},{box[4]},{box[5]}',
                    f'//set {pattern}']
        else:
            box, mask, pattern = payload
            cmds = [f'//pos1 {box[0]},{box[1]},{box[2]}',
                    f'//pos2 {box[3]},{box[4]},{box[5]}',
                    f'//replace {mask} {pattern}']

        if a.dry_run:
            for c in cmds:
                print(f'  [{lineno}] {c}')
            done += 1
            continue

        since = int(time.time() * 1000) - 1
        for c in cmds:
            say(a.bot, c)
            time.sleep(a.pace)

        if a.verify_each:
            ok, texts = check(a.bot, since, f'line {lineno}')
            if ok:
                done += 1
            else:
                failed += 1
                print(f'  \033[31mFAIL\033[0m line {lineno}: {cmds[-1]}')
                for t in texts:
                    print(f'         {t}')
                print('  stopping — nothing further issued. `//undo` is available.')
                break
        else:
            done += 1
            if done % 20 == 0:
                print(f'  {done}/{len(ops)} …')

    print(f'\n{done} issued, {failed} failed')
    if not a.dry_run:
        print('Verify with block_census.mjs before trusting this. `//undo <n>` reverses it.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
