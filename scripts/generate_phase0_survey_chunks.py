#!/usr/bin/env python3
"""Finish bounded Phase 0 chunk generation without disturbing existing tickets.

This helper adds one temporary force-load tile at a time, waits until all four
tile corners report loaded, and removes that exact tile in a ``finally`` block.
It never uses ``forceload remove all`` because the live world has pre-existing
force-load tickets that belong to other systems.
"""

from __future__ import annotations

import argparse
import math
import re
import sys
import time

import mc_admin


MIN_CHUNK_X = math.floor(1200 / 16)
MAX_CHUNK_X = math.floor(3200 / 16)
MIN_CHUNK_Z = math.floor(-1200 / 16)
MAX_CHUNK_Z = math.floor(600 / 16)
TILE_CHUNKS = 12


def tile_ranges() -> list[tuple[int, int, int, int]]:
    tiles: list[tuple[int, int, int, int]] = []
    for chunk_z in range(MIN_CHUNK_Z, MAX_CHUNK_Z + 1, TILE_CHUNKS):
        end_z = min(chunk_z + TILE_CHUNKS - 1, MAX_CHUNK_Z)
        for chunk_x in range(MIN_CHUNK_X, MAX_CHUNK_X + 1, TILE_CHUNKS):
            end_x = min(chunk_x + TILE_CHUNKS - 1, MAX_CHUNK_X)
            tiles.append((chunk_x, chunk_z, end_x, end_z))
    return tiles


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument('--start', type=int, default=0, help='zero-based tile index')
    parser.add_argument('--count', type=int, default=1)
    parser.add_argument('--timeout', type=float, default=60.0)
    return parser.parse_args()


def block_coordinate(chunk: int) -> int:
    return chunk * 16


def force_load_count(reply: str) -> int:
    match = re.search(r'(\d+) force loaded chunks?', reply)
    if not match:
        raise RuntimeError(f'could not parse force-load query: {reply}')
    return int(match.group(1))


def main() -> int:
    args = parse_args()
    tiles = tile_ranges()
    if args.start < 0 or args.count < 1 or args.start + args.count > len(tiles):
        raise SystemExit(
            f'invalid tile slice start={args.start} count={args.count}; '
            f'valid total is {len(tiles)}',
        )

    client = mc_admin.connect()
    try:
        rcon = mc_admin.Rcon(client)
        initial_count = force_load_count(rcon.cmd('forceload query'))
        if initial_count != 104:
            raise RuntimeError(
                f'expected the preserved 104-ticket baseline, found {initial_count}',
            )
        print(f'initial force-load count: {initial_count}', flush=True)
        for index in range(args.start, args.start + args.count):
            cx1, cz1, cx2, cz2 = tiles[index]
            x1, z1 = block_coordinate(cx1), block_coordinate(cz1)
            x2, z2 = block_coordinate(cx2), block_coordinate(cz2)
            added = False
            started = time.monotonic()
            try:
                reply = rcon.cmd(f'forceload add {x1} {z1} {x2} {z2}')
                added = True
                deadline = started + args.timeout
                check = (
                    f'execute if loaded {x1} 0 {z1} '
                    f'if loaded {x2} 0 {z1} '
                    f'if loaded {x1} 0 {z2} '
                    f'if loaded {x2} 0 {z2} run time query gametime'
                )
                while time.monotonic() < deadline:
                    if rcon.cmd(check):
                        break
                    time.sleep(0.5)
                else:
                    raise RuntimeError(f'tile {index} did not load within {args.timeout}s')
                elapsed = time.monotonic() - started
                print(
                    f'tile {index + 1}/{len(tiles)} chunks '
                    f'[{cx1},{cz1}]..[{cx2},{cz2}] loaded in {elapsed:.2f}s; '
                    f'{reply or "marked"}',
                    flush=True,
                )
            finally:
                if added:
                    removed = rcon.cmd(f'forceload remove {x1} {z1} {x2} {z2}')
                    print(f'tile {index + 1} cleanup: {removed or "unmarked"}', flush=True)
        final_count = force_load_count(rcon.cmd('forceload query'))
        if final_count != initial_count:
            raise RuntimeError(
                f'force-load baseline drifted from {initial_count} to {final_count}',
            )
        print(f'final force-load count: {final_count}', flush=True)
    finally:
        client.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
