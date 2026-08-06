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

The [R00 readiness audit](phase1-r00-readiness-audit.json) evaluates only G01-G07. It currently reports G01 PASS and G02-G07 HOLD after binding 20 owner-delegated selections plus the separately recorded P1-B11 owner acceptance. The subjective geometry-choice count is now zero. Post-approval engineering adds a 6-PASS/11-HOLD D02 technical matrix, a complete sparse proposal for all 14,768,553 FM-01 candidate cells and all 754,224 support-gap classifications, a 10-PASS/15-HOLD D06 mechanism matrix with 29 non-executable commissioning contracts, and an exact conditional P1-B12 passive-shell candidate below Grand Avenue. These records do not cure the absent complete save, B07's 38 excavation water cells, unaccepted D05 support/hydrology state, null D06 powered mechanisms, missing independent technical acceptance, or open owners/interfaces. No additional human decision-maker is required, but the current evidence is insufficient for G02. G08-G19 stays explicitly deferred from design-decision closure.

## What must be authored before the first block

1. Close the three remaining technical masterplan decisions with immutable pre-R00 evidence. D01 selects same-world placement, D03 deletes unsurveyed L2, D04 selects a fully clear-spanned empty rail reservation, D07 binds fact-checked architectural-composite wording while omitting C2, and P1-B11's exact Grand Avenue planning profile is owner-accepted. D02's 432-cell closed-drainage geometry and technical matrix still lack inflow/storage/failure criteria, a complete same-moment save, technical acceptance, quantities, C01 ownership/loading, and ISSUE-002 evidence. D05 now has canonical proposed FM-01 bulk/finish states and a complete support-gap status partition, but no accepted support treatment, hydrology/geotechnical conclusion, B09 system, owner, interface, or future/construction cell set. D06 has exact reservations, failure contracts, and commissioning criteria, but B07 still has 38 excavation water cells and every smoke, discharge, fire/service, barrier, lift, power, ownership, and interface mechanism remains unaccepted or sealed. P1-B12 preserves a sealed-shell option below Grand Avenue; it may be added to the release graph only after all eight candidate HOLDs pass, otherwise it remains a reservation. Operations, source guards, manifests, preflight, entity clearance, pilot, rollback, route QA, and post-state QA belong to G03-G19 and cannot close G02.
2. Complete the canonical G03 setout. The v2 compiler now normalizes ten scopes and eight expanded exact domains, consumes the exact B11 construction/interaction/influence proposals and the D06 detailed interaction union, pins B07 to west-two, and discloses five exact overlaps. Fifteen required construction/interaction/influence domains remain null or planning-only; none may be inferred empty or accepted merely because its source geometry exists.
3. Complete and accept the one-owner/default-deny interface registry. V2 assigns 16,542,566 known cells across 27 logical owners after 26 exact precedence adjudications and defines 78 directional contracts; 64 have exact cell sets, 25 have transition-pair hashes, fourteen remain null, and all accepted-owner/interface counts are zero. The registry includes the exact 2,288-pair road self-transition, 104-pair Houston-to-road transition, and four detailed D06 owner seams totaling 59 pairs. Any observed undeclared seam is a failure. Each accepted seam must bind direction, bounds, cell count and hash, transition count, component count, largest component, component hash, and source/desired state-set hashes.
4. Retain the three hash-bound default-deny relic cores and their selected exact one-cell minimum planning exclusions. G06 v2 proves all fifteen non-null G03 domains exact-zero against all 114 observed starts and all three cores: 1,710 start/domain and 45 core/domain evaluations, with zero G03 conflicts. It preserves fifteen null domains as unknown and separately discloses a 126-cell D05 support-status intersection with the shipwreck core; that is unresolved support evidence, not an accepted treatment or construction set. Preserve the absent east-igloo recorded site without reconstruction, relocation, access, or reuse. Freeze expert positive margins/influence kernels and the complete-save all-start result before final G06 acceptance. Post-state preservation remains G16-G19 validation.
   - A later sole-owner policy dated 2026-08-06 resolves preserve-versus-remove for the shipwreck in favor of controlled-removal engineering. It does not change the historical census, the two igloo protections, the withheld D05 sets, or the G06 pass rule. The raw 126-cell overlap and support evidence remain HOLD until one complete save supports an exact attributed treatment, chest/inventory salvage, desired post states, ownership/interfaces, rollback, and separately authorized execution.
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

Current result: **BLOCKED**. Exact proposal-level G03 and ownership/interface registries now exist, but there is no accepted complete setout, accepted owner/interface identity, construction package, fresh complete construction-source snapshot, or hash-bound authorization artifact.

The bounded C1 study freezes one coordination candidate and the empty rail-reservation setout, while the full C1 civil artifact now freezes an independent highway profile and exact diagnostic geometry. Both deliberately emit zero operation cells. Pale-garden features, block entities, incomplete adjacent-chunk structure clearance, geotechnical/structural/outfall/C01 acceptance, ownership, source, rollback, and route QA keep R01 on HOLD.

The current validator is also fail-closed against placeholder advancement evidence. A resolved contract decision must match a `RESOLVED` record inside its bound decision ledger; relic cores must match the bound census; a reviewed buffer must be an approved, hash-bound exact set; R01 start readiness requires compiled target/interaction sets and operations rather than an already-PASS pilot; and Phase 1 exit remains downstream acceptance rather than a pre-pilot prerequisite. G01-G14 still need explicit PASS evaluations bound to authority evidence before execution. The present contract intentionally has no current gate evaluations and keeps all release nodes `BLOCKED`. Advancing a node requires the missing project release tooling and a reviewed contract-state transition; the current-state validator cannot be treated as an execution wrapper.
