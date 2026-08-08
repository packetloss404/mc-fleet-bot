# SEC-01 followups — four siting/schematic items still open

Source: `HANDOFF.md` §8 "still open here" (the four items at the end of
section 8, after the four bugs that were fixed on 2026-07-25). All four
are still open. They are followups, not security items — `SEC-01`
prefix is a directory label matching `docs/tasks/sec01/`, not a
security claim. None are blocked on a decision; all four have a
clear shape and a clear file list. The handoff explicitly leaves
item 1 (canvas-vs-content registry rows) as "left alone" — that
"left alone" is the operator's call, and the brief is an opt-in
path that respects it.

## Order and dependencies

| # | Brief | Effort | Severity | Depends on | Why this slot |
|---|---|---|---|---|---|
| 1 | `01-registry-canvas-vs-content.md` | M | Low | none | Schema change; opt-in flag, default stays. Hardest part is the operator sign-off, not the code. |
| 2 | `02-well-water-containment.md` | M | Medium | none | Validator already has the rule; brief closes the cache-write gap and remediates the standing well. |
| 3 | `03-plaza-east-flood.md` | M | Medium | none | Coordination brief only. Measurement, decision, ops file. No repo edit. |
| 4 | `04-selector-central-to-town.md` | M | Low | none | Tunable. Default 0.0, target 0.2-0.4 after a snapshot. |

Recommended execution order: **2 → 1 → 4 → 3**, in separate PRs (or in
3's case, a separate ops commit). Item 2 is the only one with a
standing-world defect (the well at −85, 68, −359 is currently
leaking); the others can wait. Item 3 is a coordination-only
brief; the work is world-side, not source-side.

## Reading order for Codex

1. Read `HANDOFF.md` §8 in full — both the four fixes and the four
   "still open here" items. The fixes show what NOT to redo; the
   open items are the briefs.
2. Read `AGENTS.md` for the build/test/lint commands and the
   "do not start a second instance" rule.
3. Read the brief you have been assigned. **Do not start work on
   any other item without an explicit handoff.**
4. After each PR, run the test list in that brief's `## Tests`
   section. Do not skip a test to make a build green.
5. Item 3 is a coordination brief. The actual ops file lives in
   `data/buildops/` and is applied by the operator over RCON,
   not by Codex. Do not run RCON from a planning session.

## What is *not* in scope

- The wider **Ravensreach town planning** lives in
  `docs/masterplans/10-ravensreach/` and the masterplan authority
  chain at `docs/masterplans/01-…` through `05-combined-zones/`.
  These briefs are about *town-builder internals* (registry,
  selector, well design, world coordination) — the lowest level
  of the town stack. Anything that touches the masterplan
  composition (e.g. "the plaza is the wrong shape") is a
  masterplan question, not a town-builder question, and goes
  through the masterplan change-control, not through this
  folder.
- The **worker-isolation migration** (`docs/research/worker-process-isolation.md`)
  is a separate workstream. Brief 4 (centrality) flags the
  SiteSelector performance budget under that migration but
  does not propose any change to it. The polkit decision that
  blocks the migration is unrelated.
- The **four siting fixes that landed on 2026-07-25** (the body
  of `HANDOFF.md` §8, before "still open here"). Those are
  done; this folder is the followups.
- The **SEC-01 security items** in `docs/tasks/sec01/` are
  unrelated. The shared `SEC-01` directory name is historical
  (this folder is sibling to it under `docs/tasks/`); the
  content is siting work, not security work.
- **Anything in `dist/`.** Source lives in `src/`.

## Cross-cutting traps (apply to every brief)

- **Do not run the live fleet.** `AGENTS.md` is explicit. The
  bot host runs under `mc-fleet-bot.service` on port 3001;
  starting a second `node dist/index.js` will kick the real
  bot via the duplicate-login path and trip the impersonation
  monitor into `QUARANTINED`.
- **Do not edit `dist/`.** Source changes go in `src/`;
  build with `npm run build`.
- **Backend tests use `VITEST` env.** Some modules throw if
  constructed without a `dataDir` under tests; do not relax
  those guards. `HANDOFF.md:392-395` (trap #2) records the
  precedent.
- **Do not start a second instance.** `AGENTS.md` is explicit.
- **The handoff flags that "this project's documentation has
  repeatedly been more confident than its evidence."** Verify
  every claim you act on. Every `file:line` reference in these
  briefs was read against the repo on 2026-08-07, but file
  layouts drift. Re-read before editing.
- **World-verification scripts are written and committed by
  Codex; they are RUN by the operator.** Do not run RCON,
  SSH, or any live-world command from a planning session.
  Item 3 is the clearest example; items 1, 2, and 4 also
  carry world-side measurement steps that the operator runs
  in a follow-up session.
