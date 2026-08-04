# Phase 1 Cheyenne J-curve planning geometry

Status: **PARTIAL PASS — EXACT P1-B03 PLANNING GEOMETRY — TECHNICAL HOLD — ZERO OPERATIONS**

This offline compiler binds the normalized 800-block J-curve intent to the current-world portal and chamber anchors. It produces an exact conservative review recommendation for the owner-delegated selection ledger. It does not create construction ownership, accept a life-safety or drainage design, model the future mountain, or authorize an edit.

## Exact candidate

- Portal: `2048,130,-748`.
- Chamber anchor: `2048,166,-868`.
- Centerline: **800 horizontal steps / 801 points**, two level coarse-radius-10 transitions, hash `fef7a7248504d1f72a103d2cc8d1e3968d268a20d3a6d1799b5d3f2ff0445ee1`.
- Vertical schedule: **36** one-block rises in the first 180 steps; both bends and the final 620 steps are level.
- Cross-section: symmetric 5×4 around a walkable floor datum.
- Excavation reservation: **15,972** cells, hash `82d5fd4e5bdc0f21f2c8b47bfd8d69b4f7f6aa097a641890b02a4c330fc8df15`.
- One-cell face-interaction shell: **14,418** cells.

The route runs east, north, then west, so its parallel approach legs are separated by 120 blocks and no direct portal-to-chamber excavation sightline exists. This retains the inherited two-bend baffle character while fitting the normalized anchors inside the current Z09 envelope and approaching the shared portal from the side opposite B08.

## Collision and interfaces

- Generated structure-start bound intersections: **0**.
- Protected relic-core intersections: **0**.
- Service-portal candidate interface: **20** exact overlap cells.
- Chamber candidate interface: **800** exact overlap cells.

These two overlaps are proposed seams, not accepted owner transfers. All other ownership remains unassigned.

## Remaining HOLDs

P1-B03 remains HOLD pending canonical ownership and directional interface contracts; future-mountain/B10 state; lining/loading; drainage and utilities; accessibility, emergency, and egress design; and independent technical acceptance. Source guards, operations, preflight, execution, rollback, and post-state QA remain deferred to G08-G19.

No live system or world was contacted, no material or operation cell was emitted, and no world edit is authorized.
