# July 28 Town Expansion — Frozen Scope and PM Control Register

Document ID: `REDEV-2026-07-28-TOWN-EXPANSION-FROZEN-SCOPE-01`  
Machine register:
[`session-frozen-scope-register.json`](session-frozen-scope-register.json)  
Scope freeze: 2026-07-28 UTC  
Current program decision: **DO NOT RELEASE — OFFLINE DESIGN AND WIP EXIST,
BUT THE CURRENT PACKAGE IS BLOCKED AND NOTHING IN THIS EXPANSION IS LIVE**

## 1. Executive decision

The owner’s full program is recorded and traceable. It includes the original
mapping, database, Sites, tunnels, MainStreet, C01, stadium and master-planning
requests; the complete Ravensreach civic, Westlight, westward parks/housing,
data-campus, observatory, Worker Town and B01 additions; and the latest Gilded
Raven adult theater, dedicated modern owner tunnel, extravagant stairs/lifts,
future mini-city reservation/sales office, 24-slot DSM correction, preserved
campus-road holdout home, Iowa Data District Phase 0 and complete Concord
service town.

The most important PM fact is the state boundary:

- R1 and Wave 2 are accepted predecessor releases. They do not prove this
  expansion.
- Sites version 4 is a healthy predecessor publication. It does not contain an
  accepted town-expansion as-built.
- Town Expansion WIP2 generated 145 offline scopes and 2,321,651 exact-guarded
  target cells, but it is blocked by a protected chest at
  `(-117, 68, -349)`.
- The independent point-in-time safety audit says
  `BLOCKED_DO_NOT_RELEASE`.
- B01 Guest Services now has a validated source model, but that source has not
  been emitted into a final accepted operations package.
- The Gilded Raven/owner-corridor package is an implementation-ready coordinate
  plan with clean selected survey geometry, but it is not in the current WIP
  operations and is not live.
- The future owner mini-city is a reservation. Only its Founders’ Gallery
  Sales Office is a current build candidate.
- The Iowa Phase 0 precincts are **planned/unbuilt**. Phase 0 is roads,
  perimeters, low wall/foundation outlines, gates, site reservations and
  billboards—not finished data halls.
- Concord is different: it is a complete-town build target, but currently has
  only a binding research/design brief; coordinates, operations and live
  evidence are pending.
- The July 28 Box handoff is not verified. Connector reachability is not an
  upload receipt.

No world, Sites or Box deployment was performed by this PM/document-control
task.

## 2. Claim and evidence rules

| State | What it proves |
|---|---|
| Requested | The owner requirement is recorded. |
| Surveyed | Existing conditions or a candidate were measured from a named source. |
| Researched | Standards and precedents were converted into a design basis. |
| Designed | A program, envelope, route or acceptance contract exists. |
| Generated offline | Forward/rollback or rendered files exist locally. Nothing live is implied. |
| Preflighted | Fresh source, exact guards, collision, protected-state and parser gates pass. |
| Committed live | An atomic live transaction ledger records success. |
| Verified post-state | Immutable post-state, rollback, movement, capacity and media gates pass. |
| Imported database | Accepted objects/relations entered the database with an integrity ledger. |
| Published Sites | An exact source-pinned version was saved, deployed and health-checked. |
| Box-verified | Remote path, bytes and content hash match for every required artifact. |

An earlier state never implies a later state. In particular:

- a source-code model is not a generated operation file;
- a generated operation file is not a preflight;
- an offline PASS is not live authorization;
- a live transaction is not accepted until independent post-state QA passes;
- a screenshot file is not an exact database relation merely because its name
  resembles an object;
- a healthy old Sites version is not publication of new work; and
- a Box connection is not proof of a remote handoff.

Adult-program design is controlled by one content rule: tasteful,
consensual-adult, private, age-controlled and non-graphic architecture only.
That applies to the Gilded Raven, B01 wellness/private rooms, owner rest-suite
annexes, observatory owner rooms and the private literature archive.

## 3. Current evidence ledger

### 3.1 Current offline WIP

| Control | Recorded value |
|---|---|
| Package | `town-expansion-r1-2026-07-28` |
| Source snapshot | `data/worldsnap-town-expansion-expanded-baseline-20260728T0405Z/region` |
| Source SHA-256 | `e612b1feabcf8bd81e427804e0c5cdccea5aac79ef543cadbf2b05d360de7a5a` |
| Report | `data/buildops/town-expansion-r1-wip2.report.json` |
| Report SHA-256 | `04b1c2dffaac3396c94be5ea3fc30245e9665accabd341f12550515a46eda399` |
| Forward operations | 233,108 groups / 2,321,651 target cells / 145 scopes |
| Forward SHA-256 | `a48db51242b299daf746a429727de995c1a6bfede3f486e7d8b5fad3f37e7a8c` |
| Rollback SHA-256 | `f26220752fb7b3d53d6a2123eb98760f4ddae21268f77bfbc73e8411de790554` |
| Exact guarded | 2,321,651 cells |
| Unguarded | 0 |
| Skipped | 1 |
| Current state | `BLOCKED_PROTECTED_BLOCK_ENTITIES` |
| Blocker | One chest at `(-117,68,-349)` in the steward mini-mansion scope |

The chest may not be dismissed as “just one cell.” The model must route around
it or use an owner-reviewed inventory preservation/migration contract.

### 3.2 Independent safety audit

The point-in-time audit is
[`independent-release-geometry-safety-audit.md`](independent-release-geometry-safety-audit.md)
with machine record
[`independent-release-geometry-safety-audit.json`](independent-release-geometry-safety-audit.json).
Its decision is `BLOCKED_DO_NOT_RELEASE`.

It identified unresolved concerns in the data campus, wet warehouse authority
and egress, C01 coordinate/road/migration controls, Westlight implementation,
pavilion water/statue/monument/tunnel interfaces, and observatory
implementation/NBT boundaries. The audit captured an earlier generator source.
That makes it a point-in-time control, not irrelevant history: every finding
still needs an explicit final-source closure test.

Its limited passing spatial conclusion was that the planned civilian
library–Guild tunnel is separated vertically and horizontally from the
Ravensgate restricted volume. WIP2 also reports zero civilian targets in that
restricted volume. That is an offline design fact, not a live acceptance.

### 3.3 B01 Guest Services source model

The binding review is
[`mainstreet-guest-services-rooftop-wellness-design-review.md`](mainstreet-guest-services-rooftop-wellness-design-review.md)
and its
[`machine schedule`](mainstreet-guest-services-rooftop-wellness-design-review.json).

The generator source now contains a model-only implementation. Its reported
model checks include:

- 15 protected kitchen block entities and zero targeted;
- 45 adjusted dry support positions;
- four broad stair cores;
- two lift cores;
- two remote routes;
- 3,813 modeled water cells at final priority 990; and
- zero T2b geometry.

That is `IMPLEMENTED_MODEL_ONLY_VALIDATED`. It is not yet a generated final
operations package, independent support/containment proof, post-state or live
result. The B01 review also used a state that did not contain the planned staff
lounge/greenway; the final generator must reconcile that connection on one
same-moment immutable source.

### 3.4 Gilded Raven and modern owner corridor

The frozen design sources are:

- [`worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md`](worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md);
- [`worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json`](worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json);
- [`worker-town-theater-owner-tunnel-survey.json`](evidence/worker-town-theater-owner-tunnel-survey.json); and
- [`modern-underground-corridor-standard.md`](modern-underground-corridor-standard.md).

The selected theater, descent, owner corridor, seven rest suites, future-city
reservation, sales office, mansion ascent and mansion arrival gallery each
have zero surveyed fluids and zero block entities. Their relevant face halos
are also dry.

Key design facts:

- The Gilded Raven is a non-graphic adult theater/cabaret with a 168-seat main
  house, five five-person salons and four one-to-one mini theaters.
- Stage, apron, backdrop and lighting frame must exist before any fixed seat.
- Five broad open vomitories connect the seating bowl to a real circulation
  ring.
- Theater descent uses one 6-rise/12-run ceremonial flight and nine full
  12-rise/24-run switchback flights.
- Mansion ascent uses thirteen 12-rise/24-run flights.
- Both major cores use seven-block-clear stairs, six blocks of headroom and
  adjacent minimum six-by-six lift cars.
- The owner corridor is 928 blocks long, level, five blocks clear by five high,
  with a nine-block construction envelope at floor `y=-44`.
- It is explicitly a new modern owner system, not T2b. It has no connection to
  T2b, Raven Rock, Ravensgate, the library–Guild tunnel, portals, C01, natural
  caves or public/performer routes.
- Seven rest suites use premium hospitality and tasteful, non-graphic private
  annexes.
- The future city reservation is
  `[65,-38,-280,125,-20,-200]` and must remain unexcavated.
- Only the Founders’ Gallery Sales Office at
  `[78,-46,-227,106,-33,-204]` is a current build candidate.
- The mansion arrival intentionally shares 276 authored interface cells with
  the east wing; every other selected object has zero overlap with WIP2.

The clean survey does not remove the need to exact-list and top-down
pre-support gravity cells, regenerate from a new same-moment source, reconcile
the mansion interface in one scope, and pass route/isolation/stair/lift/media
QA.

### 3.5 Corrected data-district control

The controlling count is a 24-slot Microsoft/DSM-inspired register grouped:

`DSM1–4`, `DSM5–8`, `DSM9–13`, `DSM14–18`, and `DSM40–45`.

The numbering jumps must never be turned into a claim of 45 facilities.
Public-record source status and Minecraft implementation state are separate
fields. The expansion team’s current target is 24 modeled/completed Minecraft
hall slots, but they remain non-live until a final generated package and
post-state acceptance exist.

The three additional Iowa precincts are governed by
[`iowa-data-district-phase0-source-of-truth.md`](iowa-data-district-phase0-source-of-truth.md):

- Meta Altoona-inspired: 12 future envelopes, using a public-record-supported
  12-building planning precedent;
- Google Council Bluffs-inspired: six fictional future envelopes, explicitly
  not a claim of the real current building count; and
- LightEdge Solutions EdgeBCC Altoona-inspired: two future buildings with four
  quadrants each. The correct name is **EdgeBCC**, not EdgeConneX.

All are `PLANNED / PHASE 0 / UNBUILT`. Tonight’s planned physical vocabulary
is limited to roads, contour-following terrain work, perimeters, obvious gates,
low future-wall/foundation outlines, reservations and block-art billboards.
The district spine must continue beyond the third precinct, retain future
junctions, a green/utility reserve and at least two unassigned future-campus
parcels.

Phase 0 also includes a fictional shared power backbone: one switching yard,
two independent-looking transmission corridors, one substation
yard/reservation for each named precinct, a continuing utility corridor,
energy-operations shell and marked unfinished storage pads. It is a walkable
Minecraft planning diagram, not a reproduction or claim of real line routes,
voltages, protection, controls, entries or security. Firebreak/planted
separation must protect the holdout home, public courts, staff buildings,
pools and detention water.

Terrain may not become one giant flat slab or exposed vertical cliff. It uses
contour-following benches, planted cut/fill slopes and limited retaining
edges. Water must be classified before alteration: useful drainage becomes a
designed detention lake/dammed landscape or green corridor; only isolated
nuisance pockets may be drained without redirecting flow.

The campus-road holdout home is a separate protected program: preserve a
medium older personal home amid growth and add an attached four-car garage,
backyard pool/treehouse, fallout shelter, first-floor tasteful non-graphic
adult suite/service kitchen/bedroom-viewing salon/private room, and two-room
office/lounge. Its final survey evidence is pending and the parcel may not be
absorbed by Phase 0.

### 3.6 Concord service town

The binding design brief is
[`concord-data-district-service-town-source-of-truth.md`](concord-data-district-service-town-source-of-truth.md).

Concord is a compact complete service town along the district road, not another
future-outline campus. Its approach looks deliberately ordinary: gas station,
small post office, neighborhood bar, motel sign, worker shuttle stop, planted
edge and no blank backs. Behind that frontage is a purpose-built, non-graphic
adult nightlife court for the data-center construction and operations
workforce.

The controlled program includes:

- a two-story motel with exactly 25 rooms: 13 ground and 12 upper;
- a smaller Gilded Raven Annex directly opposite, with exactly 72 main-room
  seats, three five-seat salons and two single-guest salons;
- a separate non-graphic dance/strip-club venue;
- shared pedestrianized parking court, planted center walk and direct public
  entrances;
- distinct rear service, performer and management routes;
- shift-change shuttle stop, waiting lounge and late-night food;
- two empty future entertainment parcels with sidewalk/utility stubs; and
- an extendable planted turning court.

The annex has no connection to Worker Town’s owner corridor, Ravensgate or an
inactive portal room. Concord must use stepped terrain benches, planted
transitions, useful drainage/detention and green separation from power yards,
not a giant slab. Its present evidence state is
`RESEARCHED_AND_DESIGNED_COORDINATES_PENDING`.

## 4. Evidence-based session chronology

All timestamps are UTC.

| Time | Event | Truth state |
|---|---|---|
| Jul 27 23:51–Jul 28 01:04 | R1 atomic release, routes, database, dossier and Sites | Accepted predecessor |
| 02:26–02:46 | Wave 2 atomic release, routes, database, media, dossier and Sites source | Accepted predecessor |
| 02:54:31 | Sites Worker Error 1101, Ray `a2209982e8a31497` | Incident |
| 03:00–03:03 | Worker repair deployed as Sites v4; production `/` returned 200/outcome `ok` | Published predecessor |
| 03:06–03:10 | Town-expansion baseline atlas/evidence and read-only Sites/Box audit | Surveyed |
| 03:14 | Guild Hall and specialist bar research/program | Researched |
| 03:17–03:31 | All-attached garage change, coordinate and engineering schedules | Designed |
| 03:21 | Initial town-expansion coordinate schedule | Designed |
| 03:25–03:29 | Russian pavilion and Westlight island/waterfront controls | Designed |
| 03:31 | Westward parks/housing/workforce/staff-link change | Researched |
| 03:32 | Interim PM dossier, Box audit and session machine manifest | Interim |
| 03:47–03:49 | Town siting, parks, underground warehouse and RV design | Designed |
| 04:12–04:18 | Data campus, C01, warehouse and venue design packages | Designed |
| 04:22 | Pavilion/Ravensgate and observatory controls | Designed |
| 04:27 | Worker Town steward mini-mansion design | Designed |
| 04:30 | B01 Guest Services/rooftop-wellness review | Designed with holds |
| 04:31 | WIP2: 145 scopes / 2,321,651 targets | Modeled, blocked |
| 04:32 | Independent geometry/safety audit | Blocked, do not release |
| 04:50–04:56 | Gilded Raven, owner tunnel, rest suites, sales office, city reservation and mansion arrival frozen | Implementation-ready coordinates, not generated/live |
| 04:53 | Modern underground corridor standard | Binding design source |
| 04:55 onward | Corrected DSM register, holdout home, Iowa Phase 0 master plan and shared fictional power-backbone controls | Researched/planned, non-live |
| 05:01 | Concord complete service-town brief, exact motel/theater program and non-graphic nightlife economy | Researched/designed; coordinates pending |
| PM freeze | Full owner scope consolidated; no world/Sites/Box deployment by this task | Frozen scope |

## 5. Master-plan structure

### MP-01 — Ravensreach Civic Garth and Town Fabric

Complete the town-building penthouse; replace the Amsterdam group with a
period longhouse; make its courtyard a real room in the town; enlarge the
library to at least four times measured usable area; descend through a
two-level concrete walk-out terrace into the civic pavilion; and cross the
pavilion to a monumental five-level Guild Hall. The whole ensemble needs clear
block edges, thresholds, views, service gaps, statuary and addressable places.

Current truth: researched/designed and largely modeled in WIP2, but blocked.

### MP-02 — Ceremonial Parkway, Oasis and Stadium Arrival

Turn the stadium road into a broad legible procession with six or an approved
final count of safe billboards, a real halfway tollway-style oasis, and an
original game-evocative mini-bunker. Every stadium seating bank must face an
actual screen/stage. Wayfinding begins in town and continues through every
decision point.

Current truth: designed/modeled, blocked; sightline and route proof pending.

### MP-03 — Westlight Island, Piers and Crater Waterfront

Unify the stadium island, pedestrian malls, intentional pier buildings,
amusement pier, Ferris wheel, coaster, steak and shrimp houses, crater lake,
quay and green edge. Preserve the accepted infinity screen and prove new work
does not obscure or conflict with it.

Current truth: researched/designed/modeled, blocked.

### MP-04 — Westward Parks, Lakeside Housing and Workforce Link

Build original facing dry and water parks, extend the westward road and
greenbelt, make a continuous public crater/lake edge, add Hampton-influenced
medium-density housing and two dignified workforce projects around a shared
court, and connect staff directly to rear MainStreet and its employee lounge.

Current truth: researched/designed/partly modeled, blocked.

### MP-05 — MainStreet America

Pull isolated service buildings into a coherent one- or two-street
development, complete all roads, orient every house to a named street, convert
all residential garages to real attached structures, and give every large
house a four- or six-car attached garage. Complete B01 Guest Services and its
roof/wellness program only after same-state and support/containment gates.
Expand underground logistics and the RV sales district while restoring
parking and preserving inventory.

Current truth: mixed design/source-model/WIP states; none accepted live.

### MP-06 — C01 Hidden Bunker and Recovered P01

Move the full complex east; recover the entire parking field; create a
terrain-following road down the mountain side; recess and airlock the entrance;
rebuild all program spaces and two independent egress routes; and achieve
cellwise natural cover with no unintended concrete shell visible in a
360-degree camera review.

Current truth: surveyed/designed/modeled, blocked; competing coordinate bases,
road and migration controls must be reconciled.

### MP-07 — Northeast Data/Aviation Campus and Iowa Phase 0

Use a correct 24-slot DSM register; separately verify the functional hall/rack
program, NOC, power/support, dorms, independent 200-seat auditorium and
200-seat cinema, normal DM10, separate InfoBunker annex and aviation/logistics
compound. Protect the holdout home. Extend a future-ready district spine into
planned/unbuilt Meta, Google and EdgeBCC precincts using terraced grading,
water/detention decisions, low construction outlines, a fictional shared
power backbone and reserved future parcels.

Current truth: existing WIP’s old ten-hall program is blocked; 24-slot
expansion and Phase 0 evidence are still being finalized and are non-live.

### MP-08 — Observatory Owner Estate

Create the mega-estate without impairing observatory function/views. Expand
the safe room/shelter, owner wellness/private non-graphic program and
monumental circulation. Keep all eight planned portal rooms entirely inactive
and prove zero active portal blocks.

Current truth: designed/modeled, blocked.

### MP-09 — Worker Town Steward Quarter and Gilded Raven

Preserve and expand the steward home(s), protecting the blocked chest and all
retained block entities. Build the Gilded Raven as Worker Town’s extravagant,
traditional adult theater/cabaret with proper stage, sightlines, balconies,
open circulation, dining, back of house, privacy, accessibility and two egress
paths.

Current truth: mini-mansion modeled/blocked; theater implementation-ready
coordinates but not generated.

### MP-10 — Modern Owner Underground and Future Mini-City

Build a dedicated owner system that is not T2b: a 928-block five-by-five-clear
level corridor, seven rest suites, deliberate orientation nodes, modern
lighting/wayfinding/utilities, and two monumental stair/lift terminals.
Reserve the future mini-city without excavating it. Build only the sales office
and sealed presentation marker in this phase.

Current truth: implementation-ready coordinate plan, not generated/live.

### MP-11 — Catalog, Media, Dossier, Sites and Box

After physical acceptance, generate the one-big-map overview, detailed
district sheets, exact floor plans, matched object screenshots, database
census/crosswalk, final all-session PM PDF, source-pinned Sites version and
remote-hash-verified Box handoff.

Current truth: predecessor publication exists; all town-expansion closeout is
pending.

### MP-12 — Concord Data-District Service Town

Build a complete compact two-street town along the data road. Keep the highway
face ordinary and useful—fuel/general store, post office, bar, motel arrival,
shuttle/lounge and late-night food—then form a deliberate non-graphic night
court behind it. The 25-room motel and 72-seat Annex theater face each other;
a separate dance venue closes the court; service and performer traffic use the
rear lane; two future entertainment parcels extend the economy later.

Current truth: binding research/design brief; parcel coordinates, generation
and live work pending.

## 6. Requirements-to-evidence matrix

The JSON register holds the full acceptance sentence and evidence list for
each row. This table is the human review index.

### Documentation, urban design and tunnels

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| DOC-001 | Detailed district/cluster maps | Baseline maps only | Accepted post atlas |
| DOC-002 | One big map of everything | Pending | Full accepted extent, no clipping |
| DOC-003 | More building/route/underground screenshots | Predecessor media only | Post-state capture manifest |
| DOC-004 | World/town database report | Old census only | Read-only final census/integrity |
| DOC-005 | Exact object-to-screenshot/floor-plan links | Wave 2 precedent only | Zero-orphan final crosswalk |
| DOC-006 | Sites showcase | v4 predecessor healthy | New source-pinned save/deploy/health |
| DOC-007 | Detailed all-session PM PDF | Interim source exists | Final evidence, render and verify |
| DOC-008 | Verify all new material in Box | Pending sync | Remote path/size/hash ledger |
| DOC-009 | City-grid research paper/source of truth | Researched | Final citations and design decisions |
| DOC-010 | Future plans and plots like a development | Partial schedules | Parcels, utilities, phases, IDs |
| DOC-011 | PM control for every request | In progress | Final closure matrix |
| URB-001 | Spacing, legibility and understandable turns | Partial design | Field-of-view and walk review |
| URB-002 | Fill town gaps as coherent blocks/areas | WIP modeled/blocked | Non-conflicting block plan |
| TUN-001 | Uniform tunnel standard | Binding modern standard | Final scope conformance |
| TUN-002 | Easy-to-walk stairs/stairwells | Partial designs | Bidirectional normal-walk QA |
| TUN-003 | New owner tunnel, explicitly not T2b | Clean coordinate plan | Fresh exact ops and isolation proof |
| TUN-004 | Premium rest nodes and extravagant stairs/lifts | Clean coordinate plan | Pre-support and movement QA |
| TUN-005 | Private, secure, legible, escapable owner route | Programmed | Access/egress matrix |
| CIRC-003 | Monumental but usable stairs/lifts | Guild WIP + owner plan | All-level route acceptance |

### MainStreet America and C01

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| MSA-001 | Bring isolated additions closer | Partial design | Coherent parcel/frontage walk |
| MSA-002 | Complete one/two-street system | Partial design | Continuous road/address/driveways |
| MSA-003 | Attach every residential garage | 18 modeled, blocked | Physical attachment/use/media/DB |
| MSA-004 | Large houses get 4/6-car attached garages | Designed/modeled | Classification and bay counts |
| MSA-005 | Integrate warehouse/cooking school/service buildings | Partial design | Frontage/service parcel proof |
| MSA-006 | B01 Guest Services/work club | Source-model validated | Final generated/report/route QA |
| MSA-007 | B01 patios, roof gardens, tubs, pool/bar, adult wellness | Source-model validated only | Support/containment/independent QA |
| MSA-008 | Staff path and employee lounge | WIP plus state mismatch | Same-moment rebase and walk |
| MSA-009 | Underground warehouse + full parking recovery | Designed/modeled, blocked | Dry shell, egress, inventory, count |
| MSA-010 | RV sales/customer/support district | Designed | Final engineering/generation |
| C01-001 | Move full bunker east/recover P01 | Designed/modeled, blocked | One authoritative schedule |
| C01-002 | Terrain-following side-mountain road | Partial design | Stationed grade/access QA |
| C01-003 | Move/recess/airlock entrance | Modeled, blocked | Portal route/camera proof |
| C01-004 | Entire complex underground/no shell visible | Modeled three-block cover claim | Cellwise cover and 360 cameras |
| C01-005 | Preserve complete program/routes/egress | 12 broad rooms modeled | Room crosswalk and route QA |
| C01-006 | Hide concrete projections/seams | Design criteria | Exterior view and terrain sections |

### Ravensreach, stadium road and oasis

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| RRCH-001 | Finish/redesign penthouse | WIP modeled/blocked | Envelope, rooms, terrace, media |
| RRCH-002 | Replace Amsterdam group with period longhouse | Researched/modeled | Retirement and full-building proof |
| RRCH-003 | Designed longhouse courtyard | WIP modeled/blocked | Place/drainage/route review |
| RRCH-004 | Library at least four times larger | WIP modeled/blocked | Baseline versus usable area |
| RRCH-005 | Two-level concrete walk-out to pavilion | WIP modeled/blocked | Two levels and normal walking |
| RRCH-006 | Larger-than-life Guild Hall | Researched/modeled | Five-level complete building |
| RRCH-007 | 2 basements, 3 stories, dorms, 4 kitchens, halls/bar | Programmed/modeled | Independent room/capacity count |
| RRCH-008 | Specialist high-money guild bar | Researched/modeled | Full service/detail schedule |
| RRCH-009 | Blend library–pavilion–Guild and statues | Modeled with overlap risks | One non-overlap civic plan |
| RRCH-010 | Monumental grounds/pools/statues/fountain/memorial | Modeled with water risks | Containment/access/post-flow QA |
| RRCH-011 | Isolated library–Guild secret archive tunnel | Modeled/blocked | Dry route, vestibules, egress |
| RRCH-012 | Keep civilians out of Ravensgate volume | Offline separation PASS | Final-source/post-state proof |
| STAD-001 | Wider, extravagant stadium road | WIP modeled/blocked | Continuous grade/headroom/walk |
| STAD-002 | Billboards along road | Six modeled | Setback/readability/day-night media |
| STAD-003 | Seats face real screens, not doorway | Audit/design | Seat-level sightline matrix |
| STAD-004 | Make stadium easy to find | Partial plan | Decision-point wayfinding cameras |
| OASIS-001 | Midway Chicago-tollway-style oasis | Researched/modeled | Full access/service/rest routes |
| OASIS-002 | Original GTA V–evocative mini-bunker | Modeled/blocked | Dry original plan and egress |

### Westlight and westward districts

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| WL-001 | Coherent stadium-island destination | Designed/modeled | Aligned axes and walk |
| WL-002 | Intentional pier buildings | Designed/modeled | Program, doors, service, media |
| WL-003 | Original researched amusement pier | Researched/modeled | Complete midway/queue/egress |
| WL-004 | Ferris wheel and coaster | WIP coverage | Foundations, approaches, silhouettes |
| WL-005 | Steak and shrimp/seafood houses | Designed/modeled | Kitchen/service/dining proof |
| WL-006 | Align district/pier/stadium malls | Designed/modeled | One continuous centerline/walk |
| WL-007 | Contained crater lake, quay and green | Modeled, 1,443 water columns claimed | Basin/shore/flow/public-edge QA |
| WL-008 | Preserve accepted infinity screen | Accepted predecessor | No-conflict/sightline interface |
| WEST-001 | Facing original dry/water parks | Researched/partly modeled | Attraction completeness/hydrology |
| WEST-002 | West road and crater greenbelt | Designed/modeled | Road/greenway/crossing routes |
| WEST-003 | Hampton-influenced lakeside housing | Partial design | Parcel types/public shoreline |
| WEST-004 | Two dignified workforce projects/shared court | Two modeled | Units/common/route/media proof |

### Worker Town, data district, observatory and future city

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| WORK-001 | Steward mini-mansions/current cottage | Modeled/blocked at chest | Inventory-preserving redesign |
| WORK-002 | Non-graphic adult theater/cabaret | Clean implementation-ready plan | Generate and verify stage/168 seats/salons |
| WORK-003 | Theater high-end stairs/lifts | Clean implementation-ready plan | Pre-support, build and route-test |
| DATA-001 | Correct 24-slot DSM register; never claim 45 | Corrected control; machine evidence pending | 24 unique sourced/statused entries |
| DATA-002 | NOC, power/support, 48-bed dorms, aviation/logistics | Modeled/blocked | Independent room/capacity proof |
| DATA-003 | Separate 200-seat auditorium and cinema | Modeled claims | Independent counts/sightlines |
| DATA-004 | Normal DM10 + separate InfoBunker annex | Modeled claim | Object/bounds/program crosswalk |
| DATA-005 | Preserve/upgrade campus holdout home | Requested; survey pending | Protected parcel and full program |
| DATA-006 | Iowa Phase 0 roads/perimeters/outlines/billboards only | Researched/planned | Exact low-outline package |
| DATA-007 | 12 future Meta envelopes | Planned/unbuilt | Exactly 12 empty labeled outlines |
| DATA-008 | 6 fictional future Google envelopes | Planned/unbuilt | Exactly 6 empty labeled outlines |
| DATA-009 | 2 EdgeBCC four-quadrant envelopes | Planned/unbuilt | Correct name/count/empty outlines |
| DATA-010 | Future spine, two reserve parcels, terraced grade/water plan | Planned/unbuilt | Sections and water decision ledger |
| DATA-011 | Shared switching yard, 2 transmission corridors, 3 substations and utility reserve | Planned Phase 0 | Fictional topology, setbacks and exact collision QA |
| DATA-012 | Exactly 24 completed fictional DSM hall slots, with public status separate | Corrected target; coordinates/generation pending | 24 unique IDs and accepted post count |
| OBS-001 | Observatory owner mega-estate | Designed/modeled, blocked | Preserve function/views/routes |
| OBS-002 | Expanded owner safe room/shelter | Designed/modeled | Dry secure two-egress proof |
| OBS-003 | Eight fully inactive portal rooms | Modeled zero-active claim | Post census/NBT proof |
| OBS-004 | Owner wellness/pool/non-graphic private rooms | Partial design | Containment/privacy/egress |
| CITY-001 | Reserve future mini-city; do not excavate | Clean frozen reservation | No-excavation final model |
| CITY-002 | Founders’ Gallery sales office | Clean coordinate plan | Generate office only |
| CITY-003 | Future city plots/utilities/phases/sales inventory | Concept program | Future masterplan |
| ADULT-001 | Non-graphic/privacy/access/safety rule | Controlling | Apply to every adult-program object |

### Concord

| ID | Requirement | Current truth | Next proof |
|---|---|---|---|
| CONC-001 | Complete compact two-street service town, not outline-only | Researched/designed | Terrain survey, coordinates and exact package |
| CONC-002 | Ordinary gas/post/bar road frontage | Programmed | Complete enclosed/serviceable buildings |
| CONC-003 | Purpose-built consensual non-graphic worker nightlife economy | Controlling design | Access/privacy/acoustic/egress/media QA |
| CONC-004 | Exactly 25 motel rooms, 13 ground + 12 upper | Programmed | Independent room and route count |
| CONC-005 | 72-seat Annex + 3 five-seat + 2 single salons | Programmed | Stage-first sightlines, exact counts and isolation |
| CONC-006 | Separate non-graphic dance/strip-club venue | Programmed | Full public/BOH/service/egress proof |
| CONC-007 | Shift shuttle, lounge and late-night food | Programmed | Safe loading/walk/night route |
| CONC-008 | Motel/theater shared court and rear service lane | Programmed | Parking/pedestrian/service separation |
| CONC-009 | Two future entertainment parcels and utility/street stubs | Programmed | Protected empty parcels in map/DB |
| CONC-010 | Terraced terrain, drainage and network isolation | Programmed | Survey, fluid decision, no-intersection QA |

## 7. Delivery work breakdown and acceptance sequence

### Phase A — Freeze and reconcile

1. Freeze all object IDs, package boundaries and controlling requirements.
2. Reconcile:
   - the blocked steward chest;
   - B01 staff-lounge/greenway source mismatch;
   - C01 coordinate schedules;
   - the intentional 276-cell owner-estate gallery interface;
   - the 24-slot DSM register and physical target schedule; and
   - Phase 0/holdout parcel boundaries.
3. Assign every shared cell to exactly one model scope.
4. Take one fresh same-moment immutable world snapshot.

### Phase B — Final engineering and generation

5. Repeat fluid, six-face fluid-halo, gravity, block-entity, entity, protected
   feature and cross-package censuses.
6. Finalize road grades, terraced cuts/fills, water classification, access,
   egress, screens/sightlines, stairs/lifts, containment and cover.
7. Generate exact one-cell forward and exact inverse rollback operations.
8. Require:
   - zero missing snapshot cells;
   - zero unauthorized protected block-entity targets;
   - zero unreviewed cross-scope overrides;
   - zero unintended package overlap;
   - all gravity pockets pre-supported;
   - all water staged and contained; and
   - no Phase 0 completed halls.

### Phase C — Independent offline release decision

9. Run independent geometry/program QA.
10. Run strict source-state preflight.
11. Run forward and rollback parser dry runs with strict no-op handling.
12. Verify full rollback bijection and practical compensation order.
13. Issue one explicit release decision. Offline PASS does not authorize live
    work by itself.

### Phase D — Coordinated atomic release

14. Confirm live entities/players and active builders are clear.
15. Confirm fresh source identity still matches.
16. Execute one controlled transaction in fixed order with compensation rules.
17. Record every operation result and rollback guard.
18. Freeze the immutable post snapshot immediately.

### Phase E — Post-state acceptance

19. Verify exact post states and rollback states.
20. Run:
    - all road, walkway and tunnel routes in both directions;
    - every stair flight normally in both directions;
    - every lift stop/access route;
    - all stadium/auditorium/cinema/theater sightlines;
    - C01 cover and exterior concealment;
    - every contained-water neighbor/flow test;
    - data hall/rack/seat/bed/garage/parking/room counts; and
    - portal inactivity/network-isolation tests.
21. Capture all prescribed matched after images.
22. Import only accepted objects and relations into the database.

### Phase F — Documentation and publication

23. Generate the full-world overview and all detailed atlas sheets.
24. Generate floor plans and object/media crosswalk.
25. Produce database census/integrity/import reports.
26. Compile the all-session master HTML/PDF.
27. Prepare the exact Sites source, commit/push it, save a version, deploy and
    health-check production.
28. Upload the identical final manifest set to Box.
29. Verify every remote Box path, byte count and hash.
30. Issue one final acceptance and publication ledger.

## 8. Release gates

The final release cannot proceed until all of these are closed:

1. one authoritative scope and coordinate basis;
2. fresh immutable same-moment source;
3. zero unauthorized protected block-entity targets;
4. zero missing cells and zero unreviewed overrides;
5. exact rollback for every target;
6. closed geometry, water, cover, capacity, sightline, stair/lift, access,
   egress and no-intersection findings;
7. strict preflight and both parser dry runs;
8. live entity/player clearance;
9. atomic transaction and immutable post snapshot;
10. independent exact-state and route acceptance;
11. complete matched media;
12. database import/integrity and exact catalog;
13. verified PDF, Sites deployment and Box remote ledger.

Current position: gate 3 is failed by the WIP chest. Most later gates have not
run for a final integrated package.

## 9. Principal risks and control responses

| Risk | Severity | Control |
|---|---:|---|
| Protected steward chest targeted | Blocker | Route around it or approved inventory-preserving migration |
| Independent audit findings remain open | Blocker | Finding-by-finding final-source closure |
| Clean owner/theater plan has gravity cells and one intentional interface | High | Top-down pre-support; one-scope interface reconciliation |
| B01 staff-connection source mismatch | High | Same-moment rebase |
| B01 pool/support is source-model only | High | Final operation report and independent support/containment QA |
| Competing C01 schedules | High | One superseding schedule |
| Large active-water programs | High | Staged barriers, exact sources, post-flow census |
| 145 scopes / 2.3M targets | High | Explicit override ownership, fixed order, compensation proof |
| Seating may still face a wall/door | Medium | Seat-level ray/sightline matrix |
| Real/fictional precedents may be mistaken for copy instructions | Medium | Use principles/program only; original geometry and identity |
| 24-slot numbering may be misread as 45 facilities | High | Exact 24-entry status register; no range inference |
| Phase 0 outlines may be called completed halls | High | `PLANNED / PHASE 0 / UNBUILT` on maps, Sites, PDF and Box |
| Campus growth may erase holdout home | High | Protected parcel/access/privacy/view easements |
| Phase 0 power may conflict with people/water or be mistaken for real topology | High | Fictional high-level design, firebreak/setbacks and exact collision QA |
| Concord may be confused with Phase 0 or its adult uses become explicit/route-conflicted | High | Separate complete-build scope, ADULT-001, exact counts and route isolation |
| Interim Sites/Box records may be mistaken for closeout | Medium | Separate predecessor and expansion publication states |
| Adult design could drift graphic or unsafe | Medium | Apply ADULT-001 and non-graphic media review |

## 10. Final deliverable manifest

| ID | Deliverable | Planned location | Current state |
|---|---|---|---|
| DEL-001 | Human frozen-scope register | This file | Authored |
| DEL-002 | Machine frozen-scope register | `session-frozen-scope-register.json` | Authored |
| DEL-003 | Accepted post snapshot/hash | To be assigned | Pending release |
| DEL-004 | Atomic forward/rollback ledgers | To be assigned | Pending |
| DEL-005 | Independent post-state and route QA | To be assigned | Pending |
| DEL-006 | One-big-map and detailed atlas | `data/exports/box/town-expansion-post-…/` | Pending post-state |
| DEL-007 | Matched screenshot release | `data/exports/town-expansion-media-post-…/` | Pending post-state |
| DEL-008 | Database census/catalog/crosswalk | `data/exports/world-catalog-town-expansion-post-…/` | Pending import |
| DEL-009 | All-session PM HTML/PDF | `docs/redevelopment/2026-07-28-town-expansion/master-plan.*` | Pending final evidence |
| DEL-010 | Source-pinned Sites version | `world-showcase/` | Pending final evidence/deploy |
| DEL-011 | Box remote verification ledger | `box-upload-verification.json` | Pending upload |

## 11. Sites content plan

The existing production project remains the opaque project recorded in
`world-showcase/.openai/hosting.json`. At the prior audit, version 4 was healthy
at:

`https://mc-fleet-world-atlas.ianwalmsley.chatgpt.site`

That is predecessor state. The next version should expose:

| Route | Content |
|---|---|
| `/` | One-big-map overview, district cards and prominent Requested/Designed/Modeled/Accepted legend |
| `/map` | Full accepted object extent, routes, underground layers, parcels and cameras |
| `/districts/ravensreach` | Penthouse, longhouse/court, library, pavilion, Guild Hall and tunnels |
| `/districts/mainstreet` | Streets, attached garages, B01, staff link, warehouse and RV district |
| `/districts/c01` | Parking recovery, road/portal sections, room crosswalk and concealment proof |
| `/districts/stadium-road` | Parkway, billboards, oasis, mini-bunker and wayfinding |
| `/districts/westlight` | Venues/screens, piers, rides, restaurants, crater lake and quay |
| `/districts/westward` | Paired parks, greenbelt, housing and workforce projects |
| `/districts/data-campus` | 24-slot status register, functional programs, holdout home and logistics |
| `/districts/iowa-phase-0` | Planned/unbuilt Meta, Google, EdgeBCC, future-reserve terrain/water and fictional power-backbone plan |
| `/districts/concord` | Ordinary frontage, worker services, 25-room motel, 72-seat theater, separate dance venue, shared court and future parcels |
| `/districts/observatory` | Estate, safe room and inactive portal gallery |
| `/districts/worker-town` | Steward homes and Gilded Raven |
| `/districts/owner-underground` | Non-T2b corridor, suites, stairs/lifts, city reservation and sales office |
| `/objects/[id]` | Exact DB object, bounds, release, floor plans, screenshots, cameras and hashes |
| `/database` | Schema/census/integrity, accepted/superseded/proposed objects and media coverage |
| `/reports` | PM PDF, QA, research, manifests, change controls and Box ledger |

Sites rules:

- show evidence state and release ID on every object/page;
- never put Phase 0 envelopes in a “completed buildings” count;
- never put requested/modeled imagery in an “after” slider;
- use only exact database/media relations;
- keep adult-program content non-graphic;
- show size/SHA-256 for downloads;
- build both site and Worker bundle;
- push the exact source before saving a version; and
- deploy only the saved version and verify production HTTP/Worker outcome.

## 12. Box handoff plan

Prior read-only audit facts:

- connector reachability: PASS;
- automatic sync: disabled;
- last durable ledger completion:
  `2026-07-27T04:25:16.826Z`;
- representative July 28 remote directories found at audit: 0 of 4; and
- current July 28 handoff: `PENDING_SYNC`.

The final Box manifest needs one row per file:

| Required field | Meaning |
|---|---|
| `localPath` | Exact final local artifact |
| `localSha256` | SHA-256 of local bytes |
| `localBytes` | Local byte count |
| `artifactClass` | Map, screenshot, plan, database, report, PDF, QA, manifest or Sites source |
| `remoteFolderPath` | Exact Box folder |
| `remoteFileName` | Exact Box name |
| `boxFileId` | Opaque Box object ID |
| `remoteBytes` | Remote byte count |
| `remoteSha256` | Remote content hash and algorithm |
| `uploadedAtUtc` | Upload completion |
| `verifiedAtUtc` | Read-back verification |
| `verification` | PASS/MISSING/SIZE_MISMATCH/HASH_MISMATCH |

Required batches:

1. control/research documents;
2. accepted build and QA ledgers;
3. maps/floor plans/screenshots;
4. database census/catalog/import;
5. final HTML/PDF;
6. exact Sites source and saved/deployed version record.

Box closeout requires zero missing, size-mismatched, hash-mismatched or
unverified entries. Until that ledger exists, the correct phrase is
**Box pending**, never “moved to Box.”

## 13. Key artifact register

| Artifact | State | SHA-256 |
|---|---|---|
| `town-expansion-r1-wip2.report.json` | Blocked WIP | `04b1c2dffaac3396c94be5ea3fc30245e9665accabd341f12550515a46eda399` |
| `independent-release-geometry-safety-audit.json` | Blocked audit | `df394e349431a7c8f37aa499dd9f6e6c494fe5168a27aa009ae8ed190524fe0e` |
| `guild-hall-program.json` | Design source | `0752904fcf786b7c360829a2b3ee0632d0d3407f3f3594697d83af3e2f06a57d` |
| `mainstreet-attached-garage-engineering-schedule.json` | Non-executable engineering basis | `7035c22426e339ec8d18f0db508d66877c62bf2e3c91bca210dba708c17bd6cf` |
| `mainstreet-guest-services-rooftop-wellness-design-review.json` | Binding design/source model input | `906947db71eb1a3ecbcd805d7bd3b2817d66adfdcfa780c81654046fa4af3cf8` |
| `northeast-datacenter-c01-relocation-engineering.json` | Design only | `b57ed2c17e280f37d1c916528d363115753fb7273d88c089e59a85ee2bd5616b` |
| `westlight-three-venue-coordinate-schedule.json` | Venue audit/design | `fad103baf60f7cdcddf10fb84ac0f56c7a47fc59312315f34747f2cfc186c665` |
| `westward-paired-parks-masterplan.json` | Surveyed masterplan | `c3c12e0f53e5f8e8ceaed779c7f8afee34d41d4d1e56e6af1f651c16b72b97e5` |
| `modern-underground-corridor-standard.md` | Binding design standard | `8f327e5854783402b059f046e24db11bb1a97633dea31a04fd715fa87db97b66` |
| `worker-town-gilded-raven-theater-owner-tunnel-source-of-truth.md` | Implementation-ready design | `b9059d3dc55c593075bc1878f488bf2e6b94a9fd38714e265e0be7e093ec8fce` |
| `worker-town-gilded-raven-theater-owner-tunnel-coordinate-schedule.json` | Implementation-ready coordinates | `b793c29452728ef7afe9aeb55c5e619fcad5498175a09612d9fc91660a0daae0` |
| `worker-town-theater-owner-tunnel-survey.json` | Frozen selected survey | `20f49cd373f71f72552f6158e738a1f9766dbb18ef26f4a59c1f24a792970537` |
| `iowa-data-district-phase0-source-of-truth.md` | Binding Phase 0 planning brief | `c005a71d3e5c8536f4bcd4c7bdb03a7c0ce10575e4bac844ec2728c5e27e4bdb` |
| `concord-data-district-service-town-source-of-truth.md` | Binding complete-town design brief | `3cbcbb84c5ff15b9865150ad6fbb9b2d91f2658838b7e62c69388cd7dfd98161` |
| `box-handoff-audit.md` | Point-in-time Box audit | `ec0a6def615907e5a2f805d4edf33e2ab5e18866874e6a5e4e30b82cecd9c75f` |
| `external-publication-audit.json` | Point-in-time Sites/Box audit | `939f3af849ede6f8c99ac1f9987d7df00776de42ff64ff641180465e33d57388` |

The machine register contains the larger artifact manifest and exact evidence
state for each item.

## 14. Final PM handoff

The program is well beyond “a few buildings.” It is an integrated urban,
subsurface, campus, hospitality, entertainment, residential, evidence and
publication program. The design work is substantial, but tonight’s honest
handoff is:

1. the entire request set is now controlled and traceable;
2. major research/design and a very large offline WIP exist;
3. the current WIP is blocked and cannot be released;
4. the latest theater/owner-corridor/city work is cleanly surveyed and
   implementation-ready at coordinate level, but not generated;
5. B01 is implemented in source only, not in an accepted operation package;
6. DSM/Phase 0/holdout controls are still finishing and remain non-live;
7. no new town-expansion post-state, database import, matched after media,
   Sites version or Box verification exists yet; and
8. the release sequence above is the source of truth for finishing without
   losing the requested detail or fabricating completion.
