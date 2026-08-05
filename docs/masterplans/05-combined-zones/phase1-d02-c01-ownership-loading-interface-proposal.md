# D02 / C01 Ownership, Loading, and Interface Proposal

Generated: 2026-08-05T06:20:00Z

Result: **HOLD**. This package removes bounded geometry and precedence ambiguity at the C01 Owner Tunnel stack. It does not accept structural capacity, settlement, geotechnics, hydraulics, ISSUE-002, materials, future states, or release.

## Exact bounded geometry

| Domain | Cells | Bounds | SHA-256 |
| --- | ---: | --- | --- |
| C1 land-take terminal datum | 7,803 | {"minX":430,"maxX":718,"minY":68,"maxY":102,"minZ":32,"maxZ":58} | ca41d364eb1c9536550d6bb1d174a73b3b712772afec7407132085c81b0e9860 |
| C1 rail formation | 2,601 | {"minX":430,"maxX":718,"minY":68,"maxY":102,"minZ":50,"maxZ":58} | 7e396875244e5353bafc850208a000daa681f9ee91d7f7ce2eb098a3b66f4898 |
| C1 road surface | 0 | null | aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4 |
| C1 rail collection | 578 | {"minX":430,"maxX":718,"minY":68,"maxY":102,"minZ":50,"maxZ":51} | aa00eb7a48249abf28244d881e691867751fd71f61edfb39d42c26812bd37b92 |
| C1 road collection | 0 | null | aa098373ca9e97626d479bd2ab4609c6c8538dfd2e6bbaf82270fc9e65dd9cf4 |
| D02 selected candidate at stack | 54 | {"minX":432,"maxX":434,"minY":63,"maxY":68,"minZ":49,"maxZ":51} | 8d45d5e8e58be3cb4f127f225e6338b144bcefb04462759c2e099c7b5da38bbc |
| Vertical loading/separation reservation | 944,298 | {"minX":430,"maxX":718,"minY":-36,"maxY":101,"minZ":32,"maxZ":58} | 1fa1a8295a1e48bee4f2e31506538674b759da07486a4a0d471c53f2ad9d02af |

The exact road and road-collection intersections are zero: the Owner Tunnel overlap lies entirely on the rail-side land take. Zero is preserved as an exact set, not replaced with inferred road geometry.

## One-owner precedence

C01 tunnel boundary > vertical loading-separation reservation > D02 capped-sump candidate > rail collection > road collection > rail formation > road surface > rail land-take datum > road land-take datum.

| Priority | Proposed owner | Raw cells | Assigned cells | Lost to loading reservation | Lost to earlier terminal owner |
| ---: | --- | ---: | ---: | ---: | ---: |
| 2 | OWN-D02-C1-DRAINAGE-CONTROL | 54 | 9 | 45 | 0 |
| 3 | OWN-C1-RAIL-CESS-CONTROL | 578 | 572 | 0 | 6 |
| 4 | OWN-C1-ROAD-COLLECTION-CONTROL | 0 | 0 | 0 | 0 |
| 5 | OWN-C1-RAIL-FORMATION-CONTROL | 2,601 | 2,023 | 0 | 578 |
| 6 | OWN-C1-ROAD-SURFACE-CONTROL | 0 | 0 | 0 | 0 |
| 7 | OWN-C1-RAIL-LAND-TAKE-DATUM-CONTROL | 7,803 | 5,199 | 0 | 2,604 |
| 8 | OWN-C1-ROAD-LAND-TAKE-DATUM-CONTROL | 0 | 0 | 0 | 0 |

Of the 54 selected D02 candidate cells at the stack, 45 fall inside the default-deny vertical loading/separation reservation. The remaining 9 terminal cells are proposed to D02; none are accepted construction cells.

## Sealed directional interfaces

| Contract | Exact pairs | Pair SHA-256 | Status |
| --- | ---: | --- | --- |
| IF-C01-OWNER-TUNNEL-TO-C1-LOADING-SEPARATION | 7,803 | 8180932d817b... | HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING |
| IF-C1-LOADING-SEPARATION-TO-D02-CAPPED-SUMP-CAPS | 9 | 36bbd9f2e759... | HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING |
| IF-C1-LOADING-SEPARATION-TO-RAIL-COLLECTION | 572 | a53186cc556f... | HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING |
| IF-C1-LOADING-SEPARATION-TO-ROAD-COLLECTION | 0 | 1bbf1e0cece9... | EXACT_ZERO_NO_DIRECTIONAL_INTERFACE_AT_BOUND_STACK |
| IF-C1-LOADING-SEPARATION-TO-RAIL-FORMATION | 2,023 | 6c0e1de6c317... | HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING |
| IF-C1-LOADING-SEPARATION-TO-ROAD-SURFACE | 0 | 1bbf1e0cece9... | EXACT_ZERO_NO_DIRECTIONAL_INTERFACE_AT_BOUND_STACK |
| IF-C1-LOADING-SEPARATION-TO-RAIL-LAND-TAKE-DATUM | 5,199 | 7fd5971a8a66... | HOLD_EXACT_DIRECTIONAL_SEALED_PROPOSAL_NOT_ACCEPTED_STATES_AND_LOADING_MISSING |
| IF-C1-LOADING-SEPARATION-TO-ROAD-LAND-TAKE-DATUM | 0 | 1bbf1e0cece9... | EXACT_ZERO_NO_DIRECTIONAL_INTERFACE_AT_BOUND_STACK |

The existing two-cell RAIL-LOW-001 collection inlet is also bound exactly and remains sealed/default-closed with no flow credit. It has no accepted transition-state or receiver evidence.

## C01 stack

| Feature | Land-take overlap columns | Exact plan gap | Disposition |
| --- | ---: | ---: | --- |
| C01 Owner Tunnel Detour | 7,803 | 0 | EXACT_BOUNDED_INTERACTION_COMPILED_DEFAULT_DENY |
| C01 East L1 Security Garage | 0 | 11 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 East L2 Living Adult | 0 | 11 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 East L3 Agriculture Water | 0 | 11 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 Owner Residence | 0 | 16 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 East L4 Command Medical | 0 | 40 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 East L5 Power Escape | 0 | 41 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |
| C01 Owner Club Arrival | 0 | 43 | EXACT_ZERO_PLAN_OVERLAP_NO_INTERACTION_FABRICATED |

Only C01 Owner Tunnel Detour overlaps the exact C1 total land take. All seven other catalogued C01 scopes remain exact-zero plan overlaps; their ISSUE-002 and structural acceptance states remain HOLD.

## What changed and what did not

- D02: exact bounded road, rail, drainage, load-path, and D02 conflict geometry now exists. Capacity, settlement, structural/geotechnical acceptance, hydraulics, materials, and ISSUE-002 remain HOLD.
- G03: the bounded C01-stack interaction subset is exact, but whole-D02 interaction and influence unions remain null/HOLD.
- G04: the bounded proposal has exact one-owner precedence; global ownership and every acceptance remain HOLD.
- G05: exact sealed positive-Y pair manifests exist where face adjacency is supported. Transition states, counterpart acceptance, maintenance, power/control, overflow, and receiver interfaces remain HOLD.

Complete save: **HOLD_INCOMPLETE_OR_UNBOUND_SAVE** (0 entity files, 0 POI files, level.dat present: false).

ISSUE-002: **OPEN**. Region-only blocks and the prior design-review concept do not prove relocation, usable road/entrance, recovered parking, current entities/POI, or acceptance.

Physical release: **not authorized**. Operation cells: **0**. World edits: **not authorized**.
