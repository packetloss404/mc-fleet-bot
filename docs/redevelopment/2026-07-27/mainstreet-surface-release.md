# GrandStreet America R4/R5 rear-alley engineering release

Date: 2026-07-27  
Program-facing name: GrandStreet America  
Repository/database identifier: `mainstreet-america`  
Package: `mainstreet-america-redevelopment-r4-r5`  
Engineering state: **implementation-ready**  
Live state: **authorized; fresh-snapshot, entity, and supervised live-QA gates pending**  
Live execution performed: **no**

## 1. Outcome

This package converts the R4 residential-frontage and R5 support-building plan
into one atomic, exact-state-guarded operation set tied to the immutable
snapshot:

`c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`

The final offline result is:

- 18 of 18 houses have a usable garage relation;
- H01–H12 keep their Main Street front doors and front gardens;
- H01–H06 garages are rear/outward on the west side and use `ALLEY-W`;
- H07–H12 garages are rear/outward on the east side and use `ALLEY-E`;
- C02/C04/C06 retain R02 side-garage access;
- C03/C05/C07 retain R03 side-garage access;
- both shared rear alleys are three blocks wide and have a maximum adjacent
  grade step of one block;
- five planned alley/public-street connections are complete;
- B02 gains a culinary forecourt and identity pylons without moving;
- B03 gains a service approach, identity pylons, and landscape screening
  without moving;
- six decision-node road-marking groups are ready;
- no building is relocated;
- no protected building is intersected;
- no block entity is targeted;
- no operation is skipped;
- no operation target conflicts with another;
- 5,981 of 5,981 exact source guards pass against the frozen snapshot;
- the 5,981-operation rollback is an exact reverse-order inverse;
- ten immutable-baseline images are captured and bound to exact object IDs in
  the same-camera manifest.

The package is deliberately not a live completion claim. All quality records
retain explicit live-use and post-release-media pending states.

## 2. Governing correction

An early engineering draft placed H01–H12 garage pavilions between the houses
and R01. That contradicted the adopted master plan and GA-02. It was discarded
even though its block guards passed.

The accepted design follows:

- `master-plan.md` §6.1–6.2;
- `infrastructure-standards.md` GA-01 through GA-04;
- the preferred M-B alternative: three public spines with rear alleys;
- the requirement that a garage face sit at least two blocks behind the
  principal façade;
- the requirement that the garage route remain subordinate to the public front
  walk and garden.

The generator now treats a front-garden H garage as a plan validation failure.
Every H garage must reference `ALLEY-W` or `ALLEY-E`, and every H geometry must
lie outward of the fixed house bounds.

## 3. Source and reproducibility contract

### 3.1 Frozen source

| Item | Value |
|---|---|
| Snapshot | `data/worldsnap-redevelopment-c9e2bf0a-20260727/region` |
| Snapshot files | 26 Anvil region files |
| Snapshot hash | `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654` |
| Hash algorithm | SHA-256 of sorted `filename + NUL + bytes + NUL` |
| Plan | `mainstreet-america/planning/redevelopment-r4-r5.yaml` |
| Plan hash | `ab2647e746ea211082eb0eee0f2fa8c858878ab9e86a631d19bedf31950088a0` |

The generator reads the snapshot only. It does not connect to the Minecraft
server and does not write to the live world.

### 3.2 Principal artifacts

| Artifact | SHA-256 | Purpose |
|---|---|---|
| Forward operations | `c61649579ceccc6265305fd191d79d791d1b2859976d9ab8cf858cc0b0eb4514` | 5,981 exact guarded changes |
| Rollback operations | `98427f36c43e2f0a76f394cfafb40669d5e0c4ff105272d1e949c6fe3e264efd` | 5,981 exact reverse-order inverses |
| Engineering JSON | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` | Full garage, alley, grade, protection, diagnostic, and DB-feature record |
| Design JSON | `eb5665f0961d7959c16fe769ba7226dda62ff0d74c9b71e56ad309cabc9aac63` | Review-oriented design document |
| Guard preflight | `25c41e5f7cd69a731a7c5f6c505f06bdb0fb6d7fd6b2cb47a03e02906df54d96` | Independent 5,981/5,981 source-state proof |
| Forward dry-run JSON | `18fb7e442522fa703ed4c8068c5ad98de35606919df6af8451d23a592c33c665` | Strict parser evidence tied to the forward-operation hash |
| Rollback dry-run JSON | `80bb879f06dfc14d2982c851e6985c77f54993d740cae30da27113236ea34c60` | Strict parser evidence tied to the rollback-operation hash |
| Same-camera manifest | `f0387ec5b1f983b468633d59672b4ad00de7a500ebcd001e600d5c48e452f5c5` | Ten captured before images and ten exact after-image contracts |

The release summary is
`data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.release.json`.

## 4. House-by-house garage schedule

Bounds below are `minX..maxX / minZ..maxZ`. All modules are 7×7 externally,
5×5 internally, have a three-wide by three-high portal, and use a three-wide
access route.

| House | Public frontage | Garage access | Placement | Bounds | Floor Y | Door | Rear setback | Offline result |
|---|---|---|---|---|---:|---|---:|---|
| H01 | R01 | ALLEY-W | rear/outward | `-55..-49 / 51..57` | 64 | west | 32 | usable |
| H02 | R01 | ALLEY-W | rear/outward | `-55..-49 / 1..7` | 64 | west | 28 | usable |
| H03 | R01 | ALLEY-W | rear/outward | `-55..-49 / -51..-45` | 64 | west | 32 | usable |
| H04 | R01 | ALLEY-W | rear/outward | `-55..-49 / -101..-95` | 64 | west | 30 | usable |
| H05 | R01 | ALLEY-W | rear/outward | `-55..-49 / -152..-146` | 64 | west | 33 | usable |
| H06 | R01 | ALLEY-W | rear/outward | `-56..-50 / -202..-196` | 64 | west | 34 | usable |
| H07 | R01 | ALLEY-E | upper rear terrace | `53..59 / 53..59` | 78 | east | 41 | usable |
| H08 | R01 | ALLEY-E | upper rear terrace | `53..59 / 0..6` | 71 | east | 39 | usable |
| H09 | R01 | ALLEY-E | upper rear terrace | `53..59 / -55..-49` | 77 | east | 41 | usable |
| H10 | R01 | ALLEY-E | rear/outward | `48..54 / -104..-98` | 64 | east | 36 | usable |
| H11 | R01 | ALLEY-E | rear/outward | `48..54 / -151..-145` | 64 | east | 28 | usable |
| H12 | R01 | ALLEY-E | rear/outward | `47..53 / -194..-188` | 64 | east | 32 | usable |
| C02 | R02 | R02 | side | `-79..-73 / 5..11` | 68 | west | n/a | usable |
| C03 | R03 | R03 | side | `73..79 / 45..51` | 78 | east | n/a | usable |
| C04 | R02 | R02 | side | `-79..-73 / -58..-52` | 64 | west | n/a | usable |
| C05 | R03 | R03 | side | `73..79 / -57..-51` | 79 | east | n/a | usable |
| C06 | R02 | R02 | side | `-79..-73 / -202..-196` | 64 | west | n/a | usable |
| C07 | R03 | R03 | side | `73..79 / -152..-146` | 64 | east | n/a | usable |

The H setbacks are measured from the registered R01 principal façade to the
garage door face. The minimum is 28 blocks, well above the two-block standard.
More importantly, each H garage lies entirely outward of the house bounds, so
the result cannot occupy the R01 front-garden zone.

## 5. Shared rear alleys

| Route | Width | Z range | Rows | Max cut/fill | Step | Elevation changes | Sign reversals | One-cell oscillations | Public connections |
|---|---:|---|---:|---:|---:|---:|---:|---:|---|
| ALLEY-W | 3 | `-218..70` | 289 | 3 / 3 | 1 | 22 | 3 | 0 | R07, R06, R05 |
| ALLEY-E | 3 | `-218..70` | 289 | 1 / 2 | 1 | 32 | 2 | 0 | R07, R05 |

Each route is a full three-dimensional centerline, not a flat two-dimensional
diagram. The grade solver:

1. reads the exact surface and three-block headroom at every lane cell;
2. permits only named natural material, approved public paving, and approved
   ornamental driveway clearance;
3. rejects protected hard material, structures, fluids, and missing chunks;
4. solves an integer grade constrained to one block between adjacent rows,
   minimizing feasible sign reversals before terrain cost and vertical steps;
5. limits every cut and fill to the route-specific plan cap;
6. holds garage portals and public-road junctions to explicit grade anchors;
7. requires at least two level rows between opposite grade directions;
8. rejects adjacent opposing slopes and one-cell peaks/troughs;
9. emits one exact replacement guard for every changed block.

The corrected profiles replace the rejected sawtooth draft. ALLEY-W fell from
48 elevation changes and 26 sign reversals to 22 and 3. ALLEY-E fell from 46
and 13 to 32 and 2. Both now report zero adjacent opposing step pairs, zero
one-cell peaks/troughs, and a minimum two-row plateau at each reversal.

### 5.1 Protected-terrain shifts

The alleys are centered near x=-59 and x=58, but a perfectly straight line
would cut mature trunks, a crafting station, gate structures, and severe
retaining edges. The approved path therefore shifts laterally by no more than
one block per row.

Notable controlled shifts include:

- ALLEY-W moves around the acacia trunk near z=-154;
- ALLEY-W avoids the crafting table near x=-59, z=-53;
- ALLEY-W crosses the west terrace transition with a bounded one-step profile;
- ALLEY-E connects R07 at x=50 to preserve the mature tree group near the
  nominal x=58 line, then returns to x=58;
- ALLEY-E shifts around the protected hard points near z=-86 and z=-29;
- ALLEY-E shifts to x=63 to serve the H09, H08, and H07 upper rear terraces;
- both alleys terminate in defined turn pads after serving H01/H07.

No tree trunk is removed by this package.

### 5.2 R04 disposition

R04 is not an alley connection in this release. On the immutable snapshot, the
east interstitial terrace drops roughly 15 blocks at z=79→80. Forcing a
three-wide vehicle route into R04 would require an excessive cut, unsupported
fill, or major retaining structure beyond the lower-risk R4/R5 scope.

Instead, both rear alleys connect R07 to R05, the west alley additionally
connects R06, and both continue past R05 to turn pads serving H01/H07. A future
R04 connection requires a separate retaining/ramp package and its own terrain,
drainage, sightline, and rollback review.

## 6. Public frontage and support buildings

### 6.1 Frontage assignments

The 20 unique assignments are:

- R01: H01–H12;
- R02: C02, C04, C06, B02;
- R03: C03, C05, C07;
- SERVICE: B03.

Public address and service access are deliberately separate. The rear alleys
do not become the front address of an H house.

### 6.2 B02 culinary threshold

B02 remains at its registered bounds. The package adds:

- a 7×7 R02 forecourt at x=-87..-81, z=-98..-92, finished at y=64;
- an orange identity band;
- two illuminated identity pylons;
- the orange R01/R06 and R02 gate markings.

The intervention improves the perceived relationship between the cooking
school and the street without moving the building or entering its interior.

### 6.3 B03 service identity

B03 remains at its registered bounds. The package adds:

- a seven-wide service approach between z=-231 and z=-219;
- a blue center identity stripe;
- two service pylons;
- four landscape-screen segments on the service/rear edges;
- blue R01/R07 and R02/R07 markings.

The generator’s broad B03 review envelope contains existing barrels and a
blast furnace, but none is targeted. The targeted block-entity count is zero.

## 7. Operation census

| Role | Exact operations |
|---|---:|
| Shared alley surface | 1,734 |
| Alley turn pads | 12 |
| Garage floor | 882 |
| Garage walls/lintels | 1,566 |
| Garage roof | 882 |
| Garage driveway surface | 132 |
| Bounded grade cut | 126 |
| Bounded grade fill | 28 |
| Approved driveway/fence clearance | 42 |
| Soft headroom clearance | 278 |
| Wayfinding inlay | 30 |
| Culinary forecourt | 46 |
| Identity pylons | 12 |
| Pylon lights | 4 |
| B03 service lane | 91 |
| B03 landscape screen | 116 |
| **Total** | **5,981** |

Every operation is a one-cell exact-state `REPL`. This is intentionally verbose:
it prevents a generic fill from overwriting a changed or unexpected source
block.

## 8. Protection record

The generated package reports:

- 23 registered protected building/compound bounds;
- zero garage/building intersections;
- zero alley/building intersections;
- zero targeted block entities;
- zero unresolved collisions;
- zero skipped garages or operations;
- zero duplicate/conflicting target cells;
- zero live writes.

The operation bounds are x=-87..85, y=61..84, z=-282..70.

Approved removals are limited to exact-matched natural grading material,
replaceable plants, and specifically named ornamental/public-route clearance.
The generator fails closed on other hard material.

## 9. Database feature contract

The engineering report contains 31 unique `databaseFeatures` definitions:

| Kind | Count | Content |
|---|---:|---|
| custom | 18 | One exact 3D garage record parented to each H/C building external ID |
| road | 3 | ALLEY-W, ALLEY-E, and the B03 service lane |
| landscape | 2 | B02 forecourt and B03 service screen |
| landmark | 8 | B02/B03 pylons plus six junction marking groups |

All 21 referenced parents exist in the read-only database: H01–H12, C02–C07,
B02, B03, and SITE. There are no missing parent references and no duplicate
feature external IDs.

Each feature separates:

- functional status;
- legibility status;
- media status.

No feature receives a default score of 100. All remain planned with completion
ratio zero until live execution and post-release QA succeed.

The 18 garage records include exact bounds from floor through roof, public
frontage, access route, placement type, portal dimensions, driveway width,
rear setback, snapshot hash, and source references. These definitions are
ready for the standard post-release importer only after post-release QA passes.

## 10. Verification evidence

### 10.1 Generator acceptance

All acceptance checks pass, including the user’s live-mutation authorization:

- snapshot hash matches;
- plan valid;
- requested garages present;
- every garage usable;
- no garage skipped;
- shared alleys complete;
- all five alley connections complete;
- alley grades walkable;
- alley grades deliberate, with zero sawtooth defects;
- no front-garden garages;
- minimum rear setback met;
- frontage assignment count correct;
- no building relocation;
- no protected-building intersection;
- no targeted block entity;
- no unresolved collision;
- no operation conflict;
- all operations exact guarded;
- rollback exactly invertible;
- live mutation authorized, subject to the release gates below.

### 10.2 Independent source preflight

Command:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region \
  --report data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.preflight.json
```

Result: **5,981 passed, 0 failed, 0 partial masks** across 76 census chunks.

### 10.3 Strict parser dry-runs

Forward:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.forward-dry-run.json
```

Result: 5,981 operations → 5,981 `/fill` commands, zero WorldEdit fallbacks.
The raw JSON embeds the exact forward SHA-256 and reports zero failures.

Rollback:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.rollback-dry-run.json
```

Result: 5,981 operations → 5,981 `/fill` commands, zero WorldEdit fallbacks.
The raw JSON embeds the exact rollback SHA-256 and reports zero failures.

### 10.4 Focused test suite

```bash
npx vitest run test/build/generateMainstreetRedevelopmentR4R5.test.ts
```

Result: **1 test file passed; 6 tests passed; 0 failed**.

The suite checks plan placement, alley continuity, grade solving, the generated
18/18 result, unique exact targets, rollback bijection, database parents,
feature geometry, and non-inflated status records.

The repository backend build also passes with `npm run build`.

## 11. Atomicity and rollback

The forward file is one atomic package. Executing only the garages, only one
alley, or only the public-realm work is not an accepted condition because the
functional tests and database definitions describe the combined result.

The rollback file:

- contains exactly 5,981 operations;
- reverses forward operation order;
- swaps every expected and replacement state;
- is valid only after the exact forward package has completed;
- must be preflighted against a content-addressed post-release snapshot before
  use.

Do not use the rollback against the original baseline: its guards intentionally
expect the forward replacement states.

## 12. Mandatory live-release sequence

The user authorized implementation. Execution remains gated by the following
fresh-state and supervised-QA sequence:

1. stop or coordinate all overlapping MainStreet world-building work;
2. freeze a fresh saved-world snapshot;
3. compare the fresh snapshot hash to this package baseline;
4. regenerate if the hash differs;
5. run the standard live entity gate over the complete operation bounds;
6. review all reports, operations, protected entities, and terrain shifts;
7. execute the complete forward file atomically;
8. freeze a post-release snapshot immediately;
9. run bidirectional alley movement tests;
10. test all 18 garage portals and interior bays;
11. verify every R01 front walk and garden remains independently reachable;
12. capture object-matched screenshots;
13. run post-release database/media QA;
14. import the 31 database features only after QA passes.

## 13. Required post-release media

### 13.1 Captured immutable-baseline set

The package already contains ten before images under
`data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/before/` and the
machine-readable contract at
`data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/same-camera-manifest.json`.

The set covers the district map and oblique, both rear alleys, representative
west/east house-garage relationships, B02 culinary threshold, B03 service
screen context, R07 connections, and the central R05/R06 context. Every record
contains the immutable snapshot hash, image SHA-256, dimensions, nonblank
metrics, exact feature targets, camera key, and required after filename. All
ten images passed chunk-presence, ray-hit where applicable, color, luminance,
and file-size checks. The ten after images remain pending implementation and
must reuse the camera keys and lighting contract.

The minimum same-snapshot capture set is:

- one north-up proposed district map;
- one garage/frontage map with all 18 garage IDs and both alley centerlines;
- one service/road map showing R01/R02/R03, R05/R06/R07, and B02/B03;
- H01–H12: front façade, rear garage/alley relation, portal, and interior bay;
- C02–C07: public frontage, side garage relation, portal, and interior bay;
- ALLEY-W and ALLEY-E: both directions at each connection and turn pad;
- every protected-terrain shift noted in §5.1;
- B02 forecourt and both pylons from four directions;
- B03 public edge, service approach, screen, pylons, and loading relationship;
- all six wayfinding groups from eye level;
- matched before/after views using recorded camera coordinates.

Every capture must link to the relevant database feature external ID and the
accepted post-release snapshot hash.

## 14. Current release decision

Offline engineering: **GO**  
Live execution:
**IMPLEMENTATION-READY — fresh snapshot, entity-clear confirmation, and
supervised live QA pending**  
Reason: the user authorized implementation and the package is complete against
the pinned baseline. The fresh-state gates prevent stale exact guards,
entity overlap, or an unreproducible before/after record.

## 15. Independent R4/R5 QA addendum

An independent checker treated the generator report as an untrusted claim and
reconstructed the release from the immutable Anvil snapshot, read-only SQLite
records, raw operation files, rollback, parser reports, and media files. Its
machine-readable result is:

`data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.independent-qa.json`

Independent decision:
**PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING**. All **24 of 24** assertions
passed. No live RCON command was sent.

### 15.1 Independent evidence

| Gate | Independently verified result |
|---|---|
| Exact source state | 5,981 of 5,981 forward guards match the frozen snapshot |
| Atomic rollback | 5,981 of 5,981 cells form an exact reverse-order bijection |
| Unsafe/generic writes | 0 `SET` operations; 0 invalid or multi-cell guards |
| Target integrity | 0 duplicate targets; 0 cross-feature target conflicts |
| Garages | 18 of 18 rear/outward or side placements usable; portal, bay, roof, driveway, headroom, and road connection checked cell by cell |
| Alleys | 2 of 2 continuous; all 1,734 surface cells and their headroom checked; all five public-road connections resolve |
| Protected buildings | 23 registered bounds checked; 0 target intersections |
| Block entities | 276 chunks read; 326 block entities censused; 0 targeted |
| Parking | 237 parking-related feature records, including 236 stall records, checked; 0 target intersections |
| Database contract | 31 feature definitions checked; 0 duplicate IDs; 0 missing parents; garage and alley geometry matches the operation package |
| Parser/preflight | Forward and rollback each parse to 5,981 strict commands; preflight is 5,981 pass / 0 fail |
| Matched media | 10 immutable-baseline captures verified by file hash, camera key, dimensions, and nonblank thresholds |

### 15.2 Grade-defect disposition

The first candidate was rejected as release-blocking because its one-block
terrain following produced an incoherent sawtooth profile. The corrected
package was then recomputed independently:

| Route | Rejected elevation changes / reversals | Final elevation changes / reversals | Adjacent opposing slopes | One-cell peaks/troughs | Minimum reversal plateau |
|---|---:|---:|---:|---:|---:|
| ALLEY-W | 48 / 26 | 22 / 3 | 0 | 0 | 2 rows |
| ALLEY-E | 46 / 13 | 32 / 2 | 0 | 0 | 2 rows |

Both final routes retain a maximum adjacent vertical step of one block. The
corrected profiles are deliberate ramps and plateaus rather than repeated
single-cell reversals.

### 15.3 Content-addressed release proof

| Evidence | SHA-256 |
|---|---|
| Forward operations | `c61649579ceccc6265305fd191d79d791d1b2859976d9ab8cf858cc0b0eb4514` |
| Rollback operations | `98427f36c43e2f0a76f394cfafb40669d5e0c4ff105272d1e949c6fe3e264efd` |
| Engineering report | `aff9a31233c94c301d54aa3519200860615005aa5dc720f67a57b4d20e25dbb6` |
| Design report | `eb5665f0961d7959c16fe769ba7226dda62ff0d74c9b71e56ad309cabc9aac63` |
| Guard preflight | `25c41e5f7cd69a731a7c5f6c505f06bdb0fb6d7fd6b2cb47a03e02906df54d96` |
| Forward dry-run | `18fb7e442522fa703ed4c8068c5ad98de35606919df6af8451d23a592c33c665` |
| Rollback dry-run | `80bb879f06dfc14d2982c851e6985c77f54993d740cae30da27113236ea34c60` |
| Same-camera manifest | `f0387ec5b1f983b468633d59672b4ad00de7a500ebcd001e600d5c48e452f5c5` |
| Independent QA JSON | `6540664cb697c27fdee9389a56f3e0f106c3029332cc05c31eb60c276ea37832` |

This addendum does not waive the mandatory live-release sequence in §12.
A fresh snapshot/hash comparison, live-entity clearance, supervised atomic
execution, movement/portal testing, post-release snapshot, and matched after
captures remain required before any feature can be marked completed or scored.

## 16. Runtime-safe successor package

The 5,981-operation package documented above is retained unchanged as Attempt 1
evidence. Its live strict-noop failure and compensated rollback are documented
in `release-attempt-1-incident.md`.

The distinct runtime-safe successor is documented in
`mainstreet-runtime-safety-follow-up.md`. Its frozen forward hash is
`c96958c9ce7c3a2e9d481d5063bc0cbd26d0879068967c1d66ca06943b9b2972`;
it contains 5,561 source operations, 27 declared finite exact-state fence
unions, zero tall-grass targets, and passed 27 of 27 independent assertions.
Nothing in this section modifies or retracts the independent Attempt 1 record
in §15.
