# AI Contractor Brief — Cheyenne Mountain Complex

**Build name:** Cheyenne Mountain Complex (CMOC)
**Build ID:** `01-cheyenne-mountain`
**Version:** 1.0
**Author:** AI Contractor Writer
**Date:** 2026
**Status:** Binding for the build contractor (bot or human). Cross-references `04-design/site-plan.md`, `04-design/site-coordinates.json`, `04-design/design-plan.md`, `04-design/working-plan.md`, `04-design/development-plan.md`, `03-discussion/discussion-notes.md`, `03-discussion/culture-architecture-analysis.md`, and `01-research/research-report.md`.

---

## 1. Project Header

| Field | Value |
|---|---|
| **Build name** | Cheyenne Mountain Complex |
| **Build ID** | `01-cheyenne-mountain` |
| **World origin** | `(0, 64, 0)` — sea level, centered on the mountain's vertical axis |
| **Compass** | `north = -Z`, `east = +X`, `up = +Y` (vanilla) |
| **Vertical compression** | 2:1 (1 block = 2 m vertical) |
| **Horizontal compression** | 4:1 (1 block = 4 m horizontal) |
| **Signature detail scaling** | 2× local upscaling on blast doors, springs, and Battle Cab wall of displays |
| **Build height required** | 1,550 blocks (1,450 of mountain + buffer). **Vanilla 384 is insufficient.** |
| **Mod dependency** | **CubicWorld (default 2,048 build height) or equivalent.** Set up modded world *before* any placement. |
| **Engine** | Minecraft Java Edition. Block IDs reference 1.20+ naming where applicable. |
| **Mod pack / world setup** | Custom world with 2,048 build height. Mountain area at world origin; surrounding forest/valley terrain generated naturally. |

**Quick reference — what world to load:**

- World type: default (not superflat) for the surrounding terrain; superflat for the underground build only if needed for chunk-loading speed.
- Build-height mod: **CubicWorld 2,048** (or `MCHigher`, `Cylinder`, or equivalent). Verify a block can be placed at Y=1,514 (mountain peak) before any work begins.
- Difficulty: peaceful (the build is a museum/replica, not a survival game).
- Game rules: `keepInventory=true`, `mobGriefing=false`, `doDaylightCycle=true` (for atmospheric day/night).

---

## 2. Build Targets

### 2.1 Block budget estimate (rough, by phase)

| Phase | Blocks placed | Source |
|---|---|---|
| 1 — Site prep & mountain shell | ~250,000 | `working-plan.md` §6 |
| 2 — Approach (road, portal, parking) | ~4,000 | `working-plan.md` §6 |
| 3 — J-curve tunnel | ~100,000 (incl. carved-out rock) | `working-plan.md` §6 |
| 4 — Blast door airlock | ~700 | `working-plan.md` §6 |
| 5 — Main chamber + building shells | ~50,000 | `working-plan.md` §6 |
| 6 — Building interiors (Battle Cab first) | ~7,000 | `working-plan.md` §6 |
| 7 — Reservoir, finishing, polish | ~3,000 | `working-plan.md` §6 |
| **TOTAL** | **~415,000 blocks** | |

Hand-built, *decorative* block count (not mountain volume): ~50,000–70,000 blocks per `site-coordinates.json` `scale_verification.estimated_hand_built_block_count`.

### 2.2 Time estimate

- **Bot fleet (4–6 parallel bots, WorldEdit + fill):** 37–59 hours of bot work, 1–2 weeks wall-clock.
- **Single human builder (no WorldEdit):** 144–219 hours of focused building, 3–5 weeks wall-clock at full-time pace.
- **Play-through experience (after build):** 20–30 minutes walking; 5–8 minutes from portal to Battle Cab.

### 2.3 Performance expectations

- **Footprint:** ~100×100 active chunks (mountain + chamber + tunnel corridor).
- **Render distance:** 12–16 chunks (a player at the parking lot can see the mountain silhouette and antenna arrays).
- **LOD strategy:** Forest (spruce/oak/dark oak) at default render distance; chamber interior is enclosed, no LOD concern.
- **Tick budget:** Pitfalls: redstone clocks (ambient sway) at slow pulse, chunk-load on the 800-block tunnel. Pre-generate the tunnel corridor before testing.

### 2.4 Quality acceptance criteria

The build is *done* when all of the following are true (binding from `working-plan.md` §4 and `design-plan.md`):

1. The mountain reads as a forested three-peaked foothill from the parking lot, with antenna arrays on the ridgeline and the portal as a small mark on the cliff face.
2. Walking the approach road, the portal feels "small" — a maintenance entrance, not a vault door.
3. The tunnel cannot be seen end-to-end at any point (the J-curve works).
4. The tunnel wall character changes: rough rock (Stage 1) → concrete-lined (Stage 2) → polished institutional (Stage 3).
5. The two blast doors (2× scaled) are visible from the main tunnel and *loom* larger than the tunnel itself.
6. The airlock chamber reads as a *threshold* — the visitor feels the transition from "outside" to "inside."
7. Standing at the chamber entrance, all 15 buildings are visible in a 5×3 grid on visible spring arrays.
8. The 1,319 spring count sign is honest (4–6 visible per building; total claim matches).
9. The Battle Cab wall of displays dominates the room. The 1980 false alarm plaque is readable on the first visit.
10. The Granite Inn is the *only* place with warm light in the build; the visitor feels the contrast.
11. The Stargate Command door is findable but not on the main path. One door, one sign, nothing else Stargate.
12. The 1980 plaque text is **full** (per the deliberation; do not abbreviate).
13. The full play-through takes 20–30 minutes.

---

## 3. Coordinate System

### 3.1 World origin

- **(0, 64, 0)** — sea level, centered on the mountain's vertical axis.
- All coordinates in this brief are **absolute world coordinates** (not relative to build origin).
- Vanilla sea level is Y=64. The mountain extends from Y=64 to Y=1,514. Vanilla 384 build height is **insufficient**.

### 3.2 Compass orientation

- `north = -Z`, `east = +X`, `up = +Y` (vanilla convention).
- The mountain's three peaks are oriented along the X axis (north-south actually translated to the world's negative Z):
  - North peak (highest Z, behind the portal): `(-100, 1,400, -400)`
  - Central peak (highest, the antenna summit): `(0, 1,514, 0)`
  - South peak: `(100, 1,400, 200)`
- The North Portal faces **north (-Z)**: the portal archway's interior is at `(0, 1,100, -500)`.
- The approach road comes from the public gate at `(0, 80, -900)` (north of the mountain, in the -Z direction).
- The tunnel runs *south* (toward +Z) from the portal, then bends *east* (toward +X), then bends *south* again into the chamber.

### 3.3 How to interpret the coordinate tables

- **Anchor (0, 0):** world origin (0, 64, 0).
- **Above-ground Y range:** 64 (sea level) to ~1,514 (peak).
- **Chamber Y range:** 1,196 (floor) to 1,214 (ceiling). Rock cover above ceiling = 300 blocks (~2,000 ft at 2:1 vertical compression).
- **Tunnel Y range:** 1,100 (portal) descending to 1,196 (chamber) over ~860 blocks. The tunnel *descends* through the mountain, then travels horizontally at chamber elevation.
- **Building interior Y:** 1,197 (chamber floor) up to 1,206 (top of 3-story) or 1,203 (top of 2-story). Building base = chamber floor at y=1,196, but the building's *base plate* sits 1 block above the chamber floor (visible air gap for the springs).

---

## 4. Phase 1 — Site Prep (Mountain Shell)

### 4.1 Goal

A forested multi-peaked mountain, 1,450 blocks tall, with a flat chamber ceiling 300 blocks below the peak. The exterior is anonymous: trees, exposed rock, antenna arrays, but no obvious military structures.

### 4.2 Prerequisites

- Modded world with 2,048 build height loaded and verified. Place a test block at Y=1,514 — if the block places successfully, the build height is sufficient.
- World origin established at `(0, 64, 0)`.
- Bot roster online: 1–2 sphere/cylinder painters for the mountain mass, 1 forest bot for tree cover, 1 antenna bot for ridgeline structures.

### 4.3 Block specs

**Mountain shell (the exterior):**
- **Primary material:** `minecraft:granite` (~60%), `minecraft:pink_terracotta` (~25%), `minecraft:red_terracotta` (~15%) for variation. Use WorldEdit sphere brushes at varying radii to produce a natural-looking silhouette.
- **Cliff faces:** `minecraft:granite`, `minecraft:polished_granite`, `minecraft:pink_terracotta` in patchy mixes. Use `minecraft:stone` accents for variation. Reference real Pikes Peak granite — pink-to-brick-red, not gray.
- **Mountain silhouette:** Three peaks; central peak at `(0, 1,514, 0)` (highest), north peak at `(-100, 1,400, -400)`, south peak at `(100, 1,400, 200)`. Footprint X: -300 to +300, Z: -800 to 0 (600 × 800 blocks base).
- **Chamber ceiling (placed during this phase, not carved yet):** A flat `minecraft:granite` slab at Y=1,214, X: -22 to +23, Z: 38 to 63 (the 45×25 chamber footprint at the ceiling). This becomes the *floor* of the mountain when the chamber is carved in Phase 5.

**Forest cover (around the base):**
- **Tree palette:** 60% `minecraft:spruce` (ponderosa pine), 30% `minecraft:oak` (scrub oak), 10% `minecraft:dark_oak` (mature stands).
- **Ground cover:** `minecraft:coarse_dirt`, `minecraft:podzol`, `minecraft:grass_block`; `minecraft:moss_block` in shaded areas.
- **Tree line:** ~Y=1,300 (about 85% up the mountain). Above tree line: bare rock with patches of `minecraft:coarse_dirt` and `minecraft:tall_grass`.
- **Forest extent:** 50–80 blocks from the mountain base, then thinning into the surrounding valley.
- **Wildlife (decorative):** A few `minecraft:chicken` and `minecraft:cow` near the parking lot (released into the world, not in enclosures).

**Antenna arrays (5 total, on the ridgeline):**
- Antenna 1 (central peak N): base at `(-50, 1,500, 0)`, 30 blocks tall. `minecraft:iron_block` (3×3 base) + `minecraft:lightning_rod` (mast) + `minecraft:chain` cross-bracing.
- Antenna 2 (central peak E): `(50, 1,500, 0)`, 30 blocks tall.
- Antenna 3 (central peak S): `(0, 1,500, 50)`, 30 blocks tall.
- Antenna 4 (north peak): `(-100, 1,400, -400)`, 25 blocks tall.
- Antenna 5 (south peak): `(100, 1,400, 200)`, 25 blocks tall.
- Each antenna sits on a small `minecraft:light_gray_concrete` pad (3×3). Small `minecraft:oak` equipment shacks (4×6) at the base of each.

### 4.4 Verification

- Stand at the future parking lot (`y=600` on the north face) and look at the mountain. The mountain should *look like a mountain*, with three visible peaks, trees, exposed rock, antenna arrays on the ridges. The portal location (Y=1,100, -500) should be a *small* dark mark on the north face, not visible from this distance.
- Verify a test block at Y=1,514 places successfully (build height check).

### 4.5 Acceptance

- The site reads as a mountain with a hidden portal.
- The mountain's mass is visible from the approach road (Phase 2 will add the road, but the silhouette should be impressive from the start).
- The chamber ceiling slab is in place at Y=1,214, ready for Phase 5 carving.

---

## 5. Phase 2 — Approach (Road, Portal, Parking Lot)

### 5.1 Goal

A switchback road leading from the public gate to a small parking lot, with the North Portal arch in the cliff face. The portal reads as "a maintenance entrance to a state park" — small, unassuming, anonymous.

### 5.2 Prerequisites

- Phase 1 complete (mountain shell, forest, antennas in place).

### 5.3 Block specs

**Approach road (public gate to parking lot):**
- **Origin:** Public entrance gate at `(0, 80, -900)`.
- **Path:** Switchback up the north face of the mountain, climbing from Y=80 to Y=600. ~600 blocks of switchback, 520 blocks of elevation gain.
- **Surface:** `minecraft:gravel` (main surface), `minecraft:coarse_dirt` (edges), `minecraft:path` (shoulders).
- **Width:** 4–5 blocks. `minecraft:cobblestone_wall` 1 block high on outer edges (guardrail).
- **Retaining walls:** `minecraft:stone` on cut faces.

**Final switchback (parking lot to portal):**
- **From:** `(0, 600, -815)` (parking lot center)
- **To:** `(0, 1,100, -500)` (portal entrance)
- **Length:** ~200 blocks. Elevation gain: 500 blocks.
- **Surface:** `minecraft:smooth_stone` or `minecraft:light_gray_concrete` (transition from gravel to a more formal surface).
- **Lighting:** `minecraft:redstone_lamp` posts every 20 blocks (dim, OFF in the day; can be wired to a daylight sensor or always-on).

**Parking lot:**
- **Bounds:** X: -200 to +200, Y: 600 to 620, Z: -850 to -780 (40 × 70 blocks cleared area, ~40% up the mountain).
- **Surface:** `minecraft:gravel` + `minecraft:coarse_dirt` mixed.
- **Security checkpoint trailer:** Small `minecraft:oak` building (6 × 8 × 4) at `(-50, 605, -800)`. `minecraft:dark_oak_door`, 1 `minecraft:redstone_lamp` inside.
- **Security gate:** `minecraft:iron_fence` (chain-link) flanking the parking lot, with `minecraft:iron_fence_gate` at the parking lot entry. `minecraft:chain` on top of the fence as concertina wire.
- **Signage:** `minecraft:oak_sign` posts with "STOP", "SPEED LIMIT 15", "MANDATORY USE OF HEADLIGHTS", "EMPLOYEES ONLY / AUTHORIZED PERSONNEL".
- **Parking markers:** 4–6 `minecraft:oak_fence` posts.
- **Decorative vehicles:** 2–3 `minecraft:minecart` with `minecraft:chest` ("official vehicles").
- **Jersey barriers:** `minecraft:smooth_stone_slab` rows, 1 block high, in front of the guardhouse.

**North Portal (exterior):**
- **Position:** `(0, 1,100, -500)` — set into the cliff face on the north side, ~70% up the mountain.
- **Arch dimensions:** 7 blocks wide × 5 blocks tall (vehicle-width at compressed 4:1 scale).
- **Frame:** `minecraft:light_gray_concrete` for the lintel and jambs, with `minecraft:iron_block` corner caps. The frame protrudes 1 block from the cliff face.
- **Opening behind:** `minecraft:black_concrete` (the dark interior void; the visitor sees black, not the tunnel interior).
- **"CHEYENNE MOUNTAIN COMPLEX" lettering:** Above the arch, on a horizontal `minecraft:light_gray_concrete` panel (the lintel). Each letter is 3×5 blocks of `minecraft:black_wool` on the concrete background. Total panel: 22 blocks wide × 4 blocks tall. Format: "CHEYENNE" on the top-left, "MOUNTAIN" on the top-right, "COMPLEX" on the line below.
- **Speed-limit-15 sign:** `minecraft:oak_sign` reading "SPEED LIMIT 15", mounted on `minecraft:oak_fence` 1 block off the ground, on the right side of the arch.
- **Stop sign:** `minecraft:oak_sign` reading "STOP", or a `minecraft:red_concrete` octagon with `minecraft:white_wool` border, inside the arch opening.
- **Guardhouse:** A small 3×3 `minecraft:light_gray_concrete` + `minecraft:glass_pane` structure to the right of the portal entrance, with `minecraft:dark_oak_door` and 1 `minecraft:redstone_lamp` inside.
- **Perimeter:** `minecraft:iron_fence` on both sides of the road, 3 blocks tall, with `minecraft:iron_fence_gate` at the parking lot. `minecraft:chain` on top as concertina wire.
- **Optional plaque:** "ALTERNATE JOINT OPERATIONS CENTER" (current operational designation) on a small `minecraft:oak_sign` to the side of the main lettering.

### 5.4 Verification

- Walk the approach road from the public gate to the parking lot. The road should *feel* like a mountain road — winding, gravel, forested, with the mountain looming.
- Stand in the parking lot and face the portal. The portal should be *small* and *unassuming*, with the "CHEYENNE MOUNTAIN COMPLEX" lettering readable from the lot. The visitor should feel "is that it?" — the paradox of the exterior.

### 5.5 Acceptance

- The portal reads as "a maintenance entrance to a state park" — the paradox of the exterior.
- The approach road, parking lot, and security perimeter are complete.
- The lettering is readable from the parking lot (test by standing at the lot, facing the portal).

---

## 6. Phase 3 — J-Curve Tunnel

### 6.1 Goal

An 800-block curved tunnel from the portal entrance to the chamber, with three wall-character stages (rough rock → concrete-lined → polished institutional). The visitor cannot see from one end to the other at any point. The J-curve is the *cinema* of the approach.

### 6.2 Prerequisites

- Phase 1 complete (mountain shell in place to carve through).
- Phase 2 complete (portal interior facing at `(0, 1,100, -500)`).

### 6.3 Block specs

**Tunnel cross-section:** 5 blocks wide × 4 blocks tall (player-sized with headroom; per `site-plan.md` §4.2).

**Path geometry (5 segments, ~860 blocks total):**

| Segment | From (X, Y, Z) | To (X, Y, Z) | Length | Direction | Notes |
|---|---|---|---|---|---|
| **Leg 1 (south, descending)** | `(0, 1,100, -500)` | `(0, 1,180, -300)` | ~200 blocks | South, -Z; descends 80 blocks from Y=1,100 to Y=1,180 | The visitor cannot see the far end. The blast door side-branch opens to the **west** (left) at `(-100, 1,170, -250)`, ~250 blocks in. |
| **Bend 1 (east)** | `(0, 1,180, -300)` | smooth curve to `(30, 1,180, -300)` | ~30 blocks | South-to-east | Smooth 90° curve. |
| **Leg 2 (east, mostly level)** | `(30, 1,180, -300)` | `(300, 1,196, -300)` | ~300 blocks | East, +X; slight ascent from Y=1,180 to Y=1,196 | The tunnel approaches chamber elevation. |
| **Bend 2 (south)** | `(300, 1,196, -300)` | smooth curve to `(300, 1,196, -270)` | ~30 blocks | East-to-south | The ceiling rises here; the visitor can sense the chamber ahead. |
| **Leg 3 (south, level)** | `(300, 1,196, -270)` | `(50, 1,196, 200)` | ~500 blocks | South, +Z; level | The tunnel widens; the chamber becomes visible at the end. |
| **Chamber entry** | `(50, 1,196, 200)` | opens into chamber | — | — | The visitor enters the chamber from the *north* end. |

**Stage 1 walls (Leg 1, blocks 0–200 from portal: raw rock):**
- Walls: `minecraft:granite`, `minecraft:polished_granite`, `minecraft:pink_terracotta`, `minecraft:red_terracotta` (Pikes Peak palette).
- Ceiling: same granite, with `minecraft:stone` accents. `minecraft:chain` hanging from ceiling every 5–8 blocks (rock-bolt plates).
- Floor: `minecraft:gravel` (the temporary construction surface).
- Lighting: 1 `minecraft:redstone_lamp` every 30 blocks (sparse).
- Atmosphere: *rough*, *unfinished*.

**Stage 2 walls (Bend 1 + Leg 2, blocks 200–500: concrete liner begins):**
- Walls: `minecraft:light_gray_concrete` on the lower 2–3 blocks, with `minecraft:granite` above.
- Floor: `minecraft:polished_andesite` (finished floor).
- Ceiling: `minecraft:stone` + `minecraft:light_gray_concrete` alternation, with `minecraft:iron_bars` as additional rock bolts.
- **Pipes (right wall, 1 block off the floor, 1 block thick, running the length of Stage 2):**
  - `minecraft:green_concrete` — water
  - `minecraft:red_concrete` — fire suppression
  - `minecraft:yellow_concrete` — fuel
  - `minecraft:blue_concrete` — compressed air
- Cable trays (left wall): `minecraft:oak_fence` + `minecraft:chain` (wooden-tray-metal-cable aesthetic).
- Lighting: `minecraft:redstone_lamp` every 15 blocks (dim).
- Atmosphere: *finished* but *industrial*.

**Stage 3 walls (Bend 2 + Leg 3, blocks 500–860: polished institutional):**
- Walls: `minecraft:light_gray_concrete` to ceiling.
- Floor: `minecraft:polished_andesite` with `minecraft:iron_trapdoor` (laid flat) accent strips every 20 blocks.
- Ceiling: `minecraft:light_gray_concrete` with `minecraft:end_rod` light strips every 8 blocks (recessed).
- Pipe runs: same as Stage 2, but cleaner, with `minecraft:redstone_lamp` "valve" indicators.
- **Fire doors** every 100 blocks: `minecraft:light_gray_concrete` + `minecraft:iron_door` + small `minecraft:glass_pane` porthole, with `minecraft:oak_sign` reading "FIRE DOOR — KEEP CLOSED".
- Atmosphere: *permanent*, *institutional*. The chamber is visible at the end.

**Side niches (16 total):**
- Every 50 blocks, a 2×2×3 alcove off the right wall, with `minecraft:redstone_lamp` + `minecraft:oak_sign` ("Niche 7", "Niche 14", etc., numbered sequentially) + `minecraft:chest` for "emergency supplies."

**"DEAD AIR" sign:**
- Stage 2, at the ~400-block mark, in a wall niche. `minecraft:oak_sign` reading: "DEAD AIR — 22 DAYS — NO RAIN, NO WIND, NO BIRDS."

**Side-branch for blast doors (carved in Phase 3, built in Phase 4):**
- 4 blocks wide × 4 blocks tall × ~10 blocks long, off the **west** (left) side of Leg 1, at `(-100, 1,170, -250)`. The branch curves slightly (radius 10 blocks) so the visitor doesn't see the doors until the last few blocks.
- The floor steps down 1 block at the branch entrance.

### 6.4 Verification

- Walk the entire tunnel from portal to chamber entry. The visitor should *not* be able to see from one end to the other at any point.
- The wall character changes: rough at the start, concrete-lined in the middle, polished at the end. The visitor should *feel* the progression.
- The lighting is dim but walkable. The visitor feels *inside* the mountain.

### 6.5 Acceptance

- The J-curve feel comes through. The visitor cannot see ahead.
- The three-stage wall treatment is visible.
- The DEAD AIR sign is in place at ~400-block mark.
- The blast door side-branch is carved and ready for Phase 4.
- Total tunnel walk time on foot: 5–8 minutes (target locked by `discussion-notes.md` Topic 1).

---

## 7. Phase 4 — Blast Door Airlock

### 7.1 Goal

The cinematic moment. Two 2×-scaled iron doors in a side-branch, with an airlock chamber between them. The threat model is visible in the build.

### 7.2 Prerequisites

- Phase 3 complete (the side-branch at `(-100, 1,170, -250)` is carved).

### 7.3 Block specs

**Side-branch (off Leg 1, at `(-100, 1,170, -250)`):**
- 4 blocks wide × 4 blocks tall × ~10 blocks long, curving slightly.
- The branch ends at the first blast door, with the airlock chamber, then the second blast door, then a ~30-block chamber-side access tunnel that re-enters the main tunnel near Leg 2 / Bend 2.

**Door 1 (the one the visitor sees first, at the tunnel side):**
- **Dimensions:** 6 blocks tall × 4 blocks wide × 1 block thick (3× the tunnel width — the 2× signature-detail scaling).
- **Material:** `minecraft:iron_block` face, with `minecraft:black_concrete` as a 1-block frame around the perimeter.
- **Bracing pattern:** `minecraft:iron_bars` in a chevron / "Z" pattern on the door face, every block.
- **Hinges:** 3 `minecraft:chain` columns on the *tunnel side* of the door, connecting to `minecraft:iron_block` hinge posts. Visible 1-block-thick hinges on the left side.
- **Angle:** Door is angled **outward** at 5–10°. Use `minecraft:iron_block` stair blocks to create the angle. (The angled door reads as "this door seals *tighter* under blast pressure.")
- **Hand-crank backup operator:** A `minecraft:chain` column on the right side of the door, with `minecraft:anvil` at the top as the crank handle. A `minecraft:oak_sign` reads "HAND CRANK — EMERGENCY OPERATION ONLY".
- **Door state (default):** Door 1 is **OPEN** (post-1992 reality). The gap is 4×6 blocks; the visitor walks through into the airlock chamber.

**Door 2 (the chamber-side door, identical to Door 1):**
- Default state: OPEN. Identical construction, same chevron bracing, same hinges, same hand-crank.

**Airlock chamber (between Door 1 and Door 2):**
- **Dimensions:** 12 blocks long × 8 blocks wide × 6 blocks tall.
- **Floor:** `minecraft:polished_andesite` (smooth, institutional).
- **Walls:** `minecraft:light_gray_concrete` with `minecraft:iron_block` corner reinforcement.
- **Ceiling:** `minecraft:light_gray_concrete` with 4 `minecraft:redstone_lamp` (the chamber is *brighter than the tunnel* — this is the contrast).
- **Signage (all `minecraft:oak_sign`):**
  - Above Door 1: "AIRLOCK — DOOR 1 OF 2"
  - Above Door 2: "AIRLOCK — DOOR 2 OF 2 — CHAMBER ACCESS"
  - Center wall: "POSITIVE PRESSURE — KEEP DOORS CLOSED IN ALERT"
  - On Door 1 face: "DANGER — BLAST DOOR" (above) + "25 TONS — DO NOT BLOCK" (below the hand-crank)
  - On Door 2 face: same warning markings
  - At the airlock entrance: "AUTHORIZED PERSONNEL ONLY"
  - On the left wall: "DURING COLD WAR: ONE DOOR ALWAYS CLOSED. CURRENTLY: BOTH OPEN."
  - **Main historical signage** (oak wall sign, 4 blocks wide): "BLAST DOOR — 25 TONS — 30 MT @ 1.2 MI" + "BLAST VALVE TESTED DAILY" + "CLOSED 11 SEPTEMBER 2001"
- **Floor markings:** `minecraft:red_concrete` chevron stripes (1 block wide) at Door 1 and Door 2.
- **Equipment:**
  - Right wall: 2 `minecraft:chest` (labeled "Pressure Equalization", "Emergency Seals" via `minecraft:oak_sign` on each).
  - Center: a 1×1×6 `minecraft:chain` column (a structural support reading as a pipe).

**Chamber-side access tunnel:**
- ~30 blocks long, from the back of the airlock to the main tunnel near Leg 2 / Bend 2.
- The visitor re-enters the main tunnel and continues south to the chamber.

### 7.4 Verification

- Walk from the main tunnel into the side-branch, through Door 1, into the airlock chamber, and out through Door 2 to the chamber access tunnel. The visitor should *feel* the threshold moment.
- Look back from the chamber access tunnel at the open airlock. The two doors should *frame* the tunnel mouth in the dim distance. This is the *postcard shot*.
- The chevron bracing and hinges are visible from 5+ blocks away. The doors read as *imposing* (larger than the surrounding tunnel).

### 7.5 Acceptance

- The threat model is visible in the build. The doors are defense against *something*, and the visitor passes through that defense.
- The "25 TONS" / "30 MT @ 1.2 MI" / "CLOSED 11 SEPTEMBER 2001" signage is correct and readable.
- The doors loom larger than the tunnel (2× signature-detail scaling is visible).

---

## 8. Phase 5 — Main Chamber (The Money Shot)

### 8.1 Goal

The 45×25×18 chamber array, with 15 building shells on visible spring arrays under a single rock ceiling. The industrial cathedral. The visitor's first view from the chamber entrance must show *all 15 buildings* in their grid.

### 8.2 Prerequisites

- Phases 1–4 complete.

### 8.3 Block specs

**Chamber volume:**
- **Bounds:** X: -22 to +23, Y: 1,196–1,214, Z: 38–63 (45 wide × 18 tall × 25 deep).
- **Carving:** Use WorldEdit or `//fill x1 y1 z1 x2 y2 z2 minecraft:air` to remove the rock inside the chamber volume. The chamber ceiling (placed in Phase 1) stays as `minecraft:granite`.

**Chamber ceiling:**
- `minecraft:granite` + `minecraft:polished_granite` + `minecraft:pink_terracotta` (bare rock).
- `minecraft:iron_bars` rock-bolt columns from ceiling to upper wall, every 8–10 blocks, with `minecraft:iron_block` base plates.
- **1962 fault repair dome:** 2–3 areas where the ceiling shows a `minecraft:light_gray_concrete` dome (6×6 blocks). Place a `minecraft:oak_sign` reading "1962 FAULT REPAIR — CONCRETE DOME — $2.7M" near each.
- Lighting strips: `minecraft:end_rod` lines recessed into the ceiling, running E-W, every 6 blocks. `minecraft:redstone_lamp` clusters at the cross-tunnel intersections.

**Chamber floor:**
- Main paths: `minecraft:polished_andesite` (institutional, like an aircraft carrier interior).
- Service paths (between buildings, at the chamber edges): `minecraft:iron_trapdoor` laid flat (metal grating feel).
- Walkway under each building (visible spring area): `minecraft:black_concrete` (a deliberate "you can see the springs here" strip).
- **Painted markings:** `minecraft:yellow_concrete` line (1 block wide) running E-W along Z=48 (the main axis — also the visitor's main path). Smaller `minecraft:yellow_concrete` line running N-S at X=-2 (the Battle Cab's column).
- **Drainage:** A 1-block-wide `minecraft:gravel` strip along the chamber edges, with occasional `minecraft:water` source blocks (natural mountain spring water seeping in).

**Chamber walls:**
- `minecraft:granite` + `minecraft:pink_terracotta` mix, with `minecraft:light_gray_concrete` patches where rock bolts or conduit runs are.
- Pipe runs along the lower 2 blocks of the chamber wall (color-coded, same as Stage 2 tunnel): `minecraft:green_concrete` (water), `minecraft:red_concrete` (fire), `minecraft:yellow_concrete` (fuel), `minecraft:blue_concrete` (air). `minecraft:oak_sign` labels every 20 blocks ("WATER — DOMESTIC", "FIRE SUPPRESSION — DO NOT BLOCK").
- Cable trays: `minecraft:oak_fence` lines along the upper wall, with `minecraft:chain` "cables" hanging.
- **Blast valve (one, on the south chamber wall, near the reservoir access tunnel):** A `minecraft:chain` column with `minecraft:iron_block` valve wheel. `minecraft:oak_sign` reading "BLAST VALVE — NBC VENT — CLOSES ON OVERPRESSURE".

**The 1,319 spring array (the signature):**
- **Per-building spring count (rendered):** 4–6 *visible* spring columns per building at 2× scale. The visible count is symbolic; the *honest* count is on signage.
- **Spring visual design (the 2× scaled version):**
  - Base plate: `minecraft:iron_block` (1×1)
  - Coil: 2–3 `minecraft:chain` blocks stacked vertically
  - Top cap: `minecraft:anvil` (the "spring under load" look)
  - Total height: 4 blocks
  - A 1-block air gap between the top cap and the building floor above (the *visible* decoupling)
  - `minecraft:oak_sign` at the base of each visible spring: "1000 LB / 65,000 LB CAP"
- **Master sign at chamber entrance:** A 4-block-wide `minecraft:oak_wall_sign` reading "1,319 SPRINGS — 1,000 LB EACH — INSTALLED 1964 — NEVER REPLACED".
- **Per-building spring count signs:** `minecraft:oak_sign` at each building base: "BUILDING X — ~88 SPRINGS — TOTAL 1,319".
- **Cross-section building (Building #7):** The south wall is removed so the visitor can see *into* the spring base. They see: chamber floor → 1 block of air gap → spring base plates → chain coils → air gap → building floor. A `minecraft:oak_sign` next to the cross-section: "1 INCH NORMAL MOVEMENT / 12 INCHES EXTREME EVENT".
- **Optional ambient sway (Building #7):** Subtle, ambient vertical sway (0.25–0.5 blocks, slow). Use `minecraft:slime_block` + `minecraft:piston` + `minecraft:observer` with a slow redstone clock (30–60 second pulse). The visitor should *notice* it after a few seconds, then realize what they're seeing. **Not player-triggered** (per `discussion-notes.md` Topic 3).

**The 15 free-standing buildings (5×3 grid):**

| ID | Name | Pos (X, Y, Z) | Footprint (X × Z) | Height (Y) | Type | Function |
|---|---|---|---|---|---|---|
| 1 | Air Defense Operations Center | `(-18, 1,197, 41)` | 6 × 5 | 9 | 3-story | Ops center — radar tracking |
| 2 | Missile Warning Center | `(-10, 1,197, 41)` | 6 × 5 | 9 | 3-story | Ops center — missile status |
| 3 | Space Control Center | `(-2, 1,197, 41)` | 6 × 5 | 9 | 3-story | Ops center — orbital tracking |
| 4 | Combined Intelligence Watch | `(6, 1,197, 41)` | 6 × 5 | 9 | 3-story | Ops center — briefing |
| 5 | Support / utility | `(14, 1,197, 41)` | 6 × 5 | 9 | 3-story | Support — server racks |
| 6 | Communications / Operations support | `(-18, 1,197, 48)` | 6 × 5 | 9 | 3-story | Operations support |
| **7** | **Systems Center / Power Distribution** | **`(-10, 1,197, 48)`** | 6 × 5 | 9 | 3-story | **THE CROSS-SECTION BUILDING** |
| **8** | **Battle Cab (Command Center)** | **`(-2, 1,197, 48)`** | **8 × 7** | **11** | **3-story** | **OPS CENTER — CENTERPIECE** |
| 9 | Operations support (battle staff) | `(6, 1,197, 48)` | 6 × 5 | 9 | 3-story | Battle Staff Support |
| 10 | Weather Operations Center | `(14, 1,197, 48)` | 6 × 5 | 9 | 3-story | Weather data |
| 11 | Chapel | `(-18, 1,197, 55)` | 6 × 5 | 6 | 2-story | Human space |
| 12 | Granite Inn (bar) | `(-10, 1,197, 55)` | 6 × 5 | 6 | 2-story | Human space |
| 13 | Medical / Dental | `(-2, 1,197, 55)` | 6 × 5 | 6 | 2-story | Support |
| 14 | Administrative / utility | `(6, 1,197, 55)` | 6 × 5 | 6 | 2-story | Support |
| 15 | Stargate Command corridor (server + WOPR) | `(14, 1,197, 55)` | 6 × 5 | 6 | 2-story | Support |

- **Building count: 12 three-story + 3 two-story = 15** (binding per `discussion-notes.md` Topic 3, source: Air & Space Forces Magazine, July 2016).
- Building #11 (Chapel), #12 (Granite Inn), #13 (Medical/Dental) are the 3 two-story buildings; the other 12 are three-story.
- **Footprints (interior):** 3-story = 6 wide × 5 deep × 9 tall (3 blocks per floor); 2-story = 6 × 5 × 6 (3 blocks per floor). Battle Cab is *larger*: 8 × 7 × 11 (3+ blocks per floor).
- **1-block air gap** between each building's base and the chamber floor (for the visible spring decouple).
- **18-inch clearance (1 block):** Each building is 1 block from any rock wall or adjacent building. The 1-block gap is *deliberate*; the visitor walks through these gaps.

**Building shells (all 15):**
- **Exterior walls:** `minecraft:light_gray_concrete` (institutional skin).
- **Floor (each floor):** `minecraft:polished_andesite` in corridors (or `minecraft:blue_wool` in Battle Cab, `minecraft:light_gray_wool` in other ops centers).
- **Ceiling (each floor):** `minecraft:light_gray_concrete` with `minecraft:redstone_lamp` strips every 6 blocks.
- **Doors:** `minecraft:iron_door` (the brushed-steel institutional door).
- **Windows:** None. The buildings are *windowless*. (This is the *defining* feature.)
- **Connectors between buildings:** 1-block-wide `minecraft:light_gray_concrete` walkways with `minecraft:iron_fence` railings, 1 block above the chamber floor (so the visitor can see the springs below).
- **Signage at each entrance:** `minecraft:oak_wall_sign` with format "B-XX / BUILDING NAME / FUNCTION".

**Chamber entrance signage (the "you are entering" set):**
- Above the chamber entry (at the end of Leg 3 of the tunnel): A 4-block-wide `minecraft:oak_wall_sign` reading "MAIN CHAMBER — 4.5 ACRES (1967) — 3 MAIN TUNNELS × 4 CROSS TUNNELS".
- The 1,319 master sign (above).
- The operational dates signage:
  - "FEBRUARY 6, 1967 — FULLY OPERATIONAL (PRIMARY)" (primary, prominent)
  - "APRIL 20, 1966 — COMBAT OPERATIONS CENTER DECLARED OPERATIONAL (SECONDARY)"
- The designer-interpretation placard (REQUIRED per `discussion-notes.md` Topic 4):
  > "OPERATIONS CENTER INTERIORS — These rooms are designer interpretations based on declassified public information, 2006–2016 public photographs, and the 1978 GAO report on the five operating centers. Layouts, console arrangements, and equipment placements are not the real facility layouts."

**Power plant room (off the south side of the chamber, at `(0, 1,197, 100)`):**
- 6 large "generators" (2 rows of 3): `minecraft:piston` + `minecraft:observer` contraptions, or `minecraft:iron_block` blocks with `minecraft:redstone_lamp` gauges. A wall of `minecraft:redstone_repeater` behind them (the "battery bank").

**Diesel reservoir room (off the south side, at `(0, 1,197, 130)`):**
- Sealed room, `minecraft:black_concrete` walls, `minecraft:magma_block` floor (subtle warmth), `minecraft:redstone_lamp` as warning lights, `minecraft:oak_sign` reading "DIESEL STORAGE — 1.5 MILLION GALLONS — SEALED".

**Air intake blast valve (faded reference, on south chamber wall at `(0, 1,200, 100)`):**
- A 4×4×3 `minecraft:iron_block` structure with a heavy `minecraft:iron_door`, a small `minecraft:oak_sign` "AIR INTAKE", and a `minecraft:redstone_lamp` as a warning light. Not tourable.

### 8.4 Verification

- Stand at the chamber entrance (`(50, 1,196, 200)`) and look in. The visitor should see: the 15 buildings in their 5×3 grid, the visible springs, the walkways, the rough rock ceiling, the cable runs, the dim institutional lighting. The "industrial cathedral" feeling.
- Walk between the buildings on the 1-block walkways. The springs should be *visible* under each building as the visitor passes.
- Visit the cross-section building (Building #7) and confirm the spring stack is fully visible.
- Confirm the 1,319 master sign is correct and visible.
- Confirm the Battle Cab (#8) is centered on the main E-W visitor path.

### 8.5 Acceptance

- The "industrial cathedral" feel comes through.
- All 15 buildings are visible from the chamber entrance.
- The springs are visible and *honest* (4–6 visible per building; total claim is 1,319).
- The cross-section building shows the spring stack.
- The Battle Cab (#8) is centered on the main path.

---

## 9. Phase 6 — Building Interiors

### 9.1 Goal

All 15 building interiors, with the Battle Cab (#8) as the visual climax. Family resemblance among the 5 ops centers, but each distinct.

### 9.2 Order of construction (binding from `working-plan.md` Phase 6)

1. Battle Cab (#8) — the climax, do first
2. The 4 other ops centers (#1 Air Defense, #2 Missile Warning, #3 Space Control, #4 Combined Intelligence Watch) — family resemblance, simpler
3. The 5 middle-chamber support buildings (#5, #6, #7, #9, #10) — server rooms, briefing rooms, offices
4. The 5 south-chamber buildings (#11 Chapel, #12 Granite Inn, #13 Medical/Dental, #14 Administrative, #15 Server/WOPR/Stargate)
5. The Stargate Command door (in #15, back corridor) — single door, single sign
6. The WOPR terminal (in #15, back corner)
7. The Chrystal Palace sign (in a back corridor)
8. The MrBeast sign (in the Granite Inn, back wall)
9. The DEAD AIR sign (already in Phase 3, tunnel)
10. The 1979 false alarm plaque (in #2 Missile Warning Center, optional)

### 9.3 Battle Cab (#8) — the climax

**Position:** `(-2, 1,197, 48)`, 8 wide × 7 deep × 11 tall (3 floors, 3-4 blocks per floor).
**Visual reference era:** 2006–2016 (per `discussion-notes.md` Topic 4).
**Atmosphere:** Cold War institutional. Beige chairs, CRT consoles, dim fluorescent, "dead air" feel.

**Per-floor spec:**

| Floor | Y range | Contents |
|---|---|---|
| Ground floor (entry) | 1,197–1,200 | `minecraft:blue_wool` floor. Iron door entrance at the back. The 1980 plaque on the back wall to the right of the entrance. 2 `minecraft:light_gray_wool` chairs. The "B-08 / BATTLE CAB / COMMAND CENTER" sign above the door. |
| Main floor (the wall of displays) | 1,200–1,204 | The signature: 2×2 grid of large display panels across the front (12-block-wide wall). The U-shape of consoles facing the wall. The 8 time-zone clocks. The "WELCOME TO THE NORAD COMMAND CENTER" ticker. |
| Upper floor (mezzanine) | 1,204–1,208 | Catwalk / observation area. `minecraft:light_gray_concrete` floor, `minecraft:oak_fence` railings. 2 `minecraft:light_gray_wool` chairs. Optional: a `minecraft:jukebox` for the "active electronics" hum. |

**The wall of displays (the 2× signature detail, 12 blocks wide × 4 blocks tall at the front):**

- **Top row (2 blocks tall):** A 2-panel layout, each 5 wide × 2 tall:
  - **Top-left panel (5×2):** World map as an item-frame mosaic. 10 `minecraft:item_frame` with `minecraft:filled_map`, arranged 5 wide × 2 tall, on a `minecraft:black_concrete` backing, backlit by `minecraft:redstone_lamp` behind.
  - **Top-right panel (5×2):** Status display as an item-frame mosaic. 10 `minecraft:item_frame` with `minecraft:filled_map` (or banner), arranged 5 wide × 2 tall, on a `minecraft:black_concrete` backing, backlit by `minecraft:redstone_lamp` behind. Pattern: alternating red/white/blue banners to suggest 1980s ASCII status panels.
  - Below the top row, a `minecraft:red_concrete` ticker on `minecraft:black_concrete` background running the full 12-block width: "WELCOME TO THE NORAD COMMAND CENTER" in `minecraft:light_gray_wool` letters (5 blocks tall).
- **Middle row (1 block tall):** 8 time-zone labels. Use `minecraft:clock` blocks + `minecraft:oak_sign` alternating across the 12-block width, with the labels: **ZULU / EXERCISE / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW**. (The exact 8 labels from the 2006 NORAD Battle Cab photo.) The 8 labels are the *exact* documented set; the 4-clock minimum mentioned in the deliberation is overridden by the iconic 8.
- **Bottom row (1 block tall):** Console desks (see below).

**The U-shape of operator consoles (6 stations, facing the wall of displays):**
- **Center desk:** 2 `minecraft:note_block` consoles facing the wall, 2 blocks deep.
- **Left arm:** 2 `minecraft:note_block` consoles perpendicular to the center desk.
- **Right arm:** 2 `minecraft:note_block` consoles perpendicular to the center desk.
- **Total: 6 operator positions.**
- Each console: `minecraft:note_block` (the "computer"), `minecraft:oak_sign` on the wall behind with station label ("CD — COMMAND DIRECTOR", "SD — SENIOR DIRECTOR", "WC — WEATHER COORD", "WC2", "DO — DIRECTOR OF OPERATIONS", "BMC — BATTLE MANAGEMENT COORD"), a `minecraft:lever` (the "key"), a `minecraft:redstone_lamp` (the "screen glow").
- **Beige executive chairs:** 6 `minecraft:light_gray_wool` blocks (or `minecraft:white_wool`) at chair height (`minecraft:light_gray_wool_slab` for the chair seat), 1 block in front of each console.

**The 1980 false alarm plaque (the moral, the real history):**
- **Position:** Just inside the Battle Cab, on the back wall to the right of the entrance door. First thing the visitor sees.
- **Plaque build:** 3 blocks wide × 2 blocks tall `minecraft:light_gray_concrete` panel on the wall. `minecraft:black_wool` 1×1 letterforms (3×5 per letter) on the concrete background. `minecraft:black_concrete` 1-block border around the panel.
- **Lighting:** A `minecraft:soul_lantern` above the plaque (the *only* warm-feeling light in the Battle Cab). A `minecraft:redstone_lamp` with `minecraft:red_concrete` backing next to the plaque (the "alert" reference).
- **Text (FULL, per the deliberation; do NOT abbreviate):**

> **JUNE 3, 1980**
>
> A 46-CENT COMPUTER CHIP FAILED IN
> THE MISSILE WARNING NETWORK.
>
> NORAD BRIEFLY REPORTED 2,200 SOVIET
> ICBMs INBOUND. BOMBER CREWS TOOK
> THEIR STATIONS.
>
> NATIONAL SECURITY ADVISOR
> ZBIGNIEW BRZEZINSKI WAS WOKEN
> AT 3:00 A.M. HE DID NOT WAKE
> HIS WIFE, CALCULATING SHE HAD
> MINUTES TO LIVE.
>
> THE ALERT WAS RESOLVED WHEN A
> THIRD CALL REPORTED NO RADAR OR
> SATELLITE CONFIRMATION.
>
> "GOING TO WAR. AND IT CAME DAMN
> CLOSE TO TAKING THE COUNTRY
> WITH IT."
> — OFFICE OF TECHNOLOGY ASSESSMENT

### 9.4 The 4 other ops centers

Each is 6 wide × 5 deep × 9 tall, with `minecraft:light_gray_wool` floor (slight variation from the Battle Cab's blue), `minecraft:light_gray_concrete` walls, `minecraft:redstone_lamp` ceiling strips. Family resemblance, but distinct.

**#1 Air Defense Operations Center (radar tracking):**
- 2 wall screens (3 wide × 2 tall each), item-frame mosaics with banner patterns: one shows a "radar sweep" (circular), one shows a "track table" (grid of dots).
- 3 `minecraft:note_block` consoles in a row facing the wall, each with a `minecraft:lever` and a `minecraft:redstone_lamp` indicator.
- 3 `minecraft:light_gray_wool` chairs.
- Sign above the door: "B-01 / AIR DEFENSE OPERATIONS CENTER".
- Detail: `minecraft:oak_sign` "TRACKING 24/7 — BMEWS / PAVE PAWS / JSS".

**#2 Missile Warning Center (data-room; hosts the optional 1979 plaque):**
- 1 large wall screen (4 wide × 2 tall), item-frame mosaic of "global map with trajectories."
- 2 smaller side screens (1×2 item-frame mosaics) showing ASCII status panels.
- 3 `minecraft:note_block` consoles, 1 with a `minecraft:redstone_lamp` blinking (the 1979/1980 alarm reference).
- 3 `minecraft:light_gray_wool` chairs.
- Sign: "B-02 / MISSILE WARNING CENTER".
- Detail: `minecraft:oak_sign` "DSP / SBIRS SATELLITE FEED — 22,000 MI ALTITUDE".
- **Optional 1979 plaque (back wall, smaller):** 2 wide × 1 tall `minecraft:light_gray_concrete` panel, `minecraft:black_wool` text:
  > **NOVEMBER 9, 1979**
  > A 427M TEST PROGRAM WAS INADVERTENTLY
  > UPLOADED TO THE LIVE WARNING SYSTEM.
  > 1,400 SOVIET ICBMs REPORTED.
  > RESOLVED IN 6 MINUTES.

**#3 Space Control Center (orbital tracking, the star-map signature):**
- **Star map on the ceiling:** A 4 wide × 3 deep `minecraft:blue_wool` ceiling section with ~12 `minecraft:white_wool` "stars" placed randomly. The *distinctive* feature of this room.
- 3 `minecraft:note_block` consoles facing the side wall.
- 2 wall screens (item-frame mosaics) on the side wall, showing orbital paths (concentric ring patterns).
- 3 `minecraft:light_gray_wool` chairs.
- Sign: "B-03 / SPACE CONTROL CENTER".
- Detail: `minecraft:oak_sign` "SPACE SURVEILLANCE NETWORK — 24/7 ORBITAL TRACKING".

**#4 Combined Intelligence Watch (smaller briefing-style room):**
- 1 large wall screen (3 wide × 2 tall) showing a "world situation map."
- Central `minecraft:oak_slab` table (3 wide × 2 deep), with 4 `minecraft:light_gray_wool` chairs around it.
- 2 `minecraft:note_block` consoles on the side wall.
- Sign: "B-04 / COMBINED INTELLIGENCE WATCH".
- Detail: `minecraft:oak_sign` "ALL-SOURCE INTELLIGENCE — 24/7 WATCH".
- The "Chrystal Palace" code-name sign is in a back corridor (per §9.6), not inside this room.

### 9.5 The support buildings (5–7, 9–10) and human spaces (11–15)

**#5 Support / utility:** Server racks (`minecraft:chest` + `minecraft:note_block` rows, blinking `minecraft:redstone_lamp` indicators). Item-frame mosaic walls showing radio frequency maps. `minecraft:oak_sign` "B-05 / SUPPORT / SECURE COMMS".

**#6 Communications / Operations support:** Briefing rooms, planning tables (`minecraft:oak_slab`), chairs, a wall map. `minecraft:oak_sign` "B-06 / COMMUNICATIONS".

**#7 Systems Center / Power Distribution (the CROSS-SECTION building):** Power distribution, battery banks, the 6 diesel generator control panels. **The south wall is removed** to show the spring array underneath. The ambient sway contraption is here. `minecraft:oak_sign` "B-07 / SYSTEMS CENTER".

**#9 Operations support (battle staff):** Briefing rooms, planning tables. `minecraft:oak_sign` "B-09 / BATTLE STAFF SUPPORT".

**#10 Weather Operations Center:** Weather data screens, synoptic charts, 2 `minecraft:note_block` consoles. A satellite-image banner (`minecraft:blue_wool` + `minecraft:white_wool` cloud shapes) on the wall. `minecraft:oak_sign` "B-10 / WEATHER OPERATIONS".

**#11 Chapel (the quiet room, 2-story):**
- Ground floor: `minecraft:oak_planks` floor, `minecraft:spruce_planks` walls (lower 3 blocks), `minecraft:light_gray_concrete` walls (upper 3 blocks). `minecraft:spruce_planks` ceiling with `minecraft:shroomlight` cluster at the center.
- 4 rows of `minecraft:oak_stairs` pews (2 deep × 4 wide each row), facing the altar.
- Altar: `minecraft:oak_slab` (1 wide × 1 deep × 1 tall) at the front, with 1 `minecraft:soul_lantern` (a single candle) and a small `minecraft:oak_fence` cross.
- Stained glass window: `minecraft:light_blue_stained_glass_pane` cross pattern on the back wall (2 wide × 3 tall, with a cross shape in `minecraft:white_stained_glass_pane`).
- `minecraft:oak_sign` outside: "B-11 / CHAPEL — NONDENOMINATIONAL — QUIET PLEASE".
- `minecraft:oak_sign` inside: "FOR USE BY ALL FAITHS — SCHEDULE ON DOOR".
- Second floor: storage loft (3–4 `minecraft:chest`).

**#12 Granite Inn (bar, 2-story, the *only* warm-lit room):**
- Ground floor (the bar):
  - `minecraft:oak_planks` floor, `minecraft:dark_oak_planks` walls (lower 3 blocks), `minecraft:light_gray_concrete` walls (upper 3 blocks).
  - `minecraft:dark_oak_planks` ceiling with `minecraft:shroomlight` clusters (warm amber).
  - Bar counter: `minecraft:dark_oak_slab` along the north wall (6 long × 1 wide × 1 tall).
  - 4 `minecraft:dark_oak_fence` stools in front of the counter.
  - 6 `minecraft:potion` items (use `minecraft:glass_bottle` + `minecraft:magenta_dye` for the colorful look) on a shelf behind the counter.
  - Chalkboard: `minecraft:oak_wall_sign` on the wall behind the bar: "TODAY'S SPECIAL: $1 BEER / $2 BURGER / $3 STEAK".
  - 3–4 `minecraft:oak_stairs` booths along the south wall.
  - `minecraft:oak_sign` outside: "GRANITE INN — EST. 1967".
  - `minecraft:oak_sign` inside: "FOR PSYCHOLOGICAL MAINTENANCE OF PERSONNEL — OFFICIAL USE".
  - **MrBeast sign** on the back wall: `minecraft:oak_sign` reading "$1 vs $1,000,000,000,000 — THE NUCLEAR BUNKER — MrBeast (2025)". A hidden `minecraft:gold_block` behind a `minecraft:painting` on the wall — the YouTube play button, a tiny detail for the explorer.
- Upper floor (the dining area):
  - `minecraft:oak_planks` floor, `minecraft:dark_oak_planks` walls.
  - 3–4 `minecraft:oak_slab` tables (2×2), each with 4 `minecraft:oak_stairs` chairs.
  - `minecraft:shroomlight` clusters, dim.
  - `minecraft:oak_sign` "DINING FACILITY — 24/7 FOR STAFFED SHIFTS".

**#13 Medical / Dental (2-story, single nod per `discussion-notes.md` Topic 2):**
- Ground floor: `minecraft:white_wool` floor, `minecraft:light_gray_concrete` walls. 1 `minecraft:white_bed` (medical bed), 1 `minecraft:oak_slab` reception desk, 1 `minecraft:quartz_stairs` dental chair.
- `minecraft:oak_sign` "B-13 / MEDICAL / DENTAL".
- Second floor: 4 `minecraft:chest` for "pharmacy supplies," 1 `minecraft:brewing_stand` for "compounding."

**#14 Administrative / utility (2-story):**
- `minecraft:oak_planks` floor, `minecraft:light_gray_concrete` walls. `minecraft:oak_slab` desks, `minecraft:oak_stairs` chairs, `minecraft:chest` filing cabinets, a small break area.
- `minecraft:oak_sign` "B-14 / ADMINISTRATIVE".

**#15 Stargate Command corridor (2-story, server room + WOPR + Stargate door):**
- Ground floor: `minecraft:light_gray_wool` floor, `minecraft:light_gray_concrete` walls. Server racks (`minecraft:chest` + `minecraft:note_block` rows) with blinking `minecraft:redstone_lamp` indicators. `minecraft:oak_sign` "B-15 / SERVER ROOM".
- **The WOPR terminal** (in a back corner behind the server racks, per `design-plan.md` §14.1):
  - A 1×2 area with a `minecraft:note_block` "terminal" on a `minecraft:black_concrete` desk.
  - A `minecraft:redstone_lamp` "screen" above.
  - Item-frame mosaic on the wall behind: 1 `minecraft:filled_map` with a chess-board banner.
  - `minecraft:oak_sign` next to the terminal: "GREETINGS PROFESSOR FALKEN" in `minecraft:green_wool` letters.
  - Smaller `minecraft:oak_sign` below: "WOPR — WAR OPERATION PLAN RESPONSE — Wargames (1983) movie reference".
- **The Stargate Command door** (in a back corridor off #15, the *only* Stargate reference):
  - A `minecraft:dark_oak_door` (the "Stargate Command" door).
  - Above the door: `minecraft:oak_wall_sign` reading "STARGATE COMMAND" in `minecraft:black_wool` 3×5 letterforms on `minecraft:light_gray_concrete` background.
  - Smaller `minecraft:oak_sign` next to the door: "AUTHORIZED PERSONNEL ONLY".
  - **Behind the door:** A 2×2 `minecraft:light_gray_concrete` room with a single `minecraft:chest` ("mops") and a `minecraft:oak_sign` "JANITORIAL". The visitor who opens the door sees the joke *and* the joke's punchline. There is no stargate, no iris, no Asgard. The door is the entire reference.
- Second floor: more server racks, utility storage.

### 9.6 The Chrystal Palace sign (Wargames code name)

- **Location:** A back corridor between #12 and #13, on the back wall.
- **Build:** A `minecraft:oak_sign` reading "CHRYSTAL PALACE — ALTERNATE NORAD EXERCISE CODE NAME, c.1980s". A smaller `minecraft:oak_sign` below: "REFERENCE: Wargames (1983)".

### 9.7 Verification

- Enter the Battle Cab (#8). The wall of displays should *dominate* the room. The 1980 plaque should be *readable* on the first visit. The U-shape of consoles should be *clearly* a U. The lighting should be *dim with the screens as the bright spots*.
- Visit all 4 other ops centers (#1, #2, #3, #4). Each should be *recognizably different* (radar / missile status with optional 1979 plaque / star map / briefing).
- Visit the Granite Inn (#12). The warm light should be *immediately noticeable*. The chalkboard should be readable. The MrBeast sign should be findable.
- Visit the chapel (#11). The quiet should be *felt* (in build terms: the `minecraft:shroomlight` should be the only light).
- Find the Stargate door. It should be in a back corridor, easy to miss, delightful to find.
- Find the WOPR terminal. The "GREETINGS PROFESSOR FALKEN" sign should be readable, the movie-reference label should be clear.

### 9.8 Acceptance

- A visitor can identify the Battle Cab from across the chamber.
- The 1980 plaque text is **full** and readable.
- The 8 time-zone clocks are present and labeled.
- The "WELCOME TO THE NORAD COMMAND CENTER" ticker is visible.
- The U-shape of consoles is clearly a U.
- Real history is on the main path (1980 plaque, the operational dates, the 1,319 sign). Movie references are off the main path and clearly labeled.

---

## 10. Phase 7 — Finishing (Reservoir, Easter Eggs, Polish)

### 10.1 Goal

The underground lake (the contemplation room), final lighting tuning, signage review, the play-through.

### 10.2 Reservoir (offset west of the chamber, at `(-300, 1,180, 50)`)

- **Access:** A 30-block-long access tunnel from the chamber's west wall, descending slightly (chamber floor y=1,196 → reservoir ceiling y=1,180). The tunnel runs from `(0, 1,196, 50)` to `(-285, 1,185, 50)`.
- **Footprint:** 30 wide (X) × 15 tall (Y) × 20 deep (Z). Y range: 1,165 to 1,180.
- **Walls:** `minecraft:dark_prismarine` (the "carved" feel, dark and slightly textured), with `minecraft:polished_andesite` accents on the structural ribs every 10 blocks.
- **Ceiling:** `minecraft:dark_prismarine` with `minecraft:soul_lantern` clusters at the structural ribs.
- **Floor:** `minecraft:dark_prismarine` with `minecraft:gravel` patches (the sediment).
- **Water:** `minecraft:water` source blocks filling the lower ~5 blocks of the cavern. **Still water** — no current, no flow. Test for currents before finalizing.
- **Boat:** An `minecraft:oak_boat` floating in the center, slightly offset. Optional: a `minecraft:chest` inside.
- **Causeway / dock:** A 2-block-wide `minecraft:polished_andesite` walkway along the north wall, 1 block above the water, with `minecraft:iron_fence` railings. Length: 25 blocks. Access: a `minecraft:light_gray_concrete` stairway from the chamber floor down to the causeway.
- **Reservoir lighting:** `minecraft:soul_lantern` at each ceiling rib (every 10 blocks), `minecraft:soul_lantern` on the causeway (every 8 blocks). Dim. No `minecraft:redstone_lamp` in the reservoir.
- **Reservoir signage** (`minecraft:oak_sign` at the causeway entrance):
  > **RESERVOIR — 1.5 MILLION GALLONS**
  > **WATER SUPPLY: NATURAL MOUNTAIN SPRINGS + STORED**
  > **BOAT: FOR AUTHORIZED INSPECTION ONLY**
- **Emergency egress door (faded reference, at `(-315, 1,190, 55)`):** A single locked `minecraft:iron_door` at the far end of the reservoir. `minecraft:oak_sign` reading "EMERGENCY EGRESS". Faded reference only — not a buildable route.

### 10.3 Seasonal banner (optional, NORAD Tracks Santa)

- **Location:** Main chamber, on the wall above the chamber entrance.
- **Build:** A `minecraft:red_wool` + `minecraft:white_wool` banner (or `minecraft:oak_wall_sign`): "NORAD TRACKS SANTA — DECEMBER 24 — SINCE 1955". A smaller `minecraft:oak_sign`: "TRACK NORADSANTA.ORG ON CHRISTMAS EVE".
- **Optional:** Swap in for December screenshots.

### 10.4 The "1980 secondary cross-reference" (in #2 Missile Warning)

- A single `minecraft:redstone_lamp` with `minecraft:red_concrete` backing blinking on and off (a slow pulse), in a corner of the server room.
- `minecraft:oak_sign` below: "MISSILE WARNING TEST — 1980/06/03 — 02:26 HRS".

### 10.5 DEW Line / BMEWS / PAVE PAWS signage (real but subtle)

- Small `minecraft:oak_sign` blocks throughout the Air Defense (#1) and Missile Warning (#2) centers citing the real sensor networks.
- Not an easter egg, but a real-history detail for the visitor who reads closely.

### 10.6 Final polish

- **Lighting tuning pass:** Walk every zone. Adjust `minecraft:redstone_lamp` / `minecraft:end_rod` / `minecraft:soul_lantern` density. Confirm the "dim institutional" feel in the main path, the "warm contrast" feel in the Granite Inn (#12) and Chapel (#11), the "deep underground" feel in the reservoir.
- **Signage review:** Walk every zone. Check that every `minecraft:oak_sign` is readable from the visitor's natural path.
- **Spring count audit:** Confirm the visible spring count per building + the per-building sign count adds up to 1,319 (or to 1,320 with a "±1" note).
- **Final play-through:** Walk the full path: approach road → portal → tunnel → blast doors → chamber → Battle Cab → 4 ops centers → support rooms → chapel → Granite Inn → reservoir. The build should be *experienced* in 20–30 minutes.

### 10.7 Verification

- Boat across the reservoir. The visitor should feel the *quiet*. The water is still, the lighting is dim, the soul-lantern light reflects off the surface.
- Confirm the "warm light only in chapel and Granite Inn" rule (per `design-plan.md` §15.1). Audit every other room for stray `minecraft:shroomlight`, `minecraft:lantern`, or `minecraft:torch`.
- Confirm "no torches anywhere" (per `design-plan.md` §15.2). Audit and remove.

### 10.8 Acceptance

- All easter eggs are findable but not on the main path.
- Real history is on the main path. Movie references are off the main path and clearly labeled.
- The play-through is 20–30 minutes, and the visitor leaves with the *real* story: "I have been inside something that was built to outlast me."

---

## 11. Block Palette Reference

Quick reference. Use this table when in doubt about a specific block. All block IDs are valid Minecraft Java 1.20+ IDs.

### 11.1 Exterior mountain (the skin)

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:granite` | Mountain exterior (60%) | Dominant material |
| `minecraft:pink_terracotta` | Mountain exterior (25%) | Pink Pikes Peak |
| `minecraft:red_terracotta` | Mountain exterior (15%) | Variation |
| `minecraft:polished_granite` | Cliff face highlights | Lighter tint |
| `minecraft:stone` | Rocky outcrops, scree slopes | Above tree line |
| `minecraft:coarse_dirt` | Forest floor | Around base |
| `minecraft:podzol` | Forest floor (under spruce) | Ponderosa undergrowth |
| `minecraft:grass_block` | Valley floor, lower slopes | Green under trees |
| `minecraft:moss_block` | Shaded rocky areas | Texture |

### 11.2 Interior rock (tunnels and chamber)

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:granite` | Tunnel walls (lower), chamber walls | Raw rock |
| `minecraft:polished_granite` | Tunnel walls (mid) | Variation |
| `minecraft:pink_terracotta` | Tunnel walls (upper), chamber walls | Pink Pikes Peak |
| `minecraft:red_terracotta` | Tunnel walls (upper variation) | |
| `minecraft:stone` | Tunnel ceiling, Stage 1 ceiling accents | Bare rock |
| `minecraft:polished_andesite` | Tunnel floor (Stage 2-3), chamber main floor | Institutional |
| `minecraft:smooth_stone` | Tunnel concrete-lined sections | Modern liner |
| `minecraft:smooth_stone_slab` | Chamber floor variant, jersey barriers | |
| `minecraft:iron_trapdoors` | Metal grating (service walkways) | Industrial |
| `minecraft:iron_bars` | Rock bolts in tunnel ceiling | Structural detail |

### 11.3 Portal and lining

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:light_gray_concrete` | Portal arch frame, tunnel liner, building exteriors | Institutional concrete |
| `minecraft:white_concrete` | Building exteriors (alternative) | Lighter |
| `minecraft:black_concrete` | Blast door frame, screen backing, chamber spring-display areas | Dark accent |
| `minecraft:smooth_stone` | Tunnel concrete sections, equipment pads | |
| `minecraft:iron_block` | Blast door face, structural elements, spring base plates, antenna base | Cold metal |
| `minecraft:iron_bars` | Blast door chevron bracing, hinges, antenna cross-bracing | |
| `minecraft:chain` | Hanging conduit, blast door hand-crank, rock bolts, concertina wire | Industrial pipe runs |
| `minecraft:anvil` | Blast door hand-crank, spring cap | "Weight on top" |
| `minecraft:heavy_weighted_pressure_plate` | Blast door hinge base, spring cap (alt) | |

### 11.4 Lighting

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:redstone_lamp` | Tunnel (sparse), chamber ceiling, building interiors, blast door area, airlock chamber | The "fluorescent" — primary institutional light source |
| `minecraft:end_rod` | Tunnel Stage 3 ceiling strips, chamber ceiling strips | Linear, fluorescent-like |
| `minecraft:soul_lantern` | Reservoir, 1980 plaque accent, blast door side-branch, walkway accents | Cold blue, deep underground |
| `minecraft:shroomlight` | Granite Inn, Chapel | The *only* warm light (with one soul-lantern accent in Battle Cab) |
| `minecraft:lantern` | Guardhouse | Iron lantern (one warm point at the portal transition) |
| `minecraft:clock` | Battle Cab time-zone clocks | Even though they show Minecraft time, the *visual* is the point |
| **FORBIDDEN:** `minecraft:torch`, `minecraft:campfire`, `minecraft:soul_campfire` | Anywhere in the build | "No torches" rule |

### 11.5 Color-coded pipe runs (tunnel + chamber walls)

| Minecraft block | Color | Use |
|---|---|---|
| `minecraft:green_concrete` | Green | Water |
| `minecraft:red_concrete` | Red | Fire suppression |
| `minecraft:yellow_concrete` | Yellow | Fuel |
| `minecraft:blue_concrete` | Blue | Compressed air |

### 11.6 Buildings (15 free-standing structures)

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:light_gray_concrete` | Building exteriors (dominant) | Institutional skin |
| `minecraft:white_concrete` | Building trim (alternative) | Lighter |
| `minecraft:polished_andesite` | Building floors (corridors) | |
| `minecraft:blue_wool` | Battle Cab floor | The dark blue institutional carpet |
| `minecraft:light_gray_wool` | Other ops centers floor, Battle Cab chairs, all 15 ops chairs | Beige substitute |
| `minecraft:white_wool` | Battle Cab letterforms, accent panels | |
| `minecraft:black_wool` | 1980 plaque text, Battle Cab ticker, portal lettering | |
| `minecraft:red_wool` | Battle Cab ticker background (alt) | |
| `minecraft:iron_door` | All building entry doors | Brushed steel |
| `minecraft:iron_block` | Building structural frames (visible at corners) | |
| `minecraft:note_block` | Console "machines" inside ops centers | CRT stand-in |
| `minecraft:jukebox` | Console machine (alt), Battle Cab "hum" | |
| `minecraft:item_frame` + `minecraft:filled_map` | Console screens, world map in Battle Cab | The "displays" |
| `minecraft:redstone_lamp` | Backlight behind display screens | The green CRT glow |
| `minecraft:lever` | Console "key" | Operator station |
| `minecraft:oak_wall_sign` | Time-zone labels, building names, the 1,319 master sign, the WELCOME ticker | Large signage |
| `minecraft:oak_sign` | Most other signage | Standard sign post |
| `minecraft:glass_pane` | Fire door portholes (small) | Reserved detail |
| `minecraft:light_blue_stained_glass_pane` | Chapel stained-glass window | |
| `minecraft:white_stained_glass_pane` | Chapel cross | |

### 11.7 Spring mounts (the engineering signature)

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:iron_block` | Spring base plate (1×1) | Steel base |
| `minecraft:chain` | Spring coil (2-3 blocks vertical) | Visible coil |
| `minecraft:anvil` | Spring top cap | "Spring under load" look |
| `minecraft:slime_block` | Ambient sway (Building #7 only) | Piston-driven |
| `minecraft:piston` | Ambient sway (Building #7 only) | |
| `minecraft:observer` | Ambient sway (Building #7 only) | Redstone clock source |
| **1-block air gap** | Between spring cap and building floor | The *visible* decoupling |

### 11.8 Forest and approach

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:spruce_log` + `minecraft:spruce_leaves` | Ponderosa pine (60% of trees) | Tall, narrow, dark green |
| `minecraft:oak_log` + `minecraft:oak_leaves` | Scrub oak (30%) | Shorter, rounder |
| `minecraft:dark_oak_log` + `minecraft:dark_oak_leaves` | Mature stands (10%) | Larger, denser |
| `minecraft:tall_grass` | Forest undergrowth | |
| `minecraft:fern` | Shadier areas | |
| `minecraft:poppy` | Wildflowers | |
| `minecraft:azure_bluet` | Wildflowers | |
| `minecraft:sweet_berry_bush` | Low scrub | |
| `minecraft:gravel` | Approach road surface | Dirt-and-gravel road |
| `minecraft:coarse_dirt` | Road edges | Worn-down edges |
| `minecraft:path` | Road shoulders | Compacted earth (vanilla path block) |
| `minecraft:cobblestone` | Parking lot surface | More formal than approach |
| `minecraft:cobblestone_wall` | Road retaining walls | Guardrails |
| `minecraft:iron_fence` | Chain-link fence | Around parking lot and portal |
| `minecraft:iron_fence_gate` | Parking lot gate | |
| `minecraft:lightning_rod` | Antenna masts | The "antenna" effect |

### 11.9 Wood and warm materials (only in human spaces)

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:oak_planks` | Granite Inn floor, Chapel floor, furniture, dining tables | Wood |
| `minecraft:dark_oak_planks` | Granite Inn bar walls, bar counter, paneling | Dark wood |
| `minecraft:spruce_planks` | Chapel walls, ceiling | |
| `minecraft:oak_slab` | Granite Inn bar counter, Chapel altar, dining tables, ops center tables | |
| `minecraft:dark_oak_slab` | Granite Inn bar counter (alt) | |
| `minecraft:oak_stairs` | Chapel pews, Granite Inn chairs, dining chairs, booth seats | |
| `minecraft:dark_oak_fence` | Granite Inn bar stools | |
| `minecraft:oak_fence` | Cable trays, walkways, antenna cross-bracing | |
| `minecraft:white_bed` | Medical bed | Medical-institutional |
| `minecraft:quartz_stairs` | Dental chair, examination chair | |

### 11.10 Reservoir

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:water` | Reservoir water surface | Still source block |
| `minecraft:dark_prismarine` | Reservoir walls, ceiling | "Carved" feel |
| `minecraft:polished_andesite` | Causeway, structural rib accents | |
| `minecraft:gravel` | Reservoir floor sediment patches | |
| `minecraft:soul_lantern` | Reservoir lighting | Cold blue, dim |
| `minecraft:oak_boat` | The boat on the water | Single boat, iconic |
| `minecraft:iron_fence` | Causeway railings | |

### 11.11 Power plant and diesel reservoir

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:piston` | Generator visual | |
| `minecraft:observer` | Generator visual | |
| `minecraft:redstone_lamp` | Generator gauges, warning lights | |
| `minecraft:redstone_repeater` | Battery bank wall | |
| `minecraft:iron_block` | Generator frames | |
| `minecraft:black_concrete` | Diesel reservoir walls | Sealed look |
| `minecraft:magma_block` | Diesel reservoir floor | Subtle warmth |
| `minecraft:lightning_rod` | Generator exhaust stacks (decoration) | |

### 11.12 Easter eggs and decorative

| Minecraft block | Use | Notes |
|---|---|---|
| `minecraft:gold_block` | Hidden MrBeast play button (behind a painting in Granite Inn) | |
| `minecraft:painting` | Covering the gold block | |
| `minecraft:potion` | Granite Inn bottles (use `minecraft:glass_bottle` + `minecraft:magenta_dye` for the colorful look) | |
| `minecraft:brewing_stand` | Medical compounding | |
| `minecraft:chest` | Server racks, pharmacy, file cabinets, niche supplies, mops behind Stargate door | |
| `minecraft:minecart` | Decorative "vehicles" in parking lot | |
| `minecraft:egg` (chicken/cow spawn eggs) | Decorative wildlife near parking lot | |

### 11.13 Color palette summary (hex ranges)

| Color | Hex range | Use |
|---|---|---|
| Pink-granite (Pikes Peak) | `#B5566E` to `#8B3A3A` | Dominant identity color |
| Charcoal grey | `#2C2C2C` to `#4A4A4A` | Institutional corridor walls |
| Brushed steel | `#A8A8A8` to `#888888` | Doors, frames, blast doors |
| Dark blue / black | `#0A1628` to `#1A1A2E` | Screens, command center carpet |
| Warning red | `#B33A3A` to `#8B2C2C` | Blast door markers, fire pipes, ticker |
| Fluorescent white | `#E8E8E8` to `#F0F0F8` | Tunnel lighting |
| Warm amber | `#D4A55A` to `#B8843A` | Granite Inn, Chapel, break areas (contrast) |

---

## 12. Schematic References

The schematic library at `D:\projects\mc-fleet-bot\schematics\` contains existing builds. **Reuse where useful; flag custom schematics that need to be made.**

### 12.1 Reusable schematics (flag for contractor)

| Schematic file | Use | Notes |
|---|---|---|
| `lantern.schem` | Decorative lanterns, possibly for guardhouse or the lighting reference | Generic lantern, can be placed at the portal transition |
| `oak-tree.schem` | Forest trees (alt) | The build uses `minecraft:spruce` and `minecraft:dark_oak` primarily, but `oak-tree.schem` could be reused for the scrub-oak mix |
| `santa-sleigh-and-reindeer.schem` (and other Christmas schematics) | NORAD Tracks Santa decoration | Optional, swap in for December |
| `christmas-tree.schem` | NORAD Tracks Santa decoration | Optional |
| `mushroom-cottage.schem`, `mushroom-house.schem` | **NOT REUSABLE.** Different aesthetic (fantasy, not institutional). |
| `underground-base.schem` | **NOT REUSABLE.** A surface "bunker" build, not a real underground installation. The Cheyenne Mountain chamber is a *city* under a mountain, not a small bunker. |
| `stone-castle.schem`, `stone-fortress.schem` | **NOT REUSABLE.** Castle aesthetic, not institutional. |
| `fantasy-temple-house.schem`, `red-japanese-temple.schem`, `japanese-pagoda.schem` | **NOT REUSABLE.** Wrong aesthetic. |
| `victorian palace.schem`, `Cute house.schem`, `cozy-cabin.schem` | **NOT REUSABLE.** Wrong scale and aesthetic. |
| `rustic-mountain-house.schem` | **NOT REUSABLE** for the main buildings (residential, not institutional). Could conceivably be reused for surface support if scaled, but the build is better served by simple in-place `minecraft:light_gray_concrete` boxes. |
| `modern-apartment.schem`, `white-modern-villa.schem`, `contemporary-house.schem` | **NOT REUSABLE.** Modern aesthetic, not 1966 institutional. |
| `clock-tower.schem` | **NOT REUSABLE** for the Battle Cab. The Battle Cab uses `minecraft:clock` blocks + `minecraft:oak_sign` labels directly; a clock tower is the wrong scale and placement. |
| `oak-tree.schem` | Reusable for the scrub-oak mix in the forest | Yes — but build the spruce and dark oak trees in place via `//tree` (WorldEdit) or bot commands |

### 12.2 Custom schematics that need to be made

| Schematic | Purpose | Approx. dimensions | Notes |
|---|---|---|---|
| `cheyenne-mountain-shell.schem` | The 1,450-block mountain mass | 600 × 1,450 × 800 blocks | Use WorldEdit sphere brushes at varying radii; save the final form as a schematic. **This is the most important custom schematic.** |
| `cheyenne-portal-arch.schem` | The North Portal exterior (arch + lettering) | 22 × 4 × 5 blocks | Includes the concrete frame, iron-block corner caps, "CHEYENNE MOUNTAIN COMPLEX" lettering, security perimeter. Build once, save as schematic, mirror for the South Portal (if needed for combined-complex report). |
| `cheyenne-blast-door.schem` | A single 2×-scaled blast door (Door 1 or Door 2) | 6 × 4 × 1 blocks (with hinges protruding) | Includes the iron-block face, black-concrete frame, iron-bars chevron bracing, hinges, hand-crank. Build once, mirror to create Door 2. |
| `cheyenne-battle-cab-shell.schem` | The Battle Cab building shell (8 × 7 × 11) | 8 × 11 × 7 blocks | Empty shell; interiors are placed in-place, not from a schematic. |
| `cheyenne-ops-center-shell.schem` | A generic 3-story ops center shell (6 × 9 × 5) | 6 × 9 × 5 blocks | The 9 other 3-story buildings (5 ops + 4 support) share this shell; interior customization is per-building. |
| `cheyenne-2story-shell.schem` | A generic 2-story support / human-space shell (6 × 6 × 5) | 6 × 6 × 5 blocks | The 3 two-story buildings share this shell. |
| `cheyenne-spring-mount.schem` | A single 2×-scaled spring column (iron block + chain + anvil) | 1 × 4 × 1 blocks | Build once, copy/place 4–6 per building (60–90 total). |
| `cheyenne-antenna-large.schem` | The 30-block central-peak antenna | 3 × 30 × 3 blocks | Iron block base + lightning rod + chain cross-bracing. |
| `cheyenne-antenna-small.schem` | The 25-block side-peak antenna | 2 × 25 × 2 blocks | Smaller version. |

### 12.3 Schematic workflow recommendation

1. **Build the 9 custom schematics above.** This is the front-loaded work.
2. **Place the mountain shell schematic** (Phase 1).
3. **Place the portal arch schematic** (Phase 2).
4. **Carve the tunnel in place** (Phase 3) — the J-curve is too long and curving for a single schematic, but save the cross-section as a reusable tunnel-segment schematic.
5. **Place the blast door schematic × 2** (Phase 4).
6. **Build the chamber array in place** (Phase 5) — the building grid is too complex for a single schematic, but each of the 9 generic shells can be copy-pasted.
7. **Interiors in place** (Phase 6) — too varied for schematics.
8. **Reservoir and finishing in place** (Phase 7) — the reservoir is unique.

---

## 13. Bot-Build Workflow

The build target is `mc-fleet-bot`, a Minecraft bot sidecar. The bot has WorldEdit-style schematic placement and `/fill` block commands. The relevant API endpoints are documented in `D:\projects\mc-fleet-bot\AGENTS.md`.

### 13.1 Recommended bot command patterns

**Mass placement (the mountain shell, the tunnel carving, the chamber carving):**

Use `//fill` and WorldEdit sphere/cylinder brushes via the bot's chat relay. The bot should:

1. Establish build origin: `//pos1` at `(0, 64, 0)`.
2. Load the mountain shell schematic: `/schematic load cheyenne-mountain-shell` then `/schematic paste`.
3. Carve the chamber: `//pos1 (-22, 1196, 38)` and `//pos2 (23, 1214, 63)`, then `//fill minecraft:air`.
4. Carve the tunnel: a series of `//fill minecraft:air` commands along the J-curve path.

**Schematic placement (the portal, the blast doors, the building shells, the antennas):**

Use `/schematic load <name>` + `/schematic paste <x> <y> <z> [-r rotation]`.

**In-place placement (the building interiors, the easter eggs, the Battle Cab wall of displays):**

Use the bot's `//set` and `//replace` commands for block-by-block placement, or use the `mc-fleet-bot` API to send `setblock` commands directly.

**mc-fleet-bot API endpoints (for the contractor):**

- `POST /api/bots` — create a new bot
- `GET /api/bots` — list bots
- `POST /api/bots/:name/task` — queue a task for a bot
- `GET /api/bots/:name/tasks` — list tasks
- `POST /api/commands` — dispatch a command to a bot
- `GET /api/commands/:id` — get command status
- `POST /api/commands/:id/cancel` — cancel a command

**Specific commands the contractor will use:**

- **Mountain shell:** `//pos1`, `//pos2`, `//fill` (no, use schematic for the shape)
- **Tunnel carving:** `//pos1`, `//pos2`, `//fill minecraft:air` (for each segment of the J-curve)
- **Chamber carving:** `//pos1 (-22, 1196, 38)`, `//pos2 (23, 1214, 63)`, `//set minecraft:air`
- **Portal arch:** `/schematic load cheyenne-portal-arch`, `/schematic paste 0 1100 -500`
- **Blast doors:** `/schematic load cheyenne-blast-door`, `/schematic paste -100 1170 -250 -r 0` (Door 1), `/schematic paste -100 1170 -250 -r 180` (Door 2, mirrored)
- **Building shells:** `/schematic load cheyenne-battle-cab-shell`, `/schematic paste -2 1197 48`; then `/schematic load cheyenne-ops-center-shell` for each of the 9 other 3-story buildings; etc.
- **Spring mounts:** `/schematic load cheyenne-spring-mount`, paste 4–6 per building
- **Antennas:** `/schematic load cheyenne-antenna-large`, paste at `(-50, 1500, 0)`, `(50, 1500, 0)`, `(0, 1500, 50)`; `/schematic load cheyenne-antenna-small`, paste at `(-100, 1400, -400)`, `(100, 1400, 200)`
- **Forests:** Use the bot's `//tree` command or WorldEdit's `//forest` (bot-specific).

**Performance tips:**

- Pre-generate the build footprint: `/worldborder center 0 0`, `/worldborder set 2000` (a 2,000-block diameter world border) BEFORE building, to force chunk generation.
- Use `//fast` mode in WorldEdit for large operations.
- Avoid redstone clock-driven builds in main areas (the ambient sway is the *only* such build, and it's subtle).
- Use the bot fleet in parallel: 4–6 bots working on different phases simultaneously.

### 13.2 WorldEdit-style fill commands (manual reference)

| Operation | Command |
|---|---|
| Place a single block | `//set x y z minecraft:stone` |
| Fill a region | `//pos1`, `//pos2`, `//set minecraft:granite` |
| Replace blocks | `//replace minecraft:stone minecraft:granite` |
| Carve (replace with air) | `//pos1`, `//pos2`, `//set minecraft:air` |
| Hollow a region | `//pos1`, `//pos2`, `//hollow` |
| Cylinder | `//cyl minecraft:granite 30 30` (radius, height) |
| Sphere | `//sphere minecraft:granite 30` |
| Schematic save | `//copy`, `//schematic save <name>` |
| Schematic load | `/schematic load <name>` |
| Schematic paste | `/schematic paste <x> <y> <z>` (optionally with `-r <rotation>`) |

### 13.3 Build height verification (do this first, before anything else)

```
/setblock 0 1024 0 minecraft:stone
```

If the block places successfully, the world has at least 1,024 build height. If it fails, the mod is not installed or the world is not configured correctly. **Fix before proceeding.**

```
/setblock 0 1514 0 minecraft:stone
```

If this places, the build height is at least 1,550 (the requirement). Test both.

---

## 14. Quality Checkpoints

### 14.1 Visual review checklist

The contractor (or a human reviewer) should walk the build at each phase and verify:

- **Phase 1 (Mountain shell):**
  - [ ] The mountain reads as a forested three-peaked foothill from the parking lot.
  - [ ] Antenna arrays are visible on the ridgeline.
  - [ ] The portal location is a *small* mark on the cliff face, not obvious.
  - [ ] The chamber ceiling is in place at Y=1,214, ready for Phase 5.
  - [ ] Tree line at ~Y=1,300.
  - [ ] Build height verified: a test block at Y=1,514 places successfully.

- **Phase 2 (Approach):**
  - [ ] The approach road feels like a mountain road (gravel, switchback, forested).
  - [ ] The parking lot is cleared, with the security checkpoint trailer and chain-link fence.
  - [ ] The portal is *small* and *unassuming*.
  - [ ] "CHEYENNE MOUNTAIN COMPLEX" lettering is readable from the parking lot.
  - [ ] "SPEED LIMIT 15" and "STOP" signs are in place.
  - [ ] The guardhouse is built.

- **Phase 3 (Tunnel):**
  - [ ] The visitor cannot see from one end of the tunnel to the other at any point.
  - [ ] The wall character changes: rough (Stage 1) → concrete-lined (Stage 2) → polished institutional (Stage 3).
  - [ ] The color-coded pipe runs (green/red/yellow/blue) are visible in Stages 2 and 3.
  - [ ] Fire doors with portholes are spaced every 100 blocks in Stage 3.
  - [ ] 16 side niches with emergency-supply chests are placed.
  - [ ] The DEAD AIR sign is at ~400-block mark.
  - [ ] The blast door side-branch is carved at `(-100, 1,170, -250)`.
  - [ ] Total tunnel walk time: 5–8 minutes.

- **Phase 4 (Blast door airlock):**
  - [ ] Both blast doors are *visibly larger* than the tunnel (2× scaling).
  - [ ] The doors are angled outward.
  - [ ] The hand-crank is visible.
  - [ ] The airlock chamber is *brighter* than the tunnel.
  - [ ] All required signage is in place: "BLAST DOOR — 25 TONS — 30 MT @ 1.2 MI", "BLAST VALVE TESTED DAILY", "CLOSED 11 SEPTEMBER 2001", "AIRLOCK — DOOR 1 OF 2", "AIRLOCK — DOOR 2 OF 2", "DURING COLD WAR: ONE DOOR ALWAYS CLOSED. CURRENTLY: BOTH OPEN."
  - [ ] The "postcard shot" (looking back from the chamber-side access tunnel) is iconic.

- **Phase 5 (Main chamber):**
  - [ ] All 15 buildings are visible from the chamber entrance.
  - [ ] The springs are visible under each building.
  - [ ] The 1,319 master sign is correct and visible.
  - [ ] The cross-section building (#7) shows the full spring stack.
  - [ ] The Battle Cab (#8) is centered on the main E-W path.
  - [ ] The 1962 fault-repair concrete dome is in the chamber ceiling.
  - [ ] The chamber lighting is dim but readable.

- **Phase 6 (Building interiors):**
  - [ ] The Battle Cab wall of displays *dominates* the room.
  - [ ] The 1980 plaque is *readable* on the first visit. **Text is FULL, not abbreviated.**
  - [ ] The 8 time-zone clocks are present and labeled (ZULU / EXERCISE / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW).
  - [ ] The "WELCOME TO THE NORAD COMMAND CENTER" ticker is visible.
  - [ ] The U-shape of 6 consoles is clearly a U.
  - [ ] The 4 other ops centers are distinct (radar / missile / star map / briefing).
  - [ ] The Granite Inn is the *only* warm-lit room in the build.
  - [ ] The chapel has the warm `minecraft:shroomlight` and is *quiet*.
  - [ ] The Stargate door is findable but off the main path. One door, one sign, nothing else.
  - [ ] The WOPR terminal is in #15 with the "GREETINGS PROFESSOR FALKEN" sign and the movie-reference label.
  - [ ] The Chrystal Palace sign is in a back corridor.
  - [ ] The MrBeast sign is in the Granite Inn.

- **Phase 7 (Finishing):**
  - [ ] The reservoir is *still* (no currents).
  - [ ] The reservoir lighting is the *quietest* in the build.
  - [ ] The boat is in the center of the reservoir.
  - [ ] All easter eggs are findable but not on the main path.
  - [ ] The "no torches anywhere" rule is satisfied.
  - [ ] The "warm light only in chapel and Granite Inn" rule is satisfied.
  - [ ] The 20–30 minute play-through is verified.

### 14.2 Lighting test

- **Dim institutional test:** Walk the main path (tunnel → chamber → Battle Cab). The lighting should be *dim but readable*. The visitor should feel they are *inside an institutional building*, not a stadium.
- **Warm contrast test:** Enter the Granite Inn. The `minecraft:shroomlight` should be *immediately noticeable* as the visitor enters. The chalkboard should be readable.
- **Quiet room test:** Enter the chapel. The `minecraft:shroomlight` should feel *warmer* than the rest of the build. The visitor should want to *stop* (in build terms: stand still).
- **Deep underground test:** Walk into the reservoir. The `minecraft:soul_lantern` should be the *quietest* light. The visitor should *stop talking* (in build terms: stop moving).
- **Threat model test:** Look back at the blast doors from the chamber-side access tunnel. The two doors should *frame* the tunnel mouth in the dim distance. The 25-ton label should be readable.

### 14.3 Path / navigation test

- Walk the *full visitor path*: approach road → portal → tunnel → blast doors → chamber → Battle Cab → 4 ops centers → support rooms → chapel → Granite Inn → reservoir.
- The path should be *clear* (no obstacles, no dead ends, no missing bridges).
- The path should be *navigable* (the visitor knows where to go at every step). The yellow `minecraft:yellow_concrete` line on the chamber floor marks the main E-W axis.

### 14.4 Easter egg accessibility test

- Find every easter egg: the Stargate door, the WOPR terminal, the Chrystal Palace sign, the MrBeast sign, the 1980 secondary plaque (in #2 if present), the DEAD AIR sign, the seasonal banner.
- Each should be *findable* by an explorer (not a secret room requiring redstone), but *not on the main path*.

### 14.5 The 1980 plaque text

- The 1980 false alarm plaque text is **the most important text in the build**. It is *full*, not abbreviated, and is on the main path (Battle Cab, back wall, right of entrance).
- The contractor should *read it back* after placing it, line by line, to confirm the full text is present.
- The full text is in §9.3 of this brief and in `design-plan.md` §12.4.

---

## 15. Open Items

### 15.1 Items that need user input before the build proceeds

| # | Item | Default | Alternative |
|---|---|---|---|
| 1 | **Build height mod selection** | **CubicWorld 2,048** | MCHigher, Cylinder, custom superflat with extended height |
| 2 | **"CHEYENNE MOUNTAIN COMPLEX" vs "CHEYENNE MOUNTAIN SPACE FORCE STATION"** | "CHEYENNE MOUNTAIN COMPLEX" (the historically iconic name on the public portal) | "CHEYENNE MOUNTAIN SPACE FORCE STATION" (the current 2020+ name, less iconic) |
| 3 | **1980 plaque text: full or excerpt** | **Full text** (200+ characters, per `discussion-notes.md` Topic 5) | A concise 2–3 line version |
| 4 | **Stargate door: literal text or subtle** | "STARGATE COMMAND" (the real broom-closet joke) | "SGC — Authorized Personnel Only" (more subtle) |
| 5 | **1979 secondary plaque: include or skip** | **Include** (cheap to add, 2-line plaque) | Skip |
| 6 | **MrBeast reference: include or skip** | **Include** (small sign in Granite Inn, hidden gold block) | Skip |
| 7 | **Seasonal NORAD Tracks Santa banner: year-round or December-only** | Year-round `minecraft:oak_sign` (simpler) | December-only swap |
| 8 | **The cross-section building (which one)** | **Building #7 (Systems Center)**, on the main E-W axis just west of the Battle Cab | Building #13 (Medical/Dental), per the original design plan (less visible, off the main path) |
| 9 | **The ambient sway (which building)** | **Building #7** (the cross-section building) | None (skipped for safety) |

### 15.2 Items that depend on the combined-complex report (downstream)

| # | Item | Notes |
|---|---|---|
| 10 | **Service tunnel (Cheyenne ↔ SubTropolis)** | Connection point defined at `(0, 1,196, 100)`. The 1,200-block tunnel to SubTropolis is *not* part of this build; flagged for the combined-complex team. |
| 11 | **Public shaft (Cheyenne exit ↔ city in the ravine)** | Connection point defined at `(0, 1,196, 100)`. The 700-block shaft to the city is *not* part of this build; flagged for the combined-complex team. |
| 12 | **The deep ravine dimensions** | Defined as 300–400 blocks wide, ~200 blocks deep, between the mountain's south face (Z=0) and the city's edge. The SubTropolis and Houston tunnel system sit on the south side. The combined-complex report's site plan should confirm these dimensions. |
| 13 | **The rail connection (v2.0 feature)** | A `minecraft:rail` line from the chamber to the SubTropolis and Houston tunnel system. The path depends on the combined-complex report's site plan. Deferred to v2.0. |

### 15.3 Items the contractor may need clarification on

- **The exact orientation of the Battle Cab's U-shape of consoles:** The design plan §8.4 specifies 2+2+2 = 6 stations, but the exact arrangement (center desk deeper than the arms? all the same depth?) is design-intent, not mandated. Contractor can choose.
- **The exact number of visible springs per building:** 4–6 is the design range. The contractor should pick a consistent number (suggest 4 per building for total ~60 visible) and add a "1,319" master sign to carry the honest count.
- **The 1979 plaque wording:** The brief specifies the full 6-line text per `design-plan.md` §12.5. If the user wants it shorter, this is the place to abbreviate.
- **The exact placement of the NORAD Tracks Santa banner:** The design plan places it above the chamber entrance. The contractor can place it elsewhere (e.g., on the chamber's west wall) if the entrance is visually busy.
- **The seasonal banner swap mechanism:** If the user wants December-only, the contractor needs to know whether to script a `command_block` timer or simply swap the sign manually.

### 15.4 Items that are not blocking but worth noting

- **The "1947 alternate history" mode** is a v2.0+ creative extension; the contractor can ignore it.
- **The MrBeast 2025 tour recreation** (a guided-tour mode) is a v2.0+ extension; the single hidden sign in the Granite Inn is sufficient for v1.0.
- **The 4 satellite above-ground buildings** (additional ops centers that don't exist at the real complex) are deferred to v1.5+; the build only needs the parking-lot security trailer, the generator building, and the pump house above-ground for v1.0.
- **The 4 additional reservoirs** (real complex has 4 + 1 heat-sink) are deferred to v2.0+; the build needs only 1 main reservoir for v1.0.
- **Working redstone (blast doors that open/close, chamber lights on/off, alert state)** is a v2.0+ feature; the build uses static doors and always-on lighting for v1.0.

---

## Appendix A — Coordinate Quick Reference

| Location | Coordinates (X, Y, Z) | Notes |
|---|---|---|
| World origin | (0, 64, 0) | Sea level, mountain's vertical axis |
| Mountain peak (central) | (0, 1,514, 0) | Highest point |
| North peak | (-100, 1,400, -400) | |
| South peak | (100, 1,400, 200) | |
| Public entrance gate | (0, 80, -900) | At base of mountain, north side |
| Parking lot center | (0, 610, -815) | 40% up the mountain |
| North Portal (exterior) | (0, 1,100, -500) | On north face, ~70% up the mountain |
| North Portal (interior) | (0, 1,100, -500) | Build origin (below-ground) |
| Tunnel Leg 1 end / Bend 1 | (0, 1,180, -300) | |
| Blast door side-branch | (-100, 1,170, -250) | Cinematic reveal |
| Tunnel Leg 2 end / Bend 2 | (300, 1,196, -300) | |
| Chamber entry | (50, 1,196, 200) | Where tunnel opens into chamber |
| Main chamber center | (0, 1,205, 50) | |
| Main chamber bounds | X: -22 to +23, Y: 1,196–1,214, Z: 38–63 | 45 × 18 × 25 blocks |
| Battle Cab (#8) | (-2, 1,197, 48) | Centerpiece, 8 × 7 × 11 |
| Reservoir bounds | X: -315 to -285, Y: 1,165–1,180, Z: 40–60 | 30 × 15 × 20 blocks |
| Power plant room | (0, 1,197, 100) | |
| Diesel reservoir room | (0, 1,197, 130) | |
| Service tunnel to SubTropolis (flagged) | From (0, 1,196, 100) to (0, 200, 1,200) | 1,200 blocks; not in this build |
| Public shaft to city (flagged) | From (0, 1,196, 100) to (0, 200, 500) | 700 blocks; not in this build |

## Appendix B — Phase Block Counts (Binding Estimates)

| Phase | Blocks placed | Bot hours | Human hours |
|---|---|---|---|
| 1 — Site prep & mountain shell | ~250,000 | 8–12 | 40–60 |
| 2 — Approach | ~4,000 | 3–5 | 8–12 |
| 3 — J-curve tunnel | ~100,000 (incl. carved-out) | 6–10 | 25–40 |
| 4 — Blast door airlock | ~700 | 1–2 | 3–5 |
| 5 — Main chamber + building shells | ~50,000 | 10–15 | 40–60 |
| 6 — Building interiors | ~7,000 | 6–10 | 20–30 |
| 7 — Reservoir, finishing, polish | ~3,000 | 3–5 | 8–12 |
| **TOTAL** | **~415,000** | **37–59** | **144–219** |

For 1 human working full-time: ~3–5 weeks of focused build time.
For a bot fleet of 4–6 bots working in parallel: ~1–2 weeks of bot time, with human review.

---

*End of contractor brief. Hand off to the AI contractor (or human builder) for execution. The brief is binding; deviations require user approval.*
