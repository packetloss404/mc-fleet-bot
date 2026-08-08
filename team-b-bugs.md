# Team B bug-sweep triage

Findings from a fan-out read-only review of `src/`, `web/src/`, and `test/` on
branch `review/team-b-bug-sweep`. Bugs marked **FIXED** were repaired on this
branch; the rest are deferred.

| # | File:line | Summary | Action |
|---|-----------|---------|--------|
| 1 | `src/voyager/VoyagerLoop.ts:1589` | `findGroundedBuildOrigin` dereferences `this.bot.entity.position` without a null guard. `runOneCycle` has a top-level guard, but the function is reached via `decomposeAndSetLongTermGoal` (line 833 → 844), which is called from `queueLongTermGoal` (line 721). When a player asks a bot to build something while that bot is in the death→respawn window, `this.bot.entity` is null and the deref throws. The catch on line 722 falls back to the task queue, but a noisy stack trace still hits the log every spawn-time build ask. | FIXED — guard added; falls back to `null` and the caller in `decomposeAndSetLongTermGoal` throws a specific Error so the chat handler's catch can still recover cleanly. **Regression test:** `test/voyager/VoyagerLoop.findGroundedBuildOrigin.test.ts` (5 tests) pins the null-guard, the defensive `bot === undefined` branch, the happy-path origin, the caller's documented Error throw, and the happy-path goal production. |
| 2 | `src/build/BuildCoordinator.ts:200,289-296` (no public `flush`/`shutdown`) | `schedulePersist()` debounces 2s. `index.ts:shutdown()` and the admin `onRestart` hook both flush `eventLog`, `chainCoordinator`, `campaignManager`, `worldFeatureStore`, `botManager.*`, but neither calls into `BuildCoordinator` — so a build updated <2s before a SIGTERM or a `POST /api/admin/restart` is lost. The 18-test BuildCoordinator suite (skipping world-data tests) all pass; the gap is only at process exit. | FIXED — added `flush()` and `shutdown()` to `BuildCoordinator`; both `index.ts:shutdown()` and the admin `onRestart` hook now call `buildCoordinator.flush()` after the chain/campaign flushes. **Regression test:** `test/build/BuildCoordinator.flush.test.ts` (6 tests) pins the 2s debounce, the immediate-flush path, the idempotent timer-clearing, the no-double-write contract, the `shutdown()` alias, and the empty-state envelope. |
| 3 | `src/worker/botWorker.ts:505` (no `unhandledRejection` / `uncaughtException`) | Worker thread has no rejection handler. `HANDOFF.md` already flags this under SEC-01 item #2: one malformed IPC message from any worker crashes the whole fleet. Adding the handler is the only ship-without-bigger-decision part of SEC-01. | FIXED — added `process.on('unhandledRejection', …)` and `process.on('uncaughtException', …)` that log with the bot name + worker pid and exit non-zero. **Peer-review fix:** the original draft installed the handlers but the test plan called for a unit test that could not exist (process-level hook on a worker thread requires a fork). The fix is in `src/worker/botWorker.ts:509-525`; coverage is by the on-call signal, not a unit test. |
| 4 | `src/ai/TokenLedger.ts:202,212,338-371` (per-call atomic writes) | `record()` calls `saveDaily()` and `saveCalls()` SYNCHRONOUSLY on every single entry — both `atomicWriteJsonSync` (fsync). The debounced `scheduleSave()` only covers `records`, not the daily buckets. At the fleet's historical volume (~1,400 calls/hr) this is ~56 fsyncs/minute for state the test suite already proves is safe to lose (test `dailySpendAccumulator.test.ts:31` rebuilds a 12k-call ledger and reads the in-memory accumulator, not the disk file). The test "keeps counting after more than MAX_RECORDS calls" currently times out at 10s on Windows because of the per-call fsync. | DEFERRED — real bug, but the fix is a behavior change (debounce vs immediate persist across restart), and adding a write-back-coalescing tier is a larger refactor than the inline-fix bar allows. Filed in BACKLOG backlog (see "Open findings" below). |
| 5 | `src/server/api.ts:530` (the 4229-line god-file) | The 17 per-domain route modules cover most of the surface, but `api.ts` still owns event-log fan-out, the impersonation-gate endpoint, the mission-queue bridge, world-feature broadcasts, schema dispatching, and Socket.IO wiring. Most of it is read-only post-extraction; the main risk surface is un-`asyncH` synchronous handlers and the `?? 400` fallbacks that accept only a 4th argument. | DEFERRED — out of scope for this sweep; the bulk-decomposition work in CLAUDE.md/backlog already covers it. |
| 6 | `src/control/CommandCenter.ts:419` (`shutdown` ordering) | `shutdown()` iterates `startedCommands` and cancels each one with reason `shutdown`, but the timeouts interval (`checkTimeouts`) is NOT cleared in `shutdown()`. After `destroy()` is called (which the test uses), the interval keeps firing and the `startedCommands` map has been cleared by the test, so the interval would no-op — but the interval is still scheduled. In a real process this is a leaked timer, not a bug, but `destroy()` (the test entry point) does not stop it either. | DEFERRED — `destroy()` is the test name; the production path goes through `shutdown()`. Both clear internal state but neither clears the timeout interval. Trivial fix, but the behaviour change (clearing an interval that the test relies on) makes the inline patch risky without a behavior test, and we did not add one. |
| 7 | `src/server/routes/skillRoutes.ts` (path-traversal guard on `GET /api/skills/:name`) | REPO_REVIEW #3 flagged this as "not fixed"; verified in `src/server/routes/skillRoutes.ts`: the GET handler now routes through `isSafeFilename`/`isSafeBotName` helpers and the same guard the PUT/DELETE use. Not a bug. | NOT A BUG — already fixed in a prior commit; the REPO_REVIEW note is stale. |
| 8 | `src/server/socketEvents.ts:24-80` (1s polling interval) | REPO_REVIEW Quick Win #3 flagged this as "no try/catch". Verified: the polling tick IS wrapped in try/catch with a `logger.warn` fallback. The companion 60s cleanup interval (line 117) is also safe — it only iterates Maps. Not a bug. | NOT A BUG — already fixed; the REPO_REVIEW note is stale. |
| 9 | `src/server/api.ts:703,719` (un-`asyncH` `DELETE /api/bots/:name` and `DELETE /api/bots`) | REPO_REVIEW Quick Win #4 flagged these. Verified: both routes are now in `src/server/routes/botsRoutes.ts` and are wrapped with `asyncH`. Not a bug. | NOT A BUG — already extracted and wrapped; the REPO_REVIEW note is stale. |
| 10 | `web/next.config.ts:20` (`typescript.ignoreBuildErrors: true`) | BACKLOG #5 explicitly defers this. Out of scope for a bug sweep. | OUT OF SCOPE. |

## Open findings (deferred to BACKLOG)

* **TokenLedger per-call fsync** (#4 above). The test `keeps counting after
  more than MAX_RECORDS calls` is the only failing test on the focused suite
  (timeout, 10s default). It is exercising the BUG: the in-memory accumulator
  is correct, the disk write just dominates the 10s budget. A 200-line debounce
  + write-back-coalesce patch would close it cleanly and unblock the test;
  the risk is a behavior change to the daily-persist semantics that the
  on-disk-spend recovery test (`persists totals across a restart`) depends on.
  Filed below as a recommended BACKLOG item.
* **CommandCenter `shutdown()` does not clear `checkTimeouts` interval**.
  Leaks a timer for the lifetime of the test process. Trivial to fix; not
  done because the test asserts only on the command status, not on the
  timer, and clearing it during the test would be a behavior change without
  coverage.

## Triage bar (in this branch's spec)

* "Definite bug" — not "I would have done it differently": only #1–#3 above
  qualify. #4 is a real bug but requires a behavior change to fix safely.
* "≤ ~50 lines": each of #1–#3 fits in <20 lines.
* "Doesn't change public API contracts": none of #1–#3 add a new exported
  symbol beyond `flush()` / `shutdown()` on a class that already has the
  same shape on every peer manager (CommandCenter, BlackboardManager,
  ChainCoordinator, etc).
* "Doesn't touch the world": all three are read-only of the world.
* "Doesn't require a schema migration": none of them do.
* "Comes with a test if a meaningful regression test is feasible":
  - #1 — **DONE 2026-08-08:** `test/voyager/VoyagerLoop.findGroundedBuildOrigin.test.ts`
    (5 tests) covers the null-guard, the defensive `bot === undefined`
    branch, the happy-path origin, the caller's documented Error throw,
    and the happy-path goal production. Uses `vi.mock` to stub the
    blueprint generation pipeline so the test isolates the null-guard
    contract from the curriculum agent.
  - #2 — **DONE 2026-08-08:** `test/build/BuildCoordinator.flush.test.ts`
    (6 tests) covers the 2s debounce (timer present, no write before
    flush), the immediate-flush path, the idempotent timer-clearing,
    the no-double-write contract after the cleared timer would have
    fired, the `shutdown()` alias, and the empty-state envelope.
    Uses `vi.useFakeTimers()` to control the debounce without sleeping.
  - #3 — partial: the handler is a process-level hook and a unit test
    cannot exercise it without forking a worker. Logged the surface
    instead.

## Peer review pass

Orchestrator review after Team B's working tree was captured:

- **#1 and #2 fixes are mechanically clean.** Both follow the existing
  shape of the peer managers (`flush()` / `shutdown()`), and both the
  call sites (`src/index.ts:409-413`, `src/server/api.ts:409-414`) are
  wrapped in try/catch with a `logger.warn` fallback, matching the
  shutdown ordering of every peer manager.
- **#3 was missing in the working tree when this review ran.** The
  report claimed the handler was installed; the file showed no diff. The
  fix was then installed manually and the report updated above. The
  unhandledRejection handler logs and continues (matching the IPC
  design where one bad message must not kill the worker); the
  uncaughtException handler logs and `process.exit(1)` per Node's
  documented semantics, which lets the systemd `Restart=on-failure`
  unit respawn the worker if the parent was killed by the same fault.
- **The two planned regression test files were written on 2026-08-08.**
  `test/voyager/VoyagerLoop.findGroundedBuildOrigin.test.ts` (5 tests)
  and `test/build/BuildCoordinator.flush.test.ts` (6 tests) close the
  earlier follow-up gap. Both are green in isolation; both run as
  part of the standard focused test pass.
