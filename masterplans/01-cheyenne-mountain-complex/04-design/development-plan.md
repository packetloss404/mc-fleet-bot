# Development Plan — Cheyenne Mountain Complex

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 01 — Cheyenne Mountain Complex
**Stage:** 04 — Design (longer-term plan)
**Author:** Architectural Designer
**Status:** Reference document for staged delivery and future extensions.
**Companion:** `design-plan.md` (the what), `working-plan.md` (the how), this document (the when and the future).

This document describes *how the build evolves over time* — the staged delivery from v0.1 to v2.0, the future extensions that could follow, and the open items that need user input.

---

## 1. MVP Definition

### 1.1 What "minimum viable build" means here

The **MVP** is the smallest build that *captures the soul* of Cheyenne Mountain — the *industrial cathedral* feeling, the 1,319 springs as the signature, the 25-ton blast doors as the cinematic moment, the Battle Cab as the climax. The MVP is *not* the most detailed build; it is the build that makes a visitor *understand what this place is* after a single 10-minute walk-through.

### 1.2 The non-negotiable must-haves (the MVP cannot omit these)

| # | Must-have | Why it's non-negotiable |
|---|---|---|
| 1 | **The mountain** (forested, multi-peaked, with antennas) | The exterior. Without the mountain, there's no *under* to be *under*. |
| 2 | **The North Portal** (concrete-and-steel arch, lettering, security) | The exterior hero shot. The first impression. |
| 3 | **The J-curve tunnel** (800 blocks, three-stage wall treatment) | The approach. The "you cannot see the end" effect. |
| 4 | **The blast door airlock** (2× scaled, with the second door visible) | The cinematic moment. The threshold. |
| 5 | **The chamber array** (45×25, 15 building shells on visible springs) | The money shot. The signature. |
| 6 | **The 1,319 springs** (visible at 2× scale, with the master sign) | The thesis. The defining engineering detail. |
| 7 | **The Battle Cab** (the wall of displays, the U-shape, the 1980 plaque) | The climax. The destination. |
| 8 | **The 1980 false alarm plaque** (full text, on the main path) | The real history. The moral. |

**The MVP is 8 items, not the full 12 must-haves.** The 4 items that *can* be cut from the MVP (and added back in v1.0) are:
- The 4 other ops centers (a single Battle Cab is enough for the climax; the others are *family resemblance* and can be added later)
- The water reservoir (atmospheric, but the chamber array is the priority)
- The Granite Inn + Chapel + Medical (the human spaces, but the *machine* of the complex comes first)
- The Stargate door (the inside joke, but the real history is the priority)

### 1.3 The cuts that come back later

The MVP cuts (in order of priority to restore):
- **v0.5:** The 4 other ops centers (so the visitor can see the *family resemblance*)
- **v0.5:** The water reservoir (so the visitor can experience the *quiet room*)
- **v1.0:** The Granite Inn + Chapel + Medical (so the visitor can experience the *human spaces*)
- **v1.0:** The Stargate door + other easter eggs (so the visitor can *find* the inside jokes)
- **v1.5:** The full surface campus (parking lot, fire station, recreational facilities — the surface campus is *not iconic*, but it completes the surface)
- **v2.0:** The 4 satellite buildings (above-ground), the working redstone (blast doors that open/close), the MrBeast tour recreation

---

## 2. Phased Delivery

The build is delivered in 5 versions, each playable on its own. The visitor should be able to *experience* the build at any version, not just at v2.0.

### 2.1 v0.1 — "The Approach" (the journey to the threshold)

**Included:**
- Mountain shell (the multi-peaked forested mountain, the antenna arrays)
- Approach road (switchback, gravel, retaining walls)
- North Portal (the arch, the lettering, the security perimeter, the guardhouse, the parking lot)
- J-curve tunnel (the 800-block curve, three-stage wall treatment, all 16 niches, all 4 fire doors)
- Blast door side-branch (the airlock, both doors, all signage)

**Cut:**
- The chamber array
- The 15 buildings
- The reservoir
- All interiors

**Player experience:** A 10-minute walk from the public road to the blast doors. The visitor experiences the *journey* — the approach, the portal, the tunnel, the threshold — but cannot enter the complex. The doors are *closed* (or absent, with a `barrier` block preventing entry, replaced in v0.5).

**Block estimate:** ~350,000 blocks
**Build time:** 4-6 weeks (human) or 2-3 weeks (bot fleet)

### 2.2 v0.5 — "The Reveal" (the chamber, but empty)

**Included:**
- Everything from v0.1
- The chamber array carved (45×25 × 18 tall)
- The chamber floor, ceiling, walls, lighting
- The 15 building shells (3-story and 2-story) on visible spring arrays
- The 1,319 springs (visible at 2× scale, with the master sign)
- The walkways between buildings
- The cross-section building (B7)
- The ambient sway contraption
- The chamber entrance / 1980 plaque area (plaque text *not yet* placed — placeholder signs)
- A *barrier* at the chamber entrance (replaced in v1.0)

**Cut:**
- All building interiors (the buildings are shells)
- The Battle Cab, the 4 other ops centers, the support rooms
- The reservoir
- The Granite Inn, chapel, medical, dental
- The Stargate door
- All easter eggs

**Player experience:** A 15-minute walk from the road to the chamber, then a *moment of revelation* — the visitor stands at the chamber entrance and sees the 15 buildings on their springs. The visitor can walk between the buildings, see the springs, see the cross-section. The visitor can climb inside the building shells (empty) and look at the rough rock ceiling from above. The 1980 plaque is *not yet* placed — the moment of historical weight is reserved for v1.0.

**Block estimate:** +~50,000 blocks
**Build time:** +2-3 weeks (human) or +1 week (bot fleet)

### 2.3 v1.0 — "The Heart" (the buildings come alive)

**Included:**
- Everything from v0.5
- The Battle Cab (B1) fully built out — the wall of displays, the U-shape, the consoles, the dim lighting, the **1980 false alarm plaque (full text)**
- The 4 other ops centers (B2, B3, B4, B5) — simpler but distinct
- The 5 middle-chamber support buildings (B6, B7, B8, B9, B10) — server rooms, briefing rooms, offices
- The 5 south-chamber buildings (B11, B12, B13, B14, B15) — medical, server, dental, chapel, Granite Inn
- The Stargate door (single, signed, in a back corridor between B2 and B3)
- The WOPR terminal (in B12, off the main path)
- The Chrystal Palace sign (in a back corridor)
- The MrBeast sign (in the Granite Inn)
- The DEAD AIR sign (in the main tunnel)
- The 1979 secondary plaque (in B3)
- The "1,319 springs" master sign (in the chamber entrance)
- The designer-interpretation placard (in the chamber, on the main E-W axis)
- All building-exterior signage (B-XX / Building Name)
- The 1,319 spring-count signs (one per building)

**Cut:**
- The water reservoir (the contemplation room is reserved for v1.5)
- The surface campus (parking lot is the only above-ground element; the fire station, recreational facilities are reserved for v1.5)
- The working redstone (the blast doors are static for v1.0; the open/close mechanism is reserved for v2.0)
- The MrBeast tour recreation (reserved for v2.0)
- The seasonal banner (NORAD Tracks Santa, optional, can be added any time)

**Player experience:** The full 20-30 minute play-through. The visitor walks the approach, the tunnel, the blast doors, into the chamber. They see the 15 buildings, walk between them, enter the Battle Cab (the climax), read the 1980 plaque, walk through the 4 ops centers, see the support rooms, find the chapel, find the Granite Inn (the warm light), find the Stargate door (the inside joke), find the WOPR terminal, find the MrBeast sign. The build is *experienced* in full.

**Block estimate:** +~10,000 blocks
**Build time:** +2-4 weeks (human) or +1-2 weeks (bot fleet)

### 2.4 v1.5 — "The History" (the contemplation room and the surface)

**Included:**
- Everything from v1.0
- The water reservoir (30×20×8, dark prismarine walls, still water, the boat, the causeway, the stairway, the soul-lantern lighting)
- The surface campus additions:
  - The 4 satellite buildings above ground (small, 1-story, `light gray concrete`)
  - The fire station (1-story, 6×4, with a `minecart` "fire truck")
  - The Mountain Man Park area (a small `grass block` clearing with a `sign` "MOUNTAIN MAN PARK — RECREATION AREA")
  - The racquetball court (a `light gray concrete` square with `iron fence` walls, no roof)
  - The putting green (a small `grass block` circle with a `sign`)
- The 1962 fault repair dome (in the chamber ceiling, with a `sign`)
- The "DEAD AIR" sign (already in v1.0; this is just confirming)

**Cut:**
- The 4 additional satellite ops centers in full detail (these are the 4 *above-ground* satellite buildings that don't exist at the real complex — the design-plan is light on these; they're an optional v1.5 addition)
- The working redstone (still reserved for v2.0)

**Player experience:** A 25-35 minute play-through. The visitor has the full v1.0 experience, plus the reservoir (the *quiet room*, a moment of contemplation), plus the surface campus (a tour of the *exterior* of the complex, not just the entrance).

**Block estimate:** +~3,000 blocks
**Build time:** +1-2 weeks (human) or +3-5 days (bot fleet)

### 2.5 v2.0 — "The Complex" (full polish, the working redstone, the tour)

**Included:**
- Everything from v1.5
- **Working redstone:** the blast doors *open and close* via redstone + pistons. A 30-second timer or a `button` activation closes the doors (with the iconic mechanical sound). The visitor can press a button and watch the 25-ton door swing shut.
- **Working lighting:** the chamber lighting can be turned on/off via a `lever` at the chamber entrance. The "black-out capable" claim becomes *demonstrable*.
- **A "tour mode":** NPCs (or `sign` arrows) guide the visitor through the build in a curated order: approach → tunnel → blast doors → chamber → Battle Cab → reservoir → Granite Inn. Optional, but it makes the build *narratively* accessible.
- **The MrBeast tour recreation:** a `sign` at the visitor entrance reading "MRBEAST 2025 TOUR: $1 VS $1,000,000,000,000" with a `gold block` "play button" behind a `painting`. A small "tour path" of `sign` arrows tracing the MrBeast video's route.
- **The seasonal banner (optional):** the NORAD Tracks Santa banner, swap-in for December.
- **Polish:** every `sign` audited for readability, every lighting zone audited for mood, every walkway audited for navigation, every easter egg audited for *findability*.
- **The combined-complex rail connection:** a `rail` line from Cheyenne Mountain to the SubTropolis / Houston tunnel system, via the deep ravine (this is the *combined complex report*'s deliverable; the v2.0 build is the first to physically connect to the other sites).

**Cut (the build is "done" at v2.0):**
- Nothing. v2.0 is the full build.

**Player experience:** The full 30-45 minute play-through, with optional extensions (the redstone demo, the MrBeast tour, the rail connection). The build is *experienced, demonstrated, and connected* — a complete Minecraft replica of the Cheyenne Mountain Complex.

**Block estimate:** +~5,000 blocks
**Build time:** +2-4 weeks (human) or +1-2 weeks (bot fleet)

### 2.6 The summary

| Version | Name | What the visitor experiences | Player time |
|---|---|---|---|
| **v0.1** | The Approach | The journey to the threshold | 10 min |
| **v0.5** | The Reveal | The chamber, but the buildings are empty | 15 min |
| **v1.0** | The Heart | The full build, but no reservoir, no surface campus, no redstone | 20-30 min |
| **v1.5** | The History | The full build, with the reservoir and the surface campus | 25-35 min |
| **v2.0** | The Complex | The complete replica, with working redstone, tour mode, and the rail connection | 30-45 min |

---

## 3. Future Extensions (post-v2.0)

These are the *optional* extensions that could follow v2.0. None are required; all are *nice-to-have*.

### 3.1 Other ops centers in more detail

The 4 other ops centers (B2, B3, B4, B5) are *family resemblance* in v1.0. A future extension could build them out in *full* detail, with the same wall-of-displays treatment as the Battle Cab. Each one is a *destination* in its own right:
- **B2 Air Defense** — a full radar-tracking room with multiple screens, multiple operator stations, the "TRACKING 24/7" detail
- **B3 Missile Warning** — a full launch-detection room with status panels, the 1979 secondary plaque in full, the BMEWS/PAVE PAWS network signage
- **B4 Space Control** — a full orbital-tracking room with the star-map ceiling, the SBIRS satellite detail, the "SPACE SURVEILLANCE NETWORK" signage
- **B5 Combined Intelligence Watch** — a full briefing room with the all-source intelligence detail

### 3.2 More reservoirs

The real complex has 4 reservoirs + 1 heat-sink. v1.5 builds 1. A future extension could build the *other 3* (smaller, less detailed, but still *there*). The visitor who explores the lower level would find: the main reservoir (the v1.5 build), then 3 smaller reservoirs in adjacent chambers, with the heat-sink reservoir marked but not buildable (a `barrier` with a `sign`: "HEAT SINK RESERVOIR — 4.5 MILLION GALLONS — NOT FOR TOUR").

### 3.3 The 4 satellite buildings (above-ground)

The 4 satellite buildings mentioned in the design plan (the *additional* ops centers that are *not* in the main chamber) are a v1.5 optional. A future extension could build them out:
- **Above-ground security building** (the public entrance checkpoint, ~1.5 miles from the portal)
- **Above-ground administrative building** (the parking lot office)
- **Above-ground recreation building** (the gym, the spin gym)
- **Above-ground VIP building** (the senior officer quarters)

These are *not iconic* in the real complex, but they would *complete* the surface campus and give the visitor a sense of "this is a place where people work and live, not just a hole in a mountain."

### 3.4 A "tour mode" with NPCs / signs

A guided tour mode where the visitor is *led* through the build by NPCs (or `sign` arrows) in a curated order. The tour could include:
- A 5-minute "highlights" tour (approach → tunnel → blast doors → chamber → Battle Cab)
- A 15-minute "full" tour (everything in v2.0)
- A 30-minute "explorer" tour (everything, plus the off-path easter eggs, with hints)

The tour mode could be implemented via `sign` arrows at every intersection, with the visitor choosing the tour length at the parking lot.

### 3.5 Redstone integration (working lights, blast doors that open/close)

A v2.0 feature, but extendable:
- **Working blast doors** — the doors open/close via `button` or `lever`, with the iconic mechanical sound
- **Working chamber lighting** — the chamber lights turn on/off via a `lever` at the chamber entrance
- **Working emergency lighting** — the chamber has *two* lighting modes: the normal `redstone lamp` mode, and the "alert" mode where all lights switch to `red concrete` + `redstone lamp` (the visual reference to the 1980 false alarm)
- **Working alert state** — a `button` at the Battle Cab that triggers the alert state: red lights, a "MISSILE WARNING TEST" `sign` animation (via item-frame swap), and a `note block` klaxon
- **Working water level** — the reservoir water level can be raised/lowered via a `lever` (atmospheric, not functional)

### 3.6 A "MrBeast tour" recreation

The 2025 MrBeast video is the most-viewed public tour of the complex. A future extension could recreate the *video's path* as a guided tour in the build:
- A `sign` at the parking lot: "MRBEAST 2025 TOUR — WELCOME"
- `sign` arrows tracing the video's route through the build
- `sign`s at key moments with the video's narration (subtitled)
- A `gold block` "play button" hidden in a corner, as a nod

This would make the build *narratively* accessible to the YouTube generation, who may not know the Cold War history but know the MrBeast video.

### 3.7 Connection to the combined complex (sub-rail through the ravine)

The combined complex report places Cheyenne Mountain on the *north side of a deep ravine*, with SubTropolis and the Houston tunnel system on the *south side*. A future extension could build a `rail` line through the ravine, connecting the three sites:
- A `rail` track from the chamber down to the ravine floor (via a tunnel)
- Across the ravine (a `rail` bridge or a `rail` tunnel)
- Up to the SubTropolis entrance (the *next* masterplan)

The rail connection makes the *combined complex report* a *playable* thing, not just a document.

### 3.8 A "1966 vs 2025" toggle

A v2.0+ feature: a `lever` that swaps the build between the *1966 vintage* and the *2025 modernized* state. The differences:
- 1966: the original UNIVAC 1100/42 computers, the original fluorescent fixtures, the 1960s "NORAD" stenciling
- 2025: the modernized Raytheon systems, the LED lighting, the Space Force delta on the signage

The toggle is implemented via `command block` + `fill` (replace blocks) or via `resource pack` swap (cleaner but more complex).

### 3.9 A "sub-rail through the mountain"

A v2.0+ extension: a *small* `minecart` system inside the complex, mirroring the real personnel-transport bus. The visitor takes a `minecart` from the parking lot to the chamber (skipping the 800-block walk), with the cart passing through a *shortcut tunnel* that bypasses the J-curve. The full walk is still the *recommended* experience, but the cart is available for visitors who want the *abbreviated* experience.

### 3.10 A "1947 alternate history" mode

A creative extension: a `lever` that swaps the build to a *1950s alternate history* where the complex was built earlier and bigger. The differences are *fantasy*:
- More buildings (20 instead of 15)
- More reservoirs (6 instead of 4)
- A "moon base" extension (a small `end stone` structure above the mountain)
- A "flying saucer" hangar (a `quartz` structure in a side chamber)

This is *purely creative license* and is the *farthest* extension from the real complex. The Realist would object, but the Gameplay Advocate would love it.

---

## 4. Open Items for the User

The following items need user input before the build can proceed. Some are *blocking* (the build cannot start without them); some are *non-blocking* (defaults exist, but the user may want to change them).

### 4.1 Blocking (the build cannot start without these)

1. **Build height decision.** The build requires a 1,024+ build height mod or custom world. **Which approach does the user prefer?**
   - Mod: Cylinder / extended height (simplest)
   - Custom superflat with extended height
   - Custom world generation
   - Other?

2. **Build size budget.** The build is ~415,000 blocks, with a ~100×100 chunk footprint. **Does the user have a target build size?**
   - Vanilla default world (384 height) — *insufficient*
   - Superflat with extended height
   - Modded with extended height (1,024 or 2,048)
   - Custom world

3. **The "CHEYENNE MOUNTAIN COMPLEX" vs "CHEYENNE MOUNTAIN SPACE FORCE STATION" decision.** The portal signage reads "CHEYENNE MOUNTAIN COMPLEX" (the historically iconic name). The current official name (since 2020) is "Cheyenne Mountain Space Force Station." **Which does the user want?**
   - Default: "CHEYENNE MOUNTAIN COMPLEX" (the historically iconic name, the one on the public portal)
   - Alternative: "CHEYENNE MOUNTAIN SPACE FORCE STATION" (the current name, less iconic)

### 4.2 Non-blocking (defaults exist, but the user may want to change them)

4. **The 1980 plaque: full text or excerpt?** The design plan uses the *full* text (the Veteran specifically requested full text). **Does the user want the full text, or a more concise version?**
   - Default: full text (200+ characters, the design plan's §12.4)
   - Alternative: a concise 2-3 line version

5. **The Stargate door: signed how?** The design plan uses "STARGATE COMMAND" (the real broom-closet joke). **Does the user want the literal text, or a more subtle reference?**
   - Default: "STARGATE COMMAND" (the real joke)
   - Alternative: "SGC — Authorized Personnel Only" (more subtle)

6. **The 1979 secondary plaque: include or skip?** The design plan includes it as optional. **Does the user want it?**
   - Default: include (it's a 2-line plaque, cheap to add)
   - Alternative: skip (the 1980 plaque is the main one)

7. **The MrBeast reference: include or skip?** The design plan includes it as a back-room sign. **Does the user want it?**
   - Default: include (it's a small `sign` in the Granite Inn, with a hidden `gold block`)
   - Alternative: skip (the MrBeast video is entertainment, not history)

8. **The seasonal NORAD Tracks Santa banner: include as a year-round sign, or as a December-only swap?** **Which approach does the user prefer?**
   - Default: year-round sign (simpler)
   - Alternative: December-only swap (more authentic, but requires the contractor to swap it in for December screenshots)

9. **The "MrBeast tour" recreation (v2.0): include as a full guided tour, or as a single hidden sign?** **Which approach does the user prefer?**
   - Default: single hidden sign in the Granite Inn (already in v1.0)
   - Alternative: full guided tour with `sign` arrows (v2.0 extension)

10. **The "1947 alternate history" mode (a creative extension): include or skip?** This is a *purely creative* extension and may be out of scope. **Does the user want it?**
    - Default: skip (it's far from the real complex)
    - Alternative: include as a v2.0+ extension

11. **The 4 satellite buildings (above-ground): include in v1.5, or save for v2.0+?** **Which version does the user want them in?**
    - Default: v1.5 (small, simple, completes the surface)
    - Alternative: v2.0 (more detailed, but later)

12. **The combined-complex rail connection (v2.0): include in the v2.0 build, or as a separate future extension?** This depends on the combined-complex report. **Does the user want it in v2.0, or as a follow-up?**
    - Default: include in v2.0 (the combined complex report is part of the project)
    - Alternative: separate follow-up (the build can stand alone)

### 4.3 Depends on the combined-complex report (downstream)

13. **The rail connection to SubTropolis / Houston tunnel system.** This depends on the combined-complex report's site plan. **What are the coordinates of the SubTropolis and Houston tunnel entrances relative to the Cheyenne Mountain build?**
    - Required for the rail connection's path
    - Default: defer until the combined-complex report is available

14. **The "deep ravine" between the three sites.** The combined complex report places the three sites around a deep ravine. **What are the ravine's dimensions?**
    - Required for the rail bridge / tunnel design
    - Default: defer until the combined-complex report is available

---

## 5. The Long-Term Vision (post-v2.0)

The Cheyenne Mountain Complex build, at v2.0, is a *complete* replica. The future extensions (above) are *optional*. The build can stand alone, and the user can choose to extend or not.

The long-term vision, if the user wants it:
- **Cheyenne Mountain at v2.0** (the build from this design plan)
- **SubTropolis at v2.0** (the parallel build, also from this project)
- **Houston tunnel system at v2.0** (the third parallel build)
- **The combined complex at v2.0** (the rail connection, the deep ravine, the integrated experience)

The three sites, *together*, are the *complete* project. The Cheyenne Mountain build is *one-third* of that. The design plan, working plan, and development plan in this document are *one-third* of the deliverable.

---

*End of development plan. Hand off to the AI Contractor Writer for block-by-block execution of v0.1, and to the PM for staging the v0.5, v1.0, v1.5, and v2.0 deliveries.*
