# Combined Zones CZ-R10F: B09 curve/summit passive wayfinding

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED  
**Release node:** `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
**Manifest identity:** `bccef745745555d1ae9c5dbb4ee000546feae033ad5688d021dd256f04ab9919`  
**Compile source:** accepted R10E post, complete-save SHA-256
`4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0`
**Live execution source:** `data/worldsnap-combined-zones-r10f-source-20260822T003320Z`,
complete-save SHA-256
`b9347e6790d14541f7b8705955382f91445db58cd81109dd9c78d09d719914f4`  
**Immutable post:** `data/worldsnap-combined-zones-r10f-post-20260822T003320Z`,
complete-save SHA-256
`04007781f1a59beb3889b91210536180fe7b4aa69e68e455c873b4def901a8c2`

CZ-R10F continues the accepted passive B09 visual cadence across the complete
R07I curve, face ascent, and summit return. It replaces 19 exact
polished-diorite ceiling cells with full-cube sea lanterns at FM-01 centerline
indices 255, 271, 287, 303, 319, 335, 351, 367, 383, 399, 415, 431, 447,
463, 479, 495, 511, 527, and 543. Together with the accepted R10C, R10D, and
R10E fixtures, every centerline index from 3 through 560 is no farther than
eight indices from a fixture.

This is passive visual wayfinding only. The regular cadence is not a
photometric, emergency-lighting, life-safety-lighting, powered-system, route,
or funicular commissioning claim.

## Exact geometry and preservation

The target has coordinate-set SHA-256
`aff71953450823749a57f808f119ef333712418eb5be1755066c7bc643df61e4`.
All 19 cells are reviewed R07I ceiling fabric. No other prior release owns a
target cell.

The complete 622-cell R07I curve/summit-return route and complete 1,116-cell
B09 route stay air. The exact curve/summit-return face boundary has 1,866
cells: 1,863 polished-diorite cells and three accepted air cells before this
package. The complete B09 route boundary has 3,346 cells: 3,326
polished-diorite cells and the 20 accepted R10C/R10D/R10E sea lanterns. The
12-cell B08-facing cap and 12-cell exterior Z11 summit cap remain polished
diorite. Every new fixture is a full-cube, non-gravity, non-block-entity
boundary replacement, so route clearance and enclosure continuity are
unchanged.

The compiler binds the accepted R10E B09 state-set identity
`c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef`
across all 7,800 accommodation cells, R10E QA payload
`4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e`,
and completed R10E release identity
`6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5`.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r10f_b09_curve_summit_passive_wayfinding.mjs`,
  file SHA-256
  `cb34520af989ba5be5d68994f864f651b2f60019dc515072c9cd4daac19d241f`.
- Manifest:
  `data/buildops/combined-zones-r10f-b09-curve-summit-passive-wayfinding.release-manifest.json`,
  file SHA-256
  `26655abd984d90b4d31c513fceecd2987cae7c70b68df3ef30e6d3d59aff741f`.
- Forward operation:
  `data/buildops/combined-zones-r10f-b09-curve-summit-passive-wayfinding.b09-curve-summit-passive-ceiling-wayfinding.forward.txt`,
  19 exact one-cell guards, operation-body SHA-256
  `3a9cbeb7388d04cd6d104588e91964524e0d0764ab0bd249f91e73dea9414c47`,
  file SHA-256
  `a24fb54b2dd8f9ae0f924603fb8b1e0d8a8d3cabdb37f8a233ae3e5235273675`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r10f-b09-curve-summit-passive-wayfinding.b09-curve-summit-passive-ceiling-wayfinding.rollback.txt`,
  operation-body SHA-256
  `44e7655f0d0fe0cc17e100c80fcb4ef13a47bf91fe8cf0ed1c8145e086c7070e`,
  file SHA-256
  `f8d2f1800942768987e04cba0545a05ed9f7487b78d796f585f07a83f8dbf393`.
- Focused regression:
  `test/build/combinedZonesR10FB09CurveSummitPassiveWayfinding.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r10f-b09-curve-summit-passive-wayfinding-offline-20260822T003500Z/`.

- Independent manifest QA: **PASS**, one package and 19 unique targets.
- Exact R10E forward source preflight: **19/19 PASS**.
- Projected exact rollback preflight: **19/19 PASS** using only the hash-bound
  forward operation as its logical source overlay.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 19 groups each
  and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, zero blocking block entities.
- The complete 133-cell face halo contains 38 air and 95 polished-diorite
  cells. Fluid, gravity, active-mechanism, block-entity, saved-entity, and
  protected-relic counts are all zero.
- The real scoped wrapper `--print-plan` path accepts `mvpScope: true`, the R10
  release node, and the complete ten-stage prepare-only plan.
- Deterministic focused regression: **8/8 PASS**.

## Live execution and independent post-QA

The journaled wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its evidence ledger is
`data/world-review/combined-zones-r10f-live-20260822T003320Z/evidence-ledger.json`,
file SHA-256
`ff406dc599979d497ed4fb6f4c783f0b4a2dd6bf4689f9d9e7b8dc8f65bcc903`,
and completed release identity
`480473cb39bb923fa85b28d1141e6d5344fe3908fb71d9958daabf736c46e17b`.

Independent read-only post-QA returns
`PASS_EXACT_CURVE_SUMMIT_WAYFINDING_COMPLETE_ROUTE_CAPS_AND_PRIOR_FIXTURES_PRESERVED`
with payload SHA-256
`c8e5a92f8f4820eca27ac3343d2e2b53c6c3a8e005f150075a1f5908c2774b51`.
It proves:

- all 19 exact polished-diorite-to-sea-lantern transitions and the intended
  16-index cadence, with maximum distance eight across the complete route;
- all 622 segment-route cells and all 1,116 complete-route cells remain air,
  with the complete route forming one connected component;
- the 1,866-cell segment boundary and 3,346-cell complete boundary change only
  at the 19 declared targets; the complete boundary ends as 3,307
  polished-diorite cells and 39 accepted fixtures;
- the 12-cell B08 cap and 12-cell exterior Z11 summit cap remain polished
  diorite, and all 20 R10C/R10D/R10E fixtures remain sea lanterns;
- the 133-cell halo has exactly 19 declared changes and no undeclared change;
- all 7,781 non-target cells in the 7,800-cell B09 accommodation are preserved;
- both complete-save inventories contain the same 130 required members; 117
  member hashes are identical, the exact 13 changed-member paths are recorded,
  and no POI member changed. This member-level save-lifecycle accounting does
  not authorize block drift; the exact B09 domain has zero undeclared change;
- all 17 wrapper stages and 17 evidence bindings pass, the 44-entry execution
  journal ends complete with all temporary chunks released, and exact rollback
  post-state preflight passes 19/19.

The deterministic post-QA verifier and regression are
`scripts/qa_combined_zones_r10f_b09_curve_summit_passive_wayfinding_post_release.mjs`
and
`test/build/qaCombinedZonesR10FB09CurveSummitPassiveWayfindingPostRelease.test.ts`.
The sealed JSON and Markdown reports are beside the ledger as
`r10f-post-release-qa.json` and `r10f-post-release-qa.md`.

## Active-transport boundary

Rail, drive, braking, vehicle, platform barriers, controls, power, drainage,
and commissioning are not compiled here. The frozen B09 technical record still
has null exact cell sets for those mechanisms. The next actionable transport
evidence task remains a deterministic rail/drive/brake failure-state design
that assigns exact cells and complete block states, proves neighbor-update
behavior, keeps both stations fail-closed during partial deployment, and
defines exact rollback and commissioning acceptance. That local gap does not
block this static passive-wayfinding package.

R10F is accepted only as the exact 19-fixture passive visual fit-out. Both
external interfaces remain fail-closed, and this acceptance does not claim
photometric or emergency-lighting compliance, a powered system, funicular
operation, or pedestrian-route commissioning.
