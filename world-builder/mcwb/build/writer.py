"""World writer interface.

A world writer takes a stream of block-change operations and persists
them somewhere a Minecraft client can read. Different writers target
different surfaces:

- ``JsonWorldWriter`` — always available, writes a structured
  ``.mcworld.json`` that represents the build. Used for testing and
  for environments where amulet-core can't run.
- ``AmuletWorldWriter`` — uses amulet-core to write directly to a
  Minecraft world's region files. Only available when amulet-core
  imports cleanly (currently requires Python 3.11/3.12, not 3.13).

The block change representation is intentionally minimal so writers
can be swapped without phase generators caring about the backend.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator, Protocol


@dataclass(frozen=True)
class BlockChange:
    """A single block write: position + block state id."""

    x: int
    y: int
    z: int
    block_id: str  # e.g. "minecraft:polished_diorite"

    def as_tuple(self) -> tuple[int, int, int, str]:
        return (self.x, self.y, self.z, self.block_id)


@dataclass
class PhaseResult:
    """Result of writing one phase. The phase_runner aggregates these."""

    phase_number: int
    phase_name: str
    blocks_written: int
    writer: str  # which writer did the work
    output_paths: list[str] = field(default_factory=list)


class WorldWriter(Protocol):
    """Interface for any world writer."""

    name: str

    def open(self, world_dir: Path, brief: dict) -> None:
        """Open or create the world. Called once before any writes."""
        ...

    def write_blocks(self, changes: Iterator[BlockChange]) -> int:
        """Write a stream of block changes. Returns the count written."""
        ...

    def write_centerpiece(
        self,
        name: str,
        position: tuple[int, int, int],
        size: tuple[int, int, int],
        block_id: str,
    ) -> str | None:
        """Emit a per-centerpiece artifact (.litematic, etc). Returns the path or None."""
        ...

    def close(self) -> None:
        """Flush and finalize. Called once after all writes."""
        ...


class JsonWorldWriter:
    """Always-available writer. Persists block changes as a JSON log.

    Output: ``<world_dir>/.mcwb-blocks.jsonl`` — one block change per line.

    Plus a ``<world_dir>/.mcwb-summary.json`` with build metadata for
    the verifier and humans.
    """

    name = "json"

    def __init__(self) -> None:
        self._world_dir: Path | None = None
        self._blocks_path: Path | None = None
        self._fp = None
        self._count = 0
        self._centerpieces: list[dict] = []

    def open(self, world_dir: Path, brief: dict) -> None:
        world_dir.mkdir(parents=True, exist_ok=True)
        self._world_dir = world_dir
        self._blocks_path = world_dir / ".mcwb-blocks.jsonl"
        self._fp = self._blocks_path.open("w", encoding="utf-8")
        # Write a build summary the verifier can read.
        summary = {
            "build_id": brief.get("build_id"),
            "brief_version": brief.get("version"),
            "spec_version": brief.get("spec_version"),
            "edition": brief.get("edition"),
            "java_version": brief.get("java_version"),
            "world_footprint": brief.get("world_footprint", {}),
            "writer": self.name,
        }
        with (world_dir / ".mcwb-summary.json").open("w", encoding="utf-8") as sf:
            json.dump(summary, sf, indent=2)

    def write_blocks(self, changes: Iterator[BlockChange]) -> int:
        assert self._fp is not None, "open() must be called first"
        n = 0
        for change in changes:
            self._fp.write(json.dumps(change.as_tuple()) + "\n")
            n += 1
        self._fp.flush()
        self._count += n
        return n

    def write_centerpiece(
        self,
        name: str,
        position: tuple[int, int, int],
        size: tuple[int, int, int],
        block_id: str,
    ) -> str | None:
        # Json writer doesn't emit per-centerpiece files; record for the
        # verifier + the user.
        self._centerpieces.append({
            "name": name,
            "position": list(position),
            "size": list(size),
            "block_id": block_id,
        })
        return None

    def close(self) -> None:
        if self._fp is not None:
            self._fp.close()
            self._fp = None
        if self._world_dir is not None and self._centerpieces:
            with (self._world_dir / ".mcwb-centerpieces.json").open(
                "w", encoding="utf-8"
            ) as f:
                json.dump(self._centerpieces, f, indent=2)
        self._centerpieces = []


def get_writer(name: str | None = None) -> WorldWriter:
    """Select a writer by name. If name is None, picks the best available.

    Priority: amulet (when importable) > json (always).
    """
    if name == "json" or name is None:
        if name == "json":
            return JsonWorldWriter()
        # Try amulet first.
        if name is None:
            try:
                from mcwb.build.amulet_writer import AmuletWorldWriter  # noqa: F401
                return AmuletWorldWriter()
            except Exception:
                pass
        return JsonWorldWriter()
    if name == "amulet":
        from mcwb.build.amulet_writer import AmuletWorldWriter
        return AmuletWorldWriter()
    raise ValueError(f"unknown writer: {name!r}")
