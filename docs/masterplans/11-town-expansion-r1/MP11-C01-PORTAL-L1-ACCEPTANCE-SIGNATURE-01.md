# MP11 C01 portal-to-L1 acceptance signature 01

This is a **read-only, fail-closed design-input validator** for the current
MP11 portal-to-L1 route contract. It is not an operation compiler and grants
no construction, RCON, access-opening, commissioning, or egress authority.

The governing current-source packet is
[`MP11-C01-PORTAL-L1-ROUTE-CONTRACT-02`](../../../data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/MP11-C01-PORTAL-L1-ROUTE-CONTRACT-02.md).

![Acceptance-signature decision map](../../../data/world-review/mp11-c01-portal-l1-current-source-20260826T163300Z/mp11-c01-portal-l1-acceptance-signature-map.svg)

## What a signature must prove

- One named, non-placeholder controlled-spine owner accepts stations 0–126 and
  the exact 25→26 handoff. No implicit bilateral or proximity-based ownership
  is accepted.
- A finite 127-station, 5×5 route design binds the current portal and L1
  endpoints, its exact coordinate-set hash, and the source handoff.
- One or more finite 5×5 landings have distinct route stations and independent
  bidirectional return-path hashes.
- The same owner accepts the full 1,686-cell gravity source inventory, an
  ordered containment sequence, a permanent post-state, and both
  no-temporary-support and no-falling-rollback safeguards.
- Finite forward and reverse normal-walk proofs bind both endpoints and cross
  the exact handoff in each direction.
- Forward and rollback manifests carry complete canonical block states and
  prove an exact inverse over the same finite cell set.

Run the focused regression with:

```bash
npx vitest run test/build/mp11C01PortalL1AcceptanceSignature.test.ts
```

Even an accepted result is only a source-bound design input. A separate fresh
source, exact target/halo, full inverse package, and guarded release kernel
remain mandatory before any physical work.
