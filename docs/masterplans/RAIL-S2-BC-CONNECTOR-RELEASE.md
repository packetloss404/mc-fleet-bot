# RAIL-S2-BC-CONNECTOR · Passenger rail Leg B/Leg C corridor connector

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-PASSENGER-RAILWAY`
**Source:** fresh live source `data/worldsnap-rail-bc-source-20260825T080000Z`
**Manifest identity:** `0537c8a983c905ffba3a560beac922561218fa6f2c964b49ce41b6e681c87764`

Leg A (Westlight side, x=-254..-136) and the Ravensreach access shaft
(x=-160..-156) were already built as sealed 6×6 liner boxes. This package carves
the connecting dry 6×6 corridor — Leg B (eastward) and Leg C (south turn toward
the Ravensreach shaft) — completing the Cobalt-S1 inter-station corridor.

## Scope

- **845 exact targets** (528 interior-air + 317 liner faces), compiled against
  the fresh live source so pre-existing liner cells are not re-operated:
  - Leg B: x=-137..-159 at z=-462..-457
  - Leg C: x=-160..-155 from z=-458 down to z=-392 (connecting to the
    Ravensreach access shaft)
- Polished_deepslate floor/ceiling/wall liner; interior carved dry.
- A few gravity cells in the liner path are retained (not touched), recorded
  in the manifest.

## Hard-safety kernel evidence

- Forward source preflight: 845/845 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 845/845 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-rail-bc-post-20260825T080600Z`.
- Post-state verification: corridor interior dry (0 fluid), liner present.
- Rollback post-state preflight: 845/845 PASS.

## Artifacts

- Compiler: `scripts/compile_rail_s2_bc_connector.mjs`
- Ops: `data/buildops/rail-s2-bc-connector.bc-connector.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-s2-bc-connector.release-manifest.json`
- Evidence: `data/world-review/rail-bc-live-20260825T080500Z/`

## Boundary

This completes the dry corridor bore between the Westlight and Ravensreach
stations. It does NOT commission track, rail, platforms, power, or passenger
service — it is the behind-wall service corridor only.
