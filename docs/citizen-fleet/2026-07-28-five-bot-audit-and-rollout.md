# Five-Bot Citizen Fleet Audit and Improvement Release

Date: 2026-07-28 UTC  
Scope: Scott, Architect, Mason, Surveyor, Steward  
Town: Ravensreach (`town_mrzgshth_9d12c17d`)  

> **Superseding runtime note (13:12 UTC):** do not start the fleet from the
> activation described below. The Town Expansion package changes 262 of the
> 498 cells in this document's accepted walking trace when support and body
> clearance are included. The post-release route must be resurveyed, walked
> live in both directions, and atomically rebound to all five citizens first.
> Civic shifts are also now a version-2 outbound/inspection/return contract.
> See
> `docs/citizen-fleet/2026-07-28-five-bot-runtime-readiness-recheck.md`.

Release state: identity migration and the controlled corridor hold are
complete; the corrective source pass, offline QA, and hash-bound live
bidirectional walk are complete; the five-shift activation transaction passed.
The service restart and post-release day/night observation remain gated.

## Executive decision

All five citizens were online and healthy at the audit point, but the fleet was
not living as a coherent town. The principal constraints were not a lack of
bots: they were an identity mismatch, repetitive task production, a 50-block
circle that did not describe actual civic routes, generated-code API mismatch,
and an unsafe worker replacement race.

This release implements the five code changes needed to address those causes.
The first runtime-gate attempts then exposed four narrower integration gaps:
`blockAt()` did not preserve block-state inspection, paused operation did not
release stale claims, DungeonMaster could queue work that no resident was
eligible to claim, and shift activation did not bind a walk result to the
current route hashes. Those gaps are now fixed in source and covered by the
current offline checks. The bounded stuck-recovery helper is compiled, and the
production walk action completed the final controlled bidirectional audit.

It deliberately does not weaken protected-build mining rules, disable
impersonation detection, or authorize arbitrary movement. The live database,
blackboard, `config.yml`, and systemd services were inspected read-only during
the corrective QA pass. A later guarded transaction performed the shift
activation as one coordinated operation so no bot could load half-migrated
state.

## Initial audit snapshot

Read-only API and database checks during the audit found:

- Five configured bots; all had health `20` and food `20`.
- All five Voyager histories had reached the 100-completed / roughly
  49–50-failed display caps, indicating activity but also chronic retry churn.
- The persisted town resident is `Scout` while the connected bot is `Scott`.
  That prevents exact resident-role resolution, so Scott could claim work meant
  for other roles.
- Every configured leash was a radius-50 circle centered at `(-85,-370)`.
  The circle blocks legitimate patrol and commuting destinations but does not
  express a reviewed street or employee route.
- A moving read-only blackboard census observed 520 tasks: 484 blocked, 21
  completed, 9 pending, and 6 claimed. Six simultaneous claims with five bots
  is consistent with the Steward worker-overlap incident and stale task state.
- The live resident rows were Architect/builder, Mason/miner, Surveyor/guard,
  Steward/farmer, and Scout/lumberjack.
- The live security API retained two Steward duplicate-login records. Log
  chronology shows a watchdog replacement race, not evidence sufficient to
  disable or bypass the impersonation system.

The census is a point-in-time reading. The live board continued to change while
the audit ran; counts must be re-read immediately before the atomic migration.

## Current activation truth

The identity migration reconciled `Scout` to `Scott` while preserving the
resident ID and lumberjack role. The current town database therefore has five
exact alive residents: Architect/builder, Mason/miner, Scott/lumberjack,
Steward/farmer, and Surveyor/guard.

The fleet was placed into the controlled corridor-validation phase with
Voyager disabled and Ravensreach paused. After the accepted walk, the guarded
shift transaction installed the reviewed schedules, configured Voyager enabled,
and resumed Ravensreach. The transaction requires the systemd service to be
stopped and does not start it; at this documentation point the service is
inactive, so the new shifts have not yet begun their observation window.

The current offline route source of truth is:

- fresh accepted snapshot:
  `70eb7051d635d7558d3603e345e2b2d17d712607e92019363a12bbcc62267099`;
- exact 498-cell path:
  `c4e5924b91172a5c07c6b369cd196ce77c82df17bcc3abc08ff4e3adcd6c50b1`;
- 34 ordered three-dimensional checkpoints;
- 33/33 offline segments in each direction; and
- zero exact-path hazards, gravity supports, nearby block entities, building
  intersections, or mining-protection intersections.

The definitive audit,
`data/runtime-audits/citizen-route-live-walk-20260728T092815Z.json`, is
`PASS_BIDIRECTIONAL`. Surveyor passed 21 staging checkpoints, all 34 forward
checkpoints, and all 34 reverse checkpoints. The protected-dig count remained
zero and the security incident lists were empty before and after. Its snapshot
and path hashes exactly match the accepted survey.

The final route uses a west-shoulder stair around the West Lane terrain lip.
The production gate requested `GoalNear(range=1)` through a 45-second bounded
action, with at most two attempts per checkpoint. Every checkpoint in the
accepted run passed on attempt one, so the retry remained available but was
not used. All earlier failed walk artifacts are superseded by this later
hash-bound result.

## Per-bot findings

### Scott

Audit position: `(-83,60,-427)`; health/food `20/20`; empty inventory; 37
recorded deaths.

Scott was connected as an explorer but persisted as resident `Scout` with the
lumberjack role. Because role resolution was exact-name-only, Scott behaved as
unassigned and historically completed farmer, miner, builder, guard, and
lumberjack town tasks. He was also below normal civic elevation and repeatedly
selected long-distance iron exploration despite the leash.

Improvement: reconcile the unique `Scott`/`Scout` single-character identity
drift immediately in code, migrate the persisted name atomically, and dispatch
Scott only to lumberjack work, stockpile inspections, social routines, and
reviewed civic shifts.

### Architect

Audit position: `(-121,68,-376)`; health/food `20/20`; six inventory stacks; 15
recorded deaths.

Architect repeatedly received “build or repair” and “rest until morning” jobs
without a concrete authorized build cell, bed, or route. Critics then rejected
the no-op result, causing retries rather than civic activity.

Improvement: alternate authorized builder work with non-destructive façade,
road, stair, door, lighting, courtyard, and common-hall inspections. Physical
edits still require an explicit protected-zone-safe build contract.

### Mason

Audit position: `(-48,68,-374)`; health/food `20/20`; two inventory stacks; 28
recorded deaths.

Logs show repeated pathfinder dig attempts against protected cells around
`(-47,70,-370)`. Mason also repeatedly generated container code that expected
`inspectContainer()` to return an array even though the sandbox returned an
`ActionResult`.

Improvement: rotate failed mining families into a non-destructive mine-approach,
tool-store, and stockpile inspection. Keep all dig protections. Expose the
container collection contract advertised to generated code.

### Surveyor

Audit position: `(-64,82,-351)`; health/food `20/20`; empty inventory; four
recorded deaths.

Surveyor’s generic perimeter patrol generated targets at 56–71 blocks from the
common center, outside the radius-only leash. The bot therefore remained near
one point or accumulated critic/pathfinding failures.

Improvement: use named checkpoints and surveyed waypoint corridors, alternate
patrol with wayfinding/door/path inspection, and reject shortcuts outside the
approved corridor.

### Steward

Audit position: approximately `(-111,68,-341)`; health/food `20/20`; empty
inventory; 14 recorded deaths.

Steward’s crop skills called `bot.findBlocks`, but the generated-code sandbox
did not expose that Mineflayer method. At 06:53:31 UTC, the watchdog found a
95,413 ms stale heartbeat and initiated replacement. At 06:53:36, the new
worker started, then the old worker’s exit callback treated mutable
`this.worker`/`this.ipc` as its own, cleared the replacement, and scheduled an
additional restart. The overlapping login produced the duplicate-login signal.
Similar paired restart patterns were present earlier in the log.

Improvement: provide `findBlocks` and `blockAt` with old/new learned-skill
compatibility, bind all worker callbacks to a monotonic generation and captured
IPC instance, coalesce concurrent restarts, and give new generations a watchdog
startup grace. Genuine duplicate-login handling remains enabled.

## Five citizen-operation improvements

1. **Correct identity and role ownership.** Migrate `Scout` to `Scott` while
   preserving resident ID, join date, lumberjack role, and history. Use the
   narrow code fallback during deployment only; ambiguous names are rejected.
2. **Use a reviewed civic mobility network.** Retain each home circle, add
   named destination circles, and join them only with surveyed waypoint
   corridors. Movement outside these shapes stays blocked; out-of-bounds bots
   may only step closer to an approved area.
3. **Give citizens rotating daily lives.** Each role now alternates productive
   work with low-risk inspection, common-hall/social, reading, wayfinding, or
   return-home routines. Reviewed cross-city shifts may be appended through
   town config with exact waypoints and a non-destructive fallback.
4. **Stop impossible-job churn.** Only one active schedule task exists per
   town/phase/role. Exact failed families use exponential cooldown, and
   producers rotate to another useful routine instead of immediately recreating
   the same blocked row.
5. **Treat rollout as a measured shift.** After one coordinated restart, verify
   every bot’s role, movement, work and leisure completion, protected-dig
   count, board growth, and Steward security behavior over a full day/night
   cycle before enabling the cross-city commute.

## Five code improvements delivered

1. `ResidentIdentity` implements exact matching followed by a unique
   one-character-substitution fallback. `BotManager` now uses it consistently
   for role, rules, and town ID resolution.
2. `BlackboardManager` stores `failureCount` and `retryAfter`, applies bounded
   exponential task-family backoff, and lets schedule/demand producers detect
   active cooldowns. `ScheduleManager` emits one active role routine and rotates
   among two or more entries.
3. `CivicMobility` implements home, destination, polyline-corridor, and
   recovery-distance geometry. The same check is enforced by both
   `CodeExecutor.moveTo` and the raw BotInstance pathfinder choke point.
4. The generated-code sandbox now supplies `bot.findBlocks`, returns
   `inspectContainer` as an item array, and preserves block-state inspection on
   `bot.blockAt`. Both block-returning paths expose block-style (`name`,
   `position`, `getProperties`) and legacy position-style (`x/y/z`, `offset`)
   fields so existing learned crop and safety skills remain compatible.
5. `WorkerHandle` captures worker/IPC/generation in every callback, ignores
   stale-generation notifications and exits, awaits forced termination,
   cancels obsolete restart timers, and coalesces concurrent forced restarts.
   `BotManager` skips non-running and startup-grace generations in watchdog
   recovery.

## Corrective runtime-gate pass

The follow-up source pass closes the defects found during the controlled hold:

1. **Crop block-state parity.** `CodeExecutor.blockAt()` now returns
   `getProperties`, `x/y/z`, `offset`, and `distanceTo` in the same safe shape
   as `findBlocks`. The regression test verifies a wheat `age` property.
2. **Hash-bound shift activation.**
   `apply_citizen_cross_city_route.mjs --phase shifts` now rejects a walk audit
   unless both `offlineAcceptedSnapshotSha256` and `exactPathSha256` equal the
   current accepted survey.
3. **Paused stale-claim release.** Global maintenance now invokes
   `releaseStale()` every minute before schedule and terminal GC, so a disabled
   Voyager or paused town cannot pin an abandoned claim indefinitely.
4. **Eligible DungeonMaster queuing.** Events remain available as world flavor,
   but unscoped roaming tasks are not queued when every connected worker is an
   alive town resident. When non-resident workers exist, identical open event
   tasks are deduplicated.
5. **Migration cleanup coverage.** Corridor holding now recognizes canonical
   `town:<id>` descriptions even when old task keywords omit the exact town ID,
   and removes the legacy impossible `Mine the new iron_ingot deposit` family
   from the controlled activation board.
6. **Bounded stuck recovery.** On a `path_reset: stuck`, the shared movement
   helper stops the stale path, faces the same approved goal, applies a
   600-millisecond jump-forward nudge, clears both controls, and restores the
   exact `GoalNear`. Recoveries are rate-limited to one per two seconds and
   remain bounded by the original action timeout and civic step exclusion.

Items 1–6 are implemented source statements. The accepted live audit validates
the hash-bound route action as a whole, but it does not independently prove
that every corrective branch fired, and it is not a completed day/night
citizen observation.

## Remaining runtime rollout

The identity migration, corridor hold, and live commute gate have already been
recorded in timestamped runtime audits. The subsequent guarded shift
transaction also passed: five exact shifts are persisted, Voyager is configured
enabled, Ravensreach is resumed, and the audit is bound to the accepted walk.
Do not repeat either execute phase.

1. Start only `mc-fleet-bot.service` through systemd; do not hand-start a second
   Node process.
2. Verify exactly five unique sessions and the Scott/lumberjack plus four other
   exact role assignments.
3. Observe the configured shifts through a full day/night cycle.
4. Recheck task-family churn, protected actions, worker overlap, and security.
5. Keep the planned employee lounge labeled planning-only until it has its own
   guarded build, post snapshot, and interior route proof.

After the operator starts the service, steps 2–4 are implemented as one
fail-closed, read-only observation:

```bash
node scripts/audit_citizen_post_restart.mjs \
  --observe \
  --duration-minutes 45 \
  --minimum-minutes 20
```

The observer never mutates the API, service, databases, config, blackboard, or
world. It pins the accepted route and persisted five-shift activation before
sampling. It then requires one stable systemd PID, the five exact connected
citizens and exact roles, an advancing Ravensreach brain, both schedule phases,
two role-owned structured completions per citizen (the exact deterministic
civic shift plus local work/life), sampled progress on the reviewed corridor,
and zero protected-action, security, worker-replacement, or stuck-loop
evidence. It writes timestamped paired JSON/Markdown evidence to
`data/runtime-audits/`; any unmet condition is a `FAIL`, not an inconclusive
success.

## Post-release verification matrix

| Gate | Evidence required | Pass condition |
|---|---|---|
| Fleet uniqueness | `/api/bots`, process list, login log | Exactly five bot handles and one Minecraft session per name |
| Identity | town resident API/DB | `Scott` has lumberjack role; no `Scout` resident remains |
| Role dispatch | current task history | Each role claims only its own explicit role contract |
| Routine rotation | one day and one night window | Every bot completes productive and non-destructive/social work; no exact failed task is immediately reissued |
| Mobility | matched route trace | Home, named destinations, and waypoint corridor work; off-corridor shortcut is rejected |
| Build safety | protected-zone log counter | No protected dig/place action succeeds; repeated Mason dig-error storm stops |
| Sandbox parity | Steward crop task and Mason container task | No `findBlocks is not a function`; no `*.find is not a function` on inspection result |
| Backlog | two blackboard censuses 30 minutes apart | Terminal archive retained externally; active board does not grow through duplicate failure families |
| Worker lifecycle | worker generation logs | A forced restart creates one replacement; stale exit is logged `current:false` and cannot schedule another |
| Security | impersonation API and quarantine state | Self-replacement produces no new incident; a real confirmed duplicate still quarantines and alerts |
| Cross-city route | accepted hash-bound 34-checkpoint audit | `PASS_BIDIRECTIONAL`, staging/forward/reverse PASS, zero dig delta, zero incidents |
| Cross-city shift | activated shift task and return result | Bot reaches the reviewed employee destination, performs non-destructive work, and returns along the same approved network |

## QA evidence

Completed offline:

- `npm run build` — PASS.
- Current focused citizen/route suite — 9 files, 44 tests, PASS. This includes
  four route-survey tests, two bounded stuck-recovery tests, and the new
  `blockAt().getProperties()` regression.
- All town and Voyager tests — 35 files, 242 tests, PASS.
- Full backend suite — 94 files / 665 tests passed; two failures in the
  unrelated in-progress Raven Rock T2b Wave 2 generator suite
  (`generateRavenRockT2bWave2.test.ts`) because that package currently exports
  16 database features while its test requires at least 40. No citizen-fleet
  test failed.
- Real `config.yml` schema validation remains PASS.
- No live DB/config write, systemd restart, command queue, or Minecraft block
  mutation was initiated by this documentation/corrective QA pass.

Focused command:

```bash
npx vitest run \
  test/control/CivicMobility.test.ts \
  test/town/ResidentIdentity.test.ts \
  test/voyager/CitizenSandboxApis.test.ts \
  test/voyager/BlackboardManager.roleDispatch.test.ts \
  test/worker/WorkerGeneration.test.ts \
  test/bot/PathfinderMovementPolicy.test.ts \
  test/actions/moveHelper.test.ts \
  test/scripts/surveyCitizenCrossCityRoute.test.ts \
  test/scripts/auditCitizenPostRestart.test.ts \
  test/config.schema.test.ts
```

## Release acceptance

Source status: **PASS**  
Offline regression status: **PASS**  
Identity migration status: **PASS**  
Controlled corridor hold status: **PASS / RELEASED BY GUARDED SHIFT
TRANSACTION**  
Cross-city route status: **PASS OFFLINE ON FRESH 34-POINT SURVEY AND
PASS_BIDIRECTIONAL LIVE**  
Autonomous shift status: **CONFIGURED AND TOWN RESUMED; SYSTEMD SERVICE START
AND DAY/NIGHT OBSERVATION PENDING**

The route and persisted shift gates are complete. The citizens should not be
declared fully fixed until the service starts and the post-release day/night
matrix passes.
