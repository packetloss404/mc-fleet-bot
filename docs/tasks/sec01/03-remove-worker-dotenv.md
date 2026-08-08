# Brief 3/6 — Delete `import 'dotenv/config'` from `botWorker.ts:1`

> Source: `HANDOFF.md` §3 SEC-01, item 3.
> Severity: **Medium**. Parent-side env scrubbing is theatre while the worker
> re-injects `GOOGLE_API_KEY` from its own `.env` on every spawn.
> Effort: **S**. Single-line deletion + one verification test.
> Depends on: none. This brief should land before #4 because #4's threat
> model assumes the worker cannot read arbitrary env files.

## Goal

`src/worker/botWorker.ts` must not read `.env` (or any other environment
file) at startup. The worker receives all secrets it needs from the parent
through `workerData` (which it already gets for `botName`, `personality`,
`mode`, `spawnLocation`, `workerSlotIndex`, `configPath`) or through the IPC
channel. Any future secret that the worker needs must be plumbed the same
way, not loaded from disk.

## Background

- `src/worker/botWorker.ts:1` — `import 'dotenv/config';` is the only
  `import 'dotenv/...'` in `src/` (verified by grep). Its effect: at module
  load time, `dotenv` reads the process CWD's `.env` and sets any vars
  that are not already in `process.env`.
- The worker's CWD is the repo root, and the repo's `.env` is gitignored
  but lives on disk on the bot host. That file contains `GOOGLE_API_KEY`
  (HANDOFF §3 SEC-02) and the same auth material the SEC-01 #1 brief
  hardens. Today, the worker re-reads it on every spawn, so any parent-side
  attempt to scrub the worker's env (e.g. by passing a filtered
  `process.env` to the Worker constructor) is undone at the next worker
  boot.
- `src/index.ts` is the only place that should read `.env` for the *main*
  process. It uses `dotenv` indirectly via `src/config.ts`; confirm before
  deleting the worker's import that the main process keeps its `.env` read.

## Files to touch

- `src/worker/botWorker.ts:1` — delete the line.
- `src/worker/botWorker.ts` (further down, ~line 130 where
  `loadConfig()` is called) — confirm that the call path goes through
  `workerData.configPath` and does not depend on `process.env` for
  secrets. If it does, plumb the value through `workerData` from
  `src/worker/WorkerHandle.ts:273-280`.
- `src/worker/WorkerHandle.ts:273-280` — extend the `workerData` object to
  forward a sanitized subset of secrets the worker actually needs. Today
  the worker probably needs `GOOGLE_API_KEY` and `ANTHROPIC_API_KEY` (per
  HANDOFF §3 SEC-02). Anything that is not on the explicit allowlist must
  not be in `workerData`. The default `process.env` passed implicitly to
  a `Worker` *also* contains the parent's full env — see Traps.

## Approach

1. **Audit the worker's env surface.** In `src/worker/botWorker.ts`, grep
   for `process.env.` to find every read. List each one. For each, decide:
   - **Move to `workerData`:** a value the parent already has and that
     should not be re-read from disk.
   - **Keep on the parent only:** a value the worker does not need (most
     auth tokens, `DASHBOARD_AUTH_SECRET`, `PLUGIN_AUTH_TOKEN`).
   - **Compute and pass once:** a derived value like a config blob.
2. **Pass an explicit `env` to the Worker constructor.** In
   `src/worker/WorkerHandle.ts:273`, change the `new Worker(workerPath, { workerData, ... })`
   to pass `env: { ...filtered... }` so the worker's `process.env` is
   scoped to the allowlist, not a copy of the parent's full env. Today's
   `Worker` constructor inherits the parent's env by default; passing
   `env` overrides that. Confirm with `node:worker_threads` docs.
3. **Delete the line.** After step 1, remove `import 'dotenv/config';`
   from `src/worker/botWorker.ts:1`. The file no longer reads any
   environment file.
4. **Verify.** Boot a worker in a test (see Tests). Assert that
   `process.env.GOOGLE_API_KEY` inside the worker equals the value the
   parent passed via `workerData`, not the value from `.env` on disk
   (use a stub `.env` to confirm the worker does *not* read it).

## Tests

- `test/worker/botWorkerEnv.test.ts`
  - Create a fixture worker file
    (`test/worker/fixtures/env-probe-worker.ts`) that posts an IPC
    message with `process.env.GOOGLE_API_KEY`,
    `process.env.DASHBOARD_AUTH_SECRET`, and a `botName` derived from
    `workerData`.
  - Place a `.env` in the test's CWD with `GOOGLE_API_KEY=from-disk`.
  - Spawn the worker with `env: { GOOGLE_API_KEY: 'from-parent' }` and
    `workerData: { botName: 'probe' }`.
  - Assert the IPC message reports `GOOGLE_API_KEY === 'from-parent'`
    and `DASHBOARD_AUTH_SECRET === undefined` (the parent did not pass
    it; the worker did not read `.env`).
- `test/worker/dotenvAbsent.test.ts`
  - `grep -RE "from 'dotenv" src/worker/` must return no matches.
  - This is a static check; codify it as a one-liner test that fails
    the build if a future PR reintroduces a `dotenv/config` import in
    `src/worker/`.

## Definition of done

- [ ] `src/worker/botWorker.ts:1` no longer contains `import 'dotenv/config';`.
- [ ] `src/worker/WorkerHandle.ts` passes an explicit `env` to the
      `Worker` constructor, scoped to the worker-required allowlist.
- [ ] Every `process.env.*` read in `src/worker/botWorker.ts` is
      either (a) on the explicit allowlist passed via `env`, or
      (b) on a value forwarded through `workerData`, with no
      `.env` fallback.
- [ ] `test/worker/botWorkerEnv.test.ts` and
      `test/worker/dotenvAbsent.test.ts` pass.
- [ ] `npm run build` succeeds.
- [ ] The PR description lists the allowlist of env vars that survive
      into the worker.

## Traps to avoid

- **`new Worker(path, { workerData })` inherits the parent's full
  `process.env` by default.** That is the parent process's env, not
  the parent's *scrubbed* env. If the parent has
  `DASHBOARD_AUTH_SECRET` in its own env, the worker has it too unless
  the constructor passes a scoped `env` option. The fix in step 2
  closes this hole.
- **Do not delete `dotenv` from `package.json`.** The main process still
  uses it (via `src/config.ts`). Only the *worker's* import is removed.
- **The handoff says "parent-side scrub theatre" because the worker
  re-injects.** This brief removes the re-injection. It does *not* add
  scrubbing — passing a scoped `env` to the Worker constructor replaces
  the need for scrubbing.
- **`workerData` is structured-cloned, not `process.env`.** Strings,
  numbers, booleans and plain objects cross the boundary fine. Buffers
  and functions do not. If a secret is large (e.g. an LLM prompt
  template), pass it as a string.
- **The handoff's SEC-02 (rotate `GOOGLE_API_KEY` and `ANTHROPIC_API_KEY`)
  is a separate work item.** This brief is about *where the secret is
  read from*, not *which secret value is in use*. Do not bundle rotation.

## References

- `HANDOFF.md` §3 SEC-01 item 3
- `HANDOFF.md` §3 SEC-02 (rotation — adjacent, not in this brief)
- `src/worker/botWorker.ts:1`
- `src/worker/WorkerHandle.ts:273-280` (Worker constructor)
- `node:worker_threads` docs — `env` option on `new Worker(...)`
