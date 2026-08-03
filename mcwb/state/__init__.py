"""World state store (lands in v0.2).

Tracks what masterplan version + phase set was last applied to a world,
so subsequent ``mcwb build`` runs compute a phase-level diff instead of
rebuilding the entire world.

State lives at ``<world_dir>/.mcwb-state.json``.
"""

from mcwb.state.store import State, PhaseRecord, load, save, fresh_state, state_path

__all__ = ["State", "PhaseRecord", "load", "save", "fresh_state", "state_path"]

