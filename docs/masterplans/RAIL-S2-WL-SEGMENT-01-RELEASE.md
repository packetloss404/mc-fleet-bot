# RAIL-S2-WL-SEGMENT-01 · Westlight rail-corridor water containment, first segment

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md)
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-rail-wl-seg-source-20260825T051548Z` (SHA-256 `f8ac1b9a…`)
**Post snapshot:** `data/worldsnap-rail-wl-seg-post-20260825T051617Z` (SHA-256 `bcd2a057…`)
**Manifest identity:** `30371dfca22295f318480c53ecd8ca2d62ad6c38751eeb19fcab6cd61b433a57`

## The water body

Probing the full corridor rectangle `x=-254..-156, z=-462..-387, y=18..23` in the
accepted snapshot found **938 fluid cells**: **918 `water[level=0]`**, 18
`lava[level=0]`, and 2 bubble-column cells. The user's field probe (~930 water)
is confirmed.

- The **water is a lake/surface body** sitting above and around the bore
  (lake levels y25..29+ visible at the north/west/east edges) — it does **not**
  occupy the first-segment interior.
- The first-segment corridor band `x=-254..-236, y=18..23, z=-462..-457` is
  **solid rock with a contained lava pocket** (12 `lava[level=0]` cells at y18
  on the corridor floor, 6 lava cells on the floor/north liner faces). The lava
  is a non-flowing, fully source-level (level=0) pocket enclosed by rock.

## Containment design

**Treatment:** `SEALED_WATER_MANAGEMENT_LINER_BOX_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND`

A **polished_deepslate liner box** (6 faces) is placed around the 6×6 corridor
clear volume `x=-254..-236, y=18..23, z=-462..-457`:

| Face | Bounds | Cells |
|---|---|---|
| Floor (sub-floor) | y=17, x=-254..-236, z=-462..-457 | 114 |
| Corridor floor fluid | y=18 (12 lava cells) | 12 |
| Ceiling | y=24, x=-254..-236, z=-462..-457 | 114 |
| North wall | z=-463, x=-254..-236, y=18..23 | 114 |
| South wall | z=-456, x=-254..-236, y=18..23 | 114 |
| West cap | x=-255, y=18..23, z=-462..-457 | 36 |
| East cap | x=-235, y=18..23, z=-462..-457 | 36 |
| **Total operated** | | **540** |

The liner **durably seals** the water/lava:
- the 12 corridor-floor lava cells become the dry corridor floor (in-place exact
  REPL, no removal → no flow physics);
- the 6 lava cells sitting on the floor/north liner faces are displaced to solid
  liner (sealed displacement);
- the pocket lava *behind* the liner (z=-464, y17-19) and the surrounding lake
  water body are **preserved exactly** — not deleted.

Every operated cell is an exact-source `REPL` guard; rollback restores each cell
to its exact original state (rock / lava / air / gravel).

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-wl-seg-source-20260825T051548Z` (SHA-256 `f8ac1b9a…`) |
| Exact source guards | 540/540 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (540/540) |
| Strict-noop rollback parser | PASS (540/540) |
| Release-manifest QA | PASS (1 package, 540 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 540/540 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-wl-seg-post-20260825T051617Z` (SHA-256 `bcd2a057…`) |
| Rollback post-state preflight | PASS (540/540 against the post snapshot) |
| Post-state verification | 540/540 polished_deepslate; 6/6 faces fully sealed; corridor interior fluid = 0; preserved exterior lake intact (102 probe cells); sealed lava behind liner preserved (6 cells) |

## Offline evidence

- Water probes: `scripts/probe_rail_wl_water.mjs`, `scripts/probe_rail_wl_reconcile.mjs`, `scripts/probe_rail_wl_exact.mjs`, `scripts/probe_rail_wl_lava.mjs`
- Compiler: `scripts/compile_rail_wl_seg01_liner.mjs`
- Forward/rollback: `data/buildops/rail-wl-seg-01-liner.liner.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-wl-seg-01-liner.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_wl_seg01_post.mjs`
- Live evidence: `data/world-review/rail-wl-segment-live-20260825T051608Z/`
- Regression: `test/build/railWlSegment01.test.ts`

## Boundary / negative claims

- **No whole-corridor claim.** This seals exactly the first 6×6 corridor cell
  block (x=-254..-236) from the Westlight plateau to the first cross-passage
  station at x=-236. Segments x=-235..-156 and the Ravensreach end remain
  follow-up slices.
- **No track, rail, platform, or cross-passage** was built — RAIL-S2 access/civil
  containment only.
- The corridor interior rock is retained; the **RAIL-S3 civil bore** (carving the
  6×6 clear tunnel) is a separate future package.
- The preserved exterior lake and the sealed lava pocket are **not deleted** —
  they remain behind the liner.
- The Westlight access shaft water at y40 and the RR-SE-1 water pocket at y35-37
  are **not touched**.
- `routeCommissioned: false`.
