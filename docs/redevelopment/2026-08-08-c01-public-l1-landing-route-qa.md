# Town Expansion R1 post-release representative route QA

- Status: **FAIL**
- Acceptance class: `REJECTED`
- Immutable post snapshot: `c478796458bb5dcd76c7634c5d6754f6a8d0c0a6378c42b742323084696db7c3`
- Canonical package: `b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b`
- Manifest: `docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-as-built-route-manifest.json`
- Routes: 15/22 passed
- Directions: 30/30 passed
- Exact path cells: 2224
- Door interaction thresholds: 4

## Coverage

| Domain | Routes | Passed |
|---|---:|---:|
| c01-bunker | 5 | 5 |
| citizen-commute | 1 | 0 |
| civic-guild-library | 2 | 0 |
| data-district-concord | 6 | 6 |
| mainstreet-warehouse-roads | 3 | 2 |
| observatory-estate-portals | 2 | 2 |
| westlight-stadium-pier | 3 | 0 |

## Representative routes

| Route | Domain | Forward | Reverse | Path cells (F/R) | Minimum headroom |
|---|---|---:|---:|---:|---:|
| TE-ROUTE-C01-L1-ENTRY-GARAGE | c01-bunker | PASS | PASS | 145/145 | 7 |
| TE-ROUTE-C01-MOUNTAIN-PORTAL-L1 | c01-bunker | PASS | PASS | 2/2 | 6 |
| TE-ROUTE-C01-PUBLIC-VERTICAL | c01-bunker | PASS | PASS | 85/85 | 3 |
| TE-ROUTE-C01-OWNER-VERTICAL | c01-bunker | PASS | PASS | 90/90 | 3 |
| TE-ROUTE-C01-SERVICE-BACKBONE | c01-bunker | PASS | PASS | 97/97 | 6 |
| TE-ROUTE-CIVIC-LIBRARY-PAVILION-GUILD | civic-guild-library | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-CIVIC-SECRET-ARCHIVE | civic-guild-library | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-WESTLIGHT-STADIUM-PIER-AXIS | westlight-stadium-pier | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-WESTLIGHT-PIER-RESTAURANTS | westlight-stadium-pier | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-WESTLIGHT-VENUE-CORE | westlight-stadium-pier | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-DRIVE-HALL | mainstreet-warehouse-roads | PASS | PASS | 85/85 | 5 |
| TE-ROUTE-MAINSTREET-P01-DRIVE-AISLE | mainstreet-warehouse-roads | FAIL | FAIL | 0/0 | 0 |
| TE-ROUTE-MAINSTREET-WAREHOUSE-EAST-WINGS | mainstreet-warehouse-roads | PASS | PASS | 61/61 | 2 |
| TE-ROUTE-DATA-DISTRICT-SHARED-GREENWAY | data-district-concord | PASS | PASS | 83/83 | 2 |
| TE-ROUTE-DATA-DISTRICT-META-GOOGLE-SPINE | data-district-concord | PASS | PASS | 173/173 | 2 |
| TE-ROUTE-DATA-DISTRICT-LIGHTEDGE-SPUR | data-district-concord | PASS | PASS | 110/110 | 2 |
| TE-ROUTE-DATA-DISTRICT-HALL-AISLES | data-district-concord | PASS | PASS | 3/3 | 6 |
| TE-ROUTE-CONCORD-BROADCAST-PUBLIC | data-district-concord | PASS | PASS | 40/40 | 5 |
| TE-ROUTE-CONCORD-SOUNDSTAGE-PUBLIC | data-district-concord | PASS | PASS | 7/7 | 6 |
| TE-ROUTE-OBSERVATORY-ESTATE-PUBLIC | observatory-estate-portals | PASS | PASS | 75/75 | 2 |
| TE-ROUTE-OBSERVATORY-PORTAL-HUB | observatory-estate-portals | PASS | PASS | 56/56 | 3 |
| RR-MSA-CITIZEN-COMMUTE-01-BIDIRECTIONAL | citizen-commute | FAIL | FAIL | 0/0 | 0 |

## Blocking offline findings

- **TE-ROUTE-CIVIC-LIBRARY-PAVILION-GUILD:** start anchor has no standable cells; end anchor has no standable cells ().
- **TE-ROUTE-CIVIC-SECRET-ARCHIVE:** start anchor has no standable cells; end anchor has no standable cells ().
- **TE-ROUTE-WESTLIGHT-STADIUM-PIER-AXIS:** start anchor has no standable cells; end anchor has no standable cells ().
- **TE-ROUTE-WESTLIGHT-PIER-RESTAURANTS:** start anchor has no standable cells; end anchor has no standable cells ().
- **TE-ROUTE-WESTLIGHT-VENUE-CORE:** start anchor has no standable cells; end anchor has no standable cells ().
- **TE-ROUTE-MAINSTREET-P01-DRIVE-AISLE:** start anchor has no standable cells ().
- **RR-MSA-CITIZEN-COMMUTE-01-BIDIRECTIONAL:** start anchor has no standable cells; end anchor has no standable cells ().

## Live-only follow-up gates

- **TE-LIVE-ROUTE-01:** Run a no-dig/no-tower Mineflayer walker over each representative route in both directions against the same live save state. Status: `PENDING`.
- **TE-LIVE-ROUTE-02:** Exercise powered iron-door, airlock and access-control interactions without breaking blocks. Status: `PENDING`.
- **TE-LIVE-ROUTE-03:** Observe dynamic entity collision and crowding at C01, civic, Westlight, warehouse, data-district and observatory thresholds. Status: `PENDING`.
- **TE-LIVE-ROUTE-04:** Complete the separately controlled citizen commute live walk before enabling resident shifts. Status: `PENDING`.

This FAIL does not accept the immutable-snapshot geometry and cannot
satisfy Town Expansion final acceptance. A future PASS would still not
claim live traversal, powered-door controls, dynamic entity clearance, or citizen activation.
