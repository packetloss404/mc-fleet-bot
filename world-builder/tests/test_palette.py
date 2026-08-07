"""Tests for the block palette.

The palette is the controlled vocabulary: every ``minecraft:`` block
referenced in a masterplan must be in the palette for the target edition.
The real-world test asserts the 04-combined-complex brief's palette
references are all covered.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import pytest

from mcwb.palette import get as get_palette


# Match minecraft:foo_bar_baz style ids. Filters out non-block keys like
# "minecraft" (the namespace) and any property values that aren't block ids.
BLOCK_ID = re.compile(r"^minecraft:[a-z0-9_]+$")


def _collect_block_ids_from_brief(brief_path: Path) -> set[str]:
    """Walk the brief JSON and collect every string that looks like a minecraft: id."""
    import json

    with brief_path.open("r", encoding="utf-8") as f:
        data = json.load(f)

    found: set[str] = set()
    def walk(node):
        if isinstance(node, dict):
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)
        elif isinstance(node, str):
            if BLOCK_ID.match(node):
                found.add(node)
    walk(data)
    return found


def test_palette_loaded() -> None:
    """Smoke test: java 1.21 palette loads and is non-trivial."""
    palette = get_palette("java", "1.21")
    assert palette.edition == "java"
    assert palette.java_version == "1.21"
    assert len(palette.blocks) >= 50, "starter palette should have at least 50 blocks"


def test_palette_only_contains_minecraft_ids() -> None:
    """Every id in the palette must be minecraft:foo_bar style."""
    palette = get_palette("java", "1.21")
    for block_id in palette.blocks:
        assert BLOCK_ID.match(block_id), f"non-minecraft id in palette: {block_id!r}"


def test_real_brief_blocks_are_in_palette() -> None:
    """Every minecraft: id referenced in the 04-combined-complex brief must be in the palette.

    If this test fails, the palette needs to be extended — don't change
    the brief to match a too-small palette.
    """
    source = Path(
        os.environ.get(
            "MCWB_FIXTURE_PLAN_DIR",
            r"D:\projects\mc-fleet-bot\masterplans\04-combined-complex",
        )
    )
    brief_path = source / "04-contractor" / "contractor-brief.json"
    if not brief_path.exists():
        pytest.skip(f"brief not found at {brief_path}")

    palette = get_palette("java", "1.21")
    referenced = _collect_block_ids_from_brief(brief_path)
    missing = referenced - palette.blocks

    assert not missing, (
        f"{len(missing)} block id(s) referenced in the brief are not in the "
        f"palette. Add these to mcwb/palette/java_1_21.json:\n  - "
        + "\n  - ".join(sorted(missing))
    )
