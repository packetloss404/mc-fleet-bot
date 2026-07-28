# Town Expansion R1 post-release representative route QA

- Status: **PASS**
- Acceptance class: `OFFLINE_PROJECTED_REPAIR_GEOMETRY_ACCEPTED_NOT_AS_BUILT`
- Immutable post snapshot: `0a74e06adf1b0520ad24433a459346f1d65105e40b0c92da222b94b356db3218`
- Canonical package: `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Manifest: `docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json`
- Routes: 22/22 passed
- Directions: 44/44 passed
- Exact path cells: 4228
- Door interaction thresholds: 4
- Projected guarded operations: `b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b`
- Projected target cells: 1526

## Coverage

| Domain | Routes | Passed |
|---|---:|---:|
| c01-bunker | 5 | 5 |
| citizen-commute | 1 | 1 |
| civic-guild-library | 2 | 2 |
| data-district-concord | 6 | 6 |
| mainstreet-warehouse-roads | 3 | 3 |
| observatory-estate-portals | 2 | 2 |
| westlight-stadium-pier | 3 | 3 |

## Representative routes

| Route | Domain | Forward | Reverse | Path cells (F/R) | Minimum headroom |
|---|---|---:|---:|---:|---:|
| TE-ROUTE-C01-L1-ENTRY-GARAGE | c01-bunker | PASS | PASS | 145/145 | 7 |
| TE-ROUTE-C01-MOUNTAIN-PORTAL-L1 | c01-bunker | PASS | PASS | 2/2 | 6 |
| TE-ROUTE-C01-PUBLIC-VERTICAL | c01-bunker | PASS | PASS | 85/85 | 3 |
| TE-ROUTE-C01-OWNER-VERTICAL | c01-bunker | PASS | PASS | 90/90 | 3 |
| TE-ROUTE-C01-SERVICE-BACKBONE | c01-bunker | PASS | PASS | 97/97 | 6 |
| TE-ROUTE-CIVIC-LIBRARY-PAVILION-GUILD | civic-guild-library | PASS | PASS | 48/48 | 4 |
| TE-ROUTE-CIVIC-SECRET-ARCHIVE | civic-guild-library | PASS | PASS | 43/43 | 5 |
| TE-ROUTE-WESTLIGHT-STADIUM-PIER-AXIS | westlight-stadium-pier | PASS | PASS | 110/110 | 9 |
| TE-ROUTE-WESTLIGHT-PIER-RESTAURANTS | westlight-stadium-pier | PASS | PASS | 22/22 | 2 |
| TE-ROUTE-WESTLIGHT-VENUE-CORE | westlight-stadium-pier | PASS | PASS | 63/63 | 3 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL | mainstreet-warehouse-roads | PASS | PASS | 85/85 | 5 |
| TE-ROUTE-MAINSTREET-P01-DRIVE-AISLE | mainstreet-warehouse-roads | PASS | PASS | 227/227 | 9 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS | mainstreet-warehouse-roads | PASS | PASS | 61/61 | 2 |
| TE-ROUTE-DATA-DISTRICT-SHARED-GREENWAY | data-district-concord | PASS | PASS | 83/83 | 2 |
| TE-ROUTE-DATA-DISTRICT-META-GOOGLE-SPINE | data-district-concord | PASS | PASS | 173/173 | 2 |
| TE-ROUTE-DATA-DISTRICT-LIGHTEDGE-SPUR | data-district-concord | PASS | PASS | 110/110 | 2 |
| TE-ROUTE-DATA-DISTRICT-HALL-AISLES | data-district-concord | PASS | PASS | 3/3 | 6 |
| TE-ROUTE-CONCORD-BROADCAST-PUBLIC | data-district-concord | PASS | PASS | 40/40 | 5 |
| TE-ROUTE-CONCORD-SOUNDSTAGE-PUBLIC | data-district-concord | PASS | PASS | 7/7 | 6 |
| TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC | observatory-estate-portals | PASS | PASS | 75/75 | 2 |
| TE-ROUTE-OBSERVATORY-PORTAL-HUB | observatory-estate-portals | PASS | PASS | 56/56 | 3 |
| RR-MSA-CITIZEN-COMMUTE-01-BIDIRECTIONAL | citizen-commute | PASS | PASS | 489/489 | 3 |

## Blocking offline findings

- None.

## Live-only follow-up gates

- **TE-LIVE-ROUTE-01:** Run a no-dig/no-tower Mineflayer walker over each representative route in both directions against the same live save state. Status: `PENDING`.
- **TE-LIVE-ROUTE-02:** Exercise powered iron-door, airlock and access-control interactions without breaking blocks. Status: `PENDING`.
- **TE-LIVE-ROUTE-03:** Observe dynamic entity collision and crowding at C01, civic, Westlight, warehouse, data-district and observatory thresholds. Status: `PENDING`.
- **TE-LIVE-ROUTE-04:** Complete the separately controlled citizen commute live walk before enabling resident shifts. Status: `PENDING`.

This PASS proves only the exact guarded offline projection. It is not
as-built evidence and cannot satisfy final acceptance before execution,
fresh post snapshot, route rerun, live controls, and entity clearance.

