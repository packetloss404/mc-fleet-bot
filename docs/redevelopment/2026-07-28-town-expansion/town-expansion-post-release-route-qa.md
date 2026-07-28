# Town Expansion R1 post-release representative route QA

- Status: **FAIL**
- Acceptance class: `REJECTED`
- Immutable post snapshot: `1f036e48a82ccd5061e34686b049700e861b7a3bc99f69bd03ee3b1c1b2e463a`
- Canonical package: `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Manifest: `docs/redevelopment/2026-07-28-town-expansion/town-expansion-representative-route-manifest.json`
- Routes: 14/22 passed
- Directions: 28/44 passed
- Exact path cells: 3194
- Door interaction thresholds: 0

## Coverage

| Domain | Routes | Passed |
|---|---:|---:|
| c01-bunker | 5 | 2 |
| citizen-commute | 1 | 1 |
| civic-guild-library | 2 | 2 |
| data-district-concord | 6 | 6 |
| mainstreet-warehouse-roads | 3 | 1 |
| observatory-estate-portals | 2 | 0 |
| westlight-stadium-pier | 3 | 2 |

## Representative routes

| Route | Domain | Forward | Reverse | Path cells (F/R) | Minimum headroom |
|---|---|---:|---:|---:|---:|
| TE-ROUTE-C01-L1-ENTRY-GARAGE | c01-bunker | PASS | PASS | 145/145 | 7 |
| TE-ROUTE-C01-MOUNTAIN-PORTAL-L1 | c01-bunker | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-C01-PUBLIC-VERTICAL | c01-bunker | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-C01-OWNER-VERTICAL | c01-bunker | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-C01-SERVICE-BACKBONE | c01-bunker | PASS | PASS | 97/97 | 6 |
| TE-ROUTE-CIVIC-LIBRARY-PAVILION-GUILD | civic-guild-library | PASS | PASS | 48/48 | 4 |
| TE-ROUTE-CIVIC-SECRET-ARCHIVE | civic-guild-library | PASS | PASS | 43/43 | 5 |
| TE-ROUTE-WESTLIGHT-STADIUM-PIER-AXIS | westlight-stadium-pier | PASS | PASS | 110/110 | 9 |
| TE-ROUTE-WESTLIGHT-PIER-RESTAURANTS | westlight-stadium-pier | PASS | PASS | 22/22 | 2 |
| TE-ROUTE-WESTLIGHT-VENUE-CORE | westlight-stadium-pier | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL | mainstreet-warehouse-roads | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-MAINSTREET-P01-DRIVE-AISLE | mainstreet-warehouse-roads | PASS | PASS | 227/227 | 9 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS | mainstreet-warehouse-roads | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-DATA-DISTRICT-SHARED-GREENWAY | data-district-concord | PASS | PASS | 83/83 | 2 |
| TE-ROUTE-DATA-DISTRICT-META-GOOGLE-SPINE | data-district-concord | PASS | PASS | 173/173 | 2 |
| TE-ROUTE-DATA-DISTRICT-LIGHTEDGE-SPUR | data-district-concord | PASS | PASS | 110/110 | 2 |
| TE-ROUTE-DATA-DISTRICT-HALL-AISLES | data-district-concord | PASS | PASS | 3/3 | 6 |
| TE-ROUTE-CONCORD-BROADCAST-PUBLIC | data-district-concord | PASS | PASS | 40/40 | 5 |
| TE-ROUTE-CONCORD-SOUNDSTAGE-PUBLIC | data-district-concord | PASS | PASS | 7/7 | 6 |
| TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC | observatory-estate-portals | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-OBSERVATORY-PORTAL-HUB | observatory-estate-portals | FAIL | FAIL | 0/0 | 0 |
| RR-MSA-CITIZEN-COMMUTE-01-BIDIRECTIONAL | citizen-commute | PASS | PASS | 489/489 | 3 |

## Blocking offline findings

- **TE-ROUTE-C01-MOUNTAIN-PORTAL-L1:** no bounded normal-walk path found; no bounded normal-walk path found (closest 10 blocks at 807,57,-84; closest 29 blocks at 701,43,-52).
- **TE-ROUTE-C01-PUBLIC-VERTICAL:** no bounded normal-walk path found; no bounded normal-walk path found (closest 15 blocks at 839,43,-50; closest 18 blocks at 772,25,-44).
- **TE-ROUTE-C01-OWNER-VERTICAL:** no bounded normal-walk path found; no bounded normal-walk path found (closest 28 blocks at 836,15,-47; closest 29 blocks at 815,-13,-33).
- **TE-ROUTE-WESTLIGHT-VENUE-CORE:** no bounded normal-walk path found; no bounded normal-walk path found (closest 44 blocks at -438,68,-536; closest 44 blocks at -433,24,-538).
- **TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL:** no bounded normal-walk path found; no bounded normal-walk path found (closest 104 blocks at 42,64,202; closest 2 blocks at 42,64,204).
- **TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS:** no bounded normal-walk path found; no bounded normal-walk path found (closest 6 blocks at 86,43,254; closest 46 blocks at 90,43,247).
- **TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC:** no bounded normal-walk path found; no bounded normal-walk path found (closest 14 blocks at 195,107,144; closest 13 blocks at 209,120,182).
- **TE-ROUTE-OBSERVATORY-PORTAL-HUB:** no bounded normal-walk path found; no bounded normal-walk path found (closest 34 blocks at 224,106,157; closest 41 blocks at 231,79,156).

## Live-only follow-up gates

- **TE-LIVE-ROUTE-01:** Run a no-dig/no-tower Mineflayer walker over each representative route in both directions against the same live save state. Status: `PENDING`.
- **TE-LIVE-ROUTE-02:** Exercise powered iron-door, airlock and access-control interactions without breaking blocks. Status: `PENDING`.
- **TE-LIVE-ROUTE-03:** Observe dynamic entity collision and crowding at C01, civic, Westlight, warehouse, data-district and observatory thresholds. Status: `PENDING`.
- **TE-LIVE-ROUTE-04:** Complete the separately controlled citizen commute live walk before enabling resident shifts. Status: `PENDING`.

This FAIL does not accept the immutable-snapshot geometry and cannot
satisfy Town Expansion final acceptance. A future PASS would still not
claim live traversal, powered-door controls, dynamic entity clearance, or citizen activation.

