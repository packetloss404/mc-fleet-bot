# WL-DISTRICT-NEXT-01 · Westlight District Gatehead arrival-plaza lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release scope:** `WESTLIGHT-DISTRICT`
**Design/fresh execution source:** `data/worldsnap-wl-district-next-source2-20260825T072825Z` (SHA-256 `b58480168f15fe4b827b8d345de2b1df5c0e903b0a17f4343d1fce4b18f0be44`)
**Post snapshot:** `data/worldsnap-wl-district-next-post-20260825T073021Z` (SHA-256 `73ce29dcdba1619f0dfffd0776e47d691b8c816344d80b356629a68174742a5b`)
**Manifest identity:** `652f68ce73db0db887c3fae38773aab838f8ee35961e164ee4d27a2f35abbd13`

## What this release is

The **Gatehead arrival plaza** (`x=-342..-336, z=-490..-476`, walk top y68) is
the Westlight District's paved public arrival node where the Western Approach
Road pedestrian edge meets the district. It is fully paved (63 polished_diorite
floor cells), hazard-free, and was **completely unlit** (0 light blocks in the
y60..80 band across the plaza). This release adds a **flush floor lighting
cadence** — 5 exact `minecraft:sea_lantern` inlays in the polished_diorite
floor at y67, Chebyshev-spaced ≥3 — so the district's primary arrival node
carries a light cadence matching the venue's "concourse lantern cadence" /
"sea_lantern installation" maintenance standard that the MP13 WLV-1 ops survey
lists as cleanly buildable alone.

## Why a floor inlay, not a pole/lantern

- A flush floor `sea_lantern` is a full, walkable, opaque block. It adds light
  with **zero geometry change** and no new collision: the plaza walking surface
  stays flat and level. The cadence is purely additive.
- Every target sits over exact `minecraft:stone` (y66) with two clear air blocks
  above (y68, y69) — no headroom impact, no obstruction of the arrival route.
- The package avoids the 2-wide `gray_concrete` pedestrian edge band
  (`z=-483..-482` at y68) added by the later CIRC-WL-ARRIVAL-ROAD-01-B release:
  the cadence is derived from the current source, so any floor cell buried under
  that edge (y68 no longer air) is automatically excluded.

## Scope

- **5 cadence cells** (`minecraft:sea_lantern` replacing `polished_diorite` at
  y67): `(-341,67,-480) (-341,67,-477) (-338,67,-486) (-338,67,-480)
  (-338,67,-477)`.
- **5 exact targets**, zero held, zero hazards.
- **58 preserved plaza floor cells** unchanged (of 63 paved).
- **0 pre-existing plaza lights**; the plaza is now lit by the cadence.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-wl-district-next-source2-20260825T072825Z` (SHA-256 `b5848016…`) |
| Exact source guards | 5/5 PASS against the fresh execution source2 |
| Strict-noop forward parser | PASS (5/5) |
| Strict-noop rollback parser | PASS (5/5) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers) |
| Live execution | 5/5 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-wl-district-next-post-20260825T073021Z` (SHA-256 `73ce29dc…`) |
| Rollback post-state preflight | PASS (5/5 against the post snapshot) |
| Post-state verification | 5/5 cadence cells exact `sea_lantern`; 58/58 preserved floor cells byte-identical; 130-cell halo 0 fluid / 0 forbidden / 0 drift |

## Design-history note

The first compile pass pinned to the older r08am design snapshot selected two
cells (`(-341,-482)`, `(-337,-482)`) that are **buried under the
CIRC-WL-ARRIVAL-ROAD-01-B gray_concrete pedestrian edge** built later at y68
(`z=-483..-482`). A fresh-source comparison caught this before acceptance; the
package was rolled back 5/5 (exact inverse) and re-derived from the current
source, which excludes the edge band automatically. This is the mechanism the
fresh-source hard-safety gate exists for.

## Offline evidence

- Compiler: `scripts/compile_wl_district_gatehead_plaza_lighting.mjs`
- Post QA: `scripts/qa_wl_district_gatehead_plaza_lighting_post_release.mjs`
- Forward/rollback: `data/buildops/wl-district-gatehead-plaza-lighting.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/wl-district-gatehead-plaza-lighting.release-manifest.json`
- Live evidence: `data/world-review/wl-district-next-live-20260825T073021Z/`
- Regression: `test/build/wlDistrictNext01.test.ts`

## Boundary

- **Lighting only.** No path, plaza, road, structure, or geometry change.
- **Not a route commissioning.** The Gatehead arrival route is not
  re-classified or commissioned; `routeCommissioned: false`.
- **Reversible.** Rollback is the exact per-cell inverse (sea_lantern →
  polished_diorite) and passed 5/5 against the post snapshot.
- The CIRC-WL-ARRIVAL-ROAD-01-B pedestrian edge band (`z=-483..-482` at y68) is
  preserved untouched.
