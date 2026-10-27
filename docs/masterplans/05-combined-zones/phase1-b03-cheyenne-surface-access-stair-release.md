# BKR-B03-ACCESS-01 · Cheyenne B03 surface access stair

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-B03-ACCESS`
**Source:** accepted R08AM post; fresh live source `data/worldsnap-b03-access-source-20260825T003000Z`
**Manifest identity:** `3ca35c7dc93dc51eb8e3f2a336155a1ceb489fcfb2fe57b985d81afdf4d6efa9`

The commissioned B03/Cheyenne corridor (indices 188..800, walkable floor at
y=165 spanning x=2048..2390) is a sealed buried gallery with NO vertical access
to the surface. This package gives it its first real entrance: a 2-wide
smooth-stone stair ascending from the corridor floor at the north-portal area
(x=2235..2236, z=-746..-750) up through the portal roof into the open mountain
cavity and on to the surface level (y=200).

## Scope

- **78 exact targets**:
  - 72 stair treads (2-wide × 36 risers, y165..200, ascending north), including
    the polished-diorite portal roof cells (y170) converted to treads
  - 6 headroom-cleared cells above the treads where the roof was solid
- The stair passes through the R07A portal roof at y170 and emerges into the
  open cavity above, giving walkable access from the sealed corridor to the
  surface.

## Hard-safety kernel evidence

- Forward source preflight: 78/78 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 78/78 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-b03-access-post-20260825T003200Z`.
- Post-state verification: 72/72 treads smooth_stone, roof opened on the stair
  path, corridor floor intact.
- Rollback post-state preflight: 78/78 PASS.
- Route proof: stair-aware flood from the corridor floor reaches y=200 (surface).

## Artifacts

- Compiler: `scripts/compile_b03_cheyenne_surface_access_stair.mjs`
- Ops: `data/buildops/b03-cheyenne-surface-access-stair.access-stair.{forward,rollback}.txt`
- Manifest: `data/buildops/b03-cheyenne-surface-access-stair.release-manifest.json`
- Evidence: `data/world-review/b03-access-live-20260825T003100Z/`

## Boundary

This opens a physical stair to the surface. It does NOT commission public/
secure access, access-control, power, signaling, mechanisms, the Cheyenne
chamber/terminal, or any B09 rail interface. The corridor remains a
passive-inspection route; this package only gives it an entrance.
