# Westlight District — Retrospective Masterplan

Status: **cataloged as-built interior district; stewardship baseline**
Plan type: retrospective source plan for AI and engineering use
Prepared: 2026-08-05 from committed, read-only repository evidence
Physical authority: **none** — no live calls or world mutation are authorized

## Executive decision

The durable `westlight-district` catalog describes a complete interior district of 14 structures and 34 named rooms. Its accepted saved-world census reports 10 multi-floor structures, no primary ladders, no multi-floor structure without stairs, no cave-air exposure, no empty rooms and no under-detailed rooms.

This plan protects that verified interior baseline. It does not claim the adjacent Westlight theatre/stadium, members club, waterfront expansion or the whole Westlight destination; those are separately cataloged or released scopes.

## Scope and coordinate frame

- Project ID: `westlight-district` in `data/world-map.db`.
- World: `world`.
- District record envelope: X `-429..-260`, Z `-556..-445`.
- Snapshot scan bounds: X `-428..-274`, Y `67..108`, Z `-514..-446`.
- Snapshot identity: `4a754a73f5dcd0db512d67e90dcea08ff80d19b6d711c859a0a8d688a4091400`.
- Durable records: 59 — 1 district, 14 buildings, 10 vertical-circulation records and 34 rooms.
- All 59 records are `complete`; the district and structures have completion ratio 1 and condition score 100.

The district envelope and the scan bounds serve different purposes. The envelope is derived from cataloged feature bounds; the scan bounds identify the offline Anvil review volume. Neither is an automatic construction or safe-teleport volume.

![Westlight District structure plan](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/07-westlight-district-overview.png)

_The structure plan is north-up (`-Z`) and labels functional zones. Functional zones may not correspond to physical partition walls._

## As-built structure register

Entries and floor supports come from the active interior register stored in the database. Room counts are derived from its durable room children.

| ID | Structure | Bounds X / Z | Floors | Entrance | Rooms / program |
|---|---|---|---:|---|---|
| `WD-INN` | Beacon Inn | `-428..-408` / `-496..-464` | 6 | `-408,68,-480` | 8: lobby, taproom, guest floor, owner/library and tower rooms |
| `WD-FIELD` | Field House pavilion | `-402..-386` / `-502..-484` | 1 | `-394,68,-484` | 1 pavilion room |
| `WD-SHOP-A` | High Street shop A | `-404..-397` / `-470..-448` | 2 | `-400,68,-470` | Cartographer shop + apartment |
| `WD-SHOP-B` | High Street shop B | `-396..-390` / `-470..-448` | 2 | `-393,68,-470` | Stoneworker shop + apartment |
| `WD-SHOP-C` | High Street shop C | `-389..-383` / `-470..-448` | 2 | `-386,68,-470` | Textile shop + apartment |
| `WD-SHOP-D` | High Street shop D | `-382..-377` / `-470..-448` | 2 | `-379,68,-470` | Smithy shop + apartment |
| `WD-SHOP-E` | High Street shop E | `-373..-366` / `-470..-448` | 2 | `-370,68,-470` | Provisioner shop + apartment |
| `WD-SHOP-F` | High Street shop F | `-365..-359` / `-470..-448` | 2 | `-362,68,-470` | Fletcher shop + apartment |
| `WD-SHOP-G` | High Street shop G | `-358..-353` / `-470..-448` | 2 | `-355,68,-470` | Craft shop + apartment |
| `WD-BREW` | Malt & Lantern brew-barn | `-352..-326` / `-468..-446` | 2 | `-344,68,-468` | Brewhouse, taproom, music loft and tasting room |
| `WD-GATEHEAD` | Gatehead House | `-334..-320` / `-492..-476` | 2 | `-334,68,-484` | Reception, map library, district office and planning room |
| `WD-LANTERN` | Lantern Hall | `-334..-318` / `-514..-500` | 1 | `-326,68,-500` | Lantern Hall |
| `WD-FERRY` | Ferry Bell House | `-316..-302` / `-482..-466` | 1 | `-316,68,-474` | Ferry Bell Room |
| `WD-SKIFF` | Skiff House | `-286..-274` / `-512..-502` | 1 | `-280,68,-502` | Workshop |

Entrance coordinates are cataloged access anchors; they are not landing-safety claims.

## Built versus proposed

### Verified as built in the cataloged snapshot

- All 14 structures have complete, named interior programs.
- All 10 multi-floor structures use stairs as their primary vertical circulation; ladder count is zero.
- All 34 rooms are reported fitted, non-empty and sufficiently detailed by the final census.
- The accepted policies cover enclosure, purpose-specific furnishing, bidirectional two-block-headroom stairs and preservation of containers, fixtures, roads, shells, water containment and protected routes.

### Proposed by this masterplan

No new geometry. The only proposed work is evidence stewardship and future-change preparation. Any physical improvement begins as a separately reviewed, snapshot-bound package.

## Interfaces and neighboring scopes

1. **Westlight venue.** `westlight-venue` is a separate durable project containing the stadium bowl, below-grade theatre, members club and infinity screen. Its district envelope is X `-443..-272`, Z `-640..-488`. Shared public routes and visual relationships require joint review, but separate project names do not prove separate exact cells.
2. **Town Expansion R1.** Eight Town Expansion R1 feature envelopes intersect the Westlight District envelope: the regional/oasis road, `TE-ROAD-01`, main pedestrian mall, Blue Drum, freight, Lantern Studio, parkway extension and Sky Bowl identity. This is a derived **envelope intersection only**. Before any change, compare exact target cells and accepted cross-scope interfaces.
3. **Waterfront and public realm.** The district's Ferry Bell House, Skiff House and brew-barn face larger shoreline/transport systems outside this interior catalog. Water containment, public routes and service access remain preservation controls.
4. **Media and functional zones.** The floorplan atlas is a catalog visualization. It does not replace exact saved-world evidence or prove that every functional-zone boundary is a wall.

![Westlight venue and district context](../../../data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/04-westlight-venue-and-district.png)

_Context map only. Its larger frame intentionally includes the separately cataloged venue and waterfront._

## Risks and holds

- **Chronology risk:** the district scan is bound to a 2026-07-27 snapshot, while Town Expansion R1 has a later accepted 2026-07-28 terminal snapshot. Reconcile a fresh copied snapshot before claiming the 2026-07-27 catalog is the current live state.
- **Scope risk:** “Westlight District” does not include the entire stadium/venue or all later Westlight-family construction.
- **Envelope risk:** bounding-box overlap is not exact cell overlap or overwrite authority.
- **Operational risk:** building entrances are recorded anchors, not proof of a safe live teleport or current unobstructed route.
- **Preservation risk:** future facade, street or shoreline work can damage interior enclosure, stair headroom, containers or water containment without touching room-center coordinates.

All physical changes are **HOLD** until a fresh immutable snapshot, exact ownership/interface review, route and enclosure criteria, guarded forward/rollback operations and explicit human release approval exist.

## Stewardship roadmap

| Phase | Objective | Exit evidence | Authority |
|---|---|---|---|
| W0 — Preserve | Treat the 59-record catalog and snapshot identity as the accepted historical baseline | Hash/path census and intact evidence links | Read-only |
| W1 — Reconcile | Compare the latest copied world with the district, venue and Town Expansion R1 records | Dated exact-cell and chronology report | Read-only |
| W2 — Maintain | Audit entrances, stairs, enclosure, room fitout, waterfront containment and public/service routes | Zero unexplained drift or reviewed remediation proposal | Read-only / design |
| W3 — Design | If change is desired, define exact cells, cross-scope owners, protected contents and acceptance routes | Reviewed package design with zero unresolved interfaces | Design only |
| W4 — Release | Preflight, obtain explicit approval, execute atomically and retain exact rollback | Committed transaction ledger | Explicit approval required |
| W5 — Re-catalog | Capture post-state routes/media and update durable features without erasing history | Accepted QA plus new scan/import provenance | Read-only verification after release |

## Evidence provenance

Primary evidence used:

- [`data/world-map.db`](../../../data/world-map.db) — queried read-only on 2026-08-05 for `westlight-district`, `westlight-venue` and intersecting Town Expansion R1 envelopes.
- [Active interior register](../../../data/world-review/active-interior-register-2026-07-27.json).
- [Final worldwide interior census](../../../data/world-review/worldwide-interior-final-census-2026-07-27.json).
- [Wave 3 post-census](../../../data/world-review/worldwide-interior-wave3-post-census-2026-07-27.json).
- [Wave 4 cross-area saved-world QA](../../../data/world-review/worldwide-room-fitout-wave4-cross-area-saved-world-qa-2026-07-27.json) and [focused QA](../../../data/world-review/worldwide-room-fitout-wave4-focused-saved-world-qa-2026-07-27.json).
- [Westlight District overview](../../../data/exports/world-catalog-wave2-post-2026-07-28/floorplans/07-westlight-district-overview.png) and [venue/district atlas](../../../data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a/04-westlight-venue-and-district.png).
- [Westlight waterfront survey map](../../redevelopment/2026-07-28-town-expansion/evidence/westlight-waterfront-current-map.png) for broader context only.

Derived in this document: aggregate kind counts, the district record envelope, room counts per structure and the list of eight Town Expansion R1 envelope intersections. These are reproducible database queries, not new field observations. Snapshot identity, scan bounds, completion/condition, policies and census results are transcribed from the cited records.
