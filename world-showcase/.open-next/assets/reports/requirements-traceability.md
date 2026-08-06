# Requirements Traceability

Release: `REDEV-2026-07-27-R1`  
Final machine QA: **PASS**  
Accepted snapshot:
`f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`

## Status model

- `VERIFIED` — built, post-snapshot proof complete, and reflected in the
  catalog/media handoff.
- `PILOT VERIFIED` — a physical reference implementation is accepted; the same
  standard has not yet been applied to every similar object in the world.
- `DOCUMENTED NEXT PHASE` — researched, specified, and scheduled beyond this
  release; not represented as already built.

## Request-to-delivery matrix

| ID | Requested outcome | Delivered evidence | Acceptance result | Status |
|---|---|---|---|---|
| MAP-01 | One large map of everything | Post atlas `00-overall-active-world-surface-atlas.png`; 1792×2176; manifest and hash | 3,808/3,808 chunks loaded; zero missing | VERIFIED |
| MAP-02 | More detailed maps | Six post surface detail maps, underground atlas, campus/floor-plan sheets | Bounds, source snapshot, dimensions, and hashes inventoried | VERIFIED |
| CAP-01 | More building/screenshots | 91 accepted post-state release images plus retained baseline captures | Every release image resolves through a capture report | VERIFIED |
| CAP-02 | Match screenshots to database objects | `object-media-index.json`; capture `primaryFeatureId`; 37 exact-object screenshot features | Paths/hashes resolve; object/context relations separated | VERIFIED |
| DB-01 | Report database contents | HTML/JSON database report; full feature export; schema and row census | 824 features, 21 scans, 1,830 observations accounted for | VERIFIED |
| WEB-01 | Build a Sites showcase | Versioned source and owner-only production deployment at `https://mc-fleet-world-atlas.ianwalmsley.chatgpt.site` | Maps, catalog, PDF, data, QA, filtering, responsive build, and live production URL | VERIFIED |
| PM-01 | PM team manages every request | WBS, execution register, traceability, risk/incident logs, artifact register | Every request has an evidence path and disposition | VERIFIED |
| RES-01 | Deep research by zone/building | Master plan, 68-building review, infrastructure standards, bibliography | Sources tied to in-world standards; inferences labeled | VERIFIED |
| PLAN-01 | City-grid research paper | Grid/connectivity research synthesis and applicability matrix in master plan | Findings converted into block, frontage, alley, and node rules | VERIFIED |
| PLAN-02 | Master development plan | Existing-condition analysis, alternatives, plots, hierarchy, phases, risks, gates | Governed five-package Wave 1 and documented next phases | VERIFIED |
| PLAN-03 | Large PDF with maps/screenshots/future plots | Compiled `master-plan.pdf` including as-built completion appendices | Generated from named Markdown and current post media | VERIFIED |
| MSA-01 | Consolidate scattered campus buildings | B02 culinary forecourt/pylons; B03 service lane/screen/pylons; connected public realm | Campus destinations rejoin the street/service network without unsafe building translation | VERIFIED |
| MSA-02 | Complete roads | Two rear alleys, C01 east-edge road, service/public connections | Both alleys and declared connections pass both directions | VERIFIED |
| MSA-03 | Garages for all houses | `GAR-H01…H12` and `GAR-C02…C07`; exact media and route tests | 18/18 garage connections pass in both directions | VERIFIED |
| MSA-04 | One street or two coherent streets | Main Street plus two rear/service street fronts with house-specific orientation/access | Every one of 18 houses has a declared street/garage relationship | VERIFIED |
| MSA-05 | Improve corner comprehension | Six R4 wayfinding landmarks plus B02/B03 pylons and route hierarchy | Installed nodes cataloged and visually recorded | VERIFIED |
| BKR-01 | Move bunker relationship away from parking | C01 surface/landform and east-edge seam; recessed public portal | Parking edge and portal relationship re-composed without moving protected underground core | VERIFIED |
| BKR-02 | Add mountainside road | `C01-EAST-EDGE-ROAD-PHASE1` and gate/approach features | Exact post-state and connected portal approach accepted | VERIFIED |
| BKR-03 | Move/rebuild entrance | Separately guarded recessed portal Phase 2 | Mouth-to-lobby route passes both directions; five post cameras | VERIFIED |
| BKR-04 | Make the complex read underground | Three landform zones and concealed surface treatment | Eight surface cameras and exact post-state accepted | VERIFIED |
| BKR-05 | Make stadium easy to find | Westlight focal display and MainStreet/C01 wayfinding objects | Focal target exists and approach hierarchy documented | VERIFIED |
| STD-01 | Fix stadium seating/screen problem | 524-cell Westlight display plus 48-view sightline/mode matrix | Screen exists; multi-sector review set accepted | VERIFIED |
| TUN-01 | Uniform tunnel standards | Raven Rock S1 physical standard-section pilot and governing standard | S1 passes exact state and two-way walk | PILOT VERIFIED |
| TUN-02 | Easier stairs/stairwells | Stair/landing/headroom standards and S1 walkable pilot connection | Pilot route passes; world-wide rollout remains controlled next phase | PILOT VERIFIED |
| SP-01 | Check crowding/proximity and spacing | Figure-ground audit, protected collision analysis, view/transition standards | MainStreet Wave 1 resolves selected service/residential edges; remaining zones scheduled | VERIFIED |

## Key implementation decisions

### MainStreet versus GrandStreet

The user-facing alias is GrandStreet America. Machine identifiers remain
`mainstreet-america` because the database, WorldGuard region, scripts, authored
plans, and prior evidence use that stable key. Renaming those identifiers during
a physical release would add risk without improving the place.

### Bunker relocation

The requested outcome was interpreted spatially rather than as a literal
block-for-block translation of a finished underground complex. Moving the full
C01 stack would endanger rooms, block entities, authored connections, and the
mountain edge. The accepted solution moved the public relationship: completed
the parking/road seam, buried exposed mass with landform, extended the
mountain-side road, and built a new recessed portal/connector.

### Stadium identity

The “seating faces a doorway and there is no screen” defect belongs to Westlight
Stadium / `WL-BOWL`, not the C01 training arena. `VEN-WL-01` installs the missing
Westlight focal object and records a 48-view matrix rather than relying on a
single camera.

### Tunnel scope

The release delivers a proven Raven Rock S1 reference section. It does not call
every historic tunnel leg complete. Later legs must be separately surveyed,
generated, guarded, walked in both directions, photographed, and accepted
against the same standard.

## Evidence crosswalk

| Evidence question | Source |
|---|---|
| What actually ran? | `data/world-review/redevelopment-atomic-transaction-2026-07-27.json` |
| Did the final world match? | `data/world-review/redevelopment-post-deployment-qa-2026-07-27.json` |
| Can the paths be walked? | `data/world-review/redevelopment-route-qa-2026-07-27.json` |
| What happened in the rejected first attempt? | `release-attempt-1-incident.md` |
| What is in the database? | `database-and-media-report.md` and post catalog report |
| Which database object owns an image? | `data/exports/world-catalog-post-2026-07-27/object-media-index.json` |
| Where are all files and hashes? | `artifact-register.md` and machine manifest |
| What governs the next wave? | `master-plan.md`, `infrastructure-standards.md`, `execution-register.md` |
| What is the final narrative? | `as-built-release-completion.md` |

## Managed next phases

The following work is intentionally controlled after this release:

- roll the S1 tunnel standard across remaining named tunnel segments;
- create the one missing standalone floor-plan sheet for the new C01 portal;
- continue exact-object screenshot coverage from 37/824 features and 14/69
  buildings;
- refresh publication against a new immutable snapshot after later live-world
  changes.

These next phases are visible in the handoff and are not counted as failures of
the accepted five-package release.
