# R08AD Empty Eight North-Smoke Supported-Gravity East Segment

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Canonical owner: `OWN-D06-SMOKE` under `Z02-U1-CONCOURSE-MALL`  
Status: **AS-BUILT / EXECUTED / POST-VERIFIED / REVERSIBLE / POST-QA ACCEPTED; FULL BOUNDARY NOT COMMISSIONED**

R08AD is the unique largest remaining full-height run whose adjacent gravel is
source-proven durable after R08AC. It builds no fluid, gravity, mechanism,
tenant, or N06 cell.

## Exact package

- Geometry: `x=1796..1797`, `y=48..54`, `z=50`; one connected 2x7 component.
- Forward: 14 exact `minecraft:air` to `minecraft:stone_bricks` transitions,
  bottom-up.
- Rollback: the exact 14 inverse transitions, top-down.
- Interaction halo: 46 cells. Its eight gravel cells are retained unchanged;
  each complete downward chain terminates on exact durable stone support.
- Opening, fluid, container/control, block entity, saved entity, protected
  relic, future seal, N06, and undeclared prior-release intersections: zero.
- The four suspended N06 gravel sources and all wet interfaces remain excluded.

| Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| --- | ---: | --- | --- |
| `ee-smoke-n-supported-gravity-east-compartment-wall` | 14 | `29f49380b46de3eb1236427a4ffa70a7d3b4b7c9075a2ae35e3c4ea30d16b9b2` | `ef14a2f73835352de2a4595321281ff950206b2ec25c1cb63ddd6a13d4101d18` |

## Source and gates

- Accepted source: `data/worldsnap-combined-zones-r08ac-post-20260822T011245Z`.
- Complete-save SHA-256: `ae8ae28474c3b3c21d8c39c8cbf3550f80124ddbfe822324965054789c60d3b9`.
- Region SHA-256: `4436f48cf759066df1a22cfe578719603e2149788fd2ecd79a4badfea988f4c7`.
- Source completed identity: `f19e02e5aa9d0c0d783593428c0c2003d9361d5568df10149059a53b4f458f0c`.
- Manifest QA: one package, 14 unique targets, zero intersections.
- Forward source and projected inverse preflights: 14/14 PASS each.
- Strict-noop forward/rollback parser checks: 28 commands, zero leftovers.
- Block-entity audit: PASS with zero blockers.
- Real wrapper `--print-plan`: `PREPARE_ONLY`, no global gate dependency.
- Focused R08AD/R08AC/post-QA regression: 20/20 PASS. Backend build: PASS.

Canonical manifest:
`data/buildops/combined-zones-r08ad-empty-eight-north-smoke-supported-gravity-east-segment.release-manifest.json`.
Manifest payload identity:
`98c5766a634bbf68b6dd005c0ca50299c017276738be839cf91a9ea6505e9c9e`.

Offline readiness:
`data/world-review/combined-zones-r08ad-north-smoke-supported-gravity-east-segment-offline/r08ad-offline-readiness.json`;
payload identity
`bc8569b0989fdbeae73b8204e5c6000e50bac1037e17f4788743b57b86463070`.

## Executed post-state

- Ledger: `data/world-review/combined-zones-r08ad-live-20260822T012919Z/evidence-ledger.json`; terminal status `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`.
- Accepted post complete-save SHA-256: `5679af27562cd39e6ed78583b2168d4da5dc05a585074116cebe836cf39a71aa`.
- Completed identity: `8a52c003b3466815fcb1adfbec13082fab8d47b48d5a97fb385654cd1dae18d4`.
- Independent QA verifies 14/14 targets, 46/46 halo cells, eight exact
  supported-gravity chains and terminals, 1,120 prior cells, six wet cells,
  four N06 cells, zero lifecycle/undeclared drift across 4,522 cells, 17/17
  stages/evidence, the 34-event journal, and 14/14 inverse guards.
- QA payload: `e21d8009ee96fcecbde5f6f15f35c13599e9c0fe21bf7454436c7addfeeda7c1`.
- Construction seal: `6af2455b225613d7913dbba28316c7cecdb0852d18ae0d8504b2131fa7e21b80`.

After this accepted package, 218 north-plane cells remain: 147 wet, 56
gravity, and 15 non-air source-state cells. Those local residuals, N06, the
complete boundary, powered smoke control, and public operation remain
fail-closed and uncommissioned. Independent QA made no live call or world edit.
