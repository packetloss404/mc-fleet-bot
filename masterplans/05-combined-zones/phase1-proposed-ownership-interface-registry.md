# Combined Zones Phase 1 proposed ownership and interface registry

Status: **PARTIAL_PASS_EXACT_PROPOSED_OWNERSHIP_AND_DIRECTIONAL_INTERFACES_FINAL_ACCEPTANCE_HOLD**

This registry converges G03 v2 with the exact D02/C01, D05/B09, detailed D06,
and Grand Avenue P1-B11/P1-B12 evidence into one deterministic ownership/interface proposal. It does not self-approve
any owner, interface, technical design, construction package, or world edit.

## Exact proposal accounting

- Proposed logical owners: **27**
- Known proposal/reference cells assigned once after precedence: **16,542,566**
- Exact conflict-adjudication records: **26**
- Directional/default-deny interface records: **78**
- Interfaces with exact cell sets: **64**
- Interfaces with exact transition-pair hashes: **25**
- Interfaces still null/HOLD: **14**
- Accepted owners/interfaces/operations: **0 / 0 / 0**

## Proposed logical owners

| Owner | Scope | Proposed cells | Status |
|---|---|---:|---|
| OWN-D02-C1-DRAINAGE-CONTROL | D02/C01 | 387 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C01-OWNER-TUNNEL-CONTROL | D02/C01 | unknown | HOLD_CATALOG_BOUNDS_ONLY_EXACT_PHYSICAL_OCCUPANCY_MISSING |
| OWN-C01-C1-LOADING-SEPARATION-RESERVATION-CONTROL | D02/C01 | 944,298 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-RAIL-CESS-CONTROL | D02/C01 | 572 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-ROAD-COLLECTION-CONTROL | D02/C01 | 0 | PROPOSED_EXACT_ZERO_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-RAIL-FORMATION-CONTROL | D02/C01 | 2,023 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-ROAD-SURFACE-CONTROL | D02/C01 | 0 | PROPOSED_EXACT_ZERO_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL | D02/C01 | 5,199 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL | D02/C01 | 0 | PROPOSED_EXACT_ZERO_ASSIGNMENT_NOT_ACCEPTED |
| CZ05-PROTECTED-RELIC-CONTROL | D05 | 4,890 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| CZ05-MOUNTAIN-HYDROLOGY-CONTROL | D05 | 736,227 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| CZ05-SCOPE-CONSTRUCTION-CONTROL | D05 | 14,786,187 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D05-B08-SERVICE-TUNNEL-CONTROL | D05 | 15,096 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| CZ05-Z11-FUNICULAR-CONTROL | D05 | 7,764 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-SMOKE | D06 | 72 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-BARRIER | D06 | 192 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-EG-A | D06 | 1,227 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-EG-B | D06 | 915 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-VENT | D06 | 900 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-POWER | D06 | 2,564 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-DRAIN | D06 | 114 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-D06-FIRE | D06 | 3,081 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-B07 | D06 | 8,134 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-Z03-GRAND-AVENUE-PASSIVE-SHELL-CANDIDATE | P1-B12 | 8,465 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-P1-B12-GA-PASSIVE-SHELL-RESERVATIONS | P1-B12 | 5,263 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-Z03-GRAND-AVENUE-SURFACE-ROAD-CONTROL | P1-B12 | 8,112 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |
| OWN-Z05-HOUSTON-CONTROL | P1-B12 | 884 | PROPOSED_LOGICAL_OWNER_EXACT_ASSIGNMENT_NOT_ACCEPTED |

The logical owner names describe control responsibilities, not additional human
decision makers. The sole human owner still must separately accept the completed
immutable registry after the remaining technical evidence closes.

## Conflict handling

Known same-coordinate conflicts use explicit exact precedence records. D05 gives
B08 the 36 portal cells and subtracts them from B09. D02/C01 gives the exact
loading-separation reservation precedence over 45 D02 cells. Detailed D06 uses
21 frozen layer-precedence records. The combined B11/B12 map gives Houston
default-deny precedence over its exact 884-cell coordination conflict.
No wildcard, shared ownership, silent clipping, or last-writer-wins rule is used.

## Interfaces

Every contract has a single direction and is default-deny. Exact reconstructed
face adjacencies carry transition-pair hashes. Source artifacts that provide only
an interface cell set retain a null transition-pair hash. Missing maintenance,
power, receiver, B07, summit, and expert-influence geometry stays null/HOLD.

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
| OI-G01-SOURCE-CHAIN | PASS | Accepted planning authority, G03 v2 payload 4742c4d09dd490ccf0cfd89a3139f40bb49e6d3fb2e03ce5584c1c666bd25248, and every converged evidence stream are byte/hash bound. |
| OI-G02-PROPOSED-OWNER-REGISTRY | PASS_PROPOSAL_ONLY | 27 logical owner records cover 16,542,566 known proposal/reference cells; final acceptance remains false. |
| OI-G03-EXACT-CONFLICT-PRECEDENCE | PASS_PROPOSAL_ONLY | 26 exact adjudication records remove shared ownership from known D02/C01, D05, D06, and Houston conflicts without last-writer-wins. |
| OI-G04-DIRECTIONAL-INTERFACE-REGISTRY | PASS_PROPOSAL_ONLY | 78 directional/default-deny contracts compiled: 64 have exact cell sets, 25 also have exact transition pairs, and 14 remain null/HOLD. |
| OI-G05-KNOWN-CROSS-SCOPE-OVERLAP | PASS_QUALIFIED | Known converged D02/C01, D05, D06, and P1-B11/P1-B12 proposal components are pairwise disjoint across scopes; missing influence sets remain unknown. |
| OI-G06-WILDCARD-LAST-WRITER-WINS | PASS | Wildcard, bidirectional, broad last-writer-wins, silent clipping, and shared canonical ownership are prohibited. |
| OI-G07-OWNER-AND-INTERFACE-ACCEPTANCE | HOLD | All owner assignments, adjudications, and interface contracts are proposals with accepted=false and acceptedBy=null. |
| OI-G08-TECHNICAL-AND-COMPLETE-SAVE | HOLD | Null interfaces, technical mechanisms/effects, complete-save evidence, and final immutable technical acceptance remain incomplete. |
| OI-G09-GLOBAL-R00-INTERFACE-GATE | HOLD | The proposal closes registry geometry/accounting only; R00 cannot pass until every null/technical/acceptance HOLD closes against one identity. |

## Remaining evidence holds

- **OI-H01-FINAL-OWNER-ACCEPTANCE** — The sole owner separately accepts this complete immutable proposal registry identity; this compiler cannot self-accept it.
- **OI-H02-NULL-INTERFACE-GEOMETRY** — 14 required interfaces still lack exact cells and/or counterpart geometry.
- **OI-H03-TRANSITION-STATES-AND-PAIRS** — Exact before/future states and transition-pair manifests remain absent for interfaces that currently have cell-set references only.
- **OI-H04-D02-TECHNICAL-SYSTEMS** — Storage, inflow, freeboard, failure/recovery, maintenance, power/control, future-fluid, receiver, geotechnical, loading, and materials evidence remains incomplete.
- **OI-H05-D05-TECHNICAL-SYSTEMS** — Support treatments, expert hydrology/relic influence, B09 mechanisms/egress, canonical future states, receivers, and technical acceptance remain incomplete.
- **OI-H06-D06-MECHANISMS-COMMISSIONING** — The four observable detailed canonical-owner adjacency groups are compiled and sealed, but mechanisms, circuits, water treatment, receiver, controls, failure logic, external routes, unobserved interfaces, and all commissioning evidence remain incomplete.
- **OI-H07-P1-B12-TECHNICAL-SHELL** — Geotechnical/road loading, hydrology, utilities, occupiable-use systems, materials, and future-state evidence remain incomplete; all caps stay closed.
- **OI-H08-COMPLETE-SAVED-WORLD** — No same-moment region/entities/POI/level.dat package is accepted.
- **OI-H09-G03-REQUIRED-DOMAINS** — G03 v2 still reports exactly 15 unresolved required construction, interaction, or influence domains; the registry does not reinterpret them as empty.

## Safety boundary

This was an offline compilation of existing exact artifacts. No live calls,
operations, materials, future-state acceptance, construction authorization, or
world edits occurred. Canonical payload identity:
`233fd08f0b9a1884447a50fb03c4600726c77db838d9016e163f867d513fb55b`. Report identity:
`969627cd61d1a98b905213ee5819456e6cdb1bb733ecfa28d74ac2022c626245`.
