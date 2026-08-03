# July 28 World Program — Session PM Dossier

Document ID: `REDEV-2026-07-28-SESSION-PM-01`  
Date: 2026-07-28 UTC  
Prepared from: repository artifacts, immutable snapshot records, transaction
ledgers, QA reports, database ledgers, Sites records, and a read-only Box audit  
Current state: **LIVE DOCUMENT — R1 AND WAVE 2 ACCEPTED; TOWN EXPANSION
GENERATED OFFLINE; LIVE TRANSACTION BLOCKED; FINAL PDF/BOX CLOSEOUT PENDING**

## 1. Document control

### 1.1 Purpose

This dossier is the program-management review spine for all evidenced work
performed during the July 28 UTC operating window. It is designed to answer:

- what was requested;
- what was measured;
- what was designed;
- what was built;
- what was independently verified;
- what entered the database;
- what was published;
- what is locally staged for Box;
- what remains in progress;
- what evidence is required before the current town expansion may be called
  complete; and
- how every important claim can be traced to a machine artifact and hash.

It does not contain private model reasoning or reconstruct unrecorded
conversation. “All sessions” means all work sessions that left evidence in the
workspace, the accepted release records, the Sites project, or the configured
Box destination.

### 1.2 State vocabulary

Every package in this dossier uses one of the following states:

| State | Meaning |
|---|---|
| Requested | The owner asked for the outcome. No design claim is implied. |
| Surveyed | Existing conditions were measured from a named source. |
| Researched | External standards or precedents were reviewed. |
| Designed | A spatial/program response exists. |
| Generated | Forward/rollback or media artifacts exist offline. |
| Preflighted | Exact source guards and package contracts pass offline. |
| Committed | A live transaction ledger records success. |
| Verified | Independent post-state, rollback, movement, and evidence gates pass. |
| Imported | Accepted features/observations were atomically entered in the database. |
| Published | A saved Sites version is in production and healthy. |
| Box-verified | Remote paths and hashes match the final local handoff. |

No earlier state silently implies a later one.

### 1.3 Program boundaries

The dossier covers four July 28 sequences:

1. closeout and publication of accepted Redevelopment R1;
2. design, atomic delivery, and acceptance of Redevelopment Wave 2;
3. publication of Wave 2, diagnosis of the Sites Worker failure, and version 4
   runtime repair; and
4. the current Ravensreach/town-to-stadium expansion program.

The current expansion is deliberately open in this source. Its final
construction, screenshots, database import, atlas, PDF, Sites version, and Box
handoff must be appended from accepted evidence rather than anticipated.

## 2. Executive program summary

### 2.1 Accepted work entering this expansion

R1 and Wave 2 are accepted, distinct releases:

| Release | Physical scope | Acceptance | Database result | Publication |
|---|---|---|---|---|
| `REDEV-2026-07-27-R1` | Five coordinated packages: Raven Rock S1, C01 recessed portal, MainStreet R4/R5 garages/alleys, B02/B03 public realm, Westlight screen | 5/5 packages, 36,781 target cells, 22 routes / 44 directions, 91 post images, 7 maps | 824 features / 21 scans / 1,830 observations | Sites v1, then documentation rollup v2 |
| `REDEV-2026-07-28-R2` | Raven Rock T2b dry liner and MainStreet R08 cross-link | 2/2 packages, 887 explicit plus 2 reactive cells, 2 routes / 4 directions, 14 matched cameras | 875 features / 23 scans / 1,881 observations | Wave 2 Sites v3 failed at runtime; bundled Worker fix published as v4 |

Wave 2 also delivered 79 unique target-valid images: 55 building perspectives
and 24 circulation perspectives. All 69 registered buildings had an exact
screenshot and exact floor plan in the accepted Wave 2 catalog. These are
coverage facts at the Wave 2 boundary; the current expansion adds new objects
that must receive new database and media relations.

### 2.2 Current town-expansion objective

The current program is materially larger than a cosmetic pass. It combines:

- conversion of every residential garage to a true attached garage, with
  attached four-car or six-car garages for every large house;
- completion/redesign of the town building penthouse;
- replacement of the Amsterdam-style buildings with a period-compatible
  longhouse and designed courtyard;
- a fourfold library expansion;
- a two-level walk-out concrete terrace descending from the library to the
  pavilion;
- a researched Russian architectural reference for the civic pavilion/shared
  civic space, replacing glass-pavilion language while preserving the
  library–civic-space–Guild Hall connection;
- a monumental guild hall on the opposite pavilion edge;
- two guild-hall basements and three above-grade stories;
- dormitories, four kitchens, living spaces, theater, lecture hall, dance
  hall, and a researched guild bar;
- pavilion statuary and a more intentional civic ensemble;
- block-and-area infill so the town reads as coherent urban fabric;
- a wider, more ceremonial stadium road with billboards;
- a midway toll-road-style oasis;
- a GTA V–evocative but original mini-bunker at the oasis;
- a coherent Westlight stadium island with intentional pier buildings;
- a researched amusement pier with roller coaster and Ferris wheel;
- paired outer steak and shrimp/seafood houses;
- aligned main-district, pier, and stadium pedestrian malls/streets;
- a contained lake in the crater west of the stadium, edged by quay and green
  space;
- two researched, facing amusement parks west of Westlight: one dry park and
  one water park, informed by Adventureland/Adventure Bay and Worlds of
  Fun/Oceans of Fun without copying them;
- a westward approach-road extension integrated with the crater-lake green
  belt;
- a Hampton-style medium-density lakeside neighborhood with a continuous
  public-waterfront relationship;
- two connected affordable/distressed-housing projects southwest of
  Ravensreach, each centered on useful outdoor space;
- a direct Ravensreach-to-rear-MainStreet staff path and an employee lounge;
- final maps, floor plans, screenshots, object/media database relations, a
  detailed PM PDF, Sites publication, and verified Box handoff.

The governing design requirement is not “make every parcel denser.” It is
“make every arrival, edge, courtyard, threshold, and destination intelligible
while preserving authored work and normal walking.”

### 2.2.1 Controlling residential-garage change

The owner’s latest direction supersedes every earlier prospective
detached-garage rule:

- all residential garages must be attached to their parent houses;
- large houses must receive either four-car or six-car attached garages; and
- paving, a canopy, a wall, or a token connector does not count as attachment.

R1’s eighteen detached garage objects remain immutable historical evidence but
are now a required remediation scope. The affected source/generated/catalog
records and full acceptance contract are in
[`attached-garage-requirement-supersession.md`](attached-garage-requirement-supersession.md).
The current coordinate basis proposes attached envelopes for all 18 houses:
two six-car (`H01`, `H07`), four four-car (`H03`, `H08`, `H09`, `H10`), and
twelve attached two-car candidates whose non-large classification remains a
fresh-survey gate. It is design evidence, not an executable release.

### 2.2.2 Westlight and Russian-pavilion change

The second controlling change is recorded in
[`westlight-island-and-russian-pavilion-change-control.md`](westlight-island-and-russian-pavilion-change-control.md).
It does not restore the retired glass shell. It requires a newly researched
Russian architectural response within the civic composition, retaining:

`enlarged library ↔ civic pavilion/shared space ↔ monumental Guild Hall`.

It also expands Westlight from a road/stadium destination package into an
integrated island/waterfront program. All new pier, ride, restaurant, crater
water, quay, green-space, pedestrian, database, media, Sites, and Box claims
remain pending engineering and release.

### 2.2.3 Westward districts and workforce-link change

The third controlling change is recorded in
[`westward-entertainment-housing-workforce-change-control.md`](westward-entertainment-housing-workforce-change-control.md).
It requires an original paired dry-park/water-park district west of Westlight,
a westward road extension, crater-green-belt integration, medium-density
lakeside housing, two connected southwest-Ravensreach housing projects, and a
staff route to a rear MainStreet employee lounge.

The named parks are research precedents, not copy targets. “Affordable” and
“distressed” describe program/economic condition and do not relax safety,
completeness, dignity, route, room, evidence, or database standards. All
physical and publication claims remain pending.

### 2.3 Current publication and handoff state

Sites version 4 is current and healthy at:

`https://mc-fleet-world-atlas.ianwalmsley.chatgpt.site`

The root route returned HTTP 200 with Cloudflare Worker outcome `ok` after the
runtime fix. Access remains custom owner-only: one allowed user, no groups.

The Box connector is real and reachable, but the July 28 cloud handoff is not
complete. Automatic sync is disabled, the last durable ledger ends on July 27,
and representative Wave 2/current-expansion directories are absent remotely.
See [`box-handoff-audit.md`](box-handoff-audit.md).

### 2.4 Frozen expanded scope and current closeout control

Owner direction continued after the initial WBS cut in this source. Nothing in
the earlier summary narrows or supersedes that later scope. The binding
98-requirement ledger is
[`session-frozen-scope-register.md`](session-frozen-scope-register.md), with
machine-readable status in `session-frozen-scope-register.json`. It covers all
12 delivery families now represented in the canonical package and media
contract:

1. town core, completed penthouse, period longhouse, courtyard and infill;
2. civic pavilion, fourfold library, Guild Hall, bar and east civic grounds;
3. corrected C01 underground vehicle high bay, five levels, owner residence
   and private owner areas—never a stadium or ordinary hangar;
4. observatory mega-estate and inactive portal-room galleries;
5. Gilded Raven theater, modern private owner corridor and future owner-city
   reservation;
6. Westlight theaters, Russian-referenced pavilion, stadium island, pier,
   rides, restaurants, crater lake, parks and housing;
7. MainStreet attached garages, full parking, underground warehouse, guest
   services roof and workforce links;
8. tollway oasis, mini-bunker, RV sales/service campus and roadside program;
9. full Iowa data-center district: 12 DSM halls, six Google halls, two
   LightEdge halls, NOC/power/staff venues and separate InfoBunker annex;
10. Meta/Google/LightEdge expansions, Concord service town, pond, trails,
    shelters and disc-golf worker commons;
11. Concord Broadcast Exchange, nine-dish satellite pad and two complete
    soundstage annexes; and
12. five Manager Vale mini-mansion cottages with attached garages and complete
    room/furnishing schedules.

The adult-themed spaces in these families are non-graphic architectural
programs, but they are not empty labels. Their accepted design standard requires
real room hierarchy, circulation, beds, lounges, bars, stages, privacy
vestibules, storage, lighting, acoustic treatment, durable finishes, consent
and staff-safety cues, and furnished floor-plan evidence. See
[`non-graphic-adult-interior-design-standard.md`](non-graphic-adult-interior-design-standard.md).

The current canonical package is generated offline, not live:

| Control | Current evidence |
|---|---|
| Package | `town-expansion-r1-2026-07-28` |
| Compiler state | `COMMISSION_STAGE_READY_C01_RETIREMENT_AND_P01_RECOVERY_DEFERRED` |
| Forward hash | `a326d880dbdb4ff174a9c12e2be124272d7e1513c282508582749c3d3962975b` |
| Exact-object media contract | 340 objects / 589 stable shots / 1,178 paired captures |
| Map contract | 13 maps: one whole-world plus 12 delivery-family sheets |
| Requirements | 98 frozen requirements; none silently closed by generation |
| Live entity gate | Failed/blocked; no Town Expansion world mutation authorized |
| Transaction/post/media/database | Pending; final/as-built documentation prohibited |

The dedicated documentation profile prepares
`master-plan.draft.html`, `artifact-register.draft.md`, and
`requirements-status-matrix.draft.{json,md}`. Every page is labeled
`DRAFT — NOT AS-BUILT`; all 25 selected map/screenshot positions remain visible
pending placeholders until accepted post-state images exist. Final mode fails
before writing unless the committed transaction, distinct immutable post
snapshot, bound live-entity clearance, independent post QA, paired media QA,
atomic database import, read-only database census, and byte-exact hashes all
pass.

## 3. Evidence-based chronology

All timestamps are UTC.

| Time | Event | State and evidence |
|---|---|---|
| 2026-07-27 23:51:47–23:52:21 | R1 five-package coordinated transaction | Committed; `data/world-review/redevelopment-atomic-transaction-2026-07-27.json` |
| 2026-07-28 00:27:57–00:33:36 | R1 independent normal-walk QA | PASS; `data/world-review/redevelopment-route-qa-2026-07-27.json` |
| 2026-07-28 00:37:20 | R1 post-deployment verifier | PASS; five packages, 36,781 unique cells, 91 images |
| 2026-07-28 00:37:48 | R1 database import ledger finalized | +44 features, +3 scans, +44 observations |
| 2026-07-28 01:02:52 | Initial owner-only Sites release | Version 1 succeeded |
| 2026-07-28 01:03:42 | R1 artifact register finalized | Machine register and compiled dossier synchronized |
| 2026-07-28 01:04:42 | Sites source records publication | Version 2 source commit |
| 2026-07-28 01:52:00 | R1 release-manifest retrospective | Independent compatibility record |
| 2026-07-28, early | Wave 2 immutable engineering baseline frozen | `4fca1ff3…`; 26 regions / 122,744,700 bytes |
| 2026-07-28 02:10:29 | Wave 2 guarded manifest QA | Package target and guard contract reviewed |
| 2026-07-28 02:12:29 | Wave 2 release-manifest candidate QA | Combined transaction candidate evaluated |
| 2026-07-28 02:26:16 | All-package live entity gate | PASS |
| 2026-07-28 02:26:23–02:26:35 | Wave 2 two-package atomic transaction | Both packages committed; compensation not invoked |
| 2026-07-28 02:31:12 | Prerelease manifest QA | Same-moment source package accepted |
| 2026-07-28 02:32:39–02:33:46 | Wave 2 bidirectional route QA | 2 routes / 4 directions PASS |
| 2026-07-28 02:35:10 | Seven-sheet Wave 2 post atlas | Bound to immutable `d05ac782…` post snapshot |
| 2026-07-28 02:35:30 | Pre-database Wave 2 QA | Physical/media gates complete before import |
| 2026-07-28 02:41:10 | Wave 2 database import | 51/51 features; SQLite integrity `ok` |
| 2026-07-28 02:41:34 | Wave 2 integration-independent QA | PASS |
| 2026-07-28 02:41:40 | Final Wave 2 catalog report | Post snapshot/database/media catalog rebuilt |
| 2026-07-28 02:42:09 | Wave 2 independent post acceptance | `PASS — RELEASE ACCEPTED`; 8/8 gates |
| 2026-07-28 02:43:39 | Wave 2 artifact register | 356 files / 45,624,708 bytes / 214 images |
| 2026-07-28 02:43:41 | Wave 2 master PDF | 3,490,574 bytes; SHA-256 `d26d810d…` |
| 2026-07-28 02:46:59 | Sites Wave 2 source commit | Commit `316903cb…`, saved as version 3 |
| 2026-07-28 02:54:31 | Production Worker exception | Error 1101, Ray `a2209982e8a31497` |
| 2026-07-28 03:00:31 | Sites Worker bundle repair commit | Commit `7777e205…`, saved/deployed as version 4 |
| 2026-07-28 03:02:56 | Sites project updated | Current version 4 |
| 2026-07-28 03:03:26 | Post-fix production request | `/` HTTP 200, outcome `ok`, Ray `a220a6915909f4e6` |
| 2026-07-28 03:06:25–03:06:31 | Current town-expansion baseline graphics and atlas | Survey/evidence state only; construction acceptance not implied |
| 2026-07-28 03:08:35 | Box/Sites read-only publication audit | Box connection PASS; current July 28 handoff `PENDING_SYNC` |

## 4. Work breakdown structure

### 4.1 Completed/accepted predecessor work

| WBS | Package | Deliverable | State |
|---|---|---|---|
| 1.1 | R1 atomic release | Five exact-state packages plus rollback | Verified |
| 1.2 | R1 movement | 22 routes / 44 directions | Verified |
| 1.3 | R1 media | 91 post screenshots / 7 maps | Verified |
| 1.4 | R1 database | 44 features, 3 scans, 44 observations | Imported |
| 1.5 | R1 publication | Sites v1/v2 | Published |
| 2.1 | Wave 2 tunnel | `INF-RR-02` T2b dry-liner pilot | Verified |
| 2.2 | Wave 2 MainStreet | R08 east-west cross-link | Verified |
| 2.3 | Wave 2 exact-object media | 79 images, 69/69 building coverage | Verified |
| 2.4 | Wave 2 database | 51 features, 2 scans, 51 observations | Imported |
| 2.5 | Wave 2 publication | Sites v3 content and v4 runtime repair | Published |

### 4.2 Current expansion work packages

#### WBS 3 — Survey, controls, and master planning

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 3.1 | Freeze expansion baseline | Immutable saved-world path/hash, region count, bytes | Independent hash match |
| 3.2 | Town cadastral survey | Existing buildings, parcel gaps, doors, grades, views, protected bounds | Complete feature/obstruction register |
| 3.3 | Corridor survey | Town-to-stadium path, widths, grades, landmarks, conflicts | Stationed route plan |
| 3.4 | Spatial master plan | Pavilion civic ensemble, town blocks, road, oasis, bunker | One coordinated map with envelopes |
| 3.5 | Package interface control | Unique cells, shared edges, construction order | Zero target overlap and explicit dependencies |

#### WBS 4 — Penthouse completion

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 4.1 | Existing penthouse audit | Shell, stair/elevator arrival, usable headroom, views, unfinished faces | Before census and images |
| 4.2 | Redesign | Room schedule, circulation, roofline, terrace, service core | Reviewed plan/elevations |
| 4.3 | Construction | Exact forward/rollback package | Installed-state PASS |
| 4.4 | Experience QA | Normal walking, arrival clarity, room access | Both directions / all rooms |
| 4.5 | Media/database | Floor plan, exterior/interior captures, exact object relation | Imported and hash-verified |

#### WBS 5 — Longhouse and courtyard replacement

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 5.1 | Amsterdam-building identity audit | Exact objects to replace, protected contents, salvage concerns | Explicit owner/object register |
| 5.2 | Period design | Longhouse massing, structure, roof, hearth, service, entries | Fits adjacent town vocabulary |
| 5.3 | Courtyard design | Enclosure, drainage, paving, planting, lighting, desire lines | Readable civic/semiprivate edge |
| 5.4 | Replacement transaction | Removal/install with exact recovery package | Source/desired/rollback bijection |
| 5.5 | Post QA | No floating fabric, no blocked doors, route clarity | Independent PASS |

The replacement must not be described as “Amsterdam removed” until the exact
objects and their protected contents are identified and the post snapshot
proves the accepted replacement.

#### WBS 6 — Library expansion and pavilion terrace

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 6.1 | Library program | Fourfold gross-area target, collections, reading, staff, service, stairs | Measured area schedule |
| 6.2 | Vertical circulation | Public stair, accessible-feeling alternate route within Minecraft constraints, egress redundancy | Bidirectional all-level QA |
| 6.3 | Two-level terrace | Concrete walk-out levels, rails, landings, stairs/ramps to pavilion | Continuous walk and fall-edge audit |
| 6.4 | Pavilion interface | Door/axis alignment, terrace landing, event spill-out | Clear threshold and sightline |
| 6.5 | Media/database | Every new level and terrace relation | Floor plans and exact captures |

“Four times as big” must be resolved by measured baseline and accepted
post-construction gross floor area, not visual impression.

#### WBS 7 — Pavilion civic ensemble

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 7.1 | Pavilion audit | Current geometry, retired glass-shell history, Garth/loggia/stoa, views, entries | Existing-condition plan |
| 7.2 | Russian-reference research | Coherent selected lineage, authoritative sources, rejected alternatives | Cited research/selection brief |
| 7.3 | Architectural response | Original Russian-referenced pavilion/civic composition; no glass-box reading | Plans, elevations, sections |
| 7.4 | Statuary | More statues with plinths, hierarchy, view corridors | No route obstruction |
| 7.5 | Ensemble composition | Library–civic pavilion/space–Guild Hall axis | Legible from all approaches |
| 7.6 | Event use | Gathering, performance, procession, spill-out | Capacity and circulation test |
| 7.7 | Night identity | Lighting hierarchy without visual noise | Night capture and route PASS |

#### WBS 8 — Monumental guild hall

The guild hall is a five-level civic/institutional complex: two basements and
three above-grade stories. “Over the top” is interpreted as expensive
craftsmanship, generous rooms, ceremonial sequence, layered materials, and
excellent operations—not random detail density.

| WBS | Level/zone | Minimum programmed spaces |
|---|---|---|
| 8.1 | Basement 2 | Deep stores, secure archive/treasury, mechanical/service, protected refuge, staff circulation |
| 8.2 | Basement 1 | Production kitchen, beverage cellar, receiving, green room, rehearsal/support, back-of-house |
| 8.3 | Ground | Ceremonial lobby, guild bar, great hall, theater arrival, public kitchens/service |
| 8.4 | Level 2 | Lecture hall, meeting rooms, guild offices, living rooms, additional kitchens |
| 8.5 | Level 3 | Dormitories, lounges, bathing/support spaces, private dining, dance-hall overlook or event support |
| 8.6 | Vertical core | Grand public stair, service route, basement route, secondary egress | All routes normal-walk PASS |
| 8.7 | Pavilion connection | Direct, obvious, weather-protected-feeling threshold | Pavilion-to-hall route PASS |
| 8.8 | Evidence | Five level plans, sections, exterior/interior images, database object tree | Exact relation coverage |

Program minimums:

- two basement levels;
- three above-grade stories;
- dormitories;
- four distinct kitchens with assigned roles;
- multiple living/lounge spaces;
- theater;
- lecture hall;
- dance hall; and
- guild bar.

The four kitchens should not be four decorative counters. A defensible split
is banquet/production, restaurant/bar, teaching/demonstration, and
residential/dormitory. Each needs a purpose, adjacencies, storage, and service
route.

#### WBS 9 — Guild bar specialist package

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 9.1 | Precedent research | Guild halls, grand hotel bars, club rooms, beer halls, institutional hospitality | Cited design brief |
| 9.2 | Guest sequence | Pavilion/guild entry, reception, bar reveal, seating choices, event overflow | Sightline diagram |
| 9.3 | Bar operations | Backbar, taps, wells, glass/storage, cellar link, wash/service, staff route | Functional plan |
| 9.4 | Social zoning | Main rail, booths, standing room, fireplace/club seating, private room, performance edge | Capacity/adjacency schedule |
| 9.5 | Material identity | Premium timber, stone, metal, lighting, guild heraldry | Palette and detail sheet |
| 9.6 | QA | Counter access, clear aisles, no decorative blockage, bar-to-kitchen/cellar route | Normal-walk PASS |

The bar research and engineering package must be a named subpackage, not a
paragraph buried in the guild-hall report.

#### WBS 10 — Town block and courtyard infill

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 10.1 | Figure-ground study | Building fronts, backs, gaps, courts, streets, paths | Existing/proposed diagram |
| 10.2 | Block structure | Coherent edges and address hierarchy | Every principal door has an address/route |
| 10.3 | Infill kit | Walls, gardens, workshops, sheds, small houses, service courts as appropriate | No filler without purpose |
| 10.4 | Corner legibility | Landmarks and framed views | Decision-point sightline QA |
| 10.5 | Wayfinding | Signs/markers only where spatial form does not suffice | No sign clutter |
| 10.6 | Residential garage remediation | Attach all 18 known R1 garage objects to parent houses; classify large houses | 100% attached; large houses have 4 or 6 clear bays |
| 10.7 | Garage circulation | Interior house-to-garage and garage-to-road routes | Both directions per relationship |
| 10.8 | Garage evidence/database | Same-camera relationship captures and current feature geometry/status | Exact relations refreshed |

#### WBS 11 — Stadium ceremonial boulevard

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 11.1 | Existing-road survey | Width, grade, crossings, pinch points, protected assets | Station schedule |
| 11.2 | Boulevard design | Wider road, edge treatment, lighting, procession rhythm | Continuous route |
| 11.3 | Billboard program | Siting, spacing, message hierarchy, night legibility | No sightline/clearance conflicts |
| 11.4 | Destination reveal | Stadium legibility before final arrival | Fixed-camera sightline proof |
| 11.5 | Movement QA | Town ↔ stadium in both directions | No dig, tower, flight, forced jump |

#### WBS 12 — Midway oasis

The requested precedent is the Chicago-area tollway oasis: a legible midway
stop integrated with the route rather than an isolated roadside object.

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 12.1 | Station selection | Approximately halfway by route distance/travel time | Surveyed chainage |
| 12.2 | Access | Safe deceleration/turn-in, entry, exit, pedestrian path | Both directions |
| 12.3 | Program | Food/rest, overlook, services, signage, parking or lay-by equivalent | Program schedule |
| 12.4 | Landscape | Oasis identity, shade, water/planting if safe, night beacon | Day/night images |
| 12.5 | Town/stadium continuity | Oasis strengthens, not interrupts, route story | Corridor map |

#### WBS 13 — Oasis mini-bunker

The bunker may evoke the planning fantasy and cinematic identity associated
with GTA V facilities, but it must be an original design. It must not copy a
protected game asset or confuse above-grade roadside hospitality with secure
underground circulation.

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 13.1 | Concept research | Hidden facility precedents, secure arrival, original game-inspired mood | Cited brief |
| 13.2 | Concealment | Surface cover, screened entry, no exposed concrete shell | Section/census proof |
| 13.3 | Internal program | Security, operations, storage, service, emergency egress, small briefing/social spaces | Room schedule |
| 13.4 | Circulation | Primary and secondary routes, stairs/landings/headroom | Bidirectional route PASS |
| 13.5 | Safety | Fluids, gravity, block entities, inventories, terrain cover, entity gates | Independent PASS |
| 13.6 | Evidence/database | Surface, entry, section, level plans, interiors, exact object links | Complete relation set |

#### WBS WL — Westlight stadium-island coherence

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| WL.1 | Island/shore/crater survey | Figure-ground, shoreline, grade/water, protected objects, routes, sightlines | Complete measured base |
| WL.2 | District alignment | Main Mall, Pier Mall, stadium streets, quay walk, service street | One legible address/axis system |
| WL.3 | Intentional pier buildings | Water-building register, piles/decks/wharves, land/water access, sections | 100% structurally/route legible |
| WL.4 | Amusement-pier research | Authoritative sources, comparisons, selected/rejected layouts | Cited research paper |
| WL.5 | Ferris wheel | Wheel, support, hub, loading, clearance, lighting | Geometry/clearance/route PASS |
| WL.6 | Roller coaster | Station, lift/crest/turn sequence, supports, maintenance/queue | Geometry/clearance/route PASS |
| WL.7 | Paired dining houses | Outer steak house and shrimp/seafood house | Complete operations and exact media |
| WL.8 | Crater lake | Closed basin, water datum/volume, neighbor-fluid model | Zero leaks/unplanned flooding |
| WL.9 | Quay/green space | Hard/soft edge hierarchy and continuous green loop | Bidirectional loop and edge QA |
| WL.10 | Stadium protection | Screen/stage/sports modes and arrival views | Sightline matrix PASS |
| WL.11 | Release/publication | Ops/rollback, QA, DB, media, atlas, dossier, Sites, Box | All final gates PASS |

#### WBS WD — Westward entertainment, housing, and workforce links

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| WD.1 | Paired-park research | Cited Adventureland/Adventure Bay and Worlds of Fun/Oceans of Fun comparison; selected original concept and rejected options | Source/reasoning matrix complete |
| WD.2 | Paired-park master plan | Facing gates, shared arrival, separate guest/service/emergency systems | Coherent pair; no copied branded forms |
| WD.3 | Dry amusement park | Gate, family/thrill zones, rides, food, service, return routes | Program/clearance/routes PASS |
| WD.4 | Water park | Gate/support, splash/pool/slide zones, food/service, contained water | Program/fluid/clearance/routes PASS |
| WD.5 | Westward approach | Stationed road, crossings, destination decisions, greenway/service logic | All required directions PASS |
| WD.6 | Crater-green-belt integration | Continuous public lake loop connected to stadium, pier, parks and housing | No severance or privatized edge |
| WD.7 | Hampton-style lakeside housing | Design code, medium-density blocks, public edge, attached garages | Character/density/access/garage gates PASS |
| WD.8 | Southwest housing projects | Two distinct connected projects with programmed central outdoor spaces | Dignity/completeness/routes PASS |
| WD.9 | Staff path | Ravensreach ↔ rear MainStreet station/grade/headroom route | Both directions normal-walk PASS |
| WD.10 | Employee lounge | Room/operations/adjacency plan at rear staff entrance | Complete and unobstructed |
| WD.11 | Evidence/database | Maps, plans, exact captures, object/room/route/media relations | Integrity/FK/hash/decode PASS |
| WD.12 | Release/publication | Ops/rollback, QA, catalog, dossier, Sites and Box | All final gates PASS |

#### WBS 14 — Release, publication, and handoff

| WBS | Scope | Required output | Acceptance |
|---|---|---|---|
| 14.1 | Atomic release | Fixed order, exact guards, reverse-order compensation | Durable committed ledger |
| 14.2 | Post snapshot | New immutable region copy | Aggregate hash and changed-state proof |
| 14.3 | Independent QA | Installed, rollback, route, camera, database contracts | All gates PASS |
| 14.4 | Database import | New features/scans/observations | Integrity `ok`, FK 0, backup recorded |
| 14.5 | Atlas/catalog | New maps, floor plans, exact-object media | Complete target coverage |
| 14.6 | PM dossier | HTML/PDF plus machine register | Hash synchronized |
| 14.7 | Sites | Source commit, saved version, owner-only deployment, runtime logs | `/` 200 / Worker `ok` |
| 14.8 | Box | Sync report and remote SHA-1 comparison | Zero failed/skipped, all current |

## 5. Requirements traceability matrix

| ID | Owner requirement | Work package | Completion evidence | Current state |
|---|---|---|---|---|
| PEN-01 | Recheck, redesign, and finish penthouse | WBS 4 | Before/post plans, ops, QA, images, DB | In progress |
| LNG-01 | Replace Amsterdam buildings with period longhouse | WBS 5 | Object register, guarded replacement, post QA | In progress |
| CRT-01 | Do courtyard work | WBS 5, 10 | Courtyard plan, route/sightline QA | In progress |
| LIB-01 | Make library 4× as big | WBS 6 | Baseline/post GFA schedule | In progress |
| LIB-02 | Two-floor concrete walk-out terrace to pavilion | WBS 6 | Sections, routes, captures | In progress |
| GHD-01 | Pavilion connects library and guild hall | WBS 7, 8 | Axis plan and route QA | In progress |
| GHD-02 | Larger-than-life guild hall | WBS 8 | Five-level plans, room schedule, evidence | In progress |
| GHD-03 | Two basements / three stories | WBS 8 | Level census and section | In progress |
| GHD-04 | Dorms, 4 kitchens, living, theater, lecture, dance | WBS 8 | Room/adjacency register | In progress |
| BAR-01 | Specialist guild bar research/plan/build | WBS 9 | Cited brief, ops plan, route QA | In progress |
| PAV-01 | More pavilion statues | WBS 7 | Statuary plan, clearance QA | In progress |
| PAV-02 | Russian architectural reference replaces glass-pavilion language | WBS 7 | Cited selection, plans/elevations, no glass-box reading | New controlling requirement |
| PAV-03 | Library–civic space–Guild Hall connection retained | WBS 6–8 | Axis plan and bidirectional route | New controlling requirement |
| TOWN-01 | Fill gaps so town reads in blocks/areas | WBS 10 | Figure-ground and address map | In progress |
| GAR-01 | Every residential garage is attached | WBS 10.6–10.8 | Post geometry, interior connection, routes, cameras | New controlling requirement |
| GAR-02 | Large houses have 4-car or 6-car attached garages | WBS 10.6–10.8 | House-size/capacity schedule and clear bay census | New controlling requirement |
| RD-01 | Bigger, ceremonial stadium road | WBS 11 | Stationed road plan and route QA | In progress |
| RD-02 | Billboards along road | WBS 11 | Billboard register and sightline proof | In progress |
| OAS-01 | Midway Chicago-tollway-style oasis | WBS 12 | Halfway calculation, plan, images | In progress |
| BKR-01 | Original GTA V–evocative mini-bunker | WBS 13 | Research, plans, concealment/route QA | In progress |
| WL-01 | Coherent Westlight stadium island | WBS WL | Island master plan and post QA | New controlling requirement |
| WL-02 | Water buildings become intentional pier buildings | WBS WL.3 | Register, structures, sections, routes | New controlling requirement |
| WL-03 | Researched amusement pier with coaster/Ferris wheel | WBS WL.4–WL.6 | Research, geometry, clearance, images | New controlling requirement |
| WL-04 | Paired outer steak/shrimp houses | WBS WL.7 | Plans, operations, routes, exact media | New controlling requirement |
| WL-05 | Align main/pier/stadium malls and streets | WBS WL.2 | Axis/address/route plan | New controlling requirement |
| WL-06 | Water-filled west crater with quay/green edge | WBS WL.8–WL.9 | Containment, hydrology, loop QA | New controlling requirement |
| WDP-01 | Facing researched dry and water parks west of Westlight | WBS WD.1–WD.4 | Research, original master plan, programs, clearances and routes | New controlling requirement |
| WDP-02 | Extend Westlight approach road west | WBS WD.5 | Station/grade/decision/crossing plan and route QA | New controlling requirement |
| WDP-03 | Integrate parks/road with crater-lake green belt | WBS WD.6 | Continuous-loop and safe-crossing evidence | New controlling requirement |
| LKH-01 | Hampton-style medium-density lakeside housing | WBS WD.7 | Design code, block/address plan, public edge, exact media | New controlling requirement |
| RHA-01 | Two connected southwest-Ravensreach affordable/distressed projects | WBS WD.8 | Project plans, central spaces, dignity and route QA | New controlling requirement |
| STF-01 | Staff path from Ravensreach to rear MainStreet main building | WBS WD.9 | Station/headroom/protected-intersection and bidirectional route | New controlling requirement |
| STF-02 | Employee lounge at staff destination | WBS WD.10 | Room/operations plan, transaction, routes and exact media | New controlling requirement |
| DOC-01 | Verify all PDFs/screenshots/materials | WBS 14 | Artifact register, file QA, hashes | Pending final artifacts |
| BOX-01 | Move final material to Box | WBS 14 | Sync ledger and remote SHA-1 match | Pending |
| DOC-02 | Detailed PM-style PDF for all July 28 sessions | WBS 14 | Final PDF/hash/Box/Sites record | Source in progress |

## 6. Baseline, release, and database identity ledger

### 6.1 Saved-world identities

| State | Directory | Aggregate SHA-256 | Files / bytes |
|---|---|---|---|
| R1 prerelease | `data/worldsnap-prerelease2-42545b02f60fa881-20260727/region` | `42545b02f60fa881cb3d7fb82f2b22b1145623fa16e8c674a179113b48c639cf` | See R1 release ledger |
| R1 accepted post / Wave 2 engineering baseline | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` | 26 / 122,744,700 |
| Wave 2 prerelease | `data/worldsnap-wave2-prerelease-b1356bca9fcbdc7a-20260728/region` | `b1356bca9fcbdc7a90b580b2f9210947788d74716e1a706f5e8f0d0f789dbb27` | 26 / 123,279,631 |
| Wave 2 accepted post | `data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region` | `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999` | 26 / 123,313,802 |
| Town expansion baseline | Must be frozen and named by the current release team | **Pending** | **Pending** |
| Town expansion post | Must be captured only after committed release | **Pending** | **Pending** |

The mutable `data/worldsnap/region` directory is not an acceptable release
identity.

### 6.2 Database identities

| Boundary | Features | Scans | Observations | SHA-256 |
|---|---:|---:|---:|---|
| Before R1 import | 780 | 18 | 1,786 | `2eb3fcf5c8103392f89f9f00e013e5b2ff773b7092cfa47c4e72d0375fa3f8c7` backup |
| Accepted R1 | 824 | 21 | 1,830 | `005a714f90e1fc12a42de825b84290d07a9a090d0580b7112b277158e942123d` |
| Accepted Wave 2 | 875 | 23 | 1,881 | `1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503` |
| Town expansion pre-import | Must equal the accepted starting boundary or explain later changes | Pending | Pending | Pending |
| Town expansion accepted post-import | New object count plus exact relations | Pending | Pending | Pending |

Wave 2’s pre-import recovery database is
`data/backups/world-map-wave2-preimport-20260728T024110Z.db`, SHA-256
`a9af19a2823464a6a190f53283ae4d0215e49d44a6481a3b2fe0a80b455cef06`.

The live database may have WAL activity. Final identity must come from a
checkpointed/import ledger and an independent read-only verifier, not an
opportunistic hash while services are writing.

## 7. Accepted QA results

### 7.1 R1

| Gate | Result |
|---|---|
| Packages | 5 / 5 PASS |
| Guarded operations | 7,265 |
| Unique target cells | 36,781 |
| Cross-package overlaps | 0 |
| Rollback guards | 7,265 matched |
| Routes | 22 / 22 |
| Directions | 44 / 44 |
| Post images | 91 |
| Post atlas | 7 maps |
| Database import | 44 / 44 features |

Machine source:
`data/world-review/redevelopment-post-deployment-qa-2026-07-27.json`.

### 7.2 Wave 2

| Gate | Result |
|---|---|
| Packages | 2 / 2 PASS |
| Explicit target cells | 887 / 887 |
| Reactive cells | 2 / 2 |
| Rollback | 887 guards/restorations |
| Guarded sign commands | 4 / 4 |
| Routes | 2 / 2 |
| Directions | 4 / 4 |
| Matched post cameras | 14 / 14 |
| Exact-object media | 79 / 79 |
| Building exact screenshot coverage | 69 / 69 |
| Building exact floor-plan coverage | 69 / 69 |
| Database import | 51 / 51 |
| Final gates | 8 / 8 |

Machine source:
`data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json`.

### 7.3 Town expansion mandatory QA

No town-expansion package may inherit R1/Wave 2 acceptance. It must pass:

1. immutable baseline identity;
2. complete target-cell and block-property census;
3. unique target cells inside and across packages;
4. source/desired/rollback bijection;
5. block-entity, inventory, fluid, gravity, waterlogging, support, and entity
   exclusions;
6. protected existing-feature intersection checks;
7. approved demolition/replacement register;
8. fixed all-package operation order;
9. strict-noop forward preflight;
10. strict-noop rollback parser/preflight;
11. live entity/player clearance;
12. committed transaction with zero unexplained no-ops;
13. immutable post snapshot;
14. installed-state and exact rollback proof;
15. normal-walk route tests in both directions;
16. fixed-camera before/after evidence;
17. database backup/import/integrity/FK proof;
18. final atlas/catalog/media relation coverage;
19. final dossier file/hash validation;
20. healthy owner-only Sites release; and
21. Box sync plus remote SHA-1 verification.

## 8. Design and release decisions

### 8.1 Decisions retained from Wave 2

- Raven Rock T2b stopped at x `-136`; the prescribed x `-135` terminal was
  rejected because immutable inspection found an active wet boundary.
- The T2b repair is an addition-only route liner within a cavern, not a full
  cave fill.
- MainStreet R08 repaired a specific missing east-west cross-link rather than
  relocating protected homes or replaying R1.
- Neighbor-reactive fence states were modeled explicitly instead of weakening
  exact guards.
- The transaction ledger remains append-only at
  `committed-pending-post-qa`; final acceptance comes from the separate post
  verifier.
- Building media coverage and matched release cameras are separate evidence
  sets with different snapshot bindings.

### 8.2 Decisions governing the town expansion

- The pavilion becomes the civic hinge: library on one side, monumental guild
  hall on the other.
- The new pavilion/shared civic composition uses a selected, researched
  Russian architectural lineage. The retired glass shell remains historical
  and is not replayed.
- The library’s “4×” target is quantitative and must be shown in an area
  schedule.
- The guild hall is five levels, with operations and circulation designed
  before decorative density.
- The bar is a dedicated researched work package.
- Courtyards and infill must create blocks, addresses, and thresholds—not fill
  every empty cell.
- The stadium road is a corridor project with stations, grades, landmark
  rhythm, and movement QA.
- The oasis is selected by measured midway position, not by choosing a vacant
  parcel first.
- The mini-bunker must be original, concealed, and independently traversable.
- Existing Amsterdam-style objects are not removed until their exact object
  IDs, contents, and recovery contract are known.
- Detached residential garages are prohibited. R1’s `R4-GAR-H01..H12` and
  `R4-GAR-C02..C07` objects must be attached through a separately guarded
  retrofit; large parents receive four or six clear attached bays.
- No package may claim “finished” because a screenshot looks good.
- Westlight is treated as one island/waterfront district: stadium, main area,
  pier, restaurants, crater lake, quay, green space, streets, and pedestrian
  malls share one master plan.
- The westward dry and water parks form an original facing pair based on
  research lessons, not copied park branding or layouts.
- The westward road and new parcels must preserve and strengthen the continuous
  crater-lake green belt.
- Lakeside housing is medium-density and may not privatize the entire water
  edge; the current attached-garage change also controls it.
- Southwest Ravensreach housing is judged for dignity, completeness, central
  outdoor-space quality, and connected routes—not decorative deterioration.
- The staff path is a measured operational route ending at a complete employee
  lounge, not an informal desire line.

## 9. Interface and dependency plan

### 9.1 Critical path

```text
baseline freeze
  → cadastral/corridor survey
  → coordinated master plan and protected envelopes
  → package generators and rollback
  → cross-package integration audit
  → same-moment prerelease snapshot/entity gate
  → fixed-order atomic release
  → immutable post snapshot
  → installed/rollback/route/camera QA
  → database import
  → atlas/catalog/dossier
  → Sites saved version and production health
  → Box sync and remote hash verification
```

### 9.2 Principal spatial interfaces

| Interface | Owning packages | Required contract |
|---|---|---|
| Library ↔ pavilion | WBS 6/7 | Shared terrace landing, no duplicate cells |
| Pavilion ↔ guild hall | WBS 7/8 | Shared ceremonial axis and accessible-feeling route |
| Guild hall ↔ bar/kitchens | WBS 8/9 | Back-of-house route and cellar/service adjacency |
| Longhouse ↔ courtyard/infill | WBS 5/10 | Address, service edge, drainage/grade |
| Town ↔ boulevard | WBS 10/11 | Legible departure/arrival threshold |
| Boulevard ↔ oasis | WBS 11/12 | Safe entry/exit and uninterrupted main route |
| Oasis ↔ mini-bunker | WBS 12/13 | Concealed secure interface without confusing public circulation |
| Stadium ↔ main district ↔ amusement pier | WBS WL | Shared axes, malls/streets, addresses and sightline protection |
| Pier buildings ↔ water/quay | WBS WL.3/WL.8/WL.9 | Structural waterline and continuous public/service routes |
| Crater lake ↔ quay/green loop | WBS WL.8/WL.9 | Contained hydrology and continuous safe edge |
| Westlight island ↔ stadium boulevard/oasis | WBS 11/12/WL | One legible arrival sequence |
| Stadium/island ↔ westward approach ↔ paired parks | WBS 11/WL/WD.1–WD.5 | Shared hierarchy, decision points, crossings and protected sightlines |
| Crater lake ↔ green belt ↔ lakeside housing | WBS WL.8/WL.9/WD.6/WD.7 | Continuous public edge, safe grade/water interface, no privatization |
| Lakeside housing ↔ attached-garage program | WBS WD.7/10.6–10.8 | Continuous parent fabric, interior route, correct 4/6-bay large-house capacity |
| Southwest projects A ↔ B ↔ Ravensreach | WBS WD.8 | Complete addresses, central spaces and bidirectional normal-walk routes |
| Ravensreach ↔ staff path ↔ rear MainStreet lounge | WBS WD.9/WD.10 | Protected operational route and unobstructed back-of-house connection |
| All packages ↔ database/media | WBS 14 | Stable external IDs and exact relations |

## 10. Risk register

Likelihood and impact use 1–5 scales; score is their product.

| ID | Risk | L | I | Score | Response / stop condition |
|---|---|---:|---:|---:|---|
| RSK-T01 | Packages overlap at pavilion/library/guild edges | 4 | 5 | 20 | One interface-control map; zero duplicate target cells |
| RSK-T02 | Longhouse demolition destroys protected contents | 3 | 5 | 15 | Inventory/block-entity census and explicit salvage/recovery |
| RSK-T03 | Library is visually larger but not 4× | 4 | 3 | 12 | Baseline/post gross-area schedule |
| RSK-T04 | Terrace has falls, awkward stairs, or blocked walking | 4 | 4 | 16 | Rail/landing/headroom audit plus both-direction walk |
| RSK-T05 | Guild program fits on paper but circulation fails | 4 | 5 | 20 | Adjacency model, cores first, room-by-room route tests |
| RSK-T06 | Four “kitchens” are decorative duplicates | 3 | 3 | 9 | Assign operational roles, storage, service and equipment |
| RSK-T07 | Over-detail makes bar unusable | 4 | 3 | 12 | Protect rail, aisles, staff route, seating clearances |
| RSK-T08 | Pavilion statues obstruct civic/event routes | 3 | 4 | 12 | View/clearance envelope before placement |
| RSK-T09 | Infill produces clutter rather than block structure | 4 | 4 | 16 | Figure-ground/address test; reject purposeless filler |
| RSK-T10 | Boulevard grading damages existing terrain/assets | 3 | 5 | 15 | Stationed exact-state operations; protected intersections |
| RSK-T11 | Billboards block views or route decisions | 3 | 3 | 9 | Sightline matrix and spacing register |
| RSK-T12 | Oasis is not actually halfway or feels detached | 3 | 3 | 9 | Route-distance/travel-time station selection |
| RSK-T13 | Mini-bunker shell becomes visible | 4 | 4 | 16 | Surface-cover section and exposed-material census |
| RSK-T14 | Bunker stair/headroom repeats prior tunnel failures | 4 | 5 | 20 | Uniform section standard and normal-walk QA |
| RSK-T15 | Existing accepted R1/Wave 2 fabric is replayed/overwritten | 2 | 5 | 10 | Cross-release target and protected-feature exclusion |
| RSK-T16 | Database import precedes physical/media acceptance | 3 | 4 | 12 | Import is after post/route/camera gates |
| RSK-T17 | New screenshots lack exact-object links | 4 | 3 | 12 | Capture manifest requires one primary external ID |
| RSK-T18 | Dossier and PDF become stale after late changes | 4 | 3 | 12 | Generate register, then PDF, then freeze/hash |
| RSK-T19 | Sites repeats version 3 runtime exception | 3 | 4 | 12 | Build bundled Worker and inspect production logs |
| RSK-T20 | Local `exports/box` is mistaken for cloud upload | 5 | 4 | 20 | Require remote path and SHA-1 verification |
| RSK-T21 | A credential leaks into the dossier | 2 | 5 | 10 | Redact secrets/tokens/identity; scan before publication |
| RSK-T22 | Concurrent teams mutate shared artifacts mid-release | 4 | 4 | 16 | Freeze manifests, fixed ownership, hash after quiescence |
| RSK-T23 | Historical detached-garage package is mistaken for current design authority | 5 | 4 | 20 | Supersession register; do not replay R4/R5 generator |
| RSK-T24 | A cosmetic connector is counted as an attached garage | 4 | 4 | 16 | Require continuous occupied fabric and an interior walking route |
| RSK-T25 | Large-house garage capacity is undercounted | 4 | 4 | 16 | Measured classification and explicit 4/6 clear-bay census |
| RSK-T26 | Russian pavilion becomes an incoherent theme collage | 3 | 4 | 12 | One cited lineage; record rejected alternatives |
| RSK-T27 | Pavilion blocks the library/Guild Hall civic axis | 3 | 5 | 15 | Elevation/sightline and bidirectional route gate |
| RSK-T28 | Crater water escapes or floods caves/objects | 4 | 5 | 20 | Closed-basin proof, object census, neighbor-fluid simulation |
| RSK-T29 | Pier buildings still look accidentally afloat | 4 | 4 | 16 | Required piles/wharf deck/waterline sections |
| RSK-T30 | Rides collide with buildings or stadium modes | 4 | 5 | 20 | 3D clearance and protected sightline matrices |
| RSK-T31 | Amusement pier is a dead end or evacuation trap | 3 | 5 | 15 | Public return, service, and emergency-route contracts |
| RSK-T32 | Restaurants become decorative shells | 3 | 3 | 9 | Kitchen/storage/staff/delivery/guest route schedules |
| RSK-T33 | Main district, pier, and stadium remain disconnected | 4 | 4 | 16 | Shared axis/address/paving/light plan and approach cameras |
| RSK-T34 | Precedent parks become direct branded copies | 3 | 5 | 15 | Cited transferable lessons; original names, plans and forms |
| RSK-T35 | Westward road severs crater green belt | 4 | 5 | 20 | Continuous loop and explicit safe crossing at every conflict |
| RSK-T36 | Water-park fill escapes or damages protected objects | 4 | 5 | 20 | Closed-boundary, block-entity and neighbor-fluid proof |
| RSK-T37 | Lakeside housing privatizes the shore | 4 | 4 | 16 | Continuous public edge and mapped access/view corridors |
| RSK-T38 | Housing density becomes incoherent sprawl | 3 | 4 | 12 | Measured block/type schedule and figure-ground review |
| RSK-T39 | “Distressed” housing becomes unsafe caricature | 3 | 5 | 15 | Dignity/completeness audit and all-room/all-route QA |
| RSK-T40 | Staff path collides with protected rear operations | 4 | 4 | 16 | Fresh intersection and inventory/loading checks |
| RSK-T41 | Employee lounge is decorative or obstructive | 3 | 3 | 9 | Room/adjacency/operations and route acceptance |

## 11. Artifact and hash register

This table identifies the authoritative control artifacts. The Wave 2 machine
register contains the complete 356-file ledger and should be used instead of
reprinting hundreds of image rows here.

| Artifact | SHA-256 | Role |
|---|---|---|
| `data/world-review/redevelopment-post-deployment-qa-2026-07-27.json` | `0e3140f01614c21e4dfccad6613cbe0ae17bbf3f865cfbd1eaa2570106b4ba91` | R1 post acceptance |
| `data/world-review/redevelopment-release-database-import-2026-07-27.json` | `8c766c45edcade184ab8fb4d4004020c5ecd7ec9fbf0b0bbfb92ae4b59f2bd6d` | R1 database ledger |
| `data/world-review/redevelopment-artifact-manifest-2026-07-27.json` | `5680c2fcaad0a2f139dd453f26c53c598aae9011dd748d5c4b637ae171bd1f49` | R1 file register |
| `docs/redevelopment/2026-07-27/master-plan.pdf` | `3a9e8b49f7ee6aab8f59f92eb0f596dc2d5009e9f6b11e473469b223815acc3d` | R1 compiled dossier |
| `data/buildops/redevelopment-wave2-release-manifest.json` | `df8ca8586b0415d2bc0a7653ec3a61d1c8ed333b90c9a05d4ca2b67d0cb946fe` | Wave 2 transaction source |
| `data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json` | `e9b3752e89771c4ab218e5811bf23700cfd5f08128e9277324ca9df990f43ef2` | Wave 2 live ledger |
| `data/world-review/redevelopment-wave2-route-qa-2026-07-28.json` | `6f97def62efe5abb6a3ae89c685cccfa39583b609357273df0855c3121e15ccf` | Wave 2 walking QA |
| `data/world-review/redevelopment-wave2-database-import-2026-07-28.json` | `5321f35ca15c3b3cfa2dd1de48963776234f53d35d7875e291bcc41cfd51b524` | Wave 2 database ledger |
| `data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json` | `551be053a21e37edc246f95cb2ded30df138f600f66c5574c2cf9b9b7f321d4c` | Final Wave 2 acceptance |
| `data/world-review/redevelopment-artifact-manifest-2026-07-28-wave2.json` | `2b0d026fb1ffab6dc23e606a61bf4613e0314e03614dc8dc43be48784e03d0a3` | Complete Wave 2 file register |
| `docs/redevelopment/2026-07-28-wave2/master-plan.pdf` | `d26d810d90e6fec0218f6015cfc712f184a70f3e4609a7713c78a1c0d42c4a80` | Wave 2 compiled dossier |
| `data/exports/redevelopment-media-wave2-2026-07-28/capture-report.json` | `8979eeadb7bd9a101ac11d67067fa9f99ab19d70cda9260642c0572dccd6c57a` | 79-image render report |
| `data/world-review/world-media-wave2-2026-07-28.qa.json` | `5825b4d8f231e78780f6d7b105ef65762e0bc1bbc1b481e3bed7c93bb04621c5` | Exact media QA |
| `data/exports/world-catalog-wave2-post-2026-07-28/database-report.json` | `be08a7880ffee8c5452bdbf887e261c8c70fa18e0915438963cce81b474fc6af` | Final post catalog/database report |
| `data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/atlas-manifest.json` | `2b2e17781b61eb8c9c4f4dc045d5f88304f467193dd9ae93a97fa599e28d2b78` | Seven-sheet post atlas |
| `data/box-sync-state.json` | `dccb85839f92baf789e6561a630a9e2f2884dc099e898a82a9c0a4afddb5cced` | Last durable Box sync |
| `src/integrations/BoxIntegration.ts` | `79f4ac7aa970172130e0056e17c8710b58a357d527ded3a8aa37e4a730dfa0b5` | Box connector implementation |
| `world-showcase/scripts/prepare_sites_worker.mjs` | `ac5b8ceb639e6fdda3ec847784159613623575c8137fd26818cd8ba0a5e671e7` | Sites runtime packaging fix |
| `world-showcase/.openai/hosting.json` | `f08b9505068c5dd23dea5edbcd40dc469d630eca04f0007aede2509b3d1c01b1` | Opaque Sites project binding |
| `data/exports/box/town-expansion-baseline-2026-07-28/team-a/atlas-manifest.json` | `701522c65c0bfdd9086f8d6703c53005d227cf6d33f6529aa369f7bb9728f91d` | Current expansion baseline atlas |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/approach-corridor-current-map.png` | `37c956b2311c4e494eaba1db290bf1a7a7f98629600382c7308a0770054357c3` | Baseline corridor evidence |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/ravensreach-civic-current-map.png` | `6a7f371edbdaad346d238fde09b9776d4b22a8bfd3d82a593a53bd4cbf7f93d8` | Baseline civic-core evidence |
| `docs/redevelopment/2026-07-28-town-expansion/mainstreet-attached-garage-coordinate-schedule.json` | `b03a999ff72f8060b6dc373be5b45bd14b970c83b3d92a65b14de28055d71ea1` | 18-house attached-garage redesign basis |
| `docs/redevelopment/2026-07-28-town-expansion/evidence/westlight-waterfront-current-map.png` | `135fbc929943246c3f37f5fba96f85b0517cc632ebecba0796c1553a3f06209f` | Westlight waterfront current-condition survey |

The last three expansion hashes are preliminary baseline inputs. They are not
post-construction acceptance.

### 11.1 Point-in-time PDF and image validation

The machine audit
[`media-file-verification-audit.json`](media-file-verification-audit.json)
checked July 28–modified PDFs and images under `docs` and `data/exports`,
excluding duplicate copies in the Sites public directory:

- 6/6 PDFs were recognized as PDF 1.4 or 1.5 with nonzero page counts;
- the two C01 supplements are one page each;
- the two worldwide floor-plan atlases are 76 pages each;
- the R1 and Wave 2 master dossiers are eight pages each; and
- 399/399 PNG/JPEG/WebP files decoded through Node canvas with zero failure.

This is a point-in-time file-integrity result. It does not validate the final
town-expansion PDF or post-construction media, which do not yet exist. It also
does not prove Box transfer; that remains `PENDING_SYNC`.

## 12. Sites publication record

### 12.1 Version history

| Version | Commit | Purpose | Outcome |
|---:|---|---|---|
| 1 | `eff5518cc920aed7bb69103ca051a5e033ff7fd5` | Initial R1 atlas | Published |
| 2 | `a6f29995cd49553e457028e1556c32a49a671869` | R1 publication-record rollup | Published |
| 3 | `316903cb85b5faa989a888f400279256dec27619` | Wave 2 atlas/evidence | Deployment completed, runtime Error 1101 |
| 4 | `7777e20566f888d5ff66f5e290821eba0ef5bac3` | Bundled OpenNext Worker | Published and healthy |

Current version 4:

- version ID:
  `appgprj_6a67cce1a3848191bfb86ef2ef8ab567~appgver_33afceee942c8191a33e8cbd53b5420a`;
- archive SHA-256:
  `14c029631b5b7e37b14469471fe69128688f8d2cb7626e7d69e4b92e367e868b`;
- archive size: 79,247,360 bytes;
- file count: 410;
- production root after fix: HTTP 200 / Worker `ok`; and
- access: owner-only, no groups.

The v3 exception was reported at 02:54:31Z with Ray
`a2209982e8a31497`. The runtime package still contained an unsupported
`require()` path. Version 4 bundles the OpenNext Worker before packaging.

Machine audit:
[`external-publication-audit.json`](external-publication-audit.json).

### 12.2 Current expansion publication gate

Do not overwrite the v4 claim with town-expansion language until:

- post-construction snapshot and database hashes are final;
- all new maps/screenshots/plans are copied into the Sites source;
- the site repository is clean and committed;
- the exact commit is pushed;
- a version is saved from an archive built from that commit;
- the owner-only version is deployed;
- production `/` and important asset/report routes return successfully;
- Worker error logs are empty for the validation window; and
- the dossier records the exact version/archive/source identities.

## 13. Box handoff record

### 13.1 Current evidence

- Connector: enabled and reachable.
- Authentication: client credentials configured; secret excluded.
- Auto-sync: off.
- Last durable sync: 2026-07-27T04:25:16.826Z.
- Current approved-root census at audit: 701 files / 175,826,622 bytes.
- Approved artifacts newer than the ledger: 242 files / 84,285,976 bytes.
- Post-ledger files above 50 MiB: zero.
- Representative Wave 2/current expansion remote directories: absent.

Decision: **PENDING_SYNC**.

### 13.2 Required closeout evidence

The final dossier must append:

| Field | Required value |
|---|---|
| Sync started/completed | UTC timestamps |
| Discovered | Final approved artifacts |
| Uploaded | Count |
| Updated | Count |
| Unchanged | Count |
| Skipped | Must be 0, or each omission dispositioned |
| Failed | Must be 0 |
| Bytes uploaded | Exact |
| Sync report | Approved local path and SHA-256 |
| Remote verification | File count plus SHA-1 equality |
| Credential scan | PASS; no secret/token/identity in artifacts |

## 14. Final deliverable register

### 14.1 Already available

- R1 and Wave 2 release/rollback packages;
- two independent accepted post snapshots;
- R1 and Wave 2 database ledgers;
- R1 and Wave 2 post QA;
- Wave 2 356-file hash register;
- Wave 2 79-image exact-object media release;
- seven-sheet Wave 2 post atlas;
- R1 and Wave 2 master PDFs;
- owner-only Sites v4; and
- town-expansion baseline atlas, current-condition survey maps, and oblique
  evidence views.

### 14.2 Required after current construction

Exact paths may be chosen by the release team, but the dossier requires one
unambiguous path for each item:

1. expansion immutable baseline manifest;
2. expansion master-plan map;
3. final coordinated forward/rollback release manifest;
4. per-package forward/rollback files;
5. cross-package independent QA;
6. live entity gate;
7. atomic transaction ledger;
8. immutable post snapshot manifest;
9. independent installed/rollback verifier;
10. all bidirectional route reports;
11. before/after camera manifests and image reports;
12. longhouse and courtyard plans;
13. penthouse plans/sections;
14. library area schedule and level plans;
15. library–pavilion terrace sections;
16. pavilion statuary/ensemble plan;
17. five guild-hall level plans and sections;
18. guild bar research/design/operations report;
19. town figure-ground and address plan;
20. stadium boulevard station/billboard register;
21. oasis plan and midway calculation;
22. mini-bunker plans, sections, concealment census, and route QA;
23. database backup/import/integrity ledger;
24. final object-to-media catalog;
25. final surface atlas and floor-plan atlas;
26. final artifact hash register;
27. compiled session PM HTML/PDF and hashes;
28. Sites commit/version/deployment/runtime report; and
29. Box sync plus remote SHA-1 verification;
30. residential house/garage classification and capacity schedule;
31. attached-garage forward/rollback and relationship-camera package; and
32. refreshed database/catalog/Sites records superseding detached labels;
33. Russian civic-pavilion research, selection matrix, plans/elevations and
    axis/route evidence;
34. Westlight island figure-ground, shoreline/water/grade and protected-object
    survey;
35. intentional pier-building register, plans, sections and exact captures;
36. amusement-pier research paper and selected/rejected layouts;
37. Ferris-wheel and roller-coaster plan/profile/clearance packages;
38. steak-house and shrimp-house plans, operations schedules and media;
39. main/pier/stadium pedestrian-mall/street alignment plan;
40. crater-lake containment/neighbor-fluid proof; and
41. quay/green-space loop plan and bidirectional QA;
42. paired-park research paper, source matrix, selected/rejected plans, and
    original dry/water-park programs;
43. dry-park and water-park plans, sections, ride/attraction clearances,
    contained-water proof, routes, and exact captures;
44. westward approach-road alignment, station/crossing plan, routes, and
    crater-green-belt integration;
45. Hampton-style lakeside design code, medium-density blocks/addresses,
    public-waterfront routes, floor plans, and exact captures;
46. two southwest-Ravensreach housing-project plans, central-space schedules,
    connection/dignity QA, floor plans, and exact captures;
47. Ravensreach-to-rear-MainStreet staff-path survey, forward/rollback,
    bidirectional route QA, and evidence; and
48. employee-lounge plan, operations schedule, forward/rollback, database
    relation, and exact captures.

## 15. Completion and acceptance checklist

The program manager may mark the current expansion complete only when every
line is `PASS` or has an owner-approved disposition:

- [ ] Baseline immutable and independently hashed.
- [ ] Exact protected/demolition object register approved.
- [ ] Penthouse installed and all-room walking verified.
- [ ] Amsterdam objects replaced by accepted longhouse.
- [ ] Every residential garage is physically attached to its parent house.
- [ ] Every large house has either four or six clear attached garage bays.
- [ ] All 18 known R1 detached garage features have an explicit current
      disposition and refreshed database/media relation.
- [ ] House-interior ↔ garage ↔ road routes pass in both directions.
- [ ] Courtyard complete and connected.
- [ ] Library post area is at least 4× measured baseline.
- [ ] Two-level concrete terrace connects library to pavilion.
- [ ] Pavilion statuary and civic route remain clear.
- [ ] A cited Russian architectural lineage controls the pavilion/shared civic
      response; no modern glass-box pavilion remains in the current design.
- [ ] Library ↔ Russian-referenced civic space/pavilion ↔ Guild Hall passes in
      both directions.
- [ ] Guild hall contains two basements and three stories.
- [ ] Guild hall room schedule proves dorms, four operationally distinct
      kitchens, living spaces, theater, lecture hall, dance hall, and bar.
- [ ] Guild bar has its own cited plan and operations QA.
- [ ] Town figure-ground demonstrates coherent blocks/areas.
- [ ] Stadium boulevard is complete and traversable.
- [ ] Billboard register and sightline audit pass.
- [ ] Oasis is demonstrably midway and connected in both directions.
- [ ] Original mini-bunker is concealed and walkable.
- [ ] Westlight reads as one coherent stadium-island district.
- [ ] Every over-water building has an intentional pier/wharf structure and
      valid public/service route.
- [ ] Researched amusement pier, Ferris wheel, and roller coaster pass
      clearance, support, queue, and route QA.
- [ ] Outer steak and shrimp houses are complete operational buildings.
- [ ] Main district, pier, and stadium are aligned by legible pedestrian malls
      and streets.
- [ ] West crater contains the exact approved water volume with zero leakage
      or unplanned flooding.
- [ ] Quay and green-space loop are continuous and safe to walk.
- [ ] Cited research controls an original facing dry-park/water-park pair west
      of Westlight; no precedent is directly copied.
- [ ] Both parks have complete guest, staff, service, maintenance, emergency,
      queue, attraction, food/support, clearance, and route evidence.
- [ ] Water-park fluid containment and neighbor-fluid QA pass.
- [ ] Westward approach road reaches both parks and preserves a continuous
      crater-lake green belt with explicit safe crossings.
- [ ] Hampton-style lakeside housing is medium-density, retains continuous
      public lake access, and complies with the attached-garage change.
- [ ] Both southwest-Ravensreach housing projects are complete, connected, and
      organized around programmed, lit, overlooked central outdoor spaces.
- [ ] Housing dignity/completeness QA finds no unsafe caricature, inaccessible
      dwelling, trapped court, or unexplained ruin.
- [ ] Ravensreach ↔ rear MainStreet staff entrance passes normally in both
      directions.
- [ ] Employee lounge program, operations, protected-object, route, database,
      and exact-media gates pass.
- [ ] Cross-package target overlaps are zero.
- [ ] Transaction committed with strict guards and durable ledger.
- [ ] Post snapshot and exact rollback proof pass.
- [ ] All required routes pass both directions without dig/tower/flight.
- [ ] Every new object has exact plan/screenshot relations.
- [ ] Database import, integrity, FK, backup, and accepted hash pass.
- [ ] All PDFs open, have nonzero pages, render, and match the register.
- [ ] Every screenshot decodes, has expected dimensions, and matches its
      manifest hash.
- [ ] Atlas/catalog/dossier agree on snapshot and database identities.
- [ ] Sites owner-only version is healthy in production.
- [ ] Box sync has zero failed/skipped files.
- [ ] Box remote SHA-1 matches every final handoff artifact.
- [ ] No credentials, tokens, user identity, or private bypass data appear in
      the dossier or exports.

## Appendix A — Primary review documents

- R1 completion:
  `docs/redevelopment/2026-07-27/as-built-release-completion.md`
- R1 requirements:
  `docs/redevelopment/2026-07-27/requirements-traceability.md`
- R1 artifact register:
  `docs/redevelopment/2026-07-27/artifact-register.md`
- Wave 2 program:
  `docs/redevelopment/2026-07-28-wave2/README.md`
- Wave 2 as-built:
  `docs/redevelopment/2026-07-28-wave2/as-built-release-report.md`
- Wave 2 acceptance:
  `docs/redevelopment/2026-07-28-wave2/post-release-independent-acceptance.md`
- Wave 2 artifact register:
  `docs/redevelopment/2026-07-28-wave2/artifact-register.md`
- Wave 2 PDF:
  `docs/redevelopment/2026-07-28-wave2/master-plan.pdf`
- Current external-publication audit:
  `docs/redevelopment/2026-07-28-town-expansion/external-publication-audit.json`
- Current Box audit:
  `docs/redevelopment/2026-07-28-town-expansion/box-handoff-audit.md`
- Attached-garage controlling change:
  `docs/redevelopment/2026-07-28-town-expansion/attached-garage-requirement-supersession.md`
- Westlight island and Russian-pavilion controlling change:
  `docs/redevelopment/2026-07-28-town-expansion/westlight-island-and-russian-pavilion-change-control.md`
- Westward entertainment, housing, and workforce controlling change:
  `docs/redevelopment/2026-07-28-town-expansion/westward-entertainment-housing-workforce-change-control.md`
- Town-expansion coordinate assumptions:
  `docs/redevelopment/2026-07-28-town-expansion/coordinate-schedule.json`
- Parcel surface survey:
  `docs/redevelopment/2026-07-28-town-expansion/evidence/parcel-surface-survey.json`
- Feature-intersection report:
  `docs/redevelopment/2026-07-28-town-expansion/evidence/feature-intersection-report.json`

## Appendix B — Final PM change log template

| UTC | Change | Package | Reason | Artifact/hash | Approval/decision |
|---|---|---|---|---|---|
| Pending | Append accepted town-expansion baseline | WBS 3 | Freeze source | Pending | Pending |
| Pending | Append package design/research decisions | WBS 4–13 | Design control | Pending | Pending |
| Pending | Append live transaction | WBS 14 | Construction | Pending | Pending |
| Pending | Append post QA/database/media | WBS 14 | Acceptance | Pending | Pending |
| Pending | Append final Sites version | WBS 14 | Publication | Pending | Pending |
| Pending | Append Box sync/remote verification | WBS 14 | Handoff | Pending | Pending |

## Appendix C — Closeout sign-off

| Role | Decision | Evidence time | Notes |
|---|---|---|---|
| Program manager | Pending | — | — |
| Design integration | Pending | — | — |
| Physical release coordinator | Pending | — | — |
| Independent QA | Pending | — | — |
| Database/media | Pending | — | — |
| Sites publication | Pending | — | — |
| Box handoff | Pending | — | — |

This source remains intentionally open until the town-expansion post-state,
final PDF, production Sites version, and remote Box hashes exist.
