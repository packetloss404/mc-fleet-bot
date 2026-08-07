"""Litematic writer for per-centerpiece outputs.

Emits a ``.litematic`` file per centerpieces, paste-able in Litematica.
This works on any Python (litemapy is pure Python) and is a useful
visual-feedback loop even before amulet-core is wired up.
"""

from __future__ import annotations

import json
from pathlib import Path

from litemapy import BlockState, Schematic

from mcwb.build.writer import WorldWriter


class LitematicWriter:
    """Wraps a parent writer and emits a .litematic per centerpieces.

    Centerpieces specs don't carry exact bounding boxes in the brief
    (the brief has a ``block_spec`` free-text field). For MVP we infer
    a reasonable default box from the centerpiece type and emit a
    schematic filled with the centerpiece's primary block. Refining
    this into real geometry is a v0.3 task.
    """

    name = "litematic"

    # Default box size per centerpiece index, in the order they appear
    # in the brief. These are placeholders — real bounding boxes come
    # from a per-centerpiece design doc in v0.3.
    DEFAULT_SIZES = [
        (3, 12, 6),   # 25-ton blast door
        (7, 7, 3),    # mid-landing
        (3, 5, 3),    # composite terrane plaque
        (7, 7, 7),    # surface entrance pavilion
        (4, 5, 6),    # subtropolis horizontal portal
        (6, 6, 6),    # cheyenne outer portal
        (11, 11, 11), # summit observation platform
    ]

    def __init__(self, output_dir: Path | None = None) -> None:
        self._output_dir: Path | None = output_dir
        self._count = 0
        self._emitted: list[dict] = []

    def open(self, world_dir: Path, brief: dict) -> None:
        # Litematic output goes to <world_dir>/litematics/ by default.
        if self._output_dir is None:
            self._output_dir = world_dir / "litematics"
        self._output_dir.mkdir(parents=True, exist_ok=True)

    def write_blocks(self, changes):  # type: ignore[no-untyped-def]
        # LitematicWriter is a side-channel; it ignores the block stream.
        # The parent writer handles the actual world writes.
        return 0

    def write_centerpiece(
        self,
        name: str,
        position: tuple[int, int, int],
        size: tuple[int, int, int],
        block_id: str,
    ) -> str | None:
        assert self._output_dir is not None, "open() must be called first"
        # Default box from the index if not provided.
        if size == (0, 0, 0):
            idx = self._count
            size = self.DEFAULT_SIZES[idx % len(self.DEFAULT_SIZES)]
        width, height, length = size
        x, y, z = position

        schem = Schematic(
            name=name,
            author="mcwb",
            description=f"Auto-generated from masterplan (block={block_id})",
        )
        # Centerpiece coordinates in the brief are absolute world coords.
        # Litematic regions are relative to their own origin, so we
        # offset by -position to keep the local (0,0,0) at the centerpiece.
        try:
            block = BlockState(block_id)
        except Exception:
            block = BlockState("minecraft:stone")
        # Use the (x_min, y_min, z_min) corner of the region. The size
        # might be larger than the centerpiece itself; that's fine —
        # the user can crop in Litematica.
        from litemapy import Region
        region = Region(-(width // 2), 0, -(length // 2), width, height, length)
        # Fill the floor with the centerpiece block.
        for ix in range(width):
            for iz in range(length):
                region[ix, 0, iz] = block
        # Add a marker block at the centerpiece origin so it's findable
        # when pasted in.
        region[0, 1, 0] = BlockState("minecraft:redstone_lamp")
        schem.regions["centerpiece"] = region

        safe_name = "".join(c if c.isalnum() or c in "-_" else "_" for c in name)
        out_path = self._output_dir / f"{safe_name}.litematic"
        schem.save(str(out_path))
        self._emitted.append({
            "name": name,
            "position": list(position),
            "size": list(size),
            "block_id": block_id,
            "litematic_path": str(out_path),
        })
        self._count += 1
        return str(out_path)

    def close(self) -> None:
        if self._output_dir is not None and self._emitted:
            with (self._output_dir / "_index.json").open("w", encoding="utf-8") as f:
                json.dump(self._emitted, f, indent=2)
        self._emitted = []
