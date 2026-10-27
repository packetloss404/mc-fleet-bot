# Combined Zones CZ-R11A: C1 east highway pavement pilot

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** 24489cfadb8eaedc4fc1e3d0b2b8f20656dc03b7e6d8755a6e55c74ab6c3d057
**Completed release identity:** 683bfb67927f9f71a03011e2d2e915a7169f8e947d5a6afef5a7ab101aa39b8f
**Post-QA payload identity:** f34fb2ba6f4b1fa3dd4aee90098995334245a5beccb0be6f7bec87cbf69a0dd3

## Build scope

R11A materializes the first independently buildable C1 highway segment from
the accepted R00 raster: stations 489 through 493, five consecutive
AT_GRADE_COORDINATION_PASS stations around reference centerline
(907,67) to (909,65). The package uses the complete frozen highway offsets
-14..14, including the accepted +1/0/-1 southward crossfall.

- 109 connected pavement cells: 73 gray-concrete carriageway, 26 smooth-stone
  outside shoulders, and 10 yellow-concrete median cells.
- 16 exact air-source foundation cells become stone bricks, leaving every
  pavement cell on a stable contact.
- 188 exact terrain cells are cleared to provide two blocks of route headroom.
- 313 one-cell complete-state forward guards and 313 reverse-order exact
  inverse guards cover the complete operation set.

This is a pavement/material pilot, not route commissioning. Barriers,
lighting, signs, rail, utilities, drainage, and longer corridor continuations
remain separate exact packages.

## Isolation and hard aborts

The compiler is bound to the accepted R10A immutable post save
data/worldsnap-combined-zones-r10a-post-20260821T163935Z, complete-save
SHA-256 bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486.

The 1,416-cell exact interaction halo has zero fluid, waterlogged, gravity,
container/control, block-entity, saved-entity, woody-target, or protected-relic
hits. It has zero plan intersections with every C01 default-deny extent, the
Data District crossroad, rail reservation/collection, utility reserve, road
collection, or any accepted prior release. Because the scope is dry and does
not occupy either collection band, it requires no unresolved drainage
transition.

## Artifacts and offline verification

- Manifest:
  data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json
- Forward body SHA-256:
  b6b0b44600934b6ba7811c010fceb2135d305bfd7dd793f3490460453a40a1d0
- Rollback body SHA-256:
  b151c43eff585506cd6208a0aaf7fe10c60bb766e5642ad476325e3f931fd4b0
- Offline evidence directory:
  data/world-review/combined-zones-r11a-offline-20260821T171000Z
- Manifest QA: PASS, 313 unique targets, zero cross-package intersections.
- Exact source preflight: PASS, 313/313 guards.
- Forward and rollback strict parser dry-runs: PASS, 313 fill commands each,
  zero WorldEdit leftovers.
- Projected rollback preflight: PASS, 313/313 inverse guards after the exact
  forward overlay.
- Snapshot block-entity audit: PASS, zero blockers.
- Scoped wrapper plan: PASS, one R11 package under standing authorization.
- Focused compiler regression: 6/6 PASS.

Regenerate and verify:

    node scripts/compile_combined_zones_r11a_c1_east_highway_pilot.mjs
    npx vitest run test/build/combinedZonesR11AC1EastHighwayPilot.test.ts
    node scripts/qa_combined_zones_r11a_c1_east_highway_pilot_post_release.mjs
    npx vitest run test/build/qaCombinedZonesR11AC1EastHighwayPilotPostRelease.test.ts

## Execution and post-release seal

The standing scoped wrapper executed R11A and terminally accepted it in
data/world-review/combined-zones-r11a-live-20260821T170600Z/evidence-ledger.json.

- Fresh execution source complete-save SHA-256:
  ce761bacacc7848c4c057df3eee84a9e55ef89475b59440275ca8033c61e71f8.
- Strict execution: 313/313 guarded groups changed, zero failures and zero
  no-ops.
- Immutable post complete-save SHA-256:
  a52884ed9ea7c760a9d357e5c14571a3a980ed5ff68a905cafabf79fab56243e;
  region identity
  26215fc70ce8891bfb1ba6008f6e9a02281557c6c2c02dd498af48e22897f08e.
- Exact post state: 313/313 targets match, including the 109/109 pavement
  cells and exact 73 gray, 26 smooth-stone, 10 yellow material census.
- Route QA: one connected 109-cell surface, maximum adjacent step one block.
- Foundation and clearance: 16/16 stone-brick fills, 109/109 stable pavement
  contacts, and 218/218 two-block headroom cells air.
- Zero undeclared drift: all 1,103 non-operated cells in the exact interaction
  halo are byte-for-state unchanged between execution source and post save.
- Reversibility: 313/313 exact rollback guards pass against the immutable post
  snapshot.
- Read-only post QA:
  data/world-review/combined-zones-r11a-live-20260821T170600Z/r11a-post-release-qa.json
  and r11a-post-release-qa.md — all 12 checks PASS.
- Focused compiler and post-QA regressions: 11/11 PASS.

R11A is complete and exactly reversible at its declared pavement-pilot scope.
Longer C1 road, walking, rail-reservation, utility, drainage, barrier, lighting,
signage, and route-commissioning work remains separate and does not regress
this accepted release.
