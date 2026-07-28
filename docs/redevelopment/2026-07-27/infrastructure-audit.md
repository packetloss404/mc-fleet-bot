# Tunnel, Bunker, Stadium, and Wayfinding Audit

Date: 2026-07-27  
Status: design audit and implementation brief; no live-world construction authority  
Baseline: saved-world snapshot SHA-256
`c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`

## 1. Executive decision

The complaints are substantiated. The major routes are connected, but
connectivity has been mistaken for design quality:

- Raven Rock's four available approaches can reach Cavern A in the saved-world
  baseline, yet S1 has an irregular clear section and T2b reads as an accidental
  natural cave. The database does not contain the tunnel legs, decision nodes,
  portals, or signs needed to expose those failures.
- The RR-Z5 ladder replacement provides a working stair, but the two-block-wide
  switchback is not yet a comfortable, fully documented public vertical route.
- Westlight's bowl is a large enclosed venue with a field and seating, but it
  has no first-class screen or scoreboard and no recorded seat-to-target
  sightline system. From axial seating, an opening/aisle becomes the apparent
  focal point. The user's “seating faces the doorway” report therefore maps to
  `WL-BOWL`, not the C01 training arena.
- P01 is not an unfinished parking inventory. It has 236 verified spaces. Its
  east edge is visually and spatially unresolved because the C01 public portal
  and exposed surface structures interrupt the arrival composition.
- A literal translation of all of C01 is infeasible and unnecessary. The
  preferred scheme retains the deep complex, shelter, vaults, and protected
  inventories; relocates or recesses only the public portal; builds a
  terrain-following south-flank access road and connector; then earth-closes
  the old façade after the new route passes.
- “Entire complex underground” cannot be truthfully accepted while `HGR-S01`
  and `OBS-S01` remain prominent surface masses. The owner must either accept
  the observatory as the one deliberate surface landmark while the hangar is
  recessed/bermed, or authorize rebuilding/relocating both.

The implementation priority is:

1. register the missing route, node, screen, sightline, and media objects;
2. capture immutable before evidence;
3. pilot one Raven Rock tunnel section and RR-Z5 stair improvements;
4. correct Westlight entry hierarchy and add a tested display;
5. pilot the C01 portal/road/earth-cover concept without removing the old
   route;
6. expand only after bidirectional movement, sightline, water, protected-item,
   and same-camera visual QA pass.

These decisions implement the shared
[`infrastructure-standards.md`](./infrastructure-standards.md). Candidate
coordinates in this report are design-study coordinates, not executable
operations.

## 2. Scope, method, and limits

### 2.1 Evidence examined

The audit used:

- the authoritative local Anvil snapshot at `data/worldsnap/region`;
- `data/world-map.db`, queried read-only;
- Raven Rock planning documents and the tunnel-generation/repair scripts;
- existing MainStreet, Raven Rock, and Westlight build operations;
- current map books, orthographic maps, cutaways, and QA screenshots;
- offline reachability checks and cross-section sampling;
- authoritative real-world guidance from the U.S. Access Board, FHWA, USACE,
  FEMA, NPS, FIFA, SGSA, and Caltrans.

The saved-world hash was fixed before analysis. All findings are tied to that
baseline. A later world snapshot invalidates collision, cross-section, and
same-camera comparisons until regenerated.

Key existing visual artifacts used for orientation were:

- `data/exports/box/atlas-2026-07-26/team-c/07-raven-rock-active-complex.png`;
- `data/exports/box/atlas-2026-07-26/team-c/08-raven-rock-vertical-cutaway.png`;
- `mainstreet-america/qa/msa-mountain-landscape-final-v2.png`;
- `mainstreet-america/qa/msa-surface-complex-exterior-final-v2.png`;
- `mainstreet-america/qa/msa-secure-wave5-c01-arena.png`.

The Raven Rock atlas demonstrates why an active-route overlay is needed:
natural-cave noise visually dominates the buried path. The MainStreet views
show both the parking-edge retaining/portal wall and the high surface profile
of the hangar/observatory. The C01 arena view separates that correctly oriented
training seating from the unresolved Westlight bowl.

### 2.2 What the tests prove

The reachability tests prove that a contiguous standable route exists inside a
specified search pad. They do **not** prove:

- comfortable walking;
- consistent width, headroom, or grade;
- adequate lighting;
- intelligible wayfinding;
- accessibility;
- acceptable turns or travel time;
- safe separation from fluids and natural caves;
- visual quality.

The tunnel cross-section audit measures contiguous standable cells near each
planned floor station. Natural caves and route junctions can inflate the
reported width. It is a diagnostic comparison, not a millimetric architectural
survey.

The real-world citations establish principles and QA concerns. The Minecraft
dimensions in this report are project adaptations; they are not claims of ADA,
FHWA, FIFA, or building-code compliance.

### 2.3 Excluded sources

Restricted or distribution-limited engineering material was not used as a
source of truth. In particular, the restricted UFC blast-design document found
during research was excluded. This plan addresses circulation, legibility,
water control, concealment, and player experience; it does not certify
real-world protective construction.

## 3. Database truth and blind spots

The catalog has only three tables:

| Table | Role |
|---|---|
| `world_features` | Durable feature geometry and hierarchy |
| `world_scans` | Survey/import provenance |
| `feature_observations` | Per-scan evidence |

There is no first-class media table or durable object-to-image relation. The
current catalog can say that a large envelope exists while remaining silent
about the player's experience inside it.

### 3.1 Infrastructure-specific gaps

| Area | Current record | Missing evidence |
|---|---|---|
| Raven Rock | 39 records: district, five buildings, five broad circulation objects, rooms | T1–T4, C1/C2, S1, portals, vestibules, rotunda, reservoir, bulkhead, decision nodes, signs, section samples, walking tests |
| RR-Z5 | One whole shaft envelope and a broad stairs-only circulation record | Individual flights, landings, served levels, rest nodes, headroom, two-way travel time, guard continuity |
| Westlight | Bowl envelope and broad functional floor halves | Display/screen, event mode, seating sector, row, aisle, vomitory, accessible position, focal target, sightline ray, exit/entry sequence |
| C01 | Deep complex and major surface/support objects | Portal alternatives, public/restricted route relations, concealment surfaces, camera visibility tests, road grade stations, wayfinding nodes |
| Media | File inventory outside the core schema | Exact feature relation, camera pose, look-at, FOV, snapshot hash, before/after pair, QA outcome |

Condition score 100 therefore means the recorded envelope or authored object
was observed as expected. It does not mean the tunnel is uniform, the stair is
easy, the stadium has a focal display, or the bunker is concealed. New quality
dimensions must not default to 100.

## 4. Raven Rock current-state audit

### 4.1 Recorded complex

| ID | Function | Bounds / floors |
|---|---|---|
| `RR-B1` | Command & Operations | x `-50..-10`, z `-32..2`; y `-8,-3,2` |
| `RR-B2` | Signal & Communications | x `22..54`, z `-30..0`; y `-8,-3,2` |
| `RR-B3` | Quarters, Dining & Medical | x `-18..18`, z `85..115`; y `-6,-1,4` |
| `RR-B4` | Power & Ventilation | x `-170..-130`, z `-24..4`; y `-14,-9` |
| `RR-Z5` | Surface access shaft | x `193..207`, y `-12..67`, z `-22..-8` |

`RR-Z5` lists floors at y `-12,-11,-6,-1,4,9,14,19,24,29,34,39,44,49,54,59,64`.
The broad building circulation objects say “stairs-only,” “bidirectional QA,”
and zero ladders, but do not describe the actual flights or player effort. The
room records are mostly large functional divisions of measured floors, not
proof of wall-bounded rooms.

Raven Rock is an invented Minecraft reconstruction. The planning documents
correctly label its geometry as a creative liberty; the interior of the real
Raven Rock facility is not a public architectural reference.

### 4.2 Planned route geometry

| Route | Planned alignment | Intended role |
|---|---|---|
| T1 | N4 `(0,18,-285)` → N1 `(0,-6,-120)` → Cavern A `(0,-12,-45)` | North approach / primary spine |
| T2 | N3 `(-150,18,285)` → dogleg `(-150,2,190)` → Cavern B `(-45,-10,130)` | Southwest approach / primary spine |
| T3 | N5 `(285,18,-30)` → N2 `(180,0,-30)` → Cavern A `(75,-12,-15)` | East approach / primary spine |
| T4 | N6 `(-290,10,5)` → Cavern C `(-185,-18,-10)` | West utility/emergency leg |
| C1 | `(0,-12,15)` → `(0,-10,70)` | Cavern A–B connector |
| C2 | `(-75,-12,-15)` → `(-115,-18,-10)` | Cavern A–C connector |
| S1 | `(75,-12,-15)` → shaft base `(200,-12,-15)` | Cavern A–RR-Z5 connector |

The planned primary tunnels were approximately six blocks wide by seven
blocks tall. Subsequent repair scripts aimed to normalize S1 to seven wide by
eight tall, but the present snapshot does not meet that target consistently.

### 4.3 Connectivity results

Read-only route searches against the baseline returned:

| Search | Result | Standable cells | Chunks | Absent chunks |
|---|---:|---:|---:|---:|
| T1 `(0,19,-285)` → `(0,-11,0)` | Reachable | 7,110 | 58 | 0 |
| T2 `(-150,19,285)` → `(0,-11,0)` | Reachable | 93,195 | 190 | 0 |
| T3 `(285,19,-30)` → `(0,-11,0)` | Reachable | 21,100 | 109 | 0 |
| RR-Z5/S1 `(194,65,-15)` → `(0,-11,0)` | Reachable | 10,916 | 71 | 0 |

T4 is not represented as an exterior through route because the western mouth
was intentionally bulkheaded around x `-278/-277`. The mouth opened into a
7,165-plus-block aquifer. The bulkhead must remain. T4 should be classified
service/emergency dead-end until a different dry portal is designed and tested.

### 4.4 Measured S1 defect

The S1 diagnostic sampled 93 x stations from x `100..192`:

| Metric | Result |
|---|---:|
| Missing standable stations | 0 |
| Minimum contiguous standable width | 5 |
| Median width | 7 |
| Maximum width | 17 |
| Width exactly 7 | 37 / 93 |
| Width below the seven-block repair target | 32 / 93 |
| Centerline deviation | 0 |

Width distribution:

| Width | Stations |
|---:|---:|
| 5 | 26 |
| 6 | 6 |
| 7 | 37 |
| 8 | 3 |
| 11 | 1 |
| 12 | 14 |
| 14 | 5 |
| 17 | 1 |

Representative defect stations:

- x `100..102`: width 5, z `-17..-13`;
- x `103`: width 6;
- x `130`: width 5;
- x `140..146`: width 5;
- x `170`: width 5;
- x `180`: width 12;
- x `190`: width 14 at a merge/adjacent void.

S1 is aligned, but it alternates between a compressed corridor and
unarticulated open void. The fix is a controlled liner and section family,
not indiscriminate excavation.

### 4.5 Measured T2b defect

The T2b diagnostic sampled 103 x stations from x `-150..-48`:

| Metric | Result |
|---|---:|
| Missing standable stations | 0 |
| Minimum width | 7 |
| Median width | 14 |
| Maximum width | 24 |
| Stations at width 14 | 75 / 103 |
| Maximum centerline deviation | 2 |

Examples include:

- x `-150`: z `183..205`, width 23;
- x `-140`: z `176..189`, width 14;
- x `-130`: width 9;
- x `-110`: width 17;
- much of x `-100..-50`: width 14.

T2b is not primarily too narrow. Its route identity dissolves into oversized,
irregular, cave-adjacent space. It needs an authored liner, edge, ceiling/light
rhythm, and deliberate cave threshold. Filling the full natural void would be
destructive and visually sterile; the route should instead become a consistent
“tunnel within cavern” with protected overlooks only where intended.

### 4.6 Repair-script evidence

The local scripts record the failure history that the database omits:

- a headroom-clearing pass deleted neighboring stair treads twice;
- an early S1 trace drifted from z `-15` to z `-37`, started following T3, and
  cut unintended rock before an axis clamp was added;
- T2b bowed more than six blocks off the straight design line;
- an initial box-bounded BFS escaped into a natural cave because the local
  corridor volume was roughly 34 percent air;
- S1 was documented as varying from five to thirteen blocks where seven was
  intended;
- enlargement exposed gravity-affected gravel, including a blockage near
  x `120`.

These histories justify exact-material guards, tube-bounded route models,
gravity-block audits, and after-build fluid/dry-volume checks.

### 4.7 RR-Z5 stair assessment

The wave-one shaft repair replaced the former ladder route with two-wide
switchback flights inside an approximately 9×9 bore. It added landings at
roughly five-block vertical intervals and one top sign near `(201,65,-12)`:

> RAVEN ROCK / STAIRS / CAVERNS / DOWN

That was a meaningful functional improvement, but it does not yet satisfy a
comfortable public-route brief:

- two blocks is the lower bound, not a generous clear route;
- landings are frequent but are not registered as nodes or level interfaces;
- the current sign inventory does not identify intermediate levels,
  destinations, or return direction;
- there is no recorded handrail/edge-guard continuity test;
- there is no measured normal-speed two-way travel time;
- there is no alternate lift/ramp logic for a 79-block vertical stack;
- the broad shaft condition score cannot detect a single tread or headroom
  conflict.

The [U.S. Access Board stair guide](https://www.access-board.gov/ada/guides/chapter-5-stairways/)
supports uniform tread/riser rhythm and continuous handrails. Its real-world
dimensions are not mapped directly to blocks. The project target is a
two-block minimum, three-block headroom, landings at every reversal and about
every six to eight vertical blocks, and a one-vertical-to-two-horizontal
primary-route rhythm where the shaft geometry permits. The
[accessible-route guide](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/)
supports keeping the no-jump alternative within the general circulation
system rather than hiding it in a service area.

## 5. Raven Rock design standard and route prescription

### 5.1 Route family

Use the route types in `infrastructure-standards.md`:

| Class | Project clear minimum | Application here |
|---|---:|---|
| Public primary spine | 5 wide × 4 high | T1, T2, T3, C1, public S1 |
| Operational secondary | 3 wide × 3 high | C2 and named department branches |
| Service only | 2 wide × 3 high | T4 west of the safe interior node |
| Major decision node | approximately 7 × 7 | N1, N2, T2 dogleg, rotunda, cavern thresholds, RR-Z5 base/top |

For S1, preserve the previously approved seven-wide-by-eight-high authored
target rather than reducing it to the minimum. For T2b, create a five-wide
legible path inside the larger cavern without filling all natural void.

Every section defines floor, base, wall field, ceiling, lighting strip, route
band, sign zone, service zone, and water/cave boundary. Random material changes
are defects unless they mark an authored threshold.

The [FHWA Road Tunnel Manual](https://www.fhwa.dot.gov/bridge/tunnel/pubs/nhi09010/tunnel_manual.pdf)
treats egress, lighting, drainage, communications, and operations as one
system. The [USACE rock-tunnel manual](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-2901.pdf)
supports designing for variable rock and groundwater conditions with adaptable
and redundant systems.

### 5.2 Wayfinding family

Use names, letters, colors, and material textures together; never depend on
color alone:

| Code | Color/material cue | Destination family |
|---|---|---|
| O | Blue plus smooth-stone band | Operations / Cavern A |
| H | Amber plus brick band | Habitation / Cavern B |
| U | Cyan plus deepslate band | Utilities / Cavern C |
| P | White plus quartz band | Portals / surface approaches |
| S | Green plus copper band | Surface shaft / RR-Z5 |

At every decision:

1. place an advance sign before the choice;
2. place an arrow/destination sign at the choice;
3. place a confirmation marker five to ten blocks after the choice.

Use reassurance/emergency signs every 50–75 blocks on long tunnel legs and a
shorter interval where curves or cave openings interrupt visibility. This is a
project adaptation of the FHWA manual's 100–150-foot directional-distance sign
guidance. Every sign includes destination, arrow, route/level code, and distance
to the next node or exit.

The [MUTCD guide-sign chapter](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/Chapter2d.pdf)
supports a consistent hierarchy and message continuity. Wayfinding must remain
distinct from decorative or commercial signs.

### 5.3 Segment-specific work

| Segment | Proposed treatment | Do not do |
|---|---|---|
| T1 | Preserve alignment; establish uniform primary-spine section; identify N4/N1 and Cavern A threshold; add repeated north/south confirmation | Do not enlarge blindly into adjacent voids |
| T2a | Preserve portal-to-dogleg route; make the dogleg a named, illuminated node with advance signs | Do not hide the direction change |
| T2b | Build a five-wide “tunnel within cavern” liner/edge; intentionally reveal selected cave windows; close accidental openings; standardize light rhythm | Do not fill the whole natural cavern |
| T3 | Preserve east route; formalize N5/N2; survey any section change before lining | Do not use one global fill volume |
| T4 | Keep aquifer bulkhead; classify west end service/emergency; sign “NO SURFACE EXIT”; survey a new dry portal only as a later package | Do not remove the x `-278/-277` bulkhead or drain the aquifer |
| C1 | Treat as primary connector; establish Cavern A/B destination continuity | Do not leave cavern merges unsigned |
| C2 | Treat as secondary connector; distinguish utility direction from public route | Do not make its visual language identical to C1 |
| S1 | Normalize the route liner to seven wide by eight high where shell permits; screen/guard oversized voids; audit gravel and fluids | Do not widen with an unconstrained BFS |
| RR-Z5 | Pilot one flight and landing; fix headroom/guard/sign issues; then repeat; add level maps and a no-jump alternative study | Do not replace the entire shaft in one irreversible volume |

### 5.4 Pilot sequence

1. Freeze the source snapshot and export all affected feature, block, entity,
   tile-entity, fluid, gravity-block, and route observations.
2. Register T1–T4, C1/C2, S1, N1–N6, N9, N10, the T4 bulkhead, the RR-Z5
   flights/landings, and affected natural-cave thresholds.
3. Capture before evidence from both route directions and the defect stations
   in Section 11.
4. Pilot S1 at x `138..148`, a known five-wide compression, using
   exact-material replace guards.
5. Pilot a T2b liner at x `-145..-135`; do not alter the entire natural cave.
6. Pilot one RR-Z5 switchback flight plus the landings above and below it.
7. Run dry-volume, gravity-block, fluid-neighbor, headroom, lighting, and
   bidirectional normal-walk tests.
8. Capture identical after views and one independent player wayfinding test.
9. Accept the section family or roll the pilot back before extending it.

## 6. Westlight stadium audit

### 6.1 Current recorded program

| ID | Bounds / entrance |
|---|---|
| `WL-BOWL` | x `-429..-291`, y `55..91`, z `-629..-491`; public entrance `(-359,68,-498)` |
| `WL-THEATRE` | x `-421..-299`, y `18..50`, z `-613..-498`; entrance `(-354,68,-498)` |
| `WL-CLUB` | x `-417..-400`, z `-566..-550`; floors y `35,40` |

The bowl has floors at y `58,67,75,82`, but its room records are broad halves:
Field Level/Service Ring, Main Concourse/South Vomitory, Upper
Concourse/Members Terrace, and Crown Walk/Press Gallery. They do not encode
actual seat rows, sections, aisles, vomitories, or focal targets.

The local bowl build is a 1,540-line set of large filled oval rings. The canopy
package has 13 chains. The separate below-grade theatre includes a screen/stage
composition; the stadium bowl does not.

Offline saved-world perspectives from the north, south, east, west, and
interior show a green central field and concentric gray seating inside a closed
oval. On the long/short axial views, the doorway/aisle becomes the only strong
focal object because there is no interior display.

### 6.2 Design alternatives

| Alternative | Benefit | Failure / decision |
|---|---|---|
| Rotate the whole seating bowl toward one wall | Makes one end read like a theatre | Reject for sports/multi-use mode; destroys field bowl logic and creates poor sectors |
| Twin end-wall screens | Familiar and simple | Reject as the only display; spectators beneath/behind each screen lose visibility and the entrance can still compete |
| North-end stage and screen | Strong concert/presentation focus | Retain only as a separately declared concert mode; requires retractable/converted seating study |
| Four-faced center-hung scoreboard/display | Visible across multiple sectors; reinforces field as primary sports focus | Preferred subject to canopy, high-ball, support, and all-sector sightline testing |

The preferred concept is a four-faced center-hung display near bowl center,
approximately x `-360`, z `-560`. No final y, footprint, or support geometry is
approved until canopy/high-ball and representative-seat ray checks pass. A
continuous oval/ring display is a later visual alternative if the four-faced
object feels too bulky.

FIFA's
[stadium bowl guidance](https://publications.fifa.com/de/football-stadiums-guidelines/general-process-guidelines/design/stadium-bowl/)
puts unobstructed field sightlines at the center of bowl design. Its C-value
benchmarks are useful human-world analogues, not directly scalable block
dimensions. FIFA's
[information-technology guidance](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/information-technology/)
expects larger venues to provide score/time and safety information on displays
visible to spectators and players.

### 6.3 Entry correction

The south entrance at `(-359,68,-498)` should enter a concourse, split left and
right, then deliver spectators through behind-seating vomitories. It should not
terminate on or visually align with a blank “front” surface.

Required entry hierarchy:

1. venue identity outside;
2. ticket/security threshold;
3. concourse directory;
4. left/right sector split;
5. block and row identity;
6. bowl reveal with field and display visible;
7. return/exit confirmation behind the spectator.

FIFA's
[stadium signage guidance](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/signage/)
uses a precinct → sector → level → block → row hierarchy and calls for
accessible, comprehensible signs placed in relation to movement. The
[precinct guidance](https://publications.fifa.com/de/football-stadiums-guidelines/technical-guideline/stadium-guidelines/precinct-and-perimeter/)
supports separating pedestrian and vehicle movement and locating accessible
arrival close to the venue.

### 6.4 Seating and sightline program

Register sectors A–H clockwise from south. Within each sector, register:

- low, middle, and upper representative seat positions;
- at least one aisle and one cross-aisle;
- row/section signs;
- an accessible viewing position integrated into the seating choice;
- field-center, near-goal, far-goal, scoreboard, and concert-stage targets;
- the south-entry/vomitory relation.

Minimum matrix:

- 8 sectors × 3 elevations × 2 event modes = 48 views;
- plus accessible-position views and four field/circulation overview views.

Every sample records eye position, look-at position, visible target percentage
or binary obstruction result, obstructing block if any, screen visibility,
field/stage visibility, and screenshot relation.

The [SGSA Accessible Stadia guide](https://sgsa.org.uk/wp-content/uploads/2023/12/Accessible-Stadia.pdf)
and U.S. Access Board
[assembly-area standards](https://www.access-board.gov/ada/chapter/ch02/)
support dispersed, integrated viewing positions with comparable sightlines.
FIFA
[safety guidance](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/safety-and-security/)
also makes egress capacity and a clear route to safety part of the venue
design, not a later decoration pass.

### 6.5 Westlight package sequence

1. Register current seating, aisles, openings, canopy, and target objects.
2. Capture the 48-view baseline and an exact south-entry walkthrough.
3. Place a reversible display mockup only in an offline clone or authorized
   temporary pilot.
4. Test all rays to field and screen, canopy/high-ball clearance, support
   intrusion, lighting, and safety-message legibility.
5. Rework the south threshold and two sample vomitories.
6. Repeat the same cameras and a no-prior-knowledge wayfinding test.
7. Approve form and support before permanent materials.
8. Roll the section/sign program around the bowl and reconcile the database.

The C01 arena is a separate training venue. Existing evidence shows its
bleachers face the emergency-training/triage program. It may need a status or
instruction board, but it should not be “fixed” by copying Westlight's stadium
screen brief.

## 7. C01, parking, portal, and concealment audit

### 7.1 Current recorded geometry

| ID | Description | Bounds / anchors |
|---|---|---|
| `C01` | Earth-covered east operations complex | x `100..300`, y `45..105`, z `70..235`; public entry `(116,65,172)` |
| `C01-PUBLIC-ENTRY` | Public portal | x `90..130`, y `64..80`, z `171..205` |
| `HGR-S01` | Mountain-integrated surface hangar | x `176..234`, y `88..120`, z `138..181` |
| `OBS-S01` | Observatory | x `175..235`, y `119..136`, z `137..182` |
| `SHL-S01` | Shelter | x `148..188`, y `81..91`, z `143..180` |
| `VLT-G01` | Vault complex | x `230..262`, y `44..76`, z `184..226` |
| `U01` | Service shaft | x `200`, y `24..105`, z `153` |
| `C01-STAIR-CORE-PRIMARY` | Primary stair core | x `204..216`, z `152..164`, approximately y `50..110` |
| `P01` | Visitor parking / Arrival Gardens | x `-125..125`, y `64..100`, z `172..305` |

Other protected arrival elements include:

- `P01-DISCOVERY-COURT`: x `87..95`, y `64..70`, z `183..209`;
- mountain no-touch boundary at x `96` in that package;
- `P01-FESTIVAL-ROW-EAST`: x `7..122`, z `246..254`, minimum width 9;
- southeast rain garden: x `100..119`, z `240..245`.

P01 has 236 verified spaces:

| Type | Count |
|---|---:|
| Standard | 205 |
| Accessible | 8 |
| EV | 14 |
| Premium | 9 |
| **Total** | **236** |

It also has three aisles, 23 pole lights, 32 flush lights, two solar-style
canopies, and 41,809 exact desired cells. The catalog count of 237 parking
features is the parent plus 236 stalls, not 237 stalls.

Current screenshots show the eastern lot terminating at a large gray
retaining/public-portal façade. Separate exterior evidence shows the hangar and
observatory prominently above grade. This fails the semantic promise
“earth-covered” when viewed as one complex.

### 7.2 Wayfinding defect

The current C01 wayfinding operation is only 23 lines and adds five signs plus
one trapdoor:

- one maintenance/service riser sign;
- primary stair signs for office, hangar, upper, and lower interfaces.

For a complex spanning roughly 200×165 blocks and multiple public, operational,
and protected levels, that is insufficient. The existing 21/21 route pass
shows the tested paths are connected; it does not show that a new player can
understand a corner, identify the stadium/training arena, distinguish public
from restricted movement, or find the return route.

### 7.3 Why the whole complex should not be moved

A literal whole-C01 translation east is rejected:

- C01 already reaches x `300`, the practical eastern property/river edge;
- there is no clean translation margin;
- moving it would intersect or force simultaneous reconstruction of HGR-S01,
  OBS-S01, SHL-S01, VLT-G01, U01, the stair core, and route network;
- current reviews enumerate at least 12 loaded NBT chests in the
  shelter/vault area, requiring exact backup and inventory protection;
- moving hundreds of thousands of cells creates block-entity, fluid, terrain,
  and rollback risks without being necessary to fix the parking edge.

Moving the deep complex also would not make the hangar/observatory visually
underground. The visible problem should be corrected at the surface expression
and portal, not by translating every protected room.

### 7.4 Preferred portal concept

Keep deep C01, shelter, vault, service shaft, and primary internal circulation
in place. Relocate/recess only the public portal and connect it to the existing
public route with a new underground passage. Keep the old portal live until the
new path passes all tests, then close and earth-cover the old façade.

Concept study only:

- new portal center near `(144,66,194)`;
- study envelope approximately x `130..158`, y `64..76`, z `184..206`;
- proposed south-flank access-road centerline:
  `(122,64,250)` →
  `(136,64,236)` →
  `(146,65,220)` →
  `(146,65,205)` →
  `(144,66,194)`.

This shifts the public portal east of P01's x `125` boundary and releases the
x `96..125` arrival edge for a coherent boundary, landscape, pedestrian route,
or carefully reconciled parking. The concept begins east/north of the
southeast rain garden. It is not construction-ready: its proximity to
`SHL-S01` at x `148..188`, z `143..180`, and all vertical cover, water, road
grade, room, and entity interactions require exact scanning.

### 7.5 Road standard

The mountain road concept uses:

- seven-block clear carriageway;
- two-block shoulders/edge treatment where terrain permits;
- target running grade no steeper than 1:20;
- absolute compressed-world maximum 1:12 only where approved, with a landing
  or switchback and a documented reason;
- slabs or longer ramps instead of one full block of rise every horizontal
  block;
- downhill guard/retaining edge;
- uphill drainage channel and water outfall logic;
- repeated route markers and a portal-reveal viewpoint;
- no conflict with the rain garden, shelter, vault, hangar, observatory,
  existing rooms, fluids, fences, or region boundary.

The [U.S. Access Board ramp guide](https://www.access-board.gov/ada/guides/chapter-4-ramps-and-curb-ramps/)
provides the 1:12 real-world maximum-ramp precedent and landing/handrail
principles. The preferred 1:20 project target treats the road as a walking
surface. The
[FHWA Federal Lands Highway design guide](https://highways.dot.gov/sites/fhwa.dot.gov/files/Chapter_09-20251113.pdf)
supports low switchback grades and drainage at low points in sensitive terrain.
The [FHWA low-volume-road field guide](https://rosap.ntl.bts.gov/view/dot/34136)
emphasizes route location, slope, drainage, construction, and maintenance as a
single system.

### 7.6 Parking completion standard

Preserve the verified 236-space count unless the owner approves a new program.
The portal package reports exact spaces retained, removed, relocated, and
added by type. It also tests:

- all three drive aisles;
- accessible and EV distribution;
- canopies, monuments, lights, garden, and Discovery Court;
- pedestrian paths to B01 and C01;
- the east-edge boundary;
- the road/portal interface;
- same-camera parking-center and east-edge appearance.

The goal is not to maximize stalls. It is to make the arrival read as complete
without silently destroying a quantitatively complete lot.

### 7.7 Concealment alternatives

| Scheme | Description | Decision |
|---|---|---|
| A: Literal zero visible complex | Relocate/rebuild portal, hangar, observatory, vents, and all surface support; restore full landform | Possible only as a major separate program; highest risk and cost |
| B: One landmark exception | Recess/berm hangar and portal; retain observatory as a deliberate civic landmark; conceal all bases and roof traces | Preferred if the owner accepts the observatory exception |
| C: Add a huge earth mound over all surface masses | Cover up to/above y `136` | Reject; produces an implausible artificial mountain, endangers interiors, and does not solve drainage gracefully |
| D: Landscape only | Trees and planting in front of current concrete | Reject alone; screens views but does not correct exposed structure or semantic mismatch |

NPS
[scenic-view best practices](https://www.nps.gov/subjects/scenicviews/best-practices.htm)
support using terrain and vegetation, compatible line/form/texture/scale,
low-reflective surfaces, and darker receding colors. Landscaping must reinforce
actual landform integration; it cannot be used to claim that exposed concrete
is underground.

Below-grade work also needs water control. DOE's
[building-science moisture guide](https://bsesc.energy.gov/energy-basics/building-enclosure-building-science-intro-moisture-flow)
supports grading away from openings, drainage planes, and foundation drains.
FEMA P-361's
[safe-room guidance](https://www.fema.gov/sites/default/files/documents/fema_safe-rooms-for-tornadoes-and-hurricanes_p-361.pdf)
similarly warns against rainfall/runoff ingress at in-ground entrances. In this
project that translates to a fluid-neighbor scan, a sloped threshold, protected
drainage route, and no water source above the new liner.

### 7.8 C01 phasing

1. Owner selects the observatory treatment: deliberate sole landmark or
   relocate/rebuild.
2. Freeze snapshot and inventory every protected block entity, including the
   shelter/vault chests and their NBT.
3. Register the old portal, candidate portal, connector, road stations,
   concealment surfaces, camera views, and decision nodes.
4. Generate road grade, earth-cover thickness, fluid, cave, room, entity, and
   structure collision maps.
5. Build an offline terrain/portal model and capture same-camera concept
   renders.
6. If accepted, construct the new connector and portal behind a temporary
   closure, while the old route remains fully operational.
7. Prove two-way no-jump public movement, dry volume, headroom, lighting,
   signage, inventories, and emergency return.
8. Construct the road and drainage/retaining treatment.
9. Reconcile the parking edge and prove all stall/category totals.
10. Close the old portal with exact-match replacement guards; apply earth cover
    in small reversible bands.
11. Recess/berm the hangar and implement the approved observatory decision.
12. Capture required views and accept only if no classified concealed surface
    is visible.

## 8. C01 internal wayfinding prescription

C01 needs a route/node system, not isolated signs.

### 8.1 Naming hierarchy

Use:

1. MainStreet America;
2. East Operations / C01;
3. public, operations, training, shelter, vault, hangar, observatory;
4. level code;
5. named room.

Suggested level codes:

- L1 / Lower Operations;
- L2 / Operations;
- L3 / Upper Operations;
- S / Surface;
- R / Restricted.

At each stair landing and major corner, provide:

- “you are here” level/sector map;
- destination and arrow before the turn;
- sector/level identifier at the turn;
- confirmation after the turn;
- return direction to public exit;
- explicit restricted/service distinction.

The primary stair core x `204..216`, z `152..164`, y approximately `50..110`
requires normal-speed two-way testing at every published interface. A path
cannot pass only because the graph reaches the destination.

### 8.2 Stadium/training-arena findability

The C01 arena must be called “Training Arena” consistently in the database,
maps, signs, and website. From the public entry:

- list Training Arena on the first directory;
- repeat it before every branch;
- mark the final approach with a distinct arena threshold;
- provide a return sign facing the seating/arena exit;
- do not use “stadium” for Westlight and C01 interchangeably.

## 9. Machine-readable object and media registration

The companion
[`infrastructure-audit.design.json`](./infrastructure-audit.design.json)
contains the baseline, measured findings, concept geometry, package sequence,
and QA camera program.

Until the core schema grows dedicated route/media tables, store generated
relations in a versioned sidecar and import only after validation. Required
fields:

### 9.1 Route segment

- stable feature ID;
- project, parent, class, state, and aliases;
- polyline/centerline stations;
- clear-envelope target and measured minimum/median/maximum;
- floor/ceiling, vertical change, grade, turns, and decision count;
- start/end node IDs;
- adjacent cave/fluid/protected-feature IDs;
- movement result in both directions;
- snapshot hash and observation ID.

### 9.2 Decision or vertical node

- stable feature ID and node type;
- exact bounds and standing point;
- incoming/outgoing route IDs;
- level code and destinations;
- signs with facing/message;
- landing, headroom, guard, and lighting observations;
- before/after image IDs.

### 9.3 Venue sightline

- seat/sample ID, sector, row band, and event mode;
- eye and look-at coordinates;
- focal target and display IDs;
- obstruction result and obstructing block/feature;
- field/stage/display visibility result;
- screenshot relation;
- snapshot hash.

### 9.4 Media

- media ID;
- feature ID and optional observation/package ID;
- exact path and file hash;
- media type and role (`before`, `after`, `map`, `section`, `sightline`,
  `defect`, `acceptance`);
- camera position, look-at, yaw/pitch/FOV/projection;
- image dimensions;
- capture time and snapshot hash;
- caption, reviewer, QA status, and before/after pair ID.

## 10. Atomic implementation packages

No package below is authorization to execute in the live world.

| Package | Scope | Prerequisites | Acceptance |
|---|---|---|---|
| INF-DB-01 | Register route/node/media/sightline objects | Schema or validated sidecar; fixed baseline | All named infrastructure has stable IDs and provenance |
| INF-RR-01 | S1 section pilot x `138..148` | Collision/fluid/gravity/entity scan; before images | Seven-wide authored section or approved local exception; dry, lit, two-way |
| INF-RR-02 | T2b liner pilot x `-145..-135` | Cave boundary and route model | Five-wide legible path; intentional cave windows; no accidental fill |
| INF-RR-03 | RR-Z5 flight/landing pilot | Flight/landing inventory and protected bounds | No jump/crouch/fall; clear signs, guards, headroom, two-way timing |
| INF-RR-04 | Route-family rollout | Acceptance of all three pilots | Every segment type consistent; route and cave thresholds registered |
| INF-WL-01 | 48-view stadium baseline | Sector/sample registration | Complete reproducible sightline set |
| INF-WL-02 | Reversible screen/entry mockup | Canopy/high-ball/support study | All sectors see sports target/display; entrance reads as circulation |
| INF-WL-03 | Permanent screen, vomitory, sign rollout | Mockup acceptance | Sports/concert mode QA, egress, accessible samples, DB/media reconciliation |
| INF-C01-01 | Portal/road/cover feasibility | Owner observatory choice; NBT backup; full collision maps | Concept with zero protected conflicts and acceptable visual proof |
| INF-C01-02 | New connector and portal | Approved feasibility and dry run | Old route retained; new route dry, lit, signed, two-way |
| INF-C01-03 | Mountain road and parking edge | Portal acceptance | Grade/guard/drainage pass; 236-space reconciliation or approved delta |
| INF-C01-04 | Old portal closure and surface concealment | New route and rollback verified | No concealed shell visible from required cameras |
| INF-C01-05 | Hangar/observatory surface treatment | Explicit owner decision | Approved exception or complete concealment; no false “underground” claim |

Every package uses exact-material guards, bounded targets, dry-run validation,
before media, post snapshot, entity/NBT reconciliation, same-camera after
media, and an explicit rollback artifact.

## 11. Required screenshots and QA shots

### 11.1 Raven Rock

| Shot family | Required views |
|---|---|
| T1 | N4 toward interior; N1 both directions; Cavern A threshold back toward N1 |
| T2 | N3 toward interior; dogleg before/at/after decision; T2b cavern entry both directions; Cavern B threshold |
| T3 | N5 toward interior; N2 both directions; Cavern A threshold |
| T4 | Exterior side of bulkhead, interior side, aquifer-safe context, “no surface exit” confirmation |
| C1/C2 | Each endpoint in both directions and each cavern threshold |
| S1 defect | eyes near `(100,-9,-15)`, `(140,-9,-15)`, `(170,-9,-15)`, and the x `180..190` merge; capture both directions where possible |
| T2b defect | representative eyes near x `-140`, `-110`, `-80`, `-55`, aligned with standable centerline; include cross-section map |
| RR-Z5 | top and base directory; representative flight up/down; every fifth landing; one vertical cutaway |

For exact eye y/z at T2b, use the standable-cell observation generated from the
same snapshot rather than assuming the planning floor. Record all camera values
in the media manifest.

### 11.2 Westlight

| Shot family | Required views |
|---|---|
| Existing condition | south lower, north lower, west middle, east middle, upper obliques, center-field overview |
| Entry | outside identity, threshold, first directory, left/right split, bowl reveal, return view |
| Sightlines | 8 sectors × low/middle/upper × sports/concert |
| Accessibility | every registered accessible sample toward field/stage/display and return route |
| Display | underside/support, canopy/high-ball clearance, safety-message readability, four cardinal views |
| Egress | representative seat-to-concourse and concourse-to-exterior in both directions |

Concept anchor candidates, to be validated against standable cells:

- center-field overview near `(-360,64,-560)`;
- south lower near `(-360,70,-510)`;
- north lower near `(-360,70,-610)`;
- west middle near `(-410,75,-560)`;
- east middle near `(-310,75,-560)`.

### 11.3 C01 and P01

Use the exact same camera and time/lighting state before and after:

- parking center toward the eastern edge;
- parking east edge along the row/aisle;
- Main Street south arrival;
- Discovery Court;
- old public portal frontal and two obliques;
- proposed portal frontal, approach, threshold, and return;
- new mountain road uphill and downhill;
- HGR-S01 and OBS-S01 from north, south, east, and west;
- north, south, east, and west oblique aerials of the whole mountain;
- inside C01 at every primary stair interface and every decision corner;
- public-entry-to-Training-Arena walkthrough at each decision;
- shelter/vault protected-inventory proof before and after.

The acceptance set must show the terrain silhouette, not only tight crops of
the new portal.

## 12. Risk and rollback

### 12.1 Highest risks

| Risk | Trigger | Control |
|---|---|---|
| Fluid/aquifer breach | T4 or new mountain cuts meet water source | Keep T4 bulkhead; fluid-neighbor scan; small bands; stop on unexpected fluid |
| Natural-cave overfill | T2b/S1 broad fill intersects cavern | Tube-bounded route model; exact section pilot; preserve intentional windows |
| Gravity collapse | Gravel/sand exposed during tunnel cut | Gravity-block census before/after; temporary support; dry-volume test |
| Stair tread deletion | Headroom clear overlaps adjacent switchback | Per-flight bounds; exact tread inventory; pilot one flight |
| Protected inventory loss | C01 work intersects loaded chests/tile entities | NBT export, checksums, target exclusion, after reconciliation |
| Parking regression | Portal/road removes or blocks stalls/aisles | Per-space feature reconciliation and three-aisle route test |
| Stadium obstruction | Display blocks field, high ball, canopy, or exits | Reversible mockup; 48-view rays; support/egress collision test |
| False concealment | Tight screenshots hide exposed structure | Fixed public and four-sided aerial cameras; shell visibility test |
| Provenance drift | Snapshot path reused or world changes | Content-addressed snapshot and hash on every operation/media record |

### 12.2 Rollback artifact

Before each physical package, produce:

- exact pre-state block list for the bounded operation volume;
- tile-entity/entity NBT export;
- source snapshot/hash;
- inverse exact-material operations or a bounded restore package;
- pre-state route and fluid observations;
- before images with camera metadata.

Rollback is accepted only when block, entity/NBT, fluid, route, and same-camera
visual comparisons return to the recorded pre-state. A command finishing
without error is not proof of rollback.

### 12.3 Stop-work conditions

Stop immediately if:

- the snapshot hash differs;
- an unregistered room, tunnel, fluid body, or protected entity intersects;
- a tunnel opens into an unexpected cave or adjacent bore;
- a public route requires sprint, jump, crouch, or one-way movement;
- a display obstructs any representative sports sightline or exit;
- the new portal is reachable only after the old route is closed;
- parking category/count reconciliation fails;
- the required before camera cannot be reproduced.

## 13. Source notes

The following official or primary references informed this audit:

1. [U.S. Access Board, Stairways](https://www.access-board.gov/ada/guides/chapter-5-stairways/)
   — uniform riser/tread and handrail principles.
2. [U.S. Access Board, Ramps and Curb Ramps](https://www.access-board.gov/ada/guides/chapter-4-ramps-and-curb-ramps/)
   — 1:12 maximum-ramp, landing, and handrail precedent.
3. [U.S. Access Board, Accessible Routes](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/)
   — general-circulation, clear-width, slope, turn, and passing principles.
4. [FHWA, Technical Manual for Design and Construction of Road Tunnels](https://www.fhwa.dot.gov/bridge/tunnel/pubs/nhi09010/tunnel_manual.pdf)
   — integrated route, egress, lighting, drainage, and operational systems.
5. [FHWA tunnel-manual landing page](https://highways.dot.gov/media/180616)
   — authoritative publication record.
6. [USACE, Engineering and Design: Tunnels and Shafts in Rock](https://www.publications.usace.army.mil/Portals/76/Publications/EngineerManuals/EM_1110-2-2901.pdf)
   — variable geology/water and adaptable tunnel design.
7. [Caltrans, Roadway Lighting Manual](https://dot.ca.gov/-/media/dot-media/programs/traffic-operations/documents/manuals-policy-data-reports/roadway-lighting-manual-072021-a11y.pdf)
   — pedestrian-underpass and long-underpass lighting concerns.
8. [MUTCD 11th Edition, Chapter 2D Guide Signs](https://mutcd.fhwa.dot.gov/pdfs/11th_Edition/Chapter2d.pdf)
   — destination hierarchy and consistent wayfinding.
9. [FIFA, Stadium Bowl](https://publications.fifa.com/de/football-stadiums-guidelines/general-process-guidelines/design/stadium-bowl/)
   — field sightlines, accessible sightlines, and obstruction/high-ball concerns.
10. [FIFA, Information Technology](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/information-technology/)
    — score/time, safety messaging, and visible displays.
11. [FIFA, Signage](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/signage/)
    — precinct-to-row hierarchy and route comprehension.
12. [FIFA, Precinct and Perimeter](https://publications.fifa.com/de/football-stadiums-guidelines/technical-guideline/stadium-guidelines/precinct-and-perimeter/)
    — pedestrian/vehicle separation and accessible arrival.
13. [FIFA, Safety and Security](https://publications.fifa.com/fr/football-stadiums-guidelines/technical-guideline/stadium-guidelines/safety-and-security/)
    — egress and route-to-safety planning.
14. [SGSA, Accessible Stadia](https://sgsa.org.uk/wp-content/uploads/2023/12/Accessible-Stadia.pdf)
    — wheelchair viewing and sightline precedent.
15. [U.S. Access Board, ADA Standards Chapter 2](https://www.access-board.gov/ada/chapter/ch02/)
    — assembly-area viewing-position dispersion and sightlines.
16. [NPS, Scenic Views Best Practices](https://www.nps.gov/subjects/scenicviews/best-practices.htm)
    — landform, vegetation, line/form/texture, reflectivity, and color.
17. [DOE Building Science, Moisture Flow](https://bsesc.energy.gov/energy-basics/building-enclosure-building-science-intro-moisture-flow)
    — grade, drainage plane, below-grade drainage, and waterproofing principles.
18. [FEMA P-361, Safe Rooms](https://www.fema.gov/sites/default/files/documents/fema_safe-rooms-for-tornadoes-and-hurricanes_p-361.pdf)
    — runoff control at in-ground entrances.
19. [FHWA Federal Lands Highway Design, Chapter 9](https://highways.dot.gov/sites/fhwa.dot.gov/files/Chapter_09-20251113.pdf)
    — switchback grade and drainage considerations.
20. [FHWA, Low-Volume Roads Engineering Best Management Practices Field Guide](https://rosap.ntl.bts.gov/view/dot/34136)
    — sensitive route location, slope, drainage, construction, and maintenance.

## 14. Authorization statement

No live-world edits, RCON operations, service restarts, database writes, or
physical build operations were performed for this audit.
