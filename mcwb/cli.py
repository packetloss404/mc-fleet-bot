"""mcwb CLI.

Subcommands for MVP:

  validate   Lint a masterplan directory against the spec schema.
  status     Show last applied state for a world (placeholder for v0.2).
  verify     Run QA checks against a built world (placeholder for v0.2).
  build      Apply a masterplan to a (stopped) world (placeholder for v0.2).

The plan and world paths come from (in order of precedence):
  1. CLI flags  --plan <path>  --world <path>
  2. .mcwb.toml in the current directory
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from mcwb import __version__
from mcwb.spec import MasterplanError, load_masterplan


def _resolve_plan_dir(args: argparse.Namespace, config: dict) -> Path:
    """Plan dir resolution: CLI > config > error."""
    raw = getattr(args, "plan", None) or config.get("plan_dir")
    if not raw:
        raise SystemExit(
            "no plan dir specified. pass --plan <path> or set plan_dir in .mcwb.toml"
        )
    path = Path(raw).expanduser().resolve()
    if not path.is_dir():
        raise SystemExit(f"plan dir does not exist: {path}")
    return path


def _resolve_world_dir(args: argparse.Namespace, config: dict) -> Path:
    """World dir resolution: CLI > config > error."""
    raw = getattr(args, "world", None) or config.get("world_dir")
    if not raw:
        raise SystemExit(
            "no world dir specified. pass --world <path> or set world_dir in .mcwb.toml"
        )
    return Path(raw).expanduser().resolve()


def _load_config(path: Path) -> dict:
    """Tiny .mcwb.toml loader. Avoids a toml dependency for MVP."""
    if not path.exists():
        return {}
    config: dict = {}
    in_section = None
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("[") and line.endswith("]"):
            in_section = line[1:-1].strip()
            config[in_section] = {}
            continue
        if "=" in line and in_section:
            key, _, value = line.partition("=")
            value = value.strip().strip('"').strip("'")
            config[in_section][key.strip()] = value
    return config


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
    plan_dir = _resolve_plan_dir(args, config)
    print(f"plan:   {plan_dir}")
    print("status: not yet implemented (lands in v0.2 with the state store)")
    return 0


def cmd_verify(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    _resolve_world_dir(args, config)
    print("verify: not yet implemented (lands in v0.2 with the QA runner)")
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    config = _load_config(Path.cwd() / ".mcwb.toml")
    plan_dir = _resolve_plan_dir(args, config)
    world_dir = _resolve_world_dir(args, config)
    print(f"plan:   {plan_dir}")
    print(f"world:  {world_dir}")
    print("build:  not yet implemented (lands in v0.2 with the amulet-core writer)")
    print("        for MVP this release only ships the schema + validator")
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
    p_status.add_argument("--plan", help="path to the masterplan directory")

    p_verify = sub.add_parser("verify", help="run QA checks against a built world")
    p_verify.add_argument("--world", help="path to the Minecraft world directory")

    p_build = sub.add_parser("build", help="apply a masterplan to a (stopped) world")
    p_build.add_argument("--plan", help="path to the masterplan directory")
    p_build.add_argument("--world", help="path to the Minecraft world directory")

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
