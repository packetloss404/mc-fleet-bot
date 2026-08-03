# Masterplan 05 — Combined Zones

Status: **SITING STUDY — NOT AUTHORIZED FOR WORLD EDITS**

## The integration decision

Build the Combined Complex as a new east-side district of the current world, not at Masterplan 04's authored origin and not at the obsolete `(935,60,300)` starter-base location.

The recommended study reserves `x=1500…3050`, `z=-1050…450`. Its local origin is provisionally mapped to `(2250,72,-300)`. The complete plan is rotated 90 degrees so its original south-facing gateway faces west toward the current Data District. This creates a short, legible surface interface while putting the mountain and secure complex farther east, away from the accepted built envelope.

The horizontal layout retains Masterplan 04's authored relationships. The vertical layout is redesigned to fit the current stock Paper world. The choice is deliberate:

- Current cataloged features end at `x=1300`; the study reservation starts at `x=1500`.
- The landscaped Gateway Approach and gateway become the nearest proposed zones to the current world.
- The Data District becomes the physical arrival edge instead of an isolated portal-only jump.
- The mountain reads as an eastern horizon and does not cover MainStreet, Raven Rock, Ravensreach, Westlight, C01, or the owner estate.
- A 90-degree rotation is easier to audit than separately nudging every child zone.

This is the preferred same-world concept, not an execution package. A fresh terrain survey may move or reject it.

## What exists now

The accepted current baseline is the terminal July 28 snapshot with SHA-256 `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`.

Its durable catalog contains 1,215 features over `x=-714…1300`, `y=-46…319`, `z=-719…311.5`. Major current systems include:

- MainStreet America and its mountain secure complex;
- Raven Rock and its four primary portals plus the Z5 headhouse;
- Ravensreach, Ravensgate, Manager Vale, and the civic/library/guild network;
- Westlight, its venues, parkway, crater, and western approach;
- the east-side Data District, Concord, soundstage annex, worker commons, and utility grid;
- C01, the owner corridor, owner estate, and portal-gallery architecture;
- the current PassageWay and other cataloged underground systems.

The requested top-down sheet is [maps/current-and-proposed-whole-world.png](maps/current-and-proposed-whole-world.png). It uses the accepted terminal raster as the existing-world base, then adds only vector planning overlays.

## Coordinate system

The current world remains north-up:

- north = `-Z`
- east = `+X`
- up = `+Y`

Let `(lx, ly, lz)` be a local coordinate from the normalized Masterplan 04 no-ravine design. The top-down transform is:

```text
worldX = 2250 - localZ
worldZ = -300 + localX
```

This maps local south (`+Z`) to world west (`-X`). Examples:

| Authored local point | Proposed world X/Z | Meaning |
|---|---:|---|
| `(0, 0, 700)` | `(1550, -300)` | gateway arrival edge |
| `(0, 0, 500)` | `(1750, -300)` | Gateway Approach / Grand Avenue origin |
| `(0, 0, 0)` | `(2250, -300)` | combined city center |
| `(60, 0, -70)` | `(2320, -240)` | public shaft head |
| `(-100, 0, -300)` | `(2550, -400)` | SubTropolis service-tunnel end |
| `(-40, 200, -360)` | `(2610, -340)` | contact and terrane plaque |
| `(0, 200, -420)` | `(2670, -300)` | Cheyenne outer portal |
| `(0, 325, -540)` | `(2790, -300)` | Cheyenne chamber center |
| `(0, 800, -500)` | `(2750, -300)` | summit |

Do not apply standalone child-plan coordinates directly. Cheyenne, SubTropolis, and Houston each have their own local origins; their geometry must first be normalized into Masterplan 04 local space and then passed through the transform above.

## Vanilla-height redesign

Masterplan 04 assumes `Y=-100…800` and a modded 1,024–2,048-block build height. The current server is stock Paper with the vanilla `Y=-64…319` envelope. A verbatim insertion is impossible.

The study uses a provisional street plane of world `Y=72` and a piecewise local-to-world mapping:

```text
for localY <= 0: worldY = 72 + 1.28 × localY
for localY >= 0: worldY = 72 + 0.29 × localY
```

This yields:

| Layer | Authored local Y | Provisional world Y |
|---|---:|---:|
| SubTropolis floor / design minimum | -100 | -56 |
| public-shaft mid-landing | -50 | 8 |
| Z02-U1 subway rail plane | site-specific | 48 |
| city street | 0 | 72 |
| granite-limestone contact | 200 | 130 |
| Cheyenne chamber | 250…400 | 145…188 |
| summit | 800 | 304 |

The lower limit leaves an eight-block buffer above `Y=-64`; the summit leaves 15 blocks below `Y=319`. The geological ages, material transition, plaque, and narrative sequence remain, but vertical distance is acknowledged as compressed.

The 60-block transformed rise from the SubTropolis service end to the Cheyenne portal can support a rail-valid surveyed route. The transformed funicular rise is about 174 blocks over only 80 blocks of direct plan distance, so it must use switchbacks with at least 174 blocks of horizontal run and additional braking/landing length. The old direct/vertical funicular definitions are rejected.

See [maps/vertical-zoning-section.svg](maps/vertical-zoning-section.svg).

## Zone plan

All bounds below are inclusive study envelopes, not cleared build limits.

| Zone | Proposed world envelope or anchor | Program |
|---|---|---|
| Z00 East reserve | `x=1500…3050`, `z=-1050…450` | survey and coordination envelope; 50-block mountain overrun buffer included |
| C1 East Corridor | `(430,~,80)` to `(1550,~,-300)`, 56-block reservation, 80-block land take | multimodal corridor outside the reserve: 4-lane divided highway, double-track railway, protected pedestrian route, utility reserve; two terminal roundabouts and one district interchange |
| Z01 Gateway / arrival | anchor `(1550,~, -300)` | west-facing 7×7 pavilion, visitor orientation, rail/road transfer |
| Z02 Gateway Approach | `x=1550…1950`, `z=-600…0` | landscaped arrival district, utilities, protected walking route, surface passenger rail with two future-use stops, and the concealed Z02-U1 expansion terminal |
| Z03 Grand Avenue | `(1750,~, -300)` to `(2180,~, -240)` | measured 8-block civic spine; final centerline follows surveyed terrain |
| Z04 Houston city | `x=2181…2319`, `z=-369…-231` | 138×138 downtown, towers, street grid, food courts, T-markers, and local skybridges |
| Z05 Houston tunnels | same plan envelope as Z04, approximately `Y=64…72` | pedestrian city-in-a-city network, floodgates, wayfinding |
| Z06 Public shaft | head `(2320,~, -240)` to lower lobby near world `Y=-56` | 7×7 lift/stair/service envelope with declared lower dogleg or aligned redesign |
| Z07 SubTropolis | `x=2350…2550`, `z=-400…-200`, `Y=-56…72` | 200×200 pillar chamber, tenant zones, public and controlled interfaces |
| Z08 Service/contact | `(2550,72,-400)` via `(2610,130,-340)` to `(2670,130,-300)` | 6×6 rail/service route, rock transition, terrane plaque, blast-door approach |
| Z09 Mountain | `x=2450…3050`, `z=-700…100`, `Y=72…304` | continuous no-ravine mountain, limestone base, granite upper mass |
| Z10 Cheyenne | chamber `x=2750…2830`, `z=-340…-260`, `Y=145…188` | J-curve experience, blast doors, 15 spring-mounted buildings, Battle Cab, chapel, reservoir, inn |
| Z11 Summit/return | summit `(2750,304,-300)` | summit platform, rock chart, switchback funicular, surface return road |

The mountain envelope projects over the underground zones on the map; this is intentional vertical overlap, not a scope collision.

## Z02 — Gateway Approach and the Empty Eight

Ravensreach remains the current world's canonical historic town and Old Town. The separate 33-schematic “old town” inherited from Masterplan 04 is removed from the Combined Complex program; no replica of Ravensreach is proposed here. Its schematic collection may become a separately approved Fleet Archive Park in the future, but it is not part of this masterplan.

Z02 instead becomes the transition between the current world and the Combined Complex. Its surface program is intentionally spacious: gateway forecourt, tree and rain-garden bands, protected pedestrian route, utility reserve, passenger rail, and parcels that can mature later without rebuilding the main connection. The zone keeps its existing `x=1550…1950`, `z=-600…0` envelope so Z03–Z11 do not move.

The layer-separated detail sheet is [maps/gateway-approach-and-terminal-plan.png](maps/gateway-approach-and-terminal-plan.png).

### Surface passenger rail

The passenger-rail study centerline runs east-west near `z=-250`, from the Gateway side of Z02 toward Houston. Its final Y, drainage, curve radii, powered-rail cadence, and exact city tie-in remain controlled by the Phase 0 terrain survey.

This is no longer the western end of the line. The East Corridor (C1d) carries the railway west from the Gateway all the way to MainStreet East, so GA-S1 and GA-S2 are intermediate stops on a through route rather than the first two stations of an isolated shuttle. The Gateway station GW-1 is the interchange between the two.

| ID | Study center | Initial role | Provision |
|---|---:|---|---|
| GA-S1 Gateway Gardens | `(1640,~, -250)` | first stop after the Gateway; landscape, event-lawn, and future parcel access | two 48-block side platforms, shelter, stairs/ramps, utility room, and extension-ready platform ends |
| GA-S2 Approach Commons | `(1920,~, -250)` | eastern Z02 stop before Grand Avenue/Houston | two 48-block side platforms, shelter, stairs/ramps, utility room, and a protected future entrance box |

Both are complete, safe request stops even if early ridership is low. They are not decorative platforms: each must have a stopping control, accessible surface route, lighting, signs, weather cover, and a guarded continuation path.

### Concealed subway branch

Between the two stops, `GA-J1` diverges north from the surface passenger line at approximately `(1780,~, -250)`. To ordinary riders it reads as a short maintenance siding disappearing behind a landscaped retaining wall. A subtle discovery marker reveals that the siding continues; the easter egg is the discovery, not an unsafe or unmarked emergency condition.

The provisional branch passes a portal near `(1780,~, -285)` and reaches the terminal throat near `(1780,48,-430)`. With the provisional surface rail at `Y≈72`, the alignment provides at least 145 horizontal blocks for a 24-block descent—an average grade no steeper than 1:6. The detailed rail compiler must replace this study line after terrain and headroom surveys.

### Z02-U1 Gateway Expansion Terminal

The official name is **Gateway Expansion Terminal**. Its in-world nickname, revealed only after entry, is **The Empty Eight**: a monumental, fully finished but initially quiet subway terminal built for a city larger than the one that exists.

| Element | Study definition |
|---|---|
| Shell | `x=1600…1940`, `z=-590…-430`, `Y=40…63`; the roof must retain at least eight surveyed solid-cover blocks below the final surface formation |
| Rail plane | eight north-south track centerlines at `Y≈48`; fan throat at `z=-430…-450` |
| Tracks | 8, extending through the platform hall and ending in protected future stubs at `z=-590` |
| Platforms | 8, each approximately 7×101 blocks over `z=-470…-570`; one assigned passenger platform per track |
| Future network | four paired line provisions: Tracks 1–2, 3–4, 5–6, and 7–8; every north stub ends at a separately owned, sealed interface wall |
| Mall/concourse | two oversized side gallerias, a perimeter mezzanine, four future ticket-hall boxes, 24 empty retail shells, public toilets, plant rooms, storage, and open atria overlooking the platforms |
| Life safety | two independent protected egress/accessible routes, smoke-separated stairs and lifts, ventilation shafts, emergency lighting, platform barriers, drainage sumps, and fire/service access |

The architecture is late-Soviet-inspired civic monumentality—stone, deep vaults, chandeliers, mosaics, long sightlines, and overbuilt public halls—without copying a specific real station. Empty storefronts are capped and signed as future space. Unused track stubs remain lit, barriered, inspectable, and physically sealed.

No Z02 tunnel connects to PassageWay, SubTropolis, Houston's pedestrian tunnels, or Cheyenne in this release. Those systems keep separate ownership and security boundaries. A future project may open one or more terminal stubs only through an exact interface contract, fresh source snapshot, guarded operation, rollback, and bidirectional route QA.

## How it connects to the current map

### C1 — the East Corridor

The primary connection is no longer a 267-block stub to the Data District's eastern bound. It is a **single multimodal corridor, 1,277 blocks long**, running from a terminal roundabout east of MainStreet America to the Gateway, carrying a controlled-access highway, a double-track passenger railway, a protected pedestrian route, and a utility reserve in **one reservation**.

The road and the rail are designed together, in one cross-section, on one alignment, under one survey. That is the point of the change: staging them separately forecloses the rail permanently.

The corridor deliberately **swings south of the Data District**. The district's southern boundary is `z=-172` (`Te Ia District Shared Grid`, `x=1000…1300`), with Worker Commons at `z=-189` and the disc golf course at `z=-201`. Running south of those and returning north-east to the Gateway keeps the corridor clear of every cataloged surface feature while giving the district a proper interchange instead of a road that dead-ends against it.

#### Alignment

Only orthogonal legs and exact 45-degree diagonals are used — the only geometry that reads as engineered on a 1-block grid.

| Point | Coordinate | Role | Curve radius |
|---|---|---|---:|
| W-TERM | `(430,~,80)` | west terminal roundabout center | — |
| PI-1 | `(905,~,80)` | northward deflection | 140 |
| PI-2 | `(1065,~,-80)` | southward deflection | 120 |
| PI-3 | `(1330,~,-80)` | northward deflection | 140 |
| E-TERM | `(1550,~,-300)` | Gateway terminal roundabout center | — |

| Leg | Path length | Function |
|---|---:|---|
| W-TERM → PI-1 | 475 | west tangent; carries the 250-block terminal speed transition |
| PI-1 → PI-2 | 226 | 45-degree descent past the C01 East stack |
| PI-2 → PI-3 | 265 | **district tangent** — carries the whole Data District interchange |
| PI-3 → E-TERM | 311 | 45-degree climb; 211 blocks of straight approach into the Gateway circle |

Three curve vertices against a budget of four. Each is chamfered with a spiral–arc–spiral staircase (`1:16 → 1:12 → 1:8 → 1:6 → 1:8 → 1:12 → 1:16`), never a raw 45-degree kink. Vertices deflecting north put the railway on the inside of the curve, so those use `R=140` to keep the rail radius at 120.

#### Cross-section — 56-block reservation

Offsets are from the highway median barrier centerline; north is `-Z`. The railway sits on the **north flank**, not in the median, so platforms face the pedestrian route and the district is reached at grade with no station structures.

| Element | Blocks | Offset |
|---|---:|---|
| North boundary — fence, hedge, ditch | 1 | `-36` |
| Protected pedestrian route | 3 | `-35 … -33` |
| Pedestrian/rail protective buffer | 2 | `-32 … -31` |
| **Rail reservation, fenced** | **13** | **`-30 … -18`** |
| — north cess / emergency walkway | 2 | `-30 … -29` |
| — Track 1 centerline (eastbound) | — | `-28` |
| — six-foot / mast line | 3 | `-27 … -25` |
| — Track 2 centerline (westbound) | — | `-24` |
| — south cess / emergency walkway | 2 | `-23 … -22` |
| — rail boundary fence + ditch | 4 | `-21 … -18` |
| Vehicle restraint system + verge | 3 | `-17 … -15` |
| Highway outside shoulder, north | 3 | `-14 … -12` |
| Lane W2 — westbound outer | 4 | `-11 … -8` |
| Lane W1 — westbound inner | 4 | `-7 … -4` |
| Inside shoulder, north | 2 | `-3 … -2` |
| **Median + barrier** | 3 | `-1 … +1` |
| Inside shoulder, south | 2 | `+2 … +3` |
| Lane E1 — eastbound inner | 4 | `+4 … +7` |
| Lane E2 — eastbound outer | 4 | `+8 … +11` |
| Highway outside shoulder, south | 3 | `+12 … +14` |
| Utility reserve | 3 | `+15 … +17` |
| Drainage ditch / south boundary | 2 | `+18 … +19` |

Reservation 56 blocks; slope and working easement a further 12 blocks each side; **total land take 80 blocks**. Both carriageways drain as a single southward crossfall — no crown — because the ditch is on the south side only. The rail formation drains north into its own cess drain.

The 3-block band at `-17 … -15` must contain a **vehicle restraint barrier, not a boundary fence**. At 56 blocks the formal clear zone is not met on either flank, and a highway running beside a railway inside a shared reservation requires positive protection against vehicle incursion.

#### Design speed

Declared on the plan as **mainline 85 km/h, connector roads 70 km/h**. This is not a compromise. In-world travel speeds are horse ~52 km/h and minecart ~29 km/h, which lands in the "urban ≤50 mph" tier of real practice, so that tier is built at true 1:1 rather than scaled down from a motorway standard. Only storage and queueing elements — deceleration lanes, auxiliary lanes, weaving lengths — take a 0.6 longitudinal factor. Gores, noses, taper ratios, and the cross-section take no factor at all.

Sight distance is replaced by render distance: no curve, crest, or structure may conceal the running surface within 128 blocks, and gore points must be visible from 160 blocks.

#### Verified clearance

Checked against all 1,215 catalog records; the machine-generated record is [corridor-clearance.json](corridor-clearance.json).

| Result | Value |
|---|---|
| Surface features intersecting the reservation | **none** |
| Nearest surface feature | `Te Ia District Shared Grid`, **50 blocks** |
| Nearest subsurface feature | C01 East L1–L3, **18 blocks** in plan, ~17 blocks below grade |
| Crossed subsurface feature | `C01 Owner Tunnel Detour`, `y=-45…-37`, ~110 blocks of cover |

Two constraints are load-bearing and must not be relaxed without re-running the check:

- **C01 East (`x=700…900`, `z=-140…-5`, `y=24…53`) is contested under ISSUE-002.** The corridor clears it by 18 blocks in plan and passes ~17 blocks above it. Highway embankment loading over a contested stack is not authorized by a non-overlap result; the west tangent's final grade needs an explicit structural review against whatever ISSUE-002 resolves to.
- **The `C01 Owner Tunnel Detour` is crossed, not avoided.** Cover is ample, but the corridor sits directly over owner infrastructure for a long run of the west tangent.

### C1a — Data District interchange

One interchange, not two. The district tangent is 265 blocks; the minimum gore-to-gore spacing for an off-off or on-on pair is 305 blocks, so two independent interchanges are not a compressed design but a geometric impossibility — the whole tangent is shorter than the single separation those pairs require. The only spacing the tangent can satisfy is off-on at 152 blocks, which is precisely the signature of one interchange's own ramp pair.

**Form: a two-quadrant partial cloverleaf with all four ramps in the southern quadrants, and the district spine road bridging north over the full 56-block corridor.**

This resolves a real clash. With right-hand traffic the westbound carriageway is the northern one, so its right-side ramps would naturally develop north — directly into the railway and the pedestrian route. Sending every ramp into the open southern quadrants keeps the north flank undisturbed, which is the entire reason the rail is on that flank.

| Element | Value |
|---|---|
| Crossroad bridge | `x≈1180`, clear-spanning the whole reservation |
| Ramp quadrants | all four, south of the mainline |
| Structures | **1** |
| Exit taper | 48 blocks at 1:12 |
| Painted nose → physical nose | 12 blocks |
| Nose length, 1:12 to a 3-block hatch | 40 blocks |
| Acceleration lane, built as a lane gain | 80 blocks |
| Accel : decel ratio | 2:1 — preserve it |
| Loop radius | 25–30 blocks |

**The ramp chainage does not quite fit the tangent.** A full sequence — advance gantry, taper, painted nose, physical nose, back of nose, then the off-on minimum of 152 blocks to the merge nose, then an 80-block acceleration lane — needs about 296 blocks. The district tangent is 265. The acceleration lane therefore runs onto the PI-3 curve rather than finishing on straight. That is acceptable for a lane gain but it is a real 31-block shortfall, not a rounding error, and detailed design must either accept the aux lane on the curve or lengthen the tangent at PI-2. The gore spacings themselves (305 off-off/on-on, 152 off-on, 488 service-to-service weave) must not be compressed to make it fit — those are 1:1 values and shortening them is what makes an interchange read as amateur from above.

Advance signing runs as a rhythm of gantries at **128, 88, and 48 blocks** before the painted nose, with the gore sign standing inside the hatched triangle. Spacing must be identical in both directions and at every interchange — uniformity is what makes the corridor read as one road. Exit number derives from the mainline X coordinate: `EXIT 11`.

Every taper is built as a repeating module of `(R−1)` straight blocks plus one diagonal, giving exactly one block of lateral shift per `R` blocks of run, with the risers distributed evenly. Bunching two diagonals and then running twenty-two straight is visible instantly from above.

North of the bridge, the district spine runs 56 blocks to the boundary at `z=-172` and splits to serve two separate entry points into the shared grid — delivering two district access points from a single mainline access.

**No left-hand exits anywhere on the corridor.**

### C1b — west terminus, MainStreet East

The freeway ends in a **single terminal roundabout, inscribed circle diameter 60 blocks, zero structures**, centered `(430,~,80)`. Four legs — the freeway plus three local roads — sit roughly 47 blocks apart around the ring, ample for entry flares and splitter islands. The 475-block west tangent carries the speed transition: median narrowing, shoulder reduction, and a lane drop, so the approach is visibly an arterial by the time it reaches the yield line. A freeway cannot yield-line into a circle.

**The road class must step down, not fall off a cliff.** A freeway discharging straight into local streets skips two levels of the functional hierarchy — expressway and collector — and that is the most visible hierarchy error there is from above. The ladder is built inside the footprint already available:

`freeway (475-block approach) → arterialized section (last 120 blocks) → roundabout → collector spine (100 blocks) → local streets`

- The last **120 blocks** of the approach drop to a 28–32 block arterial section: 2+2 lanes, 3-block median, 2-block verge, trees closing to 4 blocks from the pavement edge. Kerb begins 120 blocks out — walk it and you should step up. That kerb is the single strongest threshold cue on the corridor.
- **L2 becomes a campus spine collector**, 22 blocks wide, running at least 100 blocks before it splits down to local streets. L1 and L3 remain 16-block local streets.

Roundabout internals, at ICD 60: circulatory carriageway 10 blocks, truck apron 2, **central island 36 blocks, raised and mounded 3–5 blocks and planted so it fully blocks the sightline across the circle**. A flat island defeats the junction. Entry deflection must be at least 3 blocks of lateral shift over the last 20 — deflection, not approach length, is the active ingredient in speed reduction.

**Leg spacing needs a fix.** As drawn, L2 departs due west and L3 south-west, only about 40 degrees apart; roundabouts degrade below 60–70 degrees between legs. L3 must leave the ring on a due-south bearing and bend west only after it clears the junction. The three exits must not cluster on one side.

Two of the three local roads tie into **cataloged existing roads**; the third does not, and is not permitted to pretend otherwise.

| Road | From | To | Basis |
|---|---|---|---|
| L1 — Ravensreach link | ring north leg | `(470,~,-232)` | east end of the cataloged `Te Ia Ravensreach Dirt Road` (`x=130…470`, `z=-248…-217`), which continues west to `Service Cross` (`x=-84…220`, `z=-218`, `y=64`) |
| L2 — MainStreet East gate | ring west leg | `(305,~,80)` provisional | **no cataloged gate exists on the campus east face**; requires a new surveyed gate fronting the Earth-covered east operations complex (`x=100…300`, `z=70…235`) |
| L3 — Observatory link | ring south-west leg | `(362,~,165)` | cataloged `Observatory Owner East Ascent` (`road`, `x=348…377`, `z=150…180`, `y=-46…112`) |

L2 is the one to watch. The campus east flank has cataloged gates at `GATE-A01-EAST (135,64,172)`, `GATE-L01-EAST (220,64,-250)`, and the C01 East Edge Road boundary gate near `(120…125,~,231)` — none of them on the face this road would meet. Do not treat the white picket campus fence line at `x=305` as an interface until a gate is surveyed and approved.

### C1c — Gateway terminus

The freeway dies into a second **terminal roundabout, ICD 60, centered on the Gateway anchor `(1550,~,-300)`, with the Gateway Pavilion standing in the central island**. Zero structures. Legs: the freeway from the south-west, the Z02 spine east toward Grand Avenue, a north landscape road, and a south leg to the rail station forecourt.

The 311-block diagonal from PI-3 is the speed-transition section, giving 211 blocks of straight approach into the circle. That is 39 blocks short of the 250-block preference; the `R=140` chamfer at PI-3 absorbs part of the transition, but the shortfall is real and should be closed at detailed design, either by lengthening the diagonal or by starting the downgrade before the vertex.

### C1d — the passenger railway

The current world contains **no rail at all**. The catalog holds 1,215 features and not one of them is track. The west end is therefore a true terminus, not a tie-in, and this corridor is the world's first railway.

The line runs the full corridor on the north flank and continues east into Z02, joining the surface passenger alignment already defined there:

| Station | Coordinate | Platforms | Role |
|---|---|---|---|
| **MS-1 MainStreet East** | `(430,~,80)` | 2 side, 32 blocks | terminus; interchange with the terminal roundabout and all three local roads |
| **DD-1 Data District** | `(1240,~,-80)` | 2 side, 32 blocks | platform sits ~56 blocks of level, at-grade walk from the district frontage, with no highway crossing |
| **GW-1 Gateway** | `(1550,~,-300)` | 2 side, 32 blocks | Z01 road/rail transfer on the roundabout's south leg |
| GA-S1 Gateway Gardens | `(1640,~,-250)` | 2 side, 48 blocks | existing Z02 stop |
| GA-S2 Approach Commons | `(1920,~,-250)` | 2 side, 48 blocks | existing Z02 stop |
| Houston terminus | `(2180,~,-250)` | — | Z04 arrival |

DD-1 is the whole argument for flank running. A median alignment would put the only station with a real catchment on the far side of two carriageways, forcing every district passenger to cross the highway, and would need a vertical circulation core at all three stations — six structures built purely to undo a decision that did not have to be made.

Every station holds a dead-straight orthogonal tangent of at least 62 blocks. Rail diagonals are built as a **coarse staircase**, never a fine sawtooth: powered rails cannot be curved, so a block-by-block zigzag cannot be powered at all. Straight segments of 4+ blocks between jogs both take powered rails and read as a broad-radius curve rather than a stair.

Line standard is **1:8 maximum gradient**; 1:12 where length allows. Powered rails run 1 per 38 blocks on the flat, 3 consecutive on departure from each station, and 1 per 4 on any sustained climb.

#### Staged delivery — the rail is foreclosed by default

If the highway is built first and these are not right on day one, the railway becomes unbuildable at that point permanently:

1. **Reserve the 13-block rail strip at the north edge and leave it void** for the whole 1,277 blocks — no fill, no landscape, no encroachment.
2. **Every structure crossing the corridor must clear-span the full rail reservation.** No piers inside the envelope, ever.
3. **Build those crossings to rail vertical clearance, not road clearance** — 7 blocks above the future rail plane to running surface. A structure built to road clearance has to be demolished.
4. Fix the highway barrier line at its ultimate offset now; do not let interim shoulder widening creep north.
5. Grade the strip to final formation level and hold the rail vertical alignment across the whole corridor.
6. Lay the utility reserve and empty ductbank now.
7. Mark the reservation with a visible fence line during the interim so nobody builds into it.

Items 2 and 3 are the highest-consequence entries in this masterplan. They are cheap now and unrecoverable later.

### C1e — Grand Avenue crosses the railway at a skew

Planning the two modes together surfaced a defect in the existing Z03 alignment that neither the road plan nor the rail plan had caught on its own.

Grand Avenue runs `(1750,~,-300)` to `(2180,~,-240)`; the Z02 surface rail runs flat at `z=-250`. **They cross at approximately `(2108,~,-250)` at a 7.9-degree skew** — very nearly parallel. A bridge deck spanning the 13-block rail reservation at that angle would need to be about **95 blocks long**. That is not a crossing, it is a viaduct running alongside the railway.

The fix is to **insert an orthogonal crossing node**: bring the avenue onto a north-south run for roughly 30 blocks centered on `x=2108`, cross the rail at 90 degrees, and resume the shallow diagonal either side. The kink is invisible on the ground and reads as a deliberate civic gesture — a square where the avenue meets the railway.

| Crossing angle | Clear span over the 13-block reservation | Verdict |
|---|---:|---|
| 90 degrees | 17 blocks | **adopt** |
| 45 degrees | ~23 blocks | acceptable |
| 7.9 degrees as currently drawn | ~95 blocks | do not build |

**Road over rail.** The railway is the through, gradient-constrained mode on a fixed plane; the avenue is the crossing, gradient-tolerant mode. Breaking the rail plane would cost 112+ blocks of rail ramp, put the railway in a 7-block sump with the attendant water problem, and destroy the flat rail plane that makes the eastern run legible.

| Level | Y |
|---|---|
| Top of rail, held flat and unbroken | 72 |
| Clear air above rail | 73–77 |
| Bridge soffit | 78 |
| Avenue running surface | 79 |

Approach embankments at 1:8 run 56 blocks each side, so the works occupy roughly `x=2044…2172` along the avenue. The rail staircase must finish by `x≈2060` so the structure sits on dead-straight tangent. **Clear-span the whole reservation — no piers inside the rail envelope.**

### C2 — optional visitor portal

The current owner portal gallery around `(240,~,155)` can provide an optional fast visitor transfer to Z01. The gallery is accepted architecture, but its rooms are not evidence of active portals. Portal activation requires a selected mechanism, symmetric landing safety, permission review, and a tested return path.

The map shows this as a purple logical link, not physical distance.

### C3 — future PassageWay interchange

Reserve, but do not build, an underground interchange between the existing eastern network and the SubTropolis public lobby. The exact current endpoint is intentionally unset. C01 east is contested under ISSUE-002, the Iowa annex coordinate is a centroid rather than a door, and no current feature should be treated as a tunnel interface without an exact survey.

The future interface must be separately isolated from secure Cheyenne circulation. Public arrival goes to SubTropolis and Houston; Cheyenne remains behind its service checkpoint and blast-door sequence.

### C4 — Gateway Approach subway provision

C4 is the internal connection from the Z02 surface passenger railway through `GA-J1` to Z02-U1. It is an expansion seed, not a current regional subway. The branch, descent, terminal throat, eight track bays, and sealed north stubs share one zone owner but remain separate release subscopes so an underground failure cannot force rollback of the operating surface railway.

## Visitor sequence

The intended journey is continuous and understandable:

1. Join the East Corridor at the MainStreet East roundabout, by road from Ravensreach, the campus east gate, or the Observatory link — or board the train at MS-1.
2. Run east past the Data District interchange, then north-east on the climb, and arrive at the Gateway Pavilion standing in its terminal circle.
3. Walk or ride through the landscaped Gateway Approach, using Gateway Gardens and Approach Commons as the first two passenger stops.
4. Optionally discover the unadvertised siding and descend into the Empty Eight expansion terminal.
5. Follow Grand Avenue into the Houston-inspired city.
6. Descend through the public shaft and observation landing.
7. Enter SubTropolis and its tenant avenues.
8. Transfer to the controlled service rail.
9. Cross the limestone/granite contact at the terrane plaque.
10. Pass the 25-ton blast-door threshold into Cheyenne.
11. Ride the switchback funicular to the summit.
12. Return by the mountain road to the city and gateway.

The material progression is Ravensreach/current-world history → landscaped arrival → monumental expansion terminal or Houston modern → limestone industrial → granite military → open summit.

## Delivery sequence

### Phase 0 — prove the site

- Take a fresh immutable saved-world snapshot.
- Render a new top-down terrain atlas covering at least `x=1200…3200`, `z=-1200…600`.
- Perform block, height, biome, water, tree, structure, entity, protected-feature, ownership, and chunk-generation censuses.
- Confirm that the proposed reservation is actually in the same dimension and world border.
- Freeze a single coordinate registry and local-to-world transform.
- Decide whether the vertical compression is acceptable. If not, switch to the separate-world native-height fallback.

Exit gate: selected survey report, zero undisclosed current-feature intersections, surveyed surface plane, and owner approval of the same-world vertical adaptation.

### Phase 1 — interfaces and enabling works

- Design the exact C1 centerlines, the three curve chamfers, and both terminal roundabouts.
- **Freeze the 56-block corridor cross-section, including the 13-block rail reservation, before any earthwork.** Every crossing structure must be sized to clear-span it at rail vertical clearance from the first build.
- Fix the Data District interchange crossroad bridge position and all four southern ramp quadrants.
- Resolve the L2 MainStreet east campus gate — survey and approve a real gate, or delete the road.
- Insert the orthogonal crossing node where Grand Avenue meets the railway near `(2108,~,-250)`.
- Freeze the Z02 surface passenger alignment, both stop footprints, `GA-J1`, independent subway release boundary, and emergency-access reservations.
- Establish protected staging areas and material logistics outside future public zones.
- Compile the zone ownership/interface contract before any block operation.
- Build only a bounded visual pilot of the connector and gateway using fresh exact-state guards.

Exit gate: bidirectional normal-walk pilot, drainage and grade review, no protected conflicts, exact rollback, and matched before/after evidence.

### Phase 2 — deep shells first

- Excavate and line the Z02-U1 terminal, branch, egress, ventilation, and eight sealed future-line interfaces before placing the surface landscape above them.
- Excavate and line the public shaft lower works and SubTropolis chamber.
- Construct the service/contact route with rail-valid grades.
- Build the Cheyenne chamber shell and its independent construction access.
- Preserve solid buffers between public, tenant, utility, and secure zones.

Exit gate: structural envelopes, headroom, fluids, lighting, egress, and route graphs pass offline and live review before surface loads are added.

### Phase 3 — surface framework

- Form the continuous mountain and its drainage without a ravine.
- Build the Gateway Approach landscape, GA-S1 and GA-S2 surface stops, Grand Avenue, Houston street grid, and gateway public realm.
- Build the summit return geometry as switchbacks, not the obsolete vertical line.

Exit gate: terrain tie-ins, no unintended water diversion, surface route continuity, and verified non-intersection with all deep shells.

### Phase 4 — fit-out and identity

- Fit out the Empty Eight's eight platforms, monumental concourse, mall shells, discovery sequence, life-safety systems, and capped future spaces.
- Fit out SubTropolis tenant zones and Houston food courts.
- Install Cheyenne's 15 spring-mounted buildings, Battle Cab, chapel, reservoir, inn, blast doors, and signs.
- Install the terrane plaque only after its final geological wording is reviewed.

Exit gate: every occupied floor has safe circulation, every access class is enforced, protected block entities are migrated transactionally, and all exact objects have evidence cameras.

### Phase 5 — transport and commissioning

- Commission the East Corridor as one system: highway, both terminal roundabouts, the Data District interchange, the pedestrian route, and the railway with MS-1, DD-1, and GW-1.
- Verify no structure anywhere on the corridor has a pier inside the rail envelope or a soffit below rail vertical clearance.
- Commission both Z02 surface stops, then commission the concealed branch and terminal as a separate operational and rollback scope.
- Commission the public shaft, internal passenger rail, service rail, switchback funicular, and return road.
- Optionally activate C2 only after portal safety and permissions pass.
- Keep C3 reserved until an exact existing PassageWay endpoint is accepted.

Exit gate: complete bidirectional no-dig/no-tower walks, powered-door tests, minecart/funicular tests, entity clearance, final immutable snapshot, exact rollback preflight, database import, maps, and matched media.

## Packaging and release rules

- One canonical compiler must own all transformed coordinates.
- Every physical cell has one canonical zone owner; shared seams require exact interface contracts.
- Generate exact one-cell guarded forward and rollback operations from a fresh immutable source snapshot.
- Use `scripts/rcon_runner.py --strict-noop --report <json>` for any separately authorized release.
- Do not replay accepted Town Expansion or redevelopment operation files.
- Release deep works, surface works, fit-out, and transport as separately reviewable packages with an explicit ordered transaction ledger.
- A planned feature remains planned until immutable post-state verification, route QA, media QA, and database import all pass.
- Never infer buildable land from absent database records, black map pixels, or unloaded chunks.

## Decisions still required

1. Accept the same-world vertical compression, or preserve Masterplan 04's native height in a separate world/dimension.
2. Approve or move the east reserve after the fresh terrain survey.
3. Accept or amend the 56-block East Corridor reservation and its 80-block total land take, and confirm the corridor may pass over the contested C01 East stack and the C01 Owner Tunnel Detour.
3a. Approve or replace the provisional L2 MainStreet east campus gate at `(305,~,80)`, which has no cataloged counterpart.
3b. Decide whether the railway is built with the highway or merely reserved — and if reserved, commit to the clear-span and vertical-clearance rules that keep it buildable.
4. Select the active portal mechanism, if any.
5. Resolve the public shaft dogleg and freeze the detailed surface-rail, subway descent, throat, and eight-platform cross-sections.
6. Approve final geological wording for the contact plaque.
7. Approve the Empty Eight's final architectural palette, discovery cue, capped retail-shell schedule, egress design, and sealed future-line interface contracts.

Until those decisions and Phase 0 gates pass, the coordinates in this package are a coherent planning transform, not build coordinates.
