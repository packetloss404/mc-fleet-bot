# Combined Zones shipwreck best-choice analysis

Generated: 2026-08-06T04:20:00Z

Status: **PASS_BEST_CHOICE_PRESERVE_AND_LOCAL_P1_B10_RESHAPE_SELECTED_REMOVAL_FALLBACK_ONLY — READ-ONLY — ZERO OPERATIONS**

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

## Next bounded artifact

compile bounded positive-margin alternatives and the minimum local P1-B10 toe/no-build reshape; regenerate construction, interaction, influence, and support evidence from the source geometry and require zero core-plus-margin overlap.

The reshape compiler must compare bounded positive-margin choices, minimize lost mountain volume, regenerate construction/interaction/influence/support from source, and fail unless the core-plus-margin overlap is exactly zero.

No geometry was emitted, no server was started, no live world was contacted, and no command or operation was generated.

Analysis payload SHA-256: `a61881f799a758e73e5ab65857ca0ee7f4bc0e989c9e3005e25af4bc6242c4b0`

Report identity SHA-256: `7b2250a719db9efd20b00e8adfb1b2ace37d63a4ce2ff48a8c0d85dc12bc7b95`
