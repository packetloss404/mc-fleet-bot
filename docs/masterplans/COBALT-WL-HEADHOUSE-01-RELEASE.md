# COBALT-WL-HEADHOUSE-01 · Westlight passenger-rail public headhouse

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-PASSENGER-RAILWAY`
**Source:** fresh live source `data/worldsnap-cobalt-wl-headhouse-source-20260825T153000Z`
**Manifest identity:** `3fd16da87631b0507ff3feb3481f175d3c4642830749090496179df37a047cf9`

The Cobalt-S1 station pair is frozen. This builds the Westlight public
headhouse at the WL-SC-1 site: a 5×5 concourse pad at the surface (y66), a 3×3
sealed stair shaft descending to the platform level (y18) with a polished-
deepslate sleeve through the y40 water body (water preserved behind the
sleeve), and a stub connecting to the platform deck. It is access
infrastructure only — no track, rail, or passenger service is commissioned.

## Scope

- **1014 exact targets** (compiled against the fresh live source):
  - 425 shaft-interior air cells (x=-250..-248, z=-444..-442, y18..65)
  - 585 sealed polished_deepslate sleeve faces (incl. the water band)
  - 25 concourse-pad polished_andesite cells (y66)
  - 18 stub interior/liner cells connecting to the platform
- The water body at y40 is preserved behind the sealed sleeve.

## Hard-safety kernel evidence

- Forward source preflight: 1014/1014 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 1014/1014 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-cobalt-wl-headhouse-post-20260825T153600Z`.
- Post-state verification: 25/25 pad, shaft interior air, floor sleeve, water
  preserved behind the sleeve.
- Rollback post-state preflight: 1014/1014 PASS.

## Artifacts

- Compiler: `scripts/compile_cobalt_wl_headhouse_01.mjs`
- Ops: `data/buildops/cobalt-wl-headhouse-01.headhouse.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-wl-headhouse-01.release-manifest.json`
- Evidence: `data/world-review/cobalt-wl-headhouse-live-20260825T153500Z/`

## Boundary

This is the RAIL-S2 access-first headhouse. It does NOT commission track, rail,
platform, power, signals, or passenger service. The corridor remains
behind-wall service access.
