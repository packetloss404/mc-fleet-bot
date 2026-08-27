# RAVENSGATE-NEXT-01 — NW Garth arrival-pad lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `RAVENSGATE`
**Design/fresh execution source:** `data/worldsnap-ravensgate-next-source-20260825T074220` (SHA-256 `b20555d9679c31cebcb90966f90f8de9605a32f7f8594fcd8a376638076d9a78`)
**Post snapshot:** `data/worldsnap-ravensgate-next-post-20260825T074612` (SHA-256 `89ed06aeee31efb353b8691d5a679077160f14f9b5f92c1a910469dba56245ca`)
**Manifest identity:** `ecbd477e21649d05c1808131482786f7e5fdfe143157f031eb36b7c2e60ee2cd`

## What this release is

The **NW Garth arrival pad** (`z=-450`, `x=-129..-108` stone_bricks band, walk
top y67) is the Ravensgate public arrival node that CIRC-RG-SURFACE-02 (63
cobblestone, `x=-123..-115, y=67, z=-457..-451`) connected from the Approach
Road gravel trunk to the north plaza. The plaza rectangle
`x=-130..-96, z=-455..-448` is fully hardscaped (183 floor cells),
hazard-free, and was **completely unlit** (0 light blocks in the y60..80 band).

This release adds a **flush floor lighting cadence** — 8 exact
`minecraft:sea_lantern` inlays in the stone_bricks arrival-pad floor at y67,
Chebyshev-spaced ≥3 — so the district's primary arrival node carries a light
cadence matching the stoa/garth lantern standard (see
`data/world-review/ravensgate-recensus-20260824/`).

## Why a floor inlay, not a pole/lantern

- A flush floor `sea_lantern` is a full, walkable, opaque block. It adds light
  with **zero geometry change** and no new collision: the plaza walking surface
  stays flat and level. The cadence is purely additive.
- Every target sits over exact `minecraft:stone` (y66) with two clear air blocks
  above (y68, y69) — no headroom impact, no obstruction of the arrival route.
- This is the same treatment class as the accepted WL-DISTRICT-NEXT-01
  (Gatehead arrival-plaza lighting cadence).

## Scope

- **8 cadence cells** (`minecraft:sea_lantern` replacing `stone_bricks` at y67):
  `(-129,67,-450) (-126,67,-450) (-123,67,-450) (-120,67,-450) (-117,67,-450) (-114,67,-450) (-111,67,-450) (-108,67,-450)`.
- **8 exact targets**, zero held, zero hazards.
- **175 preserved plaza floor cells** unchanged (of 183 paved).
- **0 pre-existing plaza lights**; the pad is now lit by the cadence.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-ravensgate-next-source-20260825T074220` (SHA-256 `b20555d9…`) |
| Exact source guards | 8/8 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (8/8) |
| Strict-noop rollback parser | PASS (8/8) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 8/8 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-ravensgate-next-post-20260825T074612` (SHA-256 `89ed06ae…`) |
| Rollback post-state preflight | PASS (8/8 against the post snapshot) |
| Post-state verification | 8/8 cadence cells exact `sea_lantern`; 175/175 preserved floor cells byte-identical; 208-cell halo 0 fluid / 0 forbidden / 0 drift; contested IF-RG-GARTH-LIBRARY-TERRACE band untouched |

## Ownership-interface closure

The Ravensgate re-census (`data/world-review/ravensgate-recensus-20260824/`)
identified **one contested ownership interface**: `IF-RG-GARTH-LIBRARY-TERRACE`
at `z=-432` (`x=-110..-94`). That band is **south** of this arrival pad and is
untouched by this package. The pad sits fully inside the frozen Ravensgate
district and touches no shared wall, storehouse edge, or contested band. The
exact one-owner-per-cell ownership contract for the contested interface and the
other re-census interfaces is produced separately (read-only) in
`data/world-review/ravensgate-ownership-contract-20260825/`.

## Offline evidence

- Compiler: `scripts/compile_ravensgate_north_plaza_lighting.mjs`
- Post QA: `scripts/qa_ravensgate_north_plaza_lighting_post_release.mjs`
- Forward/rollback: `data/buildops/ravensgate-north-plaza-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/ravensgate-north-plaza-lighting.release-manifest.json`
- Live evidence: `data/world-review/ravensgate-next-live-20260825T074559Z/`
- Regression: `test/build/ravensgateNext01.test.ts`

## Boundary

- **Lighting only.** No path, plaza, road, structure, or geometry change.
- **Not a route commissioning.** The NW Garth arrival route is not
  re-classified or commissioned; `routeCommissioned: false`.
- **Reversible.** Rollback is the exact per-cell inverse (sea_lantern →
  stone_bricks) and passed 8/8 against the post snapshot.
- The CIRC-RG-SURFACE-02 cobblestone connection and the contested
  `z=-432` interface band are preserved untouched.
