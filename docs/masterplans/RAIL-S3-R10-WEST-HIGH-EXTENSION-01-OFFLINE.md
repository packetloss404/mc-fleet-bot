# RAIL-S3-R10 · west high extension-01 offline package

**Status:** STATIC-READY, OFFLINE ONLY — AWAITING A SEPARATE FRESH KERNEL

This is a current-source-bound, dry 6×6 civil extension west of accepted North
High Corridor-01: core `x=6..25`, `y=42..47`, `z=-472..-467`. It does not use
the held north-turn envelope or its escaping water/bubble system. It remains
civil-only: no rail, service commissioning, power, signalling, station, or
passenger-service claim.

- Core survey: 720 cells, zero fluid, zero target gravel, and zero block
  entities.
- Exact predecessor interface: 36 existing North-High west-cap
  polished-deepslate cells migrate to air. There is zero target overlap with
  the continuation-05 retention package or continuation-05 target set.
- New external shell: 596 source-bound PDS operations. Its 992-cell halo,
  including exactly 16 exterior gravel cells, is preserved unchanged and is a
  mandatory post-release invariant.
- Exact inverse: shell/core rollback operations reverse the forward stages.
  Static projected reverse preflights pass core `720/720` then shell `596/596`.
- Static forward source/projected gates pass shell `596/596`, core `720/720`;
  both strict parser checks pass and block-entity audit finds zero blockers.

Evidence: `data/world-review/rail-r10-west-high-offline-20260826T062000Z/`.
The compiler and manifest are
`scripts/compile_rail_s3_r10_west_high_extension.mjs` and
`data/buildops/rail-s3-r10-west-high-extension-01.manifest.json`.

Before any execution, take a brand-new complete source capture, recompile,
rerun all parser/preflight/block-entity gates, clear live entities, execute
strictly with a journal, then capture and independently QA post-state plus
sequential rollback poststate. If current source differs, this package must be
recompiled or abandoned; it is not authorization to mutate.
