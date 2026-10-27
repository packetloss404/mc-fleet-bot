# MP05 B07 +X component-closure measurement plan 09

**Status:** `SOURCE_BOUND_COMPONENT_CLOSURE_MEASUREMENT_PLAN_REQUIRED_COMPONENT_EXITS_CURRENT_TRACE_SCOPE`  
**Current source:** `data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z` (capture `combined-zones-b0dfbe8d20b042a9b6fdbb0d16a76300`)  
**Machine record:** [JSON](../../../data/world-review/mp05-b07-positive-x-component-closure-measurement-09-post-20260828T041000Z/mp05-b07-positive-x-component-closure-measurement-09.json)

![Component-closure measurement map](../../../data/world-review/mp05-b07-positive-x-component-closure-measurement-09-post-20260828T041000Z/mp05-b07-positive-x-component-closure-measurement-09.svg)

The 500,000-cell trace hit its safety cap. The larger 1,000,000-cell measurement removed the count cap and observed **718,008** cells, but the component still reaches the explicit measurement boundary on +X, −Z, and +Z. This is proof that the component remains beyond the **current trace scope**, not a claim about unmeasured live state.

## Smallest next trace scope

Trace the complete current source across `x=2048..2319`, `y=-64..127`, `z=-656..-241`. It expands only the three observed escape directions, is chunk aligned, covers 442 chunk columns, and adds 2,801,664 measured block positions. Recompute all six faces after the combined shell.

## Five-face water-update measurement envelope

The local reproducible envelope is the full-height nine-column region `x=2096..2143`, `y=-64..319`, `z=-416..-369`. It measures update influence around the exact five current curtain targets, but cannot by itself prove component closure.

- Census every full-height source block state in the nine chunk columns, including waterlogged and bubble-column states, block entities, and saved entities.
- Trace connected fluid from all five curtain source/target pairings within this envelope. If the component touches any envelope face, mark local update topology incomplete; do not infer a zero-discharge curtain.
- In a non-live cloned-world measurement only, bind the exact server/game version and record the entire block-update change set for a hypothetical fully specified curtain. The replay is invalid unless every changed/influence cell is inside a complete component-closure scope.
- Require zero new B07-to-exterior crossings, no interaction-envelope preservation drift, and a reverse sequence that retains a complete barrier until the exact source fluid states can be restored.

No live capture, operation, liner, plug, receiver, overflow, route/opening state, public access, or egress is emitted.
