# Combined Complex — Working Plan (Construction Sequence, No-Ravine)

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex
**Author role:** Architectural Designer (inter-site connections)
**Date:** 2026
**Status:** Historical native-world construction study; not the current-world build sequence.

> **Authority notice.** Read [../AUTHORITY.md](../AUTHORITY.md) before using this document. Its `Y=100` contact, custom-world preparation, and executable wording are superseded. Masterplan 04's normalized root registry controls local composition at contact `Y=200`; Masterplan 05 controls current-world placement and delivery. No world edits are authorized.

> **Scope reminder.** This document covers *how* the inter-site connections and the world envelope get built in the no-ravine design. The continuous mountain (granite cap + limestone body + horizontal contact at Y = 100) replaces the two-peak + V-shaped-ravine layout. The 6 centerpieces, the 9 easter eggs, and the public shaft are preserved. The service tunnel is now an *ascending inclined minecart bore* from the SubTropolis sub-basement up through the contact to the Cheyenne outer portal. The SubTropolis horizontal portal is on the south face of the mountain at the contact elevation (Y = 100), accessible by a switchback road. The return is funicular + road (no skybridge).

---

## 1. Build Strategy

**Outside-in, with the 6 centerpieces built last, but with one critical change from the ravine-era design: there is no ravine to excavate.**

The world is too large to build inside-out. The outside-in strategy means: build the *envelope* first (the world footprint, the continuous mountain, the contact ring, the city, the coastal plain), then *excavate* the interior spaces (the SubTropolis chamber, the Cheyenne chamber, the J-curve, the service tunnel, the public shaft), and finish with the *detail* (the 6 centerpieces, the 9 easter eggs, the lighting, the signage).

**The critical simplification:** the previous design required a *V-shaped ravine excavation* — 100 blocks deep, 600 blocks long, 200 blocks wide at the bottom. That excavation is no longer needed. The continuous mountain has no internal void to carve out at the surface; the ravine excavation risk (one of the highest-risk operations in the previous design) is *removed entirely*. The build is simpler, the bot is faster, and the render-distance budget is friendlier.

### 1.1 Why outside-in (not inside-out)

- **Visualization.** The builder needs to see the *world* as the visitor will see it. A hollow mountain is a non-visualizable object; a continuous mountain with a contact ring is.
- **Reference points.** The interior spaces (SubTropolis, Cheyenne, the public shaft, the service tunnel) are positioned *relative to the envelope* — the public shaft is at the NE corner of the city, the service tunnel is an inclined bore through the mountain, the SubTropolis horizontal portal is at the contact elevation on the south face. Without the envelope, the interior spaces are *floating in air*.
- **Risk reduction.** The 6 centerpieces are *detail* work. If the envelope is wrong, the centerpiece is in the wrong place. Building the envelope first means the centerpiece is *positioned correctly* from the start.
- **mc-fleet-bot's strengths.** The bot is good at bulk placement (mountain shells, city grids, chamber grids). The bot is *less* good at detail (sign text, 1-block accents, lighting tuning, the 4:1 gradient alignment in the service tunnel). The outside-in strategy plays to the bot's strengths in Phases 1–5 and reserves human or careful-bot work for Phase 6–7.

### 1.2 Why the 6 centerpieces are built last (not first)

- **Context is the payoff.** A 25-ton blast door in isolation is a 3-block-thick iron door. A 25-ton blast door at the end of a 100-block ascending minecart ride through a tunnel that visibly transitions from cream limestone to pink granite — crossing a horizontal contact at Y = 100 marked by a single carved-stone plaque in a 3×5 alcove — is *the Cheyenne moment*. The 100 blocks of *context* are what make the door iconic.
- **Iteration is cheaper early.** If the breccia strip is in the wrong place, it is a 1-block fix in Phase 7. If the public shaft is in the wrong place, it is a 5,000-block fix in Phase 6. Building the envelope first means *most* of the iteration is in Phase 1–2, when the blocks are cheap.
- **Quality control is easier late.** The centerpieces are the *things the visitor remembers*. If the service tunnel gradient is too steep for a minecart to climb, it is a *design* call to add more powered rails, not a *block* call to demolish 100 blocks of tunnel. The 6 centerpieces are built after the envelope is verified, so the design team can *tune* the centerpiece details without re-doing bulk placement.

### 1.3 The 7 phases (summary)

| Phase | Name | New blocks (approx.) | Critical-path? | Bot/human |
|---|---|---|---|---|
| **1** | World prep | ~50,000 | Yes (sets the world) | Bot |
| **2** | Continuous mountain + contact ring | ~1,650,000 | Yes (the silhouette) | Bot (bulk) + human (outcrops, contact ring, treeline) |
| **3** | City + Houston tunnel | ~1,250,000 | Yes (the anchor) | Bot (bulk) + human (skybridges, T-markers) |
| **4** | SubTropolis (chamber + sub-basement) | ~800,000 | Inherits 02-masterplan | Bot (per 02-masterplan) |
| **5** | Cheyenne (chamber + J-curve + outer portal) | ~580,000 | Inherits 01-masterplan | Bot (per 01-masterplan) |
| **6** | Inter-site connections (public shaft + service tunnel + horizontal portal + funicular + summit road) | ~25,000 | **Highest-risk** | Bot (bulk) + human (centerpieces, signage, gradient) |
| **7** | Finishing (composite terrane plaque, 9 easter eggs, lighting tuning, signage) | ~5,000 | Yes (the polish) | Human (or careful bot) |

**Total new blocks for the combined complex:** ~3.6 million (matches the research §10.4 estimate of ~3.5M total placed blocks; the individual sites contribute ~2.1M, the inter-site layer ~1.5M). The +100,000 vs. the ravine-era design is the additional mass of the continuous mountain's limestone body (no ravine void, so the rock has to go *somewhere* — it goes into the mountain bulk).

**Removed from the previous design:** the ravine excavation (~600,000 blocks of mass that was carved out and discarded in the previous design). The continuous mountain is a solid landform, so there is no ravine to remove.

---

## 2. Construction Phases (7 phases, in order)

### Phase 1 — World Prep

**Goal:** establish the world footprint, the sky limit, the bedrock buffer, and the basic terrain.

**Block budget:** ~50,000 blocks.

**Tasks:**
1. **World settings:** custom world type, build-height ≥ 1,024 blocks (the 01-masterplan's flag), simulation-distance 12, view-distance 16. The world is *flat* at this stage (a single layer of grass blocks at Y = 0), with the mountain range, the city, and the coastal plain as yet-uncarved regions.
2. **World footprint markers:** place 1-block stone brick markers at the 4 corners of the 1,500 × 1,500 world footprint, and at the 4 cardinal midpoints. These markers are *temporary* — they are removed in Phase 7 — but they serve as the builder's reference grid.
3. **Coordinate axes:** the X axis is east-west (positive east), the Z axis is north-south (positive north), the Y axis is up. The continuous mountain is north (Z = −100 to −700), the city is south (Z = 0 to +70), the coastal plain is east (X = +200 to +750) and south (Z = +70 to +700). The SubTropolis horizontal portal is at (X = 0, Y = 100, Z = −300). The Cheyenne outer portal is at (X = 0, Y = 300, Z = −500). The horizontal contact is at Y = 100.
4. **Sky limit:** the world has a custom build-height of 1,024. The top 200 blocks (Y = 824 to Y = 1,024) are reserved for the *above-the-peak* scenery (sky, distant clouds, stars at night). The bottom 100 blocks (Y = −120 to Y = −220, the bedrock analogue) are reserved as a buffer below the deepest excavation (the SubTropolis sub-basement at Y = −150).
5. **Initial terrain:** the world is a single layer of grass blocks at Y = 0, with sand at Y = 0 at the eastern edge (the coastal plain's beach). The continuous mountain, the city, and the contact ring are *not yet* placed — they are empty space.

**Dependencies:** none. This phase is the *first* block placed.

**Risk areas:**
- **World settings:** the build-height must be ≥ 1,024 *before* the first block is placed. If the build-height is set to vanilla 384, the world cannot host the mountain. The mc-fleet-bot `create_world` action must be configured with the custom build-height.
- **Coordinate system:** the X/Z axes must be agreed *before* the first block is placed. If the axes are flipped (the mountain is south of the city), the entire world is mirrored. The axes are a *contract* between the architectural designer and the bot.
- **The bedrock buffer:** the SubTropolis sub-basement is at Y = −150. Vanilla bedrock starts at Y = 0 (in the overworld) or Y = 0 (in the deepslate layer, starting at Y = 0 in 1.18+). The world must be configured with a *custom* deepslate/bedrock layer at Y = −220 or below, or the SubTropolis sub-basement will hit bedrock.

**Estimated time:** 10–15 minutes (mostly waiting for the world to generate).

**Quality checkpoint:** the world generates cleanly at 1,024 build-height, the 4 corner markers are visible, the 1-block grass layer is in place, and the coordinate axes are agreed.

---

### Phase 2 — Continuous Mountain + Contact Ring

**Goal:** build the continuous mountain (granite cap + limestone body) with the horizontal contact at Y = 100, the contact ring visible at the surface, and the surface features (forest, antenna arrays, summit station, snow line).

**Block budget:** ~1,650,000 blocks (700,000 granite + 950,000 limestone).

**Tasks:**
1. **Limestone body (lower two-thirds of mountain, Y = 0 to Y = 100):** a 800 × 600 × 100 block mass, with the base at Y = 0 (city level) and the top at Y = 100 (the contact). Material: smooth stone (the core rock, cream-grey), with calcite (the weathered surface) and grass-and-dirt overlays on the lower slopes. The limestone body is the *foundation* of the continuous mountain; it is built first, and the granite cap is placed on top of it.
2. **Granite cap (upper third of mountain, Y = 100 to Y = 800):** a 600 × 400 × 700 block mass, with the base at Y = 100 (the contact) and the summit at Y = 800. Material: polished diorite (the core), with diorite and granite (the upper weathered layer) and grass-and-dirt overlays on the lower slopes. The peak is built as a *cone* with a 5-block-wide ice cap at the summit. The granite cap is narrower than the limestone body (600 × 400 vs. 800 × 600), so the contact is visible as a *ring* of transition at the surface (the granite cap sits on top of the wider limestone body, like a cap on a wider base).
3. **Contact ring (Y = 100):** a 1–2-block-wide transition band ringing the mountain at Y = 100, where the granite (above) meets the limestone (below). Material: a 1-block-wide strip of mixed cobblestone + calcite + diorite at Y = 100, visible as a horizontal stripe on the mountain face. A single oak sign at the most prominent point on the ring (the south face, visible from the city) reads "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma." The contact ring is the *surface expression* of the horizontal contact; it is built at the same time as the mountain bulk.
4. **Forest:** oak and birch on the limestone slopes (Y = 0 to Y = 80, below the contact), spruce and dark oak on the granite slopes (Y = 100 to Y = 500, above the contact). The treeline transitions are at Y = 80 (limestone) and Y = 500 (granite). The forest is *geology-aware* — different trees on different rocks, with a sharp transition at the contact.
5. **Snow line:** snow layer on the granite peak from Y = 700 to Y = 800, with a 5-block-wide ice cap at the very summit.
6. **Antenna arrays:** 3–4 spruce-fence antenna poles on the granite peak ridgeline, with string "wires" between them (the 1960s NORAD-style radar installation).
7. **SubTropolis horizontal portal (placeholder):** a 4×5 placeholder opening in the limestone at (X = 0, Y = 100, Z = −300), facing south. The portal itself is *finished* in Phase 4; the placeholder is just the hole in the mountain.
8. **Cheyenne outer portal (placeholder):** a 6×6 placeholder opening in the granite at (X = 0, Y = 300, Z = −500), facing north. The portal itself is *finished* in Phase 5; the placeholder is just the hole in the mountain.
9. **Switchback road (south face, city → horizontal portal):** a 6-block-wide paved road switchbacking up the south face of the mountain from the city plaza (Y = 0) to the SubTropolis horizontal portal (Y = 100). 6 switchbacks over 100 blocks of elevation, each switchback a 20-block horizontal traverse on a 5-block-wide shelf cut into the limestone slope. The road is the *vehicle* connection from the city to the SubTropolis; the public shaft is the *pedestrian* connection.
10. **The "Three Sites, One Mountain" sign at the granite summit** (Easter egg #2): a 3×3 oak sign panel on a 1-block stone brick pedestal at the summit, with the text described in design-plan §12.
11. **The rock identification chart at the granite summit** (Easter egg #9): a 3-block display near the "Three Sites" sign.
12. **The funicular station at the granite summit:** a 10×10 block building at the summit, with oak log walls and spruce roof, a 1-block-wide rail track descending the north face to the Cheyenne outer portal at Y = 300, a 2×2 oak door entrance, a minecart with chest (the funicular car) at the top of the rail.

**Dependencies:** Phase 1 (world footprint).

**Risk areas:**
- **The contact ring placement:** the contact ring is at Y = 100, ringing the mountain. The bot must be told the *exact* Y coordinate of the contact (Y = 100, not Y = 99 or Y = 101). An off-by-1-block contact means the surface expression of the contact is at the wrong elevation, and the service tunnel contact crossing (Phase 6) won't align with the surface contact ring.
- **The mountain bulk:** the continuous mountain is a solid landform (1,650,000 blocks of rock). The bot must place this in *two layers* — limestone body first, then granite cap on top. The two layers must align at Y = 100; an off-by-1-block boundary means the contact is at the wrong elevation.
- **The forest placement:** the forest must match the rock type (oak/birch on limestone, spruce/dark-oak on granite). The bot must be told the *species* for each slope, not just "place trees." The transition at the contact must be *sharp* (oak/birch end at Y = 80, spruce/dark-oak start at Y = 100), not blended.
- **The switchback road geometry:** the road switchbacks 100 blocks of elevation over 6 switchbacks. The bot must be told the *exact* path (start, end, switchback locations, shelf widths). An off-by-1-block switchback means the road doesn't connect the city to the portal.
- **No ravine excavation:** the previous design's largest risk (the 100-block ravine excavation) is removed. The continuous mountain is a *placement* operation, not a *carve-out* operation. This is a major simplification.

**Estimated time:** 10–14 hours of bot time for the bulk placement, plus 3–5 hours of human time for the outcrops, the contact ring, the treeline transitions, the antenna arrays, the switchback road, the summit station, and the surface easter eggs.

**Quality checkpoint:** the mountain silhouette reads correctly from a mile away (a single mountain with a granite cap and a limestone body, the contact ring visible at Y = 100, the peak at Y = 800), the forest matches the rock type, the contact ring is at Y = 100, the SubTropolis horizontal portal placeholder is at the correct location, the Cheyenne outer portal placeholder is at the correct location, the switchback road connects the city to the portal. The 6 centerpieces are *not yet* placed.

---

### Phase 3 — City + Houston Tunnel

**Goal:** build the city above-ground and the Houston tunnel below-ground, with the Combined Complex Transit Hub plaza at the east edge.

**Block budget:** ~1,250,000 blocks (1,200,000 city + 50,000 tunnel).

**Tasks:**
1. **City footprint:** 144 × 96 block Houston-style city, oriented with the long axis east-west. Street grade at Y = 0.
2. **Anchor towers (4):** Wells Fargo (red sign, 70 blocks tall), JPMorgan Chase (blue sign, 80 blocks tall), Pennzoil Place (green sign, 60 blocks tall), Esperson (gold sign, 65 blocks tall). Stone brick + quartz + glass pane construction.
3. **Generic downtown towers (8–10):** 30–50 blocks tall, stone brick + glass pane.
4. **Parking garages (2–3):** 10–15 blocks tall, stone brick with concrete floors.
5. **Street grid:** stone brick roads (4 blocks wide) on a 12-block grid, with 1-block-wide oak-plank sidewalks.
6. **Skybridges:** glass-pane-enclosed crossings at Y = 5, connecting adjacent towers at the 2nd-floor level.
7. **Streetlights:** sea lanterns on oak fences, every 8 blocks along the streets.
8. **Houston tunnel (24-block sample):** 6×4 grid at Y = −6, with white concrete walls, white wool VCT floors, smooth stone slab dropped ceiling, sea lantern fluorescent lighting, channel-letter tenant signs (Esperson food court, 1001 Fannin, Pennzoil Place, McKinney Place). Inherited from the 03-masterplan.
9. **T-markers:** red wool on white concrete, at the two direct street-level tunnel entries (Wells Fargo and McKinney Garage) and at the public shaft entrance.
10. **The Combined Complex Transit Hub plaza:** 20×20 stone-brick plaza at the NE corner of the city, with a 7×7 *placeholder* at its center (the public shaft pavilion, built in Phase 6).
11. **Arrival road:** 4-block-wide stone-brick road from the coastal plain (east) to the city (west), with 1-block-wide oak-plank sidewalks and streetlights.

**Dependencies:** Phase 1 (world footprint), Phase 2 (the mountain provides the *backdrop* for the city, but the city is independent of the mountain's geometry).

**Risk areas:**
- **The public shaft buffer block:** the 7×7 shaft footprint occupies the SE corner of the Houston 24-block sample, plus 25 blocks beyond the sample (into the plaza). The 03-masterplan already flags this coordination point; the combined complex commits to a buffer-block placement. The builder must *not* place Houston tunnel blocks in the 7×7 shaft footprint.
- **The T-marker placement:** the T-markers are at the two direct street-level tunnel entries (Wells Fargo and McKinney Garage) and at the public shaft entrance. The T-marker is the build's *visual signature* for the civilian underground; the builder must place them in the *exact* spots identified in the 03-masterplan.
- **The skybridge geometry:** the skybridges are at Y = 5, connecting adjacent towers at the 2nd-floor level. The builder must match the *exact* tower heights and positions; a skybridge to a tower that is 1 block too short leaves a 1-block gap.
- **The street grid alignment:** the streets are on a 12-block grid, with the anchor towers at the cardinal points. The grid must be *square* and *aligned* to the coordinate axes; an off-by-1-block grid misaligns the skybridges and the T-markers.

**Estimated time:** 6–10 hours of bot time for the bulk placement, plus 3–5 hours of human time for the skybridges, the T-markers, the tenant signage, and the streetlights.

**Quality checkpoint:** the city reads correctly from above (4 anchor towers at the cardinals, 8–10 generic towers filling in, skybridges connecting adjacent towers, T-markers at the entries), the Houston tunnel is dim and beige-tiled, the transit hub plaza is in place at the east edge, the public shaft placeholder is in the correct spot.

---

### Phase 4 — SubTropolis (Chamber + Sub-Basement + Horizontal Portal)

**Goal:** build the SubTropolis chamber and sub-basement, with the horizontal portal at the south face of the mountain at Y = 100.

**Block budget:** ~800,000 blocks (700,000 chamber + 100,000 sub-basement).

**Tasks:**
1. **SubTropolis chamber:** 200 × 200 × 100 blocks, with the white-painted limestone pillars on 65-foot centers, the painted pillar numbers, the channel-letter tenant signs, the central plaza, the food court, the tenant fit-outs (USPS, NARA, Hallmark, Russell Stover, LightEdge, Grainger). Inherited from the 02-masterplan.
2. **SubTropolis sub-basement:** 100 × 100 × 30 blocks, at Y = −130 to Y = −160 (below the main chamber), with the service tunnel gate at the NW corner. Smooth stone walls, stone brick slab floor, redstone lamp lighting every 8 blocks. The sub-basement is the *starting point* of the service tunnel.
3. **SubTropolis horizontal portal:** 4×5 opening in the limestone hillside, at the south face of the mountain, at Y = 100, Z = −300. The portal opening was carved as a placeholder in Phase 2; the Phase 4 work is the *finishing* of the portal (frame, signs, gate, road connection, security booth).
   - **Frame:** smooth stone (the limestone) with chiseled calcite corners; a 1-block-wide polished diorite band directly above the frame (the contact plane, visible as a pink stripe over the cream portal).
   - **Sign above the portal:** "Hunt Midwest SubTropolis — Authorized Vehicles" (oak sign, black text, channel-letter-style).
   - **Sign below:** "World's Largest Underground Business Complex" (Easter egg #5).
   - **Vehicle gate:** oak fence gate, 2 blocks wide, at the portal mouth.
   - **Paved road connection:** the switchback road (built in Phase 2) connects to the portal mouth.
   - **Inside the portal:** a security gate, a turnstile, a vehicle checkpoint, with the SubTropolis main avenue (Hushpuckney) visible beyond.
4. **Hushpuckney Avenue extension:** the main avenue extends from the chamber (Y = −100) down a ramp to the sub-basement (Y = −130 to Y = −160), with the same asphalt road, 15-mph speed-limit signs, and painted pillar numbers.
5. **The sub-basement service tunnel gate:** iron bars gate at the NW corner of the sub-basement, with the "SERVICE TUNNEL → CHEYENNE / U.S. Space Force — Authorized Personnel Only" sign above. The tunnel beyond the gate is built in Phase 6.

**Dependencies:** Phase 1 (world footprint), Phase 2 (the mountain is the *envelope* for the chamber and the horizontal portal), Phase 3 (the city is *above* the chamber, but the chamber is independent of the city's geometry).

**Risk areas:**
- **The chamber excavation:** the SubTropolis chamber is *carved* out of the limestone body of the mountain, 100 blocks below the contact. The builder must remove 200 × 200 × 100 blocks of limestone to create the chamber. The excavation is *expensive* (200,000 blocks removed) and the chamber is *deep* (the bottom of the chamber is at Y = −100). The mc-fleet-bot `excavate` action is used for the bulk removal.
- **The pillar grid:** the 200 × 200 chamber has a 65-foot-center pillar grid, which at 1 block = 1 m is a 21-block-center grid (200 / 21 ≈ 9.5 pillars per side, with the spacing adjusted to fit). The pillars are 8 × 8 × 5 blocks, white-painted, with painted pillar numbers. The builder must match the *exact* pillar positions; an off-by-1-block pillar grid means the corridors are the wrong width.
- **The horizontal portal alignment:** the portal is at the south face of the mountain, at Y = 100 (the contact elevation), Z = −300. The portal must align with the switchback road (built in Phase 2) and the SubTropolis chamber (built in Phase 4). The builder must match the *exact* Y and Z coordinates.
- **The sub-basement service tunnel gate:** the gate is at the NW corner of the sub-basement, with the service tunnel extending *up and north* (through the limestone body, then through the contact, then through the granite) for ~100 blocks. The gate must align with the service tunnel (built in Phase 6). The builder must match the *exact* X and Z coordinates, and the *exact* elevation (Y = −160 at the gate, ascending to Y = +300 at the Cheyenne outer portal).
- **The contact band above the portal:** the 1-block-wide polished diorite band directly above the portal frame is the *visible* surface expression of the contact at the portal. The builder must place this band at the *exact* Y = 100 elevation, directly above the portal mouth.

**Estimated time:** 4–6 hours of bot time for the chamber excavation and pillar grid, plus 4–6 hours of human or careful-bot time for the tenant signage, the central plaza, the food court, the tenant fit-outs, the horizontal portal finishing, and the sub-basement service tunnel gate.

**Quality checkpoint:** the chamber reads correctly from the lobby (white pillars, painted numbers, channel-letter signs, 15-mph speed limits), the sub-basement is dimmer than the main chamber, the horizontal portal is visible from the switchback road (with the pink contact band above the cream portal frame), the service tunnel gate is at the NW corner of the sub-basement.

---

### Phase 5 — Cheyenne (Chamber + J-Curve + Outer Portal)

**Goal:** build the Cheyenne chamber and the J-curve access tunnel, with the outer portal at the granite face of the mountain at Y = 300.

**Block budget:** ~580,000 blocks (500,000 chamber + 50,000 J-curve + 30,000 outer portal approach).

**Tasks:**
1. **Cheyenne chamber:** 80 × 30 × 100 blocks, at Y = +250 to Y = +400 (1,800+ blocks of granite above), with the 1,319 half-ton coil springs (1-block gray wool + 1-block iron bars, repeated 1,319 times in a 4 × 4 m grid across the 80 × 30 chamber), the 15 steel-and-concrete buildings on the springs, the Combat Operations Center, the Air Defense Operations Center, the medical clinic, the Granite Inn bar, the central support area. Inherited from the 01-masterplan.
2. **Cheyenne J-curve:** 800-block curved tunnel through the granite, with three character stages (rough-hewn at the portal, concrete-lined at the side branch, polished institutional at the chamber), and the three 25-ton blast doors in a side branch (positive-pressure airlock). Inherited from the 01-masterplan.
3. **Cheyenne outer portal:** 6×6 opening in the granite, at the north face of the mountain, at Y = 300, Z = −500. The portal opening was carved as a placeholder in Phase 2; the Phase 5 work is the *finishing* of the portal (frame, signs, guard booth, connection to the J-curve, funicular rail connection).
   - **Frame:** polished diorite (the granite) with quartz-stair corners; concrete accents around the blast door recess.
   - **Sign at the portal:** "U.S. Space Force — Authorized Personnel Only" (oak sign, black text, Easter egg #6).
   - **Guard booth:** oak fence + sign, just inside the portal.
   - **Funicular rail connection:** the funicular rail (from the granite summit station, built in Phase 2) connects to the outer portal at Y = 300. The rail is *powered* (powered rail every 4 blocks) so the minecart can climb from the outer portal to the summit.
4. **The J-curve connection to the outer portal:** the J-curve's first 50 blocks (the rough-hewn stage) are extended from the chamber (Y = +300) up to the outer portal (Y = +300). The 50-block extension is the *new* work in the combined complex; the rest of the J-curve (the 750-block side branch and chamber approach) is inherited from the 01-masterplan.
5. **The 25-ton blast door at the outer portal:** 3-block-thick iron door in a 6-block-tall quartz-stair frame, at the end of the J-curve extension. Centerpiece #1 (built in Phase 6, but the *location* is reserved in Phase 5).

**Dependencies:** Phase 1 (world footprint), Phase 2 (the mountain is the *envelope* for the chamber), Phase 4 (the SubTropolis sub-basement service tunnel gate is the *starting point* of the service tunnel, built in Phase 6).

**Risk areas:**
- **The chamber excavation:** the Cheyenne chamber is *carved* out of the granite cap of the mountain, 400 blocks below the summit. The builder must remove 80 × 30 × 100 blocks of granite to create the chamber. The excavation is *expensive* (240,000 blocks removed) and the chamber is *deep* (the top of the chamber is at Y = +400, the bottom at Y = +250). The mc-fleet-bot `excavate` action is used for the bulk removal.
- **The J-curve geometry:** the J-curve is 800 blocks of curved tunnel through the granite, with the rough-hewn stage at the outer portal (Y = +300), the concrete-lined side branch at the mid-elevation, and the polished institutional stage at the chamber. The J-curve must connect the outer portal to the chamber; an off-by-1-block J-curve means the chamber is in the wrong place.
- **The outer portal alignment:** the portal is at the north face of the mountain, at Y = 300, Z = −500. The portal must align with the J-curve (built in Phase 5) and the funicular rail (built in Phase 2). The builder must match the *exact* Y and Z coordinates.
- **The funicular rail connection:** the funicular rail must connect the outer portal (Y = 300) to the summit station (Y = 800). The rail is 500 blocks of elevation gain over ~250 blocks of horizontal travel — a 2:1 gradient. The builder must place the rail on a *continuous* path, with powered rails every 4 blocks.

**Estimated time:** 4–6 hours of bot time for the chamber excavation and J-curve, plus 3–4 hours of human or careful-bot time for the spring layout, the buildings, the outer portal finishing, and the funicular rail connection.

**Quality checkpoint:** the chamber reads correctly from the J-curve entrance (1,319 springs visible, 15 buildings, Combat Operations Center, the dim climate-sealed feel), the J-curve transitions from rough-hewn at the outer portal to polished institutional at the chamber, the outer portal is visible from the funicular rail, the "U.S. Space Force" sign is at the portal.

---

### Phase 6 — Inter-Site Connections (Public Shaft + Service Tunnel + Funicular + Summit Road)

**Goal:** build the inter-site connections — the public shaft, the service tunnel (the ascending inclined minecart bore), the funicular rail extension, and the summit road. This is the **highest-risk phase** because the service tunnel gradient, the contact crossing, and the public shaft descent are the build's most technically demanding elements.

**Block budget:** ~25,000 blocks.

**Tasks:**
1. **The public shaft (city → SubTropolis):** 7×7 × 100 blocks, with the surface pavilion, the upper section, the mid-landing observation landing at Y = −50, the lower section, and the SubTropolis lobby at Y = −100. Built at the Combined Complex Transit Hub plaza (X = 60, Z = −70). Inherits the design-plan §3 spec.
   - **Surface pavilion:** 7×7 glass-and-steel pavilion, with guard booth, turnstile, T-marker, "SubTropolis — Public Access" sign, "EMPLOYEE ENTRANCE / EMERGENCY EGRESS" sign.
   - **Upper section (Y = −3 to Y = −50):** gray concrete walls, lift enclosure (iron bars), glass wall to the emergency stair on the west face, service chase on the east face.
   - **Mid-level observation landing (Y = −50):** 7×7 alcove with the G-Cans-style glass window (3×3 glass panes) looking out at the utility corridor, the labelled limestone block ("Bethany Falls Limestone — 270 Ma"), the bench, the information sign.
   - **Lower section (Y = −50 to Y = −100):** transition blocks (smooth stone → calcite), lift continues down.
   - **SubTropolis lobby (Y = −100):** 7×7 alcove with security gate, turnstile, "Welcome to SubTropolis" sign, "HELSINKI 5,500" reference sign (Easter egg #4), door opening onto Hushpuckney Avenue.
2. **The service tunnel (SubTropolis sub-basement → Cheyenne outer portal):** 6×6 × ~100 blocks, ascending at a 4:1 gradient from Y = −160 (sub-basement) to Y = +300 (outer portal), with powered rails every 4 blocks. Inherits the design-plan §4 spec. **The highest-risk sub-task** because of the gradient alignment.
   - **SubTropolis sub-basement gate (Y = −160):** iron bars gate, "SERVICE TUNNEL → CHEYENNE / U.S. Space Force — Authorized Personnel Only" sign, "Service Tunnel — Inspired by the Gotthard Base Tunnel" sign (Easter egg #3), "SBB CFF FFS" carving.
   - **Limestone section (~40 blocks, Y = −160 to Y = +100):** smooth stone walls (cream-grey), painted utility-line colors (light blue water, red power, white fiber-optic), stone brick slab floor, rails with powered rail every 4 blocks, redstone lamp every 8 blocks.
   - **Contact crossing (~5 blocks at Y = +100):** walls transition from cream smooth-stone (lower/south face) to pink polished diorite (upper/north face), 1-block-wide cobblestone + calcite breccia strip on the floor, 3×5 alcove carved into the upper (granite) wall with the composite terrane plaque (1×2 carved-stone, 6–7 oak signs of text, single redstone lamp on the alcove ceiling). **Centerpiece #3 + Easter Egg #1**, built in this phase but finalized in Phase 7.
   - **Granite section (~40 blocks, Y = +100 to Y = +300):** polished diorite walls (pink-grey), utility strip in Cheyenne colors (gray water, black power, red fiber-optic), polished diorite slab ceiling, rails with powered rail every 4 blocks, redstone lamp every 8 blocks.
   - **Cheyenne outer portal approach (Y = +300):** 4-block concrete-and-granite checkpoint corridor, 25-ton blast door (3-block-thick iron door, quartz-stair frame), guard booth, "U.S. Space Force" sign. **Centerpiece #1**, built in this phase but finalized in Phase 7.
3. **The composite terrane plaque at the contact crossing (Easter egg #1, Centerpiece #3):** built as part of the service tunnel contact crossing. 1×2 carved-stone plaque (chiseled calcite + chiseled stone brick) in the 3×5 alcove, with 6–7 oak signs of geological text, single redstone lamp on the alcove ceiling. 1-block-wide cobblestone + calcite breccia strip on the floor at the contact. **This is the Telling Detail moment of the build.**
4. **The SubTropolis horizontal portal finishing (continued from Phase 4):** security gate, turnstile, vehicle checkpoint, "Welcome to SubTropolis" channel-letter sign at the portal mouth. Connected to the switchback road.
5. **The funicular rail extension (Phase 2 → Phase 6):** the funicular rail from the granite summit station (Y = 800) to the Cheyenne outer portal (Y = 300) is the *Phase 6* work (Phase 2 placed the summit station and the placeholder rail; Phase 6 completes the rail). 500 blocks of elevation gain, ~250 blocks of horizontal travel, 2:1 gradient, powered rail every 4 blocks.
6. **The summit road (granite summit → city):** 6-block-wide paved road switchbacking down the south face of the mountain from the granite summit (Y = 800) to the Combined Complex Transit Hub plaza (Y = 0). 6–8 switchbacks over 800 blocks of elevation, each switchback a 30-block horizontal traverse on a 5-block-wide shelf. The road is the *gradual* return route.

**Dependencies:** Phase 1 (world footprint), Phase 2 (the mountain provides the *envelope* for the service tunnel, the funicular, and the summit road), Phase 3 (the city is the *destination* of the summit road), Phase 4 (the SubTropolis sub-basement is the *starting point* of the service tunnel), Phase 5 (the Cheyenne outer portal is the *ending point* of the service tunnel and the *starting point* of the funicular).

**Risk areas:**
- **The service tunnel gradient:** the tunnel is 6×6 × ~100 blocks, ascending at a 4:1 gradient from Y = −160 to Y = +300. The bot must be told the *exact* path (start, end, gradient, contact crossing location). An off-by-1-block path means the tunnel misses the contact crossing or arrives at the wrong elevation. **This is the single highest-risk sub-task in the build.**
- **The contact crossing alignment:** the contact crossing is at the midpoint of the tunnel, at Y = +100. The bot must be told the *exact* X/Z coordinate of the contact crossing. An off-by-1-block contact crossing means the breccia strip is *not* at the contact, and the composite terrane plaque is at the wrong elevation. The surface contact ring (Phase 2) and the service tunnel contact crossing (Phase 6) must align — the plaque is at the same Y as the surface ring.
- **The powered rail density:** the minecart must climb a 4:1 gradient with powered rails every 4 blocks. If the powered rails are spaced too far apart, the minecart stalls mid-climb. If they are too close, the minecart launches at the top. The bot must place the powered rails at the *exact* 4-block spacing.
- **The 3×5 alcove carving:** the alcove is carved into the upper (granite) wall of the 6×6 at the contact crossing. The alcove is 3×5×3 blocks, with the plaque on the back wall, the breccia strip on the floor of the tunnel, and the redstone lamp on the alcove ceiling. The bot must be told the *exact* alcove geometry.
- **The 25-ton blast door:** the door is a 3-block-thick iron door in a 6-block-tall quartz-stair frame. The door must be *visible* from the approaching minecart — the player sees the door growing from a 1-block dark patch to a wall of iron as the cart approaches. The bot must place the door at the *exact* end of the service tunnel, in the *correct* orientation (the door faces south, toward the approaching cart).
- **The public shaft descent:** the shaft is 7×7 × 100 blocks, with the mid-landing at Y = −50. The bot must place the shaft at the *exact* (X = 60, Z = −70) coordinates, with the mid-landing at the *exact* Y = −50 elevation. An off-by-1-block shaft means the mid-landing window doesn't align with the utility corridor.
- **The summit road gradient:** the road is 6 blocks wide and switchbacks down 800 blocks of elevation. The bot must be told the *exact* path (start, end, switchback locations, shelf widths). The road must connect the granite summit station (Phase 2) to the Combined Complex Transit Hub plaza (Phase 3).

**Estimated time:** 6–10 hours of bot time for the bulk placement (public shaft excavation, service tunnel inclined bore, funicular rail, summit road), plus 8–12 hours of human or careful-bot time for the centerpieces (mid-landing, blast door, contact crossing alcove, plaque), the signage, the gradient alignment, and the utility strip colors.

**Quality checkpoint:** the public shaft descent takes 30 sec (lift) or 5 min (stair), the mid-landing window shows the G-Cans-style pillar, the service tunnel minecart ride takes 2–3 min and ascends continuously, the walls visibly transition at the contact, the breccia strip is visible at the contact, the composite terrane plaque is readable in its 3×5 alcove, the blast door is visible from the approaching cart, the funicular rail is continuous from the outer portal to the summit station, the summit road connects the summit to the city plaza.

---

### Phase 7 — Finishing (Composite Terrane Plaque, Easter Eggs, Lighting, Signage)

**Goal:** finalize the build — the composite terrane plaque text, the remaining 8 easter eggs, the lighting tuning, the signage review, the visitor journey timing test, the cleanup of temporary markers.

**Block budget:** ~5,000 blocks.

**Tasks:**
1. **Composite terrane plaque finalization (Easter egg #1, Centerpiece #3):** the 1×2 carved-stone plaque and the 6–7 oak signs of geological text in the 3×5 alcove at the service tunnel contact crossing. The plaque text is verified for accuracy and readability. The single redstone lamp on the alcove ceiling is verified to be on.
2. **"Three Sites, One Mountain" sign at the granite summit (Easter egg #2):** verify the 3×3 oak sign panel and the 5-line text are in place and readable.
3. **"Service Tunnel — Inspired by the Gotthard Base Tunnel" sign (Easter egg #3):** verify the "SBB CFF FFS" carving and the main sign are in place at the SubTropolis end of the service tunnel.
4. **"Public Shaft — Inspired by the Helsinki Underground Master Plan" sign (Easter egg #4):** verify the "HELSINKI 5,500" sign is in place at the bottom of the public shaft.
5. **"World's Largest Underground Business Complex" sign (Easter egg #5):** verify the sign is in place at the SubTropolis horizontal portal.
6. **"U.S. Space Force — Authorized Personnel Only" sign (Easter egg #6):** verify the sign is in place at the Cheyenne outer portal.
7. **Houston T-markers (Easter egg #7):** verify the T-markers are at the two direct street-level tunnel entries (Wells Fargo and McKinney Garage) and at the public shaft entrance.
8. **Thrust-fault breccia strip (Easter egg #8):** verify the 1-block-wide cobblestone + calcite strip is on the floor of the service tunnel at the contact crossing, and the 1–2-block contact ring is visible at the surface at Y = 100.
9. **Rock identification chart at the granite summit (Easter egg #9):** verify the 3-block display with item frames is in place.
10. **Lighting tuning:** verify redstone lamp density in the public shaft, the service tunnel, the SubTropolis sub-basement, the Cheyenne J-curve, and the outer portal. Verify sea lantern placement in the Houston tunnel, the SubTropolis chamber, and the city. Verify the mid-landing window alignment (the G-Cans-style pillar should be visible through the glass).
11. **Forest tuning:** verify the forest matches the rock type (oak/birch on limestone, spruce/dark-oak on granite). Verify the treeline transitions at Y = 80 (limestone) and Y = 500 (granite).
12. **Contact ring review:** verify the 1–2-block transition band is visible at the surface at Y = 100, ringing the mountain.
13. **SubTropolis horizontal portal review:** verify the 4×5 opening is at the south face, the pink contact band is directly above the cream portal frame, the signs are in place, the switchback road connects to the portal.
14. **Funicular test ride:** place the minecart with chest at the granite summit station, ride down to the Cheyenne outer portal. Verify the rail is continuous, the powered rail density is correct, the climb is smooth.
15. **Service tunnel test ride:** place the minecart at the SubTropolis sub-basement gate, ride up to the Cheyenne outer portal. Verify the rail is continuous, the powered rail density is correct, the walls transition at the contact, the breccia strip is visible, the plaque is readable, the blast door is visible from the approaching cart.
16. **Public shaft test:** walk the public shaft from the surface pavilion to the SubTropolis lobby. Verify the mid-landing window shows the utility corridor, the limestone block label is readable, the emergency stair is visible through the glass wall.
17. **Visitor journey timing test:** time the full visitor journey from the city surface to the Cheyenne chamber. Target: 30–45 minutes of focused play. If the journey is too short, add more detail to the SubTropolis chamber or the Cheyenne chamber. If the journey is too long, streamline the SubTropolis walk.
18. **Return route test:** ride the funicular from the Cheyenne outer portal to the granite summit, walk the summit road from the summit to the city. Verify the funicular climb is smooth, the summit views are clear, the road switchbacks are walkable.
19. **Remove temporary markers:** the 4 corner footprint markers from Phase 1.
20. **Final review:** walk the full journey end-to-end, from the city surface to the Cheyenne chamber and back. Verify all 6 centerpieces, all 9 easter eggs, the 4-layer defense-in-depth cross-section, the 30–45 minute journey time, the ~13 minute return time.

**Dependencies:** Phases 1–6 (all bulk placement complete).

**Risk areas:**
- **The visitor journey timing:** the journey must be 30–45 minutes. If the SubTropolis walk is too long, it is a *design* call to streamline (not a *block* call to remove pillars). If the Cheyenne chamber walk is too long, it is a *design* call to focus the visit on the Combat Operations Center only.
- **The return route timing:** the return must be ~13 minutes. If the funicular climb is too slow, add more powered rails. If the summit road is too long, reduce the number of switchbacks.
- **The plaque text accuracy:** the composite terrane plaque text must be *geologically accurate*. The text references the 1.08 Ga Pikes Peak granite and the 270 Ma Bethany Falls limestone — these are the real ages of the real rocks. The horizontal contact is real geology (granite plutons push up through limestone in mountain ranges worldwide). The text must be reviewed by the design team for accuracy before the plaque is finalized.
- **The T-marker placement:** the T-markers are the build's *visual signature* for the civilian underground. They must be at the *exact* spots — Wells Fargo entry, McKinney Garage entry, public shaft entrance. An off-by-1-block T-marker means the visual signature is broken.
- **The lighting mood:** the lighting is what makes the build feel *deep* and *climate-sealed*. The redstone lamp density in the public shaft, the service tunnel, and the Cheyenne chamber must be *tuned* — too bright and the build feels like a basement, too dim and the build is unreadable. The design team must walk the build at night and verify the lighting.

**Estimated time:** 4–8 hours of build time (mostly human-time polish). At 4 hours per day, this is **1–2 days** of calendar time.

**Quality checkpoint:** all 9 easter eggs are in place and readable, the lighting matches the plan, the visitor journey takes 30–45 minutes, the return route takes ~13 minutes, the funicular and minecart rides are smooth, the temporary markers are removed, the composite terrane plaque is at the service tunnel contact crossing (not at a ravine bottom). The build is *complete*.

---

## 3. Tools & Workflow

### 3.1 Schematic-based or in-place build?

The build is **schematic-based for the bulk placement, in-place for the detail**. The bot places the mountain bulk, the chamber grid, the city grid, and the inter-site connections as schematics (or as `fill` commands for large volumes). The human (or careful bot) places the centerpieces, the easter eggs, the signage, the lighting, and the plaque text in-place.

### 3.2 The 3 individual site masterplans

The 3 individual site masterplans (Cheyenne, SubTropolis, Houston) already have contractor briefs. The combined complex's inter-site connections (public shaft, service tunnel, horizontal portal, funicular, summit road) are *new* work and require their own contractor briefs. The inter-site layer is the focus of this working plan; the 01–03 working plans are referenced at the appropriate phase boundaries.

### 3.3 Use of `/fill`, WorldEdit, schematic placement

- **`/fill` for large volumes:** the mountain bulk (Phase 2), the chamber grids (Phases 4–5), the city grid (Phase 3), and the tunnel excavations (Phases 4–6) are placed with `/fill` commands. The bot's `fill` action is used for these operations.
- **WorldEdit schematics for repeated structures:** the 4 anchor towers (Phase 3), the 15 Cheyenne buildings (Phase 5), the SubTropolis pillars (Phase 4), and the inter-site connections (Phase 6) are placed as WorldEdit schematics. The bot's `schematic_place` action is used.
- **In-place for detail:** the 6 centerpieces (Phase 6), the 9 easter eggs (Phase 7), the lighting (Phase 7), and the plaque text (Phase 7) are placed in-place by the human or a careful bot.

### 3.4 Bot-based construction or human?

- **Bot-based construction:** Phases 1–6 (bulk placement). The bot is good at large-volume placement, schematics, and `/fill` commands. The bot is *not* good at the 1-block detail of the centerpieces and easter eggs.
- **Human (or careful bot) for detail:** Phase 7 (finishing). The human places the 6 centerpieces, the 9 easter eggs, the lighting, the signage, and the plaque text. A *careful* bot can place the plaque text (oak signs with specific text) and the T-markers, but the *design* of the centerpieces is human work.

### 3.5 The mc-fleet-bot actions used

- `create_world` (Phase 1): creates the world with custom build-height, world type, simulation-distance, view-distance.
- `fill` (Phases 2–6): fills large volumes with a single block type. Used for the mountain bulk, the chamber grids, the city grid, the tunnel excavations.
- `schematic_place` (Phases 3–6): places a WorldEdit schematic at a specified location. Used for the towers, the buildings, the pillars, the inter-site connections.
- `setblock` (Phase 7): places a single block at a specified location. Used for the easter eggs, the signage, the T-markers, the plaque text.
- `excavate` (Phases 4–5): removes a specified volume of blocks. Used for the chamber excavations (SubTropolis, Cheyenne).
- `tp` (Phase 7): teleports the player to a specified location for testing.

---

## 4. Quality Checkpoints

### 4.1 After each phase, what to verify

- **Phase 1 (World prep):** the world generates cleanly at 1,024 build-height, the 4 corner markers are visible, the coordinate axes are agreed.
- **Phase 2 (Continuous mountain):** the mountain silhouette reads correctly from a mile away, the contact ring is at Y = 100, the forest matches the rock type, the placeholders for the SubTropolis horizontal portal and the Cheyenne outer portal are at the correct locations.
- **Phase 3 (City + Houston tunnel):** the city reads correctly from above, the Houston tunnel is dim and beige-tiled, the transit hub plaza is in place, the public shaft placeholder is in the correct spot.
- **Phase 4 (SubTropolis):** the chamber reads correctly from the lobby, the sub-basement is dimmer than the main chamber, the horizontal portal is visible from the switchback road (with the pink contact band above the cream portal frame), the service tunnel gate is at the NW corner of the sub-basement.
- **Phase 5 (Cheyenne):** the chamber reads correctly from the J-curve entrance, the J-curve transitions from rough-hewn to polished institutional, the outer portal is visible from the funicular rail, the "U.S. Space Force" sign is at the portal.
- **Phase 6 (Inter-site connections):** the public shaft descent is functional, the mid-landing window shows the utility corridor, the service tunnel minecart ride is smooth, the walls transition at the contact, the breccia strip is visible, the composite terrane plaque is readable, the blast door is visible from the approaching cart, the funicular rail is continuous, the summit road connects the summit to the city.
- **Phase 7 (Finishing):** all 9 easter eggs are in place and readable, the lighting matches the plan, the visitor journey takes 30–45 minutes, the return route takes ~13 minutes, the temporary markers are removed.

### 4.2 The inter-site connections are the critical checkpoints

The **public shaft, the service tunnel, the SubTropolis horizontal portal, the funicular, and the summit road** are the *critical checkpoints* because they are the build's centerpieces and the most technically demanding elements. The checkpoints at Phase 6 are:
- **Service tunnel gradient:** ride the minecart from the SubTropolis sub-basement to the Cheyenne outer portal. The cart must climb continuously without stalling.
- **Contact crossing:** the breccia strip must be visible at the contact, the plaque must be readable in its 3×5 alcove, the redstone lamp must be on.
- **Blast door:** the door must be visible from the approaching minecart, growing from a 1-block dark patch to a wall of iron.
- **Public shaft mid-landing:** the G-Cans-style pillar must be visible through the glass window, the limestone block label must be readable.
- **Funicular:** place the minecart at the summit station, ride down to the outer portal. The rail must be continuous, the climb must be smooth.
- **Summit road:** walk the road from the summit to the city. The switchbacks must be walkable, the road must connect to the city plaza.

### 4.3 The visitor journey timing (30–45 minutes)

The full visitor journey, end-to-end, must be 30–45 minutes of focused play. The breakdown:
- **Stage 1 (City surface):** ~3 min — arrive, walk to public shaft entrance.
- **Stage 2 (Houston tunnel):** ~5 min — descend, walk the 24-block sample, food court stop.
- **Stage 3 (Public shaft):** ~2 min — descend 100 blocks, mid-landing pause.
- **Stage 4 (SubTropolis):** ~10 min — walk the chamber, central plaza, tenant fit-outs, sub-basement descent.
- **Stage 5 (Service tunnel):** ~3 min — minecart ride through the contact crossing, blast door arrival.
- **Stage 6 (Cheyenne):** ~12 min — J-curve walk, chamber visit, spring layout, Combat Operations Center, Granite Inn bar.
- **Total inbound:** ~35 min.
- **Return (funicular + road):** ~13 min.
- **Total round trip:** ~48 min.

The journey timing is verified in Phase 7 by timing the full round trip. If the journey is too long (>45 minutes inbound), the design team can streamline the SubTropolis walk (focus on the central plaza and 2-3 tenant fit-outs, skip the rest) or the Cheyenne chamber visit (focus on the Combat Operations Center, skip the rest). If the journey is too short (<30 minutes), the design team can add more detail to the SubTropolis chamber (more tenant fit-outs, more signage) or the Cheyenne chamber (more buildings, more spring detail).

### 4.4 The defense-in-depth layering visibility

The 4-layer defense-in-depth cross-section is the build's *visual signature*. The visitor's path must traverse all 4 layers in a single trajectory, and the layer changes must be *visible*:
- **Layer 1 (Civilian surface):** the city is hot, sunlit, daylit. The visitor is in the public world.
- **Layer 2 (Climate-controlled shallow):** the Houston tunnel is dim, beige-tiled, fluorescent. The visitor is in the climate-controlled basement.
- **Layer 3 (Industrial limestone):** the SubTropolis chamber is white-pillared, channel-letter-signed, working. The visitor is in the working limestone.
- **Layer 4 (Military granite):** the Cheyenne chamber is spring-mounted, blast-doored, climate-sealed. The visitor is in the deep granite.

The layer changes are *felt* by the visitor through the light, climate, era, and use case changes. The build's narrative spine is the layer changes; the design team must verify the layer changes are *visible* by walking the full journey and noting the transitions.

---

## 5. Risk Register — Updated

### 5.1 The V-shaped ravine excavation risk is REMOVED

The previous design's highest-risk operation — the V-shaped ravine excavation, 100 blocks deep, 600 blocks long, 200 blocks wide at the bottom — is **no longer needed**. The continuous mountain is a solid landform; there is no ravine to carve out. This is the single largest risk reduction in the no-ravine rework.

### 5.2 New risks

- **The service tunnel gradient alignment:** the service tunnel is an ascending inclined minecart bore, 6×6 × ~100 blocks, with a 4:1 gradient from Y = −160 to Y = +300. The bot must place the tunnel on a *continuous* path, with the *exact* start and end coordinates, the *exact* gradient, and the *exact* contact crossing location (at the midpoint, at Y = +100). An off-by-1-block path means the tunnel misses the contact crossing or arrives at the wrong elevation. **This is the new single highest-risk sub-task in the build.**
- **The contact crossing alignment (surface and tunnel):** the surface contact ring (Phase 2) and the service tunnel contact crossing (Phase 6) must align at Y = +100. The breccia strip in the service tunnel floor must be at the same Y as the contact ring on the mountain face. An off-by-1-block contact crossing means the breccia strip is *not* at the contact, and the composite terrane plaque is at the wrong elevation.
- **The horizontal contact elevation in the mountain bulk:** the continuous mountain is built in two layers — limestone body (Y = 0 to Y = 100) and granite cap (Y = 100 to Y = 800). The boundary between the layers must be at *exactly* Y = 100, not Y = 99 or Y = 101. An off-by-1-block boundary means the contact is at the wrong elevation, and the surface contact ring, the service tunnel contact crossing, and the SubTropolis horizontal portal contact band all miss the contact.
- **The SubTropolis horizontal portal position:** the portal is at the south face of the mountain, at Y = 100 (the contact elevation), Z = −300. The portal must align with the switchback road (built in Phase 2) and the SubTropolis chamber (built in Phase 4). The 1-block-wide polished diorite band directly above the portal frame is the *visible* surface expression of the contact at the portal. The builder must place this band at the *exact* Y = 100 elevation, directly above the portal mouth.

### 5.3 Continuing risks from the previous design

- **The 1,500 × 1,500 × 800 world footprint is still a render-distance challenge:** the world is large, and the render and simulation distances are at the upper end of what vanilla Minecraft handles. The fully-built core samples vs. referenced outer zones compromise (per research §10.5) still applies.
- **The 1,800+ block mountain still requires 1,024+ build height:** the mountain peak is at Y = 800, which requires a custom build-height of at least 1,024. The mc-fleet-bot `create_world` action must be configured with the custom build-height.
- **The 800-block J-curve is still a long curved tunnel:** the J-curve is inherited from the 01-masterplan and is one of the build's longest single elements. The risk is the same as the 01-masterplan's J-curve risk.
- **The 200×200 SubTropolis chamber is still a large excavation:** the chamber is 200 × 200 × 100 blocks, an expensive excavation. The risk is the same as the 02-masterplan's chamber risk.

### 5.4 Risk summary

| Risk | Severity | Status |
|---|---|---|
| V-shaped ravine excavation | ~~High~~ | **REMOVED** in the no-ravine design |
| Service tunnel gradient alignment | **High** (NEW) | The highest-risk sub-task in the build |
| Contact crossing alignment (surface and tunnel) | **High** (NEW) | Must align at Y = +100 |
| Horizontal contact elevation in mountain bulk | **High** (NEW) | Must be at exactly Y = 100 |
| SubTropolis horizontal portal position | Medium (NEW) | Must align with switchback road and contact band |
| 1,500 × 1,500 world footprint / render distance | Medium | Continuing risk from previous design |
| 1,800+ block mountain / 1,024+ build height | Medium | Continuing risk from previous design |
| 800-block J-curve | Low | Inherited from 01-masterplan, low incremental risk |
| 200×200 SubTropolis chamber excavation | Low | Inherited from 02-masterplan, low incremental risk |
| Public shaft descent (7×7 × 100 blocks) | Low | Straight vertical, well-understood geometry |
