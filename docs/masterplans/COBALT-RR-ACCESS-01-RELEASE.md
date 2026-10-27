# COBALT-RR-ACCESS-01 · Ravensreach station access shaft with sealed water sleeve

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `PASSENGER-RAILWAY`
**Program basis:** [Passenger Railway Network Design §3](2026-08-22-passenger-railway-network-design.md), [Engineering Standard §4.1/§4.3](PASSENGER-RAILWAY-ENGINEERING-STANDARD-2026-08-22.md)
**Design source:** accepted post-R08AM snapshot `data/worldsnap-r08am-post-20260822T161818Z` and the Cobalt-S1 station-pair design `data/world-review/cobalt-s1-station-pair-design-20260824/cobalt-s1-design.json`
**Fresh execution source:** `data/worldsnap-cobalt-rr-source-20260825T061214` (SHA-256 `37612eae…`)
**Post snapshot:** `data/worldsnap-cobalt-rr-post-20260825T061750` (SHA-256 `2359d440…`)
**Manifest identity:** `e5ac7d2543849fe06fae7ec7c46916d00a7ca27561862312d65a36f000713d13`

## Problem being resolved

The Cobalt-S1 Westlight↔Ravensreach station-pair design was held at
`readyForFreeze=false` because the Ravensreach preferred service shaft
`RR-SE-1` (x=-158, z=-390) crosses a **y35-37 water pocket** under its 3×3
clear column, and no sealed-sleeve design existed. This release builds the
sealed access shaft through that water pocket, so the station pair's first
vertical route is now physically viable and reversible.

## Water-pocket survey

Probing the accepted post-R08AM snapshot (`scripts/probe_cobalt_rr_water.mjs`,
`scripts/probe_cobalt_rr_shaft.mjs`) established the water body is a **contained
cave-water system, not flowing**:

| Measure | Value |
|---|---|
| Fluid cells in the wider survey box (x=-168..-149, z=-417..-386, y=25..55) | **1061** |
| Fluid cells at the y33-39 band (the pocket) | **433** |
| Water columns at y60-63 (open to surface) | **0** — fully sealed pocket, no surface-open water |
| Fluid cells inside the RR-SE-1 shaft box (x=-160..-156, z=-392..-388, y22..63) | **54** (all at y34-39) |
| Forbidden/container blocks in the box | **0** |
| Fully-dry alternate 3×3 pads in the plateau (y23..62) | **59** |

Because the pocket is contained and the sleeve preserves it exactly behind the
liner, the preferred RR-SE-1 location is used (it keeps the second public route
and the design-specified RR-SE-1/RR-SE-2 pair). The corridor head at x=-181..-156,
y18..23, z=-392..-387 is dry rock — the shaft connects directly to it.

## Built scope

**Treatment:** `SEALED_ACCESS_SHAFT_SLEEVE_FLUID_DISPLACED_ON_FACES_PRESERVED_BEHIND`

A polished_deepslate sleeve box (six faces) around a **3×3 clear** vertical
shaft from the corridor head (y23) to the surface plateau (y62):

| Element | Volume |
|---|---|
| Clear shaft | x=-159..-157, y=23..62, z=-391..-389 (3 wide × 40 tall) |
| Sleeve floor cap | y=22, x=-160..-156, z=-392..-388 |
| Sleeve ceiling cap | y=63, x=-160..-156, z=-392..-388 |
| Sleeve west/east walls | x=-160 / x=-156, y=23..62, z=-392..-388 |
| Sleeve north/south walls | z=-392 / z=-388, y=23..62, x=-159..-157 |

Every operated cell becomes `polished_deepslate` via an exact-source in-place
`REPL` guard — never a removal — so no flow/gravity physics are triggered:

- **33 face fluid cells** sealed (water sitting on the sleeve faces in the
  y34-39 band is displaced to solid liner in place).
- **21 water-band shaft-interior cells** displaced (the contained water inside
  the clear column at y34-39 becomes the dry shaft floor/wall liner).
- **0 gravity** and **0 forbidden** cells held.
- The **contained cave-water body behind the sleeve** is preserved exactly —
  not deleted.

Rollback restores every one of the 711 cells to its exact original state.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-cobalt-rr-source-20260825T061214` (SHA-256 `37612eae…`) |
| Exact source guards | 711/711 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (711/711) |
| Strict-noop rollback parser | PASS (711/711) |
| Release-manifest QA | PASS (1 package, 711 unique targets, 0 cross-package intersections) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | **711/711 changed, 0 failed, 0 no-op** |
| Immutable post snapshot | `data/worldsnap-cobalt-rr-post-20260825T061750` (SHA-256 `2359d440…`) |
| Rollback post-state preflight | PASS (711/711 against post snapshot) |
| Post-state verification | 711/711 polished_deepslate; 6/6 faces fully sealed; clear 3×3 shaft fluid = 0; preserved contained cave-water behind sleeve |

## Offline evidence

- Water survey probes: `scripts/probe_cobalt_rr_water.mjs`, `scripts/probe_cobalt_rr_shaft.mjs`, `scripts/probe_cobalt_rr_candidates.mjs`, `scripts/probe_cobalt_rr_corridor_head.mjs`
- Compiler: `scripts/compile_cobalt_rr_access_01.mjs`
- Forward/rollback: `data/buildops/cobalt-rr-access-01.sleeve.{forward,rollback}.txt`
- Manifest: `data/buildops/cobalt-rr-access-01.release-manifest.json`
- Post-state verifier: `scripts/verify_cobalt_rr_access_01_post.mjs`
- Live evidence: `data/world-review/cobalt-rr-live-20260825T061739/`
- Regression: `test/build/cobaltRrAccess01.test.ts`

## Boundary / negative claims

- **No whole-station claim.** This is the RR-SE-1 access shaft only. The
  Westlight↔Ravensreach corridor/guideway, the Ravensreach station box, the
  RR-SE-2 service exit, and the Westlight end are NOT part of this package.
- **No track, rail, platform, stair, cross-passage, or commissioning** — RAIL-S2
  access/civil containment only. The shaft clear-volume interior rock is
  retained; the later RAIL-S3/station fit-out carves the 3×3 open stair route.
- The **contained cave-water pocket is not deleted** — it remains preserved
  behind the sealed sleeve.
- The second public street-to-platform route into Ravensreach is still a
  separate follow-up (the pair's `readyForFreeze` gate remains pending that
  route survey plus the Westlight headhouses).
- `routeCommissioned: false`.
