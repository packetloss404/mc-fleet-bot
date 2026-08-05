# P1-B11 Grand Avenue surface-road setout and technical proposal

Generated: 2026-08-05T03:35:00Z

Status: **EXACT_SURFACE_ROAD_SET_OUT_PROPOSAL_READY_ALL_TECHNICAL_AND_PHYSICAL_GATES_HOLD**

This bounded artifact turns the accepted 299-point B11 planning profile into exact review geometry. It does not modify the accepted payload, accept the side-bias choice, select materials or future states, close a technical gate, assign ownership, or authorize construction. Accepted construction/material/future-state/operation counts remain **zero**.

## Deterministic eight-wide setout

- Accepted centerline/profile: 299 points, 1750,68,-300 to 2048,72,-328; SHA-256 `e63b7779674ad46fd7ad9c4ae0aea8f618afa8b656d3a24aa4367057cf103ff4`.
- Proposed road width: global Z offsets -3…+4 around the reference lattice, so the eighth cell is on the positive-Z side.
- This matches P1-B12's exact side-bias convention. The 4,784-cell road-load reservation is byte-for-byte the same coordinate set as B12's two separation layers: `bd510ae1e1fdd4888aaed37290700c0edde54fb2cf041835d79d857d6d106df6` under the B12 hash contract.
- The road construction proposal is one lattice layer at roadY. Formation depth, pavement thickness, earthwork, retaining, and materials remain null.

## Exact proposal sets

| Set | Cells | Inclusive X; Y; Z bounds | Coordinate-set SHA-256 |
|---|---:|---|---|
| proposedRoadConstruction | 2,392 | 1750…2048; 68…72; -331…-296 | `dc75445cbbb40c951ee65e476c2be271412ef5682439394e29ce7370a323d80c` |
| candidateInteractionUnion | 11,960 | 1750…2048; 66…73; -332…-295 | `ee6163e6f975bf78d5acad718732aa951bebf8a756f20ef9a7f6b94020493a17` |
| interactionShellExcludingConstruction | 9,568 | 1750…2048; 66…73; -332…-295 | `9522d539da2a7f61ef86c28fcdd972b1e0188b4099000148af02b60401ff9899` |
| roadLoadInfluenceReservation | 4,784 | 1750…2048; 66…71; -331…-296 | `295a922eb72f1c58141884fa9752984227b2528d67c5d8607a836c99b5a8f10b` |
| bilateralDrainageReservation | 598 | 1750…2048; 67…71; -332…-295 | `17c870544e9ee649b53ce0d58bd7d38f84c150f977e88e980aafa9169429ef60` |
| dryUtilityReservation | 299 | 1750…2048; 66…70; -332…-304 | `48e7d71aabcb9c5a14a794ca1e4c1d4535789ce64f46f55e14b3ec9390778f41` |
| wetUtilityReservation | 299 | 1750…2048; 66…70; -323…-295 | `303e13906af53c5171291741db40862436e227023538e839f301c5bb94391aab` |
| utilityReservationUnion | 598 | 1750…2048; 66…70; -332…-295 | `02e57faf3f2b9be5a384852c4a7fa92b4c30d1c5427dea99f3e98e2cc95f4a71` |
| candidateInfluenceReservationUnion | 5,980 | 1750…2048; 66…71; -332…-295 | `c4a6c43350246703545cfeab7f4a896baea666f6cc010e173a576180aabfb401` |

The candidate interaction union is a ten-wide prism from roadY-2 through roadY+1. It contains the road setout and every load/drainage/utility reservation, but it is not an accepted construction-influence kernel.

## Immutable current-state and fluid census

| Set | Cells | Present | Air | Water/waterlogged | Lava | Block-state SHA-256 |
|---|---:|---:|---:|---:|---:|---|
| proposedRoadConstruction | 2,392 | 1,601 | 791 | 0 | 0 | `ada2d4157de00580894481ec893500cd0918da238985792c5db1f1fe5722a16c` |
| candidateInteractionUnion | 11,960 | 8,073 | 3,887 | 0 | 0 | `4708ce9ecbb54f9b0e40d13ced5371f08995b669b0cba3acc38c85a435b7c52f` |
| candidateInfluenceReservation | 5,980 | 4,181 | 1,799 | 0 | 0 | `65eb081366d8405dd13ec794db6458d56a4095949041f6936045b21ef095bc87` |
| roadLoadReservation | 4,784 | 3,344 | 1,440 | 0 | 0 | `a2b9db6d7b2d6672430f9c5fa16ccf8a2b933ef44d2c6f317309a9802c414750` |
| drainageReservation | 598 | 412 | 186 | 0 | 0 | `6e728b7559cea8d92f3f7851800f93b74a0348aa849784a0fef4e554d2fe0486` |
| dryUtilityReservation | 299 | 231 | 68 | 0 | 0 | `3babbda83b5616c944f6f5bd1a36a11a7722070dd5a2a236f61069a7263fe967` |
| wetUtilityReservation | 299 | 194 | 105 | 0 | 0 | `2044a53f601f1b9c576fc712f0122013c83367f1f3a4a06de2339feb941c13cb` |
| houstonInteractionOverlap | 260 | 260 | 0 | 0 | 0 | `a35672eae9177f60c79b69199aeacf25989600e49bc90465c5799325e381c408` |

The compiler read 34 chunks with zero missing chunks from immutable region snapshot `05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b`. This is current block/fluid evidence only. The save is incomplete because entities, POI, and level.dat are absent.

## Structure and relic audit

All 114 Phase 0 generated-start bounds were intersected with the exact interaction union; 0 intersect. All 3 evidence-backed relic cores were intersected; 0 intersect.

These zero intersections do not establish present-fabric clearance, a geotechnical influence area, or a positive construction margin.

## P1-B12 seam

- Proposed surface construction versus B12 outer shell: 0 same-coordinate cells.
- Candidate interaction versus B12 influence: 4,784 cells, exactly the shared two-layer load reservation.
- B12 upper load layer to proposed road surface: 2,392 vertical adjacency pairs, SHA-256 `4b6290b6e32d7e0999f54e47b27f1c13d75ab8f8d50c7ead886ff2039ea213b1`.
- No shared owner, structural transfer, physical seam, or B12 construction is accepted.

## Houston coordination

Houston's exact half-open sample is X 2036…2059, Y 64…71, Z -340…-317.

| Exact overlap | Cells | Coordinate-set SHA-256 |
|---|---:|---|
| proposedRoadConstructionOverlap | 0 | `dd7ebb4193bfed1fb53cf38a01fb58ba60221ddca002e941bdbf49dddddf80ef` |
| candidateInteractionOverlap | 260 | `a2e9f0b8b59190d17e36af15700a0c8d141f947614ccdcba8cb8807c7a0548f8` |
| candidateInfluenceReservationOverlap | 260 | `2893c6c5d88a3065cc9d4cebe56847518b0b7ea29d4dd7f5246fcb2a085a1263` |
| roadLoadReservationOverlap | 208 | `40a0039ec9e9b28f9e483776a511b9934382620a9b718bb9ee71fda84d1e2310` |
| drainageReservationOverlap | 26 | `2301082c7e5d819b5b501910ec874157cabf823031cea21527d17b7d22c12f07` |
| utilityReservationOverlap | 26 | `1ed1eea8690f4ccd2fea5bb9279b7d5ce7b823ba3982dff86f03a450bc33da32` |

The road datum is above Houston's half-open sample at the east end, so surface construction overlap is zero. The 260-cell interaction/influence overlap consists of 208 shared load-reservation cells plus 26 drainage and 26 utility reservation cells. It remains an unaccepted Z03/Z05 ownership and technical coordination conflict.

## C1 and other scopes

C1's exact total-land-take bounds end at X=1572; this proposal starts at X=1750, leaving 177 intervening X columns. The bounds are disjoint.

| Independently reconstructed scope | Result against B11 candidate interaction | Exact overlap cells | Accepted interface |
|---|---|---:|---|
| P1-B12 | EXACT_INTERSECTION_COMPILED | 4784 | no |

P1-B12 is intersected exactly above. All other cross-scope comparisons are intentionally deferred to downstream G03/G04/G05 so this upstream B11 proposal remains acyclic.

## G03 impact

This proposal supplies exact construction, interaction, and influence sets for downstream G03. Against the immutable v1 migration baseline, those three sets projected the null ledger from 19 to 16. This artifact deliberately does not consume or rewrite descendant G03, accept the three domains, or pass the canonical gate; accepted P1-B11 domain count remains zero.

## Retained nulls and HOLDs

| Gate | Result | Unresolved basis |
|---|---|---|
| P1-B11-H01-MATERIAL-AND-FUTURE-STATE | HOLD | Setout geometry selects no block, pavement, marking, edge, or replacement state. |
| P1-B11-H02-EARTHWORK-AND-RETAINING | HOLD | Formation depth, cut/fill, side slopes, unsuitable material, mass haul, and retaining systems are unselected. |
| P1-B11-H03-DRAINAGE | HOLD | Exact roadside cells are reservation geometry only; catchment, capacity, crossfall, receiver, outfall, failure, and future-fluid states are null. |
| P1-B11-H04-UTILITIES | HOLD | Exact dry/wet cells are reservations only; services, capacities, separations, crossings, owners, and commissioning are null. |
| P1-B11-H05-STRUCTURAL-AND-ROAD-LOAD | HOLD | The exact two-layer overlap with B12 is coordination geometry, not cover, bearing, settlement, foundation, lining, or load-transfer acceptance. |
| P1-B11-H06-GEOTECHNICAL | HOLD | No accepted geology, groundwater, bearing, settlement, excavation-stability, or ground-improvement basis exists. |
| P1-B11-H07-COMPLETE-SAVE-AND-ENTITY-CLEARANCE | HOLD | The selected evidence is region-only; entities, POI, and level.dat are absent. |
| P1-B11-H08-OWNERSHIP-INTERFACES-AND-TECHNICAL-ACCEPTANCE | HOLD | The side bias, exact sets, B12/Houston seams, and systems remain proposals with no self-acceptance. |
| P1-B11-H09-PHYSICAL-COMPILER-AND-RELEASE | HOLD | No operations, source guards, rollback, preflight, release ledger, or physical authorization exists. |

No operation plan, rollback, preflight, release ledger, or world mutation was generated.
