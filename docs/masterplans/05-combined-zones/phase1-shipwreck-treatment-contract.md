# Combined Zones Phase 1 shipwreck treatment contract

Generated: 2026-08-06T04:05:00Z

Status: **PARTIAL_PASS_EXACT_598_FABRIC_TARGET_CANDIDATE_AND_AIR_MAPPING_THREE_LOOT_CHESTS_UNMATERIALIZED_TECHNICAL_AND_RELEASE_HOLD — READ-ONLY — ZERO OPERATIONS**

The exact GS-037 envelope is partitioned from the accepted complete save. The compiler classifies **598** chest/dark-oak/spruce cells as the shipwreck-fabric removal candidate, while preserving **515 packed-ice**, **5 snow**, and **1,150 air** cells. Unexpected material fails closed.

## Candidate treatment

Every attributed candidate cell has a source-exact state and a candidate desired state of air. The mapping is complete but **not technically accepted**; it still needs structural, support, gravity, lighting, hydrology, drainage, and neighbor-update review. No removal cell or desired state is accepted.

- Candidate target cells: **598**
- Candidate target coordinate SHA-256: `33e498b16e381872b2a52050561fcbd282441f323de2fe2a2e07a49ef9f29748`
- Candidate desired-state SHA-256: `f71a99a1bf70c6658a8df5e0f82768728728622ad196f6210417757d6265bd5f`
- Attributed six-connected components: **1**; largest **598 cells**

## Chest salvage hold

All three exact chest block-entity projections are preserved. Each chest still carries an unmaterialized shipwreck loot table with zero concrete item records, so the current save does **not** establish the inventory contents and cannot support destructive removal. A later fresh gate must materialize and inventory each chest, bind a controlled destination, and prove custody/capacity/transfer/rollback before any chest block can enter an authorized operation.

- `2075,71,-659` — `minecraft:chests/shipwreck_treasure` — projection `7aeb78b9d2508862548d5fdf851b6ac76d5f91ef826125d48ce81d874dff6d9b`
- `2082,74,-658` — `minecraft:chests/shipwreck_map` — projection `7259f97dd0a09a45cda79b8f1ee1e4b89bfdfc403248242610e5d6ebe04bb75e`
- `2091,74,-657` — `minecraft:chests/shipwreck_supply` — projection `56f4017136675e509c486c9b0bd1a6c80fa527972c1bc60d24cad7453692333b`

## Remaining holds

- independent acceptance of the 598-cell material-attribution candidate
- accepted structural, support, gravity, lighting, hydrology, drainage, and neighbor-update review of the all-air candidate
- materialization and exact inventory of all three loot-table chests plus one accepted controlled salvage destination
- accepted demolition influence, staging, access, settlement, erosion, positive margins, ownership, and interfaces
- fresh entity and POI clearance, guarded forward and exact inverse rollback compilation, independent preflight, and one later release authorization

No server was started, no live world was contacted, no inventory was moved, and no command or operation was generated.

Treatment payload SHA-256: `21fcb8b1ef4b5b652bf3570c3d6359d4c6abe9d0b38ce1f114e764859e3105aa`

Report identity SHA-256: `95d1176229f066aca0538df9395d09a03eaeb6f6333c3dc44b24e65b041e9cd5`
