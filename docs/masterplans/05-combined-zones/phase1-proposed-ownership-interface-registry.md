# Combined Zones Phase 1 proposed ownership and interface registry

Status: **G04_PASS_OFFLINE_EXACT_ONE_OWNER_G05_EXTERNAL_ENDPOINTS_AND_STATES_HOLD**

This registry converges G03 v3 and both closure artifacts with the exact D02/C01,
D05/B09, detailed D06, and Grand Avenue P1-B11/P1-B12 evidence into one deterministic ownership/interface proposal. It does not self-approve
any owner, interface, technical design, construction package, or world edit.

## Exact proposal accounting

- Proposed logical owners: **27**
- Known proposal/reference cells assigned once after precedence: **16,542,566**
- G04 construction/interaction union cells assigned exactly once: **15,286,976**
- G04 unowned / multiply owned cells: **0 / 0**
- Separate nonphysical influence-steward records: **10**
- Exact conflict-adjudication records: **41**
- Directional/default-deny interface records: **161**
- Interfaces with exact cell sets: **148**
- Interfaces with exact transition-pair hashes: **109**
- Interfaces still null/HOLD: **13**
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
an interface cell set retain a null transition-pair hash. Internal exact-domain
boundaries are exact and default-deny. Only genuine external maintenance, power,
receiver, surface/lobby, and utility endpoints retain null geometry; before/future
states and final acceptance remain HOLD.

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
| OI-G01-SOURCE-CHAIN | PASS | Accepted planning authority, G03 v3 payload 1e4609275a2fd6aed8aa8a3dac00e8bdadae97dc756ca222922ce57a2c9b0712, both v3 closure artifacts, and every converged evidence stream are byte/hash bound. |
| OI-G02-PROPOSED-OWNER-REGISTRY | PASS_PROPOSAL_ONLY | 27 logical owner records cover 16,542,566 known proposal/reference cells; final acceptance remains false. |
| OI-G03-EXACT-CONFLICT-PRECEDENCE | PASS_PROPOSAL_ONLY | 41 exact adjudication records remove shared ownership from known D02/C01, D05, D06, and Houston conflicts without last-writer-wins. |
| OI-G04-OFFLINE-EXACT-ONE-OWNER | PASS_OFFLINE | 15,286,976 exact construction/interaction union cells have one canonical physical owner: 0 unowned and 0 multiply owned; acceptance remains false. |
| OI-G05-INTERFACE-AND-STATE-CLOSURE | HOLD | 161 directional/default-deny contracts compiled; 148 have exact cells and 109 have exact transition pairs, but 13 genuine external endpoints plus null before/future states prevent G05 acceptance. |
| OI-G06-WILDCARD-LAST-WRITER-WINS | PASS | Wildcard, bidirectional, broad last-writer-wins, silent clipping, and shared canonical ownership are prohibited. |
| OI-G07-OWNER-AND-INTERFACE-ACCEPTANCE | HOLD | All owner assignments, adjudications, and interface contracts are proposals with accepted=false and acceptedBy=null. |
| OI-G08-TECHNICAL-AND-COMPLETE-SAVE | HOLD | Null interfaces, technical mechanisms/effects, complete-save evidence, and final immutable technical acceptance remain incomplete. |
| OI-G09-GLOBAL-R00-INTERFACE-GATE | HOLD | The proposal closes registry geometry/accounting only; R00 cannot pass until every null/technical/acceptance HOLD closes against one identity. |

## Remaining evidence holds

- **OI-H01-FINAL-OWNER-ACCEPTANCE** — The sole owner separately accepts this complete immutable proposal registry identity; this compiler cannot self-accept it.
- **OI-H02-NULL-INTERFACE-GEOMETRY** — 13 genuine external endpoint interfaces still lack exact endpoint geometry; no internal exact-domain interface is represented as null.
- **OI-H03-TRANSITION-STATES-AND-PAIRS** — Exact before/future states and transition-pair manifests remain absent for interfaces that currently have cell-set references only.
- **OI-H04-D02-TECHNICAL-SYSTEMS** — Storage, inflow, freeboard, failure/recovery, maintenance, power/control, future-fluid, receiver, geotechnical, loading, and materials evidence remains incomplete.
- **OI-H05-D05-TECHNICAL-SYSTEMS** — Support treatments, expert hydrology/relic influence, B09 mechanisms/egress, canonical future states, receivers, and technical acceptance remain incomplete.
- **OI-H06-D06-MECHANISMS-COMMISSIONING** — The four observable detailed canonical-owner adjacency groups are compiled and sealed, but mechanisms, circuits, water treatment, receiver, controls, failure logic, external routes, unobserved interfaces, and all commissioning evidence remain incomplete.
- **OI-H07-P1-B12-TECHNICAL-SHELL** — Geotechnical/road loading, hydrology, utilities, occupiable-use systems, materials, and future-state evidence remain incomplete; all caps stay closed.
- **OI-H08-COMPLETE-SAVED-WORLD** — No same-moment region/entities/POI/level.dat package is accepted.

## Safety boundary

This was an offline compilation of existing exact artifacts. No live calls,
operations, materials, future-state acceptance, construction authorization, or
world edits occurred. Canonical payload identity:
`234e51bba55fb4bad08d351780b51e27647102f2fdf8b42ce9ed5357afa33cda`. Report identity:
`353ba295895eb736bda25e3f6ab53af23b5643843a1916f829e9e90331da4d95`.
