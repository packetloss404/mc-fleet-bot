# MC Fleet Devtools

MC Fleet Devtools is a reusable Minecraft world-development workbench. It turns
the snapshot, catalog, and report machinery developed around IANLAN into a
server-neutral CLI, API, serialized worker, and browser dashboard.

The current release is deliberately read-only. It can identify copied Anvil
snapshots, count block states, inventory SQLite databases, export a conventional
`world_features` table, and run YAML report recipes into immutable per-job
artifact directories. It cannot connect to RCON, issue WorldEdit commands,
restart a server, or mutate a world.

## Quick start

```bash
cd /opt/stacks/mc-fleet-devtools
npm install
cp config/registry.example.yml config/registry.local.yml
# Edit the ignored local registry to point at copied snapshots/databases.
npm run check
npm run cli -- registry check
npm run dev
```

Open `http://127.0.0.1:4310`. The API binds to loopback by default because this
first dashboard has no authentication layer.

On this host, an ignored `config/registry.local.yml` is already configured for
the accepted IANLAN terminal snapshot and its read-only world/town databases.
That adapter contains paths only—no credentials or world coordinates.

## Run reports from the CLI

```bash
npm run cli -- server list
npm run cli -- world list --server ianlan
npm run cli -- recipe list
npm run cli -- snapshot inspect --server ianlan --world overworld
npm run cli -- report run \
  --recipe snapshot-overview \
  --server ianlan \
  --world overworld
```

A bounded block census accepts an inclusive coordinate box:

```bash
npm run cli -- report run \
  --recipe block-census \
  --server ianlan \
  --world overworld \
  --bounds=-128,-64,-128,128,319,128
```

Every job is persisted under `data/jobs/`. Report artifacts are written beneath
`data/artifacts/<server>/<world>/<recipe>/<job>/`. Existing output directories
are never overwritten.

## Repository map

```text
apps/
  api/             REST API, local static hosting, serialized job queue
  cli/             terminal interface to the same report service
  dashboard/       dependency-free operator UI
packages/
  world-core/      registry, domain records, path guards, jobs, artifacts
  anvil/           snapshot hashing and block-state census
  catalog/         read-only SQLite census and world feature export
  reporting/       recipe validation, execution, HTML, artifact manifests
recipes/           reusable YAML report recipes
config/            committed example and ignored local registry
docs/              architecture, recipes, migration, and roadmap
```

## API

- `GET /api/health`
- `GET /api/overview`
- `GET /api/servers`
- `GET /api/recipes`
- `GET /api/jobs`
- `GET /api/jobs/:id`
- `POST /api/jobs`

Submit a report:

```json
{
  "serverId": "ianlan",
  "worldId": "overworld",
  "recipeId": "block-census",
  "parameters": {
    "bounds": "-128,-64,-128,128,319,128"
  }
}
```

The worker executes one job at a time. Both successful and failed jobs keep
their structured logs; successful jobs include an artifact manifest with SHA-256
and byte size for every produced file.

## Design boundary

IANLAN NextGen remains the polished, audience-facing report library. MC Fleet
Devtools is the workshop that scans worlds and creates those reports. Rich
IANLAN-specific maps, coordinates, classifications, issue evidence, Box
receipts, and Railway publication logic remain in `mc-fleet-bot` until they are
split into explicit server presets and generic plugins.

See [Architecture](docs/ARCHITECTURE.md), [Report recipes](docs/REPORT_RECIPES.md),
[Extraction notes](docs/EXTRACTION.md), and [Roadmap](docs/ROADMAP.md).
