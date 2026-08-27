# RAIL-S2-WL-SEGMENT-04-06 · Westlight rail-corridor water containment, segments 04+05+06

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md)
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z` (shared with segments 01-03)
**Fresh execution source:** `data/worldsnap-rail-wl-seg456-source-20260825T061200Z` (SHA-256 `7b0d534b…`)
**Post snapshot:** `data/worldsnap-rail-wl-seg456-post-20260825T061300Z` (SHA-256 `008a6baf…`)
**Manifest identity:** `6893cf9d9027c880585264d9dea8fb4b95d745d8ab1a90d19b0c2e40c7d4ea5e`

## Scope

Continues the sealed 6×6 water-management liner east from the accepted
[RAIL-S2-WL-SEGMENT-02-03](RAIL-S2-WL-SEGMENT-02-03-RELEASE.md) corridor block:

| Segment | Corridor clear volume | Cells |
|---|---|---|
| SEGMENT-04 | x=-195..-176, y=18..23, z=-462..-457 | 516 |
| SEGMENT-05 | x=-175..-156, y=18..23, z=-462..-457 | 516 |
| SEGMENT-06 | x=-155..-136, y=18..23, z=-462..-457 | 516 |
| **Total** | | **1548** |

All three interiors are **dry rock** (0 fluid cells in the accepted snapshot and
the fresh source). Segment-03 already sealed its east cap at x=-195 (y18..23,
z=-462..-457), which becomes **segment-04's west wall**. Segment-04's new east
cap at x=-175 becomes **segment-05's west wall**; segment-05's new east cap at
x=-155 becomes **segment-06's west wall**. Each segment therefore builds five of
the six liner faces (floor y=17, ceiling y=24, north z=-463, south z=-456, east
cap), all `polished_deepslate`.

## Containment design

**Treatment:** `SEALED_WATER_MANAGEMENT_LINER_BOX_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND`

Same as segments 01-03: a polished_deepslate liner box (six faces) around each
6×6 corridor clear volume. Every operated cell is an exact-source in-place
`REPL` guard — never a removal — so no flow/gravity physics are triggered.

- **0 interior fluid** — all three segment interiors were already dry rock.
- **0 face fluid cells** — no contained fluid pocket intrudes the faces of
  these three segments.
- **11 gravity cells sealed:** gravel sitting on the segment-04 ceiling/south
  face/north face and the segment-04 east cap, plus segment-05 ceiling/north
  face/west cap and segment-06 (the exact count is recorded per face in the
  build records). These are gravity-sealed to polished_deepslate.
- The **preserved exterior lake water** (columns at y15..16 and y28..30 in the
  corridor-adjacent envelope) and the **wider-corridor water at z=-399..-396**
  (4 cells in the segment-06 rectangle) are **preserved exactly** — not deleted.
  64 exterior fluid cells are unchanged between source and post.

Every operated cell is an exact-source `REPL`; rollback restores each cell to
its exact original state (rock / andesite / granite / gravel / air).

## Corridor z-width alignment

The full corridor design rectangle `x=-254..-156, z=-462..-387, y=18..23`
carries 938 fluid cells (per the segments 01-03 survey). The sealed 6×6 service
corridor bore `z=-462..-457` is the sole water-management envelope built in this
release. Segment-06 **does not extend the corridor z-width**: the wider corridor
rectangle was surveyed and the 4 residual water cells at `x=-139..-137,
z=-399..-396` inside the segment-06 rectangle are preserved untouched behind the
6×6 liner envelope.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-wl-seg456-source-20260825T061200Z` (SHA-256 `7b0d534b…`) |
| Exact source guards | 516/516 (seg04) + 516/516 (seg05) + 516/516 (seg06) PASS against the fresh execution source |
| Strict-noop forward parser | PASS (516/516 + 516/516 + 516/516) |
| Strict-noop rollback parser | PASS (516/516 + 516/516 + 516/516) |
| Release-manifest QA | PASS (3 packages, 1548 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | seg04 516/516 changed, seg05 516/516 changed, seg06 516/516 changed; 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-wl-seg456-post-20260825T061300Z` (SHA-256 `008a6baf…`) |
| Rollback post-state preflight | PASS (seg06 516/516, then seg05 516/516 with seg06 overlay, then seg04 516/516 with seg05+seg06 overlay) |
| Post-state verification | 1548/1548 polished_deepslate; 15/15 faces fully sealed; corridor interiors fluid = 0; preserved exterior water intact (64 cells, unchanged); segment-03 east cap x=-195 and segment-06 east cap x=-135 sealed 36/36 |

## Offline evidence

- Compiler: `scripts/compile_rail_wl_seg456_liner.mjs`
- Forward/rollback: `data/buildops/rail-wl-seg-456-liner.seg0{4,5,6}.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-wl-seg-456-liner.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_wl_seg456_post.mjs`
- Live evidence: `data/world-review/rail-wl-seg456-live-20260825T061200Z/`
- Regression: `test/build/railWlSeg456.test.ts`

## Boundary / negative claims

- **No whole-corridor claim.** This seals exactly segments x=-195..-176,
  x=-175..-156 and x=-155..-136. Segments x=-135.. and the Ravensreach end
  remain follow-up slices.
- **No track, rail, platform, or cross-passage** was built — RAIL-S2 access/civil
  containment only.
- The corridor interior rock is retained; the **RAIL-S3 civil bore** (carving the
  6×6 clear tunnel) is a separate future package.
- The preserved exterior lake and the wider-corridor water at z=-399..-396 are
  **not deleted** — they remain behind the liner.
- The Westlight access shaft water at y40 and the RR-SE-1 water pocket at y35-37
  are **not touched**.
- Segment-06 does **not** extend the corridor z-width; the sealed 6×6 corridor
  bore is the sole water-management envelope built.
- `routeCommissioned: false`.
