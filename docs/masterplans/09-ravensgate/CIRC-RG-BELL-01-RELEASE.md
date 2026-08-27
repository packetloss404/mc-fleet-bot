# CIRC-RG-BELL-01 · Bell-Gate campanile 2-wide stair

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-RAVENSGATE`
**Source:** fresh live source `data/worldsnap-rg-bell-source-20260825T180000Z`
**Manifest identity:** `5b75f77dc487844b3a38b55d84cf0a8971c518c3c8397fa3f741d2af6b3ded82`

The Bell-Gate campanile (Ravensgate) had only a 1-wide spiral stair
(x=-109..-107, z=-431..-429, y68..106) as its vertical circulation. This
package adds a 2-wide switchback stair in the open east space
(x=-106..-105, z=-433..-429) connecting the tower floors, preserving the
spiral.

## Scope

- **103 exact targets**: 58 polished_deepslate_stairs (2-wide switchback, 5
  risers per run between floors y70..95) + 45 headroom clears.
- The original 1-wide spiral is preserved untouched.

## Hard-safety kernel evidence

- Forward source preflight: 103/103 PASS.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 103/103 changed, 0 failed, 0 no-ops.
- Post-state verification: 58/58 new treads, spiral preserved.
- Rollback post-state preflight: 103/103 PASS.

## Artifacts

- Compiler: `scripts/compile_circ_rg_bell_campanile_stair.mjs`
- Ops: `data/buildops/circ-rg-bell-campanile-stair.campanile-stair.{forward,rollback}.txt`
- Evidence: `data/world-review/rg-bell-live-20260825T180500Z/`

## Boundary

Adds public-grade vertical circulation to the campanile. Does not claim the
building is public, accessible, or a fire-service route.
