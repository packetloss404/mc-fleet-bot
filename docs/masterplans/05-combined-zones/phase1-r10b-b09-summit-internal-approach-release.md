# Combined Zones CZ-R10B: B09 summit internal approach

**Status:** EXECUTED — POSTSTATE VERIFIED — REVERSIBLE — POST-QA ACCEPTED  
**Release node:** `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
**Manifest identity:** `4de9770f03590755ffb07b51af219ef6d34fdf7a0a12f0da8990af802beaf975`  
**Compile source:** accepted R08U post, complete-save SHA-256
`6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59`

CZ-R10B is a deliberately narrow static internal-interface package. It opens
only the two retained polished-diorite cells at `x=2048`, `y=295…296`,
`z=-819`. Those cells are the exact R07E approach-cap overlap owned by the
R10 summit-fit-out threshold. No exterior interface is opened.

## Exact geometry and function

The accepted R07I guideway void has 1,096 cells. The accepted R07E summit
interior has 18 cells. Without the two seam cells they remain two components
of sizes 1,096 and 18. Projecting both seam cells to air produces one connected
1,116-cell internal void, coordinate-set SHA-256
`c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6`.

The remaining ten cells of the R07E approach collar stay polished diorite. The
separate 12-cell exterior Z11 cap at `z=-829` also stays polished diorite,
coordinate-set SHA-256
`d1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093`.
The package installs no rail, drive, brake, vehicle, controls, power, drainage,
or other active mechanism. It commissions neither funicular operation nor a
pedestrian route.

## Accepted source and disjoint rebase

The compiler binds immutable R08U post snapshot
`data/worldsnap-combined-zones-r08u-post-20260821T201019Z`, region identity
`dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217`,
and completed release identity
`a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91`.
Every one of the 7,800 B09 accommodation cells exactly matches the accepted
R07I baseline state-set identity
`c9ab509e6e14bd267d4c509808be87677a7e36033e9bda53f69611d02aa46635`;
the mismatch count is zero.

The operated coordinate set contains exactly two cells, SHA-256
`8100289cadea36a33df57d789c17b6972124bdc65101ffa2dc439967c8ba8f75`.
Their only prior-release target overlap is the reviewed R07E internal seam.
All other accepted release target intersections are zero.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r10b_b09_summit_internal_approach.mjs`,
  file SHA-256
  `b4632cf84b9b63d8731ba71613ad9d20979d304c45a9779fa0c68ba0fe45aa82`.
- Manifest:
  `data/buildops/combined-zones-r10b-b09-summit-internal-approach.release-manifest.json`,
  file SHA-256
  `0afc5608b73ac59ac44425a16195cd2c603e8a068c67d1140f02faaa115777d5`.
- Forward operation:
  `data/buildops/combined-zones-r10b-b09-summit-internal-approach.b09-summit-internal-approach-aperture.forward.txt`,
  two one-cell guards, operation-body SHA-256
  `d3f19bcbeea943d476ad428d1e98046f5bd7d390399071bf6ad59fc10c0e180b`,
  file SHA-256
  `3da8cd4753da75837ccd20fe96ec8c3c1601ac3aee51c61c11845a99ee76024a`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r10b-b09-summit-internal-approach.b09-summit-internal-approach-aperture.rollback.txt`,
  operation-body SHA-256
  `09c271976160c155cdfa96768b2216a3b13ed82526b71352dad77df7181e7b93`,
  file SHA-256
  `1369711bed026e5276233fa410548b697c65a72a0972d01c47808c856dd5af6a`.
- Focused regression:
  `test/build/combinedZonesR10BB09SummitInternalApproach.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r10b-b09-summit-internal-approach-offline-20260821T201500Z/`.

- Independent manifest QA: **PASS**, one package and two unique target cells.
- Exact R08U forward source preflight: **2/2 PASS**.
- Projected exact rollback preflight: **2/2 PASS** using the forward package as
  a source overlay.
- Strict-noop forward and rollback parser dry-runs: **PASS**, two groups each
  and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, zero blocking block entities.
- The complete 12-cell face halo contains two air and ten polished-diorite
  cells. Fluid, gravity, active-mechanism, block-entity, saved-entity, and
  protected-relic counts are all zero.
- Deterministic focused regression: **7/7 PASS**.

## Execution and independent post-release seal

The scoped wrapper completed all 17 required stages. It bound fresh source
complete save
`e951f1c7d29f1dadee5e2ed80ad8762657f24d2ca737efb7ea7f492e50948a76`,
executed 2/2 strict groups with two changes and zero failure, no-op, unknown
reply, or WorldEdit leftover, captured immutable post complete save
`e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80`,
and passed exact rollback preflight 2/2. Completed release identity is
`3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474`.
The execution ledger is
`data/world-review/combined-zones-r10b-live-20260821T230936Z/evidence-ledger.json`.

The independent read-only verifier
`scripts/qa_combined_zones_r10b_b09_summit_internal_approach_post_release.mjs`
re-derived the FM-01 guideway and summit interface and verified:

- both exact target cells transitioned from polished diorite to air;
- the complete 1,116-cell internal void is exact air in one component;
- without the seam, the 1,096-cell guideway and 18-cell summit interior remain
  two separate components, proving the two-cell aperture is necessary;
- all ten retained approach-collar cells and all 12 exterior Z11 cap cells
  remain polished diorite;
- exactly the two declared cells differ across the complete 7,800-cell B09
  accommodation, preserving all 7,798 non-target cells;
- all 17 wrapper stages and 17 evidence bindings pass, and the exact
  reverse-order rollback remains ready.

All 12 QA checks pass. QA payload identity is
`8340189fce3197684041859f91113c791f79992c8d0e681e1ceb84576d4f8e0c`.
The sealed reports are
`data/world-review/combined-zones-r10b-live-20260821T230936Z/r10b-post-release-qa.json`
and
`data/world-review/combined-zones-r10b-live-20260821T230936Z/r10b-post-release-qa.md`.
The focused post-release regression is
`test/build/qaCombinedZonesR10BB09SummitInternalApproachPostRelease.test.ts`.

Acceptance remains limited to the static internal threshold. The exterior Z11
cap is fail-closed. Rail, drive, brake, vehicle, controls, power, drainage,
funicular operation, and pedestrian-route commissioning remain separate work.
