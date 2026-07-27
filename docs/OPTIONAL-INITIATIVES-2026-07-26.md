# Optional initiatives — canonical plan

**Created:** 2026-07-26
**Scope:** enhancements, experiments, and operator choices that are explicitly
not required to close the MainStreet America recovery audit.

This document is the canonical home for optional work found across the current
Markdown corpus. An entry here does **not** mean an existing build is incomplete.
The final MainStreet snapshot remains closed at 96/96 assertions, and the first
Box archive remains complete.

## Triage rules

- **READY** — bounded work with no unresolved product decision.
- **DESIGN** — the existing system is complete; a new design choice is needed
  before expanding it.
- **CONDITIONAL** — only start when the named trigger becomes true.
- **PARKED** — intentionally not scheduled.
- **ARCHIVED** — belongs to a retired world and must not enter the active queue.

Priority is relative **within this optional list**. It does not outrank required
correctness, security, documentation, or operations work in `BACKLOG.md`.

## Active optional backlog

| ID | Priority / effort | State | Initiative | Why it is optional |
|---|---|---|---|---|
| OPT-01 | P1 / M | READY | Generic read-only world scanner | The feature catalog, API, and MainStreet importer are complete. This extends first-class mapping to projects without a custom importer. |
| OPT-02 | P1 / S | DESIGN | Scheduled Box archive | Manual Box sync is deployed and verified. Automatic sync already exists but remains an operator choice and is currently off. |
| OPT-03 | P1 / M | READY | Repeatable map and visual-QA bundle | Snapshot, structural audit, local render, BlueMap capture, PDF generation, and Box upload all work separately. Combining them is workflow improvement, not recovery. |
| OPT-04 | P2 / M | DESIGN | MainStreet presentation polish pack | The neighborhood is structurally complete. This is a new art/detail pass: display vehicles, hangar equipment, billboard lettering, and more photography. |
| OPT-05 | P2 / M | DESIGN | Raven Rock finish pack | Raven Rock's verified connectivity is already `PLACED / WALKABLE`. Furnishing, facade work, and reservoir dressing are aesthetic additions outside the MainStreet recovery scope. |
| OPT-06 | P2 / S–M | DESIGN | Ravensreach east civic-water edge | The old “adjacent lake makes repair futile” premise is disputed. A formal pond/culvert/deck treatment would be a new public-realm amenity, not a functional repair. |
| OPT-07 | P2 / M | DESIGN | Curated schematic library packs | Town building already has an LLM-first design path and a seed library. Curated packs improve variety but are not needed for the builder to function. |
| OPT-08 | P3 / M | DESIGN | Personality-drift experiment | Bot personalities currently remain stable. Controlled evolution could make long-lived residents more expressive, but it changes behavior and needs policy first. |
| OPT-09 | P3 / S–M | DESIGN | Weighted voting / executive override | Town config persists `voteWeight`, while vote tallying remains one resident/one vote. Weighted governance is a product rule, not missing base voting. |
| OPT-10 | P3 / M | READY | Continuous action awareness | Project Sid's core metrics, rules, culture, perception state, and cognitive controller exist. Its explicitly optional P4-C follow-up—expected-versus-observed action effects—does not. |

## Conditional and parked ideas

| ID | State | Trigger or disposition |
|---|---|---|
| OPT-11 — Dedicated render VM / higher-fidelity render farm | CONDITIONAL | Revisit only when recurring BlueMap/Chunky work measurably competes with the 2-vCPU game/build workload or a continuously browsable public map is required. Keep rendering on copied snapshots; never share a live world directory between servers. |
| OPT-12 — At-rest encryption for LLM keys | CONDITIONAL | Already tracked as `BACKLOG.md` item 8. Start only if the service becomes multi-tenant or the host threat model changes. |
| OPT-13 — Virtual town currency | PARKED | Inventory/resource-flow accounting is sufficient at the present fleet scale. Define a real gameplay loop and sinks/sources before introducing a second economy. |
| OPT-14 — Retired DyoCraft bunker rail spur and underground residue removal | ARCHIVED | These coordinates belong to the abandoned DyoCraft world. Do not schedule unless that exact world is restored and re-snapshotted. |

## Delivery briefs

### OPT-01 — Generic read-only world scanner

**Outcome:** any bounded project can be inventoried into the world-feature
database without first writing a bespoke importer.

**Plan**

1. Extract/reuse the Anvil decoding layer already used by
   `scripts/world_render.mjs` and the MainStreet generators.
2. Accept explicit world, dimension, bounds, snapshot ID, and project ID.
3. Fingerprint chunks and skip unchanged chunks on later scans.
4. Detect candidate roads, structures, parcels, water, entrances, and notable
   vertical connections conservatively.
5. Persist candidates in a review state; never auto-name, auto-complete, or
   auto-repair the world.
6. Add an API/dashboard review queue that can accept, merge, edit, or reject a
   candidate before it becomes canonical.

**Constraints:** read-only; one or two decoder workers on this host; bounded
coordinates required; provenance on every candidate.

**Acceptance:** repeat scan of unchanged bounds produces no duplicate features;
changed chunks alone are rescanned; accepted candidates appear in
`/api/world/features`; rejected candidates remain auditable.

### OPT-02 — Scheduled Box archive

**Outcome:** approved artifact roots are copied to Box on a predictable cadence
without manual dashboard action.

**Plan**

1. Pick a cadence and maintenance window; the existing default is 60 minutes.
2. Enable the already-deployed `autoSync` setting.
3. Observe one scheduled incremental run and confirm unchanged files are not
   re-uploaded.
4. Add an alert/health surface only if silent failures prove hard to notice.

**Acceptance:** one timer-originated sync completes after a service restart,
updates the sync state, transfers only changed artifacts, and reports zero
credential exposure. This is an operator activation task, not a new integration
build.

### OPT-03 — Repeatable map and visual-QA bundle

**Outcome:** one bounded command produces a timestamped evidence packet for a
project.

**Plan**

1. Orchestrate `world_snapshot.py`, structural audit, `mc_look.py`, BlueMap
   capture, map/PDF packaging, and an optional Box sync.
2. Store the snapshot hash and copy timestamp in both images and the manifest.
3. Fail loudly on blank/unloaded captures or stale snapshot provenance.
4. Enforce low-concurrency defaults suitable for the current host.

**Acceptance:** a dry run against MainStreet creates a manifest whose hashes,
audit result, captures, and PDFs all point to one snapshot; a second unchanged
run is idempotent.

### OPT-04 — MainStreet presentation polish pack

**Candidate scope**

- More parked display vehicles without blocking any audited route or gate.
- Additional hangar maintenance equipment and bay storytelling.
- Legible MainStreet billboard/sign lettering.
- A larger, consistent exterior/interior photo set for every model home.
- Future fenced grid parcels only as separately named projects with their own
  feature rows, manifest units, gates, and audit scope.

**Gate:** approve a small mood board and exact parcel list first. Preserve the
current road, fence, route, room, and WorldGuard assertions as regression tests.

**Acceptance:** zero regressions in the 96/96 suite and bidirectional routes;
every new parcel is cataloged, fenced, navigable, photographed, and archived.

### OPT-05 — Raven Rock finish pack

**Candidate scope**

- Furnish existing partitioned rooms and Guest Center zones.
- Add facade depth/detail without changing verified footprints.
- Apply the audit's optional N7 reservoir rim, lighting, and pipe dressing.

**Gate:** refresh a bounded snapshot and reconcile Raven Rock's historical QA
notes before design. Preserve the required creative-interpretation disclosure
signs. Do not mix Raven Rock work into MainStreet manifests.

**Acceptance:** connectivity remains `PLACED / WALKABLE`, disclosure signs
remain readable, no reservoir leak is introduced, and a new canonical visual
set documents the finish pass.

### OPT-06 — Ravensreach east civic-water edge

**Outcome:** turn the disputed east-side pool/channel condition into an
intentional public-space edge.

**Plan:** survey the current water topology, choose either a formal pond with
stone edge/culvert/deck/bench or an explicit as-natural treatment, then model
the selected treatment as a standalone build unit.

This optional amenity excludes active containment defects. The 2026-07-27
Market irrigation side-outlet was required correctness work and is already
closed; OPT-06 must preserve that containment.

**Acceptance:** no flooding reaches the plaza, paths remain walkable, the water
decision is recorded, and the new amenity is present in the world catalog.

### OPT-07 — Curated schematic library packs

**Outcome:** improve style consistency and variety without replacing the
working LLM-first design path.

**Plan:** define license/format/palette/footprint criteria; test one asset in an
isolated review world; add metadata and preview; then admit a small coherent
pack. Any purchase is a separate user decision.

**Acceptance:** every admitted schematic has provenance/license metadata,
preview, dimensions, material census, supported Minecraft version, and a
successful isolated placement test.

### OPT-08 — Personality-drift experiment

**Outcome:** allow reflection or accumulated behavior to propose bounded,
explainable trait changes.

**Plan:** write the policy first (mutable traits, maximum rate, reset/lock,
mayor visibility), run shadow-mode proposals, then enable for a test town only.

**Acceptance:** no trait changes occur while disabled; every change has an
explanation and history; changes are capped and reversible; role assignment and
social behavior tests cover the new state.

### OPT-09 — Weighted voting / executive override

**Outcome:** either make `TownConfig.voteWeight` meaningful or explicitly
retire it.

**Plan:** choose semantics for mayor/player/resident weights, ties, quorum, and
UI disclosure; update the durable vote record to retain weighted totals; test
rehydration and manual override behavior.

**Acceptance:** results are deterministic and auditable, the dashboard explains
the weighting before a vote, and default `1.0` exactly preserves current
one-resident/one-vote behavior.

### OPT-10 — Continuous action awareness

**Outcome:** detect when a primitive action's observed inventory/position/world
effect differs from its expected effect, and feed that signal to critic and
early-abort logic.

**Plan:** define effect contracts for a small primitive set; record deltas in
the existing agent state/decision trace; add thresholds and a feature flag; A/B
against the current loop.

**Acceptance:** disabled mode has no behavior change; deliberately blocked
movement and failed collection are detected without false success; repeated
drift aborts safely and leaves a trace the dashboard can explain.

## Recommended waves

1. **Wave A — evidence automation:** OPT-01, then OPT-03; decide whether to
   activate OPT-02 after one observed scheduled run.
2. **Wave B — world presentation:** OPT-04, OPT-05, and OPT-06 as independent
   projects. Never run more than one world mutation campaign at a time.
3. **Wave C — gameplay experiments:** OPT-07 first; OPT-08/09/10 only behind
   feature flags and in a test town.
4. **Cold storage:** OPT-11–14 stay conditional, parked, or archived until
   their written trigger is met.

## Reconciled notes that must not become new optional work

- Town DB versioned migrations are implemented with SQLite `user_version`.
- Per-task LLM routes and fallback chains are populated.
- Inter-town allied trade routes are implemented.
- Project Sid's metrics, rules, culture, perception state, and cognitive
  controller are implemented; only its explicitly optional action-awareness
  follow-up is retained above.
- The Box client, settings panel, PDFs, manual sync, and timer implementation
  are complete; OPT-02 is only the decision to turn scheduling on.
- MainStreet recovery, mapping import, roads, boundaries, builds, navigation,
  terrain, protection, and archive are closed. Optional polish does not reopen
  that audit.

Required platform defects and stale-document reconciliation remain in the main
backlog. They are deliberately excluded here so “optional” never hides actual
completion debt.
