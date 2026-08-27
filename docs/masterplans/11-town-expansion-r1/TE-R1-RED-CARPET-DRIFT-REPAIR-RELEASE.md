# TE-R1-RED-CARPET-DRIFT-REPAIR · Town Expansion red-carpet drift restore

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Source:** accepted R08AM post; fresh live source `data/worldsnap-te-redcarpet-source-20260824T220000Z`
**Manifest identity:** `a752ab371a48c88ed6edfa235f1b305d6674204ca5df5f098f5b96257dcdef6e`

The Town Expansion R1 drift survey (`data/world-review/town-expansion-drift-survey-20260824/`)
found the committed 49-cell red-carpet area at `y=52, x=-9..-3, z=-400..-392` had
lost 40 `red_carpet` cells (now air) since the committed post; 9 were already
restored by the town-expansion-current-safe-supplement. This package restored the
40 drifted cells to their committed state.

## Scope

- **40 exact targets** (`minecraft:air` → `minecraft:red_carpet`), all in the
  committed red-carpet area at `y=52`.
- Preserves the 9 already-restored red_carpet cells and all adjacent structures.

## Hard-safety kernel evidence

- Forward source preflight: 40/40 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 40/40 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-te-redcarpet-post-20260824T220600Z`.
- Post-state verification: 49/49 red_carpet cells present.
- Rollback post-state preflight: 40/40 PASS.

## Artifacts

- Compiler: `scripts/compile_town_expansion_red_carpet_drift_repair.mjs`
- Ops: `data/buildops/town-expansion-r1-red-carpet-drift-repair.red-carpet-repair.{forward,rollback}.txt`
- Manifest: `data/buildops/town-expansion-r1-red-carpet-drift-repair.release-manifest.json`
- Evidence: `data/world-review/town-expansion-redcarpet-live-20260824T220500Z/`

## Boundary

This is a drift repair restoring committed state; it does not authorize any
forward copper-oxidation change. Natural copper oxidation remains rollback-only
per the Town Expansion R1 policy.
