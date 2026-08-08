# Town Expansion stairwell survey and build plan

Date: 2026-08-08
Issue: `ISSUE-001`
Survey snapshot: `data/worldsnap/world-edit-survey-20260808/region`
Snapshot SHA-256: `085fd8a1192d7a6e03004303bd84b7c31a476b17f165787f6e8a7e078e425421`

## Survey result

The snapshot was freshly pulled from the saved world after `save-all flush`.
It contains 12 region files and complete chunk coverage for the surveyed C01
core. The current route evidence uses the accepted as-built route manifest:

`docs/redevelopment/2026-07-28-town-expansion/town-expansion-accessibility-repair-as-built-route-manifest.json`

The active C01 routes pass on the fresh snapshot:

| Route | Result |
|---|---|
| `TE-ROUTE-C01-L1-ENTRY-GARAGE` | PASS |
| `TE-ROUTE-C01-MOUNTAIN-PORTAL-L1` | PASS |
| `TE-ROUTE-C01-PUBLIC-VERTICAL` | PASS; 85-cell bidirectional route; minimum headroom 3 |
| `TE-ROUTE-C01-OWNER-VERTICAL` | PASS; 90-cell bidirectional route; minimum headroom 3 |
| `TE-ROUTE-C01-SERVICE-BACKBONE` | PASS |

The manifest identity warning is expected: this is a newer survey snapshot than
the historical terminal snapshot bound into the manifest. The four unrelated
Data District route failures are coverage failures because their anchor chunks
are outside this 12-region survey, not C01 stair evidence.

The old report that the C01 portal route is missing is therefore stale. The
active recessed portal is present around `x=800..818, z=-140..-128`, and its
portal and vertical routes are walkable. This does not close `ISSUE-002`: the
eastward relocation, parking clearance, road connection, and sunken-entrance
owner acceptance remain unproven.

## Exact stairwell inventory

The following boxes were censused from the fresh snapshot. Counts include the
whole box and are intended as source guards for a later package, not as an
authorization to edit.

| Area | Box | Non-air | Stair blocks | Rails/lanterns |
|---|---|---:|---:|---|
| C01 public vertical | `834..844, 24..45, -51..-37` | 1,227 | 110 | none observed |
| C01 owner vertical | `840..850, -12..18, -52..-42` | 1,065 | 210 | none observed |
| C01 public lower/approach | `758..772, 23..50, -48..-38` | 1,573 | 148 | none observed |
| C01 owner lower/approach | `803..815, -15..20, -33..-23` | 2,381 | 32 | none observed |
| C01 service stair envelope | `875..888, 42..50, -35..-22` | 392 | 0 in box | none observed |

The current movement checks pass, but the visual complaint is not resolved by
movement alone. The inspected stair envelopes show no rails or lanterns in the
censused material lists, and the offline camera pass needs a deliberately
chosen set of approach, rise, landing, and destination cameras before it can
serve as owner-quality before/after evidence.

## Recommended build direction

Build a small C01 public-stair finish pilot first, then review it before
touching the owner stair or the other Town Expansion stairwells.

The pilot should be additive and narrowly guarded:

- preserve every existing stair, landing, route cell, block entity, and door;
- place only reviewed guard-edge and zoned-light blocks in exact air cells;
- keep the existing route at least three blocks of headroom and bidirectionally
  walkable;
- use a dark-industrial palette consistent with C01: iron-bar guard edges and
  sea-lantern light nodes, with no opaque ceiling or wall insertions;
- generate a complete exact inverse before execution;
- require source-state, entity-clearance, bidirectional normal-walk, lighting,
  and before/after camera gates.

This pilot is intentionally not a relocation, excavation, portal redesign, or
blanket stair rebuild. It changes no route geometry until a separate survey
proves that geometry is defective.

## Build gate

The exact proposal is now staged:

- Forward: `data/buildops/c01-public-stair-finish-pilot-2026-08-08.txt`
  (SHA-256 `21ff491870003d7eb84e34bffa8bd6f29b35e9150fbadfd7158a0ad8213334aa`).
- Rollback: `data/buildops/c01-public-stair-finish-pilot-2026-08-08.rollback.txt`
  (SHA-256 `d9d7d24a685f6bfdcf0b0314eaa117c1d92460594bf28a8437f51151558b16c7`).
- Forward source preflight: 4/4 exact guards pass in
  `data/world-review/c01-public-stair-finish-pilot-preflight-20260808.json`.
- Forward and rollback parser dry-runs both pass strict-noop conversion to four
  absolute `/fill` commands; neither uses WorldEdit.
- Execution: 4/4 groups changed with zero no-ops in
  `data/world-review/c01-public-stair-finish-pilot-execution-20260808.json`.
- Post snapshot: `data/worldsnap/c01-public-stair-finish-pilot-post-20260808/region`
  with SHA-256
  `f576089162638f1779f6d4b0cbfbc0e2a348a41af3b1a5f261e098a4f67e7f16`.
- Rollback post-state preflight: 4/4 exact guards pass in
  `data/world-review/c01-public-stair-finish-pilot-rollback-preflight-20260808.json`.
- Independent C01 route QA: all five C01 routes pass in both directions; the
  four failures in the full 22-route manifest are unrelated Data District
  anchors outside this snapshot's survey coverage.

The pilot is functionally verified, but visual acceptance remains open: the
offline renderer cameras used for the first pass were occluded and do not yet
provide owner-quality before/after images. If the pilot is rejected visually,
its inverse is the complete rollback and no broader stair package is generated.

## Owner stair lighting extension

The owner stair did not have a safe additive rail edge: its candidate edge
contains existing stairs in the lower flights and a reinforced-deepslate wall
on the opposite edge. Rather than alter that geometry, a three-node lighting
extension was installed in a clean side shaft:

- Forward: `data/buildops/c01-owner-stair-lighting-extension-2026-08-08.txt`
  (SHA-256 `2dca3df8443295e8e22d68a08d47a423e10f2517e6088ced7a1d68724fa3e0f9`).
- Rollback: `data/buildops/c01-owner-stair-lighting-extension-2026-08-08.rollback.txt`
  (SHA-256 `73d6c3a6f130a14863e3d59d3b73c9c3dab7497858659df300c2d2903ceaf47f`).
- Execution: 3/3 groups changed with zero no-ops.
- Post snapshot SHA-256:
  `6ed069ad6da2b858c69ca232318ba2df4d84586de9fffe95171090dba8b83b4c`.
- Rollback post-state preflight: 3/3 exact guards pass.
- All five C01 routes remain passing in both directions.

## Active portal threshold lighting

The active C01 portal already had six directional signs and a clear four-cell
air strip above the threshold. A fourth small lighting package was installed
without touching the signs, portal, or route cells:

- Forward: `data/buildops/c01-active-portal-threshold-lighting-2026-08-08.txt`
  (SHA-256 `1e7b43c4b8bddd4903f6349586ec85e4b1e6dffc8a4c2f897e87c55679d71b3f`).
- Rollback: `data/buildops/c01-active-portal-threshold-lighting-2026-08-08.rollback.txt`
  (SHA-256 `83ce75f904bb38f4cbe4cda943f504d5b7c48a92d6cbb2d4751b9d5799b47b2f`).
- Execution: 4/4 groups changed with zero no-ops.
- Post snapshot SHA-256:
  `1c2c0f01324fb329a498499d4d9c91b50087a86907305f7c0e1e48368f8043df`.
- Rollback post-state preflight: 4/4 exact guards pass.
- All five C01 routes remain passing in both directions.

## Public stair upper-landing lighting

The next reviewable micro-package added three sea-lantern nodes above the
surveyed upper landing, outside the route cells and without changing stair,
rail, wall, door, or entity geometry:

- Forward: `data/buildops/c01-public-stair-upper-landing-lighting-2026-08-08.txt`
  (SHA-256 `ae1e6ce406cb675abbe9e8346acf25f633500def4069981542016d5081a436d1`).
- Rollback: `data/buildops/c01-public-stair-upper-landing-lighting-2026-08-08.rollback.txt`
  (SHA-256 `56c3b60ba1b9c0ae5c36c1168b3e925e84b084f6bda0a4e1c03478d8fdd6aebc`).
- Execution: 3/3 groups changed with zero no-ops or failures.
- Post snapshot: `data/worldsnap/c01-public-stair-upper-landing-lighting-post-20260808/region`
  with SHA-256
  `f2696038ff74b50ce35ad5638b768b0a0b45fa4c6ab9a968219b0eb4ea05203f`.
- Rollback post-state preflight: 3/3 exact guards pass.
- All five C01 routes remain passing in both directions.

## Public L1 landing lighting

The L1 public landing provided a second safe lighting shelf: three plain-air
cells at `x=768..770, y=50, z=-43`, three blocks above the route and clear of
the landing supports. The package was additive and did not alter stairs,
route cells, doors, or entities:

- Forward: `data/buildops/c01-public-l1-landing-lighting-2026-08-08.txt`
  (SHA-256 `ef3cd7842630e44ff49bdcf1b187f4cf42570d604217d628b7fb9dfcc69ff455`).
- Rollback: `data/buildops/c01-public-l1-landing-lighting-2026-08-08.rollback.txt`
  (SHA-256 `e45fa9f9db533f1d9dc4b95f91db0ea07c049c6877ff4fa56bfb479555b410a3`).
- Forward source preflight: 3/3 exact guards pass.
- Forward and rollback strict-noop parser dry-runs: 3/3 each, with no
  WorldEdit conversion.
- Execution: 3/3 groups changed with zero no-ops or failures in
  `data/world-review/c01-public-l1-landing-lighting-execution-20260808.json`.
- Post snapshot: `data/worldsnap/c01-public-l1-landing-lighting-post-20260808/region`
  with SHA-256
  `c478796458bb5dcd76c7634c5d6754f6a8d0c0a6378c42b742323084696db7c3`.
- Rollback post-state preflight: 3/3 exact guards pass.
- Independent route QA: all five C01 routes pass in both directions. The
  report's seven non-C01 failures are the known anchors outside this nine-
  region survey coverage.
- C01 compiler regression: 3/3 tests pass.

## Visual acceptance update

The read-only camera preflight was rerun against the latest L1 landing
snapshot. It passed 165/165 scheduled cameras and 8/8 representative object
cameras, with zero rejected attempts:

- Report: `data/world-review/c01-public-l1-landing-camera-preflight-20260808.json`.
- Media directory: `data/exports/c01-public-l1-landing-camera-preflight-20260808`.
- This closes the prior occluded-camera finding for the current additive C01
  package chain. It does not authorize a geometry rebuild or ISSUE-002
  relocation.

`ISSUE-002` remains a separate design package. The current C01 route pass is
useful interface evidence, but it is not evidence that the bunker relocation,
parking, road, or sunken entrance was delivered.
