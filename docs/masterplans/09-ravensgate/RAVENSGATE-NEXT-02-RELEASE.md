# RAVENSGATE-NEXT-02 — Garth statue-plaza lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `RAVENSGATE`
**Design source:** accepted R08AM post snapshot `data/worldsnap-r08am-post-20260822T161818Z`
**Fresh execution source:** `data/worldsnap-sweep3-source-20260825T164404Z` (SHA-256 `ac4794aeaf00b036dc4db46346096f6f52e9db8ef6cf0bc7d716002d40b934a6`)
**Post snapshot:** `data/worldsnap-sweep3-post-20260825T164707Z` (SHA-256 `370eb18ff0964100d0dac0738673faf23070d1f26c328e76de334b9ffd2fc6c8`)
**Manifest identity:** `b2dad98b2f1ff65876cf6ef3502dd8abc389091043ff2eb9042fef0e086f2c00`

## What this release is

The **RG-GARTH-STATUES central civic plaza** (`x=-93..-68, z=-444..-428`,
floor y67) is the Ravensgate district's largest public-realm hardscape: a fully
paved stone_bricks / smooth_stone plaza (301 floor cells, 201 interior) carrying
the six authored statue plinths. The Ravensgate re-census
(`data/world-review/ravensgate-recensus-20260824/`) classifies it as
`IF-RG-GARTH-STATUES IN_DISTRICT_PUBLIC_REALM`, uncontested, fully inside the
frozen district. It was effectively unlit: the only light sources were eight
hanging lanterns along the `z=-430` north edge at y73 (6 blocks above the
floor).

This release adds a **flush floor lighting cadence** — 22 exact
`minecraft:sea_lantern` inlays in the stone_bricks plaza floor at y67,
Chebyshev-spaced ≥3, kept ≥4 blocks from the existing north-edge lantern line
and outside every statue-plinth halo — so the central plaza carries the same
light cadence standard as the accepted RAVENSGATE-NEXT-01 arrival pad and
WL-DISTRICT-NEXT-01 Gatehead plaza.

## Why a floor inlay, not a pole/lantern

- A flush floor `sea_lantern` is a full, walkable, opaque block. It adds light
  with **zero geometry change** and no new collision: the plaza walking surface
  stays flat and level. The cadence is purely additive.
- Every target sits over a solid non-fluid stone base (y66) with two clear air
  blocks above (y68, y69) — no headroom impact, no obstruction of the public
  realm, and no impact on the six statue plinths (their 3x3 `smooth_quartz`
  bases at y67-68 and copper/gold columns above are preserved exactly).
- This is the same treatment class as the accepted RAVENSGATE-NEXT-01 /
  WL-DISTRICT-NEXT-01 flush floor cadence.

## Scope

- **22 cadence cells** (`minecraft:sea_lantern` replacing `stone_bricks` at y67):
  `(-92,-440) (-92,-434) (-89,-443) (-89,-440) (-89,-434) (-88,-437) (-83,-443) (-83,-439) (-83,-436) (-80,-443) (-80,-440) (-80,-437) (-80,-434) (-77,-443) (-77,-440) (-77,-434) (-74,-443) (-74,-440) (-74,-437) (-74,-434) (-71,-440) (-71,-436)`.
- **22 exact targets**, zero held, zero hazards.
- **279 preserved plaza floor cells** unchanged (of 301 paved).
- **6 statue plinths preserved** exactly; **8 pre-existing north-edge lanterns**
  untouched; cadence cells stay ≥4 Chebyshev from them.
- **Contested `IF-RG-GARTH-LIBRARY-TERRACE` band (`z=-432`) untouched** — it lies
  south-west of this plaza and the 22 targets are ≥4 blocks from any `z=-432`
  cell.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-sweep3-source-20260825T164404Z` (SHA-256 `ac4794ae…`) |
| Exact source guards | 22/22 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (22/22) |
| Strict-noop rollback parser | PASS (22/22) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | **22/22 changed, 0 failed, 0 no-op** (strict-noop) |
| Immutable post snapshot | `data/worldsnap-sweep3-post-20260825T164707Z` (SHA-256 `370eb18f…`) |
| Rollback post-state preflight | PASS (22/22 against the post snapshot) |
| Post-state verification | 22/22 cadence cells exact `sea_lantern`; 279/279 preserved floor cells byte-identical; 572-cell halo 0 fluid / 0 forbidden / 0 drift; 6/6 statue plinths preserved; exact 22/22 inverse |

## Offline evidence

- Compiler: `scripts/compile_ravensgate_garth_plaza_lighting.mjs`
- Post QA: `scripts/qa_ravensgate_garth_plaza_lighting_post_release.mjs`
- Forward/rollback: `data/buildops/ravensgate-garth-plaza-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/ravensgate-garth-plaza-lighting.release-manifest.json`
- Live evidence: `data/world-review/sweep3-live-20260825T164707Z/`
- Regression: `test/build/ravensgateNext02.test.ts`

## Boundary

- **Lighting only.** No path, plaza, road, structure, or geometry change.
- **Not a route commissioning.** The plaza is not re-classified or
  commissioned; `routeCommissioned: false`.
- **Reversible.** Rollback is the exact per-cell inverse (sea_lantern →
  stone_bricks) and passed 22/22 against the post snapshot.
- The garden-loop south segment (z=-455..-550) founded-walk hold, the
  restricted underground exclusion, and the contested `z=-432` interface band
  are preserved untouched.
