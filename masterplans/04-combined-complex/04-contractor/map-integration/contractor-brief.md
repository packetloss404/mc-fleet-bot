# Contractor Brief — Map Integration (v2.0)

**Build name:** Map Integration (no ravine, no skybridge)
**Build ID:** `04-combined-complex-map-integration`
**Version:** 2.0
**Supersedes:** 1.0 (drops the V-shaped ravine + skybridge; replaces `mkr_ravine_bottom` with `mkr_service_tunnel_contact_crossing`)
**Date prepared:** 2026-08-02
**Author role:** AI Contractor Writer
**Companion to:** `contractor-brief.json` (machine-readable spec)

> **You are the AI Contractor.** The 4 master plan PDFs (Cheyenne, SubTropolis, Houston, Combined Complex) and the Combined Complex master plan are already complete. This brief is the **integration layer** that wires them to the existing bot world. **The combined complex is now ONE CONTINUOUS mountain with a horizontal granite-limestone contact at Y=200, NOT a V-shaped ravine. The return route is funicular + summit road, NO skybridge.** The composite terrane plaque is at the service tunnel contact crossing at `(-40, 200, -360)`, not at a ravine bottom. The 6 named markers are `mkr_city_center`, `mkr_public_shaft_top`, `mkr_subtropolis_chamber_center`, `mkr_service_tunnel_contact_crossing`, `mkr_cheyenne_outer_portal`, `mkr_old_town_center`.

---

## 1. Project Header

This is the **5th and final deliverable** of the four-masterplan package. Masterplans 01–04 specify the *what* of the underground/mountain sites and *how they live together* as a single descent through the new 1,500×1,500 Combined Complex world. The Map Integration is the *meta-build* — the layer that connects the existing `D:\projects\mc-fleet-bot\` workspace (the 111-schematic library, the live bot world, the 22-file data layer) to that new world.

### Scale decisions

- **1 block = 1 meter, globally, 1:1** — no compression anywhere except the optional 2:1 vertical scale on the granite peak (per the 04-masterplan, *not* applied in this brief).
- **New world build height: 1,024 blocks (CubicWorld 2,048 recommended).**
- **Existing bot world build height: 384 (vanilla) — preserved as-is.**
- **Mountain geometry: ONE CONTINUOUS mountain** (600×600 footprint at the north end of the world, peak at Y=800) with a **horizontal granite-limestone contact at Y=200**. The lower 200 blocks are 270 Ma Bethany Falls limestone; the upper 600 blocks are 1.08 Ga Pikes Peak granite. There is **no V-shaped ravine, no notch, no gap** — the mountain is intact from base to summit.
- **Return route: funicular + summit road.** Funicular rail climbs 600 blocks (Y=200 → Y=800) on a 1:1 incline inside the granite peak. Switchback summit road descends 800 blocks (Y=800 → Y=0) over 8 named landings back to the city SE corner. **No skybridge.**

### What changed from v1.0 → v2.0

| v1.0 | v2.0 |
|---|---|
| V-shaped ravine between two peaks at Z = −400 | ONE CONTINUOUS mountain, horizontal contact at Y=200 |
| `mkr_ravine_bottom` at (0, −90, −400) | `mkr_service_tunnel_contact_crossing` at (−40, 200, −360) |
| `sqd_ravine_response` squad | `sqd_service_tunnel_response` (renamed) |
| Single `/tp` return shortcut from Cheyenne | Funicular + summit road, 15 min return |
| Composite terrane plaque at ravine bottom | Composite terrane plaque at the Y=200 contact face inside the service tunnel |
| Stream sourced from ravine bottom | Stream sourced from limestone hillside (no ravine) |
| `mkr_cheyenne_outer_portal` at (0, 0, −420) | `mkr_cheyenne_outer_portal` at (0, **200**, −420) — at the contact elevation, where the funicular starts |
| 2 routes in `data/routes.json` | **4** routes in `data/routes.json` (added funicular + summit road) |
| 1 supply chain in `data/supply_chains.json` | **2** supply chains (added funicular booster maintenance) |
| Visitor journey target 80 min, achievable | Visitor journey target ~80-90 min, return now 15 min instead of 1 min |

---

## 2. Build Targets

### Block budget estimate

**Total: ~33,000–44,000 blocks** for the map integration alone, broken down as:

| Phase | Block budget |
|---|---|
| 1. New world prep | 0 (terrain generation; +1 layer of andesite at Y=200 for the contact) |
| 2. Old town (33 schematics + roads + plaza) | 15,000–20,000 |
| 3. Gateway pavilions (2 × 7×7×6) | 1,200–1,500 |
| 4. Grand Avenue (425 blocks, 8 cross-section) | 3,500–4,500 |
| 5. Rail spur (1,030 blocks, 3 cross-section) | 3,000–4,000 |
| 6. Underground easter egg | 200–300 |
| **7. Return route — funicular + summit road (v2.0 NEW)** | **5,500–7,000** |
| **8. Service tunnel + contact plaque (v2.0 NEW)** | **4,500–6,000** |
| 9. Inter-build coordination | 0 (data only) |
| 10. Finishing | 200–400 |
| **Total** | **33,000–44,000** |

This excludes the new world's 1,500×1,500 base terrain (generated) and the new city / one-continuous-mountain / contact layer (also generated, not placed block-by-block). v2.0 adds **~10,000–13,000 blocks** to v1.0 (phases 7+8: funicular, summit road, service tunnel, contact plaque).

### Time estimate

- **v0.1 MVP** (12 old-town schematics, single new-world Gateway, dirt path): **2–3 days**.
- **v0.5 → v1.0** (skybridge return era): **10–15 days**.
- **v2.0 full build** (no-ravine + funicular return): **15–20 days**.
- **v2.5 polish** (world-portal datapack, city streetcar, historical plaques, guided tour): **+5–10 days**.
- **Total v0.1 → v2.0:** **17–23 days** of focused work.

### Quality acceptance criteria

- All 33 schematics placed in the 7 correct clusters with historical signs.
- The Cute House Plaza has its 2 Cute houses, fountain, glass viewing window, and CuteHouse1/2 founding plaque.
- The Grand Avenue walks end-to-end in 10–12 minutes with all 6 statues, 3 milestones, material transition, and stream bridge visible.
- The Gateway portal teleports bidirectionally between worlds.
- The rail spur rides end-to-end in 5–7 minutes with no derailing.
- The underground easter egg is findable via 2 approaches (mushroom-cottage basement, glass viewing window).
- **v2.0:** The composite terrane plaque is mounted at the service tunnel contact crossing `(-40, 200, -360)`, visible from the minecart, and readable on foot. A duplicate sign is at the summit road landing_5 `(0, 200, -180)`.
- **v2.0:** The funicular rides end-to-end in ~3 minutes (Cheyenne lobby Y=200 → summit station Y=800). 600 blocks of 1:1 incline with powered_rail every 4 blocks.
- **v2.0:** The summit road walks end-to-end in ~12 minutes. 8 named landings, polished_granite surface, oak_fence railings, 1 sea_lantern every 8 blocks.
- **v2.0:** The mountain is **one continuous mass** — no ravine, no V-notch, no gap. The horizontal contact at Y=200 is exposed inside the service tunnel.
- Full visitor journey: 60–90 minutes (target 80–90 min after v2.0 return-route expansion).

---

## 3. Coordinate System

### Coordinate convention

- **New world origin: (0, 0, 0)** — center of the new city, at street grade.
- **Existing bot world origin: (935, 60, 300)** — center of the existing bot base, where the 4 active bots operate.
- **Compass orientation:** north = `−z`, east = `+x`, up = `+y`. (Matches the 04-masterplan.)
- **Block size:** 1 block = 1 meter, globally.
- **Build heights:** new world 1,024+ (CubicWorld 2,048 recommended); existing world 384 (vanilla).

### World footprints

| World | Footprint (X × Z) | Build height | Origin |
|---|---|---|---|
| New world | 1,500 × 1,500 | 1,024 (2,048 recommended) | (0, 0, 0) |
| Existing bot world | ~200 × 200 explored (vanilla) | 384 (vanilla) | (935, 60, 300) |

### New world vertical zones (v2.0)

| Zone | X range | Z range | Y range | Material |
|---|---|---|---|---|
| City | −69 to +69 | −69 to +69 | 0 | Concrete / glass / steel-gray |
| Coastal plain | −750 to +750 | +70 to +750 | 0 | Flat grass |
| Limestone hillside (lower mountain) | −300 to +300 | −380 to −100 | 0 to 200 | 270 Ma Bethany Falls limestone |
| Granite peak (upper mountain) | −300 to +300 | −700 to −420 | 200 to 800 | 1.08 Ga Pikes Peak granite |
| **Contact crossing (v2.0 NEW)** | — | — | **200** | **Horizontal andesite layer, 1 block thick, exposed inside service tunnel at (−40, 200, −360)** |

The contact is a 1-block-thick layer of andesite at exactly Y=200, hand-painted after terrain generation. The contact face is visible inside the service tunnel as a flat horizontal wall, and at the summit road landing_5 overlook as a horizontal slice in the mountainside.

---

## 4. Phase 1: New World Prep

**Goal:** establish the new world's coordinate system, terrain, sky limit, and base infrastructure. **Terrain is ONE CONTINUOUS mountain — no ravine, no V-notch. The horizontal granite-limestone contact sits at Y=200.**

**Time:** 1–2 days in-world.
**Block budget:** 0 (terrain generation, not block placement; +1 layer of andesite at Y=200 is part of terrain generation).

### Block specs

- **World footprint:** 1,500 × 1,500.
- **Build height:** 1,024+ (CubicWorld 2,048 recommended).
- **World origin:** (0, 0, 0).
- **Coastal plain:** 600 × 400 cleared grass at (0, 0, 500), flattened to Y=0.
- **One continuous mountain:** 600 × 600 at (0, 0, −200), peak at Y=800. **NO ravine.** Limestone from Y=0 to Y=200, granite from Y=200 to Y=800.
- **New city site:** 138 × 138 cleared at (0, 0, 0), flattened to Y=0.
- **Contact layer (v2.0):** 1-block-thick andesite (`andesite`) at exactly Y=200, hand-painted across the mountain footprint (X = −300 to +300, Z = −420 to −100). Visible inside the planned service tunnel at `(-40, 200, -360)`.
- **Spawn point:** (0, 60, 700), set with `/setworldspawn 0 60 700`.
- **Base infrastructure:**
  - 1-block-wide `dirt_path` from spawn to old town plaza.
  - 1 `chest` at spawn with 64 `oak_planks`, 64 `stone_bricks`, 64 `glass_panes` (starter kit).
  - 1 `oak_sign` at spawn: *"YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER."*

### Verification

- World is created with the correct parameters.
- Spawn point is at (0, 60, 700).
- Terrain is generated: coastal plain flat at Y=0, one continuous mountain with peak at Y=800, contact at Y=200.
- Base infrastructure is installed: dirt path, starter kit, sign.
- Build height is 1,024+.
- World origin is (0, 0, 0).

---

## 5. Phase 2: Old Town

**Goal:** place 30–35 schematics in 7 clusters in the new world's coastal plain.

**Time:** 3–5 days in-world.
**Block budget:** 15,000–20,000 blocks.

### Coordinate table — 7 clusters

| # | Cluster | Center | Count | Schematics |
|---|---|---|---|---|
| 1 | Residential (founding plaza + housing) | (0, 0, 480) | 13 | Small houses: `birch house.schem`, `cozy-cabin.schem`, `cube-house.schem`, `classic-village-house.schem`, `mushroom-cottage.schem`, `simple-house.schem`, `wood-house.schem`, `rustic-farmhouse.schem`, `stilt-house.schem`, `mud-house.schem`. Anchors: `Cute house.schem` × 2 (plaza center), `victorian palace.schem` × 1 (north hill) |
| 2 | Castle / fortress | (200, 0, 500) | 3 | `md castle 2.schem`, `small medieval town hall.schem`, `stone-fortress.schem` on a 10-block artificial hill (cobblestone + mossy_cobblestone) |
| 3 | Temple | (−200, 0, 500) | 3 | `fantasy-temple-house.schem`, `red-japanese-temple.schem`, `japanese-pagoda.schem` on a mirrored 10-block hill (spruce_planks + stone_brick) |
| 4 | Statue / ornament (in cluster) | (0, 0, 600) | 4 | `stone-statue.schem`, `dragon-egg.schem`, `giant-skull.schem`, `snowman.schem` on 1-block stone_brick pedestals in a 4×30 avenue |
| 4b | Statue / ornament (along Grand Avenue) | See Phase 4 | 6 | `teddy-bear.schem` (block 70), `macaw-statue.schem` (block 140), `parrot-statue.schem` (block 210), `flying-eagle.schem` (block 280), `villager-statue.schem` (block 350), `enderman.schem` (block 420) |
| 5 | Theme park | (100, 0, 600) | 1 | `Disneyland Space Mountain.schem` (58,933 bytes — the largest surface build in the library) |
| 6 | Underground easter egg | (−50, 0, 550) | 1 | `underground-base.schem` (1,048 bytes — the only existing underground build in the workspace), partially buried (deferred to Phase 6 for full treatment) |
| 7 | Cute house anchor (founding plaza) | (0, 0, 450) | 2 | `Cute house.schem` × 2 — folded into Residential, at the Cute House Plaza |
| | **Total** | | **33** | |

### Excluded from the old town

- `Pokémon Temple Arena.schem` (63 KB, mojibake-encoded) — deferred to a future attractions zone.
- `luxury-yacht.schem` and other watercraft — no water in the coastal plain.
- `bbq-grill.schem` and beach content — wrong era.
- `holiday-express-train.schem` — this is the rail spur's *mode*, not an old-town feature.
- Any schematic already used in the new city's 138×138 downtown (per the 04-masterplan's 8–10 generic downtown towers).

### Block specs — old town

- **Internal roads:** 3-block-wide `oak_planks` with 1-block `cobblestone` edges (NOT stone brick — the Grand Avenue is the only paved surface).
- **Plaza:** 30×30 cleared area at (0, 0, 500), 1-block `cobblestone` path connecting the 2 Cute houses, 5-block-tall central fountain (hand-built, `stone_brick` + `water`).
- **Plaza surface:** `stone_brick` (the only paved surface in the old town).
- **Lighting:** torch + lantern, 1 per 8–10 blocks (warm, low-density, 2010s vernacular feel).
- **Historical signs:** 1×1 `oak_sign` on `oak_fence` post at each re-placed schematic's entrance. Format: *"\<SCHEMATIC NAME\> — Placed by the mc-fleet-bot fleet, 2026."* The 2 Cute houses get a 2×1 founding plaque on a `lectern` crediting CuteHouse1/2 by name.
- **Castle hill material:** `cobblestone` + `mossy_cobblestone`.
- **Temple hill material:** `spruce_planks` + `stone_brick`.

### Verification

- All 33 schematics placed in the correct clusters.
- All historical signs installed (1×1 `oak_sign` per schematic).
- All internal roads built.
- Central plaza built (fountain, paths, glass viewing window placeholder).
- Each schematic has a sign crediting the bot fleet.
- The 2 Cute houses have the 2×1 founding plaque crediting CuteHouse1/2.
- The 7 clusters are visible from the Grand Avenue entrance, and the historical signs are readable on foot.

---

## 6. Phase 3: Gateway Pavilions

**Goal:** build the 2 matching 7×7 pavilions with obsidian portal frames, `/tp` command blocks, lectern, bench, and pressure-plate trigger.

**Time:** 1 day in-world.
**Block budget:** 1,200–1,500 blocks.

### Coordinate table

| Pavilion | World | Position | Footprint | Material | Frame |
|---|---|---|---|---|---|
| Existing-world pavilion | existing_bot_world | **(935, 60, 280)** | 7 × 7, 6 blocks tall | `stone_brick` walls, `mossy_cobblestone` floor, `light_gray stained_glass` roof | 4×5 `obsidian` + `glowstone` |
| New-world pavilion (mirror) | new_world | **(0, 0, 700)** | 7 × 7, 6 blocks tall | `oak_planks` walls, `stone_brick` floor, `light_gray stained_glass` roof | 4×5 `obsidian` + `glowstone` (matches existing-world) |

Both pavilions are 3 blocks south of the existing bot base (existing world) and on the new world's southern coastal plain (new world). They are **mirrors** — same dimensions, same obsidian frame, same sign typography, same written book. The only differences are material (stone-brick in old world; wooden in new world) and direction of transit (`/tp` commands reciprocal).

### Block specs — existing-world Gateway (935, 60, 280)

- **Floor:** `mossy_cobblestone` (matching the existing bot base's starter aesthetic).
- **Walls:** 1-block-thick `stone_brick`, 3 blocks tall, with 2-block `glass_pane` windows on all 4 faces.
- **Roof:** `light_gray stained_glass` (lets sun in, makes the pavilion feel welcoming).
- **Portal frame:** 4 × 5 `obsidian` corners with `glowstone` in corner notches, centered in the pavilion, oriented north-south.
- **Portal mechanism:** 1×1 `stone_pressure_plate` on the floor center (the entering plate). Hidden `command_block` 1 block north of the frame's inner edge, running `tp @p 0 60 700`, connected to the plate with 1-block `redstone_dust`. **The portal frame is visual; the `/tp` is the mechanism.**
- **Furnishings:** `lectern` with written book *"A Visitor's Guide to the Combined Complex"* (the v2.0 book describes the funicular+summit-road return, not the v1.0 skybridge). `oak_stairs` bench on the north wall.
- **Signs:** 2×1 `oak_sign` at the entrance: *"GATEWAY TO THE COMBINED COMPLEX — 0,000 m FROM CITY CENTER — EST. 2026."* Sign above the frame: *"GATEWAY TO THE COMBINED COMPLEX — 0,000 m."*
- **Lighting:** 1 `sea_lantern` at center of ceiling, 4 `glowstone` at the corners of the obsidian frame.
- **Rail terminus:** at the back (north) of the pavilion, with a "Freight Station" sign and a `chest_minecart` (the existing world's last rail block of the coastal-plain rail spur).
- **Exterior path:** 1-block-wide `dirt_path` from the bot base to the pavilion's doorway.

### Block specs — new-world Gateway (0, 0, 700) — mirror

- **Floor:** `stone_brick` (matching the Grand Avenue's material).
- **Walls:** 1-block-thick `oak_planks`, with 2-block `glass_pane` windows on all 4 faces.
- **Roof:** `light_gray stained_glass` (matches existing-world pavilion).
- **Portal frame:** same 4 × 5 `obsidian` + `glowstone` frame, matching existing-world.
- **Portal mechanism:** 1×1 `stone_pressure_plate` on the floor (the welcome plate). Hidden `command_block` running `tp @p 935 60 280`, connected to the plate.
- **Furnishings:** `lectern` with the same written book (v2.0 — describes the funicular+summit-road return). `oak_stairs` bench. `minecart` on a 1-block-gauge rail extending out of the south face (the rail spur's first block).
- **Signs:** 2×1 `oak_sign` at the entrance: *"COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER — EST. 2026."* Sign above the frame: *"YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER."*
- **Lighting:** same as existing-world (1 `sea_lantern` + 4 `glowstone`).
- **Exterior path:** 1-block-wide `dirt_path` extending north to the Grand Avenue (5 blocks long).

### Verification

- Both pavilions built with all features (walls, windows, roof, frame, signs, lectern, bench, minecart, command block, lighting).
- Portal transit tested in both directions (verify the `/tp` teleports correctly).
- Rail connection from the new-world pavilion to the new-world Gateway station is functional.
- Both pavilions have the same written book (v2.0 — funicular+summit-road return described).
- Both pavilions have matching signs and lighting.

---

## 7. Phase 4: Grand Avenue

**Goal:** build the 425-block stone-brick-to-granite connection from the old town plaza to the SE corner of the new city, with 6 statues, 3 milestones, 1 above-ground stream bridge, and 43 sea-lantern lighting. (The stream is no longer ravine-fed — it is sourced from the limestone hillside at the south face of the mountain.)

**Time:** 2–3 days in-world.
**Block budget:** 3,500–4,500 blocks.

### Coordinate table

| Point | X | Y | Z | Block | Description |
|---|---|---|---|---|---|
| Start (Cute House Plaza) | 0 | 0 | 500 | 0 | North end of old town center. Block 0 of 425. |
| Milestone 1 | 0 | 0 | 400 | 100 | *"OLD TOWN 1/4 MILE"* sign. |
| Statue 1 (teddy-bear) | 0 | 0 | 430 | 70 | East sidewalk, on stone_brick pedestal. |
| Statue 2 (macaw) | 0 | 0 | 360 | 140 | East sidewalk. |
| Statue 3 (parrot) | 0 | 0 | 290 | 210 | East sidewalk. |
| Milestone 2 | 0 | 0 | 250 | 250 | *"OLD TOWN CENTER — CUTE HOUSE PLAZA"* sign. |
| Statue 4 (flying-eagle) | 0 | 0 | 220 | 280 | East sidewalk. |
| Material transition | 0 | 0 | 150 | 350 | 5-block gradient strip, stone_brick → polished_granite. |
| Statue 5 (villager) | 0 | 0 | 150 | 350 | East sidewalk, ON the material transition. |
| Milestone 3 | 0 | 0 | 150 | 350 | *"CITY APPROACHING — STREAM CROSSING 100 m"* sign. |
| Stream bridge | 0 | 0 | 120 | 380 | 5-block-wide `stone_brick` arch over 3-block-wide above-ground stream. |
| Statue 6 (enderman) | 0 | 0 | 80 | 420 | East sidewalk, the "boss" at city approach. *"ENTER THE CITY."* |
| End (SE corner of new city) | 60 | 0 | 70 | 425 | Where the city streets begin. **Also** the terminus of the v2.0 summit road. |

### Block specs

- **Cross-section:** 8 blocks total.
  - **Road:** 4 blocks wide, centerline. `stone_brick` for blocks 0–350, `polished_granite` for blocks 350–425.
  - **Sidewalks:** 2 blocks wide on each side, raised 1 block above the road. `smooth_stone` for blocks 0–350, `smooth_stone` with `glass_pane` inserts every 8 blocks for 350–425 (matching the new city's skybridge material — these are sidewalk-level decorative glass, NOT the v1.0 skybridge).
  - **No planters** (intentionally Minecraft-pedestrian-friendly at 8 blocks wide, not Champs-Élysées-grand).
- **Total paved surface:** 8 × 425 = 3,400 blocks.
- **Statue pedestals:** 1-block `stone_brick`, with 1×1 `oak_sign` on `oak_fence` post.
- **Milestone posts:** 2-block-tall `oak_fence` with 2×1 `oak_sign`.
- **Stream bridge:** 5-block-wide × 3-block-long × 1-block-tall `stone_brick` arch over 3-block-wide × 3-block-deep water-filled trench. 1-block-tall `stone_brick` railings with 1-block gaps. **The stream is sourced from the limestone hillside at the south face of the mountain — there is no ravine.**
- **Lighting:** 43 `sea_lantern` on 2-block `oak_fence` posts every 10 blocks (43 total on the road edge). Plus 6 `sea_lantern` on statue pedestals and 3 on milestone posts. **Total: 52 `sea_lantern`.**

### Verification

- Roadbed laid: 4-block stone brick → polished_granite, 2-block sidewalks each side.
- 6 statues placed at 70-block intervals with pedestals and signs.
- 3 milestones placed at blocks 100, 250, 350.
- Material transition at block 350 (5-block gradient).
- Stream bridge at block 380 (above-ground stream, no ravine).
- 43 sea_lanterns on the Avenue (1 every 10 blocks).
- Connecting dirt path from the Grand Avenue's south end (0, 0, 500) to the old town plaza.
- Walk the full 425 blocks and time it (target: 10–12 minutes at walking pace).

---

## 8. Phase 5: Rail Spur

**Goal:** build the 960-block coastal-plain rail spur (1,030 blocks with pavilion connector) with 3 named stations, powered rails, and redstone wiring.

**Time:** 2–3 days in-world.
**Block budget:** 3,000–4,000 blocks.

### Coordinate table — 3 named stations

| # | Station | Position | Footprint | Material | Sign |
|---|---|---|---|---|---|
| 1 | New world Gateway | (0, 0, 700) | 7×7 | `oak_planks` | *"NEW WORLD GATEWAY — Combined Complex Rail Spur"* |
| 2 | Old town station (spur) | (0, 0, 500) | 5×7 | `spruce_planks` | *"OLD TOWN STATION — Cute House Plaza 30 m east"* |
| 3 | City approach station | (0, 0, 70) | 7×7 | `stone_brick` | *"CITY APPROACH — Grand Avenue 425 m south, City Center 138 m north"* |

### Block specs

- **Cross-section:** 3 blocks total.
  - **Rail:** 1 block centerline. `rail` blocks, with `powered_rail` every 8 blocks.
  - **Walkway:** 1 block wide, east side. `oak_planks`.
  - **Utility strip:** 1 block wide, west side. `grass_block` (or `dirt` where `redstone` runs underneath).
- **Gauge:** 1-block (Minecraft standard).
- **Mode:** passenger `minecart`.
- **Material:** `smooth_stone_slab` rail ties (era discipline: 1970s Houston-modern, distinct from stone-brick Grand Avenue and granite-and-glass city).
- **Route geometry:**
  - **Pavilion connector:** 200 blocks east from (0, 0, 700) to (200, 0, 700).
  - **Main line:** 630 blocks north from (200, 0, 700) to (200, 0, 70). **The main line bypasses the old town on the east side (X = +50 or X = +200; see Open Item 11) — the old town is pedestrian-only.**
  - **Old town spur:** 200 blocks west from (200, 0, 500) to (0, 0, 500).
  - **Total track length:** 200 + 630 + 200 = 1,030 blocks (the "960 blocks" in the deliberation is main+spur, not including the pavilion connector).
- **Powered rail:** 1 `powered_rail` every 8 blocks (1 powered, 7 regular, repeat).
- **Redstone:** `redstone_torch` under each powered rail, `redstone_repeater` every 16 blocks, `redstone_block` power source at the new world Gateway station. `redstone_dust` running the length of the spur on the utility-strip side.
- **Stations:**
  - **New world Gateway station** at (0, 0, 700): 7×7 `oak_planks` platform, `stone_button` powered-rail activator, `chest` with 4 spare `minecart`s, sign "Cities: Old Town Plaza, City Approach," 1-block-wide `dirt_path` to the pavilion.
  - **Old town station** at (0, 0, 500): 5×7 `spruce_planks` platform, 1-block `oak_planks` path to the Cute houses.
  - **City approach station** at (0, 0, 70): 7×7 `stone_brick` platform, 1-block path to the Grand Avenue's north end.

### Verification

- Pavilion connector built (200 blocks).
- Main line built (630 blocks).
- Old town spur built (200 blocks).
- Powered rails every 8 blocks, redstone wiring functional.
- 3 named stations built.
- Minecart ride tested in both directions, including side trips.
- Ride the full 1,030 blocks and time it (target: 5–7 minutes at full speed).

---

## 9. Phase 6: Underground Easter Egg

**Goal:** place the `underground-base.schem` at `(−50, 0, 550)`, partially buried, with the historical sign, interior chest, and 1×1 glass viewing window.

**Time:** 0.5 days in-world.
**Block budget:** 200–300 blocks.

### Coordinate table

| Element | X | Y | Z | Block | Description |
|---|---|---|---|---|---|
| Schematic placement | −50 | −3 to +2 | 550 | `underground-base.schem` (5×5×3 footprint expected) | The only existing underground build in the entire workspace. |
| Entrance | −50 | 0 | 552 | `oak_door` (1×1) | At the back of a `mushroom-cottage.schem` placed at (−50, 0, 540). |
| Burial | −50 | +3 to +5 | 550 | `dirt` + `cobblestone` (2–3 blocks above schematic's roof) | 1×1 `oak_sign` on `oak_fence` at the surface. |
| Interior chest | −50 | −2 | 550 | `chest` | Contains the written book + name_tag + stone tools. |
| Glass viewing window | 0 | 0 | 500 | `glass` (1×1) | In a corner of the old town central plaza near the Cute houses. |

### Block specs

- **Source schematic:** `D:\projects\mc-fleet-bot\schematics\underground-base.schem` (1,048 bytes).
- **Treatment:** partially buried. Schematic's floor at Y = −3, roof at Y = +2. 1-block-wide entrance at the back of the `mushroom-cottage` placed at `(−50, 0, 540)`, with a 1×1 `oak_door`. 2–3 blocks of `dirt` + `cobblestone` above the schematic's roof.
- **Historical sign:** 1×1 `oak_sign` on `oak_fence` at the surface, reading: *"THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD IN THE WORKSPACE. IT WAS THE SEED OF THE COMBINED COMPLEX. THE SUBTROPOLIS CHAMBER IS ITS DESCENDANT."*
- **Interior:**
  - 1 `chest` at the center of the schematic's floor, containing the same written book from the Gateway station + 1 `name_tag` *"SubTropolis Engineer"* + 1 `stone_pickaxe` + 1 `stone_shovel`.
  - 1 `redstone_lamp` at the center of the ceiling, toggled by a 1×1 `stone_pressure_plate` at the entrance (1-block `redstone_dust`).
  - 1 `soul_lantern` at the center of the ceiling (atmospheric lighting — matches the SubTropolis chamber and Houston tunnel lighting).
- **Glass viewing window:**
  - 1×1 `glass` block in the floor of the old town central plaza at `(0, 0, 500)`, in a corner near the Cute houses.
  - 1×1 `oak_sign` on `oak_fence`: *"LOOK DOWN — THE FIRST UNDERGROUND BUILD IN THE WORKSPACE LIES BENEATH YOU."*
- **Pre-build requirement:** the design team must inspect `underground-base.schem` with a schematic-inspector tool (Python or Node.js script) before placement. Confirms footprint (expected 5×5×3) and checks for legacy block IDs. **Test in a sandbox world first** (not the production bot world). Fallback: hand-built 5×5×3 `stone_brick` replica at the same coordinates.

### Verification

- `underground-base.schem` placed at `(−50, 0, 550)` with the correct burial.
- Historical sign installed.
- Interior chest, redstone lamp, soul lantern installed.
- Glass viewing window placed in the plaza floor.
- Plaza sign installed.
- The easter egg is **discoverable** but not **obvious** (entrance at the back of a house; glass window in a corner).

---

## 10. Phase 7: Return Route — Funicular + Summit Road (v2.0 NEW)

**Goal:** build the funicular rail from the Cheyenne outer portal `(0, 200, −420)` up 600 blocks to the granite summit station `(0, 800, −420)`, and the switchback summit road descending 800 blocks back to the city SE corner `(60, 0, 70)`. **NO skybridge.**

**Time:** 2–3 days in-world.
**Block budget:** 5,500–7,000 blocks.

### Coordinate table — Stage A: Funicular

| Point | X | Y | Z | Description |
|---|---|---|---|---|
| Cheyenne outer portal lobby | 0 | 200 | −420 | Stone_brick 5×5 platform. Connects to 25-ton blast door. |
| Mid-station (optional) | 0 | 400 | −420 | Polished_granite 3×3 platform with 1×1 `glass_pane` exterior view. Skippable. |
| Granite summit station | 0 | 800 | −420 | Polished_granite 7×7 platform. Sign: *"SUMMIT STATION — Switchback road to city SE corner 1200 m."* |

### Coordinate table — Stage B: Summit road (8 named landings)

| # | Landing | X | Y | Z | Description |
|---|---|---|---|---|---|
| 1 | Summit station | 0 | 800 | −420 | Polished_granite 7×7. |
| 2 | Landing_1 | 0 | 700 | −380 | Switchback. |
| 3 | Landing_2 | 0 | 600 | −340 | Switchback. |
| 4 | Landing_3 | 0 | 500 | −300 | Switchback. |
| 5 | Contact overlook | 0 | 400 | −260 | 1×1 `glass_pane` viewing window looking down at the contact elevation Y=200. |
| 6 | Landing_4 | 0 | 300 | −220 | Switchback. |
| 7 | **Landing_5 (AT contact Y=200)** | 0 | 200 | −180 | **Duplicate composite terrane plaque sign on the road-side rail.** |
| 8 | Landing_6 | 0 | 150 | −140 | Switchback. |
| 9 | Landing_7 | 0 | 100 | −100 | Switchback. |
| 10 | City SE corner | 60 | 0 | 70 | Where the summit road meets the Grand Avenue's northern end. |

### Block specs — Stage A: Funicular

- **Cross-section:** 3 blocks wide.
  - **Rail:** 1 block centerline, `rail` + `powered_rail` every 4 blocks (steeper grade needs more power than the rail spur's every-8).
  - **Walkway:** 1 block, one side. `oak_planks`.
  - **Safety barrier:** 1 block, opposite side. `glass_pane` (no falling off).
- **Vertical rise:** 600 blocks (Y=200 → Y=800). 1:1 incline (1 block forward per 1 block up).
- **Shaft lining:**
  - Lower 200 blocks (limestone, Y=0–200): `stone_brick` lining.
  - Upper 600 blocks (granite, Y=200–800): `polished_granite` lining.
- **Redstone:** `redstone_dust` + `redstone_lamp` under each powered_rail, `redstone_torch` every 8 blocks, `redstone_block` power source at the summit station.
- **Stations:** see coordinate table above.
- **Sign at the Cheyenne lobby:** 2×1 `oak_sign`: *"FUNICULAR TO SUMMIT — 600 m vertical."*
- **Estimated ride time:** ~3 minutes end-to-end.

### Block specs — Stage B: Summit road

- **Cross-section:** 4 blocks wide polished_granite + 1-block `oak_fence` railings on each side.
- **Surface:** `polished_granite` (matches the Grand Avenue's city-era segment).
- **Lighting:** 1 `sea_lantern` every 8 blocks on 2-block `oak_fence` posts.
- **Landings:** 4×4 polished_granite platform with 2×1 oak_sign at each named landing.
- **Contact overlook duplicate plaque (v2.0):** 1×1 `oak_sign` on the road-side rail at landing_5 `(0, 200, -180)`, reading: *"GRANITE-LIMESTONE CONTACT — Above: 1.08 Ga granite. Below: 270 Ma limestone. Visible in the service tunnel at mkr_service_tunnel_contact_crossing (−40, 200, −360)."*
- **Estimated walk time:** ~12 minutes end-to-end.
- **Total return time:** ~15 minutes.

### Verification

- Funicular rides end-to-end in ~3 minutes on powered rails. 600 blocks, 1:1 incline, 3 stations, glass_pane barrier, oak_plank walkway.
- Summit road walks end-to-end in ~12 minutes. 8 named landings, polished_granite surface, oak_fence railings, sea_lantern every 8 blocks.
- The composite terrane plaque is visible from the minecart at the contact crossing `(-40, 200, -360)`, AND from the summit road landing_5 `(0, 200, -180)`.
- The visitor can complete the full return from Cheyenne lobby to city SE corner in ~15 minutes.
- **The 1.6-block enderman at Grand Avenue block 420 still greets them at the city end of the summit road.**

---

## 11. Phase 8: Service Tunnel + Contact Plaque (v2.0 NEW)

**Goal:** excavate the service tunnel from the SubTropolis chamber up to the Cheyenne chamber, expose the horizontal granite-limestone contact at Y=200 inside the tunnel, and mount the composite terrane plaque on the contact face. **The plaque is at the contact crossing `(-40, 200, -360)`, NOT at a ravine bottom.**

**Time:** 2–3 days in-world.
**Block budget:** 4,500–6,000 blocks.

### Coordinate table

| Element | X | Y | Z | Block | Description |
|---|---|---|---|---|---|
| Service tunnel start (SubTropolis end) | ~0 | −50 | ~−200 | `stone_brick` (limestone section) | Connects to SubTropolis chamber. |
| Service tunnel end (Cheyenne end) | 0 | 200 | −420 | `polished_granite` (granite section) | 25-ton blast door. |
| Service tunnel midpoint | ~−40 | 200 | ~−360 | Mixed (crosses contact) | The contact crossing. |
| **Composite terrane plaque** | **−40** | **200** | **−360** | **`polished_granite` 2×1, west wall of viewing alcove** | **The composite terrane plaque — v2.0's defining moment.** |
| Contact alcove | −40 to −36 | 199 to 200 | −362 to −358 | `andesite` (the exposed contact face) | 4×2 viewing alcove carved into the west wall of the tunnel. |
| 25-ton blast door (Cheyenne end) | 0 | 200 | −420 | `iron_door` (5×5 stacked assembly) | Connects to funicular lobby. |

### Block specs — service tunnel

- **Tunnel cross-section:** 6×6 (4 `minecart` rail + 2 utility strip).
- **Tunnel walls:**
  - Limestone sections (Y < 200): `stone_brick`.
  - Granite sections (Y > 200): `polished_granite`.
- **Tunnel floor:** same as walls.
- **Service-tunnel minecart rail:** 1-block centerline `rail` + `powered_rail` every 8 blocks, `redstone_torch` under each. **One-way (SubTropolis → Cheyenne); return is via the funicular, not this rail.**
- **Composite terrane plaque (v2.0 NEW):**
  - **Position:** `(-40, 200, -360)` on the west wall of the contact alcove.
  - **Block:** `polished_granite` 2 blocks wide × 1 block tall, mounted flat against the contact face.
  - **Text overlay:** 5 lines via `oak_sign`:
    1. *"GRANITE-LIMESTONE CONTACT"*
    2. *"Above (Y > 200): 1.08 Ga Pikes Peak granite"*
    3. *"Below (Y < 200): 270 Ma Bethany Falls limestone"*
    4. *"Contact age: ~810 million years of erosion before granite emplacement"*
    5. *"Discovered in the Cheyenne Mountain Complex drill core, 1966"*
- **Contact alcove lighting:** 1 `redstone_lamp` on the alcove ceiling, toggled by 1×1 `stone_pressure_plate` on the tunnel floor 1 block in front of the plaque, connected by 1-block `redstone_dust`.
- **Marker sign:** 1×1 `oak_sign` on the tunnel wall: *"mkr_service_tunnel_contact_crossing — The composite terrane plaque is on the west wall."*
- **25-ton blast door at Cheyenne end:** 5-block-wide × 5-block-tall `iron_door` assembly (stacked Minecraft `iron_door`s to fill the 5-block height). Sign next to the door: *"CHEYENNE OUTER PORTAL — 25-TON BLAST DOOR."*

### Verification

- Service tunnel excavated from SubTropolis to Cheyenne (~120 blocks, 6×6 cross-section).
- Composite terrane plaque mounted at `(-40, 200, -360)` on the contact face, visible from the minecart and readable on foot.
- Contact alcove lit (1 redstone_lamp, pressure-plate toggled).
- Marker `mkr_service_tunnel_contact_crossing` placed.
- Service-tunnel minecart ride tested end-to-end (~5 minutes on powered rails).
- 25-ton blast door functional (open/close cycle) at the Cheyenne end.
- The minecart passes the contact crossing at full speed — the plaque is visible.

---

## 12. Phase 9: Inter-Build Coordination

**Goal:** update the data layer (markers, zones, squads, missions, routes, supply chains), rename the mojibake schematic filename, and resolve the historical `walk_to_coords` command. **This is a data-layer phase, not an in-world build phase.** v2.0 changes from v1.0: `mkr_ravine_bottom` removed, `mkr_service_tunnel_contact_crossing` added, `sqd_ravine_response` renamed to `sqd_service_tunnel_response`, 2 new routes added (funicular, summit road), 1 new supply chain added (funicular booster maintenance).

**Time:** 0.5–1 day real time (not in-world).
**Block budget:** 0 (data only).

### Coordinate table — the 6 named markers in the new world

| Marker | X | Y | Z | Description |
|---|---|---|---|---|
| `mkr_city_center` | 0 | 0 | 0 | Center of the new city. World origin. |
| `mkr_public_shaft_top` | 60 | 0 | −70 | Combined Complex Transit Hub plaza, top of the public shaft. |
| `mkr_subtropolis_chamber_center` | 0 | −50 | −200 | Center of the SubTropolis 200×200 chamber. |
| `mkr_service_tunnel_contact_crossing` | **−40** | **200** | **−360** | **v2.0 NEW. The horizontal granite-limestone contact face at Y=200 inside the service tunnel. Replaces v1.0's `mkr_ravine_bottom`.** |
| `mkr_cheyenne_outer_portal` | 0 | **200** | −420 | **v2.0 UPDATED Y from 0 to 200.** 25-ton blast door at the Cheyenne outer portal, at the Y=200 contact elevation. The funicular rail starts here. |
| `mkr_old_town_center` | 0 | 0 | 500 | Center of the old town, at the Cute House Plaza. |

### Coordinate table — the 2 new mining-area zones

| Zone | X | Y | Z | Description |
|---|---|---|---|---|
| `zne_subtropolis_chamber` | −100 to 100 | −50 to 0 | −200 to −100 | SubTropolis chamber zone. |
| `zne_cheyenne_chamber` | −40 to 40 | **200 to 400** | −580 to −500 | **v2.0 UPDATED Y from 250-400 to 200-400.** Granite formation above the Y=200 contact. |

### Squads (6 named, all from the 6 empty placeholders)

| Squad | Role |
|---|---|
| `sqd_che_outer_portal_guard` | Guards the Cheyenne outer portal at `(0, 200, -420)`. |
| `sqd_sub_chamber_patrol` | Patrols the SubTropolis 200×200 chamber. |
| `sqd_pub_shaft_operator` | Operates the public shaft. |
| `sqd_svc_tunnel_maintenance` | Maintains the service tunnel, the rail spur, AND the funicular. |
| `sqd_old_town_ranger` | Patrols the old town. |
| `sqd_service_tunnel_response` | **v2.0 RENAMED from v1.0 `sqd_ravine_response`.** Responds to events at the service tunnel contact crossing. |

### Other data-layer changes

- **2 bot missions re-targeted** in `data/missions.json`:
  - `birch house`: `(904, 79, 390)` → `(0, 0, 480)` (residential cluster).
  - `md castle 2`: `(973, 1, 453)` → `(200, 0, 500)` (castle cluster).
- **1 historical command resolved** in `data/commands.json`: the 2026-03-23 `walk_to_coords(100, 64, 200)` for Lilly, marked as completed and re-targeted to `(0, 0, 500)`.
- **2 new files created:**
  - `data/routes.json` — 4 named routes (v1.0 had 2).
  - `data/supply_chains.json` — 2 supply chains (v1.0 had 1).
- **1 mojibake filename fix:** `schematics/Pokémon Temple Arena.schem` → `schematics/pokemon-temple-arena.schem` (plain ASCII; file deferred to a future attractions zone).

### Verification

- All 14 markers resolve to valid coordinates (6 named from placeholders + 8 new from map integration).
- All 6 squads are mapped to named roles (no `sqd_ravine_*` references).
- All 4 routes are well-formed (start, end, waypoints).
- All 2 supply chains have at least 1 item.
- Mojibake filename renamed.
- Backup of original `data/` JSON files retained.

---

## 13. Phase 10: Finishing

**Goal:** polish, lighting tuning, and verification of the full 60–90 minute visitor journey including the v2.0 funicular + summit-road return.

**Time:** 1–2 days in-world.
**Block budget:** 200–400 blocks.

### Block specs

- **Historical signs:** every re-placed schematic has its 1×1 `oak_sign` historical sign. Replace any missing or broken signs.
- **Cute House Plaza:** 2×1 `oak_sign` founding plaque on a `lectern` crediting CuteHouse1/2.
- **6 Grand Avenue statues:** pedestals (`stone_brick`) and founding-era signs.
- **3 milestones:** signs on 2-block `oak_fence` posts.
- **2 Gateway pavilions:** 4 `glowstone` + 1 `sea_lantern` lighting each.
- **43 sea_lanterns on the Grand Avenue** (1 every 10 blocks), 6 on statue pedestals, 3 on milestone posts. Total: 52 `sea_lantern`.
- **100+ sea_lantern on the summit road** (1 every 8 blocks along 1200 blocks).
- **1 redstone_lamp at the contact alcove** (toggled by pressure plate).
- **9-bots founding plaque in the old town** listing CuteHouse1/2, Builder1/2/5, Packet1/2/3, sloth, badbitch (the 9 historical bots).

### Visitor journey timing (v2.0)

| Stage | Time (min) | What happens |
|---|---|---|
| 1. Spawn at new world Gateway | 0 | Read sign, written book. |
| 2. Walk to old town (or ride rail spur) | 10 | Rail spur: 5 min. Walk: 15 min. |
| 3. Explore old town (7 clusters) | 15 | Find easter egg, see Space Mountain. |
| 4. Walk Grand Avenue to new city | 10 | 425 blocks, 6 statues, 3 milestones, bridge. |
| 5. Explore new city (138×138) | 10 | Anchor towers, skybridges, T-markers. |
| 6. Public shaft descent | 5 | 100 blocks, mid-landing. |
| 7. SubTropolis exploration | 15 | 200×200 limestone grid. |
| 8. Service tunnel minecart (passes contact crossing) | 5 | 120 blocks, contact plaque visible. |
| 9. Cheyenne exploration | 10 | 4.5-acre chamber, blast door. |
| **10. Return: funicular + summit road (v2.0 NEW)** | **15** | **Funicular 3 min + summit road 12 min. Replaces v1.0's 1-min /tp.** |
| **Total** | **95** | **v2.0 is 5 min over the 60–90 target. See Open Item 12 for optimization options.** |

---

## 14. Block Palette Reference

### Old town
- **Schematic native materials:** `birch_planks`, `oak_planks`, `jungle_planks`, `spruce_planks`, `dark_oak_planks`, `stone`, `cobblestone`, `terracotta`, `glass`, `white_wool`.
- **Plaza:** `stone_brick`.
- **Internal roads:** `oak_planks` with `cobblestone` edges.
- **Historical signs:** `oak_sign` on `oak_fence`.
- **Castle hill:** `cobblestone` + `mossy_cobblestone`.
- **Temple hill:** `spruce_planks` + `stone_brick`.
- **Lighting:** `torch` + `lantern` (2010s vernacular, warm, low-density).

### Gateway pavilions
- **Existing-world (old world):** `mossy_cobblestone` floor, `stone_brick` walls, `glass_pane` windows, `light_gray stained_glass` roof, 4×5 `obsidian` + `glowstone` portal frame, `oak_sign`, `oak_lectern`, `oak_stairs` bench, `stone_pressure_plate`, hidden `command_block`, 1 `sea_lantern` + 4 `glowstone` lighting, `dirt_path` exterior.
- **New-world (mirror):** `stone_brick` floor, `oak_planks` walls, same `glass_pane` + `light_gray stained_glass` + portal frame + furnishings, `minecart` on rail at south face.

### Grand Avenue
- **Road surface (blocks 0–350):** `stone_brick`, 4 blocks wide.
- **Road surface (blocks 350–425):** `polished_granite`, 4 blocks wide.
- **Transition at block 350:** 5-block gradient strip, `stone_brick` → `polished_granite`.
- **Sidewalks:** `smooth_stone` (with `glass_pane` inserts every 8 blocks in the city-era segment).
- **Statue pedestals:** 1-block `stone_brick`.
- **Milestone posts:** 2-block `oak_fence`.
- **Stream bridge:** `stone_brick` arch with `stone_brick` railings. Stream sourced from limestone hillside.
- **Lighting:** `sea_lantern` every 10 blocks on 2-block `oak_fence` posts (43 on the road edge + 6 on pedestals + 3 on milestones = 52 total).

### Rail spur
- **Rail:** `rail` (1 block centerline) + `powered_rail` every 8 blocks.
- **Walkway (east):** `oak_planks`.
- **Utility strip (west):** `grass_block` (or `dirt` where redstone runs).
- **Redstone:** `redstone_dust`, `redstone_torch`, `redstone_repeater` every 16 blocks, `redstone_block` power source.
- **Stations:** `oak_planks` (Gateway), `spruce_planks` (Old town), `stone_brick` (City approach).

### Funicular (v2.0 NEW)
- **Rail:** `rail` + `powered_rail` every 4 blocks (steeper grade).
- **Walkway:** `oak_planks` (1 side).
- **Safety barrier:** `glass_pane` (opposite side).
- **Shaft lining:** `stone_brick` (limestone sections, Y<200), `polished_granite` (granite sections, Y>200).
- **Redstone:** `redstone_dust` + `redstone_lamp` under each powered rail, `redstone_torch` every 8 blocks, `redstone_block` at summit.
- **Stations:** `stone_brick` (Cheyenne lobby), `polished_granite` (mid + summit).

### Summit road (v2.0 NEW)
- **Surface:** `polished_granite`, 4 blocks wide.
- **Railings:** `oak_fence` (1 block each side).
- **Lighting:** `sea_lantern` every 8 blocks on 2-block `oak_fence` posts.

### Service tunnel (v2.0 NEW)
- **Walls + floor (limestone):** `stone_brick`.
- **Walls + floor (granite):** `polished_granite`.
- **Rail:** `rail` + `powered_rail` every 8 blocks.
- **Contact face:** exposed `andesite` (the natural Y=200 contact layer, NOT replaced with regular stone).
- **Contact alcove lighting:** 1 `redstone_lamp` + 1 `stone_pressure_plate` + 1-block `redstone_dust`.
- **Blast door:** `iron_door` (5×5 stacked assembly).

### Composite terrane plaque (v2.0 NEW)
- **Block:** `polished_granite` (2 blocks wide × 1 block tall).
- **Text overlay:** 5 lines via `oak_sign`.

### Underground easter egg
- **Burial:** `dirt` + `cobblestone` (2–3 blocks above the schematic's roof).
- **Interior chest:** `chest` with `written_book` + `name_tag` *"SubTropolis Engineer"* + `stone_pickaxe` + `stone_shovel`.
- **Pressure plate:** `stone_pressure_plate` at the entrance.
- **Redstone lamp:** 1 `redstone_lamp` at ceiling center, toggled by the pressure plate.
- **Soul lantern:** 1 `soul_lantern` at ceiling center.
- **Historical sign:** `oak_sign` on `oak_fence` at the surface.
- **Glass viewing window:** 1×1 `glass` in the plaza floor.

---

## 15. Schematic References

### Existing schematic library

- **Path:** `D:\projects\mc-fleet-bot\schematics\`
- **Count:** 111 `.schem` files (all preserved as-is).
- **Placement tool:** WorldEdit `//schem load <name>` + `//pos1` + `//pos2` + `//schem paste`, or equivalent.

### The 33 schematics to re-place (old town)

```
birch house.schem, cozy-cabin.schem, cube-house.schem, classic-village-house.schem,
mushroom-cottage.schem, simple-house.schem, wood-house.schem, rustic-farmhouse.schem,
stilt-house.schem, mud-house.schem, Cute house.schem, victorian palace.schem,
md castle 2.schem, small medieval town hall.schem, stone-fortress.schem,
fantasy-temple-house.schem, red-japanese-temple.schem, japanese-pagoda.schem,
stone-statue.schem, dragon-egg.schem, giant-skull.schem, snowman.schem,
teddy-bear.schem, macaw-statue.schem, parrot-statue.schem, flying-eagle.schem,
villager-statue.schem, enderman.schem,
Disneyland Space Mountain.schem,
underground-base.schem
```

### The 1 schematic for the easter egg

- `underground-base.schem` (1,048 bytes) — the only existing underground build in the entire 111-file library. **MUST be inspected** with a schematic-inspector tool before placement.

### Mojibake filename fix

- `schematics/Pokémon Temple Arena.schem` → `schematics/pokemon-temple-arena.schem` (plain ASCII). The file is deferred to a future attractions zone, not used in this build.

### Schematic-inspector tool

- **Status:** does not currently exist in the workspace.
- **Recommendation:** build a small Python or Node.js script that reads the `.schem` file (gzipped NBT) and reports the schematic's footprint, block types, and tile entities. **This is a deliverable of the map integration**, reusable for future schematic inspections.
- **Fallback:** use a third-party schematic inspector, or place without inspection and accept the risk of legacy block IDs.

---

## 16. Bot-Build Workflow

### `mc-fleet-bot` API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/bots` | List bots |
| `POST` | `/api/bots` | Create bot |
| `DELETE` | `/api/bots/:name` | Delete bot |
| `POST` | `/api/bots/:name/mode` | Set bot mode |
| `GET` | `/api/bots/:name/detailed` | Detailed bot info |
| `GET` | `/api/bots/:name/inventory` | Bot inventory |
| `POST` | `/api/bots/:name/chat` | Send chat as bot |
| `POST` | `/api/bots/:name/task` | Queue a task |
| `POST` | `/api/bots/:name/pause` | Pause voyager |
| `POST` | `/api/bots/:name/resume` | Resume voyager |
| `POST` | `/api/bots/:name/stop` | Stop movement |
| `POST` | `/api/commands` | Create command |
| `GET` | `/api/commands` | List commands |
| `POST` | `/api/commands/:id/cancel` | Cancel command |
| `POST` | `/api/missions` | Create mission |
| `GET` | `/api/missions` | List missions |
| `POST` | `/api/missions/:id/start` | Start mission |
| `POST` | `/api/missions/:id/pause` | Pause mission |
| `POST` | `/api/missions/:id/cancel` | Cancel mission |
| `GET` | `/api/markers` | List markers |
| `POST` | `/api/markers` | Create marker |
| `GET` | `/api/zones` | List zones |
| `POST` | `/api/zones` | Create zone |
| `GET` | `/api/world` | World state |

### Schematic placement commands

```
//schem load <schematic_name>
//pos1
//pos2
//schem paste
```

Or with raw Minecraft commands:
```
/setblock <x> <y> <z> <block_id>
```

### `/tp` command block setup

```
/give @p command_block
/setblock <x> <y> <z> command_block
```

- **Existing-world pavilion command block:** `tp @p 0 60 700`
- **New-world pavilion command block:** `tp @p 935 60 280`
- **Set world spawn:** `/setworldspawn 0 60 700`

### The 2 new data files

#### `data/routes.json` (4 named routes — v2.0 has 4, v1.0 had 2)

```json
[
  { "id": "rte_coastal_plain_rail_spur",
    "stops": ["mkr_spur_new_world_gateway", "mkr_spur_old_town", "mkr_spur_city_approach"] },
  { "id": "rte_visitor_journey_full",
    "stops": ["mkr_new_world_gateway", "mkr_old_town_center", "mkr_grand_avenue_center", "mkr_city_center", "mkr_public_shaft_top", "mkr_subtropolis_chamber_center", "mkr_service_tunnel_contact_crossing", "mkr_cheyenne_outer_portal"] },
  { "id": "rte_cheyenne_return_funicular",
    "stops": ["mkr_cheyenne_outer_portal", "mkr_summit_station"] },
  { "id": "rte_summit_road_walkback",
    "stops": ["mkr_summit_station", "mkr_city_se_corner"] }
]
```

#### `data/supply_chains.json` (2 supply chains — v2.0 has 2, v1.0 had 1)

```json
[
  { "id": "spc_rail_spur_powered_rail_maintenance",
    "items": ["rail", "powered_rail", "redstone", "minecart"],
    "recurring": true },
  { "id": "spc_funicular_booster_maintenance",
    "items": ["rail", "powered_rail", "redstone", "redstone_lamp", "glass_pane"],
    "recurring": true }
]
```

---

## 17. Quality Checkpoints

### Visual review checklist

- [ ] All 33 schematics placed in the correct clusters.
- [ ] All historical signs installed (1×1 `oak_sign` per schematic).
- [ ] The 2 Cute houses have the 2×1 founding plaque on a `lectern` crediting CuteHouse1/2.
- [ ] The 6 Grand Avenue statues have pedestals and founding-era signs.
- [ ] The 3 milestones have signs on 2-block `oak_fence` posts.
- [ ] The 4 `glowstone` + 1 `sea_lantern` lighting is in each Gateway pavilion.
- [ ] The 43 `sea_lantern`s on the Grand Avenue are spaced 10 blocks apart.
- [ ] The glass viewing window is in the old town plaza floor.
- [ ] The historical sign is at the surface above the underground easter egg.
- [ ] **v2.0:** The composite terrane plaque is at `(-40, 200, -360)` on the contact face.
- [ ] **v2.0:** The duplicate contact sign is at the summit road landing_5 `(0, 200, -180)`.
- [ ] **v2.0:** The funicular rides end-to-end (~3 min, 600 blocks, 1:1 incline, 3 stations).
- [ ] **v2.0:** The summit road walks end-to-end (~12 min, 8 landings, polished_granite).
- [ ] **v2.0:** The mountain is ONE CONTINUOUS mountain — no ravine, no V-notch, no gap.
- [ ] **v2.0:** The horizontal contact at Y=200 is exposed inside the service tunnel.

### Path / navigation test

- [ ] Walk from new world Gateway `(0, 0, 700)` to Cute House Plaza `(0, 0, 450)`: ~5 min, no obstacles.
- [ ] Walk the full Grand Avenue `(0, 0, 500)` → `(60, 0, 70)`: 425 blocks, ~10–12 min, no obstacles.
- [ ] Ride the rail spur `(0, 0, 700)` → `(0, 0, 500)` → `(0, 0, 70)`: ~5–7 min, no derailing.
- [ ] Walk from Cute House Plaza to underground easter egg `(−50, 0, 550)`: ~1 min.
- [ ] Step through the Gateway portal in both directions: instant teleport.
- [ ] **v2.0:** Ride the service tunnel minecart from SubTropolis to Cheyenne: ~5 min, passes the contact crossing.
- [ ] **v2.0:** Walk the contact alcove to read the composite terrane plaque: ~30 sec.
- [ ] **v2.0:** Ride the funicular from Cheyenne lobby to summit station: ~3 min.
- [ ] **v2.0:** Walk the summit road from summit to city SE corner: ~12 min, 8 landings.

### Visitor journey timing (60–90 min, target 80–90 min in v2.0)

| Stage | Time (min) |
|---|---|
| Spawn at new world Gateway | 0 |
| Walk to old town (or ride rail spur) | 10 |
| Explore old town | 15 |
| Walk Grand Avenue | 10 |
| Explore new city | 10 |
| Public shaft descent | 5 |
| SubTropolis exploration | 15 |
| Service tunnel (passes contact crossing) | 5 |
| Cheyenne exploration | 10 |
| **Return: funicular + summit road (v2.0)** | **15** |
| **Total** | **95** |

v2.0 is 5 minutes over the 60–90 target. The funicular+summit-road return adds 14 minutes compared to v1.0's 1-minute `/tp` return. **Optimization options (see Open Item 12):**
- The funicular ride can be optional (visitor walks an emergency stair parallel to the rail).
- The summit road can be 6 landings instead of 8.
- Recommended target after optimization: **80–90 minutes**.

### Easter egg accessibility test

- **Approach 1:** A fresh visitor explores the residential cluster's western edge, finds the `mushroom-cottage` at `(−50, 0, 540)`, enters the basement, finds the 1×1 `oak_door`, and steps into the underground-base. Sees the historical sign, the chest with the written book, the `redstone_lamp`, and the `soul_lantern`.
- **Approach 2:** A fresh visitor walks through the old town central plaza, finds the 1×1 `glass` block in the corner near the Cute houses, looks down, and sees the underground-base.
- **v2.0 Approach 3 (return-route bonus):** A return-journey visitor on the summit road passes landing_5 at `(0, 200, −180)` and reads the duplicate contact sign on the road-side rail. They learn about the contact crossing `(-40, 200, -360)` and can choose to visit it on a future descent.

---

## 18. Open Items

| # | Topic | Status | Recommendation |
|---|---|---|---|
| 1 | Pokémon Temple Arena schematic (deferred to attractions zone) | Open | A (defer to attractions zone) |
| 2 | Schematic-inspector tool (does not exist) | Open | A (build a new tool) |
| 3 | Legacy block ID risk in `underground-base.schem` | Open | A (sandbox test first) |
| 4 | World-transit mechanism (`/tp` vs world-portal datapack) | Open | A for MVP (`/tp`), B for v2.5 polish |
| 5 | New world spawn and world type | Open | A (default world with biomes; contact is hand-painted, not generated) |
| 6 | Existing world's relationship to the new world | Open | A (preserve as-is) |
| 7 | Grand Avenue geometry (straight vs curved) | Open | A (straight) |
| 8 | **v2.0 NEW:** Funicular emergency stair (parallel stair for manual descent) | Open | Yes — add the parallel emergency stair (~600 blocks of `oak_stairs`) |
| 9 | **v2.0 NEW:** Funicular shaft lining (lined vs raw stone) | Open | A (lined — matches the visitor-journey material discipline) |
| 10 | **v2.0 NEW:** Mountain Y=200 contact material (andesite, diorite, or custom) | Open | A (andesite — visually distinct from limestone and granite, geologically reasonable as a contact metamorphic rock) |
| 11 | **v2.0 NEW:** Rail spur bypass X coordinate (X=+50 vs X=+200) | Open | Confirm the X coordinate — the design plan and site-coordinates.json disagree (X=+50 in JSON, X=+200 in plan). Both work; the contractor should pick one and document the choice. |
| 12 | **v2.0 NEW:** Visitor journey timing (95 min is over target) | Open | Optimize to 80–90 min by adding the funicular emergency stair (parallel walk option) or reducing the summit road to 6 landings. |

---

**End of brief.** The companion `contractor-brief.json` is the machine-readable spec. Both files are at `D:\projects\mc-fleet-bot\masterplans\04-combined-complex\04-contractor\map-integration\`.
