"""Tests for the per-centerpiece litematic writer."""

from __future__ import annotations

from pathlib import Path

import pytest
from litemapy import Schematic

from mcwb.build.litematic_writer import LitematicWriter


def test_litematic_writer_emits_valid_schematic(tmp_path: Path) -> None:
    writer = LitematicWriter(output_dir=tmp_path)
    writer.open(tmp_path, brief={"build_id": "test"})
    path = writer.write_centerpiece(
        name="25-Ton Blast Door",
        position=(0, 200, -420),
        size=(3, 12, 6),
        block_id="minecraft:iron_door",
    )
    writer.close()
    assert path is not None
    out = Path(path)
    assert out.exists()
    assert out.suffix == ".litematic"

    # Round-trip: load it back via litemapy and verify shape.
    schem = Schematic.load(str(out))
    assert schem.name == "25-Ton Blast Door"
    assert schem.author == "mcwb"
    assert "centerpiece" in schem.regions


def test_litematic_writer_emits_index(tmp_path: Path) -> None:
    writer = LitematicWriter(output_dir=tmp_path)
    writer.open(tmp_path, brief={})
    writer.write_centerpiece("cp-1", (0, 0, 0), (5, 5, 5), "minecraft:stone")
    writer.write_centerpiece("cp-2", (10, 10, 10), (5, 5, 5), "minecraft:dirt")
    writer.close()
    idx = tmp_path / "_index.json"
    assert idx.exists()
    import json
    data = json.loads(idx.read_text(encoding="utf-8"))
    assert len(data) == 2
    assert data[0]["name"] == "cp-1"
    assert data[1]["name"] == "cp-2"
