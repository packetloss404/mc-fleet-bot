# CIRC-WL-ARRIVAL-ROAD-01 · Approach Road 2-wide pedestrian edge

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-LEGACY-CROSS-AREA-CIRCULATION`
**Source:** fresh immutable snapshot
`data/worldsnap-approach-edge-exec-source-20260824T190225Z`
(SHA-256 `86e14835d42e671081fd2f0ca42ab22165977ebbf12cbab7af6a90b1e4bdd9f1`)
**Post snapshot:** `data/worldsnap-approach-edge-post-20260824T190652Z`
(SHA-256 `ad362ed0194fc5f43232b70d7a89325d1dd19b8ed4b6d9442472dae4fa2ed6d6`)
**Manifest identity:** `9ba64e7f99ae56b5344d674ec3098d464815ab16e4de8cbf0660f66ddfa81df0`
**Ledger identity:** `16cd474e37d17df2ad1fd26ccb66682575458e18ccfe72ecbc3b2ba8f76f93f8`

This release adds a 2-wide pedestrian edge (`minecraft:gray_concrete`) at the
Approach Road carriageway surface level, beside the preserved 7-wide ceremonial
corridor, exactly where the accepted read-only exact-cell survey proved a
conflict-free 2-clear strip on **both** sides of each column. The 7-wide
carriageway is preserved exactly.

## Survey and geometry

- Survey: `data/world-review/approach-road-exact-cell-survey-20260824/approach-road-survey.json`
- Declared conflict-free candidates: **336 cells** across **84 columns**
  (2-wide on both sides of each column), coordinate SHA-256
  `2753a9f95a5fa9ce87c2a994ac16ceace87fc6e93b90e6c915ccefc0bfa4f501`.
- Declared 7-wide carriageway surface: **1379 cells**, SHA-256
  `005e364d782c3effec470d36cb5c612a7b1f394791b94db1fe5d6c2331f4a41c`.
- The compiler reproduces the survey's exact candidate derivation from the
  source snapshot and verifies both hashes before emitting any operation.
- All 336 candidate cells lie inside `TE-ROAD-01` ownership
  (`TE-REGIONAL-APPROACH-ROAD`).

## Build scope

A strict walkability + safe-support filter is applied to the 336 survey
candidates before emitting operations. An edge cell is built only when:

1. **Headroom:** the cell directly above the edge (`deckY+1`) and the next
   (`deckY+2`) are non-colliding (air or short plants) so a standing pedestrian
   fits at the carriageway surface level.
2. **Support:** the cell at `deckY-1` is solid, or the air/plant column below is
   safely fillable to a solid non-fluid, non-block-entity base with a bounded
   depth (≤ 3), so no floating slab is created.
3. **No hazard:** the surface and fill sources are replaceable (air, dirt,
   grass_block, plants) — never water, lava, containers, signs, or control blocks.

Executed scope:

| Package | Role | Operations |
|---|---|---|
| `support-fill` | Shallow edge-support fill (`minecraft:stone`) | 18 |
| `edge-pave` | 2-wide pedestrian edge (`minecraft:gray_concrete`) | 67 |
| **Total** | | **85 exact targets** |

`mvpScope: false`, `scopeIds: ['TE-REGIONAL-APPROACH-ROAD']`.

## Held cells (269 of the survey's 336)

The remaining candidate cells are recorded as scoped holds, each with an exact
reason (see the manifest `scope.held.byReason`):

| Reason | Cells |
|---|---|
| `headroom-h1=grass_block` (terrain rises into the edge column) | 56 |
| `headroom-h1=dirt;headroom-h2=grass_block` (terrain rises 2+) | 48 |
| `support-depth>3` (deep elevated deck, no shallow fill possible) | 121 |
| `fluid-base` (support column bottoms in water) | 28 |
| `headroom-h2=dark_oak_planks` (overhang canopy) | 12 |
| `headroom-h2=dark_oak_planks;forbidden-base` (overhang + block entity) | 4 |

These are **not** failures — they are exact-cell scoped holds where the survey's
clearance model was more permissive than a strict walkable 2-tall path at road
level. A future scoped package may address them (e.g. a cantilevered edge or a
ground-level edge at the berm top) after separate design and entity clearance.

## Hard-safety kernel evidence

- Fresh immutable source snapshot captured before execution.
- Survey candidate/surface coordinate hashes reproduced exactly from the source.
- Forward source preflight: 67/67 + 18/18 PASS.
- Block-entity audit: **0 blockers**.
- Live-entity gate: **0 blockers** (a single wild roaming sheep at
  `(-217.28, 71, -490.50)` was **relocated** via RCON `tp` to open ground
  `(-216.5, 65, -469.5)`; `save-all flush` taken per R11M precedent — no mob was
  killed).
- Strict-noop parser dry-runs (forward + rollback, both packages): 0 failures,
  0 no-ops.
- Strict-noop live execution: **85/85 changed, 0 failed, 0 no-op**
  (support-fill 18/18, edge-pave 67/67).
- Immutable post snapshot captured at `2026-08-24T19:06:52Z`.
- Rollback post-state preflight: 67/67 + 18/18 PASS against the post snapshot.
- Post-state verification: **85/85 operated targets** match the forward desired
  states; **1006/1006 carriageway deck cells** unchanged (7-wide corridor
  preserved exactly).

## Evidence

- Compiler: `scripts/compile_approach_road_pedestrian_edge.mjs`
- Forward ops: `data/buildops/approach-road-pedestrian-edge.{support-fill,edge-pave}.forward.txt`
- Rollback ops: `data/buildops/approach-road-pedestrian-edge.{support-fill,edge-pave}.rollback.txt`
- Release manifest: `data/buildops/approach-road-pedestrian-edge.release-manifest.json`
- Live evidence ledger: `data/world-review/approach-road-edge-live-20260824T191620Z/`
  (includes evidence-ledger.json, execution journals, preflight, block-entity
  audit, live-entity gate, parser dry-runs, and rollback post-state preflights)
- Regression: `test/build/approachRoadPedestrianEdge.test.ts`

## Boundary

- **No route-commissioning claim.** `routeCommissioned: false`. The edge is a
  walkable pavement strip; it does not commission a bidirectional route, lighting
  cadence, drainage, stopping-bay, or bridge accessibility.
- The 7-wide carriageway is preserved exactly (1006/1006 deck cells unchanged).
- The 269 held cells remain default-deny for this release.
- No block entity, container, control block, or protected feature was touched.
- No mob was killed; the single blocking sheep was relocated.
