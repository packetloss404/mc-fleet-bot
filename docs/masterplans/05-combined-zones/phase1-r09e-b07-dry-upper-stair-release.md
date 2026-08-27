# Combined Zones CZ-R09E: B07 dry upper-stair construction

**Status:** `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_FAIL_CLOSED`  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f`  
**Offline-QA identity:** `ff73b5a171af253e1cf78b1dc4676e80e8c5c5a9fb5b0228959ef32dd353bf95`
**Completed release identity:** `2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e`  
**Post-QA identity:** `456810635961f7e8725c2da2e5a01fbc6f653cd52a99ef14be31135bfdcf269f`

## Exact bounded construction

R09E parameterizes only the accepted B07-C-WEST-2 `upperVertical` 7x7
primitive and the already accepted R09B/R09C/R09D stair, outer-containment,
terminal-cap, and crown rules. It adds two ordered packages:

1. A 49-cell polished-diorite containment deck at Y=18. This is one full dry
   layer above the R06 wet-class maximum Y=17.
2. A 1,183-cell upper-stair framework: 1,075 polished-andesite core cells, 88
   smooth-stone stair/landing slabs, a two-cell polished-diorite retained cap,
   a 16-cell polished-andesite crown, and two exact polished-diorite closures
   in otherwise solid outer containment.

The combined 1,232-cell target set is exact and disjoint. It stops at Y=62,
one layer below the first accepted R07J surface-architecture target at Y=63.
Both termini remain closed. The package does not connect the accepted lower
stair across its wet hold, open the headhouse, or commission the new upper
construction as a public route.

## Source and safety findings

The compiler binds the accepted R08AB post snapshot
`data/worldsnap-combined-zones-r08ab-post-20260822T005922Z`, complete-save
SHA-256
`f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb`
and completed release identity
`478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3`.

- All 1,232 source guards are exact air states.
- All 1,230 construction targets and two interaction-only outer-gap targets
  stay inside the canonical B07 interaction domain.
- The 2,852-cell interaction halo contains zero fluid.
- One source-floating gravel cell at `(2104,27,-396)` is retained unchanged.
  No target is face-adjacent to it and no operation removes its support.
- There are zero target/container/control/mechanism, block-entity, saved-entity,
  protected-relic, exterior-opening, or prior material-release intersections.
- The 176-cell outer collision boundary projects to 174 retained full solids
  plus two exact closures and zero fall-containment failures.
- The 88 stair/landing positions are cardinally contiguous with at most one
  half-block rise per step and preserve all 176 conservative headroom cells.

The R02 overlap is 1,186 accepted excavation-air cells, not a material
overwrite. Their inverses restore the exact accepted air state. R06, R07J,
and R09A through R09D have zero target intersections.

## Frozen guarded artifacts

- Manifest:
  `data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json`
  — full-file SHA-256
  `084ab0be0a94c63b93245be030b22412760a7af1b72d2ef9187b0d5d26cf5ec4`.
- Deck forward / rollback full-file SHA-256:
  `d05c729bcd1143099a411cf958f88807dd3443aba7d8b2d31436e231d8ae3684` /
  `d1b0dc1bb03c2d75ca5028bb88490493576a63cb15724eace940550761f2b4c8`.
- Framework forward / rollback full-file SHA-256:
  `e42067050477c08921b5f04ddedeea3fdf2042e78678877558f52cc969f6448a` /
  `515da29bf413d6d2919792fb6c123a195fae328837585eae1d04ca41101528e6`.
- Offline evidence directory:
  `data/world-review/combined-zones-r09e-b07-dry-upper-stair-offline-20260822T011800Z`.
- Offline QA:
  `offline-qa.json` — 12/12 PASS, full-file SHA-256
  `f2887db6443f09c7a1b782c814850a1f0e26f5bb89b6b6a931ae11e210884cbc`.

Both ordered forward preflights pass 49/49 and 1,183/1,183. Projected
reverse-order rollback passes 1,183/1,183 before 49/49. All four strict-noop
parser checks pass with zero WorldEdit leftovers. Manifest QA is 2/2 with
1,232 unique targets, the block-entity audit and immutable saved-entity audit
have zero blockers, and the real wrapper `--print-plan` accepts the exact
two-package order and full scoped kernel.

Focused regression:

```bash
npx vitest run test/build/combinedZonesR09EB07DryUpperStair.test.ts
```

## Executed release and independent post QA

The guarded wrapper completed successfully from the fresh source save
`data/worldsnap-combined-zones-r09e-source-20260822T011348Z` to immutable post
`data/worldsnap-combined-zones-r09e-post-20260822T011348Z`. The canonical
execution ledger is
`data/world-review/combined-zones-r09e-live-20260822T011348Z/evidence-ledger.json`
(full-file SHA-256
`da6787f28d21b2e3395b5dc86f9570a0eff152360d19ffdb19484e73c168b327`),
with status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE` and 24/24 stages PASS.

Independent read-only post QA proves:

- all 49 deck and 1,183 framework targets match their exact final states;
- the desired material census is 1,091 polished andesite, 53 polished
  diorite, 46 top slabs, and 42 bottom slabs;
- all 88 stair surfaces retain cardinal half-step continuity, all 176
  clearance cells remain air, and the complete 176-cell outer barrier is
  contained with the two declared closures;
- the retained cap, crown, lower wet buffer, R06 treatment, upper R07J buffer,
  and every R09A-D material target are unchanged outside this release;
- the full 2,852-cell source/post halo contains exactly the 1,232 declared
  changes, zero undeclared drift, and zero lifecycle transitions;
- source and post snapshot entity/block-entity scans are empty in the halo,
  while the wrapper's live, same-moment, and block-entity gates remain bound;
- both strict journals are complete and the immutable post passes exact
  reverse-order rollback guards for 1,183/1,183 then 49/49 cells.

Canonical independent evidence:

- `data/world-review/combined-zones-r09e-live-20260822T011348Z/r09e-post-release-qa.json`
  — full-file SHA-256
  `abfea161d773ed653e5d32535542779042de94140ca2508de86bac48318ed45c`;
- `data/world-review/combined-zones-r09e-live-20260822T011348Z/r09e-post-release-qa.md`
  — full-file SHA-256
  `3366e9c73b9cccf45578c871b5a280b47177689f728c894d48985243308e9f7a`.

Focused closeout regression:

```bash
npx vitest run \
  test/build/combinedZonesR09EB07DryUpperStair.test.ts \
  test/build/qaCombinedZonesR09EB07DryUpperStairPostRelease.test.ts
```

The independent QA made no live/API/RCON/service call and no world mutation.
Both termini remain fail-closed: this accepts exact construction and rollback
readiness only, not public-route, fire-service, lift, power, smoke, or drainage
commissioning.
