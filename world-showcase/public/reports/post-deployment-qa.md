# Post-deployment QA and as-built acceptance

Generated: 2026-07-28T00:37:20.690Z

Overall release status: **PASS**

This is the final machine-backed acceptance record for the atomic redevelopment
release. It ties every exact-state operation to the immutable pre- and
post-release snapshots, strict live execution reports, rollback preflights,
same-moment entity gate, bidirectional route test, database features, and visual
evidence.

## Release identity

- Pre snapshot: `42545b02f60fa881cb3d7fb82f2b22b1145623fa16e8c674a179113b48c639cf` (26 regions;
  122,744,700 bytes)
- Post snapshot: `f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10` (26 regions;
  122,744,700 bytes)
- Unique target cells: 36,781
- Guarded operations: 7,265
- Guarded block-data commands: 4
- Database features promoted: 44
- Post-release screenshots: 91

## Atomic acceptance gates

| Gate | Result |
|---|---:|
| packages | PASS |
| atomicTransaction | PASS |
| crossPackageTargetSeparation | PASS |
| uniqueDatabaseFeatureIds | PASS |
| liveEntityGate | PASS |
| liveEntityGateTiming | PASS |
| routeQa | PASS |
| snapshotChanged | PASS |
| postSnapshotComplete | PASS |

## Package ledger

| Package | Status | Operations | Target cells | After media | Forward SHA-256 |
|---|---:|---:|---:|---:|---|
| westlight | PASS | 524 + 0 CMD | 524 | 48 | fa0c4a086f7bdcd9… |
| ravenrock | PASS | 335 + 0 CMD | 335 | 2 | 2869cfea1243b08a… |
| mainstreet | PASS | 5561 + 0 CMD | 5,561 | 28 | c96958c9ce7c3a2e… |
| bunker-phase1 | PASS | 766 + 3 CMD | 28,729 | 8 | fa108cc0a18d9cad… |
| bunker-phase2 | PASS | 79 + 1 CMD | 1,632 | 5 | f50ce795daee455c… |

## Verification method

Every forward and rollback file was parsed to exact target cells. A package
passes only if it contains no unguarded SET operation, contains no duplicate
target cell, has a complete per-cell forward/rollback bijection, passes the
same-moment immutable-snapshot source preflight, executes through RCON with
`--strict-noop` and zero failures or leftovers, and passes a rollback preflight
against the accepted post snapshot. Single complete source states are mandatory
except for the separately audited five-cell Phase 1 dry-fence removal contract
and MainStreet-only declared finite unions of complete exact fence states; both
exceptions require desired air and complete exact snapshot restoration on
rollback. The combined release additionally requires
zero cross-package target overlap, an empty exact-target entity safety halo, a
successful bidirectional walk, non-identical pre/post snapshots, and the complete
same-camera after-media inventory.

## Evidence paths

- Machine QA: `data/world-review/redevelopment-post-deployment-qa-2026-07-27.json`
- Atomic transaction: `data/world-review/redevelopment-atomic-transaction-2026-07-27.json`
- Entity gate: `data/world-review/redevelopment-live-entity-gate-2026-07-27.json`
- Route QA: `data/world-review/redevelopment-route-qa-2026-07-27.json`
- Immutable pre snapshot: `data/worldsnap-prerelease2-42545b02f60fa881-20260727/region`
- Immutable post snapshot: `data/worldsnap-postrelease-f8edf99494c023dd-20260728/region`

## Database and media disposition

The `featureQuality` and `featureMedia` objects in the machine QA are the
authoritative release attachment consumed by
`scripts/import_redevelopment_release.mjs`. The importer refuses promotion
unless this report is `PASS` and the supplied post-snapshot hash matches.
