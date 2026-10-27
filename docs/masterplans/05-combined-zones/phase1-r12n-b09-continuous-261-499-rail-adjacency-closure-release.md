# CZ-R12N · B09 continuous indices 261..499 passive-rail closure

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE, POST-QA ACCEPTED; TRANSPORT NOT COMMISSIONED  
**Release:** `CZ-R12N-P1-B09-CONTINUOUS-261-499-ONE-HUNDRED-TWENTY-THREE-CELL-RAIL-ADJACENCY-CLOSURE`  
**Source:** accepted R12L post `data/worldsnap-r12l-post-20260822T034902Z`  
**Manifest identity:** `055c65a9f9794fd5f36025991ab997c3a6adea94f6e742038e33238b35182eb8`  
**Readiness payload:** `80952d0cbcc23ddeee08f30d02b04434b1318a7797c93c2b4ae0e45360dbf3c2`
**Completed identity:** `6b5752472621525ef576b6f5f3c28cfbc2872416afef02706757a18b6b61e982`  
**Post-QA payload:** `382e39b66da9c29f0cbf128f2b92dc2b81f3e248a4e79f6b825cb273d8d2f5e3`

R12N fills the complete 123-cell graded air gap at centerline indices
`297..419` between the accepted continuous component `261..296` and accepted
R12E level run `420..499`. The exact sequence contains 90 `ascending_west`
and 33 `east_west` states. A clean release produces one unbranched 239-cell
passive component across indices `261..499`.

A disposable loopback proof on exact production Paper
`1.21.11-69-main@94d0c97` verifies upper-to-lower placement, all 239 resulting
states, reverse-order rollback to 123 air cells, and all 116 prior interface-
component states after rollback. Proof payload:
`b7f3360f304f0b99f6e9829970f3e807aebd1795bcfb99d82063ab95648db713`.

The compiler binds 123 air targets, 123 polished-diorite supports, 123 air
headroom cells, two accepted east-west interfaces, all 366 prior rails, both
12-cell external caps, the exact 1,659-cell dry/static halo, and the complete
7,800-cell B09 accommodation. The halo contains six accepted passive sea-
lantern fixtures; it contains no fluid, gravity, entity, block entity, relic,
container, or undeclared mechanism hazard.

Offline readiness passes 15/15: exact manifest QA, forward123/123, projected
rollback123/123, both strict-noop parsers, block-entity clearance, and the real
wrapper `PREPARE_ONLY` plan. Deterministic focused regressions and the backend
TypeScript build pass.

The guarded wrapper subsequently completed 17/17 stages. Independent
immutable-post QA passes 18/18: all 123 desired states, supports, and headroom
cells; one unbranched 239-cell component; all 366 prior rails and both caps;
exactly 123 declared halo/B09 differences and zero undeclared drift; a final
489-rail census of 116 ascending-west, 354 east-west, and 19 north-south;
journal252; and rollback123/123. The canonical QA is
`data/world-review/combined-zones-r12n-live-20260822T040651Z/r12n-post-release-qa.json`.

Frozen buildops:

- manifest: `1153754d5bc8b43d67fa9371a5de668d3b778a0db0f06e67f72257fd2afbe43b`
- forward: `1109ba42b4f451dae8ef09f346e858f59cea8a91a56d31adbee77654320fd511`
- rollback: `3e6dc7bc27b819288e52e5399e760a8ba5c77524bffe3d7ed81e5dca9224474b`

The exact turns at indices 240, 260, and 500, station interfaces, powered
rails, vehicle, drive/brake, control, power, drainage, passenger/rescue use,
and funicular commissioning remain excluded. No live call or mutation was
performed by the compiler, proof, offline gates, tests, or documentation.
