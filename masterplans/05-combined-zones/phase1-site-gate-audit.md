# Combined Zones Phase 1 site-gate audit

Status: **HOLD — PHASE 1 EXIT IS NOT SATISFIED — NO WORLD EDITS**

This is a read-only readiness audit of [Masterplan 05](MASTERPLAN.md), not a construction package. It binds the reconciled `01 + 02 + 03 -> 04 -> 05` plan, the existing copied Anvil snapshots, Phase 0 evidence, and the durable catalog. It did not connect to Minecraft, RCON, the fleet API, systemd, or any live-world mutation path.

The Phase 0 site selection remains a genuine **PASS for detailed design**. The project is nevertheless on **HOLD for a real build** because the Phase 1 exit evidence does not yet exist.

## Gate result

| Gate | Result | Exact scope or blocker |
|---|---|---|
| Phase 0 terrain siting | **PASS** | All eleven declared gates pass against the hash-bound copied region snapshot. |
| Archival artifact integrity | **PASS** | Accepted baseline, Phase 0 pre/post region hashes, byte counts, member counts, and catalog identity match their declarations. |
| Catalog geometric separation | **PASS** | No cataloged surface feature intersects C1; the reserve starts 200 blocks east of the catalog union. This is geometry only. |
| Fresh release source identity | **HOLD** | There is no fresh complete immutable region set binding the accepted world/catalog identity, compiler inputs, world border, and exact operation targets. The same-moment entity gate remains separate. |
| Hydrology and 3D fluids | **HOLD** | A full-height mountain census, exact connected components, and D8 surface-routing candidate exist; future grading/influence volumes, owners, expert hydraulics, outfalls, and before/after flow proof do not. |
| Generated/protected structures | **HOLD** | Three zero-margin cores and one-cell adjacency candidates are frozen, but every candidate is unreviewed; east-igloo disposition, complete construction-volume intersection, and poststate preservation are absent. |
| Ownership and interfaces | **HOLD** | D03 removes unsurveyed L2 from active scope. No exact cell-owner/interface-contract set exists and C01 loading remains unresolved. |
| Entity clearance | **HOLD** | The Phase 0 copy has no entity regions and no operation-bound live entity gate exists. |
| Civil, vertical, and life safety | **HOLD** | Exact C1 civil coordination and Empty Eight internal safety reservations are frozen; geotechnical/structural/outfall/C01 acceptance, external egress/vent/discharge/fire-service continuations, commissioned systems, and construction cells remain open. |
| Exact guards and rollback | **HOLD** | There are no Combined Zones forward operations, exact inverse, manifest, or strict-noop source preflight. |
| Bounded bidirectional pilot | **HOLD** | A bounded C1 coordination candidate and exact empty rail-reservation setout exist, but no physical target cells, guarded operations, rollback proof, or route QA exists. |
| Phase 1 exit | **HOLD** | Every required Phase 1 exit gate must pass independently. |

## Subsequent remediation

Four machine-readable packages now refine this audit without changing its fail-closed result:

- [Phase 1 geometry coordination](phase1-geometry-coordination.json) freezes rational vertical transforms and planning-envelope semantics, while emitting zero operation and material cells.
- [Phase 1 design decisions](phase1-design-decisions.json) resolves D01 same-world placement, D03 deletion of unsurveyed L2, D04 reserve-first rail staging, and D07 fact-checked composite wording/C2 omission. D02, D05, and D06 remain on HOLD.
- [Protected-relic clearance](phase1-protected-relic-clearance.json) freezes all three recorded structure-start volumes as zero-margin default-deny cores. The west igloo and shipwreck retain present cells; the east igloo's entire 280-cell record is air in the copied snapshot. No positive buffer has been approved.
- [C1 pilot coordination](phase1-c1-pilot-coordination.json) freezes the best current 64-chainage-block study window and the 13-block empty rail strip. It also records up to 17 blocks each of diagnostic cut/fill, 2,671 water cells, 126 lava cells, two creaking hearts, two spawners, two chests, and incomplete adjacent-chunk structure clearance. It is not a physical pilot.
- [C1 civil design](phase1-c1-civil-design.json) freezes 1,216 exact stations, R140/R120/R140 curve rasters, independent 1:8 rail and 1:12 highway profiles, the exact 56/80-block cross-section, diagnostic quantities, drainage collection, and eight C01 comparisons. Six evidence gates keep D02 on HOLD.
- [D05 hydrology and relic-buffer design](phase1-d05-hydrology-relic-buffer-design.json) freezes 1,929,621 water/waterlogged, 85,088 lava, 182,791 frozen, and 359,830 snow cells across the full-height survey prism, plus 5,234 water and 941 lava components. Its three one-cell adjacency shells are exact candidates, not reviewed buffers.
- [Empty Eight and geology design](phase1-empty-eight-geology-design.json) freezes exact internal architecture/safety reservations and resolves D07's fact-checked composite wording while keeping external life-safety continuations, commissioned systems, source guards, and all physical operations on HOLD. C2 remains omitted.

## What the evidence does prove

- All 14,238 atlas chunks and all 6,097 reserve chunks are `minecraft:full`.
- The engineered passenger-rail profile has a maximum grade of `0.125`, while disclosing cuts up to 36 blocks and fills up to 23 blocks.
- The Empty Eight's 29,161 columns are dry, non-arctic, and provide at least eight blocks of cover. Its one X/Z-intersecting mineshaft lies below the proposed shell, so its current structure-start vertical-conflict count is zero.
- The copied Phase 0 snapshots are byte-identical to their declared SHA-256 identities.
- The durable catalog has 1,215 features and matches SHA-256 `71876a7e...5f8a`.

## What must not be inferred

The reserve's 245,299 surface-water columns, 298 surface-lava columns, and low water fractions in selected footprints are not a hydrology design. The evidence does not identify all underground fluid cells that exact excavation or fill would influence.

The structure-start inventory contains 50 starts intersecting the reserve in plan: 35 mineshafts, six trial chambers, two igloos, two shipwrecks, two ruined portals, one cold ocean ruin, one buried treasure, and one snowy village. Twenty-eight intersect Gateway Approach, 19 intersect the mountain, and five intersect the urban core. These categories overlap. Only the Empty Eight shell has been checked vertically against a frozen 3D envelope. Every exact future construction cell set must be checked against all relevant starts.

The three surface relics remain default-deny no-touch features:

- igloo `x=1790…1797`, `y=62…66`, `z=-926…-920`;
- igloo `x=2304…2310`, `y=90…94`, `z=-1024…-1017`;
- shipwreck `x=2072…2099`, `y=69…77`, `z=-661…-653`.

The protected-relic audit now proves exact zero-margin default-deny core coordinates. It does not prove complete preservation: the west igloo has 187 of 280 cells present, the shipwreck 1,118 of 2,268, and the east igloo none of 280 despite its exact start record. It also does not prove safe entrance or an acceptable positive buffer. Observation access is a separate future package.

Catalog clearance also does not establish ownership. C1 crosses the C01 Owner Tunnel Detour in plan, the C01 East L1–L3 stack has no slope-easement gap, and ISSUE-002 remains open. The proposed MainStreet East L2 gate was neither cataloged nor dry, so D03 deletes it from active scope without authorizing demolition or a substitute coordinate.

## Required evidence, in order

1. Preserve resolved D01, D03, D04, and D07, and close D02 civil acceptance, D05 hydrology/relic-buffer review, and D06 external life-safety continuations.
2. Compile one canonical integer coordinate model with explicit rounding, profiles, cross-sections, interfaces, and cell-set hashes.
3. Produce the exact current ownership and interface audit, including C01 structural loading and enforcement of the L2 scope deletion.
4. Cross-check exact 3D construction cells against all 50 reserve structure starts; retain the frozen relic cores, resolve the absent east-igloo condition, and approve exact positive buffers.
5. Bind future exact construction/influence volumes to the full-height baseline, then assign hydrology owners and prove groundwater, drainage, snowmelt, retaining structures, sumps, discharge, and no unintended diversion.
6. Close D02's geotechnical/structural/outfall/C01 gates and D06's surface egress/vent/discharge/fire-service, commissioned-mechanism, source-guard, and operational gates.
7. Close the frozen C1 candidate's civil, hydrology, natural-feature, structure, entity, ownership, and source gates, then compile and validate a small disjoint visual pilot with exact forward/rollback operations and bidirectional route QA.
8. At release preparation, capture a fresh complete immutable region set and bind its world/catalog identity, world border, compiler inputs, and all exact target chunks.
9. After exact operations exist and immediately before any separately authorized execution, run the package-bound same-moment live entity gate.
10. Require strict-noop parser and source-state preflights, exact rollback, post snapshot, route/media QA, catalog import, and final acceptance.

The machine-readable evidence and exact hashes are in [phase1-site-gate-audit.json](phase1-site-gate-audit.json). Offline detailed design may continue. Physical work remains prohibited until every applicable gate changes from `HOLD` to independently verified `PASS`.
