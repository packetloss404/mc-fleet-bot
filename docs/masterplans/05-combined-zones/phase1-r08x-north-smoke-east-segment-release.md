# Combined Zones R08X — Empty Eight North-Smoke East Segment

Status: `AS_BUILT_POST_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED`

R08X builds the largest still-unbuilt contiguous, full-height, zero-hazard
segment of the frozen `EE-SMOKE-N` plane after accepted R08W. The selected
35×7 eastern segment is bounded static construction. It does not complete or
commission the north smoke boundary or any powered smoke-control system.

## Source-proven selection

- Source: `data/worldsnap-combined-zones-r08w-post-20260821T234958Z`
- Complete-save SHA-256:
  `fb0bc8910c8176f0e1a5aa4c4fa85e5857a6b131fd647d54a11d0a83a58ec377`
- Region SHA-256:
  `095d596d823559e2790260e20d26338e1745c442374216f5e505818ead419244`
- Source completed-release identity:
  `cf24047e94f4e7f1eaac0064f83675b4d1bbeac9b0ad2970b9ee398141a168b1`
- Selected bounds: `x=1798..1832`, `y=48..54`, `z=50`.
- Selected union: 245 source-air cells in one component.
- Wall field: 236 stone-brick cells using `EE-P01`.
- Static opening cap: one exact 3×3 polished-deepslate plane at
  `x=1820..1822`, `y=49..51`, `z=50`, using `EE-P13`.
- Face interaction halo: 574 cells.

The compiler recalculates every column from the immutable R08W post and
requires every target to remain unbuilt source air. The ranked still-unbuilt
clean runs are 35, 33, 21, 14, and two columns wide. Therefore
`x=1798..1832` is the unique maximal next segment. The accepted R08W target
set has zero overlap with R08X.

## Ordered reversible packages

| Order | Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `ee-smoke-n-east-compartment-wall` | 236 | `2dcf3e4feac9d0a87a300232481585634d37b3de3bc61a4b9a2ae9bf6676c12f` | `5034821a6c9d05ed1168af60bd5e2b8d80c44529a01f44de2838b8bb80657a37` |
| 2 | `ee-smoke-n-east-static-opening-cap` | 9 | `a3f52cc9c7643e48efa426047d3b79cf7773b5b070bc222f6909c0f3f92de8b4` | `bc222172ef887e5edf20f41b5c10a5ef09fb298ffdf25c8f10d315f71e142f3e` |

Forward order constructs the connected passive wall field bottom-up and then
closes the one declared bay with a static cap. Rollback removes the cap first
and restores all 245 original air states in exact reverse order.

## Isolation and preservation

- Target and interaction-halo fluids, gravity blocks, containers, controls,
  block entities, saved entities, protected relics, and future-line seals:
  zero.
- N06 target or interaction-halo overlap: zero; all four fail-closed gravel
  cells remain untouched.
- Forty-seven accepted prior manifests were checked. R08W overlap is zero; the
  only target overlap is 235 exact R02 air-reservation cells.
- Six flowing-water states remain elsewhere on the frozen north plane. All wet
  and gravity interaction bands, tenant openings, and powered smoke-door
  mechanisms remain outside R08X.

## Offline acceptance

- Manifest QA: 2/2 packages PASS; 245 unique targets; zero package overlap.
- Ordered forward preflight: 236/236 then 9/9 PASS.
- Projected reverse rollback: 9/9 then 236/236 PASS.
- Four strict-noop parser dry-runs: 490 commands; zero WorldEdit leftovers.
- Block-entity audit: 245 operations; zero blockers.
- Real scoped wrapper `--print-plan`: PASS with `mvpScope: true`, exact
  smoke/concourse scope IDs, and the declared two-package order.
- Focused deterministic compiler regression: 7/7 PASS.
- Offline evidence:
  `data/world-review/combined-zones-r08x-north-smoke-east-segment-offline`.

Canonical manifest:
`data/buildops/combined-zones-r08x-empty-eight-north-smoke-east-segment.release-manifest.json`.
Manifest payload identity:
`56daf423a9603e23342d1a3d7e1b6ac0677e4daaf28d38ba5a6bcc5b95f1ce3d`.
Manifest full-file SHA-256:
`65a3f38609b7dc5f78bed68ee1ba7fc376a9b30552b41d0d8c69f6a0f98c3843`.

## Executed result and independent seal

The scoped wrapper completed at
`data/world-review/combined-zones-r08x-live-20260822T000635Z` with terminal
status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.

- Strict execution: 245/245 changes; zero failures and zero no-ops.
- Immutable post complete-save SHA-256:
  `be415f76248cc94f8358f4dd2553231726234450e5e4d5102667559a6329ce56`.
- Immutable post region SHA-256:
  `d3ecb8a0e8c8080de4469dcb4bee84369fd9ec99afe5cd32a086afec4d995e87`.
- Completed release identity:
  `f149d854213ece928bebc1c13f2c8973ab7f8770a1406eb3e00aee529ba6cf45`.
- Independent QA verifies 245/245 exact transitions, the one-component 35×7
  full-height geometry, exact 236-cell wall and nine-cell static cap, 574/574
  unchanged selected-halo cells, and all 245 reverse rollback guards.
- The remaining 1,127 north-plane cells, full 3,150-cell plane halo, six wet
  plane cells, 68 halo-gravel cells, and all four N06 cells remain unchanged.
- QA payload SHA-256:
  `d7a1099e605cf1eed5e59620af7db908a34a29b635e7277c418fc5c3d72ae8eb`.
- Bounded construction seal SHA-256:
  `050cb8dbccfd7567bf5678f9871e304a5aed8b5ec41cd9d813839b75098e63cc`.
- Focused compiler, post-QA, and R08W-preservation regressions: 19/19 PASS.
- Backend TypeScript build: PASS.

See the [independent post-QA](../../../data/world-review/combined-zones-r08x-live-20260822T000635Z/r08x-post-release-qa.json)
and [bounded-segment seal](../../../data/world-review/combined-zones-r08x-live-20260822T000635Z/r08x-bounded-north-smoke-east-segment-seal.json).
The full north plane remains incomplete and uncommissioned. The independent QA
made no live call, RCON call, service mutation, or world edit.
