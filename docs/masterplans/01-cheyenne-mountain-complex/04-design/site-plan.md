# Cheyenne Mountain Complex — Site Plan

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Build ID:** `01-cheyenne-mountain`
**Stage:** 04 — Site Planning (macro site design)
**Status:** Binding for the Architectural Designer and AI Contractor Writer

This document defines **where the build sits, how the terrain arranges, and what the visitor sees as they approach**. It is the macro layer; building-by-building design is downstream.

---

## 1. Site Overview

The Cheyenne Mountain Complex is a hollowed-out granite mountain — 1,450 blocks tall, carved into a 600 × 800 block footprint, with a single curved access tunnel driven into the north face. From the outside, the build is a typical Rocky Mountain foothill: forested, three-peaked, anonymous. Antenna arrays on the ridgeline, a small parking lot at the base, a security gate, and a switchback road up to a small concrete-and-steel arch in the cliff face that looks, at first glance, like a maintenance entrance to a state park. The world above is calm, forested, ordinary. The world below is a city of 15 free-standing steel buildings on 1,319 half-ton coil springs, lit by fluorescent tubes, humming under 2,000 feet of compressed granite.

In the **combined-complex layout**, the Cheyenne Mountain build sits on the **north side of a deep ravine/gorge**, with SubTropolis on the south side and the city in the valley between. A service tunnel through the ravine connects the two underground installations, and a public shaft / funicular connects the Cheyenne exit down to the city.

**World origin:** `(0, 64, 0)` — sea level, centered on the mountain's vertical axis.
**Compass orientation:** `north = -Z`, `east = +X`, `up = +Y`.
**Build height required:** 1,514 blocks (1,450 of mountain + buffer above peak). Vanilla 384 is insufficient. Modded world with **1,550+ build height** is mandatory.

---

## 2. Terrain & Geology (Minecraft-Translated)

### 2.1 The mountain

| Property | Value | Source / rationale |
|---|---|---|
| **Total height** | 1,450 blocks | Real: 9,565 ft / 2,915 m. At 2:1 vertical, ≈1,458 blocks; rounded to 1,450. Locked by deliberation Topic 1. |
| **Base elevation** | y=64 (sea level) | Vanilla sea level |
| **Peak elevation** | y=1,514 | 64 + 1,450 |
| **Footprint** | ~600 × 800 blocks (X × Z) | Real mountain ~2,400 × 3,200 m at 4:1 horizontal ≈ 600 × 800. Asymmetric: broader on the north (3 peaks visible from below). |
| **Peaks** | 3 — north, central (highest), south | Cheyenne Mountain is a three-peaked foothill. The central peak is the highest and the antenna arrays sit on its ridgeline. |
| **Composition** | Pink-to-brick-red Pikes Peak granite | Real mountain is syenogranite with pink microcline feldspar. In Minecraft: **red granite, pink terracotta, polished andesite with pink accents** as substitutes. See §8 for full palette. |
| **Vertical compression** | 2:1 | 1 block = 2 m. Locked by deliberation Topic 1. |
| **Horizontal compression** | 4:1 | 1 block = 4 m. Locked by deliberation Topic 1. |
| **Required build height** | ≥1,550 | Vanilla 384 insufficient. Mod (CubicWorld / MCHigher / similar) or custom superflat with extended build height mandatory. |

### 2.2 Surrounding terrain

| Feature | Minecraft translation | Notes |
|---|---|---|
| **Forest at the base** | Oak, spruce, dark oak mix; tall grass, ferns, podzol patches | Ponderosa pine ≈ spruce. Scrub oak ≈ oak. The forest cover extends ~50–80 blocks from the mountain base before thinning into the valley. |
| **Ravine (south of mountain)** | A deep V-shaped gorge, 300–400 blocks wide, ~200 blocks deep | The ravine runs east-west (along the +X axis). The mountain sits on the **north** lip of the ravine. The city and SubTropolis are on the south side. |
| **Neighboring mountains** | A low foothill range to the west and east | Visual reference for the Front Range setting. Smaller than the main mountain (~400–600 blocks tall). |
| **Approach road** | From the south/southwest, switching back up to the parking lot | The "public approach" — first thing the visitor sees. Gravel / coarse dirt / podzol. The road winds through forest for ~600 blocks before reaching the gate. |
| **Antenna arrays on the ridgeline** | 3–5 tall thin structures (iron block columns with lightning rods, ~30–50 blocks tall) on the central and south peaks | These are the only obvious surface feature visible from the city. Deliberately non-anonymous — they are part of the visual identity. |
| **Small parking lot at the base** | Flat gravel / cobblestone area, ~30 × 40 blocks, near the security gate | Holds maybe 6–8 "vehicles" (horse / minecart props). Real parking lot is "halfway up the mountain," but in compressed scale, the parking lot is at the base of the cliff where the approach road ends. |
| **Other surface features** | Cut per deliberation Topic 2: no Mountain Man Park, no racquetball court, no parade grounds (parade grounds flagged for user — see §10) | Surface campus is *deliberately anonymous*. The mountain "was designed to look like a mountain. It succeeded." |

### 2.3 Mountain mass and the "weight above" feeling

The 1,450-block mountain is the entire engineering point of the place. At 2:1 vertical compression with the chambers at y≈1,200 (see §4), the rock cover above the chamber ceiling is ~300 blocks (~2,000 ft at 2:1). The player should feel, walking into the chamber, that there is a *lot* of mountain overhead. The chamber ceiling is bare pink granite; the visitor's first look up is the mountain itself, pressing down.

---

## 3. Site Layout — Above-Ground Features

The above-ground build is **deliberately minimal**. The exterior is the *absence* of a complex.

### 3.1 Approach road (the public approach from the city)

- **Origin:** Public entrance gate at `(0, 80, -900)` — at the base of the mountain, on the north side, near the south edge of the parking lot.
- **Path:** Switchback up the north face of the mountain, climbing from y=80 to ~y=600 (the parking lot at the base of the cliff where the portal sits).
- **Length:** ~600 blocks of switchback road (4:1 horizontal compression of the real 1.5-mile approach).
- **Surface:** Coarse dirt, gravel, podzol. Path blocks (vanilla) along the edges.
- **Markings:** None. The road looks like a forest service road, not a military installation.
- **Lighting:** None — this is a daytime approach.

### 3.2 Parking lot and security gate

- **Location:** `(-200, 600, -850)` to `(200, 620, -780)` — a flat gravel area on a shelf partway up the north face, ~40% up the mountain. This is the public terminus of the approach road.
- **Dimensions:** ~40 × 70 blocks of cleared, leveled terrain.
- **Features:**
  - Security gate: chain-link fence (iron fence) with a checkpoint trailer (small oak building, 6 × 8 blocks).
  - Stop sign, speed-limit-15 sign, "MANDATORY USE OF HEADLIGHTS" sign.
  - 6–8 vehicle-sized spaces (decorative minecarts or horses).
  - A single small guardhouse at the downhill side of the lot.
  - A narrow access road continuing uphill from the lot to the portal arch (~200 blocks of switchback, climbing another ~400 blocks of elevation).

### 3.3 The North Portal (exterior)

- **Location:** `(0, 1,100, -500)` — set into the cliff face on the north side of the central peak, ~70% up the mountain. Faces north.
- **Form:** A small concrete-and-steel arch, ~5 blocks wide × 4 blocks tall (with 2× signature-detail scaling per Topic 1, so it reads as imposing on a 1:1 player scale even though it's small relative to the mountain).
- **Materials:** Light grey concrete frame, iron-block door, polished andesite accents.
- **Signage (build spec):**
  - "CHEYENNE MOUNTAIN COMPLEX" — black lettering on the arch, 1 block tall, spanning the archway. Banner or item-frame mosaic.
  - "SPEED LIMIT 15" sign (oak sign or item frame) below the lettering.
  - "MANDATORY USE OF HEADLIGHTS" sign (oak sign) below that.
  - "ALTERNATE JOINT OPERATIONS CENTER" small plaque to the side (current operational designation).
- **Perimeter:** Chain-link fence (iron fence) flanking the arch on both sides for ~30 blocks. Concertina wire (chains) on the cliff above.
- **Jersey barriers:** A few concrete blocks forming a chicane in front of the arch.

### 3.4 The North Portal approach road (final switchback)

- **From the parking lot (`y=600`)** to the portal (`y=1,100`): a final switchback, ~200 blocks long, climbing 500 blocks of elevation. This is a 1:0.4 grade — very steep, but appropriate for a final security-clearance road in a compressed-scale build. In real life this section is gated, narrow, and twisty.
- **Surface:** Smooth stone or light grey concrete (transitioning from the gravel approach).
- **Lighting:** Redstone lamp posts every 20 blocks, dim.

### 3.5 Antenna arrays on the ridgeline

- **Count:** 5 antennas (3 on the central peak, 1 on the north peak, 1 on the south peak).
- **Form:** Iron-block columns 20–40 blocks tall, topped with lightning rods. Each antenna sits on a small concrete pad.
- **Locations (approximate):**
  - Central peak: 3 antennas in a triangle around the summit, at `(-50, 1,500, 0)`, `(50, 1,500, 0)`, `(0, 1,500, 50)`.
  - North peak: 1 antenna at `(-100, 1,400, -400)`.
  - South peak: 1 antenna at `(100, 1,400, 200)`.
- **Associated structures:** Small equipment shacks (oak buildings, 4 × 6 blocks) at the base of each antenna. Service paths (gravel) connecting them.

### 3.6 Above-ground support buildings (minimum)

Per deliberation Topic 2, the surface campus is cut to a minimum. The only above-ground support buildings are:

- **Security checkpoint trailer** — at the parking lot gate (see §3.2).
- **Generator building** — a small concrete-and-steel structure (10 × 12 × 6 blocks) on a shelf below the central peak, at `(-200, 800, -200)`. Pumping house for backup power, with 2 visible exhaust stacks and a fuel-tank silhouette.
- **Pump house** — a small concrete structure (8 × 10 × 5 blocks) lower on the mountain, at `(200, 500, -300)`. Water-pump equipment for the natural spring water system.

These three are the visible "this is a military installation" surface features beyond the antennas. Everything else is hidden.

### 3.7 Forest composition

- **Tree species mix:** 60% spruce (ponderosa pine equivalent), 30% oak (scrub oak), 10% dark oak (mature stands).
- **Density:** Thick at the base of the mountain, thinning with elevation. Tree line at ~y=1,300 (about 85% up the mountain). Above the tree line: bare rock with patches of tall grass and coarse dirt.
- **Undergrowth:** Tall grass, ferns, sweet berry bushes (low scrub), poppies and azure bluets (wildflowers).
- **Fallen logs:** A few dark oak logs lying on the ground (forest texture detail).
- **Wildlife (decorative):** A few chickens and cows wandering near the parking lot (the research notes "wild animals" near the complex; the design intent is "this place is part of a real landscape, not a sterile installation").

---

## 4. Site Layout — Below-Ground (the Build)

The below-ground layout is the heart of the build. This is where the visitor spends 20–30 minutes.

### 4.1 Origin point

- **The portal entrance** is the build origin: `(0, 1,100, -500)`. From the moment the visitor steps through the arch, they are inside the build.

### 4.2 The J-curve access tunnel

- **Length:** ~800 blocks.
- **Path (J-curve):**
  1. **Leg 1 (south):** From portal `(0, 1,100, -500)` going south, gradually descending. By `(0, 1,180, -300)` the tunnel is at y=1,180, having dropped 80 blocks. The curve is gentle — the visitor cannot see the far end. Length: ~200 blocks.
  2. **Bend 1 (east):** At `(0, 1,180, -300)`, the tunnel turns east. The bend is a smooth 90° curve, ~30 blocks long. The first blast doors are visible on a side-branch *just before* the bend.
  3. **Leg 2 (east):** From `(0, 1,180, -300)` going east to `(300, 1,196, -300)`. Mostly level, with a slight ascent to reach the chamber elevation. Length: ~300 blocks.
  4. **Bend 2 (south):** At `(300, 1,196, -300)`, the tunnel turns south. Smooth curve, ~30 blocks. The visitor can now sense the chamber ahead — the tunnel widens slightly, the ceiling rises.
  5. **Leg 3 (south):** From `(300, 1,196, -300)` going south to `(50, 1,196, 200)`. The tunnel widens further; the chamber becomes visible at the end. Length: ~300 blocks. (Total so far: ~860 blocks; the deliberation says ~800, so this is approximate — the Architectural Designer can fine-tune.)
  6. **Chamber entry:** At `(50, 1,196, 200)`, the tunnel opens into the main chamber.

- **Tunnel cross-section:** 5 wide × 4 tall (player-sized with headroom). At compressed scale, this represents ~20 m × 16 m — slightly larger than the real 22.5 ft × 29 ft / 6.9 × 8.8 m. The 2× signature-detail scaling makes the tunnel feel "real" without being claustrophobic.
- **Tunnel walls:** Pink-and-grey granite (the "rough-hewn" look), with rock bolts (iron trapdoors or iron bars) visible in the ceiling. Exposed pipes along the walls in green, red, yellow, blue (color-coded utility runs). Light grey concrete floor.
- **Tunnel lighting:** Redstone lamp strips every 10 blocks, dim (level 7). The visitor's eyes should adjust as they descend.

### 4.3 The blast doors (side-branch)

- **Location:** A side-branch off Leg 1 of the tunnel, at `(-100, 1,170, -250)` — ~250 blocks into the tunnel, on the left side, *before* Bend 1. This is the "cinematic reveal" of the build.
- **Configuration (per deliberation Topic 2):**
  - The side-branch is a short tunnel (10 blocks long) that branches off the main tunnel at a slight angle.
  - **First blast door:** A 5 × 4 iron-block door, hinged outward, with visible iron-bar hinges, a hand-crank mechanism (anvil or heavy weighted pressure plate), and a "CLEARANCE 10FT 5IN" sign on the crossbeam. The door is open in the build (post-1992 status).
  - **Airlock chamber:** A 5 × 5 × 4 chamber between the two doors. Dim redstone lamp lighting. The airlock concept is conveyed by the geometry.
  - **Second blast door:** A second 5 × 4 iron-block door, identical to the first, also open.
  - **Backlit atmosphere:** The doors should *loom*. A single redstone lamp in the airlock chamber provides backlight.
- **Scaling:** 2× signature-detail per Topic 1, so the doors read as imposing on player scale.
- **Signage (build spec):**
  - "BLAST DOOR — 25 TONS — 30 MT @ 1.2 MI" (oak sign).
  - "BLAST VALVE TESTED DAILY" (oak sign).
  - "CLOSED 11 SEPTEMBER 2001" — historical reference plaque.

### 4.4 The main chamber complex

- **Location:** The chamber occupies a 45 × 25 × 18 block volume, centered at `(0, 1,205, 50)`.
- **Coordinates:**
  - Floor: y=1,196
  - Ceiling: y=1,214
  - X: -22 to +23 (45 wide)
  - Z: 38 to 63 (25 deep)
- **Rock cover above ceiling:** 1,514 - 1,214 = 300 blocks (~2,000 ft at 2:1 vertical compression). Locked by deliberation Topic 3.
- **Form:** A single rectangular chamber (the deliberation says "3 parallel main tunnels intersected by 4 cross tunnels" in real life; in the compressed build, this is rendered as **one larger unified chamber** with the 15 buildings arranged in a 5×3 grid inside). The cross-tunnels are suggested by the building arrangement and by subtle floor markings.
- **Ceiling:** Bare pink granite. Rock bolts visible. One small concrete-dome repair (a poured-concrete arch, 6 × 6 blocks) — a reference to the 1962 fault-repair dome.
- **Floor:** Light grey concrete (smooth stone slab variant) with industrial metal grating (iron trapdoors) in service areas.
- **Lighting:** Redstone lamp strips in the ceiling, dim. The chamber is lit but quiet.

### 4.5 The 15 free-standing buildings (the money shot)

- **Layout:** 5 columns × 3 rows = 15 buildings, arranged in a grid inside the chamber.
- **Column spacing:** 8 blocks center-to-center (buildings ~6 wide with 2-block walkways).
- **Row spacing:** 7 blocks center-to-center (buildings ~5 deep with 2-block walkways).
- **Building composition:** 12 three-story (15 blocks tall total including the spring base) + 3 two-story (11 blocks tall).
- **18-inch clearance:** Each building is 1 block away from any rock wall or adjacent building. The 0.5-block (4:1 of 18 inches ≈ 0.5 m) clearance is shown as a 1-block gap in compressed scale (signature-detail scaling).
- **Building positions (rough, from northwest corner of chamber):**

| ID | Type | Function | Approx position (X, Y, Z) | Notes |
|---|---|---|---|---|
| 1 | 3-story | Air Defense Operations Center | (-18, 1,197, 41) | NW corner |
| 2 | 3-story | Missile Warning Center | (-10, 1,197, 41) | |
| 3 | 3-story | Space Control Center | (-2, 1,197, 41) | |
| 4 | 3-story | Combined Intelligence Watch | (6, 1,197, 41) | |
| 5 | 3-story | (Support / utility) | (14, 1,197, 41) | NE corner |
| 6 | 3-story | (Operations) | (-18, 1,197, 48) | |
| 7 | 3-story | (Operations) | (-10, 1,197, 48) | |
| **8** | **3-story** | **Battle Cab (Command Center)** | **(-2, 1,197, 48)** | **CENTERPIECE. The climax of the build.** |
| 9 | 3-story | (Operations) | (6, 1,197, 48) | |
| 10 | 3-story | (Operations) | (14, 1,197, 48) | |
| 11 | 2-story | Chapel | (-18, 1,197, 55) | SW corner |
| 12 | 2-story | Granite Inn (bar) | (-10, 1,197, 55) | |
| 13 | 2-story | (Support / medical-dental) | (-2, 1,197, 55) | |
| 14 | 2-story | (Support / utility) | (6, 1,197, 55) | |
| 15 | 2-story | (Support / Stargate Command corridor) | (14, 1,197, 55) | SE corner |

- **Building form:** White concrete / light grey concrete / smooth stone slabs. Brushed-steel doors (iron doors). Windowless (no glass). Flat fluorescent-lit facades (redstone lamp strips along the top). Three-story buildings are 9 blocks tall (3 blocks per floor); two-story are 6 blocks tall.
- **Spring mounts:** Visible under every building. Each spring is a 1 × 1 iron-bar coil on a 2 × 2 iron-block base, with the building sitting on a 1-block air gap above. The 2× signature-detail scaling makes the springs readable.
- **Number plate:** "1,319 SPRINGS — 1,000 LB EACH — INSTALLED 1964 — NEVER REPLACED" (oak sign at the chamber entry).
- **Movement plate:** "NORMAL SHOCK: 1 INCH BUILDING MOVEMENT. EXTREME EVENT: 12 INCHES." (oak sign near the springs).
- **Optional ambient sway:** Building #13 has a subtle, ambient vertical sway (0.25 block, driven by redstone clock + piston). Per deliberation Topic 3, the sway is *not* player-triggered.

### 4.6 The Battle Cab (interior of building #8)

- **Floor area:** ~6 × 5 blocks per floor × 3 floors.
- **Layout:** U-shaped tiered consoles facing a wall of displays. Time-zone clocks along the wall: `ZULU / EXERCISE / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW` — 8 labels in a row, each on a banner.
- **Wall of displays:** A flat panel (3 × 4 blocks) at the front, made of redstone-lamp screens, with a world map mosaic (item frames or banner) on the central screen and status panels on the side screens. Lit by redstone lamps behind for the green-glow CRT effect.
- **Ticker:** A red banner above the displays reading "WELCOME TO THE NORAD COMMAND CENTER."
- **Atmosphere:** Dramatic spot lighting from the screens. The rest of the room is in shadow. The only warm element in the build.
- **Reference:** Visual reference era is 2006–2016 (per deliberation Topic 4). Beige chairs (white wool / light gray wool), CRT-style consoles (jukeboxes + note blocks + item frames), industrial grey carpet.
- **1980 false alarm plaque:** On the back wall of the Battle Cab, an item-frame plaque: "On June 3, 1980, a 46-cent computer chip failed in the missile warning network. NORAD briefly reported 2,200 Soviet ICBMs inbound. Bomber crews took their stations. The alert was resolved when a third call reported no radar or satellite confirmation."

### 4.7 The other 4 operations centers (interiors of buildings #1, #2, #3, #4)

Per deliberation Topic 4, each has a distinct theme but family resemblance to the Battle Cab:

- **#1 Air Defense Operations Center:** Radar-tracking screens. Multiple smaller displays arranged in a grid, each showing a circular radar sweep (item-frame with map pattern). Cooler color palette (more blue / cyan).
- **#2 Missile Warning Center:** Data-room. Wall of status screens (item frames in a 4 × 3 grid), each with text labels (oak signs). The 1979 false alarm plaque can be placed here as an optional secondary reference.
- **#3 Space Control Center:** Orbital tracking. Star map on the ceiling (banner or item-frame mosaic). Globe projection on the main display.
- **#4 Combined Intelligence Watch:** Smaller briefing-style room. One large screen, a table, fewer consoles. A "Chrystal Palace" code-name sign (Wargames reference) on a door.

### 4.8 The Granite Inn, chapel, and support rooms

- **#11 Chapel:** A small, austere room. Pews (oak stairs), an altar (oak slab), a single candle (lantern). Dim warm lighting. The only quiet room in the build.
- **#12 Granite Inn (bar):** A small bar. Counter (oak slabs), stools (oak stairs), a few bottles (potions or honey bottles) on a shelf, a "GRANITE INN" sign. Warmer, dimmer lighting (shroomlights, candles). The only place with warm amber light in the build.
- **#13 (Support / medical-dental):** A small side-room with a single piece of furniture (a bed = white bed, or a dental chair = armor stand). Per Topic 2, this is a single nod, not a full build.
- **#14 (Support / utility):** A small utility room with crates (chests) and a workbench (crafting table).
- **#15 (Support / Stargate Command corridor):** A back-corridor room with a single door signed "STARGATE COMMAND." Nothing else. The in-joke from the broom closet in the real complex.

### 4.9 The reservoir (offset west)

- **Location:** `(-300, 1,180, 50)` — offset to the west of the main chamber, connected by a short access tunnel (~30 blocks long).
- **Dimensions:** 30 × 20 × 15 blocks (X × Y × Z), filled with water source blocks.
- **Form:** A large underground cavern with a still, dark water surface. Dark prismarine or deepslate-tile walls to make it read as "carved." Soul lantern lighting. A small oak or spruce boat floating on the surface. A catwalk (oak fence + oak slabs) running along one wall.
- **Atmosphere:** Quiet, dim. The visitor should *stop talking* in this room. Note-block ambient (low, sustained) for water sounds.
- **Emergency escape reference:** A single locked iron door at the far end, signed "EMERGENCY EGRESS." Faded reference only (no buildable route).

### 4.10 Air intakes (faded reference)

- **Location:** One visible blast valve on the chamber wall (south wall, near the reservoir access tunnel).
- **Form:** A large iron-block structure (4 × 4 × 3 blocks) with a heavy iron door, a small "AIR INTAKE" sign, and a redstone lamp as a warning light.
- **Not tourable.** Just a visual reference.

### 4.11 Auxiliary rooms (per deliberation Topic 2 — single-nod only)

- **Medical clinic:** A single bed in a small side-room, signed "MEDICAL."
- **Dental clinic:** A chair (armor stand) in a small side-room, signed "DENTAL."
- **Gym:** A treadmill-like structure (a row of 3 oak pressure plates) in a small side-room, signed "FITNESS CENTER."
- All three are small labeled side-rooms connected to the chamber array. Not destinations.

### 4.12 The 6 diesel generators (per culture-architecture analysis)

- **Location:** A dedicated power-plant room off the south side of the chamber, at `(0, 1,197, 100)`.
- **Form:** 6 large piston-and-observer contraptions (or iron-block generators with redstone lamps as gauges), arranged in two rows of 3. A wall of redstone repeaters behind them (the "battery bank"). A separate diesel reservoir room (black concrete, sealed, with redstone lamps as warning lights and a low magma-block floor for warmth) at `(0, 1,197, 130)`.

---

## 5. Visitor Flow & Circulation

The visitor path is a **cinema**, not a tour. The build is designed to be experienced in 20–30 minutes of focused play, with a clear sequence of reveals.

### 5.1 Standalone path (this build, viewed alone)

1. **Approach (from the city in the combined complex, or from the public gate in standalone):** The visitor walks up the switchback approach road through the forest. 5–8 minutes of quiet, anonymous mountain scenery. The mountain looks like a mountain.

2. **Parking lot:** The visitor emerges into a small gravel lot, sees a security checkpoint, the chain-link fence, the speed-limit-15 sign, the antenna arrays on the ridgeline above. The first hint that this is a military installation.

3. **Final switchback to the portal:** A short, narrow road climbs the last 500 blocks of elevation to the portal arch. The forest thins. The cliff face appears. The visitor sees a small concrete-and-steel arch with "CHEYENNE MOUNTAIN COMPLEX" bolted across it. *Surprise #1:* the entrance is small, mundane, *non*-cinematic.

4. **Through the portal:** The visitor steps through the arch. The air changes (cooler, dimmer). The tunnel curves. The visitor cannot see the far end.

5. **Down the J-curve tunnel:** ~200 blocks of bare-rock tunnel, gradually descending. Pipes along the walls. Redstone lamp strips. Rock bolts in the ceiling. The visitor is *inside* the mountain now. ~3–4 minutes of walking.

6. **The blast doors:** The tunnel widens slightly; a side-branch appears. Two massive iron-block doors, hinged outward, with a hand-crank. The first is open; the airlock chamber is visible; the second is open. *Surprise #2:* the doors are *defense against something*. The visitor is *passing through a defensive position*. The doors loom. A single backlight from the airlock. Awe.

7. **Past the blast doors, the second leg of the tunnel:** The tunnel continues east, then south. The visitor can sense something ahead — the tunnel widens, the ceiling rises, the lighting changes.

8. **The main chamber (the reveal):** The tunnel opens into a *vast* space. Three long parallel chambers... no, one larger unified chamber in compressed scale, with **15 free-standing steel buildings on a forest of springs** under a single rock ceiling. The buildings are lit from within by fluorescent tubes. 18-inch gaps between buildings and rock walls. The whole space is *big*, *quiet*, *industrial cathedral*. *Surprise #3 (the big one):* there is a *city* under the mountain.

9. **The chamber tour:** The visitor walks between the buildings, sees the springs, sees the gaps. They can read the "1,319 springs" sign. They can see the 2× signature-detail scaling on the blast doors. They can enter any of the 15 buildings.

10. **The Battle Cab (climax):** Building #8, the central building. The visitor enters. The room is dim; the wall of displays is the brightest thing. Time-zone clocks. U-shaped consoles. Beige chairs. The "WELCOME TO THE NORAD COMMAND CENTER" ticker. The 1980 false alarm plaque. *This is the climax of the build.*

11. **Side-trips:** The visitor can explore the other 4 ops centers, the chapel, the Granite Inn, the medical/dental/gym side-rooms, the Stargate Command door, the WOPR terminal (Wargames reference) in a back room.

12. **The reservoir (side-trip):** A short tunnel west leads to the underground lake. Dark, still water. A small boat. A catwalk. The visitor should *stop talking* in this room.

13. **Exit (same as entry, or via the public shaft):** The visitor walks back through the tunnel, or (in the combined complex) descends via the public shaft to the city in the ravine.

### 5.2 Effective player time

- **Portal to Battle Cab:** 5–8 minutes walking (target locked by deliberation Topic 1).
- **Total focused play experience:** 20–30 minutes (per Topic 2).

### 5.3 The "cinema" principle

The visitor path is a **sequence of reveals**, each one bigger than the last:

1. *Reveal 1:* The portal is small (a maintenance entrance, not a vault door).
2. *Reveal 2:* The tunnel goes on for a long, long time (you are *inside* a mountain).
3. *Reveal 3:* There is a *city* under the mountain (15 buildings on springs).

The Battle Cab is the climax. The visitor should leave the build with the *real* story — "I have been inside something that was built to outlast me" — not the movie story.

---

## 6. Combined-Complex Integration

The Cheyenne Mountain build is one of three underground installations in the combined complex. This section defines how it sits in the larger world and what connections exist.

### 6.1 The ravine and the city

- **Ravine:** A deep V-shaped gorge, 300–400 blocks wide, ~200 blocks deep, running east-west (along the +X axis) just south of the Cheyenne Mountain build.
- **Ravine coordinates:** Z = 0 to +400 (south of the mountain's southern edge at Z=0).
- **City:** A small Minecraft city in the valley between the two mountain installations, around `(0, 150, 500)` — at the bottom of the ravine, ~500 blocks south of the Cheyenne portal.
- **Houston tunnel system (combined):** A network of small tunnels under the city, connecting city buildings. Not part of this build; referenced for context.

### 6.2 SubTropolis (combined)

- **Location:** South side of the ravine, ~600–800 blocks south of the Cheyenne portal. Centered at `(0, 200, 1,200)`.
- **Form:** A horizontal limestone-mine-style complex, the architectural *opposite* of Cheyenne (industrial warehouse vs. military cathedral). Built separately by the SubTropolis Site Planner.
- **This build does not include SubTropolis.** The connection points are defined; the SubTropolis build will mirror them.

### 6.3 Service tunnel (Cheyenne ↔ SubTropolis)

- **From:** `(0, 1,196, 100)` — the south end of the Cheyenne chamber array, at chamber floor level.
- **To:** `(0, 200, 1,200)` — a corresponding point in the SubTropolis complex (to be defined by the SubTropolis Site Planner).
- **Path:** Descends from the chamber through the south wall of the mountain, crosses the ravine at y≈150–200, and continues south to SubTropolis. Length: ~1,200 blocks.
- **Status:** **Architectural question for the combined team.** The deliberation Topic 1 budget does not include building the service tunnel. It is *flagged* here as a connection point; whether it is built as a player-walkable route or as a faded reference is a combined-complex decision.

### 6.4 Public shaft (Cheyenne exit ↔ city)

- **From:** `(0, 1,196, 100)` — the same south-chamber exit as the service tunnel, but a separate shaft.
- **To:** `(0, 200, 500)` — a point in the city in the ravine.
- **Form:** A vertical shaft from the chamber down through the south face of the mountain, across the ravine (at y=200), and up to a city exit. A funicular or cable-car ride (decorative minecart track + redstone). Length: ~700 blocks.
- **Status:** **Flagged for the combined team.** The public shaft is the visitor's "exit" in the combined complex — instead of walking back through the tunnel, the visitor descends to the city.

### 6.5 Cross-references

- The combined-complex report (when written) will define the city layout, the SubTropolis build, and the Houston tunnel system in detail.
- This site plan provides the Cheyenne-side connection points and the spatial relationship to the ravine / city / SubTropolis.

---

## 7. Site Coordinates (Master Coordinate Table)

Compressed-scale blocks. World origin at sea level (y=64). North = -Z, East = +X, Up = +Y.

### 7.1 World anchors

| Anchor | Coordinates | Notes |
|---|---|---|
| World origin (0, 0) | (0, 64, 0) | Sea level, centered on the mountain's vertical axis |
| Mountain base | y=64 | Sea level |
| Mountain peak (central) | (0, 1,514, 0) | 1,450 blocks above base |
| Mountain center (vertical) | y=789 | (1,514 + 64) / 2 |
| Mountain footprint | X = -300 to +300, Z = -800 to 0 | 600 × 800 block base |
| Build height required | ≥1,550 | Modded world mandatory |

### 7.2 Above-ground features

| Feature | Coordinates | Notes |
|---|---|---|
| Public entrance gate | (0, 80, -900) | At base of mountain, north side |
| Parking lot | (-200, 600, -850) to (200, 620, -780) | Switchback terminus |
| Security checkpoint trailer | (-50, 605, -800) | At the gate |
| Approach road (final switchback) | (-200, 600, -780) to (0, 1,100, -500) | Climbs 500 blocks of elevation |
| North Portal | (0, 1,100, -500) | On north face, mid-high elevation |
| Antenna 1 (central peak N) | (-50, 1,500, 0) | |
| Antenna 2 (central peak E) | (50, 1,500, 0) | |
| Antenna 3 (central peak S) | (0, 1,500, 50) | |
| Antenna 4 (north peak) | (-100, 1,400, -400) | |
| Antenna 5 (south peak) | (100, 1,400, 200) | |
| Generator building | (-200, 800, -200) | On a shelf below central peak |
| Pump house | (200, 500, -300) | Lower on mountain, east side |

### 7.3 Below-ground (the build)

| Feature | Coordinates | Notes |
|---|---|---|
| Portal entrance (interior) | (0, 1,100, -500) | Build origin |
| Tunnel Leg 1 (south, descending) | (0, 1,100, -500) to (0, 1,180, -300) | ~200 blocks, descent 80 blocks |
| First blast door (side-branch) | (-100, 1,170, -250) | ~250 blocks into tunnel |
| Tunnel Bend 1 (east) | (0, 1,180, -300) | Smooth 90° curve |
| Tunnel Leg 2 (east) | (0, 1,180, -300) to (300, 1,196, -300) | ~300 blocks, mostly level |
| Tunnel Bend 2 (south) | (300, 1,196, -300) | Smooth 90° curve |
| Tunnel Leg 3 (south) | (300, 1,196, -300) to (50, 1,196, 200) | ~300 blocks, level |
| Chamber entry | (50, 1,196, 200) | Where tunnel opens into chamber |
| Main chamber footprint | X: -22 to +23, Y: 1,196–1,214, Z: 38–63 | 45 × 18 × 25 blocks |
| Main chamber center | (0, 1,205, 50) | |
| Reservoir (offset west) | X: -315 to -285, Y: 1,180–1,195, Z: 40–60 | 30 × 15 × 20 blocks |
| Reservoir access tunnel | (0, 1,196, 50) to (-285, 1,185, 50) | ~30 blocks long |
| Power plant room | (0, 1,197, 100) | 6 generators + battery bank |
| Diesel reservoir room | (0, 1,197, 130) | Sealed, black concrete |
| Emergency escape door (faded) | (-315, 1,190, 55) | "EMERGENCY EGRESS" sign |
| Air intake blast valve (faded) | (0, 1,200, 100) | On south chamber wall |

### 7.4 The 15 buildings (with rough positions)

| ID | Name | Position (X, Y, Z) | Dimensions (X × Y × Z) | Function |
|---|---|---|---|---|
| 1 | Air Defense Operations Center | (-18, 1,197, 41) | 6 × 9 × 5 | Ops center |
| 2 | Missile Warning Center | (-10, 1,197, 41) | 6 × 9 × 5 | Ops center |
| 3 | Space Control Center | (-2, 1,197, 41) | 6 × 9 × 5 | Ops center |
| 4 | Combined Intelligence Watch | (6, 1,197, 41) | 6 × 9 × 5 | Ops center |
| 5 | (Support / utility) | (14, 1,197, 41) | 6 × 9 × 5 | Support |
| 6 | (Operations) | (-18, 1,197, 48) | 6 × 9 × 5 | Ops center |
| 7 | (Operations) | (-10, 1,197, 48) | 6 × 9 × 5 | Ops center |
| **8** | **Battle Cab (Command Center)** | **(-2, 1,197, 48)** | **6 × 9 × 5** | **OPS CENTER — CENTERPIECE** |
| 9 | (Operations) | (6, 1,197, 48) | 6 × 9 × 5 | Ops center |
| 10 | (Operations) | (14, 1,197, 48) | 6 × 9 × 5 | Ops center |
| 11 | Chapel | (-18, 1,197, 55) | 6 × 6 × 5 | Human space |
| 12 | Granite Inn | (-10, 1,197, 55) | 6 × 6 × 5 | Human space |
| 13 | (Support / medical-dental) | (-2, 1,197, 55) | 6 × 6 × 5 | Support |
| 14 | (Support / utility) | (6, 1,197, 55) | 6 × 6 × 5 | Support |
| 15 | (Stargate Command corridor) | (14, 1,197, 55) | 6 × 6 × 5 | Support |

- **All 15 buildings sit on spring mounts** (1 block air gap below each building).
- **3-story buildings (12 total):** Buildings #1–#10, plus two of the support buildings (likely #5 and #10, or the Architectural Designer can choose).
- **2-story buildings (3 total):** Buildings #11, #12, and one of #13–#15 (per deliberation Topic 3, 12+3=15).

### 7.5 Combined-complex connection points

| Feature | From | To | Notes |
|---|---|---|---|
| Service tunnel (Cheyenne ↔ SubTropolis) | (0, 1,196, 100) | (0, 200, 1,200) | ~1,200 blocks; flagged for combined team |
| Public shaft (Cheyenne exit ↔ city) | (0, 1,196, 100) | (0, 200, 500) | ~700 blocks; flagged for combined team |
| Ravine north wall (Cheyenne side) | Z = 0 to +400, X = -300 to +300 | — | The mountain's south face |
| City center (combined) | (0, 200, 500) | — | Defined in the combined-complex report |
| SubTropolis center (combined) | (0, 200, 1,200) | — | Defined in the SubTropolis site plan |

---

## 8. Materials & Block Palette (Site-Level)

This is a *site-level* palette. The Architectural Designer will refine it building-by-building. All choices respect the deliberation's binding decisions and the culture-architecture analysis §6.

### 8.1 Exterior granite (the mountain's skin)

| Minecraft block | Use | Notes |
|---|---|---|
| **Pink terracotta** (primary) | Mountain exterior, dominant material | Closest to pink-to-brick-red Pikes Peak granite. Solid color, easy to work with at scale. |
| **Red granite** | Mountain exterior accents | For variation; pink-to-red gradient on the cliff faces. |
| **Polished andesite** | Cliff face highlights | Lighter, almost-orange tint that reads as "exposed granite." |
| **Coarse dirt + podzol** | Forest floor around the mountain base | Ponderosa pine forest floor. |
| **Grass block** | Valley floor and lower slopes | Green under the trees. |
| **Stone / cobblestone** | Rocky outcrops, scree slopes | Where the forest thins out. |

### 8.2 Interior rock walls (tunnels and chamber)

| Minecraft block | Use | Notes |
|---|---|---|
| **Pink terracotta** | Tunnel walls (lower portion) | Matches the exterior for visual continuity. |
| **Red granite** | Tunnel walls (upper portion) | Slightly darker, reads as "deeper into the mountain." |
| **Stone** | Tunnel ceiling | Bare rock, the rough-hewn look. |
| **Polished andesite** | Tunnel floor (main portions) | Smooth, walkable, institutional. |
| **Light grey concrete** | Tunnel floor (service corridors) | More industrial than polished andesite. |
| **Iron trapdoors** | Metal grating (service walkways) | Sub-floor texture, the "industrial" look. |
| **Iron bars** | Rock bolts in tunnel ceiling | Visible structural detail. |
| **Smooth stone slab** | Chamber floor | The main chamber floor. |

### 8.3 Tunnel lining and infrastructure

| Minecraft block | Use | Notes |
|---|---|---|
| **Light grey concrete** | Portal arch frame, service corridor walls | The institutional concrete of the place. |
| **Smooth stone** | Tunnel walls (concrete-lined sections) | For the modern-lined sections of the tunnel. |
| **Iron blocks** | Blast door frame, structural elements | The cold metal. |
| **Iron bars / chains** | Pipe runs along tunnel walls, blast door hinges | Color-coded utility runs. |
| **Redstone lamps** | Lighting strips (dim) | The "fluorescent" feel. |
| **Soul lanterns** | Reservoir lighting, emergency lighting | Cool blue, dim. |
| **Shroomlights** | Granite Inn / chapel / break areas | The warm amber contrast. |
| **Lanterns** | Chapel, intimate spaces | Candle/warm accent. |

### 8.4 Buildings (the 15 free-standing structures)

| Minecraft block | Use | Notes |
|---|---|---|
| **White concrete** | Building exteriors (dominant) | The institutional white of the place. |
| **Light grey concrete** | Building trim, lower walls | |
| **Smooth stone slab** | Building floors | |
| **Iron doors** | Building entry doors | The brushed-steel doors. |
| **Iron blocks** | Building structural frames (visible at corners) | |
| **Note blocks / jukeboxes** | Console "machines" inside ops centers | CRT console stand-ins. |
| **Item frames + maps** | Console screens, world map in Battle Cab | The "displays." |
| **Redstone lamps** | Backlight behind display screens | The green CRT glow. |
| **White / light grey wool** | Carpet inside Battle Cab, chairs | The beige executive chairs. |
| **Banners** | Time-zone labels (ZULU / HAWAII / etc.), "WELCOME" ticker | The signature Battle Cab detail. |

### 8.5 Spring mounts (the engineering signature)

| Minecraft block | Use | Notes |
|---|---|---|
| **Iron block** | Spring base plate (2 × 2) | The steel base. |
| **Iron bars** (laid as a coil pattern) | The spring coil itself | Visualized as iron bars in a vertical pattern. |
| **End rod** (alternative) | Spring coil (alternative) | If iron bars don't read as coiled. |
| **Anvil / heavy weighted pressure plate** | Spring cap, building footprint above | The "weight" on top of each spring. |
| **Air gap (1 block)** | The space between the spring and the building | The visible decoupled gap. |

### 8.6 Reservoir

| Minecraft block | Use | Notes |
|---|---|---|
| **Water source blocks** | Reservoir water surface | Still, dark water. |
| **Dark prismarine** | Reservoir walls | Reads as "carved" rock. |
| **Deepslate tiles** | Reservoir walls (alternative) | Darker, more institutional. |
| **Soul lanterns** | Reservoir lighting | Cool blue, emergency feel. |
| **Oak fence + oak slabs** | Catwalk | Wooden walkway along the wall. |
| **Oak boat / spruce boat** | The boat on the water | Single boat, the iconic reservoir image. |

### 8.7 Forest

| Minecraft block | Use | Notes |
|---|---|---|
| **Spruce logs + leaves** | Ponderosa pine equivalent (60% of trees) | Tall, narrow, dark green. |
| **Oak logs + leaves** | Scrub oak (30%) | Shorter, rounder. |
| **Dark oak logs + leaves** | Mature stands (10%) | Larger, denser. |
| **Tall grass** | Forest undergrowth | |
| **Ferns** | Shadier areas | |
| **Poppies, azure bluets** | Wildflowers | |
| **Sweet berry bushes** | Low scrub | |
| **Coarse dirt + podzol** | Forest floor | |

### 8.8 Approach road and parking lot

| Minecraft block | Use | Notes |
|---|---|---|
| **Gravel** | Approach road surface | The dirt-and-gravel forest road look. |
| **Coarse dirt** | Road edges | Worn-down edges. |
| **Path blocks** | Road shoulders | Compacted earth. |
| **Cobblestone** | Parking lot surface | More formal than the approach road. |
| **Oak signs** | Speed-limit, "MANDATORY USE OF HEADLIGHTS," stop signs | All signage. |
| **Iron fence** | Chain-link fence | Around the parking lot and portal perimeter. |
| **Chains** | Concertina wire on the cliff above the portal | The visible security detail. |

### 8.9 Color palette (summary)

| Color | Hex range | Use |
|---|---|---|
| Pink-granite (Pikes Peak) | #B5566E to #8B3A3A | The dominant identity color |
| Charcoal grey | #2C2C2C to #4A4A4A | Institutional corridor walls |
| Brushed steel | #A8A8A8 to #888888 | Doors, frames, blast doors |
| Dark blue / black | #0A1628 to #1A1A2E | Screens, consoles, command center carpet |
| Warning red | #B33A3A to #8B2C2C | Blast door markers, fire pipes, ticker |
| Fluorescent white | #E8E8E8 to #F0F0F0 | Tunnel lighting |
| Warm amber | #D4A55A to #B8843A | Bar, chapel, break areas (contrast) |

---

## 9. Scale Verification

The build must be buildable at the chosen compression. This section verifies the key numbers.

### 9.1 Build height

- **Mountain peak:** y=1,514
- **Required build height:** ≥1,550 (with buffer above the peak)
- **Vanilla build height:** 384 — **insufficient**
- **Standard modded build height:** 1,024 — **insufficient** (1,514 > 1,024)
- **Required modded build height:** 1,550+ — must use a mod like **CubicWorld** (default 2,048), **MCHigher**, or a custom superflat with extended world height
- **Recommendation:** Use **CubicWorld at default 2,048** for clean compatibility. The build has ~534 blocks of headroom above the peak for sky rendering, clouds, and ambient effects.

### 9.2 Horizontal extent

- **Mountain footprint:** 600 × 800 blocks (X × Z)
- **Tunnel length:** ~800 blocks
- **Total horizontal extent (including tunnel):** ~1,200 × 1,000 blocks
- **Minecraft render distance:** Default 12 chunks = 192 blocks visible. Extended render distance (32 chunks) = 512 blocks. At a tunnel-focused build, the player is mostly *inside* the mountain, so render distance is less critical.
- **Navigation:** The 800-block tunnel takes 5–8 minutes to walk (player walk speed is ~4.3 blocks/second). Confirmed against deliberation Topic 1 target.

### 9.3 Total build footprint

- **Surface area:** ~480,000 blocks² (600 × 800)
- **Volume:** 1,450 × 480,000 / 3 (rough cone estimate) ≈ 232M blocks of mountain mass
- **Hollowed volume (chambers + tunnel + reservoir):** ~45 × 25 × 18 + 800 × 5 × 4 + 30 × 20 × 15 = 20,250 + 16,000 + 9,000 = ~45,250 blocks
- **Buildable:** Yes. The chambers and tunnel are a small fraction of the mountain mass.

### 9.4 Render distance implications

- **Default render distance (12 chunks, 192 blocks):** The visitor cannot see the entire mountain from a single vantage point. The mountain is a *journey*, not a panorama. This is the correct emotional experience.
- **Extended render distance (32 chunks, 512 blocks):** The visitor can see the mountain from the city across the ravine. The full silhouette is visible. This is appropriate for the combined-complex view.
- **The build works at any render distance**, but is *designed* for normal render distance (the visitor experiences the mountain by walking up to it).

### 9.5 Chunk loading

- The build is concentrated in a ~1,200 × 1,000 block area, well within Minecraft's chunk-loading capacity. No special chunk-loading infrastructure needed.
- The 1,450-block vertical extent means a *tall* world. CubicWorld and similar mods handle this; vanilla world generation does not.

### 9.6 Build time / block count estimate

- **Mountain mass (terrain generation):** Generated once at world creation; not hand-built. The build effort is on the *interior* and the *exterior detailing*.
- **Tunnel:** ~800 blocks × 5 × 4 = 16,000 blocks of hollow space.
- **Chamber:** 45 × 25 × 18 = 20,250 blocks of hollow space.
- **Reservoir:** 30 × 20 × 15 = 9,000 blocks.
- **15 buildings:** 12 × (6 × 9 × 5) + 3 × (6 × 6 × 5) = 3,240 + 540 = 3,780 blocks of building volume.
- **Surface detailing (portal, parking lot, antennas, support buildings):** ~5,000–10,000 blocks.
- **Total hand-built block count (estimated):** ~50,000–70,000 blocks. This is a substantial but buildable project for a team of 2–3 over a few weeks.

### 9.7 Player navigation

- **Tunnel:** Walkable. 5 wide × 4 tall. The J-curve is gentle (30-block-radius curves at the bends). No minecarts needed, but a single decorative minecart on rails in the tunnel could evoke the "bus ride in" feel.
- **Chamber:** Walkable. 45 × 25 × 18. The 1-block walkways between buildings are tight but navigable.
- **Buildings:** 3-story buildings have interior ladders/stairs to access upper floors. The Battle Cab is the most detailed interior.
- **Reservoir:** Walkable via the catwalk. The boat is decorative, not navigable.

---

## 10. Open Questions for the Architectural Designer / User

These are site-level questions that the next phase needs to answer, or that the user should confirm.

### 10.1 For the user (per deliberation §5)

1. **Build size budget** — what mod / world type? Default assumption: **CubicWorld 2,048 build height**, vanilla survival-friendly. User to confirm.

2. **Parade grounds** — the deliberation flagged this. Default: **cut entirely** (not in research). If the user wants it, it's a faded reference (a flat open area near the portal with a flagpole).

3. **Air intakes** — faded reference (one visible blast valve) or dedicated setpiece? Default: **faded reference**.

4. **Battle Cab hero image** — `interior/5.jpeg` (vintage 1980s) or `interior/2.jpeg` (later era)? Default: **`interior/5.jpeg`** (more iconic).

5. **Build name on entry signage** — "Cheyenne Mountain Complex" (1960s–2020) or "Cheyenne Mountain Space Force Station" (current)? Default: **"Cheyenne Mountain Complex"** (historically iconic).

6. **Stargate Command door text** — "STARGATE COMMAND" (literal) or subtle ("SGC — Authorized Personnel Only")? Default: **"STARGATE COMMAND"** (the real joke).

7. **1980 false alarm plaque** — full text or concise excerpt? Default: **full text** (the Veteran's preference).

### 10.2 For the Architectural Designer

1. **Tunnel exact path** — the 800-block J-curve is approximate. The Designer should fine-tune the bends, the side-branch blast door position (currently at 1/3 into the tunnel), and the final approach to the chamber.

2. **Building layout inside the chamber** — the 5 × 3 grid with positions in §7.4 is a starting point. The Designer may rearrange based on the Battle Cab's visual prominence, the side-room adjacencies, and the visitor flow. The constraint is: 15 buildings total, 12 three-story + 3 two-story, Battle Cab at the center.

3. **Spring mount visual** — iron bars vs. end rods vs. chains. The Designer should pick the visual that reads as "coiled spring" at Minecraft scale.

4. **Battle Cab wall of displays** — item frames, banners, or a custom mosaic. The Designer should match the 2006–2016 vintage aesthetic.

5. **Reservoir access** — the catwalk is on the north wall. Should there be a small dock with the boat tied to it? Or just the boat floating freely?

6. **Power plant room** — 6 generators in two rows of 3, or a single row of 6? Battery bank on the wall behind, or in a separate alcove?

7. **Surface campus** — the parking lot at y=600 is a *compressed-scale* choice (the real parking lot is "halfway up the mountain"). The Designer may want to reposition it for better visual flow.

8. **Antenna array** — 3 on the central peak, 1 each on the north and south peaks. The Designer may want more or fewer for visual balance.

9. **Forest density** — the 50–80 block forest ring is approximate. The Designer should match the real mountain's "ponderosa pine on the slopes, bare rock above tree line" pattern.

10. **Combined-complex connections** — the service tunnel and public shaft are flagged but not budgeted. The Designer should treat them as connection points, not build tasks. The combined-complex team will define the actual routes.

### 10.3 Conflicts with the deliberation's binding decisions

**None found.** The site plan respects all binding decisions from the deliberation:

- 2:1 vertical / 4:1 horizontal compression: **applied** (1,450 blocks tall, 800-block tunnel, 45 × 25 × 18 chamber).
- 2× signature-detail scaling for blast doors, springs, Battle Cab: **applied** (the doors are 5 × 4, the springs are 1 block of visible coil, the Battle Cab is 6 × 5 × 9 with a 3 × 4 display wall).
- 1,319 springs: **applied** (signage in the chamber).
- 2,000 ft of granite cover: **applied** (300 blocks of cover above chamber ceiling).
- 25-ton blast doors: **applied** (signage).
- 12+3 building composition: **applied** (12 three-story, 3 two-story in the chamber array).
- 1-inch normal / 12-inch extreme spring movement: **applied** (signage in the chamber).
- Feb 6, 1967 (primary) / April 20, 1966 (secondary) operational dates: **applied** (plaque on the portal entry).
- 2006–2016 visual reference era for ops centers: **applied** (Battle Cab is the reference).
- 1980 false alarm plaque: **applied** (on the Battle Cab back wall).
- Stargate Command door: **applied** (building #15 corridor).
- Mountain designed to look like a mountain (anonymity): **applied** (forest, no obvious surface features beyond antennas).
- Required modded build height 1,024+: **clarified** to 1,550+ for the actual 1,514-block peak; recommended CubicWorld at 2,048.

No conflicts. The site plan is consistent with the deliberation.

---

*End of site plan. Coordinate JSON follows. Architectural Designer and AI Contractor Writer may proceed.*
