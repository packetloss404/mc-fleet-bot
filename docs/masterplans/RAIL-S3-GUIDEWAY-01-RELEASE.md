# RAIL-S3-GUIDEWAY-01 · Cobalt passenger guideway track-tube beds, first slice

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md), [Network design](2026-08-22-passenger-railway-network-design.md)
**Design source:** accepted post-RAIL-S3-TRACKBED-02 snapshot `data/worldsnap-rail-trackbed2-post-20260825T093500Z`, accepted `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-rail-guideway-source1-20260825T170000Z` (SHA-256 `15f62e03…`)
**Post snapshot:** `data/worldsnap-rail-guideway-post-20260825T170000Z` (SHA-256 `e95368e5…`)
**Manifest identity:** `e9e775da16c90e1f556a42a12a49ce76e7305afd2ef75e5b942a964c7728e4ca`

## Scope

The Cobalt-S1 corridor bore is built as sealed 6×6 `polished_deepslate` liner
boxes (Leg A `x=-254..-136` at `z=-462..-457`), and the corridor floor at
`y=18` is a levelled track-bed surface (RAIL-S3-TRACKBED-01/-02). Per the
Engineering Standard the sealed 6×6 corridor is the **mandatory behind-wall
service corridor** (§4.3); the two directional passenger track tubes are placed
**directly below it**, separated by the liner floor/rock column (§4.1
directional-running-tunnel geometry).

This package is the **first guideway track-tube slice**: it lays the two
directional track-tube beds under the first corridor cell block.

| Element | Value |
|---|---|
| Segment | `x=-254..-236` (first corridor cell block) |
| Tube-bed level | `y=12` (level, no grade drift) |
| Tube-N bed (westbound/north) | `z=-461..-460` |
| Tube-S bed (eastbound/south) | `z=-455..-454` |
| Tube-bed material | `minecraft:polished_deepslate` |
| Operated cells | **76** (38 tube-N + 38 tube-S) |
| Preserved spine | `z=-459..-458` between the two beds (2-cell rock spine, untouched) |
| Held cells | 0 |

## Track-tube design

**Treatment:** `CIVIL_PREP_TRACK_TUBE_BEDS_POLISHED_DEEPSLATE_BELOW_SERVICE_CORRIDOR`

Two parallel 2-wide smooth beds sit below the service corridor at `y=12`. The
`z=-459..-458` rock spine between them preserves the Engineering Standard
5-block track-centre spacing (two tube beds + the spine = the eventual running
tunnel). Every bed cell is an exact-source in-place `REPL` — never a removal —
so no flow/gravity physics are triggered. Rollback restores each cell to its
exact original state (stone / gravel / ore). The service corridor above (floor
`y=17`, ceiling `y=24`, north/south liner walls `z=-463/-456`, corridor floor
`y=18`) is untouched and remains dry, lit and walkable; it is never used as a
track bed or shortcut.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-guideway-source1-20260825T170000Z` (SHA-256 `15f62e03…`) |
| Exact source guards | 76/76 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (76/76) |
| Strict-noop rollback parser | PASS (76/76) |
| Release-manifest QA | PASS (1 package, 76 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 76/76 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-guideway-post-20260825T170000Z` (SHA-256 `e95368e5…`) |
| Rollback post-state preflight | PASS (76/76 against the post snapshot) |
| Post-state verification | 76/76 operated cells `polished_deepslate` at y=12; 38/38 tube-N + 38/38 tube-S; spine 76/76 preserved; support row y=11 76/76 solid; corridor interior y19..23 fluid = 0; 456/456 liner seams sealed |

## Offline evidence

- Compiler: `scripts/compile_rail_guideway_01.mjs`
- Forward/rollback: `data/buildops/rail-guideway-01.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-guideway-01.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_guideway_01_post.mjs`
- Live evidence: `data/world-review/rail-guideway-live-20260825T170000Z/`
- Regression: `test/build/railGuideway01.test.ts`

## Boundary / negative claims

- **No rail, powered rail, signalling, or vehicles** — RAIL-S3 civil guideway
  prep only. `routeCommissioned: false`.
- Tube **beds only**: the tube side walls, ceiling, and support columns are a
  follow-up RAIL-S3-GUIDEWAY package (the `y=11` support row and `z=-459..-458`
  spine are preserved intact here).
- Only the first corridor cell block `x=-254..-236` was bedded; `x=-235..-136`
  and the Ravensreach end remain follow-up slices.
- The preserved exterior lake water and any sealed lava pocket remain behind the
  RAIL-S2 liner boxes — **not deleted**.
- The 6×6 service corridor above remains a continuous, separated, lit, dry,
  walkable maintenance/evacuation route; no service door or cross-passage was
  opened.
- `routeCommissioned: false`.
