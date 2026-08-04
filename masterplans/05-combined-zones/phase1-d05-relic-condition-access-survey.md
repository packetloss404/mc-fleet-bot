# D05-S01 relic condition and access-candidate survey

Status: **OFFLINE SURVEY COMPLETE — D05, G02, G06, AND G07 REMAIN HOLD**

This report performs the strongest deterministic local survey available from the bound immutable copied Anvil snapshot. It inventories exact present fabric, direct-below contact states, local air components, block-entity locations, boundary-threshold candidates, air-only sightline candidates, and bounded observation-route candidates. It does not inspect live state, authorize access, certify structure or terrain safety, or infer a vanilla template.

Bound snapshot: `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`.

| Relic | Present cells | Present components | Below present/air/fluid | Core void components | Core block entities | Threshold candidates | Observation route |
|---|---:|---:|---:|---:|---:|---:|---|
| igloo-east | 0 | 0 | 0/0/0 | 1 | 0 | 0 | NO_CANDIDATE |
| igloo-west | 187 | 1 | 56/0/0 | 1 | 3 | 28 | EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE |
| shipwreck | 1118 | 1 | 96/116/0 | 5 | 3 | 8 | EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE |

### igloo-east

- Finding: `NO_PRESENT_FABRIC_IN_RECORDED_CORE`.
- Present cells: 0 across 0 six-connected component(s).
- Air-exposed present cells: 0; fluid-adjacent present cells: 0.
- Direct-below contacts by occupied core column: 0 present, 0 air, 0 fluid. These are contact facts, not load findings.
- Fixed core-underlay plane: 0 present, 56 air, 0 fluid; 0 footprint columns have a present local terrain cell below.
- Local voids: 1 component(s), 1 intersecting the recorded core.
- Core block entities: 0; NBT payload inspected: no.
- Threshold candidates: 0; entrance established: no.
- Observation result: `NO_CANDIDATE`. Access authorized: no.

### igloo-west

- Finding: `PRESENT_FABRIC_EXACT_LOCAL_CONDITION_CENSUS`.
- Present cells: 187 across 1 six-connected component(s).
- Air-exposed present cells: 117; fluid-adjacent present cells: 0.
- Direct-below contacts by occupied core column: 56 present, 0 air, 0 fluid. These are contact facts, not load findings.
- Fixed core-underlay plane: 56 present, 0 air, 0 fluid; 56 footprint columns have a present local terrain cell below.
- Local voids: 2 component(s), 1 intersecting the recorded core.
- Core block entities: 3; NBT payload inspected: no.
- Threshold candidates: 28; entrance established: no.
- Observation result: `EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE`, 14 exact candidate path cells. Access authorized: no.

### shipwreck

- Finding: `PRESENT_FABRIC_EXACT_LOCAL_CONDITION_CENSUS`.
- Present cells: 1,118 across 1 six-connected component(s).
- Air-exposed present cells: 606; fluid-adjacent present cells: 0.
- Direct-below contacts by occupied core column: 96 present, 116 air, 0 fluid. These are contact facts, not load findings.
- Fixed core-underlay plane: 104 present, 148 air, 0 fluid; 155 footprint columns have a present local terrain cell below.
- Local voids: 49 component(s), 5 intersecting the recorded core.
- Core block entities: 3; NBT payload inspected: no.
- Threshold candidates: 8; entrance established: no.
- Observation result: `EXACT_OFFLINE_OBSERVATION_ROUTE_CANDIDATE`, 19 exact candidate path cells. Access authorized: no.

## What advanced

`D05-S01-RELIC-CONDITION-AND-ACCESS` now passes as **offline survey evidence** for all three records. The same immutable snapshot independently confirms the east recorded core contains zero present cells. Exact route candidates, when found, remain outside the proposed minimum planning exclusion and are evidence only.

## What remains

- sole-authority acceptance of the proposed minimum planning exclusions and east-site disposition
- template/heritage attribution and condition interpretation beyond block-state facts
- structural support, groundwater, entrance, fall, lighting, accessibility, emergency, and exhibit-safety review
- the exact future mountain, direct-construction, staging, access, and physics-influence cell sets
- expert hydrology/geotechnical review and the all-50-structure exact clearance audit

D05, G02, G06, and G07 remain HOLD. No owner acceptance, expert acceptance, construction cells, influence cells, access authorization, material cells, operation cells, or world-edit authorization is emitted.

Reproduce with:

```bash
node scripts/audit_combined_zones_d05_relic_condition_access.mjs
```
