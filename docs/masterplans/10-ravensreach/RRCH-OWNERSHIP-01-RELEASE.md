# RRCH-OWNERSHIP-01 — Ravensreach cross-area ownership-interface survey

Status: **READ-ONLY SURVEY — no world edits, no RCON, no release**

Scope: `RAVENSREACH` · 2026-08-25

## What was surveyed

The Ravensreach MASTERPLAN cross-area release hold (sections 6/7, Phase 5)
requires explicit interface contracts before any adjacent pavilion, Guild Hall,
Ravensgate, or Town Expansion change. This read-only register records the
exact shared-cell interface evidence for those contracts against the accepted
immutable r08am post snapshot
(`data/worldsnap-r08am-post-20260822T161818Z`, region SHA-256
`30f5c3394c4080d74156a59deb613290366c130e72a859261625117b8276541f`).

| Interface | Boundary | Cells | Owner |
|---|---|---|---|
| IF-RRCH-LIBRARY-LOGGIA | x=-111 wall, y68..78, z=-447..-433 | 165 | RRCH-LIBRARY wall; loggia door threshold shared with RG-LOGGIA |
| IF-RRCH-TERRACE-SOUTH-EDGE | z=-432 band, x=-110..-94, y67..71 | 85 | TE-LIBRARY-TERRACE band; RG-STOA/RG-GARTH surface south |
| IF-RRCH-TEREM-EAST-SURFACE | x=-64, y67..74, z=-447..-425 | 184 | TE-RUSSIAN-TEREM-PAVILION planning overlay (unbuilt) |
| IF-RRCH-GUILDHALL-WEST | x=-65..-59, y67..71, z=-463..-408 | 1960 | TE-GUILDHALL-01 approach plaza / district east approach |
| IF-RRCH-STOREHOUSE-NORTH | z=-420, x=-95..-75, y67..71 | 105 | RRCH-STOREHOUSE wall / ravensgate public realm south |
| IF-RRCH-MOOT-NORTH | z=-392, x=-100..-70, y67..73 | 217 | RRCH-MOOT wall / public realm north |
| IF-RRCH-MOOT-MARKET-GAP | x=-72..-71, y67..73, z=-392..-341 | 728 | public realm gap between RRCH-MOOT and RRCH-MARKET |
| IF-RRCH-TOWNHALL-SHELL | nested shell perimeter x=-98/-72, z=-381/-368, y67..80 | 1092 | RRCH-TOWN-HALL shell perimeter inside RRCH-MOOT |

**Total surveyed: 4,309 cells.** Zero fluid, zero gravity, zero saved entities.
Seven block entities are documented at the interface boundaries (two barrels in
the moot-market gap, one chest + one barrel + one lectern on the town-hall
shell perimeter, two banners), all preserved and untouched.

## Key findings

- The Russian Terem pavilion (`TE-RUSSIAN-TEREM-PAVILION`) is a planning
  overlay only — no constructed shell exists. Its east surface band is recorded
  as surface-overlay-only, never a district-boundary expansion.
- The Guild Hall physical shell begins at x=-59 (quartz columns); the x=-65..-59
  band is open approach plaza, a clean east gap with no contested construction.
- The storehouse north wall at z=-420 is a solid single-owner wall that also
  forms the Ravensgate district north bound.
- The nested Town Hall shell owns its own perimeter planes inside the Moot Hall
  stack; every perimeter cell is assigned one owner.

## Evidence

- JSON: `data/world-review/rrch-ownership-interfaces-20260825/rrch-ownership-interfaces.json`
- Markdown: `data/world-review/rrch-ownership-interfaces-20260825/rrch-ownership-interfaces.md`
- Payload SHA-256: `8d5a4b7fbf26a57fdadd69673081c029d3247195c78a9e47f178178837412219`
- Status: `PASS_RRCH_OWNERSHIP_INTERFACES_READONLY`

## Authority

Read-only survey under the expanded owner directive 2026-08-24 ("I authorize
all work all plans all areas"). This register authorizes no world edit, RCON
call, interface change, or release; it is the exact-cell evidence prerequisite
for the cross-area interface contracts.
