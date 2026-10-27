# RAIL-S3-GUIDEWAY-02 · Cobalt passenger guideway track-tube beds, slices 2-6

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md), [Network design](2026-08-22-passenger-railway-network-design.md)
**Design source:** accepted guideway-01 post / rail-trackbed-02 post / rail-bc post / rail-wl-seg456 post / r08am post
**Fresh execution source:** `data/worldsnap-rail-guideway-source2-20260825T165000Z` (SHA-256 `9bacf12d…`)
**Post snapshot:** `data/worldsnap-rail-guideway-post2-20260825T165100Z` (SHA-256 `440582ae…`)
**Manifest identity:** `ca39cd7fa5ed9b3fe16eea20f561f9a643ac90a30280f683c606eb12431a7f0e`

## Scope

This package continues the RAIL-S3-GUIDEWAY-01 Cobalt directional track-tube
beds east across corridor cell blocks 2-6. Guideway-01 bedded the first block
(`x=-254..-236`); this package beds the remaining five so the levelled
`polished_deepslate` track-bed surface is continuous across the full corridor
(`x=-254..-136`).

| Element | Value |
|---|---|
| Segment | `x=-235..-136` (corridor cell blocks 2-6) |
| Tube-bed level | `y=12` (level, no grade drift) |
| Tube-N bed (westbound/north) | `z=-461..-460` |
| Tube-S bed (eastbound/south) | `z=-455..-454` |
| Tube-bed material | `minecraft:polished_deepslate` |
| Operated cells | **380** (seg02 80, seg03 76, seg04 65, seg05 79, seg06 80) |
| Preserved spine | `z=-459..-458` between the two beds (2-cell rock spine, untouched) |
| Held cells | **20** (pre-existing natural cave air / water pocket — fail-closed) |

## Track-tube design

**Treatment:** `CIVIL_PREP_TRACK_TUBE_BEDS_POLISHED_DEEPSLATE_BELOW_SERVICE_CORRIDOR`

Two parallel 2-wide smooth beds sit below the service corridor at `y=12`. The
`z=-459..-458` rock spine between them preserves the Engineering Standard
5-block track-centre spacing (two tube beds + the spine = the eventual running
tunnel). Every bed cell is an exact-source in-place `REPL` — never a removal —
so no flow/gravity physics are triggered. Rollback restores each cell to its
exact original state (stone / andesite / granite / ore / gravel).

The sealed service corridor above (liner walls `z=-463/-456` y18..23, levelled
floor `y=18`, outer east cap `x=-135`) is untouched and remains dry, lit and
walkable; it is never used as a track bed or shortcut.

### Fail-closed held cells

The natural terrain in these cell blocks contains pre-existing cave air and a
small water pocket in the tube-bed zone. Cells whose bed cell is air/fluid, or
whose support row `y=11` is air/fluid, are **held untouched** (20 cells) for a
follow-up support-first RAIL-S3-GUIDEWAY package. They are never built floating
and never removed:

| Reason | Count |
|---|---|
| `air-source;air-support` | 8 |
| `air-support` | 8 |
| `air-source` | 3 |
| `fluid-source;fluid-support` | 1 |

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-guideway-source2-20260825T165000Z` (SHA-256 `9bacf12d…`) |
| Exact source guards | 380/380 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (5 files, 380/380) |
| Strict-noop rollback parser | PASS (5 files, 380/380) |
| Release-manifest QA | PASS (5 packages, 380 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 380/380 changed, 0 failed, 0 no-op (strict-noop) |
| Immutable post snapshot | `data/worldsnap-rail-guideway-post2-20260825T165100Z` (SHA-256 `440582ae…`) |
| Rollback post-state preflight | PASS (380/380 against the post snapshot) |
| Post-state verification | 380/380 operated cells `polished_deepslate` at y=12; 200/200 tube-N + 180/180 tube-S; spine 200/200 preserved; support 380/380 solid; corridor interior y19..23 fluid = 0; 1836/1836 liner seams sealed; 20/20 held bed cells untouched |

## Offline evidence

- Compiler: `scripts/compile_rail_guideway_02.mjs`
- Forward/rollback: `data/buildops/rail-guideway-02.seg0{2,3,4,5,6}.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-guideway-02.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_guideway_02_post.mjs`
- Live evidence: `data/world-review/rail-guideway-2-live-20260825T165000Z/`
- Regression: `test/build/railGuideway02.test.ts`

## Boundary / negative claims

- **No rail, powered rail, signalling, or vehicles** — RAIL-S3 civil guideway
  prep only. `routeCommissioned: false`.
- Tube **beds only**: the tube side walls, ceiling, and support columns are a
  follow-up RAIL-S3-GUIDEWAY package (the `y=11` support row and `z=-459..-458`
  spine are preserved intact here).
- 20 held bed cells (pre-existing cave air / water pocket in the tube-bed zone)
  require a separate support-first package; they are not built floating.
- The preserved exterior lake water and any sealed lava pocket remain behind the
  RAIL-S2 liner boxes — **not deleted**.
- The service corridor above remains a continuous, separated, lit, dry,
  walkable maintenance/evacuation route; no service door or cross-passage was
  opened.
- `routeCommissioned: false`.
