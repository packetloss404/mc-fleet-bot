# SEC-01 regression surface — feature-by-feature breakage inventory

**Date:** 2026-08-08
**Scope:** `docs/tasks/sec01/01..06` — the six briefs that ship regardless of the
worker-process-isolation decision (`HANDOFF.md` §3 SEC-01, items 1–6).
**Method:** read-only inspection of `src/`, `test/`, and the briefs themselves. No
live fleet. No Minecraft. No RCON.

For each brief: a summary, the files in `src/` it touches, the features that
depend on the touched code path, the regression modes a careless implementation
will produce, the test coverage that catches them, and a risk grade.

The grading is calibrated to the dispatch model in `docs/research/worker-process-isolation.md`:
- **LOW** — a single existing test (or one new one) catches the regression.
- **MEDIUM** — multiple call sites, but each is independently verifiable and at
  least one test exercises the surface end-to-end.
- **HIGH** — cross-cutting, no clear test surface, or a single regression breaks
  more than one feature in a way that any one test misses.

Read this top-to-bottom if you are deciding ship order; read it brief-by-brief
if you are reviewing a PR.

---

## Brief 01 — `DASHBOARD_AUTH_SECRET` + `PLUGIN_AUTH_TOKEN` deploy runbook

> File: `docs/tasks/sec01/01-dashboard-auth-secret.md`
> Effort: **S**. Severity: High. Repo edits: minimal (config + script).

### Brief summary

Drop a `DASHBOARD_AUTH_SECRET` and a `PLUGIN_AUTH_TOKEN` into the systemd unit
for `mc-fleet-bot` so the `/api/*` and `/api/events/*` routes that are today
unauthenticated on a non-loopback bind (`HANDOFF.md` §3 SEC-01 item 1) require
the right credential. All source-tree work is host-side: a verifier script and
the test that pins the env-gating behaviour.

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `src/server/auth.ts:163-185` | `requireDashboardAuth` middleware. When `DASHBOARD_AUTH_SECRET` is unset, calls `next()` (no-op). When set, exempts `/api/auth/*`, `/api/events/*`, `/api/health`, `/api/status` and otherwise 401s. |
| `src/server/auth.ts:191-207` | `requirePluginAuth` middleware. Same shape: no-op when `PLUGIN_AUTH_TOKEN` is unset; checks `x-plugin-token` header when set. |
| `src/index.ts:67-87` | The boot-time `SECURITY:` warning. Fires when the env vars are absent *and* the API is bound non-loopback. Currently the only operator-visible signal that the surface is open. |
| `src/server/api.ts:171-179` | The actual middleware wiring: `app.use('/api/events', rateLimit, requirePluginAuth)` then `app.use('/api', requireDashboardAuth)`. The "gates the whole API" claim lives here. |
| `src/server/api.ts:215-221` | Socket.IO handshake middleware. Re-uses `isDashboardAuthenticated` so the websocket stream honours the same secret as REST. **The brief does not call this out — it is the silent sibling of the REST gate.** |
| `src/server/api.ts:199-210` | Socket.IO CORS. Already an origin allowlist (no longer `origin: true`), so the "any site can subscribe to bot positions" path is already closed; this brief leaves it alone. |

### Features that depend on the touched code path

- **`/api/auth/login`, `/api/auth/logout`, `/api/auth/status`, `/api/auth/me`** — exempt
  by `DASHBOARD_AUTH_EXEMPT_PREFIXES` (`src/server/auth.ts:143-148`). The login
  route itself mints the `auth` cookie when the secret matches
  (`src/server/auth.ts:422-430`), so the middleware is the *gate* and the login
  route is the *issuer*.
- **`/api/events/chat`, `/api/events/player-join`, `/api/events/player-leave`** — the
  only consumer of `requirePluginAuth` today (called from external Minecraft
  plugins, the comment at `src/server/api.ts:169-175`). Without the token set,
  the comment at `src/server/api.ts:170-175` is the only line that says "we
  intended to gate this".
- **Every other `/api/*` route** — gated by `requireDashboardAuth` after the
  brief lands. ~30 route files mount under `/api` (commands, missions, bots,
  squads, roles, markers, etc.). The brief's
  [definition-of-done line] `app.use('/api', requireDashboardAuth)` is
  `src/server/api.ts:179`.
- **`GET /api/health`** — exempt. The health probe and the operator's
  `verify_admin_auth.sh` both rely on it returning 200 unauthenticated.
- **Socket.IO `bot:*`, `build:*`, `world:event`, `town:*` streams** — gated by
  `io.use((socket, next) => isDashboardAuthenticated(req) ? next() : next(new Error('unauthorized')))`
  at `src/server/api.ts:215-221`. A change to the REST middleware that does
  not also check the socket layer leaves bot positions and chat world-readable.
- **The web dashboard at port 3000** — the *client*. If the dashboard reads
  the secret from `web/.env.local` (a separate file the brief flags at §4
  step 4), it is *not* protected by this brief; the brief is the server side.
  The client-side login form will start returning 401 until its env file is
  updated.

### Likely regression modes

1. **Dashboard logout-of-sync after the brief lands.** The brief's
   `verify_admin_auth.sh` and `scripts/verify_admin_auth.sh` prove the
   *server* gate works, but the dashboard at port 3000 keeps an `auth` cookie
   only if the login flow on the web side reads the same secret. If the
   dashboard's `web/.env.local` does not match, every dashboard fetch returns
   401 silently and operators see "no bots online" while the API is fine.
   The fix is host-side only — the brief is correct to keep the dashboard
   out of `src/`, but the rollout script must update both.
2. **An exempt-prefix change slips a new mutating route into the wild.** The
   `DASHBOARD_AUTH_EXEMPT_PREFIXES` list at `src/server/auth.ts:143-148`
   is hand-maintained. A new `/api/health/ready` or `/api/auth/refresh`
   added without checking the prefix list returns 200 unauthenticated forever.
   The existing test (`auth.dashboardSecret.test.ts:116-183`) only pins the
   *login* path; a regression in the exempt list has no test coverage today.
3. **Socket.IO bypasses the new gate.** A future PR that adds a `io.on('connection', ...)`
   handler without re-running `isDashboardAuthenticated` opens a parallel
   channel. The middleware at `src/server/api.ts:215-221` is one block, easy
   to refactor around. No test pins "Socket.IO requires the secret when
   `DASHBOARD_AUTH_SECRET` is set" today — `test/server/auth.dashboardSecret.test.ts`
   is REST-only.
4. **Boot warning silenced as a "fix".** A future operator under pressure
   silences the `SECURITY:` log line at `src/index.ts:78-87` instead of
   setting the env var. There is no test for the warning text — the only
   pin is the brief's "do not silence the warning unless the deployment will
   never bind non-loopback" rule, which lives in a markdown file.

### Test coverage that catches the regression

- `test/server/auth.dashboardSecret.test.ts` (existing) — pins the login
  flow's 200/401 matrix when `DASHBOARD_AUTH_SECRET` is set/unset. Re-use
  its `http.request` + ephemeral-port pattern for the new test.
- `test/server/auth.envGating.test.ts` (new, called for in brief) — must
  add the Socket.IO matrix (REST bypass would not catch it) and a
  "exempt-prefix set has not grown unexpectedly" assertion that diffs the
  exported `DASHBOARD_AUTH_EXEMPT_PREFIXES` array.
- `test/scripts/verify_admin_auth.test.ts` (new) — runs the bash script
  against a mock `systemctl show` fixture and asserts the matrix it reports.
  Without this, the brief's only enforcement is "an operator runs the
  script by hand" — which the handoff explicitly distrusts
  (`HANDOFF.md` §3 OPS-01 warns "do not start a second instance", and the
  same pattern of "humans must run the verifier" failed the OQ-3 WorldGuard
  apply step until a year later).

### Risk grade

**MEDIUM.** Two test gaps (Socket.IO gating and the exempt-prefix list)
and one operational gap (the dashboard's `web/.env.local` is out of scope
but is the only thing the operator sees break). The shipping-the-config
half is LOW on its own; the half that touches `src/server/auth.ts:163-207`
is MEDIUM because the exempt list is hand-maintained.

---

## Brief 02 — IPC input validation, `botName` parent-side bind, global guards

> File: `docs/tasks/sec01/02-ipc-input-validation.md`
> Effort: **M**. Severity: High.

### Brief summary

Three changes: (a) `IPCChannel.handleMessage` validates the shape of every
incoming message before dispatching, (b) `WorkerHandle.setupIPC` binds the
worker's `botName` to `this.botName` so a worker cannot impersonate another
bot over IPC, and (c) `process.on('unhandledRejection')` /
`'uncaughtException')` are installed in both the main thread and the worker
so a stray promise no longer kills the process. This is the foundation for
briefs 4 and 5.

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `src/worker/IPCChannel.ts:132-150` | `handleMessage(msg)` switches on `msg.kind` with no shape check. A `null` or a `kind` it does not know falls through to `notifyHandler`/`commandHandler` with `undefined` arguments. The `port.on('message', ...)` subscription at `:57` invokes this as a floating promise — a thrown error inside the switch becomes an unhandled rejection. |
| `src/worker/IPCChannel.ts:152-160` | `handleRequest`'s "No request handler registered" reply path. Brief 02 must run *before* the switch (the brief's "Traps" explicitly warns against duplicating this logic). |
| `src/worker/WorkerHandle.ts:311-325` | `setupIPC`. The `ipc.onRequest` wrapper at `:313-318` reaches into `args[0]` (e.g. `affinityManager.get(args[0], args[1])` at `:363`). The `routeRequest` chain at `:327-404` is the dispatch table the brief is renaming. |
| `src/worker/WorkerHandle.ts:686-744` | `sendCommand` / `postConfigPatch` / `sendRequest`. The only call site that already catches an IPC failure is `postConfigPatch` (`:720-727`); the rest are unguarded. Brief 05 extends this pattern, brief 02 does not. |
| `src/worker/botWorker.ts:1` | `import 'dotenv/config';` — adjacent to brief 03. Installs the `unhandledRejection` handler *after* the imports (brief 02 §"Files to touch" — `botWorker.ts`). |
| `src/index.ts:443-444` | `process.on('SIGINT'\|'SIGTERM', shutdown)`. The two `process.on` lines the brief adds sit next to these. |
| `src/worker/ipcTypes.ts` (new) | The allowlist module. Export `IPC_REQUEST_TYPES` and `IPC_NOTIFY_TYPES` as `as const` arrays, and `isKnownIpcType(kind, type)`. **This is a security boundary** (brief's own warning). |

### Features that depend on the touched code path

- **Every LLM call from a worker.** `LLMClientProxy.chat` (`src/worker/proxies/LLMClientProxy.ts:11`)
  calls `this.ipc.request('llm.chat', [...])` — one of the entries the new
  allowlist must contain. The `args[0]` (system prompt) is the *entire
  exfiltration channel* in the residual risk model. A regression that
  rejects `'llm.chat'` breaks the whole Voyager loop.
- **Blackboard reads/writes** — `BlackboardProxy` (under `src/worker/proxies/`)
  hits `blackboard.setSwarmGoal`, `blackboard.setBotGoal`, `blackboard.claimBestTask`
  (5-arg form at `WorkerHandle.ts:349`). Brief 02 must keep all of these on
  the allowlist or the swarm path stops working.
- **Affinity and culture reads** — `WorkerHandle.ts:362-372`. Project Sid
  P3-B routes `culture.matchMeme` and `culture.getAdoptedMemes` here; an
  off-allowlist type silently turns the meme system into a no-op.
- **Inter-bot messaging (Project Sid P3 SHOULD-FIX #1)** —
  `WorkerHandle.ts:374-379` (`botComms.getUnread` / `getKnownBots`). The
  relay's correctness depends on these two being routable.
- **Voyager task state reads** — `botWorker.ts:395-405` handles
  `'voyagerTaskState'` from the parent side. It is a *request* type that
  flows parent→worker; the brief's allowlist must include it on the
  request side or the supply-chain coordinator's progress read goes
  silent.
- **`onTrace` / `onReputationEvent` / `onDeath` / `onImpersonation` /
  `onPlayerJoined` / `onPlayerLeft` callbacks** — the parent-side
  `routeNotification` chain at `WorkerHandle.ts:406-527`. The notify
  allowlist must enumerate all of these types. A missed type
  (e.g. `'security.impersonation'` at `WorkerHandle.ts:443-449`) means
  impersonation is silently dropped, which is the *exact* failure mode
  the impersonation monitor exists to prevent.
- **`decision.trace` (worker's `VoyagerLoop` writes one per loop tick)**
  — `WorkerHandle.ts:469-477`. High-volume: arrives every few seconds
  per bot. If the validator treats unknown types as warn-and-drop, fine;
  if it throws on unknown types, the channel dies after the first
  unrecognized trace.

### Likely regression modes

1. **A `null` IPC message kills the channel today.** `IPCChannel.handleMessage`
   (`:132`) is invoked as a floating promise at `:57` (no `await` /
   `.catch`). A worker that posts a malformed notification (e.g. a closed
   port on the parent side trying to send back) hits `notifyHandler?.(undefined, undefined)`
   and throws — which becomes an unhandled rejection, which (per the brief)
   currently terminates the process. The fix is two layers: validator +
   global guard. A regression that installs only the validator misses the
   second layer; one that installs only the global guard still throws
   from `handleMessage` and the `logger.warn` text wraps a "real" error.
2. **Over-strict validator rejects `args: any[]`.** The current
   `IPCRequest` type declares `args: any[]` (`:8`). If the validator
   requires `args` to be a plain object (e.g. an allowlist carried over
   from a JSON-schema mental model), every existing request — `llm.chat`
   with 4 args, `blackboard.claimBestTask` with 5, `botComms.sendMessage`
   with 4 — is rejected at the boundary. The LLM proxy stops responding;
   the worker times out at 60s and the IPC request/response machinery
   rejects it. Fleet goes quiet. **Catch with the new test that posts
   every real type at the validator.**
3. **botName binding forces the wrong name on cross-bot reads.** The
   brief's wrapper "force `args[0]` to be `this.botName` when the handler
   is one of the bot-scoped read paths" collides with two real callers
   that legitimately read *another* bot's state:
   - `blackboard.getRecentMessagesForBot(args[0], args[1])` at
     `WorkerHandle.ts:360` — args[0] is the target bot, not "self".
   - `affinity.getAllForBot(args[0])` at `WorkerHandle.ts:365` — same shape.
   - `botComms.getUnread(args[0])` at `WorkerHandle.ts:378` — the recipient
     being read, not the requester.
   A blanket botName rebind on these handlers will return the wrong
   bot's data and silently corrupt affinity scoring. **The brief flags
   this risk; the test must pin each "non-self" path separately.**
4. **`process.on('unhandledRejection', ...)` calls `process.exit` (regression
   by reflex).** A reviewer with "be defensive" muscle memory adds `process.exit(1)`
   inside the handler. That re-introduces the exact failure mode the brief
   exists to close. The brief's own definition-of-done forbids it; the
   test must assert the worker process *survives* a `Promise.reject`.

### Test coverage that catches the regression

- `test/worker/IPCChannel.validation.test.ts` (new) — sends `null`, an
  object without `kind`, `kind: 'request'` without `id`, `kind: 'bogus'`,
  and a well-formed message. Asserts the channel dispatches only the
  last. This is the regression-1 test.
- `test/worker/WorkerHandle.botNameBind.test.ts` (new) — the
  regression-3 test. Construct a stubbed `WorkerHandle` for `bot: 'alice'`,
  fire an IPC request with `args[0] === 'mallory'` against a handler
  whose contract is "self" (e.g. `blackboard.getSwarmGoal`), assert
  the parent saw `'alice'`. Repeat against a handler whose contract
  is "target" (e.g. `affinity.getAllForBot`), assert the parent saw
  `'mallory'`. A single test that does not distinguish the two
  contracts will pass while the bug is live.
- `test/worker/unhandledRejection.test.ts` (new) — the regression-4
  test. Spawn a fixture worker, post an unhandled
  `Promise.reject(new Error('x'))` via a side-channel, assert the worker
  is still alive on the next tick and the logger received the line.
  This is the highest-value test in the brief: without it, a
  well-meaning refactor of the handler is silently allowed to exit.
- `test/worker/WorkerGeneration.test.ts` (existing) — the model for
  fixture workers. Re-use its `vitest` style; do not start a real
  mineflayer.
- `test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts` (existing) — runs
  VoyagerLoop without an LLM. A regression that breaks the `llm.chat`
  path under the allowlist surfaces here as "no tasks execute", but
  the test does not pin the IPC layer directly.

### Risk grade

**HIGH.** Three different call paths each have a regression the others do
not catch. The validator + global guard + botName bind are coupled: a
fix that is correct in isolation but wrong in combination (e.g. validator
passes, botName rebind happens on a non-self handler) breaks the
*behaviour* of the system in ways no single test sees. The IPC
*protocol* tests (`IPCChannel.validation.test.ts`) do not catch the
botName-bind regression; the botName tests do not catch the validator
over-strictness; the unhandledRejection test does not catch either of
the other two. **Ship all three layers in the same PR, with all three
tests in the same PR.**

---

## Brief 03 — Delete `import 'dotenv/config'` from `botWorker.ts:1`

> File: `docs/tasks/sec01/03-remove-worker-dotenv.md`
> Effort: **S**. Severity: Medium.

### Brief summary

Single-line deletion plus a scoped `env` to the `Worker` constructor so the
worker stops re-reading `.env` on every spawn, which makes any parent-side
env-scrub theatre. The brief lands before #4 because #4's threat model
assumes the worker cannot read arbitrary env files.

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `src/worker/botWorker.ts:1` | `import 'dotenv/config';` — the *only* `import 'dotenv/...'` in `src/worker/` (verified by `grep` of `src/worker/`). At module load time, reads `process.cwd()/.env` and sets any vars not already in `process.env`. |
| `src/worker/WorkerHandle.ts:272-284` | `new Worker(workerPath, { workerData, resourceLimits })`. The brief changes this to also pass `env: { ...filtered }` so the worker's `process.env` is scoped, not inherited from the parent. **The default today is "inherit everything"** — i.e. the worker has every secret the parent has. |
| `src/config.ts:139-155` (referenced by brief) | The main thread's `loadConfig` reads `.env` via `dotenv`. **This one stays.** The brief explicitly says: do not remove `dotenv` from `package.json`, only the *worker's* import. |
| `src/worker/botWorker.ts:101-107` | `const config = loadConfig(data.configPath);` — the worker's own config load. The brief's step 1 audits every `process.env.*` read in this file; today the only one is `MC_WORKER_HEAP_MB` (read on the parent at `WorkerHandle.ts:50-53`, *not* on the worker). After the deletion, this line keeps working because `loadConfig` is the path. |

### Features that depend on the touched code path

- **LLM call routing** — `LLMClientProxy` imports only `IPCChannel` and
  the `LLMClient` interface (`src/worker/proxies/LLMClientProxy.ts`).
  It does *not* read `process.env` for an API key. The proxy design
  is correct, and the brief's claim "no module in the worker's import
  graph reads an API key" is accurate today. **This is why the
  deletion is safe on correctness grounds** — and also why a careless
  refactor that *adds* a `process.env.GOOGLE_API_KEY` read inside the
  worker would break the brief's threat model.
- **`MC_WORKER_HEAP_MB` heap cap** — read on the parent at
  `WorkerHandle.ts:50-53`, applied to `resourceLimits` at `:281-283`.
  Not affected by the brief. **However**, if a future PR moves this
  read into the worker (a natural-looking refactor), the worker will
  read it from its scoped `env`, not from the parent's, and the value
  must be on the brief's allowlist. The test in brief must enumerate
  this.
- **All non-`process.env` config reads in the worker** — `loadConfig()`
  reads YAML files; the worker re-reads the same `config.yml` the
  parent loaded. The brief's "verify worker does *not* read `.env`"
  test must place a stub `.env` in the CWD and assert no LLM key
  arrived from it.
- **The dotenv module itself** — used in `src/config.ts` (transitively
  via `src/index.ts:1`) and `scripts/*` (verified by `grep` of `src/`).
  The brief explicitly says "do not delete `dotenv` from
  `package.json`" — only the worker's import is removed. The
  `dotenvAbsent.test.ts` test must pin the absence of `import 'dotenv/...'`
  in `src/worker/`, not across the whole tree.

### Likely regression modes

1. **Worker fails to start with `Cannot find module 'dotenv'`.** A
   refactor that moves `dotenv` to `devDependencies` (a tempting cleanup
   once only the main process uses it) breaks the worker's `import`.
   Today's `package.json` keeps it in `dependencies` (verified). The
   brief's definition-of-done flags this; a regression here is silent
   because the failure happens in the worker, not the main process —
   the parent sees a worker crash with no `import` error visible to
   the operator.
2. **Worker loses a config value the parent was passing via `process.env`.**
   The `new Worker(path, { env: ...filtered })` shape replaces the
   inherited env. If the parent relied on a `process.env` value the
   brief did not enumerate — e.g. `NODE_ENV`, `TZ`, a custom logger
   prefix — the worker has it undefined. The brief's
   `botWorkerEnv.test.ts` test asserts `DASHBOARD_AUTH_SECRET` is
   *not* present; it should also assert that any value the worker
   *does* need is present. The PR description must list the allowlist;
   the test must pin the list.
3. **`loadConfig()` fallback to `.env` breaks in the worker.** Today
   `loadConfig` reads `process.env` for some values (the brief notes
   `src/config.ts:139-155`). The worker calls `loadConfig` at
   `botWorker.ts:107`. If `loadConfig` falls back to reading `.env`
   when a value is missing in `process.env`, and the worker's `env`
   no longer has that value, the worker silently reads the *worker's*
   `.env` view (which it just stopped re-injecting). **Result: the
   worker has a different config than the parent, and the divergence
   is invisible.** Catch by snapshotting config in the parent and
   forwarding it via `workerData` (the brief's step 1 plan
   recommends this but does not require it).
4. **A test-only `.env` fixture pollutes the parent.** The brief's
   test places a `.env` in the fixture's CWD. The fixture worker is
   launched with `cwd` set to the test directory, so the worker's
   `process.cwd()` matches. The parent's `.env` is unaffected
   *only* if the parent's process is not in the same CWD. In
   `vitest` the parent runs in the repo root; the fixture is a
   sub-directory; the parent will not load the fixture's `.env` —
   but the worker is launched with the fixture's CWD. **This works
   today, but a test refactor that launches from the repo root
   would re-inject the *parent's* `.env` and the test would pass
   while the bug lives.** Document the cwd.

### Test coverage that catches the regression

- `test/worker/botWorkerEnv.test.ts` (new) — the brief's primary
  test. Spawn a fixture worker with `env: { GOOGLE_API_KEY: 'from-parent' }`,
  assert the worker's `process.env.GOOGLE_API_KEY === 'from-parent'`
  (not from disk). Place a stub `.env` with `GOOGLE_API_KEY=from-disk`
  in the fixture's CWD; assert the worker still sees `from-parent`.
  This is the regression-1+2 test.
- `test/worker/dotenvAbsent.test.ts` (new) — a one-liner `grep` of
  `src/worker/` for `from 'dotenv`. Fails the build on any match.
  This is the regression-1 (worker import) test in regression-1 form.
- `test/worker/WorkerGeneration.test.ts` (existing) — runs workers
  with the current env. A regression that breaks the spawn path
  (e.g. an env-mismatch that crashes the worker) makes every test
  in this file fail. **However**, the test does not pin the env
  contents, so a silent env divergence (regression-3) slips past.

### Risk grade

**LOW.** The deletion is one line; the env scoping is mechanical; the
proxy design means the worker has no other env dependency. The two
risks are operational (regression-1's `package.json` refactor and
regression-2's incomplete allowlist), and both have a one-line test.
The MEDIUM-rated surface is `loadConfig`'s implicit `.env` fallback
(regression-3), but the brief's plan addresses it and the test
surfaces it.

---

## Brief 04 — `SkillLibrary.save()` over IPC, `skills/` mounted read-only

> File: `docs/tasks/sec01/04-skilllibrary-save-via-ipc.md`
> Effort: **M**. Severity: High. Depends on: brief 05 (IPCTransport
> Phase A).

### Brief summary

Workers stop writing to `skills/` directly. Skill saves go through a
new `'skillLibrary.save'` IPC request, the parent validates and writes,
and `skills/` is `chmod 0555` after each save as belt-and-braces. The
fix is also a correctness fix: today's five-worker concurrent writes
to `index.json` lose entries (per `atomicWrite.ts:8-22`'s own header
comment and the `worker-process-isolation.md` §6 item 4 analysis).

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `src/voyager/SkillLibrary.ts:280-330` | `async save(name, description, keywords, code, _quality)`. Calls `atomicWriteTextSync(filePath, code)` at `:305` and `saveIndex()` at `:326` (which calls `atomicWriteJsonSync(this.indexPath, merged)` at `:535`). Runs wherever the calling code runs. |
| `src/voyager/SkillLibrary.ts:519-536` | `saveIndex()`. The read-modify-write the worker-process-isolation doc explicitly identifies as the lost-update site — re-reads on-disk `index.json` to keep `deprecated` rows, concatenates with the in-memory index, rewrites. **Five workers doing this concurrently race on the whole-file rewrite**, which is the source of the 454-of-936 orphan count. |
| `src/voyager/SkillLibrary.ts:113-142` | `constructor`. Creates `skillsDir` if missing, loads the index, kicks off `refreshMissingEmbeddings()`. The brief's `proxySave(plan)` lives here or in a sibling file; the brief's plan is `planSave()` runs *in the parent*, the worker has only the proxy. |
| `src/voyager/SkillLibrary.ts:265-279` | The docstring above `save()` — explains the versioned-name ratchet the existing test (`skillSaveRatchet.test.ts`) pins. **The refactor must preserve the ratchet**; the brief calls this out. |
| `src/worker/botWorker.ts` (caller) | Builds a `BotInstance` whose `VoyagerLoop` (in the worker) calls `this.skillLibrary.save(...)` at `src/voyager/VoyagerLoop.ts:1908`. Today this hits the file system from the worker thread. After the brief, the worker thread has *no* SkillLibrary that can write; it has only a proxy. |
| `src/worker/WorkerHandle.ts` (handler) | New request type `'skillLibrary.save'`. Brief 02's allowlist must add it. The handler runs the parent's `applySave(plan)`. |
| `src/worker/ipcTypes.ts` (new in brief 02) | The allowlist entry `'skillLibrary.save'` with the plan shape. |
| `src/util/atomicWrite.ts:80-93` | `atomicWriteTextSync`. Used at `SkillLibrary.ts:305`. **Also used by 30+ other files** (verified by grep). The refactor only moves the *SkillLibrary* call site; the rest are unchanged. |

### Features that depend on the touched code path

- **`VoyagerLoop` skill persistence** — `src/voyager/VoyagerLoop.ts:1908`
  is the only call site to `save()` today. This is the *learned-skill*
  feature: a bot solves a task, a skill is generated, the skill is
  written to `skills/<name>.js`, the next bot that needs the same
  knowledge calls `search()` / `getBestMatch()` and finds it. **A
  regression that breaks save() means learning stops, but the bot
  also stops crashing — silent failure mode, hardest to catch.**
- **Skill search** — `searchWithScores` (`:157-242`), `getBestMatch`
  (`:447-458`), `getComposableMatches` (`:460-474`), `getTopKSkillCode`
  (`:431-445`). All read `this.index` and `getCode(name)`. None of
  them write. They survive the refactor unchanged *if* `index.json`
  stays consistent across workers. **The race is on the index, not
  the code files**, and the brief's fix makes the parent the single
  writer — which is the whole point.
- **Skill `getAllSkillCode()`** — `:409-428`. Reads all files, returns
  concatenated source. Used by `CodeExecutor` (the `node:vm` context
  the worker-process-isolation doc identifies as the escape site).
  Reads only; unaffected.
- **`/api/skills` routes** — the brief is silent on whether the API
  surface moves. Today `src/server/routes/skillRoutes.ts` reads via
  `SkillLibrary` (in the main process). After the brief, the main
  process still has its own `SkillLibrary` for the read path; the
  write path moves through IPC. **The API surface is unchanged**;
  the worker no longer has write access at all.
- **`tools/consolidate-explore-skills.js`** — referenced in the
  `SkillEntry.deprecated` docstring at `:21`. An offline script;
  reads the same `skills/` directory. Survives the refactor because
  it runs in the main process (not a worker). **However**, the
  `chmod 0555` mitigation in the brief blocks this script's writes
  (if it has any) — the brief should call out that
  `consolidate-explore-skills.js` either runs as the bot-host user
  with write, or the script is moved to a "review then apply"
  pattern that goes through the same IPC.

### Likely regression modes

1. **The versioned-name ratchet breaks.** The existing
   `test/voyager/skillSaveRatchet.test.ts:23-37` pins the contract:
   `save()` returns the *actual* stored name (so `recordOutcome`
   credits the right entry). The brief's `planSave()` /
   `applySave()` split must keep this contract. A refactor that
   returns `name` (the request parameter) instead of `finalName`
   (the versioned name the parent actually used) silently re-runs
   the ratchet the test exists to prevent. **Catch by re-running
   the existing test against the refactor** — the brief's
   definition-of-done already requires this.
2. **The parent-side `applySave()` writes one without the other.**
   `save()` is two writes: `atomicWriteTextSync` for the `.js`
   and `atomicWriteJsonSync` for the index (`SkillLibrary.ts:305` +
   `:326` → `:535`). The brief explicitly says: do not skip the
   index update. A refactor that does only the first write (e.g. a
   "fast path" that returns the canonical path before the index
   merge) creates a `.js` file that no index entry references —
   a new orphan. **Catch with a new test that asserts the index
   contains the new entry after every successful save.**
3. **A malicious worker bypasses the proxy and writes directly.**
   The brief's threat model is "an escaped skill writes to `skills/`."
   The refactor does not remove `fs` from the worker's import graph
   — it removes the *call sites* in `SkillLibrary` and the
   `VoyagerLoop.save` path. A worker that re-imports `fs` and
   `atomicWriteTextSync` directly still has write access (the
   `chmod 0555` is the only OS-level control, and the brief flags
   that it is "belt-and-braces"). **The `chmod 0555` mitigation
   must be the actual defence in depth** — the test must
   actually run the verifier and assert the dir is read-only.
4. **Concurrent proxySave from the same bot double-writes.** Two
   VoyagerLoop ticks landing on the same bot within the 60s IPC
   round-trip each fire `proxySave(plan)`. The parent serialises
   them on the request handler, but the index merge at
   `saveIndex()` (`:519-536`) is *itself* the race today; the
   refactor makes the parent the single writer, but a future
   caller that *also* writes the index from the parent (e.g. a
   migration tool, the `/api/admin/info` rebuild) re-introduces
   it. **The brief does not enumerate the parent's other writers
   to the index.** Catch by grep — `grep -RE
   "atomicWriteJsonSync.*indexPath|indexPath.*atomicWriteJsonSync"
   src/` must return exactly one site.

### Test coverage that catches the regression

- `test/voyager/skillSaveRatchet.test.ts` (existing, lines 17-37) —
  pins the versioned-name contract. **This test must pass against
  the refactor without modification.** If the refactor changes the
  contract, the test fails — that is the regression-1 catch.
- `test/voyager/SkillLibrary.proxyOnly.test.ts` (new) — the brief's
  primary test. Asserts a worker-side `SkillLibrary` does *not*
  touch the filesystem on save. Use a tmpdir + `fs.watch`, or stub
  `atomicWriteTextSync` and assert the stub was never called from
  the worker.
- `test/worker/WorkerHandle.skillSave.test.ts` (new) — sends a
  too-large plan, a too-many-keywords plan, and a valid plan.
  Asserts the parent rejects the first two and accepts the third.
  This is the regression-2 catch.
- `test/scripts/verify_skills_readonly.test.ts` (new) — runs the
  bash verifier in a fixture where `skills/` is `chmod 0555`,
  asserts exit 0; runs it where `skills/` is `chmod 0755`,
  asserts non-zero. This is the regression-3 catch.
- `test/util/atomicWriteConcurrency.test.ts` (existing) — pins the
  *atomic* property of `atomicWriteTextSync` (each write is
  self-consistent). Does NOT pin the *race* property the refactor
  addresses. A separate `saveIndexRace.test.ts` is not in the
  brief but would be the regression-4 catch.

### Risk grade

**MEDIUM.** The refactor is large (one file, one constructor, one
public method, plus a new IPC handler), and the existing test is
narrow (only the versioned-name contract). The lost-update race
itself is the strongest argument for the refactor — and is *not*
caught by any existing test, which means a regression-4-style
"two writers, one race" surfaces only in production. The
single-writer property of the post-refactor architecture is what
*removes* the regression-4 surface, but a test that pins "parent
is the only writer" is missing from the brief's test list.

---

## Brief 05 — `IPCTransport` interface + try/catch on every send (Phase A)

> File: `docs/tasks/sec01/05-ipc-transport-phase-a.md`
> Effort: **M**. Severity: Medium.

### Brief summary

Add an `IPCTransport` interface (`send` / `onMessage` / `close`), implement
`MessagePortTransport` and `ThreadWorkerTransport` over the existing
`MessagePort` and `Worker`, route every existing `port.postMessage` through
the transport, and catch the failure with a structured `TransportError`.
**Phase A is the seam, not the swap** — the wire format and the
`IPCRequest`/`IPCResponse`/`IPCNotification`/`IPCCommand` shapes are
unchanged. The transport is what brief 04 (and the eventual worker-
isolation migration) depend on.

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `src/worker/IPCChannel.ts:69-94` | The three `port.postMessage` call sites: `request` (`:80`), `notify` (`:87`), `command` (`:93`). All unguarded; a closed `MessagePort` throws `ERR_MESSAGE_PORT_CLOSED` or `DataCloneError` synchronously. |
| `src/worker/IPCChannel.ts:48-58` | The `port: MessagePort \| Worker` field and the constructor's `port.on('message', ...)` subscription. The brief moves the subscription into `MessagePortTransport.onMessage`; the channel receives a callback. |
| `src/worker/WorkerHandle.ts:711-728` | `postConfigPatch` — the *only* existing call site that already catches an IPC failure. Inline `try/catch` with a per-site log message. The brief says "extend the pattern, do not duplicate it" — but the test in the brief duplicates it (the existing pattern is buried; the brief's test asserts a *logged* failure, which the current code logs at `debug` level, not `warn`). |
| `src/worker/WorkerHandle.ts:739-744` | `sendRequest(type, args)` — awaits `this.ipc.request(type, args)`. **Gated on `state === 'RUNNING'`** (`:740`), so a `request()` to a dead worker throws *before* hitting the transport. The transport change here is mostly cosmetic for this path — it is the `notify`/`command` paths that gain the most. |
| `src/worker/WorkerHandle.ts:686-688` | `sendCommand(type, data)` — `this.ipc?.command(type, data)`. Fire-and-forget. Today a closed port throws and the caller has no hook. |
| `src/worker/proxies/*` (12 files) | Every proxy holds an `IPCChannel` and calls `.request()` / `.notify()` on it. None of them currently catch — the proxy's caller (VoyagerLoop, BotInstance) is the layer that sees a thrown rejection. After the brief, `.send().catch()` lives inside `IPCChannel`, so the proxies are unchanged but the channel rejects async instead of throwing sync. **Callers that `await` an `ipc.request()` already handle the rejection via the `Promise` chain; callers of `notify`/`command` did not (they are fire-and-forget).** |
| `src/worker/IPCTransport.ts` (new) | The interface and two implementations. `TransportError` with `code: 'CLOSED' \| 'CLONE' \| 'UNKNOWN'`. |

### Features that depend on the touched code path

- **All LLM/Blackboard/Affinity/Culture/Conversation/SharedWorld/PlayerIntent
  proxy traffic** — 12 proxy files under `src/worker/proxies/`. Each
  calls `.request()` or `.notify()`. All routed through the new
  transport.
- **`status.update` heartbeat** — `botWorker.ts:478-496` posts a
  notification every 2s (`:478`). High-volume. A bug that turns
  `notify` into a log-spam on a closed port would dominate the log
  budget. The transport's `.catch()` swallows with a `logger.warn`
  per the brief — at 30 logs/min/bot × 5 bots = 150 lines/min, that
  is a measurable delta. **A test that asserts the log volume on a
  closed port is bounded catches this.**
- **`config:patch` command** — the existing catch at
  `WorkerHandle.ts:720-727`. Survives the refactor; the brief
  extends it. **The test must not regress this path's behaviour:**
  today's behaviour is a `logger.warn` with the error message; the
  brief's behaviour is a `logger.warn` with the same message.
  Anything that turns this into a `throw` breaks the `/api/config/...`
  PATCH path silently (the route is fire-and-forget, so a throw
  becomes a 500 on the API).
- **`walkTo` / `follow` / `returnToBase` / `unstuck`** — these are
  *command* types (not notify, not request) at
  `botWorker.ts:277-371`. A `command` that throws on a closed port
  is currently a hung HTTP request from `/api/bots/<name>/walkto`
  (the route returns 200 only after the worker acks). The
  transport's `.catch()` is the only thing that prevents the HTTP
  layer from waiting 60s on a dead worker. **The brief's Phase A
  is what fixes the silent 60s hangs in the API.**
- **`onImpersonation` callback** — `botWorker.ts:170-172` posts
  `'security.impersonation'`. A throw on this path goes
  unobserved by the parent (the worker's caller is the bare
  `BotInstance` constructor; the throw happens inside the IPC
  notify wrapper). The transport's `.catch()` is what surfaces
  this as a log line.

### Likely regression modes

1. **`request()`'s pending entry leaks on a closed port.** Today
   `request()` sets `this.pending.set(id, ...)` *before* the
   `postMessage` (`:79-80`). If `postMessage` throws synchronously,
   the entry is never cleaned up — the 60s timer fires and the
   caller sees a timeout. The brief's `.catch()` removes the
   pending entry (per the brief's example at §Approach step 3).
   A refactor that handles the error *after* the `set()` but
   forgets to `this.pending.delete(id)` leaks entries until the
   timer fires, which is the same wall-clock as today's timeout
   but for a different reason. **The new test must assert
   `pending` is empty after a closed-port send.**
2. **`notify()` swallows a real error with a `debug` log.** The
   brief says: "the catch path is a `logger.warn` with the
   message's `type`." A reviewer with a "less noise" reflex
   changes it to `debug`. The failure becomes invisible, and the
   brief's "make the failure visible" goal is reversed. **The
   test must assert the log level is `warn`, not `debug` and not
   `error`.** (The existing test in the brief is named
   `IPCChannel.sendErrors.test.ts`; it must pin the level.)
3. **`MessagePortTransport` blocks on a non-cloneable value and
   freezes the worker.** A naïve implementation catches the
   error from `postMessage`, but if the `port.on('message', ...)`
   subscription is on the same channel that just threw, the
   subscription can be left in an inconsistent state. The
   `port.start()` call (or lack thereof) matters. **A test that
   sends a function and asserts the channel still receives the
   next well-formed message catches this.**
4. **`ThreadWorkerTransport` is mis-wired to the worker's
   `parentPort` instead of the `Worker` reference.** The parent
   side has a `Worker` reference (`WorkerHandle.ts:285`); the
   worker side has `parentPort` (`botWorker.ts:108`). The brief
   says `WorkerHandle` uses `ThreadWorkerTransport`; the worker
   side uses `MessagePortTransport`. A refactor that constructs
   `MessagePortTransport` on the parent side compiles fine
   (both `MessagePort` and `Worker` are accepted by
   `port.on('message', ...)`) but messages sent via
   `parentPort.postMessage(...)` on the worker side never reach
   the parent's transport. **A round-trip test in the new
   `IPCTransport.test.ts` is the only thing that catches this.**

### Test coverage that catches the regression

- `test/worker/IPCTransport.test.ts` (new) — the brief's primary
  test. Three assertions: (a) well-formed message round-trips,
  (b) closed port → `TransportError('CLOSED')` (not throw),
  (c) non-cloneable value → `TransportError('CLONE')` (not
  throw). This catches regressions 1, 3, and 4.
- `test/worker/IPCChannel.sendErrors.test.ts` (new) — the brief's
  second test. Constructs a channel with a stubbed transport that
  always rejects, calls `request()` / `notify()` / `command()`,
  asserts: `request()` rejects and the pending map is empty;
  `notify()` and `command()` log a `warn` (not `debug`, not
  `error`) and do not throw. Catches regressions 1 and 2.
- `test/worker/WorkerHandle.postConfigPatch.test.ts` (extend
  existing or new) — the brief's third test. Stubs the transport
  to reject, calls `postConfigPatch('voyager', {...})`, asserts
  the call returns normally and a `warn` is logged. Catches a
  regression that turns the existing `try/catch` into a `throw`.
- `test/worker/WorkerGeneration.test.ts` (existing) — runs
  workers end-to-end. A regression in the transport wiring
  (regression 4) makes the `status.update` heartbeat stop
  arriving, and the test's heartbeat-based assertions fail.
  However, the test does not assert the cause, so a regression
  here surfaces as "test failed in some heartbeat" — still
  better than nothing.
- `test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts` (existing) —
  runs VoyagerLoop without an LLM, exercises the IPC path
  indirectly. A regression that breaks `LLMClientProxy.chat`
  (e.g. the transport rejects the request) surfaces here.
  The test is LLM-off, so a transport bug that affects only
  non-LLM paths is not caught.

### Risk grade

**MEDIUM.** The interface is small; the two implementations are
short; the wire format is unchanged. The two real risks are (a) the
pending-entry leak (regression 1) and (b) the worker-side transport
mis-wiring (regression 4). Both have a test in the brief, but the
tests are new and not yet exercised against the production
worker — meaning a regression that breaks only the production
code path (e.g. `serialization: 'json'` vs `'advanced'` on the
worker) slips past the unit tests. **A smoke test that spawns one
real worker and asserts a status.update arrives catches this.**

---

## Brief 06 — `IPAddressDeny=any` + two-entry allowlist on the bot host

> File: `docs/tasks/sec01/06-ip-address-deny.md`
> Effort: **S**. Severity: Medium-High.

### Brief summary

Host-side only. Drop two files
(`/etc/systemd/system/mc-fleet-bot.service.d/10-ip-allowlist.conf`
and the same for `mc-fleet-web.service`) that add `IPAddressDeny=any`
plus two `IPAddressAllow=` entries. **No `src/` change.** Verify
with `scripts/verify_ip_allowlist.sh`.

### Files touched

| File | What it currently does in the area being modified |
|---|---|
| `/etc/systemd/system/mc-fleet-bot.service.d/10-ip-allowlist.conf` (new, host) | The drop-in. Brief lives entirely on disk. |
| `/etc/systemd/system/mc-fleet-web.service.d/10-ip-allowlist.conf` (new, host) | Same shape for the dashboard unit. |
| `scripts/verify_ip_allowlist.sh` (new, repo) | Bash verifier. Reads `systemctl show` output (read-only, no root) and asserts the rules are in effect. |
| `docs/ops/host-security.md` (new, repo) | Documentation for the operator. Documents the dynamic-IP caveat. |
| `src/server/api.ts:371-373` (read-only context) | `httpServer.listen(config.api.port, config.api.host, ...)`. The bind that brief 01 hardens; the IP allowlist is the kernel-level layer on top. **No change to this line**; the brief relies on the systemd unit's effective config. |

### Features that depend on the touched code path

- **Every inbound TCP connection to ports 3000 and 3001** — the
  allowlist is the *only* thing that controls which TCP source
  addresses reach the API and the dashboard. Brief 01 (auth secret)
  is the *next* layer; this brief is the *first*.
- **The Minecraft connection outbound from the bot to the MC server**
  (`10.80.13.14:25565`) — the IP allowlist is **inbound-only**
  (the brief's own Traps section confirms this). The brief's
  effectiveness on the outbound is zero; the doc note in HANDOFF §1
  is the operator's only signal that the bot still talks to the
  server.
- **The system itself** — `systemctl daemon-reload &&
  systemctl restart` is the *only* documented way to apply the
  change. Per `AGENTS.md` and HANDOFF §3 OPS-01, a clean exit does
  not respawn; the brief calls this out as a trap.
- **`POST /api/admin/restart`** — would be the wrong tool (HANDOFF
  warns it exits 0 and the fleet goes down). The brief does not
  call this out; an operator who reads the API first hits the trap.

### Likely regression modes

1. **Operator locks themselves out.** The brief's Traps section
   flags this, but the verification is a manual step. If the
   operator's IP is wrong in the drop-in, `sudo systemctl restart`
   succeeds, the API binds, and the operator's next `curl` from
   their workstation returns "connection refused" at the *kernel*
   level. The session is still alive (SSH is on a different port,
   not the gated one), so the operator can `systemctl edit` to
   fix. **The verifier must show "deny rule is in effect" but
   ALSO "your IP is in the allowlist"** — the brief's script
   does both, but a refactor that drops the "your IP" check
   misses this.
2. **`IPAddressDeny=any` does not exempt loopback by default.** The
   brief flags this in Traps. If the dashboard on the same host
   needs to reach the API over loopback, `IPAddressAllow=localhost`
   (or `127.0.0.0/8`) must be in the drop-in. **A test fixture
   that runs the verifier against a config that omits the
   loopback entry must fail**, but the brief's test does not
   exercise the loopback case.
3. **systemd version too old.** The brief's Traps section notes
   `IPAddressDeny`/`IPAddressAllow` are systemd 240+. The bot
   host's systemd version is not in the brief; if it is older,
   the verifier passes (the property name is accepted by
   `systemctl show` even on a no-op) but the rule does not
   actually fire. **A test that asserts the kernel's cgroup
   net_cls / nftables state shows the deny rule is the only
   catch.** The brief does not do this; a refactor that adds
   it requires root, which the verifier says it does not need.
4. **The dashboard is on a separate host and the operator forgets
   to add it.** The brief's two-entry allowlist is operator + dashboard
   container; a future operator who splits the dashboard off the
   bot host but does not update the drop-in loses dashboard access.
   The doc is the only enforcement.

### Test coverage that catches the regression

- `test/scripts/verify_ip_allowlist.test.ts` (new) — runs the bash
  script against a mock `systemctl show` fixture. Asserts exit 0
  when the property is present, the operator's IP is in the
  allowlist, and a `curl` succeeds. Asserts non-zero when any of
  the three is missing. This is the regression-1+2 catch.
- **No automated test exists that proves the kernel-level deny
  fires** (regression 3). A real test would need a `nft` /
  `iptables` snapshot before/after the change; the brief's
  verifier does not do this. The risk is small (the bot host
  has systemd 255+ — verified out-of-band 2026-07-25) but
  not zero.
- `scripts/verify_ip_allowlist.sh` (new) — the live verifier.
  Exit codes are the contract; no unit test for the script
  itself unless `test/scripts/verify_ip_allowlist.test.ts` is
  written.

### Risk grade

**LOW.** The brief is host-side; the only `src/` change is
documentation. The two real risks are operational (lockout,
dynamic IP) and both have a verifier. The medium-high severity
in the brief itself is the *exposure* (every port on the host
is now gated), not the implementation risk. **Ship it.**

---

## Cross-cutting observations

A few patterns show up across multiple briefs. Calling them out so
the reviewer does not have to rediscover them.

1. **The IPC allowlist (brief 02) is the bottleneck.** Briefs 04 and
   05 both add to it. A new IPC type is a security boundary (brief
   02's own warning). A single PR that touches all three briefs
   keeps the allowlist and the tests in the same review; splitting
   them is an opportunity for drift.
2. **`process.exit(0)` is the trap that already exists in
   `botWorker.ts:179`.** The `disconnect` command does
   `instance.disconnect().then(() => process.exit(0))`. Per
   `AGENTS.md` and `worker-process-isolation.md` §5b item 2, a
   clean exit is ignored by `Restart=on-failure`. Brief 02's
   `unhandledRejection` handler is no exit — but the existing
   `disconnect` path *is* an exit, and the brief does not change
   it. **A future PR that aligns `disconnect` with the
   `unhandledRejection` semantics (return cleanly, let the parent
   observe) is in scope for brief 02; today it is not.**
3. **`atomicWriteTextSync` is used by 33 files.** Brief 04's
   refactor only moves the `SkillLibrary` call site. The other 32
   are unchanged. If the brief's threat model extends (e.g. brief
   06's IP allowlist proves insufficient), the next candidates
   are `data/social_memory.json`, `data/plan_templates.json`, and
   `data/qa_cache.json` — all of which are written by worker
   threads (per `worker-process-isolation.md` §7 item 4). **The
   brief is correct to limit its scope; the scope expansion is
   the next round, not this one.**
4. **The handoff's `Restart=on-failure` trap applies to all six
   briefs.** Brief 06's restart is the only one that explicitly
   calls it out. Brief 01 does the same. Briefs 02-05 do not
   require a fleet restart (they are code-level changes), but a
   future hot-reload of the `IPCTransport` interface (Phase B of
   brief 05) will need the same care. The pattern is consistent
   enough to record here.
5. **No brief is genuinely independent.** Briefs 02 → 04 → 05 have
   a dependency chain (allowlist → IPC contract → transport).
   Briefs 01 and 06 are independent of each other and of the 02-05
   chain. The natural ship order is: 01, 06, 03, 02, 05, 04 — the
   first two are host-side and reduce more risk than any code
   change (per `HANDOFF.md` §3 SEC-01's own ordering).

## What this document does not cover

- **Worker process isolation itself** (the design that is "blocked
  on the polkit decision" per `HANDOFF.md` §3 SEC-01). The
  `docs/research/worker-process-isolation.md` design record is
  that work; this doc is the regression surface for the *six
  things that ship regardless*.
- **SEC-02** (`GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` rotation,
  `HANDOFF.md` §3). Adjacent to brief 03 (where the keys are read
  from), but a separate work item. The brief explicitly defers
  it.
- **OPS-01** (the deploy of 2026-08-07 changes, `HANDOFF.md` §3).
  Not in scope for SEC-01.

---

## Quick reference

| Brief | File | Severity | Effort | Risk grade |
|---|---|---|---|---|
| 01 | `01-dashboard-auth-secret.md` | High | S | **MEDIUM** |
| 02 | `02-ipc-input-validation.md` | High | M | **HIGH** |
| 03 | `03-remove-worker-dotenv.md` | Medium | S | **LOW** |
| 04 | `04-skilllibrary-save-via-ipc.md` | High | M | **MEDIUM** |
| 05 | `05-ipc-transport-phase-a.md` | Medium | M | **MEDIUM** |
| 06 | `06-ip-address-deny.md` | Medium-High | S | **LOW** |

Recommended ship order, based on the regression surface above:
**01 → 06 → 03 → 02 → 05 → 04.** The first two reduce more risk
than the rest, and they are the only host-side work. Briefs 02, 05,
and 04 must land together (or in sequence with no gap) because the
allowlist, the transport, and the parent-side writer are coupled.
