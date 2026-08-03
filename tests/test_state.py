"""Tests for the world state store."""

from __future__ import annotations

import json
import tempfile
from pathlib import Path

import pytest

from mcwb.state import State, PhaseRecord, fresh_state, load, save, state_path


class _FakeMasterplan:
    def __init__(self, build_id="test-build", version="1.0"):
        self.build_id = build_id
        self.version = version
        self.spec_version = "0.1"
        self.edition = "java"
        self.brief = {
            "spec_version": "0.1",
            "edition": "java",
            "java_version": "1.21",
            "version": version,
        }


def test_state_path_is_inside_world_dir() -> None:
    assert state_path(Path("/tmp/world")).name == ".mcwb-state.json"


def test_load_returns_none_when_missing(tmp_path: Path) -> None:
    assert load(tmp_path) is None


def test_save_and_load_roundtrip(tmp_path: Path) -> None:
    state = State(
        build_id="b1",
        brief_version="2.0",
        spec_version="0.1",
        edition="java",
        java_version="1.21",
        applied_at=12345.0,
        phases={
            "1_prep": PhaseRecord(
                phase_number=1, spec_hash="abc123", blocks_written=50000, applied_at=12345.0
            ),
        },
    )
    save(tmp_path, state)
    loaded = load(tmp_path)
    assert loaded is not None
    assert loaded.build_id == "b1"
    assert loaded.brief_version == "2.0"
    assert "1_prep" in loaded.phases
    assert loaded.phases["1_prep"].blocks_written == 50000


def test_fresh_state_uses_masterplan_metadata() -> None:
    plan = _FakeMasterplan(build_id="x", version="3.0")
    state = fresh_state(plan)
    assert state.build_id == "x"
    assert state.brief_version == "3.0"
    assert state.phases == {}


def test_save_creates_world_dir_if_missing(tmp_path: Path) -> None:
    nested = tmp_path / "deep" / "nested" / "world"
    assert not nested.exists()
    state = State(
        build_id="b", brief_version="1.0", spec_version="0.1",
        edition="java", java_version="1.21", applied_at=0.0,
    )
    save(nested, state)
    assert nested.exists()
    assert load(nested) is not None
