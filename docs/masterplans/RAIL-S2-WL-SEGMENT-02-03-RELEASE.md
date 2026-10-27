# RAIL-S2-WL-SEGMENT-02-03 · Westlight rail-corridor water containment, segments 02+03

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md), [Program §3](PASSENGER-RAILWAY-PROGRAM-2026-08-22.md)
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z` (shared with segment-01)
**Fresh execution source:** `data/worldsnap-rail-wl-seg23-source-20260825T0546Z` (SHA-256 `6453960a…`)
**Post snapshot:** `data/worldsnap-rail-wl-seg23-post-20260825T0548Z` (SHA-256 `a1e4bf91…`)
**Manifest identity:** `9a3f4f43c35cb0ee87ee25c51ab058a6a61de61fc4aac88fb72776c0ade74de5`

## Scope

Continues the sealed 6×6 water-management liner east from the accepted
[RAIL-S2-WL-SEGMENT-01](RAIL-S2-WL-SEGMENT-01-RELEASE.md) corridor block:

| Segment | Corridor clear volume | Cells |
|---|---|---|
| SEGMENT-02 | x=-235..-216, y=18..23, z=-462..-457 | 516 |
| SEGMENT-03 | x=-215..-196, y=18..23, z=-462..-457 | 516 |
| **Total** | | **1032** |

Both interiors are **dry rock** (0 fluid cells in the accepted snapshot and the
fresh source). Segment-01 already sealed its east cap at x=-235 (y18..23,
z=-462..-457), which becomes **segment-02's west wall**. Segment-02's new east
cap at x=-215 becomes **segment-03's west wall**. Each segment therefore builds
five of the six liner faces (floor y=17, ceiling y=24, north z=-463, south
z=-456, east cap), all `polished_deepslate`.

## Containment design

**Treatment:** `SEALED_WATER_MANAGEMENT_LINER_BOX_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND`

Same as segment-01: a polished_deepslate liner box (six faces) around each 6×6
corridor clear volume. Every operated cell is an exact-source in-place `REPL`
guard — never a removal — so no flow/gravity physics are triggered.

- **4 face fluid cells sealed:** the contained `lava[level=0]` pocket sitting
  on segment-02's north liner face (x=-233..-230, y=18, z=-463) is displaced to
  solid liner in place.
- **15 gravity cells sealed:** gravel sitting on the segment-02 ceiling
  (x=-219..-216, y=24) and segment-02 south face (x=-220..-216, y=21..23,
  z=-456) plus segment-03 ceiling/south-face gravel are gravity-sealed to
  polished_deepslate.
- **0 interior fluid** — both segment interiors were already dry rock.
- The **preserved exterior lake water** (columns at y24..30 above/beside the
  liners) and the **sealed lava pocket behind the north liner** (11 cells at
  z=-464) are **preserved exactly** — not deleted.

Every operated cell is an exact-source `REPL`; rollback restores each cell to
its exact original state (rock / gravel / air / lava).

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-rail-wl-seg23-source-20260825T0546Z` (SHA-256 `6453960a…`) |
| Exact source guards | 516/516 (seg02) + 516/516 (seg03) PASS against the fresh execution source |
| Strict-noop forward parser | PASS (516/516 + 516/516) |
| Strict-noop rollback parser | PASS (516/516 + 516/516) |
| Release-manifest QA | PASS (2 packages, 1032 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | seg02 516/516 changed, seg03 516/516 changed; 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-rail-wl-seg23-post-20260825T0548Z` (SHA-256 `a1e4bf91…`) |
| Rollback post-state preflight | PASS (seg03 516/516 then seg02 516/516 with reverse overlay) |
| Post-state verification | 1032/1032 polished_deepslate; 10/10 faces fully sealed; corridor interiors fluid = 0; preserved exterior lake intact; sealed lava behind liner preserved (11 cells) |

## Offline evidence

- Compiler: `scripts/compile_rail_wl_seg23_liner.mjs`
- Forward/rollback: `data/buildops/rail-wl-seg-23-liner.seg02.{forward,rollback}.txt`, `data/buildops/rail-wl-seg-23-liner.seg03.{forward,rollback}.txt`
- Manifest: `data/buildops/rail-wl-seg-23-liner.release-manifest.json`
- Post-state verifier: `scripts/verify_rail_wl_seg23_post.mjs`
- Live evidence: `data/world-review/rail-wl-seg23-live-20260825T0548Z/`
- Regression: `test/build/railWlSeg23.test.ts`

## Boundary / negative claims

- **No whole-corridor claim.** This seals exactly segments x=-235..-216 and
  x=-215..-196. Segments x=-195..-156 and the Ravensreach end remain follow-up
  slices.
- **No track, rail, platform, or cross-passage** was built — RAIL-S2 access/civil
  containment only.
- The corridor interior rock is retained; the **RAIL-S3 civil bore** (carving the
  6×6 clear tunnel) is a separate future package.
- The preserved exterior lake and the sealed lava pocket are **not deleted** —
  they remain behind the liner.
- The Westlight access shaft water at y40 and the RR-SE-1 water pocket at y35-37
  are **not touched**.
- `routeCommissioned: false`.
