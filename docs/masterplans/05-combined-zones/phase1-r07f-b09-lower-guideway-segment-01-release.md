# Combined Zones CZ-R07F: B09 lower guideway segment 01

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE — POST_RELEASE_QA_ACCEPTED  
**Release node:** `CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK`  
**Manifest identity:** `0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354`  
**Completed release identity:** `15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e`  
**Execution source complete save:** `cc16e117d71b08fb887ab8960c48ea909b90c19ad6a9e281875db14c737f0d7f`  
**Post complete save:** `b7f0ec5a7712dd1b7252f0adb755ae8d8374bf2f63740f089ec79f15f03c7410`

CZ-R07F is the first exact running-guideway framework package after the
accepted R07D lower station. It follows frozen FM-01 centerline indices
9…24, the first 16-point straight, level run after the nine-point station
seed. It builds a complete static polished-diorite enclosure before opening
the exact two-cell internal station seam. A complete 12-cell far cap keeps the
unbuilt remainder of the guideway inaccessible.

The B08 portal and Z11 summit interfaces are external to this package. Both
remain untouched and physically closed. The package installs no rail,
vehicle, drive, brake, power, controls, drainage, outfall, rescue, egress, or
commissioned transport function.

## Bound current state

The compiler binds the immutable R08H liner post save and terminal completed
release identity
`da8f714258d7b1d3254c2c2d408cdee930c4dcac4f3ce73cec3602607efbc6f3`.
It also requires the accepted R07E B09 QA payload
`53d4fce9b5e1dd658655ee364cdf50a6b56922e322e2b2174a5f1d732268943d`.
The full 7,800-cell B09 accommodation is reproduced with 7,551 air and 249
polished-diorite cells and exact state-set identity
`a84911a9e54009f6d3ad4e4f6792c4ff60ee0b9fc8a068d9453f25f1c3e98846`.

The exact operation source partition is:

- 162 new-shell targets, all exact air;
- two internal-seam targets, both exact polished diorite;
- 42 preserved connection-interior cells, all exact air;
- ten retained near-cap collar cells, all exact polished diorite;
- 12 future far-cap targets, all exact air;
- 36 untouched B08 interface cells in their accepted 33-air/three-diorite
  state;
- 12 untouched Z11 interface-cap cells, all accepted polished diorite.

## Exact design

The 16 selected rail/headroom seeds produce a 216-cell raw envelope. Removing
the accepted lower-station envelope leaves a 192-cell new segment envelope:

- preserved segment interior: 30 cells at `x=2058…2072`, two blocks high,
  `76a52547e89698734a8c1175244a4e5069df7b0e1afb9f9de18a2c965bf52f25`;
- static segment shell: 162 cells,
  `7cb64c9af7d0f37695b9a4c30f888bfe373eb315bec4d9530ab915674a567ea6`;
- owned internal seam opening: two cells at `x=2057`, `y=130…131`,
  `z=-748`,
  `5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e`;
- retained near-cap collar: ten cells,
  `7065c9fc48e7c9c69a69428e9c25a3cc2a46ef4b599f4939c017a79a63b7dae9`;
- complete far isolation cap at `x=2073`: 12 cells,
  `ffbb546fae81114f50226ac6042fe75d9f057b3543cd3887f10ebbdfcefef333`.

After projection, the accepted lower-station interior, owned seam, and new
segment interior form one 44-cell connected air void,
`5eedb05ad65d442f00c56caa04d37f5e29838bd4006df577605a1b6dcc4563e5`.
Its complete 136-cell face boundary is provided by the retained R07D shell and
new R07F shell, including the far cap.

## Guarded package

- Compiler:
  `scripts/compile_combined_zones_r07f_b09_lower_guideway_segment_01.mjs`.
- Manifest:
  `data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json`,
  file SHA-256
  `f8ade888c396f8407a40d4450f1dd9a01240a8640f7791185c7d23e253694823`.
- Forward:
  `data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.b09-lower-guideway-segment-01.forward.txt`;
  164 exact one-cell guards, operation-body SHA-256
  `c2ff8639b0f6047c770df8b83388c7adfb053b10543298136226b8d7c2ab600d`,
  file SHA-256
  `210cc1793f48557a1f56181f66203d2ca80debbdbfcd33afb5190281d9a93071`.
- Exact reverse-order rollback:
  `data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.b09-lower-guideway-segment-01.rollback.txt`;
  164 exact one-cell guards, operation-body SHA-256
  `6d9875947286e9c435624a063357d1e1638395ef3ccacbb4370f25ec8feae647`,
  file SHA-256
  `42f38ff84f23419a2d2a1992d6e859ec7a96c9b66014b2f43289a3563259fc99`.
- Focused regression:
  `test/build/combinedZonesR07FB09LowerGuidewaySegment01.test.ts`.
- Terminal live ledger:
  `data/world-review/combined-zones-r07f-live-20260821T172700Z/evidence-ledger.json`.
- Independent post-release seal:
  `data/world-review/combined-zones-r07f-live-20260821T172700Z/r07f-post-release-qa.json`
  and
  `data/world-review/combined-zones-r07f-live-20260821T172700Z/r07f-post-release-qa.md`.
- Post-release verifier and deterministic regression:
  `scripts/qa_combined_zones_r07f_b09_lower_guideway_segment_01_post_release.mjs`
  and
  `test/build/qaCombinedZonesR07FB09LowerGuidewaySegment01PostRelease.test.ts`.

The forward order constructs all 162 shell cells before opening the two-cell
internal seam. The exact inverse rollback reseals both seam cells before
removing any new shell cell. The 164-cell operated-set identity is
`2d0ac7f21afb5835112b47f3fba677939a4d4d2617f497cfe284cc0d11beed96`.

## Offline hard-safety result

Evidence is under
`data/world-review/combined-zones-r07f-b09-lower-guideway-segment-01-offline-20260821T172000Z/`.

- Independent manifest QA: **PASS**, one package, 164 unique targets, zero
  cross-package intersections.
- Exact mixed-source forward preflight: **164/164 PASS** against the bound
  R08H post region.
- Projected rollback with the exact forward overlay: **164/164 PASS**.
- Strict-noop forward and rollback parser dry-runs: **PASS**, 164 groups each,
  zero WorldEdit leftovers.
- Block-entity clearance: **PASS**, two target chunks, zero blocking entities
  or missing chunks.
- Compiler isolation: zero fluid, gravity, container/control, block-entity,
  saved-entity, protected-relic, undeclared prior-release, B08-interface, or
  Z11-interface violations. The only prior-release target intersection is the
  declared two-cell R07D internal seam.
- Deterministic focused regression: **8/8 PASS**.

## Executed and sealed result

The scoped live wrapper captured a fresh source save, reran manifest, exact
mixed-state source, block-entity, live-entity, and strict-parser gates, then
executed all 164 one-cell groups. Every group changed successfully with zero
failure, no-op, unknown reply, or WorldEdit leftover. All 17 terminal-ledger
stages pass. The ledger has SHA-256
`f7c7aa14e7f8a6b6d29c802aa1b6c7525313a1ae60f8d2a65a5d3f3e55afa0d0`.

The independent read-only verifier re-derived the exact FM-01 centerline,
segment geometry, and full B09 accommodation, then compared execution source
region
`34fe4e5f0d9f55fae19bfa97538cf35c4c599ad4f804cc866b794fc8132ce5c4`
with post region
`59806371004dc7b8244568ead943393206322af449d4b1808da95b5518926096`.
It proves:

- 162/162 shell cells made the declared air-to-polished-diorite transition;
- 2/2 internal-seam cells made the declared polished-diorite-to-air
  transition;
- the complete 44-cell lower-station/segment void is connected air;
- all 136 void-boundary cells are polished diorite, including the complete
  12-cell far cap and unchanged ten-cell near collar;
- all 36 B08-interface, 12 Z11-cap, and 162 R07E summit-shell cells retain
  their source states;
- the only source-to-post changes across all 7,800 B09 cells are the 164
  declared R07F targets;
- all 164 exact reverse-order rollback guards pass against the post snapshot,
  with rollback resealing the seam before shell removal.

All 15 post-release acceptance checks pass. QA payload identity is
`516be068e82892c8c0f2b92aeffa901b501dc60eae5544fbbfb4aede64bc8d1c`.
The verifier made no live call, service mutation, or world edit.
