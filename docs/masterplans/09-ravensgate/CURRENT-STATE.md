# MP09 Ravensgate — current-state control ledger

**Status:** partial. Existing NW Garth access, garden-loop, Bell-Gate stair,
and lighting releases remain as-built. The dry Long Water west-bank bypass is
also as-built and independently verified; it does not complete Ravensgate or
commission the remaining civic programme.

## Current Long Water west-bank bypass — as-built

`MP09-LONG-WATER-WEST-BANK-BYPASS-01` is the current accepted Long Water
record. A fresh complete source/post pair bound 274 exact polished-andesite
transitions in `x=-105..-80, y=67..69, z=-556..-456`, strict `274/274`
execution, exact inverse/rollback-poststate proof, and independent route and
retained-fluid QA. It provides a two-wide, two-clear, no-jump/maximum-one-rise
walk between the Stoa west-bank and Tempietto anchors.

Long Water itself was deliberately not edited: the same finite sealed
six-neighbour 1,477-cell component remains in source and post at
`x=-92..-78, y=61..71, z=-550..-454`, with no census-boundary contact. No
water was drained, displaced, capped, lined, or rerouted. The completed bypass
therefore supersedes the old claim that a water-displacing shoreline package
was the only possible successor.

Evidence: [release record](MP09-LONG-WATER-WEST-BANK-BYPASS-01-RELEASE.md),
[fresh kernel ledger](../../../data/world-review/mp09-long-water-west-bank-live-20260826T183700Z/fresh-kernel-ledger.json),
and [independent QA](../../../data/world-review/mp09-long-water-west-bank-live-20260826T183700Z/post-release-qa.json).

## Historical shoreline rejection (not an active bypass hold)

Offline source `data/worldsnap-ravensgate-next-post-20260825T074612` was used
without a live capture. The remaining Stoa-to-Tempietto alignment cannot be
treated as simple paving:

- The only plausible two-wide shoreline line (`x=-87..-86`) is structurally
  obstructed at its northern interface: `(-87,67,-455)` has stone bricks in
  both `y=68` and `y=69`.
- Along the proposed water-side run (`z=-456..-550`), a water layer occupies
  `y=68` over the available `y=67` ground. Replacing grass with paving would
  create a submerged/non-headroom-compliant route; capping or draining it
  changes the Long Water containment system.
- The Tempietto approach rises from `y=67` to `y=69` within its envelope, so
  a public connection needs a designed grade/landing rather than an
  unreviewed two-step termination.

`scripts/compile_mp09_long_water_founded_walk.mjs` deliberately fails before
operations are written when it encounters this headroom/containment condition.
The successor must be a source-bound bridge/grade plus closed-basin/hydrology
design with exact water displacement, side-flow, containment, ownership,
rollback, and route evidence. That rejected compiler made no live call or
world edit; it does not describe the later disjoint west-bank bypass.

## Current micro-scope screen

`MP09-RAVENSGATE-CURRENT-MICRO-SCOPE-02` rechecked the remaining alignment
against the newest Ravensgate post source
`data/worldsnap-sweep3-post-20260825T164707Z`, while leaving the accepted NW
arrival, Garth plaza, and Bell-Gate work closed. The 196-cell two-wide deck
line has **21 exact headroom failures**: both northern cells at `z=-455` are
stone-brick-blocked and the shoreline cells through `z=-465` are water-blocked.
The only proposed foundation treatment would replace **186 exact source-water
cells**, and its one-cell interaction halo still contains **593 fluid cells**.
There are zero stored block entities in that envelope, but the post source has
no matching immutable `entities/` plane. The current ownership contract has no
Long Water hydrology/displacement or Tempietto grade/landing interface record.
Accordingly no independent dry, supported, owned route/support delta exists;
no package is queued.

Evidence: [`mp09-ravensgate-current-micro-scope-02-20260826T091500Z.json`](../../../data/world-review/mp09-ravensgate-current-micro-scope-02-20260826T091500Z.json)
and [`survey_mp09_current_micro_scope_02.mjs`](../../../scripts/survey_mp09_current_micro_scope_02.mjs).

## Fresh functional-front audit

The latest complete C01-08 post source reaffirms that no MP09 physical scope
is silently ready after the accepted west-bank bypass. The bypass's `274`
targets are already as-built; the remaining `8,463` dry, supported,
two-headroom columns are explicitly unprogrammed and unowned, not a public
realm license. The only named Long Water objective remains the same
`196`-cell deck study with `21` headroom failures, `186` source-water cells,
and a `593`-fluid interaction halo, with zero ownership contracts. See the
[fresh audit, map, and source-bound screen](../../../data/world-review/mp09-functional-front-audit-20260828T040000Z/MP09-FUNCTIONAL-FRONT-AUDIT.md).

## Historical integrated Long Water successor design

The latest complete source,
`data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z`,
reconfirms that there is no safe independent Ravensgate physical delta. Its
current **196-cell** reviewed two-wide band still has **21** northern/headroom
failures, **186** source-water displacement cells, and **593** fluid halo
cells. The affected six-neighbour water component contains **1,469** cells
inside the frozen-district study envelope and contacts both its `y=64` and
`y=70` limits, so the source does not prove a closed basin. The ownership
contract still carries zero Long Water hydrology, displacement, grade, or
Tempietto-landing interfaces.

`MP09-LONG-WATER-INTEGRATED-CONTAINMENT-GRADE-DESIGN-02` records the
water-displacing shoreline proposal's future order:
single future order: exact 3-D authority and complete fluid bounds; then
containment/drainage; then the two-wide north tie-in and Tempietto grade; only
then a canonical forward/inverse package and fresh guarded-release kernel.
It emits no operation, catalog, configuration, or world change. It is not a
prerequisite to the accepted dry bypass. See the
[current design with plan and section maps](MP09-LONG-WATER-INTEGRATED-DESIGN-02-2026-08-26.md).

## Historical water-displacement acceptance-signature gate

`MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01` is the current source-bound,
read-only gate for the next real Long Water release design. It requires five
distinct named owners; all five known interface coordinate/state sets; a
complete six-neighbour fluid census; finite closed containment or exact
controlled outlets; receiver and overflow terminal acceptance; all 186 water
states with exact inverses; and supported two-wide/two-clear no-jump returns
between the exact north and Tempietto anchors. Its prescribed forward order is
containment/receiver/overflow → water displacement → north grade/deck/landing,
and rollback is exactly the reverse. It cannot emit operations or release
authority. See the [signature guidance and current map](MP09-LONG-WATER-ACCEPTANCE-SIGNATURE-01.md).

The earlier `compile_mp09_long_water_founded_walk.mjs` failure is retained as
historical negative evidence only. It is not a required rerun, a global hold,
or a prerequisite to the accepted dry bypass. A future package that actually
changes the basin must use a fresh finite containment/inverse design.
