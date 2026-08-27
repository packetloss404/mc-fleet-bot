# Combined Zones R08N — North-Galleria Capped Retail Shells

Status: `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_AND_INDEPENDENTLY_SEALED`

R08N is a nine-package, exact, reversible architecture batch under canonical
owner `Z02-U1-CONCOURSE-MALL` and release node
`CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`. It lines the complete boundary of frozen
shells `EE-R-N01..N05`, `EE-R-N08`, and `EE-R-N10..N12` with
`minecraft:light_gray_concrete`, clears each connected interior void to air,
and retains the complete 12-cell entrance plane as a physical cap. Tenant
opening and fit-out remain unauthorized.

## Frozen source and identity

- Source post:
  `data/worldsnap-combined-zones-r09c-post-20260821T175500Z`
- Complete-save SHA-256:
  `43324de6f66408ccd54d04fd754b660f56bd93768747db9153dacd7fba4741c5`
- Terminal ledger:
  `data/world-review/combined-zones-r09c-live-20260821T175500Z/evidence-ledger.json`
- Terminal completed-release identity:
  `ac9a44c76a5dff561cb7e55c8b53890c729b26b28ab945903cb3db29b102ffaa`
- Canonical manifest:
  `data/buildops/combined-zones-r08-north-galleria-capped-retail-shells.release-manifest.json`
- Manifest payload identity:
  `67c8cc3edbb6b534932e9169b5f2126e74ba2405ae7ead635f88e2ef90d19778`
- Manifest full-file SHA-256:
  `a3aa07124982d48dab0463f68f9c02df4ef7a1b30c14b81c6474ec25f52d11b0`

The reusable compiler accepts repeated `--shell-id` values (or a comma-list
through `--shell-ids`) plus explicit `--basename`, `--release-id`, and
`--manifest-status`. Those options are regression-tested with a south shell;
they do not broaden this canonical north manifest.

## Exact scope

- Nine disjoint frozen prisms: 3,888 cells total; 432 per shell.
- Complete connected boundaries: 2,628 cells total; 292 per shell.
- Connected internal voids: 1,260 cells total; 140 per shell.
- Physically capped entrance planes: 108 cells total; 12 per shell.
- Guarded transitions: 3,878. N01 has 422 because ten interior cells are
  already air; each of the other eight packages has 432.
- Final desired census: 2,628 light-gray-concrete boundary cells and 1,260
  air interior cells.
- Full design union SHA-256:
  `0d303b5f35a5d52c51139395b1463d77f4953cdd091393b69a49438869d49a46`
- Operated union SHA-256:
  `167ba260735dd809e64fc2f8eef7760dc91e29145e55ccbb88cbd150297a3ab9`

Within each shell, the compiler emits the complete boundary top-down and then
the interior top-down. Its rollback is the exact line reversal. The nine
packages execute west-to-east and roll back east-to-west.

| Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| --- | ---: | --- | --- |
| `ee-r-n01-capped-shell` | 422 | `c38b1f8aa7c19d760a3864d0e9ab71d7269346978555c42d0168837fbcf65cdf` | `2365c61752e43b3854556cfe646a80425dc106d21a91aa15695da8bbc82e314a` |
| `ee-r-n02-capped-shell` | 432 | `10da688b9bc11c78edb5946bc26e77693f58c2d69664d2590b58c9a100dac74c` | `334dde821fe48a852347b72d3e1664cedd3194143621b408a00bec7e3993b4ba` |
| `ee-r-n03-capped-shell` | 432 | `ab72679a9f406091f9d105bfce2af2f8e32afe54032aa85ca09c8d979613d855` | `87fb868219ec0622905cc95b419170665f379673e1fc6e46ea78acb18927888f` |
| `ee-r-n04-capped-shell` | 432 | `f2882686e253c553a84109a36f3285725e2146db7f7756f3bc85583c19e97a7c` | `7eb282c147b664d70e4f7ac00a816aba3e3cf9ef87771b7b8a0b712f91b38764` |
| `ee-r-n05-capped-shell` | 432 | `e754243f4e738c04a84a13812210b0d151ee10df3b3152390c4884469292bcd8` | `8739a84b47d7d6a010e7d702226a26d3bd189a47808c6f034064880330ccded4` |
| `ee-r-n08-capped-shell` | 432 | `762bf9d6b99116ca17fd50e4cfbf463b2320b53a6259aa792abc7a19a4210217` | `253b60b8ac037aed7e706e708cbcff7535a2f51ea568f877444b6d81788b56dd` |
| `ee-r-n10-capped-shell` | 432 | `2564ed767dea267de0e85c36cd74bf7568b28a871c8c098171c74fa1d25f9cfa` | `5ff8e01d01b90e9b7c02866e58fcf6c3a95bc74c3d38ac7014fe2acb90fb154c` |
| `ee-r-n11-capped-shell` | 432 | `0f2e71b5cbae50955c9a928bda3ec2bf994b49239f68c418bb214610006974c0` | `625ead136df854a23120baeb971cf81d07b0eff76ba905f5aa8332e80b5f51f4` |
| `ee-r-n12-capped-shell` | 432 | `464fa17b399b3640dbcc97421e4d56cff57624ef574794990061dc108400df24` | `1b67bfd852f4bfb181421f515248b90d20e4eb1a16f683f701233e17698bddb0` |

## Isolation and interaction proof

The 3,888 target cells contain zero fluid or waterlogging, gravity blocks,
containers/control blocks, block entities, saved entities, protected relics,
future-line seals, or accepted-prior-release targets. The exact 4,428-cell
one-block interaction halo contains zero fluid and zero container/control
blocks.

Two gravel cells occur in the outer N10 halo at `(1799,53,46)` and
`(1799,53,47)`. Neither is face-adjacent to a target, both sit on unchanged
stone at Y=52, and neither its support nor the gravel is operated. This closes
the gravity dependency without absorbing unrelated terrain. The 972 floor
contact cells are also unchanged and contain no fluid, gravity, container, or
control state. Fourteen are air, which does not destabilize the non-gravity
concrete boundary under Minecraft block physics.

## Offline gates

- Focused compiler regression: 7/7 passed.
- Independent manifest QA:
  `data/world-review/combined-zones-r08-north-galleria-retail-shells-offline/manifest-qa.json`
  — PASS, 9/9 packages, 3,878 unique cells, zero cross-package overlap.
- Nine forward source preflights in the same evidence directory: PASS,
  3,878/3,878 exact source guards.
- Nine projected-post rollback preflights using all nine forward files as the
  exact logical overlay: PASS, 3,878/3,878 rollback guards and 34,902/34,902
  aggregate overlay transitions.
- Eighteen strict-noop parser dry-runs: PASS, 7,756 commands, zero WorldEdit
  leftovers.

## Executed post-release seal

The scoped wrapper subsequently executed all nine packages successfully. The
accepted evidence ledger is
`data/world-review/combined-zones-r08n-live-20260821T180151Z/evidence-ledger.json`
and the immutable post save is
`data/worldsnap-combined-zones-r08n-post-20260821T180151Z` with complete-save
SHA-256
`083a2ba58d70dfdae65b16c20b8b19c785bc7bb897fe39e054f1f8e06b37ac8c`.

Independent read-only QA is sealed at:

- `data/world-review/combined-zones-r08n-live-20260821T180151Z/r08n-post-release-qa.json`
- `data/world-review/combined-zones-r08n-live-20260821T180151Z/r08n-post-release-qa.md`
- QA payload SHA-256:
  `ebf20922db949c22581b04aea64cb44c48801b2b9b21ecba4c4db8d229c1d585`
- QA JSON full-file SHA-256:
  `9391cb70d419c677e303217b6082e69aa2ec21d552e220c1cb3cabeef57b11dd`

The seal binds 81/81 ledger evidence files and the exact 73-stage lifecycle.
It verifies 3,878/3,878 operated targets, all 3,888 final shell cells, nine
292/292 light-gray boundaries, nine connected 140/140 air interiors, and all
108 closed tenant-face cells with zero openings. All 972 floor contacts and
all 4,428 halo cells are unchanged; both retained gravel cells remain on
stone; undeclared drift is zero. Strict execution passed 3,878/3,878 with no
noop or failure, and reverse rollback guards pass 3,878/3,878 on the post
snapshot.

The independent seal made no RCON call, live call, service mutation, or world
edit. The live mutation recorded above belongs solely to the accepted scoped
wrapper transaction.
