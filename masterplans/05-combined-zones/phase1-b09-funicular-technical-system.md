# Combined Zones Phase 1 B09 funicular technical-system proposal

Status: **PARTIAL_PASS_EXACT_B09_TECHNICAL_RESERVATION_PROPOSAL_MECHANISMS_AND_ACCEPTANCE_HOLD**

This proposal converts the selected FM-01 east-face B09 planning route into
exact bounded technical reservations. It does not accept a design, mechanism,
owner, interface, material state, operation, or physical build.

## Exact geometry

- Ordered centerline points: **561**
- Horizontal steps: **560**
- Minimum planning accommodation: **7,800 cells**
- Proposed reservation layers: **9**
- Exact sealed interface proposals: **2**
- Accepted cells / owners / interfaces / mechanisms / operations: **0 / 0 / 0 / 0 / 0**

## Technical reservation proposals

| Layer | Role | Cells | Coordinate identity |
|---|---|---:|---|
| combinedStationEnvelope | STATIONS | 312 | `0b6e428af369217693c25da890328d0abfe06489443587822cc7fb520cf16f3f` |
| drainageCarrierReservation | DRAINAGE_CARRIER_ONLY_NO_FLOW_OR_RECEIVER | 561 | `81eaaf855e832281af1cf8eca2f884f2f67795ff9478d9ae38ca7e136fdd9255` |
| lowerStationEnvelope | LOWER_STATION_AND_B08_TRANSFER_ENVELOPE | 132 | `d13426cafb5f9cb53de702653532111ef18588af1c28c0f3d8e7cb2956e0801b` |
| maintenanceAndEgressReservation | MAINTENANCE_AND_UNCOMMISSIONED_EGRESS | 2,250 | `352ad477cd96fc6ff9d460847c1e756d448bda4c899e77ade258d4dc63a5a4d5` |
| powerAndControlCarrierReservation | POWER_AND_CONTROL_CARRIER_ONLY | 561 | `ae9f694b971ce807fd8138d961950ac3838aa4d0f8f07f0c2e8df79bc0e7468c` |
| railDatumReservation | GUIDEWAY_RAIL_DATUM | 561 | `91b5174e01bde419175c68997f199f01b04ee38cbde13304ab4dd9a0d0d979b8` |
| rescueTransferReservation | ENDPOINT_RESCUE_TRANSFER | 312 | `0b6e428af369217693c25da890328d0abfe06489443587822cc7fb520cf16f3f` |
| runningGuidewayAndSupportEnvelope | GUIDEWAY_SUPPORT_AND_SEPARATION_SHELL | 7,488 | `d9de4b923a8002dbd302116f4c928b6794d824ea616811d0ab2a3988ad32bb1f` |
| summitStationEnvelope | SUMMIT_STATION_AND_Z11_TRANSFER_ENVELOPE | 180 | `99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599` |

These layers may overlap because they describe functional reservations inside
one exact envelope. The carrier cells do not prove utilities, flow, structure,
or mechanism states.

## Conflict result

- B08 has one known **36-cell** portal seam. It stays sealed and default-deny.
- D05 raw future fill has **4,245** conflicts, all withheld by the exact B09 reservation. Selected future fill and the below-Y72 support gap intersect B09 at zero cells.
- Current D06 egress/B07 reservations intersect at **0** cells.
- The three protected generated-start cores intersect at **0** cells.
- All 114 observed generated-start bounds intersect at **0** cells. This is not a complete-save all-start proof.

## Ambiguity removed

- The selected east-face route is reproduced as one exact 561-point ordered centerline rather than a narrative face choice.
- The complete 7,800-cell minimum accommodation is exact and hash-bound.
- Two station ends, the running guideway/support shell, side maintenance/egress lanes, endpoint rescue-transfer space, an overhead power/control carrier, and an under-rail drainage carrier now have exact proposal cells.
- The 36-cell B08 portal seam and 12-cell summit cap are exact, directional, sealed, default-deny proposals.
- The known D05 raw-fill conflict is quantified and withheld; current D06, protected-core, and observed generated-start geometry is conflict-free.

## Genuine residual blockers

- **B09-NULL-01-LINER-FOUNDATION-AND-GROUND-SUPPORT** — Accepted loads, liner/foundation states, deformation limits, construction influence, and complete-save source guards.
- **B09-NULL-02-DRIVE-BRAKE-VEHICLE-AND-BARRIER-MECHANISMS** — Drive, cable/haul, braking, overspeed, vehicle, platform-barrier, failure-state, and commissioning designs.
- **B09-NULL-03-INTERMEDIATE-REFUGE-PASSING-AND-RESCUE-ROUTE** — Passing/refuge spacing, protected route, assisted rescue, accessibility, smoke separation, and exterior discharge acceptance.
- **B09-NULL-04-POWER-FEED-CIRCUITS-EQUIPMENT-AND-CONTROL-LOGIC** — Normal/emergency feeds, independent circuits, equipment rooms, controls, fire mode, and failure behavior.
- **B09-NULL-05-SUMPS-FLOW-PATHS-OUTFALL-AND-RECEIVER** — Inflow, groundwater, snowmelt, erosion, sump capacity, pumped/gravity flow, discharge state, outfall, and receiver contract.
- **B09-NULL-06-D05-GUIDEWAY-MOUNTAIN-SUPPORT-INTERFACE** — Exact exterior liner/support boundary, transition states, load transfer, water control, construction influence, and directional owner acceptance.
- **B09-NULL-07-D06-PROTECTED-EGRESS-RECEIVER** — An exact protected egress continuation from B09 to a safe exterior or independently accepted D06 receiver.
- **B09-NULL-08-COMPLETE-SAVE-ALL-START-ENTITY-POI-GATE** — One same-moment region/entities/POI/level.dat package and a rerun of all-start/entity/POI conflicts against every proposed influence set.

## PASS/HOLD matrix

| Gate | Status | Result |
|---|---|---|
| B09-TS-G01-SOURCE-AND-SELECTION-CHAIN | PASS | The owner-delegated FM-01 planning selection and every consumed exact artifact are byte/hash bound; technical acceptance remains false. |
| B09-TS-G02-CENTERLINE-AND-MINIMUM-ACCOMMODATION | PASS_EXACT_PROPOSAL_ONLY | Reproduced 561 centerline points and all 7,800 minimum-accommodation cells exactly. |
| B09-TS-G03-FUNCTIONAL-RESERVATION-LAYERS | PASS_EXACT_PROPOSAL_ONLY | 9 deterministic station/guideway/maintenance/rescue/power/drainage proposal layers remain entirely inside the selected minimum accommodation. |
| B09-TS-G04-B08-INTERFACE | PASS_EXACT_SEALED_PROPOSAL_ONLY | The known 36-cell B08/B09 overlap is isolated as an exact sealed default-deny proposal interface. |
| B09-TS-G05-D05-MOUNTAIN-AND-SUPPORT | PASS_EXACT_CONFLICT_WITHHELD_TECHNICAL_HOLD | 4,245 raw D05 fill cells are withheld by the B09 reservation; selected fill and below-Y72 support-gap intersections are zero. |
| B09-TS-G06-D06-EGRESS-AND-PROTECTED-RELIC | PASS_EXACT_CURRENT_GEOMETRY_EXPERT_HOLD | B09 is disjoint from current D06 egress/B07 reservations and all three protected generated-start cores; no egress receiver or positive expert influence is inferred. |
| B09-TS-G07-OBSERVED-GENERATED-STARTS | PASS_OBSERVED_COMPLETE_SAVE_HOLD | All 114 observed generated-start bounds are disjoint, but complete-save all-start/entity/POI clearance remains unproven. |
| B09-TS-G08-MECHANISMS-HYDROLOGY-GEOTECHNICAL-LIFE-SAFETY | HOLD | 8 technical systems/interfaces remain explicit null/HOLD; carrier reservations are not mechanism, flow, support, or commissioning designs. |
| B09-TS-G09-ACCEPTANCE-AND-RELEASE | HOLD | Accepted cells, owners, interfaces, mechanisms, material states, operations, and build authority all remain zero. |

## Safety boundary

This was a deterministic offline compilation of existing artifacts. No live
call, world edit, material state, mechanism, construction cell, or operation
was created or accepted. Report identity: `e4140d2193fec084e8e17ae8e1e071683e62d7cbea20a32ebcf1edc290a523e7`.
