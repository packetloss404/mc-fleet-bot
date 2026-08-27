# Raven Rock — current build control

**Control date:** 2026-08-26

The current physical control source is the R08AM-bound Bunker Construction
Status report. It supersedes catalog-complete and historical-Wave-2 language
when those records are used to claim present construction.

## Current exact state

- **No current accepted whole Raven Rock complex release** exists.
- The 335-cell S1 pilot was executed and emergency-rolled back.
- The 151-cell T2B pilot was accepted historically, but only one target remains
  exact in R08AM; 150 cells were superseded by later fabric.
- Current blocks around the former T2B volume are observed physical fabric with
  unattributed Raven Rock provenance, not proof of a command center, cavern,
  portal, shaft, reservoir, or completed underground complex.
- BKR-SURVEY-00 has been completed. BKR-RR-Z5-01 then added 16 landing lights
  and a return sign to the existing 2-wide service shaft; it is as-built,
  post-verified, and remains non-public. RR-C2-01 installed a 60-cell dry-side
  containment cap, leaving flooded Cavern C closed as a permanent wet hold.
- MP08-RR-DRY-SIDE-SURVEY-01 re-read the latest retained RR-C2 post-state
  (`data/worldsnap-rr-c2-post-20260825T052631Z`) without mutating the world.
  It confirms the ten-station dry no-jump approach from `(-70,-11,-14)` to
  `(-79,-11,-14)` and the 61-cell cap assembly (60 stone-brick targets plus
  retained gold ore). It emits **no new operation**: the apparent floor patch
  at `(-77,-12,-12)` has retained water at `(-78,-12,-12)` in its one-cell
  interaction halo, while the surveyed C2 bounds contain 6,834 fluid cells.
  This is a source-bound historic survey, not a live release or a wet-cavern
  access claim.
- MP08-RAVEN-ROCK-CURRENT-SCOPE-02 then compared the newest retained C2 post
  (`2026-08-25`) with the separate RR-Z5 post (`2026-08-24`) without treating
  them as one source. C2's ten dry stations and protected 61-cell cap remain
  exact, with zero dry-approach block entities; RR-Z5 remains an already-built
  2-wide service shaft. Neither snapshot contains `entities/`, and they are
  not same-moment coverage. Thus there is no bounded, current-source,
  saved-entity-safe micro-scope outside the C2 water boundary.
- MP08-RR-T1B-WAYFINDING-01 is accepted as a separate, bounded restricted-route
  improvement. A fresh complete source/post pair, exact state-and-NBT inverse,
  strict four-group zero-noop execution, zero entity/block-entity clearance,
  and independent 76-station normal-walk QA prove two wall signs on the
  already traversable RR-T1b leg. It does not alter C2, Cavern C, RR-N6, T4,
  or any public/egress classification.
- A fresh rebind of the historical RR-B2 equipment-rack package found all
  `39/39` intended fixture cells already as-built, with zero target/halo block
  entities. It correctly emitted no duplicate release. Its old operation files
  are not reusable: modern canonical-state QA rejects 18 bare note-block
  states, so any future RR-B2 change requires a newly compiled exact package.
- The current complete MP07 post-source C1 re-screen finds its apparent
  `x=-1..1` dry centre strip is not a contained component: all `56/56`
  nominal walking stations open vertically into the cavern volume, and
  `z48`, `z49`, and `z51` have multiple valid floor elevations. Both end
  interfaces are fully open (six crossing cells each) to Caverns A/B. The
  core is dry and contains zero tested fluid/gravity/container/control hazards
  and zero core block entities, but it has no proved roof, vestibules, closure,
  canonical profile, or accepted exact 3-D C1/Cavern interface owner. The
  screen emitted no operation and retains all C2/Cavern C/RR-N6/T4 exclusions.

## Route classification

- RR-Z5 now has verified lighting and return wayfinding, but its 2-wide service
  envelope is not a public-route, accessibility, or egress acceptance.
- C2 is intentionally capped at the dry-side boundary; Cavern C remains closed
  because the continuation is water-filled and no durable dry corridor is
  available.
- RR-T1b now has verified advance and return wayfinding on its existing
  restricted three-wide core. That is legibility work, not public-route or
  accessibility acceptance.

## Next builder action

The condition survey and the only safe RR-Z5 repair are complete. The next
Raven Rock physical program requires an exact, dry, independently contained
route or an alternate-route design; Cavern C must remain closed unless a future
package proves a durable containment and 3-wide by 3-high route without
disturbing the water table.

For C1, the current source now has a finite non-authorizing bilateral setout:
the retained 56-station stepped core, both six-cell Cavern A/B thresholds,
two 5-wide/3-clear vestibule reservations, and sealed no-discharge underfloor
drainage reservations. It still needs named C1/Cavern A/Cavern B owners, exact
door/receiver/rollback sets, and reverse-route proof before any operation may
be compiled. See [C1 bilateral containment contract 01](MP08-C1-BILATERAL-CONTAINMENT-CONTRACT-01-2026-08-26.md).

## Evidence

- `docs/redevelopment/2026-08-22-bunker-construction-status/bunker-construction-status.json`
- `data/world-review/cross-district-circulation-audit-20260822.json`
- `docs/masterplans/08-raven-rock/BKR-RR-Z5-01-RELEASE.md`
- `docs/masterplans/08-raven-rock/RR-C2-01-RELEASE.md`
- `data/world-review/mp08-raven-rock-dry-side-survey-01-historical-20260826.json`
- `data/world-review/mp08-raven-rock-current-scope-02-20260826T090000Z.json`
- `data/world-review/rr-z5-repair-live-20260824T185730Z/`
- `data/world-review/rr-c2-live-20260825T052758Z/`
- `docs/masterplans/08-raven-rock/MP08-RR-T1B-WAYFINDING-01-RELEASE.md`
- `data/world-review/mp08-rr-t1b-wayfinding-live-20260826T104858Z/evidence-ledger.json`
- `data/world-review/ravenrock-rr-b2-mp08-post-rebind-20260826T104858Z/RR-B2-EQUIPMENT-RACK-FURNISHING-NOOP-HOLD.md`
- `data/world-review/mp08-c1-dry-component-screen-20260826T123537Z.md`
- `data/world-review/mp08-c1-contained-route-screen-02-mp07-post-20260826T141000Z/MP08-C1-CONTAINED-ROUTE-SCREEN-02.md`
