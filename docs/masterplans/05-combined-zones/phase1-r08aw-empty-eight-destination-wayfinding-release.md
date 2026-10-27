# CZ-R08AW · Empty Eight south public-gallery destination wayfinding

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`
**Source:** accepted R08AM post `data/worldsnap-r08am-post-20260822T161818Z`;
fresh live source `data/worldsnap-r08aw-source-20260824T170000Z`
**Manifest identity:** `a25e24630fe1538d54f37a0a1b18cb1784fbd50c53dfd0c96cdca48e04fa601c`

The accepted R08AL south public gallery route is 191+ blocks with zero
destination markers. This package installs the documented passive wayfinding
field (mirroring the proven R08AI pattern) so the public route is orientable.

## Scope

- **188 exact targets**:
  - **176 EE-P05 `red_terracotta`** orientation band along the gallery north
    floor edge (`y=49, z=145`, `x=1653..1734` and `x=1749..1842`, skipping the
    N06 bulkhead `x=1736..1747`).
  - **12 EE-P14 `blue_glazed_terracotta[facing=south]`** destination datums on
    the north wall (`y=50, z=144`) at the EG-A egress (`x=1652`) and each of the
    eleven public bay doors (x=1661, 1677, 1693, 1709, 1725, 1757, 1773, 1789,
    1805, 1821, 1837).
- Disjoint from all retained nonclaims: N06 gravel/bulkhead, the north-smoke
  plane/residual, FIRE-EG-B, EG-B core, all four EE-VENT risers, future stubs,
  track beds, and the south smoke plane.

## Hard-safety kernel evidence

- Forward source preflight: 188/188 PASS against the fresh live source.
- Strict-noop forward + rollback parser dry-runs: 0 failures, 0 no-ops.
- Block-entity audit: 0 blockers.
- Live-entity gate: 0 blockers.
- Strict-noop live execution: 188/188 changed, 0 failed, 0 no-ops.
- Immutable post snapshot: `data/worldsnap-r08aw-post-20260824T170200Z`.
- Post-state verification: 176/176 band + 12/12 datums.
- Rollback post-state preflight: 188/188 PASS.

## Artifacts

- Compiler: `scripts/compile_combined_zones_r08aw_empty_eight_destination_wayfinding.mjs`
- Ops: `data/buildops/combined-zones-r08aw-empty-eight-destination-wayfinding.destination-wayfinding.{forward,rollback}.txt`
- Manifest: `data/buildops/combined-zones-r08aw-empty-eight-destination-wayfinding.release-manifest.json`
- Evidence: `data/world-review/combined-zones-r08aw-live-20260824T170100Z/`

## Boundary

Passive orientation only. No tenant opening, commerce, occupancy, egress,
accessibility, or route commissioning is claimed.
