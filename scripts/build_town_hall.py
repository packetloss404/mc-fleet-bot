#!/usr/bin/env python3
"""Hand-build the Worker Town Hall at (-85, 67, -375).

Style: medieval-communal (stone-brick base, timber frame, gabled spruce roof) --
matching the stylePreset the town will be founded with, so anything the TownBrain
later designs sits beside it coherently.

Hall  : 25 wide (x) x 13 deep (z), walls y68-73, gabled roof ridge at y80.
Plaza : 41 x 41 pad levelled to y67, centred on the hall.
Door  : south face, facing the grove and the route to MSA.

Every /fill is volume-checked and split if it would exceed the server cap.
"""
import sys
sys.path.insert(0, '/opt/stacks/mc-fleet-bot/scripts')
import mc_admin

CX, CZ, PAD_Y = -85, -375, 67
PAD_X0, PAD_X1 = CX - 20, CX + 20          # 41 wide
PAD_Z0, PAD_Z1 = CZ - 20, CZ + 20
HX0, HX1 = CX - 12, CX + 12                # hall 25 wide
HZ0, HZ1 = CZ - 6,  CZ + 6                 # hall 13 deep
WALL_Y0, WALL_Y1 = PAD_Y + 1, PAD_Y + 6    # y68..y73
ROOF_Y0 = PAD_Y + 7                        # y74
MAXVOL = 30000

def passed(res):
    return bool(res) and 'failed' not in res.lower() and 'error' not in res.lower()

class B:
    def __init__(self, r): self.r = r; self.n = 0
    def c(self, s):
        self.n += 1
        return self.r.cmd(s)
    def fill(self, x0, y0, z0, x1, y1, z1, block, mode=''):
        """Volume-checked fill; splits along y then z if over the cap."""
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1))
        vol = (x1-x0+1) * (y1-y0+1) * (z1-z0+1)
        if vol <= MAXVOL:
            return self.c(f'fill {x0} {y0} {z0} {x1} {y1} {z1} {block} {mode}'.strip())
        if y1 > y0:
            mid = (y0 + y1) // 2
            self.fill(x0, y0, z0, x1, mid, z1, block, mode)
            return self.fill(x0, mid+1, z0, x1, y1, z1, block, mode)
        mid = (z0 + z1) // 2
        self.fill(x0, y0, z0, x1, y1, mid, block, mode)
        return self.fill(x0, y0, mid+1, x1, y1, z1, block, mode)
    def set(self, x, y, z, block):
        return self.c(f'setblock {x} {y} {z} {block}')
    def check(self, x, y, z, spec):
        return passed(self.c(f'execute if block {x} {y} {z} {spec} run time query gametime'))

def main():
    cli = mc_admin.connect()
    try:
        b = B(mc_admin.Rcon(cli))
        print('force-loading build area...')
        b.c(f'forceload add {PAD_X0-8} {PAD_Z0-8} {PAD_X1+8} {PAD_Z1+8}')

        print('1/7 clearing above the pad...')
        b.fill(PAD_X0, PAD_Y+1, PAD_Z0, PAD_X1, PAD_Y+40, PAD_Z1, 'minecraft:air')

        print('2/7 levelling the pad (fill below to y67)...')
        b.fill(PAD_X0, PAD_Y-6, PAD_Z0, PAD_X1, PAD_Y-1, PAD_Z1, 'minecraft:stone', 'replace minecraft:air')
        b.fill(PAD_X0, PAD_Y-6, PAD_Z0, PAD_X1, PAD_Y-1, PAD_Z1, 'minecraft:stone', 'replace minecraft:water')
        b.fill(PAD_X0, PAD_Y, PAD_Z0, PAD_X1, PAD_Y, PAD_Z1, 'minecraft:grass_block')
        # plaza apron directly around the hall
        b.fill(HX0-4, PAD_Y, HZ0-4, HX1+4, PAD_Y, HZ1+4, 'minecraft:stone_bricks')

        print('3/7 hall floor + walls...')
        b.fill(HX0, PAD_Y, HZ0, HX1, PAD_Y, HZ1, 'minecraft:polished_andesite')
        # shell then hollow
        b.fill(HX0, WALL_Y0, HZ0, HX1, WALL_Y1, HZ1, 'minecraft:stone_bricks')
        b.fill(HX0+1, WALL_Y0, HZ0+1, HX1-1, WALL_Y1, HZ1-1, 'minecraft:air')
        # corner posts + wall plate in timber
        for (x, z) in ((HX0, HZ0), (HX0, HZ1), (HX1, HZ0), (HX1, HZ1)):
            b.fill(x, WALL_Y0, z, x, WALL_Y1, z, 'minecraft:spruce_log[axis=y]')
        b.fill(HX0, WALL_Y1, HZ0, HX1, WALL_Y1, HZ1, 'minecraft:spruce_log[axis=x]')
        b.fill(HX0+1, WALL_Y1, HZ0+1, HX1-1, WALL_Y1, HZ1-1, 'minecraft:air')

        print('4/7 windows + door...')
        for x in range(HX0+3, HX1-1, 4):                     # north & south walls
            b.fill(x, WALL_Y0+2, HZ0, x+1, WALL_Y0+3, HZ0, 'minecraft:glass_pane')
            b.fill(x, WALL_Y0+2, HZ1, x+1, WALL_Y0+3, HZ1, 'minecraft:glass_pane')
        for z in range(HZ0+3, HZ1-1, 4):                     # east & west walls
            b.fill(HX0, WALL_Y0+2, z, HX0, WALL_Y0+3, z+1, 'minecraft:glass_pane')
            b.fill(HX1, WALL_Y0+2, z, HX1, WALL_Y0+3, z+1, 'minecraft:glass_pane')
        # double door, south face, centred
        for dx in (-1, 0):
            b.set(CX+dx, WALL_Y0,   HZ1, 'minecraft:air')
            b.set(CX+dx, WALL_Y0+1, HZ1, 'minecraft:air')
        b.set(CX-1, WALL_Y0,   HZ1, 'minecraft:spruce_door[facing=south,half=lower,hinge=left]')
        b.set(CX-1, WALL_Y0+1, HZ1, 'minecraft:spruce_door[facing=south,half=upper,hinge=left]')
        b.set(CX,   WALL_Y0,   HZ1, 'minecraft:spruce_door[facing=south,half=lower,hinge=right]')
        b.set(CX,   WALL_Y0+1, HZ1, 'minecraft:spruce_door[facing=south,half=upper,hinge=right]')

        print('5/7 gabled roof...')
        for i in range(6):
            y = ROOF_Y0 + i
            zn, zs = HZ0 + i, HZ1 - i
            # gable infill at both ends
            b.fill(HX0, y, zn, HX0, y, zs, 'minecraft:stone_bricks')
            b.fill(HX1, y, zn, HX1, y, zs, 'minecraft:stone_bricks')
            # slopes, overhanging one block each side
            b.fill(HX0-1, y, zn, HX1+1, y, zn, 'minecraft:spruce_stairs[facing=south]')
            b.fill(HX0-1, y, zs, HX1+1, y, zs, 'minecraft:spruce_stairs[facing=north]')
            if i < 5:   # close the roof interior so it is weathertight
                b.fill(HX0+1, y, zn+1, HX1-1, y, zs-1, 'minecraft:air')
        b.fill(HX0-1, ROOF_Y0+6, CZ, HX1+1, ROOF_Y0+6, CZ, 'minecraft:spruce_planks')   # ridge

        print('6/7 interior fit-out...')
        # council table down the middle
        b.fill(CX-6, PAD_Y+1, CZ-1, CX+6, PAD_Y+1, CZ+1, 'minecraft:spruce_planks')
        # benches either side, facing the table
        b.fill(CX-6, PAD_Y+1, CZ-3, CX+6, PAD_Y+1, CZ-3, 'minecraft:spruce_stairs[facing=south]')
        b.fill(CX-6, PAD_Y+1, CZ+3, CX+6, PAD_Y+1, CZ+3, 'minecraft:spruce_stairs[facing=north]')
        # mayor's lectern at the head (north end), on a dais
        b.fill(CX-2, PAD_Y+1, HZ0+2, CX+2, PAD_Y+1, HZ0+2, 'minecraft:stone_brick_slab')
        b.set(CX, PAD_Y+2, HZ0+2, 'minecraft:lectern[facing=south]')
        # lighting
        for x in range(HX0+3, HX1, 6):
            for z in (HZ0+2, HZ1-2):
                b.set(x, WALL_Y1-1, z, 'minecraft:lantern[hanging=true]')
        # a bell over the door outside
        b.set(CX, WALL_Y1+1, HZ1+1, 'minecraft:bell[attachment=single_wall,facing=south]')

        print('7/7 verifying...')
        checks = [
            ('pad grass at NW corner',  PAD_X0+1, PAD_Y, PAD_Z0+1, 'minecraft:grass_block'),
            ('hall floor centre',       CX, PAD_Y, CZ, 'minecraft:polished_andesite'),
            ('wall SW corner post',     HX0, WALL_Y0+2, HZ0, 'minecraft:spruce_log'),
            ('interior is hollow',      CX, WALL_Y0+3, CZ, 'minecraft:air'),
            ('roof ridge',              CX, ROOF_Y0+6, CZ, 'minecraft:spruce_planks'),
            ('lectern',                 CX, PAD_Y+2, HZ0+2, 'minecraft:lectern'),
        ]
        ok = 0
        for name, x, y, z, spec in checks:
            r = b.check(x, y, z, spec)
            ok += r
            print(f'   {"OK " if r else "FAIL"}  {name} @ ({x},{y},{z})')
        print(f'\n{ok}/{len(checks)} checks passed')

        print('releasing forceload...')
        b.c('forceload remove all')
        print(f'total rcon commands: {b.n}')
        print(f'\nCAPITAL = ({CX}, {PAD_Y}, {CZ})')
    finally:
        cli.close()

if __name__ == '__main__':
    main()
