# COBALT-RR-HEADHOUSE-01 · Ravensreach passenger-rail public headhouse

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-PASSENGER-RAILWAY`
**Source:** fresh live source `data/worldsnap-cobalt-rr-headhouse-source-20260825T093000Z`
**Manifest identity:** `821b51548740570b2ad57e1e8148e3dce8ee86b28b806bc52f9503873463b333`

The Cobalt-S1 station pair is frozen. This builds the RR-SE-2-EAST-PLATEAU
public street-to-platform headhouse at the Ravensreach station: a 5×5 concourse
pad at the surface (y62), a 3×3 sealed stair shaft descending to the rail
corridor level (y18..61), and a horizontal stub connecting to the corridor head
at x=-156. It is access infrastructure only — no track, rail, or passenger
service is commissioned.

## Scope

- **881 exact targets** (compiled against the fresh live source):
  - 396 shaft-interior air cells (x=-153..-151, z=-390..-388, y18..61)
  - 401 sealed polished_deepslate sleeve faces
  - 25 concourse-pad polished_andesite cells (y62)
  - 59 stub interior/liner cells connecting to the corridor at x=-156
- Gravity/fluid/forbidden cells in the liner path are retained (not touched),
  recorded in the manifest.

## Hard-safety kernel evidence

- Forward source preflight: 881/881 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 881/881 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-cobalt-rr-headhouse-post-20260825T093600Z`.
- Post-state verification: 25/25 pad, shaft interior air, 9/9 floor sleeve.
- Rollback post-state preflight: 881/881 PASS.

## Artifacts

- Compiler: `scripts/compile_cobalt_rr_headhouse_01.mjs`
- Ops: `data/buildops/cobalt-rr-headhouse-01.headhouse.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-rr-headhouse-01.release-manifest.json`
- Evidence: `data/world-review/cobalt-rr-headhouse-live-20260825T093500Z/`

## Boundary

This is the RAIL-S2 access-first headhouse. It does NOT commission track, rail,
platform, power, signals, or passenger service. The corridor remains
behind-wall service access.
