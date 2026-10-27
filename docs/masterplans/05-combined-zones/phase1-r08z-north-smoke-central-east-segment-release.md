# R08Z Empty Eight North-Smoke Central-East Segment

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Canonical owner: `OWN-D06-SMOKE` under `Z02-U1-CONCOURSE-MALL`  
Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; FULL BOUNDARY NOT COMMISSIONED**

R08Z is the next largest source-proven dry segment of the frozen
`EE-SMOKE-N` plane after accepted R08W, R08X, and R08Y. It is bounded passive
construction only; it does not commission the complete north smoke boundary
or any powered smoke-control function.

## Exact scope

- Segment: `x=1766..1786`, `y=48..54`, `z=50`.
- Geometry: one connected 21×7 component; 147 exact source-air transitions.
- Wall field: 138 `minecraft:stone_bricks` cells using `EE-P01`.
- Static cap: nine `minecraft:polished_deepslate` cells at `x=1770..1772`,
  `y=49..51`, `z=50`, using `EE-P13`.
- Face interaction halo: 350 cells, all free of fluids, gravity blocks,
  containers, controls, block entities, and saved movable entities.

The compiler ranks every still-unbuilt full-height column against the accepted
R08Y post. The remaining clean runs are 21, 14, and two columns wide;
therefore `x=1766..1786` is the unique maximal next segment.

## Isolation and reversibility

- Target overlap with R08W, R08X, and R08Y: zero.
- N06 target or interaction-halo overlap: zero; all four unsupported source
  gravel cells remain fail-closed.
- Six flowing-water states and all gravity interaction bands remain outside
  R08Z.
- Protected relic, future-line-seal, tenant-opening, powered-control,
  container, block-entity, and saved-entity intersections: zero.
- Forty-nine prior manifests were checked; the only accepted ownership
  overlap is 147 exact R02 air-reservation cells.
- Forward order builds the wall bottom-up and then closes the selected bay.
  Rollback removes the cap first and restores all source-air states in exact
  reverse order.

| Order | Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `ee-smoke-n-central-east-compartment-wall` | 138 | `5977b996f089f7754320ef3260e93c53fcd0ccdd88f3dc5b37aff27fa47071aa` | `54d663aa7012928bc0d5f99c05cc72386f9d684dde0bfcf57468a0d05efd0244` |
| 2 | `ee-smoke-n-central-east-static-opening-cap` | 9 | `5d44984cb9cbf23c757d7e08b455a914400b9628727283fbf13c1c889908a355` | `9ae932553c8a74b3466adc9ac137b5a73f08d40424985d20d00017cd5fdc9664` |

## Source and offline acceptance

- Source: `data/worldsnap-combined-zones-r08y-post-20260822T002056Z`.
- Complete-save SHA-256:
  `0c33e28a59ed52c668f3989a2db9e8b2b0a549d63e3447a1dd04f444810e7196`.
- Region SHA-256:
  `805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0`.
- Source completed-release identity:
  `319ca6769a42d7e809e981cdc9ae1e2cbbab86f4ca1fcb26fc7bd3390d0dacdd`.
- Manifest QA: 2/2 packages PASS; 147 unique targets; zero overlap.
- Ordered forward preflight: 138/138 then 9/9 PASS.
- Projected reverse rollback: 9/9 then 138/138 PASS.
- Four strict-noop parser dry-runs: 294 commands; zero WorldEdit leftovers.
- Block-entity audit: 147 operations; zero blockers.
- Real scoped wrapper `--print-plan`: PASS with top-level `mvpScope: true`,
  exact scope IDs, and the declared package order.
- Focused deterministic compiler regression: 7/7 PASS.
- Combined R08X/R08Y/R08Z compiler regressions: 21/21 PASS.
- Backend TypeScript build: PASS.

Canonical manifest:
`data/buildops/combined-zones-r08z-empty-eight-north-smoke-central-east-segment.release-manifest.json`.
Manifest payload identity:
`b837c8cba2b4788b9350697dac09c538ad9dd8c678513399097a6211efd52580`.
Manifest full-file SHA-256:
`d0a3a3ce4fac35b2e6f9b8d413087e09922e665a286a87b75f1bd01ab524eecc`.

Offline evidence:
`data/world-review/combined-zones-r08z-north-smoke-central-east-segment-offline`.

## Executed result and independent seal

The scoped wrapper completed at
`data/world-review/combined-zones-r08z-live-20260822T003120Z` with terminal
status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.

- Strict execution: 147/147 changes; zero failures and zero no-ops.
- Immutable post complete-save SHA-256:
  `46b375521f06d7a0770ed272c92556a41bef58d31e05735eb7eec0a59f8747ed`.
- Immutable post region SHA-256:
  `d7a7efaa717435dea1f23aaaa45c982cb97ecdf319dac65e7928e4db965bb4ec`.
- Completed release identity:
  `be4cbb77f5d2be379fd4b502810de2bf71a10e9ef8612639513615b18e0c1d78`.
- Independent QA verifies all 147 transitions, the one-component 21×7
  full-height geometry, 350 unchanged selected-halo cells, and all 147 reverse
  rollback guards.
- The bounded 4,522-cell diff contains exactly the 147 declared transitions,
  zero lifecycle exceptions, and zero undeclared changes.
- All 826 accepted R08W/R08X/R08Y cells retain their exact source and post
  states. The remaining 1,225 plane cells, full 3,150-cell plane halo, six wet
  cells, 68 halo-gravel cells, and all four N06 cells are unchanged.
- QA payload SHA-256:
  `0cb642b134734a3bc6bd1fa226312100864cf6442afe358a6f93c4887f676644`.
- Bounded construction seal SHA-256:
  `f40cb76e2208ec05e9fa5157cdc61a56ab23d6d58107fd1fb2a529eb5a0fc5e7`.
- Focused R08Z compiler/post-QA and R08Y-preservation regressions: 19/19
  PASS after execution.
- Backend TypeScript build after execution: PASS.

See the [independent post-QA](../../../data/world-review/combined-zones-r08z-live-20260822T003120Z/r08z-post-release-qa.json)
and [bounded-segment seal](../../../data/world-review/combined-zones-r08z-live-20260822T003120Z/r08z-bounded-north-smoke-central-east-segment-seal.json).
The full north plane and powered smoke-control behavior remain incomplete and
uncommissioned. The independent QA made no live call, RCON call, service
mutation, or world edit.
