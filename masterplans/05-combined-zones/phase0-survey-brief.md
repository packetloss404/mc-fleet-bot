# Phase 0 Survey Brief — East Corridor

Status: **ACTION LIST FOR A LIVE SERVER SESSION — READ BEFORE TELEPORTING**

Masterplan 05 is a siting study built entirely offline from the sealed POI coordinate
directory. Every `Y` value in the corridor is provisional. This brief is what turns it
into something surveyed.

Nothing here authorizes a build. Chunk generation is the only world-affecting action
described, and it is bounded and ordered below.

## 0. The blocking question — confirm this first, it costs one teleport

**Does the world at `10.80.13.14` actually contain MainStreet America, Ravensreach and
the Data District?**

`CLAUDE.md` records that the server moved to a stock Paper box on 2026-07-24 and that
world-specific coordinates were emptied because they "describe nothing until this world
gets built". The accepted snapshot is dated 2026-07-28 — after that move — so the built
world probably is live. But this has never been verified from inside the game.

```
/tp @s 1240 250 -400        # should be over the Data District shared grid
/tp @s 0 250 0              # should be inside the MainStreet America campus
```

If those land in untouched wilderness, **stop**. The corridor is sited against a world
that is not live, and that finding outranks every terrain detail in this brief.

## 1. Ordering — snapshot before you generate

Loading ungenerated chunks permanently writes region files. Terrain is deterministic
from the seed, so nothing is *changed* — but the save grows and the accepted snapshot
`c39d0d67…` stops describing the live world. Phase 0's own sequence:

1. Take a fresh immutable saved-world snapshot. Record its SHA-256.
2. Generate the chunks (section 2 or 3).
3. Take a second snapshot. Record its SHA-256.
4. Render the terrain atlas over the generated area.
5. Run the terrain probe (section 4).

Steps 1 and 3 are what make the generation auditable. Do not skip them.

## 2. Preferred method — pregeneration, not manual teleporting

If the server has **Chunky**:

```
/chunky world world
/chunky center 1725 -300
/chunky radius 1600
/chunky start
```

Vanilla fallback, in slabs so nothing times out:

```
/forceload add 1200 -1200 2200 -200
/forceload add 2200 -1200 3200 -200
/forceload add 1200 -200 2200 600
/forceload add 2200 -200 3200 600
/forceload query
```

Remove the forceloads afterwards with `/forceload remove all` or the server will keep
them ticking forever.

Manual teleporting is a fallback. It leaves patchy coverage, and patchy coverage is
worse than none because it looks like data.

## 3. Manual waypoints, if teleporting by hand

Run in spectator so you cannot be hurt by, or interact with, unsurveyed terrain:

```
/gamemode spectator
```

Every stop is `y=250` — above any terrain, below the build limit.

### Scope A — corridor only (17 stops)

Answers the vertical-profile question, which is the single biggest unknown. Covers a
~336-block band centred on the corridor, which contains the 56-block reservation, both
12-block easements, all four southern ramp quadrants and both terminal roundabouts.

```
# run in spectator: /gamemode spectator
/tp @s 430 250 80    # corridor centreline 1
/tp @s 670 250 80    # corridor centreline 2
/tp @s 910 250 75    # corridor centreline 3
/tp @s 1094 250 -80    # corridor centreline 4
/tp @s 1334 250 -84    # corridor centreline 5
/tp @s 1504 250 -254    # corridor centreline 6
/tp @s 1550 250 -300    # corridor centreline 7
# named nodes (interchange, stations, termini)
/tp @s 430 250 80    # W-TERM roundabout
/tp @s 905 250 80    # PI-1
/tp @s 1065 250 -80    # PI-2
/tp @s 1180 250 -80    # EXIT 11 bridge
/tp @s 1240 250 -80    # DD-1 station
/tp @s 1330 250 -80    # PI-3
/tp @s 1550 250 -300    # E-TERM / Gateway
# local road ends
/tp @s 470 250 -232    # L1 Ravensreach link end
/tp @s 305 250 80    # L2 MainStreet East gate end
/tp @s 362 250 165    # L3 Observatory link end
```

### Scope B — full Phase 0 atlas (42 stops)

`x 1200…3200`, `z -1200…600` at 300-block spacing. This is the box Phase 0 actually
requires, and it is the only thing that answers **whether the east reserve is buildable
land at all** — the entire reserve is currently outside the rendered raster and could be
ocean.

```
/tp @s 1350 250 -1050    # atlas 1
/tp @s 1650 250 -1050    # atlas 2
/tp @s 1950 250 -1050    # atlas 3
/tp @s 2250 250 -1050    # atlas 4
/tp @s 2550 250 -1050    # atlas 5
/tp @s 2850 250 -1050    # atlas 6
/tp @s 3150 250 -1050    # atlas 7
/tp @s 1350 250 -750    # atlas 8
/tp @s 1650 250 -750    # atlas 9
/tp @s 1950 250 -750    # atlas 10
/tp @s 2250 250 -750    # atlas 11
/tp @s 2550 250 -750    # atlas 12
/tp @s 2850 250 -750    # atlas 13
/tp @s 3150 250 -750    # atlas 14
/tp @s 1350 250 -450    # atlas 15
/tp @s 1650 250 -450    # atlas 16
/tp @s 1950 250 -450    # atlas 17
/tp @s 2250 250 -450    # atlas 18
/tp @s 2550 250 -450    # atlas 19
/tp @s 2850 250 -450    # atlas 20
/tp @s 3150 250 -450    # atlas 21
/tp @s 1350 250 -150    # atlas 22
/tp @s 1650 250 -150    # atlas 23
/tp @s 1950 250 -150    # atlas 24
/tp @s 2250 250 -150    # atlas 25
/tp @s 2550 250 -150    # atlas 26
/tp @s 2850 250 -150    # atlas 27
/tp @s 3150 250 -150    # atlas 28
/tp @s 1350 250 150    # atlas 29
/tp @s 1650 250 150    # atlas 30
/tp @s 1950 250 150    # atlas 31
/tp @s 2250 250 150    # atlas 32
/tp @s 2550 250 150    # atlas 33
/tp @s 2850 250 150    # atlas 34
/tp @s 3150 250 150    # atlas 35
/tp @s 1350 250 450    # atlas 36
/tp @s 1650 250 450    # atlas 37
/tp @s 1950 250 450    # atlas 38
/tp @s 2250 250 450    # atlas 39
/tp @s 2550 250 450    # atlas 40
/tp @s 2850 250 450    # atlas 41
/tp @s 3150 250 450    # atlas 42
```

## 4. What to capture — a picture is the least useful output

A rendered map is nice. Per-column terrain height is what the plan actually needs.

With the fleet API running and a bot able to reach the corridor:

```bash
# single column
curl -s "http://127.0.0.1:3001/api/terrain/height?x=430&z=80"

# region scan around a node
curl -s "http://127.0.0.1:3001/api/terrain?x=1180&y=72&z=-80&radius=48"
```

Probe the centreline at every 16 blocks from `(430,80)` to `(1550,-300)` following the
polyline, and record: surface `Y`, whether the column is water, and the biome. That
yields ~80 samples and would let this package answer:

| Question | Currently | After the probe |
|---|---|---|
| Corridor vertical profile | every `Y` is `~` | surveyed per column |
| Water crossings | unknown — bridges unpriced | located and counted |
| Rail 1:8 gradient achievable? | assumed | proven or disproven |
| Cut/fill against the 12-block easements | unknown | computable |
| C01 East cover depth | ~17 blocks, derived | measured |
| Is the east reserve buildable? | unrendered, unknown | answered |

## 5. Hard limits for this session

- **No block placement, no world edits, no RCON writes.** Chunk generation only.
- Confirm the world border actually contains `x=3050` before generating scope B —
  if the border is tighter, the east reserve is invalid as drawn.
- Watch for existing generated structures (villages, ruined portals, trial chambers) in
  the reserve and along the corridor. Any found are new constraints this package does
  not know about.
- If the corridor crosses significant water or a ravine, say so before anything is
  designed further — the alignment is cheap to move now and expensive later.

## 6. Feeding results back

Land the outputs as:

- `corridor-terrain-probe.json` — the per-column samples
- a re-rendered whole-world raster covering the generated area
- both snapshot SHA-256 values, before and after

Then `corridor-clearance.json` gets regenerated against real terrain, the provisional
`Y` values in `site-coordinates.json` get replaced, and the `~` placeholders come out of
`MASTERPLAN.md`.
