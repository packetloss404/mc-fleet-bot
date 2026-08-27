# Fresh frontier research and design packet — 2026-08-27

**For:** MiniMax M3, continuing the Master Plan build loop.

This packet records the completed current research pass. It binds each decision
to the same 130-member immutable capture, links the maps needed to understand
the three immediate frontiers, and separates a selected design from a physical
release. It is not RCON authority and it does not claim that the Master Plan,
a district, C01, a rail line, or a portal is complete.

## Immutable research baseline

| Field | Value |
|---|---|
| Snapshot | `data/worldsnap-masterplan-frontier-refresh-20260827T053500Z` |
| Capture ID | `combined-zones-7100adbdd19843dfba53afd30d0956e9` |
| Required members | 130 |
| Complete-save SHA-256 | `22de30528859710d699ac3bbce1da8e10c606b844b228b922a48a0ee52999fce` |
| Intake | `PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE` |
| Intake report | `data/world-review/masterplan-frontier-refresh-20260827T053500Z/intake.json` |

Every future mutation must take a new complete source capture immediately
before compilation and another after execution. This capture is the current
research baseline only.

```text
                       fresh master-plan frontier
                                      |
          +---------------------------+---------------------------+
          |                           |                           |
      MP01 Cheyenne               MP11 C01                     AG-4 exterior
      portal interface            main switchback              rail/promenade gap
          |                           |                           |
  rational source anchor       geometry + compiler audit      fluid trace escapes
  but no accepted build cells  finds one guard/tread clash    three bounded faces
          |                           |                           |
  accept interface first       resolve design, then compile   expand survey only
```

## 1. C01 main-switchback and retained Return-02

### What is established

The design establishes a 30-station, 5-clear-wide × 5-clear-high main
switchback and keeps the independently verified Return-02 recovery route
continuous. It selects **no** current protected-route retirement, closure,
gate, or connection.

| Item | Exact fact |
|---|---|
| Design contract | `MP11-C01-MAIN-SWITCHBACK-TRANSITION-RETURN02-PRESERVATION-05` |
| Main design records | 828 |
| Intended guard records | 100 two-high polished-deepslate-wall records |
| Upper landing | 5×5 accepted face at `(839,43,-47)`; 30 rebound source cells, zero mismatches |
| Lower landing | 5×5 accepted face at `(837,25,-54)`; 30 rebound source cells, zero mismatches |
| Endcaps | five east-facing stairs at upper end; five west-facing stairs at lower end |
| Retained Return-02 inventory | 768 canonical cells, zero fresh-source mismatches |
| Main target / Return-02 target intersection | zero |
| Fluids, gravity, block entities, saved entities in selected design geometry | zero |

![C01 main-switchback transition map](../../../data/world-review/mp11-c01-main-switchback-transition-return02-preservation-05-frontier-refresh-20260827T053500Z/mp11-c01-main-switchback-transition-return02-preservation-05.svg)

Regenerate the read-only map and contract when its evidence directory is not
present:

```bash
node scripts/design_mp11_c01_main_switchback_transition_return02_preservation_05.mjs \
  --snapshot data/worldsnap-masterplan-frontier-refresh-20260827T053500Z \
  --out data/world-review/mp11-c01-main-switchback-transition-return02-preservation-05-frontier-refresh-20260827T053500Z
```

### Collision correction and offline guarded package

The initial compiler correctly rejected two incompatible records before it
created operations: guard walls at `(846,35,-48)` and `(846,35,-49)` were also
main stair treads. The design correction moves only those two guard bottoms
one block outboard to `(845,35,-48)` and `(845,35,-49)`. Rebinding verifies all
100 guards are now outside the clear envelope, all 828 main targets, both
endpoint interfaces, Return-02, and the fresh-source hazards.

The reconciled compiler now emits an **offline-only guarded package**, still
with `mutationAuthority: false`:

| Package field | Exact result |
|---|---|
| Package ID | `MP11-C01-MAIN-SWITCHBACK-TRANSITION-01` |
| Package status | `OFFLINE_COMPILED_GUARDED_RELEASE_REQUIRES_FRESH_LIVE_KERNEL` |
| Canonical target union | 928 cells (828 main + 100 guards) |
| Changed cells on research source | 387 |
| Forward commands | 387, strictly ordered as main tread/landing → clearance → guard |
| Rollback commands | 387, exact reverse/inverse |
| Main/Return-02 intersection | zero |
| Projected route QA | `PASS_PROJECTED_MAIN_AND_RETURN02_TWO_WAY_NORMAL_WALK` |
| Live/RCON/world action | none |

The package is at
`data/buildops/mp11-c01-main-switchback-transition-01-frontier-refresh-20260827T053500Z-reconciled/`.
Its forward and rollback files are deliberately source-bound to this capture;
they must not be replayed against a later world state.

The compiler and test retain hard checks for capture integrity, Return-02
identity, endpoint preservation, target/halo containers and block entities,
saved/live-entity gates, exact forward/inverse structure, and projected
two-way route QA.

```bash
npx vitest run test/build/mp11C01MainSwitchbackTransitionCompiler.test.ts
```

### Executed live kernel and exact as-built boundary

The full live kernel now passes for this exact scope: a fresh capture/rebind,
source preflight, strict forward and rollback parsers, projected rollback,
block-entity and live-entity clearance, journaled `387/387` forward execution,
fresh 130-member post capture, rollback-poststate preflight, and independent
two-route immutable QA. The as-built evidence is [the release note](../11-town-expansion-r1/MP11-C01-MAIN-SWITCHBACK-TRANSITION-01-RELEASE.md).

This does not make the research-source package reusable. A later change needs
a new source and complete kernel. Current protected-route retirement or
connection remains a separate bilateral contract.

## 2. AG-4 west gap: finite survey, non-finite containment

The fresh fluid trace removes the prior cap ambiguity. It found a connected wet
component of **196,072 cells** within X `250..397`, Y `13..80`, Z `-858..-716`.
The 250,000-cell measurement cap was not reached. The component genuinely
escapes the bounded volume through `-X`, `-Z`, and `+Z`.

| Finding | Result |
|---|---|
| Connected wet cells | 196,072 |
| Cap reached | no |
| Escape faces | `-X`, `-Z`, `+Z` |
| Saved-item exclusion | preserved |
| Operations / RCON / world mutation | zero |
| Eligible liner, plug, support, receiver, rail, or promenade compiler | none |

![AG-4 west-gap measurement map](../../../data/world-review/ag4-gap-west-closure-measurement-06-masterplan-frontier-refresh-20260827T053500Z/ag4-gap-west-closure-measurement-06.svg)

![AG-4 connected-fluid trace map](../../../data/world-review/ag4-gap-west-closure-trace-06-masterplan-frontier-refresh-20260827T053500Z/ag4-gap-west-closure-trace-06.svg)

Recreate the research artifacts with:

```bash
node scripts/plan_ag4_gap_west_closure_measurement_06.mjs \
  --snapshot data/worldsnap-masterplan-frontier-refresh-20260827T053500Z \
  --out data/world-review/ag4-gap-west-closure-measurement-06-masterplan-frontier-refresh-20260827T053500Z
node scripts/trace_ag4_gap_west_closure_measurement_06.mjs \
  --snapshot data/worldsnap-masterplan-frontier-refresh-20260827T053500Z \
  --out data/world-review/ag4-gap-west-closure-trace-06-masterplan-frontier-refresh-20260827T053500Z
```

The only allowed next action is another read-only source-bound survey expansion
through the three evidenced escape faces. Do not automatically expand other
faces or use the adjacent dry `x=352..367` segment as proof of a crossing. No
physical package exists until an exact finite boundary, owner, receiver or
overflow behavior, container/entity treatment, forward inverse, and rollback
proof all exist.

## 3. MP01 Cheyenne outer portal: transform resolved, build cells denied

The Phase-1 vertical calculation is exact:

```text
local Y 200 → 72 + (29 / 100 × 200) = 130
local (0,200,-420) → world horizontal (2048,-748), source probe Y 130
```

The observed block at `(2048,130,-748)` is air. This is a single source probe,
not a target, support, marker, route node, accepted terrain point, or opening.
The controlling authority remains `activeForBuild: false`.

![MP01 vertical-resolution map](../../../data/world-review/mp01-outer-portal-vertical-contract-resolution-02-masterplan-frontier-refresh-20260827T053500Z/mp01-outer-portal-vertical-contract-resolution-map.svg)

```bash
node scripts/resolve_mp01_outer_portal_vertical_contract_02.mjs \
  --snapshot data/worldsnap-masterplan-frontier-refresh-20260827T053500Z \
  --out data/world-review/mp01-outer-portal-vertical-contract-resolution-02-masterplan-frontier-refresh-20260827T053500Z
```

Before a compiler exists, accept exactly one of the still-conflicting portal
interfaces (6×6/four-deep checkpoint versus three-thick 6×12 door/airlock),
activate the build in the authority record, name both interface owners, and
define exact approach/internal handoff faces, normal-walk recovery on both
sides, access classification, full target/halo states, and an inverse. The
rational probe cannot be rounded or expanded into construction geometry.

## Priority, evidence, and stop rules

| Priority | Scope | Next permitted work | Hard stop |
|---|---|---|---|
| 1 | C01 | preserve the as-built main and Return-02; design any endpoint, opening, or protected-route transition as a separate bilateral package | source/Return-02 drift, protected/halo/entity hazard, or an attempt to treat this bounded build as a public opening |
| 2 | AG-4 | exact three-face survey expansion | wet component remains unbounded/cap-touching, exclusion conflict, or no finite receiver/rollback design |
| 3 | MP01 | accept one owner-bound portal cross-section and endpoints | inactive authority, conflicting interface, or inferred non-anchor target cell |

Focused read-only regressions for this packet:

```bash
npx vitest run \
  test/build/mp11C01MainSwitchbackTransitionReturn02Preservation05.test.ts \
  test/build/mp11C01MainSwitchbackTransitionCompiler.test.ts \
  test/build/ag4GapWestClosureMeasurement06.test.ts \
  test/build/ag4GapWestClosureTrace06.test.ts \
  test/build/mp01OuterPortalPlacementInterfaceDecision.test.ts \
  test/build/mp01OuterPortalVerticalContractResolution.test.ts
```

Passing research tests are proof that the decision packet is internally
consistent or fails closed as designed; they are not physical-release or
commissioning evidence.
