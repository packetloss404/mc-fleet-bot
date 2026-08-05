# Combined Zones Phase 1 D05 support-treatment and material design

Status: **PARTIAL_PASS_EXACT_D05_SUPPORT_MATERIAL_PROPOSAL_UNRESOLVED_TREATMENTS_D05_G02_HOLD — OFFLINE ONLY — ZERO ACCEPTED CELLS / OPERATIONS**

This artifact removes deterministic proposal ambiguity without converting proposal into technical acceptance. It binds the exact FM-01 bulk/exposed sparse material proposal and assigns one explicit treatment/material record to every exact support-gap family. It is not a real-world geotechnical, hydrology, structural, cryosphere, safety, or code-compliance claim.

Support/material payload SHA-256: `572b234d35601e93b096bc2b54b8f1078185053a3f0930221308cb7d8ee414c5`

## Direct material proposal

The existing 14,768,553-cell direct proposal remains exact: 14,580,291 internal cells propose `minecraft:stone`; 77,395 exposed cells below Y=130 propose `minecraft:smooth_stone`; and 110,867 exposed cells at or above Y=130 propose `minecraft:polished_diorite`. These are source-bound proposal states, not accepted material, construction, or operation cells. Future snow/ice/soil/drainage/erosion cap states remain null.

## Support-gap treatment ledger

| Exact support family | Cells | Proposed treatment | Proposed canonical state | Disposition |
|---|---:|---|---|---|
| SUPPORT-STATUS-RELIC-PRESERVE | 363 | SUPPORT-RETAIN-VOID | null | PROPOSE_RETAIN_VOID_PRESERVE_CURRENT_STATE_TOKEN_STATE_REQUIRES_COMPLETE_SAVE |
| SUPPORT-STATUS-B08-RESERVATION | 0 | SUPPORT-RETAIN-VOID | null | PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS |
| SUPPORT-STATUS-B09-RESERVATION | 0 | SUPPORT-RETAIN-VOID | null | PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS |
| SUPPORT-STATUS-D06-RESERVATION | 0 | SUPPORT-RETAIN-VOID | null | PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS |
| SUPPORT-STATUS-WATER-ADJACENT | 63,368 | null | null | HOLD_NULL_HYDROLOGY_AND_GEOTECHNICAL_TREATMENT |
| SUPPORT-STATUS-LAVA-ADJACENT | 0 | null | null | HOLD_NULL_HYDROLOGY_THERMAL_AND_GEOTECHNICAL_TREATMENT |
| SUPPORT-STATUS-FROZEN-ADJACENT | 384,445 | null | null | HOLD_NULL_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT |
| SUPPORT-STATUS-SNOW-ADJACENT | 288,414 | null | null | HOLD_NULL_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT |
| SUPPORT-STATUS-OTHER-SURFACE | 17,634 | SUPPORT-ENGINEERED-FILL | null | PROPOSE_TREATMENT_CLASS_STATE_NULL_GEOTECHNICAL_ACCEPTANCE_HOLD |

All 754,224 below-Y72 cells are accounted for exactly once. Treatment classes are proposed for 17,997 cells (363 relic-preserve retain-void and 17,634 other-surface engineered-fill candidates). The remaining 736,227 water/frozen/snow-adjacent cells retain null treatment; the explicit zero-cell lava family also retains no reusable default. No support cell receives a canonical material state because the owner material policy reserves support, liner, retaining, and cryosphere/landscape states for technical acceptance.

## Conflicts, influence, and access

Relic, B08, and B09 reservation cells remain exactly subtracted from the direct proposal. The two D06 external continuations and full protected cores are exactly disjoint from the FM-01 bounds and have zero support-gap intersection. These planning conflict checks do not establish lining, support, maintenance, access, or mechanism acceptance.

Influence kernels, maintenance access, construction staging, equipment swept volumes, restoration cells, receiver/outfall contracts, and future component accounting remain null. Zero current water/lava/frozen/snow cells are directly replaced, but current top-surface adjacency is nonzero; therefore no-diversion and no-influence are not technically accepted.

## What still requires complete-save or engineering evidence

A complete same-moment world root must add `entities/`, `poi/`, `level.dat`, and a valid capture manifest. Engineering acceptance must supply support states and criteria, finite hydrology/geotechnical/cryosphere/relic kernels, B09 and D06 systems, exact maintenance/staging/access sets, owner assignments, directional interfaces, and independent technical plus separate complete-identity owner acceptance.

## Acceptance matrix

| Criterion | Result | Scope | Current evidence |
|---|---|---|---|
| D05-SM-01-SOURCE-BINDINGS | **PASS** | source identity | All eleven direct inputs are hash and byte-count bound. |
| D05-SM-02-OWNER-PLANNING-POLICY | **PASS** | planning policy only | The owner accepted D05 planning policy while passing zero technical HOLDs. |
| D05-SM-03-FM01-DIRECT-PROPOSAL-IDENTITY | **PASS** | exact proposal accounting | The 14,768,553-cell direct proposal and its exact source sparse identity reproduce. |
| D05-SM-04-BULK-MATERIAL-PROPOSAL | **PASS_PROPOSAL_ONLY** | direct proposal material | 14,580,291 bulk cells retain the exact proposed minecraft:stone sparse family. |
| D05-SM-05-EXPOSED-FINISH-PROPOSAL | **PASS_PROPOSAL_ONLY** | direct proposal material | 188,262 exposed cells retain 77,395 smooth-stone and 110,867 polished-diorite proposals. |
| D05-SM-06-SUPPORT-CLASSIFICATION | **PASS_CLASSIFICATION_ONLY** | support accounting | All 754,224 support-gap cells are uniquely classified with zero gap or overlap. |
| D05-SM-07-SUPPORT-OVERLAY-CONTRACT | **PASS_PROPOSAL_ONLY** | treatment overlay | Nine reference-indexed records assign an explicit proposed class or null HOLD to every exact family. |
| D05-SM-08-RESERVATION-CONFLICTS | **PASS_PLANNING_ONLY** | relic/B08/B09/D06 conflicts | Direct proposal conflict count is zero by exact subtraction or exact disjoint bounds; support intersections are explicit. |
| D05-SM-09-ZERO-DIRECT-FLUID-CRYOSPHERE-REPLACEMENT | **PASS_BOUNDED_ONLY** | preservation control | The direct proposal replaces zero current water/lava/frozen/snow cells. |
| D05-SM-10-HYDROLOGY-CRYOSPHERE-SUPPORT | **HOLD** | 736,227 support cells | Water, frozen, snow, and zero-cell lava families retain null treatment and state. |
| D05-SM-11-OTHER-SURFACE-SUPPORT-STATE | **HOLD** | 17,634 support cells | SUPPORT-ENGINEERED-FILL is proposed, but canonical state, support criteria, and ownership are null. |
| D05-SM-12-RELIC-SUPPORT-ACCESS | **HOLD** | 363 support cells and expert influence | Retain-void is proposed for the exact relic intersection; complete current states and expert access/influence are absent. |
| D05-SM-13-EXPOSED-CAP-CRYOSPHERE-LANDSCAPE | **HOLD** | future exposed surfaces | Architectural finish is exact as a proposal, but future snow/ice/soil/drainage/erosion cap state is null. |
| D05-SM-14-INFLUENCE-KERNELS | **HOLD** | physics influence | Groundwater, infiltration, dewatering, erosion, settlement, surcharge, retaining, and relic kernels are null. |
| D05-SM-15-MAINTENANCE-STAGING-ACCESS | **HOLD** | temporary and operational access | Maintenance, construction staging, equipment sweep, and restoration manifests are null. |
| D05-SM-16-OWNERS-INTERFACES | **HOLD** | canonical authority | Owner classes are proposal labels; accepted exact assignments and interface contracts remain zero. |
| D05-SM-17-COMPLETE-SAVE | **HOLD** | source completeness | entities/, poi/, level.dat, capture manifest, and complete-save identity are absent. |
| D05-SM-18-TECHNICAL-MATERIAL-ACCEPTANCE | **HOLD** | acceptance identity | Proposed states/treatments are exact where evidence permits, but accepted treatment/material cell count is zero. |
| D05-SM-19-D05-G02-CLOSURE | **HOLD** | release gate | D05 and R00 G02 remain unresolved with zero accepted future/construction cells. |

Current result: **9 proposal/accounting PASS / 10 HOLD**. Accepted treatment, material, influence, maintenance-access, future, construction, operation, and material-cell counts remain zero. D05 and R00 G02 remain HOLD.
