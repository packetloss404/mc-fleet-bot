# Combined Complex — Development Plan (Longer-Term Evolution, No-Ravine)

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 04 — Combined Complex
**Author role:** Architectural Designer (inter-site connections)
**Date:** 2026
**Status:** Historical evolution study for the inter-site layer. It is not the current-world delivery plan.

> **Authority notice.** Read [../AUTHORITY.md](../AUTHORITY.md) before using this document. Its `Y=100` contact variant and native-world phases do not control. Masterplan 04's normalized root registry fixes local `Y=200`; Masterplan 05 owns placement, adaptation, and the only current delivery sequence. No world edits are authorized.

> **Scope reminder.** This document covers *how the combined complex evolves over time* — from a minimum viable product (MVP) to the full v2.0 build, with future extensions and a list of open items for the user. The 5 versions (v0.1 → v2.0) are *phased deliveries* that build on each other. The future extensions are *additions* to the v2.0 build, not replacements. The open items are the *questions for the user* that the design team cannot answer alone.
>
> **What changed from the ravine-era development plan.** The MVP definition is updated: the *continuous mountain* (granite cap + limestone body + horizontal contact at Y = 100) replaces the two-peak + V-shaped-ravine mountain. The composite terrane plaque lives at the *service tunnel contact crossing* from v0.5 onward (not at a ravine bottom). The v0.5 milestone is renamed from "The Ravine" to "The Contact" because there is no ravine — the milestone is the *geological story* (the contact, the plaque, the breccia strip), not the ravine itself. The 5 versions preserve the same architectural intent; only the geometry is updated.

---

## 1. MVP Definition

The **minimum viable combined complex** is the smallest build that captures the *soul* — *one Minecraft world that holds the entire history of American underground infrastructure in a single descent*. The soul requires four things to be present:

1. **The world envelope** — the 1,500 × 1,500 × 800 block world footprint with the continuous mountain, the contact ring at Y = 100, the city, and the coastal plain.
2. **The composite terrane** — the granite cap above the contact at Y = 100, the limestone body below the contact, with the composite terrane plaque at the service tunnel contact crossing.
3. **At least one inter-site connection** — the public shaft (the most visible and most accessible) is the *minimum* connection. The service tunnel is *optional* in the MVP (without the service tunnel, the plaque is not yet placed — the plaque lives in the service tunnel).
4. **The visitor journey** — at least one *traversable* path from the city surface to the SubTropolis chamber, demonstrating the *descent*.

A reasonable MVP is:
- **World footprint** (1,500 × 1,500 × 800, custom build-height ≥ 1,024)
- **Continuous mountain** (granite cap + limestone body, with the contact ring at Y = 100, the forest and the snow line)
- **City** (144 × 96 blocks, with the 4 anchor towers, 8 generic towers, the street grid, the T-markers)
- **Coastal plain** (flat grass, sparse forest, the small pier at the south edge)
- **Public shaft** (7×7 × 100 blocks, with the surface pavilion, the mid-landing, the bottom lobby)
- **SubTropolis chamber** (200 × 200 blocks, with the pillar grid, the painted numbers, the channel-letter signs)

The MVP does *not* include:
- The Houston tunnel (Phase 3 step 8) — the city has the surface streets and the T-markers, but the dim tunnel layer is *optional* in the MVP.
- The Cheyenne chamber and J-curve (Phase 5) — the granite cap is in the MVP as a *silhouette*, but the chamber and J-curve are *optional*. The MVP can show the granite cap as a *closed* mountain (no portal, no J-curve).
- The service tunnel (Phase 6 step 2) — the public shaft is the MVP connection; the service tunnel is the v1.5 connection. **The composite terrane plaque is not yet placed in the MVP** (the plaque lives in the service tunnel, which is v1.5).
- The SubTropolis horizontal portal (Phase 4 step 3 + Phase 6 step 4) — the SubTropolis chamber is reachable via the public shaft; the horizontal portal is the v1.5 alternative entry.
- The funicular and summit road (Phase 6 step 5–6) — the granite summit is reachable by *climbing* the granite cap (or by `/tp` in creative mode); the funicular and summit road are the v1.5 surface return.
- The composite terrane plaque (Phase 7 step 1) — the plaque is in the service tunnel, which is v1.5.

**MVP block budget:** ~2.5 million blocks (1.65M continuous mountain + 1.2M city + 200,000 SubTropolis chamber + 5,000 public shaft + 200,000 coastal plain + 50,000 misc). The +200,000 vs. the ravine-era MVP is the additional mass of the continuous mountain's limestone body (no ravine void to subtract).

**MVP build time:** ~30–50 hours of build time, of which roughly half is bot time and half is human time. At 4 hours per day, the MVP is **1–2 weeks** of calendar time.

The MVP is the *floor* of the combined complex. The full v2.0 build is the *ceiling*.

**Note on the composite terrane plaque in the MVP:** the plaque is *not* in the MVP because the service tunnel is *not* in the MVP. The MVP has the *mountain* (with the contact ring at the surface, Y = 100), but the *underground* expression of the contact (the breccia strip in the service tunnel floor, the plaque in the 3×5 alcove) requires the service tunnel. The MVP *shows* the contact at the surface but does not *explain* it underground. The plaque arrives in v1.5, when the service tunnel is built.

---

## 2. Phased Delivery (5 Versions)

The combined complex evolves through 5 versions, from the MVP (v0.1) to the full build (v2.0). Each version is a *self-contained* deliverable that can be played and evaluated; each version *builds on* the previous version without breaking it.

### 2.1 v0.1 — "The World"

**What it is:** the world envelope — the 1,500 × 1,500 × 800 block world with the continuous mountain, the contact ring at Y = 100, the city, and the coastal plain.

**What's included:**
- World settings (1,024 build-height, custom world type)
- Continuous mountain (granite cap from Y = 100 to Y = 800; limestone body from Y = 0 to Y = 100; the contact ring at Y = 100; the forest and the snow line)
- SubTropolis horizontal portal placeholder (4×5 opening in the limestone at the south face, at Y = 100)
- Cheyenne outer portal placeholder (6×6 opening in the granite at the north face, at Y = 300)
- Switchback road on the south face (city → horizontal portal placeholder)
- City (144 × 96 blocks, with the 4 anchor towers, 8 generic towers, the street grid, the T-markers)
- Coastal plain (600 × 1,500 blocks, with the lake and the arrival road)
- "Three Sites, One Mountain" sign at the granite summit (Easter egg #2)
- Rock identification chart at the granite summit (Easter egg #9)
- Funicular station at the granite summit (with the placeholder rail)

**What's NOT included:**
- The composite terrane plaque (added in v1.5, when the service tunnel is built)
- The Houston tunnel (added in v1.0)
- The SubTropolis chamber (added in v1.0)
- The Cheyenne chamber (added in v1.0)
- The public shaft (added in v1.5)
- The service tunnel (added in v1.5)
- The SubTropolis horizontal portal finishing (added in v1.5)
- The remaining 7 easter eggs (added in v2.0)

**Play experience:** the player spawns on the coastal plain, walks the arrival road into the city, sees the 4 anchor towers and the T-markers, walks the streets, looks up at the continuous mountain (a single landform with a granite cap and a limestone body), sees the contact ring at Y = 100 as a horizontal stripe on the mountain face, walks the switchback road up the south face of the mountain to the SubTropolis horizontal portal placeholder, sees the pink contact band directly above the cream portal frame, and reaches the granite summit via climbing (or `/tp`), where the "Three Sites, One Mountain" sign and the rock identification chart are placed. The world reads as *one Minecraft world that holds a city and a continuous mountain*, with the *promise* of what's underground.

**Build time:** ~20–30 hours of build time (1.65M mountain + 1.2M city + 200,000 coastal plain + 50,000 misc). At 4 hours per day, this is **1 week** of calendar time.

**Quality checkpoint:** the mountain silhouette reads correctly from a mile away (a single mountain with a granite cap and a limestone body, the contact ring visible at Y = 100, the peak at Y = 800), the city is recognizable as Houston-style, the forest matches the rock type, the contact ring is at the correct elevation, the switchback road connects the city to the portal placeholder.

### 2.2 v0.5 — "The Contact"

**What it is:** the v0.1 world + a *surface* expression of the contact — the contact ring signage, the breccia strip at the surface, and the surface reading of the geological story. **Note: the v0.5 milestone is renamed from "The Ravine" to "The Contact"** because there is no ravine in the no-ravine design. The milestone is the *geological story* (the contact, the plaque *preparation*, the breccia), not a physical ravine.

**What's added:**
- The contact ring signage (oak sign at the most prominent point on the contact ring, on the south face, visible from the city: "Horizontal Contact — Granite 1.08 Ga over Limestone 270 Ma")
- The breccia strip at the surface (a 1-block-wide cobblestone + calcite strip at Y = 100, ringing the mountain as the *visible* surface expression of the contact)
- The 1-block-wide polished diorite band at the SubTropolis horizontal portal placeholder (the *visible* surface expression of the contact at the portal)
- The contact-crossing preview alcove (a small 1×1 alcove carved into the surface at the contact ring, with a single oak sign reading "Contact Crossing — see service tunnel (v1.5)") — a *placeholder* for the underground plaque

**What's NOT added:** the public shaft, the service tunnel, the SubTropolis chamber, the Cheyenne chamber, the funicular, the composite terrane plaque (added in v1.5), the remaining 7 easter eggs (added in v2.0).

**Play experience:** the player walks the switchback road up the south face of the mountain, reaches the contact ring at Y = 100, reads the contact ring sign and the breccia strip, *understands* the geological premise at the *surface*. The player walks back down the switchback to the city, with the *knowledge* of what's below. The composite terrane plaque is *promised* in the service tunnel (v1.5) but not yet present.

**Build time:** ~1–2 hours of build time (100 contact ring sign + 1,000 breccia strip + 100 diorite band + 10 preview alcove). At 4 hours per day, this is **half a day** of calendar time.

**Quality checkpoint:** the contact ring is visible from the city as a horizontal stripe on the mountain face, the breccia strip is visible at Y = 100 as you walk along the contact, the contact ring sign is readable, the polished diorite band at the horizontal portal placeholder is visible directly above the cream portal frame.

### 2.3 v1.0 — "The Three Sites"

**What it is:** the v0.5 world + the 3 individual sites placed in the world.

**What's added:**
- The Houston tunnel (24-block sample, 6 blocks below grade, with the white concrete walls, the white wool VCT floors, the sea lantern fluorescent lighting, the channel-letter tenant signs, the T-markers at the 2 direct street-level entries)
- The SubTropolis chamber (200 × 200 blocks, with the white pillars, the painted numbers, the channel-letter signs, the central plaza, the food court, the tenant fit-outs)
- The SubTropolis sub-basement (100 × 100 × 30 blocks, at Y = −130 to Y = −160, with the service tunnel gate at the NW corner)
- The SubTropolis horizontal portal finishing (security gate, turnstile, vehicle checkpoint, "Welcome to SubTropolis" sign, "World's Largest Underground Business Complex" sign — Easter egg #5)
- The Cheyenne chamber (80 × 30 × 100 blocks, with the 1,319 springs, the 15 buildings, the Combat Operations Center, the Air Defense Operations Center, the medical clinic, the Granite Inn bar)
- The Cheyenne J-curve (800-block curved tunnel, with the 3 character stages, the 3 blast doors in a side branch)
- The Cheyenne outer portal finishing (concrete-and-granite frame, "U.S. Space Force — Authorized Personnel Only" sign — Easter egg #6, guard booth, connection to the J-curve)

**What's NOT added:** the public shaft, the service tunnel, the funicular rail extension, the summit road, the composite terrane plaque, the remaining 7 easter eggs (excluding the 2 that are *part* of the 3 individual site masterplans: the T-markers, inherited from the 03-masterplan, and the "U.S. Space Force" sign at the Cheyenne outer portal, added in v1.0 as part of the outer portal finishing).

**Play experience:** the player can now *enter* all 3 sites:
- **Houston tunnel:** the player walks down a T-marker entrance into the dim tunnel, walks the 24-block sample, sees the food court and the tenant signs.
- **SubTropolis:** the player can `/tp` into the chamber (or, in v1.5, descend the public shaft), walks the 200 × 200 chamber, sees the white pillars and the channel-letter signs.
- **Cheyenne:** the player can `/tp` into the chamber (or, in v1.5, ride the service tunnel and the J-curve), sees the 1,319 springs, the 15 buildings, the Combat Operations Center.

The 3 sites are *standalone* in v1.0 — they are not yet *connected*. The player has to `/tp` between them. The *promise* of the combined complex is *visible* (the 3 sites are in the same world, the contact ring is at Y = 100, the SubTropolis horizontal portal is at the contact, the Cheyenne outer portal is in the granite face) but the *connections* are not yet built.

**Build time:** ~25–35 hours of build time (50,000 Houston tunnel + 800,000 SubTropolis + 580,000 Cheyenne + 50,000 misc). At 4 hours per day, this is **1.5–2 weeks** of calendar time.

**Quality checkpoint:** the Houston tunnel is dim and beige-tiled, the SubTropolis chamber has the pillar grid and the channel-letter signs, the Cheyenne chamber has the 1,319 springs and the 15 buildings, all 3 sites are *recognizable* as their real-world counterparts, the SubTropolis horizontal portal is visible from the switchback road, the Cheyenne outer portal is visible from the funicular rail placeholder.

### 2.4 v1.5 — "The Spine"

**What it is:** the v1.0 world + the inter-site connections (the public shaft, the service tunnel, the funicular rail extension, the summit road) + the composite terrane plaque at the service tunnel contact crossing.

**What's added:**
- The public shaft (7×7 × 100 blocks, with the surface pavilion, the upper section, the mid-landing observation landing, the lower section, the bottom lobby) — including the "HELSINKI 5,500" sign (Easter egg #4)
- The service tunnel (6×6 × ~100 blocks, ascending at a 4:1 gradient from Y = −160 to Y = +300, with the SubTropolis end gate, the limestone section, the contact crossing, the granite section, the Cheyenne outer portal approach with the 25-ton blast door) — including the "Service Tunnel — Inspired by the Gotthard Base Tunnel" sign and the "SBB CFF FFS" carving (Easter egg #3)
- **The composite terrane plaque at the service tunnel contact crossing** (Centerpiece #3 + Easter Egg #1) — the 1×2 carved-stone plaque in the 3×5 alcove, with the 6–7 oak signs of geological text, the single redstone lamp, and the 1-block-wide cobblestone + calcite breccia strip on the tunnel floor at the contact (Easter egg #8)
- The funicular rail extension (from the summit station to the Cheyenne outer portal, 500 blocks of elevation gain, ~250 blocks of horizontal travel, 2:1 gradient, powered rail every 4 blocks)
- The summit road (6-block-wide paved road switchbacking down the south face of the mountain from the granite summit to the city plaza)
- The 25-ton blast door at the Cheyenne outer portal (Centerpiece #1) — 3-block-thick iron door in a 6-block-tall quartz-stair frame, visible from the approaching minecart
- The mid-level observation landing at Y = −50 in the public shaft (Centerpiece #2) — 7×7 alcove with the G-Cans-style glass window, the labelled limestone block, the bench, the information sign

**What's NOT added:** the remaining 6 easter eggs (added in v2.0), the lighting tuning (added in v2.0), the visitor journey timing test (added in v2.0).

**Play experience:** the *full* visitor journey is now possible. The player can:
1. Spawn on the coastal plain, walk the arrival road into the city.
2. Walk the city streets, see the T-markers, find the public shaft entrance at the NE corner (Combined Complex Transit Hub plaza).
3. Descend the public shaft, pause at the mid-landing observation landing, see the G-Cans-style pillar through the glass window, emerge at the SubTropolis lobby.
4. Walk the SubTropolis chamber, see the white pillars, the channel-letter signs, the food court, the central plaza.
5. Descend to the sub-basement (or drive out the horizontal portal, walk down the switchback, cross the contact ring, climb the other side — the alternative surface route).
6. Enter the service tunnel at the NW corner of the sub-basement, ride the minecart up through the limestone section, cross the contact at Y = +100 (the Telling Detail moment — see the breccia strip, read the composite terrane plaque in the 3×5 alcove, see the redstone lamp light the carved stone), continue up through the granite section, see the 25-ton blast door at the end.
7. Walk the J-curve, emerge in the Cheyenne chamber, see the 1,319 springs, the 15 buildings, the Combat Operations Center, the Granite Inn bar.
8. Take the funicular up to the granite summit, see the "Three Sites, One Mountain" sign, the rock identification chart, the view of the whole world from above.
9. Walk (or ride) down the summit road to the city plaza, passing the contact ring at Y = 100 on the way down, the *complement* to the contact crossing in the service tunnel.

The combined complex is *functional* in v1.5. The 3 sites are *connected*. The visitor journey is *traversable*. The build is *playable*. The composite terrane plaque is at the service tunnel contact crossing, telling the geological story.

**Build time:** ~15–20 hours of build time (5,000 public shaft + 4,000 service tunnel + 500 funicular + 1,000 summit road + 1,000 signs + 4,000 misc). At 4 hours per day, this is **1 week** of calendar time.

**Quality checkpoint:** the public shaft descent takes 30 sec (lift) or 5 min (stair), the mid-landing window shows the G-Cans-style pillar, the service tunnel minecart ride takes 2–3 min and ascends continuously, the walls visibly transition at the contact, the breccia strip is visible, the composite terrane plaque is readable in its 3×5 alcove, the blast door is visible from the approaching cart, the funicular rail is continuous from the outer portal to the summit station, the summit road connects the summit to the city plaza.

### 2.5 v2.0 — "The Journey"

**What it is:** the v1.5 world + the polish — the remaining 6 easter eggs, the lighting tuning, the visitor journey timing test, the return route test.

**What's added:**
- All 6 remaining easter eggs:
  - **"Service Tunnel — Inspired by the Gotthard Base Tunnel" sign** (already in v1.5; verified and finalized in v2.0)
  - **"Public Shaft — Inspired by the Helsinki Underground Master Plan" sign** (already in v1.5; verified and finalized in v2.0)
  - **"World's Largest Underground Business Complex" sign** (already in v1.0; verified and finalized in v2.0)
  - **"U.S. Space Force — Authorized Personnel Only" sign** (already in v1.0; verified and finalized in v2.0)
  - **Houston T-markers** (already in v1.0; verified and finalized in v2.0)
  - **Thrust-fault breccia strip** (already in v1.5; verified and finalized in v2.0 — also visible at the surface contact ring)
  - **"Three Sites, One Mountain" sign** (already in v0.1; verified and finalized in v2.0)
  - **Rock identification chart** (already in v0.1; verified and finalized in v2.0)
  - **Composite terrane plaque** (already in v1.5; verified and finalized in v2.0)
- Lighting tuning (redstone lamp density, sea lantern placement, mid-landing window alignment)
- Forest tuning (verify the forest matches the rock type)
- Contact ring review (verify the 1–2-block transition band is visible at the surface at Y = 100)
- SubTropolis horizontal portal review (verify the pink contact band is directly above the cream portal frame)
- Funicular test ride (verify the rail is continuous, the powered rail is dense enough)
- Minecart test ride (verify the service tunnel rail is continuous, the contact crossing is visible, the 4:1 gradient is climbable)
- Visitor journey timing test (verify the journey is 30–45 minutes)
- Return route test (verify the return is ~13 minutes via the funicular + summit road)
- Remove temporary markers (the 4 corner footprint markers from Phase 1)

**Play experience:** the *polished* visitor journey. The lighting is tuned, the easter eggs are in place, the journey timing is verified, the return route is verified. The build is *iconic* — a visitor who plays the journey will remember the 6 centerpieces, the 9 easter eggs, the descent through the contact, and the view from the summit.

**Build time:** ~4–8 hours of build time (mostly human-time polish). At 4 hours per day, this is **1–2 days** of calendar time.

**Quality checkpoint:** all 9 easter eggs are in place and readable, the lighting matches the plan, the visitor journey takes 30–45 minutes, the return route takes ~13 minutes, the funicular and minecart rides are smooth, the temporary markers are removed. The build is *complete*.

### 2.6 Version summary

| Version | What's included | New blocks | Build time | Play experience |
|---|---|---|---|---|
| **v0.1** "The World" | Continuous mountain, contact ring, city, coastal plain, "Three Sites" sign, rock chart, funicular station placeholder | ~1.85M | 1 week | "A world with a city and a continuous mountain." |
| **v0.5** "The Contact" | + contact ring signage, breccia strip at surface, diorite band at portal, contact-crossing preview alcove | +1,200 | half a day | "A world with a geological story at the surface." |
| **v1.0** "The Three Sites" | + Houston tunnel, SubTropolis chamber + sub-basement, SubTropolis horizontal portal, Cheyenne chamber + J-curve + outer portal | +1.5M | 1.5–2 weeks | "A world with three sites, but not yet connected." |
| **v1.5** "The Spine" | + public shaft, service tunnel, composite terrane plaque, funicular rail extension, summit road, blast door, mid-landing | +15,000 | 1 week | "A world with three connected sites and a full visitor journey." |
| **v2.0** "The Journey" | + 6 remaining easter eggs finalized, lighting tuning, journey timing test, return route test, temporary marker cleanup | +5,000 | 1–2 days | "A polished, iconic build." |
| **Total** | | ~3.4M | 4–6 weeks | "One Minecraft world that holds the entire history of American underground infrastructure in a single descent." |

The 5 versions are *self-contained* deliverables that can be played and evaluated at each stage. The build is *not* an all-or-nothing v2.0 — it is a *progression* from v0.1 to v2.0, with each version adding *one* major capability.

---

## 3. Future Extensions (Beyond v2.0)

The v2.0 build is the *complete* combined complex per the 7 binding decisions, updated for the no-ravine design. The future extensions are *additions* that the user (or the design team) may want to add after v2.0 is shipped. The extensions are *not* in v2.0 scope; they are *v3.0* candidates.

### 3.1 More city buildings

The v2.0 city has 4 anchor towers + 8 generic towers + 2–3 parking garages. The real Houston has 95 blocks of downtown with 4 anchor towers + dozens of generic towers + multiple parking garages. A v3.0 extension could add:
- **More generic downtown towers** (20–30 additional, filling in the 144 × 96 city grid more densely)
- **More parking garages** (5–8 additional, at the edges of the city)
- **A second-tier downtown** (a smaller commercial district on the western edge of the city, with mid-rise towers)
- **A residential district** (low-rise apartments and townhouses on the southern edge of the city, near the coastal plain)

### 3.2 More tenant zones in SubTropolis

The v2.0 SubTropolis has 5–6 named tenant fit-outs (USPS, NARA, Hallmark, Russell Stover, LightEdge, Grainger) + a central plaza + a food court. The real SubTropolis has 55+ tenants. A v3.0 extension could add:
- **More tenant fit-outs** (10–15 additional, with channel-letter signs and fit-out details)
- **A second food court** (at a different intersection, with a different tenant mix)
- **A warehouse zone** (with rolling shelves, forklifts, and a "High Security" sign)
- **A data center expansion** (a second LightEdge-style fit-out, with biometric hand readers and "No Phones" signs)
- **The film vault** (Underground Vaults & Storage, with the *Wizard of Oz* reference — yellow brick road paint, "Somewhere Over the Rainbow" sign, a small vault door; deferred from v1.0 per Decision 7)

### 3.3 More chambers in Cheyenne

The v2.0 Cheyenne has 1 chamber array (4.5 acres, 15 buildings, 1,319 springs). The real Cheyenne has the chamber array + the J-curve + the blast doors + the diesel generators + the water reservoirs + the Granite Inn bar. A v3.0 extension could add:
- **The generator hall** (6 × 1,750 kW diesel generators, with the "DEAD AIR" smell effect)
- **The water reservoir** (1 of 4 1.5-million-gallon reservoirs, with the water level indicator and the "RESERVE" sign)
- **The medical clinic** (a small hospital fit-out, with the operating room and the patient ward)
- **The Granite Inn bar** (a small lounge, with the bar counter, the stools, and the "Cheyenne Mountain Airmen' Society" sign)
- **The Alternate Joint Operations Center** (the *current* Cheyenne function, with the modern equipment and the "warm standby" status)

### 3.4 More inter-site connections

The v2.0 combined complex has 2 inter-site connections (the public shaft and the service tunnel). A v3.0 extension could add:
- **A second public shaft** (at a different location in the city, for redundancy)
- **A second service tunnel** (a parallel bore ascending through the mountain, for redundancy)
- **A direct Houston-to-SubTropolis connection** (a 6-block tunnel from the Houston tunnel sample to the public shaft bottom lobby, allowing a *single descent* from the city to SubTropolis without going through the public shaft entrance)
- **A direct SubTropolis-to-Cheyenne elevator** (a vertical shaft from the SubTropolis sub-basement to the Cheyenne J-curve side branch, for emergency evacuation)
- **A SubTropolis horizontal portal at the contact elevation** — the v2.0 has the portal at the contact elevation (Y = 100); a v3.0 extension could add a *second* horizontal portal at a different elevation (e.g., Y = 50, in the limestone just below the contact) for geological variety

### 3.5 Working minecart rail

The v2.0 service tunnel has a minecart rail with powered rail every 4 blocks. The minecart *works* (the player can ride it), but the *pacing* is fixed (1 block per second, plus the powered-rail boost). A v3.0 extension could add:
- **Variable-speed minecart** (powered rail density tuned to the desired pacing — slower in the limestone section, faster at the contact crossing, slower again in the granite section, slow at the blast door)
- **Station stops** (small platforms at the SubTropolis end, the contact crossing, and the Cheyenne end, with "NEXT STOP" signs)
- **Multiple minecarts** (a small fleet of 3–5 minecarts, with a "MINE CART BARN" at the SubTropolis end)
- **A minecart dispatcher** (a redstone circuit that controls the minecart flow, with a "MINE CART DISPATCHER" sign and a working lever)

### 3.6 Working public shaft lift

The v2.0 public shaft has a *visual* lift (the 5×5 lift car with the iron bars enclosure) but the lift is *static* (the player walks down the emergency stair to descend). A v3.0 extension could add:
- **A working lift** (a minecart with chest on a vertical rail, with powered rail at the top and a "LIFT" sign, so the player can ride the lift down by placing the minecart at the top and letting it coast down with boosts)
- **A lift operator** (an NPC at the surface pavilion, with a "LIFT OPERATOR" sign and a dialogue that says "Going down?" when the player approaches — deferred from v1.0 per Decision 7)
- **A working turnstile** (a redstone circuit that opens the turnstile when the player approaches, with a "PLEASE PRESENT BADGE" sign)
- **A working security gate** (a redstone circuit that opens the security gate at the SubTropolis lobby when the player has a specific item, with a "BADGE REQUIRED" sign)

### 3.7 A "tour mode" with NPCs / signs

The v2.0 build has *passive* easter eggs (signs and blocks, not interactive). A v3.0 extension could add:
- **NPC tour guides** (1–2 NPCs at the city surface, the public shaft entrance, the SubTropolis lobby, the service tunnel entrance, the Cheyenne chamber, and the granite summit, each with a *tour script* — a series of dialogue options that explain the build at that location)
- **A "tour mode" toggle** (a command-block or lever that activates the tour mode, spawning the tour guides and disabling mob spawns)
- **A "free roam" mode** (the default mode, with no tour guides, just the passive easter eggs)
- **A "speed run" mode** (a timer and a checkpoint system, for players who want to race through the journey in under 30 minutes)

### 3.8 More geological features

The v2.0 build has the horizontal contact at Y = 100 and the contact ring at the surface. A v3.0 extension could add:
- **A second contact** (a deeper horizontal contact at Y = −50, between two limestone formations of different ages — a "Pennsylvanian over Mississippian" contact, for geological variety)
- **A fault** (a vertical or diagonal fault that offsets the contact, with a small "fault gouge" zone of mixed rock at the fault)
- **A vein** (a 1-block-wide quartz vein cutting through the granite, with a small sign "Quartz Vein — late-stage hydrothermal fluid flow")
- **A fossil bed** (a 1-block-thick layer of "fossils" in the limestone, visible at the SubTropolis horizontal portal or in the public shaft mid-landing — small light grey wool "fossils" embedded in the smooth stone)
- **A contact metamorphic aureole** (a 1–2-block band of metamorphic rock at the contact, with the original limestone "baked" by the granite intrusion — a 1-block band of polished andesite or similar "metamorphic" block, between the limestone body and the granite cap)

### 3.9 More mountain features

The v2.0 continuous mountain has the granite cap, the limestone body, the contact ring, the forest, the snow line, the antenna arrays, and the summit station. A v3.0 extension could add:
- **A second peak** (a smaller secondary peak on the east or west end of the mountain, with a hiking trail to the top)
- **A cliff face** (a vertical exposed cliff on the north face, with the granite visible in cross-section)
- **A scree slope** (a field of loose rock at the base of the mountain, with grass and small plants growing through)
- **A small lake** (a glacial lake at the summit, fed by snowmelt, with lily pads and a small dock)
- **A cave system** (a small natural cave system in the limestone, separate from the SubTropolis chamber, with stalactites and stalagmites)

### 3.10 More coastal plain features

The v2.0 coastal plain is flat grass with sparse forest, a small pier, and the arrival road. A v3.0 extension could add:
- **A small town** (a 20-block-wide town at the east end of the plain, with a few houses, a general store, a gas station, a diner)
- **A farm** (a wheat farm, a carrot farm, a sugar cane farm — the "you've reached the edge of civilization" feel)
- **A river** (a 5-block-wide river running east-west across the plain, with a small bridge where the arrival road crosses)
- **A forest** (a denser oak/birch forest at the south edge of the plain, with a "State Forest" sign)
- **A lake** (a 30 × 30 block lake at the south edge of the world, with a "End of the World" sign at the dock)

---

## 4. Open Items for the User

The 5 versions and the future extensions are *design team's calls* — they are based on the 7 binding decisions and the no-ravine rework. The open items below are the *questions for the user* that the design team cannot answer alone.

### 4.1 The contact elevation (Y = 100)

The architect's call in the no-ravine design is **Y = 100** for the horizontal contact. This means:
- 100 blocks of limestone below the contact (from Y = 0 to Y = 100), containing the SubTropolis chamber (Y = −100 to Y = 0) and 100 blocks of limestone above the chamber to the contact.
- 700 blocks of granite above the contact (from Y = 100 to Y = 800), containing the Cheyenne chamber (Y = +250 to Y = +400) and 400 blocks of granite above the chamber to the summit.

The contact elevation is a *design* call, not a *binding* call. The user may prefer:
- **Y = 50** (lower contact): more granite above the contact (750 blocks), less limestone (50 blocks). SubTropolis chamber is closer to the contact. The SubTropolis horizontal portal would be at Y = 50.
- **Y = 100** (the architect's call): balanced — 100 blocks of limestone, 700 blocks of granite. SubTropolis chamber is 100 blocks below the contact. The SubTropolis horizontal portal is at Y = 100.
- **Y = 200** (higher contact): more limestone below the contact (200 blocks), less granite above (600 blocks). SubTropolis chamber is 200 blocks below the contact. The SubTropolis horizontal portal would be at Y = 200. The Cheyenne chamber (Y = +250) would be only 50 blocks above the contact, which is tight.

**Question for the user:** is Y = 100 the right contact elevation, or should the contact be at Y = 50 or Y = 200?

### 4.2 The service tunnel gradient (4:1)

The service tunnel is an ascending inclined minecart bore, 6×6 × ~100 blocks, with a 4:1 gradient (Y = −160 to Y = +300, 460 blocks of elevation gain over ~115 blocks of horizontal travel). The 4:1 gradient requires powered rails every 4 blocks for the minecart to climb.

The user may prefer:
- **A steeper gradient (5:1 or 6:1):** shorter tunnel (~80 blocks), but the minecart climb is more demanding (more powered rails needed).
- **A gentler gradient (3:1 or 2:1):** longer tunnel (~150 blocks), but the minecart climb is easier (fewer powered rails needed). The tunnel would extend further into the mountain.
- **A switchback (zig-zag) tunnel:** the tunnel goes up at 2:1 in a zig-zag pattern, with the player changing direction at switchback points. This is more like a real mine but is harder to navigate in a minecart.

**Question for the user:** is the 4:1 straight-bore gradient the right approach, or should the tunnel be steeper, gentler, or switchbacked?

### 4.3 The SubTropolis horizontal portal position (south face vs. city-side)

The SubTropolis horizontal portal is at the **south face of the continuous mountain** (the city-facing side), at the contact elevation (Y = 100), accessible by a switchback road from the city plaza.

The user may prefer:
- **East face:** the portal is on the east face of the mountain (the coastal-plain-facing side), with the switchback road from the coastal plain rather than the city. This is a more "remote" access (less civilian, more industrial).
- **West face:** the portal is on the west face of the mountain, with the switchback road from a hypothetical "west town" or from the coastal plain. This is the most remote option.
- **City-side plaza level (Y = 0):** the portal is at the *base* of the mountain, at city level, rather than at the contact elevation. This requires a *horizontal* drive through 100 blocks of limestone to reach the SubTropolis chamber. This is more like a real SubTropolis drive-in portal (the real SubTropolis portals are at *hillside* level, not at the top of the hill).

**Question for the user:** is the south-face-at-contact-elevation position the right one, or should the portal be on a different face or at a different elevation?

### 4.4 The return route (funicular + road vs. alternatives)

The return route is **funicular + road**, with no skybridge. The user may prefer:
- **Funicular + road (the architect's call):** the visitor rides the funicular from the Cheyenne outer portal to the granite summit, then walks/rides the summit road down to the city. ~13 minutes total. The skybridge is removed (it was a ravine-spanning object).
- **Funicular + cable car:** the visitor rides the funicular to the summit, then takes a cable car across the mountain to a different point on the south face, then walks down. This is more "Swiss" but more complex.
- **All-road:** the visitor walks/rides the entire return via the switchback road, no funicular. Slower (~25 minutes) but more Minecraft-native (no powered rails).
- **Teleport:** the visitor uses `/tp` to return to the city. Fast but breaks the journey narrative.

**Question for the user:** is the funicular + road return the right one, or should the return be different?

### 4.5 The composite terrane plaque text (geological accuracy)

The composite terrane plaque text is in design-plan §6.3. The text references the 1.08 Ga Pikes Peak granite and the 270 Ma Bethany Falls limestone — the real ages of the real rocks. The horizontal contact is real geology (granite plutons push up through limestone in mountain ranges worldwide).

The user may prefer:
- **The current text (architect's call):** 7 lines, the geological story of the contact, the regional context (Alps, Appalachians, Glacier National Park), the explanation of the horizontal contact.
- **A shorter text (3–4 lines):** more readable for casual players, less detail.
- **A longer text (10+ lines):** more detail, more geological context, more references to real mountain ranges.
- **A book (written book) instead of signs:** the text is in a written book placed in an item frame, with the player able to "read" the book by right-clicking. This is more Minecraft-native (written books are a vanilla feature).

**Question for the user:** is the current plaque text the right one, or should it be shorter, longer, or in a book?

### 4.6 The SubTropolis horizontal portal "WELCOME" sign

The SubTropolis horizontal portal finishing includes a "Welcome to SubTropolis" sign at the portal mouth (matching the public shaft bottom lobby). The user may prefer:
- **"Welcome to SubTropolis — Hunt Midwest Industrial Complex"** (the architect's call): the standard welcome, matching the public shaft lobby.
- **"Hunt Midwest SubTropolis — Authorized Vehicles Only"** (the security-focused version): emphasizes the security, not the welcome.
- **"World's Largest Underground Business Complex"** (the marketing version): emphasizes the scale, not the welcome.
- **No sign** (just the security gate and turnstile): minimal, lets the architecture speak.

**Question for the user:** is the "Welcome to SubTropolis" sign the right one, or should the portal have a different sign or no sign?

### 4.7 The 5-version delivery vs. continuous delivery

The 5 versions (v0.1 → v2.0) are *phased deliveries* that build on each other. The user may prefer:
- **5 versions (the architect's call):** the build is delivered in 5 self-contained stages, each stage is a *playable* deliverable, and the user can evaluate and approve each stage before the next stage begins.
- **Continuous delivery:** the build is delivered in a single stream, with each phase (1–7) delivered as it is completed. The user evaluates the build at the end, not at each stage.
- **Compressed delivery (v0.1 + v2.0 only):** the MVP (v0.1) and the final build (v2.0) are the only milestones; the intermediate versions (v0.5, v1.0, v1.5) are skipped or compressed.

**Question for the user:** is the 5-version phased delivery the right approach, or should the build be delivered differently?

### 4.8 Render distance and simulation distance for the live build

The research recommends view-distance 16 and simulation-distance 12. The user may prefer:
- **View-distance 16, simulation-distance 12** (the research's recommendation): a balance between visual quality and performance.
- **View-distance 32, simulation-distance 16** (high quality): the build looks better but is heavier to load.
- **View-distance 12, simulation-distance 8** (lower quality): the build is lighter to load but the world is less immersive.

**Question for the user:** what render and simulation distances should the live build use?

### 4.9 The "Three Sites, One Mountain" sign at the granite summit

The "Three Sites, One Mountain" sign is at the granite summit (Y = 800), visible from the funicular arrival. The text references the three real-world sites:
- "Cheyenne Mountain (Colorado Springs) — Granite, upper elevation"
- "SubTropolis (Kansas City) — Limestone, lower elevation"
- "Houston Tunnels — City in the valley"
- "Combined by horizontal contact at Y=100, connected by service tunnel"

The user may prefer:
- **The current text (architect's call):** the three sites, the geological framing, the service tunnel reference.
- **A simpler text:** just the three site names and their real-world locations.
- **A more detailed text:** with the real-world depths, the rock ages, the construction years.
- **The sign at a different location:** at the city surface (Combined Complex Transit Hub plaza) instead of the granite summit.

**Question for the user:** is the current sign text and location the right one?

### 4.10 The world footprint (1,500 × 1,500)

The world footprint is 1,500 × 1,500 horizontal × 800 vertical (Y = 0 to Y = 800, with the build extending to Y = −100 and Y = +800). The user may prefer:
- **1,500 × 1,500 (the architect's call):** the recommended footprint per the research.
- **2,000 × 2,000:** a larger world, more room for the mountain, the city, and the coastal plain. Heavier to load.
- **1,000 × 1,000:** a smaller world, less room for the mountain, the city, and the coastal plain. Lighter to load but more compressed.

**Question for the user:** is the 1,500 × 1,500 footprint the right one, or should the world be larger or smaller?

---

*End of development plan. The 5 versions in §2 are the phased deliveries; the future extensions in §3 are the v3.0 candidates; the open items in §4 are the questions for the user that the design team cannot answer alone.*
