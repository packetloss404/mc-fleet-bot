# AGENTS.md

Guidance for coding agents working in `fleet-devtools/`, a subtool of the
`mc-fleet-bot` repository. Run every command below from this directory, never
from the repository root — this tree has its own dependency install and the
root `npm install` does not reach it.

## Purpose

This repository is a reusable Minecraft world-development workbench. It is
separate from any one bot fleet or Minecraft server. Server-specific
coordinates, authored plans, credentials, evidence, and release receipts belong
in server repositories or ignored local configuration.

## Safety boundary

- The current `0.x` implementation is read-only with respect to Minecraft.
- Do not add RCON, WorldEdit, server restart, SFTP upload, or live-world mutation
  to a report recipe.
- Snapshot inputs and SQLite databases are opened read-only.
- Report output must be a fresh job directory under the configured artifact root.
- A future release subsystem must use explicit plans, immutable source identity,
  preview diffs, rollback artifacts, approval, guarded execution, and post-QA.
- Never commit secrets or `config/registry.local.yml`.

## Commands

```bash
npm install
npm run check      # lint + build + test + format:check
npm run dev        # start the API on port 4310
npm run cli -- registry check
npm run cli -- report run --recipe <id> --server <id> --world <id>
```

The dashboard/API listens on port `4310` on all interfaces by default. Set
`MC_FLEET_DEVTOOLS_HOST=127.0.0.1` to restrict access to the local machine.

## Repository layout

- `packages/world-core` — domain types, registry, path guards, jobs, hashes,
  and shared `resolvePaths` helper for env-driven config.
- `packages/anvil` — read-only Anvil snapshot summary, block census, and
  per-region SHA-256 diff between two snapshots.
- `packages/catalog` — generic read-only SQLite census and `world_features`
  export. Uses `defaultSafeIntegers` so bigints survive JSON.
- `packages/reporting` — YAML recipe loader with typed parameters, recipe
  validator, job runner, per-step metric callbacks, step result cache, HTML
  report generator, and serialized job queue.
- `apps/cli` — the same workflow exposed to terminal users.
- `apps/api` — local REST API, static dashboard hosting, and the job queue.
- `apps/dashboard` — dependency-free browser UI served by the API.
- `recipes` — reusable report definitions with no server coordinates.
- `.github/workflows/ci.yml` — `npm run check` on push and PR against main.

## Built-in step types

Recipes are composed of these allow-listed step types. New step types
require a reviewed TypeScript implementation in `packages/reporting` and
tests; the recipe loader rejects anything else.

- `snapshot-summary` — region-level SHA-256 and per-region size/mtime. Cached.
- `snapshot-diff` — per-region comparison against another world on the same
  server. Reports added/removed/changed and unchanged regions.
- `database-catalog` — schema, table counts, `PRAGMA quick_check`, SHA-256.
  Cached.
- `world-features` — exports rows from a registered `world_features` table.
- `block-census` — block-state decoder with optional inclusive bounds.
- `html-report` — terminal step that produces a portable HTML handoff.

## Recipe parameters

Each parameter is declared with a `type` (`string`, `integer`, or `bounds`)
plus optional `min`/`max` for integers. Parameters are validated and coerced
by `validateAndCoerceParameters` in `packages/reporting/src/recipes.ts` at
submit time — unknown keys, missing required values, type mismatches, and
out-of-range integers are all rejected before the job is created.

## Job lifecycle

Jobs move through `queued → running → completed | failed | cancelled`. The
worker is serialized: one report at a time. Cancellation can be requested
via `POST /api/jobs/:id/cancel` or `mc-fleet-devtools job cancel <id>`; the
worker observes the persisted status between steps and after every scanned
region in the block-census step, then aborts cleanly with `JobCancelledError`.
On startup, any `running` job from a previous process is marked `failed` with
a "Worker stopped" log entry.

## Step result cache

`snapshot-summary` and `database-catalog` results are cached at
`<artifactRoot>/.cache/<server>/<world>/<recipe>/<step>/<sha256>.json`,
keyed by the input file path. Re-running the same recipe on the same world
reuses the cache, so changing the HTML template or recipe steps downstream
of these doesn't trigger an expensive re-scan.

## Development conventions

- TypeScript is strict, ESM, and targets Node 20.
- Use explicit domain types and structured errors (`DevtoolsError`).
- Keep route handlers thin and reusable behavior in packages.
- Do not overwrite prior artifacts. Jobs always receive unique output folders.
- Tests may construct synthetic region files and SQLite databases in temporary
  directories; they must not access a live server.
- All code is formatted with Prettier (`npm run format`); CI runs
  `format:check`.
