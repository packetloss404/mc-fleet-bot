# Ravensreach–MainStreet Post-Release Commute Repair

Status: **PASS — OFFLINE ROUTE ONLY; LIVE GATES PENDING**

This repair is read-only with respect to Minecraft. It reads immutable Anvil
snapshots and local configuration/database evidence. It did not connect a bot,
write blocks, change the live configuration, start a service, or alter either
database.

## Bound Evidence

- Accepted post-release snapshot:
  `1f036e48a82ccd5061e34686b049700e861b7a3bc99f69bd03ee3b1c1b2e463a`
- Diagnostic pre-release snapshot:
  `d749007d669b1f16a9d1a75dafd55d3bb92cbcc61ca49027f7337198da65865f`
- Canonical Town Expansion forward package:
  `1a10954b1ae6ae702dcc01cd92d39adbb3820e3feff5461f3caa1283a578b896`
- Offline exact route:
  540 ordered cells, SHA-256
  `9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701`
- Routine contract: 49 checkpoints and 48 bounded legs.
- Directional proof: all 48 forward and all 48 reverse legs pass.
- Movement limits: cardinal movement, adjacent elevation change at most one
  block, no swimming, digging, towering, parkour, or closed-door traversal.

## Why the Former Route Failed

Town Expansion occupied or changed four former civic-block checkpoint feet
positions. Those four invalid checkpoints caused twelve directional segment
failures because a blocked point is the prior segment's goal and the following
segment's start.

| Former feet coordinate | Post-release feet | Head | Support | Standable |
| --- | --- | --- | --- | --- |
| `-110,69,-317` | air | air | stone bricks | yes |
| `-94,69,-305` | stone bricks | air | dirt | no |
| `-74,69,-294` | stone bricks | air | grass block | no |
| `-63,69,-279` | cut sandstone | air | grass block | no |
| `-63,69,-261` | air | air | grass block | yes |
| `-81,69,-249` | calcite | calcite | calcite | no |
| `-81,65,-219` | air | air | polished andesite | yes |

The complete six forward and six reverse failure records, including
`START_NOT_STANDABLE` and `GOAL_NOT_STANDABLE`, are persisted under
`accepted.supersededRouteDiagnosis` in the JSON survey.

## Repaired Alignment

The replacement leaves Ravensreach at `-111,69,-332`, follows the new
civic/service perimeter east to `-57,70,-310`, descends by normal one-block
grades along `x=-57`, joins Service Cross at `-82,65,-219`, continues on West
Lane, uses the reviewed grade doglegs around `z=0`, and terminates at the
MainStreet rear staff staging point `-82,65,90`.

The accepted route has:

- zero exact-path water, lava, fire, or deadly-block hazards;
- zero gravity-block supports;
- zero nearby block entities;
- zero completed-building bounds intersections;
- zero mining-protected-zone intersections;
- minimum four clear vertical blocks, versus two required; and
- maximum adjacent elevation change of one block in both directions.

The physical-width audit found four chokes:

| Feet coordinate | Contiguous standable width |
| --- | ---: |
| `-82,65,-206` | 2 |
| `-82,66,-158` | 2 |
| `-82,65,-110` | 2 |
| `-79,65,-79` | 1 |

One block is enough for the offline single-agent normal-walk model, so these
cells do not invalidate the offline path. They are not treated as a desirable
finished civic standard and are why this report does not authorize resident
activation. The post-release map and direct perspective spot checks show the
route using the civic perimeter, sidewalk/service lane, West Lane, and the
designed grade stairs rather than passing through a completed building.

## Outputs

| Artifact | SHA-256 |
| --- | --- |
| `data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json` | `40930cbbcd5d93d74848d60f86749b90c12ebf5d7487ed184851642bb3666bf4` |
| `data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json` | `845b3a721f7128d19085fc409146a2b869afe50ac894601db65f497c0f22ba92` |
| `data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png` | `ad1c3b8d80996a6c19220e56d3965b92b74b86be1c0bdb38947ad6385d8242e8` |
| `data/world-review/town-expansion-r1-citizen-route-qa-manifest-proposal-20260728.json` | `b0cbe4e2ef79e5fc54e23545cd642c56f634a981043233422aafa4a953c3ef15` |

The route-QA manifest is deliberately labeled
`PROPOSED_NOT_LIVE_VERIFIED` and
`completeForTownExpansionAcceptance: false`. It covers only this citizen
commute. Final Town Expansion route acceptance still needs representative
routes for the bunker, civic/guild/library, Westlight, data-center/Concord, and
observatory/owner scopes.

## Tests

The focused citizen regression run passed 49 of 49 tests across nine files:

```text
test/scripts/surveyCitizenCrossCityRoute.test.ts
test/control/CivicMobility.test.ts
test/town/ResidentIdentity.test.ts
test/voyager/CitizenSandboxApis.test.ts
test/voyager/CivicShiftCode.test.ts
test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts
test/voyager/BlackboardManager.roleDispatch.test.ts
test/worker/WorkerGeneration.test.ts
test/config.schema.test.ts
```

`node --check scripts/survey_citizen_cross_city_route.mjs` also passed.

After activation tooling was rebound, the combined citizen/activation
regression passed 65 of 65 tests across eleven files. The focused route,
activation, and observer set passed 22 of 22 tests, and `npm run build` passed.

## Gates Still Required

1. Take a fresh same-moment saved-world snapshot immediately before activation.
2. Rerun the complete offline survey and require all forward and reverse legs
   to pass with the same no-dig/no-parkour policy.
3. Run a short-lived instrument over every checkpoint in both directions while
   recording movement controls and failures.
4. Review the four narrow cells, especially the one-wide point at
   `-79,65,-79`.
5. Only after those gates pass, atomically apply the five-bot mobility and
   civic-shift configuration and observe staggered departures and returns.

## Activation Tooling Rebind

The activation, live-walk, and post-restart observer tools now share the
fail-closed contract in `scripts/lib/citizen-route-contract.mjs`. The contract
rejects any drift in the immutable post snapshot, exact-path hash or cell
count, 49 checkpoints, 48 forward/reverse segments, acceptance class,
headroom, movement policy, hazard/block-entity/protection counters, or the four
declared width chokes. The diagnostic pre-release snapshot is explicitly
required to differ; it is not an activation source.

Safe pre-activation checks while the service is stopped:

```text
node scripts/apply_citizen_cross_city_route.mjs --phase corridor --dry-run
node scripts/run_citizen_route_live_walk.mjs --contract-check
```

Both checks passed without reading or mutating the live world. The corridor
preview reports 49 checkpoints, 540 exact cells, four-block minimum headroom,
and all four width chokes. Hash-before/hash-after regression coverage proves
the dry-run leaves `config.yml`, `town.db`, `blackboard.json`, the route
survey, and the proposal byte-identical.

The `shifts` phase remains separately gated. It accepts only a matching
`PASS_BIDIRECTIONAL` audit with:

- the exact post snapshot, route hash, and acceptance class;
- all 49 forward and all 49 reverse checkpoint receipts;
- identical pre/post protected-dig counts;
- no pre-walk or post-walk security incident;
- the exact four-cell width-choke disclosure; and
- an exact passing staging trip.

An offline contract check or corridor dry-run cannot satisfy that live gate.
