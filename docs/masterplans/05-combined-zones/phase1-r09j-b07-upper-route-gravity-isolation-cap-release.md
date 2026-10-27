# Combined Zones CZ-R09J: B07 upper-route gravity-isolation cap

**Status:** AS-BUILT — EXECUTED, POST-VERIFIED, REVERSIBLE; R09K BOUNDED UPPER SEGMENT COMMISSIONED TO CLOSED HOLDS  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Manifest identity:** `c6bcf5546abfd9aaceb24d3e0ee70b4b57cb07e47be800baa08478a1ad2306a1`  
**Source:** accepted R09H post `data/worldsnap-r09h-post-20260822T022248Z`,
complete-save SHA-256
`ed08a563a3cbe2d450db735b21e0d8b644938f8044e2773fd71a61b20eaff684`

CZ-R09J is the exact two-cell reversible response to the R09I commissioning
screen. That screen proved the full 113-surface B07 route cannot yet be
commissioned because its fall boundary includes the inherited floating-gravel
column at `x=2104,z=-396,y=27..30`, with terminal air at `y=26`. Supporting,
removing, or replacing that column would make an exact rollback unsafe because
restored unsupported gravel can fall during rollback.

R09J instead fail-closes stair index 20 with polished diorite at
`(2105,30,-397)` and `(2105,31,-397)`. Both targets are exact R02-authored air,
are not face-adjacent to gravity, and have coordinate-set SHA-256
`6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b`.
The exact inverse restores the same two air states in reverse order.

## Bounded upper-segment proof

The conservative eight-neighbour, maximum-one-block-step graph proves that the
cap isolates a useful dry upper segment without touching the unsafe boundary:

- stair indices 21 through 110 plus the closed internal headhouse hold form one
  91-surface component;
- all 182 upper head-clearance cells are retained and remain outside the cap;
- the 174-cell upper fall boundary contains eight gravity cells, all eight
  source-proven supported, with zero unsupported gravity;
- the upper component reaches zero surfaces at indices 0 through 20;
- both inherited unsupported boundary cells and their terminal-air support
  chain remain untouched;
- the 36-cell cap halo has three gravity cells but zero face-adjacent gravity,
  zero fluid, active mechanism, block entity, saved entity, protected relic,
  or gravity-support removal.

This is a physical isolation package, not a commissioning declaration. After
execution, fresh post QA must verify the cap and rerun the same bounded graph,
clearance, support, containment, drift, entity, journal, and inverse checks.
Only that later functional seal may commission the 91-surface upper segment.
The full route, lower wet interface, exterior opening, mechanisms, and
public/fire-service use remain closed.

## Frozen artifacts and offline evidence

- Compiler:
  `scripts/compile_combined_zones_r09j_b07_upper_route_gravity_isolation_cap.mjs`,
  SHA-256
  `716e8b0f270e5f5bb28f7a3a6a694984eac30ee417f915d6227b686ded189716`.
- Manifest:
  `data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.release-manifest.json`,
  SHA-256
  `ccc587f4b67cb5b6a17bd7639758ae4c4fa0eb3aecbe797312c89572e690f4a2`.
- Forward operation:
  `data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.b07-upper-route-gravity-isolation-cap.forward.txt`,
  operation-body SHA-256
  `c8363a130ce465d64ac4639d7e852822c301e85ff0c315348316d9ccc1e38580`,
  file SHA-256
  `24420c10834e83778e17ba77d029bc6591cd6cd4acc469d38bd0ad3e4decdc5f`.
- Reverse-order rollback:
  `data/buildops/combined-zones-r09j-b07-upper-route-gravity-isolation-cap.b07-upper-route-gravity-isolation-cap.rollback.txt`,
  operation-body SHA-256
  `a6e11c8c3756f68e8320c290ccb4adec92e935ded2cedd0c53aa1ad78a2ae5e6`,
  file SHA-256
  `4d1a0ea18ac52a90f1909f11d4155b2e9cb09e2bf68dc0a830ee8ff2d45e7a05`.
- R09I exact blocker:
  `data/world-review/combined-zones-r09h-live-20260822T022248Z/r09i-b07-enclosed-dry-upper-route-commissioning-blocker.json`,
  identity
  `e05264b91ddf7dbeb5b4247a443ca22b94907bbacf12a602e67c2e81f31b751b`.
- Offline QA:
  `data/world-review/combined-zones-r09j-b07-upper-route-gravity-isolation-cap-offline-20260822T023500Z/offline-qa.json`,
  status
  `PASS_R09J_B07_UPPER_ROUTE_GRAVITY_ISOLATION_CAP_OFFLINE_RELEASE_READY`,
  12/12 checks, report identity
  `8c739840f505d8be7d036af38ec25fe53db48974a37475ad4f234646f296ef3a`.

Manifest QA, exact 2/2 forward source preflight, projected 2/2 rollback
preflight, strict-noop forward and rollback parsers, block-entity and immutable
saved-entity clearance, and the real wrapper `--print-plan` all pass. Fresh
same-moment live-entity clearance remains mandatory inside the wrapper. No
live system was contacted and no world or service state was mutated while
compiling, preflighting, testing, or documenting R09J.

## Executed R09J and bounded R09K acceptance

The guarded R09J wrapper completed with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`. Its immutable ledger is
`data/world-review/combined-zones-r09j-live-20260822T025021Z/evidence-ledger.json`,
SHA-256
`ea89c16e664efa2981b70da07d783d800f4cf9e3bd0f26625ffeaf58e4d7aa7d`,
and completed-release identity
`0c722e3ac473ab22239bba599bbab8c1b9776f727212442bf9a044c40494a47d`.

Independent post QA is
`PASS_R09J_B07_GRAVITY_ISOLATION_CAP_POSTSTATE_VERIFIED_REVERSIBLE`,
15/15, payload SHA-256
`f80caf3936e1d485b130a8a5c49df914b69de6a3072322c6bd487ec559efee6a`.
It verifies both cap states, the isolated 91-surface upper graph, 182/182 air
clearance, and the complete 174-cell boundary comprising 172 collision cells
plus the two previously accepted floor-backed R09H apertures. All eight upper
boundary gravity cells remain supported. The inherited unsupported gravel and
terminal air, wet lower deck, doorless exterior shell, fixtures, mechanisms,
entities, and block entities are unchanged. Only the two declared targets
changed in the 36-cell halo and complete 13,608-cell B07 interaction domain;
17/17 stages, the ten-entry journal, and 2/2 rollback guards pass.

The separate read-only R09K functional seal is
`PASS_R09K_B07_BOUNDED_UPPER_SEGMENT_COMMISSIONED_TO_CLOSED_HOLDS`,
12/12, identity
`b8eaa177b111c25f1e7faa51b5b450dec9610b4d0fcd0e63f2b3447d4434ef21`.
It accepts passive internal inspection circulation only across the isolated
91-surface component from stair index 21 through index 110 to the closed
doorless headhouse hold. The full through-route, indices 0 through 20, lower
wet interface, exterior door, public/fire-service/accessibility use, lift,
smoke control, power, and drainage remain explicitly uncommissioned. This
closes the R09 MVP physical fit-out lane at its useful bounded state; further
work moves to a larger required R10 or R13 scope, not another tiny cosmetic
B07 package.
