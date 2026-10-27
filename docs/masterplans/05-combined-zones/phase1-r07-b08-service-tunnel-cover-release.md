# Combined Zones CZ-R07C: B08 service-tunnel cover

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Executed manifest identity:** `779bf317b625e085c33673381e6bcbb0bc8b1d6290850c8bb5a6cb763b4d3240`  
**Completed release identity:** `4e99735b102bf4aba9485caa34de0c0731e4a7b5af82b2c9dadcddd9e360cb91`  
**Post complete save:** `605b8a3f898ac40822036ccb4fe97e7adfaba7b146d13eb3431fb1821b5f6cfa`

CZ-R07C is the smallest safe, high-value P1-B08 architecture package after
R07A. It wraps the already-bored 6-by-6 service route in a one-cell
polished-diorite cover, leaves its exact west entrance and five-wide B03
connection open, and clears the final exact snow/vegetation/terrain cells from
the route. It does not install rail, power, drainage, active mechanisms, or
commission those deferred systems.

## Exact physical design

- Frozen B08 route: 7,878 cells, one face-connected component.
- Exact external face boundary: 5,327 cells.
- West entrance aperture: 24 cells at `x=1947`, `y=72…75`,
  `z=-630…-625`.
- Existing B03 continuation aperture: 20 cells at `x=2049`, `y=130…133`,
  `z=-750…-746`.
- Cover design after excluding those apertures: 5,283 cells.
- Source-preserved natural enclosure: 31 cells: 14 snowy grass blocks, 12
  dirt, and five stone.
- Cover operations: 5,252 cells to `minecraft:polished_diorite`.
- Route/entrance opening operations: 28 cells to `minecraft:air`.
- Total exact, pairwise-disjoint operation set: 5,280 cells.
- Forward order is cover then openings. Rollback order is openings then cover.

The polished-diorite choice matches the accepted R07A portal-tube fabric. The
two aperture sets and cover exactly partition the full external face boundary;
the projected 7,902-cell route-plus-entrance void remains a single connected
component.

## Artifacts

- Compiler:
  `scripts/compile_combined_zones_r07_b08_service_tunnel_cover.mjs`
- Manifest:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover.release-manifest.json`
- Cover forward/rollback:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover.b08-cover-shell.forward.txt`
  and
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover.b08-cover-shell.rollback.txt`
- Openings forward/rollback:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover.b08-route-openings.forward.txt`
  and
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover.b08-route-openings.rollback.txt`
- Focused regression:
  `test/build/combinedZonesR07B08ServiceTunnelCover.test.ts`
- Executed recovery-bound manifest:
  `data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json`
- Terminal retry ledger:
  `data/world-review/combined-zones-r07c-retry-live-20260821T162026Z/evidence-ledger.json`
- Read-only post-release seal:
  `data/world-review/combined-zones-r07c-retry-live-20260821T162026Z/r07c-post-release-qa.json`
  and
  `data/world-review/combined-zones-r07c-retry-live-20260821T162026Z/r07c-post-release-qa.md`
- Post-release regression:
  `test/build/qaCombinedZonesR07B08ServiceTunnelCoverPostRelease.test.ts`

## Offline hard-safety results

- Guarded manifest QA: **PASS**, 2/2 packages, 5,280 unique targets, zero
  cross-package intersections.
- Cover source preflight: **5,252/5,252 PASS**.
- Opening source preflight over the projected cover: **28/28 PASS**.
- Projected rollback preflights in reverse order: **28/28 + 5,252/5,252
  PASS**.
- Strict-noop parser dry-runs: forward and rollback **PASS** for both packages,
  with zero WorldEdit leftovers.
- Source census: zero fluid, gravity, forbidden-container, target block-entity,
  saved-entity-halo, protected-relic, or prior-release target intersections.
- Exact comparison with the separately compiled 11,758-cell CZ-R07B B03
  viaduct-bent target set: **zero intersection cells**. The two packages may
  advance independently subject to their own fresh-source kernels.
- Deterministic compiler regression: **6/6 PASS**.
- Standing-authorization/orchestrator plan validation: **PASS**.

## Executed result and attempt reconciliation

The original manifest above was an offline design identity. Its first live
attempt stopped safely when strict-noop encountered newly settled one-layer
snow after preflight. Exactly 2,963 shell operations had succeeded; the
compensating rollback then processed all 5,252 shell guards without failure.
The recovery save proved that no unrelated target drift remained. The first
attempt ledger is retained as failed-and-compensated provenance and is not an
accepted partial release.

The additive recovery manifest rebound the same design to the current source
and the later retry passed every fresh safety-kernel stage. Strict execution
changed 5,252 cover cells and 28 opening cells with zero failures or no-ops.
The sealed post save proves all 5,280 operated targets, all 5,283 cover-design
states, all 7,902 route/entrance air cells, the 24-cell west entrance, the
20-cell B03 aperture, and one face-connected route component. Reverse-order
rollback evidence passes all 28 opening guards followed by all 5,252 cover
guards against the exact post snapshot.

The terminal execution ledger is
`5b319623d2dacdcc6c14ad7fb6c8d7c1997224b35f3688cedec433c1da21a42b`.
The post-release QA payload is
`ac45ce0082fb5f9a9aba7f9f091f705bae039c52e6e555fda9f2237b8db29bef`
and all 11 acceptance checks pass. The verifier was read-only and made no live
RCON or service call.
