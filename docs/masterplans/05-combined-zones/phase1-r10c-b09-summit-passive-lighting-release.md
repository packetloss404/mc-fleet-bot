# Combined Zones CZ-R10C: B09 summit passive lighting

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED  
**Release node:** `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`  
**Manifest identity:** `bee65eec948fcb5c889d0398e3ea835d23b892ab33514f0c7412ebb1ec7e0144`  
**Compile source:** accepted R10B post, complete-save SHA-256
`e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80`
**Live execution source:** `data/worldsnap-combined-zones-r10c-source-20260821T233530Z`,
complete-save SHA-256
`e317222a820f53b2f04fdd63028228a616f6dfa1b44691de5873d3eddd758bfb`  
**Immutable post:** `data/worldsnap-combined-zones-r10c-post-20260821T233530Z`,
complete-save SHA-256
`e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7`

CZ-R10C is the smallest defensible B09 summit-headhouse fit-out after accepted
R10B. It replaces three exact polished-diorite ceiling cells with full-cube
sea lanterns at `(2048,298,-820)`, `(2048,302,-824)`, and
`(2048,306,-828)`. These are frozen FM-01 centerline indices 552, 556, and
560 at rail datum plus two blocks. Every summit-station index is at most two
indices from a fixture.

This is a passive visual fixture cadence only. It is not a photometric,
emergency-lighting, power, or operational commissioning claim.

## Exact geometry and preservation

The three-cell target has coordinate-set SHA-256
`b06b4450bff0ddef846731cdad037966d32b4ff9819763cf93015a805e10bfe6`.
All three cells are exact R07E polished-diorite ceiling fabric inside the
162-cell summit headhouse shell. Their only accepted prior-release overlap is
this reviewed R07E migration; all other prior target intersections are zero.

The complete 18-cell summit rail/headroom void stays air. The ten-cell R10B
approach collar and complete 12-cell exterior Z11 cap stay polished diorite.
Sea lanterns are full-cube, non-gravity, non-block-entity replacements, so the
enclosure remains closed and route clearance is unchanged.

The compiler binds the accepted R10B B09 state-set identity
`23f8adaf3b2035ef88d1445168783f1a60f615597483e061768f4ce2c024c873`
across all 7,800 accommodation cells, R10B QA payload
`8340189fce3197684041859f91113c791f79992c8d0e681e1ceb84576d4f8e0c`,
and completed R10B release identity
`3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474`.

## Frozen guarded package

- Compiler:
  `scripts/compile_combined_zones_r10c_b09_summit_passive_lighting.mjs`,
  file SHA-256
  `03f3e1a9b0c545730198e20332de8aba78c5ebb0d43089f0fb7ddb8ffe5dc20d`.
- Manifest:
  `data/buildops/combined-zones-r10c-b09-summit-passive-lighting.release-manifest.json`,
  file SHA-256
  `f0141a2f4d4c94f51aa8ec992b60cdfb82797efdd1c917741618c79971901698`.
- Forward operation:
  `data/buildops/combined-zones-r10c-b09-summit-passive-lighting.b09-summit-passive-ceiling-lights.forward.txt`,
  three exact one-cell guards, operation-body SHA-256
  `360c563b6dd4bb65110a3972cff6fff59b3206323d6b3200b6932c81b84d4ff2`,
  file SHA-256
  `5f89b8cd779528896f5c3d65e117385d0352444c371fed3779c89d8bd8d8d132`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r10c-b09-summit-passive-lighting.b09-summit-passive-ceiling-lights.rollback.txt`,
  operation-body SHA-256
  `840f2ed533d04b31587151603acfd2127f13f2789e289b864ede2c4ac307bccd`,
  file SHA-256
  `288c1d10e41073dc111922e7bc9db8f95c6d077ae99a0521d680e1896e844d5e`.
- Focused regression:
  `test/build/combinedZonesR10CB09SummitPassiveLighting.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r10c-b09-summit-passive-lighting-offline-20260821T233000Z/`.

- Independent manifest QA: **PASS**, one package and three unique targets.
- Exact R10B forward source preflight: **3/3 PASS**.
- Projected exact rollback preflight: **3/3 PASS**.
- Strict-noop forward and rollback parser dry-runs: **PASS**, three groups each
  and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, zero blocking block entities.
- The complete 21-cell face halo contains six air and 15 polished-diorite
  cells. Fluid, gravity, active-mechanism, block-entity, saved-entity, and
  protected-relic counts are all zero.
- Deterministic focused regression: **7/7 PASS**.

## Live execution and independent post-QA

The journaled wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its evidence ledger is
`data/world-review/combined-zones-r10c-live-20260821T233530Z/evidence-ledger.json`,
file SHA-256
`d1e27f56639c5df52c4dfd6e7c063baeaf8b76b363efa615216b6d57b5160da6`,
and completed release identity
`e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14`.

Independent read-only post-QA returns
`PASS_EXACT_PASSIVE_FIXTURES_ENCLOSURE_AND_CAPS_PRESERVED_REVERSIBLE` with
payload SHA-256
`0c3e390a7b1b4a2e9907c50f2a527b6fc2e74eceeaf007d9bfe4a595fe6704cd`.
It proves:

- all three exact polished-diorite-to-sea-lantern transitions;
- all 18 summit route/headroom cells remain air;
- the 162-cell enclosure remains exactly 157 polished-diorite cells, three
  full-cube fixtures, and the accepted two-cell R10B internal seam;
- all ten approach-collar and 12 exterior Z11-cap cells remain polished
  diorite;
- the 21-cell fixture halo has exactly three declared differences and no
  undeclared change;
- all 7,797 non-target cells in the 7,800-cell B09 accommodation are preserved;
- all 17 wrapper stages and 17 evidence bindings pass, the 12-entry execution
  journal ends complete and cleaned, and exact rollback preflight passes 3/3.

The deterministic post-QA verifier and regression are
`scripts/qa_combined_zones_r10c_b09_summit_passive_lighting_post_release.mjs`
and
`test/build/qaCombinedZonesR10CB09SummitPassiveLightingPostRelease.test.ts`.
The sealed JSON and Markdown reports are beside the ledger as
`r10c-post-release-qa.json` and `r10c-post-release-qa.md`.

## Active-transport boundary

Rail, drive, braking, vehicle, platform barriers, controls, power, drainage,
and commissioning are not compiled here. The frozen B09 technical record still
has null exact cell sets for those mechanisms. The next actionable transport
evidence task is a deterministic rail/drive/brake failure-state design that
assigns exact cells and complete block states, proves neighbor-update behavior,
keeps both stations fail-closed during partial deployment, and defines exact
rollback and commissioning acceptance. This local gap does not block the
static passive-fixture package.

R10C is accepted only as the exact three-fixture passive visual fit-out. The
exterior Z11 interface remains fail-closed, and this acceptance does not claim
photometric or emergency-lighting compliance, a powered system, funicular
operation, or pedestrian-route commissioning.
