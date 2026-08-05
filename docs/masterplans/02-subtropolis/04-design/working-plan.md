# SubTropolis — Working Plan (Construction Sequence)

> **Architectural Designer deliverable for the AI Contractor Writer.**
> Companion to `design-plan.md`. This document specifies the **construction sequence** — the order in which blocks get placed, the tools and workflow, and the quality-check process.
> The Site Planner's `site-plan.md` and `site-coordinates.json` provide ravine-wall placement, portal coordinates, and the inter-site connection points.

---

## 1. Build Strategy

**Carve first, then build.**

The SubTropolis build is **subtractive before it is additive**: the place is a *hole in a hill*, not a building on flat ground. The construction sequence must therefore begin with terrain, then carve the chamber, then build the contents.

**Why carve-first, not build-first**: trying to construct the tenant zones before the chamber exists means placing blocks in mid-air, fighting gravity, and then re-shaping the room around them. Carving first gives a clean, flat, sealed chamber with predictable coordinates, on top of which the tenant fit-outs can be assembled as *additions* rather than *foundations*.

**Why not schematic-first**: a 200×200 chamber with 30+ tenant fit-outs, 6+ corridors, 2 side spurs, and 2 portal terminations is too irregular to schematic in one pass. The pillar grid is regular and could be schematic-placed, but the tenant interiors are too varied. The right hybrid is: **schematic the regular parts (chamber shell, pillar grid, main avenue) and in-place-build the irregular parts (tenant fit-outs, signage, easter eggs, climate-control details).**

**Why not bot-first**: the build is large but the bot tooling in this project is best used for *the* big regular operations (chamber carving, pillar grid placement) where the bot can do in seconds what a human would do in hours. Tenant fit-outs and easter eggs are human-scale and human-judgment; a human or a tightly-scripted bot should do those.

---

## 2. Construction Phases

The build proceeds in **7 phases**. Each phase is a discrete deliverable that can be reviewed, tested, and revised before the next phase begins. Block counts are estimates; the actual build will use schematic or bot placement for the bulk operations.

### Phase 1 — Site prep and ravine carving

**Goal**: the surface plateau exists; the ravine wall is carved to expose the south face; the SubTropolis footprint is roughly hollowed out as a void.

**Activities**:
- Build the **80×60 block surface plateau** at the design Y-level (the visitor center sits here). **Grass blocks** on top, **dirt** for 2–3 blocks of topsoil, then **stone** bedrock below.
- Carve the **ravine wall** on the south face — a vertical or near-vertical wall of **stone** and **calcite** that exposes a horizontal opening for the portal. The wall is at least **50 blocks tall** above the SubTropolis floor (so the player descends a real distance).
- Carve the **200×200 block SubTropolis footprint** as a rough void at the design Y-level — all **stone** (not yet painted). Floor is **stone** (not yet polished). Ceiling is **stone** (not yet painted). The chamber is *unfinished* at this stage.
- Build the **exit portal** on a *perpendicular* ravine face (per the deliberation Topic 1) as a smaller, rougher opening. The exit is to be finished in Phase 6.

**Block count estimate**:
- Surface plateau: 80 × 60 × 3 = ~14,400 blocks (grass + dirt + stone)
- Ravine wall carving: ~80 × 50 × 30 = ~120,000 blocks carved (subtractive)
- Footprint hollowing: 200 × 200 × 5 = ~200,000 blocks carved (subtractive; the 5-block ceiling height)
- **Net removed**: ~320,000 blocks of stone. This is the largest single phase by block count.

**Time estimate**:
- Surface plateau: 30–60 minutes via `/fill` and `mc-fleet-bot` placement.
- Ravine carving: 1–2 hours via WorldEdit or `mc-fleet-bot` `//replace` (or `//walls`/`//faces`).
- Footprint hollowing: 2–4 hours via WorldEdit or bot-based chamber fill.

**Dependencies**:
- The site planner must provide the ravine-wall geometry, the SubTropolis Y-level (floor elevation), and the portal coordinates before Phase 1 begins.

**Risk areas**:
- **Render distance**: a 200×200 chamber is at the edge of Minecraft render distance. The build will need `simulation-distance: 12+` and `view-distance: 16+` in `server.properties` to be navigable. **Flag for the user / server admin.**
- **Lighting during carve**: a fully hollowed chamber with no light sources is a *mob spawn zone* in vanilla survival. Either light the chamber immediately after carving (Phase 1.5) or play in creative mode.
- **Bedrock at the bottom**: if the site-planner Y-level is too low, the chamber floor intersects bedrock. The site planner must set the floor at Y=10 or higher.

**Quality checkpoint**: take a screenshot from the visitor-center coordinates looking out across the ravine. The view should show the ravine wall, the portal opening as a dark void, and the surface plateau.

---

### Phase 2 — Carve the mine: pillars, ceiling, floor

**Goal**: the 200×200 chamber has its 5-block ceiling painted white, its floor polished, and its 8×8 pillars placed on the iconic-intersection grid.

**Activities**:
- **Ceiling paint**: replace the top 1 block of the chamber ceiling with **white concrete** across the full 200×200 footprint. Leave a 1-block band of exposed **smooth stone** at the very top to suggest the original excavation. *(Approximately 200 × 200 = 40,000 blocks.)*
- **Pillar placement**: place **8×8×5 block pillars** of **white concrete** at every iconic intersection on the main avenue. The main avenue is ~350 blocks long; the iconic-intersection spacing is 30–40 blocks, giving ~9–12 iconic intersections. The cross-avenues intersect the main avenue at 5–7 points, each with 4 pillars. **Total iconic pillars: ~60–80 pillars**, each 8×8×5 = 320 blocks. **Total: ~20,000–25,000 blocks of pillar.**
- **Pillar bases and caps**: at every iconic-intersection pillar, add a 1-block band of **light gray concrete** at the top and bottom to suggest paint wear. A few iconic pillars are upgraded to **smooth quartz** for visual emphasis (every 4th pillar on the main avenue).
- **Floor polish**: replace the chamber floor with **polished andesite** across the full 200×200 footprint. *(Approximately 200 × 200 = 40,000 blocks.)*
- **Service sub-basement**: below the main grid, carve a 20×20 block sub-basement at Y-10, accessed by a 30-block downward corridor. This is the service-tunnel terminus. Done early so it doesn't disrupt later phases. **Net carved: ~14,000 blocks of stone.**

**Block count estimate**: ~120,000 blocks (ceiling paint + floor polish + pillars + service sub-basement).

**Time estimate**:
- Ceiling paint and floor polish: 30–60 minutes via WorldEdit `//replace` operations.
- Pillar placement: 1–2 hours via schematic placement (each iconic pillar is identical; build one and paste ~70 times).
- Service sub-basement: 30 minutes via WorldEdit.

**Dependencies**:
- Phase 1 must be complete. The chamber shell must exist before pillars are placed.

**Risk areas**:
- **Pillar schematic accuracy**: each 8×8×5 pillar must be placed at exact integer coordinates. Off-by-one errors are visible and hard to fix later. The build script should place pillars at fixed coordinates from a configuration file, not by hand.
- **Service sub-basement depth**: at Y-10, the sub-basement must not intersect bedrock. The site planner must confirm the chamber floor Y-level leaves room for the sub-basement.

**Quality checkpoint**: walk the main avenue from the portal to the central plaza. The first iconic intersection (3×3 grid of 8×8 white pillars) should be visible from the bottom of the entrance ramp. The pillars should be evenly spaced and identical in proportion.

---

### Phase 3 — Main avenue and signage

**Goal**: the 350-block main avenue (Hushpuckney) has lane markings, street signs, stop signs, speed-limit signs, painted pillar numbers, and the central plaza.

**Activities**:
- **Lane markings on Hushpuckney**: replace the center block of the main avenue floor (a 1-block-wide stripe down the middle) with **yellow concrete** for 350 blocks. Add **white concrete** edge lines (1-block wide) on each side. *(Approximately 350 × 3 = ~1,050 blocks.)*
- **Street signs at intersections**: at every iconic intersection, place a 1×3 block **green concrete** street-name sign on a **fence post** stem on each corner. One sign per direction. ~9–12 intersections × 4 corners × 2 signs per corner = ~60–100 signs. **Invented street names**: Hushpuckney Ave (canonical, `[D]`), Bethany Falls Blvd, Iola Ln, Muncie Dr, Galesburg Way, Winterset Crossing. Each sign uses **oak signs** for the text (more legible than painted blocks). *[X]*
- **Stop signs at intersections**: 2-block **red concrete** octagons (approximated as squares) on **fence post** stems at the four corners of every iconic intersection. ~50 stop signs. *[I]*
- **SPEED LIMIT 15 signs**: 2×2 block **white concrete** signs with **black concrete** lettering on **fence post** stems at the portal entrance and at every major intersection. ~12–15 signs. *[D]*
- **Painted pillar numbers**: at every iconic-intersection pillar, paint a 2-block-tall **black concrete** number on the pillar face at human-readable height (3 blocks up). The numbering scheme is **block-number + cross-street abbreviation** (e.g., "911.10"). Build a sign-painting script that places numbers at fixed coordinates. **At least 12 visible numbered pillars.** *[D]*
- **The central plaza**: at the intersection of Hushpuckney and Bethany Falls, expand the floor to a 20×20 block circular **quartz** plaza with a 3-block-diameter **quartz** medallion in the center (the Hunt Hall marker). *[I]*
- **The "SubTropolis — Est. 1964" plaque**: place on a pillar at the central plaza. See design-plan §11.1. *[D]*

**Block count estimate**: ~3,500 blocks (lane markings, signs, painted numbers, plaza).

**Time estimate**:
- Lane markings: 15–30 minutes via WorldEdit.
- Signs: 1–2 hours via in-place placement (each sign is small and unique; not a schematic operation).
- Painted numbers: 1–2 hours via a custom sign-painting script or by hand.
- Plaza and plaque: 30–60 minutes.

**Dependencies**:
- Phase 2 (pillars) must be complete. The painted numbers go on the pillars.

**Risk areas**:
- **Sign text legibility**: small block-letter signs are hard to read at distance. Use **oak signs** for text content and concrete blocks for the sign backing. Test legibility from 30 blocks away.
- **Painted pillar numbers**: at the design scale (2 blocks tall), a number like "911.10" requires 5–6 blocks. The numbers should be readable from 10 blocks but not necessarily from 50.

**Quality checkpoint**: walk the main avenue from the portal to the central plaza, then from the central plaza to the exit portal. Every intersection should have visible street signs, stop signs, speed-limit signs, and numbered pillars. The lane markings should be continuous and centered.

---

### Phase 4 — Tenant zones (the ≥6 distinct fit-outs)

**Goal**: the main avenue has at least 6 visibly distinct tenant fit-outs, including the dock-door scene for USPS, the climate-controlled vault for NARA, and the sealed data center for STC.

**Activities** (per the design plan §6.2):

For each tenant fit-out, the build sequence is:
1. **Mark the tenant zone footprint** on the main avenue floor (a 5×10 or 10×20 block rectangle of **polished andesite** with the tenant's brand color as the edge trim).
2. **Build the dock doors** (if applicable) — 4–6 numbered **dark oak doors** on the main avenue side, with the brand-color number signs above.
3. **Build the interior walls** (if applicable) — **white concrete** interior walls, with the tenant's brand-color accents.
4. **Place the interior fixtures** — pallet racks, conveyor segments, archive shelving, server racks, etc.
5. **Add the climate control details** (if applicable) — visible vents, dim lighting, climate signage.
6. **Place the tenant branding** — the tenant's main sign on the dock or door side.
7. **Add the easter egg elements** — the 2001 USPS anthrax plaque, the Lamar Hunt plaque, the UV&S film cans, etc.

**Tenants to build** (in this order — most-documented first, most-invented last):

1. **USPS National Requisition Center** (`[D]` for tenant, `[I]` for layout): the most-cited tenant; this is the visual anchor. Build first to set the standard.
2. **NARA Federal Records Center** (`[D]` for tenant, `[I]` for layout): the high-bay shelving is the defining visual; build second to establish the climate-controlled aesthetic.
3. **SubTropolis Technology Center** (`[D]` for tenant, `[I]` for layout, `[D]` for the redstone clock): the most complex build, with server racks, redstone clock, biometric prop, and dark fiber conduit. Build third.
4. **W.W. Grainger** (`[D]` for tenant, `[I]` for layout): the second dock-door scene, with orange branding and pallet racks.
5. **EPA Region 7** (`[D]` for tenant, `[I]` for layout): smaller office, government tenant.
6. **Hallmark / Russell Stover** (`[D]` for tenants, `[I]` for layout): combined consumer-goods fit-out.
7. **UV&S film archive** (`[D]` for tenant + film labels, `[I]` for layout): the dim vault with the labeled film cans. Small, off-path.
8. **Ford / Grainger historical vehicle storage** (`[D]` for the historical fact, `[I]` for layout): the row of minecarts-as-vehicles.
9. **Side-spur #2 historical tenants** (Pillsbury, Russell Stover historical corridor, `[D]` for tenant history, `[I]` for layout): the compressed historical-tenant corridor.

**Block count estimate**: ~50,000–80,000 blocks (varies by fit-out depth).

**Time estimate**:
- USPS + dock doors: 2–3 hours (the most complex single fit-out).
- NARA + high-bay shelving: 2 hours.
- STC + redstone clock: 3–4 hours (the redstone clock is the most complex single element).
- Grainger, EPA, Hallmark, UV&S, Ford: 1–2 hours each.
- Side-spur historical corridor: 1–2 hours.
- **Total: ~15–20 hours of focused build time across all fit-outs.**

**Dependencies**:
- Phase 3 (main avenue and signage) must be complete. Tenant zones are accessed from the main avenue.

**Risk areas**:
- **NARA high-bay shelving**: the 5-block-tall shelving must be built with proper vertical stacking; off-by-one errors compound across 5 blocks. Test with one shelf unit first.
- **STC redstone clock**: the 4-repeater clock is a known Minecraft redstone pattern but must be wired correctly. Test the clock on a small redstone lamp before scaling to 12 lamps.
- **USPS dock doors**: the 5 dock doors must be evenly spaced and the rail in front must be straight. Use a 5-block template and paste.
- **Hallmark / Russell Stover / Pillsbury separation**: these are *combined* in the consumer-goods fit-out, but the design should visually separate them. The Pillsbury historical reference is in the side-spur, not the main avenue.

**Quality checkpoint**: walk the main avenue from the portal to the central plaza. Each tenant fit-out should be visually distinct from the next. The dock doors should be visible. The NARA dim amber lighting should contrast with the STC cool blue. The Hallmark gold should not bleed into the Russell Stover brown.

---

### Phase 5 — Climate-controlled zones (deep detail)

**Goal**: the data center, NARA archive, and UV&S vault all have visible climate-control details (vents, dim lighting, climate signage) and the "no weather" feel is established.

**Activities**:
- **STC climate control**: install **shroomlight** under the cold-aisle floor (the "cool blue underglow"). Install **iron bar** vents in the ceiling above the hot aisle. Add the "**COLD AISLE 65°F**" **oak sign** on the wall. Add the "**HOT AISLE EXHAUST**" **oak sign** above the ceiling vents.
- **NARA climate control**: add **end rod** lighting under each shelf run. Add the "**CLIMATE-CONTROLLED — 65°F ± 2° — 35% RH**" **oak sign** at the door. Add **oak signs** labeling a few representative archive boxes (the Aisle B-17, Box 14,829 detail).
- **UV&S climate control**: the single **lantern** at the door. The "**CLIMATE-CONTROLLED FILM ARCHIVE — 38°F / 35% RH**" **oak sign**. The two labeled film cans on the middle shelf.
- **Climate signage elsewhere**: add the "**CLIMATE-CONTROLLED — 65°F ± 2°**" **oak signs** to the doors of any other climate-controlled zone (e.g., the wine cellar, if one is added).
- **The "no mob spawning" effect** (in survival): place a few **carpet** blocks on the chamber floor in key locations to suppress mob spawns. *Optional, advanced.* **[X]**

**Block count estimate**: ~3,000–5,000 blocks (vents, signs, climate labels).

**Time estimate**: 2–3 hours.

**Dependencies**:
- Phase 4 (tenant zones) must be complete. Climate-control details go inside the tenant fit-outs.

**Risk areas**:
- **End rod placement**: end rods emit light *horizontally*, so they need to be placed on the *underside* of shelf units, not on the *top*. Test with one shelf before scaling.
- **Shroomlight under floor**: shroomlight is a *light source*; placing it under **polished deepslate** slabs creates the underglow effect. The slabs must be placed on top of the shroomlight, not the other way around.
- **Redstone clock stability**: the 4-repeater clock can break if a chunk unloads. The clock should be built in a chunk that is always loaded (the main chamber is loaded by default; verify).

**Quality checkpoint**: enter the data center. The cool blue underglow should be visible in the cold aisle. The red/green status lights should be blinking (but slowly, not strobing). The "COLD AISLE 65°F" sign should be readable. Walk into the NARA archive. The dim amber light should make the high-bay shelving feel *darker* than the main avenue. The "65°F ± 2°" sign should be at the door.

---

### Phase 6 — Surface building, entrance ramp, exit portal

**Goal**: the surface plateau, the Hunt Midwest visitor center, the parking lot, the entrance ramp, the exit portal, and the parking lot are built and lit.

**Activities**:
- **Surface plateau finish**: **grass blocks** on top of the plateau, **dirt** for 2–3 blocks, **stone** below. **Oak trees** and **birch trees** framing the entrance. **Poppies** and **azure bluets** as KC-area wildflower feel.
- **Hunt Midwest visitor center**: the small 8×10×6 block building with **white concrete** facade, **light gray concrete** trim, **slate** foundation, **dark oak** door with **glass pane** window. A mounted "**Hunt Midwest Real Estate Development**" sign on the facade.
- **Marquee sign**: the "**World's Largest Underground Business Complex®**" 6×2 block sign over the portal mouth. **Red concrete** background, **white concrete** text.
- **Tenant directory board**: 5×4 blocks of **dark oak fence** + **oak signs** listing the marquee tenants.
- **Parking lot**: 6 rows × 8 cars of **gray concrete** with **white concrete** parking-bay lines. A few parked **minecarts** in random spots. One **lantern** on a **fence post** per row.
- **Lamar Hunt / KC Chiefs plaque**: a small **oak sign** on a post near the parking lot reading "**LAMAR HUNT — FOUNDER — 1964**" with a single mounted **red concrete** + **gold concrete** arrowhead.
- **Worlds of Fun silhouette**: a single **dark oak fence post** (15 blocks tall) with a **white banner** on top, visible from the ravine rim. **[X]**
- **Entrance ramp**: the 50-block descent from the surface to the main grid. Painted lane lines, **sea lantern** ceiling transition, the three signage stops (SPEED LIMIT 15, NO TRUCK IDLING, NO AM/FM RECEPTION). The 1970s industrial feel is critical here.
- **Exit portal**: a smaller, rougher opening on a perpendicular ravine face, with a paved road coming *out* of the ravine wall, a single "**EXIT**" sign, a security kiosk, and a "**YOU ARE LEAVING SUBTROPOLIS — DRIVE SAFELY**" sign. The exit is the *relief*, not the reveal.

**Block count estimate**: ~25,000–30,000 blocks (above-ground structures + ramp + signage).

**Time estimate**: 3–5 hours.

**Dependencies**:
- Phases 1–5 must be complete (the ramp connects the surface to the main grid; the main grid must exist before the ramp is finished).

**Risk areas**:
- **Ramp gradient**: a 50-block descent at ≤ 5% grade must be a *gradual* slope, not a steep staircase. Test by walking the ramp at sprint speed; the player should be able to walk *down* without jumping.
- **Daylight-to-fluorescent transition**: the light level change at the portal mouth is the single most important lighting moment. Test the transition by walking from the surface to the bottom of the ramp; the light should change within 10 blocks.
- **Marquee sign legibility**: the "World's Largest Underground Business Complex®" sign should be readable from the parking lot. Test from 30 blocks away.

**Quality checkpoint**: drive the full visit — start at the parking lot, descend the ramp, walk the main avenue, exit through the exit portal. The light transition should feel *clean and immediate*. The ramp should feel *gentle*. The exit should feel like a *relief*.

---

### Phase 7 — Finishing: easter eggs, ghost mine, inter-site connections, lighting tuning

**Goal**: the off-path easter eggs, the ghost mine chamber, the inter-site connections, and the lighting tuning are all in place.

**Activities**:

**Easter eggs (off-path)**:
- **Hunt Hall round room** (per design-plan §9.2): the 15-block-diameter round room at the central plaza, with the Lamar Hunt plaque and the mounted Chiefs arrowhead. ~2,000 blocks.
- **UV&S film archive** is already built in Phase 4; the easter egg is the labeled film cans (already in place).
- **FTZ sign** in the leasing office: a single **oak sign** on the interpretive wall. ~10 blocks.
- **ENERGY STAR 100 framed certificate** on the interpretive wall: a 1×1 **item frame** with a **paper** inside reading the certificate text. ~5 blocks.
- **Shift-change signage**: the three **oak signs** at one of the major intersections ("**FIRST SHIFT — 06:00**" / "**SECOND SHIFT — 14:00**" / "**THIRD SHIFT — 22:00**"). ~30 blocks.
- **Employee cafeteria**: the 8×8 block break room off the main avenue with **oak stairs** seating, **oak fences** tables, **cauldrons** coffee, **crafting table** food-prep, **jukebox** radio. ~500 blocks.
- **Groundhog Run banner**: a single **white banner** hung between two pillars in one corridor. ~5 blocks.
- **2001 USPS anthrax plaque** (already in Phase 4): the framed **paper** on the USPS wall.

**Ghost mine chamber**:
- **Side spur #1**: 100 blocks long, 10 blocks wide, 5 blocks high. **Stone** floor, **stone** walls, **glowstone** every 10 blocks (dimmer than the main avenue), **cobwebs** on the ceiling. ~5,000 blocks carved.
- **Barricade at block 90**: 3-block-tall **oak fence** with **oak fence gates** spanning the corridor. Two **oak signs** above: "**DANGER — ACTIVE MINING — HUNT MIDWEST MINING, INC.**" and "**NO UNAUTHORIZED ENTRY BEYOND THIS POINT.**" ~50 blocks.
- **The chamber (behind the barricade)**: 20×20 blocks of **rough smooth stone** walls and ceiling, **stone** and **gravel** floor, a single **soul lantern** at the barricade, a few **deepslate** blocks scattered in the walls, a single **minecart** on a short stretch of **rail** in the middle. ~1,000 blocks.

**Inter-site connections**:
- **Service tunnel sub-basement** is built in Phase 2; Phase 7 adds the **security gate** at the entrance from the main grid, the "**SECURITY CHECKPOINT — AUTHORIZED PERSONNEL ONLY**" sign, the **minecart** (the parked service vehicle), the "**SERVICE TUNNEL — COMBINED COMPLEX MAINTENANCE**" sign, and the maintenance bay (**crafting table** + a few **chests**). ~200 blocks. **[X]**
- **Public shaft**: the **Public Access Lobby** at the grid edge, the **security guard booth**, the **turnstile**, the **vertical shaft** with a column of **ladders** going up, the **surface lobby** at the top of the shaft. ~1,500 blocks. **[X]**
- **Coordination with combined-complex team**: the SubTropolis ends are complete; the Cheyenne Mountain and Houston tunnel-system teams will need to match the cross-sections at their respective ends.

**Lighting tuning**:
- Walk the full build at night and at day. Tune the **sea lantern** density on the main avenue (every 4–5 blocks is the target; too dense feels like a runway, too sparse feels like a tunnel). Tune the **end rod** placement in the NARA archive (one per shelf run; the rows of dim amber light should feel *archival*). Tune the **shroomlight** under the STC cold aisle (the underglow should be visible from the hot aisle, but not blinding).
- Add a single **note block** behind a wall in the data center with a low, sustained note, repeated via redstone — the data center hum. *Optional, advanced.* **[X]**
- Add a single **note block** at the bottom of the entrance ramp with a low, sustained note, repeated via redstone — the fluorescent hum. *Optional, advanced.* **[X]**

**Block count estimate**: ~10,000–15,000 blocks (easter eggs, ghost mine, inter-site, lighting).

**Time estimate**: 4–6 hours.

**Dependencies**:
- Phases 1–6 must be complete.

**Risk areas**:
- **Ghost mine atmosphere**: the dark chamber is a *deliberate* contrast to the bright main grid. The chamber should feel *unfinished* and *raw*. Do not over-light it.
- **Easter egg restraint**: the easter eggs are *subtle*. The Hunt Hall arrowhead is one block. The UV&S film cans are two labeled barrels. The FTZ sign is one oak sign. The restraint is the design.
- **Public shaft ladder climb**: a 50-block ladder climb is tedious. The shaft should have a water elevator (soul sand + bubbles) for the player, in addition to the ladder. *Optional.* **[X]**

**Quality checkpoint**: at night, walk the full build. Every lighting zone should feel right. Every easter egg should be findable but not obtrusive. The ghost mine should be dark and unreachable. The inter-site connections should be obviously marked as fictions (`[X]`) with appropriate signage.

---

## 3. Tools & Workflow

### 3.1 Schematic vs. in-place build

**Schematic-based** for the regular parts:
- The chamber shell (Phase 1): WorldEdit `//walls`, `//faces`, `//replace` operations.
- The pillar grid (Phase 2): a single 8×8×5 pillar schematic, pasted ~70 times at fixed coordinates. Use a Python or bash script to generate the paste commands.
- The lane markings (Phase 3): WorldEdit `//replace` on the center block column.
- The standard tenant shells (Phase 4): each tenant fit-out can be a schematic if the layout is repeated (e.g., the Hallmark / Russell Stover shared dock). The complex ones (USPS, NARA, STC) are in-place builds.

**In-place build** for the irregular parts:
- All signage (street signs, stop signs, speed limits, tenant signs, climate signs, easter egg signs): each sign is unique; build in place.
- Painted pillar numbers: a custom script or careful hand-placement.
- Tenant fit-out interiors (USPS, NARA, STC, EPA, Hallmark, UV&S, Ford): each is too varied to schematic.
- Easter eggs (Hunt Hall, UV&S film cans, FTZ sign, etc.): each is unique.
- Lighting tuning: by eye.

### 3.2 Use of `/fill`, WorldEdit, schematic placement

- **`/fill`**: used for the surface plateau (Phase 1) and the basic chamber shell. Fast, simple, no setup.
- **WorldEdit (`//walls`, `//faces`, `//replace`)**: used for the chamber shell, the ceiling paint, the floor polish, and the lane markings. The standard Minecraft building tool.
- **Schematic placement (`.schem` files via WorldEdit `//paste`)**: used for the pillar grid and the standard tenant shells.
- **Custom Python or bash scripts**: used for the painted pillar numbers and any operation that requires placing the same block at many specific coordinates (e.g., the sea-lantern lighting strips on the main avenue).

### 3.3 Bot-based construction (mc-fleet-bot) vs. human

**Bot-based** for:
- The chamber shell (Phase 1): a bot script can `//replace` stone with air across the 200×200 footprint in minutes.
- The pillar grid (Phase 2): a bot script can paste 70 identical pillar schematics in minutes.
- The ceiling paint and floor polish (Phase 2): a bot can do the `//replace` operations in seconds.
- The lane markings (Phase 3): a bot can do the `//replace` operation in seconds.

**Human** for:
- All signage (each sign is unique; humans are faster than scripting for one-offs).
- All tenant fit-out interiors (the design judgment is human).
- All easter eggs (the restraint is human).
- The lighting tuning (the eye is human).
- The redstone clock in the STC (the wiring is human; bots are unreliable on redstone).

**Custom tooling**:
- A **pillar-placement script** (Python or bash, generating WorldEdit `//paste` commands from a coordinate list). ~50 lines of code.
- A **pillar-number painting script** (Python, generating `setblock` commands for each number). ~100 lines of code.
- A **sign-placement helper** (a small in-game utility, optional). Not required.
- A **lighting-strip script** (Python, generating `setblock` commands for the sea-lantern ceiling strips). ~30 lines of code.

---

## 4. Quality Checkpoints

After each phase, the following should be verified before the next phase begins.

| Phase | Checkpoint | What to look for |
|---|---|---|
| **Phase 1** | Walk the ravine from the visitor center. | Ravine wall is carved, portal opening is visible, surface plateau is in place. |
| **Phase 2** | Walk the main avenue from the portal. | First iconic intersection is visible from the bottom of the ramp. Pillars are evenly spaced and identical in proportion. Ceiling is painted, floor is polished. |
| **Phase 3** | Walk the main avenue from the portal to the exit portal. | Every intersection has visible street signs, stop signs, speed-limit signs, and numbered pillars. Lane markings are continuous and centered. |
| **Phase 4** | Walk the main avenue, enter each tenant fit-out. | Each fit-out is visually distinct. Dock doors are visible. NARA is dim and amber. STC is dim and blue. |
| **Phase 5** | Enter the data center, the NARA archive, the UV&S vault. | Cool blue underglow in the cold aisle. Dim amber in the archive. Single lantern in the vault. Climate signs at every door. |
| **Phase 6** | Drive the full visit (parking → ramp → main avenue → exit). | Light transition at the portal mouth is clean. Ramp is gentle. Exit is a relief. |
| **Phase 7** | Walk the build at night. Find every easter egg. | Easter eggs are findable but not obtrusive. Ghost mine is dark and unreachable. Inter-site connections are signed as `[X]`. Lighting is tuned. |

**Visual review against the reference images**: at each phase, compare the build to the closest reference image in the visual-assets catalog (e.g., Phase 2 against `huntmidwest-hero-main.jpg`, Phase 6 against `commons-subtropolis-panorama.jpg`). The build should *feel* like the reference, not match it block-for-block.

**Lighting test**: at each phase after Phase 2, walk the build at night. The lighting should be appropriate to the zone (bright fluorescent in the main avenue, dim amber in the archive, dark in the ghost mine).

**Path / navigation test**: at each phase after Phase 3, walk the main avenue from end to end. The path should be clear, the signs should be readable, the lane markings should be continuous.

**Easter egg accessibility test** (Phase 7 only): every easter egg should be *findable* by a player who has been told it exists, but *not obvious* to a player who has not. The UV&S film cans should be in a small room off a corridor; the player should have to look for the door. The Hunt Hall arrowhead should be visible from the door but not from the main avenue. The FTZ sign should be in the leasing office, not on the main path.

---

## 5. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| 1 | **Render distance**: 200×200 chamber is at the edge of Minecraft render distance. | High | High | Set `simulation-distance: 12+` and `view-distance: 16+` in `server.properties`. The main avenue should be the central focus, not the corners. |
| 2 | **Pillar coordinate errors**: each pillar is 8×8×5 blocks at exact integer coordinates. Off-by-one errors compound. | High | Medium | Use a pillar-placement script that reads coordinates from a configuration file. Never place pillars by hand. |
| 3 | **Bedrock intersection**: if the chamber floor Y-level is too low, the chamber intersects bedrock. | Medium | High | The site planner must set the floor at Y=10 or higher. Verify the floor is above bedrock before carving. |
| 4 | **Mob spawning in unfinished chamber**: a hollowed chamber with no light is a mob spawn zone in survival. | High | Medium | Place a temporary light source in the chamber immediately after carving. Or play in creative mode. |
| 5 | **Sign text legibility**: small block-letter signs are hard to read at distance. | Medium | Low | Use **oak signs** for text content, concrete blocks for the sign backing. Test legibility from 30 blocks away. |
| 6 | **STC redstone clock instability**: the 4-repeater clock can break if a chunk unloads. | Low | Medium | Build the clock in the main chamber (always loaded). Test the clock by leaving the chunk and returning. |
| 7 | **End rod placement**: end rods emit light *horizontally*. | Low | Low | Test with one shelf before scaling. Place the end rod on the *underside* of the shelf unit, not the *top*. |
| 8 | **Lighting density tuning**: too dense feels like a runway, too sparse feels like a tunnel. | Medium | Low | Walk the build at night after each phase. The 4–5 block sea-lantern density on the main avenue is the target. |
| 9 | **Easter egg over-emphasis**: the easter eggs are *subtle*; a player who hasn't been told should not see them at a glance. | Medium | Low | The UV&S film cans are two labeled barrels, not a display case. The Hunt Hall arrowhead is one block. The FTZ sign is one oak sign. The restraint is the design. |
| 10 | **Inter-site fiction ambiguity**: the service tunnel and public shaft are project fictions. Players may mistake them for documented SubTropolis features. | Medium | Medium | Both termini are clearly signed: "**SERVICE TUNNEL — COMBINED COMPLEX MAINTENANCE — AUTHORIZED VEHICLES ONLY**" and "**PUBLIC TRANSIT — COMBINED COMPLEX — TICKETED VISITORS ONLY**". The master plan tags both as `[X]`. |
| 11 | **The "Indiana Jones / Batcave / Bond" temptation**: a designer may be tempted to add a hidden chamber, a torch-lit corridor, or a treasure room. | Medium | High | The deliberation explicitly excludes these. The ghost mine is *raw rock*, not a hidden treasure. The build has no secret lairs. Review against the "Out" list in design-plan §12.3. |
| 12 | **Build scope creep**: the design plan has ≥6 tenant fit-outs, 4 fit-out archetypes, 12+ easter eggs, 2 inter-site connections, 1 ghost mine, 1 Hunt Hall. The total scope is large. | High | Medium | The MVP is defined in the development plan (§2 v0.1). The first cut should be the chamber shell, the main avenue, the pillar grid, and 3 tenant fit-outs (USPS, NARA, STC). The rest is phased delivery. |
| 13 | **Minecraft version compatibility**: the design uses blocks from 1.17+ (calcite, tuff, deepslate, shroomlight). Older servers may not have these blocks. | Low | Medium | Verify the target server's Minecraft version is 1.17+ before building. If older, substitute (calcite → quartz, tuff → stone, shroomlight → glowstone). |
| 14 | **Player navigation at night**: a 200×200 chamber is *disorienting* without good signage. | Medium | Medium | The lane markings and pillar numbers are the navigation system. The 15-mph speed limit signs are visual landmarks. The street signs at every intersection are the primary wayfinding. Test by walking the main avenue at night with no map. |
| 15 | **Public shaft ladder climb is tedious**: a 50-block ladder climb is not fun. | Low | Low | Add a water elevator (soul sand + bubbles) for the player, in addition to the ladder. Optional but recommended. **[X]** |

---

## 6. Build Order Summary (TL;DR)

| Phase | Goal | Block count | Time | Risk |
|---|---|---|---|---|
| **1** | Site prep + ravine carving | ~320K removed | 3–6 hours | Render distance, mob spawning |
| **2** | Chamber + pillars + floor + sub-basement | ~120K | 2–4 hours | Pillar coordinates, bedrock |
| **3** | Main avenue + signage | ~3.5K | 3–5 hours | Sign legibility |
| **4** | Tenant zones (≥6 fit-outs) | ~50–80K | 15–20 hours | NARA shelving, STC redstone |
| **5** | Climate-controlled details | ~3–5K | 2–3 hours | End rod, shroomlight placement |
| **6** | Surface + entrance ramp + exit | ~25–30K | 3–5 hours | Ramp gradient, light transition |
| **7** | Easter eggs, ghost mine, inter-site, lighting | ~10–15K | 4–6 hours | Easter egg restraint |
| **Total** | Full build | ~530K–570K blocks | **32–49 hours** | (render distance, scope creep) |

The build is large but tractable. The biggest single operation is Phase 1 (chamber carving, ~320K blocks). The most labor-intensive operation is Phase 4 (tenant fit-outs, 15–20 hours of human-scale design work). The most technically demanding operation is Phase 5 (STC redstone clock, shroomlight underglow, end rod placement).

---

*End of working plan. The AI Contractor Writer downstream uses this plan + the design plan + the development plan to begin placement.*
