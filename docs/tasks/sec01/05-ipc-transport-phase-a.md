# Brief 5/6 — `IPCTransport` interface + try/catch on every send (Phase A)

> Source: `HANDOFF.md` §3 SEC-01, item 5.
> Severity: **Medium**. Phase A is "pure correctness on threads today";
> the goal is to make every `postMessage` defensible so that brief #4
> (and the eventual worker-isolation migration) can route writes through
> a hardened path.
> Effort: **M**.
> Depends on: none. But this is the prerequisite for #4.

## Goal

Every IPC send (request, response, notify, command) is wrapped in
`try/catch` and routed through a single `IPCTransport` interface so
that a closed port, a destroyed channel, or a structured-clone failure
never tears down the surrounding logic. The transport reports the
failure with a structured error that the caller can handle. Phase A is
this *interface* plus the *defensive send*; it does not yet change
the wire format or move to a unix socket.

## Background

- `src/worker/IPCChannel.ts:69-94` — `request`, `notify`, `command`
  all call `this.port.postMessage(...)` without a `try/catch`. A
  `postMessage` on a closed `MessagePort` throws
  `DataCloneError` or `ERR_MESSAGE_PORT_CLOSED` synchronously; today
  the throw propagates to the caller with no envelope.
- `src/worker/IPCChannel.ts:80-81` (`request`),
  `:87` (`notify`), `:93` (`command`) — the
  three `postMessage` call sites in this file.
- `src/worker/WorkerHandle.ts:711-726` — `postConfigPatch` is the
  only existing call site that catches an IPC failure. It does so
  inline with a per-call site message. There are 6+ other call
  sites that don't.
- A future worker-isolation migration will swap the underlying
  transport from `MessagePort` to a unix socket. Doing that swap
  without a transport interface today means a big-bang refactor
  on top of the security work. Phase A is the seam.

## Files to touch

- `src/worker/IPCTransport.ts` (new)
  - Define the interface:
    ```ts
    export interface IPCTransport {
      send(message: IPCMessage): Promise<void>;
      onMessage(handler: (msg: IPCMessage) => void): void;
      close(): Promise<void>;
    }
    ```
  - Provide two implementations:
    - `MessagePortTransport` — wraps a `MessagePort` (the current
      thread-based path).
    - `ThreadWorkerTransport` — wraps a `Worker` (the parent side
      today).
  - Both implementations must:
    - Catch `postMessage` errors (`ERR_MESSAGE_PORT_CLOSED`,
      `DataCloneError`, etc.) and resolve the returned promise with
      a structured `TransportError` rather than throwing.
    - Coalesce `close()` so a second call is a no-op.
- `src/worker/IPCChannel.ts`
  - Hold an `IPCTransport` instead of a `MessagePort | Worker`.
  - Every existing `port.postMessage(...)` call site moves to
    `transport.send(msg).catch(err => logger.warn(...))`.
  - `handleMessage` keeps its current `if (destroyed) return;` guard.
- `src/worker/WorkerHandle.ts`
  - Construct the right transport based on whether the side is
    the parent (`ThreadWorkerTransport`) or the worker
    (`MessagePortTransport` over `parentPort`). `WorkerHandle` is
    the parent-side caller, so it uses `ThreadWorkerTransport`.

## Approach

1. **Add the interface.** `src/worker/IPCTransport.ts` with the
   interface above. Export `TransportError extends Error` with
   `code: 'CLOSED' | 'CLONE' | 'UNKNOWN'` and the original `cause`.
2. **Wrap the existing port.** Move the `port.on('message', ...)`
   wiring from the `IPCChannel` constructor into a
   `MessagePortTransport.onMessage` registration. The transport
   itself owns the subscription; the channel receives a callback.
3. **Add the try/catch.** Three call sites in `IPCChannel`:
   ```ts
   this.transport.send({ kind: 'request', ... }).catch((err) => {
     this.pending.delete(id);
     clearTimeout(timer);
     reject(err instanceof TransportError ? err : new TransportError('UNKNOWN', err));
   });
   ```
   For `notify` and `command`, the catch path is a `logger.warn`
   with the message's `type`. They are fire-and-forget, so a
   rejected promise is logged and dropped — the caller's
   expectations are already "no return value".
4. **Update `WorkerHandle`.** Where it currently does
   `ipc.command('config:patch', ...)` (and any other call sites
   that ignore errors), add an explicit `.catch` that logs at
   `warn` level. The caller cannot tell whether the worker is
   alive from a no-op; logging makes it visible.
5. **Verify backward compat.** Phase A is *additive*. The wire
   format and the channel's public API do not change. The brief
   must not touch `IPCRequest`/`IPCResponse`/`IPCNotification`/
   `IPCCommand` shapes; that is Phase B.

## Tests

- `test/worker/IPCTransport.test.ts`
  - Construct a `MessagePortTransport` over a `MessageChannel`
    pair. Send a well-formed message. The receiving end receives
    it.
  - Close one end. Send from the other. Assert the returned
    promise resolves to a `TransportError` with `code: 'CLOSED'`
    rather than throwing.
  - Send a non-cloneable value (e.g. a function). Assert the
    promise resolves to a `TransportError` with `code: 'CLONE'`.
- `test/worker/IPCChannel.sendErrors.test.ts`
  - Construct a channel whose transport is stubbed to always
    reject with a `TransportError('CLOSED')`. Call `request()`,
    `notify()`, `command()`. Assert:
    - `request()` rejects with the `TransportError` and clears
      the pending entry (no leak).
    - `notify()` and `command()` do not throw; the channel logs
      a warning. Use a stubbed logger.
- `test/worker/WorkerHandle.postConfigPatch.test.ts` (extend the
  existing test if present, else new)
  - Stub the transport to reject. Call
    `workerHandle.postConfigPatch('voyager', {...})`. Assert the
    call returns normally and the warning is logged. The current
    behaviour (silent `try/catch` swallowing) is replaced with a
    logged failure.

## Definition of done

- [ ] `src/worker/IPCTransport.ts` exists with the interface, the
      `TransportError` class, and the two transport implementations.
- [ ] `src/worker/IPCChannel.ts` holds an `IPCTransport`; every
      `port.postMessage` is replaced with a `.send().catch(...)`.
- [ ] `src/worker/WorkerHandle.ts` constructs the right transport
      based on its side (parent vs worker).
- [ ] No existing test fails. The public surface of `IPCChannel`
      (`request`, `notify`, `command`, `onRequest`, `onNotify`,
      `onCommand`, `destroy`, `isDestroyed`) is unchanged.
- [ ] `npm run build` succeeds.
- [ ] New tests pass.

## Traps to avoid

- **Phase A is the seam, not the swap.** Do not change the
  underlying `MessagePort`/`Worker` to a unix socket. That is
  Phase B and depends on the worker-isolation design (HANDOFF §3
  SEC-01, blocked on the polkit decision).
- **Do not change the wire format.** The
  `IPCRequest`/`IPCResponse`/`IPCNotification`/`IPCCommand`
  shapes are stable. The brief adds an interface layer; it does
  not touch message contents.
- **`WorkerHandle.postConfigPatch` already has a `try/catch`** at
  `:722-726`. Do not "fix" it by removing the catch and adding
  a new one. The brief extends the pattern, it does not
  duplicate it.
- **The handoff says the worker OOM was caused by
  `searchRadius = -1` and a re-entrant A* context
  (HANDOFF §3 Watch).** That is a different layer (pathfinder,
  not IPC) and is not in scope. Do not bundle.
- **Do not silently swallow errors in `notify`/`command`.** The
  brief's job is to make the failure *visible* via a logged
  warning, not to hide it. A `logger.debug` would be the same
  anti-pattern as the silent `try/catch` this brief replaces.
- **Backward compatibility is mandatory.** A bot that is already
  running on the bot host has an old `dist/`; the next deploy
  brings the new one. Workers in the field are not running
  mismatched binaries because `Worker` boots a fresh `node` from
  the same `dist/`. But the brief must not break the case where
  a parent from the new build talks to a worker from the new
  build *and* the case where a parent from the new build is
  talking to a child of an old IPC channel (e.g. during a
  rolling restart). Since both are from the same build, this is
  not a real risk; mention it in the PR description and move on.

## References

- `HANDOFF.md` §3 SEC-01 item 5
- `src/worker/IPCChannel.ts:69-94` (the three send sites)
- `src/worker/WorkerHandle.ts:711-726` (the only existing catch pattern)
- `docs/research/worker-process-isolation.md` (Phase B context)
- `node:worker_threads` docs (MessagePort, Worker, postMessage error shapes)
