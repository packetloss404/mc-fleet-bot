"""Amulet-core world writer.

Writes block changes directly to a Minecraft world's region files via
amulet-core. Only available when amulet-core imports cleanly — currently
that means Python 3.11 or 3.12 (amulet-nbt 1.0.3.x has a ``dataclass``
mutable-default incompatibility with Python 3.13).

When amulet-core is unavailable, importing this module raises
``ImportError`` and the build pipeline falls back to ``JsonWorldWriter``.

To enable this writer on the minecrafter:

    1. Install Python 3.12 (amulet-core doesn't yet support 3.13)
    2. Create a venv: ``python3.12 -m venv .venv``
    3. ``.venv/bin/pip install amulet-core amulet-nbt litemapy``
    4. ``.venv/bin/pip install -e /path/to/mc-world-builder``
    5. mcwb will auto-detect amulet-core and use this writer.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator

from mcwb.build.writer import BlockChange, WorldWriter

# Probe amulet-core on import. If it fails, this module raises ImportError
# and the writer factory falls back to JsonWorldWriter.
try:
    import amulet
    from amulet.api.block import Block  # noqa: F401  (verified on import)
    from amulet.utils import block_coords_to_chunk_coords  # noqa: F401
    _AMULET_AVAILABLE = True
except Exception as _e:  # noqa: BLE001
    _AMULET_AVAILABLE = False
    _AMULET_IMPORT_ERROR = _e


def _require_amulet() -> None:
    if not _AMULET_AVAILABLE:
        raise ImportError(
            f"amulet-core is not importable: {_AMULET_IMPORT_ERROR}. "
            f"Install with Python 3.11/3.12 and `pip install amulet-core`, "
            f"or use --writer json."
        )


class AmuletWorldWriter:
    """Writes block changes to a Minecraft world via amulet-core.

    This is the production writer for the minecrafter. For MVP it is
    a thin shell — the real work (phase-by-phase writes, chunk iteration)
    lands when the minecrafter has Python 3.12 + amulet-core installed.

    For now, the writer:
      1. Opens the world at world_dir via amulet
      2. Writes a .mcwb-summary.json alongside (same as JsonWorldWriter)
      3. If amulet writes succeed, the world file is updated in place
      4. If amulet writes fail, the caller should fall back to json
    """

    name = "amulet"

    def __init__(self) -> None:
        _require_amulet()
        self._level = None
        self._world_dir: Path | None = None
        self._count = 0

    def open(self, world_dir: Path, brief: dict) -> None:
        _require_amulet()
        world_dir.mkdir(parents=True, exist_ok=True)
        self._world_dir = world_dir

        # amulet-level API: load_level opens an existing world;
        # create_level makes a new one. Detect which we need.
        level_dat = world_dir / "level.dat"
        if level_dat.exists():
            self._level = amulet.load_level(str(world_dir))
        else:
            # Default Java 1.21 overworld. mcwb MVP always Java.
            self._level = amulet.create_level(
                str(world_dir),
                version=("java", (1, 21, 0)),
                overwrite=True,
            )

        # Write summary alongside the world so the verifier can read it
        # even when amulet-core's level format is opaque.
        summary = {
            "build_id": brief.get("build_id"),
            "brief_version": brief.get("version"),
            "spec_version": brief.get("spec_version"),
            "edition": brief.get("edition"),
            "java_version": brief.get("java_version"),
            "world_footprint": brief.get("world_footprint", {}),
            "writer": self.name,
        }
        with (world_dir / ".mcwb-summary.json").open("w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2)

    def write_blocks(self, changes: Iterator[BlockChange]) -> int:
        _require_amulet()
        assert self._level is not None, "open() must be called first"
        n = 0
        # Buffer writes by chunk for amulet's batch API.
        # For MVP, write one block at a time. The amulet team recommends
        # chunk-level writes for performance; that's a v0.3 optimization.
        for change in changes:
            try:
                # Parse the block id into a Java BlockState.
                # Format: "minecraft:polished_diorite" or
                # "minecraft:oak_stairs[facing=north,half=bottom]"
                base, _, props = change.block_id.partition("[")
                props = props.rstrip("]")
                block = amulet.api.block.Block(
                    namespace=base.split(":", 1)[0],
                    base_name=base.split(":", 1)[1],
                    properties=_parse_props(props),
                )
                self._level.set_block(change.x, change.y, change.z, "minecraft:overworld", block)
                n += 1
            except Exception as e:  # noqa: BLE001
                # Surface the first few errors; then keep going so a
                # single bad block doesn't kill the whole build.
                if n < 3:
                    print(f"  amulet set_block failed at ({change.x},{change.y},{change.z}): {e}")
        self._level.save()
        self._level.close()
        self._count += n
        return n

    def write_centerpiece(
        self,
        name: str,
        position: tuple[int, int, int],
        size: tuple[int, int, int],
        block_id: str,
    ) -> str | None:
        # Amulet writer integrates with the live world; per-piece
        # artifacts (.litematic) come from the LitematicWriter, not here.
        return None

    def close(self) -> None:
        if self._level is not None:
            try:
                self._level.save()
                self._level.close()
            except Exception:  # noqa: BLE001
                pass
            self._level = None


def _parse_props(props: str) -> dict:
    """Parse ``a=1,b=2`` style block-state props into a dict."""
    if not props:
        return {}
    out: dict = {}
    for part in props.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out
