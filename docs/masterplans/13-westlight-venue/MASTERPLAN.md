# Westlight Venue — Retroactive Masterplan

**Plan ID:** `13-westlight-venue`
**Durable catalog project:** `westlight-venue`
**World:** `world`
**Plan posture:** accepted venue and focal-display baseline; future work is evidence-bound operations, maintenance, or separately approved expansion
**Evidence cutoff:** repository evidence available 2026-08-05; no live-world survey was performed for this plan

## 1. Scope and authority

Westlight Venue is the stadium/theatre complex, not the surrounding `westlight-district` and not the full Town Expansion Westlight program. This plan consolidates its durable as-built record and establishes controls for future work. It authorizes no live inspection, RCON, database update, or construction.

Evidence labels:

- **Cataloged** — durable `world_features` record.
- **Accepted as-built** — committed release and QA evidence.
- **Derived** — calculated or summarized from exact source facts.
- **Proposed** — future work only.
- **Unknown / hold** — needs new saved-world, route, or operating evidence.

The catalog's `complete` state is historical acceptance. It is not proof that the live venue was re-inspected on 2026-08-05.

## 2. Exact area and vertical stack

The catalog district is `westlight-venue:DISTRICT`, Westlight Theatre / Stadium:

- X `-443..-272`
- Z `-640..-488`
- state `complete`
- confidence `1.0`, completion ratio `1.0`, condition score `100`

| Asset | Exact catalog bounds | Floors / entrance | State |
|---|---|---|---|
| `WL-BOWL` stadium bowl and concourses | X `-429..-291`, Y `55..91`, Z `-629..-491` | floors Y `58, 67, 75, 82`; entrance `(-359, 68, -498)` | complete |
| `WL-THEATRE` below-grade theatre and lobbies | X `-421..-299`, Y `18..50`, Z `-613..-498` | floors Y `18, 29, 40`; entrance `(-354, 68, -498)` | complete |
| `WL-CLUB` members club | X `-417..-400`, Y `35..44`, Z `-566..-550` | floors Y `35, 40`; entrance `(-408, 36, -560)` | complete |
| `WL-INFINITY-SCREEN` four-sided center-hung display | X `-369..-351`, Y `74..92`, Z `-568..-552` | bowl focal object | complete; condition 95 |

The theater, club, and bowl are vertically interrelated within overlapping X/Z bounds. Exact three-dimensional geometry, not a 2D rectangle, governs collision and ownership decisions.

## 3. Venue map and evidence views

![Westlight Venue floor and structure overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/06-westlight-venue-overview.png)

![Accepted screen view — east middle, sports mode](../../../data/exports/redevelopment-qa-2026-07-27/westlight/after/east-middle-sports.png)

The overview is a catalog-derived floorplan. The second image belongs to the accepted 48-view screen matrix and is linked to `WL-INFINITY-SCREEN` in the durable record. Additional matching views:

- [Members club object view](../../../data/exports/redevelopment-media-wave2-2026-07-28/buildings/westlight-venue/wl-club--members-club.png)
- [Westlight underground venue map](../../redevelopment/2026-07-28-underground-navigation/maps/07-westlight-underground-venues.png)

## 4. Current durable state

Read-only `world-map.db` census on 2026-08-05:

| Kind | Count |
|---|---:|
| District | 1 |
| Buildings | 3 |
| Rooms | 18 |
| Circulation/custom objects | 3 |
| Landmark | 1 |
| **Total** | **26** |

All 26 records are `complete`. The older database-and-media report counted 25 because it predated or did not include the first-class focal-display record; the current database contains `WL-INFINITY-SCREEN` as the 26th object.

### Program by level

**Bowl — four cataloged levels:**

- Y58: Field Level; Service Ring.
- Y67: Main Concourse; South Vomitory.
- Y75: Members Terrace; Upper Concourse.
- Y82: Crown Walk; Press Gallery.

**Theatre — three cataloged levels:**

- Y18: Lower Lobby; Backstage Service.
- Y29: Orchestra Lobby; Auditorium Parterre.
- Y40: Upper Lobby; Balcony.

**Members club — two cataloged levels:**

- Y35: Members Lounge; Bar and Dance Floor.
- Y40: Club Landing; Private Balcony.

Each structure has a first-class circulation record identifying stairs, zero primary ladders, and the policy that every occupied floor must have a bidirectional, two-block-headroom stair route.

### Accepted focal-display release

The accepted `VEN-WL-01` package installed the center-hung display and changed 524 exact target cells. The committed completion record reports 524 guarded forward groups, zero failed groups, zero unexpected no-ops, an exact rollback, and 48 post views covering eight sectors at lower/middle/upper positions in sports and concert modes. The display's current durable geometry differs slightly from the design/package envelope; future work must use the cataloged/as-built exact state and accepted release artifacts, not a prose dimension alone.

## 5. Built versus proposed

| Domain | Accepted / cataloged | Proposed future control |
|---|---|---|
| Bowl | Four levels and eight functional room zones | Fresh seat/aisle/vomitory accessibility and egress census |
| Theatre | Three levels and six functional room zones | Event-mode, house-lighting, backstage, and audience-route regression |
| Members club | Two levels and four functional room zones | Public/private/service interface review and condition survey |
| Vertical circulation | Three first-class stair records; ladder count zero | Bind bidirectional route QA to a fresh immutable saved world |
| Focal display | Accepted 524-cell guarded release and 48-view matrix | Re-run sightlines after any seating, stage, lighting, or display change |
| Regional arrival | District and structure entrances cataloged | Exact wayfinding/interface contracts with approach road and Westlight district |

No proposed item is physical-release authority.

## 6. Interfaces and dependencies

### Westlight district

The surrounding district is a separate durable project. Its roads, high street, buildings, and later parks/attractions must retain their own owners. Venue work may share transitions, but may not claim the district through the venue's broad bounds.

### Western approach road

The approach-road catalog ends at Gatehead `(-344, 68, -486)`, close to the venue's north edge. Proximity is not an exact connection contract. A future arrival release must survey the transition and freeze exact shared cells, grade, wayfinding, pedestrian separation, and return route.

### PassageWay and underground navigation

The theatre and members club are below grade and appear in the PassageWay navigation report. PassageWay is the proper name of the shared underground tunnel system. The navigation evidence catalogs the venue stack; it does not transfer tunnel ownership to Westlight Venue.

### Event operations

Sports, concert, and theatre modes have different focal and circulation demands. Any physical or operational change must identify the active mode, field/stage focal point, display content role, audience routes, restricted/service routes, emergency return, lighting, and representative sightline matrix.

## 7. Risks and holds

| Hold | Why it matters | Release condition |
|---|---|---|
| `WLV-H01` current state unknown | Historical accepted records are not a 2026-08-05 inspection | Fresh immutable saved-world census and visual condition survey |
| `WLV-H02` external arrival contract absent here | Gatehead/venue proximity does not prove exact transition cells | Reviewed approach-road / district / venue interface set |
| `WLV-H03` life-safety needs current proof | Room/circulation records show intended state, not present obstructions | Bidirectional stairs, headroom, landings, egress, accessibility, and lighting QA |
| `WLV-H04` mode-sensitive sightlines | New stages, signs, seats, or screens can invalidate the 48-view matrix | Repeat all representative views for every affected mode |
| `WLV-H05` stacked scope collision risk | Theatre, club, bowl, and PassageWay overlap in plan | Exact 3D cell ownership and transition contracts |
| `WLV-H06` scope creep from Town Expansion | Later Westlight attractions/public realm are separate modules | Preserve publication identity; reconcile only explicit exact interfaces |

## 8. Phased roadmap

### Phase WLV-0 — Retroactive baseline (complete for planning)

- Bind the plan to the 26 durable records and accepted focal-display release.
- Preserve exact venue bounds, level schedule, entrances, and first-class circulation objects.
- Keep venue, district, PassageWay, approach-road, and later Town Expansion ownership distinct.

### Phase WLV-1 — Read-only condition and operations survey (next)

- Capture a fresh complete immutable saved-world snapshot.
- Census exact structure shells, rooms, stairs, doors, vomitories, seating/aisles, concessions, barriers, lighting, stage/field objects, screen, utilities, signs, containers/entities, and all external transitions.
- Compare against the accepted snapshots and record defects without mutating the world.

### Phase WLV-2 — Mode and life-safety engineering

- Define sports, concert, and theatre operating layouts.
- Prove public, accessible, service, restricted, and emergency routes in both directions.
- Re-run at least the accepted 8-sector × 3-height × 2-mode screen matrix when sightlines may change; add theatre-specific audience views where relevant.
- Establish exact owner/interface contracts for all candidate cells.

### Phase WLV-3 — Human review and guarded release (authority required)

- Publish maps, sections, event layouts, route graphs, matched visual simulations, exact targets, source-state preflight, rollback, and acceptance matrix.
- Fail closed on overlap, source drift, entity/container risk, route regression, or unexplained no-op.
- Execute nothing without explicit physical-release authority.

### Phase WLV-4 — Acceptance and publication

- Bind final state and inverse to immutable post-snapshot identity.
- Verify exact post-state, rollback, egress/accessibility, event modes, lighting, screen sightlines, regional arrival, and PassageWay transitions.
- Import proven as-built deltas, preserve prior scans, refresh the catalog/media/report set, and update this plan.

## 9. Evidence provenance

Primary local sources:

- [`data/world-map.db`](../../../data/world-map.db), opened read-only with `better-sqlite3`; queried `world_features` where `project_id = 'westlight-venue'`.
- [`active-interior-register-2026-07-27.json`](../../../data/world-review/active-interior-register-2026-07-27.json) and [`worldwide-interior-programs-2026-07-27.json`](../../../data/world-review/worldwide-interior-programs-2026-07-27.json), sources for structures, levels, rooms, and circulation expectations.
- [As-built redevelopment completion](../../redevelopment/2026-07-27/as-built-release-completion.md), [machine QA](../../../data/world-review/redevelopment-post-deployment-qa-2026-07-27.json), and [`westlight-infinity-screen` design report](../../../data/buildops/westlight-infinity-screen-2026-07-27.report.json).
- [Wave 2 catalog overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/06-westlight-venue-overview.png), accepted [screen view](../../../data/exports/redevelopment-qa-2026-07-27/westlight/after/east-middle-sports.png), [members club view](../../../data/exports/redevelopment-media-wave2-2026-07-28/buildings/westlight-venue/wl-club--members-club.png), and [underground map](../../redevelopment/2026-07-28-underground-navigation/maps/07-westlight-underground-venues.png).
- [Infrastructure standards](../../redevelopment/2026-07-27/infrastructure-standards.md), used as the future event/sightline/wayfinding standard, not as proof of current block state.

**Derived information:** current counts, the 25-to-26 explanation, and interface interpretations are read-only summaries. No coordinates, completion, acceptance, or image relationship was invented. No internet source, live server, fleet API, systemd service, RCON session, or database write was used.
