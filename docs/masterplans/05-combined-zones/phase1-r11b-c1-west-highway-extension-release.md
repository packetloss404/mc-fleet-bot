# Combined Zones CZ-R11B: C1 west highway extension

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** 92c8cd51eb303e40780a3d8714304815fd54fba693e3728f19cd16eb907f9f99
**Completed release identity:** 0529a5ffb29f00cdf1060bf2e9f51e402d0191953ac7b22a381f85b34dc0c8bc  
**Post-QA payload identity:** 700c79ce8378c13257c292d154dd06d9e6e0e361600988a6997c248e2dc0b22c

## Build scope

R11B compiles the largest bounded at-grade highway continuation immediately
west of accepted R11A: C1 stations 481 through 488. Eight stations is the
exact useful limit even though the preferred package was 10–25 stations;
station 480 is the last retained-cut station and 481 is the first
`AT_GRADE_COORDINATION_PASS` station. Crossing 480/481 would mix two civil
treatments.

The frozen eight-station cross-section contains 184 candidate surface cells.
Eighteen are already accepted R11A pavement and two more occupy accepted R11A
headroom where the rounded corridor raster folds across itself. R11B preserves
the complete 20-cell functional envelope and owns the remaining 164 cells:

- 104 gray-concrete carriageway cells;
- 43 smooth-stone outer-shoulder cells;
- 17 yellow-concrete median cells;
- 31 exact air-source stone-brick foundation fills; and
- 290 terrain cuts, plus 38 source-air cells, for 328/328 two-block headroom
  cells after execution.

The 164 new cells alone form eight components only because the accepted R11A
functional cells are excluded from ownership. The actual public surface is one
component: R11B and R11A have a one-component, 94-pair seam with maximum
vertical step one. All 109 accepted R11A surface cells match their exact
material target, all 218 accepted headroom cells remain air, and R11B has zero
operation intersections with the accepted R11A surface/headroom/support
envelope.

## Ordered gravel stabilization

Three pavement contacts are gravel in the immutable source:

- `(904,105,74)`;
- `(904,105,75)`; and
- `(906,105,75)`.

R11B therefore has two disjoint packages. The first changes those three exact
gravel states to stone bricks. The second performs the 485 pavement,
foundation, and headroom transitions. Rollback reverses the pavement package
before restoring the three exact gravel states.

The complete 2,022-cell interaction halo contains 25 gravel cells. The three
load-bearing contacts are the complete affected dependency closure. The other
22 are untouched and recursively trace through at most five intervening gravel
cells to stable non-air, non-fluid support. No residual gravel is above or
inside an operated cell; unresolved gravity hazard count is zero.

## Isolation and source binding

The compiler is bound to
`data/worldsnap-combined-zones-r09b-post-20260821T173228Z` and complete-save
SHA-256
`9be9ed738ea806ddeb729d5681a890f77830f03ed49987e4129d18a2138040a4`.
The accepted source ledger identity is
`cdd7df171ea63e5a04801f04929204c1b8d6c565a1b7e338717f80bbc6aed65a`.

The exact operated set has zero fluid/waterlogged, non-gravel gravity,
container/control, block-entity, saved-entity, woody-target, protected-relic,
C01, Data District crossroad, rail reservation/collection, utility reserve,
road drainage/collection, or prior-release overlap. No unresolved drainage
treatment is required.

## Artifacts and offline verification

- Manifest:
  `data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json`
- Gravity stabilization body SHA-256, forward / rollback:
  `09d63cf01ab192da2b1fd577f56eb2eb11bed7d2ac1319e8f53b621ffb9e20b0` /
  `dd930efec8dea39f2530091d1ebbf734aca3dc84023b91d16cd9e440e4630e2b`
- Highway extension body SHA-256, forward / rollback:
  `74f62066103e470f330efa553db8cdde74f58457d6f88137aa5eab94b70bbf4a` /
  `7246369b59dd04667587158f6387a7093b3681adb31fc5f2d610e01698572745`
- Offline evidence:
  `data/world-review/combined-zones-r11b-offline-20260821T173500Z`
- Exact source preflights: PASS, 3/3 stabilization and 485/485 pavement.
- Projected rollback preflights: PASS, 3/3 stabilization and 485/485
  pavement.
- Strict-noop parser dry-runs: PASS for all four operation files; 976 total
  guarded commands and zero WorldEdit leftovers.
- Focused compiler regression: 7/7 PASS.

Regenerate and verify:

```bash
node scripts/compile_combined_zones_r11b_c1_west_highway_extension.mjs
npx vitest run test/build/combinedZonesR11BC1WestHighwayExtension.test.ts
```

## Execution and post-release seal

The standing scoped wrapper executed and terminally accepted R11B in
`data/world-review/combined-zones-r11b-live-20260821T173605Z/evidence-ledger.json`.

- All 24 ledger stages pass in exact order and all 25 declared evidence files
  match their ledger hashes and byte counts.
- The fresh execution source complete-save SHA-256 is
  `120b79fc9b40faa026d73115fa68c4ce3c9d3dcfdc19565a5cf4cd18dc6daa9d`;
  its region identity is
  `b1051bda3dc1eb77ea468a1963db97f6163bbd2c8f85e72d328bc43bc48f2b1a`.
- Strict execution changed 3/3 stabilization and 485/485 extension groups,
  with zero failures, no-ops, or WorldEdit leftovers. Both durable journals
  are hash-bound in the ledger.
- The immutable post complete-save SHA-256 is
  `857271dc24e4558a28e647c83f006744785d73fb45614b1c3c6c72c43b6f9757`;
  its region identity is
  `7b3db9b0148f65fdc5f4c487f4df5d6c9471b28ce84849b8f1d4378928da72fa`.
- Exact post state is 488/488: 3/3 stabilized gravel contacts, 485/485
  extension targets, 164/164 pavement materials, and 31/31 foundation fills.
- The 273-cell combined R11A/R11B route is one component. Its 94-pair seam is
  also one component and its maximum adjacent vertical step is one block.
- All 164 new pavement contacts are stable, all 328 new two-block headroom
  cells are air, and all 109 accepted R11A surface targets plus 218 accepted
  R11A headroom cells remain exact.
- The source halo had 25 gravel cells. Three exact load contacts are now stone
  bricks; the other 22 remain unchanged and recursively supported. All 1,534
  non-operated halo cells are unchanged between source and post saves.
- Reverse rollback evidence passes in the declared order: 485/485 extension
  guards first, then 3/3 stabilization guards against the exact logical
  extension-rollback overlay.
- Read-only QA artifacts:
  `data/world-review/combined-zones-r11b-live-20260821T173605Z/r11b-post-release-qa.json`
  and `r11b-post-release-qa.md`; all 16 checks pass.

Regenerate the read-only seal and run both focused regressions:

```bash
node scripts/qa_combined_zones_r11b_c1_west_highway_extension_post_release.mjs
npx vitest run \
  test/build/combinedZonesR11BC1WestHighwayExtension.test.ts \
  test/build/qaCombinedZonesR11BC1WestHighwayExtensionPostRelease.test.ts
```

The verifier read immutable Anvil saves and bound evidence only. It made no
live call, service mutation, or world edit. R11B is complete and exactly
reversible at its declared scope.
