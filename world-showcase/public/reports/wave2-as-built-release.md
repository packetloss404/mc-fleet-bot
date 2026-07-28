# Wave 2 As-Built Release Report

Program: `REDEV-2026-07-28-R2`  
Transaction: `redevelopment-atomic-release-wave2-2026-07-28`  
Release date: 2026-07-28 UTC  
Record type: coordinated physical, movement, media, and publication handoff

## Executive record

Wave 2 installed two bounded improvements without replaying or altering the
accepted R1 package set:

1. Raven Rock `INF-RR-02`, a ten-station dry liner pilot that gives the T2b
   cavern route a consistent five-wide identity while retaining a deliberate
   cave window and stopping before the measured wet boundary; and
2. MainStreet America R08, a three-wide, east-west shared cross-link joining
   `ALLEY-W`, R01, and `ALLEY-E`, with controlled fence openings, complete
   junctions, a crosswalk, lighting, and destination signs.

The fixed-order transaction committed both packages. The post snapshot proves
887 explicit installed cells and two neighbor-reactive fence states. Exact
rollback guards match all 887 explicit cells. A non-digging, non-towering
walker traversed both route contracts in both directions with no sprint,
crouch, jump control, or movement-policy violation. All fourteen fixed cameras
were rendered again from the immutable post snapshot and differ from their
prerelease partners while retaining the exact camera contract.

The separate media workstream also delivered 79 unique, target-valid images:
55 building perspectives and 24 circulation perspectives. In the Wave 2
catalog, all 69 registered buildings have an exact screenshot and all 69 have
an exact floor plan. The C01 recessed public portal plan closes the one
remaining building floor-plan gap.

The authoritative machine acceptance record reports `PASS`, with release
decision `ACCEPTED`:

`data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json`

All eight final gates pass. The transaction ledger intentionally retains its historical
`committed-pending-post-qa` status; it is an append-only record of the
controller's terminal state at commit time, not the final acceptance report.

## Release identities

### Engineering baseline

| Field | Value |
|---|---|
| Directory | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` |
| SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Bytes | 122,744,700 |
| Purpose | design, tunnel inventory, exact-object media |

### Same-moment prerelease snapshot

| Field | Value |
|---|---|
| Directory | `data/worldsnap-wave2-prerelease-b1356bca9fcbdc7a-20260728/region` |
| SHA-256 | `b1356bca9fcbdc7a90b580b2f9210947788d74716e1a706f5e8f0d0f789dbb27` |
| Region files | 26 |
| Bytes | 123,279,631 |
| Purpose | exact live guards, final before media, transaction source |

### Immutable post-release snapshot

| Field | Value |
|---|---|
| Directory | `data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region` |
| SHA-256 | `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999` |
| Region files | 26 |
| Bytes | 123,313,802 |
| Purpose | installed-state proof, rollback postflight, matched after media, atlas |

Each digest uses SHA-256 over sorted `filename + NUL + bytes + NUL`. The
directory name is a convenience label; independent tools recompute and compare
the digest.

## Package accounting

| Package | Explicit cells | Guarded commands | Finite unions | Reactive cells | Forward SHA-256 | Rollback SHA-256 |
|---|---:|---:|---:|---:|---|---|
| Raven Rock T2b | 151 | 0 | 0 | 0 | `2ad97a32c2a48b28021edd2dd782acd78e0f07ed42b7d3949a0685bc06fd9690` | `56df298c3e35d94bb3ccc8abd83ebda8a2b49d5717aca24b9bbaf5a2be97bc61` |
| MainStreet R08 | 736 | 4 | 4 | 2 | `d9dea58a3c20ba6e5faca63fbb1ee7cc11857dc51e4956ff27624fee8c3da69f` | `5836dc47ce987fda6a10f2b00cb43e2a5582f93be215894c20294858274efd71` |
| **Total** | **887** | **4** | **4** | **2** | — | — |

The combined forward plan has 891 source groups: 887 `REPL` groups and four
guarded sign-NBT command groups. R08 has four complete finite-state unions.
Their unselected alternatives are expected no-ops, not drift. The transaction
reported four expected alternative no-op commands, zero unexpected no-ops,
zero unknown replies, zero failed commands, and zero failed groups.

## Package 1: Raven Rock T2b

### Existing defect

T2b crossed a natural cavern without a consistent route section. The path
could be followed from memory, but its changing edges, sparse lighting, and
large open volume made it read as cave space rather than primary circulation.
The original planning extent reached x `-135`; immutable snapshot inspection
found active water at x `-135/-134`, z `177..179`, y `1..9`. Extending the
pilot there would have violated its dry, addition-only contract.

### Installed response

The accepted package stops at x `-136`. It uses 151 exact-air additions across
ten stations from x `-145..-136`. The intervention supplies a consistent
polished-deepslate/stone-brick route frame and repeated light rhythm. It does
not excavate, displace water, cut a log, replace a gravity block, or close the
whole cavern. Twelve water cells remain in the wider buffer; none occupies a
target or shares a face with one. The wet terminal is retained as an explicit
future design boundary.

### Live execution result

| Measure | Result |
|---|---:|
| Strict source groups | 151 |
| Successful groups | 151 |
| Failed groups | 0 |
| Commands | 151 |
| Successful commands | 151 |
| No-op commands | 0 |
| WorldEdit leftovers | 0 |
| Execution duration | 2.411 seconds |

### Experience result

Route `RR-T2B-W2-BIDIRECTIONAL` joins `(-145,3,187)` and
`(-136,2,182)`. The forward and reverse tests each used three measured legs.
Both passed. Aggregate leg time was 2.749 seconds forward and 2.668 seconds
reverse. Neither direction recorded a movement-policy violation.

The result is a pilot standard, not a claim that every Raven Rock tunnel or
RR-Z5 flight is complete. The remaining inventory stays in
`data/world-review/ravenrock-wave2-tunnel-inventory-2026-07-28.json` for later,
separately guarded phases.

## Package 2: MainStreet R08

### Existing defect

R06 and R07 had no continuous midblock east-west connection. The two rear
alley systems read as disconnected service fragments, and a person turning at
the central spine lacked a clear cross-campus option. The missing link
reinforced the user's observation that one could turn a corner and lose the
spatial story.

### Installed response

R08 supplies a three-wide, 354-cell walking surface at y `64`, from the west
endpoint `(-57,65,-124)` to the east endpoint `(56,65,-124)`. Its 736 explicit
cells include the surface, gate work, junction treatment, lighting, and
wayfinding support. Four guarded NBT writes author the approved signs after
their sign blocks exist.

The package does not intersect an accepted R1 target, an active protected
building, room, driveway, landscape or garage bound, a protected tree, or an
existing target block entity. It changes two adjacent birch-fence connection
properties through normal neighbor updates. Both reactive states were modeled
before release, declared in the manifest, observed in the post snapshot, and
included in the rollback restoration proof.

### Live execution result

| Measure | Result |
|---|---:|
| Strict source groups | 740 |
| Successful groups | 740 |
| Failed groups | 0 |
| Expanded commands | 744 |
| Successful commands | 740 |
| Expected finite-union no-ops | 4 |
| Unexpected no-ops | 0 |
| WorldEdit leftovers | 0 |
| Execution duration | 2.850 seconds |

All four finite unions selected the exact runtime fence state predicted by the
offline simulator. The accepted transaction therefore did not weaken strict
mode to accommodate neighbor-sensitive blocks.

### Experience result

Route `MSA-R08-WEST-EAST-BIDIRECTIONAL` joins `(-57,65,-124)` and
`(56,65,-124)`. Each direction used five route legs. Both passed. Aggregate leg
time was 26.390 seconds west-to-east and 26.515 seconds east-to-west. Neither
direction recorded a movement-policy violation.

R08 is a circulation repair, not a wholesale move of protected houses or
authored interiors. It improves the grid incrementally while retaining the
accepted R1 garage, alley, public-realm, bunker, and landscape work.

## Atomic release and entity safety

The all-package entity gate passed immediately before execution:

| Measure | Result |
|---|---:|
| Packages passed | 2 / 2 |
| Entities returned in envelopes | 1 |
| Blocking entity hits | 0 |
| Required chunks | 67 |
| Temporary force-load tiles | 2 |
| Missing required chunks | 0 |
| Temporary tiles released | 2 / 2 |
| Final force-load set restored | Yes |

The controller then repeated the entity screen per package. It executed in the
manifest order—Raven Rock followed by MainStreet—and was prepared to roll back
in reverse order if a report or command failed. Neither package failed, so no
compensating rollback was invoked.

The transaction ran from 02:26:23 to 02:26:35 UTC. Both package ledgers report
`committed`. The durable transaction record is:

`data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json`

## Post-state and rollback proof

The post verifier reads the immutable d05ac782… copy and does not connect to
Minecraft. It requires:

- every one of the 887 explicit desired states;
- both declared reactive fence states;
- all four sign block entities and sixteen authored sign lines;
- all 887 exact rollback source guards;
- a simulated restoration of the complete prerelease state;
- committed transaction order and artifact hashes;
- the combined and repeated package entity gates;
- different pre- and post-snapshot identities.

The physical and rollback portions pass. No post-state mismatch, rollback
source mismatch, sign mismatch, or restoration mismatch remains.

The rollback files are disaster-recovery evidence, not a routine replay
instruction. Any actual rollback still requires a fresh entity gate,
coordination with later world changes, and an atomic transaction of its own.

## Matched release media

The release contract contains six Raven Rock cameras and eight MainStreet
cameras. Each after report:

- names the immutable d05ac782… post snapshot;
- is bound to the exact camera-manifest SHA-256;
- identifies one exact primary feature per camera;
- points to a current PNG whose bytes match the recorded SHA-256;
- uses the same camera parameters as the prerelease partner; and
- proves that the after image differs from the before image.

| Package | Cameras | Current images | Same-camera | Changed from before | Result |
|---|---:|---:|---:|---:|---|
| Raven Rock | 6 | 6 | 6 | 6 | PASS |
| MainStreet R08 | 8 | 8 | 8 | 8 | PASS |
| **Total** | **14** | **14** | **14** | **14** | **PASS** |

The MainStreet team retained an earlier disagreeing capture record as
`rejected-stale-capture-report-7635f0.json`. It is explicitly rejected and is
not silently counted as accepted evidence.

## Exact-object media and floor plans

The wider media release is deliberately separate from the 14 matched
construction cameras. It contains 79 unique images against the 4fca1ff3…
engineering/media baseline:

| Measure | Result |
|---|---:|
| Manifest captures | 79 |
| Unique camera definitions | 79 |
| Unique output paths | 79 |
| Unique image hashes | 79 |
| Aim points inside target bounds | 79 |
| Images passing visual metrics | 79 |
| Exact Wave 2 catalog links | 79 |
| Building perspectives | 55 |
| Circulation perspectives | 24 |

The catalog result is:

| Coverage measure | Result |
|---|---:|
| Registered buildings | 69 |
| Buildings with exact screenshot | 69 |
| Buildings with exact floor plan | 69 |
| Remaining building screenshot queue | 0 |
| Remaining building floor-plan queue | 0 |

The C01 recessed public portal supplement is both PNG and PDF. Its plan PNG is
1,600×1,100, 226,044 bytes, and has SHA-256
`8023bb700bf60b10f2a1747b4e28a42ee65614f10a10ec025feb3cd3195e0e45`.

This closes building-level media coverage. It does not imply that all rooms,
minor custom features, districts, or infrastructure relations have individual
screenshots. Those feature-level items remain a legitimate future media queue.

## Database import and final acceptance

The database import was deliberately sequenced after the physical, rollback,
route, and matched-media gates. Before mutation, the importer copied
`data/world-map.db` to:

`data/backups/world-map-wave2-preimport-20260728T024110Z.db`

The 2,256,896-byte backup has SHA-256
`a9af19a2823464a6a190f53283ae4d0215e49d44a6481a3b2fe0a80b455cef06`,
passes SQLite integrity checking, and has zero foreign-key violations.

The import added 41 Raven Rock and ten MainStreet records, two scans, and 51
observations:

| Database measure | Before | After | Delta |
|---|---:|---:|---:|
| Features | 824 | 875 | +51 |
| Scans | 21 | 23 | +2 |
| Observations | 1,830 | 1,881 | +51 |

Read-only verification found all 51 expected external IDs, all parent
relationships, and all evidence payloads. The final database SHA-256 is
`1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503`.
Post-import integrity is `ok` with zero foreign-key violations.

The final post verifier therefore reports:

| Acceptance measure | Result |
|---|---:|
| Packages | 2 / 2 |
| Explicit installed states | 887 / 887 |
| Reactive states | 2 / 2 |
| Rollback guards | 887 / 887 |
| Guarded sign commands | 4 / 4 |
| Route contracts | 2 / 2 |
| Route directions | 4 / 4 |
| Matched after cameras | 14 / 14 |
| Database features | 51 / 51 |
| Failed gates | 0 |
| Decision | **ACCEPTED** |

The import ledger is
`data/world-review/redevelopment-wave2-database-import-2026-07-28.json`.

## Post-release atlas

The immutable Wave 2 post atlas is:

`data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a`

| Sheet | Dimensions | Bytes | Populated ratio | Nonblank |
|---|---:|---:|---:|---|
| Overall active world | 1,792×2,176 | 1,213,312 | 0.9997 | Yes |
| Ravensreach core and old town | 805×885 | 108,897 | 1.0000 | Yes |
| Ravensgate | 725×965 | 73,340 | 1.0000 | Yes |
| Western approach road | 964×324 | 62,886 | 1.0000 | Yes |
| Westlight venue and district | 900×1,028 | 128,682 | 1.0000 | Yes |
| Western project corridor | 1,395×1,107 | 196,877 | 1.0000 | Yes |
| Raven Rock surface access | 1,282×1,282 | 544,752 | 1.0000 | Yes |

The renderer requested 3,808 chunks, loaded all 3,808, reported zero missing,
and used two fallback height maps. Both `atlas-manifest.json` and
`area-inventory.json` are retained beside the seven sheets.

## Decision and rejection trace

Wave 2 retained decisions that materially constrained the result:

1. The Raven Rock pilot stops before x `-135`; the wet edge is not silently
   filled, drained, or converted.
2. T2b remains a tunnel within a cavern rather than a box occupying the whole
   cavern.
3. R08 is a new non-overlapping connector; accepted R1 work is not replayed for
   cosmetic difference.
4. Full block states are required for fences and other property-bearing
   blocks. Material-only masks are not accepted.
5. An early MainStreet camera report with stale provenance is retained as
   rejected evidence.
6. Route success must be experiential and bidirectional. Offline topological
   connectivity alone is not acceptance.
7. Database records are imported only after physical state, rollback guards,
   routes, and matched media pass.

The full rationale is in `decision-and-rejection-log.md`, the Raven Rock
engineering handoff, the MainStreet R08 dossier, and the independent
integration audit.

## Reproduction commands

Generate the immutable post atlas:

```bash
node scripts/generate_surface_atlas.mjs \
  --regions data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region \
  --out data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a
```

Run the final post verifier:

```bash
node scripts/qa_wave2_post_release.mjs \
  --post data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region \
  --transaction data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json \
  --route-report data/world-review/redevelopment-wave2-route-qa-2026-07-28.json \
  --raven-after-report data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/capture-report.json \
  --mainstreet-after-report data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after-capture-report.json \
  --database data/world-map.db \
  --out data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json
```

Reproduce media QA:

```bash
node scripts/qa_wave2_media_catalog.mjs
npx vitest run test/build/generateWave2MediaRelease.test.ts
```

Generate the Wave 2 artifact register and dossier without touching the live
world, databases, or Sites source:

```bash
node scripts/generate_redevelopment_artifact_register.mjs --profile wave2
node scripts/generate_redevelopment_dossier.mjs --profile wave2
```

## Acceptance interpretation

Use the following exact language:

- **committed**: both physical packages completed through the atomic
  controller;
- **physically verified**: 887 explicit and two reactive post states plus 887
  rollback guards pass;
- **experience verified**: both routes pass in both directions with zero
  movement-policy violations;
- **media verified**: 14 matched after views and 79 exact-object views pass;
- **database verified**: all 51 proposed external IDs exist and match the
  import contract;
- **accepted**: every gate in the post-release verifier passes;
- **published**: the accepted catalog, dossier, and a saved/deployed Sites
  version identify this release.

The last term is intentionally outside this offline documentation task. A
successful PDF build must not be represented as a production Sites deployment.
