# Brief 3/4 — Plaza east corner flooded by adjacent lake

> Source: `HANDOFF.md` §8 ("still open here"), item 3.
> Severity: **Medium**. The flood is contained to one corner today
> (282 blocks of spill were drained per item 2) but the source is
> outside any box, so the next rain or bot-driven flow re-floods the
> same area. Permanent fix needs a structural decision (dam or regrade);
> the brief is the measurement + ops file that supports that decision.
> Effort: **M** (one measurement script, one decision doc, one ops
> file with the chosen fix). The chosen fix itself is world work
> and is out of scope for a repo-edit session.
> Depends on: none.
> Repo edits: **no**. The brief is a coordination document; the actual
> ops file is generated separately and committed as a `data/buildops/`
> artefact (see `HANDOFF.md` for the town-expansion-r1 ops workflow).

## Goal

Determine the geometry of the lake that floods the plaza's east corner
(one-cell inflow vs whole basin), and produce a single decision record
plus one ops file that RCONs the chosen permanent fix. Two options are
on the table: dam the inflow at its source, or regrade the plaza's
east corner above the high-water mark. Each has different cost,
different reversibility, and different downstream effects on the
town's appearance.

## Background

- `test/town/avoidRectExemptions.test.ts:13-15` — the plaza is a 41×41
  paved pad at x[-105, -64], z[-395, -354]. The east corner is the
  positive-x side: x ≈ -64, z ≈ -395..-354.
- `HANDOFF.md:331` — the well at (−85, 68, −359) is *in* the plaza,
  i.e. roughly the centre. The plaza's east corner is ~20 blocks east
  of the well.
- `HANDOFF.md:746-747` — the handoff's exact words: "Draining is futile
  — it refills from outside any box." That tells us the source is
  *not* inside the plaza and is not a single block we can wall off
  with a small `/fill`. It is either a flowing stream meeting the
  plaza, or a whole basin to the east whose surface sits at or above
  the plaza's elevation.
- `HANDOFF.md:166-168,188-189` — the plaza sits on a graded site at
  y67 with a 4-block spread. The lake's bed and surface elevation are
  unknown without measurement; the brief's first step is to find them.
- `HANDOFF.md:481-483` (trap #15) — "Dig no canal without capping both
  ends." The dam option must cap both faces, not just the visible
  inflow. The regrade option does not have this problem.
- `HANDOFF.md:402-406` (trap #5) — verification geometry. The
  measurement script must probe at coordinates that are *in* the
  plaza's east corner, not on top of an unrelated structure. The
  plaza's east edge runs along x = -64; probe at z = -370 (the
  plaza's middle-z) at x = -63, -62, -61 and at y65-72 (the plaza's
  elevation band plus margin).
- `HANDOFF.md:439-457` (trap #12) — `mc_admin.py` cannot write files
  on the MC server. The ops file uses RCON `/fill` exclusively, and
  no Python `mc_admin` calls.
- `HANDOFF.md:485-499` (trap #16) — use RCON `/fill`, not a bot's
  WorldEdit. The dam is a large structure (likely a stone-brick
  wall, dozens of blocks); the regrade is a `//replace` of the
  plaza's east corner. Both are bot-free.

## Files to touch

- This is a coordination brief. The repo files are:
  - `scripts/measure_plaza_lake_inflow.mjs` (new) — read-only
    measurement. Walks the east edge of the plaza, extends a
    probe grid east into the lake, classifies each column as
    "air", "water", "solid", and reports the source pattern.
  - `scripts/regen_drain_plaza_lake.sh` (new) — the post-fix
    verification. Drained-block count, then a force-load so the
    chunk is observable, then a `/fill <box> air replace water`
    to confirm the fix held.
  - `data/buildops/plaza-east-flood-fix-YYYY-MM-DD.txt` (new) —
    the ops file. One RCON `/fill` per line, dry-run by default.
  - `docs/decisions/2026-MM-DD-plaza-east-flood.md` (new) — the
    decision record. Measurement results, chosen fix, rollback
    plan, and the operator's sign-off.
- No `src/` edits.

## Approach

1. **Measure the source.** The measurement script reads the plaza's
   east edge (x ≈ -64, z ∈ [-395, -354], y65-72) and walks a probe
   grid east until it finds dry ground. For each column, it
   reports `(x, z, waterY, bedY, isSource)`. "Source" is defined as
   the first column east of the plaza that has a *higher* water
   surface than the plaza's elevation. The script also records
   the bounding box of the contiguous water body east of the plaza,
   so the operator can see whether the fix is a 3-block dam or a
   200-block basin.
2. **Classify the source.** Three patterns are possible:
   - **Single-cell inflow.** A stream or spring meets the plaza at
     one or two blocks. The dam is a 1-block-wide stone-brick
     wall one block east of the plaza's east edge, deep enough
     to reach the lake bed. Total ops: <20.
   - **Whole-basin inflow.** The lake's surface sits at or above
     the plaza's y67, and the water simply *is* the east side of
     the plaza. The dam option becomes a 41-block-long wall from
     y[plaza-1] to y[surface+2] east of the plaza, which is
     several hundred ops. The regrade option is cheaper.
   - **Aquifer (groundwater).** The east corner is wet because
     the sub-surface is saturated, not because of surface flow.
     Draining and damming are both futile (this matches the
     handoff's "refills from outside any box" diagnosis). The
     fix is the regrade option: raise the east corner by 2-3
     blocks with a `//replace` of the surface and a foundation
     layer below.
3. **Pick the fix.**
   - **Dam.** Reversible, cheap for the single-cell case,
     expensive for the whole-basin case. Leaves the lake
     untouched, which is the right answer if the lake has
     downstream uses (a future dock, the well's design source,
     etc.). Damming must cap both faces (trap #15) and use
     full-solid blocks (trap #14 — waterloggable blocks do not
     dam).
   - **Regrade.** The east corner is filled to y70 with the
     plaza's surface material (likely stone_bricks, matching
     `HANDOFF.md:325`). One `/fill` per layer, then a force-load
     and a verify. Reversible (a re-flood can be scripted as
     a separate ops file). The plaza's well at
     (−85, 68, −359) is ~20 blocks west; the regrade does not
     touch it.
4. **Write the ops file.** Both fixes are RCON-only. The dam is
   a series of `/fill <x1> <y1> <z1> <x2> <y2> <z2>
   stone_bricks` boxes, one per column-segment. The regrade is a
   `//replace` over a 2-3 layer band, applied via RCON. The file
   follows the same `data/buildops/` shape as the town-expansion-r1
   ops files (see `HANDOFF.md` for the format and the
   `scripts/preflight_guarded_ops.mjs` workflow).
5. **Dry-run, then apply.** The ops file is committed
   dry-run-clean first (zero unexpected cells when fed through
   `preflight_guarded_ops.mjs`), then applied via the standard
   RCON path. The post-fix verify script confirms the east corner
   is dry for at least one Minecraft day (~20 minutes) before
   the issue is closed.
6. **Document.** The decision record carries the measurement,
   the chosen fix, the cost (ops count, blocks placed), the
   rollback plan, and the operator's sign-off.

## Tests

- `scripts/measure_plaza_lake_inflow.mjs` (new)
  - Reads the plaza's bbox from `data/town.db` (the row named
    `plaza:1`). Walks the east edge. Reports a per-column table.
  - This is a world-verification script, not a vitest test. It
    requires a live RCON connection, which `AGENTS.md` says NOT
    to do from a planning session. The script is written,
    committed, and run by the operator in a separate session.
- `scripts/regen_drain_plaza_lake.sh` (new)
  - Reads the chosen fix from the ops file. Re-runs the
    measurement. Asserts the east corner has no water at the
    plaza's surface band.
- Decision record: `docs/decisions/2026-MM-DD-plaza-east-flood.md`
  - The measurement results, the chosen fix, the cost, the
    rollback.
- No vitest tests. The verification is entirely world-side.

## Definition of done

- [ ] `scripts/measure_plaza_lake_inflow.mjs` exists and runs
      against the live MC server (operator-side, not in this
      session). Output is committed as
      `data/world-review/plaza-east-lake-measurement-YYYY-MM-DD.json`.
- [ ] The measurement classifies the source as one of the
      three patterns above. The pattern is recorded in the
      decision record.
- [ ] `data/buildops/plaza-east-flood-fix-YYYY-MM-DD.txt`
      exists, dry-runs clean through
      `preflight_guarded_ops.mjs`, and applies the chosen
      fix. The ops file is reversible (a paired rollback file
      exists in the same directory).
- [ ] The east corner of the plaza is dry for at least one
      Minecraft day after the fix. `regen_drain_plaza_lake.sh`
      records the result.
- [ ] The well at (−85, 68, −359) is untouched.
- [ ] `docs/decisions/2026-MM-DD-plaza-east-flood.md`
      carries the operator's sign-off.

## Traps to avoid

- **HANDOFF §4 trap #5** (verification geometry) — probes must
  land *in* the plaza's east corner, not on a wall or a
  standing structure. The plaza's east edge is x = -64; probe
  at x = -63 first, not at the well.
- **HANDOFF §4 trap #7** (forceload per-command chunk cap) — the
  measurement and the fix must `forceload add` their bounding
  box in tight, scoped chunks, not a 620×620 block. Use the
  pattern at `HANDOFF.md:494-495`.
- **HANDOFF §4 trap #12** (`mc_admin.py` cannot write files on
  the MC server) — use RCON exclusively, no `mc_admin.py` file
  writes. The verification script uses RCON `/fill` reads only.
- **HANDOFF §4 trap #14** (waterlog risk on REPL) — if the
  regrade option uses a masked `//replace` to fill the east
  corner, the existing air gaps stay air and the next rain
  re-floods. Use unmasked `/fill <box> <material>` for the
  foundation layer, then a `//replace` for the surface.
- **HANDOFF §4 trap #15** (dig no canal without capping both
  ends) — if the dam is a wall, cap both ends. The east edge
  of the plaza is 41 blocks; the dam must extend to the
  bounding box corners, not stop at the visible inflow.
- **HANDOFF §4 trap #16** (build ops on RCON, not on a bot's
  WorldEdit) — the ops file is RCON-only. The dam is dozens
  of `/fill` boxes; the regrade is one `//replace` pass.
  WorldEdit's player-relative commands would put the dam at
  the wrong y (trap #12 sibling at `HANDOFF.md:459-466`).
- **The well is at (−85, 68, −359).** A regrade of the east
  corner must not extend west of x = -68 or south of z = -390
  — those would touch the well's apron. The ops file's bbox
  must be checked against the well's recorded footprint.
- **Do not invent a coordinate for the source.** Measure
  first, then write the ops file. The pattern classification
  is the operator's call; the brief is the measurement, not
  the decision.

## References

- `HANDOFF.md` §8 "still open here" item 3 — the east-corner
  flood, the futile-drain note
- `HANDOFF.md:325-331` — the plaza's well and the plaza's
  paving material
- `test/town/avoidRectExemptions.test.ts:13-15` — the plaza's
  actual coordinates
- `HANDOFF.md:481-499` — traps #15 and #16 (canal capping,
  RCON-only ops)
- `HANDOFF.md:402-418` — traps #5 and #7 (verification
  geometry, forceload scoping)
- `HANDOFF.md:439-457` — trap #12 (`mc_admin.py` file-write
  trap)
- `data/buildops/` — the existing ops-file directory and the
  town-expansion-r1 workflow
- `scripts/preflight_guarded_ops.mjs` — the offline preflight
  gate that ops files must pass before apply
