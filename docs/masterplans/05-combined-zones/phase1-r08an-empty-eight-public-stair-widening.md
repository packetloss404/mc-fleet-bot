# Combined Zones R08AN — Empty Eight public stair widening

Status: **COMPILED FROM ACCEPTED R08AM POST — PREPARE-MODE PASS — AWAITING FRESH EXECUTION KERNEL**

Release node: `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT` · Owner: `Z02-U1-CONCOURSE-MALL`

## What this package does

R08AN widens the two accepted one-wide PF08 gallery stairs — the only public
stairs feeding Empty Eight's south public retail gallery — from one block wide
to **three-wide public-grade primary stairs** per the source-bound circulation
review ([CIRCULATION-REVIEW-R08AM-2026-08-22.md](CIRCULATION-REVIEW-R08AM-2026-08-22.md)).

Each stair is rebuilt as a three-wide flight (center tread plus both side
columns) with:

- three clear blocks of width (`x=1727..1729` west, `x=1751..1753` east);
- three clear headroom blocks above every tread;
- level 3×3 landings at the upper end (`y=49`, `z=144..146`);
- exact-state `REPL` guards against the accepted R08AM post snapshot.

The stair columns replace the R08AL-built `stone_bricks` side-containment
walls and `polished_deepslate` skirt cells inside the exact design cores. The
center tread columns (`x=1728` and `x=1752`) already carry
`polished_andesite_stairs` and are preserved as-is where their source state
already matches the desired state.

## Compile result

| | West stair | East stair |
|---|---|---|
| Center column | `x=1728` | `x=1752` |
| Widened core | `x=1727..1729` | `x=1751..1753` |
| Rise | 8 treads, `y=41..48` | 8 treads, `y=41..48` |
| Descent | `z=153 → 146` | `z=153 → 146` |
| Width | 3 clear blocks | 3 clear blocks |
| Headroom | 3 clear blocks | 3 clear blocks |
| Landings | 3×3 at `y=49` | 3×3 at `y=49` |

Manifest identity: `a57a2f41e8a05d18c2a033766b4d2e5c924b90c650f751ad40b2eda375bcd0f7`

## Prepare-mode evidence (all PASS)

| Gate | Result |
|---|---|
| Source intake (`PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE`) | PASS |
| Predecessor ledger (`EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE`) | PASS |
| Standing authorization covers R08 | PASS |
| Exact forward source preflight (4 packages) | 104/104 |
| Strict-noop parser dry-runs (8 files, forward + rollback) | PASS |
| Block-entity clearance | 0 hits |
| Manifest QA (`qa_guarded_release_manifest.mjs`) | PASS (4/4 packages) |

Targets: **186** · Operated: **104** · Interaction halo: **286** · Packages: **4**
(`stair-flight` 32, `stair-headroom` 52, `stair-landing` 8,
`stair-landing-clearance` 12) — all exact one-cell forward/rollback inverses.

## Execution boundary

This package is compiled from the **accepted R08AM post snapshot**, which is
immutable provenance, **not** a reusable live source. Before any live release:

1. capture a fresh same-invocation complete save and recompile against it;
2. pass live entity clearance over the exact operation halo;
3. run strict-noop journaled forward execution through
   `scripts/rcon_runner.py --strict-noop --report <json>`;
4. capture a fresh immutable post snapshot;
5. run exact post-state rollback preflight and bidirectional normal-walk QA
   proving the widened three-wide stairs, 3×3 landings, and three-block
   headroom;
6. verify every preserved R08AL/R08AM interface.

The widened stairs remain **public inside the gallery only**; this package does
not open surface-headhouse egress, exterior egress, or accessibility
(`surfaceEgressOrAccessibilityClaimed: false`). Rail, drainage, fire/service,
ventilation, mechanism, and exterior interfaces remain closed. R08AP (one
protected public egress adapter) remains a separate package.
