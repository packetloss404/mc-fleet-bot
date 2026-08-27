# Combined Zones R08U — Empty Eight Internal Vent Caps

Status: `AS_BUILT_EXECUTED_POST_VERIFIED_REVERSIBLE_POST_QA_ACCEPTED`

R08U closes the four exact 3×3 internal compartment interfaces in the
selected `VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS` alternative. All 36 cells
become polished deepslate, the Empty Eight palette's default-closed
future-interface cap. The four matching exterior outlet caps are already 36/36
polished-deepslate cells and remain untouched. No riser excavation, exterior
opening, ventilation mechanism, or operational commissioning is authorized.

## Selection and source

- Source: `data/worldsnap-combined-zones-r08t-post-20260821T194152Z`
- Complete-save SHA-256:
  `fcde819dd413b3ec9920d56c81c797d56a92b7f66c0f4216cdbcad23451adbec`
- Source completed-release identity:
  `0ad2b587ea12f84e1490ce7b32d4a2946e9c593544d05994e9b6dd476630ed8f`
- Internal-cap union: 36 cells; coordinate-set SHA-256
  `14993e347856c00cd95a2de0fb5490141fa93a994ff3466fcc0b59e310a6aaee`.
- Exact source census: 26 stone, five andesite, and one each of air,
  copper ore, diorite, granite, and gravel.
- Retained unexcavated riser reservations: 900 cells.

The complementary north smoke boundary is not emitted. Its exact plane has
six flowing-water targets, and four mandatory wall cells are face-adjacent to
the unsupported N06 gravel exception. A wall update could destroy those exact
retained states, so that local scope remains fail-closed. The eight 202-cell
platform-barrier planes are already materially closed or contain an accepted
interface overlap. The 36-cell internal vent-cap delta is therefore the
largest useful selected, disjoint, incomplete static-cap construction set;
the next comparable exact candidates contain 35 fire/service cap cells and
24 local drainage cap cells.

## Ordered reversible packages

| Order | Package | Commands | Forward body SHA-256 | Rollback body SHA-256 |
| ---: | --- | ---: | --- | --- |
| 1 | `ee-vent-nw-gravity-safe-internal-cap` | 1 | `f1e7542cd77a61f9e3fe5cde57bc898af51bb89c439f2d15dfe3e267b34b9b7d` | `8297b5771a56c69848fb93e05c3c934ad7fe75ddcdc2c1c483a1a6089e3aa06c` |
| 2 | `ee-vent-four-internal-compartment-caps` | 35 | `f3ce396db21e7f7c3825a53ac8b1da3b0c11bd3aabb8d40f18814cd7a9405ac4` | `e68a0cb9eac3e84d52b46c524017e93230b66ec0f0d57c9936066265b6dcccb2` |

The first package replaces the sole target gravel at `(1643,54,49)`. Its
source gravity chain contains three gravel cells and terminates on andesite at
`(1643,51,49)`; the two lower gravel cells remain untouched. The remaining 35
static transitions then close the four internal planes. Rollback restores
ordinary geology first and the exact supported gravel state last.

## Isolation proof

- Target fluids and container/control states: zero.
- Target gravity: one, with complete durable source and rollback support.
- Face halo: 120 cells, zero fluid and container/control states.
- Retained halo gravel: four cells, all with durable unaffected support
  closures.
- Block entities, saved entities, protected relics, future line seals, R08T,
  and N06 interactions: zero.
- Forty-two accepted prior manifests checked; target overlaps: zero.
- Exterior caps: 36/36 already exact and unchanged.

## Offline acceptance

- Manifest QA: 2/2 packages PASS; 36 unique targets; zero package overlap.
- Ordered forward preflight: 1/1 then 35/35 PASS.
- Projected reverse rollback: 35/35 then 1/1 PASS.
- Four strict-noop parser dry-runs: 72 commands, zero WorldEdit leftovers.
- Block-entity audit: 36 operations, zero blockers.
- Focused compiler regression: 6/6 PASS, including byte-for-byte independence
  from `--out-dir` for all five canonical artifacts.
- Offline evidence:
  `data/world-review/combined-zones-r08u-internal-vent-caps-offline`.

Canonical manifest:
`data/buildops/combined-zones-r08u-empty-eight-internal-vent-caps.release-manifest.json`.
Manifest payload identity:
`066880c728aa2211667833086a58647f27fdc86cb991e5cffce760e62a178863`.
Manifest full-file SHA-256:
`4dbd4f859d8715b91c30aea4b91acf001185a898c16126317279c094b9e00bd1`.

## Executed release and independent seal

The guarded wrapper executed R08U as two ordered packages with 36/36 successful
strict commands, zero failures, zero no-ops, and no WorldEdit leftovers. Both
reverse rollback post-state preflights passed 36/36 guards against the immutable
post save.

- Evidence ledger:
  `data/world-review/combined-zones-r08u-live-20260821T201019Z/evidence-ledger.json`
- Ledger full-file SHA-256:
  `72293cd10dce462b5565b837fd10f36c883b00ede570e36da9f33dfb1b5b0456`
- Source complete-save SHA-256:
  `c63d2af4c4dc51fc34dfcf8be22d39c63ffc0adf1d7f2c4e7c2617650a1e2682`
- Post snapshot: `data/worldsnap-combined-zones-r08u-post-20260821T201019Z`
- Post complete-save SHA-256:
  `6a1c3c12b900f3e646b4930c282ff9da81f213b8b5f49dbfd73233536c0b2f59`
- Post region SHA-256:
  `dd4e62a6f74c5ce8427313a8fd1a470994926fb1270b3e34170ead06f4026217`
- Source-bound release identity:
  `bfa0c6063ca33fae960b6cb966611d4d34038ded44e597e46b6c78839cc981d0`
- Execution binding:
  `67d89065580399fed6102568eca3ea8695203cf36a685af5bc9411bc482e80c2`
- Completed release identity:
  `a1e608b0a3a52da11a65f6d87f20f39d292f2ef801bdab3a25fb39f26885ab91`

Independent read-only QA verifies all 36 exact final target states, the ordered
gravel inverse and durable support graph, all four retained halo-gravel chains,
all 72 closed passive cap cells, 900 unchanged unexcavated riser cells, the
120-cell unchanged interaction halo, the complete R08T boundary, all 23 prior
retail shells, and the isolated N06 exception with zero undeclared drift.

- [Post-release QA](../../../data/world-review/combined-zones-r08u-live-20260821T201019Z/r08u-post-release-qa.json)
  — payload SHA-256
  `e07bd06b0d93156c8997aace0ec4c7bf600476899fab1410f3046880ca5f5b21`
- [Eight-plane passive-cap commissioning seal](../../../data/world-review/combined-zones-r08u-live-20260821T201019Z/r08u-ventilation-passive-cap-commissioning-seal.json)
  — seal SHA-256
  `e5f89fc58fa6cc10f0c62791fe834bcd80858f67f78ec4edeac7a06608764d28`

This commissions only the closed passive interfaces. The four risers remain
unexcavated, all exterior outlets remain closed, and no powered or operational
ventilation system is commissioned. The independent QA made no live call,
RCON call, service mutation, or world edit.
