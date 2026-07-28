# Coordinated World Release Report

Date: 2026-07-27  
Release: `REDEV-2026-07-27-R1`  
Current status: **ACCEPTED — LIVE TRANSACTION COMMITTED; POST-QA PASS**

## 1. Release intent

This report is the append-only operational record for the first implementation
wave of the world redevelopment master plan. It joins otherwise independent,
spatially disjoint packages into one controlled maintenance window while
retaining package-level rollback.

The authorized outcomes are:

- complete the missing Westlight stadium focal display;
- prove and install one Raven Rock tunnel standard-section pilot;
- install the MainStreet two-street/rear-alley/18-garage/public-realm package;
- materially conceal the C01 surface mass and complete its east parking/road
  seam;
- add a recessed C01 portal/connector package only if its separate guards,
  protection proof, and independent QA pass.

## 2. Release packages

| Package | Area | Forward operations | Frozen guards | Rollback | Status |
|---|---|---:|---:|---:|---|
| `VEN-WL-01` | Westlight stadium | 524 groups / 524 cells | 524/524 | 524 | Committed; PASS |
| `INF-RR-01` | Raven Rock S1 | 335 groups / 335 cells | 335/335 | 335 | Committed; PASS |
| MainStreet R4/R5 | MainStreet surface | 5,561 groups / 5,561 cells | 5,561/5,561 | 5,561 | Committed; PASS |
| C01 surface Phase 1 | C01/P01 east seam | 769 groups / 28,729 cells | 766/766 | 766 guarded boxes | Committed; PASS |
| C01 portal Phase 2 | C01 recessed entry | 80 groups / 1,632 cells | 79/79 | 79 guarded boxes | Committed; PASS |

The five packages contain 7,265 guarded replacement groups and four intentional
command groups. They address 36,781 unique target cells with zero cross-package
overlap.

## 3. Spatial independence

| Pair | Relationship |
|---|---|
| Westlight / Raven Rock | Different projects and region coordinates |
| Westlight / MainStreet-C01 | Different projects and region coordinates |
| Raven Rock / MainStreet-C01 | Different projects and region coordinates |
| MainStreet surface / C01 | Same project but separated north/south extents |
| C01 Phase 1 / C01 Phase 2 | Same discipline; execute Phase 1 then Phase 2 only if target sets are disjoint or Phase 2 is re-preflighted on the intermediate state |

Target-cell intersection checks are required before release. Geographic
separation alone is not accepted as proof for the two C01 packages.

## 4. Controls

The release controller requires:

- only the systemd-managed backend and frontend instances;
- fleet bots paused;
- no running or queued world-building mission;
- no human player online;
- existing force-loaded chunks inventoried and restored;
- `save-all flush`;
- fresh, immutable, content-addressed pre-release snapshot;
- exact-state preflight of every forward package against that same snapshot;
- zero generic-preflight failures;
- strict RCON mode in which “nothing changed” is a failure;
- machine execution report for every package;
- zero WorldEdit leftovers;
- `save-all flush` after writes;
- immutable post-release snapshot;
- exact preflight of every rollback artifact against the post snapshot;
- package-specific census, entity/fluid, route, media, and database QA.

## 5. Strict execution command form

Every forward command uses:

```bash
python3 scripts/rcon_runner.py \
  <forward-ops.txt> \
  --strict-noop \
  --report <execution-report.json>
```

Acceptance requires:

- `status = complete`;
- `strictNoop = true`;
- `failedGroups = 0`;
- `unexpectedNoopCommands = 0`;
- alternative no-ops are allowed only inside a declared finite-state union
  where exactly one source-state alternative changes the target;
- `failedCommands = 0`;
- `worldEditLeftoverCount = 0`;
- report SHA-256 equals the frozen operation SHA-256.

## 6. Pre-release system state

Observed during assembly:

- `mc-fleet-bot.service`: active;
- `mc-fleet-web.service`: active;
- bot API: healthy with five bots;
- online players: the five fleet bots only;
- active missions: zero;
- fleet state: idle before the formal pause gate;
- existing force-loaded chunks: 104, to be preserved by the runner.

These are observations, not the same-moment release gate. They must be repeated
immediately before execution.

## 7. Independent defect ledger

### C01 Phase 1 exact-state defect

The first generated Phase 1 artifact preserved block names but dropped block
properties for six birch-fence cells and one quartz-slab cell. It also emitted
three unconditional sign-NBT merges.

Disposition:

- the first artifact was rejected before live execution;
- no world mutation occurred;
- the shared Anvil reader was extended to return canonical full block states;
- fence connectivity and slab type/waterlogging are now present in forward and
  rollback operations;
- sign NBT merges are conditional on the expected installed sign state;
- forward artifacts were regenerated and re-preflighted.

This defect demonstrates that a generic preflight using a state-less expected
mask is not evidence of exact reversibility.

## 8. Live execution

The fixed-order transaction began at 2026-07-27T23:51:47Z and completed at
2026-07-27T23:52:21Z. All packages committed.

| Package | Forward SHA-256 | Source groups | Failed groups | Unexpected no-ops | Decision |
|---|---|---:|---:|---:|---|
| Westlight | `fa0c4a086f7bdcd92640d63bd57086ad5d2ebd2230f937ad0fc72b93095011fa` | 524 | 0 | 0 | Committed |
| Raven Rock | `2869cfea1243b08a81d878a9da9a51c23eda9d3c651fa6ca64ad23577877639e` | 335 | 0 | 0 | Committed |
| MainStreet | `c96958c9ce7c3a2e9d481d5063bc0cbd26d0879068967c1d66ca06943b9b2972` | 5,561 | 0 | 0 | Committed |
| C01 Phase 1 | `fa108cc0a18d9cad0980abd8fca0f483a45406688fd9e32e0bf6b2dcf0350233` | 769 | 0 | 0 | Committed |
| C01 Phase 2 | `f50ce795daee455c81acb8f1456265f954e24661d99853de50a80d82b9f67e4f` | 80 | 0 | 0 | Committed |

MainStreet expanded to 5,588 RCON commands because 27 logical groups encoded a
finite exact-state union. Each group produced one required change plus expected
alternative no-ops. The group-aware strict runner reported zero failed groups
and zero unexpected group no-ops.

All temporary force loads were released and the pre-existing force-load set was
restored. No WorldEdit leftovers were reported.

## 9. Post-release snapshot

Accepted immutable directory:
`data/worldsnap-postrelease-f8edf99494c023dd-20260728/region`

| Field | Value |
|---|---|
| Snapshot SHA-256 | `f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10` |
| Region files | 26 |
| Bytes | 122,744,700 |
| Hash algorithm | SHA-256 over sorted filename + NUL + bytes + NUL |

The pre-release comparison point is
`42545b02f60fa881cb3d7fb82f2b22b1145623fa16e8c674a179113b48c639cf`.

## 10. Post-release package QA

Final result: **PASS**.

- Westlight: 524-cell exact post-state and 48-view sightline/mode matrix.
- Raven Rock: 335-cell exact post-state, matched views, and two-way walk.
- MainStreet: 18/18 garages, two alleys, public realm, 28 post images, and
  40/40 directional route runs.
- C01 Phase 1: landform, exposure, road, gate, inventory/fluid, rollback, and
  eight-camera evidence pass.
- C01 Phase 2: recessed portal/connector exact-state, five-camera, and
  bidirectional route proof pass.
- All packages: 7,265/7,265 rollback guards match; zero failure or partial
  match.
- Combined routes: 22/22 tests and 44/44 directional runs pass.
- Combined media: 91 accepted post screenshots.
- Atlas: 3,808/3,808 chunks loaded with zero missing.

## 11. Database and publication

The guarded importer accepted the final QA and snapshot binding, then created
44 features, three scans, and 44 observations with zero updates. The database
now contains 824 features, 21 scans, and 1,830 observations.

The post catalog is
`data/exports/world-catalog-post-2026-07-27`. It contains 69 buildings, 68 exact
floor plans, 14 exact-building screenshots, 108 features with screenshots, and
37 features with exact-object screenshots. The one floor-plan gap is the newly
cut recessed C01 portal and is reported rather than hidden.

The compiled dossier and owner-only Sites publication use the accepted post
atlas, catalog, screenshot set, and snapshot hash. See
`as-built-release-completion.md` for the complete handoff.
