# R10 High-14 exterior successor — guarded civil release

Status: **EXECUTED, POST-STATE VERIFIED, AND REVERSIBLE — CIVIL ONLY**

This is the ten-block dry north successor to the accepted High-14 exterior
band, not a departure from High-15 and not an extension through the held
water field. Its core is `x=-240..-235`, `y=54..59`, `z=-490..-481`.

## Accepted transaction

- Fresh source complete-save SHA-256:
  `12f3b66a19d993173fb4f095831eaa6ff8f700d931163dae91546460d43fd8c8`;
  region SHA-256:
  `6af8e691b3f0ea0a76cb65a8b3f6b0a1582f9c3b44f98a315bed7fe9b73ef613`.
- Geometry: 360 core, 312 shell, and 400 exact halo cells. The 36-cell
  `z=-481` exterior-band panel is the sole migration. All 72 inherited route
  air cells and 24 inherited halo PDS cells remain exact.
- Strict shell/core execution completed `276/276` then `360/360`, with zero
  no-ops. Fresh source and same-moment checks found zero fluids, gravity,
  block entities, or live entities in scope.
- Fresh post complete-save SHA-256:
  `a7536089a9f2fa58cf200231e0bf6dd5c4771dd9bae1715d498849607c7c6ca3`;
  region SHA-256:
  `2a403af5368b233b1a1a27d433db5f8048598ebc935e744c0031d9c0cc152344`.
  Independent post QA verifies all 636 targets, 400 halo states, 360 core
  void cells, 72 inherited air cells, 24 halo PDS cells, and the migration.
- Rollback proof passes core `360/360`, then shell `276/276`.

The complete release evidence is in the
[ledger](../../data/world-review/rail-r10-high14-exterior-successor-live-20260826T123000Z/evidence-ledger.json).

## Boundary

This is a sealed civil envelope only: no rail, station, signals, power,
rescue, public route, passenger trial, or passenger service is commissioned.
The direct twenty-block continuation is held by water before `z=-500`.
