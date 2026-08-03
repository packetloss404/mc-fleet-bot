# mcwb — Minecraft world builder from versioned masterplans

mcwb consumes a masterplan directory (typically produced by an upstream
planner like [`mc-fleet-bot`](../mc-fleet-bot)) and applies it to a live
Minecraft world. Masterplans are versioned and diff-friendly: re-running
mcwb on the same masterplan is a no-op; running it on a newer masterplan
applies only the phases that changed.

## Status: alpha (v0.1.0)

Shipped: spec schema, validator, state store, phase-level diff, phase
runner, two writers (JSON for testing, litematic per-centerpiece), QA
verifier, full CLI.

Pending: amulet-core writer auto-activation (requires Python 3.11/3.12
on the minecrafter), per-element geometry in phase generators (currently
bounding-box style), visual QA checks (5 of 10 are deferred).

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
apply it to a Minecraft world.

## Install

mcwb is a Python 3.11+ package.

```bash
# Base install: works on any Python 3.11+, uses JSON writer + litematic
pip install -e .

# Full install: adds amulet-core for writing directly to Minecraft worlds
# (requires Python 3.11 or 3.12 — see "Why Python 3.13 doesn't work" below)
pip install -e ".[amulet]"
```

## Usage

```bash
# 1. Lint the masterplan against the spec schema
mcwb validate --plan path/to/plan_dir

# 2. Apply it to a (stopped) Minecraft world
mcwb build --plan path/to/plan_dir --world path/to/world

# 3. See what was applied
mcwb status --world path/to/world

# 4. Run QA checks against the built world
mcwb verify --plan path/to/plan_dir --world path/to/world
```

CLI flags override the config file. See `mcwb --help` for the full
command set. Drop a `.mcwb.toml` in the working directory to set
`plan_dir` and `world_dir` once (see `examples/.mcwb.toml`).

## How `mcwb build` works

1. **Validate** the masterplan against the JSON Schema in
   `schemas/contractor-brief.schema.json`. Hard errors block; soft
   warnings (e.g. phase budget drift) are surfaced but don't fail.
2. **Compute the diff** between the current world state
   (`.mcwb-state.json` in the world dir) and the masterplan. A phase
   is dirty when: never applied, the spec hash changed, or the brief
   version changed since the last apply.
3. **Apply dirty phases** through the writer. Default is `json` (a
   structured `.mcwb-blocks.jsonl` next to the world). If amulet-core
   is importable, the `amulet` writer is used automatically (it writes
   directly to the Minecraft world files).
4. **Emit per-centerpiece litematic files** via litemapy — paste into
   Litematica to eyeball individual centerpieces without spinning up
   the full world.
5. **Update the state** in `.mcwb-state.json`. Next run starts from
   here.

## Why Python 3.13 doesn't work (yet)

amulet-core 1.6.x depends on amulet-nbt 1.0.3.x, which uses a
`dataclass` mutable-default pattern that Python 3.13 rejects at import
time. The newer amulet-nbt 5.0.0a1 fixes this but isn't compatible
with pymctranslate 1.0.14. The fix is upstream (amulet team tracks
this); until it lands, run the minecrafter on Python 3.11 or 3.12.

The build pipeline is fully testable on 3.13 with the JSON writer. The
amulet writer is wired up and will activate automatically when it can
import cleanly.

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
  build/
    writer.py           WorldWriter interface + JsonWorldWriter + factory
    amulet_writer.py    AmuletWorldWriter (when amulet-core imports)
    litematic_writer.py LitematicWriter (per-centerpiece via litemapy)
    phase_generator.py  per-phase block-change generators
    diff.py             phase-level diff against state
    phase_runner.py     orchestrator: diff → apply → state
  state/
    store.py            .mcwb-state.json read/write
  verify/
    qa.py               10-point acceptance list runner
  source/               masterplan source resolvers
schemas/
  contractor-brief.schema.json   JSON Schema for the binding spec
tests/
  fixtures/             copy of mc-fleet-bot masterplans for testing
docs/
  spec.md               spec format reference
```

See `docs/spec.md` for the masterplan spec format reference.
