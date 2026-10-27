# RAIL-S3-TRACKBED-01 · Cobalt corridor track-bed preparation, first slice

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md), [Network design](2026-08-22-passenger-railway-network-design.md)
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`, accepted `data/worldsnap-rail-wl-seg456-post-20260825T061300Z`, accepted `data/worldsnap-rail-bc-post-20260825T080600Z`
**Fresh execution source:** `data/worldsnap-rail-trackbed-source-20260825T082100Z` (SHA-256 `a430ec6c…`)
**Post snapshot:** `data/worldsnap-rail-trackbed-post-20260825T082300Z` (SHA-256 `eec27d63…`)
**Manifest identity:** `4b9bd66f2c53c5c0bff219a67a47457f6c0f93ce19177fab73267c29c2b060ac`

## Scope

The Cobalt-S1 corridor bore is built as sealed 6×6 polished_deepslate liner
boxes (Leg A `x=-254..-136` at `z=-462..-457`, plus the Leg B/C connector to
the Ravensreach shaft). The corridor interior clear volume is `y=18..23`; the
liner floor sits at `y=17`. The corridor floor at `y=18` — the surface where the
future rail bed will sit — was uneven natural rock.

This package **levels the first segment's corridor floor** — the Westlight-side
corridor cell block `x=-254..-236` (the same cell block as
[RAIL-S2-WL-SEGMENT-01](RAIL-S2-WL-SEGMENT-01-RELEASE.md)) — into a smooth,
level, solid `polished_deepslate` track-bed surface at `y=18`, `z=-462..-457`.

| Element | Value |
|---|---|
| Segment | `x=-254..-236`, `y=18`, `z=-462..-457` |
| Track-bed level | `y=18` |
| Track-bed material | `minecraft:polished_deepslate` |
| Operated cells | **102** (59 stone, 22 diorite, 20 andesite, 1 iron_ore) |
| Preserved floor cells | **12** (existing RAIL-S2 lava-displacement `polished_deepslate` at `x=-239..-236`) |
| Held cells | 0 |

## Track-bed design

**Treatment:** `CIVIL_PREP_TRACK_BED_LEVEL_POLISHED_DEEPSLATE_FLOOR`

Every uneven corridor-floor cell at `y=18` becomes `polished_deepslate`,
matching the surrounding liner material, so the full 114-cell floor row of the
segment is one smooth level surface with no grade drift. The 12 already-placed
RAIL-S2 lava-displacement floor cells are preserved untouched (they are not
re-operated). Every operated cell is an exact-source in-place `REPL` — never a
removal — so no flow/gravity physics are triggered. Rollback restores each cell
to its exact original state (stone / andesite / diorite / iron_ore).

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-trackbed-source-20260825T082100Z` (SHA-256 `a430ec6c…`) |
| Exact source guards | 102/102 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (102/102) |
| Strict-noop rollback parser | PASS (102/102) |
| Release-manifest QA | PASS (1 package, 102 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 102/102 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-trackbed-post-20260825T082300Z` (SHA-256 `eec27d63…`) |
| Rollback post-state preflight | PASS (102/102 against the post snapshot) |
| Post-state verification | 102/102 operated cells `polished_deepslate` at y=18; 114/114 segment floor row levelled; segment-01 liner box (floor y17, ceiling y24, west/east caps) sealed; corridor interior y19..23 fluid = 0; next cell block `x=-234..-195` unchanged |

## Offline evidence

- Compiler: `scripts/compile_rail_trackbed_01.mjs`
- Forward/rollback: `data/buildops/rail-trackbed-01.seg01.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-trackbed-01.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_trackbed_01_post.mjs`
- Live evidence: `data/world-review/rail-trackbed-live-20260825T082100Z/`
- Regression: `test/build/railTrackbed01.test.ts`

## Boundary / negative claims

- **No rail, powered rail, signalling, or vehicles** — RAIL-S3 pre-track civil
  prep only. `routeCommissioned: false`.
- The corridor interior rock above `y=18` is retained; the **RAIL-S3 civil bore**
  (carving the 6×6 clear tunnel) is a separate future package.
- Only the first corridor cell block `x=-254..-236` was levelled; segments
  `x=-235..-136` and the Ravensreach end remain follow-up slices.
- The preserved exterior lake water and any sealed lava pocket remain behind the
  RAIL-S2 liner boxes — **not deleted**.
- The 12 RAIL-S2 lava-displacement floor cells at `x=-239..-236` were preserved
  untouched (already `polished_deepslate`).
