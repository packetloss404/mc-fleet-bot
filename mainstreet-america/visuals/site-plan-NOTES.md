# `site-plan.svg` — provenance notes

**Drawn:** 2026-07-24. **Sheet:** SP-1 (Sheet A = protected-envelope context plan, Sheet B = showcase-street
detail). **Canvas:** 1600 × 1712, self-contained SVG, system fonts only, no external assets.

Source precedence used throughout: **`qa/as-built-survey.md` (live-server RCON) > planning docs**, per the
`planning/open-questions.md` DECIDED table of 2026-07-24 (OQ-1/OQ-2/OQ-5: repoint the docs to the as-built
compact-street geometry). Everything the survey does not cover is drawn from the planning set and is
**labelled on the drawing as planned-not-built**, or is flagged as this drawing's own invention.

> **Superseded-state warning (2026-07-26):** this drawing is a provenance artifact for the initial
> 2026-07-24 survey, not a current site map. Parking, the terraced south gate, the loop near `(0,+190)`,
> Guest Center south entry, service buildings, billboard, all 12 homes, infill, mountain complex, and
> fence were subsequently built/recovered. Use `data/world-map.db`,
> `qa/audit-2026-07-26.md`, and `qa/parking-recovery-2026-07-26.md` for current state.

---

## 1. Drawn from the AS-BUILT SURVEY (measured, `qa/as-built-survey.md`)

| Drawn element | Survey statement used |
|---|---|
| Guest Center plate `x −70…+70`, `z 90…180`, centroid ≈ (0, ~135) | "solid x −70…+70 (~141 wide) at z=128; z ~90…180+ deep at x=0" |
| GC height / hollow / materials annotation | "solid y63 → y79 (~16 blocks)"; "interior air y65–68"; polished_andesite floor, sea_lantern, gray_concrete roof, stone_brick foundation |
| Dashed north edge of the GC at z=180 labelled "probe reached 180+" | the survey writes "180+", i.e. the north face was never reached |
| Street spine, solid, `x=0`, `z +200 → −235` | "continuous placed surface at y=63 along x=0, z ~+200 → −235 (~435 blocks)" |
| Water band under the north stretch, `z −235…−100` | "bridges over water (y62=water z −100…−235)" |
| Nine home clusters: west `z ≈ {0, −96, −144, −195}`, east `z ≈ {21, −48, −93, −144, −195}` | verbatim from the survey's "Homes detected" row |
| Homes' street-facing edge at `x ≈ ±20–25` | "homes sit at x ≈ ±20–25" |
| Material families: west = deepslate brick, east = stone brick | verbatim; the survey's parenthetical "(≈ Ashby Manor / Old World)" is a *read*, not an identification, so **no name was placed on any lot** |
| Grading note "core graded to y≈63, natural ground ≈y120 at (250,250)" | survey "Terrain" row |
| "~9 clusters vs a verified 12" callout | survey divergence 3 + `qa/defects.yaml` DEF-003 |

## 2. Drawn from PLANNING DOCS ONLY — rendered dashed/muted as NOT BUILT

All of these come from `planning/site-plan.md` (master narrative) and/or `planning/coordinates.yaml`, and
all are on the survey's "Not yet built" list:

- Parking field Z02 `x −170…+170, z +120…+235`; frontage road `z ≈ +283…+293`; entrance drive on `x=0`
  from `z +200` to `+300`; drop-off loop (0, +135) r22; planned main entrance (0, +119).
- Event lawn Z09 `x 70…160, z −15…+120`.
- Cooking School / Retail Z05 `x −135…−90, z −30…+16` (site-plan centroid −112, −7) **and** the rival pad
  (−190, −90) from `coordinates.yaml` — both shown, neither chosen (OQ-3 decided "separate structure" but
  the pad falls out of the pending repoint).
- Warehouse Z06 `x −120…−73, z −230…−183` (site-plan −96, −206) **and** the rival pad (0, −255) from
  `coordinates.yaml` — both shown (OQ-5 / CONFLICT-01).
- Detention pond Z07 (Sheet A only), perimeter greenbelt Z08, cul-de-sac terminus (0, −215).
- LED monument: **both** candidate positions drawn — A (−260, +280) from `coordinates.yaml`, B (+95, +272)
  from `site-plan.md`. Unresolved (OQ-2).
- Ghost lines for the two **superseded** planned home rows (GRID `x = ±85`, OVAL `x ≈ ±116`) and the
  superseded planned GC plate (0, +88) 90×60 — drawn grey and labelled superseded, to make the
  as-built-vs-plan divergence legible.
- The 12-home roster table: names, styles, square footages and storey counts are **verified** (REF-017),
  taken from `planning/buildings.yaml` / `planning/coordinates.yaml`. No footprint size from those files was
  applied to any lot on the map, because no lot has a name.

## 3. Reserved / cross-build elements

- **Four Raven Rock portal-approach corridors** at the ±285 envelope edges, hatched RESERVED NO-BUILD
  (MSA OQ-7; Raven Rock OQ-1). Mouth coordinates from `raven-rock/planning/coordinates.yaml`: N3 (−150, +285) — **relocated 2026-07-24, the drawings still show it at (0, +285)**,
  N4 (0, −285), N5 (+285, −30), **N6 (−290, +5)** — the drawing notes that the west mouth is at −290, not
  −285, contrary to the shorthand in the decision tables.
- **RR-Z5 shaft head shown RELOCATED** to (200, 64, −15), footprint `x ∈ [193,207]`, `z ∈ [−22,−8]`, with a
  ±5 margin ring — outside MSA's footprint, so MSA's east flank is unconstrained (OQ-7 decision).

## 4. INVENTED FOR DRAFTING — this drawing's own additions, no source

Stated on the drawing itself (legend + footnote 2):

1. **Every lot outline** (`x |10|…|66|`, 40 blocks deep). No source defines lot lines; drawn purely so the
   sheet reads as a plat.
2. **The 9-block carriageway width** (`x −4.5…+4.5`). The survey probed the street only along the `x=0`
   column and never measured its width.
3. **Each home footprint box as 24 × 22 blocks.** Only the street-facing edge (`x ≈ ±20–25`) was probed;
   the outboard extent, the depth and the exact z-span of every cluster are unmeasured.
4. **The water band's lateral extent** (drawn `x −14…+14`). Water was probed only on the `x=0` column.
5. **The three unconfirmed lots** — drawn at west `z ≈ −48`, west `z ≈ +48`, east `z ≈ +66`, chosen to
   continue the surveyed spacing rhythm and to bring 9 detected clusters up to the verified roster of 12.
   These are **guesses**, drawn dashed in purple and labelled "position INVENTED for drafting". They are
   not evidence that anything stands there.
6. **The portal-approach corridor widths** (40 blocks). No source specifies a corridor width.
7. Sheet extents, grid intervals, colour coding, and the conflict callouts are editorial.

## 5. Conflicts surfaced by drawing it (recorded, not resolved)

1. **Planned parking field overlaps the as-built Guest Center.** Z02 runs `z +120…+235`; the built plate
   occupies `z 90…180`. ~60 blocks of overlap across the full 141-block width. Hatched as CONFLICT ①.
2. **Planned drop-off loop (0, +135, r22) and planned main entrance (0, +119) land inside the built shell.**
   The loop's centre is the GC's as-built centroid. CONFLICT ②.
3. **Layout scheme.** As-built homes at `x ≈ ±20–25` match neither GRID (±85) nor OVAL (±116). CONFLICT ③.
4. **Home count.** ~9 clusters detected against a verified roster of 12 (DEF-003, open). CONFLICT ④.
5. **The surveyed y=63 placed surface runs straight through the Guest Center plate** (`z 90…180`). Most
   likely one graded floor plane rather than a road through a building, but the survey does not say, so the
   drawing records it as an oddity rather than resolving it (footnote 7).
6. **Rival pads** for the cooking school, the warehouse and the monument remain unchosen; both are drawn.
7. `coordinates.yaml`'s home coordinates (GRID, `x = ±85`) and `buildings.yaml`'s (OVAL, `x ≈ ±116`) are
   both superseded by the build; the drawing shows them only as grey ghost lines.

## 6. Regeneration

The SVG was emitted by a throwaway generator script (session scratchpad,
`gen_siteplan.py`) purely for geometric precision; the SVG in `visuals/` is the deliverable and is
hand-editable. Nothing in the drawing is data-bound to a live source — if the pending per-lot RCON sweep
lands, the lot labels, the three invented lots and footnote 2 must be revised by hand.

**Honesty statement:** no element of this drawing asserts that a named home stands on a named lot; no
inference is styled like a measurement; every dashed or purple element is unbuilt or invented, and the
legend says so.
