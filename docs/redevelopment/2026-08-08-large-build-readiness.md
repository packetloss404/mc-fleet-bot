# Large-build readiness — C01 and northeast data campus

Date: 2026-08-08
Shared survey snapshot: `data/worldsnap/large-build-readiness-20260808/region`
Snapshot SHA-256: `bd05c6feb8f0110ef54d486695ee3493cacee88f7add75ef8ef9d0f7470b4d40`

## Parallel workstream result

The C01 rebuild audit and northeast data-campus audit were run against the
same fresh nine-region snapshot. The C01 compiler regression suite also ran in
parallel and passed:

```text
test/build/qaC01BunkerSquare.test.ts       2 passed
test/build/townExpansionC01Compiler.test.ts 1 passed
```

### C01 east rebuild

The source model remains structurally valid: all 30 model checks pass except
the live protected-entity gate. The proposed 901,073-cell destination overlaps
1,646 existing live block entities, including active C01 garage/storage and
route contents. This proves the destination is not an empty reservation and
blocks any large `/fill` or compiler replay against it.

Required correction: reconcile the planning model with the already-occupied
east C01 footprint. The next package must either be a genuinely new,
non-overlapping reservation or an explicitly commissioned migration/retirement
transaction against the current east complex. It must not overwrite the 1,646
entities or infer that the old planning snapshot is still current.

### Northeast data campus

The previously incomplete snapshot issue is resolved by the shared snapshot;
all planned x≈570..1200 campus coordinates are covered. The holdout-home
parcel at `x570..625, z-179..-105` is not currently dry: the live survey finds
304 surface-water columns in the parcel's pool/pond zone. The model's dry and
protected-parcel gate therefore fails closed before operation generation.

The compiler gate was tightened to accept only two valid pool source states:
the exact 16×19 pool footprint may be dry or may already contain exactly 304
water columns. Any water outside that footprint still fails closed. On the
current live snapshot the parcel remains blocked because it also contains 400
surface barrels plus one deep mob spawner. Those are existing program state,
not disposable terrain.

Required correction: reconcile or relocate that existing 400-barrel program
before the parcel can be a build target, while preserving the deep spawner and
its separation. Water cannot be silently treated as air or included in a
generic demolition box.

## Current release boundary

No large C01 or data-campus world mutation was executed. The live edits from
this workstream are limited to the reviewed C01 stair/portal lighting and
finish micro-packages, each with exact inverse operations and fresh snapshot
evidence. The shared readiness snapshot, compiler tests, and this record are
the handoff for the corrected large-build design.

## Fresh gate recheck — 2026-08-08

A stable no-flush snapshot was captured after the prior review:
`data/worldsnap/large-build-readiness-rerun2-20260808/region`, SHA-256
`9404c13272afbf919930e2cee6a75592b0e3dc2ba77f06fd7500dc193372f7bd`.
The read-only census confirms:

- 400 `minecraft:barrel` block entities remain in the protected parcel at
  `x570..625, z-179..-105`.
- The declared pool footprint still has 304 water surface columns (1,017
  water blocks in the surveyed y-range).
- The preserved `minecraft:mob_spawner` remains at `(576,-11,-107)`.

Running the current compiler against this snapshot fails closed at the
holdout-protection gate before any operation file is generated. The C01 audit
also remains `C01_MODEL_AUDIT_BLOCKED` with
`noPinnedProtectedBlockEntityTargets=false`; its 901,073-cell target cannot be
treated as an empty reservation. Existing July 28 large operation files bind
older snapshot identities and are not executable against this state.

## Current-snapshot C01 finish — 2026-08-08

The full 901,073-cell C01 comparison against the stable snapshot found 694
ordinary block differences. A first exact delta was correctly rejected by
post-execution route QA: removing stair/clearance cells broke the public and
owner vertical routes. That 694-cell package was rolled back completely with
694/694 strict-noop changes; the rollback post snapshot restored all five C01
routes in both directions (10/10 directions).

A conservative route-safe split then held every C01 route cell and its
one-block movement neighborhood, all air/clearance replacements, and all stair
changes. The resulting 263-cell package passed 263/263 guarded preflight,
strict-noop parsing, projected route QA (5/5 C01 routes, 10/10 directions),
live strict-noop execution (263/263 changed, 0 no-op), post-snapshot route QA
(5/5, 10/10), and rollback post-state preflight (263/263). Its inverse is:

```text
data/buildops/c01-route-safe-finish-2026-08-08.rollback.txt
SHA-256 7103c00dbbc289990399d8c30e715b1d01ac4fcf0e00a793297aa3631a181367
```

The held remainder is deliberately deferred for a route-aware package. The
full C01 source migration/retirement gate also remains closed: the old source
census has 12 missing and 67 hash-drifted entries, and source retirement is
not part of the 263-cell finish. The data campus remains blocked by the
400-barrel protected parcel and preserved spawner described above.

The next fresh baseline left 432 C01 model differences. One isolated
farmland-moisture correction at `(805,25,-140)` was route-safe and executed
with 1/1 guarded change. The remaining 431 cells are route-affecting stair or
clearance geometry. A looser 93-cell projection failed the public and owner
vertical route gate, so those cells remain held for a route-aware redesign.

The route-aware far tranche then executed 83 additional cells whose targets
were at least three blocks from every C01 route path. It passed 83/83 exact
preflight, projected QA, strict-noop execution, post-snapshot route QA (5/5
routes and 10/10 directions), and rollback post-state preflight. The remaining
348 cells are concentrated in the public/owner vertical cores; a 331-cell
path-only projection failed both vertical routes and remains held.

Ten-way interaction probing then found one 35-cell team that passed in
isolation. It executed as `c01-route-team-0-2026-08-08.txt`; all 35 guards
changed successfully, the post snapshot retained 5/5 C01 routes and 10/10
directions, and its 35-cell inverse passed rollback post-state preflight.
Every subsequent team failed against that new post state, so the remaining
313 cells stay held for a coordinated redesign of the two vertical cores.

## Route-preserved core tranche — 2026-08-08

The held-core redesign now has an executed, route-aware package. The compiler
replayed both accepted C01 vertical routes from the current immutable baseline
and protected every route feet, head, and support cell in both directions.
That held 131 exact model operations and emitted the remaining 182 cells as:

```text
data/buildops/c01-route-preserved-core-2026-08-08.txt
SHA-256 6645960b219a2118095726c34cd300811da1cc3e0adfb5b98af41d63e5db5d79
data/buildops/c01-route-preserved-core-2026-08-08.rollback.txt
SHA-256 34ed444d0a4f05d779647855fe6e0b98b5acc2037143b8ef14ad33139ede4110
```

The source preflight and strict forward/rollback parser checks passed 182/182.
The live guarded execution changed 182/182 cells with zero no-ops or failures.
The fresh post snapshot is
`data/worldsnap/c01-route-preserved-core-post-20260808/region`, SHA-256
`83b1e1866edb00b9316748a9bddffebe1103af787e170749e2dc713ba972eb9b`.
Its bound route manifest passes all 22 representative routes and 44/44
directions, including all five C01 routes and both vertical directions. The
exact inverse passes 182/182 rollback post-state preflight.

The 131 held cells remain an explicit coordinated stair-core redesign scope;
they were not silently discarded or authorized by this tranche. The data
campus holdout and the full C01 source migration/retirement gates remain closed.

## Workflow tooling follow-up — 2026-08-08

The repeated manual release sequence is now composed by
`scripts/run_c01_guarded_build.mjs`. Preparation mode binds the route manifest,
runs forward preflight, strict forward/rollback parser checks, and projected
route QA, then writes one evidence ledger. `--execute` is deliberately opt-in
and requires an explicit post-snapshot destination and capture center; it then
runs strict-noop execution, fresh snapshot capture, post-route QA, and rollback
post-state preflight. A dry-run of the executed core package completed as
`READY_FOR_EXECUTION` in
`data/world-review/c01-guarded-build-dryrun-20260808/evidence-ledger.json`.

The held-core candidate was then tested directly and correctly blocked: its
131 original model transitions disconnected both vertical routes. A
route-aware compiler converted the 86 route-support cells into east-facing
polished-blackstone stairs and omitted 45 route feet/head no-ops. The resulting
package was executed through the new orchestrator:

```text
data/buildops/c01-route-aware-stair-core-2026-08-08.txt
SHA-256 8b727c897620a54adf01961a0915d357c5c26a66e8c452a6cdaf7c7eebac0999
data/buildops/c01-route-aware-stair-core-2026-08-08.rollback.txt
SHA-256 b1628843145ab7f0b7eda3ac4dc0880db4955090fd4a8f3d3eb6cb4feea640f1
```

All 86 guards passed, all 86 live groups changed, and the post snapshot
`data/worldsnap/c01-route-aware-stair-core-post-20260808/region` is bound at
SHA-256 `3a9d6d4bf8c0a85e975602ea1d2f9f835da4ab1082cf4291b000185ec0e633a`.
Post-route QA passes 22/22 routes and 44/44 directions; rollback post-state
preflight passes 86/86; the package has zero post-snapshot block-entity
overlaps. The remaining full-model/source-migration and data-campus gates are
unchanged.
