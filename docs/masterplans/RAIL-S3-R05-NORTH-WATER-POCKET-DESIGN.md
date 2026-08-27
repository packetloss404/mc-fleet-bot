# RAIL-S3-R05 · north water-pocket containment

**Status:** SURVEYED — PARTITIONED CONTAINMENT REQUIRED

R05 cannot use the earlier one-cell retained-water bypass pattern. Expanded
read-only flood-fill now proves a bounded **84-cell all-source-water** component
at `x=-163..-156`, `y=13..16`, `z=-463..-453`, including north-tube interior
and outer-liner cells. It has no connection to the expanded survey boundary.

Any future release must first set out a separate sealed retention chamber with
at least 84 exact water cells outside both running-tube envelopes and the
service gallery. It must then partition the full component, establish outer
caps and side liners in a flow-safe order, fill the sealed retention chamber,
and only then clear tube cells. The package must bind a new complete source
snapshot and include exact inverse, fluid-state, block-entity, entity,
post-capture, rollback, tube cross-section, and gallery-interface checks.

The selected candidate is a north-exterior 96-cell chamber:
`x=-163..-156`, `y=13..16`, `z=-466..-464`. Its 84-cell ordered retained-water
set leaves 12 reserve cells; its shell is at `x=-164/-155`, `y=12/17`, and
`z=-467/-463`. A fresh-source compiler must prove that every shell face and
retention target is exact, container-free, and outside both tube envelopes
before it may emit staged operations: shell, water transfer, original-pocket
liner, temporary-cage restoration, and exact inverse.

No R05 tube, rail, route, or passenger-service work is authorized by this
survey.

Evidence: `data/world-review/rail-running-tube5-live-20260826T035800Z/north-fluid-interface-survey.json` and
`data/world-review/rail-running-tube5-live-20260826T035800Z/connected-water-expansion.json`.
