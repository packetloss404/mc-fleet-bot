# SubTropolis — Architectural Design Plan

> **Architectural Designer deliverable for SubTropolis Minecraft replica build.**
> Companion to `01-research/research-report.md`, `03-discussion/culture-architecture-analysis.md`, and `03-discussion/discussion-notes.md`.
> This document is the **building-by-building, room-by-room design spec**. It assumes the Site Planner's `site-plan.md` and `site-coordinates.json` will provide the ravine-wall placement, portal coordinates, and inter-site connection points.
> **Legend (mandatory per Topic 4 of the deliberation):**
> - `[D]` = Documented in the research report (cite section).
> - `[I]` = Inferred from industry standard for the tenant type.
> - `[X]` = Project fiction or designer invention (describe rationale).

---

## 1. Design Philosophy

**The soul, restated.** SubTropolis is the **industrial cathedral of utility**: a 270-million-year-old limestone deposit, hollowed out by 1940s miners, leased by Lamar Hunt's family in 1964, and now leased out as climate-controlled square footage to the United States Postal Service, the National Archives, a data-center operator, and fifty-odd other tenants. The place is not a tourist attraction, not a bunker, not a villain's lair, and not a server farm. It is a *working industrial city that happens to be inside a hill*, and the entire emotional payload comes from the collision between those two facts. The build's job is to deliver **utilitarian awe** — the strange, slightly disorienting wonder of realizing that a fluorescent-lit, painted-concrete, dock-doored, forklift-busy city is hiding in plain sight under a field in the middle of America, and that the boringness *is* the point. **[D]** research §1, §2.1, §6.1–6.6.

**The column grid is the inverse of Cheyenne Mountain's blast doors.** Cheyenne's signature is what was *put in* to protect — human-made, defensive, additive. SubTropolis's signature is what was *left* after the rock was *taken out* — geologic, structural, subtractive. The 8×8 white-painted pillars on 65-block centers are the *permanent architecture*: the 1964 construction company is gone, Ford's 25-acre vehicle lease is gone, Pillsbury and Russell Stover have moved in and out. The pillars remain. In 2080 the same pillars will hold up the ceiling while a different set of tenants moves in. The architecture says: *this building cannot fall down*. The 18,000–24,000 psi compressive strength of the Bethany Falls limestone is roughly six times structural concrete. The pillar grid is the answer to the industrial question ("what if the ceiling falls?") in the same way Cheyenne's blast doors are the answer to the military question ("what if they attack?"). **[D]** research §3.2, §4; culture-architecture §3.2.

**The operations manager's perspective.** The daily rhythm of SubTropolis is not the rhythm of a cathedral or a fortress. It is the rhythm of a *working logistics facility*: a security guard waving a truck driver through at 06:00, a forklift squeaking on a polished floor at 07:30, dock doors thudding open at 08:00, the soft hum of HVAC over a 12-hour shift, the fluorescent lights never changing, a shift change at 14:00, the cafeteria coffee getting refilled at 14:15, the dim amber lights over the records archive staying on all night because the climate never changes, the security golf cart rolling past at 22:00, the Ghost-mine side chamber staying dark and cold because the mining crew is somewhere else today. *That* is the build's heartbeat. The visitor should feel it without being told.

---

## 2. Master Material Palette (Minecraft Blocks)

The SubTropolis interior reads as **painted-limestone warehouse, not fantasy cave**. The palette is deliberately muted, beige, and 1970s-industrial. Every block choice should reinforce the *boring* substrate the tenants work on top of.

### 2.1 Primary palette — the rock shell

| Material | Real-world reference | Minecraft blocks | Notes |
|---|---|---|---|
| **Bethany Falls limestone (excavated ceiling and walls)** | Pale honey-amber to light grey, with visible horizontal strata and darker veining where shale content is higher **[D]** research §3.2, §9 | **70% smooth stone**, **15% calcite**, **10% diorite**, **5% tuff**, with **occasional deepslate veins** (1–2 block patches every 20–30 blocks along a corridor) | Layer the strata as horizontal bands — at least 2–3 alternating smooth stone / calcite bands visible in any given wall section. The "rough-hewn" texture comes from irregular block boundaries, moss patches, and the occasional raw cave block. **[I]** |
| **Painted pillars (white/light grey)** | White or off-white painted concrete over limestone **[D]** research §4.2, §9 | **White concrete** (primary), **light grey concrete** (secondary), **smooth quartz** (caps and bases), **quartz pillars** for the iconic intersections | Pillars are *8×8 blocks, full-height, painted*. Use white concrete as the dominant face block, with a 1-block band of light grey at top and bottom to suggest paint wear. The iconic-intersection pillars can be upgraded to **smooth quartz block** for visual emphasis. **[D]** |
| **Polished concrete floor (newer corridors)** | Polished concrete with painted lane lines **[D]** research §4.2, §9 | **Polished andesite** (primary floor), **polished deepslate** (very rare, only in the data center), with **yellow concrete** or **yellow wool** for lane lines, **white concrete** for crosswalks, **light grey concrete** for parking-bay markings | The main avenue and tenant corridors use polished andesite. Older or unfinished zones drop to plain stone or gravel. **[D]** research §10.5 |
| **Older/unpainted corridors** | Rough limestone floor, occasionally gravel **[D]** research §4.2 | **Stone**, **cobblestone**, **gravel** | Use in the historical 1964–1970s sections and in the "still being mined" corridors near the ghost-mine chamber. **[I]** |
| **Industrial metal grating (occasional)** | Ventilation grilles, mezzanine floors **[D]** research §4.4 | **Iron bars** (in ceiling sections for "ventilation"), **iron trapdoors** (for mezzanine edges), **heavy weighted pressure plates** (for catwalk / mezzanine flooring), **chain** (for railings) | Sparingly. Most of the ceiling is painted rock, not grating. **[I]** |

### 2.2 Painted utility lines (the four-color industrial code)

Per the deliberation and the cultural-architecture analysis, the exposed utility lines are part of the visual character. **[D]** research §4.4; culture-architecture §3.4.

| Service | Real color convention | Minecraft block | Where it runs |
|---|---|---|---|
| **Fire suppression** | Red | **Red concrete** (1-block wide strip on the wall) | Runs along walls at ~3-block height, throughout the developed corridors |
| **Potable water** | Blue | **Blue concrete** | Same height, same corridors |
| **Communications / fiber** | Yellow | **Yellow concrete** | Same height, same corridors |
| **Data / low-voltage** | Green | **Green concrete** | Same height, same corridors |

Each color is a 1-block-wide horizontal stripe at a consistent height (3 blocks up from the floor), running the length of the main avenue and the developed side corridors. They cross intersections as straight lines, not curves. The four colors together form a *visible industrial skeleton* on the otherwise plain painted walls.

### 2.3 Lighting blocks

Per culture-architecture §6.4: "the visual goal is industrial overhead lighting, not atmospheric lighting." **[D]**

| Zone | Block | Density | Mood |
|---|---|---|---|
| **Main avenue** | **Sea lantern** | Every 4–5 blocks along the ceiling, in continuous strips | Bright, even, fluorescent. No shadows in the main avenue. |
| **Tenant corridors** | **Glowstone** (in ceiling) | Every 6 blocks | Slightly cooler than the main avenue; tenant-specific dimming optional |
| **Data center** | **Shroomlight** behind black-stained-glass panes + **redstone lamp** (off) on rack fronts | Redstone lamps blink on/off via redstone; shroomlight provides the cool blue underglow | Cool blue and red-green status light flicker; very dim ambient |
| **Climate-controlled vaults (NARA, film)** | **End rod** (horizontal, under shelves) | One per shelf run, plus a single **lantern** at the door | Dim, warm amber, archival safelight feel |
| **Ghost mine** | **None** (or a single **soul lantern** at the barricade) | One light source per chamber, at the entrance only | Dark, atmospheric, raw rock |
| **Surface / entrance portal** | Full daylight (sky) at the surface; transition zone uses alternating **sea lantern** and daylight | The portal mouth itself: one **lantern** over the gate | Daylight at the top, fluorescent at the bottom |

### 2.4 Dark accents

Used sparingly, only in zones that should feel *sealed* or *off-limits*.

| Material | Where | Why |
|---|---|---|
| **Black concrete** | Data center floors; UV&S vault door frame | Sealed, modern, slightly ominous (but not villain-ominous) |
| **Obsidian** | Data center rack front faces; biometric entry threshold | The "this is a serious facility" signal. Used as a 1-block-wide stripe on rack faces, not as large surfaces. |
| **Deepslate** | Ghost-mine chamber walls; some limestone veins | The active-mining zones. Deepslate reads as "fresh-cut rock" and visually distinguishes the unfinished zones from the painted developed zones. **[D]** research §10.5 |

### 2.5 Secondary palette — tenant branding

Each marquee tenant gets a small, restrained corporate color accent, used on signs, dock-door livery, and a few floor-marking blocks. These accents should be *small* — one block here, one sign there — not large saturated surfaces. SubTropolis is *1970s industrial beige*, not *Tron*. **[D]** culture-architecture §6.2.

| Tenant | Branded accent blocks | Where |
|---|---|---|
| **Hunt Midwest / SubTropolis** | **Red concrete** (corporate red), **white concrete**, **black concrete** | Entrance marquee, leasing office signage, the "World's Largest Underground Business Complex®" sign |
| **USPS** | **Blue concrete** (Postal blue), **red concrete**, **white concrete** | Dock doors, stamp-counter interior, commemorative-stamp display case |
| **NARA** | **Tan concrete** (archive tan), **brown concrete**, **white concrete** | NARA-branded door, archive shelving, the "Federal Records — Authorized Personnel Only" sign |
| **EPA** | **Blue concrete** (EPA blue), **green concrete**, **white concrete** | EPA Region 7 office door, emergency-response signage |
| **SubTropolis Technology Center (STC)** | **Black concrete**, **light blue concrete** (data center accent), **redstone lamp** (status light) | STC entrance, biometric hand-reader pedestal, dark-fiber conduit |
| **W.W. Grainger** | **Orange concrete** (Grainger orange), **white concrete**, **gray concrete** | Dock doors, pallet-rack signage |
| **Hallmark** | **Gold concrete** (Hallmark gold), **red concrete** | Hallmark ribbon-packing area signage |
| **Russell Stover** | **Brown concrete** (chocolate brown), **gold concrete** | Russell Stover storage zone signage |
| **Underground Vaults & Storage (UV&S)** | **Black concrete** (vault door), **gray concrete** | UV&S vault door, "Authorized Personnel Only" signage |
| **Lamar Hunt / KC Chiefs** | **Red concrete** (Chiefs red), **gold/yellow concrete** (Chiefs gold) | Hunt Hall mounted arrowhead, the single Chiefs-color accent |

The branded accents are *crumbs*, not walls. A visitor who walks past the USPS dock should see a *USPS-blue dock door* and a *USPS-blue-and-red signage block*, not an entire USPS-blue wall.

---

## 3. The Approach (Above-Ground)

The surface is *deliberately underwhelming* — that is the paradox and the design feature. The largest underground business complex in the world presents to the world above as a small modern building set into a tree-covered ravine wall, with a paved access road, a security gate, and a parking lot. The world above is unaware. **[D]** research §5; culture-architecture §3.5.

### 3.1 The main entrance (south ravine wall)

- **Surface building**: a small one- or two-story modern office (Hunt Midwest leasing office / visitor center), **8×10×6 blocks** (W×L×H), set against the ravine wall. The facade is **white concrete** with **light gray concrete** accents and a **dark oak** door frame. A **slate** or **stone brick** foundation. A single mounted "Hunt Midwest Real Estate Development" sign on the facade.
- **The marquee sign**: the "World's Largest Underground Business Complex®" sign, built as a **6×2 block sign above the portal mouth**, in **red concrete** (Hunt Midwest red) and **white concrete** (text), with a small ® mark. Visible from the parking lot.
- **The tenant directory board**: a **5×4 block sign board** to the right of the entrance, listing "55+ Tenants" — a list of marquee tenants (USPS, NARA, EPA, LightEdge, Grainger, Hallmark, Russell Stover, UV&S) in a small grid. **[D]** discussion Topic 5.
- **Security gate**: a 2-block-wide opening with a **white concrete** security booth (3×3×3 blocks) on the right side, an **iron fence** across the opening, and a "STOP — Check In" sign. A security guard **villager** in Hunt Midwest red can be placed behind the booth.
- **Parking lot**: **6 rows × 8 cars**, using **gray concrete** for the lot surface, **white concrete** for parking-bay lines, and a single light pole (4-block **fence post** with a **lantern** on top) per row. A few parked **minecarts** in random spots (the "vehicles"). Per the deliberation, this is a *stub*, not a full 1,600-space lot. **[D]** research §5.3, §10.4.
- **Surface finish**: **grass blocks** and **dirt** between the parking rows, **oak leaves** in the trees framing the entrance, **poppies** or **azure bluets** for the KC-area wildflower feel. The visitor is *outside*; the build is still a normal surface environment.

### 3.2 The exit portal (second portal, on a different face of the ravine)

Per the deliberation Topic 1, the second portal is on a *perpendicular* face of the ravine, so the main avenue can run the long axis of the available ravine wall and the second portal can land on a perpendicular face, enabling the iconic drive-through geometry. **[D]** discussion Topic 1, Topic 6.

- **Surface treatment**: a much smaller surface presence than the main entrance — just a paved road coming *out* of the ravine wall, with a single "EXIT" sign, a security kiosk, and a "YOU ARE LEAVING SUBTROPOLIS — DRIVE SAFELY" sign. No parking lot. **[I]**
- **The "drive out" moment**: a player who has driven all the way through should see daylight gradually growing on the wall ahead, then a single **large** archway of daylight framed by the ravine wall. The transition should be a *relief*, not a dramatic reveal.

### 3.3 The "almost-invisible" entrance paradox

The architecture says: **the largest underground business complex in the world is, from the surface, almost nothing.** The build should not add a monument, a sign tower, a visitor museum, or a flag plaza. The Hunt Midwest leasing office is small. The parking lot is small. The road descends. The view is across the ravine. The roller-coaster silhouette of Worlds of Fun is barely visible on a neighboring hill (one **dark oak fence post** with a single **white banner** as a faded reference, per Topic 2 of the deliberation). **[D]** culture-architecture §3.5; discussion Topic 2.

---

## 4. The Entrance Ramp

The entrance ramp is the **single most important visitor moment**. A 1970s industrial experience, not a Bond villain's drawbridge. **[D]** culture-architecture §3.3, §7 (Stage 3).

### 4.1 Geometry

- **Length**: ~50 blocks (at ~5% grade, a 50-block descent clears the 2.5-block ceiling drop, but the actual descent is into a 50-block-deep ravine floor where the SubTropolis grid sits at Y=0). The ramp length is set by the ravine geometry, not by the build; the design team should plan the *visual* of the ramp to be a ~50-block descent with a *gentle* grade (≤ 5%) so semi-trucks can use it. **[D]** research §5.1.
- **Width**: **8 blocks** of drivable road (a two-lane road, minecart-width compatible for the player), with **2-block shoulders** of stone-brick on each side. A semi-truck can use 8 blocks comfortably.
- **Ceiling**: lowers from open sky to the rock ceiling gradually over the first 20 blocks of the descent, then closes fully.
- **Wall treatment**: rough **smooth stone** + **calcite** (the limestone blend) for the first 20 blocks, transitioning to **white concrete** for the interior finish over the last 30 blocks. The transition is the "you are now in the painted corridor" moment.

### 4.2 Floor

- **Surface**: **polished andesite** (the polished concrete equivalent) for the main ramp surface, with **yellow concrete** painted lane lines down the center (a 1-block-wide stripe), and **white concrete** edge lines on each side.
- **Painted markings**: a "STOP" bar (white concrete) at the bottom of the ramp where the player exits into the main avenue, a 15-mph speed-limit marking stenciled on the road (using a small sign block, not painted on the road itself, because Minecraft painting is hard at scale), and a single white crosswalk leading to the first pillar.

### 4.3 Lighting (the canonical transition)

- **First 20 blocks of the ramp**: full daylight, with the surface light gradually dimming as the ceiling lowers. The player is still in the "outside" world.
- **Middle 20 blocks**: a transition zone. **Sea lanterns** appear on the ceiling at ~6-block spacing, alternating with the remaining daylight. The sky is no longer visible. The light feels *cooler* than the surface.
- **Bottom 10 blocks**: pure fluorescent. **Sea lanterns** every 4 blocks. The air feels *cooler*. The player is now in the interior. **[D]** culture-architecture §6.4, §7 (Stage 3).

### 4.4 Signage at the portal mouth

- A "**SPEED LIMIT 15**" sign on a **fence post** (1-block post, 2-block sign) on the right side of the ramp, ~5 blocks inside the portal. **[D]** research §4.3, §5.3.
- A "**NO TRUCK IDLING**" sign on the left, 10 blocks in. **[D]** research §4.3.
- A "**NO AM/FM RECEPTION**" sign 15 blocks in, with a small wall-mounted utility box representing the "above-ground AM/FM relay antenna." **[D]** discussion Topic 5.
- A "**WELCOME TO SUBTROPOLIS**" sign on the nearest pillar at the bottom of the ramp (when the player reaches the grid floor).
- A second "**SPEED LIMIT 15**" sign at the bottom of the ramp, facing the player entering the grid.

### 4.5 The "air getting cooler" effect

In vanilla Minecraft this is conveyed through:
- The **light** transition (described above).
- The **sound** transition (vanilla cave ambient begins to dominate as the ceiling closes).
- A small **note block** or **jukebox** at the bottom of the ramp playing an "industrial hum" — *optional* and only if the resource pack supports it. **[X]** A simple fallback is to place a single **note block** with a low-pitched note, repeated.
- **Particle** effects: a single **snow layer** or **powder snow** block on the wall, lightly placed, suggesting the cooler air. *Optional*, *very* subtle. **[X]**

---

## 5. The Main Chamber Grid (the Signature)

The pillar grid is the **single most iconic image of SubTropolis**. Every photograph, every video, every report describes the pillars first. The repetition *is* the impression. **[D]** culture-architecture §3.2, §4 (#2); research §4.1.

### 5.1 The 200×200 floor plan

- **Footprint**: a **200×200 block** area of developed corridor, oriented so the main avenue runs the long axis of the ravine wall. Per the deliberation, the corners are *not* dead rock — they house tenant zones, side spurs, or back-of-house chambers. **[D]** discussion Topic 1.
- **5-block ceiling**: every developed corridor is 5 blocks high (16 ft at 1:1). The ceiling is **painted white concrete** in the developed corridors, with a 1-block band of exposed rough stone (smooth stone + calcite) at the very top to suggest the original excavation. **[D]** discussion Topic 1; research §4.2.
- **Floor**: **polished andesite** (newer corridors) or **stone** (older corridors) — the visual mix gives the place the *1960s industrial warehouse* feel rather than a 2020s hyperscale data center. Per culture-architecture §6.2, the main avenue uses the polished andesite. **[D]**
- **Pillar grid**: **8×8 blocks, full-height, on 65-block centers** at the iconic intersections. Between intersections, the pillar-to-pillar spacing can be relaxed to **30–40 blocks** to support the tenant fit-out walls without breaking the visual (per research §10.2 — 1:1 pillar grid at iconic intersections, relaxed elsewhere).

### 5.2 The 350-block main avenue (Hushpuckney)

- **Length**: **350 blocks** along the long axis of the footprint.
- **Width**: **12 blocks** (a "real" 40-ft corridor compressed to in-scale; per the deliberation the corridor width is 12 blocks at 1:1). **[D]** discussion Topic 1; research §4.1.
- **Surface**: **polished andesite** with **yellow concrete** painted center line (1-block wide) and **white concrete** edge lines on each side. The "lane" is 5 blocks wide, with 1-block shoulders on each side. **[D]** research §4.3, §5.3.
- **Ceiling**: 5 blocks of **white concrete** with 1-block of exposed **smooth stone** at the top, plus **sea lanterns** every 4–5 blocks in continuous strips. **[D]** research §10.5.
- **Pillars along the avenue**: 8×8 white concrete at the iconic intersections (1 per intersection). The other "pillar" positions along the avenue can be reduced to **4×4** lighter white concrete markers (or **quartz pillars** at the iconic intersections) — the visual impression of a pillar every X blocks is preserved without the full 8×8 every time.

### 5.3 Painted pillar numbers

- **Every pillar at an iconic intersection** has a **black concrete** number painted on it at human-readable height (3 blocks up from the floor). The numbering scheme is **block-number + cross-street abbreviation** — e.g., "911.10" / "911.11" / "911.12" — to match the real SubTropolis's "each pillar is individually numbered by a scheme tied to the block / cross-street." **[D]** research §4.3; culture-architecture §3.4.
- **Implementation**: 2-block-tall **black concrete** numbers built directly into the pillar face. Use **oak signs** as a fallback for readability (signs are more visible in Minecraft but read as "signs" rather than "painted numbers"). The default is *painted numbers on the pillar*; signs are a fallback if the painter can't get the numbers legible.
- **At least 12 visible numbered pillars** on the main avenue, per the deliberation's spec line. **[D]** discussion Topic 2 (#4 in §4 must-haves).

### 5.4 Geology-themed street signs at intersections

- **Hushpuckney Avenue**: the canonical main avenue, with **green concrete** (the standard US road-sign green) street-name signs at every intersection. **Hushpuckney** is documented; the rest are **[X]** invented companions.
- **Invented companions** (per the deliberation's Open Question 1, all `[X]`):
  - **Bethany Falls Boulevard** — the host formation, runs perpendicular to Hushpuckney at the entrance intersection. **[X]**
  - **Iola Lane** — Iola is a real Kansas City-area limestone / cement town north of KC. Runs parallel to Hushpuckney. **[X]**
  - **Muncie Drive** — Muncie is a real Bethany Falls member sub-unit. Runs the back side of the grid. **[X]**
  - **Galesburg Way** — also a Bethany Falls member. **Winterset Crossing** — also a Bethany Falls member. **[X]**
- **Sign style**: standard **green concrete** with **white concrete** lettering (built as a 1×3 block sign post, ~3 blocks tall, on a **fence post** or **iron bar** stem). One sign per direction at every intersection. **[I]**
- **Stop signs**: 2-block **red concrete** octagons (approximated as a square in Minecraft) on **fence post** stems at the four corners of every intersection. **[D]** research §5.3.

### 5.5 15 mph speed limit signs

- **SPEED LIMIT 15** signs at every portal entrance and at every major intersection. Built as a **white concrete** rectangular sign (2×2 blocks) with **black concrete** lettering on a **fence post** or **iron bar** stem. **[D]** research §4.3, §5.3, §6.6; discussion Topic 2.
- The signs are part of the visual rhythm of the corridor: a player walking the main avenue will pass a stop sign, a street sign, a speed-limit sign, a painted pillar number, a tenant entrance, and then the same sequence again 30–40 blocks later.

### 5.6 The "scale" — the visitor's vantage point

The grid is built so that *a player standing at one end of the main avenue can see pillars and ceiling lights fading into haze at the other end*. The build should preserve at least **one long sightline** of 200+ blocks along Hushpuckney. This requires:

- **No full-height obstructions** in the first 50 blocks of the avenue from either portal.
- **Tenant entrances** along the avenue are *recessed* (set back 2–3 blocks from the main avenue wall) so the visual corridor is preserved.
- The **iconic first intersection** (where the player enters from the ramp) is the *vantage point*: a 3×3 or 4×4 grid of full-height 8×8 pillars visible from the bottom of the ramp, with Hushpuckney running one way and Bethany Falls running the other. **The first 30 blocks of Hushpuckney from the entrance intersection must be unobstructed.** **[D]** culture-architecture §7 (Stage 4).

---

## 6. The Tenant Zones (≥6 distinct fit-outs)

The deliberation locked in four fit-out **archetypes** and required at least six *visibly distinct* tenant fit-outs along the main avenue, with at least one dock-door scene. **[D]** discussion Topic 2, Topic 4. The standard of invention is: each invented interior must match a documented tenant's actual business activity and be "operationally plausible." **[D]** discussion Topic 4.

### 6.1 The four fit-out archetypes

Per the deliberation, all tenant interiors map to one of four archetypes:

1. **Records archive** (NARA, UV&S, generic document storage): high-bay shelving, dim amber lighting, narrow aisles, climate-controlled signage.
2. **Package logistics** (USPS Stamp Distribution, fulfillment centers, generic e-commerce): conveyor systems, dock doors, package sorting, semi-trailer access.
3. **Data center** (STC, LightEdge, generic server rooms): sealed chamber, server racks, red/green status lights, cool blue underglow, biometric entry.
4. **General industrial** (Hallmark, Russell Stover, Pillsbury, Grainger, generic warehousing): pallet racks, forklifts, painted parking-bay floor markings, white-box office partitions.

### 6.2 The mandatory tenant fit-outs (≥6 distinct)

#### Fit-out 1 — USPS National Requisition Center (PACKAGE LOGISTICS archetype)

- **Real size**: 217,114 sq ft (Stamp Distribution) + 311,600 sq ft (Stamp Fulfillment). **[D]** research §6.1.
- **Build size**: ~10×20 blocks of internal space with a 5-bay dock door scene on the main avenue side. **[I]**
- **Dock doors**: 5 numbered **dark oak doors** (1×2 blocks each) labeled S1–S5 with **yellow concrete** numbers above. A **rail** runs in front of the doors. A single **minecart with chest** (representing a backed-in semi-trailer) sits at one of the bays. **[D]** research §4.4, huntmidwest-dock-doors.jpg reference.
- **Yard**: the dock yard is a 5×20 block strip of **polished andesite** with **yellow concrete** lane markings, **yellow concrete** bollards (1-block posts) protecting the pillars, and a single **white banner** reading "USPS NATIONAL REQUISITION CENTER" hung between two pillars. **[D]** research §6.1.
- **Interior**: a wide warehouse with **white concrete** walls, a **polished andesite** floor with yellow striping, **polished deepslate** conveyor segments running the length of the warehouse, **barrels** and **chests** stacked in rows, a small **white box office** with a "Stamp Distribution" door and a small **glass pane** window. A "**2001 ANTHRAX SCARE**" memorial plaque on a wall, with a small framed **paper** block as the news clipping. **[D]** culture-architecture §2.4, §4 (#6).
- **Branding**: a 4×2 block sign on the dock side reading "**USPS — National Requisition Center**" in **blue concrete** (Postal blue) on **white concrete**. **[D]**
- **Tag**: `[D]` for tenant identity, dock doors, branding, and the 2001 plaque. `[I]` for the conveyor layout and the specific package inventory.

#### Fit-out 2 — NARA Federal Records Center (RECORDS ARCHIVE archetype)

- **Real size**: 102,000 sq ft initial lease, options to 372,000 sq ft. **[D]** research §6.1.
- **Build size**: ~15×20 blocks. **[I]**
- **Door**: a single **dark oak door** with a NARA-branded plaque (a 2×2 block sign reading "**NARA — FEDERAL RECORDS CENTER**" in **tan concrete** on **white concrete**). A small **glass pane** window in the door. **[D]**
- **Interior lighting**: dim, warm amber, archival-safelight feel. **End rods** placed horizontally under each shelf run. A single **lantern** at the door. **No sea lanterns, no glowstone.** **[I]**
- **High-bay shelving**: rows of **bookshelves** (or **barrels** as the archive boxes) running floor-to-ceiling (5 blocks tall — the full ceiling height). Aisle width: 1 block. The shelving should look like a *wall of boxes*. The Operations Manager question in the deliberation (whether to use a 30-ft tall shelving configuration) is answered: **yes, ceiling-to-floor shelving is the defining visual of an archive.** **[D]** discussion Topic 5 Open Question 6.
- **Aisle markers**: small **oak signs** at each aisle reading "A1", "A2", "A3" etc. The "Aisle B-17, Box 1,492, File 2003-NR-00291" level of detail is *not* required; "**A1**" is enough. **[I]**
- **Floor**: **polished andesite** with **white concrete** painted aisle lines.
- **Climate signage**: a single wall-mounted **oak sign** reading "**CLIMATE: 65°F / 35% RH — CONSTANT**" at the door. **[D]** discussion Topic 5.
- **Tag**: `[D]` for tenant identity, the 2012 lease, the climate framing. `[I]` for the specific aisle/box layout.

#### Fit-out 3 — SubTropolis Technology Center / Data Center (DATA CENTER archetype)

- **Real anchor**: LightEdge (2014); currently 1,600-rack campus. **[D]** research §6.3.
- **Build size**: ~12×15 blocks of internal server-hall space, plus a small **sealed entry chamber** with the biometric prop. **[I]**
- **Door**: a **black concrete** door frame (3 blocks tall, 2 blocks wide) with a **dark oak door** (1 block wide, 2 blocks tall, set inside the frame). A **glass pane** window in the door. Above the door, a 4×1 block sign reading "**SubTropolis Technology Center**" in **light blue concrete** on **black concrete**, with a "**STC**" logo. **[D]**
- **Biometric hand-reader prop**: a single **black concrete** pedestal (1×1×2 blocks) just outside the door, with an **iron trapdoor** on top representing the hand reader surface, and a single **redstone lamp** (off, but wired to a hidden redstone clock) that blinks red. A small **oak sign** below reading "**BIOMETRIC HAND READER — 24/7 ARMED SECURITY**". **[D]** discussion Topic 5.
- **Interior — the server hall**: rows of **black concrete** server-rack "cabinets" (1 block wide × 2 blocks tall × 1 block deep, with **obsidian** front faces, **redstone lamp** indicators set into the front faces, and **glass panes** showing the "interior" of each rack). The racks are arranged in 2 rows of 6, with a 1-block aisle between them (the hot-aisle/cold-aisle separation). A second aisle has **shroomlight** under the floor tiles (the cold-aisle underglow) — this is the "cool blue glow" the build needs. **[D]** research §6.3; culture-architecture §4 (#8).
- **Status lights**: the **redstone lamps** on the rack fronts are wired to a **redstone repeater** clock (behind a wall) that blinks them slowly on and off in a staggered pattern — the "server-rack hum" of the data center, translated into visual Minecraft. **[D]** discussion Topic 2.
- **Conduit detail**: a single **green concrete** strip (the data utility line, §2.2) running along the wall and labeled "**DARK FIBER — 1102 GRAND**" with a small **oak sign**. **[D]** discussion Topic 5.
- **Climate control vents**: a row of **iron bars** in the ceiling at one end of the hall, with a **shroomlight** behind each one — the "cold-air supply" vents. A small **oak sign** below reading "**COLD AISLE 65°F**". **[I]**
- **Floor**: **polished deepslate** (the only place in the build that uses this block) for the data center floor, with **light blue concrete** painted aisle lines. **[I]**
- **Tag**: `[D]` for tenant identity, biometric, dark fiber, ENERGY STAR 100. `[I]` for the specific rack layout and the redstone clock.

#### Fit-out 4 — W.W. Grainger (GENERAL INDUSTRIAL archetype, with dock doors)

- **Real anchor**: 2026 expansion, "largest known underground distribution center in the world." **[D]** research §6.3.
- **Build size**: ~15×20 blocks of warehouse with a 6-bay dock door scene. **[I]**
- **Dock doors**: 6 numbered **dark oak doors** labeled G1–G6 with **orange concrete** (Grainger orange) numbers above. A **rail** in front. A **minecart with chest** (the backed-in trailer) at one of the bays. **[D]**
- **Branding**: a 4×2 block sign reading "**W.W. GRAINGER — Industrial Distribution**" in **orange concrete** on **white concrete**. **[D]**
- **Interior**: standard warehouse, **white concrete** walls, **polished andesite** floor with **yellow concrete** lane markings, **white concrete** bollards. Pallet racks built from **fences** (the uprights) and **slabs** (the shelves) — a 2-block-wide × 4-block-tall racking system. A small **white box office** in one corner with a "Pick & Pack" door. **[I]**
- **Inventory**: a few **barrels**, **chests**, and **shulker boxes** (in the office) on the pallets, with **oak signs** labeling the categories ("HVAC FILTERS", "FASTENERS", "POWER TOOLS"). **[I]**
- **Tag**: `[D]` for tenant identity, Grainger orange, dock doors. `[I]` for the rack layout and inventory.

#### Fit-out 5 — EPA Region 7 Training & Logistics Center (GENERAL INDUSTRIAL / OFFICE archetype)

- **Real size**: 43,200 sq ft. **[D]** research §6.1.
- **Build size**: ~8×12 blocks. **[I]**
- **Door**: a **dark oak door** with a small **glass pane** window. Above the door, a 3×1 block sign reading "**EPA Region 7 — Training & Logistics Center**" in **blue concrete** (EPA blue) on **white concrete**. **[D]**
- **Interior**: a small office / training room with **white concrete** walls, **polished andesite** floor, **oak stairs** as the "bleacher seating" for the training room, a few **lecterns** (or **oak fences** as the desks) facing the seating. A wall map (a **white banner** with **light blue concrete** markings representing the EPA Region 7 map — Iowa, Kansas, Missouri, Nebraska). A single **emergency response** sign (an **oak sign** reading "**EMERGENCY RESPONSE — 24/7**"). **[I]**
- **Tag**: `[D]` for tenant identity. `[I]` for interior layout.

#### Fit-out 6 — Hallmark Cards / Russell Stover (GENERAL INDUSTRIAL archetype, consumer goods)

- **Real anchor**: Hallmark (ribbon / card distribution); Russell Stover (candy storage) — both early-1960s tenants. **[D]** research §2.1, §6.4.
- **Build size**: ~12×18 blocks combined, with a 4-bay shared dock door. **[I]**
- **Dock doors**: 4 numbered **dark oak doors** labeled H1–H4 with **gold concrete** (Hallmark gold) numbers. A **rail** in front. **[D]**
- **Branding**: a 4×2 block sign reading "**Hallmark / Russell Stover — Consumer Goods Distribution**" in **gold concrete** on **white concrete**. **[D]**
- **Interior — Hallmark section**: pallet racks with **white concrete** blocks (the ribbon / card stock) and **red concrete** accents (Hallmark red), a small packaging-line area with **polished andesite** conveyor segments, a few **barrels** and **chests** representing inventory. **[I]**
- **Interior — Russell Stover section**: a **brown concrete**-accented zone with **chests** and **barrels** of "chocolate inventory" (built as **brown concrete** blocks on pallets), a small "**KEEP COOL 65°F**" **oak sign** on the wall. **[I]**
- **Tag**: `[D]` for tenant identities, the early-1960s anchor history. `[I]` for the interior layout and inventory specifics.

#### Fit-out 7 — Underground Vaults & Storage (UV&S) (RECORDS ARCHIVE archetype, climate-controlled film vault)

- **Real anchor**: UV&S is the "distributor of last resort" for major studio film masters. **[D]** research §6.2.
- **Build size**: a *small* secured room, 6×8 blocks, with a single **iron door** (not a wooden door — it's a *vault*). **[I]**
- **Door**: an **iron door** with a "**UV&S — AUTHORIZED PERSONNEL ONLY**" **oak sign** above. **[D]** discussion Topic 5.
- **Interior**: three rows of metal shelving built from **iron bars** (the uprights) and **iron trapdoors** (the shelves), 3 blocks tall, with **barrels** and **chests** on the shelves. A single **lantern** at the door (only light source). The room is dim. **[I]**
- **The film can**: a single **barrel** on the middle shelf with a **paper** (or **oak sign**) label reading "**GONE WITH THE WIND — INTERPOSITIVE**" (the canonical UV&S easter egg). A second **barrel** with a similar label reading "**WIZARD OF OZ — MASTER**". **No posters, no display cases, no green-ray imagery.** Just two labeled cans. **[D]** discussion Topic 5.
- **Climate signage**: a single **oak sign** at the door reading "**CLIMATE-CONTROLLED FILM ARCHIVE — 38°F / 35% RH**". **[I]**
- **Tag**: `[D]` for tenant identity and the two film can labels. `[I]` for the room layout and the climate numbers.

#### Fit-out 8 — Ford / Grainger historical vehicle storage (GENERAL INDUSTRIAL archetype, with vehicles)

- **Real anchor**: Ford's 25-acre lease in the early 1970s; current Grainger vehicle-storage operations. **[D]** research §2.1; culture-architecture §4 (#9).
- **Build size**: ~10×15 blocks, with a row of 8+ "vehicles" parked in parking bays. **[I]**
- **Floor**: **polished andesite** with **white concrete** parking-bay lines and **yellow concrete** center lane. **[D]** huntmidwest-hero-main.jpg reference.
- **Vehicles**: 8+ parked **minecarts** (representing F-150s in the historical Ford lease) in two rows. The first row is "Ford-era" with the minecarts unmodified (silver/gray); the second row is "Grainger-era" with **orange concrete** markings on the parking-bay floor to suggest the Grainger branding. **[I]**
- **Signage**: a single 3×1 block sign reading "**VEHICLE STORAGE — NO DRIVING BEYOND THIS POINT**" in **white concrete** on **red concrete** at the entrance to the bay. **[D]** culture-architecture §4 (#9).
- **Historical plaque**: a small **oak sign** on the wall reading "**FORD MOTOR CO. — 25-ACRE VEHICLE LEASE, 1970s. CURRENTLY: W.W. GRAINGER, INDUSTRIAL DISTRIBUTION.**" **[D]** research §2.1.
- **Tag**: `[D]` for the Ford lease, the vehicle storage use case, the current Grainger operation. `[I]` for the minecart-as-vehicle translation.

### 6.3 The dark, unfinished "ghost mine" chamber (off the side spur)

Per the deliberation, this is a Tier-2 must-have. The chamber is at the end of one of the two ~100-block side spurs, deliberately unreachable (or deliberately risky to reach). **[D]** discussion Topic 2.

- **Approach**: a 100-block side spur (10 blocks wide, 5 blocks high) with **stone** floor (no polished andesite) and **stone** walls (no painted concrete). The lighting is *sparser* — **glowstone** every 10 blocks, dimmer than the main avenue. A few **cobwebs** hang from the ceiling. **[I]**
- **The barricade**: at block 90 of the spur, a 3-block-tall **oak fence** with **oak fence gates** spans the corridor. Above the fence, a 2×1 block sign reading "**DANGER — ACTIVE MINING — HUNT MIDWEST MINING, INC.**" in **red concrete** on **white concrete**. A second sign below: "**NO UNAUTHORIZED ENTRY BEYOND THIS POINT.**" **[D]** research §10.3; culture-architecture §4 (#12).
- **The chamber (behind the barricade)**: 20×20 blocks of **rough smooth stone** walls and ceiling, **stone** and **gravel** floor, **no lighting** except a single **soul lantern** at the barricade (visible from outside but not the chamber interior). A few **deepslate** blocks scattered in the walls (the active-mining "fresh-cut" feel). A single **minecart** (a real, rideable one) sitting on a short stretch of **rail** in the middle of the chamber, with a **rail** extending into the dark. **[I]**
- **The atmosphere**: vanilla cave ambient dominates. The player can hear the *cave* sounds through the gap in the barricade. The chamber is dark enough that the player needs a light source to see anything.
- **Tag**: `[D]` for the barricade, signage, the active-mining framing. `[I]` for the chamber interior details and the minecart prop.

### 6.4 Side-spur #2 — Hallmark / Russell Stover / Pillsbury historical corridor

The second ~100-block side spur can house the **historical tenants** (Pillsbury flour storage, Russell Stover candy, Hallmark cards) in a long row of small fit-outs, with a "1964–1990 historical tenants" interpretive sign at the spur entrance. Each historical tenant gets a **small** (5×5 block) representative space with a sign. **[I]**

The advantage of clustering historical tenants in one spur: a player walking the spur sees the *1960s anchor history* of SubTropolis compressed into one walk, and the modern tenants are reserved for the main avenue.

---

## 7. The Climate-Controlled Vault Zones

The constant 65–70 °F climate is the **single most-cited reason** SubTropolis works as a business location. The build must convey this through visual and atmospheric choices. **[D]** research §7; culture-architecture §6.4.

### 7.1 The "killer feature" visual cues

- **Visible climate control vents**: rows of **iron bars** in the ceiling (representing the supply-air diffusers) with a single **shroomlight** behind each, casting a *cool blue* downward glow. Use in the NARA fit-out, the UV&S fit-out, and any other climate-controlled zone. **[D]** research §4.2.
- **No-weather / no-sky**: the climate-controlled zones are deep enough into the build that *no sky* is visible. The chamber is fully sealed. **[D]** culture-architecture §3.4.
- **Constant-temperature signage**: a single **oak sign** at the door of every climate-controlled zone reading "**CLIMATE-CONTROLLED — 65°F ± 2° — 35% RH**". **[D]** discussion Topic 5.
- **The "no humidity, no weather" feel**: the floor is dry **polished andesite** (not moss-covered); the walls are painted white (not damp); the ceiling is painted white (not sweating). No water features, no moss, no vines. **[D]** culture-architecture §3.4.
- **The "permanent record" feel of NARA**: the archive boxes on high-bay shelving, the dim amber light, the narrow aisles. The visual says *this place exists to keep paper alive for 500 years*. **[D]** discussion Topic 5.

### 7.2 The records storage shelving (NARA, high-bay)

- **Height**: floor-to-ceiling, 5 blocks. The shelving is the defining visual. **[D]** discussion Topic 5 Open Question 6.
- **Width per unit**: 2 blocks wide, 1 block deep. The shelves themselves are **slabs** (smooth stone slabs or polished andesite slabs) at heights 0, 2, and 4.
- **Aisle width**: 1 block. The aisles are *narrow*. The player walks through a maze of shelves. **[I]**
- **Inventory**: **barrels** (archive boxes) stacked on the slabs. The labels on the barrels are not legible (use **oak signs** on a few representative barrels reading "**TAX RECORDS — 1995**", "**FEDERAL COURT DOCS — BOX 14,829**"). **[I]**

### 7.3 The film archive canisters (UV&S)

- **Shelving**: **iron bars** uprights, **iron trapdoors** shelves, 3 blocks tall. 3 rows of 4 shelves. **[I]**
- **Canisters**: **barrels** on the shelves, with a single **paper** or **oak sign** label per the two named films. The rest are unlabeled. **[D]** discussion Topic 5.
- **Light**: a single **lantern** at the door. Nothing else. The room is *dim*. **[I]**

---

## 8. The Data Center Hall

The SubTropolis Technology Center is the most modern and visually distinct element in the build. It is *the* "this place is also 2020s" moment. **[D]** research §6.3; culture-architecture §4 (#8).

### 8.1 Server racks

- **Rack unit**: 1 block wide × 2 blocks tall × 1 block deep.
- **Rack front face**: **obsidian** (1 block), with a single **redstone lamp** indicator set into the front face (a separate block above or beside the obsidian).
- **Rack sides**: **black concrete**.
- **Rack top**: **smooth stone slab** (the equipment "deck").
- **Racks are arranged**: 2 rows of 6 racks each, with a 1-block aisle between them (the hot-aisle/cold-aisle separation). A second 1-block aisle on the outside of each row gives access. **[D]** research §6.3.

### 8.2 Climate control

- **Cold-aisle underglow**: **shroomlight** under the floor tiles of the cold-aisle (the aisle between the two rack rows). The underglow is the "cool blue" the visitor sees. **[D]** culture-architecture §4 (#8).
- **Hot-aisle exhaust**: a row of **iron bars** in the ceiling above the hot-aisle, with **redstone lamp** (on) indicators — the "hot air being exhausted" feel. **[I]**
- **Vent labeled "COLD AISLE 65°F"**: a single **oak sign** on the wall of the cold aisle. **[I]**

### 8.3 The "hum" (translated to Minecraft)

- **Redstone clock**: a **redstone repeater** clock (4-repeater loop) hidden behind a wall, wired to the **redstone lamps** on the rack fronts. The lamps blink in a staggered pattern (not all at once). The "hum" of the data center becomes a visual flicker. **[D]** discussion Topic 2.
- **Ambient sound**: the **cave ambient** is acceptable in the data center; it is the *quietest* zone in the build (no truck traffic, no dock doors, no HVAC roar). **[I]**

### 8.4 The 24/7 operations feel

- **Biometric entry** (see §6.2 Fit-out 3) signals the 24/7 staffing.
- **Dark fiber conduit** (the green utility line, labeled) signals the always-on connectivity.
- **A single note block** with a low, sustained note, repeated via redstone, behind a wall — the data center hum. *Optional, advanced.* **[X]**

---

## 9. The Surface Plateau & Above-Ground

The surface is the **invisibility paradox**: 55 million sq ft of underground, with a single small surface building. The build should *not* add monument, sign tower, or visitor museum. **[D]** culture-architecture §3.5; discussion Topic 2.

### 9.1 The flat plateau above the mine

- **Size**: 80×60 blocks of plateau, mostly **grass blocks** with **dirt** underneath, framed by **oak trees** and **birch trees**. **[I]**
- **Surface building**: the Hunt Midwest leasing office / visitor center (see §3.1). A small 8×10×6 block building with a **white concrete** facade, **light gray concrete** accents, and a **slate** foundation. A **dark oak** door with a **glass pane** window. **[D]** research §5.2.
- **Marquee sign**: the "**World's Largest Underground Business Complex®**" sign over the portal mouth. 6×2 blocks, **red concrete** background, **white concrete** text. **[D]** research §5.2, §6.1; discussion Topic 5.
- **Parking lot**: 6 rows × 8 cars of **gray concrete** with **white concrete** parking-bay lines. A few parked **minecarts** in random spots. **[D]** research §5.3, §10.4.
- **Tenant directory board**: 5×4 blocks of **dark oak fence** + **oak signs** listing the marquee tenants. **[D]** discussion Topic 5.
- **Surface trees**: 6–8 **oak trees** and **birch trees** framing the entrance, plus a few **poppies** and **azure bluets** as KC-area wildflower feel. **[I]**
- **Lamar Hunt / KC Chiefs reference**: a small **oak sign** on a post near the parking lot reading "**LAMAR HUNT — FOUNDER — 1964**" with a single mounted **red concrete** + **gold concrete** arrowhead (the Chiefs logo abstracted to a red/gold geometric). **[D]** discussion Topic 5; research §2.1.

### 9.2 The Hunt Hall (round room, on the main avenue at the central plaza)

- **Location**: a small **round room** (~15 blocks diameter) off the main avenue at the central plaza (the intersection of Hushpuckney and Bethany Falls). **[D]** discussion Topic 5.
- **Walls**: a circular wall of **white concrete** with **light gray concrete** trim. A single **dark oak door** entrance.
- **Inside**: a **polished andesite** floor with a circular **quartz** medallion in the center (a 3-block-diameter circle). On the medallion, a single **item frame** with a **paper** or **map** representing the Lamar Hunt portrait. On the wall, a single mounted **red concrete** + **gold concrete** arrowhead (the Chiefs arrowhead). A small **oak sign** on the wall reading "**HUNT HALL — IN HONOR OF LAMAR HUNT (1932–2006), FOUNDER OF SUBTROPOLIS**". **[D]** discussion Topic 5.
- **Tag**: `[D]` for the Lamar Hunt framing and the Chiefs arrowhead. `[I]` for the round room geometry.

### 9.3 The faded Worlds of Fun silhouette

Per the deliberation, the amusement parks above the mine are a *faded reference* (single nod, not a full build). A single **dark oak fence post** (15 blocks tall) with a **white banner** on top, visible from the ravine rim, represents the Worlds of Fun marquee. **No coaster tracks, no Ferris wheel.** The visitor sees a single white rectangle on a hilltop in the distance and knows what it represents. **[D]** discussion Topic 2 cuts; research §10.4.

---

## 10. The Inter-Site Connections

The service tunnel and public shaft are **project fictions** for the combined-complex project (SubTropolis ↔ Cheyenne Mountain via service tunnel; SubTropolis ↔ city on the valley floor via public shaft). They must be marked `[X]` and clearly signed in-world. **[D]** discussion Topic 6.

### 10.1 Service tunnel to Cheyenne (sub-basement)

- **Cross-section**: ~6 blocks wide × 5 blocks high, single-lane, minecart-compatible. **[D]** discussion Topic 6.
- **Path**: horizontal, running the length of the ravine bottom from a Cheyenne Mountain maintenance sub-basement to a SubTropolis service sub-basement. The SubTropolis end of the path is *below* the main grid. **[D]**
- **SubTropolis terminus**: a small service sub-basement **10 blocks below the main grid floor**, accessed from the main grid by a downward corridor (8 blocks wide, 5 blocks high, ~30 blocks long, with a 1-block-per-5-blocks descending step). A **dark oak door** with an "**AUTHORIZED VEHICLES ONLY**" sign marks the entrance from the main grid. **[D]** discussion Topic 6.
- **The sub-basement**: ~20×20 blocks, with a 1-block-wide **rail loop** (a service-vehicle turnaround), a single **minecart** (the parked service vehicle), a "**SERVICE TUNNEL — COMBINED COMPLEX MAINTENANCE**" **oak sign** on the wall, a small **maintenance bay** with a **crafting table** and a few **chests** (the maintenance supplies). **[I]**
- **Security gate**: a **dark oak fence** with **oak fence gates** at the entrance from the sub-basement into the main grid, with a "**SECURITY CHECKPOINT — AUTHORIZED PERSONNEL ONLY**" **oak sign** above. **[D]** discussion Topic 6.
- **Tag**: `[X]` — Project fiction. The real SubTropolis has no service tunnel to a sister facility. **[D]**

### 10.2 Public shaft to city (Public Access Lobby)

- **Cross-section**: ~5×5 blocks, vertical. **[D]** discussion Topic 6.
- **Path**: vertical, running from a "**Public Access Lobby**" at the SubTropolis grid edge up through the ravine wall to a surface lobby on the valley floor. **[D]**
- **Public Access Lobby** (on the main grid, at a less-developed edge): ~12×12 blocks, with a **dark oak door** entrance (visible from the main avenue), a "**PUBLIC TRANSIT — COMBINED COMPLEX**" **oak sign** above the door, a **security guard booth** (a 3×3×3 block **white concrete** structure with a **dark oak** door and a single **lantern** inside) at the entrance, a **turnstile** prop (built as a 1-block-wide **oak fence** with **oak fence gates** that the player can pass through), and a vertical **shaft** (a 5×5 opening in the ceiling) with a visible **ladder** (a column of **ladders** going straight up) and a chain of **lanterns** at 5-block intervals lighting the shaft. **[D]** discussion Topic 6.
- **The vertical shaft**: the 5×5 opening should be *visible* from the lobby. The player should see a *long vertical line* of ladders going up. This is the geometry of "there is a city up there and this is how you get to it." **[D]**
- **Surface lobby (valley floor)**: a small surface structure (8×8×4 blocks, **white concrete** with **light gray concrete** trim) at the top of the shaft, with a **dark oak door** entrance, an "**ELEVATOR / SHAFT TO SUBTROPOLIS — TICKETED VISITORS ONLY**" **oak sign**, and a single **villager** (the ticket agent) inside. **[D]** discussion Topic 6.
- **Security framing**: the lobby is *clearly a checkpoint*. The player sees a guard booth, a turnstile, and a "TICKETED VISITORS ONLY" sign. This is not a free-pass entrance. **[D]** discussion Topic 6.
- **Tag**: `[X]` — Project fiction. The real SubTropolis has no public shaft, no elevator, and is accessed by a private drive. **[D]**

### 10.3 Coordination with combined-complex team

- The service tunnel **runs below the main SubTropolis grid** (sub-basement) so it does not disrupt the 16-ft ceiling / 5-block height of the canonical corridors. **[D]** discussion Topic 6.
- The public shaft **lands at a lobby on the edge of the grid** (not at Hunt Hall, not at the central plaza) so the canonical composition of the main avenue is preserved. **[D]** discussion Topic 6.
- Both terminus points are clearly tagged `[X]` in the SubTropolis master plan and the combined-complex report. **[D]**

---

## 11. The Main-Path Plaque (the 1964 False Alarm Equivalent)

SubTropolis does not have a 1980 false alarm equivalent (that's Cheyenne's signature). SubTropolis's main-path historical plaque is a single dignified wall piece on the main avenue, in the central plaza. **[D]** culture-architecture §2.4; research §10.3, §11.

### 11.1 The "SubTropolis — Est. 1964" plaque

- **Location**: on the main avenue at the central plaza, mounted on a pillar at the intersection of Hushpuckney and Bethany Falls. **[I]**
- **Form**: a 4×3 block sign on the pillar face, in **white concrete** (background) with **black concrete** (text) and a thin **red concrete** border.
- **Text** (build as a series of **oak signs** on a 2×3 sign board):
  - **"SUBTROPOLIS"** (large, 1×1 block, **red concrete** on **white concrete**)
  - **"Established 1964"** (medium, 1×1 block, **black concrete** on **white concrete**)
  - **"Hunt Midwest Real Estate Development"** (small, 1×1 block, **black concrete** on **white concrete**)
  - **"55,000,000 sq ft of mined void • 14,000,000 sq ft developed"** (small, 1×1 block, **black concrete** on **white concrete**)
  - **"55+ tenants • 2,500+ employees"** (small, 1×1 block, **black concrete** on **white concrete**)
  - **"The world's largest underground business complex®"** (small, 1×1 block, **red concrete** on **white concrete**, with the ® mark)
- **Tag**: `[D]` for the founding year, the Hunt Midwest attribution, the 55M/14M numbers, the 55+ tenant count, and the trademarked slogan. `[I]` for the visual form.

### 11.2 The interpretive wall (in the Hunt Midwest visitor center / leasing office)

A separate, longer interpretive wall in the leasing office, covering:
- The 270-million-year-old Bethany Falls limestone (with a single **smooth stone** sample mounted on the wall, labeled "**Bethany Falls Limestone — 270 Ma**"). **[D]**
- The 16-ft ceiling, 8×8 pillars, 65-ft pillar centers (a small **scale model** in **white concrete** and **calcite** showing the cross-section). **[D]**
- The 68°F constant temperature, the 50–70% energy savings. **[D]**
- The "ENERGY STAR 100 — 2012–" framed certificate on the wall. **[D]** discussion Topic 5.

---

## 12. Easter Eggs (Off-Path)

All easter eggs are clearly labeled as cultural references. **Zero** Indiana Jones / Batcave / Bond contamination. **[D]** discussion Topic 5.

### 12.1 Prominent easter eggs (on the main path)

- **USPS Stamp Distribution / Fulfillment Center** (Fit-out 1, §6.2): labeled, with a visible dock door scene. Most-documented marquee tenant. **[D]**
- **NARA Federal Records Center** (Fit-out 2, §6.2): labeled, with a visible high-bay records shelving interior. **[D]**
- **SubTropolis Technology Center** (Fit-out 3, §6.2): labeled, with biometric entry, red/green status lights, dark fiber conduit. **[D]**
- **EPA Region 7 Training & Logistics Center** (Fit-out 5, §6.2): labeled, with emergency-response signage. **[D]**
- **"World's Largest Underground Business Complex®"** at the entrance marquee. **[D]**

### 12.2 Subtle / "faded reference" easter eggs (off-path, single nod)

- **Underground Vaults & Storage (UV&S) film archive** (Fit-out 7, §6.2): a single secured room, with three rows of metal shelving, a few unlabeled film canisters, and a single small label reading "**GONE WITH THE WIND — INTERPOSITIVE**" and a second "**WIZARD OF OZ — MASTER**". **No movie posters, no display cases.** The label is the easter egg. **[D]**
- **Hunt Hall** (round room, §9.2): a Lamar Hunt interpretive plaque and a single mounted Chiefs arrowhead. No Chiefs helmet, no football imagery, no stadium references. The Hunt family's documented role is the content; the Chiefs is one bullet point, not the theme. **[D]**
- **Foreign-Trade Zone (FTZ) sign**: a single **oak sign** in the leasing office: "**Designated U.S. Foreign-Trade Zone — Largest Under One Roof.**" **[D]**
- **ENERGY STAR 100 framed certificate**: on the interpretive wall in the leasing office. **[D]**
- **Shift-change signage**: a set of three **oak signs** at one of the major intersections: "**FIRST SHIFT — 06:00**" / "**SECOND SHIFT — 14:00**" / "**THIRD SHIFT — 22:00**". **[D]** discussion Topic 5.
- **Employee cafeteria**: a small break room off the main avenue, ~8×8 blocks, with **oak stairs** (the bleacher-style seating), **oak fences** (the lunch tables), a few **cauldrons** (the coffee stations), a **crafting table** (the food-prep counter), and a **jukebox** (the "SubTropolis Radio" — silent, because no AM/FM reception). **[I]**
- **2001 USPS anthrax scare memorial plaque**: a small framed **paper** on the wall in the USPS fit-out, reading "**2001 — USPS Anthrax Precautionary Testing — SubTropolis Shelter-in-Place**". **[D]** research §2.3.
- **Groundhog Run banner**: a single **white banner** hung between two pillars in one corridor, reading "**Annual Groundhog Run — 10K Underground — 1st Saturday in February**". **[D]** culture-architecture §2.4.

### 12.3 Out (zero build, no reference)

Per the deliberation, the following are *excluded*:

- Indiana Jones, Batcave, Bond villain, secret lair, or any "hidden treasure" imagery. **[D]**
- Torch-lit corridors, fake idols, ancient traps, hidden chambers with rewards. **[D]**
- Wizards, dragons, magic, mob spawners, or any fantasy contamination. **[D]**
- Movie posters for *Wizard of Oz* or *Gone With the Wind*. The film cans alone are the reference; the films themselves are not promoted. **[D]**
- Anything that requires the player to know a specific pop-culture reference to appreciate the build. **[D]**

---

## 13. Lighting Plan (By Zone)

The lighting plan is the single biggest atmospheric lever in the build. The rule is: **bright industrial fluorescent in the developed zones, dim or dark in the unfinished zones, dramatic at the portal mouth.** **[D]** culture-architecture §6.4; research §10.5.

| Zone | Block | Density | Mood |
|---|---|---|---|
| **Above-ground (surface)** | Sky daylight (no fixtures) | Full daylight, sun-up | Normal surface environment |
| **Entrance ramp (top 20 blocks)** | Sky daylight gradually diminishing | Daylight | Visitor is still in the "outside" world |
| **Entrance ramp (middle 20 blocks)** | Alternating daylight and **sea lantern** | Transition | The visitor is becoming "inside" |
| **Entrance ramp (bottom 10 blocks)** | **Sea lantern** every 4 blocks | Fluorescent | The visitor is now inside |
| **Main chamber grid (developed corridors)** | **Sea lantern** every 4–5 blocks along the ceiling, in continuous strips | Bright, even fluorescent | Industrial overhead; no shadows in the main avenue |
| **Tenant corridors (general industrial)** | **Glowstone** every 6 blocks | Bright, slightly cooler than the main avenue | Tenant-specific, but consistent |
| **USPS dock** | **Sea lantern** every 5 blocks; a single **lantern** over each dock door | Bright fluorescent, focused at the dock doors | Working loading-dock feel |
| **NARA archive** | **End rod** (horizontal, under each shelf run); one **lantern** at the door | Dim, warm amber | Archival safelight; the "permanent record" feel |
| **STC / data center** | **Shroomlight** under cold-aisle floor + **redstone lamp** (blinking) on rack fronts | Cool blue underglow + red/green status flicker | The "24/7 server hum" of the data center |
| **UV&S film vault** | One **lantern** at the door only | Dim | The vault is *deliberately* dim; the safelight feel |
| **Hallmark / Russell Stover / Grainger** | **Glowstone** every 6 blocks | Bright | Standard industrial warehouse |
| **EPA office** | **Glowstone** every 6 blocks; one **lantern** on the desk | Bright, slightly warm | Government office feel |
| **Hunt Hall** | A single **lantern** on the wall behind the Lamar Hunt plaque | Dim, warm, dignified | The memorial room; not bright, not dark |
| **Ghost mine chamber (behind barricade)** | One **soul lantern** at the barricade only | Dark | Vanilla cave ambient dominates; raw rock |
| **Service sub-basement (tunnel to Cheyenne)** | **Lantern** every 8 blocks | Dim, functional | Service-tunnel feel; not a main path |
| **Public shaft (vertical)** | **Lantern** every 5 blocks going up | Dim, vertical | The shaft is a long vertical line of light |
| **Surface plateau (parking lot, visitor center)** | One **lantern** on a **fence post** per parking row | Outdoor streetlight | Normal surface environment |
| **Surface exit portal** | Daylight gradually growing | Daylight | The "drive out" relief |

**Avoid**: any use of Minecraft's "moody cave lighting" (low ambient, scattered torches, lava pools) in the developed corridors. That is the *anti-SubTropolis* aesthetic. SubTropolis is *bright*. **[D]** culture-architecture §6.4.

---

## 14. The 4 Fit-Out Archetypes — Cross-Reference

Per the deliberation, all tenant fit-outs map to one of four archetypes. **[D]** discussion Topic 4.

| Archetype | Visual cues | Tenants |
|---|---|---|
| **Records archive** | High-bay shelving, dim amber lighting, narrow aisles, climate-control signage | NARA, UV&S, generic document storage |
| **Package logistics** | Conveyor systems, dock doors, package sorting, semi-trailer access, yellow lane markings | USPS, generic e-commerce fulfillment |
| **Data center** | Sealed chamber, server racks, red/green status lights, cool blue underglow, biometric entry | STC / LightEdge, generic server rooms |
| **General industrial** | Pallet racks, forklifts, painted parking-bay floor markings, white-box office partitions | Hallmark, Russell Stover, Pillsbury, Grainger, EPA, Ford vehicle storage |

The Ford/Grainger vehicle storage is a *variant* of general industrial with vehicles in the racks. The EPA office is a *variant* of general industrial with training-room furniture. The general-industrial archetype is the *most flexible*; the other three are more visually constrained.

---

## 15. Open Items for the Architectural Designer

The deliberation flagged six open questions. The following are the designer's resolutions:

1. **Geology-themed street name companions**: **[X]** Hushpuckney (canonical, `[D]`), Bethany Falls, Iola, Muncie, Galesburg, Winterset. The other four are real Bethany Falls member / KC-area geologic terms, used as documented-as-invented. See §5.4.
2. **Surface plateau composition**: a single small surface building, a 6×8 parking lot stub, a Hunt Midwest marquee sign, a Lamar Hunt / KC Chiefs plaque, a single Worlds of Fun silhouette in the distance. See §3.1, §9.1, §9.3.
3. **Hunt Hall round room location**: at the central plaza, intersection of Hushpuckney and Bethany Falls, ~15 blocks diameter, with a Lamar Hunt interpretive plaque and a single mounted Chiefs arrowhead. See §9.2.
4. **Data center detail depth**: the rack unit is 1×2×1 blocks (W×H×D), with **obsidian** front faces and **redstone lamp** indicators. The room is 12×15 blocks with 2 rows of 6 racks. See §6.2 Fit-out 3, §8.
5. **Inter-site coordination**: the service tunnel cross-section is ~6×5 blocks, public shaft is ~5×5 blocks. The SubTropolis ends are specified in §10. The Cheyenne Mountain and Houston tunnel-system teams should match.
6. **NARA high-bay records shelving**: **yes**, ceiling-to-floor shelving (5 blocks tall) is the defining visual of the archive. See §6.2 Fit-out 2, §7.2.

---

*End of design plan. The Site Planner's outputs (site-plan.md, site-coordinates.json) will provide the ravine-wall placement and portal coordinates. The AI Contractor Writer downstream receives this plan plus the working-plan.md and development-plan.md to begin placement.*
