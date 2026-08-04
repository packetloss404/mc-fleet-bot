# Combined Complex Authority Reconciliation

Status: **RECONCILED FOR DETAILED DESIGN — NOT A CONSTRUCTION OR WORLD-EDIT AUTHORIZATION**

## The authority chain

The planning model is compositional, not one undifferentiated precedence list:

```text
01 Cheyenne internals ─┐
02 SubTropolis internals ├─> 04 normalized Combined Complex ─> 05 current-world placement
03 Houston internals ───┘
```

- Masterplans 01–03 own internal architecture within their respective programs.
- Masterplan 04 owns the normalized composition: local anchors, relationships, public shaft, service/contact sequence, continuous mountain, and visitor narrative.
- Masterplan 05 owns placement in the accepted current world: the X/Z transform, provisional vanilla-height adaptation, terrain and structure evidence, Gateway Approach, East Corridor, Empty Eight, current-world interfaces, and release gates.
- Immutable snapshots and the durable database own observed physical facts. They may veto a siting proposal; they do not redesign the architecture.

## Canonical sources by field

| Field | Authority |
|---|---|
| Cheyenne internals | `01-cheyenne-mountain-complex/06-contractor/contractor-brief.json` |
| SubTropolis internals | `02-subtropolis/06-contractor/contractor-brief.json` |
| Houston internals | `03-houston-tunnel-system/06-contractor/contractor-brief.json` |
| Normalized 04 composition and local anchors | `04-combined-complex/02-design/site-coordinates.json` and `04-combined-complex/04-contractor/contractor-brief.json` |
| Current-world transform, zones, stops, and interfaces | `05-combined-zones/site-coordinates.json` |
| Terrain, biome, water, cover, and generated structures | the Phase 0 rerun post snapshot and `05-combined-zones/phase0-survey-evidence.json` |
| Current-world build sequence and pending gates | `05-combined-zones/MASTERPLAN.md` |
| Authoritative measured map | `05-combined-zones/maps/current-plus-proposed-phase0-overlay.png` |

All other prose is explanatory or design-development history when it conflicts with this matrix. Renderings are communication assets, never measured geometry.

## Resolved Masterplan 04 geometry

Masterplan 04's normalized local geometry uses north `-Z`, east `+X`, and up `+Y`. The root coordinate registry and root contractor brief control conflicts elsewhere in 04:

- one continuous mountain; no V-shaped ravine;
- granite/limestone contact at local `Y=200`;
- Houston/local origin at `(0,0,0)`;
- public shaft head at `(60,0,-70)`, observation landing at `(60,-50,-70)`, and lower lobby study point at `(60,-100,-100)`;
- SubTropolis envelope `X=-100…100`, `Y=-100…0`, `Z=-300…-100`;
- service start `(-100,0,-300)`, contact `(-40,200,-360)`, and Cheyenne outer portal `(0,200,-420)`;
- Cheyenne envelope `X=-40…40`, `Y=250…400`, `Z=-580…-500`;
- summit `(0,800,-500)`;
- funicular plus summit road return, with no Combined Complex return skybridge.

The `Y=100` values in `design-plan.md`, `development-plan.md`, and `working-plan.md`, and the `Y=400` deliberation value in `discussion-notes.md`, do not control. Those documents remain design-development records. The root registry and contractor brief fix the normalized datum at local `Y=200`.

## Masterplan 04 to Masterplan 05 placement bridge

Masterplan 05 applies the adopted zero-degree, north-aligned top-down transform:

```text
worldX = 2048 + localX
worldZ = -328 + localZ
```

Its provisional same-world vertical study is:

```text
localY <= 0: worldY = 72 + 1.28 × localY
localY >= 0: worldY = 72 + 0.29 × localY
```

The vertical study is inactive for construction. It has no approved block-rounding policy, and exact child geometry has not yet been compiled through it.

| 04 normalized anchor | Local | 05 world study |
|---|---:|---:|
| Houston origin | `(0,0,0)` | `(2048,72,-328)` |
| Public shaft head | `(60,0,-70)` | `(2108,72,-398)` |
| Shaft observation landing | `(60,-50,-70)` | `(2108,8,-398)` |
| Shaft lower lobby | `(60,-100,-100)` | `(2108,-56,-428)` |
| Service start | `(-100,0,-300)` | `(1948,72,-628)` |
| Contact/plaque | `(-40,200,-360)` | `(2008,130,-688)` |
| Cheyenne outer portal | `(0,200,-420)` | `(2048,130,-748)` |
| Cheyenne chamber center | `(0,325,-540)` | `(2048,166.25,-868)` |
| Summit | `(0,800,-500)` | `(2048,304,-828)` |

Masterplan 05 correctly derives Houston, SubTropolis, the continuous mountain, Cheyenne, and summit X/Z envelopes from the normalized 04 geometry. Gateway Approach, the East Corridor, re-sited Grand Avenue, and Empty Eight are 05-owned adapters or additions; they are not transformed child architecture.

## Superseded placement material

The following are retained only for provenance, discarded intent, or future separately named work:

- the complete `01-research/map-integration/`, `02-design/map-integration/`, `03-visuals/**/map-integration/`, and `04-contractor/map-integration/` annexes;
- `build-info-map-integration.json` and `map-integration-report.html`;
- `overhead-map-same-world.png`;
- the separate 1,500×1,500 new-world proposal and portal at the old bot base;
- the 33-schematic duplicate Old Town. Ravensreach remains the canonical current-world Old Town; a schematic museum would require a separately approved Fleet Archive Park;
- the old coastal rail spur and direct data-layer mutations;
- the rejected Masterplan 05 `(2250,-300)`, 90-degree placement and the retired northern Empty Eight location.

The older `05-combined-zones/maps/current-and-proposed-whole-world.*` and the three presentation sheet pairs are unsealed historical diagrams. See `05-combined-zones/maps/README.md`. They cannot override the Phase 0 overlay or current coordinate registry.

## The one plan to develop

The plan to advance is `05-combined-zones/MASTERPLAN.md`, because it is the layer that places the reconciled 04 architecture into the accepted map. Its delivery order controls:

1. Phase 1 — freeze interfaces and civil design;
2. Phase 2 — deep shells first;
3. Phase 3 — surface framework;
4. Phase 4 — fit-out;
5. Phase 5 — transport and commissioning.

This identifies the plan; it does not authorize it. Before any construction compiler can exist, Phase 1 must close the normalized child registry, inclusive-bound/cell-set convention, vertical rounding, service and funicular centerlines, hydrology and protected-relic ownership, exact interfaces, entity/ownership gates, forward and rollback operations, and separate user authorization.
