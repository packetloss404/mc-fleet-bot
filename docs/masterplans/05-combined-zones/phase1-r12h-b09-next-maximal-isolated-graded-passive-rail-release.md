# CZ-R12H · B09 next maximal isolated graded passive rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; TRANSPORT NOT COMMISSIONED  
**Release:** `CZ-R12H-P1-B09-NEXT-MAXIMAL-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL`  
**Source:** accepted R12G post `data/worldsnap-r12g-post-20260822T020641Z`  
**Manifest identity:** `e8ca1e8443bd479d8f9e3f69199a18e3497c499b7d4c431ff44c6fad545f4521`  
**Readiness payload:** `fe354b6a8005b1a6c5c27690a06d74de168d656b8758f03588e75a77a837340e`
**Completed release identity:** `a7be316c903bdfb71934d0e543b4cb875f3eef4fbe15fbe1a090b4c456ac8d92`  
**Post-QA payload:** `30e194abdafae329da025ddf6d66d336fe7ab68318a14b7de176dc73154ff963`

R12H selects the deterministic next earliest eligible maximum-length
ascending-west run after accepted R12G: centerline indices `282..285`, bounded
by retained air gaps `281` and `286`. Earlier four-cell run `275..278` is not
independently isolated because its left neighbor at index `274` is accepted
R12G rail. The selected cells run low-to-high from `(2266,145,-768)` to
`(2263,148,-768)` and install three exact `ascending_west` states plus one
east-west upper state.

A fresh disposable-loopback run of the exact production Paper
`1.21.11-69-main@94d0c97` proves upper-to-lower placement and exact reverse
rollback for all four states. Runtime-proof payload:
`e2bf30863292c6705526f21b61ee02ecb55ba7fe8a487a4ad1b06fa29dc0c2fe`.
The proof loaded no production world and contacted no production RCON.

All 337 accepted R12C–R12G rails, both external caps, four solid supports,
four air headroom cells, both gaps, the 72-cell halo, and the complete
7,800-cell B09 accommodation are source-bound. Target, halo, and prior-release
intersections contain no fluid, gravity block, protected relic, container,
block entity, saved entity, or undeclared mechanism.

Offline gates pass 15/15: exact manifest QA, forward and projected inverse
preflight 4/4, strict-noop forward/rollback parsers 4/4, block-entity clearance,
real wrapper `PREPARE_ONLY`, deterministic compiler/readiness regression 7/7,
and backend build. The package remains passive and isolated: it installs no
turn, powered rail, vehicle, drive, brake, control, power, drainage, platform
barrier, or rescue feature and commissions no route.

The guarded wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Independent read-only QA verifies
all four exact states, one unbranched component, all supports/headroom/gaps,
all 337 predecessor rails and both caps, exactly four declared halo/B09
differences with zero lifecycle or undeclared drift, 17/17 stages and evidence
bindings, the complete 14-entry journal, and 4/4 inverse guards.

Artifacts:

- `scripts/compile_combined_zones_r12h_b09_next_maximal_isolated_graded_passive_rail.mjs`
- `scripts/probe_combined_zones_r12h_b09_four_cell_graded_rail_runtime.mjs`
- `scripts/qa_combined_zones_r12h_b09_next_maximal_isolated_graded_passive_rail_offline.mjs`
- `data/buildops/combined-zones-r12h-b09-next-maximal-isolated-four-cell-graded-passive-rail.release-manifest.json`
- `data/world-review/combined-zones-r12h-b09-graded-rail-runtime-proof-20260822T021800Z/`
- `data/world-review/combined-zones-r12h-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T022500Z/`
- `data/world-review/combined-zones-r12h-live-20260822T022403Z/r12h-post-release-qa.json`
- `test/build/combinedZonesR12HB09NextMaximalIsolatedGradedPassiveRail.test.ts`

The post-QA performed no live API, production RCON, service, or world mutation.
