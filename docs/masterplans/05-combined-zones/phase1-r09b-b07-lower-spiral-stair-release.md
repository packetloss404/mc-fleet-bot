# Combined Zones CZ-R09B: B07 lower spiral stair

**Status:** EXACT_BUILD_EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE; PEDESTRIAN_ROUTE_COMMISSIONED_TO_RETAINED_UPPER_HOLD_BY_R09D_SEAL  
**Release node:** `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`  
**Canonical owner:** `Z06-PUBLIC-SHAFT-FITOUT`  
**Manifest identity:** `3ce00f8f00830ea82894c64c8d6a7c72bf29e24c2d9a6b1414ff675cacf8f472`  
**Completed release identity:** `cdd7df171ea63e5a04801f04929204c1b8d6c565a1b7e338717f80bbc6aed65a`  
**Post-QA payload identity:** `cbc3a98e84234b2762b6e8ede97e297eec0b09ed6add7bbcc41460ce8a93e565`

## Exact constructed scope

R09B installed the exact dry lower-shaft stair framework within the accepted
B07-C-WEST-2 reservation:

- 1,575 polished-andesite cells form the 5x5 static core from Y=-58 through
  Y=4.
- 128 smooth-stone slabs form a cardinally contiguous helix and four-cell
  upper landing. Its ordered surface rises by no more than one half block per
  step, from doubled elevation -115 to 8.
- Two polished-diorite cells at `(2109,3..4,-429)` mark the retained upper
  hold.
- All 1,705 guarded transitions originated as air and have an exact
  reverse-order inverse back to air.

The live wrapper terminally accepted the exact construction in
`data/world-review/combined-zones-r09b-live-20260821T173228Z/evidence-ledger.json`.
Strict execution changed 1,705/1,705 groups with zero failure, no-op, unknown
reply, or WorldEdit remainder. The immutable post complete-save is
`data/worldsnap-combined-zones-r09b-post-20260821T173228Z`, complete-save
SHA-256 `9be9ed738ea806ddeb729d5681a890f77830f03ed49987e4129d18a2138040a4`
and region SHA-256
`12af0520adee3bff309cb2f21a160419776e178ae833f0d7b5a20c3d184ed1cf`.
All 1,705 rollback guards pass against that post snapshot.

## Independent post-release QA

The parameterized, read-only verifier is
`scripts/qa_combined_zones_r09b_b07_lower_spiral_stair_post_release.mjs`.
It binds the completed ledger and both immutable saves and proves:

- 1,705/1,705 exact operated states;
- zero undeclared changes in both the 3,087-cell dry shaft and 5,265-cell
  interaction halo;
- 128/128 ordered stair cells are cardinally contiguous with half-step-or-less
  progression;
- 256/256 conservative head-clearance cells are air;
- the full 63-cell R09A lower-lobby floor is unchanged;
- the stair's 54-cell intentional interface with R09A's former standing/head
  air planes is exact, while the remaining 72 cells stay air;
- all 1,530 R06 liner/support targets are unchanged and disjoint from R09B;
- block-entity and same-moment live-entity gates have zero blockers; and
- strict execution, journal identity, temporary chunk release, completed
  release identity, and the exact rollback preflight are intact.

The sealed reports are
`data/world-review/combined-zones-r09b-live-20260821T173228Z/r09b-post-release-qa.json`
and `r09b-post-release-qa.md`.

## Functional commissioning hold

The exact construction is accepted, but it is not a safe commissioned public
route yet. Independent post QA found:

- 67 of 128 stair positions have air immediately outside the perimeter; 61
  have an outward drop deeper than one block.
- The exact two-cell upper marker is climbable from the Y=4 landing because
  Y=5 and Y=6 at its coordinate are air. It is not a physically fail-closed
  player barrier.

`R09B-HOLD-FALL-PROTECTION-AND-TERMINAL-BARRIER` remained active through R09C
because independent inspection found an additional core-top bypass. R09D then
installed the full upper-core perimeter crown. Its independent accepted
all-diagonals reachability QA and separate seal now lift this hold only for
pedestrian circulation from the lower lobby to the retained upper hold. No
passage beyond that hold, wet zone, lift, smoke, power, or drainage system is
commissioned. This later disposition does not change R09B's exact post-state
or rollback acceptance.

No post-QA RCON, service, entity, or world mutation occurred.

## Reproduce

```bash
node scripts/qa_combined_zones_r09b_b07_lower_spiral_stair_post_release.mjs
npx vitest run \
  test/build/combinedZonesR09BB07LowerSpiralStair.test.ts \
  test/build/qaCombinedZonesR09BB07LowerSpiralStairPostRelease.test.ts
npm run build
```
