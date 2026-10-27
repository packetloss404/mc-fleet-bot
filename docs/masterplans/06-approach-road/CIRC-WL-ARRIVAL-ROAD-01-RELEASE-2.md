# CIRC-WL-ARRIVAL-ROAD-01-B · Approach Road pedestrian edge — blocked-segment remainder

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE
**Release node:** `CZ-LEGACY-CROSS-AREA-CIRCULATION`
**Base release:** `CIRC-WL-ARRIVAL-ROAD-01` (85 cells, `data/world-review/approach-road-edge-live-20260824T191620Z/`)
**Source:** fresh immutable snapshot
`data/worldsnap-approach-edge2-source-20260825T065700Z`
(SHA-256 `d05554472b6054a892f6f9ba6b6c623861db29ed5ea65d4bea3918791d4087e0`)
**Post snapshot:** `data/worldsnap-approach-edge2-post-20260825T071200Z`
(SHA-256 `20a8204870015e2159217faf6b094e60953b8a462702770e4063a2b1daac41da`)
**Manifest identity:** `a3e358a73a72d7b6a3169f8788a4887ab34e2a03dfbe67eaf3ffc897fc39b1f0`
**Ledger identity:** `d0aea7290710b73cbb9f09e15161c906465b6b551457aa1ad216004e274385e1`

This follow-on release adds the 2-wide pedestrian edge
(`minecraft:gray_concrete`) at the Approach Road carriageway surface level for
the survey's **previously blocked segments** whose edge cells are now cleanly
buildable, exactly beside the preserved 7-wide ceremonial corridor. It is a
bounded supplement to the executed 85-cell base release.

## Survey and geometry

- Survey: `data/world-review/approach-road-exact-cell-survey-20260824/approach-road-survey.json`
- The survey declared **336 conflict-free candidate cells** across 84 columns
  (2-wide both sides), SHA-256 `2753a9f95a5fa9ce87c2a994ac16ceace87fc6e93b90e6c915ccefc0bfa4f501`.
- **113 of the 197 deck columns were blocked** (blockedBoth 37, blockedNorthOnly
  15, blockedSouthOnly 61) and were **never candidates**. This release re-evaluates
  only those blocked columns against the fresh live snapshot.
- The strict compiler reproduces the survey's column/deck model (197 columns)
  and applies the same walkability + safe-support filter as the base release.

## Build scope

A 2-wide edge side is built only when:

1. **Surface is replaceable non-paved material** — air, cave_air, plants,
   grass_block, dirt, sand, gravel, dirt_path. This is a genuine edge gap; an
   already-paved plaza/apron cell is never recolored.
2. **Headroom:** `deckY+1` and `deckY+2` are non-colliding (standing pedestrian
   fits).
3. **Support:** the cell below is solid, or the air/plant column is safely
   fillable down to a solid non-fluid, non-block-entity base with bounded depth
   (≤ 3).
4. **No hazard:** no fluid, container, sign, control block, block entity, or
   protected feature in the operated envelope or interaction halo.

Executed scope:

| Package | Role | Operations |
|---|---|---|
| `support-fill` | Shallow edge-support fill (`minecraft:stone`) | 104 |
| `edge-pave` | 2-wide pedestrian edge (`minecraft:gray_concrete`) | 78 |
| **Total** | | **182 exact targets** |

`mvpScope: false`, `scopeIds: ['TE-REGIONAL-APPROACH-ROAD']`.

### Built edge columns (from the survey blocked segments)

- **blockedNorthOnly (south sides):** x=-341..-336, -318, -317 (south and
  north) — Gatehead pylon plaza air gaps at y68.
- **blockedBoth:** x=-324/-323 (south, Panorama plaza step at y75), x=-199
  excluded (source is already gray_concrete — no-op, held).
- **blockedSouthOnly (north sides):** x=-321..-320, -316..-307, -272..-265
  (White Bridge / Gatehead shoulder air gaps), -211 (grass gap), -155..-154,
  -152..-149 (Ravensgate shoulder).

The support-fill package grounds the deeper air pockets (plank-deck steps at
-324/-323, the White Bridge shoulder at -309..-307, and the Ravensgate berm at
-272..-265) with bounded stone fills.

## Held cells (374 of the blocked-segment edge cells)

The remaining blocked-segment edge cells are recorded as scoped holds, each with
an exact reason (see the manifest `scope.held.byReason`):

| Reason | Cells |
|---|---|
| `surface-gray_concrete` / `surface-polished_andesite` / `surface-smooth_quartz` / etc. (already-paved, recolor only) | ~170 |
| `support-depth>3` (deep elevated deck, no shallow fill possible) | ~80 |
| `headroom-h2=dark_oak_planks` (overhang canopy) | 13 |
| `headroom-h1=blue_concrete` / `white_concrete` (enclosed facade) | ~10 |
| `surface-oak_leaves` (+headroom) (foliage/canopy) | ~34 |
| `fluid-base@y62` | 8 |
| `surface-spruce_planks` (+headroom) (enclosed wood deck) | ~18 |
| `surface-stone`/`stone_bricks`/`smooth_stone` (paved plaza, recolor only) | ~15 |
| misc. mixed obstacles (glass pane, cut copper, red carpet, oxidized copper) | ~10 |

These are **not** failures — they are exact-cell scoped holds. Already-paved
plaza/apron cells are walkable today (no gap to fill); deep decks, overhanging
canopies, enclosed facades, and fluid-supported bases require a separate design
(ground-level edge, cantilever, or structure) before they can be surfaced.

## Hard-safety kernel evidence

- Fresh immutable source snapshot captured before execution (region SHA-256
  `d0555447...`).
- Block-entity audit: **0 blockers**.
- Live-entity gate: **0 blockers** (no mob blocked the operated envelope).
- Strict-noop parser dry-runs (forward + rollback, both packages): 0 failures,
  0 no-ops.
- Source preflight: 78/78 + 104/104 PASS.
- Strict-noop live execution: **182/182 changed, 0 failed, 0 no-op**
  (support-fill 104/104, edge-pave 78/78).
- Immutable post snapshot captured at `2026-08-25T07:12:00Z`.
- Rollback post-state preflight: 78/78 + 104/104 PASS against the post snapshot.
- Post-state verification: **182/182 operated targets** match the forward
  desired states; **2384/2384 paved carriageway deck cells** unchanged (7-wide
  corridor preserved exactly).

## Evidence

- Compiler: `scripts/compile_approach_road_edge2.mjs`
- Read-only blocked-segment probe: `scripts/probe_approach_road_edge2.mjs`
- Post-state verifier: `scripts/qa_approach_road_edge2_post_state.mjs`
- Forward ops: `data/buildops/approach-road-edge2-pedestrian-edge.{support-fill,edge-pave}.forward.txt`
- Rollback ops: `data/buildops/approach-road-edge2-pedestrian-edge.{support-fill,edge-pave}.rollback.txt`
- Release manifest: `data/buildops/approach-road-edge2-pedestrian-edge.release-manifest.json`
- Live evidence ledger: `data/world-review/approach-road-edge2-live-20260825T071000Z/`
  (includes evidence-ledger.json, execution journals, preflight, block-entity
  audit, live-entity gate, parser dry-runs, rollback post-state preflights, and
  post-state verification)
- Regression: `test/build/approachRoadEdge2.test.ts`

## Boundary

- **No route-commissioning claim.** `routeCommissioned: false`. The edge is a
  walkable pavement strip; it does not commission a bidirectional route, lighting
  cadence, drainage, stopping-bay, or bridge accessibility.
- The 7-wide carriageway is preserved exactly (2384/2384 paved deck cells
  unchanged).
- The remaining held blocked-segment cells (374) remain default-deny for this
  release.
- No block entity, container, control block, or protected feature was touched.
- No mob was relocated or killed (none blocked the envelope).
