# Masterplan 05 — Combined Zones

Status: **SITING STUDY — NOT AUTHORIZED FOR WORLD EDITS**

## The integration decision

Build the Combined Complex as a new east-side district of the current world, not at Masterplan 04's authored origin and not at the obsolete `(935,60,300)` starter-base location.

The recommended study reserves `x=1500…3050`, `z=-1050…450`. Its local origin is provisionally mapped to `(2250,72,-300)`. The complete plan is rotated 90 degrees so its original south-facing historical gateway faces west toward the current Data District. This creates a short, legible surface interface while putting the mountain and secure complex farther east, away from the accepted built envelope.

The horizontal layout retains Masterplan 04's authored relationships. The vertical layout is redesigned to fit the current stock Paper world. The choice is deliberate:

- Current cataloged features end at `x=1300`; the study reservation starts at `x=1500`.
- The old town and gateway become the nearest proposed zones to the current world.
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
| `(0, 0, 700)` | `(1550, -300)` | historical gateway |
| `(0, 0, 500)` | `(1750, -300)` | old-town / Grand Avenue origin |
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
| Z01 Gateway / arrival | anchor `(1550,~, -300)` | west-facing 7×7 pavilion, visitor orientation, rail/road transfer |
| Z02 Old town | `x=1550…1950`, `z=-600…0` | 33 curated schematics in residential, fortress, temple, statue, attraction, and easter-egg groups |
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

## How it connects to the current map

### C1 — physical surface connection

The primary connection is a new multimodal approach from the surveyed east edge of the Data District road network to the west-facing Combined Zones gateway.

- Current study interface: approximately `(1283,~, -300)`, derived from the road-network eastern bound.
- New gateway: `(1550,~, -300)`.
- Direct plan distance: 267 blocks.
- Program: two-way road, protected pedestrian path, utilities, and a reserved rail centerline.
- Rule: the final current-world endpoint, grade, bridges, drainage, and Y values come from a fresh terrain and ownership survey.

This is the line that makes the proposal part of the current map rather than an isolated attraction.

### C2 — optional visitor portal

The current owner portal gallery around `(240,~,155)` can provide an optional fast visitor transfer to Z01. The gallery is accepted architecture, but its rooms are not evidence of active portals. Portal activation requires a selected mechanism, symmetric landing safety, permission review, and a tested return path.

The map shows this as a purple logical link, not physical distance.

### C3 — future PassageWay interchange

Reserve, but do not build, an underground interchange between the existing eastern network and the SubTropolis public lobby. The exact current endpoint is intentionally unset. C01 east is contested under ISSUE-002, the Iowa annex coordinate is a centroid rather than a door, and no current feature should be treated as a tunnel interface without an exact survey.

The future interface must be separately isolated from secure Cheyenne circulation. Public arrival goes to SubTropolis and Houston; Cheyenne remains behind its service checkpoint and blast-door sequence.

## Visitor sequence

The intended journey is continuous and understandable:

1. Leave the current Data District on the east connector.
2. Arrive at the west-facing Gateway Pavilion.
3. Explore the old town and its reused schematic library.
4. Follow Grand Avenue into the Houston-inspired city.
5. Descend through the public shaft and observation landing.
6. Enter SubTropolis and its tenant avenues.
7. Transfer to the controlled service rail.
8. Cross the limestone/granite contact at the terrane plaque.
9. Pass the 25-ton blast-door threshold into Cheyenne.
10. Ride the switchback funicular to the summit.
11. Return by the mountain road to the city and gateway.

The material progression is old-town vernacular → Houston modern → limestone industrial → granite military → open summit.

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

- Design the exact C1 centerlines and gateway landing.
- Establish protected staging areas and material logistics outside future public zones.
- Compile the zone ownership/interface contract before any block operation.
- Build only a bounded visual pilot of the connector and gateway using fresh exact-state guards.

Exit gate: bidirectional normal-walk pilot, drainage and grade review, no protected conflicts, exact rollback, and matched before/after evidence.

### Phase 2 — deep shells first

- Excavate and line the public shaft lower works and SubTropolis chamber.
- Construct the service/contact route with rail-valid grades.
- Build the Cheyenne chamber shell and its independent construction access.
- Preserve solid buffers between public, tenant, utility, and secure zones.

Exit gate: structural envelopes, headroom, fluids, lighting, egress, and route graphs pass offline and live review before surface loads are added.

### Phase 3 — surface framework

- Form the continuous mountain and its drainage without a ravine.
- Build the old-town parcels, Grand Avenue, Houston street grid, and gateway public realm.
- Build the summit return geometry as switchbacks, not the obsolete vertical line.

Exit gate: terrain tie-ins, no unintended water diversion, surface route continuity, and verified non-intersection with all deep shells.

### Phase 4 — fit-out and identity

- Fit out SubTropolis tenant zones and Houston food courts.
- Install Cheyenne's 15 spring-mounted buildings, Battle Cab, chapel, reservoir, inn, blast doors, and signs.
- Install the terrane plaque only after its final geological wording is reviewed.
- Place the curated old-town schematics only after their exact footprints, rotations, block entities, and provenance are inventoried.

Exit gate: every occupied floor has safe circulation, every access class is enforced, protected block entities are migrated transactionally, and all exact objects have evidence cameras.

### Phase 5 — transport and commissioning

- Commission C1 road, pedestrian, and rail modes.
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
3. Fix the exact connector endpoint and cross-section at the Data District.
4. Select the active portal mechanism, if any.
5. Resolve the public shaft dogleg and the single canonical rail-spur centerline.
6. Approve final geological wording for the contact plaque.
7. Inventory and license/provenance-check every old-town schematic before placement.

Until those decisions and Phase 0 gates pass, the coordinates in this package are a coherent planning transform, not build coordinates.
