# World Redevelopment Master Plan

Date: 2026-07-27  
Status: program design source; no live-world construction authority  
Implementation state: **DESIGN ONLY**. This planning/research work performed no
live-world mutation, service restart, build operation, or Sites deployment.
Build teams must append their own preflight, authorization, execution, and
verification evidence.
Program alias: **GrandStreet America** in user-facing material; retain
`mainstreet-america` for database, script, region, and file identifiers.

## 1. Purpose

This plan turns the redevelopment request into a controlled development
program. It governs:

- the MainStreet America street, plot, frontage, garage, civic, service, and
  secure-complex work;
- the Westlight stadium focal-screen and sightline correction;
- tunnel, stair, stairwell, route, and wayfinding standardization;
- the worldwide building-by-building design review;
- the new whole-world and detailed atlas;
- database-to-media identity and the public showcase;
- research, alternatives, approvals, phased delivery, QA, and rollback.

It does not authorize a live build. Exact operations must be produced and
accepted through the packages in `execution-register.md`.

## 2. Decisions and evidence hierarchy

The program follows this order:

1. Current user intent and recorded decisions.
2. This approved master plan, its regulating plan, and
   `infrastructure-standards.md`.
3. The immutable program snapshot and its exact SHA-256 in `README.md`.
4. The spatial catalog and a scan pinned to that same snapshot.
5. Snapshot-guarded generators and operation files.
6. Historic plans, manifests, and narrative reviews.

An older document or a database score of 100 cannot override an observed
experience defect. In particular, "complete" currently proves that an object
exists and passed its recorded census; it does not prove that the object is
well-sited, legible, pleasant to walk, visually concealed, or correctly
oriented.

### 2.1 Current catalog census

The read-only audit of `data/world-map.db` found:

| Measure | Count |
|---|---:|
| Features | 780 |
| Complete features | 779 |
| Removed features | 1 |
| Complete scans | 18 |
| Feature observations | 1,786 |
| Room features | 259 |
| Parking features | 237 |
| Building features | 68 |
| Road features | 19 |
| District features | 19 |

Project feature totals are:

| Project ID | Features |
|---|---:|
| `mainstreet-america` | 579 |
| `ravensreach` | 63 |
| `westlight-district` | 59 |
| `raven-rock` | 39 |
| `westlight-venue` | 25 |
| `ravensgate` | 13 |
| `approach-road` | 2 |

The older worldwide review's 236 named-room count predates the latest secure
complex work. The current database contains 259 `room` rows. MainStreet alone
contains 126 room rows. Counts in final publications must be generated, not
copied from prose.

### 2.2 Provenance warning

Two database scans cite
`data/worldsnap-mainstreet-secure-wave5-post-20260727/region` with different
hashes. The later legacy scan records
`8fbf6997638da3ef36f200ce73315e0becbea3746ffbc350817cb3d1b0de66ac`;
an earlier scan records a different hash for the same path. A snapshot path was
therefore reused or changed.

The new program baseline in `README.md` supersedes those scan inputs. Every
future snapshot directory must be immutable and content-addressed. A scan must
store both its directory and full hash. Reusing a directory name is a
stop-work condition.

## 3. Master-plan principles

The plan adapts primary-source planning guidance to the Minecraft world:

1. **Connected hierarchy.** Use a modified grid with recognizable main,
   residential, cross, service, alley, pedestrian, and tunnel routes.
2. **Front doors define streets.** Every public building and home has an
   unmistakable address street, visible entry, and arrival sequence.
3. **Service does not dominate.** Garages, freight, refuse, utilities, and
   secure access remain functional but use side, rear, screened, or
   purpose-designed approaches.
4. **Build compactly before relocating.** Repair weak frontage, missing links,
   landscape, and wayfinding before moving large protected structures.
5. **Separate incompatible adjacencies.** Community, education, visitor, and
   residential uses can reinforce walkability; industrial loading remains
   buffered from homes.
6. **Design from the player's eye.** Plan-view connectivity is necessary but
   insufficient. Every major route and destination is reviewed at pedestrian
   eye height from recorded cameras.
7. **Show the source.** Maps, screenshots, database rows, reports, and the
   website must identify their snapshot and feature IDs.
8. **Pilot, measure, then make permanent.** Temporary or reversible mockups
   precede expensive relocation.

These principles align with the
[DoD Installation Master Planning standard](https://stg.wbdg.org/FFC/DOD/UFC/ufc_2_100_01_2020_c2.pdf),
the [EPA smart-growth principles](https://www.epa.gov/smartgrowth/about-smart-growth),
and the [NACTO Urban Street Design Guide](https://nacto.org/publication/urban-street-design-guide/).
The exact block dimensions in this package are project adaptations, not claims
that Minecraft is governed by those real-world standards.

## 4. Existing conditions

### 4.1 MainStreet street and block structure

The campus is not a blank site. Its existing geometry already supports a
coherent three-spine plan:

| ID | Name | Existing approximate geometry | Planned role |
|---|---|---|---|
| R01 | Main Street | x=-4.5..4.5, z=-294.5..289.5 | Ceremonial and visitor spine |
| R02 | West Lane | x=-83.5..-80.5, z=-219.5..85.5 | West residential/local street |
| R03 | East Avenue | x=81.5..86.5, z=-220.5..72.5 | East residential/local street |
| R04 | South Cross | z=81.5..86.5 | Arrival and visitor cross street |
| R05 | Garden Cross | z=15.5..18.5 | South residential cross street |
| R06 | Brick Cross | z=-84.5..-81.5 | Middle residential/cooking-school cross |
| R07 | Service Cross | z=-219.5..-216.5 | Northern service cross street |

The six extra homes already occupy outer rows beside R02 and R03:

- west: C02, C04, and C06 at x=-78..-62;
- east: C03, C05, and C07 at x=62..78.

The original twelve homes occupy the inner rows on Main Street. The user’s
desired two-street logic can therefore be created by assigning frontages and
rear service access rather than moving all eighteen houses.

### 4.2 Perception and adjacency diagnosis

The observed problem is not simply that every object is too close or too far.
It is a combination of:

- several public identities competing at corners;
- weak or blank frontage between road and entry;
- no consistent address hierarchy on outer homes;
- long cross-street intervals in the north residential block;
- service and secure edges reading as public façades;
- planning labels that exist in the database but are not visible in the world;
- map-level completion without eye-level decision testing.

The plan therefore requires a figure-ground, frontage, and view-corridor test
before any relocation. Relocation is justified only when frontage, landscape,
signage, and route changes cannot meet the acceptance gate.

### 4.3 MainStreet secure complex

Current recorded extents include:

| Object | Bounds |
|---|---|
| P01 visitor parking | x=-125..125, z=172..305 |
| C01 secure complex | x=100..300, z=70..235 |
| C01 public entry | x=90..130, z=171..205 |
| Surface hangar | x=176..234, z=138..181 |
| Observatory | x=175..235, z=137..182 |
| Shelter | x=148..188, z=143..180 |
| Grand vault | x=230..262, z=184..226 |

P01 records 236 verified parking spaces. The parking row count of 237 includes
the P01 parent plus its individual parking features.

The public entry overlaps the parking’s eastern composition. Exterior evidence
also shows concrete retaining and hangar mass where the catalog describes an
earth-covered complex. Moving the entire C01 volume would disturb a large,
interdependent vertical stack and push against the project edge. The preferred
solution changes its surface expression and public approach while preserving
the deep program.

### 4.4 Westlight venue

The active stadium generator creates a 23-terrace all-around bowl, radial
aisles, a field, and a small north concert platform. It does not create a
scoreboard or video screen. An older Infinity Screen operation belonged to a
retired venue and never ran. This is a confirmed, not speculative, defect.

The below-grade Westlight theatre is a different room. Its fan-shaped seating
is centered on a north end stage. The stadium and theatre require separate
sightline and arrival tests.

### 4.5 Tunnels and vertical circulation

Prior QA proves that named routes are connected and that occupied floors have
routes. The user’s direct feedback proves that the routes are not uniformly
comfortable or self-explanatory. Flood-fill and bidirectional reachability do
not measure:

- walking speed or input burden;
- unexpected one-block grade changes;
- consistent tread rhythm;
- landing comfort;
- turn count;
- decision comprehension;
- whether a player must jump, sprint, crouch, or backtrack.

The master plan adopts experience QA in addition to block and graph QA.

## 5. Alternatives

### 5.1 MainStreet

| Alternative | Description | Benefit | Cost/risk | Decision |
|---|---|---|---|---|
| M-A | Regulate existing only | Fastest; preserves everything | May leave outer rows ambiguous | Reserve |
| M-B | Three spines, outer-house refronting, rear alleys | Meets two-street intent with limited relocation | Requires garage/alley collision design | **Preferred** |
| M-C | Full replat and building relocation | Most uniform diagram | High asset, data, floorplan, and identity risk | Reject unless M-B fails |

### 5.2 C01 secure complex

| Alternative | Description | Benefit | Cost/risk | Decision |
|---|---|---|---|---|
| C-A | Move complete underground stack east/deeper | Literal interpretation | Extreme risk; project-edge and protected-asset conflicts | Reject absent executive mandate |
| C-B | Re-portal, reclaim parking edge, side road, landform wrap | Achieves visual and parking outcome while preserving deep program | Requires terrain and route design | **Preferred** |
| C-C | C-B plus rebuild/earth-berm surface hangar | Stronger concealment | Larger guarded operation | Preferred if C-B cannot meet viewpoints |
| C-D | Fully relocate observatory and restore mountain | Literal all-underground appearance | Removes intentional civic landmark | Decision option |

### 5.3 Stadium screen

| Alternative | Description | Benefit | Cost/risk | Decision |
|---|---|---|---|---|
| S-A | Dual-sided center-hung oval/ring | Serves the all-around bowl | Must clear canopy and field sightlines | **Preferred** |
| S-B | Two end boards | Simple | Poorer side/end viewing | Reserve |
| S-C | Center ring plus stage-side IMAG boards | Best sports/concert flexibility | Highest visual complexity | Enhanced option |

Samsung's official description of SoFi Stadium's
[dual-sided center-hung Infinity Screen](https://news.samsung.com/us/sofi-stadium-samsung-reveal-new-name-videoboard-the-infinity-screen-by-samsung)
is the functional precedent, not a requirement to copy its branding or scale.

### 5.4 Tunnels

| Alternative | Description | Benefit | Cost/risk | Decision |
|---|---|---|---|---|
| T-A | Palette and signs only | Low disruption | Geometry stays uncomfortable | Reject as sole remedy |
| T-B | Typology plus selective regrade/reroute | Balances uniformity and asset protection | Requires segment inventory | **Preferred** |
| T-C | Replace all tunnels | Complete uniformity | Maximum collision/outage risk | Reject unless segment cannot be repaired |

## 6. Preferred MainStreet regulating concept

All coordinates in this section are study envelopes. They are not build
coordinates until the exact baseline collision and grade report passes.

### 6.1 Street hierarchy

1. Preserve R01 as the nine-block ceremonial main street.
2. Study widening R02 from three to five blocks only where property, fence,
   gate, terrain, and building masks permit.
3. Preserve R03 at five blocks.
4. Preserve R04–R07 and make their hierarchy visible through material,
   planting, signs, and intersection design.
5. Study a new R08 near z=-120 between R02 and R03. Its purpose is to divide the
   present 135-block R06-to-R07 interval. The final centerline must avoid B02,
   H04/H05/H10/H11, grades, fences, and landscape.
6. Study three-wide shared service alleys centered near x=-55 and x=55 through
   the residential rows. Interrupt or raise them at public cross streets rather
   than allowing them to compete as through roads.

### 6.2 House frontage and garage schedule

| Houses | Public address | Garage/service side | Planning intent |
|---|---|---|---|
| H01–H06 | R01/Main Street | Rear/outward to west alley | Preserve historic inner row |
| H07–H12 | R01/Main Street | Rear/outward to east alley | Preserve historic inner row |
| C02/C04/C06 | R02/West Lane | Rear/inward to west alley | Make west outer row a real street |
| C03/C05/C07 | R03/East Avenue | Rear/inward to east alley | Make east outer row a real street |

Every home receives a believable garage. Garage doors use a side or rear route
where possible, sit at least two blocks behind the principal front façade, and
occupy no more than 40 percent of the front-facing building width. A public
front door and walk remain obvious. The real-world basis is the
[Houston Heights setting guidance](https://www.houstontx.gov/planning/HistoricPres/HistoricPreservationManual/historic_districts/heights_setting.html),
the [Houston Old Sixth Ward guidelines](https://houstontx.gov/planning/HistoricPres/Sixth_Ward/OSW_DG_Guidelines.pdf),
and [Portland's community design standards](https://www.portland.gov/sites/default/files/code/218-comm-design-stds_0.pdf).

The six C02–C07 database records must receive valid parents in the approved
block/parcel hierarchy before media and construction releases.

### 6.3 Cooking school

B02 occupies x=-133..-88, z=-118..-73. Its east wall is only about four blocks
from R02's west edge. Do not move it during the first intervention.

Create:

- a visible culinary-school entrance on the R02 side;
- an address blade and canopy visible from R06 and R02;
- a public teaching/dining threshold within the parcel;
- a continuous public walk to R06;
- a west/rear loading and refuse route;
- planting or a wall that screens loading from homes.

Measure the after condition from R02 southbound, R02 northbound, R06 eastbound,
and the nearest home front.

### 6.4 Warehouse

B03 occupies x=-24..23, z=-278..-232. It remains the northern terminus because
industrial freight should not be pulled into the residential blocks.

Create:

- a public office/showroom expression toward Main Street;
- a clear terminus landmark and address;
- a screened loading/service court related to R07;
- planting and walls between freight and residential views;
- a route that never requires service movement through a front garden.

### 6.5 Visitor and civic anchors

- B01 becomes the principal orientation center and first "you are here" map.
- GRID-W2 becomes the maker/learning landmark at the west cross street, with a
  distinct loading side.
- GRID-E2 becomes the neighborhood garden/clubhouse landmark at the east cross
  street.
- The detention pond remains an ecology destination and stormwater visual
  terminus, not leftover space.

### 6.6 View corridors and decision nodes

At each R01/R04–R07 and R02/R03 cross-street decision:

- show the continuing route;
- identify at least the next two useful destinations;
- keep the same destination name on successive signs;
- preserve a five-block corner visibility envelope unless a documented
  landmark occupies it;
- provide a map at major district entries and a confirmation marker before the
  next decision.

The source principles are the
[NPS Wayside Guide](https://www.nps.gov/subjects/hfc/upload/Wayside-Guide-First-Edition.pdf)
and [FHWA pedestrian wayfinding guidance](https://highways.dot.gov/safety/pedestrian-bicyclist/pedestrian-safety-guide-transit-agencies/chapter-3-actions-increase).

## 7. Preferred C01 concept

### 7.1 Public portal and road study envelope

The existing public portal x=90..130, z=171..205 occupies the visual seam
between P01 and the mountain. The preferred concept:

1. Retains the current underground concourse and protected deep rooms.
2. Studies a new public portal and road immediately east of the parking edge,
   initially within x=132..150, z=171..235.
3. Connects the new portal back into the existing underground public
   circulation by a guarded dogleg.
4. Restores the retired west entry as parking, garden, or natural landform.
5. Keeps secure/service access separate from public arrival.

The x=132..150 envelope is deliberately provisional. It borders shelter and
surface-complex assets. Terrain, water, protected blocks, route, and WorldGuard
checks decide the final alignment.

### 7.2 Concealment

The acceptance condition is visual and measurable:

- zero unapproved concrete or hangar shell from the required public cameras;
- at least three natural terrain blocks over a surface classified as concealed;
- no unsupported fill, exposed underside, water breach, or blocked route;
- an explicit decision whether the observatory remains the one civic surface
  landmark;
- portal, vent, road edge, and observatory are the only allowed constructed
  expressions when approved.

Planting is not used as a substitute for terrain where leaves would reveal the
structure. The [DoD master-planning standard](https://stg.wbdg.org/FFC/DOD/UFC/ufc_2_100_01_2020_c2.pdf)
supports landscape screening and transitions between dissimilar uses.

### 7.3 Protected program

The operation must preserve:

- all loaded shelter and vault containers and inventories;
- the five-level circulation interfaces;
- the primary stair and service riser until a replacement has passed;
- dry shells and water containment;
- hangar, arena, operations, conference, shelter, vault, and observatory routes;
- heliport and observatory if the approved alternative retains them.

## 8. Worldwide zone and building assessment

This assessment is the research brief for building teams. "Inspect" means
retain a feature until same-snapshot eye-level, section, route, and adjacency
evidence proves the change.

### 8.1 MainStreet America

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| B01 | -72,90..72,165 | Keep arrival anchor; add full orientation hub, district map, public/service entry hierarchy | P1 |
| B02 | -133,-118..-88,-73 | Activate R02/R06 frontage; public culinary threshold; west loading; do not move first | P1 |
| B03 | -24,-278..23,-232 | Keep service terminus; public office face; screened R07 loading and landscape buffer | P1 |
| C01 | 100,70..300,235 | Preserve deep stack; re-portal; conceal shell; retest all routes | P0 |
| C01-PUBLIC-ENTRY | 90,171..130,205 | Retire/rebuild outside P01 edge; reclaim current apron | P0 |
| C02 | -78,21..-62,39 | Address R02; rear garage to west alley; set valid DB parent | P1 |
| C03 | 62,21..78,39 | Address R03; rear garage to east alley; set valid DB parent | P1 |
| C04 | -78,-79..-62,-61 | Address R02; rear garage; coordinate R06 corner visibility | P1 |
| C05 | 62,-79..78,-61 | Address R03; rear garage; coordinate R06 corner visibility | P1 |
| C06 | -78,-179..-62,-161 | Address R02; rear garage; link to northern block wayfinding | P1 |
| C07 | 62,-179..78,-161 | Address R03; rear garage; link to northern block wayfinding | P1 |
| GRID-E2-BUILDING | 105,-33..135,16 | Make clubhouse/garden an east landmark; separate garden entry and service | P2 |
| GRID-W2-BUILDING | -132,-52..-96,4 | Make design lab a west landmark; expose public making; screen loading | P2 |
| H01 | -46,44..-23,65 | Preserve R01 front; west rear garage; test South/Garden Cross view | P1 |
| H02 | -41,-2..-27,12 | Preserve R01 front; west rear garage; strengthen address | P1 |
| H03 | -46,-56..-23,-34 | Preserve R01 front; west rear garage; keep R06 approach legible | P1 |
| H04 | -43,-104..-25,-86 | Preserve R01 front; west rear garage; protect R08 study gap | P1 |
| H05 | -46,-157..-22,-133 | Preserve R01 front; west rear garage; define north-block identity | P1 |
| H06 | -47,-207..-22,-183 | Preserve R01 front; west rear garage; coordinate R07 service edge | P1 |
| H07 | 18,42..45,68 | Preserve R01 front; east rear garage; Garden Cross visibility | P1 |
| H08 | 20,-5..43,15 | Preserve R01 front; east rear garage; strengthen address | P1 |
| H09 | 18,-59..46,-31 | Preserve R01 front; east rear garage; keep R06 approach legible | P1 |
| H10 | 18,-109..45,-81 | Preserve R01 front; east rear garage; protect R08 study gap | P1 |
| H11 | 26,-151..38,-140 | Preserve R01 front; east rear garage; small house needs clear plot identity | P1 |
| H12 | 21,-205..42,-185 | Preserve R01 front; east rear garage; coordinate R07 service edge | P1 |
| HGR-S01 | 176,138..234,181 | Earth-berm/rebuild shell; retain function; no exposed box from public views | P0 |
| OBS-S01 | 175,137..235,182 | Executive decision: retain as sole civic landmark or relocate; conceal base | P0 decision |
| P01-CANOPY-EAST | 52,256..84,266 | Keep arrival rhythm; verify it does not compete with new mountain route | P2 |
| P01-CANOPY-WEST | -116,256..-84,266 | Keep arrival rhythm; pair media and lighting with east canopy | P2 |
| SHL-S01 | 148,143..188,180 | Preserve and keep underground; improve route comfort/signage only | P0 protect |
| VLT-G01 | 230,184..262,226 | Preserve inventories/dry shell; route and stair comfort audit | P0 protect |

### 8.2 Raven Rock

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| RR-B1 | -50,-32..-10,2 | Establish operations-zone identity, orientation map, clear public/service routing | P2 |
| RR-B2 | 22,-30..54,0 | Distinguish communications identity; simplify route from B1 | P2 |
| RR-B3 | -18,85..18,115 | Strengthen commons/medical/quarters hierarchy and return route | P2 |
| RR-B4 | -170,-24..-130,4 | Treat as screened industrial/service destination with explicit restricted route | P2 |
| RR-Z5 | 193,-22..207,-8 | Highest vertical-circulation risk; replace awkward primary movement, add level coding, rest nodes, redundant no-jump route | P0 |

### 8.3 Ravensgate

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| RG-BELL | -110,-432..-106,-428 | Use as arrival landmark and decision cue; preserve view corridor | P2 |
| RG-LOGGIA | -111,-447..-106,-433 | Clarify relationship to library entrance and public route | P2 |
| RG-STOA | -105,-431..-65,-426 | Preserve a readable east-west civic edge; add destinations at ends | P2 |
| RG-TEMPIETTO | -93,-562..-77,-551 | Make distant garden destination discoverable with route confirmation | P2 |

### 8.4 Ravensreach

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| RRCH-ARCHITECT | -124,-380..-112,-370 | Give cottage a visible address and profession cue | P3 |
| RRCH-GRANGE | -65,-370..-41,-352 | Clarify event/public entry and service side | P2 |
| RRCH-LIBRARY | -144,-448..-111,-426 | Six-level route audit, floor directory, loggia/entry hierarchy | P1 |
| RRCH-MARKET | -73,-344..-39,-323 | Strengthen active frontage, vendor/service circulation, civic-square edge | P2 |
| RRCH-MASON | -58,-380..-46,-370 | Give cottage a visible address and profession cue | P3 |
| RRCH-MOOT | -100,-392..-70,-341 | Nine-level route/floor hierarchy; clarify Moot/Sanctum identities | P1 |
| RRCH-SCOUT | -64,-350..-52,-340 | Give cottage a visible address and profession cue | P3 |
| RRCH-STEWARD | -118,-350..-106,-340 | Give cottage a visible address and civic relationship | P3 |
| RRCH-STOREHOUSE | -95,-420..-75,-408 | Screen loading; make service route unambiguous | P2 |
| RRCH-SURVEYOR | -91,-407..-79,-400 | Clarify small-building address and route | P3 |
| RRCH-TOWN-HALL | -98,-381..-72,-368 | Resolve database/signage ambiguity: shell is nested in Moot Hall, not a competing destination | P1 |

### 8.5 Westlight District

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| WD-BREW | -352,-468..-326,-446 | Active public face plus separate brewing/service/water edge | P2 |
| WD-FERRY | -316,-482..-302,-466 | Strengthen waterfront transfer identity and route confirmation | P2 |
| WD-FIELD | -402,-502..-386,-484 | Tie pavilion clearly to venue forecourt and district route | P2 |
| WD-GATEHEAD | -334,-492..-320,-476 | Make principal district orientation threshold | P1 |
| WD-INN | -428,-496..-408,-464 | Use as western gateway/overnight anchor; make entry unmistakable | P2 |
| WD-LANTERN | -334,-514..-318,-500 | Clarify civic/event role and relation to Gatehead | P2 |
| WD-SHOP-A | -404,-470..-397,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-B | -396,-470..-390,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-C | -389,-470..-383,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-D | -382,-470..-377,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-E | -373,-470..-366,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-F | -365,-470..-359,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SHOP-G | -358,-470..-353,-448 | Continuous High Street frontage; unique address/sign; rear service | P2 |
| WD-SKIFF | -286,-512..-274,-502 | Make east waterfront destination visible from Gatehead/boardwalk | P2 |

### 8.6 Westlight Venue

| ID | Bounds x,z | Assessment and required improvement | Priority |
|---|---|---|---|
| WL-BOWL | -429,-629..-291,-491 | Add focal screen; test all sectors; distinguish field/stage/entries; add venue wayfinding | P0 |
| WL-CLUB | -417,-566..-400,-550 | Clarify members entry without confusing general arrival | P1 |
| WL-THEATRE | -421,-613..-299,-498 | Preserve north-stage fan geometry; verify entry reveal, exits, and floor directories | P1 |

### 8.7 Approach Road

The project has one district and one road feature but no building. Treat it as a
continuous regional connector, not leftover terrain. It requires:

- consistent destination naming to Westlight, Ravensreach/Ravensgate,
  MainStreet, and Raven Rock;
- gateway cues before branches;
- confirmation after each choice;
- a route map and night test;
- no abrupt material or width change without a named transition.

## 9. Map, screenshot, database, and website program

### 9.1 Required map sheets

1. One high-resolution north-up map of every active project.
2. Zoomable tiled version of the same map.
3. Seven project maps.
4. MainStreet existing figure-ground.
5. MainStreet proposed regulating and illustrative plans.
6. MainStreet address/frontage/garage plan.
7. MainStreet road, walk, service, loading, and parking plan.
8. C01 existing/proposed surface and public-entry plans.
9. C01 level plans, route diagram, and mountain sections.
10. Tunnel route family and typical section sheets.
11. Westlight seating/screen/sightline plan.
12. Per-building locator crops.
13. Phasing and temporary-condition plan.

Every map displays bounds, north/elevation convention, scale, legend, feature
IDs, scan ID, snapshot hash, creation time, and source.

### 9.2 Required image coverage

For each of the 68 database building rows:

- context;
- principal entry;
- representative interior;
- database-linked map crop.

This is a worldwide minimum of 272 primary images. The MainStreet pilot is 31
building rows and 124 minimum images. Complex buildings add compass exteriors,
vertical circulation, decision nodes, before/after, and defect-proof views.

Every image has one primary feature relation. Other visible objects are
secondary relations. Batch arrays attached to many features do not satisfy
this requirement.

### 9.3 Database-to-media model

The preferred normalized relation contains:

- `media_id`;
- `feature_id` and `external_id`;
- `project_id`;
- snapshot SHA and scan ID;
- file or deployment URL;
- content hash;
- capture timestamp;
- camera x/y/z, yaw, pitch, FOV;
- relation role;
- visible secondary feature IDs;
- before/after phase;
- alt text;
- semantic QA result.

The Sites export is versioned and read-only. It must not infer identity from a
filename and must not query a live mutable world database during page render.
The owner has approved maps and screenshots of the complete catalog for the
initial **owner-only** Sites release. This resolves content classification for
that release; it does not authorize changing access to public or exposing the
deployment beyond the owner without a separate access-control decision.

## 10. Development phasing

### Phase 0 — evidence and governance

- freeze immutable baseline;
- reconcile stale counts and defects;
- produce DB/media census;
- establish area locks, decisions, and stop-work rules;
- publish existing-condition maps.

### Phase 1 — high-impact pilots

- build no-live-change MainStreet regulating alternatives;
- create garage/frontage mockups for one inner and one outer house;
- create C01 portal/concealment alternatives;
- model Westlight screen and sightlines;
- inventory every tunnel segment and stair.

### Phase 2 — infrastructure

- standardize the highest-risk Raven Rock and C01 vertical routes;
- implement selected MainStreet street/alley/frontage package;
- correct Westlight screen and venue wayfinding.

### Phase 3 — secure complex

- build new portal while old route remains available;
- pass route and parking QA;
- retire old entry;
- complete mountain-side road and concealment;
- retest all protected rooms and inventories.

### Phase 4 — district/building improvements

- complete B02/B03 public/service edges;
- roll garage standard to all houses;
- improve civic, retail, waterfront, and cottage identities by priority;
- correct remaining route and adjacency defects.

### Phase 5 — final evidence and publication

- freeze final snapshot;
- rescan DB;
- render all maps and media from that hash;
- compile the master-plan PDF;
- deploy the Sites version;
- archive queries, hashes, manifests, decisions, and rollback artifacts.

## 11. Approval gates

No package advances without:

1. requirements and bounds approved;
2. alternatives reviewed;
3. exact snapshot SHA and collision report;
4. protected assets and block entities inventoried;
5. guarded dry run;
6. before evidence captured;
7. execution authorization;
8. saved-world block, route, water, and inventory QA;
9. after evidence from the same cameras;
10. DB and media relations updated;
11. program owner acceptance.

## 12. Open decisions

1. Retain the observatory as the only intentional surface landmark, or move it
   so the entire mountain reads as natural?
2. Approve M-B, the three-spine/two-outer-street MainStreet alternative?
3. Approve an R08 study near z=-120?
4. Prefer the Westlight center ring alone or the enhanced ring plus stage-side
   boards?
5. Is a no-jump lift/ramp route required for every public tunnel level or only
   the principal public stacks?
6. May the visible surface hangar be rebuilt, or must its authored exterior be
   preserved behind a new landform?

Until recorded, each affected work package remains at design status.

## 13. Work breakdown structure and dependencies

The execution register defines release packages. This WBS defines the planning,
engineering, evidence, and documentation tasks needed to make those packages
ready.

| WBS | Deliverable | Owner | Depends on | Completion evidence |
|---|---|---|---|---|
| 0.1 | Program charter, requirement IDs, owners, and definitions | Program Control | none | Approved traceability table |
| 0.2 | Immutable snapshot and SHA | Survey/Catalog | none | Full chunk and hash report |
| 0.3 | DB freeze/export/hash | Survey/Catalog | 0.2 | Schema/data export and DB hash |
| 0.4 | Area/file lock matrix | Program Control | 0.1 | Active lock register |
| 0.5 | Decision and risk logs | Program Control | 0.1 | Logs linked from package index |
| 1.1 | Existing whole-world surface atlas | Atlas/Media | 0.2 | Master map and manifest |
| 1.2 | Seven existing-condition project maps | Atlas/Media | 0.2, 0.3 | Map set and coverage QA |
| 1.3 | MainStreet figure-ground/frontage map | Planning, Atlas | 0.2, 0.3 | Existing-condition sheet |
| 1.4 | C01 surface, level, and section base maps | Survey, Atlas | 0.2, 0.3 | Coordinate-consistent sheets |
| 1.5 | Tunnel and vertical-route inventory | Tunnel, Survey | 0.2, 0.3 | First-class segment list |
| 1.6 | Westlight seating/field/canopy 3D base | Venue, Survey | 0.2, 0.3 | Sightline model |
| 2.1 | Research paper and bibliography | Planning/Research | 0.1 | Cited paper |
| 2.2 | Infrastructure standards | Planning, discipline leads | 1.3–1.6, 2.1 | Approved standards |
| 2.3 | MainStreet alternatives M-A/M-B/M-C | Planning | 1.3, 2.2 | Comparable plans and matrix |
| 2.4 | C01 alternatives C-A–C-D | Secure Complex | 1.4, 2.2 | Plan/section/view simulations |
| 2.5 | Westlight alternatives S-A–S-C | Venue | 1.6, 2.2 | 48-view comparison |
| 2.6 | Tunnel alternatives T-A–T-C | Tunnel | 1.5, 2.2 | Segment disposition schedule |
| 2.7 | Owner alternative selections | Program/user | 2.3–2.6 | Decision records |
| 3.1 | MainStreet regulating plan | Planning | 2.7 | Street/frontage/build-to plan |
| 3.2 | Street and cross-connection geometry | Surface, Survey | 3.1 | Grade/collision report |
| 3.3 | House-by-house garage/driveway schedule | Residential | 3.1, 3.2 | 18-row schedule and sections |
| 3.4 | Two-house reversible garage pilot | Residential | 3.3 | Walkthrough and same-camera review |
| 3.5 | B02 frontage/service design | Surface | 3.1, 3.2 | Four-direction view study |
| 3.6 | B03 frontage/loading/screen design | Surface | 3.1, 3.2 | Public/service route study |
| 3.7 | C02–C07 hierarchy correction design | Survey | 3.1 | Approved parent mapping |
| 4.1 | C01 terrain, water, cover, and protected-volume model | Secure, Survey | 2.7 | Section/collision report |
| 4.2 | New portal/road centerline alternatives | Secure | 4.1 | Grade, route, viewpoint comparison |
| 4.3 | Old-entry parking/garden recovery | Secure, Surface | 4.2 | Stall/category and cell plan |
| 4.4 | Hangar/observatory surface-expression design | Secure | 2.7, 4.1 | Owner-approved exterior views |
| 4.5 | C01 protected inventory and route baseline | QA | 4.1 | Entities, fluids, rooms, routes |
| 5.1 | Tunnel family palette/section prototypes | Tunnel | 2.7 | Typical sections |
| 5.2 | Raven Rock vertical pilot design | Tunnel | 1.5, 5.1 | Route geometry and level coding |
| 5.3 | C01 primary-core comfort design | Tunnel, Secure | 1.5, 5.1 | Five-interface route package |
| 5.4 | Worldwide segment disposition | Tunnel | 5.2, 5.3 | Keep/retrofit/reroute/replace list |
| 6.1 | Westlight screen structural/display design | Venue | 2.7 | Bounds, supports, display identity |
| 6.2 | Sports and concert sightline simulation | Venue, QA | 6.1 | At least 48 passed samples |
| 6.3 | Entry/concourse/wayfinding correction | Venue | 6.1 | Route and sign schedule |
| 6.4 | C01 arena focal-point review | Venue, Secure | 1.4 | Bleacher view matrix |
| 7.1 | Guarded source operations for each selected package | Discipline author | 3–6 as applicable | Source and operation hashes |
| 7.2 | Independent dry run and collision QA | QA | 7.1 | Preflight report |
| 7.3 | Before camera set | Atlas/Media | 7.2 | Hashed image manifest |
| 7.4 | Live authorization and controlled release | Program Control | 7.2, 7.3 | Signed release state |
| 7.5 | Post snapshot and independent QA | Survey, QA | 7.4 | Census, route, fluid, entity results |
| 7.6 | Same-camera after set | Atlas/Media | 7.5 | Before/after manifest |
| 7.7 | DB scan and media relations | Survey/Catalog | 7.5, 7.6 | Import and orphan reports |
| 8.1 | Final whole-world and detailed atlas | Atlas/Media | all accepted physical packages | One-hash atlas and PDF |
| 8.2 | Final DB/media report | Survey/Catalog | 7.7 | Generated counts and crosswalk |
| 8.3 | Master-plan PDF | Documentation | 8.1, 8.2 | Reviewed compiled PDF |
| 8.4 | Versioned Sites source export | Web, Catalog | 8.1, 8.2 | Hash-pinned static/API bundle |
| 8.5 | Sites validation, saved version, and production release | Sites/Web | 8.4 | Production URL and QA record |

### 13.1 Critical path

The minimum critical path is:

`0.2 baseline → 1.x existing evidence → 2.x alternatives → 2.7 decisions →
detailed design → 7.1 operations → 7.2 preflight → 7.4 release → 7.5 QA →
8.1/8.2 evidence → 8.3/8.5 publication`.

No final site or PDF may claim an as-built improvement before 7.5 and 7.7.

### 13.2 Parallel work limits

Parallel work is encouraged only when bounds and outputs do not conflict:

- research, existing-condition maps, and DB/media schema can proceed together;
- Westlight, Raven Rock, and non-mutating MainStreet/C01 design can proceed
  together;
- MainStreet road/garage work and C01 portal/parking work share the arrival and
  eastern-edge context and therefore require coordinated release windows;
- tunnel work inside C01 cannot overlap a C01 terrain/portal operation;
- final atlas and site export wait for one accepted final snapshot.
