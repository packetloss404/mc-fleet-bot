# APPROACH-LIGHTS-01 · Approach Road pedestrian-edge lighting cadence

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-LEGACY-CROSS-AREA-CIRCULATION`
**Release scope:** `TE-REGIONAL-APPROACH-ROAD`
**Design/fresh execution source:** `data/worldsnap-approach-lights-source-20260825T152239Z` (SHA-256 `f862a3390c4efb9c5f7bf5f75f43a7dd051072041e7ab550f217d73e78c22256`)
**Post snapshot:** `data/worldsnap-approach-lights-post-20260825T154047Z` (SHA-256 `7164a45d77b8a17cd07687e447747476ddf99fa244332277eeca6454a8e46ca9`)
**Manifest identity:** `818dae5c281f68f17ef355d5b9c552aab796324f48592fed46615a3f9bc5a8be`

## What this release is

The Western Approach Road 2-wide pedestrian edge is **done** — 85 edge cells
(`CIRC-WL-ARRIVAL-ROAD-01`, 2026-08-24) plus 78 more (`CIRC-WL-ARRIVAL-ROAD-01-B`,
2026-08-25) = **145 `minecraft:gray_concrete` edge-pave cells**, all verified
present in the current source. The accepted exact-cell survey
(`data/world-review/approach-road-exact-cell-survey-20260824/`) found the road
had **no regular lighting cadence**: light only clustered at arrival pylons,
towers, and plaza edges (49 `sea_lantern`s + 2 `lantern`s), while the Town
Expansion `TE-ROAD-01` contract declares `lightingRhythmBlocks: 12` as a design
target.

This release adds a **flush pedestrian-edge lighting cadence** — exact
`minecraft:sea_lantern` inlays in the built `gray_concrete` pedestrian edge at
the carriageway surface level, along the survey's **conflict-free segments**, at
a **12-block road rhythm**. The cadence is purely additive: a flush floor
`sea_lantern` is a full, walkable, opaque block that keeps the pedestrian-edge
surface flat and level, with zero geometry change.

## Why a floor inlay, not a pole/lantern

- A flush floor `sea_lantern` adds light with **zero geometry change** and no
  new collision: the pedestrian-edge walking surface stays flat and level.
- Every target sits over a solid non-fluid base with two clear air blocks above
  (no headroom impact, no obstruction of the edge or the carriageway).
- This is the same treatment class as the accepted RAVENSGATE-NEXT-01 and
  WL-DISTRICT-NEXT-01 arrival-node lighting cadences.
- The compiler excludes any candidate with an existing light block within a
  4-block radius, so the cadence stays clear of the arrival-pylon clusters and
  never double-lights an already-lit arrival node.

## Scope

- **6 cadence cells** (`minecraft:sea_lantern` replacing `gray_concrete` edge):
  `(-322,68,-511) (-251,71,-490) (-221,70,-491) (-182,71,-509) (-163,71,-509) (-148,69,-506)`.
- **6 exact targets**, zero held, zero hazards.
- **139 preserved pedestrian-edge cells** unchanged (of 145 built).
- **964/964 carriageway deck cells** unchanged (7-wide corridor preserved exactly).
- **0 pre-existing nearby lights** at any cadence target (4-block radius clear).

### Cadence placement (survey conflict-free segments)

| X | Segment | Y | Z | Notes |
|---|---|---|---|---|
| -322 | `-322` | 68 | -511 | west clean-both column |
| -251 | `-251..-245` | 71 | -490 | north edge, outer |
| -221 | `-242..-215` | 70 | -491 | central run |
| -182 | `-189..-174` | 71 | -509 | outer edge |
| -163 | `-167..-158` | 71 | -509 | outer edge |
| -148 | `-148` | 69 | -506 | Ravensgate interface column |

Each is the **outer** pedestrian-edge cell (farthest from the modeled
centerline), so the light sits on the walking edge, not in the carriageway.

## Hard-safety kernel evidence

| Gate | Result |
|---|---|
| Fresh immutable source | `data/worldsnap-approach-lights-source-20260825T152239Z` (SHA-256 `f862a339…`) |
| Exact source guards | 6/6 PASS against the fresh execution source |
| Strict-noop forward parser | PASS (6/6) |
| Strict-noop rollback parser | PASS (6/6) |
| Block-entity audit | PASS (0 conflicts) |
| Live-entity gate | PASS (0 blockers; 105 pre-existing forceload chunks preserved, 7 temporary chunks released) |
| Live execution | 6/6 changed, 0 failed, 0 no-op |
| Immutable post snapshot | `data/worldsnap-approach-lights-post-20260825T154047Z` (SHA-256 `7164a45d…)` |
| Rollback post-state preflight | PASS (6/6 against the post snapshot) |
| Post-state verification | 6/6 cadence cells exact `sea_lantern`; 139/139 preserved edge cells `gray_concrete`; 156-cell halo 0 fluid / 0 forbidden / 0 drift; 964/964 carriageway deck cells unchanged |

## Offline evidence

- Compiler: `scripts/compile_approach_lights_cadence.mjs`
- Read-only probe: `scripts/probe_approach_lights.mjs`
- Post-state verifier: `scripts/qa_approach_lights_post_state.mjs`
- Forward/rollback: `data/buildops/approach-lights-cadence.cadence.{forward,rollback}.txt`
- Manifest: `data/buildops/approach-lights-cadence.release-manifest.json`
- Live evidence: `data/world-review/approach-lights-live-20260825T154047Z/`
- Regression: `test/build/approachLights01.test.ts`

## Boundary

- **Lighting only.** No path, plaza, road, structure, or geometry change.
- **Pedestrian edge preserved.** All 145 built `gray_concrete` edge cells remain
  walkable; the 6 cadence cells are flush full-opaque inlays at the same level.
- **Carriageway preserved.** 964/964 deck-paving cells byte-identical.
- **Not a route commissioning.** The edge is not re-classified or commissioned;
  `routeCommissioned: false`. It adds light only.
- **Reversible.** Rollback is the exact per-cell inverse (sea_lantern →
  gray_concrete) and passed 6/6 against the post snapshot.
- The arrival-pylon/plaza light clusters and the WL-DISTRICT-NEXT-01 Gatehead
  plaza cadence are preserved untouched (4-block light-exclusion radius).
