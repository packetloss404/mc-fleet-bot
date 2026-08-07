# Extraction notes

The IANLAN work produced several layers of tooling. This repository starts by
extracting the parts that are broadly reusable and safest to generalize.

| Existing capability in `mc-fleet-bot` | Devtools destination | Current state |
|---|---|---|
| `hash_world_snapshot.mjs` | `packages/anvil` snapshot summary | Extracted and expanded |
| Anvil palette decoding used by map/diff scripts | `packages/anvil` census | Extracted |
| Generic SQLite schema/table census | `packages/catalog` | Extracted |
| `world_features` export | `packages/catalog` | Extracted |
| One-off report orchestration | `packages/reporting` YAML recipes | Extracted foundation |
| CLI-only execution | `apps/cli`, `apps/api`, `apps/dashboard` | Extracted |
| `world_snapshot.py` SSH/RCON transfer | future snapshot connector | Intentionally deferred |
| `world_render.mjs` and atlas rendering | future mapping plugin | Next extraction |
| Underground IANLAN classifications/maps | IANLAN preset/plugin | Remains server-specific |
| PDF printing and publication adapters | future artifact/publisher plugins | Deferred |
| `WorldEditOps`, guarded ops, rollback QA | future release subsystem | Deliberately isolated |

## Why the rich generators were not copied wholesale

The existing world catalog and underground report generators mix reusable
mechanics with IANLAN schema assumptions, coordinate systems, classification
rules, accepted evidence, design language, and publication layout. Copying those
files would create a second IANLAN application rather than a fleet tool.

The extraction instead creates stable interfaces first:

- registered worlds and resources;
- immutable snapshot identity;
- generic Anvil and SQLite readers;
- allow-listed recipes;
- job state and artifact manifests; and
- equivalent CLI/API/dashboard entry points.

Later work can move map renderers and report layout components behind those
interfaces, with IANLAN retained as the first real preset.

## Local IANLAN adapter

`config/registry.local.yml` is ignored by Git and currently points to:

- the accepted terminal recovery post snapshot;
- `data/world-map.db`; and
- `data/town.db`

inside `/opt/stacks/mc-fleet-bot`. It performs no copy and makes no connection to
Minecraft. Changing that file changes only which already-local evidence a new
job reads.
