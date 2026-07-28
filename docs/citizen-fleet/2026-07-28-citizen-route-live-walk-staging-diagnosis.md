# Citizen route live-walk staging failure diagnosis

Status: **DIAGNOSED — PROPOSED REPAIR NOT APPLIED**

This report is read-only with respect to the Minecraft world, services, bot
processes, databases, and configuration. It preserves the evidence needed
before any live repair. No bot was started, moved, teleported, or instructed to
dig; no service was restarted; and no live block was read or changed during
this diagnosis.

## Finding

Surveyor is blocked by one low oak-leaf corner at the northbound road grade,
not by an unreachable goal, missing chunk, civic-boundary rejection, or the
accepted centerline itself.

The accepted offline survey is cardinal-only and has `parkour: false`. Its
exact path follows the paved center around the failure:

```text
(-82,67,-34) -> (-82,68,-33) -> (-82,68,-32) -> (-82,68,-31)
```

The production `mineflayer-pathfinder` model is different. With the installed
2.4.5 movement defaults, current fleet policy, `searchRadius=96`, no inventory
scaffolding, and the configured three-block civic corridor, a read-only replay
against immutable snapshot
`7a6ae13857d598457491b970c4ece8fa29f3afbdc4d47aad6f076c7a69264f48`
selects the outer grass shoulder:

```text
... -> (-79,67,-34) -> (-79,68,-33) -> (-80,68,-32) -> ...
```

The diagonal from `(-79,68,-33)` to `(-80,68,-32)` cuts past
`(-79,69,-32)`. That intermediate corner is
`minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false]` at the
avatar's head height. The destination cell itself is clear.

`Movements.getMoveDiagonal` prices the two possible orthogonal sides and keeps
only the cheaper one. Here the west-first side is clear, so the diagonal A*
node has no `toBreak` action even though the north-first corner contains the
leaf. Runtime control then faces the diagonal node and presses forward.
Collision simulation cannot reach it, the controller withholds forward
movement, and pathfinder emits `path_reset: stuck` after 3.5 seconds. This is
the repeated live failure.

The restart log retains the more precise persisted position
`(-78.6,68,-32.5)`. Its floored path node is `(-79,68,-33)`, exactly the
reproduced pre-diagonal node. The public audit rounds that position to
`(-79,68,-32)`.

## Evidence chain

| Evidence | SHA-256 | Relevant fact |
|---|---|---|
| `data/runtime-audits/citizen-route-live-walk-20260728T165823Z.json` | `8f808df6a3d577b1c636687686c76c0e080c4fc6fabfb0afd17b0f9e2c00aa5e` | Fresh-post route reached the later crown and failed in reverse; the route is not globally disconnected. |
| `data/runtime-audits/citizen-route-live-walk-20260728T171521Z.json` | `f32d9588c1010c02660d8339a4d75fffe039ec94c94aadf10827da63e215f18f` | Forward checkpoint 25 stopped at rounded `(-79,68,-32)` on both attempts. |
| `data/runtime-audits/citizen-route-live-walk-20260728T172625Z.json` | `312230535af3d571d76ac4738ea5a46d26782c93c2ba3c8e467f62f1bfa9eb60` | Fresh staging from the same position failed twice without moving. |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-livegate-20260728T1649Z.json` | `29722d87ff92a58487f00225cc3595827f6fa95cf32e3213e29396c5bade65f4` | Offline movement contract is cardinal-only, no-parkour, and proves the unobstructed x=-82 centerline. |
| `data/worldsnap-citizen-route-livegate-20260728T1649Z/region` | `7a6ae13857d598457491b970c4ece8fa29f3afbdc4d47aad6f076c7a69264f48` | Immutable physical source for the exact leaf and surrounding grade. |

Both failing audits preserve `digCountBefore=0`, `digCountAfter=0`,
`noDigObserved=true`, and empty security incident arrays. Backend log PID
`1342193` records the first stuck reset at 17:14:38, then the terminal position;
PID `1345487` records the same resets at 17:25:23, 17:25:32, 17:25:40, and
17:25:48. The latter process spawned Surveyor at the precise persisted
`(-78.6,68,-32.5)`.

## Bounded physical repair proposal

The proposed forward operation is exactly one source-guarded cell:

```text
REPL -79 69 -32 -79 69 -32 minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false] minecraft:air
```

Files:

- `data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.txt`
  — SHA-256
  `9bc207d89c7243eccf50dfb1e1251c06411c85e1e1641c682afcae53792eb64b`
- `data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.rollback.txt`
  — SHA-256
  `969fe369ca64d2bfcd9aeb9e92504ef6f6125039ee45e42fc07d778bb778700c`

The immutable-source preflight passed its only guard with zero failures:

- `data/world-review/citizen-route-live-walk-leaf-clearance-repair-preflight-20260728.json`
  — SHA-256
  `1854b70c1be9a01b533b9ef60a294b355ba26b190cfdffcc335e4c203278c352`

The strict-noop parser-only dry run expanded exactly one Paper-strict `/fill`
command with zero WorldEdit leftovers:

- `data/world-review/citizen-route-live-walk-leaf-clearance-repair-parser-dry-run-20260728.json`
  — SHA-256
  `71a7f26f88ac5e3552532d3da3af4e47d17b8918880dd34b103b3e8bdf285065`

Projecting that one change over the immutable snapshot changes the production
A* escape from:

```text
(-79,68,-33) -> (-80,68,-32)
```

to:

```text
(-79,68,-33) -> (-79,68,-32) -> (-80,68,-31)
```

The projected path reaches `GoalNear(-82,65,-19,1)` with no planned break or
placement. The operation does not touch the accepted exact path, road surface,
tree trunk, support block, or any block entity.

The network-free reproduction is
`scripts/diagnose_citizen_route_staging_failure.mjs`; its focused regression is
`test/scripts/citizenRouteStagingDiagnosis.test.ts`. The test passed all three
cases: exact source diagonal reproduction, in-memory one-cell projection, and
forward/rollback/preflight evidence integrity.

This is a proposal, not authorization to mutate the live world. Before a live
execution:

1. Keep the town and citizen schedules paused and freeze world updates.
2. Capture a new immutable live-source snapshot.
3. Require the exact source guard above to match in that new snapshot and
   preserve the preflight report.
4. Require a fresh live entity-clearance gate for the one-cell target and its
   player collision volume.
5. Review both the forward operation and exact inverse.
6. If authorized, execute only through
   `scripts/rcon_runner.py --strict-noop --report <json>`.
7. Capture a new immutable post snapshot, rerun the offline route survey, and
   run the complete forward and reverse no-dig live walk. A staging-only pass
   is not acceptance.

## Code-level correction option

The broader mismatch is that the offline acceptance model declares
cardinal-only movement with parkour disabled, while production movements retain
`mineflayer-pathfinder` defaults that allow diagonals, parkour, and sprinting.
Setting `movements.allowParkour = false` in
`applyPathfinderMovementSafety` makes the same snapshot replay choose the clear
x=-83 shoulder through this grade. It also removes the long-leg parkour nodes
that pulled the default plan to x=-79.

That change is fleet-wide, so it is not the first-choice bounded repair for
this incident. If selected, add a focused policy assertion and a snapshot-backed
production-movement regression for both route directions, then run the full
backend and citizen-fleet suites before rollout. Disabling parkour alone still
does not make Mineflayer cardinal-only; claiming exact conformance would require
a separate diagonal-move policy or a production-aware route verifier.

## Acceptance state

The citizen activation gate remains **FAIL**. The one-cell proposal has not
been applied, and neither an offline projection nor a staging retry substitutes
for a fresh bidirectional live walk against a matching post-repair snapshot.
