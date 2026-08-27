# R08Y Empty Eight North-Smoke Central-West Segment

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Canonical owner: `OWN-D06-SMOKE` under `Z02-U1-CONCOURSE-MALL`  
Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; FULL BOUNDARY NOT COMMISSIONED**

R08Y is the next largest source-proven dry segment of the frozen
`EE-SMOKE-N` plane after accepted R08W and R08X. It is a bounded passive
construction release, not commissioning of the complete north smoke boundary
or any powered smoke-control function.

## Exact scope

- Segment: `x=1703..1735`, `y=48..54`, `z=50`.
- Geometry: one connected 33×7 component; 231 exact source-air transitions.
- Wall field: 222 `minecraft:stone_bricks` cells using `EE-P01`.
- Static cap: nine `minecraft:polished_deepslate` cells at `x=1720..1722`,
  `y=49..51`, `z=50`, using `EE-P13`.
- Face interaction halo: 542 cells, all free of fluids, gravity blocks,
  containers, controls, block entities, and saved movable entities.

The compiler ranks every still-unbuilt full-height column against the accepted
R08X post. The remaining clean runs are 33, 21, 14, and two columns wide;
therefore `x=1703..1735` is the unique maximal next segment.

## Isolation and reversibility

- Target overlap with R08W and R08X: zero.
- N06 overlap: zero. The four unsupported N06 gravel cells begin beyond the
  untouched `x=1736` interaction-buffer column and remain fail-closed.
- Six flowing-water states remain elsewhere on the frozen plane.
- Protected relic, future-line-seal, tenant-opening, powered-control,
  container, block-entity, and saved-entity intersections: zero.
- Forty-eight prior manifests were checked; the only accepted ownership
  overlap is 226 exact R02 air-reservation cells.
- Forward order builds the wall bottom-up and then closes the selected bay.
  Rollback removes the cap first and restores all source-air states in exact
  reverse order.

| Order | Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `ee-smoke-n-central-west-compartment-wall` | 222 | `00f4f4d63bb49fc265b603245a497f676b83f92e4a71d3a3bec85f4681c204f1` | `637ec4af44a653ae231fe2a005849bf96c60b018970dbc9b6d02b19c3f19221b` |
| 2 | `ee-smoke-n-central-west-static-opening-cap` | 9 | `ff6a298aace96bc9f553bfa15b6af75decc367250969ff1e6f7e40da7ea6b3c7` | `08bc00fd1511abc3b304e346cfd1b5659b6faa2332ebe5b1e57109c7e6b57516` |

## Source and offline acceptance

- Source: `data/worldsnap-combined-zones-r08x-post-20260822T000635Z`.
- Complete-save SHA-256:
  `be415f76248cc94f8358f4dd2553231726234450e5e4d5102667559a6329ce56`.
- Region SHA-256:
  `d3ecb8a0e8c8080de4469dcb4bee84369fd9ec99afe5cd32a086afec4d995e87`.
- Source completed-release identity:
  `f149d854213ece928bebc1c13f2c8973ab7f8770a1406eb3e00aee529ba6cf45`.
- Manifest QA: 2/2 packages PASS; 231 unique targets; zero overlap.
- Ordered forward preflight: 222/222 then 9/9 PASS.
- Projected reverse rollback: 9/9 then 222/222 PASS.
- Four strict-noop parser dry-runs: 462 commands; zero WorldEdit leftovers.
- Block-entity audit: 231 operations; zero blockers.
- Real scoped wrapper `--print-plan`: PASS with top-level `mvpScope: true`,
  exact scope IDs, and the declared package order.
- Focused deterministic compiler regression: 7/7 PASS.
- Combined R08W/R08X/R08Y compiler regressions: 21/21 PASS.
- Backend TypeScript build: PASS.

Canonical manifest:
`data/buildops/combined-zones-r08y-empty-eight-north-smoke-central-west-segment.release-manifest.json`.
Manifest payload identity:
`e6478ea5acb3487c76e925241efbbdba0ea3432dc3942703410778a3263636a6`.
Manifest full-file SHA-256:
`8ebbc9e5f300655be41b1ed72ac8e3c83cac00c7c8bbd484107a4a10bcf69a8e`.

Offline evidence:
`data/world-review/combined-zones-r08y-north-smoke-central-west-segment-offline`.

## Executed result and independent seal

The scoped wrapper completed at
`data/world-review/combined-zones-r08y-live-20260822T002056Z` with terminal
status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.

- Strict execution: 231/231 changes; zero failures and zero no-ops.
- Immutable post complete-save SHA-256:
  `0c33e28a59ed52c668f3989a2db9e8b2b0a549d63e3447a1dd04f444810e7196`.
- Immutable post region SHA-256:
  `805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0`.
- Completed release identity:
  `319ca6769a42d7e809e981cdc9ae1e2cbbab86f4ca1fcb26fc7bd3390d0dacdd`.
- Independent QA verifies 231/231 exact transitions, the one-component 33×7
  full-height geometry, 542/542 unchanged selected-halo cells, and all 231
  reverse rollback guards.
- The remaining 1,141 north-plane cells, full 3,150-cell plane halo, six wet
  plane cells, 68 halo-gravel cells, and all four N06 cells remain unchanged.
- QA payload SHA-256:
  `1c0a5784b34433c2873e7bd850ec5ccfe5ca0e88f646c56829916671004b173a`.
- Bounded construction seal SHA-256:
  `b18f5e9f5d5e23171eeed47b60de5cad19f4bac2c0823eb5e10971f908b6b1ca`.
- Focused R08Y compiler/post-QA and R08X-preservation regressions: 19/19
  PASS after execution.
- Backend TypeScript build after execution: PASS.

See the [independent post-QA](../../../data/world-review/combined-zones-r08y-live-20260822T002056Z/r08y-post-release-qa.json)
and [bounded-segment seal](../../../data/world-review/combined-zones-r08y-live-20260822T002056Z/r08y-bounded-north-smoke-central-west-segment-seal.json).
The full north plane and all powered smoke-control behavior remain incomplete
and uncommissioned. The independent QA made no live call, RCON call, service
mutation, or world edit.
