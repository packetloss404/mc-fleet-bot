# Western Approach Road — Retroactive Masterplan

**Plan ID:** `06-approach-road`
**Durable catalog project:** `approach-road`
**World:** `world`
**Plan posture:** as-built baseline plus controlled maintenance roadmap
**Evidence cutoff:** repository evidence available 2026-08-05; no live-world survey was performed for this plan

## 1. Authority and reading rules

This document retroactively consolidates the durable record for the Western Approach Road. It is a source plan for future AI and engineering work; it does not itself authorize Minecraft, RCON, service, database, or filesystem mutation.

Evidence labels used here:

- **Cataloged** — copied or summarized from a durable `world_features` record.
- **Documented** — stated by a committed manifest, report, or artifact register.
- **Derived** — calculated from cataloged coordinates without adding new geometry.
- **Proposed** — future work, not an as-built or accepted condition.
- **Unknown / hold** — requires new saved-world, route, or field evidence.

The catalog's `complete` status describes the accepted record observed on 2026-07-27. It is not a claim that the live road was re-inspected on 2026-08-05.

## 2. Scope and exact catalog geometry

The project is the regional road connection from Ravensgate toward Westlight. It is not the whole Westlight district, the venue, or every later Town Expansion road package.

| Object | Kind | Exact catalog geometry | Catalog state |
|---|---|---|---|
| `approach-road:DISTRICT` — Western Approach Road | district | X `-352..-148`, Z `-509..-484` | complete, confidence 1.0, completion 1.0, condition 100 |
| `APPROACH-ROAD:PRIMARY` — Ravensgate to Westlight Approach Road | road | seven-block-wide path through six authored points | complete, confidence 1.0, completion 1.0, condition 100 |

Authored centerline points, in route order:

1. Ravensgate interface: `(-148, 68, -500)`
2. Millstone: `(-170, 72, -506)`
3. Panorama: `(-224, 70, -496)`
4. White Bridge: `(-305, 73, -497)`
5. Gatehead approach: `(-322, 68, -497)`
6. Gatehead: `(-344, 68, -486)`

**Derived:** the catalog union is X `-352..-144.5`, Z `-509.5..-482.5`. The half-block road extent comes from the seven-block path width around its centerline. No vertical clearance envelope is cataloged, so this plan does not invent one.

## 3. Map and anchors

![Approach Road overview from the accepted catalog atlas](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/05-approach-road-overview.png)

The five named route anchors stored in the road record are Ravensgate, Millstone, Panorama, White Bridge, and Gatehead. The image above is a generated catalog overview. A matched circulation capture is also available at [Ravensgate-to-Westlight road capture](../../../data/exports/redevelopment-media-wave2-2026-07-28/circulation/approach-road/approach-road-primary--ravensgate-to-westlight-approach-road.png).

## 4. Current as-built record

### Cataloged complete

- The durable catalog contains exactly two `approach-road` features: one district and one road.
- Both were observed at `2026-07-27T03:25:09Z`, carry confidence `1.0`, completion ratio `1.0`, and condition score `100`.
- The road record identifies a seven-block width and six three-dimensional centerline points.
- The active-interior register classifies the area as interior-exempt while calling for review of bridge stairs and grades, stopping bay, lighting and furniture, and a bidirectional road route.
- The catalog's route sequence is `Ravensgate → Millstone → Panorama → White Bridge → Gatehead`.

### Not proven by this retroactive plan

- Current live-world block state or current damage/obstruction condition.
- An exact vertical clearance volume, shoulder envelope, drainage system, right-of-way, or lighting inventory.
- A current bidirectional traversal result bound to a named immutable snapshot.
- Whether later Town Expansion regional-road cells have been imported into this durable project or should remain a separate publication scope.
- Accessibility of every grade transition, bridge stair, lay-by, or pedestrian crossing.

## 5. Built versus proposed

| Domain | Built / cataloged | Proposed future control |
|---|---|---|
| Alignment | Six exact centerline points, width 7 | Freeze an exact road/shoulder/clearance envelope from a fresh saved-world census before any repair |
| Regional role | Ravensgate-to-Westlight connector with five named anchors | Reconcile boundaries and names with the Town Expansion regional approach-road owner |
| Travel | Road is cataloged complete | Repeat bidirectional vehicle/pedestrian route QA against an immutable snapshot |
| Structures | White Bridge and stopping-bay review are named in the active register | Inventory bridge, bay, lighting, barriers, signs, drainage, and furniture as first-class objects |
| Media | Catalog overview and matched road capture exist | Capture repeatable endpoint, bridge, grade, night-lighting, and return-route views |

No item in the proposed column is approved construction.

## 6. Interfaces and dependencies

### Ravensgate / east endpoint

The exact authored endpoint is `(-148, 68, -500)`. Future work must preserve an unobstructed connection and agree on one physical owner for any shared cells. The approach-road project must not repaint or rebuild Ravensgate-owned public realm by broad bounding box.

### Westlight / Gatehead endpoint

The final authored centerline point is `(-344, 68, -486)`. Westlight Venue has a separate durable scope, beginning farther west/south at X `-443..-272`, Z `-640..-488`. A bounding-box proximity is not proof of an exact interface cell set. Survey the transition before changing either project.

### Town Expansion regional approach-road program

The Town Expansion global cross-scope audit assigns several proposed/publication subscopes to the canonical owner `TE-REGIONAL-APPROACH-ROAD`, including `TE-ROAD-01`, `TE-WL-FREIGHT`, `TE-WL-PARKWAY-EXTENSION`, and `TE-PAN-RV01-ROAD`. That audit is evidence of a later ownership model, not evidence that those cells belong to the legacy two-feature `approach-road` catalog record. Reconciliation is required before importing or maintaining them together.

### Preservation and execution

Any future mutation must use snapshot-bound exact-state guards, retain an exact inverse, preserve authored structures and route transitions, and fail closed on source drift. This masterplan supplies neither an operation file nor execution authority.

## 7. Risks and holds

| Hold | Why it matters | Release condition |
|---|---|---|
| `AR-H01` current state unknown | The last catalog observation is historical, not a live survey | Fresh immutable saved-world census and scoped visual review |
| `AR-H02` exact road envelope absent | Centerline plus width is insufficient for safe repair ownership | Exact surface, shoulder, bridge, furniture, and clearance cell sets |
| `AR-H03` regional ownership not reconciled | Town Expansion uses a broader canonical road owner | One reviewed mapping of legacy and later scope, with no duplicate cell owner |
| `AR-H04` route acceptance not snapshot-bound here | A screenshot does not prove both directions or clearance | Automated bidirectional route QA tied to the candidate post snapshot |
| `AR-H05` bridge/stopping-bay/accessibility detail thin | Named review items are not first-class catalog objects | Object census, grades, headroom, lighting, barriers, and landing checks |

These are planning holds for new work. They do not retroactively revoke the catalog's historical `complete` state.

## 8. Phased roadmap

### Phase AR-0 — Baseline preservation (complete for planning)

- Bind this plan to the two durable feature records and their source references.
- Preserve the current named route and exact authored centerline.
- Keep later expansion scopes distinct until reconciled.

### Phase AR-1 — Read-only reconciliation (next)

- Read a fresh immutable region snapshot; do not use live RCON for discovery.
- Extract exact road surface, shoulder, bridge, barriers, stopping bay, furniture, signs, lighting, drainage, and adjacent protected features.
- Compare the six-point legacy alignment with the canonical Town Expansion regional-road model.
- Emit explicit owner and interface contracts for both endpoints and every overlap.

### Phase AR-2 — Mobility and life-safety design

- Define minimum clear width/headroom, grade and landing criteria, pedestrian separation, fall protection, lighting coverage, stopping-bay operation, and emergency return route.
- Design repairs only for evidenced defects.
- Publish a review packet with plan, profiles, sections, exact target sets, and rollback strategy.

### Phase AR-3 — Guarded release (authority required)

- Freeze pre-state snapshot identity, forward and rollback operations, protected interfaces, and entity/container gates.
- Require strict-noop preflight and parser validation.
- Execute only after explicit physical-release authority.

### Phase AR-4 — Acceptance and catalog refresh

- Prove exact post-state and exact rollback against the immutable post snapshot.
- Run bidirectional route, grade/headroom, night-lighting, stopping-bay, and endpoint QA.
- Update durable objects and media without overwriting the prior historical evidence.

## 9. Evidence provenance

Primary local evidence used:

- [`data/world-map.db`](../../../data/world-map.db), opened read-only with `better-sqlite3`; queried `world_features` where `project_id = 'approach-road'`.
- [`active-interior-register-2026-07-27.json`](../../../data/world-review/active-interior-register-2026-07-27.json), source for the district record and review topics.
- [`builds/manifest.yaml`](../../../builds/manifest.yaml), source reference for `APPROACH-ROAD:PRIMARY`.
- [Wave 2 catalog overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/05-approach-road-overview.png).
- [Matched circulation capture](../../../data/exports/redevelopment-media-wave2-2026-07-28/circulation/approach-road/approach-road-primary--ravensgate-to-westlight-approach-road.png), whose SHA-256 is `459e288abc985535ab8d8c10134ef0457c0486cb2394ff4668e7669f6ee6f06d`.
- [Town Expansion global cross-scope audit](../../redevelopment/2026-07-28-town-expansion/town-expansion-global-cross-scope-interface-audit.md), used only to identify the later regional ownership dependency.

**Derived information:** the union bounds and interface commentary are calculations/interpretation from those sources. They are not new surveyed geometry. No internet source, live server, fleet API, systemd service, RCON session, or database write was used.
