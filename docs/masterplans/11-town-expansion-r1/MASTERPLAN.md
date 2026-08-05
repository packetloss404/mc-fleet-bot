# Town Expansion R1 — Retrospective Masterplan

Status: **R1 accepted; stewardship baseline**
Plan type: retrospective source plan for AI and engineering use
Prepared: 2026-08-05 from committed, read-only repository evidence
Physical authority: **none** — this document does not authorize world mutation

## Executive decision

Town Expansion R1 is a completed, accepted release, not an unbuilt proposal. The canonical post-release verifier reports `PASS` / `ACCEPTED` against terminal snapshot `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`. The durable catalog contains 340 imported records, all tagged `as-built` and `verified-post-state`, with completion ratio 1.

This masterplan therefore governs preservation, reconciliation and any future change package. It must not be read as fresh permission to rebuild the accepted release.

## Scope and reading rules

- Project ID: `town-expansion-r1` in `data/world-map.db`.
- World: `world`.
- Catalog-derived outer envelope: X `-714..1300`, Z `-719..296`.
- Durable records: 340 — 6 buildings, 261 custom physical/program records, 5 parking records, 5 roads and 63 rooms.
- The outer envelope is the minimum/maximum of all project records. It is a **derived reference**, not one contiguous parcel or an ownership boundary.
- The release is deliberately cross-area: it includes work in Ravensreach/Manager Vale, the owner route and observatory, Pavilion East, MainStreet, Westlight, the oasis/RV district, C01 and the northeast data/Concord district.
- Requested program language is not independent proof of construction. The database importer admits only each registry object's exact `physicalClaim`; broader requested programs are not implied complete.

## Geographic framework

The family envelopes below are derived from the durable catalog. Family tags overlap; counts are memberships, not a sum of independent objects.

| Catalog family | Records | Derived X | Derived Z | Role in R1 |
|---|---:|---:|---:|---|
| Manager Vale | 114 | `-145..-49` | `-317..-169` | Five mini-mansions, garages, rooms, furnishings and local roads |
| Gilded owner corridor | 13 | `-34..718` | `-402..159` | Theatre-house descent, owner corridor, rest suites and C01 detour interface |
| Owner estate and portals | 23 | `149..377` | `100..221` | Observatory estate, gallery, safe/wellness rooms and inactive portal program |
| Town core | 14 | `-348..367` | `-529..190` | Regional approach, civic/town connective work and owner-route support |
| Civic / pavilion / library / guild | 11 | `-178..122` | `-486..-400` | Pavilion East grounds, guild/library/garth and related civic fabric |
| MainStreet | 27 | `-206..125` | `-300..296` | Attached garages, staff route, housing and guest-service work |
| DSM / InfoBunker | 42 | `130..1025` | `-701..-108` | Data halls, auditoria, support and bunker-related records |
| Data district / Concord | 28 | `567..1300` | `-713..-172` | Concord and northeast campus/service-town records |
| Oasis / RV | 23 | `-714..-190` | `-664..-252` | Approach-road oasis, dealership/RV and road work |
| Westlight | 38 | `-671..-199` | `-719..-318` | Waterfront, parks, venues, freight and public-realm additions |
| C01 | 8 | `364..900` | `-141..58` | Five-level east stack, owner residence/club and route detour |

![Accepted R1 whole-world overview](../../../data/exports/town-expansion-media-2026-07-28/terminal-c39d-render-v6/pass-1/maps/map-whole-world-overview.png)

_The overview is accepted post-release media. It gives context, not exact ownership boundaries._

## Accepted as-built baseline

The following statements are supported by the final verifier rather than inferred from filenames:

- `PASS` and `ACCEPTED` post-release decision.
- 3,665,580 unique target cells.
- 483,016 forward and 483,016 rollback REPL groups with an exact target bijection.
- Base transaction plus three ordered supplemental transaction ledgers; the report's summary labels four supplemental packages because it also accounts for the materialized logical overlay.
- 22 of 22 terminal as-built route checks passed on the immutable post snapshot.
- 1,178 of 1,178 supplied post-release media captures passed.
- The global cross-scope ownership/interface gate passed with 6,328,504 modeled target cells, 79 canonical ownership refactors, 13 exact reviewed interfaces and zero unreviewed interfaces.
- The database closeout imported and census-verified all 340 durable objects.

Representative accepted anchors include:

- Architect House: X `-144..-106`, Z `-309..-283`.
- Steward House: X `-91..-58`, Z `-309..-283`.
- Gilded Raven Theatre House: X `-34..18`, Z `-402..-350`.
- Gilded Raven–Observatory owner corridor envelope: X `-14..367`, Z `-394..169`.
- C01 east levels: principally X `700..900`, Z `-141..-5`; catalog records differ by level.
- Westlight main pedestrian mall: X `-435..-268`, Z `-502..-318`.

These are database bounds, not safe teleport or work-volume guarantees.

## Interfaces and dependencies

1. **Immutable release identity.** The terminal snapshot, release identity, forward/rollback hashes and ordered supplemental ledgers are one evidence chain. Reordering or replacing an item invalidates the accepted proof.
2. **Cross-scope ownership.** The 13 exact interfaces are the only accepted shared physical seams for this release. Broad envelope overlap is not overwrite permission.
3. **Neighboring project catalogs.** Several R1 families coexist with separately cataloged projects such as `westlight-district`, `westlight-venue`, MainStreet, Ravensreach and C01-related infrastructure. Future work must reconcile exact cells and chronology, not choose a winner by project name.
4. **PassageWay and route systems.** Underground records and owner routes depend on the separately documented navigation graph. Catalog presence is not proof of every live surface condition.
5. **Database/media crosswalk.** Durable database records depend on the accepted object-to-media crosswalk and post-release QA. A discovered PNG alone must never create a new object relationship.

## Risks, controls and holds

### Current R1

No open acceptance hold remains on the committed R1 release in the final post-release report. The accepted state is nevertheless hash- and snapshot-specific.

### Any future change

Future physical work is **HOLD** until a new package satisfies all of the following:

- current immutable saved-world baseline and source-drift census;
- exact one-owner-per-cell and cross-scope interface reconciliation;
- entity, container, fluid, route, enclosure and life-safety checks appropriate to the scope;
- exact forward/rollback guards with a complete target bijection;
- post-state route and media evidence, followed by database reconciliation.

Specific maintenance risks:

- Unwaxed copper may naturally oxidize. The accepted rollback exception is exact, rollback-only and bound to 4,529 declared copper points in 61 rules; it never permits a forward change.
- The red-carpet logical source overlay is 49 exact cells. It is a source-provenance correction, not a natural-transition exception.
- Older draft requirement matrices contain pre-release states such as `MODELED_BLOCKED`. They preserve planning history and do not override the later accepted post-release verifier.
- Catalog envelopes can overlap even when exact changed cells do not. An envelope intersection is a review trigger, not evidence of collision.

## Stewardship roadmap

| Phase | Objective | Exit evidence | Authority |
|---|---|---|---|
| S0 — Preserve | Keep the accepted hashes, ledgers, snapshot and reports immutable | Hash census matches the accepted evidence table | Read-only |
| S1 — Observe | On a fresh copied snapshot, audit drift, routes, entities and database/media paths | Dated read-only reconciliation report | Read-only |
| S2 — Propose | Define exact new scope, owner cells, interfaces, life-safety criteria and rollback | Reviewed proposal with zero unresolved interfaces | Design only |
| S3 — Preflight | Compile guarded forward/rollback ops and validate on immutable source data | Complete preflight, strict-noop parser result and recovery plan | Offline only |
| S4 — Release | Execute only after explicit human approval and runtime gates | Atomic transaction ledger | Explicit approval required |
| S5 — Close out | Bind terminal snapshot, routes, media and durable catalog | Accepted post-release QA and database closeout | Read-only verification after release |

## Evidence provenance

Primary evidence used for this retrospective plan:

- [`data/world-map.db`](../../../data/world-map.db) — read-only durable feature and scan catalog queried on 2026-08-05.
- [Final post-release QA](../../redevelopment/2026-07-28-town-expansion/post-release-qa.md) and its [machine report](../../../data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json).
- [Global cross-scope interface audit](../../redevelopment/2026-07-28-town-expansion/town-expansion-global-cross-scope-interface-audit.md).
- [Database closeout](../../redevelopment/2026-07-28-town-expansion/town-expansion-database-closeout.md) and [publication report](../../../data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json).
- [Canonical design report](../../../data/buildops/town-expansion-r1-2026-07-28.report.json) and [manifest](../../../data/buildops/town-expansion-r1-2026-07-28.manifest.json).
- [Post-release media report](../../../data/world-review/town-expansion-r1-post-release-media-2026-07-28.json).
- [Human release report](../../redevelopment/2026-07-28-town-expansion/master-plan.html).

Derived in this document: project/family envelopes, kind counts and family membership counts. These were calculated from `world_features`; they are not newly surveyed geometry. All other acceptance numbers are transcribed from the cited final reports.
