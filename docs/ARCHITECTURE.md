# Architecture

## Product model

MC Fleet Devtools is organized around a small set of durable records:

- **Server** — a named Minecraft installation or project boundary.
- **World** — a dimension and its registered read-only resources.
- **Snapshot** — copied Anvil region files with a deterministic content identity.
- **Catalog** — durable structured data, normally SQLite.
- **Recipe** — a declarative sequence of allowed read-only report steps.
- **Job** — one execution with state, logs, parameters, and an output directory.
- **Artifact** — a produced file bound by path, size, media type, and SHA-256.

Future versions add Design, Operation Plan, Release, and Issue without weakening
the current read-only boundary.

## Execution flow

```text
Dashboard ─┐
           ├── REST / CLI ── ReportService ── validated recipe
CLI ───────┘                         │
                                    ├── world-core registry + path guards
                                    ├── Anvil snapshot reader
                                    ├── SQLite catalog reader
                                    └── fresh artifact directory + manifest
```

The API queue is serialized. A report can be CPU-, memory-, and disk-intensive,
and concurrent whole-world scans are usually a bad default on a Minecraft host.
The service itself is independent of Express, so the CLI can execute the same
recipe synchronously.

## Trust and safety

The registry is operator-controlled configuration. Every resource path is
resolved inside the server connector's absolute root. Inputs are opened
read-only. Job outputs are constrained to a child of the configured artifact
root and must not exist before a run.

Recipe files are not arbitrary scripts. The loader accepts only a fixed set of
step types implemented inside `packages/reporting`. This prevents a report
request from becoming an implicit shell-command or RCON execution surface.

The API has no authentication in v0.1 and therefore binds to `127.0.0.1`.
Remote exposure requires an authenticated reverse proxy or a future native auth
layer.

## Connector boundary

Only the `local` connector exists today. It reads snapshots and databases that
are already on disk. A future SSH/SFTP snapshot connector must:

1. keep credentials outside the registry;
2. separate save/flush from file transfer;
3. record remote source identity and transfer evidence;
4. never share code paths with world mutation; and
5. produce a new immutable snapshot directory rather than updating one in place.

## Future release boundary

World changes will not be implemented as recipe steps. They require a separate
lifecycle:

```text
Draft design
  → compile operation plan
  → preview diff and collision checks
  → generate exact rollback
  → immutable source preflight
  → explicit approval
  → guarded execution
  → immutable post snapshot
  → post-release QA
```

This preserves the hard-won safety properties in the IANLAN release tooling
without making read-only report requests capable of editing a world.
