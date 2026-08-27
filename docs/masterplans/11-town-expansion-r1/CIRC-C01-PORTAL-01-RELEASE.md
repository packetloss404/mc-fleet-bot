# CIRC-C01-PORTAL-01 · C01 mountain portal → L1 stair shaft

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-C01-BUNKER`
**Source:** accepted R08AM post; fresh live source `data/worldsnap-c01-portal-source-20260825T004500Z`
**Manifest identity:** `d027265c9765db099fde94260d20c4e7f471c5a2a216adf73c57a017087678b1`

The recessed mountain portal forecourt (walkable y=67 at x=695,z=-52) had no
path to the L1 airlock (walkable y=42 at x=701,z=-81) — a 25-block vertical gap
through solid mountain. This package carves a clean 2-wide stair shaft and a
bottom tunnel, giving the east-C01 portal a walkable route into L1 for the
first time.

## Scope

- **256 exact targets**:
  - 54 stair treads + bridge landing (2-wide, 26 risers descending y67→y42,
    smooth_stone), including the portal connection
  - 100 shaft-excavation cells (2-block headroom envelope carved to air)
  - 28 tunnel-floor cells (smooth_stone) + 46 tunnel/doorway air cells
- The stair path avoids all gravity bands (shifted +2 in z); the full envelope
  is gravity/fluid/container-free.

## Hard-safety kernel evidence

- Forward source preflight: 256/256 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 256/256 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-c01-portal-post-20260825T005100Z`.
- Post-state verification: 52/52 treads, 28/28 tunnel floor, doorway open, L1
  floor intact.
- Rollback post-state preflight: 256/256 PASS.
- Route proof: stair-aware flood from the portal forecourt reaches L1.

## Artifacts

- Compiler: `scripts/compile_c01_portal_l1_stair_shaft.mjs`
- Ops: `data/buildops/c01-portal-l1-stair-shaft.stair-shaft.{forward,rollback}.txt`
- Manifest: `data/buildops/c01-portal-l1-stair-shaft.release-manifest.json`
- Evidence: `data/world-review/c01-portal-l1-live-20260825T005000Z/`

## Boundary

This opens a walkable pedestrian route from the surface portal to L1. It does
NOT commission vehicle access, the vehicle ramp, public/secure classification,
power, mechanisms, or the full C01 bunker. It resolves the last failed
cross-area route from the circulation audit.
