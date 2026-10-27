# C01-SERVICE-CORRIDOR-WIDEN · C01 service-corridor 2-wide widening

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-C01-BUNKER`
**Source:** accepted R08AM post; fresh live sources
`data/worldsnap-c01-service-source-20260825T011500Z` and
`data/worldsnap-c01-service-source2-20260825T012000Z`
**Manifest identity (pass 2):** `a82f6e3179262ead1792d7c54cad803ec57fc20b09e57d2564f1f98c053ce17f`

The C01 service backbone corridor at x=866 (y43) was 1-wide through the barrel
section (z=-116..-105) because obstruction cells at x=866 blocked the west
column while x=868 stayed open. Clearing the 8 obstruction cells to air makes
x=866 AND x=868 both walkable — a 2-wide service corridor that routes AROUND
the barrel stacks (no barrel is touched).

## Scope

- **8 exact targets** in two passes (light_blue_concrete /
  polished_blackstone_slab → air at x=866, y43):
  - Pass 1 (4): z=-115, -113, -111, -105
  - Pass 2 (4): z=-121, -114, -104, -103
- Result: x=866 and x=868 both walkable at 21/21 z positions across the
  section (fully 2-wide).

## Hard-safety kernel evidence

- Forward source preflight: 4/4 (pass 1) + 4/4 (pass 2) PASS.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 4/4 + 4/4 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-c01-service-post2-20260825T012100Z`.
- Post-state verification: corridor 2-wide 21/21.
- Rollback post-state preflight: 4/4 + 4/4 PASS.

## Artifacts

- Compiler: `scripts/compile_c01_service_corridor_widening.mjs`
- Ops: `data/buildops/c01-service-corridor-widening.corridor-widen.{forward,rollback}.txt`
- Manifest: `data/buildops/c01-service-corridor-widening.release-manifest.json`
- Evidence: `data/world-review/c01-service-widen-live-20260825T011600Z/`

## Boundary

This widens the staff/service corridor to the 2-wide service standard. It does
NOT commission the corridor as public access, nor touch the barrel containers,
and no route re-classification is claimed.
