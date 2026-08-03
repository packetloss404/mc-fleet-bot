# Wave 2 Baseline and Release Readiness

Program: `REDEV-2026-07-28-R2`  
Record type: PM control record  
State: **BASELINE CONTROL CLOSED; WAVE 2 ACCEPTED**

This record preserves the readiness state and starting counts used to authorize
the release. Final as-built facts are in `as-built-release-report.md` and
`post-release-independent-acceptance.md`.

## 1. Frozen world baseline

Wave 2 engineering is pinned to:

| Field | Value |
|---|---|
| Region directory | `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region` |
| Directory SHA-256 | `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b` |
| Region files | 26 |
| Total bytes | 122,744,700 |
| Relationship to R1 | Captured after the accepted R1 build, evidence, import, and publication |

The mutable `data/worldsnap/region` directory is not a release identity. Any
live Wave 2 transaction requires another content-addressed pre-release copy
captured immediately after `save-all flush`.

## 2. Baseline atlas

The complete Wave 2 surface atlas is:

`data/exports/box/redevelopment-atlas-wave2-baseline-2026-07-28/team-a`

| Measure | Result |
|---|---:|
| Map sheets | 7 |
| Requested chunks | 3,808 |
| Rendered chunks | 3,808 |
| Missing chunks | 0 |
| Fallback height maps | 2 |

The atlas contains:

1. overall active-world surface;
2. Ravensreach core and old town;
3. Ravensgate;
4. western approach road;
5. Westlight venue and district;
6. western project corridor;
7. Raven Rock surface access.

Its `atlas-manifest.json` and `area-inventory.json` are the machine-readable
source for map bounds, renderer inputs, completeness, and file identity.

## 3. Database and media baseline

The accepted R1 database is `data/world-map.db`, 2,256,896 bytes. The catalog
used for the Wave 2 starting point is:

`data/exports/world-catalog-post-2026-07-27/object-media-index.json`

| Measure | Baseline |
|---|---:|
| Features | 824 |
| Buildings | 69 |
| Buildings with exact floor plan | 68 |
| Features with any screenshot | 108 |
| Features with exact-object screenshot | 37 |
| Buildings with any screenshot | 15 |
| Buildings with exact-object screenshot | 14 |
| Inventoried media files | 195 |
| Linked inventoried media files | 132 |

The one exact-building floor-plan gap is the newly built C01 recessed portal.
The exact-object building screenshot gap is 55 buildings. Wave 2 measures
media success as a database-linked coverage delta, not an unlinked image
count.

### Baseline exact-building coverage by project

| Project | Buildings | Exact floor plans | Exact-object screenshots |
|---|---:|---:|---:|
| MainStreet America | 32 | 31 | 12 |
| Raven Rock | 5 | 5 | 1 |
| Ravensgate | 4 | 4 | 0 |
| Ravensreach | 11 | 11 | 0 |
| Westlight district | 14 | 14 | 0 |
| Westlight venue | 3 | 3 | 1 |

## 4. Live fleet hold

Read-only checks on 2026-07-28 established:

| Check | Result |
|---|---|
| Backend API | Healthy on `127.0.0.1:3001` |
| Dashboard | Active on port 3000 |
| Fleet size | 5 |
| Bot states | 5/5 idle |
| Active missions | 0 |
| Last release hold commands | 5/5 pause commands succeeded |

This is a readiness observation, not a substitute for the same-moment release
gate. The transaction coordinator must repeat bot, mission, player, entity,
and operation-envelope checks immediately before a live build.

## 5. Physical-package integration gates

No tunnel or MainStreet candidate advances merely because its generator
completes. Integration requires all of the following:

- exact baseline hash match;
- complete block-state properties for every source and desired state;
- unique target cells within each package;
- zero target intersections between packages;
- forward/rollback cell-set bijection;
- exact rollback source equal to forward desired state;
- no unhandled inventory, block entity, fluid, gravity, support, or protected
  room intersection;
- independent saved-world QA in addition to the generator's own report;
- strict group-aware dry run;
- bidirectional no-dig/no-tower route schedule;
- named database features and matched camera contract;
- conservative live entity envelope.

If only one physical package passes these gates, the other package is excluded
from the release rather than weakening the accepted package or forcing a
combined deadline.

## 6. Publication gates

Wave 2 is not complete at block execution. A release remains
`committed-pending-post-qa` until all of these exist:

1. immutable post-release region snapshot and hash;
2. strict rollback postflight against that snapshot;
3. independent exact-state census;
4. successful bidirectional route observations;
5. matched post-build screenshots rendered from the post snapshot;
6. new feature/observation/media import with a database backup;
7. refreshed object-media index and coverage delta;
8. refreshed atlas where surface changes warrant it;
9. updated dossier/PDF and artifact register;
10. saved Sites version and successful owner-only production deployment.

## 7. Audit interpretation

The terms used in Wave 2 are intentionally distinct:

- **generated** means an offline artifact exists;
- **preflighted** means its guards match the named snapshot;
- **released** means the live exact-state transaction committed;
- **verified** means post-state and experience QA passed;
- **documented** means evidence is linked into the program record;
- **published** means the database, catalog, dossier, and production site all
  identify the accepted post-release state.

No report may silently promote one state to the next.

## 8. Final disposition

All ten publication gates above now have evidence except production Sites
publication, which remains a separate external version/deployment step:

| Gate | Final evidence |
|---|---|
| Immutable post snapshot | d05ac782…; 26 regions; 123,313,802 bytes |
| Rollback postflight | 887 / 887 exact guards |
| Installed-state census | 887 explicit plus two reactive states |
| Bidirectional routes | 2 / 2 tests; 4 / 4 directions; zero policy violations |
| Matched post media | 14 / 14 cameras |
| Database import | 51 / 51 features; backup and integrity PASS |
| Database totals | 875 features; 23 scans; 1,881 observations |
| Exact-object media | 79 / 79 images; 69 / 69 building screenshots and floor plans |
| Post atlas | 7 / 7 sheets; 3,808 / 3,808 chunks |
| Dossier and register | Wave 2 profile generated from accepted evidence |

The independent final verifier reports `PASS` and decision `ACCEPTED` in
`data/world-review/redevelopment-wave2-post-release-qa-2026-07-28.json`.
