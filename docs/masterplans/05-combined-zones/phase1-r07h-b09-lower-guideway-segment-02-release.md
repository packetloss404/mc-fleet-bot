# Combined Zones CZ-R07H: B09 lower guideway segment 02

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416`  
**Execution source complete save:** `670fb4e2a7034cc77ea30ca0fb3850e4c53e16d87cf061bdbad3d055bf09ffb6`  
**Post complete save:** `12df71af54a5e02e092190fa18b1f3d8206d929d507537cc0593318d7c23182e`  
**Completed release identity:** `1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f`

CZ-R07H is the second exact B09 running-guideway framework package. It
continues from accepted R07F Segment 01 through that package's owned two-cell
far-cap seam. The selected FM-01 centerline range is indices 24…239: all 216
points in the maximal remaining dry, level, straight run before the first
direction change at index 240.

The package constructs a complete polished-diorite enclosure before opening
the prior seam. It stops at a complete 12-cell fail-closed cap at `x=2288`, so
the unbuilt curve and all farther guideway remain inaccessible. It installs no
rail, vehicle, drive, brake, power, control, drainage, outfall, rescue, egress,
or commissioned transport function.

## Bound current state

The compiler binds immutable R07G post snapshot
`data/worldsnap-combined-zones-r07g-post-20260821T181527Z`, region identity
`d3c7f46034a4cab20819c51a4ee505a46be81065fda887c19ebe3638f2d83ad8`,
and the R07G terminal ledger with SHA-256
`de283824ad70c1b0b1e46d7070c4c3622210f67b703a20a1b0fa791779341689`.
It also binds accepted R07F manifest identity
`0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354`,
completed identity
`15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e`,
and QA payload
`516be068e82892c8c0f2b92aeffa901b501dc60eae5544fbbfb4aede64bc8d1c`.

The full 7,800-cell B09 minimum accommodation is reproduced with 7,391 air
and 409 polished-diorite cells and exact current state-set identity
`c68ad8effd7a3f0e258311575fd3414a29c52e363bb793b099487779f03ba561`.
The frozen 7,488-cell running-guideway/support envelope is the canonical B09
construction domain; all 2,154 operated cells lie inside it and inside the
7,800-cell interaction domain.

## Exact design

The 216 selected centerline points produce a 2,616-cell raw envelope. Removing
the accepted R07F overlap leaves a 2,580-cell new segment envelope:

- 428 preserved interior air cells at `x=2074…2287`, two blocks high;
- 2,152 new static polished-diorite shell cells, including the complete far
  cap;
- two owned prior-cap seam cells at `x=2073`, `y=130…131`, `z=-748`, opened
  only after the shell is complete;
- ten retained polished-diorite prior-cap collar cells;
- 12 polished-diorite far-cap cells at `x=2288`, including the two-cell future
  curve seam, which remains closed.

After projection, the accepted lower-station and Segment 01 interiors, the
opened seam, and the new Segment 02 interior form one 474-cell connected air
void with coordinate-set SHA-256
`33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1`.
Its complete 1,426-cell face boundary projects to polished diorite, including
the retained near collar and new far cap.

The exact operated-set identity is
`f797de91a3544c0e233cbbaadfd1a08bbc2b9b1141cd1cb1a0159f19710c1d9d`.
The only prior-release overlap is the declared two-cell R07F seam. Target
overlap is zero with B08, Z11, R07D, and R07E.

## Guarded package

- Compiler:
  `scripts/compile_combined_zones_r07h_b09_lower_guideway_segment_02.mjs`.
- Manifest:
  `data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json`;
  file SHA-256
  `63c8189593a9c6974fc5562630aee6ceffa30d268ccc69bec97f7e91dc5ac18e`.
- Forward:
  `data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.b09-lower-guideway-segment-02.forward.txt`;
  2,154 exact one-cell guards, operation-body SHA-256
  `cf53593ea03acac302bdb57f2ced8d0b312a9a04e86d6471d4c7922772697cd2`,
  file SHA-256
  `e0e5d05bb0cbb1ab8b1dd0feb231d0d9238a0f55e6062fb3e73bd5bca3036b53`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.b09-lower-guideway-segment-02.rollback.txt`;
  2,154 exact one-cell guards, operation-body SHA-256
  `1dffe6718b6ef82cecf33172bb0fa95d414ec75f5b02ffef0663996f2effd801`,
  file SHA-256
  `a61356af44c1326e834bf175f62b3d37ebcd01aad25b382c02f400d847d5daea`.
- Focused regression:
  `test/build/combinedZonesR07HB09LowerGuidewaySegment02.test.ts`.

Forward order builds all 2,152 shell cells before opening either seam cell.
Rollback first reseals both seam cells, then removes the new shell in exact
reverse order, restoring the R07G post state.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r07h-b09-lower-guideway-segment-02-offline-20260821T183200Z/`.

- Independent manifest QA: **PASS**, one package and 2,154 unique targets.
- Exact forward source preflight: **2,154/2,154 PASS** against the bound R07G
  region.
- Projected exact rollback preflight with the forward overlay:
  **2,154/2,154 PASS**.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 2,154 groups
  each and zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, 15 target chunks and zero blocking block
  entities or missing chunks.
- Static interaction halo: 6,522 complete source cells, zero fluid or
  waterlogged states, gravity blocks, forbidden container/control blocks,
  block entities, saved entities, protected relics, or undeclared prior-release
  intersections.
- Projected route: 474 connected air cells, one component, and zero interior or
  boundary mismatches.
- Deterministic focused regression: **8/8 PASS**.

## Execution boundary

The scoped live wrapper captured a fresh same-invocation source save and
passed all 17 terminal stages. It executed 2,154/2,154 strict one-cell groups
with 2,154 changes, zero failure, no-op, unknown reply, or WorldEdit leftover.
The exact reverse rollback preflight passes 2,154/2,154 against immutable post
region identity
`6fc61a5e77a930c3a4fdbddc5ed4a26205ec5980aca7825245c57d932a909b81`.
The terminal ledger is
`data/world-review/combined-zones-r07h-live-20260821T183544Z/evidence-ledger.json`,
SHA-256
`7bdc51889ce5a623deed492ef476cd57925649b46c9134c11ece035d7e8165bc`.

## Independent post-release seal

The read-only verifier
`scripts/qa_combined_zones_r07h_b09_lower_guideway_segment_02_post_release.mjs`
re-derived the frozen FM-01 centerline and Segment 02 geometry, read the
immutable source and post Anvil saves, and proved:

- 2,152/2,152 exact air-to-polished-diorite shell transitions;
- 2/2 exact R07F far-cap seam transitions to air;
- 474/474 connected route cells are air in one component;
- 1,426/1,426 face-boundary cells are polished diorite;
- the 12/12-cell far cap and its future two-cell curve seam are closed;
- all 84 R07D, 162 R07E, and 162 non-seam R07F operated cells retain their
  source state;
- all 36 B08 and 12 Z11 interface cells retain their source state;
- exactly the declared 2,154 cells changed across the complete 7,800-cell B09
  accommodation, with zero undeclared drift;
- strict execution and all 2,154 exact inverse guards remain identity-bound.

All 14 independent acceptance checks pass. QA payload identity is
`b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed`.
Sealed reports are
`data/world-review/combined-zones-r07h-live-20260821T183544Z/r07h-post-release-qa.json`
and
`data/world-review/combined-zones-r07h-live-20260821T183544Z/r07h-post-release-qa.md`.
The deterministic regression is
`test/build/qaCombinedZonesR07HB09LowerGuidewaySegment02PostRelease.test.ts`.
The verifier made no live call, service mutation, or world edit.
