# R08AC Empty Eight North-Smoke Supported-Gravity West Segment

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Canonical owner: `OWN-D06-SMOKE` under `Z02-U1-CONCOURSE-MALL`  
Status: **AS-BUILT / EXECUTED / POST-VERIFIED / REVERSIBLE / POST-QA ACCEPTED; FULL BOUNDARY NOT COMMISSIONED**

R08AC builds the largest residual full-height wall run whose adjacent gravity
is proven durable in the accepted R08AB source. It retains every gravel cell
unchanged, excludes the four suspended N06 cells, and does not touch a fluid
or powered interface.

## Exact scope and ordering

- Segment: `x=1787..1791`, `y=48..54`, `z=50`.
- Geometry: one connected 5×7 component; 35 exact source-air transitions.
- Material: 35 `minecraft:stone_bricks` cells using `EE-P01`.
- Opening-reservation intersection: zero; one wall-only package.
- Face halo: 94 cells, including 22 exact gravel states and zero fluids,
  containers, controls, or unstable support contacts.
- Forward order is bottom-up. Exact inverse rollback is top-down and restores
  all 35 source-air states without changing a gravity cell or its support.

The compiler ranked every remaining full-height column. Exactly two bounded
gravity-adjacent runs are admissible: x=1787..1791 (five columns) and
x=1796..1797 (two columns). R08AC selects the unique largest run.

## Gravity and isolation proof

- All 22 retained gravel cells have complete downward dependency chains
  terminating on durable exact-source solid support.
- The dependency union is the same exact 22-cell gravel set; it has zero
  target/operation intersection.
- Target fluids, gravity, containers, and controls: zero.
- Halo fluids, containers, and controls: zero.
- N06 interaction-envelope intersections: zero. All four suspended N06
  gravel cells remain fail-closed and excluded.
- Block entities, saved entities, protected relics, and future seals: zero.
- Fifty-two prior manifests were checked. The only accepted target ownership
  overlap is 35 exact R02 air-reservation cells; undeclared overlap is zero.

| Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| --- | ---: | --- | --- |
| `ee-smoke-n-supported-gravity-west-compartment-wall` | 35 | `e3d421c4591283070f5010ea4c700c72711fe283781f74f758b6d6dd6a81b947` | `06ba143a4d5b95ee915a93e5d8299f25ab5d1fed33865a97505139347a94bcc7` |

## Source and offline gates

- Source: `data/worldsnap-combined-zones-r08ab-post-20260822T005922Z`.
- Complete-save SHA-256:
  `f9612be6c862f1693ce9c7be60e3fcc5eeb5e7a305d5ca62632d10b22bb606cb`.
- Region SHA-256:
  `4d0fc4568f8cded612e3d552520cc640056ad8c9a962379746e3069f8fe6bf7a`.
- Source completed-release identity:
  `478d681e6df3255cf3f28742a8a00220b668754f9747777c4eab617a9d13c6e3`.
- Manifest QA: 1/1 package and 35 unique targets PASS.
- Forward source preflight and projected reverse rollback: 35/35 PASS each.
- Strict-noop forward/rollback parsers: 70 commands, zero WorldEdit leftovers.
- Block-entity audit: 35 operations; zero blockers.
- Real scoped wrapper `--print-plan`: PASS with top-level `mvpScope: true`.
- Focused deterministic compiler regression: 7/7 PASS.
- Combined R08AC/R08AB compiler and R08AB post-QA regressions: 22/22 PASS.
- Backend TypeScript build: PASS.

Canonical manifest:
`data/buildops/combined-zones-r08ac-empty-eight-north-smoke-supported-gravity-west-segment.release-manifest.json`.
Manifest payload identity:
`3509c4b5df3e01e5c64741a3e395eebf04269cd6fc6a8db14ab3daad2b7cfb96`.

Offline evidence:
`data/world-review/combined-zones-r08ac-north-smoke-supported-gravity-west-segment-offline`.

## Executed post-state and independent seal

- Ledger: `data/world-review/combined-zones-r08ac-live-20260822T011245Z/evidence-ledger.json`; terminal status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.
- Accepted post: `data/worldsnap-combined-zones-r08ac-post-20260822T011245Z`; complete-save SHA-256 `ae8ae28474c3b3c21d8c39c8cbf3550f80124ddbfe822324965054789c60d3b9`.
- Completed release identity: `f19e02e5aa9d0c0d783593428c0c2003d9361d5568df10149059a53b4f458f0c`.
- Independent QA verifies 35/35 wall states, the one-component 5x7 topology,
  94/94 halo cells, all 22 retained gravel dependency states and durable
  terminals, all 1,085 prior R08W–R08AB cells, zero undeclared drift across
  4,522 bounded cells, 17/17 wrapper stages, the complete 76-event journal,
  and 35/35 reverse rollback guards.
- Accepted-post residual census: 232 cells — 147 wet, 70 gravity, and 15
  non-air source-state cells; 21 carry the overlapping N06-adjacent annotation.
- [Independent QA](../../../data/world-review/combined-zones-r08ac-live-20260822T011245Z/r08ac-post-release-qa.json) payload: `f1ed340c9cdac137af5d8bf622091a2a0eccea3089c3749865f5a06d2f3e4c04`.
- [Construction seal](../../../data/world-review/combined-zones-r08ac-live-20260822T011245Z/r08ac-bounded-north-smoke-supported-gravity-west-segment-seal.json) payload: `6d5e7c7b7284e8fe99b34266a429af7e6425c62859aeade75724b3c8ad4d5da7`.
- Final focused compiler/post-QA regression: 29/29 PASS. Backend build: PASS.

R08AC does not commission the complete north boundary or powered smoke
control. Wet bands, suspended gravel, N06, and non-air source-state bands stay
local fail-closed residuals. Independent QA made no live call, RCON call,
service mutation, or world edit.
