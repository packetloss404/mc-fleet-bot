# R08A · Empty Eight EE-PF-03 enclosed platform fit-out

Status: **AS-BUILT — EXECUTED, POST-VERIFIED, AND REVERSIBLE**

Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`  
Package release: `CZ-R08A-EE-PF-03-ENCLOSED-FITOUT`  
MVP scope: `true`

## What this package builds

R08A is the first independently executable Phase 4 package. It uses the exact
frozen `EE-PF-03` geometry rather than inventing a new terminal layout:

- platform floor: `x=1652…1752`, `y=41`, `z=82…88`;
- four-block-clear room: `y=42…45` inside the same X/Z footprint;
- enclosed ceiling: `y=46`, retaining the seven exact R02 sea-lantern points;
- full 202-cell fail-closed platform barrier at `z=82`, including four exact
  three-wide, two-high static gate caps;
- the two existing R02 polished-blackstone carrier bands remain untouched.

The palette is polished diorite, polished deepslate, smooth stone, polished
blackstone, and the existing sea lanterns. The enclosure package executes
before interior clearance so the chamber is dry and supported before any
excavation. Rollback restores the interior first and removes the enclosure
last.

This is fit-out, not transport commissioning. Track 3 remains uncommissioned,
no powered gate mechanism is installed, and all eight future-line seals remain
untouched. The fit-out stops at `x=1752`; the deferred seals are at `x=1872`,
an exact 120-block separation.

## Exact compiled result

| Package | Guarded operations | Forward SHA-256 | Rollback SHA-256 |
|---|---:|---|---|
| enclosure and finish | 1,609 | `8d36aa82a9603ba2880371962d9c5312e4304320a0e898f72194c8bc7af1e508` | `d31010f6ca656c39fbcb271ebccd11cb9ec28d41120d7f0178a554a74789445d` |
| interior clearance | 2,353 | `abfa8b6a4736abf46e55b4cc06f5a4fb4d18b3f8b87bb04d8a4bb52628262de4` | `3d7a38cb397bba94ff63db6bab1cb0da04a2eb6031ff8473751878591c58f68f` |
| **total** | **3,962** | — | — |

The original compile source was the R07A post complete save with identity
`398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0`.
Its exact platform halo contains zero fluid cells, containers/control blocks,
block entities, saved movable entities, or protected relic intersections.
The package intentionally supersedes 178 R02 reservation-air cells with the
retained barrier and 24 R02 gate-bay-air cells with static caps; there are zero
undeclared prior-release overlaps.

Offline evidence currently passes:

- exact manifest QA: 2/2 packages and 3,962 unique targets;
- enclosure source preflight: 1,609/1,609;
- clearance source preflight: 2,353/2,353;
- ordered projected forward/rollback preflights: 2,353/2,353 clearance and
  1,609/1,609 enclosure, with the complete declared overlay chain;
- block-entity audit: zero blockers;
- all four strict-noop forward/rollback parser dry-runs: PASS.

The generic scoped runner accepts the manifest and its `--print-plan` output
contains the full preparation kernel, including projected rollback preflight,
block-entity clearance, and live-entity clearance.

The deterministic compiler is
`scripts/compile_combined_zones_r08_empty_eight_fitout.mjs`. The manifest is
`data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json`.
Offline gate evidence is in
`data/world-review/combined-zones-r08-platform-03-preflight/`.

## Live execution and post-release acceptance

R08A executed on 2026-08-21 through the scoped atomic release runner. The
terminal [execution evidence ledger](../../../data/world-review/combined-zones-r08a-live-20260821T161558Z/evidence-ledger.json)
records `EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`; every one of its 24 stages is
`PASS`. The live run changed all 1,609 enclosure groups and all 2,353 clearance
groups with zero failures and zero strict-noop commands.

The source complete-save identity is
`f87f2b622efa5c21b23952181ff62a5694b8ddfeabac583e765e633638f9a10d`.
The immutable [post complete save](../../../data/worldsnap-combined-zones-r08a-post-20260821T161558Z/)
has identity
`ef2d631992a5e1424fb0c171c79d31536faae1d11c7894c127ef1329d2e4eee7`;
its region snapshot identity is
`59900503af2f44807dbd310c7f169aacea0f47780286610feedb056321cbc1eb`.
The release is bound to manifest identity
`f02046ae2e7ea6727ae5aaa2bf2429078544a86d36b00aafb22a26a699374362`
and execution binding
`f158875a94c660101cae13e1e0e266c2a90374b48c4b217cafa6d90ec3f41aac`.

The independent read-only [post-release QA seal](../../../data/world-review/combined-zones-r08a-live-20260821T161558Z/r08a-post-release-qa.md)
is `PASS_R08A_EMPTY_EIGHT_PLATFORM_03_POST_RELEASE_ACCEPTED`, with payload
SHA-256
`57fd810c0a1ebf378e5acb656965be8ae5b3f8546512c54e975dd55c8b1a43b7`.
It verifies:

- 3,962/3,962 exact operated target states;
- the exact 4,242-cell chamber and 2,432/2,432 air-clear interior as one
  connected component;
- 194/194 preserved polished-blackstone carrier cells and 7/7 preserved sea
  lanterns;
- the complete 202/202 fail-closed barrier, comprising 178 retained
  polished-blackstone cells and 24 polished-deepslate static gate caps;
- 3,962/3,962 rollback guards against the immutable post snapshot, including
  the declared reverse-order clearance overlay for enclosure rollback.

The machine-readable QA artifact is
[r08a-post-release-qa.json](../../../data/world-review/combined-zones-r08a-live-20260821T161558Z/r08a-post-release-qa.json).

## R08–R12 active-scope inventory from the accepted R07A post state

| Node | Current executable disposition | Concrete next work |
|---|---|---|
| R08 Empty Eight fit-out | **R08A is as-built, post-verified, and reversible.** EE-PF-03 was chosen because its exact chamber plus one-cell halo is dry. EE-PF-08 is also a dry follow-on candidate. EE-PF-01, 04, 05, 06, and 07 contain exact local fluid cells; EE-PF-02 has seven lava cells immediately outside its north edge. | Compile EE-PF-08 from the accepted R08A post state. Give wet platforms exact independent liners instead of turning them into a global hold. |
| R09 public-core fit-out | **Eligible by dependencies; no R09 guarded compiler exists yet.** R03/R04 shells and R06 support are materially as-built. | Split Houston, pedestrian tunnels, public shaft, and SubTropolis into exact disjoint fit-out packages. |
| R10 secure/summit fit-out | **Partly eligible.** Contact/Cheyenne fit-out can compile from R03/R04; summit fit-out waits only on the exact remaining R07 summit framework it consumes. | Compile secure-core fit-out independently; keep summit dependency local. |
| R11 C1 multimodal corridor | **Independent scope eligible after R00.** Its exact corridor setout exists, but there is no current R11 guarded release compiler. | Compile road/walk/rail-reservation subpackages against a fresh snapshot and localize the C01 interface checks. |
| R12 internal transport commissioning | **Dependency-bound, not globally blocked.** B09 technical design tooling exists, while terminal, shaft, internal rail, service rail, funicular, and return-road operation states still need executable packages and functional tests. | Commission each completed system separately; continue to omit C2, C3, and all eight Empty Eight future-line openings. |

## Execution boundary

R08A completed the scoped execution boundary: fresh same-invocation source
capture and deterministic recompile, exact source and projected rollback
preflights, block-entity and live-entity clearance, strict-noop journaled
execution, a distinct immutable post save, and reverse-order rollback guard
proof. The post-release QA script and artifacts are read-only and performed no
live RCON call, service mutation, or world edit. Any follow-on Empty Eight
package still requires its own fresh source capture and scoped hard-safety
kernel.
