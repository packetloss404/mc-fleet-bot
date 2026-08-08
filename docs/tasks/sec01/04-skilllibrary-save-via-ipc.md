# Brief 4/6 — `SkillLibrary.save()` over IPC, `skills/` mounted read-only

> Source: `HANDOFF.md` §3 SEC-01, item 4.
> Severity: **High**. A poisoned `skills/*.js` file is cross-fleet code
> execution plus persistence — every bot loads the same skill file.
> Effort: **M**.
> Depends on: **#5 (IPCTransport Phase A)**. The IPC path this brief
> hardens must already have try/catch + a defined error contract before
> we route disk writes through it.

## Goal

Workers must not be able to write to `skills/` directly. Skill saves must
go through a parent-side IPC channel that the parent validates and
applies. The `skills/` directory on disk must be mounted `read-only` for
the worker process (or, in the absence of OS-level controls, the worker
must not have write access by any other means either). The end state is
that an LLM-generated skill is reviewed by a parent-side gate before it
hits the same file every other bot will load.

## Background

- `src/voyager/SkillLibrary.ts:280-310` — `save(name, description, keywords, code)`
  calls `atomicWriteTextSync(filePath, code)` at line 305 and
  `atomicWriteJsonSync(this.indexPath, merged)` at line 535. Both write
  synchronously. Both run wherever the calling code runs.
- Today the calling code runs in *workers* (via the voyager loop, in
  `botWorker.ts`). The worker has its own `node:fs` and writes to the
  same on-disk directory every other worker reads from. One malformed
  save corrupts the index; one malicious save becomes code the fleet
  loads.
- `test/voyager/skillSaveRatchet.test.ts` — existing test pins save
  behaviour. Re-use its style.
- HANDOFF §3 SEC-01 item 4 is explicit: "poisoned `skills/` is
  cross-fleet code execution plus persistence."

## Files to touch

- `src/voyager/SkillLibrary.ts`
  - Refactor: introduce `save()` *plans* the write but does not perform
    it. Return a `SkillSaveRequest` object (name, description, keywords,
    code, optional quality). The caller in the worker forwards this
    object over IPC to the parent. The parent runs a new
    `applySave(plan)` that performs the actual `atomicWriteTextSync` and
    `atomicWriteJsonSync`. The parent also re-runs the index merge in
    case the worker is racing other workers.
  - The worker keeps a thin `save(plan)` proxy that round-trips
    through IPC. The proxy must not have a code path that writes
    to disk under any condition.
- `src/worker/botWorker.ts` (and any other worker-side caller of
  `SkillLibrary.save`)
  - Replace direct calls with the proxy. The proxy is the only API
    workers see.
- `src/worker/WorkerHandle.ts`
  - Add an IPC request type `'skillLibrary.save'` to the allowlist
    (see brief #2). The handler runs the parent-side
    `applySave(plan)`. The plan's `code` length is bounded
    (`MAX_SKILL_BYTES`, default 64 KiB — pick a number with the
    reviewer's agreement). The handler logs every save with the
    saving bot's name, the resulting file path, and the code length.
- `src/worker/ipcTypes.ts` (new in #2) — add `'skillLibrary.save'`
  to `IPC_REQUEST_TYPES` with its argument shape
  `[{ name: string, description: string, keywords: string[],
  code: string, quality?: number }]`.
- `scripts/verify_skills_readonly.sh` (new)
  - On the bot host, assert the worker process's view of `skills/` is
    read-only. The simplest implementation: a small `setuid` test that
    drops to the worker's uid and tries `touch skills/probe`; it must
    fail with `EACCES` (or `EROFS` if mounted read-only). If the
    project is not yet running dedicated worker users (i.e. SEC-01 #6
    has not landed), this script checks that no current process has
    `skills/` open for write — a weaker but still useful check.
- `docs/tasks/sec01/` — this brief.

## Approach

1. **Define the plan shape.** In `src/voyager/SkillLibrary.ts`, add
   ```ts
   export interface SkillSavePlan {
     name: string;
     description: string;
     keywords: string[];
     code: string;
     quality?: number;
   }
   ```
   `save()` becomes `planSave(args): SkillSavePlan` and is called by
   the *parent's* `applySave(plan)` which performs the actual writes.
   Workers call `proxySave(plan): Promise<string | null>` which posts
   `'skillLibrary.save'` and awaits the parent's response.
2. **Add the IPC handler.** In `WorkerHandle.setupIPC`, the new handler
   runs the parent's `applySave`. Bound `MAX_SKILL_BYTES`. Bound
   `MAX_KEYWORDS` (e.g. 16) and reject plans with more. Strip control
   characters from the `name` (a poison attempt using
   `../etc/passwd` is already mitigated by the existing
   `replace(/[^a-zA-Z0-9_-]/g, '_')` at line 302, but the IPC layer
   should *not* rely on it).
3. **Mount read-only.** Two options, in order of preference:
   - **systemd `ReadOnlyPaths=` + `ReadWritePaths=` (or `ProtectSystem=strict`).**
     The drop-in for `mc-fleet-bot.service` adds
     `ReadOnlyPaths=/opt/stacks/mc-fleet-bot/skills` and (for the main
     process) `ReadWritePaths=/opt/stacks/mc-fleet-bot/skills`.
     The main process keeps the write because it owns the IPC
     handler; the workers inherit the read-only view because they are
     threads of the same process — wait, that's wrong. Workers are
     threads; they share the process's file descriptors. The mount
     works at the process level, not per-thread. To make the worker's
     view read-only, the parent must `fs.chmod` the skills dir, or
     run workers as a different user (which is SEC-01 #6's plan).
     The pragmatic interim fix is **chmod 0555 on `skills/` after
     each save** + verify in CI.
   - **Code-only mitigation.** The IPC proxy is the real defence.
     `skills/` chmod is belt-and-braces for the case where a future
     bug reintroduces a worker-side direct write.
4. **Verify.** `scripts/verify_skills_readonly.sh` must show
   "no write access for the worker uid, OR a process check that shows
   no worker has `skills/` open for write". Land the chmod mitigation
   regardless.

## Tests

- `test/voyager/SkillLibrary.proxyOnly.test.ts`
  - Construct a `SkillLibrary` in worker mode (no `dataDir` is the
    typical test config). Call `proxySave(plan)`. Assert the
    underlying filesystem was *not* touched (use a tmpdir + a
    `fs.watch` race, or stub `atomicWriteTextSync` and assert it
    was never called). Then construct a *parent-mode* `SkillLibrary`
    and call `applySave(plan)`; assert the file exists and the
    index is updated.
- `test/worker/WorkerHandle.skillSave.test.ts`
  - Stub the parent-side manager. Send an IPC request with a
    `MAX_SKILL_BYTES`-over-large plan. Assert the parent rejects
    with a structured error and does not write.
  - Send a plan with `keywords.length > MAX_KEYWORDS`. Assert
    rejection.
  - Send a valid plan. Assert the parent writes and returns the
    canonical file path.
- `test/scripts/verify_skills_readonly.test.ts`
  - Run the script in a fixture dir where `skills/` is `chmod 0555`.
    Assert the script reports "no write access".
  - Run it where `skills/` is `chmod 0755`. Assert the script
    reports "writable — chmod mitigation missing" and exits non-zero.

## Definition of done

- [ ] `src/voyager/SkillLibrary.ts` exports `SkillSavePlan` and
      `proxySave`; the worker no longer calls `atomicWriteTextSync`
      or `atomicWriteJsonSync` directly.
- [ ] `'skillLibrary.save'` is in `IPC_REQUEST_TYPES` (added in #2).
- [ ] `WorkerHandle` validates the plan (size, keyword count, name
      sanitization) before invoking the parent-side writer.
- [ ] `skills/` is `chmod 0555` on the bot host after every save.
      A wrapper script (`scripts/save_skill.sh` — or extend the
      existing save path) sets this.
- [ ] `scripts/verify_skills_readonly.sh` exists and exits 0 on a
      hardened host.
- [ ] `test/voyager/skillSaveRatchet.test.ts` still passes (the
      refactor must not break the existing ratchet test).
- [ ] New tests pass.
- [ ] `npm run build` succeeds.
- [ ] PR description lists the new env of the IPC contract and the
      bound sizes (with reviewer agreement).

## Traps to avoid

- **`skillSaveRatchet.test.ts` is the existing behaviour test.** Read
  it before refactoring. If the proxy breaks the ratchet, the
  refactor is wrong, not the test.
- **`atomicWriteTextSync` and `atomicWriteJsonSync` are also used by
  other modules.** Grep before refactoring. Only `SkillLibrary`'s
  usage moves to the parent.
- **Workers share the parent's file descriptors (they are threads).**
  A `chmod` on the directory is the right mitigation, not a per-thread
  file handle. The IPC proxy is the durable defence; chmod is the
  belt.
- **Do not skip the index update.** The save is two writes
  (`atomicWriteTextSync` for the code, `atomicWriteJsonSync` for
  the index). If the IPC handler writes only the first, the next
  `loadIndex()` will fail to find the new skill. The parent must
  perform both atomically with respect to each other.
- **The handoff warns that `getTopKSkillCode`'s `score >= 6` was used
  as a safety gate (HANDOFF §4 trap 0b) and broke.** Adding a
  "trust score" to the save path would be the same class of bug. The
  validation in this brief is on *shape* (size, count, name) and on
  *route* (parent-only), not on *content*. Content validation is a
  separate work item.
- **Do not add an "auto-approve" path.** The handoff flags
  `BuildCoordinator`'s silent override as the bug that put a well in
  a pond (HANDOFF §8 #4). Every save must be reviewed. If the
  reviewer is the LLM, route the review through a separate
  `'skillLibrary.review'` request and a distinct allowlist entry —
  do not conflate review and apply.

## References

- `HANDOFF.md` §3 SEC-01 item 4
- `src/voyager/SkillLibrary.ts:280-310` (save) and `520-536` (index merge)
- `src/util/atomicWrite.ts`
- `test/voyager/skillSaveRatchet.test.ts` (existing test)
- `HANDOFF.md` §8 #4 (silent override — anti-pattern to avoid)
- `HANDOFF.md` §4 trap #0b (threshold-as-gate anti-pattern)
