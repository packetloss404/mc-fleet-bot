# CZ-EE-PUB2 · Empty Eight south public-gallery arrival confirmation and light cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`
**Source:** accepted R08AW post `data/worldsnap-r08aw-post-20260824T170200Z`;
fresh live source `data/worldsnap-ee-pub2-source-20260825T060000Z`
**Post snapshot:** `data/worldsnap-ee-pub2-post-20260825T060200Z`
**Manifest identity:** `7d0383eec37d02a179309236bb186b0581fd2a3ef377c7b85a284510e0ce02c3`

The accepted R08AL south public gallery is a 5-wide 191-block public corridor.
R08AW installed the EE-P05 orientation band and EE-P14 destination datums. The
source-bound circulation review requires a readable destination/access marker
at each classification change and repeating confirmation at least every 25
tunnel blocks. This package adds the missing stair-arrival confirmation and
the ceiling light cadence.

## Scope

- **16 exact targets**:
  - **6 EE-P14 `blue_glazed_terracotta[facing=south]` arrival-confirmation
    markers** on the north wall immediately north of each widened PF08 public
    stair upper landing (`y=50, z=143`, `x=1727..1729` west and `x=1751..1753`
    east), confirming the gallery/egress direction at the stair-to-gallery
    classification change.
  - **10 EE-P11 `sea_lantern` ceiling cadence lights** at the bay midpoints
    (`y=53, z=147`) at `x=1656, 1669, 1685, 1701, 1717, 1765, 1781, 1797,
    1813, 1829`, filling the ~16-block lighting gaps between the bay-door
    lintel lights.
- Disjoint from all retained nonclaims: N06 gravel/bulkhead
  (`x=1736..1747`), the north-smoke plane/residual, FIRE-EG-B, EG-B core, all
  four EE-VENT risers, future stubs, track beds, and the south smoke plane.

## Hard-safety kernel evidence

- Forward source preflight: 16/16 PASS against the fresh live source
  (`data/worldsnap-ee-pub2-source-20260825T060000Z`).
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 16/16 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-ee-pub2-post-20260825T060200Z`.
- Post-state verification: 6/6 stair markers + 10/10 ceiling lights = 16/16,
  plus 12/12 preserved interfaces (N06 bulkhead, R08AW band/datums, R08AN
  widened stairs, bay lintel lights).
- Rollback post-state preflight: 16/16 PASS.

## Artifacts

- Compiler: `scripts/compile_combined_zones_ee_pub2_empty_eight_arrival_confirmation_and_light_cadence.mjs`
- Post-state verifier: `scripts/qa_ee_pub2_post_state.mjs`
- Ops: `data/buildops/combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence.arrival-confirmation-and-light-cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence.release-manifest.json`
- Evidence: `data/world-review/ee-pub2-live-20260825T060000Z/`
- Regression: `test/build/eePub2.test.ts`

## Boundary

Passive orientation and normal illumination only. No tenant opening, commerce,
occupancy, egress, accessibility, emergency lighting, or route commissioning
is claimed.
