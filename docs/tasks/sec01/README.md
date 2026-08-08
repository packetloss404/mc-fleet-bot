# SEC-01 briefs — six fixes that ship without the worker-isolation decision

Source: `HANDOFF.md` §3 SEC-01. These six items "ship regardless of that
decision", and the handoff explicitly says "the first two reduce more risk than
the migration does." The full worker-isolation design is in
`docs/research/worker-process-isolation.md` and is out of scope here.

## Order and dependencies

| # | Brief | Effort | Depends on | Why this slot |
|---|---|---|---|---|
| 1 | `01-dashboard-auth-secret.md` | S | none | Highest leverage. Without it the rest is decorative. |
| 2 | `02-ipc-input-validation.md` | M | none | Closes the "one bad message kills the fleet" hole. |
| 3 | `03-remove-worker-dotenv.md` | S | none | Trivial. Removes parent-side scrub theatre. |
| 4 | `04-skilllibrary-save-via-ipc.md` | M | 5 | Hardens the cross-fleet RCE path. |
| 5 | `05-ipc-transport-phase-a.md` | M | none | Pure correctness on today's threads; prerequisite for #4. |
| 6 | `06-ip-address-deny.md` | S | none | Unit-file change on the bot host, not a repo edit. |

Recommended execution order: **1 → 2 → 3 → 5 → 4 → 6**, in separate PRs.
Item 6 is host-side, not repo-side; the brief is a deploy runbook.

## Reading order for Codex

1. Read `HANDOFF.md` §3 SEC-01 in full.
2. Read `AGENTS.md` for the build/test/lint commands and the "do not start a
   second instance" rule.
3. Read the brief you have been assigned. **Do not start work on any other
   item without an explicit handoff.**
4. After each PR, run the test list in that brief's `## Tests` section. Do
   not skip a test to make a build green.

## What is *not* in scope

- The full worker-isolation migration (template units, dedicated user, polkit
  rule). The handoff flags the **polkit rule** as the real blocker; do not
  open that door here.
- The impersonation monitor, the bot-built well, siting fixes, or any world
  work. Those are unrelated open items.
- Anything in `dist/`. Source lives in `src/`.

## Cross-cutting traps (apply to every brief)

- **Do not run the live fleet.** `AGENTS.md` is explicit. The bot host runs
  under `mc-fleet-bot.service` on port 3001; starting a second `node dist/index.js`
  will kick the real bot via the duplicate-login path and trip the
  impersonation monitor into `QUARANTINED`.
- **Do not edit `dist/`.** Source changes go in `src/`; build with `npm run build`.
- **Backend tests use `VITEST` env.** Some modules throw if constructed without
  a `dataDir` under tests; do not relax those guards.
- **Frontend lint is not necessarily clean.** `AGENTS.md` says the frontend
  has pre-existing warnings and errors; do not "fix" unrelated lint findings
  in a SEC-01 PR.
- **The handoff flags that "this project's documentation has repeatedly been
  more confident than its evidence."** Verify every claim you act on. If a
  test is impossible without live infra, write it as a no-op with a comment,
  not as a fake-passing assertion.
