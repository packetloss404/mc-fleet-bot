#!/usr/bin/env python3
"""Terrain survey for the worker settlement, NORTH of the build envelope.

North = -Z per the MSA site plan compass. The MSA/Raven Rock envelope owns
x,z in [-300,+300], so we survey z <= -310.

Reuses scripts/mc_admin.py's SSH+RCON channel so the whole grid runs in ONE
session. Read-only: every command is 'execute if block ... run time query
gametime', which mutates nothing.

Surface height per column is found by binary search on "is air", then the
surface block is classified (water / tree / other) with block tags.
"""
import sys, json
sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin

Y_LO, Y_HI = 40, 130          # search bracket; assume solid at Y_LO, air at Y_HI

def passed(res):
    # 'execute if ...' with a run clause returns non-empty output on match,
    # and "Test failed" / empty on no match.
    return bool(res) and 'failed' not in res.lower() and 'error' not in res.lower()

class Probe:
    def __init__(self, rcon):
        self.r = rcon
        self.n = 0
    def is_air(self, x, y, z):
        self.n += 1
        return passed(self.r.cmd(
            f'execute if block {x} {y} {z} minecraft:air run time query gametime'))
    def matches(self, x, y, z, spec):
        self.n += 1
        return passed(self.r.cmd(
            f'execute if block {x} {y} {z} {spec} run time query gametime'))
    def surface(self, x, z):
        """Highest y with a non-air block, via binary search."""
        if not self.is_air(x, Y_HI, z):
            return None                      # bracket violated (very tall terrain)
        lo, hi = Y_LO, Y_HI
        if self.is_air(x, lo, z):
            return None                      # air at the floor: cave/void column
        while hi - lo > 1:
            mid = (lo + hi) // 2
            if self.is_air(x, mid, z):
                hi = mid
            else:
                lo = mid
        return lo

def main():
    xs = list(range(-160, -39, 15))
    zs = list(range(-330, -421, -15))
    cli = mc_admin.connect()
    try:
        r = mc_admin.Rcon(cli)
        p = Probe(r)
        grid = {}
        for z in zs:
            for x in xs:
                y = p.surface(x, z)
                if y is None:
                    grid[(x, z)] = {'y': None, 'kind': 'unknown'}
                    continue
                if p.matches(x, y, z, '#minecraft:leaves') or \
                   p.matches(x, y, z, '#minecraft:logs'):
                    kind = 'tree'
                elif p.matches(x, y, z, 'minecraft:water'):
                    kind = 'water'
                else:
                    kind = 'ground'
                grid[(x, z)] = {'y': y, 'kind': kind}
            done = sum(1 for k in grid if k[1] == z)
            print(f'row z={z}: {done} cols, {p.n} probes so far', flush=True)

        print('\n=== HEIGHTMAP (rows = z north->south, cols = x west->east) ===')
        print('      ' + ''.join(f'{x:>7}' for x in xs))
        for z in zs:
            cells = []
            for x in xs:
                c = grid[(x, z)]
                tag = {'water': 'W', 'tree': 'T', 'unknown': '?'}.get(c['kind'], '')
                cells.append(f"{c['y'] if c['y'] is not None else '--'}{tag}".rjust(7))
            print(f'{z:>6}' + ''.join(cells))

        out = [{'x': x, 'z': z, **grid[(x, z)]} for x in xs for z in zs]
        with open('/tmp/claude-1000/-opt-stacks-mc-fleet-bot/'
                  '3a7e3225-be33-461e-b5da-e3a67ec561b6/scratchpad/north_fine.json', 'w') as f:
            json.dump(out, f, indent=1)
        print(f'\ntotal probes: {p.n}')
    finally:
        cli.close()

if __name__ == '__main__':
    main()
