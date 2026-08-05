# Raven Rock / Site R — Retroactive Area Masterplan

**Plan date:** 2026-08-05
**Plan class:** retroactive, evidence-led area plan
**World:** `world`
**Authority:** planning and documentation only; this file authorizes no Minecraft, RCON, database, service, or configuration mutation.

## 1. Executive intent

Preserve Raven Rock as a coherent underground destination, finish the public-route and life-safety evidence that remains incomplete, and keep its relationship with the surface build explicit. The area is already substantially built and cataloged. This plan therefore starts from the accepted world record rather than replaying the original construction brief.

The most important interpretive constraint remains unchanged: the Minecraft interior is an openly labeled **creative approximation**. Public facts establish the real facility's broad history and setting; the in-world geometry is not presented as a real floor plan.

## 2. Evidence authority and reconciliation

Use this precedence when records disagree:

1. accepted immutable post-release transactions and saved-world QA;
2. the current durable `world_features` catalog and its bound scan records;
3. snapshot inventories and route QA;
4. legacy design documents, which describe intent but may predate construction and release.

This matters because [`docs/raven-rock/README.md`](../../raven-rock/README.md) still contains historical “construction not started” language, while the current catalog records **81 complete features** and the accepted Wave 2 release QA records an accepted transaction. That old status is retained as provenance, not current truth.

## 3. Area scope, bounds, and anchors

North is `-Z`; bounds are inclusive unless a source says otherwise.

| Scope | Bounds / point | Evidence state |
|---|---|---|
| District reservation | `X -300..300`, `Z -300..300` | Cataloged district envelope; a creative build boundary, not a survey of the real facility |
| Audited occupied structures | `X -170..207`, `Y -14..67`, `Z -32..115` | Derived from the saved-world interior scan bounds |
| RR-B1 Command & Operations | `X -50..-10`, `Z -32..2`; entrance `(-30,-7,3)` | Built/cataloged complete |
| RR-B2 Signal & Communications | `X 22..54`, `Z -30..0`; entrance `(22,-7,-15)` | Built/cataloged complete |
| RR-B3 Quarters, Dining & Medical | `X -18..18`, `Z 85..115`; entrance `(0,-5,85)` | Built/cataloged complete |
| RR-B4 Power & Ventilation | `X -170..-130`, `Z -24..4`; entrance `(-130,-13,-10)` | Built/cataloged complete |
| RR-Z5 surface access shaft | `X 193..207`, `Z -22..-8`; surface entrance `(194,65,-15)` | Built/cataloged complete; observed stair system spans the underground-to-surface stack |

The broad district envelope also includes the authored portals and tunnel approaches. It must not be interpreted as proof that every cell in the 600×600 square is developed.

### Map and visual evidence

- [Current catalog overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/02-raven-rock-overview.png)
- [Underground network map](../../redevelopment/2026-07-28-underground-navigation/maps/03-raven-rock-network.png)
- [Raven Rock active-complex section](../../../data/exports/box/atlas-2026-07-26/team-c/07-raven-rock-active-complex.png)
- [RR-Z5 floorplan](../../redevelopment/2026-07-28-underground-navigation/screenshots/raven-rock-z5-floorplan.png)
- [Accepted Wave 2 T2b after view](../../../data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-east-to-west.png)
- [Accepted Wave 2 T2b section](../../../data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/t2b-section.png)

## 4. Current state

The read-only 2026-08-05 catalog census is:

| Feature class | Count | Catalog status |
|---|---:|---|
| District | 1 | complete |
| Buildings | 5 | complete |
| Rooms | 28 | complete |
| Custom circulation, tunnel, node, and release features | 47 | complete |
| **Total** | **81** | **all cataloged complete** |

The interior scan records five structures, 28 named rooms, no structure relying on ladders for primary circulation, and no empty or under-detailed room. The Wave 2 release QA is `PASS` and accepted two redevelopment packages as a single evidence chain; Raven Rock's imported tunnel inventory is part of that accepted database update.

“Complete” is a durable catalog state. It does **not** by itself prove every tunnel is comfortable, signed, accessible, or currently traversable in both directions. Those quality dimensions remain governed by their own evidence.

## 5. Built, accepted, and still proposed

### Built / accepted evidence

- RR-B1 through RR-B4 and RR-Z5, including their cataloged room programs and internal circulation.
- Ten named tunnel legs, 15 nodes/thresholds, 15 RR-Z5 flight records, and the Wave 2 T2b package are present in the current catalog.
- The T2b dry-section package at `x -145..-136` was accepted through immutable post-release QA. It preserved existing tread and added a legible liner, route band, ceiling rhythm, lighting, and a deliberate dry-side cave window.
- The observed RR-Z5 shaft contains 150 stair blocks, zero ladders, 911 iron bars, and no sampled fluid/gravity hazard in its inventory bounds.

### Proposed / unclosed work

- T2b beyond `x=-136`, including the wet edge at `x=-135`, remains a separately engineered interface.
- C2's wet Cavern C threshold and the water-bearing RR-N6 vicinity require survey-led designs; they are not cleared by the dry T2b package.
- Comfort and bidirectional travel for an RR-Z5 flight and its two landings are not proven merely by the stair census.
- Uniform route identity, advance/confirmation signage, and threshold treatment remain for T1, T2 dogleg, T3, C1, C2, T4, and the unmodified S1 stations.
- Current live walkability and legibility require explicit field evidence; no such claim is inferred from database completion.

## 6. Dependencies and interfaces

| Interface | Rule |
|---|---|
| MainStreet America above | Preserve the legacy vertical separation and the authored rock buffer. RR-Z5 is the deliberate surface crossing and must stay the sole assumed connection unless an exact new interface is approved. |
| RR-Z5 surface head | Coordinate its surface footprint with the surface-area owner before any alteration. Do not treat shaft work as purely underground. |
| Wet tunnel edges | Require exact fluid, gravity, block-entity, headroom, and one-cell-halo evidence from the same immutable snapshot as the design. |
| Cavern thresholds | Preserve existing buildings, authored treads, cave windows, and protected bulkheads. Threshold packages must be independently reversible. |
| World catalog | Keep physical completion separate from walkability, legibility, media coverage, and operational acceptance. |

## 7. Risks and holds

- **Interpretation risk:** every interior coordinate is Minecraft-authored. Disclosure signage and documentation must never imply a real classified layout.
- **Hydrology hold:** T2b's excluded aquifer edge, RR-N6, and C2/Cavern C remain water-sensitive.
- **Route-performance hold:** snapshot support samples are not a substitute for normal-speed bidirectional trials.
- **Vertical-circulation hold:** a ladderless stair is not automatically comfortable or accessible; prove width, headroom, edges, landings, and signs.
- **Cross-area hold:** changes at RR-Z5 or in the upper rock band need a surface-interface review.
- **Release hold:** future construction needs a new same-moment immutable snapshot, exact guarded operations, inverse, entity gate, route QA, matched media, and acceptance record. This masterplan is not that release.

## 8. Phased roadmap

### Phase 0 — Preserve the accepted baseline

Bind a fresh read-only catalog/report to the latest accepted snapshot identity. Inventory any drift without changing the world. Exit when all current feature IDs and accepted-release references resolve.

### Phase 1 — Route truth and interface survey

Survey every remaining route and threshold at a consistent station interval. Record width, headroom, support, fluid adjacency, decision points, and exact interfaces to caverns/buildings. Exit when no route deficiency is represented only by prose.

### Phase 2 — Wet-edge engineering

Design T2b's wet continuation, C2/Cavern C, and RR-N6 as separate bounded packages. Preserve aquifer/bulkhead behavior and fail closed on source drift. Exit only after offline preflight and exact inverse pass.

### Phase 3 — Vertical circulation and life safety

Prove one RR-Z5 flight plus both landings before scaling a treatment. Verify two-block clear width where required by the chosen standard, three-block headroom, edge protection, lighting, and destination signage. Exit with bidirectional route evidence.

### Phase 4 — Network legibility rollout

Apply the proven identity system route by route: public primary, operational secondary, and service/dead-end. Keep intentional cave windows and avoid homogenizing the natural-cavern experience. Exit when every decision node has advance and confirmation information.

### Phase 5 — Acceptance and publication

Run entity, guarded-state, rollback, route, accessibility, and matched-media QA from the terminal immutable snapshot. Import only accepted feature/evidence changes. Refresh the human report and catalog maps without overwriting prior evidence.

## 9. Acceptance criteria

- Zero unexplained catalog/source drift.
- Every modified cell source-guarded; complete exact inverse passes against terminal state.
- Zero new unreviewed connection through the rock buffer or to another underground network.
- Wet interfaces pass closed-basin/flow and neighbor-fluid checks appropriate to their design.
- Every public route passes normal-speed travel in both directions with destination legibility.
- RR-Z5 evidence covers full flight/landing behavior, not just block counts.
- Matched before/after maps and screenshots bind exact objects and snapshots.
- Public-facing material retains the creative-approximation disclosure.

## 10. Evidence provenance

Primary local evidence used for this retroactive plan:

- `data/world-map.db`, opened read-only on 2026-08-05: 81 Raven Rock features; current class/status/bounds and scan bindings.
- [`ravenrock-wave2-tunnel-inventory-prerelease-2026-07-28.json`](../../../data/world-review/ravenrock-wave2-tunnel-inventory-prerelease-2026-07-28.json): route, node, wet-edge, and RR-Z5 census.
- [`redevelopment-wave2-post-release-qa-2026-07-28.json`](../../../data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json): accepted post-release evidence chain.
- [`ravenrock-tunnel-wave2-engineering.md`](../../redevelopment/2026-07-28-wave2/ravenrock-tunnel-wave2-engineering.md): package intent, rejected boundaries, and remaining work.
- [`active-interior-register-2026-07-27.json`](../../../data/world-review/active-interior-register-2026-07-27.json) and [`worldwide-interior-programs-2026-07-27.json`](../../../data/world-review/worldwide-interior-programs-2026-07-27.json): structure/room authority.
- [`docs/raven-rock`](../../raven-rock/README.md): historical evidence discipline and authored spatial intent.

**Derived/inferred in this plan:** the “audited occupied structures” envelope is the saved-world scan bound, not the district envelope; the five roadmap phases synthesize unresolved items from the inventory and accepted-release rules; prioritization is planning judgment. No new coordinate, media-object relationship, completion state, or execution authority was invented.
