# SYS03 passenger-rail commissioning acceptance gate 01

**Status:** `SOURCE_BOUND_DEFAULT_DENY__NO_SYS03_PASSENGER_SERVICE_COMMISSIONED`

This source-bound gate makes the distinction explicit: High-16 is a sealed civil
void and B09 is a protected maintenance asset. Neither is passenger rail. This
artifact is read-only; it makes no operation, RCON call, release manifest, or
opening decision.

![Current-source commissioning gate map](../../data/world-review/sys03-passenger-rail-commissioning-acceptance-gate-01-sys03-post-20260826T153100Z/sys03-passenger-commissioning-gate-map.svg)

## Bound source and observed state

- Complete immutable capture: `combined-zones-164242406931474fb7531e6ffbb389be` (130 required members).
- Region identity: `3e0d739e5ceda6fb9a828e9b5947e15d00864f7f15f54d1c099e011477e3bcfd` (52 files).
- High-16: 46 connected civil stations; civil-only is retained.
- B09: 19 protected maintenance cells (15 inactive powered rails, two protected stops, two off controls, one authenticated cart). Its lower void is 12 air cells at `6×2×1`, not an accepted platform.
- Passenger facts accepted on this source: zero station pairs, platforms, directional guideways, controls, rescue discharges, closed trials, and return-service acceptances.

## Every gate is required

| Gate | Accepted now | Required evidence |
| --- | ---: | --- |
| PC-01-ROUTE-AND-STATION-PAIR | 0 | Two named public station interfaces; exact public approach, two independent exits, and post-state normal-walk proof in both directions. |
| PC-02-DIRECTIONAL-GUIDEWAY-SEPARATION | 0 | Two directionally isolated guideways or accepted equivalent, complete rail/support geometry, 6×6 parallel service corridor, sealed interfaces. |
| PC-03-PLATFORM-EDGE-AND-BOARDING | 0 | Owned 24-block platforms, edge prevention, gates, clear boarding zones, lift analogue, and accessible return path. |
| PC-04-SIGNAL-POWER-FAILSAFE | 0 | Detector, signal, occupancy, launch, brake, recovery, power-loss and OUT-OF-SERVICE state evidence for every block. |
| PC-05-RESCUE-AND-RECOVERY | 0 | Signed cross-passages, continuous service evacuation, two independent protected discharges, cart recovery, and no rail-walking dependency. |
| PC-06-CLOSED-TRIALS-AND-RESET | 0 | One-cart occupied-block, forward/return, stop, evacuation, reset, rollback and entity-census trials recorded against one immutable post. |
| PC-07-OPERATING-AND-RETURN-ACCEPTANCE | 0 | Both service directions and passenger return accepted; staff procedures, fault handoff, map labels, and restrictive interfaces retained. |
| PC-08-FRESH-GUARDED-RELEASE-KERNEL | 0 | Fresh complete source, exact forward/inverse, strict-noop parser checks, live clearance, journaled execution, post snapshot and rollback post-preflight. |

## Hard separation

- Civil corridors, lights, passive rail, a maintenance cart, or a one-way traversal are **not** passenger-service evidence.
- B09 remains physically and operationally separate; its controls cannot be repurposed.
- No partial, one-way, one-exit, or maintenance-lane opening is permitted.
- Any future physical package starts from a fresh snapshot and independently passes the full guarded release kernel.

## Verification

`node scripts/validate_sys03_passenger_rail_commissioning_acceptance_gate_01.mjs`
`npx vitest run test/build/sys03PassengerRailCommissioningGate.test.ts`
