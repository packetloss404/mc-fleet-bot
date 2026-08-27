# MP01 active-control revision 02 — production actuation constraint

**Status:** offline design-held; no production mutation authorized.

## Current observed state

The final reset snapshot shows the isolated circuit at
`x=2001..2003, y=166, z=-902` with the intended OFF lever, wire, and lamp
states. The adjacent staging-room envelope is dry and has no door or reservoir
target.

The disposable Paper proof showed a direct RCON lever state write can produce
wire power 15 and an illuminated lamp. The live immutable ON snapshot instead
showed the exact lever ON state but wire power 0. This is an **actuation-model
difference**, not an accepted active-control result.

## Revised topology and proof route

The next test shall not use a wire-dependent control as the primary indicator.
It must first prove a **directly powered lamp topology** in disposable
same-version Paper: an isolated switch/support block, direct lamp, and a
separate non-reactive witness block. The probe must execute the exact proposed
production actuation command, then enumerate every settled state after OFF,
ON, and reset.

Before compiling any live replacement, perform a zero-footprint live actuation
calibration on a separately authorized disposable mechanism envelope, using
the same RCON command semantics. If it cannot produce an observable neighbour
update, the correct implementation path is a reviewed bot interaction/real
click transaction with exact identity, position, and reset proof—not another
state-write assumption.

## Non-negotiable invariants

- The existing failed circuit remains reset at OFF and is not treated as a
  control.
- No test or replacement may target either vestibule door, reservoir water,
  liner, south wall, or route light.
- A direct lamp may be accepted as powered only after immutable live OFF/ON/OFF
  snapshots prove its exact states and final rollback preflight passes.
- No result establishes life safety, airlock, emergency egress, public access,
  or MP01 completion.
