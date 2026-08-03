# MainStreet America Wave 2 — R08 engineering dossier

Date: 2026-07-28  
Package: `mainstreet-america-redevelopment-wave2-r08`  
Decision: **PASS_OFFLINE_ONLY**  
Live-world mutation: **none**

## 1. Executive decision

Wave 2 selects the missing midblock connection between R06 and R07 as the
highest-impact MainStreet defect that can be engineered without replaying the
accepted R1 work.

The selected intervention is a three-wide public shared cross-link named R08.
It connects the accepted West Rear Alley to the accepted East Rear Alley,
crosses R01 at grade, opens two deliberate three-cell gates in the inner
neighborhood fences, and adds four guarded district directory pylons.

The package is complete as an offline engineering product:

- 354 connected route surface cells;
- 736 exact-guarded replacement cells;
- four guarded sign-data commands;
- 736/736 immutable-snapshot preflight guards passing;
- zero accepted-R1 target overlap;
- zero building, room, driveway, landscape, R1 garage, tree, or existing block
  entity targets;
- six and only six declared fence cells;
- four full-state finite-union fence guards;
- two explicitly modeled adjacent reactive fence states;
- exact reverse rollback with 736 guarded cells;
- 32/32 independent QA checks passing;
- 8/8 focused tests passing;
- backend TypeScript build passing;
- eight corrected, source-bound baseline images.

This is not authorization to run the package live. Any future release must
refresh a saved-world snapshot, regenerate the exact guards, clear entities,
capture same-camera before images, execute the whole package as one strict
transaction, and run bidirectional route and sign QA.

## 2. What this wave audits

The user asked for the remaining MainStreet spacing, road, comprehension,
building-integration, venue-finding, and two-street problems to be examined
together. The audit separates what can safely be improved now from what needs a
larger coordinated phase.

| Requested concern | Current evidence | Wave 2 disposition |
|---|---|---|
| Objects feel too close or too far apart | R06 and R07 are about 135 blocks apart; ST-03 targets no more than 100 blocks between public connections | **Physical R08 cross-link selected** |
| Roads do not read as a complete grid | R01, R02, R03, R06, R07, and the two R1 alleys exist, but the north residential superblock has no named middle connection | **R08 connects both alleys through R01** |
| Turning a corner is confusing | Database identities exceed visible in-world identities | **Four decision-point directories added** |
| B02 and B03 feel detached | R1 preserved both buildings and completed their primary service relationships | **No relocation; R08 directories name B02/B03 and route via R06/R07** |
| C01/stadium is hard to find | C01 Training Arena and Westlight venue can be verbally conflated | **Signs use distinct `C01` and `WESTLIGHT VENUE` identities** |
| Westlight route is unclear | Westlight is not on the MainStreet surface grid | **Regional sign states Ravensreach → Ravensgate → west Approach Road** |
| Two-street logic is incomplete | R02/R03 and the rear alleys exist, but a full new R02–R03 street would breach outer fences | **Internal shared cross-link selected; full R02–R03 cut-through rejected** |
| Houses/buildings may need relocation | Accepted R1 garage and alley work already made all 18 houses serviceable | **No house or building movement in this package** |
| B02/B03 should be brought closer | Moving authored buildings would create a larger demolition and database migration problem | **Use network integration first; relocation remains rejected** |

## 3. Source of truth

### 3.1 Immutable saved-world baseline

All geometry, block states, headroom, fence properties, block entities, and
camera visibility evidence come from:

`data/worldsnap-wave2-baseline-4fca1ff3-20260728/region`

| Property | Value |
|---|---|
| Hash algorithm | SHA-256 over sorted `filename + NUL + bytes + NUL` |
| SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Bytes | 122,744,700 |
| Mutable snapshot used | No |
| Live server contacted | No |

The generator fails closed if the directory hash, region-file count, or byte
count differs.

### 3.2 Database baseline

`data/world-map.db` is opened with `readonly: true` and
`fileMustExist: true`.

The protection query covers complete, non-removed:

- buildings;
- rooms;
- driveways;
- landscape features.

The accepted R1 garage matrix is also checked because garages are represented
more precisely in the accepted R1 report than in the current feature-kind
census.

No database row is inserted or updated. Ten proposed feature payloads are
included in the report for a later reviewed import.

### 3.3 Accepted R1 baseline

The package treats all five accepted R1 target sets as immutable:

| Accepted package | Role in overlap audit |
|---|---|
| `westlight-infinity-screen-2026-07-27.txt` | Westlight venue target protection |
| `ravenrock-s1-section-pilot-2026-07-27.txt` | Raven Rock target protection |
| `mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.txt` | Alleys, garages, frontage, B02/B03, and wayfinding protection |
| `mainstreet-bunker-surface-phase1-2026-07-27.txt` | Bunker surface target protection |
| `mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt` | Recessed portal target protection |

The generated R08 target set has zero cell overlap with their union.

## 4. Standards applied

The package implements the already adopted infrastructure standards:

| Standard | R08 application |
|---|---|
| ST-01 connected hierarchy | R08 is explicitly classified as a pedestrian/shared-street cross-link |
| ST-02 widths | Three blocks, the minimum cross-street width |
| ST-03 connection interval | Adds an equivalent connection inside the 135-block R06–R07 interval |
| ST-04 compact intersection | Preserves both continuing routes and adds destination information before route choices |
| ST-07 grade | Entire route is at y=64; maximum adjacent step is zero |
| WF-02 wayfinding | B02, B03, C01, R01, R06, R07, both alleys, and Westlight receive explicit directional language |

R08 is a shared surface rather than a fast through street. That classification
keeps the clear route at three blocks and avoids a seven-block road/sidewalk
cut through authored residential landscape.

## 5. Alternatives and rejection record

### 5.1 Full R02–R03 street

Study envelope: approximately x=-80..82 near z=-124.

Rejected because it would:

- cut the registered outer west neighborhood fence;
- cut the registered outer east neighborhood fence;
- require new R02 and R03 curb transitions;
- create more surface and reactive-fence risk than needed to address the
  current block-length defect;
- overlap the functional territory already served by R1 alleys.

### 5.2 Straight R08 at z=-124

Rejected after block-by-block survey.

A straight line would target two authored sea-lantern gateway markers near
x=-7 and x=7 and would place the new gate in a weak relationship to the
existing quartz fence piers.

### 5.3 Existing central gate at z=-147..-143

Rejected because that otherwise convenient five-wide opening aligns with:

- The Timbergrove envelope at x=-46..-22, z=-157..-133;
- The Midtown envelope at x=26..38, z=-151..-140.

Using the opening would turn a public cross-link into a route through authored
building footprints.

### 5.4 Existing gate at z=-197..-193

Rejected because it aligns with The Wakefield and The Valencia building and
room envelopes.

### 5.5 Existing gate at z=-97..-93

Rejected because it aligns with The Centennial and The Cross Creek building
and room envelopes.

### 5.6 R02 widening

Deferred. ST-02 explicitly says widening existing R02 is a study, not a
presumption. The current package does not trade house, fence, or comfortable
grade protection for width.

### 5.7 Wayfinding-only package

Rejected as the sole remedy. Signs would help comprehension but would leave
the 135-block connection interval physically unchanged.

## 6. Selected geometry

### 6.1 Network diagram

```text
                    north / B03 / R07

ALLEY-W                                                   ALLEY-E
 x=-58                                                     x=57
    |                                                        |
    +-- endpoint x=-57 -- west leg z=-124 --+                |
                                             \               |
                                              z=-126 central  |
                            west gate  R01  east gate          |
                              x=-8     x=0     x=8             |
                                             /               |
    +---------------- east leg z=-124 -------+-- endpoint x=56+

                    south / B02 / C01 / R06
```

The two-block north offset through the center preserves the existing
sea-lantern markers and uses three fence cells between existing quartz-pier
rhythms on both sides.

### 6.2 Exact road rectangles

All coordinates are inclusive.

| Segment | X range | Z range | Cells before union | Purpose |
|---|---:|---:|---:|---|
| West leg | -57..-14 | -125..-123 | 132 | West Alley to west offset |
| West offset | -14..-12 | -127..-123 | 15 | Shift north around gateway landscape |
| Central crossing | -14..14 | -127..-125 | 87 | West gate, R01, east gate |
| East offset | 12..14 | -127..-123 | 15 | Shift south after east gate |
| East leg | 14..56 | -125..-123 | 129 | East offset to East Alley |
| Union | — | — | **354** | Duplicate corners counted once |

### 6.3 Bidirectional endpoints

| Direction | Start | End | Result |
|---|---|---|---|
| West → east | `[-57,65,-124]` | `[56,65,-124]` | Connected |
| East → west | `[56,65,-124]` | `[-57,65,-124]` | Connected |

The west endpoint is one block from accepted ALLEY-W surface cell
`[-58,64,-124]`.

The east endpoint is one block from accepted ALLEY-E surface cell
`[57,64,-124]`.

Neither accepted alley cell is retargeted.

### 6.4 R01 continuation

R01 remains continuous north/south through the new crossing:

- north continuation: `[0,65,-128]`;
- crossing: x=-5..5, z=-127..-125;
- south continuation: `[0,65,-124]`.

The R08 surface changes material at the intersection but never introduces air,
an obstacle, or a vertical step into R01.

### 6.5 Grade and clearance

| Measure | Result |
|---|---:|
| Minimum surface Y | 64 |
| Maximum surface Y | 64 |
| Maximum adjacent step | 0 |
| Required headroom | 3 blocks |
| Headroom failures | 0 |
| Bidirectional jump/sprint/crouch requirement | None in offline geometry |

## 7. Material and operation schedule

### 7.1 Palette

| Role | Material |
|---|---|
| Uniform foundation | `minecraft:stone_bricks` |
| Shared route lanes | `minecraft:gray_concrete` |
| Continuous centerline | `minecraft:yellow_concrete` |
| R01 compact crossing edge | `minecraft:white_concrete` |
| Directory base | `minecraft:polished_andesite` |
| Directory pier | `minecraft:stone_bricks` |
| Directory lamp | `minecraft:sea_lantern` |
| Directory face | Exact-state `minecraft:oak_sign[...]` |

### 7.2 Operation counts

| Role | Exact guarded cells |
|---|---:|
| Uniform foundation | 354 |
| Shared cross-link gray surface | 218 |
| Yellow centerline | 118 |
| R01 white crossing | 18 |
| Declared gate clearance | 6 |
| R01 curb crossing clearance | 6 |
| Four directory bases | 4 |
| Four directory piers | 4 |
| Four directory lamps | 4 |
| Four directory signs | 4 |
| **Total REPL targets** | **736** |
| Guarded sign-data commands | **4** |

Every replacement is a one-cell `REPL` with an immutable-snapshot exact source
state. The sign commands use `execute if block <full sign state> run data merge
block ...`.

## 8. Fence physics and exact-state safety

### 8.1 Declared gate cells

Only these six fence cells are removed:

| Gate | Exact target cells |
|---|---|
| `GATE-R08-WEST-MAIN` | `[-8,65,-127]`, `[-8,65,-126]`, `[-8,65,-125]` |
| `GATE-R08-EAST-MAIN` | `[8,65,-127]`, `[8,65,-126]`, `[8,65,-125]` |

All six source guards include the complete:

- east property;
- north property;
- south property;
- waterlogged property;
- west property.

There are no material-only fence guards.

### 8.2 Runtime union guards

Vanilla neighbor physics changes the connection properties of the second and
third fence cells as the first cells become air. Four operations therefore use
a finite union of:

1. the exact immutable-snapshot state; and
2. the exact predicted state after the already-ordered neighbor removal.

The runner expands those four source groups to eight candidate `/fill`
commands and requires exactly one successful alternative per source group in a
strict live transaction.

### 8.3 Adjacent non-target fence cells

Two remaining fence cells react even though they are not direct targets.

| Point | Snapshot exact state | Forward projected exact state | Rollback exact state |
|---|---|---|---|
| `[-8,65,-124]` | `birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]` | `birch_fence[east=false,north=false,south=true,waterlogged=false,west=false]` | Snapshot state |
| `[8,65,-128]` | `birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]` | `birch_fence[east=false,north=true,south=false,waterlogged=false,west=false]` | Snapshot state |

They are modeled, not ignored. Vanilla neighbor physics changes them after the
adjacent gate cell becomes air and restores them after the exact inverse puts
the gate cells back.

### 8.4 Ordering proof

- stateful fence clearance executes first;
- curb and other reactive clearance executes before support/surface changes;
- foundations and surfaces execute afterward;
- sign structures execute last;
- reactive neighbor hazards: zero;
- all reactive operations before support mutations: true.

## 9. Protection proof

### 9.1 Zero-overlap results

| Protected class | Overlap |
|---|---:|
| Accepted R1 target union | 0 |
| Buildings | 0 |
| Rooms | 0 |
| Driveways | 0 |
| Landscapes | 0 |
| Accepted R1 garage bounds | 0 |
| Logs | 0 |
| Leaves | 0 |
| Existing block entities | 0 |
| Undeclared physical fence cells | 0 |

### 9.2 Fence bounding-box interpretation

The database fence features use broad X/Z bounds that enclose whole
neighborhoods. A literal bounding-box veto would classify every safe lawn,
path, and house cell inside a neighborhood as occupied fence.

The package therefore records those coarse containments as expected
false-positive enclosure relations and applies a stricter physical-cell rule:

- exact fence states are enumerated from the immutable snapshot;
- only six declared gate cells may be replaced;
- every other exact fence cell is protected;
- all reactive neighboring fence properties are modeled;
- the two new gate features are included in the database proposal.

### 9.3 Tree and authored-landscape avoidance

The original z=-124 study included a seven-block surface envelope. Survey
found an oak canopy near x=-50..-46 on the north edge of one alternative. R08
is reduced to a three-wide shared surface and shifted so neither leaf nor log
is targeted.

The central two-block offset also avoids the authored sea-lantern markers and
quartz fence piers.

## 10. Wayfinding programme

### 10.1 Directory register

| Feature | Point | Lines |
|---|---|---|
| `R8-WF-R08-CENTRAL` | `[7,64,-132]` | `R08 CROSS-LINK` / `B03 NORTH` / `B02 VIA W ALLEY` / `C01 VIA E ALLEY` |
| `R8-WF-R08-WEST` | `[-63,64,-130]` | `WEST ALLEY` / `S R06 / B02` / `N R07 / B03` / `R08 / R01 >` |
| `R8-WF-R08-EAST` | `[63,64,-130]` | `EAST ALLEY` / `S R06 / C01` / `N R07 / B03` / `< R01 / R08` |
| `R8-WF-WESTLIGHT` | `[6,64,-223]` | `WESTLIGHT VENUE` / `N RAVENSREACH` / `THEN RAVENSGATE` / `W APPROACH RD` |

### 10.2 Venue naming decision

The directories do not use a generic `STADIUM` label for both venues.

- `C01` remains C01 and routes south through the east network.
- `WESTLIGHT VENUE` is named explicitly.
- The Westlight sign states the actual regional chain: north to Ravensreach,
  then Ravensgate, then west on Approach Road.

This does not claim that R08 physically builds the regional Westlight road. It
provides honest destination information at the relevant decision point.

## 11. Database feature proposal

No database mutation occurred.

| Proposed external ID | Kind | Purpose |
|---|---|---|
| `R8-R08-CROSS-LINK` | road | Three-wide shared route and centerline |
| `R8-GATE-R08-WEST-MAIN` | landmark | Declared west inner fence gate |
| `R8-GATE-R08-EAST-MAIN` | landmark | Declared east inner fence gate |
| `R8-JCT-ALLEY-W-R08` | landmark | West Alley endpoint |
| `R8-JCT-R01-R08` | landmark | R01 compact crossing |
| `R8-JCT-R08-ALLEY-E` | landmark | East Alley endpoint |
| `R8-WF-R08-CENTRAL` | landmark | Central district directory |
| `R8-WF-R08-WEST` | landmark | West Alley directory |
| `R8-WF-R08-EAST` | landmark | East Alley directory |
| `R8-WF-WESTLIGHT` | landmark | Regional Westlight directory |

Checks:

- proposed rows: 10;
- unique external IDs: 10;
- existing database conflicts: 0;
- import performed: no.

## 12. Camera and screenshot evidence

### 12.1 Camera quality correction

The first visual pass rejected two images even though their pixel-content
metrics were nonblank:

- the west-gate camera was inside or behind dark building geometry;
- the R01-junction camera was mostly occluded by a near wall.

The corrected contract moves:

- west gate to eye `[-18,78,-112]`, look `[-8,67,-126]`;
- R01 junction to eye `[-1,76,-109]`, look `[0,67,-126]`;
- east gate one clear bay to eye `[23,72,-137]`.

All seven perspective cameras now carry immutable-source:

- 3×3×3 eye-clearance samples;
- a 65-step center visibility ray;
- `eyeClear=true`;
- `visibilityRay.unobstructed=true`.

The corrected west-gate and R01 views were separately visually accepted.

### 12.2 Authoritative provenance

| Artifact | SHA-256 |
|---|---|
| Corrected camera manifest | `b86e37b3d4817b798b768053d517722eb92de3357792e4827393964432c76686` |
| Authoritative capture report | `09307c0a83f98430f52cf114a9ef9562d5bb7621380fd4db3a86d59dabce22a7` |
| Capture report source-manifest binding | `b86e37b3d4817b798b768053d517722eb92de3357792e4827393964432c76686` |

The earlier duplicate report was bound to manifest `7635f0…` and did not match
the corrected PNG set. It is retained only as:

`data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/rejected-stale-capture-report-7635f0.json`

It is rejected evidence, not a PASS report. The only authoritative PASS report
is:

`data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/before-capture-report.json`

### 12.3 Baseline image register

| Camera | Bytes | SHA-256 | Purpose |
|---|---:|---|---|
| `01-r08-overall-map.before.png` | 23,763 | `27683aaaed6bb17bd0d27c3b5f966756cb1cb60846be7922b9a67b5e4293fb73` | Full R08 study area |
| `02-west-endpoint.before.png` | 78,579 | `1e97d2317c0b1ed2b2271edfb7a73acb3f18d6158d60657e3f58c669eb032b24` | West Alley connection |
| `03-west-gate.before.png` | 158,527 | `965f2b5f5947a0618c0227385e3f54dc3f839642ea5d7fb1574c6cb1a9f26078` | Corrected west gate |
| `04-r01-junction.before.png` | 111,007 | `c1f3ce5425cdcd6a0d8c3fbb6f7afe5c3f76f0b4760e94f8fa921f5579ad4566` | Corrected R01 continuation |
| `05-east-gate.before.png` | 118,873 | `ba568f249724c457934dd694007a3b30838c671f89ac283f585fb980aa27110a` | East gate |
| `06-east-endpoint.before.png` | 91,014 | `8a97f2fafef178a1520d477000e27ef5955f5c67d0469a9c6246613572b66c7e` | East Alley connection |
| `07-r08-directory.before.png` | 87,469 | `318c1e3844984d3768b92939d612dd98f4efeeb56b63fc784303a4228b074155` | Central directory object location |
| `08-westlight-directory.before.png` | 102,485 | `6e454e287b55b889e3fd48de20b5c681a0ecddcdc9d07ed42866c1dba9d98506` | Regional directory object location |

All eight pass nonblank image checks and are bound to the immutable source
snapshot.

## 13. Guard, parser, rollback, and test evidence

### 13.1 Exact preflight

Command:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/mainstreet-wave2-r08-2026-07-28.txt \
  --regions data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --report data/buildops/mainstreet-wave2-r08-2026-07-28.preflight.json
```

Result:

- operation groups checked: 736;
- passed: 736;
- failed: 0;
- partial masks: 0.

### 13.2 Forward parser dry-run

Command:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-wave2-r08-2026-07-28.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-wave2-r08-2026-07-28.forward-dry-run.json
```

Result:

- source operations: 740;
- source groups: 740;
- expanded commands: 744;
- finite-union groups: 4;
- WorldEdit leftovers: 0.

### 13.3 Rollback parser dry-run

Command:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-wave2-r08-2026-07-28.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-wave2-r08-2026-07-28.rollback-dry-run.json
```

Result:

- source operations: 736;
- expanded commands: 736;
- WorldEdit leftovers: 0.

### 13.4 Independent QA

Command:

```bash
node scripts/qa_mainstreet_wave2_r08.mjs
```

Result:

- checks: 32;
- passed: 32;
- failed: 0;
- decision: `PASS_OFFLINE_ONLY`.

### 13.5 Focused tests

Command:

```bash
npx vitest run test/build/generateMainstreetWave2R08.test.ts
```

Result:

- files: 1 passed;
- tests: 8 passed;
- failed: 0.

Machine-readable test output:

`data/world-review/mainstreet-wave2-r08-focused-tests-2026-07-28.json`

### 13.6 Backend build

Command:

```bash
npm run build
```

Result: TypeScript compilation passed.

## 14. Exact rollback contract

The rollback contains 736 operations in strict reverse order.

For each forward operation:

- rollback coordinates equal forward coordinates;
- rollback expected state equals the forward replacement;
- rollback replacement equals the first exact immutable-snapshot source state;
- directory signs are removed by the inverse sign-block replacement, so their
  block entities are removed with the blocks;
- restored gate cells cause the two modeled adjacent fence cells to reconnect
  through vanilla neighbor physics.

The rollback is valid only after the exact complete forward package. It must
not be applied to a partially executed package or a differently regenerated
package.

## 15. Future live release runbook

This section is a future operator contract, not permission to execute now.

1. Stop or coordinate every other active builder in the R08 and camera
   envelopes.
2. Save the world.
3. Copy the relevant Anvil region files to a new immutable snapshot directory.
4. Hash that directory.
5. Update the plan only if the new hash intentionally supersedes this baseline.
6. Regenerate forward, rollback, report, design, and camera manifest.
7. Run the exact guard preflight against that same immutable directory.
8. Confirm zero protected overlaps, zero new block entities, and the same six
   declared gate cells.
9. Perform a live entity-clear sweep over all operation chunks.
10. Render or capture the same-camera before set from the live release
    baseline.
11. Execute the entire forward package as one strict transaction.
12. Fail closed on any zero-match, multi-match, unknown response, or partial
    group.
13. Walk west→east.
14. Walk east→west.
15. Walk R01 north→south across the new crossing.
16. Walk R01 south→north across the new crossing.
17. Walk from each new endpoint onto its existing alley.
18. Read and verify all four directory signs in world.
19. Verify both remaining reactive fence ends have the predicted disconnected
    property.
20. Capture all eight after images with unchanged camera geometry.
21. Refresh the world catalog and object/media crosswalk.
22. Import the ten database feature proposals only after physical acceptance.
23. If any required check fails, stop and choose between exact rollback or a
    new reviewed forward repair; do not improvise an unguarded partial fix.

## 16. Deferred MainStreet work

R08 is not presented as the final MainStreet master plan.

### 16.1 Full outer-street connection

The next grid study can evaluate whether R08 should eventually extend from the
rear alleys to R02 and R03. That work must separately solve:

- outer fence gates;
- B02's close east edge;
- R02/R03 curb geometry;
- property/frontage hierarchy;
- safe camera and sightline positions;
- whether an outer connection would become unwanted fast through traffic.

### 16.2 R02 widening

Continue as a measured study only. A future package needs exact collision and
grade sections, not a blanket two-block expansion.

### 16.3 B02

B02 should remain in place unless a complete relocation model proves:

- better road and loading access;
- no loss of authored rooms;
- a valid rollback or rebuild strategy;
- database parent and geometry migration;
- better media/readability at eye level.

### 16.4 B03

B03's R07/service identity was improved in R1. A later wave should judge it
against visitor approach cameras and determine whether frontage or landmark
work is still needed before considering movement.

### 16.5 C01 and Westlight

R08 fixes naming and decision information; it does not solve the full regional
venue journey. The later regional phase should audit:

- continuous MainStreet → Ravensreach route identity;
- Ravensreach → Ravensgate transition;
- Ravensgate → Approach Road junction;
- Approach Road → Westlight entrance;
- Westlight entrance, concourse, seating, and screen sightlines;
- C01 Training Arena identity as a separate destination.

## 17. Artifact register

| Artifact | Purpose | SHA-256 |
|---|---|---|
| `mainstreet-america/planning/redevelopment-wave2-r08.yaml` | Reviewed source plan | `d9aac8851bc8510a4916cac8bff8201941f50f400897e66ad1f14a4f7fc12771` |
| `scripts/generate_mainstreet_wave2_r08.mjs` | Deterministic generator | `d9e5b8427a7091aec005e54d8a80afde71a09540d2289789689c2b434840e0a8` |
| `scripts/qa_mainstreet_wave2_r08.mjs` | Independent read-only QA | `35038db7529c9486da7abb5d3846d058d0e12947c20bb87caf25d54cf8869915` |
| `test/build/generateMainstreetWave2R08.test.ts` | Focused test contract | `861f8a8c002318f0f23468c5df549716d77468c6bffdfc890cd792731772c12c` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.txt` | Forward operations | `c3a88baeb9c07fa87d2bcbc5c96cbc5ef16ce3b26d429856bd6608af51029db9` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.rollback.txt` | Exact inverse | `60a487cb4d92bc9afdf435deac528375413bf8394fa1aff0afcc50407b61497a` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.report.json` | Authoritative engineering report | `3596ab30663f7af156a8bc71a6ea4779f214566c2cd5c14e900c3524e3ef23f1` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.preflight.json` | Exact source guard proof | `a22784ff75c213ed8fb002fc2cb94e8b8d4b1b96b97af66e3b757d01bd71e552` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.forward-dry-run.json` | Forward parser proof | `f0e1d820b4d7e896a3c0b3a4b3de325f1590fadf82678698121485a1814078a9` |
| `data/buildops/mainstreet-wave2-r08-2026-07-28.rollback-dry-run.json` | Rollback parser proof | `0421e0fd41ad29b464bf6cbd842e0a48b326fcaa6ed10251e2f020b857eda2d8` |
| `data/world-review/mainstreet-wave2-r08-design-2026-07-28.json` | Exact design/protection record | `a9ede6e98cfcf599a001002f844ed0c870ce26ced6daa5901802dd235a4d1a1b` |
| `data/world-review/mainstreet-wave2-r08-independent-qa-2026-07-28.json` | 32-check independent QA | `16bb93a4936328ac65f5e5929cacc2f07994b6cef33f74e91af945fd8be98ec3` |
| `data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/same-camera-manifest.json` | Corrected camera contract | `b86e37b3d4817b798b768053d517722eb92de3357792e4827393964432c76686` |
| `data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/before-capture-report.json` | Authoritative baseline capture proof | `09307c0a83f98430f52cf114a9ef9562d5bb7621380fd4db3a86d59dabce22a7` |
| `data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/rejected-stale-capture-report-7635f0.json` | Explicitly rejected stale provenance | `aa3c3337beeb6fc4d502eab29ddde84287458fbf5b4fbe9fdaefa7360779f57c` |

## 18. Final handoff state

| Dimension | State |
|---|---|
| Design selected | Yes |
| Exact geometry frozen | Yes |
| Forward ops generated | Yes |
| Exact rollback generated | Yes |
| R1 overlap | Zero |
| Protected-feature overlap | Zero |
| Fence physics modeled | Complete for six targets and two reactive neighbors |
| Database proposal | Ten rows, not imported |
| Camera contract | Corrected and source-ray validated |
| Authoritative baseline screenshots | Eight |
| Independent QA | 32/32 PASS |
| Focused tests | 8/8 PASS |
| Build | PASS |
| Live execution | **Not authorized / not performed** |

The correct programme state is:

`OFFLINE ENGINEERING GO — LIVE EXECUTION NOT AUTHORIZED`
