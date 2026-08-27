# MP01 direct-lamp east sequential gated-path contract 01

**Status:** validator and fixture contract only. It records no live interaction,
door conversion, path use, access grant, or commissioning.

The restricted east-boundary design has two sequential leaves at
`(2006,166..167,-894)` and `(2008,166..167,-894)`. The validator in
`src/actions/validateMp01GatedBoundaryInteraction.ts` accepts a submitted
trace only when every condition below is present:

- eight exact `mineflayer.activateBlock` events: west open/close then east
  open/close for outbound, followed by east open/close then west open/close
  for return;
- exact actor feet and door targets for each event;
- two independent settled state observations after every event;
- spruce leaves use the exact west-facing, left-hinge, `powered=false` state;
- one leaf may be open, but no observation may contain both leaves open;
- every close event returns both leaves to their exact closed state.

A passing validator result is deliberately
`VALID_TRACE_REQUIRES_INDEPENDENT_LIVE_ATTESTATION`, never a live acceptance.
It only proves that submitted evidence has the required structure and states.
Independent review of a real immutable post-interaction capture, the static
four-cell guarded-release kernel, a gated-path passability proof, and an exact
owner-bound origin/return route remain mandatory.

No public/service opening, egress, access-control commissioning, direct-lamp
functional acceptance, or MP01 completion is claimed.
