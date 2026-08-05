# MC Fleet Devtools

MC Fleet Devtools is a local, read-only workbench for inspecting Minecraft
world snapshots and producing durable reports. It packages the same workflow as
a browser dashboard, REST API, command-line interface, and serialized report
worker.

The project is server-neutral: reusable inspection code and report recipes live
here, while server coordinates, credentials, authored plans, and release
receipts stay in private server repositories or ignored local configuration.

## What it does

- identifies copied Anvil snapshots with deterministic SHA-256 hashes;
- summarizes region coverage and snapshot metadata;
- counts block states across a whole snapshot or an inclusive coordinate box;
- inventories SQLite schemas without opening databases for writing;
- exports records from a conventional `world_features` table;
- executes validated YAML report recipes;
- persists job state and structured logs;
- generates standalone HTML reports and hash-bound artifact manifests; and
- exposes registered worlds, recipes, jobs, and reports through a responsive
  operator dashboard.

The included recipes are:

| Recipe | Purpose |
| --- | --- |
| `snapshot-overview` | Snapshot identity, region coverage, and HTML summary |
| `block-census` | Block-state counts, optionally constrained to bounds |
| `world-catalog` | Snapshot identity, SQLite inventory, and world features |

## Safety boundary

Version `0.x` is deliberately read-only with respect to Minecraft.

- Snapshot directories and SQLite databases are inputs only.
- Recipes can invoke only a fixed set of built-in inspection steps.
- Each report receives a new output directory; previous artifacts are never
  overwritten.
- The project has no RCON, WorldEdit, restart, upload, or live-world mutation
  capability.
- The API binds to all network interfaces by default. It does not yet include
  authentication and should be reachable only from a trusted network.

Do not point the workbench at a live world being actively written. Register a
copied snapshot instead.

## Requirements

- Node.js 20 or newer
- npm
- local access to copied Anvil region files
- optional read-only SQLite catalogs

## Quick start

```bash
git clone git@github.com:packetloss404/mc-fleet-devtools.git
cd mc-fleet-devtools
npm install
cp config/registry.example.yml config/registry.local.yml
```

Edit `config/registry.local.yml` so its connector root contains the registered
snapshot and database paths:

```yaml
version: 1
servers:
  - id: example
    name: Example Minecraft Server
    connector:
      kind: local
      root: /srv/minecraft/example-tooling
    worlds:
      - id: overworld
        name: Overworld
        dimension: minecraft:overworld
        snapshot: snapshots/latest/region
        databases:
          world: data/world-map.db
          town: data/town.db
```

The connector root must be absolute. Snapshot and database paths are resolved
inside that root. `config/registry.local.yml` is ignored by Git.

Validate the checkout and registry, then start the portal:

```bash
npm run check
npm run cli -- registry check
npm run dev
```

Open `http://<host-ip>:4310`. The dashboard lists registered worlds and
recipes, queues reports, monitors the worker, and links to completed HTML
artifacts.

To use a different bind address or port:

```bash
MC_FLEET_DEVTOOLS_HOST=0.0.0.0 \
MC_FLEET_DEVTOOLS_PORT=4310 \
npm run dev
```

Use `MC_FLEET_DEVTOOLS_HOST=127.0.0.1` to restrict access to the local machine.
Do not expose the service to a public or untrusted network without an
authenticated reverse proxy and appropriate firewall rules.

## Command-line usage

The CLI uses the same registry, recipe loader, report service, and artifact
rules as the portal:

```bash
npm run cli -- server list
npm run cli -- world list --server example
npm run cli -- recipe list
npm run cli -- snapshot inspect --server example --world overworld
npm run cli -- job list
```

Run a snapshot overview:

```bash
npm run cli -- report run \
  --recipe snapshot-overview \
  --server example \
  --world overworld
```

Run a bounded block census with inclusive `x1,y1,z1,x2,y2,z2` coordinates:

```bash
npm run cli -- report run \
  --recipe block-census \
  --server example \
  --world overworld \
  --bounds=-128,-64,-128,128,319,128
```

Paths can be overridden without changing the local registry:

| Environment variable | Default |
| --- | --- |
| `MC_FLEET_REGISTRY` | `config/registry.local.yml` |
| `MC_FLEET_RECIPES` | `recipes/` |
| `MC_FLEET_JOBS` | `data/jobs/` |
| `MC_FLEET_ARTIFACTS` | `data/artifacts/` |
| `MC_FLEET_DEVTOOLS_HOST` | `0.0.0.0` |
| `MC_FLEET_DEVTOOLS_PORT` | `4310` |

When the local registry does not exist, the example registry is loaded.

## Jobs and artifacts

Every invocation creates a durable job record under `data/jobs/`. Successful
reports are stored beneath:

```text
data/artifacts/<server>/<world>/<recipe>/<job>/
├── artifact-manifest.json
├── report-data.json
├── report.html
└── results/
    └── <step>.json
```

The manifest records each artifact's relative path, media type, byte size, and
SHA-256 digest. When a recipe includes a snapshot summary, the manifest also
binds the output to that snapshot's identity. Failed jobs retain their logs and
error details for diagnosis.

The API worker intentionally runs one report at a time to avoid overlapping
CPU-, memory-, and disk-heavy world scans.

## REST API

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Read-only mode and queue status |
| `GET` | `/api/overview` | Dashboard bootstrap payload |
| `GET` | `/api/servers` | Registered servers and worlds |
| `GET` | `/api/recipes` | Loaded report recipes |
| `GET` | `/api/jobs` | Persisted jobs |
| `GET` | `/api/jobs/:id` | One job and its artifact link |
| `POST` | `/api/jobs` | Validate and enqueue a report |

Example request:

```bash
curl http://10.80.13.18:4310/api/jobs \
  --header 'Content-Type: application/json' \
  --data '{
    "serverId": "example",
    "worldId": "overworld",
    "recipeId": "block-census",
    "parameters": {
      "bounds": "-128,-64,-128,128,319,128"
    }
  }'
```

Accepted requests return `202 Accepted`. The job can then be followed through
`GET /api/jobs/:id`.

## Repository layout

```text
apps/
  api/             REST API, static hosting, and serialized job queue
  cli/             terminal interface to the report service
  dashboard/       dependency-free browser interface
packages/
  world-core/      registry, domain records, path guards, jobs, and hashes
  anvil/           read-only Anvil snapshot inspection and block census
  catalog/         read-only SQLite census and world feature export
  reporting/       recipe validation, execution, HTML, and manifests
recipes/           reusable server-neutral report definitions
config/            committed example and ignored local registry
docs/              architecture, recipes, extraction notes, and roadmap
test/              synthetic Anvil, SQLite, registry, and reporting tests
```

The service layer is independent of Express, allowing the CLI and API to run
the same reports. Registry path guards keep inputs inside their connector root,
while artifact guards constrain new outputs to the configured artifact root.

## Development

```bash
npm install
npm run build
npm test
npm run check
```

TypeScript is strict, uses ESM, and targets Node.js 20. Tests build synthetic
region files and SQLite databases in temporary directories; they must never
access a live server.

## Project status

The read-only reporting foundation is implemented. Mapping, reusable report
layout, a visual design studio, and guarded release workflows are future phases.
World-changing operations will remain separate from report recipes and will
require immutable source identity, preview diffs, rollback artifacts, explicit
approval, guarded execution, and post-release QA.

See [Architecture](docs/ARCHITECTURE.md),
[Report recipes](docs/REPORT_RECIPES.md),
[Extraction notes](docs/EXTRACTION.md),
[Roadmap](docs/ROADMAP.md), and [Security](SECURITY.md).
