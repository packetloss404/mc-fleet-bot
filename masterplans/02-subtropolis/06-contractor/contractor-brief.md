# SubTropolis — AI Contractor Brief

> **Build specification for the SubTropolis Minecraft replica.**
> Author: AI Contractor Writer. Audience: AI or human contractor placing blocks. Companion to the master plan PDF (downstream).
> **Read sequentially** — every section depends on the prior.
> Source documents: `01-research/`, `03-discussion/`, `04-design/` (read in full upstream). This brief consolidates the binding decisions and adds the precision the contractor needs to place blocks.

---

## 1. Project Header

| Field | Value |
|---|---|
| **Build name** | SubTropolis |
| **Build ID** | `02-subtropolis` |
| **Sister sites** | `01-cheyenne-mountain` (opposite ravine wall), `03-houston-tunnels` (valley floor city) |
| **World setup** | Vanilla Minecraft **1.17+** (calcite, tuff, deepslate, shroomlight required). 1.18+ preferred (better ravine generation). |
| **Mod dependencies** | **None required.** Standard vanilla with optional WorldEdit for chamber carving. |
| **Recommended render distance** | `view-distance: 16`, `simulation-distance: 12` (in `server.properties`). A 200×200 chamber is at the edge of standard render distance. |
| **Game mode for build** | **Creative** (`/gamemode creative`) for the contractor. Survival players visiting later will not encounter mob spawns in the lit developed zones. |
| **Schematic library** | `D:\projects\mc-fleet-bot\schematics\` (vanilla-themed schematics, no SubTropolis-specific ones; some are reusable — see §12). |
| **Bot API** | `mc-fleet-bot` HTTP API at `http://127.0.0.1:3001` — see §13. |

**Build target:** a 200×200 block (floor) × 5 block (height) chamber carved into the south wall of a ravine, accessed through a horizontal portal from the south face, with a second exit portal on a perpendicular (east) face, plus a small surface plateau above. Eight distinct tenant fit-outs. One ghost mine chamber. Two inter-site connection stubs (project fictions).

---

## 2. Build Targets

### 2.1 Block budget estimate (rough, by phase)

| Phase | What | Block budget (approx.) | Net (placed / removed) |
|---|---|---|---|
| 1 | Site prep, ravine carving, 200×200 hollow | ~320,000 | ~320,000 removed |
| 2 | Chamber shell finish: ceiling paint, floor polish, 8×8 pillars, sub-basement | ~120,000 | ~120,000 placed (net, after subtractive sub-basement) |
| 3 | Main avenue signage, lane markings, plaza | ~3,500 | +3,500 |
| 4 | 6+ tenant fit-outs (USPS, NARA, STC, Grainger, EPA, Hallmark/Russell Stover, UV&S, Ford historical) | ~50,000–80,000 | +50,000–80,000 |
| 5 | Climate-control details (vents, dim lighting, signage) | ~3,000–5,000 | +3,000–5,000 |
| 6 | Surface building, entrance ramp, exit portal, parking lot | ~25,000–30,000 | +25,000–30,000 |
| 7 | Easter eggs, ghost mine, inter-site connections, lighting tuning | ~10,000–15,000 | +10,000–15,000 |
| **Total** | **Full v1.5 build** | **~530,000–575,000** | **+90,000–130,000 placed; 320,000 removed** |

**MVP cut (v0.1, the must-have skeleton):** ~30% of full, ~2,000–3,000 placed blocks, dominated by the chamber shell + first iconic intersection + entrance signage + 3 marquee tenant fit-outs (USPS, NARA, STC). See §10 for the per-phase breakdown.

### 2.2 Time estimate

- **Bot-driven bulk operations** (Phase 1 chamber carving, Phase 2 ceiling/floor/pillars, Phase 3 lane markings): **~3–6 hours** of bot run-time per phase, with minimal human oversight.
- **Human-driven fit-outs** (Phase 4 tenant interiors, Phase 7 easter eggs): **~15–20 hours** of focused design work.
- **Redstone + lighting tuning** (STC clock, end-rod placement, shroomlight underglow, sea-lantern strip tuning): **~4–6 hours**.
- **Total full build:** **32–49 hours of build time** spread across 6 phased delivery versions (v0.1 → v2.0). See `04-design/development-plan.md` §2.

### 2.3 Render distance and performance expectations

- The full 200×200 chamber is **40,000 m²** of lit interior floor. Vanilla render distance of 8 chunks (128 blocks) is insufficient; the main avenue will look chopped off. Set `view-distance: 16+` and `simulation-distance: 12+`.
- Long sightlines are a **design feature**: the first 30 blocks of Hushpuckney from the entrance intersection must be unobstructed so the player at the bottom of the entrance ramp sees pillars receding into haze. Do not place tenant entrances in the first 30 blocks of the main avenue.
- Lighting density: sea lantern every 4–5 blocks along the main avenue ceiling. Too dense feels like a runway; too sparse feels like a tunnel. Test by walking the build at night.

### 2.4 Quality acceptance criteria

A build is **accepted** when all of the following are true:

1. **The entrance paradox is visible** — a player on the surface sees a small modern building set into a tree-covered bluff, with a paved access road descending at shallow grade. The portal frame is 12 blocks wide × 5 blocks high, in Hunt Midwest brand colors. The world's-largest-underground marquee sign is readable from 30 blocks away.
2. **The pillar grid is the dominant visual** — a player at the bottom of the entrance ramp sees a 3×3 (minimum) grid of 8×8 white concrete pillars extending in every direction, under continuous sea-lantern lighting, with painted pillar numbers at human-readable height.
3. **The main avenue is drivable and navigable** — the 350-block main avenue has continuous yellow lane lines, white edge lines, stop signs and street signs at every intersection, and 15-mph speed-limit signs at every portal and at the central plaza.
4. **≥6 distinct tenant fit-outs** are visually identifiable from the main avenue (dock doors, climate-control signage, branding colors).
5. **The ghost mine is dark, raw rock, unreachable** — a barricade with a "DANGER — ACTIVE MINING" sign blocks a side spur; behind it, no lighting except a single soul lantern at the barricade.
6. **The inter-site connections are clearly fictions** — the service tunnel sub-basement and the public shaft lobby are both signed as project fictions (the real SubTropolis has neither).
7. **The constant-climate feel is conveyed** — NARA is dim amber, the STC is cool blue, the UV&S vault is single-lantern-dim, the main avenue is bright fluorescent. No torches, no lava, no mob spawners, no fantasy contamination.
8. **All easter eggs are findable but not on the main path** — the Hunt Hall round room, the UV&S labeled film cans, the FTZ sign, the ENERGY STAR certificate, the 2001 USPS anthrax plaque, the Groundhog Run banner, the Lamar Hunt / KC Chiefs arrowhead, and the Worlds of Fun silhouette are all present, all off the main avenue, and none require Indiana-Jones-style exploration to reach.

---

## 3. Coordinate System

### 3.1 World origin

**World origin (0, 70, 0)** is the **main entrance portal at surface level on the south face of the SubTropolis hill.** The portal frame's center-block is at (0, 70, 0). Y=70 is just above sea level (sea level = Y=64).

### 3.2 Compass orientation

| Direction | Vector | Notes |
|---|---|---|
| **North** | **−Z** | The mine extends into negative Z. The ravine is further negative Z. Cheyenne Mountain Complex is on the north wall of the ravine. |
| **South** | **+Z** | The Kansas City plain, the drive-up approach. |
| **East** | **+X** | The second exit portal is on the east face of the hill (perpendicular to the main entrance). |
| **West** | **−X** | |
| **Up** | **+Y** | |
| **Down** | **−Y** | |

### 3.3 Y levels (binding)

| Level | Y | Description |
|---|---|---|
| Sea level | 64 | Reference |
| **Main entrance portal (surface)** | **70** | World origin. Portal mouth. |
| Surface plateau | 80 | Visitor center, parking lot, Hunt Midwest marquee sign |
| Top of SubTropolis hill | 120 | Hilltop |
| **Main grid floor** | **20** | The bottom of the entrance ramp; start of the main avenue |
| **Main grid ceiling** | **25** | 5 blocks high (1:1 to the real 16-ft ceiling) |
| Sub-basement floor | 10 | Service tunnel terminus; service sub-basement |
| Sub-basement ceiling | 15 | |
| Ravine floor | 0–10 | |
| Public shaft surface exit | 90 | Top of the public shaft on the hilltop |

### 3.4 How to interpret the coordinate tables

- **All coordinates are integer block coordinates.** No sub-block precision is implied.
- **"Center of X"** means the geometric center of the named feature; the surrounding blocks extend outward as specified per-feature.
- **Footprint summary**:
  - Main grid: X ∈ [−100, +100], Z ∈ [0, −200], Y ∈ [20, 25]
  - Surface plateau: ~80×60 blocks around (20, 80, 20)
  - Sub-basement: 20×20 blocks at (−80, 10, −180)
- **Build direction.** The main grid is built **from the south portal inward (Z = 0 → Z = −200)**, then side spurs and tenant fit-outs branch off. The sub-basement is built **after** the main grid floor is in place (it's accessed from the main grid).
- **Y compression is 1:1** — the 5-block ceiling is exactly 5 blocks tall, the 8×8 pillars are exactly 8×8, the 12-block corridors are exactly 12 blocks wide. Do not compress these dimensions.

### 3.5 Origin and axis convention for downstream tools

- The origin is in the **overworld**.
- WorldEdit operations assume a player-relative orientation; the contractor should face **−Z** (north) when starting Phase 1, so that "right" (+X) is east and "left" (−X) is west.
- Schematic files are pasted in world coordinates; rotation is **counter-clockwise** in degrees around the Y axis (per WorldEdit convention).

---

## 4. Phase 1 — Site Prep

**Goal:** terrain exists, the south-face ravine wall is carved, the surface plateau is in place, the 200×200 chamber is roughly hollowed out as a void, the exit portal opening is roughly cut.

**Block-by-block spec:**

### 4.1 Surface plateau (above the mine, Y = 80)

- 80×60 blocks of buildable plateau centered roughly on (0, 80, 0), extending in positive Z (south) toward the Kansas City plain.
- **Top 1 block:** `minecraft:grass_block` (or `dirt` if grass fails to spread on a fresh build).
- **Next 2–3 blocks:** `minecraft:dirt`.
- **Below:** `minecraft:stone` (the underlying rock).
- Frame the plateau with **6–8 oak trees and 2–3 birch trees** (2x2 trunks + leaf canopies). Place **poppies** and **azure bluets** as KC-area wildflower accents.
- South edge of plateau tapers into rolling Kansas City plain (positive Z): grass + dirt + scattered trees, gently rolling. Do not build a flat square; let the terrain fall off naturally.

### 4.2 Ravine wall (south face)

- The south face of the SubTropolis hill is a vertical or near-vertical wall of **`minecraft:stone` and `minecraft:calcite` in roughly 70/15 proportions**, with **10% `minecraft:diorite` and 5% `minecraft:tuff`** mixed in, and **occasional `minecraft:deepslate` veins** (1–2 block patches every 20–30 blocks).
- The wall is at least **50 blocks tall above the SubTropolis floor** so the descent feels real.
- The wall is **carved** at the main portal location: a rectangular opening **12 blocks wide × 5 blocks high** centered at (0, 70, 0). This is the main entrance portal frame.
- A second smaller opening is **rough-cut** on the east face: a 12×5 rectangle centered at (100, 70, −100). This will be finished in Phase 6.

### 4.3 Main grid hollowing

- Carve a 200×200×5 block void at the design Y-level: X ∈ [−100, +100], Z ∈ [0, −200], Y ∈ [20, 25]. The chamber is hollowed out as a single room (the 5-block ceiling is part of the carve).
- **Floor:** raw `minecraft:stone` (not yet polished in this phase).
- **Walls and ceiling:** raw `minecraft:stone` (not yet painted).
- **No pillars in this phase.** Pillar placement is Phase 2.
- The chamber is **unfinished at the end of Phase 1** — dark, raw, no lighting. In survival, this is a mob spawn zone. The contractor should place **a single `minecraft:sea_lantern` block in the center of the chamber** immediately after carving to suppress mob spawns, or work in creative mode.

### 4.4 Sub-basement (light, this phase)

- Carve a 20×20×5 block void at Y ∈ [10, 15] centered on (−80, 10, −180). This is the service tunnel sub-basement, accessed later from the main grid by a downward corridor. The sub-basement is finished in Phase 2 (floor/ceiling polish) and the downward corridor is finished in Phase 7.

### 4.5 Verification (Phase 1 quality checkpoint)

Take a screenshot from approximately (0, 90, 30) (the future visitor center location) looking **north (−Z)**. The view should show:
- The ravine wall as a vertical face of `stone`/`calcite` mix.
- The portal opening as a dark rectangular void at Y=70.
- The surface plateau at Y=80 in the foreground.

**Acceptance:** the hillside reads as a mine entrance (not a cave, not a pit, not a shaft), and the surface plateau is visible above.

---

## 5. Phase 2 — Carve the Mine (Chamber Shell + Pillars)

**Goal:** the 200×200 chamber has its 5-block ceiling painted white, its floor polished, and its 8×8 white concrete pillars placed on the iconic-intersection grid. The sub-basement is finished.

### 5.1 Block specs

- **Ceiling (Y = 25):** `minecraft:white_concrete` (the top block of the chamber ceiling across the full 200×200 footprint = 40,000 blocks). The block **at Y=25 only** is white concrete; the chamber void above the ceiling (Y > 25) remains `minecraft:stone`/`calcite` (the rock overburden).
- **Painted border (Y = 24):** keep as raw `minecraft:smooth_stone` to suggest the original excavation (a 1-block band of exposed rock at the very top).
- **Floor (Y = 20):** `minecraft:polished_andesite` across the full 200×200 footprint (40,000 blocks).
- **Pillars (8×8, Y = 20–24):** `minecraft:white_concrete` (primary), with a 1-block band of `minecraft:light_gray_concrete` at the top (Y = 24) and bottom (Y = 20) to suggest paint wear. Every 4th iconic pillar is upgraded to `minecraft:smooth_quartz_block` for visual emphasis.

### 5.2 Pillar grid — coordinate table

**Main avenue intersections (Hushpuckney × cross-avenues):** pillars at the following iconic intersections. Each intersection has **4 corner pillars**, 8×8 blocks, 5 blocks tall.

**Hushpuckney (main avenue, X = 0, runs N-S along Z = 0 to Z = −200):** pillars at every cross-avenue. Cross-avenues intersect at Z = −30, −60, −100, −140, −180 (5 cross-avenues at 30–40 block spacing on the main avenue).

**Bethany Falls Blvd (E-W cross street, Z = −100, runs X = −100 to X = +100):** pillars at every north-south avenue.

**Side spur intersections** (at the start of each side spur):
- Side spur 1 (west): pillar at (−30, 20, −150) and at the turn into the spur
- Side spur 2 (east): pillar at (30, 20, −50) and at the turn into the spur

**Total iconic pillars: ~60–80**, each 8×8×5 = 320 blocks. Total pillar block count: ~20,000–25,000.

### 5.3 Pillar placement procedure (CRITICAL — coordinate accuracy is the #1 risk)

1. **Build one 8×8×5 pillar schematic** as a `.schem` file in the schematic library: white concrete body, light gray concrete at top and bottom 1-block band, smooth quartz at every-4th pillar (built as 4 separate pillar schematics or one with a variant flag).
2. **Generate a coordinate list** for every pillar. The list is a JSON or CSV with the integer (X, Y, Z) center of each pillar.
3. **Use the mc-fleet-bot schematic placement API** (or WorldEdit `//paste -a`) to paste each pillar at its exact coordinate. Do **not** place pillars by hand.
4. **Verify** with a screenshot from each of the 5 main intersections: all 4 corner pillars should be visible and identical.

### 5.4 Sub-basement finish

- **Floor (Y = 10):** `minecraft:stone` (kept rough; this is a service sub-basement, not a developed tenant floor).
- **Ceiling (Y = 15):** `minecraft:stone` (kept rough).
- **Downward corridor:** do not carve yet — that is Phase 7 (inter-site connections). The sub-basement is just the 20×20 void at this point, accessed from above by breaking a block in the floor of the main grid at (−80, 20, −180). A single `minecraft:ladder` is placed temporarily so the contractor can climb down for inspection.

### 5.5 Verification (Phase 2 quality checkpoint)

Walk the main avenue from the (future) portal location (0, 20, −5) northward to the central plaza (0, 20, −100). The first iconic intersection (3×3 grid of 8×8 white concrete pillars) should be visible from the southern end. The pillars should be evenly spaced and identical in proportion. The ceiling should be uniformly white concrete with a 1-block rough-stone band at the very top. The floor should be polished andesite.

**Acceptance:** the pillar grid is the dominant visual feature. The chamber reads as "industrial warehouse" not "limestone cave."

---

## 6. Phase 3 — Main Avenue + Street Signs

**Goal:** the 350-block main avenue (Hushpuckney + entrance ramp + exit ramp) has lane markings, street signs, stop signs, speed-limit signs, painted pillar numbers, and the central plaza.

### 6.1 Block specs

- **Lane markings (Hushpuckney, the main avenue portion, Z = 0 to Z = −200):**
  - **Center line:** `minecraft:yellow_concrete` 1-block-wide stripe down the center of the avenue (a 1×1 column of yellow concrete at (0, 20, Z) for Z = 0 to Z = −200). Total: 200 blocks.
  - **Edge lines:** `minecraft:white_concrete` 1-block-wide stripe on each side (at (−6, 20, Z) and (+6, 20, Z) for Z = 0 to Z = −200). Total: 400 blocks.
  - **Crosswalks:** `minecraft:white_concrete` 3-block-wide strip at every cross-avenue intersection (Z = −30, −60, −100, −140, −180), painted at the avenue floor level.
  - **Stop bars:** `minecraft:white_concrete` 1-block-wide strip on the avenue floor, 1 block in front of every stop sign.
- **Street signs (intersection corners):** at every iconic intersection, place a 1×3 block sign post on a `minecraft:fence` stem on each corner. The sign backing is `minecraft:green_concrete`; the text is on `minecraft:oak_sign` (more legible than painted blocks at scale).
  - **Hushpuckney Ave** — green concrete backing, oak sign text "Hushpuckney Ave" (canonical, `[D]`). One sign per direction, at every Hushpuckney intersection.
  - **Bethany Falls Blvd** — green concrete backing, oak sign text "Bethany Falls Blvd" (invented companion, `[X]`). One sign per direction, at every Bethany Falls intersection.
  - **Invented cross-street names** (use as needed, all `[X]`): Iola Ln, Muncie Dr, Galesburg Way, Winterset Crossing.
- **Stop signs:** 2-block `minecraft:red_concrete` square (approximating an octagon) on a `minecraft:fence` stem at the four corners of every iconic intersection. Total: ~50 stop signs.
- **Speed limit 15 signs:** 2×2 block `minecraft:white_concrete` sign with `minecraft:black_concrete` for the "15" digits, on a `minecraft:fence` stem. Place at:
  - Main entrance portal (Y=70, on the right side of the ramp, ~5 blocks inside the portal).
  - Second exit portal (Y=70, on the right side of the exit ramp, ~5 blocks outside the portal).
  - Central plaza (Y=20, on the main avenue at the intersection of Hushpuckney and Bethany Falls).
  - Every iconic intersection along the main avenue.
- **Painted pillar numbers:** at every iconic-intersection pillar, paint a 2-block-tall pillar number on the pillar face at human-readable height (Y = 22–23, the third block up from the floor). The numbering scheme is **block-number + cross-street abbreviation** (e.g., "911.10", "911.11", "911.12"). Use `minecraft:black_concrete` for the digits. **At least 12 visible numbered pillars on the main avenue.** If painted blocks are illegible at scale, fall back to `minecraft:oak_sign` attached to the pillar.

### 6.2 Coordinate table — main avenue and cross streets

| Feature | Path | Length | Notes |
|---|---|---|---|
| **Hushpuckney Ave** | (0, 20, 0) to (0, 20, −200) | 200 blocks | N-S main avenue through the grid |
| **Bethany Falls Blvd** | (−100, 20, −100) to (+100, 20, −100) | 200 blocks | E-W cross street at the central plaza |
| **Iola Ln** (invented) | (−30, 20, 0) to (−30, 20, −200) | 200 blocks | Cross street, 30 blocks west of Hushpuckney |
| **Muncie Dr** (invented) | (+30, 20, 0) to (+30, 20, −200) | 200 blocks | Cross street, 30 blocks east of Hushpuckney |
| **Galesburg Way** (invented) | (0, 20, −30) to (±100, 20, −30) | 200 blocks | E-W at Z=−30 |
| **Winterset Crossing** (invented) | (0, 20, −140) to (±100, 20, −140) | 200 blocks | E-W at Z=−140 |

### 6.3 Central plaza

- At the intersection of Hushpuckney and Bethany Falls (0, 20, −100), expand the floor to a **20×20 block circular `minecraft:quartz_block` plaza** with a 3-block-diameter `minecraft:quartz_block` medallion in the center.
- Mount the **"SUBTROPOLIS — Est. 1964" plaque** (see §11) on the pillar nearest the plaza.

### 6.4 Verification (Phase 3 quality checkpoint)

Walk the main avenue from the south portal (0, 20, −5) to the central plaza (0, 20, −100), then continue to the north end of the grid (0, 20, −195). Every intersection should have visible street signs, stop signs, speed-limit signs, and numbered pillars. The lane markings should be continuous and centered.

**Acceptance:** the visitor can navigate the grid using the signs alone (no map required).

---

## 7. Phase 4 — Tenant Zones (≥6 distinct fit-outs)

**Goal:** the main avenue has at least 6 visibly distinct tenant fit-outs, including the dock-door scene for USPS, the climate-controlled vault for NARA, the sealed data center for STC, and the four fit-out archetypes.

### 7.1 The four fit-out archetypes (binding — every tenant maps to one)

| Archetype | Visual cues | Tenants using it |
|---|---|---|
| **Records archive** | High-bay shelving (5 blocks tall), dim amber lighting, narrow aisles (1 block), climate-control signage | NARA, UV&S |
| **Package logistics** | Conveyor systems, dock doors (dark oak), package sorting, semi-trailer prop, yellow lane markings | USPS |
| **Data center** | Sealed chamber, server racks (obsidian front, redstone lamp indicators), cool blue underglow, biometric entry | STC |
| **General industrial** | Pallet racks (fence + slab), painted parking-bay floor markings, white-box office partitions, white concrete walls | Hallmark / Russell Stover, Grainger, EPA, Ford vehicle storage |

### 7.2 Fit-out 1 — USPS Stamp Distribution / Fulfillment Center (PACKAGE LOGISTICS)

- **Position:** main grid at (X = −30 to −60, Y = 20, Z = −30 to −80). Two adjacent chambers: the Distribution Center (north chamber) and the Fulfillment Center (south chamber), separated by a 1-block wall.
- **Approximate real-world size:** 217,114 sq ft (Distribution) + 311,600 sq ft (Fulfillment). `[D]`
- **Build size:** ~30×50 blocks total internal space, with a 5-bay dock door scene on the east side (facing the main avenue).
- **Dock doors:** 5 numbered `minecraft:dark_oak_door` (1×2 each) labeled S1–S5 with `minecraft:yellow_concrete` numbers above. A `minecraft:rail` runs in front of the doors. A single `minecraft:minecart` (representing a backed-in semi-trailer) sits at bay S3.
- **Dock yard strip:** 5×50 blocks of `minecraft:polished_andesite` with `minecraft:yellow_concrete` lane markings and `minecraft:yellow_concrete` bollards (1-block posts) protecting the pillars.
- **Tenant sign:** 4×2 block sign reading "USPS — National Requisition Center" in `minecraft:blue_concrete` (USPS blue) on `minecraft:white_concrete`. Hung between two pillars with `minecraft:white_banner`.
- **Interior:** `minecraft:white_concrete` walls, `minecraft:polished_andesite` floor with yellow striping, `minecraft:polished_deepslate` conveyor segments (the polished deepslate represents the conveyor belt surface), `minecraft:barrel` and `minecraft:chest` stacks in rows. A small white-box office (`minecraft:white_concrete` walls, `minecraft:dark_oak_door`, `minecraft:glass_pane` window) with "Stamp Distribution" sign.
- **Easter egg:** "**2001 USPS ANTHRAX SCARE**" memorial plaque — a `minecraft:item_frame` on the wall with a `minecraft:paper` inside reading "2001 — USPS Anthrax Precautionary Testing — SubTropolis Shelter-in-Place." `[D]`
- **Lighting:** `minecraft:sea_lantern` every 5 blocks on the ceiling, plus a `minecraft:lantern` over each dock door. Bright fluorescent.
- **Tag:** `[D]` for tenant, dock doors, branding, 2001 plaque. `[I]` for conveyor layout and specific inventory.

### 7.3 Fit-out 2 — NARA Federal Records Center (RECORDS ARCHIVE)

- **Position:** main grid at (X = +40 to +60, Y = 20, Z = −140 to −160).
- **Approximate real-world size:** 102,000 sq ft initial lease (2012), with options to 372,000 sq ft. `[D]`
- **Build size:** ~20×20 blocks internal.
- **Door:** `minecraft:dark_oak_door` with a 2×2 block sign above reading "NARA — FEDERAL RECORDS CENTER" in `minecraft:tan_concrete` (NARA tan) on `minecraft:white_concrete`. A `minecraft:glass_pane` window in the door.
- **Interior lighting:** dim, warm amber, archival-safelight feel. **`minecraft:end_rod` placed horizontally under each shelf run** (one per shelf run). A single `minecraft:lantern` at the door. **No sea lanterns, no glowstone.** `[I]`
- **High-bay shelving:** rows of `minecraft:bookshelf` (or `minecraft:barrel` as archive boxes) running **floor-to-ceiling (5 blocks tall)**. Aisle width: 1 block. The shelving should look like a *wall of boxes*. This is the defining visual of the archive. `[D]`
- **Shelf construction:** `minecraft:smooth_stone_slab` (or `minecraft:polished_andesite_slab`) shelves at heights Y=20, Y=22, Y=24, with `minecraft:barrel` blocks stacked on each shelf.
- **Aisle markers:** `minecraft:oak_sign` at each aisle reading "A1", "A2", etc.
- **Floor:** `minecraft:polished_andesite` with `minecraft:white_concrete` painted aisle lines.
- **Climate sign:** `minecraft:oak_sign` on the wall near the door reading "**CLIMATE: 65°F / 35% RH — CONSTANT**." `[D]`
- **Tag:** `[D]` for tenant, 2012 lease, climate framing. `[I]` for the aisle/box layout.

### 7.4 Fit-out 3 — SubTropolis Technology Center / Data Center (DATA CENTER)

- **Position:** main grid at (X = +60 to +80, Y = 20, Z = −140 to −160). Adjacent to NARA (one wall shared).
- **Real anchor:** LightEdge (2014); current STC campus. `[D]`
- **Build size:** ~20×20 blocks internal server-hall space, plus a 6×6 sealed entry chamber.
- **Door frame:** `minecraft:black_concrete` door frame (3 blocks tall, 2 blocks wide) with a `minecraft:dark_oak_door` (1×2) set inside, and a `minecraft:glass_pane` window. Above the door, a 4×1 block sign reading "**SubTropolis Technology Center**" in `minecraft:light_blue_concrete` on `minecraft:black_concrete`, with an "STC" logo block.
- **Biometric hand-reader prop:** a `minecraft:black_concrete` pedestal (1×1×2 blocks) just outside the door, with `minecraft:iron_trapdoor` on top representing the hand-reader surface, and a `minecraft:redstone_lamp` (off, but wired to a hidden redstone clock) that blinks red. An `minecraft:oak_sign` below reads "**BIOMETRIC HAND READER — 24/7 ARMED SECURITY**." `[D]`
- **Server hall interior:** 2 rows of 6 server racks each. Each rack is `minecraft:black_concrete` (sides), `minecraft:obsidian` (front face, 1 block), `minecraft:stone_button` or `minecraft:redstone_lamp` indicator set into the front face, and `minecraft:smooth_stone_slab` on top. The 2 rows are separated by a 1-block cold aisle; the hot aisle is on the outside of each row.
- **Cold-aisle underglow:** `minecraft:shroomlight` placed **under** `minecraft:polished_deepslate` slabs in the cold aisle. The slabs go on top of the shroomlight, creating a cool blue underglow visible from the hot aisle.
- **Status lights:** the `minecraft:redstone_lamp` indicators are wired to a `minecraft:redstone_repeater` clock (4-repeater loop, hidden behind a wall) that blinks them slowly on and off in a staggered pattern. `[D]`
- **Conduit detail:** a 1-block-wide `minecraft:green_concrete` strip (the data utility line) running along the wall, with an `minecraft:oak_sign` reading "**DARK FIBER — 1102 GRAND**." `[D]`
- **Climate control vents:** a row of `minecraft:iron_bars` in the ceiling at one end of the hall, with a `minecraft:shroomlight` behind each one. `minecraft:oak_sign` below reads "**COLD AISLE 65°F**." `[I]`
- **Floor:** `minecraft:polished_deepslate` (the only place in the build that uses this block) with `minecraft:light_blue_concrete` painted aisle lines. `[I]`
- **Tag:** `[D]` for tenant, biometric, dark fiber, ENERGY STAR 100. `[I]` for rack layout and redstone clock.

### 7.5 Fit-out 4 — W.W. Grainger Industrial Distribution (GENERAL INDUSTRIAL)

- **Position:** main grid at (X = +50 to +70, Y = 20, Z = −30 to −70).
- **Real anchor:** 2026 expansion — "largest known underground distribution center in the world." `[D]`
- **Build size:** ~20×40 blocks internal with a 6-bay dock door scene on the west side (facing the main avenue).
- **Dock doors:** 6 numbered `minecraft:dark_oak_door` labeled G1–G6 with `minecraft:orange_concrete` (Grainger orange) numbers above. A `minecraft:rail` in front. A `minecraft:minecart` at one of the bays.
- **Tenant sign:** 4×2 block sign reading "**W.W. GRAINGER — Industrial Distribution**" in `minecraft:orange_concrete` on `minecraft:white_concrete`. `[D]`
- **Interior:** `minecraft:white_concrete` walls, `minecraft:polished_andesite` floor with `minecraft:yellow_concrete` lane markings, `minecraft:white_concrete` bollards. Pallet racks built from `minecraft:oak_fence` (uprights) and `minecraft:oak_slab` (shelves) — 2-block-wide × 4-block-tall racking system. A small `minecraft:white_concrete` office with a "Pick & Pack" `minecraft:dark_oak_door`.
- **Inventory:** `minecraft:barrel` and `minecraft:chest` on the pallets, with `minecraft:oak_sign` labels: "HVAC FILTERS", "FASTENERS", "POWER TOOLS". `[I]`
- **Lighting:** `minecraft:glowstone` every 6 blocks on the ceiling. Bright industrial.
- **Tag:** `[D]` for tenant, branding, dock doors. `[I]` for rack layout and inventory.

### 7.6 Fit-out 5 — EPA Region 7 Training & Logistics Center (GENERAL INDUSTRIAL / OFFICE)

- **Position:** main grid at (X = +20 to +35, Y = 20, Z = −40 to −60).
- **Real size:** 43,200 sq ft. `[D]`
- **Build size:** ~15×20 blocks internal.
- **Door:** `minecraft:dark_oak_door` with `minecraft:glass_pane` window. Above, 3×1 block sign reading "**EPA Region 7 — Training & Logistics Center**" in `minecraft:blue_concrete` (EPA blue) on `minecraft:white_concrete`. `[D]`
- **Interior:** small office / training room. `minecraft:white_concrete` walls, `minecraft:polished_andesite` floor. `minecraft:oak_stairs` as bleacher-style seating. A few `minecraft:lectern` (or `minecraft:oak_fence` as desks) facing the seating. A wall map: a `minecraft:white_banner` with `minecraft:light_blue_concrete` markings representing the EPA Region 7 map. `minecraft:oak_sign` on the wall: "**EMERGENCY RESPONSE — 24/7**." `[I]`
- **Lighting:** `minecraft:glowstone` every 6 blocks; one `minecraft:lantern` on the desk.
- **Tag:** `[D]` for tenant. `[I]` for interior.

### 7.7 Fit-out 6 — Hallmark / Russell Stover Consumer Goods (GENERAL INDUSTRIAL)

- **Position:** main grid at (X = −50 to −70, Y = 20, Z = −140 to −170).
- **Real anchor:** Hallmark (card / ribbon distribution); Russell Stover (candy storage) — both early-1960s tenants. `[D]`
- **Build size:** ~20×30 blocks combined, with a 4-bay shared dock door scene on the east side.
- **Dock doors:** 4 numbered `minecraft:dark_oak_door` labeled H1–H4 with `minecraft:yellow_concrete` (Hallmark gold) numbers. `minecraft:rail` in front. `[D]`
- **Tenant sign:** 4×2 block sign reading "**Hallmark / Russell Stover — Consumer Goods Distribution**" in `minecraft:yellow_concrete` (Hallmark gold) on `minecraft:white_concrete`. `[D]`
- **Interior — Hallmark section:** pallet racks with `minecraft:white_concrete` blocks (ribbon / card stock) and `minecraft:red_concrete` accents. Small packaging-line area with `minecraft:polished_andesite` conveyor segments. `minecraft:barrel` and `minecraft:chest` representing inventory. `[I]`
- **Interior — Russell Stover section:** `minecraft:brown_concrete`-accented zone with `minecraft:chest` and `minecraft:barrel` of "chocolate inventory" (built as `minecraft:brown_concrete` blocks on pallets). `minecraft:oak_sign` on the wall: "**KEEP COOL 65°F**." `[I]`
- **Tag:** `[D]` for tenant identities, early-1960s anchor history. `[I]` for interior.

### 7.8 Fit-out 7 — Underground Vaults & Storage (UV&S) Film Archive (RECORDS ARCHIVE)

- **Position:** main grid at (X = −40 to −50, Y = 20, Z = −170 to −190). Off the main avenue, in a quiet corner.
- **Real anchor:** UV&S is the "distributor of last resort" for major American film studios. `[D]`
- **Build size:** a small secured room, ~10×20 blocks, with a single `minecraft:iron_door` (it is a *vault*). `[I]`
- **Door:** `minecraft:iron_door` with `minecraft:oak_sign` above reading "**UV&S — AUTHORIZED PERSONNEL ONLY**." `[D]`
- **Interior:** 3 rows of metal shelving built from `minecraft:iron_bars` (uprights) and `minecraft:iron_trapdoor` (shelves), 3 blocks tall. `minecraft:barrel` and `minecraft:chest` on the shelves. A single `minecraft:lantern` at the door (only light source). The room is dim. `[I]`
- **The film cans (easter egg):** a single `minecraft:barrel` on the middle shelf with an `minecraft:oak_sign` label reading "**GONE WITH THE WIND — INTERPOSITIVE**." A second `minecraft:barrel` with similar label "**WIZARD OF OZ — MASTER**." **No posters, no display cases, no green-ray imagery.** Just two labeled cans. `[D]`
- **Climate sign:** `minecraft:oak_sign` at the door: "**CLIMATE-CONTROLLED FILM ARCHIVE — 38°F / 35% RH**." `[I]`
- **Tag:** `[D]` for tenant, film can labels. `[I]` for room layout and climate numbers.

### 7.9 Fit-out 8 — Ford / Grainger Historical Vehicle Storage (GENERAL INDUSTRIAL variant)

- **Position:** main grid at (X = +30 to +50, Y = 20, Z = −170 to −195). At the far north end of the grid, near the ghost mine spur.
- **Real anchor:** Ford's 25-acre lease in the early 1970s; replaced by Grainger's vehicle-storage operations. `[D]`
- **Build size:** ~20×25 blocks, with a row of 8+ "vehicles" parked in parking bays.
- **Floor:** `minecraft:polished_andesite` with `minecraft:white_concrete` parking-bay lines and `minecraft:yellow_concrete` center lane.
- **Vehicles:** 8+ parked `minecraft:minecart` in two rows. First row is "Ford-era" unmodified (gray / iron-tone minecarts). Second row is "Grainger-era" with `minecraft:orange_concrete` markings on the parking-bay floor. The optional `D:\projects\mc-fleet-bot\schematics\black-truck.schem` and `orange-truck.schem` can be substituted here if available — but minecarts alone are sufficient. `[I]`
- **Tenant sign:** 3×1 block sign reading "**VEHICLE STORAGE — NO DRIVING BEYOND THIS POINT**" in `minecraft:white_concrete` on `minecraft:red_concrete`. `[D]`
- **Historical plaque:** `minecraft:oak_sign` on the wall: "**FORD MOTOR CO. — 25-ACRE VEHICLE LEASE, 1970s. CURRENTLY: W.W. GRAINGER, INDUSTRIAL DISTRIBUTION.**" `[D]`
- **Tag:** `[D]` for Ford lease, vehicle storage, current Grainger operation. `[I]` for minecart-as-vehicle.

### 7.10 Verification (Phase 4 quality checkpoint)

Walk the main avenue from the south portal to the central plaza. Each tenant fit-out should be visually distinct from the next: dock doors (USPS, Grainger, Hallmark), archive shelving (NARA, UV&S), sealed data center (STC), office/training (EPA), vehicle bays (Ford/Grainger). Brand colors are present but restrained (a few accent blocks, not whole walls).

**Acceptance:** the visitor can identify each tenant by its visual identity (signage + accent colors + fit-out archetype).

---

## 8. Phase 5 — Climate-Controlled Zones (Deep Detail)

**Goal:** the data center, NARA archive, and UV&S vault have visible climate-control details (vents, dim lighting, climate signage) and the "no weather" feel is established throughout the chamber.

### 8.1 Block specs (per zone)

- **STC cold-aisle underglow:** the `minecraft:shroomlight` under `minecraft:polished_deepslate` slabs is already in place from Phase 4. Verify the underglow is visible from the hot aisle but not blinding. Adjust slab height or shroomlight count if needed.
- **STC hot-aisle exhaust:** a row of `minecraft:iron_bars` in the ceiling above the hot aisle, with `minecraft:redstone_lamp` (on) indicators — the "hot air being exhausted" feel. `minecraft:oak_sign` above reads "**HOT AISLE EXHAUST**."
- **NARA end-rod lighting:** verify one `minecraft:end_rod` per shelf run is in place, placed on the *underside* of the shelf (not on top), emitting light horizontally. If the lighting is too dim, add a second end-rod per run.
- **NARA ambient:** add a `minecraft:soul_lantern` (or a single `minecraft:lantern`) at the door to give the room a faint warm fill light in addition to the end-rod shelf lighting.
- **UV&S vault:** the single `minecraft:lantern` at the door is already in place. Verify the room is dim — only the lantern should be visible, with the film cans as dark silhouettes on the shelves.
- **Climate signs at every climate-controlled door:** add `minecraft:oak_sign` reading "**CLIMATE-CONTROLLED — 65°F ± 2° — 35% RH**" to the door of NARA, STC, and UV&S. For UV&S, the sign reads "**38°F / 35% RH**" (the film-vault specific value).
- **Main avenue ambient:** the sea-lantern strip density should be every 4–5 blocks. If too dense, space them out; if too sparse, add more. Walk the build at night to verify.
- **Side spurs:** `minecraft:glowstone` every 6 blocks on the ceiling of the side spurs (slightly cooler than the main avenue).

### 8.2 The "no weather / no mobs" feel (mechanical)

- The main grid floor is **polished andesite** — no moss, no vines, no water features, no snow. The chamber is *dry*. The visitor should *feel* that this is a sealed environment.
- Place `minecraft:carpet` blocks in key locations (the central plaza, the main intersection, inside each tenant entrance) to suppress mob spawns in survival mode. Optional, advanced. `[X]`
- If the contractor is working in survival, the chamber should be **fully lit immediately after Phase 1** (a temporary sea-lantern grid) to prevent mob spawns during the build. Remove the temporary grid in Phase 5 when the proper lighting is in place.

### 8.3 Verification (Phase 5 quality checkpoint)

Enter the data center. The cool blue underglow should be visible in the cold aisle. The red/green status lights should be blinking slowly (not strobing). The "COLD AISLE 65°F" sign should be readable. Walk into the NARA archive. The dim amber light should make the high-bay shelving feel *darker* than the main avenue. The "65°F ± 2°" sign should be at the door. Enter the UV&S vault. The room should be dim — single lantern, dark shelves, two labeled film cans barely visible.

**Acceptance:** the visitor can tell which zones are climate-controlled by feel (lighting + signage) without reading any signs.

---

## 9. Phase 6 — Surface Building + Entrance Ramp + Exit Portal

**Goal:** the surface plateau, the Hunt Midwest visitor center, the parking lot, the entrance ramp, the exit portal, and the parking lot are built and lit. The daylight-to-fluorescent transition is in place.

### 9.1 Surface building (Hunt Midwest visitor center)

- **Position:** (15, 80, 10) to (25, 86, 20) — an 8×10×6 block building (W×L×H) at the south edge of the surface plateau.
- **Facade:** `minecraft:white_concrete` with `minecraft:light_gray_concrete` accents and `minecraft:stone_brick_slab` (or `minecraft:slate`) foundation. A `minecraft:dark_oak_door` with `minecraft:glass_pane` window.
- **Mounted sign:** a 3×1 block sign on the facade reading "**Hunt Midwest Real Estate Development**" in `minecraft:red_concrete` on `minecraft:white_concrete`.
- **Interpretive wall (interior):** a wall of `minecraft:white_concrete` with `minecraft:oak_sign` and `minecraft:item_frame` panels covering:
  - Bethany Falls Limestone sample: a single `minecraft:smooth_stone` block on the wall with a label "**Bethany Falls Limestone — 270 Ma**." `[D]`
  - Scale model: a small `minecraft:white_concrete` + `minecraft:calcite` cross-section showing the 5-block ceiling, 8×8 pillar, 12-block corridor. `[D]`
  - "**150 FT BELOW SURFACE (up to 160 ft maximum)**" `[D]`
  - "**68°F YEAR-ROUND (65–70°F range)**" `[D]`
  - "**8.2 MI OF PAVED ROAD**" `[D]`
  - "**18,000–24,000 PSI COMPRESSIVE STRENGTH (6× concrete)**" `[D]`
  - "**ENERGY STAR 100 — 2012–**" framed certificate (`minecraft:item_frame` with `minecraft:paper` inside). `[D]`
  - "**Designated U.S. Foreign-Trade Zone — Largest Under One Roof**" `minecraft:oak_sign`. `[D]`
  - "**SUBTROPOLIS — Est. 1964**" `minecraft:oak_sign`. `[D]`
  - Tenant directory board: a 5×4 block sign of `minecraft:dark_oak_fence` + `minecraft:oak_sign` listing "**55+ Tenants**" with marquee names (USPS, NARA, EPA, LightEdge, Grainger, Hallmark, Russell Stover, UV&S).

### 9.2 Marquee sign over the main portal

- **Position:** above the main portal at (0, 73, 0), 3 blocks above the portal frame.
- **Form:** 6×2 block sign, `minecraft:red_concrete` background (Hunt Midwest red), `minecraft:white_concrete` text "**WORLD'S LARGEST UNDERGROUND BUSINESS COMPLEX® — HUNT MIDWEST SUBTROPOLIS**" with a `minecraft:oak_sign` overlay for the ® symbol and finer text. `[D]`
- **Visibility:** the sign must be readable from the parking lot (30 blocks away). Test legibility before moving on.

### 9.3 Parking lot

- **Position:** X ∈ [30, 70], Z ∈ [15, 50] — south of the visitor center, at Y=80.
- **Layout:** 6 rows × 8 cars of `minecraft:gray_concrete` with `minecraft:white_concrete` parking-bay lines. A few parked `minecraft:minecart` in random spots (the "vehicles").
- **Lighting:** one `minecraft:lantern` on a `minecraft:fence` post per row.

### 9.4 Lamar Hunt / KC Chiefs plaque

- **Position:** a small `minecraft:oak_sign` on a `minecraft:fence` post near the parking lot, at approximately (50, 81, 30).
- **Form:** the sign reads "**LAMAR HUNT — FOUNDER — 1964**." Behind it on a wall or `minecraft:white_banner`, a single mounted `minecraft:red_concrete` + `minecraft:yellow_concrete` arrowhead (the Chiefs logo abstracted to a red/gold geometric). No Chiefs helmet, no football imagery, no stadium references. `[D]`

### 9.5 Worlds of Fun silhouette (faded reference)

- **Position:** on a neighboring hilltop, ~150 blocks from the visitor center, at (200, 120, 250) (a single point in the distance — the exact position is at the contractor's discretion based on terrain).
- **Form:** a single `minecraft:dark_oak_fence` post (15 blocks tall) with a `minecraft:white_banner` on top. Visible from the ravine rim. **No coaster tracks, no Ferris wheel.** The visitor sees a single white rectangle on a hilltop in the distance and knows what it represents. The optional `D:\projects\mc-fleet-bot\schematics\small-roller-coaster.schem` or `ferris-wheel.schem` can be substituted here if more detail is desired, but a single banner is sufficient. `[D]`

### 9.6 Entrance ramp (the canonical visitor moment)

- **Position:** from (0, 70, 0) at the surface portal down to (0, 20, −100) at the main grid floor. The ramp is a 12-block-wide road (centered on X=0), descending 50 blocks in Y over 100 blocks of Z, with a sweeping diagonal. The 5% grade allows a player to walk down at sprint speed without jumping.
- **Length:** ~100 blocks of ramp (plus the 200-block main avenue continuation = the 350-block total). The exact path is at the contractor's discretion — a straight diagonal is acceptable, or a gentle S-curve.
- **Surface:** `minecraft:polished_andesite` with `minecraft:yellow_concrete` painted center line, `minecraft:white_concrete` edge lines.
- **Walls:** `minecraft:smooth_stone` + `minecraft:calcite` (the limestone blend) for the first 20 blocks, transitioning to `minecraft:white_concrete` for the interior finish over the last 30 blocks. The transition is the "you are now in the painted corridor" moment.
- **Ceiling:** lowers from open sky to the rock ceiling gradually over the first 20 blocks of the descent, then closes fully.
- **Lighting (the canonical transition):**
  - **First 20 blocks:** full daylight (sky still visible).
  - **Middle 20 blocks:** transition zone. `minecraft:sea_lantern` on the ceiling at ~6-block spacing, alternating with the remaining daylight.
  - **Bottom 10 blocks:** pure fluorescent. `minecraft:sea_lantern` every 4 blocks. The air feels *cooler*. The player is now in the interior.
- **Signage at the portal mouth:**
  - "**SPEED LIMIT 15**" sign on a `minecraft:fence` post on the right side of the ramp, ~5 blocks inside the portal. `[D]`
  - "**NO TRUCK IDLING**" sign on the left, 10 blocks in. `[D]`
  - "**NO AM/FM RECEPTION**" sign 15 blocks in, with a small wall-mounted utility box (`minecraft:oak_fence` + `minecraft:oak_sign`) representing the "above-ground AM/FM relay antenna." `[D]`
  - "**WELCOME TO SUBTROPOLIS**" `minecraft:oak_sign` on the nearest pillar at the bottom of the ramp.
  - Second "**SPEED LIMIT 15**" sign at the bottom of the ramp, facing the player entering the grid.

### 9.7 Exit portal

- **Position:** (100, 70, −100) on the east face of the SubTropolis hill, perpendicular to the main entrance.
- **Portal frame:** 12 blocks wide × 5 blocks high, same construction as the main entrance (rounded `minecraft:smooth_stone` + `minecraft:calcite` frame). A paved road comes *out* of the portal onto the east face.
- **Surface lot:** much smaller than the main entrance — just a paved turnaround, no parking lot.
- **Signage:** "**EXIT**" `minecraft:oak_sign` on the right side of the exit ramp. "**YOU ARE LEAVING SUBTROPOLIS — DRIVE SAFELY**" `minecraft:oak_sign` on the left. A small security kiosk (3×3×3 block `minecraft:white_concrete` structure with a `minecraft:dark_oak_door`).
- **Lighting:** the inverse of the main entrance — daylight gradually growing on the wall ahead, then full daylight at the exit. The transition should be a *relief*, not a dramatic reveal.

### 9.8 Verification (Phase 6 quality checkpoint)

Drive the full visit — start at the parking lot, descend the ramp, walk the main avenue to the central plaza, continue north, exit through the exit portal. The light transition at the portal mouth should feel *clean and immediate* (within 10 blocks of descent). The ramp should feel *gentle* (a player can walk down at sprint speed without jumping). The exit should feel like a *relief*.

**Acceptance:** the visitor feels the air getting cooler. The descent is gradual. The lighting changes.

---

## 10. Phase 7 — Finishing: Easter Eggs, Ghost Mine, Inter-Site, Lighting

**Goal:** the off-path easter eggs, the ghost mine chamber, the inter-site connections, and the lighting tuning are all in place.

### 10.1 Easter eggs (off-path)

- **Hunt Hall round room (off the central plaza):**
  - **Position:** a small ~15-block-diameter round room off the main avenue at (0, 20, −100), accessed through a `minecraft:dark_oak_door` from the central plaza.
  - **Walls:** circular wall of `minecraft:white_concrete` with `minecraft:light_gray_concrete` trim.
  - **Inside:** `minecraft:polished_andesite` floor with a 3-block-diameter `minecraft:quartz_block` medallion in the center. On the medallion, a `minecraft:item_frame` with a `minecraft:paper` or `minecraft:filled_map` representing the Lamar Hunt portrait. On the wall, a single mounted `minecraft:red_concrete` + `minecraft:yellow_concrete` arrowhead (the Chiefs logo abstracted). `minecraft:oak_sign` on the wall: "**HUNT HALL — IN HONOR OF LAMAR HUNT (1932–2006), FOUNDER OF SUBTROPOLIS**." `[D]`
- **UV&S film archive (easter egg within Fit-out 7):** already in place from Phase 4. The two labeled film cans (GONE WITH THE WIND, WIZARD OF OZ) are the easter egg.
- **FTZ sign:** a single `minecraft:oak_sign` in the visitor center / leasing office interior reading "**Designated U.S. Foreign-Trade Zone — Largest Under One Roof**." `[D]`
- **ENERGY STAR 100 framed certificate:** a 1×1 `minecraft:item_frame` with a `minecraft:paper` inside reading the certificate text, on the interpretive wall. `[D]`
- **Shift-change signage:** three `minecraft:oak_sign` at one of the major intersections reading "**FIRST SHIFT — 06:00**" / "**SECOND SHIFT — 14:00**" / "**THIRD SHIFT — 22:00**." `[D]`
- **Employee cafeteria (faded):** a small 8×8 break room off the main avenue at (−20, 20, −30). `minecraft:oak_stairs` as bleacher seating, `minecraft:oak_fence` as lunch tables, `minecraft:cauldron` as coffee stations, `minecraft:crafting_table` as food-prep counter, `minecraft:jukebox` as "SubTropolis Radio" (silent — no AM/FM reception). `[I]`
- **Groundhog Run banner:** a single `minecraft:white_banner` hung between two pillars in one corridor, reading "**Annual Groundhog Run — 10K Underground — 1st Saturday in February**." `[D]`
- **2001 USPS anthrax plaque:** already in place in the USPS fit-out. The framed `minecraft:paper` is the easter egg.

### 10.2 Ghost mine chamber (off the west side spur)

- **Side spur 1 (west):** from (−30, 20, −150) extending to (−90, 20, −190), 100 blocks long, 10 blocks wide, 5 blocks high.
  - **Floor:** `minecraft:stone` (no polished andesite).
  - **Walls:** `minecraft:stone` (no painted concrete).
  - **Ceiling:** `minecraft:stone`, with `minecraft:cobweb` hanging from the ceiling every 10 blocks.
  - **Lighting:** `minecraft:glowstone` every 10 blocks (dimmer than the main avenue).
- **Barricade at block 90 of the spur (at approximately (−85, 20, −185)):** a 3-block-tall `minecraft:oak_fence` with `minecraft:oak_fence_gate` spanning the corridor. Above the fence, a 2×1 block sign reading "**DANGER — ACTIVE MINING — HUNT MIDWEST MINING, INC.**" in `minecraft:red_concrete` on `minecraft:white_concrete`. A second sign below: "**NO UNAUTHORIZED ENTRY BEYOND THIS POINT.**" `[D]`
- **The chamber (behind the barricade):** 20×20 blocks of `minecraft:smooth_stone` walls and ceiling (rough, not painted), `minecraft:stone` and `minecraft:gravel` floor. **No lighting** except a single `minecraft:soul_lantern` at the barricade (visible from outside but not the chamber interior). A few `minecraft:deepslate` blocks scattered in the walls (the active-mining "fresh-cut" feel). A single `minecraft:minecart` on a short stretch of `minecraft:rail` in the middle of the chamber. `[I]`
- **Atmosphere:** vanilla cave ambient dominates. The player can hear the *cave* sounds through the gap in the barricade.

### 10.3 Side spur 2 (east) — historical tenants corridor

- **Side spur 2 (east):** from (30, 20, −50) extending to (90, 20, −20), 100 blocks long, 10 blocks wide, 5 blocks high.
- **Configuration:** a "1964–1990 Historical Tenants" corridor with small (5×5 block) representative spaces for the historical tenants. `minecraft:oak_sign` at the spur entrance: "**1964–1990 HISTORICAL TENANTS**."
- **Historical tenants (one small chamber each):**
  - **Pillsbury** — flour storage (`minecraft:white_concrete` blocks representing flour bags, `minecraft:oak_sign` "**Pillsbury Flour Storage — 1964**").
  - **Russell Stover** (historical) — chocolate storage (small `minecraft:brown_concrete`-accented zone with `minecraft:chest`).
  - **First tenant** — a small `minecraft:oak_sign` on the wall: "**1964 — First Tenant: A Local Construction Company**." (No fit-out needed; this is a historical reference.)
- **Tag:** `[I]` for interior. `[D]` for tenant history.

### 10.4 Inter-site connection 1 — Service tunnel to Cheyenne (project fiction, [X])

- **SubTropolis terminus:** the 20×20 sub-basement at (−80, 10, −180), already carved in Phase 1. Now finish it:
  - **Downward corridor from main grid:** carve an 8-block-wide, 5-block-high corridor from (−80, 20, −180) on the main grid floor to (−80, 10, −180) in the sub-basement, ~30 blocks long with a 1-block-per-5-blocks descending step. `minecraft:dark_oak_door` with `minecraft:oak_sign` "**AUTHORIZED VEHICLES ONLY**" at the entrance from the main grid.
  - **Security gate:** `minecraft:oak_fence` with `minecraft:oak_fence_gate` at the entrance from the sub-basement into the main grid. `minecraft:oak_sign` above: "**SECURITY CHECKPOINT — AUTHORIZED PERSONNEL ONLY**." `[D]`
  - **Sub-basement interior:** `minecraft:polished_andesite` floor, `minecraft:white_concrete` walls. A 1-block-wide `minecraft:rail` loop (a service-vehicle turnaround). A single `minecraft:minecart` (the parked service vehicle). `minecraft:oak_sign` on the wall: "**SERVICE TUNNEL — COMBINED COMPLEX MAINTENANCE — AUTHORIZED VEHICLES ONLY**." A small maintenance bay with `minecraft:crafting_table` and a few `minecraft:chest` (the maintenance supplies). `[I]`
  - **Lighting:** `minecraft:lantern` every 8 blocks. Dim, functional.
  - **Service tunnel to Cheyenne (the horizontal tunnel itself):** carved at Y=4–9 (sub-basement level), running west from the sub-basement at (−80, 10, −180) toward the ravine floor and the Cheyenne Mountain Complex (which is on the north wall of the ravine, ~400–600 blocks away). 6 blocks wide × 5 blocks high, single-lane, minecart-compatible. **The SubTropolis side terminates at the sub-basement; the Cheyenne side is designed by the Cheyenne Mountain team.**
  - **Tag:** `[X]` — project fiction. The real SubTropolis has no service tunnel to a sister facility.

### 10.5 Inter-site connection 2 — Public shaft to city (project fiction, [X])

- **Public Access Lobby (at the SubTropolis grid edge):** a 12×12 block lobby at (60, 20, −180) to (72, 20, −192), with:
  - **Door from main grid:** `minecraft:dark_oak_door` entrance, visible from the main avenue.
  - **Tenant sign:** `minecraft:oak_sign` above the door: "**PUBLIC TRANSIT — COMBINED COMPLEX — TICKETED VISITORS ONLY**." `[D]`
  - **Security guard booth:** a 3×3×3 block `minecraft:white_concrete` structure with a `minecraft:dark_oak_door` and a `minecraft:lantern` inside, just inside the lobby entrance.
  - **Turnstile prop:** a 1-block-wide `minecraft:oak_fence` with `minecraft:oak_fence_gate` that the player can pass through.
  - **Vertical shaft:** a 5×5 opening in the ceiling of the lobby. The shaft is **visible from the lobby** (a long vertical line of `minecraft:ladder` going straight up). `minecraft:lantern` at 5-block intervals lighting the shaft. **Optional but recommended:** add a `minecraft:soul_sand` + `minecraft:water` bubble elevator (water column) in addition to the ladder, so the player can ride a `minecraft:boat` up the shaft. `[X]`
- **Surface lobby (valley floor):** a small surface structure (8×8×4 blocks, `minecraft:white_concrete` with `minecraft:light_gray_concrete` trim) at (60, 90, −180) on the SubTropolis hilltop. `minecraft:dark_oak_door` entrance. `minecraft:oak_sign` "**ELEVATOR / SHAFT TO SUBTROPOLIS — TICKETED VISITORS ONLY**." A single `minecraft:villager` (the ticket agent) inside. `[D]`
- **Tag:** `[X]` — project fiction. The real SubTropolis has no public shaft, no elevator, and is accessed by a private drive.

### 10.6 Lighting tuning

- Walk the full build at night. Tune the `minecraft:sea_lantern` density on the main avenue (every 4–5 blocks is the target; too dense feels like a runway, too sparse feels like a tunnel).
- Tune the `minecraft:end_rod` placement in the NARA archive (one per shelf run; the rows of dim amber light should feel *archival*).
- Tune the `minecraft:shroomlight` under the STC cold aisle (the underglow should be visible from the hot aisle, but not blinding).
- Optional, advanced: add a single `minecraft:note_block` behind a wall in the data center with a low, sustained note, repeated via redstone — the data center hum. `[X]`
- Optional, advanced: add a single `minecraft:note_block` at the bottom of the entrance ramp with a low, sustained note, repeated via redstone — the fluorescent hum. `[X]`

### 10.7 Verification (Phase 7 quality checkpoint)

At night, walk the full build. Every lighting zone should feel right. Every easter egg should be findable but not obtrusive. The ghost mine should be dark and unreachable. The inter-site connections should be obviously marked as fictions (`[X]`) with appropriate signage.

**Acceptance:** all easter eggs are in place. The marquee text is readable. The cultural references are subtle but present.

---

## 11. Block Palette Reference

Quick-reference table of every Minecraft block used in the build, organized by material category.

### 11.1 Limestone shell (the rock)

| Block | Use |
|---|---|
| `minecraft:smooth_stone` | Primary limestone component (70%). Excavated walls and ceiling in older / unfinished zones. Pillar base 1-block band. |
| `minecraft:calcite` | Secondary limestone component (15%). Lighter, cream-colored accent in walls. |
| `minecraft:polished_calcite` | Optional upgrade for accent walls. |
| `minecraft:diorite` | Tertiary limestone component (10%). Grayish veining in walls. |
| `minecraft:tuff` | Minor component (5%). Brownish-gray accent. |
| `minecraft:deepslate` | Occasional veins (1–2 block patches every 20–30 blocks). Active-mining zones. |
| `minecraft:stone` | Older / unfinished zones. Ghost mine floor and walls. Default rock block. |
| `minecraft:cobblestone` | Optional rough-hewn accent in older corridors. |
| `minecraft:mossy_cobblestone` | Optional accent in damp / older zones (sparingly). |

### 11.2 Painted pillars and ceiling

| Block | Use |
|---|---|
| `minecraft:white_concrete` | Pillar body (primary). Ceiling (5-block high). Painted walls in developed zones. |
| `minecraft:light_gray_concrete` | Pillar top and bottom 1-block band (paint wear accent). Painted wall trim. |
| `minecraft:smooth_quartz_block` | Every-4th iconic pillar (visual emphasis). Central plaza medallion. |
| `minecraft:quartz_block` | Central plaza circle (alternative to smooth quartz). |
| `minecraft:quartz_pillar` | Optional iconic-intersection pillars. |
| `minecraft:black_concrete` | Painted pillar numbers. Data center door frame. Data center floor accent. |

### 11.3 Polished concrete floor

| Block | Use |
|---|---|
| `minecraft:polished_andesite` | Primary floor in main avenue, tenant corridors, surface approach. |
| `minecraft:polished_deepslate` | Data center floor only. Cold-aisle slabs over shroomlight underglow. |
| `minecraft:yellow_concrete` | Lane lines (center), lane markings, dock yard markings, US Postal accent, Hunt Midwest accent. |
| `minecraft:white_concrete` | Edge lines, parking-bay lines, crosswalks, lane lines (edge). |
| `minecraft:light_blue_concrete` | Data center accent. |
| `minecraft:light_gray_concrete` | Parking-bay markings. |
| `minecraft:gravel` | Older / unfinished corridor floor. Ghost mine floor. |
| `minecraft:stone` | Older / unfinished corridor floor. Ghost mine floor. Sub-basement floor. |

### 11.4 Painted utility lines (the four-color industrial code)

| Service | Block | Height | Where |
|---|---|---|---|
| Fire suppression (red) | `minecraft:red_concrete` | 1-block wide stripe at Y=23 (3 blocks up from floor) | Throughout developed corridors |
| Potable water (blue) | `minecraft:blue_concrete` | Same height | Same corridors |
| Communications / fiber (yellow) | `minecraft:yellow_concrete` | Same height | Same corridors |
| Data / low-voltage (green) | `minecraft:green_concrete` | Same height | Same corridors |

The four colors form a visible industrial skeleton on the otherwise plain painted walls. They run as straight horizontal lines (no curves) at a consistent height.

### 11.5 Tenant branding (sparingly applied)

| Tenant | Branded accent blocks | Where |
|---|---|---|
| Hunt Midwest / SubTropolis | `minecraft:red_concrete`, `minecraft:white_concrete`, `minecraft:black_concrete` | Entrance marquee, leasing office signage |
| USPS | `minecraft:blue_concrete`, `minecraft:red_concrete`, `minecraft:white_concrete` | Dock doors, stamp-counter interior |
| NARA | `minecraft:tan_concrete` (use `minecraft:orange_concrete` as a Minecraft equivalent if tan_concrete is unavailable), `minecraft:brown_concrete`, `minecraft:white_concrete` | NARA-branded door, archive shelving |
| EPA | `minecraft:blue_concrete`, `minecraft:green_concrete`, `minecraft:white_concrete` | EPA office door, emergency-response signage |
| STC | `minecraft:black_concrete`, `minecraft:light_blue_concrete` | STC entrance, biometric pedestal, dark-fiber conduit |
| W.W. Grainger | `minecraft:orange_concrete`, `minecraft:white_concrete`, `minecraft:gray_concrete` | Dock doors, pallet-rack signage |
| Hallmark | `minecraft:yellow_concrete` (gold), `minecraft:red_concrete` | Hallmark ribbon-packing area signage |
| Russell Stover | `minecraft:brown_concrete`, `minecraft:yellow_concrete` | Russell Stover storage zone signage |
| UV&S | `minecraft:black_concrete`, `minecraft:gray_concrete` | UV&S vault door, "Authorized Personnel Only" signage |
| Lamar Hunt / KC Chiefs | `minecraft:red_concrete`, `minecraft:yellow_concrete` | Hunt Hall mounted arrowhead |

The branded accents are *crumbs*, not walls. A visitor who walks past the USPS dock should see a *USPS-blue dock door* and a *USPS-blue-and-red signage block*, not an entire USPS-blue wall.

### 11.6 Lighting blocks (per zone)

| Zone | Block | Density | Mood |
|---|---|---|---|
| Main avenue (developed corridors) | `minecraft:sea_lantern` | Every 4–5 blocks along the ceiling, continuous strips | Bright, even, fluorescent |
| Tenant corridors (general industrial) | `minecraft:glowstone` | Every 6 blocks | Bright, slightly cooler |
| USPS dock | `minecraft:sea_lantern` every 5 blocks + `minecraft:lantern` over each dock door | Bright fluorescent, focused at the dock doors | Working loading-dock feel |
| NARA archive | `minecraft:end_rod` (horizontal, under each shelf run) + `minecraft:lantern` at the door + `minecraft:soul_lantern` for ambient fill | Dim, warm amber, archival safelight feel | "Permanent record" feel |
| STC / data center | `minecraft:shroomlight` under cold-aisle floor + `minecraft:redstone_lamp` (blinking) on rack fronts + `minecraft:redstone_lamp` in hot-aisle ceiling | Cool blue underglow + red/green status flicker | "24/7 server hum" |
| UV&S film vault | One `minecraft:lantern` at the door only | Dim, single light source | Vault is *deliberately* dim |
| Hallmark / Russell Stover / Grainger | `minecraft:glowstone` every 6 blocks | Bright | Standard industrial warehouse |
| EPA office | `minecraft:glowstone` every 6 blocks + `minecraft:lantern` on the desk | Bright, slightly warm | Government office feel |
| Hunt Hall | Single `minecraft:lantern` on the wall behind the Lamar Hunt plaque | Dim, warm, dignified | Memorial room |
| Ghost mine (behind barricade) | One `minecraft:soul_lantern` at the barricade only | Dark | Vanilla cave ambient dominates |
| Service sub-basement | `minecraft:lantern` every 8 blocks | Dim, functional | Service-tunnel feel |
| Public shaft (vertical) | `minecraft:lantern` every 5 blocks going up | Dim, vertical | Long vertical line of light |
| Surface plateau | One `minecraft:lantern` on a `minecraft:fence` post per parking row | Outdoor streetlight | Normal surface environment |
| Surface exit portal | Daylight gradually growing | Daylight | "Drive out" relief |

### 11.7 Signage and decorative blocks

| Block | Use |
|---|---|
| `minecraft:oak_sign` | All sign text (more legible than painted blocks at scale). Painted pillar numbers fallback. Tenant signs, climate signs, easter egg signs. |
| `minecraft:fence` | Sign posts. Parking lot light posts. Hunt arrowhead post. |
| `minecraft:dark_oak_door` | Tenant doors, security gate doors. |
| `minecraft:iron_door` | UV&S vault door only (it's a *vault*). |
| `minecraft:oak_fence` | Turnstile prop. Ghost mine barricade. General industrial fit-out dividers. |
| `minecraft:oak_fence_gate` | Ghost mine barricade gate. Turnstile gate. |
| `minecraft:item_frame` + `minecraft:paper` | Interpretive wall panels. ENERGY STAR certificate. 2001 USPS anthrax plaque. Lamar Hunt portrait. |
| `minecraft:white_banner` | Tenant sign backing (USPS, Hunt Midwest, Groundhog Run). Wall map. |

### 11.8 Functional blocks

| Block | Use |
|---|---|
| `minecraft:rail` | Dock door rails. Ford vehicle storage rows. Service sub-basement turnaround. Ghost mine minecart. |
| `minecraft:minecart` | Backed-in trailers at dock doors. Parked vehicles in Ford/Grainger chamber. Service vehicle in sub-basement. Ghost mine cart. |
| `minecraft:redstone_lamp` | STC server rack status lights (blinking). Hot-aisle exhaust indicators. Biometric hand-reader prop. |
| `minecraft:redstone_repeater` | STC clock (4-repeater loop, hidden behind a wall). |
| `minecraft:barrel` | Archive boxes (NARA, UV&S). UPS package inventory. Hallmark / Russell Stover inventory. |
| `minecraft:chest` | Tenant inventory. Service sub-basement maintenance supplies. Office filing. |
| `minecraft:bookshelf` | Optional NARA archive boxes alternative. |
| `minecraft:cauldron` | Employee cafeteria coffee stations. |
| `minecraft:crafting_table` | Employee cafeteria food-prep. Service sub-basement maintenance. |
| `minecraft:jukebox` | Employee cafeteria "SubTropolis Radio" (silent). |
| `minecraft:lectern` | EPA training-room desk. |
| `minecraft:villager` | Surface exit portal security guard. Public shaft surface lobby ticket agent. |
| `minecraft:glass_pane` | All tenant door windows. Visitor center window. |
| `minecraft:iron_bars` | STC cold-aisle / hot-aisle ceiling vents. UV&S vault shelving uprights. |
| `minecraft:iron_trapdoor` | UV&S vault shelving. STC biometric hand-reader surface. |
| `minecraft:ladder` | Public shaft vertical climb. Sub-basement temporary access. |
| `minecraft:soul_sand` | Public shaft water elevator (optional). |
| `minecraft:water` | Public shaft water elevator column (optional). |
| `minecraft:note_block` | Data center hum (optional). Entrance ramp fluorescent hum (optional). |
| `minecraft:cobweb` | Ghost mine ceiling (every 10 blocks). |
| `minecraft:soul_lantern` | Ghost mine barricade light. NARA ambient fill. |
| `minecraft:carpet` | Mob-spawn suppression (optional, advanced). |
| `minecraft:stone_button` | Alternative to redstone_lamp for STC rack indicators. |

### 11.9 Surface / above-ground blocks

| Block | Use |
|---|---|
| `minecraft:grass_block` | Surface plateau top. Kansas City plain. |
| `minecraft:dirt` | Below grass. Topsoil. |
| `minecraft:coarse_dirt` | Optional path material on the surface approach. |
| `minecraft:path` | Optional worn path. |
| `minecraft:oak_leaves` | Oak tree canopies. |
| `minecraft:dark_oak_leaves` | Optional darker foliage. |
| `minecraft:birch_leaves` | Birch tree canopies. |
| `minecraft:oak_log` | Oak tree trunks. |
| `minecraft:birch_log` | Birch tree trunks. |
| `minecraft:poppy` | KC-area wildflower accent. |
| `minecraft:azure_bluet` | KC-area wildflower accent. |
| `minecraft:vines` | Optional ravine wall accent (sparingly). |
| `minecraft:stone_brick_slab` | Visitor center foundation. |
| `minecraft:slate` | Optional visitor center foundation. |

### 11.10 Avoid (anti-patterns)

The following are **excluded by the deliberation** and must not appear in the build:

- `minecraft:torch` (in developed corridors — replaces fluorescent with fantasy cave lighting)
- `minecraft:lantern` (in main corridors — same reason; lanterns are restricted to specific zones per §11.6)
- `minecraft:lava` (anywhere)
- `minecraft:mob_spawner` (anywhere)
- `minecraft:fire` (in any decorative capacity)
- Saturated color blocks (`minecraft:magenta_wool`, `minecraft:purple_concrete`, etc.) in large surfaces
- Glossy surfaces other than the `minecraft:polished_andesite` floors and `minecraft:polished_deepslate` data center floor
- Indiana Jones, Batcave, Bond villain, or "hidden treasure" imagery of any kind
- Movie posters, magic, dragons, fake idols, ancient traps, hidden chambers with rewards
- Chiefs helmet, football imagery, stadium references (the Hunt/Chiefs reference is a single arrowhead + plaque, nothing more)

---

## 12. Schematic References

The schematic library at `D:\projects\mc-fleet-bot\schematics\` contains ~100 vanilla-themed `.schem` files. None are SubTropolis-specific. The following can be **optionally reused** for atmosphere or detail:

### 12.1 Reusable schematics (flag for contractor)

| Schematic | Path | Reuse opportunity |
|---|---|---|
| `black-truck.schem` | `D:\projects\mc-fleet-bot\schematics\black-truck.schem` | Ford-era vehicle in Ford/Grainger historical chamber (substitute for `minecraft:minecart`) |
| `orange-truck.schem` | `D:\projects\mc-fleet-bot\schematics\orange-truck.schem` | Grainger-era vehicle in Ford/Grainger chamber (substitute for `minecraft:minecart`) |
| `shelf.schem` | `D:\projects\mc-fleet-bot\schematics\shelf.schem` | Optional NARA / UV&S shelving base |
| `lantern.schem` | `D:\projects\mc-fleet-bot\schematics\lantern.schem` | Optional decorative lantern in tenant corridors |
| `small-roller-coaster.schem` | `D:\projects\mc-fleet-bot\schematics\small-roller-coaster.schem` | Optional Worlds of Fun silhouette (substitute for the single banner + fence post) |
| `ferris-wheel.schem` | `D:\projects\mc-fleet-bot\schematics\ferris-wheel.schem` | Optional Worlds of Fun silhouette (alternative to the single banner) |
| `clock-tower.schem` | `D:\projects\mc-fleet-bot\schematics\clock-tower.schem` | Optional Worlds of Fun silhouette (alternative) |
| `barrel-house.schem` | `D:\projects\mc-fleet-bot\schematics\barrel-house.schem` | Optional industrial fit-out inspiration (not for direct paste) |
| `library.schem` | `D:\projects\mc-fleet-bot\schematics\library.schem` | Optional NARA archive inspiration |
| `kitchen.schem` | `D:\projects\mc-fleet-bot\schematics\kitchen.schem` | Optional employee cafeteria inspiration |
| `cat-area.schem` | `D:\projects\mc-fleet-bot\schematics\cat-area.schem` | Optional surface plateau decoration (KC area is famously cat-friendly) |
| `underground-base.schem` | `D:\projects\mc-fleet-bot\schematics\underground-base.schem` | Reference only — do not paste directly into the SubTropolis grid (would conflict with the pillar layout) |
| `dark-wall.schem` | `D:\projects\mc-fleet-bot\schematics\dark-wall.schem` | Optional ghost mine chamber wall accent |
| `cherry-tree.schem` | `D:\projects\mc-fleet-bot\schematics\cherry-tree.schem` | Optional surface plateau tree |

### 12.2 Custom schematics that need to be made

The following schematics **must be created by the contractor** (do not exist in the library):

| Schematic | Spec | Used in |
|---|---|---|
| `pillar-8x8x5-white.schem` | 8×8×5 block pillar, white concrete body, light gray concrete at top and bottom 1-block band | Phase 2 (~60–80 pastes) |
| `pillar-8x8x5-quartz.schem` | Same, but every 4th pillar is `minecraft:smooth_quartz_block` | Phase 2 (every 4th iconic pillar) |
| `usps-dock-doors.schem` | 5 numbered dark oak doors with yellow concrete numbers, rail in front | Phase 4 (USPS fit-out) |
| `grainger-dock-doors.schem` | 6 numbered dark oak doors with orange concrete numbers, rail in front | Phase 4 (Grainger fit-out) |
| `stc-rack.schem` | 1×2×1 server rack with black concrete sides, obsidian front, redstone lamp indicator, smooth stone slab top | Phase 4 (STC fit-out, 12 racks) |
| `marquee-sign.schem` | 6×2 block "World's Largest Underground Business Complex®" sign, red concrete background, white concrete text | Phase 6 (entrance) |
| `1964-plaque.schem` | 4×3 block "SubTropolis — Est. 1964" plaque, white concrete background, red concrete "SUBTROPOLIS", black concrete other text | Phase 6 (central plaza) |
| `ghost-mine-barricade.schem` | 3-block-tall oak fence with oak fence gate, "DANGER — ACTIVE MINING" sign, "NO UNAUTHORIZED ENTRY" sign | Phase 7 (ghost mine) |
| `speed-limit-15.schem` | 2×2 block white concrete sign with black concrete "15", on a fence post stem | Phase 3 + 6 (~12–15 placements) |
| `street-sign.schem` | 1×3 block green concrete backing with oak sign text, on a fence post stem | Phase 3 (~60–100 placements) |
| `stop-sign.schem` | 2-block red concrete square on a fence post stem | Phase 3 (~50 placements) |

### 12.3 Schematic workflow

1. **Build one pillar schematic** in a test world, save as `pillar-8x8x5-white.schem` in `D:\projects\mc-fleet-bot\schematics\`.
2. **Generate a coordinate list** of all pillar positions (a JSON or CSV with integer (X, Y, Z) for each pillar center).
3. **Use the mc-fleet-bot schematic placement API** (or WorldEdit `//paste -a`) to paste each pillar at its coordinate.
4. **Verify** with a screenshot from each intersection.
5. Repeat for each custom schematic.

---

## 13. Bot-Build Workflow (mc-fleet-bot)

The mc-fleet-bot HTTP API runs at `http://127.0.0.1:3001` (default). Reference: `D:\projects\mc-fleet-bot\AGENTS.md`. The contractor uses the following endpoints and commands.

### 13.1 Bot API endpoints (per AGENTS.md)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/bots` | GET / POST / DELETE | List, create, delete bots |
| `/api/bots/:name` | GET / DELETE | Get or delete a specific bot |
| `/api/bots/:name/mode` | POST | Change bot mode |
| `/api/bots/:name/detailed` | GET | Detailed bot info |
| `/api/bots/:name/inventory` | GET | Bot inventory |
| `/api/bots/:name/task` | POST | Queue a task |
| `/api/bots/:name/pause` | POST | Pause voyager |
| `/api/bots/:name/resume` | POST | Resume voyager |
| `/api/bots/:name/walkto` | POST | Walk to coordinates |
| `/api/commands` | POST / GET | Create and list commands |
| `/api/commands/:id/cancel` | POST | Cancel a command |
| `/api/missions` | POST / GET | Create and list missions |
| `/api/missions/:id/start` | POST | Start a mission |
| `/api/missions/:id/pause` | POST | Pause a mission |
| `/api/missions/:id/resume` | POST | Resume a mission |
| `/api/missions/:id/cancel` | POST | Cancel a mission |
| `/api/missions/:id/retry` | POST | Retry a failed mission |
| `/api/markers` | GET / POST | List and create markers |
| `/api/zones` | GET / POST | List and create zones |
| `/api/swarm` | POST | Spawn multiple bots |

### 13.2 Recommended bot commands for placing blocks

**Vanilla `/fill` (for simple rectangular volumes):**

```
/fill <x1> <y1> <z1> <x2> <y2> <z2> <block>
/fill -100 20 -200 100 20 200 minecraft:polished_andesite
```

**WorldEdit (if available):**

```
//walls <block>      — set the walls of the selection
//faces <block>      — set the walls + ceiling + floor
//replace <from> <to> — replace one block type with another
//paste -a            — paste a schematic at the exact position
//pos1, //pos2        — set selection corners
```

**mc-fleet-bot API (for programmatic operations):**

For pillar placement, generate a coordinate list and POST to the mission API:

```json
POST /api/missions
{
  "name": "Place pillar 1 at (X1, Y1, Z1)",
  "type": "build",
  "bot": "builder-bot-1",
  "steps": [
    { "action": "load_schematic", "path": "D:\\projects\\mc-fleet-bot\\schematics\\pillar-8x8x5-white.schem" },
    { "action": "paste", "position": { "x": X1, "y": Y1, "z": Z1 }, "rotation": 0 }
  ]
}
```

For chamber carving:

```json
POST /api/missions
{
  "name": "Carve main grid",
  "type": "build",
  "bot": "builder-bot-1",
  "steps": [
    { "action": "fill", "from": { "x": -100, "y": 20, "z": 0 }, "to": { "x": 100, "y": 25, "z": -200 }, "block": "minecraft:air" }
  ]
}
```

### 13.3 Schematic placement commands

For WorldEdit (if available):

```
//schematic load pillar-8x8x5-white
//pos1
//pos2
//paste -a
```

For mc-fleet-bot API, see the mission example above. The schematic file must be in `.schem` (Sponge Schematic) format, located at `D:\projects\mc-fleet-bot\schematics\`.

### 13.4 Recommended workflow per phase

| Phase | Bot-driven (use `mc-fleet-bot` or WorldEdit) | Human-driven (in-place build) |
|---|---|---|
| **1** | Chamber carving (`/fill air` over 200×200×5 = ~200,000 blocks). Ravine wall surface treatment. | Ravine wall rock-blend (random stone/calcite/diorite/tuff placement). Surface plateau grass + trees. |
| **2** | Ceiling `//replace` (~40,000 blocks). Floor `//replace` (~40,000 blocks). Pillar schematic paste (~60–80 pillars via mission script). Sub-basement `//faces` (~14,000 blocks). | Pillar number painting (each number is unique). |
| **3** | Lane markings `//replace` (~1,050 blocks). Central plaza schematic paste. | All sign placement (each sign is unique). Stop sign placement. Speed-limit sign placement. |
| **4** | Tenant shell `//walls` for each chamber. Dock door rail placement. | All tenant interior fit-outs (USPS conveyor, NARA shelving, STC racks, etc.). All tenant signage. |
| **5** | Climate vent iron bar placement (if schematic). | End-rod placement (test first). Shroomlight underglow wiring. Redstone clock wiring. |
| **6** | Surface approach road `//replace`. Ramp surface treatment. Exit portal frame. | Visitor center building. Marquee sign. Parking lot. Surface trees + flowers. Lamar Hunt plaque. Worlds of Fun silhouette. |
| **7** | Ghost mine side spur `//faces`. Sub-basement interior. Public shaft vertical column. | All easter egg placement. All inter-site signage. Lighting tuning. Redstone clocks. Optional note blocks. |

### 13.5 Render distance flag (CRITICAL — must be set before build starts)

The 200×200 chamber is at the edge of Minecraft render distance. The contractor should ensure the target server has:

```
view-distance=16
simulation-distance=12
```

in `server.properties`. If the server is hosted on a different machine, coordinate with the server admin to set these values before the build begins.

---

## 14. Quality Checkpoints

After each phase, the following should be verified before the next phase begins. The contractor should run through this checklist and capture a screenshot at each checkpoint.

### 14.1 Visual review checklist

| Phase | What to check | Pass criteria |
|---|---|---|
| 1 | Walk the ravine from the visitor center. | Ravine wall is carved, portal opening is visible, surface plateau is in place. |
| 2 | Walk the main avenue from the portal. | First iconic intersection is visible from the bottom of the ramp. Pillars are evenly spaced and identical in proportion. Ceiling is painted, floor is polished. |
| 3 | Walk the main avenue from the portal to the exit portal. | Every intersection has visible street signs, stop signs, speed-limit signs, and numbered pillars. Lane markings are continuous and centered. |
| 4 | Walk the main avenue, enter each tenant fit-out. | Each fit-out is visually distinct. Dock doors are visible. NARA is dim and amber. STC is dim and blue. |
| 5 | Enter the data center, the NARA archive, the UV&S vault. | Cool blue underglow in the cold aisle. Dim amber in the archive. Single lantern in the vault. Climate signs at every door. |
| 6 | Drive the full visit (parking → ramp → main avenue → exit). | Light transition at the portal mouth is clean. Ramp is gentle. Exit is a relief. |
| 7 | Walk the build at night. Find every easter egg. | Easter eggs are findable but not obtrusive. Ghost mine is dark and unreachable. Inter-site connections are signed as `[X]`. Lighting is tuned. |

### 14.2 Lighting test

At each phase after Phase 2, walk the build at **night in-game** (use `/time set night`). The lighting should be appropriate to the zone:
- **Bright fluorescent** in the main avenue (sea lanterns every 4–5 blocks).
- **Dim amber** in the NARA archive.
- **Cool blue + red/green flicker** in the STC data center.
- **Single lantern dim** in the UV&S vault.
- **Dark, vanilla cave ambient** in the ghost mine.

If the lighting is too dense, too sparse, or in the wrong zone, the contractor should tune the placement and re-test.

### 14.3 Path / navigation test

At each phase after Phase 3, walk the main avenue from end to end (sprint speed is fine). The path should be:
- **Clear** (no obstructions, no missing blocks).
- **Signed** (street signs at every intersection, speed-limit signs at portals).
- **Numbered** (pillar numbers visible at every iconic intersection).
- **Lined** (continuous yellow center line, white edge lines, no gaps).

If the visitor gets lost or confused, the signage density is insufficient.

### 14.4 Easter egg accessibility test (Phase 7 only)

Every easter egg should be **findable by a player who has been told it exists**, but **not obvious to a player who has not**.

- The **UV&S film cans** should be in a small room off a corridor; the player should have to look for the door.
- The **Hunt Hall arrowhead** should be visible from the door but not from the main avenue.
- The **FTZ sign** should be in the leasing office, not on the main path.
- The **2001 USPS anthrax plaque** should be in the USPS fit-out, on a wall that requires looking.
- The **Lamar Hunt / KC Chiefs plaque** should be near the parking lot, not in the visitor center.
- The **Groundhog Run banner** should be between two pillars, not overhead.

The restraint is the design.

### 14.5 Marquee text readability test

The "**WORLD'S LARGEST UNDERGROUND BUSINESS COMPLEX®**" sign must be readable from the parking lot (30 blocks away). Test by walking to the far end of the parking lot and looking back at the marquee. If the text is illegible at 30 blocks, increase the sign size (6×2 → 8×3) or use a `minecraft:oak_sign` overlay for the ® symbol and finer text.

### 14.6 Reference comparison

At each phase, compare the build to the closest reference in the visual-assets catalog (if available at `D:\projects\mc-fleet-bot\masterplans\02-subtropolis\02-visuals\visual-assets.md`):
- Phase 2 against the canonical pillar grid photographs.
- Phase 6 against the entrance portal photographs.
- Phase 4 against the dock door / archive / data center photographs.

The build should *feel* like the references, not match them block-for-block.

---

## 15. Open Items

The following are the things the contractor might need clarification on, or that depend on downstream coordination.

### 15.1 Contractor questions for the user / architect

1. **Hunt Hall location:** the design plan places Hunt Hall at the central plaza (0, 20, −100). The architect's design-plan §15 Open Item 3 says the architect will decide the exact location, size, and rotation. **Default for contractor:** 15-block-diameter round room at the central plaza.
2. **Geology-themed street name companions:** the design plan lists Hushpuckney (canonical, `[D]`) and Bethany Falls, Iola, Muncie, Galesburg, Winterset (all invented, `[X]`). The architect has selected these. **Default for contractor:** use all six names on the cross streets as specified in §6.2.
3. **Surface plateau size:** 80×60 around the visitor center (per design-plan §9.1) or 100×100 (per site-plan §3.8). **Default for contractor:** 80×60 as the design plan specifies, with the visitor center and parking lot as the only structures.
4. **Data center detail depth:** the design plan specifies 1×2×1 blocks per rack, 2 rows of 6. **Default for contractor:** exactly as specified.
5. **NARA high-bay shelving:** the architect confirmed (design-plan §15 Open Item 6) that ceiling-to-floor shelving (5 blocks tall) is the defining visual. **Default for contractor:** floor-to-ceiling shelves.
6. **Worlds of Fun silhouette detail:** the design plan suggests a single `minecraft:dark_oak_fence` post with a `minecraft:white_banner`. The architect notes the user may prefer more detail (`small-roller-coaster.schem` or `ferris-wheel.schem`). **Default for contractor:** single banner, simplest representation.
7. **Hunt Hall arrowhead detail:** the design plan suggests a single mounted `minecraft:red_concrete` + `minecraft:yellow_concrete` arrowhead. The architect notes the user may prefer a more abstract or literal rendering. **Default for contractor:** single arrowhead, no helmet/football imagery.
8. **UV&S film can labels:** the design plan suggests "GONE WITH THE WIND — INTERPOSITIVE" and "WIZARD OF OZ — MASTER." The architect notes the user may prefer different titles or less specific labels. **Default for contractor:** as specified, with the explicit "no posters, no display cases" constraint.
9. **Inter-site connection signage:** the design plan specifies the exact signage ("SERVICE TUNNEL — COMBINED COMPLEX MAINTENANCE — AUTHORIZED VEHICLES ONLY" and "PUBLIC TRANSIT — COMBINED COMPLEX — TICKETED VISITORS ONLY"). **Default for contractor:** as specified.

### 15.2 Items that depend on the combined-complex report

1. **Service tunnel cross-section:** 6 blocks wide × 5 blocks high (SubTropolis end). The Cheyenne Mountain team must match this cross-section at their end. The combined-complex report coordinates this.
2. **Public shaft cross-section:** 5 blocks wide × 5 blocks high. The Houston tunnel system team must match this if the public shaft is extended to the city.
3. **Surface lobby position on the SubTropolis hilltop:** the public shaft surface exit is at (60, 90, −180). This must align with the Houston tunnel system team's surface lobby position.
4. **Ravine floor Y-level:** the design assumes the ravine floor is at Y=0–10. If the combined-complex team places the ravine floor at a different Y, the service tunnel routing must be adjusted.
5. **Cheyenne Mountain position:** ~400–600 blocks north of the SubTropolis hill across the ravine. The combined-complex report coordinates the exact position.
6. **Tagging:** all inter-site features are tagged `[X]` in both the SubTropolis master plan and the combined-complex report. The contractor should verify these tags are consistent.

### 15.3 Items that depend on the Minecraft version

1. **Minecraft 1.17+ required:** the build uses calcite, tuff, deepslate, shroomlight. If the target server is on 1.16 or earlier, substitute:
   - `minecraft:calcite` → `minecraft:quartz_block`
   - `minecraft:tuff` → `minecraft:stone`
   - `minecraft:deepslate` → `minecraft:stone` or `minecraft:coal_ore`
   - `minecraft:shroomlight` → `minecraft:glowstone`
2. **Minecraft 1.18+ preferred:** better ravine generation and underground cave features. The 1.17 minimum is for the block palette only.
3. **Java Edition only:** the build uses `minecraft:barrel`, `minecraft:lectern`, `minecraft:item_frame` with `minecraft:paper`, and `minecraft:filled_map`. These are Java Edition features. Bedrock Edition equivalents are not guaranteed.

### 15.4 Items that depend on the server configuration

1. **`view-distance: 16+` and `simulation-distance: 12+` in `server.properties`** — must be set before the build starts. The 200×200 chamber is at the edge of standard render distance.
2. **Game mode:** the contractor works in `creative` (`/gamemode creative`). Survival players visiting the completed build will not encounter mob spawns in the lit developed zones. The ghost mine is dark and may spawn mobs; this is a feature, not a bug.
3. **`/fill` and WorldEdit permissions:** the contractor needs operator-level permissions to use `/fill`, `/clone`, WorldEdit, and schematic paste commands.
4. **Schematic paste permissions:** WorldEdit's `//paste` requires the operator role and may need to be enabled in the server's `worldedit` config.

### 15.5 Items the contractor should escalate

If the contractor encounters any of the following, escalate to the human project lead before proceeding:

- The site-coordinates.json or site-plan.md specify coordinates that conflict with the build plan.
- The bedrock layer is higher than Y=20 at the build location (the chamber floor would intersect bedrock).
- The Minecraft version is below 1.17 and the block substitutions don't preserve the visual intent.
- The render distance cannot be set to 16+ (some hosting providers limit this).
- The schematic paste or `/fill` command fails repeatedly (may indicate a server issue).

---

*End of contractor brief. Companion to `contractor-brief.json` (machine-readable). Total block budget: ~530,000–575,000 (90,000–130,000 placed + 320,000 removed). Total build time: 32–49 hours across 6 phased delivery versions. The build is large but tractable.*
