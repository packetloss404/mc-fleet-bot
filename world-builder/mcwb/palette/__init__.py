"""Block palette library.

Maps human-readable block names to namespaced ``minecraft:`` IDs and
validates that all blocks referenced in a masterplan exist for the
target edition.

MVP loads a single Java 1.21 palette from ``mcwb/palette/java_1_21.json``.
The palette file is intentionally a flat list — the controlled vocabulary
that the LLM and the human author both pick from.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

_PALETTE_DIR = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Palette:
    edition: str
    java_version: str
    blocks: frozenset[str]

    def contains(self, block_id: str) -> bool:
        return block_id in self.blocks


def _load(edition: str, java_version: str) -> Palette:
    path = _PALETTE_DIR / f"{edition}_{java_version.replace('.', '_')}.json"
    if not path.exists():
        raise FileNotFoundError(
            f"no palette for {edition} {java_version} (looked for {path})"
        )
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    blocks = frozenset(data["blocks"])
    return Palette(
        edition=data["edition"],
        java_version=data["java_version"],
        blocks=blocks,
    )


# Module-level cache so we only hit disk once per process.
_cache: dict[tuple[str, str], Palette] = {}


def get(edition: str = "java", java_version: str = "1.21") -> Palette:
    key = (edition, java_version)
    if key not in _cache:
        _cache[key] = _load(edition, java_version)
    return _cache[key]
