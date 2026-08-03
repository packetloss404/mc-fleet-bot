#!/usr/bin/env python3
"""Pull a read-only snapshot of the Paper world's region files to this host.

Flushes the server world to disk (RCON `save-all flush`, read-only w.r.t. the world)
then SFTPs region files into a local cache, skipping files whose size+mtime already
match. Feeds scripts/world_render.mjs.

Usage:
  python3 scripts/world_snapshot.py                      # all regions of the overworld
  python3 scripts/world_snapshot.py --near -85,-375 --radius 400
  python3 scripts/world_snapshot.py --dim world_nether --dest /tmp/nether
"""
import argparse, importlib.util, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('mc_admin_lib', os.path.join(HERE, 'mc_admin.py'))
mc = importlib.util.module_from_spec(spec)
sys.modules['mc_admin_lib'] = mc
_src = open(os.path.join(HERE, 'mc_admin.py')).read()
_ns = {'__name__': 'mc_admin_lib'}
exec(compile(_src, 'mc_admin.py', 'exec'), _ns)

ap = argparse.ArgumentParser()
ap.add_argument('--dest', default=os.path.join(HERE, '..', 'data', 'worldsnap'))
ap.add_argument('--dim', default='world')
ap.add_argument('--near', help='x,z centre — only pull regions covering this area')
ap.add_argument('--radius', type=int, default=512)
ap.add_argument('--no-flush', action='store_true')
args = ap.parse_args()

dest = os.path.abspath(os.path.join(args.dest, 'region'))
os.makedirs(dest, exist_ok=True)

wanted = None
if args.near:
    cx, cz = (int(v) for v in args.near.split(','))
    r = args.radius
    wanted = set()
    for rx in range(math.floor((cx - r) / 512), math.floor((cx + r) / 512) + 1):
        for rz in range(math.floor((cz - r) / 512), math.floor((cz + r) / 512) + 1):
            wanted.add(f'r.{rx}.{rz}.mca')

cli = _ns['connect']()
if not args.no_flush:
    rc = _ns['Rcon'](cli)
    print('rcon save-all flush ->', rc.cmd('save-all flush').strip())
    time.sleep(1.5)

sftp = cli.open_sftp()
rdir = f"{_ns['SERVER_DIR']}/{args.dim}/region"
pulled = skipped = 0
for name in sorted(sftp.listdir(rdir)):
    if not name.endswith('.mca'):
        continue
    if wanted is not None and name not in wanted:
        continue
    st = sftp.stat(f'{rdir}/{name}')
    lp = os.path.join(dest, name)
    if os.path.exists(lp):
        ls = os.stat(lp)
        if ls.st_size == st.st_size and int(ls.st_mtime) == int(st.st_mtime):
            skipped += 1
            continue
    sftp.get(f'{rdir}/{name}', lp)
    os.utime(lp, (st.st_atime, st.st_mtime))
    pulled += 1
    print(f'  pulled {name} ({st.st_size} bytes)')
sftp.close()
cli.close()
print(f'snapshot dir: {dest}  (pulled {pulled}, unchanged {skipped})')
