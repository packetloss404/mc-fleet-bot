"""Spec version migrations.

A migration is a function that takes a brief dict (matching the *old*
spec version) and returns a brief dict matching the *next* spec version.
The loader runs the chain from the brief's ``spec_version`` up to the
current ``__spec_version__``.

For MVP there are no migrations yet. This module exists so the seam is
in place before we need it.
"""

from __future__ import annotations

from typing import Any, Callable

Migration = Callable[[dict[str, Any]], dict[str, Any]]

# Ordered newest-to-oldest. To migrate from 0.0 to 0.1 we'd add:
#   ("0.1", lambda b: {**b, "spec_version": "0.1", "edition": b.get("edition", "java")})
_MIGRATIONS: list[tuple[str, Migration]] = []


def migrate(brief: dict[str, Any], target_version: str) -> dict[str, Any]:
    """Run migrations until ``brief['spec_version'] == target_version``."""
    current = brief.get("spec_version", "0.0")
    if current == target_version:
        return brief
    for version, fn in _MIGRATIONS:
        if current == version:
            brief = fn(brief)
            current = version
            if current == target_version:
                return brief
    raise ValueError(
        f"no migration path from spec_version {current!r} to {target_version!r}"
    )
