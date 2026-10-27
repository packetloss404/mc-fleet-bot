# MP05 B07 +X curtain / overflow measurement 08

**Status:** `SOURCE_BOUND_POSITIVE_X_CURTAIN_NOT_DESIGNABLE_UNTIL_WET_TARGET_COMPONENT_CLOSURE`  
**Current immutable source:** `data/worldsnap-mp05-b07-surface-receiver-descent-east-wall-fixed-lighting-01-post-20260828T041000Z` (capture `combined-zones-b0dfbe8d20b042a9b6fdbb0d16a76300`)  
**Machine record:** [JSON](../../../data/world-review/mp05-b07-positive-x-curtain-measurement-08-post-20260828T041000Z/mp05-b07-positive-x-curtain-measurement-08.json)

![+X curtain measurement map](../../../data/world-review/mp05-b07-positive-x-curtain-measurement-08-post-20260828T041000Z/mp05-b07-positive-x-curtain-measurement-08.svg)

The two bilateral faces are real, but they are not the complete current +X water curtain. The complete source state has **five** B07-to-exterior water crossings: two reach air and three already reach water. Those three exact wet exterior targets are directly connected to B07 water and therefore belong to the same unresolved fluid system.

A full five-cell curtain would have to treat three water cells, not merely fill two air cells. Because the connected component is currently capped out at 125,000 observed cells, no finite source, receiver/overflow, water-displacement, or safe reverse sequence can be declared.

## Narrowest missing measurement

- complete component cell set or exact independently sealed boundary face/cell set
- all source, waterlogged, and bubble-column states on any changed or influence cell
- directed zero-discharge/overflow state graph and capacity/failure disposition
- a bounded water-update envelope proving no new B07-to-exterior crossing appears after the curtain is installed
- reverse ordering that keeps a complete liner/boundary in place until all source water states can be safely restored

This is a measurement/design contract only. It emits no block target, liner, plug, receiver, overflow, route/opening change, public access, egress, operation, or live call.
