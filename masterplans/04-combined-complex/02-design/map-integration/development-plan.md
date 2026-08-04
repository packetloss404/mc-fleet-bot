# Map Integration — Development Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex, Map Integration (5th and final deliverable)
**Author role:** Architectural Designer (longer-term evolution)
**Date prepared:** 2026-08-02
**Status:** **SUPERSEDED FOR CURRENT-WORLD PLACEMENT — HISTORICAL ROADMAP ONLY**
**Companion to:** `design-plan.md` (the architectural spec), `working-plan.md` (the construction sequence), `discussion-notes.md` (the binding deliberation)

> **Authority notice.** This roadmap belongs to the retired separate-world integration scheme. The plan to develop is Masterplan 05 through [../../AUTHORITY.md](../../AUTHORITY.md). No world edits are authorized.

> **Scope.** This document specifies the *longer-term evolution* of the map integration — the minimum viable product, the phased delivery from v0.1 to v2.0, the future extensions beyond v2.0, and the open items that require user input. It is the *roadmap* — the build team can use it to plan releases, the design team can use it to prioritize features, and the user can use it to decide what to build next.

---

## 1. MVP Definition

### 1.1 The minimum viable product

The MVP is the *minimum viable map integration that captures the soul*. The soul, per the culture-architecture analysis, is **"the existing bot world is the seed; the new combined complex is the flower. The old town is the petal the seed grew from. The visitor walks through both in a single Minecraft life, and the experience is *one world that knows its own history*."**

The MVP must capture *3 of the 4 elements* of this soul:

1. ✅ The two worlds as one experience (the Gateway connection).
2. ✅ The old town as the historical layer (the schematic library re-placed).
3. ❌ The Grand Avenue as the urban design choice — *MVP-omitted* (the visitor can walk a *dirt path* from the old town to the new city in the MVP; the stone-brick Grand Avenue is v0.5).
4. ✅ The new world's 1,500 × 1,500 footprint with the 1,024+ build height.

### 1.2 The MVP build list

The MVP consists of:

- **New world** (Phase 1 of the working plan): 1,500 × 1,500 footprint, 1,024+ build height, world origin (0, 0, 0), coastal plain + mountain range + ravine terrain, spawn point at the new world Gateway pavilion location.
- **Old town, v0.1 subset** (Phase 2 of the working plan, abbreviated): 10–15 schematics in 4 of the 7 clusters, with the Cute houses as the historical anchor.
  - **Cluster 1 (Residential):** 2 Cute houses at the plaza center + 5 small houses around the plaza + 1 victorian palace on the north hill. (8 builds.)
  - **Cluster 2 (Castle/Fortress):** 1 build (the `md castle 2` on a 5-block-tall hill). (1 build.)
  - **Cluster 3 (Temple):** 1 build (the `japanese-pagoda` on a 5-block-tall hill). (1 build.)
  - **Cluster 5 (Theme park):** 0 builds (deferred to v2.0; the Space Mountain is a *large* build that requires a 30 × 30 cleared area and a 3-block-wide oak-plank road).
  - **Cluster 4 (Statue/Ornament):** 2 builds (the `stone-statue` and the `dragon-egg` on the 4 × 30 ornamental avenue). (2 builds.)
  - **Cluster 6 (Underground easter egg):** 0 builds (deferred to v1.5).
  - **Cluster 7 (Cute house anchor):** folded into Cluster 1.
  - **Total:** 12 schematics in 4 clusters.
- **Gateway pavilion (new world only):** a single 7 × 7 wooden pavilion at (0, 0, 700), with the obsidian portal frame, sign, written book, and `/tp` command block. The existing-world Gateway pavilion is *deferred* to v0.5 (the MVP can be tested in single-player without the existing-world connection).
- **Dirt path from the old town to the new city:** a 1-block-wide × 425-block-long dirt path, replacing the Grand Avenue. The path is *unpaved* — it is a *rough trail*, not a *promenade*.
- **1–2 named markers** in `data/markers.json`: `mkr_old_town_center` and `mkr_city_center` (the 2 most important markers).

### 1.3 The MVP visitor experience

The MVP visitor experience is:

1. **Spawn at the new world Gateway pavilion** (0, 0, 700).
2. **Walk the dirt path to the old town plaza** (10 min).
3. **Explore the 4 clusters** (15 min): 2 Cute houses, 5 small houses, victorian palace, castle, pagoda, stone-statue, dragon-egg. Read the historical signs.
4. **Walk the dirt path back to the new city** (10 min).
5. **Explore the new city** (10 min, the 04-masterplan's 138 × 138 downtown).
6. **Public shaft descent + SubTropolis + service tunnel + Cheyenne** (35 min, per the 04-masterplan).
7. **Return via portal** (< 1 min).
- **Total:** 80 min, with the same 60–90 min target.

The MVP does *not* include the Grand Avenue, the rail spur, the existing-world Gateway pavilion, the Space Mountain, the underground easter egg, or the full 6-marker fast-travel system. The MVP *does* include the soul: the visitor walks through two worlds, sees the old town's history, and experiences the new world's future.

### 1.4 The MVP value

The MVP is the *minimum* that lets the user *see* the soul. The MVP is small enough to build in *2–3 days of focused work* (vs. the 10–15 days of the full build), but rich enough to demonstrate the integration architecture. The MVP is the *proof of concept* — if the user approves the MVP, the build team proceeds to v0.5; if the user wants changes, the changes are made on the MVP before the full build is committed.

---

## 2. Phased Delivery

The full build is delivered in **6 versions** (v0.1, v0.5, v1.0, v1.5, v2.0, v2.5). Each version has a *play experience* — what the visitor can do at that version — and a *build list* — what is built at that version.

### v0.1 — "The Old Town"

**What's included:**

- New world (Phase 1 of the working plan): 1,500 × 1,500 footprint, 1,024+ build height, terrain, spawn point.
- Old town, v0.1 subset: 12 schematics in 4 clusters (per §1.2 above).
- New world Gateway pavilion (single pavilion, no existing-world mirror).
- Dirt path from the old town to the new city.
- 2 named markers in `data/markers.json`: `mkr_old_town_center`, `mkr_city_center`.

**Play experience:**

The visitor spawns at the new world Gateway pavilion, walks the dirt path to the old town, explores the 4 clusters, walks the dirt path back to the new city, explores the new city, and takes the public shaft down to the Combined Complex. The visitor does *not* have the Grand Avenue, the rail spur, the existing-world connection, or the full 6-marker fast-travel system. The visitor has the *soul* of the map integration — the two worlds as one experience, the old town as the historical layer — without the *connective tissue*.

**Estimated build time:** 2–3 days of focused work.

---

### v0.5 — "The Connection"

**What's included (additions to v0.1):**

- Existing-world Gateway pavilion (the mirror pavilion at (935, 60, 280)).
- Grand Avenue, stone-brick segment only: blocks 0–350 (the "old-town era" segment).
- 3 milestones on the Grand Avenue: "OLD TOWN 1/4 MILE" (block 100), "OLD TOWN CENTER" (block 250), "CITY APPROACHING" (block 400).
- 4 of the 6 statues on the Grand Avenue: `teddy-bear`, `macaw-statue`, `parrot-statue`, `flying-eagle` (blocks 70, 140, 210, 280).
- 1 new marker: `mkr_grand_avenue_center` at (0, 0, 285).
- 1 new route in `data/routes.json`: `rte_grand_avenue` (the Grand Avenue route).
- 1 new data file: `data/routes.json` (created in this version).

**Play experience:**

The visitor can now enter the new world from *either* the new world Gateway pavilion (default spawn) or the existing-world Gateway pavilion (via the existing bot base). The visitor walks the *stone-brick half* of the Grand Avenue — the first 350 blocks — and experiences the 4 statues and 3 milestones. The visitor does *not* yet have the granite-and-glass segment (blocks 350–425), the stream bridge, the material transition, the villager-statue, or the enderman.

**Estimated build time:** 1–2 days of focused work (additive to v0.1).

---

### v1.0 — "The Rail"

**What's included (additions to v0.5):**

- Grand Avenue, granite-and-glass segment: blocks 350–425 (the "city-era" segment).
- Material transition at block 350.
- Stream bridge at block 380.
- 2 remaining Grand Avenue statues: `villager-statue` (block 350, on the transition) and `enderman` (block 420, the "boss" at the city approach).
- Coastal-plain rail spur: 1,030 blocks of rail (200 pavilion connector + 630 main line + 200 old town spur), with 3 named stations and the powered-rail network.
- 3 new rail spur markers in `data/markers.json`: `mkr_spur_new_world_gateway`, `mkr_spur_old_town`, `mkr_spur_city_approach`.
- 1 supply chain in `data/supply_chains.json` (created in this version): powered-rail maintenance.
- 1 squad mapping: `sqd_svc_tunnel_maintenance` extended to cover the rail spur.

**Play experience:**

The visitor can now ride the rail spur from the new world Gateway station to the old town station, then walk the old town, then walk the *full* Grand Avenue (including the granite-and-glass segment, the material transition, the stream bridge, the villager-statue, and the enderman) to the new city. The visitor has the *complete* Grand Avenue and the *complete* rail spur. The visitor does *not* yet have the underground easter egg, the full 30–35 old town, or the deferred theme-park and attractions zone.

**Estimated build time:** 2–3 days of focused work (additive to v0.5).

---

### v1.5 — "The Easements"

**What's included (additions to v1.0):**

- Underground easter egg: the `underground-base.schem` placed at (−50, 0, 550), partially buried, with the historical sign, interior chest, redstone lamp, and soul lantern. The 1 × 1 glass viewing window in the old town plaza floor.
- Schematic-inspector tool (Python or Node.js script) — a *deliverable* of the map integration, reusable for future schematic inspections.
- The `mushroom-cottage` placed at the residential cluster's western edge, with the easter egg's entrance at its basement.
- 1 new marker: `mkr_old_town_underground_easter_egg` at (−50, 0, 550).
- Mojibake filename fix: `Pokémon Temple Arena.schem` renamed to `pokemon-temple-arena.schem` in plain ASCII.

**Play experience:**

The visitor can now find the *only* underground build in the entire workspace, by exploring the residential cluster's western edge (and digging into the `mushroom-cottage`'s basement) or by looking down through the glass viewing window in the old town plaza. The visitor can read the historical sign ("THIS STRUCTURE IS THE ONLY EXISTING UNDERGROUND BUILD IN THE WORKSPACE. IT WAS THE SEED OF THE COMBINED COMPLEX. THE SUBTROPOLIS CHAMBER IS ITS DESCENDANT.") and the chest's written book.

**Estimated build time:** 0.5–1 day of focused work (additive to v1.0).

---

### v2.0 — "The Integration"

**What's included (additions to v1.5):**

- Full old town: 30–35 schematics in all 7 clusters (per the design-plan.md §2).
- Disneyland Space Mountain placed at (100, 0, 600) as the old town tourist attraction.
- Full internal road network in the old town (oak-plank roads connecting all 7 clusters).
- 2 new markers: `mkr_gateway_existing_world` at (935, 60, 280), `mkr_gateway_new_world` at (0, 0, 700).
- 6 empty squads in `data/squads.json` mapped to 6 named squads.
- 2 placeholder "Mining Area" zones in `data/zones.json` renamed to `zne_subtropolis_chamber` and `zne_cheyenne_chamber` (with spatial extents from the 04-masterplan).
- 2 bot missions in `data/missions.json` re-targeted: `birch house` to (0, 0, 480), `md castle 2` to (200, 0, 500).
- 1 historical `walk_to_coords` command in `data/commands.json` resolved.
- 1 new return portal at the Cheyenne outer portal: `mkr_cheyenne_return_portal` at (0, 0, −420).
- 1 new route in `data/routes.json`: `rte_visitor_journey_full` (the 6-marker descent).
- Full 6-marker fast-travel system: command-block menu at the new world Gateway pavilion with `/tp` to all 6 markers.
- All 14 markers named and resolved in `data/markers.json`.

**Play experience:**

The visitor has the *complete* map integration. The visitor spawns at the new world Gateway pavilion, walks (or rides the rail) to the old town, explores all 7 clusters (including the Space Mountain), finds the underground easter egg, walks the full Grand Avenue (all 6 statues, 3 milestones, material transition, stream bridge, enderman), explores the new city, descends the public shaft, explores the SubTropolis, rides the service tunnel, explores Cheyenne, and returns via the portal. The visitor can fast-travel to any of the 6 named markers after the first descent. The visitor has the *full 60–90 minute* experience, and the *full data layer integration* with the bot fleet.

**Estimated build time:** 3–5 days of focused work (additive to v1.5).

---

### v2.5 — "The Polish" (post-launch, future)

**What's included (additions to v2.0):**

- World-portal datapack (if the bot team has one) replacing the `/tp` command blocks at the Gateway pavilions, with screen-fade and End-portal sound effects.
- City streetcar: a 1-block-gauge rail line through the new city's downtown, terminating at the city approach station.
- Historical plaque on each re-placed schematic with a *longer* narrative (per the culture-architecture analysis §2.4).
- Bot-operator missions: the 6 named squads have at least 1 bot assigned, with active patrol routes and supply chain runs.
- A "guided tour" datapack for new players: a 60-minute walkthrough with chat prompts, signposts, and timed teleports.

**Play experience:**

The map integration is *polished* — the world-portal datapack produces a visual portal effect, the city streetcar adds *intra-city* transit, the historical plaques provide deeper context, and the bot fleet is *operational* (the 6 named squads have bots assigned, the supply chains run, the patrol routes are active). The map integration is a *living world*, not a static build.

**Estimated build time:** 5–10 days of focused work (additive to v2.0). The v2.5 polish is *post-launch* and depends on user feedback and bot team capacity.

---

### 2.1 The version table

| Version | Theme | Build time (additive) | What the visitor can do |
|---|---|---|---|
| **v0.1** | The Old Town | 2–3 days | Spawn at the new world, walk the dirt path to the old town, explore 12 schematics, walk back to the new city, descend to the Combined Complex. |
| **v0.5** | The Connection | 1–2 days | Enter from the existing world via the Gateway pavilion, walk the stone-brick half of the Grand Avenue. |
| **v1.0** | The Rail | 2–3 days | Ride the rail spur, walk the full Grand Avenue (with the granite-and-glass segment, material transition, stream bridge, enderman). |
| **v1.5** | The Easements | 0.5–1 day | Find the underground easter egg, read the historical sign, see the glass viewing window. |
| **v2.0** | The Integration | 3–5 days | Full 60–90 minute experience, all 30–35 schematics, all 6 markers, full data layer integration. |
| **v2.5** | The Polish | 5–10 days | World-portal datapack, city streetcar, historical plaques, bot-operator missions, guided tour datapack. |

**Total:** 14–24 days of focused work for v0.1 through v2.0, plus 5–10 days for v2.5.

---

## 3. Future Extensions

The v2.5 polish is one *direction* for future work. There are *5 named future extensions* beyond v2.5, each of which could be a separate project:

### 3.1 More schematics in the old town

The v2.0 build places 30–35 schematics in 7 clusters. The schematic library has 113 schematics. The remaining ~78 schematics could be placed in *expansions* of the old town — additional residential blocks, additional castle/temple clusters, additional statue/ornament avenues. The future extensions could expand the old town to *all 113 schematics*, with the *exclusions* from §2.4 (watercraft, beach content, etc.) handled by *separate zones*.

The *expansion* would require additional coastal-plain area (the 600 × 400 footprint would need to grow to 1,000 × 600 or larger) and additional internal roads. The 1,500 × 1,500 new world has room for this expansion — the current 600 × 400 old town uses only 16% of the available coastal plain.

### 3.2 The deferred Pokémon Temple Arena (after filename fix)

The Pokémon Temple Arena is *deferred* to a separate coastal-plain "attractions zone" outside the old town. The future extension would:

- Build a *new* "attractions zone" in the new world's coastal plain, at approximately (1,000, 0, 500) — east of the old town, beyond the rail spur.
- The attractions zone is a *theme park district* with the Pokémon Temple Arena as its anchor.
- The attractions zone uses a *different* material palette (smooth stone + quartz) to mark it as a *different era* (per the discussion-notes.md §4 tradeoff 1).
- The mojibake filename is fixed (renamed to `pokemon-temple-arena.schem` in plain ASCII), and the file is placed in the attractions zone.

The attractions zone is a *theme park district*, not a continuation of the old town. It is a *different era* (post-2010s), and it has its own architectural language.

### 3.3 More rail stations

The v1.0 build has 3 named stations: new world Gateway, old town, city approach. The future extension would add *additional* stations:

- A "Castle Row" station at (200, 0, 500) — serving the castle/temple clusters.
- A "Coastal Plain" station at (200, 0, 600) — serving the statue/ornament cluster and the Space Mountain.
- A "Bot Base" station at (935, 60, 300) — in the *existing* world, serving the existing bot base. The bot base station would be the *terminus* of the rail spur in the existing world.

The additional stations would require *more rail* (each station adds a side-spur) and *more powered rails* (the additional length requires additional redstone wiring). The data layer would add *more station markers* and *more route waypoints*.

### 3.4 A second portal pair (to a third world)

The v2.0 build has *one* Gateway pair (existing world → new world). The future extension would add a *second* Gateway pair, connecting the new world to a *third* Minecraft world. The third world could be:

- A *Hub world* — a small Minecraft world with just the 6 Gateway pavilions (one to the existing bot world, one to the combined complex, one to a fourth world, etc.). The Hub world is a *transit hub*, not a *destination*.
- A *Seasonal world* — a Minecraft world with a different season (winter, summer, autumn). The seasonal world would have its own schematic library (winter houses, summer houses, autumn houses) and its own visitor experience.
- A *Bot world* — a Minecraft world where the bot fleet is the *primary inhabitant*, with the visitor as a *guest*. The bot world would have a *visitor center* (similar to the Gateway pavilion) and a *bot tour* (the visitor follows a bot through the world).

The second portal pair is a *major* future extension, requiring a new Minecraft world, a new schematic library, and a new data layer integration. It is a *post-v2.5* project, not a v2.5 polish item.

### 3.5 Working minecart system (booster rails, stations, tickets)

The v1.0 build has a *passenger* rail spur — the visitor rides the minecart from the new world Gateway to the old town to the city approach. The future extension would add a *working* minecart system:

- **Booster rails** at the stations: the visitor pushes a button at the new world Gateway station, the booster rail launches the minecart at maximum speed, the cart maintains speed through the powered-rail network.
- **Station stops:** the visitor presses a button *at* a station to *stop* the cart (the button is connected to a powered-rail block that, when activated, *deactivates* the powered rail, slowing the cart to a stop).
- **Tickets:** a *ticket system* where the visitor must hold a specific item (a "ticket to Old Town" or a "ticket to City Approach") to board the minecart. The tickets are *craftable* (1 paper + 1 iron ingot = 1 ticket) and *tradeable* (a villager in the new world Gateway station sells tickets for emeralds).
- **Multiple minecarts:** the stations have *chests* with 4–8 spare minecarts, so multiple visitors can ride simultaneously.

The working minecart system is a *gameplay* extension — it adds *mechanics* to the existing *aesthetic* rail spur. The mechanics are *optional* (the visitor can still ride the rail spur without tickets or booster rails), but they add *depth* to the visitor experience.

---

## 4. Open Items for the User

The 7 binding decisions in the deliberation are *final*, but there are *6 open items* that require user input before the design team can proceed to the AI contractor brief:

### 4.1 The Pokémon Temple Arena schematic

The `Pokémon Temple Arena.schem` (63 KB, mojibake filename) is *deferred* to a separate coastal-plain "attractions zone" outside the old town. The user must decide:

- **Option A (defer to attractions zone):** build a new "attractions zone" in the new world's coastal plain, place the Pokémon Temple Arena there. The attractions zone uses a different material palette (smooth stone + quartz) to mark it as a different era.
- **Option B (drop entirely):** do not build the attractions zone; the Pokémon Temple Arena is *not* placed in the new world. The file is renamed to plain ASCII and archived.
- **Option C (force-fit in the old town):** place the Pokémon Temple Arena in the old town *anyway*, despite the 63 KB size and the mojibake filename. The build team accepts the *visual dominance* of the build.

The recommended option is **A** (defer to attractions zone), per the discussion-notes.md §4 tradeoff 1. But the user must confirm.

### 4.2 The schematics inspector

The `underground-base.schem` (1,048 bytes) must be inspected before placement. No schematic-inspector tool currently exists in the workspace. The user must decide:

- **Option A (build a new tool):** the design team builds a small Python or Node.js script to parse the `.schem` file. The script is a *deliverable* of the map integration, reusable for future schematic inspections.
- **Option B (use a third-party tool):** the design team uses a third-party schematic inspector (e.g., the Sponge schematic inspector, or a WorldEdit schematic reader).
- **Option C (skip the inspection):** the design team places the schematic *without* inspecting it, accepting the risk of legacy block IDs. If the schematic fails, the design team builds a hand-built replica at the same location.

The recommended option is **A** (build a new tool), per the working plan Risk 7. But the user must confirm.

### 4.3 The legacy block ID risk

The `underground-base.schem` may contain blocks that no longer exist in the current Minecraft world version. The user must decide:

- **Option A (sandbox test):** create a sandbox world for testing. The design team places the schematic in the sandbox first, verifies it works, then places it in the new world.
- **Option B (production test):** place the schematic directly in the new world, accepting the risk. If the schematic fails, the design team builds a hand-built replica.
- **Option C (no test, replica only):** do not place the schematic at all; build a hand-built replica (5 × 5 × 3 stone-brick room with a chest, crafting table, and redstone lamp) at the same location.

The recommended option is **A** (sandbox test), per the working plan Risk 1. But the user must confirm.

### 4.4 The world-transit mechanism

The Gateway portal is *visual* (obsidian frame) but the *transit* is a `/tp` command block (or a separate "world-portal" datapack). The user must decide:

- **Option A (`/tp` command block):** the design team uses a vanilla `/tp` command block. It is simple, vanilla, and works in any Minecraft version.
- **Option B (world-portal datapack):** the bot team builds a custom datapack that handles cross-world teleportation with screen-fade and End-portal sound effects. The datapack is more elegant but requires custom code.

The recommended option is **A** for the MVP, **B** for the v2.5 polish, per the design-plan.md §3.4. But the user must confirm.

### 4.5 The new world's spawn point and world type

The 04-masterplan specifies world origin (0, 0, 0), but the world *type* and the *spawn determination* are open. The user must decide:

- **Option A (default world with biomes):** the design team creates a default world with biomes. The terrain is generated by Minecraft's default world generator, with the coastal plain in the SW quadrant and the mountain range in the NE quadrant.
- **Option B (superflat world):** the design team creates a superflat world, then *manually* generates the mountain range and the ravine. The terrain is *deliberate*, but the build team must construct the terrain by hand (or with WorldEdit).
- **Option C (amplified world):** the design team creates an amplified world. The terrain is *extreme* (high mountains, deep valleys), but the build team has less control over the specific topography.

The recommended option is **A** (default world with biomes), per the working plan Phase 1. But the user must confirm.

### 4.6 The existing world's relationship to the new world after the integration

The deliberation chose "active, but secondary" — the bots stay in the existing world, the new world is the player experience. The user must decide:

- **Option A (preserve as-is):** the existing world is *preserved* with the existing bot fleet, the existing missions, the existing data. The new world is *additive* — it does not displace anything.
- **Option B (migrate bots to the new world):** the existing bot fleet is *migrated* to the new world. The 4 active bots (Lilly, Taylor, Marcus, Hazel) and the 9 historical bots are re-spawned in the new world. The existing world is *archived*.
- **Option C (migrate data layer only):** the existing world's *data layer* (markers, zones, squads, missions) is migrated to the new world, but the *bots* stay in the existing world. The new world has *fresh* bots (or *no* bots — the visitor is the only inhabitant).

The recommended option is **A** (preserve as-is), per the discussion-notes.md §5 open question 6. But the user must confirm.

### 4.7 Bonus open item: should the Grand Avenue be straight or curved?

The deliberation chose *straight* (per the Realist's argument that real grand avenues are straight). The user must confirm:

- **Option A (straight):** the Grand Avenue runs due north from the old town plaza to the new city's SE corner, a perfect straight line.
- **Option B (gentle curve):** the Grand Avenue has a *gentle curve* (1-block deviation per 50 blocks) that follows the topography of the coastal plain. The curve is *aesthetic* (the visitor sees the new city gradually as they walk) but *not* functional.
- **Option C (S-curve):** the Grand Avenue has a more pronounced S-curve (3-block deviation per 50 blocks) that avoids specific terrain features (e.g., a hill, a forest). The S-curve is *functional* but *less grand*.

The recommended option is **A** (straight), per the discussion-notes.md Topic 4. But the user may prefer a *curved* Avenue for aesthetic reasons.

---

**End of development plan.** This document is the *roadmap* for the map integration. The MVP (§1), the phased delivery (§2), the future extensions (§3), and the open items (§4) give the user, the design team, and the build team a clear path from v0.1 to v2.5 and beyond. The next step is the AI contractor brief (out of scope for this document), which uses the design plan, the working plan, and the development plan as its *primary inputs*.
