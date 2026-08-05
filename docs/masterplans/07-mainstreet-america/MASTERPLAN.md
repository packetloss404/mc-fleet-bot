# MainStreet America — Retroactive Masterplan

**Plan ID:** `07-mainstreet-america`
**Durable catalog project:** `mainstreet-america`
**World:** `world`
**Plan posture:** accepted as-built campus, protected by evidence; future work is maintenance or separately approved redevelopment
**Evidence cutoff:** repository evidence available 2026-08-05; no live-world survey was performed for this plan

## 1. Purpose and evidence discipline

This masterplan consolidates the current repository authority for MainStreet America after multiple design, construction, repair, interior, and redevelopment waves. The detailed historical planning set remains authoritative for design provenance; this file is the concise control layer for future agents.

Labels:

- **Cataloged** — durable `world_features` fact.
- **Accepted as-built** — supported by a committed release/QA record.
- **Historical design** — documents intent or reconstruction choices, including superseded geometry.
- **Derived** — computed from cataloged values.
- **Proposed** — future work, not accepted or built.
- **Hold** — evidence or authority required before mutation.

The reconstructed site's exact Minecraft coordinates and architectural appearance are creative approximations. The source project documents the real attraction's verified program separately from those build choices. See the [project evidence orientation](../../mainstreet-america/README.md).

## 2. Scope, bounds, and coordinate rules

### Canonical property envelope

The durable `SITE` feature defines the protected planning envelope:

- X `-300..300`
- Y `62..319`
- Z `-300..300`
- world `world`
- coordinate convention: X east/west, Z south/north
- principal build entrance on the south (`+Z`) side

The catalog union extends to X `-305..305`, Z `-305..311.5`. **Derived explanation:** the extra extent includes the retired outer fence and the south-arrival carriage, not a redefinition of the protected property envelope. The `F01` outer campus fence is explicitly `removed`; its successor boundary objects carry physical ownership.

The mountain subdomain is cataloged/documented at X `90..294`, Z `70..240`, below Y `62`. Future work must preserve the public/private relationship between surface operations, the underground complex, and the wider PassageWay/Raven Rock system.

## 3. Human-readable map

![MainStreet America overview generated from the accepted catalog](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/01-mainstreet-america-overview.png)

Additional accepted visual evidence:

- [Final campus map](../../mainstreet-america/qa/msa-final-campus-map.png)
- [Final south arrival](../../mainstreet-america/qa/msa-final-arrival.png)
- [Final surface and grid audit](../../mainstreet-america/qa/msa-final-surface-and-grid-audit.png)

## 4. Current durable state

Read-only census of `data/world-map.db` on 2026-08-05:

| Measure | Count |
|---|---:|
| Total durable features | 631 |
| Complete | 630 |
| Removed | 1 (`F01`, retired outer fence) |
| Buildings | 32 |
| Rooms | 126 |
| Parking objects | 237 |
| Roads | 23 |
| Districts | 13 |
| Landmarks | 32 |
| Lighting objects | 55 |
| Custom objects | 65 |
| Fences | 14 |
| Landscapes | 13 |
| Sidewalks | 12 |
| Driveways | 6 |
| Utilities | 2 |
| Property records | 1 |

The repository project front door records physical build closure and operational deployment verified on 2026-07-26, with 96/96 material audit checks and bidirectional connectivity to the public mountain complex, surface hangar, heliport, lower operations, private rooms, shelter, and vault levels. Later redevelopment and Wave 2 evidence add guarded public-realm, portal, road, and R08 work. These are historical accepted records, not a live-state check performed for this masterplan.

## 5. As-built spatial framework

### Arrival and visitor campus

| Anchor | Exact catalog bounds / point | State |
|---|---|---|
| `DIV-A01` Arrival and Visitor Campus | X `-135..135`, Z `75..305` | complete |
| `P01-SOUTH-ARRIVAL-CARRIAGE` | X `-6.5..6.5`, Z `261.5..311.5` | complete |
| `B01` Guest & Design Center | X `-72..72`, Z `90..165` | complete |
| `P01` parking program | 236 modeled bays documented by the project front door | complete |
| `L02` entrance monument | point X `95`, Z `272` | complete |

### Central homes, civic, and service grid

- Main Street `R01`: X `-4.5..4.5`, Z `-294.5..289.5`.
- West Lane `R02`: X `-83.5..-80.5`, Z `-219.5..85.5`.
- East Avenue `R03`: X `81.5..86.5`, Z `-220.5..72.5`.
- Cross streets `R04..R08`, rear alleys, house-specific garage links, and route landmarks create the accepted local circulation hierarchy.
- Twelve named homes `H01..H12`, six infill homes `C02..C07`, the Culinary Pavilion `B02`, Service Warehouse `B03`, Design Lab / Maker Commons, and Neighborhood Clubhouse are cataloged complete.
- `PRJ-L01` reserves the detention pond and ecology walk at X `160..220`, Z `-280..-220`.

### East mountain and secure complex

| Anchor | Exact catalog bounds | State |
|---|---|---|
| `C01` Earth-covered east operations complex | X `100..300`, Z `70..235` | complete |
| `C01-PUBLIC-ENTRY` | X `90..130`, Z `171..205` | complete |
| recessed public portal phase 2 | X `139..147`, Z `163..201` | complete |
| `HGR-S01` surface hangar | X `176..234`, Z `138..181` | complete |
| `OBS-S01` roof observatory | X `175..235`, Z `137..182` | complete |
| `SHL-S01` private shelter | X `148..188`, Z `143..180` | complete |
| `VLT-G01` grand treasury vault | X `230..262`, Z `184..226` | complete |

The apparent overlap between these two-dimensional bounds reflects a vertically stacked complex. It is not evidence of duplicate physical ownership. Any future compiler must use exact three-dimensional cells and existing owner/interface contracts.

## 6. Built versus proposed

| Domain | Accepted / cataloged | Proposed future control |
|---|---|---|
| Site hierarchy | SITE, 13 districts, successor boundary objects | Periodic hierarchy audit; keep the removed F01 record historical |
| Roads and arrival | Connected R01–R08/local network, arrival, parking, alleys and garages | Repeat route/lighting/accessibility regression on a new immutable snapshot |
| Buildings/interiors | 32 buildings and 126 rooms cataloged; multiple interior QA waves | Condition survey and defect-only maintenance; no blanket refit |
| Mountain complex | Public portal, operations, hangar, observatory, residence, shelter, vault | Preserve vertical/public/private interfaces; survey before any expansion |
| Media | Campus maps, QA captures, object views, floorplans | Add same-camera condition views for future maintenance releases |
| Historical fidelity | Program and roster evidence separated from creative reconstruction | Maintain confidence labels whenever visitor interpretation changes |

Nothing in the proposed column is construction authority.

## 7. Dependencies and interfaces

### PassageWay / Raven Rock

MainStreet has multiple underground and mountain interfaces. PassageWay is the proper name of the shared underground tunnel system. Future work must distinguish MainStreet-owned rooms and portals from shared route infrastructure and must not infer ownership from overlapping X/Z rectangles.

### Regional roads and Westlight

R08 and its `WESTLIGHT VENUE` directory establish regional wayfinding. Any extension beyond the SITE envelope must use exact endpoint/interface contracts with the approach road, Westlight, and Town Expansion scopes. A sign or route name is not physical ownership.

### Town Expansion

Town Expansion introduced additional regional and underground programs, including MainStreet-related dry-complex and portal scopes. Those later modules remain separately cataloged/released unless a reviewed migration explicitly assigns exact cells. The global cross-scope gate is the ownership reference for later packages, not permission to collapse their publication identities into this project.

### WorldGuard and operations

Historical docs describe protection state at different dates. Before future work, inspect the current committed config and server state through an explicitly authorized workflow. Do not assume historical operator membership, plugin availability, or live flags are unchanged.

## 8. Risks and holds

| Hold | Concern | Release condition |
|---|---|---|
| `MSA-H01` live condition not surveyed | Last accepted snapshots are historical | New immutable saved-world census and condition report |
| `MSA-H02` superseded plans coexist | Early site-plan coordinates and operational notes can conflict with as-built records | Use durable catalog + latest accepted QA; mark historical geometry explicitly |
| `MSA-H03` stacked ownership complexity | X/Z overlaps do not prove collision or owner | Exact 3D owner and interface audit for every proposed target |
| `MSA-H04` external route dependencies | PassageWay, Raven Rock, Westlight, and regional roads have separate owners | Exact interface contracts and bidirectional end-to-end QA |
| `MSA-H05` maintenance versus redesign | A catalog `complete` asset must not be casually rebuilt | Evidence-backed defect register and scope-specific owner approval |
| `MSA-H06` current protection state | Historical WorldGuard/bot notes may be stale | Authorized read-only configuration verification before release design |

## 9. Phased roadmap

### Phase MSA-0 — Retroactive authority consolidation (complete for planning)

- Treat the durable SITE feature as the canonical property envelope.
- Treat current catalog/accepted QA as as-built authority over superseded design coordinates.
- Preserve confidence labeling for real-world facts versus Minecraft reconstruction choices.

### Phase MSA-1 — Read-only condition refresh (next)

- Bind a fresh complete saved-world snapshot.
- Re-run feature census, material/condition checks, route graphs, parking/accessibility checks, and portal/vertical-circulation checks.
- Produce a delta against the latest accepted immutable snapshot; do not treat normal changes as defects without review.

### Phase MSA-2 — Interface and maintenance design

- Assign exact 3D owner and interface contracts for every candidate repair.
- Separate preservation, defect repair, accessibility upgrade, interpretation, and new construction into distinct packets.
- Require matched before views, exact source guards, entity/container protections, and exact rollback.

### Phase MSA-3 — Review and guarded release (authority required)

- Present human-readable plan, sections, visual simulations, route impacts, target hashes, preflight, rollback, and QA matrix.
- Run strict-noop parser and complete source-state preflight.
- Execute no physical change without explicit release authority.

### Phase MSA-4 — Acceptance and publication

- Bind post-state and rollback proof to immutable snapshot identities.
- Re-run routes, life safety, accessibility, materials, lighting, interiors, parking, and boundary tests.
- Import only proven as-built changes, preserve prior scans, refresh maps/media, and update this plan.

## 10. Evidence provenance

Primary local sources:

- [`data/world-map.db`](../../../data/world-map.db), opened read-only with `better-sqlite3`; queried `world_features` and `world_scans` where `project_id = 'mainstreet-america'`.
- [MainStreet America project front door](../../mainstreet-america/README.md), including evidence-confidence rules and accepted state summary.
- [Master site-plan history](../../mainstreet-america/planning/site-plan.md), used as historical design context; its superseded passages are not elevated over as-built records.
- [Final QA narrative](../../mainstreet-america/qa/qa-report.md), [as-built survey](../../mainstreet-america/qa/as-built-survey.md), and [closure audit](../../mainstreet-america/qa/audit-closure-2026-07-26.json).
- [As-built redevelopment completion record](../../redevelopment/2026-07-27/as-built-release-completion.md) and [post-deployment machine QA](../../../data/world-review/redevelopment-post-deployment-qa-2026-07-27.json).
- [Wave 2 catalog overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/01-mainstreet-america-overview.png) plus the three linked QA images above.

**Derived information:** feature counts, catalog union, and the explanation of property-versus-union bounds are read-only calculations from the database. Dependency text is conservative interpretation of committed route and cross-scope evidence. No live server, internet source, fleet API, systemd service, RCON session, or database write was used.
