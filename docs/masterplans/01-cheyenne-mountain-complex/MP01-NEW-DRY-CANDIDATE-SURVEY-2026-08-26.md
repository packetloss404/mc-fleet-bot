# MP01 new dry component survey — 2026-08-26

**Result: NO_NEW_EXACT_DRY_UNOCCUPIED_SCOPE.** This is a read-only
candidate census, not a release, design authorization, or claim that MP01 is
complete. It specifically does not extend the completed 15-bay array.

## Source and method

The census re-read the immutable post-release save from
`MP01-E03-PASSIVE-PLANNING-BAY-01`:

- world root: `data/worldsnap-mp01-e03-passive-planning-bay-01-live-post-20260826T100000Z`
- complete-save SHA-256:
  `dc4ec6a2ff28ad5b1f3ab54dd685eac1d86c98f1b7c17196d30526a52a83d4bb`
- region SHA-256:
  `da133c0e0a61a3808f2de5bdf3c90c156b83fff873d1b660d4b11380737c18ef`
- complete-save intake: 14/14 checks passed; `region`, `entities`, and `poi`
  planes were all present.

The search prism was `x=1984..2056`, `y=160..188`, `z=-980..-820`.
It was read as block states, split into face-connected air components, and
cross-checked against every accepted `data/buildops/mp01-*.forward.txt`
operation and the sealed post-release QA. The 55 scanned chunks
(`cx=124..128`, `cz=-62..-52`) contain zero saved block entities in the
prism. The feature registry has no MP01-owned feature record; it therefore
cannot grant ownership for a new civil target.

## Exact dry components found

Every closed, usable dry component is already an accepted MP01 component.
These are not candidate rooms.

| Component bounds | Air cells | Existing owner / reason excluded |
| --- | ---: | --- |
| `1997..2042, 165..182, -908..-831` | 38,367 | Main chamber, terminal-side circulation, 15 array shells/interiors, Battle Cab and north support fabric. It is occupied by accepted releases and has 117 face-adjacent reservoir-water cells. |
| `1994..2006, 165..171, -960..-949` | 1,092 | `MP01-SUPPORT-ROOM-SOUTH-02`; accepted dry support room. |
| `1994..2006, 165..171, -947..-935` | 1,183 | `MP01-LOGISTICS-SUPPORT-ROOM-01`; accepted dry support room. |
| `1998..2002, 165..171, -933..-921` | 455 | `MP01-UTILITY-RESERVE-GALLERY-01`; accepted capped gallery. |
| `1994..2006, 165..171, -919..-907` | 1,183 | `MP01-EMERGENCY-SERVICE-ANNEX-01`; accepted restricted support shell, not egress. |
| `1994..2006, 165..172, -905..-894` | 1,145 | `MP01-SERVICE-STAGING-ROOM-01` and vestibule; accepted restricted service component. |
| `2032..2036, 166..171, -906..-893` | 406 | `MP01-SUPPORT-OPS-ROOM-01`; accepted restricted operations-support room. |
| Bay alcoves at `x=2010..2013`, `2019..2022`, and `2028..2031`, `y=168..172`, `z=-887..-831` | 20–50 each | The fifteen existing bay interiors, including all completed manual/passive fit-outs. No sixteenth-bay analogue is available or proposed. |

## Rejected frontier cells and hazards

- **South frontier:** the immediately adjacent seam at
  `x=1993..2007, y=173, z=-962` contains the exact 15-cell
  `minecraft:polished_diorite` cap retained by
  `MP01-SUPPORT-ROOM-SOUTH-02`. Its east buffer,
  `x=2008..2010, y=164..173, z=-961..-949`, remains 390 cells of stone.
  The current evidence gives neither an owned destination nor a contained
  route beyond those protections.
- **Reservoir interface:** the retained source-water basin is exactly
  `x=2012..2024, y=166..170, z=-906..-898` (585 water cells). The primary
  chamber component is face-adjacent to 117 of those cells. No new scope may
  borrow its liner, causeway, or wall without a separate hydrology and
  rollback design.
- **B04:** `x=2021..2022, y=168..169, z=-845` remains intact
  `minecraft:white_concrete` structural fabric, not a vacant alcove. It stays
  a structural-fabric hold.
- **East terminal continuation:** the dry air component beginning at
  `x=2044..2056, y=166..169, z=-870..-866` reaches the search boundary. It
  is not a bounded room and is part of the existing terminal/J-curve approach;
  no independent ownership or contained destination was evidenced.
- **Outer air:** the 75,891-cell external component touches every relevant
  edge of the search prism. It is not an enclosed underground civil candidate.

## Consequence

There is no coordinate-level, dry, unoccupied, non-overlapping MP01 support
scope in the retained current source. Do not emit a compiler or run a live
release from this census. The next MP01 action must begin with a new complete
current-source survey for a functional utility/control, operating-boundary, or
support destination outside these protected/occupied components, followed by
its own exact ownership, fluid/gravity, route, inverse, and live-kernel proof.
