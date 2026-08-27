# CZ-R12F · B09 isolated three-cell graded passive rail

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; TRANSPORT NOT COMMISSIONED  
**Release:** `CZ-R12F-P1-B09-ISOLATED-THREE-CELL-GRADED-PASSIVE-RAIL`  
**Source:** accepted R12E post `data/worldsnap-combined-zones-r12e-post-20260822T011943Z`  
**Manifest identity:** `e0cdd6e8dc74f8cd2944ccec901bd2999f742b76765fefc2a734ef7ea65e52d5`  
**Readiness payload:** `df2de8bf7bf4d636fcd7f41206d4bbe13e389cd1060031fd9610d5880c67c35f`
**Completed release identity:** `2c9a54aaad0bfd742705ed1015b781db3b0aa7d56a86e6c57ee348c6e9f29f28`  
**Post-QA payload:** `67427f0f7e0f0cc08829575a128793ea39cf1adb09a9eb0316c7664953449fb8`

R12F is the smallest independently isolated graded subset of the frozen B09
rail datum for which both exact rail states and neighbor-update order have been
demonstrated on the production Paper 1.21.11 binary. It installs three passive,
unpowered rails only. It does not install a turn, station interface, powered
rail, vehicle, drive, brake, control, power, drainage, platform barrier, or
rescue system, and it does not commission transport.

## Exact geometry and order

- Centerline indices `261..263`, low to high:
  - `(2287,130,-768)` — `rail[shape=ascending_west,waterlogged=false]`
  - `(2286,131,-768)` — `rail[shape=ascending_west,waterlogged=false]`
  - `(2285,132,-768)` — `rail[shape=east_west,waterlogged=false]`
- Target coordinate-set SHA-256:
  `4ef1dd45742537a3300286c1bc3742600626540ec2327bb46a0e6149568cb973`.
- Forward order is upper to lower; rollback is the exact lower-to-upper reverse.
- Index `260` remains the hairpin turn gap and index `264` remains an upper
  isolation gap. The new rails remain disconnected from prior installed rail.
- All three polished-diorite supports and all three air headroom cells are
  exact in the source snapshot.

The disposable-runtime proof used the exact production Paper jar without any
production connection or world mutation. It observed all three authored states
after forward placement and exact air at all three cells after reverse-order
rollback. Proof payload:
`9f734939a5217d5bc5bc0616f3dbd78f0ac75275bcc5fd11f16ff35dd696f8be`.

## Preservation and residual blocker

The package preserves all 231 R12C east-west rails, all 19 R12D north-south
rails, all 80 R12E east-west rails, both external caps, every prior release,
and all entities, block entities, containers, fluids, gravity blocks, and
protected relics. Its 57-cell reviewed halo contains one declared adjacent
R12D rail and no undeclared mechanism.

R12E's residual level-run result remains exact: no nontrivial two-sided isolated
level-cardinal run remains. R12F narrows the former general grade hold only for
indices `261..263`. The exact remaining local hold is: all three turn cells at
indices `240`, `260`, and `500`; every other graded cell; singleton level cells
between grades; and the lower station/portal run `0..8`, which lacks two-sided
isolation. Each requires its own exact state/update-order proof or separately
reviewed interface ownership.

## Offline gates

- Deterministic compiler regeneration, including the manifest, is independent
  of scratch `--out-dir`; manifest operation paths are canonical repo-relative.
- Exact manifest QA: 3 unique targets, zero package overlap.
- Forward and projected rollback source preflights: 3/3 PASS each.
- Strict-noop forward and rollback parsers: 3/3, zero WorldEdit leftovers.
- Block-entity/source entity evidence: zero target intersections.
- Real wrapper `--print-plan`: one package, `PREPARE_ONLY`, all ten scoped
  prerelease stages.
- Deterministic offline readiness: 15/15 PASS.
- Focused regression: 7/7 PASS; backend build: PASS.

## Frozen artifacts

- Compiler:
  `scripts/compile_combined_zones_r12f_b09_isolated_graded_passive_rail.mjs`
- Manifest:
  `data/buildops/combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail.release-manifest.json`
- Forward/inverse:
  `data/buildops/combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail.b09-isolated-three-cell-graded-passive-rail.forward.txt`
  and its `.rollback.txt` counterpart
- Runtime proof:
  `data/world-review/combined-zones-r12f-b09-graded-rail-runtime-proof-20260822T014000Z/`
- Offline evidence:
  `data/world-review/combined-zones-r12f-b09-isolated-graded-passive-rail-offline-20260822T015000Z/`
- Regression:
  `test/build/combinedZonesR12FB09IsolatedGradedPassiveRail.test.ts`

The guarded wrapper subsequently executed the exact three transitions. The
independent post-QA verifies 3/3 authored final states, one connected graded
component with two endpoints and one interior cell, zero shape mismatch, all
supports/headroom/gaps and all 330 prior rails preserved, exactly three
declared B09 differences with zero drift, 17/17 stages, a complete 12-entry
journal, and 3/3 rollback guards. The post verifier made no live call or world
mutation. Transport remains uncommissioned.
