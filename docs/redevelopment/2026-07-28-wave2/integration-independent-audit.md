# Wave 2 Integration Independent Audit

**Decision:** `PASS — RELEASE ACCEPTED`  
**Audit date:** 2026-07-28 UTC  
**Transaction:** `redevelopment-atomic-release-wave2-2026-07-28`  
**Machine report:** `data/world-review/redevelopment-wave2-integration-independent-qa-2026-07-28.json`  
**Post-release report:** `data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json`  
**Post-release report SHA-256:** `551be053a21e37edc246f95cb2ded30df138f600f66c5574c2cf9b9b7f321d4c`  
**Reproducer:** `node scripts/qa_wave2_integration_independent.mjs`

## Executive decision

The fresh Wave 2 prerelease integration was an offline **GO**. The candidate
contains the bounded Raven Rock `INF-RR-02` T2b liner and MainStreet R08
cross-link packages in a fixed two-package transaction. All independent
structural, immutable-source, exact-state, reversible-simulation, finite-union,
reactive-fence, intersection, protected-feature, camera, parser, and controller
compatibility gates pass.

The live transaction and separate post-release acceptance are now complete.
The immutable post snapshot, 887 explicit and two reactive installed states,
exact rollback postflight, both bidirectional route contracts, all 14 matched
after captures, and all 51 database records pass the independent post-release
verifier. The detailed final disposition is
`docs/redevelopment/2026-07-28-wave2/post-release-independent-acceptance.md`.
The accepted read-only database census is bound to SHA-256
`1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`.

## Authoritative prerelease identity

| Item | Authoritative value |
|---|---|
| Manifest | `data/buildops/redevelopment-wave2-release-manifest.json` |
| Manifest SHA-256 | `df8ca8586b0415d2bc0a7653ec3a61d1c8ed333b90c9a05d4ca2b67d0cb946fe` |
| Manifest state | `prerelease-integration` |
| Immutable regions | `data/worldsnap-wave2-prerelease-b1356bca9fcbdc7a-20260728/region` |
| Snapshot SHA-256 | `b1356bca9fcbdc7a90b580b2f9210947788d74716e1a706f5e8f0d0f789dbb27` |
| Region files | 26 |
| Region bytes | 123,279,631 |
| Hash algorithm | SHA-256 over sorted `filename + NUL + bytes + NUL` |

The independent audit recomputed the snapshot digest from the region members.
It did not trust the filename, manifest declaration, or generator report.

## Exact package accounting

| Package | Forward source groups | REPL groups / cells | CMD groups | Finite unions | Rollback cells | Forward SHA-256 | Rollback SHA-256 |
|---|---:|---:|---:|---:|---:|---|---|
| `ravenrock-t2b` | 151 | 151 | 0 | 0 | 151 | `2ad97a32c2a48b28021edd2dd782acd78e0f07ed42b7d3949a0685bc06fd9690` | `56df298c3e35d94bb3ccc8abd83ebda8a2b49d5717aca24b9bbaf5a2be97bc61` |
| `mainstreet-r08` | 740 | 736 | 4 | 4 | 736 | `d9dea58a3c20ba6e5faca63fbb1ee7cc11857dc51e4956ff27624fee8c3da69f` | `5836dc47ce987fda6a10f2b00cb43e2a5582f93be215894c20294858274efd71` |
| **Total** | **891** | **887** | **4** | **4** | **887** | — | — |

All 887 explicit targets are unique inside their package. The two packages
share no explicit or reactive target. Every rollback target is present in the
forward package, every rollback source equals the forward desired state, and
every rollback desired state is one of the exact forward sources.

The four MainStreet commands are guarded `execute if block ... run data merge
block` operations. Each guard point equals its merge point, the point is also an
explicit REPL target, and the command guard equals the sign state installed by
that target. No unguarded command or WorldEdit leftover exists.

## Immutable source and parser gates

Independent source reads found:

- Raven Rock: 151 of 151 exact source states match the fresh snapshot.
- MainStreet: 736 of 736 exact or finite-union source states match the fresh
  snapshot.
- No partial masks are used.
- Every state has the complete Minecraft 1.21.11 property set.
- No source or desired state is an unknown block.
- No operation target contains an existing block entity.

The authoritative prerelease preflights pass:

| Package | Preflight | Result |
|---|---|---:|
| Raven Rock | `ravenrock-t2b-liner-pilot-wave2-prerelease-2026-07-28.prerelease-preflight.json` | 151 / 151 |
| MainStreet | `mainstreet-wave2-r08-prerelease-2026-07-28.prerelease-preflight.json` | 736 / 736 |

Strict parser-only dry runs also pass:

- Raven forward: 151 groups / 151 commands / zero leftovers.
- Raven rollback: 151 groups / 151 commands / zero leftovers.
- MainStreet forward: 740 groups / 744 commands / zero leftovers. The four
  extra commands are the second exact alternatives of the four finite unions.
- MainStreet rollback: 736 groups / 736 commands / zero leftovers.

Every dry-run operation hash equals the operation file audited here.

## Finite-union and reactive-fence proof

The audit starts from the immutable block state, applies every forward cell in
file order, and models the vanilla fence neighbor update after a fence is
removed or restored. It does not assume that each later gate cell retains its
snapshot state.

All four finite unions select alternative index 1 after the preceding fence
cell is removed:

| Point | Selected exact runtime source |
|---|---|
| `(8,65,-126)` | `birch_fence[east=false,north=false,south=true,waterlogged=false,west=false]` |
| `(8,65,-125)` | same |
| `(-8,65,-126)` | same |
| `(-8,65,-125)` | same |

Exactly two non-target fence cells change:

| Point | Immutable state | Projected forward state |
|---|---|---|
| `(-8,65,-124)` | `birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]` | `birch_fence[east=false,north=false,south=true,waterlogged=false,west=false]` |
| `(8,65,-128)` | `birch_fence[east=false,north=true,south=true,waterlogged=false,west=false]` | `birch_fence[east=false,north=true,south=false,waterlogged=false,west=false]` |

The simulated rollback runs in file order from the projected forward state. All
887 explicit targets and both reactive cells return byte-for-byte to their
immutable block states. There are zero forward-source, rollback-source, or
restoration mismatches.

## Intersection and protection proof

The integration audit expands operation boxes to exact cells and includes both
declared reactive cells in every intersection set.

| Comparison | Result |
|---|---:|
| Raven Rock vs MainStreet | 0 cells |
| Wave 2 vs accepted five-package R1 target union | 0 cells |
| Wave 2 vs active `building`, `room`, `driveway`, or `landscape` database bounds | 0 cells |
| Wave 2 vs existing target block entities | 0 cells |

The database was opened read-only. Its SHA-256 was
`005a714f90e1fc12a42de825b84290d07a9a090d0580b7112b277158e942123d`
before and after the audit. The 41 Raven Rock plus 10 MainStreet proposed
external IDs are unique, have zero existing conflicts, and remain unimported.

## Camera and provenance contract

All 14 prerelease cameras have unique IDs, unique outputs, exact primary-feature
relations, the prerelease snapshot hash, a capture report bound to the exact
manifest hash, and a current PNG whose SHA-256 matches the report.

| Package | Cameras | Before evidence | After evidence |
|---|---:|---|---|
| Raven Rock | 6 | PASS | required after transaction |
| MainStreet R08 | 8 | PASS | required after transaction |

During integration, two MainStreet capture reports briefly claimed PASS for the
same paths while disagreeing on seven image hashes. That was a real provenance
defect and integration was held. Engineering retained the stale record only as
`rejected-stale-capture-report-7635f0.json`; it is not an accepted capture
report. The fresh prerelease camera manifest and its single hash-consistent
capture report are the release evidence audited here.

## Controller compatibility

The audit imports `scripts/run_redevelopment_atomic_release.py` without
executing it and loads the real manifest through `load_release_plan`. The loaded
transaction ID, package order, operation paths, and manifest SHA-256 match the
candidate.

The controller contract includes:

- a fresh all-package live gate no older than five minutes;
- an immediately repeated per-package entity gate;
- operation-hash binding between the entity gate and each forward file;
- prerelease-preflight path and region-path binding;
- strict-noop forward execution;
- fixed manifest order: Raven Rock, then MainStreet;
- reverse-order compensating rollback after any failure;
- non-strict rollback only for a potentially partial failing package;
- strict rollback for each previously committed package;
- a durable transaction ledger rewritten after each transition.

## Route contracts

The post-release route runner must test normal walking with no digging,
towering, sprinting, crouching, or flight.

| Route | Endpoint A | Endpoint B | Required directions |
|---|---|---|---:|
| `RR-T2B-W2-BIDIRECTIONAL` | `(-145,3,187)` | `(-136,2,182)` | 2 |
| `MSA-R08-WEST-EAST-BIDIRECTIONAL` | `(-57,65,-124)` | `(56,65,-124)` | 2 |

Offline connectivity is not a substitute for these live tests.

## Completed release gates

Before the transaction, release management:

1. paused or cleared blocking builders, players, and free entities;
2. passed the combined two-package live entity gate;
3. kept the prerelease snapshot, operations, manifest, preflights, and 14
   before captures hash-frozen; and
4. executed through the fixed atomic controller in manifest order.

After the transaction, independent acceptance:

1. froze immutable post snapshot
   `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999`;
2. verified all 887 explicit installed states and both reactive fence states;
3. matched 887 of 887 rollback guards and restored the complete simulated
   prerelease state;
4. passed both route contracts in both directions;
5. rendered and hash-verified all 14 matched after cameras;
6. atomically imported and read-only verified all 51 database features; and
7. ran `scripts/qa_wave2_post_release.mjs` with final result `PASS`.

The exact post-release command is:

```bash
node scripts/qa_wave2_post_release.mjs \
  --post <immutable-post-region-directory> \
  --transaction <wave2-atomic-transaction-ledger.json> \
  --route-report <wave2-bidirectional-route-report.json> \
  --raven-after-report <raven-after-capture-report.json> \
  --mainstreet-after-report <mainstreet-after-capture-report.json> \
  --database data/world-map.db \
  --out data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json
```

`node scripts/qa_wave2_post_release.mjs --contract` prints the accepted input
schema and route endpoints without reading or changing the live world.

The verifier independently requires: the all-package and repeated per-package
entity gates; committed package order, strict execution results, and hashes;
different immutable pre/post snapshot identities; all 887 installed block
states; both projected reactive fence states; four sign block entities and all
16 authored text lines; 887 rollback guards; a complete simulated restoration
to the prerelease state; four successful route directions; 14 same-camera,
manifest-bound current after PNGs; and all 51 proposed external IDs in the
read-only database census.

## Verification commands executed

```bash
node scripts/qa_wave2_integration_independent.mjs
node scripts/qa_guarded_release_manifest.mjs \
  --manifest data/buildops/redevelopment-wave2-release-manifest.json \
  --out data/world-review/redevelopment-wave2-prerelease-manifest-qa-2026-07-28.json
npx vitest run \
  test/build/generateRavenRockT2bWave2.test.ts \
  test/build/generateMainstreetWave2R08.test.ts
python3 test/scripts/test_atomic_release_manifest.py
python3 test/scripts/test_rcon_runner.py
```

Results: 12 of 12 independent integration gates, 11 of 11 focused generator
tests, 4 of 4 controller-manifest tests, and 7 of 7 RCON runner tests pass.
