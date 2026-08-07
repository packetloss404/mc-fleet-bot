# Worker process isolation — design record

**Date:** 2026-08-07
**Status:** designed, NOT built. Decision pending.
**Method:** three parallel design agents (transport, privilege model, regression surface) plus direct measurement on the live host `10.80.13.18`.

Read §2 and §3 first. §3 is the reason this document exists: the obvious
implementation grants root, and that is not discoverable by reading code.

---

## 1. Why

`CodeExecutor` runs learned skills and LLM-generated code in a `node:vm`
context. **`node:vm` is not a security boundary** — Node documents this
upstream. `CodeExecutor.ts:222-235` puts host-realm objects (`Vec3`, `Promise`,
`goals`, the `console`/`setTimeout` closures) directly into the context, and
`botProxy.entity` (`:191`) returns a live host `Vec3`. `Vec3.constructor('return
process')()` is a one-line escape to the host realm.

This was reproduced independently by two reviewers, and the mechanism verified
here. It applies to **ordinary LLM-generated code on every cycle**, not to any
particular feature.

The goal is therefore **not to prevent the escape** — that requires either
`isolated-vm` or an out-of-process executor — but to make the escape worthless.

### Why not `isolated-vm`

`isolated-vm` gives a genuinely separate V8 isolate, so there is no shared
object graph to walk. But host access must then be marshalled: values are
copied, or reached through `Reference` handles whose calls are **async**.

**820 of 938 skill files use synchronous bot calls** (`bot.findBlock`,
`bot.inventory.items()`, `bot.entity.position`). Adopting `isolated-vm`
invalidates all of them, plus the system prompt, plus the learned corpus.
That is a corpus-wide rewrite to fix a privilege problem. Rejected.

Keeping the mineflayer bot in the **same process** as the skill code is what
preserves those 820 skills. Hence: process isolation, not VM isolation.

---

## 2. What was measured

All on the live host, 2026-08-07. Several repo docs are stale on these numbers.

| Fact | Value | Consequence |
|---|---|---|
| Host CPU / RAM | **8 vCPU, 15,991 MB** (14,524 MB available) | Resized 2026-07-26 per HANDOFF §7. The old "2 vCPU / 7 GB" figures are obsolete. |
| Fleet footprint | 815 MB RSS, 5 bots, 22 threads, peak 933 MB | ~143 MB/bot; main-thread heap is only 32 MB, so the bulk is worker isolates + native deps. |
| Measured as processes (PSS) | **+7–8 MB/bot** → 5 bots ~1.0 → ~1.04 GB; 12 bots ~2.4 → ~2.5 GB | Against 14.5 GB available. **Memory is not a constraint.** |
| Service identity | `User=ianwalmsley`, `Group=ianwalmsley` | Not root. |
| Service capabilities | **`CapPrm=0 CapEff=0 CapAmb=0`** | Cannot `setuid`. `fork({uid,gid})` → `EPERM`, confirmed. |
| `NoNewPrivs` | `1` | Independently blocks a setuid helper. Two locks, two keys. |
| `kernel.yama.ptrace_scope` | **`1`** | A same-uid child **cannot** ptrace the parent, so the parent's in-memory key is out of reach. Same-uid exposure reduces to what the key touches **on disk**. |
| `apparmor_restrict_unprivileged_userns` | `1` | The bwrap/userns fallback needs an AppArmor profile. Fragile; not recommended. |
| `child_process` in worker import graph | **none** | A seccomp filter denying `execve` is cheap and high-value — no `sh`, `curl`, or `python` for escaped code. |
| Sudo for service user | `(ALL) NOPASSWD: ALL` | Was the escape→root path. Severed 2026-08-07 by `NoNewPrivileges=yes`; exposure 9.2 UNSAFE → 7.3 MEDIUM. |

### Benchmarked, not estimated

An early estimate of **+40–60 MB per bot** circulated during this research and
is **wrong by roughly 6×**. It was corrected by direct benchmark (5 children
each loading `mineflayer` + `minecraft-data` + `pathfinder`, sampled via
`/proc/<pid>/smaps_rollup`):

| | 5 worker_threads | 5 forked children |
|---|---|---|
| naive RSS | 273.5 MB | 461.4 MB + ~41 MB parent |
| **PSS (true physical)** | **226.1 MB** | **~263 MB incl. parent** |

**Delta ≈ +37 MB for 5 bots, ~7–8 MB per bot.** The naive RSS sum makes fork
look 1.7× worse; that double-counts shared text pages. **PSS is the honest
number and it is a wash.**

Why the intuition fails: *`worker_threads` already pay the per-isolate cost.*
Each `new Worker()` re-parses and re-compiles the whole mineflayer graph into
its own isolate — that is the ~30 MB per-thread heap. The only thing threads
share and processes don't is the node binary's text segment plus native addon
`.so` text, and the kernel shares **those across processes too**, via the page
cache. Steady-state per-bot memory (~200 MB, `WorkerHandle.ts:35-37`) is chunk
data and world state — pure JS heap, identical under either model.

Also measured:
- **Startup: +5%** module load (11,856 ms → 12,520 ms, ~0.7 s/bot). Against a
  deliberate 45 s/bot join stagger, noise. (N=1; concurrent runs on the dev box
  were unreliable, but the serialized case is the production-representative one.)
- **IPC round-trip: 148–158 µs (threads) → 197–233 µs (fork)**, i.e. +50–80 µs.
  `serialization: 'advanced'` and `'json'` were indistinguishable in cost, so
  advanced mode is free. The most exposed path is `SiteSelector`'s serial
  probing (60 k probes, 180 s budget) → **+4.8 s worst case**; but measured
  per-probe cost there is dominated by worker event-loop queueing (~4 s/block
  verify, `BuildCoordinator.ts:2445-2450`), which is ~26,000× the raw RTT.
  Transport is not the bottleneck on that path.

> One stale claim to disregard from the same analysis: it states the binding
> constraint is "2 vCPU". The host has **8** (§2). CPU headroom is real.

---

## 3. ⚠️ The probe: `AmbientCapabilities=CAP_SETUID` GRANTS ROOT

The obvious way to let a non-root unit drop uid is
`AmbientCapabilities=CAP_SETUID CAP_SETGID`. **Do not do this.** It was tested
here, and it is worse than the problem it solves.

```
control (today, no ambient caps):
  PARENT uid=1000  CapPrm=0 CapEff=0 CapAmb=0
  fork({uid:65534}) -> FORK THREW: EPERM

with -p AmbientCapabilities="CAP_SETUID CAP_SETGID" -p NoNewPrivileges=yes:
  PARENT uid=1000   CapInh/Prm/Eff/Amb = 0x00000000000000c0
  CHILD  uid=65534  CapInh/Prm/Eff/Amb = 0x00000000000000c0
  capsh --decode=0xc0 -> cap_setgid,cap_setuid

  CHILD starts as uid=65534
    *** CHILD ESCALATED TO uid=0 (ROOT) ***      <- process.setuid(0) succeeded
```

The parent-side check passes: the capability *is* granted, and
`NoNewPrivileges` does not block it. Only the child-side check reveals the
problem. **Ambient capabilities are designed to survive `execve` and uid
changes** — that is the entire purpose of the ambient set — so the
"de-privileged" worker retains `CAP_SETUID` and climbs back to root in one
syscall.

Adopting this would convert today's *"escape gets an unprivileged account"*
into *"escape gets root"*, reversing the hardening applied the same day.

**This is why the fork+uid route is dead** — not merely unavailable.

> Recorded at length because it is re-proposable: it looks correct, the
> first check passes, and nothing in the code review surfaces it. If someone
> suggests ambient capabilities again, point them here.

**"Can't the child just clear its ambient set after dropping uid?" — No, not
from Node.** Clearing it requires `prctl(PR_CAP_AMBIENT,
PR_CAP_AMBIENT_CLEAR_ALL)` in the window *between* `fork` and `execve`, and
Node deliberately exposes no pre-exec hook: `child_process` options stop at
`uid`/`gid`, and libuv's spawn path performs the setuid without touching the
ambient set. The only routes are a native addon or a setuid wrapper — and
`NoNewPrivs=1` kills the wrapper. **The escape hatch is genuinely closed, not
merely awkward.**

The sharpest way to state the severity: the danger is not that the *parent*
becomes root-equivalent. It is that the **sandboxed child — the one component
in the system that runs untrusted code — ends up one syscall from root.** That
inverts the entire purpose of the migration. Fork+uid is a documented
anti-pattern for this codebase, not just an unavailable option.

This also sharpens why polkit is the better trade (§5): scoping authority to
ten named units is narrower than `CAP_SETUID`, and — unlike `CAP_SETUID` — it
is authority the child **cannot inherit**. That second property is what the
probe actually proved, and it is the more durable reason.

---

## 4. Options considered

| Option | Verdict |
|---|---|
| `fork({uid, gid})` | **Impossible.** `CapEff=0` → `EPERM`. |
| `AmbientCapabilities=CAP_SETUID` | **Dangerous.** §3 — grants root to the sandboxed child. |
| Same-uid fork + env scrub | **Not a boundary.** Child reads `.env` off disk; it is 0600 owned by the uid the child runs as. Retains non-security value only (§6). |
| `LoadCredential=` alone | **No help.** A forked child is inside the same unit, inherits the mount namespace and `$CREDENTIALS_DIRECTORY`, reads the credential exactly as it reads `.env`. Correct plumbing *after* the two-unit split; useless before it. |
| User namespaces (bwrap/unshare) | **Fragile.** `apparmor_restrict_unprivileged_userns=1`; needs an external helper (Node exposes no `unshare`); same host uid, so the whole boundary is the mount namespace. |
| **systemd template units + unix socket** | **Recommended.** §5. |
| `isolated-vm` | **Rejected.** Breaks 820 of 938 skills (§1). |

---

## 5. Recommended design

**`mc-fleet-worker@0..9` template units, dedicated `mcfleet-worker` user, unix
socket transport.**

systemd runs as root, so it assigns the uid the parent cannot. The main process
*connects*; the worker is started under the dedicated user. The parent needs no
capability.

**The abstraction already exists.** `WorkerHandle` assigns every bot a
`workerSlotIndex` (`WorkerHandle.ts:277`, consumed at `botWorker.ts:61` for the
viewer port), and `config.yml` caps `bots.maxBots: 10`. A pool of
`mc-fleet-worker@0..9` maps one-to-one with no new concept. `POST /api/bots`
does not change.

### What it costs

- **`WorkerHandle.start()` / `terminate()`** — transport swap. The
  `IDLE→RUNNING→DEAD→RESTARTING` machine and the `generation` guard
  (`isCurrentWorkerGeneration`) carry over unchanged; the generation counter is
  already precisely the reconnect-race defence a socket needs.
- **`botWorker.ts`** — async bootstrap. Template units know only `%i`, not
  name/personality/mode/spawnLocation (dynamic, from `POST /api/bots`), so:
  connect → handshake → receive assignment → *then* build `BotInstance`.
  Everything below `:129` is untouched. New bug class: a command arriving
  before `instance` exists is a TypeError — structurally impossible today.
  Needs an explicit not-ready gate.
- **`IPCChannel`** — length-prefixed `v8.serialize` framing, ~40 lines,
  unit-testable with no Minecraft server involved.
- **Ops** — 10 socket + 10 service units (or a generator), the
  `mcfleet-worker` user, ownership migration.
- **A polkit rule.** The watchdog's `forceRestart()` path
  (`BotManager.ts:806-817`) kills wedged workers — an *observed* failure mode,
  not hypothetical. A wedged worker won't process a socket close any more than
  an IPC one, so the parent needs `systemctl kill mc-fleet-worker@N`.

> **The strategic point worth remembering:** every route to a different uid
> requires the parent to acquire authority it currently lacks — `CAP_SETUID`
> for fork, or polkit over ten named units for systemd. The template design
> *relocates* the privilege problem rather than avoiding it. That is still the
> right trade: "start/stop these ten specific units" is dramatically narrower
> than a capability any escaped worker can use to become root (§3).

### Serialisation: use `v8.serialize`, not JSON

`child_process` defaults to `serialization: 'json'`, and **JSON turns
`undefined` into `null`, which does not trigger a JS default parameter.**
Measured consequences if this is missed:

- `claimReservation(..., ttlMs = 30000)` → `null` → `expiresAt = Date.now() + null`
  → **every cross-bot reservation is born already expired.** Presents as a race
  condition.
- `releaseStale(timeoutMs = 300000)` → `null` → **releases every claimed task
  on every call.**
- `getRecentMessages(limit = 20)` → `slice(-null)` === `slice(0)` → the entire
  message history goes into an LLM prompt.

None of it throws. `v8.serialize` (what `postMessage` already uses) preserves
`undefined`, `Map`, `Set`, `Date`, `BigInt`, `Error`, typed arrays and circular
refs. Verified on this host's Node v24.16.0: `undefined preserved: true | Map:
true | Set: true`. This applies equally to the socket transport — it is not an
argument for fork.

### Orphan protection

1. **`socket.on('close', () => process.exit(0))`** — functionally equal to
   `process.on('disconnect')`, resting on the same kernel guarantee: when the
   parent dies *by any means including SIGKILL*, the kernel closes its sockets
   and every worker sees EOF. Also the only cover for ad-hoc foreground runs,
   which systemd cannot see.
2. **`BindsTo=` + `After=mc-fleet-bot.service`** on the template — a declared
   dependency, stronger than relying on cgroup teardown.
3. **A connect deadline.** A worker that cannot reach the parent must exit
   non-zero, not retry forever. Otherwise a parentless worker sits holding an
   open mineflayer connection — which trips our own `ImpersonationMonitor`
   (`BotManager.ts:354`, `:503`) as a duplicate login. Self-inflicted, and
   confusing to debug.

### Handshake identity is a security boundary

`fork` gives parent↔child pairing free — the fd *is* the identity. A listening
socket does not. If the parent trusts a self-declared bot name in a hello
frame, **anything on the box that can open the socket gets an unauthenticated
proxy to `llm.chat`** (`WorkerHandle.ts:329-342`) — i.e. to the API keys, the
exact asset this migration protects.

Mitigate with socket mode 0660 owned by the worker group, plus a per-worker
secret delivered by `LoadCredential=`. Be honest about what the token buys:
escaped code runs *inside* a worker and can read its own token, so it does not
stop a compromised worker talking to the parent — it stops worker 3
impersonating worker 7, and file permissions stop other uids. Node's
`net.Socket` exposes no `SO_PEERCRED`, so file permissions are the only
kernel-level check.

Bind identity once at handshake and never trust a wire-supplied `botName`
again. The existing code already gets this right on the hot path —
`WorkerHandle` is per-bot and its caches key off `this.botName` (`:619`).

### Unit sketch

```ini
# mc-fleet-worker@.service
User=mcfleet-worker
Group=mcfleet-worker
SupplementaryGroups=mcfleet          # shared read on skills/, config.yml
WorkingDirectory=/opt/stacks/mc-fleet-bot
ExecStart=/usr/bin/node --max-old-space-size=512 dist/worker/botWorker.js --slot=%i
Environment=PATH=/usr/bin:/bin
MemoryMax=768M
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectProc=invisible
ProcSubset=pid
ReadOnlyPaths=/opt/stacks/mc-fleet-bot
ReadWritePaths=                      # empty once skills/+data/ move to IPC
RestrictNamespaces=yes
RestrictSUIDSGID=yes
LockPersonality=yes
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~@debug @mount @module @privileged @raw-io @swap execve execveat
IPAddressAllow=10.80.13.14/32 127.0.0.1/32
IPAddressDeny=any
```

**Do NOT add `MemoryDenyWriteExecute=yes`** — it breaks V8's JIT and the worker
will not start. Someone will propose it.

### Two things that get better

- **`MemoryMax=` is a real fix, not a side effect.** `resourceLimits.maxOldGenerationSizeMb`
  is worker_threads-only. The comment at `WorkerHandle.ts:18-50` records workers
  spiking to ~2 GB against a 512 MB V8 soft cap — a cgroup limit would have
  contained that. This fixes a reliability bug the current design structurally
  cannot.
- **Native crash isolation.** `canvas` (native, via prismarine-viewer at
  `botWorker.ts:69`) is **worker-only**; `better-sqlite3` (native) is
  **main-only** (`town/db.ts`, `town/BuildingRepository.ts`,
  `world/WorldFeatureStore.ts`; `WorkerHandle` imports `town/` as `import type`
  only, erased at compile). Today a segfault in `canvas` takes down the entire
  process — API server, dashboard, town SQLite handles, and all other bots.
  Isolates do not contain native crashes. Process separation quarantines
  exactly the right dependency. The guard at `botWorker.ts:66-67` only covers
  `require` failing, not a runtime segfault.

### 5b. What the *settled* design breaks that a plain fork swap would not

These appear only when the systemd/uid model is crossed with the file-write
inventory, so no single lane would have found them. Ranked by bite.

1. **`joinStaggerMs` stops working — user-visible on day one.** The stagger is
   enforced *by the parent*: computed at `BotManager.ts:223-226` (via
   `nextStaggerAt`) and awaited at `:302-306` **before** `handle.start()`.
   `systemctl start mc-fleet-worker@N` awaits nothing, so at boot systemd
   brings up all N units in parallel and every bot hits the Minecraft server
   at once — exactly what the stagger prevents. It must move *into* the worker
   (a sleep before `instance.connect()`) or become systemd ordering. Silent if
   missed; you find out from a kick storm.
2. **Restart policy becomes double-owned, on the most-exercised path.**
   `WorkerHandle.maybeRestart` (`:572-603`, 5 s × crashCount, give up after 3
   in 60 s) versus systemd `Restart=`/`StartLimitBurst=`. Running both gives
   either restart storms or a bot systemd keeps reviving that the API believes
   is dead. **Pick one owner explicitly.** Not a corner case:
   `BotInstance.ts:594` records **80 measured OOM kills**. Compounding trap —
   `botWorker.ts:179` does `process.exit(0)` on `disconnect`, a *clean* exit
   that `Restart=on-failure` ignores; the same trap CLAUDE.md already documents
   for `POST /api/admin/restart`, now applying per-bot.
3. **polkit sits on the self-healing path, not the admin path.**
   `forceRestart()` (`WorkerHandle.ts:940`) is called by `watchdogTick`
   (`BotManager.ts:801-815`) on a 30 s timer whenever a heartbeat goes stale
   past 90 s. If the polkit rule is wrong, **wedged bots stay wedged** — it is
   not merely an admin button returning 500.
4. **Dedicated user × shared JSON = permission failures.** `data/social_memory.json`
   has **two writers that would be at different uids**: `BotManager.ts:106`
   (main) and `BotInstance.ts:242` (worker) both construct
   `new SocialMemory(path.join(process.cwd(), 'data'))` over the same path —
   verified. Whichever writes first owns the file; the other gets `EACCES`.
   And `atomicWrite` renames into place, needing write on the **directory**,
   so both uids need group-write on `data/` plus the setgid bit or every
   persistence write fails — **quietly**, since several of these paths swallow
   errors. Same applies to the other eleven worker-written files and to
   `skills/`, which the main thread also reads and `unlinkSync`s
   (`skillRoutes.ts:215`).
5. **Viewer slot mapping inverts.** `allocateViewerSlot` (`BotManager.ts:330-347`)
   assigns slots **in memory at spawn time** and passes the result via
   `workerData`. With template units the instance name *is* the slot, so the
   mapping must be durable and known *before* the unit starts — `data/bots.json`
   has to carry it, and allocation becomes a reservation against persisted
   state. Separately, any `PrivateNetwork=`/`IPAddressDeny=` on the worker unit
   kills the viewer with no error the dashboard can distinguish from "not
   spawned yet".
6. **A genuinely new failure mode: the channel can die while the worker lives.**
   With `worker_threads` the channel dies **iff** the worker dies, and
   `WorkerHandle` bakes that in — `isAlive()` is `this.worker !== null`
   (`:931`), `sendRequest` gates on `state === 'RUNNING'` (`:740`), and the
   state machine has one axis. A unix socket can drop while the process is
   healthy, and a stale fd can linger past process death. **"Worker alive" and
   "channel usable" must become two independent states**, and every caller
   reading one as a proxy for the other must be revisited. Highest-risk item in
   the rewrite.

**Two wins to claim explicitly rather than discover:**

- **The ~3-minute API bind goes away.** It is not module loading — it is
  `loadSavedBots` (`index.ts:121`) awaiting `spawnBot`, which awaits the
  stagger before each `handle.start()`: 5 × 45 s of deliberate sleeping,
  serialized, blocking `listen()`. If systemd owns worker lifecycle,
  `loadSavedBots` has nothing to await — it reconciles desired vs actual and
  returns, and the API binds in seconds. **This is the same change as fixing
  breakage (1)**, and it is the benefit an operator feels daily.
- **`MemoryMax=` is kernel-enforced**, where `--max-old-space-size` is a soft
  V8 target that can overshoot. Against 80 recorded OOM kills that is a real
  hardening win, and `systemctl show -p MemoryCurrent` per unit partly replaces
  the aggregate RSS that `/api/admin/info` loses.

**Sizing note:** do not set per-unit `MemoryMax=` from RSS. cgroup v2 charges a
page to the cgroup that *first faults it in*, so shared binary and `.so` text
lands entirely on whichever worker starts first — that unit reads ~40 MB higher
than its peers for no reason. Size from ~150 MB steady + cap headroom,
uniformly.

**CPU, healthy-fleet baseline** (the idle 0.20 in §2 is drained-provider, not
representative): `HANDOFF.md:551` records **2.54 / 2.23 / 2.08 on 8 cores ≈ 32%
subscribed** post-resize with 5 bots. Scaling to 10 bots ≈ **64% subscribed**.
Headroom, not vast — and unchanged by the migration, since 5 threads and 5
processes are both 5 OS-schedulable entities (Node worker threads are real
pthreads).

---

## 6. Ships regardless of the decision

These are worth doing **even if the migration never happens**, and items 1–2
buy more risk reduction than the uid separation does.

1. **Set `DASHBOARD_AUTH_SECRET`.** Verified on the running host:
   `DASHBOARD_AUTH_SECRET` and `PLUGIN_AUTH_TOKEN` are both absent, and
   `GET /api/bots` and `GET /api/admin/info` return **200 unauthenticated**.
   `config.yml` binds the API to loopback *because* it is unauthenticated — but
   `prismarine-viewer` requires loopback access, so an escaped worker can drive
   the full admin API: spawn bots, grant items, backup, restart. **Without
   this, uid separation is decorative.**
2. **IPC input validation + identity rebinding + an `unhandledRejection` handler.**
   `IPCChannel.handleMessage` (`:132-150`) does zero validation and is invoked
   as a floating promise (`:57`). There is **no `unhandledRejection` or
   `uncaughtException` handler anywhere in `src/`** — verified. A notify with
   `data: null` throws, the rejection is unhandled, and Node terminates the
   main process: a trivially triggered fleet-wide DoS from any worker.
   Separately, **no handler binds a caller-supplied `botName` to
   `this.botName`**, so one compromised worker can act as any other bot.
   Highest-leverage single fix.
3. **Delete `import 'dotenv/config'` from `botWorker.ts:1`.** The worker loads
   `.env` itself at module load, re-injecting `GOOGLE_API_KEY` into its own
   environment. **Any parent-side env scrub is theatre until this is gone.**
   Found independently by two agents; it is harmless today (threads inherit
   `process.env` anyway), which is exactly why it would be overlooked.
   Good news underneath: **no module in the worker's import graph reads an API
   key** — `LLMClientProxy` imports only `IPCChannel` and the `LLMClient`
   interface. The proxy design is sound; this import is the whole leak.
4. **Route `SkillLibrary.save()` through IPC; mount `skills/` read-only.**
   A worker that can write `skills/` writes attacker-controlled JS that every
   *other* bot retrieves and hands to `CodeExecutor` — lateral movement to the
   whole fleet plus persistence across restarts. Poisoned `data/` is bad;
   poisoned `skills/` is game over.

   **This one also fixes a live correctness bug, and that may be the better
   reason to do it.** Every worker holds its own `StatsTracker`,
   `SocialMemory`, `PlanLibrary`, `SkillLibrary` and qa-cache over the **same
   file paths**, with no coordination — a file-as-IPC channel that bypasses
   `IPCChannel` entirely. `atomicWrite.ts`'s own header records the damage:
   *"the source of the corrupt `qa_cache.json` and a contributor to the 47.9%
   orphan rate in `skills/`"*, and states the residual plainly — *"read-modify-write
   sequences [are not] safe — last writer still wins on whole-file rewrites.
   **Fixing lost updates needs a single writer or a real store.**"*

   `SkillLibrary.saveIndex()` (`:519-536`) is exactly such a read-modify-write:
   re-read the on-disk index, keep its deprecated rows, concatenate with the
   in-memory index, rewrite the whole file. Five workers doing that concurrently
   lose entries — which is the mechanism behind the orphan rate (skill `.js`
   written, index entry lost). An independent review counted **454 of 936
   `.js` files unreachable** from the index.

   Routing `save()` through IPC makes the main process the single writer, which
   is the fix the comment asks for. **Worth doing on correctness grounds alone,
   independent of any migration** — and the migration makes it marginally worse,
   since it removes the accidental same-process fs ordering that currently makes
   the race survivable.
5. **Phase A of the transport work** — an `IPCTransport` interface
   (`{ send(msg): boolean; on('message', fn) }`) replacing the six
   `postMessage` call sites, plus try/catch on every send. Pure correctness on
   threads today, zero behaviour change, and it is the abstraction both futures
   depend on. `IPCChannel.notify` (`:85`), `command` (`:91`) and
   `WorkerHandle.sendCommand` (`:686`) are unguarded; every non-thread
   transport turns them into main-process crash sites.
   (The `(code, signal)` + `'error'` widening at `WorkerHandle.ts:530-537` is
   fork-specific and superseded under sockets — ship it, but it is not
   strategic.)
6. **`IPAddressDeny=any` + a two-entry allowlist** (MC host + loopback). A
   unit-file property, not a transport property — it works under **every**
   option including today's threads. Rated by the privilege design as the
   single highest-value control on the table, above the uid change itself.

---

## 7. Residual exposure after all of the above

Stated honestly, because no design closes these:

1. **The LLM proxy is a bidirectional exfiltration channel.** The child holds
   no key, but the parent makes any call it asks: arbitrary text out in the
   prompt, arbitrary text back in the response. No network restriction closes
   it — the parent is outside the child's `IPAddressDeny`. `TokenLedger` and
   the budget cap are economic brakes, not preventive controls. **Highest
   residual, and structural** — it is the whole point of the proxy.
2. **The Minecraft connection.** Full griefing authority as that bot, plus
   chat. Irreducible; it is the program's purpose.
3. **`config.yml`** — readable by the worker, and it contains
   `minecraft.loginPassword`. Low impact today (`loginFlow: "none"`). Rotate it
   and stop putting secrets there.
4. **`data/`** — ten files are written directly by the worker (`social_memory`,
   `stats`, `plan_templates`, `skill_attribution`, `blockers`, `world_memory`,
   `completed_tasks`, `failed_tasks`, `qa_cache`, `qa_embeddings`). All use
   `atomicWrite*`, which needs **directory-level** write (create + rename), so
   per-file ACLs cannot express a read-only `data/`. Closing this means moving
   ten writes across six classes onto IPC — largest effort, smallest marginal
   gain. Do it last, or accept a writable `data/`.

---

## 8. Open / not verified

- **Required work if §5 proceeds (Tier 1), all observability rather than
  mechanism:**
  1. `resourceLimits.maxOldGenerationSizeMb` → `execArgv
     --max-old-space-size`. **The OOM signature changes** from a clean
     `ERR_WORKER_OUT_OF_MEMORY` to a V8 `FATAL ERROR` abort (SIGABRT, exit
     134/null). `BotInstance.ts:594` records **80 measured OOM kills**, so the
     log line operators grep for is operationally load-bearing — budget for
     restoring it. `--max-old-space-size` is also a softer bound, so a runaway
     bot overshoots further before dying.
  2. **`/api/admin/info` goes blind.** `process.memoryUsage().rss` today
     includes all five workers — it is literally the number used to size
     `WORKER_HEAP_MB` (`WorkerHandle.ts:35-37`). After the split it collapses
     to main-thread-only, and the auto-snapshot threshold at
     `index.ts:283-289` becomes a useless OOM canary. Fold each child's
     `memoryUsage()` into the existing status heartbeat.
  3. **Logging fragments.** Six independent processes interleaving into one
     captured stdout is a worse line-tearing risk than six transports in one
     process, and `logPath`/`process.pid` in `admin.ts:279-289` become
     ambiguous.
  4. Pin `cwd` explicitly — `BotInstance.ts:242` and several relative
     `'./data'` / `'./skills'` paths resolve off `process.cwd()`. `fork()`
     inherits it, but any `cwd:` option or systemd `WorkingDirectory`
     divergence silently relocates every bot's persistence with **no error**.

- **Test coverage of the boundary is zero.** 9 of 201 test files touch it, and
  **every one mocks `WorkerHandle` as a duck-typed object literal** — none
  instantiates a real `Worker` or `IPCChannel`. The suite would stay green
  through this entire migration without a single edit, which is convenient and
  also damning. New tests needed: real forked-child round-trip asserting error
  `name`/`stack`/**`code`** survive (load-bearing — `AIDisabledError` carries
  `code='AI_DISABLED'` so workers idle instead of crash-looping); `Set`/`Map`/
  `undefined` survival under the chosen serialization mode; SIGKILL mid-request
  rejecting pending requests rather than hanging to the 60 s timeout; OOM exit
  driving `maybeRestart`'s crash counting; cwd pinning.

- **`atomicWrite` improves after a split** — temp files are named
  `${path}.${pid}.${random}.tmp`, and today all five workers share one pid.

- **Whether `prismarine-viewer`'s transitive deps ever `execve`.** It is lazily
  `require`d (`botWorker.ts:69`). The seccomp `execve` denial should be
  validated with a viewer tab open before it ships.
- **Whether the polkit rule is acceptable** to whoever administers the box. It
  is a precondition for the systemd route, and the watchdog's `forceRestart`
  path is not optional.
- **Idle-worker cost.** `maxBots: 10` templated units means either ten
  always-on Node processes (~500 MB idle when two bots run) or on-demand
  `systemctl start`, which needs the same polkit authority. Unresolved.
- **CPU under a healthy fleet.** The 0.20 load measured here is not
  representative — every LLM provider is drained, so bots are failing fast
  rather than doing real codegen and pathfinding. `HANDOFF` §6/§7 recorded
  sustained 2.5–4.7 on the *old* 2-core box; on 8 cores that is comfortable but
  not free.

---

## 9. Recommendation

**Do §6 now.** Items 1–4 are small, they are live exposures rather than
hypotheticals, and 1–2 reduce more risk than the migration does.

**Do the seccomp `execve` denial now, standalone.** There is no
`child_process` anywhere in the worker's import graph (§2), so it costs
approximately nothing and it removes `sh`, `curl` and `python` from escaped
code. Highest value per unit of risk in the whole program, and it depends on
nothing else. Validate with a viewer tab open first (§8).

**Treat §5 as a separate, scoped project, and stage it behind a single-bot
canary.** Run `mc-fleet-worker@0` as a unit alongside four threaded workers,
keep both restart owners visible, and watch it through a real OOM cycle before
converting the rest. This is the most-exercised recovery path in the system
(80 OOM kills measured) and the least covered by tests (zero, §8). A big-bang
cutover risks trading a real-but-partial security gain for a fleet that no
longer reliably recovers — and since the escape has been live for the entire
history of the project, **there is no urgency that justifies that trade.**

Decide the polkit rule first; it is a precondition, and per §5b(3) it sits on
the self-healing path rather than the admin path.

The resource objection is **dead** — it was the strongest-sounding argument
against this design and it does not survive measurement (§2). But the cost has
moved somewhere worse than memory: transport rewrite, polkit, async bootstrap,
handshake auth, stagger relocation, restart-policy reconciliation,
uid/file-ownership work, and splitting a state machine that has conflated two
concepts since it was written. Six of the eight highest-cost items are in that
tail, not in the transport.

**The honest case against**, stated so the record is not one-sided: it rests
entirely on §7 item 1. If an escaped skill still reaches the LLM client over
IPC and reads whatever the worker uid can read, this migration converts
"escape gets the service account" into "escape gets a *narrower* service
account plus a working exfiltration path." That is a genuine improvement and
not theatre — but **the design closes the blast radius, not the channel**, and
anyone approving it should be approving that, not a clean win.

**Do not** revive the fork+uid route without re-reading §3.
