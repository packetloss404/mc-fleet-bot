"""Phase runner.

Orchestrates a build: read the masterplan, compute the diff, apply
dirty phases through the writer, update the state, write per-centerpiece
artifacts.

This is the entry point for ``mcwb build``.
"""

from __future__ import annotations

import time
from pathlib import Path
from typing import Any

from mcwb.build.diff import compute_diff
from mcwb.build.litematic_writer import LitematicWriter
from mcwb.build.phase_generator import generate_phase_blocks, phase_slug
from mcwb.build.writer import (
    BlockChange,
    JsonWorldWriter,
    PhaseResult,
    WorldWriter,
    get_writer,
)
from mcwb.state import PhaseRecord, State, load as load_state, save as save_state


def run_build(
    masterplan: Any,
    world_dir: Path,
    writer: WorldWriter | None = None,
    emit_litematic: bool = True,
) -> tuple[State, list[PhaseResult]]:
    """Apply dirty phases of ``masterplan`` to ``world_dir``.

    Returns ``(new_state, phase_results)``. The state is also written
    to disk. The world dir is left in a state where it can be loaded
    by Minecraft (or, for the JSON writer, read by the verifier).
    """
    world_dir = world_dir.resolve()
    world_dir.mkdir(parents=True, exist_ok=True)

    # Pick the writer. Default: best available (amulet if importable, else json).
    if writer is None:
        writer = get_writer()

    brief = masterplan.brief
    old_state = load_state(world_dir)
    diff = compute_diff(masterplan, old_state)

    writer.open(world_dir, brief)
    litematic = LitematicWriter() if emit_litematic else None
    if litematic is not None:
        litematic.open(world_dir, brief)

    # Start from the old state (if any) so unchanged phases stay recorded.
    new_state = State(
        build_id=masterplan.build_id,
        brief_version=masterplan.version,
        spec_version=masterplan.spec_version,
        edition=masterplan.edition,
        java_version=brief.get("java_version", "1.21"),
        applied_at=time.time(),
        phases={k: v for k, v in (old_state.phases.items() if old_state else [])},
    )

    results: list[PhaseResult] = []
    for d in diff:
        if not d.is_dirty:
            results.append(PhaseResult(
                phase_number=d.phase_number,
                phase_name=d.phase_name,
                blocks_written=0,
                writer=writer.name,
            ))
            continue

        # Find the phase dict from the masterplan.
        phase = next(
            (p for p in brief["phases"] if p.get("phase") == d.phase_number),
            None,
        )
        if phase is None:
            results.append(PhaseResult(
                phase_number=d.phase_number,
                phase_name=d.phase_name,
                blocks_written=0,
                writer=writer.name,
            ))
            continue

        changes = generate_phase_blocks(phase, brief)
        n = writer.write_blocks(changes)
        slug = phase_slug(phase)
        new_state.phases[slug] = PhaseRecord(
            phase_number=d.phase_number,
            spec_hash=d.spec_hash,
            blocks_written=n,
            applied_at=time.time(),
        )
        results.append(PhaseResult(
            phase_number=d.phase_number,
            phase_name=d.phase_name,
            blocks_written=n,
            writer=writer.name,
        ))

    # Centerpiece litematic outputs.
    if litematic is not None:
        for i, cp in enumerate(brief.get("centerpieces", [])):
            pos = cp.get("position", {})
            if not pos:
                continue
            cp_name = cp.get("name") or f"centerpiece_{i+1}"
            # Try to extract a primary block from the block_spec text
            # (best effort — fall back to a marker block).
            block_id = "minecraft:redstone_lamp"
            spec_text = (cp.get("block_spec") or "").lower()
            for candidate in (
                "minecraft:iron_door",
                "minecraft:polished_diorite",
                "minecraft:smooth_stone",
                "minecraft:oak_planks",
                "minecraft:stone_bricks",
            ):
                if candidate.split(":", 1)[1] in spec_text:
                    block_id = candidate
                    break
            cp_x, cp_y, cp_z = (
                int(pos.get("x", 0)),
                int(pos.get("y", 0)),
                int(pos.get("z", 0)),
            )
            litematic.write_centerpiece(
                name=cp_name,
                position=(cp_x, cp_y, cp_z),
                size=(0, 0, 0),  # use the default in the litematic writer
                block_id=block_id,
            )
            # Also write a marker block at the centerpieces position in the
            # world itself so the verifier can find it. Uses a redstone lamp
            # so it's a clear "this is a centerpieces" signal at a glance.
            marker_count = writer.write_blocks(iter([
                BlockChange(x=cp_x, y=cp_y, z=cp_z, block_id="minecraft:redstone_lamp"),
            ]))
            results.append(PhaseResult(
                phase_number=99,  # pseudo-phase for centerpieces markers
                phase_name=f"centerpiece marker: {cp_name}",
                blocks_written=marker_count,
                writer=writer.name,
            ))

    writer.close()
    if litematic is not None:
        litematic.close()

    save_state(world_dir, new_state)
    return new_state, results
