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
| Projected as processes | ~193 MB/bot → **5 bots ≈ 1.1 GB, 10 ≈ 2.0 GB** | Against 14.5 GB available. **Memory is not a constraint.** |
| Service identity | `User=ianwalmsley`, `Group=ianwalmsley` | Not root. |
| Service capabilities | **`CapPrm=0 CapEff=0 CapAmb=0`** | Cannot `setuid`. `fork({uid,gid})` → `EPERM`, confirmed. |
| `NoNewPrivs` | `1` | Independently blocks a setuid helper. Two locks, two keys. |
| `kernel.yama.ptrace_scope` | **`1`** | A same-uid child **cannot** ptrace the parent, so the parent's in-memory key is out of reach. Same-uid exposure reduces to what the key touches **on disk**. |
| `apparmor_restrict_unprivileged_userns` | `1` | The bwrap/userns fallback needs an AppArmor profile. Fragile; not recommended. |
| `child_process` in worker import graph | **none** | A seccomp filter denying `execve` is cheap and high-value — no `sh`, `curl`, or `python` for escaped code. |
| Sudo for service user | `(ALL) NOPASSWD: ALL` | Was the escape→root path. Severed 2026-08-07 by `NoNewPrivileges=yes`; exposure 9.2 UNSAFE → 7.3 MEDIUM. |

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

- **`design-regression` did not deliver.** The feature-by-feature breakage
  inventory (build coordination, supply chains, town brain, campaigns,
  missions, dashboard Socket.IO) and an independent cost verdict are therefore
  missing. The resource question was answered by direct measurement (§2)
  instead; the feature question was not.
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

**Treat §5 as a separate, scoped project** with an explicit decision on the
polkit rule first. The security gain is real but partial (§7 item 1 survives
any design), and it now costs a transport rewrite, an async bootstrap
restructure, handshake authentication, and a privilege grant. The
`MemoryMax=` and native-crash-isolation wins are genuine and arguably justify
it on reliability grounds alone — but that is a decision to take deliberately,
not a side effect of a security fix.

**Do not** revive the fork+uid route without re-reading §3.
