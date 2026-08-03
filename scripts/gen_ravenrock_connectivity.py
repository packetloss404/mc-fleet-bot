#!/usr/bin/env python3
"""Generate the final Raven Rock N9 top-egress repair.

The original shaft ladder ended at y63 below an open y64 cell, so a player could
descend from the head-house but could not climb back onto its y64 apron. The
head-house railing also had no opening on the ladder side. This two-block final
state extends the east-wall ladder through y64 and opens one railing cell onto the
apron. The long N9 -> S1 -> Cavern A -> T3 -> N5 route is checked bidirectionally
by builds/manifest.yaml.
"""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'buildops' / 'fix18_ravenrock_access.txt'


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        'SET 204 64 -15 204 64 -15 ladder[facing=west]\n'
        'SET 205 65 -15 205 65 -15 air\n',
        encoding='utf-8',
    )
    print(f'{OUT.name}: 2 ops -> {OUT}')


if __name__ == '__main__':
    main()
