#!/usr/bin/env python3
"""
mc_look.py — "stand at (x,y,z), look at T, and give me a PNG I can actually open."

WHAT THIS IS FOR
    The operator wants to say "go to (-85, 85, -360) and look at the Town Hall" and
    have an image land on THIS host's filesystem so Claude can read it. That is the
    whole product: a real .png at a known path, with its size and dimensions printed,
    plus a loud failure if the picture is empty.

WHY THE OFFLINE (REGION-FILE) ROUTE AND NOT prismarine-viewer
    Two routes were prototyped. Both can produce a PNG. This script wraps the offline
    one, because the live-viewer route fails at exactly the thing being asked for:
      * prismarine-viewer only holds ~96 blocks (viewDistance 6, hardcoded by omission
        in src/worker/botWorker.ts) around the ONE bot whose port you use, so
        "look at (x,y,z)" first requires teleporting a bot there and re-reading its
        drifting position. This script never touches a bot, so there is nothing to
        restore and no fleet interference.
      * prismarine-viewer 1.33 ships assets only up to 1.21.4 while the server is
        1.21.11, so every newer block renders as a white "?" cube — facades of real
        MSA buildings came out as missing-texture noise.
      * it needs a headless Chrome + a ~190 MB pile of hand-extracted .debs that lives
        in a session-scoped scratchpad, and a camera hook that reaches into the
        viewer's webpack internals (breaks on any viewer upgrade).
    The offline route needs nothing that is not already in this repo: prismarine-nbt
    and canvas from node_modules, node's zlib, paramiko for RCON/SFTP. It also renders
    the world the SERVER believes in (verified 13/13 against `execute if block`), at
    any distance, from any eye point, with no view-distance cap.

    Honest cost of that choice, so the images are not over-read:
      * every block is a flat colour from a hand table — no textures, no signs;
      * stairs/slabs/fences/panes/doors render as FULL CUBES;
      * no entities (no bots, no mobs), no torch light, no time of day, no biome tint;
      * it is a SNAPSHOT: `save-all flush` runs first, but anything a bot places after
        the flush is invisible.

WHY PYTHON DRIVING NODE
    The three jobs that need care here — RCON, SFTP, and force-load bookkeeping — all
    already exist in python (scripts/mc_admin.py, scripts/world_snapshot.py) and the
    operator tooling in this repo is python (scripts/rr_*.py). The raycaster has to be
    node: it casts ~1M rays and pure python without numpy would take minutes.
    So this is a python front door over scripts/world_render.mjs.

USAGE
    python3 scripts/mc_look.py --at -85 85 -360 --facing -85 74 -375
    python3 scripts/mc_look.py --at 0 95 100 --facing 0 76 128 --out /tmp/msa.png
    python3 scripts/mc_look.py --at 0 90 128 --yaw 180 --pitch 25 --dist 200
    python3 scripts/mc_look.py --at -85 70 -340 --facing -85 70 -400 --auto   # eye -> ground+1.62
    python3 scripts/mc_look.py --at -85 85 -360 --facing -85 74 -375 --no-refresh  # reuse snapshot

EXIT CODES
    0  a PNG was written and it passed the not-blank checks
    2  a PNG was written but it is blank / empty sky — treat the result as NO IMAGE
    3  the render or a prerequisite failed; no usable PNG

GUARDS, AND THE FAILURE EACH ONE EXISTS TO PREVENT
    * Force-load bookkeeping. The operator has ~281 chunks force-loaded for other
      work. `forceload remove all` would silently destroy that. So: query first,
      add ONLY chunks that are (a) absent from the local region snapshot and (b) not
      already force-loaded by someone else, remember exactly what we added, and remove
      exactly that set in a finally: block. We never remove a chunk we did not add.
    * Comma coordinates. world_snapshot.py taught this one: argparse rejects
      `--near -85,-375` because a token starting with '-' that is not a plain negative
      number looks like an option. This script rewrites `-85,85,-360` into three
      tokens before argparse sees it, so both `--at -85 85 -360` and
      `--at -85,85,-360` work instead of dying with "expected at least one argument".
    * Blank-image detection. The renderer happily produces a beautiful empty sky
      gradient when the chunks are not on disk — it looks like a successful render and
      it is worthless. Three independent cheap checks run on the finished PNG
      (rays-hit ratio from the renderer, luminance stddev, and the fraction of
      sky/fog-blue pixels), and any one of them tripping makes this script say BLANK
      and exit 2 rather than handing back a pretty nothing.
    * Eye inside geometry. A camera embedded in a wall renders one flat colour. That
      trips the stddev check (so you are told), and `--auto` snaps the eye to standing
      height on the ground in that column.
    * No PIL on this host. The blank check is done with node + canvas (both verified
      present) rather than pretending `import PIL` will work. If node cannot run the
      check we say the check did not run; we never report "not blank" without looking.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
RENDERER = os.path.join(HERE, 'world_render.mjs')
SNAPSHOT_TOOL = os.path.join(HERE, 'world_snapshot.py')
DEFAULT_REGIONS = os.path.join(REPO, 'data', 'worldsnap', 'region')

sys.path.insert(0, HERE)

# ---------------------------------------------------------------- region files


def region_path(regions: str, cx: int, cz: int) -> str:
    return os.path.join(regions, f'r.{cx >> 5}.{cz >> 5}.mca')


def chunk_on_disk(regions: str, cx: int, cz: int) -> bool:
    """True if the snapshot's region file actually contains chunk (cx, cz).

    Reads only the 4 KiB sector-offset header. A zero offset means "never written",
    which is the difference between "the build is missing" and "we never looked" —
    the same distinction mc_admin.classify_probe exists to preserve.
    """
    p = region_path(regions, cx, cz)
    try:
        with open(p, 'rb') as fh:
            head = fh.read(4096)
    except OSError:
        return False
    if len(head) < 4096:
        return False
    i = ((cx & 31) + (cz & 31) * 32) * 4
    off = (head[i] << 16) | (head[i + 1] << 8) | head[i + 2]
    return off != 0 and head[i + 3] != 0


def chunk_box(x: float, z: float, radius: int):
    """Chunk coords covering a square of `radius` blocks around a column."""
    out = set()
    for bx in range(int(x - radius) >> 4, (int(x + radius) >> 4) + 1):
        for bz in range(int(z - radius) >> 4, (int(z + radius) >> 4) + 1):
            out.add((bx, bz))
    return out


# ---------------------------------------------------------------- forceload


FORCELOAD_RE = re.compile(r'\[\s*(-?\d+)\s*,\s*(-?\d+)\s*\]')


def forceload_query(rcon) -> set:
    """Set of (cx, cz) currently force-loaded in the overworld.

    Parsed rather than assumed: this set is what protects the operator's ~281
    pre-existing force-loaded chunks from being removed by our cleanup.
    """
    reply = rcon.cmd('forceload query')
    if 'no chunks' in reply.lower():
        return set()
    return {(int(a), int(b)) for a, b in FORCELOAD_RE.findall(reply)}


# ---------------------------------------------------------------- blank check


# Runs in node because canvas is installed and PIL is not. Ignores the bottom 26 px,
# which is the renderer's own HUD strip (it would otherwise add fake colour variety
# to an image that is genuinely empty).
STATS_JS = r'''
const { loadImage, createCanvas } = require('canvas');
const p = process.argv[1];
loadImage(p).then((img) => {
  const w = img.width, h = img.height;
  const cv = createCanvas(w, h), ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  const hudRows = 26;
  let n = 0, sum = 0, sum2 = 0, sky = 0;
  const buckets = new Set();
  for (let y = 0; y < Math.max(1, h - hudRows); y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4, r = d[o], g = d[o + 1], b = d[o + 2];
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += l; sum2 += l * l; n++;
      buckets.add(((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4));
      if (b > 170 && b > r + 12 && b >= g) sky++;
    }
  }
  const mean = sum / n, sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  console.log(JSON.stringify({
    w, h, sampled: n,
    mean: +mean.toFixed(2), stddev: +sd.toFixed(2),
    colors: buckets.size, sky_frac: +(sky / n).toFixed(4)
  }));
}).catch((e) => { console.error('STATS_FAIL ' + e.message); process.exit(1); });
'''


def png_stats(path: str):
    r = subprocess.run(['node', '-e', STATS_JS, path], cwd=REPO,
                       capture_output=True, text=True)
    if r.returncode != 0:
        return None, (r.stderr or r.stdout).strip()
    try:
        return json.loads(r.stdout.strip()), None
    except json.JSONDecodeError as e:
        return None, f'unparsable stats output: {e}: {r.stdout[:200]!r}'


# ---------------------------------------------------------------- args


COORD_TOKEN = re.compile(r'^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?)+$')


def normalise_argv(argv):
    """Split `-85,85,-360` into three tokens before argparse can mistake it for a flag."""
    out = []
    for tok in argv:
        out.extend(tok.split(',') if COORD_TOKEN.match(tok) else [tok])
    return out


def triple(vals, what):
    nums = []
    for v in vals:
        try:
            nums.append(float(v))
        except ValueError:
            raise SystemExit(f'{what}: not a number: {v!r}')
    if len(nums) != 3:
        raise SystemExit(f'{what}: need exactly 3 numbers (x y z), got {len(nums)}: {vals}')
    return nums


def main(argv) -> int:
    ap = argparse.ArgumentParser(
        prog='mc_look.py',
        description='Render a PNG of the Minecraft world from an arbitrary eye point.',
        epilog='Coordinates accept "--at -85 85 -360" or "--at -85,85,-360".')
    ap.add_argument('--at', nargs='+', required=True, metavar='N',
                    help='eye position x y z (where you stand)')
    ap.add_argument('--facing', nargs='+', metavar='N',
                    help='look-at target x y z (mutually exclusive with --yaw/--pitch)')
    ap.add_argument('--yaw', type=float, help='MC yaw in degrees (0=+Z south, 180=-Z north)')
    ap.add_argument('--pitch', type=float, help='MC pitch in degrees (positive looks down)')
    ap.add_argument('--out', help='output PNG path (default data/looks/look_<coords>_<ts>.png)')
    ap.add_argument('--w', type=int, default=1280)
    ap.add_argument('--h', type=int, default=720)
    ap.add_argument('--fov', type=float, default=70.0)
    ap.add_argument('--dist', type=int, default=192, help='draw distance in blocks (default 192)')
    ap.add_argument('--ymin', type=int, help='bottom of the loaded volume (default eye-96)')
    ap.add_argument('--ymax', type=int, help='top of the loaded volume (default eye+96)')
    ap.add_argument('--shadows', action='store_true', default=True)
    ap.add_argument('--no-shadows', dest='shadows', action='store_false')
    ap.add_argument('--auto', action='store_true',
                    help='snap the eye down to ground+1.62 in its column (fixes "camera '
                         'inside a wall", which renders as one flat colour)')
    ap.add_argument('--regions', default=DEFAULT_REGIONS, help='region snapshot dir')
    ap.add_argument('--no-refresh', action='store_true',
                    help='skip the save-all flush + SFTP pull and use the snapshot as-is')
    ap.add_argument('--no-forceload', action='store_true',
                    help='never force-load; just report chunks missing from the snapshot')
    ap.add_argument('--ensure', type=int, default=64, metavar='BLOCKS',
                    help='radius around the eye and the target whose chunks must exist '
                         'on disk before rendering (default 64)')
    ap.add_argument('--gen-wait', type=float, default=6.0,
                    help='seconds to let the server load/generate force-loaded chunks')
    args = ap.parse_args(normalise_argv(argv))

    eye = triple(args.at, '--at')
    look = triple(args.facing, '--facing') if args.facing else None
    if look is None and args.yaw is None and args.pitch is None:
        raise SystemExit('give either --facing X Y Z or --yaw/--pitch')
    if look is not None and (args.yaw is not None or args.pitch is not None):
        raise SystemExit('--facing and --yaw/--pitch are mutually exclusive')

    if not os.path.exists(RENDERER):
        print(f'FAIL: renderer missing: {RENDERER}', file=sys.stderr)
        print('      mc_look.py is a front door over scripts/world_render.mjs; '
              'without it there is nothing to render with.', file=sys.stderr)
        return 3

    out = args.out
    if not out:
        stamp = time.strftime('%Y%m%d-%H%M%S')
        tag = f'{int(eye[0])}_{int(eye[1])}_{int(eye[2])}'
        out = os.path.join(REPO, 'data', 'looks', f'look_{tag}_{stamp}.png')
    out = os.path.abspath(out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    os.makedirs(args.regions, exist_ok=True)

    # ---- 1. refresh the snapshot (read-only on the server: save-all flush + SFTP get)
    # world_snapshot.py appends 'region' to its --dest, so the snapshot it writes and
    # the dir we read MUST be derived from one another; otherwise --regions silently
    # points somewhere the refresh never touches and every chunk looks missing forever.
    snap_dest = os.path.dirname(os.path.abspath(args.regions))
    snap_radius = max(args.dist + 32, args.ensure + 32)

    if not args.no_refresh:
        radius = snap_radius
        cmd = ['python3', SNAPSHOT_TOOL, '--dest', snap_dest,
               f'--near={int(eye[0])},{int(eye[2])}', '--radius', str(radius)]
        print('[1/4] refreshing world snapshot:', ' '.join(cmd))
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
        sys.stdout.write(''.join('      ' + l + '\n' for l in r.stdout.splitlines()))
        if r.returncode != 0:
            print('      snapshot refresh FAILED:', r.stderr.strip()[-500:], file=sys.stderr)
            print('      continuing with whatever is already on disk (may be stale)',
                  file=sys.stderr)
    else:
        print('[1/4] --no-refresh: using existing snapshot', args.regions)

    # ---- 2. make sure the chunks we care about are actually on disk
    want = chunk_box(eye[0], eye[2], args.ensure)
    if look is not None:
        want |= chunk_box(look[0], look[2], args.ensure)
    missing = sorted(c for c in want if not chunk_on_disk(args.regions, *c))
    print(f'[2/4] chunk check: {len(want) - len(missing)}/{len(want)} present on disk'
          f'{"" if not missing else f", missing {len(missing)}"}')

    added = []          # chunks WE force-loaded; the only ones we may ever remove
    mc = None
    try:
        if missing and not args.no_forceload:
            import mc_admin as mc_mod
            mc = mc_mod
            cli = mc.connect()
            try:
                rc = mc.Rcon(cli)
                already = forceload_query(rc)
                print(f'      {len(already)} chunks are already force-loaded by others '
                      f'— those are never touched')
                for cx, cz in missing:
                    if (cx, cz) in already:
                        continue          # someone else owns it; leave their entry alone
                    rc.cmd(f'forceload add {cx * 16} {cz * 16}')
                    added.append((cx, cz))
                print(f'      force-loaded {len(added)} chunk(s) to make the server '
                      f'load/generate them')
                if added:
                    time.sleep(args.gen_wait)
                    print('      rcon save-all flush ->',
                          rc.cmd('save-all flush').strip()[:120])
                    time.sleep(1.5)
            finally:
                cli.close()
            # re-pull so the freshly loaded chunks reach our snapshot
            subprocess.run(['python3', SNAPSHOT_TOOL, '--no-flush', '--dest', snap_dest,
                            f'--near={int(eye[0])},{int(eye[2])}',
                            '--radius', str(snap_radius)],
                           cwd=REPO, capture_output=True, text=True)
            still = [c for c in missing if not chunk_on_disk(args.regions, *c)]
            if still:
                print(f'      WARNING: {len(still)} chunk(s) still absent after force-load, '
                      f'e.g. {still[:4]} — that part of the view will be sky')
        elif missing:
            print('      --no-forceload: leaving them missing; expect holes/sky in the view')

        # ---- 3. render
        cmd = ['node', RENDERER, '--regions', args.regions, '--mode', 'persp',
               f'--eye={eye[0]},{eye[1]},{eye[2]}',
               '--w', str(args.w), '--h', str(args.h),
               '--fov', str(args.fov), '--dist', str(args.dist),
               '--out', out]
        if look is not None:
            cmd.append(f'--look={look[0]},{look[1]},{look[2]}')
        else:
            cmd += ['--yaw', str(args.yaw if args.yaw is not None else 180.0),
                    '--pitch', str(args.pitch if args.pitch is not None else 0.0)]
        if args.ymin is not None:
            cmd += ['--ymin', str(args.ymin)]
        if args.ymax is not None:
            cmd += ['--ymax', str(args.ymax)]
        if args.shadows:
            cmd += ['--shadows', '1']
        if args.auto:
            cmd += ['--auto', '1']
        print('[3/4] rendering:', ' '.join(cmd))
        t0 = time.time()
        r = subprocess.run(cmd, cwd=REPO, capture_output=True, text=True)
        log = (r.stderr or '') + (r.stdout or '')
        for line in log.splitlines():
            if line.strip() and not line.strip().startswith('row '):
                print('      ' + line.rstrip())
        if r.returncode != 0 or not os.path.exists(out):
            print(f'FAIL: renderer exited {r.returncode} and produced no usable PNG',
                  file=sys.stderr)
            return 3
        took = time.time() - t0
    finally:
        # ---- always give back exactly what we took, even on exception
        if added:
            try:
                if mc is None:
                    import mc_admin as mc
                cli = mc.connect()
                try:
                    rc = mc.Rcon(cli)
                    for cx, cz in added:
                        rc.cmd(f'forceload remove {cx * 16} {cz * 16}')
                    left = forceload_query(rc)
                    print(f'      released {len(added)} force-loaded chunk(s); '
                          f'{len(left)} remain (not ours)')
                finally:
                    cli.close()
            except Exception as e:                                  # noqa: BLE001
                print(f'WARNING: could not release {len(added)} force-loaded chunk(s): {e}\n'
                      f'         run manually: ' +
                      '; '.join(f'forceload remove {cx * 16} {cz * 16}' for cx, cz in added),
                      file=sys.stderr)

    # ---- 4. is the image actually an image?
    size = os.path.getsize(out)
    stats, err = png_stats(out)
    hit_m = re.search(r'rays hit=(\d+)', log)
    hits = int(hit_m.group(1)) if hit_m else None
    hit_ratio = (hits / float(args.w * args.h)) if hits is not None else None
    loaded_m = re.search(r'chunks loaded=(\d+) missing=(\d+)', log)

    print('[4/4] verdict')
    print(f'      path       : {out}')
    print(f'      bytes      : {size}')
    if stats:
        print(f'      dimensions : {stats["w"]}x{stats["h"]}')
        print(f'      mean lum   : {stats["mean"]}   stddev: {stats["stddev"]}')
        print(f'      colours    : {stats["colors"]} distinct 12-bit buckets')
        print(f'      sky-blue   : {stats["sky_frac"] * 100:.1f}% of pixels')
    else:
        print(f'      dimensions : UNKNOWN — blank check could not run: {err}')
    if hit_ratio is not None:
        print(f'      ray hits   : {hits} ({hit_ratio:.2f} per pixel)')
    if loaded_m:
        print(f'      chunks     : loaded {loaded_m.group(1)}, missing {loaded_m.group(2)}'
              f' (missing = ungenerated or not in the snapshot; renders as sky)')
    print(f'      render time: {took:.1f}s')

    reasons = []
    if stats is None:
        reasons.append('the blank check could not run, so nothing here is verified')
    else:
        if stats['stddev'] < 4.0:
            reasons.append(f'luminance stddev {stats["stddev"]} < 4 — flat image '
                           f'(camera inside a block, or nothing loaded)')
        if stats['colors'] < 12:
            reasons.append(f'only {stats["colors"]} distinct colour buckets')
        if stats['sky_frac'] > 0.97:
            reasons.append(f'{stats["sky_frac"] * 100:.1f}% of pixels are sky/fog blue — '
                           f'the view is empty')
    if hit_ratio is not None and hit_ratio < 0.03:
        reasons.append(f'only {hit_ratio:.4f} ray hits per pixel — the rays hit nothing, '
                       f'so the chunks are not on disk or the aim is at open sky')

    if reasons:
        print('\nBLANK / UNUSABLE IMAGE — do not treat this as a successful capture:',
              file=sys.stderr)
        for why in reasons:
            print('  * ' + why, file=sys.stderr)
        print('  fixes: check --at is above ground (try --auto), aim --facing at solid\n'
              '         geometry, raise --dist, or drop --no-refresh so the snapshot is fresh',
              file=sys.stderr)
        return 2

    print('\nOK: image looks populated (stddev, colour count, sky fraction and ray hits '
          'all sane).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
