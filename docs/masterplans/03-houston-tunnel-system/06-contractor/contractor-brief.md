# Houston Tunnel System — AI Contractor Brief

**Build ID:** `03-houston-tunnel-system`
**Build name:** Houston Tunnel System (Minecraft replica)
**Brief version:** 1.0
**Date:** 2026
**Author role:** AI Contractor Writer
**Status:** Binding spec for the AI contractor / human builder

> This brief is the **machine-actionable counterpart** to the human-facing master plan PDF. Every block, every coordinate, every phase is specified here so that an LLM agent (or a human) can place blocks without further interpretation. Where this brief conflicts with upstream design notes, **this brief wins** for build execution; upstream docs win for design intent.

---

## 1. Project Header

| Field | Value |
|---|---|
| **Build ID** | `03-houston-tunnel-system` |
| **Build name** | Houston Tunnel System (civilian climate-controlled underground pedestrian network) |
| **Build target** | `mc-fleet-bot` Minecraft sidecar with WorldEdit-style schematic placement |
| **World** | Vanilla Minecraft 1.20+ biomes, flat hot-plains/savanna above ground |
| **Build area** | Single contiguous rectangular plot; world origin at Wells Fargo Plaza street entrance |
| **Master plan tag legend** | `[D]` documented · `[I]` inferred from archetype · `[X]` invented/designer-filled |
| **Combined-complex fiction** | SubTropolis public shaft and Cheyenne Mountain service tunnel are project fictions; not connected to Houston tunnels |
| **Upstream sources** | `01-research/research-report.md`, `03-discussion/culture-architecture-analysis.md`, `03-discussion/discussion-notes.md`, `04-design/site-plan.md`, `04-design/site-coordinates.json`, `04-design/design-plan.md`, `04-design/working-plan.md`, `04-design/development-plan.md` |

**Quick reference — world setup**

- World seed: any flat superflat world, or a `minecraft:custom` flat preset with `bedrock` at y=0 and 64 layers of `stone` above.
- Pre-clear the build area: a 144 × 96 block rectangle from `(0, 0, 0)` to `(144, 96, -138)`. Center on origin, extending **north (−z) and east (+x)**.
- Set the time-of-day clock to start at Minecraft-time `0` (6:00 a.m. in vanilla) so the time-of-day cycle in Phase 7 is consistent.
- Set `gamemode` `creative` for the build session; no hostile mobs. The build is daylight above-ground and enclosed below.
- Working in chunks of 16 blocks is recommended; the build's `144 × 96` footprint is 9 × 6 = 54 chunks.

---

## 2. Build Targets

### 2.1 Block budget by phase

Total **placed-block** budget (excludes excavated void) is ~158,000 blocks at full v2.0 polish. Phased delivery allows incremental build.

| Phase | Description | Placed blocks | Excavated void | Bot time (hrs) | Human time (hrs) |
|---|---|---:|---:|---:|---:|
| 1 | Site prep | 10,000 | (partial) | 2–4 | 4–6 |
| 2 | Above-ground city shell | 50,000 | — | 8–12 | 20–30 |
| 3 | Tunnel excavation | — | 18,500 | 4–6 | 10–15 |
| 4 | Tunnel interior (walls/floors/ceilings/lights/descents) | 52,000 | — | 12–18 | 30–45 |
| 5 | Tenant zones (4 food courts + 6 supporting zones) | 24,000 | — | 10–15 | 25–35 |
| 6 | Skybridges + wayfinding finish | 2,000 | — | 3–5 | 8–12 |
| 7 | Finishing (easter eggs, lighting cycle, NPCs, sound) | 1,500 | — | 4–6 | 8–12 |
| **Total v2.0** | | **~139,500 placed** | **~18,500 void** | **~43–66** | **~105–155** |

> The working plan cites ~158,000 because it includes some double-counted fit-out and signage blocks. The conservative placed count is ~139,500; the upper bound (with full v2.0 polish) is ~158,000.

### 2.2 MVP (v0.1) — the soul in miniature

The **minimum viable build** is the **Wells Fargo Plaza street-level entrance + the descent + the first 1–2 blocks of standard tunnel**, capturing the entire *soul* of the Houston tunnel system in ~3,000 blocks. This is the recommended starting point for any contractor.

**v0.1 included (load-bearing must-haves):**
1. Wells Fargo Plaza tower shell (lobby only, no upper floors)
2. Wells Fargo lobby interior (granite-and-glass, 1980s)
3. Bank of 4 elevators + interior stair down
4. Floodgate at lobby-to-basement transition
5. First 1–2 blocks of standard 1970s tunnel
6. Interpretive panel: "200,000 daily users"
7. 1930s origin plaque
8. Wells Fargo Direct Street Access sign
9. T-marker at the curb
10. "Tunnel" capitalization on all signs

**Estimated v0.1 block count:** ~3,000. **Estimated v0.1 time:** 2–3 hrs bot, 4–6 hrs human.

### 2.3 Time estimate to full v2.0 polish

- **Bot time (parallel):** 43–66 hours of `mc-fleet-bot` run time.
- **Human time (sequential):** 105–155 hours of manual block-by-block placement.
- **v0.1 (soul only):** 2–6 hours.
- **v1.0 (tunnel complete):** 35–50 hours bot, 90–125 hours human.

### 2.4 Render distance and performance

- The build's vertical extent is **~150 blocks** (JPMorgan Chase top at y≈88, Cheyenne Mountain service tunnel at y=-86, but those are project fictions at the edges). The main build is **y=58 to y=88**, only 30 blocks tall.
- **Recommended render distance:** 12–16 chunks. The build's footprint (144 × 96) is visible from corner to corner at distance 12.
- **Performance expectations:** The build uses predominantly cheap blocks (`white_concrete`, `quartz_block`, `smooth_stone_slab`, `white_wool`, `sea_lantern`). Light sources are concentrated at the ceiling — total light-emitting blocks ~1,650 across the entire build. Frame rate should remain smooth on vanilla 1.20.
- **Two-layer integration is a render-distance limitation:** a player on the surface cannot see the tunnel (6 blocks below), and vice versa. The build uses **in-build signage** (T-markers, lobby directories, skybridge landings) to make the two-layer connection readable.

### 2.5 Quality acceptance criteria

The build is **accepted** when all of the following are true:

- [ ] The 4 food courts are visually distinct (Esperson single-loaded, Pennzoil packed, 1001 Fannin modern, McKinney linear) and the player can identify each from the in-build signage alone.
- [ ] The time-staggered cross-section is visible: walking from one quadrant to another, the player sees the era change (1970s → 1990s → 2010s LED → 1950s minimal).
- [ ] The Wells Fargo descent is the iconic opening: revolving door → marble lobby → elevator bank → interior stair → floodgate → tunnel corridor. The temperature-change feeling is conveyed.
- [ ] The McKinney Garage descent is the *other* direct entry, deliberately less polished.
- [ ] Both T-markers (Wells Fargo, McKinney) are present on the sidewalks.
- [ ] The 1930s dual-origin plaque is at the Wells Fargo lobby.
- [ ] The 200,000 daily users / 95+ blocks / 6 mi / 1930s interpretive panel is at the Wells Fargo lobby.
- [ ] At least 18 easter eggs are placed per design plan §15.
- [ ] The 4 skybridges span named streets at the second-floor level.
- [ ] The "Tunnel" capitalization appears on every sign.
- [ ] No subway/transit or mall contamination (no "MTA," "Platform," central atrium, fountain, etc.).
- [ ] All 8 named segments (Cameron 2015 grid: A-15 through D-28) are represented.
- [ ] No surface-street breakthrough — the tunnel excavation did not break the underside-of-street layer (y=63).
- [ ] The after-hours shutdown dims the McKinney quadrant at Minecraft-time 12000.
- [ ] A wayfinding test passes: starting at any food court, a player can find every other food court using only the in-build signage.

---

## 3. Coordinate System

### 3.1 World origin

- **World origin:** `(0, 64, 0)`
- **Description:** Wells Fargo Plaza street entrance, at the SE corner of the build, on the south face of the Wells Fargo tower, on the sidewalk of Louisiana Street, at street level. T-marker plaque is at this coordinate.

### 3.2 Compass orientation

```
              North (−z)
                  ↑
                  |
   West (−x) ←----+----→ East (+x)
                  |
                  ↓
              South (+z)
                  Up = +y
```

- **North = −z** (Houston CBD runs N–S along Main/Fannin/Travis/Louisiana/Walker/Capitol)
- **East = +x** (E–W cross streets: Lamar, Dallas, McKinney, Rusk)
- **Up = +y** (vertical)
- **Down = −y** (depth)

This matches Minecraft convention.

### 3.3 Y-level reference

| Y-level | What | Notes |
|---|---|---|
| 88 | Top of Wells Fargo, JPMorgan Chase, 1001 Fannin | Tower tops |
| 84 | Top of Pennzoil Place | |
| 80 | Top of Esperson, generic tower cornice max | |
| 76 | Top of McKinney Garage | |
| 68 | Skybridge level (second floor) | Glass-enclosed walkways |
| 64 | Street level | World origin (0,64,0) |
| 63 | Underside of street (mechanical space) | 1 block; tunnel ceiling structural |
| 62 | Tunnel ceiling (food-court node, 4-blk interior) | Open, exposes underside of street |
| 61 | Tunnel ceiling (corridor, dropped acoustic) | 1-block `smooth_stone_slab` |
| 58 | Tunnel floor | World vertical center of tunnel |
| -86 | Cheyenne Mountain service tunnel floor | Project fiction, far below |

### 3.4 Build extent

- **Above-ground city** (6 × 6 = 36 compressed blocks): `x = 0 to 138`, `z = 0 to -138`
- **Tunnel sample** (4 × 6 = 24 compressed blocks): `x = 0 to 92`, `z = 0 to -138`
- **Compressed block size:** 20 m × 20 m
- **Block unit (block + 3 m street):** 23 m
- **Total footprint (above-ground):** 138 m × 138 m ≈ 19,000 m²
- **Total tunnel footprint:** 92 m × 138 m ≈ 12,700 m²

### 3.5 Street grid (centerlines)

**N–S streets (long axis, 6 streets, 6 blocks apart):**

| Street | x centerline | Position |
|---|---|---|
| Main | 1.5 | eastmost |
| Fannin | 21.5 | interior |
| Travis | 44.5 | interior |
| Louisiana | 67.5 | interior |
| Walker | 90.5 | interior |
| Capitol | 113.5 | westmost |

**E–W cross streets (4 streets):**

| Street | z centerline | Position |
|---|---|---|
| Lamar | -20.5 | southmost |
| Dallas | -43.5 | interior |
| McKinney | -66.5 | interior |
| Rusk | -89.5 | northmost |

### 3.6 How to read the coordinate tables in this brief

Every coordinate is `(x, y, z)` Minecraft-absolute. All "compressed block centers" are the center of the 20×20 block at 4:1 linear compression. The Cameron 2015 build-block identifier (e.g., `A-15`, `D-22`) is the *named* reference for that compressed block, derived from the real Cameron Management 2015 detailed tunnel map.

**Y is fixed** for an entire zone in most cases (e.g., all food courts are at y=58 floor / y=62 ceiling). The contractor should place the entire zone at the documented Y range, not extrapolate.

---

## 4. Phase 1 — Site Preparation

### 4.1 Goal

Clear the build area, create the terrain, mark the 6×4 sample footprint, mark the 12 buffer blocks, set the 6-block air space below grade for the tunnel excavation.

### 4.2 Block specs

**4.2.1 Terrain clear & level**
- Clear the 144 × 96 block rectangle from `(0, 0, 0)` to `(144, 96, -138)`.
- Replace all non-air blocks with `stone` for the layers y=1 to y=63.
- Set the top of the terrain at y=63 (the underside-of-street layer); streets themselves will be placed in Phase 2 at y=64.
- Set biome to `minecraft:plains` or `minecraft:savanna` via NBT edit (the surface should look like hot flat Texas).

**4.2.2 Quadrant boundary markers**
- Use `light_gray_wool` (1 block) at y=80 at the corner of each compressed block, removed after the build is complete. These are **invisible** to the player but visible to the contractor at y=80 (above the city).
- Mark the 4 quadrants (Q1 SE, Q2 NE, Q3 SW, Q4 NW) at their boundaries.

**4.2.3 Street marker strips**
- Place 1-block-wide `gray_concrete` strips at y=63 (the surface for streets) following the N–S and E–W centerline table in §3.5.
- These become the actual street surfaces in Phase 2; the strip at y=63 is the **base** for the street.

**4.2.4 Tunnel void excavation**
- Excavate the **tunnel sample** footprint (`x = 0 to 92`, `z = 0 to -138`, `y = 0 to 57`) to air.
- **Critical:** preserve y=58 to y=63 (the tunnel air space, the structural shell, the underside of street) — the tunnel interior goes here in Phase 4.
- **Critical:** preserve the street surface at y=64. The tunnel excavation must NOT break through the street.
- WorldEdit `//mask` should be set to `!street_surface,!tunnel_airspace` to protect y=58 to y=64.

**4.2.5 Cameron 2015 grid markers**
- Place `oak_sign` markers at the corner of each compressed block, 4 blocks above street grade (y=68), with the Cameron label (e.g., "A-15", "B-16", "C-21").
- The 24 tunnel-sample build-block labels: A-15, A-17, A-19, A-21, A-23, A-25, B-16, B-18, B-20, B-22, B-24, B-26, C-17, C-19, C-21, C-23, C-25, C-27, D-18, D-20, D-22, D-24, D-26, D-28.

### 4.3 WorldEdit command reference

```
//pos1 0,63,0
//pos2 144,0,-138
//set stone
//mask !y=58-64  ← preserve tunnel airspace and street surface
//expand 1 down  ← optional

//pos1 0,57,0
//pos2 92,0,-138
//set air
//mask !y=58-64
```

**Bot equivalent (mc-fleet-bot API):**
```
POST /api/build/fill
{
  "region": { "x1": 0, "y1": 0, "z1": 0, "x2": 144, "y2": 63, "z2": -138 },
  "block": "minecraft:stone",
  "preserve_layers": [{ "y1": 58, "y2": 64 }]
}
```

### 4.4 Risk areas

- The tunnel void excavation is the largest single task. If the build area has pre-existing structures, the clearing time is longer.
- Coordinate with the combined-complex team on the public-shaft landing point (x=-12.5, z=-55) before excavating — that area is just outside the tunnel sample but in the buffer-block zone.

---

## 5. Phase 2 — Above-Ground City

### 5.1 Goal

Build the exterior shells of the 4 named anchor towers, the 8–10 generic downtown towers, the 2–3 parking garages, the street grid, the 4 skybridge shells. **Lobbies are NOT built in this phase** — only the exterior envelope.

### 5.2 Block specs — 4 named anchor towers

**5.2.1 Wells Fargo Plaza (1000 Louisiana) — Block A-15**
- Position (tower center): `(10, 64, -10)`; top at `y=88`
- Footprint: 20 × 20 blocks (the compressed block at 4:1)
- Shell: `quartz_block` (smooth) for the 1980s granite-and-glass vocabulary
- Curtain wall: `light_gray_stained_glass_pane` in a 3 × 5 grid (every 3 blocks horizontal, every 5 vertical)
- Base / plinth: `iron_block` (4-block-tall base) + `polished_andesite` ground floor
- Cornice: 1-block-wide `quartz_block` band at y=87
- Plaza at corner of Louisiana and Rusk: `polished_andesite` pavers (10 × 10 blocks), `stone_brick_wall` edge, 1-2 `jungle_log` + `jungle_leaves` palm cluster, `oak_stairs` + `oak_slab` bench
- Approximate block count: ~5,500

**5.2.2 JPMorgan Chase Tower (600 Travis) — Block B-26**
- Position (tower center): `(33, 64, -110)`; top at `y=88` (tallest in the build)
- Footprint: 20 × 20 blocks
- Shell: `white_concrete` (1990s vocabulary) with `gray_stained_glass_pane` curtain wall
- Tapered roofline: 1-block setback every 5 stories for the top 20 stories (y=68 to y=88)
- Plinth: `polished_andesite` (3-block-tall base)
- Approximate block count: ~6,000

**5.2.3 Pennzoil Place (711 Louisiana) — Block D-22**
- Position: two mirrored towers centered at `(79, 64, -55)`, top at `y=84`
- Footprint: 2 × (10 × 20) = 400 blocks per tower × 2 = 800 footprint, with 1-block gap between
- Shell: `black_concrete` with `black_stained_glass_pane` mirrored-glass curtain wall
- Trapezoidal silhouette: 1-block setback every 4 stories (the stepped trapezoid signature)
- Lobby bridge: 1-block-wide glass corridor at y=68 connecting the two towers (built in Phase 4 as part of the descent)
- Approximate block count: ~3,500

**5.2.4 Esperson (808 Travis / 815 Walker) — Blocks C-21 (808 Travis) and adjacent**
- Two Art Deco twin towers
- Position 808 Travis: `(56, 64, -55)`; top at `y=80`
- Position 815 Walker: `(56, 64, -78)`; top at `y=80` (slightly shorter, the secondary twin)
- Footprint: 2 × (15 × 18) = 540 footprint
- Shell: `quartz_block` (smooth) with `smooth_quartz_stairs` Art Deco cornice ornamentation
- Window grid: `gray_stained_glass_pane` in a 3 × 4 grid
- Vertical pilaster: `quartz_pillar` running full height of each tower (1-block-wide)
- Stepped parapets: 1-block setbacks at the roofline
- Recessed main entrance framed by `smooth_quartz_stairs`
- Approximate block count: ~3,000

### 5.3 Block specs — 1001 Fannin & McKinney Garage (named secondary)

**5.3.1 1001 Fannin (One Fannin) — Block B-16**
- Position: `(33, 64, -10)`; top at `y=88`
- Footprint: 20 × 20 blocks
- Shell: `white_concrete` with `light_gray_stained_glass_pane` curtain wall
- Approximate block count: ~4,000

**5.3.2 McKinney Garage on Main (930 Main) — Block A-21**
- Position: `(10, 64, -82.5)`; top at `y=76`
- Footprint: 20 × 20 blocks
- Open-deck `gray_concrete` parking garage (4–6 stories)
- `yellow_concrete` painted lane lines on each deck
- `iron_bars` perimeter railings
- Ground floor: `light_blue_concrete` retail concourse (the McKinney Place food court begins here)
- Approximate block count: ~2,500

### 5.4 Block specs — Generic downtown towers (8–10, designer fills in `[X]`)

- Position: 8–10 towers on the buffer blocks, generally on the west 2 columns (cols 5–6, x=92 to 138) and the buffer areas
- Shell: `white_concrete` (1990s–2020s vocabulary) or `light_gray_concrete` (1980s vocabulary)
- Curtain wall: `light_gray_stained_glass_pane` in a 3 × 5 grid
- Height range: 25–60 blocks (varied for skyline interest)
- Ground floor: `gray_concrete` parking-garage plinth
- Roof: flat `gray_concrete` with `iron_block` mechanical penthouses
- Cornice: 1-block-wide `quartz_block` band at the roofline
- Approximate block count: ~12,000–18,000

### 5.5 Block specs — Generic parking garages (1–2 `[X]`)

- 4–6 stories of open-deck `gray_concrete`
- `iron_bars` perimeter railings
- `yellow_concrete` painted lane lines
- Approximate block count: ~4,000

### 5.6 Block specs — Street grid

- 6 N–S streets × ~144 blocks long × 5 blocks wide = ~4,320 `gray_concrete`
- 4 E–W cross streets × ~96 blocks long × 5 blocks wide = ~1,920 `gray_concrete`
- Sidewalks: 1-block-wide `smooth_stone_slab` on each side
- Curb: `stone_brick_stairs` at the street-to-sidewalk transition
- Lane lines: `yellow_concrete` (centerline, single rows) + `white_concrete` (lane lines)
- Total: ~8,700 blocks

### 5.7 Block specs — Street furniture

- **Streetlights:** `iron_fence` pole (4 blocks tall) + `redstone_lamp` (active) at top, every 8 blocks
- **Palm trees:** `jungle_log` (4 blocks) + `jungle_leaves` (5-block canopy), every 12–16 blocks
- **Live oaks:** `dark_oak_log` (6 blocks) + `dark_oak_leaves` (7-block canopy), alternating with palms
- **Fire hydrants:** `cauldron` (small) at corners
- **Trash cans:** `iron_bars` (cylindrical approximation) at corners
- **Parking meters:** `item_frame` on `oak_fence` post, occasional
- Total: ~50 streetlights + ~50 trees + ~30 fire hydrants

### 5.8 Block specs — Skybridge shells (4 skybridges)

Each skybridge is a 1-block-wide × 2-block-tall glass-enclosed corridor at y=68 spanning a named street.

| Skybridge | Street crossed | Span | Connects | Tag |
|---|---|---|---|---|
| McKinney Street | McKinney (E–W) | x=0 to 23, z=-66.5 | McKinney Garage (S) to generic tower (N) | `[D]` documented |
| Travis Street | Travis (N–S) | z=0 to -110, x=44.5 | 1001 Fannin (E) to JPMorgan Chase (W) | `[X]` generic |
| Louisiana Street | Louisiana (N–S) | z=-45 to -65, x=67.5 | Esperson (E) to Pennzoil (W) — most famous | `[D]` documented |
| Walker Street | Walker (N–S) | z=-45 to -65, x=90.5 | Esperson (E) to generic tower (W) | `[X]` generic |

- **Walls:** `glass_pane` on both long sides + `iron_bars` mullions every 4 blocks
- **Frame:** `iron_bars` structural frame
- **Corners:** `light_gray_concrete` corner connectors
- **Interiors NOT built in Phase 2** — built in Phase 6
- Approximate block count: ~400 (4 skybridges)

### 5.9 Phase 2 quality checkpoint

Before moving to Phase 3, verify:
- [ ] All 4 anchor towers built with documented signatures
- [ ] 8–10 generic towers with uniform cornice line
- [ ] McKinney Garage + 2 generic garages built
- [ ] Street grid complete (6 N–S + 4 E–W, with sidewalks, lane lines, curbs)
- [ ] 50 streetlights, 50 trees, 30 fire hydrants placed
- [ ] 4 skybridge shells built (glass + iron frame, no interior yet)
- [ ] Wells Fargo granite plaza built at corner of Louisiana and Rusk
- [ ] Lobbies NOT yet built (Phase 4)
- [ ] Street surface preserved at y=64

---

## 6. Phase 3 — Tunnel Excavation

### 6.1 Goal

Excavate the full 4-quadrant tunnel grid. By the end of this phase, every tunnel corridor, food-court node, and tenant bay is **hollow air space** ready for interior fit-out in Phase 4.

### 6.2 Block specs

**6.2.1 Standard corridor excavation**
- The 4-quadrant tunnel grid has ~600 blocks of corridor total
- Each standard corridor: 3–6 blocks wide × 3 blocks tall × 30–50 blocks long
- Interior clear: y=58 (floor) to y=61 (dropped ceiling); structural ceiling y=62; underside of street y=63
- Preserve the underside of street at y=63
- Estimated void: ~10,000 blocks

**6.2.2 Food-court node excavation**
- 4 food-court nodes (Esperson, Pennzoil, 1001 Fannin, McKinney)
- Each: 4–9 blocks wide × 4 blocks tall × 20–25 blocks long
- Interior clear: y=58 (floor) to y=62 (ceiling); structural y=62
- Estimated void: ~5,000 blocks

**6.2.3 Tenant bay excavation**
- ~50 tenant bays across the 4 food courts and 6 supporting tenant zones
- Each: 2–3 blocks wide × 2–3 blocks deep × 3 blocks tall
- Interior clear: y=58 to y=61
- Estimated void: ~3,000 blocks

**6.2.4 Sump-pump room excavation**
- 1 small 4×4×3 utility room in the McKinney quadrant
- Position: approximately `(10, 58, -100)`
- Estimated void: 50 blocks

**6.2.5 Floodgate shaft excavation**
- 2 floodgate shafts (Wells Fargo, McKinney Garage) at the lobby-to-basement transitions
- Each: 4 blocks wide × 6 blocks tall × 4 blocks deep
- Wells Fargo: `(10, 58 to 64, 0)`
- McKinney: `(10, 58 to 64, -90)`
- Estimated void: 200 blocks

**6.2.6 Skybridge landing excavation**
- 4 skybridge landings at the second floor (y=68) of the connected towers
- Each: 4 blocks wide × 3 blocks tall × 4 blocks deep
- Estimated void: 200 blocks

### 6.3 WorldEdit command reference

```
//pos1 0,57,0
//pos2 92,0,-138
//set air
//mask !y=58-64

// For each food court node:
//pos1 <x1>,57,<z1>
//pos2 <x2>,57,<z2>
//set air
```

### 6.4 Phase 3 quality checkpoint

Before moving to Phase 4, verify:
- [ ] All standard corridor segments excavated to 3–6 blocks wide × 3 blocks tall
- [ ] All 4 food-court nodes excavated to 4–9 blocks wide × 4 blocks tall × 20–25 blocks long
- [ ] All ~50 tenant bays excavated
- [ ] 1 sump-pump room excavated at McKinney
- [ ] 2 floodgate shafts excavated at Wells Fargo and McKinney
- [ ] 4 skybridge landings excavated at y=68
- [ ] **Street surface preserved at y=64** — no breakthrough
- [ ] Food-court node excavations connect continuously to corridor excavations (no air gaps)

---

## 7. Phase 4 — Tunnel Interior

### 7.1 Goal

Place the walls, ceilings, floors, lighting, and wayfinding in every tunnel segment. This phase establishes the **time-staggered cross-section** (1970s / 1990s / 2010s / 1950s) and builds the **lobby-to-basement descent** (the integration of Phase 2's tower shells with Phase 3's tunnel void).

### 7.2 Block specs — Standard corridor (4 era variants)

**7.2.1 1970s Hines-era default (most of the build)**

| Element | Block | Detail |
|---|---|---|
| Walls | `white_concrete` (2 blocks thick on each side) | Off-white painted concrete block |
| Accent stripe | `light_gray_concrete` (1 row) | Every 7 blocks at chair-rail height |
| Floor | `white_wool` | 1970s VCT proxy |
| Floor border | `polished_andesite` (1-block-wide) | Every 4 blocks on each side |
| Ceiling (dropped) | `smooth_stone_slab` (at y=61) | Acoustic-tile proxy, 1-block-thick |
| T-bar grid | `light_gray_wool` (1 row every 4 blocks) | Implied grid pattern |
| Lighting | `sea_lantern` (in ceiling) every 4 blocks | Even fluorescent feel |
| HVAC grilles | `iron_trapdoor` (closed) every 12 blocks | Ceiling register |
| Tenant storefronts | `iron_bars` frame + `light_gray_concrete` door frame + `glass_pane` + backlit sign | Every 6–10 blocks |
| Backlit sign band | `blue_concrete` background + `white_concrete` letters + `redstone_lamp` | Above each storefront |
| Light level | 10 | Even, fluorescent, slightly dim |

**7.2.2 1990s refresh (one quadrant)**

| Element | Block | Detail |
|---|---|---|
| Walls | `light_gray_concrete` | Cooler gray |
| Floor | `gray_wool` | Newer VCT |
| Floor border | `smooth_stone_slab` (1-block-wide) | Every 4 blocks |
| Ceiling | `quartz_slab` (at y=61) | Newer acoustic tile |
| Lighting | `redstone_lamp` (active) every 5 blocks | LED panel proxy |
| Storefronts | Frameless `glass_pane` (no `iron_bars`) | Updated brand colors |
| Light level | 11 | |

**7.2.3 2010s LED refresh (1001 Fannin / Lamar quadrant)**

| Element | Block | Detail |
|---|---|---|
| Walls | `gray_concrete` + `black_concrete` base | Darker gray near-charcoal |
| Floor | `gray_wool` | Dark charcoal porcelain proxy |
| Floor border | `black_concrete` | |
| Ceiling | `black_concrete` (at y=61) | The signature "dark ceiling" |
| Lighting | `end_rod` every 4 blocks + `redstone_lamp` every 6 blocks | Brighter, modern |
| Storefronts | Frameless `glass_pane`, minimal signage | |
| Backlit signage | `redstone_lamp` strip behind `black_concrete` + `white_concrete` letterforms | Modern minimalist style |
| Light level | 12 | |

**7.2.4 1950s-era minimal corridor (JPMorgan Chase basement, at B-26)**

| Element | Block | Detail |
|---|---|---|
| Walls | `smooth_stone` | Raw, unpainted concrete block |
| Floor | `smooth_stone_slab` | Bare concrete |
| Ceiling | (none — exposed structure) | Structural ceiling at y=62 is the street underside |
| Lighting | `redstone_lamp` every 8 blocks | Older fluorescent tube |
| Visible infrastructure | `iron_block` (galvanized ductwork) along ceiling + `red_concrete` (sprinkler riser) verticals | |
| Plaque | `oak_sign` "1950s-era minimal corridor · Ross Sterling under Fannin (1931) · Will Horwitz under Capitol (1935)" | On wall |
| Light level | 8 | |

### 7.3 Block specs — Lobby-to-basement descents

**7.3.1 Wells Fargo Plaza descent (the iconic moment)**

Position: `(10, 58 to 64, 0)` (4 blocks wide × 6 blocks tall × 4 blocks deep)

| Element | Block | Detail |
|---|---|---|
| Revolving door | `glass_pane` (curved wall) + `iron_bars` frame | At street level (y=64) |
| Lobby floor | `polished_andesite` (granite proxy) with `polished_diorite` accent every 8 blocks | At y=64–67 |
| Lobby walls | `light_gray_concrete` + `polished_andesite` base | At y=64–67 |
| Lobby columns | `quartz_pillar` (2-block-wide, 6-block-tall) every 8 blocks | |
| Lobby ceiling | `quartz_slab` (coffered) | At y=67 |
| Lobby lighting | `redstone_lamp` every 4 blocks | Light level 14 |
| Bank of elevators | 4 × `iron_door` (2-block-wide × 3-block-tall) + `iron_block` frame + `light_gray_concrete` surround | At y=64 (rear wall) |
| Interior stair | `polished_andesite_stairs` (4-block-wide, 6 blocks deep) | From y=64 to y=58 |
| Stair handrail | `dark_oak_fence` (each side) | |
| Stair treads | `smooth_stone_slab` | |
| Escalator | `light_gray_concrete` housing + `smooth_stone_slab` steps + `redstone_lamp` handrail | Right side alternative |
| Floodgate | `iron_door` (4 tall × 4 wide) + `iron_block` frame | Closed in build; side passage around it |
| Floodgate brackets | `iron_block` slots on each side | |
| Floodgate marker | `oak_sign` "Floodgate — Tropical Storm Allison 2001" | Next to door |
| Raised threshold | `stone_brick_stairs` (1-block-tall) at lobby-to-basement transition | |
| Building directory | 2-block-wide × 3-block-tall `item_frame` array on `polished_andesite` wall | With "Tunnel → Basement" `oak_sign` |
| Interpretive panel | 3-block-wide × 2-block-tall `item_frame` on `polished_andesite` wall, with 3 rows of `oak_sign` | |
| 1930s origin plaque | 4-block-wide × 3-block-tall `polished_andesite` base + 3 rows of `oak_sign` | East wall, next to interpretive panel |
| 200K sign | `oak_sign` "200,000 daily users" 2 blocks wide × 1 block tall at y=67 above entrance | |

**7.3.2 McKinney Garage descent (the underdog entry)**

Position: `(10, 58 to 64, -82.5)` to `(10, 64, -90)` (entry from Main St sidewalk)

| Element | Block | Detail |
|---|---|---|
| Entry | `glass_pane` + `iron_bars` storefront at street level | |
| Concourse lobby | `light_blue_concrete` walls + `gray_concrete` floor | At y=64 |
| Directory | 1-block `oak_sign` "McKinney Place / 930 Main · Tunnel → Basement" | Smaller than Wells Fargo |
| Interior stair | `polished_andesite_stairs` (4-block-wide, 6 blocks deep) | From y=64 to y=58 |
| Elevator | `iron_door` (2-block-wide × 3-block-tall) | |
| Parking-garage level visible | `gray_concrete` open-deck + `iron_bars` railing + `yellow_concrete` lines | One deck visible mid-descent |
| Floodgate | `iron_door` (3 tall × 3 wide) + `iron_block` frame | Smaller than Wells Fargo |
| Floodgate marker | `oak_sign` "Floodgate — Tropical Storm Allison 2001" | |

**7.3.3 Generic tower lobby descents (6 descents)**

The 4 named anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil, Esperson) and 2 generic towers have generic lobby-to-basement descents. These are simpler versions of the Wells Fargo descent: a small lobby with a directory, an interior stair, and a bank of elevators. Build per tower at the tower's compressed block center.

### 7.4 Block specs — Wayfinding bands

**7.4.1 Standard "Tunnel" wayfinding band**

| Element | Block | Detail |
|---|---|---|
| Background | `blue_terracotta` (or `green_terracotta`) | 4 blocks wide × 1 block tall |
| Letterforms | `white_concrete` (1-block-tall each) | With 1-block space between |
| Backlight | `redstone_lamp` (active) row behind the sign, 1 block above | |
| Arrow | `white_concrete` arrow (1 wide × 2 tall) + `white_concrete_stairs` tip | |
| Mounting | Wall-mounted at y=60 (eye level) | |

**Sign text examples** (place at intersections):
- "Tunnel →"
- "To Wells Fargo Plaza →"
- "← To Pennzoil Place"
- "↑ Esperson / 808 Travis"
- "↓ Lamar Tunnel Food Court"

**7.4.2 Food-court backlit signage band (larger)**

| Element | Block | Detail |
|---|---|---|
| Background | `blue_terracotta` | 6 blocks wide × 2 blocks tall |
| Letterforms | `white_concrete` (2-block-tall) | |
| Backlight | 3 rows of `redstone_lamp` (active) | |
| Mounting | Wall-mounted at y=61, or hung from `chain` from structural ceiling | |

**Sign text:** "Esperson / 808 Travis" · "Pennzoil Place / 711 Louisiana" · "1001 Fannin / One Fannin" · "McKinney Place / 930 Main"

**7.4.3 Total wayfinding bands**

~30 wayfinding bands in the build, distributed at every major corridor intersection. Add the 4 food-court backlit signage bands at food-court entries.

### 7.5 Block specs — Restrooms

4 restrooms: 1 in each food court + 1 in Wells Fargo lobby.

| Element | Block | Detail |
|---|---|---|
| Size | 3 blocks wide × 3 blocks deep × 3 blocks tall | |
| Walls | `quartz_block` | White ceramic tile proxy |
| Floor | `red_terracotta` | Quarry tile |
| Ceiling | `quartz_slab` | |
| Lighting | `redstone_lamp` every 3 blocks | Light level 12 |
| Fixtures (in Phase 5) | Toilet partitions (`iron_bars` + `white_concrete`), sinks (`cauldron` on `quartz_slab`), mirrors (`glass_pane`) | |

### 7.6 Block specs — Sump-pump room (McKinney quadrant)

Position: `(10, 58, -100)` approximately.

| Element | Block | Detail |
|---|---|---|
| Size | 4 wide × 4 deep × 3 tall | |
| Walls/floor/ceiling | `light_gray_concrete` | Utility room |
| Equipment | `cauldron` (sump-pump proxy) on `redstone_lamp` plinth | "Pump running" indicator |
| Piping | `iron_bars` running up wall and across ceiling | |
| Sign | `oak_sign` "Sump Pump · 60 GPM · Backup Power · Flood Control" | 2 blocks wide × 1 block tall |

### 7.7 Phase 4 block budget

| Subtask | Block count |
|---|---:|
| Walls (all eras) | ~25,000 |
| Floors (4 finishes) | ~12,000 |
| Ceilings (3 styles + 1950s exposed) | ~12,000 |
| Lighting | ~1,650 |
| Wayfinding bands | ~300 |
| Lobby-to-basement descents | ~1,500 |
| Floodgate + sump-pump room | ~200 |
| Restrooms | ~400 |
| **Phase 4 total** | **~52,000** |

### 7.8 Phase 4 quality checkpoint

- [ ] The 4 era variants (1970s / 1990s / 2010s / 1950s minimal) are visually distinguishable
- [ ] Transition between eras is a single block (not a gradient)
- [ ] 1970s corridor is the default visual; 1990s in Pennzoil quadrant, 2010s in 1001 Fannin quadrant, 1950s in JPMorgan Chase basement
- [ ] Lobby-to-basement descents built (2 main + 4 skybridge landings + 6 generic tower)
- [ ] 2 floodgates built (Wells Fargo, McKinney)
- [ ] Sump-pump room built and equipped
- [ ] 4–5 restrooms built
- [ ] ~30 wayfinding bands placed at major intersections
- [ ] Water-stained ceiling tiles placed in 1970s corridors (1 in 50 tiles)
- [ ] **Visual test:** walk the standard corridor from Wells Fargo entry to McKinney food court — should be continuous and uniform with no block-placement errors
- [ ] **Time-staggered test:** walk from Esperson (1970s) to 1001 Fannin (2010s) — transition should be visually obvious but not jarring

---

## 8. Phase 5 — Tenant Zones

### 8.1 Goal

Build the **4 food courts** (the signature experience) and the **6 supporting tenant zones** (the dry cleaners, barbers, credit unions, and small services that line the standard corridors).

### 8.2 Block specs — Esperson food court (Q3, Block C-21)

**Position:** `(56, 58, -55)`. **Build-block:** C-21. **Cameron label:** C-21. **Tier:** Tier 1 (signature).

| Element | Block | Detail |
|---|---|---|
| Dimensions | 20 blocks long × 4–6 blocks wide × 4 blocks tall | Single-loaded, narrow corridor |
| Walls | `white_concrete` (1970s off-white) | |
| Accent stripe | `light_gray_concrete` (1 row) at chair-rail height | |
| Floor | `polished_andesite` (beige terrazzo) with `smooth_stone_slab` brass-strip every 8 blocks | |
| Ceiling | `smooth_stone_slab` (1970s white, at y=61) | Older acoustic-tile style |
| Lighting | `sea_lantern` strips every 3 blocks | Brighter than standard corridor; light level 12 |
| Storefronts | 15–18 total, 7–9 on each side | `iron_bars` window frame + `light_gray_concrete` door frame + `glass_pane` window + backlit sign band |
| Kitchen-exhaust grilles | `iron_trapdoor` (closed) in ceiling every 4 blocks | |
| Communal tables | 4–6 × `dark_oak_slab` (2×1 blocks) with `dark_oak_fence` bases | At 4-block intervals down the centerline |
| Chairs | `oak_stairs` around each table | |
| Backlit entry sign | "Esperson / 808 Travis" 6 blocks wide × 2 blocks tall, `blue_terracotta` background + `white_concrete` letters + 3 rows of `redstone_lamp` | At corridor entry |
| Sandra Lord plaque | `oak_sign` (3 wide × 2 tall) on `white_concrete` wall | "Sandra Lord — The Tunnel Lady. Discover Houston Tours since 1991" |
| Approximate block count | ~3,500 | |

**Tenant mix (15–18 storefronts, 13 named + 2 vacant):**

| # | Tenant | Brand colors | Block spec |
|---|---|---|---|
| 1 | Chick-fil-A (corner unit) | `red_concrete` + `red_wool` awning | Counter + menu + queue |
| 2 | Mediterranean Grill House | `yellow_concrete` + `red_concrete` | Counter |
| 3 | Mona | `white_concrete` + `light_gray_concrete` | Counter |
| 4 | Farro | `green_concrete` + `white_concrete` | Counter |
| 5 | Brown Bag Deli | `brown_concrete` + `white_concrete` | Counter |
| 6 | Midtown Dentistry | `white_concrete` + `light_blue_concrete` cross | Service tenant |
| 7 | Downtown Vision Source | `white_concrete` + `light_gray_concrete` | Service tenant |
| 8 | La Taquiza | `yellow_concrete` + `red_concrete` | Counter |
| 9 | Hair Cutters (barber) | `red_concrete` + `white_concrete` + `blue_concrete` (barber-pole stripes) | Service |
| 10 | Schlotzsky's | `red_concrete` + `orange_terracotta` | Counter |
| 11 | Seaside Poke | `cyan_concrete` + `white_concrete` | Counter |
| 12 | Flip n Patties | `yellow_concrete` + `green_concrete` | Counter |
| 13 | Boomtown Coffee | `black_concrete` + `white_concrete` (logo) | Counter, espresso machine |
| 14 | Silver Lining | `white_concrete` + `light_gray_concrete` | Counter |
| 15 | Vacant / For Lease | `light_gray_wool` awning + `white_concrete` "For Lease" sign | |
| 16 | Vacant / For Lease | `light_gray_wool` awning + `white_concrete` "For Lease" sign | |

**Tenant interior spec (each):** 2-block-wide × 2-block-deep × 3-block-tall bay with:
- Counter: `quartz_slab` top + `iron_block` base (1-block-wide × 1-block-deep × 1-block-tall)
- Menu board: `oak_sign` on `smooth_stone_slab` (back wall)
- Accent lighting: `redstone_lamp` (1 per bay)
- 1–2 `item_frame` accent pieces on back wall

### 8.3 Block specs — Pennzoil Place underground (Q3/Q4 boundary, Block D-22)

**Position:** `(79, 58, -55)`. **Build-block:** D-22. **Cameron label:** D-22. **Tier:** Tier 1 (densest).

| Element | Block | Detail |
|---|---|---|
| Dimensions | 6–9 blocks wide × 4 blocks tall × ~25 blocks long | Wider, more congested |
| Walls | `white_concrete` (1970s off-white) | |
| Floor | `polished_andesite` (warm terrazzo) with `gray_wool` patches for 2010s refresh on the western half | **Time-staggered built-in** |
| Ceiling | `smooth_stone_slab` (1970s, east half) + `black_concrete` (2010s, west half) | Time-staggered visual |
| Lighting | `sea_lantern` strips every 3 blocks | Light level 12 |
| Storefronts | 10–12 packed close together, "no clear aisle" feel | |
| Backlit entry sign | "Pennzoil Place / 711 Louisiana" | |
| Hines marker | `oak_sign` (2 wide × 1 tall) "Gerald D. Hines Expansion (1960s–1980s) · 27 buildings · The new tunnel — Sandra Lord" | |
| Approximate block count | ~3,000 | |

**Tenant mix (12 storefronts):**

| # | Tenant | Brand colors |
|---|---|---|
| 1 | Chick-fil-A (smaller) | `red_concrete` + `red_wool` |
| 2 | Michael's Cookie Jar | `brown_concrete` + `white_concrete` |
| 3 | Bodard Express | `red_concrete` + `white_concrete` |
| 4 | Which Wich | `black_concrete` + `orange_concrete` |
| 5 | Paradise Gifts | `magenta_concrete` + `white_concrete` |
| 6 | Murphy's Deli | `green_concrete` + `white_concrete` |
| 7 | Salata | `red_concrete` + `orange_concrete` |
| 8 | Otto's BBQ | `red_concrete` + `black_concrete` |
| 9 | Uncle Sharkii Poke Bar | `cyan_concrete` + `white_concrete` |
| 10 | Treebeards | `brown_concrete` + `green_concrete` |
| 11 | Tunnel Newstand | `yellow_concrete` + `black_concrete` |
| 12 | Starbucks (1100 Louisiana) | `green_concrete` + `lime_wool` |

### 8.4 Block specs — 1001 Fannin / Lamar Tunnel food court (Q1, Block B-16)

**Position:** `(33, 58, -10)`. **Build-block:** B-16. **Cameron label:** B-16. **Tier:** Tier 1 (modern refresh).

| Element | Block | Detail |
|---|---|---|
| Dimensions | 4–6 wide × 4 tall × 20 long | Single-loaded, modern |
| Walls | `gray_concrete` + `black_concrete` base | Cooler, darker |
| Floor | `gray_wool` (dark charcoal porcelain) + `black_concrete` border | |
| Ceiling | `black_concrete` (signature dark ceiling) | |
| Lighting | `end_rod` every 4 blocks + `redstone_lamp` every 6 blocks | Light level 13 |
| Storefronts | 12–14, frameless `glass_pane` (no `iron_bars`), minimal signage | |
| Backlit entry sign | "1001 Fannin / One Fannin" | |
| Approximate block count | ~2,800 | |

**Tenant mix (10 named + 2 vacant):**

| # | Tenant | Brand colors |
|---|---|---|
| 1 | Charlie's BBQ & Hamburgers | `red_concrete` + `black_concrete` |
| 2 | Blackwater Coffee Roasters | `black_concrete` + `white_concrete` |
| 3 | Baoz Dumplings + Boba | `red_concrete` + `white_concrete` |
| 4 | Lenny's Grill & Subs | `red_concrete` + `yellow_concrete` |
| 5 | Addict Tea Cafe | `white_concrete` + `cyan_concrete` |
| 6 | Glamours Variety | `pink_concrete` + `black_concrete` |
| 7 | Red's Barber & Style Shop | `red_concrete` + `white_concrete` + `blue_concrete` |
| 8 | 811 Fitness | `gray_concrete` + `red_concrete` |
| 9 | Boost Mobile / telecom | `yellow_concrete` + `black_concrete` |
| 10 | Vacant / For Lease | `light_gray_wool` awning |
| 11 | Vacant / For Lease | `light_gray_wool` awning |

### 8.5 Block specs — McKinney Place / 930 Main concourse (Q2, Block A-21)

**Position:** `(10, 58, -82.5)`. **Build-block:** A-21. **Cameron label:** A-21. **Tier:** Tier 1 (public-entry food court).

| Element | Block | Detail |
|---|---|---|
| Dimensions | 4–6 wide × 4 tall × 25 long (longest in build) | Linear, services-heavy |
| Walls | `light_gray_concrete` (1990s refresh) | |
| Floor | `gray_wool` + `polished_andesite` border | |
| Ceiling | `quartz_slab` | |
| Lighting | `redstone_lamp` every 5 blocks | Light level 12 |
| Storefronts | 12–14, mostly services | |
| Backlit entry sign | "McKinney Place / 930 Main" | |
| Approximate block count | ~3,200 | |

**Tenant mix (15 named + 2 vacant):**

| # | Tenant | Brand colors |
|---|---|---|
| 1 | Deli Deluxe | `red_concrete` + `white_concrete` |
| 2 | Sparkle Dry Cleaners (prominent) | `light_blue_concrete` + `white_concrete` |
| 3 | Crest Printing | `white_concrete` + `red_concrete` |
| 4 | Shipley's Do-nuts | `pink_concrete` + `white_concrete` |
| 5 | Behold the Beauty (salon) | `pink_concrete` + `black_concrete` |
| 6 | Renato Jewelers | `yellow_concrete` + `black_concrete` |
| 7 | Saul Hair Studio | `red_concrete` + `white_concrete` |
| 8 | Star Chef | `red_concrete` + `white_concrete` |
| 9 | Taka Sushi | `red_concrete` + `black_concrete` |
| 10 | Top Taste Asian | `red_concrete` + `yellow_concrete` |
| 11 | Mayuri Express | `red_concrete` + `yellow_concrete` |
| 12 | Dr. Brian Clemons Chiropractor | `white_concrete` + `blue_concrete` |
| 13 | Cassidy's Mesquite Chicken | `red_concrete` + `black_concrete` |
| 14 | Smoothie Factory | `yellow_concrete` + `green_concrete` |
| 15 | Platinum Parking office | `gray_concrete` + `yellow_concrete` |
| 16 | Vacant / For Lease | `light_gray_wool` awning |
| 17 | Vacant / For Lease | `light_gray_wool` awning |

### 8.6 Block specs — 6 supporting tenant zones (standard corridors)

These are the smaller tenant clusters along the standard corridors between food courts. Each is 2–3 storefronts wide.

**8.6.1 Standard-corridor dry cleaner / barber / credit union cluster (most common)**

Every 30–50 blocks along the standard corridor, a triple of:
- **Dry cleaner** (2×2×3): `light_blue_concrete` sign (Sparkle or generic), `iron_bars` + `glass_pane`, `quartz_slab` counter, `oak_sign` "Drop-off / Pick-up" + "Same-Day Service"
- **Barber** (2×2×3): Red + white + blue `concrete` barber-pole stripes, `oak_sign` "Randy's Barbershop" or generic, `redstone_lamp` accent
- **Credit union** (2×2×3): Blue + gold `concrete`, `iron_bars` + `glass_pane`, `quartz_slab` counter, `oak_sign` "First Service Credit Union"

**8.6.2 Wells Fargo ↔ Pennzoil corridor (30 blocks)**

Kelsey-Seybold Clinic, Boomtown Coffee/Starbucks, Kolache Factory, Tunnel Newstand, Comerica Bank, 2 vacant bays.

**8.6.3 Wells Fargo ↔ Esperson corridor (20 blocks)**

Starbucks (1100 Louisiana), District 7 Grill, Houston Newstand, 1 vacant bay.

**8.6.4 Esperson ↔ Lamar corridor (25 blocks, W. Walker Tunnel named segment)**

El Regio Mexican Grill, Evolutionary Eye Care, Potbelly (orange `concrete`), Sultan Pepper, Wok and Roll, 1 vacant bay.

**8.6.5 Lamar ↔ McKinney corridor (30 blocks, E. McKinney Tunnel named segment)**

2 vacant bays, 1 small office suite, branch to Theater District stub corridor.

**8.6.6 Pennzoil ↔ McKinney corridor (40 blocks, longest, Downtown Tunnel Loop)**

Smoothie King, Pastabilities, R. Rose Clothier, Glamours Sundries, Paradise Cards & Gifts, Airrosti, API Kitchen Southern Food, Bullritos, Luchi & Joey's, Tacos a Go Go, Village Real Pit Barbeque, 3 vacant bays.

Approximate block count for all 6 supporting zones: ~5,000 (including tenant interiors).

### 8.7 Block specs — Tenant interiors (the generic commercial fit-out)

Each named tenant has a small interior:
- Counter: `quartz_slab` top + `iron_block` base (1-block-wide × 1-block-deep × 1-block-tall)
- Menu board: `oak_sign` on `smooth_stone_slab` (back wall)
- Accent lighting: `redstone_lamp` (1 per bay)
- 1–2 `item_frame` accent pieces on back wall

Approximate block count for all tenant interiors: ~6,000.

### 8.8 Phase 5 block budget

| Subtask | Block count |
|---|---:|
| Esperson food court | ~3,500 |
| Pennzoil Place underground | ~3,000 |
| 1001 Fannin food court | ~2,800 |
| McKinney Place concourse | ~3,200 |
| 6 supporting tenant zones | ~5,000 |
| Tenant interiors (all food courts) | ~6,000 |
| Communal tables (4 food courts) | ~400 |
| Restroom fit-out | ~400 |
| **Phase 5 total** | **~24,000** |

### 8.9 Phase 5 quality checkpoint

- [ ] Esperson: 15–18 storefronts with 13 named tenants + 2 vacant bays; single-loaded, narrow corridor
- [ ] Pennzoil Place: 10–12 storefronts; packed, "no clear aisle" feel; time-staggered ceiling
- [ ] 1001 Fannin: 12–14 storefronts, modern minimalism, dark ceiling
- [ ] McKinney Place: 12–14 storefronts, services-heavy, linear concourse
- [ ] All 6 supporting tenant zones built
- [ ] 8–10 "Vacant / For Lease" bays placed
- [ ] Brand colors verified against §2.2 of design plan
- [ ] Communal tables placed in each food court
- [ ] Restrooms fully fitted out
- [ ] **Visual test 1:** stand in middle of Esperson food court and look down the corridor — single-loaded layout should create a perspective effect
- [ ] **Visual test 2:** stand in middle of Pennzoil Place underground — should feel packed and crowded
- [ ] **Visual test 3:** stand in middle of 1001 Fannin food court — should feel 2020s contemporary

---

## 9. Phase 6 — Skybridges + Wayfinding Finish

### 9.1 Goal

Build the 4 skybridge interiors, the 4 skybridge landings, and the final wayfinding sign system.

### 9.2 Block specs — Skybridge interiors

Each skybridge: 1-block-wide × 2-block-tall × 4–7-blocks-long glass-enclosed corridor at y=68.

| Element | Block | Detail |
|---|---|---|
| Walls (long sides) | `glass_pane` (every block) + `iron_bars` mullions every 4 blocks | Glass curtain wall |
| Frame | `iron_bars` structural | |
| Corners | `light_gray_concrete` | |
| Floor | `white_wool` (carpet) on `smooth_stone_slab` (substrate) | |
| Ceiling | `quartz_slab` (acoustic tile) | |
| Lighting | `redstone_lamp` every 4 blocks + `daylight_detector` (active, indicating "daylight detected") | Light level 15 |
| HVAC grilles | `iron_trapdoor` in ceiling | |

**Per-skybridge spec:**

| Skybridge | Length | Span | Tag |
|---|---|---|---|
| McKinney Street | 6 blocks | x=0 to 23, z=-66.5 | `[D]` |
| Travis Street | 5 blocks | z=0 to -110, x=44.5 | `[X]` |
| Louisiana Street (most famous) | 7 blocks | z=-45 to -65, x=67.5 | `[D]` |
| Walker Street | 4 blocks | z=-45 to -65, x=90.5 | `[X]` |

Approximate block count: ~400 (4 skybridges).

### 9.3 Block specs — Skybridge landings

Each landing: 4 blocks wide × 3 blocks tall × 4 blocks deep at y=68.

| Element | Block | Detail |
|---|---|---|
| Walls | `glass_pane` | |
| Vestibule | `iron_bars` frame | |
| Building directory | 1-block `oak_sign` (smaller than ground-floor) | |
| Stair/escalator to tunnel | `polished_andesite_stairs` 2-block-wide × 6-blocks-deep | Down to y=58 |
| "Tunnel → Basement" sign | 1-block `oak_sign` | Smaller than ground-floor |

Approximate block count: ~800 (4 landings).

### 9.4 Block specs — Final wayfinding

- Additional wayfinding bands at secondary corridor intersections (~30 total)
- 4 food-court backlit signage bands (built in Phase 4)
- 2 T-markers (Wells Fargo, McKinney) — see §11
- 4 lobby building directories (Wells Fargo, McKinney Garage, JPMorgan Chase, Pennzoil, Esperson)

Approximate block count: ~600 + 20 (T-markers) + 150 (lobby directories) = ~770.

### 9.5 Phase 6 block budget

~2,000 placed blocks (skybridges + landings + wayfinding).

### 9.6 Phase 6 quality checkpoint

- [ ] All 4 skybridge interiors built (glass walls, carpet floor, acoustic ceiling, lighting)
- [ ] All 4 skybridge landings built and aligned with the lobby-to-basement descents
- [ ] ~30 wayfinding bands complete
- [ ] 2 T-markers placed at the Wells Fargo and McKinney direct entries
- [ ] 4 lobby building directories built
- [ ] **Wayfinding test:** starting at Wells Fargo entry, can a player find their way to every food court using only in-build signage?

---

## 10. Phase 7 — Finishing

### 10.1 Goal

Add the 18+ easter eggs, the final interpretive plaques, the lighting tuning, the time-of-day cycle, the after-hours shutdown, the cleaning-crew NPCs, the climate-control sound, and the verification pass.

### 10.2 Block specs — Easter eggs (18 documented)

**10.2.1 Prominent easter eggs (player-facing, clearly labeled):**

| # | Easter egg | Location | Block spec |
|---|---|---|---|
| 1 | "200,000 daily users" main entry sign | Wells Fargo lobby, y=67 above entrance | `oak_sign` 2 blocks wide × 1 tall, large font |
| 2 | "95+ city blocks / 6 mi / 20 ft below grade" | Same interpretive panel | 3 rows of `oak_sign` |
| 3 | "Wells Fargo Plaza — Direct Street Access" | Wells Fargo entrance | `oak_sign` 1 wide × 1 tall |
| 4 | Esperson food court (808 Travis) labeled at entry | C-21 corridor entry | Backlit sign band |
| 5 | "Tunnel" backlit wayfinding bands | Every major intersection | (built in Phase 4) |
| 6 | T-marker entrance signs | Wells Fargo + McKinney sidewalks | (see §11) |
| 7 | "Tunnel" capitalization | Every sign, plaque, panel | Typographic convention |
| 8 | Time-staggered cross-section (1970s/1990s/2010s) | Visible in corridors | (built in Phase 4) |

**10.2.2 Subtle / faded easter eggs:**

| # | Easter egg | Location | Block spec |
|---|---|---|---|
| 9 | 1930s origin plaque (Ross Sterling / Will Horwitz) | Wells Fargo lobby, east wall | `polished_andesite` base + 3 rows of `oak_sign` |
| 10 | Gerald D. Hines 27-building marker | Pennzoil Place underground | `oak_sign` 2 wide × 1 tall |
| 11 | Sandra Lord "Tunnel Lady" plaque | Esperson food court entry | `oak_sign` 3 wide × 2 tall on `white_concrete` wall |
| 12 | Floodgate + Allison marker | Wells Fargo + McKinney entries | `oak_sign` 2 wide × 1 tall "Floodgate — Tropical Storm Allison, June 2001" |
| 13 | Rockefeller Center inspiration | Referenced in 1930s origin plaque text | (no separate block) |
| 14 | 72°F climate sign | One corridor intersection: (33, 60, -32) | `oak_sign` 1 wide × 1 tall |
| 15 | Theater District performance-night stub | (79, 58, -124) | Stub corridor with `oak_sign` + `iron_door` terminus |
| 16 | Harris County edge sign | (50, 64, -138) | `oak_sign` 2 wide × 1 tall |
| 17 | St. Joseph skywalks edge sign | (130, 64, -50) | `oak_sign` 2 wide × 1 tall |
| 18 | "Vacant / For Lease" bays | 11–13 across food courts + corridors | `light_gray_wool` awning + `white_concrete` "For Lease" sign |

**10.2.3 Atmospheric easter eggs:**

| # | Easter egg | Block spec |
|---|---|---|
| 19 | Time-of-day lighting cycle | Redstone clock 0→6000→12000→18000→0; `redstone_lamp` brightness varies |
| 20 | "1st Shift 06:00 / 2nd Shift 14:00 / 3rd Shift 22:00" sign | `oak_sign` on `light_gray_concrete` wall on a building-engineering door |
| 21 | Water-stained ceiling tiles | `light_gray_wool` and `gray_wool` patches (1 in 50 tiles) in 1970s corridors |
| 22 | After-hours shutdown | McKinney quadrant dims to light level 6 at Minecraft-time 12000 |
| 23 | Cave ambient | Set `/playsound` or ambient `cave` category in tunnel segments |

### 10.3 Block specs — Theater District stub corridor

Position: `(79, 58, -124)` approximately. **Build-block:** D-28. **Cameron label:** D-28.

| Element | Block | Detail |
|---|---|---|
| Dimensions | 3 wide × 3 tall × 10 long | |
| Walls/floor/ceiling | `white_concrete` + `white_wool` + `smooth_stone_slab` (1970s) | |
| Lighting | `redstone_lamp` every 8 blocks (dim) | Light level 5 |
| Performance-night sign | `oak_sign` 2 wide × 1 tall "Theater District · Open Tonight: Performance 7:30 PM" | At corridor entry |
| Terminus | `iron_door` (closed) + `oak_sign` 1×1 "Tunnel Closed · Reopens 6:00 AM Mon" | |

Approximate block count: ~300.

### 10.4 Block specs — After-hours shutdown (one quadrant)

- McKinney quadrant dims to security mode at Minecraft-time 12000
- Redstone clock + `redstone_lamp` low-state (every 12 blocks instead of every 4)
- NPC count drops; a few cleaning-crew NPCs appear
- Elevator banks locked (`iron_door` closed)
- Light level 6 in McKinney quadrant after hours

### 10.5 Block specs — Time-of-day lighting cycle

Redstone clock cycling Minecraft-time 0 → 6000 → 12000 → 18000 → 0.

| Time | State | Light level |
|---|---|---|
| 0 (6 a.m.) | Morning: food courts at peak | 12 (food court), 10 (corridor) |
| 6000 (noon) | Midday: food courts empty, corridors standard | 10 (corridor) |
| 12000 (6 p.m.) | After-hours: McKinney quadrant dims, others normal | 6 (McKinney after-hours), 10 (rest) |
| 18000 (midnight) | Night: all corridors dim, food courts dark | 4 (food court), 6 (corridor) |

Use a **repeater-based clock** with clear on/off indicators and a manual override (lever).

### 10.6 Block specs — NPC placement

- 30–40 `villager` NPCs in office attire (customized with `player_head` skins or `name_tag`)
- Distributed: 8–12 at food courts (peak), 10–15 in corridors, 4 at skybridge landings, 6–8 at lobbies, 4 cleaning crew
- NPC visibility toggle: simplest is `/effect invisibility` on a redstone-clock signal

### 10.7 Block specs — Sound design

- `note_block` blocks at food-court kitchen areas for kitchen clatter
- `cave` ambient in tunnel segments
- `note_block` for register beeps at food counters

Approximate block count for sound: ~30.

### 10.8 Phase 7 block budget

~1,500 placed blocks (easter eggs + redstone + NPC spawn eggs + sound + final lighting tuning).

### 10.9 Phase 7 quality checkpoint

- [ ] All 18+ easter eggs placed
- [ ] 1930s origin plaque at Wells Fargo
- [ ] 200,000 panel at Wells Fargo
- [ ] Hines marker at Pennzoil Place
- [ ] Sandra Lord plaque at Esperson food court
- [ ] 2 floodgate markers at Wells Fargo and McKinney
- [ ] 72°F climate sign at one corridor
- [ ] Theater District performance-night stub corridor built
- [ ] Harris County + St. Joseph edge signs placed
- [ ] 8–10 "Vacant / For Lease" bays placed
- [ ] Water-stained ceiling tiles placed (1 in 50)
- [ ] Time-of-day lighting cycle operational
- [ ] After-hours shutdown operational in McKinney quadrant
- [ ] 30–40 NPCs placed
- [ ] Sound design operational
- [ ] **Easter egg accessibility test:** can a player find all 18+ easter eggs within 30 minutes of focused exploration?
- [ ] **Time-of-day test:** cycle 0→6000→12000→18000 manually; food courts peak at 0, empty at 6000, dim at 12000, dark at 18000
- [ ] **Final navigation test:** walk the entire build from Wells Fargo → McKinney → 1001 Fannin → Pennzoil → Esperson → back; 5–8 minutes, continuous, wayfinding works

---

## 11. Block Palette Reference

Organized by material category. **Every block on this list is approved for the Houston build; any block not on this list requires design-team approval.**

### 11.1 Primary palette — above-ground city

| Element | Primary block | Secondary block | Notes |
|---|---|---|---|
| Tower shell (1980s) | `quartz_block` | `light_gray_concrete` | Granite-and-glass vocabulary |
| Tower shell (1990s–2020s) | `white_concrete` | `gray_concrete` | Steel-and-glass vocabulary |
| Tower window | `light_gray_stained_glass_pane` | `gray_stained_glass_pane` | Strip windows in 3×5 grid |
| Pennzoil mirrored glass | `black_stained_glass_pane` | `gray_stained_glass_pane` | Dark mirrored |
| Tower structural accents | `iron_block` | `light_gray_concrete` | Steel columns / corner trim |
| Tower base / plinth | `polished_andesite` | `polished_diorite` | Granite or marble base |
| Art Deco ornamentation | `smooth_quartz_stairs` | `quartz_pillar` | Esperson terracotta + limestone |
| Street surface | `gray_concrete` | `stone_bricks` | Asphalt |
| Street lane lines | `yellow_concrete` | `white_concrete` | Single rows |
| Sidewalk | `smooth_stone_slab` (top half) | `stone_bricks` (bottom half) | Concrete pavers |
| Curb | `stone_brick_stairs` | `stone_brick_slab` | |
| Plaza paver | `bricks` | `polished_andesite` | Brick or stone |
| Parking-garage exterior | `gray_concrete` | `stone_bricks` | Open-deck concrete |
| Parking-garage interior | `light_gray_concrete` | `yellow_concrete` (lines) | Bare concrete + painted lines |
| Tree (palm) | `jungle_log` + `jungle_leaves` | `oak_leaves` | Houston palm |
| Tree (shade) | `dark_oak_log` + `dark_oak_leaves` | — | Live oak |
| Streetlight | `iron_fence` (pole) + `redstone_lamp` (lamp) | — | Every 8 blocks |
| Fire hydrant | `cauldron` | — | At corners |
| Trash can | `iron_bars` | — | Cylindrical approximation |
| Parking meter | `item_frame` on `oak_fence` | — | Occasional |

### 11.2 Primary palette — tunnel structure

| Element | Primary block | Secondary block | Notes |
|---|---|---|---|
| Tunnel wall (1970s default) | `white_concrete` | `light_gray_concrete` | Painted concrete block |
| Tunnel wall (older 1950s) | `smooth_stone` | `stone_bricks` (lower courses) | Raw concrete block |
| Tunnel wall (1990s refresh) | `light_gray_concrete` | — | Cooler gray |
| Tunnel wall (2010s LED) | `gray_concrete` + `black_concrete` base | — | Darker near-charcoal |
| Tunnel wall (accent stripe) | `light_gray_concrete` (1 row every 5–7 blocks) | — | Chair-rail height |
| Tunnel floor (1970s VCT) | `white_wool` | `smooth_stone_slab` | Off-white vinyl tile |
| Tunnel floor (1990s VCT) | `gray_wool` | `smooth_stone_slab` (border) | Newer VCT |
| Tunnel floor (2010s porcelain) | `gray_wool` | `black_concrete` (border) | Dark charcoal porcelain |
| Tunnel floor (1950s bare concrete) | `smooth_stone_slab` | — | Sealed concrete |
| Tunnel floor (1970s terrazzo) | `polished_andesite` | `smooth_stone_slab` (brass-strip) | Warm earth tones |
| Tunnel floor (utility) | `light_gray_concrete` | `gray_concrete` | Sealed concrete utility |
| Dropped ceiling (1970s) | `smooth_stone_slab` (top side) | `quartz_slab` | Acoustic-tile white |
| Dropped ceiling (1990s) | `quartz_slab` | — | Newer acoustic tile |
| Dropped ceiling (2010s food court) | `black_concrete` (top side) | `gray_concrete` | Black acoustic |
| Dropped ceiling (1950s) | (none — exposed structure) | `gray_concrete` (street underside) | No drop ceiling |
| Dropped ceiling T-bar grid | `stone_slab` (1 row every 4 blocks) | `light_gray_wool` | Implied grid pattern |
| HVAC grille (ceiling) | `iron_trapdoor` | `iron_bars` | Vent register |
| HVAC duct (visible) | `iron_block` (1-block runs) | `light_gray_concrete` | Galvanized ductwork |
| Sprinkler riser | `red_concrete` (1-block vertical runs) | — | Red-painted pipe |
| Fluorescent troffer (1970s) | `sea_lantern` (in slab) | `redstone_lamp` (active state) | Every 4 blocks |
| LED panel (2010s) | `redstone_lamp` (in `black_concrete`) | `end_rod` (accent strips) | Every 4–6 blocks |
| LED panel (1990s) | `redstone_lamp` | — | Every 5 blocks |
| Fluorescent (1950s) | `redstone_lamp` | — | Every 8 blocks |
| Tenant storefront frame | `iron_bars` (window frame) | `light_gray_concrete` (door frame) | Anodized aluminum |
| Tenant storefront glass | `glass_pane` | `white_stained_glass_pane` | Plate glass |
| Tenant awning (fabric) | `white_wool` (Chick-fil-A) | `orange_wool` (Potbelly) | Canvas awning |
| Tenant counter | `quartz_slab` (top) | `iron_block` (base) | Stainless / laminate |
| Tenant menu board | `oak_sign` (with text) | `item_frame` on `smooth_stone_slab` | Backlit menu |
| Communal table | `dark_oak_slab` (top) | `dark_oak_fence` (base) | Laminate table |
| Communal chair | `oak_stairs` | — | Moulded plastic |
| Restroom wall | `quartz_block` | `white_concrete` | White ceramic tile |
| Restroom floor | `red_terracotta` | `brown_terracotta` | Quarry tile |
| Restroom partition | `iron_bars` + `white_concrete` | — | Metal partition |
| Sump-pump room | `light_gray_concrete` | `gray_concrete` | Concrete utility room |
| Floodgate (Wells Fargo) | `iron_door` (4 tall × 4 wide) | `iron_block` (frame / brackets) | Aluminum flood barrier |
| Floodgate (McKinney) | `iron_door` (3 tall × 3 wide) | `iron_block` (frame) | Smaller barrier |
| T-marker (sidewalk) | `oak_pressure_plate` (inlaid) + `oak_sign` (with "T" text) on `oak_fence` post | `blue_concrete` (sign background) | "T" sign on the sidewalk |
| Skybridge wall | `glass_pane` | `white_stained_glass_pane` | Glass curtain wall |
| Skybridge frame | `iron_bars` | `light_gray_concrete` | Brushed aluminum |
| Skybridge floor | `white_wool` (carpet) | `smooth_stone_slab` (substrate) | Concrete + carpet |
| Skybridge ceiling | `smooth_stone_slab` | `quartz_slab` | Acoustic tile |
| Skybridge daylight | `daylight_detector` (active) | — | Daylight indicator |
| Lobby floor | `polished_andesite` | `polished_diorite` (accent) | Marble or granite |
| Lobby column | `quartz_pillar` | `polished_andesite` (capital / base) | Marble-clad column |
| Lobby ceiling | `quartz_slab` | `smooth_stone_slab` | Coffered |
| Bank of elevators | `iron_block` (doors) + `light_gray_concrete` (surround) | `iron_door` (operable) | Brushed-steel |
| Interior stair (down to tunnel) | `polished_andesite_stairs` | `smooth_stone_slab` (treads) | Terrazzo stair |
| Escalator | `light_gray_concrete` (housing) + `smooth_stone_slab` (steps) | `redstone_lamp` (handrail) | Moving stair |
| Revolving door | `glass_pane` (curved wall) | `iron_bars` (frame) | Glass-and-metal |
| Security turnstile | `iron_bars` (cross pattern) | `light_gray_concrete` (housing) | Stainless turnstile |
| Building directory (lobby) | `item_frame` array on `polished_andesite` wall | `oak_sign` (labels) | Brushed-metal directory |
| Building name plaque | `oak_sign` (engraved text) on `polished_andesite` | — | |
| Tunnel → sign (lobby) | `blue_concrete` background + `white_concrete` letter "T" | `oak_sign` "Tunnel → Basement" | |
| Wayfinding band (tunnel) | `blue_terracotta` (background) + `white_concrete` (text) | `redstone_lamp` (backlight) | Backlit wayfinding |
| Exit sign (green) | `lime_concrete` (background) + `white_concrete` (figure) | `redstone_lamp` (backlight) | Illuminated exit |
| Fire alarm | `red_concrete` (small accent) | `oak_sign` "Fire Alarm" | Pull station |
| Cleaning cart | `iron_bars` (frame) + `white_wool` (cloth) | `oak_trapdoor` (bucket) | Service cart |
| Suspended sign (chain) | `chain` | — | Hung from structural ceiling |
| Backlit food-court entry sign | `blue_terracotta` background + `white_concrete` letterforms | 3 rows of `redstone_lamp` (backlight) | 6 wide × 2 tall |
| Origin plaque base | `polished_andesite` (granite) | `oak_sign` (face text) | 4 wide × 3 tall |
| Easter egg signs | `oak_sign` | — | Various sizes |

### 11.3 Secondary palette — tenant zone brand colors

| Brand | Brand color | Primary block | Accent block |
|---|---|---|---|
| Chick-fil-A | Red | `red_concrete` | `red_wool` (awning) |
| Starbucks | Green | `green_concrete` | `lime_wool` |
| Potbelly | Orange | `orange_concrete` | `orange_wool` (awning) |
| Salata | Red-orange | `red_concrete` | `orange_concrete` |
| Treebeards | Brown + green | `brown_concrete` | `green_concrete` |
| Otto's BBQ | Red + black | `red_concrete` | `black_concrete` |
| Maggie Rita's | Red + yellow | `red_concrete` | `yellow_concrete` |
| Murphy's Deli | Green + white | `green_concrete` | `white_concrete` |
| Which Wich | Black + orange | `black_concrete` | `orange_concrete` |
| Brown Bag Deli | Brown | `brown_concrete` | `white_concrete` |
| Blackwater Coffee | Black + cream | `black_concrete` | `white_concrete` |
| Kolache Factory | Red + tan | `red_concrete` | `orange_terracotta` |
| Michael's Cookie Jar | Brown + cream | `brown_concrete` | `white_concrete` |
| Shipley's Do-nuts | Pink + white | `pink_concrete` | `white_concrete` |
| Sparkle Dry Cleaners | Blue + white | `light_blue_concrete` | `white_concrete` |
| Randy's Barbershop | Red + white + blue | `red_concrete` + `white_concrete` + `blue_concrete` (barber pole) | — |
| Comerica Bank | Red + yellow | `red_concrete` | `yellow_concrete` |
| First Service Credit Union | Blue + gold | `blue_concrete` | `yellow_concrete` |
| Paradise Gifts | Magenta | `magenta_concrete` | `white_concrete` |
| Tunnel Newstand | Yellow + black | `yellow_concrete` | `black_concrete` |
| Glamours Sundries | Pink + black | `pink_concrete` | `black_concrete` |
| Uncle Sharkii Poke | Teal | `cyan_concrete` | `white_concrete` |
| La Taquiza | Yellow + red | `yellow_concrete` | `red_concrete` |
| Smoothie King | Yellow + green | `yellow_concrete` | `green_concrete` |
| Boost Mobile / telecom | Yellow | `yellow_concrete` | `black_concrete` |
| Vacant / For Lease | Beige | `light_gray_wool` (awning) | `white_concrete` (sign) |

### 11.4 Atmospheric palette (occasional, low-density)

- **Water-stained ceiling tile:** `light_gray_wool` patches (1 in ~50) at the bottom of `smooth_stone_slab` ceiling panels
- **Older 1970s bare concrete:** `smooth_stone` for 1950s-era minimal corridor
- **1990s refresh color:** `light_gray_concrete` walls (cooler than 1970s off-white)
- **2010s LED refresh:** `black_concrete` ceiling + `gray_wool` floor + `end_rod` accent
- **Back-of-house staff door:** `iron_door` (unlocked) + `oak_sign` "Authorized Personnel"
- **Floodgate marker:** `oak_sign` "Floodgate — Tropical Storm Allison 2001"
- **HVAC hum:** ambient `cave` sound category

---

## 12. Schematic References

### 12.1 Schematic library at `D:\projects\mc-fleet-bot\schematics\`

The repository has ~110 `.schem` files (mostly generic structures, decorations, and small builds from the `sam-demo` collection). **No existing schematic is directly reusable for Houston-specific structures.** The Houston build's defining elements (food courts, skybridges, lobby descents, time-staggered corridors) are all custom and need to be built in-place or as new schematics.

**Potentially reusable (low-priority, with significant modification):**

| Schematic | Reuse potential | Modification needed |
|---|---|---|
| `kitchen.schem` (787 bytes) | Generic kitchen interior | Strip and refit for fast-casual food court stall |
| `lantern.schem` (1832 bytes) | Decorative lighting | Use as streetlight template; replace body with `iron_fence` + `redstone_lamp` |
| `shelf.schem` (544 bytes) | Tenant interior shelving | Use as counter base in tenant interiors |
| `underground-base.schem` (1048 bytes) | Generic underground structure | Reference for tunnel-excavation workflow only; not for the final look |
| `mushroom-house.schem` (1056 bytes) | Generic small building | Reference for "Vacant / For Lease" generic storefront |
| `modern-apartment.schem` (874 bytes) | Generic modern building | Reference for the 1001 Fannin modern refresh aesthetic |
| `contemporary-house.schem` (2115 bytes) | Generic modern building | Same as above |
| `mushroom-cottage.schem` (1353 bytes) | Generic small structure | Reference for skybridge landing scale |

**Reuse strategy:** The above schematics are **reference** for scale and proportion, not direct paste. The Houston build's defining look (1970s office basement, dropped acoustic-tile ceiling, fluorescent troffers) is **not** represented in the existing library.

### 12.2 Custom schematics to create

The following custom `.schem` files should be authored and saved to `D:\projects\mc-fleet-bot\schematics\houston\` for reuse across the build:

| Schematic | Description | Estimated size |
|---|---|---|
| `houston-corridor-1970s-3x3x10.schem` | Standard 1970s Hines-era corridor segment, 3 wide × 3 tall × 10 long | ~800 blocks |
| `houston-corridor-1970s-3x3x30.schem` | Standard 1970s corridor, longer | ~2,400 blocks |
| `houston-corridor-1990s-3x3x10.schem` | 1990s refresh corridor | ~800 blocks |
| `houston-corridor-2010s-led-3x3x10.schem` | 2010s LED refresh corridor | ~800 blocks |
| `houston-corridor-1950s-minimal-3x6x10.schem` | 1950s bare concrete (no drop ceiling) | ~600 blocks |
| `houston-foodcourt-esperson-4x4x20.schem` | Esperson food court shell (no tenant fit-out) | ~3,000 blocks |
| `houston-foodcourt-pennzoil-6x4x25.schem` | Pennzoil Place underground shell | ~3,500 blocks |
| `houston-foodcourt-1001fannin-4x4x20.schem` | 1001 Fannin modern food court shell | ~2,500 blocks |
| `houston-foodcourt-mckinney-4x4x25.schem` | McKinney Place concourse shell | ~3,000 blocks |
| `houston-tenant-bay-2x2x3.schem` | Standard tenant bay interior (counter + menu) | ~150 blocks |
| `houston-t-marker-1x1x4.schem` | T-marker sidewalk plaque (post + sign + pressure plate) | ~10 blocks |
| `houston-floodgate-4x4x6.schem` | Wells Fargo floodgate assembly | ~100 blocks |
| `houston-lobby-descent-wells-fargo-4x6x4.schem` | Wells Fargo lobby-to-basement descent | ~600 blocks |
| `houston-skybridge-mckinney-1x2x6.schem` | McKinney Street skybridge | ~100 blocks |
| `houston-skybridge-louisiana-1x2x7.schem` | Louisiana Street skybridge (longest, most famous) | ~120 blocks |
| `houston-wayfinding-band-4x1.schem` | Standard "Tunnel →" wayfinding band | ~15 blocks |
| `houston-restroom-3x3x3.schem` | Standard restroom | ~150 blocks |
| `houston-sump-pump-room-4x4x3.schem` | Sump-pump room interior | ~200 blocks |

**Schematic creation workflow:**
1. Build a representative instance of the structure in a flat creative world.
2. Use WorldEdit `//copy` and `//schematic save` to export.
3. Save to `D:\projects\mc-fleet-bot\schematics\houston\`.
4. Use `//schematic load` + `//paste` to place instances in the build.

**Bot equivalent (mc-fleet-bot):**
```
POST /api/schematic/save
{
  "name": "houston-corridor-1970s-3x3x10",
  "from": { "x": 0, "y": 58, "z": 0 },
  "to": { "x": 9, "y": 63, "z": 2 }
}

POST /api/schematic/paste
{
  "name": "houston-corridor-1970s-3x3x10",
  "at": { "x": 11, "y": 58, "z": -32 },
  "rotation": "none"
}
```

### 12.3 Schematic reuse across the build

The same `houston-corridor-1970s-3x3x10.schem` can be pasted dozens of times along the standard corridor segments, with `/fill` filling the remaining 1–2-block gaps between instances. This is the highest-leverage schematic in the build — it places ~800 blocks per paste.

---

## 13. Bot-Build Workflow

### 13.1 Recommended bot fleet configuration

Per the working plan §3.3, the build is best done with a fleet of specialized bots:

| Bot | Role | Tasks |
|---|---|---|
| Bot 1–3 (above-ground) | Tower placement | Place 4 anchor towers + 8–10 generic towers in parallel, each bot assigned specific towers |
| Bot 4–6 (tunnel excavation) | Void clearing | Clear the 4-quadrant tunnel void in parallel, each bot assigned a quadrant |
| Bot 7–10 (tunnel interior) | Walls, floors, ceilings, lighting | 4 bots, each assigned a quadrant (Q1, Q2, Q3, Q4) |
| Bot 11 (wayfinding + finishing) | Signs, easter eggs, redstone, NPCs | Sequential, single bot (most detail-intensive) |
| Human overseer | Verification | Verify each phase, approve next phase |

### 13.2 WorldEdit-style fill commands (per phase)

**Phase 1 — Site prep:**
```
//pos1 0,0,0
//pos2 144,63,-138
//set stone

//pos1 0,0,0
//pos2 92,57,-138
//set air
//mask !y=58-64
```

**Phase 2 — Above-ground city shell:**
```
// Tower: Wells Fargo
//pos1 0,64,0
//pos2 20,87,-20
//outline quartz_block
//fill light_gray_stained_glass_pane

// Tower: Pennzoil Place (two mirrored)
//pos1 75,64,-65
//pos2 84,84,-45
//set black_concrete
// hollow inside (preserve air)

// Street grid (1-block-wide centerline strips at y=63)
//pos1 0,63,0
//pos2 144,63,-138
//set gray_concrete
// along street centerlines
```

**Phase 3 — Tunnel excavation:**
```
// Standard corridor
//pos1 11,57,-32
//pos2 16,57,-78
//set air

// Food court node
//pos1 53,57,-65
//pos2 60,57,-45
//set air
```

**Phase 4 — Tunnel interior:**
```
// 1970s corridor walls
//pos1 11,58,-32
//pos2 11,61,-78
//set white_concrete
// (continue on opposite wall at x=16)

// Floor
//pos1 11,58,-32
//pos2 16,58,-78
//set white_wool

// Ceiling (dropped)
//pos1 11,61,-32
//pos2 16,61,-78
//set smooth_stone_slab
```

**Phase 5 — Tenant zones:**
```
// Esperson food court shell
//pos1 53,58,-65
//pos2 60,62,-45
//outline white_concrete
// floor polished_andesite
// ceiling smooth_stone_slab

// Tenant bays (per bay)
//pos1 53,58,-64
//pos2 54,61,-62
//set iron_bars
// (then back wall glass_pane, sign, etc.)
```

**Phase 6 — Skybridges:**
```
// McKinney skybridge
//pos1 0,68,-67
//pos2 23,69,-66
//set glass_pane (long sides)
//set iron_bars (mullions, frame)
```

**Phase 7 — Finishing:**
```
// Wayfinding band
//pos1 11,60,-32
//pos2 14,60,-32
//set blue_terracotta
// (then white_concrete letterforms on top)
```

### 13.3 Schematic placement commands

**Save a schematic:**
```
//pos1 0,58,0
//pos2 9,61,2
//copy
//schematic save houston-corridor-1970s-3x3x10
```

**Load and paste a schematic:**
```
//schematic load houston-corridor-1970s-3x3x10
//paste
// (paste at current position; use //pos1 //pos2 first to set target)
```

**Bot equivalent (mc-fleet-bot):**
```
POST /api/schematic/save
{
  "name": "houston-corridor-1970s-3x3x10",
  "from": { "x": 0, "y": 58, "z": 0 },
  "to": { "x": 9, "y": 61, "z": 2 }
}

POST /api/schematic/paste
{
  "name": "houston-corridor-1970s-3x3x10",
  "at": { "x": 11, "y": 58, "z": -32 },
  "rotation": "none"
}
```

### 13.4 mc-fleet-bot API endpoints used

From the AGENTS.md summary, the relevant API endpoints for this build:

- `GET /api/status` — server status (check before each phase)
- `GET /api/bots` — list active bots (assign roles)
- `POST /api/bots/:name/task` — queue a build task for a specific bot
- `POST /api/build/fill` — region fill (with `preserve_layers` for the tunnel airspace)
- `POST /api/schematic/save` — save a schematic from a region
- `POST /api/schematic/paste` — paste a saved schematic at coordinates
- `POST /api/bots/:name/mode` — change bot mode (e.g., to schematic-paste mode)
- `GET /api/world` — current world state (verify between phases)
- `GET /api/activity` — activity log (audit trail)

### 13.5 Recommended build sequence

1. **Phase 1** — site prep, single bot, ~2–4 hours
2. **Phase 2** — above-ground city, 3 parallel bots, ~8–12 hours
3. **Phase 3** — tunnel excavation, 2 parallel bots, ~4–6 hours
4. **Phase 4** — tunnel interior, 4 parallel bots (one per quadrant), ~12–18 hours
5. **Phase 5** — tenant zones, 1 bot + human-assisted (most detail-intensive), ~10–15 hours
6. **Phase 6** — skybridges + wayfinding, 1 bot, ~3–5 hours
7. **Phase 7** — finishing, 1 bot + human-assisted, ~4–6 hours

**Total bot time:** 43–66 hours.

**Recommended batch:** Run the build overnight as a batch job. The 7 phases can be chained with a phase-completion verification gate between each.

---

## 14. Quality Checkpoints

After each phase, the contractor must verify the build against the design plan before moving on. The quality checkpoints are **gates**: if a checkpoint fails, the next phase is delayed until the issue is fixed.

### 14.1 Visual review checklist

- [ ] The 4 anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil Place with 2 towers, Esperson with 2 towers) are built with the documented architectural signatures
- [ ] The 4 food courts are visually distinct (Esperson single-loaded, Pennzoil packed, 1001 Fannin modern, McKinney linear)
- [ ] The time-staggered cross-section is visible: walking from one quadrant to another, the player sees the era change
- [ ] The Wells Fargo descent is the iconic opening: revolving door → marble lobby → elevator bank → interior stair → floodgate → tunnel corridor
- [ ] The McKinney Garage descent is the *other* direct entry, deliberately less polished
- [ ] Both T-markers (Wells Fargo, McKinney) are present on the sidewalks
- [ ] The 1930s dual-origin plaque is at the Wells Fargo lobby
- [ ] The 200,000 daily users / 95+ blocks / 6 mi / 1930s interpretive panel is at the Wells Fargo lobby
- [ ] The 4 skybridges span named streets at the second-floor level
- [ ] The "Tunnel" capitalization appears on every sign
- [ ] No subway/transit or mall contamination

### 14.2 Lighting test

For each zone, verify the light level matches the design plan:

| Zone | Expected light level | Check |
|---|---|---|
| Street level (day) | 15 | [ ] |
| Street level (night) | 12 (with streetlights) | [ ] |
| Wells Fargo lobby | 14 | [ ] |
| Generic tower lobby | 13 | [ ] |
| Standard 1970s corridor | 10 | [ ] |
| Standard 1990s corridor | 11 | [ ] |
| Standard 2010s LED corridor | 12 | [ ] |
| Standard 1950s corridor | 8 | [ ] |
| 1970s food court (Esperson, Pennzoil) | 12 | [ ] |
| 1990s food court (McKinney) | 12 | [ ] |
| 2010s food court (1001 Fannin) | 13 | [ ] |
| Skybridge | 15 (max, daylight) | [ ] |
| Skybridge landing | 15 | [ ] |
| Sump-pump room | 6 | [ ] |
| Restroom | 12 | [ ] |
| After-hours corridor | 6 | [ ] |
| Theater District stub | 5 | [ ] |

**Test method:** Stand in each zone and check the light level using the F3 debug screen (or equivalent). If the level is off by more than 1, add or remove light sources.

### 14.3 Path / navigation test

The wayfinding test:

1. Start at the Wells Fargo entry (0, 64, 0).
2. Descend to the tunnel (10, 58, 0).
3. Walk to the Esperson food court (56, 58, -55).
4. Continue to the Pennzoil Place underground (79, 58, -55).
5. Walk to the 1001 Fannin food court (33, 58, -10).
6. Continue to the McKinney Place food court (10, 58, -82.5).
7. Return to the Wells Fargo entry via the Wells Fargo lobby.

**Success criteria:**
- The walk takes 5–8 minutes.
- Every food court is reachable from every other food court using only in-build wayfinding bands.
- No dead-ends, no air gaps, no missing wayfinding.
- The lobby-to-basement descents are continuous (no fall-throughs).

### 14.4 Easter egg accessibility test

The 18+ easter eggs should be findable by a player within 30 minutes of focused exploration.

**Test method:** A fresh player (not the contractor) is asked to find as many easter eggs as possible in 30 minutes. The contractor should aim for 18+ easter eggs found.

**Easter eggs that should be obvious to a careful player:**
1. "200,000 daily users" main entry sign
2. "95+ city blocks / 6 mi / 20 ft below grade"
3. "Wells Fargo Plaza — Direct Street Access"
4. Esperson food court signage
5. "Tunnel" backlit wayfinding bands
6. T-marker entrance signs
7. "Tunnel" capitalization
8. Time-staggered cross-section

**Easter eggs that require reading the signage:**
9. 1930s origin plaque (Ross Sterling / Will Horwitz)
10. Gerald D. Hines 27-building marker
11. Sandra Lord "Tunnel Lady" plaque
12. Floodgate + Allison marker
13. Rockefeller Center inspiration
14. 72°F climate sign
15. Theater District performance-night stub
16. Harris County edge sign
17. St. Joseph skywalks edge sign
18. "Vacant / For Lease" bays

**Atmospheric easter eggs (subtle):**
19. Time-of-day lighting cycle
20. "1st Shift 06:00 / 2nd Shift 14:00 / 3rd Shift 22:00" sign
21. Water-stained ceiling tiles
22. After-hours shutdown
23. Cave ambient

### 14.5 Two-layer integration test

The build is a two-layer city (street + tunnel + skybridge). Verify:

- A player on the surface (y=64) can see the city skyline.
- A player in the tunnel (y=58) can see the food courts and corridors.
- A player on the skybridge (y=68) can see daylight and the street below.
- The lobby descent is the visual transition between surface and tunnel.
- The T-markers, lobby directories, and "Tunnel → Basement" signs make the two-layer connection legible to the player.

---

## 15. Open Items

These are the items the contractor may need clarification on, or that depend on the combined-complex report.

### 15.1 Open item 1: T-marker sign design

The T-marker is a small "T" sign on the sidewalk. The Houston convention is described as "small, blue, 'T' inside a circle." The design plan uses:
- `oak_fence` post (4 blocks tall)
- `oak_sign` (1×1) at the top, with `blue_concrete` background, `light_blue_concrete` circle, `white_concrete` "T" letter
- `oak_pressure_plate` inlaid in the sidewalk

**Question:** Should the T-marker include a small `oak_sign` below the post reading "Tunnel Access · 6:00 a.m. – 6:00 p.m. Mon–Fri"? The design plan includes this; verify with the design team if it's required.

### 15.2 Open item 2: SubTropolis public shaft landing plaza design

The SubTropolis public shaft lands at a plaza at the southeast edge of the above-ground city (x=-12.5, z=-55). The plaza is `[X]` invented. The design plan reserves a 10×10 block area but does not specify the full design.

**Required elements:**
- Glass-and-steel canopy
- Stair down
- Turnstile
- Security guard booth
- "Combined Complex Transit Hub — SubTropolis Public Access" sign
- Cross-section 5×5 blocks
- In-world signage: "SubTropolis is a 270-million-year-old limestone mine north of the river; the public shaft connects downtown to the SubTropolis grid. Travel time: ~10 minutes by elevator."

**Open question:** Should the plaza be built in Phase 2 (above-ground city shell) or Phase 7 (finishing)? Recommend Phase 2 for the canopy/turnstile and Phase 7 for the signage/easter egg.

### 15.3 Open item 3: Cheyenne Mountain service tunnel terminus

The Cheyenne Mountain service tunnel terminus is at `(40, -86, -134)`, far below the Houston tunnels. The cross-section is 6×5 blocks. The terminus is `[X]` invented.

**Required elements:**
- Service sub-basement with security gate
- "Service Tunnel — Cheyenne Mountain Complex — Authorized Vehicles Only" sign
- 6×5 cross-section at y=-86 (150+ ft below street level)

**Open question:** Is the service tunnel terminus built in this brief, or in a separate combined-complex brief? It depends on the combined-complex report. For now, mark the position with a small `oak_sign` "Cheyenne Mountain Service Tunnel · 6×5 cross-section · y=-86" and build the terminus in a later phase.

### 15.4 Open item 4: After-hours shutdown design

The after-hours shutdown is either a **static scene** (always rendered as after-hours) or a **time-of-day** lighting cycle (the McKinney quadrant goes dark at Minecraft-time 12000). The design plan uses the **time-of-day cycle**.

**Open question:** Confirm the time-of-day cycle. If static, the build is simpler (no redstone clock needed). If dynamic, the build requires a redstone clock, NPC visibility toggle, and a manual override.

### 15.5 Open item 5: Theater District stub corridor terminus

The Theater District stub terminates in an `iron_door` (closed) with a "Tunnel Closed · Reopens 6:00 AM Mon" sign. The design plan uses the **blocked** option (no real corridor beyond).

**Open question:** Should the stub terminate in a real corridor (extending into a small museum/archaeology layer), or be a dead-end with a door? The blocked option is simpler and is the design plan default.

### 15.6 Open item 6: 1950s-era minimal corridor location

The 1950s corridor is placed in the Lamar quadrant (accessible from the 1001 Fannin food court) per the design plan. The design plan uses 20–30 blocks long.

**Open question:** Confirm the corridor's exact location and length. The design plan places it at the JPMorgan Chase basement (B-26) per the key locations table; the architecture plan places it "in the Lamar quadrant." These are two different placements. **Recommend:** Place the 1950s corridor at the JPMorgan Chase basement (B-26), since that's where the "Horwitz origin" narrative is anchored. The Lamar quadrant has the modern refresh, not the 1950s minimal.

### 15.7 Open item 7: NPC placement and behavior

The design plan calls for 30–40 `villager` NPCs in office attire, with time-of-day visibility (8–12 visible at food courts during peak, fewer during off-peak).

**Open question:** What does "office attire" mean in Minecraft? The simplest implementation is `villager` with profession `nitwit` and a `name_tag` like "Office Worker" or "Cleaning Crew". The most polished is `player_head` with custom skin textures. Recommend `name_tag`-based approach for v0.1; upgrade to `player_head` for v2.0.

### 15.8 Open item 8: Schematic library integration

The schematics folder at `D:\projects\mc-fleet-bot\schematics\` has ~110 existing `.schem` files, none directly reusable for Houston-specific structures. The custom Houston schematics listed in §12.2 need to be created and saved to `D:\projects\mc-fleet-bot\schematics\houston\`.

**Open question:** Should the custom Houston schematics be created **before** the build starts (preferred, for parallel work) or **during** the build (slower, but context-aware)? Recommend creating them during the build, immediately after each phase's representative instance is built. This way, the schematic captures the actual built design, not an idealized version.

### 15.9 Open item 9: Combined-complex coordination

The SubTropolis public shaft and Cheyenne Mountain service tunnel are project fictions. The Houston-side terminus design must match the SubTropolis and Cheyenne Mountain end per their respective discussion documents.

**Open question:** The cross-sections are specified (5×5 for SubTropolis, 6×5 for Cheyenne), but the exact plaza/terminus design depends on the combined-complex team's final decisions. For this build, mark the terminus positions with a small `oak_sign` and build the actual structures in a later phase after the combined-complex report is finalized.

### 15.10 Open item 10: Render-distance and performance tuning

The build's vertical extent is ~150 blocks, but the main build is only 30 blocks tall. The render distance is set to 12–16 chunks by default.

**Open question:** If the player's render distance is set to 8 chunks (the default), the build's two-layer integration becomes harder to see. The contractor should verify the build at the player's likely render distance (8–12 chunks) and adjust if needed. The lobby descent, the T-markers, and the lobby directories are critical for two-layer legibility at low render distances.

### 15.11 Open item 11: HUD and player experience

The build assumes a vanilla Minecraft experience. If the player is using shaders, optifine, or other mods, the lighting and atmosphere may differ.

**Open question:** Should the build be optimized for vanilla (default shaders) or for a specific shader pack? Recommend vanilla for v0.1; consider shader-specific tuning for v2.0 if requested.

### 15.12 Open item 12: Time-of-day cycle scope

The design plan uses a Minecraft-time 0→6000→12000→18000→0 cycle. This is a 20-minute real-time cycle (24000 Minecraft-time = 20 minutes).

**Open question:** Is 20 minutes too fast? The design plan uses 20 minutes for player convenience (visible cycles within a single play session). For a longer cycle (e.g., 1 real-time hour = 24000 Minecraft-time), the time-of-day changes are too slow to observe. Recommend 20 minutes (default) with a manual override lever.

### 15.13 Open item 13: Block budget overrun

The block budget estimate is ~158,000 placed blocks at full v2.0. If the contractor places more blocks (e.g., more tenant fit-out, more decorative elements), the total could exceed 200,000. Render performance may suffer.

**Open question:** Is a higher block count acceptable if the build looks more polished? The contractor should monitor frame rate and adjust if the build becomes unplayable. Recommend a hard cap of 200,000 blocks; if exceeded, simplify Phase 7 (e.g., fewer water-stained tiles, fewer "Vacant" bays).

### 15.14 Open item 14: Combined-complex report dependencies

The Houston build's inter-site connections (SubTropolis public shaft, Cheyenne Mountain service tunnel) depend on the combined-complex report. The Houston-side terminus is built as a `[X]` fiction; the SubTropolis-side and Cheyenne-side termini are in the combined-complex report.

**Open question:** When is the combined-complex report finalized? The Houston build can proceed independently with the `[X]` fictions; the inter-site connections can be wired up in a later phase after the combined-complex report is finalized.

### 15.15 Open item 15: Doc Writer and master plan PDF

This brief is the AI contractor-facing spec. The human-facing master plan PDF is produced by the Doc Writer as a separate downstream task. This brief should be referenced by the master plan PDF as the build-execution counterpart.

**Open question:** Does the master plan PDF need to include the schematic files (.schem) or just the high-level spec? Recommend including the high-level spec only; the schematic files are operational and live in `D:\projects\mc-fleet-bot\schematics\houston\`.

---

*End of contractor brief. The build is ready for execution. Begin with Phase 1 (site prep) and the v0.1 MVP (Wells Fargo entrance only) for the fastest path to a recognizable Houston tunnel replica.*
