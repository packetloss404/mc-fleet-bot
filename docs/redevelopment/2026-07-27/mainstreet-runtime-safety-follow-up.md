# MainStreet R4/R5 runtime-safety follow-up

Date: 2026-07-27  
Program-facing name: GrandStreet America  
Repository/database identifier: `mainstreet-america`  
Scope: failed 5,981-operation attempt and runtime-safe regeneration  
Live commands issued by this independent review: **none**

## 1. Decision record

The original package is **rejected for any further execution**. Its offline
geometry was sound, but its command order and declared reactive block states
were not runtime-safe under Minecraft neighbor updates.

The replacement package must be regenerated from the immutable rollback-check
snapshot:

`data/worldsnap-rollbackcheck-64829086424cde6f-20260727/region`

Snapshot SHA-256:

`64829086424cde6f0bbf8db9166a152daf753ae2c3cf5652ba165dddc8229142`

This document will record the independent replacement-package verdict after
the distinct runtime-safe artifacts are frozen.

## 2. Failed execution facts

| Measure | Result |
|---|---:|
| Forward operations attempted | 5,981 |
| Commands reporting success | 5,651 |
| Strict no-ops/failures | 330 |
| Failure texts retained by runner | 8 |
| Emergency rollback operations | 5,981 |
| Emergency rollback replies reporting no-op | 168 |
| Operation target cells differing from original after rollback | 338 |

The live report was strict and correctly failed the release when a command
reported that no block was filled. The emergency rollback was intentionally
non-strict and therefore cannot be treated as proof that the original state was
restored.

## 3. Independent root-cause reconstruction

### 3.1 Support-first plant invalidation

The operation order changed terrain/support blocks before later commands tried
to remove exact short- or tall-grass states. Minecraft neighbor updates removed
or altered those plants before their guards were evaluated.

The independent static analysis identified 311 support-dependent operations
exposed to this ordering error. The retained execution examples at lines 423,
424, 433, 434, and 449 are direct observations of the mechanism.

### 3.2 Connected-fence serialization

The package removed connected birch-fence cells one at a time while guarding
later cells with their original full connection properties. Removing one fence
updated the east/west/north/south properties of its neighbor, so the later
exact guard no longer matched.

The independent conservative analysis found 31 fence-neighbor hazard edges.
The retained execution examples at lines 417, 420, and 453 directly confirm
this mechanism.

### 3.3 Leaf-distance normalization

The B03 screen declared 116 persistent spruce-leaf placements with
`distance=1`. No supporting log path existed in the completed leaf graph, so
the saved world contains all 116 as `distance=7`.

This mismatch did not need to produce a forward no-op: the forward command
could place a leaf and still allow the server to normalize its state. It became
a rollback failure when the inverse guard expected the never-stable
`distance=1` state.

### 3.4 Reverse-order dependency failure

Because the original forward order changed support before clearing dependent
plants, the exact reverse attempted to restore plants before restoring
compatible soil. The independent rollback-order analysis found 311 unsupported
desired plant placements.

### 3.5 Double-plant component risk

Tall grass is a two-block component. Removing either half can invalidate the
other through a neighbor update, so two independently guarded single-cell
removals are not assumed safe merely because the upper cell is listed first.
The replacement package must avoid those components or provide a separately
proven component transaction and rollback. A one-cell reverse-order bijection
alone does not prove this behavior.

## 4. Rollback-check drift census

The independent checker reread all 5,981 operation targets in both the original
baseline and the rollback-check snapshot.

| Original base state | Changed targets |
|---|---:|
| Short grass | 215 |
| Air | 97 |
| Leaf litter | 12 |
| Tall grass | 11 |
| Dandelion | 3 |
| **Total** | **338** |

The rollback-check result contains:

| Current base state | Targets |
|---|---:|
| Air | 222 |
| Spruce leaves | 116 |
| **Total** | **338** |

By operation role:

| Role | Changed targets |
|---|---:|
| Headroom clearance | 189 |
| B03 service screen | 116 |
| Garage wall | 32 |
| Garage floor | 1 |

These 338 cells are now part of the replacement baseline. The new package must
guard against the rollback-check snapshot rather than pretending the original
snapshot was restored.

## 5. Evidence limitations

- The execution runner persisted only the first eight failed command texts, so
  the remaining 322 exact no-op line identities cannot be reconstructed as
  direct observations.
- The static hazard set is conservative and is not represented as a one-to-one
  list of the 330 server replies.
- The rollback-check snapshot records the state after emergency rollback, not
  the intermediate partially completed forward state.
- The original plan bytes were not archived with the attempt and the plan was
  subsequently updated.

These limitations do not weaken the observed root-cause classes: every retained
failure example maps to a predicted support or fence-neighbor hazard, and the
saved-world drift independently proves the plant and leaf-state effects.

## 6. Replacement acceptance gates

The runtime-safe package will pass independent review only if all of the
following are true:

1. every forward exact guard matches the rollback-check snapshot or a
   separately reconstructed earlier neighbor-derived runtime state;
2. every forward target is unique and every rollback cell is its exact inverse;
3. rollback order is independently checked against the simulated completed
   state and returns to the rollback-check baseline;
4. forward and rollback contain zero unresolved support, double-plant,
   connected-neighbor, gravity, fluid, or declared-state normalization hazards;
5. strict forward preflight and strict forward/rollback parser dry-runs pass;
6. all 18 garages retain usable rear/outward or side relationships;
7. both three-wide alleys retain continuous surface, headroom, deliberate
   grades, and all five public-road connections;
8. protected buildings, block entities, fluids, and parking remain untouched;
9. all 31 database feature definitions resolve without duplicate IDs or missing
   parents;
10. the ten-camera manifest is rebound to the rollback-check snapshot and every
    file/object/camera-key contract validates;
11. the package and evidence files are content-addressed in a release record;
12. no live execution occurs before a new same-moment snapshot and entity gate.

## 7. Machine-readable evidence

- Failed-attempt runtime QA:
  `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-r4-r5-runtime-hazard-independent-qa.json`
- Forensic report with all 338 rollback-check drift records:
  `data/world-review/redevelopment-attempt1-2026-07-27/mainstreet-r4-r5-runtime-failure-forensics.json`
- Independent checker:
  `scripts/qa_mainstreet_redevelopment_r4_r5_independent.mjs`
- Forensic generator:
  `scripts/analyze_mainstreet_redevelopment_runtime_failure.mjs`

## 8. Replacement-package verdict

**PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING**

The distinct replacement package is frozen. No RCON or live-world mutation was
used to produce or validate it.

| Gate | Frozen result |
|---|---:|
| Source operations | 5,561 |
| Expanded forward commands | 5,588 |
| Finite exact-state union cells | 27 |
| Copied-world source guards | 5,561 / 5,561 pass |
| Partial or generic masks | 0 |
| Runtime neighbor hazards | 0 |
| Tall-grass targets | 0 |
| Targeted block entities | 0 |
| Unresolved collisions / conflicts / skips | 0 / 0 / 0 |
| Usable garages | 18 / 18 |
| Complete shared alleys | 2 / 2 |
| Public-road connections | 5 / 5 |
| Stable B03 screen states omitted as no-ops | 116 |
| Independent assertions | 27 / 27 pass |
| Focused tests | 6 / 6 pass |

### 8.1 Final geometry correction

The replacement does not attempt to serialize Minecraft double plants. It
removes every tall-grass target through small, reviewable geometry changes:

- `GAR-C02` moves one block from z `5..11` to z `6..12`;
- `GAR-C07` moves to x `70..76`, z `-151..-145`, retaining a three-wide
  driveway to R03 while avoiding both orphan lower-half cells;
- `GAR-H07` moves to x `46..52`, z `21..27`, floor y `72`;
- ALLEY-E retains its R07 and R05 connections and terminates at z `37`, with a
  five-by-three turn pad at x `55..59`, z `35..37`;
- the H07 driveway is held on a three-row y=72 portal plateau so the garage and
  shared-alley surface have one consistent target state.

The final plan still contains 18 detached seven-by-seven garages, two
continuous three-wide alleys, no front-garden garage, no building relocation,
and all 31 database feature definitions.

### 8.2 Connected-fence contract

Twenty-seven one-cell birch-fence removals may observe either:

1. the full exact fence state in the immutable rollback-check snapshot; or
2. the full exact state predicted after an earlier adjacent fence removal.

Each cell is a separate `REPL` source operation. The report declares the exact
two-state set under:

`operations.runtimeSafety.finiteExactStateUnionGuards`

The group-aware runner treats the alternatives as one atomic source operation:
exactly one complete alternative must change the cell, every other alternative
must be a recognized no-op, and zero matches, multiple matches, partial
matches, or unknown replies fail closed. Rollback restores the
`snapshotExactSource`, not the transient neighbor-derived state.

The count is 27 rather than the early diagnostic draft's 25 because the final
plant-safe H07/C02 geometry crosses two additional connected-fence cells. The
same schema and proof apply to every declared cell.

### 8.3 Operation ordering

The forward file is partitioned into three runtime classes:

1. stateful fence clearance;
2. reactive clearance or replacement, ordered top-down;
3. support, surface, and structural mutation.

All 398 reactive operations end before the first support mutation. The
independent simulator reports zero forward hazards, zero rollback hazards, and
zero untracked support side effects. Persistent B03 spruce leaves use their
stable Java state:

`minecraft:spruce_leaves[distance=7,persistent=true,waterlogged=false]`

The 116 leaves already in that state are documented as desired no-ops and are
not rewritten.

### 8.4 Maps, screenshots, and object matching

The runtime-safe media directory contains ten nonblank immutable-baseline
captures: a district map, district oblique, both alley longitudinal views,
representative house/garage relationships, B02, B03, R07 connections, and
central connections. Every image records dimensions, SHA-256, camera key,
feature targets, renderer evidence, and its required after-image path.

An additional 18-camera exact-object manifest maps one post-release camera to
each garage database object. It binds both the forward operation hash and
rollback-check snapshot hash. After execution remains pending; no “after”
image is claimed before an accepted post-release snapshot exists.

### 8.5 Content-addressed evidence

| Artifact | SHA-256 |
|---|---|
| Forward operations | `c96958c9ce7c3a2e9d481d5063bc0cbd26d0879068967c1d66ca06943b9b2972` |
| Rollback operations | `86d9d452dac29d40cffb253a5e31e4d36d4eb6087a0dc1c25e10cb95d61dd1f3` |
| Engineering report | `136912978b0f2b61554b8da4066e696175cdffe403ec81fffc76f2dcc56a4faa` |
| Design document | `ec01e52e08f9e9e0bb45bba6416b503774399c1e4f02fc627baf66cbaff42305` |
| Guard preflight | `5a21a7c93ef21c70080ede0644d95b7ffca615b55f1d7bd8d094e05e3e2dfa40` |
| Forward dry-run | `99af9234979338320a9e4bb4f7dbbb36131d432c323c39ae6cc9e2469cce11be` |
| Rollback dry-run | `46c670dd08638ba193c134f3b172359900ec95b56d3eeabb1233a7617f3e2535` |
| Same-camera manifest | `a68bedb94370137cdef602eebedc2f0c0735216aff794439d826b562e568a607` |
| Garage camera manifest | `217ceb70fb5c0e5b07031853a72169a57b3f28153d0efacf5864b2fdde200129` |
| Independent QA | `c9a760d81fd8fdcf27dbec6fb91cac4cd948b6fcb3af312475fdad0603c533f9` |
| Release record | `6b8f37e3baf82d5241abefee3f157e048d6695f971cdb570e4e5c8ca8b79c52d` |
| Consumer integration manifest | `182bdc8ca58df7d8758ad186ba9600170b938c122449200aa3e86116c08985c6` |

### 8.6 Consumer switch and live boundary

The integration manifest identifies every known default consumer that must
move from Attempt 1 to the distinct runtime-safe paths. Attempt 1 operations,
execution report, compensation report, and §15 of the original surface release
remain immutable incident evidence.

This verdict is an offline engineering PASS only. Fresh same-moment snapshot
validation, entity clearance, supervised atomic execution, post snapshot,
movement/portal QA, matched after captures, and post-QA database import remain
mandatory. The package must not be partially executed.
