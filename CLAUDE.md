# mc-fleet-bot

## Project Overview

mc-fleet-bot (formerly DyoBot / mc-server-bot) is a Voyager-style AI-powered Minecraft bot sidecar. It connects mineflayer bots to a Minecraft server and uses an LLM to autonomously plan and execute tasks through code generation, with personality and social relationship systems.

The target server is whatever `minecraft.host` in `config.yml` points at — as of 2026-07-24 that is a stock Paper 1.21.11 server at `10.80.13.14`, not the historical DyoCraft box (`play.dyoburon.com`, since upgraded to Paper 26.2 / protocol 776, which no mineflayer release can speak). World-specific coordinates (`mining.protectedZones`, `mining.mineSite`, `leash`, `rescueHome`) were emptied in that move, but **they have since been repopulated for this world** — as of 2026-08-07 `config.yml` carries 23 named protected zones (`ravensreach-town-hall` and others), `mineSite` at `-85, 64, -440`, a `rescueHome`, and a `leash` entry. Do not assume the geofence is a no-op: the block-placement and dig guards in `src/bot/BotInstance.ts` are enforcing against real zones. One caveat that IS still true — `leash` covers a single bot (`Architect`), so the rest of the fleet roams unleashed.

## Build & Run

```bash
npm run build
npm run dev
npm start
```

Two systemd units run the stack, both enabled at boot, restart-on-failure with a 5s backoff:

- `mc-fleet-bot.service` — bot API on port **3001** (`/opt/stacks/mc-fleet-bot`, `node dist/index.js`, logs to `/var/log/mc-fleet-bot.log`)
- `mc-fleet-web.service` — Next.js dashboard on port **3000** (`/opt/stacks/mc-fleet-bot/web`, `npm start`, logs to `/var/log/mc-fleet-web.log`). Depends on `mc-fleet-bot.service` and calls its API.

The units were renamed off the legacy `dyobot` name on 2026-07-24; nothing named `dyobot` runs on this host any more.

```bash
sudo systemctl restart mc-fleet-bot       # after npm run build (root)
sudo systemctl restart mc-fleet-web       # after web build (cd web && npm run build)
sudo systemctl status mc-fleet-bot mc-fleet-web --no-pager
```

`Restart=on-failure` means a **clean** exit is not respawned. Consequences: `POST /api/admin/restart` exits 0, so it stops the fleet rather than restarting it (see Admin Endpoints), and `kill <pid>` (SIGTERM) leaves the service down — systemd counts SIGTERM as a clean stop. Use `systemctl restart`, which needs root.

Logs:

```bash
tail -f /var/log/mc-fleet-bot.log
tail -f /var/log/mc-fleet-web.log
grep -E "task proposed|Execution result|task evaluated" /var/log/mc-fleet-bot.log
```

Dashboard URL: `http://<host>:3000/`.

For ad-hoc foreground runs (e.g. debugging a startup crash), stop the relevant service first. Note that Next.js' `next-server` child binds IPv6 `*:3000` and won't show up in `lsof -ti:3000` (IPv4-only) — use `sudo lsof -i :3000` or `ss -tlnp | grep :3000` to find leftover processes.

## Testing

```bash
npm test
```

Tests use Vitest. Configuration is in `vitest.config.ts`.

**`npm test` covers neither `world-builder/` nor `fleet-devtools/`.**
`world-builder/` is a separate Python toolchain with its own pytest suite;
`fleet-devtools/` is a separate npm workspace with its own `vitest.config.ts`.
The root `vitest.config.ts` collects only `src/**/*.test.ts` and
`test/**/*.test.ts`, and the root `tsconfig.json` compiles only `src/**/*`.
See their sections below.

Note for any full-suite run: the `test/build/` Combined Zones tests read
`data/world-review/*.json`, and `data/` is gitignored — so on a fresh clone
~60 test files fail on `ENOENT` regardless of code state. That is structural,
not a regression.

## World Builder (`world-builder/`)

**mcwb** — a standalone Python package (Python 3.11+) that applies a versioned
masterplan to a live Minecraft world. It was its own repo
(`packetloss404/mc-world-builder`) until 2026-08-07, when it was merged in via
`git subtree` with history preserved. **The original GitHub repo still exists
and was not deleted.**

- **Input:** `docs/masterplans/<plan>/04-contractor/contractor-brief.json`
  (five plans currently carry one). Read in place; mcwb never writes back.
- **Coupling:** the on-disk masterplan format, and nothing else. No module in
  `src/` imports it, and it is not part of the Node build.

```bash
cd world-builder
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"      # required: litemapy + the package itself
pytest                        # 22 tests
```

Without the editable install, pytest fails at *collection* with
`ModuleNotFoundError: litemapy` / `mcwb.build`. That is a missing venv, not a
broken checkout — do not debug it as one.

## Fleet Devtools (`fleet-devtools/`)

**mc-fleet-devtools** — a read-only Node 20 / TypeScript / ESM workbench that
inspects *copied* Anvil snapshots and SQLite catalogs and emits HTML reports
with hash-bound artifact manifests. REST API + dashboard on port **4310**, plus
a CLI and a serialized job worker. Its own repo until 2026-08-07, merged via
`git subtree` with history preserved. **The original GitHub repo still exists
and was not deleted.**

- **Separate toolchain.** Root `tsconfig.json` → `include: ["src/**/*"]`; root
  `vitest.config.ts` → `src/**/*.test.ts` + `test/**/*.test.ts`. `npm run
  build` and `npm test` do **not** cover it. The root `package.json` declares
  no `workspaces`, so the root `npm install` does not install it — run
  `npm install` inside `fleet-devtools/`. Run every devtools command from that
  directory, never from the repo root.
- **Coupling is on-disk formats only, and nothing is wired up.** Its snapshot
  digest matches `scripts/hash_world_snapshot.mjs` byte for byte
  (`filename + NUL + bytes + NUL`, sorted); its `world-features` step reads the
  table `src/world/WorldFeatureStore.ts:473` creates in `data/world-map.db`;
  its `database-catalog` step can read `data/town.db`. But no module imports
  across the boundary in either direction, and the file that would connect them
  (`config/registry.local.yml`) is gitignored and absent from the checkout.
  **Do not describe this as a pipeline.**
- **Read-only by design.** No RCON, WorldEdit, upload, or world mutation. Do
  not add any to a report recipe; recipe steps are an allow-list, not scripts.
- **CI lives at the repo root** — `.github/workflows/fleet-devtools.yml`,
  scoped to `paths: ['fleet-devtools/**']`. The nested
  `fleet-devtools/.github/workflows/ci.yml` is an inert signpost; GitHub reads
  workflows only from the repository root. Edit the root one.

```bash
cd fleet-devtools
npm install
npm run check      # lint + build + test + format:check
npm run dev        # API + dashboard on 4310 — binds 0.0.0.0, no auth
```

**Cross-platform trap.** If `node_modules/` was installed on a different OS
than you are running on, native modules fail in ways that look like
application bugs: `better-sqlite3` throws `invalid ELF header`, and esbuild
dies at *config load* with `Host version "X" does not match binary version
"Y"` — before vitest reads its own config. `npm rebuild better-sqlite3` fixes
the first; `rm -rf node_modules && npm install` fixes the general case. Do not
debug these as vitest or SQLite problems. (Same class as `web/node_modules`
being win32 — see the deploy notes.)

## Setup

1. Copy `.env.example` to `.env` and set the API key for the configured provider (`GOOGLE_API_KEY` for Gemini, `ANTHROPIC_API_KEY` for Anthropic)
2. Configure `config.yml`
3. Run `npm install && npm run build && npm start`

## Spawning Bots

```bash
curl -s -X POST http://127.0.0.1:3001/api/bots \
  -H 'Content-Type: application/json' \
  -d '{"name":"BotName","personality":"farmer","mode":"codegen"}'
```

Available personalities: merchant, guard, explorer, farmer, blacksmith, elder

## Checking Status

```bash
curl -s http://127.0.0.1:3001/api/bots
```

## Architecture

- `src/bot/` - bot lifecycle and Mineflayer connection management
- `src/voyager/` - curriculum, action, critic, skill library, execution loop
- `src/actions/` - primitive movement, mining, crafting, combat, container, patrol actions
- `src/ai/` - LLM client abstraction with Anthropic, Gemini, OpenAI, MiniMax, Ollama, and VoyageAI clients, plus `ModelRouter`/`ProviderRegistry` for per-task routing and `TokenLedger` for usage/budget tracking
- `src/personality/` - affinity, conversation, personality behavior
- `src/social/` - bot-to-bot messaging and memory
- `src/server/api.ts` - Express app assembly and wiring; a thin registration hub — route handlers live in `src/server/routes/`
- `src/server/routes/` - ~17 route modules (bots, events, town, build, campaign, chain, commander, control, config, routine, skill, metrics, missionCommand, schematic, terrain, grantHandler, helpers)
- `src/server/auth.ts` - dashboard/plugin/player-session auth (cookies, rate-limited login)
- `src/server/admin.ts` - operational admin endpoints (logs, backup, restart, heap snapshot)
- `src/server/llmRoutes.ts` - LLM provider/routing/usage/budget endpoints
- `src/server/socketEvents.ts` - Socket.IO real-time event broadcasting
- `src/server/EventLog.ts` - in-memory circular event buffer
- `src/control/` - fleet control platform (CommandCenter, MissionManager, MarkerStore, SquadManager, RoleManager, CommanderService)
- `src/town/` - Town Builder subsystem (TownManager, TownBrain loops, decrees/approvals, chronicle, diplomacy, districts, disasters/Phoenix recovery)
- `src/security/` - impersonation monitoring (bot-name spoof detection and quarantine)
- `src/build/` - schematic-based build coordination
- `src/supplychain/` - supply chain templates and coordination
- `src/worker/` - worker thread handles, IPC channel, and proxies for cross-thread access
- `src/util/` - logger, sleep, atomic file writes, and shared utilities
- `src/config.ts` - YAML config loader and `Config` interface

## API Endpoints

### Auth

- `POST /api/auth/login` - mint session cookies (body: `{playerName?, secret?}`; sets the dashboard cookie when `DASHBOARD_AUTH_SECRET` is configured, and a signed `pid` player-identity cookie when `playerName` is given). Rate-limited: 5 failed attempts per IP per 15 min.
- `POST /api/auth/logout` - clear both cookies
- `GET /api/auth/status` - auth config + session state (enabled, authenticated, playerName)
- `GET /api/auth/me` - session player name

When `DASHBOARD_AUTH_SECRET` is set, all `/api/*` routes except `/api/auth/*`, `/api/events/*`, `/api/health`, and `/api/status` require the dashboard session; `/api/events/*` requires the `X-Plugin-Token` header when `PLUGIN_AUTH_TOKEN` is set.

### Core Bot Management

- `GET /api/health` - liveness check
- `GET /api/status` - health check (returns bot count)
- `GET /api/bots` - list all bots (basic status)
- `GET /api/bots/:name` - get single bot (basic status)
- `POST /api/bots` - create a bot (body: `{name, personality, location?, mode?}`)
- `DELETE /api/bots/:name` - remove a single bot
- `DELETE /api/bots` - remove all bots
- `POST /api/bots/:name/mode` - set bot mode (body: `{mode: "primitive"|"codegen"}`)
- `GET /api/security/impersonation` - impersonation monitor state
- `POST /api/bots/:name/quarantine/release` - release a quarantined bot

### Event Relay (Java plugin integration)

- `POST /api/events/chat` - relay chat event (body: `{playerName, message, nearestBot}`)
- `POST /api/events/player-join` - relay player join (body: `{playerName}`)
- `POST /api/events/player-leave` - relay player leave (body: `{playerName}`)
- `POST /api/events/player-death`, `/block-placed`, `/block-broken`, `/item-crafted`, `/entity-killed`, `/player-move` - additional world-event relays (body: `{playerName, ...}` per event)

### Dashboard Endpoints

- `GET /api/bots/:name/detailed` - enriched bot status (cached from worker)
- `GET /api/bots/:name/inventory` - bot inventory items
- `GET /api/bots/:name/relationships` - bot affinity scores
- `GET /api/bots/:name/conversations` - bot conversation history
- `GET /api/bots/:name/tasks` - bot task state (current, queued, completed, failed)
- `GET /api/bots/:name/viewer-port` - prismarine-viewer port for the bot
- `GET /api/bots/:name/observed-role` - inferred role from observed action stats
- `GET /api/bots/:name/decisions` - recent decision records
- `GET /api/bots/:name/memories` - bot memories
- `GET /api/bots/:name/messages` - bot-to-bot message log
- `GET /api/bots/:name/diagnostics` - bot diagnostics
- `GET /api/bots/:name/llm-trace` - recent LLM call trace for the bot
- `GET /api/relationships` - full social graph (all bots and players)
- `GET /api/players` - online players; `GET /api/players/:name/intent` - inferred player intent
- `GET /api/reputation` / `GET /api/reputation/:name` - player reputation scores
- `GET /api/world` - aggregate world state (time, weather, online count)
- `GET /api/world/model` - shared world-model snapshot
- `GET/POST /api/world/features`, `GET/PATCH/DELETE /api/world/features/:id` - durable project/as-built asset catalog
- `POST /api/world/features/import` - idempotent bulk feature import by project/external ID
- `GET/POST /api/world/scans`, `GET /api/world/scans/:id`, `POST /api/world/scans/:id/observations|complete` - persisted survey runs and findings
- `GET /api/events/world` - world event feed
- `GET /api/difficulty` - adaptive difficulty state
- `GET /api/culture` - emergent culture state
- `GET /api/swarm/plans` - current swarm plans
- `GET /api/blackboard` - shared blackboard state
- `GET /api/activity` - activity event log (query: `limit`, `bot`, `type`)

### Skill Library

- `GET /api/skills` - list all learned skills with code preview
- `GET /api/skills/stats` - skill usage statistics
- `GET /api/skills/:name` - get single skill with full code
- `PUT /api/skills/:name` - update skill code
- `DELETE /api/skills/:name` - delete a skill

### Bot Interaction

- `POST /api/bots/:name/chat` - send chat message to bot (body: `{playerName, message}`)
- `POST /api/bots/:name/say` - make the bot say a chat line
- `POST /api/bots/:name/bot-message` - inject a bot-to-bot message
- `POST /api/bots/:name/task` - queue a task for bot (body: `{description}`)
- `POST /api/bots/:name/grant` - grant items (dev-only: NODE_ENV=development or `config.auth.devSecret`)
- `POST /api/swarm` - set a swarm directive (body: `{description, requestedBy?}`)
- `POST /api/blackboard/swarm-directive` - set the swarm directive directly on the blackboard

### Metrics

- `GET /api/metrics` - aggregate metrics (bots, tasks, commands, missions, commander, fleet, skills)
- `GET /api/metrics/civilization` - town/civilization metrics

### Commander Endpoints

- `GET /api/commander/history` - list commander parse history (query: `limit`)
- `POST /api/commander/parse` - parse natural language into a plan (body: `{input}`)
- `POST /api/commander/execute` - execute a parsed plan (body: `{planId}`)
- `GET /api/commander/drafts` - list saved command drafts
- `POST /api/commander/drafts` - create or update a draft (body: `{input, plan?, notes?, id?}`)
- `DELETE /api/commander/drafts/:id` - delete a draft
- `POST /api/commander/clarify` - re-parse with clarification answers (body: `{originalInput, clarifications}`)
- `GET /api/commander/suggestions` - get suggested commands

### Build Endpoints

- `GET /api/schematics` - list available schematics
- `GET /api/schematics/:filename` - get schematic details
- `POST /api/schematics/upload` - upload a `.schem` file (multipart `file`)
- `GET /api/builds` - list all build jobs
- `POST /api/builds` - create a build job (body: `{schematicFile, origin, botNames, options?}`)
- `GET /api/builds/:id` - get a specific build job
- `POST /api/builds/:id/cancel` - cancel a build
- `POST /api/builds/:id/pause` - pause a build
- `POST /api/builds/:id/resume` - resume a build
- `POST /api/builds/:id/retry` - retry a failed build
- `POST /api/builds/:id/demolish` - demolish a completed build
- `POST /api/tunnel` - dig a tunnel job

### Campaign Endpoints

- `GET /api/campaigns` - list all campaigns
- `GET /api/campaigns/:id` - get a specific campaign
- `POST /api/campaigns` - create a campaign (body: `{name, structures[], maxParallel?, autoSpawn?, spawnPersonality?, cleanupBots?, start?}`)
- `POST /api/campaigns/:id/start` / `pause` / `resume` / `cancel` - campaign lifecycle
- `DELETE /api/campaigns/:id` - delete a campaign

### Supply Chain Endpoints

- `GET /api/chains/templates` - list chain templates
- `GET /api/chains` - list all chains
- `POST /api/chains` - create a chain (body: `{name, description?, templateId?, stages?, loop?, botAssignments?, chestLocations?}`)
- `GET /api/chains/:id` - get a specific chain
- `POST /api/chains/:id/start` - start a chain
- `POST /api/chains/:id/pause` - pause a chain
- `POST /api/chains/:id/cancel` - cancel a chain
- `DELETE /api/chains/:id` - delete a chain

### Terrain Endpoints

- `GET /api/terrain` - scan blocks in a region (query: `x`, `y`, `z`, `radius`)
- `GET /api/terrain/height` - get terrain height at a column (query: `x`, `z`, `maxY?`, `minY?`)

### Control Platform Endpoints

- `GET/POST /api/markers`, `PATCH/DELETE /api/markers/:id` - named world markers
- `GET/POST /api/zones`, `PATCH/DELETE /api/zones/:id` - zones
- `GET/POST /api/routes`, `PATCH/DELETE /api/routes/:id` - patrol routes
- `GET/POST /api/squads`, `GET/PATCH/DELETE /api/squads/:id` - squads
- `POST /api/squads/:id/bots`, `DELETE /api/squads/:id/bots/:botName` - squad membership
- `GET/POST /api/roles/assignments`, `PATCH/DELETE /api/roles/assignments/:id` - role assignments
- `GET /api/roles/approvals`, `POST /api/roles/approvals/:id/approve` / `reject` - role approval queue
- `GET /api/roles/overrides`, `DELETE /api/bots/:name/override` - role overrides

### Mission & Command Endpoints

- `GET/POST /api/missions`, `GET /api/missions/:id` - missions
- `POST /api/missions/:id/:action` - mission lifecycle action (pause/resume/cancel/...)
- `PATCH/DELETE /api/bots/:name/mission-queue` - edit or clear a bot's mission queue
- `GET/POST /api/commands`, `GET /api/commands/:id`, `POST /api/commands/:id/cancel` - fleet commands
- `POST /api/bots/:name/pause` / `resume` / `stop` / `follow` / `walkto` / `return-to-base` / `unstuck` / `equip-best` - per-bot control shortcuts (dispatched as commands)

### Routine & Template Endpoints

- `GET/POST /api/routines`, `PATCH/DELETE /api/routines/:id` - saved routines
- `POST /api/routines/:id/execute` - run a routine
- `GET /api/routines/recording`, `POST /api/routines/recording/start` / `stop` - record a routine from live commands
- `GET /api/templates`, `GET /api/templates/:id` - mission templates

### Runtime Config Endpoints

- `GET /api/config` - all patchable config sections
- `GET /api/config/:section` - one section plus its restart-required fields
- `PATCH /api/config/:section` - hot-patch a section (body: `{values}`); persists to `config.yml` and broadcasts to live workers

### LLM Management Endpoints

- `GET/POST /api/llm/providers`, `DELETE /api/llm/providers/:name` - provider registry
- `GET/PUT /api/llm/routes` - per-task-type model routing
- `POST /api/llm/reload` - reload LLM settings
- `GET /api/llm/usage` - token usage (TokenLedger)
- `GET/POST /api/llm/enabled` - toggle LLM usage
- `GET/PUT /api/llm/budget`, `POST /api/llm/budget/override` - budget limits and override

### Admin Endpoints

- `GET /api/admin/logs/stream` - live log stream
- `GET /api/admin/backup` - download a data backup
- `POST /api/admin/restart` - flush stores, then `process.exit(0)`. **It does not restart under the current systemd units** — `Restart=on-failure` ignores a clean exit, so this is effectively a graceful *stop* and the fleet stays down until someone runs `systemctl start`. Treat it as a flush-and-halt button.
- `POST /api/admin/heap-snapshot` - write a heap snapshot
- `GET /api/admin/info` - process/runtime info

### Town Builder Endpoints

Towns core:

- `GET /api/towns` - list towns
- `POST /api/towns` - found a town (body: `{name, capital, stylePreset?, mayorTitle?, mayorPlayerName?}`)
- `GET/PATCH/DELETE /api/towns/:id` - read, update, delete a town
- `POST /api/towns/:id/pause` / `resume` - pause/resume the town brain

Brain, planning, and style (reads): `GET /api/towns/:id/brain`, `/demand`, `/buildings`, `/designs`, `/style`, `/schedules`

Residents and roles:

- `GET/POST /api/towns/:id/residents` - list residents / add a resident (body: `{botName, role}`)
- `GET /api/towns/:id/roles` - town role assignments
- `POST /api/towns/:id/roles/:botName` - assign a role (body: `{role}`)

Districts and expansion:

- `GET/POST /api/towns/:id/districts` - list / create a district (body: `{name, stylePreset?, center}`)
- `GET /api/towns/:id/children` - child settlements
- `POST /api/towns/:id/expand` - trigger expansion

Events, highlights, chronicle:

- `GET /api/towns/:id/events` - town event log
- `GET /api/towns/:id/highlights`, `GET /api/highlights` - highlight ring buffer (per-town / cross-town)
- `GET /api/streaming/health` - highlight stream health
- `GET /api/towns/:id/chronicle` - chronicle entries
- `POST /api/towns/:id/chronicle/generate` - generate an entry (body: `{dayNumber?, force?}`)
- `GET /api/towns/:id/journals` - resident journals

Governance (mayor-only routes require the signed `pid` session cookie from `POST /api/auth/login`):

- `GET /api/towns/:id/decrees`, `GET /api/towns/:id/rules` - decree/rule reads
- `POST /api/towns/:id/mayor/decree` - issue a decree (body: `{text}`, mayor-only)
- `POST /api/towns/:id/propose-rule` - propose a rule (body: `{text, proposedBy?}`)
- `GET /api/towns/:id/approvals` - pending approvals
- `POST /api/towns/:id/approvals/:approvalId/vote` - cast a vote (body: `{voterBotName, choice}`)
- `POST /api/towns/:id/approvals/:approvalId/decide` - decide an approval (body: `{choice}`, mayor-only)
- `POST /api/towns/:id/approval-mode` - set approval mode (body: `{mode}`)

Disasters and diplomacy:

- `GET /api/towns/:id/disasters`, `GET /api/towns/:id/memorial` - disaster history and memorial park
- `GET /api/towns/:id/trade-routes` - trade routes
- `GET /api/towns/:id/relationships`, `POST /api/towns/:id/relationships/:peerTownId` - inter-town relations
- `GET /api/town-relationships` - full inter-town relationship graph

### Socket.IO Events (real-time)

- `bot:spawn` - bot created
- `bot:disconnect` - bot removed
- `bot:position` - bot position changed
- `bot:health` - bot health/food changed
- `bot:state` - bot state changed
- `bot:inventory` - bot inventory changed
- `bot:decision` - bot decision record
- `bot:died` - bot death
- `player:position` - player position update
- `world:event` - world event
- `security:alert` - impersonation/security alert
- `llm:call` - LLM call made
- `build:*` - build lifecycle (`started`, `progress`, `placing`, `gathering`, `gather-started`, `bot-status`, `reassign`, `completed`, `cancelled`, `demolished`, `tunnel`)
- `chain:*` - supply chain lifecycle (`started`, `stage-update`, `paused`, `completed`, `failed`, `cancelled`)
- `town:event` - town event stream
- `town:chronicle` - chronicle entry generated
- `town:disaster` - disaster recorded
- `activity` - general activity event

### Static Assets

- `GET /` - redirects to `/dashboard/`
- `GET /dashboard/*` - static dashboard files

## Data

- `data/bots.json` - bot spawn configurations
- `data/affinities.json` - player-bot relationship affinities
- `data/social_memory.json` - bot-to-bot social memory
- `data/world_memory.json` - shared world knowledge
- `data/blackboard.json` - shared blackboard state
- `data/completed_tasks.json` - completed voyager tasks
- `data/failed_tasks.json` - failed voyager tasks
- `data/stats.json` - bot statistics
- `data/qa_cache.json` - Q&A cache for AI responses
- `data/qa_embeddings.json` - Q&A embeddings
- `data/blockers.json` - blocker tracking
- `skills/` - learned skill code files
- `config.yml` - main runtime configuration
