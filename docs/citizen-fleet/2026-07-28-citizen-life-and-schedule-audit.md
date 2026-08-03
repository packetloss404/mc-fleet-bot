# Ravensreach Five-Citizen Life and Schedule Audit

Date: 2026-07-28 UTC  
Observation window: through `2026-07-28T08:20:42Z`  
Town: Ravensreach (`town_mrzgshth_9d12c17d`)  
Citizens: Scott, Architect, Mason, Surveyor and Steward  
Decision: **NOT READY FOR AUTONOMOUS DAILY-LIFE OR CROSS-CITY ACTIVATION**

## Executive finding

The five identities and town roles are now internally consistent, but the
fleet does not yet have a believable daily life.

At the read-only audit point:

- all five bots were connected, healthy and fed, but every bot reported
  `IDLE`;
- `voyager.enabled` was `false`;
- Ravensreach was persisted and running as `paused`;
- the town's `config_json` contained only mayor and slider data, with no
  `citizenRoutine`;
- all five runtime leashes used the same home circle at `(-85,-370)`, rather
  than an individual residence;
- ScheduleManager had only one global day/night boundary and emitted work by
  role, not a per-resident timed itinerary;
- routine descriptions referred to shelters, a common hall, work sites and
  routes without exact configured locations;
- the latest blackboard held 76 tasks: 54 blocked, 16 pending, five completed
  and one claimed;
- only Mason, Surveyor and Steward had any completed town task in the retained
  board; Scott and Architect had none; and
- all four recorded live cross-city walk attempts failed. No reverse walk was
  completed.

The current paused/disabled state is therefore appropriate. It prevents an
incomplete schedule and a failed cross-city route from being treated as a
live routine. This report proposes source and configuration changes only; it
does not authorize enabling either system.

## Current five-citizen state

| Citizen | Persisted role | Audit position | Retained town outcomes | Daily-life finding |
|---|---|---:|---|---|
| Scott | lumberjack | `(-83,60,-427)` | 3 blocked, 0 completed | No configured home/bed, nursery or stockpile; below town elevation near the mine area. |
| Architect | builder | `(-121,68,-376)` | 5 blocked, 0 completed | Generic build and shelter jobs have no authorized work cell or exact destination. |
| Mason | miner | `(-49,68,-377)` | 7 blocked, 2 completed, 1 claimed | Some work succeeds, but the communal mine at `(-85,64,-440)` is outside the shared 50-block home circle and has no approved mine corridor/destination. |
| Surveyor | guard | `(-82,70,-2)` | 9 blocked, 2 completed | Stranded partway along the failed MainStreet walk; patrol text still has no exact checkpoint circuit. |
| Steward | farmer | `(-115,68,-340)` | 7 blocked, 1 completed | Only a shelter job completed; no exact crop beds, food store, compost or cottage route is configured. |

Identity is no longer the blocker: the live and persisted registers both
contain Scott, Architect, Mason, Surveyor and Steward with the expected unique
roles.

## Schedule and configuration audit

### ScheduleManager

`src/town/ScheduleManager.ts` currently:

- divides the entire day into only `day` and `night`;
- computes one open task per `(town, role, phase)`;
- maintains the next routine cursor only in memory;
- persists only `lastEmittedPhase`, not the routine cursor or resident
  itinerary;
- prepends every matching cross-city shift to its role schedule;
- has no resident name, start tick, end tick, duration, venue, route lock or
  return-trip state; and
- assumes the 45-second login stagger also staggers departures, although login
  staggering happens only when workers connect. Recurring schedule emissions
  occur together on the TownBrain's 60-second tick.

This is useful role dispatch, but it is not a daily-life scheduler.

### TownManager and town configuration

`TownManager.updateTown()` shallow-merges arbitrary town configuration.
`TownConfig.citizenRoutine.shifts` types a role, phase, activity and waypoint
list, but there is no runtime validator for:

- known resident/role ownership;
- unique shift IDs;
- individual homes or venues;
- time windows;
- exact route/destination agreement;
- a return path;
- worksite permissions;
- live-walk acceptance state; or
- overlapping use of a narrow corridor.

The current Ravensreach database row has no `citizenRoutine`, despite the
route migration audit reporting five proposed shifts. ScheduleManager
therefore has no cross-city shift to emit.

### Runtime movement configuration

`config.yml` gives each bot:

- the same home center and 50-block radius;
- one MainStreet destination;
- one three-block-half-width two-dimensional corridor; and
- 14 two-dimensional waypoints.

The reviewed route proposal contains 19 three-dimensional routine waypoints.
The current runtime leash omits the intermediate `z=0`, `20`, `45`, `60` and
`75` vertices needed to express the changing surface elevation. The leash
geometry is only horizontal, while the executable routine needs exact feet
elevations.

The live route evidence remains failed:

| Evidence | Failure |
|---|---|
| `citizen-route-live-walk-20260728T075821Z.json` | Forward timeout at checkpoint 6. |
| `citizen-route-live-walk-20260728T081120Z.json` | Forward timeout at the first checkpoint. |
| `citizen-route-live-walk-20260728T081409Z.json` | Reached the long West Lane leg, then timed out approaching `(-82,65,81)` and stopped at `(-82,70,-2)`. |
| `citizen-route-live-walk-20260728T081735Z.json` | Could not stage from the stranded position to `(-82,73,0)`. |

No reverse result exists. The MainStreet employee lounge is still planned, so
the present destination remains only `mainstreet-rear-staff-staging`.

## Exactly five behavioral improvements

### 1. Stagger a persisted itinerary per resident

**Behavioral outcome:** citizens start work, leisure and travel at deliberate,
different times instead of receiving one simultaneous day/night burst.

**Code fix:**

- Replace the `(town, role, phase)` emission key with
  `(town, resident, routine-window)`.
- Extend the routine model with `botName`, `startTick`, `endTick`,
  `minimumDurationTicks`, `repeatEveryDays`, `priorityClass` and
  `maxLateStartTicks`.
- On each 60-second TownBrain tick, start at most one new resident routine and
  advance a persisted round-robin cursor. This provides a real minimum
  one-minute departure spacing.
- Persist `nextRoutineIndex`, `nextResidentIndex`, active routine ID, current
  step and last completion in `schedule.json`.
- Deduplicate by resident and routine ID, not only role keywords.

**Configuration fix:** define five stable offsets, one Minecraft minute apart:

| Resident | Start offset |
|---|---:|
| Architect | 0 ticks |
| Mason | 1,200 ticks |
| Scott | 2,400 ticks |
| Steward | 3,600 ticks |
| Surveyor | 4,800 ticks |

The ordering may change after route-capacity testing, but the offsets must
remain distinct. `bots.joinStaggerMs` is not a substitute.

**Acceptance:** over two complete day/night cycles, no two routine-start events
share a TownBrain tick, each resident receives work and non-work windows, and
restart resumes the persisted cursor without replaying the first routine.

### 2. Give every citizen an exact home and complete home loop

**Behavioral outcome:** “rest,” “return home” and “leave for work” become real
trips to an individual residence rather than semantic prompts.

**Code fix:**

- Add a resident-life registry with `residenceId`, exterior door, interior
  arrival, bed/rest anchor, safe waiting point and exact home-to-street
  waypoints.
- Add `home-bound`, `at-home` and `departing-home` routine states.
- A rest routine must walk home, enter, reach its own rest anchor, dwell, and
  exit through the same accepted route.
- Fail closed to the resident's safe waiting point when a home route is not
  post-state verified.

**Configuration fix:** replace the five shared “home” circles with five
surveyed residence destinations and short home-to-civic-network corridors.
Do not use the planned Manager Vale mini-mansions until those buildings have
accepted post-state and interior walking evidence; survey the current usable
shelters first.

**Acceptance:** each bot completes door-to-rest and rest-to-street walks in
both directions, no bot uses another resident's home identity, and all five
home routes remain within their leash geometry.

### 3. Require a verified worksite contract for productive work

**Behavioral outcome:** every citizen has believable work, while destructive
jobs occur only where the world and permissions make them possible.

**Code fix:**

- Add `worksites` to the town routine model with object ID, role, entrance,
  exact route, bounds, allowed actions, prohibited actions, required
  inventory, verification snapshot and status.
- ScheduleManager emits a destructive work routine only when its worksite is
  `VERIFIED` and the requested action is allowlisted. Otherwise it emits the
  paired inspection/report routine.
- TownBrain's demand loop must consult the same worksite contract before
  producing wood, stone, food or ore jobs. It must not create generic
  exploration tasks for a resident when no reachable source is approved.
- Attach `worksite:<id>` and `routine:<id>` to every work task for exact
  cooldown and evidence accounting.

**Configuration fix:** survey and register:

- Architect: one non-destructive inspection circuit plus separately authorized
  build cells;
- Mason: a route/destination to the communal mine and a separate tool/stockpile
  inspection circuit;
- Scott: verified nursery, street-tree and lumber-stockpile zones;
- Steward: exact crop beds, kitchen store, irrigation and compost zones; and
- Surveyor: a finite checkpoint circuit, not a generated perimeter radius.

**Acceptance:** each resident completes its inspection contract; no
uncontracted dig/place succeeds; and productive tasks are enabled one worksite
at a time only after bidirectional route and object-bound checks pass.

### 4. Schedule real leisure and social overlap

**Behavioral outcome:** citizens spend identifiable time reading, eating,
meeting and relaxing, with intentional overlap between peers rather than five
independent “socialize briefly” prompts.

**Code fix:**

- Add a `venue` registry with entrance, interior seats, capacity, open window,
  exact route and accepted status.
- Add leisure routine steps: depart, arrive, claim a seat/activity anchor,
  dwell for a bounded interval, optional peer interaction, release the anchor
  and return home.
- Schedule staggered arrivals but overlapping dwell windows. Capacity
  reservations must prevent every bot selecting one block.
- Record leisure completion separately from work completion so the dashboard
  can prove a balanced life.

**Configuration fix:** after survey, define at least:

- a common-hall meal/social window;
- an Architect reading/courtyard window;
- a Mason meal/tool-story window;
- a Scott trail/nursery leisure walk;
- a Steward kitchen/common-table window; and
- a Surveyor quiet checkpoint-report/reading window.

These can share venues, but each needs a distinct activity and return-home
route. A venue name alone is insufficient.

**Acceptance:** during one full cycle every citizen completes at least one
leisure routine, at least one venue hosts two or more residents with staggered
arrival and overlapping dwell, and every participant returns home.

### 5. Make cross-city work an outbound/activity/return transaction

**Behavioral outcome:** MainStreet work is a complete commute with route
ownership, progress recovery and guaranteed return—not a one-way list embedded
in prose.

**Code fix:**

- Represent a shift as structured `outbound`, `activity`, `return` and
  `fallback` stages rather than one description string.
- Store the active waypoint index and resume from the last confirmed
  checkpoint after restart.
- Add a corridor occupancy lease. While the route retains seven two-wide
  chokes, only one citizen may be in the commute transaction at a time.
- Require exact three-dimensional routine waypoints even though the leash
  performs an additional horizontal corridor check.
- Block activation unless a named live-walk acceptance record proves staging,
  full forward walk, full reverse walk, no dig/tower and safe return.

**Configuration fix:**

- Do not restore the five database shifts yet.
- First correct the runtime route to the reviewed 19-point geometry and resolve
  the live obstruction around `z=-2..0`.
- Re-run a fresh same-moment offline survey and one complete live
  bidirectional walk.
- Then install one canary shift for Surveyor only. Add the other four roles
  one at a time after the prior role returns successfully.
- Keep the destination named `mainstreet-rear-staff-staging` until the lounge
  is built and accepted.

**Acceptance:** one citizen completes outbound, role activity and reverse
return; the route lease releases; a second citizen can then complete the same
transaction; and zero bot remains stranded outside its verified home network.

## Recommended implementation order

1. Implement the resident itinerary schema, validation and persisted cursor.
2. Survey and install existing home and local work/leisure routes.
3. Run a local-only canary cycle while retaining cross-city disablement.
4. Repair and accept the MainStreet bidirectional route.
5. Enable cross-city shifts one resident at a time behind the corridor lease.

## Verification suite to add with implementation

- `ScheduleManager` starts at most one resident routine per brain tick.
- Restart restores resident/window cursor and active route step.
- Unknown resident, role, venue, worksite or duplicate shift ID fails
  validation.
- Destructive work without a verified worksite becomes inspection work.
- Home routines contain exact outbound and reverse paths.
- Leisure arrivals are staggered while dwell windows overlap.
- Cross-city routine cannot start without a PASS live-walk ledger.
- Corridor lease excludes a second commuter until the first returns or enters
  a reviewed recovery state.
- The five-resident fixture rejects shared residence IDs and missing home
  anchors.
- One simulated full cycle gives each resident work, home and leisure
  completion without cross-role claims.

## Safety and truth boundary

This was a read-only audit. It did not change `config.yml`, `town.db`,
`blackboard.json`, systemd state, bot queues, Minecraft blocks, citizen
positions or the town-expansion generator.

The five improvements are implementation requirements, not live claims.
Ravensreach should remain paused and cross-city schedules absent until the
corresponding local and route gates pass.
