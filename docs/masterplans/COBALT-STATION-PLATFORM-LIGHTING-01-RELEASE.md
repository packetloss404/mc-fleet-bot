# COBALT-STATION-PLATFORM-LIGHTING-01 · Cobalt station platform lighting

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-PASSENGER-RAILWAY`
**Source:** fresh live source `data/worldsnap-cobalt-platformlight-source-20260825T173000Z`
**Manifest identity:** `cd5e62458711663dbc0adbfe2c8adc6a20e074c575e7f0ebaf3c67bf47951c20`

The Cobalt Westlight station platform (deck y18, x=-254..-236, z=-444..-441)
was built but unlit. This package installs a bounded sea_lantern ceiling
cadence at y24 above the platform for passive normal illumination.

## Scope

- **10 exact targets**: sea_lantern ceiling inlays at y24 over the platform
  (x=-253..-237 every 4 blocks, z=-444..-441 every 2), on the dry
  polished_deepslate ceiling. The water at the platform edge (x=-254) is
  preserved untouched.

## Hard-safety kernel evidence

- Forward source preflight: 10/10 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 10/10 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-cobalt-platformlight-post-20260825T173600Z`.
- Post-state verification: 10/10 sea_lantern at y24.
- Rollback post-state preflight: 10/10 PASS.

## Artifacts

- Compiler: `scripts/compile_cobalt_station_platform_lighting.mjs`
- Ops: `data/buildops/cobalt-station-platform-lighting.platform-lighting.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-station-platform-lighting.release-manifest.json`
- Evidence: `data/world-review/cobalt-station-lighting-live-20260825T173500Z/`

## Boundary

Passive normal illumination only. No track, rail, powered rails, signaling,
power, or passenger service is commissioned.
