# Combined Zones R08W — Empty Eight North-Smoke West Segment

Status: `AS_BUILT_POST_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED`

R08W constructs the maximal contiguous, full-height, zero-hazard western
segment of the frozen `EE-SMOKE-N` plane. The selected 50×7 segment is a
bounded static construction package, not a complete smoke boundary and not an
operational smoke-control system.

## Why the full plane remains local work

The accepted R08V post does not support one exact durable full-plane inverse:

- six flowing-water states occupy the frozen plane;
- one additional falling-water state below the plane depends on a plane target,
  so the exact fluid dependency closure is larger than those six cells;
- four suspended N06 gravel states are face-adjacent to mandatory plane cells;
- four more suspended gravel states east of N06 are face-adjacent to mandatory
  plane cells; and
- four gravel cells above source-air plane cells would become newly supported
  by the wall, but rollback to air would destroy their exact source state.

Those findings are local. R08W excludes every wet and gravity interaction band
and ranks all remaining full-height clean column runs. The exact clean runs are
50, 35, 33, 22, 14, and six columns wide. The western `x=1652..1701` run is the
largest and is selected without weakening a guard.

## Source and exact scope

- Source: `data/worldsnap-combined-zones-r08v-post-20260821T232156Z`
- Complete-save SHA-256:
  `b7f411e164b1f3d005d8d116085a0e258153a1388910a9e5751350cc75a6e44c`
- Region SHA-256:
  `39a235a7bdd40493a848bffaf5e7ca1bb738ac9e19e2bd5c43b7248277b6d2ed`
- Source completed-release identity:
  `849d0c719b007c1def5e12b55aabb72776e0ebcb7fd02dbf7a404ce55dca7a5b`
- Selected bounds: `x=1652..1701`, `y=48..54`, `z=50`.
- Selected union: 350 source-air cells in one component.
- Wall field: 341 stone-brick cells using `EE-P01`.
- Static opening cap: one exact 3×3 polished-deepslate plane using `EE-P13`.
- Face interaction halo: 814 cells.

## Ordered reversible packages

| Order | Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `ee-smoke-n-west-compartment-wall` | 341 | `74a545c4a5bfb94437870bb7603ebe730471aae1a0837d390bccfee1679aba92` | `9a8815718e1f628513a30a69eeb7651356bdbfcab91d4676b66c73bb7c330bf2` |
| 2 | `ee-smoke-n-west-static-opening-cap` | 9 | `2865d3bcdc51fa9303dba1ae696f6be0d37d109d30c7483069d94c4e6e48a70e` | `bc055dbe1d8156df51e7127045dfe699987d95b1c9f709df06b2d9f252b492e3` |

Forward execution builds the connected passive wall field bottom-up, then
closes the one declared bay with a static cap. Rollback removes the cap first
and restores the original R02 air reservation in exact reverse order.

## Isolation proof

- Target fluids, gravity blocks, containers, controls, block entities, saved
  entities, protected relics, and future-line seals: zero.
- Interaction-halo fluids, gravity blocks, containers, and controls: zero.
- N06 target or interaction-halo overlap: zero; all four blocked source cells
  remain untouched.
- Forty-six accepted prior manifests checked; the only overlap is 329 exact R02
  air-reservation cells. No active mechanism material or undeclared prior target
  is touched.
- The wet interface, remaining gravity bands, tenant openings, and all powered
  smoke-door mechanisms remain outside the package.

## Offline acceptance

- Manifest QA: 2/2 packages PASS; 350 unique targets; zero package overlap.
- Ordered forward preflight: 341/341 then 9/9 PASS.
- Projected reverse rollback: 9/9 then 341/341 PASS.
- Four strict-noop parser dry-runs: 700 commands, zero WorldEdit leftovers.
- Block-entity audit: 350 operations, zero blockers.
- Focused compiler regression: 7/7 PASS, including byte-for-byte independence
  from `--out-dir` for all five canonical artifacts.
- Scoped wrapper read-only `--print-plan`: PASS with `mvpScope: true`, exact
  smoke/concourse scope IDs, and the declared two-package order.
- Offline evidence:
  `data/world-review/combined-zones-r08w-north-smoke-west-segment-offline`.

Canonical manifest:
`data/buildops/combined-zones-r08w-empty-eight-north-smoke-west-segment.release-manifest.json`.
Manifest payload identity:
`1cd4fba750151fa84fec74494a7e480ccbb9e9e6e1cad15abb81d1262a062a52`.
Manifest full-file SHA-256:
`5564a29a1abec6d3a2dc2907016337ab5ec413856443c9a4e73849e6a4463957`.

## Executed result and independent seal

The corrected scoped wrapper completed at
`data/world-review/combined-zones-r08w-live-20260821T234958Z` with status
`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.

- Strict execution: 350/350 changes, zero failures and zero no-ops.
- Immutable post complete-save SHA-256:
  `fb0bc8910c8176f0e1a5aa4c4fa85e5857a6b131fd647d54a11d0a83a58ec377`.
- Immutable post region SHA-256:
  `095d596d823559e2790260e20d26338e1745c442374216f5e505818ead419244`.
- Completed release identity:
  `cf24047e94f4e7f1eaac0064f83675b4d1bbeac9b0ad2970b9ee398141a168b1`.
- Independent QA verifies 350/350 exact transitions, one maximal 50×7
  full-height component, the exact 341-cell wall and nine-cell static cap,
  814/814 unchanged selected-halo cells, and all 350 reverse rollback guards.
- The remaining 1,022 north-plane cells, full 3,150-cell plane halo, six wet
  plane cells, 68 halo-gravel cells, and all four N06 cells remain unchanged.
- QA payload SHA-256:
  `f3cfbc07db04a4ad5fffe49f1ecc4c8eef7833d57d5819fa247b49e954a551e5`.
- Bounded construction seal SHA-256:
  `1d0233f85699c9bd20b966bdf9fb22caec7551391e516124eec504b0f46d4fdb`.
- Focused compiler/post-QA plus R08V preservation regressions: 18/18 PASS.
- Backend TypeScript build: PASS.

The first wrapper attempt is retained as
[`r08w-superseded-pre-mutation-schema-rejection.json`](../../../data/world-review/combined-zones-r08w-live-20260821T234958Z/r08w-superseded-pre-mutation-schema-rejection.json).
It rejected the earlier manifest at schema normalization because top-level
`mvpScope` was absent, before evidence creation, snapshot capture, clearance,
RCON, or world mutation. It is superseded negative provenance, not an executed
release. The compiler-generated correction added the exact MVP declaration and
scope IDs, and the later release passed the complete hard-safety kernel.

See the [independent post-QA](../../../data/world-review/combined-zones-r08w-live-20260821T234958Z/r08w-post-release-qa.json)
and [bounded-segment seal](../../../data/world-review/combined-zones-r08w-live-20260821T234958Z/r08w-bounded-north-smoke-west-segment-seal.json).
The full north plane remains incomplete and uncommissioned. The independent QA
made no live call, RCON call, service mutation, or world edit.
