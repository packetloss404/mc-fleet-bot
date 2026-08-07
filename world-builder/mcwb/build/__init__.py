"""Build pipeline.

- writer.py            — WorldWriter interface + JsonWorldWriter + factory
- amulet_writer.py     — AmuletWorldWriter (when amulet-core is importable)
- litematic_writer.py  — LitematicWriter (per-centerpiece .litematic via litemapy)
- phase_generator.py   — per-phase block-change generators
- diff.py              — phase-level diff against the world state
- phase_runner.py      — orchestrator: diff → apply → state
"""

from mcwb.build.writer import (
    BlockChange,
    JsonWorldWriter,
    PhaseResult,
    WorldWriter,
    get_writer,
)
from mcwb.build.phase_runner import run_build
from mcwb.build.diff import compute_diff, PhaseDiff
from mcwb.build.litematic_writer import LitematicWriter

__all__ = [
    "BlockChange",
    "JsonWorldWriter",
    "LitematicWriter",
    "PhaseDiff",
    "PhaseResult",
    "WorldWriter",
    "compute_diff",
    "get_writer",
    "run_build",
]
