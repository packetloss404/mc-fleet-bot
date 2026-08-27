# MP05 B07 fluid topology extension 01

**Status:** `SOURCE_BOUND_EXTENDED_FLUID_TOPOLOGY_HELD_NO_RECEIVER_OR_ISOLATION_AUTHORITY`  
**Immutable source:** `data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z` (capture `combined-zones-155f6217e7034843ba5a3946b23e4605`)  
**Machine findings:** [JSON](../../../data/world-review/mp05-b07-fluid-topology-extension-02-mp06-post-20260826T143902Z/fluid-topology-extension-findings.json)

This is a **read-only** hydrology/source-topology package. It made no live, capture, RCON, construction, or operation call. A mapped fluid boundary or dry solid neighbour is not a receiver, liner, ownership assignment, or permission to alter the world.

## Extended source maps

- [Horizontal component-density map](../../../data/world-review/mp05-b07-fluid-topology-extension-02-mp06-post-20260826T143902Z/b07-extended-fluid-component-plan.svg)
- [East/west section at z=-398](../../../data/world-review/mp05-b07-fluid-topology-extension-02-mp06-post-20260826T143902Z/b07-extended-fluid-component-section-z398.svg)
- [North/south section at x=2107](../../../data/world-review/mp05-b07-fluid-topology-extension-02-mp06-post-20260826T143902Z/b07-extended-fluid-component-section-x2107.svg)

## Connected-component result

The 89 immediate B07 interaction-fluid seeds reproduce the earlier **4,766-cell** component exactly inside its first diagnostic envelope. The larger trace observed **125,000** connected fluid-bearing cells across `x=2048..2303`, `y=-64..127`, and `z=-640..-256` (coordinate set SHA-256 `ed6cc972538aab0c436c0e5204eefa6d70fe8c586b86d82f6617d94af8c6d79f`). It added **120,234** observed cells.

The trace disposition is **`CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE`**. It has 0 component cells on the explicit survey boundary, reached the 125,000-cell safety cap, and left 1,789 cap-frontier cells unexpanded. This is therefore an incomplete topology observation, not a finite body of water.

## Water states and interfaces

The extended component contains **115 waterlogged** cells and **452 bubble-column** cells. Any future design must preserve or explicitly model those block states; treating only ordinary water as the fluid would be an incomplete source/rollback model.

The current source exposes 160 observed non-fluid faces from B07 interaction-fluid cells. Of those, 132 abut solid, non-gravity material, and 132 survive the conservative block-entity geometry exclusion. They are **potential geometry observations only**. No one is selected as an isolation surface, because the component itself is incomplete and those cells have no accepted owner/counterpart contract.

## Why a containment receiver remains impossible

- The connected component still reaches the finite trace boundary; 0 observed non-fluid faces originate at that unknown continuation boundary.
- OWN-B07 is an unaccepted proposal, while the receiver counterpart is still null/default-deny.
- No directed source → treatment → receiver → overflow/failure state graph, storage/freeboard calculation, or exact inverse exists.
- Waterlogged and bubble-column states need explicit forward and reverse treatment, not a generic “water” replacement.
- R07J’s accepted 49-cell upward cap remains closed. This survey does not reopen or repurpose it.

## Disposition

No B07 fluid isolation, liner, receiver, displacement, cap removal, excavation, or route-opening package is releaseable from this record. The next design input is either full topology closure through a larger current snapshot survey or an exact independently sealed boundary with accepted ownership and the complete directed receiver/overflow/rollback contract.
