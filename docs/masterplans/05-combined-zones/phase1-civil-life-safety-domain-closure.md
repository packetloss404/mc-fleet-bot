# Combined Zones civil/life-safety proposal-domain closure

Status: **PASS_EIGHT_SOURCE_LIMITED_PROPOSAL_DOMAINS_EXACT_ALL_FUNCTIONAL_AND_RELEASE_GATES_HOLD**
Generated: `2026-08-05T05:20:00Z`
Payload SHA-256: `8fb2d3425bcd002fa8e782fae40a5d9eb591e9583535037b5471f009fe103459`

## Result

Eight previously null geometry domains now have exact, deterministic, source-limited proposal unions. This is geometry closure only. Reservation geometry is not accepted construction, and a source-limited influence reservation is not an expert hydraulic, structural, geotechnical, smoke, fire, lift, ventilation, drainage, lighting, or power influence kernel.

| Scope | Domain | Cells | Coordinate SHA-256 | Meaning |
|---|---|---:|---|---|
| P1-B07 | influence | 13,608 | `4a72c3dae60c49e09e7585de17b3475b17f5247a0b75c850ac4303c81581696a` | SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_EQUALS_KNOWN_INTERACTION_UNION_NOT_AN_EXPERT_MARGIN |
| D02 | interaction | 432 | `f671e5f2828825e7b1017043f2cfda67bbcfdbc27cad3294bef1810f12e5390d` | WHOLE_D02_KNOWN_INTERACTION_PROPOSAL_NO_GENERIC_HALO_FLOW_OR_LOADING_CREDIT |
| D02 | influence | 456 | `b028679e8db88801bff71bc6be20f889aa0fb508a5496a64076040fc1c2c4d78` | SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_HYDRAULIC_STRUCTURAL_OR_GEOTECHNICAL_KERNEL |
| D06-RESERVATIONS | construction | 19,836 | `98fbedb97343de4217a7e206287e23374761a6c404b9571f9d5abda03d955e8a` | RESERVATION_AND_CAP_CONSTRUCTION_DOMAIN_PROPOSAL_NOT_PHYSICAL_CONSTRUCTION_TARGETS |
| D06-RESERVATIONS | interaction | 25,310 | `1576d6833c6b27a3301980ac4605c6e3e084ae1b484f00304abcf130f6e5892a` | SOURCE_REFERENCE_INTERACTION_PROPOSAL_DUPLICATES_MERGED_NO_FUNCTIONAL_CREDIT |
| D06-RESERVATIONS | influence | 25,310 | `1576d6833c6b27a3301980ac4605c6e3e084ae1b484f00304abcf130f6e5892a` | SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_LIFE_SAFETY_SMOKE_FIRE_LIFT_POWER_OR_DRAINAGE_KERNEL |
| D06-MECHANISMS | construction | 9,065 | `9a5f1af375293b7cb3bfa06f81f9abd940415656b930a64e386bd123fbe44d8e` | DETAILED_FUNCTIONAL_CONSTRUCTION_DOMAIN_PROPOSAL_NOT_ACCEPTED_MECHANISM_OR_BUILD_TARGET |
| D06-MECHANISMS | influence | 9,065 | `9a5f1af375293b7cb3bfa06f81f9abd940415656b930a64e386bd123fbe44d8e` | SOURCE_LIMITED_COORDINATION_INFLUENCE_RESERVATION_NOT_SMOKE_FIRE_LIFT_VENT_DRAINAGE_LIGHTING_OR_POWER_KERNEL |

The D06 reservation compiler independently reproduced all 73 references before merging duplicates. Raw membership is 41,644; the interaction union contains 25,310 unique cells and 16,001 coordinates occur in more than one source reference. The D06 mechanism compiler independently reproduced all 31 detailed layers and their 9,065-cell union.

## Genuine external HOLDs

| ID | Status | Required evidence |
|---|---|---|
| CLS-H01-COMPLETE-SAME-MOMENT-SAVE | HOLD_EXTERNAL_EVIDENCE | A same-moment save containing region, entities, poi, level.dat, and an ordered capture manifest, followed by entity/POI/block-entity/fluid/generated-start clearance against every final influence set. |
| CLS-H02-D02-HYDRAULIC-STORAGE-RECEIVER-AND-OUTFALL | HOLD_EXTERNAL_TECHNICAL_EVIDENCE | Accepted source/future fluid accounting, catchments, peak storage/freeboard, recovery, pump/control states, receiver, outfall, and directional flow interfaces. |
| CLS-H03-STRUCTURAL-GEOTECHNICAL-AND-MATERIAL-DESIGN | HOLD_EXTERNAL_TECHNICAL_EVIDENCE | Accepted loads, lining/support, foundations, penetrations, geotechnical margins, material/future states, quantities, and construction method. |
| CLS-H04-D06-LIFE-SAFETY-FUNCTIONAL-ENGINEERING | HOLD_EXTERNAL_TECHNICAL_EVIDENCE | Accepted egress endpoints, lift/stair behavior, smoke model, ventilation mode/capacity, barriers, fire-service access, controls, failure logic, and emergency-service review. |
| CLS-H05-POWER-DRAINAGE-RECEIVERS-AND-COMMISSIONING | HOLD_EXTERNAL_TECHNICAL_EVIDENCE | Before R00, accept independent sources, loads, circuits, drainage hydraulics/receiver, mechanism design states, all 29 commissioning test methods and pass criteria, and common-cause analysis. Actual commissioning results are post-build G17/G19 evidence and cannot close G02. |
| CLS-H06-OWNER-INTERFACE-AND-IMMUTABLE-TECHNICAL-ACCEPTANCE | HOLD_ACCEPTANCE_AFTER_TECHNICAL_EVIDENCE | Final one-owner cell assignments, direction-specific interfaces, independent technical review, and sole-owner acceptance of one immutable technical identity. |

## Safety boundary

Accepted construction, material, future-state, mechanism, expert-influence, receiver, commissioning, and operation counts remain zero. No live service, Minecraft world, RCON endpoint, database, systemd unit, or deployment target was contacted.
