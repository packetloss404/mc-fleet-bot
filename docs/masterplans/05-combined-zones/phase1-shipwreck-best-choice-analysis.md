# Combined Zones shipwreck best-choice analysis

Generated: 2026-08-06T04:50:00Z

Status: **PASS_BEST_CHOICE_AND_EXACT_MINIMUM_SOUTH_OPEN_RESHAPE_COMPILED_REMOVAL_FALLBACK_ONLY — READ-ONLY — ZERO OPERATIONS**

## Decision

**Preserve the shipwreck and locally reshape P1-B10.** The exact conflict is only **126 cells** in `P1-B10/influence`; construction and interaction have **zero** shipwreck overlaps. The influence set is an unaccepted external-shell/support-gap reservation, not an expert physical kernel.

The construction compiler already withholds **1,977** protected-relic fill cells. The correct next move is to change the local FM-01 geometry/support demand and regenerate every derived domain—not merely delete 126 ledger entries.

## Alternative comparison

| Rank | Alternative | Score | Eligible | Physical candidate cells |
|---:|---|---:|---|---:|
| 1 | Preserve and reshape locally | 94/100 | YES | 0 |
| 2 | Subtract the overlap from influence only | 70/100 | NO | 0 |
| 3 | Take no action | 58/100 | NO | 0 |
| 4 | Remove all attributed shipwreck fabric | 34/100 | NO | 598 |

The influence-only subtraction is rejected because the source support-gap treatment is still null; removing its evidence would manufacture clearance. No-change is safe but cannot advance G06. Full removal is fallback-only: it introduces 598 candidate edits and three unknown loot inventories, while the generated-start record remains evidence even after fabric removal.

## Exact reshape optimization

The optimizer read the accepted immutable complete save directly and reproduced the current P1-B10 construction, interaction, influence, and support hashes before testing **12** combinations: three topology strategies at positive planning margins of 1–4 blocks.

The selected **south-open no-build corridor** uses a one-cell planning margin plus one cell for the external six-face interaction shell. Its 2,432 current-state preservation columns reach the south mountain exterior. It removes 83,729 candidate-added-solid cells and 13,604 support-gap cells from the source model. Regenerated construction, interaction, support, and influence all have **exact zero overlap** with the core plus selected planning margin. B08, B09, the summit column, and construction-column connectivity remain unchanged.

An enclosed pocket was rejected because it would bury the relic in a future access/drainage trap. A broad south-toe setback passed geometry gates but discarded more mountain volume. The one-cell margin remains planning-only; expert positive-margin acceptance and canonical D05/G03/G06 integration are still HOLD.

## Next integrated closure

consume the selected sparse south-open reshape in one integrated canonical D05/G03/G06/ownership/interface closure run; retain the one-cell margin as planning-only until expert review accepts it.

Exact sparse planning geometry was emitted. No server process was queried or started, no live world was contacted, and no block command, inventory move, operation, or release authorization was generated.

Analysis payload SHA-256: `ec0316707e250ccb4d1067776becd0cb6e1d99848e56045a7443a8bd3245a397`

Report identity SHA-256: `d876412fcb335e672aa929ca9f2a7b42e60492dd35f5bd39d7ef570117371d0b`
