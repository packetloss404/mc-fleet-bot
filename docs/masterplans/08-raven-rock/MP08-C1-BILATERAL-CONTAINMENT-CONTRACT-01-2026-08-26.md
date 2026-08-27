# MP08 C1 bilateral containment contract 01

**Status:** `SOURCE-BOUND DESIGN; NOT ACCEPTED FOR MUTATION`.

This is the first finite containment/vestibule setout for the dry C1 core. It
is deliberately not an operation file, owner acceptance, door approval, or
claim that C1, Cavern A, Cavern B, C2, Cavern C, RR-N6, or T4 is open.

## Immutable source basis

- Snapshot: `data/worldsnap-sys03-high16-descending-post-20260826T153100Z`
- Capture ID: `combined-zones-164242406931474fb7531e6ffbb389be`
- Capture-manifest SHA-256:
  `0aa2f9dde67ceb9cdaf29e5b22e3eeaf25e8c5026957c515337af75a749041d9`
- Existing route: 56 stations, three-wide, with 504 exact
  support/body/head cells; coordinate-set SHA-256
  `45e7f8d1415f1ff8d19ef50cb37860150268f24f62b7ed84512c567d735745a3`.
- Source census: zero core fluid, gravity, container, control, and block-entity
  hazards. These facts do **not** prove containment or ownership.

## Required profile and interface geometry

| Segment | Existing route floor | Required contract disposition |
| --- | --- | --- |
| C1 lower | `x=-1..1`, `z=15..26`, floor `y=-12` | C1 owner retains floor, sidewalls, roof, and transition headroom. |
| C1 middle | `x=-1..1`, `z=27..54`, floor `y=-11` | C1 owner retains floor, sidewalls, roof, and transition headroom. |
| C1 upper | `x=-1..1`, `z=55..70`, floor `y=-10` | C1 owner retains floor, sidewalls, roof, and transition headroom. |
| Cavern A threshold | `x=-1..1`, `y=-11..-10`, `z=14` | Six open crossing cells; outer door plane requires reciprocal Cavern A acceptance. |
| Cavern B threshold | `x=-1..1`, `y=-9..-8`, `z=71` | Six open crossing cells; outer door plane requires reciprocal Cavern B acceptance. |

The C1 owner must additionally own the level transitions at `z=26` and `z=54`.
No design may replace these stairs with a one-block ledge, a narrow landing, or
a floor-only tunnel.

## Proposed bilateral vestibule reservations

The reservations below are geometric proposals only. They become mutable only
when the C1 and named cavern owner each accept the exact target, retained, and
rollback sets.

| Vestibule | Footprint | Clear route | Door / access boundary |
| --- | --- | --- | --- |
| A | five-wide outer reservation at `z=11..14`, base `y=-12` | retained three-wide centreline | The C1→vestibule plane is **not** a door line. The outer plane is held for exact reciprocal Cavern A door/threshold approval. |
| B | five-wide outer reservation at `z=71..74`, base `y=-10` | retained three-wide centreline | The C1→vestibule plane is **not** a door line. The outer plane is held for exact reciprocal Cavern B door/threshold approval. |

Both vestibules require continuous two-block body/head clearance, 3-wide
normal-walk proof in both directions, explicit retained perimeter states, and
a closeable boundary whose state/NBT inverse is specified before execution.

## Containment, drainage, and return conditions

- Reserve, but do not excavate or discharge, C1 underfloor drainage at
  `x=-1..1`, one block below each stated C1 floor, `z=15..70`.
- Reserve the A underfloor strip at `z=11..14`, `y=-13`, and the B strip at
  `z=71..74`, `y=-11`. Each remains sealed and has no external discharge until
  a separately owned receiver/outfall is accepted.
- The only proposed return path is the complete existing 3-wide C1 core plus
  both verified vestibule centrelines. Neither cavern threshold may be counted
  as an exit until its owner accepts the outer door plane, exterior receiver,
  and reverse route.
- C2, Cavern C, RR-N6, T4, water displacement, public access, emergency
  egress, and transport are excluded.

## Acceptance gate

Before an operation compiler may run, the record must name C1, Cavern A, and
Cavern B owners; exact target/retained/rollback coordinate sets; door state and
block-entity policy; the two drainage receiver decisions; bilateral
normal-walk/return anchors; and a complete source snapshot. Any missing
interface holds the affected vestibule and does not authorize an adjacent
partial build.

## Map and source screen

- [Current C1 containment/interface map](../../../data/world-review/mp08-c1-contained-route-screen-04-sys03-post-20260826T153100Z/mp08-c1-containment-and-interface-map.svg)
- [Current source screen](../../../data/world-review/mp08-c1-contained-route-screen-04-sys03-post-20260826T153100Z/MP08-C1-CONTAINED-ROUTE-SCREEN-02.md)
