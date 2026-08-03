"""Tests for the mcwb CLI.

Exercises the ``mcwb validate`` subcommand through the actual entry
point, asserting exit codes and output shape.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest


def _run_mcwb(*args: str, env: dict | None = None) -> subprocess.CompletedProcess:
    """Run the mcwb CLI as a subprocess so we exercise the real entry point."""
    full_env = os.environ.copy()
    if env:
        full_env.update(env)
    return subprocess.run(
        [sys.executable, "-m", "mcwb", *args],
        capture_output=True,
        text=True,
        env=full_env,
    )


def test_cli_version() -> None:
    """mcwb --version prints the version and exits 0."""
    result = _run_mcwb("--version")
    assert result.returncode == 0
    assert "mcwb 0.0.1" in result.stdout


def test_cli_help() -> None:
    """mcwb --help lists the four subcommands."""
    result = _run_mcwb("--help")
    assert result.returncode == 0
    for cmd in ("validate", "status", "verify", "build"):
        assert cmd in result.stdout


def test_cli_validate_real_brief_succeeds() -> None:
    """mcwb validate against the real 04-combined-complex brief exits 0."""
    source = Path(
        os.environ.get(
            "MCWB_FIXTURE_PLAN_DIR",
            r"D:\projects\mc-fleet-bot\masterplans\04-combined-complex",
        )
    )
    if not source.exists():
        pytest.skip(f"masterplan not found at {source}")
    result = _run_mcwb("validate", "--plan", str(source))
    assert result.returncode == 0, f"validate failed:\nstdout: {result.stdout}\nstderr: {result.stderr}"
    assert "build_id" in result.stdout
    assert "04-combined-complex" in result.stdout


def test_cli_validate_missing_plan_fails() -> None:
    """mcwb validate with no --plan and no config exits non-zero."""
    # Run from a temp dir so .mcwb.toml isn't picked up.
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        result = _run_mcwb("validate", cwd=tmp) if False else subprocess.run(
            [sys.executable, "-m", "mcwb", "validate"],
            capture_output=True,
            text=True,
            cwd=tmp,
        )
        assert result.returncode != 0
        assert "no plan dir specified" in result.stderr


def test_cli_validate_missing_dir_fails() -> None:
    """mcwb validate with a non-existent plan dir exits non-zero."""
    result = _run_mcwb("validate", "--plan", r"D:\does\not\exist\anywhere")
    assert result.returncode != 0
