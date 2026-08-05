# Combined Zones Phase 1 D06 detailed mechanism/circuit setout proposal

Status: **PARTIAL_PASS_EXACT_D06_DETAILED_MECHANISM_CIRCUIT_SETOUT_FUNCTIONAL_ACCEPTANCE_HOLD**

This artifact turns the frozen D06 reservations into exact detailed proposal
layers. It does not assert that any mechanism, circuit, route, drain, control,
material state, owner/interface assignment, construction package, or
commissioning result has been accepted.

## Exact proposal accounting

- Exact source references bound: **73 / 73**
- Detailed proposal layers: **31**
- Raw proposal memberships: **9,464**
- Unique proposal cells: **9,065**
- Duplicate coordinates: **242**
- Exact precedence records: **21**
- Canonical proposal cells after precedence: **9,065**
- Canonical-owner adjacency groups / face pairs: **4 / 59**
- Accepted mechanisms / materials / construction / operations: **0 / 0 / 0 / 0**

| Group | Layers | Raw memberships | Canonical cells |
|---|---:|---:|---:|
| DRAINAGE | 4 | 114 | 114 |
| FIRE_AND_SERVICE | 5 | 3,138 | 3,081 |
| POWER_AND_CONTROLS | 7 | 2,564 | 2,564 |
| SMOKE_AND_BARRIERS | 2 | 264 | 264 |
| STAIR_LIFT_AND_TRANSFER | 10 | 2,484 | 2,142 |
| VENTILATION | 3 | 900 | 900 |

Functional layers may overlap in the raw proposal. The published priority list
adjudicates each exact duplicate before canonical proposal accounting. No
wildcard, shared canonical assignment, or last-writer-wins behavior is used.

## G03 / D06 ambiguity removed

- Both egress cores now have exact proposed stair, lift, transfer-landing, and equipment-cap layers rather than four null mechanism slots.
- Each local vent riser is exactly divided into duct, fan-equipment, and sealed outlet-cap cells.
- All smoke-door and platform-gate mechanism bays are exact and remain fail-closed.
- Normal, emergency A, and emergency B now have physically separated exact carrier and equipment proposal cells, while source/control/transfer/independence evidence remains null.
- Eight local sump/pump equipment bays and caps, the retained drainage header/boundary cap, and internal fire/service control positions are exact.
- Every internal same-coordinate duplicate has a deterministic exact precedence result, and known cross-scope components are conflict-free.
- Four canonical logical-owner adjacency groups covering 59 exact face pairs are endpoint-validated, directional, sealed, and unaccepted.

## Genuine residual blockers

- **D06-SET-H01-EXTERNAL-EGRESS-AND-SAFE-ENDPOINTS** — Exact protected exterior routes, accessible discharge, refuge/rescue behavior, and accepted safe endpoints for EG-A and EG-B.
- **D06-SET-H02-VENT-EXTERIOR-DISCHARGE-AND-SMOKE-MODEL** — Exterior outlet geometry beyond retained caps, supply/extract mode, capacity, smoke control, weather protection, and accepted discharge effects.
- **D06-SET-H03-ACTUAL-MECHANISM-STATES-CONTROLS-AND-FAILURE-LOGIC** — Exact block states and functional logic for stairs/lifts, fans, smoke doors, platform gates, manual releases, detectors, barriers, and reset/failure behavior.
- **D06-SET-H04-CIRCUIT-SOURCES-CONTROLS-TRANSFER-AND-INDEPENDENCE** — Normal and two genuinely independent emergency sources, controls, transfer logic, state traces, protection, load/coverage results, and common-cause proof.
- **D06-SET-H05-DRAINAGE-HYDRAULICS-PUMP-STATES-AND-RECEIVER** — Catchments, source/future fluids, inflow, storage, freeboard, pump/control states, recovery, outfall, external discharge, and accepted receiver contract.
- **D06-SET-H06-EXTERNAL-FIRE-SERVICE-ROUTE-AND-EMERGENCY-SERVICE** — Exact exterior approach, vehicle/personnel access, internal transfer behavior, access controls, and emergency-service acceptance.
- **D06-SET-H07-STRUCTURAL-GEOTECHNICAL-AND-MATERIAL-STATES** — Loads, support/lining, foundations, penetrations, material/future states, construction influence, quantities, and exact source guards.
- **D06-SET-H08-COMPLETE-SAVE-ENTITY-POI-ALL-START** — One same-moment complete save and final entity, POI, block-entity, fluid, and generated-start clearance against every influence set.
- **D06-SET-H09-OWNER-INTERFACE-TECHNICAL-ACCEPTANCE-AND-COMMISSIONING** — Accepted one-owner assignments, directional interfaces, technical review, all 29 commissioning results, and one immutable accepted D06 identity.

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
| D06-SET-G01-SOURCE-AND-REFERENCE-CONTRACT | PASS | The D06 contract and all 73 passed exact reservation references are hash-bound with technical acceptance retained as false. |
| D06-SET-G02-STAIR-LIFT-TRANSFER-EQUIPMENT | PASS_EXACT_PROPOSAL_ONLY | Both egress cores now have exact stair/lift envelopes, transfer landings, and end-equipment proposal caps. |
| D06-SET-G03-VENT-SMOKE-AND-PLATFORM-MECHANISMS | PASS_EXACT_PROPOSAL_ONLY | Four risers are partitioned into duct/fan/outlet proposals, and every smoke-door/platform-gate bay has an exact fail-closed mechanism reservation. |
| D06-SET-G04-NORMAL-AND-EMERGENCY-CIRCUITS | PASS_EXACT_CARRIER_PROPOSAL_FUNCTIONAL_HOLD | Three physically separated carrier/equipment proposals and all 56 fixture cells are exact; sources, controls, transfer, coverage, and independence remain unaccepted. |
| D06-SET-G05-DRAINAGE-AND-FIRE-SERVICE-CONTROLS | PASS_EXACT_PROPOSAL_ONLY | Eight local pump/cap bays, retained header/cap geometry, fire spine/caps, and eight internal control-panel reservations are exact. |
| D06-SET-G06-INTERNAL-DUPLICATE-PRECEDENCE | PASS_EXACT_PROPOSAL_ONLY | 242 same-coordinate duplicate proposal cells are adjudicated by 21 exact layer-pair records with no wildcard or last-writer rule. |
| D06-SET-G07-CROSS-SCOPE-CONFLICT | PASS_KNOWN_SCOPE_GEOMETRY_COMPLETE_SAVE_HOLD | The detailed Empty Eight proposal is disjoint from known D02, D05, P1-B12, and separate B07 components; missing external/influence sets remain unknown. |
| D06-SET-G07A-CANONICAL-OWNER-ADJACENCY | PASS_EXACT_PROPOSAL_ONLY | 4 canonical-owner adjacency groups and 59 face pairs are exact, directional, default-deny, and unaccepted. |
| D06-SET-G08-FUNCTIONAL-TECHNICAL-AND-COMMISSIONING | HOLD | 9 functional/external/technical/complete-save/acceptance classes remain explicit null/HOLD. |
| D06-SET-G09-G03-D06-ACCEPTANCE | HOLD | G03/D06 proposal geometry is more complete, but accepted mechanism/material/construction/owner/interface/operation cells and commissioning results remain zero. |

## Safety boundary

This was a deterministic offline compilation. Accepted mechanisms, functional
states, materials, construction cells, owners, interfaces, operations, and
commissioning results remain zero. Report identity:
`d3c5db62435e6210f56139d3f76f221fbfb335e18fe9775ce8a5209e0e01e958`.
