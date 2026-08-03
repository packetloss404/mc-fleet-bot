# Source Register and Reconciliation

## Source precedence

Use these sources in this order:

1. The accepted immutable snapshot and verified current database define what exists now.
2. Masterplan 04's v2 no-ravine contractor brief and root coordinate file define the proposed Combined Complex concept.
3. Masterplans 01, 02, and 03 define internal architectural programs, not current-world placement.
4. Masterplan 04's map-integration package is historical input only where it conflicts with the sources above.
5. Renderings are mood and communication assets, never measured geometry.

## Accepted current-world baseline

| Evidence | Authority used here |
|---|---|
| Immutable region snapshot | `data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region` |
| Snapshot SHA-256 | `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751` |
| Post-release acceptance | `data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json` — `PASS`, `ACCEPTED` |
| Durable feature database | `data/world-map.db` — SHA-256 `71876a7ecf73e90475a9b5047938e14f39ea0a20381dea8c5286582059f95f8a` |
| Catalog census | 1,215 features; 1,214 active and one retired |
| Cataloged feature union | `x=-714…1300`, `y=-46…319`, `z=-719…311.5` |
| Sealed coordinate directory | `docs/redevelopment/2026-07-29-poi-coordinate-directory/poi-coordinate-directory.json` |
| Current top-down raster | `data/exports/box/town-expansion-r1-final-2026-07-28/media/maps/map-whole-world-overview.png` |
| Raster SHA-256 | `ca62fa267913aff3e044277ac20ee0c9ceaebaa591080b410adea80cf92d769f` |
| Raster projection | 2352×2352; north is `-Z`; world `x=-883…1468`, `z=-1387…964` |

This is the latest accepted immutable physical baseline in the repository, dated July 28, 2026. It is not claimed to be byte-for-byte live state on August 3 without a fresh saved-world snapshot.

Black pixels and any map area beyond the raster are unloaded or absent from the accepted snapshot. They are not evidence of vacant land.

## Masterplan authority

The v2 Combined Complex authority is:

- `masterplans/04-combined-complex/04-contractor/contractor-brief.json`
- `masterplans/04-combined-complex/02-design/site-coordinates.json`
- `masterplans/04-combined-complex/04-contractor/map-integration/contractor-brief.json`
- `masterplans/04-combined-complex/build-info.json`
- `masterplans/04-combined-complex/build-info-map-integration.json`

The child architectural authorities are:

- `masterplans/01-cheyenne-mountain-complex/06-contractor/contractor-brief.json`
- `masterplans/02-subtropolis/06-contractor/contractor-brief.json`
- `masterplans/03-houston-tunnel-system/06-contractor/contractor-brief.json`

The directory named `03-houston-tunnel-system` is the city-in-a-city layer: a 138×138 downtown above Houston-inspired pedestrian tunnels.

## Binding v2 design decisions retained

- One continuous mountain; no V-shaped ravine.
- Limestone below the contact and granite above it.
- The authored contact is local `Y=200`.
- Composite terrane plaque at local `(-40, 200, -360)`.
- Cheyenne outer portal and blast door at local `(0, 200, -420)`.
- Return route is funicular plus summit road; there is no combined-complex return skybridge.
- The Houston downtown remains 138×138; “24 blocks” in older text is a sample/compressed block logic, not the city envelope.
- Houston-local skybridges remain allowed. The no-skybridge decision applies only to the mountain return route.
- The public shaft, SubTropolis, service tunnel, Cheyenne chamber, Gateway Approach, Grand Avenue, gateway, and summit remain the principal sequence.

## Old Town identity clarification

“Old Town” means the accepted current-world Ravensreach district. The Ravensreach public-realm plan and the accepted Old Town bounds at `x=-126…-45`, `z=-422…-338` control that identity.

Masterplan 04 separately invented a 33-schematic “old town” as a museum of the fleet's schematic library. That interpretation is superseded. Masterplan 05 does not copy, relocate, or compete with Ravensreach. The former program area is Z02 Gateway Approach; the schematic museum is deferred to a separately named and approved Fleet Archive Park, if ever requested.

## Superseded assumptions and conflicts

The old map-integration research describes four bots in a roughly 200×200 starter area near `(935,60,300)`, three explored chunks, six empty markers, and two placeholder mining zones. The accepted current map instead contains 1,215 durable features over a much larger built envelope. Do not use the old base location for placement.

The following conflicts are normalized by this package:

| Conflict in Masterplan 04 | Decision in Masterplan 05 |
|---|---|
| Native placement around world origin overlaps the current built world | Translate to the east reserve; current feature max `x=1300`, study reserve starts at `x=1500` |
| Native vertical range `Y=-100…800` cannot fit vanilla `Y=-64…319` | Use a provisional piecewise vertical transform; retain the native geometry only as a separate-world fallback |
| Map-integration files retain a ravine marker and portal `Y=0` | Remove the ravine; retain the v2 contact and portal at local `Y=200` |
| Service tunnel is called 120 blocks despite a much larger 3D separation | Use transformed endpoints and require a surveyed, rail-valid centerline |
| Funicular endpoint definitions are vertical or too steep | Use a switchback centerline with horizontal run at least equal to vertical rise |
| Public “vertical” shaft changes Z by 30 blocks | Treat it as a shaft with a declared lower dogleg, or align it during detailed design |
| Grand Avenue is labeled 425 blocks but its endpoints are about 434 blocks apart | The endpoints control; remeasure the final centerline after terrain design |
| Rail spur appears at both local `X=50` and `X=200` | Reserve a corridor only; freeze one surveyed centerline before operations |
| Old gateway command lands 60 blocks above its architecture | New landing Y must be derived from the surveyed entrance floor |
| Root summit and map-integration summit disagree | Root v2 local summit `(0,800,-500)` controls |
| Portal-gallery rooms are treated like active portals | They are architectural destinations only; activation is a separate decision and test |
| “Old town” was interpreted as a new 33-schematic district | Ravensreach remains the canonical Old Town; replace the duplicate with Z02 Gateway Approach and defer any schematic museum |
| Z02 had no mature transit role beyond a reserved rail line | Add two complete future-use surface stops and a separately releasable concealed subway branch to an eight-track/eight-platform expansion terminal |
| C1 was a 267-block stub whose current-world endpoint was a road-network bounding-box edge | Replace with the 1,277-block East Corridor from a terminal roundabout at `(430,~,80)` to the Gateway, swinging south of the Data District and ending in local roads that tie into cataloged existing roads |
| C1 carried rail only as a "reserved centerline" with no alignment, no Y, and no station | Design road and rail together in one 56-block reservation with three stations, and state the clear-span and vertical-clearance rules that keep the rail buildable if the highway goes first |
| Grand Avenue and the Z02 rail were planned independently | They cross at approximately `(2108,~,-250)` at a 7.9-degree skew needing a ~95-block deck; insert an orthogonal crossing node and carry the road over the rail |
| The current world was assumed to have a railway | It does not. The catalog holds 1,215 features and no track of any kind; "Railway" elsewhere in this repository is the PaaS host, not rail infrastructure |

## Highway and rail design authorities

The East Corridor geometry is derived from real published standards rather than invented. Where a figure is compressed, the compression rule is stated with it.

| Topic | Authority |
|---|---|
| Interchange spacing, ramp gore spacing, weaving minimums, C-D roads | WSDOT Design Manual M 22-01, Ch. 1360 (Exhibits 1360-2, 1360-3, 1360-26) |
| Interchange type selection, LOS by form, cost and ROW ranking | VTRC 99-R15, *Guidelines for Preliminary Selection of the Optimum Interchange Type* |
| Interchange forms, frontage roads, DDI geometry | TxDOT Roadway Design Manual 14.10, 15.3, 15.3.2; TSP Manual 11.2.1 |
| Alternative intersections and interchanges | FHWA-HRT-09-060 (AIIR); DDI Informational Guide 2nd ed. (TRB) |
| Roundabout geometry, entry flares, splitter islands | NCHRP Report 672 |
| Speed-change lanes, taper ratios, gore and nose geometry | AASHTO Green Book; Caltrans HDM 504; UK DMRB CD 122 |
| Advance signing sequence and exit numbering | MUTCD 11th ed. §2E |
| Double-track reservation, track centers, cess, structure gauge | Sound Transit design criteria; UTA DCM §3.3–3.4, Table 8-1; TCRP 57 §3.4 |
| Rail-in-highway-median precedent and its documented failure modes | CTA Blue/Red Line expressway-median branches; LA Metro C Line in the I-105 median |
| Emergency egress from constrained rail corridors | NFPA 130 |

**Design speed is declared, not scaled.** The corridor is built to the "urban ≤50 mph" tier at true 1:1 because in-world travel speeds — horse ~52 km/h, minecart ~29 km/h — genuinely sit in that tier. A 0.6 longitudinal factor is applied only to storage and queueing elements. Gores, noses, taper ratios, and the cross-section take no factor.

## Current interfaces that may be reused

- Data District road-network envelope: `x=567…1283`, `z=-713…-264`.
- Data District shared-grid envelope: `x=1000…1300`, `z=-620…-172`.
- Owner portal-gallery central room: `x=230…250`, `z=145…165`, approximately `y=78…88`. This is not proof of an active portal.
- Raven Rock east portal: exact catalog point `(285,18,-30)`.
- Legacy MainStreet C01 public portal: accepted geometry near `(143,69,182)`.
- Cataloged C01 east arrival `(703,42,-80)` remains contested under ISSUE-002 and is not an approved connector.
- Iowa information/continuity annex `(774,80,-473)` is a cataloged centroid; the exact door must be surveyed before using it as an interface.

## Evidence limitations carried into the plan

- The east reserve is intentionally outside all cataloged feature bounds, but most of it is not present in the accepted rendered snapshot.
- The East Corridor clearance result in `corridor-clearance.json` is a plan-only separation test against cataloged footprints. It reports zero surface intersections and a 50-block nearest-surface clearance; it is not a terrain, hydrology, entity, ownership, or chunk-generation clearance.
- The corridor passes over the contested C01 East stack with 18 blocks of plan clearance and roughly 17 blocks of vertical separation. ISSUE-002 must close before embankment loading there is designed.
- The corridor's eastern terminus lies beyond the accepted raster edge at `x=1468`; that segment has never been rendered.
- Nothing is cataloged south of the corridor along its whole length. That is an absence of records, not evidence of buildable land, and the southern ramp quadrants depend on it being surveyed.
- A database non-overlap check is not a terrain, entity, ownership, hydrology, chunk-generation, or protected-interface clearance.
- Derived centers in the POI directory are navigation references, not landing-safety claims.
- Z02 station, branch, and terminal coordinates are coherent study geometry, not evidence of terrain cover, fluid clearance, safe grade, or buildable underground volume.
- Offline geometry and maps do not authorize a live build.
