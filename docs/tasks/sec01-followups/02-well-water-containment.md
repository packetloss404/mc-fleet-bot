# Brief 2/4 — Well design water containment

> Source: `HANDOFF.md` §8 ("still open here"), item 2.
> Severity: **Medium**. The 5 uncontained water sources are the documented
> cause of the 282-block plaza spill. `DesignValidator` now contains a fluid
> pass and `LlmDesigner` now strips uncontained fluids as a fallback, so
> *future* well designs are protected. The *currently-built* well at
> (−85, 68, −359) and any well cached before that fix landed still has the
> 5 sources, and they re-waterlog on the first rain or bot interaction.
> Effort: **M** (one schematics-dir audit, one containment-gate, one of two
> remediations).
> Depends on: none. Independent of brief 1.
> Repo edits: **partial** — the schematic itself is a binary `.schem`, not
> source. The repo edit is a containment gate in the build pipeline (similar
> to the N7 precondition referenced in `HANDOFF.md:530-531`) and an audit
> script. The two remediation paths are world work, not source work.

## Goal

Make "an LLM-generated well design with uncontained water sources never
makes it onto the ground" a structural property of the build pipeline, not
a happy accident of the post-hoc validator. Add a pre-paste containment
gate that runs *after* `validate()` and *before* `encodeAndSave()` in
`DesignCache`, so a cached well that the validator accepted only because
`stripUncontainedFluids()` salvaged it is flagged and reviewed before it
becomes the next build's schematic. Then decide which of the two
remediations to apply to the existing well: regenerate the schematic, or
post-process the placement to waterlog or remove the 5 sources.

## Background

- `src/town/LlmDesigner.ts:381` — `validate(candidate)` runs the design
  validator. When it fails on the final attempt, `stripUncontainedFluids`
  salvages the design by removing the offending water blocks
  (`src/town/LlmDesigner.ts:390-404`).
- `src/town/DesignValidator.ts:49-50,80-87,88-` — the fluid pass enforces
  that every fluid block has a FULL SOLID block on all four sides and below
  (stairs/slabs/fences/panes do not count; they waterlog). The list of
  waterlog-prone shapes is `NON_CONTAINING_SHAPES`.
- `src/town/DesignValidator.ts:343-` — `stripUncontainedFluids(plan)` is the
  salvage path. It returns a new plan with the uncontained fluid blocks
  removed.
- `src/town/DesignCache.ts:10-19,42-` — on a successful `validate()` (which
  includes salvaged plans), the brain encodes the plan into a real Sponge
  v2 `.schem` via `encodeAndSave` and writes both the JSON and the `.schem`
  cache files at `schematics/<townId>/<kind>-<hash>.{json,schem}`. This
  cache is the *source of truth* for the next matching build request — a
  cached well with 5 uncontained water sources is what `BuildCoordinator`
  pastes.
- `src/build/BuildCoordinator.ts:1259-` — `startBuild` is where
  `computeContentBounds(cached)` is called and the paste anchor is shifted.
  There is no post-encode fluid check here.
- The well at (−85, 68, −359) per `HANDOFF.md:331` was built before the
  salvage path landed. Its cached `.schem` is on disk and its
  `schematicRef` points to a query like `'medieval stone well'`. Until the
  cache is regenerated or the placement is post-processed, the next time
  the brain wants a well it will paste the same 5 uncontained sources.
- HANDOFF §5 (`HANDOFF.md:528-531`) — the N7 reservoir enclosure check ran
  as a precondition per OQ-5/BU-10. This brief proposes the same shape: a
  containment gate that runs *before* the paste, and refuses to build if
  the cached schematic has uncontained water.

## Files to touch

- `src/town/DesignCache.ts:10-19,80-90` (or wherever `save` calls the
  encoder) — add a containment flag. The cleanest place is alongside
  `encodeAndSave`: compute the fluid-containment summary *after* encoding,
  and persist it into the JSON entry as
  `containsUncontainedFluids: boolean` and `uncontainedFluidCount: number`.
- `src/build/BuildCoordinator.ts:1190-1260` (the section that calls
  `startBuild` and resolves the schematic) — add the precondition. When
  the cached entry has `containsUncontainedFluids: true`, refuse the build
  and emit a `design:uncontained-fluid` event with the schematic file and
  the count. This is the N7 precondition pattern.
- `src/town/TownBrain.ts:1287-1295` (the `design:no-match` event section)
  — add a matching `design:uncontained-fluid` event so the dashboard and
  the chronicle see the gate firing.
- `scripts/audit_well_schematics.mjs` (new) — read-only. Walks
  `schematics/<townId>/*well*.{json,schem}`, decodes the schem, and reports
  any cached well with `uncontainedFluidCount > 0`. The output is the
  evidence the operator uses to decide between the two remediation paths.
- `scripts/regenerate_well_schematic.mjs` (new, remediation A) — deletes
  the cached well JSON+schem so the next request regenerates from scratch.
  Pairs with bumping the `styleHashInput` so the cache key changes
  (see `src/town/DesignCache.ts:36-39`).
- `scripts/post_process_well_water.mjs` (new, remediation B) — uses RCON
  `/fill` to waterlog or remove the 5 water blocks at the well's recorded
  origin. This is world work, not source.

## Approach

1. **Decide the gate's location.** The cleanest split is: the gate lives
   in `BuildCoordinator.startBuild` (it has the cached schematic, the
   `cached.blocks` list, and the `townId`/`buildingId` for the event).
   `DesignCache` records the *summary* so the gate is a cheap property
   check, not a re-decode on every build. This matches the N7
   precondition shape.
2. **Compute the summary at encode time.** Add a new function
   `summarizeFluidContainment(blocks: BlockPlanEntry[]): { hasUncontained:
   boolean; count: number }` next to `validate` in
   `src/town/DesignValidator.ts`. Re-use the same neighbor rules the
   validator's pass 3 uses (full-solid on all four sides and below). The
   validator's logic is in
   `src/town/DesignValidator.ts:280-326`; lift only the per-block
   classification, not the validation's failure-reason reporting.
3. **Persist the summary on the cache entry.** Extend
   `DesignCacheEntry` (`src/town/DesignCache.ts:41-60`) with the two new
   fields. Backfill is a no-op for existing entries — they will be
   re-summarised on the next encode. Crucially, the gate must tolerate a
   *missing* summary (the pre-fix caches have none) and treat missing as
   "untrusted, refuse unless `--legacy-trust` is set on the
   `startBuild` call".
4. **Add the gate.** In `BuildCoordinator.startBuild`, after the
   schematic is resolved and before any site work, check
   `cached.containment?.hasUncontained === true || cached.containment == null`.
   Refuse with a structured error; `TownBrain` catches and emits the
   event, then either regenerates or skips (operator policy).
5. **Audit the existing cache.** Run `scripts/audit_well_schematics.mjs`
   against the live `schematics/` directory. The output table is the
   evidence for the remediation choice.
6. **Choose remediation A or B.**
   - **A (regenerate):** delete the cached well JSON+schem, force the
     next request to call the LLM. Cheaper, but the LLM may produce
     another set of 5 uncontained sources — the gate now catches them
     but the build still fails. The salvage path keeps the well dry
     today, so the rebuild will land a working well on the next attempt.
   - **B (post-process):** RCON `/fill` the 5 water sources at
     (−85, 68, −359) — waterlog by replacing them with waterlogged
     stairs, or remove them entirely. Cheaper, no LLM call, no
     re-validation loop. The cached `.schem` is *not* rewritten, so
     every well the brain tries to build from now on will trip the
     gate until remediation A is also done.
   The recommended path is **A and B in that order**: A so the cache
   stops carrying the bad schematic, B so the standing well stops
   leaking. The gate is a backstop in case either step is skipped.
7. **Document.** Update the decision log: which remediation ran, what
   the audit reported, and the gate's misfire path (legitimately
   contained water rejected because the neighbour check is too strict).

## Tests

- `test/town/DesignValidator.fluidContainment.test.ts` (new, or extend
  the existing one)
  - A plan with a water block in a 1×1×1 stone basin: summary is
    `{ hasUncontained: false, count: 0 }`.
  - The handoff's well block list (66 solids, 5 water sources ringed by
    `dark_oak_stairs`): summary is `{ hasUncontained: true, count: 5 }`,
    and the uncontained faces include the `dark_oak_stairs` that
    waterlog. Use the block list at
    `src/town/DesignValidator.ts:80-87` as a fixture.
- `test/build/BuildCoordinator.fluidGate.test.ts` (new)
  - Construct a `BuildCoordinator` with a stub `cached` whose
    `containment.hasUncontained === true`. Call `startBuild`. Assert
    the call rejects with a structured error and the gate is logged.
  - Same with `containment == null` and the legacy-trust flag unset:
    assert rejection. With the flag set: assert the build proceeds
    (and is therefore the operator's responsibility).
- `test/town/DesignCache.containmentPersist.test.ts` (new)
  - Save a plan that contains a contained water source. Assert the
    `DesignCacheEntry` written to disk has
    `containment.hasUncontained === false`.
- World-verification script: `scripts/audit_well_schematics.mjs`. Run
  it before the gate is added to record the baseline, and after
  remediation A to confirm the cache is clean.
- `npm run build` and the test list above must pass.

## Definition of done

- [ ] `summarizeFluidContainment` is implemented in
      `src/town/DesignValidator.ts` and exported.
- [ ] `DesignCacheEntry` carries the two new fields, and existing
      entries round-trip as `containment == null` until they are
      re-encoded.
- [ ] `BuildCoordinator.startBuild` checks the gate and refuses on
      uncontained or missing summary. The `TownBrain` lifecycle hook
      emits `design:uncontained-fluid` on refusal.
- [ ] `scripts/audit_well_schematics.mjs` runs against the live cache
      and produces a per-file report. The pre-change baseline is
      committed.
- [ ] Remediation A OR B has run, the standing well at
      (−85, 68, −359) has no uncontained water, and the audit
      confirms it.
- [ ] `npm test --prefix . -- test/town/DesignValidator.fluidContainment.test.ts
      test/build/BuildCoordinator.fluidGate.test.ts
      test/town/DesignCache.containmentPersist.test.ts` passes.
- [ ] `npm run build` passes.

## Traps to avoid

- **The validator's pass 3 already exists** (DesignValidator.ts:280-326).
  Do not write a second containment check that disagrees with it. The
  summary function is a *projection* of the validator's per-block
  decision, not a new rule.
- **`stripUncontainedFluids` is intentional.** It salvages an otherwise
  good design by removing the bad water. The gate must not refuse
  salvaged plans: a salvaged plan's `uncontainedFluidCount` is 0 by
  construction. Compute the summary *after* the salvage step, not
  before. The LLM designer's ordering at
  `src/town/LlmDesigner.ts:381-404` shows the pattern.
- **The cached well in `schematics/` predates the salvage path.** That
  is the source of the standing-well leak. The gate is a backstop,
  not the fix. Remediation A or B is the fix.
- **HANDOFF §4 trap #5** (verification geometry) — do not infer "the
  well is dry" from a probe on the wrong column. The 5 water sources
  are in known positions in the cached plan; read them back from the
  schem decode, do not probe the world.
- **HANDOFF §4 trap #12** (`mc_admin.py` cannot write files on the
  MC server). Remediation B must use RCON `/fill`, not a bot
  WorldEdit, and not `mc_admin.py`. RCON is unaffected by the
  permission trap.
- **HANDOFF §4 trap #14** (`REPL <mask> air → X` does not fill
  pre-existing air). If remediation B uses a masked fill to "remove"
  the water, that does nothing — water is not air. Use an
  unmasked `/fill <box> air` over the 5 source coordinates, or
  `replace water` (but the well design's waterlogged stairs need
  their own pass).
- **Do not add a per-handler `try/catch` around the gate.** The
  gate throws a structured error so the brain's existing
  `onCompleted`/`onFailed` hooks can record the event cleanly. Wrap
  at the same level as the existing parse-failed gate at
  `src/town/TownBrain.ts:899-918`.

## References

- `HANDOFF.md` §8 "still open here" item 2 — the 5 uncontained water
  sources, 282 blocks of spill
- `src/town/DesignValidator.ts:49-87` — the fluid pass and the
  waterlog-prone shapes
- `src/town/DesignValidator.ts:280-326` — pass 3 logic (lift the
  per-block classification only)
- `src/town/DesignValidator.ts:343-` — `stripUncontainedFluids`
- `src/town/LlmDesigner.ts:381-404` — the salvage ordering
- `src/town/DesignCache.ts:10-19,41-60` — the cache entry shape and
  encode path
- `src/build/BuildCoordinator.ts:1190-1260` — `startBuild` schematic
  resolution
- `src/town/TownBrain.ts:899-918` — the existing parse-failed gate
  to mirror
- `HANDOFF.md:528-531` — the N7 precondition precedent
- `HANDOFF.md:331` — the well's coordinates (−85, 68, −359)
- `src/voyager/SkillLibrary.ts:280-330` — the skill-save path (not
  directly involved, but the schematic-cache write is the same shape:
  per-name file, atomic write, index update. The well's `.schem` write
  should follow the same pattern.)
