# Town Expansion R1 post-release representative route QA

- Status: **FAIL**
- Acceptance class: `REJECTED`
- Immutable post snapshot: `2307a263303a810ecdd17620b4a9891b907b787d41d6619bc1822f91d58d6ba5`
- Canonical package: `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Manifest: `docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-route-manifest.json`
- Routes: 22/22 passed
- Directions: 44/44 passed
- Exact path cells: 4260
- Door interaction thresholds: 4
- Projected guarded operations: `6645960b219a2118095726c34cd300811da1cc3e0adfb5b98af41d63e5db5d79`
- Projected target cells: 182

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
| TE-ROUTE-C01-PUBLIC-VERTICAL | c01-bunker | PASS | PASS | 89/89 | 2 |
| TE-ROUTE-C01-OWNER-VERTICAL | c01-bunker | PASS | PASS | 102/102 | 2 |
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

This FAIL does not accept the immutable-snapshot geometry and cannot
satisfy Town Expansion final acceptance. A future PASS would still not
claim live traversal, powered-door controls, dynamic entity clearance, or citizen activation.
