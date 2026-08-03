# Houston Tunnel System — Site Plan

**Build:** 03 — Houston tunnel system (Minecraft replica)
**Phase:** 04 — Site design (macro)
**Author role:** Site Planner
**Inputs:** `01-research/research-report.md`, `01-research/references.md`, `02-visuals/visual-assets.md`, `03-discussion/culture-architecture-analysis.md`, `03-discussion/discussion-notes.md`
**Date:** 2026
**Status:** Master plan, binding for the Architectural Designer and the AI Contractor Writer

> The site plan is **macro only**. It defines the world, the terrain, the footprint, the coordinate system, the visitor flow, the materials palette, and the inter-build connections. **No block-by-block design** is in this document. The Architectural Designer owns interior design; the Contractor Writer owns build instructions.

---

## 1. Site Overview

The Houston tunnel system is the **civilian, climate-controlled, retail-flavored underground city** of the combined-complex trilogy. It sits **under a downtown** in the **valley** between the mountain range (Cheyenne Mountain on the north side of the ravine, SubTropolis on the south side) and a flatter coastal plain. The build is **the city and the shadow city, both layers, one narrative**.

The visitor approaches a sun-blasted, palm-tree-lined Houston downtown grid — surface parking, one-way streets, glass-and-steel office towers, skybridges crossing streets at the second floor. They enter a 1970s granite-and-glass office-tower lobby, descend a short interior stair or escalator, and arrive in a **beige, fluorescent, climate-controlled, dropped-ceiling corridor** that runs for **six blocks of compressed city** under the surface. The corridor is a 20-foot, 8-foot-tall, painted-concrete-block, VCT-floored pedestrian network connecting **24 compressed city blocks** of downtown, with **four food courts as quadrant anchors** and **two direct street-level entries**. The build is small enough to walk in 2–3 minutes from one end to the other, and large enough to feel like a city.

The **above-ground city is the primary layer of the Houston site**. The Houston tunnel system is a *feature* of the city, not the main event. The city uses Houston's real urban-design vocabulary (CBD grid, named streets, named skywalk network, parking-garage typology) but is a fictional downtown — the 4 named anchor buildings (Wells Fargo Plaza, JPMorgan Chase Tower, Pennzoil Place, Esperson) and the 4 food courts (Esperson, Pennzoil, 1001 Fannin, McKinney Place) sit in a 4×6 (tunnel) / 6×6 (above-ground) compressed grid that is **Houston-vocabulary** but not a literal replica. The world origin is at the **Wells Fargo Plaza street entrance** — the most-used tourist/lunchtime entry, and the entry that *every* office worker knows.

In the combined-complex layout, the **SubTropolis public shaft** (a project fiction) lands at a "Combined Complex Transit Hub" plaza at the **east edge** of the above-ground city (beyond Main Street), and the **Cheyenne Mountain service tunnel** (also a project fiction) runs at 150+ ft depth under the city, well below the Houston tunnel layer at 20 ft. The Houston tunnel system is **physically separate** from both — it is a civilian workplace network with its own hours, its own access rules, and its own two public entries.

**Compass orientation (binding).** North = −z. East = +x. Up = +y. This matches Minecraft convention.

**Coordinates (binding).** World origin (0, 64, 0) is the **Wells Fargo Plaza street entrance** — at the SE corner of the build, on the south face of the Wells Fargo tower, on the sidewalk of Louisiana Street, at street level. The T-marker plaque is at (0, 64, 0).

---

## 2. Terrain & Above-Ground City (Minecraft-Translated)

### 2.1 The valley setting

The combined-complex layout places the Houston above-ground city **in the valley** between the mountain range and the coastal plain. The city is a flat, low-lying, sun-blasted downtown grid — Houston is on the **Texas Coastal Plain**, on the soft, compressible Beaumont Formation clays, with a **shallow water table 10–30 ft below grade**. Geologically, this is the *opposite* of the sister installations: Houston is not cut into rock, it is cut into wet clay and sand. Construction is shored excavation, sheet piling, and poured concrete.

In Minecraft, the valley terrain is **flat, dry, hot-plains biome** (or a savanna variant), at the base level y = 64. The mountain range (Cheyenne Mountain on the north, SubTropolis on the south) rises beyond the build's edge. The Houston above-ground city is a **120 m × 120 m flat city block** — not a hillside, not a ravine. The temperature in-game is a *feeling* (the visitor sees the surface biome, knows it's hot) and a *sign* ("72 °F Year-Round" inside the tunnel).

### 2.2 Above-ground city footprint

The above-ground city is a **6 × 6 = 36 compressed city blocks** (per binding decision D6), at the 4:1 linear compression. Each compressed block is 20 m × 20 m; with 3 m streets between, each block unit is 23 m. The above-ground footprint is **138 m × 138 m**, from x = 0 to 138 and z = 0 to −138 (north of origin is −z).

This is **larger than the tunnel sample** (4 × 6 = 24 compressed blocks) by 2 columns on the west side. The 2 extra west columns (cols 5–6) are the **above-ground buffer** — they hold generic downtown towers, surface parking, and the city street grid, but they do not have tunnels underneath. This matches the real system: not every downtown tower is connected to the tunnel network, only the documented ones are.

### 2.3 The above-ground city (Houston-vocabulary, fictional)

The above-ground city is **`[X]` (designer fills in the specific layout) but uses `[D]` Houston urban-design vocabulary**. The four named anchor buildings anchor the four quadrants; the surrounding 8–10 generic downtown towers fill the buffer blocks in a uniform cornice line. The street grid uses the real Houston CBD street names.

**The four named anchor buildings (compressed scale, with documented architectural signatures):**

| Building | Position (center) | Height (blocks = stories) | Compressed from | Architectural signature |
|---|---|---|---|---|
| **Wells Fargo Plaza** (1000 Louisiana) | (10, 64, −10), col 1, row 1 | 24 stories | 71 stories (real) | Glass-and-granite office tower, plaza, direct-access stair. The most-rendered named building. |
| **JPMorgan Chase Tower** (600 Travis) | (33, 64, −110), col 2, row 5–6 | 24 stories | 75 stories (real) | The tall one. Originally the 1935 Will Horwitz Uptown Theater site. The 1950s minimal corridor is in its basement. |
| **Pennzoil Place** (711 Louisiana) | (79, 64, −55), col 4, row 3 | 20 stories | 36 stories × 2 (two mirrored towers) | Philip Johnson's mirrored trapezoidal towers. Densest food court underground. |
| **Esperson** (808 Travis / 815 Walker) | (56, 64, −55), col 3, row 3 | 16 stories | 28 stories (Art Deco twins) | Niels Esperson's Art Deco towers. The archetype food court under them. |

Plus:

- **1001 Fannin** (One Fannin), at (33, 64, −10), col 2, row 1. The **modern food-court refresh**. 24 stories compressed from 30.
- **McKinney Garage** (930 Main), at (10, 64, −82.5), col 1, row 4. The **parking garage** with the **other public entry**. 4–6 stories, open-deck typology, with McKinney Place food court underneath.

**Generic downtown towers** (8–10, `[X]`): uniform cornice line, 15–20 stories (y = 64 to ~80), each a glass-and-steel office tower with a parking-garage ground floor. The 4 named anchors break up the cornice line at the 4 corners. No specific Houston buildings are reproduced beyond the 4 named anchors and the 2 named secondary buildings.

**Parking garages** (1–2 additional, `[X]`): generic multi-level open-deck parking, 4–6 stories, on the buffer blocks. The McKinney Garage is the only named parking garage; the others are generic.

**Street grid (`[D]` Houston CBD names, fictional positions):**

| Axis | Streets | Position (centerline) |
|---|---|---|
| **N–S** (long, 6 streets) | **Main** (eastmost) | x = 1.5 |
| | Fannin | x = 21.5 |
| | Travis | x = 44.5 |
| | Louisiana | x = 67.5 |
| | Walker | x = 90.5 |
| | **Capitol** (westmost) | x = 113.5 |
| **E–W** (4 streets) | **Lamar** (southmost) | z = −20.5 |
| | Dallas | z = −43.5 |
| | McKinney | z = −66.5 |
| | **Rusk** (northmost) | z = −89.5 |

The streets are **3 m wide** in the build (compressed from 12 m real Houston CBD streets at 4:1). Each street is **1-block-wide stone brick or cobblestone**, with 1-block-wide stone-slab sidewalks on each side. Streetlights every 10 blocks. Parking meters on the sidewalks. Fire hydrants at corners. The streets are **one-way grid** in the build vocabulary (the actual direction is `[X]`). Named street signs at every intersection.

**Climate above ground:** hot, sunny, palm trees on the plazas and the surface parking lots. In Minecraft terms, the **biome is hot plains or savanna**; the surface is light level 15 (full daylight). The transition from surface to tunnel (the lobby descent) is the **deliberate design moment** — the visitor steps from 105 °F surface heat and full daylight into 72 °F, fluorescent, climate-controlled corridor with no windows.

**Above-ground city vs. tunnel access:** every named building on the surface has a documented tunnel access (lobby → bank of elevators / interior stair / escalator → basement corridor). The generic towers do *not* have tunnel access — they are "the rest of downtown," not connected. This is the truth of the real system: not every downtown tower is connected; only the documented ones are.

---

## 3. Site Layout — Tunnel Layer

### 3.1 Tunnel sample footprint

The tunnel sample is **4 × 6 = 24 compressed city blocks** at the 4:1 linear compression, occupying the **east two-thirds of the above-ground city**. The 2 extra west columns (cols 5–6) are above-ground only.

**Tunnel sample extent:** x = 0 to 92, z = 0 to −138, y = 58 to 64.

The tunnel sample is divided into 4 **quadrants** of 2 × 3 = 6 compressed blocks each:

| Quadrant | Cols | Rows | Anchor food court | Above-ground anchor |
|---|---|---|---|---|
| **Q1 (SE)** | 1–2 | 1–3 | **1001 Fannin** (Lamar Tunnel) | 1001 Fannin, Wells Fargo Plaza |
| **Q2 (NE)** | 1–2 | 4–6 | **McKinney Place** (E. McKinney Tunnel) | McKinney Garage |
| **Q3 (SW)** | 3–4 | 1–3 | **Esperson** (N. Travis Tunnel) | Esperson, Pennzoil Place |
| **Q4 (NW)** | 3–4 | 4–6 | **Pennzoil Place** (N. Louisiana Tunnel) | JPMorgan Chase Tower |

The **4 food courts anchor the 4 quadrants**. Wells Fargo Plaza is not a food court — it is the **public entry** at the SE corner of the build, with the lobby descent leading into Q1's standard corridor.

### 3.2 The food court cluster (binding per D2)

The 4 food courts are the **defining experience** of the tunnel system — they are why 200,000 people use the system daily (by lore). They are the destination of every commute, and the build's signature moments. Each food court has a distinct archetype:

| Food court | Quadrant | Position (center) | Archetype | Tier 1 must-have |
|---|---|---|---|---|
| **Esperson** (808 Travis) | Q3 | (56, 58, −55) | Long narrow corridor, single row of storefronts, white dropped ceiling, fluorescent tubes, beige terrazzo. **The archetype.** | (b) |
| **Pennzoil Place underground** (711 Louisiana) | Q2/Q4 boundary | (79, 58, −55) | Wider node, 10–12 packed storefronts, mirrored Philip Johnson towers above, kitchen-exhaust grilles. **The densest.** | (b) |
| **1001 Fannin / Lamar Tunnel** | Q1 | (33, 58, −10) | Dark ceiling, polished porcelain floor, frameless-glass storefronts, LED panel lighting. **The modern refresh.** | (b) |
| **McKinney Place / 930 Main concourse** | Q2 | (10, 58, −82.5) | Under a parking garage, mixed retail and services, longer linear concourse. **The public-entry food court.** | (b) |

### 3.3 The standard corridor (binding per D2)

The **standard climate-controlled corridor** is the single most common visual in the build. It is the same in every segment, even though ownership changes. The cross-section is **3 blocks wide × 3 blocks tall interior** (3 m × 3 m = 10 ft × 10 ft; the real is 10–20 ft wide and 8–9 ft tall). Floor at y = 58, dropped ceiling at y = 61, structural ceiling at y = 62, underside of street at y = 63, street level at y = 64. The corridor is **uninterrupted** for 4–6 compressed blocks between intersections, then meets a **backlit "Tunnel" band sign** at the intersection.

**Time-staggered visual cross-section** (binding): the build embeds three corridor variants side-by-side, matching the real system's visual identity:
- **1970s Hines era** (default): bare concrete walls painted off-white, white acoustic-tile 2×4 dropped ceiling, fluorescent-tube troffers, beige VCT floor, the original-build look. Most of the corridor sample is this era.
- **1990s refresh** (in the Pennzoil Place quadrant): white-painted concrete-block walls, 2×2 acoustic tile, fluorescent, beige terrazzo, slightly warmer tones. A small section.
- **2010s–2020s LED refresh** (in the 1001 Fannin quadrant): dark-gray or black dropped ceiling, polished dark-charcoal porcelain floor, frameless-glass storefronts, LED panel lights. A small section, but unmistakable.

### 3.4 The tunnel depth (binding per D3)

The tunnel sits **6 blocks (6 m = 20 ft) below street level** at 1:1 vertical. Street level is y = 64; tunnel floor is y = 58. The 1-block structural slab (y = 63) and the 1-block dropped-ceiling space (y = 62) are above the corridor interior. The 3-block interior clear height (y = 58 to 61) is the player's headroom. **Vertical compression is 1:1** — the descent is exactly one story, the squeeze between street and tunnel ceiling is real, the water-table risk is real.

In the food-court nodes, the interior opens to **4 blocks of headroom** (y = 58 to 62), exposing the underside of the street and the kitchen-exhaust grilles. This matches the real 12–14 ft food-court ceiling.

### 3.5 The named segments (binding per D1)

At least 5 of the 6 documented named segments are represented. In the build:

| Named segment | Real Houston location | In-build location | Status |
|---|---|---|---|
| **Downtown Tunnel Loop** | The central interconnected ring | Spans the center of the build (Q2/Q3 boundary, rows 3–4) | ✓ represented |
| **W. Walker Tunnel** | Under Walker, around 1000 Main | The west edge of the tunnel sample, around col 4 row 1–2 | ✓ represented |
| **N. Louisiana Tunnel** | Under Louisiana, around Pennzoil | Col 4, rows 3–4, around the Pennzoil food court | ✓ represented |
| **N. Travis Tunnel** | Under Travis, around JPMorgan Chase | Col 2–3, rows 4–6, around the 1950s minimal corridor and the JPMorgan Chase basement | ✓ represented |
| **Lamar Tunnel** | Under Lamar, around 1001 Fannin | The south edge, around the 1001 Fannin food court | ✓ represented |
| **E. McKinney Tunnel** | Under McKinney, around McKinney Garage | Col 1, rows 4–5, around the McKinney Place food court | ✓ represented |

All 6 named segments are represented in the build. Cameron 2015 grid labels (A-15 through P-29) are used as the **build-block identifiers** in this master plan and downstream. The build-block map is in §7.

### 3.6 The inter-site connections

The tunnel system is **physically separate** from the SubTropolis public shaft and the Cheyenne Mountain service tunnel. It is a civilian workplace network with its own hours and access rules.

- **SubTropolis public shaft (`[X]` project fiction):** lands at a "Combined Complex Transit Hub" plaza at the **east edge** of the above-ground city, beyond Main Street (x = −20 to −5, z = −45 to −65, at street level y = 64). Cross-section **5 × 5 blocks**. The plaza has a glass-and-steel canopy, a stair down, a turnstile, a security guard booth, and a "Combined Complex Transit Hub — SubTropolis Public Access" sign. The shaft is `[X]` and does not connect to the Houston tunnels.
- **Cheyenne Mountain service tunnel (`[X]` project fiction):** runs at **150+ ft below grade** under the city, far below the Houston tunnels at 20 ft. Houston-side terminus at a small service sub-basement at the **north edge** of the build (x = 30–50, y ≈ −86 = 6 blocks below the tunnel floor). Cross-section **6 × 5 blocks**. The service tunnel does *not* pass through the Houston tunnels.

---

## 4. Site Layout — Two-Layer Integration

### 4.1 The descent (binding per D2)

The descent is the **single most Houston-tunnel experience** there is (per the discussion). Every named building's tunnel access follows the same 5-step pattern:

1. **Glass revolving door or security turnstile** at street level.
2. **Lobby** — marble or granite, with a building directory on the wall.
3. **Bank of elevators** and an **interior stair** to the lower level.
4. **Escalator down** (in newer buildings) or **interior stair** (in older ones).
5. **Tunnel corridor** — acoustic dropped ceiling, fluorescent lighting, climate-controlled air.

In the build, the descent is **6 blocks (20 ft) at 1:1 vertical**, from y = 64 (lobby floor) to y = 58 (tunnel floor). The lobby is on the ground floor (y = 64 to 67 = 3 blocks = 1 story, 10 ft). The descent shaft is 1–2 blocks wide, with stair and elevator side-by-side. The corridor at the bottom has a "Tunnel →" sign at the entry, and a backlit "Tunnel" band sign at the first intersection.

### 4.2 Wells Fargo Plaza street entrance (Tier 1, binding)

The **Wells Fargo Plaza street entrance (1000 Louisiana)** is the **most-used tourist/lunchtime entry** and the **only direct street access on the south side of the system** (per the discussion). The entrance is at the **south face of the Wells Fargo tower**, on the sidewalk of Louisiana Street, at street level.

**Build elements at the Wells Fargo street entrance:**
- T-marker plaque on the sidewalk at (0, 64, 0) — small, blue, "T" inside a circle, the Houston convention.
- 6-inch raised concrete threshold at the doorway.
- Glass revolving door at (10, 64, 0) — center of south face.
- Lobby directory with a small sign reading "Tunnel → Basement."
- "Wells Fargo Plaza — Direct Street Access — Free Public Access During Business Hours" sign at the entrance, with the "200,000 daily users" number large and prominent above it.
- Floodgate at the tunnel-level entry (10, 58, 0) — a vertical iron door that slots into brackets, with a small "Tropical Storm Allison — June 2001" marker.
- 95+ blocks / 6 mi / 200,000 daily users interpretive panel on the lobby wall at (10, 65, −3).
- 1930s dual-origin plaque: "Houston Tunnel System — Established 1930s. First tunnel: Ross Sterling under Fannin (1931) and Will Horwitz under Capitol (1935). Inspired by the Rockefeller Center underground concourse."

### 4.3 McKinney Garage direct access (Tier 1, binding)

The **McKinney Garage on Main entrance (930 Main)** is the **other direct street access**, the underdog entry that reads as "parking garage with shops" rather than "tunnel entrance." The entrance is at the **north face of the McKinney Garage**, on the sidewalk of Rusk Street (compressed).

**Build elements at the McKinney Garage direct access:**
- T-marker plaque on the sidewalk at (10, 64, −90) — the same Houston convention as Wells Fargo.
- A stair or elevator down to the tunnel level (10, 58, −82.5).
- "Tunnel Level" sign at the descent.
- The McKinney Place food court is directly below, at (10, 58, −82.5).
- A small "Direct Street Access — One of Two in the System" plaque.

### 4.4 The "T-marker" surface entrance sign (binding per D5)

The T-marker is the **only on-street indication** that a tunnel access exists below. The build includes a T-marker plaque at each of the 2 public entries: at (0, 64, 0) for Wells Fargo and at (10, 64, −90) for McKinney Garage. The plaque is **small, blue, "T" inside a circle** — the Houston convention — easy to miss, deliberate.

### 4.5 The wayfinding system (binding per D5)

The wayfinding is the **chronic weak point of the real system** — there is no central, uniform, building-spanning system. The build reflects this honestly:

- **Backlit "Tunnel" band signs** (white on dark blue, per research §5.5) at every corridor intersection, reading "Tunnel →" or "To [Building Name] →" or "[Food Court Name] / [Address]."
- **Building directory signs** in each lobby, with a small "Tunnel → Basement" arrow.
- **A printed-map standee** (lectern with a book) at the Wells Fargo entry and the McKinney Garage entry.
- **Tenant-landmark wayfinding** (the player asks a NPC "where is the Chick-fil-A?") — the office worker's actual navigation strategy.
- **The Downtown Field Guide & Tunnel Map** (a banner or painting on a wall in the build) showing the full 95-block cobweb with the player's location highlighted, so the visitor understands they are seeing a *sample*, not the whole system.

The wayfinding is **deliberately imperfect** — the time-staggered cross-section of every era of commercial signage side by side, exactly as the real system is.

---

## 5. Visitor Flow & Circulation

The build is a **two-layer city**. The visitor moves between three pedestrian levels: street (y = 64), skybridge (y = 68), and tunnel (y = 58). Each level is a complete pedestrian experience.

### 5.1 The surface approach

The visitor arrives at the **south edge of the build** (z = 0), on a hot, sun-blasted downtown street. They see:
- The 1970s glass-and-granite Wells Fargo Plaza tower, 24 stories tall, with a plaza at the base.
- Surface parking lots to the east and west.
- A one-way downtown street with parallel parking, sidewalks, palm trees, streetlights.
- Other office towers in the distance (the cornice line, the buffer blocks).
- The T-marker plaque on the sidewalk, easy to miss.

**What the visitor feels:** hot, dry, bright. Light level 15. The hum of a downtown.

### 5.2 The descent

The visitor enters the Wells Fargo Plaza lobby through the **glass revolving door**. They see:
- A 1970s marble-and-granite lobby, with a building directory on the wall, a bank of elevators, a security turnstile.
- A small "Tunnel → Basement" sign in the lobby directory.
- The "200,000 daily users" number large on the entrance wall.
- The 95+ blocks / 6 mi interpretive panel.
- The 1930s dual-origin plaque.

The visitor descends an **interior stair or escalator** from the lobby (y = 67) to the tunnel corridor (y = 58). The descent is **6 blocks (20 ft), 1:1 vertical**. The marble and granite give way to painted concrete block; the natural light gives way to fluorescent tubes; the quiet of the lobby gives way to the hum of the HVAC.

**What the visitor feels:** a temperature change (hot → 72 °F), a light change (full daylight → fluorescent), a step into a different world.

### 5.3 The tunnel reveal

The visitor enters the **standard corridor** at (10, 60, −10), at the south edge of Q1. The corridor is 3 blocks wide, 3 blocks tall interior, with:
- Painted off-white concrete-block walls.
- White acoustic-tile 2×4 dropped ceiling.
- Fluorescent-tube troffers.
- Beige VCT floor.
- A backlit "Tunnel" band sign at the first intersection.

The corridor runs north for 3–4 compressed blocks, then meets a corridor intersection with a **backlit "Tunnel →" sign** and a "Tunnel → Pennzoil Place →" or "Tunnel → Esperson →" arrow.

**What the visitor feels:** cool, dry, dim, quiet, empty. The opposite of the surface. Closer in feel to an empty airport concourse at 3 a.m. than to a shopping mall.

### 5.4 The food court

The visitor walks into the **Esperson food court** at (56, 58, −55) (or whichever food court they reach first). The food court is **4 blocks wide × 4 blocks tall interior**, with:
- A single row of storefronts on each side.
- Tenant signage above each storefront (Chick-fil-A red, Potbelly orange, Salata red, Otto's BBQ, Treebeards, Blackwater Coffee, etc.).
- Communal tables in the middle.
- Kitchen-exhaust grilles in the ceiling.
- A "Esperson / 808 Travis" backlit sign at the corridor entry.

At lunchtime the food court is **shoulder-to-shoulder** with office workers; at 3 p.m. it is **empty**. The food court is the *defining experience* of the tunnel system.

**What the visitor feels:** loud, crowded, warm (in the social sense), kitchen-exhaust-scented. Alive in a way the corridor is not.

### 5.5 Other tenant zones

The standard corridor has small storefronts opening onto it at intervals: dry cleaners, barbers, sandwich counters, coffee kiosks, credit unions, dental offices, fitness studios. The 4 food courts are the densest clusters; the standard corridor has sparser, more service-oriented tenants. The **"Vacant / For Lease" bays** in the food courts match the documented 30% vacancy rate of the real system.

### 5.6 The skybridge

The visitor can take a **skybridge** between the second floors of adjacent office towers, crossing a named street. The skybridges are:
- **Glass-enclosed**, climate-controlled, second-floor connectors.
- **1-block-wide, 2-block-tall interior** (1 m × 2 m = 3 ft × 6 ft, compressed).
- **5-block-wide street span** at y = 68.
- **Light level 15** (daylight) — the visual shock of natural light after the fluorescent tunnel.

**What the visitor feels:** daylight, the visual shock of natural light, a sense of the city as a 3D network, a view of the skyscrapers on both sides.

### 5.7 The exit

The visitor exits the tunnel back up to the lobby, then out to the street. At the **Wells Fargo direct access**, the visitor passes through a small **floodgate or removable flood barrier** (a vertical iron door that slots into brackets) and a 6-inch raised concrete threshold. A small **T-marker plaque** is on the sidewalk at the curb.

**What the visitor feels:** a return to the surface, a temperature change, a light change, a recognition of the almost-secret quality of the system — the entry was small, the surface was ordinary, the world below was much larger than the entry suggested.

### 5.8 The wayfinding moment

The visitor's most common experience inside the tunnel is **slightly lost**. The wayfinding is the chronic weak point. The visitor uses the printed map, asks a NPC, or navigates by tenant landmark ("turn left at the Chick-fil-A"). The **"Tunnel" backlit sign** at the intersection is the only system-wide wayfinding standard.

---

## 6. Combined-Complex Integration

The Houston tunnel system is the **urban leg of the combined-complex trilogy**. The three sites are:
- **Cheyenne Mountain** (military, secure, single-use, north of the valley, no direct connection to Houston).
- **SubTropolis** (suburban industrial, civilian commercial, south of the valley, connected to Houston via the public shaft).
- **Houston tunnel system** (urban pedestrian, downtown office, in the valley, the *primary* layer of the Houston site).

### 6.1 The above-ground city is the primary layer

The above-ground city is the **primary layer of the Houston site**. It is a representative downtown Houston (4:1 linear compression, 4 named anchor buildings, 8–10 generic towers, 2–3 parking garages, the named street grid, the named skywalk network). The Houston tunnel system is a *feature* of the city, at 20 ft depth. The city itself is the primary thing the player sees when they emerge from the tunnel or descend from the skywalk.

The SubTropolis public shaft and the Cheyenne Mountain service tunnel are **discrete additions** to the canonical Houston above-ground city. They do not disrupt the daily commute or the food courts. They are clearly marked as project fictions (`[X]`).

### 6.2 The SubTropolis public shaft (`[X]` project fiction)

The **public shaft from SubTropolis** lands at a small **"Combined Complex Transit Hub" plaza** at the **east edge of the above-ground city** (beyond Main Street, in a buffer block outside the four named quadrants).

- **Landing position:** x = −20 to −5, z = −45 to −65, at street level y = 64.
- **Plaza design:** a small open plaza with the public-shaft entrance (a glass-and-steel canopy, a stair down, a small "SubTropolis / Combined Complex Transit" sign, a turnstile, a security guard booth).
- **In-world signage:** "Combined Complex Transit Hub — SubTropolis Public Access. SubTropolis is a 270-million-year-old limestone mine north of the river; the public shaft connects downtown to the SubTropolis grid. Travel time: ~10 minutes by elevator." The fiction is clearly marked.
- **Cross-section:** **5 × 5 blocks** (matches the SubTropolis end per the SubTropolis discussion Topic 6).
- **Master plan tag:** `[X]` — project fiction, not in documented Houston tunnel history.

### 6.3 The Cheyenne Mountain service tunnel (`[X]` project fiction)

The **service tunnel from Cheyenne Mountain** runs **horizontally, single-lane, under the valley at 150+ ft depth, below the Houston tunnel system** (which is at 20 ft depth). The two are physically separate; the service tunnel does not pass through the Houston tunnels.

- **Houston-side terminus:** a small service sub-basement at the **north edge** of the city, separate from the tunnel system, with a security gate and a "Service Tunnel — Cheyenne Mountain Complex — Authorized Vehicles Only" sign.
- **Terminus position:** x = 30 to 50, y ≈ −86 (about 150 blocks below street level), z = −130 to −138.
- **Cross-section:** **6 × 5 blocks** (matches the Cheyenne Mountain end per the Cheyenne discussion).
- **Master plan tag:** `[X]` — project fiction.

### 6.4 Coordination with the combined-complex team

- The **SubTropolis public shaft cross-section is 5 × 5 blocks**. The Houston above-ground city is sized to receive it (one plaza at the east edge, ~15 × 20 m).
- The **Cheyenne Mountain service tunnel cross-section is 6 × 5 blocks**. The Houston terminus matches.
- The above-ground city uses Houston urban-design vocabulary (`[D]`) but is a fictional downtown (`[X]` for the specific layout). The combined-complex map should reflect: Houston is the *urban* leg of the trilogy, with the city as the primary layer and the tunnel system as a feature of the city.
- The **Houston tunnel system does *not* connect to the service tunnel or the public shaft.** It is a civilian workplace network with its own hours (weekday 6 a.m.–6 p.m.) and its own access rules (80+ building lobby access, 2 direct street-level entries). The combined-complex transit hub is a separate fiction layer that does not share access with the Houston tunnels.

### 6.5 The three pedestrian levels (binding)

The build is a **three-level pedestrian city**:
- **Street level (y = 64):** the primary public space, one-way grid, parking, sidewalks, the surface entries.
- **Skybridge level (y = 68):** the second-story private-building connector network, glass-enclosed, climate-controlled.
- **Tunnel level (y = 58–62):** the private-building basement network, climate-controlled, fluorescent, public.

The three levels are the **parallel pedestrian life** of the Houston CBD. The player can walk the streets, walk the tunnels, or walk the skywalks, and each is a complete pedestrian experience.

---

## 7. Site Coordinates (the Master Coordinate Table)

### 7.1 World origin and compass

- **World origin:** (0, 64, 0)
- **Description:** Wells Fargo Plaza street entrance, at the SE corner of the build, on the south face of the Wells Fargo tower, on the sidewalk of Louisiana Street, at street level. T-marker plaque is at (0, 64, 0).
- **Compass:** north = −z, east = +x, up = +y.
- **Street level:** y = 64.
- **Tunnel floor:** y = 58 (6 blocks below street level, 1:1 vertical).
- **Tunnel ceiling (corridor):** y = 61 (3-block clear height, 10 ft).
- **Tunnel ceiling (food court):** y = 62 (4-block clear height, 13 ft).
- **Underside of street (mechanical space):** y = 63.
- **Skybridge level:** y = 68.
- **Generic tower cornice:** y = 80–84 (15–20 stories).
- **Named anchor tower tops:** y = 80 (Esperson) to y = 88 (Wells Fargo, JPMorgan, 1001 Fannin).

### 7.2 Build extent

- **Above-ground city (6 × 6 = 36 compressed blocks):** x = 0 to 138, z = 0 to −138.
- **Tunnel sample (4 × 6 = 24 compressed blocks):** x = 0 to 92, z = 0 to −138.
- **Compressed block size:** 20 m × 20 m, with 3 m streets between (23 m per block unit).
- **Total build footprint (above-ground):** 138 m × 138 m = ~19,000 blocks².
- **Total tunnel footprint:** 92 m × 138 m = ~12,700 blocks².

### 7.3 Street grid positions (centerlines)

| N–S street | x centerline | E–W street | z centerline |
|---|---|---|---|
| **Main** (eastmost) | x = 1.5 | **Lamar** (southmost) | z = −20.5 |
| Fannin | x = 21.5 | Dallas | z = −43.5 |
| Travis | x = 44.5 | McKinney | z = −66.5 |
| Louisiana | x = 67.5 | **Rusk** (northmost) | z = −89.5 |
| Walker | x = 90.5 | | |
| **Capitol** (westmost) | x = 113.5 | | |

### 7.4 Compressed block centers (4 × 6 tunnel grid)

| | Col 1 (Main–Fannin) | Col 2 (Fannin–Travis) | Col 3 (Travis–Louisiana) | Col 4 (Louisiana–Walker) |
|---|---|---|---|---|
| **Row 1** (south of Lamar) | (11.5, ?, −9.5) | (33, ?, −9.5) | (56, ?, −9.5) | (79, ?, −9.5) |
| **Row 2** (Lamar–Dallas) | (11.5, ?, −32) | (33, ?, −32) | (56, ?, −32) | (79, ?, −32) |
| **Row 3** (Dallas–McKinney) | (11.5, ?, −55) | (33, ?, −55) | (56, ?, −55) | (79, ?, −55) |
| **Row 4** (McKinney–Rusk) | (11.5, ?, −78) | (33, ?, −78) | (56, ?, −78) | (79, ?, −78) |
| **Row 5** (north of Rusk) | (11.5, ?, −101) | (33, ?, −101) | (56, ?, −101) | (79, ?, −101) |
| **Row 6** (far north) | (11.5, ?, −124) | (33, ?, −124) | (56, ?, −124) | (79, ?, −124) |

### 7.5 Build-block identifiers (Cameron 2015 grid mapping)

The build uses the Cameron 2015 grid labels (A-15 through P-29) as **build-block identifiers**. The 24 tunnel sample blocks map as follows:

| Build block | Cameron label | Compressed center (x, z) | Notes |
|---|---|---|---|
| (Col 1, Row 1) | **A-15** | (11.5, −9.5) | SE corner, near Wells Fargo entry |
| (Col 1, Row 2) | **A-17** | (11.5, −32) | S side, east |
| (Col 1, Row 3) | **A-19** | (11.5, −55) | E side, mid |
| (Col 1, Row 4) | **A-21** | (11.5, −78) | E side, McKinney Place food court |
| (Col 1, Row 5) | **A-23** | (11.5, −101) | E side, far N |
| (Col 1, Row 6) | **A-25** | (11.5, −124) | E side, extreme N (Harris County edge) |
| (Col 2, Row 1) | **B-16** | (33, −9.5) | 1001 Fannin food court |
| (Col 2, Row 2) | **B-18** | (33, −32) | S side, center |
| (Col 2, Row 3) | **B-20** | (33, −55) | Center, mid |
| (Col 2, Row 4) | **B-22** | (33, −78) | Center, N |
| (Col 2, Row 5) | **B-24** | (33, −101) | N side, center |
| (Col 2, Row 6) | **B-26** | (33, −124) | JPMorgan Chase Tower area |
| (Col 3, Row 1) | **C-17** | (56, −9.5) | SW corner |
| (Col 3, Row 2) | **C-19** | (56, −32) | S side, west |
| (Col 3, Row 3) | **C-21** | (56, −55) | **Esperson food court** |
| (Col 3, Row 4) | **C-23** | (56, −78) | W side, mid |
| (Col 3, Row 5) | **C-25** | (56, −101) | N side, west |
| (Col 3, Row 6) | **C-27** | (56, −124) | W side, extreme N |
| (Col 4, Row 1) | **D-18** | (79, −9.5) | SW corner |
| (Col 4, Row 2) | **D-20** | (79, −32) | W side, S |
| (Col 4, Row 3) | **D-22** | (79, −55) | **Pennzoil Place food court** |
| (Col 4, Row 4) | **D-24** | (79, −78) | W side, mid |
| (Col 4, Row 5) | **D-26** | (79, −101) | N side, far W |
| (Col 4, Row 6) | **D-28** | (79, −124) | W side, extreme N (Theater District stub) |

### 7.6 Key locations (the master coordinate list)

| Location | Position (x, y, z) | Description |
|---|---|---|
| **World origin (Wells Fargo Plaza street entrance)** | (0, 64, 0) | T-marker plaque on the sidewalk |
| **Wells Fargo Plaza tower center** | (10, 76, −10) | 24 stories (y = 64 to 88) |
| **Wells Fargo street entrance (revolving door)** | (10, 64, 0) | Glass revolving door on south face |
| **Wells Fargo floodgate (tunnel-level)** | (10, 58, 0) | Iron door at tunnel-level entry |
| **Wells Fargo 1930s dual-origin plaque** | (10, 65, −3) | Lobby wall, on the way down |
| **Wells Fargo 95+/6mi/200K panel** | (10, 65, −3) | Lobby wall, near the descent |
| **Wells Fargo "200,000 daily users" main sign** | (10, 67, 0) | Above the entrance, large |
| **McKinney Garage tower center** | (10, 70, −82.5) | 4–6 stories, parking garage (y = 64 to 76) |
| **McKinney Garage direct access (street)** | (10, 64, −90) | North face, on Rusk Street sidewalk |
| **McKinney Place food court (under garage)** | (10, 58, −82.5) | Tier 1 food court, parking-garage archetype |
| **McKinney Garage T-marker plaque** | (10, 64, −90) | Small, blue, "T" inside circle |
| **1001 Fannin tower center** | (33, 76, −10) | 24 stories (y = 64 to 88) |
| **1001 Fannin / Lamar Tunnel food court** | (33, 58, −10) | Tier 1 food court, modern refresh |
| **Esperson tower center** | (56, 72, −55) | 16 stories (y = 64 to 80), Art Deco |
| **Esperson food court (808 Travis)** | (56, 58, −55) | Tier 1 food court, archetype |
| **Esperson Sandra Lord plaque** | (56, 60, −55) | On a wall in the food court |
| **Pennzoil Place tower center (one of two)** | (79, 74, −55) | 20 stories (y = 64 to 84), mirrored trapezoids |
| **Pennzoil Place underground food court** | (79, 58, −55) | Tier 1 food court, densest |
| **Pennzoil Gerald D. Hines 27-building marker** | (79, 60, −55) | On a wall in the food court |
| **JPMorgan Chase Tower center** | (33, 76, −110) | 24 stories (y = 64 to 88) |
| **JPMorgan Chase basement / 1950s minimal corridor** | (33, 58, −110) | Bare concrete walls, older fluorescent |
| **1956 system-idea plaque** | (33, 60, −110) | Wall plaque in the 1950s corridor |
| **SubTropolis public shaft landing plaza** | (−12.5, 64, −55) | Beyond Main St, "Combined Complex Transit Hub" |
| **SubTropolis public shaft shaft opening** | (−12.5, 64 to 58, −55) | 5×5 cross-section, glass-and-steel canopy |
| **Cheyenne Mountain service tunnel terminus** | (40, −86, −134) | 150+ ft below grade, 6×5 cross-section |
| **"Tunnel" backlit band sign — first** | (11.5, 61, −32) | At the first intersection south of Wells Fargo |
| **72 °F climate control sign** | (33, 60, −32) | One corridor, small sign |
| **Theater District stub corridor** | (79, 58, −124) | "Tonight: Performance 7:30 PM" sign |
| **Harris County edge sign** | (50, 64, −138) | At the build's north edge |
| **St. Joseph skywalks edge sign** | (130, 64, −50) | At the build's south-east edge |
| **After-hours shutdown scene** | (56, 58, −101) | NW area, dimmed lights, cleaning cart |

### 7.7 Skybridge connections (4, one per quadrant)

| Skybridge | Street crossed | Span (x range or z range) | y level | Connects |
|---|---|---|---|---|
| **McKinney Street skybridge** | McKinney (E–W) | x = 0 to 23 | y = 68 | McKinney Garage (S) to generic tower (N) |
| **Travis Street skybridge** | Travis (N–S) | z = 0 to −110 | y = 68 | 1001 Fannin (E) to JPMorgan Chase (W) |
| **Louisiana Street skybridge** | Louisiana (N–S) | z = −45 to −65 | y = 68 | Esperson (E) to Pennzoil (W) — most famous |
| **Walker Street skybridge** | Walker (N–S) | z = −45 to −65 | y = 68 | Esperson (E) to generic tower (W) |

### 7.8 Combined-complex connection points

| Connection | From (Houston side) | To (other build) | Cross-section | Master plan tag |
|---|---|---|---|---|
| **SubTropolis public shaft** | (−12.5, 64, −55) | SubTropolis grid | **5 × 5 blocks** | `[X]` project fiction |
| **Cheyenne Mountain service tunnel** | (40, −86, −134) | Cheyenne Mountain | **6 × 5 blocks** | `[X]` project fiction |

---

## 8. Materials & Block Palette (Site-Level)

The site-level palette is **narrow and specific** — the Houston tunnel is not a place for material variety. The palette is a *site-level* commitment; the Architectural Designer refines it building-by-building.

### 8.1 Above-ground city

| Element | Block | Notes |
|---|---|---|
| Office tower walls | Stone bricks, white concrete, gray wool | Glass-and-steel vocabulary |
| Office tower windows | Glass panes (light blue stained glass) | Strip windows in 2-block-tall panels |
| Office tower roofs | Slabs, dark oak accents | Flat roof, mechanical penthouse |
| Surface streets | Stone bricks (or cobblestone) | 1-block-wide road, 1-block-wide sidewalks on each side |
| Sidewalks | Stone slabs | 1-block-wide |
| Streetlights | Glowstone on fences (or lanterns) | Every 10 blocks |
| Palm trees | Oak or dark oak logs with jungle leaves | On plazas, sidewalks, parking lots |
| Parking lots | Stone pressure plates or smooth stone | Surface parking vocabulary |
| Parking meters | Item frames on fences | Occasional, on sidewalks |
| Fire hydrants | Cauldrons or iron pressure plates | At corners |
| Plaza surfaces | Smooth stone slabs | At the 4 named anchor buildings |

### 8.2 Tunnel layer

| Element | Block | Notes |
|---|---|---|
| Tunnel walls (standard) | White concrete or quartz | Off-white painted concrete-block |
| Tunnel walls (older 1950s) | Smooth stone slab (light gray) | Bare concrete, no paint |
| Tunnel walls (modern refresh) | Black or dark-gray concrete | Polished look |
| Dropped ceiling (standard) | White wool or white carpet | Acoustic-tile proxy, 1-block-thick |
| Dropped ceiling (modern) | Black wool or black carpet | Modern food courts |
| Ceiling lighting strips | Sea lanterns or glowstone | Fluorescent proxy, in ceiling at y = 61 |
| Tunnel floor (standard) | White wool (VCT proxy) | 1970s/1990s sections |
| Tunnel floor (older) | Polished andesite (terrazzo proxy) | 1950s/1970s sections |
| Tunnel floor (modern) | Dark-gray wool (porcelain proxy) | 2010s–2020s refresh |
| Underside of street | Stone or smooth stone slab | Mechanical space, visible in food courts |
| Tenant storefronts (frames) | Dark oak fences or stairs | Glass storefronts, brand-color banners above |
| Tenant storefronts (glass) | Glass panes | Frameless in modern refresh |
| Wayfinding band signs | Dark blue wool banner with white text | "Tunnel →" or "To [Building Name] →" |
| Building directory signs | Item frames on dark oak | In lobbies, "Tunnel → Basement" |
| T-marker plaques | Blue stained glass pressure plates | "T" sign on the sidewalk |
| Floodgate | Iron door | Vertical, slots into brackets at entry |

### 8.3 Tenant zone branding (representative colors)

| Tenant type | Brand color proxy | Block |
|---|---|---|
| Chick-fil-A | Red | Red wool, red banner |
| Potbelly | Orange | Orange wool |
| Salata | Red | Red wool |
| Treebeards | Brown-and-green | Brown + green wool |
| Blackwater Coffee | Black | Black wool |
| Subway-style accent | Yellow-green | Yellow wool |
| Sparkle Dry Cleaners | Blue | Blue wool |
| Barbershop | Red, white, blue stripe | Striped banner |
| Starbucks | Green | Green wool |
| Vacant / For Lease | Light gray | Gray banner, "For Lease" text |

### 8.4 Atmospheric blocks

| Effect | Block | Notes |
|---|---|---|
| HVAC hum (sound) | Note block, far away | Constant low hum in tunnel |
| Water-stained ceiling tiles | Stained white wool (or stairs with random orientation) | A few tiles in older segments |
| Cave ambient (in tunnel) | (achieved by enclosure, no light from above) | The "muffled underground" feel |
| 6 a.m.–6 p.m. light cycle | Redstone lamp with daylight detector | Tunnel lights on during "business hours," dimmed after |

### 8.5 Wayfinding and signage

| Sign | Block | Notes |
|---|---|---|
| "Tunnel" backlit band | Dark blue wool banner + white text on item frame | At every intersection |
| "Tunnel → [Food Court]" | Same, with arrow | Directional |
| "Tunnel → Basement" (lobby) | Item frame on dark oak | In each building's lobby directory |
| "200,000 daily users" | Large banner, white text on red | Above the Wells Fargo entrance |
| "95+ blocks / 6 mi / 20 ft" | Banner, three lines | At the Wells Fargo lobby |
| "T-marker" | Blue stained glass + dark oak sign | On the sidewalk at both public entries |
| 1930s dual-origin plaque | Item frame on dark oak, multiple lines | At the Wells Fargo entry |
| Sandra Lord plaque | Item frame on dark oak, in the Esperson food court | |
| Gerald D. Hines 27-building marker | Item frame on dark oak, in the Pennzoil food court | |
| 72 °F climate sign | Small item frame on dark oak | One corridor |
| "Tonight: Performance 7:30 PM" | Item frame in the Theater District stub | |
| "Harris County Tunnel — 10 blocks north — not connected" | Sign at the build's north edge | Faded reference |
| "St. Joseph Skywalks — 6 blocks southeast — not connected" | Sign at the build's SE edge | Faded reference |
| "Vacant / For Lease" | Gray banner with light-gray text | Several bays in each food court |
| "Tunnel Closed 6:00 PM" | Sign at the after-hours shutdown scene | |
| "1st Shift 06:00 / 2nd Shift 14:00 / 3rd Shift 22:00" | Sign on a building-engineering door | Back-of-house, atmospheric |

---

## 9. Scale Verification

This section explicitly verifies the build is buildable at the chosen compression.

### 9.1 City block count

- **Real system:** 95+ blocks, 80+ access points, 6 mi of corridor.
- **Build:** 4 × 6 = 24 compressed blocks, 4 quadrant anchors, 2 public entries, ~150 m of corridor in the sample.
- **Compression:** 1:4 by block count (24 / 96 = 25%). The "+" in "95+ blocks" is honored by signage; the player understands they are seeing a sample.

### 9.2 Total tunnel length

- **Real system:** 6 mi = 9.7 km ≈ 9,700 m of corridor.
- **Build:** roughly 24 compressed blocks × 23 m/block × 1 corridor per block = ~550 m of corridor (each compressed block has 1 corridor segment of ~23 m). Add the food court nodes (4 nodes × 23 m = 92 m) and the food-court-adjacent corridors. Total ~700–900 m of tunnel.
- **Compression:** 1:11 by tunnel length. This is *more* compressed than the 1:4 block compression because the build has more food-court nodes and fewer connector corridors. The result is still walkable (under 2 minutes corner-to-corner at 4.3 blocks/sec).

### 9.3 Above-ground city

- **Real Houston CBD:** ~80 m × 80 m blocks × 95 blocks ≈ 600,000 m² of city.
- **Build:** 138 m × 138 m ≈ 19,000 m² of city at 4:1 linear compression. 6 named anchor buildings (4 of which are required, 2 are additional), 8–10 generic towers, 2–3 parking garages.
- **Compression:** 1:32 by city area. The above-ground is compressed more aggressively than the tunnel (which is at 1:1 corridor and 1:1 vertical) because the *experience* of the above-ground is the texture, not the literal footprint. The player sees a *Houston-vocabulary* downtown, not a literal replica.

### 9.4 Player time and experience

- **Wells Fargo entry to McKinney Place food court (Q1 → Q2):** ~80 m direct, plus 6–8 short ramps, signage, and building-lobby transitions. With the deliberate interruptions, ~2 minutes of walking.
- **Wells Fargo to Esperson food court (Q1 → Q3):** ~70 m direct, plus 4–5 transitions. ~1.5 minutes.
- **Wells Fargo to farthest point (JPMorgan Chase, NW corner):** ~140 m direct, plus 8–10 transitions. ~3 minutes.
- **Build corner-to-corner:** ~140 m diagonal. ~30 seconds direct, ~2–3 minutes with the building-lobby and corridor transitions.
- **Effective player time from Wells Fargo to farthest food court (McKinney):** 2–3 minutes, matching the binding decision D1 target.

### 9.5 Render distance

- **Total build footprint:** 138 m × 138 m = 138 × 138 blocks².
- **Total build height:** from tunnel floor (y = 58) to JPMorgan Chase top (y = 88) = 30 blocks.
- **Minecraft default render distance:** 12 chunks = 192 blocks.
- **Verdict:** the entire build fits within a single render distance. The player never sees the edge of the build unless they deliberately fly up. The named anchor buildings and the 4 food courts are all visible from any one quadrant.

### 9.6 Build complexity (rough block count estimate)

- **Above-ground city:** 4 named anchor towers × ~2,000 blocks each = 8,000; 8 generic towers × ~1,000 = 8,000; 4 named secondary buildings × ~1,000 = 4,000; skybridges × 4 × ~200 = 800; streets and sidewalks ~3,000; surface features ~2,000. **Total: ~26,000 blocks above ground.**
- **Tunnel sample:** 24 compressed blocks × ~3,000 corridor blocks per block = 72,000 corridor blocks; 4 food court nodes × ~5,000 = 20,000; signage and easter eggs ~3,000. **Total: ~95,000 blocks underground.**
- **Combined total:** ~120,000 blocks. This is buildable in vanilla Minecraft by a small team over a few days of focused work, or by a single large team in a single day.

### 9.7 What's not built (the cuts)

The following are *referenced* but not built (per binding decisions D2, D5, and D6):
- **The other 71+ blocks of the real system:** not built. A schematic map (banner or painting) on a wall in the build shows the full 95-block cobweb with the player's location highlighted.
- **The Harris County tunnel as a full build:** one faded-reference sign at the build's edge.
- **The St. Joseph skywalks as a full build:** one faded-reference sign at the build's edge.
- **The full multi-tenant directory:** 10–12 representative tenants (Chick-fil-A, Potbelly, Salata, Treebeards, Otto's, Maggie Rita's, Blackwater Coffee, Brown Bag Deli, Sparkle Dry Cleaners, Randie's Barbershop, Shipleys, Kolache Factory) and the rest are "Vacant / For Lease."
- **A separate "lunch rush" build:** the food courts *are* the lunch rush. Render the food court at peak.
- **A flooded corridor scene:** the floodgate is enough; the Allison marker is the reference.
- **The Esperson / Mellie Esperson tower exteriors in full architectural detail:** the food court is the must-have; the tower exteriors are above-ground flavor.

---

## 10. Open Questions for the Architectural Designer / User

The site plan is complete at the macro level. The following are **site-level** questions that the Architectural Designer or the user should answer before detailed design begins.

### 10.1 Open questions for the Architectural Designer

1. **The 1950s minimal corridor:** the discussion places this in the JPMorgan Chase basement, but the actual JPMorgan Chase lobby design is not in the public record. The Architectural Designer should decide: (a) replicate the documented 1950s "bare concrete, older fluorescent, no drop ceiling" look exactly, or (b) use the 1950s look as a *faded* version in 1–2 corridor segments, not a full section.
2. **The Theater District stub:** the discussion places this in the western edge of the build, around col 4, row 6 (79, 58, −124). The Architectural Designer should decide: (a) a full stub corridor with a sign, or (b) a small darkened section with the "Tonight: Performance 7:30 PM" sign only.
3. **The 12 named tenant interiors:** the discussion picks 10–12 representative tenants. The Architectural Designer should pick the final 10–12 (the master list is in the visual-assets.md Appendix A and the research-report §6.1) and decide which food court each anchors in.
4. **The skybridge interior details:** the skybridges are `1-block-wide, 2-block-tall interior` at 1:1 compression (so 1 m × 2 m, which is very narrow at full scale). The Architectural Designer may want to widen the skybridge interior to 2 blocks wide for player navigation comfort, even though this is not 1:1.
5. **The after-hours shutdown scene:** the discussion places this in one quadrant. The Architectural Designer should decide which quadrant and how to render the dimmed lighting (redstone lamps with daylight detector, or just dark blocks).

### 10.2 Open questions for the user

1. **Build size confirmation:** the binding decisions specify a 4×6 tunnel sample and 6×6 above-ground. The user should confirm this is the right size for the project, or specify a different size.
2. **World origin:** the binding decision is "Origin point: Wells Fargo Plaza street-level entrance." The user should confirm that the Wells Fargo street entrance is the right narrative origin, or specify a different one.
3. **The above-ground city is fictional:** the binding decision is that the above-ground city is a Houston-vocabulary downtown, not a literal replica. The user should confirm this is acceptable.
4. **The SubTropolis public shaft location:** the binding decision places the public shaft at the east edge of the city (beyond Main Street). The user should confirm this is the right location, or specify a different one.
5. **The build-block identifiers:** the master plan uses Cameron 2015 grid labels (A-15 through P-29) as build-block IDs. The user should confirm this is the right identifier system, or specify a different one.

### 10.3 Conflicts with the binding decisions

No conflicts were found. The site plan is consistent with all 7 binding decisions (D1 through D7) and all `[D]` / `[I]` / `[X]` tags.

One minor note: the binding decision D1 says "at least 5 of the 6 documented named segments are represented in the sample." The site plan represents all 6. This is consistent with "at least 5" — the plan exceeds the minimum.

---

*End of site plan. This document is site-level design only. Detailed building design, block-by-block interior layout, and the AI Contractor Writer's build instructions are downstream tasks.*
