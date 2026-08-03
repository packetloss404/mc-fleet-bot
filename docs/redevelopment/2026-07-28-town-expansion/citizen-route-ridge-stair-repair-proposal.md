# Citizen route ridge stair repair

Status: **PASS — offline proposal only; not executed**

## Finding

The production A* planner accepts the reverse edge
`[-83,71,2] -> [-83,72,1]` with parkour, digging, and placement disabled.
The live movement executor is the failing layer: repeated attempts log
`path_reset: stuck` and time out on the two consecutive full-block rises.
Even the sole historical pass took about 21 seconds and three stuck resets.

## Exact repair

Replace eight polished-andesite surface cells with north-facing bottom
polished-andesite stairs: x=-84,-83,-81,-80 at y71/z1 and y72/z0. This makes
two two-wide half-step walking lanes and preserves the yellow center stripe at
x=-82. No route waypoint or arrival tolerance changes.

Forward: `data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt`

Rollback: `data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback.txt`

Projected route QA: 22/22 routes and
44/44 directions PASS. This is projection
evidence only.

## Controlled verification

1. Freeze and snapshot; require SHA-256 `71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d`.
2. Run an entity-clearance gate over the exact eight-cell scope.
3. Run exact source preflight and strict-noop parser dry-run.
4. Execute all 8 guarded operations atomically with zero failures/no-ops.
5. Snapshot post-state and preflight the exact rollback.
6. Run `node scripts/run_citizen_route_live_walk.mjs --segment reverse:13 --bot Surveyor`
   three times. It stages at reverse index 11 and exercises checkpoints 12-14.
7. Final acceptance still requires
   `node scripts/run_citizen_route_live_walk.mjs --execute --bot Surveyor`;
   cached segment passes are never an end-to-end acceptance substitute.
