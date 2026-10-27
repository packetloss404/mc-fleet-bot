# Combined Zones CZ-R07E: B09 summit-headhouse shell

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d`  
**Completed release identity:** `8ad00954eff48a4d6d5f7b2acb0505bed9169d07ad8c6214818106faec67e953`  
**Execution source complete save:** `0e0b0f2d72d2d5f565d5f7fb83d0f78aee85a0018f573a959e393fbabfcc614e`  
**Post complete save:** `605535ea361acf3c061586c666e59f6218d7965e4a72308d35a56637ae60ddd3`

CZ-R07E is the next bounded static framework package after the accepted R07D
lower-station shell. It constructs the exact B09 summit headhouse as a sealed
polished-diorite enclosure, preserves a connected rail/headroom void, and
physically closes both the unbuilt guideway approach and the canonical Z11
summit interface. It does not open or commission either interface.

## Bound current state

The compiler binds the accepted R07D post save and its completed release
identity
`d2e446216f55a7f6b67432c2203e3624a64606eb64b25eb2e5439d8c8d286bfe`.
It reproduces the frozen 7,800-cell FM-01 B09 accommodation, which contains
7,713 air and 87 polished-diorite cells in that save. All 180 summit-envelope
cells, including both 12-cell interface caps, are exact air before this
package.

- Frozen B09 accommodation: 7,800 cells,
  `e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca`.
- Summit-station envelope: 180 cells,
  `99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599`.
- Connected rail/headroom void: 18 air cells,
  `771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d`.
- Exact shell: 162 polished-diorite targets,
  `8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592`.
- Interior face boundary: all 58 exterior face-neighbours of the connected
  void are part of the shell,
  `bdd0ba179cc533a5c707137a606254fa06c916bfe28fd0c59da77f168f4eab06`.

The shell includes two deliberate, fail-closed boundaries:

- guideway approach cap at `z=-819`: 12 cells,
  `8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c`;
- canonical Z11 summit-interface cap at `z=-829`: 12 cells,
  `d1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093`.

The B08 portal seam and the accepted R07D lower shell have zero target
intersection and remain unchanged. Rail, vehicle, drive, braking, power,
controls, drainage, outfall, rescue, egress, platform barriers, guideway
continuation, and the Z11 opening remain deferred.

## Guarded artifacts

- Compiler:
  `scripts/compile_combined_zones_r07e_b09_summit_headhouse_shell.mjs`.
- Manifest:
  `data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json`,
  file SHA-256
  `454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b`.
- Forward:
  `data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.b09-summit-headhouse-shell.forward.txt`;
  162 one-cell guarded commands, operation-body SHA-256
  `0919ff43b2ca9d405d5d45ae35e00d75df790406c5d19a6b3c1899e4b5802a44`,
  file SHA-256
  `b248011a3372caaf3953639e0b2360a819bb6466526a8875ed92e6d7e4ac9d99`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.b09-summit-headhouse-shell.rollback.txt`;
  162 one-cell guarded commands, operation-body SHA-256
  `3d1529966df9fe25286de645c7e1fec97cf03a3b5192f959246f73a7f8312c41`,
  file SHA-256
  `363616a49e7c4434cf26132fef25d0335007f8008be5611830909a72dfd96f4a`.
- Focused regression:
  `test/build/combinedZonesR07EB09SummitHeadhouseShell.test.ts`.
- Terminal live ledger:
  `data/world-review/combined-zones-r07e-live-20260821T170500Z/evidence-ledger.json`.
- Read-only post-release seal:
  `data/world-review/combined-zones-r07e-live-20260821T170500Z/r07e-post-release-qa.json`
  and
  `data/world-review/combined-zones-r07e-live-20260821T170500Z/r07e-post-release-qa.md`.
- Post-release verifier and regression:
  `scripts/qa_combined_zones_r07e_b09_summit_headhouse_post_release.mjs`
  and
  `test/build/qaCombinedZonesR07EB09SummitHeadhousePostRelease.test.ts`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r07e-b09-summit-headhouse-shell-offline-20260821T165500Z/`.

- Independent manifest QA: **PASS**, one package, 162 unique targets, zero
  package intersections.
- Exact forward source preflight: **162/162 PASS** against the bound R07D post
  region.
- Projected rollback with the exact forward overlay: **162/162 PASS**.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 162 groups each,
  zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, two target chunks, zero blockers or
  missing chunks.
- Compiler isolation: zero fluid, gravity, forbidden container/control,
  block-entity, saved-entity, protected-relic, prior-release, B08 seam, R07D
  lower-shell, or preserved-interior violations.
- Deterministic focused regression: **8/8 PASS**.

## Executed and sealed result

The scoped live wrapper captured a fresh complete source save, reran the exact
source, block-entity, live-entity, manifest, and strict-parser gates, and
executed all 162 one-cell groups. Every group changed successfully with zero
failure, no-op, unknown reply, or WorldEdit leftover. All 17 terminal-ledger
stages pass. The ledger has SHA-256
`f6c5957396048caa4f4771d1d78f00abc80e2b7754c98e6a7f2accdc764345d3`.

The independent read-only verifier re-derived the frozen FM-01 geometry and
compared all 7,800 B09 accommodation cells between execution source region
`4a2936fc0c7ca463736ad5320dba16f9d50fb63f694ac3d35d2f7426fdff432b`
and post region
`773729c102c13f127421a910fb65f6a81e15ae7fadfd311e7062c294d1a795cb`.
It proves:

- 162/162 shell cells made the declared exact air-to-polished-diorite
  transition;
- 18/18 interior cells remain air in one connected component;
- both the 12-cell Z11 summit-interface cap and 12-cell guideway-approach cap
  are polished diorite and physically closed;
- all 36 B08 seam cells and all 84 accepted R07D lower-shell cells retain
  their exact source states;
- the only changes across the complete B09 accommodation are the 162 declared
  R07E targets;
- all 162 exact reverse-order rollback guards pass against the post snapshot.

All 13 post-release acceptance checks pass. QA payload identity is
`53d4fce9b5e1dd658655ee364cdf50a6b56922e322e2b2174a5f1d732268943d`.
The post-release verifier made no live call, service mutation, or world edit.
