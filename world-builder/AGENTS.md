# AGENTS.md

Guidance for coding agents working in `world-builder/` (the `mcwb` subtool of
`mc-fleet-bot`). Run every command below from this directory, never from the
repository root — this is a standalone Python package and the Node build at
the root does not cover it.

## Purpose

mcwb consumes a versioned masterplan and applies it to a Minecraft world. It
was its own repo (`packetloss404/mc-world-builder`) until 2026-08-07, when it
was merged in via `git subtree` with history preserved. The original GitHub
repo was **not** deleted; it stays as a read-only mirror.

## Boundary with the rest of the repo

- Reads `docs/masterplans/<plan>/04-contractor/contractor-brief.json` in
  place; never writes back.
- Five masterplans currently ship a brief (see `docs/masterplans/`).
- Nothing in `src/`, `web/`, `world-showcase/`, or `tools/fleet-devtools/`
  imports mcwb. The two are coupled only through the on-disk masterplan
  format.

## Commands

```bash
python3 -m venv .venv && source .venv/bin/activate   # Python 3.11+
pip install -e ".[dev]"        # 'litemapy' and the package itself are required
pytest                          # 38 tests

# Lint a masterplan against the spec schema
mcwb validate --plan path/to/plan_dir

# Apply it to a (stopped) Minecraft world
mcwb build --plan path/to/plan_dir --world path/to/world

# See what was applied
mcwb status --world path/to/world

# Run QA checks against the built world
mcwb verify --plan path/to/plan_dir --world path/to/world
```

## Python 3.13 + amulet-core trap

amulet-core 1.6.x depends on amulet-nbt 1.0.3.x, which uses a `dataclass`
mutable-default pattern that Python 3.13 rejects at import time. The
newer amulet-nbt 5.0.0a1 fixes this but isn't compatible with
pymctranslate 1.0.14. The fix is upstream.

Until it lands, run the minecrafter on Python 3.11 or 3.12. The build
pipeline is fully testable on 3.13 with the JSON writer; the amulet
writer is wired up and will activate automatically when it can import
cleanly. **Do not debug the 3.13 import error as a venv or repo bug.**

## Windows venv cross-platform note

The committed `.venv/` was created in WSL (`/mnt/d/...`) and uses Linux
symlinks for `python`/`python3`/`python3.12`. It will not run under
Windows Python directly. On Windows, create a fresh venv
(`python -m venv .winvenv`) and run `pip install -e ".[dev]"` inside it.
`pytest` then works without touching the WSL venv. Both venvs are
gitignored.

## Tests

`pytest` is the single entry point. The test count is 38 across 10 files
(`tests/test_*.py`); the count grows as new spec/version coverage lands.
The test fixture at `tests/fixtures/04-combined-complex/` is a slimmed
copy of the real masterplan; the fixture ships with the repo so the
tests do not depend on `data/` or the live world.

There is no CI workflow for `world-builder/` yet. The tests run from
any host that has Python 3.11+ and `litemapy` installed. Tracked as
OPT-15 in `BACKLOG.md`.

## Boundaries to keep

- Do not introduce a Node/TypeScript binding. The coupling stays on-disk.
- Do not write back into `docs/masterplans/`. mcwb reads those in place.
- Do not import `src/`. There is no Node↔Python code path.
- Do not couple with `tools/fleet-devtools/`. They share formats
  (`world_features` table), but no module imports across that boundary
  either.

## File map

- `mcwb/__init__.py` — version + spec version constants.
- `mcwb/cli.py` — argparse CLI (`validate`/`build`/`status`/`verify`).
- `mcwb/spec/loader.py` — masterplan loader + validator.
- `mcwb/build/phase_runner.py` — orchestrator: diff → apply → state.
- `mcwb/build/writer.py` — `WorldWriter` interface + `JsonWorldWriter` + factory.
- `mcwb/build/amulet_writer.py` — `AmuletWorldWriter` (dormant on Py 3.13).
- `mcwb/build/litematic_writer.py` — `LitematicWriter` (per-centerpiece).
- `mcwb/build/phase_generator.py` — 11 phase generators (bounding-box style).
- `mcwb/build/diff.py` — `PhaseDiff` (which phases are dirty).
- `mcwb/state/store.py` — `.mcwb-state.json` reader/writer.
- `mcwb/verify/qa.py` — 10-point acceptance list runner.
- `schemas/contractor-brief.schema.json` — JSON Schema for the binding spec.
- `tests/` — pytest suite (38 tests).
- `examples/.mcwb.toml` — sample config (paths to edit for the live setup).
- `docs/spec.md` — spec format reference.
