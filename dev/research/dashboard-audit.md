# Dashboard Audit — coverage & dead surfaces

**Date:** 2026-07-24
**Scope:** `web/src/app/**` + the components they render, cross-checked against
`src/server/routes/*.ts`, `src/server/api.ts`, `src/server/llmRoutes.ts`, `src/server/admin.ts`.
**Method:** static cross-reference plus live `curl` against `127.0.0.1:3001` (backend up, 5 bots connected, uptime ~15 min at time of audit).
**Excluded by instruction:** `web/src/lib/api.ts`, `web/src/lib/socket.ts`, `next.config.*` — a separate agent owns the base-URL/proxy fix. This audit assumes connectivity is repaired and reports what *still* breaks afterward.

---

## Headline findings

1. **Connectivity is one line** — the Next proxy already works; `api.ts` bypasses it. Owned by another agent. Everything below survives that fix.
2. **"Start Build" has never worked** — `POST /api/builds` sends `filename`, backend wants `schematicFile`. Verified 400 live.
3. **The map is at least six independent faults**, not one — terrain timeout, `height`/`y`, marker position, walk-to Y, three canvas-killing overlays, and a missing `canvas` native dep for the 3D viewer.
4. **Three overlays will freeze the whole map canvas** the moment the operator creates their first zone, route, or squad. They are dormant *only* because the world is empty.
5. **The budget cap is tripped right now** and codegen is silently downgraded fleet-wide — visible only if you open a settings tab.
6. **25 shape mismatches** compile clean because `next.config.ts:18` sets `ignoreBuildErrors: true`.
7. **No page calls a nonexistent endpoint.** The gap is the reverse: ~35 live endpoints have no UI at all.

---

## 0. Connectivity context (not this audit's fix, but it frames everything)

Verified live:

- `GET http://127.0.0.1:3000/api/status` → `200 {"status":"ok","botCount":5}` — **the Next proxy in `next.config.ts` already works end to end.**
- Backend binds loopback only: `ss` shows `127.0.0.1:3001`; `config.yml:11` `host: "127.0.0.1"` (deliberate, per the comment at `config.yml:7-9`).
- `web/src/lib/socket.ts:11-14` carries an explicit comment *not* to reintroduce a hardcoded `http://localhost:3001`, and uses `|| ''` (same-origin). `web/src/lib/api.ts:1` never got the same treatment.

So Socket.IO is same-origin-proxied and works, while every REST call from a remote browser dies. That asymmetry is exactly the reported symptom: **bot dots move on the map, but nothing else loads.** The operator's "nothing connects" is one line. Everything below is what remains broken *after* that line is fixed.

---

## PART A — Page → endpoints → status

Legend: **WORKS** · **BROKEN** (wrong shape/params — will fail with data present) · **EMPTY-BY-DESIGN** (correct, no data in a fresh world) · **DEAD** (UI exists, nothing ever populates it)

| Page | Endpoints called | Exists? | Status |
|---|---|---|---|
| `/` home | `/api/activity?limit=20`, `/api/bots`, `/api/world` | all ✅ | WORKS |
| `/map` | `/api/terrain`, `/api/terrain/height`, `/api/markers`, `/api/zones`, `/api/routes`, `/api/missions`, `/api/squads`, `/api/schematics`, `/api/bots/:n/walkto`, `/api/campaigns` | all ✅ | **BROKEN** — see Part C |
| `/fleet` | `/api/missions/:id` only | ✅ | **DEAD** — squads never initially fetched |
| `/coordination` | `/api/blackboard`, `/api/blackboard/swarm-directive` | ✅ | blackboard WORKS; directive **BROKEN** (400) |
| `/roles` | `/api/roles/assignments`, `…/:id`, `/api/bots/:n/override`, `/api/roles/approvals/:id/(approve\|reject)` | ✅ | assignments WORK; approvals + overrides **DEAD** |
| `/settings` | `/api/llm/{providers,usage,enabled,budget,reload}`, `PUT /api/llm/routes`, `/api/config/:section` | ✅ | WORKS (gaps in Part B) |
| `/admin` | `/api/admin/{info,heap-snapshot,restart,logs/stream,backup}` | ✅ | WORKS; restart copy is **factually wrong** |
| `/metrics` | `/api/metrics`, `/api/metrics/civilization` | ✅ | WORKS (type decl is fiction) |
| `/stats` | `/api/skills/stats`, `/api/difficulty`, `/api/bots/:n/tasks`, `/api/bots/:n/relationships` | ✅ | WORKS (N+1 fan-out) |
| `/history` | `/api/commands`, `/api/missions`, cancel/action | ✅ | EMPTY-BY-DESIGN (0 commands, 0 missions) |
| `/activity` | **none** | — | **DEAD on deep-link** — no HTTP backfill |
| `/skills` | `/api/skills`, `/api/skills/:name`, `PUT`/`DELETE`, `/api/skills/stats` | ✅ | WORKS (518 skills live) |
| `/build` | `/api/schematics(+upload,:file)`, `/api/builds(+id,cancel,pause,resume)`, `/api/terrain(+height)`, `/api/bots`, `/api/missions`, `/api/campaigns` | all ✅ | **BROKEN** — `POST /api/builds` body wrong; Active Build panel frozen |
| `/build/history` | `/api/builds` | ✅ | partly BROKEN — `completedAt`/`metadata` don't exist |
| `/chains` | `/api/chains(+templates,:id,start,pause,cancel)`, `/api/missions` | all ✅ | WORKS; EMPTY-BY-DESIGN |
| `/commander` | `/api/commander/{history,drafts,suggestions,parse,execute,clarify}` | all ✅ | WORKS; `suggestions` fetched-never-rendered |
| `/routines` | `/api/routines(+:id,execute,recording/*)` | all ✅ | **BROKEN** — `isRecording` vs `recording` |
| `/manage` | `POST/DELETE /api/bots`, `/api/bots/:n/mode`, `/api/bots/:n/task` | all ✅ | **WORKS — cleanest page in the audit** |
| `/chat` | `/api/bots/:n/conversations`, `/api/bots/:n/chat` | ✅ | WORKS; timestamps never render |
| `/social` | `/api/relationships` | ✅ | **WORKS — fully correct** |
| `/town` | 27 town endpoints | all ✅ | reads WORK; **all mayor-gated writes unreachable** |
| `/bots/[name]` | 18 endpoints across 10 tabs | all ✅ | WORKS |
| `/login` | `/api/auth/{status,login}` | ✅ | WORKS (auth currently disabled) |

Live: `GET /api/auth/status` → `{"enabled":false,"authenticated":true,...}`. **Auth is off**, so it is not contributing to the "nothing works" symptom.

Live emptiness check (distinguishes EMPTY-BY-DESIGN from BROKEN):

```
/api/markers      {"markers":[]}          /api/towns      {"towns":[]}
/api/zones        {"zones":[]}            /api/missions   {"missions":[]}
/api/routes       {"routes":[]}           /api/commands   {"commands":[]}
/api/squads       {"squads":[]}           /api/chains     {"chains":[]}
/api/builds       {"builds":[]}           /api/routines   {"routines":[]}
```

All legitimately empty on a fresh server. **These pages are not broken — they have nothing to show.** But note the corollary in Part C: several of them *would crash the map* the moment they stop being empty.

### Endpoints that exist but nothing surfaces (dead backend surface)

| Endpoint | Backend | Note |
|---|---|---|
| `GET /api/llm/routes` | `src/server/llmRoutes.ts:54` | Purpose-built for today's routing work; **zero frontend callers**. Settings reads routes incidentally (Part B-a). |
| `POST /api/llm/budget/override` | `src/server/llmRoutes.ts:179` | No caller. |
| `GET /api/config` | `src/server/routes/configRoutes.ts:30` | Wrapper `api.ts:1099` unused. |
| `GET /api/activity` | `src/server/routes/botsRoutes.ts:434` | 500-entry `EventLog` — used by home (limit 20), **not by `/activity`**. |
| `GET /api/roles/approvals` | `src/server/routes/controlRoutes.ts:114` | Renders a permanently-empty panel. |
| `GET /api/roles/overrides` | `src/server/routes/controlRoutes.ts:127` | `setOverrides` called from nowhere. |
| `PATCH /api/markers/:id` | `src/server/routes/controlRoutes.ts:24` | Map does delete-then-recreate instead, losing `y`/`kind`/`tags`/id. |
| `POST/PATCH/DELETE /api/squads*` | `controlRoutes.ts:68-97` | No `api.ts` helpers at all; `/fleet` is read-only. |

**No page calls an endpoint that does not exist.** Coverage is the inverse problem: the backend is richer than the UI.

Beyond the table above, these also have **zero UI callers**: `POST /api/bots/:name/bot-message`, `/api/bots/:name/observed-role`, `/api/bots/:name/diagnostics` (wrapper exists, never called), `POST /api/bots/:name/say`, `POST /api/bots/:name/grant`, **`POST /api/bots/:name/quarantine/release`**, `GET /api/security/impersonation`, `/api/world/model`, `/api/reputation`, `/api/events/world`, `/api/swarm/plans`, `/api/culture`, `POST /api/swarm`, `/api/players/:name/intent`, `POST /api/builds/:id/retry`, `POST /api/builds/:id/demolish`, `POST /api/tunnel`, `GET /api/templates(+/:id)`, `GET /api/chains/:id`, and six town endpoints (`designs`, `style`, `rules`, `POST districts`, `approval-mode`, `propose-rule`).

Two are operationally notable: **`/api/security/impersonation` is live and non-empty right now** (ghost-name incidents for Architect and Surveyor), the socket toast fires (`SocketProvider.tsx:142-148`), but there is **no "Release quarantine" button anywhere** — the operator has no in-dashboard recovery path. And `api.logout` / `api.getCurrentUser` are never called: there is **no logout control and no "signed in as X" indicator**, which compounds the town-mayor problem below.

### Socket.IO cross-check

Wired correctly: `bot:position|health|state|inventory|decision|died|spawn|disconnect`, `activity`, `player:position`, `security:alert`, `llm:call`, all `mission:*`, `command:*`, `campaign:*`, `chain:*`, and `build:started|progress|completed|cancelled|bot-status`. I verified all event names are emitted via constants (`src/control/FleetTypes.ts`, `CommandTypes.ts`, `MissionTypes.ts`) — **no name mismatches.**

**Backend emits, UI never listens (11):** `town:event` (`src/server/api.ts:273`), `town:chronicle` (`api.ts:327`), `town:disaster` (`src/town/DisasterRecorder.ts:124`), `world:event` (`src/index.ts:209`), `build:demolished|tunnel|gathering|placing|reassign|gather-started` (`src/build/BuildCoordinator.ts:425,623,1788,1809,2555,2904`).

The town trio is the biggest realtime gap: **`/town` is HTTP-poll-only (5s/15s/30s) despite a fully wired server broadcast.**

**UI listens, backend never emits (6):** `marker:deleted`, `zone:created`, `zone:deleted`, `route:created`, `route:deleted`, `squad:deleted` (`SocketProvider.tsx:232-241`). Harmless — the `*:updated` twin refetches the same list — but they are noise.

Dead badge: `useBotStore.unreadChats` is **never incremented** (`SocketProvider.tsx:125-128` documents that the `bot:chat` listener was removed because the server never emits it). The sidebar chat badge is permanently 0.

### Nav

All 21 sidebar links resolve to real pages (`web/src/components/Sidebar.tsx:8-232`). **No broken nav.** Two routed pages have no nav entry: `/login` (reachable only via the 401 interceptor) and `/bots/[name]` (reached from `BotCard`).

---

## PART B — Does the UI reflect today's backend work?

### (a) Per-task-type model routing — **displays correctly, but by accident**

Live: `GET /api/llm/routes` → codegen→`claude-opus-4-8`, critic/curriculum/chat→`claude-haiku-4-5`, embed→`gemini`.

The settings page **does** show and edit all five rows (`web/src/app/settings/page.tsx:906-963`), hydrated at `:323`. But **there is no `GET /api/llm/routes` call anywhere in `web/src`** — the only reference is the `PUT` at `settings/page.tsx:514`. Routes arrive only because `LLMSettings.getSettings()` (`src/ai/LLMSettings.ts:102-109`) spreads the whole settings object into the `/api/llm/providers` response.

**Risk:** if `getSettings()` ever stops spreading `routes`, the table silently blanks and the next Save PUTs `{}` — `setRoutes` replaces wholesale (`LLMSettings.ts:144-146`), **wiping today's routing config**. The endpoint built to prevent this is the one nobody calls.

Not rendered at all: `temperature` (declared `settings/page.tsx:24`, no control), `defaultProvider` (blind-forwarded `:517`), `fallback` beyond index 0 (`:943`).

### (b) `apiKey` removal — **nothing breaks**

Confirmed live: `/api/llm/providers` emits `keyMasked` only. Every `apiKey` reference in `web/src` is either a dead interface field (`settings/page.tsx:13`) or **local form state** for the add-provider POST (`:227, :307, :439, :450, :464, :813, :848-849`) — which is correct, since `POST` still reads `apiKey` (`llmRoutes.ts:25`). The display path renders `{p.keyMasked}` (`settings/page.tsx:785`) and never blanks.

One latent hazard: `toggleProvider` (`settings/page.tsx:498-509`) spreads the API-derived provider into a POST body, now posting `apiKey: undefined`. It survives **only** because `upsertProvider` preserves the stored key on a falsy incoming value (`src/ai/LLMSettings.ts:121-123`). Remove that guard and toggling a provider erases its key.

### (c) Model catalog — present and correct

`settings/page.tsx:233-299` includes all of today's additions: `claude-opus-5` (:246), `claude-fable-5` (:247), `gpt-5.6-sol/terra/luna` (:263-265), `gemini-3.5-flash/pro` (:237-238).

**Finding:** many catalog entries have **no row in the pricing table** (`src/ai/TokenLedger.ts:11-59`) — including all `voyage-*`, all `MiniMax-*` below M3, `gpt-5`/`gpt-4.1`/`gpt-4o`/`gpt-5.4-mini`/`gpt-5.4-nano`/`gpt-5.3-codex`/`gpt-5.5-pro`, `gemini-2.5-pro`, `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-opus-4-1`. Selecting any of them costs **$0.00** and **silently disarms the daily budget cap for that route.**

### (d) Spend / budget / prompt cache — **budget visible; cache invisible end-to-end**

Live confirmation the cap is tripped:

```
/api/llm/budget → {"budget":{"dailyUsd":10,"scope":"anthropic",...},
                   "spendTodayUsd":{"anthropic":10.1836,"total":10.1861},
                   "codegenPaidAllowed":false}
```

and `/var/log/mc-fleet-bot.log` is repeating `Budget cap: skipping paid provider, falling through to cheaper fallback` continuously.

**Spend/budget IS surfaced** — but only on `/settings` → AI tab, which will render the red **CAPPED** state (`settings/page.tsx:628, :653, :695`). Nothing on `/`, `/metrics`, `/stats`, or `/admin` shows spend. **The operator has no way to learn the fleet is degraded without opening a settings tab.** This is the single most important invisible fact on the system right now: codegen is silently downgraded from Opus to Gemini fleet-wide.

**Prompt-cache effectiveness is not surfaced, and is not surfaceable:**

- Recorded and priced correctly: `AnthropicClient.ts:116-117` → `ModelRouter.ts:416-417` → `TokenLedger.record` (`TokenLedger.ts:76-77, 85-86`) → `estimateCost` (`TokenLedger.ts:203-204`, 1.25× write / 0.1× read).
- **But `getMetrics()` never aggregates them** (`TokenLedger.ts:124-150` sums only `inputTokens`/`outputTokens`). So `/api/llm/usage` has **no cache field at all** — confirmed live, the payload has only `totalInputTokens`/`totalOutputTokens`.
- `/api/bots/:name/llm-trace` also drops them (`botsRoutes.ts:599-600`).

Consequence: the "Total Tokens" tile (`settings/page.tsx:994`) **under-reports billed tokens** while "Est. Cost" (`:998`) correctly includes cache spend — two adjacent tiles that disagree. Fixing this needs a **backend change first** (aggregate in `TokenLedger.getMetrics`), then a UI tile.

Also ignored from the live usage payload: `avgLatencyMs`, `successRate` (declared `settings/page.tsx:40-41`, never rendered), `byBot` (not even declared). And `codegenPaidAllowed` — the authoritative gate — is ignored in favour of a client-side recompute (`:628`) that **misses the idle-throttle branch** (`LLMSettings.ts:208-209`), so the UI can show "ARMED" while the server blocks paid codegen.

### (e) `mining.minDigY` / `mining.mineSite` — **invisible, and not the frontend's fault**

Verified live:

```
GET /api/config/mining → HTTP 400
{"error":"Unknown or non-patchable section 'mining'. Allowed: behavior, affinity, instincts, voyager, minecraft"}
```

The config renderer is **fully generic** — `SettingsSection.tsx:195` iterates `Object.entries(values)` and `FieldRow` dispatches on runtime type (object → recursive fieldset `:288-312`, number → `:336`, `string[]` → `:364-390`, else read-only `<pre>` `:425-432`). There is **no hardcoded field list**. Three hardcoded *lists* block it instead:

1. `PATCHABLE_SECTIONS = ['behavior','affinity','instincts','voyager','minecraft']` — **`src/util/configPersist.ts:36`**. `mining` absent → `GET /api/config` never emits it (`configRoutes.ts:33`).
2. `TABS` — **`web/src/app/settings/page.tsx:48-55`** — six hardcoded tabs, no `mining`.
3. `FIELD_TYPES` — **`src/util/configPersist.ts:89-131`** — only `number|boolean|string`. Even after whitelisting, `mineSite` (object) and `protectedZones` (array) **could not be saved**; `validatePatch` (`:145-180`) drops/rejects them. `minDigY` (number) would work.

`config.yml` has 18 top-level sections; **only 5 are reachable from the UI.** `mining`, `leash`, `build`, `skills`, `social`, `cognition`, `governance`, `security`, `bots`, `llm`, `logging`, `api`, `auth` are all invisible.

**Data-shape hazard if wired up naively:** `protectedZones` is currently `[]`. `isStringArray([])` is `true` (`.every()` on empty), so it would render as a **comma-separated text input** — typing in it produces a `string[]`, corrupting an array-of-objects.

---

## PART C — The "maps" complaint

### C-1. Terrain: the request the map actually makes cannot complete

The map requests `TERRAIN_RADIUS = 96`, `TERRAIN_STEP = 2` (`web/src/app/map/page.tsx:39-40`, call at `:313`). Measured live, that exact request:

```
/api/terrain?cx=78&cz=-158&radius=96&step=2  →  53.5s,  then >90s (aborted)
```

The client aborts at **10s** (`web/src/lib/api.ts:6`). `map/page.tsx:328-330` swallows the abort into `setTerrainStatus('error')` → the "Terrain unavailable" chip at `:1156`. **The map's terrain layer has never rendered on this host.**

**Root cause is worker contention, not cell count.** Eight identical requests at a *modest* radius:

```
radius=32 step=2 → 4.90s, 0.32s, 1.30s, 25.09s, 0.86s, 7.55s, 0.62s, 3.05s
```

Range 0.3s → 25s for byte-identical input; 1 of 8 already blows the 10s budget. And `radius=8` (81 cells) measured **39.6s** while `radius=48` (2401 cells) measured **0.86s** — cell count is nearly irrelevant.

Why: `GET /api/terrain` delegates over IPC to a bot worker (`terrainRoutes.ts:47`), and `getTerrainGrid` (`src/worker/botWorker.ts:314-335`) runs a **synchronous** `bot.blockAt()` loop from `y=120` down to `y=-60` per cell **on the same thread as that bot's voyager loop**. `nearestProbe` (`terrainRoutes.ts:17-29`) deliberately picks the bot *closest to the view centre* — which on an active fleet is a bot busy executing codegen. Terrain latency is therefore a coin flip against whatever that bot is doing.

Aggravating factor: for columns outside the probe's view distance `blockAt` returns null, so the loop runs all **181** iterations and returns `'air'` — maximum cost for useless data. At radius 96 the scan spans 192 blocks (~12 chunks), well beyond typical view distance, so a large fraction of the work is both maximal-cost and garbage.

**This is a backend/perf fix, not a UI fix.** Options: cache the grid per worker, yield between rows, cap radius to what's actually loaded, or serve terrain from a dedicated non-voyager probe.

Two secondary terrain bugs:

- **Radius contract mismatch.** Client asks 96; server clamps to 64 (`terrainRoutes.ts:36`). The refetch hysteresis still uses the client constant — `map/page.tsx:308` `if (dx < TERRAIN_RADIUS / 2) return` (48) against real coverage of 64. Panning 48–64 blocks leaves uncovered canvas with no refetch.
- **2-block draw skew.** `map/page.tsx:426-428` anchors at `cx - tm.radius` (=64) then sizes `tc.width * TERRAIN_STEP` = `65*2` = 130 world units, spanning `cx-64 … cx+66` for data covering `cx-64 … cx+64`.

Cell shape itself is **correct** — backend emits `string[]` (`botWorker.ts:320, :331`), verified live as 289 bare block names for `size:17` (17² = 289, zero nulls), consumed as `getBlockColor(data.blocks[z*size+x])` (`map/page.tsx:322`).

### C-2. `GET /api/terrain/height` — hard shape mismatch

- Backend emits `{x, z, height, surfaceBlock}` — `src/server/routes/terrainRoutes.ts:69` and `:73`. Verified live: `{"x":78,"z":-158,"height":69,"surfaceBlock":"oak_leaves"}`.
- UI reads **`res.y`** — `web/src/app/map/page.tsx:826` and `:1454` (declared `{y, block}` at `web/src/lib/api.ts:902`).

`res.y` is **always `undefined`**. Every schematic footprint placed via the Building tool gets `origin.y = undefined`, overwriting the provisional `64` (`:814`, `:1446`), renders as `NaN` (`:1345`), and is POSTed into `createCampaign` (`:1377-1380`) with a null Y. Also note this endpoint does **385 sequential IPC round-trips** per click (`terrainRoutes.ts:66-72`).

### C-3. Overlays: three unconditional `TypeError`s that permanently freeze the canvas

The draw loop's `requestAnimationFrame` re-schedule is the **last statement** (`map/page.tsx:735`), so any throw inside kills the entire canvas — no terrain, no bots, no grid — until reload.

| Overlay | UI reads | Backend actually emits | Both sides |
|---|---|---|---|
| Zones | `zone.type.toUpperCase()` | `ZoneRecord.mode`; no `type` | `web/src/lib/mapDrawing.ts:123` ↔ `src/control/WorldTypes.ts:12-21` |
| Routes | `route.waypoints.length` | `waypointIds: string[]` | `web/src/lib/mapDrawing.ts:139` ↔ `src/control/WorldTypes.ts:23-28` |
| Squads | `for (const member of squad.members)` | `botNames` | `web/src/lib/mapDrawing.ts:329` ↔ `src/control/FleetTypes.ts:1-4` |

The squad loop is called **unconditionally** (not layer-gated) at `map/page.tsx:582`. **All three are currently dormant only because `/api/squads`, `/api/zones`, `/api/routes` return `[]`.** The first squad or zone the operator creates kills the map. This is the sharpest instance of "empty-by-design masking broken".

Note `/fleet` reads the *same* squad type correctly as `botNames` (`fleet/page.tsx:118-123`) — two consumers of one type disagree.

### C-4. Markers — persist positionless. Verified live.

`POST /api/markers` with the UI's body shape (`web/src/lib/api.ts:834-838`, called `map/page.tsx:984`):

```
POST {"name":"audit-probe","x":1,"y":2,"z":3,"type":"poi"}
→ 201 {"marker":{"id":"mkr_...","name":"audit-probe","tags":[],"createdAt":...}}
```

**`x`, `y`, `z`, `type` are all silently dropped.** `MarkerStore.createMarker` (`src/control/MarkerStore.ts:149-171`) reads `data.kind` and `data.position` with no validation; the canonical record (`src/control/WorldTypes.ts:1-10`) has `position:{x,y,z}` and `kind` — no flat coordinates. (Probe marker deleted after testing; `/api/markers` is back to `[]`.)

Compounding: the UI never reads `marker.position` either — it reads flat `marker.x`/`.z` at `web/src/lib/mapDrawing.ts:59`, `map/page.tsx:757`, `:1280`, `:1286`. So **even a correctly-stored marker would draw as `NaN`.** Both sides need fixing.

### C-5. `walkTo` sends `y: null` — every "send bot here" fails. Verified live.

```
POST /api/bots/Scout/walkto {"x":80,"y":null,"z":40}
→ 200 {"success":true,"command":{... "status":"failed",
       "error":"MISSING_PARAM: x, y, z coordinates are required"}}
```

`web/src/lib/api.ts:760-764` ← `map/page.tsx:1105`, `MapContextMenu.tsx:70, :86`. Rejected at `src/control/CommandCenter.ts:558-562` (`y == null` catches `null`).

Note the **200-with-embedded-failure**: the HTTP layer reports success, so the UI shows no error. The map is 2D and has no Y source — and the obvious one, `/api/terrain/height`, is itself broken (C-2). **C-2 and C-5 must be fixed together.**

### C-6. Context-menu actions — dead

- **Guard zone** (`MapContextMenu.tsx:100-104`): `zoneAtPoint` (`:40-42`) tests `z.x1/x2/z1/z2`, which canonical zones don't have → never non-null → menu item never appears. Even if it fired, UI-created zones use `shape:'rect'` (`ZoneEditorDialog.tsx:35`) vs the backend enum `'rectangle'` (`WorldTypes.ts:16`) → `INVALID_ZONE` (`CommandCenter.ts:619-627`).
- **Patrol route** (`:118-122`): `CommandCenter.ts:644` reads `route.waypointIds.length`; UI-created routes have `waypoints` → `TypeError` → 500. Also `nearestRoute = routes[0]` (`:45`) — "nearest" is always just the first route.
- `ZONE_TYPES` (`ZoneEditorDialog.tsx:8`) offers `restricted`, which isn't in the backend enum; `avoid` and `gather` are unreachable from the UI.

### C-7. prismarine-viewer — dead for a concrete, fixable reason

```
GET /api/bots/Scout/viewer-port → {"port":null}
```

From `/var/log/mc-fleet-bot.log`:

```
WARN: prismarine-viewer not installed; viewer tab will be unavailable
err: "Cannot find module 'canvas'
     Require stack: .../prismarine-viewer/viewer/lib/entities.js ..."
```

`prismarine-viewer@^1.33.0` **is** in `package.json:32` and present in `node_modules`, but its native peer dep **`canvas` is not installed**. `botWorker.ts:63-73` catches the require failure and sets `viewerLastAttemptAt = now + 24h` — so the viewer stays dead for a full day per attempt, and no port ever binds (confirmed: nothing listening on 31xx).

**This is not a UI bug.** Fix: install `canvas` (needs `libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`), then restart. Until then every viewer surface is legitimately unavailable.

### C-8. Town / district spatial views

`/api/towns` → `{"towns":[]}`, `/api/town-relationships` → `{"relationships":[]}`. **EMPTY-BY-DESIGN** — no town has been founded on the fresh server. District views are gated behind town selection and cannot be exercised.

### C-9. `/api/schematics` — cold-start timeout

First (cold) call measured **19.4s**; subsequent calls 0.12s (cached). Against the client's 10s cap, **the first visit to `/map` or `/build` after a backend restart always fails to list schematics**; a reload then works. Payload is 50 KB across schematics up to 1.8M blocks (`Cute house.schem`).

### Maps verdict

| Surface | Verdict |
|---|---|
| Terrain layer | **BROKEN** — worker contention vs 10s timeout; never renders |
| Terrain height probe | **BROKEN** — `height` vs `y` |
| Markers | **BROKEN** both directions (write drops position, read expects flat x/z) |
| Zones / Routes / Squads overlays | **BROKEN, currently dormant** — will freeze the canvas on first real record |
| Walk-to / guard / patrol from map | **BROKEN** — 100% failure |
| prismarine-viewer | **BROKEN** — missing `canvas` native dep |
| Town districts | **EMPTY-BY-DESIGN** |
| Bot/player dots | **WORKS** (socket-fed) |

The operator's "maps don't work" is accurate and is **at least six independent faults**, not one.

---

## PART C-bis — Broken flows outside the map

### "Start Build" is 100% broken. Verified live.

```
POST /api/builds {"filename":"astronaut.schem","botNames":["Scout"],
                  "cleanupBotNames":[],"originMode":"absolute","fillFoundation":true}
→ HTTP 400 {"error":"schematicFile and botNames[] are required"}
```

Three breaks in one call — `web/src/lib/api.ts:907` ↔ `src/server/routes/buildRoutes.ts:19-25`:

1. Client sends **`filename`**; backend destructures **`schematicFile`** → `undefined` → **unconditional 400** on every build start.
2. Client **spreads options flat** (`fillFoundation`, `snapToGround`, `clearSite`, `originMode`, `mode` — `app/build/page.tsx:357`); backend reads `options?.originMode` (`buildRoutes.ts:20`), `options?.mode` (`:34`), `options?.autoGather` (`:39`). Even after fixing #1, **all five Build-Configuration toggles would be silently ignored.**
3. `cleanupBotNames` is sent top-level; `BuildCoordinator.startBuild` expects it inside `options` (`src/build/BuildCoordinator.ts:1079-1085`) → the "Create Bots for Task" cleanup path is dead.

No compatibility shim exists (grepped `src/server/` for `req.body.filename` / `schematicFile ??` — zero hits). `/api/builds` confirmed still `[]` after the test.

### The Active Build panel is frozen even when a build runs

`app/build/page.tsx:124` reads `useBotStore.activeBuild`, written **only** by the page itself (`:164, :359, :410, :418, :426`). The socket build refetch writes a **different store** — `SocketProvider.tsx:225` → `useBuildStore.setBuilds`, which nothing on `/build` reads.

So progress bar (`:581`), block counter (`:578`), status badge (`:536`) and every per-bot card (`:593-618`) stay frozen at creation-time values until manual reload. `MaterialList.tsx:97` even documents the false assumption ("the active-build card itself already mutates `activeBuild` … via the SocketProvider") — it does not.

### Every mayor-gated town action is unreachable

`requireMayor` (`src/server/routes/townRoutes.ts:36-59`) 403s when `town.config.mayor.playerName` is unset, and takes identity **only** from the signed `pid` cookie — the body-field fallback was removed today (`:45-47`).

Two failures stack:
1. **The Found-Town wizard never sets a mayor.** `FoundTownModal.tsx:135-141` sends `{name, capital, stylePreset, mayorTitle}` — no `mayorPlayerName`, though the backend accepts and persists it (`townRoutes.ts:82,107` → `TownManager.ts:607`). The `defaultMayorUsername="packetloss404"` prop (`app/town/page.tsx:193`) is spent entirely on the cosmetic *title*. ⇒ **every dashboard-founded town has `mayorPlayerName: null`.**
2. The UI still passes `mayorPlayerName` **in the request body**, which the backend now ignores (`api.ts:1324, 1309, 1378, 1402`).

Dead as a result: mayor decree (disabled client-side, `MayorPanelCard.tsx:101-109`), request expansion (blocked at `ChildTownsCard.tsx:57-62`), approval decide (401/403), set relationship, approval-mode. **And there is no link to `/login` anywhere on `/town`** to mint the required cookie, nor any logout/"who am I" affordance.

Also dead: vote-mode approvals render a read-only tally with **no vote button** (`api.castApprovalVote` has zero callers); Memorial Park shows no park (`api.getMemorialPark` never called).

### Routines: the recording banner never appears. Verified live.

```
GET /api/routines/recording → {"isRecording":false,"draft":null}
```

Backend emits **`isRecording`** (`routineRoutes.ts:38-43`); client reads **`data.recording`** (`api.ts:983` ← `app/routines/page.tsx:252`) → always `undefined`. The red "Recording…" banner (`:382-413`) never shows on load, and the Record form (gated on `!recording`, `:441`) stays visible **even while a recording is in flight**. It only appears to work within one session because `handleStartRecording` sets the flag locally (`:328`).

### Chat: no message timestamps exist server-side

`web/src/lib/api.ts:234-238` declares `ChatMessage.timestamp?`; the backend type is `{role, text}` **only** (`src/personality/ConversationManager.ts:10-13`, writers at `:32` and `:38`).

So `lastActivity` is always 0 (`app/chat/page.tsx:47`), **thread sort-by-recency is a no-op** (`:58`), and both time displays never render (`:160-164`, `:225-229`). Needs a backend field.

### Districts expose zero spatial data

`bounds` is stored (`src/town/db.ts:60`), typed (`src/town/Town.ts:53`) and **served** (`townRoutes.ts:269`) — then dropped by `TownDistrictDTO` (`web/src/lib/api.ts:1520-1529`), which has no `bounds` and no `center`. `DistrictsCard.tsx:100-124` renders name + chips + date only. `DistrictManager` lays out non-overlapping 64×64 footprints (`src/town/DistrictManager.ts:295`) that never reach the browser. **There is no district map anywhere.** The "active district" marker (`DistrictsCard.tsx:59-68`) is a client-side *guess* re-implementing `DistrictManager.getActiveDistrictFor`.

Empty-world behaviour on `/town` is **safe** — `EmptyState` at `page.tsx:169-171`, all polls early-return on null `activeTownId`, `capital` never null server-side. No null-deref path.

### Orphaned components (defined, imported by nothing)

`MissionComposer.tsx` (its `api.createMission` positional form produces a body `missionCommandRoutes.ts:28` rejects — dead *and* broken), `MissionQueuePanel.tsx` (`api.ts:1072-1076` sends `{order}`; backend reads `{action, missionId, position}`), `CommanderPanel.tsx` (`api.commanderExecute` posts `{plan}`; backend requires `{planId}`), `DiagnosticTimeline.tsx`, plus map's `MarkerEditor.tsx` and `MapEntitySidebar.tsx`.

---

## Shape mismatches — consolidated, both sides

| # | UI expects (`file:line`) | Backend emits (`file:line`) | Impact |
|---|---|---|---|
| 1 | `res.y` — `web/src/app/map/page.tsx:826`, `:1454`; decl `web/src/lib/api.ts:902` | `{x,z,height,surfaceBlock}` — `src/server/routes/terrainRoutes.ts:69`, `:73` | Build origins get `undefined` Y |
| 2 | body `{x,y,z}` with `y:null` — `web/src/lib/api.ts:760-764` | rejects `y == null` — `src/control/CommandCenter.ts:558-562` | All map walk-to fails |
| 3 | body `{directive}` — `web/src/lib/api.ts:1043` | reads `description` — `src/server/routes/botsRoutes.ts:556-557` | Swarm directive always 400 |
| 4 | body `{name,x,y,z,type}` — `web/src/lib/api.ts:834-838` | stores `position`/`kind` — `src/control/MarkerStore.ts:149-171`; type `src/control/WorldTypes.ts:1-10` | Markers positionless |
| 5 | `marker.x`/`.z` — `web/src/lib/mapDrawing.ts:59`; `map/page.tsx:757`, `:1280`, `:1286` | `position:{x,y,z}` — `src/control/WorldTypes.ts:1-10` | Markers draw `NaN` |
| 6 | `zone.type` — `web/src/lib/mapDrawing.ts:123` | `mode` — `src/control/WorldTypes.ts:15` | `TypeError`, freezes canvas |
| 7 | `route.waypoints` — `web/src/lib/mapDrawing.ts:139` | `waypointIds` — `src/control/WorldTypes.ts:23-28` | `TypeError`, freezes canvas |
| 8 | `squad.members` — `web/src/lib/mapDrawing.ts:329` | `botNames` — `src/control/FleetTypes.ts:1-4` | `TypeError`, freezes canvas |
| 9 | `shape:'rect'` — `web/src/components/map/ZoneEditorDialog.tsx:35` | enum `'rectangle'` — `src/control/WorldTypes.ts:16`; check `CommandCenter.ts:619-627` | Zones un-guardable |
| 10 | `mission.name` — `web/src/lib/mapDrawing.ts:310` | `title` — `src/control/MissionTypes.ts:26-43` | Cosmetic; shows type not title |
| 11 | `MetricsData{uptime,botCount,…}` — `web/src/lib/api.ts:551-563` | `{timestamp,bots,tasks,commands,missions,commander,fleet,skills}` — `src/server/routes/metricsRoutes.ts:170-179` | Zero overlap; masked by `any` |
| 12 | `{skills:{name,code}[]}` — `web/src/lib/api.ts:717` | 7 fields — `src/server/routes/skillRoutes.ts:36-44` | Forces 3 casts |
| 13 | `apiKey` — `web/src/app/settings/page.tsx:13` | only `keyMasked` — `src/ai/LLMSettings.ts:102-109` | Dead decl; **no break** |
| 14 | recomputes cap — `web/src/app/settings/page.tsx:628` | `codegenPaidAllowed` — `src/server/llmRoutes.ts:139` | Misses idle-throttle |
| 15 | `{success}` — `api.ts:829`, `:814`, `:791`, `:796` | `{mission}` `missionCommandRoutes.ts:137`; `{command}` `:176`; `{request}` `controlRoutes.ts:119`, `:125` | Cosmetic |
| 16 | body `{filename, ...options}` flat — `web/src/lib/api.ts:907` | `{schematicFile, origin, botNames, options}` — `src/server/routes/buildRoutes.ts:19-25` | **Start Build 400s always** |
| 17 | `data.recording` — `web/src/lib/api.ts:983`; `app/routines/page.tsx:252` | `isRecording` — `src/server/routes/routineRoutes.ts:38-43` | Recording banner never shows |
| 18 | `ChatMessage.timestamp` — `web/src/lib/api.ts:234-238`; `app/chat/page.tsx:47`, `:160`, `:225` | `{role,text}` only — `src/personality/ConversationManager.ts:10-13` | Thread sort is a no-op |
| 19 | `b.completedAt` / `b.metadata` — `app/build/history/page.tsx:129-130`, `:262`, `:352`, `:400` | no such fields on `BuildJob` — `src/build/BuildCoordinator.ts:29-66` | "Completed" column always `-` |
| 20 | `TownDistrictDTO` has no `bounds`/`center` — `web/src/lib/api.ts:1520-1529` | serves raw rows incl. `bounds` — `src/server/routes/townRoutes.ts:269` | No district map possible |
| 21 | `{edges}` — `web/src/lib/api.ts:1406` | `{relationships}` — `src/server/routes/townRoutes.ts:949` | Masked by defensive read |
| 22 | `{town}` — `web/src/lib/api.ts:1194-1203` | `{paused:bool}` — `src/server/routes/townRoutes.ts:145`, `:156` | Type lie; UI is optimistic |
| 23 | body `{order}` — `web/src/lib/api.ts:1072-1076` | `{action, missionId, position}` — `src/server/routes/missionCommandRoutes.ts:141` | Orphaned component |
| 24 | sends `prepend` — `web/src/lib/api.ts:761-765` | destructures `description` only — `src/server/routes/botsRoutes.ts:494` | `prepend` is a no-op |
| 25 | `BotDetailed.world` — `web/src/lib/api.ts:208-214` | also sends `timeOfDayTicks`, `day` — `src/bot/BotInstance.ts:2240-2249` | World-time invisible to tabs |

---

## Ranked fix list — for the operator to SEE the fleet working

**Tier 0 — nothing works without this** *(owned by the other agent)*
1. `web/src/lib/api.ts:1` — same-origin base like `socket.ts:27`. The proxy already works (`curl :3000/api/status` → 200). One line unblocks every page below.

**Tier 1 — one-line body fixes that restore whole features**
2. **`POST /api/builds`: `filename` → `schematicFile`, nest `options`** (`web/src/lib/api.ts:907`). Verified 400 live. This is the single highest-value fix in the audit — "Start Build" is a headline feature that has never worked, and the fix is a few lines in one function. Nesting `options` simultaneously revives all five build-config toggles.
3. **Surface budget state outside `/settings`.** The cap is tripped *right now* (`$10.1836 / $10.00`, `codegenPaidAllowed:false`); codegen is silently downgraded Opus→Gemini fleet-wide and the log repeats the fallback line continuously. A badge on `/` and `/metrics` reading `codegenPaidAllowed` (not the client recompute at `settings/page.tsx:628`) turns "the bots are dumb today" into a one-glance answer.
4. **Backfill `/activity` from `GET /api/activity`.** One call to an already-wrapped helper (`api.ts:748`). Today a deep-link shows "No activity yet" while the server holds 500 events — the cheapest "it's alive" win in the codebase.
5. **`sendSwarmDirective` `{directive}` → `{description}`** (`api.ts:1043`). Verified 400 live. One word restores the Swarm Directive panel.
6. **Routines `data.recording` → `data.isRecording`** (`api.ts:983`). Verified live. One word.

**Tier 2 — make the map work**
7. **Fix terrain latency** (`src/worker/botWorker.ts:314-335`, `terrainRoutes.ts:17-29`). Cache/yield/cap-to-loaded-chunks, or use a dedicated non-voyager probe. Without this the map is blank regardless of Tier 0. Interim mitigation: drop `TERRAIN_RADIUS` from 96 (`map/page.tsx:39`) — it's clamped to 64 anyway, and smaller scans usually land under the timeout.
8. **Fix the three canvas-killing overlays** (`mapDrawing.ts:123, :139, :329` → `mode`, `waypointIds`, `botNames`). Dormant only because the world is empty; they detonate on the operator's first zone or squad. **Fix before populating the world.**
9. **`terrain/height` `height`→`y` + `walkTo` Y** (mismatches 1 & 2, both verified live). Together these restore "click the map, send a bot" — the most intuitive proof the fleet responds.
10. **Markers, both directions** (mismatches 4 & 5, verified live) — send `position`/`kind`, read `marker.position`. Switch edit to the existing `PATCH /api/markers/:id` instead of delete-and-recreate.
11. **Point `/build` at `useBuildStore`** instead of `useBotStore.activeBuild` (`app/build/page.tsx:124` vs `SocketProvider.tsx:225`) so the progress panel stops freezing.

**Tier 3 — close today's work**
12. **Expose `mining`**: add to `PATCHABLE_SECTIONS` (`configPersist.ts:36`), extend `FIELD_TYPES` (`:89-131`) for object/array, add a tab (`settings/page.tsx:48-55`). Guard the `protectedZones: []` → string-array misdetection (`SettingsSection.tsx:364`) before shipping.
13. **Aggregate cache tokens in `TokenLedger.getMetrics()`** (`TokenLedger.ts:124-150`), then show hit-rate + savings on `/settings`. Data is already recorded and priced — only the aggregation is missing. Fixes the Total-Tokens-vs-Est-Cost contradiction.
14. **Wire `GET /api/llm/routes`** into settings so the routing table doesn't depend on `getSettings()` incidentally spreading `routes` — today's config is one refactor away from being wiped by a Save.
15. **Add pricing rows** for catalog models that have none (`TokenLedger.ts:11-59`) — selecting them silently disarms the budget cap.
16. **Install `canvas`** (`libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev`) and restart to revive prismarine-viewer.

**Tier 4 — town governance (a coherent chunk, not a one-liner)**
17. **Send `mayorPlayerName` from `FoundTownModal`** (`:135-141`) and add a login/logout affordance so a `pid` cookie can be obtained. Without both, decrees, expansion, approval-decide, diplomacy and approval-mode are all unreachable. Add a vote button for vote-mode approvals (`api.castApprovalVote` has zero callers).
18. **Subscribe to `town:event` / `town:chronicle` / `town:disaster`** — already broadcast, would replace three polling loops.
19. **Add `bounds`/`center` to `TownDistrictDTO`** (`api.ts:1520-1529`); the server already sends them. Prerequisite for any district map.

**Tier 5 — dead surfaces & correctness**
20. `/roles` approvals + overrides panels: no fetch, no socket wiring, live endpoints ready (`controlRoutes.ts:114`, `:127`).
21. `/fleet` squads: add an initial fetch (socket-event-only today, `SocketProvider.tsx:222, :241-242`); add write helpers for the existing squad CRUD.
22. `/admin` restart copy (`admin/page.tsx:99`, `:196-198`) contradicts `src/server/admin.ts:232-237` — it **stops** the fleet under `Restart=on-failure`. Relabel to "Flush & Stop"; an operator will otherwise take the fleet down expecting a respawn.
23. Add a **"Release quarantine"** control — `POST /api/bots/:name/quarantine/release` exists, the alert toast fires, and impersonation incidents are live right now, but there is no recovery path in the UI.
24. Chat timestamps need a **backend** field (`ConversationManager.ts:10-13`) before the UI can sort or display them.
25. Delete dead files: `MissionComposer.tsx`, `MissionQueuePanel.tsx`, `CommanderPanel.tsx`, `DiagnosticTimeline.tsx`, `map/MarkerEditor.tsx`, `map/MapEntitySidebar.tsx`, ~400 unused lines of `components/map/mapDrawing.ts` (conflicting `TERRAIN_RADIUS`/`TERRAIN_STEP` vs `lib/mapDrawing.ts`).
26. `/settings` fetches omit `credentials: 'include'` (`settings/page.tsx:316-319` etc.) — the page 401s entirely if `DASHBOARD_AUTH_SECRET` is ever set. Auth is currently disabled, so this is latent.
27. Dead deep-links: `/build?schematic=` and `/map?marker=` — neither page reads `useSearchParams`.

---

## Notes on method

- Backend was **not** restarted. One test marker was created and deleted; `/api/markers` verified back to `[]`.
- All "empty" verdicts were confirmed by live `curl`, not inferred from code.
- `web/next.config.ts:18` sets `typescript: { ignoreBuildErrors: true }` — **every shape mismatch above compiles clean** and only fails at runtime. That flag is why 15 mismatches accumulated undetected.
