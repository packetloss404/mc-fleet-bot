# Brief 1/4 — Registry rows record canvas, not content

> Source: `HANDOFF.md` §8 ("still open here"), item 1.
> Severity: **Low**. Conservative — over-reservation prevents building stacking —
> but it is the documented reason the tent row claimed 21×11×21 for an 11×6×13
> structure and `plaza:1` over-claims. Left alone on purpose; this brief is a
> measurement + opt-in path, not a forced migration.
> Effort: **M** (schema flag, two writes, one measurement script, no migration
> of existing rows).
> Depends on: none.
> Repo edits: **yes** — a `record_content` flag on the buildings table, a
> write-time hook so the new flag is honoured when present, and a
> read-time preference so the existing conservative default is preserved.

## Goal

Add an opt-in path that records the *content* footprint of a building on its
town-registry row instead of the *canvas*, so subsequent `SiteSelector` calls
do not over-reserve `avoidRects`. The current conservative (canvas) default
stays. New builds opt in via a schema flag. Existing rows are left as-is until
the operator signs off on a per-row migration.

## Background

- `src/town/schema.ts:59-77` — the `buildings` table has integer columns
  `width`, `height`, `depth`. There is no column distinguishing canvas from
  content; both are written from the same `dims` value today.
- `src/town/TownBrain.ts:886-891` — `dims` is built from
  `getSchematicInfoAsync(...).size`, which is the *canvas* (the declared
  schematic box, not the bounding box of the actual blocks inside it).
- `src/town/TownBrain.ts:1019-1034` and `1026-1037` — the `onStarted` and
  `onCompleted` build-job lifecycle hooks write `dims` straight onto the
  registry row via `recordBuildingPlacement`. So the row records the canvas.
- `src/town/TownBrain.ts:985-993` — `avoidRects` are derived from those rows
  (origin + width + depth). The over-reservation is a direct consequence.
- `src/build/BuildCoordinator.ts:26-61` — `computeContentBounds(cached)` already
  exists, returns `{ size, offset }`, and is consumed for *siting* (paste
  anchor at lines 1261-1374) but is **not** propagated back to the town
  registry. The handoff §8 fix #4 closes siting; this brief closes the
  registry.
- `src/town/BuildingRepository.ts:120-149` — `recordBuildingPlacement` is the
  sole writer of the dim columns today.

## Files to touch

- `src/town/schema.ts:59-77`
  - Add an optional boolean column `record_content: integer('record_content',
    { mode: 'boolean' }).default(false)` to the `buildings` table. Default
    `false` so the conservative behaviour is preserved.
- `src/town/BuildingRepository.ts:120-149`
  - Accept an optional `recordContent: boolean` on `recordBuildingPlacement`.
    When `true`, write `contentWidth/Height/Depth` instead of `width/height/depth`
    (or, equivalently, widen the existing columns and add
    `recorded: 'canvas' | 'content'`). Choose the widening approach — it is the
    smaller diff and the JSON snapshot is already self-describing.
  - Add `getRecordContent(buildingId): boolean | null` and
    `setRecordContent(buildingId, value): void` for ops use.
- `src/town/TownBrain.ts:886-891,1019-1034,985-993`
  - When the registry row has `record_content: true`, use
    `computeContentBounds(cached).size` instead of `footprint.size` for the
    `dims` passed to `recordBuildingPlacement`. The `computeContentBounds`
    helper at `src/build/BuildCoordinator.ts:26-61` is the single source of
    truth; do not reimplement.
  - The `avoidRects` derivation (lines 985-993) reads `b.width`/`b.depth`
    regardless. The change is that *new* rows written with the flag set
    will have the right numbers; the derivation needs no code change.
- `src/config.ts:235-254,510-520`
  - Add a `build.recordContent: boolean` (default `false`) so the operator
    can flip the default per-town from config. Mirror it in
    `validateConfig()` so a typo fails at startup.
- `docs/decisions/2026-MM-DD-registry-record-content.md` (new)
  - Decision record. The handoff warns that "this project's documentation has
    repeatedly been more confident than its evidence" — record the operator
    sign-off and the chosen default explicitly. Required before migration
    even begins.

## Approach

1. **Measure the over-reservation.** Write a one-shot read-only script
   `scripts/measure_registry_overclaim.mjs` that opens `data/town.db`
   read-only, joins `buildings` rows against the live `schematics/` cache
   (use `DesignCache` / `SchematicStore` for the lookup), and reports per-row
   `(canvas, content, overclaim_pct)`. The handoff's two numbers
   (tent 21×11×21 vs 11×6×13; plaza:1 over-claims) are anecdotes; produce
   the full table before deciding anything.
2. **Add the schema flag.** New column on `buildings`. SQLite ALTER TABLE
   ADD COLUMN is non-destructive; the default `false` keeps the conservative
   path. Test: `npx vitest run test/town/BuildingRepository.test.ts` (add
   the file if absent — see Tests below).
3. **Wire the write path.** When `recordContent` is `true` on the row, prefer
   `computeContentBounds(cached).size` over `footprint.size` for the
   `recordBuildingPlacement` call. When `false` (today's default), write
   `footprint.size` exactly as today. The change is *additive*: today's rows
   are never rewritten.
4. **Add a per-build opt-in.** A new `BuildCoordinator.startBuild` option
   `recordContent?: boolean` plumbs the flag from the brain down to the
   write. The default in `TownBrain` is `false` (preserve current behaviour);
   the operator flips it via `build.recordContent: true` in `config.yml`.
5. **Defer migration.** Do not back-fill existing rows. The handoff explicitly
   says "left alone — conservative (it prevents stacking)". Add a separate
   `scripts/migrate_registry_record_content.mjs` that, given a list of
   building ids, re-derives their footprints from the cached schematic and
   rewrites the row. Run it only with the operator's sign-off, one row at a
   time, and gate it behind `--apply` so the default is dry-run.
6. **Document the choice.** Write the decision record. Include the measured
   over-claim percentages, the operator's call, and the rollback plan
   (re-derive canvas from the schematic, write back).

## Tests

- `test/town/BuildingRepository.recordContent.test.ts` (new)
  - Insert a planned building. Call `recordBuildingPlacement` with
    `recordContent: true` and a content footprint smaller than the canvas.
    Assert the row carries the content dimensions and
    `getRecordContent(buildingId) === true`.
  - Then call `recordBuildingPlacement` again with `recordContent: false`.
    Assert the row's `width`/`depth` revert to the canvas dimensions and
    `getRecordContent(buildingId) === false`.
  - Use a `TownDb` constructed under `dataDir: <tmp>` so the test does not
    touch production data. The repo already uses this pattern in
    `test/town/avoidRectExemptions.test.ts:1-26`.
- `test/build/computeContentBounds.test.ts` (new — or extend the existing
  one if there is one)
  - Construct a `CachedSchematic` with the LLM well's block list (the 66
    solids at `src/town/DesignValidator.ts:80-87` reference). Assert
    `computeContentBounds` returns `size: 5×10×3` (the handoff number) and a
    zero offset for an empty schematic.
- World-verification script (not a vitest test):
  - `scripts/measure_registry_overclaim.mjs`. Reads `data/town.db`,
    iterates the `buildings` table, joins to `schematics/<townId>/*.schem`
    via `SchematicStore`, prints a table. Run it once before the schema
    change to record the baseline, and again after each migration to
    confirm the new rows are content-sized.
- `npm run build` (must pass).
- `npm test --prefix . -- test/town/BuildingRepository.recordContent.test.ts
  test/build/computeContentBounds.test.ts` (must pass).

## Definition of done

- [ ] `scripts/measure_registry_overclaim.mjs` exists, opens `data/town.db`
      read-only, and prints a per-row canvas/content/over-claim table.
      The pre-change baseline is committed as
      `data/registry-overclaim-baseline-YYYY-MM-DD.json`.
- [ ] `src/town/schema.ts:59-77` defines a `record_content` boolean column
      on `buildings`, default `false`. A migration is added that runs on
      startup if the column is missing (use the `ALTER TABLE ... ADD COLUMN`
      pattern that the rest of the repo already uses, if any; otherwise
      guard it with a `PRAGMA table_info` check).
- [ ] `BuildingRepository.recordBuildingPlacement` accepts `recordContent`
      and writes the right columns.
- [ ] `TownBrain` passes `computeContentBounds(cached).size` to
      `recordBuildingPlacement` when the flag is set, and `footprint.size`
      when not.
- [ ] `config.yml`'s `build:` section accepts `recordContent: true|false`
      and `validateConfig` enforces its type.
- [ ] No existing registry row has been silently rewritten. The baseline
      table above is the proof.
- [ ] `scripts/migrate_registry_record_content.mjs` exists, takes
      `--ids` or `--all`, and is dry-run by default.
- [ ] A decision record at
      `docs/decisions/2026-MM-DD-registry-record-content.md` carries the
      operator's sign-off, the measured over-claim, and the rollback plan.
- [ ] `npm run build` and the test list above pass.

## Traps to avoid

- **Do not silently rewrite today's rows.** The handoff is explicit. Today's
  over-reservation prevents stacking, and a wholesale rewrite changes
  `avoidRects` for every future build. New rows only.
- **Do not duplicate `computeContentBounds`.** The helper at
  `src/build/BuildCoordinator.ts:40-61` is the single source of truth; if it
  ever needs to change (e.g. to subtract interior voids), the brain and the
  build coordinator must move together.
- **`plaza:1` is in `TownBrain.NON_BLOCKING_KINDS`** (regression test at
  `test/town/avoidRectExemptions.test.ts:30-33`). The plaza is already
  exempt from `avoidRects`. Re-measuring it will still report an
  over-claim, but the over-claim is *invisible* to the selector. Do not
  treat that as a reason to skip the change — other surfaces (paths, the
  grove) and ad-hoc `startBuild` callers still see the canvas number.
- **HANDOFF §4 trap #2:** `npm test` once wrote to production `data/`. The
  test above must construct a `TownDb` with a `dataDir` under `tmp` (or
  any non-production path), not a shared fixture. Mirror
  `test/town/avoidRectExemptions.test.ts:1-26`.
- **HANDOFF §4 trap #0b:** do not "fix" the over-claim with a heuristic
  (e.g. "if width > 16, halve it"). The right number comes from the
  schematic's actual block list. A heuristic is a guess that the operator
  will not be able to audit.
- **`plaza:1` is 41×41 at the surface.** The plaza row's canvas-vs-content
  gap is huge (the paved area is the content; the canvas is whatever the
  generator produced). When migrating, compute content for the plaza
  *only* after the operator signs off — the over-claim is currently
  invisible because of the exemption, and "fixing" it on paper can change
  the plaza's footprint derivation downstream.

## References

- `HANDOFF.md` §8 fix #4 (canvas-vs-content for siting) and §8 "still open
  here" item 1 (registry row still records canvas)
- `src/build/BuildCoordinator.ts:26-61` — `computeContentBounds`
- `src/build/BuildCoordinator.ts:1261-1374` — paste-anchor shift
- `src/town/TownBrain.ts:886-891` — `dims` derivation
- `src/town/TownBrain.ts:985-993` — `avoidRects` derivation
- `src/town/TownBrain.ts:1019-1034` — `recordBuildingPlacement` calls
- `src/town/BuildingRepository.ts:120-149` — the writer
- `src/town/schema.ts:59-77` — the `buildings` table
- `test/town/avoidRectExemptions.test.ts:13-25` — the plaza's actual
  coordinates
- `src/town/DesignValidator.ts:80-87` — the LLM well's block list and the
  `5×10×3` content / `19×12×23` canvas number
