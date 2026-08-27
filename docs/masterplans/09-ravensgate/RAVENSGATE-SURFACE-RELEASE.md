# CIRC-RG-SURFACE-02 — Ravensgate NW Garth pedestrian connection

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE**

## What was built

Surfaced the clean grass/dirt gap (`x=-123..-115`, `y=67`, `z=-457..-451`)
between the existing NW gravel feeder trunk (Approach Road side, `z=-462..-458`)
and the Ravensgate north plaza (stone bricks, `z=-450`) with **cobblestone**,
matching the CIRC-RG-SURFACE-01 garden-loop walk material. This completes the
Approach Road → Ravensgate pedestrian connection: the Approach Road's
2-wide pedestrian edge (CIRC-WL-ARRIVAL-ROAD-01) now connects via the gravel
trunk and this surfaced gap into the Ravensgate north plaza.

**63 exact targets** — all source cells were `grass_block`/`dirt` with a solid
`y=66` base, clear two-block headroom, and a zero-fluid/zero-container/zero-block-
entity interaction halo.

## Long Water / water-table boundary (unchanged hold)

The south garden-loop segment (`z=-455..-550`) remains a **founded-walk hold**
above the `y=66` water table and against the Long Water pond. It is untouched.

## Evidence

- Ledger: `data/world-review/ravensgate-surface-live-20260824T211631Z/`
- Compiler: `scripts/compile_ravensgate_surface_nw_garth_connection.mjs`
- Forward ops: `data/buildops/ravensgate-surface-nw-garth-connection.connection-walk.forward.txt`
- Rollback ops: `data/buildops/ravensgate-surface-nw-garth-connection.connection-walk.rollback.txt`
- Release manifest: `data/buildops/ravensgate-surface-nw-garth-connection.release-manifest.json`
- Manifest identity: `86bd62a3b6a39b8023dfc2999e2b8a0642de29ec20945ab6fa7821384706da2e`
- Source snapshot: `data/worldsnap-ravensgate-surface-source-20260824T211000Z`
- Post snapshot: `data/worldsnap-ravensgate-surface-post-20260824T211700Z`
- Forward execution: **63/63 changed, 0 failed, 0 no-op** (strict-noop)
- Block-entity audit: **0 conflicts** (69 block entities protected)
- Live-entity gate: **0 blockers**
- Rollback post-state preflight: **63/63 PASS**
- Post-state verification: **63/63 cobblestone; 60/60 trunk gravel preserved**

## Boundaries retained

- Gravel feeder trunk (Approach Road side) untouched;
- Ravensgate north plaza untouched;
- Approach Road 2-wide pedestrian edge untouched;
- Long Water pond untouched (founded-walk hold unchanged);
- restricted underground volume and its `Y 36..43` buffer untouched;
- no block entity, container, control block, or protected feature touched;
- no mob was relocated or killed (live-entity gate reported 0 blockers).

## Regression

```bash
npx vitest run test/build/ravensgateSurface.test.ts
```
