# CIRC-RG-SURFACE-01 — Ravensgate garden-loop walk

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE**

## What was built

Surfaced the dry garden-loop segment from the South Stoa plaza toward Long
Water with a two-clear-wide cobblestone walk at `x=-86..-85`, `y=67`,
`z=-431..-453`. 6 grass/dirt cells converted to cobblestone, completing the
walkable connection at the Stoa end of the garden loop.

## Long Water / water-table boundary (documented hold)

The south segment of the intended loop (`z=-455..-550`) sits directly above a
`y=66` water table and against the Long Water pond (`z=-455..-458`). The
safety kernel fails closed on any fluid in the interaction halo, so that
segment requires a **founded-walk design** (a solid base separating the walk
from the water table) before surfacing. It is recorded as a local hold, not
touched.

## Evidence

- Ledger: `data/world-review/civic-rg-surface-01-live-20260824T012500Z/`
- Forward execution: **6/6 changed, 0 failed, 0 no-op** (strict-noop)
- Block-entity clearance: 0 hits (73 block entities protected)
- Live-entity clearance: 0 hits
- Rollback post-state preflight: PASS
- Post snapshot: `data/worldsnap-civic-interiors-rg-surface-01-post-20260824T012500Z`

## Boundaries retained

- Long Water pond untouched;
- Stoa plaza, tempietto, Bell-Gate, Loggia untouched;
- restricted underground volume and its `Y 36..43` buffer untouched (no
  underground shortcut);
- all block entities protected.
