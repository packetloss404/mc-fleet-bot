# Combined Zones CZ-R10E: B09 lower-guideway passive wayfinding

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED  
**Release node:** `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
**Manifest identity:** `6432084e91ad29a98618059879fcd76d7098f4fa91d9bd9bbe648fe56e93874f`  
**Compile source:** accepted R10D post, complete-save SHA-256
`f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb`
**Live execution source:** `data/worldsnap-combined-zones-r10e-source-20260822T001339Z`,
complete-save SHA-256
`d71c13b1cf9030dca2069190ffacf89b79fa6a7e0c7c202a42b880fb189e9886`  
**Immutable post:** `data/worldsnap-combined-zones-r10e-post-20260822T001339Z`,
complete-save SHA-256
`4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0`

CZ-R10E adds a bounded static visual cadence to the complete accepted lower
straight portion of B09. It replaces 15 exact polished-diorite ceiling cells
with full-cube sea lanterns at FM-01 centerline indices 15, 31, 47, 63, 79,
95, 111, 127, 143, 159, 175, 191, 207, 223, and 239. Together with the
accepted R10D lower-station fixtures at indices 4 and 7, every centerline index
from 3 through 239 is no farther than eight indices from a fixture.

This is passive visual wayfinding only. The regular cadence is not a
photometric, emergency-lighting, life-safety-lighting, powered-system, route,
or funicular commissioning claim.

## Exact geometry and preservation

The target has coordinate-set SHA-256
`81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f`.
One cell is reviewed R07F ceiling fabric and 14 are reviewed R07H ceiling
fabric; all other prior target intersections are zero.

The complete 474-cell lower-station-and-straight route stays air. Its exact
1,426-cell face boundary starts as 1,422 polished-diorite cells, the two
accepted R10D fixtures, and the two boundary cells of the R07I curve aperture.
The 12-cell B08-facing cap remains polished diorite. The complete four-cell
R07I aperture remains air and its eight-cell collar remains polished diorite.
Every new fixture is a full-cube, non-gravity, non-block-entity boundary
replacement, so route clearance and enclosure continuity are unchanged.

The compiler binds the accepted R10D B09 state-set identity
`085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca`
across all 7,800 accommodation cells, R10D QA payload
`e6e78f778774bb1bb6b0df6bf1bd594bc39fc50f9cddb1304e118f81f94eff03`,
and completed R10D release identity
`f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7`.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r10e_b09_lower_guideway_passive_wayfinding.mjs`,
  file SHA-256
  `2899f4d4cfd10154786dae0fc8cd6e4da4adc6436f3c0d649cfd590982525c1a`.
- Manifest:
  `data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.release-manifest.json`,
  file SHA-256
  `fea2757a99fe42787efe422edc77a3bf5685d246a4a106104cd698d15dcb4f1f`.
- Forward operation:
  `data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.b09-lower-guideway-passive-ceiling-wayfinding.forward.txt`,
  15 exact one-cell guards, operation-body SHA-256
  `4c2e11df86ec58587abe47fd2ae8a6f19ae8e0ea43ea7cc624919436808828de`,
  file SHA-256
  `d3e2ee6b19b252a71ca76fe3b462d41332ae1d40889eb1a9d1ec65cf5fb218aa`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.b09-lower-guideway-passive-ceiling-wayfinding.rollback.txt`,
  operation-body SHA-256
  `d98dc934cbeebd414e90f2bc898fe198387740ed5867f323cbe688a2ec92ca43`,
  file SHA-256
  `cb8cd40cbdb79b404a0dbfad16e04f9884e69632a5751868fef995eb7569d836`.
- Focused regression:
  `test/build/combinedZonesR10EB09LowerGuidewayPassiveWayfinding.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r10e-b09-lower-guideway-passive-wayfinding-offline-20260822T001500Z/`.

- Independent manifest QA: **PASS**, one package and 15 unique targets.
- Exact R10D forward source preflight: **15/15 PASS**.
- Projected exact rollback preflight: **15/15 PASS** using only the hash-bound
  forward operation as its logical source overlay.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 15 groups each
  and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, zero blocking block entities.
- The complete 105-cell face halo contains 17 air, 75 polished-diorite, and
  13 stone cells. Fluid, gravity, active-mechanism, block-entity, saved-entity,
  and protected-relic counts are all zero.
- The real scoped wrapper `--print-plan` path accepts `mvpScope: true`, the R10
  release node, and the complete ten-stage prepare-only plan.
- Deterministic focused regression: **8/8 PASS**.

## Live execution and independent post-QA

The journaled wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its evidence ledger is
`data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json`,
file SHA-256
`dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c`,
and completed release identity
`6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5`.

Independent read-only post-QA returns
`PASS_EXACT_LOWER_GUIDEWAY_WAYFINDING_ROUTE_BOUNDARY_AND_INTERFACES_PRESERVED`
with payload SHA-256
`4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e`.
It proves:

- all 15 exact polished-diorite-to-sea-lantern transitions and the intended
  16-index cadence, with maximum distance eight to an accepted fixture when
  the R10D fixtures are included;
- all 474 lower-station-and-straight route cells remain air;
- the 1,426-cell boundary changes only at the 15 declared targets, ending as
  1,407 polished-diorite cells, 17 sea lanterns, and the two accepted R07I
  aperture cells;
- the 12-cell B08 cap remains polished diorite, the four-cell R07I aperture
  remains air, and its eight-cell collar remains polished diorite;
- the 105-cell halo has exactly 15 declared changes and no undeclared change;
- all 7,785 non-target cells in the 7,800-cell B09 accommodation are preserved;
- all 17 wrapper stages and 17 evidence bindings pass, the 36-entry execution
  journal ends complete with all temporary chunks released, and exact rollback
  post-state preflight passes 15/15.

The deterministic post-QA verifier and regression are
`scripts/qa_combined_zones_r10e_b09_lower_guideway_passive_wayfinding_post_release.mjs`
and
`test/build/qaCombinedZonesR10EB09LowerGuidewayPassiveWayfindingPostRelease.test.ts`.
The sealed JSON and Markdown reports are beside the ledger as
`r10e-post-release-qa.json` and `r10e-post-release-qa.md`.

## Active-transport boundary

Rail, drive, braking, vehicle, platform barriers, controls, power, drainage,
and commissioning are not compiled here. The frozen B09 technical record still
has null exact cell sets for those mechanisms. The next actionable transport
evidence task remains a deterministic rail/drive/brake failure-state design
that assigns exact cells and complete block states, proves neighbor-update
behavior, keeps both stations fail-closed during partial deployment, and
defines exact rollback and commissioning acceptance. That local gap does not
block this static passive-wayfinding package.

R10E is accepted only as the exact 15-fixture passive visual fit-out. The B08
external interface remains fail-closed, the curve aperture remains unchanged,
and this acceptance does not claim photometric or emergency-lighting
compliance, a powered system, funicular operation, or pedestrian-route
commissioning.
