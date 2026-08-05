# Houston Tunnel System — Working Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 03 — Houston Tunnel System
**Author role:** Architectural Designer
**Status:** Construction sequence, tools, and quality gates
**Date:** 2026

> This is the **construction plan** for the Houston tunnel system Minecraft build. The design plan (`design-plan.md`) is the *what*; this working plan is the *how*, the *when*, and the *with what*. The AI Contractor Writer uses this document to sequence the build, estimate time and blocks, and verify each phase before moving on. All phase numbers reference the design plan sections (e.g., Phase 3 references design plan §3, the above-ground city).
>
> **Build scale reminder (binding from D1):** 6 blocks N–S × 4 blocks E–W sample = 120 × 80 Minecraft blocks total. Plus the 12 buffer blocks (6×6 total above-ground footprint) = ~144 × 96 blocks including the buffer. Tunnel sits 6 blocks below street grade. Total build volume ≈ 144 × 96 × 86 blocks (top of JPMorgan at ~80 blocks) = ~1.2 million blocks raw, but the actual placed count (after subtracting air and structural voids) is much smaller.

---

## 1. Build Strategy

### 1.1 The choice: top-down (above-ground first) or bottom-up (tunnel first)?

The two natural build strategies are:

- **Top-down:** build the above-ground city first (the 4 anchor towers + the 8–10 generic towers + the street grid + the skybridges), then excavate the tunnel grid below, then place the tunnel interior.
- **Bottom-up:** build the tunnel grid first (excavate + place interior), then build the above-ground city on top.

**Decision: hybrid — top-down at the block-quadrant level, bottom-up at the per-quadrant level.**

The reason: the build's defining feature is the **transition between the two layers** — the lobby descent, the T-marker at the curb, the skybridge landing. If the contractor writer builds all 4 quadrants of the above-ground first and then excavates the tunnels below, the **descent moments** (the lobby-to-basement transition) get built as a final integration step that is hard to verify.

The hybrid strategy:

1. **Phase 1** is site prep (terrain, above-ground city footprint).
2. **Phase 2** is the above-ground **shell** of the 4 anchor towers (just the exterior envelope, no interior fit-out), the street grid, the parking garages, and the skybridge shells. The lobbies are **not** built yet.
3. **Phase 3** is the **tunnel excavation** of the entire 4-quadrant grid (all 24 compressed blocks). The tunnel is hollow at this point — just the empty void.
4. **Phase 4** is the **tunnel interior** — walls, ceilings, floors, lighting, wayfinding. The descent moments (lobby-to-basement) are built here, integrating the above-ground lobby with the below-ground tunnel.
5. **Phase 5** is the **tenant zones** — the 4 food courts and the 6 supporting tenant zones. The tenant fit-out is the highest-fidelity work and is built last in the tunnel.
6. **Phase 6** is the **skybridges + wayfinding finish** — the skybridge interiors, the skybridge landings, the final wayfinding band signs.
7. **Phase 7** is the **finishing** — the easter eggs, the signage, the lighting tuning, the time-of-day cycle, the after-hours shutdown, the cleaning-crew NPCs, the climate-control sound.

This strategy ensures that the **descent moments** (the lobby-to-basement transitions at Wells Fargo, McKinney, and the skybridge landings) are built as a single integration step in Phase 4, with the above-ground lobby and the below-ground tunnel designed together.

### 1.2 Why hybrid and not pure top-down

A pure top-down approach would build all 4 anchor lobbies before excavating any tunnels, but the **lobby-to-basement transition** is a 6-block descent that crosses the street-grade boundary. Building the lobby without the tunnel below means the contractor writer has to **revisit** the lobby at the end of the build to add the descent — and the descent is the **most important design moment** in the build. Hybrid avoids this revisit.

### 1.3 Why hybrid and not pure bottom-up

A pure bottom-up approach would build the entire tunnel interior before the above-ground city, but the **descent moments** need the above-ground lobby to be in place to feel right. The descent is the **visual shock** of going from marble lobby to beige tunnel; if the lobby is missing during the tunnel build, the contractor writer cannot verify the transition.

---

## 2. Construction Phases

The build is organized into **7 phases**. Each phase has an estimated block count, estimated time, dependencies, and risk areas.

### Phase 1: Site Preparation

**Goal:** clear the build area, create the terrain, mark the 6×4 sample footprint, mark the 12 buffer blocks, set the 6-block-tall air space below grade for the tunnel excavation.

**Tasks:**
- Clear the build area: 144 × 96 blocks of trees, surface stone, and any pre-existing structures.
- Level the terrain to y=0 (street grade) across the entire 144 × 96 footprint.
- Mark the 6×4 sample footprint with **invisible marker blocks** (e.g., `light_gray_wool` 1 block above the terrain, removed after the build is complete) so the contractor writer can see the build-block boundaries.
- Mark the **4 quadrant boundaries** (NW = Wells Fargo, NE = JPMorgan Chase, SW = Pennzoil, SE = Esperson) with the same invisible markers.
- Mark the **6 N–S streets** (Main, Fannin, Travis, Louisiana, Walker, Capitol) and **4 E–W cross streets** (Rusk, McKinney, Dallas, Lamar) with `gray_concrete` strips (1 block wide) below y=0 (these become the actual street surfaces in Phase 2).
- Excavate the **tunnel void** to y = -6 across the entire 24-block sample footprint (the air space for the tunnel).
- Set the build-block identifier labels (Cameron 2015 grid: A-15 through P-29) using `oak_sign` markers at the corner of each compressed block, 4 blocks above street grade (out of the way, but visible for the contractor writer's reference).

**Estimated block count:** ~10,000 (mostly terrain clearing and tunnel void excavation).
**Estimated time:** 2–4 hours of bot time, or 4–6 hours of human time.
**Dependencies:** none.
**Risk areas:** the tunnel void excavation is the largest single task. If the build area has already-built structures or terrain features, the clearing time will be longer. Coordinate with the combined-complex team on the public-shaft landing point (the southeast corner of the build, in a buffer block) before excavating.

---

### Phase 2: Above-Ground City Shell

**Goal:** build the exterior shells of the 4 anchor towers, the 8–10 generic downtown towers, the 2–3 parking garages, the street grid, and the skybridge shells. **Lobbies are not built in this phase** — only the exterior envelope.

**Tasks:**
- **Wells Fargo Plaza tower (NW quadrant, block A-15):**
  - 71-story postmodern tower, ~70 blocks tall.
  - `quartz_block` shell, `light_gray_stained_glass_pane` curtain wall, `iron_block` base.
  - Block footprint: 20 × 20 blocks (1 compressed block at 4:1).
  - Estimated block count: ~5,500 (70 × 20 × 20 = 28,000 minus air = ~5,500 solid).
- **JPMorgan Chase Tower (NE quadrant, block C-18):**
  - 75-story tapered tower, ~80 blocks tall (the tallest in the build).
  - `white_concrete` shell, `gray_stained_glass_pane` curtain wall, tapered roofline (1-block setbacks every 5 stories for the top 20 stories).
  - Block footprint: 20 × 20 blocks.
  - Estimated block count: ~6,000.
- **Pennzoil Place towers (SW quadrant, block D-21):**
  - **Two** mirrored trapezoidal towers, each ~50 blocks tall.
  - `black_concrete` shell, `black_stained_glass_pane` mirrored glass curtain wall, stepped setbacks (1-block every 4 stories).
  - Block footprint: 2 × (10 × 20) = 400 blocks per tower × 2 = 800 footprint.
  - Estimated block count: ~3,500 (2 towers × 50 × 10 × 20 = 20,000 minus air = ~3,500).
- **Esperson towers (SE quadrant, blocks F-24 and F-25):**
  - **Two** Niels Esperson Art Deco towers, ~35 and ~30 blocks tall.
  - `quartz_block` shell, `smooth_quartz_stairs` Art Deco ornamentation, `gray_stained_glass_pane` window grid, stepped parapets, `quartz_pillar` vertical pilasters.
  - Block footprint: 2 × (15 × 18) = 540 footprint.
  - Estimated block count: ~3,000.
- **Generic downtown towers (8–10 towers, buffer blocks):**
  - `white_concrete` shell, `light_gray_stained_glass_pane` curtain wall, uniform cornice line, heights 25–60 blocks.
  - Block footprint: 8–10 × (20 × 20) = 3,200–4,000 footprint.
  - Estimated block count: ~12,000–18,000.
- **McKinney Garage (block E-20, on Main Street):**
  - 4–6 stories of open-deck `gray_concrete`, ~25 blocks tall.
  - `light_blue_concrete` ground-floor retail concourse.
  - Estimated block count: ~2,500.
- **Generic garages A and B:**
  - 4–6 stories of open-deck `gray_concrete`.
  - Estimated block count: ~4,000 (2 garages).
- **Street grid:**
  - 6 N–S streets × 144 blocks long × 5 blocks wide = 4,320 blocks of `gray_concrete`.
  - 4 E–W cross streets × 96 blocks long × 5 blocks wide = 1,920 blocks of `gray_concrete`.
  - Sidewalks: 6 N–S × 144 × 2 (both sides) × 1 block = 1,728 `smooth_stone_slab`.
  - 4 E–W × 96 × 2 × 1 = 768 `smooth_stone_slab`.
  - Total street grid: ~8,700 blocks.
- **Streetlights:** ~50 `iron_fence` + `redstone_lamp` poles.
- **Trees:** ~30 palm trees (`jungle_log` + `jungle_leaves`) and ~20 live oaks (`dark_oak_log` + `dark_oak_leaves`).
- **Skybridge shells (4 skybridges):**
  - `glass_pane` + `iron_bars` shells, 1 block wide × 2 blocks tall × 4–7 blocks long.
  - Each skybridge has a **landing platform** on each end, integrated into the second-floor of the connected tower (but the tower lobby is not built yet).
  - Estimated block count: ~400 (4 skybridges).

**Estimated block count for Phase 2:** ~50,000.
**Estimated time:** 8–12 hours of bot time, or 20–30 hours of human time.
**Dependencies:** Phase 1 (site prep).
**Risk areas:**
- The tapered JPMorgan Chase roofline is the most architecturally complex single element. If the contractor writer is using WorldEdit, the `/fill` command with a taper mask can produce this; if placing manually, the setbacks must be carefully sequenced.
- The Pennzoil Place mirrored trapezoid silhouette requires precise stepped setbacks — this is a high-risk area for visual accuracy.
- The Art Deco ornamentation on the Esperson towers (the `smooth_quartz_stairs` cornices, the `quartz_pillar` pilasters) is the most detail-intensive single element.

---

### Phase 3: Tunnel Excavation

**Goal:** excavate the full 4-quadrant tunnel grid. By the end of this phase, every tunnel corridor, food-court node, and tenant bay is **hollow air space** ready for interior fit-out in Phase 4.

**Tasks:**
- **Standard corridor excavation:**
  - The 4-quadrant tunnel grid has roughly 600 blocks of corridor total (sum of all standard corridor segments).
  - Each standard corridor is 3–6 blocks wide × 3 blocks tall × 30–50 blocks long.
  - Excavate to the corridor footprint, leaving the structural shell (the street above and the building basements on either side).
  - The street above (1 block of `gray_concrete` + 1 block of `smooth_stone_slab` + utilities) is **preserved** — the tunnel excavation does not break through the street.
  - Estimated block count (excavated, not placed): ~10,000 blocks of void.
- **Food-court node excavation:**
  - 4 food-court nodes (Esperson, Pennzoil, 1001 Fannin, McKinney).
  - Each is 4–9 blocks wide × 4 blocks tall × 20–25 blocks long.
  - Estimated block count (excavated): ~5,000 blocks of void.
- **Tenant bay excavation:**
  - ~50 tenant bays across the 4 food courts and 6 supporting tenant zones.
  - Each is 2–3 blocks wide × 2–3 blocks deep × 3 blocks tall.
  - Estimated block count (excavated): ~3,000 blocks of void.
- **Sump-pump room excavation:**
  - 1 small 4×4×3 utility room in the McKinney quadrant.
  - Estimated block count: 50 blocks of void.
- **Floodgate shaft excavation:**
  - 2 floodgate shafts (Wells Fargo, McKinney) at the lobby-to-basement transitions.
  - Each is 4 blocks wide × 6 blocks tall × 4 blocks deep.
  - Estimated block count: 200 blocks of void.
- **Skybridge landing excavation:**
  - 4 skybridge landings (one per skybridge) at the second floor of the connected tower.
  - Each is 4 blocks wide × 3 blocks tall × 4 blocks deep.
  - Estimated block count: 200 blocks of void.

**Estimated block count for Phase 3:** ~18,500 blocks of excavation (void, not placed).
**Estimated time:** 4–6 hours of bot time, or 10–15 hours of human time.
**Dependencies:** Phase 1 (the void was already partially excavated in Phase 1; Phase 3 finishes it).
**Risk areas:**
- The street-above preservation is critical — the tunnel excavation must **not** break through the street surface. Use a `mask` of the street surface and the structural shell during `/fill` operations.
- The food-court nodes connect to multiple corridor segments; the excavation must be **continuous** across nodes, not segmented.
- The floodgate shafts and skybridge landings are **above-grade** excavations within the lobby / second-floor space; they must be coordinated with Phase 4 (the lobby build) so the openings align.

---

### Phase 4: Tunnel Interior (the highest-fidelity phase)

**Goal:** place the walls, ceilings, floors, lighting, and wayfinding in every tunnel segment. This is the phase where the **time-staggered cross-section** (1970s / 1990s / 2010s) is established. This is also the phase where the **lobby-to-basement descent** is built (the integration of Phase 2's tower shells with Phase 3's tunnel void).

**Tasks:**
- **Walls (1970s default, 1990s refresh, 2010s LED, 1950s minimal):**
  - 1970s default: `white_concrete` 2 blocks thick on each side, with `light_gray_concrete` accent stripes.
  - 1990s refresh: `light_gray_concrete` (cooler gray).
  - 2010s LED: `gray_concrete` + `black_concrete` base.
  - 1950s minimal: `smooth_stone` (raw, unpainted).
  - Estimated block count: ~25,000 (walls only).
- **Floors (4 finishes):**
  - 1970s VCT: `white_wool` with `polished_andesite` border.
  - 1990s VCT: `gray_wool` with `smooth_stone_slab` border.
  - 2010s porcelain: `gray_wool` with `black_concrete` border.
  - 1950s bare concrete: `smooth_stone_slab`.
  - 1970s terrazzo: `polished_andesite` (Esperson and Pennzoil food courts).
  - Estimated block count: ~12,000 (floors only).
- **Ceilings (3 styles):**
  - 1970s dropped: `smooth_stone_slab` ceiling at y = -3 (3 blocks above floor).
  - 1990s dropped: `quartz_slab` ceiling.
  - 2010s dropped: `black_concrete` ceiling.
  - 1950s exposed: no dropped ceiling (the structural ceiling is the floor of the street above).
  - Estimated block count: ~12,000 (ceilings only).
- **Lighting (4 types):**
  - 1970s fluorescent: `sea_lantern` strips every 4 blocks (~600 `sea_lantern`).
  - 1990s LED: `redstone_lamp` every 5 blocks (~500 `redstone_lamp`).
  - 2010s LED panel: `end_rod` + `redstone_lamp` every 4–6 blocks (~300 `end_rod` + ~200 `redstone_lamp`).
  - 1950s tube: `redstone_lamp` every 8 blocks (~50 `redstone_lamp`).
  - Estimated block count: ~1,650 light blocks.
- **Wayfinding bands (the "Tunnel" backlit signs):**
  - At every major corridor intersection, a 4-block-wide × 1-block-tall `blue_terracotta` band with `white_concrete` letterforms and a `redstone_lamp` backlight.
  - ~30 wayfinding bands in the build.
  - Estimated block count: ~300 (terracotta + letters + backlight).
- **Lobby-to-basement descents (the integration moment):**
  - 2 main descents (Wells Fargo, McKinney Garage) + 4 skybridge landings + 6 generic tower lobby descents.
  - Each descent is 4–6 blocks wide × 6 blocks tall × 4–6 blocks deep.
  - Includes the `iron_door` floodgate, the `stone_brick_stairs` raised threshold, the `polished_andesite_stairs` interior stair, the `iron_door` elevator bank, and the building directory `item_frame` array.
  - Estimated block count: ~1,500.
- **Floodgate + sump-pump room interior:**
  - `iron_door` + `iron_block` frame for the 2 floodgates.
  - `cauldron` + `iron_bars` piping + `redstone_lamp` for the sump-pump room.
  - Estimated block count: ~200.
- **Restrooms (3–4 small rooms):**
  - 1 in each of the 4 food courts, plus 1 in the Wells Fargo lobby.
  - Each is 3 blocks wide × 3 blocks deep × 3 blocks tall.
  - `quartz_block` walls, `red_terracotta` floor, `quartz_slab` ceiling, `redstone_lamp` every 3 blocks.
  - Estimated block count: ~400.

**Estimated block count for Phase 4:** ~52,000.
**Estimated time:** 12–18 hours of bot time, or 30–45 hours of human time.
**Dependencies:** Phase 2 (above-ground shells), Phase 3 (tunnel void).
**Risk areas:**
- The **time-staggered cross-section** is the highest-risk visual element. The contractor writer must carefully sequence the corridor segments so the 1970s / 1990s / 2010s eras are **clearly distinguishable** but **not jarring** — the transition between eras should be a single block, not a 10-block gradient.
- The **lobby-to-basement descent** is the most architecturally complex integration. The Wells Fargo descent has the most elements (granite plaza, lobby, elevator bank, escalator, interior stair, floodgate, basement corridor) and should be built first as the reference.
- The **wayfinding bands** must be consistent across the build (same `blue_terracotta` background, same `white_concrete` letterforms, same `redstone_lamp` backlight) but **different text** at each intersection. A standardized text-format template helps.
- The **1950s minimal corridor** is the smallest segment but the most visually distinctive — the absence of a dropped ceiling is a major visual change. The contractor writer must carefully place the `iron_block` ductwork and `red_concrete` sprinkler risers to convey the raw, exposed feel.

---

### Phase 5: Tenant Zones (the food courts and the supporting tenant zones)

**Goal:** build the 4 food courts and the 6 supporting tenant zones. This is the **highest-fidelity work** in the build — the food courts are what every visitor remembers.

**Tasks:**
- **Esperson food court (808 Travis, the signature):**
  - 15–18 storefronts, each with `iron_bars` + `glass_pane` storefront, brand-color `concrete` awning, `redstone_lamp` backlit sign.
  - Communal tables: 4–6 `dark_oak_slab` tables with `dark_oak_fence` bases.
  - Per §7.3, the tenant mix is 13 named tenants + 2 vacant bays.
  - Estimated block count: ~3,500.
- **Pennzoil Place underground (711 Louisiana, the densest):**
  - 10–12 storefronts, packed close together.
  - Per §8.1, 12 named tenants.
  - Estimated block count: ~3,000.
- **1001 Fannin / Lamar Tunnel food court (the modern refresh):**
  - 12–14 storefronts, frameless `glass_pane`, minimal signage.
  - Per §8.2, 10 named tenants + 2 vacant bays.
  - Estimated block count: ~2,800.
- **McKinney Place / 930 Main concourse (the public-entry food court):**
  - 12–14 storefronts, mostly services.
  - Per §8.3, 15 named tenants + 2 vacant bays.
  - Estimated block count: ~3,200.
- **6 supporting tenant zones (the standard-corridor dry cleaner / barber / credit union clusters and the mid-corridor tenants):**
  - Per §9, 30+ named tenants + 5–7 vacant bays.
  - Estimated block count: ~5,000.
- **Tenant interiors (the generic commercial fit-out):**
  - Each named tenant has a small interior: counter (`quartz_slab` top + `iron_block` base), menu board (`oak_sign`), 1–2 `item_frame` accent pieces, 1 `redstone_lamp` accent light.
  - Estimated block count: ~6,000.
- **Communal tables across all 4 food courts:**
  - ~20 `dark_oak_slab` tables with `dark_oak_fence` bases.
  - Estimated block count: ~400.
- **Restrooms (4 small rooms, 1 per food court):**
  - Per Phase 4, but the **interior fit-out** (toilet partitions, sinks) is built here.
  - Estimated block count: ~400.

**Estimated block count for Phase 5:** ~24,000.
**Estimated time:** 10–15 hours of bot time, or 25–35 hours of human time.
**Dependencies:** Phase 4 (tunnel interior — the food courts need the corridor walls, floors, ceilings, and lighting in place).
**Risk areas:**
- The **brand-color accuracy** of each tenant is a high-risk area. The contractor writer should use a reference palette (per §2.2) for each named tenant and verify against the documented brand colors.
- The **Esperson food court's single-loaded layout** is the signature look but is hard to get right — the corridor must feel **narrow and long**, with the storefronts on both sides creating a **perspective effect**.
- The **Pennzoil Place density** is the opposite risk — the food court must feel **packed and crowded**, with minimal aisle space, conveying the "no clear aisle" feel.
- The **1001 Fannin modern minimalism** is a different risk — the frameless `glass_pane` storefronts and the dark ceiling must feel **2020s contemporary**, not just a slightly-different 1990s.

---

### Phase 6: Skybridges + Wayfinding Finish

**Goal:** build the 4 skybridge interiors, the 4 skybridge landings, and the final wayfinding sign system.

**Tasks:**
- **4 skybridge interiors:**
  - `glass_pane` curtain walls, `iron_bars` mullions, `white_wool` carpet floor, `quartz_slab` ceiling, `redstone_lamp` every 4 blocks.
  - 1 block wide × 2 blocks tall × 4–7 blocks long.
  - Estimated block count: ~400.
- **4 skybridge landings:**
  - Second-floor vestibules, `glass_pane` + `iron_bars`, building directory (`item_frame` array), stair/escalator down to tunnel, "Tunnel → Basement" sign.
  - 4 blocks wide × 3 blocks tall × 4 blocks deep.
  - Estimated block count: ~800.
- **Final wayfinding sign system:**
  - The food-court backlit signage bands (6 blocks wide × 2 blocks tall) at each food-court entry.
  - Additional wayfinding bands at secondary corridor intersections (not just the major ones built in Phase 4).
  - Per §12.1, ~30 wayfinding bands total.
  - Estimated block count: ~600.
- **T-markers (the "T" sidewalk plaques):**
  - 2 T-markers (Wells Fargo, McKinney Garage), each with `oak_fence` post + `oak_sign` "T" + `blue_concrete` circle + `white_concrete` letter.
  - Estimated block count: ~20.
- **Building directory `item_frame` arrays in 4 lobby directories:**
  - 2-block-wide × 3-block-tall arrays, with `oak_sign` labels for each tenant.
  - Estimated block count: ~150.

**Estimated block count for Phase 6:** ~2,000.
**Estimated time:** 3–5 hours of bot time, or 8–12 hours of human time.
**Dependencies:** Phase 2 (above-ground shells), Phase 4 (tunnel interior), Phase 5 (tenant zones — some wayfinding bands point to food courts).
**Risk areas:**
- The **skybridge glass curtain walls** must be **fully transparent** (no `iron_bars` mullion spacing too tight). The `glass_pane` blocks should be placed every block along the long sides, with `iron_bars` mullions every 4 blocks.
- The **skybridge landings** must align with the **lobby-to-basement descents** built in Phase 4. The contractor writer should verify the alignment before building the landing interiors.
- The **final wayfinding sign system** is a quality-of-life element — the player should be able to find their way to every food court from every other food court. A final "wayfinding test" (per §4 below) is critical.

---

### Phase 7: Finishing (easter eggs, signage, lighting tuning, time-of-day)

**Goal:** add the 18+ easter eggs, the final interpretive plaques, the lighting tuning, the time-of-day cycle, the after-hours shutdown, the cleaning-crew NPCs, the climate-control sound, and the verification pass.

**Tasks:**
- **Easter eggs (per §15):**
  - 8 prominent: "200,000 daily users" panel, "95+ / 6 mi / 20 ft" panel, "Wells Fargo Direct Street Access" sign, Esperson food-court signage, "Tunnel" wayfinding bands (already built in Phase 4), T-markers (already built in Phase 6), "Tunnel" capitalization, time-staggered visual cross-section.
  - 10 subtle / faded: 1930s origin plaque, Hines marker, Sandra Lord plaque, floodgate + Allison markers, 72°F climate sign, Theater District performance-night sign, Harris County edge sign, St. Joseph edge sign, "Vacant / For Lease" bays.
  - 5 atmospheric: time-of-day lighting cycle, "1st Shift / 2nd Shift / 3rd Shift" sign, water-stained ceiling tiles, after-hours shutdown, cave ambient.
  - Estimated block count: ~800 (mostly `oak_sign` and `item_frame` and the water-stained `light_gray_wool` patches).
- **Theater District stub corridor:**
  - A short 10–15-block stub corridor at the end of the Lamar–McKinney corridor.
  - 3 blocks wide × 3 blocks tall × 10 blocks long.
  - Dim lighting (1 `redstone_lamp` every 8 blocks), `iron_door` terminus with "Tunnel Closed · Reopens 6:00 AM Mon" sign.
  - Estimated block count: ~300.
- **After-hours shutdown (one quadrant):**
  - The McKinney quadrant dims to security mode at Minecraft-time 12000.
  - Redstone clock + `redstone_lamp` low-state + NPC count drop + a few cleaning-crew NPCs.
  - Estimated block count: ~50 (mostly `redstone_lamp` and NPC spawn eggs).
- **Time-of-day lighting cycle:**
  - Redstone clock cycling 0 → 6000 → 12000 → 18000 → 0.
  - At 0 (morning): food courts at peak (NPCs visible, `redstone_lamp` bright).
  - At 6000 (midday): food courts empty, corridors at standard light.
  - At 12000 (evening): after-hours shutdown, McKinney quadrant dim.
  - At 18000 (night): all corridors dim, food courts dark.
  - Estimated block count: ~100 (redstone + `redstone_lamp` + spawn eggs).
- **NPC placement (office workers, cleaning crews, food-court staff):**
  - ~30–40 `villager` NPCs in office attire (customized with `player_head` skins or named with `name_tag`).
  - Distributed across the food courts (8–12 at peak), the corridors (10–15), the skybridge landings (4), the lobbies (6–8), and the after-hours cleaning crew (4).
  - Estimated block count: ~50 (spawn eggs + `name_tag` + `player_head`).
- **Sound design:**
  - `note_block` blocks at food-court kitchen areas for kitchen clatter.
  - `cave` ambient setting in the tunnel segments.
  - `note_block` for register beeps at the food counters.
  - Estimated block count: ~30.
- **Final lighting tuning:**
  - Adjust `sea_lantern` / `redstone_lamp` / `end_rod` density for the desired mood per §16.
  - Verify no dark spots, no over-bright spots.
  - Verify the food courts are brighter than the corridors.
  - Verify the skybridge landings are at full daylight.
- **Final verification pass:**
  - Per §4 (quality checkpoints), run the full verification suite.

**Estimated block count for Phase 7:** ~1,500.
**Estimated time:** 4–6 hours of bot time, or 8–12 hours of human time.
**Dependencies:** Phases 1–6 (the build is essentially complete; Phase 7 adds the polish).
**Risk areas:**
- The **time-of-day cycle** is the most complex redstone element in the build. A bug in the redstone clock can leave the food courts in permanent dark or permanent peak. Use a **repeater-based clock** with clear on/off indicators and a manual override.
- The **NPC visibility toggle** for the time-of-day cycle is a complex element. The simplest implementation is a `/effect` invisibility toggle on a redstone-clock signal; the most complex is a per-NPC armor-stand swap.
- The **after-hours shutdown** is a single-quadrant dim, not a whole-build dim. The contractor writer must carefully isolate the McKinney quadrant from the rest of the build.

---

### Phase Summary

| Phase | Block count | Bot time (hrs) | Human time (hrs) | Dependencies |
|---|---|---|---|---|
| 1: Site prep | ~10,000 (mostly excavation) | 2–4 | 4–6 | none |
| 2: Above-ground city shell | ~50,000 | 8–12 | 20–30 | Phase 1 |
| 3: Tunnel excavation | ~18,500 (void) | 4–6 | 10–15 | Phase 1 |
| 4: Tunnel interior | ~52,000 | 12–18 | 30–45 | Phases 2, 3 |
| 5: Tenant zones | ~24,000 | 10–15 | 25–35 | Phase 4 |
| 6: Skybridges + wayfinding | ~2,000 | 3–5 | 8–12 | Phases 2, 4, 5 |
| 7: Finishing | ~1,500 | 4–6 | 8–12 | Phases 1–6 |
| **Total** | **~158,000 placed** | **~43–66** | **~105–155** | |

**Notes on the totals:**
- The 158,000 block count is the **placed** count (walls, floors, ceilings, lighting, fit-out, signage, NPCs). It excludes the void excavated in Phases 1 and 3.
- The bot-time estimate assumes WorldEdit-style operations (`/fill`, `//paste` from schematics) with parallel bot agents. The human-time estimate assumes manual block-by-block placement.
- The **critical path** is Phase 4 (tunnel interior) — every subsequent phase depends on it, and the visual identity of the build is established here.

---

## 3. Tools & Workflow

### 3.1 Schematic-based or in-place build?

**Recommendation: schematic-based for the above-ground shell, in-place for the tunnel interior and tenant zones.**

The reason: the above-ground city is **repetitive** (8–10 generic downtown towers of similar form) and benefits from schematic placement. The tunnel interior is **highly customized** (the time-staggered cross-section, the food-court layouts, the descent moments) and benefits from in-place block-by-block placement.

**Workflow:**
1. **Phase 1 (site prep):** in-place, with WorldEdit `/fill` for the terrain clearing and the tunnel void excavation.
2. **Phase 2 (above-ground shell):** schematic-based, with one schematic per tower type (Wells Fargo, JPMorgan Chase tapered, Pennzoil mirrored, Esperson Art Deco, generic downtown) and `//paste` for placement.
3. **Phase 3 (tunnel excavation):** in-place, with WorldEdit `/fill` for the corridor and food-court node excavation.
4. **Phase 4 (tunnel interior):** in-place, with WorldEdit `/fill` for the long corridor walls and floors, but block-by-block for the descent moments, the wayfinding bands, and the 1950s minimal corridor.
5. **Phase 5 (tenant zones):** in-place, with one schematic per food-court archetype (Esperson single-loaded, Pennzoil packed, 1001 Fannin modern, McKinney linear) and `//paste` for the food-court shells, but block-by-block for the tenant interiors.
6. **Phase 6 (skybridges + wayfinding):** in-place, with one schematic per skybridge type and `//paste` for placement, but block-by-block for the wayfinding bands.
7. **Phase 7 (finishing):** in-place, block-by-block for the easter eggs, the redstone clocks, the NPC placement.

### 3.2 Use of `/fill`, WorldEdit, schematic placement

- **WorldEdit `/fill`:** used aggressively in Phases 1, 3, and 4 for the long corridor walls, floors, and ceilings. The 1970s corridor is a `/fill` operation: `//fill x1 y1 z1 x2 y2 z2 white_concrete` for the walls, then a second pass for the floor and ceiling.
- **WorldEdit `//paste`:** used in Phases 2, 5, and 6 for the repeated tower shells and food-court shells.
- **WorldEdit `//mask`:** used in Phase 3 to preserve the street surface and the building basements during the tunnel excavation. The mask is the inverse of the corridor footprint.
- **Block-by-block placement:** used for the descent moments, the 1950s minimal corridor, the food-court interiors, the wayfinding bands, the easter eggs, the redstone clocks, the NPC placement.

### 3.3 Bot-based construction or human?

**Recommendation: bot-based for Phases 1, 2, 3, and the bulk of Phase 4; human-assisted for Phase 5, 6, and 7.**

The reason: the above-ground city is repetitive and benefits from bot parallelism (multiple bots placing towers in parallel). The tunnel interior is repetitive for the long corridors (bot-friendly) but the descent moments, the food-court interiors, and the finishing work benefit from human judgment.

The fleet of bots should be configured as follows:
- **2–3 "above-ground" bots:** place the 4 anchor towers + the 8–10 generic towers in parallel, with each bot assigned a specific tower.
- **2–3 "tunnel excavation" bots:** clear the tunnel void in parallel, with each bot assigned a quadrant.
- **4 "tunnel interior" bots:** place the walls, floors, ceilings, and lighting in parallel, with each bot assigned a quadrant.
- **1 "wayfinding + finishing" bot:** place the wayfinding bands, the easter eggs, the redstone clocks, the NPCs, in sequence (this is the most detail-intensive single bot).
- **1 "human overseer":** verify the build at each phase, fix any issues, and approve the next phase.

### 3.4 Custom tooling

The following custom tools would speed up the build:

- **A `tower` command:** a single command that places a named tower schematic at a given coordinate, with the option to specify the height, the shell material, and the cornice line. (E.g., `/tower wells_fargo x y z height=70`.)
- **A `corridor` command:** a single command that places a standard corridor segment of a given width, length, and era (1970s / 1990s / 2010s) at a given coordinate, with the option to specify the floor finish and the lighting density. (E.g., `/corridor 1970s x1 z1 x2 z2 width=5`.)
- **A `foodcourt` command:** a single command that places a food-court archetype (Esperson / Pennzoil / 1001 Fannin / McKinney) with the tenant mix specified. (E.g., `/foodcourt esperson x y z tenants=full`.)
- **A `wayfinding` command:** a single command that places a "Tunnel →" or "To [Building Name] →" sign at a given coordinate, with the text and color specified. (E.g., `/wayfinding tunnel_east x y z`.)
- **A `npc` command:** a single command that places an office-worker NPC at a given coordinate, with the time-of-day visibility specified. (E.g., `/npc office_worker x y z visible=peak`.)
- **A `easter_egg` command:** a single command that places a named easter egg at a given coordinate, from a library of 18+ documented easter eggs. (E.g., `/easter_egg 200000_panel x y z`.)
- **A `time_of_day` command:** a single command that sets up the redstone clock for the time-of-day lighting cycle, with the cycle duration and the per-zone light levels specified.

These commands can be implemented as a small `mc-fleet-bot` plugin or as a wrapper around WorldEdit commands.

---

## 4. Quality Checkpoints

After each phase, the contractor writer (or the human overseer) must verify the build against the design plan before moving on. The quality checkpoints are **gates**: if a checkpoint fails, the next phase is delayed until the issue is fixed.

### 4.1 Phase 1 checkpoint: site prep

- [ ] Terrain is level to y=0 across the entire 144 × 96 footprint.
- [ ] The 6×4 sample footprint is marked with invisible markers.
- [ ] The 4 quadrant boundaries are marked.
- [ ] The 6 N–S streets and 4 E–W cross streets are visible as `gray_concrete` strips.
- [ ] The tunnel void is excavated to y = -6 across the entire 24-block sample footprint.
- [ ] The Cameron 2015 build-block identifier labels (A-15 through P-29) are visible at the corner of each compressed block.
- [ ] No pre-existing structures or terrain features remain in the build area.
- [ ] The street surface is preserved (the tunnel excavation did not break through).

### 4.2 Phase 2 checkpoint: above-ground city shell

- [ ] All 4 anchor towers (Wells Fargo, JPMorgan Chase, Pennzoil Place with 2 towers, Esperson with 2 towers) are built with the documented architectural signatures.
- [ ] The 8–10 generic downtown towers are built with the uniform cornice line.
- [ ] The 2–3 parking garages (McKinney Garage + 2 generic) are built with the open-deck typology.
- [ ] The street grid is complete (6 N–S + 4 E–W).
- [ ] The streetlights are placed every 8 blocks.
- [ ] The trees (palms + live oaks) are placed every 12–16 blocks.
- [ ] The 4 skybridge shells are built (glass curtain walls, no interior yet).
- [ ] The Wells Fargo granite plaza is built at the corner of Louisiana and Rusk.
- [ ] No lobby interiors are built yet (this is Phase 4).
- [ ] The combined-complex transit hub plaza site is reserved (southeast corner, in a buffer block), but not built yet.

### 4.3 Phase 3 checkpoint: tunnel excavation

- [ ] All standard corridor segments are excavated to 3–6 blocks wide × 3 blocks tall.
- [ ] All 4 food-court nodes are excavated to 4–9 blocks wide × 4 blocks tall × 20–25 blocks long.
- [ ] All ~50 tenant bays are excavated to 2–3 blocks wide × 2–3 blocks deep × 3 blocks tall.
- [ ] The 1 sump-pump room is excavated (4×4×3 in the McKinney quadrant).
- [ ] The 2 floodgate shafts are excavated at the Wells Fargo and McKinney lobby-to-basement transitions.
- [ ] The 4 skybridge landings are excavated at the second floor of the connected towers.
- [ ] The street surface is preserved (no breakthrough).
- [ ] The food-court node excavations connect continuously to the corridor excavations (no air gaps).

### 4.4 Phase 4 checkpoint: tunnel interior

- [ ] The 4 quadrant walls (1970s / 1990s / 2010s / 1950s minimal) are visually distinguishable.
- [ ] The transition between eras is a single block (not a 10-block gradient).
- [ ] The 1970s corridor is the default visual; the 1990s refresh and 2010s LED are in their respective quadrants.
- [ ] The 1950s minimal corridor has the exposed structure, the `iron_block` ductwork, the `red_concrete` sprinkler risers.
- [ ] The 4 floor finishes (VCT, terrazzo, porcelain, bare concrete) are correctly applied.
- [ ] The 3 ceiling styles (white dropped, quartz dropped, black dropped, exposed) are correctly applied.
- [ ] The 4 lighting types (1970s fluorescent, 1990s LED, 2010s LED panel, 1950s tube) are correctly applied.
- [ ] The lobby-to-basement descents are built (2 main descents + 4 skybridge landings + 6 generic tower descents).
- [ ] The 2 floodgates are built at the Wells Fargo and McKinney entries.
- [ ] The 1 sump-pump room is built and equipped.
- [ ] The 3–4 restrooms are built (1 in each food court + 1 in the Wells Fargo lobby).
- [ ] The wayfinding bands are placed at every major corridor intersection (~30 bands).
- [ ] The water-stained ceiling tiles are placed in the 1970s-Hines-era corridors (1 in 50 tiles).
- [ ] **Visual test:** walk the standard corridor from the Wells Fargo entry to the McKinney food court. The corridor should feel **continuous and uniform** (the "clean but dated" signature), with no obvious block-placement errors.
- [ ] **Time-staggered test:** walk from the Esperson quadrant (1970s) to the 1001 Fannin quadrant (2010s LED). The transition should be **visually obvious** but **not jarring** — the same corridor shape, dramatically different materials.

### 4.5 Phase 5 checkpoint: tenant zones

- [ ] The Esperson food court has 15–18 storefronts with the documented tenant mix.
- [ ] The Pennzoil Place underground has 10–12 storefronts with the documented density.
- [ ] The 1001 Fannin food court has 12–14 storefronts with the modern refresh look.
- [ ] The McKinney Place concourse has 12–14 storefronts with the services-heavy mix.
- [ ] All 6 supporting tenant zones are built with the documented tenants.
- [ ] The 8–10 "Vacant / For Lease" bays are placed across the food courts and corridors.
- [ ] The brand-color accuracy of each tenant is verified against §2.2.
- [ ] The communal tables are placed in each food court.
- [ ] The restrooms are fully fitted out (toilet partitions, sinks).
- [ ] **Visual test:** stand in the middle of the Esperson food court and look down the corridor. The single-loaded layout should create a **perspective effect** — the storefronts recede into the distance.
- [ ] **Visual test:** stand in the middle of the Pennzoil Place underground. The density should feel **packed and crowded**, with minimal aisle space.
- [ ] **Visual test:** stand in the middle of the 1001 Fannin food court. The modern minimalism should feel **2020s contemporary**, not just a slightly-different 1990s.

### 4.6 Phase 6 checkpoint: skybridges + wayfinding

- [ ] All 4 skybridge interiors are built (glass curtain walls, carpet floor, acoustic ceiling, redstone lamp every 4 blocks).
- [ ] All 4 skybridge landings are built and aligned with the lobby-to-basement descents.
- [ ] The final wayfinding sign system is complete (~30 wayfinding bands + 4 food-court backlit signage bands).
- [ ] The 2 T-markers are placed at the Wells Fargo and McKinney direct entries.
- [ ] The 4 lobby building directories are built with `item_frame` arrays.
- [ ] **Wayfinding test:** starting at the Wells Fargo entry, can a player find their way to every food court using only the in-build signage? If no, add more wayfinding bands.

### 4.7 Phase 7 checkpoint: finishing

- [ ] All 18+ easter eggs are placed.
- [ ] The 1930s origin plaque is placed at the Wells Fargo entry.
- [ ] The interpretive panel (200,000 daily users) is placed at the Wells Fargo entry.
- [ ] The Hines marker is placed at the Pennzoil Place underground.
- [ ] The Sandra Lord plaque is placed at the Esperson food court entry.
- [ ] The 2 floodgate markers are placed at the Wells Fargo and McKinney entries.
- [ ] The 72°F climate sign is placed at one corridor intersection.
- [ ] The Theater District performance-night stub corridor is built.
- [ ] The Harris County and St. Joseph edge signs are placed at the build's edges.
- [ ] The 8–10 "Vacant / For Lease" bays are placed.
- [ ] The water-stained ceiling tiles are placed (1 in 50).
- [ ] The time-of-day lighting cycle is operational (redstone clock, 0 → 6000 → 12000 → 18000 → 0).
- [ ] The after-hours shutdown is operational in the McKinney quadrant.
- [ ] The 30–40 office-worker, cleaning-crew, and food-court-staff NPCs are placed.
- [ ] The `cave` ambient is set in the tunnel segments.
- [ ] The `note_block` clatter is set at the food-court kitchen areas.
- [ ] **Easter egg accessibility test:** can a player find all 18+ easter eggs within 30 minutes of focused exploration? If any are too obscure or too obvious, adjust the placement.
- [ ] **Time-of-day test:** cycle through 0 → 6000 → 12000 → 18000 manually. The food courts should peak at 0, empty at 6000, dim at 12000, dark at 18000. The McKinney quadrant should dim at 12000 (after-hours).
- [ ] **Final lighting tuning:** verify no dark spots, no over-bright spots, the food courts are brighter than the corridors, the skybridge landings are at full daylight.
- [ ] **Final navigation test:** walk the entire build from the Wells Fargo entry to the McKinney food court to the 1001 Fannin food court to the Pennzoil Place underground to the Esperson food court and back. The journey should take 5–8 minutes, the corridors should be continuous, and the wayfinding should work.

---

## 5. Risk Register

The build has several known risk areas. For each, the mitigation strategy is documented.

### Risk 1: Two-layer integration is a render-distance risk

- **Description:** Minecraft has a default render distance of 8–12 chunks (128–192 blocks). The above-ground city (top of JPMorgan at ~80 blocks) and the tunnel (6 blocks below grade) are 86 blocks apart vertically. A player standing on the surface cannot see the tunnel, and a player in the tunnel cannot see the surface. The "two-layer city" feel depends on the player **understanding** that both layers exist.
- **Mitigation:**
  - Use **in-build signage** (the T-markers, the lobby directories, the "Tunnel → Basement" signs) to make the two-layer connection visible to the player.
  - Use the **skybridge landings** as a visual transition between the two layers (the player walks from the tunnel up through the lobby to the skybridge, experiencing both layers in sequence).
  - In the **interpretive panel at the Wells Fargo entry**, the diagram of the 95+ blocks / 6 mi / 20 ft below grade conveys the scale of the underground city without requiring the player to see it directly.
  - Optionally, increase the render distance to 16+ chunks in the server config, but this is a performance trade-off.

### Risk 2: The time-staggered cross-section is hard to convey

- **Description:** the 1970s / 1990s / 2010s era distinction is subtle. If the contractor writer uses the wrong block for the wrong era, the time-staggered effect is lost.
- **Mitigation:**
  - Use the **canonical block palette per era** (per §2 and §6). The 1970s is `white_concrete` walls + `white_wool` floor + `smooth_stone_slab` ceiling + `sea_lantern` lighting. The 1990s is `light_gray_concrete` + `gray_wool` + `quartz_slab` + `redstone_lamp`. The 2010s is `gray_concrete` + `gray_wool` + `black_concrete` + `end_rod` + `redstone_lamp`. The 1950s is `smooth_stone` + `smooth_stone_slab` + no dropped ceiling + sparse `redstone_lamp`.
  - Build **one reference segment per era** first, then copy the pattern to the other segments in that era.
  - Verify with a **side-by-side visual test** (per §4.4) before completing Phase 4.

### Risk 3: The food-court layouts can feel generic

- **Description:** the 4 food courts are the highest-fidelity work, and if the contractor writer uses the same layout for all 4, the build feels generic. The Esperson is single-loaded, the Pennzoil is packed, the 1001 Fannin is modern, the McKinney is linear — they are 4 different archetypes.
- **Mitigation:**
  - Use **schematic-per-archetype** (per §3.1), not a single food-court schematic. The Esperson schematic, the Pennzoil schematic, the 1001 Fannin schematic, and the McKinney schematic are **4 different schematics**.
  - Build the **Esperson first** as the reference, then derive the other 3 from it but **deliberately differ** in the layout, the materials, and the tenant mix.
  - Verify with the **per-food-court visual test** (per §4.5).

### Risk 4: The wayfinding is the chronic weak point

- **Description:** the real Houston tunnel's wayfinding is the chronic weak point. If the build replicates this weakness, the player gets lost.
- **Mitigation:**
  - Per §12.5, the build **replicates the style** (1970s–80s signage) but **makes the navigation work** (every major intersection has a "Tunnel →" band).
  - The **final wayfinding test** (per §4.6) is a hard gate: the player must be able to find their way to every food court from every other food court using only the in-build signage.
  - If a navigation gap is found, add **additional wayfinding bands** at the gap intersections.

### Risk 5: The lobby-to-basement descent is the most architecturally complex element

- **Description:** the descent combines 4 distinct elements (granite plaza, lobby, elevator bank, interior stair, floodgate, basement corridor) and crosses the street-grade boundary.
- **Mitigation:**
  - Build the **Wells Fargo descent first** as the reference. The Wells Fargo descent has the most elements (the granite plaza, the lobby, the elevator bank, the escalator, the interior stair, the floodgate) and is the canonical example.
  - Build the **McKinney descent second** as the parking-garage variant (the descent passes through an open-deck parking level).
  - Then build the **6 generic tower descents** by copying the Wells Fargo pattern (with appropriate variation per tower).
  - The **skybridge landings** are the final 4 descents, built last in Phase 6.
  - Verify each descent with a **walk-through test** before moving on.

### Risk 6: The time-of-day redstone cycle is a single point of failure

- **Description:** the redstone clock that drives the time-of-day cycle is a complex element. A bug can leave the food courts in permanent dark or permanent peak.
- **Mitigation:**
  - Use a **repeater-based clock** with clear on/off indicators.
  - Add a **manual override** (a lever that pauses the cycle for player convenience).
  - Test the cycle in **all 4 phases** (0, 6000, 12000, 18000) before final acceptance.
  - If the cycle is too complex, fall back to a **static representation** (the food courts are always at peak, the after-hours shutdown is always on). The dynamic cycle is a polish element, not a load-bearing one.

### Risk 7: The 1950s minimal corridor is the smallest segment but the most visually distinctive

- **Description:** the 1950s minimal corridor is only 20–30 blocks long but it has a **dramatically different** look (no dropped ceiling, exposed structure, raw concrete). If the contractor writer over-builds it, the segment feels like a different game.
- **Mitigation:**
  - Build the 1950s minimal corridor **last in Phase 4** (after the other 3 eras are established), so the contractor writer has the visual reference.
  - Use the **canonical 1950s palette** (per §6.4) exactly. The `smooth_stone` walls, the `smooth_stone_slab` floor, the **no** dropped ceiling, the `iron_block` ductwork, the `red_concrete` sprinkler risers, the sparse `redstone_lamp` lighting.
  - The plaque (per §6.4) is the **anchor** that tells the player what they are looking at.

### Risk 8: The NPC count and the time-of-day NPC visibility toggle

- **Description:** the 30–40 NPCs are distributed across the food courts, corridors, skybridge landings, lobbies, and after-hours cleaning crew. The time-of-day NPC visibility toggle is a complex element.
- **Mitigation:**
  - Use the **simplest implementation** that works: a per-NPC `/effect` invisibility toggle on a redstone-clock signal.
  - If the `/effect` approach is too laggy, fall back to **armor-stand swap** (the NPC is replaced by an invisible armor stand at off-peak times).
  - If both approaches are too complex, fall back to **static NPC placement** (the NPCs are always visible, but their density varies by zone — the food courts have more NPCs than the corridors, regardless of time of day).

### Risk 9: The build exceeds the render-distance budget

- **Description:** the build is 144 × 96 × 86 blocks. With 8–12 chunk render distance (128–192 blocks), the player can see most of the build from any one vantage point. But the **interior** of the tunnel is a different story — a player in the tunnel can see at most 128 blocks down the corridor, and the tunnel is 600+ blocks of corridor total.
- **Mitigation:**
  - The **wayfinding bands** at every intersection help the player navigate without seeing the entire corridor.
  - The **T-markers at the direct entries** help the player find the entry from the surface.
  - The **combined-complex transit hub plaza** (per Topic 7) is a **distinct architectural element** at the build's edge, helping the player orient themselves.
  - Optionally, increase the render distance to 16+ chunks in the server config, but this is a performance trade-off.

### Risk 10: The two-layer integration is a documentation risk

- **Description:** the design plan is 17 sections and 158,000 blocks. The contractor writer has to read the entire design plan, the working plan, the development plan, and the 5 input documents to understand the build.
- **Mitigation:**
  - This working plan is the **single source of truth** for the construction sequence.
  - The design plan's §17 (block-level spec summary) is the **single source of truth** for the block choices.
  - The development plan (`development-plan.md`) is the **single source of truth** for the version history and the future extensions.
  - The contractor writer should be able to **start with these 3 documents** and use the input documents only for context.

---

*End of working plan. The development plan (`development-plan.md`) follows. The design plan (`design-plan.md`) and this working plan together provide the complete architectural and construction spec for the Houston tunnel system build.*
