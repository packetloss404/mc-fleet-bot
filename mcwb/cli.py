"""mcwb CLI.

Subcommands:

  validate   Lint a masterplan directory against the spec schema.
  status     Show last applied state for a world.
  verify     Run QA checks against a built world.
  build      Apply a masterplan to a (stopped) world.

The plan and world paths come from (in order of precedence):
  1. CLI flags  --plan <path>  --world <path>
  2. .mcwb.toml in the current directory
  3. Environment: MCWB_PLAN_DIR, MCWB_WORLD_DIR

Optional config keys (in .mcwb.toml [build] section):
  writer            "json" or "amulet" (default: auto-detect)
  pre_build_cmd     shell command to run before build (e.g. "systemctl stop minecraft")
  post_build_cmd    shell command to run after build (e.g. "systemctl start minecraft")
  java_version      Java edition version (default: 1.21)
  emit_litematic    true/false (default: true)
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tomllib
from pathlib import Path

from mcwb import __version__
from mcwb.build import get_writer, run_build
from mcwb.spec import MasterplanError, load_masterplan
from mcwb.state import load as load_state
from mcwb.verify import run_verification


def _resolve_plan_dir(args: argparse.Namespace, config: dict) -> Path:
    """Plan dir resolution: CLI > config > env > error."""
    raw = (
        getattr(args, "plan", None)
        or config.get("plan_dir")
        or os.environ.get("MCWB_PLAN_DIR")
    )
    if not raw:
        raise SystemExit(
            "no plan dir specified. pass --plan <path>, set plan_dir in "
            ".mcwb.toml, or set MCWB_PLAN_DIR."
        )
    path = Path(raw).expanduser().resolve()
    if not path.is_dir():
        raise SystemExit(f"plan dir does not exist: {path}")
    return path


def _resolve_world_dir(args: argparse.Namespace, config: dict) -> Path:
    """World dir resolution: CLI > config > env > error."""
    raw = (
        getattr(args, "world", None)
        or config.get("world_dir")
        or os.environ.get("MCWB_WORLD_DIR")
    )
    if not raw:
        raise SystemExit(
            "no world dir specified. pass --world <path>, set world_dir in "
            ".mcwb.toml, or set MCWB_WORLD_DIR."
        )
    return Path(raw).expanduser().resolve()


def _load_config(path: Path) -> dict:
    """Load .mcwb.toml. Uses stdlib tomllib (Python 3.11+)."""
    if not path.exists():
        return {}
    try:
        with path.open("rb") as f:
            return tomllib.load(f)
    except tomllib.TOMLDecodeError as e:
        raise SystemExit(f"invalid TOML in {path}: {e}") from e


def _run_shell(cmd: str) -> None:
    """Run a shell command. Exit non-zero if it fails."""
    print(f"$ {cmd}")
    result = subprocess.run(cmd, shell=True)
    if result.returncode != 0:
        raise SystemExit(f"command failed (exit {result.returncode}): {cmd}")


def cmd_validate(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    plan_dir = _resolve_plan_dir(args, config)
    try:
        plan = load_masterplan(plan_dir)
    except MasterplanError as e:
        print(f"FAIL  {plan_dir}", file=sys.stderr)
        print(str(e), file=sys.stderr)
        return 1

    print(f"OK    {plan_dir}")
    print(f"      build_id         = {plan.build_id}")
    print(f"      version          = {plan.version}")
    print(f"      spec_version     = {plan.spec_version}")
    print(f"      edition          = {plan.edition} {plan.brief.get('java_version', '?')}")
    print(f"      phases           = {len(plan.phases)} (budget: {plan.block_budget_total:,} blocks)")
    print(f"      centerpieces     = {len(plan.brief.get('centerpieces', []))}")
    print(f"      easter_eggs      = {len(plan.brief.get('easter_eggs', []))}")
    print(f"      key_locations    = {len(plan.brief.get('key_locations', {}))}")

    for warning in plan.validation.warnings:
        print(f"WARN  {warning}")

    return 0


def cmd_status(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    world_dir = _resolve_world_dir(args, config)
    state = load_state(world_dir)
    if state is None:
        print(f"no state at {world_dir}/.mcwb-state.json — world has never been built")
        return 0
    print(f"world:  {world_dir}")
    print(f"build:  {state.build_id}")
    print(f"version: {state.brief_version}")
    print(f"spec:    {state.spec_version}")
    print(f"edition: {state.edition} {state.java_version}")
    print(f"applied: {state.applied_at}")
    print(f"phases:  {len(state.phases)}")
    for slug, rec in state.phases.items():
        print(
            f"  - phase {rec.phase_number:>2}  {slug:<60}  "
            f"{rec.blocks_written:>10,} blocks  (hash {rec.spec_hash})"
        )
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    plan_dir = _resolve_plan_dir(args, config)
    world_dir = _resolve_world_dir(args, config)
    plan = load_masterplan(plan_dir)
    report = run_verification(world_dir, plan)
    print(f"verify: {world_dir}")
    print(f"        build_id = {report.build_id}")
    for check in report.checks:
        marker = "ok   " if check.passed else "FAIL "
        if check.deferred:
            marker = "skip "
        detail = check.detail
        if len(detail) > 80:
            detail = detail[:77] + "..."
        print(f"  {marker} {check.name:<40}  {detail}")
    print(
        f"\n{report.passed_count}/{report.total} passed "
        f"({sum(1 for c in report.checks if c.deferred)} deferred)"
    )
    return 0 if report.passed else 1


def cmd_build(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    plan_dir = _resolve_plan_dir(args, config)
    world_dir = _resolve_world_dir(args, config)
    build_cfg = config.get("build", {}) if isinstance(config.get("build"), dict) else {}
    writer_name = getattr(args, "writer", None) or build_cfg.get("writer")
    emit_litematic = bool(build_cfg.get("emit_litematic", True))
    pre_cmd = build_cfg.get("pre_build_cmd")
    post_cmd = build_cfg.get("post_build_cmd")

    plan = load_masterplan(plan_dir)
    writer = get_writer(writer_name) if writer_name else get_writer()

    print(f"plan:   {plan_dir}")
    print(f"world:  {world_dir}")
    print(f"writer: {writer.name}")
    print(f"build:  {plan.build_id} v{plan.version} ({len(plan.phases)} phases)")
    if pre_cmd:
        _run_shell(pre_cmd)
    try:
        new_state, results = run_build(
            plan, world_dir, writer=writer, emit_litematic=emit_litematic
        )
    finally:
        if post_cmd:
            _run_shell(post_cmd)

    for r in results:
        marker = "ok  " if r.blocks_written > 0 else "skip"
        print(
            f"  {marker} phase {r.phase_number:>2}  {r.phase_name:<40}  "
            f"{r.blocks_written:>10,} blocks"
        )
    dirty_count = sum(1 for r in results if r.blocks_written > 0)
    total_blocks = sum(r.blocks_written for r in results)
    print(
        f"\n{dirty_count}/{len(results)} phases applied, "
        f"{total_blocks:,} blocks written"
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="mcwb",
        description="Minecraft world builder from versioned masterplans",
    )
    p.add_argument("--version", action="version", version=f"mcwb {__version__}")
    sub = p.add_subparsers(dest="command", required=True)

    p_validate = sub.add_parser("validate", help="lint a masterplan against the spec schema")
    p_validate.add_argument("--plan", help="path to the masterplan directory")

    p_status = sub.add_parser("status", help="show last applied state for a world")
    p_status.add_argument("--plan", help="path to the masterplan directory (unused for status but accepted for symmetry)")
    p_status.add_argument("--world", help="path to the Minecraft world directory")

    p_verify = sub.add_parser("verify", help="run QA checks against a built world")
    p_verify.add_argument("--plan", help="path to the masterplan directory")
    p_verify.add_argument("--world", help="path to the Minecraft world directory")

    p_build = sub.add_parser("build", help="apply a masterplan to a (stopped) world")
    p_build.add_argument("--plan", help="path to the masterplan directory")
    p_build.add_argument("--world", help="path to the Minecraft world directory")
    p_build.add_argument(
        "--writer",
        choices=["json", "amulet"],
        help="force a specific writer (default: auto-detect, prefers amulet)",
    )

    return p


_HANDLERS = {
    "validate": cmd_validate,
    "status": cmd_status,
    "verify": cmd_verify,
    "build": cmd_build,
}


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return _HANDLERS[args.command](args)


if __name__ == "__main__":
    raise SystemExit(main())
