# Town Expansion R1 accessibility repair

Status: **OFFLINE_PROJECTED_ROUTE_PASS_NOT_EXECUTED**

This is an offline-only exact-guarded repair design. It has not been executed
against the live world.

- Immutable source snapshot: `0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218`
- Canonical Town Expansion package: `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Forward operations: **1526**
- Exact rollback operations: **1526**
- Unchanged source/replacement candidates omitted: **1914**
- Exact-text no-ops omitted: **1910**
- Property-order-only semantic no-ops omitted: **4**
- Block-entity targets: **0**
- Ravensgate review-buffer targets: **0**
- Active portal blocks added: **0**
- Ladders added: **0**

## Eight-route diagnosis

| Route | Classification | Guarded cells | Baseline gap |
|---|---|---:|---:|
| TE-ROUTE-C01-MOUNTAIN-PORTAL-L1 | MANIFEST_WAYPOINT_ERROR | 0 | multi-component |
| TE-ROUTE-C01-PUBLIC-VERTICAL | REAL_INACCESSIBLE_BUILD | 175 | 15 |
| TE-ROUTE-C01-OWNER-VERTICAL | REAL_INACCESSIBLE_BUILD | 366 | 28 |
| TE-ROUTE-WESTLIGHT-VENUE-CORE | REAL_INACCESSIBLE_BUILD | 350 | multi-component |
| TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL | REAL_INACCESSIBLE_BUILD | 54 | 2 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS | REAL_INACCESSIBLE_BUILD | 31 | multi-component |
| TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC | REAL_INACCESSIBLE_BUILD | 268 | multi-component |
| TE-ROUTE-OBSERVATORY-PORTAL-HUB | REAL_INACCESSIBLE_BUILD | 282 | multi-component |

The C01 mountain-portal failure is a contract error, not a request to reopen
the retired x684 portal. The corrected manifest points at the active five-level
C01 garage road cut. Every other failure is a physical disconnect in the
immutable post snapshot and receives a bounded repair.

## Projected route result

- Status: **PASS**
- Acceptance class: `OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT`
- Routes: **22/22**
- Directions: **44/44**
- Isolation assertions: **4/4**
- Remaining route blockers: **0**

The projection does not satisfy final/as-built acceptance. A later authorized
release still requires a fresh exact preflight, frozen live entity gate,
strict-noop guarded execution, immutable post snapshot, this same full route
gate against that post snapshot, powered-door checks, and live no-dig/no-tower
Mineflayer walks.
