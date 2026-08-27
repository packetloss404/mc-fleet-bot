# R08AG Empty Eight North-Smoke Source-State Column Completion

Date: 2026-08-22  
Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Status: **AS-BUILT / EXECUTED / POST-VERIFIED / REVERSIBLE / POST-QA ACCEPTED; FULL BOUNDARY NOT COMMISSIONED**

R08AG is the unique remaining dry, gravity-free source-state subgroup after
accepted R08AF. It replaces the seven exact cells at `x=1765`, `y=48..54`,
`z=50` with stone bricks. The source is six air cells and one ordinary stone
cell; the 30-cell interaction halo contains only stone and stone bricks.

- Geometry: one connected 1x7 full-height column.
- Fluids, gravity blocks, containers/controls, entities, block entities,
  relics, future seals, N06, and undeclared prior overlap: zero.
- The exact reverse rollback restores the top six air cells before restoring
  the bottom stone state.
- The projected residual is 161 cells: 105 wet-interaction and 56
  gravity-interaction cells. No source-state-only residual remains.
- Larger groups remain fail-closed: 63 wet cells have eight rollback-air cells
  directly below water; 28 gravity cells have four rollback-air cells directly
  below gravel; and the 35-cell wet group retains an unresolved operated
  level-one flow at `(1758,50,50)`.
- Manifest QA, 7/7 forward preflight, 7/7 projected inverse preflight, 14
  strict parser commands, block-entity clearance, the real wrapper
  `--print-plan`, focused regression, and backend build pass.

Canonical artifacts:

- `data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.release-manifest.json`
- `data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.ee-smoke-n-source-state-column-completion.forward.txt`
- `data/buildops/combined-zones-r08ag-empty-eight-north-smoke-source-state-column-completion.ee-smoke-n-source-state-column-completion.rollback.txt`
- `data/world-review/combined-zones-r08ag-north-smoke-source-state-column-completion-offline/`

Manifest payload:
`197ac7f5c7a7973996d87ab9196138bd2d4a1ed33b3871d0807cc87f6d22b553`.
Forward body:
`6bce1b0cb110c34ce22d08ad8c32a9b5084f20578f8697a86d02d5ceee246175`.
Rollback body:
`c34a4866bb780288ce2cd856f37f43a46bcce259394800fd46dc55f7f359c4d6`.

Executed ledger:
`data/world-review/combined-zones-r08ag-live-20260822T020533Z/evidence-ledger.json`.
The accepted post complete-save SHA-256 is
`8aae7db6c71a6add313c0a3efdce3e520eae8b2b109c132b6e8d582e345957f1`;
completed identity
`73cd13c4ce79e7faf83710d5e29fdafab2df557fd0a2d0cb8ba009ea8ad2fe30`.
Independent QA verifies 7/7 targets, all 30 halo cells, 1,184 prior R08 cells,
zero off-target or lifecycle drift, 17 stages/evidence, the 20-event journal,
and 7/7 inverse guards. QA payload:
`ebc7f98f7ec01056254809e182f74f4db82049b09aa923971d34f25aca54906c`;
seal: `22994178e53ef7b1dd442cdb00745d507ede0a592ef378581aa6073724d7e009`.
The accepted residual is exactly 161 cells: 105 wet and 56 gravity. Those
groups are local non-durable physics exceptions, not a Master Plan hold.
Independent QA made no live call or world edit.
