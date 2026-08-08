# Brief 4/4 — SiteSelector has no notion of "central to the town"

> Source: `HANDOFF.md` §8 ("still open here"), item 4.
> Severity: **Low**. The selector still finds a valid flat site; "central"
> is a quality-of-life property, not a correctness one. Buildings on
> the outskirts are reachable, just not walkable in one hop from the
> capital. Worth a tunable; not worth breaking today's behaviour to
> land it.
> Effort: **M** (one config key, one derived centroid, one
  per-candidate score term, tests against a snapshot).
> Depends on: none. Independent of brief 1 (the canvas-vs-content fix
> changes *what* gets reserved, not *where* the candidate lands).
> Repo edits: **yes** — a new optional term in `selectBuildSite`'s
  score, a new config key, and a small TownBrain-side helper that
  computes the centroid from the existing registry.

## Goal

Add a tunable "centrality" term to `SiteSelector`'s candidate score,
so the spiral around the capital is biased toward the centroid of
already-placed buildings rather than the flattest empty ground at
the spiral's outer ring. Default the weight to `0.0` so today's
behaviour is preserved; target a `0.2-0.4` range once the operator
sees the result against a snapshot.

## Background

- `src/build/SiteSelector.ts:546-637` — `selectBuildSite` takes a
  `refPos` and spirals outward, scoring each candidate by
  flatness / obstacle / fluid (lines 187-202 define the penalty
  constants). The score is a flatness number; there is no term
  that prefers positions near anything in particular.
- `src/town/TownBrain.ts:985-1010` — the brain calls
  `selectBuildSite` with the capital as `refPos` (the spiral seed)
  and `avoidRects` derived from completed buildings
  (`src/town/TownBrain.ts:985-993`). The brain has the
  `existingBuildings` list in hand at this point; it could pass
  a `centralityAnchor` to the selector without a new query.
- `src/town/TownBrain.ts:1181-1188` — the LLM design pass already
  builds a `neighbors` array of `{ name, kind, origin, width, height,
  depth }` for prompt context. The same array can feed the
  centroid. No new schema, no new query.
- `src/build/SiteSelector.ts:88-95` — `SiteSelectorOptions` already
  has the shape this brief needs: an optional input that the
  selector consults. Adding a `centralityAnchor` plus a
  `centralityWeight` is a parallel addition.
- `src/config.ts:235-254` — `build:` is the existing
  build-system section. A new `siteSelector.centralityWeight` (or
  a top-level `build.centralityWeight`) is a one-line schema
  addition. The existing `validateConfig` at `src/config.ts:510-520`
  is the place to register it.
- `docs/research/worker-process-isolation.md:91-95` — the
  SiteSelector is the most exposed path under the worker
  isolation migration (+4.8s worst case at 60k probes). The
  centrality term must not add to the per-probe cost: it is a
  pure function of the candidate's origin and a precomputed
  anchor, evaluated inside the existing per-candidate loop
  (`src/build/SiteSelector.ts:608-615`).
- `HANDOFF.md:748-749` — the handoff's exact words: "Nothing
  stops the next building landing on the outskirts." That is
  the bug; the fix is the bias.

## Files to touch

- `src/build/SiteSelector.ts:39-118,187-202,546-637`
  - Extend `SiteSelectorOptions` with:
    - `centralityAnchor?: { x: number; z: number }` — precomputed
      centroid of completed buildings. `undefined` means
      "no centrality term; today's behaviour".
    - `centralityWeight?: number` — the multiplier on the
      centrality term. Default `0`. Range `[0, 1]`; values
      above `1` are accepted but produce a worse selector
      (they overwhelm flatness).
  - In `selectBuildSite`, after the flatness score is computed
    (around line 612) and before the candidate is added to
    `scored`, add:
    ```ts
    if (options.centralityAnchor && options.centralityWeight && options.centralityWeight > 0) {
      const dx = (cand.origin.x + size.x / 2) - options.centralityAnchor.x;
      const dz = (cand.origin.z + size.z / 2) - options.centralityAnchor.z;
      const dist = Math.hypot(dx, dz);
      // Closer is better; saturate at 64 blocks so a building
      // at the periphery of town does not get penalised
      // indefinitely. The 64 is the conversation radius from
      // config.yml:50 — same conceptual "neighbourhood".
      const proximity = Math.max(0, 1 - dist / 64);
      cand.score += options.centralityWeight * proximity * 10;
      cand.reasons.push(`centrality: +${(options.centralityWeight * proximity * 10).toFixed(1)}`);
    }
    ```
  - Add `CENTRALITY_PROXIMITY_RADIUS = 64` as a module constant
    near the existing `NEAR_FALLOFF = 12` at line 185. The
    constant belongs in the penalty-constant block.
- `src/town/TownBrain.ts:985-1010`
  - Compute the centroid from the same `existingBuildings` list
    already in scope. Helper:
    ```ts
    private static centralityAnchor(rows: Building[]): { x: number; z: number } | null {
      const usable = rows.filter((b) => b.origin && b.width && b.depth);
      if (usable.length === 0) return null;
      let sx = 0, sz = 0;
      for (const b of usable) {
        sx += b.origin!.x + (b.width as number) / 2;
        sz += b.origin!.z + (b.depth as number) / 2;
      }
      return { x: sx / usable.length, z: sz / usable.length };
    }
    ```
    Place it next to `isNonBlockingFootprint` (line 1348) so the
    new code sits with the related static helpers.
  - Read `config.build?.centralityWeight` (default `0`) and pass
    `{ centralityAnchor, centralityWeight }` to the
    `selectBuildSite` call. When `centralityWeight` is `0`, do
    not compute the centroid — saves a loop when the term is
    inert (which is the default).
- `src/config.ts:235-254,510-520`
  - Add `centralityWeight?: number` to the `build` interface.
    Register the field in `validateConfig` with
    `{ key: 'centralityWeight', type: 'number', optional: true }`.
  - Range validation: reject `< 0` and warn on `> 1`. A weight
    of `1` means "centrality is as important as flatness"; a
    weight of `0.5` is the realistic ceiling.
- `config.yml:177-178`
  - Add a commented-out example:
    ```yaml
    build:
      # SiteSelector's "central to the town" bias. The anchor
      # is the centroid of completed buildings; this is the
      # weight of that bias in the score. Default 0 (no bias,
      # today). Target 0.2-0.4 once the operator has seen a
      # snapshot run.
      # centralityWeight: 0.0
    ```

## Approach

1. **Add the config key and the option, but keep both inert at
   the default.** The selector consults `centralityWeight` only
   when it is `> 0`; the brain computes the centroid only when
   the weight is `> 0`. Today's behaviour is bit-identical when
   the config is unchanged.
2. **Land the change behind a snapshot test.** Write a
   `test/build/SiteSelector.centrality.test.ts` that constructs
   a stub `BlockProbe` returning "flat ground" everywhere, fixes
   a candidate anchor at `(0, 0)`, and runs `selectBuildSite`
   twice — once with `centralityWeight: 0`, once with
   `centralityWeight: 0.4`. Assert the second run picks a
   candidate strictly closer to the anchor than the first.
   This is the regression net.
3. **Add a snapshot of the live town.** Capture
   `data/world-review/centrality-snapshot-YYYY-MM-DD.json`
   from `data/town.db`: every row's `{ name, origin, width,
   depth, status }`. Re-run the selector against the snapshot
   with `centralityWeight` at 0, 0.2, 0.4, 0.8 and record the
   chosen site for each. The four chosen sites are the
   evidence the operator uses to pick a default.
4. **Operator sign-off on the default.** Update
   `docs/decisions/2026-MM-DD-selector-centrality.md` with the
   snapshot results, the operator's call, and the rollback plan
   (set `centralityWeight: 0` in config). Required before the
   default moves off zero.
5. **Land the brain-side helper and the config wiring.** The
   centroid calculation is two lines; the wiring is one option
   object.
6. **Run the full backend test suite.** This is a behaviour
   change; regressions in the existing
   `test/build/centrality*.test.ts` and the
   `test/town/avoidRectExemptions.test.ts` files are the
   canary.

## Tests

- `test/build/SiteSelector.centrality.test.ts` (new)
  - Stub `BlockProbe` returning `{ name: 'grass_block',
    boundingBox: 'block' }` for every coordinate. Fix
    `refPos` at `(0, 64, 0)`, `size: { x: 5, y: 4, z: 5 }`,
    `centralityAnchor: { x: 0, z: 0 }`.
  - Run with `centralityWeight: 0`. Assert the chosen
    candidate's centroid is at distance `≥ someThreshold`
    (the flatness-only result; the exact distance depends on
    the spiral).
  - Run with `centralityWeight: 0.4`. Assert the chosen
    candidate's centroid is *closer* to `(0, 0)` than the
    weight-0 result.
  - Run with `centralityAnchor: undefined` and
    `centralityWeight: 0.4`. Assert the chosen candidate is
    the same as the weight-0 run (no anchor → no term).
- `test/town/TownBrain.centralityAnchor.test.ts` (new)
  - Construct a `TownBrain` with a stub `TownManager`
    returning a fixed `listBuildings` of three rows
    (town_hall at (0,0), well at (5,0), cottage at (-5,0)).
    Assert `TownBrain.centralityAnchor(rows)` returns
    `{ x: 0, z: 0 }`.
  - Empty list: returns `null` (caller treats as
    "no centrality").
- `scripts/snapshot_centrality.mjs` (new, world-verification)
  - Reads `data/town.db` (read-only). Writes
    `data/world-review/centrality-snapshot-YYYY-MM-DD.json`.
  - Not a vitest test. Operator-side.
- `npx vitest run test/build/SiteSelector.centrality.test.ts
  test/town/TownBrain.centralityAnchor.test.ts` must pass.
- `npm run build` must pass.
- The full backend test suite
  (`npx vitest run test/build/ test/town/`) must pass.

## Definition of done

- [ ] `SiteSelector` accepts `centralityAnchor` and
      `centralityWeight`; the term is inert at weight 0.
- [ ] `TownBrain.centralityAnchor` is implemented, tested,
      and gated on the config value.
- [ ] `config.build.centralityWeight` is in the schema and
      in `validateConfig`. Range check rejects `< 0` and
      warns on `> 1`.
- [ ] `config.yml` carries the commented example.
- [ ] A snapshot run is recorded at
      `data/world-review/centrality-snapshot-YYYY-MM-DD.json`
      with the four weight points.
- [ ] `docs/decisions/2026-MM-DD-selector-centrality.md`
      carries the operator's call on the default weight and
      the rollback plan.
- [ ] The full backend test suite passes.

## Traps to avoid

- **Do not change the default.** Today's behaviour is
  correct (it just optimises for flatness). The fix is a
  *tunable*; the operator's snapshot decides the default.
  If the snapshot shows the term is helpful at 0.2, set
  0.2 — but the code must ship with `0.0` and the snapshot.
- **The worker-isolation research document**
  (`docs/research/worker-process-isolation.md:91-95`)
  flags `SiteSelector`'s 60k-probe budget as the most
  exposed path under the proposed process-isolation
  migration (+4.8s worst case). The centrality term is a
  pure function of the candidate origin and the anchor —
  no extra probes — and must stay that way. If a future
  change wants a "terrain-following" centrality, it
  belongs in a follow-up brief with its own performance
  budget.
- **HANDOFF §4 trap #0b** — do not make the centrality
  term a *gate*. It is a score bonus, not a veto. A
  candidate with no centrality bonus is still returned
  when nothing better exists.
- **HANDOFF §4 trap #9** — every building the operator
  places by hand must have a `complete` row in `town.db`
  `buildings`, or the brain will plan a duplicate and the
  centroid will be wrong. The snapshot script must
  surface any non-`complete` row that has an origin +
  width + depth, so the operator can correct it before the
  centroid is computed.
- **The centroid is sensitive to the registry's
  over-claim.** A `plaza:1` row that records 41×41 will
  pull the centroid east, even though the plaza is exempt
  from `avoidRects`. Brief 1 (the canvas-vs-content
  fix) addresses the underlying over-claim. This brief
  must not *also* try to fix it — the operator can
  exclude `plaza`/`path`/`road`/`mine` from the centroid
  in the helper. Add a constant:
  ```ts
  private static CENTROID_EXCLUDED_KINDS = new Set(['plaza', 'path', 'road', 'mine']);
  ```
  mirroring `NON_BLOCKING_KINDS` (line 1345).
- **The selector is shared by the auto-flat path and the
  bot-side ad-hoc builds.** Both go through
  `selectBuildSite`. Both will pick up the centrality
  term if the brain passes the option. The TownBrain
  call site is the only one that has the building list;
  ad-hoc callers (e.g. `scripts/build_runner.py` over
  RCON) do not have it, so they default to
  `centralityAnchor: undefined` and see no change.

## References

- `HANDOFF.md` §8 "still open here" item 4 — the
  "no notion of central to the town" diagnosis
- `src/build/SiteSelector.ts:39-118` — `SiteSelectorOptions`
  shape
- `src/build/SiteSelector.ts:546-637` — `selectBuildSite`
  scoring loop
- `src/build/SiteSelector.ts:185-202` — the existing
  penalty-constant block
- `src/town/TownBrain.ts:985-1010` — the `selectBuildSite`
  call site
- `src/town/TownBrain.ts:1181-1188` — the existing
  `neighbors` array the centroid is built from
- `src/town/TownBrain.ts:1316-1352` — `footprintCapForKind`
  and `isNonBlockingFootprint` (place the new helper
  here)
- `src/config.ts:235-254,510-520` — the `build:` section
  and its validator
- `config.yml:177-178` — the existing `build:` block
- `config.yml:50` — the 64-block conversation radius
  (the proximity ceiling)
- `docs/research/worker-process-isolation.md:91-95` —
  the SiteSelector performance budget under process
  isolation
- `test/town/avoidRectExemptions.test.ts:30-41` — the
  precedent for `NON_BLOCKING_KINDS` exclusion lists
