# Citizen Fleet Post-Restart Observer Root-Cause Handoff

Date: 2026-07-28  
Status: **FOLLOW-UP REQUIRED — DO NOT DEPLOY OR RESTART FROM THIS DOCUMENT**

## Executive result

The 20-minute post-restart observation failed after 121 samples over
1,200.001 seconds. The single systemd process, five identities, exact role
ownership, connectivity, health, TownBrain activity, day/night coverage, and
security gates all passed. Citizen behavior did not:

- Architect, Mason, Scott, and Steward completed no structured routines.
- Surveyor completed one local work routine.
- No local `life` routine completed.
- No citizen completed the reviewed cross-city round trip or produced
  destination-and-home evidence.
- Architect, Mason, and Surveyor spent roughly three minutes stationary on
  civic work; generic mining, crafting, shelter, and shortage failures
  repeated for the rest of the fleet.

Primary evidence:

- [`data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.json`](../../data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.json)
- [`data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.md`](../../data/runtime-audits/citizen-post-restart-observation-20260728T192509Z.md)
- [`data/runtime-audits/citizen-route-live-walk-20260728T185936Z.json`](../../data/runtime-audits/citizen-route-live-walk-20260728T185936Z.json)
- [`data/runtime-audits/citizen-route-shifts-20260728T185952Z.json`](../../data/runtime-audits/citizen-route-shifts-20260728T185952Z.json)
- [`data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json`](../../data/world-review/citizen-ravensreach-mainstreet-route-survey-terminal-20260728T1839Z.json)
- `/var/log/mc-fleet-bot.log`, especially the repeated
  `Approved civic shift outbound waypoint unreachable: -111,69,-332` events
  around lines 3,236,053–3,237,783 and 3,264,452–3,264,527.

The accepted common corridor remains valid and must not be relaxed:

- Immutable snapshot:
  `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`
- Exact 49-waypoint path:
  `9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701`
- Origin: `(-111,69,-332)`
- Contract: exact route, width 3, no digging, no placement, no tower,
  no parkour, no free roaming, and exact role ownership.

## Root causes

### 1. A cancelled path can poison the next movement goal

Both `CodeExecutor.moveTo` and `moveNearWithCleanup` call
`mineflayer-pathfinder.stop()` during timeout/no-path cleanup. In the installed
pathfinder, `stop()` sets a deferred `stopPathing` flag. The next `setGoal()`
can consume that flag by clearing the newly assigned goal and immediately
emitting `path_stop`.

The runtime trace matches this failure mode: each civic movement starts with an
immediate `path_stop`, waits for its 45-second timeout, then arms the same
condition for the next attempt. Fix cancellation centrally in project source;
do not patch `node_modules`.

### 2. The reviewed corridor starts after the cottages

Version 2 civic code immediately moves from the citizen's current location to
the common corridor origin. It has no reviewed cottage/home-to-origin leg.
Observed starts were:

| Citizen | Observed position |
|---|---:|
| Architect | `(-121,68,-376)` |
| Mason | `(-49,68,-377)` |
| Scott | `(-83,59,-426)` |
| Steward | `(-112,68,-346)` |
| Surveyor | `(-111,68,-350)` |

Offline no-dig/no-place/no-parkour inspection against the accepted snapshot
found that the stored entity positions are embedded in or isolated by cottage
geometry for multiple citizens. The 49-waypoint contract proves only common
origin to MainStreet and back; it never proved five cottage egresses.

Nearest connected cells found during diagnosis are only **staging candidates**,
not accepted approach contracts:

| Citizen | Candidate safe staging cell |
|---|---:|
| Architect | `(-120,68,-377)` |
| Mason | `(-49,68,-381)` |
| Scott | `(-83,67,-428)` |
| Steward | `(-112,68,-351)` |
| Surveyor | `(-111,68,-351)` |

Do not hardcode these candidates. Generate, independently review, hash, and
live-walk each full staging-to-origin connector first. Because several current
entity cells are not traversable, activation may require one controlled,
audited relocation to the accepted connector's first cell or a separately
guarded physical cottage-egress repair.

### 3. Low-priority shifts lose to demand and generic work

The compiled version 2 shift is low priority and is followed by generic
semantic schedules. Town demand is normal priority and runs before schedule
work. Mason therefore repeats shortage work; Scott remains in wood/crafting
chains; Steward repeats shelter or food work. Scott and Steward never claim a
civic shift during the observer.

### 4. Autonomous recovery loses provenance

Failed blackboard work and generated prerequisites are inserted into
`playerTaskQueue` without preserving source, town, role, or deterministic
metadata. Later cycles report autonomous recovery as `player-request`, bypass
normal resident selection/cooldown, and repeat generic tasks.

### 5. Generic local schedules are prose, not executable contracts

References to an approved hall, courtyard, mine route, or cottage path do not
contain coordinates or an immutable path identity. Semantic generation then
invents arbitrary targets, protected edits, disabled exploration, invalid API
calls, or no-op successes. A successful work/life acceptance gate needs
deterministic local routines on separately reviewed paths.

### 6. Failure accounting is incomplete

Several retry/replacement exits occur before the centralized failure outcome,
blocker memory, and blackboard finalizer. Reaping a blocked shortage row can
also erase the family failure lineage that should lengthen its backoff.

### 7. The observer misses real failures and conflates route legs

The observer's civic-failure expression does not match the actual
`Approved civic shift outbound waypoint unreachable` wording. Deterministic
selection evidence is currently derived only from a completed timeline, and
`returnObserved` means return to the common route origin rather than return to
the citizen's personal staging/home point.

## Rejected partial approach

A source-only experiment added version 3 task metadata with a reviewed
`approach` and deterministic local task records. It was rejected and removed
before build or deployment because it was not an atomic contract:

- `ScheduleManager` would emit civic version 3 while `CivicShiftCode` accepted
  only version 2.
- No executor existed for `local-routine` version 1.
- The five persisted shifts in `data/town.db` had no `approach`.
- The leash configuration had only the common 49-waypoint corridor.
- A producer-only deployment would either omit reviewed work or send it to
  semantic code generation.

No service restart, configuration change, town database change, blackboard
change, entity relocation, or live-world mutation was performed during this
diagnosis.

## Required atomic follow-up

Treat the next revision as one release unit. Do not restart between its pieces.

1. Replace deferred path cancellation in both `src/voyager/CodeExecutor.ts` and
   `src/actions/moveHelper.ts` with a shared cleanup that cannot cancel the next
   goal. Add a faithful deferred-stop regression: timeout/no-path immediately
   followed by a reachable goal must not emit `path_stop` for the successor.
2. Produce an immutable approach manifest for all five role/resident starts.
   Each approach needs its own stable ID, accepted snapshot SHA-256, normalized
   waypoint SHA-256, exact no-dig/no-place/no-parkour path, and an endpoint
   exactly equal to 49-waypoint origin zero.
3. Add the reviewed approach type to `src/town/Town.ts`, the version 3 producer
   to `src/town/ScheduleManager.ts`, and matching version 3 parsing/execution to
   `src/voyager/CivicShiftCode.ts`.
4. Make the deterministic transaction:
   personal staging → reviewed approach → unchanged 49-waypoint outbound route
   → bounded destination activity → exact 49-waypoint reverse route → exact
   reverse approach → personal staging/home confirmation.
5. Add deterministic local `work` and `life` routines using only reviewed local
   connectors and visible bounded actions. Add their executor before emitting
   their metadata.
6. In `src/voyager/VoyagerLoop.ts`, keep civic/local routines out of semantic
   skills and LLM generation, preserve source/role/town metadata through
   recovery, use one transaction attempt per deterministic failure, and route
   every exit through one failure finalizer with leg/index/coordinate evidence.
7. Give one civic routine per phase explicit precedence over demand, then
   rotate deterministically through local work and local life. Retain
   one-open-task deduplication, exact role ownership, and bounded family
   backoff. Preserve failure-family lineage independently of reaped task rows.
8. While the service is frozen, back up and atomically migrate:
   `config.yml` leash corridors, the five `data/town.db` shift contracts, and
   any controlled entity staging positions. Do not widen or replace the
   accepted 49-waypoint corridor.
9. Update `scripts/audit_citizen_post_restart.mjs` to report claimed,
   deterministic-selected, failed leg/index/coordinate, approach start,
   common-origin departure, destination, common-origin return, and personal
   home return separately. Match actual outbound/return failure messages.
10. Build and run focused tests before one controlled restart:

```bash
npx vitest run \
  test/control/CivicMobility.test.ts \
  test/town/ResidentIdentity.test.ts \
  test/voyager/CitizenSandboxApis.test.ts \
  test/voyager/CivicShiftCode.test.ts \
  test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts \
  test/voyager/BlackboardManager.roleDispatch.test.ts \
  test/voyager/BlackboardManager.gc.test.ts \
  test/worker/WorkerGeneration.test.ts \
  test/config.schema.test.ts \
  test/scripts/auditCitizenPostRestart.test.ts
npm run build
```

11. After the atomic migration and restart, first live-walk each citizen's
    approach and return in isolation, then activate scheduling, then run a new
    full 20-minute observer. Acceptance requires exact route/home evidence,
    local work and life completions, no role theft, no protected action, no
    generic/player-request recovery leak, and no repeated stuck family.

## Release decision

The physical 49-waypoint common corridor is accepted. The resident lifecycle
is not. Keep citizen lifecycle as a documented follow-up and do not allow it to
block maps/media closeout, but do not describe the five-bot work/life system as
accepted until the atomic follow-up passes.
