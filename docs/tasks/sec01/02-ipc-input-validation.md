# Brief 2/6 — IPC input validation, `botName` parent-side bind, and a global `unhandledRejection` guard

> Source: `HANDOFF.md` §3 SEC-01, item 2.
> Severity: **High**. One malformed IPC message from any worker crashes the
> whole fleet. There is currently no `unhandledRejection` handler anywhere in
> `src/`.
> Effort: **M**.
> Depends on: none (this brief is the foundation for #5 IPC transport hardening).

## Goal

A malformed `IPCMessage` arriving from any worker must be rejected at the
channel boundary without invoking a handler. The `botName` a worker sends in
any IPC payload must be bound to the worker thread that sent it, so a
misbehaving worker cannot impersonate another bot. A single global
`unhandledRejection` + `uncaughtException` guard must be installed in both
the main thread and every worker, so an escaped promise no longer kills the
process.

## Background

- `src/worker/IPCChannel.ts:132-150` — `handleMessage` switches on `msg.kind`
  with no shape check. A `null`, a non-object, or a `kind` it does not know
  falls through to a `notifyHandler`/`commandHandler` invocation with
  `undefined` arguments.
- `src/worker/WorkerHandle.ts:313-404` — the parent-side `ipc.onRequest`
  dispatches by `type` string. Many handlers reach into `args[0]` directly
  (e.g. `affinityManager.get(args[0], args[1])`); an array of length 0 or
  a non-string `args[0]` propagates the corruption.
- `src/worker/botWorker.ts:1` — `import 'dotenv/config'` (see brief #3 for
  the env leak). The worker is a long-lived thread, so any unhandled
  rejection in *any* promise in *any* bot is unhandled at the process level.
- Confirmed: `grep -RE 'unhandledRejection|uncaughtException' src/` returns
  no matches outside the `process.on('SIGINT'|'SIGTERM')` shutdown hooks in
  `src/index.ts:443-444`.

## Files to touch

- `src/worker/IPCChannel.ts`
  - Add a `validateMessage(msg: unknown): msg is IPCMessage` function
    (exported) at the top of the file. Reject: non-objects, missing `kind`,
    `kind` not in `{'request','response','notify','command'}`, missing
    `id` for request/response, missing `type` for any of the four.
  - Call it at the top of `handleMessage` and `port.on('message', ...)` in
    the constructor. On rejection, `logger.warn({ port, msgPreview }, 'IPC
    message rejected: invalid shape')` and return without dispatching.
  - Also wrap the `notifyHandler`/`commandHandler` invocations in
    `try/catch` so a throwing handler cannot tear down the channel.
- `src/worker/WorkerHandle.ts`
  - In `setupIPC(worker, ipc, generation)`, before `ipc.onRequest`, capture
    the expected `botName` from `this.botName`. Wrap every request handler
    so any `args[i]` that is a string `=== '<expected botName>'` is replaced
    with `this.botName` (defence-in-depth — workers should not be sending
    other names; the parent should never trust what they send).
  - Reject any IPC request whose `type` is not in an allowlist
    (`src/worker/ipcTypes.ts`, new file — see Approach).
  - Add a per-worker crash counter increment + a single log line on
    "too many rejections" so a misbehaving worker is visible.
- `src/worker/botWorker.ts`
  - At the top of the file, after the imports but before any module-level
    work, install:
    ```ts
    process.on('unhandledRejection', (reason) => {
      logger.error({ bot: (workerData as WorkerData)?.botName, reason }, 'unhandledRejection in worker');
    });
    process.on('uncaughtException', (err) => {
      logger.fatal({ bot: (workerData as WorkerData)?.botName, err: err.message, stack: err.stack }, 'uncaughtException in worker');
    });
    ```
- `src/index.ts`
  - Same two `process.on` calls, near the existing `SIGINT`/`SIGTERM`
    handlers at `src/index.ts:443-444`. These guard the *main* thread;
    the worker guards are independent.

## Approach

1. **Define the allowlist.** Create `src/worker/ipcTypes.ts` with two
   `as const` arrays: `IPC_REQUEST_TYPES` (e.g. `'llm.chat'`, `'blackboard.*'`,
   `'affinity.*'`, `'culture.*'`, `'botComms.*'`, `'conversation.*'`,
   `'difficulty.*'`, `'playerIntent.*'`) and `IPC_NOTIFY_TYPES`
   (`'status.update'`, `'swarm.directive'`, `'reputation.recordEvent'`,
   `'bot.died'`, `'impersonation.detected'`, `'player.joined'`,
   `'player.left'`). Export a `isKnownIpcType(kind, type): boolean` helper.
   `src/worker/WorkerHandle.ts` and `src/worker/botWorker.ts` import it.
2. **Validate at the boundary.** In `IPCChannel.handleMessage`, the
   validator runs *before* the `switch`. The fix to a `notifyHandler` /
   `commandHandler` throwing is independent: wrap those callbacks in
   `try/catch` and log on the catch path. Do not swallow — re-throw into a
   per-port logger so the channel stays alive.
3. **Bind `botName` parent-side.** The fix is a wrapper, not a rewrite.
   In `WorkerHandle.setupIPC`:
   ```ts
   ipc.onRequest(async (type, args) => {
     if (!isKnownIpcType('request', type)) {
       throw new Error(`Unknown IPC request type: ${type}`);
     }
     // Force args[0] to be this.botName when the handler is one of the
     // bot-scoped read paths. Easier: pass `this.botName` as a second
     // argument via a thin Proxy, and let handlers prefer it. For this
     // brief, force-bind at the wrapper by checking `type` against the
     // bot-scoped list and replacing args[0] when it is a string.
     return this.dispatchIpcRequest(type, args, worker, generation);
   });
   ```
   Move the body of the existing 90-line `if` chain out of `setupIPC` and
   into a private `dispatchIpcRequest` method that *also* enforces the
   botName substitution. This is the single largest refactor in the brief.
4. **Install the global guards.** The handler at the top of `botWorker.ts`
   runs before `BotInstance` is constructed, so it covers the entire
   worker lifetime. The handler in `index.ts` covers the main thread.
   Both must log and continue — *not* `process.exit`. Letting the process
   die is exactly the failure mode this brief is closing.

## Tests

- `test/worker/IPCChannel.validation.test.ts`
  - New `IPCChannel` over an in-process `MessageChannel`. Send a
    `null`, a plain object without `kind`, a `kind: 'request'` without
    `id`, a `kind: 'bogus'`, and a well-formed message. The channel
    must dispatch only the last and log a warning for each rejected one.
  - Register a `notifyHandler` that throws. Send a well-formed
    notification. The channel must remain alive and dispatch a
    subsequent notification successfully.
- `test/worker/WorkerHandle.botNameBind.test.ts`
  - Construct a `WorkerHandle` for `bot: 'alice'`. Send an IPC request
    from a stub worker where `args[0] === 'mallory'`. Assert the
    parent's downstream call received `'alice'`, not `'mallory'`.
    (Use a stubbed manager so the assertion is on the args, not the
    real LLM/blackboard.)
- `test/worker/unhandledRejection.test.ts`
  - Spawn a worker, post an unhandled `Promise.reject(new Error('x'))`
    via a side-channel, wait for the next tick, and assert the worker
    process did *not* exit. The logger must have received an
    `unhandledRejection` line. Use a small fixture worker file
    (`test/worker/fixtures/unhandled-worker.ts`) that imports the
    `botWorker.ts` install path.

## Definition of done

- [ ] `src/worker/ipcTypes.ts` defines the request and notify type
      allowlists.
- [ ] `IPCChannel.handleMessage` validates `msg` shape; rejected messages
      are logged and dropped.
- [ ] `IPCChannel` `notifyHandler` / `commandHandler` are wrapped in
      `try/catch`; a throwing handler logs and does not kill the channel.
- [ ] `WorkerHandle.setupIPC` checks every incoming `type` against the
      allowlist and rejects unknown ones.
- [ ] `WorkerHandle` enforces botName substitution on the bot-scoped
      read paths.
- [ ] `process.on('unhandledRejection')` and
      `process.on('uncaughtException')` are installed in both
      `src/index.ts` and `src/worker/botWorker.ts`. Neither calls
      `process.exit`.
- [ ] `npm test --prefix . -- test/worker/IPCChannel.validation.test.ts
      test/worker/WorkerHandle.botNameBind.test.ts
      test/worker/unhandledRejection.test.ts` passes.
- [ ] `npm run build` succeeds.
- [ ] The PR description lists the allowlist and any type strings removed
      (e.g. if a legacy type was in use but no longer hits the wire).

## Traps to avoid

- **Do not exit on `uncaughtException`.** That is the *current* behaviour
  and the bug. A handler that logs and continues is the fix.
- **Do not add a per-handler `try/catch` in the 90-line dispatch chain.**
  Move the chain to `dispatchIpcRequest` and wrap *that* once. Per-handler
  wrapping buries the validation in a sea of identical try/catch blocks.
- **The allowlist is a security boundary.** Adding a new IPC type requires
  adding it to `ipcTypes.ts`. Reviewers must read that file in every PR.
- **`src/worker/IPCChannel.ts` already does `try/catch` in
  `handleRequest` for the `No request handler registered` case** (line
  152-160). Do not duplicate that logic. The new shape check runs *before*
  the switch.
- **The handoff warns that `getTopKSkillCode`'s `score >= 6` was
  incorrectly used as a safety gate (HANDOFF §4 trap 0b).** That is a
  different layer (skill selection) but the same class of error: a number
  that *looks* like a threshold. If you are tempted to add a "trust score"
  to the IPC path, do not. Allowlist and shape are the actual defences.
- **HANDOFF §3 SEC-01 says the first two items "reduce more risk than
  the migration does."** Do not bundle other work into this PR.

## References

- `HANDOFF.md` §3 SEC-01 item 2
- `src/worker/IPCChannel.ts:132-150` (`handleMessage`)
- `src/worker/WorkerHandle.ts:311-404` (request dispatch)
- `src/worker/botWorker.ts:1` (`import 'dotenv/config'` — adjacent issue,
  see brief #3)
- `HANDOFF.md` §4 trap #0b (a useful warning about threshold-shaped
  anti-patterns that look like gates)
