# Combined Complex — Site Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Build ID:** `04-combined-complex`
**Stage:** 02 — Site Planning (macro site design)
**Status:** Binding for the Architectural Designer and AI Contractor Writer
**Companion to:** `01-research/research-report.md`, `02-design/culture-architecture-analysis.md`, `02-design/discussion-notes.md`

**REWORK NOTE (2026):** The V-shaped ravine has been dropped from the design. The mountain is now **one continuous range** with a **horizontal granite-limestone contact at Y=200** — a geologically honest configuration (granite plutons push up through limestone in mountain ranges worldwide). The composite terrane plaque has moved from the ravine bottom to the **service tunnel contact crossing**, where it is geologically defensible rather than narrative fiction. The Grand Avenue is a straight line in the coastal plain (no ravine to span). The return route is funicular + road (no skybridge, no ravine to cross). See §3 (Mountain Range), §8 (Service Tunnel), §9 (Grand Avenue), §10 (Return Route), and §12 (Site Coordinates) for the full rework.

This document defines **where the combined complex sits in the world, how the three sites relate to each other geographically, and what the visitor sees as they approach**. It is the macro layer; building-by-building design is downstream. The 7 binding decisions from `02-design/discussion-notes.md` (Global Scale, Public Shaft, Service Tunnel, Visitor Journey, Inter-Site Centerpieces, Easter Eggs) — *as updated for the no-ravine design* — are the contract. The Mountain Range Layout decision (Decision 2 in the original deliberation) has been superseded by this rework.

---

## 1. Site Overview

The combined complex is a single 1,500 × 1,500 × 800-block Minecraft world that compresses the entire history of American underground infrastructure into a 30–45 minute focused-play descent. The visitor arrives via a coastal-plain highway, walks into a sunlit two-layer Houston-style downtown sitting in a wide flat valley at the base of a single continuous mountain range, descends 100 blocks through a public shaft into a working Kansas City–style SubTropolis under 270-million-year-old limestone, takes a minecart laterally and upward through the mountain to a 25-ton blast door at a horizontal contact crossing, and walks 800 blocks along the J-curve to a hollowed-out chamber in 1.08-billion-year-old granite — 1,800+ feet of rock above, 15 spring-mounted buildings, 1,319 half-ton coil springs. The mountain is a single mass with a **horizontal granite-limestone contact at Y=200** — the upper two-thirds is the granite intrusion that resists erosion and forms the peak, the lower third is the limestone that hosts the SubTropolis below the city. The composite terrane plaque sits at the contact crossing inside the service tunnel, where the tunnel walls transition from cream limestone to pink granite. The return is a funicular up the granite face to the summit, then a paved road back down the south face to the city. The single feeling: one descent, three worlds, 800 million years of geology — civilian, industrial, and military compressed onto a single vertical axis, in one Minecraft world, in one walk.

**World origin:** `(0, 0, 0)` — the center of the city, at ground level. The city surface is the Y=0 reference; the build extends from Y=−100 (SubTropolis floor) to Y=800 (granite peak).
**Compass orientation:** `north = −Z`, `east = +X`, `up = +Y` (Minecraft convention).
**Build height required:** 1,024+ blocks. Vanilla 384 is insufficient. **CubicWorld mod or similar with at least 2,048-block build height is mandatory.**
**World footprint:** 1,500 × 1,500 horizontal (X × Z), 800 vertical (Y = 0 to 800), with the build extending to Y = −100 below the city.

---

## 2. World Layout (Minecraft-Translated)

The world is a single horizontal plane (1,500 × 1,500 blocks) with a vertical range of about 900 blocks. The horizontal plane is divided into four north–south bands running south-to-north, plus a vertical descent layer:

| Band (N→S) | Z range (north = −Z) | Content |
|---|---|---|
| **Far north** | Z = −800 to −200 | **Continuous mountain range** — one mass, summit at Y=800 (granite), limestone base Y=0–200, granite intrusion Y=200–800. Hosts Cheyenne (in the granite) and SubTropolis (in the limestone) |
| **Central** | Z = −100 to +100 | **City in the wide flat valley** at the mountain base — 138m × 138m Houston-style downtown, 80-block-tall towers, public shaft at the east edge |
| **South** | Z = +100 to +500 | **Coastal plain** — flat grass, sparse forest, the Grand Avenue running N–S through the plain |
| **Far south** | Z = +500 to +750 | **Edge of the world** — sparse settlement, a small pier, "you've reached the edge of the build" feel |

The world extends east–west from X = −750 to +750. The mountain range is 800 blocks wide (X = −400 to +400) and 600 blocks deep (Z = −800 to −200), running E–W with the peak in the center. The city is 138m × 138m centered on the origin. The coastal plain wraps from the south around to the east, with a small lake or river at the SE corner where mountain drainage would naturally flow.

The vertical layer:
- **Y = 0 to +80** — surface (city, coastal plain, mountain slopes, parking lots, antenna arrays)
- **Y = 0 to −20** — Houston tunnel layer (6 blocks below street grade, the 24-block sample)
- **Y = −100 to 0** — SubTropolis layer (270 Ma limestone, the 200×200 chamber, the public shaft)
- **Y = 0 to 200** — Limestone zone of the mountain (the base of the mountain, host rock for SubTropolis access)
- **Y = 200** — **Horizontal granite-limestone contact** (binding geological moment — composite terrane plaque inside the service tunnel)
- **Y = 200 to 800** — Granite zone of the mountain (the intrusion, the peak, hosts Cheyenne)
- **Y = 250 to 400** — Cheyenne chamber (1,800+ blocks of solid granite above)
- **Y = 200 to 600** — Service tunnel layer (6×6 cross-section, lateral across the contact, in the mountain)

The sky limit is 1,024+ (CubicWorld mod). The build only uses up to Y=800 at the peak. The build extends down to Y=−100 (SubTropolis floor) at the deepest routine point. The Houston tunnel is 6 blocks below street grade (Y=−6). The service tunnel runs at the contact elevation Y=200 for its lateral portion. There is no build below Y=−100 except the deep foundations of the Cheyenne chamber (down to Y=−50 in places).

---

## 3. The Mountain Range (UPDATED — No Ravine)

The mountain range is the **organizing feature of the world**. It is a single continuous mountain mass — *one range, no ravine, no V-notch* — with two distinct rock types arranged in a **horizontal contact** at Y=200. The range is ~800 blocks wide (E–W) and ~600 blocks deep (N–S), with the **granite intrusion forming the upper portion of the mountain** (Y=200 to Y=800) and the **limestone forming the lower portion** (Y=0 to Y=200, with the limestone continuing below the city to Y=−100 to host the SubTropolis).

This is a real geological configuration. Granite plutons push up through limestone in mountain ranges worldwide (the Alps, the Appalachians, the Sierra Nevada, the Front Range of Colorado). The pluton is harder and more resistant to erosion than the host limestone, so over geological time the granite is exposed at the surface and forms the higher peaks, while the limestone erodes to form the lower flanks. The **horizontal contact at Y=200** is where the granite pushed up through the limestone; this is exposed at the surface today as a clear boundary on the mountain's south face.

### 3.1 The mountain footprint

- **Footprint (in plan):** X = −400 to +400, Z = −800 to −200 (800 × 600 blocks).
- **Single peak (or range of peaks along the E–W axis):** a single dominant peak at (0, 800, −500), with optional secondary summits along the ridgeline to the east and west. The peak is the apex of the granite intrusion.
- **East–west extent:** the range runs 800 blocks E–W, with the contact at Y=200 visible along the entire south face as a horizontal line where the upper granite (pink-grey) meets the lower limestone (cream-grey).
- **North–south depth:** 600 blocks from the south face (Z=−200) to the north back-slope (Z=−800). The mountain is *asymmetric* in profile: the south face is the dramatic face (the one the visitor sees from the city), the north back-slope descends more gently to the world edge.

### 3.2 The granite intrusion (upper mountain, Y=200 to Y=800)

- **Footprint in the mountain:** from the contact at Y=200 up to the summit at Y=800. In plan, the granite extends from the contact line on the south face to the north back-slope of the mountain.
- **Summit:** Y = 800 at (0, −500), sharp Pikes Peak-style triangle. The summit is the apex of the granite intrusion.
- **Composition:** Pink-to-brick-red Pikes Peak syenogranite (1.08 Ga). Minecraft palette: polished diorite (the pink-grey core), with granite and granite bricks, smoky-quartz crystals, pink terracotta (brick-red accent), snow layer at the very summit.
- **Profile:** Steep triangle with conifer forest on the lower slopes, exposed outcrops near the summit. The granite is the *dramatic* upper portion of the mountain — sharp, tall, pink-grey, with a snow cap.
- **Host of:** the Cheyenne Mountain Complex — the chamber at Y=250–400, the J-curve access tunnel, the antenna arrays on the ridgeline.
- **1,800+ feet (549+ blocks) of solid granite above the chamber:** chamber floor at Y=250, summit at Y=800 = 550 blocks of vertical granite overburden (matches the 1,800+ ft at 1:1 requirement; the peak at Y=800 represents the 2:1 vertical compression of the real 2,915m Pikes Peak).
- **Real-world reference:** Cheyenne Mountain, Colorado Springs. The build is 1:1 horizontal / 2:1 vertical compression of the real mountain, consistent with the 01-masterplan.

### 3.3 The limestone base (lower mountain, Y=0 to Y=200)

- **Footprint in the mountain:** from the city surface at Y=0 up to the contact at Y=200 on the south face. In plan, the limestone is the south-facing base of the mountain, visible from the city as the lower slopes.
- **Composition:** Cream-to-grey Bethany Falls limestone (270 Ma, Pennsylvanian). Minecraft palette: smooth stone (cream-grey), calcite, sandstone (cream), polished calcite, with horizontal bedding planes visible on the south face.
- **Profile:** Sloping hillside with visible horizontal strata, exposed bedding planes. The limestone is the *softer, gentler* lower portion of the mountain — sloping, cream-grey, with oak/maple forest on the slope.
- **Host of:** the SubTropolis chamber (which is at Y=−100 to Y=0, *below* the city surface, in the limestone that extends down from the mountain's base). The SubTropolis is accessed from the city via the public shaft (vertical) or via the SubTropolis horizontal portal on the south face of the mountain (horizontal drive-in, for vehicles).
- **Real-world reference:** SubTropolis, Kansas City. 270 Ma limestone, 100–160 ft below surface — the build's SubTropolis chamber is at Y=−100 (100 m = 328 ft below the city surface), which is in the same order of magnitude.

### 3.4 The horizontal granite-limestone contact (Y=200) — THE GEOLOGICAL SIGNATURE

- **Elevation:** Y=200, a horizontal plane through the mountain.
- **Visibility:** Visible on the south face of the mountain as a clear color line at Y=200 — pink-grey granite above, cream-grey limestone below. The line runs the full 800-block E–W length of the mountain's south face.
- **Geological character:** A sub-horizontal intrusive contact, with the granite (1.08 Ga Pikes Peak batholith) pushed up through the limestone (270 Ma Bethany Falls). The contact is sharp in most places, with a 1–2 block wide zone of **thrust-fault breccia** (mixed granite-and-limestone rubble) at the boundary.
- **Inside the service tunnel:** the contact is exposed in the tunnel walls at the **contact crossing** — the lateral position where the minecart ride transitions from limestone walls to granite walls. This is where the **composite terrane plaque** lives.
- **Real-world precedent:** the sub-horizontal granite-limestone contacts in the Colorado Front Range (Pikes Peak batholith / Paleozoic sedimentary cover), the Sierra Nevada batholith, the Alpine granitic intrusions, the Harz Mountains in Germany. This is real geology, not narrative fiction.

### 3.5 Surface features on the mountain

- **Antenna arrays:** 3–5 tall thin structures (iron block columns with lightning rods, ~30–50 blocks tall) on the central granite ridgeline (Y=600 to Y=800). Visible from the city as the only obvious surface feature on the peak.
- **Forest:** Conifer mix (spruce, dark oak) on the granite slopes; oak/maple on the limestone slope. Forest extends ~50–80 blocks from the mountain base before thinning into the valley.
- **Snow line:** snow layer on the granite peak from Y=700 to Y=800, with a 5-block-wide ice cap at the very summit.
- **Parking lots:** Two small gravel/cobblestone lots at the base of the mountain — one at the SubTropolis horizontal portal (south face, Y=0) for vehicles, and one at the Cheyenne outer portal (south face, Y=200) for service-tunnel access.
- **Approach road:** A switchback on the south face of the mountain, climbing from the city (Y=0) to the Cheyenne outer portal (Y=200) — 200 blocks of elevation gain over ~400 blocks of lateral distance, switchbacking up the limestone portion of the south face. The road is the *vehicle* access to the outer portal; the minecart in the service tunnel is the *interior* access from SubTropolis.
- **Funicular rail:** A separate rail on the east or west face of the granite intrusion, climbing from the Cheyenne outer portal (Y=200) to the granite summit (Y=800) — 600 blocks of elevation gain over ~400 blocks of lateral distance. The funicular is the *return* mode from Cheyenne back up to the surface.
- **SubTropolis horizontal portal:** A 4×5 block opening in the limestone hillside at Y=0, Z=−300 (the north face of the SubTropolis chamber, on the south face of the mountain). Concrete-and-limestone frame, "Hunt Midwest SubTropolis — Authorized Vehicles" sign, vehicle gate, paved approach road from the city.
- **Cheyenne outer portal:** A 6×6 block opening in the granite at Y=200, Z=−420 (on the south face of the mountain, in the granite zone). Concrete-and-granite frame, 25-ton blast door recessed in a 4-block side branch, 4-block concrete-and-granite checkpoint corridor, guard booth, "U.S. Space Force — Authorized Personnel Only" sign.
- **NO V-SHAPED RAVINE.** The mountain is a single mass. There is no gorge, no notch, no stream at the bottom of a ravine. Drainage from the mountain is via small seasonal streams on the south face that flow into the coastal plain.

### 3.6 Why the no-ravine design is more honest

The previous design (V-shaped ravine) required a "composite terrane plaque" explaining the geology as narrative fiction, because a ravine with one rock type on each wall is not a real geological feature at the scale the build was depicting. The new design uses a **horizontal contact at Y=200**, which is real geology — granite plutons push up through limestone in mountain ranges worldwide, and the contact is exposed at the surface as a horizontal boundary. The composite terrane plaque is now in the service tunnel at the contact crossing, where the tunnel walls visibly transition from cream limestone to pink granite as the minecart crosses the boundary. The plaque is *geologically honest*, not narrative.

---

## 4. The City in the Valley (UPDATED)

The city in the valley is the **civilian anchor of the world** — the public face, the entry point, the place where the build is bright, busy, and daylit. The city is a Houston-style downtown: sunlit streets, glass skybridges, beige VCT tunnels 6 blocks below grade, T-marker signs at the curb. The city sits in a **wide flat valley at the mountain base**, with the mountain range as a backdrop to the north and the coastal plain extending to the south and east.

### 4.1 City position and footprint

- **Position:** Centered on the world origin (0, 0, 0). The city is in the **wide flat valley between the mountain range (to the north) and the coastal plain (to the south/east)**. The mountain's south face is at Z=−200, the city extends from Z=−100 to Z=+100, and the coastal plain begins at Z=+100 and extends to the world edge at Z=+750.
- **Footprint:** 138m × 138m (X = −69 to +69, Z = −69 to +69), matching the Houston above-ground city scale at 1:1.
- **Ground level:** Y = 0 (the city's street grade is the world Y=0 reference; the mountain's south face begins immediately north of the city).
- **Tallest tower:** Y = 80 (80 blocks tall — a 1:1 Houston-scale skyscraper).
- **Reference:** Houston above-ground city, per the 03-houston-tunnel-system masterplan.

### 4.2 Above-ground features

- **4 named anchor towers:** Wells Fargo (red sign, 70 blocks tall), JPMorgan Chase (blue sign, 80 blocks tall), Pennzoil Place (green sign, 60 blocks tall), Esperson (gold sign, 65 blocks tall). Stone brick + quartz + glass pane construction.
- **8–10 generic downtown towers:** Mid-rise (30–50 blocks) and high-rise (50–70 blocks) buildings, glass-and-quartz, stone-brick, with windows. The "Generic Downtown" backdrop.
- **2–3 parking garages:** Mid-rise concrete structures, ~15–25 blocks tall, with parking markings.
- **Surface streets:** Stone-brick roads in a 12-block grid pattern, sidewalks, streetlights (redstone lamp posts every 8–15 blocks).
- **Skybridges:** 4–6 glass-enclosed pedestrian skybridges spanning the streets at Y=5, connecting adjacent towers at the 2nd-floor level.
- **T-marker signs:** The Houston tunnel visual signature — a red "T" on a white background at the curb entries. At least one T-marker must be at the city surface near the public shaft entrance (Easter Egg #7, inherited from 03-masterplan).

### 4.3 Below-ground features (the Houston tunnel sample)

- **Depth:** Y = 0 to Y = −6 (6 blocks below street grade, matching the real Houston tunnel).
- **Footprint:** 24-block sample of the Houston tunnel network (per the 03-masterplan), centered on (0, −3, 0).
- **T-marker entries:** Two direct street-level entries (Wells Fargo and McKinney Garage style), marked with the T-marker.
- **Materials:** White-concrete walls, white-wool VCT tile floor, fluorescent 4000K lighting. Beige tile, the "T-marker red" the only consistent color.
- **Tenant signage:** Channel-letter signs in tenant brand colors (Wells Fargo red, JPMorgan blue, Hallmark gold, etc.).
- **Public shaft entrance buffer:** A 1-block buffer in the SE corner of the 24-block sample, where the public shaft descent begins (flagged in 03-masterplan as needing the buffer so the shaft doesn't displace tunnel geometry).

### 4.4 The Combined Complex Transit Hub plaza

- **Position:** At the east edge of the city, at (X = +60, Y = 0, Z = −70) — the city edge where the public shaft lands.
- **Footprint:** 20×20 block plaza, paved with stone brick and quartz accents.
- **Features:**
  - The 7×7 glass-and-steel public shaft entrance pavilion at the center of the plaza.
  - A T-marker sign at the curb.
  - A "SubTropolis — Public Access" sign on the pavilion.
  - A "Combined Complex — Helsinki + Switzerland + Colorado Springs" plaque near the pavilion (Easter Egg referencing the three real-world precedents).
  - Benches, planters, a small fountain (for "public space" feel).
  - A 4-block-wide pedestrian connection from the plaza to the nearest Houston tunnel entry (so a visitor can walk from the tunnel to the public shaft without going to street level).

### 4.5 The mountain as backdrop

From any point in the city, the visitor looks north and sees the **mountain range** — the cream-grey limestone base from Y=0 to Y=200, the horizontal contact at Y=200 as a clear color line, and the pink-grey granite peak rising from Y=200 to Y=800 with conifer forest and a snow cap. The SubTropolis horizontal portal is visible as a 4×5 block opening at the base of the limestone slope. The Cheyenne outer portal is visible (with binoculars) as a small concrete-and-granite frame at the contact elevation on the south face of the mountain. The antenna arrays on the granite ridgeline are the only obvious surface feature on the peak. The mountain is the city's visual signature and the build's organizing feature.

---

## 5. The Coastal Plain

The coastal plain is the **edge of the world** — the flat, sparse, sun-bleached grassland that the visitor sees when they look south from the city. The plain is the *you've reached the edge of the build* feel, the place where the world thins out and the build ends.

### 5.1 Plain geometry

- **Footprint:** Z = +100 to +700 (the south of the city to the south edge of the world), with a wraparound to the east (X = +200 to +750, Z = −100 to +700) where the Grand Avenue arrives from the east and any mountain drainage would naturally flow.
- **Surface:** Flat grass (or coarse dirt) with sparse trees (oak, birch, occasional spruce), tall grass, ferns. No structures in the main plain.
- **Elevation:** Y = 0 to Y = 5 (a slight rise to the south, then flat).
- **Reference:** Real Houston coastal plain, or a generic US Gulf Coast landscape.

### 5.2 Features

- **The Grand Avenue:** A straight stone-brick road running N–S through the coastal plain, from the world edge (Z=+700) to the city NE corner (Z=+100, X=+69). 425 blocks long, 8 blocks wide. Stone brick for the first 350 blocks (the "old town" section), granite-and-glass for the final 75 blocks (the "new city" section). See §9 for the full spec.
- **A small lake or river:** At the SE corner of the plain (around X=+500, Z=+500), where any mountain drainage would naturally collect. Lily pads, sugar cane, oak boats.
- **Sparse settlement:** Maybe 1–2 small structures (a gas station, a diner) at the city edge along the Grand Avenue, but no downtown density.
- **A small pier or dock:** At the south edge of the world (Z=+700), marking the literal "edge of the build" — a wooden dock extending into the void, with a sign reading "End of the world — turn back."

---

## 6. The Three Sites in the World

The three sites are positioned to create the **defense-in-depth layered descent** that is the visual signature of the combined complex. Each site sits at its own depth, in its own rock type, with its own era and use case. The sites are arranged **vertically** through the mountain (not horizontally across a ravine): the visitor descends from the city surface (no rock) through the limestone (SubTropolis) to the granite (Cheyenne), crossing the horizontal contact at Y=200 inside the service tunnel.

### 6.1 Cheyenne Mountain Complex

- **World position:** In the **granite intrusion at the upper elevations** of the continuous mountain. The chamber is at Y=250–400, deep inside the granite, with 1,800+ feet (549+ blocks) of solid granite above to the summit at Y=800.
- **Footprint (the chamber):** X = −40 to +40, Y = 250 to 400, Z = −580 to −500 (~80m × 80m horizontal, 150m vertical — 4.5 acres of building floor space).
- **Above the chamber:** 549+ blocks of solid granite (Y=250 chamber floor to Y=800 summit = 550 blocks of vertical overburden; Y=400 chamber ceiling to Y=800 summit = 400 blocks above the ceiling).
- **J-curve tunnel:** From the outer portal (X=0, Y=200, Z=−420) to the chamber (X=0, Y=300, Z=−540). **800 blocks long** (mostly lateral at Y=200–300, with a 100-block descent from the outer portal to the chamber approach; the J-curve doubles back so the actual path is ~800 blocks).
- **Outer portal:** At Y=200 on the south face of the mountain, in the granite. 6×6 opening, 25-ton blast door, checkpoint corridor. Accessible from the city via the switchback approach road (vehicle) or from the SubTropolis chamber via the service tunnel (minecart).
- **Funicular:** From the outer portal (Y=200) to the granite summit (Y=800). 600 blocks of elevation gain over ~400 blocks of lateral distance on the east or west face of the granite intrusion. Part of the return route.
- **Reference:** `D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\04-design\site-plan.md` and `masterplan.pdf`. The chamber coordinates above are the *combined-complex placement*; the chamber geometry, spring layout, and J-curve internal detail live in the 01-masterplan.

### 6.2 SubTropolis

- **World position:** In the **limestone at the lower elevations** of the continuous mountain, below the city. The chamber is at Y=−100 to Y=0, in the limestone that extends below the city surface. The mountain's limestone base (Y=0 to Y=200) is the host rock for the SubTropolis access routes.
- **Footprint (the chamber):** X = −100 to +100, Z = −300 to −100, Y = −100 to 0 (200 × 200 × 100, matching the 02-masterplan's 200×200 grid).
- **Above the chamber:** The city surface (Y=0) is 100 blocks above the chamber ceiling. The mountain's limestone base (Y=0 to Y=200) is above the city, on the south face. The contact at Y=200 is 200 blocks above the chamber.
- **Public access lobby (SE corner of chamber):** X = +60, Y = −100, Z = −100, where the public shaft lands.
- **Horizontal portal (north face of chamber, on the south face of the mountain):** X = 0, Y = 0, Z = −300, a 4×5 block opening at city level. Accessible from the city via a paved approach road.
- **Service tunnel entrance (NW corner of chamber, in the sub-basement):** X = −100, Y = 0, Z = −300, where the minecart rail exits the SubTropolis into the service tunnel (climbing from Y=0 to Y=200 over the first 60 blocks of the service tunnel).
- **Reference:** `D:\projects\mc-fleet-bot\masterplans\02-subtropolis\04-design\site-plan.md` and `masterplan.pdf`.

### 6.3 Houston Tunnel System

- **World position:** Under the city in the wide flat valley.
- **Footprint (the 24-block sample):** Centered on (X = 0, Y = −3, Z = 0), 24 blocks in diameter, 6 blocks below street grade (Y = −6 to Y = 0).
- **Above the tunnel:** The city surface (Y = 0 to Y = 80, depending on tower height). 6 blocks of soil/concrete between the tunnel and the street.
- **City-block street grid (above the tunnel):** 6×4 block Houston street sample (per 03-masterplan).
- **Reference:** `D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\04-design\site-plan.md` and `masterplan.pdf`.

### 6.4 Relative distances

| From → To | Distance (blocks) | Mode |
|---|---|---|
| City center (0, 0, 0) → Public shaft top (60, 0, −70) | ~92 (lateral) | Walk |
| Public shaft top (60, 0, −70) → Public shaft bottom (60, −100, −100) | **100 (vertical)** | Mechanical lift |
| Public shaft bottom (60, −100, −100) → Service tunnel entrance (−100, 0, −300) | ~245 (lateral) | Walk through SubTropolis chamber |
| Service tunnel entrance (−100, 0, −300) → Contact crossing (−40, 200, −360) | **~80 blocks (climbing)** | Minecart (powered rail, steep grade) |
| Contact crossing (−40, 200, −360) → Cheyenne outer portal (0, 200, −420) | ~62 (lateral) | Minecart (at contact elevation) |
| Cheyenne outer portal (0, 200, −420) → 25-ton blast door (0, 200, −420) | 0 | Same coordinates (the blast door is at the outer portal) |
| 25-ton blast door (0, 200, −420) → Cheyenne chamber (0, 300, −540) | **800 (along J-curve)** | Walk |
| Cheyenne outer portal (0, 200, −420) → Granite summit (0, 800, −500) | **~600 (elevation) / ~400 (lateral)** | Funicular |
| Granite summit (0, 800, −500) → City center (0, 0, 0) | **~800 (lateral switchback)** | Paved road |
| Total service tunnel length | **100–120 blocks** | — |
| Total return distance (funicular + road) | **~1,200 blocks** | — |

The longest single movement in the world is the J-curve tunnel (800 blocks) — that is the iconic long walk. The most dramatic vertical movement is the public shaft (100 blocks down) and the funicular (600 blocks up). The most dramatic lateral movement is the service tunnel (100–120 blocks, climbing from Y=0 to Y=200 across the contact).

---

## 7. The Public Shaft (the Vertical Centerpiece) — UNCHANGED

The public shaft is the **first of the two architectural centerpieces** — the *civilian transition* from the sunlit city above to the climate-controlled limestone mine below. The shaft is the place where a Houston-style hot sidewalk becomes a 65°F SubTropolis. The mid-landing at Y=−50 is the *G-Cans moment* — a single glass window looking out at the city's underground utility corridor.

### 7.1 Public shaft geometry

- **Cross-section: 7×7 blocks total** (binding per discussion Topic 3):
  - 5×5 inner lift core (the mechanical lift)
  - 1-block emergency stair on one side of the outer ring
  - 1-block service chase on the other side of the outer ring
- **Vertical extent: 100 blocks** (Y = 0 to Y = −100), descending from the city surface to the SubTropolis floor.
- **Mode: mechanical lift** as primary, with a visible emergency stair through a glass wall in the outer ring.
- **Path:** Vertical from top to bottom. The shaft does not curve or angle — it is a straight 7×7 vertical bore through the limestone below the city, 100 blocks tall.

### 7.2 Public shaft key coordinates

- **Top entrance (the pavilion):** (X = +60, Y = 0, Z = −70) — at the NE corner of the city, in the Combined Complex Transit Hub plaza.
  - Form: 7×7 glass-and-steel pavilion, guard booth, turnstile, "SubTropolis — Public Access" sign, T-marker at the curb.
  - Easter Egg #4: "HELSINKI 5,500" carved on a single block at the bottom of the shaft.
- **Mid-landing (centerpiece #2):** (X = +60, Y = −50, Z = −70) — at Y = −50, exactly halfway down.
  - Form: 7×7 block observation room with a single glass window looking out at a G-Cans-style concrete pillar in the city's underground utility corridor.
  - Features: One labelled block of exposed limestone (270 Ma, Pennsylvanian) on the inner wall, lit by redstone lamp.
  - Light level: 10 (utility-layer fluorescent).
  - Function: The "breath" of the descent — the single moment the visitor pauses in the shaft.
- **Bottom (the Public Access Lobby):** (X = +60, Y = −100, Z = −100) — at the SE corner of the SubTropolis chamber.
  - Form: Small security gate, turnstile, "Welcome to SubTropolis — Hunt Midwest Industrial Complex" channel-letter sign.
  - Opens onto the SubTropolis main avenue (Hushpuckney), with the 200×200 pillar grid visible beyond.
  - Light level: 12 (SubTropolis fluorescent).

### 7.3 Public shaft design language

The shaft is a *gradient* from the Houston palette (cool blue/gray) at the top to the SubTropolis palette (cream/limestone) at the bottom:
- **Y = 0 to −30:** Concrete-and-steel, glass-and-steel stairwell, "SubTropolis — Public Access" in steel-gray letters. Houston above-ground palette.
- **Y = −30 to −60:** The mid-landing. Utility architecture. Exposed concrete pillars, pipe chases, fiber-optic conduits. Cool blue/gray. G-Cans aesthetic.
- **Y = −60 to −100:** Walls transition from concrete to cream limestone. SubTropolis palette begins to dominate. The bottom lobby has a security gate, turnstile, "Welcome to SubTropolis" channel-letter sign.

The gradient is *not* a hard transition. It is a *slow color shift* from cool blue/gray to cream/limestone over the 100 blocks of descent.

### 7.4 Signage

- **Top:** "SubTropolis — Public Access" (steel-gray letters on white background, 2 blocks tall).
- **Mid-landing:** No large signs; the labelled limestone block is the small detail.
- **Bottom:** "Welcome to SubTropolis — Hunt Midwest Industrial Complex" (channel letters in Hunt Midwest's brand color, backlit).
- **Dual-use sign:** "EMERGENCY EGRESS" sign near the stair entry, indicating the dual-use (employee entrance 95% of the time, emergency egress 5%) per the Helsinki model.

---

## 8. The Service Tunnel (the Horizontal Centerpiece) — UPDATED LOCATION

The service tunnel is the **second of the two architectural centerpieces** — the *inter-site transition* from the working SubTropolis to the hard military Cheyenne. The tunnel is the place where a 65°F limestone business park becomes a 1.08 Ga granite command center. The 25-ton blast door at the Cheyenne end is the *Cheyenne moment* — a single architectural object that says *you are arriving somewhere serious*. The **composite terrane plaque** at the contact crossing is the build's *Telling Detail* — a single carved stone that explains why two rocks 800 million years apart coexist in one mountain, exposed honestly at the geological boundary.

### 8.1 Service tunnel geometry (UPDATED for the no-ravine design)

- **Position:** In the **mountain, at the contact elevation**, lateral across the granite-limestone contact. The tunnel runs from the south face of the mountain (SubTropolis end, in the limestone) to deeper in the mountain (Cheyenne end, in the granite), crossing the horizontal contact at Y=200 at the contact crossing.
- **Cross-section: 6×6 blocks total** (binding per discussion Topic 4):
  - 4-block inner rail corridor (1-block gauge minecart rail + 1-block clearance on each side)
  - 1-block utility strip (water pipe from Cheyenne's reservoirs as backup for SubTropolis fire protection, power line, fiber-optic line)
  - 1-block emergency-escape corridor (a 1-block walkway for personnel evacuation)
- **Mode: minecart rail** (1-block gauge, single track, with powered rails every 4–8 blocks in the climbing section).
- **Length: 100–120 blocks** (binding; the working number is 120 blocks).
- **Path:** From the SubTropolis end at the south face of the mountain (−100, 0, −300) → climbing through the mountain (in the limestone, on a steep grade) to the contact elevation Y=200 → crossing the horizontal contact at the **contact crossing** (−40, 200, −360) → continuing laterally in the granite at Y=200 → arriving at the Cheyenne outer portal (0, 200, −420) with the 25-ton blast door.
- **Climb profile:**
  - **0 to 60 blocks (SubTropolis end to contact crossing):** climb from Y=0 to Y=200 (3.33:1 grade, steep). Walls are cream limestone (the lower mountain, below the contact). Powered rails every 4–8 blocks.
  - **60 to 120 blocks (contact crossing to Cheyenne end):** lateral at Y=200. Walls transition from cream limestone to pink granite at the contact crossing (~60–65 blocks in). The remaining 55–60 blocks are in the granite.
- **No dipping under a stream** (no ravine). The tunnel is at the contact elevation for its lateral portion, with a climbing approach from the SubTropolis end.

### 8.2 Service tunnel key coordinates (UPDATED)

- **Service tunnel start (SubTropolis end):** (X = −100, Y = 0, Z = −300) — at the SubTropolis NW corner, on the south face of the mountain, in the limestone. Open entrance, "U.S. Space Force — Authorized Personnel Only" sign, 1-block security gate, turnstile.
  - Easter Egg #3: "Service Tunnel — Inspired by the Gotthard Base Tunnel" sign, with "SBB CFF FFS" Swiss Federal Railways logo.
  - Surface approach: A paved switchback road from the city (at the SubTropolis horizontal portal, Y=0) climbing the south face of the mountain to the SubTropolis chamber (Y=−100), or the minecart rail can be entered directly from the SubTropolis sub-basement at the NW corner.
- **Service tunnel contact crossing (centerpiece #3, THE GEOLOGICAL MOMENT):** (X = −40, Y = 200, Z = −360) — at the contact elevation, where the tunnel walls transition from cream limestone to pink granite.
  - **The composite terrane plaque** (Easter Egg #1 and binding centerpiece #3) is mounted on the tunnel wall at the contact crossing, lit by a single redstone lamp. Form: 1×2 block carved-stone plaque.
  - **Surroundings:** 1–2 blocks of **thrust-fault breccia** (mixed granite-and-limestone rubble) visible in the tunnel walls at the contact, geologically honest. The breccia is a 1-block-wide strip on the tunnel wall, with cobblestone (granite component) and calcite (limestone component) mixed.
  - **Plaque text:** *"Thrust Fault Contact — Pikes Peak Granite (1.08 Ga) overthrust on Bethany Falls Limestone (270 Ma). The contact is exposed at the surface on the south face of the mountain at Y=200, and crossed by this tunnel."*
  - **Function:** Centerpiece #3 (composite terrane plaque) and Easter Egg #1. The build's *Telling Detail* — a single carved stone that explains why two rocks 800 million years apart coexist in one mountain range. Geologically honest, not narrative fiction.
- **Service tunnel end (Cheyenne outer portal):** (X = 0, Y = 200, Z = −420) — on the south face of the mountain, in the granite. Concrete-and-granite frame, **25-ton blast door** (centerpiece #1) recessed in a 4-block side branch, 4-block concrete-and-granite checkpoint corridor, guard booth, "U.S. Space Force — Authorized Personnel Only" sign.
  - Easter Egg #6: The "U.S. Space Force" sign at the arch.
  - Beyond the door: The J-curve access tunnel (800 blocks per the 01-masterplan) descends from Y=200 to the chamber at Y=250–400.

### 8.3 Service tunnel design language

The tunnel is a *gradient* from the SubTropolis palette (cream/limestone) at the start to the Cheyenne palette (pink/granite) at the end:
- **SubTropolis end (0 to 60 blocks, climbing):** Cream limestone walls, stone brick slab floor, minecart rail with powered rails (steep grade), utility strip (water pipe, power line, fiber-optic). SubTropolis fluorescent 4000K light.
- **Contact crossing (~60 blocks in, at Y=200):** The *transition*. Walls shift from cream limestone to pink granite. Thrust-fault breccia visible in the walls. Lighting shifts from SubTropolis fluorescent to Cheyenne fluorescent. The contact crossing is *neither* SubTropolis *nor* Cheyenne — it is the *geological contact* between them.
- **Cheyenne end (60 to 120 blocks, lateral at Y=200):** Pink granite walls, the 25-ton blast door in a concrete-and-granite frame, the checkpoint building, the guard booth, "U.S. Space Force" sign. The granite walls are rough-hewn at the portal (matching the J-curve's first character stage).

### 8.4 Signage

- **SubTropolis end:** "U.S. Space Force — Authorized Personnel Only" (steel letters on concrete) + "Service Tunnel — Inspired by the Gotthard Base Tunnel" (small sign) + "SBB CFF FFS" logo block.
- **Contact crossing (plaque):** "Thrust Fault Contact — Granite (1.08 Ga) over Limestone (270 Ma)" (carved stone, lit by redstone lamp).
- **Cheyenne end:** "U.S. Space Force — Authorized Personnel Only" (steel letters on granite) + "Cheyenne Mountain Complex" (large, on the checkpoint building).
- **Directional signs along the tunnel:** "Cheyenne" / "SubTropolis" / "Service Tunnel" at regular intervals (every 20 blocks), to orient the visitor during the minecart ride.

---

## 9. The Grand Avenue — UPDATED

The Grand Avenue is the **entry route to the city from the coastal plain**. In the previous (ravine) design, it was a road that had to *span* the ravine; in the no-ravine design, it is a **straight line in the coastal plain** running from the world edge to the city. The Avenue is the visitor's first view of the city — they walk or drive north along the Avenue from the edge of the world and see the city materialize against the backdrop of the mountain range.

### 9.1 Grand Avenue geometry

- **Path:** A straight line running N–S through the coastal plain, from the "old town" (the world edge, at the south end of the Avenue) to the new city NE corner (at Z=+100, X=+69).
- **Length:** 425 blocks (Z=+700 to Z=+100, at X≈+69).
- **Cross-section:** 8 blocks wide (a 4-block road with 2-block oak-plank sidewalks on each side).
- **Material transition:**
  - **First 350 blocks (Z=+700 to Z=+350, the "old town" section):** stone brick road, oak-plank sidewalks, streetlights every 15 blocks. The "arrived from the world edge" feel.
  - **Final 75 blocks (Z=+350 to Z=+100, the "new city" section):** granite-and-glass construction, with quartz accents and glass-pane streetlights. The "entering the new city" feel. The material transition happens at Z=+350, marked by a 2-block-wide granite-and-glass arch spanning the Avenue.

### 9.2 Grand Avenue features

- **The "old town" waypoint:** At Z=+500, a small settlement of 3–5 structures (a gas station, a diner, a small inn) along the Avenue. The "you've reached civilization" feel before the new city.
- **The arrival arch:** At Z=+350, a 2-block-wide, 8-block-tall granite-and-glass arch spanning the Avenue, with a sign reading "Welcome to the New City — Combined Complex". This is the material transition marker.
- **The coastal-plain highway merge:** The Grand Avenue connects to the coastal-plain highway at the south end (Z=+700), where the visitor's spawn point or arrival point is. A small parking area, a wooden pier extending into the void at the world edge.
- **Streetlights:** Redstone lamp posts every 15 blocks along the Avenue, on the sidewalks.
- **No bridge, no span, no ravine crossing.** The Grand Avenue is a straight line in flat terrain.

---

## 10. The Return Route — UPDATED (No Skybridge)

The return is the **resolution of the dramatic arc** — the visitor rises from the deep granite back to the sunlit surface via funicular and road, and the first glimpse of the world from the granite summit is the *narrative payoff* of the whole journey. In the previous (ravine) design, the return was funicular + skybridge + road (3 modes). In the no-ravine design, the return is **funicular + road** (2 modes) — the skybridge is dropped because there is no ravine to span.

### 10.1 The 2-mode surface return

| Stage | From → To | Distance | Mode | Duration | Visual signature |
|---|---|---|---|---|---|
| **7. Funicular ascent** | Cheyenne outer portal (0, 200, −420) → granite summit (0, 800, −500) | ~600 elevation / ~400 lateral | Funicular rail (steep climb) | 5 min | Climb up the east or west face of the granite intrusion; the city, the valley, the coastal plain come into view one by one as the funicular rises; the mountain's pink-grey granite walls pass by |
| **8. Paved road** | Granite summit (0, 800, −500) → city center (0, 0, 0) | ~800 lateral (switchback) | Walk, vehicle | 8 min | Switchback down the south face of the mountain; the city fills the view; arrival at the Combined Complex Transit Hub plaza |

**Return total:** ~13 minutes. **Grand total (inbound + return):** ~46–49 minutes. Within the 30–45 min binding target for the inbound, with the 13-min return as the resolution.

### 10.2 The funicular

- **From:** (0, 200, −420) at the Cheyenne outer portal.
- **To:** (0, 800, −500) at the granite summit, near the antenna array station.
- **Route:** A rail on the east or west face of the granite intrusion, climbing 600 blocks over ~400 blocks of lateral distance (a 1.5:1 grade, similar to Swiss funiculars). The rail is a single track with a passing loop at the midpoint.
- **Vehicle:** A single minecart on a powered rail, or a real-life funicular car (a 3×3 block cabin on a 2-block rail).
- **Stations:** A small station at the outer portal (with a "Funicular — Cheyenne to Summit" sign and a schedule board) and a small station at the summit (with the "Three Sites, One Mountain" sign and the rock identification chart — Easter Eggs #2 and #9).
- **First glimpse:** The first time the visitor sees the city, the valley, and the coastal plain from the funicular is the *narrative payoff* of the whole journey. The view is the *resolution of the dramatic arc* — civilian → industrial → military → civilian.

### 10.3 The paved road

- **From:** (0, 800, −500) at the granite summit.
- **To:** (0, 0, 0) at the city center (or the Combined Complex Transit Hub plaza at (60, 0, −70)).
- **Route:** A paved stone-brick road switchbacking down the south face of the mountain, from the granite summit through the limestone base to the city. ~800 blocks of lateral distance, 800 blocks of elevation loss. ~6 switchbacks.
- **Features:** Stone-brick road, oak fence handrails at the switchbacks, sea-lantern streetlights every 20 blocks, occasional overlooks with views of the city and the coastal plain.
- **Arrival:** The road ends at the Combined Complex Transit Hub plaza, where the public shaft pavilion stands. The visitor has completed the 6-stage journey and the 2-mode return.

### 10.4 Why no skybridge

The skybridge in the previous design was a 250-block crossing at Y=600–700, spanning the ravine between the granite summit and the limestone summit. In the no-ravine design, there is no ravine to span, and the mountain is a single mass — there is no second summit on the other side. The skybridge is **dropped** from the design. The funicular + road return is the cleaner 2-mode resolution: the funicular reveals the world from the summit, the road brings the visitor back to the city.

---

## 11. Visitor Flow & Circulation

The visitor's journey is a **single trajectory** through three concentric cultures of human underground use, and the cultures are the rooms on the trajectory. The journey is the build.

### 11.1 The 6-stage journey (inbound) — UPDATED

| Stage | From → To | Distance | Mode | Duration | Visual signature |
|---|---|---|---|---|---|
| **1. City surface** | Coastal plain / Grand Avenue → city center → Houston tunnel entry | ~500 blocks (highway) + 92 (city walk) | Walk, vehicle | 5 min | Sunlit, hot, busy, daylit; T-markers at curb; skybridges overhead; mountain as backdrop |
| **2. Houston tunnel** | Tunnel entry → food court → public shaft buffer | ~24 blocks (the 24-block sample) | Walk | 5 min | Beige VCT tile, fluorescent 4000K, channel-letter tenant signs |
| **3. Public shaft** | (60, 0, −70) → (60, −50, −70) → (60, −100, −100) | **100 blocks vertical** | Mechanical lift | 3 min | Cool blue/gray → cream/limestone gradient; mid-landing glass window at Y=−50; "SubTropolis" descent |
| **4. SubTropolis** | Public access lobby → Hunt Hall plaza → NARA → USPS → LightEdge → NW corner sub-basement | ~245 blocks (through the 200×200 chamber) | Walk or vehicle | 10 min | White-painted pillars, channel-letter tenant signs, painted pillar numbers, 15 mph speed limit, central plaza with quartz medallion |
| **5. Service tunnel** | (−100, 0, −300) → (−40, 200, −360) → (0, 200, −420) | **~120 blocks (climbing + lateral)** | Minecart rail | 3 min | Cream limestone → pink granite transition at the contact crossing; thrust-fault breccia; composite terrane plaque; 25-ton blast door at end |
| **6. Cheyenne** | Outer portal → J-curve → chamber | **800 blocks (along J-curve)** | Walk | 10 min | Pink granite walls; 3 character stages of tunnel; 25-ton blast doors in side branch; 1,319 springs; 15 spring-mounted buildings; Combat Operations Center; Granite Inn bar |

**Total play time:** ~36 minutes of focused play (within the 30–45 min binding target). Distribution: 5+5+3+10+3+10 = 36 min.

### 11.2 The return (2-mode surface route, no skybridge) — UPDATED

| Stage | From → To | Distance | Mode | Duration | Visual signature |
|---|---|---|---|---|---|
| **7. Funicular ascent** | Cheyenne outer portal (0, 200, −420) → granite summit (0, 800, −500) | ~600 elevation / ~400 lateral | Funicular rail | 5 min | Climb up the east or west face of the granite intrusion; the city, the valley, the coastal plain come into view |
| **8. Paved road** | Granite summit (0, 800, −500) → city center (0, 0, 0) | ~800 lateral (switchback down south face) | Walk, vehicle | 8 min | Switchback down the mountain; the city fills the view; arrival at the Combined Complex Transit Hub plaza |

**Return total:** ~13 minutes. **Grand total (inbound + return):** ~49 minutes.

### 11.3 The dramatic arc

The journey has a *defense-in-depth* arc in light, climate, sound, and culture:
- **Stage 1 (city surface):** Civilian. Hot, bright, busy, daylit. Houston heat, the city's weather, the city's people.
- **Stage 2 (Houston tunnel):** Climate-controlled civilian. Beige tile, fluorescent light, tenant signs, weekday retail.
- **Stage 3 (public shaft):** Transition. Cool blue/gray → cream/limestone. The mid-landing glass window. The descent.
- **Stage 4 (SubTropolis):** Industrial. Lit, climate-controlled, working. White pillars, channel-letter signs, forklifts.
- **Stage 5 (service tunnel):** Inter-site transition. Cream → pink. Limestone → granite. The thrust-fault breccia. The composite terrane plaque. The minecart ride.
- **Stage 6 (Cheyenne):** Military. Silent, deep, climate-sealed. Pink granite, blast doors, springs, the "dead air" of the chamber.
- **Stages 7–8 (return):** Civilian resolution. The funicular reveals the world from the summit; the road brings the visitor back to the city.

The depth is the *temporal axis* compressed into a vertical axis. The deeper the visitor goes, the *older* the site they encounter: 1970s Houston → 1964 SubTropolis → 1966 Cheyenne. The deeper they go, the *harder* the rock: no rock (city) → 270 Ma limestone → 1.08 Ga granite. The deeper they go, the *quieter* the sound: city noise → HVAC hiss → HVAC + generator hum.

### 11.4 The geological arc (UPDATED)

The journey is also a *geological* arc, walking through 800 million years of rock:
- **Stages 1–2 (city + Houston tunnel):** No rock. The city is built on coastal-plain soil; the Houston tunnel is 6 blocks below grade in soil/concrete.
- **Stage 3 (public shaft):** Limestone. 270 Ma Bethany Falls limestone, visible at the mid-landing labelled block.
- **Stage 4 (SubTropolis):** Limestone. The full SubTropolis chamber is carved in limestone.
- **Stage 5 (service tunnel):** Limestone → granite transition. The walls shift color at the horizontal contact at Y=200. The composite terrane plaque is at the contact crossing.
- **Stage 6 (Cheyenne):** Granite. 1.08 Ga Pikes Peak syenogranite, visible at the chamber walls.
- **Stages 7–8 (return):** Granite summit (exposed) → switchback down through the limestone base (exposed bedding planes, the contact visible at Y=200 on the south face) → city (no rock).

The visitor walks through 800 million years of geology in 36 minutes, crossing the horizontal contact at Y=200 in the service tunnel — a single, geologically honest moment.

---

## 12. Combined-Complex Coordination

The combined complex is the *integration* of three previously-designed sites. This section documents the **coordination points** where the combined-complex site plan affects the individual site plans.

### 12.1 Cross-references to the 3 individual site master plans

| Site | Reference | Combined-complex relevance |
|---|---|---|
| **Cheyenne Mountain** | `D:\projects\mc-fleet-bot\masterplans\01-cheyenne-mountain-complex\04-design\site-plan.md` and `masterplan.pdf` | The chamber and J-curve are owned by 01-masterplan. The combined complex adds (a) the **outer portal placement at (0, 200, −420)** on the south face of the mountain (in the granite, at the contact elevation), (b) the **25-ton blast door at the service tunnel terminus** (a *second* blast door; the 01-masterplan's blast doors are on a side branch of the J-curve), (c) the **funicular** from outer portal to granite summit (a new feature), (d) the **"U.S. Space Force" sign** at the outer portal. The 01-masterplan's 1,450-block mountain and 800-block J-curve are *referenced* in the combined complex but not re-built. |
| **SubTropolis** | `D:\projects\mc-fleet-bot\masterplans\02-subtropolis\04-design\site-plan.md` and `masterplan.pdf` | The 200×200 chamber and pillar grid are owned by 02-masterplan. The combined complex adds (a) the **public shaft landing at (60, −100, −100)** in the SE corner of the chamber (the "Public Access Lobby"), (b) the **horizontal portal at (0, 0, −300)** on the north face of the chamber (a *new* portal on the south face of the mountain, at city level), (c) the **service tunnel entrance at (−100, 0, −300)** in the NW corner of the chamber (the minecart entry to the service tunnel). The 02-masterplan's 5×5 spec is *preserved* as the public shaft lift core (the 7×7 includes the 5×5). |
| **Houston Tunnel System** | `D:\projects\mc-fleet-bot\masterplans\03-houston-tunnel-system\04-design\site-plan.md` and `masterplan.pdf` | The 24-block sample is owned by 03-masterplan. The combined complex adds (a) the **public shaft buffer block in the SE corner of the sample** (already flagged in 03-masterplan), (b) the **T-marker at the public shaft entrance** (Easter Egg #7, inherited from 03-masterplan). No other changes. |

### 12.2 Coordination points (binding)

The following are the **6 binding coordination points** between the combined complex and the individual site master plans. Each must be respected by the architectural designer.

1. **Public shaft 7×7 cross-section contains a 5×5 lift core.** The 02-masterplan's 5×5 spec is *preserved*; the 7×7 is the architectural envelope (5×5 + 2-block outer ring). No amendment to 02-masterplan.
2. **Public shaft lands at (60, −100, −100), the SE corner of the SubTropolis chamber.** This is the "Public Access Lobby" — a 7×7 block room inside the SubTropolis chamber, with a security gate and channel-letter sign.
3. **Service tunnel entrance at (−100, 0, −300), the NW corner of the SubTropolis chamber.** This is where the minecart rail exits SubTropolis into the service tunnel. The 02-masterplan's NW corner must accommodate this entry without disrupting the pillar grid.
4. **Service tunnel terminus at (0, 200, −420) on the south face of the mountain, in the granite.** The 25-ton blast door, the checkpoint corridor, and the guard booth are all *new* features added by the combined complex. The 01-masterplan does not own this area (it's outside the J-curve). No amendment to 01-masterplan.
5. **Funicular from (0, 200, −420) to (0, 800, −500).** The funicular is a *new* feature added by the combined complex, going from the Cheyenne outer portal up to the granite summit. The 01-masterplan does not own the funicular.
6. **Composite terrane plaque at (−40, 200, −360) in the service tunnel, at the contact crossing.** The plaque is a *new* feature, inside the service tunnel, at the horizontal granite-limestone contact. The plaque replaces the previous "ravine bottom" location; in the no-ravine design, the plaque is at the geological boundary inside the service tunnel, which is geologically honest (the contact is real, the plaque is at the crossing).

### 12.3 No amendments required

Per the discussion notes (Section 6), **no amendments to the three individual site master plans are required**. The combined complex's site plan is *additive* — it adds features (public shaft entrance, service tunnel, funicular, paved return road, coastal plain, mountain range) that are outside the three individual sites' footprints. The individual sites' internal geometry, pillar grids, chamber layouts, and J-curve tunnels are preserved.

---

## 13. Site Coordinates (the Master Coordinate Table) — UPDATED

The following are the **binding world coordinates** for the combined complex (no-ravine rework). All values are in blocks. The world origin is (0, 0, 0); north = −Z, east = +X, up = +Y. The build extends from Y=−100 to Y=800, X=−750 to +750, Z=−750 to +750. **No ravine coordinates are included — the ravine has been dropped from the design.**

### 13.1 World and frame coordinates

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **World origin** | 0 | 0 | 0 | Center of the city, at ground level. |
| **World footprint** | −750 to +750 | −100 to +800 | −750 to +750 | 1,500 × 900 × 1,500 blocks. |
| **Build height required** | — | 1,024+ | — | Vanilla 384 insufficient. CubicWorld mod with ≥ 2,048 build height. |
| **Compass orientation** | — | — | — | north = −Z, east = +X, up = +Y |

### 13.2 Mountain range (no ravine) — UPDATED

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Granite peak summit** | 0 | 800 | −500 | Single peak (or range of peaks along the E–W axis), apex of the granite intrusion. |
| **Granite peak center** | 0 | 500 | −500 | Vertical center of the granite mass. |
| **Limestone base center** | 0 | 100 | −500 | Vertical center of the limestone mass (Y=0 to Y=200, on the south face). |
| **Mountain south face** | −400 to +400 | 0 to 800 | −200 | The dramatic south face of the mountain, visible from the city. |
| **Horizontal contact** | entire mountain face | **200** | entire mountain face | The horizontal granite-limestone contact at Y=200, visible as a clear color line on the south face. |
| **Mountain footprint** | −400 to +400 | 0 to 800 | −800 to −200 | 800 × 800 × 600 blocks. One continuous mountain, no ravine. |

### 13.3 City and coastal plain

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **City center** | 0 | 0 | 0 | Center of the 138m × 138m downtown. World origin. |
| **City footprint** | −69 to +69 | 0 to 80 | −69 to +69 | 138m × 138m, with 80m-tall towers. In the wide flat valley. |
| **Combined Complex Transit Hub plaza** | +60 | 0 | −70 | 20×20 block plaza at the NE corner of the city. Public shaft entrance. |
| **Grand Avenue start (world edge)** | +69 | 0 | +700 | South end of the Grand Avenue, at the world edge. |
| **Grand Avenue end (city entry)** | +69 | 0 | +100 | North end of the Grand Avenue, at the city NE corner. |
| **Grand Avenue material transition** | +69 | 0 | +350 | Where the stone-brick "old town" section transitions to the granite-and-glass "new city" section. |
| **Coastal plain south edge** | −750 to +750 | 0 | +750 | Far south edge of the world, where the coastal-plain highway terminates. |
| **Coastal plain east edge** | +750 | 0 | −100 to +700 | East edge of the world, where the Grand Avenue arrives from the east. |
| **Coastal-plain lake** | +500 | 0 | +500 | Small lake at the SE corner of the plain, for drainage. |
| **World-edge pier** | +69 | 0 | +720 | Wooden pier at the south edge, "End of the world — turn back" sign. |

### 13.4 Public shaft

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Public shaft top (pavilion)** | +60 | 0 | −70 | NE corner of the city, 7×7 glass-and-steel pavilion. Guard booth, turnstile, T-marker, "SubTropolis — Public Access" sign. |
| **Public shaft mid-landing** | +60 | −50 | −70 | At Y=−50, the G-Cans observation room. 7×7 with a single glass window looking out at the city's underground utility corridor. Contains one labelled block of exposed limestone (270 Ma). Centerpiece #2. |
| **Public shaft bottom (Public Access Lobby)** | +60 | −100 | −100 | SE corner of SubTropolis chamber, where the mechanical lift lands. Security gate, turnstile, "Welcome to SubTropolis" channel-letter sign. |

### 13.5 SubTropolis

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **SubTropolis chamber footprint** | −100 to +100 | −100 to 0 | −300 to −100 | 200 × 200 × 100 block chamber, owned by 02-masterplan. 8×8×5 block pillars on 65-block centers. |
| **SubTropolis horizontal portal** | 0 | 0 | −300 | 4×5 block opening in the limestone hillside at the north face of the chamber, on the south face of the mountain. "Hunt Midwest SubTropolis — Authorized Vehicles" sign, vehicle gate. Binding architectural object #5. |
| **SubTropolis service tunnel gate** | −100 | 0 | −300 | NW corner of the chamber, where the minecart rail exits to the service tunnel. Iron bars gate, "SERVICE TUNNEL → CHEYENNE" sign. |

### 13.6 Service tunnel (UPDATED for no-ravine) — KEY CHANGES

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Service tunnel start (SubTropolis end)** | −100 | 0 | −300 | At the SubTropolis NW corner, on the south face of the mountain, in the limestone. Open entrance, "U.S. Space Force" sign, 1-block security gate, turnstile. "SBB CFF FFS" logo block (Easter Egg #3). |
| **Service tunnel contact crossing** | **−40** | **200** | **−360** | **At the contact elevation Y=200, where the tunnel walls transition from cream limestone to pink granite. The composite terrane plaque is here (Centerpiece #3, Easter Egg #1). Thrust-fault breccia visible in the walls (Easter Egg #8).** |
| **Service tunnel end (Cheyenne outer portal)** | 0 | 200 | −420 | On the south face of the mountain, in the granite, at the contact elevation. Concrete-and-granite frame, 25-ton blast door recessed in a 4-block side branch, 4-block concrete-and-granite checkpoint corridor, guard booth. |
| **25-ton blast door** | 0 | 200 | −420 | At the Cheyenne outer portal, service tunnel terminus. 3-ft-thick steel door, 20 ft tall, in a concrete-and-granite frame. Visible from the approaching minecart. Binding centerpiece #1. |
| **Composite terrane plaque** | **−40** | **200** | **−360** | **Inside the service tunnel at the contact crossing. 1×2 block carved-stone plaque lit by a single redstone lamp. Text: "Thrust Fault Contact — Pikes Peak Granite (1.08 Ga) overthrust on Bethany Falls Limestone (270 Ma). The contact is exposed at the surface on the south face of the mountain at Y=200, and crossed by this tunnel." Binding centerpiece #3 and easter egg #1.** |

### 13.7 Cheyenne

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Cheyenne chamber footprint** | −40 to +40 | 250 to 400 | −580 to −500 | ~80m × 80m × 150m chamber, 4.5 acres, owned by 01-masterplan. 1,319 half-ton coil springs under 15 spring-mounted buildings. |
| **Cheyenne chamber center** | 0 | 325 | −540 | Vertical center of the Cheyenne chamber. |
| **Cheyenne J-curve start (at outer portal)** | 0 | 200 | −420 | At the service tunnel terminus. The 800-block curved access tunnel begins here, descending from Y=200 to the chamber approach at Y=250–300. |
| **Cheyenne J-curve end (at chamber)** | 0 | 300 | −540 | At the chamber's south wall. The J-curve terminates here with the chamber's main entrance. |

### 13.8 Return route (funicular + road, no skybridge) — UPDATED

| Location | X | Y | Z | Description |
|---|---|---|---|---|
| **Funicular start (at outer portal)** | 0 | 200 | −420 | At the Cheyenne outer portal, where the funicular rail begins. Part of the 2-mode surface return route. |
| **Funicular end (granite summit)** | 0 | 800 | −500 | At the antenna array station on the granite summit. The "Three Sites, One Mountain" sign (Easter Egg #2) and the rock identification chart (Easter Egg #9) are placed here. |
| **Paved road start (granite summit)** | 0 | 800 | −500 | At the funicular arrival, where the paved switchback down the south face begins. |
| **Paved road end (city center)** | 0 | 0 | 0 | At the Combined Complex Transit Hub plaza, where the road arrives at street level. |

---

## 14. Materials & Block Palette (World-Level)

The combined complex uses a *meta-palette*: each site has its own palette (inherited from its masterplan), and the *inter-site* connections and the *world envelope* have their own transitional palettes. The palette is honest — pink granite is pink granite, cream limestone is cream limestone, white concrete is white concrete — and the transitions between palettes are *gradients*, not hard cuts.

### 14.1 Primary palette (per zone)

| Zone | Primary block | Secondary block | Accent / detail |
|---|---|---|---|
| **Granite intrusion (upper mountain, Y=200 to Y=800)** | Polished diorite (pink-grey, Pikes Peak syenogranite analogue) | Diorite, granite, granite bricks | Smoky-quartz crystals (small clusters), pink terracotta (brick-red accent), snow layer (peak), spruce/dark-oak forest (lower slopes) |
| **Limestone base (lower mountain, Y=0 to Y=200)** | Smooth stone (cream-grey) | Calcite, sandstone (cream), polished calcite | Chiseled calcite blocks (for carved plaques), oak/maple leaves, exposed fossils (light grey wool "fossil" inlays, decorative), horizontal bedding planes visible |
| **City above-ground (Houston, in the valley)** | Stone bricks (gray) | Quartz blocks, white concrete, glass panes | Glass pane skybridges, sea-lantern streetlights, oak doors, T-marker (red wool + white concrete) |
| **Houston tunnel (under city)** | White concrete (walls) | White wool (VCT floor analogue), smooth stone slab (dropped ceiling) | Sea lantern (fluorescent analogue), light gray carpet (corridor markings), quartz stairs (food court accents) |
| **Public shaft (city → SubTropolis)** | Gray concrete (top half) | Smooth stone transitioning to calcite (bottom half) | Iron bars (lift enclosure), glass panes (observation window), oak trapdoors (utility access), redstone lamps (lighting) |
| **Service tunnel (SubTropolis → Cheyenne)** | Smooth stone (start, limestone) | Polished diorite (end, granite) | Rails + powered rails (steep grade section), stone brick slab (floor), redstone lamps (utility strip), chiseled calcite (contact-crossing plaque), cobblestone (breccia strip) |
| **Composite terrane plaque** | Chiseled calcite (limestone half) | Chiseled stone bricks (granite half) | Written book or sign block for the geological text; 1-block strip of mixed cobblestone + calcite (thrust-fault breccia) |
| **Horizontal contact (Y=200, on mountain south face)** | Mixed (the contact line itself) | Polished diorite above, smooth stone below | A 1-block-wide strip of thrust-fault breccia (cobblestone + calcite) at the contact line, visible on the mountain face and inside the service tunnel |
| **Funicular (granite face, Y=200 to Y=800)** | Powered rails on polished diorite | Oak fence handrails, sea lantern stations | A 3×3 funicular car (oak + glass), 2-block rail, passing loop at midpoint |
| **Paved return road (granite summit to city)** | Stone brick (mountain sections) | Granite + glass (city approach) | Oak fence handrails at switchbacks, sea-lantern streetlights every 20 blocks |
| **Grand Avenue (coastal plain)** | Stone brick (first 350 blocks) | Granite + glass (final 75 blocks) | Oak-plank sidewalks, sea-lantern streetlights every 15 blocks, arrival arch at the material transition |
| **Coastal plain (east of city)** | Grass blocks | Sand (near the small lake), oak/spruce saplings (sparse forest) | Lily pads, oak boats, sugar cane (near water) |

### 14.2 Secondary (transitional) palette

The *transitional* blocks are used at the gradient zones — the public shaft, the service tunnel, the contact crossing, the mid-landing, the surface entrances. The transitions are 1–2-block gradients, not 1-block hard cuts, so the eye reads a *slow color shift* over 30–200 blocks of vertical or lateral travel.

- **Public shaft — top half (city → mid-landing):** gray concrete, light gray wool (lift floor), iron bars (lift enclosure), oak trapdoors (utility covers). Reads as Houston above-ground construction.
- **Public shaft — mid-landing (Y = −50):** a 7×7 room in *utility* palette — exposed gray concrete pillars, white concrete (walls), light gray wool (floor), sea lantern (the G-Cans-style pillar visible through the glass window), oak fence (handrail), item frame on a smooth stone slab (the labelled limestone block, "Bethany Falls Limestone — 270 Ma").
- **Public shaft — bottom half (mid-landing → SubTropolis):** transition blocks — smooth stone (a *creamer* gray than the concrete above), calcite (cream-grey), white concrete (lobby walls). Reads as SubTropolis industrial.
- **Service tunnel — SubTropolis end (0 to 60 blocks, climbing):** smooth stone walls (cream-grey, limestone), white concrete (utility strip), stone brick slab floor, rails, powered rail every 4–8 blocks (for the steep climb), redstone lamps.
- **Service tunnel — contact crossing (~60 blocks in, at Y=200):** a 1-block chiseled calcite wall (limestone) on one side, a 1-block chiseled stone brick wall (granite) on the other, with a 1-block-wide cobblestone + calcite *breccia strip* at the contact. A sign block reads "Thrust Fault Contact — Granite (1.08 Ga) over Limestone (270 Ma)." The composite terrane plaque is here.
- **Service tunnel — Cheyenne end (60 to 120 blocks, lateral at Y=200):** polished diorite walls (pink-grey granite), gray concrete (checkpoint corridor floor), iron door (the 25-ton blast door analogue), sea lantern (cool fluorescent), quartz stairs (the granite frame around the door).
- **Mountain south face at the contact (Y=200):** the contact line is visible as a 1-block-wide strip of mixed stone (cobblestone + calcite breccia), with polished diorite above (Y=200 to Y=800) and smooth stone below (Y=0 to Y=200). The contact runs the full 800-block E–W length of the south face.

### 14.3 The 4-layer material story (vertical cross-section)

A side-view cross-section through the world, top to bottom, shows the palette story:

```
Y =  800   Snow layer (granite peak, white on pink-grey)
Y =  700   Polished diorite (granite core, pink-grey)
Y =  400   Polished diorite + spruce forest (granite intrusion)
Y =  200   *** HORIZONTAL CONTACT *** (thrust-fault breccia strip)
Y =  100   Oak/maple forest on smooth stone (limestone base, Y=0 to Y=200)
Y =    0   City surface: stone brick + glass + quartz (in the wide flat valley)
Y =   -6   Houston tunnel: white concrete + white wool + smooth stone slab
Y =  -50   Public shaft mid-landing: gray concrete utility palette
Y = -100   SubTropolis ceiling (calcite) → SubTropolis chamber (smooth stone)
Y = -100   SubTropolis sub-basement: smooth stone + rails (service tunnel entry)
Y =    0   Service tunnel start (SubTropolis end): cream limestone walls
Y =  200   Service tunnel contact crossing: limestone → granite transition
Y =  200   Service tunnel end (Cheyenne end): polished diorite + gray concrete
Y =  300   Cheyenne J-curve interior: polished diorite + gray concrete
Y =  400   Cheyenne chamber: polished diorite walls + gray concrete floors
```

The vertical palette is the build's *visual signature*. A player who descends from city to chamber sees the palette change in distinct, named blocks: stone brick → white concrete → gray concrete → smooth stone → polished diorite. Five named block types, four layer transitions, one trajectory. The horizontal contact at Y=200 is the *geological thesis* of the build — the moment where pink-grey granite meets cream-grey limestone, both inside the service tunnel and on the mountain's south face.

---

## 15. Scale Verification

- **Mountain height:** 1,800+ feet of solid granite above the Cheyenne chamber (chamber floor at Y=250, summit at Y=800 = 550 blocks of vertical overburden, matching the 1,800+ ft at 1:1 requirement; the peak at Y=800 represents the 2:1 vertical compression of the real 2,915m Pikes Peak).
- **World footprint:** 1,500 × 1,500 × 800 blocks (with the build extending to Y=−100 below the city).
- **The 3 individual sites all fit in this footprint:**
  - Cheyenne chamber: 80 × 30 × 100 blocks, at Y=250–400 in the granite intrusion.
  - SubTropolis chamber: 200 × 200 × 100 blocks, at Y=−100 to Y=0 in the limestone below the city.
  - Houston tunnel sample: 24-block diameter, at Y=−6 to Y=0 under the city.
- **Render distance implications:** view-distance 16 and simulation-distance 12 are recommended (per discussion-notes Section 5, open question #9). The full build is ~3.5M placed blocks; render distance 16 covers ~256 chunks (16 × 16) which is sufficient for the buildable core.

---

## 16. Open Questions for the Architectural Designer / User

The site plan resolves the macro-level decisions for the no-ravine rework. The following questions remain for the architectural designer or the user before the design phase can start:

1. **Contact elevation confirmation.** The site plan places the horizontal granite-limestone contact at **Y=200**. This is the designer's choice based on (a) keeping the Cheyenne chamber in the granite zone (chamber at Y=250–400 is above Y=200), (b) maintaining 549+ blocks of granite overburden, and (c) leaving 200 blocks of visible limestone on the south face as the lower mountain. Alternatives: Y=100 (more limestone visible, less dramatic overburden story), Y=300 (less limestone, chamber closer to the contact). The designer should confirm Y=200 is acceptable.

2. **Service tunnel climb profile.** The service tunnel climbs from Y=0 to Y=200 over the first 60 blocks (3.33:1 grade, very steep). This is acceptable in Minecraft with powered rails every 4–8 blocks, but a less steep climb (e.g., 2:1 over 100 blocks) is more realistic. The designer should choose the climb profile and the contact crossing position.

3. **SubTropolis horizontal portal at Y=0 vs. at a higher elevation.** The current design has the SubTropolis horizontal portal at Y=0 (city level, on the south face of the mountain). An alternative is to place the portal at a higher elevation (e.g., Y=100, mid-limestone) with a longer switchback approach road from the city. The designer should choose the portal elevation.

4. **Funicular route (east face vs. west face).** The funicular is on the east or west face of the granite intrusion. The designer should choose which face, based on visibility from the city and the visual signature of the build.

5. **Cheyenne outer portal at Y=200 (contact elevation).** The outer portal is at the contact elevation Y=200, in the granite. The J-curve descends from Y=200 to the chamber at Y=250–400. The designer should confirm the outer portal elevation and the J-curve's vertical profile (the 01-masterplan specifies 800 blocks of J-curve length; the vertical distribution is TBD).

6. **Grand Avenue alignment (X=+69 vs. centered).** The Grand Avenue enters the city at the NE corner (X=+69, Z=+100). An alternative is to center the Avenue on the city's east edge (X=0, Z=+100). The designer should choose the alignment based on the city's internal street grid.

7. **Single peak vs. multiple peaks along the E–W range.** The site plan specifies a single dominant peak at (0, 800, −500), with optional secondary summits along the E–W ridgeline. The designer should decide whether the range is a single peak (simpler silhouette) or a chain of peaks (more complex, more realistic alpine range).

8. **Funicular station at the summit.** The funicular station at the granite summit hosts the "Three Sites, One Mountain" sign (Easter Egg #2) and the rock identification chart (Easter Egg #9). The designer should specify the station's architecture and the placement of the signs.

9. **No ravine — what happens to the "ravine" easter eggs?** The previous design had 2 easter eggs specific to the ravine (the thrust-fault breccia strip in the ravine floor, the composite terrane plaque at the ravine bottom). The new design relocates the breccia strip to the service tunnel contact crossing (Easter Egg #8) and the plaque to the same location (Easter Egg #1). The 9-easter-egg count is preserved, but the *location* of these two has moved. The designer should confirm the count and locations are acceptable.

10. **The composite terrane plaque text.** The plaque text is "Thrust Fault Contact — Pikes Peak Granite (1.08 Ga) overthrust on Bethany Falls Limestone (270 Ma). The contact is exposed at the surface on the south face of the mountain at Y=200, and crossed by this tunnel." The designer should confirm the text and consider adding a short geological explanation (e.g., the type of contact, the regional context).

11. **The mountain's E–W extent and secondary summits.** The mountain is 800 blocks wide (X=−400 to +400) and 600 blocks deep (Z=−800 to −200). The site plan specifies a single peak at (0, 800, −500). The designer should decide whether to add secondary summits along the E–W ridgeline and what their elevations are.

12. **The mountain's N face (back-slope).** The site plan focuses on the south face (the city-facing side). The north face (Z=−800, the back of the mountain) is less detailed. The designer should specify the back-slope geometry and any features (forest cover, drainage, etc.).

---

*End of site plan. The 16 sections above define the macro site design for the no-ravine combined complex. The 7 binding decisions from the original deliberation — Global Scale, Public Shaft, Service Tunnel, Visitor Journey, Inter-Site Centerpieces, Easter Eggs, plus the updated Mountain Range Layout (one continuous mountain, horizontal contact at Y=200, no ravine) — are reflected in this plan. The 6 coordination points in §12 are the contract with the three individual site masterplans. The 12 open questions in §16 are the items that need the Architectural Designer's call before the design phase can start.*
