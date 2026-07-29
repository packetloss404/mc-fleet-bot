# AGENTS.md

Guidance for coding agents working in `/opt/stacks/mc-fleet-devtools`.

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
npm run build
npm test
npm run cli -- registry check
npm run dev
```

The dashboard/API listens on port `4310` on all interfaces by default. On this
host, use `http://10.80.13.18:4310`.

## Repository layout

- `packages/world-core` — domain types, registry, path guards, jobs, hashes.
- `packages/anvil` — read-only Anvil snapshot inspection and block census.
- `packages/catalog` — generic read-only SQLite census and feature export.
- `packages/reporting` — YAML recipe loading, job runner, manifests, HTML.
- `apps/cli` — the same workflow exposed to terminal users.
- `apps/api` — local REST API and serialized background queue.
- `apps/dashboard` — dependency-free browser UI served by the API.
- `recipes` — reusable report definitions with no server coordinates.

## Development conventions

- TypeScript is strict, ESM, and targets Node 20.
- Use explicit domain types and structured errors.
- Keep route handlers thin and reusable behavior in packages.
- Do not overwrite prior artifacts. Jobs always receive unique output folders.
- Tests may construct synthetic region files and SQLite databases in temporary
  directories; they must not access a live server.
