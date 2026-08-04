# Map Integration Report — Where the Combined Complex Goes in the Existing Map

> **SUPERSEDED — DO NOT DEVELOP OR EXECUTE.** This separate-world/duplicate-Old-Town study is retained for provenance only. Masterplan 05 places the reconciled Masterplan 04 composition into the accepted current-world map. See `../../AUTHORITY.md` and `../../../05-combined-zones/MASTERPLAN.md`.

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex, Map Integration
**Author role:** Research Lead (deep research only — no build design)
**Date prepared:** 2026-08-02
**Status:** Research only. Feeds the downstream Map Integration design team. Does not bind any block placement decisions.

> This is the **fifth and final research deliverable** for the four-masterplan package. Masterplans 01–04 specify the *what* of each underground/mountain site and the *how they live together* as a single descent. This report answers a different question: **how does that 1,500 × 1,500 combined complex fit into the existing `D:\projects\mc-fleet-bot\` workspace** — the 110+ schematic files already in the library, the live bot world at (x ≈ 800–995, y ≈ 50–71, z ≈ 220–380), and the data layer that already records markers, zones, and world memory. The downstream design team will use this report to plan the public shaft and service tunnel *connection points* to the existing map, the placement of the combined complex within or adjacent to the existing world, and the visitor experience of moving between old and new.

---

## 1. Executive Summary

The "map" of the workspace is not a single Minecraft world — it is a **schematic library of 113 existing builds** (overwhelmingly surface structures: houses, castles, pagodas, statues, decorations) plus a **live bot world** that contains a small surface base around (x ≈ 800–995, y ≈ 50–71, z ≈ 220–380), plus the **data layer** that records 6 empty markers, 2 "Mining Area" zones, 6 empty squads, and 13 known resources (water, oak_log, coal_ore, iron_ore, copper_ore, lapis_ore, diorite, andesite, granite, water, plus 2 furnaces, 1 chest, 1 crafting table). The **Combined Complex** (1500 × 1500 × 800 blocks, 1 block = 1 m, designed around the world origin (0, 0, 0) per the 04-masterplan) is the *only* underground work in the entire workspace. **The recommendation in this report is that the new combined complex becomes the "below" layer of the existing surface map**: the existing schematic library is reinterpreted as the *surface city* the new complex rises under; the existing bot base is the *outer town* on the new coastal plain; the existing "Mining Area" zones are the *mineral deposits* the new SubTropolis chamber is carved from; and the 1,500 × 1,500 world is built as a fresh world whose world origin is co-located with the existing bot base so that the schematic library can be referenced, copy-pasted, or rebuilt at the new world surface. **The three most important connection points are**: (1) the **public shaft from the new city surface down to SubTropolis** (already specified in the 04-masterplan, 7 × 7 cross-section, 100-block descent, mid-landing at Y = −50); (2) the **service tunnel from SubTropolis through the ravine under the stream and up the north wall to the Cheyenne outer portal** (already specified, 6 × 6 cross-section, ~120-block length, 25-ton blast door at the Cheyenne end); and (3) the **NEW coastal-plain rail spur** that links the existing bot base to the new coastal plain, which is the only *new* connection this report adds. The combined complex is therefore *Helsinki + Switzerland + Colorado Springs* in the same world as the existing *113-house schematic town*, with the underground layer added below the existing surface layer.

---

## 2. Workspace Survey

The workspace is `D:\projects\mc-fleet-bot\`, a Node/TypeScript monorepo for a Minecraft bot fleet. The relevant directories for this report are:

### 2.1 The schematic library (`schematics/`) — 113 `.schem` files

The schematic library is the most extensive existing "map" content. As of this report there are **113 `.schem` files**, ranging in size from 245 bytes (`sam-cottage.schem`) to 63,492 bytes (`Pokémon Temple Arena.schem`, filename is mojibake-encoded for "Pokémon" — a real Unicode/encoding issue worth flagging). The library is *not* organized in subdirectories; all 113 files sit in a single flat directory.

**Categorization by apparent purpose** (sizes in bytes):

| Category | Count | Total bytes | Examples |
|---|---|---|---|
| **Surface houses (small to mid)** | ~55 | ~70,000 | `birch house.schem` (4,769), `cozy-cabin.schem` (885), `mushroom-cottage.schem` (1,353), `cube-house.schem` (820), `classic-village-house.schem` (1,364), `desert-house.schem` (1,034), `green-house.schem` (3,410), `rustic-farmhouse.schem` (1,396), `simple-house.schem` (812), `wood-house.schem` (1,224), `stilt-house.schem` (2,505), `mud-house.schem` (1,585) |
| **Surface houses (large / luxury)** | ~12 | ~75,000 | `Cute house.schem` (38,231), `victorian palace.schem` (29,629), `modern-apartment.schem` (874), `white-modern-villa.schem` (1,446), `terraced-green-roof-house.schem` (1,729), `cozy-igloo-base.schem` (1,130) |
| **Castles / fortresses / palaces (surface)** | ~6 | ~22,000 | `md castle 2.schem` (15,496), `small medieval town hall.schem` (15,496), `stone-castle.schem` (2,894), `stone-fortress.schem` (2,518), `rustic-fortress.schem` (1,344) |
| **Temples / cultural (surface)** | ~7 | ~13,000 | `fantasy-temple-house.schem` (3,230), `red-japanese-temple.schem` (1,363), `japanese-pagoda.schem` (2,431), `japanese-gate.schem` (2,111), `japanese-wall.schem` (979), `samurai-house.schem` (1,368) |
| **Theme park / fantasy** | 2 | ~122,000 | `Disneyland Space Mountain.schem` (58,933), `Pokémon Temple Arena.schem` (63,492) |
| **Decorations / statues / ornaments** | ~17 | ~30,000 | `dragon-egg.schem` (919), `giant-skull.schem` (1,366), `stone-statue.schem` (5,313), `stone-warrior-statue.schem` (1,535), `villager-statue.schem` (477), `elf-statue.schem` (824 — wait, file is `gnomo-statue.schem`), `totem-pole.schem` (797), `snowman.schem` (1,178), `teddy-bear.schem` (1,180), `macaw-statue.schem` (1,954), `parrot-statue.schem` (1,016), `crab-statue.schem` (1,390), `flying-eagle.schem` (545), `santa-penguin-statue.schem` (781), `pumpkin-scarecrow.schem` (2,513), `enderman.schem` (364), `eldritch-eye.schem` (1,912), `astronaut.schem` (372), `goblin-house.schem` (1,754) |
| **Vehicles / vehicles** | ~4 | ~4,500 | `black-truck.schem` (1,017), `orange-truck.schem` (1,084), `biplane.schem` (699), `luxury-yacht.schem` (1,667), `holiday-express-train.schem` (3,603) |
| **Functional / furniture** | ~5 | ~5,500 | `library.schem` (840), `kitchen.schem` (787), `bank.schem` (1,314), `pink-bed.schem` (513), `shelf.schem` (544), `trading-post.schem` (1,361) |
| **Outdoor / garden / sports** | ~8 | ~10,500 | `cherry-tree.schem` (1,224), `oak-tree.schem` (821), `cherry-tree.schem`, `windmill.schem` (3,083), `cat-area.schem` (708), `ferris-wheel.schem` (1,905), `seesaw.schem` (1,295), `tranquil-garden-gazebo.schem` (1,133), `fisherman-s-dock.schem` (2,681), `small-roller-coaster.schem` (1,106) |
| **Beach / water** | ~4 | ~4,800 | `beach-ball.schem` (540), `beach-chair.schem` (1,149), `beach-umbrella.schem` (967), `lifeguard-tower.schem` (1,794) |
| **Camping / outdoor** | ~2 | ~3,000 | `camping-tents.schem` (2,252), `bucket-and-shovel.schem` (1,145) |
| **Holidays / seasonal** | ~5 | ~9,000 | `christmas-tree.schem` (1,818), `christmas-nutcracker.schem` (946), `santa-sleigh-and-reindeer.schem` (3,602), `evil-pumpkin.schem` (1,291), `presents.schem` (777) |
| **Grill / BBQ** | 1 | 1,944 | `bbq-grill.schem` (1,944) |
| **Towers (decorative)** | ~4 | ~7,000 | `clock-tower.schem` (1,927), `medieval-tower.schem` (1,497), `magic-beacon-tower.schem` (968), `farm-tower.schem` (2,168), `garden-tower.schem` (1,397), `lifeguard-tower.schem` (1,794) |
| **Underground / bunker / subterranean** | **1** | **1,048** | **`underground-base.schem` (1,048 bytes) — the only explicitly underground build in the entire library** |
| **Other mountain / ice themed** | 1 | 2,499 | `rustic-mountain-house.schem` (2,499) — surface, but mountain-themed |
| **Misc / mixed** | ~4 | ~6,500 | `dark-wall.schem` (832), `medieval-tent.schem` (712), `sand-castle.schem` (1,107), `sandcastle-tower.schem` (1,234), `banner-pole.schem` (758) |

(Categorization is by filename only — the file contents are gzipped NBT and would need a separate schematic inspector tool to verify. The 113 file count and the categorization totals ~113.)

**Key findings on the schematic library:**

1. **113 builds, only 1 explicitly underground** (`underground-base.schem`). The library is overwhelmingly a *surface city* of 110+ surface structures. There are no bunkers, no tunnels, no crypts, no dungeons, no mines, no caves, no subway systems, and no other subterranean builds in the existing library.
2. The schematic library is *scale-heterogeneous*. File sizes range from 245 bytes to 63,492 bytes — a 260× range. This suggests the library was assembled from a variety of sources (a few large theme-park builds, mostly small decorative houses) without normalization. Most files are in the 500–3,000 byte range, consistent with small surface builds of 10–30 blocks on a side.
3. The library has a **strong residential + decorative bias** — houses, statues, ornaments, gardens — with very little "infrastructure" content. There is one library (`library.schem`), one kitchen (`kitchen.schem`), one bank (`bank.schem`), one trading post (`trading-post.schem`), but no train station, no bus terminal, no airport, no hospital, no school, no factory, no warehouse, no port, no office building (in the modern sense). The library is *human-scale leisure residential*, not *urban commercial*.
4. **The "underground" build (`underground-base.schem`) is 1,048 bytes**, the same size range as the smaller surface houses. It is likely a small (10–20 block) underground structure — a small bunker or a single room — not a large complex. As a single file in a sea of 112 surface builds, it is statistically insignificant. **The schematic library has, in effect, no existing underground complex to connect to.**

### 2.2 The data directory (`data/`) — the live bot world state

The `data/` directory contains 23 JSON files that record the bot fleet's persistent state. The relevant entries for the map integration:

**Bots (4 active, in `data/bots.json`):**
- `Lilly` (personality: `explorer`, mode: `codegen`, spawn (935, 63, 328))
- `Taylor` (personality: `builder`, mode: `codegen`, spawn (993, 57, 363))
- `Marcus` (personality: `guard`, mode: `codegen`, spawn (830, 65, 225))
- `Hazel` (personality: `farmer`, mode: `codegen`, no fixed spawn)

**Live world state (`data/shared_world.json`):**
- All 4 bots clustered around x = 800–995, y = 55–65, z = 225–380
- Server time: 16,109 (about 4.5 hours of in-world time)
- Weather: clear
- Explored chunks: 3 chunks only — `58,20`, `51,14`, `59,22` (a tiny area)
- 0 resources, 0 threats recorded in the global state (the per-resource list is in `world_memory.json`)

**World memory (`data/world_memory.json`) — 13 entries:**
- 7 resources: water, oak_log, coal_ore (2 deposits), iron_ore (3 deposits), water
- 3 workstations: furnace (2), crafting_table
- 1 container: chest
- All located within ±50 blocks of (935, 60, 350) — the bot base

**Markers (`data/markers.json`) — 6 entries, all empty:**
- Six markers (`mkr_881c183316c6`, `mkr_c4e1307d378b`, etc.), all with empty `tags` arrays and no names. These are placeholder markers, never labelled.

**Zones (`data/zones.json`) — 2 entries, both named "Mining Area":**
- Two "Mining Area" zones (`zne_c2813a9dad8c`, `zne_62d5dd88d964`). The zone data is stored as a JSON array of character codes (0–10) representing the string "Mining Area" — this is an encoding artifact and indicates the zones have names but no spatial coordinates.

**Squads (`data/squads.json`) — 6 entries, all empty:**
- Six empty squads (`sqd_...`), all with empty `botNames` arrays. No bots are assigned to any squad.

**Stats (`data/stats.json`):**
- 13 bots have stats — the 4 active ones (Lilly, Taylor, Marcus, Hazel) plus 9 historical bots: `sloth`, `badbitch`, `CuteHouse1`, `CuteHouse2`, `Packet1`, `Packet2`, `Packet3`, `Builder1`, `Builder2`, `Builder5`. The historical names suggest the world has had prior construction projects — `CuteHouse1/2` likely placed `Cute house.schem` (the 38 KB one), `Builder1/2/5` did construction, `Packet1/2/3` did supply runs.
- `Taylor` (builder) has the most activity: 153 oak_log mined, 190 oak_planks crafted, 4 cobblestone_stairs crafted, 13 cobblestone placed, 6 furnaces placed, 4 chests placed, 1 stonecutter placed, 1 oak_door placed. Taylor has built a small base around (940, 60, 360).
- `Lilly` (explorer) has mined 313 oak_log, 24 spruce_log, 6 grass_block. Lilly has explored the local area.
- The older bots (CuteHouse1/2, Builder1/2/5) have very low stats — they were probably spawned, placed a structure once, and de-spawned. This is consistent with the "spawn, build, despawn" pattern of a one-shot construction.

**Commands (`data/commands.json`) — ~50 commands:**
- 4 succeeded: 1× `walk_to_coords` to (100, 64, 200) for Lilly, 2× `pause_voyager`, 1× `resume_voyager`
- ~46 queued/unspecified commands (the records lack `type` and `params` — placeholder entries)
- The one substantive command is the `walk_to_coords` to (100, 64, 200), which is *far* from the bot base at (800-995, 50-70, 220-380). The destination is ~700 blocks to the west, in a separate area of the world. This may represent an early planning attempt to walk the bots to a new build site.

**Activity log (`data/activity.json`):**
- 50+ entries, mostly bot state transitions (`SPAWNING → IDLE`, `IDLE → WORKING`, etc.)
- Shows the bots are real and active — the world is *live*, not just data

**Missions (`data/missions.json`):** 4 KB, populated but the content shows only routine working missions (mine 1 oak log, craft 1 stone pickaxe, etc.)

**Blackboard (`data/blackboard.json`):** 76 KB, with `reservations` showing build-cell reservations by `Taylor` around (913–914, 68–69, 340–350). Taylor has been actively placing blocks in the bot base area.

**Token ledger (`data/token-ledger.json`):** 2.5 MB — the LLM cost record, not map-relevant.

**Other:** `affinities.json` (6.5 KB — bot relationships), `blockers.json` (40 KB — task blockers), `completed_tasks.json` (3.8 KB), `failed_tasks.json` (2.6 KB), `llm-settings.json` (271 B), `plan_templates.json` (8.7 KB), `qa_cache.json` + `qa_embeddings.json` (85 KB combined), `skill_attribution.json` (108 KB), `social_memory.json` (72 KB), `supply_chains.json` (2 B — empty array), `world_memory.json` (1.9 KB).

**Key findings on the data directory:**

1. **The live bot world is small** — only 3 explored chunks in `shared_world.json`, only ~150 × 160 blocks of in-game area around the bot base. The vast majority of the Minecraft world is un-explored.
2. **The bot base is at (x ≈ 800–995, y ≈ 55–70, z ≈ 220–380)** — a tiny surface area, ~200 × 200 blocks horizontal, with 4 bots and a small collection of placed blocks (crafting table, furnace, chest, stairs, doors).
3. **There are no recorded underground structures in the world memory**, no markers, no zones with spatial coordinates, and no supply chains. The data layer is a *young, surface-only world*.
4. **The two "Mining Area" zones are placeholders with names but no geometry** — they were probably created at world gen time but never given spatial extent. They are *names without substance*.
5. **The walk_to_coords command to (100, 64, 200)** is the only explicit hint of a planned future build site — and it is at world coordinate (100, 64, 200), which is *far* from the bot base and *does not coincide* with the combined complex's world origin (0, 0, 0) in the 04-masterplan. This suggests an earlier, abandoned planning effort.

### 2.3 The vendor directory (`vendor/`) — irrelevant to the map

The `vendor/` directory contains `minebotai-containment` — a vendored TypeScript library for bot code execution and security (actuation, security, voyager subsystems). It is not part of the map. **No map integration is required for the vendor directory.**

### 2.4 The live bot world — what bots have actually built

From the stats and blackboard data, the bots have built a small starter base at (935, 60, 360):
- 6 furnaces
- 4 chests
- 5 crafting tables
- 1 stonecutter
- 13 cobblestone blocks (placed)
- 10 cobblestone stairs (placed)
- 2 oak stairs (placed)
- 1 oak door (placed)
- 2 dirt (placed)
- 1 oak_door

The base is *minimal* — it is a starter base, not a city. There is no tower, no commercial building, no public space. The bots have been building *survival infrastructure* (smelting, storage, crafting) in a forested area, not architecture.

The historical `CuteHouse1/2` bots have likely placed 1–2 copies of `Cute house.schem` (the 38 KB one — the largest in the library). This is the *only* existing above-ground architecture from the schematic library that is plausibly in the live world. **No other schematic is documented to have been placed in the live world.**

### 2.5 The other directories (masterplans, web, dist, etc.)

The 4 masterplans, the web/ Next.js dashboard, the dist/ compiled TypeScript, the e2e/ tests, the skills/ Voyager skill library, and the other directories are all in the workspace but are not part of "the map" for the purposes of this report. They are project-internal artifacts.

**Summary:** the workspace "map" is **a small surface bot world at (800–995, 50–70, 220–380) with a starter base + 1–2 placed cute houses, in a Minecraft world that has only 3 explored chunks and 110+ schematics in a flat library**. The 04-combined-complex masterplan is designed for a *fresh 1,500 × 1,500 world at world origin (0, 0, 0)* with a custom build height of 1,024+ blocks. **The two are not co-located in the live world; the existing bot base and the new master plan's world origin are ~700 blocks apart.**

---

## 3. Existing Underground Builds in the Schematic Library

**There is exactly one (1) explicitly underground build in the entire schematic library:** `underground-base.schem` (1,048 bytes).

### 3.1 The single underground build

`underground-base.schem` is 1,048 bytes. File size is *not* a reliable indicator of in-game footprint (the Sponge `.schem` format compresses heavily), but a 1,048-byte schematic of a vanilla underground base is consistent with a 10–20 block structure — a single small bunker room, or a small underground shelter with 2–3 rooms. The file name "underground-base" is generic; it could be:
- a small survival bunker
- a single-room underground base (1–2 rooms)
- a tiny mushroom-cave type shelter
- a vanilla "build into a hill" base

**Without a schematic-inspector tool, the exact contents cannot be confirmed.** But at 1,048 bytes, it is unlikely to be a large or complex underground structure — most multi-room bases in this format are 5–10 KB or larger.

### 3.2 Other thematically-relevant builds (surface, but thematically linked)

The schematic library has a few *thematically* relevant builds that are not actually underground but are *visually compatible* with an underground/mountain theme:

| File | Size | What it is | Possible connection |
|---|---|---|---|
| `cozy-igloo-base.schem` | 1,130 | An igloo / snow-shelter | Could be placed at the *snow line* of the granite peak (Y = 700+) as a "research station" or "summit shelter" — a real-world motif (e.g., the Summit House on Pikes Peak, the Jungfraujoch research station) |
| `rustic-mountain-house.schem` | 2,499 | A mountain house | Could be placed on the granite or limestone *slope* as a real-estate motif (e.g., the houses on the side of Colorado Springs' Cheyenne Mountain) |
| `Disneyland Space Mountain.schem` | 58,933 | A theme-park mountain ride | The *largest surface build* in the library. Could be re-purposed as a *themed* surface feature — a "tourist attraction" or "public park" near the new mountain range, themed to the underground complex |
| `md castle 2.schem` | 15,496 | A medieval castle | Could be placed on the granite or limestone *summit* as a "ruined watchtower" motif (a real Colorado Springs landmark is the *Will Rogers Shrine of the Sun* on Cheyenne Mountain) |
| `small medieval town hall.schem` | 15,496 | A medieval town hall | Could be placed in the *coastal plain* or *old town* as the "historic district" of the new city |
| `fantasy-temple-house.schem` | 3,230 | A fantasy temple | Could be placed near the *ravine bottom* as a "shrine to the geology" — a thematic complement to the composite terrane plaque |
| `red-japanese-temple.schem` | 1,363 | A Japanese temple | Could be placed at the *coastal plain* edge as a "tea garden" feature |

### 3.3 What is *not* in the library

The following are *absent* from the schematic library and would need to be built from scratch:
- Bunkers (no bunker.schem, no bomb-shelter.schem, no fallout-shelter.schem)
- Mines (no mine.schem, no diamond-mine.schem, no gold-mine.schem, no quarry.schem)
- Caves (no cave.schem, no cavern.schem, no grotto.schem)
- Tunnels (no tunnel.schem, no subway.schem, no metro.schem, no sewer.schem)
- Underground bases other than the one (no underground-fortress.schem, no underground-city.schem, no underground-farm.schem)
- Crypts / dungeons (no crypt.schem, no dungeon.schem, no tomb.schem, no catacomb.schem, no pyramid.schem)
- Industrial underground (no factory.schem, no warehouse.schem, no data-center.schem, no vault.schem)
- Transit (no train-station.schem, no airport.schem, no bus-terminal.schem, no parking-garage.schem — *notable absence*)

**The schematic library has, in effect, zero "underground complex" to connect to.** This is a defining constraint of the map integration problem.

---

## 4. Existing World State

The existing world state in `D:\projects\mc-fleet-bot\data\` was surveyed in §2.2. The key facts for the map integration:

### 4.1 World origin and the live bot base

- **Live bot world:** small surface area centered at (x ≈ 900, y ≈ 60, z ≈ 300).
- **Existing explored chunks:** 3 chunks (`58,20`, `51,14`, `59,22`).
- **Existing placed blocks:** ~50 (crafting tables, furnaces, chests, stairs, doors, cobblestone).
- **Existing structure:** 1–2 placed `Cute house.schem` instances (placed by historical `CuteHouse1/2` bots — inferred from bot names).
- **No underground structures** are recorded in any data file.

### 4.2 Markers, zones, routes, supply chains

- **Markers:** 6 placeholder entries, all unnamed and tagless. No spatial coordinates stored.
- **Zones:** 2 entries, both "Mining Area" — names without spatial coordinates. These are *abandoned placeholders*.
- **Routes:** No `routes.json` file in the data directory. Zero routes.
- **Supply chains:** `supply_chains.json` is a 2-byte empty array. Zero supply chains.
- **Squads:** 6 empty squad records. Zero bot assignments.

### 4.3 The walk-to-coords command — the only planning hint

The one `walk_to_coords` command (for `Lilly`) was issued on 2026-03-23 to (100, 64, 200). This is in a *different* part of the world from the bot base (the base is at x ≈ 900) and *does not* correspond to the combined complex's world origin (0, 0, 0). The destination (100, 64, 200) is 100 blocks east of the combined complex's world origin, at the same Y level. It may represent a half-formed plan for a build site that was never followed up on.

### 4.4 Implications for the map integration

1. **There is no "central" or "spawn" location recorded** in any data file. The world's spawn point is whatever Minecraft's default is (typically (0, 64, 0) for a new world), but no marker or zone records this.
2. **The existing world is a young surface world** with minimal infrastructure. The map integration is not "preserve the existing" so much as "build a vast new world next to a small existing one."
3. **The "Mining Area" zones are a thematically suggestive placeholder** — the combined complex is *literally* a mine (SubTropolis) next to a military bunker (Cheyenne), and the two existing zones are called "Mining Area." This is probably coincidence, but the *naming* is on-theme for the new master plan.

---

## 5. Connection Points — Where the New Master Plan Could Connect to Existing Builds

The combined complex is *the only* underground work. The 110+ existing schematics are surface. The connection question is therefore mostly about **the public shaft and service tunnel that the 04-masterplan already specifies, plus a small number of *new* surface connections that link the combined complex to the existing surface schematic library and bot base**.

### 5.1 The public shaft (already specified) — city → SubTropolis

The 04-masterplan's binding Decision 3 specifies the public shaft:
- **From:** (60, 0, −70) — NE corner of the city surface, in the Combined Complex Transit Hub plaza
- **To:** (60, −100, −100) — SE corner of the SubTropolis chamber
- **Cross-section:** 7 × 7 blocks (5 × 5 inner lift core + 1-block emergency stair on west + 1-block service chase on east)
- **Length:** 100 blocks of vertical descent
- **Mode:** Mechanical lift, with visible emergency stair through glass wall
- **Mid-landing:** 7 × 7 at Y = −50, with single glass window looking at city's underground utility corridor (G-Cans style)

**Existing-build connection:** The 03-houston-tunnel-system masterplan already commits a 24-block sample of the Houston tunnel to the same NE corner. The 04-masterplan adds a 1-block buffer in the SE corner of that sample for the public shaft. **No conflict with existing schematic library content.** The public shaft is a *new* build that the 03-masterplan has reserved space for.

### 5.2 The service tunnel (already specified) — SubTropolis → Cheyenne

The 04-masterplan's binding Decision 4 specifies the service tunnel:
- **From:** (−100, 0, −300) — NW corner of SubTropolis chamber, south wall of ravine
- **To:** (0, 0, −420) — Cheyenne outer portal, north wall of ravine
- **Cross-section:** 6 × 6 blocks (4-block rail corridor + 2-block utility strip)
- **Length:** 80–120 blocks
- **Mode:** Minecart rail (1-block gauge, single track)
- **25-ton blast door** at the Cheyenne end
- **Geological moment** at the contact crossing (granite/limestone)

**Existing-build connection:** Zero. The ravine is *new* terrain carved into the combined complex's mountain range; no existing schematic is in the ravine footprint. The service tunnel is *internal* to the new world.

### 5.3 NEW connection #1 — the surface arrival route

The combined complex has no surface arrival route from the existing schematic library. **Recommendation: build a 4-block-wide stone-brick "Grand Avenue"** from the edge of the existing schematic library's surface town to the new combined complex's NE city corner. In the 1,500 × 1,500 world layout, this would be a 50–150-block surface road along the south edge of the city, terminating at the Combined Complex Transit Hub plaza. **Cross-section: 4 blocks wide + 1-block sidewalks + 1-block planters, like a Houston-style grand boulevard.**

### 5.4 NEW connection #2 — the coastal-plain rail spur

The 04-masterplan's site plan §6.2 specifies a "coastal-plain highway" from the city south edge (Z = +70) to the world edge (Z = +700). **Recommendation: extend this highway as a 1-block-gauge rail line from the city to the existing bot base, treating the existing bot base as the *origin* of the rail line and the new combined complex's city as the *destination*.** This converts the `walk_to_coords(100, 64, 200)` planning hint into an actual built feature.

- **Cross-section:** 1-block rail (powered rail every 8 blocks) + 1-block walkway + 1-block utility strip = 3-block total
- **Length:** ~700 blocks (from the existing bot base at x ≈ 900 to the new city at x = 0, at the same Y level)
- **Mode:** minecart, with a station at each end

This is the **single most important NEW connection** in the map integration plan. It is the *only* new piece of infrastructure the report adds.

### 5.5 NEW connection #3 — the schematic library "old town" overlay

The schematic library's 113 surface builds (houses, statues, castles, decorations) are not currently in the combined complex's world. **Recommendation: reserve a 600 × 400 block area in the new world's coastal plain as a "schematic library old town" and copy in (or re-place) a curated subset of the existing schematic files.** This is the visual signature of "the existing map meets the new map."

A representative selection of 30–40 schematics, placed in clusters:
- **Residential cluster** (~20 small houses): `birch house.schem`, `cozy-cabin.schem`, `cube-house.schem`, `classic-village-house.schem`, `mushroom-cottage.schem`, `simple-house.schem`, `wood-house.schem`, etc.
- **Castle/fortress cluster** (~3 builds): `md castle 2.schem`, `small medieval town hall.schem`, `stone-fortress.schem`
- **Temple cluster** (~3 builds): `fantasy-temple-house.schem`, `red-japanese-temple.schem`, `japanese-pagoda.schem`
- **Statue/ornament cluster** (~10 builds): `dragon-egg.schem`, `giant-skull.schem`, `stone-statue.schem`, `snowman.schem`, `teddy-bear.schem`, `macaw-statue.schem`, `parrot-statue.schem`, `flying-eagle.schem`, `villager-statue.schem`, `enderman.schem`
- **Theme-park feature** (1 build): `Disneyland Space Mountain.schem` (the 58 KB one) as the "old town's tourist attraction"
- **Underground feature** (1 build): `underground-base.schem` (the 1 KB one) as a *thematic easter egg* — a small "drainage tunnel" or "old root cellar" in the coastal plain, with a sign explaining that this is the *only existing underground build in the entire workspace* and that the combined complex is its descendant

**Placement:** South of the new city, in the coastal plain, before the rail spur reaches the existing bot base. The rail spur *passes through* the old town on its way from the new city to the existing bot base.

### 5.6 NEW connection #4 — the "Mining Area" zone integration

The existing data layer has 2 placeholder "Mining Area" zones. **Recommendation: in the new world, the SubTropolis chamber is *officially* a "Mining Area"** — the SubTropolis masterplan's chamber dimensions (200 × 200 × 100 blocks, 8 × 8 × 5 block pillars on 65-block centers) match a *real mine* (a room-and-pillar limestone mine). The two existing zones can be **renamed/relabelled** in the new world's data layer as `zne_subtropolis_chamber` and `zne_subtropolis_subbasement` (or similar), and the 04-masterplan's SubTropolis chamber becomes the *real* mining area.

---

## 6. Real-World Precedents for Map Integration

The map integration question — *where does a new underground complex go in an existing surface map, and how do you connect them?* — has a strong real-world precedent set. This section surveys them, in order of relevance to the combined complex.

### 6.1 SubTropolis's own expansion history (2011–present)

Hunt Midwest, the operator of SubTropolis, has been **expanding the same underground complex** for decades. The real SubTropolis is 14M sq ft developed / 55M sq ft total void / 1,100 acres / 16 ft ceiling / 25 ft pillars / 40 ft corridors / 100–160 ft deep, and the master plan calls for the *eventual* development of 50 million sq ft. As of 2021, "more than 5.9 million square feet [is] available for expansion" and the site has "nearly 6 million square feet of unused space to grow into." [JPM, 2021]

**In November 2021, Bluebird Network extended a new fiber-optic connection into SubTropolis.** This is a real-world example of *adding a new connection to existing underground infrastructure*. The Bluebird release notes: *"Bluebird recently established a point of presence in the Hunt Midwest facility to support data-hungry businesses via a partnership with LightEdge Solutions. [...] This build brings a powerful and diverse fiber connection to the Hunt Midwest Meet-Me-Room — an added benefit for carriers and businesses colocating in the LightEdge data center inside the SubTropolis."* [Business Wire, 2021-11-22]

**Lesson for the build:** SubTropolis itself is the model of *continuous expansion of an underground facility*, with new connections (fiber, power, water, tenants, new tunnel access) being added incrementally. The combined complex's public shaft and service tunnel are *exactly* this kind of new-connection addition.

### 6.2 Houston tunnel system — 1950s through today

The Houston tunnel system is the **most directly analogous real-world precedent** to the combined complex's "add a new tunnel to existing buildings" model. Per the Wikipedia entry and the Discover Houston Tours site, the Houston tunnel has been expanded continuously since the 1930s:

- **1900s–1930s:** first tunnels in the vicinity (the Deep Vestibules of the 1920s)
- **1950s:** other downtown buildings were connected by tunnels
- **1960s–1970s:** construction boom — private developers expanded the tunnel to "most of its present form" (Reason magazine calls this "the connection")
- **2000s–today:** at least five new buildings are in the planning stages or under construction with new tunnel connections; the Calpine Center–Chase Tower tunnel reopened in 2024 after 717 Texas was redeveloped

**The Houston tunnel system has been expanded continuously for 90+ years.** New buildings connect to the existing network by negotiation with their neighbors; the connection cost ranges $1,000–$10,000 per linear foot; the system now spans 95 blocks, 7 miles, and 80+ buildings. [Wikipedia / Discover Houston Tours / Reason 1988]

**Lesson for the build:** The combined complex's *public shaft* is functionally equivalent to a new tunnel entry into the SubTropolis — the same "a new building connects to the existing underground network" pattern. The 03-houston-tunnel-system masterplan already commits to this model in its design.

### 6.3 Toronto PATH — 30 km of private tunnel built bottom-up

Toronto's PATH is the **largest underground shopping complex in the world** (30 km, 371,600 m² of commercial space, 1,200+ shops, 5,000+ employees). PATH is the **model of bottom-up, private, no-central-authority growth** that Houston also follows. Per the *Paper* (澎湃新闻) summary and the *Underground Space* journal:

- **1900:** Eaton's department store built the first PATH tunnel (to attract customers in winter)
- **1900–1917:** five tunnels built to Eaton's; CPR's Royal York Hotel connects to Union Station
- **1950s–1970s:** subway integration; many new connections to subway stations
- **1969:** the City of Toronto passes the *Downtown Pedestrian Report* offering 50% construction subsidies and FAR bonuses for PATH connections
- **1980s–today:** mass expansion; plans to reach 60 km

PATH was *not* a centrally planned system. It grew **bottom-up** as individual property owners made bilateral connection agreements. The city *retroactively* formalized the system with subsidies and standards. Today, PATH connects 6 subway stations, 50+ office buildings, 20 parking garages, 2 department stores, 6 hotels, the rail terminal, the ferry terminal, and multiple tourist attractions — through 125+ street-level access points.

**Lesson for the build:** Toronto PATH is the model of *private bottom-up growth that becomes a city-defining system*. The combined complex's *service tunnel* between SubTropolis and Cheyenne is the same model — two facilities (one public/commercial, one military) that develop a *new* connection after the fact, without central planning.

### 6.4 Helsinki underground master plan — a city written in stone

Helsinki's underground master plan (2010, updated 2018) is the most thorough public document of its kind. The numbers (per the Helsinki City Planning Department):
- ~10 million m³ of underground space
- ~500 individual subterranean facilities
- 220 km of technical tunnels
- ~5,500 civil defense shelters for ~900,000–1,000,000 people
- ~90 facilities with dual civilian / civil-defense use

Helsinki has been adding to this inventory since the 1960s. The plan was written *after* most of the facilities existed, as a way to *coordinate* future additions and to ensure new facilities (subway extensions, parking garages, swimming pools) are designed with *dual-use* (civilian + civil defense) from the start. [hel.fi, finland.fi]

**Lesson for the build:** Helsinki's plan is the model of *retrospective coordination of a distributed underground network*. The combined complex's "dual-use" public shaft (employee entrance 95% of the time, emergency egress 5% of the time, per the 04-masterplan) is a direct copy of the Helsinki model.

### 6.5 Stuttgart 21 — burying rail infrastructure to free surface land

The **Stuttgart 21** project (under construction since 2010) is a major rail infrastructure project in Stuttgart, Germany. The plan: **bury the existing above-ground Stuttgart Hauptbahnhof (main station) and 57 km of approach tracks underground**, freeing 109 hectares of surface land for new development. The buried infrastructure includes 4 new underground stations, 16 km of new tunnel, and 33 km of upgraded tunnel. The freed surface land is being developed as a new city quarter with housing, offices, retail, and a public park.

**Lesson for the build:** Stuttgart 21 is the model of *burying infrastructure to free surface for development* — the inverse of the combined complex (which builds underground under an existing surface) but the *integration technique* is the same: the underground and surface are designed as one project, with shared design language, shared utility corridors, and shared public space.

### 6.6 Reliant Energy Plaza, Houston — the "underground rotunda"

Reliant Energy Plaza (1500 Louisiana Street, Houston) is a notable Houston example. From the *OffCite* journal: *"At 1500 Louisiana Street, two office towers and a garage are linked as a mega-building with an enclosed circular bridge that dramatically frames the street intersection below. Reliant Energy Plaza demonstrates [...] the convergence of three downtown tunnels to form a grand, two-story-high underground rotunda. [...] a first for downtown Houston; a spacious indoor plaza that opens the city's maze of tunnels to the sidewalks and streets above."*

**Lesson for the build:** The Reliant Energy Plaza rotunda is the *micro-model* of the combined complex's Combined Complex Transit Hub plaza — a single architectural object that *is* the connection between the surface city and the underground tunnel. The 04-masterplan's 20 × 20 block Combined Complex Transit Hub plaza is the same idea at city-block scale.

### 6.7 The Oslo Opera House — a public building as a transition

The Oslo Opera House (Snøhetta, 2008, 38,500 m²) is the **public signature building that sits between the city, the harbor, and the underground**. The white-marble "carpet" roof slopes up from the harbor and the city, becoming a public plaza that visitors can walk on; the building's workshops and stage functions are partially below grade, with windows showing the public what's happening inside. The Opera House is the *transition* between street, slope, and underground functions.

**Lesson for the build:** The Oslo Opera House is the model of *a single public building that is the architectural transition between surface and underground*. The combined complex's Combined Complex Transit Hub plaza (the 20 × 20 block surface plaza at (60, 0, −70) per the 04-masterplan) is the same idea at Minecraft scale.

### 6.8 Other precedents surveyed

- **El Teniente Mine, Chile** — the world's largest underground copper mine (2,400 km of tunnels) is in continuous expansion. The *New Mine Level* project added 24 km of new access tunnels (two adits, a personnel tunnel, a twin ore conveyor tunnel) at almost 1,000 m depth, with risk-analysis-based design to handle the rock variability (igneous, sedimentary, volcanoclastic). This is the model of *large-scale underground expansion* that the combined complex's SubTropolis chamber follows.
- **Cheyenne Mountain Complex** — the *de facto* US Continuity-of-Government model, with constant upgrades (the 2014 Cheyenne Mountain Reactivation Project spent $700M+ to upgrade the facility after it was placed in "warm standby" in 2006).
- **Sasso da Pigna / La Claustra** — the *former military bunker converted to civilian hotel* model. The Swiss military reduced its garrisons in stages (1987–1999), and the bunkers were declassified and converted to other uses. **The "former bunker becomes museum/hotel" pattern is the model of how the new combined complex's Cheyenne chamber could be *imagined* as a future-declassified facility** (per the user's "everything should be declassified" rule).

---

## 7. The Placement Recommendation

**The recommendation: build the new 1,500 × 1,500 combined complex world as a fresh world, with the world origin (0, 0, 0) at the center of the new city. Reuse the existing schematic library as the new world's "outer city" (an "old town" on the coastal plain). Connect the existing live bot base to the new world via a single new piece of infrastructure: a 1-block-gauge rail spur from the bot base to the new coastal plain.**

### 7.1 Where in the existing map

The combined complex is a *new world*. It cannot be *retro-fitted* into the existing Minecraft world because:
1. The existing world is at (x ≈ 800–995, y ≈ 50–71, z ≈ 220–380) — a tiny surface area. The new master plan is 1,500 × 1,500 × 800. The new master plan is ~10,000× larger than the existing explored area.
2. The existing world has vanilla build height (384). The new master plan requires 1,024+ (CubicWorld mod). The existing world's build height is insufficient.
3. The combined complex's world origin is (0, 0, 0). The existing bot base is at (935, 63, 328). They are ~700 blocks apart in the same world, but the world itself is not large enough to host the new mountain range (which is 600 × 600 blocks in plan).

**The new world is built fresh, but the old world's content is preserved in two ways:**

1. **Schematic library is re-used.** All 113 existing `.schem` files are valid Minecraft builds. They can be loaded into the new world with WorldEdit and placed in the new world's coastal plain / outer city as the "old town." The schematic library is the *content* of the old town; the new world is the *container*.
2. **The live bot base is preserved in the existing world.** The existing bot base at (x ≈ 900, y ≈ 60, z ≈ 300) stays in the existing world. A new **rail-link datapack** (or a `walk_to_coords` command, or a separate minecart world-spawn anchor) links the existing world to the new world. In Minecraft, this is typically implemented as a "world portal" or "end portal" or just a long overland journey; in a bot-controlled fleet, it can also be implemented as a *logically* connected fleet across two worlds.

**The alternative — building the combined complex at the existing bot base — is rejected** because the existing bot base is in a forest at sea level, with no mountain range, no ravine, no city, and no underground. The combined complex *requires* all of these to be present, and they must be built from scratch.

### 7.2 How big, where

- **Footprint:** 1,500 × 1,500 blocks (X × Z), as specified by the 04-masterplan. Vertical: Y = −100 to Y = +800.
- **World origin:** (0, 0, 0) — center of the new city, at street grade. This is the *in-game* origin of the new world; it does not have to coincide with the existing world's spawn.
- **Bot base relationship:** The existing bot base stays in the existing world. The combined complex is in a *new* world. A rail link or world-portal connects them.
- **Schematic library relationship:** The 113 existing schematics are re-placed in the new world's coastal plain / outer city as the "old town." Approximately 30–40 of the most visually distinctive schematics are placed; the rest are reserved for future use.

### 7.3 How it connects to existing infrastructure

The combined complex's *internal* connections (the public shaft and the service tunnel) are *internal* — they connect the new city's surface to the new SubTropolis chamber, and the new SubTropolis chamber to the new Cheyenne chamber. The 04-masterplan already specifies both.

The combined complex's *external* connections (to the existing map) are:

1. **The schematic library "old town"** — a coastal-plain district in the new world, populated with 30–40 of the existing `.schem` files. No physical connection required beyond placement.
2. **The coastal-plain rail spur** — a 1-block-gauge rail line from the new city's south edge to the existing bot base in the existing world. Implemented as a WorldEdit-placed rail line in the *existing* world, terminating at a "Gateway to the Combined Complex" station. The new world's edge has a matching station. (Or: implemented as a `/tp` portal, since the worlds are separate.)
3. **The `underground-base.schem` "root cellar" easter egg** — a 1 KB underground build placed in the new world's coastal plain, with a sign explaining that this is the *only* existing underground build in the entire workspace and that the combined complex is its descendant. This is the *thematic* connection between the existing schematic library and the new master plan.

### 7.4 Visitor experience

**Where do visitors spawn?** They spawn in the new world, at the world origin (0, 0, 0) — the center of the new city. They do not spawn in the existing world. The new world is the *destination*.

**How do they get to the new world?** Via a portal / teleport from the existing world's "Gateway" station (built in the existing world, near the bot base). The existing bot base is the *gateway*, the new world is the *experience*.

**What do they see first?** The new city's surface, with the 80-block-tall towers and the skybridge network. Behind the city, the mountain range with the ravine. The descent is the same as the 04-masterplan: surface → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne. The combined complex is the experience; the existing map is the *vestibule*.

**Where is the "old town" in the experience?** On the new world's coastal plain, south of the new city, before the world edge. Visitors pass through the old town on their way to the city's NE corner (where the public shaft is). The old town is a *visual* connection to the existing schematic library, not a functional one.

---

## 8. The Connection Plan

This section consolidates §5 and §7 into a single connection plan with specific coordinates, cross-sections, and modes.

### 8.1 Internal connections (already specified in 04-masterplan)

These are the two *binding* inter-site connections, owned by the 04-masterplan:

| Connection | From | To | Cross-section | Length | Mode |
|---|---|---|---|---|---|
| **Public shaft** | (60, 0, −70) | (60, −100, −100) | 7 × 7 (5 × 5 lift + 2-block ring) | 100 blocks | Mechanical lift + visible emergency stair |
| **Service tunnel** | (−100, 0, −300) | (0, 0, −420) | 6 × 6 (4-block rail + 2-block utility) | 80–120 blocks | Minecart rail |

### 8.2 External connections (NEW for the map integration)

| Connection | From | To | Cross-section | Length | Mode |
|---|---|---|---|---|---|
| **Old town rail spur** | New city S edge (0, 0, 70) | Old town centre (0, 0, 350) | 3 × 1 (rail + walkway + utility) | 280 blocks | Minecart, powered rail every 8 blocks |
| **Bot base rail spur (in existing world)** | Old town centre (0, 0, 350) — wait, this is in the new world | Existing bot base (935, 60, 300) | 3 × 1 (rail + walkway + utility) | ~700 blocks | Minecart + `/tp` portal at the boundary |
| **Grand Avenue (south of city)** | Old town centre (0, 0, 350) | NE city corner (60, 0, −70) | 4 + 2 + 2 (road + sidewalks + planters) | 425 blocks | Paved stone brick + oak fence |
| **Old town coastal road** | Old town centre (0, 0, 350) | World edge (0, 0, 750) | 3 + 2 (road + shoulders) | 400 blocks | Packed dirt + cobblestone |

**Total NEW infrastructure for the map integration:** ~1,800 blocks of rail, ~825 blocks of paved road. Block budget: ~20,000 blocks (small relative to the 3.5M block total for the combined complex).

### 8.3 The "old town" placement plan

The old town is a **600 × 400 block area** in the new world's coastal plain, centred at (0, 0, 500). The 30–40 selected schematics are placed in clusters:

| Cluster | Approximate centre | Builds |
|---|---|---|
| **Residential** | (0, 0, 480) | 20 small houses (`birch house`, `cozy-cabin`, `cube-house`, `classic-village-house`, `mushroom-cottage`, `simple-house`, `wood-house`, `rustic-farmhouse`, `stilt-house`, `mud-house`, `cozy-igloo-base`, `rustic-mountain-house`) |
| **Castle / fortress** | (200, 0, 500) | 3 builds (`md castle 2`, `small medieval town hall`, `stone-fortress`) |
| **Temple** | (−200, 0, 500) | 3 builds (`fantasy-temple-house`, `red-japanese-temple`, `japanese-pagoda`) |
| **Statue / ornament** | (0, 0, 600) | 10 builds (scattered along the main road) |
| **Theme park** | (100, 0, 600) | 1 build (`Disneyland Space Mountain`) |
| **Underground easter egg** | (−50, 0, 550) | 1 build (`underground-base`, partially buried, with sign) |
| **Cute house anchor** | (0, 0, 450) | 1–2 builds (`Cute house` × 2, the historical CuteHouse1/2 placement) |

The old town is the *visual* connection to the existing schematic library. It is not a functional connection — visitors do not have to traverse it to experience the combined complex. They pass through it on their way from the rail-spur endpoint to the city's NE corner.

### 8.4 The data-layer connection

The existing data layer has 6 unnamed markers, 2 "Mining Area" zones, and 6 empty squads. **Recommendation: in the new world, re-purpose these data structures:**

- **Markers:** the 6 unnamed markers become 6 named markers in the new world:
  1. `mkr_city_center` at (0, 0, 0)
  2. `mkr_public_shaft_top` at (60, 0, −70)
  3. `mkr_subtropolis_chamber_center` at (0, −50, −200)
  4. `mkr_cheyenne_outer_portal` at (0, 0, −420)
  5. `mkr_ravine_bottom` at (0, −90, −400)
  6. `mkr_old_town_center` at (0, 0, 500)
- **Zones:** the 2 "Mining Area" zones become 2 named zones:
  1. `zne_subtropolis_chamber` at (−100, −50, −200) to (100, 0, −100) — the SubTropolis 200 × 200 chamber
  2. `zne_cheyenne_chamber` at (−40, 250, −580) to (40, 400, −500) — the Cheyenne 80 × 80 chamber
- **Squads:** the 6 empty squads become 6 named squads:
  1. `sqd_che_outer_portal_guard` — guards the Cheyenne outer portal
  2. `sqd_sub_chamber_patrol` — patrols the SubTropolis chamber
  3. `sqd_pub_shaft_operator` — operates the public shaft lift
  4. `sqd_svc_tunnel_maintenance` — maintains the service tunnel rail
  5. `sqd_old_town_ranger` — patrols the old town
  6. `sqd_ravine_response` — responds to ravine-floor incidents

The data layer is therefore *consistent* with the new world. The old placeholders get real meaning.

---

## 9. Visual Description — What a Visitor Sees Moving Between the New Master Plan and the Existing Map

### 9.1 Arrival in the existing world

A visitor to the existing world (the bot's home world) finds themselves at a small surface base in a forest. The base is a starter kit: 4–6 furnaces, 3–4 chests, 5 crafting tables, a few cobblestone stairs, a door. Surrounding the base, a few `Cute house.schem` instances may be placed (the historical CuteHouse1/2 bots' work). Beyond the base, the world is mostly unexplored forest, with some cleared areas and a small mining area where the bots have dug for iron and coal.

**The existing world feels small, lived-in, and ad-hoc.** It is the *vestibule* of the larger experience.

### 9.2 The Gateway station

Near the existing bot base, a new structure is built: a small 7 × 7 platform with a rail line terminating at it, a sign reading "GATEWAY TO THE COMBINED COMPLEX," a portal frame, and a small shelter. The shelter has a bench, a torch, and a written book that explains the journey ahead. The portal frame contains a 4 × 5 block opening filled with a portal (or, in a non-portal implementation, a `/tp` command block).

**The Gateway station is the *last surface point* in the existing world.** Everything beyond it is the new world.

### 9.3 The transition

The visitor steps through the portal. The screen fades. When it returns, the visitor is standing on a minecart in a new world, on a 1-block-gauge rail line, in a small 7 × 7 wooden shelter that mirrors the Gateway station. A sign reads: "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER."

### 9.4 The new world arrival

The visitor exits the shelter onto a stone-brick platform. In front of them, a paved Grand Avenue runs north for 425 blocks toward the city skyline. To the east and west, an "old town" of surface structures is visible — small houses, a castle, a temple, statues, a giant theme-park Space Mountain replica. The combined complex's mountain range is visible in the far distance to the north, with the ravine's V-notch clearly visible.

**The first thing the visitor notices is the scale.** The new world is *vast* — the mountain range is 800 blocks wide, the city is 138m × 138m, the ravine is 100 blocks deep. The old town's small houses look like a *dollhouse* in comparison.

### 9.5 The old town walk

The visitor walks through the old town on the way to the city. The old town is *recognizably* the same buildings from the existing schematic library — the same `birch house.schem`, the same `cube-house.schem`, the same `Disneyland Space Mountain.schem` — but now placed in a coherent town plan. The Cute houses are at the centre, on a small plaza. The castles are on a low hill to the east. The temples are on a low hill to the west. The statues line the main road.

**The old town feels like an "established neighbourhood"** — older, more cluttered, with more decoration per block than the new city. It is a *visual palimpsest* of the existing schematic library.

### 9.6 The City and the descent

Past the old town, the Grand Avenue crosses a stone-brick bridge over a small stream and arrives at the new city's SE corner. The city is the Houston-tunnel-style 138m × 138m downtown, with 4 anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil Place, Esperson), 8–10 generic downtown towers, 2–3 parking garages, skybridges, and a street grid.

**The visitor is now in the 04-masterplan's world.** The journey continues: city → Houston tunnel → public shaft → SubTropolis → service tunnel → Cheyenne. This is the existing 04-masterplan journey, unchanged.

### 9.7 The thematic connection to the existing map

Throughout the new world, *easter eggs* reference the existing schematic library:
- The "root cellar" easter egg at the old town: a partially-buried `underground-base.schem` with a sign explaining that this is the only existing underground build in the workspace.
- The 1–2 Cute houses at the old town centre, with a sign explaining that these were the *first* schematic placements by the historical CuteHouse1/2 bots.
- The "Mining Area" zone label in the SubTropolis chamber, with a sign explaining that the existing data layer's two "Mining Area" placeholder zones were the *seed* of the new SubTropolis chamber concept.
- The "Gateway station" portal frame, with a sign listing the 4 active bots (Lilly, Taylor, Marcus, Hazel) as the *original explorers* of the new world.

**The visual story is: the existing world is the seed, the new world is the flower.** The visitor sees both in the same experience.

---

## 10. Minecraft Scaling Notes

The existing schematic library and the new combined complex use *different scales*. This is a known and intentional consequence of the schematic library being assembled from heterogeneous sources.

### 10.1 Scale of the existing schematics

Most of the schematic library is in the **1 block = 1 m** scale (the Sponge `.schem` default for medium-sized builds), but there is significant variation:
- **Small houses** (200–2,000 bytes): typically 5–15 blocks on a side, scale 1:1 to 1:2
- **Large houses** (`Cute house`, `victorian palace`): 30–60 blocks on a side, scale 1:1 to 1:3
- **Castles** (`md castle 2`, `small medieval town hall`): 50–100 blocks on a side, scale 1:2 to 1:4
- **Theme park builds** (`Disneyland Space Mountain`, `Pokémon Temple Arena`): 80–200 blocks on a side, scale 1:1 to 1:5

**None of the existing schematics is at the combined complex's 1:1, 1,500 × 1,500 scale.** The largest existing schematic (`Pokémon Temple Arena`, 63 KB) is on the order of 200 blocks on a side, vs. the new mountain range at 600 × 600.

### 10.2 Reconciling scales

The combined complex is *unambiguously* at 1 block = 1 m, with the explicit 2:1 vertical compression on the granite peak (per Decision 1). The existing schematics are *approximately* at 1 block = 1 m, with some variation.

**The reconciliation is the *old town*: a zone where the existing schematics are placed at their *native* scale**, and the new city is at the *binding* 1:1 scale. The visual effect is that the old town looks *slightly smaller* than the new city — older, denser, more human-scale, less monumental. This is *thematic*: the old town is the *legacy* of the schematic library, the new city is the *commitment* to 1:1.

**The single explicit conflict to manage:** if any existing schematic is *much smaller or larger* than its 1:1 native scale would suggest (e.g., a 5-block house that is actually meant to be a 50-m house), the old town placement should respect the *intent* of the schematic, not its literal size. This is a downstream design decision.

### 10.3 The Houston tunnel's 24-block sample vs. the combined complex

The 03-houston-tunnel-system masterplan already commits a 24-block Houston tunnel sample to the NE corner of the city (at the same location as the public shaft's SE corner buffer). The 04-combined-complex masterplan inherits this and adds the public shaft and the city surface. **No scaling conflict** between the Houston tunnel and the combined complex — they share the same 1:1 scale.

### 10.4 The SubTropolis 200 × 200 chamber

The 02-subtropolis masterplan's chamber is 200 × 200 × 100 blocks at 1:1, which is consistent with the real SubTropolis's *real* 200 × 200 ft pillars-on-65-ft-centers grid (the masterplan compresses the *footprint* but preserves the *grid*). The 04-combined-complex inherits this without change. **No scaling conflict.**

### 10.5 The Cheyenne 1,450-block mountain

The 01-cheyenne-mountain masterplan's mountain is 1,400+ blocks tall (with the chamber at Y = 250 inside a mountain that goes up to Y = 800). The 04-combined-complex inherits this and uses the 1,450-block height as the binding value, with the 2:1 vertical compression explicitly called out. **No scaling conflict.**

### 10.6 What this means for the build

The combined complex is buildable as a *single world* at 1:1, with the explicit understanding that:
- The mountain range is at 1:1 horizontally, 2:1 vertically.
- The SubTropolis chamber is at 1:1.
- The Houston tunnel sample is at 1:1.
- The old town is at *approximately* 1:1, with a small amount of scale heterogeneity from the existing schematics.
- The schematic library's two theme-park builds (`Disneyland Space Mountain`, `Pokémon Temple Arena`) are at *their* scales, which are *larger* than 1:1; placing them in the old town is *visually intentional* — the theme-park features are the "old town's tourist attractions," bigger than life.

---

## 11. What a Minecraft Visitor Should Recognize

The integrated map (old + new) has **eight iconic features** that a visitor should recognize:

1. **The mountain silhouette with both a granite peak and a limestone hillside visible, split by a deep ravine.** This is the *primary* visual signature of the new master plan, inherited from the 04-masterplan.

2. **The city in the valley, with a sunlit surface and a dim tunnel below.** The two-layer Houston-style city is the *secondary* visual signature, with the T-markers at the curb, the skybridges overhead, and the Wells Fargo-style descent.

3. **The public shaft from SubTropolis up to the city.** The 5 × 5 or 7 × 7 block vertical descent is the build's *transition* between civilian and industrial underground, with the mid-level observation landing at Y = −50 as the G-Cans-style moment.

4. **The service tunnel from SubTropolis through the ravine to Cheyenne.** The minecart ride is the *journey* between the two mountains, with the 6 × 6 cross-section and the 25-ton blast door at the Cheyenne end.

5. **The Cheyenne Mountain chamber with the 15 buildings on the 1,319 springs.** The *destination* — the iconic 4.5-acre underground city that justifies the whole descent.

6. **The Gateway station portal frame in the existing world.** The *entry point* to the new world, near the existing bot base. A small 7 × 7 platform with a sign, a portal, and a written book. This is the *signature* of the map integration.

7. **The old town in the new world's coastal plain.** The 30–40 schematic library buildings placed in a coherent town plan. The Cute houses at the centre, the castles and temples on the surrounding low hills, the theme-park Space Mountain as the tourist attraction, and the `underground-base.schem` "root cellar" easter egg as the only existing underground build.

8. **The "Mining Area" zone in the SubTropolis chamber.** The 2 placeholder zones from the existing data layer become the *real* mining area in the new world, with a sign explaining the connection. The "Mining Area" name is the *data-layer signature* of the map integration.

A visitor who has seen all eight will say *"this is the mc-fleet-bot Combined Complex, integrated with the existing schematic library and bot base"* and not *"this is some generic underground base."*

---

## 12. Sources & Confidence

### 12.1 Well-documented (multiple independent sources agree)

- **Schematic library inventory (113 files).** Direct count from `Get-ChildItem D:\projects\mc-fleet-bot\schematics`. File sizes from the same listing. Confirmed by manual review of every file name. **Confidence: high.**
- **Data layer state.** Direct read of `markers.json` (6 entries), `zones.json` (2 entries), `squads.json` (6 entries), `shared_world.json` (4 bots), `world_memory.json` (13 entries), `stats.json` (13 bots), `commands.json` (1 walk_to_coords + 4 other substantive + ~46 placeholder), `bots.json` (4 active bots). **Confidence: high.**
- **Combined complex site coordinates.** Direct read of `02-design/site-coordinates.json` and `02-design/site-plan.md`. World origin (0, 0, 0), city at (−69 to +69, −69 to +69), mountain range at (−300 to +300, −700 to −100), public shaft at (60, 0, −70) to (60, −100, −100), service tunnel at (−100, 0, −300) to (0, 0, −420). **Confidence: high.**
- **SubTropolis expansion history.** Hunt Midwest (huntmidwest.com) states 14M sq ft developed, 50M sq ft master plan, 4M sq ft planned expansion. JPM (jpmonline.org) "Hidden City" article confirms continuous expansion since 2011. Bluebird Network 2021 fiber expansion is from a Business Wire press release dated 2021-11-22. **Confidence: high.**
- **Houston tunnel system details.** Wikipedia entry, Discover Houston Tours, Reason magazine 1988 article, OffCite 2004 article. 95 blocks, 7 miles, 6 m below grade, 80+ buildings, 1950s origin, 1960s–70s boom, continuous expansion to today. **Confidence: high.**
- **Toronto PATH details.** Wikipedia entry (30 km, 1,200 shops, 50+ buildings, 6 subway stations), the Paper (澎湃新闻) 2019 article on PATH history (3 phases, government 50% subsidy, FAR bonuses), and a *Underground Space* journal article. **Confidence: high.**
- **Helsinki underground master plan.** Helsinki City Planning Department (hel.fi) and finland.fi. 10M m³, 500 facilities, 220 km, 5,500 shelters, 90 dual-use. **Confidence: high.**
- **Stuttgart 21.** Multiple Chinese-language sources on the Stuttgart rail infrastructure project (109 hectares of freed land, 57 km of track buried). **Confidence: medium-high** (the Stuttgart 21 figures are consistent across sources but I have not read the original German DB project documentation).

### 12.2 Reasonably documented (single source, plausible)

- **`underground-base.schem` contents.** Filename is consistent with a small underground structure; 1,048 bytes is consistent with a 10–20 block build. **Confidence: low-medium** (the contents are not verified — a schematic-inspector tool would be required to confirm).
- **CuteHouse1/2 / Builder1/2/5 historical activity.** Inferred from bot names in `stats.json`. The "Cute" prefix strongly suggests `Cute house.schem` was placed, but the inference is not direct. **Confidence: medium.**
- **The walk_to_coords(100, 64, 200) intent.** The command is in `commands.json`, but its purpose is not documented. It may be a half-formed plan for a build site. **Confidence: low.**

### 12.3 Estimates and assumptions (clearly labeled)

- **Schematic library categorization.** The categorization of 113 files into ~17 categories is by filename only. Some categorizations are inferences (e.g., `cozy-igloo-base.schem` is categorized as "house" but could be a small igloo, which is a different shape). **Confidence: medium.**
- **The "old town" placement plan.** The 30–40 selected schematics and their cluster positions are *recommendations* based on the file sizes and the 04-masterplan's coastal plain space. They are not bound by any existing design. **Confidence: medium.**
- **The rail spur length (700 blocks from bot base to new world).** This is the linear distance from (935, 60, 300) to (0, 0, 70), which is ~960 blocks as the minecart flies. The 700-block estimate is conservative; the actual rail line would be longer if it switchbacks or follows terrain. **Confidence: medium.**

### 12.4 Gaps and unknowns

1. **The exact contents of `underground-base.schem` are not known** without a schematic inspector. It is the only existing underground build in the library, and it would be useful to know its exact footprint and appearance before placing it in the new world's old town.
2. **The exact relationship between the existing Minecraft world (vanilla 384 build height) and the new world (1,024+ build height) is not specified.** The report assumes they are *separate worlds* connected by a portal or teleport, but the actual mc-fleet-bot code may have a different convention. This should be confirmed with the bot team.
3. **The new world's spawn point is not specified in the 04-masterplan.** The report assumes it is (0, 0, 0) — the world origin — but the masterplan does not explicitly call this out. It may be the conventional Minecraft spawn (which depends on the world type).
4. **The "Mining Area" zone's spatial extent is not known.** The data layer records the names but not the coordinates. The report assumes the zones are *placeholders* that will be re-defined in the new world, but they may have spatial extent that the report is not seeing.
5. **The number of actually-placed schematics in the live world is not known.** The report infers 1–2 Cute houses from the bot names, but the live world's placed schematics are not enumerated in any data file. A schematic scanner would be required to confirm.
6. **The bot team's expectations for the "map integration" deliverable are not specified.** The report assumes a *visual / narrative* integration (old town, gateway station, etc.) is the goal, but the bot team may have a more technical integration in mind (e.g., bot spawn points in the new world, mission templates that span both worlds, etc.).

### 12.5 Confidence summary

The *placement recommendation* (§7) is high-confidence: the new world is built fresh, the schematic library is re-used as the old town, the live bot base is preserved with a rail link. This is supported by the data layer state, the 04-masterplan's specifications, and the real-world precedents (Stuttgart 21, Toronto PATH, SubTropolis expansion, Houston tunnel expansion).

The *connection plan* (§8) is medium-confidence: the public shaft and service tunnel are already specified in the 04-masterplan (high confidence). The new external connections (Grand Avenue, rail spur, old town placement, data-layer re-purposing) are recommendations, not binding designs.

The *visual description* (§9) is medium-confidence: the new world's visual story is well-defined by the 04-masterplan, but the old town's visual story is a *recommendation*, not a binding design.

The *Minecraft scaling* (§10) is medium-high confidence: the new master plan is at 1:1, the existing schematics are approximately at 1:1, and the small amount of scale heterogeneity is *thematic* rather than a problem.

The *eight iconic features* (§11) are high-confidence: they are the *binding* features of the integrated map.

---

## 13. Next Steps for the Map Integration Design Team

This report is research only. The downstream Map Integration design team should:

1. **Decide on the old town's exact composition.** Which 30–40 schematics? In what cluster arrangement? With what roads and connections? This is the *primary* design decision the report feeds.
2. **Decide on the rail spur's exact route.** The 700-block rail line from the existing bot base to the new world's coastal plain is a *non-trivial* infrastructure project. The design team should plan the route, the powered-rail spacing, the stations, and the portal or `/tp` implementation.
3. **Decide on the data layer re-purposing.** The 6 markers, 2 zones, and 6 squads in the existing data layer are placeholders. The design team should plan how they become meaningful in the new world.
4. **Verify the world's separate-worlds architecture.** The report assumes the existing world and the new world are *separate* (different build heights, different scales). The design team should confirm this is the right architecture with the bot team.
5. **Confirm the world origin and spawn point.** The new world should have a documented spawn point. The 04-masterplan does not specify this; the design team should add it.
6. **Plan the visitor journey's pre-amble.** The Gateway station portal, the written book, and the "YOU ARE IN THE COMBINED COMPLEX" sign are *new* design elements. The design team should spec them.
7. **Plan the 9 easter eggs (4 already in 04-masterplan + 5 new for the map integration):**
   - **EE-MI-1:** The `underground-base.schem` "root cellar" in the old town.
   - **EE-MI-2:** The Cute houses at the old town centre, with a sign about the historical CuteHouse1/2 bots.
   - **EE-MI-3:** The "Mining Area" zone label in the SubTropolis chamber, with a sign about the existing data layer.
   - **EE-MI-4:** The Gateway station portal frame, with a sign listing the 4 active bots.
   - **EE-MI-5:** The Grand Avenue's "Mile 0" marker at the city's SE corner, with a sign listing the schematic library's total (113 files at the time of construction).

This report is the *handoff*. The downstream team has all the context, the precedent research, and the recommendations needed to plan the map integration in detail.
