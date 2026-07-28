# Town Expansion R1 program-to-envelope audit

**Status:** HOLD_CRITICAL_PROGRAM_ENVELOPE_FINDINGS
**Generated:** 2026-07-28T07:03:35.190Z
**Mode:** read-only; no generator, database, snapshot, or live-world mutation

## Executive result

8 findings: 6 critical, 2 high, 0 medium.

## Critical

### FIT-C01-001 — The compact C01 module shrinks the recognizable big-square base

- Scopes: `TE-C01-EAST-REBUILD`
- Bounds: {"oldFootprint":[100,70,300,235],"currentMainModule":[797,-140,888,-85]}
- Promised: Preserve and use the full bunker-square program capacity; every internal column must be classified and no dead void may be hidden.
- Measured: 5,152 columns versus 33,366 old-footprint columns (15.4%). The report exposes only 12 program rooms in a 92×56 module.
- Evidence: data/buildops/town-expansion-r1-wip2.report.json coverage.c01MainModuleBounds/c01RelocationProgramRooms; docs/redevelopment/2026-07-28-town-expansion/c01-east-relocation-coordinate-schedule.json existing.c01.bounds.
- Consequence: The current package cannot prove that the former large base was used, and it has no full-envelope utilization/classification ledger.

### FIT-C01-002 — Rejected arena and compact display bay still occupy the main arrival level

- Scopes: `TE-C01-EAST-REBUILD`
- Bounds: {"northRoom":[800,42,-137,835,49,-118],"hangarRoom":[850,42,-137,885,49,-118]}
- Promised: No stadium/arena. One true clear-span hangar with a glazed two-story support/administration wall, plus an obvious replacement destination from the orientation concourse.
- Measured: Roles still include b1_training_arena (true) and compact_aircraft_display (true); the nominal hangar room has only a 34×18 interior after perimeter walls.
- Evidence: scripts/generate_town_expansion_r1.mjs modelC01EastRelocation; data/buildops/town-expansion-r1-wip2.report.json TE-C01-EAST-REBUILD role census.
- Consequence: The arrival sequence still presents the exact two objects the user rejected and does not physically express a large clear-span hangar.

### FIT-C01-003 — C01 vertical circulation is compact and lacks the promised broad stair/lift system

- Scopes: `TE-C01-EAST-REBUILD`
- Bounds: {"primaryCore":[840,21,-137,846,51,-119],"eastEgress":[880,42,-112,887,82,-101]}
- Promised: Broad, visible, landing-rich stairs and lifts connecting every occupied level, with a continuous entrance-to-main-level loop.
- Measured: 4 compactSwitchbackStair calls in C01; zero lift-role occurrences in the C01 scope; the primary outer core is only 7 blocks wide.
- Evidence: scripts/generate_town_expansion_r1.mjs modelC01EastRelocation; data/buildops/town-expansion-r1-wip2.report.json TE-C01-EAST-REBUILD roles.
- Consequence: The current geometry does not meet the legibility/access brief and provides no graph proof that every occupied room is reachable.

### FIT-C01-004 — The expanded public and owner program is absent from the C01 envelope

- Scopes: `TE-C01-EAST-REBUILD`
- Bounds: {"minX":690,"minY":20,"minZ":-140,"maxX":888,"maxY":82,"maxZ":-49}
- Promised: Exact current contract: {"publicAdultsOnlyWingDoubled":2,"ownerBedroomSuites":15,"ownerMasterBedrooms":3,"ownerMicroDataRacks":2,"ownerKitchens":2}, distinct public/owner/service/tunnel routes, owner-only deep club/residence, and non-graphic architectural treatment.
- Measured: Matching C01 operation roles: 4; exact promised suites/bedrooms/racks/kitchens currently measure 0.
- Evidence: data/buildops/town-expansion-r1-wip2.report.json TE-C01-EAST-REBUILD role census and coverage.c01RelocationProgramRooms.
- Consequence: This is an omitted main program, not a detail pass; it cannot fit without a new classified multi-level envelope.

### FIT-CBE-001 — Broadcast Exchange source is a reduced placeholder, not the frozen 113-room schedule

- Scopes: `TE-IA-CONCORD-BROADCAST-EXCHANGE`, `TE-IA-CONCORD-BROADCAST-TOWER`, `TE-IA-CONCORD-SATELLITE-PAD`
- Bounds: {"sourceShell":[680,-425,730,-350],"frozenShell":[680,38,-425,715,84,-350],"frozenSatellitePad":[737,62,-425,769,78,-390]}
- Promised: Frozen exact schedule: 33 above-ground mini rooms, 8 B2 set rooms, 2 halls, 9 dishes, 113 total room records.
- Measured: 12 above-ground rooms, 4 underground themed rooms, 0 hall, 3 dish arrays. The current generated report contains no TE-IA-CONCORD-BROADCAST-EXCHANGE scope summary.
- Evidence: scripts/generate_town_expansion_r1.mjs modelConcordServiceTown; docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-coordinate-schedule.json; data/buildops/town-expansion-r1-wip2.report.json.
- Consequence: Named program exists in prose/source, but most distinct rooms, support spaces, tower decks, and exact capacities are not represented in the release artifact.

### FIT-DATA-001 — The current generated package/report contains only the obsolete ten-hall data-campus increment

- Scopes: `TE-IA-DATA-DM01`, `TE-IA-DATA-DM02`, `TE-IA-DATA-DM03`, `TE-IA-DATA-DM04`, `TE-IA-DATA-DM05`, `TE-IA-DATA-DM06`, `TE-IA-DATA-DM07`, `TE-IA-DATA-DM08`, `TE-IA-DATA-DM09`, `TE-IA-DATA-DM10`
- Bounds: {"generatedCampusBounds":{"minX":723,"minZ":-649,"maxX":1025,"maxZ":-289}}
- Promised: 24 DSM-numbered halls plus 12 Meta-inspired, 6 Google-inspired, and 2 LightEdge EdgeBCC buildings: 44 walkable halls total.
- Measured: 10 DSM scope summaries and 0 Meta/Google/EdgeBCC scope summaries; coverage.dataCenterCampusBuildings=10.
- Evidence: data/buildops/town-expansion-r1-wip2.report.json operations.scopeSummary and coverage.
- Consequence: Even if newer source code is in progress, the current exact-state package does not contain the promised campuses and cannot be treated as the deployable source of truth.

## High

### FIT-CBE-002 — Broadcast Exchange circulation count is below the frozen access plan

- Scopes: `TE-IA-CONCORD-BROADCAST-EXCHANGE`
- Bounds: {"currentUnderground":[682,28,-421,728,55,-354]}
- Promised: Five vertical cores: north/south public, north/south service-performer, and central freight; distinct public, creator, performer, service, tower, satellite, and garden routes.
- Measured: Current model declares two broad stair cores and one lift core (3 total) and combines creator/service/public into one gallery.
- Evidence: scripts/generate_town_expansion_r1.mjs return.broadcastExchange and generated core roles; docs/redevelopment/2026-07-28-town-expansion/concord-broadcast-exchange-coordinate-schedule.json verticalCirculation.
- Consequence: The promised room count cannot have believable separated public/backstage/service access with the current three-core representation.

### FIT-STEWARD-001 — Plural steward-cottage conversion currently resolves to one mini-mansion

- Scopes: `TE-RRCH-STEWARD-MINI-MANSION`
- Bounds: {"minX":-140,"minY":65,"minZ":-357,"maxX":-106,"maxY":89,"maxZ":-331}
- Promised: Convert all steward cottages in the worker town into blended, detailed mid-management mini-mansions.
- Measured: coverage.stewardCottagesFoundAndUpgraded=1; one converted envelope is present.
- Evidence: data/buildops/town-expansion-r1-wip2.report.json coverage and TE-RRCH-STEWARD-MINI-MANSION scope summary.
- Consequence: The singular implementation can be internally detailed but does not fulfill the plural source-feature inventory.

## Reviewed false positives and exclusions

- **EXCL-SCREEN-001:** The current C01 arena is rejected as a program, but it is not flagged for the earlier “seats face a doorway/no screen” defect: the current source places a screen before its seating.

- **EXCL-GUILD-001:** Guild Hall has two basement levels, three above-grade stories, four kitchen worklines, screen-before-seat theater/lecture roles, dormitory bays, and a normal-walk stair in the generated role census. No numeric contradiction was established in this pass.

- **EXCL-WESTLIGHT-001:** Westlight source declares three venues, distinct identity entries, separate backstage rooms, service loading, and vertical cores. Post-state walking/visual proof is still required, but absence of that future proof is not itself a fit contradiction.

- **EXCL-GILDED-001:** The Gilded Raven theater/tunnel has a frozen exact schedule and previously passed focused generator tests; no new envelope contradiction was established here.

- **EXCL-DM-RACKS-001:** Each of the ten DSM halls in this stale report declares 40 rack rows; the finding is missing campus/hall count, not rack-count inflation inside those ten halls.

## Method limits

- This is a static source/report/schedule comparison, not a Minecraft pathfinding or camera review.
- It intentionally reports contradictions before fixes and does not edit the shared generator.
- A newer ungenerated source increment does not cure a stale exact-state operation file/report.
- Schedules labeled planning/frozen are treated as promises, not as-built evidence.

