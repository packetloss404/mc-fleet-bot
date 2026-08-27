# MP01 active utility / emergency-control boundary 02

**Status:** current-source design constraint; no active mechanism is released by
this record.

## Accepted physical predecessor

The accepted post-state
`data/worldsnap-mp01-service-vestibule-01-post-20260826T052000Z` now has a dry
manual sequential boundary:

| Interface | Exact state |
|---|---|
| Outer service door | `(2008,166..167,-894)`, closed manual iron door |
| Dry vestibule | `(2007,166..171,-894)`, air |
| Inner service door | `(2006,166..167,-894)`, closed manual iron door |
| Reservoir protection | `(2009..2024,166..171,-896)`, continuous white-concrete wall |

This is a valid restricted access boundary, not a powered interlock, airlock,
pressure system, emergency exit, or public route.

## First genuine active-utility candidate

The next active scope must be a **contained manual utility control** that has a
demonstrable local effect and cannot alter reservoir water, door position, or a
public/restricted classification. A candidate circuit may control only its
dedicated indicator/fixture cells inside a newly surveyed isolated control
enclosure. It must not attach to either door, the reservoir liner, or existing
route lighting.

## Hard design gates before compilation

1. Capture a fresh source and survey the chosen enclosure, including all six
   neighbours of every reactive block.
2. Declare every possible reactive successor state (lever, redstone wire,
   lamp, repeater, piston, etc.) and verify the server's actual post-update
   state set in a disposable reviewed test envelope or equivalent exact
   current-world proof.
3. Generate a forward operation whose expected post states match the server's
   settled topology, then prove the inverse against that immutable post.
4. Run a functional toggle test only as part of the scoped release procedure:
   test state, reset state, **new immutable post capture**, then rollback
   poststate preflight. A lamp or lever that changes its neighbour state outside
   the declared set is a hard stop.
5. Keep the manual vestibule doors closed and reservoir wall/water untouched
   throughout. No active utility package may imply life safety, air pressure,
   evacuation, or complex commissioning.

## Why no redstone package is being guessed

Redstone blocks settle into neighbour-dependent block states after placement.
A naive `air -> wire/lamp/lever` inverse would be invalid if those settled
states differ from the authored state, defeating the strict rollback kernel.
The accepted static service boundary remains useful, but it cannot be
mislabelled as an active utility system. This document preserves the exact
route to a real control release rather than substituting decorative panels.
