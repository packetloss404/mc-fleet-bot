# mcwb — Minecraft world builder from versioned masterplans

mcwb consumes a masterplan directory (typically produced by an upstream
planner like [`mc-fleet-bot`](../mc-fleet-bot)) and applies it to a live
Minecraft world. Masterplans are versioned and diff-friendly: re-running
mcwb on the same masterplan is a no-op; running it on a newer masterplan
applies only the phases that changed.

## Status: pre-alpha (v0.0.1)

This release ships the spec schema and the validator. The build,
state, and verify subsystems land in v0.2.

## What "masterplan" means here

A masterplan is a directory with this shape:

```
<plan_dir>/
  build-info.json                       # version metadata, budget, key locations
  combined-complex-report.html          # print-grade architecture report
  01-research/  02-design/  03-visuals/ # narrative and reference material
  04-contractor/
    contractor-brief.json               # binding spec — what mcwb reads
    contractor-brief.md                 # narrative — for LLM enrichment later
```

mcwb's job is to take the `04-contractor/contractor-brief.json` and
apply it to a Minecraft world. The narrative docs are for humans and
for the LLM enrichment step (not yet implemented).

## Install

mcwb is a Python 3.11+ package. From the repo root:

```bash
pip install -e .
```

This installs the `mcwb` CLI entry point.

## Usage

```bash
# Lint a masterplan against the spec schema
mcwb validate --plan path/to/plan_dir

# Or drop a .mcwb.toml in cwd (see examples/.mcwb.toml) and just:
mcwb validate
```

CLI flags override the config file. See `mcwb --help` for the full
command set.

## What lands in v0.2

- `mcwb build` — apply a masterplan to a (stopped) world via amulet-core
- `mcwb status` — show last applied state per world
- `mcwb verify` — run the 10-point acceptance list from the brief
- phase-level diff against `.mcwb-state.json`
- per-centerpiece `.litematic` output via litemapy

## Layout

```
mcwb/
  __init__.py           version + spec version constants
  __main__.py           `python -m mcwb` entry
  cli.py                argparse CLI
  spec/
    loader.py           masterplan loader + validator
    migrate.py          spec version migrations (empty in MVP)
  palette/
    java_1_21.json      block palette library
  build/                amulet-core writer (lands in v0.2)
  state/                .mcwb-state.json store (lands in v0.2)
  verify/               QA runner (lands in v0.2)
  source/               masterplan source resolvers
schemas/
  contractor-brief.schema.json   JSON Schema for the binding spec
tests/
  fixtures/             copy of mc-fleet-bot masterplans for testing
docs/
  spec.md               spec format reference
```

See `docs/spec.md` for the masterplan spec format reference.
