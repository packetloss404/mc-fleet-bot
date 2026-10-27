# Combined Zones CZ-R09D: B07 terminal crown

**Status:** EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE; PEDESTRIAN_ROUTE_COMMISSIONED_TO_RETAINED_UPPER_HOLD  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `eba26411e7076fd30899c891b57677a48e8daba8772897bb998e42f8bf1d58a0`

## Selected correction

Independent R09C post inspection accepted its exact 127-cell outer containment
but correctly refused pedestrian commissioning. The R09B 5x5 core ends at
Y=4, so its top surface at Y=5 remained a one-block step above the terminal
landing. A player could step or jump onto that core and reach around the
otherwise two-block-high R09C retained cap.

R09D is the complete minimal collision closure: 16 polished-andesite blocks at
Y=5 cover the full perimeter of the 5x5 core. A local patch at only the
observed north-side entry was rejected because it would leave side and
diagonal approaches. The full perimeter:

- keeps all 25 accepted R09B core-top blocks untouched;
- encloses the remaining 3x3/Y=5 interior surface behind collision solids;
- raises every perimeter surface to Y=6, two full blocks above the Y=4
  terminal route; and
- leaves the 128 stair cells, all 256 headroom cells, and the existing
  R09C cap untouched.

The compiler evaluates the before/after geometry with a conservative
eight-neighbor surface graph. Every diagonal is admitted even where actual
corner collision would be stricter. Before the crown, 26 core/cap surfaces
are reachable from the five terminal route surfaces. After projection, zero
core, crown, interior, or cap surfaces are reachable. The 11 direct
one-block core-entry edges become zero.

## Ownership, source, and exclusions

All 16 cells are in the exact 8,134-cell canonical B07 construction domain and
the 13,608-cell B07 interaction domain. No interaction-only or outside-domain
cell is used.

The compiler is rebound to the latest accepted terminal baseline:

- snapshot: `data/worldsnap-combined-zones-r08n-post-20260821T180151Z`;
- complete-save SHA-256:
  `083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c`;
- region SHA-256:
  `6634800dff0fbcd11a7aadd0e4c90804c9d098e6ef9f8b2660e7d29d9b76cd7e`;
- source ledger SHA-256:
  `f65dcb8181519a505bf608bb2b08fcda41741f484a2774eb60540cc8e2dd7dfb`;
  and
- source completed identity:
  `3b223d0482b9acabea43b864b41a9a72ddc285766dcbffe12e69d52ac142c70a`.

The source proves all 1,705 R09B targets and all 127 R09C targets remain in
their accepted states. R09D overlaps none of R06, R09A, R09B, or R09C's
operated cells. Its 144-cell interaction halo contains zero fluid, gravity,
block entity, saved entity, or protected relic. Wet-zone, lift, smoke, power,
drainage, upper-route opening, and the retained cap remain out of scope.

## Guarded artifacts and offline gates

- Manifest:
  `data/buildops/combined-zones-r09d-b07-terminal-crown.release-manifest.json`
  (full-file SHA-256
  `0bf16197b564d0b4a54b2513b72487246399175f739510cffc7e06c9a2277e54`)
- Forward: 16 one-cell air-to-polished-andesite guards, full-file SHA-256
  `153b7df51c39981a2c15bb2e2f49130ea83f176eeb8740fb4cf6313233b3d05b`
- Rollback: 16 reverse-order polished-andesite-to-air guards, full-file
  SHA-256
  `320826cfd8438dab06855e5ee666fe2090cbd517712a50fdc353b5006362bb56`
- Exact target set: 16 cells, SHA-256
  `656002eadbb3714eab9d99016a59f63ffaf7d1fdce899242219746c7fb32ef01`

Offline evidence is in
`data/world-review/combined-zones-r09d-b07-terminal-crown-offline-20260821T180800Z`:

- structural manifest QA: PASS, 16 unique targets;
- exact source preflight: 16/16 PASS against the R08N post snapshot;
- strict forward and rollback parser checks: PASS, 16 commands and zero
  WorldEdit leftovers each;
- projected rollback preflight: 16/16 PASS after exact forward overlay;
- block-entity audit: PASS with zero blockers; and
- focused deterministic regression: 6/6 PASS.

## Execution and commissioning boundary

R09D executed successfully through the strict scoped wrapper. The terminal
ledger is
`data/world-review/combined-zones-r09d-live-20260821T181124Z/evidence-ledger.json`
with completed release identity
`39c27d80f062081a4cabee17eb22c3a1a6ce6776e62ea17e5d975e259eb8c8d0`.
Strict execution changed 16/16 groups with zero failure, no-op, unknown reply,
or WorldEdit remainder. The immutable post is
`data/worldsnap-combined-zones-r09d-post-20260821T181124Z`, complete-save
SHA-256 `899e8ce2b42bfa77ec01cbaba9088880a6760d30ff328722ec40958be34582ac`
and region SHA-256
`8b4fe0d6f20fdb4f59847aebf04cf21528763553d2140c23c50f6808068894e3`.
All 16 inverse guards pass on that post state.

Independent read-only QA in `scripts/qa_combined_zones_r09d_b07_terminal_crown_post_release.mjs`
then proved:

- 16/16 exact crown states;
- all 127 R09C and 1,705 R09B operated states unchanged and desired;
- 128/128 stair positions collision-contained and 256/256 headroom cells air;
- the controlled low-clearance gravel overhang unchanged;
- all 63 R09A floor and 1,530 R06 treatment cells unchanged;
- exactly 16 local source/post changes, all declared R09D targets;
- strict journal identity, entity/block-entity gates, and exact rollback; and
- zero reachable core, crown, cap, or outer-barrier surfaces under the
  strengthened graph that admits every diagonal. The same graph detects 26
  forbidden surfaces in the source/pre-crown geometry.

The accepted QA is
`data/world-review/combined-zones-r09d-live-20260821T181124Z/r09d-post-release-qa.json`,
payload SHA-256
`4b0ad0de583c16b7d32b9829ee3ac8e31afa25c7b03be6aa930087f837e81584`.
Because every functional check passed, the separate commissioning seal is
`r09b-r09c-r09d-pedestrian-circulation-commissioning-seal.json`, identity
`ef8c5882dca854ff67f107597ae62ad74453f6eb656e3f390d0307c9052ca85b`.

The R09B pedestrian hold is lifted only for circulation through the lower
stair to the retained upper hold. Wet zone, lift, smoke, power,
drainage/outfall, upper shaft, surface opening, and any passage beyond the hold
remain closed and uncommissioned. The independent QA made no live calls or
world edits.

Reproduce offline:

```bash
node scripts/compile_combined_zones_r09d_b07_terminal_crown.mjs
npx vitest run test/build/combinedZonesR09DB07TerminalCrown.test.ts
npx vitest run test/build/qaCombinedZonesR09DB07TerminalCrownPostRelease.test.ts
npm run build
```
