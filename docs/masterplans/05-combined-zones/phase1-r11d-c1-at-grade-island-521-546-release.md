# Combined Zones CZ-R11D: C1 at-grade island 521..546

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** `f625388d44a4532bb1f35c041cda0ddc9fca2aa0504f09cb0f537cf252ee0320`  
**Offline-QA payload identity:** `e45c5e36e9f2379c3d30efd4f21886bfa8b283ba233f6dd0851f81a851ebc5bd`
**Completed release identity:** `e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb`  
**Post-QA payload identity:** `0e16f032c614bc6e923ec097de2e281d084207cf190d708ade3a1f9b0fccf319`

## Build scope

R11D compiles the next complete `AT_GRADE_COORDINATION_PASS` treatment run at
C1 stations 521 through 546. It remains an isolated, uncommissioned route
island: stations 518 through 520 retain `EMBANKMENT_CONCEPT_GEOTECH_HOLD`, and
station 547 retains its separate frozen treatment. R11D does not open or
bridge either boundary.

The frozen 26-station raster contains 499 candidate surface cells. The exact
safe connected component owns 476 pavement cells, 329 foundation fills, and
479 terrain/headroom cuts, for one 1,284-cell guarded package:

- 322 gray-concrete carriageway cells;
- 99 smooth-stone outer-shoulder cells;
- 55 yellow-concrete median cells;
- 329 stone-brick foundation cells; and
- 479 air targets, producing 952/952 two-block headroom cells when the 473
  source-air cells are included.

The 476 pavement cells form one 26-neighbour component. This is useful dry
physical progress, but the manifest explicitly marks the route uncommissioned
until the held adjacent treatments receive their own exact packages.

## Exact preserved exceptions

The compiler partitions all 499 candidate cells without silently clearing a
reserved or disconnected point:

- 18 cells conflict with the accepted R11A/R11B/R11C target envelope;
- two cells project into frozen rail-reservation columns;
- two cells project into frozen utility-reservation columns;
- zero cells project into road-collection columns; and
- one cell at `(934,103,67)` is a disconnected local grade shadow.

The one-cell shadow sits over gravel at `(934,102,67)`. Owning it would create
a useless disconnected pavement target and a gravity dependency. R11D instead
preserves both cells exactly. The 476 owned cells plus 23 disjoint exceptions
reconstruct the complete 499-cell candidate raster.

## Dependency and isolation proof

R11D emits no gravity or leaf-transition package. The final 4,160-cell
interaction halo contains zero fluids, gravity states, containers/control
blocks, block entities, saved movable entities, protected relics, or C01
default-deny cells. The operation intersects zero prior-release targets and
zero rail, utility, or drainage reservation columns.

The source-bound canopy audit proves:

- 105 exact owned log/wood removals;
- 292 retained leaves potentially influenced by those removals;
- projected retained-log distances `{1:91, 2:112, 3:75, 4:10, 5:4}`;
- zero proven decay-risk leaves;
- zero persistent-property transitions; and
- zero unrelated canopy mutations.

## Source and artifacts

The compiler is bound to accepted R11C post snapshot
`data/worldsnap-combined-zones-r11c-post-20260821T185813Z`, complete-save
SHA-256
`a4e7f8a9066ef0818436b4d3c92e594daa91fb4136cd8d7603988bed565ce219`,
and completed release identity
`f2c37e1c70a8829981352a0d64d1e69edb556a19359d1afd56061e9fe2169bb9`.

- Manifest:
  `data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json`
- Forward body SHA-256:
  `4308c3428b71f59493480d976d4bef5c7e58718db622164bb1c6ac1631de532a`
- Rollback body SHA-256:
  `12633ffd4ae13f4e753137677c2f738180c521b81475745ceeba7ebd72aeae2e`
- Offline evidence:
  `data/world-review/combined-zones-r11d-offline-20260821T191000Z`

Offline results:

- deterministic compiler regression: 9/9 PASS;
- independent immutable-source QA: PASS, 1,284/1,284 guards, one connected
  surface, complete headroom, and zero dependency transitions;
- exact manifest/inverse QA: PASS, one package and 1,284 unique targets;
- exact R11C source preflight: PASS, 1,284/1,284;
- projected rollback preflight: PASS, 1,284/1,284 against the forward overlay;
- forward and rollback strict-noop parser checks: PASS, 2,568 guarded groups
  and zero WorldEdit leftovers;
- block-entity target audit: PASS, zero blocking block entities; and
- scoped wrapper `--print-plan`: PASS, one package and no global gate.

Regenerate and verify:

```bash
node scripts/compile_combined_zones_r11d_c1_at_grade_island_521_546.mjs
node scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_offline.mjs
npx vitest run test/build/combinedZonesR11DC1AtGradeIsland521546.test.ts
```

The compiler, verifier, preflights, and tests made no live call, service
mutation, or world edit. Fresh same-moment entity clearance and journaled
strict-noop execution were subsequently performed by the root release wrapper.

## Execution and post-release seal

The scoped wrapper terminally accepted R11D in
`data/world-review/combined-zones-r11d-live-20260821T192414Z/evidence-ledger.json`.
Independent read-only QA verifies:

- all 17 ordered ledger stages and all 17 evidence bindings;
- 1,284/1,284 exact source guards and 1,284/1,284 exact post targets;
- one connected 476-cell pavement island, 329/329 foundation fills, 476/476
  stable contacts, and 952/952 two-block headroom cells;
- all 23 preserved candidate exceptions unchanged;
- all 292 retained leaves unchanged and connected to retained logs at
  distances one through five;
- zero undeclared drift across the 4,160-cell interaction halo;
- strict execution of 1,284/1,284 groups with zero no-ops or failures; and
- 1,284/1,284 rollback post-state guards.

The sealed reports are
`data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json`
and `r11d-post-release-qa.md`. Regenerate and run both focused suites:

```bash
node scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_post_release.mjs
npx vitest run \
  test/build/combinedZonesR11DC1AtGradeIsland521546.test.ts \
  test/build/qaCombinedZonesR11DC1AtGradeIsland521546PostRelease.test.ts
```
