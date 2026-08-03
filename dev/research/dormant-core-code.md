# Dormant code in the bot / voyager core

**Date:** 2026-07-24 · **Scope:** `src/voyager/`, `src/bot/`, `src/actions/`, `src/social/`,
`src/personality/`, `src/control/`, `src/build/`, `src/supplychain/`, `src/security/`, `src/worker/`
· **Mode:** read-only. No code changed, no service restarted.

> Framing: *"that idea you had is actually in the code, you're just not calling it."*
> This report finds the built-but-never-fired machinery in the core and ranks it by
> benefit-to-effort.

---

## 0. Method and evidence base

Three independent passes:

1. **Symbol census.** Extracted 1,011 method declarations from the ten in-scope directories,
   then counted every `.<name>(` call site across all 205 `src/*.ts` files and all 241
   `test/**/*.test.ts` files. **88 symbols have zero call sites in `src/`**; 19 of those are
   reachable only from tests (dormant in production but verified), 69 are entirely unreferenced.
   Cross-checked with a bare-identifier frequency table: every symbol reported below has a
   whole-`src/` identifier count of exactly **1** — the declaration itself and nothing else.
   Full table in Appendix A.
2. **Dataflow inspection.** For each subsystem, compared the set of *write* methods that are
   called against the set of *read/query* methods that are called.
3. **Runtime corroboration.** `/var/log/mc-fleet-bot.log` (150 MB) and the live JSON stores in
   `data/`. Where a log line sits inside a code path, its absence is treated as proof the path
   never executed.

**Cross-reference to prior reports.** `dev/research/call-volume-audit.md` covers LLM call
volume, `stuck-bots-diagnosis.md` covers the spawn-location teleport loop,
`hive-mind-design.md` / `knowledge-brain-design.md` / `memory-architecture-design.md` propose
future architecture. None of them enumerate dormant call sites, so this report extends rather
than duplicates them. Where a prior report flagged a symbol (`PlanLibrary.ts:207`,
`CultureManager.ts:301`), it is marked **[extends prior]**.

> **Operational aside, noticed while gathering runtime evidence (not a dormancy finding).**
> `systemctl is-active mc-fleet-bot` reports **active**, but nothing is listening on port 3001:
> `curl http://127.0.0.1:3001/api/health` returns `000` and `ss -tlnp` shows only `*:3000`
> (`next-server`). The bot API is down while systemd believes it is healthy — consistent with the
> `Restart=on-failure` caveat in `CLAUDE.md` (a clean exit is never respawned). Runtime evidence in
> this report therefore comes from the on-disk stores and the 150 MB log, not from live API calls.
> No service was restarted.

### Corrections to previously-assumed dormancy

Two items on the "known dormant" list are **not** dormant. Verified before reporting:

- **`BotManager.startWatchdog` is running.** Called at `src/index.ts:103`.
  `"Bot watchdog started"` = 18 in the log, `"Watchdog:"` = **1,215** (reconnect-disconnected
  615, wedged-worker restart 4, zombie-socket 4). Only `stopWatchdog` (`BotManager.ts:624`) is
  dead — see F14.
- **`WorkerHandle.setDeathListener` (`:750`) is fully wired.** Called from
  `src/server/socketEvents.ts:99` via `wireBot`, applied both to existing workers and to
  `botManager.onBotSpawned`. Chain intact: `botWorker.ts:159` `ipc.notify('bot.died')` →
  `WorkerHandle.ts:313` → `io.emit('bot:died')` → `web/src/components/SocketProvider.tsx`.
- **`CommanderService.setBotManager` (`:241`)** — the setter is uncalled, but the dependency is
  already supplied via the constructor (`src/server/api.ts:188`). Dead setter, no functional
  loss. Delete-only, unlike its sibling `setLLMClient` (F0a).

### The dominant pattern: write-only subsystems

The single most common form of dormancy in this codebase is **not** unreachable code. It is
subsystems whose *ingest* half is fully wired and whose *query* half has zero callers. Data is
collected, persisted, and displayed on the dashboard — but never read back into a decision.
Four subsystems are in this state, and together they account for most of the value below.

| Subsystem | Write methods called | Read methods called | Data on disk |
|---|---|---|---|
| `SharedWorldModel` | 5 of 5 | **0 of 7** (only dashboard `getSnapshot`) | `shared_world.json` |
| `SkillAttribution` | `recordUsage` only | **0 of 5** | `skill_attribution.json`, 132 KB |
| `PlanLibrary` | `savePlan` only | **0 of 3** | plan store |
| `BotReputation` | `recordEvent` only | **0 of 4** (only dashboard) | reputation store |

---

## Tier 0 — dormant *and* actively lying about it

These three are worse than dormant: the surrounding code reports success, so the failure is
invisible. Fix these first.

### F0a. The Commander's LLM parser has never executed — one line, hard-coded `null`

| | |
|---|---|
| **Symbols** | `CommanderService.llmClient` `src/control/CommanderService.ts:197`, setter `setLLMClient` `:237` (zero call sites) |
| **Why dormant** | Constructed with a hard-coded null at `src/server/api.ts:186`: `llmClient: null, // LLM wired later if available`. `llmParse()` (`:859`) opens with `if (!this.llmClient) return null;` (`:864`), so `parseCommand` (`:612`) always falls through to the ~200-line **regex fallback** at `:627`. |

**Evidence.** `"Commander: attempting LLM parse"` is logged at `CommanderService.ts:868` — the
first statement *after* the null guard. Count in the 150 MB log: **0**. The LLM path has never
run, not once.

**Wiring — one line.** `botManager.getLLMClient()` already exists (`src/bot/BotManager.ts:553`)
and is already consumed 120 lines further down the same file, at `src/server/api.ts:313`, for
`ChronicleGenerator`. Change `llmClient: null` → `llmClient: botManager.getLLMClient()`.

**Benefit.** `LLM_COMMANDER_SYSTEM_PROMPT` and the clarification/mission parsers at `:905-945`
are all written and unreachable. This upgrades the entire `/api/commander/parse|execute|clarify`
surface from keyword regexes to real intent parsing with confidence scores, multi-command plans
and clarifying questions. **Best benefit-to-effort ratio in the repo.**

---

### F0b. Six worker commands are dropped silently — and reported as succeeded

`CommandCenter` sends these to the worker: `walkTo` (×6 call sites), `follow`, `returnToBase`
(×2), `depositInventory`, `equipBest`, `unstuck`
(`src/control/CommandCenter.ts:554,563,580,585,594,599,602,628,651,660,664,668`).

The worker's command switch (`src/worker/botWorker.ts:173-266`) handles only
`disconnect, reconnect, releaseQuarantine, setMode, queueTask, reorderQueue, clearQueue,
queueChat, swarmDirective, chat, setBotState, pauseVoyager, resumeVoyager, stopMovement,
config:patch`. **None of the six are handled, and the switch has no `default:` case** — the
`default:` at `:352` belongs to the *request* switch, not the command switch. `WorkerHandle.
sendCommand` (`:539`) is a bare pass-through, so nothing intercepts on the main thread either.

**The failure is silent and inverted:** `executeHandler` returns a success object immediately
(e.g. `return { walkingTo: {x,y,z} }`) and `dispatchCommand` (`CommandCenter.ts:208-213`) marks
the command **`succeeded`**. The dashboard reports "walked to coords / following player /
returned to base / deposited inventory / unstuck" while the bot does nothing.

**Command types rendered inert:** `walk_to_coords`, `move_to_marker`, `follow_player`,
`return_to_base`, `regroup`, `guard_zone`, `patrol_route`, `deposit_inventory`, `equip_best`,
`unstuck` — 10 of 14. The entire marker/zone/route control surface built in `MarkerStore` never
reaches a bot.

**Wiring.** Add the six cases in `botWorker.ts` (the action helpers already exist:
`src/actions/walkTo.ts`, `src/actions/moveHelper.ts`, `src/actions/followPlayer.ts`,
`src/actions/patrol.ts`), plus a `default:` that `logger.warn`s the unhandled type so this class
of bug can never recur silently.

---

### F0c. `pause_voyager` / `resume_voyager` send the wrong message and downgrade the bot

```ts
// src/control/CommandCenter.ts:537, :541
case 'pause_voyager':  worker.sendCommand('setMode', { pause: true });
case 'resume_voyager': worker.sendCommand('setMode', { pause: false });
```

The worker's `setMode` handler (`src/worker/botWorker.ts:188`) reads `cmdData.mode`, which is
`undefined` in both cases:

```ts
instance.setMode(cmdData.mode === 'codegen' ? BotMode.CODEGEN : BotMode.PRIMITIVE);
```

So **both pause *and* resume force the bot out of CODEGEN into PRIMITIVE** — killing the Voyager
loop instead of pausing it, and making "resume" destructive rather than restorative.

**The correct handlers already exist and are unused from here:** `WorkerHandle.pauseVoyager()` /
`resumeVoyager()` (`src/worker/WorkerHandle.ts:611` / `:615`) send `pauseVoyager` /
`resumeVoyager`, which `botWorker.ts:219` / `:222` handle properly via
`getVoyagerLoop()?.pause(reason)` / `.resume()`.

**Wiring.** Two-line change to call `worker.pauseVoyager('command-center')` /
`worker.resumeVoyager()`. This is a live bug, not merely dormancy.

---

## Tier 1 — high benefit, low effort

### F1. Blackboard GC never runs; 100% of the blackboard is garbage

| | |
|---|---|
| **Symbols** | `BlackboardManager.gcTerminalTasks` `src/voyager/BlackboardManager.ts:372`<br>`BlackboardManager.gcStaleScheduleTasks` `src/voyager/BlackboardManager.ts:338`<br>`BlackboardManager.existsOpenWithDescription` `src/voyager/BlackboardManager.ts:316` |
| **Built to do** | Evict terminal (`blocked`/`completed`) tasks and stale schedule tasks, and dedupe a task that is already open with the same `(description, source)`. |
| **Why dormant** | Zero call sites in `src/`. `gcStaleScheduleTasks` is called by 3 tests, so it is verified but never scheduled. |

**Evidence — the state these functions were written to prevent is the state we are in now:**

```
data/blackboard.json  →  94 tasks
  by status: blocked 59, completed 35      ← 100% terminal, 0 pending, 0 claimed
  by source: swarm 94
  duplicate (description, source) groups: 3 → 48 redundant rows
     47 × "Mine the new iron_ingot deposit"
```

`grep -c "GC removed" /var/log/mc-fleet-bot.log` → **0**. The GC has never run in this log.

Their own doc comments describe damage already observed in production: *"the blackboard
accumulated thousands of `blocked` rows (4,327 observed on 2026-05-28)"*. `blockTask` only flips
status — nothing else ever evicts a terminal row.

**Wiring — one line each.** The sibling GC `releaseStale()` is *already* called every loop pass
at `src/voyager/VoyagerLoop.ts:1172`. Both GCs can be called at that exact site. Note the worker
boundary: `BlackboardProxy` (`src/worker/proxies/BlackboardProxy.ts`) exposes `releaseStale` at
:94 and `WorkerHandle` dispatches it at `src/worker/WorkerHandle.ts:236`; the two GCs need the
same two-line proxy + handler addition, or should be driven from the main thread on a timer
(cheaper — they are global, not per-bot).

**Benefit.** Bounded `blackboard.json`; `getState()` stops deep-walking a growing dead array on
every read (it is an IPC `request` per bot per loop). Wiring `existsOpenWithDescription` into
`addTask` would have prevented 48 of the current 94 rows at creation time.

---

### F2. `DungeonMaster.resolveEvent` is never called — events regenerate forever

| | |
|---|---|
| **Symbol** | `DungeonMaster.resolveEvent` `src/voyager/DungeonMaster.ts:90` |
| **Built to do** | Mark a world event resolved once the fleet completes its tasks. |
| **Why dormant** | Zero call sites. Events are only ever closed by `expireOldEvents()` (timeout), never by success. |

**Evidence:**

```
grep -c "DungeonMaster generated event" /var/log/mc-fleet-bot.log  →  47
grep -c "DungeonMaster resolved event"  /var/log/mc-fleet-bot.log  →   0
```

47 generated, 0 resolved — and `data/blackboard.json` holds exactly **47** copies of
`"Mine the new iron_ingot deposit"`. This is the direct cause of F1's duplicate pile.

**The causal chain, end to end:**

```
resolveEvent never called
  → resource_scarcity event never closes on success
  → tryResourceScarcity (DungeonMaster.ts:113) re-fires every cooldown
  → 2 new blackboard tasks per fire (DungeonMaster.ts:151-152)
  → existsOpenWithDescription (F1) not wired, so no dedupe
  → gcTerminalTasks (F1) not wired, so no eviction
  → 47 identical tasks, blackboard 100% garbage
```

**Wiring.** Call `resolveEvent(eventId)` when the tasks belonging to an event reach
`completed` — `BlackboardManager.addTask` already threads a `goalId`, which is the natural key.
Cheapest partial fix: have `tryResourceScarcity` skip generation when an unresolved event of the
same type is already active (`getActiveEvents()` is already implemented and already called).

**Benefit.** Stops the largest single source of junk tasks, junk codegen calls, and wasted LLM
spend in the fleet. Note `tryResourceScarcity` treats `iron_ingot` as scarce whenever supply < 5,
and its own comment concedes *"bots mine iron_ore but never smelt"* — so this loop is structurally
unable to terminate on its own.

---

### F3. `SkillAttribution` is write-only — 132 KB of skill success data that gates nothing

| | |
|---|---|
| **Symbols** | `shouldUseSkill` `src/voyager/SkillAttribution.ts:120`<br>`getSpecialists` `:162`<br>`vote` `:189`<br>`getRecommendedSkills` `:217`<br>`prune` `:252` **[known]** |
| **Built to do** | Gate skill reuse on measured reputation; surface per-personality specialists; let bots vote on skill quality. |
| **Why dormant** | The only method ever called on this object is `recordUsage`, at `src/voyager/VoyagerLoop.ts:1798` (success) and `:1928` (failure). All five read methods have zero call sites. |

**Evidence — the data is rich and completely unused:**

```
data/skill_attribution.json (132 KB)
  reputations : 70 skills
  usageHistory: 384 records  (Scout 217, Steward 62, Mason 58, Architect 30, Surveyor 17)
  votes       : 0            ← vote() has never been called

worst skills by success rate (>= 10 uses):
  0.18   45 uses  findAndEatFoodUrgently     ← fails 82% of the time, still selected
  0.64  181 uses  walkToTheNearestShore
```

`grep -c "shouldUseSkill" /var/log/mc-fleet-bot.log` → 0.

**Benefit, quantified.** `findAndEatFoodUrgently` has been executed 45 times at an 18% success
rate. A `shouldUseSkill` reputation gate is exactly the guard that stops this — ~37 wasted
executions on one skill alone, each carrying a codegen retry. This is the clearest
value-per-line-of-wiring item in the report.

**Wiring.** Consult `shouldUseSkill` at the skill-selection site in `VoyagerLoop` before reusing
a retrieved skill; fall through to regeneration when it returns false.

**Secondary defect found while tracing this:** `src/bot/BotInstance.ts:1475` constructs
`new SkillAttribution('./data')` **per bot instance**, and bots run in separate worker threads.
Five instances each hold full state in memory and persist to the same
`data/skill_attribution.json` — last-writer-wins, so cross-bot attribution records are being lost.
Unlike `SharedWorldModel` and `BlackboardManager` (main-thread singletons reached over IPC),
this one was never given a proxy.

---

### F4. Reputation callback: plumbed end-to-end, fired zero times

| | |
|---|---|
| **Symbol** | `VoyagerLoop.reputationNotify` — field `src/voyager/VoyagerLoop.ts:201`, setter `setReputationNotifier` `:550` |
| **Why dormant** | The setter is called, but the field is **never invoked**. `grep -n reputationNotify src/voyager/VoyagerLoop.ts` returns exactly two lines: the declaration and the setter. |

The full transport exists and demonstrably runs:

```
botWorker.ts:146      onReputationEvent → ipc.notify('reputation.recordEvent')
WorkerHandle.ts:302   handler for 'reputation.recordEvent'
WorkerHandle.ts:745   setReputationListener(fn)
BotInstance.ts:1478   voyagerLoop.setReputationNotifier(this.onReputationEvent)
VoyagerLoop.ts:550    this.reputationNotify = fn     ← assigned, never called

grep -c "Decision trace + reputation notifier wired" /var/log/mc-fleet-bot.log → 1416
```

**1,416 initialisations, zero events emitted.** `BotReputation` therefore only ever receives
events from `src/server/socketEvents.ts:97` (chat/social), never from task execution — so
reliability and cooperation scores are computed from social chatter alone.

**Wiring.** Call `this.reputationNotify?.({...})` at the task-complete and task-fail sites
(`VoyagerLoop.ts:1798` / `:1928`) — the same two places `recordUsage` is already called.

**Benefit.** Makes `BotReputation` reflect actual work. Unblocks F7.

---

### F5. `hasStrongBlocker` fires 0 times — the threshold is fine, the *key* is wrong **[extends known]**

The known finding is that `hasStrongBlocker` (`src/voyager/BlockerMemory.ts:50`) never fired
against 12,943 failures. The assumed cause is a too-high threshold. **That is not the cause.**

```ts
hasStrongBlocker(task) { return this.getTaskBlockers(task).some(r => r.count >= 2); }
getTaskBlockers(task)  { return this.records.filter(r => r.task === task.description); }
```

Records are keyed on the **exact task description string**. Current `data/blockers.json`:

```
29 records — count distribution: {1: 25, 2: 3, 6: 1}   (max 6, so >= 2 IS reachable)
```

25 of 29 sit at `count = 1` because the curriculum almost never emits a description verbatim
twice. Corroborating evidence from the skill library: **395 of 936 files in `skills/` carry a
`_vN` suffix** (`mine_1_oak_log_v33`, `_v34`, `_v35`, …) — the same goal regenerated under a
slightly different description over and over, each one a fresh blocker key that can never
aggregate to 2.

**Wiring.** Normalise the key before lookup (lowercase, strip digits and `_vN`, collapse
whitespace) — the same normalisation already applied ad hoc elsewhere. Do **not** lower the
threshold; that would make `isOnCooldown` (which *is* wired, at `VoyagerLoop.ts:1278`) fire on
single transient failures.

**Benefit.** The blocker memory starts suppressing doomed tasks, which is the direct lever on
the wasted-codegen volume quantified in `call-volume-audit.md`.

---

## Tier 2 — high benefit, moderate effort

### F6. `SharedWorldModel` is write-only *by construction* — the worker proxy has no read methods

| | |
|---|---|
| **Symbols** | `queryResourcesNear` `src/voyager/SharedWorldModel.ts:197`, `getIdleBots` `:221`, `getBotPositions` `:225`, `getExplorationGaps` `:232`, `getResourceSupply` `:262`, `isAreaSafe` `:270`, `mergeFromBotMemory` `:316` — all zero call sites. `queryThreatsNear` `:209` is called only by `isAreaSafe`, which is itself dormant. |

Writes are fully wired (`updateBotState`, `markChunkExplored`, `updateServerState`, `reportThreat`
at `VoyagerLoop.ts:1000-1021`). Reads are not — and cannot be. The root cause is structural:

```ts
// src/worker/proxies/SharedWorldProxy.ts
/** All updates are fire-and-forget notifications; reads go via request(). */
```

**The proxy's own doc comment promises reads, and the class contains none** — five `notify`
methods, zero `request` methods. Bots live in worker threads, so a bot physically cannot read the
shared world model. `WorkerHandle.ts:401-404` likewise handles only the four write message types.
The only reader in the entire process is the dashboard route
`src/server/routes/botsRoutes.ts:288`.

**Also: `reportResource` has no producer at all.** The proxy method, the IPC handler
(`WorkerHandle.ts:401`), the storage and the query all exist, but nothing in `VoyagerLoop` ever
calls it. Confirmed on disk:

```
data/shared_world.json → resources: 0, threats: 0, bots: 5, exploredChunks: 212
```

`resources` is structurally guaranteed to stay empty, so `queryResourcesNear` and
`getResourceSupply` could only ever return nothing even if they were called.

**Wiring.** (a) Add `request`-based read methods to `SharedWorldProxy` + matching handlers in
`WorkerHandle.handleRequest`; (b) call `reportResource` from the observation feed at
`VoyagerLoop.ts:993`; (c) consume `getExplorationGaps` in exploration task selection and
`isAreaSafe` before travel.

**Benefit.** This is the actual hive mind. `getExplorationGaps` stops five bots re-exploring the
same 212 chunks; `isAreaSafe` lets one bot's death inform the other four. Highest ceiling in the
report, but it is real plumbing work, not a one-liner — hence Tier 2.

---

### F7. `BotReputation` read API unused — trust scores influence nothing

`getMostReliable` `src/voyager/BotReputation.ts:131`, `getMostCooperative` `:139`,
`shouldTrust` `:147`, `getBotComparison` `:177` — all zero call sites. Only `recordEvent`
(`src/server/socketEvents.ts:97`) writes; only the dashboard
(`src/server/routes/botsRoutes.ts:293,297`) reads.

**Wiring.** Consult `shouldTrust` in `BotComms` message handling and `getMostReliable` in
`CrewSelector` / squad assignment. Depends on **F4** to be meaningful.

---

### F8. `SwarmCoordinator` plans are created but never monitored

`monitorProgress` `src/voyager/SwarmCoordinator.ts:290`, `handleBlocker` `:347`,
`cancelPlan` `:410` — zero call sites. The only method ever used is `decomposeGoal`
(`src/bot/BotManager.ts:590`).

Swarm plans are decomposed into blackboard tasks and then abandoned: no progress tracking, no
re-planning when a step blocks, no cancellation path. This is a direct contributor to F1 — the
swarm-source tasks that pile up are exactly the ones nothing is monitoring (all 94 rows in
`blackboard.json` are `source: swarm`).

---

### F9. `TradeNegotiator` — the responder is wired, the initiator is not

`proposeTrade` `src/voyager/TradeNegotiator.ts:125`, `getActiveProposals` `:306`,
`completeProposal` `:323`, `expireStale` `:334` — zero call sites.
`evaluateProposal` and `processTradeMessages` **are** called from `VoyagerLoop`.

So bots can *accept* trades but can never *initiate* one. Since `proposeTrade` is the only
producer of proposals, `processTradeMessages` polls an inbox that is guaranteed to be empty and
the whole subsystem is inert. `grep -c proposeTrade /var/log/mc-fleet-bot.log` → 0.

**Wiring.** Call `proposeTrade` when a bot detects a material shortfall it cannot self-satisfy
(`DependencyResolver.canCraft`, `src/voyager/DependencyResolver.ts:229` — itself zero-call in
`src/`, tested only — is the natural trigger). Also wire `expireStale` next to the existing
`releaseStale` tick.

---

## Tier 3 — narrower scope

### F10. `PlanLibrary` is write-only, and what it stores is degenerate **[extends prior]**

`findBestPlan` `src/voyager/PlanLibrary.ts:90`, `generatePlanWithLLM` `:199`, `adaptPlan` `:240`
— zero call sites. Only `savePlan` is called (`VoyagerLoop.ts:1799`).

`findBestPlan` implements full TF-IDF cosine similarity with keyword-overlap and success-rate
weighting — dead. **Caveat that changes the fix:** the single `savePlan` call stores a
one-step plan whose step *is the task description*, with `estimatedDurationMs: 0` and
`failureRate: 0`. So the library contains no real decompositions, and wiring `findBestPlan` alone
would retrieve nothing useful. This needs `generatePlanWithLLM` (or a real decomposition source)
wired **first** — which is why it sits in Tier 3 despite the sophisticated retrieval code.

### F11. Narration is limited to task-completion

`DecisionNarrator.narrate` is called at exactly one site (`VoyagerLoop.ts:1792`) with a hardcoded
`event: 'task_complete'`. Dormant: `shouldNarrate` `src/voyager/DecisionNarrator.ts:333` (the
probability + rate-limit gate, so gating is bypassed entirely), `formatDiscovery` `:373`,
`formatThreatWarning` `:418`. Bots therefore never narrate discoveries or threats, though both
formatters exist.

### F12. Announcements never reach bot-to-bot comms

`ProactiveCommunicator.formatForBotComms` `src/voyager/ProactiveCommunicator.ts:212` — zero call
sites; only `formatForChat` is used. Discoveries and threats are spoken to human chat but never
forwarded as structured `type|position|details` records to other bots, even though `BotComms` is
injected and actively used for other traffic. Low effort, decent payoff.
Also dormant here: `getRecentAnnouncements` `:239`, `clearHistory` `:248`.

### F13a. Four request handlers in the worker have no sender (diagnostics is NOT one of them)

The complete set of main→worker request types actually sent via `WorkerHandle.sendRequest`
(`:581`, the only sender path) is `getDetailedStatus, getBlockAt, getBotVersion, getPlayers,
getTerrainGrid, getViewerPort, isBotConnected, voyagerTaskState`. Four `case` arms in the request
switch therefore have no sender: `getStatus` (`src/worker/botWorker.ts:273`),
`getDiagnosticsSummary` (`:277`), `getSkillNames` (`:291`), `getSkillCode` (`:295`).

**Correction — diagnostics are live.** It is tempting to conclude `getDiagnosticsSummary` is
dormant, and that is wrong. `BotInstance.getDiagnosticsSummary()`
(`src/bot/BotInstance.ts:2313-2344`) **is** invoked, at `src/worker/botWorker.ts:367`, inside the
5-second `status.update` push. The main thread stores it (`WorkerHandle.ts:291`
`this.lastDiagnostics = data.diagnostics`) and `GET /api/bots/:name/diagnostics`
(`src/server/routes/botsRoutes.ts:568`) serves it via `getCachedDiagnostics()`
(`WorkerHandle.ts:726`). Only the *pull* variant is redundant. Verified end-to-end.

So all four are **safe deletions, not wiring candidates**: `getStatus` is superseded by the same
push (`botWorker.ts:362-377`), `getSkillNames`/`getSkillCode` by
`src/server/routes/skillRoutes.ts`, which reads `skills/index.json` off disk. One caveat worth
noting: reading skills from disk means a worker's *in-memory* `SkillLibrary` is never queryable,
which matters only if runtime-learned skills aren't flushed promptly.

### F13b. Task-queue manipulation implemented on both ends, with no path between them

`reorderQueue` (`botWorker.ts:197` → `VoyagerLoop.reorderQueue`, `src/voyager/VoyagerLoop.ts:758`)
and `clearQueue` (`botWorker.ts:200` → `VoyagerLoop.ts:768`) are fully implemented in the worker
and in the loop. `grep -rn "sendCommand('reorderQueue'\|sendCommand('clearQueue'" src/` = **0** —
no `WorkerHandle` method and no route reaches them. Wiring is one wrapper + one route each;
benefit is drag-to-reorder and clear-queue for the Voyager task queue from the dashboard.

### F13c. `MOVEMENT_COMMAND_TYPES` — declared, never read

`src/control/CommandCenter.ts:52-58` declares a `ReadonlySet<CommandType>` of `walk_to_coords,
move_to_marker, follow_player, patrol_route, guard_zone`. Whole-`src/` grep = exactly 1 hit, the
declaration. It was evidently meant to gate movement commands (geofence check, or
supersede/cancel-active-movement policy). Note `cancelActiveCommandForBot`
(`CommandCenter.ts:206`) currently cancels *any* active command regardless of category — the
likely intended home for this set. Pair with F0b; same subsystem.

### F14. `stopWatchdog` is dead, and that is a shutdown-race hazard

`src/bot/BotManager.ts:624`, zero call sites. The 30 s `setInterval` at `:620` is **not
`unref`'d** (contrast `sharedWorldPruneTimer.unref?.()` at `:112`). Shutdown ends in
`process.exit(0)` (`src/index.ts:379`) so this doesn't hang exit, but
`await botManager.terminateAllWorkers()` (`src/index.ts:373`) can race a watchdog tick:
`watchdogTick` sees `now - lastStatusReceivedAt > 90s` on a just-terminated worker and calls
`void handle.forceRestart()` (`BotManager.ts:662`), **resurrecting a worker mid-shutdown**.
Fix: call `stopWatchdog()` at the top of `shutdown()`. Tiny effort, removes a real corruption path.

### F15. Socket events broadcast to a UI that has no listener

Cross-referencing every `io.emit` literal in `src/` against every `socket.on` literal in
`web/src`:

| Event | Emitted at | Frontend listeners |
|---|---|---|
| `world:event` | `src/index.ts:209` | 0 |
| `town:event` | `src/server/api.ts:273` | 0 |
| `town:chronicle` | `src/server/api.ts:327`, `src/server/routes/townRoutes.ts:382` | 0 |
| `town:disaster` | `src/town/DisasterRecorder.ts:124` | 0 |
| `build:demolished` | `src/build/BuildCoordinator.ts:425` | 0 |
| `build:tunnel` | `src/build/BuildCoordinator.ts:623` | 0 |
| `build:gathering` | `src/build/BuildCoordinator.ts:1788` | 0 |
| `build:placing` | `src/build/BuildCoordinator.ts:1809` | 0 |
| `build:reassign` | `src/build/BuildCoordinator.ts:2555` | 0 |
| `build:gather-started` | `src/build/BuildCoordinator.ts:2904` | 0 |

`world:event` / `town:*` are the notable miss: the DungeonMaster is genuinely active (F2) and
every event it generates is broadcast to a UI that ignores it. Four `socket.on` handlers in
`web/src/components/SocketProvider.tsx` would surface an already-running subsystem. The six
`build:*` entries are fine-grained telemetry the UI consumes only at `build:progress` /
`build:bot-status` granularity — add or delete.

**Reverse direction is benign.** `zone:created`, `zone:deleted`, `route:created`,
`route:deleted`, `marker:deleted` are listened for in `SocketProvider.tsx:231-238` but never
emitted — `MarkerStore` collapses create/update/delete into `WORLD_EVENTS.ZONE_UPDATED` /
`ROUTE_UPDATED` / `MARKER_UPDATED` (`src/control/MarkerStore.ts:194,209,220,239,249,260,279,289`),
which the frontend also listens to. Redundant listeners only; every op does trigger a refetch.

### F16. Two shared stores instantiated per-process with no proxy (data-loss risk)

Not dormancy, but found while tracing it, and the same root cause as F3's secondary defect:

- `SkillAttribution` — `new SkillAttribution('./data')` per bot (`src/bot/BotInstance.ts:1475`).
- `SocialMemory` — instantiated **twice** against the same directory: main thread
  (`src/bot/BotManager.ts:94`) and once per worker (`src/bot/BotInstance.ts:209`), both
  `path.join(process.cwd(), 'data')`.

N+1 processes debounce-writing the same JSON file is last-writer-wins. Every other shared manager
goes through `src/worker/proxies/*`; these two have no proxy. Worth a dedicated pass.

**Clean bill of health elsewhere in the IPC layer:** all 32 worker→main request types
(`src/worker/proxies/*.ts`) have handlers at `WorkerHandle.ts:208-282`, and all 8 notify types
(`botWorker.ts:144-168`) have handlers at `WorkerHandle.ts:287-355`. No gaps in either direction.
Separately, `config:patch` **is** correctly wired (`WorkerHandle.postConfigPatch:554-568` ←
`src/server/routes/configRoutes.ts:105`), but `"config:patch"` and `"Runtime config
hot-reloaded"` both log **0** times — the hot-reload path has never been exercised in
production. Smoke-test it before relying on it.

### F17. Category 4 (constructed-but-never-invoked): nothing found

Every `new X()` field in `BotManager.ts:92-122` and `BotInstance.ts` was checked against
repo-wide reads. All 16 `BotManager` subsystems are read outside the constructor —
`dungeonMaster` (`:114`) at `src/index.ts:198,213`; `swarmCoordinator` (`:113`) at
`BotManager.ts:590`; `impersonationMonitor` (`:122`) at `BotManager.ts:378`;
`playerPositionCache` / `playerPresenceTracker` / `playerIntentModel` from
`src/server/routes/eventsRoutes.ts`; the rest injected into `WorkerHandle` at `:203-236`.
This category is clean.

### F18. Misc. confirmed-dormant, low individual value

- `DifficultyBalancer.shouldOfferHelp` `:144`, `getEventIntensityMultiplier` `:167` — adaptive
  difficulty computes modifiers that are consumed, but these two hooks are not.
- `OpportunityDetector.getHighValueOpportunities` `:120` — only the unfiltered `scan()` is used.
- `SpatialIndex.remove` `:49`, `queryChunk` `:94`, `getCell` `:167` — the index is used only via
  `WorldMemory`, which never removes or does chunk-scoped lookups. Records accumulate.
- `WorldMemory.setBot` `:55`, `queryNearby` `:137`.
- `AgentState.getThreat` `:67`, `getOpportunities` `:71`, `getSurvivalGoal` `:75` — superseded by
  the `getFreshX` variants, which are wired. **Benign; delete rather than wire.**
- `SkillLibrary.getSkillCount` `:148`, `PlayerIntentModel.getActionHistory` `:489`,
  `CultureManager.extractMemesWithLLM` `:290` / `listMemes` `:195` / `getMeme` `:199`
  **[extends prior — `CultureManager.ts:301`]**.

---

## Appendix A — full zero-call census (88 symbols)

Every symbol below has **zero `.name(` call sites in `src/`**. "tests only" means the sole
callers are in `test/**` — verified but dormant in production.

| Symbol | Location | Callers |
|---|---|---|
| `cancel` | `src/actions/patrol.ts:8` | none |
| `isBreakingCharacter` | `src/bot/BotInstance.ts:2106` | none |
| `isQuarantined` | `src/bot/BotInstance.ts:945` | none |
| `stopWatchdog` | `src/bot/BotManager.ts:624` | none |
| `getPlayerNames` | `src/bot/PlayerPresenceTracker.ts:56` | tests only (1) |
| `listRaw` | `src/build/SchematicMatcher.ts:155` | none |
| `getCountByStatus` | `src/control/CommandCenter.ts:326` | none |
| `getRecentFailedCount` | `src/control/CommandCenter.ts:334` | none |
| `setLLMClient` | `src/control/CommanderService.ts:237` | none |
| `setBotManager` | `src/control/CommanderService.ts:241` | none |
| `storePlan` | `src/control/CommanderService.ts:336` | none |
| `findNearestMarker` | `src/control/MarkerStore.ts:296` | tests only (1) |
| `isInsideZone` | `src/control/MarkerStore.ts:317` | tests only (6) |
| `getRunningCount` | `src/control/MissionManager.ts:266` | none |
| `getStaleCount` | `src/control/MissionManager.ts:274` | none |
| `checkMissionProgress` | `src/control/MissionManager.ts:572` | tests only (2) |
| `getBotMissionQueue` | `src/control/MissionManager.ts:596` | tests only (1) |
| `setOverride` | `src/control/RoleManager.ts:158` | tests only (7) |
| `shouldBotAcceptTask` | `src/control/RoleManager.ts:61` | none |
| `getActiveExecution` | `src/control/RoutineManager.ts:168` | none |
| `captureStep` | `src/control/RoutineManager.ts:280` | none |
| `getSquadsForBot` | `src/control/SquadManager.ts:182` | tests only (6) |
| `getByCategory` | `src/control/TemplateManager.ts:258` | none |
| `getTopRelationships` | `src/personality/AffinityManager.ts:164` | none |
| `getForBot` | `src/security/ImpersonationMonitor.ts:84` | tests only (3) |
| `registerListener` | `src/social/BotComms.ts:136` | none |
| `removeListeners` | `src/social/BotComms.ts:142` | none |
| `constructor` | `src/social/BotComms.ts:35` | none |
| `listMemes` | `src/social/CultureManager.ts:195` | tests only (2) |
| `getMeme` | `src/social/CultureManager.ts:199` | tests only (3) |
| `extractMemesWithLLM` | `src/social/CultureManager.ts:290` | none |
| `register` | `src/voyager/ActionTemplates.ts:226` | tests only (6) |
| `getThreat` | `src/voyager/AgentState.ts:67` | tests only (5) |
| `getOpportunities` | `src/voyager/AgentState.ts:71` | tests only (5) |
| `getSurvivalGoal` | `src/voyager/AgentState.ts:75` | tests only (6) |
| `existsOpenWithDescription` | `src/voyager/BlackboardManager.ts:316` | none |
| `gcStaleScheduleTasks` | `src/voyager/BlackboardManager.ts:338` | tests only (3) |
| `gcTerminalTasks` | `src/voyager/BlackboardManager.ts:372` | none |
| `getMostReliable` | `src/voyager/BotReputation.ts:131` | none |
| `getMostCooperative` | `src/voyager/BotReputation.ts:139` | none |
| `shouldTrust` | `src/voyager/BotReputation.ts:147` | none |
| `getBotComparison` | `src/voyager/BotReputation.ts:177` | none |
| `shouldNarrate` | `src/voyager/DecisionNarrator.ts:333` | none |
| `formatDiscovery` | `src/voyager/DecisionNarrator.ts:373` | none |
| `formatThreatWarning` | `src/voyager/DecisionNarrator.ts:418` | none |
| `canCraft` | `src/voyager/DependencyResolver.ts:229` | tests only (2) |
| `shouldOfferHelp` | `src/voyager/DifficultyBalancer.ts:144` | none |
| `getEventIntensityMultiplier` | `src/voyager/DifficultyBalancer.ts:167` | none |
| `resolveEvent` | `src/voyager/DungeonMaster.ts:90` | none |
| `getHighValueOpportunities` | `src/voyager/OpportunityDetector.ts:120` | none |
| `generatePlanWithLLM` | `src/voyager/PlanLibrary.ts:199` | none |
| `adaptPlan` | `src/voyager/PlanLibrary.ts:240` | none |
| `findBestPlan` | `src/voyager/PlanLibrary.ts:90` | none |
| `getActionHistory` | `src/voyager/PlayerIntentModel.ts:489` | none |
| `formatForBotComms` | `src/voyager/ProactiveCommunicator.ts:212` | none |
| `getRecentAnnouncements` | `src/voyager/ProactiveCommunicator.ts:239` | none |
| `clearHistory` | `src/voyager/ProactiveCommunicator.ts:248` | none |
| `queryResourcesNear` | `src/voyager/SharedWorldModel.ts:197` | none |
| `getIdleBots` | `src/voyager/SharedWorldModel.ts:221` | none |
| `getBotPositions` | `src/voyager/SharedWorldModel.ts:225` | none |
| `getExplorationGaps` | `src/voyager/SharedWorldModel.ts:232` | none |
| `getResourceSupply` | `src/voyager/SharedWorldModel.ts:262` | none |
| `isAreaSafe` | `src/voyager/SharedWorldModel.ts:270` | none |
| `mergeFromBotMemory` | `src/voyager/SharedWorldModel.ts:316` | none |
| `shouldUseSkill` | `src/voyager/SkillAttribution.ts:120` | none |
| `getSpecialists` | `src/voyager/SkillAttribution.ts:162` | none |
| `vote` | `src/voyager/SkillAttribution.ts:189` | none |
| `getRecommendedSkills` | `src/voyager/SkillAttribution.ts:217` | none |
| `prune` | `src/voyager/SkillAttribution.ts:252` | none |
| `getSkillCount` | `src/voyager/SkillLibrary.ts:148` | none |
| `getCell` | `src/voyager/SpatialIndex.ts:167` | none |
| `remove` | `src/voyager/SpatialIndex.ts:49` | tests only (4) |
| `queryChunk` | `src/voyager/SpatialIndex.ts:94` | none |
| `monitorProgress` | `src/voyager/SwarmCoordinator.ts:290` | none |
| `handleBlocker` | `src/voyager/SwarmCoordinator.ts:347` | none |
| `cancelPlan` | `src/voyager/SwarmCoordinator.ts:410` | none |
| `proposeTrade` | `src/voyager/TradeNegotiator.ts:125` | none |
| `getActiveProposals` | `src/voyager/TradeNegotiator.ts:306` | none |
| `completeProposal` | `src/voyager/TradeNegotiator.ts:323` | none |
| `expireStale` | `src/voyager/TradeNegotiator.ts:334` | none |
| `getAgentState` | `src/voyager/VoyagerLoop.ts:409` | tests only (4) |
| `getLastDecision` | `src/voyager/VoyagerLoop.ts:679` | tests only (5) |
| `queueSwarmGoal` | `src/voyager/VoyagerLoop.ts:707` | none |
| `queryNearby` | `src/voyager/WorldMemory.ts:137` | none |
| `setBot` | `src/voyager/WorldMemory.ts:55` | none |
| `clearInterval` | `src/worker/botWorker.ts:390` | none |
| `isDestroyed` | `src/worker/IPCChannel.ts:128` | none |
| `setDeathListener` | `src/worker/WorkerHandle.ts:750` | none |

---

## Appendix B — recommended order of work

| # | Item | Effort | Benefit |
|---|---|---|---|
| 0a | **F0a** `llmClient: null` → `botManager.getLLMClient()` | **1 line** | Activates the whole LLM Commander; regex fallback retired |
| 0b | **F0c** `pause_voyager`/`resume_voyager` → `worker.pauseVoyager()` | **2 lines** | Fixes a live bug that downgrades bots to PRIMITIVE |
| 0c | **F0b** six missing `botWorker` cases + a `default:` warn | small | 10 of 14 command types stop silently no-op'ing while reporting success |
| 1 | F2 `resolveEvent` / suppress duplicate active events | ~1 line | Kills the 47-task duplicate loop at source |
| 2 | F1 `gcTerminalTasks` + `gcStaleScheduleTasks` at `VoyagerLoop.ts:1172` | 1 line each + proxy | Bounds `blackboard.json`, cuts per-read CPU |
| 3 | F1 `existsOpenWithDescription` in `addTask` | ~3 lines | Prevents duplicates at creation |
| 4 | F3 `shouldUseSkill` gate | ~5 lines | Stops reuse of an 18%-success skill |
| 5 | F4 fire `reputationNotify` | ~2 lines | Activates a fully-built 1,416×-initialised channel |
| 6 | F5 normalise blocker keys | ~5 lines | Makes blocker suppression work at all |
| 7 | F12 `formatForBotComms` | ~5 lines | Bot-to-bot structured discovery sharing |
| 8 | F9 `proposeTrade` trigger | moderate | Activates an inert subsystem |
| 9 | F8 `monitorProgress` / `handleBlocker` | moderate | Swarm plans become self-correcting |
| 10 | F6 `SharedWorldProxy` read path + `reportResource` producer | real work | The actual hive mind |
| 11 | F3b per-bot `SkillAttribution` → main-thread singleton | moderate | Stops cross-bot data loss |
| 12 | F10 `PlanLibrary` — needs real decompositions first | large | Deferred |
