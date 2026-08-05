# Combined Zones D05 owner-acceptance packet

Status: **OWNER ACCEPTANCE PACKET READY — D05 AND R00 G02 HOLD — OFFLINE ONLY — ZERO FUTURE/CONSTRUCTION/OPERATION CELLS**

This is the exact human companion to the machine packet. It organizes the already selected `FM-01-COMPACT-EAST-FACE` planning basis into a conditional owner-policy decision and a fail-closed technical acceptance contract. It does **not** self-issue owner acceptance, invent expert evidence, accept a future cell, assign construction ownership, or authorize a world edit.

## Recommended owner decision

The sole owner may accept **the conditional planning policy**: keep FM-01 as the B09/B10 basis; use the deterministic material-classification method below; retain zero undeclared hydrology change, exact core-plus-one minimum exclusions, one owner per cell, and default-deny interfaces; and require every HOLD row to pass before D05 can close.

That decision does not accept the mountain, guideway, materials, support, hydrology, relic influence distances, mechanisms, or construction. A separate record must bind this packet's final SHA-256 and policy identity `400cdb2b89e11af90fb2b290fa753f32c84fde00b38cd2645feb48dd946628b0`.

### Copyable sole-owner acceptance statement

> I, [SOLE OWNER NAME], accept only the conditional D05 planning policy bound by owner-acceptance payload SHA-256 8b995f74bfedf3d17e5b581aba0bcd01f24092789abef915582aa8b8c0146177, policy identity SHA-256 400cdb2b89e11af90fb2b290fa753f32c84fde00b38cd2645feb48dd946628b0, and FM-01 model identity SHA-256 735b69b38c5c2ea840388039b5beb957671fe3e243ec7943c440649edcff36a6. I accept FM-01 as the B09/B10 planning basis and the payload's default-deny criteria for continued exact technical development. I do not accept any future, construction, influence, material, mechanism, or operation cell; I do not record expert hydrology, geotechnical, structural, life-safety, or transport acceptance; and I do not pass D05 or R00 G02 or authorize construction ownership, release, or a world edit. My separate acceptance JSON will bind the final packet SHA-256 [FINAL PACKET SHA-256], this payload hash, my identity, and a UTC timestamp.

Acceptance-payload SHA-256: `8b995f74bfedf3d17e5b581aba0bcd01f24092789abef915582aa8b8c0146177`. Replace both bracketed fields, compute the final JSON packet SHA-256 after deterministic generation, and record the completed statement in a separate acceptance JSON. The statement is deliberately limited to the proposed planning basis and criteria; it cannot turn any technical HOLD or zero-count future/construction set into PASS.

## Bound source package

| Source | SHA-256 |
|---|---|
| `docs/masterplans/04-combined-complex/authority-reconciliation.json` | `7051b359e195b3c957cfa4ee77a56217643bebc60bccc108c20c0bea9a3bcdab` |
| `docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json` | `e3f86c5073a00e715cf0f4d01e2a76bc1fc416290ffd7a4972b1e8c7a2b8350c` |
| `docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json` | `14366d541b21675011e5dad32b08b51c4c23cf826bb37b0340b4699241429774` |
| `docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json` | `08ec0806cabd23854a34218b274ebcb26b52ccf9b0adc51464718e4ac6666130` |
| `docs/masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json` | `72eeafc62edadd0f7a08a46ca3c65f2cfad12bc05bc4c084321e81f0190081b4` |
| `docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json` | `1446c75cec504478130a8e9c5569c68c7a7569a29c4210e9b21ca5d804aeb2f3` |
| `docs/masterplans/05-combined-zones/phase1-connector-geometry.json` | `8bb2dd803c434667dfeee440ccdf8428a115962e21dd1b3b0e6955cce672dc4e` |
| `docs/masterplans/05-combined-zones/phase1-autonomous-design-selections.json` | `805f89629d63f74a773f7e27b575a4b28f306a9b70a39073f21ddf4d2f757562` |

The bound copied-region snapshot is `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`. It remains read-only evidence and is not promoted into a complete same-moment saved-world package.

## Facts, derivations, choices, and gaps

| Claim | Classification | Statement | Limitation |
|---|---|---|---|
| D05-CLAIM-001 | BOUND_FACT | FM-01 is the selected owner-delegated B09/B10 planning basis. | Selection does not accept materials, support, hydrology, owners, or mechanisms. |
| D05-CLAIM-002 | DETERMINISTIC_DERIVATION | FM-01 contains 14,768,553 candidate added-solid cells in its sparse interval model. | Candidate intervals are not materialized future or construction cells. |
| D05-CLAIM-003 | DETERMINISTIC_DERIVATION | FM-01 exposes 754,224 below-Y72 support-gap cells across 107,345 columns. | No treatment is selected. |
| D05-CLAIM-004 | BOUND_FACT | The exact current D05 census contains 1,929,621 water/waterlogged, 85,088 lava, 182,791 frozen, and 359,830 snow cells. | Current-state facts do not predict future behavior. |
| D05-CLAIM-005 | DETERMINISTIC_DERIVATION | The exact core-plus-one-cell preserve-current-state union contains 4,890 cells. | It is a minimum planning exclusion, not an expert influence distance. |
| D05-CLAIM-006 | DETERMINISTIC_DERIVATION | The selected B09 route has 561 ordered points, 560 cardinal steps, and 7,800 minimum planning-accommodation cells. | It does not define stations, evacuation, guideway structure, or mechanisms. |
| D05-CLAIM-007 | OWNER_POLICY_CHOICE | Unknown direct, support, hydrology, relic, ownership, and interface influence remains default-deny. | Owner policy cannot replace technical evidence. |
| D05-CLAIM-008 | TECHNICAL_GAP | No complete canonical proposed-state registry exists. | — |
| D05-CLAIM-009 | TECHNICAL_GAP | No accepted support treatment or finite expert hydrology/geotechnical kernel exists. | — |
| D05-CLAIM-010 | TECHNICAL_GAP | No exact B09 station, maintenance/egress, mechanism, or commissioning cell set exists. | — |

## FM-01 selected planning basis

- Model identity: `undefined`.
- Deterministically modelled columns: **202,501**.
- Candidate added-solid cells: **14,768,553**.
- Accepted future/construction cells: **0 / 0**.
- Design surface: Y **71…303**.
- Support gap below the Y72 coordination floor: **754,224 cells across 107,345 columns**.

These are exact planning derivations, not material quantities or engineering acceptance.

## Canonical material-state plan

The plan uses one deterministic role classification, then exact canonical Minecraft states. It never randomizes a palette or treats the whole planning envelope as material.

| Class | Proposed canonical state | Current status | Qualification |
|---|---|---|---|
| MAT-CURRENT-STATE-RETAINED | PRESERVE_EXPECTED_CURRENT_CANONICAL_STATE | READY_FOR_OWNER_POLICY_ACCEPTANCE | The immutable source state is copied exactly; this token is not a Minecraft state. |
| MAT-BULK-STRUCTURAL-FILL-CANDIDATE | minecraft:stone | PROPOSED_NOT_ASSIGNABLE | A deterministic candidate state only; geotechnical acceptance and exact cell records are absent. |
| MAT-LOWER-ARCHITECTURAL-FINISH-CANDIDATE | minecraft:smooth_stone | PROPOSED_NOT_ASSIGNABLE | Architectural limestone-style contrast only; it is not a natural-contact or age claim. |
| MAT-UPPER-ARCHITECTURAL-FINISH-CANDIDATE | minecraft:polished_diorite | PROPOSED_NOT_ASSIGNABLE | Architectural granite-style contrast only; it is not a natural-contact or age claim. |
| MAT-ROUTE-PASSABLE-CANDIDATE | minecraft:air | PROPOSED_NOT_ASSIGNABLE | Does not define lining, support, drainage, headroom, guideway, or mechanism cells. |
| MAT-SUPPORT-LINER-RETAINING | HOLD / null | HOLD_NO_ACCEPTED_STATE | State selection follows exact geotechnical/hydrology treatment, never a bulk-fill default. |
| MAT-SURFACE-CAP-CRYOSPHERE-LANDSCAPE | HOLD / null | HOLD_NO_ACCEPTED_STATE | Current adjacency counts do not authorize a future snow, ice, soil, or drainage state. |
| MAT-B09-GUIDEWAY-STATION-MECHANISM | HOLD / null | HOLD_NO_ACCEPTED_STATE | The exact centerline is planning geometry, not a commissioned transport design. |

The lower/upper finish split at world-study Y130 preserves architectural contrast only. It must not reintroduce the superseded natural-contact, thrust/overthrust, laccolith, “geologically honest,” or `270 Ma` claims. Support, liner, retaining, surface-cap, cryosphere, B09 station, and mechanism states remain null until exact technical design is accepted.

## Exact construction and influence method

1. Bind the immutable snapshot and the FM-01 formula, surface, interval, and support-gap hashes.
2. Materialize unique sorted direct records with exact before/future states and typed roles.
3. Preserve the exact 4,890-cell relic union and withhold accepted B08/B09 reservations from bulk fill.
4. Classify every support-gap interval before admitting any support or fill.
5. Author exact staging, access, equipment-sweep, and restoration cells—never an inferred width.
6. Intersect direct/staging sets with every exact current fluid and cryosphere family and component identity.
7. Expand only accepted finite expert kernels and exact directed drainage graphs.
8. Assign exactly one owner per direct or influence cell and match every cross-owner transition to one directional contract.
9. Reject unknown, duplicated, unowned, multiply owned, unmatched, stale, or implicitly changed records.

All twelve D05-S02 set families remain at **0 accepted cells**.

## The 754,224 support-gap cells

Default disposition: **HOLD**. Each cell must be assigned exactly once to accepted no-change void, engineered fill, bridge/retaining/foundation, or an FM-01 redesign. Treatment counts must sum exactly to 754,224 and reproduce `31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171`.

No process may silently fill below Y72, call air/water competent support, clip influence at the coordination boundary, or replace exact classification with a percentage, bounding box, narrative radius, or visual review.

## Hydrology and geotechnical acceptance

The immutable full-height facts are water/waterlogged **1,929,621**, lava **85,088**, frozen **182,791**, and snow **359,830** cells. FM-01's raised columns currently touch top cells classified by the bound adjacency census; this is not groundwater, infiltration, erosion, snowmelt, stability, drainage capacity, or fluid simulation.

D05 requires accepted support/load/foundation criteria, finite treatment-class kernels, exact drainage/receiver graphs, component before/after accounting, erosion/slope/retaining/snow/ice criteria, and one shared snapshot/model/state/owner/interface identity. Unknown influence is HOLD, never an empty set.

## Relic core-plus-one and expert influence

The minimum kernel is the exact one-cell Chebyshev expansion with offset hash `5454ae1f740a866a404073c7f06641eb1d450bd146b77fe31f70aa8ea255d485`. Its three preserve-current-state sets total **4,890 cells**. This freezes a default-deny minimum only; it is not a structural, groundwater, entrance, fall, exhibit, observation, emergency-access, or construction-sweep distance.

Expert support/access kernels remain **HOLD** and must use finite exact offsets, exact seeds, boundary/component rules, owners, and interfaces. D05-S01 observation candidates are never promoted automatically.

## B09 / B10 system

- B10: FM-01 analytic mountain, accepted future cells **0**.
- B09: `2048,130,-748` to `2048,304,-828`, east face, **561 points / 560 steps**, ordered hash `e8905742a77148d13d799362da7d65e9b02bcf96455d580fbee27367b2d24221`.
- Planning accommodation: **7,800 cells**; exact guideway/ownership acceptance **no**.
- Stations: lower portal, east level throat, and summit anchors are exact points only. Every station cell set remains null.
- B08/B09 planning intersection: **36 cells**, with no accepted interface contract.
- Maintenance/egress, guideway support, barriers, power, controls, drainage/weather protection, emergency operation, rescue, and commissioning all remain HOLD.

## Proposed owner roles

| Owner | Role | Exact cell assignments accepted? |
|---|---|---:|
| CZ05-PROTECTED-RELIC-CONTROL | Canonical veto owner for accepted protected cores, minimum exclusions, and later expert support/access influence cells. | no |
| CZ05-MOUNTAIN-HYDROLOGY-CONTROL | Canonical owner for accepted direct fluid/cryosphere interactions, drainage/discharge, dewatering, and hydrology influence cells. | no |
| CZ05-SCOPE-CONSTRUCTION-CONTROL | Owner class for accepted direct mountain, support, finish, staging, and access cells after relic/hydrology vetoes. | no |
| CZ05-Z11-FUNICULAR-CONTROL | Proposed subordinate scope owner for B09 guideway, stations, maintenance/egress, and mechanisms under exact interfaces. | no |

Roles are proposed planning boundaries only. Exact assignments remain zero; unowned, multiply owned, and undeclared-interface counts are unknown until the complete registry and global gate run.

## Explicit PASS / HOLD matrix

| Gate | Status now | PASS only when | HOLD when |
|---|---|---|---|
| D05-OA-01-SOURCE-CHAIN | **PASS** | Every packet source exists and matches its declared SHA-256. | Any missing or hash-drifted source. |
| D05-OA-02-FM01-PLANNING-SELECTION | **PASS** | The owner-delegated ledger selects FM-01/B09/B10 without claiming technical acceptance. | Selection missing, ambiguous, stale, or represented as technical proof. |
| D05-OA-03-OWNER-ACCEPTANCE-RECORD | **HOLD** | A separate non-self-issued record binds this packet SHA-256 and policy identity and selects ACCEPT_CONDITIONAL_PLANNING_POLICY. | No valid separate acceptance record exists. |
| D05-TECH-01-CANONICAL-FUTURE-STATES | **HOLD** | Every directly modelled current/future record has exact canonical states, type, owner, source design, and complete hashes. | Any null state, implicit change, unclassified coordinate, or missing registry hash. |
| D05-TECH-02-SUPPORT-GAPS | **HOLD** | All 754,224 cells reproduce the gap manifest and have exactly one accepted treatment or accepted no-change record. | Any unclassified, unsupported, silently filled, or technically unaccepted gap cell. |
| D05-TECH-03-HYDROLOGY-GEOTECHNICAL | **HOLD** | Expert criteria, finite kernels, exact fluid/cryosphere accounting, stability/support checks, and receiver contracts all pass one identity. | Any missing criterion, unknown influence, undeclared change, or unaccepted receiver. |
| D05-TECH-04-RELIC-INFLUENCE | **HOLD** | Final direct/influence sets clear the 4,890 preserve-current-state cells and accepted expert support/access kernels. | Any overlap, auto-promoted observation route, missing kernel, or incomplete all-start clearance. |
| D05-TECH-05-B09-SYSTEM | **HOLD** | Route, stations, maintenance/egress, mechanisms, rescue, drainage, owners, interfaces, and technical checks are exact and accepted. | Planning centerline is the only complete B09 geometry or any system cell set remains null. |
| D05-TECH-06-OWNERSHIP-INTERFACES | **HOLD** | Complete union has zero unowned/multiply owned cells and zero undeclared cross-owner interfaces. | Any missing assignment, overlap, gap, broad contract, or unmatched interface. |
| D05-G02-CLOSURE | **HOLD** | All D05-OA and D05-TECH rows pass against one immutable pre-R00 design identity. | Any row remains HOLD; later operations or post-state evidence may not cure it. |

## Acceptance record boundary

A valid owner decision is a **separate**, non-self-issued JSON record with the final packet path/SHA-256, policy identity SHA-256, acceptance-payload SHA-256, decision, owner identity, timestamp, accepted scope, and acknowledged limitations. The only positive decision is `ACCEPT_CONDITIONAL_PLANNING_POLICY`. Even that leaves D05 and R00 G02 on HOLD until every technical row passes.

## Safety boundary

No live system was contacted. Future, construction, material, and operation cell counts are all **0**. No physical work, release, or world edit is authorized.
