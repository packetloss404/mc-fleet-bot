# Raven Rock Tunnel Wave 2 Engineering Release

Date: 2026-07-28  
Program: `REDEV-2026-07-28-R2`  
Package: `INF-RR-02`  
Selected feature: `RR-T2B-LINER-PILOT-W2`  
State: **OFFLINE PASS — LIVE RELEASE GATES PENDING**

## 1. Outcome

Wave 2 now has a complete read-only inventory of Raven Rock's named tunnel
legs, decision nodes, cavern thresholds, and RR-Z5 stair flights, plus a
bounded implementation package for the highest-priority remaining tunnel
defect.

The selected package authors ten dry stations of T2b, x `-145..-136`, as a
five-wide, five-high public route inside the existing natural cavern. It keeps
the existing stone-brick tread and every existing clear cell. It adds only the
elements needed to make the route legible:

- polished-deepslate side liners;
- an amber/brick Habitation route band;
- a stone-brick ceiling family;
- three evenly spaced sea-lanterns;
- one deliberate 3 × 3 dry-side cave window.

The package performs no excavation. All 151 changed source cells are exact
`minecraft:air`, and every operation is a one-cell exact-state `REPL`.

Independent QA is `PASS_OFFLINE_LIVE_GATES_PENDING`: 34/34 gates, 10/10
section stations, 151/151 source guards, zero target hazards, zero
fluid-adjacent targets, zero block entities, and exact rollback restoration.

This is not a live-build claim. No Minecraft, RCON, database, or Sites state
was mutated by this work.

The authoritative offline-release manifest is
`data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.release.json`.
Its state is
`OFFLINE_READY_LIVE_ROUTE_AND_TRANSACTION_GATES_PENDING`, and its
`authorizedForLiveExecution` field remains `false`.

## 2. Immutable source of truth

| Field | Value |
|---|---|
| Region directory | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` |
| Snapshot SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Region bytes | 122,744,700 |
| Hash method | SHA-256 over sorted filename + NUL + bytes + NUL |
| Planning source | `raven-rock/planning/coordinates.yaml` |
| Governing standards | `docs/redevelopment/2026-07-27/infrastructure-standards.md` |
| Accepted predecessor | `docs/redevelopment/2026-07-27/tunnel-repair-release.md` |
| Database | `data/world-map.db`, opened read-only |

`data/worldsnap/region` is not used. The earlier R1 snapshots are historical
evidence only. Any live release requires a new same-moment immutable snapshot
and a complete re-preflight.

All Raven Rock interior geometry is a labeled creative approximation. This
package improves the Minecraft reconstruction; it does not claim to depict a
classified real-world interior.

## 3. Inventory scope

The machine inventory is:

`data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json`

It records:

- 10 named route legs;
- 15 named portals, vestibules, junctions, thresholds, and protected nodes;
- 16 RR-Z5 landing levels;
- 15 RR-Z5 switchback flights;
- 5 existing broad building-circulation database objects;
- per-route snapshot samples;
- per-node local material/fluid probes;
- current database coverage;
- Wave 2 disposition and remaining work.

### 3.1 Tunnel legs

| ID | Role | Snapshot tread/support samples | Max perpendicular / vertical deviation | Wave 2 disposition |
|---|---|---:|---:|---|
| RR-T1a | North portal → N1, public primary | 22/22 | 0 / 1 | Later primary-spine rollout |
| RR-T1b | N1 → Cavern A, public primary | 11/11 | 0 / 1 | Later N1/threshold rollout |
| RR-T2a | South portal → dogleg, public primary | 13/13 | 0 / 1 | Later dogleg/wayfinding package |
| RR-T2b | Dogleg → Cavern B, public primary | 15/15 | 0 / 1 | **Selected INF-RR-02 pilot** |
| RR-T3a | East portal → N2, public primary | 15/15 | 0 / 1 | Later primary-spine rollout |
| RR-T3b | N2 → Cavern A, public primary | 15/15 | 4 / 5 | Survey section changes before lining |
| RR-T4 | West utility leg, service/dead-end | 15/15 | 2 / 1 | Preserve aquifer bulkhead; sign no exit |
| RR-C1 | Cavern A ↔ B, public primary | 8/8 | 0 / 0 | Later destination-continuity package |
| RR-C2 | Cavern A ↔ C, operational secondary | 4/6 | 6 / 5 | Wet threshold and path survey required |
| RR-S1 | Cavern A → RR-Z5, public primary | 17/17 | 3 / 2 | R1 pilot retained; remaining stations later |

The support sampler accepts both authored tread and stable natural support. A
missing sample is not interpreted as a missing route. C2's two misses, its
wet Cavern C node, and its higher deviations are explicit risk evidence for a
later, separately bounded survey.

### 3.2 Nodes and thresholds

The inventory includes:

| Family | IDs |
|---|---|
| Blast vestibules | RR-N1, RR-N2 |
| Portals | RR-N3, RR-N4, RR-N5, RR-N6 |
| Shaft / central nodes | RR-N9, RR-N10 |
| Route decisions | RR-J-T2-DOGLEG, RR-J-T3-S1 |
| Cavern thresholds | RR-J-C1-A, RR-J-C1-B, RR-J-C2-A, RR-J-C2-C |
| Protected infrastructure | RR-J-T4-BULKHEAD |

Each node has a 175-cell local snapshot probe. The two important fluid results
are retained:

- RR-N6 local probe: 10 fluid cells; the western portal remains unusable.
- RR-J-C2-C local probe: 27 fluid cells; the Cavern C threshold needs a wet
  interface design.

The remaining node probes contain no fluid.

### 3.3 RR-Z5 stair and landing inventory

The shaft census covers x `196..204`, y `-12..64`, z `-19..-11`:

| Item | Measured count |
|---|---:|
| Stair blocks | 150 |
| Stair blocks per measured y level | 2 |
| Ladder blocks | 0 |
| Iron-bar blocks | 911 |
| Planned/observed landing levels | 16 |
| Inter-landing flights | 15 |
| Fluid/gravity hazards | 0 |

Landing levels are y
`-11,-6,-1,4,9,14,19,24,29,34,39,44,49,54,59,64`.

The stair exists and is ladderless, but those facts do not prove comfort. A
later package must isolate one flight and its upper/lower landings, then prove
two-block width, three-block headroom, edge continuity, sign continuity, and
normal-speed travel in both directions. No RR-Z5 cell is touched by
`INF-RR-02`.

## 4. Database census and proposal

The read-only database contains 40 Raven Rock features. It contains buildings,
rooms, the district, broad building-circulation objects, the shaft, and the
accepted R1 S1 pilot, but no first-class record for any of the ten route legs
inventoried here.

The import-ready proposal is:

`data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json`

It contains 41 proposed records:

| Record family | Count |
|---|---:|
| Tunnel leg records | 10 |
| Node/portal/threshold records | 15 |
| RR-Z5 flight records | 15 |
| INF-RR-02 package feature | 1 |
| **Total** | **41** |

All records remain `planned`/not imported. Condition score is `null`.
Physical completion, functional performance, walkability, legibility, and
media coverage remain separate evidence states. No quality dimension defaults
to 100.

The INF-RR-02 operation buffer intersects only the Raven Rock district parent
in three dimensions. It intersects no registered building, room, inventory,
shaft, accepted S1 pilot, or other first-class feature.

## 5. Package selection

### 5.1 Why T2b

R1 deliberately called for T2b after acceptance of the S1 section family.
T2b is not too narrow: its median measured width was approximately 14 blocks,
and its route identity dissolves into a large cave-adjacent void. The governing
prescription is a five-wide “tunnel within cavern,” not broader excavation.

### 5.2 Why x `-145..-136`

The original planning pilot suggested x `-145..-135`. The Wave 2 immutable
snapshot adds decisive evidence:

- a dry, complete tread and clear path exists through x `-136`;
- water occupies the audit buffer at x `-135`, z `178`, y `1..9`;
- the adjacent chunk continues the water body at x `-134`, z `177..179`;
- including x `-135` would make the terminal shell fluid-adjacent;
- ending at x `-136` leaves every selected target non-face-adjacent to water.

The package therefore selects the largest contiguous dry portion and records
x `-135` as an explicit rejected boundary.

**Release stop condition:** if a same-moment release snapshot shows fluid,
waterlogging, gravity blocks, or a fluid/gravity block sharing a face with any
target, stop and regenerate. Do not trim the live command list by hand.

### 5.3 Rejected alternatives

| Alternative | Rejection |
|---|---|
| Include x `-135` | Active aquifer edge makes the shell fluid-adjacent |
| Normalize all of T2b | Excessive rollback volume and natural-cave overfill risk |
| Excavate a new straight tube | Existing tread is continuous; excavation is unnecessary |
| Fill the whole cave | Destroys the deliberate cavern experience |
| Combine RR-Z5 stair work | Mixes different failure modes and prevents clean diagnosis |

## 6. Exact centerline and section

### 6.1 Station schedule

| x | Walk y | Center z | Floor y | Clear z | Clear y | Ceiling y |
|---:|---:|---:|---:|---:|---:|---:|
| -145 | 3 | 187 | 2 | 185..189 | 3..7 | 8 |
| -144 | 3 | 187 | 2 | 185..189 | 3..7 | 8 |
| -143 | 3 | 186 | 2 | 184..188 | 3..7 | 8 |
| -142 | 2 | 185 | 1 | 183..187 | 2..6 | 7 |
| -141 | 2 | 185 | 1 | 183..187 | 2..6 | 7 |
| -140 | 2 | 184 | 1 | 182..186 | 2..6 | 7 |
| -139 | 2 | 184 | 1 | 182..186 | 2..6 | 7 |
| -138 | 2 | 183 | 1 | 181..185 | 2..6 | 7 |
| -137 | 2 | 183 | 1 | 181..185 | 2..6 | 7 |
| -136 | 2 | 182 | 1 | 180..184 | 2..6 | 7 |

The single one-block vertical transition occurs after three horizontal
stations. Each adjacent centerline pair changes x by one and changes y/z by at
most one. The package retains the existing tread rather than creating a new
stair.

### 6.2 Cross-section

Looking along increasing x:

```text
                     dry cave / intentional view side

  z=center+3       [polished deepslate / 3x3 tinted-glass window]
                   [brick H route band at rise +2]
  z=center+2  ┌──────────────────────────────────────────────┐
              │                                              │
  ...         │         5 wide × 5 high CLEAR AIR            │
              │                                              │
  z=center-2  └──────────────────────────────────────────────┘
              stone-brick tread at walkY-1
  z=center-3       [brick H band / polished-deepslate liner]

                     aquifer-aware solid-side edge
```

The ceiling is stone brick. Sea-lanterns sit over the centerline at x
`-144,-140,-136`. The 3 × 3 tinted-glass window occupies the positive-z side
at x `-141..-139`, one to three blocks above walk level.

## 7. Operation accounting

The complete section relation contains 450 cells:

| State | Cells |
|---|---:|
| Already equal to design | 299 |
| Exact changed targets | 151 |
| **Total design cells** | **450** |

Changed targets by role:

| Role | Operations |
|---|---:|
| Existing-tread completion | 1 |
| Polished-deepslate side liner | 74 |
| Brick Habitation route band | 17 |
| Tinted-glass intentional window | 9 |
| Stone-brick ceiling | 47 |
| Sea-lantern ceiling rhythm | 3 |
| **Total** | **151** |

Desired materials:

| Material | Operations |
|---|---:|
| Stone bricks | 48 |
| Polished deepslate | 74 |
| Bricks | 17 |
| Tinted glass | 9 |
| Sea lantern | 3 |

Every changed source is exact `minecraft:air`. There are:

- zero `SET` operations;
- zero `CMD` operations;
- zero broad boxes;
- zero masks;
- zero excavation targets;
- zero duplicate targets;
- zero targets above y41;
- zero targets at x `-135`;
- zero targets at RR-Z5, T4 bulkhead, or accepted S1.

## 8. Fluid, gravity, entity, and support evidence

The 1,680-cell audit buffer is x `-146..-135`, y `0..9`,
z `178..191`. Both required chunks are present.

### 8.1 Water census

Twelve water cells exist in the buffer:

- three source cells at y0, z178, x `-146..-144`;
- nine contained cells at x `-135`, z178, y `1..9`.

No water cell is targeted. No target shares a block face with water. The
independent QA recomputes this using all six neighbor directions for all 151
targets.

### 8.2 Other hazards

| Hazard | Count |
|---|---:|
| Target fluid/gravity/waterlogged cells | 0 |
| Face-adjacent target hazards | 0 |
| Block entities | 0 |
| Missing block-entity chunks | 0 |
| Support-dependent buffer blocks | 0 |
| Sand/gravel/suspicious gravity blocks | 0 |
| Targets intersecting a registered room/building | 0 |

The water is evidence, not a cleanup target. It remains in place.

## 9. Guard and rollback contract

Every forward line has the exact form:

```text
REPL x y z x y z minecraft:air <one-exact-pilot-state>
```

The rollback:

- reverses forward order;
- swaps exact expected and replacement states;
- contains 151 one-cell operations;
- removes only a pilot block that still exactly matches;
- restores every applied target to exact air;
- leaves an unapplied or later-modified target untouched.

The independent simulation applies all 151 operations to a fresh census,
validates every section cell, applies the rollback, and finds zero restoration
differences.

Sequential RCON is not database-style ACID. “Atomic” here means one bounded
transaction with exact guards, fixed ordering, post-verification, and automatic
reverse-order compensation on any partial failure.

## 10. Camera and media contract

The manifest is:

`data/exports/redevelopment-wave2-2026-07-28/ravenrock/t2b-camera-manifest.json`

It defines six exact-primary same-camera pairs:

| ID | Purpose |
|---|---|
| RR-T2B-W2-WEST-TO-EAST | Approach, cavern, water, and route-loss context |
| RR-T2B-W2-EAST-TO-WEST | Reverse movement and section context |
| RR-T2B-W2-CAVE-WINDOW | Intended window and dry-side edge |
| RR-T2B-W2-SECTION | Five-wide/five-high typical route section |
| RR-T2B-W2-AQUIFER-EXCLUSION | Rejected x=-135 wet boundary |
| RR-T2B-W2-OBLIQUE | Shell, window, and light rhythm overview |

All six frozen before images were rendered offline from the Wave 2 baseline.
The capture report is:

`data/exports/redevelopment-wave2-2026-07-28/ravenrock/before/capture-report.json`

Renderer status is `PASS`. The initial section camera was rejected because a
near plane obscured the lower image. The corrected camera is:

```text
eye    = (-139, 4.5, 184)
lookAt = (-145, 4.5, 187)
fov    = 65
```

The generator now verifies every unique voxel on that source-state sight ray
is air. The corrected image is 29,671 bytes with luminance variance 608.082,
range 93.072, and 18 quantized colors.

After images do not exist and must not be synthesized as acceptance evidence.
They are captured from the post-release snapshot using the exact same manifest.

## 11. Automated validation

### 11.1 Generator

```bash
node scripts/generate_ravenrock_t2b_wave2.mjs
```

Expected:

- immutable hash match;
- 450 design cells;
- 151 forward and 151 rollback operations;
- 12 buffer water hazards;
- 0 target hazards;
- 0 face-adjacent target hazards;
- 41 database proposals;
- 6 cameras.

### 11.2 Generic preflight

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.txt \
  --regions data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.preflight.json
```

Result: 151/151 exact guards pass; zero failures.

### 11.3 Independent QA

```bash
node scripts/qa_ravenrock_t2b_wave2.mjs
```

Result:

- status `PASS_OFFLINE_LIVE_GATES_PENDING`;
- 34/34 independent gates;
- 10/10 section stations;
- zero failed assertions;
- exact rollback restoration.

### 11.4 Parser dry runs

```bash
python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.txt \
  --dry-run --strict-noop \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.dry-run.json

python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.dry-run.json
```

Each parses 151 operations into 151 vanilla `/fill` commands with zero
WorldEdit leftovers.

### 11.5 Focused tests

```bash
npx vitest run test/build/generateRavenRockT2bWave2.test.ts
```

Result: one test file, three tests, three passed.

### 11.6 Offline release finalizer

```bash
node scripts/finalize_ravenrock_t2b_wave2.mjs
```

The finalizer verifies the report, 151/151 preflight, independent QA, both
strict dry runs, full inventory, 41-feature proposal, camera ray, six-image
capture report, manifest binding, and wet-boundary exclusion. It hashes every
release artifact and writes the authoritative offline-release manifest.

## 12. Live release gates

Offline PASS is not execution authority. Immediately before a live transaction:

1. pause every fleet bot;
2. require no active or queued world-building mission;
3. clear players and free entities from the audit buffer;
4. `save-all flush`;
5. capture a new immutable same-moment snapshot;
6. reproduce all 151 exact source guards;
7. recompute the full fluid-neighbor census;
8. stop if x=-135 water moved or any target became fluid-adjacent;
9. execute INF-RR-02 as its own fixed-order transaction;
10. compensate in reverse order on the first partial failure;
11. `save-all flush` and freeze the post snapshot;
12. require all 151 rollback guards to match installed state;
13. perform normal-speed walks in both directions without sprint, jump,
    crouch, dig, or tower;
14. capture all six same-camera after views;
15. import database/media only after independent post-state PASS.

The required live route endpoints are explicit:

| Direction | Start | Finish |
|---|---:|---:|
| Dogleg side → Cavern B side | `(-145,3,187)` | `(-136,2,182)` |
| Cavern B side → dogleg side | `(-136,2,182)` | `(-145,3,187)` |

Both runs use normal speed and forbid sprint, jump, crouch, dig, tower, flight,
and spectator movement. Each must reach the opposite endpoint without water
contact, collision, fall, or leaving the authored route.

## 13. Remaining Raven Rock tunnel work

The package intentionally leaves:

1. the x `-135` wet threshold and remaining T2b route to Cavern B;
2. one RR-Z5 switchback flight plus its upper and lower landings;
3. T2 dogleg advance, decision, and confirmation wayfinding;
4. T1a/T1b uniform primary-spine rollout and N1 threshold;
5. T3a/T3b uniform primary-spine rollout and N2 threshold;
6. C1 public connector identity and both cavern thresholds;
7. C2 utility-secondary identity and wet Cavern C threshold;
8. T4 “service/dead-end — no surface exit” signing while preserving the
   x `-278/-277` aquifer bulkhead;
9. the S1 stations outside accepted R1 x `138..148`;
10. live bidirectional, time, lighting, and wayfinding evidence for every
    named segment.

## 14. Artifact register

| Artifact | Purpose |
|---|---|
| `scripts/generate_ravenrock_t2b_wave2.mjs` | Immutable generator, full inventory, database, camera, safety logic |
| `scripts/qa_ravenrock_t2b_wave2.mjs` | Independent section/source/neighbor/rollback QA |
| `scripts/finalize_ravenrock_t2b_wave2.mjs` | Complete evidence-chain validator and offline release manifest |
| `test/build/generateRavenRockT2bWave2.test.ts` | Focused regression tests |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.txt` | 151 exact forward operations |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.txt` | 151 reverse-order exact rollback operations |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.prestate.json` | Complete 450-cell relation and 1,680-cell safety evidence |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.report.json` | Machine design/release report |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.preflight.json` | 151/151 immutable guard result |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.qa.json` | Independent 34-gate result |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.release.json` | Authoritative offline-ready state, hashes, live endpoints, and stop conditions |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.dry-run.json` | Forward parser dry run |
| `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.dry-run.json` | Rollback parser dry run |
| `data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json` | All route, node, shaft, and database coverage evidence |
| `data/world-review/ravenrock-wave2-tunnel-database-features-2026-07-28.json` | 41 proposed/import-ready records; not imported |
| `data/exports/redevelopment-wave2-2026-07-28/ravenrock/t2b-camera-manifest.json` | Six same-camera before/after contracts |
| `data/exports/redevelopment-wave2-2026-07-28/ravenrock/before/capture-report.json` | Frozen before-image hashes and renderer QA |
