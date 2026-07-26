#!/usr/bin/env python3
"""Drive WorldEdit through an opped mineflayer bot, and READ THE REPLY.

Why this exists
---------------
Every bulk build operation on this world has gone through RCON `/fill`, which forced
three permanent workarounds:

  * `/fill` silently no-ops above 32,768 blocks, so every operation is hand-chunked
    (trap #3). The greenstone finish alone ran as 30 separate fills.
  * RCON writes only touch LOADED chunks, so every remote operation needs a manual
    `forceload add` / `forceload remove` dance (trap #7, write form).
  * There is no undo. Recovering the building a cleanup script destroyed took a
    bespoke snapshot diff-and-replay and four hours.
  * `/fill` takes exactly one block, so a speckled cavern finish is impossible; the
    Z-ROCK pass ended up one flat material per surface.

WorldEdit fixes all four -- but it needs a PLAYER to hold the selection session, and
the console has none. That is why the scripts fell back to `/fill` in the first place.

The resolution is that we already run five opped, player-shaped mineflayer bots.
A bot can hold a selection. Verified on this server 2026-07-26: the server console
logs `Architect issued server command: //pos1 -75,-12,-45`, and WorldEdit's reply
("Block change limit set to 1000.") comes back through
`GET /api/bots/:name/server-messages`.

Reading the reply is the whole point
------------------------------------
`POST /api/bots/:name/say` was write-only. A command that WorldGuard refused, or that
hit a change limit, looked exactly like one that succeeded. That is the same failure
shape as trap #7 and trap #10 -- a tool collapsing "I could not do it" into something
that reads as done -- and it is how this project's worst incidents happened. So every
operation here is issued, read back, and classified. On an unrecognised or empty reply
this tool FAILS LOUDLY rather than returning success.

Usage
-----
  we_admin.py select X1 Y1 Z1 X2 Y2 Z2      # set the selection by coordinate
  we_admin.py set "<pattern>"                # //set  (e.g. "70%stone,30%tuff")
  we_admin.py replace "<mask>" "<pattern>"   # //replace -- mask-scoped, like `fill ... replace`
  we_admin.py undo [n]                       # //undo
  we_admin.py size | limit <n> | cmd "<raw>" # inspection / escape hatch

  Common options: --bot NAME (default Architect), --api URL, --timeout SEC, --dry-run

Safety notes carried over from hard experience
----------------------------------------------
  * `//replace <mask> <pattern>` preserves the property this project relies on: it
    edits only the masked material, so pedestals, reservoirs and liners are spared
    without an exclusion list -- exactly as `fill ... replace andesite` did.
  * NEVER use `//fast`. It disables logging, so nothing run under it can be undone,
    which defeats the reason to use WorldEdit at all.
  * Selections are per-player session state. Use ONE dedicated bot and serialise
    operations through it, or a concurrent `//pos1` from another subsystem will
    clobber the selection mid-operation.
  * WorldGuard may refuse edits inside protected regions; the bot needs
    `worldedit.bypass` or membership. A refusal is reported, not swallowed.
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request

DEFAULT_API = 'http://127.0.0.1:3001'
DEFAULT_BOT = 'Architect'

# Replies that mean the operation did NOT do what was asked. Matched case-insensitively
# as substrings. Deliberately broad: a false alarm costs a re-read, a missed failure
# costs a silent no-op that gets mistaken for success.
FAILURE_MARKERS = (
    'you are not permitted',
    'permission',
    'denied',
    'no such',
    'unknown command',
    'incorrect argument',
    'invalid',
    'make a region selection',
    'first select',
    'too large',
    'max changed',
    'limit',            # "...exceeds your limit" -- see LIMIT_OK below
    'error',
    'exception',
    'failed',
    'cannot',
)
# Substrings that contain a failure marker but are actually fine.
LIMIT_OK = ('block change limit set to',)


def _post(api, bot, message, timeout):
    url = f'{api}/api/bots/{bot}/say'
    body = json.dumps({'message': message}).encode()
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def _read_since(api, bot, since, timeout):
    url = f'{api}/api/bots/{bot}/server-messages?since={since}'
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.load(r).get('messages', [])


def issue(api, bot, command, timeout=20, settle=12.0, dry_run=False):
    """Issue one WorldEdit command and return (replies, ok).

    Polls for the reply rather than sleeping a fixed interval, because the message
    ring buffer rides the status heartbeat and so arrives with a variable lag.
    """
    if dry_run:
        print(f'  DRY-RUN  {command}')
        return [], True

    since = int(time.time() * 1000) - 1
    _post(api, bot, command, timeout)

    replies, deadline = [], time.time() + settle
    while time.time() < deadline:
        time.sleep(1.5)
        replies = _read_since(api, bot, since, timeout)
        if replies:
            # Give a beat for a multi-line reply to finish arriving.
            time.sleep(1.5)
            replies = _read_since(api, bot, since, timeout)
            break

    ok = True
    if not replies:
        # Silence is NOT success. Some commands are quiet, but we cannot distinguish
        # "quiet success" from "never arrived", so we refuse to guess.
        ok = False
    for m in replies:
        low = m['text'].lower()
        if any(good in low for good in LIMIT_OK):
            continue
        if any(bad in low for bad in FAILURE_MARKERS):
            ok = False

    print(f'  > {command}')
    for m in replies:
        print(f'    {m["text"]}')
    if not replies:
        print('    (no reply captured -- treated as FAILURE, see module docstring)')
    return replies, ok


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument('--bot', default=DEFAULT_BOT)
    p.add_argument('--api', default=DEFAULT_API)
    p.add_argument('--timeout', type=float, default=20)
    p.add_argument('--settle', type=float, default=12.0, help='seconds to wait for a reply')
    p.add_argument('--dry-run', action='store_true')
    sub = p.add_subparsers(dest='action', required=True)

    s = sub.add_parser('select', help='set selection by explicit coordinates')
    s.add_argument('coords', nargs=6, type=int, metavar=('X1', 'Y1', 'Z1', 'X2', 'Y2', 'Z2'))

    st = sub.add_parser('set', help='//set <pattern>')
    st.add_argument('pattern')

    rp = sub.add_parser('replace', help='//replace <mask> <pattern> (mask-scoped)')
    rp.add_argument('mask')
    rp.add_argument('pattern')

    ud = sub.add_parser('undo', help='//undo [n]')
    ud.add_argument('n', nargs='?', default=None)

    sub.add_parser('size', help='//size')

    lm = sub.add_parser('limit', help='//limit <n> (-1 for unlimited)')
    lm.add_argument('n')

    cm = sub.add_parser('cmd', help='raw command escape hatch')
    cm.add_argument('raw')

    a = p.parse_args()
    kw = dict(timeout=a.timeout, settle=a.settle, dry_run=a.dry_run)

    if a.action == 'select':
        x1, y1, z1, x2, y2, z2 = a.coords
        cmds = [f'//pos1 {x1},{y1},{z1}', f'//pos2 {x2},{y2},{z2}', '//size']
    elif a.action == 'set':
        cmds = [f'//set {a.pattern}']
    elif a.action == 'replace':
        cmds = [f'//replace {a.mask} {a.pattern}']
    elif a.action == 'undo':
        cmds = [f'//undo {a.n}' if a.n else '//undo']
    elif a.action == 'size':
        cmds = ['//size']
    elif a.action == 'limit':
        cmds = [f'//limit {a.n}']
    else:
        cmds = [a.raw]

    print(f'bot={a.bot}')
    all_ok = True
    for c in cmds:
        _, ok = issue(a.api, a.bot, c, **kw)
        if not ok:
            all_ok = False
            print(f'  !! FAILED -- stopping. Nothing further was issued.')
            break

    print('OK' if all_ok else 'FAILED')
    return 0 if all_ok else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except urllib.error.URLError as e:
        print(f'API unreachable: {e}', file=sys.stderr)
        sys.exit(2)
