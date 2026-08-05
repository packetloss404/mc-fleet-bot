# Map Integration — Working Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex, Map Integration (5th and final deliverable)
**Author role:** Architectural Designer (construction sequence)
**Date prepared:** 2026-08-02
**Status:** **SUPERSEDED FOR CURRENT-WORLD PLACEMENT — HISTORICAL STUDY ONLY**
**Companion to:** `design-plan.md` (the architectural spec), `discussion-notes.md` (the binding deliberation), `culture-architecture-analysis.md` (the soul), `research-report.md` (the workspace survey)

> **Authority notice.** This separate-world/duplicate-Old-Town construction sequence is superseded by [../../AUTHORITY.md](../../AUTHORITY.md) and Masterplan 05's delivery sequence. It is not executable and authorizes no world edits.

> **Scope.** This document specifies the *construction sequence* — the order in which the map integration's 6 major build elements (new world, old town, Grand Avenue, rail spur, Gateway pavilions, underground easter egg) are built, the tools used to build them, the quality checkpoints after each phase, and the risks that must be managed. It is the *bridge* between the architectural design and the AI contractor brief. It does not specify the *internal* construction of the Combined Complex itself (SubTropolis chamber, public shaft, service tunnel, Houston tunnel, Cheyenne chamber) — those live in the 04-masterplan and the four sub-masterplans.

---

## 1. Build Strategy

### 1.1 The strategic question

There are three plausible build orders:

- **A. New world first, then old town, then Grand Avenue, then rail spur, then Gateway pavilions** (recommended). The new world is the *foundation*: without it, the old town has nowhere to go, the Grand Avenue has nowhere to terminate, and the rail spur has no stations. Building the new world first establishes the *coordinate system* that all subsequent phases use.
- **B. Old town first, then new world, then Grand Avenue, then rail spur, then Gateway pavilions.** This is the *reverse* strategy: build the historical layer first, then the future, then the connection. The advantage is that the old town is *independent* (it does not depend on the new city), so the build team can start without the new world being fully ready. The disadvantage is that the new world must be *aligned* to the old town (the Grand Avenue's 425-block length is measured from the old town plaza to the new city's SE corner), so the alignment is a *late* step, not an *early* one.
- **C. Gateway pavilions first, then everything else.** This is the *portal-first* strategy: build the *connection* first, so the visitor can *see* what is being built on both sides. The advantage is that the Gateway is a *small* build (2 × 7 × 7 = 98 blocks each, ~200 blocks total), so it can be done quickly. The disadvantage is that the Gateway pavilions are *meaningless* without the two worlds they connect — building them first is a *form without substance*.

### 1.2 The chosen strategy: A (new world first)

The chosen strategy is **A. New world first, then old town, then Grand Avenue, then rail spur, then Gateway pavilions, then underground easter egg, then inter-build coordination.** The justification:

1. **The new world is the *coordinate system*.** Every subsequent phase uses the new world's coordinates (X = 0, Y = 0, Z = 0 origin; 1,500 × 1,500 footprint; 1,024+ build height). Without the new world, the old town, the Grand Avenue, and the rail spur have *no fixed location*.
2. **The new world is the *largest single build*.** The 1,500 × 1,500 × 1,024+ volume is the biggest piece of the project. Building it first ensures the build team has *uninterrupted* time to focus on the world's terrain generation, sky limit configuration, and base infrastructure.
3. **The old town is the *largest surface build*.** 30–35 schematics in a 600 × 400 area. Building it *second* means the build team has the new world's coordinate system but not the *pressure* of the Grand Avenue or the rail spur (which both *terminate* at the old town).
4. **The Grand Avenue, rail spur, and Gateway pavilions are *connective tissue*.** They connect the old town to the new city, the new world to the existing world, and the rail stations to the platform. Connective tissue is built *after* the things it connects.
5. **The underground easter egg is a *single small build*.** It is built after the old town (so the residential cluster's western edge is ready to host the cottage that hides the entrance) and after the plaza (so the glass viewing window can be placed).
6. **Inter-build coordination is the *last* step.** The data layer changes, the bot mission re-targeting, the squad mapping — these all depend on *everything else* being in place. They are the *post-construction* polish, not the *pre-construction* setup.

### 1.3 The 7 phases

The build is organized into **7 phases**:

1. **Phase 1: New world prep** — terrain, world footprint, sky limit, base infrastructure.
2. **Phase 2: Old town** — 30–35 schematics re-placed in 7 clusters.
3. **Phase 3: Grand Avenue** — the 425-block connection.
4. **Phase 4: Rail spur** — the 960-block rail.
5. **Phase 5: Gateway pavilions** — the 2 matching pavilions.
6. **Phase 6: Underground easter egg** — the historical placement.
7. **Phase 7: Inter-build coordination** — 2 bot missions re-targeted, 6 markers renamed, 2 zones renamed, 2 new files created.

The 7 phases are *sequential* — each phase depends on the previous one being complete. There is some *parallelism* possible (e.g., the Grand Avenue's stone-brick segment can be laid while the old town's castle cluster is being built, since they are in different parts of the world), but the *critical path* is the sequential order above.

---

## 2. Construction Phases (5–7 phases, expanded)

### Phase 1: New world prep (estimated: 1–2 days of in-world time)

**Goal:** establish the new world's coordinate system, terrain, sky limit, and base infrastructure.

**Sub-steps:**

1. **Create the new world** with the following parameters:
   - World type: default (not superflat — the combined complex requires specific terrain, and a default world with biomes gives more flexibility). See the open question in discussion-notes.md §5 about superflat vs. default.
   - World seed: a deliberate seed chosen for the coastal-plain + mountain-range + ravine topography. The seed is a *design decision* — the build team should test 3–5 candidate seeds before committing. Recommended: use a seed that produces a *plains biome* in the SW quadrant (for the coastal plain and the old town), a *mountains biome* in the NE quadrant (for the mountain range and the ravine), and a clear *gradient* between them.
   - Build height: 1,024 blocks (CubicWorld mod or equivalent). The 04-masterplan requires 1,024+ for the 800-block vertical descent.
   - World origin: (0, 0, 0) per the 04-masterplan.
   - Game mode: creative (for build), survival (for verification).
2. **Generate the base terrain:**
   - Coastal plain: a 600 × 400 block cleared area at (0, 0, 500) for the old town. Flatten the terrain to Y = 64.
   - Mountain range: a 600 × 600 block area at (0, 0, −200) with peaks at Y = 700+ and a 200-block-wide ravine at Z = −400. This is the *signature* terrain feature of the combined complex.
   - New city site: a 138 × 138 block cleared area at (0, 0, 0). Flatten the terrain to Y = 64.
3. **Set the spawn point** to the new world Gateway pavilion location at (0, 0, 700).
4. **Install the base infrastructure:**
   - A 1-block-wide dirt path from the spawn point to the old town plaza.
   - 1 chest at the spawn point with 64 oak-plank, 64 stone brick, 64 glass-pane (a *starter kit* for the visitor).
   - 1 sign at the spawn point: "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER."
5. **Verify the world** is operational: spawn is correct, terrain is generated, sky limit is 1,024, and the base infrastructure is in place.

**Quality checkpoint:**
- [ ] World is created with the correct parameters.
- [ ] Spawn point is at (0, 0, 700).
- [ ] Terrain is generated: coastal plain flat at Y = 64, mountain range with peaks at Y = 700+, ravine at Z = −400.
- [ ] Base infrastructure is installed: dirt path, starter kit, sign.
- [ ] Build height is 1,024+.
- [ ] World origin is (0, 0, 0).

---

### Phase 2: Old town (estimated: 3–5 days of in-world time)

**Goal:** place 30–35 schematics in 7 clusters in the new world's coastal plain.

**Sub-steps:**

1. **Inspect each schematic** before placement:
   - Run a schematic-inspector tool (Python or Node.js script) to read the `.schem` file's footprint, block types, and tile entities.
   - Check for legacy block IDs (block types that no longer exist in the current Minecraft world version).
   - If a schematic has compatibility issues, build a hand-built replica at the same location.
2. **Place the 7 clusters in order:**
   - **Cluster 1 — Residential (13 builds):** start with the 2 Cute houses at the plaza center, then the 10 small houses around the plaza, then the victorian palace on the north hill. (See design-plan.md §2.2 for the schematic list.)
   - **Cluster 2 — Castle/Fortress (3 builds):** place on the eastern 10-block-tall hill, starting with the castle on top, then the town hall, then the fortress.
   - **Cluster 3 — Temple (3 builds):** place on the western 10-block-tall hill, starting with the pagoda on top, then the red temple, then the fantasy temple.
   - **Cluster 4 — Statue/Ornament cluster (4 builds):** place on the 4 × 30-block ornamental avenue at (0, 0, 600), starting with the stone-statue at the south end, then the dragon-egg, the giant-skull, and the snowman at the north end.
   - **Cluster 5 — Theme park (1 build):** place the Disneyland Space Mountain at (100, 0, 600), with a 3-block-wide oak-plank road connecting it to the Grand Avenue.
   - **Cluster 6 — Underground easter egg (1 build):** *deferred* to Phase 6.
   - **Cluster 7 — Cute house anchor:** folded into Cluster 1.
3. **Add the historical signs:**
   - Every re-placed schematic gets a 1 × 1 oak sign on a fence-post at its entrance or front face.
   - The 2 Cute houses, the Space Mountain, and (in Phase 6) the underground-base get a 2 × 1 founding plaque on a lectern.
4. **Build the internal roads:**
   - Oak-plank (not stone-brick) roads connect the houses to the plaza, the castle cluster to the Grand Avenue, the temple cluster to the Grand Avenue, the statue cluster to the Grand Avenue, and the Space Mountain to the Grand Avenue.
   - The roads are 3 blocks wide (1-block road + 1-block sidewalk each side), with oak-fence lanterns every 8 blocks.
5. **Build the central plaza:**
   - 30 × 30 block cleared area at (0, 0, 500).
   - 1-block-wide cobblestone path connecting the 2 Cute houses.
   - 5-block-tall central fountain (hand-built, stone brick and water).
   - 1 × 1 glass viewing window (placed in Phase 6, with a sign placeholder for now).

**Quality checkpoint:**
- [ ] All 30–35 schematics placed in the correct clusters.
- [ ] All historical signs installed.
- [ ] All internal roads built.
- [ ] Central plaza built (fountain, paths).
- [ ] Each schematic has a sign crediting the bot fleet.
- [ ] The 2 Cute houses have the founding plaque crediting CuteHouse1/2.

---

### Phase 3: Grand Avenue (estimated: 2–3 days of in-world time)

**Goal:** build the 425-block Grand Avenue from the old town plaza to the new city's SE corner.

**Sub-steps:**

1. **Lay the roadbed:**
   - 4-block-wide × 425-block-long stone-brick surface from (0, 0, 500) to (60, 0, 70).
   - 2-block-wide × 425-block-long smooth-stone sidewalks on each side, raised 1 block above the road.
   - Total paved surface: 8 × 425 = 3,400 blocks.
2. **Place the 6 statues** at 70-block intervals on the east sidewalk, on 1-block-tall stone-brick pedestals:
   - `teddy-bear` at block 70.
   - `macaw-statue` at block 140.
   - `parrot-statue` at block 210.
   - `flying-eagle` at block 280.
   - `villager-statue` at block 350 (on the material transition).
   - `enderman` at block 420 (the "boss" at the city approach).
3. **Place the 3 milestones** at the center of the west sidewalk, on 2-block-tall oak-fence posts with 2 × 1 oak signs:
   - "OLD TOWN 1/4 MILE" at block 100.
   - "OLD TOWN CENTER — CUTE HOUSE PLAZA" at block 250.
   - "CITY APPROACHING — STREAM CROSSING 100 m" at block 400.
4. **Build the material transition at block 350:**
   - A 5-block-long gradient strip where stone brick gives way to polished granite, block-by-block.
   - The villager-statue sits *on* the transition.
5. **Build the granite-and-glass segment (blocks 350–425):**
   - Replace the stone-brick surface with polished granite.
   - Add glass-pane inserts every 8 blocks on the sidewalks (matching the new city's skybridge material).
6. **Build the stream bridge at block 380:**
   - First, dig a 3-block-wide × 3-block-deep trench for the stream (the stream flows from the new city's ravine southward).
   - Then build a 5-block-wide × 3-block-long × 1-block-tall stone-brick arch over the stream.
   - Add 1-block-tall stone-brick railings on each side, with 1-block gaps.
7. **Install the lighting:**
   - Sea lantern every 10 blocks on 2-block-tall oak-fence posts at the *edge* of the road (between the road and the sidewalk). 43 sea lanterns total.
   - 1 sea lantern on each statue's pedestal (6 total).
   - 1 sea lantern on top of each milestone signpost (3 total).
8. **Build the connecting dirt path** from the Grand Avenue's south end (0, 0, 500) to the old town plaza, 1 block wide, 5 blocks long.

**Quality checkpoint:**
- [ ] Roadbed laid: 4-block stone brick, 2-block sidewalks each side.
- [ ] 6 statues placed at 70-block intervals.
- [ ] 3 milestones placed at blocks 100, 250, 400.
- [ ] Material transition at block 350.
- [ ] Stream bridge at block 380.
- [ ] 43 sea lanterns on the Avenue.
- [ ] Connecting dirt path to the old town plaza.
- [ ] Walk the full 425 blocks and time it (target: 10–12 minutes at walking pace).

---

### Phase 4: Rail spur (estimated: 2–3 days of in-world time)

**Goal:** build the 960-block coastal-plain rail spur with 3 named stations.

**Sub-steps:**

1. **Build the pavilion connector:**
   - 200-block east-west rail from the new world Gateway pavilion at (0, 0, 700) to the spur at (200, 0, 700).
   - 1-block-wide dirt path alongside the rail.
2. **Build the main line:**
   - 630-block north-south rail from (200, 0, 700) to (200, 0, 70) along the X = 200 axis.
   - 3-block cross-section: 1 rail + 1 oak-plank walkway (east) + 1 grass utility strip (west).
3. **Build the old town spur:**
   - 200-block west rail from (200, 0, 500) to (0, 0, 500).
   - 1-block-wide oak-plank path connecting the spur to the old town station.
4. **Place the powered rails:**
   - 1 powered rail every 8 blocks on the centerline (1 powered rail, 7 regular rails, repeat).
   - 1 redstone torch under each powered rail (on the utility-strip side).
   - 1 redstone repeater every 16 blocks.
   - 1 redstone block at the new world Gateway station as the power source, with redstone dust running the length of the spur.
5. **Build the 3 named stations:**
   - **New world Gateway station** at (200, 0, 700): 7 × 7 oak-plank platform, sign, powered-rail activator, chest with 4 spare minecarts, "Cities: Old Town Plaza, City Approach" sign, 1-block-wide dirt path to the pavilion.
   - **Old town station** at (0, 0, 500): 5 × 7 spruce-plank platform, sign, 1-block-wide oak-plank path connecting to the Cute houses.
   - **City approach station** at (200, 0, 70): 7 × 7 stone-brick platform, sign, 1-block-wide path connecting to the Grand Avenue's north end.
6. **Test the minecart ride:**
   - Spawn a minecart at the new world Gateway station.
   - Ride the rail to the old town station. Verify the cart maintains speed.
   - Ride the rail to the city approach station. Verify the cart maintains speed.
   - Test the reverse direction (city approach → old town → new world Gateway).
   - Test the side trips (new world Gateway → old town spur → back).

**Quality checkpoint:**
- [ ] Pavilion connector built (200 blocks).
- [ ] Main line built (630 blocks).
- [ ] Old town spur built (200 blocks).
- [ ] Powered rails every 8 blocks.
- [ ] Redstone wiring functional.
- [ ] 3 named stations built.
- [ ] Minecart ride tested in both directions, including side trips.
- [ ] Ride the full 1,030 blocks and time it (target: 5–7 minutes at full speed).

---

### Phase 5: Gateway pavilions (estimated: 1 day of in-world time)

**Goal:** build the 2 matching Gateway pavilions (one in the existing world, one in the new world) with the obsidian portal frames and `/tp` command blocks.

**Sub-steps:**

1. **Build the new-world Gateway pavilion** at (0, 0, 700):
   - 7 × 7 cross-section, 6 blocks tall.
   - Oak-plank walls (1-block thick) with 2-block-tall glass-pane windows on all 4 faces.
   - Light gray stained glass roof.
   - 4 × 5 obsidian-and-glowstone portal frame in the center, oriented north-south.
   - Sign above the frame: "YOU ARE IN THE COMBINED COMPLEX — CITY HUB — 0,000 m FROM CITY CENTER".
   - 1 × 1 pressure plate in the center of the floor (welcome plate).
   - Hidden `/tp` command block behind the frame, running `tp @p 935 60 280`.
   - Lectern with a written book titled "A Visitor's Guide to the Combined Complex."
   - Oak-stairs bench along the north wall.
   - Minecart on a 1-block-gauge rail extending out of the south face.
   - 1-block-wide dirt path extending north to the Grand Avenue.
   - 2 × 1 oak sign at the entrance.
   - Sea lantern at the center of the ceiling, 4 glowstone at the corners of the obsidian frame.
2. **Build the existing-world Gateway pavilion** at (935, 60, 280) — in the *existing* bot world, 3 blocks south of the existing bot base:
   - Same 7 × 7 cross-section, 6 blocks tall.
   - **Stone-brick walls** (instead of oak plank) with glass-pane windows.
   - Same light gray stained glass roof.
   - Same 4 × 5 obsidian-and-glowstone portal frame.
   - Sign above: "GATEWAY TO THE COMBINED COMPLEX — 0,000 m".
   - 1 × 1 pressure plate in the center (entering plate).
   - Hidden `/tp` command block running `tp @p 0 60 700`.
   - Same lectern with the same written book.
   - Same bench.
   - 2 × 1 oak sign at the entrance.
   - Same lighting (sea lantern + 4 glowstone).
3. **Test the portal transit:**
   - In the existing world, walk to the pavilion, step on the pressure plate, step through the frame. Verify teleportation to the new world's (0, 60, 700).
   - In the new world, step on the pressure plate, step through the frame. Verify teleportation to the existing world's (935, 60, 280).
   - Verify the screen-fade (the `/tp` command block should produce a brief black screen; if the world-portal datapack is available, it produces a more elegant fade).
4. **Test the rail connection** from the new-world pavilion to the new-world Gateway station: spawn a minecart at the pavilion, ride to the station (200 blocks), verify the cart reaches the station at full speed.

**Quality checkpoint:**
- [ ] New-world pavilion built with all features (walls, windows, roof, frame, signs, lectern, bench, minecart, command block, lighting).
- [ ] Existing-world pavilion built with all features (same as above, stone-brick instead of oak).
- [ ] Portal transit tested in both directions.
- [ ] Rail connection tested.
- [ ] Both pavilions have the same written book.
- [ ] Both pavilions have matching signs and lighting.

---

### Phase 6: Underground easter egg (estimated: 0.5 days of in-world time)

**Goal:** place the `underground-base.schem` at (−50, 0, 550), partially buried, with the historical sign, interior chest, and glass viewing window.

**Sub-steps:**

1. **Inspect the schematic** with a schematic-inspector tool (Python or Node.js script):
   - Confirm the schematic's footprint (expected: 5 × 5 × 3).
   - Check for legacy block IDs.
   - If incompatible, build a hand-built replica (5 × 5 × 3 stone-brick room with a chest, crafting table, and redstone lamp).
2. **Place the `mushroom-cottage`** at the residential cluster's western edge, at approximately (−50, 0, 540). The cottage's basement will host the easter egg's entrance.
3. **Build the entrance:**
   - A 1-block-wide opening at the cottage's basement level, with a 1 × 1 oak door.
   - A 2-block-wide × 2-block-tall tunnel from the basement to the underground-base's location at (−50, 0, 550).
4. **Place the `underground-base.schem`** at (−50, 0, 550), with the floor at Y = −3 and the roof at Y = +2.
5. **Add the burial:**
   - 2–3 blocks of dirt and cobblestone above the schematic's roof.
   - A 1 × 1 oak sign on a fence-post at the surface, reading "THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD IN THE WORKSPACE. IT WAS THE SEED OF THE COMBINED COMPLEX. THE SUBTROPOLIS CHAMBER IS ITS DESCENDANT."
6. **Build the interior:**
   - 1 chest at the center of the schematic's floor, containing the written book + "SubTropolis Engineer" name tag + 1 stone pickaxe + 1 stone shovel.
   - 1 redstone lamp at the center of the ceiling, toggled by a pressure plate at the entrance.
   - 1 soul lantern at the center of the ceiling (the only lighting inside).
7. **Build the glass viewing window:**
   - 1 × 1 glass block in the floor of the old town central plaza at (0, 0, 500), in a *corner* of the plaza near the Cute houses.
   - 1 × 1 oak sign on a fence-post, reading "LOOK DOWN — THE FIRST UNDERGROUND BUILD IN THE WORKSPACE LIES BENEATH YOU."

**Quality checkpoint:**
- [ ] Schematic inspected and confirmed (or replica built).
- [ ] `mushroom-cottage` placed at the western edge of the residential cluster.
- [ ] Entrance built (1-block-wide opening + 2 × 2 tunnel).
- [ ] `underground-base.schem` placed at (−50, 0, 550) with the correct burial.
- [ ] Historical sign installed.
- [ ] Interior chest, redstone lamp, soul lantern installed.
- [ ] Glass viewing window placed in the plaza floor.
- [ ] Plaza sign installed.
- [ ] The easter egg is *discoverable* but not *obvious* (the entrance is at the back of a house, the glass window is in a corner).

---

### Phase 7: Inter-build coordination (estimated: 0.5–1 day of real time, not in-world)

**Goal:** update the data layer, the bot missions, the squads, the markers, the zones, the routes, and the supply chains. This is *not* an in-world build phase — it is a *data layer* build phase.

**Sub-steps:**

1. **Update `data/markers.json`:**
   - Rename the 6 placeholder markers to: `mkr_city_center`, `mkr_public_shaft_top`, `mkr_subtropolis_chamber_center`, `mkr_cheyenne_outer_portal`, `mkr_ravine_bottom`, `mkr_old_town_center`.
   - Add 2 new Gateway markers: `mkr_gateway_existing_world` at (935, 60, 280), `mkr_gateway_new_world` at (0, 0, 700).
   - Add 3 new rail spur station markers: `mkr_spur_new_world_gateway`, `mkr_spur_old_town`, `mkr_spur_city_approach`.
   - Add 1 Grand Avenue marker: `mkr_grand_avenue_center` at (0, 0, 285).
   - Add 1 underground easter egg marker: `mkr_old_town_underground_easter_egg` at (−50, 0, 550).
   - Add 1 Cheyenne return portal marker: `mkr_cheyenne_return_portal` at (0, 0, −420).
2. **Update `data/zones.json`:**
   - Rename the 2 placeholder "Mining Area" zones to: `zne_subtropolis_chamber`, `zne_cheyenne_chamber`.
   - Add the spatial extents from the 04-masterplan.
3. **Update `data/squads.json`:**
   - Map the 6 empty squads to 6 named squads: `sqd_che_outer_portal_guard`, `sqd_sub_chamber_patrol`, `sqd_pub_shaft_operator`, `sqd_svc_tunnel_maintenance` (extended to cover the rail spur), `sqd_old_town_ranger`, `sqd_ravine_response`.
4. **Update `data/missions.json`:**
   - Re-target the `birch house` mission: from (904, 79, 390) to (0, 0, 480) (residential cluster).
   - Re-target the `md castle 2` mission: from (973, 1, 453) to (200, 0, 500) (castle cluster).
5. **Update `data/commands.json`:**
   - Mark the 1 historical `walk_to_coords(100, 64, 200)` command as completed and re-targeted to (0, 0, 500) (the old town plaza).
6. **Create `data/routes.json`:**
   - Add 2 named routes: `rte_coastal_plain_rail_spur` (the rail spur), `rte_visitor_journey_full` (the 6-marker descent).
7. **Create `data/supply_chains.json`:**
   - Add 1 supply chain for the rail spur's powered-rail maintenance: rails, powered rails, redstone, minecarts as recurring supplies.
8. **Rename `Pokémon Temple Arena.schem` to `pokemon-temple-arena.schem`** in plain ASCII, to fix the mojibake encoding. (The file is *deferred* to a future "attractions zone," not placed in this build.)
9. **Test the data layer:**
   - Verify all markers resolve to valid coordinates.
   - Verify all squads have at least 1 bot assigned (or are explicitly *empty* by design).
   - Verify all routes are well-formed (start, end, waypoints).
   - Verify all supply chains have at least 1 item.

**Quality checkpoint:**
- [ ] All markers renamed and added.
- [ ] All zones renamed with spatial extents.
- [ ] All squads mapped to named roles.
- [ ] 2 bot missions re-targeted.
- [ ] 1 historical command resolved.
- [ ] 2 new files created (`routes.json`, `supply_chains.json`).
- [ ] Mojibake filename renamed.
- [ ] Data layer tested: all references resolve.

---

## 3. Tools & Workflow

### 3.1 Schematic placement

The existing `mc-fleet-bot` schematic placement tools are reused. The build team should use the existing schematic library at `D:\projects\mc-fleet-bot\schematics\` and the existing `WorldEdit` (or equivalent) commands to place schematics in the new world.

**Workflow:**

1. **Copy** the schematic from the existing world to the new world's coordinates using `//schem load <name>`, `//pos1`, `//pos2`, `//schem paste`.
2. **Verify** the placement: walk around the placed schematic, check for missing blocks, check for legacy block IDs, check for tile entities (chests, signs).
3. **Add the historical sign** (a 1 × 1 oak sign on a fence-post at the schematic's entrance or front face).
4. **Mark the schematic as placed** in a new `placed_schematics.json` file (recommended — see the open items in the development plan).

### 3.2 `/tp` command blocks

The `/tp` command blocks for the Gateway portals are placed using standard Minecraft commands:

```
/give @p command_block
/setblock <x> <y> <z> command_block
```

The command block contains:

```
tp @p 0 60 700
```

(new-world pavilion) or:

```
tp @p 935 60 280
```

(existing-world pavilion).

The command block is hidden behind the obsidian portal frame, with redstone dust connecting it to a 1 × 1 pressure plate on the floor of the pavilion. When the visitor steps on the pressure plate, the command block activates and teleports the visitor.

### 3.3 Powered rails

The rail spur's powered rails are placed using the existing `mc-fleet-bot` minecart infrastructure. The build team should:

1. **Lay the rail** using standard Minecraft rail placement.
2. **Place the powered rail** every 8 blocks, with a redstone torch underneath each one.
3. **Place the redstone repeater** every 16 blocks (between powered rails) to maintain the signal.
4. **Place a redstone block** at the new world Gateway station as the power source, with redstone dust running the length of the spur.

The visitor rides a minecart at full speed (~8 m/s) on the powered rail. The cart is launched by a stone button on the new world Gateway station platform.

### 3.4 Existing schematic library

The existing schematic library at `D:\projects\mc-fleet-bot\schematics\` is *unchanged* — all 113 files remain. The build team does not need to *modify* the schematics; they only need to *copy* them to the new world's coordinates.

The exception is `underground-base.schem`, which must be *inspected* before placement (per §6 of the design plan and Phase 6 of the working plan). The inspection is a *read-only* operation; the schematic file itself is not modified.

---

## 4. Quality Checkpoints

After each phase, the build team must verify the deliverables before proceeding to the next phase. The quality checkpoints are listed in each phase above; the *meta-checkpoints* are:

### 4.1 After Phase 1 (new world prep)

- The world is created with the correct parameters (1,500 × 1,500, 1,024+ build height, origin (0, 0, 0), default world type, coastal plain + mountain range terrain).
- The spawn point is at the new world Gateway pavilion location.
- The base infrastructure is installed (dirt path, starter kit, sign).
- **The visitor can spawn into the new world and see the coastal plain, the old town site, the new city site, and the mountain range.**

### 4.2 After Phase 2 (old town)

- All 30–35 schematics are placed in the correct clusters.
- All historical signs are installed.
- The internal roads are built.
- The central plaza is built (fountain, paths).
- **The visitor can walk the 7 clusters in 15 minutes and read the historical signs.**

### 4.3 After Phase 3 (Grand Avenue)

- The 425-block roadbed is laid.
- The 6 statues, 3 milestones, material transition, and stream bridge are in place.
- The 43 sea lanterns are installed.
- **The visitor can walk the full 425 blocks in 10–12 minutes and experience the 12 visual events (6 statues, 3 milestones, transition, bridge, enderman).**

### 4.4 After Phase 4 (rail spur)

- The 1,030 blocks of rail are laid (200 pavilion connector + 630 main line + 200 old town spur).
- The powered rails, redstone torches, and redstone repeaters are functional.
- The 3 named stations are built.
- **The visitor can ride the full 1,030 blocks in 5–7 minutes at full speed, with no derailing.**

### 4.5 After Phase 5 (Gateway pavilions)

- Both pavilions are built with all features.
- The portal transit works in both directions.
- The rail connection from the new-world pavilion to the new-world Gateway station is functional.
- **The visitor can step from the existing world into the new world and back, experiencing the same obsidian frame in both.**

### 4.6 After Phase 6 (underground easter egg)

- The schematic is placed (or a replica is built) with the correct burial.
- The historical sign, interior chest, redstone lamp, and soul lantern are installed.
- The glass viewing window is in the plaza floor.
- **The visitor can find the easter egg by exploring the residential cluster's western edge, or by looking down through the glass window in the plaza.**

### 4.7 After Phase 7 (inter-build coordination)

- All data layer changes are in place.
- All 14 markers are correctly named and resolved.
- All 6 squads are mapped to named roles.
- The 2 bot missions are re-targeted.
- The 2 new files (`routes.json`, `supply_chains.json`) are created.
- **The bot fleet can be re-deployed with the new data layer, and the bots can find every marker, navigate every route, and maintain every supply chain.**

### 4.8 The visitor journey timing (60–90 minutes)

After all 7 phases, the build team must verify the full visitor journey:

- **Spawn at new world Gateway:** 0 min.
- **Walk to old town:** 10 min.
- **Explore old town:** 15 min.
- **Walk Grand Avenue to new city:** 10 min.
- **Explore new city:** 10 min.
- **Public shaft descent:** 5 min.
- **SubTropolis exploration:** 15 min.
- **Service tunnel minecart ride:** 5 min.
- **Cheyenne exploration:** 10 min.
- **Return via portal:** < 1 min.
- **Total:** 80 min (the midpoint of the 60–90 min target).

If the total is < 60 min, the build is *too sparse* (the visitor is not getting the full experience). If the total is > 90 min, the build is *too dense* (the visitor is overwhelmed). The target is 80 min, with a 10-min tolerance on either side.

### 4.9 The historical sign for each re-placed schematic

After Phase 2, every re-placed schematic must have a historical sign. The build team must verify:

- Every schematic has a 1 × 1 oak sign on a fence-post at its entrance or front face.
- The sign's text matches the format: "<SCHEMATIC NAME> — Placed by the mc-fleet-bot fleet, 2026" (or the appropriate variant for the Cute houses, the Space Mountain, and the underground-base).
- The 2 Cute houses have the founding plaque crediting the historical CuteHouse1/2 bots.

---

## 5. Risk Register

The map integration has 6 named risks, each with a *likelihood* (low/medium/high), an *impact* (low/medium/high), and a *mitigation* strategy.

### Risk 1: The existing bot world is a production world; testing legacy block IDs requires a sandbox

- **Likelihood:** high (the existing bot world has live bots, live missions, and live data).
- **Impact:** high (testing in the production world could damage the bots' state).
- **Mitigation:** create a *sandbox world* for schematic testing. The sandbox is a fresh Minecraft world (not the existing bot world, not the new combined complex world) where the build team can test the `underground-base.schem` and any other legacy schematic before placement. The sandbox is *throwaway* — once the schematics are verified, the sandbox is deleted.
- **Owner:** the design team must create the sandbox before Phase 6.

### Risk 2: The mojibake filename issue

- **Likelihood:** high (the `Pokémon Temple Arena.schem` filename is mojibake-encoded).
- **Impact:** low (the file works; the filename is just hard to read).
- **Mitigation:** rename the file to `pokemon-temple-arena.schem` in plain ASCII, per Phase 7. The file is *deferred* to a future "attractions zone," not used in this build.
- **Owner:** the build team must rename the file before Phase 7.

### Risk 3: The 6 empty markers need to be renamed without disrupting bot operations

- **Likelihood:** medium (the 6 empty markers are placeholder entries with no spatial coordinates).
- **Impact:** medium (renaming is a data layer operation; the bots do not depend on the marker names, but the data layer's integrity is at stake).
- **Mitigation:** perform the rename in a *single transaction* in `data/markers.json`, with a backup of the original file. Verify the rename with a schema check (all markers must have valid IDs, coordinates, and tags).
- **Owner:** the data layer owner (per the discussion-notes.md §6.3).

### Risk 4: The world-transit mechanism (Gateway portal)

- **Likelihood:** low (the `/tp` command block is a vanilla Minecraft feature).
- **Impact:** high (if the transit fails, the two worlds are *disconnected*).
- **Mitigation:** test the `/tp` command block in the sandbox before placing it in the Gateway pavilions. If the bot team has a world-portal datapack, use it instead (the datapack is more elegant and produces a visual portal effect).
- **Owner:** the bot team (per the discussion-notes.md §5 open question 4).

### Risk 5: The rail spur's powered-rail network requires consistent redstone

- **Likelihood:** medium (redstone wiring is fragile; a single broken connection can halt the entire spur).
- **Impact:** medium (a broken rail means the visitor cannot ride the spur; they must walk the Grand Avenue instead, which adds 10–12 minutes to the journey).
- **Mitigation:** test the rail spur in sections (new world Gateway → old town, then old town → city approach) before connecting the full 1,030 blocks. Use redstone repeaters to maintain the signal. Place a *backup* redstone block at each station in case the main power source fails.
- **Owner:** the build team.

### Risk 6: The visitor journey timing drifts (60–90 min target)

- **Likelihood:** medium (the timing depends on the visitor's pace, the schematic density, and the lighting).
- **Impact:** low (the journey can be 60 min or 90 min without breaking the experience).
- **Mitigation:** after Phase 7, do a *timed walkthrough* of the full journey. If the timing is < 60 min, add more detail to the old town or the Grand Avenue (e.g., additional statues, additional signs). If the timing is > 90 min, simplify the old town or remove some Grand Avenue features.
- **Owner:** the design team.

### Risk 7: The schematic-inspector tool does not exist

- **Likelihood:** high (per the discussion-notes.md §5 open question 2, no schematic-inspector tool is currently in the workspace).
- **Impact:** medium (without the inspector, the build team cannot confirm the `underground-base.schem`'s footprint, block types, or legacy block IDs).
- **Mitigation:** build a schematic-inspector tool before Phase 6. The tool is a small Python or Node.js script that reads the `.schem` file (gzipped NBT) and reports the schematic's footprint, block types, and tile entities. The script is reusable for future schematic inspections.
- **Owner:** the design team (the script is a *deliverable* of the map integration).

### Risk 8: The default-spawn determination for a new world

- **Likelihood:** low (the spawn point is a Minecraft world property, easily set).
- **Impact:** low (if the spawn is wrong, the visitor spawns at a random location, not at the Gateway pavilion).
- **Mitigation:** set the spawn point explicitly in Phase 1 using the `/setworldspawn` command, and verify with a `/tp @p 0 60 700` test.
- **Owner:** the build team.

---

**End of working plan.** This document is the *construction contract* between the design team and the build team. The 7 phases above specify the build order, the tools, the quality checkpoints, and the risks. The downstream AI contractor brief (out of scope for this document) will use this working plan as the *primary input*.
