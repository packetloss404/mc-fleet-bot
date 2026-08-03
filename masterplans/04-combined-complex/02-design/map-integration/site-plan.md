# Map Integration — Site Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Deliverable:** Masterplan 04 (Combined Complex), 5th and final deliverable — Map Integration
**Build ID:** `04-combined-complex-map-integration`
**Author role:** Site Planner (macro site design only — no detailed building design)
**Date prepared:** 2026-08-02
**Status:** Macro site design. Binding for downstream architectural designer + bot team. Respects all 7 binding decisions in `discussion-notes.md` §3.

> **Scope.** This document is the *macro site design* for the map integration — the world layout, the old town, the Gateway station, the Grand Avenue, the coastal-plain rail spur, the underground easter egg, the visitor flow, and the master coordinate table. It does **not** design individual buildings, interior decoration, schematic-internal layout, or block-by-block terrain shaping. Those are downstream. The 7 binding decisions in `discussion-notes.md` are the contract; this plan reflects them without re-deliberation.

---

## 1. Site Overview

The map integration stitches **two Minecraft worlds** into a single 60–90 minute visitor experience. The first world is the **existing bot world** — a small vanilla-384 surface area at world coordinates around (935, 60, 300), where four active bots (Lilly, Taylor, Marcus, Hazel) live and 113 schematic files are stored as a flat library in `D:\projects\mc-fleet-bot\schematics\`. The second world is the **new 1,500 × 1,500 × 800 combined complex** — built fresh, with world origin (0, 0, 0), 1,024+ build height (CubicWorld 2,048), and the city / ravine / mountain / SubTropolis / Cheyenne / public shaft / service tunnel already specified by masterplans 01–04. The two worlds are **not** co-located in a single Minecraft instance; the existing world is too small (200 × 200 explored, 384 build height) to host the new complex. They are connected by a single architectural object — the **Gateway station** — which is a 7 × 7 pavilion with an obsidian portal frame at the existing world's southern edge, mirrored by a 7 × 7 wooden shelter at the new world's southern coastal plain. The transit through the portal is a `/tp` command block; the architecture is the visual frame, the command is the mechanism. **The new world is the experience; the existing world is the vestibule.** Both are preserved, both are referenced, both are credited on the Gateway station's sign.

---

## 2. World Layout (Minecraft-Translated)

### 2.1 Coordinate system

- **New world origin:** (0, 0, 0) — center of the new city, at street grade, sea level reference per `04-combined-complex\02-design\site-coordinates.json` `world_origin`.
- **Compass orientation:** north = −z, east = +x, up = +y. Matches the 04-masterplan.
- **Block size:** 1 block = 1 m, globally, per binding Decision 1. Granite peak at Y = 800 is the only 2:1 vertical compression.
- **Build height:** new world requires 1,024+ blocks (CubicWorld 2,048 recommended). Existing world is vanilla 384 — preserved as-is.

### 2.2 The 5 horizontal zones (inherited from 04-masterplan)

| Zone | X range | Z range | Y range | Description |
|---|---|---|---|---|
| **Granite peak** | −300 to +300 | −700 to −420 | 0 to 800 | North peak, Cheyenne side. 1.08 Ga Pikes Peak granite. |
| **Limestone hillside** | −300 to +300 | −380 to −100 | 0 to 475 | South hillside, SubTropolis side. 270 Ma Bethany Falls limestone. |
| **Ravine** | −400 to +400 | −430 to −370 | −100 to 0 | V-shaped fluvial gorge between the two peaks. Stream at Y = −95. |
| **City** | −69 to +69 | −69 to +69 | 0 to 80 | 138m × 138m downtown, 80m-tall towers. World origin at center. |
| **Coastal plain** | −750 to +750 | +70 to +750 | 0 (flat) | Flat grass plain surrounding the city. Where the old town and the rail spur live. |

### 2.3 The 7th zone — the old town (NEW for map integration)

- **Footprint:** 600 × 400 blocks.
- **Position:** centered at (0, 0, 500), in the coastal plain, south of the new city.
- **Bounding box:** X = −300 to +300, Z = 300 to 700, Y = 0 (with the underground easter egg at Y = −3 to +2).
- **Era discipline:** "2010s vernacular Minecraft" — older, denser, more human-scale than the new city. Building height cap = 2 floors (no structure taller than the Cute house's 2 floors), per discussion Topic 2.
- **Use:** 30–35 schematics from the existing 113-file library, re-placed in 7 clusters.

### 2.4 The 8th zone — the coastal-plain rail spur (NEW for map integration)

- **Footprint:** 3 blocks wide, 960 blocks long.
- **Position:** running north-south on the X = 0 line, from (0, 0, 700) at the new world Gateway station to (0, 0, +70) at the city's south edge.
- **Cross-section:** 1-block center rail + 1-block oak-plank walkway on the east side + 1-block grass/utility strip on the west side. Total 3 blocks.
- **Mode:** passenger minecart, 1-block gauge, powered rail every 8 blocks.
- **Route geometry:** bypasses the old town on the east side (X = +50 instead of X = 0 through the old town plaza), with a short spur branching west to the old town station at (0, 0, 500).
- **Continuity:** the spur is interrupted at the world boundary. The new world's first rail block is at the new world Gateway (0, 0, 700); the existing world's last rail block is at the existing world Gateway (935, 60, 280). The visitor dismounts at the existing Gateway, walks through the portal, and remounts at the new world Gateway.

### 2.5 The connection to the existing bot world — via Gateway portal

- **Existing world Gateway pavilion:** 7 × 7 stone-brick pavilion at (935, 60, 280) in the existing world, 3 blocks south of the existing bot base. Glass roof (light gray stained glass), obsidian portal frame (4 × 5), sign reading "GATEWAY TO THE COMBINED COMPLEX", written book on a lectern.
- **New world Gateway shelter:** 7 × 7 wooden shelter at (0, 0, 700) in the new world, on the new world's southern coastal plain. Same obsidian portal frame, sign reading "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER", minecart on a 1-block-gauge rail, 1-block-wide dirt path leading to the Grand Avenue.
- **Portal mechanism:** visual obsidian-and-glowstone frame; transit is a `/tp` command block hidden inside the frame (or a world-portal datapack, per discussion Topic 3's open question).
- **Symmetry:** the existing world has a Gateway pavilion; the new world has a mirror shelter. Both have a portal frame, a sign, a written book. The visitor experience is symmetric.

### 2.6 World footprint summary

| World | Footprint (X × Z) | Build height | Origin | Mod dependencies |
|---|---|---|---|---|
| **New world** | 1,500 × 1,500 | 800 (1,024+ required) | (0, 0, 0) at city center | CubicWorld 2,048 (recommended) |
| **Existing bot world** | ~200 × 200 explored (vanilla) | 384 (vanilla) | (935, 60, 300) at bot base | None (vanilla) |

---

## 3. The Old Town

### 3.1 Position and footprint

- **Position:** 600 × 400 coastal-plain district centered at (0, 0, 500).
- **Bounding box:** X = −300 to +300, Z = 300 to 700, Y = 0 to ~6 (2-floor cap).
- **Era discipline:** "2010s vernacular Minecraft" — visually heterogeneous (the schematic library's native scales), with the Cute houses as the historical anchor, the Space Mountain as the tourist attraction, and a strict 2-floor height cap.

### 3.2 The 7 clusters (per binding Decision 2)

| # | Cluster | Center | Count | Schematics | Sign |
|---|---|---|---|---|---|
| 1 | **Residential (founding plaza + housing)** | (0, 0, 480) | 10 small + 2 anchors + 1 victorian palace | Small houses: `birch house`, `cozy-cabin`, `cube-house`, `classic-village-house`, `mushroom-cottage`, `simple-house`, `wood-house`, `rustic-farmhouse`, `stilt-house`, `mud-house`. Anchors: `Cute house.schem` × 2, `victorian palace.schem` × 1. (Total 13 in residential, with the 2 Cute houses at the *centre* of the plaza per Topic 2 anchor rule.) | "Old Town Residential — Cute House Plaza (founding square)" |
| 2 | **Castle / fortress** | (200, 0, 500) | 3 | `md castle 2`, `small medieval town hall`, `stone-fortress` | "Old Town Castle District" |
| 3 | **Temple** | (−200, 0, 500) | 3 | `fantasy-temple-house`, `red-japanese-temple`, `japanese-pagoda` | "Old Town Temple District" |
| 4 | **Statue / ornament** | (0, 0, 600) | 4 (in cluster) + 6 (along Grand Avenue) | Cluster: `stone-statue`, `dragon-egg`, `giant-skull`, `snowman`. Grand Avenue (Topic 4): `teddy-bear`, `macaw-statue`, `parrot-statue`, `flying-eagle`, `villager-statue`, `enderman`. (Total 10.) | "Old Town Civic Ornaments" |
| 5 | **Theme park** | (100, 0, 600) | 1 | `Disneyland Space Mountain` (the 58 KB one, placed at native scale) | "Old Town Tourist Attraction" |
| 6 | **Underground easter egg** | (−50, 0, 550) | 1 | `underground-base.schem`, partially buried, 1-block entrance at the back of a residential house, glass viewing window in the old town central plaza | "Root Cellar — The only underground build in the existing library" |
| 7 | **Cute house anchor (founding plaza)** | (0, 0, 450) | 2 (folded into Residential) | The 2 `Cute house.schem` placed at the centre of the plaza. The plaza is the old town's founding square, with a sign crediting the historical CuteHouse1/2 bots. | "Cute House Plaza — Founded by CuteHouse1 and CuteHouse2, 2026" |

**Total: 30–35 schematics** (10 small + 2 Cute anchors + 1 victorian palace + 3 castle + 3 temple + 4 statue cluster + 6 statue Grand Avenue + 1 Space Mountain + 1 underground-base = 31). The remaining 78–83 schematics in the library are reserved for future use.

### 3.3 The 7 specific re-placed schematics with their historical signs

Each re-placed schematic has a small oak sign on a wooden post placed next to it, crediting the original builder / source. The historical sign is a 1×1 oak sign with dark-oak text, ~3-line message, e.g.:

| Schematic | Sign text (3 lines) |
|---|---|
| `Cute house.schem` (×2, at Cute House Plaza) | "Cute House — Placed by CuteHouse1 and CuteHouse2, 2026. The first schematic placements in the workspace's history." |
| `victorian palace.schem` (×1, at Residential cluster) | "Victorian Palace — Re-placed from the original mc-fleet-bot schematic library. Era: 2010s vernacular." |
| `md castle 2.schem` (Castle district) | "MD Castle 2 — Re-placed from the schematic library. The castles are the old town's medieval quarter." |
| `small medieval town hall.schem` (Castle district) | "Small Medieval Town Hall — Re-placed from the schematic library. The civic centre of Castle Row." |
| `stone-fortress.schem` (Castle district) | "Stone Fortress — Re-placed from the schematic library. The southern fortification of Castle Row." |
| `fantasy-temple-house.schem` (Temple district) | "Fantasy Temple House — Re-placed from the schematic library. The eastern temple of Temple Hill." |
| `red-japanese-temple.schem` (Temple district) | "Red Japanese Temple — Re-placed from the schematic library. The tea garden temple." |
| `japanese-pagoda.schem` (Temple district) | "Japanese Pagoda — Re-placed from the schematic library. The western pagoda of Temple Hill." |
| `Disneyland Space Mountain.schem` (Theme park) | "Space Mountain — Re-placed from the schematic library. The old town's tourist attraction. The largest surface build in the library (58 KB)." |
| `underground-base.schem` (underground easter egg) | "Root Cellar — The only underground build in the existing library. The seed of the Combined Complex. See Topic 6 below for placement details." |
| The 10 small houses (Residential cluster) | "Re-placed from the schematic library. Era: 2010s vernacular. The old town's residential quarter." |
| The 10 statues (cluster + Grand Avenue) | "Re-placed from the schematic library. The civic ornaments of the old town and the Grand Avenue." |

### 3.4 What is NOT in the old town (per binding Decision 2 exclusions)

- `Pokémon Temple Arena.schem` — deferred to a separate coastal-plain "attractions zone" outside the old town (mojibake-encoded filename flagged separately; 63 KB is too dominant for the old town).
- `luxury-yacht.schem` and other watercraft — no water in the coastal plain.
- `bbq-grill.schem` and beach content — wrong era.
- `holiday-express-train.schem` — this is the rail spur's mode, not an old-town feature.
- Any schematic already used in the new city's 138 × 138 downtown (per the 04-masterplan's 8–10 generic downtown towers).

### 3.5 Old town era discipline

- **Height cap:** no structure taller than the Cute house's 2 floors (~6 blocks at native scale). The Space Mountain, at its native scale, may exceed this in some dimensions; the design team should *clip* or *frame* it with hedges to keep the visual scale.
- **Material palette:** the existing schematic library's *native* materials — birch, oak, jungle, spruce, dark oak, stone, cobblestone, terracotta, glass, wool. The old town is *visually heterogeneous*; the heterogeneity is the point.
- **Roads:** packed dirt with cobblestone edges (not paved stone brick — the Grand Avenue is the only paved surface in the new world).
- **Plaza surface:** the Cute House Plaza is stone brick (the only paved surface in the old town), 10 × 10 blocks, with a sign crediting the historical CuteHouse1/2 bots.

---

## 4. The Gateway Station

### 4.1 Two matching pavilions

The Gateway station is the **single most important piece of integration architecture** in the whole project. It is the only place where the two worlds touch.

#### 4.1.1 Existing world Gateway pavilion

- **Position:** (935, 60, 280) in the existing bot world — 3 blocks south of the existing bot base, on cleared forest ground.
- **Footprint:** 7 × 7 blocks, ~5 blocks tall.
- **Materials:**
  - **Floor:** mossy cobblestone (matching the existing bot base's "starter" aesthetic).
  - **Walls:** stone brick (4 walls, 3 blocks tall) with a 1-block doorway on the north side (facing the bot base).
  - **Roof:** light gray stained glass (the 7 × 7 glass roof per discussion Topic 3).
  - **Portal frame:** 4 × 5 obsidian-and-glowstone frame, centered on the south wall (facing the new world).
  - **Sign:** "GATEWAY TO THE COMBINED COMPLEX — 0,000 m" (oak sign on the portal frame).
  - **Lectern:** oak lectern inside the pavilion, with a written book titled "A Visitor's Guide to the Combined Complex" (the same written book as the new world Gateway).
  - **Bench:** oak fence + oak slabs bench on the east wall, with two torches.
  - **Rail terminus:** the existing world's last block of the coastal-plain rail spur, terminating at the back (north) of the pavilion, with a "Freight Station" sign and a chest minecart.
  - **Path:** a 1-block-wide dirt path from the bot base to the pavilion's doorway.

#### 4.1.2 New world Gateway shelter (mirror)

- **Position:** (0, 0, 700) in the new world — at the new world's southern coastal plain, on the same X = 0 axis as the rail spur.
- **Footprint:** 7 × 7 blocks, ~5 blocks tall. Same external dimensions as the existing-world pavilion.
- **Materials:**
  - **Floor:** stone brick (matching the Grand Avenue's material).
  - **Walls:** oak planks (4 walls, 3 blocks tall) with a 1-block doorway on the south side (facing back to the existing world).
  - **Roof:** oak slabs (the wooden shelter per discussion Topic 3).
  - **Portal frame:** 4 × 5 obsidian-and-glowstone frame, centered on the north wall (facing back to the existing world). Same frame as the existing-world pavilion.
  - **Sign:** "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER" (oak sign on the portal frame).
  - **Lectern:** oak lectern inside the shelter, with the same written book as the existing-world Gateway.
  - **Minecart:** a passenger minecart on a 1-block-gauge rail at the back (south) of the shelter, on the rail spur.
  - **Path:** a 1-block-wide dirt path leading from the shelter's doorway to the Grand Avenue (which begins at the old town center, 200 blocks north at (0, 0, 500)).

### 4.2 The visual obsidian portal frame

- **Dimensions:** 4 × 5 blocks (width × height), obsidian corners with glowstone interior.
- **Function:** visual marker only — *not* a functional end-portal frame. The visitor does *not* step through to The End; the visitor steps through the frame to see the *opposite* pavilion's frame (a Möbius-strip effect if both frames are activated), or the visitor activates a `/tp` command block hidden inside the frame.
- **Symmetry:** the existing world and the new world have *identical* 4 × 5 obsidian frames. The two frames are the "portkey" of the entire map integration.

### 4.3 The transit mechanism — open question

Per discussion Topic 3, the portal is *visual* (obsidian frame) but the *transit* is a `/tp` command block (or a separate "world-portal" datapack if the bot team has one). The architecture is specified; the mechanism is the bot team's responsibility.

### 4.4 Visitor experience at the Gateway

- **Step 1 (existing world):** the visitor walks from the bot base to the Gateway pavilion along the dirt path (30 seconds, ~30 blocks). They see the mossy cobblestone platform, the obsidian portal frame, the sign, the bench, the lectern.
- **Step 2 (existing world):** the visitor reads the sign and the written book. The book explains the 6-stage inbound journey (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne) and credits Lilly, Taylor, Marcus, and Hazel as the original explorers.
- **Step 3 (transit):** the visitor steps through the portal frame. The `/tp` command block fires, teleporting them to the new world.
- **Step 4 (new world):** the visitor arrives in the new world Gateway shelter, on the stone-brick floor, under the oak slab roof, facing the same obsidian portal frame (now on the opposite wall). The sign reads "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER".
- **Step 5 (new world):** the visitor exits the shelter through the south doorway, onto a 1-block-wide dirt path leading to the Grand Avenue (200 blocks north at (0, 0, 500), the old town center). They see the coastal plain stretching to the north, the old town's clusters visible in the middle distance, and the new city's skyline on the horizon.

---

## 5. The Grand Avenue

### 5.1 Position and dimensions (per binding Decision 4)

- **Start:** old town center (0, 0, 500) — at the Cute House Plaza.
- **End:** SE corner of the new city (60, 0, 70) — at the city's south-east corner where the city streets begin.
- **Length:** 425 blocks (the visitor walks or minecarts the 425 blocks of the Grand Avenue from the old town to the city).
- **Path:** straight, on the X = 0 line (actually X = 0 to 60, with the end at the SE corner of the city, but the Avenue is approximately straight).
- **Cross-section:** 8 blocks total.
  - **Center:** 4-block stone-brick road (2 blocks each direction).
  - **Each side:** 2-block oak-plank sidewalk, raised 1 block above the road.
  - **No planters** (the research recommended 1-block planters, but the panel cut them to keep the cross-section Minecraft-pedestrian-friendly at 8 blocks).
- **Surface material:** stone brick for blocks 0–350 (old-town era), granite-and-glass for blocks 350–425 (city-era, mirroring the city's skybridge material).

### 5.2 The 6 statues (at 70-block intervals)

| Block | Statue | Sign |
|---|---|---|
| 70 | `teddy-bear` | "Founding-era marker — 2026, the year the schematic library was first catalogued. This teddy bear is from the bot fleet's first content library." |
| 140 | `macaw-statue` | "Founding-era marker — The macaw is a tropical bird, placed here to mark the south end of the old town's reach." |
| 210 | `parrot-statue` | "Founding-era marker — The parrot, companion to the macaw, marks the mid-point of the Grand Avenue." |
| 280 | `flying-eagle` | "Founding-era marker — The flying eagle is the largest of the founding-era statues, marking the visitor's approach to the city's edge." |
| 350 | `villager-statue` | "Founding-era marker — The villager statue, at the material transition between stone brick and granite-and-glass, marks the boundary between the old town era and the city era." |
| 420 | `enderman` (the "boss") | "ENTER THE CITY — The enderman is the boss of the Grand Avenue, marking the final approach to the Combined Complex." |

### 5.3 The 3 milestones

| Block | Milestone | Sign |
|---|---|---|
| 100 | "OLD TOWN 1/4 MILE" | "1/4 mile from the Cute House Plaza. The Castle District is to the east, the Temple District to the west." |
| 250 | "OLD TOWN CENTER — CUTE HOUSE PLAZA" | "Halfway. The Cute House Plaza is 250 blocks behind. The new city is 175 blocks ahead." |
| 350 | "CITY APPROACHING — STREAM CROSSING 100 m" | "The stream is 100 m ahead. The new city is 75 blocks further. Welcome to the City of the Combined Complex." |

### 5.4 The stream crossing (the bridge)

- **Position:** block 380 of the Grand Avenue.
- **Bridge dimensions:** 5-block-wide stone-brick arch over a 3-block-wide stream (the same stream that flows from the new city's ravine).
- **Railings:** oak-fence railings on both sides.
- **Sign:** "Crossing into the City of the Combined Complex" (oak sign on the bridge's south entrance).

### 5.5 Visitor experience

- **Total walking time:** ~7 minutes at standard Minecraft walking speed (4–5 m/s × 425 m = ~95–110 seconds, plus 3 minute-stops at the milestones = ~8–10 minutes).
- **Total minecart time:** ~3 minutes at full speed on a 4 m/s minecart.
- **Visual character:** the Grand Avenue is *the only paved surface in the new world*. The 425 blocks are a *gradient* of eras — stone brick for the first 350 (old-town era), granite-and-glass for the last 75 (city-era). The 6 statues and 3 milestones mark the journey's stages.

---

## 6. The Coastal-Plain Rail Spur

### 6.1 Position and dimensions (per binding Decision 5)

- **Start:** new world Gateway station at (0, 0, 700).
- **End:** city approach station at (0, 0, 70) — the south edge of the new city.
- **Length in new world:** 960 blocks (Z = 700 to Z = 70, on the X = 0 line, bypassing the old town on the east side).
- **Continuity:** the spur is interrupted at the world boundary. The new world's first rail block is at the new world Gateway (0, 0, 700); the existing world's last rail block is at the existing world Gateway (935, 60, 280). The visitor dismounts at the existing Gateway, walks through the portal, and remounts at the new world Gateway.
- **Total portal-to-portal distance:** ~960 blocks in the new world + ~700 blocks in the existing world (linear from the existing bot base at (935, 60, 300) to the existing Gateway at (935, 60, 280), then a 935-block teleport through the portal to (0, 0, 700), then 960 blocks on the rail to the city approach).
- **Cross-section:** 3 blocks total.
  - **Center:** 1-block rail (powered rail every 8 blocks, regular rail otherwise).
  - **East side:** 1-block oak-plank walkway.
  - **West side:** 1-block grass/utility strip (redstone dust runs underneath the rail ties for visibility, with redstone repeaters every 16 blocks for future signaling).
- **Gauge:** 1-block (Minecraft standard, accepted for playability per Realist's compromise in discussion Topic 5).
- **Mode:** passenger minecart, not freight. Powered rail every 8 blocks keeps the cart at full speed (no derailing).
- **Material:** smooth stone slabs (era discipline: 1970s Houston-modern, distinct from the stone-brick Grand Avenue and the granite-and-glass city).

### 6.2 The 3 named stations

| # | Station | Position | Description |
|---|---|---|---|
| 1 | **New world Gateway station** | (0, 0, 700) | Terminus, mirror of the existing-world Gateway. 7 × 7 wooden shelter (per §4.1.2). |
| 2 | **Old town station** | (0, 0, 500) | Spur into the old town center (passengers disembark to walk the Cute House Plaza and the old town clusters). The spur branches west from the main rail line at X = +50. |
| 3 | **City approach station** | (0, 0, 70) | Terminus on the city S edge, where the rail spur ends and the Grand Avenue begins. Passengers disembark to walk the Grand Avenue. Small 5 × 5 oak-plank platform with a sign "CITY APPROACH — GRAND AVENUE BEGINS HERE". |

### 6.3 Route geometry

- **Main line:** X = 0 (or X = +50 to bypass the old town), Z = 700 → 500 → 70. Straight north-south.
- **Old town bypass:** the main rail line runs at X = +50 (50 blocks east of the old town's center) from Z = 700 down to Z = 70. A short 50-block spur branches west at Z = 500 to the old town station at (0, 0, 500).
- **Bypass rationale:** the old town is pedestrian-only (per discussion Topic 5's compromise). The rail line bypasses the old town plaza to keep the old town's residential area undisturbed.

### 6.4 Era discipline

- **Material:** smooth stone slabs (1970s Houston-modern, distinct from the stone-brick Grand Avenue and the granite-and-glass city).
- **Redstone visibility:** redstone dust runs underneath the rail ties in the utility strip, with redstone repeaters every 16 blocks. The repeaters are *visible*, marking the rail as a *modern* feature.

### 6.5 Data layer

- **1 new route:** `rte_coastal_plain_rail_spur` in a new `data/routes.json` file (which doesn't exist yet in the data layer — to be created by the design team).
- **3 new station markers:** `mkr_spur_new_world_gateway` at (0, 0, 700), `mkr_spur_old_town` at (0, 0, 500), `mkr_spur_city_approach` at (0, 0, 70).
- **1 new supply chain:** a powered-rail maintenance plan in `data/supply_chains.json` (rails, powered rails, redstone, minecarts as recurring supplies).
- **Squad extension:** `sqd_svc_tunnel_maintenance` is extended to cover the rail spur (the existing 6 empty squads in `data/squads.json` are mapped to 6 named squads per discussion Topic 6 and the 04-masterplan).

---

## 7. The Underground Easter Egg

### 7.1 Position and form (per binding Decision 6)

- **Position:** (−50, 0, 550) in the new world — in the old town's coastal plain, behind a residential house, partially buried.
- **Schematic:** `underground-base.schem` (1,048 bytes, the only underground build in the entire workspace).
- **Form:** partially buried structure. The schematic is placed with its floor at Y = −3 (just below surface grade) and its roof at Y = +2. A 1-block-wide entrance at the back of a residential house, with 2–3 blocks of dirt/cobblestone above the schematic's roof.

### 7.2 The 5 elements of the easter egg

1. **The schematic itself** — `underground-base.schem` placed at (−50, −3, 550), with the schematic's natural footprint (likely 5 × 5 × 3 blocks based on file size, to be confirmed by the design team's pre-build inspection).
2. **The historical sign** — at the entrance, a sign reading "THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD IN THE WORKSPACE. IT WAS THE SEED OF THE COMBINED COMPLEX. THE SUBTROPOLIS CHAMBER IS ITS DESCENDANT." (oak sign, 4 lines).
3. **The interior chest** — a small chest inside the schematic, with a written book (the same written book from the Gateway station) and a "SubTropolis Engineer" name tag. No unique items beyond that.
4. **The pressure plate + redstone lamp** — a pressure plate at the entrance that toggles a redstone lamp inside the schematic when the player enters. The lamp provides light to the buried structure.
5. **The glass viewing window** — a 1 × 1 glass block in the floor of the old town central plaza at (0, 0, 500), with a sign explaining that the underground-base is *below*. This is the first vertical view of underground from above in the new world, foreshadowing the public shaft.

### 7.3 Pre-build requirement (per binding Decision 6)

The design team must **inspect the `underground-base.schem` file with a schematic-inspector tool before placing it** to:
- Confirm its exact footprint and contents (5 × 5 × 3 is the most likely candidate based on file size, but the design team must verify).
- Check for legacy block IDs (the file may contain blocks that no longer exist in the current Minecraft world version).
- Test the schematic in a sandbox before committing.

If the schematic has compatibility issues, fall back to a hand-built replica at the same location.

### 7.4 No additional underground easter eggs

Per binding Decision 6, there is **one, only one, underground easter egg in the new world**. The Combined Complex itself is the only new underground work; the existing library's single underground build is the only "old underground" feature. No additional underground easter eggs should be added.

### 7.5 Data layer

- **1 new marker:** `mkr_old_town_underground_easter_egg` at (−50, 0, 550).

---

## 8. Visitor Flow & Circulation

### 8.1 The full journey (60–90 minutes of focused play)

Per binding Decision 7, the full journey is:

1. **Stage 1 (Origin 2, optional):** Existing bot base (935, 60, 300) → walk to Gateway pavilion (935, 60, 280). ~30 seconds.
2. **Stage 2 (Origin 2, optional):** Step through portal → teleport to new world Gateway shelter (0, 0, 700). Instantaneous.
3. **Stage 3:** New world Gateway shelter (0, 0, 700) → rail spur ride → old town station (0, 0, 500). ~1 minute on a minecart, 200 blocks.
4. **Stage 4:** Old town station → walk through old town plaza → Cute House Plaza. ~3 minutes, ~50 blocks.
5. **Stage 5:** Cute House Plaza → Grand Avenue → SE corner of new city (60, 0, 70). ~8–10 minutes, 425 blocks (or ~3 minutes on a minecart).
6. **Stage 6:** SE corner of city → Combined Complex Transit Hub plaza (60, 0, −70). ~2 minutes, 140 blocks (city streets).
7. **Stage 7 (existing 04-masterplan):** Public shaft top (60, 0, −70) → lift descent 100 blocks → SubTropolis chamber center (0, −50, −200). ~3 minutes.
8. **Stage 8:** SubTropolis chamber → service tunnel through ravine → Cheyenne outer portal (0, 0, −420). ~5 minutes on a minecart.
9. **Stage 9 (return):** Cheyenne outer portal → portal frame (visual) → teleport to existing-world Gateway pavilion (935, 60, 280). Instantaneous.

**Total focused play time:** ~25 minutes (Origin 1 / fast path) to ~35 minutes (Origin 2 / full experience), with exploration padding bringing it to 60–90 minutes per the 04-masterplan.

### 8.2 The two origin points

- **Origin 1: New World Spawn (default, fast path).** The visitor spawns in the new world at (0, 0, 0) — the world origin, the center of the new city. They see the city skyline and the mountain range. They do *not* see the existing bot world. The map integration is *invisible* to them.
- **Origin 2: Existing Bot World (secondary visit, full experience).** The visitor starts in the existing bot base at (935, 60, 300) — a 200 × 200 surface patch in the existing world. They see the small base, the 4 active bots, the 1–2 Cute houses, and the Gateway station at the edge of camp. The map integration is *visible* — they must walk to the Gateway station, step through the portal, and travel the Grand Avenue to reach the new city.

### 8.3 The 6 named markers (from the 04-masterplan)

These are the 6 named markers the visitor can fast-travel to *after* the first descent:

1. `mkr_city_center` at (0, 0, 0) — center of the new city.
2. `mkr_public_shaft_top` at (60, 0, −70) — top of the public shaft, in the Combined Complex Transit Hub plaza.
3. `mkr_subtropolis_chamber_center` at (0, −50, −200) — center of the SubTropolis 200 × 200 chamber.
4. `mkr_cheyenne_outer_portal` at (0, 0, −420) — the 25-ton blast door at the Cheyenne outer portal.
5. `mkr_ravine_bottom` at (0, −90, −400) — at the bottom of the ravine, near the composite terrane plaque.
6. `mkr_old_town_center` at (0, 0, 500) — center of the old town, at the Cute House Plaza.

### 8.4 The fast travel rule

Per binding Decision 7, **fast travel is only available *after* the first descent**. On the first descent, the visitor must walk the journey. After the first descent, the visitor can `/tp` to any of the 6 named markers via a command-block menu or a fast-travel datapack.

### 8.5 The return shortcut

Per binding Decision 7, **a single portal frame at the Cheyenne outer portal** takes the visitor back to the existing-world Gateway pavilion. The portal is *visual* (obsidian-and-glowstone frame) but the transit is a `/tp` command block.

### 8.6 Data layer (per binding Decision 7)

- **1 new named route:** `rte_visitor_journey_full` in `data/routes.json` (covers the full 6-marker descent).
- **1 new return portal marker:** `mkr_cheyenne_return_portal` at (0, 0, −420).
- **6 markers already specified** (Topic 5 + 04-masterplan) are the fast-travel destinations.

---

## 9. Map Integration Coordination

### 9.1 Cross-references to the 4 individual site master plans and the Combined Complex master plan

| Master plan | What it owns | What the map integration adds |
|---|---|---|
| **01-cheyenne-mountain-complex** | Chamber geometry, spring layout, J-curve internal detail | The 25-ton blast door at the outer portal (already in 04-masterplan, but the map integration confirms the *return portal* at the same location). |
| **02-subtropolis** | Chamber geometry, pillar grid | The 5 × 5 spec is preserved as the public shaft lift core (the 7 × 7 is the architectural envelope). |
| **03-houston-tunnel-system** | 24-block sample at the NE corner of the city | The combined complex adds the public shaft buffer block in the SE corner (already flagged in 03-masterplan) and the T-marker at the public shaft entrance. |
| **04-combined-complex** | World origin, city footprint, mountain range, public shaft, service tunnel | The map integration adds the old town (Z = 300–700), the coastal-plain rail spur (X = 0, Z = 70–700), the Gateway station (0, 0, 700), the Grand Avenue (X = 0, Z = 70–500), the underground easter egg (−50, 0, 550), and the return portal at (0, 0, −420). |
| **Map integration (this document)** | Old town, Gateway station, Grand Avenue, rail spur, underground easter egg, visitor flow | The map integration is the *approach infrastructure* for the combined complex. The 4 master plans describe the *interior*; the map integration describes the *approach*. |

### 9.2 The Gateway portal coordinates must match the 04-masterplan's combined complex

- **New world Gateway:** (0, 0, 700) — on the new world's southern coastal plain, at the south edge of the 1,500 × 1,500 world (the world extends to Z = +750, so 700 is 50 blocks inside the edge).
- **Existing world Gateway:** (935, 60, 280) — in the existing world, 3 blocks south of the existing bot base.
- **Cross-reference:** the 04-masterplan's `coastal_plain_south_edge` at (0, 0, 700) and the new world Gateway are at the *same* coordinates. The 04-masterplan already defines this point as the south edge of the world; the map integration names it the Gateway station.

### 9.3 The old town coordinates must not conflict with the 04-masterplan's coastal plain

- **Old town footprint:** X = −300 to +300, Z = 300 to 700.
- **04-masterplan coastal plain:** X = −750 to +750, Z = +70 to +750.
- **Conflict check:** the old town is *within* the 04-masterplan's coastal plain (it sits on the southern half of the coastal plain, between the city and the world edge). The old town's 600 × 400 footprint fits in the 04-masterplan's 1,500 × 680 coastal-plain zone without conflict. The old town is *adjacent to* but not *overlapping with* the 04-masterplan's specified coastal-plain highway (which runs along the south edge at Z = +700).

### 9.4 The 6 named markers (combined complex journey) must be preserved

The 6 named markers from the 04-masterplan (`mkr_city_center`, `mkr_public_shaft_top`, `mkr_subtropolis_chamber_center`, `mkr_cheyenne_outer_portal`, `mkr_ravine_bottom`, `mkr_old_town_center`) are preserved. The map integration adds 8 new markers but does *not* modify or remove the 6 from the 04-masterplan.

---

## 10. Site Coordinates (the Master Coordinate Table)

### 10.1 World origins and major extents

| Location | X | Y | Z | World | Description |
|---|---|---|---|---|---|
| New world origin | 0 | 0 | 0 | New | Center of the new city, at street grade. World origin per 04-masterplan. |
| New world extent (X) | −750 to +750 | — | — | New | World footprint 1,500 × 1,500. |
| New world extent (Z) | — | — | −750 to +750 | New | World footprint 1,500 × 1,500. |
| New world extent (Y) | — | −100 to +800 | — | New | Vertical extent; Y = 0 is city surface, Y = 800 is granite peak summit. |
| Existing bot world bot base | 935 | 60 | 300 | Existing | Center of the existing bot base, where the 4 active bots (Lilly, Taylor, Marcus, Hazel) operate. |
| Existing bot base extent (approx.) | 800 to 995 | 50 to 71 | 220 to 380 | Existing | ~200 × 200 explored area. |

### 10.2 The old town (7 clusters)

| Cluster | X | Y | Z | Notes |
|---|---|---|---|---|
| Old town bounding box | −300 to +300 | 0 to +6 | 300 to 700 | 600 × 400, 2-floor height cap. |
| Old town center | 0 | 0 | 500 | Center of the 600 × 400 district. |
| Cute House Plaza (founding plaza) | 0 | 0 | 450 | 10 × 10 stone-brick plaza, with the 2 Cute houses. |
| Residential cluster | 0 | 0 | 480 | 10 small houses + 2 Cute anchors + 1 victorian palace. |
| Castle / fortress cluster | 200 | 0 | 500 | 3 castles / fortresses on a low hill. |
| Temple cluster | −200 | 0 | 500 | 3 temples on a low hill. |
| Statue / ornament cluster (in old town) | 0 | 0 | 600 | 4 statues (`stone-statue`, `dragon-egg`, `giant-skull`, `snowman`). |
| Theme park cluster (Space Mountain) | 100 | 0 | 600 | `Disneyland Space Mountain.schem` at native scale. |
| Underground easter egg | −50 | −3 to +2 | 550 | `underground-base.schem`, partially buried, 1-block entrance at the back of a residential house. |
| Glass viewing window (over the easter egg) | 0 | 0 | 500 | 1 × 1 glass block in the floor of the old town central plaza, with a sign. |

### 10.3 The Gateway station

| Location | X | Y | Z | World | Description |
|---|---|---|---|---|---|
| Existing-world Gateway pavilion | 935 | 60 | 280 | Existing | 7 × 7 stone-brick pavilion with obsidian portal frame. |
| New-world Gateway shelter | 0 | 0 | 700 | New | 7 × 7 wooden shelter with obsidian portal frame. |

### 10.4 The Grand Avenue

| Point | X | Y | Z | Description |
|---|---|---|---|---|
| Start (Cute House Plaza) | 0 | 0 | 500 | At the Cute House Plaza, north end of the old town center. |
| Milestone 1 (block 100) | 0 | 0 | 400 | "OLD TOWN 1/4 MILE" sign. |
| Midpoint (block 212, statue at block 210) | 0 | 0 | 290 | `parrot-statue` at block 210. |
| Milestone 2 (block 250) | 0 | 0 | 250 | "OLD TOWN CENTER — CUTE HOUSE PLAZA" sign. |
| Milestone 3 (block 350) | 0 | 0 | 150 | "CITY APPROACHING — STREAM CROSSING 100 m" sign. |
| Stream crossing (block 380) | 0 | 0 | 120 | 5-block-wide stone-brick bridge. |
| End (SE corner of new city) | 60 | 0 | 70 | 425 blocks total, granite-and-glass for the last 75 blocks. |

### 10.5 The coastal-plain rail spur

| Point | X | Y | Z | Description |
|---|---|---|---|---|
| New world Gateway station | 0 | 0 | 700 | Terminus, mirror of the existing-world Gateway. |
| Old town station (spur) | 0 | 0 | 500 | Spur into the old town center, 50-block branch west from the main line at X = +50. |
| City approach station | 0 | 0 | 70 | Terminus on the city S edge. |
| Total length (in new world) | — | — | — | 960 blocks (Z = 700 to Z = 70), bypass at X = +50, spur at X = 0. |

### 10.6 The underground easter egg

| Element | X | Y | Z | Description |
|---|---|---|---|---|
| Schematic placement | −50 | −3 to +2 | 550 | `underground-base.schem`, floor at Y = −3, roof at Y = +2. |
| Entrance | −50 | 0 | 552 | 1-block-wide entrance at the back of a residential house. |
| Historical sign | −51 | 1 | 552 | "THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD..." |
| Glass viewing window | 0 | 0 | 500 | 1 × 1 glass block in the floor of the old town central plaza. |
| Marker (data layer) | −50 | 0 | 550 | `mkr_old_town_underground_easter_egg`. |

### 10.7 The 6 named markers (combined complex journey, from 04-masterplan)

| Marker | X | Y | Z | Description |
|---|---|---|---|---|
| `mkr_city_center` | 0 | 0 | 0 | Center of the new city. World origin. |
| `mkr_public_shaft_top` | 60 | 0 | −70 | NE corner of the city, Combined Complex Transit Hub plaza. |
| `mkr_subtropolis_chamber_center` | 0 | −50 | −200 | Center of the SubTropolis 200 × 200 chamber. |
| `mkr_cheyenne_outer_portal` | 0 | 0 | −420 | 25-ton blast door at the Cheyenne outer portal. |
| `mkr_ravine_bottom` | 0 | −90 | −400 | At the bottom of the ravine, near the composite terrane plaque. |
| `mkr_old_town_center` | 0 | 0 | 500 | Center of the old town, at the Cute House Plaza. |

### 10.8 The 8 new markers (added by map integration)

| Marker | X | Y | Z | Description |
|---|---|---|---|---|
| `mkr_gateway_existing_world` | 935 | 60 | 280 | Existing-world Gateway pavilion. |
| `mkr_gateway_new_world` | 0 | 0 | 700 | New-world Gateway shelter. |
| `mkr_spur_new_world_gateway` | 0 | 0 | 700 | New-world Gateway station. |
| `mkr_spur_old_town` | 0 | 0 | 500 | Old town station on the rail spur. |
| `mkr_spur_city_approach` | 0 | 0 | 70 | City approach station on the rail spur. |
| `mkr_grand_avenue_center` | 0 | 0 | 285 | Center of the Grand Avenue (block 215 of 425). |
| `mkr_old_town_underground_easter_egg` | −50 | 0 | 550 | The underground-base.schem easter egg. |
| `mkr_cheyenne_return_portal` | 0 | 0 | −420 | Return portal frame at the Cheyenne outer portal. |

### 10.9 Internal connections (inherited from 04-masterplan, for reference)

| Connection | From | To | Cross-section | Length | Mode |
|---|---|---|---|---|---|
| **Public shaft** | (60, 0, −70) | (60, −100, −100) | 7 × 7 | 100 blocks | Mechanical lift + visible emergency stair |
| **Service tunnel** | (−100, 0, −300) | (0, 0, −420) | 6 × 6 | 80–120 blocks | Minecart rail |
| **Coastal-plain rail spur** | (0, 0, 700) | (0, 0, 70) | 3 × 1 (1 rail + 1 walkway + 1 utility) | 960 blocks | Passenger minecart |
| **Grand Avenue** | (0, 0, 500) | (60, 0, 70) | 8 × 1 (4 road + 2 sidewalk each side) | 425 blocks | Walk or minecart |
| **Gateway portal** | (935, 60, 280) | (0, 0, 700) | 4 × 5 obsidian frame (visual) | Instantaneous | `/tp` command block |

---

## 11. Materials & Block Palette (Integration-Level)

### 11.1 Existing world palette (vestibule)

- **Bot base:** mossy cobblestone, oak fence, dirt path, the existing bot base's "starter" aesthetic.
- **Gateway pavilion:** stone brick floor + walls, light gray stained glass roof, obsidian-and-glowstone portal frame, oak signs, oak lectern, oak fence + oak slabs bench.
- **Tone:** ad-hoc, lived-in, organic. The existing world is *not* a designed world; it is a *grown* world.

### 11.2 New world Gateway palette

- **Shelter:** oak plank walls, oak slab roof, stone brick floor, obsidian-and-glowstone portal frame, oak signs.
- **Tone:** transitional. The wooden shelter is the *first* structure in the new world; it is intentionally less monumental than the city's granite-and-glass, more welcoming than the existing world's starter.

### 11.3 Old town palette (historical layer)

- **Materials:** the existing schematic library's *native* materials — birch, oak, jungle, spruce, dark oak, stone, cobblestone, terracotta, glass, wool.
- **Tone:** legacy, recognisable, retrospective. Visually heterogeneous. A 245-byte cottage next to a 38 KB Cute house next to a 58 KB Space Mountain.
- **Roads:** packed dirt with cobblestone edges.
- **Plaza surface:** stone brick (the only paved surface in the old town), 10 × 10 blocks at the Cute House Plaza.
- **Sign material:** oak signs on oak fence posts.

### 11.4 Grand Avenue palette (the connection)

- **Surface (blocks 0–350):** stone brick (matching the old town's plaza).
- **Surface (blocks 350–425):** granite-and-glass (matching the city's skybridges).
- **Sidewalks:** oak plank, raised 1 block above the road.
- **Planters:** none (per the panel's cut from the research recommendation).
- **Statues:** the 10 re-placed schematics at their native materials.
- **Milestones:** oak signs on oak fence posts.
- **Bridge:** stone brick, 5 blocks wide, with oak-fence railings.
- **Tone:** civic, committed, intentional. The Grand Avenue is *the one* paved surface in the new world. It says *this is the new world, and the new world is committed*.

### 11.5 Coastal-plain rail spur palette (the logistics layer)

- **Surface:** smooth stone slabs (era discipline: 1970s Houston-modern, distinct from stone-brick Grand Avenue and granite-and-glass city).
- **Rail:** regular rail with powered rail every 8 blocks.
- **Walkway:** oak planks (east side).
- **Utility strip:** grass (west side), with redstone dust under the rail ties and redstone repeaters every 16 blocks.
- **Stations:** oak-plank platforms, oak signs.
- **Tone:** logistics, not civic. The rail spur is a *transit* feature, not a *picturesque* one.

### 11.6 New city palette (inherited from 04-masterplan)

- Concrete-gray, glass-blue, steel-gray, the city's weather, sun-bleached, hot. T-marker red on white at the curb. Skybridge glass.
- **Tone:** busy, daylit, climate-hostile, retail, civilian, 1970s. Inherited from the 04-masterplan, not modified by the map integration.

### 11.7 Combined complex palette (inherited from 04-masterplan)

- Public shaft: cool blue/gray to cream/limestone gradient over 100 blocks.
- SubTropolis chamber: cream/limestone with white-painted pillars, channel-letter tenant signs, asphalt roads.
- Service tunnel: cream/limestone to pink-granite gradient over 120 blocks.
- Cheyenne chamber: pink-granite, bare-rock walls, fluorescent light.
- **All inherited from the 04-masterplan, not modified by the map integration.**

### 11.8 Transition zones (the gradients)

The map integration has *three* transition zones:

- **The Gateway station (existing → new world):** mossy cobblestone (existing) → oak plank + stone brick (new). The portal frame is the *literal* transition; the materials on either side are different.
- **The Grand Avenue (old town → new city):** packed dirt (old town) → stone brick (Grand Avenue) → concrete (new city). The 425 blocks of the Grand Avenue are a *gradient*: the first 350 blocks are stone brick, the last 75 are granite-and-glass. The transition is *slow* and *intentional*.
- **The stream-crossing bridge (Grand Avenue → new city):** stone brick (Grand Avenue) → stone bridge (the bridge itself) → concrete (new city). The bridge is the *literal* crossing; the materials on either side are different.

---

## 12. Scale Verification

### 12.1 Footprint check

| Element | Footprint | Within world? | Notes |
|---|---|---|---|
| New world | 1,500 × 1,500 | — | World origin (0, 0, 0), extends −750 to +750 in X and Z. |
| Existing bot world (explored) | 200 × 200 | — | At (800–995, 50–71, 220–380). |
| Old town | 600 × 400 | Yes (Z = 300–700, within Z = −750 to +750) | 600 × 400 fits in the 1,500 × 1,500 world. |
| Grand Avenue | 425 × 8 | Yes | 425 blocks long, 8 blocks wide. |
| Coastal-plain rail spur | 960 × 3 | Yes | 960 blocks long, 3 blocks wide. |
| City (inherited) | 138 × 138 | Yes | At (−69, 0, −69) to (69, 80, 69). |
| Mountain range (inherited) | 800 × 600 | Yes | At (−300, 0, −700) to (300, 800, −100). |
| SubTropolis chamber (inherited) | 200 × 200 × 100 | Yes | At (−100, −100, −300) to (100, 0, −100). |
| Cheyenne chamber (inherited) | ~80 × 80 × 150 | Yes | At (−40, 250, −580) to (40, 400, −500). |

### 12.2 Length check

| Element | Length | Real-world analogue | Notes |
|---|---|---|---|
| Grand Avenue | 425 blocks | Champs-Élysées (1.9 km), Unter den Linden (1.5 km) | The Grand Avenue is 425 m, ~25% of the Champs-Élysées. |
| Coastal-plain rail spur (new world) | 960 blocks | — | 960 m is a 5–7 minute minecart ride. |
| Existing-world rail segment | ~700 blocks (linear) | — | 700 m from the existing bot base to the existing Gateway. |
| Public shaft (inherited) | 100 blocks | — | 100 m vertical descent. |
| Service tunnel (inherited) | 80–120 blocks | — | 80–120 m horizontal minecart ride. |
| Funicular (inherited) | 830 blocks | — | 830 m climb to the granite summit. |
| Skybridge (inherited) | 340 blocks | — | 340 m crossing at Y = 500–700. |
| Paved road (inherited) | 450 blocks | — | 450 m descent from limestone summit to city. |
| **Total 6-stage inbound journey** | ~2,000+ blocks | — | New world 1,500 m + descent + return. |
| **Total 60–90 min focused play** | — | — | 25–35 min of active movement + 25–55 min of exploration padding. |

### 12.3 Build height check

| World | Required build height | Recommended mod |
|---|---|---|
| New world | 1,024+ | CubicWorld 2,048 (recommended) |
| Existing bot world | 384 (vanilla) | None (vanilla) |

The new world requires 1,024+ build height to host the granite peak (Y = 800) plus the SubTropolis chamber (Y = −100) within the 800-block vertical extent (Y = −100 to Y = +800 = 900 blocks). CubicWorld 2,048 is recommended to give headroom.

### 12.4 Block budget (rough estimate)

| Element | Block budget (rough) | Notes |
|---|---|---|
| Old town (30–35 schematics) | ~5,000–15,000 | Mostly re-placed schematics, ~150–500 blocks per schematic. |
| Gateway pavilions (2 × 7 × 7 × 5) | ~500 | Small, two matching pavilions. |
| Grand Avenue (425 × 8 × 1) | ~3,400 | 425 blocks × 8 cross-section × 1 block thick. |
| Coastal-plain rail spur (960 × 3 × 1) | ~2,900 | 960 blocks × 3 cross-section × 1 block thick. |
| Underground easter egg | ~75 | The 5 × 5 × 3 schematic + sign + glass window. |
| **Total new infrastructure (map integration)** | **~12,000–22,000 blocks** | Small relative to the 3.5M block total for the combined complex. |

---

## 13. Open Questions for the Architectural Designer / User

The following questions are not decided at the site level and must be resolved by the architectural designer (downstream) or the user (architectural decisions). They are flagged here for visibility.

### 13.1 Open question — the world-transit mechanism

Per discussion Topic 3, the Gateway portal is *visual* (obsidian frame) but the *transit* is a `/tp` command block (or a separate "world-portal" datapack if the bot team has one). **Does the bot team have a world-portal datapack, or should the design team implement the `/tp` command block manually?** A `/tp` command block is the simplest solution, but a world-portal datapack is more elegant. This is the bot team's call.

### 13.2 Open question — the schematic inspector

Per binding Decision 6, the design team must **inspect the `underground-base.schem` file with a schematic-inspector tool before placing it**. **Is there a schematic-inspector tool already in the workspace, or does the design team need to build one?** The `.schem` format is gzipped NBT; a simple Python or Node.js script can parse it.

### 13.3 Open question — the legacy block ID risk

Per binding Decision 6, the `underground-base.schem` may contain blocks that no longer exist in the current Minecraft world version. **Is there a sandbox world available, or should the design team create one?** The existing bot world is a *production* world; testing in it is not safe.

### 13.4 Open question — the new world's spawn point

The 04-masterplan specifies world origin (0, 0, 0), but Minecraft's default spawn for a new world depends on the world type (superflat, default, amplified, etc.). **Should the new world be a superflat world (clean, predictable) or a default world (with terrain generation, biomes, etc.)?** The combined complex requires *specific* terrain (mountain range, ravine, coastal plain), so a default world may be more flexible. But a superflat world is easier to manage. The map integration is *agnostic* on this; the design team should pick.

### 13.5 Open question — the existing world's relationship to the new world after the integration

Per discussion Topic 1, the 4 active bots (Lilly, Taylor, Marcus, Hazel) stay in the existing world. **Should the bots be migrated to the new world, or should they remain in the existing world as a "remote outpost"?** Migrating the bots is a *significant* data-layer operation (the bots' stats, missions, blackboard reservations, affinities would all need to be re-targeted to the new world). The map integration's default is "active, but secondary" — bots stay in the existing world, the new world is the player experience. The user should confirm.

### 13.6 Open question — the existing-world return path

The return portal at the Cheyenne outer portal takes the visitor to the existing-world Gateway pavilion. After that, the visitor is *in* the existing world, in the bot base. **Is the existing world a "returnable lobby" (the visitor can step back through the portal at any time), a "one-way vestibule" (the portal closes behind them), or a "bidirectional with side effects" (the world has evolved while they were gone)?** The map integration's default is "returnable lobby" (the visitor can return to the existing world at any time). The user should confirm.

### 13.7 Open question — the old town's era discipline and the Space Mountain

The Space Mountain is 58 KB and may exceed the 2-floor height cap when placed at native scale. **Should the design team *clip* the Space Mountain to fit the 2-floor cap, *frame* it with hedges to mask the height, or *relax* the cap for this one build?** The panel's compromise was to keep the Space Mountain as the old town's tourist attraction; the height-cap issue was not resolved. The architectural designer should decide.

### 13.8 Open question — the data layer creation

The `data/routes.json` and `data/supply_chains.json` files do not currently exist in the data layer. **Should the design team create them, or should the bot team?** The map integration's default is "design team creates the file shells; bot team populates them with the named routes and supply chains." The user should confirm.

### 13.9 Conflicts found with the deliberation's binding decisions

**No conflicts found.** All 7 binding decisions are respected:
- Decision 1 (new world): reflected in §1, §2, §10.
- Decision 2 (old town composition): reflected in §3.
- Decision 3 (Gateway station): reflected in §4.
- Decision 4 (Grand Avenue): reflected in §5.
- Decision 5 (rail spur): reflected in §6.
- Decision 6 (underground easter egg): reflected in §7.
- Decision 7 (visitor journey): reflected in §8.

**One small tension noted** (not a conflict): the culture-architecture-analysis.md §3.5 and §8.5 describe the Grand Avenue as 4-block-wide with 1-block sidewalks and 1-block planters (total ~8 blocks), but the binding Decision 4 specifies the cross-section as 8 blocks total (4 road + 2 sidewalk each side, no planters). The binding Decision 4 takes precedence — the Grand Avenue is 8 blocks total, with no planters. The architectural designer should *not* add planters.

---

**End of site plan.** This document is the macro site design for the map integration. The 13 sections specify the world layout, the old town, the Gateway station, the Grand Avenue, the coastal-plain rail spur, the underground easter egg, the visitor flow, the master coordinate table, the materials palette, the scale verification, and the open questions. The 7 binding decisions in `discussion-notes.md` are respected. The architectural designer should now proceed to detailed building design using this site plan as the macro context.
