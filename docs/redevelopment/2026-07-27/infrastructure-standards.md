# Redevelopment Infrastructure Standards

Date: 2026-07-27  
Status: design and QA standard; no live-world construction authority
Implementation state: **DESIGN ONLY**. No live-world work or Sites deployment
was performed as part of this standards package.

## 1. Scope and interpretation

This document establishes measurable standards for:

- surface streets, blocks, intersections, sidewalks, alleys, and service
  routes;
- residential frontage, garages, driveways, and building placement;
- public, secondary, and service tunnels;
- stairs, stairwells, ramps/lifts, landings, and guards;
- signs, maps, addresses, color systems, landmarks, and decision nodes;
- Westlight and C01 venue focal points and sightlines;
- C01 surface concealment, portal, mountain road, and parking interface;
- database, map, screenshot, and experience QA.

The cited documents are real-world references. Numeric Minecraft dimensions
are deliberate project adaptations unless explicitly identified as a copied
source value.

## 2. Standard identifiers

| Prefix | Domain |
|---|---|
| ST | Surface street/network |
| FR | Frontage/building placement |
| GA | Garage/driveway |
| TU | Tunnel |
| VC | Vertical circulation |
| WF | Wayfinding |
| VN | Venue |
| BK | Bunker/concealment |
| QA | Cross-domain quality assurance |
| MD | Map/database/media |

## 3. Surface network

### ST-01 Connected hierarchy

Every road and public walk is assigned one type:

- ceremonial/main street;
- residential/local street;
- cross street;
- service street;
- alley;
- pedestrian route;
- mountain access road.

The route material, width, lighting, sign family, and edge treatment must
communicate that type.

Basis: the
[DoD Installation Master Planning standard](https://stg.wbdg.org/FFC/DOD/UFC/ufc_2_100_01_2020_c2.pdf)
calls for connected modified grids, multiple route options, smaller blocks,
street types, sidewalks, and integration of compatible uses.

### ST-02 MainStreet widths

| Type | Clear project target |
|---|---:|
| R01 ceremonial street | Preserve 9 blocks |
| Residential/local street | 5 blocks desired |
| Cross street | 3 blocks minimum; 5 at major arrival |
| Service route | 3 blocks |
| Shared rear alley | 3 blocks |
| Public sidewalk | 2 blocks minimum; 3 at civic/visitor frontage |
| Tunnel-to-surface pedestrian threshold | Same clear width as incoming public route |

Existing R02 is three blocks. Widening to five is a design study, not a
presumption. A wider street that destroys a house, fence, authored landscape,
or comfortable grade fails the standard.

### ST-03 Block and connection interval

The target interval between public cross connections is no more than 100
blocks. Longer blocks need a named pedestrian connection, visible destination,
or documented terrain/security exception.

R06-to-R07 is approximately 135 blocks and therefore triggers an R08 or
equivalent connection study.

### ST-04 Compact intersection

Intersections must:

- preserve the continuation of each public route;
- use the smallest corner geometry that remains walkable;
- avoid an unexplained paved void;
- provide a five-block visibility envelope at a public corner unless an
  approved landmark occupies it;
- show destination information before the route choice;
- connect sidewalks without forcing a player into the vehicle/service center.

Basis:
[NACTO intersection design principles](https://nacto.org/publication/urban-street-design-guide/intersections/intersection-design-principles/).

### ST-05 Service and freight

Freight, refuse, and bulk service use an alley, rear court, or screened service
street. They do not cross a principal front garden when a side or rear route is
possible.

B02 loads from the west/rear. B03 loading relates to R07. High Street shops use
a shared rear service concept rather than seven competing public-front loading
points.

Basis:
[NACTO commercial alley guidance](https://nacto.org/publication/urban-street-design-guide/streets/commercial-alley/)
and the DoD land-use compatibility principles.

### ST-06 Walk and planting edge

Public sidewalks are continuous and visually distinct. Street trees use a
study rhythm of approximately 12–15 Minecraft blocks, adapted from the DoD
25–30-foot spacing guidance and the attraction's approximate scale. The final
spacing yields to doors, sightlines, lighting, utilities, and view corridors.

### ST-07 Grade

Surface routes:

- avoid an unannounced one-block vertical step in the main travel path;
- use a consistent transition material at grade changes;
- include edge protection where a fall is possible;
- remain walkable in both directions without jump, sprint, or crouch on public
  paths;
- have a recorded longitudinal grade profile before release.

### ST-08 Pilot before permanent work

Where a reorientation or narrowing decision is primarily visual, test a
reversible mockup and recorded player walkthrough before moving a building.
This follows NACTO's pilot-to-permanent approach:
[Urban Street Design Guide](https://nacto.org/publication/urban-street-design-guide/).

## 4. Frontage and building placement

### FR-01 Address street

Every public building and residence has exactly one principal address street.
Its principal entry must be visible from that route or from a short, signed
approach.

### FR-02 Build-to relationship

For a residential block face:

- principal façade setbacks should vary by no more than two blocks unless an
  approved civic space, topographic response, or courtyard explains the
  difference;
- the front walk reaches the public sidewalk directly;
- a garage door, loading door, blank retaining wall, or service yard cannot be
  the only visible face;
- porches, entries, windows, landscape, and address signs create a repeated
  street rhythm.

For civic/commercial buildings, the regulating plan records:

- build-to line;
- principal entry;
- service/loading entry;
- height and massing envelope;
- permitted frontage and use;
- landscape and sign zone.

Basis: DoD form-based planning and Building/Street Envelope Standards in
[UFC 2-100-01](https://stg.wbdg.org/FFC/DOD/UFC/ufc_2_100_01_2020_c2.pdf).

### FR-03 Compatible adjacency

- visitor, community, education, civic, lodging, and neighborhood retail may
  reinforce the walkable public network;
- warehouse, power, freight, and restricted secure access require a clear
  transition and screen from homes;
- a public building that is physically near a road but visually detached
  receives a frontage intervention before relocation is considered.

### FR-04 Identity at a turn

Within the first view after a major corner, the player must see:

- the continuing street family;
- a destination, landmark, address, or district identity;
- no more than one unmarked competing public entry.

If this fails, use frontage, sign, landmark, planting, lighting, or route
changes before widening open space.

## 5. Garages and driveways

### GA-01 Coverage

Each of H01–H12 and C02–C07 receives one believable garage relation. Final QA
must report 18 of 18, not a sample.

### GA-02 Placement

- side or rear placement is preferred;
- the garage face is at least two blocks behind the principal façade;
- an attached street-facing garage occupies no more than 40 percent of the
  house frontage;
- detached rear garages are permitted when lot and alley geometry fit;
- corner or outer homes use the side street or alley where feasible.

Basis:
[Houston Heights setting guidance](https://www.houstontx.gov/planning/HistoricPres/HistoricPreservationManual/historic_districts/heights_setting.html),
[Houston Old Sixth Ward guidelines](https://houstontx.gov/planning/HistoricPres/Sixth_Ward/OSW_DG_Guidelines.pdf),
and [Portland community design standards](https://www.portland.gov/sites/default/files/code/218-comm-design-stds_0.pdf).

### GA-03 Driveway

- target width is three blocks;
- it remains visually subordinate to the front walk and garden;
- it does not sever a crosswalk or force a public route through an open garage;
- it reaches a road or alley without crossing another building footprint,
  authored room, fence, gate, protected landscape, or water feature.

### GA-04 Functional test

For every garage:

1. exterior route reaches the door;
2. door clearance is unobstructed;
3. interior bay has a usable clear zone;
4. front door remains independently reachable;
5. route works from both directions;
6. database parent, bounds, and media relations are updated.

## 6. Tunnel standards

### TU-01 Route types

| Type | Minimum clear envelope | Use |
|---|---:|---|
| Public primary spine | 5 wide × 4 high | Visitor and major inter-building route |
| Public/operational secondary | 3 wide × 3 high | Named branch and department route |
| Service-only | 2 wide × 3 high | Restricted maintenance/service connection |
| Major decision node | About 7 × 7 clear | Maps, branching, waiting, identity |

Existing protected widths that exceed the minimum remain protected. A route
cannot oscillate between types without a named threshold.

### TU-02 Section

Each tunnel family defines:

- floor;
- wall/base;
- wall field;
- ceiling;
- continuous lighting zone;
- sign zone;
- route-color band;
- service/utility zone;
- drainage or water-interface treatment;
- edge/guard treatment.

Random material changes are defects unless they mark a documented threshold.

### TU-03 Alignment

- a primary route provides at least 25 blocks of directional confirmation
  between repeated markers or a visible node;
- avoid hidden doglegs;
- where a dogleg is required for security or terrain, provide a named node and
  signs before the turn;
- crossing routes meet in a deliberate node, not an accidental cave opening;
- a tunnel cannot silently merge with a natural cave.

### TU-04 Lighting

- no public route relies on carried light;
- route lighting uses a repeatable interval and continuous visual rhythm;
- decision nodes, stairs, thresholds, and hazards receive additional emphasis;
- emergency/return cues remain legible when decorative lighting is visually
  busy.

The
[FHWA Technical Manual for Design and Construction of Road Tunnels](https://www.fhwa.dot.gov/bridge/Tunnel/pubs/nhi09010/tunnel_manual.pdf)
is the systems precedent for treating lighting, drainage, communication,
cross-passages, and emergency movement as an integrated tunnel design. The
Minecraft dimensions are not copied roadway dimensions.

### TU-05 Water and caves

Every tunnel release includes:

- water-source and fluid-neighbor scan;
- shell thickness/cave adjacency map;
- protected route and room intersection test;
- after-build dry-volume census;
- visual check for exposed natural voids.

### TU-06 Experience test

For each named segment, record:

- start/end feature IDs;
- length and clear envelope;
- vertical change;
- turn and decision count;
- normal walk time in both directions;
- sprint/jump/crouch requirement;
- light minimum or proxy;
- screenshots from both directions and typical section.

Pass requires zero jump, sprint, or crouch on primary public routes.

## 7. Vertical circulation

### VC-01 Primary-route hierarchy

Every occupied public floor has:

- a bidirectional primary stair or no-jump route;
- a visible and signed return path;
- no ladder dependency;
- a database route relation to the spaces it serves.

### VC-02 Comfortable project stair

The project target is:

- at least two clear blocks wide;
- at least three clear blocks of headroom;
- consistent tread direction and rhythm;
- maximum primary-route grade of one block vertical per two horizontal blocks
  where geometry permits;
- a landing at every direction change and approximately every six to eight
  vertical blocks;
- landings at least 3 × 3 clear;
- continuous edge guard/handrail cue;
- no door, sign, or fixture reducing clear movement.

A steeper existing run may remain service-only after risk review. It cannot be
advertised as the comfortable public route.

### VC-03 No-jump alternative

Where feasible, every principal public level stack has a lift or ramp route in
the same general circulation area as the stair. This adapts the U.S. Access
Board principle that accessible routes coincide with general circulation:
[Chapter 4 Accessible Routes](https://www.access-board.gov/ada/guides/chapter-4-accessible-routes/).

Real ADA ramp and stair dimensions are design references, not claims of legal
Minecraft compliance. The
[Access Board stair guide](https://www.access-board.gov/ada/guides/chapter-5-stairways/)
is used for uniformity, landing, and handrail principles.

### VC-04 C01 primary core

The current core at x=204..216, z=152..164, y approximately 50..110 is not
accepted on reachability evidence alone. It must pass:

- normal-speed walk both directions;
- every published interface;
- no jump, sprint, crouch, or accidental fall;
- consistent treads and landings;
- level/route signs at each interface;
- recorded time, turns, and camera views.

### VC-05 Raven Rock shaft

RR-Z5 spans many vertical levels and receives the first vertical-circulation
pilot. Required:

- level coding;
- rest/decision nodes;
- redundant return/no-jump route where feasible;
- no ladder as primary route;
- clear surface-to-underground directory;
- segment-by-segment experience QA.

## 8. Wayfinding

### WF-01 Information hierarchy

1. Site/project.
2. District/zone.
3. Street/tunnel family.
4. Building.
5. Floor.
6. Room/destination.

Signs follow this hierarchy. A room name cannot replace the building or route
identity needed to find it.

### WF-02 Decision-point rule

At every public route choice:

- place destination information before the choice;
- use the same destination name on each successive sign;
- show one selected route per destination unless a deliberate alternative is
  labeled;
- provide confirmation after the decision;
- include a "you are here" map at major portal/district nodes.

Basis:
[NPS Wayside Guide](https://www.nps.gov/subjects/hfc/upload/Wayside-Guide-First-Edition.pdf),
[FHWA pedestrian wayfinding guidance](https://highways.dot.gov/safety/pedestrian-bicyclist/pedestrian-safety-guide-transit-agencies/chapter-3-actions-increase),
and [MUTCD destination continuity](https://mutcd.fhwa.dot.gov/htm/2009/mutcd2009cl_2.htm).

### WF-03 Confirmation interval

Project targets:

- tunnel confirmation marker: approximately every 25 blocks;
- surface confirmation cue: approximately every 50 blocks;
- shorter interval where a turn, grade, competing entry, or visibility
  obstruction causes uncertainty.

These distances are project adaptations and may be reduced by player testing.

### WF-04 Color and naming

- each public route family has one persistent color/material cue;
- public, service, and restricted routes do not share a confusing color;
- database, sign, map, report, and website use the same destination name;
- old names are removed or explicitly marked as aliases;
- user-facing "GrandStreet America" may be an alias, but machine keys remain
  `mainstreet-america`.

### WF-05 Stadium route

From every regional arrival:

- identify Westlight Venue before the district branch;
- identify stadium bowl, theatre, club, field, and public entry distinctly;
- sign the screen/field reveal after entry;
- confirm the return route at concourse nodes.

## 9. Venue standards

### VN-01 Focal hierarchy

Each venue declares event modes and focal hierarchy:

| Venue/mode | Primary focal point | Secondary |
|---|---|---|
| Westlight sports | Field/play | Center-hung display |
| Westlight concert | North platform/stage | Center display and approved side boards |
| Westlight theatre | North end stage | House lighting/proscenium |
| C01 training arena | Training course/display wall | Scoreboard/instruction display |

A doorway, vomitory, or blank wall cannot be the only apparent focal object from
seating.

### VN-02 Screen

Westlight receives a first-class screen/display feature with:

- exact bounds and parent;
- mode and content role;
- structural support;
- lighting/material design;
- database media;
- all-sector sightline proof.

The functional precedent is Samsung's official
[Infinity Screen description](https://news.samsung.com/us/sofi-stadium-samsung-reveal-new-name-videoboard-the-infinity-screen-by-samsung):
an oval, dual-sided center-hung display serving lower and upper seating.

### VN-03 Sightline sampling

Westlight minimum sample matrix:

- 8 aisle sectors;
- low, middle, and upper seating;
- sports and concert modes.

That produces at least 48 recorded views. Each view records the eye point,
look-at point, obstructions, field/stage visibility, and screen visibility.
Failure in any representative sector requires adjustment or an explicit,
approved exception.

The screen must not create a new restricted view. This follows the
[FIFA Stadium Guidelines stadium-bowl principles](https://football-technology.fifa.com/innovation/stadium-guidelines/general-process-guidelines/design/stadium-bowl)
and the U.S. Access Board principle of equivalent viewing angles in assembly
areas:
[ADA Standards Chapter 2](https://www.access-board.gov/ada/chapter/ch02/).

### VN-04 Entry and seating

- entry openings are visibly circulation, not stage architecture;
- aisles read as access and do not terminate in a false focal wall;
- seat/stair orientation is consistent with declared event mode;
- exits and return routes remain visible without competing with the display;
- members-club and theatre entries do not masquerade as stadium general entry.

## 10. Bunker, parking, and mountain standards

### BK-01 Surface-expression rule

A database feature described as earth-covered passes only when:

- the shell is not visible from required public cameras;
- terrain cover is continuous and at least three natural blocks thick over
  surfaces classified as concealed;
- exposed faces are approved portal, vent, road, or retained observatory only;
- no floating terrain, unsupported edge, fluid breach, or rectangular roof
  trace is visible.

### BK-02 Required cameras

Capture same-camera before/after from:

- parking center;
- parking east edge;
- Main Street south arrival;
- Discovery Court;
- new mountain road, uphill and downhill;
- north, south, east, and west oblique aerials.

### BK-03 Portal

The new portal:

- lies outside the completed P01 parking composition;
- reads as an opening in landform, not a freestanding concrete façade;
- keeps a clear public threshold and directory;
- retains the old path until the new route passes;
- separates public and restricted movement;
- has water/terrain, headroom, lighting, and return-route QA.

### BK-04 Mountain road

The mountain road:

- has a complete centerline and grade profile;
- uses a consistent width and surface;
- includes edge protection, drainage cues, lighting/markers, and destination
  signs;
- never intersects shelter, vault, hangar, observatory, heliport, room, tunnel,
  water body, fence, or region boundary without an authored transition;
- passes a normal-speed walk/vehicle-logic test in both directions.

### BK-05 Parking recovery

The current parent P01 and 236 verified spaces establish the baseline. A portal
package must report:

- spaces retained, removed, relocated, and added;
- accessible, EV, premium, and standard category totals;
- drive-aisle continuity;
- pedestrian path to B01 and C01;
- canopy, monument, garden, and lighting impacts;
- exact cell and feature-ID reconciliation.

The parking parent plus individual spaces explains the current 237 parking
features. Reports must not describe 237 as the number of stalls.

### BK-06 Observatory decision

Concealment cannot be accepted until the owner chooses:

- retain OBS-S01 as the sole intended civic surface landmark and conceal its
  base/hangar; or
- relocate/rebuild OBS-S01 and restore a fully natural mountain profile.

## 11. Quality assurance

### QA-01 Atomic package

Every physical package follows:

1. exact immutable snapshot;
2. feature and collision bounds;
3. protected block/entity inventory;
4. guarded operations;
5. dry run;
6. before media;
7. authorized execution;
8. post snapshot;
9. block, fluid, route, and inventory checks;
10. same-camera after media;
11. DB/media import;
12. acceptance or rollback.

### QA-02 Quality dimensions

Do not collapse design quality into one condition score. Record:

- physical completion;
- functional performance;
- walkability;
- legibility;
- sightline quality;
- concealment;
- media coverage;
- provenance confidence.

Each score needs a method and evidence reference. No new score defaults to 100.

### QA-03 Experience tests

The player test uses:

- standard eye height and normal movement;
- no prior route knowledge;
- no flight;
- no spectator clipping;
- no sprint/jump/crouch unless the route is explicitly service-only;
- both directions;
- day and night for surface routes;
- a recorded camera and result.

### QA-04 Stop-work

Stop immediately if:

- source hash differs;
- a protected entity enters a removal/fill/clone volume;
- a route opens to a cave or adjacent bore unexpectedly;
- a road or terrain package intersects an unmodeled feature;
- any route works in only one direction;
- a post-run snapshot differs from the expected operation result;
- the live world changes after preflight.

## 12. Map, database, and media standards

### MD-01 Map sheet

Every final map includes:

- title and sheet ID;
- bounds;
- north or elevation direction;
- scale;
- legend;
- project and feature IDs;
- snapshot hash and scan ID;
- creation timestamp and renderer;
- source and status: existing, proposed, future, or as-built.

### MD-02 Building media

Every one of 68 building rows receives:

- one context view;
- one principal-entry view;
- one representative-interior view;
- one database-linked map crop.

Minimum worldwide primary set: 272 images. Minimum MainStreet pilot: 124.

### MD-03 Exact relation

Each primary image resolves to exactly one feature ID. Store secondary visible
features separately. Duplicate and orphan checks must report zero for published
primary media.

### MD-04 Provenance

Each map and image records:

- immutable snapshot SHA;
- database scan ID;
- content hash;
- capture parameters;
- semantic QA;
- whether it is evidence or illustration.

A beautiful image from the wrong snapshot is not acceptance evidence.
