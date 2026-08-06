# Wave 2 Post-Release Independent Acceptance

**Decision:** `PASS — RELEASE ACCEPTED`  
**Acceptance time:** 2026-07-28T02:42:09.174Z  
**Transaction:** `redevelopment-atomic-release-wave2-2026-07-28`  
**Machine report:** `data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json`  
**Machine report SHA-256:** `551be053a21e37edc246f95cb2ded30df138f600f66c5574c2cf9b9b7f321d4c`  
**Reproducer:** `scripts/qa_wave2_post_release.mjs`

## Executive acceptance

Wave 2 is accepted as built. The bounded Raven Rock `INF-RR-02` T2b liner
pilot and MainStreet America R08 cross-link were committed in the declared
two-package order, captured in a new immutable saved-world snapshot, and
independently verified against the exact prerelease and rollback contracts.

The final read-only verifier passes all eight acceptance gates:

1. prerelease and post-release snapshot identity;
2. Raven Rock installed state and exact rollback;
3. MainStreet installed state, reactive fence state, signs, and exact rollback;
4. all-package and repeated per-package live entity clearance;
5. atomic transaction order, hashes, and strict execution;
6. both live normal-walk routes in both directions;
7. all 14 matched after captures; and
8. all 51 proposed database features.

The acceptance verifier did not connect to or mutate the live world and opened
`data/world-map.db` read-only. The database SHA-256 was identical before and
after its census.

## Frozen release identity

| Artifact | Authoritative value |
|---|---|
| Release manifest | `data/buildops/redevelopment-wave2-release-manifest.json` |
| Manifest SHA-256 | `df8ca8586b0415d2bc0a7653ec3a61d1c8ed333b90c9a05d4ca2b67d0cb946fe` |
| Transaction ledger | `data/world-review/redevelopment-wave2-atomic-transaction-2026-07-28.json` |
| Ledger SHA-256 | `e9b3752e89771c4ab218e5811bf23700cfd5f08128e9277324ca9df990f43ef2` |
| Prerelease snapshot | `data/worldsnap-wave2-prerelease-b1356bca9fcbdc7a-20260728/region` |
| Prerelease SHA-256 | `b1356bca9fcbdc7a90b580b2f9210947788d74716e1a706f5e8f0d0f789dbb27` |
| Post-release snapshot | `data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region` |
| Post-release SHA-256 | `d05ac7822795eff03340e46695a6f3accbdffdf82d11559d857e17b4d1962999` |
| Post-release regions | 26 files / 123,313,802 bytes |

The post snapshot digest differs from the prerelease digest and matches every
transaction, route, after-media, and database-import evidence record consumed by
the final audit.

## Transaction and installed-state proof

The durable transaction ledger records both packages committed in manifest
order:

| Order | Package | Forward result | Exact targets | Extra contract |
|---:|---|---|---:|---|
| 1 | `ravenrock-t2b` | 151 / 151, strict-noop, zero failures | 151 | addition-only T2b dry liner |
| 2 | `mainstreet-r08` | 740 / 740 source groups, strict-noop, zero failures | 736 | four guarded sign commands and two reactive fence cells |

The verifier decoded the post-release Anvil snapshot and checked all 887
explicit target cells against their desired complete block states. It also
checked the two non-target fence cells whose connection properties change
reactively when the adjacent gate fence is removed. All 889 projected cells
match.

The four MainStreet sign block entities exist at their guarded coordinates and
contain all 16 authored text lines. No command was accepted on the strength of
the transaction log alone; the resulting block entities were inspected in the
post snapshot.

Rollback verification is complete without replaying rollback against the live
world. All 887 rollback guards match the immutable post state, and an
independent in-memory rollback simulation restores all 887 explicit cells and
both reactive fence cells to the exact prerelease state. There are zero guard,
simulation, or restoration mismatches.

## Entity and route evidence

The all-package live entity gate is
`data/world-review/redevelopment-wave2-live-entity-gate-2026-07-28.json`. It is
bound to the exact operation hashes, reports zero blocking players or free
entities for both packages, and precedes execution within the permitted
freshness window. The controller also repeated the entity check immediately
before each package; both repeated checks pass.

The authoritative route record is
`data/world-review/redevelopment-wave2-route-qa-2026-07-28.json`, bound to the
post snapshot SHA-256. It passes four of four directions:

| Route | Endpoints | Forward | Reverse |
|---|---|---|---|
| `RR-T2B-W2-BIDIRECTIONAL` | `(-145,3,187)` ↔ `(-136,2,182)` | PASS | PASS |
| `MSA-R08-WEST-EAST-BIDIRECTIONAL` | `(-57,65,-124)` ↔ `(56,65,-124)` | PASS | PASS |

These were normal walking checks with no digging, towering, sprinting,
crouching, or flight. They satisfy the release movement contract rather than
merely demonstrating offline block connectivity.

## Matched post-release media

All 14 required after captures exist and pass their current-file SHA-256,
camera-parameter, feature-relation, manifest, and post-snapshot bindings:

| Package | Required | Verified | Evidence |
|---|---:|---:|---|
| Raven Rock | 6 | 6 | `data/exports/redevelopment-wave2-2026-07-28/ravenrock/after/capture-report.json` |
| MainStreet R08 | 8 | 8 | `data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08/after-capture-report.json` |

Every accepted after image differs from its matched before image. The previously
identified stale MainStreet capture report remains explicitly rejected and is
not part of the accepted evidence chain.

## Database acceptance and recovery

The database release was a separate, bounded atomic import after physical and
media acceptance. Its ledger is
`data/world-review/redevelopment-wave2-database-import-2026-07-28.json`.

| Database check | Result |
|---|---|
| Raven Rock features | 41 / 41 |
| MainStreet features | 10 / 10 |
| Total imported features | 51 / 51 |
| New scans | 2 |
| New observations | 51 |
| Database counts | 875 features / 23 scans / 1,881 observations |
| SQLite integrity | `ok` |
| Foreign-key violations | 0 |
| Accepted database SHA-256 | `1bd71512b9246b67b25a7fff91cd0745eb47d089e66fa15ee7ab23a41b21a503` |

The pre-import recovery image is
`data/backups/world-map-wave2-preimport-20260728T024110Z.db`, SHA-256
`a9af19a2823464a6a190f53283ae4d0215e49d44a6481a3b2fe0a80b455cef06`.
It contains the exact 824-feature / 21-scan / 1,830-observation pre-import
database state.

The final post-release verifier independently queried all 51 external IDs
read-only and found 51 rows with no missing ID. Its before-read and after-read
database hashes are identical.

## Machine-verifiable result

Run the acceptance check without changing the live world or database:

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

Accepted totals:

- 2 of 2 packages;
- 8 of 8 acceptance gates;
- 887 of 887 explicit installed states;
- 2 of 2 reactive fence states;
- 887 of 887 rollback guards and restorations;
- 4 of 4 guarded sign commands;
- 2 of 2 routes and 4 of 4 directions;
- 14 of 14 matched after cameras; and
- 51 of 51 imported database features.

The machine decision is `PASS`, with release disposition `ACCEPTED` and an empty
failure list.
