# R08AJ Empty Eight EG-B Passive Illumination

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Status: **EXECUTED / INDEPENDENT POST-QA PASS / CLOSED**

R08AJ is the next exact reversible fit-out inside accepted, closed EG-B. It
replaces a 3×3 grid of nine smooth-stone cells in the retained roof cap with
full-cube `EE-P11` sea lanterns. The grid uses two-cell spacing across
`x=1850,1852,1854` and `z=146,148,150` at `y=54`.

The other 40 roof-cap cells remain smooth stone, so all 49 cells remain solid
full cubes and the tenant/exterior boundary stays closed. The 42-cell
interaction halo contains 24 smooth-stone and 18 air cells, with zero fluid,
gravity, container/control, block-entity, saved-entity, protected-relic,
future-seal, N06, or north-smoke-residual contact. Prior-release accounting
finds exactly nine R02 smooth-stone roof-cap cells and no undeclared overlap.

This is passive normal illumination only. It does not claim photometric
validation, emergency power or emergency-lighting commission, egress,
accessibility, a stair/lift, a spine opening, or any exterior continuation.

Manifest QA, 9/9 source preflight, 9/9 projected inverse preflight, 18 strict
parser commands, block-entity clearance, the real wrapper `--print-plan`, the
focused regression, and the backend build pass.

Canonical artifacts:

- `data/buildops/combined-zones-r08aj-empty-eight-eg-b-passive-illumination.release-manifest.json`
- `data/buildops/combined-zones-r08aj-empty-eight-eg-b-passive-illumination.ee-eg-b-passive-illumination.forward.txt`
- `data/buildops/combined-zones-r08aj-empty-eight-eg-b-passive-illumination.ee-eg-b-passive-illumination.rollback.txt`
- `data/world-review/combined-zones-r08aj-empty-eight-eg-b-passive-illumination-offline/`

Manifest payload:
`ca665afef01803f8fd35a4c07bd660c9a1e9bf8434bd6cab5e2a822d3566201f`.
Forward body:
`3a715db8f13453b148e3e48f0ce457f0c5433b18e9f021b967f9799c4902a970`.
Rollback body:
`03f237b601547b3d2e159abc69c10862109495eae56b918fe8cf2171d32a8ab1`.

No live entity clearance, RCON call, or world mutation was performed during
offline engineering. The wrapper must capture and preflight a fresh immutable
source immediately before any execution.

## Executed closeout

The guarded wrapper subsequently completed at
`data/world-review/combined-zones-r08aj-live-20260822T024118Z/` with completed
release identity
`0305e47fbdc23239338a31dfa335cc2332f68bcdde423cce2d09cfe34478d791`.
Independent post-release QA proves all nine final sea-lantern states, all 40
retained smooth-stone cap cells, the complete 49-cell closed full-cube cap,
the exact 42-cell halo, prior R08/R02 preservation, bounded lifecycle/diff
accounting, strict execution evidence, and 9/9 reverse rollback readiness.
The independent QA payload is
`b9337d69b01eee773a9ba579935c581b5e2e4b5b0edac30ffb35c390d81aba41`;
the bounded commissioning-seal payload is
`53fdf58bd18dfac397cdc8d0bf865911b43b133814017227df4d8e8551d42b02`.
