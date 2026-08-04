# Masterplan 05 — Phase 1 Release Engineering

Status: **CONTRACT VALID — BUILD BLOCKED — OFFLINE ONLY**

The machine-readable contract is [phase1-release-contract.json](phase1-release-contract.json). It turns the Masterplan 05 delivery sequence into a serial, default-deny release graph. It does not contain block operations and cannot authorize construction.

## Release graph

The exact dependency order is:

```text
R00 freeze design and interfaces
  -> R01 bounded C1 visual/civil pilot
  -> R02 Empty Eight, branch, egress, ventilation and sealed interfaces
  -> R03 public shaft and SubTropolis shells
  -> R04 service/contact and Cheyenne shells
  -> R05 mountain shell, hydrology and protected relic voids
  -> R06 Gateway Approach, Grand Avenue and Houston framework
  -> R07 summit, switchback funicular and return-road framework
  -> R08 Empty Eight fit-out
  -> R09 Houston, pedestrian tunnels, public shaft and SubTropolis fit-out
  -> R10 contact, Cheyenne and summit fit-out
  -> R11 C1 multimodal corridor
  -> R12 transport commissioning
  -> R13 consolidated acceptance
```

This ordering follows Masterplan 05: close the design decisions and freeze G01-G07 at R00, physically validate that frozen design at R01, build deep shells before surface loads, form the mountain before dependent surface work, fit out only accepted shells, and commission transport last. R01 cannot resolve D02, D05, D06, or G02. Every physical node is a separate transaction against a new immutable source snapshot. No release inherits a stale preflight from an earlier node.

The [R00 readiness audit](phase1-r00-readiness-audit.json) evaluates only G01-G07. It currently reports G01 PASS and G02-G07 HOLD, classifies current work as offline or external, and keeps G08-G19 explicitly deferred from design-decision closure.

## What must be authored before the first block

1. Close the three remaining masterplan decisions with immutable pre-R00 design/external-acceptance evidence. D01 selects same-world placement, D03 deletes unsurveyed L2, D04 selects a fully clear-spanned empty rail reservation, and D07 binds fact-checked architectural-composite wording while omitting C2. D02 still lacks its six civil acceptances, D05 lacks reviewed buffers/future hydrology acceptance, and D06 lacks surveyed external life-safety continuations and accepted mechanisms. Operations, source guards, manifests, preflight, entity clearance, pilot, rollback, route QA, and post-state QA belong to G03-G19 and cannot close G02.
2. Compile every planning envelope into exact integer target and interaction cell sets. Planning bounds are not ownership. Every interaction cell—including guarded block-data command cells and reactive cells—must have exactly one canonical owner.
3. Author exact cross-scope interface contracts and run a complete global audit. Any observed undeclared seam is a failure. Each accepted seam must bind direction, bounds, cell count and hash, transition count, component count, largest component, component hash, and source/desired state-set hashes.
4. Retain the three hash-bound zero-margin default-deny relic cores and freeze reviewed positive buffers for both igloos and the shipwreck. Resolve the east-igloo record whose 280-cell core is entirely air in the copied snapshot, then prove the exact proposed construction/interaction sets clear all relevant structure starts for R00. Post-state preservation remains G16-G19 validation. The core census alone is insufficient for construction.
5. Build a canonical deterministic compiler. Two clean runs from identical inputs and snapshot must produce byte-identical forward, rollback, compiler report, ownership manifest, and interface audit artifacts.
6. Produce exact one-cell guarded forward/rollback operations and a schema-1 release manifest. Independent QA must prove complete block states, exact transition inversion, target bijection, zero duplicate targets, and zero cross-package interaction overlap.
7. Capture a fresh complete immutable saved-world source snapshot. The July 28 accepted baseline and August 4 Phase 0 snapshots are lineage/siting evidence only.
8. Run complete forward preflight and strict-noop parser dry runs for both directions. A scoped shard is reusable evidence only and cannot satisfy a release gate.
9. Create a non-self-issued authorization artifact bound to the exact release-manifest hash, source-snapshot hash, package order, operation hashes, world and expiry.
10. Add a Combined Zones wrapper that checks every preceding identity before calling the journaled atomic runner, plus a read-only final verifier for the post snapshot, rollback preflights, functional routes, hydrology, relics, media and database import.

## Existing tooling and the safety gap

The existing generic tools are valuable building blocks:

- `qa_guarded_release_manifest.mjs` proves complete states, forward/rollback inversion and package disjointness.
- `preflight_guarded_ops.mjs` checks source state against copied Anvil regions.
- `redevelopment_live_entity_gate.py` provides same-moment entity clearance and force-load restoration.
- `rcon_runner.py --strict-noop` executes exact guarded groups with plan hashes and a durable journal.
- `run_redevelopment_atomic_release.py` provides fixed-order compensating rollback.

They are not a Combined Zones release system by themselves. In particular, the generic atomic runner does not consume a Masterplan 05 ownership/interface gate or a manifest-and-snapshot-bound authorization, and its current prerelease check does not independently require the preflight's operation SHA-256 and snapshot SHA-256 to equal the live candidate identities. A project wrapper must close those gaps before physical work.

## Advancement rule

The lifecycle is deliberately non-cyclic: D01-D07 and G01-G07 close from pre-R00 design evidence, R00 freezes that accepted design, G01-G14 must then pass before R01 can start, G15 controls execution, and R01 cannot become accepted until G01-G19 all pass. Missing, stale, partial, hash-drifting or narratively equivalent evidence fails closed. The live entity report must bind all forward operation hashes and be no more than five minutes old at transaction start. Any failed transaction must finish the journal-proven rollback, freeze the world, capture a new immutable snapshot and restart the complete gate sequence.

Current result: **BLOCKED**. There is no Combined Zones construction package, exact owner set, fresh construction-source snapshot, or hash-bound authorization artifact.

The bounded C1 study freezes one coordination candidate and the empty rail-reservation setout, while the full C1 civil artifact now freezes an independent highway profile and exact diagnostic geometry. Both deliberately emit zero operation cells. Pale-garden features, block entities, incomplete adjacent-chunk structure clearance, geotechnical/structural/outfall/C01 acceptance, ownership, source, rollback, and route QA keep R01 on HOLD.

The current validator is also fail-closed against placeholder advancement evidence. A resolved contract decision must match a `RESOLVED` record inside its bound decision ledger; relic cores must match the bound census; a reviewed buffer must be an approved, hash-bound exact set; R01 start readiness requires compiled target/interaction sets and operations rather than an already-PASS pilot; and Phase 1 exit remains downstream acceptance rather than a pre-pilot prerequisite. G01-G14 still need explicit PASS evaluations bound to authority evidence before execution. The present contract intentionally has no current gate evaluations and keeps all release nodes `BLOCKED`. Advancing a node requires the missing project release tooling and a reviewed contract-state transition; the current-state validator cannot be treated as an execution wrapper.
