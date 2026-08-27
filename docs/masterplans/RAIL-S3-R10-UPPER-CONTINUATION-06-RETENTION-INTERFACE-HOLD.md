# RAIL-S3-R10 · upper continuation-06 retention-interface hold

**Status:** OFFLINE HOLD — NO SUCCESSOR COMPILED

**Update (north high corridor-01):** The surveyed high horizontal envelope
`x=26..45`, `y=42..47`, `z=-472..-467` is now an accepted, separately guarded
sealed civil corridor. It remains deliberately **not connected** to the Cobalt
alignment. This hold continues to apply to the normal horizontal successor and
to the unbuilt north-turn/vertical-shaft connection; no service or passenger
claim follows from the isolated high corridor. See
`RAIL-S3-R10-NORTH-HIGH-CORRIDOR-01-RELEASE.md`.

The next horizontal successor (`x=26..45`) cannot use the standard R10 upper
cross-section. Its source-bound compiler stops before emitting operations at
`(31,39,-463) = minecraft:water[level=1]`. That cell is part of the accepted
continuation-05 retained-water chamber, rather than an unknown fluid.

The current accepted chamber deliberately occupies `x=31..34`, `y=39..41`,
`z=-464..-461`; the new horizontal gallery shell would overlap it. No source
state is ambiguous, but neither a continuation through a retained-water
chamber nor an unreviewed relocation is allowed.

The next safe package is an offline exact choice between a vertical/route
transition around the chamber and an independently guarded, flow-safe chamber
migration to a disjoint exterior location. It must preserve all 26 retained
water states and retain the 132-cell shell / 26-cell liner contract until a
new exact migration transaction supersedes it. No capture or world mutation is
authorized by this hold.

## Bounded vertical-bypass result

The first high bypass envelope (`x=26..45`, `y=42..52`, `z=-464..-453`) is
also not a continuous dry successor. Its exhaustive 2,640-cell read-only
survey records 603 fluid/bubble cells and 11 gravel cells. Although 217 local
6×6 dry cross-sections exist, they form only two disconnected x-runs:
`x=26..31` (six blocks) and `x=37..45` (nine blocks). No dry 6×6 cross-section
exists at `x=32..36`, so there is no continuous 20-block bypass in the exact
survey box.

Evidence:
`data/world-review/rail-r10-continuation06-offline-20260826T060600Z/vertical-bypass-survey.json`.
The next legitimate offline work is therefore a bounded containment/migration
survey for the 603-fluid high band, or a differently located route corridor;
do not compile a vertical transition from these local dry pockets.

## Selected dry north transition candidate

A disjoint northern route has now been located and is preferable to a high-band
fluid migration. The proposed high horizontal cross-section is exactly
`x=26..45`, `y=42..47`, `z=-472..-467`: all 720 surveyed cells are fluid- and
gravel-free. Its north turn (`x=25..30`, `y=42..47`, `z=-472..-453`) is also
dry and gravity-safe. The vertical shaft candidate (`x=25..30`, `y=28..47`,
`z=-458..-453`) is fluid-free but contains an exact two-cell gravel stack at
`(25,30..31,-453)` and 32 predecessor polished-deepslate cells.

The accepted high horizontal corridor is disjoint from the retention chamber.
The remaining north turn/shaft needs a staged compiler:
temporary support below the lower gravel, top-gravel clear, lower-gravel clear,
support clear, plus a reviewed migration contract for the 32 existing
continuation-05 terminal cells. It is not yet a compiled or released route.

Evidence:
`data/world-review/rail-r10-continuation06-offline-20260826T060600Z/north-transition-survey.json`.

## North turn/shaft compiler result

The exact connection compiler was attempted offline against the accepted North
High post snapshot. It proves the intended two-gravel ordering (temporary
support at `(25,29,-453)`, followed by top `y=31`, then lower `y=30` gravel
clear), 32 continuation-05 terminal PDS migrations, 72 North-High shell
migrations, and six explicitly enumerated retention top-shell migrations.

It deliberately emitted **no operations**: the required east external shell
cell `(31,47,-459)` is `minecraft:water[level=0]`. That cell is part of the
previously recorded high-band water/bubble component, so a direct PDS shell
write would be an undeclared fluid displacement. The next safe work is a
bounded, flow-ordered containment/interface package for that component, or a
revised dry connection geometry. No capture or mutation is authorized while
this static source gate fails.

## Hard-bounded alternate search

A finite direct-state search of 165 fixed 6×6 shaft/turn placements within
`x=20..35`, `y=28..48`, `z=-472..-438` found 25 dry local volumes, but **zero**
with the required six-cell x-overlap to form a direct 6×6 junction with North
High (`x=26..45`). The dry results are disconnected alternatives, not valid
route geometry. The same finite search recorded 109 distinct blocking fluid
cells. This establishes a narrow current hold, not an assertion about fluid
outside the explicitly surveyed box.

Evidence:
`data/world-review/rail-r10-north-turn-alternate-offline-20260826T061700Z/alternate-survey.json`.

## High-band fluid topology prerequisite

The exact finite topology census (`x=20..45`, `y=42..55`,
`z=-465..-438`) finds one connected 797-cell component: 791 water and six
bubble-column cells. It touches the `x-max`, `y-max`, `y-min`, and `z-min`
faces of that envelope, with 133 gravel cells in the same surveyed halo. It
is therefore an unresolved escaping system, not a bounded retention candidate.
No liner, transfer, migration, source capture, or release operation may be
compiled from this result. A future containment design must first establish a
complete component boundary and gravity-safe external retention capacity.

Evidence:
`data/world-review/rail-r10-north-turn-fluid-topology-20260826T061800Z/topology.json`.
