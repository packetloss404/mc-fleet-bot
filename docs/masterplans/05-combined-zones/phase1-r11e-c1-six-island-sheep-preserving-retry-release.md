# Combined Zones CZ-R11E retry: six sheep-preserving C1 islands

**Status:** FAILED_CLOSED_DURING_EXECUTION_COMPENSATED_RECOVERY_INDEPENDENTLY_ACCEPTED_SUPERSEDED_BY_RETRY_V2  
**Release node:** CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR  
**Canonical owner:** C1-HIGHWAY  
**Manifest identity:** `ee02b1db8daef2c558b879f7a59a790e086016bf42b155a319b2766c1eb7693d`  
**Manifest full-file SHA-256:** `5b51b90ba542c9584d4e4a77fbc32d891a5d82970df2a9444187af72aa781aa9`  
**Offline-QA payload:** `b1e196e2ceaa3db15e2d7c01f3f0e0a80a03d4353767d9bcd07fadc7edc602d2`

## Why the retry is narrower

The first R11E wrapper attempt stopped during its same-moment live-entity gate
before any forward execution. Its immutable ledger is
`data/world-review/combined-zones-r11e-live-20260821T200417Z/evidence-ledger.json`
(SHA-256
`7d0da4ded0d5eb0d33ec1f5fc088d1431718e59ac4def3296a7bf95e05f4068c`).
The exact entity report is `live-entity-clearance.json` in the same directory
(SHA-256
`e030bb9480b91e1e43af377520f0eafacddf01a84747f0c5cc2b7c90a787c125`).

One unfenced sheep moved 0.136 blocks between the immutable saved-world source
and the live gate, crossing the original point-derived exclusion boundary. The
gate found it at `(1516.5143123259859,67,-208.05567839009402)` within the
safety halo of target `(1517,66,-210)`. Its exact UUID is
`[-800716013,1708605796,-1711767836,-294245824]`; NBT identity capture passed.
Two additional sheep occupy the same outer-shoulder interface around stations
1170 through 1177.

No finite point buffer can prove permanent containment for unfenced roaming
animals. The retry therefore performs no relocation and omits the complete
station 1142 through 1183 island, both of its packages, and all 2,389 proposed
target cells. This is a scope-local preservation hold, not authorization to
clear the animals later.

## Retained physical scope

The retry reuses ten already frozen operation files byte-for-byte. It owns
1,593 exact reversible cells across six independent at-grade islands:

- stations 548 through 551: 311 cells;
- stations 564 through 569: 356 cells;
- stations 606 through 608: 234 cells;
- stations 627 through 632: 422 cells;
- station 792: 107 cells; and
- stations 1213 through 1215: 163 cells.

Each island retains one connected pavement surface. The batch target-set
SHA-256 is
`bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042`.
The minimum distance from any of the three frozen sheep positions to a
selected target is 46.244 blocks. A fresh same-moment live-entity gate remains
mandatory because the compiler does not infer future animal movement.

The wet/source-physics ranges 952 through 1139 and 1189 through 1206 remain
untouched local holds. Every authored cut, embankment, bridge, tunnel, and
hydraulic treatment remains held. The six islands are useful physical
progress, but the manifest makes no connectivity or commissioning claim
across any intervening hold.

## Source and artifacts

The retry binds the prepare-only immutable source
`data/worldsnap-combined-zones-r11e-source-20260821T200417Z`, complete-save
SHA-256
`d53c3ff0039ce4b36a435dece8ede0002678a4fb34c6e00cbeb3e6ff0299e712`
and region SHA-256
`af9e6bd1c5221a7612f0195e3cedbcccceaf1af4befe9715ceebde43574ce648`.
The stopped wrapper contains zero `forward-execution:*` stages.

- Compiler:
  `scripts/compile_combined_zones_r11e_retry_c1_six_island_batch.mjs`
- Manifest:
  `data/buildops/combined-zones-r11e-retry-c1-six-island-sheep-preserving-batch.release-manifest.json`
- Independent QA:
  `scripts/qa_combined_zones_r11e_retry_c1_six_island_batch_offline.mjs`
- Offline evidence:
  `data/world-review/combined-zones-r11e-retry-offline-20260821T202500Z`
- Focused regression:
  `test/build/combinedZonesR11ERetryC1SixIslandSheepPreservingBatch.test.ts`

The manifest deliberately references the ten unchanged R11E operation pairs
instead of creating visually similar copies. The failed ledger and entity
report bind those exact full-file hashes, and the retry manifest selects only
the ten packages whose failed-attempt live entity checks passed.

## Offline acceptance

- independent source/inverse/geometry/sheep QA: PASS, 1,593/1,593;
- exact manifest QA: PASS, ten packages, 1,593 unique cells, zero overlap;
- fresh prepare-source forward preflights: PASS, 1,593/1,593;
- projected rollback preflights: PASS, 1,593/1,593;
- forward and rollback strict-noop parsing: PASS, 3,186 guarded operations,
  zero unexpected no-ops and zero WorldEdit leftovers;
- block-entity audit: PASS, zero blockers;
- failed-attempt live entity evidence: PASS for every selected package;
- scoped wrapper `--print-plan`: PASS, ten packages and no global gate;
- focused compiler/QA/wrapper regression: 5/5 PASS; backend TypeScript build:
  PASS; and
- no live call, service mutation, or world edit during retry compilation and
  offline verification.

Regenerate and run the focused regression with:

```bash
node scripts/compile_combined_zones_r11e_retry_c1_six_island_batch.mjs
node scripts/qa_combined_zones_r11e_retry_c1_six_island_batch_offline.mjs
npx vitest run test/build/combinedZonesR11ERetryC1SixIslandSheepPreservingBatch.test.ts
```

Live use must go through `scripts/run_combined_zones_scoped_release.mjs` under
release node `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`. A new complete-save
source, exact source preflights, block-entity audit, same-moment entity gate,
journaled strict-noop execution, immutable post snapshot, and rollback
post-state preflights remain mandatory.

## Retry-v1 execution and accepted recovery

The retry-v1 live wrapper at `2026-08-21T23:05:54Z` stopped at operation line
248 of `c1-island-564-569-pavement`. Source dirt at `(968,102,27)` had
naturally spread to `minecraft:grass_block[snowy=false]` after the immutable
capture, so strict-noop correctly failed closed. The wrapper compensated every
changed group. Its immutable terminal ledger is
`data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/evidence-ledger.json`
(SHA-256
`f520aa966e064901062d034f8a89d08ec1c9c5bf30765580c354eb7aa19acadb`)
and remains `ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW` as
historical evidence.

The independent recovery audit compares all 1,593 targets and the complete
8,348-cell one-block 3-D interaction halo between the source and compensated
recovery snapshots. It proves 1,592 exact source-restored targets, zero
residual forward desired states, and exactly two benign lifecycle changes:

- target `(968,102,27)`: dirt to grass, the exact failed guard; and
- halo-only `(937,99,39)`: grass to dirt beneath unchanged opaque
  `minecraft:stone_bricks` at `(937,100,39)`.

The recovery acceptance is
`data/world-review/combined-zones-r11e-retry-live-20260821T230554Z/r11e-retry-recovery-acceptance.json`
(SHA-256
`64d7e6b4b4894d50820336453c428f068c3527714a0da16b95d07e0a3a01f5dd`,
payload identity
`4c43f50ae5c85723c0e2f0d8ad490df1549d29c157185b9bcc3907aab7cd958e`).
It does not rewrite the wrapper ledger or claim the two snapshots are
byte-identical. Retry-v1 is not an executable input after this acceptance;
use only the distinct retry-v2 manifest documented separately.
