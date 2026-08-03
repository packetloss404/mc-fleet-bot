#!/usr/bin/env python3
"""
The Moot Hall penthouse, and the Sanctum beneath the town.

The penthouse occupies the hall's roof void — an attic storey with dormers and a
south-facing terrace cut into the roof slope. A concealed door at the back of it
opens onto a private shaft, and a long processional corridor that arrives at the
top of a vast circular chamber cut deep under the plaza: half theatre, half temple.

  Penthouse   x[-97,-73] z[-389,-379]   y88-95, inside the existing roof
  Shaft       x[-98,-96] z[-391,-389]   y87 down to y41
  Corridor    y41, west then south then east, routed OUTSIDE the chamber shell
  Sanctum     centre (-85,-370) radius 28   floor y26, dome to y50, capped y51

Geometry is chosen to clear everything already built. The Moot Hall basements and
the multiplex bottom out at y53 -- measured, 1612 stone_bricks in that plane -- so
the dome caps at y51 and two courses of rock are left between the two structures.

Emits ops for scripts/build_runner.py — absolute coordinates only.
"""
import math, os, sys

CX, CZ, R = -85, -370, 28          # chamber centre and radius
# The Moot Hall basements and the multiplex bottom out at y53 (measured: 1612
# stone_bricks in that plane). The whole chamber therefore sits below y52, with the
# dome capped at y51 so two courses of rock remain between the two structures.
FLOOR = 26                          # chamber floor
WALL_TOP = FLOOR + 16               # 42
SCREEN_LO, SCREEN_HI = FLOOR + 5, FLOOR + 15    # 31 .. 41
STAGE_DECK = FLOOR + 3              # 29
CORRIDOR_Y = 41                     # the approach, and the portal head
STAGE_Z = -380                      # the stage front; seating radiates from here
OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'buildops')
os.makedirs(OUT, exist_ok=True)


class Ops:
    def __init__(self):
        self.ops = []

    def set(self, x1, y1, z1, x2, y2, z2, p):
        self.ops.append(f'SET {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {p}')

    def repl(self, x1, y1, z1, x2, y2, z2, m, p):
        self.ops.append(f'REPL {min(x1,x2)} {min(y1,y2)} {min(z1,z2)} '
                        f'{max(x1,x2)} {max(y1,y2)} {max(z1,z2)} {m} {p}')

    def _rows(self, ra, rb, ria=0.0, rib=0.0, half=None):
        """Rasterise an ellipse/annulus into merged (z-from, z-to, outer, inner) rows.
        half='south' keeps only rows at or south of the centre, for the seating arc."""
        raw = []
        for dz in range(-int(rb), int(rb) + 1):
            if half == 'south' and dz < 0:
                continue
            t = 1.0 - (dz / rb) ** 2 if rb else 1.0
            if t < 0:
                continue
            ox = int(round(ra * math.sqrt(t)))
            ix = -1
            if rib and abs(dz) <= rib:
                t2 = 1.0 - (dz / rib) ** 2
                if t2 > 0:
                    ix = int(round(ria * math.sqrt(t2)))
            raw.append((dz, ox, ix))
        out, i = [], 0
        while i < len(raw):
            j = i
            while j + 1 < len(raw) and raw[j + 1][1:] == raw[i][1:] and raw[j + 1][0] == raw[j][0] + 1:
                j += 1
            out.append((raw[i][0], raw[j][0], raw[i][1], raw[i][2]))
            i = j + 1
        return out

    # y2 lets a shape that repeats identically over a height be emitted as ONE box
    # per row instead of one per level. The chamber wall is 17 courses of the same
    # ring; without this it costs 950 ops and with it, 56.
    def disc(self, cx, y, cz, p, ra, rb, half=None, y2=None):
        for za, zb, ox, _ in self._rows(ra, rb, half=half):
            self.set(cx - ox, y, cz + za, cx + ox, y2 or y, cz + zb, p)

    def ring(self, cx, y, cz, p, ra, rb, ria, rib, half=None, y2=None):
        yy = y2 or y
        for za, zb, ox, ix in self._rows(ra, rb, ria, rib, half=half):
            if ix < 0:
                self.set(cx - ox, y, cz + za, cx + ox, yy, cz + zb, p)
            else:
                self.set(cx - ox, y, cz + za, cx - ix - 1, yy, cz + zb, p)
                self.set(cx + ix + 1, y, cz + za, cx + ox, yy, cz + zb, p)

    def shell(self, cx, y, cz, p, ra, rb, t=1, y2=None):
        self.ring(cx, y, cz, p, ra, rb, max(ra - t, 0), max(rb - t, 0), y2=y2)

    def door(self, x, y, z, kind, facing='north'):
        """A door is TWO blocks with DIFFERENT states. Setting a 2-tall selection to
        a door id writes two half=lower halves, which is invalid and pops off on
        load -- every door placed before this helper existed vanished that way."""
        self.set(x, y, z, x, y, z, f'{kind}[facing={facing},half=lower]')
        self.set(x, y + 1, z, x, y + 1, z, f'{kind}[facing={facing},half=upper]')

    def write(self, name):
        path = os.path.join(OUT, name)
        with open(path, 'w') as f:
            f.write('\n'.join(self.ops) + '\n')
        print(f'{name}: {len(self.ops)} ops -> {path}')
        return path


# ============================================================ 1. THE PENTHOUSE
def phase_penthouse():
    """The hall's roof void, converted. Dormers punched through both slopes, a
    terrace cut into the south slope, and a concealed door at the north end."""
    o = Ops()
    x1, x2, z1, z2 = -97, -73, -389, -379
    # floor plate over the third storey, and clear the void above it
    o.set(x1, 87, z1, x2, 87, z2, 'dark_oak_planks')
    o.set(x1, 88, z1, x2, 94, z2, 'air')
    # knee walls where the roof slope would otherwise cut head height
    o.set(x1 - 1, 88, z1 - 1, x2 + 1, 90, z1 - 1, 'stone_bricks')
    o.set(x1 - 1, 88, z2 + 1, x2 + 1, 90, z2 + 1, 'stone_bricks')
    o.set(x1 - 1, 88, z1 - 1, x1 - 1, 92, z2 + 1, 'stone_bricks')
    o.set(x2 + 1, 88, z1 - 1, x2 + 1, 92, z2 + 1, 'stone_bricks')
    o.set(x1, 95, z1, x2, 95, z2, 'dark_oak_planks')       # ceiling under the ridge
    # dormers: three on each slope, punched out through the existing roof
    for dx in (-93, -85, -77):
        for zz, out in ((z1 - 1, -3), (z2 + 1, 3)):
            o.set(dx - 1, 88, zz, dx + 1, 91, zz + out, 'air')
            o.set(dx - 2, 88, zz, dx - 2, 91, zz + out, 'stone_bricks')
            o.set(dx + 2, 88, zz, dx + 2, 91, zz + out, 'stone_bricks')
            o.set(dx - 2, 92, zz, dx + 2, 92, zz + out, 'deepslate_tiles')
            o.set(dx - 1, 89, zz + out, dx + 1, 90, zz + out, 'glass_pane')
    # terrace: a bite out of the south slope, railed
    o.set(-84, 88, -377, -76, 96, -373, 'air')
    o.set(-84, 87, -377, -76, 87, -373, 'polished_andesite')
    o.set(-84, 88, -373, -76, 88, -373, 'stone_brick_wall')
    o.set(-84, 88, -377, -84, 88, -373, 'stone_brick_wall')
    o.set(-76, 88, -377, -76, 88, -373, 'stone_brick_wall')
    o.set(-82, 88, -375, -78, 88, -375, 'lantern')
    # the apartment itself: hearth, seating, a desk, a bed, bookcases
    o.set(-96, 88, -388, -92, 88, -388, 'red_carpet')
    o.set(-96, 88, -387, -92, 90, -387, 'bookshelf')
    o.set(-90, 88, -388, -86, 88, -388, 'dark_oak_slab')
    o.set(-83, 88, -388, -80, 88, -388, 'red_bed')
    o.set(-78, 88, -388, -74, 91, -388, 'stone_bricks')
    o.set(-77, 88, -388, -75, 89, -388, 'campfire')
    o.set(-88, 88, -382, -84, 88, -382, 'dark_oak_stairs')
    for x in range(-95, -74, 6):
        o.set(x, 94, -384, x, 94, -384, 'lantern[hanging=true]')
    return o.write('sn1_penthouse.txt')


# ============================================================ 2. THE WAY DOWN
def phase_descent():
    """A concealed door behind the penthouse bookcase, a shaft, and a long
    corridor routed clear of the chamber shell so it arrives from the south."""
    o = Ops()
    # the door reads as part of the bookcase wall until it opens
    o.set(-96, 88, -389, -94, 90, -389, 'chiseled_bookshelf')
    o.set(-95, 88, -389, -95, 89, -389, 'air')
    o.set(-95, 88, -389, -95, 89, -389, 'dark_oak_door')
    # shaft, y46 to y87, ladder-served, lit at intervals
    o.set(-98, CORRIDOR_Y, -391, -96, 87, -389, 'air')
    o.set(-99, CORRIDOR_Y, -392, -95, 87, -388, 'polished_deepslate')
    o.set(-98, CORRIDOR_Y, -391, -96, 87, -389, 'air')
    o.set(-97, CORRIDOR_Y, -389, -97, 87, -389, 'ladder[facing=south]')
    for y in range(CORRIDOR_Y + 2, 88, 6):
        o.set(-96, y, -390, -96, y, -390, 'lantern')
    # corridor at y46: west, then south past the chamber, then east to the portal.
    # It is kept outside radius 30 of the chamber centre so it never breaks the shell.
    for a, b in (((-122, -391), (-96, -389)),          # west leg
                 ((-122, -391), (-120, -338)),          # south leg, clear of the dome
                 ((-122, -340), (-84, -338))):          # east leg to the portal
        o.set(a[0], CORRIDOR_Y, a[1], b[0], CORRIDOR_Y + 4, b[1], 'air')
        o.set(a[0] - 1, CORRIDOR_Y - 1, a[1] - 1, b[0] + 1, CORRIDOR_Y - 1, b[1] + 1, 'polished_deepslate')
        o.set(a[0] - 1, CORRIDOR_Y + 5, a[1] - 1, b[0] + 1, CORRIDOR_Y + 5, b[1] + 1, 'polished_deepslate')
    # line the corridor so it reads as built, not bored
    for a, b in (((-122, -391), (-96, -389)),
                 ((-122, -391), (-120, -338)),
                 ((-122, -340), (-84, -338))):
        o.repl(a[0] - 1, CORRIDOR_Y - 1, a[1] - 1, b[0] + 1, CORRIDOR_Y + 5, b[1] + 1, 'stone,deepslate,dirt,gravel,andesite,diorite,granite,tuff,water,lava', 'polished_deepslate')
    for z in range(-388, -338, 7):
        o.set(-121, CORRIDOR_Y + 4, z, -121, CORRIDOR_Y + 4, z, 'soul_lantern')
    for x in range(-120, -85, 7):
        o.set(x, CORRIDOR_Y + 4, -339, x, CORRIDOR_Y + 4, -339, 'soul_lantern')
    return o.write('sn2_descent.txt')


# ============================================================ 3. THE SANCTUM
def phase_sanctum():
    """A vast circular room. Tiered plush seating in a perfect semicircle facing a
    large raised stage; the curved perimeter wall carries a continuous screen; a
    stepped dome closes it overhead."""
    o = Ops()
    # excavate and line, well clear of the basements above (they bottom out at y54)
    o.disc(CX, FLOOR - 2, CZ, 'polished_blackstone', R + 3, R + 3)
    o.disc(CX, FLOOR - 1, CZ, 'air', R + 2, R + 2, y2=51)
    o.disc(CX, FLOOR - 1, CZ, 'polished_blackstone', R + 1, R + 1)
    o.disc(CX, 51, CZ, 'polished_deepslate', R + 3, R + 3)      # cap under the town

    # perimeter wall, y31 to y47
    o.shell(CX, FLOOR, CZ, 'polished_blackstone_bricks', R + 1, R + 1, 2, y2=WALL_TOP)

    # THE SCREEN. A continuous band around the whole curved wall: black frame top
    # and bottom, a backlit mosaic between. It is what the room looks at when the
    # stage is dark.
    o.shell(CX, SCREEN_LO, CZ, 'black_concrete', R, R, 1)
    o.shell(CX, SCREEN_HI, CZ, 'black_concrete', R, R, 1)
    o.shell(CX, SCREEN_LO + 1, CZ, 'sea_lantern', R, R, 1, y2=SCREEN_HI - 1)
    o.shell(CX, SCREEN_LO + 1, CZ, '34%cyan_stained_glass,33%purple_stained_glass,'
                                   '33%magenta_stained_glass', R - 1, R - 1, 1,
            y2=SCREEN_HI - 1)

    # the stage: large, raised, thrust forward of the north wall
    o.set(CX - 16, FLOOR, -396, CX + 16, STAGE_DECK - 1, STAGE_Z, 'polished_blackstone')
    o.set(CX - 16, STAGE_DECK, -396, CX + 16, STAGE_DECK, STAGE_Z, 'polished_blackstone')
    o.set(CX - 15, STAGE_DECK, -395, CX + 15, STAGE_DECK, STAGE_Z - 1, 'black_concrete')
    o.set(CX - 16, STAGE_DECK, STAGE_Z, CX + 16, STAGE_DECK, STAGE_Z, 'polished_blackstone_slab')
    # a proscenium of columns and a lintel framing it
    for dx in (-17, 17):
        o.set(CX + dx, FLOOR, STAGE_Z - 1, CX + dx, WALL_TOP - 2, STAGE_Z - 1, 'polished_deepslate')
    o.set(CX - 17, WALL_TOP - 2, STAGE_Z - 1, CX + 17, WALL_TOP - 2, STAGE_Z - 1, 'polished_deepslate')
    o.set(CX - 16, WALL_TOP - 3, STAGE_Z - 1, CX + 16, WALL_TOP - 3, STAGE_Z - 1,
          'minecraft:iron_chain')
    # rigging over the stage: a gantry, hoists, and a lighting bar
    o.set(CX - 15, WALL_TOP - 4, -394, CX + 15, WALL_TOP - 4, STAGE_Z - 2, 'polished_deepslate_wall')
    for dx in range(-14, 15, 4):
        o.set(CX + dx, WALL_TOP - 6, -390, CX + dx, WALL_TOP - 5, -390,
              'minecraft:iron_chain')
        o.set(CX + dx, WALL_TOP - 7, -390, CX + dx, WALL_TOP - 7, -390, 'redstone_lamp')
    o.set(CX - 14, STAGE_DECK + 1, -395, CX - 12, STAGE_DECK + 4, -395, 'barrel')
    o.set(CX + 12, STAGE_DECK + 1, -395, CX + 14, STAGE_DECK + 4, -395, 'barrel')

    # THE SEATING: concentric semicircular tiers, centred on the stage front, each
    # row one higher than the last. Plush = red carpet treads, dark oak backs.
    for i, rad in enumerate(range(13, 28)):
        y = FLOOR + 1 + i
        if y > WALL_TOP - 2:
            break
        o.ring(CX, y, STAGE_Z, 'polished_blackstone', rad, rad, rad - 2, rad - 2, half='south')
        o.ring(CX, y + 1, STAGE_Z, '70%red_carpet,30%crimson_slab', rad, rad, rad - 1, rad - 1, half='south')
        if i % 2 == 0:
            o.ring(CX, y + 1, STAGE_Z, 'dark_oak_stairs', rad - 1, rad - 1, rad - 2, rad - 2, half='south')
    # two radial aisles through the seating, so the tiers are climbable
    for ang in (35, 145):
        r = math.radians(ang)
        for i, rad in enumerate(range(13, 28)):
            y = FLOOR + 1 + i
            if y > WALL_TOP - 2:
                break
            x = CX + round(rad * math.cos(r))
            z = STAGE_Z + round(rad * math.sin(r))
            o.set(x - 1, y + 1, z, x + 1, y + 1, z, 'polished_blackstone_slab')

    # the entry portal: you arrive at the TOP of the back row and the room opens below
    o.set(CX - 3, CORRIDOR_Y, -344, CX + 3, CORRIDOR_Y + 4, -338, 'air')
    o.set(CX - 4, CORRIDOR_Y - 1, -345, CX + 4, CORRIDOR_Y - 1, -338, 'polished_deepslate')
    o.set(CX - 4, CORRIDOR_Y + 5, -345, CX + 4, CORRIDOR_Y + 5, -338, 'polished_deepslate')
    for i in range(6):
        o.set(CX - 3, CORRIDOR_Y - i, -345 - i, CX + 3, CORRIDOR_Y - i, -345 - i, 'polished_blackstone')
        o.set(CX - 3, CORRIDOR_Y + 1 - i, -345 - i, CX + 3, CORRIDOR_Y + 4 - i, -345 - i, 'air')
    o.set(CX - 4, CORRIDOR_Y + 1, -344, CX - 4, CORRIDOR_Y + 3, -344, 'soul_lantern')
    o.set(CX + 4, CORRIDOR_Y + 1, -344, CX + 4, CORRIDOR_Y + 3, -344, 'soul_lantern')

    # the temple half: a colonnade standing inside the screen, and braziers
    for ang in range(0, 360, 15):
        r = math.radians(ang)
        x = CX + round((R - 2) * math.cos(r))
        z = CZ + round((R - 2) * math.sin(r))
        o.set(x, WALL_TOP, z, x, WALL_TOP + 2, z, 'polished_deepslate')
    for ang in range(0, 360, 60):
        r = math.radians(ang)
        x = CX + round((R - 5) * math.cos(r))
        z = CZ + round((R - 5) * math.sin(r))
        o.set(x, FLOOR, z, x, FLOOR, z, 'polished_blackstone')
        o.set(x, FLOOR + 1, z, x, FLOOR + 1, z, 'campfire')

    # the dome, stepped from the wall head up to a lit oculus
    for k, (y, ro) in enumerate([(43, 28), (44, 27), (45, 25), (46, 22),
                                 (47, 18), (48, 14), (49, 9), (50, 4)]):
        ri = [27, 25, 22, 18, 14, 9, 4, 0][k]
        o.ring(CX, y, CZ, 'polished_deepslate', ro, ro, ri, ri)
    o.disc(CX, 50, CZ, 'sea_lantern', 4, 4)
    for ang in range(0, 360, 30):
        r = math.radians(ang)
        x = CX + round(20 * math.cos(r))
        z = CZ + round(20 * math.sin(r))
        o.set(x, WALL_TOP + 2, z, x, WALL_TOP + 2, z, 'soul_lantern')
    return o.write('sn3_sanctum.txt')


# ================================================ 4. REGISTRY-CORRECT SANCTUM RIGGING
def phase_rigging():
    """Re-place rigging omitted when the server rejected the legacy `chain` id."""
    o = Ops()
    o.set(CX - 16, WALL_TOP - 3, STAGE_Z - 1, CX + 16, WALL_TOP - 3, STAGE_Z - 1,
          'minecraft:iron_chain')
    for dx in range(-14, 15, 4):
        o.set(CX + dx, WALL_TOP - 6, -390, CX + dx, WALL_TOP - 5, -390,
              'minecraft:iron_chain')
    return o.write('fix15_sanctum_rigging.txt')


# ============================================================ 4. FINAL ACCESS REPAIR
def phase_access():
    """Canonical landings and return route, emitted after the original phases.

    The final shaft carve removed fix9's landings, leaving a valid ladder behind a
    doorway with no floor. The Sanctum route also descended through the seating but
    had no climb back to its y41 portal. Keep these last so later shells cannot seal
    them again.
    """
    o = Ops()

    # Bridge the hall doorway to the ladder at ground, first floor and second floor.
    # The landing stops at z=-390 so the ladder column at z=-389 stays continuous.
    for floor_y in (67, 73, 79):
        o.set(-98, floor_y, -391, -95, floor_y, -390, 'polished_andesite')
        o.set(-95, floor_y + 1, -390, -94, floor_y + 2, -390, 'air')

    # Three short turns from the last ladder cell at y85 into the penthouse's open
    # concealed door at (-95,88,-389). This fits inside the existing shaft shell.
    o.set(-96, 84, -389, -96, 84, -389, 'polished_andesite')
    o.set(-96, 85, -390, -96, 85, -390,
          'polished_andesite_stairs[facing=south]')
    o.set(-96, 86, -390, -96, 88, -390, 'air')
    o.set(-95, 86, -390, -95, 86, -390,
          'polished_andesite_stairs[facing=east]')
    o.set(-95, 87, -390, -95, 89, -390, 'air')
    o.set(-95, 87, -389, -95, 87, -389,
          'polished_andesite_stairs[facing=south]')

    # Re-cut the measured route after all chamber and shaft shells. The east leg had
    # a one-block cross-wall at x=-89, while the northern half of the long west leg
    # had been completely re-filled with polished deepslate. Both defects made the
    # nominal corridor a one-way fall through surrounding caves.
    for a, b in (((-122, -391), (-96, -389)),
                 ((-122, -391), (-120, -338)),
                 ((-122, -340), (-84, -338))):
        o.set(a[0], CORRIDOR_Y - 1, a[1], b[0], CORRIDOR_Y - 1, b[1],
              'polished_deepslate')
        o.set(a[0], CORRIDOR_Y, a[1], b[0], CORRIDOR_Y + 3, b[1], 'air')
    # The west-leg headroom overlaps the bottom three ladder cells; restore the
    # continuous climb only after the corridor has been re-cut.
    o.set(-97, 42, -389, -97, 85, -389, 'ladder[facing=south]')

    # A seven-rise central aisle links the stage deck (y29) to the existing bottom
    # portal landing (y36 at z=-350). Four-block treads preserve the auditorium rake
    # while making the formerly one-way descent climbable in both directions.
    for z in range(STAGE_Z, -349):
        rise = min(7, (z - STAGE_Z) // 4)
        y = STAGE_DECK + rise
        block = ('polished_blackstone_stairs[facing=north]'
                 if z != STAGE_Z and (z - STAGE_Z) % 4 == 0
                 else 'polished_blackstone')
        o.set(CX - 3, y, z, CX + 3, y, z, block)
        o.set(CX - 3, y + 1, z, CX + 3, y + 4, z, 'air')
    return o.write('fix14_core_access.txt')


if __name__ == '__main__':
    fns = dict(penthouse=phase_penthouse, descent=phase_descent, sanctum=phase_sanctum,
               rigging=phase_rigging, access=phase_access)
    for w in (sys.argv[1:] or list(fns)):
        fns[w]()
