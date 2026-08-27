# Combined Zones CZ-R09F: B07 enclosed upper interface

**Status:** `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_ENCLOSED`  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588`  
**Offline-QA identity:** `f2c1deaece23a1f2131f383787fea77d0703fb6d6535c6773cc6408e6da06340`
**Completed release identity:** `3b9b5c0836b5c42a1e05c7b6a5efd9195015355a33bfad9697473ea5a18059f1`  
**Post-QA identity:** `01c22b585864d130d3e1840d234923a6f66fbdf0fd0263ee9e13de21b47d5ed0`

## Exact enclosed seam

R09F is the smallest source-proven dry connection between the accepted R09E
upper stair and the already enclosed, doorless R07J headhouse. The exact path
starts one cardinal half-step above the R09E terminal surface at
`(2108,60,-395)` and adds 23 ordered half-step surfaces through the accepted
B07 5x5 inner ring. It finishes at the frozen B07 top anchor
`(2108,72,-398)` and faces the retained R07J interior deck cell
`(2108,72,-399)` with one final half-step rise.

The two ordered packages contain 159 unique cells:

1. `b07-upper-interface-containment` — 126 cells: an 88-cell bounded core
   extension and 38 exact polished-diorite closures in the required 40-cell
   outer fall boundary. Two existing full solids remain untouched.
2. `b07-upper-stair-headhouse-seam` — 33 cells: ten exact clearance
   transitions followed by 23 smooth-stone slabs. Five of these cells form the
   contiguous internal R07J landing seam; four become clearance air and the
   exact top anchor becomes the final bottom slab.

All 46 conservative head-clearance cells project to air. The 23 surfaces are
cardinally contiguous and rise exactly one half-block at every step. The final
approach leaves the exterior walls, roof, and absent door unchanged.

## Scoped interfaces and safety

The compiler binds the accepted R09E immutable post
`data/worldsnap-combined-zones-r09e-post-20260822T011348Z`, complete-save
SHA-256
`68b36cde83b73b4bd3fd696385fa43140fd60cd1ee5351189418103a1cf73694`,
completed release identity
`2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e`,
and independent R09E post-QA payload
`456810635961f7e8725c2da2e5a01fbc6f653cd52a99ef14be31135bfdcf269f`.

- Exactly five R07J deck cells and six R09E upper-hold cells are transformed;
  every one has an exact reverse-order inverse. R06 and R09A-D have zero
  target intersections.
- The 638-cell interaction halo has zero fluid. Targets contain zero fluid,
  gravity, woody blocks, block entities, saved entities, containers, controls,
  mechanisms, or protected relics.
- Seven contextual gravity cells remain unchanged and supported. Two stable
  sand cells are face-adjacent to added containment, but no operation removes
  a gravity support and no target is adjacent to unsupported gravity.
- Fourteen contextual woody cells remain unchanged; there is no log or leaf
  mutation.
- The R09E Y=18 lower wet deck remains closed. R07J stays doorless, its
  exterior shell remains closed, and no lift, smoke, power, drainage, future
  opening, public route, or fire-service route is commissioned.

## Frozen artifacts and offline gates

- Manifest full-file SHA-256:
  `2c43d9ad4b16b250fb716ad2a9e9e069bfd204712c363dd12792b696bfa9befb`.
- Containment forward / rollback full-file SHA-256:
  `717f8943c1dff739c879e4fe970d37e1220f66924212e16d989c258f21af1c4a` /
  `328ffdd5c7ab913c4aca3b6aed2fd215f339db5e7587e50d04e9ebd578efafc9`.
- Seam forward / rollback full-file SHA-256:
  `e4ebeeb319fe3b0e857896c64830e4e0d1e56de700c8c618c434c5d477fd9179` /
  `f197fae82198e9a7eb7aea525ec48a80ca3ed9ef96a2e0a7ae02c40ee4589e8a`.
- Offline evidence:
  `data/world-review/combined-zones-r09f-b07-enclosed-upper-interface-offline-20260822T012500Z`.
- Offline QA full-file SHA-256:
  `2ba4c1fa39b2eb605c0d3534c0938350d5e304d53f73087865fbc02bcb386c19`.

Manifest QA passes 2/2 with 159 unique cells. Ordered source preflights pass
126/126 then 33/33. Projected reverse-order rollback passes 33/33 then
126/126. All four strict-noop parser reports pass with zero WorldEdit
leftovers. Block-entity and immutable saved-entity audits have zero blockers.
The real scoped wrapper `--print-plan` accepts the exact two-package order with
no global-gate dependency. Offline QA is 12/12 PASS.

Focused regression:

```bash
npx vitest run test/build/combinedZonesR09FB07EnclosedUpperInterface.test.ts
```

## Executed release and independent post QA

The guarded wrapper completed successfully at
`data/world-review/combined-zones-r09f-live-20260822T013916Z/evidence-ledger.json`
(full-file SHA-256
`60c7106107ee5f03cffc7771a68c4c570bd06a99d508996472737162780f2c30`).
It binds fresh source
`data/worldsnap-combined-zones-r09f-source-20260822T013916Z` and immutable post
`data/worldsnap-combined-zones-r09f-post-20260822T013916Z`, with all 24 wrapper
stages PASS.

Independent read-only post QA proves:

- all 126 containment and 33 seam transitions match exact source and final
  states;
- all 23 new surfaces remain cardinal half-steps from the accepted R09E
  terminal to the exact B07 top anchor and retained R07J interior deck;
- all 46 clearance cells and 40 outer-barrier cells pass, while the retained
  two-cell cap and 12-cell crown remain exact;
- the five-cell R07J internal seam is exact; every other R07J target, all
  retained R09E targets, R09A-D, and the R06 wet treatment are unchanged;
- the complete 638-cell interaction halo contains exactly 159 declared
  changes, zero undeclared drift, and zero lifecycle transition;
- all seven contextual gravity cells and their supports remain unchanged and
  stable, with zero source/post entity or block-entity intersection; and
- both strict journals pass and immutable post rollback guards pass 33/33
  before 126/126.

Canonical independent evidence:

- `data/world-review/combined-zones-r09f-live-20260822T013916Z/r09f-post-release-qa.json`
  — full-file SHA-256
  `e74633591df6aad485309f61b3cf8890013f9337b8595d0b570946fb67611b98`;
- `data/world-review/combined-zones-r09f-live-20260822T013916Z/r09f-post-release-qa.md`
  — full-file SHA-256
  `f171bf2c1e8f6eca7f53165de4a1d4d30c660cc6ab938f890fcf189361b9a5a1`.

Focused closeout regression:

```bash
npx vitest run \
  test/build/combinedZonesR09FB07EnclosedUpperInterface.test.ts \
  test/build/qaCombinedZonesR09FB07EnclosedUpperInterfacePostRelease.test.ts
```

The independent QA made no live/API/RCON/service call and no world mutation.
The headhouse remains doorless and the lower wet deck remains closed; this is
an enclosed construction acceptance, not public-route or fire-service
commissioning.
