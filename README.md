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
- **Leashed caretaker-builder** — A `builder` bot pinned to a home anchor (`leash` in `config.yml`) runs a place-only caretaker curriculum: withdraw materials from a home chest and expand the structure it's parked on, instead of chasing roaming swarm tasks. `leash` ships empty — anchors are world-specific coordinates you set once you have a site

### Operations
- **Worker-thread-per-bot** — Each bot runs in its own `worker_threads` worker; shared singletons (affinity, culture, world model, comms, LLM) are reached through typed IPC proxy classes so cross-bot state stays authoritative on the main thread
- **Sandbox containment** — Learned skills and generated code run in a `node:vm` context, which is **not** a security boundary (Node documents this upstream, and an escape from this codebase's sandbox shape has been demonstrated). The service unit is therefore hardened — `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`, scoped `ReadWritePaths` — which took its systemd exposure score from 9.2 UNSAFE to 7.3 MEDIUM and severed the escape→root path, since the service account holds passwordless sudo. **`NoNewPrivileges=yes` is load-bearing, not cosmetic — do not remove it.** Closing the escape itself needs process isolation; see [`docs/research/worker-process-isolation.md`](docs/research/worker-process-isolation.md), which also records why the obvious fix (`AmbientCapabilities=CAP_SETUID`) grants root and must not be used.
- **Live 3D viewer** — Per-bot prismarine-viewer (three.js/WebGL) spins up lazily only when you open a View tab in the dashboard
- **Impersonation defense** — Detects duplicate-login kicks plus ghost-name corroboration, quarantines the impersonated bot, and fires an outbound webhook alert
- **Web dashboard** — Next.js dashboard for map, fleet, town, skill graph, and decision/LLM trace timelines
- **HTTP API** — 200+ REST routes plus socket.io events to spawn, drive, and observe everything programmatically

## Quick Start

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

The dashboard is a separate Next.js app in `web/`:

```bash
cd web && npm install && npm run build && npm start   # serves on port 3000
```

### Running as a service

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

```
src/
├── bot/          # Bot lifecycle and Mineflayer connection management
├── ai/           # ModelRouter + 6 provider clients, token ledger, embedding cache
├── voyager/      # Learning loop, curriculum/action/critic agents, code executor, skill library
├── actions/      # Bot actions (mine, craft, follow, attack, etc.)
├── personality/  # Personality types, affinity, and conversation
├── social/       # Bot-to-bot messaging, memory, and culture
├── control/      # Fleet control plane (commands, missions, squads, roles, markers, commander)
├── town/         # TownBrain: governance, diplomacy, trade, districts, expansion, chronicles
├── build/        # LLM design → BlockPlan → Sponge .schem → multi-bot build coordinator
├── supplychain/  # Supply chain templates and coordination
├── security/     # Impersonation detection
├── worker/       # Per-bot worker threads and IPC proxies
├── server/       # Express HTTP API (200+ routes) and socket events
└── util/         # Logger and helpers
web/              # Next.js dashboard
world-builder/    # mcwb — standalone Python subtool: masterplan → live world (see below)
fleet-devtools/   # Read-only Anvil/SQLite report workbench — its own npm workspace (see below)
skills/           # Learned skills saved as JS modules (the library grows as bots run)
scripts/          # World tooling — see below
builds/           # manifest.yaml: every build unit and its completeness assertions
docs/audits/           # Declarative structural audits (ravensreach.yaml: 65 checks)
data/             # Persistent bot state and memory (gitignored)
```

The town subsystem (`src/town/`) persists via **Drizzle ORM over better-sqlite3** (`data/town.db`), with a schema kept deliberately Postgres-portable (text PKs, epoch-ms ints, JSON-as-text); everything else persists to JSON files under `data/`.

## World tooling

Large structures are built by generating **ops files** (absolute-coordinate boxes) and
running them against the server. Nothing here goes through the bots' Voyager loop.

| script | does |
|---|---|
| `rcon_runner.py` | Runs ops as vanilla `/fill` over RCON — **0.002 s per command** vs ~1.5 s through a bot's WorldEdit selection. Force-loads the target region and restores the operator's pinned chunks afterwards. Checks every reply. |
| `build_runner.py` | The slow path: drives an opped mineflayer bot through WorldEdit. Still needed for random patterns and for block ids the server's command parser rejects. |
| `verify_ops.py` | Samples an ops file against the world, because a runner reporting *issued* is not the same as *exists*. Ordering-aware. |
| `reachability.mjs` | Flood-fills the space a player can occupy. `--box` reports what fraction of a room's interior you can actually reach. |
| `build_status.py` | Reads `builds/manifest.yaml` and runs both checks over every build unit. **One command that says which builds are finished.** |
| `audit.py` | Declarative structural audits with baseline diffing. |
| `block_census.mjs` | Reads region files offline and reports exactly what occupies a box. |
| `mc_look.py` | Renders a first-person view from the region files (see the `mc-look` skill). |

```bash
python3 scripts/build_status.py          # is anything half-built or sealed?
python3 scripts/audit.py docs/ravensreach/audits/ravensreach.yaml --refresh
```

**Why two kinds of check.** Placement and traversability are different properties. A
descent shaft once verified BUILT 5/5 on block sampling and was completely unusable —
every sampled block existed and three separate ceilings sealed it. `build_status.py`
asserts both, and walk checks run `both_ways` because a player falls any distance but
climbs one block, so a downward-only check passes on a hole in the floor.

### Town Expansion PM closeout

The July 28 Town Expansion documentation has separate draft and final/as-built
profiles. Prepare the reviewable register, 98-requirement status matrix, and
HTML dossier without making a live-world claim:

```bash
node scripts/generate_redevelopment_artifact_register.mjs \
  --profile town-expansion --mode draft
node scripts/generate_redevelopment_dossier.mjs \
  --profile town-expansion --mode draft --html-only
```

Draft output is prominently labeled `DRAFT — NOT AS-BUILT`. It includes the
frozen session scope, research and design sources, coordinate schedules,
citizen reports, current deployment/entity/database status, a 13-map evidence
book, representative exact-object screenshot slots, and a SHA-256 artifact
ledger. It does not convert generated work or empty image slots into as-built
evidence.

After one committed transaction and accepted post-state, run the same profiles
in `final` mode, supplying the exact transaction ledger, immutable post region
directory, post QA, paired media QA, database-import report, and read-only
database census:

```bash
node scripts/generate_redevelopment_artifact_register.mjs \
  --profile town-expansion --mode final \
  --transaction <ledger.json> --post <immutable-post-region-dir> \
  --post-qa <post-qa.json> --media-qa <media-qa.json> \
  --db-import <database-closeout.json> --db-report <database-report.json>

node scripts/generate_redevelopment_dossier.mjs \
  --profile town-expansion --mode final \
  --transaction <ledger.json> --post <immutable-post-region-dir> \
  --post-qa <post-qa.json> --media-qa <media-qa.json> \
  --capture-report <complete-capture-report.json> \
  --db-import <database-closeout.json> --db-report <database-report.json>
```

Final mode fails closed unless the package, transaction, distinct post snapshot,
entity clearance, post QA, all paired media (including exactly 13 maps),
database import, database report, and their byte hashes agree. Accepted outputs
live under `docs/redevelopment/2026-07-28-town-expansion/`; the machine artifact
register lives under `data/world-review/`.

Release failures and recovery work are retained in a separate searchable
knowledge base. Its counting policy distinguishes one atomic rollback incident
from each rollback/recovery execution, so a failed generic rollback followed by
a successful bounded recovery is visible instead of collapsed:

```bash
node scripts/build_redevelopment_kb.mjs
```

Canonical source:
`data/knowledge-base/redevelopment-release-incidents.json`
Searchable SQLite database:
`data/knowledge-base/redevelopment-kb.sqlite`
Integrity and artifact audit:
`data/knowledge-base/redevelopment-kb.report.json`
Human incident ledger:
`docs/redevelopment/2026-07-28-town-expansion/knowledge-base/incident-ledger.md`

The current ledger records six rollback incidents, eleven rollback/recovery
executions (eight complete and three failed), thirteen separately classified
post-QA defects, thirty-one error occurrences, and twenty-six prevention
rules. Rebuilding fails on misplaced IDs, duplicate rows, mismatched
counts/statuses, missing prevention rules, foreign-key errors, or SQLite
integrity failures.

The accepted physical Town Expansion release consists of 484,676 committed
source groups (484,690 changed commands), five verified packages, 340 exact
database/media objects, 589 paired camera shots, 1,178 terminal-snapshot
captures, and thirteen maps including one whole-world atlas. Citizen route
geometry passed, but the autonomous resident lifecycle observer remains an
open, non-blocking troubleshooting item; do not report citizen lifecycle as
accepted until the separate observer handoff is closed.

## World Builder (`world-builder/`)

**mcwb** — a standalone Python package that consumes a versioned masterplan and
applies it to a live Minecraft world. Merged in from its own repo
(`packetloss404/mc-world-builder`) on 2026-08-07 via `git subtree`, history
intact.

It closes the loop on the masterplans this repo already produces: mcwb reads
`docs/masterplans/<plan>/04-contractor/contractor-brief.json` — five plans
currently carry one — and applies it. Masterplans are **diff-friendly**:
re-running on the same plan is a no-op, and re-running on a newer one applies
only the phases that changed. It reads plans in place and never writes back to
them.

Shipped (v0.1.0, alpha): spec schema, validator, state store, phase-level diff,
phase runner, two writers (JSON for testing, litematic per centerpiece), QA
verifier, full CLI. Pending: amulet-core writer auto-activation, per-element
geometry in phase generators (currently bounding-box style), and 5 of 10 visual
QA checks.

**It is a separate toolchain, not part of the Node build.** Nothing in `src/`
imports it; the two are coupled only through the on-disk masterplan format, so
`npm run build` and `npm test` neither build nor test it.

```bash
cd world-builder
python3 -m venv .venv && source .venv/bin/activate   # Python 3.11+
pip install -e ".[dev]"        # 'litemapy' and the package itself are required for the tests
pytest                          # 38 tests
mcwb validate --plan ../docs/masterplans/04-combined-complex
```

Without that editable install the suite fails at collection on
`ModuleNotFoundError: litemapy` / `mcwb.build` — that is a missing venv, not a
broken checkout.

See [`world-builder/README.md`](world-builder/README.md) for the masterplan
format and [`world-builder/NEWSERVER.md`](world-builder/NEWSERVER.md) for
deployment notes.

## Fleet Devtools (`fleet-devtools/`)

**mc-fleet-devtools** — a local, read-only workbench that inspects *copied*
Anvil snapshots and SQLite catalogs and turns them into durable, hash-bound
reports. Node 20 / TypeScript / ESM, structured as its own npm workspace, with
four surfaces over one service layer: a REST API on port **4310**, a
dependency-free dashboard the API serves, a CLI, and a serialized job worker
that deliberately runs one report at a time. Merged in from its own repo
(`packetloss404/mc-fleet-devtools`) on 2026-08-07 via `git subtree`, history
intact.

Four recipes ship: `snapshot-overview`, `block-census`, `world-catalog`,
`snapshot-diff`. Each run gets a fresh job directory under `data/artifacts/`
with an `artifact-manifest.json` recording every output's path, media type,
byte size, and SHA-256. Prior artifacts are never overwritten. There is no
RCON, WorldEdit, upload, or live-world mutation capability — `0.x` is read-only
with respect to Minecraft by design.

**The overlap with this repo is a file-format overlap, not a code one.**
Verified:

- its snapshot digest is byte-identical to `scripts/hash_world_snapshot.mjs` —
  both hash `filename + NUL + bytes + NUL` over region files sorted by name
  (`packages/anvil/src/snapshot.ts:43`, `scripts/hash_world_snapshot.mjs:15`) —
  so its snapshot identities are comparable with digests this repo has already
  recorded. The root script takes any `*.mca`; devtools takes only
  `r.<x>.<z>.mca`, so a stray file would diverge them.
- its `world-features` step exports a `world_features` table — the exact table
  `src/world/WorldFeatureStore.ts:473` creates in `data/world-map.db`.
- its `database-catalog` step reads any registered SQLite, `data/town.db`
  (`src/town/db.ts:269`) included.

**Nothing is wired up, though.** No file in `src/`, `web/`, `scripts/`, or
`test/` mentions `fleet-devtools` or `@mc-fleet/*`, and nothing under
`fleet-devtools/` imports this repo. The only thing that would connect them is
`fleet-devtools/config/registry.local.yml` — an operator-written, gitignored
file that is not in the checkout. Until someone writes one pointing at `data/`,
these are two directories that happen to speak the same formats. Co-location
makes a format change reviewable in one diff; it is not a pipeline.

**It is a separate toolchain, not part of the Node build.** The root
`tsconfig.json` compiles only `src/**/*`, and the root `vitest.config.ts`
collects only `src/**/*.test.ts` and `test/**/*.test.ts` — so `npm run build`
and `npm test` neither build nor test it. The root `package.json` declares no
`workspaces`, so a root `npm install` does not install it either, despite
`fleet-devtools/package.json` declaring workspaces of its own.

```bash
cd fleet-devtools
npm install                                                # its own tree; the root install does not reach here
cp config/registry.example.yml config/registry.local.yml   # then edit — the connector root must be absolute
npm run check                                              # lint + build + test + format:check
npm run cli -- registry check
npm run dev                                                # API + dashboard on http://<host>:4310
```

The API binds `0.0.0.0` and has **no authentication**. Use
`MC_FLEET_DEVTOOLS_HOST=127.0.0.1` for loopback only, and never point it at a
world that is being actively written — register a copy.

CI: `.github/workflows/fleet-devtools.yml` at the **repo root** gates this
directory (`paths: ['fleet-devtools/**']`). The copy at
`fleet-devtools/.github/workflows/ci.yml` is an inert signpost — GitHub reads
workflows only from the repository root, so a nested one never runs.

**One trap.** If `node_modules/` was installed on a different platform than
you're running on, native modules fail in confusing ways — `better-sqlite3`
throws `invalid ELF header` and esbuild reports a host/binary version
mismatch at config load, *before* vitest sees its own config. Fix with
`npm rebuild better-sqlite3`, or `rm -rf node_modules && npm install` for the
general case. Do not debug it as a vitest or SQLite problem.

See [`fleet-devtools/README.md`](fleet-devtools/README.md),
[`docs/ARCHITECTURE.md`](fleet-devtools/docs/ARCHITECTURE.md),
[`docs/REPORT_RECIPES.md`](fleet-devtools/docs/REPORT_RECIPES.md), and
[`SECURITY.md`](fleet-devtools/SECURITY.md).

## World Showcase (`world-showcase/`)

A private Next.js 15 report library — the human-facing surface for the world's
maps, screenshots, catalogs, and masterplans. It is a standalone app with its
own `package.json`; it does not share the root build.

### Report library

| # | Report | Route | Covers |
|---|--------|-------|--------|
| 01 | Master Plan | `/reports/master-plan` | Accepted Town Expansion R1 as-built record, atlas, object catalog, release QA |
| 02 | Underground Navigation | `/reports/underground-navigation` | Tunnels, bunkers, vaults, below-grade venues, and known ways in |
| 03 | Masterplan Program | `/reports/masterplan-program` | The thirteen plans in `docs/masterplans/` — the 01–05 authority chain, the 06–13 area baselines, and the R00 gates |
| 04 | POI Coordinate Directory | `/reports/poi-coordinate-directory` | Every cataloged place with copy-ready teleport coordinates |

Report 03 is transcribed from the committed plan evidence — the `build-info.json`
files for plans 01–05 and the `MASTERPLAN.md` front matter for 06–13 — in
`world-showcase/lib/masterplans.ts`. Re-transcribe that file when the underlying
plans change; nothing regenerates it automatically. Its cover and gallery art is
downscaled from the masterplan rendering sets into `public/masterplans/`.

The masterplan HTML reports under `docs/masterplans/` are **not** served by the
app. They reference the repository tree relatively (`../../data/exports/...`), so
they stay repo-side and are read locally.

### Run and deploy

```bash
cd world-showcase
npm install
npm run dev            # local, port 3000
npm run build && npm start
```

Deployment is **Railway** (`railway.json`): Railpack builder, `npm run build`,
`npm run start`, health check on `/api/health`, restart on failure with three
retries. There is no Cloudflare Workers path — the OpenNext/wrangler build was
removed in v1.1.0 as unused.

### Auth

The app uses an application-level ten-digit PIN gate. `SITE_PASSCODE` (exactly
ten digits) and `SITE_SESSION_SECRET` (32+ characters) must be set as secret
production runtime variables and must never be committed. The signed HttpOnly
session protects every route except `/`, `/api/auth`, and `/api/health` —
including direct atlas, screenshot, and report asset routes.

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

### World-specific settings

Four sections hold coordinates that only mean something in one world, so they ship **empty** and must be repopulated as you build:

| Setting | What it does when set |
|---|---|
| `mining.protectedZones` | Axis-aligned boxes bots refuse to dig into. Also doubles as the night-shelter target — with none set, bots build their own hut at night |
| `mining.mineSite` | A communal mine bots walk to before mining routed block types |
| `leash` | Pins a named bot to a home anchor + radius |
| `rescueHome` | Fallback spot a stranded bot self-teleports to. Unset, unleashed bots log a WARN instead of auto-rescuing |

`mining.routeToMineBlocks` (the ore list routed to the communal mine) is populated but **inert** until a `mineSite` exists — with no site configured, bots mine ore wherever they find it.

## Tech

TypeScript on Node 20+ (tsx/tsc) · Mineflayer + pathfinder + collectblock + prismarine-schematic/viewer · Express 4 + socket.io · Drizzle ORM + better-sqlite3 · pino · Next.js 16 + React 19. LLMs: Anthropic, Gemini, OpenAI, MiniMax, Ollama, VoyageAI.

## Contributing

Create a bot, give it a personality, and turn it loose on a world. The more bots, the more interesting the world becomes.
