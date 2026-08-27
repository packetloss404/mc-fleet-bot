# CZ-R12I · B09 next maximal isolated graded passive rail 02

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; TRANSPORT NOT COMMISSIONED  
**Release:** `CZ-R12I-P1-B09-NEXT-MAXIMAL-02-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL`  
**Source:** accepted R12H post `data/worldsnap-r12h-post-20260822T022403Z`  
**Manifest identity:** `8b6343f26b2d2513cf7e94288fa76981bd5d634b92021df61406be60f4d9aac1`  
**Readiness payload:** `0c4bb33a6ade53657dd943bd9c9942d6aa730b2b4884f3302569c6e0508daf84`
**Completed release identity:** `396fc2ff6c3c3411854c7d2bb72dffe07625a7b32813e089e3acf1c1065465a2`  
**Post-QA payload:** `bdbe884727ad4e1690f25009e4d4b3119f8a888ac4922d5f8c1882c5211e867d`

R12I is the next earliest maximum four-cell ascending-west run that remains
independently isolated after accepted R12H. It selects centerline indices
`293..296`, retaining exact air gaps `292/297`; the nearer run `286..289` is
rejected because its boundary touches accepted R12H, and the independently
isolated `290..292` run is shorter. The low-to-high coordinates are
`(2255,153,-768)` through `(2252,156,-768)`.

A fresh disposable-loopback proof on exact production Paper
`1.21.11-69-main@94d0c97` passes all four authored states, upper-to-lower
placement, and exact reverse rollback. Proof payload:
`ed7215a5de7c23f42d29ee7f05ba606d1e5a641068bf5ffde00a21933f3c60f2`.

All 341 accepted predecessor rails, both caps, four supports/headroom cells,
both gaps, the 72-cell halo, and the 7,800-cell B09 accommodation are bound to
the immutable R12H post. Offline readiness passes 15/15; forward/projected
inverse and strict parser gates pass 4/4; block entities, saved entities,
fluids, gravity, relics, containers, and undeclared mechanisms are zero. The
real wrapper plan was `PREPARE_ONLY` before execution. The guarded wrapper then
completed with 17 stages and exact rollback evidence. Independent post-QA
passes 21/21: all four desired states, one unbranched component, exact
supports/headroom and air gaps, all 341 predecessor rails and both caps, zero
off-target or B09 drift, the exact-production runtime proof binding, strict
execution evidence, and 4/4 post-state inverse guards. No turn, adjacency
closure, active system, or transport commissioning is included.

Artifacts:

- `scripts/compile_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail.mjs`
- `scripts/probe_combined_zones_r12i_b09_four_cell_graded_rail_runtime.mjs`
- `scripts/qa_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail_offline.mjs`
- `scripts/qa_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail_post_release.mjs`
- `data/buildops/combined-zones-r12i-b09-next-maximal-isolated-four-cell-graded-passive-rail.release-manifest.json`
- `data/world-review/combined-zones-r12i-b09-graded-rail-runtime-proof-20260822T023200Z/`
- `data/world-review/combined-zones-r12i-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T024000Z/`
- `data/world-review/combined-zones-r12i-live-20260822T023713Z/r12i-post-release-qa.json`
- `test/build/combinedZonesR12IB09NextMaximalIsolatedGradedPassiveRail.test.ts`
- `test/build/qaCombinedZonesR12IB09NextMaximalIsolatedGradedPassiveRailPostRelease.test.ts`

The independent QA performed no live API, RCON, service, or world mutation.
