# Design Plan — Cheyenne Mountain Complex

**Project:** mc-fleet-bot Minecraft architecture masterplan
**Location:** Masterplan 01 — Cheyenne Mountain Complex
**Stage:** 04 — Design (architectural spec)
**Author:** Architectural Designer
**Status:** Binding for the AI Contractor Writer.
**Upstream inputs:** `01-research/research-report.md`, `02-visuals/visual-assets.md`, `03-discussion/culture-architecture-analysis.md`, `03-discussion/discussion-notes.md`

This document is the master architectural specification for the Minecraft replica. It defines *what gets built* and *how the parts fit together*. It is not a contractor brief — that is the next downstream task. The Site Planner's coordinate output (`04-design/site-plan.md` and `site-coordinates.json`) is the spatial anchor; this document is the visual, material, and functional spec that *fits within* those coordinates.

**Spatial anchor (from `04-design/site-plan.md`):**
- World origin: `(0, 64, 0)` at sea level, centered on the mountain's vertical axis
- Mountain: 1,450 blocks tall, peaks at y=1,514, ~600 × 800 footprint
- Chamber floor: y=1,196 / ceiling: y=1,214 (300 blocks of mountain above)
- Portal entrance: `(0, 1,100, -500)` — north face, ~70% up the mountain
- 15 buildings in a 5 × 3 grid inside the chamber (per site plan §4.4–4.5)
- Reservoir offset west of the chamber, accessed by a ~30-block tunnel
- Tunnel enters from the **north** face (not east), descends ~80 blocks, bends east, then south into the chamber

Where this document and the site plan disagree, **the site plan wins on coordinates and the design plan wins on materials, dimensions of features, and atmosphere**. The contractor should consult both.

---

## 1. Design Philosophy

**One sentence.** This is an *industrial cathedral*: a 1966 institutional grey hive of 1,319 half-ton coil springs holding fifteen free-standing steel buildings under 1,400 blocks of pink Pikes Peak granite, with a 25-ton blast door standing between you and a 30-megaton sky.

**The thesis.** The 1,319 springs are not decoration; they are the *philosophy* of the place. The buildings do not love you. They are not anchored to the rock. They are *decoupled* from the mountain so that when the mountain shakes, the buildings shrug. **Resilience is not rigidity. Resilience is decoupling.** The whole design — the curved tunnel, the side-branch blast doors, the airlock, the 1,800 ft of rock above — is the same argument in different materials: *assume the worst, twice.*

**Vintage, not modern.** The visual reference is the 1966 institutional Air Force: brushed steel, painted concrete, fluorescent tubes, beige executive chairs, CRT consoles glowing green. The build should *not* modernize the look. The 1960s bones are still showing in the real complex, and that *is* the meaning.

**The single rule for the AI Contractor.** Read the room before you place the block. This build has *atmosphere* as a deliverable, not just geometry. The "dead air" feel (no torches, no warm wood, no organic life) is the difference between a replica and a memory.

---

## 2. Master Material Palette (Minecraft Blocks)

### 2.1 Primary palette — used everywhere

| Material / role | Minecraft blocks | Notes |
|---|---|---|
| **Pink-to-brick-red Pikes Peak granite** (exterior mountain, excavated walls, chamber walls) | `granite`, `polished granite`, `red granite` (where available), `pink terracotta`, `red terracotta` | The dominant material. Use *aggressively* — this is the *identity*. Mix: 60% regular `granite`, 25% `pink terracotta`, 15% `red terracotta` for variation. Avoid the gray `diorite`; it reads as cold. |
| **Brushed steel / iron** (blast doors, door frames, hinges, building skeletons, utility pipes) | `iron block`, `iron bars`, `chain`, `anvil`, `heavy weighted pressure plate`, `lantern` (iron) | Use `iron block` for door faces and frames, `iron bars` for hinges/grating, `chain` for hanging conduit and the air-handler detail, `anvil` for the hand-crank backup operator, `heavy weighted pressure plate` for the blast door hinge base. |
| **Institutional concrete** (modern additions, tunnel liners, building exteriors) | `light gray concrete`, `white concrete`, `smooth stone slab`, `polished andesite` | The "1966 institutional" skin. Use `light gray concrete` as the default wall surface inside the buildings. `polished andesite` for finished floors in corridors. |
| **Industrial metal grating** (corridor floors, walkways between buildings, catwalks) | `iron trapdoor` (laid flat, hinge down), `heavy weighted pressure plate`, `polished andesite slab` | The functional floor. `iron trapdoor` laid flat reads as a metal grate at Minecraft scale. |
| **Dark accents** (command center screens, blast door markings, dark corridor edges) | `black concrete`, `obsidian`, `nether brick` (block, slab, and stair) | `black concrete` for screen backing, `obsidian` for absolute-dark recesses (server room corners), `nether brick` for fire-suppression pipes and the "industrial" edges. |
| **Warning red** (blast door markers, danger signage, fire-suppression pipes) | `red concrete`, `red terracotta`, `red stained glass` (for the ticker banner) | Sparingly. The blast door chevrons, the "DANGER" markers, the WELCOME ticker. |
| **Lighting (fluorescent, cool blue)** | `redstone lamp` (for the institutional glow), `end rod` (for vertical light strips), `sea lantern` (for the reservoirs), `soul lantern` (for the "cold" passages) | `redstone lamp` is the *primary* interior light source — it reads as a steady, slightly warm fluorescent. `end rod` for the tunnel strips. **No torches, no fire, no warm light in the main path** (the dead air rule). |
| **Wood** (chapel, Granite Inn, fixtures, support break rooms) | `oak planks`, `oak slab`, `dark oak plank`, `spruce plank` | The *only* places wood appears. Contrast is the point. The Granite Inn uses `dark oak` for the bar, `oak plank` for the floor. The chapel uses `spruce` for pews. |
| **Carpet** (Battle Cab, command center floors) | `blue wool`, `light gray wool` (beige substitute) | The Battle Cab floor is `blue wool` to match the dark blue institutional carpet of the real 1980s room. |
| **Glass** (screens, the Battle Cab wall, observation windows) | `white stained glass pane`, `light blue stained glass pane`, `glass pane` | The screens are item-frame mosaics with `redstone lamp` backlighting, not actual glass. Glass is reserved for the small portholes in fire doors. |
| **Water** (reservoir) | `water` source block | Still water in the reservoir. Soul-lantern side-lighting reflects off the surface. |

### 2.2 Secondary palette — 2× signature details

The deliberation authorized *local 2× upscaling* for the springs, blast doors, and the Battle Cab wall of displays. For these, swap to a *more saturated* block so they read as oversized and dominant:

| Signature feature | Primary block | 2×-scale secondary |
|---|---|---|
| **Springs** (the half-ton coil, visible under each building) | `iron bar` (vertical coil pattern) | `chain` (for the *scaled-up* spring visible in the cross-section view), `anvil` as the top cap, `iron block` as the base plate |
| **Blast door face** | `iron block` (single-block thick) | `black concrete` core wrapped in `iron block` (2-block thick), `iron bars` for the bracing pattern on the surface, `red concrete` chevron stripes |
| **Battle Cab screens** | `redstone lamp` | `light blue stained glass` over `redstone lamp` (for the brightest glow), item-frame map mosaics at 2× scale (i.e. 2×2 item-frame panels instead of 1×1) |
| **Spring array signage** | `sign` block on oak wall | `oak wall sign` (4× wider, more text) at 2× scale for the "1,319 springs" placard |

### 2.3 Blocks to *avoid*

- **No torches, no fire, no candles** in the main path. The dead-air rule.
- **No `oak leaves` / `spruce leaves` / flowers** inside the chambers. The "no organic life" rule.
- **No modern blocks** (e.g. `bee nest`, `sculk`, `froglight`, `mangrove`). Vintage.
- **No `nether quartz` or `end stone`** — they read as fantasy, not institutional.
- **No `purpur` or `prismarine`** outside the reservoir. Prismarine is reserved for the reservoir walls only.
- **No signs with default black text on white** — use `sign` with explicit text and `oak wall sign` for the larger placcards. The aesthetic is hand-painted 1960s stencil, not modern UI.

### 2.4 The "no" list at a glance

| Zone | What NOT to use | Why |
|---|---|---|
| Main chamber, ops centers, tunnels | torches, lanterns (warm), candles, shroomlights | "Dead air" / vintage fluorescent feel |
| Main chamber, ops centers | leaves, flowers, grass, vines, moss | No organic life underground |
| Operations centers | quartz blocks, end stone, purpur | Modern/fantasy; not 1966 |
| Reservoir walls | light blocks, glass | Use dark prismarine to read as "carved from the rock" |

---

## 3. The Approach (Above-Ground)

### 3.1 The mountain silhouette

A 1,450-block-tall multi-peaked mountain. Three summits, the central one highest. The exterior is **forested, not built**. The visitor approaches and sees: trees, rock, an antenna farm on the ridgeline, a single small concrete-and-steel arch in the cliff face, a chain-link fence, a small guardhouse. **The mountain must look like a mountain. It succeeded.**

- **Tree palette:** `spruce` (ponderosa pine stand-in), `oak` (scrub oak), `dark oak` (aspen accent), `spruce leaves`, `oak leaves` (no flowers, no `cherry leaves` — Front Range, not fantasy forest)
- **Ground cover:** `coarse dirt`, `podzol`, `grass block`, `moss block` (rocky shaded areas), `gravel` (rocky outcrops)
- **Exposed granite:** `granite`, `polished granite`, `pink terracotta` — visible in cliff faces, road cuts, and the east face where the portal sits
- **Snow line** (optional, atmospheric): `snow block`, `snow layer` above Y=1,100 — *only* if the user wants a winter variant. Default: no snow, summer green. The winter reference image (`exterior/9.jpg`) is the *atmospheric* alt, not the default.

### 3.2 Antenna arrays on the ridgeline

**3-5 antennas** on the highest ridges, visible from the approach but not on the immediate path. Each is a simple `iron block` + `lightning rod` + `chain` arrangement:

- **Antenna 1 (largest, on the central peak):** `iron block` base (3×3), `lightning rod` as the main mast (10-15 blocks tall), `chain` cross-bracing in a triangular pattern, `iron bar` radials at the top.
- **Antennas 2-3 (medium, on side peaks):** `iron block` base (1×1 or 2×2), `lightning rod` (8-10 blocks tall), single `chain` guy-line.
- **Antennas 4-5 (small, on lower ridges):** simple `iron fence` posts or `chain` lines, 4-6 blocks tall.

Antennas should be *readable* as antennas, not as decorative. Lightning rods with chain cross-bracing read correctly at a distance. The user driving up the approach road should see "antenna farm on the ridge" and connect to the real complex.

### 3.3 The approach road

- **Switchback climb** up the east face of the mountain. 2-3 hairpin turns.
- **Surface material:** `gravel` (dirt-and-gravel road texture), with `coarse dirt` shoulders, `stone` retaining walls on the cut faces
- **Width:** 4-5 blocks (vehicle-width at compressed scale)
- **Length:** ~150-200 blocks total switchback, ending at a small `coarse dirt` parking area before the portal
- **Curb / guardrail:** `cobblestone wall` on the outer edges, ~1 block high

### 3.4 The North Portal

This is the *exterior hero shot*. Modest. A concrete-and-steel arch in the cliff face. **Not imposing — looks like a maintenance entrance to a state park, which is the entire point.**

- **Arch dimensions:** 7 blocks wide × 5 blocks tall (vehicle-width at compressed 4:1 scale)
- **Frame:** `light gray concrete` for the lintel and jambs, with `iron block` corner caps. The frame protrudes ~1 block from the cliff face.
- **Opening behind:** `black concrete` (the dark interior void). The visitor sees black, not the tunnel interior.
- **"CHEYENNE MOUNTAIN COMPLEX" lettering:** Above the arch, on a horizontal `light gray concrete` panel (the *portal lintel*). Use `oak wall sign` blocks with the text in dark text (the `sign` block's default text color is acceptable; for contrast, use `black wool` letters built as 1×1 squares for the larger version).
  - For 1:1 block text, build each letter as 3×5 blocks of `black wool` on a `light gray concrete` background. "CHEYENNE" on the left half, "MOUNTAIN" on the right half, "COMPLEX" on a second line below.
  - Total panel: 22 blocks wide × 4 blocks tall (one block of background above the letters, 3 blocks of letter height, but built as 3×5 letterforms = 5 blocks tall total)
- **Speed-limit-15 sign:** `sign` block on a `fence post` (`oak fence`), at the right side of the arch. Text: "SPEED LIMIT 15". Position: 1 block off the ground, on a 1-block-tall `oak fence`.
- **Stop sign:** `sign` block reading "STOP" inside the arch opening, on a 1-block `oak fence`. (Or, for iconography, build a red octagon with `red concrete` + `white wool` border + the word "STOP" in `white wool`.)
- **Security perimeter:** `iron fence` (chain-link substitute) on both sides of the road, ~3 blocks tall, with `iron fence gate` at the parking lot. Concertina wire on top: a `chain` line at the top of the fence.
- **Guardhouse:** a small 3×3 `light gray concrete` + `glass pane` structure to the right of the portal entrance, with a `dark oak door`. A single `redstone lamp` inside.
- **Jersey barriers:** `smooth stone slab` rows, 1 block high, in front of the guardhouse.

### 3.5 The parking lot

A small `coarse dirt` + `gravel` lot, ~20 × 30 blocks, with:
- 4-6 `oak fence` parking markers
- A `sign` reading "EMPLOYEES ONLY" / "AUTHORIZED PERSONNEL"
- A `light gray concrete` sidewalk leading to the portal
- Optional: 2-3 `minecart` with `chest` ("vehicles") for atmosphere

---

## 4. The J-Curve Access Tunnel

### 4.1 Overall geometry

**Direction (per site plan §4.2):** The tunnel enters the mountain on the **north face** (not the east face). The visitor walks *south* into the mountain, the tunnel *descends*, bends *east*, then bends *south* again, and opens into the chamber. The approach road on the surface also comes from the north (the public road from the city), so the visitor's *spatial* sense is consistent: they walk south on the surface, enter the mountain, walk south, then east, then south again.

- **Total length:** ~800 blocks from portal entrance to chamber
- **Cross-section:** 5 blocks wide × 4 blocks tall (player-sized with headroom; per site plan §4.2)
- **Curve:** A long, gentle J-curve (Leg 1 south, Bend 1 east, Leg 2 east, Bend 2 south, Leg 3 south). The visitor should *not* be able to see from one end to the other at any point.
- **Y descent:** From the portal at y=1,100 down to the chamber at y=1,196 — the tunnel *descends* 80-90 blocks total. The mountain's bulk is *above* the chamber.
- **Total approach time on foot:** ~5-8 minutes walking (matches the deliberation target)

### 4.2 Path geometry (specific, per site plan §4.2)

The J-curve has 3 legs and 2 bends, mirroring the site plan's path:

| Segment | Start (X, Y, Z) | End (X, Y, Z) | Length | Direction | Notes |
|---|---|---|---|---|---|
| **Leg 1 — South (descending)** | `(0, 1,100, -500)` | `(0, 1,180, -300)` | ~200 blocks | South, descending from y=1,100 to y=1,180 (80 blocks descent) | The blast door side-branch opens to the *west* (left) of this leg, at ~`(−100, 1,170, −250)`, ~250 blocks in |
| **Bend 1 — East (smooth 90°)** | `(0, 1,180, -300)` | (curve) | ~30 blocks | South-to-east | Smooth curve; visitor feels the turn |
| **Leg 2 — East (mostly level)** | (curve) | `(300, 1,196, -300)` | ~300 blocks | East, slight ascent from y=1,180 to y=1,196 | Slight ascent as the tunnel approaches chamber elevation |
| **Bend 2 — South (smooth 90°)** | `(300, 1,196, -300)` | (curve) | ~30 blocks | East-to-south | The ceiling rises here; the visitor can sense the chamber ahead |
| **Leg 3 — South (chamber approach)** | (curve) | `(50, 1,196, 200)` | ~300 blocks | South, level | The tunnel widens; the chamber becomes visible at the end |
| **Chamber entry** | `(50, 1,196, 200)` | (opens into chamber) | — | — | The visitor enters the chamber from the *north* end |

**Y descent detail:** The tunnel *descends* (Leg 1), then is *mostly level* (Leg 2-3) at chamber elevation. The visitor feels they are *going down into the mountain* and then traveling *along the chamber level*. This matches the real complex's experience: a long descent from the surface, then horizontal travel to the chambers.

### 4.3 Wall treatment — three stages

The tunnel wall *changes character* as the visitor moves through it. This is the **Veteran's observation**: "the rough granite starts to look finished, then you see the concrete liner." The build must convey this progression.

**Stage 1 (Leg 1, blocks 0-200 from portal): Raw rock.**
- Walls: `granite`, `polished granite`, `pink terracotta`, `red terracotta` (Pikes Peak palette, the same stone as the mountain)
- Ceiling: same granite, with `stone` accents for the rock-bolt plates (placed every 5-8 blocks, 1×1 plate with a 1-block `chain` hanging from it)
- Floor: `gravel` (the temporary construction surface)
- The tunnel feels *rough* and *unfinished*.

**Stage 2 (Bend 1 + Leg 2, blocks 200-500): Concrete liner begins.**
- Walls: `light gray concrete` (the permanent liner) on the lower 2-3 blocks, with `granite` above
- Floor: `polished andesite` (finished floor)
- Ceiling: `stone` + `light gray concrete` alternation, with `iron bars` as additional rock bolts
- Pipes along the right wall: `green concrete` (water), `red concrete` (fire suppression), `yellow concrete` (fuel), `blue concrete` (compressed air), 1 block off the floor, 1 block thick, running the length of stage 2
- Cable trays along the left wall: `oak fence` + `chain` (the wooden-tray-metal-cable aesthetic)
- The tunnel feels *finished* but *industrial*.

**Stage 3 (Bend 2 + Leg 3, blocks 500-800, the final approach to the chamber):** Polished institutional.
- Walls: `light gray concrete` to ceiling
- Floor: `polished andesite` with `iron trapdoor` (laid flat) accent strips every 20 blocks
- Ceiling: `light gray concrete` with `end rod` light strips every 8 blocks
- Pipe runs: same as Stage 2 but cleaner, with `redstone lamp` "valve" indicators
- Fire doors: `light gray concrete` + `iron door` + small `glass pane` porthole, every 100 blocks. A `sign` on each: "FIRE DOOR — KEEP CLOSED"
- The tunnel feels *permanent* and *institutional*.
- **The chamber is visible at the end** — the tunnel widens slightly, the ceiling rises, the visitor can see the chamber's entrance.

### 4.4 Lighting plan (tunnel)

- **Stage 1:** No lighting. The visitor has a `torch` (their own) or one `redstone lamp` every 30 blocks. The first 200 blocks should feel *dark* — the visitor is in the rough.
- **Stage 2:** `redstone lamp` every 15 blocks, on the ceiling. Dim.
- **Stage 3:** `end rod` strips every 8 blocks, recessed into the ceiling. Brighter, but still institutional.
- **Side niches:** every 50 blocks, a 2×2×3 alcove with `redstone lamp` + `sign` ("Niche 7", "Niche 14", etc.) and a `chest` for "emergency supplies." Place 16 of them along the tunnel.

### 4.5 The side-branch for the blast door

- The blast door side-branch opens to the **west** (left) off Leg 1, at ~`(−100, 1,170, −250)` — ~250 blocks into the tunnel, *before* Bend 1.
- The branch is a 4-block-wide × 4-block-tall × ~10-block-long side tunnel (per site plan §4.3), curving slightly (radius 10 blocks) so the visitor doesn't see the doors until the last few blocks.
- The floor steps down 1 block at the branch entrance to indicate "you are entering a controlled space."
- The branch ends at the first blast door, with the airlock chamber, then the second blast door, then the chamber-side access tunnel to the chamber (which connects back to Leg 2 of the main tunnel).

**Note on chamber access from the airlock:** Per site plan, after the second blast door, a short access tunnel (~30 blocks) leads *back* into the main tunnel near Leg 2 / Bend 2, so the visitor re-enters the main tunnel and continues to the chamber. This matches the real complex's layout: the blast doors are on a *side branch* off the main tunnel, not on the main tunnel itself.

---

## 5. The Blast Door Airlock

### 5.1 The cinematic moment

The blast doors are the *defining cinematic beat* of the approach. The visitor has walked 800 blocks in dim light, the tunnel has narrowed, the rock has become concrete, the pipes have multiplied, and suddenly the tunnel opens into a small chamber with two massive iron doors, *one closed, one open*, and a sign reading "AIRLOCK." **This is the moment the visitor passes from "outside" to "inside."**

### 5.2 The 2× scaling

Per the deliberation, the blast doors are *scaled up 2×* in their local context so they remain imposing at compressed scale. At 1:1, the real door is 20 ft × 3 ft (6 m × 0.9 m). At 4:1 horizontal and 2:1 vertical, this becomes 1.5 m × 0.45 m — invisible. At 2× local scaling: **3 m × 1 m thick** (3 blocks wide × 1 block thick, 6 blocks tall). Still imposing. Larger than the surrounding tunnel.

### 5.3 The two doors

**Door 1 (the one the visitor sees first):**
- **Dimensions:** 6 blocks tall × 4 blocks wide × 1 block thick (3× the tunnel width)
- **Material:** `iron block` face, with `black concrete` as a 1-block frame around the perimeter
- **Bracing pattern:** `iron bars` in a chevron / "Z" pattern on the door face, every block
- **Hinges:** 3 `iron bars` (or `chain` columns) on the *tunnel side* of the door, connecting to `iron block` hinge posts. Visible 1-block-thick hinges on the left side.
- **The door is angled outward** at 5-10°. Use `iron block` stair blocks or `iron block` slab + `iron block` to create the angle. The angled door reads as "this door seals *tighter* under blast pressure."
- **Hand-crank backup operator:** A `chain` column on the right side of the door, with an `anvil` at the top as the crank handle. A `sign` reads "HAND CRANK — EMERGENCY OPERATION ONLY"
- **Door state (default):** Door 1 is **OPEN** (in keeping with the post-1992 "permanently open" reality and the 2001 exception). Use a 4×6 block gap (i.e. the door is *not* present in the airlock, the gap is open). The visitor walks through the open Door 1 position into the airlock chamber.

**Door 2 (the one the visitor sees second, at the chamber entrance):**
- **Identical construction** to Door 1
- **Default state:** OPEN
- The airlock chamber is between the two doors.

### 5.4 The airlock chamber

- **Dimensions:** 12 blocks long × 8 blocks wide × 6 blocks tall
- **Floor:** `polished andesite` (smooth, institutional)
- **Walls:** `light gray concrete` with `iron block` corner reinforcement
- **Ceiling:** `light gray concrete` with 4 `redstone lamp` (the chamber is *bright* compared to the tunnel — this is the contrast)
- **Signage:**
  - Above Door 1: `sign` "AIRLOCK — DOOR 1 OF 2"
  - Above Door 2: `sign` "AIRLOCK — DOOR 2 OF 2 — CHAMBER ACCESS"
  - Center wall: `sign` "POSITIVE PRESSURE — KEEP DOORS CLOSED IN ALERT"
  - Floor strip at Door 1: `red concrete` chevron stripe, 1 block wide
  - Floor strip at Door 2: `red concrete` chevron stripe
- **Equipment:**
  - Right wall: 2 `chest` ("Pressure Equalization", "Emergency Seals")
  - Left wall: `sign` "DURING COLD WAR: ONE DOOR ALWAYS CLOSED. CURRENTLY: BOTH OPEN."
  - A 1×1×6 `chain` column at the chamber center (a structural support reading as a pipe)

### 5.5 The blast door exterior (looking back from the chamber)

When the visitor has passed through Door 2 and turns around, they see:
- Door 2 (the closed/open door they just walked through)
- The airlock chamber
- Door 1 at the far end
- The tunnel mouth beyond, curving away

This is the *postcard shot* — the visitor at the chamber entrance, the blast door behind them, the tunnel mouth visible in the dim distance. The 25-ton door reads as a *threshold*.

### 5.6 The warning markings

- On the door face, large `red concrete` chevron arrows pointing toward the door center ("this way closes")
- "DANGER — BLAST DOOR" `sign` above each door
- "25 TONS — DO NOT BLOCK" `sign` below the hand crank
- "AUTHORIZED PERSONNEL ONLY" `sign` at the airlock entrance

---

## 6. The Main Chamber (The Money Shot)

### 6.1 The chamber geometry

The chamber is the single most important space in the build. It must feel *vast*, *quiet*, and *humming*.

- **Footprint:** 45 blocks (long axis, E-W) × 25 blocks (short axis, N-S)
- **Ceiling height:** 18-20 blocks above the floor
- **Y position:** Floor at Y = portal Y - 22 (the chamber sits 2 blocks below the tunnel's lowest segment)
- **Y range:** Y = (portal-22) to Y = (portal-2). Above Y = (portal-2): solid `granite` for 1,400+ blocks (the mountain).
- **Total chamber area:** ~1,125 blocks² = ~4,500 m² at compressed scale. Real: 4.5 acres ≈ 18,200 m². The compressed build is at ~1:4 area scale, *intentionally* — the visitor should be able to *see all 15 buildings from the chamber entrance*. Compression is the point.

### 6.2 The unified chamber and the 5 × 3 building grid

Per site plan §4.4, the chamber is **rendered as a single larger unified chamber** (not 3 parallel main tunnels + 4 cross tunnels). The 15 buildings are arranged in a **5 × 3 grid** inside the chamber. The 1967 Lewiston Daily Sun's "3 main tunnels + 4 cross tunnels" geometry is *suggested* by the building arrangement and by subtle floor markings, but the compressed build unifies them into one walkable space.

- **Chamber footprint:** 45 blocks (X, east-west) × 25 blocks (Z, north-south) — matches the site plan
- **Chamber Y range:** floor at y=1,196, ceiling at y=1,214 (18 blocks of clearance)
- **Building grid:** 5 columns (X) × 3 rows (Z) = 15 buildings
- **Column spacing:** 8 blocks center-to-center (buildings ~6 wide with 2-block walkways)
- **Row spacing:** 7 blocks center-to-center (buildings ~5 deep with 2-block walkways)
- **Building clearance:** 1-block gap between building and any rock wall or adjacent building (the 0.5-block real-world 18-inch clearance, scaled up 2× per the deliberation's signature-detail rule)

**Layout (top-down view, North is up, East is right):**

```
                            <- West (deep)              East (tunnel entrance) ->

                   z=41 (North row)      5 buildings
                   z=48 (Middle row)     5 buildings  ← Battle Cab at center (-2, 41? no, see site plan)
                   z=55 (South row)      5 buildings  ← 2-story support + Stargate door

  X: -22 to +23 (45 wide)
  Z:  38 to  63 (25 deep)

  Building positions (from site plan §4.5, with architectural function assignment):

  | ID | Pos (X, Z) | Type | Function (architectural interpretation) |
  |----|------------|------|----------------------------------------|
  | 1  | (-18, 41)  | 3-story | Air Defense Operations Center |
  | 2  | (-10, 41)  | 3-story | Missile Warning Center |
  | 3  | (-2, 41)   | 3-story | Space Control Center |
  | 4  | (6, 41)    | 3-story | Combined Intelligence Watch |
  | 5  | (14, 41)   | 3-story | Support / utility (5th ops support) |
  | 6  | (-18, 48)  | 3-story | Operations support (communications) |
  | 7  | (-10, 48)  | 3-story | Systems Center / power distribution |
  | **8** | **(-2, 48)** | **3-story** | **BATTLE CAB / COMMAND CENTER — the centerpiece** |
  | 9  | (6, 48)    | 3-story | Operations support (battle staff) |
  | 10 | (14, 48)   | 3-story | Weather Operations Center |
  | 11 | (-18, 55)  | 2-story | Chapel |
  | 12 | (-10, 55)  | 2-story | Granite Inn (bar) |
  | 13 | (-2, 55)   | 2-story | Medical / Dental (the cross-section building, optional) |
  | 14 | (6, 55)    | 2-story | Administrative / utility (Stargate corridor nearby) |
  | 15 | (14, 55)   | 2-story | Convenience / break room (or Server room with WOPR) |
```

**The Battle Cab at position (-2, 48) is the centerpiece.** The visitor's path through the chamber passes it on the main E-W axis. The 4 other named ops centers (Air Defense, Missile Warning, Space Control, Combined Intelligence Watch) are in the *north row* (z=41), which is the *deepest* (farthest from the entrance) — the most protected, the most institutional. The human spaces (chapel, Granite Inn) are in the *south row* (z=55), the closest to the entrance, where the visitor encounters the warm light last.

**Subtle cross-tunnel suggestion:** The 1967 chamber geometry is hinted at by:
- A `yellow concrete` line running E-W along z=48 (the "main axis" — also the visitor's main path)
- A `yellow concrete` line running N-S at x=-2 (the Battle Cab's column)
- A `sign` at the chamber entrance: "MAIN CHAMBER — 4.5 ACRES (1967) — 3 MAIN TUNNELS × 4 CROSS TUNNELS"
- 4 `light gray concrete` floor patches at the cross-tunnel intersections (the "intersections" of the 1967 geometry, even though the chamber is unified)
- The "1962 FAULT REPAIR" concrete dome in the ceiling (the only structural addition in the chamber, per the deliberation)

**Note on the cross-section building:** Per the original design plan, B7 was the cross-section building. The site plan places building #13 (Medical/Dental) at (-2, 55) — but the cross-section *can* be a different building. For the build, the **cross-section building should be the one most visible from the main path, where visitors will see it**. The most natural choice is building #7 (Systems Center) at (-10, 48), which is on the main E-W axis just west of the Battle Cab. The contractor should pick whichever building best serves the *visibility* requirement; either #7 or #13 is acceptable, but **the cross-section must be on the main path or visible from it**.

### 6.3 The chamber floor

- **Main path surface:** `polished andesite` (the institutional floor, like an aircraft carrier interior)
- **Service paths (between buildings, at the chamber edges):** `iron trapdoor` laid flat (the metal-grating feel)
- **Walkway under each building (visible spring area):** `black concrete` (a deliberate "you can see the springs here" strip)
- **Painted markings:** `yellow concrete` line (1 block wide) running along the chamber's main E-W axis, with `sign` arrows at the intersections ("← TO BATTLE CAB", "← TO RESERVOIR", etc.)
- **Drainage:** A 1-block-wide `gravel` strip along the chamber edges, with occasional `water` source blocks (the natural mountain spring water seeping in)

### 6.4 The chamber ceiling

- **Material:** `granite` + `polished granite` + `pink terracotta` (the bare rock)
- **Rock bolts:** `iron bar` columns from ceiling to upper wall, every 8-10 blocks, with `iron block` base plates (visible engineering)
- **Concrete dome repairs:** 2-3 areas where the ceiling shows a `light gray concrete` dome (the 1962 fault repair), with a `sign` reading "1962 FAULT REPAIR — CONCRETE DOME"
- **Lighting strips:** `end rod` lines recessed into the ceiling, running E-W along each main chamber, every 6 blocks. `redstone lamp` clusters at the cross-tunnel intersections.
- **Cable trays:** `oak fence` + `chain` lines running along the ceiling corners, with `lantern` (iron) cable connectors every 15 blocks. Reads as the 1960s overhead utility runs.

### 6.5 The chamber walls

- **Material:** `granite` + `pink terracotta` mix, with `light gray concrete` patches where rock bolts or conduit runs are
- **Pipe runs:** `green concrete` (water), `red concrete` (fire suppression), `yellow concrete` (fuel), `blue concrete` (compressed air) along the lower 2 blocks of the chamber wall, with `sign` labels every 20 blocks ("WATER — DOMESTIC", "FIRE SUPPRESSION — DO NOT BLOCK")
- **Cable trays:** `oak fence` lines along the upper wall, with `chain` "cables" hanging
- **Blast valve (one, on the chamber wall):** A `chain` column with `iron block` valve wheel, labeled `sign` "BLAST VALVE — NBC VENT — CLOSES ON OVERPRESSURE"

### 6.6 The walkways between buildings

- **Width:** 1 block (a single-block-wide path) — narrow, deliberate
- **Surface:** `iron trapdoor` (laid flat) with `light gray concrete` accent blocks every 10 blocks
- **Handrails (optional):** `iron fence` on both sides of the walkway, 1 block high
- **The visitor should be able to *walk between* the buildings** and see the springs under each one. The 1-block width forces the visitor to be *close* to the buildings.

### 6.7 Lighting plan (chamber)

- **Main chamber ceiling:** `end rod` strips, dim
- **Cross-tunnel intersections:** `redstone lamp` clusters (brighter, to mark the "intersection" of paths)
- **Building footprints:** `redstone lamp` at each building's main entrance, with a `sign` reading the building name
- **Walkway accent lighting:** `soul lantern` every 8 blocks along the walkways (a "cold" blue accent)
- **Atmospheric / danger lighting:** 1-2 `redstone lamp` blocks with `red concrete` behind them (the "alert" state), placed near the 1980 false alarm plaque
- **No torches. No warm light. The dead-air rule.**

### 6.8 The 1,319 springs (the signature)

This is the *thesis* of the build. The visitor must understand, at a glance, that the buildings are *not on the floor*.

**Per-building spring count (at 1× scale):**
- 1,319 total / 15 buildings = ~88 springs per building (average)
- Distribute unevenly: larger buildings (the Battle Cab) sit on more springs, smaller support buildings on fewer
- Sample distribution:
  - 3-story buildings: 90-100 springs each
  - 2-story buildings: 70-80 springs each
  - Battle Cab (the largest): 110-120 springs

**At 1× scale, 88 springs per building is too many to render individually.** The contractor should:
- Render 4-6 *visible* spring columns per building at full detail (2× scaled — `chain` coils with `anvil` top + `iron block` base)
- For the *total count*, use a `sign` placard at each building: "BUILDING X — 88 SPRINGS — 1,000 LB EACH"
- For the master "1,319" number, place an *oversized* sign at the chamber entrance: "1,319 SPRINGS — INSTALLED 1964 — NEVER REPLACED" on an `oak wall sign` 4× wider than the standard

**Spring visual design (the 2× scaled version):**
- Base plate: `iron block` (1×1)
- Coil: 2-3 `chain` blocks stacked vertically (the visible coil)
- Top cap: `anvil` (the "spring under load" look)
- Total height: 4 blocks
- A 1-block air gap between the top cap and the building floor above (the *visible* decoupling)
- A `sign` at the base: "1000 LB / 65,000 LB CAP"

**The cross-section building:**
- One building (suggest B7, the support building nearest the chamber entrance) is built as a *cross-section*: the south wall is removed, so the visitor can see *into* the spring base
- They see: the granite chamber floor, then 1 block of air gap, then the spring base plates, then the chain coils, then the air gap under the building, then the building floor
- The 1-block air gap is *deliberate* — it is the "visible decoupling"
- A `sign` next to the cross-section: "1 INCH NORMAL MOVEMENT / 12 INCHES EXTREME EVENT"

### 6.9 The ambient sway (the subtle detail)

One building (suggest B7, the cross-section building) has a *subtle* ambient sway:
- The building shifts 0.5 blocks laterally every 30-60 seconds
- Use `slime block` + `piston` + `observer` or a similar redstone contraption
- The visitor should *notice* it after a few seconds, then realize what they're seeing: *the building is moving on its springs*
- The Veteran said "I never saw one move. Nobody alive has. The springs are insurance." The build reflects that — subtle, ambient, not a player-triggered effect.

---

## 7. The 15 Spring-Mounted Buildings

The site plan (§4.5) places the 15 buildings in a **5 × 3 grid** inside the chamber, with **12 three-story** (10×6 × 9 blocks) and **3 two-story** (10×6 × 6 blocks). The grid is:

- **North row (z=41):** Buildings 1-5 — the 5 named operations centers (with #3 a support building)
- **Middle row (z=48):** Buildings 6-10 — operations support, with **#8 = Battle Cab (the centerpiece)**
- **South row (z=55):** Buildings 11-15 — the human spaces (chapel, Granite Inn) + support

The visitor's main path runs E-W along the middle row (z=48), passing the Battle Cab head-on.

### 7.1 Building roster (per site plan §4.5, with architectural function assignment)

**North row (z=41) — 5 three-story buildings:**

| # | Pos (X, Z) | Name | Footprint | Height | Function |
|---|---|---|---|---|---|
| **1** | (-18, 41) | **Air Defense Operations Center** | 10×6 | 9 blocks | Radar-tracking screens on the wall, 3 operator consoles in a row, 2 wall displays. Family resemblance to Battle Cab. |
| **2** | (-10, 41) | **Missile Warning Center** | 10×6 | 9 blocks | Status panels on the wall, 3 operator consoles, 1 large wall screen. The renovated-2010-2011 room, slightly more modern feel. Hosts the optional 1979 secondary plaque. |
| **3** | (-2, 41) | **Space Control Center** | 10×6 | 9 blocks | Orbital tracking. A star-map banner on the ceiling (large, dark blue wool with white wool "stars"), 3 consoles, 2 wall screens. |
| **4** | (6, 41) | **Combined Intelligence Watch** | 10×6 | 9 blocks | Smaller briefing-style room. 2 consoles, 1 large wall screen, 1 small briefing table. The "watch" room. The "Chrystal Palace" code-name sign is here. |
| **5** | (14, 41) | **Support / utility** | 10×6 | 9 blocks | Server racks, radio equipment, "secure comms" room. Item-frame mosaic walls showing radio frequency maps. |

**Middle row (z=48) — 5 three-story buildings, on the main path:**

| # | Pos (X, Z) | Name | Footprint | Height | Function |
|---|---|---|---|---|---|
| **6** | (-18, 48) | **Communications / Operations support** | 10×6 | 9 blocks | Briefing rooms, planning tables, secure-document storage. Wooden tables (oak), several chairs, a wall map. |
| **7** | (-10, 48) | **Systems Center / Power Distribution** | 10×6 | 9 blocks (the *cross-section* building) | Power distribution, battery banks, the 6 diesel generator control panels. **This is the cross-section building** — the south wall removed to show the spring array underneath. Also hosts the ambient sway animation. |
| **8** | (-2, 48) | **BATTLE CAB / COMMAND CENTER** | 14×8 (the largest) | 11 blocks | The visual climax. The biggest room. U-shape of consoles, wall of displays, 8 time-zone clocks. The only building with a banner over the entrance reading "COMMAND CENTER." Hosts the 1980 false alarm plaque. |
| **9** | (6, 48) | **Operations support (battle staff)** | 10×6 | 9 blocks | Battle Staff Support Center. Briefing rooms, planning tables. |
| **10** | (14, 48) | **Weather Operations Center** | 10×6 | 9 blocks | Weather data screens, synoptic charts, 2 operator consoles. A satellite-image banner on the wall. |

**South row (z=55) — 5 two-story buildings (the human spaces + support):**

| # | Pos (X, Z) | Name | Footprint | Height | Function |
|---|---|---|---|---|---|
| **11** | (-18, 55) | **Chapel** | 10×6 | 6 blocks | The quiet room. Wooden pews (oak stair blocks), altar (oak slab), cross (oak fence + sign), 1 stained-glass window (light blue stained glass pane cross pattern on the back wall). A small `sign`: "CHAPEL — NONDENOMINATIONAL — QUIET PLEASE." |
| **12** | (-10, 55) | **Granite Inn (bar)** | 10×6 | 6 blocks | The bar. Counter (`dark oak slab`), stools (`dark oak fence`), 3-4 bottles (`potion` or `honey bottle` on the shelf), a chalkboard (`oak wall sign` reading "TODAY'S SPECIAL: BEER $1"), warm `shroomlight` lighting. A `sign` outside: "GRANITE INN — EST. 1967" (the inside joke). The MrBeast sign is on the back wall. |
| **13** | (-2, 55) | **Medical / Dental** | 10×6 | 6 blocks | A small side-room with a single bed (`white bed`) and a single dental chair (`quartz stair`). Per deliberation Topic 2, this is a single nod, not a full build. A `sign`: "MEDICAL / DENTAL." |
| **14** | (6, 55) | **Administrative / utility** | 10×6 | 6 blocks | Office space. Desks (oak), chairs, filing cabinets (chest), a small break area. A `sign`: "ADMINISTRATIVE." |
| **15** | (14, 55) | **Server room with WOPR terminal** | 10×6 | 6 blocks | The IBM 3090 / modern equivalent. Banks of "servers" (`chest` + `note block` rows), blinking `redstone lamp` indicators. **The WOPR terminal is here**, in a back corner — clearly labeled as a movie reference. The Stargate Command corridor is adjacent. |

### 7.2 Building material treatment (all 15)

- **Exterior walls:** `light gray concrete` (the institutional skin)
- **Floor (each floor):** `polished andesite` in corridors, `blue wool` in the Battle Cab, `light gray wool` in other ops centers
- **Ceiling (each floor):** `light gray concrete` with `redstone lamp` strips every 6 blocks
- **Doors:** `iron door` (the brushed-steel institutional door)
- **Windows:** None. The buildings are windowless. (This is the *defining* feature.)
- **Connectors between buildings:** 1-block-wide `light gray concrete` walkways with `iron fence` railings, 1 block above the chamber floor (so the visitor can see the springs below)
- **Signage:** `oak wall sign` at each building entrance with the building name and number. Format: "B-08 / BATTLE CAB / COMMAND CENTER" (matches the site plan's building ID convention)

### 7.3 Spring mount design (all 15)

- Every building sits on a *visible* spring array (4-6 visible spring columns per building at 2× scale, plus a sign indicating the actual count)
- 1-block air gap between the chamber floor and the building's base plate
- **The cross-section building is #7** (Systems Center, on the main E-W axis at -10, 48, just west of the Battle Cab). The south wall is removed so the visitor can see *into* the spring base. The ambient sway animation is on this building.
- The 1980 false alarm plaque is in the **Battle Cab (#8)**, on the back wall to the right of the entrance door.
- The WOPR terminal is in **#15** (the back-corridor area in the SE corner of the chamber). The site plan calls this "Support / Stargate Command corridor" — the WOPR and Stargate door are both in this back-corridor area, as off-path easter eggs.
- The Stargate Command door is in **#15** (per site plan §4.5). It's in a back-corridor space, not on the main E-W path. See §13 for full detail.

---

## 8. The Battle Cab (The Climax)

### 8.1 The visual reference

Per the deliberation, the visual reference is the **2006-2016 vintage** NORAD command center (the famous Battle Cab photos, gold-standard `interior/5.jpeg` and `interior/2.jpeg`). The build is **Cold War institutional**, not modern, not Stargate-set, not WarGames-set.

### 8.2 The room layout

- **Room dimensions:** 12 blocks wide × 7 blocks deep × 4 blocks tall (interior of B1)
- **Floor:** `blue wool` (the dark blue institutional carpet of the 2006-2016 photos)
- **Walls:** `light gray concrete` (the painted concrete of the institutional interior)
- **Ceiling:** `light gray concrete` with `redstone lamp` strips (dim, the only overhead light)

### 8.3 The wall of displays (the money shot within the money shot)

The Battle Cab's signature is the *wall of displays* at the front of the room. The build treats this as a 2× signature detail.

**The wall layout (the front wall of the room, 12 blocks wide × 4 blocks tall):**
- **Top row (4 blocks tall, the big screens):** A 2×2 grid of large display panels, each 5 blocks wide × 2 blocks tall
  - **Top-left panel:** A world map, built as an item-frame mosaic. 5 blocks wide × 2 blocks tall = 10 item frames. Use a `filled_map` (cartographer table) per item frame, with a world-map banner as the base layer.
  - **Top-right panel:** A status display, built as a 5×2 item-frame mosaic of banner patterns (the 1980s ASCII status panel look — alternating red/white/blue banners).
  - Below the top row, a `sign` running the full 12-block width: "WELCOME TO THE NORAD COMMAND CENTER" in `red concrete` letters on a `black concrete` background (the famous red ticker).
- **Middle row (3 blocks tall, the time-zone clocks):** 8 `clock` blocks, evenly spaced across the 12-block-wide wall, with `sign` blocks under each: **"ZULU / EXERCISE / HAWAII / PACIFIC / MOUNTAIN / CENTRAL / EASTERN / MOSCOW"** (the 8 labels from the 2006 NORAD Battle Cab photo, exactly as documented). Each clock occupies 1.5 blocks of width (alternating `clock` and `sign` blocks: `CLOCK / SIGN / CLOCK / SIGN / ...` for the 8 labels).
  - **Note:** Minecraft `clock` doesn't show the real time of day in a static build. Use `clock` blocks anyway for the visual; the *meaning* is the label, not the time shown. The 8 labels are the *exact* 2006 documented set; the 4-clock version mentioned in the deliberation is the *minimum* — the full 8 is the iconic reference.
- **Bottom row (console height, 1 block tall):** The console desks, see below.

### 8.4 The U-shape of operator consoles

The Battle Cab's consoles are arranged in a U-shape facing the wall of displays. The 1980s/2006 photo shows 5-6 operator positions.

**The U-shape (top-down view, viewing the wall of displays):**
- **Center desk:** A row of 2 `note block` (the consoles) facing the wall, 2 blocks deep
- **Left arm:** A row of 2 `note block` consoles, perpendicular to the center desk
- **Right arm:** A row of 2 `note block` consoles, perpendicular to the center desk
- **Total: 6 operator positions** (2 + 2 + 2), 5-6 stations as the deliberation specifies
- Each console: a `note block` (the "computer"), a `sign` on the wall behind with a station label ("CD — COMMAND DIRECTOR", "SD — SENIOR DIRECTOR", "WC — WEATHER COORD", etc.), a `lever` (the "key"), a `redstone lamp` (the "screen glow")
- **Beige executive chairs:** 6 `light gray wool` blocks, 1 block in front of each console, at chair height (use `slab` for the chair seat)

### 8.5 The "dead air" feel

- **Lighting:** Dim. The room's *brightest* things are the wall displays (redstone-lamp-backed item-frame mosaics) and the clock row. The rest of the room is in shadow.
- **Sound:** A `note block` placed *under* the floor (in the chamber below) playing a slow, low pulse — the "active electronics" hum. The visitor can't see it, but they can *feel* the room is alive.
- **No decorations.** No plants, no posters, no personal items. The room is *built to be ignored*. The 12-hour-shift operator's room.
- **The "WELCOME" banner** is the *only* decoration. It is part of the *function*, not the *decoration*.

### 8.6 The vintage 2006-2016 references

- **CRT monitors:** `note block` + `redstone lamp` for the screen glow
- **Beige computers:** `light gray wool` or `smooth stone slab` for the chassis
- **Beige chairs:** `light gray wool` (the closest to beige in Minecraft)
- **The "NORAD" stencil:** Use `sign` blocks with the building's function stenciled on the console
- **The clock face:** `clock` blocks (even though they show Minecraft time, not real time, the *visual* is what matters)

### 8.7 The entrance

- **The door:** An `iron door` (the institutional door) at the back of the room
- **Above the door:** A `sign` reading "B-01 / BATTLE CAB / COMMAND CENTER"
- **The visitor path:** They enter at the back of the U, walk to the center, and face the wall of displays. The wall fills their field of view.

---

## 9. The Four Other Operations Centers

Each of the 4 named ops centers (B2 Air Defense, B3 Missile Warning, B4 Space Control, B5 Combined Intelligence Watch) gets a smaller, simpler version of the Battle Cab. **Family resemblance, not identical.**

### 9.1 Common spec (all 4)

- **Room dimensions:** 8 blocks wide × 6 blocks deep × 4 blocks tall (smaller than the Battle Cab)
- **Footprint:** Fits within the 10×6 building exterior
- **Floor:** `light gray wool` (the beige institutional carpet, slightly different from the Battle Cab's blue)
- **Walls:** `light gray concrete`
- **Ceiling:** `light gray concrete` with `redstone lamp` strips
- **Entrance:** `iron door` at the back, `sign` above with the building name

### 9.2 Per-room spec

**B2 — Air Defense Operations Center (Bay 2, East of Battle Cab):**
- **Theme:** Radar tracking
- **Wall displays:** 2 wall screens, each 3 blocks wide × 2 blocks tall, made of item-frame mosaics with banner patterns. One shows a "radar sweep" pattern (circular), the other a "track table" (a grid of dots).
- **Consoles:** 3 `note block` consoles in a row facing the wall, with 1 `lever` each and 1 `redstone lamp` indicator
- **Chairs:** 3 `light gray wool` blocks
- **Sign:** "B-02 / AIR DEFENSE OPERATIONS CENTER" above the door
- **Detail:** A `sign` on the wall: "TRACKING 24/7 — BMEWS / PAVE PAWS / JSS"

**B3 — Missile Warning Center (Bay 4, West of Battle Cab):**
- **Theme:** Missile status / launch detection
- **Wall displays:** 1 large wall screen (4 blocks wide × 2 blocks tall), item-frame mosaic showing a "global map with trajectories" pattern. 2 smaller side screens (1×2 item-frame mosaics) showing ASCII status panels.
- **Consoles:** 3 `note block` consoles, 1 with a `redstone lamp` blinking (the 1979/1980 alarm reference — see section 12)
- **Chairs:** 3 `light gray wool` blocks
- **Sign:** "B-03 / MISSILE WARNING CENTER" above the door
- **Detail:** A `sign`: "DSP / SBIRS SATELLITE FEED — 22,000 MI ALTITUDE"

**B4 — Space Control Center (Bay 1, East end):**
- **Theme:** Orbital tracking / star map
- **Wall displays:** A *star map on the ceiling* — a `blue wool` ceiling section (4 blocks wide × 3 blocks deep) with `white wool` "stars" placed randomly. This is the *distinctive* feature of this room.
- **Consoles:** 3 `note block` consoles facing the side wall
- **Wall screens:** 2 item-frame mosaics on the side wall, showing orbital paths (concentric ring patterns)
- **Chairs:** 3 `light gray wool` blocks
- **Sign:** "B-04 / SPACE CONTROL CENTER" above the door
- **Detail:** A `sign`: "SPACE SURVEILLANCE NETWORK — 24/7 ORBITAL TRACKING"

**B5 — Combined Intelligence Watch (Bay 5, West end):**
- **Theme:** Briefing / watch floor
- **Wall displays:** 1 large wall screen (3 blocks wide × 2 blocks tall) showing a "world situation map"
- **Briefing table:** A central `oak slab` table (3 blocks wide × 2 blocks deep), with 4 `light gray wool` chairs around it
- **Consoles:** 2 `note block` consoles on the side wall (not the U-shape)
- **Sign:** "B-05 / COMBINED INTELLIGENCE WATCH" above the door
- **Detail:** A `sign`: "ALL-SOURCE INTELLIGENCE — 24/7 WATCH"

### 9.3 The designer-interpretation placard

Per the deliberation, a *single master placard* is placed in the chamber array (suggest: at the chamber entrance, on the main E-W axis, at the visitor's eye level):

> **OPERATIONS CENTER INTERIORS**
>
> These rooms are designer interpretations based on declassified public information, 2006–2016 public photographs, and the 1978 GAO report on the five operating centers. Layouts, console arrangements, and equipment placements are not the real facility layouts.

This placard is the Realist's insurance. It is *required*, per the deliberation. Place it on an `oak wall sign` (large) on the chamber wall, with the text on multiple lines. The visitor *must* pass it on the way to the Battle Cab.

---

## 10. The Water Reservoir

### 10.1 Spec

The deliberation allows **1 main water reservoir** (the real complex has 4 + 1 heat-sink; 1 is enough for the build). Per site plan §4.9, the reservoir is **offset west of the chamber**, accessed by a ~30-block access tunnel from the chamber's west wall.

- **Position:** `(-300, 1,180, 50)` — offset to the west of the main chamber
- **Access:** A 30-block-long access tunnel from the chamber's west wall, descending slightly (chamber floor y=1,196 → reservoir ceiling y=1,180)
- **Footprint:** 30 blocks (X, east-west) × 15 blocks (Y, vertical) × 20 blocks (Z, north-south) — the visible cavern
- **Y range:** y=1,165 to y=1,180 (the cavern is *below* the chamber by 16 blocks)
- **Walls:** `dark prismarine` or `deepslate tiles` (the "carved" feel, dark and slightly textured), with `polished andesite` accents on the structural ribs every 10 blocks
- **Ceiling:** `dark prismarine` with `soul lantern` clusters at the structural ribs
- **Floor:** `dark prismarine` with `gravel` patches (the sediment)
- **Water:** `water` source block filling the lower ~5 blocks of the cavern, *still* (no current, no flow)

### 10.2 The boat

- **Position:** Floating in the center of the reservoir, slightly offset
- **Build:** An `oak boat` placed on the water surface. Optional: a `chest` inside the boat (the "reservoir inspection supplies").
- **The visitor can boat across** the reservoir (this is the *playable moment* — a moment of quiet in the otherwise institutional build).

### 10.3 The causeway / dock

- **Position:** Along the north wall of the reservoir
- **Build:** A 2-block-wide `polished andesite` walkway, 1 block above the water surface, with `iron fence` railings
- **Length:** 25 blocks (most of the reservoir length)
- **Access:** A `light gray concrete` stairway from the chamber floor down to the causeway
- **The visitor path continues** along the causeway to the boat dock

### 10.4 Lighting (reservoir)

- **Dim.** The reservoir is the *quietest space* in the build.
- **Ceiling ribs:** `soul lantern` at each rib (cold blue, the "deep underground" feel)
- **Causeway:** `soul lantern` every 8 blocks along the causeway
- **Reflected light:** The still water reflects the soul-lantern light. (Minecraft doesn't render reflection, but the visitor will *feel* it from the lighting placement.)
- **No redstone lamps in the reservoir.** The reservoir is *not* the institutional feel — it is the *natural* (well, excavated) feel.

### 10.5 The atmosphere

The reservoir is the build's *contemplation room*. The visitor arrives from the bright, humming chamber into a quiet, dim cavern with a still dark lake. They should *stop talking*. The contrast with the rest of the build is the point.

A `sign` at the causeway entrance:
> **RESERVOIR — 1.5 MILLION GALLONS**
> **WATER SUPPLY: NATURAL MOUNTAIN SPRINGS + STORED**
> **BOAT: FOR AUTHORIZED INSPECTION ONLY**

---

## 11. The Granite Inn + Chapel + Support Rooms

### 11.1 The Granite Inn (B15)

The *only* warm-lit room in the build. The contrast is the point.

- **Position:** South chamber, Bay 5 (West end)
- **Building:** 10×6 footprint × 6 blocks tall (two-story)
- **Ground floor (the bar):**
  - **Floor:** `oak plank` (the wooden floor)
  - **Walls:** `dark oak plank` (the wood paneling) on the lower 3 blocks, `light gray concrete` on the upper 3 blocks
  - **Ceiling:** `dark oak plank` with `shroomlight` clusters (the *only* warm light in the build)
  - **Bar counter:** `dark oak slab` running along the north wall, 6 blocks long × 1 block wide × 1 block tall
  - **Bar stools:** 4 `dark oak fence` posts in front of the counter
  - **Bottles:** 6 `potion` items (`glass bottle` + `magenta dye` for the colorful look) on a shelf behind the counter
  - **Chalkboard:** `oak wall sign` on the wall behind the bar: "TODAY'S SPECIAL: $1 BEER / $2 BURGER / $3 STEAK"
  - **Other furniture:** 3-4 `oak stair` booths along the south wall (booth = stair + slab + fence)
  - **Sign:** `oak wall sign` outside: "GRANITE INN — EST. 1967"
  - **A `sign` inside:** "FOR PSYCHOLOGICAL MAINTENANCE OF PERSONNEL — OFFICIAL USE"
- **Upper floor (the dining area):**
  - **Floor:** `oak plank`
  - **Walls:** `dark oak plank` lower, `light gray concrete` upper
  - **Tables:** 3-4 `oak slab` tables (2×2), each with 4 `oak stair` chairs
  - **Lighting:** `shroomlight` clusters, dim
  - **A `sign`:** "DINING FACILITY — 24/7 FOR STAFFED SHIFTS"

### 11.2 The Chapel (B14)

The *quiet room*. The contrast with the Granite Inn is the *other* contrast (still quiet, not warm, but *peaceful*).

- **Position:** South chamber, Bay 4
- **Building:** 10×6 footprint × 6 blocks tall (two-story, but the second floor is just a storage loft)
- **Ground floor (the chapel proper):**
  - **Floor:** `oak plank` (the wooden chapel floor)
  - **Walls:** `spruce plank` on the lower 3 blocks, `light gray concrete` on the upper 3 blocks
  - **Ceiling:** `spruce plank` with `shroomlight` cluster at the center (warmer than the chamber, but still quiet)
  - **Pews:** 4 rows of `oak stair` pews, 2 blocks deep × 4 blocks wide each row, facing the altar
  - **Altar:** `oak slab` table (1 block wide × 1 block deep × 1 block tall) at the front, with a `soul lantern` (a single candle) and a small `oak fence` cross
  - **Stained glass window:** A `light blue stained glass pane` cross pattern on the back wall (2 blocks wide × 3 blocks tall, with a cross shape in `white stained glass pane`)
  - **Sign:** `oak wall sign` outside: "B-14 / CHAPEL — NONDENOMINATIONAL — QUIET PLEASE"
  - **A `sign` inside:** "FOR USE BY ALL FAITHS — SCHEDULE ON DOOR"

### 11.3 The Medical Clinic (B11)

- **Position:** South chamber, Bay 1 (East end)
- **Building:** 10×6 footprint × 9 blocks tall (three-story)
- **Three floors, each 3 blocks tall:**
  - **Ground floor (reception + 2 patient beds):**
    - `white wool` floor (the medical-clean look)
    - `light gray concrete` walls
    - 2 `white wool` "beds" (1×2 wool rows at bed height)
    - 1 `oak slab` reception desk
    - `sign`: "B-11 / MEDICAL CLINIC"
  - **Second floor (pharmacy + examination):**
    - Same white/light-gray palette
    - 1 `quartz stair` examination chair
    - `chest` × 4 for "pharmacy supplies"
    - 1 `brewing stand` for "compounding"
  - **Third floor (staff room + storage):**
    - `oak plank` floor
    - 2 `oak stair` chairs
    - `chest` × 6 for "medical storage"
    - A `sign`: "STAFF ONLY"

### 11.4 The Dental Clinic (B13)

- **Position:** South chamber, Bay 3 (center)
- **Building:** 10×6 footprint × 6 blocks tall (two-story, the small one)
- **Ground floor (single chair + waiting area):**
  - `white wool` floor
  - `light gray concrete` walls
  - 1 `quartz stair` dental chair
  - 1 `oak slab` counter
  - 1 `oak stair` waiting chair
  - `sign`: "B-13 / DENTAL — BY APPOINTMENT"
- **Second floor:** A `chest` × 3 "dental supplies" storage, otherwise empty

### 11.5 Connection to the chamber array

All 4 buildings (B11, B12, B13, B14, B15) are *in* the South chamber — connected to the chamber array by the 1-block-wide walkways between buildings. The visitor walks from the main chamber, into the South chamber, and encounters the human spaces in order: Medical → Computer/Server → Dental → Chapel → Granite Inn. The Granite Inn is at the *far west end* — the visitor has to *walk all the way through* the chamber to reach it. The choice to walk there is the choice to find the warm light.

---

## 12. The 1980 False Alarm Plaque (Main-Path)

### 12.1 Why this is special

The Veteran called this the *most important moment in the public history of the facility*. The 1980 46-cent-chip incident is the *real* reason Cheyenne Mountain matters — not the engineering, but the *margin*. The build must honor it with a *plaque*, not a hidden easter egg.

### 12.2 Location

**Just inside the Battle Cab, on the back wall to the right of the entrance door.** This is the *first thing the visitor sees* after entering the Battle Cab, before they walk to the U-shape of consoles. The position forces them to *read* it.

### 12.3 The build

- **The plaque:** A 3-block-wide × 2-block-tall `light gray concrete` panel on the wall
- **The text:** Rendered as `black wool` 1×1 letters on the `light gray concrete` background. Each letter is 1×1 block. Use a fixed-width letter pattern (e.g., 3×5 letterforms built from `black wool` 1×1 squares).
- **Frame:** A 1-block-wide `black concrete` border around the panel
- **A small `soul lantern`** above the plaque (the *only* warm light in the Battle Cab, drawing the eye to the plaque)
- **A small `redstone lamp`** with `red concrete` backing next to the plaque (the "alert" reference)

### 12.4 The text (full, per the deliberation)

> **JUNE 3, 1980**
>
> A 46-CENT COMPUTER CHIP FAILED IN
> THE MISSILE WARNING NETWORK.
>
> NORAD BRIEFLY REPORTED 2,200 SOVIET
> ICBMs INBOUND. BOMBER CREWS TOOK
> THEIR STATIONS.
>
> NATIONAL SECURITY ADVISOR
> ZBIGNIEW BRZEZINSKI WAS WOKEN
> AT 3:00 A.M. HE DID NOT WAKE
> HIS WIFE, CALCULATING SHE HAD
> MINUTES TO LIVE.
>
> THE ALERT WAS RESOLVED WHEN A
> THIRD CALL REPORTED NO RADAR OR
> SATELLITE CONFIRMATION.
>
> "GOING TO WAR. AND IT CAME DAMN
> CLOSE TO TAKING THE COUNTRY
> WITH IT."
> — OFFICE OF TECHNOLOGY ASSESSMENT

### 12.5 The 1979 plaque (optional, secondary)

Per the deliberation, an *optional* smaller plaque for the 1979 test-tape false alarm. Place it in the **Missile Warning Center (B3)** — the room that *would have generated* the false alarm.

- **Build:** A 2-block-wide × 1-block-tall `light gray concrete` panel, similar to the 1980 plaque but smaller
- **Text (brief):**
  > **NOVEMBER 9, 1979**
  > A 427M TEST PROGRAM WAS INADVERTENTLY
  > UPLOADED TO THE LIVE WARNING SYSTEM.
  > 1,400 SOVIET ICBMs REPORTED.
  > RESOLVED IN 6 MINUTES.

---

## 13. The Stargate Door (Easter Egg)

### 13.1 The discipline

Per the deliberation: **a single door, signed, in a back corridor. Nothing else.** The Realist's discipline holds. The Stargate broom-closet joke is a *single nod*, not a full build. The visitor who finds it will know exactly what they're looking at.

### 13.2 Location

**In building #15's back-corridor area, in the SE corner of the chamber at (14, 55).** Per site plan §4.5, #15 is "Support / Stargate Command corridor" — a back-corridor area, *not* on the visitor's main E-W path. The visitor would only find the Stargate door by *exploring* the back-corridor area near #15, not by walking the main path.

- The back corridor is a 1-block-wide passage running along the south wall of the chamber (behind the south row of buildings), accessible from the chamber's main E-W axis via a small gap between two buildings
- At the back-corridor entrance near #15, a `dark oak door` (the "Stargate Command" door)
- Above the door, a `sign`: "STARGATE COMMAND" in `black wool` 3×5 letterforms on `light gray concrete` background (same style as the portal lettering)
- Next to the door, a smaller `sign`: "AUTHORIZED PERSONNEL ONLY" (the real joke — it's a broom closet, the "authorization" is a wink)

### 13.3 What's behind the door

**Nothing.** The door opens onto a 2×2 `light gray concrete` room with a single `chest` ("mops") and a `sign`: "JANITORIAL". The visitor who opens the door sees the joke *and* the joke's punchline. There is no stargate, no iris, no Asgard. The door is the entire reference.

---

## 14. Easter Eggs (Off-Path)

Per the deliberation, all easter eggs are *off the main path* and *clearly labeled* as cultural references. The main path carries real history (the 1980 plaque). The off-path carries the fiction.

### 14.1 The WOPR Terminal (Wargames, 1983)

- **Location:** The Computer/Server Room (B12), in a *back corner* behind the server racks
- **Build:**
  - A 1×2 area with a `note block` "terminal" on a `black concrete` desk
  - A `redstone lamp` "screen" above the terminal
  - An item-frame mosaic on the wall behind: 1 `filled_map` with a custom banner showing a chess board (the WOPR's "shall we play a game?" motif)
  - A `sign` next to the terminal: "GREETINGS PROFESSOR FALKEN" in green `wool` letters
  - A smaller `sign` below: "WOPR — WAR OPERATION PLAN RESPONSE — *WARGames* (1983) movie reference"
- **The label makes it clear this is a movie reference, not a real object.**

### 14.2 The "Chrystal Palace" Sign (Wargames, NORAD exercise code name)

- **Location:** A back corridor between two of the South chamber buildings (B12 and B13), on the back wall
- **Build:** A `sign` reading: "CHRYSTAL PALACE — ALTERNATE NORAD EXERCISE CODE NAME, c.1980s"
- **Below it, a smaller `sign`:** "REFERENCE: *WARGames* (1983)"
- **The label makes the source clear.**

### 14.3 The MrBeast "$1 vs $1,000,000,000,000" Sign

- **Location:** The Granite Inn (B15), on the back wall of the ground floor (the bar)
- **Build:** A `sign` reading: "$1 vs $1,000,000,000,000 — THE NUCLEAR BUNKER — *MrBeast* (2025)"
- **A hidden `gold block`** behind a `painting` on the wall — the YouTube play button, a tiny detail for the explorer

### 14.4 The 1980 false alarm cross-reference (in the Server Room, B12)

The 1980 false alarm plaque is on the *main path* (Battle Cab), but the Server Room (B12) can have a *secondary* reference:

- **A single `redstone lamp` with `red concrete` backing** blinking on and off (a slow pulse), in a corner of the server room
- **A `sign` below it:** "MISSILE WARNING TEST — 1980/06/03 — 02:26 HRS"
- **The visitor connects the dots** if they know the history

### 14.5 The "DEAD AIR" sign (institutional humor)

- **Location:** The main tunnel, in a wall niche at the 400-block mark (Stage 2)
- **Build:** A `sign` reading: "DEAD AIR — 22 DAYS — NO RAIN, NO WIND, NO BIRDS"
- **The visitor who knows the lore smiles.** The visitor who doesn't moves on.

### 14.6 The "NORAD Tracks Santa" banner (seasonal, optional)

- **Location:** The main chamber, on the wall above the chamber entrance (where the visitor first enters the chamber)
- **Build:** A `red wool` + `white wool` banner (or `oak wall sign`): "NORAD TRACKS SANTA — DECEMBER 24 — SINCE 1955"
- **A smaller `sign`:** "TRACK NORADSANTA.ORG ON CHRISTMAS EVE"
- **Optional:** The banner is *seasonal* — the contractor can swap it in for December screenshots

### 14.7 The "DEW Line / BMEWS / PAVE PAWS" signage (real but subtle)

- **Location:** Throughout the Air Defense and Missile Warning centers
- **Build:** Small `sign` blocks citing the real sensor networks that feed the complex
- **Not an easter egg, but a real-history detail for the visitor who reads closely**

---

## 15. Lighting Plan (by Zone)

| Zone | Primary block | Density | Mood |
|---|---|---|---|
| **Mountain exterior** | none (daylight) | — | Natural. Sun and shadow. |
| **Approach road** | none | — | Natural, dim under tree cover. |
| **North Portal area** | `lantern` (iron) at the guardhouse, 1 `redstone lamp` inside the guardhouse | 1-2 | A single warm point. The visitor passes from outdoors to indoors. |
| **Tunnel Stage 1 (rough rock)** | none / `redstone lamp` every 30 blocks | sparse | *Dark*. The visitor feels the depth. |
| **Tunnel Stage 2 (concrete liner)** | `redstone lamp` every 15 blocks | dim | Institutional. The visitor feels the engineering. |
| **Tunnel Stage 3 (polished institutional)** | `end rod` every 8 blocks | brighter | Permanent. The visitor is inside the complex. |
| **Blast door side-branch** | `redstone lamp` every 5 blocks | bright | The threshold. The visitor is *at* the door. |
| **Blast door airlock chamber** | `redstone lamp` × 4 (bright) | bright | The contrast. The chamber is *brighter than the tunnel*. |
| **Main chamber** | `end rod` ceiling strips, `redstone lamp` at cross-tunnel intersections, `soul lantern` at walkway accents | medium-dim | The "industrial cathedral." Dim, but readable. |
| **Battle Cab** | dim `redstone lamp` ceiling + bright item-frame-map screens | dim overall, bright on the wall | "Dead air" with the screens as the only light. The dramatic room. |
| **Other 4 ops centers** | `redstone lamp` ceiling, `redstone lamp` indicator on each console | dim | Institutional. The screen-glow is the dominant light. |
| **South chamber support buildings (B11-B12)** | `redstone lamp` ceiling | dim | Standard institutional. |
| **Chapel (B14)** | `shroomlight` cluster (warm) + 1 `soul lantern` candle | dim-warm | Quiet. The peaceful contrast. |
| **Granite Inn (B15)** | `shroomlight` clusters (warm) | warm | The *only* warm light. The human space. |
| **Medical / Dental (B11, B13)** | `redstone lamp` ceiling | bright | Clean. Medical-institutional. |
| **Reservoir** | `soul lantern` at ceiling ribs, `soul lantern` on causeway | dim-cold | "Deep underground." The quiet room. |
| **Easter-egg back corridors** | `redstone lamp` sparse | dim | Off-path. The visitor has to *look*. |

### 15.1 The "no warm light" rule (with two exceptions)

The main path and the ops centers use **only** cool/blue/white light. The two exceptions are:
- **The chapel** (`shroomlight` + `soul lantern`) — the spiritual space
- **The Granite Inn** (`shroomlight`) — the human space

These two exceptions are *the only* warm light in the build. The contrast is the point.

### 15.2 The "no torches" rule

**No torches anywhere in the build.** Not in the tunnel, not in the chamber, not in the corridors, not even in the support buildings. The 1966 institutional aesthetic requires fluorescent / redstone-lamp lighting, not the warm flicker of torches. The contractor should use `redstone lamp` (always-on, no flicker) and `end rod` (linear, fluorescent-like) as the primary light sources.

---

*End of design plan. Hand off to the AI Contractor Writer for block-by-block placement. The site plan coordinates from `04-design/site-coordinates.json` are the spatial anchor.*
