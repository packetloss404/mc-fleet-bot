# RAIL-S3-TRACKBED-02 · Cobalt corridor track-bed preparation, slices 2-6

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md), [Network design](2026-08-22-passenger-railway-network-design.md)
**Design source:** accepted post-RAIL-S3-TRACKBED-01 snapshot `data/worldsnap-rail-trackbed-post-20260825T082300Z`, accepted `data/worldsnap-rail-bc-post-20260825T080600Z`, accepted `data/worldsnap-rail-wl-seg456-post-20260825T061300Z`, accepted `data/worldsnap-r08am-post-20260822T161818Z`
**Design snapshot (compile bound):** `data/worldsnap-rail-trackbed2-source-20260825T090000Z` (SHA-256 `7ab99063…`)
**Fresh execution source:** `data/worldsnap-rail-trackbed2-live-source-20260825T093000Z` (SHA-256 `6f1061dd…`)
**Post snapshot:** `data/worldsnap-rail-trackbed2-post-20260825T093500Z` (SHA-256 `012aed79…`)
**Manifest identity:** `9b75bc3430a63e1542b677e2ba006faf1b3bb8fbc26e1d4a4747c546a7b0e859`

## Scope

Continues [RAIL-S3-TRACKBED-01](RAIL-S3-TRACKBED-01-RELEASE.md) east along the
sealed Cobalt-S1 corridor bore (Leg A `x=-254..-136` at `z=-462..-457`, plus the
Leg B connector toward the Ravensreach shaft). The corridor interior clear
volume is `y=18..23`; the liner floor sits at `y=17`. The corridor floor at
`y=18` — the surface where the future rail bed will sit — was uneven natural
rock (and some open bore air from the Leg B connector carve).

This package **levels the corridor floor** into a smooth, level, solid
`polished_deepslate` track-bed surface at `y=18`, `z=-462..-457` across the next
five corridor cell blocks:

| Segment | Corridor cell block | Operated cells | Preserved floor cells |
|---|---|---|---|
| SEGMENT-02 | `x=-235..-216` | **114** | 6 |
| SEGMENT-03 | `x=-215..-196` | **114** | 6 |
| SEGMENT-04 | `x=-195..-176` | **114** | 6 |
| SEGMENT-05 | `x=-175..-156` | **102** | 18 |
| SEGMENT-06 | `x=-155..-136` | **82** | 38 |
| **Total** | `x=-235..-136` | **526** | **74** |

With TRACKBED-01 (102 cells in `x=-254..-236`) the full Leg A + Leg B corridor
floor `x=-254..-136` (600 floor cells) is now one continuous level
`polished_deepslate` surface at `y=18`.

## Track-bed design

**Treatment:** `CIVIL_PREP_TRACK_BED_LEVEL_POLISHED_DEEPSLATE_FLOOR`

Every uneven corridor-floor cell at `y=18` becomes `polished_deepslate`,
matching the surrounding liner material, so the full corridor floor row is one
smooth level surface with no grade drift. The already-placed `polished_deepslate`
floor cells (RAIL-S2 liner/floor cells and the BC-connector bore floor) are
preserved untouched — they are not re-operated. Every operated cell is an
exact-source in-place `REPL` — never a removal — so no flow/gravity physics are
triggered. Rollback restores each cell to its exact original state
(stone / andesite / diorite / granite / iron_ore / copper_ore / air).

### Boundary seam note

Segments 02-04 are fully enclosed liner boxes (west wall `x=minX`, east cap
`x=maxX+1`, floor `y=17`, ceiling `y=24`). Segments 05-06 continue through the
**Leg B connector bore** (carved by [RAIL-S2-BC-CONNECTOR](RAIL-S2-BC-CONNECTOR-RELEASE.md)):
the `x=-155` boundary column is an open bore interior (north wall `z=-462` and
south wall `z=-457` sealed, interior air) rather than a full end cap, and the
bore continues to the Ravensreach shaft turn at `x=-158`. The `x=-135` east cap
is a full sealed cap. All floor/ceiling seams (`y=17`, `y=24`) are sealed for
every segment.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-trackbed2-live-source-20260825T093000Z` (SHA-256 `6f1061dd…`) |
| Exact source guards | 526/526 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (114/114 + 114/114 + 114/114 + 102/102 + 82/82) |
| Strict-noop rollback parser | PASS (114/114 + 114/114 + 114/114 + 102/102 + 82/82) |
| Release-manifest QA | PASS (5 packages, 526 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 526/526 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-trackbed2-post-20260825T093500Z` (SHA-256 `012aed79…`) |
| Rollback post-state preflight | PASS (526/526 against the post snapshot) |
| Post-state verification | 526/526 operated cells `polished_deepslate` at y=18; 600/600 corridor floor row levelled; corridor interior y19..23 fluid = 0; 1236/1236 liner seams sealed; 74/74 preserved floor cells unchanged |

## Offline evidence

- Compiler: `scripts/compile_rail_trackbed_02.mjs`
- Forward/rollback: `data/buildops/rail-trackbed-02.seg0{2,3,4,5,6}.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-trackbed-02.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_trackbed_02_post.mjs`
- Live evidence: `data/world-review/rail-trackbed-2-live-20260825T091500Z/`
- Regression: `test/build/railTrackbed02.test.ts`

## Boundary / negative claims

- **No rail, powered rail, signalling, or vehicles** — RAIL-S3 pre-track civil
  prep only. `routeCommissioned: false`.
- The corridor interior rock above `y=18` is retained; the **RAIL-S3 civil bore**
  (carving the 6×6 clear tunnel) is a separate future package.
- Slices 2-6 (`x=-235..-136`) were levelled; the corridor `x=-254..-236`
  (TRACKBED-01) was already levelled. The Ravensreach access shaft connection
  and any future slices remain follow-up work.
- The 74 already-`polished_deepslate` floor cells (RAIL-S2 liner/floor cells and
  BC-connector bore floor) were preserved untouched.
- The preserved exterior lake water and any sealed lava pocket remain behind the
  RAIL-S2 liner boxes — **not deleted**.
- `routeCommissioned: false`.
