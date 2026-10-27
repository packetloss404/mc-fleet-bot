# CIVIC-RRCH-MOOT-UPPER-SPINE — accepted scoped repair

Status: **executed, independently verified, and reversible**

This release fixes the actual vertical-circulation defect in the Ravensreach
Moot Hall upper stack. It does **not** claim the adjacent Committee Room,
Meeting Room, or Attic Store are now fully programmed, public, or safe exterior
egress routes.

## What changed

The old two-wide bell-core path was replaced within the exact envelope
`x=-100..-92, y=73..93, z=-393..-341` by a controlled upper spine:

- 7-block clear width and 6-block clear height;
- two south-running, 7-rise / 14-run flights (one rise per two run);
- three 7-deep level landings at support Y73, Y80, and Y87;
- enclosed side/end walls, roof, and paired wayfinding lights;
- a verified normal-walk path in both directions from
  `-96 74 -389` to `-96 88 -346`.

The Y87 endpoint remains a **controlled service landing**. This release does
not create public exterior discharge, a second protected direction, Ravensgate
access, or a generic room-completion acceptance.

## Immutable evidence

| Check | Result |
|---|---|
| Fresh source complete save | PASS, `a0d12c2670070c2f0cedc656b953c7d210114b5188afbca14e47d846755b6a10` |
| Exact operations | 3,513 changed / 5,313 target cells; forward `39cf9bde…`, rollback `b84e4683…` |
| Source preflight | 3,513/3,513 pass; `a82b0122…` |
| Strict parser checks | forward and rollback pass; no leftovers |
| Block entities | PASS, 0 target overlaps; `23441202…` |
| Same-moment live entities | PASS, 0 blockers; `d1e0cfea…` |
| Strict RCON execution | 3,513 changed, 0 failures, 0 no-ops; `a66804b2…` |
| Fresh post complete save | PASS, `fcac822d2de9873a071407ce8c01cc26784575f89e4d855686f32eb08adf19c5` |
| Rollback post-state preflight | 3,513/3,513 pass; `6d4bcb17…` |
| Independent post QA | PASS; 7-wide/6-high, 1:2 rise/run, 7-deep landings, bidirectional normal walk; `aceb41a9…` |

Evidence root:
`data/world-review/civic-rrch-moot-upper-spine-live-20260822T180000Z`.

The local post-state image is
`data/world-review/civic-rrch-moot-upper-spine-live-20260822T180000Z/moot-upper-spine-interior.png`.

## Next work

Run the remaining `CIVIC-RRCH-MOOT-UPPER-01` room-programme release from a
new source snapshot. It must preserve this new spine and prove each room's
measured aisle, threshold, furnishings, lighting, and classification. No one
should use this success as permission to scatter fixtures into sloped/open
registered room boxes.
