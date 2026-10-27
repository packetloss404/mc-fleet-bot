# Unreachable backend capability — API, config, sockets, worker IPC

**Date:** 2026-07-24
**Scope:** `src/server/` (api.ts, routes/*, llmRoutes.ts, admin.ts, auth.ts, socketEvents.ts), `src/util/configPersist.ts`, `config.yml`, the Socket.IO event surface, and `src/worker/` IPC.
**Companion:** extends `dev/research/dashboard-audit.md` (page→endpoint coverage, 25 shape mismatches). That audit is not re-derived here. Where this document contradicts it, this one is newer and was verified live.
**Method:** static extraction of all 218 registered routes + all frontend call sites (template-literal aware), cross-checked with `curl` against `127.0.0.1:3001` on a live fleet of 5 connected bots. **Service was not restarted. No code was changed.**

---

## Headline findings

1. **Six of the eight per-bot control endpoints are inert.** `walkto`, `follow`, `return-to-base`, `unstuck`, `equip-best`, `deposit-inventory` return `200 {"success":true,"status":"succeeded"}` while the worker silently discards the command — it has no `case` for them and no `default`. **Verified live: `POST /api/bots/Scout/walkto` completed in 5 ms and Scout never moved to the target.** This is worse than an unreachable endpoint: it is a reachable endpoint that lies.
2. **`POST /api/bots/:name/pause` does not pause — it downgrades the bot to primitive mode.** And `resume` does the same thing. The correct `pauseVoyager`/`resumeVoyager` worker commands exist, work, and are unreachable over HTTP.
3. **`mining` config: the fix is on disk but not running.** `PATCHABLE_SECTIONS` now includes `mining` in both `src/` and `dist/` (built 20:40:46), but the service started 20:29:18, so the live process still refuses it. `GET /api/config/mining` → 400 right now. A restart fixes it — but only for `minDigY`; `mineSite` and `protectedZones` remain unpatchable by design.
4. **A no-op `PATCH /api/config/:section` destroys every comment in `config.yml`.** `validatePatch` drops unknown keys and still returns `ok:true`, and `configRoutes.ts:94` calls `persistConfig` unconditionally. `config.yml` currently carries ~120 lines of incident archaeology (the 2026-07-24 repoint notes). One 200-OK request erases all of it.
5. **`bots.reconnectDelaySec: 60` is silently clamped to 30 s** by a hardcoded ceiling — halving a documented mitigation for a real past incident. This is the same class as the ambient-chat hardcode and is more consequential.
6. **The `SharedWorldModel` read path does not exist, and neither does its main write path.** Five `notify*` writes are proxied, zero reads. Separately, nothing anywhere calls `reportResource`. The fleet resource-sharing feature is inert end to end.
7. **61 of 218 registered endpoints have zero caller** (43 whole paths + 18 method-level). CLAUDE.md's REST documentation is, by contrast, **exactly accurate** — 0 documented-but-missing, 0 genuinely undocumented. Its Socket.IO list is not: **28 emitted events are undocumented.**

---

## PART 1 — Endpoint reachability matrix

**218 routes registered** across `src/server/` (including 8 loop-registered via `makeBotActionRoute`, `src/server/routes/missionCommandRoutes.ts:192-207`, which a naive grep misses).

Reachability classes used below:

- **USED** — a frontend call site exists and the shapes agree.
- **BROKEN** — a caller exists but the request/response shape mismatches (25 catalogued in `dashboard-audit.md`; not repeated).
- **INERT** — a caller exists, HTTP returns success, and the backend does nothing. **New class, see 1.3.**
- **UNREACHABLE** — no caller anywhere: frontend, script, test, or plugin.

### 1.1 Non-frontend callers: there are none

Checked `scripts/`, `tools/`, `test/`, `e2e/`, `docs/`, and the repo at large. Only two consumers exist:

- **Tests** touch 5 endpoints total (`/api/auth/login`, `/api/bots/:name/task`, `/api/bots/:name/grant`). Test coverage does not make an endpoint operator-reachable.
- **The Java plugin does not exist in this repo.** `PLUGIN_AUTH_TOKEN` appears only in `.env.example:16`, commented out. No plugin source anywhere. So all **9 `POST /api/events/*` relays are unreachable in practice** — nothing has ever posted to them from outside.

`scripts/mc_admin.py` uses RCON, not this API.

### 1.2 UNREACHABLE — 43 whole paths (no caller by any method)

| Endpoint | Registered at | What it does |
|---|---|---|
| `POST /api/bots/:name/quarantine/release` | `botsRoutes.ts:124` | Clears an impersonation quarantine. **Incidents are live right now** (`/api/security/impersonation` → 191 b, non-empty). No recovery path in the UI. |
| `GET /api/security/impersonation` | `botsRoutes.ts:118` | The monitor state that would justify the above. |
| `GET /api/bots/:name/inventory` | `botsRoutes.ts:179` | Dedicated inventory read. UI pulls inventory out of `/detailed` instead — this is a redundant duplicate. |
| `GET /api/bots/:name/observed-role` | `botsRoutes.ts:241` | Role inferred from observed action stats. |
| `POST /api/bots/:name/say` | `botsRoutes.ts:460` | Make a bot speak a chat line. |
| `POST /api/bots/:name/bot-message` | `botsRoutes.ts:364` | Inject a bot-to-bot message. |
| `POST /api/bots/:name/grant` | `botsRoutes.ts:484` | Dev-only item grant. Tests use it; no UI. |
| `POST /api/builds/:id/retry` | `buildRoutes.ts:97` | Retry a failed build. |
| `POST /api/builds/:id/demolish` | `buildRoutes.ts:111` | Demolish a completed build. |
| `POST /api/tunnel` | `buildRoutes.ts:128` | Dig a tunnel job. |
| `GET /api/commands/:id` | `missionCommandRoutes.ts:167` | Single-command read. |
| `GET /api/culture` | `botsRoutes.ts:395` | Emergent culture state. |
| `GET /api/events/world` | `botsRoutes.ts:302` | World event feed (1150 b live). |
| `GET /api/players/:name/intent` | `botsRoutes.ts:333` | Inferred player intent. **Also structurally empty — see 4.3.** |
| `GET /api/reputation` | `botsRoutes.ts:292` | Player reputation scores (828 b live). `/api/reputation/:name` *is* used. |
| `GET /api/world/model` | `botsRoutes.ts:287` | Shared world-model snapshot (746 b live). The only reader of `SharedWorldModel.getSnapshot()`. |
| `POST /api/swarm` | `botsRoutes.ts:520` | Set a swarm directive. (Distinct from the blackboard route the UI calls with a wrong body.) |
| `GET /api/swarm/plans` | `botsRoutes.ts:312` | Current swarm plans. |
| `GET /api/roles/approvals` | `controlRoutes.ts:114` | Role approval queue — renders a permanently empty panel. |
| `GET /api/roles/overrides` | `controlRoutes.ts:127` | Role overrides; `setOverrides` is called from nowhere. |
| `GET/PATCH/DELETE /api/squads/:id` | `controlRoutes.ts:72,77,82` | Squad read/update/delete — **no `api.ts` helper exists at all.** |
| `POST /api/squads/:id/bots` | `controlRoutes.ts:86` | Add bot to squad. |
| `DELETE /api/squads/:id/bots/:botName` | `controlRoutes.ts:93` | Remove bot from squad. |
| `GET /api/templates`, `GET /api/templates/:id` | `routineRoutes.ts:58,59` | Mission templates — **6161 b of real content live**, entirely invisible. |
| `POST /api/llm/budget/override` | `llmRoutes.ts:179` | Override the budget cap. The cap is the thing currently degrading the fleet. |
| `GET /api/towns/:id/style` | `townRoutes.ts:239` | Town style preset. |
| `GET /api/towns/:id/designs` | `townRoutes.ts:219` | Generated building designs. |
| `GET /api/towns/:id/rules` | `townRoutes.ts:442` | Active rules. |
| `POST /api/towns/:id/propose-rule` | `townRoutes.ts:1202` | Propose a rule. |
| `POST /api/towns/:id/approval-mode` | `townRoutes.ts:1080` | Set approval mode. |
| `POST /api/events/*` (9 routes) | `eventsRoutes.ts:30-247` | Java-plugin relays: chat, player-join/leave/death, block-placed/broken, item-crafted, entity-killed, player-move. **No plugin exists.** |
| `GET /api/status` | `botsRoutes.ts:24` | Trivial health/count. Harmless; used by operators via curl. |

### 1.3 UNREACHABLE — 18 method-level (path is reachable, this verb is not)

Found by mapping each `api.ts` helper to its path+verb and checking call sites (chained-call aware).

| Endpoint | Helper | Note |
|---|---|---|
| `GET /api/llm/routes` | none | **Only `PUT` is called** (`settings/page.tsx:514`). Confirms the brief: routing config reaches the UI solely because `getSettings()` spreads `routes` into `/api/llm/providers`. One refactor from a Save writing `{}`. |
| `GET /api/config` | `api.getConfig` | Uncalled wrapper; only `/api/config/:section` is direct-fetched. |
| `PATCH /api/zones/:id` | `api.updateZone` | Zone edit is unreachable; map does delete-then-recreate. |
| `PATCH /api/towns/:id` | `api.updateTown` | Town rename/reconfigure unreachable. |
| `DELETE /api/towns/:id` | `api.deleteTown` | **No way to delete a town from the dashboard.** |
| `GET/POST /api/towns/:id/residents` | `api.getTownResidents` / `addTownResident` | Cannot list or add residents. |
| `POST /api/towns/:id/approvals/:id/vote` | `api.castApprovalVote` | Vote-mode approvals render a read-only tally. |
| `GET/POST /api/towns/:id/relationships` | `listTownRelationships` / `setRelationship` | Per-town diplomacy. (`/api/town-relationships`, the global graph, *is* direct-fetched.) |
| `GET /api/towns/:id/memorial` | `api.getMemorialPark` | Memorial park never shown. |
| `GET /api/towns/:id/journals` | `api.listBotJournals` | Resident journals never shown. |
| `GET /api/towns/:id/highlights` | `api.listTownHighlights` | Per-town highlights; only the global `/api/highlights` is used. |
| `GET /api/auth/me`, `POST /api/auth/logout` | `getCurrentUser` / `logout` | **No logout control and no "signed in as X" indicator** — compounds the town-mayor lockout, since the `pid` cookie is invisible and unclearable. |
| `GET /api/bots/:name/diagnostics` | `api.getBotDiagnostics` | Wrapper exists, never called. |
| `GET /api/campaigns/:id` | `api.getCampaign` | Single-campaign read. |
| `GET /api/streaming/health` | `api.getStreamingHealth` | Highlight stream health. |

**Total unreachable: 61 of 218 (28%).**

Note two *dead duplicate wrappers* that are not endpoint problems: `api.getTownDistricts` is uncalled but `api.listTownDistricts` covers the same route (`DistrictsCard.tsx:46`); same pattern for `getConfigSection`/`patchConfigSection`, superseded by direct fetches in `SettingsSection.tsx:117,171`.

### 1.4 INERT — reachable, returns success, does nothing (new class)

`makeBotActionRoute` (`missionCommandRoutes.ts:192-207`) dispatches through `CommandCenter`, which calls `worker.sendCommand(...)`. `WorkerHandle.sendCommand` (`src/worker/WorkerHandle.ts:539-541`) is fire-and-forget, and **`botWorker.ts`'s command switch (lines 173-268) has no `default` case.** Unhandled commands vanish with no log.

Worker handles: `disconnect`, `reconnect`, `releaseQuarantine`, `setMode`, `queueTask`, `reorderQueue`, `clearQueue`, `queueChat`, `swarmDirective`, `chat`, `setBotState`, `pauseVoyager`, `resumeVoyager`, `stopMovement`, `config:patch`.

`CommandCenter` sends: `setMode`, `stopMovement`, **`follow`, `walkTo`, `returnToBase`, `depositInventory`, `equipBest`, `unstuck`** — the last six have no handler.

| HTTP endpoint | Command sent | Worker handler | Result |
|---|---|---|---|
| `POST /api/bots/:name/stop` | `stopMovement` | `botWorker.ts:225` | **works** |
| `POST /api/bots/:name/walkto` | `walkTo` (`CommandCenter.ts:563,580,594,599,628,651`) | **none** | INERT |
| `POST /api/bots/:name/follow` | `follow` (`:554`) | **none** | INERT |
| `POST /api/bots/:name/return-to-base` | `returnToBase` (`:585,602`) | **none** | INERT |
| `POST /api/bots/:name/unstuck` | `unstuck` (`:668`) | **none** | INERT |
| `POST /api/bots/:name/equip-best` | `equipBest` (`:664`) | **none** | INERT |
| (`deposit_inventory` command type) | `depositInventory` (`:660`) | **none** | INERT |
| `POST /api/bots/:name/pause` | `setMode {pause:true}` | `botWorker.ts:187` reads `cmdData.mode` | **WRONG — sets PRIMITIVE mode** |
| `POST /api/bots/:name/resume` | `setMode {pause:false}` | same | **WRONG — also sets PRIMITIVE** |

Live proof (Scout at 75,63,-160; target 78,63,-160):

```
POST /api/bots/Scout/walkto {"x":78,"y":63,"z":-160}
→ 200 {"success":true, "status":"succeeded",
       "startedAt":"...:06.253Z", "completedAt":"...:06.253Z",
       "result":{"walkingTo":{"x":78,"y":63,"z":-160}}}
POST /api/bots/Scout/unstuck → 200 {"success":true,"status":"succeeded"}

Scout position 6 s later: (77, 63, -158)   ← its own idle drift; never reached the target
```

A command marked `succeeded` **0 ms after `startedAt`** cannot have pathfound anywhere. The status is assigned by `CommandCenter` the moment the fire-and-forget send returns.

The `pause` bug is the sharpest: `botWorker.ts:188` is
`instance.setMode(cmdData.mode === 'codegen' ? BotMode.CODEGEN : BotMode.PRIMITIVE)`.
`CommandCenter.ts:538,542` send `{pause:true}` / `{pause:false}` — `cmdData.mode` is `undefined` in both cases, so **both pause and resume drop the bot to primitive mode**, and resume never restores codegen. Meanwhile the correct `pauseVoyager`/`resumeVoyager` handlers (`botWorker.ts:219,222`) are reachable only from `BuildCoordinator.ts:1852,1914` and `llmRoutes.ts:116-117` — never over HTTP.

Consequence for `dashboard-audit.md` C-5: fixing the `y:null` body is **necessary but not sufficient**. Even with a valid Y, walk-to does nothing. C-5 and this finding must be fixed together.

Related, from the same analysis: `botWorker.ts:191` has a `cmdData.prepend` branch calling `queuePlayerTaskFront`, but **every** sender omits `prepend` (`WorkerHandle.ts:628-630`, `botsRoutes.ts:504`, `BotManager.ts:601`, `MissionManager.ts:559`, `RoutineManager.ts:243`, `BuildCoordinator.ts:2860`). This is the backend half of `dashboard-audit.md` mismatch #24 — the UI sends `prepend`, and even if the route forwarded it, priority queueing has no reachable caller. Likewise `reorderQueue`/`clearQueue` handlers exist with no sender, so `PATCH`/`DELETE /api/bots/:name/mission-queue` cannot reach `VoyagerLoop.reorderQueue`/`clearQueue`.

### 1.5 Documentation accuracy

**REST: CLAUDE.md is exactly right.** Diffing documented against registered:

- **Documented but not registered: 0.**
- **Registered but not documented: 0.** (A naive regex flags 23, but all are covered by CLAUDE.md's compact forms — e.g. "`POST /api/bots/:name/pause` / `resume` / `stop` / `follow` / `walkto` / …" and "`GET /api/towns/:id/brain`, `/demand`, `/buildings`, `/designs`, `/style`, `/schedules`".)

Two stale references live **outside** CLAUDE.md and should be corrected:

- `AGENTS.md` documents `/api/squads/:id/members` and `/api/squads/:id/members/:botName`; the real routes are `/bots` and `/bots/:botName` (`controlRoutes.ts:86,93`). It also lists `/api/roles`, which does not exist.
- `BACKLOG.md` references `/api/admin/shutdown`, which does not exist.

CLAUDE.md is accurate about API *shape* but silent about API *behaviour* — nothing warns that six control endpoints are inert. Worth adding.

---

## PART 2 — Config reachability

`config.yml` has **18 top-level sections**: `api`, `minecraft`, `bots`, `behavior`, `affinity`, `instincts`, `voyager`, `llm`, `skills`, `logging`, `auth`, `security`, `governance`, `social`, `cognition`, `build`, `mining`, `leash`. (`rescueHome` is commented out at `:263-266` but still read at `VoyagerLoop.ts:248`.)

### 2.1 Patchability, and the stale-build gap

`PATCHABLE_SECTIONS` (`src/util/configPersist.ts:36`) **now lists 6 sections**, not 5 — `mining` was added, and `dist/util/configPersist.js:42` has it too (built 20:40:46).

**But the running process started 20:29:18 and still enforces the old list.** Verified live:

```
GET /api/config/mining → 400
{"error":"Unknown or non-patchable section 'mining'. Allowed: behavior, affinity, instincts, voyager, minecraft"}
```

So `mining` is unreachable **only because the service is stale**. A `systemctl restart mc-fleet-bot` makes it patchable — but `FIELD_TYPES.mining` (`configPersist.ts:136-141`) contains only `minDigY`, so `mineSite` and `protectedZones` stay unpatchable regardless. The comment there is honest about it: nested objects and arrays "cannot be expressed" by the flat type-guard map. Note `src/util/configPersist.ts` is **uncommitted** in the working tree.

**12 of 18 sections remain non-patchable:** `api`, `bots`, `llm`, `skills`, `logging`, `auth`, `security`, `governance`, `social`, `cognition`, `build`, `leash`.

### 2.2 Per-section reachability

| Section | Patchable | Read at runtime | Hot or boot | Verdict |
|---|---|---|---|---|
| `api` | no | `index.ts:53,57,314,315` | boot | honest |
| `minecraft` | **yes** | `BotInstance.ts:253-257,642,647,724` | connect-time | honest — all 7 fields declared restart-required (`configPersist.ts:79-81`) |
| `bots` | no | `BotManager.ts:181,186,189`; `BotInstance.ts:878,892,915,951` | per-use | **`reconnectDelaySec` clamped — see #1** |
| `behavior` | **yes** | `BotInstance.ts:960,1002,1023,1033,1098` | mixed | **worst section — #2, #4, #5** |
| `affinity` | **yes** | `AffinityManager.ts:35-103`; `BotInstance.ts:1247`; `VoyagerLoop.ts:2158` | per-use | **cleanest section; genuinely hot** |
| `instincts` | **yes** | `BotInstance.ts:1492-2001` (7 fields) | per-use | **genuinely hot, full type coverage** |
| `voyager` | **yes** | `BotInstance.ts:1436`; `VoyagerLoop.ts:246,277,287,863,1668+` | 3 hot / 3 boot | **3 boot-captured fields advertised as hot — #6** |
| `llm` | no | `ProviderRegistry.ts:22-52` (dead path); `BotInstance.ts:1310`; `VoyagerLoop.ts:282` | — | **4 of 6 keys overridden by `data/llm-settings.json` — #7** |
| `skills` | no | `VoyagerLoop.ts:245` → `SkillLibrary.ts:129-131` | constructor | live, restart-only |
| `logging` | no | `util/logger.ts:13` | boot | live |
| `auth` | no | `server/auth.ts:315,223,240,328,443-445` | module capture | live |
| `security` | no | `BotInstance.ts:602`; `BotManager.ts:337,392` | per-use | **`quarantineReleaseSec` dead — #9** |
| `governance` | no | `BotManager.ts:152`; `VoyagerLoop.ts:1211` | per-use | live |
| `social` | no | `botWorker.ts:117,124`; `VoyagerLoop.ts:639,1230,2096+` | worker boot | live; flipping requires restart |
| `cognition` | no | `BotInstance.ts:1645`; `VoyagerLoop.ts:428,696,977,1070` | mixed | live (`config.ts:214` wrongly still calls it "reserved") |
| `build` | no | `BuildCoordinator.ts:211-212,164,1240` | constructor | live, restart-only |
| `mining` | **yes (stale)** | `actions/geofence.ts:69-72`; `mineBlock.ts:52-66`; `BotInstance.ts:324,362,455` | **re-reads the file, once per worker** | **#8, #10, #11** |
| `leash` | no | `VoyagerLoop.ts:253` | constructor | live (empty → no-op) |

### 2.3 Config that looks authoritative but is not — ranked

**#1 `bots.reconnectDelaySec: 60` is silently clamped to 30 s.**
`src/bot/BotInstance.ts:914-917`:

```ts
const baseDelay = Math.min(
  this.config.bots.reconnectDelaySec * Math.pow(2, this.reconnectAttempts) * 1000,
  30000,
);
```

`config.yml:34` sets 60, with a 4-line comment (`:29-32`) explaining that a long delay is precisely what stops 8 bots tripping the server's fleet-wide login rate limiter after the 2026-05-25 incident. **Any value ≥ 30 is identical to 30.** The documented mitigation runs at half strength and raising the number changes nothing. This is more dangerous than the ambient-chat case because the config comment asserts a safety rationale.

**#2 `behavior.ambientChatMinSec/MaxSec` — the archetype, confirmed, and doubly dead.**
`src/bot/BotInstance.ts:1364-1370` hardcodes `600_000` / `1_200_000` against `config.yml:48-49`'s 120/300 s — **5× and 4× the configured values**, with a comment asserting the hardcode as intent. Neither key is read anywhere: the only repo hits are the schema (`config.ts:54-55,350-351`) and the patch plumbing (`configPersist.ts:98-99`, `:67-68`). **And the subsystem never runs at all** — `scheduleAmbientChat` is called only from inside its own `setTimeout` body (`:1377`, `:1431`); the spawn handler (`:464-472`) starts head-tracking, wandering, chat, Voyager, survival and perception, but never ambient chat. So the config is overridden *and* the overriding code is dead. (Note: the brief cited line 1345; the true site is 1364-1370 in the current tree.)

**#3 `voyager.codeExecutionTimeoutMs: 300000` buys 5 seconds for synchronous code.**
`src/voyager/CodeExecutor.ts:557` hardcodes `script.runInContext(context, { timeout: 5000 })`, while `:562` uses `this.timeoutMs` for the async race. Any LLM-generated code that blocks the event loop dies at 5 s regardless of the 300 000 in `config.yml:74`.

**#4 Two live `behavior` fields cannot be patched, and the API says nothing.**
`headTrackingTickMs` (`BotInstance.ts:960`) and `wanderIntervalMs` (`:1023`) are captured into function-local consts at scheduler setup, so they are boot-only — yet neither is in `FIELD_TYPES.behavior` **nor** in `RESTART_REQUIRED_FIELDS.behavior`. A `PATCH /api/config/behavior {headTrackingTickMs:100}` returns **200 OK**, persists nothing, lists the field under `warnings` as "dropped", and reports `restartRequiredFields: []`. The irony: `FIELD_TYPES.behavior` contains exactly the two **dead** ambient-chat keys and omits the two **live** ones.

**#5 `behavior.wanderRadius` / `wanderIntervalMs` are dead for this fleet's mode.**
`startWandering()` is called only at `BotInstance.ts:466-468` and `:1831-1833`, both guarded by `if (this.mode !== BotMode.CODEGEN)`. `config.yml:28` sets `defaultMode: "codegen"`, so no bot ever wanders. Patchable, type-checked, advertised hot, consumed by code that never executes.

**#6 Three `voyager` fields are boot-captured but advertised as hot.**
`RESTART_REQUIRED_FIELDS.voyager` lists only `codeExecutionTimeoutMs`, but `curriculumLLMCalls` and `criticLLMCalls` are frozen into constructor fields (`CurriculumAgent.ts:125`, `CriticAgent.ts:127`), and `voyager.enabled` is read once at spawn (`BotInstance.ts:1436`). Patching any of the three returns `restartRequiredFields: []` — an explicit false assurance.

**#7 The whole `llm:` section's provider settings are overridden by `data/llm-settings.json`.**
`src/index.ts:71-86` prefers `llmSettings.buildRouter()` and falls back to `buildProviderClients(config)` only when that returns `null`. Two enabled providers exist in the JSON, so **`ProviderRegistry.ts` never runs**:

- `config.yml:79 provider: "gemini"` → actual default `anthropic`
- `config.yml:80 model: "gemini-2.5-flash"` → actual `claude-opus-4-8` (codegen), `claude-haiku-4-5` (chat/critic/curriculum)
- `config.yml:81 temperature: 0.7` → never read; `LLMSettings.ts:233-268` hardcodes 0.7 per client (coincidentally equal, so drift stays invisible until someone edits config.yml)
- `config.yml:88 maxConcurrentRequests: 1` → actual 3

`chatMaxTokens` and `codeGenMaxTokens` *are* live (passed per call).

**#8 A no-op `PATCH /api/config/mining` destroys every comment in `config.yml`.**
`validatePatch` drops unknown keys with a warning rather than rejecting (`configPersist.ts:165-166`), so a patch of `mineSite`/`protectedZones` yields `values = {}` and **`ok: true`**. `configRoutes.ts:86-91` merges nothing — then `:94` calls `persistConfig` anyway, which `configPersist.ts:12-17` documents as destroying all YAML comments. `config.yml` currently holds ~120 lines of incident archaeology (`:189-194`, `:206-215`, `:222-229`, `:252-255`). **One 200-OK request erases it.** This is latent today only because `mining` is 400ing on the stale build — restarting the service arms it.

**#9 `security.quarantineReleaseSec: 0` is fully dead config.** Only two hits repo-wide, both schema (`config.ts:145`, `:436`). It sits beside two live keys, so it reads as operative.

**#10 The `mining` hot-patch broadcast reaches code that structurally cannot consume it.**
`src/actions/geofence.ts:60-78` calls `loadConfig()` — re-reading **config.yml from disk**, not the worker's in-memory `Config` — and memoises into a module-level cache (`:58,61,76`). The only reset, `_resetGeofenceCache()` (`:185`), has test callers only. So `configRoutes.ts:105` → `WorkerHandle.ts:554-563` → `botWorker.ts:253` faithfully installs a fresh `config.mining` into every worker that **nothing reads**, and logs `'Runtime config hot-reloaded in worker'` for a value that changed nothing.

**#11 `mining.minDigY` is unvalidated on the file path.** It is absent from the `Config` interface (`config.ts:244-257`) and from `SECTION_SPECS.mining` (`:457-464`), reaching runtime only via `loadConfig() as any` (`geofence.ts:67-72`). A string `"50"` fails the `typeof === 'number'` guard at `:72`, leaves `minDigY = null`, and `isBelowDigFloor` **fail-opens** at `:94`. Given `config.yml:196-203` describes the dig floor as the fix for the fleet-entombment incident, a silent type slip disables it with no error. The HTTP path *is* type-safe; only hand-editing is not.

### 2.4 Does the hot-patch broadcast actually work?

**Partially — the mechanism is real, but roughly half the advertised surface is constructor-frozen.**

Path: `configRoutes.ts:60` → `validatePatch` → **in-place** merge into the main-thread section object (`:86-91`) → `persistConfig` (`:94`) → `postConfigPatch` per worker (`:104-107`) → `WorkerHandle.ts:554-563` → `botWorker.ts:231-265`, which does `(config as any)[section] = { ...current, ...values }` (`:253`) — a **replacement**, not an in-place merge.

Genuinely hot (dereferenced per use through the top-level `Config` reference held at `BotInstance.ts:193` / `VoyagerLoop.ts:243`): all 7 `instincts` fields, `behavior.headTrackingRange`/`wanderRadius`/`conversationRadius`, `voyager.taskCooldownMs`/`maxRetriesPerTask`, and all of `affinity`.

Stored but never consulted: `voyager.codeExecutionTimeoutMs`, `curriculumLLMCalls`, `criticLLMCalls`, `voyager.enabled`, `behavior.headTrackingTickMs`/`wanderIntervalMs`, all of `minecraft`, all of `mining`.

**Latent hazard:** the main thread mutates the section object **in place** (`configRoutes.ts:89-91`, deliberately — the comment names `AffinityManager` as the reason), while the worker **replaces** it (`botWorker.ts:253`). No worker-side subsystem currently holds a section-level reference, so nothing breaks. The moment one does — the exact pattern already used on the main thread at `BotManager.ts:92` — it goes silently stale on every patch.

---

## PART 3 — Socket.IO surface

Server-side listeners: **none**. `src/server/api.ts:219-221` handles only `connection`/`disconnect`. The frontend never calls `socket.emit`. The socket channel is **strictly one-way, server → client**, which is correct but worth stating: there is no socket-based command path, so everything operational must go through REST.

### 3.1 Emitted but never consumed (11)

| Event | Emitted at | Cost of consuming |
|---|---|---|
| `town:event` | `api.ts:273` | Replaces a 5 s poll on `/town` |
| `town:chronicle` | `api.ts:327` | Replaces a 15 s poll |
| `town:disaster` | `DisasterRecorder.ts:124` | Replaces a 30 s poll |
| `world:event` | `index.ts:209` | Would feed the unused `/api/events/world` panel |
| `build:demolished` | `BuildCoordinator.ts:425` | — |
| `build:tunnel` | `:623` | — |
| `build:gathering` | `:1788` | Gather phase is invisible in the UI |
| `build:placing` | `:1809` | Per-block placement feedback |
| `build:reassign` | `:2555` | Operator can't see crew churn |
| `build:gather-started` | `:2904` | — |
| **`campaign:stalled`** | `BuildCampaign.ts:667-668` | **New — not in `dashboard-audit.md`.** A campaign that stalls with `reason:'no-crew'` reports nothing to the operator; the UI listens to 11 other `campaign:*` events but not this one. Silent failure mode. |

### 3.2 Subscribed but never emitted (6)

`marker:deleted`, `zone:created`, `zone:deleted`, `route:created`, `route:deleted`, `squad:deleted` (`SocketProvider.tsx:232-241`). Harmless — `MarkerStore` emits an `*:updated` twin carrying `{id, deleted:true}` (`MarkerStore.ts:209,249,289`) and `SquadManager` only ever emits `SQUAD_UPDATED` (`:82`) — but they are dead listeners.

### 3.3 CLAUDE.md's event list is incomplete

CLAUDE.md documents 18 event families. **28 emitted events are undocumented:**

- `mission:created|updated|completed|failed|cancelled` (`MissionManager.ts:188,321-329,446,584`)
- `command:queued|started|succeeded|failed|cancelled` (`CommandCenter.ts:717-718`, built as `` `command:${status}` ``)
- `campaign:created|started|structure-started|structure-completed|structure-failed|completed|failed|cancelled|paused|resumed|deleted|stalled` (`BuildCampaign.ts`)
- `squad:updated`, `role:updated` (`FleetTypes.ts:57-60`)
- `marker:created`, `marker:updated`, `zone:updated`, `route:updated` (`FleetTypes.ts:62-67`)

All 28 except `campaign:stalled` are correctly consumed by the frontend — this is a pure documentation gap, and it is the largest one in CLAUDE.md.

Also worth recording: `socketEvents.ts:79-80` documents that `world:time` was **removed** because nothing subscribed. That is the right instinct, applied once and not since — 11 events currently qualify.

---

## PART 4 — Worker IPC surface

Two dispatchers: `WorkerHandle.routeRequest` (worker→main, 32 request types, `src/worker/WorkerHandle.ts:206-283`) and `botWorker.ts`'s request switch (main→worker, 12 types, `:271-355`) plus command switch (`:173-268`).

### 4.1 Failure modes determine severity

- **Missing request handler → loud.** Both dispatchers `throw` (`WorkerHandle.ts:282`, `botWorker.ts:353`); `IPCChannel.ts:162-210` serializes and rejects across the boundary. **But many call sites swallow it:** `WorkerHandle.getVoyagerTaskState:645`, `isBotConnected:655`, `getBotVersion:664`, `getViewerPort:681`, `getTerrainGrid:694`, `getPlayers:703`, `getBlockAt:712` all `catch { return null/[]/false }`, and `BotCommsProxy.ts:51-65` catches → `[]`. A permanently broken IPC type looks like "bot offline / no data" forever.
- **Missing notify handler → silent.** `IPCChannel.notify` (`:85-88`) is fire-and-forget; `routeNotification` (`:285-406`) has no default. Every proxy *write* would vanish silently if mistyped, and the caller's `Promise<void>` still resolves.
- **Missing command handler → silent.** `IPCChannel.command` (`:91-94`) fire-and-forget; `botWorker.ts` switch has no default; `WorkerHandle.sendCommand` uses `this.ipc?.command(...)`, so a dead worker also swallows commands with no log. **This is the mechanism behind Part 1.3.**

### 4.2 `SharedWorldModel` — the archetype, confirmed and worse

`src/worker/proxies/SharedWorldProxy.ts:8-30` proxies five fire-and-forget writes: `reportResource:11`, `reportThreat:15`, `updateBotState:19`, `markChunkExplored:23`, `updateServerState:27`.

**Never proxied** (`src/voyager/SharedWorldModel.ts`): `queryResourcesNear:197`, `queryThreatsNear:209`, `getIdleBots:221`, `getBotPositions:225`, `getExplorationGaps:232`, `getResourceSupply:262`, `isAreaSafe:270`, `getSnapshot:305`, `pruneExpired:276`, `mergeFromBotMemory:316`.

A worker can never ask *where another bot found iron*, *is this area safe*, *which chunks are unexplored*, or *where are my peers*. The file header's claim that "reads go via `request()`" is false — no read request type exists. All eight query methods have **zero call sites repo-wide**; `getSnapshot` is touched only by `botsRoutes.ts:288`, itself an unreachable endpoint (Part 1.2).

**And the write side is half-dead too:** `sharedWorld.reportResource` has a handler at `WorkerHandle.ts:401` but **nothing ever calls `SharedWorldProxy.reportResource`**. The shared resource map is never populated by any bot. Fleet resource sharing is inert end to end — no writes in, no reads out.

### 4.3 `PlayerIntentModel` — the mirror image

`src/worker/proxies/PlayerIntentModelProxy.ts:16-21` proxies `predictIntent` only. Unproxied: `recordAction:418`, `getActionHistory:489`, `clearPlayer:493`.

**Workers are the only code that watches players in-world, and they can only read.** The model is fed exclusively by `POST /api/events/*` (`eventsRoutes.ts:55,200-250`) — all nine of which are unreachable (no plugin). So `predictIntent` always predicts over an empty history, and `GET /api/players/:name/intent` would return a prediction from no data even if something called it.

### 4.4 Other proxy gaps

| Proxy | Unproxied methods on the real class | Capability lost |
|---|---|---|
| `DifficultyBalancerProxy.ts:15-21` (only `getBotBehaviorModifiers`) | `updatePlayerState:48`, `removePlayer:53`, `calculateDifficulty:60`, `estimatePlayerSkill:79`, `shouldOfferHelp:144`, `getEventIntensityMultiplier:167` | `shouldOfferHelp` and `getEventIntensityMultiplier` have **zero call sites repo-wide** — the "should this bot offer help" logic exists but the only code that would consult it (worker `VoyagerLoop`) has no proxy method. |
| `BotCommsProxy.ts` | `peekUnread:130`, `registerListener:136`, `removeListeners:142` | **No push delivery across the boundary.** `registerListener` cannot cross a `MessagePort`, so bots poll `getUnread` on the Voyager tick (`VoyagerLoop.ts:960`) — real-time bot-to-bot reaction is structurally impossible. `peekUnread` (non-destructive) is main-thread-only, so a worker cannot inspect its inbox without consuming it. |
| `AffinityProxy.ts` | `onHelpRequest:70`, `recordEvent:126`, `getRelationshipSummary:137`, `getTopRelationships:164`, `decayTowardDefault:98` | Worker prompts get a bare affinity number, never the human-readable summary or top-relationships list. `onHelpRequest` is reachable only via the (unreachable) HTTP hook at `eventsRoutes.ts:66`. |
| `BlackboardProxy.ts` | `existsOpenWithDescription:316`, `gcStaleScheduleTasks:338`, `gcTerminalTasks:372`, `reapShortageTasks:414` | A worker cannot dedupe before proposing a task — it can only blind-`addTask`. GC/reap are main-thread-only by design. |
| `CultureProxy.ts` | `listMemes:195`, `getMeme:199`, `getSummary:328`, `extractMemesWithLLM:290` | A worker can only keyword-match memes it stumbles on; it cannot enumerate the registry or resolve one by id. |
| `LLMClientProxy.ts` | `getModelId` (`LLMClient.ts:30`), `generateWithThinking` (`:35`) | **Worker code can never take the thinking/reasoning path** — `ModelRouter.ts:537` duck-types `generateWithThinking`, which a proxy never satisfies. |

### 4.5 Dead IPC handlers (no sender)

- `botWorker.ts:273` `getStatus`, `:277` `getDiagnosticsSummary` — no sender.
- `botWorker.ts:291` `getSkillNames`, `:295` `getSkillCode` — no sender; `skillRoutes.ts` reads `skills/index.json` off disk instead. **The live per-bot skill library is unreachable from the API.**
- `botWorker.ts:197` `reorderQueue`, `:200` `clearQueue` — no sender (see 1.4).
- `WorkerHandle.routeRequest` cases with a proxy method but no worker-side caller: `blackboard.clearBotGoal:226`, `addTask:227`, `getState:231`, `getRecentMessages:232`, `getSwarmGoal:233`, `hasReservation:235`, `getSwarmRelevantTasks:237`, `getBlockedTaskDescriptions:238`, `getRecentMessagesForBot:239`, `affinity.getAll:245`, `conversation.getHistory:261`, `getAllConversations:263`.
- `routeNotification` cases never emitted: `affinity.onGift:368`, `affinity.clearBot:369`, `conversation.clearBot:398`, `culture.addMeme:383`, `sharedWorld.reportResource:401`.

### 4.6 Async-proxy bugs (adjacent, but severe enough to record)

The proxies are async; the real objects are sync. Three call sites forgot to await:

- **`src/bot/BotInstance.ts:1347`** — `if (this.affinityManager.isHostile(...))` is not awaited. In worker mode this is a **Promise, i.e. always truthy**, so every chat-extracted task is refused with "I don't feel like helping you right now." (This is the line the brief cited for the 600k/1200k hardcode; the hardcode is at 1364-1370 and this is a different, worse bug at 1347.)
- **`src/bot/BotInstance.ts:1417`** — `affinityManager.get(...)` passed unawaited into `buildSystemPrompt`, so ambient-chat prompts receive `[object Promise]` where a number is expected. (Moot in practice — ambient chat never runs, per #2.)
- `BlackboardProxy.ts:58-88` — `completeTask`/`blockTask`/`postMessage`/`releaseReservationsForBot` are declared `Promise<void>` but use `notify`; they resolve immediately regardless of whether the main thread applied the write. `await` gives false confirmation.

---

## PART 5 — Ranked: what to wire up, what it costs, whether it's worth it

**Tier 0 — reachable endpoints that lie. Fix before anything else.**

1. **Add the six missing worker command handlers** (`walkTo`, `follow`, `returnToBase`, `unstuck`, `equipBest`, `depositInventory`) to `botWorker.ts:173-268`, **and add a `default:` that logs.** Cost: one switch block plus the action implementations (`followPlayer` already exists and is used by the in-game chat path at `BotInstance.ts:1178`). Value: **highest in the audit.** Six documented endpoints, the map's entire "send a bot here" interaction, and four `CommandType`s currently return success while doing nothing. The missing `default` is the root cause and will keep producing this bug class forever.
2. **Fix `pause`/`resume`** — route them to the existing `pauseVoyager`/`resumeVoyager` commands instead of `setMode {pause}`. Cost: two lines in `CommandCenter.ts:538,542`. Value: very high — today both buttons silently downgrade the bot to primitive mode and resume never restores codegen. This is active damage, not a missing feature.
3. **Fix `BotInstance.ts:1347`** (`await` the `isHostile` proxy). Cost: one keyword. Value: very high — every chat-issued task is currently refused fleet-wide.

**Tier 1 — cheap, high operational value.**

4. **"Release quarantine" control** — `POST /api/bots/:name/quarantine/release` + `GET /api/security/impersonation` are live, non-empty right now, and the alert toast already fires. Cost: one button. Value: high; there is no in-dashboard recovery path today.
5. **Restart the service** to activate `mining` patchability (already built). Cost: one command. Value: high — but **guard #8 first**, because arming `mining` also arms the comment-destroying `persistConfig` path.
6. **Make `persistConfig` a no-op when `values` is empty** (`configRoutes.ts:94`). Cost: one `if`. Value: high — prevents silent destruction of ~120 lines of incident documentation in `config.yml`. Better still, switch to a comment-preserving YAML round-trip, but the guard is the 5-minute fix.
7. **Wire `GET /api/llm/routes`** into settings hydration. Cost: one fetch. Value: high — today's routing config is one refactor from being wiped by a Save.
8. **Subscribe to `campaign:stalled`** plus the three `town:*` events. Cost: four listeners; replaces three polling loops. Value: high — a stalled campaign is currently invisible.

**Tier 2 — config honesty. Cheap, prevents wasted operator effort.**

9. **Un-clamp or document `reconnectDelaySec`** (`BotInstance.ts:914-917`). Cost: one constant, or one comment. Value: high — a documented incident mitigation is running at half strength.
10. **Fix `RESTART_REQUIRED_FIELDS`** to include `voyager.curriculumLLMCalls`/`criticLLMCalls`/`enabled` and `behavior.headTrackingTickMs`/`wanderIntervalMs`; add the latter two to `FIELD_TYPES.behavior`; **remove the dead `ambientChat*` keys**. Cost: a few lines in `configPersist.ts`. Value: high — stops the API returning false "hot-reloaded" assurances.
11. **Delete or implement `behavior.ambientChat*` and `security.quarantineReleaseSec`.** Cost: trivial. Value: medium — removes two pieces of config that look operative and are not.
12. **Validate `mining.minDigY` in `SECTION_SPECS`** (`config.ts:457-464`). Cost: one spec entry. Value: high relative to cost — a hand-edited type slip currently fail-opens the dig floor that prevents fleet entombment. — **DONE 2026-08-08:** `SECTION_SPECS.mining` now declares `{ key: 'minDigY', type: 'number', optional: true }`. A hand-edited value like `minDigY: "50"` (string) now fails validation at `loadConfig()` with the error `mining.minDigY: expected number, got string`, closing the file-edit gap. The HTTP PATCH path was already type-safe.
13. **Reconcile `config.yml`'s `llm:` block with `data/llm-settings.json`.** Cost: a comment saying the JSON wins, or delete the dead keys. Value: medium-high — four keys currently describe a configuration that is not running.

**Tier 3 — genuinely useful unreachable features, worth wiring.**

14. **Squad write path** (`GET/PATCH/DELETE /api/squads/:id`, `POST /api/squads/:id/bots`, `DELETE .../bots/:botName`) — five endpoints with **no `api.ts` helper at all**; `/fleet` is read-only. Cost: five helpers plus UI. Value: high — squads are a headline control-platform feature that cannot be operated. **Fix the `squad.members` vs `botNames` mismatch (`dashboard-audit.md` #8) at the same time**, or the first squad created freezes the map.
15. **`GET /api/templates`** — 6161 bytes of real mission-template content, completely invisible. Cost: one fetch plus a list view. Value: high; it is finished content behind zero UI.
16. **Logout + "signed in as X"** (`GET /api/auth/me`, `POST /api/auth/logout`). Cost: small. Value: high in context — the `pid` cookie is currently invisible and unclearable, which is half of why every mayor-gated town action is unreachable.
17. **Town CRUD gaps**: `DELETE /api/towns/:id` (no way to delete a town), `PATCH /api/towns/:id`, residents list/add, approval vote, per-town diplomacy, memorial, journals. Cost: moderate — a coherent chunk, not one-liners. Value: medium-high, but **blocked behind the mayor-cookie problem**; do #16 first.
18. **`POST /api/builds/:id/retry` and `/demolish`** — both implemented, no button. Cost: two buttons. Value: medium; retry in particular saves re-driving a whole build.

**Tier 4 — larger, judgement required.**

19. **`SharedWorldModel` read path.** Add request types for `queryResourcesNear`, `isAreaSafe`, `getIdleBots`, `getExplorationGaps`, and call `reportResource` from mining/exploration actions. Cost: substantial — proxy methods, dispatcher cases, and call sites in the Voyager loop. Value: **potentially the largest behavioural upgrade available** (bots would stop re-exploring and re-discovering each other's finds), but it is building a feature, not fixing wiring. The honest framing: this feature was designed, half-built, and never connected at either end. Decide whether you want it before paying for it.
20. **`POST /api/llm/budget/override`** — the cap is what is currently degrading the fleet, and the escape hatch has no button. Cost: one button. Value: medium; pairs with surfacing budget state outside `/settings` (`dashboard-audit.md` Tier 1 #3).
21. **`DifficultyBalancer.shouldOfferHelp` / `getEventIntensityMultiplier`** — implemented, zero call sites, unreachable from workers. Cost: two proxy methods plus call sites. Value: medium; same "unfinished feature" caveat as #19.
22. **`BotComms` push delivery** — `registerListener` cannot cross a `MessagePort`, so bot-to-bot reaction is tick-latency-bound by construction. Fixing means a notify-based push channel. Cost: real design work. Value: medium; only worth it if bot-to-bot latency is an actual complaint.

**Tier 5 — cleanup, no functional gain.**

23. Remove the 6 dead socket listeners (`marker:deleted`, `zone:created|deleted`, `route:created|deleted`, `squad:deleted`).
24. Delete dead duplicate wrappers: `api.getTownDistricts` (superseded by `listTownDistricts`), `api.getConfigSection`/`patchConfigSection` (superseded by direct fetches).
25. Decide about the 9 `POST /api/events/*` relays: either build the Java plugin or delete them. They are 265 lines of `eventsRoutes.ts` feeding `PlayerIntentModel`, `AffinityManager.onHelpRequest`, and `DifficultyBalancer` — **all three of which are inert precisely because nothing posts here.** This is the single largest coherent dead subsystem in the backend.
26. Document the 28 undocumented Socket.IO events in CLAUDE.md; fix `AGENTS.md`'s `/api/squads/:id/members` → `/bots` and drop the nonexistent `/api/roles`; drop `/api/admin/shutdown` from `BACKLOG.md`.
27. Add a `default:` to `WorkerHandle.routeNotification` that logs — silent notify loss is the most dangerous failure class in the IPC layer.

---

## Notes on method and caveats

- **Nothing was restarted and no code was changed.** Two `POST`s were issued against the live fleet (`walkto`, `unstuck` on Scout), both provably no-ops; Scout's position was unaffected.
- `GET /api/towns` returned **200 `{"towns":[]}`** during this audit, not the Internal Server Error described in the brief. Another agent owns that bug; it may already be resolved, or it may be intermittent. Not investigated further.
- Reachability was determined by static call-site analysis over `web/src` with template-literal expansion and chained-call (`api\n  .foo()`) matching. Two earlier passes produced false positives from nested template literals and false negatives from chained calls; both were corrected. Spot-checked against `DistrictsCard.tsx:46` and `app/login/page.tsx:28`.
- Line numbers for `src/util/configPersist.ts` are **working-tree**, not HEAD — the file has uncommitted changes (`PATCHABLE_SECTIONS` +`mining`, `FIELD_TYPES` at 93-142, `validatePatch` at 155-193). The brief's line references match HEAD.
- The `dist/` build is **newer than the running process**. Any conclusion about live behaviour was taken from `curl`, not from `src/`.
