# C01 secure-complex surface release

Date: 2026-07-27  
Owner: Secure-complex implementation team  
World: `world`  
Project: `mainstreet-america`  
Live mutation: **not performed**

## 1. Outcome

This release prepares two guarded, additive packages for the MainStreet C01
secure complex:

1. **Phase 1 — surface concealment and east-edge seam**
   - wraps the exposed west, east, and southwest faces of `HGR-S01` in a
     graded natural landform;
   - keeps `OBS-S01` as the sole intentional civic-scale surface landmark;
   - preserves the controlled aircraft door/trail, heliport, observatory
     stair, shelter, vault, service shaft, interiors, and loaded inventories;
   - completes a level six-block-wide east-edge road from the existing public
     entry promenade to Festival Row;
   - authors the project-boundary opening and adds two-way route confirmation.
2. **Phase 2 — additive recessed public portal**
   - creates a south-facing, five-block-clear, four-block-high portal at
     x `141..145`, z `201`;
   - uses a lit stair-backed dogleg to enter the existing lobby through its
     east wall;
   - leaves the old public portal fully operational;
   - preserves the lobby's sand substrate, the lower theater's structural
     separator, the upper theater, and `SHL-S01`;
   - does **not** close, earth-cover, or retire the old route.

Phase 1 is implementation-ready with
`PASS_OFFLINE_LIVE_GATES_PENDING`. Phase 2 is also implementation-ready, with
a bounded live entity sweep, normal-speed bidirectional walk, and owner
acceptance retained as release-safety gates.

Neither package was sent through live RCON. The current world was not mutated.

## 2. Source of truth

Both generators are pinned to the immutable region snapshot:

- snapshot: `data/worldsnap-redevelopment-c9e2bf0a-20260727/region`
- SHA-256:
  `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`
- region files: `26`
- algorithm: SHA-256 over sorted
  `filename + NUL + file bytes + NUL`

The design follows:

- `docs/redevelopment/2026-07-27/master-plan.md`, section 7;
- `docs/redevelopment/2026-07-27/infrastructure-standards.md`;
- `docs/redevelopment/2026-07-27/infrastructure-audit.md`,
  sections 7.4–7.6;
- `docs/redevelopment/2026-07-27/infrastructure-audit.design.json`;
- the recorded `C01`, `C01-LOBBY`, `HGR-S01`, `OBS-S01`, `SHL-S01`,
  `P01`, circulation, room, and inventory features in
  `data/world-map.db`.

The preferred strategy remains “re-portal and restore the surface,” not
translation of the deep complex. Moving the protected stack would add risk
without solving the visible shell, parking seam, or route-legibility problem.

## 3. Phase 1 release

### 3.1 Artifacts

| Artifact | Path | SHA-256 / result |
|---|---|---|
| Generator | `scripts/generate_bunker_surface_phase1.mjs` | offline only |
| Forward ops | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt` | `22b7fffddca9820fb02cb285d49345558a1b9ced227ff54a8fe05d7927a40d4e` |
| Rollback | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.txt` | `54bc504b26260d02c52d66b88a6fdb288a8cf3c40d6057aa7038d7a5e6721479` |
| Generator report | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.report.json` | 28,729 cells / 766 guards |
| Independent QA | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.independent-qa.json` | 31/31 assertions |
| Frozen preflight | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.preflight.root.json` | 766/766 guards |
| Strict dry-run | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.dry-run.root.json` | 769 commands / 0 leftovers |
| Camera contract | `data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.before-cameras.json` | eight unique views |

All 766 `REPL` boxes use exact-source guards. The source and rollback
retain full sorted block properties, including the east/west-connected birch
fence and bottom quartz-slab states. Desired grass is explicit
`grass_block[snowy=false]`. All three sign NBT merges are gated by
`execute if block` against the exact desired wall-sign state. There are no
`SET` operations.

### 3.2 Scope and measurable effect

| Component | Exact bounds | Offline result |
|---|---|---|
| West landform | x `145..175`, y `93..118`, z `139..180` | exposed manufactured facade reduced 93.7% |
| East landform | x `235..260`, y `95..118`, z `139..171` | exposed manufactured facade reduced 100% |
| Southwest landform | x `176..207`, y `93..118`, z `182..205` | exposed manufactured facade reduced 82% |
| East-edge road | x `120..125`, y `64`, z `206..245` | six wide, level, 40 long, full geometric connectivity |
| Authored gate | x `120..125`, y `65..67`, z `231` | six-wide clear transition |

The road intersects none of the 236 recorded parking stalls, the southeast
rain garden, or Festival Row. Every one of its 40 stations has six standable
cells and three-block headroom. The route connects north to the existing
public-entry promenade and south to Festival Row.

The landform result is intentionally a Phase 1 improvement, not a false claim
of total invisibility. The north face, controlled aircraft door/trail, and
roof cornice remain visible. `OBS-S01` remains visible by design. Same-camera
review must decide whether later grading is needed.

### 3.3 Protected exclusions

No Phase 1 target intersects:

- the public observatory stair;
- `HGR-S01`, `OBS-S01`, or the penthouse shell;
- the aircraft door/trail or heliport;
- the service shaft;
- the current public-entry interior;
- `SHL-S01`;
- the shelter/vault connector;
- the grand vault;
- the southeast rain garden;
- any of the 12 loaded chest coordinates.

The independent QA reread 28,729 exact source states, found zero target block
entities, checked 38,536 unique fluid-halo cells, and found zero direct or
neighbor fluid hazards.

### 3.4 Phase 1 media

The eight before views are already captured under:

`data/exports/redevelopment-qa-2026-07-27/bunker/before/`

They cover:

1. parking center and east seam;
2. southwest hangar/podium oblique;
3. east hangar/podium oblique;
4. controlled hangar door and trail;
5. north face and retained observatory;
6. road northbound;
7. road southbound;
8. C01 surface map.

After images must reuse the exact camera, image dimensions, field of view, and
lighting contract in the camera JSON. Tight crops are not acceptance evidence.

## 4. Phase 2 additive portal

### 4.1 Why the alignment changed

The first provisional dogleg correctly failed its safety gate because its
one-cell halo touched the existing lobby's y `63` sand substrate. That
alignment was discarded.

The accepted offline alignment enters through the lobby's east wall at
x `139`, y `65..68`, z `164..168`. It never targets or approaches the sand
substrate within one cell. The new corridor occupies x `140..147`,
y `62..69`, z `163..201`.

The database reports two apparent plan-view conflicts that are vertically
separated:

- `C01-LOWER-THEATER` ends at y `60`; the portal begins at y `62` and
  preserves y `61` as a structural separator;
- `ROUTE:C01-LOWER-OPERATIONS` is centered near y `51`, well below the new
  portal.

`SHL-S01` begins at x `148` and y `81`; the portal liner ends at x `147`
and y `69`. No target overlap exists.

### 4.2 Artifacts

| Artifact | Path | Result |
|---|---|---|
| Generator | `scripts/generate_bunker_recessed_portal_phase2.mjs` | offline only |
| Forward ops | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt` | 1,632 cells / 79 guards / one guarded sign merge |
| Rollback | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.rollback.txt` | exact inverse, post-state preflight required |
| Generator report | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.report.json` | no target/halo hazards |
| Frozen preflight | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.preflight.json` | 79/79 guards |
| Strict dry-run | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.dry-run.json` | 80 commands / 0 leftovers |
| Camera contract | `data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.before-cameras.json` | five required views |

The Phase 2 package has:

- zero block entities in its frozen safety box;
- zero fluid, waterlogged, or gravity hazards in targets;
- zero such hazards in the one-cell target halo;
- minimum computed overhead cover of 11 blocks after the authored lobby
  junction and before the portal reveal;
- five clear walking blocks and four clear vertical blocks;
- two shallow, stair-backed descent/rise transitions;
- no broad `SET` operation;
- an exact-state-guarded sign NBT merge;
- no old-portal closure.

Its runtime-order audit also proves that the rollback removes the attached wall
sign before restoring its support. All 20 authored
`polished_deepslate_stairs` remain `shape=straight`; there are zero
perpendicular adjacent stair pairs capable of normalizing that desired shape.
The remaining structural phases unwind in reverse order.

Frozen region data cannot prove the absence of transient players, mobs, armor
stands, item frames, or other free entities. A bounded live entity-empty sweep
is therefore a mandatory pre-release gate.

### 4.3 Phase 2 release status

| Dimension | Current status | Remaining acceptance |
|---|---|---|
| Concealment | 11-block minimum overhead cover; recessed south mouth | same-camera exterior review after construction |
| Functional | five-wide/four-high dry geometry, exact stair profile | normal-speed two-way no-jump player walk |
| Legibility | copper center band and guarded lobby/parking/return directory | player-facing read at approach, turn, lobby, and return |
| Media | five-camera before/after contract generated | capture before lighting state and all after counterparts |

The final seven-wide terrain-following mountain road from the audit is **not**
part of this package. Phase 1 completes the six-wide parking-edge seam; a
separate graded road release is still needed if the owner wants full vehicular
language up the mountain.

## 5. Database feature handoff

The reports contain machine-readable `databaseFeatures` arrays. Each record
has an exact geometry, parent, `sourceRef`, planned status, and separate
concealment, functional, legibility, and media status.

### 5.1 Phase 1 features

| External ID | Parent | Geometry |
|---|---|---|
| `C01-PHASE1-LANDFORM-WEST` | `DIV-C01-SURFACE` | bounds x `145..175`, y `93..118`, z `139..180` |
| `C01-PHASE1-LANDFORM-EAST` | `DIV-C01-SURFACE` | bounds x `235..260`, y `95..118`, z `139..171` |
| `C01-PHASE1-LANDFORM-SOUTHWEST` | `DIV-C01-SURFACE` | bounds x `176..207`, y `93..118`, z `182..205` |
| `C01-EAST-EDGE-ROAD-PHASE1` | `DIV-C01-SURFACE` | bounds x `120..125`, y `64..67`, z `206..245` |
| `GATE-C01-EAST-EDGE-ROAD` | `FENCE:DIV-C01-SURFACE` | bounds x `120..125`, y `64..67`, z `231` |
| `C01-EAST-ROAD-DIRECTORY-NORTH` | `C01-EAST-EDGE-ROAD-PHASE1` | bounds x `119`, y `65..67`, z `207..208` |
| `C01-EAST-ROAD-DIRECTORY-GATE` | `C01-EAST-EDGE-ROAD-PHASE1` | bounds x `119`, y `65..67`, z `230..232` |
| `C01-PUBLIC-PORTAL-APPROACH-PHASE1` | `C01-PUBLIC-ENTRY` | six-wide path z `231 → 206 → 204` |

### 5.2 Phase 2 features

| External ID | Parent | Geometry |
|---|---|---|
| `C01-PUBLIC-PORTAL-RECESSED-PHASE2` | `C01` | bounds x `139..147`, y `62..69`, z `163..201` |
| `C01-PUBLIC-CONNECTOR-DOGLEG-PHASE2` | `C01-PUBLIC-PORTAL-RECESSED-PHASE2` | five-wide path from `(143,64,201)` to `(139,64,166)` |
| `C01-PUBLIC-PORTAL-DIRECTORY-PHASE2` | `C01-PUBLIC-PORTAL-RECESSED-PHASE2` | bounds x `146..147`, y `63..66`, z `187` |

These planned rows must not be imported as complete observations before the
corresponding live release, saved-world census, walk test, and media
reconciliation pass.

## 6. Release gates and sequence

Do not execute either package from this document automatically. A release
operator must:

1. coordinate a quiet C01/P01 maintenance window;
2. capture and hash a fresh saved-world snapshot;
3. prove the snapshot equals the package baseline, or regenerate and repeat
   review;
4. confirm zero active builders and perform a bounded live free-entity sweep
   over every target volume;
5. preserve the eight Phase 1 before images and capture the five Phase 2 before
   views if Phase 2 is in scope;
6. rerun exact frozen preflight;
7. run the forward file with strict no-op handling and require zero failures,
   zero no-ops, and zero WorldEdit leftovers;
8. save and hash a post-release snapshot;
9. census every target cell against the desired state;
10. reconcile the 12 protected chest NBT records and all protected route/room
    exclusions;
11. perform normal-speed bidirectional walks;
12. capture all same-camera after views;
13. import database/media observations only after QA disposition.

Suggested offline revalidation:

```bash
node scripts/generate_bunker_surface_phase1.mjs \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
node scripts/preflight_guarded_ops.mjs \
  data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt \
  --dry-run --strict-noop

node scripts/generate_bunker_recessed_portal_phase2.mjs \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
node scripts/preflight_guarded_ops.mjs \
  data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt \
  --dry-run --strict-noop
```

Run focused regression tests with:

```bash
npx vitest run \
  test/build/generateBunkerSurfacePhase1.test.ts \
  test/build/generateBunkerRecessedPortalPhase2.test.ts
```

Current result: two test files, nine tests passed.

## 7. Rollback rule

The rollback files are exact post-state guards. Their failure against the
original snapshot is expected and desirable: they must only match a world in
which the corresponding forward targets were successfully installed.

Before rollback:

- obtain a content-addressed post-release snapshot;
- preflight the rollback against that snapshot;
- require 100% guard coverage;
- confirm the rollback does not overwrite later accepted work;
- repeat saved-world, route, inventory, and media QA afterward.

Never weaken a rollback guard to make it match a different world state.

## 8. Explicitly deferred

The following remain separate releases:

- full seven-wide terrain-following mountain access road;
- final north-face/cornice concealment;
- acceptance or redesign of the controlled aircraft-door exception;
- old public-portal closure and earth cover;
- any move of deep C01, shelter, vault, or inventories;
- database completion status and media observations;
- any live construction.

## 9. Independent Phase 1 QA addendum

This addendum records the independent release audit of Phase 1. It does not
reuse the generator's summary as proof. The QA script reparses and expands the
forward and rollback boxes, rereads every target from the frozen Anvil data,
queries the feature database read-only, recomputes final-state geometry and
exposure, and checks the generic preflight and strict dry-run reports.

The complete machine-readable evidence is:

`data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.independent-qa.json`

Independent status: **PASS_OFFLINE_LIVE_GATES_PENDING — 31 of 31 assertions
passed, zero failed**.

### 9.1 Release-blocking defects found and corrected

#### `BSP1-EXACT-STATE-LOSS`

The first reviewed package was not safe to release. The shared Anvil reader
returned a palette block name but discarded its `Properties`. That produced
state-less forward source masks and state-less rollback destinations for the
authored gate:

- an east/west-connected birch fence was reduced to bare
  `minecraft:birch_fence`;
- a bottom smooth-quartz slab was reduced to bare
  `minecraft:smooth_quartz_slab`.

The generic guard preflight accepts a base block name when the mask has no
bracketed state. It therefore could not detect this loss by itself. A live
forward run might have passed, while rollback would have restored default
states rather than the exact frozen source.

The correction adds a full-state read path to `AnvilSnapshot`. Properties are
serialized in deterministic lexical order. Phase 1 uses that state-preserving
path for every rollback destination and for every forward source except the
five narrowly declared connected-fence removals described below. The corrected
exact states include:

```text
minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]
minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]
minecraft:grass_block[snowy=false]
```

Independent verification reread and matched all 28,729 exact source states,
then proved that every rollback cell restores the precise source string.

#### `BSP1-UNGUARDED-SIGN-NBT`

The first reviewed package also emitted three direct `data merge block`
commands. The block replacements were guarded, but the NBT writes were not.

The corrected package wraps every sign write in:

```text
execute if block <x> <y> <z> <complete desired wall-sign state>
run data merge block <x> <y> <z> <front-text NBT>
```

Independent verification matched all three command coordinates and guard
states to their exact forward targets:

| Sign point | Guarded state | Frozen source |
|---|---|---|
| `(119,66,208)` | `oak_wall_sign[facing=south,waterlogged=false]` | air |
| `(119,66,230)` | `oak_wall_sign[facing=north,waterlogged=false]` | air |
| `(119,66,232)` | `oak_wall_sign[facing=south,waterlogged=false]` | air |

#### `BSP1-NEIGHBOR-PHYSICS-ORDER`

The controlled post-incident review found two additional runtime hazards:

- removing adjacent connected fence cells changes the directional state of
  later fence cells, so a single frozen full-state guard can strictly no-op;
- the old rollback order removed landform and pylon supports before 89 shrubs
  and three wall signs, allowing dependants to pop before their guarded
  removals.

The forward package now converts the surviving x `119` anchor before removing
its x `120` neighbor. Exactly five removal-only cells at x
`120,121,123,124,125`, y `65`, z `231` use a bare
`minecraft:birch_fence` source guard. This is not a general relaxation. The
generator and both QA consumers require all five declared points, desired air,
the exact frozen source
`birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]`,
no block-entity capability, `waterlogged=false`, and zero fluid neighbors.
Rollback remains a complete exact-state restoration.

Rollback now removes the three signs first, then all 89 shrubs (47 azalea and
42 flowering azalea), and only then unwinds structural phases in reverse.

### 9.2 Independent assertion matrix

| Assertion | Result | Independent evidence |
|---|---|---|
| Snapshot hash | PASS | 26 region files; exact c9e2 digest |
| Forward syntax | PASS | zero parse errors |
| Rollback syntax | PASS | zero parse errors |
| Forward box count | PASS | 766 |
| Forward command count | PASS | 3 guarded commands |
| Rollback box count | PASS | 766 |
| Rollback command exclusion | PASS | zero commands |
| Forward target uniqueness | PASS | 28,729 cells; zero duplicates |
| Rollback target uniqueness | PASS | 28,729 cells; zero duplicates |
| Reported cell count | PASS | report and expansion both 28,729 |
| Exact frozen source match | PASS | 28,729/28,729 reread; five declared removal guards match their frozen full state |
| Forward/rollback bijection | PASS | 28,729/28,729 exact inverse pairs |
| Complete states where required | PASS | zero undeclared incomplete states; five declared dry birch-fence removal guards |
| Sign NBT command guards | PASS | 3/3 target/state matches |
| Protected-box exclusion | PASS | 11 boxes; zero intersections |
| Loaded-chest exclusion | PASS | 12 coordinates; zero intersections |
| Block-entity exclusion | PASS | 1,519 broad-census entities; zero targeted |
| Direct fluid exclusion | PASS | zero fluid/waterlogged targets |
| Landform fluid halo | PASS | 38,536 unique neighbor cells; zero hazards |
| Parking reconciliation | PASS | 236 stalls; zero intersections |
| Road profile | PASS | 40/40 stations six wide and three high |
| North road connection | PASS | x `120..125`, six cells |
| South road connection | PASS | x `120..125`, six cells |
| Gate headroom | PASS | zero blocked cells |
| Bidirectional road geometry | PASS | 252/252 corridor cells connected |
| Facade exposure recomputation | PASS | all three face results reproduced |
| Landform column continuity | PASS | 2,642/2,642 changed columns continuous |
| Generic guard preflight | PASS | 766/766; zero partial masks |
| Strict forward dry-run | PASS | 769/769 commands; zero leftovers |
| Strict rollback dry-run | PASS | 766/766 commands; zero leftovers |
| Artifact hash agreement | PASS | forward and rollback match report |
| Camera contract | PASS | eight unique IDs and outputs |
| Runtime dependency order | PASS | signs then 89 shrubs before support rollback |
| Connected-fence exception | PASS | five declared cells; desired air only; rollback exact |

### 9.3 Independent protected-volume evidence

The independent block-entity census covered 80 chunks with zero missing.
It found 1,519 block entities in the broad C01 area. That is not a defect:
protected interiors are intentionally inside the broad census. The acceptance
condition is that none of those block entities occupies a target cell, and the
targeted count is zero.

The exact no-target boxes were:

| Protected asset | Bounds |
|---|---|
| Public-observatory stair | x `164..175`, y `98..123`, z `151..166` |
| Hangar shell | x `176..234`, y `98..120`, z `138..181` |
| Observatory/penthouse | x `175..235`, y `119..136`, z `137..182` |
| Hangar door/trail | x `208..238`, y `88..116`, z `180..191` |
| Heliport | x `238..257`, y `88..91`, z `172..191` |
| Service shaft | x `198..202`, y `24..106`, z `151..156` |
| Public entry | x `90..139`, y `64..80`, z `153..205` |
| Shelter shell/interior | x `148..188`, y `81..92`, z `143..180` |
| Vault connector | x `188..232`, y `66..86`, z `171..196` |
| Grand vault | x `230..262`, y `44..77`, z `184..226` |
| Southeast rain garden | x `100..119`, y `64..66`, z `240..245` |

The 12 separately enumerated loaded chests were also compared cell-for-cell
and had zero target intersections.

Frozen region files do not include a complete same-moment free-entity data set.
The result proves block-entity exclusion only. A live bounded entity-empty query
remains a mandatory release gate.

### 9.4 Independent parking and road evidence

The QA opened `data/world-map.db` read-only and found exactly 236 individual
stall records. No forward target intersects any stall. Phase 1 therefore has
the following parking delta:

| Measure | Count |
|---|---:|
| Stalls before | 236 |
| Removed | 0 |
| Relocated | 0 |
| Added | 0 |
| Stalls projected after | 236 |

The road's final-state simulation checked all six x positions at all 40 z
stations. Each station has support at y `64` and clear player cells at y
`65..67`. Six cells connect to the north interface and six connect to the
south interface. A breadth-first traversal reached all 252 modeled standable
corridor/interface cells from both directions.

This result proves geometric connectivity. It does not replace the normal-speed
live walk required by QA-03. It also does not claim that the six-wide, level
east seam is the final BK-04 mountain road.

### 9.5 Independent fluid and landform evidence

The target census found no direct water, lava, bubble column, or waterlogged
state. The landform safety halo contained 38,536 unique adjacent cells and no
fluid hazard.

Continuity was evaluated on the projected final columns, not merely on the list
of changed operations. Existing solid source cells may legitimately occur
between two changed cells. With source and desired states combined, all 2,642
changed landform columns have an unbroken solid profile from the original
natural support to the intended top.

### 9.6 Independent exposure evidence

The QA recomputed manufactured-face exposure without trusting the summary
values:

| Face | Manufactured cells | Before | After | Newly screened | Reduction |
|---|---:|---:|---:|---:|---:|
| West | 870 | 411 | 26 | 385 | 93.7% |
| East | 693 | 621 | 0 | 621 | 100.0% |
| Southwest | 672 | 528 | 95 | 433 | 82.0% |

The recomputed result matches the generator report exactly. It supports a
measured Phase 1 improvement claim only. The north face, roof cornice,
aircraft-door/trail exception, and observatory still prevent final zero-shell
acceptance.

### 9.7 Independent release disposition

Phase 1 is implementation-ready and may execute in a coordinated release once
the mandatory same-moment safety gates pass. Those gates protect live world
state and evidence quality. Until execution and post-state verification
finish, it is not safe to describe the package as constructed, accepted, or
as-built.

The following remain unresolved by offline evidence:

- a same-moment free-entity sweep;
- confirmation that no other builder or bot changes the volume between
  preflight and execution;
- the eight before images pinned to the release snapshot;
- live command results with zero failures and no-ops;
- a post-release immutable snapshot;
- an exact 28,729-cell desired-state census;
- protected chest and block-entity reconciliation;
- normal-speed bidirectional road walking;
- same-camera after images;
- reviewed database and media imports.

No live RCON was used during this independent review.
