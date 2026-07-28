# MainStreet Underground Warehouse and Panorama RV District Engineering Memo

Document ID: `TE-MSA-UNDERGROUND-WAREHOUSE-RV-DISTRICT-ENGINEERING-01`  
Date: 2026-07-28 UTC  
Decision: **SITED DESIGN BASIS / NOT AN EXECUTABLE RELEASE**  
Mode: copied-snapshot and read-only-database analysis; no Minecraft, RCON,
database, Sites, or Box mutation

The exact machine schedule is
[`mainstreet-underground-warehouse-rv-district-engineering.json`](mainstreet-underground-warehouse-rv-district-engineering.json).
It controls whenever prose and coordinates diverge.

## 1. Outcome

Two compatible facilities are now sited:

1. a 93×82-block, ten-block-clear high-bay logistics and vehicle hall under
   the western half of MainStreet USA’s P01 parking field; and
2. a 206×201-block RV sales/service/travel district on the unregistered
   peninsula southwest of Panorama Oasis, connected by a 112-block side road.

The underground chamber stops at y=61. P01’s parking surface is y=64, leaving
y=62 and y=63 as two untouched support courses. The chamber does not enter
C01. Its west earth-ramp portal mirrors the east-side bunker arrival in the
parking composition without sharing C01’s structures, tunnels, rooms, or
routes.

The RV campus contains twelve exact-length, walk-in display vehicles—four each
at 29, 39, and 48 blocks/feet—plus a lavish delivery/customer building,
separate sales building, four-bay semi-height repair shop, original
upper-Midwest-style travel center, fuel canopy, dive bar, and discreet,
non-graphic adult nightclub.

These are coordinate and program decisions, not construction claims.

## 2. Evidence boundary

### 2.1 Immutable snapshot

Source:

`data/worldsnap-town-expansion-complete-baseline-20260728T0315Z/region`

Aggregate SHA-256:

`0bb1faa61ca69724816afe682080e3a517fa974ec1300c3651e399ea03505501`

Identity:

- 9 Anvil region files;
- 59,287,653 bytes; and
- algorithm
  `sha256(filename + NUL + bytes + NUL, sorted by filename)`.

### 2.2 Read-only database

`data/world-map.db`

SHA-256:

`1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`

The database opened read-only and contained 875 features, 23 scans, and 1,881
observations. It was not updated.

### 2.3 Exact chamber census

The chamber census covered every cell in:

`[-112,50,181]..[-20,61,262]`

Results:

| Measure | Result |
|---|---:|
| Inclusive volume | 91,512 cells |
| Chunks read / missing | 36 / 0 |
| Full water blocks | 0 |
| Lava blocks | 0 |
| Air / cave air / void air | 0 |
| Block entities | 0 |
| Waterlogged glow-lichen states | 6 |

The chamber is solid natural material, but it contains aquatic plant material
and six waterlogged states. The wider survey found an aquifer below and west
of the chamber, especially around y=47–49. That is why the design uses a
continuous liner, threshold drain, sump, and an uncompromisable
neighbor-fluid gate. “Zero full water blocks in the chamber” is not permission
to skip hydrology checks.

## 3. Research basis

The plan converts real guidance into conservative Minecraft geometry; it does
not claim real-world code approval.

- OSHA’s [warehousing guidance](https://www.osha.gov/warehousing/hazards-solutions)
  requires permanent aisles to remain clear and marked, warns about forklift
  and pedestrian conflicts, calls for dock-edge warnings, ventilated battery
  charging, and unobstructed exit routes.
- OSHA’s [narrow-aisle guidance](https://www.osha.gov/etools/powered-industrial-trucks/workplace/narrow-aisles)
  says conventional counterbalanced-truck rack layouts typically require
  about a 12-foot aisle. The rack hall therefore reserves twelve clear blocks
  and does not pretend that decorative three-block gaps are forklift aisles.
- OSHA’s [enclosed and hazardous-area guidance](https://www.osha.gov/etools/powered-industrial-trucks/workplace/enclosed-hazardous-areas)
  requires adequate ventilation where internal-combustion vehicles operate.
  The underground vehicle hall therefore receives dedicated exhaust,
  carbon-monoxide monitoring, and a no-idling operating rule.
- OSHA [1910.36](https://www.osha.gov/laws-regs/regulations/standardnumber/1910/1910.36)
  is the egress baseline: permanent remote exits, direct discharge,
  fire-separated stairs, adequate width/headroom, and outward-swinging doors
  where required. The hall has three surface stairs rather than relying on the
  vehicle ramp.
- The U.S. Access Board’s
  [ADA standards](https://www.access-board.gov/ada/) control pedestrian
  accessibility principles. A separate accessible-feeling stair/lift
  equivalent remains an engineering gate; the vehicle ramp is not represented
  as an accessible pedestrian ramp.
- The FHWA
  [Truck Parking Development Handbook](https://ops.fhwa.dot.gov/freight/infrastructure/truck_parking/docs/Truck_Parking_Development_Handbook.pdf)
  supplies the WB-67 swept-path method and design-vehicle discipline. Both the
  warehouse ramp and RV repair loop require simulated swept paths before an
  operations file can exist.
- RVIA’s [standards program](https://www.rvia.org/standards-regulations)
  treats an RV as a vehicle containing temporary living quarters and
  emphasizes complete electrical, plumbing, heating, fire, and life-safety
  systems. Display units therefore receive real walk-in programs rather than
  empty colored shells.
- NFPA 30A’s motor-fuel and repair-garage separation principles appear in the
  NFPA-hosted
  [NFPA 1 extract](https://docinfofiles.nfpa.org/files/AboutTheCodes/1/NFPA_1_Proposed_TIA_1918_30A_extracts.pdf).
  The fuel court and repair shop are different hazards, and neither shares a
  circulation path with food or nightlife queues.
- EPA’s
  [UST release-prevention guidance](https://www.epa.gov/ust/release-prevention-underground-storage-tanks-usts)
  informs the travel-center spill/overfill-control diagram. Minecraft tanks
  are symbolic; no real fuel-system compliance claim is made.
- The [2022 FDA Food Code](https://www.fda.gov/food/fda-food-code/food-code-2022)
  informs protected receiving, prep, warewashing, handwashing, waste, and
  service paths. Warehouse cafeteria/kitchen, travel-center kitchen, bar
  kitchen, and club pantry are separate operations.
- NIST’s
  [Station nightclub findings](https://www.nist.gov/el/key-findings-and-recommendations-improvement-nist-investigation-station-nightclub-fire)
  are controlling caution for the club: automatic suppression concept,
  multiple genuinely remote exits, distributed exit capacity, low-level
  wayfinding, no pyrotechnics, and no ignitable foam aesthetic.
- The U.S. Department of Defense
  [Supply and Administration Warehouse Design Guide](https://www.wbdg.org/FFC/AF/AFDG/ARCHIVES/supplyadministrationwarehouse.pdf)
  informs the legible sequence from receiving through distribution, counter
  service, administration, open warehouse, and loading functions.

## 4. Underground warehouse siting

### 4.1 Chamber and surface contract

| Element | Inclusive bounds / elevation |
|---|---|
| Outer chamber | `x[-112,-20] y[50,61] z[181,262]` |
| Clear interior | `x[-110,-22] y[51,60] z[183,260]` |
| Structural floor | y=50 |
| Ten-block clear high bay | y=51..60 |
| Structural roof | y=61 |
| Untouched support | y=62..63 |
| Existing parking | y=64 and above |

No package may touch y=62–64 inside the chamber footprint. Every one of P01’s
236 bays, its six registered drive aisles, crosswalks, accessible pods,
canopies, lamps, low lights, bicycle corral, and walking routes must compare
identically before and after.

The chamber occupies the west lot to avoid C01, whose registered complex begins
at x=100. The nearest Raven Rock personnel-route geometry is around y=-10..3,
leaving at least 46 blocks below the warehouse floor.

### 4.2 West earth ramp

The ramp is an original planted earth cut opposite the parking-side C01
entrance:

`x[-136,-108] y[50,69] z[167,248]`

Centerline:

```text
(-131,64,171)  west surface mouth
(-131,64,176)  level transition
(-131,58,236)  first run, 60 horizontal / 6 fall = 10.0%
(-125,58,244)  protected hairpin landing
(-118,58,236)  return transition
(-118,51,173)  second run, 63 horizontal / 7 fall = 11.11%
(-112,51,184)  receiving threshold
```

The vehicle envelope is ten blocks wide and eight blocks high. Five-block
transition zones soften the top, hairpin, and bottom grade breaks. The ramp
also gets:

- a separate raised pedestrian refuge;
- high-visibility barriers and end protection;
- drain trench, sump, and leak alarm at the low threshold;
- height bars before descent;
- retaining-wall ribs, planted roof, and stone portal;
- no fuel use; and
- RV plus WB-67 swept-path proof.

The ramp is not an exit substitute. A vehicle fire or disabled RV cannot be
allowed to remove the only means of escape.

### 4.3 High-bay program

#### Receiving

`UW01-RECEIVING`, `x[-110,-82] z[183,200]`

The arrival sequence is ramp → inspection → quarantine/staging → rack or
vehicle zone. A protected pedestrian island keeps staff out of the turning
envelope.

#### Rack hall

`UW01-RACK-HALL`, `x[-110,-52] z[203,260]`

Five long rack runs use end guards, heavy-load-low logic, overhead lighting,
and twelve-block clear conventional-truck aisles. No rack end may interrupt an
exit line, fire cabinet, or cross aisle.

#### RV/camper storage

`UW01-VEHICLE-STORAGE`, `x[-79,-52] z[183,200]`

Eight six-by-22 clear stalls provide engine-off indoor storage, battery
isolation, detection/ventilation, and protected pedestrian access. There is no
fueling underground.

#### Offices and food

The east support spine contains:

- offices/dispatch at `x[-49,-24] z[183,207]`;
- staff cafeteria at `x[-49,-36] z[210,231]`; and
- commercial kitchen at `x[-33,-24] z[210,231]`.

The kitchen has its own receiving vestibule, stores, prep, cook, warewash, and
waste-hold sequence. A full-height compartment and clean-side route separate
it from vehicle storage, battery charging, plant, loading, and the private
wellness wing.

#### Adult wellness and relief suite

The non-graphic private suite occupies:

`x[-33,-24] y[51,56] z[234,260]`

It contains a privacy vestibule, four single-user relief rooms, a larger
accessible-feeling room, wash/support, and quiet recovery lounge. It has
opaque walls, separate exhaust, dedicated sanitation, and no direct door into
food, warehouse, loading, or mechanical rooms. The memo intentionally assigns
no graphic or sexualized fixtures.

### 4.4 Egress and plant

Three remote stairs discharge outside the chamber:

| ID | Bounds | Surface discharge |
|---|---|---|
| `UW01-EXIT-NW` | `[-136,50,167]..[-127,69,181]` | `(-132,65,169)` |
| `UW01-EXIT-SW` | `[-134,50,258]..[-125,69,271]` | `(-130,65,268)` |
| `UW01-EXIT-NE` | `[-19,50,167]..[-10,69,180]` | `(-15,65,169)` |

The exact surface heads are perimeter structures, not parking-bay removals.
They still require a fresh P01 child-feature and block-state gate.

Mechanical space at `x[-49,-36] z[234,247]` reserves separate vehicle exhaust,
outside air, battery exhaust, CO/NO2 detection concept, fire riser, drainage,
sump, and leak alarm. It is a functional room, not decorative fans.

## 5. Panorama RV sales and service district

### 5.1 Siting

Campus:

`x[-350,-145] y[60,112] z[-380,-180]`

The exact campus contains no registered detailed database feature and no block
entity. It overlaps only the broad MainStreet/Raven Rock property contexts at
its northeast edge. The land is a rolling peninsula: the surveyed candidate
surface ranged roughly y=62..95, with a dry central/east upland and water at
lower west/north edges.

This is a terraced-landscape project. It is not permission to flatten a
206×201 rectangle. The release must retain useful high ground, bridge local
drainages, and publish a per-column grading balance.

### 5.2 Panorama Service Parkway

The 112-block side-road centerline is:

```text
(-230,70,-474)  Panorama Oasis south forecourt
(-242,69,-451)
(-256,67,-428)
(-271,72,-405)
(-286,77,-381)  RV campus gate
```

It has a twelve-block carriageway, three-block shoulders, a separate six-block
walking greenway, protected wet crossings, and a 60-block-diameter RV turning
bulb at the gate. Its selected line stays east of the registered Malt &
Lantern, Gatehead, Ferry, and High Street buildings. The broader survey box
contained 26 block entities, all inside those protected Westlight buildings;
the selected centerline does not enter their bounds.

### 5.3 Display rows

The display field is:

`x[-342,-246] y[74,90] z[-370,-212]`

Longitudinal scale is one block per named foot. Vehicle widths are expanded to
five or six blocks so the interiors are actually walkable.

| Row | Units | Exact longitudinal ranges | Height |
|---|---:|---|---:|
| 29-foot | `RV29-A..D` | z=-360..-332 | y=78..83 |
| 39-foot | `RV39-A..D` | z=-321..-283 | y=78..84 |
| 48-foot | `RV48-A..D` | z=-272..-225 | y=78..85 |

The four x positions for the 29/39 rows are `[-338,-334]`,
`[-326,-322]`, `[-314,-310]`, and `[-302,-298]`. The 48-foot row uses
six-block-wide bodies at `[-338,-333]`, `[-325,-320]`, `[-312,-307]`,
and `[-299,-294]`.

Each unit must visibly include:

- cab or hitch nose;
- entry steps and operable-feeling door;
- galley;
- dinette/lounge;
- washroom;
- sleeping zone;
- storage;
- roof equipment and running lights; and
- exact model placard, floor plan, exterior, entry, and interior capture.

### 5.4 Customer, sales, and repair buildings

The lavish customer/delivery center occupies:

`[-238,76,-370]..[-195,101,-337]`

It gets a two-story atrium, concierge, lounge, finance suites, handover
theater, hospitality cafe, family room, roof terrace, and complete support
rooms. Expensive means generous circulation, layered materials, daylight,
acoustics, and complete operations—not random ornament.

The separate sales building occupies:

`[-238,74,-330]..[-195,94,-302]`

It contains a model gallery, open sales desks, private consultation, trade-in
appraisal, secure documents, and staff support.

The repair shop occupies:

`[-238,72,-294]..[-174,101,-242]`

Four west-face doors each provide 12×16 clear blocks:

- Door 1: z=-292..-281;
- Door 2: z=-279..-268;
- Door 3: z=-266..-255; and
- Door 4: z=-253..-242.

The `x[-298,-239] z[-299,-231]` service court supports straight staging and
WB-67/RV swept-path checks. Parts, tools, technician support, waste/fluid hold,
service writing, and mechanical exhaust are all programmed.

### 5.5 Travel center

The original upper-Midwest-style travel center—not a copied Kwik Star
building—occupies:

`[-238,72,-232]..[-195,94,-190]`

It includes a market, hot-food kitchen, coffee/bakery, seating, driver lounge,
showers, toilets, laundry, dispatch kiosk, and a separate delivery/waste path.

The pull-through fuel court is:

`[-296,71,-226]..[-246,86,-184]`

Its representation includes a high-clear canopy, separate RV and car lanes,
emergency shutoff, spill-control grading, and symbolic protected tank zone.
Fuel traffic never uses a food receiving court or nightlife queue.

### 5.6 Roadhouse and adult club

The dive bar occupies:

`[-188,72,-232]..[-155,90,-207]`

It contains a bar, booths, small stage, backbar, toilets, compact separate
kitchen, rear delivery door, and two remote exits.

The private adult nightclub occupies:

`[-188,72,-276]..[-150,96,-239]`

It is non-graphic and has:

- discreet frontage;
- age-control vestibule at
  `[-188,73,-260]..[-180,81,-251]`;
- coat/check reception;
- main lounge;
- dance/performance room;
- private non-graphic wellness rooms;
- toilets and staff/security;
- a separate service pantry;
- a rear service path at
  `[-149,72,-278]..[-145,86,-232]`;
- one main and two remote exits;
- suppression/alarm concept and low-level wayfinding; and
- no pyrotechnics or ignitable-foam decoration.

The patron queue, fuel lanes, repair court, food receiving, and club service
route never share a pinch point.

## 6. Circulation rules

The RV district reserves:

- 24-block main vehicle aisles;
- 20-block clear fire/service lanes;
- 60-block-diameter turning bulbs;
- six-block protected pedestrian promenades;
- one-way display loops where practical; and
- a service route behind the repair, food, bar, and club buildings.

Those generous dimensions are design reserves, not final code claims. The
generator must run a discrete swept-path simulation for every 48-foot display
unit, repair-bay movement, fuel pull-through, delivery route, and emergency
route. No “it looks wide” acceptance is allowed.

## 7. Collision and preservation decision

### Underground warehouse

- zero missing Anvil chunks;
- zero block entities;
- zero chamber air/cave-air, full-water, or lava cells;
- zero known 3D database-feature intersections in the y=50..61 chamber;
- C01 begins at x=100, 120 blocks east of the chamber’s east wall;
- P01 detailed features remain above at y=64+; and
- Raven Rock route geometry remains more than 46 blocks below.

### RV district

- zero missing chunks in the selected campus;
- zero block entities in the selected campus;
- zero detailed registered database features in the selected campus;
- two broad contextual records cross the northeast portion and require
  district-owner coordination;
- 26 block entities in the broad Oasis-to-campus survey belong to existing
  Westlight buildings outside the selected road centerline; and
- water, trees, grade, caves, gravity blocks, entities, and concurrent future
  packages still require a fresh exact-cell audit.

The database is not a substitute for block-state collision detection. “No
registered feature” does not mean “empty.”

## 8. Required release package

No live work is authorized until every gate passes:

1. freeze and hash a same-moment immutable snapshot;
2. refresh exact database and concurrent-package intersections;
3. enumerate every forward cell and exact reverse cell;
4. prove P01 y=62..64 and every parking child unchanged;
5. census block entities, containers, inventories, fluids, waterlogged cells,
   gravity blocks, caves, support, and entities with a three-block halo;
6. simulate warehouse ramp, 48-foot RV, fuel, repair, delivery, fire, and
   emergency swept paths;
7. independently review egress, fire separation, ventilation, kitchen,
   sanitation, fuel, repair, assembly, and wellness separation;
8. preflight forward and rollback with strict no-op behavior;
9. clear players/entities and lock the transaction order;
10. commit atomically or compensate in exact reverse order;
11. freeze and hash the post snapshot;
12. prove installed state and exact rollback;
13. run every pedestrian route bidirectionally without dig/tower/flight and
    run machine vehicle-clearance tests;
14. capture matched before/after evidence;
15. import database objects/rooms/routes/media only after physical acceptance;
16. verify database integrity and zero foreign-key failures;
17. regenerate maps, floor plans, catalog, PM PDF, and owner-only Sites
    version; and
18. sync the accepted register to Box and compare every remote SHA-1.

## 9. Media and database contract

Required maps:

- north-up P01 surface/underground overlay;
- y=50 high-bay plan;
- ramp profile and swept-path plan;
- rack/vehicle/pedestrian conflict plan;
- egress/fire-compartment plan;
- food/plant/wellness separation plan;
- Panorama-to-RV regional route;
- RV campus figure-ground and grading;
- RV display-row plan;
- customer/sales/repair/travel/nightlife plans; and
- fuel/service/fire-lane plan.

Required screenshots include matched surface parking views, west portal,
ramp top/hairpin/bottom, receiving, every rack aisle, vehicle row, offices,
cafeteria, kitchen, plant, non-graphic wellness vestibule/rooms, all twelve RV
exteriors/entries/interiors, four repair doors, customer atrium, sales gallery,
travel center, fuel pull-through, dive bar, club frontage/age vestibule/main
room, and separate service routes.

Every final object and room requires a stable external ID, parent relation,
exact post bounds, immutable snapshot identity, floor-plan relation, primary
camera relation, media hash, route relation where applicable, and accepted
database-import ledger.

## 10. Final engineering decision

The two sites are defensible enough to advance into detailed surveying and
package generation:

- the underground chamber is deliberately shallow, solid, and west-held;
- the parking field remains structurally and functionally untouched above it;
- the vehicle ramp is remote from C01 and is not counted as the sole exit;
- food, vehicles, battery/plant, wellness, fuel, repair, and assembly uses are
  separated;
- the RV campus has exact capacity and building envelopes; and
- the selected campus and road avoid known detailed database objects.

They are not yet safe to build. The remaining uncertainty is exact-cell
engineering: source states, aquifer neighbors, surface grading, protected
vegetation, simultaneous project envelopes, dynamic entities, and complete
forward/rollback generation.
