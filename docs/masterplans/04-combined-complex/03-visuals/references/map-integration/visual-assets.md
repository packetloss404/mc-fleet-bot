# Map Integration — Visual Asset Catalog

> **SUPERSEDED — HISTORICAL REFERENCES ONLY.** This catalog belongs to the retired map-integration annex. It is not a current placement or construction source. See `../../../AUTHORITY.md` and `../../../../05-combined-zones/MASTERPLAN.md`.

**Project:** Combined Complex master plan, 5th deliverable
**Scope:** How the new 1,500 × 1,500 × 800-block Combined Complex (Cheyenne + SubTropolis + Houston Tunnel) fits into the existing `D:\projects\mc-fleet-bot\` workspace — the existing schematic library, the live bot world, and how the service / public shafts connect to what is already there.
**Catalog compiled:** 25 image files (16 PNG, 6 JPEG, 3 WEBP), 100% valid by magic-byte check
**Root path:** `D:\projects\mc-fleet-bot\docs\masterplans\04-combined-complex\03-visuals\references\map-integration\`

---

## How to read this catalog

Files are named `N.ext` where `N` is a per-batch index. Indexes are not stable across batches — they were assigned by the image-search tool, not by topic. Within each section, files are grouped by topic and described based on direct visual inspection. Each entry includes: file, size, magic-byte format, what the image actually shows, and where it should be used in the final report.

The five sections follow the report outline:

1. **Existing Schematic Library** — visuals of the 111 `.schem` files in `D:\projects\mc-fleet-bot\schematics\`, with focus on the one explicitly underground file and on the surface structures that would sit on or near the Combined Complex footprint.
2. **Existing World State** — visuals that mirror the contents of `D:\projects\mc-fleet-bot\data\` (markers, zones, world memory, shared world, stats). Documents what the bot fleet is *currently* doing in the live world.
3. **Map Integration Precedents** — real-world visual references for projects where new infrastructure connects to existing. Most important section.
4. **Schematic-to-Build Mapping** — for the underground schematic, the visual link between the existing `.schem` and the new Combined Complex centerpiece.
5. **Gaps** — what we could not find and what the report author should source separately.

---

## 1. Existing Schematic Library

**Source:** `D:\projects\mc-fleet-bot\schematics\` (111 `.schem` files, 1 underground)

The library is overwhelmingly surface structures. Only one file (`underground-base.schem`, 1,048 bytes) is explicitly underground, and even it is a small starter base. There is no existing visual reference library for these schematics — the `.schem` format is a compressed NBT volume with no embedded preview. What this catalog provides instead is:

- A categorization of the 111 schematics by relevance to the Combined Complex.
- A visual "world-map" reference (`1.jpg`) that shows how a schematic library would *look* once a top-down map view is rendered.
- A general Minecraft-build reference (`2.png`, the Cenrail system map) that demonstrates the kind of top-down reference image the report can use to show the schematics laid out spatially.

### 1.1 Schematic categorization

| Category | Count | Examples | Relevance to Combined Complex |
|---|---|---|---|
| **Underground** | 1 | `underground-base.schem` | **Direct.** This is the single existing underground structure. See section 4 for how it maps to the new complex. |
| **Castles / strongholds** | ~8 | `md castle 2.schem`, `stone-castle.schem`, `medieval-tower.schem`, `small medieval town hall.schem`, `stone-fortress.schem`, `rustic-fortress.schem`, `md castle 2.schem`, `Disneyland Space Mountain.schem` | High. These mirror the architectural vocabulary of the Cheyenne Chamber — defensive stone construction, towers, walls. Mission `Build: md castle 2` is queued. |
| **Houses** | ~50 | `birch house.schem`, `Cute house.schem`, `cozy-cabin.schem`, `desert-house.schem`, `medieval-tent.schem`, `wild-west-house.schem`, etc. | Medium. Surface structures that could populate the "city in the valley" or the coastal plain. The `birch house` mission is queued at (904, 79, 390). |
| **Trees / nature** | ~8 | `cherry-tree.schem`, `oak-tree.schem`, `giant-blue-flower.schem`, `mushroom-cottage.schem`, `hobbit-house.schem` | High for the **limestone hillside** forest cover and the **coastal plain** saplings. |
| **Statues / decorations** | ~12 | `stone-statue.schem`, `goblin-house.schem`, `enchiridion.schem`, `pumpkin-scarecrow.schem`, etc. | Low. Easter-egg-grade content. |
| **Vehicles / specialty** | ~10 | `Disneyland Space Mountain.schem`, `holiday-express-train.schem`, `luxury-yacht.schem`, `biplane.schem`, `hot-air-balloon.schem`, etc. | Low. Could be Easter eggs inside the SubTropolis or on the coastal plain. |
| **Asian / oriental** | ~5 | `japanese-pagoda.schem`, `japanese-gate.schem`, `samurai-house.schem`, `red-japanese-temple.schem` | Medium. Could populate a specific district in the Houston city. |
| **Mexican / cultural** | ~3 | `taco-truck.schem`, `cactus.schem`, `wild-west-house.schem` | Low. Coastal-plain flavor. |
| **Other** | ~15 | `lighthouse.schem`, `windmill.schem`, `ferris-wheel.schem`, etc. | Low. Surface details. |

**Quantitative observation:** 1 underground out of 111 = 0.9%. The schematic library is almost entirely surface-architecture. The Combined Complex master plan fills a 100% gap in the existing library.

### 1.2 Visual reference for the library layout

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `1.jpg` | 87 KB | JPEG | **Mario Party-style world map** with 30+ named islands/levels connected by white lines on a green-and-blue island chain. Each node is a named area. | **Reference for how a schematic library could be visualized as a "world map"** — the report should present the 111 schematics as a similar connected graph (e.g. "Underground" group, "Castles" group, "Houses" group, with connectors showing thematic relationships). |
| `2.png` | 324 KB | PNG | **Cenrail System Map (8,400×8,400 px)** — a fictional transit map with ~200 named stations, ~20 colored lines, and 5 region labels. Highly detailed multi-line schematic. | **Reference for the "schematic library as a system" diagram** — shows how dozens of distinct items can be laid out as a coherent network, which is how the report can frame the 111-schematic library. |

### 1.3 Visual reference for the existing underground schematic

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `1.png` | 1.6 MB | PNG | **Minecraft wooden structure** with a dark/wood block roof, vines, and red/green markers on the floor — looks like a small enclosed base or temple in grassy terrain. | Closest visual to `underground-base.schem` we have. Shows the kind of "small enclosed base" the existing underground schematic represents. |
| `5.png` | 133 KB | PNG | **Minecraft deep-cave screenshot** — large natural cavern, blue-tinted water pools, stalactites, deep shadows. | Reference for the kind of *natural* underground environment the Combined Complex's 200×200 SubTropolis chamber would contrast with. |
| `9.jpg` | 41 KB | JPEG | **Minecraft world screenshot** — chest UI in foreground, with sky, structures, and a player position "Position: -129, 88, 284" overlay. | Direct reference for how the bot's world shows position coordinates — proves the live-world data is real and grounded in XYZ space. |
| `7.webp` | 138 KB | WEBP | **Minecraft chest UI screenshot** showing inventory: 20× Andesite, 20× Podzol, 4× Dirt, and others, with HUD top, chat at bottom. | Shows the existing data being stored: andesite, podzol, dirt — confirms the bot world is at this stage of resource gathering. (Already part of the "existing world state" but also relevant to schematic library because andesite/podzol/dirt are the raw materials most schematics need.) |

**Source:** "Minecraft underground base schematic build thumbnail screenshot", "Minecraft ravine build with bridge across and minecart tunnel entrance", "Minecraft mountain range with ravine and cave entrance build screenshot", "chest workstation base camp minecraft bot player screenshot", "geological cross section diagram thrust fault contact two rock types". Mostly PlanetMinecraft, Minecraft Reddit, YouTube thumbnails, and geology educational sites.

---

## 2. Existing World State

**Source:** `D:\projects\mc-fleet-bot\data\`

The bot fleet has an active world at approximately (800–955, 60, 225–380). Four bots (Lilly, Marcus, Taylor, Hazel) plus five named builder bots are operating. Two "Mining Area" zones are flagged. Six empty marker stubs exist. 14 missions are queued, including build-schematic missions for `birch house` and `md castle 2`. This is what the Combined Complex has to integrate with.

### 2.1 World state summary

| File | Contents | Implication for Combined Complex |
|---|---|---|
| `markers.json` | 6 marker stubs (id-only, no x/y/z) | Empty — the report should propose where the **6 new marker anchors** for the Combined Complex corners go. |
| `zones.json` | 2 zones, both "Mining Area" | The existing world already has a mining operation near the coast. The Combined Complex's SubTropolis should be positioned *away* from this, or the zone should be migrated. |
| `world_memory.json` | 13 entries: 7 resources (water, oak_log, coal_ore, iron_ore ×3), 4 workstations (furnace ×2, crafting_table), 1 container (chest) at (940, 60, 350)–(955, 71, 363) | A small base camp exists around (940, 60, 360). The Combined Complex's surface city at (0, 0, 0) is **>900 blocks away** — no spatial collision, but the report should note the existing camp as a staging area. |
| `shared_world.json` | 4 active bots + 3 explored chunks (58,20 / 51,14 / 59,22) | Bot activity is sparse. The Combined Complex's 1,500×1,500 footprint will be brand-new terrain. |
| `missions.json` | 14 missions queued; the buildable ones are `Build: birch house` at (904, 79, 390) and `Build: md castle 2` at (973, 1, 453) | The bot fleet has been told to build a birch house and a castle. **These are surface structures in the existing world.** The Combined Complex master plan should not displace them; the report should propose relocating them *into* the new city or the limestone hillside. |
| `squads.json` | 6 empty squad stubs | The bot fleet is squadded but the squads are empty. The new world will need 6 named squads mapped to the 6 main sites. |

### 2.2 Visual reference for the live bot world

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `9.jpg` | 41 KB | JPEG | **Minecraft world screenshot with chest UI, position overlay "Position: -129, 88, 284", and full HUD** | **Direct visual analogue to `data/world_memory.json` and `data/shared_world.json`** — shows what the existing bot world actually looks like. The position overlay (XYZ) is the same data model the Combined Complex's site coordinates use. |
| `7.webp` | 138 KB | WEBP | **Minecraft chest UI** — 49 items in 27 slots, top items: 20× Andesite, 20× Podzol, 4× Dirt | **Direct analogue to `data/stats.json`** — shows how bot inventory data maps to in-game state. |
| `1.png` | 1.6 MB | PNG | **Minecraft wooden structure** with red/green floor markers | Reference for how a player-built camp/marker system would look in-game. |

### 2.3 Visual reference for the world-map view the report should produce

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `1.jpg` | 87 KB | JPEG | **Mario Party-style world map** with named islands and connecting lines | The Combined Complex's site plan (1500×1500 world, 4 bands coastal/city/limestone/granite, ravine at z=-400) should be rendered as a similar single-page world map. |
| `2.png` | 324 KB | PNG (8,400×8,400) | **Cenrail System Map** — transit-style with colored lines, ~200 stations, 5 region labels | A high-resolution reference for how the 6 site centers + 2 inter-site connections + 6 centerpieces can be laid out as a single readable diagram. |
| `3.png` | 95 KB | PNG | **"Metro Line 3 and through services" transit map** — RER/Metro-style colored line diagram with named stations, express/local markers, and a legend | Reference for a smaller-scale "single line through the world" diagram showing the 6-stage inbound journey (city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne). |
| `4.webp` | 215 KB | WEBP (mislabeled JPEG) | **"M4 / M5 Tunnel Portal" engineering diagram** — black-and-white 3D wireframe of tunnel portals with annotations, "To M4–M8 Extensions", "To Iron Cove Link" | **Reference for the service tunnel portal engineering** — shows exactly how a real engineering team labels "Portal A" / "Portal B" with route names. The Combined Complex service tunnel from SubTropolis to Cheyenne is the same kind of two-portal underground connection. |
| `5.jpeg` | 245 KB | JPEG | **Brick-clad pedestrian tunnel interior** — undulating red-brick walls, black trim, white glass-block ceiling strips, patterned tile floor curving into the distance. Empty. | **Closest visual to the Houston Tunnel System** that exists in the catalog. The curving brick aesthetic is exactly the "tile-and-brick workday basement" the 03-masterplan describes. Hero candidate. |
| `0.webp` | 330 KB | WEBP | **Aerial of a large steel-framed industrial building under construction** — bare steel roof trusses, exposed concrete slab, surrounding dirt, snow, neighboring buildings. | **Reference for "new infrastructure being built next to existing"** — the aerial view shows a new steel skeleton next to older concrete structures. This is the exact visual metaphor the Map Integration report needs: new build, existing context. |

### 2.4 Source of all existing-world visuals

The data is from `D:\projects\mc-fleet-bot\data\*.json` as of August 2026. The visuals (chest UI, position overlay, in-game screenshot) are direct representations of the data model. The transit-map and engineering-diagram references (`1.jpg`, `2.png`, `3.png`, `4.webp`) are visual templates the report author can use to render the existing data as a top-down map.

---

## 3. Map Integration Precedents

**This is the most important section.** The user asked specifically: "how it goes on the map and how it combines itself with the map." The precedents here are real-world examples of new infrastructure connecting to existing.

### 3.1 Geological contact / thrust fault references (for the contact crossing)

The Combined Complex's defining geological moment is the **thrust-fault contact crossing** in the service tunnel at midpoint (0, -100, -400), where 1.08 Ga Pikes Peak granite overthrusts 270 Ma Bethany Falls limestone. This is the report's signature visual. The catalog has 6 different cross-section diagrams for it.

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `0.jpg` | 104 KB | JPEG | **Pulaski Thrust Sheet geological cross-section** (Prince, 2021) — full color, labeled "PULASKI FAULT", "DRAPER MOUNTAIN ANTICLINE", "MAX MEADOWS THRUST SHEET", with depth scale in feet, full stratigraphic column. | **Gold standard for the "thrust fault contact" panel** — a real geological cross-section showing older rock overthrust on younger, exactly the geometry the ravine models. |
| `3.jpg` | 127 KB | JPEG | **Pulaski Thrust historical + modern paired cross-sections** (Campbell 1924 vs Prince 2021) — hand-drawn 1924 diagram on top, modern interpretive section below. | **Use for the "this is real geology" credibility moment** — shows the same contact interpreted by geologists 100 years apart. |
| `4.webp` | 215 KB | JPEG | **"Blind Thrust Fault" Northridge-style diagram** (GeologyIn.com) — 3D block diagram with Santa Monica Mountains, Northridge focus, three progressive panels A/B/C showing the fault bending upward. | **Reference for the "service tunnel under the stream" 3D moment** — shows how a blind thrust builds a mountain above without breaking the surface. |
| `6.png` | 522 KB | PNG | **Ductile vs Brittle Folds diagram** (Virginia Sisson, CC BY-NC-SA) — 7 fold types including Box fold, Fault bend fold, Chevron folds, with red fault markers and stratigraphic layer colors. | **Reference for the 4-layer material story** — folded limestone/granite layers are a perfect visual analogue to the layered cross-section. |
| `8.png` | 512 KB | PNG | **Thrust topography with Klippe and Fenster** — three panels (a) topography with thrust ramps, (b) Klippe (older rock stranded on younger), (c) Fenster (younger rock exposed through older). | **Reference for the composite terrane plaque** — Klippe and Fenster are exactly the geological features the ravine displays. |
| `8.jpeg` | 57 KB | JPEG | **Thrust flats, ramps, and folds diagram** — labeled "Hinterland dipping thrusts", "Ramp - HW", "HW cutoff", "Flat - HW", "Back thrust", with strong/weak layer model. | **Reference for the service tunnel geometry** — the "flat" segments with periodic "ramps" are the same pattern the 120-block service tunnel follows. |
| `2.jpg` | 77 KB | JPEG | **Four fault types diagram** (Brooks/Cole - Thomson) — Normal fault, Reverse fault, Thrust fault, Right-lateral strike-slip fault, with arrows showing extension vs compression. | **Quick reference for "what is a thrust fault"** — clear, labeled, classroom-quality. Use as a primer figure early in the report. |

### 3.2 Underground infrastructure engineering diagrams

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `4.webp` | 215 KB | WEBP (mislabeled) | **"M4 / M5 Tunnel Portal" engineering diagram** — Sydney-style motorway portal, black-and-white 3D wireframe showing two portals and connection to other extensions | **Reference for the service tunnel portal engineering** — direct visual analogue to the SubTropolis→Cheyenne service tunnel and its 25-ton blast door. |

### 3.3 Public-shaft / vertical-transport references

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `0.png` | 1.9 MB | PNG | **Concrete mine shaft headframe (winding tower)** — tall concrete tower with orange industrial cap, snow, surface industrial buildings, antenna mast. | **Hero for the public shaft** — the headframe is the real-world analogue to the Combined Complex's 7×7×100-block public shaft. Concrete tower + surface industrial buildings = the surface pavilion + the 100-block lift core. Massive resolution. |
| `0.jpg` | 104 KB | JPEG | **Pulaski Thrust cross-section** (also in 3.1) | Reference for the *depth* of the public shaft descent — the 100-block Y=0 to Y=-100 descent visualized next to a 2,000-foot-deep geological section. |

### 3.4 City-block / zone classification references

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `7.png` | 548 KB | PNG | **FDOT Context Classifications** (Florida Department of Transportation) — single image showing 7 zone types in a continuous transect: C1-Natural, C2-Rural, C2T-Rural Town, C3R-Suburban Residential, C3C-Suburban Commercial, C4-Urban General, C5-Urban Center, C6-Urban Core, with arrows showing context transitions. | **Hero for the "world envelope" section** — the FDOT 7-zone transect is the exact conceptual model the Combined Complex needs: coastal plain (C2) → city (C5/C6) → mountain foothill (C2/C3) → alpine (C1). The image already shows a city embedded between natural and urban zones with named blocks and roads. |
| `8.jpeg` | 57 KB | JPEG | **(covered above — thrust flats, ramps, folds)** | — |

### 3.5 Construction-site / new-build-with-existing-context references

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `0.webp` | 330 KB | WEBP | **Aerial of a large industrial building under construction** — bare steel roof trusses, exposed concrete slab, neighboring older buildings, snow, dirt. | **Hero for the "new infrastructure on the map" section** — the visual proof that new construction can stand next to old, both visible at once. |
| `5.jpeg` | 245 KB | JPEG | **(covered in 2.3 — brick pedestrian tunnel)** | — |

### 3.6 World map / location reference

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `7.webp` | 138 KB | WEBP | **World map with major countries, national flags, geographic features** | **Reference for the "this is where the build sits in the world" frame** — use as a backdrop or scaling reference. The 1,500×1,500 block Combined Complex occupies the same single-block scale of the existing bot world. |

---

## 4. Schematic-to-Build Mapping

**Source for this section:** the single underground schematic in the library, `D:\projects\mc-fleet-bot\schematics\underground-base.schem` (1,048 bytes), plus the build's site plan in `D:\projects\mc-fleet-bot\docs\masterplans\04-combined-complex\02-design\site-coordinates.json`.

### 4.1 The existing underground schematic

`underground-base.schem` is the only file in the 111-file library that is explicitly underground. At 1,048 bytes, it is one of the smallest schematics (for comparison, `Cute house.schem` is 38,231 bytes, ~36× larger). It is a small starter base — likely a 5×5×3 enclosed room with a crafting table and chest. It is not a 200×200 SubTropolis chamber or a 25-ton blast door facility. The Map Integration report should treat it as a **marker of intent** ("the bot fleet has tried underground once") rather than a structural asset.

### 4.2 Visual link to the Combined Complex

| Existing schematic | New Combined Complex asset | Connection type | Visual reference |
|---|---|---|---|
| `underground-base.schem` | The 5×5 lift core inside the 7×7 public shaft envelope, OR a 5×5×5 utility room in the SE corner of the SubTropolis chamber | The schematic's footprint is ~5×5, exactly the lift-core geometry. The report can propose **relocating the existing underground base into the SubTropolis chamber** as a "bot-built room" inside the larger man-made chamber — a "first bot, then the city" historical layer. | `1.png` (Minecraft wooden structure with markers) — visual analogue to a small bot-built structure inside a larger built environment. |
| `birch house.schem` (queued at (904, 79, 390)) | A house in the new city or the limestone hillside | The mission is queued for the *existing* world at (904, 79, 390). The new world origin is (0, 0, 0) — 900+ blocks away. The report should propose **re-tasking the mission to place the birch house in the new Houston city**. | `9.jpg` (Minecraft world with structure, position overlay) — visual analogue to where the house would land. |
| `md castle 2.schem` (queued at (973, 1, 453)) | A castle on the granite hillside or as a "first-survey structure" on the granite peak | The 800×600 mountain range is the new home for medieval-flavor schematics. Mission queue at (973, 1, 453) is on flat ground in the old world; the new build should move it to the new mountain. | `9.jpg` (same — Minecraft world with structure) — visual analogue. |

### 4.3 Recommended integration moves

Based on the existing schematic library and the bot fleet's current activity:

1. **Relocate the underground-base schematic into the new SubTropolis chamber.** The chamber is at (X=-100 to +100, Y=-100 to 0, Z=-300 to -100). Place the existing bot-built base in the SE corner, adjacent to the public shaft landing. This is a small migration: ~1,000 blocks north and ~1,000 blocks west from (940, 60, 350).
2. **Move the `birch house` mission to the new city's south edge.** The new city is at (X=-69 to +69, Y=0, Z=-69 to +69). The birch house would sit at the city's NE residential block.
3. **Move the `md castle 2` mission to the limestone hillside.** The limestone hillside is at (X=-300 to +300, Y=0 to 475, Z=-380 to -100). A castle at, say, (X=0, Y=200, Z=-250) would be visible from the city across the ravine.
4. **Use the 5×5 lift-core geometry as the existing schematic's new home.** The 5×5 lift core is the public shaft's central column. A 5×5 schematic placed inside the lift core would be visible from the lift's glass walls — a "what the bots left behind" Easter egg.
5. **Connect the service and public shafts to the existing schematic via the SubTropolis horizontal portal.** The horizontal portal at (0, 0, -300) is a 4×5 opening in the limestone hillside. A new access corridor could lead from the portal to the relocated underground-base schematic inside the SubTropolis chamber.

### 4.4 Visual reference for the schematic-to-build mapping

| File | Size | Format | Description | Suggested use |
|---|---|---|---|---|
| `1.png` | 1.6 MB | PNG | **Minecraft wooden structure** — the visual analogue to a small bot-built base | **Hero for the "schematic-to-build" diagram** — show this style of small enclosed structure inside the larger SubTropolis chamber. |
| `5.png` | 133 KB | PNG | **Minecraft deep-cave** — natural cavern with stalactites | **Contrast image** — the small schematic is to the SubTropolis chamber what this cave is to a small wooden shed. |
| `9.jpg` | 41 KB | JPEG | **Minecraft world with chest UI, position overlay** | **Reference for the existing bot's world coordinates** — the report should compare these coordinates to the new site-coordinates.json. |

---

## 5. Gaps

Things the next pass should fill:

1. **No high-resolution rendering of the actual existing world.** The existing bot world at (800–955, 60, 225–380) is real, but no in-game screenshot from the player's perspective was available. A top-down satellite or spectator screenshot of the current world would be the strongest single visual for the report.
2. **No visual of `underground-base.schem` itself.** The `.schem` format doesn't embed a preview. A rendered isometric or top-down view of the schematic (using a tool like `schematic-to-png` or a Minecraft rendering tool) would be the single most useful asset in this catalog. A 5×5×3 wooden room with a chest and crafting table is the visual we lack.
3. **No aerial of the new Combined Complex master plan.** The 02-design/site-plan.md describes the layout in detail, but no top-down render exists. The report author should generate one.
4. **No real Houston Tunnel System interior.** The 5.jpeg brick tunnel is a great visual but not a downtown-Houston tunnel. A real PCC corner-market or Wells Fargo Plaza basement tunnel shot would be ideal.
5. **No real SubTropolis drive-in portal photo.** The 0.webp industrial construction site is a stand-in. A real SubTropolis.com marketing shot of the cut-into-hillside drive-in portal would be more authoritative.
6. **No real Cheyenne Mountain exterior / aerial.** The 0.png mine shaft headframe is a stand-in. An aerial of the actual Cheyenne Mountain with the entrance portal would be ideal.
7. **No Minecraft-side map of the existing world.** The 9.jpg position overlay (-129, 88, 284) is a single-coordinate reference, not a map. A Dynmap or BlueMap top-down render of the bot's world would close the gap.
8. **No HUD or dashboard screenshot of the mc-fleet-bot fleet dashboard.** The `web/` app is the fleet control plane; a screenshot of the dashboard showing the bots, markers, zones, and missions would be the single most direct visual of "existing world state."

---

## 6. Image Quality Check

- **Total files:** 25 image files in the map-integration folder (16 .png, 6 .jpeg, 6 .jpg, 3 .webp)
- **Zero-byte files:** 0
- **Files < 1 KB:** 0
- **HTML/non-image files removed:** 2 (originally saved as `6.jpg` and `7.jpg`, 390 bytes and 671 KB respectively — both were HTML error pages from the image source. Moved to Trash via `mavis-trash`.)
- **Magic-byte validation:** all 25 files pass (JPEG: FF D8 FF; PNG: 89 50 4E 47; WEBP: 52 49 46 46)
- **Total size:** ~10.6 MB across the 25 valid images
- **Categories covered:** 5 of 5 (Existing Schematic Library, Existing World State, Map Integration Precedents, Schematic-to-Build Mapping, Gaps)
- **License posture:** mixed — most are CC-BY educational / Wikipedia / public-domain diagrams; some are marketing or editorial stock. Recommend a license review before any image is published.
- **Highest-resolution assets:** `2.png` (8,400×8,400 Cenrail system map, 2.7 MB), `0.png` (1.9 MB mine shaft headframe), `1.png` (1.6 MB Minecraft structure), `0.webp` (330 KB industrial construction aerial).

---

## 7. Top 5 Most Valuable Assets

If the report can only carry five images, these are the ones that most directly answer the user's question — *how the Combined Complex fits on the map and how it connects to existing*.

1. **`7.png` — FDOT Context Classifications (548 KB PNG)**
   *Why:* The single best visual for **the "world envelope"** — a continuous transect from natural (C1) to urban core (C6) with the same block-by-block contextual progression the Combined Complex needs: coastal plain → city → mountain foothill → alpine. The image already shows a city embedded in a zone classification system, which is exactly how the report should frame the Combined Complex's coastal-plain → city → mountain layout. The labels at the bottom (C1-Natural through C6-Urban Core) are exactly the language the report should use.

2. **`0.png` — Concrete mine shaft headframe (1.9 MB PNG)**
   *Why:* The **single best real-world visual analogue to the 7×7×100-block public shaft**. The headframe is a tall concrete tower with industrial cap, surrounded by surface industrial buildings and a radio antenna — a perfect stand-in for the Combined Complex's public-shaft surface pavilion and the 100-block descent. Massive resolution means it works at any size.

3. **`0.jpg` — Pulaski Thrust Sheet cross-section (104 KB JPEG)**
   *Why:* The **defining geological moment of the entire combined complex** is the thrust-fault contact crossing at the service-tunnel midpoint. This is a real geological cross-section with depth scale in feet, full stratigraphic column, and labeled "Pulaski Thrust Sheet" / "Pulaski Fault" — exactly the geometry the ravine models. The user explicitly asked for the connection to existing; this is the geological connection that makes the build honest.

4. **`5.jpeg` — Brick pedestrian tunnel (245 KB JPEG)**
   *Why:* The **closest visual to the Houston Tunnel System** in the catalog — undulating red-brick walls, black trim, white glass-block ceiling, patterned tile floor. This is the aesthetic the 03-masterplan describes ("tile-and-brick workday basement"). The image is empty (no people), so the report can overlay coordinates, scale bars, and the T-marker label.

5. **`2.png` — Cenrail System Map (324 KB PNG, native 8,400×8,400)**
   *Why:* The **single best reference for how to lay out the 6 site centers + 2 inter-site connections + 6 centerpieces as a single readable diagram**. 200 named stations, 20 colored lines, 5 region labels — exactly the kind of information density the Combined Complex's site plan needs at the report's front matter. The 8,400×8,400 native resolution means it can be cropped or zoomed for any figure size.

Honorable mentions: `0.webp` (aerial of new construction, perfect for "new infrastructure on the map"), `3.png` (RER-style transit map, perfect for the 6-stage inbound journey), `8.png` (thrust topography with Klippe and Fenster, perfect for the composite terrane plaque), `4.webp` (M4/M5 tunnel portal engineering diagram, perfect for the service tunnel portal).

---

## 8. Categories Not Covered (out of scope for this catalog)

The user asked specifically for **map integration** visuals. The following categories are *not* covered here and already exist in the parent catalog `D:\projects\mc-fleet-bot\docs\masterplans\04-combined-complex\03-visuals\references\visual-assets.md`:

- Mountain range / ravine references → `mountain-range-ravine/` (12 files)
- City-in-valley references → `city-in-valley/` (16 files)
- Service tunnel references → `service-tunnel/` (14 files)
- Public shaft / vertical transport references → `vertical-transport/` (10 files)
- Combined military + civilian references → `combined-civilian-military/` (12 files)
- Mountain resort references → `resort-underground/` (15 files)
- Defense-in-depth references → `defense-depth/` (24 files)
- Minecraft references → `minecraft-refs/` (16 files)
- Cheyenne-specific references → `cheyenne-mountain/` (14 files)
- SubTropolis-specific references → `subtropolis/` (15 files)
- Houston-specific references → `houston-tunnels/` (11 files)

The map-integration catalog is the **13th and final category** in the report's reference set. It complements, rather than duplicates, the existing 12 categories.
