# Architecture

## Product model

MC Fleet Devtools is organized around a small set of durable records:

- **Server** — a named Minecraft installation or project boundary.
- **World** — a dimension and its registered read-only resources.
- **Snapshot** — copied Anvil region files with a deterministic content identity.
- **Catalog** — durable structured data, normally SQLite.
- **Recipe** — a declarative sequence of allowed read-only report steps with
  typed parameters.
- **Job** — one execution with state, logs, parameters, an output directory,
  and an optional progress indicator.
- **Artifact** — a produced file bound by path, size, media type, and SHA-256.

Future versions add Design, Operation Plan, Release, and Issue without weakening
the current read-only boundary.

## Execution flow

```text
Dashboard ─┐
           ├── REST / CLI ── ReportService ── validated recipe
CLI ───────┘                         │
                                    ├── parameter validator (type, range, required)
                                    ├── world-core registry + path guards
                                    ├── Anvil snapshot reader
                                    ├── SQLite catalog reader
                                    ├── step result cache (snapshot-summary, database-catalog)
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

The API has no authentication in v0.1. It binds to `0.0.0.0` for trusted LAN
access by default and can be restricted to loopback with
`MC_FLEET_DEVTOOLS_HOST=127.0.0.1`. Public or untrusted-network exposure
requires an authenticated reverse proxy or a future native auth layer.

## Job lifecycle

```text
queued ──► running ──► completed
            │   │
            │   └─► failed
            └────► cancelled
```

- `submit` validates parameters, creates the job record, and enqueues it.
- `run` claims the job, sets `running`, walks the recipe steps. After each
  step and after every region in the block-census step, it polls the
  persisted status; if the operator set it to `cancelled`, the worker throws
  `JobCancelledError` and aborts cleanly.
- `cancel` is the operator-initiated transition from `queued` or `running`
  to `cancelled`. Already-terminal jobs are rejected.
- On API startup, any `running` job from a previous process is marked
  `failed` with a "Worker stopped while this job was running" log entry.

## Step result cache

`snapshot-summary` and `database-catalog` results are persisted at
`<artifactRoot>/.cache/<server>/<world>/<recipe>/<step>/<sha256>.json`, where
the hash is the SHA-256 of the input file path. The next run of the same
recipe on the same world reads the cache instead of re-scanning. Cache misses
(missing file, unparseable JSON) fall through to a normal execution.

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
