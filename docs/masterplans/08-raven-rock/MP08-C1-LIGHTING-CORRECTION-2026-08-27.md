# MP08 C1 lighting correction — 2026-08-27

## Disposition

`MP08-C1-RESTRICTED-INSPECTION-LIGHTING-01` is **reversed and excluded from
accepted Master Plan progress**. The eight fixture cells were safe and exactly
reversible, but the current C1 record establishes no lighting or legibility
defect that this delta was necessary to remedy. Safe execution alone is not a
substitute for a defect-backed functional scope.

## Exact recovery evidence

The recovery changed only these eight former `minecraft:sea_lantern` cells back
to `minecraft:polished_deepslate`: `(-2,-9,72)`, `(2,-9,64)`, `(-2,-9,56)`,
`(2,-9,48)`, `(-2,-9,40)`, `(2,-9,32)`, `(-2,-9,24)`, and `(2,-9,16)`.

- Fresh immutable recovery source: `data/worldsnap-mp08-c1-lighting-correction-source-20260827T000500Z`
  (`f7c71df26b6625dd19470763ff705fe9a828850543ac0db8c9d6744ec9fcc61b` for
  the region set); complete-save intake passed.
- Before mutation: strict reverse parser validation and source preflight both
  passed `8/8`; the target envelope had zero block entities and zero live
  entities.
- Strict reverse execution changed `8/8` cells with zero no-ops and journaled
  the commands in
  `data/world-review/mp08-c1-lighting-correction-rollback-live-20260827T000500Z/rollback-execution.json.stream-journal.jsonl`.
- Fresh immutable post snapshot:
  `data/worldsnap-mp08-c1-lighting-correction-rollback-post-20260827T000600Z`
  (`cee885666ffd957503c395fb01636c1ff79a2d37c9f0b2d9b97d8507031787ba` for
  the region set); complete-save intake passed.
- The original forward operation now preflights `8/8` against that post state,
  proving the exact prior source has been restored. See
  `data/world-review/mp08-c1-lighting-correction-rollback-live-20260827T000500Z/forward-restoration-preflight.json`.

The correction does not open C1, modify either vestibule, or change water,
lava, gravity, public-access, egress, or transport status. Those interfaces
remain governed by the C1 bilateral containment contract.
