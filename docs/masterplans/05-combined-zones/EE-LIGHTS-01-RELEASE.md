# CZ-EE-LIGHTS-01 · Empty Eight public stair-well ceiling lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`
**Source:** accepted EE-PUB2 post `data/worldsnap-ee-pub2-post-20260825T060200Z`;
fresh live source `data/worldsnap-ee-lights-source-20260825T154809Z`
**Post snapshot:** `data/worldsnap-ee-lights-post-20260825T154851Z`
**Manifest identity:** `a0e148d4854098f83171b003ca9622acb068efd5b52edb92d5bfa65b2b6b4475`

The accepted R08AL south public gallery is fully lit along its ceiling cadence
line (EE-P11 `sea_lantern` at y=53 z=147 at each bay midpoint) plus the
R08AW lintel lights and the EE-PUB2 arrival-confirmation round. The two public
PF08 gallery stairs — widened to three-wide by R08AN and the only public
access to the gallery — are the genuine under-lit gap: the corridor cadence
has a ~32-block dark span across the N06 bulkhead and both stair mouths.

## Scope

- **12 exact targets** — EE-P11 `sea_lantern` ceiling cadence over the two
  public stair-well mouths on the corridor ceiling plane (y=53):
  - West stair (`x=1727..1729`, `z=147` and `z=149`): 6 cells
    `(1727,53,147) (1727,53,149) (1728,53,147) (1728,53,149) (1729,53,147) (1729,53,149)`.
  - East stair (`x=1751..1753`, `z=147` and `z=149`): 6 cells
    `(1751,53,147) (1751,53,149) (1752,53,147) (1752,53,149) (1753,53,147) (1753,53,149)`.
- Every target is exact `minecraft:smooth_stone` (the R08AL gallery ceiling)
  with void air below and a 6-neighbour halo free of fluid and gravity.
- Disjoint from all retained nonclaims: N06 gravel/bulkhead
  (`x=1736..1747`), the north-smoke plane/residual, FIRE-EG-B, EG-B core, all
  four EE-VENT risers, future stubs, track beds, and the south smoke plane.

## Hard-safety kernel evidence

- Fresh immutable source snapshot
  (`data/worldsnap-ee-lights-source-20260825T154809Z`, region SHA-256
  `ef06694546da1b930bdcac32ce1b76b804247e61c467f17227f0327328294872`),
  byte-identical to the accepted EE-PUB2 post.
- Exact-release manifest QA: PASS, 12 unique targets, 0 cross-package
  intersections.
- Forward source preflight: 12/12 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers, 0 entities returned in envelopes.
- Strict-noop live execution: 12/12 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-ee-lights-post-20260825T154851Z`
  (region SHA-256 `591ca92d9a8eda93e504efb60811f2f2520a3e832dc9254d4aab26ffc58dcb90`).
- Rollback post-state preflight: 12/12 PASS.
- Post-state verification: 12/12 cadence cells exact `sea_lantern` + 15/15
  preserved interfaces (R08AW band/datums, R08AN widened stairs, EE-PUB2
  markers, N06 bulkhead, corridor cadence lights).

## Artifacts

- Compiler: `scripts/compile_combined_zones_ee_lights_01_stairwell_ceiling_cadence.mjs`
- Post-state verifier: `scripts/qa_ee_lights_01_post_state.mjs`
- Ops: `data/buildops/combined-zones-ee-lights-01-stairwell-ceiling-cadence.stairwell-ceiling-cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/combined-zones-ee-lights-01-stairwell-ceiling-cadence.release-manifest.json`
- Evidence: `data/world-review/ee-lights-live-20260825T154809Z/`
- Regression: `test/build/eeLights01.test.ts`

## Boundary

Passive normal illumination only. No tenant opening, commerce, occupancy,
egress, accessibility, emergency lighting, or route commissioning is claimed.
