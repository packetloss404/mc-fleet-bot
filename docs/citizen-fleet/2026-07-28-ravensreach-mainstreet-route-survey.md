# Ravensreach–MainStreet Citizen Commute Survey

Date: 2026-07-28 UTC  
Route ID: `RR-MSA-CITIZEN-COMMUTE-01`  
Survey state: **PASS OFFLINE ON THE FRESH ACCEPTED SNAPSHOT AND
PASS_BIDIRECTIONAL IN THE CONTROLLED LIVE WALK**

## Executive decision

An existing surface route can carry a citizen from the south edge of
Ravensreach to MainStreet's rear staff staging area without digging, towering,
swimming, parkour, entering a building footprint, crossing a configured mining
protection box, or occupying a hazardous block.

The current source of truth is the fresh six-region snapshot captured for this
route review:

| Snapshot | SHA-256 | Result |
|---|---|---|
| Fresh accepted citizen-route snapshot | `70eb7051d635d7558d3603e345e2b2d17d712607e92019363a12bbcc62267099` | 33/33 segments forward and 33/33 reverse |
| Accepted Wave 2 post-state comparison | `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999` | 33/33 segments forward and 33/33 reverse |

Both sources select the same exact 498-cell walk trace, SHA-256
`c4e5924b91172a5c07c6b369cd196ce77c82df17bcc3abc08ff4e3adcd6c50b1`.
The annotated evidence map is
`data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png`;
it is cropped from the accepted Wave 2 surface atlas and marks all checkpoints,
two-wide chokes, the current destination circle, and the unbuilt lounge parcel.

This does not say the final employee greenway is built. The current route has
seven two-wide choke cross-sections and is below the final five-block design
target for 307 of its 498 cells. It is suitable for staggered citizen shifts,
not a claim that the permanent paved, lit, five-block greenway is complete.

## Important survey correction

The earlier provisional coordinate schedule mixed support-block elevation and
feet elevation. Its first seven `y=68` keyframes sit on solid ground and are
not valid feet cells. The immutable snapshots show those reviewed checkpoints
at feet `y=69`.

The corrected route below changes no world block. It corrects only the proposed
navigation coordinates.

## Exact 3D citizen waypoints

The thirty-four checkpoints are the bounded pathfinder goals. The final
west-shoulder stair uses single-step goals around the exposed West Lane terrain
lip, then returns to the road grade south of the crest. The remaining West Lane
checkpoints preserve the other grade changes that the earlier summaries
compressed into long segments. The machine report also retains every one of
the 498 exact walk cells between them.

| Sequence | X | Feet Y | Z | Route role |
|---:|---:|---:|---:|---|
| 1 | -111 | 69 | -332 | Ravensreach south staff origin |
| 2 | -110 | 69 | -317 | south departure |
| 3 | -94 | 69 | -305 | contour bend |
| 4 | -74 | 69 | -294 | southeast contour |
| 5 | -63 | 69 | -279 | east contour |
| 6 | -63 | 69 | -261 | south contour |
| 7 | -81 | 69 | -249 | MainStreet approach turn |
| 8 | -81 | 65 | -219 | graded Service Cross arrival |
| 9 | -82 | 65 | -219 | West Lane north endpoint |
| 10 | -82 | 65 | -119 | West Lane north grade checkpoint |
| 11 | -82 | 65 | -19 | West Lane mid-route grade checkpoint |
| 12 | -82 | 65 | -8 | West Lane contour entry |
| 13 | -81 | 66 | -7 | West Lane contour step 1 |
| 14 | -82 | 67 | -6 | West Lane contour step 2 |
| 15 | -81 | 68 | -5 | West Lane contour step 3 |
| 16 | -82 | 69 | -4 | West Lane contour step 4 |
| 17 | -81 | 70 | -3 | West Lane contour step 5 |
| 18 | -82 | 71 | -2 | West Lane contour step 6 |
| 19 | -83 | 72 | -1 | west-shoulder upper approach |
| 20 | -83 | 73 | 0 | west-shoulder stair crest |
| 21 | -83 | 72 | 1 | west-shoulder descent 1 |
| 22 | -83 | 71 | 2 | west-shoulder descent 2 |
| 23 | -82 | 70 | 3 | road-edge return |
| 24 | -82 | 69 | 4 | south contour step |
| 25 | -82 | 68 | 5 | south contour foot |
| 26 | -82 | 68 | 10 | low-grade run |
| 27 | -82 | 69 | 11 | Garden Cross approach |
| 28 | -82 | 70 | 20 | Garden Cross south grade |
| 29 | -82 | 71 | 45 | West Lane central grade |
| 30 | -82 | 70 | 60 | West Lane south approach |
| 31 | -82 | 70 | 75 | arrival-campus grade |
| 32 | -82 | 65 | 81 | South Cross descent |
| 33 | -82 | 65 | 85 | South Cross/rear-staff staging |
| 34 | -82 | 65 | 90 | planned future lounge door |

The civic-mobility proposal uses a three-block horizontal half-width around
these centerline segments. The named destination circle is
`mainstreet-rear-staff-staging`, centered at `(-82,85)` with radius eight. That
circle includes both the safe current staging point and the planned future
door at `(-82,90)`.

## Bidirectional normal-walk evidence

The offline walker is intentionally conservative:

- cardinal movement only;
- two clear body blocks;
- safe solid footing;
- maximum adjacent elevation change of one;
- no swimming;
- no parkour;
- no digging;
- no towering;
- closed doors and gates are impassable; and
- every segment is confined to a three-block tube around its reviewed
  centerline.

| Segment | From → To | Forward cells | Reverse cells | Maximum step | Result |
|---:|---|---:|---:|---:|---|
| 1 | `(-111,69,-332)` → `(-110,69,-317)` | 17 | 17 | 1 | PASS |
| 2 | `(-110,69,-317)` → `(-94,69,-305)` | 29 | 29 | 1 | PASS |
| 3 | `(-94,69,-305)` → `(-74,69,-294)` | 32 | 32 | 0 | PASS |
| 4 | `(-74,69,-294)` → `(-63,69,-279)` | 27 | 27 | 1 | PASS |
| 5 | `(-63,69,-279)` → `(-63,69,-261)` | 19 | 19 | 1 | PASS |
| 6 | `(-63,69,-261)` → `(-81,69,-249)` | 31 | 31 | 0 | PASS |
| 7 | `(-81,69,-249)` → `(-81,65,-219)` | 31 | 31 | 1 | PASS |
| 8 | `(-81,65,-219)` → `(-82,65,-219)` | 2 | 2 | 0 | PASS |
| 9 | `(-82,65,-219)` → `(-82,65,-119)` | 101 | 101 | 1 | PASS |
| 10 | `(-82,65,-119)` → `(-82,65,-19)` | 101 | 101 | 1 | PASS |
| 11 | `(-82,65,-19)` → `(-82,65,-8)` | 12 | 12 | 1 | PASS |
| 12 | `(-82,65,-8)` → `(-81,66,-7)` | 3 | 3 | 1 | PASS |
| 13 | `(-81,66,-7)` → `(-82,67,-6)` | 3 | 3 | 1 | PASS |
| 14 | `(-82,67,-6)` → `(-81,68,-5)` | 3 | 3 | 1 | PASS |
| 15 | `(-81,68,-5)` → `(-82,69,-4)` | 3 | 3 | 1 | PASS |
| 16 | `(-82,69,-4)` → `(-81,70,-3)` | 3 | 3 | 1 | PASS |
| 17 | `(-81,70,-3)` → `(-82,71,-2)` | 3 | 3 | 1 | PASS |
| 18 | `(-82,71,-2)` → `(-83,72,-1)` | 3 | 3 | 1 | PASS |
| 19 | `(-83,72,-1)` → `(-83,73,0)` | 2 | 2 | 1 | PASS |
| 20 | `(-83,73,0)` → `(-83,72,1)` | 2 | 2 | 1 | PASS |
| 21 | `(-83,72,1)` → `(-83,71,2)` | 2 | 2 | 1 | PASS |
| 22 | `(-83,71,2)` → `(-82,70,3)` | 3 | 3 | 1 | PASS |
| 23 | `(-82,70,3)` → `(-82,69,4)` | 2 | 2 | 1 | PASS |
| 24 | `(-82,69,4)` → `(-82,68,5)` | 2 | 2 | 1 | PASS |
| 25 | `(-82,68,5)` → `(-82,68,10)` | 6 | 6 | 0 | PASS |
| 26 | `(-82,68,10)` → `(-82,69,11)` | 2 | 2 | 1 | PASS |
| 27 | `(-82,69,11)` → `(-82,70,20)` | 10 | 10 | 1 | PASS |
| 28 | `(-82,70,20)` → `(-82,71,45)` | 26 | 26 | 1 | PASS |
| 29 | `(-82,71,45)` → `(-82,70,60)` | 16 | 16 | 1 | PASS |
| 30 | `(-82,70,60)` → `(-82,70,75)` | 16 | 16 | 1 | PASS |
| 31 | `(-82,70,75)` → `(-82,65,81)` | 7 | 7 | 1 | PASS |
| 32 | `(-82,65,81)` → `(-82,65,85)` | 5 | 5 | 0 | PASS |
| 33 | `(-82,65,85)` → `(-82,65,90)` | 6 | 6 | 0 | PASS |

The exact forward and reverse traces, expanded-node counts, block states, and
snapshot member hashes are in the machine report. This is stronger than a
single flood-fill between endpoints: every pair of adjacent reviewed
checkpoints is independently solved in each direction inside its own corridor.

## Live pathfinder validation and bounded action behavior

The definitive controlled audit is
`data/runtime-audits/citizen-route-live-walk-20260728T092815Z.json`, SHA-256
`68f701830b37253877df19fea70d0ee2e03e63249bb93ef5262afd662afadb47`.
Surveyor passed:

- 21/21 staging checkpoints from its prior location back to the route origin;
- 34/34 forward checkpoints;
- 34/34 reverse checkpoints;
- zero protected-dig count change (`0` before and `0` after); and
- zero security incidents before and after.

The result is `PASS_BIDIRECTIONAL`, and its accepted-snapshot and exact-path
hashes exactly match this survey. The gate used the production walk action with
`GoalNear(range=1)`, a 45-second bound per attempt, and at most two attempts per
checkpoint. The accepted run needed no second attempts: all 89 staging,
forward, and reverse checkpoint actions passed on attempt one.

The earlier failed audits targeted superseded route revisions. Their
terrain-lip evidence informed the thirty-four-checkpoint west-shoulder stair;
they do not override the later hash-bound pass.

The movement helper now has a bounded response to Mineflayer
`path_reset: stuck` events:

- stop the stale path;
- face the exact reviewed goal;
- apply `jump + forward` for 600 milliseconds;
- clear both controls and restore the same `GoalNear`;
- suppress another recovery for at least two seconds; and
- remain inside the action's existing timeout and civic step-exclusion policy.

The recovery does not dig, tower, teleport, invent a waypoint, or expand the
approved corridor. Its focused unit tests pass, and the production action stack
completed the accepted bidirectional audit. The audit does not assert that the
stuck hook fired; it establishes that the exact reviewed route works through
the bounded `range=1` action and that the two-attempt retry remained available.

## Hazard and protection results

| Check | Result |
|---|---:|
| Hazard blocks on exact path | 0 |
| Fluid/deadly blocks in two-block path halo | 0 |
| Gravity-block supports | 0 |
| Block entities within two blocks | 0 |
| Accepted building footprints crossed | 0 |
| Configured mining-protection boxes crossed | 0 |
| MainStreet guard-property cells | 443, movement only |
| MainStreet West Lane cells | 314 |

The route intentionally enters the guarded MainStreet property. This proposal
authorizes movement only. It does not authorize breaking, placing, inventory
access, or build work anywhere in that property.

The database reports a two-dimensional overlap with Raven Rock route `RR-C2`
around z `-16..-8`. That underground route is at approximately y `-12..-18`;
the citizen route is on the surface around y `64`. This is more than 75 blocks
of vertical separation, not a physical intersection.

The route follows the accepted `R02 West Lane`, and crosses the accepted
`R07`, `R06`, `R05`, and `R04` road junctions. Those are intended circulation
relationships, not building conflicts.

## Width findings

The five-cell cross-section audit found:

- minimum contiguous standable width: two;
- seven two-wide points;
- 307 cells below the final five-block greenway target; and
- no point that blocks a single normal walker.

The seven narrow points are:

| X | Feet Y | Z |
|---:|---:|---:|
| -82 | 65 | -206 |
| -82 | 66 | -158 |
| -82 | 65 | -110 |
| -82 | 64 | -62 |
| -82 | 67 | -38 |
| -82 | 64 | -14 |
| -82 | 70 | 34 |

Citizen departures should therefore be staggered until the permanent greenway
is built and post-verified. No temporary construction schedule is required to
unblock one-at-a-time commuting. Widening, paving, lighting, signing, and the
employee lounge remain part of the coordinated town-expansion physical
release.

## Destination truth

The current endpoint is safe natural/road-edge staging, not an employee
lounge. The planned lounge remains:

- bounds: x `-94..-73`, y `64..76`, z `90..121`;
- planned path door: `(-82,65,90)`; and
- status: planned, not as-built in either surveyed snapshot.

Citizen task text must call the current destination
`mainstreet-rear-staff-staging`. Rename it only after the lounge has a guarded
transaction, accepted post snapshot, interior route proof, and database import.

## Five-role non-destructive shift proposal

The machine patch proposes one day shift for each exact town role:

| Role | MainStreet activity |
|---|---|
| Builder | façade, road-edge, door, and lighting inspection |
| Miner | service-road and material-stockpile-access inspection |
| Lumberjack | street-tree, planted-edge, and woodwork inspection |
| Farmer | landscape-bed and staff-food-service-support inspection |
| Guard | route and rear-staff-staging patrol |

All five shifts are `nonDestructive: true`. They contain the same thirty-four
ordered 3D waypoints, with the reverse list recorded for return travel. The
proposal updates all five leash entries—Architect, Mason, Scott, Steward, and
Surveyor—with the same reviewed destination and corridor while preserving the
existing Ravensreach home circle.

## Activation status and remaining gates

This documentation update does not write live config, town data, service
state, or world blocks. The route and persisted shift transactions are
complete:

- `citizen-route-corridor-20260728T092841Z.json` records the exact 34-waypoint
  corridor, five leash entries, and the controlled hold; its SHA-256 is
  `3869915e9243f0ea9e096329d1159f0d6c9f0e6eaeae620055a67d5e03c1e24d`;
- `citizen-route-shifts-20260728T092841Z.json` records five installed shifts,
  matching route hashes, Voyager configured enabled, and Ravensreach resumed;
  its SHA-256 is
  `f05e33431e32869e27116b86eb18160a1f88647b231c73c3d7e38eec7c460bde`;
  and
- both execute artifacts report `PASS`.

The maintenance transaction leaves `mc-fleet-bot.service` stopped by design.
At the time of this documentation pass it is inactive, so runtime activation
and observation are not yet complete. The remaining gates are:

1. start only the systemd-owned `mc-fleet-bot.service`;
2. verify exactly five unique connected citizens and their exact roles;
3. observe staggered shifts and return trips through a full day/night cycle;
4. require zero protected dig/place events, zero worker-overlap incidents, and
   no exact failed-task family churn; and
5. retain the final five-wide greenway/lounge package as a separate physical
   release with exact guards and rollback.

## Reproduction and artifacts

```bash
node scripts/survey_citizen_cross_city_route.mjs
npx vitest run test/scripts/surveyCitizenCrossCityRoute.test.ts
```

Artifacts:

- `scripts/survey_citizen_cross_city_route.mjs`
- `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json`
- `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json`
- `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png`
- `data/runtime-audits/citizen-route-live-walk-20260728T092815Z.json`
- `data/runtime-audits/citizen-route-corridor-20260728T092841Z.json`
- `data/runtime-audits/citizen-route-shifts-20260728T092841Z.json`
- `test/scripts/surveyCitizenCrossCityRoute.test.ts`

Focused route-generator QA result: four tests passed. Bounded stuck-recovery
QA adds two passing movement-helper tests. The merged five-bot leash proposal
is accepted by the repository's real config validator. The definitive live
artifact is hash-bound and reports `PASS_BIDIRECTIONAL`; the persisted shift
transaction also passes. The systemd service restart and day/night observation
remain separate gates.
