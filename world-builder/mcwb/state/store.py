"""World state store.

Tracks what masterplan version + phase set was last applied to a world,
so subsequent ``mcwb build`` runs compute a phase-level diff instead of
rebuilding the entire world.

State lives at ``<world_dir>/.mcwb-state.json``.
"""

from __future__ import annotations

import json
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class PhaseRecord:
    """One phase's applied state: hash of the phase spec + counts when applied."""

    phase_number: int
    spec_hash: str
    blocks_written: int
    applied_at: float


@dataclass
class State:
    """Snapshot of what has been applied to a world."""

    build_id: str
    brief_version: str
    spec_version: str
    edition: str
    java_version: str
    applied_at: float
    phases: dict[str, PhaseRecord] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "build_id": self.build_id,
            "brief_version": self.brief_version,
            "spec_version": self.spec_version,
            "edition": self.edition,
            "java_version": self.java_version,
            "applied_at": self.applied_at,
            "phases": {k: asdict(v) for k, v in self.phases.items()},
        }

    @classmethod
    def from_dict(cls, d: dict[str, Any]) -> "State":
        phases = {
            k: PhaseRecord(**v) for k, v in d.get("phases", {}).items()
        }
        return cls(
            build_id=d["build_id"],
            brief_version=d["brief_version"],
            spec_version=d["spec_version"],
            edition=d["edition"],
            java_version=d["java_version"],
            applied_at=d["applied_at"],
            phases=phases,
        )


def state_path(world_dir: Path) -> Path:
    """The .mcwb-state.json path inside a world dir."""
    return world_dir / ".mcwb-state.json"


def load(world_dir: Path) -> State | None:
    """Read state from disk. Returns None if no state file exists yet."""
    path = state_path(world_dir)
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as f:
        return State.from_dict(json.load(f))


def save(world_dir: Path, state: State) -> None:
    """Write state to disk. Creates the world_dir if it doesn't exist."""
    world_dir.mkdir(parents=True, exist_ok=True)
    path = state_path(world_dir)
    tmp = path.with_suffix(".json.tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(state.to_dict(), f, indent=2)
    tmp.replace(path)


def fresh_state(masterplan: Any) -> State:
    """Build an empty State for a fresh world."""
    return State(
        build_id=masterplan.build_id,
        brief_version=masterplan.version,
        spec_version=masterplan.spec_version,
        edition=masterplan.edition,
        java_version=masterplan.brief.get("java_version", "1.21"),
        applied_at=time.time(),
        phases={},
    )
