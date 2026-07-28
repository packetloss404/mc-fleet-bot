# Westlight Three-Venue Audit and Redesign

Date: 2026-07-28

Status: **AUDIT AND COORDINATE DESIGN — NOT A BUILD RELEASE**

Companion schedule: `westlight-three-venue-coordinate-schedule.json`

## Executive decision

Westlight does not currently contain three theaters. It contains three nested
database structures:

1. `WL-BOWL`, a stadium/arena with a four-sided center-hung display;
2. `WL-THEATRE`, one end-stage theater with orchestra, parterre and balcony
   tiers; and
3. `WL-CLUB`, a two-level members club/private box lounge.

The orchestra, parterre and balcony are not separate auditoria. They all face
one north-end stage. Calling them three theaters is the principal source of
confusion in the records. The recommended correction is to operate the complex
as three plainly different **venues**:

- **Westlight Sky Bowl** — the existing stadium/arena;
- **Blue Drum Theatre** — the existing single end-stage house; and
- **Lantern Studio** — a new small cabaret/black-box performance room inserted
  inside the members-club program while its lounge and bar remain.

This produces three honest public identities without damaging the accepted
stadium bowl, infinity screen, field, concourses, public entrance throat or
verified stair routes.

## Evidence control

This audit is offline and read-only. It uses:

- immutable snapshot
  `data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`,
  canonical SHA-256
  `0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`;
- `data/world-map.db`, opened read-only, SHA-256
  `1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`;
- the authored geometry in `scripts/gen_westlight.py`;
- the accepted screen release and its 48-view evidence matrix in
  `docs/redevelopment/2026-07-27/westlight-screen-release.md`;
- the current waterfront and expansion coordinate schedules; and
- the existing exact-object media catalog.

The current media record contains one exact-object theater capture,
`wl-theatre--below-grade-theatre-and-lobbies.png`. It is a dark lateral view
from approximately `(-357, 36, -556)` looking east, not a centered view toward
the stage. There is no exact-object capture that independently explains the
club or the three venue arrivals. The accepted bowl screen does have 48 matched
views. The overview and theater floor-plan graphics are useful inventories, but
their large half-floor rectangles are explicitly functional database zones,
not proof of physical walls.

## What is actually built

| Object | Exact bounds | Current program | Finding |
|---|---|---|---|
| `WL-BOWL` | x `-429..-291`, y `55..91`, z `-629..-491` | Field, service ring, main and upper concourses, members terrace, crown walk and press gallery | Arena; preserve |
| `WL-INFINITY-SCREEN` | x `-369..-351`, y `74..92`, z `-568..-552` | Four display faces with 48-view evidence | Correct focal object for an all-around bowl; preserve |
| `WL-THEATRE` | x `-421..-299`, y `18..50`, z `-613..-498` | One fan-raked orchestra, parterre, cantilevered balcony, one north-end stage, three lobby levels | One theater, not three |
| `WL-CLUB` | x `-417..-400`, y `35..44`, z `-566..-550` | Members lounge, bar/dance floor, private balcony and club landing | Hospitality room, not currently a theater |

The source geometry confirms the Blue Drum house is organized around a stage
at x `-377..-343`, y `18..43`, z `-607..-590`. Fifteen orchestra rows and
eleven balcony rows are elliptical arcs centered on that stage. Its existing
seat orientation is therefore fundamentally correct. The deficiency is not
that the entire house faces the wrong way; it is that the distinct house,
support spaces and public identity are not legible in the shared stadium shell.

## Why the three identities disappear

1. `WL-BOWL` and `WL-THEATRE` use almost the same south arrival:
   `(-359,68,-498)` and `(-354,68,-498)`.
2. The members club has only an internal below-grade entrance at
   `(-408,36,-560)`.
3. The arena, theater and club are stacked inside one broad blue/white/black
   material family, so a visitor sees one object rather than three destinations.
4. The database partitions every floor into broad functional halves. These
   rectangles obscure the actual radial lobby, fan-shaped house and private
   club geometry.
5. Existing exact-object media does not provide a complete arrival-to-seat
   sequence, and the one theater capture does not show the stage-facing
   relationship.
6. Backstage, rehearsal, dressing, technical and freight functions are too
   weakly registered as distinct rooms, so the building reads as seats plus
   corridors instead of a working performance complex.

## Public-source design basis

This is a Minecraft planning analog, not a claim of real-world code
compliance. The following public standards nevertheless supply useful and
testable design logic:

- The U.S. Access Board requires assembly wheelchair spaces to be integral to
  the seating plan, horizontally and vertically dispersed, connected without
  overlapping required circulation, and provided with comparable sightlines to
  the screen, performance area or playing field. See
  [ADA Standards §§221 and 802](https://www.access-board.gov/ada/).
- The Access Board also states that an accessible route must connect stages and
  performance areas to seating, dressing rooms and ancillary performer spaces.
  See the
  [Chapter 4 accessible-route guide](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/).
- Where a ramp analog is used, the ADA Standards use a maximum 1:12 running
  slope, landings and clear-width requirements. See
  [ADA Chapter 4](https://www.access-board.gov/ada/chapter/ch04/).
- The federal Whole Building Design Guide identifies sloped floors with level
  row terraces as a sightline tool, recommends directly accessible lower and
  intermediate rows, and includes a lobby, stage, control/projection room and
  equipment storage in its representative auditorium program. See
  [WBDG Auditorium](https://www.wbdg.org/space-types/auditorium).
- WBDG places loading docks away from public entrances and public spaces, near
  freight elevators, with a protected staging area and separated public/service
  circulation. It also calls for marked pedestrian/forklift routes and says a
  dock must not be an emergency egress path. See
  [WBDG Loading Dock](https://www.wbdg.org/space-types/loading-dock).
- OSHA requires dockboards to support their intended load, resist run-off and
  movement, and requires measures that keep the trailer from moving while the
  dockboard is in use. See
  [OSHA 29 CFR 1910.26](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.26).
- GSA identifies its current P100 as mandatory performance criteria for
  GSA-owned buildings. Its loading-dock planning is used here only as a public
  service-separation precedent. See
  [GSA Facilities Standards](https://www.gsa.gov/real-estate/facilities-standards-for-the-public-buildings-service).

## Three distinct public identities

### 1. Westlight Sky Bowl

Keep the all-around bowl and the center-hung four-face screen. The screen is the
right focal form for encircling seating and already has a 48-view evidence
matrix. The south gate remains the arena address, but two flanking sign pylons
and low ticket/wayfinding counters give it a name without touching the protected
four-block throat at x `-356..-353`, z `-506..-471`. The west pylon stops at
x `-365` to preserve the forecourt fountain sources at x `-364..-361`,
y `68`, z `-496..-492`.

The Sky Bowl identity uses high-contrast white, black and lime display accents.
No proposed work changes the screen, field, bowl rake, vomitories, concourses or
canopy anchors. Any future accessible-seating work must be an exact, row-level
controlled repair and must reproduce the screen sightline matrix.

### 2. Blue Drum Theatre

Give the end-stage theater a separate west arrival at x `-443..-431`,
z `-548..-526`, with a visible blue masonry drum, warm-brass canopy, marquee and
vertical core to the three existing lobby levels. A short underground link
enters the theater outside the arena's y `55..91` bowl volume.

Inside, retain the north-end stage and fan-raked seating. Strengthen:

- a stage-centered center aisle plus two radial side aisles;
- level wheelchair/companion terraces at lower, parterre and balcony entry
  levels, subject to a ray-by-ray proof;
- row-end lighting and unmistakable section/row wayfinding;
- an acoustical vestibule between lobby and house;
- a rear control room with a direct view to the stage;
- separate stage-left and stage-right wings and a full rear crossover;
- dressing suites, an accessible dressing room, green room, rehearsal room,
  wardrobe/laundry, instrument and equipment storage; and
- a continuous performer route from loading dock to freight lift, scene store,
  stage, dressing and rehearsal areas without passing through public lobbies.

### 3. Lantern Studio and Club

Do not falsely rename the entire members club as a theater. Retain `WL-CLUB` as
the hospitality parent and add a child feature, `WL-STUDIO`, for a 40–60 seat
cabaret/black-box room. Its small footprint is appropriate for a flexible room,
not another large proscenium house.

The studio receives a separate west arrival at x `-443..-431`,
z `-589..-568`. The stage occupies the north edge of the existing club, the
cabaret seating faces north, and the existing bar/lounge remains at the rear.
A west annex contains an acoustical vestibule, dressing/green room, control
booth, equipment store and a small rehearsal/meeting room. The private balcony
becomes a technical/gallery level while retaining hospitality use.

Lantern's public language is dark oak, amber light, oxblood fabric and copper,
clearly different from the blue theater and white/lime arena.

## Sightline and seating contract

The coordinate schedule establishes one focal target per venue:

- Sky Bowl: center of `WL-INFINITY-SCREEN`, approximately
  `(-360,80,-560)`;
- Blue Drum Theatre: stage focal point `(-360,22,-598)`; and
- Lantern Studio: stage focal point `(-408,37,-564)`.

No seat may be accepted merely because it points generally toward a stage.
Release evidence must include:

1. unobstructed seated-eye rays to the relevant focal target;
2. standing-spectator checks where a concert configuration makes standing
   likely;
3. horizontal and vertical accessible-position dispersion;
4. no wheelchair position inside a required aisle;
5. an arrival-to-seat normal-walk test from each venue's named entrance; and
6. a performer normal-walk test from dressing room and freight lift to stage.

For the Sky Bowl, the existing 48-view screen matrix remains the baseline. For
Blue Drum, at least 24 fixed same-camera views are required: left, center and
right across lower, middle and balcony bands, with seated and standing
configurations. Lantern requires at least 8 views covering the flexible floor,
rear bar and gallery.

## Back-of-house and basement program

Two new support levels fit below the theater without using the known natural or
authored voids:

- **B1, y `7..15`** — a larger L-shaped scene shop, scene store,
  wardrobe/laundry, instrument/equipment store, technical plant and freight
  receiving route;
- **B2, y `-5..3`** — a deliberately narrowed western L-shaped archive,
  secure props/costume store, staff support and resilient plant level.

The broader B2 eastern candidate is rejected. It contains existing plain-air
voids at approximately x `-352..-336`, z `-611..-601` and
x `-351..-344`, z `-591..-579`. Whether those voids are old excavation or an
unregistered tunnel, they are not safe ground to overwrite. The selected B2
boxes stop west of those voids and contain zero air, cave-air, fluids,
waterlogged blocks or block entities.

## Freight and semi-truck service

The only credible dock is east of the registered stadium district, not in the
south public forecourt or future pier mall:

- dock/court parcel x `-271..-243`, z `-620..-584`;
- two east-facing loading positions at the west dock wall;
- weather-protected receiving/staging, dock manager sightline, personnel door,
  freight lift and marked pedestrian strip;
- a separated freight road tied to the approach around
  `(-224,70,-496)`, staying east of the planned pier egress; and
- a below-grade corridor x `-340..-264`, y `7..15`,
  z `-611..-605`, joining a stage lift at x `-347..-340`.

The surface spur may require short pile/causeway construction where the broader
approach crosses water pockets, but the exact dock, lift and below-grade route
boxes are dry in the immutable census. The public stadium throat and pier
pedestrian mall never double as freight routes.

## Snapshot census and exclusions

Exact offline Anvil censuses found:

| Candidate volume | Water/lava/waterlogged | Block entities | Cave-air | Decision |
|---|---:|---:|---:|---|
| Blue west portal/link | 0 | 0 | 0 | viable design reserve |
| Lantern west portal/link/club | 0 | 0 | 0 | viable design reserve |
| Lantern annex/B1 | 0 | 0 | 0 | viable design reserve |
| East loading court and lift | 0 | 0 | 0 | viable design reserve |
| B1 north and east L-shape | 0 | 0 | 0 | viable design reserve |
| B2 selected western L-shape | 0 | 0 | 0 | viable design reserve |
| Underground freight corridor | 0 | 0 | 0 | viable design reserve |
| Stage freight/core link | 0 | 0 | 0 | viable design reserve |
| Narrowed Sky Bowl identity pylons | 0 | 0 | 0 | viable design reserve |

The wider stadium district contains 84 block entities, including containers and
three mob spawners. All remain protected. The spawners at
`(-289,23,-596)`, `(-358,38,-639)` and `(-368,42,-618)` do not intersect the
selected basement, dock or freight geometry. `WL-THEATRE` and `WL-CLUB` contain
no block entities, but that fact does not authorize unguarded edits.

## Cross-package fit

- **Crater lake/greenway:** its east edge is x `-447`; the two west portals
  begin at x `-443`, leaving a three-cell intervening buffer. No portal enters
  the lake envelope.
- **Westlight pier:** its planning envelope begins south at z `-445`. The dock
  and freight system remain north/east and do not enter the pier or the
  stadium-to-pier pedestrian mall.
- **East pier egress:** x `-290..-278`, z `-502..-365`; the freight spur and
  court remain east of x `-277`.
- **Westward parkway:** its south outer edge is z `-652`; the dock begins at
  z `-620`, leaving a 31-cell intervening band.
- **Protected stadium throat:** x `-356..-353`, z `-506..-471`; the arena
  identity elements flank it and do not occupy it.
- **Forecourt fountain:** its 19 water-source cells at x `-364..-361`, y `68`,
  z `-496..-492` remain outside the narrowed west identity pylon.
- **Accepted bowl/screen/routes:** no work package may modify them unless a new
  exact defect report and controlled repair package supersede this preservation
  rule.

## Required database and media handoff

After a future accepted build, update the database only from post-state
evidence:

- retain `WL-BOWL`, `WL-THEATRE` and `WL-CLUB`;
- add `WL-STUDIO` as a performance-room child of `WL-CLUB`;
- add discrete lobby, dressing, green, rehearsal, control, storage, dock,
  freight-corridor, B1 and B2 room features;
- attach exact screenshots to their object IDs rather than relying on folder
  proximity; and
- mark old broad functional zones as superseded only after the detailed room
  geometries are proven.

The post-build media minimum is 42 new matched images: 6 exterior/arrival, 24
Blue Drum sightlines, 8 Lantern sightlines and 4 dock/backstage/freight views,
plus an updated overview, one floor plan per occupied level and one service
section showing dock-to-stage continuity.

## Release gates

This package does not contain build operations and authorizes no live mutation.
A physical release still requires a fresh immutable snapshot, exact one-cell
guards, a protected block-entity register, fluid and neighboring-fluid census,
cross-package lock, player/entity clearance, before media, a fixed atomic
transaction, exact rollback, post snapshot, route/sightline QA, database import
and matched after media. A passing planning census is not an execution permit.
