# Worldwide interior and circulation review — 2026-07-27

This is the completion record for the whole-world floor-plan, furnishing, and
vertical-circulation pass requested after the Moot Hall basement review. It
covers every active mapped area in the current world, not only MainStreet
America.

## Final result

The authoritative post-build snapshot is:

```text
data/worldsnap-worldwide-wave4-post-20260727/region
sha256=4a754a73f5dcd0db512d67e90dcea08ff80d19b6d711c859a0a8d688a4091400
```

The final read-only census reports:

| Measure | Result |
|---|---:|
| Active areas | 7 |
| Cataloged structures | 68 |
| Multi-floor structures | 35 |
| Cataloged named rooms | 236 |
| Empty rooms | 0 |
| Under-detailed rooms | 0 |
| Structures using ladders | 0 |
| Multi-floor structures without stairs | 0 |

Two broad structure envelopes contain a small amount of `cave_air`: Moot Hall
(8 cells) and C01 (101 cells). No cataloged room contains `cave_air`; the cells
are outside the named room volumes inside deliberately broad underground
review bounds.

## Work executed

| Wave | Commands | Result |
|---|---:|---|
| Worldwide interior Wave 1 | 3,109 | Raven Rock building stairs and furnishings, RR-Z5 seventeen-level stair, Ravensgate Bell stair, Westlight upper-floor stairs and fit-outs |
| MainStreet interior Wave 2 | 305 | 41 deficient rooms furnished, H11 four-floor stair replacing scaffolding, sealed H09 suite opened |
| Ravensreach ladderless Wave 3 | 186 | Six-level Library spiral and landings rebuilt; all 39 Library and six Market/Grange ladders removed |
| Worldwide room fit-out Wave 4 | 740 | Remaining 45 rooms fitted; Beacon tower excavated and connected; four sealed C01 lower rooms connected to the operations gallery |

All 4,340 live commands completed successfully.

The expanded route audit found defects that simple block-placement checks had
missed:

- Beacon Inn's advertised lower tower lounge was a solid deepslate plug.
- A Beacon floor plate blocked ascent two treads below the lookout even though
  the reverse, falling route worked.
- C01 Bunk, Records, Comms, and Fabrication were complete rooms sealed behind
  two- to three-layer rock bulkheads.
- H09 contained a furnished but sealed primary suite.
- H11 still relied on scaffolding rather than a usable four-floor stair.
- The six-level Ravensreach Library had a broken nominal stair and 39 ladders.

Each defect was corrected in a snapshot-bound guarded operation package before
the live run.

## Verification

Wave 4 passed 740/740 exact source-state guards before execution. A fresh
post-build snapshot then passed 32/32 independent saved-world route suites:

- 14 cross-area building, shaft, campanile, and Westlight district routes;
- 7 Ravensreach Library, Market, and Grange routes;
- 7 MainStreet room-coverage and H11 routes;
- 4 Beacon Inn and Westlight venue focused routes.

The final census is
`data/world-review/worldwide-interior-final-census-2026-07-27.json`.
The four saved-world route reports are:

- `data/world-review/worldwide-room-fitout-wave4-cross-area-saved-world-qa-2026-07-27.json`
- `data/world-review/worldwide-room-fitout-wave4-ravensreach-saved-world-qa-2026-07-27.json`
- `data/world-review/worldwide-room-fitout-wave4-mainstreet-saved-world-qa-2026-07-27.json`
- `data/world-review/worldwide-room-fitout-wave4-focused-saved-world-qa-2026-07-27.json`

## First-class map database

`data/world-map.db` now contains the complete active-area interior program:
districts, buildings, 236 functional room zones, and vertical-circulation
records. Seven completed `region_snapshot` scans attach 335 observations from
the final snapshot to those features. The scan ledger is
`data/world-review/worldwide-interior-final-database-scan-2026-07-27.json`.

Functional room zones are named spatial program boundaries. They do not claim
that every zone boundary is a physical wall; enclosure and circulation are
verified from the Anvil snapshot and route reports.

## Durable sources

- `scripts/generate_worldwide_interior_wave1.mjs`
- `scripts/generate_mainstreet_interior_wave2.mjs`
- `scripts/generate_ravensreach_ladderless_wave3.mjs`
- `scripts/generate_worldwide_room_fitout_wave4.mjs`
- `scripts/import_worldwide_interior_register.mjs`
- `scripts/record_worldwide_interior_scan.mjs`

The upstream Westlight generator now authors the Beacon tower rooms, floors,
and spiral directly. The Ravensreach civic generator now authors the corrected
Library stair. A rebuild therefore cannot silently restore either old defect.

## Remaining scope

There is no incomplete room, ladder replacement, or broken-stair item in this
review. Exterior storytelling, more display vehicles, additional façade
ornament, new parcels, and larger photography sets remain optional presentation
initiatives; they do not reopen this completion record.
