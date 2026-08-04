# MainStreet America recovery — final program ledger

**Closed:** 2026-07-26
**World:** `world`
**Snapshot:** `data/worldsnap/region`
**Snapshot SHA-256:** `78a28b83e1580d436c2ce5cbd044c5853c51c78c8f16d2d860aaa903d8ae10c9`

This is the final PM ledger for the recovery session. It supersedes the
mid-session copy of this file, which still described roads, lower theater,
surface aviation, vaults, WorldGuard, navigation, Box, and documentation as
future work after those items had been built.

## Outcome

MainStreet America's physical recovery is complete. The final as-built material
suite passes **96/96** with zero failures and zero unknowns. Independent
bidirectional route checks cover the public mountain, surface aviation, lower
operations, private shelter, and all three vault levels. All MainStreet build
operation files are now owned by the build manifest so a vCPU interruption
cannot silently strand an unmonitored phase again.

The external Box archive is configured and operational. Client Credentials
authentication resolves the `mc-fleet-bot` service account and approved folder;
the first live sync uploaded all 207 discovered artifacts with zero failures.

## Completed task ledger

| Program | Final state | Primary evidence |
|---|---|---|
| As-built audit | 96 passed, 0 failed, 0 unknown | `docs/mainstreet-america/qa/audit-closure-2026-07-26.json` |
| Parking/arrival/gardens | 236 bays, accessible/EV/premium markings, canopies, lights, gardens, Discovery Court, connected south approach | `mainstreet-parking-arrival-gardens-2026-07-26.report.json`; parking audit group 10/10 |
| Guest Center | Formal entry/portico, glazing, reception, restaurant, event, studio/distribution/office program | Guest Center audit group 5/5 |
| Homes | 12 model homes with authored partitions, vertical circulation, differentiated floorplans/furnishings/façades | Home audit group 12/12; 65 named room records complete |
| Infill | Six additional neighborhood homes | Infill audit group 6/6 |
| Cooking school/warehouse | Teaching/retail kitchens, storage, loading and warehouse work areas | Service audit group 4/4 |
| Failed builds | H03/H04/H08 foreign frames removed; circulation and room-access repairs applied | Abandoned-roof group 7/7; manifest ownership |
| MainStreet roads | R01–R07, one connected network, 48 lamps, all declared road gates connected | `mainstreet-grid-roads-2026-07-26.report.json`, 29,780/29,780 targets, zero ops |
| Project fence system | 13 division/block/project white-picket boundaries and 32 gates | `mainstreet-project-boundaries-2026-07-26.report.json`, 5,954/5,954 targets, zero ops |
| Rejected outer fence | Water-crossing ±305 ring reversed and retired; final south tail removed | inverse report; obsolete-tail operation; four absence assertions |
| L01 pond | Water preserved, ecology loop, lighting, safety edge and both gates | Landscape audit group; west/east traversal |
| L02 monument | Billboard preserved, three terraces, stair, planting and visitor route | Landscape audit group; south approach traversal |
| Mountain public complex | Authored public entry, hangar, arena, service spine, upper/lower halls, theater and conference suites | Mountain groups; current flood-fill |
| Wayfinding | Public, lower-operations, surface/heliport and private-vault route families | `scripts/register_msa_navigation.mjs`; current flood-fill |
| Surface hangar | Large bay, second-floor overlook office, south door and helipad trail | Surface audit; route checks |
| Observatory | Rooftop three-dome observatory/planetarium/telescope program | Surface audit |
| Private residence | One bedroom, private library, 12-monitor command center, marble/glass spa, four-head shower, soaking tub, wardrobe and safe room | Surface/private audit groups |
| Shelter/vault | Fallout shelter, hardened safe room, communications and treasury rooms; dry three-level marble/gold vault with working stairs, vault doors, expensive blocks and stocked containers | Dryness/census/inventory assertions; reverse route |
| Terrain | Mountain retaining/approach refinement and natural cover above shelter/vault roofs | Landscape reports; 2,977/2,977 roof cells naturally covered |
| WorldGuard | Full property plus higher-priority mountain child; human owner; five non-opped members | live regions file; nonmember denial test |
| World map DB | 553 features: 552 complete, 1 intentionally removed; idempotent final scan | `wsc_9d4f2e83d78ad73c`; `docs/WORLD-MAPPING.md` |
| Visual QA | Current overall, surface/grid and mountain cutaway captures from final snapshot | `msa-final-*-audit.png` |
| Build monitoring | Every MainStreet/fence ops artifact appears in consolidated manifest units | `builds/manifest.yaml`; targeted units walkable/retired |
| Box integration | Backend client/routes, secret masking, settings UI, 16 generated PDF maps, and first 207-artifact live sync with zero failures | `data/box-sync-state.json`; `src/integrations`; `/settings`; `test/integrations/BoxIntegration.test.ts` |

## Protection model

`mainstreet_america` is live at `(-300,-64,-300) -> (300,319,300)`,
priority 10. Because the existing `raven_rock` region has priority 11 below y62,
the non-Raven-Rock MainStreet mountain footprint has its own
`msa_mountain_sub` child at `(90,-64,70) -> (294,61,240)`, priority 12.
`packetloss404` is owner and sole operator. Architect, Mason, Steward, Surveyor,
and Scout are members of both MainStreet regions and are no longer operators.

WorldGuard provides membership protection. PacketCraft's guard/build zones add
the project/parcel scheduling layer. The acceptance test demonstrated the
distinction: a member advanced past WorldGuard to the parcel guard; the same
non-opped player, temporarily removed from membership, received WorldGuard's
block-break denial. Membership was immediately restored.

## First-class map record

The canonical importer is:

```bash
node scripts/import_mainstreet_project_grid.js --apply --scan
```

It imports the project hierarchy, active fences/gates, roads/junctions, homes
and named rooms, parking, landscapes, mountain spaces, surface aviation,
private residence, shelter/vaults, route features, final source hashes, and the
immutable snapshot hash. A second identical run reuses scan
`wsc_9d4f2e83d78ad73c`.

Live navigation is published idempotently with:

```bash
node scripts/register_msa_navigation.mjs
```

The active control set has 28 MainStreet markers, five routes, and two zones.
Discovery Court is `(91,65,200)`; the surface office landing is
`(200,106,153)`; the private chain ends at the lower vault
`(246,45,222)`.

## Verification record

- Backend TypeScript build: pass.
- Frontend production build: pass.
- Settings page lint: pass.
- Box integration tests: 8/8 pass.
- Fence tests: 10/10 pass with the appropriate 30-second timeout; the full
  suite's sole initial failure was the same CPU-sensitive test hitting Vitest's
  default 10-second limit, while 608 other tests passed.
- Road report: execution-ready, zero operations/errors/blockers, one connected
  network.
- Boundary report: execution-ready, zero operations/errors, exact current
  snapshot hashes.
- Final material audit: 96/96.
- Public and private build-manifest route units: bidirectionally walkable.

## Box archive

The dashboard configuration lives at **Settings → Integrations → Box**.
Credentials are masked and never returned by the API; persisted settings use an
allowlist, and upload discovery refuses symlinks. The default staged archive is
under `data/exports/box` and includes map PDFs, reports, and final QA media.
Post-deployment verification returned HTTP 200 from both Box endpoints,
discovered 207/207 uploadable artifacts, and generated 16 PDF maps, including
all four `msa-final-*-audit` views. Client Credentials authentication and Editor
access to folder `403352515118` were verified. The first live sync completed at
`2026-07-26T22:46:06.448Z`: 207 uploaded, zero updated, unchanged, skipped, or
failed, and 25,868,483 bytes transferred. `data/box-sync-state.json` retains the
latest sync state, while `data/exports/box/sync-report-2026-07-26.json` retains
the full first-sync report. Automatic scheduled sync remains off; later syncs
can be run manually from the dashboard.

No credential should be pasted into chat or committed to the repository.

> Scope note, 2026-07-27: this ledger closes the MainStreet America session.
> Later Moot Hall/Ravensreach work is tracked by `docs/ravensreach/audits/ravensreach.yaml`,
> `builds/manifest.yaml`, and the Moot Hall completion export.

## Final residual work

No physical build, route, protection, catalog, documentation, build-monitoring,
or service-deployment item remains in this session's audit. Future design
iterations—more parked display vehicles, additional hangar equipment, or a
larger per-home photography set—are enhancements, not incomplete recovery
tasks. They are triaged in
`docs/OPTIONAL-INITIATIVES-2026-07-26.md`; no required session item remains.
