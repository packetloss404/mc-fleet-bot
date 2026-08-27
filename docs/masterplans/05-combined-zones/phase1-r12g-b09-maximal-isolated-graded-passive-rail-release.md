# CZ-R12G · B09 maximal isolated graded passive rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; TRANSPORT NOT COMMISSIONED  
**Release:** `CZ-R12G-P1-B09-ISOLATED-FOUR-CELL-GRADED-PASSIVE-RAIL`  
**Source:** accepted R12F post `data/worldsnap-combined-zones-r12f-post-20260822T014754Z`  
**Manifest identity:** `d2485b2e6d3185358ee17c2cf40aa7a667f3f7965cf8b3d63df20b08ac6523b3`  
**Readiness payload:** `c2d3069336644af933b589b0c31e89e86f7005df06f5d7c3366c5de47f165210`
**Completed release identity:** `d553db34ab30a5a03dc290b72c75df7266748de6ceae66bf8596cc652ab1d160`  
**Post-QA payload:** `64eeb69bd5b5af6bf0fd89d8e0d1fd6b4d11b808d218628f4cadb958eb10b53e`

R12G compiles the earliest largest independently isolated ascending-west run
remaining on the frozen B09 rail datum. Every uninterrupted one-block-per-step
ascending-west run has at most four cells. The first four-cell candidate after
R12F touches the installed R12F rail, so the deterministic earliest eligible
tie break selects indices `271..274` between air gaps `270` and `275`.

The low-to-high cells run from `(2277,137,-768)` to `(2274,140,-768)` and
contain three exact `ascending_west` states plus one east-west upper state.
Target coordinate-set SHA-256:
`bb5739a71b664cbe90e166dfcb7d531e18f54138c6965bf0208ec0e79319350d`.
Forward order is upper to lower; rollback is exact reverse. Four solid supports,
four air headroom cells, both gaps, and the 72-cell halo are source-exact.

The production Paper 1.21.11 jar was exercised in a disposable loopback-only
world. All four states survived forward placement and exact reverse rollback
returned all four cells to air. Runtime-proof payload:
`1590009333d22172fa3d0db724b793522a0c6c340c6b0ee997497db1ad45b42d`.

R12G preserves all 333 accepted R12C–R12F rails, both external caps, every
prior release, and the inactive-system boundary. It installs no turn, station
interface, powered rail, vehicle, drive, brake, control, power, drainage,
barrier, or rescue feature and commissions no route.

Offline gates completed before release: exact manifest QA, forward/projected rollback
preflights 4/4, strict-noop parsers 4/4, block-entity/entity/hazard clearance,
real wrapper `PREPARE_ONLY`, deterministic readiness 15/15, focused regression
7/7, and backend build PASS.

The guarded wrapper then completed on the exact authorized release node. The
immutable ledger records status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`, 4/4
strict forward groups, zero no-ops or unknown replies, 17/17 required stages
and evidence bindings, a complete 14-entry journal, and 4/4 post-state inverse
guards. Independent post-QA verifies all four exact rail states, the single
four-cell unbranched component, four unchanged supports and headroom cells,
both air gaps, all 333 predecessor rails, both caps, exact halo/B09 accounting,
and zero off-target or rail-shape drift.

An earlier command using an abbreviated release-node name was rejected before
any live call. It is not part of the completed transaction. The successful
ledger binds the exact node `CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING`
and exactly one four-group forward execution; this release records no
accommodation for the rejected invocation.

Artifacts:

- `scripts/compile_combined_zones_r12g_b09_maximal_isolated_graded_passive_rail.mjs`
- `data/buildops/combined-zones-r12g-b09-isolated-four-cell-graded-passive-rail.release-manifest.json`
- `data/world-review/combined-zones-r12g-b09-graded-rail-runtime-proof-20260822T020000Z/`
- `data/world-review/combined-zones-r12g-b09-maximal-isolated-graded-passive-rail-offline-20260822T021000Z/`
- `data/world-review/combined-zones-r12g-live-20260822T020641Z/evidence-ledger.json`
- `data/world-review/combined-zones-r12g-live-20260822T020641Z/r12g-post-release-qa.json`
- `test/build/combinedZonesR12GB09MaximalIsolatedGradedPassiveRail.test.ts`
- `test/build/qaCombinedZonesR12GB09MaximalIsolatedGradedPassiveRailPostRelease.test.ts`

The post-QA was read-only and performed no live API, RCON, service, or world
mutation. R12G installs passive rail material only; it does not commission the
funicular or a passenger/rescue route.
