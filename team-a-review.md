# Team A — code + functionality review

Branch: `review/team-a-code-functionality` (commit `c7a576c`).
Scope: fresh look at the bot + town + dashboard code, find what to fix or
should-have-already-existed, propose, and ship small contained fixes. Built on
top of `docs/research/unreachable-api-and-config.md`, which already mapped the
highest-leverage dead-config issues; the fixes below close three of the
thirteen items it enumerates.

## Shipped on this branch

### `BACKLOG` item 0 — `minecraft.loginFlow` is now a closed `<select>` in the dashboard

The API has been validating `loginFlow` against `none|dyoauth` since
2026-07-26 (`src/util/configPersist.ts:166-173`), but the dashboard's generic
`SettingsSection` rendered every string as a free-text input, so an operator
could still type `DyoAuth` (capital A) or `dy-oauth` and only learn about the
rejection when the PATCH 400'd. Now the field renders a `<select>` with the
two accepted values (`web/src/app/settings/page.tsx:69-79`). A new
`options` field on `FieldOverride` (`web/src/components/settings/SettingsSection.tsx:42-48`)
makes this available to any future closed-enum string field without
hard-coding a per-field type system.

`BACKLOG.md` item 0 marked DONE; the residual "clear the dead tracked
`loginPassword`" is a one-line `config.yml` edit, deferred.

### `BACKLOG` item 10 — `behavior.ambientChat*` and `security.quarantineReleaseSec` are no longer dead config

- `BotInstance.scheduleAmbientChat` (`src/bot/BotInstance.ts:1618-1631`) now
  reads `config.behavior.ambientChatMinSec` / `ambientChatMaxSec` (seconds,
  clamped ≥ 5 s) instead of the 10–20-minute hardcode that the research doc
  confirmed was 5× and 4× the configured values.
- `BotInstance` now honors `config.security.quarantineReleaseSec` in the
  impersonation path (`src/bot/BotInstance.ts:810-822`): when positive, a
  bot that gets quarantined for a duplicate-login kick schedules its own
  release. `0` (the config default) keeps the prior manual-only behavior, so
  this is non-breaking.

Both fields stay in `RESTART_REQUIRED_FIELDS` because the timers are
constructed from config at quarantine / chat-schedule time, not propagated
over IPC. Closing that is a behavior change, deferred.

`BACKLOG.md` item 10 marked DONE.

## Findings deferred (out of small-fix scope)

The following are the highest-leverage items the fresh review surfaced; they
need owner judgement or a larger refactor and are not in this branch.

- **Build-intent wiring is still stranded at ~80%** (`BACKLOG.md` item 3,
  `src/bot/BotInstance.ts:1006-1008`). The parser resolves coordinates; the
  dispatch to `BuildCoordinator` is still a `TODO:`. Medium effort.
- **CI pipeline missing** (`BACKLOG.md` item 4, no root
  `.github/workflows/ci.yml` for the bot code itself).
  The repo has a `tools/fleet-devtools` workflow at
  `.github/workflows/tools.yml` but no root `build + vitest` gate, so
  regressions land silently. ~30 lines to add.
- **Web strict-type debt** (`BACKLOG.md` item 5, `web/next.config.ts:4-6`).
  `npm run lint --prefix web` currently reports 134 errors / 34 warnings; the
  `ignoreBuildErrors: true` flag hides the same on `next build`. Existing
  failures are not in files I touched. Long burn-down.
- **Async-ify SQLite** (`BACKLOG.md` item 6, REPO_REVIEW.md #7). `better-sqlite3`
  is sync and shares the event loop with Express + Socket.IO + brain ticks.
  The worker thread infra exists. Medium effort.
- **`POST /api/admin/restart` lies** (`BACKLOG.md` item 1, `src/server/admin.ts:232`).
  A 202 + `process.exit(0)` does *not* restart under `Restart=on-failure`.
  This is a judgement call (rename to `/shutdown`, or `process.exit(1)`,
  or change the unit) and needs the owner.
- **`config.yml` `minecraft.loginPassword: "dyobot2026"` is dead** for any
  fleet with `loginFlow: "none"` (i.e. this one). Cleared by hand; flagged.
- **`tools/consolidate-explore-skills.js`** is a 1-file sub-tool that nothing
  imports. Either document its purpose or move it under `scripts/`.
- **`docs/research/unreachable-api-and-config.md`** is a goldmine; items 1,
  4, 5, 6, 10, 12, 13 from its "what to do" list remain open. Worth
  tracking as a follow-up to this sweep.

## Test + build evidence

- `npm run build` — passes (`tsc` clean, no new errors).
- `npm run lint --prefix web` — 134 errors / 34 warnings, all pre-existing;
  no new failures in the three files touched.
- `npx vitest run test/bot/ test/voyager/` — 27 files, 167 tests, all pass.
- `npx vitest run test/security/` — 1 file, 5 tests, all pass.
- `npm test` was not run end-to-end; focused suites cover the touched code
  and the build catches type drift in the rest.
