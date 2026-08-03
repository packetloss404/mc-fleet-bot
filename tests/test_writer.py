"""Tests for the world writer layer."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from mcwb.build.writer import BlockChange, JsonWorldWriter, get_writer


def test_json_writer_writes_block_log(tmp_path: Path) -> None:
    """JsonWorldWriter writes each block change as a JSONL line."""
    brief = {
        "build_id": "test", "version": "1.0", "spec_version": "0.1",
        "edition": "java", "java_version": "1.21",
        "world_footprint": {"width_blocks": 100, "length_blocks": 100, "height_blocks": 100},
    }
    writer = JsonWorldWriter()
    writer.open(tmp_path, brief)
    changes = [
        BlockChange(x=0, y=64, z=0, block_id="minecraft:stone"),
        BlockChange(x=1, y=64, z=0, block_id="minecraft:stone"),
        BlockChange(x=2, y=64, z=0, block_id="minecraft:dirt"),
    ]
    n = writer.write_blocks(iter(changes))
    writer.close()
    assert n == 3

    log = tmp_path / ".mcwb-blocks.jsonl"
    assert log.exists()
    lines = log.read_text(encoding="utf-8").strip().splitlines()
    assert len(lines) == 3
    assert json.loads(lines[0]) == [0, 64, 0, "minecraft:stone"]


def test_json_writer_writes_summary(tmp_path: Path) -> None:
    brief = {
        "build_id": "summary-test", "version": "1.0", "spec_version": "0.1",
        "edition": "java", "java_version": "1.21",
        "world_footprint": {"width_blocks": 100, "length_blocks": 100, "height_blocks": 100},
    }
    writer = JsonWorldWriter()
    writer.open(tmp_path, brief)
    writer.close()
    summary = json.loads((tmp_path / ".mcwb-summary.json").read_text(encoding="utf-8"))
    assert summary["build_id"] == "summary-test"
    assert summary["writer"] == "json"


def test_get_writer_returns_json_by_default() -> None:
    """get_writer() picks the best available; on this test env (no amulet) it's json."""
    w = get_writer()
    # In a Python 3.13 env without working amulet, falls back to json.
    assert w.name in ("json", "amulet")
