# RAIL-S3-R10 · unbounded fluid-interface hold

**Status:** PARTIALLY CLOSED — ROOF-POCKET CONTAINMENT AS-BUILT; NO R10
SERVICE OR RUNNING-TUBE RELEASE

The next Cobalt civil segment (`x=-75..-56`) is not a dry successor to R09.
The exact offline survey finds 158 water/bubble-column cells in the proposed
tube/service envelope and 69 gravel cells in the proposed service gallery.

A connected-fluid survey seeded from 216 affected tube cells already observed
8,518 component cells in a conservative read-only search box. The component
touches both the lower-Y and eastern-Z survey boundaries, so neither its
origin nor its full connected interface is bounded. A finite liner, drain, or
retention chamber would therefore invent an unsupported closure.

The expanded survey now classifies this as a large open basin rather than a
small local pocket: 41,792 water/bubble cells are observed over
`x=-100..-11`, `y=-9..26`, `z=-500..-423`, still touching the west and north
search boundaries. This remains unbounded for R10 containment purposes.

An elevation-separated *candidate* exists above the observed basin crown:
the proposed upper tube at `y=28..31` and service-gallery interior at
`y=33..38` are dry over the R10 X range. Its only surveyed fluid is a separate
five-cell roof-shell component at `x=-65..-63`, `y=39`, `z=-464..-463`, whose
full local boundary is proven. This is not a constructed bypass: no owned
vertical/civil transition from the established `y=13..24` R09 alignment has
been set out, and the candidate’s roof pocket still needs a separately staged
gravity/retention design.

The subsequent exact ramp survey establishes a current-safe *setout candidate*
for that missing transition. A one-block-per-X climb over `x=-75..-60` raises
the paired tube base from `y=13` to `y=28` and the separated gallery floor
from `y=17` to `y=32`. Its exact tube interior/wall and gallery interior/shell
envelopes contain **0 fluid and 0 gravel cells** (256 tube-interior, 256 tube
wall, 576 gallery-interior, and 448 gallery-shell cells). It reaches the
upper dry envelope without crossing the open basin.

The ramp is not yet owned for release: its predecessor connection would
intentionally migrate the exact R09 forward-cap cells at `x=-75`—16
running-tube interior cells and 36 gallery-interior cells—from their temporary
polished-deepslate termination state back to air. A future transition compiler
must bind precisely those 52 current predecessor states, preserve all other
R09 cells, and prove its own structural/rollback package.

The five-cell roof pocket is independently bounded and has no gravel in its
surveyed gravity interface (`x=-66..-62`, `y=38..40`, `z=-465..-462`). Its
sources are `(-65,39,-464)`, `(-64,39,-464)`, `(-64,39,-463)`,
`(-63,39,-464)`, and `(-63,39,-463)`. It is therefore an exact local
retention problem. Its retention package and the dry transition package have
separate ownership and must remain separately guarded releases; neither
implies the other is built.

Evidence:

- `data/world-review/rail-running-tube10-survey-20260826T053300Z.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-connected-fluid.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-connected-fluid-expansion-01.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-upper-bypass-envelope.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-upper-roof-fluid-component.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-r09-upper-ramp-envelope.json`
- `data/world-review/rail-running-tube10-survey-20260826T053300Z-upper-roof-pocket-gravity-interface.json`

## Offline-only successor packages (not released)

Two deliberately separate, source-bound packages now turn the surveyed upper
candidate into reviewable operations. They are **not** a release authorization:
neither has taken a fresh live capture, run an entity gate, or changed the
world.

1. `rail-s3-r10-upper-ramp-01` owns only the dry `x=-75..-60` one-to-one
   climb. Its 1,588 target cells include the exact 52-cell R09 predecessor-cap
   migration (16 tube and 36 gallery interior PDS-to-air cells), bound by
   reviewed-set hash
   `1447a99f30816199c5207cd326aed6c162b868ffca458aa2d3a4ee90448450f2`.
   It proves 256 tube-interior air cells, 576 gallery-interior air cells, and
   a one-block-per-X elevation relationship without taking ownership of the
   upper horizontal extension.
2. `rail-s3-r10-roof-pocket-retention-01` is an isolated, staged treatment
   for only the five closed roof-water cells: 82 dry shell cells, five exact
   transfers into a 18-cell disjoint chamber (five retained plus 13 reserve),
   then five original-pocket liner cells. The surveyed gravity interface has
   zero gravel targets. Its source water, retained-water, and shell sets are
   manifest-bound and each stage has an exact inverse.

All source, parser, container/block-entity, forward, and projected sequential
rollback gates pass against
`data/worldsnap-rail-running-tube9-post-20260826T053200Z/region`:

- ramp: `ramp-compiler.json`, `ramp-preflight.json`,
  `ramp-forward-parser.json`, `ramp-rollback-parser.json`, and
  `ramp-block-entities.json`;
- roof retention: `roof-retention-compiler.json`, stage source preflights,
  strict parser reports, `roof-block-entities.json`, and projected rollback
  reports (`roof-liner-rollback-projected.json`,
  `roof-transfer-rollback-projected.json`, and
  `roof-shell-rollback-projected.json`).

Those reports and operation files reside in
`data/world-review/rail-r10-offline-20260826T053500Z/` and `data/buildops/`.
They require a new immutable source, live entity clearance, strict staged
execution, post capture, independent interface QA, and rollback-poststate
proof before either can be called built.

### Ownership, sequencing, and release prerequisites

`rail-s3-r10-roof-pocket-retention-01` owns only the five source-water cells,
its 82-cell dry external shell, and the five selected cells in the disjoint
retention chamber. It does **not** own the R09 cap, the vertical ramp, an
upper running tube, or an upper service gallery. Its staged shell → transfer
→ original-pocket-liner order is fixed by its manifest and is the first R10
candidate eligible for a future live release.

`rail-s3-r10-upper-ramp-01` owns only the precise R09 predecessor-cap
migration and dry climb. It neither modifies the roof pocket nor relies on a
claim that the roof-retention package has executed; it must be recompiled and
fresh-preflighted from the then-current accepted source. The only permitted
future ordering is therefore:

1. The shared capture lane is explicitly released. MP01's functional control
   hold is disjoint and is not a physical prerequisite for this retention
   scope.
2. A new complete immutable source confirms the five-water source set, dry
   chamber/shell, zero-gravel interface, no protected containers/block
   entities, and no live entities for the retention scope. The complete
   retention kernel, post topology QA, and rollback-poststate proof must pass.
3. Only from that accepted post state may the ramp obtain a new source,
   rebind its 52-cell R09 migration, run its own full kernel, and prove the
   predecessor/interface, route grade, and rollback post-state.

A failed gate leaves the affected package unbuilt and does not authorize a
fallback to the other package. These are civil enclosure/corridor candidates
only: no rail, power, signalling, vehicle, passenger path, or service opening
is included.

R07 retention and the R07–R09 civil galleries/tubes are unaffected. No rail,
route, or passenger service is commissioned.

## Accepted exception: roof-pocket containment-03

The isolated five-cell roof-pocket containment has now passed a separate fresh
kernel and is as-built. It is bounded to its shell, five retained water cells,
five original-pocket liner cells, and the preserved disconnected source-water
cell at `(-66,39,-466)`. The latter was proved pre-existing in a separate
one-cell component; it is neither moved nor newly introduced. See
`RAIL-S3-R10-ROOF-RETENTION-03-RELEASE.md` for the complete source/post,
execution, topology, and rollback evidence.

This partial civil containment closure does not close the open-basin hold,
authorize an upper horizontal successor, or change the no-service/no-passenger
boundary. The separate upper ramp is now as-built; see
`RAIL-S3-R10-UPPER-RAMP-02-RELEASE.md`.

The first 20-column upper continuation is also as-built; see
`RAIL-S3-R10-UPPER-CONTINUATION-02-RELEASE.md`. Its next capped successor is
offline only in `RAIL-S3-R10-UPPER-CONTINUATION-03-OFFLINE.md`; neither alters
the normal-alignment open-basin hold nor creates a passenger route.

The next upper successor required a staged 88-cell gravel treatment rather
than a standard dry release. It has since passed its fresh gravity kernel; see
`RAIL-S3-R10-UPPER-CONTINUATION-GRAVITY-01-RELEASE.md`.

The subsequent standard upper successor is independently held by a new local
water interface at `(23,39,-462)`. See
`RAIL-S3-R10-UPPER-CONTINUATION-05-FLUID-HOLD.md`. This is not an extension of
the normal-alignment basin claim: it is a separate upper fluid boundary that
must be mapped before a finite containment design can exist.
