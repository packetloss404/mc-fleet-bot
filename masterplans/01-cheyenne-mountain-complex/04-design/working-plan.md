# Working Plan — Cheyenne Mountain Complex

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 01 — Cheyenne Mountain Complex
**Stage:** 04 — Design (construction sequence)
**Author:** Architectural Designer
**Status:** Binding for the AI Contractor Writer.
**Companion:** `design-plan.md` is the *what*; this document is the *how*.

This document describes the *construction sequence* — the order in which the build is placed, the tools used, the risks to manage, and the quality checks at each stage. The build is large (1,400+ blocks tall, 800+ blocks of tunnel, 45×25 block chamber, 15 buildings, 1,319 springs) and requires careful phasing.

---

## 1. Build Strategy

### 1.1 The chosen strategy: **Outside-In, Top-Down**

I recommend an **outside-in, top-down** strategy with three nested passes:

**Pass 1 — Above-Ground (the mountain, the portal, the approach).** Build the mountain shell first, including the approach road, the antenna arrays, the trees, the portal arch, the security perimeter, and the parking lot. The exterior is *visible* and *testable* — a player can stand on the road and look at the portal from the outside before any interior work begins.

**Pass 2 — Tunnel (the J-curve, the side-branch, the airlock).** Build the access tunnel from the portal inward, segment by segment, with the blast door side-branch as the last segment. The visitor can *walk the tunnel* and reach the blast doors before any chamber work begins.

**Pass 3 — Chamber (the main array, the buildings, the interiors, the reservoir).** Build the chamber array from the *ceiling down* (carve the chamber space out of the mountain rock) and from the *entrance in* (the visitor's first view is the most important). Populate the buildings, the springs, the interiors, and the reservoir last.

### 1.2 Why outside-in, top-down

- **Testable at each stage.** The build is *playable* at every phase, not just at the end. A player can walk the road (Pass 1 done), then walk the tunnel (Pass 2 done), then enter the chamber (Pass 3 done).
- **Reversible mistakes are easier.** If a chamber detail is wrong, the surrounding mountain and tunnel are already in place — only the chamber needs to be rebuilt, not the whole complex.
- **Mirrors the real construction sequence.** The real complex was built outside-in: the mountain was hollowed first (1961-1964), the buildings were inserted (1963), the systems were activated (1966). The build should follow the same order.
- **Top-down (ceiling first, floor second).** Carving a chamber from above is structurally simpler than carving from below — gravity is the contractor's friend. The ceiling is *the mountain* (already in place after Pass 1). The contractor just removes the blocks they don't want.

### 1.3 Alternative considered: schematic-first

A schematic-first approach (build all 15 building shells in `/schematic` files, then place them with WorldEdit) is *faster* but loses the *testability* of outside-in. The build would only be testable at the very end. Rejected for this project because the *experience* of the build (the walk from the road to the chamber) is itself a deliverable.

### 1.4 Alternative considered: bottom-up

A bottom-up approach (chamber floor first, ceiling last) is structurally risky in Minecraft. If the chamber floor is placed before the ceiling, the contractor has no visual reference for the chamber *height*. Rejected.

---

## 2. Construction Phases (7 phases)

### Phase 1 — Site Prep & Mountain Shell

**Goal:** A forested multi-peaked mountain with a 1,400+ block ceiling above the future chamber level.

**Tasks:**
- Establish the build origin (X=0, Y=0, Z=0) at the future chamber floor
- Place the **chamber ceiling** (a flat `granite` slab at Y=chamber_ceiling, ~18-20 blocks above the future chamber floor)
- Place the **mountain shell** above the ceiling: 1,400+ blocks of `granite` + `pink terracotta` + `red terracotta` mix, with `stone` accents for variation
- Carve the **mountain silhouette**: 3 peaks, the central one highest, with rough-hewn cliff faces
- Add the **forest cover** on the surface: `spruce` + `oak` + `dark oak` trees, `coarse dirt` + `podzol` + `grass block` ground, `moss block` in shaded areas
- Add the **antenna arrays** on the ridgeline: 3-5 `lightning rod` + `chain` + `iron block` constructions
- Add the **exposed granite** on cliff faces: `granite` + `pink terracotta` patches in the cliff

**Estimated block count:** ~250,000 blocks (mostly the mountain mass)
**Estimated time:** 8-12 hours of bot work (with WorldEdit) or 40-60 hours of human work
**Dependencies:** Custom world with 1,024+ build height must be set up first.
**Risk areas:**
- The build height requirement (1,024+) — **must** be set up before any work begins. A vanilla 384-block world will not work.
- The mountain *look* — too smooth and it looks like a blob; too irregular and it looks fake. Aim for "natural-looking" via WorldEdit sphere brushes, not cubic block placement.

**Quality checkpoint:**
- Stand at the future parking lot and look at the mountain. The mountain should *look like a mountain*, with three visible peaks, trees, exposed rock, and antenna arrays on the ridges. The portal location should be a *small* dark mark on the east face, not visible from this distance.

### Phase 2 — The Approach (Road, Portal, Parking Lot)

**Goal:** A switchback road leading from the public road to a small parking lot, with the North Portal arch in the cliff face.

**Tasks:**
- Carve the **switchback road** in the east face of the mountain, ~150-200 blocks of `gravel` + `coarse dirt` surface
- Build the **retaining walls** along the road: `cobblestone wall` 1 block high
- Build the **parking lot** at the road's end: ~20×30 blocks of `coarse dirt` + `gravel`
- Build the **portal arch** in the cliff face at the parking lot: `light gray concrete` frame, `iron block` corner caps, 7 wide × 5 tall opening, `black concrete` void behind
- Build the **"CHEYENNE MOUNTAIN COMPLEX" lettering** above the arch: `light gray concrete` panel with `black wool` 3×5 letterforms
- Build the **speed-limit-15 sign** and **stop sign** at the portal
- Build the **security perimeter**: `iron fence` on both sides of the road, `chain` concertina wire on top
- Build the **guardhouse**: 3×3 `light gray concrete` + `glass pane` + `dark oak door`, with 1 `redstone lamp` inside
- Build the **Jersey barriers**: `smooth stone slab` rows
- Add the **parking lot details**: `oak fence` parking markers, signage, sidewalk

**Estimated block count:** ~3,000-5,000 blocks
**Estimated time:** 3-5 hours bot, 8-12 hours human
**Dependencies:** Phase 1 complete.
**Risk areas:**
- The portal arch must be *modest* — not imposing. A 7×5 opening is correct. A 15×10 opening would be wrong (the real complex's portal is small, by design).
- The lettering must be readable from the road. Use `black wool` 3×5 letterforms on `light gray concrete` — this is the *only* place the lettering appears, so the contractor should *test* the readability by walking the road.

**Quality checkpoint:**
- Walk the approach road from the public road to the parking lot. The road should *feel* like a mountain road — winding, gravel, forested, with the mountain looming.
- Stand in the parking lot and face the portal. The portal should be *small*, *unassuming*, with the lettering readable. The visitor should feel "is that it?" — the *paradox of the exterior*.

### Phase 3 — The J-Curve Tunnel (Segments A, B, C + Side-Branch)

**Goal:** An 800-block curved tunnel from the portal to the blast door side-branch, with three character stages (rough, concrete-lined, polished institutional).

**Tasks:**
- **Carve the tunnel** through the mountain rock: 5-6 blocks wide × 5-6 blocks tall × 800 blocks long, in the J-curve pattern (segment A: 200 blocks, segment B: 400 blocks, segment C: 200 blocks)
- **Stage 1 walls (blocks 0-200):** `granite` + `polished granite` + `pink terracotta` (raw rock)
- **Stage 2 walls (blocks 200-500):** `light gray concrete` on the lower 2-3 blocks, `granite` above
- **Stage 3 walls (blocks 500-800):** `light gray concrete` to ceiling
- **Ceiling rock bolts:** `iron bar` columns every 5-8 blocks, with `iron block` base plates
- **Floor:** `gravel` (Stage 1) → `polished andesite` (Stage 2) → `polished andesite` with `iron trapdoor` accent strips (Stage 3)
- **Pipes (Stages 2-3):** `green concrete` (water), `red concrete` (fire suppression), `yellow concrete` (fuel), `blue concrete` (compressed air), 1 block off the floor, 1 block thick, running the length
- **Cable trays (Stages 2-3):** `oak fence` + `chain` lines along the upper wall
- **Lighting:**
  - Stage 1: none / `redstone lamp` every 30 blocks
  - Stage 2: `redstone lamp` every 15 blocks
  - Stage 3: `end rod` every 8 blocks
- **Side niches (16 total):** 2×2×3 alcoves every 50 blocks, with `redstone lamp` + `sign` ("Niche 7" etc.) + `chest` for emergency supplies
- **Fire doors (Stage 3):** `light gray concrete` + `iron door` + `glass pane` porthole, every 100 blocks, with `sign` "FIRE DOOR — KEEP CLOSED"
- **Carve the side-branch** for the blast door: 4 wide × 4 tall × 30 long, off the north side of segment C, at the 750-block mark

**Estimated block count:** ~80,000-120,000 blocks (mostly the carved-out rock, replaced with air and walls)
**Estimated time:** 6-10 hours bot, 25-40 hours human
**Dependencies:** Phase 1 complete (the mountain must be in place to carve the tunnel through).
**Risk areas:**
- The *J-curve geometry* is the most error-prone part of the build. The contractor should use a **plotting script** (or a manual grid) to lay out the curve before carving. A 30°-per-100-block curve over 400 blocks is a 120° turn — easy to get wrong.
- The three-stage wall treatment requires *multiple passes* through the tunnel: first carve, then add Stage 1, then add Stage 2, then add Stage 3. Don't try to do it in one pass.
- The lighting plan must be *dim* but *navigable*. A torch-free tunnel that is too dark is a navigation hazard.

**Quality checkpoint:**
- Walk the entire tunnel from portal to side-branch. The visitor should *not* be able to see from one end to the other at any point (the J-curve achieves this).
- The wall character should change: rough at the start, concrete-lined in the middle, polished at the end. The visitor should *feel* the progression.
- The lighting should be dim but walkable. The visitor should feel *inside* the mountain.

### Phase 4 — The Blast Door Airlock

**Goal:** The cinematic moment. Two 2×-scaled iron doors in a side-branch, with an airlock chamber between them.

**Tasks:**
- Build the **airlock chamber**: 12 long × 8 wide × 6 tall, with `polished andesite` floor, `light gray concrete` walls, `redstone lamp` × 4 in the ceiling
- Build **Door 1** (the one the visitor sees first): 6 tall × 4 wide × 1 thick, `iron block` face with `black concrete` frame, `iron bars` chevron bracing, `iron bars` hinges, `chain` + `anvil` hand-crank
- Build **Door 2** (the chamber-side door): identical to Door 1
- **Default state:** both doors OPEN (the gap is the visitor's path)
- Add the **signage**: "AIRLOCK — DOOR 1 OF 2", "AIRLOCK — DOOR 2 OF 2 — CHAMBER ACCESS", "POSITIVE PRESSURE — KEEP DOORS CLOSED IN ALERT", "DURING COLD WAR: ONE DOOR ALWAYS CLOSED. CURRENTLY: BOTH OPEN."
- Add the **warning markings**: `red concrete` chevron stripes on the door face, "DANGER — BLAST DOOR" signs, "25 TONS — DO NOT BLOCK" signs
- Add the **chamber equipment**: 2 `chest` (Pressure Equalization, Emergency Seals), 1 `chain` column at the center

**Estimated block count:** ~500-800 blocks
**Estimated time:** 1-2 hours bot, 3-5 hours human
**Dependencies:** Phase 3 complete (the side-branch must be carved before the airlock can be built).
**Risk areas:**
- The 2× scaling must be *visibly larger* than the tunnel. If the door is the same height as the tunnel, the visitor doesn't register it as a door.
- The door must be *angled outward* (the "blast pressure seals it tighter" detail). Use `iron block` stair blocks for the angle.
- The hand-crank must be *visible* on the door's right side — a `chain` column with an `anvil` at the top.

**Quality checkpoint:**
- Walk from the tunnel into the airlock, through Door 1, into the chamber, and out through Door 2. The visitor should *feel* the threshold moment.
- Look back from the chamber entrance at the open airlock. The two doors should *frame* the tunnel mouth in the distance. This is the postcard shot.
- The chevron bracing and hinges should be visible from 5+ blocks away. If they're not, the door reads as a flat iron-block wall.

### Phase 5 — The Main Chamber (Walls, Ceiling, Floor, Springs, Building Shells)

**Goal:** The 45×25 chamber array, with 15 building shells on visible spring arrays.

**Tasks:**
- **Carve the chamber** out of the mountain rock: 45 long × 25 wide × 18 tall, with the 3 main chambers (7 wide each) and 4 cross tunnels (5 wide each)
- **Chamber floor:** `polished andesite` for main paths, `iron trapdoor` for service paths, `black concrete` for the spring-display areas under each building
- **Chamber ceiling:** `granite` + `polished granite` + `pink terracotta` (bare rock) with `iron bar` rock bolts, `light gray concrete` patches for the 1962 fault repair
- **Chamber walls:** `granite` + `pink terracotta` mix, with `light gray concrete` patches, `green/red/yellow/blue concrete` pipe runs along the lower 2 blocks, `oak fence` + `chain` cable trays along the upper wall
- **Lighting:**
  - Ceiling: `end rod` strips every 6 blocks
  - Cross-tunnel intersections: `redstone lamp` clusters
  - Walkway accents: `soul lantern` every 8 blocks
  - Building entrances: `redstone lamp` + building-name sign
- **Walkways:** 1-block-wide `iron trapdoor` paths between buildings, with `iron fence` railings
- **The 1980 false alarm placard:** in the Battle Cab (placed in Phase 6 with the interiors)
- **The 1,319 springs (the signature):**
  - 4-6 visible spring columns per building at 2× scale (`iron block` base + `chain` coil + `anvil` top + 1-block air gap)
  - The cross-section building (B7) shows the full spring stack
  - The ambient sway contraption on B7 (slime block + piston + observer, subtle 0.5-block lateral shift every 30-60s)
  - The "1,319 springs" master sign at the chamber entrance
- **Building shells (15 total):**
  - **3-story (12):** 10×6 footprint × 9 tall, `light gray concrete` walls, `polished andesite` floors, `iron door` entrances, `redstone lamp` ceiling strips
  - **2-story (3):** 10×6 × 6 tall, same construction
  - **Battle Cab (B1):** 14×8 × 11 tall, the largest, with bigger windows-onto-the-chamber (none, but the entrance is wider)
  - **Cross-section building (B7):** 10×6 × 9 tall, with the south wall removed to show the springs
  - **Signage at each entrance:** `oak wall sign` with "B-XX / BUILDING NAME"
- **The chamber entrance / "1,319" sign:** A 4-block-wide `oak wall sign` at the chamber entrance reading "1,319 SPRINGS — INSTALLED 1964 — NEVER REPLACED"

**Estimated block count:** ~40,000-60,000 blocks
**Estimated time:** 10-15 hours bot, 40-60 hours human
**Dependencies:** Phases 1-4 complete.
**Risk areas:**
- The chamber *carving* is the largest single block-removal operation in the build. Use WorldEdit or bot-driven `/fill` with `air` for speed.
- The spring array is the *signature* — it must be visible and *correct*. 4-6 springs per building is the visible portion, but the *count* sign must be honest. The visitor should be able to *count* the visible springs and read the sign saying "88 springs" — and the math should work out (88 × 15 = 1,320, but the actual total is 1,319 because of an engineering rounding; use 88 × 15 = 1,320 and a small note "±1 — exact count: 1,319").
- The cross-section building must be *clearly* a cross-section. The south wall removed is a *deliberate* architectural choice, not a build error.
- The ambient sway must be *subtle*. If the building lurches visibly, it reads as a glitch, not as a feature.

**Quality checkpoint:**
- Stand at the chamber entrance and look in. The visitor should see: the 15 buildings in their grid, the visible springs, the walkways, the rough rock ceiling, the cable runs, the dim institutional lighting. The "industrial cathedral" feeling.
- Walk between the buildings on the 1-block walkways. The springs should be *visible* under each building as the visitor passes.
- Visit the cross-section building (B7) and confirm the spring stack is fully visible.

### Phase 6 — Building Interiors (Battle Cab First, Then the Rest)

**Goal:** All 15 building interiors, with the Battle Cab as the visual climax.

**Tasks (in order):**
1. **Battle Cab (B1)** — the climax, do this first
   - `blue wool` floor
   - The wall of displays (the 2× signature detail): item-frame-mosaic world map (5×2), status panel (5×2), 7 `clock` blocks with time-zone `sign` labels, the "WELCOME TO THE NORAD COMMAND CENTER" `red concrete` ticker
   - The U-shape of 6 `note block` consoles, 6 `light gray wool` chairs
   - 1 `soul lantern` over the 1980 false alarm plaque
   - The 1980 plaque itself: 3×2 `light gray concrete` panel with `black wool` letterforms
   - The room's dim `redstone lamp` ceiling
2. **The 4 other ops centers (B2, B3, B4, B5)** — family resemblance to Battle Cab, smaller and simpler
3. **The 5 middle-chamber support buildings (B6, B7, B8, B9, B10)** — server racks, briefing rooms, offices
4. **The 5 south-chamber buildings (B11, B12, B13, B14, B15)** — medical, server (with the 1980 secondary plaque and the WOPR terminal), dental, chapel, Granite Inn
5. **The Stargate door** — between B2 and B3, second-floor back corridor
6. **The WOPR terminal** — in B12, back corner
7. **The Chrystal Palace sign** — back corridor between B12 and B13
8. **The MrBeast sign + gold block** — in the Granite Inn, back wall
9. **The "DEAD AIR" sign** — main tunnel, 400-block mark

**Estimated block count:** ~5,000-8,000 blocks
**Estimated time:** 6-10 hours bot, 20-30 hours human
**Dependencies:** Phase 5 complete.
**Risk areas:**
- The Battle Cab is the *climax* — every detail matters. The wall of displays is a 2× signature detail; do not shortcut it.
- The 1980 plaque text is *long* (200+ characters). Use the design-plan's full text. Do not abbreviate.
- The Granite Inn is the *only* warm-lit room — the contractor should test that the `shroomlight` is actually warm (not too dim, not too bright) before moving on.
- The cross-section building (B7) is a *cross-section*, not a full building. The contractor should not "fill in" the missing south wall by mistake.

**Quality checkpoint:**
- Enter the Battle Cab. The wall of displays should *dominate* the room. The 1980 plaque should be *readable* on the first visit. The U-shape of consoles should be *clearly* a U. The lighting should be *dim with the screens as the bright spots*.
- Visit all 4 other ops centers. Each should be *recognizably different* (B2 radar, B3 missile status with the 1979 plaque, B4 star map, B5 briefing).
- Visit the Granite Inn. The warm light should be *immediately noticeable* as the visitor enters. The chalkboard should be readable.
- Visit the chapel. The quiet should be *felt* (in build terms: the warm `shroomlight` should be the only light, and the visitor should want to stop).
- Find the Stargate door. It should be in a back corridor, easy to miss, delightful to find.
- Find the WOPR terminal. The "GREETINGS PROFESSOR FALKEN" sign should be readable, the movie-reference label should be clear.

### Phase 7 — The Reservoir, Finishing, Lighting Tuning, Polish

**Goal:** The underground lake (the contemplation room), final lighting tuning, signage review, and the play-through.

**Tasks:**
- **Carve the reservoir** below the chamber: 30 long × 20 wide × 8 deep, `dark prismarine` walls
- **Fill with water:** `water` source blocks filling the lower 5 blocks
- **Build the causeway:** 2-wide `polished andesite` walkway along the north wall, 1 block above the water, with `iron fence` railings
- **Build the stairway** from the chamber floor down to the causeway
- **Place the boat:** `oak boat` in the center of the reservoir, optionally with a `chest` inside
- **Reservoir lighting:** `soul lantern` at each ceiling rib (every 10 blocks), `soul lantern` on the causeway (every 8 blocks)
- **Reservoir signage:** `sign` at the causeway entrance reading "RESERVOIR — 1.5 MILLION GALLONS / WATER SUPPLY: NATURAL MOUNTAIN SPRINGS / BOAT: FOR AUTHORIZED INSPECTION ONLY"
- **Add the seasonal banner (optional):** "NORAD TRACKS SANTA — DECEMBER 24 — SINCE 1955" above the chamber entrance
- **Lighting tuning pass:** walk every zone, adjust `redstone lamp` / `end rod` / `soul lantern` density, confirm the "dim institutional" feel in the main path, the "warm contrast" feel in the Granite Inn
- **Signage review:** walk every zone, check that every `sign` is readable from the visitor's natural path
- **The final play-through:** the contractor (or a human tester) walks the full path: approach road → portal → tunnel → blast doors → chamber → Battle Cab → 4 ops centers → support rooms → chapel → Granite Inn → reservoir. The build should be *experienced* in 20-30 minutes.

**Estimated block count:** ~2,000-4,000 blocks
**Estimated time:** 3-5 hours bot, 8-12 hours human
**Dependencies:** Phases 1-6 complete.
**Risk areas:**
- The reservoir water is *still*. If a stray block creates a current, the water will flow and ruin the "still lake" feel. Test for currents before finalizing.
- The reservoir lighting is the *quietest* in the build. If the soul lanterns are too bright, the reservoir reads as a regular room, not a contemplation space.
- The play-through is the *final* quality check. The contractor should not skip it.

**Quality checkpoint:**
- Boat across the reservoir. The visitor should feel the *quiet*.
- The full play-through, 20-30 minutes. The build should be *experienced*, not just *seen*. The visitor should feel: "I have been inside something built to outlast me."

---

## 3. Tools & Workflow

### 3.1 Schematic-based or in-place?

**Both, in different phases.**

- **Phase 1 (mountain shell):** Schematic-based. Use WorldEdit sphere brushes to generate the mountain shape. The mountain is a *form*, not a series of details.
- **Phase 2 (portal, approach):** In-place. The portal is a *feature* — the lettering, the guardhouse, the fence. Build it in place, not from a schematic.
- **Phase 3 (tunnel):** Schematic-based for the *carving* (use `/fill` with `air` to carve the tunnel shape), then in-place for the *finishing* (pipes, lighting, niches).
- **Phase 4 (blast doors):** In-place. The doors are a *feature*.
- **Phase 5 (chamber):** Schematic-based for the *carving*, then in-place for the *finishing* and the *building shells*.
- **Phase 6 (interiors):** In-place, building by building. The interiors are *features*.
- **Phase 7 (reservoir, finishing):** In-place.

### 3.2 Use of `/fill`, WorldEdit, schematic placement

- **`/fill` with `air`:** for tunnel and chamber carving. Fast and reliable.
- **WorldEdit sphere/cylinder brushes:** for the mountain shape, the chamber ceiling, the antenna arrays.
- **WorldEdit copy/paste:** for the 15 building shells (build one, copy 14 more, customize each).
- **Schematic files (.schem or .schematic):** for the master chamber array, the tunnel, the building shells. Saves the build state for later modifications.
- **In-place placement:** for the *features* (the portal, the blast doors, the Battle Cab, the easter eggs).

### 3.3 Bot-based or human?

**Both, with bot for the mass work and human for the features.**

The mc-fleet-bot framework is designed for this. Use:
- **Bot construction workers** for: mountain shell, tunnel carving, chamber carving, building shell placement, lighting, pipe runs, walkways.
- **Bot or human "feature builders"** for: the portal arch, the lettering, the blast doors, the Battle Cab interior, the easter eggs.
- **Human review** for: the final play-through, the lighting tuning, the signage review.

### 3.4 Custom tooling needed

- **A curve-planning script.** The J-curve geometry is the most error-prone part. A Python or JavaScript script that plots the 800-block curve and outputs the `//pos1`/`//pos2` WorldEdit commands would save hours.
- **A spring-counting script.** The 1,319 spring count is the build's signature. A script that confirms the visible-spring count per building and the total adds up to 1,319 (or to 1,320 with a "±1" note) is a quality-check.
- **A lighting-audit pass.** A bot that walks every zone and reports the `redstone lamp` density, the `end rod` density, the `soul lantern` density, with warnings for "too dim" or "too bright" zones.

---

## 4. Quality Checkpoints (Per Phase)

| Phase | Checkpoint | Pass criteria |
|---|---|---|
| **1** | Stand at the parking lot, look at the mountain | The mountain looks like a mountain. The portal is a small mark on the east face. Trees, antennas, exposed rock visible. |
| **2** | Walk the approach road | The road feels like a mountain road. The portal is small. The lettering is readable. |
| **3** | Walk the tunnel | The visitor cannot see from one end to the other. The wall character changes (rough → concrete → polished). Lighting is dim but walkable. |
| **4** | Walk through the airlock | The doors are imposing. The visitor feels the threshold. The postcard shot (looking back from the chamber) is iconic. |
| **5** | Stand at the chamber entrance, look in | The 15 buildings are visible in a grid. The springs are visible. The walkways are clear. The "industrial cathedral" feeling is present. |
| **6** | Enter the Battle Cab | The wall of displays dominates. The 1980 plaque is readable. The U-shape of consoles is clearly a U. The lighting is dim with the screens as bright spots. |
| **7** | The full play-through, 20-30 minutes | The build is *experienced*. The visitor leaves with: the geometry, the engineering, the history, the feeling. |

### 4.1 Visual review against the reference images

The contractor should have the visual reference images open during the build. The gold references are:
- **`exterior/9.jpg`** — the North Portal hero shot
- **`schematics/2.jpg`** — the cutaway with the 15 buildings
- **`interior/5.jpeg`** — the Battle Cab vintage shot
- **`interior/0.jpg`** — the spring isolators construction photo
- **`satellite/6.jpg`** — the approach map

The build should *match* these images at the 4:1 horizontal / 2:1 vertical / 2× signature-detail scale. If the build drifts from the references, the contractor should pause and re-align.

### 4.2 Path / navigation test

After Phase 5, the contractor should walk the *full visitor path*: approach road → portal → tunnel → blast doors → chamber → Battle Cab → 4 ops centers → support rooms → chapel → Granite Inn → reservoir. The path should be *clear* (no obstacles, no dead ends, no missing bridges) and *navigable* (the visitor knows where to go at every step).

### 4.3 Easter-egg accessibility test

After Phase 6, the contractor should *find* every easter egg: the Stargate door, the WOPR terminal, the Chrystal Palace sign, the MrBeast sign, the 1980 secondary plaque, the DEAD AIR sign, the seasonal banner. Each should be *findable* by an explorer (not a secret room requiring redstone), but *not on the main path* (the visitor has to *look* for them).

---

## 5. Risk Register

### 5.1 Things that could go wrong

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| **Build height too low (vanilla 384)** | High if not addressed | Critical — build cannot proceed | **Set up the custom world / mod with 1,024+ build height BEFORE any work begins.** This is a hard prerequisite. |
| **Mountain too smooth / fake-looking** | Medium | High — kills the "natural mountain" feel | Use WorldEdit sphere brushes, not cubic placement. Add variation via `granite` + `pink terracotta` + `red terracotta` mixing. Reference satellite imagery for natural patterns. |
| **Tunnel curve wrong / too straight** | High | High — kills the "you cannot see the end" effect | Use the curve-planning script (see §3.4). Test the curve in a *small* section first (200 blocks), then expand. |
| **Chamber too small / buildings don't fit** | Medium | High — the 15 buildings don't fit, build fails | Verify the 10×6 building footprints + 1-block walkways + 7-block-wide chambers fit in the 25-block total width *before* carving. Adjust chamber widths if needed. |
| **Springs not visible / too small** | Medium | High — the signature is invisible | Use the 2× scaled spring (4 blocks tall: `iron block` + 2-3 `chain` + `anvil`). Place 4-6 visible per building, not 1-2. Add the "1,319" master sign. |
| **Battle Cab wall of displays too sparse** | High | High — the climax is underwhelming | The wall of displays is a 2× signature detail. Use 5×2 item-frame mosaics (not 3×2). 7 clocks (not 4). The full "WELCOME" ticker. |
| **1980 plaque text abbreviated** | Medium | High — the most important real-history detail is lost | Use the *full* text from design-plan §12.4. Do not summarize. The Veteran specifically requested full text. |
| **Warm light in the wrong place** | Medium | Medium — kills the "dead air" feel | The `shroomlight` rule: Granite Inn + Chapel only. The main path is *only* `redstone lamp` / `end rod` / `soul lantern`. Audit at Phase 7. |
| **Stargate door too elaborate** | High | Medium — the joke is overdone | One door. One sign. One empty room behind it. Nothing else. |
| **Easter eggs on the main path** | Medium | Medium — the hierarchy breaks | Real history on the main path. Fiction *off* the main path. The 1980 plaque is in the Battle Cab. Everything else is in back corridors. |
| **Reservoir water flowing** | Low | Medium — the "still lake" feel is broken | Test for currents before finalizing. If a stray block creates a flow, fix it. |
| **Build performance / chunk loading** | High if the world is large | Medium — the build is laggy | Limit the build footprint to ~100×100 chunks. The 800-block tunnel + 45×25 chamber + 1,450-block mountain is already a large world. |
| **Player gets lost in the tunnel** | Medium | Medium — the build is frustrating | Add `sign` arrows at the cross-tunnel intersections in the main chamber. The yellow `concrete` line on the chamber floor marks the main E-W axis. |

### 5.2 The vertical build height requirement (1,024+)

**This is the single largest technical risk.** Vanilla Minecraft has a 384-block build height. The deliberation requires a 1,450-block-tall mountain, which needs a 1,024+ build height. **The build cannot proceed without this.**

Options:
- **Mod: Cylinder / extended height.** The simplest option. Install a mod that raises the build height to 1,024 or higher.
- **Custom superflat with extended height.** Possible, but the world is then superflat outside the mountain.
- **Custom world generation.** More complex, but allows the surrounding terrain to be normal.

**Recommendation:** Use a *mod* for the build height extension. The mc-fleet-bot framework should support this. The contractor should verify the build height is at least 1,024 *before* any work begins, and document the mod/version used.

### 5.3 The 1,024+ build height dependency

| Build height | Status |
|---|---|
| 384 (vanilla) | **Insufficient.** Build cannot proceed. |
| 512 | Insufficient. |
| 1,024 | **Sufficient** (matches the deliberation's requirement). |
| 2,048 | More than sufficient. Preferred for the long-term build. |
| 4,096+ | Overkill. Not needed. |

**Verification step (before Phase 1):** Place a block at Y=1,024 and confirm it is placeable. If not, fix the world/mod before proceeding.

---

## 6. Build Statistics (Estimate)

| Phase | Blocks placed | Time (bot) | Time (human) |
|---|---|---|---|
| **1: Mountain shell** | ~250,000 | 8-12 hrs | 40-60 hrs |
| **2: Approach** | ~4,000 | 3-5 hrs | 8-12 hrs |
| **3: Tunnel** | ~100,000 (incl. carved-out) | 6-10 hrs | 25-40 hrs |
| **4: Blast doors** | ~700 | 1-2 hrs | 3-5 hrs |
| **5: Chamber + shells** | ~50,000 | 10-15 hrs | 40-60 hrs |
| **6: Interiors** | ~7,000 | 6-10 hrs | 20-30 hrs |
| **7: Reservoir + finishing** | ~3,000 | 3-5 hrs | 8-12 hrs |
| **TOTAL** | **~415,000 blocks** | **37-59 hrs** | **144-219 hrs** |

**For 1 human working full-time:** ~3-5 weeks of focused build time.
**For a bot fleet of 4-6 bots working in parallel:** ~1-2 weeks of bot time, with human review.

---

*End of working plan. Hand off to the AI Contractor Writer for block-by-block execution. The build statistics are estimates; the actual block counts will vary with the contractor's choices.*
