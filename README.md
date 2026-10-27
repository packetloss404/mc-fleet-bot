# mc-fleet-bot

Build your own AI-powered Minecraft bot — and stand up an entire autonomous bot fleet, town, and AI civilization — on any Java Edition server you point it at.

> **Lineage:** originally created as **mc-server-bot** by Dylan ([dyoburon](https://github.com/dyoburon));
> substantially rebuilt and continued as **mc-fleet-bot** by Ian Walmsley
> ([packetloss404](https://github.com/packetloss404)) since 2026 — Voyager subsystem fixes, the
> autonomous town/rail buildout, mission & fleet management, cost guardrails, and the web dashboard.
> Full commit history and authorship preserved.

## What is this?

This is an open Minecraft bot framework where you create your own bot with a unique personality, deploy it to a Minecraft server, and watch it interact with other players and bots in real time. Bots learn, trade, fight, farm, and hold conversations — all autonomously.

Each bot uses a Voyager-style learning loop powered by LLMs: it proposes tasks for itself, **writes JavaScript to accomplish them, runs that code in a `vm` sandbox** (with timeout/interrupt/log capping), evaluates success with a critic agent, and saves working behaviors as reusable skills. Skills aren't just dumped to disk — they're retrieved by **hybrid semantic search** (per-skill TF-IDF sparse vectors + dense embeddings, cosine-scored), so a bot recalls the *relevant* past skill for a new task. Over time, your bot gets smarter.

That's the single-bot story. The repo is also the full **fleet + civilization platform** that runs on top: each bot is its own OS worker thread, a centralized control plane drives missions/squads/roles, and an autonomous **TownBrain** runs whole simulated societies with governance, diplomacy, economy, and a closed-loop generative-architecture build pipeline. A ~30k-LOC Next.js dashboard and a 200+ route HTTP API sit in front of all of it.

## Target server

The server is configuration, not a constant. Set it in the `minecraft` section of `config.yml`:

```yaml
minecraft:
  host: "your.server.host" # hostname or IP of the server to join
  port: 25565
  version: "1.21.11"       # must be a protocol version mineflayer speaks
  auth: "offline"          # "offline" | "microsoft"
  loginFlow: "none"        # "none" | "dyoauth"
  selectClass: false
```

The reference deployment currently runs against a stock **Paper 1.21.11** server on the LAN. `minecraft.*` is only read at connect time, so changing it needs a service restart.

A caveat worth knowing before you pick a server: mineflayer can only join a server whose protocol version it supports. A server running ahead of the newest mineflayer release (e.g. Paper 26.2, protocol 776) will reject every bot with "Outdated client!" until the server adds ViaBackwards or mineflayer catches up. The bot handles this gracefully — `bots.versionMismatchBackoffSec` drops reconnects to a slow heartbeat instead of a retry storm — but it cannot work around it.

`loginFlow: "dyoauth"` is a legacy chat-password + class-select onboarding dance for one specific server. Leave it `"none"` for vanilla/Paper; `minecraft.loginPassword` is only consulted by that flow.

## Features

### Per-bot intelligence
- **Voyager learning loop** — Bots propose tasks, generate code, run it in a sandboxed Node `vm`, critique the result, and persist what works
- **Hybrid skill memory** — Learned skills are retrieved by combined TF-IDF + dense-embedding similarity, not just filename lookup; `backfill-embeddings.ts` (run it with `npx tsx backfill-embeddings.ts`) re-embeds the whole library
- **Personality system** — Merchant, guard, explorer, farmer, blacksmith, elder, or builder archetypes
- **Affinity & social memory** — Bots remember players, build relationships, message each other, and share world knowledge
- **PIANO-style cognition** — Independent perception tick + cognitive controller keep chat coherent with the action a bot is actually taking (opt-in; both `cognition.*` flags ship off)
- **LLM-powered chat** — Natural, context-aware conversation

### Multi-provider LLM router
- **6 provider clients** — Anthropic, Gemini, OpenAI, MiniMax, Ollama, and VoyageAI behind a single `ModelRouter`
- **Per-task-type routing** — Different models for codegen, chat, design, embeddings, etc.
- **Production resilience** — Circuit breaker, retry/backoff, terminal-vs-retryable error classification, LRU embedding cache, and a `TokenLedger` that tracks cost per call
- **Outage auto-disable** — After 3 consecutive full-chain failures (deliberately below the circuit breaker's threshold, since a 30s cooldown only rate-limits a dead chain rather than stopping it), the global AI kill switch trips automatically and the fleet idles instead of churning. A recovery probe retries every 15 min, bypassing both the kill switch and the breaker — and accepts **only a paid provider** as proof of recovery, because a free local Ollama is always up and says nothing about drained credit. An operator toggle outranks the automatic one in both directions; `GET /api/llm/enabled` reports `autoDisabled` so "AI is off" is never ambiguous.
- **Untrusted-input fencing** — Task text is fenced in `<task>` tags and saved-skill context in `<saved_skills>`, both declared untrusted in the system prompt and sanitized. Player chat reaches codegen prompts by two routes — directly, and by way of stored skill descriptions — and both are covered.

### Fleet control plane
- **Commands** — Immediate bot actions (pause, move, follow, guard, patrol) with dispatch and cancellation
- **Missions** — Longer-running tasks with full lifecycle (start, pause, cancel, retry), dependency checking, and per-bot priority queues
- **Squads & roles** — Group bots for coordinated ops; assign roles with autonomy levels and manual-override tracking
- **World markers** — Named positions, zones (rectangular/circular), and waypoint routes
- **Natural language commander** — Issue orders in plain English; an LLM parses them to structured plans (with regex fallback and clarification questions)

### Town & civilization layer
- **Autonomous TownBrain** — A 60s tick drives five sub-loops: demand → build → role → schedule → threat
- **Governance that bites** — Mayor decrees become standing rules that bias task selection and are injected into resident prompts; bots propose rules through an approval/vote workflow
- **Diplomacy & economy** — Inter-town diplomacy, trade routes, district planning, and expansion (seeding child towns)
- **Phoenix rebirth & chronicles** — Failed towns can be rebuilt by a `PhoenixManager`; a `ChronicleGenerator` writes the town's narrative history
- **Civilization metrics** — Infers each bot's role from its actual behavior and reports role-distribution entropy, action exclusivity, and unique-item accumulation

### Generative architecture build pipeline
- **LLM design → real schematic → multi-bot build** — An LLM designs a building, the design is validated into a `BlockPlan`, encoded into a genuine gzip **Sponge-v2 `.schem`** file, then constructed by a multi-bot build coordinator with auto-gather and site preparation
- **Curated schematic library** — 100+ ready-to-place Sponge-v2 builds (houses, towers, statues, trees, vehicles, props) drop into `schematics/`; the coordinator selects a flat, footprint-clear site (`SiteSelector`) and places them via `snapToGround`/`clearSite`/`fillFoundation`
- **Data-driven rail network** — A hub-and-spoke underground rail connector (`/api/tunnel`) reads live building footprints and carves a hub + powered-rail spokes with stair/ladder risers into each structure, with dry-run preview and post-build verify/repair
- **Leashed caretaker-builder** — A `builder` bot with `caretaker: true` on its `leash` entry runs a place-only caretaker curriculum: withdraw materials from a home chest and expand the structure it's parked on, instead of chasing roaming swarm tasks. The checked-in deployment has five world-specific leash entries, all with caretaker mode disabled

### Operations
- **Worker-thread-per-bot** — Each bot runs in its own `worker_threads` worker; shared singletons (affinity, culture, world model, comms, LLM) are reached through typed IPC proxy classes so cross-bot state stays authoritative on the main thread
- **Sandbox containment** — Learned skills and generated code run in a `node:vm` context, which is **not** a security boundary (Node documents this upstream, and an escape from this codebase's sandbox shape has been demonstrated). The service unit is therefore hardened — `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, scoped `ReadWritePaths` — which took its systemd exposure score from 9.2 UNSAFE to 7.3 MEDIUM and severed the escape→root path, since the service account holds passwordless sudo. **`NoNewPrivileges=yes` is load-bearing, not cosmetic — do not remove it.** Closing the escape itself needs process isolation; see [`docs/research/worker-process-isolation.md`](docs/research/worker-process-isolation.md), which also records why the obvious fix (`AmbientCapabilities=CAP_SETUID`) grants root and must not be used.
- **Live 3D viewer** — Per-bot prismarine-viewer (three.js/WebGL) spins up lazily only when you open a View tab in the dashboard
- **Impersonation defense** — Detects duplicate-login kicks plus ghost-name corroboration, quarantines the impersonated bot, and fires an outbound webhook alert
- **Web dashboard** — Next.js dashboard for map, fleet, town, skill graph, and decision/LLM trace timelines
- **HTTP API** — 200+ REST routes plus socket.io events to spawn, drive, and observe everything programmatically

## Quick Start

The backend and dashboard require Node.js 22 or newer (Mineflayer 4.35+ no
longer supports Node 20). The standalone Fleet Devtools and World Showcase
toolchains retain their own runtime requirements.

```bash
# Clone the repo
git clone https://github.com/packetloss404/mc-fleet-bot.git
cd mc-fleet-bot

# Install dependencies
npm install

# Configure your bot
cp .env.example .env
# Add your API key(s) to .env. At minimum one LLM provider:
#   ANTHROPIC_API_KEY   (Anthropic)
#   GOOGLE_API_KEY      (Gemini — also used for skill embeddings)
#   OPENAI_API_KEY / MINIMAX_API_KEY / VOYAGE_API_KEY  (optional)
#   Ollama runs locally, no key needed

# Point config.yml at your Minecraft server (minecraft.host / port / version)
# and customize bot limits, behavior, and LLM routing

# Build and run
npm run build
npm start
```

Other scripts: `npm run dev` (tsx, no build step) and `npm test` (Vitest).

### Optional FleetCraft bridge

The backend can project its real bot roster and current state into FleetCraft.
Set both `FLEETCRAFT_URL` and `FLEETCRAFT_API_KEY` to enable it; with either
value missing, the integration is disabled. The bridge registers each bot,
sends its exact `BotState`, canonical town role, behavior-inferred observed
role, and current Voyager task, and removes the entry only when the bot is
intentionally removed from this fleet.

Delivery is fail-open and timeout-bounded: FleetCraft outages never prevent a
bot from spawning, working, reconnecting, or being removed. A successful
registration is awaited before the bot's first Minecraft connection so the
server has reloaded its whitelist; a timeout or partial reload releases startup
without crashing the bot process and is retried later. Normal service
shutdown publishes `DISCONNECTED` but does not delete the roster, so a restart
does not make citizens disappear and reappear. See `.env.example` for the
optional timeout and heartbeat settings. The API key is server-side only and
is sent as `X-Api-Key`. Failed intentional removals persist only the pending
usernames in `data/fleetcraft-pending-deletions.json` and retry after restart;
no bot or game state is copied into that queue.

The dashboard is a separate Next.js app in `web/`:

```bash
cd web && npm install && npm run build && npm start   # serves on port 3000
```

### Testing and CI
+
+`npm test` runs the fleet application's unit and integration suites, including fleet-owned build tests. `npm run build` compiles the strict backend. The dashboard has its own npm install, lint, typecheck, unit and browser checks under web/.
+
+World construction and snapshot acceptance checks belong to [mc-world-ops](https://github.com/packetloss404/mc-world-ops). Optional cross-project contracts live in test/world-ops/: run `MC_WORLD_OPS_ROOT=/path/to/mc-world-ops npm run test:world-ops` for the synthetic import contract. Historical commute checks additionally use `npm run test:world-ops:snapshots` with the exact operator evidence. Both are separate from default application CI.
+
+### Running as a service

The reference deployment lives at `/opt/stacks/mc-fleet-bot` and runs under two systemd units:

| Unit | What | Port | Log |
|---|---|---|---|
| `mc-fleet-bot.service` | Bot API (`node dist/index.js`) | 3001 | `/var/log/mc-fleet-bot.log` |
| `mc-fleet-web.service` | Next.js dashboard (`npm start` in `web/`) | 3000 | `/var/log/mc-fleet-web.log` |

```bash
sudo systemctl restart mc-fleet-bot    # after npm run build
sudo systemctl restart mc-fleet-web    # after cd web && npm run build
tail -f /var/log/mc-fleet-bot.log
```

## Spawning a Bot

Send a POST request to the API:

```bash
curl -X POST http://localhost:3001/api/bots \
  -H "Content-Type: application/json" \
  -d '{"name": "MyBot", "personality": "farmer", "mode": "codegen"}'
```

Check status:

```bash
curl -s http://localhost:3001/api/bots
```

### Available Personalities

| Personality | Description |
|---|---|
| `merchant` | Trades items and announces wares |
| `guard` | Patrols and protects areas |
| `explorer` | Roams and discovers the world |
| `farmer` | Farms crops and tends animals |
| `blacksmith` | Mines, smelts, and crafts |
| `elder` | Wise advisor, shares knowledge |
| `builder` | Places structures; runs the caretaker curriculum when leashed to a home |

## Project Structure
+
+```text
+src/           Fleet backend: bots, actions, AI, control, town, build, social, workers, API
+web/           Next.js fleet dashboard
+test/          Application tests; optional cross-project contracts under world-ops/
+scripts/       Fleet-specific runtime maintenance and demos
+tools/scripts/ Fleet skill migrations
+skills/        Learned bot skills and runtime index
+schematics/    Bot build templates
+data/          Ignored live fleet state
+docs/          Fleet research, tasks, architecture notes, and project directory
+migration/     Original ownership and extraction provenance
+```
+
+## Related projects

World construction and reporting tools now live in [mc-world-ops](https://github.com/packetloss404/mc-world-ops). The standalone [world-showcase](https://github.com/packetloss404/world-showcase) consumes validated publication bundles. [PacketCraft](https://github.com/packetloss404/packetcraft) owns the gameplay API, Paper plugin, and Fabric mod.

See [project and service directory](docs/PROJECTS.md). Pre-extraction monorepo documentation is preserved in docs/architecture/legacy-monorepo-readme.md.

## Control Platform

The control platform provides centralized fleet management:

- **Commands** — Immediate bot actions (pause, move, follow, guard, patrol) with dispatch and cancellation
- **Missions** — Longer-running tasks with lifecycle management (start, pause, cancel, retry), dependency checking, and per-bot priority queues
- **Squads** — Group bots into squads for coordinated operations
- **Roles** — Assign roles with autonomy levels and manual override tracking
- **World markers** — Named positions, zones (rectangular/circular areas), and routes (waypoint sequences)
- **Natural language commander** — Parse plain English orders into structured plans and execute them

## Project Sid concepts

Inspired by [*Project Sid: Many-agent simulations toward AI civilization*](https://arxiv.org/abs/2411.00114). The civilization-metrics layer is read-only and always on; the rest are **flag-gated** via the `governance`/`social`/`cognition` sections in `config.yml`. See [`docs/project-sid-roadmap.md`](docs/project-sid-roadmap.md).

- **Civilization metrics + emergent roles** (read-only, always on) — infers each bot's role from what it actually does and reports role-distribution entropy, action exclusivity, and cumulative unique items (`GET /api/metrics/civilization`, `GET /api/bots/:name/observed-role`).
- **Governance that bites** (`governance.enabled`) — mayor decrees become standing town rules that bias task selection and are injected into resident prompts; bots can propose rules through the approval/vote workflow.
- **Culture & social spread** (`social.botAffinity`, `social.culture`) — bot↔bot affinity gates cooperation; emergent keyword "memes" adopted from trusted peers bias behavior (`GET /api/culture`).
- **PIANO cognition** (`cognition.perceptionTick`, `cognition.cognitiveController`) — an independent perception tick lets a bot react to threats mid-task; a cognitive controller broadcasts its current decision so chat stays coherent with action.

## API

The bot server runs on port **3001** and exposes 200+ REST endpoints (plus socket.io event streams) covering:

- Bot CRUD and status
- Command dispatch and cancellation
- Mission lifecycle management and per-bot mission queues
- World markers, zones, and routes
- Squad and role management
- Natural language command parsing and execution
- Town, governance, culture, and civilization-metrics reads
- Skill library and decision/LLM trace inspection

## Configuration

Edit `config.yml` to customize:

- **Target server** — `minecraft.host` / `port` / `version` / `auth` (see [Target server](#target-server))
- **Bot limits** — Max concurrent bots, join stagger, and reconnect backoff
- **Voyager settings** — Learning loop behavior
- **LLM providers** — Per-task model selection across Anthropic, Gemini, OpenAI, MiniMax, Ollama, and VoyageAI, routed through `ModelRouter`
- **Behaviors** — Toggle ambient chat, wandering, head tracking, combat instincts
- **Security** — `security.impersonationDetection` (impersonation defense, on by default) and `IMPERSONATION_ALERT_WEBHOOK` env var for outbound alerts
- **Project Sid flags** — `governance`, `social`, and `cognition` sections gate the features above. All default off when unset; the checked-in `config.yml` turns `governance` and `social` on and leaves `cognition` off
- **Dedicated survival objective** — `survival.enabled` is off by default and `survival.botName` must exactly match an existing bot. It never changes the host or fleet roster and all digging, placement, and movement still pass through the normal geofence wrappers. Inspect it with `GET /api/bots/:name/survival-mission`; pause or resume it with `POST /api/bots/:name/survival-mission/:action`.

### World-specific settings

Four sections hold coordinates that only mean something in one world. The
checked-in `config.yml` contains values for the reference deployment (eight
protected zones, a mine site, five leashed bots, and a rescue home); replace or
clear them before pointing the service at another world:

| Setting | What it does when set |
|---|---|
| `mining.protectedZones` | Axis-aligned boxes bots refuse to dig into. Also doubles as the night-shelter target — with none set, bots build their own hut at night |
| `mining.mineSite` | A communal mine bots walk to before mining routed block types |
| `leash` | Pins a named bot to a home anchor + radius |
| `rescueHome` | Fallback spot a stranded bot self-teleports to. Unset, unleashed bots log a WARN instead of auto-rescuing |

`mining.routeToMineBlocks` (the ore list routed to the communal mine) is populated but **inert** until a `mineSite` exists — with no site configured, bots mine ore wherever they find it.

## Tech

TypeScript on Node 22+ (tsx/tsc) · Mineflayer + pathfinder + collectblock + prismarine-schematic/viewer · Express 4 + socket.io · Drizzle ORM + better-sqlite3 · pino · Next.js 16 + React 19. LLMs: Anthropic, Gemini, OpenAI, MiniMax, Ollama, VoyageAI.

## Contributing

Create a bot, give it a personality, and turn it loose on a world. The more bots, the more interesting the world becomes.
