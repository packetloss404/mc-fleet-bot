# Five-Bot Runtime Readiness Recheck

Generated: 2026-07-28 13:08 UTC  
Citizens: Architect, Mason, Scott, Steward, Surveyor  
Town: Ravensreach (`town_mrzgshth_9d12c17d`)  
Decision: **SOURCE READY; LIVE ACTIVATION BLOCKED ON POST-RELEASE ROUTE
REVALIDATION**

## Executive finding

The five citizens have exact identities, exact town roles, rotating work/life
schedules, bounded mobility, task-family backoff, sandbox parity, and
generation-safe worker ownership. Deterministic civic shifts do not depend on
LLM availability. The persisted activation also contains five reviewed
MainStreet shifts, Voyager is enabled, and Ravensreach is unpaused.

They are not currently running. `mc-fleet-bot.service` is intentionally
inactive while the atomic Town Expansion release owns the world. No duplicate
backend or Mineflayer process was present during this recheck.

This recheck found and fixed a material false-positive in the citizen release:
the deterministic civic-shift executor walked only outbound, ignored its
destination activity, and never returned to Ravensreach. The observer accepted
85 percent outward progress and therefore could not prove that a citizen
worked at MainStreet and came home. Civic shifts are now a version-2,
fail-closed contract: exact outbound path, observable non-destructive
destination inspection, exact reverse path, and a home confirmation dwell.
The observer now requires sampled departure, destination, and return for every
citizen.

The in-flight Town Expansion package changes 262 of the 498 cells in the
currently accepted walking trace when support and body-clearance cells are
included. The old live route result is therefore historical evidence, not
authorization to start the citizens after this release. The immutable
post-release world must be resurveyed and walked in both directions before the
five-shift activation is refreshed and systemd starts the fleet.

## Five behavior improvements

| Improvement | Current implementation | Evidence | Remaining live gate |
|---|---|---|---|
| 1. Exact identity and occupation | Scott/lumberjack, Architect/builder, Mason/miner, Steward/farmer, Surveyor/guard; no `Scout` resident | Read-only `town.db` query; resident-identity tests | Confirm the same five sessions and roles after systemd start |
| 2. Productive daily rotation | Every role alternates role work with non-destructive inspection; phase changes discard obsolete unclaimed work | `ScheduleManager`; role-dispatch/backoff tests | Each citizen must complete one role-owned local task |
| 3. Believable work/life rhythm | Day and night tables include work, shelter, common-hall, reading, courtyard, patrol, and social routines | Schedule table plus post-restart day/night gate | Observe both Minecraft phases and both fleet categories |
| 4. Work in MainStreet and return home | Each role owns one exact reviewed MainStreet shift; v2 executor travels out, visually inspects, reverses the route, and confirms home | Civic-shift unit tests; accepted pre-release bidirectional walk | Regenerate and live-walk the post-release route, then prove all five round trips |
| 5. Stop standing/stuck churn | One open schedule task per town/phase/role, exponential family backoff, stale-claim maintenance, no resident-ineligible DungeonMaster jobs, stationary-loop detection | Blackboard, global maintenance, observer, and worker tests | 20–45 minute read-only observer must show no repeated failure/stationary loop |

## Five code improvements

| Improvement | Implementation | Verification |
|---|---|---|
| 1. Resident identity resolution | Exact match first; only one globally unique one-character substitution is accepted | `ResidentIdentity.test.ts` 4/4 |
| 2. Role-owned rotating schedules and backoff | Structured `(town, phase, role)` tasks, exclusive role claims, duplicate suppression, phase cleanup, exponential retry delay | `BlackboardManager.roleDispatch.test.ts` 8/8 |
| 3. Civic mobility and round-trip execution | Home/destination/corridor enforcement at requested goal and intermediate path steps; LLM-independent v2 deterministic outbound/inspection/return executor | `CivicMobility.test.ts` 5/5; `CivicShiftCode.test.ts` 6/6; no-LLM executor 2/2 |
| 4. Generated-code sandbox parity | Container results are arrays; `findBlocks`/`blockAt` expose coordinate, distance, offset, and block-state APIs | `CitizenSandboxApis.test.ts` 4/4 |
| 5. Worker and global-task lifecycle safety | Monotonic worker generations, captured IPC ownership, restart coalescing, awaited termination, first-heartbeat startup aging, stale-claim GC, and resident-aware DungeonMaster suppression | `WorkerGeneration.test.ts` 3/3 plus source inspection |

The civic executor is selected before the `ActionAgent` availability guard.
Its skill-library lookup/save and LLM rewrite paths are bypassed, so a missing
provider or retry cannot silently turn an approved route into semantic free
roaming. `VoyagerLoop.civicShiftNoLlm.test.ts` passes 2/2.

## Per-citizen cross-city assignment

| Citizen | Role | MainStreet assignment |
|---|---|---|
| Architect | builder | Inspect façades, road edges, doors, and lighting without block edits |
| Mason | miner | Inspect service-road condition and stockpile access without mining or moving inventory |
| Scott | lumberjack | Inspect street trees, planted edges, and woodwork without harvesting |
| Steward | farmer | Inspect landscape beds and staff food-service support without harvesting or planting |
| Surveyor | guard | Patrol rear staff staging without leaving the reviewed corridor |

All five shift activities are non-destructive. No task authorizes arbitrary
roaming, digging, placing, inventory transfer, or a shortcut outside the
reviewed civic boundary.

## Current persisted state

- `config.yml` SHA-256:
  `947caec8fdc197a9563bd93519195fa4dc5aeb754fba8f92553257992fe381f7`
- Voyager enabled: yes.
- Leash/corridor entries: five exact citizen names.
- Persisted shifts: five exact roles.
- Ravensreach paused: no.
- `town.db` integrity: `ok`.
- `world-map.db` integrity: `ok`.
- Fleet service: inactive/dead, MainPID 0, clean status.
- Duplicate bot backend/Mineflayer process: none observed.

## Route invalidation finding

Machine-readable evidence:
`data/runtime-audits/citizen-route-town-expansion-intersection-20260728T130825Z.json`.

| Release scope | Exact old route cells touched |
|---|---:|
| `TE-MSA-B01-GUEST-SERVICES-DESTINATION` | 140 |
| `TE-RAVENSREACH-MAINSTREET-STAFF-PATH` | 121 |
| `TE-MAINSTREET-EMPLOYEE-LOUNGE` | 1 |
| Total unique old route cells | 262 / 498 |

The vertical-class audit found 197 support, 86 feet, 22 head, and 22
second-head intersections. Material replacement can be benign, but a
hash-bound route cannot assume that. The gate is deliberately binary:
post-release resurvey and live bidirectional walk are required.

## Verification performed

- Full citizen/route/auditor suite: 13 files, 60 tests, all pass.
- Civic shift and observer subset after dynamic route-contract hardening:
  3 files, 18 tests, all pass.
- Backend TypeScript build: pass.
- `git diff --check` on touched citizen files: pass.
- No service start/restart.
- No API mutation.
- No config/database/world mutation.

## Required release order

1. Finish or compensate the single atomic Town Expansion transaction.
2. Capture its immutable accepted post-release snapshot.
3. Re-run the citizen route survey with the post-release snapshot as both the
   accepted and same-moment comparison input; require a fully hashed offline
   bidirectional pass.
4. Run the controlled live no-dig bidirectional walk on the regenerated
   route.
5. Apply the refreshed five leash and five shift contracts atomically from
   that exact passing audit.
6. Start `mc-fleet-bot.service` through systemd only.
7. Run `audit_citizen_post_restart.mjs --observe` for 45 minutes with a
   20-minute minimum. Acceptance requires exactly five sessions, exact roles,
   an advancing town brain, day and night, one local success per citizen,
   exact destination-and-return evidence per citizen, zero protected action,
   zero security/worker incident, and zero stuck loop.

Until those gates pass, the correct statement is: the citizens are
source-ready and deliberately offline, not yet proven autonomous in the
post-release world.
