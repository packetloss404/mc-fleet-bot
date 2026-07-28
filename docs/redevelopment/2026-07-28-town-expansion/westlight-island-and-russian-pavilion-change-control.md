# Westlight Island and Russian Pavilion Change Control

Change ID: `REDEV-2026-07-28-CR-WESTLIGHT-PAVILION-02`  
Effective: 2026-07-28 UTC  
State: **APPROVED REQUIREMENT / SURVEY, RESEARCH, DESIGN, AND RELEASE PENDING**  
Mode of this record: documentation only; no live-world or database mutation

## 1. Controlling directives

### 1.1 Ravensreach civic pavilion

The active civic-space/pavilion design must use a researched **Russian
architectural reference**. Glass-pavilion language is superseded.

The historical fact that the old `central-pavilion` glass shell was demolished
remains true and must not be rewritten. This change does not authorize
restoration or replay of that shell. It authorizes a new, researched
Russian-referenced civic composition.

The controlling connectivity remains:

```text
ENLARGED LIBRARY
    ⇄ RUSSIAN-REFERENCED CIVIC PAVILION / SHARED CIVIC SPACE
    ⇄ MONUMENTAL GUILD HALL
```

The design research must select and cite one coherent Russian architectural
lineage before material or roof geometry is generated. It may not combine
unrelated onion domes, Constructivist forms, folk ornament, imperial classicism,
and timber-terem motifs as a decorative collage. The selection must explain:

- massing and roof form;
- structural/material language;
- arcade, porch, loggia, or gallery precedent;
- color and ornament hierarchy;
- relationship to statues and ceremonial space;
- winter/light interpretation in Minecraft; and
- how the library and Guild Hall remain the two civic bookends.

Glass may appear as normal windows or lantern glazing appropriate to the
selected precedent. The pavilion may not read as a modern glass box.

### 1.2 Westlight stadium island

Westlight must be redesigned as one coherent stadium-island destination:

1. buildings that sit on or enter the water become intentional pier buildings
   with visible piles, deck/wharf structure, landings, service access, and
   public waterfront relationships;
2. add a researched amusement pier with a roller coaster and Ferris wheel;
3. place two paired outer-edge dining houses—one steak house and one
   shrimp/seafood house—as destination bookends;
4. align the island’s main district, pier, and stadium into one legible system
   of pedestrian malls and streets;
5. fill the crater west of the stadium with contained water; and
6. edge the new water body with a designed quay and green space.

The result must read as a planned waterfront/island district, not a stadium
with unrelated objects scattered around it.

## 2. Source-state and protected-history rule

The accepted Wave 2 post snapshot is the current documented design reference:

`data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region`

SHA-256:

`d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999`

It is not a future execution baseline. A fresh immutable snapshot is required
for the Westlight/Ravensreach engineering packages.

Protected accepted history includes:

- `westlight-venue` and `westlight-district` registered objects;
- Westlight bowl, theatre, members club, district buildings and rooms;
- the accepted Westlight infinity screen and its sightline modes;
- existing town-to-Westlight approach-road identity and wayfinding;
- the Ravensgate Garth, south stoa, library loggia, library, and accepted
  circulation;
- R1/Wave 2 database relations and media tied to their named snapshots; and
- every accepted operation/rollback record.

The current program may modify protected objects only through an explicit
owner-approved scope, exact guards, and a new rollback package. It may not
replay an old forward file or erase provenance from a catalog.

## 3. Required research packages

### 3.1 Russian civic-pavilion research

Required output:

- at least three authoritative museum, heritage, archival, or architectural
  sources;
- one selected lineage and two rejected alternatives;
- diagrammed features suitable for a pavilion/civic-space scale;
- an original Minecraft adaptation rather than a direct copy;
- a materials/roof/arcade/statue detail sheet; and
- a compatibility statement for the existing library and proposed Guild Hall.

### 3.2 Amusement-pier research

Required output:

- at least three authoritative pier, amusement-park operator, engineering, or
  historic-preservation sources;
- comparative plan of pier width, entry, ride zone, service zone, waterfront
  edge, emergency route, and destination food uses;
- roller-coaster footprint, crest/turn/clearance logic, station and maintenance
  access;
- Ferris-wheel diameter, hub, support, loading platform, clearance envelope,
  lighting, and view axis;
- queue and pedestrian-mall capacities expressed as Minecraft geometry;
- night identity and wayfinding; and
- two rejected layouts with documented reasons.

The rides may be static architectural representations, but they must be
structurally legible, accessible to view, and integrated with routes. A random
loop of rail or decorative circle does not pass.

### 3.3 Waterfront and crater-water research

Required output:

- quay/promenade precedents;
- pier-building structural vocabulary;
- storm/flood-edge interpretation translated into safe Minecraft containment;
- planted/green edge and hard-quay hierarchy;
- water-level datum and basin section;
- closed-boundary/leak-risk model; and
- relationship between the crater lake, stadium, outer restaurants, and
  pedestrian network.

## 4. Work package breakdown

### WL-01 — Island survey and figure-ground

Survey:

- exact island shoreline and land/water mask;
- every Westlight building/room/custom object;
- ground and water elevations;
- bridges, roads, walks, loading/service paths, and dead ends;
- stadium gates, screen axes, seating modes, stage, and destination views;
- all over-water or water-adjacent buildings;
- the west crater’s rim, bottom, openings, caves, fluids, vegetation, entities,
  block entities, and neighboring water;
- protected landscape and existing district buildings; and
- all current route decision points.

Outputs:

- north-up island base;
- figure-ground diagram;
- water/grade map;
- protected-object overlay;
- route/sightline map; and
- problem/opportunity register.

### WL-02 — Coherent district alignment

Create a small number of legible axes:

- **Main Mall:** land arrival to stadium;
- **Pier Mall:** stadium/main district to amusement pier;
- **Waterfront Street/Quay:** continuous public edge;
- **Outer Dining Walk:** paired steak and shrimp houses;
- **Service Street:** screened, continuous, and separate where possible; and
- **Crater Green Loop:** quay/park route around the new water.

The main district, pier and stadium must share paving hierarchy, lamps,
street furniture, signs, view terminals, and address logic. Every principal
door must face or visibly connect to one of these routes.

### WL-03 — Intentional pier buildings

For every building occupying water:

- identify parent object and exact bounds;
- show structural piles/caissons/wharf deck;
- provide landward arrival and waterside identity;
- separate public and service access;
- prove a continuous normal-walk route;
- avoid unsupported floating walls;
- model underside, waterline, fenders/rails/steps as appropriate; and
- provide floor plan, section, exterior, waterline, and arrival captures.

### WL-04 — Amusement pier

Minimum program:

- ceremonial pier gate;
- broad public boardwalk;
- Ferris wheel with loading platform and protected clearance;
- roller coaster with station, coherent lift/crest/turn sequence and supports;
- queue/forecourt;
- arcade/concessions or small support buildings;
- service/maintenance route;
- end-of-pier overlook;
- lighting and signs; and
- unobstructed emergency-return route.

The Ferris wheel and coaster must not collide with one another, stadium
sightlines, billboards, buildings, bridges, or navigation headroom.

### WL-05 — Paired outer dining houses

Design basis:

- one steak house and one shrimp/seafood house;
- paired massing and address role without identical interiors;
- outer-edge siting as island bookends;
- direct pedestrian-mall/quay access;
- water views and terraces where safe;
- complete kitchens, storage, dining, bar/service, staff and delivery routes;
- distinct identity readable from the main district and water; and
- exact building/room/media database relations.

### WL-06 — West crater lake, quay, and green space

The crater becomes a contained designed water body:

- surveyed closed basin;
- approved water surface datum;
- exact water volume;
- protected rim and subgrade objects;
- hard quay at civic/active edges;
- green/soft edge at park edges;
- continuous green loop and overlooks;
- lighting, rails, stairs and landings;
- no uncontrolled outflow or flooded cave;
- no accidental connection to unrelated water systems; and
- before/after hydrology maps and sections.

No broad unguarded `fill water` command is acceptable. The release package
must enumerate or safely group exact-air/source cells within a proven closed
boundary and account for neighbor-fluid behavior.

### WL-07 — Integrated release and evidence

Westlight packages must be integrated with:

- the ceremonial town-to-stadium boulevard and billboard program;
- the midway oasis/mini-bunker work;
- existing Westlight screen sightlines and modes;
- town-expansion database/media IDs;
- the final atlas and PM dossier;
- the next owner-only Sites version; and
- the Box handoff.

## 5. Pavilion correction work package

### PAV-RU-01 — Research and selection

- select the Russian architectural lineage;
- record authoritative sources and rejected alternatives;
- define materials, roof, porch/arcade, fenestration, ornament and statues; and
- publish a compatibility matrix against the library, Garth/stoa/loggia, and
  Guild Hall.

### PAV-RU-02 — Spatial integration

- preserve the library–civic-space–Guild Hall axis;
- align doors, terraces, paving and ceremonial movement;
- preserve or deliberately redesign accepted Ravensgate routes;
- keep the enlarged-library terrace functional;
- prevent pavilion massing from hiding the Guild Hall or library; and
- establish day/night landmark hierarchy.

### PAV-RU-03 — Release evidence

- existing-condition and proposed plans;
- elevations/sections;
- protected-object/cell intersection report;
- exact forward/rollback;
- bidirectional library ↔ civic pavilion ↔ Guild Hall route;
- fixed-camera exterior/interior/axis evidence; and
- refreshed database, atlas, dossier, Sites and Box records.

## 6. Acceptance matrix

| ID | Requirement | Pass condition |
|---|---|---|
| PAV-RU-01 | Russian reference replaces glass pavilion | Selected cited lineage; no modern glass-box reading |
| PAV-RU-02 | Civic connectivity retained | Library ↔ civic space/pavilion ↔ Guild Hall route passes both directions |
| WL-COH-01 | Island coherence | Figure-ground, axes, routes and addresses read as one district |
| WL-PIER-01 | Water buildings intentional | 100% have designed pier/wharf structure and valid routes |
| WL-RIDE-01 | Ferris wheel | Complete wheel/support/loading/clearance evidence |
| WL-RIDE-02 | Roller coaster | Complete station/track/support/clearance evidence |
| WL-FOOD-01 | Paired outer houses | Steak and shrimp houses complete, distinct, and connected |
| WL-MALL-01 | Main/pier/stadium alignment | Continuous malls/streets with clear destination sequence |
| WL-WATER-01 | Crater water | Exact contained water volume; zero leaks/unplanned flooding |
| WL-QUAY-01 | Quay and green edge | Continuous public loop with hard/soft edge hierarchy |
| WL-SIGHT-01 | Stadium modes protected | Screen/stage/sports sightline matrix passes |
| WL-ROUTE-01 | Movement | Every required route passes both directions without dig/tower/flight |
| WL-DB-01 | Database | All new/changed objects and relations imported with integrity/FK PASS |
| WL-MEDIA-01 | Evidence | Plans, sections, maps and exact captures pass hash/decode QA |
| WL-PUB-01 | Sites | New owner-only version healthy in production |
| WL-BOX-01 | Box | Final remote paths and SHA-1 match local artifacts |

## 7. Risk register

| ID | Risk | Response / stop condition |
|---|---|---|
| WL-R01 | Water fill escapes crater or enters caves | Closed-boundary proof, neighbor-fluid model, exact post census |
| WL-R02 | Water destroys block entities/inventories | Complete basin object census; zero unapproved intersections |
| WL-R03 | Pier buildings still look accidentally afloat | Required waterline structure and section evidence |
| WL-R04 | Ferris wheel/coaster collide with district or each other | 3D clearance envelopes and cross-package cell audit |
| WL-R05 | Rides block stadium screen/stage modes | Existing Westlight sightline matrix is a protected gate |
| WL-R06 | Pier becomes a dead end | Emergency-return/service route plus normal public loop |
| WL-R07 | Main/pier/stadium remain visually disconnected | Shared axis, paving/lighting family, fixed approach cameras |
| WL-R08 | Restaurants become decorative shells | Full operational room/service/route schedule |
| WL-R09 | Quay is an unsafe vertical drop | Rails, landings, stairs, continuous walk-edge audit |
| WL-R10 | Green space is leftover filler | Programmed loop, overlooks, planting/edge hierarchy |
| WL-R11 | Russian pavilion becomes theme-park collage | One selected lineage and rejected alternatives |
| WL-R12 | Russian pavilion blocks civic bookend views | Axis/elevation/sightline test before generation |
| WL-R13 | Old glass-pavilion package is replayed | Historical shell remains retired; new exact package only |
| WL-R14 | Box receives stale pre-change atlas/catalog | Final sync after post atlas/catalog/dossier only |

## 8. Affected records

The following are historically valid but no longer sufficient as current
design/publication records after this change:

- `docs/redevelopment/2026-07-28-town-expansion/coordinate-schedule.json`
  — records the retired glass pavilion and preliminary Westlight road/oasis
  holds; it must receive a Russian-pavilion and island-plan addendum;
- `docs/redevelopment/2026-07-28-town-expansion/guild-hall-and-bar-source-of-truth.md`
  and `guild-hall-program.json` — connectivity remains, but the generic
  Garth/pavilion interpretation must be coordinated with the selected Russian
  architectural response;
- `builds/manifest.yaml` — active Westlight source objects remain protected
  inputs, not the final island master plan;
- `data/exports/box/town-expansion-baseline-2026-07-28/team-a/*` — baseline
  evidence only;
- `data/exports/world-catalog-wave2-post-2026-07-28/*` — historical Wave 2
  catalog; refresh after database import;
- `data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/*` —
  historical accepted atlas; generate a new post atlas;
- `world-showcase/public/data/buildings.json` and
  `world-showcase/public/reports/*` — current Sites content; replace in the next
  source commit; and
- Sites version 4 — healthy current historical publication, not a claim that
  the Westlight/Russian-pavilion change is built.

## 9. Required Box closeout

The final Box handoff must contain, at minimum:

- Russian pavilion research brief and selected-source matrix;
- Russian pavilion plan/elevations/sections/material sheet;
- library–pavilion–Guild Hall route and sightline reports;
- Westlight island existing/proposed figure-ground maps;
- shoreline/water/grade and protected-object surveys;
- pier-building register and individual plans/sections/captures;
- amusement-pier research paper;
- amusement-pier plan;
- Ferris-wheel elevation/clearance and evidence;
- roller-coaster plan/profile/clearance and evidence;
- steak-house and shrimp-house plans, room schedules and captures;
- main/pier/stadium mall/street alignment plan;
- crater-lake containment and neighbor-fluid report;
- quay/green-space plan and loop-route QA;
- exact forward/rollback, transaction and independent post QA;
- database import and object/media catalog;
- final atlas and PM PDF;
- Sites saved-version/production-health record; and
- Box sync report plus remote SHA-1 comparison.

Files must be copied to approved Box connector roots before sync. A local path
under `data/exports/box` is staging evidence only. The change is not
Box-verified until the remote folder/path and SHA-1 equality checks pass.

## 10. Current decision

The owner requirements are recorded and controlling. No document reviewed here
proves that the Russian pavilion, coherent Westlight island, amusement pier,
paired restaurants, aligned pedestrian malls/streets, crater lake, quay, or
green space has been engineered or built.

Current state: **REQUESTED / CHANGE CONTROLLED / PHYSICAL RELEASE PENDING**.
