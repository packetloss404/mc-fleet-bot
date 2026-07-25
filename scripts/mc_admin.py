#!/usr/bin/env python3
"""Durable RCON / server-admin tool for the mc-fleet-bot Paper server.

Connects to the target server over in-process SSH (paramiko) and speaks the RCON
protocol through a direct-tcpip channel to the server's localhost RCON port, so it
works even though RCON is bound to localhost on the remote box. All credentials are
read from /opt/stacks/mc-fleet-bot/.env — never passed on the command line.

Usage:
  python3 scripts/mc_admin.py rcon "<cmd>" ["<cmd2>" ...]     # run RCON command(s)
  python3 scripts/mc_admin.py get-difficulty                  # read-only
  python3 scripts/mc_admin.py set-difficulty <level>          # RCON + persist server.properties
  python3 scripts/mc_admin.py probe <x> <y> <z> [<id> ...]    # is-air / matches block id(s)

Env keys used: MC_SERVER_HOST, MC_SERVER_SSH_USER, MC_SERVER_SSH_PASS,
               MC_RCON_PASSWORD, MC_RCON_PORT   (optional: MC_SERVER_DIR)
"""
import struct, sys, paramiko

ENV_PATH = '/opt/stacks/mc-fleet-bot/.env'
DEFAULT_SERVER_DIR = '/opt/packetcraft/paper-server'

def load_env(p=ENV_PATH):
    d = {}
    for line in open(p):
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, v = line.split('=', 1)
            d[k] = v.strip().strip('"').strip("'")
    return d

E = load_env()
SERVER_DIR = E.get('MC_SERVER_DIR', DEFAULT_SERVER_DIR)

def connect():
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(E['MC_SERVER_HOST'], username=E['MC_SERVER_SSH_USER'],
                password=E['MC_SERVER_SSH_PASS'], timeout=15)
    return cli

class Rcon:
    def __init__(self, cli):
        self.chan = cli.get_transport().open_channel(
            'direct-tcpip', ('127.0.0.1', int(E['MC_RCON_PORT'])), ('127.0.0.1', 0))
        self.chan.send(self._pkt(1, 3, E['MC_RCON_PASSWORD']))
        if self._read()[0] == -1:
            raise SystemExit('RCON AUTH_FAILED')
    @staticmethod
    def _pkt(i, tp, body):
        p = struct.pack('<ii', i, tp) + body.encode() + b'\x00\x00'
        return struct.pack('<i', len(p)) + p
    def _read(self):
        raw = b''
        while len(raw) < 4:
            raw += self.chan.recv(4 - len(raw))
        n = struct.unpack('<i', raw)[0]
        data = b''
        while len(data) < n:
            data += self.chan.recv(n - len(data))
        return struct.unpack('<ii', data[:8])[0], data[8:-2].decode('utf-8', 'replace')
    def cmd(self, s):
        self.chan.send(self._pkt(2, 2, s))
        return self._read()[1]

def classify_probe(reply):
    """Three-state probe result: MATCH / no / NOT-LOADED.

    This used to be two-state (`"MATCH" if "passed" in reply else "no"`), which
    silently folded the server's "That position is not loaded" reply into "no" —
    i.e. an UNVERIFIABLE point was reported as a NEGATIVE one. That is the whole
    mechanism behind the long-standing belief that probes "report FAIL in
    non-force-loaded areas": the game distinguishes the two cases perfectly well,
    the tool was discarding the distinction. It cost a documented amount of
    debugging (see HANDOFF trap #7) and it invalidates any survey that swept an
    area without force-loading it first — absence of a block and inability to look
    are not the same finding.

    Returns one of:
      'MATCH'      - the block matches the queried id
      'no'         - the position is loaded and does NOT match
      'NOT-LOADED' - the position could not be read; this is NOT evidence
    """
    low = reply.lower()
    if 'not loaded' in low or 'is not loaded' in low:
        return 'NOT-LOADED'
    if 'passed' in low:
        return 'MATCH'
    if 'failed' in low:
        return 'no'
    # Anything else (unknown block id, malformed selector, permission error) is a
    # tool/query problem, not a fact about the world — surface it verbatim.
    return f'ERROR: {reply.strip()}'


def main(argv):
    if not argv:
        print(__doc__); return 1
    action, rest = argv[0], argv[1:]
    cli = connect()
    try:
        if action == 'rcon':
            r = Rcon(cli)
            for c in rest:
                print(f'> {c}\n{r.cmd(c)}')
        elif action == 'get-difficulty':
            r = Rcon(cli)
            print(r.cmd('difficulty'))
        elif action == 'set-difficulty':
            level = rest[0]
            r = Rcon(cli)
            print('before:', r.cmd('difficulty'))
            print('set   :', r.cmd(f'difficulty {level}'))
            print('after :', r.cmd('difficulty'))
            prop = f'{SERVER_DIR}/server.properties'
            _, o, _ = cli.exec_command(
                f"cp -n {prop} {prop}.bak.mcadmin 2>/dev/null; "
                f"sed -i 's/^difficulty=.*/difficulty={level}/' {prop} && grep -n '^difficulty=' {prop}")
            print('server.properties persisted:', o.read().decode().strip())
        elif action == 'probe':
            x, y, z = rest[0], rest[1], rest[2]
            ids = rest[3:] or ['air']
            r = Rcon(cli)
            for bid in ids:
                res = r.cmd(f'execute if block {x} {y} {z} minecraft:{bid}')
                print(f'{bid}: {classify_probe(res)}')
        else:
            print(f'unknown action: {action}\n{__doc__}'); return 1
    finally:
        cli.close()
    return 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
