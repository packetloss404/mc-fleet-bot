# Westward Paired Parks, Parkway, Greenbelt, and Harborlight Courts

Change package: `REDEV-2026-07-28-WESTWARD-PARKS-04`  
Date: 2026-07-28 UTC  
State: **SURVEYED MASTER PLAN — NOT A LIVE RELEASE**  
Machine schedule:
`docs/redevelopment/2026-07-28-town-expansion/westward-paired-parks-masterplan.json`

## Executive decision

Build two original parks facing one another across a new north-side Westlight
parkway:

- **Northwind Water Gardens** occupies the existing water shelf north of the
  road at x `-672..-520`, z `-720..-674`.
- **Ravencrest Adventure Grounds** occupies the dry, hilly land south of the
  road at x `-672..-520`, z `-650..-520`.
- **Adventure Exchange** is the common address at x `-610..-560`,
  z `-673..-651`; the Northwind gate faces south and the Ravencrest gate faces
  north.
- The **North Shore Parkway and Causeway** leaves the accepted approach road at
  `(-224,70,-496)`, passes east and north of the stadium, then travels west at
  z `-662`. Its full outer envelope stays south of z `-652`, while the protected
  stadium district begins at z `-640`.
- The crater remains a public lake/greenbelt hinge. The ticketed parks stop at
  x `-520`; a public green link occupies x `-519..-492`; the surveyed crater
  begins at x `-491`.
- **Harborlight Courts**, a three-project, 30-unit medium-density coastal
  neighborhood, occupies x `-518..-448`, z `-548..-470`. Its two smaller court
  buildings have attached four-bay garage wings and its large court building
  has an attached six-bay wing.

This arrangement resolves the “across from each other” requirement literally:
the two independently operable gates share one orientation address and are
visible from each other. It also avoids threading a new road through the
stadium, Beacon Inn, the planned amusement pier, or the crater-lake loop.

## Source state and survey

The work used the immutable, read-only snapshot:

`data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`

Directory hash using the repository’s canonical
`filename + NUL + bytes + NUL` algorithm:

`0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`

It also opened `data/world-map.db` read-only at SHA-256:

`1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`

The parcel survey sampled every second x/z column, ignored foliage when finding
structural support, measured water at y `62`, and inventoried block entities
through the full world height.

| Parcel | Bounds x / z | Sampled columns | Water at y62 | Support y |
|---|---:|---:|---:|---:|
| Northwind Water Gardens | `-672..-520 / -720..-674` | 1,848 | 54.4% | 38–65; median 61 |
| Ravencrest Adventure Grounds | `-672..-520 / -650..-520` | 5,082 | 5.0% | 43–115; median 75 |
| Adventure Exchange | `-610..-560 / -673..-651` | 312 | 18.3% | 38–70; median 65 |
| Harborlight Courts | `-518..-448 / -548..-470` | 1,440 | 0.0% | 58–77; median 70 |

The conclusion is unusually clean: the water park goes on the water shelf, and
the dry park goes on the dry ridge. The water park will read as an intentional
pile-deck district, while the dry park can use terrain for its coaster rather
than fighting it with one giant flat platform.

### Protected block entities and generated fabric

The most important finding is a surface ruined portal in Ravencrest:

- observed fabric: x `-632..-610`, y `81..98`, z `-621..-599`;
- protected no-target envelope: x `-637..-605`, y `77..102`,
  z `-626..-594`;
- empty chest at `(-620,93,-612)`;
- 549 netherrack, 39 magma, 14 obsidian, one crying obsidian, one gold block,
  36 stone-brick-family blocks, and the chest.

The park adopts it as **Ember Gate Ruin Garden**, but only from a freestanding
overlook outside the no-target envelope. No source cell or chest is part of a
future operation.

Three deep generated groups also require explicit exclusions:

- two chests and a spawner around `(-617,-45,-710)` beneath Northwind;
- a spawner and chest around `(-559,-35,-590)` beneath Ravencrest; and
- a chest at `(-494,39,-555)` beside/beneath the crater’s west edge.

Northwind foundations may not extend below y `38`. Ravencrest excavation in the
deep-dungeon quadrant may not extend below y `55`. The crater-water package must
prove no hydraulic route to the chest at `(-494,39,-555)`.

### Database and cross-package conflicts

An inclusive AABB test against every `world_features` row found:

- zero intersections for Northwind;
- zero for Ravencrest;
- zero for Adventure Exchange;
- zero for the crater west green link;
- zero for Harborlight Courts; and
- zero for the new road after its authorized tie-in.

The tie-in intentionally intersects only `approach-road:DISTRICT` and
`APPROACH-ROAD:PRIMARY`.

The planned amusement pier is far southeast at x `-428..-274`,
z `-445..-318`. None of the new park, housing, greenbelt or parkway envelopes
intersects it. This work therefore supports, rather than competes with, the
stadium/pier redesign.

## Precedent research and transferable lessons

### Adventureland and Adventure Bay

The [official Adventureland map](https://www.adventurelandpark.com/content/dam/adp/files/pdfs/2023%20Map%20compress.pdf)
shows a readable front gate, Main Street, Town Square, train station, family
rides, major thrill rides, indoor attractions, food clusters, picnic space and
a concentrated water-park zone. The current
[Adventureland ride inventory](https://www.adventurelandpark.com/discover-the-park/adventureland-rides/)
describes a deliberately broad mix: nearly 50 rides and seven coasters, but also
small-family rides, a train, classic rides and indoor experiences.

The current [Adventure Bay overview](https://www.adventurelandpark.com/adventure-bay/)
combines a large wave pool, lazy river, slides and young-family play. The lesson
is not to copy its names or shapes. It is to make a water park with multiple
reasons to stay, clear age/intensity choices, and support distributed near the
attractions.

Transfer to this plan:

1. Ravencrest has a gate street, family grove, coaster, indoor dark ride,
   flat-ride midway, event/food court and a compact circulation loop.
2. Northwind has wave, river, slide, family and quiet-water districts plus its
   own bathhouse and plant.
3. Both parks have multiple day/night anchors. Neither is a one-object park.

### Worlds of Fun and Oceans of Fun

The [official 2026 Worlds of Fun/Oceans of Fun map](https://worldsoffun.enchantedparks.com/wp-content/uploads/sites/12/2026/03/final-wof-reg-season-map.pdf)
shows two separately named main entrances, multiple dry-park districts,
distributed dining and restrooms, an internal railroad, water-park bathhouses,
first aid by the water attractions, rentals, guest services and ride-access
information. The current [operator overview](https://worldsoffun.enchantedparks.com/)
describes a large park organized as distinct themed areas rather than one
undifferentiated midway.

Transfer to this plan:

1. Northwind and Ravencrest share an address but can open, close and secure
   independently.
2. Every district has an identity, support point and route back to the gate.
3. Guest, service and emergency systems are drawn separately.
4. The common map and arrival exchange tell visitors which gate they need
   before they enter a queue.

### Accessibility, operations and water safety

The [United States Access Board amusement-ride guide](https://www.access-board.gov/aba/guides/chapter-10-amusement-rides/)
requires continuous accessible routes to load/unload areas, stable and level
load surfaces, turning space and access signage. It identifies 1:12 as the
normal maximum ramp slope and says the special 1:8 ride exception does not
apply to the queue.

Minecraft translation:

- all primary guest loops are at least seven clear blocks;
- all pool-perimeter and emergency-return walks are at least five clear blocks;
- terrace changes on the primary system use slab ramps and landings targeted at
  no steeper than 1:12;
- ordinary steep stairs can supplement but never replace the primary route;
- load/unload floors are level, and every queue has a signed route that does
  not require backtracking.

The [CDC 2024 Model Aquatic Health Code](https://www.cdc.gov/model-aquatic-health-code/media/pdfs/2024/11/5th-Ed-MAHC-Code-508.pdf)
covers aquatic-facility design, barriers, recirculation/treatment, isolation,
inspection, documentation, depth marking and lighting. Northwind translates
that into separate contained shells, a represented plant/isolation room for
each operating group, barriers at every non-entry edge, visible basin bottoms,
depth/no-diving signs and independent rollback.

The [CPSC amusement-ride standards page](https://www.cpsc.gov/Regulations-Laws--Standards/Voluntary-Standards/Amusement-Rides-Trampoline-Parks-and-Adventure-Attractions)
links ride safety to the ASTM F24 family of voluntary engineering standards.
This plan therefore defines every ride as track/structure plus station, queue,
maintenance, evacuation and clearance—not decorative rails floating in space.

## Selected plan and rejected alternatives

### Selected: facing parks on opposite sides of the north causeway

This layout earns the recommendation because it:

- places water uses on a water shelf and dry rides on dry land;
- produces literal facing gates;
- lets one new road serve both parks without crossing either park;
- gives the stadium a coherent north ring/causeway;
- leaves the crater as a connected green hinge;
- avoids every protected database feature; and
- gives each park an outer service edge.

### Rejected: both parks side by side west/east

This version put their gates across a narrow central spine, but an approach from
Westlight had to travel through the eastern park before reaching the shared
arrival. That would mix public road, queues and water-park service movements.

### Rejected: direct west road through the existing stadium main district

Beacon Inn, the shop row, the stadium footprint and the planned amusement pier
leave no credible surface-road corridor. A road through them would demolish
accepted buildings or consume the future pier mall.

### Rejected: giant flat reclaimed platform

Mass fill would erase the useful ridge, make Northwind read as arbitrary
reclamation, create a very large fluid-edge transaction and repeat the same
“floating object” problem now being corrected in Westlight. The selected plan
uses pile decks, bridges and terrain-following zones.

## North Shore Parkway and Causeway

Centerline, with y expressed as standing level:

| Station | x | y | z | Role |
|---|---:|---:|---:|---|
| 0+000 | -224 | 70 | -496 | accepted-road tie-in |
| 0+025 | -248 | 71 | -500 | land transition |
| 0+187 | -248 | 68 | -662 | east causeway turn |
| 0+383 | -444 | 68 | -662 | north stadium causeway |
| 0+439 | -500 | 68 | -662 | north crater greenbelt |
| 0+499 | -560 | 68 | -662 | arrival approach |
| 0+549 | -610 | 70 | -662 | Adventure Exchange |

The road has 11 clear carriageway blocks, one-block curbs, a five-block
independent greenway on the south/east side and a two-block landscape
separator. Its maximum total half-width is ten blocks. Water spans use pile
bents and a support deck at y `67`; they do not mass-fill the lagoon.

The baseline is water at the sampled causeway nodes `(-248,-662)`,
`(-444,-662)` and `(-500,-662)`, then returns to land near `(-560,-662)`.
That is an engineering instruction: the road is a causeway/bridge object with
explicit spans, not a dirt embankment.

## Adventure Exchange

The shared arrival occupies x `-610..-560`, z `-673..-651`. The carriageway is
centered at z `-662`; a raised pedestrian table occupies x `-602..-568`,
z `-667..-657`.

The Northwind gate is centered on z `-674` and faces south. The Ravencrest gate
is centered on z `-650` and faces north. Each side gets independent:

- ticket/security;
- guest services and accessibility;
- family care;
- first aid;
- rentals/lockers;
- height/admission check; and
- staff control.

This is operationally better than one shared gate: either park can close without
creating an unsecured connection into the other.

## Northwind Water Gardens

The park is an original wind-and-water garden on a public pile deck at support
y `64`, standing y `65`. The active-water top datum is y `64`; natural water at
y `62` remains outside the active shells.

| ID | Attraction | x | z | Program |
|---|---|---:|---:|---|
| NW-WAVE | Breaker Basin | -669..-638 | -710..-682 | wave basin, beach ramp, guards, isolated plant |
| NW-FAMILY | Kestrel Splashworks | -669..-638 | -678..-674 | young-family splash and family-care link |
| NW-RIVER | Tidelace River | -634..-594 | -713..-682 | closed river, two accessible entries, dry perimeter |
| NW-SLIDES | Rainspine Slides | -590..-558 | -713..-681 | tower, three runouts, queue and evacuation stair |
| NW-QUIET | Bluewater Coves | -554..-522 | -696..-674 | quiet pool, cabanas, sensory rest and outlook |
| NW-PLANT | Water plant/service | -554..-522 | -718..-700 | pumps/filters/isolation, shop and storage |
| NW-BATH | Bathhouse/gate services | -634..-594 | -680..-674 | changing, lockers, first aid and admissions |

The seven-block guest loop connects every attraction. A five-block service route
runs on the east edge at x `-526..-520`; the independent emergency return runs
along z `-720..-714`.

Every active venue must be independently enclosed and isolatable. No active
water source may share an open face with the natural water. Fixed before/after
sections must prove the wall, floor, waterline, deck, barrier and plant
relationship.

## Ravencrest Adventure Grounds

Ravencrest is a ridge-and-foundry park, not a level midway stamped over the
terrain. Its public system works between three primary standing levels:

- Gate Terrace y `68`;
- Midway Terrace y `76`; and
- Ridge Terrace y `84`.

| ID | Attraction | x | z | Program |
|---|---|---:|---:|---|
| RC-GATE | Lantern Gate / Founders Avenue | -608..-566 | -650..-630 | gate street and visitor support |
| RC-COASTER | Ridge Runner | -670..-640 | -632..-540 | terrain coaster and full evacuation walk |
| RC-EMBER | Ember Gate Ruin Garden | -637..-605 | -626..-594 | protected ruin and external overlook |
| RC-MIDWAY | Lantern Midway | -604..-566 | -628..-570 | three flat rides, food, games and night axis |
| RC-FAMILY | Rookery Family Grove | -562..-524 | -626..-566 | carousel, small vehicles, play and quiet seating |
| RC-DARK | Foundry Hollow | -635..-606 | -580..-542 | indoor story ride and independent exit |
| RC-SIGNAL | Signal Drop | -612..-596 | -540..-524 | high-point observation/drop landmark |
| RC-EVENT | Meadow Court | -592..-548 | -558..-524 | event lawn, stage, food and weather shelter |
| RC-MAINT | Maintenance compound | -670..-646 | -538..-522 | coaster shop, stores, staff and loading |

Ridge Runner’s station occupies x `-668..-646`, z `-608..-584`,
y `74..86`. The track uses the western terrain so it stays clear of the Ember
Gate no-target envelope. It must have a coherent station → lift → crest → drop
→ supported turn → brake/return sequence, a complete evacuation walk and a
maintenance spur.

The primary seven-block loop is recorded exactly in the machine schedule. The
outer five-block service system may cross it only at the controlled Gate Terrace
crossing.

## Crater greenbelt integration

The park parcels end at x `-520`. A public green link at x `-519..-492`,
z `-638..-520` joins:

- Ravencrest east exit `(-520,72,-580)` to the crater west promenade;
- parkway `(-500,68,-650)` to the crater north loop; and
- the crater southwest loop to Harborlight Courts.

The route is public and outside both ticketed parks. The road remains north of
the crater, so the lake never becomes a traffic island. The planned pier,
stadium and crater green space remain a separate but connected destination
sequence.

## Harborlight Courts

The surveyed housing parcel is fully dry, has no block entities and has a
manageable support range of y `58..77`. The neighborhood keeps the public lake
walk outside its private thresholds at z `-555..-549`.

The architecture is an original medium-density coastal-gabled language:
light stone/quartz masonry, timber, slate or restrained copper roofs, porches,
hedges and planted courts. It is “Hamptons-like” in material restraint,
porch/gable rhythm and landscape—not a copy of a specific residence.

| Project | Bounds x / z | Homes | Floors | Central green | Attached garage |
|---|---:|---:|---:|---:|---:|
| Sea Hedge Court | -516..-487 / -547..-514 | 8 | 3 | -505..-494 / -539..-526 | 4 bays |
| Bayberry Court | -482..-450 / -547..-514 | 8 | 3 | -472..-459 / -539..-526 | 4 bays |
| Dune House Commons | -516..-450 / -506..-472 | 14 | 3 | -491..-474 / -496..-480 | 6 bays |

All three garage wings physically touch their parent building. Garage doors
face Bayberry Lane/service access, never the lake. No private lot interrupts
the public waterfront route.

## Operations and route separation

Each park needs three networks:

1. **Guest:** continuous seven-block primary loop; no service dead ends.
2. **Service:** outer five-block route to every ride, kitchen, plant and
   maintenance room without running through a queue.
3. **Emergency:** a return path from every load platform and attraction high
   point to a gate/first-aid location.

Attractions cannot share one ambiguous exit. The database must record each
queue, load/unload point, accessible entry, service route and evacuation path as
a child of the exact attraction.

## Build sequencing

The safe engineering order is:

1. refresh snapshot, world database and cross-package target register;
2. protect the four block-entity groups and Ember Gate fabric in code;
3. release the causeway substructure and independent greenway;
4. release Adventure Exchange and prove both gates;
5. release Northwind deck/plant before any active water shell;
6. release and leak-test one contained water venue at a time;
7. release Ravencrest terraces and guest/service loops;
8. release one complete ride object at a time, including evacuation;
9. release crater link and Harborlight streets/public lake walk;
10. release each housing court with its attached garage in the same transaction;
11. take an immutable post snapshot and run independent object, route, water,
    rollback, database and media QA.

No phase may replay an older accepted forward file.

## Acceptance and evidence

A physical release is accepted only after:

- a fresh same-moment snapshot and hash;
- exact source guards and exact rollback;
- zero unexplained protected-feature, block-entity, fluid-neighbor or package
  intersections;
- live entity/player clearance;
- contained-water simulation and post-state leak census;
- ride support/clearance/queue/maintenance/evacuation QA;
- bidirectional normal-walk QA for both gates, every guest loop, attraction,
  service path, greenway, housing street and public lake path;
- matched before/after maps and exact-object captures;
- world-feature/room/route/media import with foreign-key integrity; and
- publication to Sites and Box only after the as-built evidence passes.

Required publication material includes a westward regional master map, road
station/bridge plan, paired-gate plan, both park plans, water-containment
sections, ride-clearance diagrams, crater/greenbelt/housing plan, floor plans
and exact database-to-screenshot relationships for every attraction and
housing building.
