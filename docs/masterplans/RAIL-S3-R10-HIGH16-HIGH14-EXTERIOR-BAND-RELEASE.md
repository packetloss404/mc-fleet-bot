# R10 High-16 High-14 exterior band — guarded civil release

Status: **EXECUTED, POST-STATE VERIFIED, AND REVERSIBLE — CIVIL ONLY**

This release extends the separate high civil envelope from the accepted
High-14/High-13 exterior face, explicitly **not** through High-15 or the
held High-16 water field. It adds a dry 6×6 core at
`x=-240..-235`, `y=54..59`, `z=-480..-461`.

## Accepted transaction

- Fresh source: `data/worldsnap-rail-r10-high16-high14-band-source-20260826T120000Z`
  (complete-save SHA-256 `2da4fb9f47850c4dd4248c805b159408ca4dcdfe5e3d9a9927d2e55f5b01f037`,
  region SHA-256 `a440f4152348201e40fceb39de1358bf79059bbc02a9e01e0c384efe2707eb9e`).
- Geometry: 720 core, 552 shell, and 680 exact halo cells. The only inherited
  migration is the 36-cell face at `z=-461`: 30 High-14 cells and six High-13
  cells. High-15 and Cobalt protected envelopes are excluded.
- Strict stages: 492-cell bottom-up shell lock, then 720-cell top-down core
  clear/migration. Both completed with zero no-ops; total **1,212** changes.
- The fresh source and same-moment gates found zero fluids, gravity blocks,
  block entities, saved entities, or live entities in the interaction scope.
- Fresh post: `data/worldsnap-rail-r10-high16-high14-band-post-20260826T120000Z`
  (complete-save SHA-256 `5bc62468b8ce8b85a3d3b3b658d9aa44487ab95dc08b9e97cdcf5a9f67b78822`,
  region SHA-256 `dd42049f4e05e233cd97e797dd24a490a0735cfa6091f931728a3f0cab3e5494`).
  Independent post QA verifies all 1,212 targets, all 680 halo states, the
  720-cell core, all 84 inherited route-air cells, and all 36 migration cells.
- Reverse-order rollback proof passes core 720/720, then shell 492/492.

The full immutable evidence is in the
[release ledger](../../data/world-review/rail-r10-high16-high14-band-live-20260826T120000Z/evidence-ledger.json).

## Boundary

This is a sealed civil envelope only. It installs no rail, station, power,
signals, rescue system, public route, or passenger service. The direct
High-16 water system and all High-15 departure designs remain separately held.
