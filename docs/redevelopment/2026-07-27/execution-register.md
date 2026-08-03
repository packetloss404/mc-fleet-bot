# Execution Register

## Release model

The work is divided into independently reversible packages. A package may not
borrow an acceptance result from another package or an older snapshot.

| Package | Scope | Depends on | Protected concerns | Exit evidence |
|---|---|---|---|---|
| R0 | Baseline snapshot, maps, database/media export | none | no live writes | snapshot hash, atlas manifests, database census |
| R1 | First-class tunnel/route database objects | R0 | stable external IDs | import report, feature counts, media crosswalk |
| R2 | Raven Rock standard sections and easy-walk circulation | R1 | nearby caves, merging legs, existing tread geometry | guarded preflight, water check, bidirectional routes, section census |
| R3 | Westlight focal screen, seating/entry hierarchy, venue wayfinding | R0 | bowl shell, existing passages, field | sightline views, screen feature, audience/entry routes |
| R4 | MainStreet street hierarchy, frontage assignments, garages | R0, master plan | fences, gates, house shells, roads | plot map, guarded operations, every-house access matrix |
| R5 | Support-building consolidation and road completion | R4 | B02/B03 interiors and block entities | collision-free plot schedule, route checks, new database geometry |
| R6 | C01 portal relocation and parking-edge completion | R0, terrain section | public portal, parking cells, surface hangar interfaces | parking boundary census, new entry route, hidden old façade |
| R7 | C01 earth cover and mountainside road | R6 | roof/heliport/observatory interpretation, terrain drainage | exterior exposure sweep, grade profile, road route |
| R8 | Post-build atlas, screenshots, reports, database observations | R2–R7 | consistent final snapshot | all images and observations share one snapshot hash |
| R9 | Sites production release | R8 | asset size and source provenance | saved Sites version, successful production deployment |

## Stop-work triggers

- A source guard differs from the pinned snapshot.
- A protected block entity falls inside a removal, clone, or terrain-fill volume.
- A tunnel trace escapes its explicit bounding box or connects to a neighboring
  bore/cave outside the designed node.
- A proposed road exceeds the accepted grade or intersects a building shell,
  vault, shelter, gate, or water body without an authored transition.
- A relocation target overlaps any first-class feature or reserved future plot.
- A post-run command reports an unrecognized result.
- A route passes only in one direction.
- The world changes after preflight and before execution.

## Rollback discipline

- Preserve the pre-release saved-world snapshot and file hashes.
- Generate inverse operations from the actual forward package when exact inverse
  guards are possible.
- For structure movement, preserve source and target cuboids before removal.
- Never erase the old source until target placement, block-entity inventory, and
  walkability checks pass.
- Release force-loaded chunks added by tooling and restore the operator’s
  pre-existing force-load set.

