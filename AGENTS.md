# AGENTS.md

Guidance for coding agents working in `/opt/mc-fleet-bot`.

## Repository Shape

- This repo has two TypeScript apps and three absorbed sub-tools:
- Backend bot sidecar in the repository root (`src/`, compiled to `dist/`).
- Frontend dashboard in `web/` (Next.js App Router).
- `tools/fleet-devtools/` — a separate TypeScript monorepo for read-only Anvil/SQLite reporting (port 4310, its own `npm` workspace and `vitest` config). Lives under `tools/` next to the one-shot Node scripts in `tools/scripts/`.
- `world-builder/` — the `mcwb` Python package (masterplan → world). Standalone `pyproject.toml` and pytest suite.
- `world-showcase/` — the IANLAN NextGen Next.js app, deployed to Railway. Standalone `package.json` and `next build`.
- `tools/` — small repo-root Node scripts (one-shot migrations). See `tools/README.md` if present, otherwise see inline headers.
- Core backend domains:
- `src/bot/` bot lifecycle and Mineflayer connection handling.
- `src/voyager/` task planning, code execution, critic loop, skill storage.
- `src/actions/` primitive bot actions.
- `src/personality/` affinity and conversation systems.
- `src/social/` bot-to-bot messaging, memory, and culture/meme spread.
- `src/control/` fleet control platform (commands, missions, markers, squads, roles, commander).
- `src/town/` towns, residents, roles, schedules, decrees/governance, trade routes, diplomacy.
- `src/build/` schematic-based multi-bot build coordination.
- `src/supplychain/` supply chain templates and coordination.
- `src/security/` impersonation detection.
- `src/survival/` explicitly enabled, exact-bot survival objective control and persisted progress.
- `src/worker/` per-bot worker threads, IPC channel, and cross-thread proxies.
- `src/ai/` LLM client abstraction (Anthropic, Gemini, OpenAI, MiniMax, Ollama, VoyageAI behind a `ModelRouter`) and prompt logic.
- `src/server/` Express + Socket.IO API.

## Source Of Truth

- Follow existing code over generic style advice.
- Respect `CLAUDE.md` in the repo root; it contains operational project notes.
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files were present when this file was written.
- There was no existing repo-root `AGENTS.md`; this file is the canonical agent guide.

### Combined Zones current-state precedence and standing build authority

- The sole owner directed on 2026-08-21: implement the ten acceleration
  changes, remove the obsolete global holds, fan out the work, and build rather
  than continue audit-only planning. This is standing authority to design,
  compile, and execute Masterplan 05 MVP releases without requesting another
  conversational approval for each hash, provided the scoped hard-safety
  kernel below passes immediately before mutation.
- `docs/masterplans/05-combined-zones/CURRENT-STATE.md` is the current control
  ledger. Later accepted execution/post-state evidence supersedes historical
  planning `HOLD` text. Historical artifacts remain provenance; they must not
  regress an executed/as-built release to `BLOCKED`.
- R00 is complete. R01 through R06 have material as-built evidence and are not
  prerequisites to repeat. Work from the first incomplete MVP scope, and use a
  current-safe delta when a historical operation source is stale.
- Release readiness is scoped by exact target and interaction sets. Independent
  disjoint scopes may compile, preflight, and execute in parallel; an unrelated
  optional scope or isolated holdout cannot veto them.
- The only mandatory prerelease safety kernel is: a fresh immutable source
  snapshot; complete canonical block states; exact forward/rollback inversion;
  container/block-entity and protected-core exclusion or an exact reviewed
  migration; fresh live-entity clearance; strict-noop forward and rollback
  parser checks; exact source preflight; journaled execution; a fresh post
  snapshot; and rollback post-state preflight. Route/functional checks required
  to keep the changed scope usable are part of the same scoped closeout.
- Real-world engineering terminology in planning records is Minecraft design
  QA, not a requirement for external professional certification. The owner has
  delegated conservative, reversible design and material decisions to the
  implementation team. Unknown live block/entity/container/fluid state remains
  a hard stop for the affected cells only.
- MVP deliberately defers P1-B12, C2, C3, all eight future Empty Eight line
  stubs, and decorative publication/media/database work that is not required to
  keep a changed route or mechanism safe and recoverable. Deferred work is not
  a blocker to MVP completion.
- Prefer compilers, guarded operation packages, and as-built verification over
  new audit-only narratives. Do not regenerate a historical hold report unless
  a current compiler or hard-safety check needs it to resolve a concrete cell.
- **Governor acceleration directive — 2026-08-26:** the Governor has delegated
  the required named scope-owner, counterpart, and design-signature roles to
  the implementation team. Treat those names as internal accountable build
  roles, not requests for a separate person or external approval. Assign them
  directly in a finite source-bound package, run independent disjoint packages
  in parallel, and remove stale serial dependencies. This directive does not
  waive exact cell ownership, canonical source/target/rollback states,
  containment/gravity/receiver design, protected-core and entity checks,
  strict-noop preflights, journaling, fresh post capture, or functional QA.
- **Governor fluid-containment instruction — 2026-08-26:** encountered water
  or lava is a construction-containment task, not a planning stop. Prefer a
  finite sealed, supported, flow-ordered liner/plug, with exact canonical
  source/target/rollback states, receiver/overflow treatment where needed, and
  an inverse order that never recreates an uncontrolled live-fluid path. If a
  discovered component is unbounded, first compile the finite containment
  boundary that makes later work safe; do not guess at unobserved fluid state.
- Run the focused B07 lower pressure-gallery compiler and guarded-kernel
  readiness regression with:

```bash
npx vitest run test/build/mp05B07LowerPressureGallery.test.ts
```

  `scripts/compile_mp05_b07_lower_pressure_gallery_01.mjs` emits a finite
  lower-side, three-wide, dry pressure gallery only: liner/bulkhead first,
  sealed core clearance second, then a closed hatch and ladder from the R09B
  helix. It leaves the R09J/R07J caps, upper B07 connection, surface receiver,
  public access, emergency egress, transport, and fluid discharge closed.
  Use the scoped runner and then
  `scripts/qa_mp05_b07_lower_pressure_gallery_01_post_release.mjs` after any
  physical execution.
- Run the focused Empty Eight R08 fit-out compiler regression with:

```bash
npx vitest run \
  test/build/combinedZonesR08EmptyEightFitout.test.ts \
  test/build/qaCombinedZonesR08EmptyEightFitoutPostRelease.test.ts \
  test/build/qaCombinedZonesR08BEmptyEightPlatform08PostRelease.test.ts
```

- Run the focused R08H PF06 dynamic-fluid containment-liner regression with:

```bash
npx vitest run \
  test/build/combinedZonesR08PF06DynamicFluidLiner.test.ts
```

- Run the focused R08J PF05 flow-ordered containment-liner regression with:

```bash
npx vitest run \
  test/build/combinedZonesR08PF05FlowOrderedLiner.test.ts
```

- Run the focused R08L PF01 partitioned lava/water containment-liner
  regression with:

```bash
npx vitest run \
  test/build/combinedZonesR08PF01PartitionedFluidLiner.test.ts
```

- Run the focused R08M PF01 permanent-fitout and post-release retention-seal
  regressions with:

```bash
npx vitest run \
  test/build/combinedZonesR08PF01Fitout.test.ts \
  test/build/qaCombinedZonesR08PF01FitoutPostRelease.test.ts
```

- Run the focused R10 Cheyenne secure-gallery compiler regression with:

```bash
npx vitest run \
  test/build/combinedZonesR10CheyenneSecureGallery.test.ts \
  test/build/qaCombinedZonesR10CheyenneSecureGalleryPostRelease.test.ts
```

- Run the focused R12A Cheyenne gallery hold-point commissioning regression
  with:

```bash
npx vitest run \
  test/build/combinedZonesR12ACheyenneGalleryCommissioning.test.ts
```

- Run the focused R12B B09 static-enclosure readiness regression with:

```bash
npx vitest run \
  test/build/combinedZonesR12BB09StaticEnclosureReadiness.test.ts
```

- Run the focused R12C B09 isolated passive-rail design-freeze regression
  with:

```bash
npx vitest run \
  test/build/combinedZonesR12CB09PassiveRailDesignFreeze.test.ts \
  test/build/qaCombinedZonesR12CB09PassiveRailPostRelease.test.ts
```

- Run the focused MP03 / B07 vertical containment, gravity, and egress
  acceptance-contract regression with:

```bash
npx vitest run test/build/mp03B07VerticalAcceptanceContract.test.ts
```

- Run the focused MP05/B07 integrated acceptance-signature compiler regression
  with:

```bash
npx vitest run test/build/mp05B07IntegratedAcceptanceSignature.test.ts
```

`scripts/compile_mp05_b07_integrated_acceptance_signature.mjs` validates a
source-bound filled signature into a design-input decision only. It default
denies placeholder or drifted signatures and never emits operations, a release
manifest, RCON calls, or mutation authority.

- Run the focused MP05 B07 first-viable guarded-release gate regression with:

```bash
npx vitest run test/build/mp05B07FirstViableReleaseContract.test.ts
```

- Run the focused MP05 B07 wet-riser / R09E lower-receiver compiler regression with:

```bash
npx vitest run test/build/mp05B07WetRiserReceiver.test.ts
```

  `scripts/compile_mp05_b07_wet_riser_receiver_01.mjs` compiles a finite,
  liner-first, dual-bulkhead maintenance riser from the executed lower pressure
  gallery to three closed manual receiver hatches at the existing R09E lower
  landing. It never opens R09J/R07J, commissions a public route, or executes.

- Run the focused MP05 B07 fresh extended-fluid-topology fail-closed regression with:

```bash
npx vitest run test/build/mp05B07FluidTopologyExtension.test.ts
```

  This is a read-only current-source topology census. It deliberately emits no
  remediation operation while the observed component reaches the configured
  125,000-cell safety cap; do not promote local solid faces to a liner without
  finite closure and the complete directed receiver/overflow/rollback design.

- Run the focused MP05 R05 finite west-toe lava-plug regression with:

```bash
npx vitest run test/build/mp05R05WestToeLavaPlug.test.ts
```

  `scripts/compile_mp05_r05_west_toe_lava_plug_01.mjs` is a source-bound,
  offline-only tail-to-source liner compiler for one 36-cell finite lava
  component. Use the generic scoped runner only after a fresh source capture;
  then run `scripts/qa_mp05_r05_west_toe_lava_plug_01_post_release.mjs` on the
  fresh immutable post snapshot.

- Run the focused MP05 B09 operating-system acceptance-contract regression
  with:

```bash
npx vitest run test/build/mp05B09OperatingSystemAcceptanceContract.test.ts
```

- Run the focused MP08 C1 bilateral acceptance-signature regression with:

```bash
npx vitest run \
  test/build/mp08C1BilateralContainmentContract.test.ts \
  test/build/mp08C1BilateralAcceptanceSignature.test.ts
```

- Run the focused MP08 C1 restricted-inspection lighting compiler regression
  with:

```bash
npx vitest run test/build/mp08C1RestrictedInspectionLighting.test.ts
```

- Run the focused MP01 commissioning-access acceptance-signature regression
  with:

```bash
npx vitest run test/build/mp01AccessCommissioningAcceptanceSignature.test.ts
```

- Run the focused MP10 library perimeter/annex acceptance-signature regression
  with:

```bash
npx vitest run test/build/mp10RrchLibraryPerimeterAnnexAcceptanceSignature.test.ts
```

- Run the focused MP10 library exterior three-wide stair-annex compiler
  regression with:

```bash
npx vitest run test/build/mp10RrchLibraryExteriorStairAnnex.test.ts
```

  `scripts/compile_mp10_rrch_library_exterior_stair_annex_01.mjs` emits a
  source-bound 126-cell west exterior switchback and exact inverse only. Use
  `scripts/run_mp10_rrch_library_exterior_stair_annex_release.mjs` for its
  fresh capture/rebind kernel. After execution, independently run
  `scripts/qa_mp10_rrch_library_exterior_stair_annex_01_post_release.mjs`
  against the immutable post `region/` and the fresh rebound manifest.

- Run the focused MP10 library exterior west retaining-parapet compiler
  regression with:

```bash
npx vitest run test/build/mp10RrchLibraryExteriorStairParapet.test.ts
```

  `scripts/compile_mp10_rrch_library_exterior_stair_parapet_01.mjs` emits the
  exact supported 119-cell west-edge parapet for the five exterior stair
  flights only. It excludes the east bookshelf fabric, all walking lanes, and
  the Library/Loggia seam. Use
  `scripts/run_mp10_rrch_library_exterior_stair_parapet_release.mjs` for the
  fresh capture/rebind kernel. After execution, independently run
  `scripts/qa_mp10_rrch_library_exterior_stair_parapet_01_post_release.mjs`
  against the immutable post `region/` and fresh rebound manifest.

- Run the focused MP10 whole-library exterior-circulation reconciliation with:

```bash
npx vitest run test/build/mp10RrchLibraryExteriorCirculationReconciliation.test.ts
```

  `scripts/reconcile_mp10_rrch_library_exterior_circulation_02.mjs` is
  read-only. It rebinds the two accepted exterior releases to a fresh complete
  source, proves their 245 retained targets and the complete six-level
  bidirectional route, and rejects restoration of the five historic internal
  headroom-conflicting treads. It emits no operations or mutation authority.

- Run the focused MP11 C01 portal-to-L1 acceptance-signature regression with:

```bash
npx vitest run test/build/mp11C01PortalL1AcceptanceSignature.test.ts
```

- Run the focused MP11/BKR C01 whole-scope dimension-recovery design-gate regression with:

```bash
npx vitest run test/build/mp11BkrC01DimensionRecoveryDesign.test.ts
```

  `scripts/design_mp11_bkr_c01_dimension_recovery_01.mjs` is read-only. It
  binds the portal, public, owner, and service dimension defects to a complete
  immutable source and emits a coordinate safety map plus first-physical-package
  conditions; it emits no operations, release manifest, or mutation authority.

- Run the focused MP11/BKR C01 portal topology, receiver, and return-gate
  regression with:

```bash
npx vitest run test/build/mp11BkrC01PortalTopologyReceiverReturn.test.ts
```

  `scripts/design_mp11_bkr_c01_portal_topology_receiver_return_02.mjs` is a
  read-only prerequisite to a portal liner or separated dry bypass. It maps
  gravity components, verifies fluid/receiver and container boundaries, and
  records current versus independent-return evidence. It never emits operations
  or mutation authority.

- Run the focused MP11/BKR C01 expanded-gravity and independent-return survey
  regression with:

```bash
npx vitest run test/build/mp11BkrC01PortalTopologySecondReturn.test.ts
```

  `scripts/survey_mp11_bkr_c01_portal_topology_and_second_return_03.mjs`
  expands every initial portal-boundary gravity component through the immutable
  source and searches for a normal-walk return disjoint from the current
  portal-to-L1 interior halo. It is read-only and does not emit operations or
  mutation authority.

- Run the focused MP11/BKR C01 finite dry gravity-liner static-design
  regression with:

```bash
npx vitest run test/build/mp11BkrC01FiniteGravityLinerDesign.test.ts
```

  `scripts/design_mp11_bkr_c01_finite_gravity_liner_01.mjs` selects exactly
  one materially sized finite gravity component only when its complete
  one-cell interaction halo is dry, block-entity-free, protected-core-free,
  and disjoint from both post-source return halos and both endpoint volumes.
  It binds canonical target states and exact bottom-up/top-down no-falling
  design order, but emits no operation files, release manifest, RCON call, or
  physical mutation authority.

- Run the focused MP11/BKR C01 finite gravity-liner package and prepare-only
  guarded-kernel regression with:

```bash
npx vitest run test/build/mp11BkrC01FiniteGravityLinerPackage.test.ts
```

  `scripts/compile_mp11_bkr_c01_finite_gravity_liner_01.mjs` produces the
  exact 34-cell bottom-up forward and top-down inverse package only from the
  static design's exact source. `scripts/run_mp11_bkr_c01_finite_gravity_liner_release.mjs`
  defaults to a source-bound prepare-only kernel; `--execute` is the sole
  live-world opt-in and additionally requires same-moment entity clearance,
  journaling, fresh post capture, rollback preflight, and independent post QA.

- Run the focused MP11/BKR C01 finite-gravity/no-second-return contract
  regression with:

```bash
npx vitest run test/build/mp11BkrC01NoSecondReturnContract.test.ts
```

  `scripts/publish_mp11_bkr_c01_no_second_return_contract_01.mjs` publishes
  only a source-bound evidence contract and coordinate map. It records that
  finite gravity is no longer the current topology blocker while retaining the
  independent-return hard gate; it cannot emit physical operations or mutation
  authority.

- Run the focused MP11/BKR C01 existing-geometry independent-return scout with:

```bash
npx vitest run test/build/mp11BkrC01IndependentPortalReturnScout.test.ts
```

  `scripts/scout_mp11_bkr_c01_independent_portal_return_01.mjs` searches the
  bounded East-C01 envelope for an already walkable second return after
  excluding the current route halo, container halos, and fluid/waterlogged
  cells. It documents a found route or exact bounded absence only; it never
  infers a tunnel, emits operations, or grants mutation authority.

- Run the focused MP11/BKR C01 finite new-return feasibility regression with:

```bash
npx vitest run test/build/mp11BkrC01FiniteIndependentReturnFeasibility.test.ts
```

  `scripts/design_mp11_bkr_c01_finite_independent_return_feasibility_01.mjs`
  searches a source-bound 3×3 conceptual carve profile that excludes the
  current route halo, all block-entity halos, fluids/waterlogging, and gravity.
  A found corridor is feasibility input only: both endpoint interfaces and two
  directed-return contracts must be exact before a separate physical compiler
  can be considered. It emits no operations or mutation authority.

- Run the focused MP11/BKR C01 independent-return interface and inverse-design
  acceptance-contract regression with:

```bash
npx vitest run test/build/mp11BkrC01IndependentReturnAcceptanceContract.test.ts
```

  `scripts/design_mp11_bkr_c01_independent_return_acceptance_contract_01.mjs`
  binds the corrected true-3-wide × 3-high route, both source endpoint cubes,
  and exact forward/reverse route ordering. It deliberately default-denies a
  physical release until a dedicated compiler supplies canonical stepped target
  states and the full post-state/rollback kernel; it emits no operations.

- Run the focused MP11/BKR C01 independent-return offline compiler and
  projected-QA regression with:

```bash
npx vitest run test/build/mp11BkrC01IndependentReturnCompiler.test.ts
```

  `scripts/compile_mp11_bkr_c01_independent_return_01.mjs` compiles the
  accepted 105-station true-3-wide × 3-clear-high route into canonical source,
  target, and exact inverse operations. Its finite observed 228-cell gravel
  component is a permanent liner-first subpackage (first forward, last
  rollback), not temporary support. The compiler is offline-only. Use
  `scripts/qa_mp11_bkr_c01_independent_return_01_post_release.mjs` with a
  fresh immutable post snapshot after any separately authorized guarded run;
  `--project-source` is test-only and cannot become post-release evidence.
  `scripts/run_mp11_bkr_c01_independent_return_release.mjs` is the only
  standing-authorized wrapper: it defaults to prepare-only and recompiles the
  survey, topology, feasibility, interface contract, and operation package
  from its supplied fresh source. `--execute` additionally requires fresh
  nonexistent source/post capture destinations and retains live-entity,
  protected-core, strict-noop, journal, rollback, and independent-post-QA
  gates.

- Run the focused MP11 C01 portal-to-L1 gravity-containment whole-scope design
  regression with:

```bash
npx vitest run test/build/mp11C01PortalL1GravityContainmentDesign.test.ts
```

  `scripts/design_mp11_c01_portal_l1_gravity_containment_01.mjs` is read-only.
  It binds the fresh complete source, all gravity components, and exact study
  boundary contacts before any containment liner, 5×5 spine, landing, or
  operation package may be considered. It emits no mutation authority.

- Run the focused MP13 access/egress acceptance-contract regression with:

```bash
npx vitest run test/build/mp13AccessEgressAcceptanceContract.test.ts
```

- Run the focused MP12/MP13 Gatehead-to-Venue I01 acceptance-signature
  regression with:

```bash
npx vitest run test/build/mp12Mp13GateheadVenueAcceptanceSignature.test.ts
```

`scripts/compile_mp12_mp13_gatehead_venue_acceptance_signature_01.mjs`
validates only the finite Gatehead → East Arrival → venue-receiver boundary,
its exact support/feet/head cells, directed faces, and the retained 75-cell
Gatehead façade. It requires distinct District, Venue, Approach Road, and Town
Westlight/road reviewers plus return and two-independent-egress inputs, but
emits no operation or mutation authority. Do not use the unrelated MP13 I05/I06
staff-tower ledger as a prerequisite for this I01 threshold decision.

- Run the focused MP06 current road-route threshold-contract regression with:

```bash
npx vitest run test/build/mp06RoadRouteThresholdContract.test.ts
```

- Run the focused SYS-01 MP07–MP06 pedestrian-continuity contract regression
  with:

```bash
npx vitest run test/build/sys01Mp07Mp06PedestrianContinuityContract.test.ts
```

- Run the focused MP02/MP04 B08–B09 terminus and chamber-contract regression
with:

```bash
npx vitest run test/build/mp02Mp04B08B09TerminusChamberContract.test.ts
```

- Run the focused R05 lava-plug / Ravensreach crew-system post-state evidence
  map regression with:

```bash
npx vitest run test/build/r05RrCrewPoststateEvidenceMaps.test.ts
```

- Run the focused MP02 B08 terminus/control/egress whole-scope design-gate
  regression with:

```bash
npx vitest run test/build/mp02B08TerminusControlEgressDesign.test.ts
```

- Run the focused MP02 B08 second protected surface-egress compiler regression
  with:

```bash
npx vitest run test/build/mp02B08SurfaceEgressShaft.test.ts
```

  `scripts/compile_mp02_b08_surface_egress_shaft_01.mjs` emits a finite
  B03/B09-disjoint shaft, exact inverse, and projected bidirectional ladder
  QA only. Use `scripts/run_mp02_b08_surface_egress_shaft_release.mjs` for its
  fresh capture/rebind and strict guarded-release kernel; it requires a fresh
  live entity clearance before mutation. Independently run
  `scripts/qa_mp02_b08_surface_egress_shaft_01_post_release.mjs` against the
  immutable post `region/` and rebound manifest before calling the second
  discharge usable.

- Run the focused MP02 B08 egress-lighting compiler regression with:

```bash
npx vitest run test/build/mp02B08EgressLighting.test.ts
```

  `scripts/compile_mp02_b08_egress_lighting_01.mjs` adds only five supported
  fixed lights on the raw B08 return-to-second-egress segment. It excludes the
  accepted handoff, B03/B09, rail, controls, and the shaft structure. Use
  `scripts/run_mp02_b08_egress_lighting_release.mjs` for a fresh scoped kernel
  and `scripts/qa_mp02_b08_egress_lighting_01_post_release.mjs` for immutable
  post-state light and bidirectional egress QA.

- Run the focused Cobalt Westlight–Ravensreach first passive-rail compiler
  regression with:

```bash
npx vitest run test/build/cobaltS1WestlightRavensreachPassiveRailFirstRelease.test.ts
```

  The compiler emits only an offline, source-bound two-track passive rail
  package. It excludes the R10 normal-alignment and north-turn holds and never
  authorizes execution, a route, or passenger operation; refresh the complete
  source and run the scoped guarded-release kernel before any mutation.

- After a successful Cobalt passive-rail scoped execution, run the exact
  post-release QA with:

```bash
node scripts/qa_cobalt_s1_westlight_ravensreach_passive_rail_01_post_release.mjs \
  --ledger <scoped-runner-evidence-ledger.json> \
  --out <fresh-post-qa.json>
```

## Environment And Setup

- Install backend deps from the repo root with `npm install`.
- Install frontend deps with `npm install --prefix web` if needed.
- Copy `.env.example` to `.env` and set `GOOGLE_API_KEY` for AI-enabled bot behavior.
- Main runtime config lives in `config.yml`.
- Persistent data is stored under `data/` and learned skills under `skills/`.

## Sub-tools

The three sub-tools are each a standalone tree with its own dependency
install and its own build/test/lint commands. **They are not covered
by the root `npm run build` or `npm test`**, and the root `tsconfig.json`
compiles only `src/**/*`. Run every command below from the sub-tool
directory.

### `tools/`

Repo-root one-shot Node scripts and a sub-tool for read-only reporting.
The one-shot scripts live at `tools/scripts/`. The TypeScript monorepo
for read-only Anvil/SQLite reporting (formerly `fleet-devtools/`) now
lives at `tools/fleet-devtools/`. See its own `AGENTS.md` and the
sections below for the per-tree commands.

### `tools/fleet-devtools/`

A read-only Anvil/SQLite report workbench on port 4310. TypeScript
monorepo (its own `package.json` with internal npm workspaces, its
own `vitest.config.ts`). Has its own `AGENTS.md`.

```bash
cd tools/fleet-devtools
npm install                                       # its own tree; root install does not reach here
cp config/registry.example.yml config/registry.local.yml   # then edit — connector root must be absolute
npm run check                                     # lint + build + test + format:check
npm run cli -- registry check
npm run dev                                       # API + dashboard on http://<host>:4310
```

CI: `.github/workflows/tools.yml` at the **repo root**,
scoped to `paths: ['tools/fleet-devtools/**', 'tools/scripts/**']`. The nested
`tools/fleet-devtools/.github/workflows/ci.yml` is an inert signpost — GitHub
reads workflows only from the repository root. **Edit the root file.**

### `tools/scripts/`

One-shot Node scripts. The current entry is
`tools/scripts/consolidate-explore-skills.js`, a self-healing migration
that collapses the `explore_<dir>_for_<N>_blocks` combinatorial family
into a single parameterized skill. It is **idempotent and safe to
re-run**: it writes a new skill file only if missing, adds the index
entry only if absent, and marks the legacy entries `deprecated: true`
(without deleting the `.js` files, so the migration is reversible
by flipping the flag). It is also "exhausted" — running it on a
clean checkout of the current `main` reports
"54 legacy entries newly deprecated" the first time and 0 thereafter.

### `world-builder/`

The `mcwb` Python package (masterplan → world). Python 3.11+,
standalone `pyproject.toml`, pytest suite. Has its own `AGENTS.md`.

```bash
cd world-builder
python3 -m venv .venv && source .venv/bin/activate    # Python 3.11+
pip install -e ".[dev]"        # 'litemapy' and the package itself are required for the tests
pytest                          # 38 tests
mcwb validate --plan ../docs/masterplans/04-combined-complex
```

The committed `.venv/` was created in WSL; on Windows, create a fresh
venv (`python -m venv .winvenv`) and reinstall. See
`world-builder/AGENTS.md` for the Python 3.13 + amulet-core trap.

### `world-showcase/`

The IANLAN NextGen Next.js 15 report library, deployed to Railway.
Has its own `AGENTS.md`.

```bash
cd world-showcase
npm install
npm run build                    # next build
npm run start                    # next start
npm run dev                      # local dev on :3000

# Sync the two accepted report packages from the repo-root generators:
npm run sync:underground
npm run sync:coordinates
```

`next lint` is interactive in this project (no ESLint config) and
unusable in non-interactive shells. CI lives on Railway and runs
`npm run build` only. The required production env vars
(`SITE_PASSCODE`, `SITE_SESSION_SECRET`) are listed in the root
`.env.example`; both must be set in Railway's runtime variables.

## Build, Lint, Test, Run

### Backend (repo root)

- Build: `npm run build`
- Focused survival checks: `npx vitest run test/survival/SurvivalMission.test.ts test/survival/SurvivalIntegrationSafety.test.ts test/config.schema.test.ts`
- Dev run: `npm run dev`
- Production run: `npm start`
- **Do NOT hand-start a second instance.** The stack runs under systemd as
  `mc-fleet-bot.service` (port 3001) and `mc-fleet-web.service` (port 3000).
  Starting `node dist/index.js` while the service is up spawns a second fleet
  using the same bot usernames — the duplicate login kicks the real bot, which
  the impersonation monitor flags and puts into `QUARANTINED`, and it
  deliberately does not reconnect (`src/bot/BotInstance.ts:527-540`).
- Restart instead: `sudo systemctl restart mc-fleet-bot` (after `npm run build`).
  Do not `kill` the listener without restarting it — `Restart=on-failure` treats
  SIGTERM and a clean exit as an intentional stop and will leave the fleet down.
  `POST /api/admin/restart` has the same problem: it exits 0, so it stops the
  fleet rather than restarting it.
- Guarded physical releases must use `scripts/rcon_runner.py --strict-noop
  --report <json>`. In strict mode, a source-state drift that produces “nothing
  changed” is a failure instead of being folded into the success count.

### Frontend (`web/`)

- Dev run: `npm run dev --prefix web`
- Build: `npm run build --prefix web`
- Start built app: `npm run start --prefix web`
- Lint entire frontend: `npm run lint --prefix web`
- Lint a single file: `npm run lint --prefix web -- src/app/page.tsx`
- Lint a folder: `npm run lint --prefix web -- src/components`

### Testing

Run all backend tests:
```bash
npm test
```

Run backend tests in watch mode:
```bash
npm run test:watch
```

Run a specific test file:
```bash
npx vitest run test/control/CommandCenter.test.ts
```

Run the focused Combined Zones R07G Empty Eight egress-headhouse compiler and
post-release QA tests:
```bash
npx vitest run \
  test/build/combinedZonesR07GEmptyEightEgressHeadhouses.test.ts \
  test/build/qaCombinedZonesR07GEmptyEightEgressHeadhousesPostRelease.test.ts
```

Run the focused MP07 Ravensreach–MainStreet full-circulation compiler regression:
```bash
npx vitest run test/build/mp07RrmsaFullCirculation.test.ts
```

Run the focused SYS-03 R10 High-16 descending-bypass source-level protocol regression:
```bash
npx vitest run test/build/sys03R10High16DescendingBypassProtocol.test.ts
```

The bypass proposal generator (`scripts/generate_sys03_r10_high16_descending_bypass_protocol.mjs`)
always emits `mutationAuthority: false`. It is civil-only and needs a separately
accepted exact owner/interface renewal (generated and fail-closed by
`scripts/accept_sys03_r10_high16_descending_bypass_owner_interface_renewal.mjs`),
fresh release kernel, independent post
QA (`scripts/qa_sys03_r10_high16_descending_bypass_independent_post.mjs`), and
evidence finalizer (`scripts/finalize_sys03_r10_high16_descending_bypass_release.mjs`)
before it may be recorded as an executed release. It never authorizes rail,
public/service opening, or passenger service.

`scripts/compile_mp07_rrmsa_full_circulation_01.mjs` requires an explicitly
accepted exact three-cell ownership contract, hash-bound to the supplied
complete immutable snapshot, before it will emit static operations. It never
authorizes execution. After a guarded physical release, use
`scripts/qa_mp07_rrmsa_full_circulation_independent_post.mjs` to prove the
three exact target states, all 48 forward and 48 reverse normal-walk paths,
and zero below-three-wide cross-sections from the immutable post snapshot.

Run all control platform tests:
```bash
npx vitest run test/control/
```

Run the FleetCraft outbound bridge tests:
```bash
npx vitest run test/integrations/FleetCraftClient.test.ts
```

Run the focused citizen-fleet regression suite:
```bash
npx vitest run \
  test/control/CivicMobility.test.ts \
  test/town/ResidentIdentity.test.ts \
  test/voyager/CitizenSandboxApis.test.ts \
  test/voyager/CivicShiftCode.test.ts \
  test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts \
  test/voyager/BlackboardManager.roleDispatch.test.ts \
  test/worker/WorkerGeneration.test.ts \
  test/config.schema.test.ts
```

Run the deterministic civic-shift executor tests alone:
```bash
npx vitest run \
  test/voyager/CivicShiftCode.test.ts \
  test/voyager/VoyagerLoop.civicShiftNoLlm.test.ts
```

### New as-built visual sync scripts (2026-08-27)

- `scripts/publish_mp11_c01_main_switchback_transition_01_as_built_visuals.mjs` - publish C01 main switchback transition 01 as-built visuals (evidence-bound, read-only)
- `scripts/publish_mp11_c01_upper_portion_redesign_01_as_built_visuals.mjs` - publish C01 upper-portion redesign 01 as-built visuals
- `scripts/publish_mp11_c01_upper_landing_endpoint_opening_transition_01_as_built_visuals.mjs` - publish C01 upper-landing endpoint/opening/transition 01 as-built visuals
- `scripts/publish_c01_next_01_arrival_landing_wayfinding_as_built_visuals.mjs` - publish C01-NEXT-01 arrival-corridor wayfinding cadence visuals (existing build, AS-BUILT in source)
- `world-showcase/scripts/sync_c01_as_built_visuals_20260827.mjs` - sync all 3 C01 as-built visual sets into the dashboard
- `world-showcase/scripts/sync_poi_coordinate_directory_20260827.mjs` - sync the 2026-08-27 POI coordinate directory into the dashboard
- `world-showcase/scripts/sync_underground_report_20260827.mjs` - sync the 2026-08-27 underground navigation report into the dashboard
- `world-showcase/scripts/sync_c01_next_01_visual_20260827.mjs` - sync the C01-NEXT-01 visual into the dashboard

Available test files:
- `test/control/CommandCenter.test.ts` - command dispatch, cancellation, timeout, fan-out
- `test/control/MissionManager.test.ts` - mission lifecycle, VoyagerLoop bridge, dependencies, queues
- `test/control/MarkerStore.test.ts` - markers, zones, routes, spatial lookup, zone containment
- `test/control/SquadManager.test.ts` - squad CRUD, membership, getSquadsForBot
- `test/control/RoleManager.test.ts` - role assignments, one-role-per-bot, overrides, expiry
- `test/control/CommanderService.test.ts` - NL parsing (with/without LLM), plan execution
- `test/control/integration.test.ts` - cross-service integration (commands, missions, markers, squads)

Run frontend tests:
```bash
cd web && npm test
```

### Useful Runtime Checks

- Bot API status: `curl -s http://127.0.0.1:3001/api/status`
- List bots: `curl -s http://127.0.0.1:3001/api/bots`
- Stream logs: `tail -f /var/log/mc-fleet-bot.log`
- Filter important backend log events: `grep -E "task proposed|Execution result|task evaluated" /var/log/mc-fleet-bot.log`
- Import MainStreet America's authored room bounds after `npm run build`: `node scripts/import_mainstreet_floorplans.js`
- Persistent OpenCode session: `scripts/opencode-tmux.sh` (override its session, working directory, or command with `OPENCODE_TMUX_SESSION`, `OPENCODE_TMUX_WORKDIR`, and `OPENCODE_TMUX_CMD`).

### World Showcase Datacenter Deployment

- The World Showcase is served from `http://10.80.13.16` by the
  `ianlan-nextgen.service` and Nginx on `pdian02web02`. Its Next process is
  loopback-only on port 3000; Nginx is the sole port-80 listener.
- Deploy with `scripts/deploy_world_showcase_datacenter.sh`. It requires the
  dedicated key and pinned host fingerprint in `.deploy-keys/`; it must never
  fall back to password authentication or copy `.env` files.
- Railway is a rollback deployment until a DNS/TLS cutover is explicitly
  performed. Do not destroy it merely to publish a datacenter build.

## Control Platform Services (`src/control/`)

The control platform provides centralized fleet management:

- **CommandCenter** (`CommandCenter.ts`) - Dispatches immediate bot commands (pause, resume, stop, move, follow, guard, patrol, unstuck). Handles fan-out for multi-bot commands, timeout detection, concurrent command protection, and cancellation with pathfinder cleanup.
- **MissionManager** (`MissionManager.ts`) - Manages longer-running missions with full lifecycle (draft, queued, running, paused, completed, failed, cancelled). Bridges to VoyagerLoop for `queue_task` missions, checks command dependencies before starting, detects stale missions, and maintains per-bot priority queues.
- **MarkerStore** (`MarkerStore.ts`) - Persists world markers (named 3D positions), zones (rectangular or circular 2D areas), and routes (ordered waypoint sequences). Provides spatial helpers: `findNearestMarker` and `isInsideZone`.
- **SquadManager** (`SquadManager.ts`) - CRUD for squads with bot membership management. Supports `getSquadsForBot` lookup.
- **RoleManager** (`RoleManager.ts`) - One-role-per-bot assignment system with autonomy levels (manual, assisted, autonomous). Tracks manual overrides with 5-minute auto-expiry.
- **CommanderService** (`CommanderService.ts`) - Natural language command parsing via LLM. Produces structured plans with confidence scores, then executes plans by dispatching commands and creating missions.

## API Endpoint Summary

### Bot Management
- `GET /api/status` - server status
- `GET/POST/DELETE /api/bots` - list, create, delete all bots
- `GET/DELETE /api/bots/:name` - get or delete a specific bot
- `POST /api/bots/:name/mode` - change bot mode
- `GET /api/bots/:name/detailed` - detailed bot info
- `GET /api/bots/:name/inventory` - bot inventory
- `GET /api/bots/:name/relationships` - bot relationships
- `GET /api/bots/:name/conversations` - bot conversation history
- `GET /api/bots/:name/tasks` - bot task history
- `POST /api/bots/:name/chat` - send chat as bot
- `POST /api/bots/:name/task` - queue a task

### Bot Actions (convenience shortcuts)
- `POST /api/bots/:name/pause` - pause voyager
- `POST /api/bots/:name/resume` - resume voyager
- `POST /api/bots/:name/stop` - stop movement
- `POST /api/bots/:name/follow` - follow a player
- `POST /api/bots/:name/walkto` - walk to coordinates

### Commands
- `POST/GET /api/commands` - create and list commands
- `GET /api/commands/:id` - get a command
- `POST /api/commands/:id/cancel` - cancel a command

### Missions
- `POST/GET /api/missions` - create and list missions
- `GET /api/missions/:id` - get a mission
- `POST /api/missions/:id/start|pause|resume|cancel|retry` - lifecycle actions
- `GET/PATCH /api/bots/:name/mission-queue` - per-bot mission queue

### World (Markers, Zones, Routes)
- `GET/POST /api/markers` - list and create markers
- `PATCH/DELETE /api/markers/:id` - update and delete
- `GET/POST /api/zones` - list and create zones
- `PATCH/DELETE /api/zones/:id` - update and delete
- `GET/POST /api/routes` - list and create routes
- `PATCH/DELETE /api/routes/:id` - update and delete

### Squads
- `GET/POST /api/squads` - list and create squads
- `GET/PATCH/DELETE /api/squads/:id` - CRUD
- `POST /api/squads/:id/members` - add bot
- `DELETE /api/squads/:id/members/:botName` - remove bot

### Roles
- `GET /api/roles` - list all role assignments
- `POST /api/roles/assignments` - create assignment
- `GET/PATCH/DELETE /api/roles/assignments/:id` - CRUD
- `GET/DELETE /api/bots/:name/override` - get/clear override

### Commander (NL parsing)
- `POST /api/commander/parse` - parse natural language into a plan
- `POST /api/commander/execute` - execute a parsed plan

### Other
- `GET /api/relationships` - all bot relationships
- `GET /api/skills` - list skills
- `GET /api/skills/:name` - get a skill
- `GET /api/world` - world state
- `GET /api/blackboard` - shared blackboard
- `GET /api/activity` - activity log
- `POST /api/swarm` - spawn multiple bots
- `POST /api/events/chat|player-join|player-leave` - event hooks

## Running the Dashboard

Backend (port 3001):
```bash
npm run build && npm start
```

Frontend (port 3000, in a separate terminal):
```bash
npm run dev --prefix web
```

The frontend connects to the backend API at `http://localhost:3001` and uses Socket.IO for real-time updates.

## Verified Commands

- `npm run build` in the repo root succeeds.
- `npx vitest run` from the repo root has pre-existing failures: the
  `test/build/` Combined Zones tests read `data/world-review/*.json`,
  and `data/` is gitignored, so on a fresh clone ~60 test files fail
  on `ENOENT` regardless of code state. **That is structural, not a
  regression** — do not debug it as one. The team-c review
  re-verified the count: 130 test files pass, 72 fail (mostly the
  data-fixture ones), with one unhandled worker timeout.
- `npm run lint --prefix web` currently reports 168 existing frontend
  warnings and errors (134 errors, 34 warnings). Do not assume the
  frontend is lint-clean before making changes; check whether failures
  are pre-existing.
- `npm run check` in `tools/fleet-devtools/` succeeds (lint + build + test +
  format:check); 55/55 tests pass on a fresh `npm install` once
  cross-platform native modules are rebuilt — see "Cross-platform
  install traps" below.
- `pytest` in `world-builder/` (against a fresh venv with
  `pip install -e ".[dev]"`) runs 38 tests, all pass. Note: the
  committed `.venv/` is a WSL/Linux venv; on Windows, create a new
  venv (`python -m venv .winvenv`) — see `world-builder/AGENTS.md`.
- `npm run build` in `world-showcase/` succeeds (7/7 routes).
  `next lint` is interactive in this project; do not invoke
  non-interactively.

## Cross-platform install traps

A single OS-switch of `node_modules/` produces these confusing errors,
none of which are application bugs:

- `better-sqlite3` throws `\\?\…\better_sqlite3.node is not a valid
  Win32 application.` (or `invalid ELF header` on the inverse). Fix:
  `npm rebuild better-sqlite3` from the affected workspace.
- `npm test` fails at config load with `Host version "X" does not
  match binary version "Y"` (esbuild). Fix:
  `rm -rf node_modules && npm install` from the affected workspace.
- `npm install` warns `Cannot find module @rollup/rollup-win32-x64-msvc`
  (npm optional-dep bug). Fix: `npm install @rollup/rollup-win32-x64-msvc
  --no-save` from the affected workspace, or `rm -rf node_modules &&
  npm install`.
- `npm run build` or `npm run lint` fails on Windows with
  `'next' is not recognized as an internal or external command`.
  Fix: `node node_modules/next/dist/bin/next build` (CI on Railway
  is unaffected).
- The committed `world-builder/.venv/` is a WSL/Linux venv. On
  Windows, create a fresh one with `python -m venv .winvenv`.

The general fix for any of these is `rm -rf node_modules && npm install`
in the affected workspace; the specific fixes above are faster.

## TypeScript And Build Expectations

- Backend TypeScript is strict (`strict: true`) and compiles with `tsc` to `dist/`.
- Backend module target is CommonJS.
- Frontend TypeScript is also strict and uses Next.js bundler resolution.
- Frontend path alias `@/*` maps to `web/src/*`.
- Avoid introducing new tsconfig relaxations unless absolutely necessary.

## Import Conventions

- Keep imports at the top of the file.
- Backend usually groups imports as: external packages, then local relative imports.
- Frontend usually prefers project alias imports like `@/components/...` and `@/lib/...` over deep relative paths.
- Use `import type` for type-only imports when practical; the repo already does this in multiple places.
- Prefer named exports for utilities, functions, classes, and interfaces.
- Re-export small action surfaces through barrel files only where the repo already does so, such as `src/actions/index.ts`.

## Formatting Conventions

- Backend files predominantly use single quotes and semicolons.
- Frontend files are mixed, but many current files also use single quotes; preserve the style of the file you touch.
- Use 2-space indentation.
- Keep object literals and JSX props multiline when they become dense.
- Prefer trailing commas in multiline objects, arrays, params, and JSX where existing formatting already uses them.
- Do not reformat unrelated files just to normalize quote style.

## Naming Conventions

- Classes, interfaces, type aliases, enums: `PascalCase`.
- Functions, methods, variables, object keys: `camelCase`.
- Constants that are true constants or config arrays: `UPPER_SNAKE_CASE`.
- Filenames for backend classes and domain modules often use `PascalCase.ts` (`BotManager.ts`, `VoyagerLoop.ts`).
- Filenames for simple action helpers often use `camelCase.ts` (`mineBlock.ts`, `walkTo.ts`).
- Route/page files in Next.js must follow framework naming (`page.tsx`, `layout.tsx`).

## Types And Data Modeling

- Prefer explicit interfaces and type aliases for API shapes and domain records.
- Reuse existing exported types instead of recreating parallel shapes.
- Keep backend request and response payloads structurally simple and JSON-friendly.
- Prefer `Record<string, T>` for map-like JSON data already persisted or returned by APIs.
- Minimize `any`; existing backend code uses `any` at third-party or parsing boundaries, but new code should prefer narrowing.
- In the frontend, ESLint currently enforces `@typescript-eslint/no-explicit-any`; avoid introducing new `any` there.
- Use union string literals for finite states, modes, and statuses when practical.

## Error Handling

- Fail early on invalid input and return structured errors.
- In Express handlers, validate request data first and respond with `400`, `404`, `409`, or `500` as appropriate.
- After sending an Express response in a guard branch, `return` immediately.
- Log operational failures with the shared `logger` from `src/util/logger.ts`.
- Include contextual fields in logs (`bot`, `player`, `filename`, etc.) when they aid diagnosis.
- Throw `Error` objects for fatal backend failures; return `{ success: false, message }` for action-style helper results.
- Preserve existing user-facing phrasing unless there is a reason to improve clarity.

## Backend Coding Patterns

- Keep bot action helpers small and outcome-oriented; they usually return `{ success, message, data? }`.
- Normalize bot lookup keys with `name.toLowerCase()` when interacting with `BotManager` maps.
- Prefer synchronous filesystem access only in startup/load/save paths where the repo already does that.
- Keep API route logic thin; push behavior into coordinators, managers, or domain classes when it grows.
- Use the shared singleton logger instead of ad hoc `console.log`.
- Preserve Mineflayer and Socket.IO integration patterns already established in the repo.

## Frontend Coding Patterns

- Add `'use client';` only when a component actually needs client-side hooks or browser APIs.
- Prefer Zustand store access through selectors (`useBotStore((s) => s.botList)`).
- Keep API access centralized in `web/src/lib/api.ts`.
- Prefer typed props and typed API responses.
- Use existing visual language and Tailwind utility patterns rather than inventing a separate design system.
- Keep pages focused on orchestration and rendering; move reusable UI into `web/src/components/`.

## State, Side Effects, And React

- Keep effects for I/O, subscriptions, and synchronization work.
- Avoid introducing new lint violations around `setState` inside effects, ref mutation during render, or missing dependencies.
- Derive UI state from props/store when possible instead of duplicating it locally.
- Memoize callbacks only when it meaningfully helps dependency stability or expensive rendering.

## Working In A Dirty Repo

- The working tree may contain user changes.
- Never revert or overwrite unrelated edits you did not make.
- If a file already has unrelated modifications, make the smallest safe change that solves the task.
- When reporting results, distinguish your changes from pre-existing lint or code issues.

## Files And Generated Artifacts

- Do not hand-edit `dist/` unless the user explicitly asks.
- Make source changes in `src/` and `web/src/`.
- Treat `data/` and `skills/` as runtime artifacts unless the task is specifically about their contents.
- Avoid committing secrets from `.env` or other local-only files.

## Suggested Agent Workflow

- Read the relevant source files first and infer local conventions before editing.
- For backend changes, run `npm run build` from the repo root.
- For frontend changes, run `npm run lint --prefix web` on touched files or the full app when practical.
- If you add a new command, script, or workflow, update this file.
- If you add tests, include both full-suite and single-test commands here.

## World Catalog Workflow

- Generate a read-only database census, full feature export, object-to-media
  crosswalk, capture manifest, and HTML/Markdown report into a fresh directory:

```bash
node scripts/generate_world_catalog.mjs \
  --out data/exports/world-catalog-YYYY-MM-DD \
  --snapshot data/worldsnap/region \
  --surface-atlas data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a \
  --media-root data/exports/redevelopment-qa-YYYY-MM-DD
```

- The generator opens `data/world-map.db` and `data/town.db` read-only and reads
  only copied Anvil files. It does not connect to or mutate the live world.
- Repeat `--media-root` to inventory post-release evidence directories. Exact
  object links still come from database evidence attributes or reviewed manual
  mappings; discovering a PNG alone does not fabricate a relationship.
- Do not overwrite a prior catalog. Refresh `data/worldsnap/region` first when a
  current saved-world baseline is required, then use a new dated output path.

## Underground Navigation Report Workflow

- Generate the read-only underground inventory, geographic and skywalk-style
  maps, C01 level graphs, evidence book, and HTML report:

```bash
node scripts/generate_underground_navigation_report.mjs
```

- Print the generated HTML with headless Chromium, then validate and seal all
  report artifacts:

```bash
/home/ianwalmsley/.cache/ms-playwright/chromium_headless_shell-1181/chrome-linux/headless_shell \
  --headless --no-sandbox --disable-gpu --allow-file-access-from-files \
  --print-to-pdf=docs/redevelopment/2026-07-28-underground-navigation/underground-navigation-report.pdf \
  --print-to-pdf-no-header \
  file:///opt/stacks/mc-fleet-bot/docs/redevelopment/2026-07-28-underground-navigation/underground-navigation-report.html
node scripts/finalize_underground_navigation_report.mjs
```

- Sync the sealed package into the IANLAN NextGen source and build it:

```bash
npm run sync:underground --prefix world-showcase
npm run build --prefix world-showcase
```

- The generator opens `data/world-map.db` read-only and reads accepted manifests,
  immutable-snapshot identity, and existing media. It never connects to
  Minecraft, RCON, the fleet API, systemd, Railway, Sites, or Box.
- Keep ISSUE-002 open unless a separate field survey proves the C01 relocation,
  road, parking recovery, and sunken entrance. The east-stack graph is catalog
  evidence, not proof of those surface conditions.

## POI Coordinate Directory Workflow

- Generate Report 04 as a read-only directory of every durable
  `world_features` record:

```bash
node scripts/generate_poi_coordinate_directory.mjs
```

- Print the generated HTML with headless Chromium, then validate and seal the
  report package:

```bash
/home/ianwalmsley/.cache/ms-playwright/chromium_headless_shell-1181/chrome-linux/headless_shell \
  --headless --no-sandbox --disable-gpu --allow-file-access-from-files \
  --print-to-pdf=docs/redevelopment/2026-07-29-poi-coordinate-directory/poi-coordinate-directory.pdf \
  --print-to-pdf-no-header \
  file:///opt/stacks/mc-fleet-bot/docs/redevelopment/2026-07-29-poi-coordinate-directory/poi-coordinate-directory.html
node scripts/finalize_poi_coordinate_directory.mjs
```

- Sync the sealed HTML, JSON, CSV, PDF, portal summary, QA, and manifests into
  IANLAN NextGen and build it:

```bash
npm run sync:coordinates --prefix world-showcase
npm run build --prefix world-showcase
```

- The six report groups are surface builds, remote sites, PassageWay access,
  route/station infrastructure, anomalies/controls, and candidate parcels.
  **PassageWay is the proper name of the underground tunnel system.**
- Copy-ready `/tp` commands prefer catalog-authored entrances and exact points,
  then route starts. Area centers are labeled as derived references; when a
  usable Y is unavailable, the command uses `~` rather than inventing an
  elevation. The directory is not a landing-safety claim.
- The generator opens `data/world-map.db` read-only and binds the accepted
  immutable snapshot. It never connects to or mutates Minecraft, RCON, the
  fleet API, systemd, Railway, Sites, or Box.

## Town Expansion Global Cross-Scope Gate

- Run the complete offline ownership/interface gate with:

```bash
node --max-old-space-size=8192 scripts/generate_town_expansion_r1.mjs \
  --audit-cross-scope-only \
  --audit-cross-scope-out docs/redevelopment/2026-07-28-town-expansion/evidence/town-expansion-global-cross-scope-interface-audit.json \
  --audit-cross-scope-md-out docs/redevelopment/2026-07-28-town-expansion/town-expansion-global-cross-scope-interface-audit.md
```

- Require `GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS`, zero unreviewed
  interfaces, and an exact one-to-one match between observed interfaces and
  `town-expansion-cross-scope-interface-contracts.json`.
- Publication subscopes may share only the explicit canonical owners declared
  in the compiler. Every residual physical seam is default-deny and must match
  exact direction, cell count, transition count, bounds, cell-set hash,
  component count, largest component, and component-set hash. Wildcards and
  broad last-writer-wins approvals are prohibited.
- Run the focused regression with:

```bash
npx vitest run test/build/townExpansionCrossScopeGate.test.ts
```

## Town Expansion R1 Post-Release QA

- Normal update settlement may advance unwaxed copper oxidation. Never edit the
  canonical forward or rollback files to accommodate that lifecycle. The only
  accepted exception is the exact-point, rollback-only policy bound to rollback
  SHA-256 `1edf4d1004ce5ff59b5c15cb8f1d16ea9de04f52b47a68aad7f0828a58ab88de`:

```bash
data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy.json
```

- Generate the policy-aware rollback preflight from the immutable post snapshot:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --regions <immutable-postrelease-region-directory> \
  --natural-transition-policy \
    data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy.json \
  --report data/world-review/town-expansion-r1-rollback-poststate-policy-preflight-20260728.json
```

- The policy admits only its 14 declared points on lines 99992 and 99994, only
  same-family forward copper oxidation, and only identical block properties.
  Hash, evidence, undeclared point, waxed state, family, direction, or property
  drift fails closed. It is never valid for a forward execution.
- Focused policy, post-QA, runner, importer, and wrapper regressions:

```bash
npx vitest run \
  test/build/naturalStateTransitionPolicy.test.ts \
  test/build/qaTownExpansionPostRelease.test.ts \
  test/build/importTownExpansionRelease.test.ts
python3 test/scripts/test_rcon_runner.py
python3 test/scripts/test_atomic_release_runner_contract.py
```

- Parser-only rollback validation uses the same policy contract:

```bash
python3 scripts/rcon_runner.py \
  data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --dry-run --strict-noop --operation-role rollback \
  --natural-transition-policy \
    data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy.json \
  --policy-audit-report \
    data/world-review/town-expansion-r1-rollback-natural-transition-plan-audit-20260728.json \
  --report data/buildops/town-expansion-r1-2026-07-28.rollback-policy-dry-run.json
```

- The policy-aware report above is the required rollback preflight for this
  committed post snapshot. A plain exact preflight remains useful as negative
  evidence, but it cannot satisfy final acceptance after natural oxidation.

- Generate a new snapshot-specific rollback transition policy only from a
  complete unpolicy preflight, without replacing any prior policy/evidence:

```bash
node scripts/generate_natural_state_transition_policy.mjs \
  --evidence <complete-unpolicy-rollback-preflight.json> \
  --operation data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --policy-id <unique-snapshot-specific-policy-id> \
  --out <new-natural-transition-policy.json> \
  --audit <new-policy-generation-audit.json>
```

- The generator is all-or-nothing: every unexpected cell must be an exact
  same-family forward unwaxed-copper oxidation with identical properties. It
  binds the unchanged rollback SHA-256, complete preflight SHA-256, and
  snapshot SHA-256, and refuses policy output if even one point is unrelated,
  waxed, reverse oxidation, property drift, undeclared, duplicated, or outside
  its canonical operation group. A failed generation audit is negative
  evidence only and cannot be supplied to preflight, the runner, or final
  acceptance.

## Town Expansion Terminal Recovery And Logical Base Source

- The 49-cell red-carpet recovery is an exact one-cell package and inverse:

```text
data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt
  bbbc0e74ebaa857d5a235535d68d069df73bd1b81516aef4495352fa54be4b16
data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.rollback.txt
  e2f49273472cd0a16c34aba4407bde6ed0b2494eec38cd1c3b569cc260192a64
```

- It was committed atomically with the disjoint eight-cell citizen ridge
  package. The immutable physical execution source is
  `8d2a7816ce142db91f274320e5b4405b9d9a0a3ecd3ce2357f591f8fe6fce19b`
  and the immutable post snapshot is
  `c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751`.
  Both exact inverses pass on that post snapshot.
- Finalize and validate the two-package transaction as one atomic supplemental
  group. Never fabricate an intermediate snapshot between its packages. The
  finalizer refuses to overwrite the canonical artifacts; run it only when
  those outputs do not yet exist:

```bash
node scripts/finalize_town_expansion_terminal_recovery.mjs
npx vitest run \
  test/build/finalizeTownExpansionTerminalRecovery.test.ts
```

- The finalized ledger is
  `data/world-review/town-expansion-terminal-provenance-and-ridge-recovery-committed-supplement-20260728T1839Z.json`.
  Its explicit source-provenance bridge preserves the prior logical terminal
  identity `71f52acf...` and the distinct physical execution identity
  `8d2a7816...`. It proves exact source-guard equivalence only for the 57
  disjoint package targets; it never claims full snapshot equality.
- The carpet recovery remains a physical source correction, not a
  natural-transition exception. For the base rollback, apply its hash-bound
  operation file as a logical source overlay to the preserved accessibility
  source, then generate a new copper-only policy from the complete unpolicy
  result:

```bash
node --max-old-space-size=8192 scripts/preflight_guarded_ops.mjs \
  data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --regions data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region \
  --source-overlay-ops \
    data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt \
  --report \
    data/world-review/town-expansion-r1-base-rollback-preflight-carpet-recovered-logical-source-20260728.json
node scripts/generate_natural_state_transition_policy.mjs \
  --evidence \
    data/world-review/town-expansion-r1-base-rollback-preflight-carpet-recovered-logical-source-20260728.json \
  --operation data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --policy-id \
    town-expansion-r1-base-rollback-copper-carpet-recovered-logical-source-20260728 \
  --out \
    data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json \
  --audit \
    data/world-review/town-expansion-r1-base-rollback-transition-policy-carpet-recovered-logical-source-audit-20260728.json
```

- Require exactly 4,529 natural copper points, 61 rules, zero unsupported
  points, and policy SHA-256
  `d2d3529f9f7a932a843a8583136df83b5cd2ca33ab08830334e554ec807e858a`.
  Then run the complete policy-aware preflight with the same source overlay:

```bash
node --max-old-space-size=8192 scripts/preflight_guarded_ops.mjs \
  data/buildops/town-expansion-r1-2026-07-28.rollback.txt \
  --regions data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region \
  --source-overlay-ops \
    data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt \
  --natural-transition-policy \
    data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy-carpet-recovered-logical-source.json \
  --report \
    data/world-review/town-expansion-r1-base-rollback-policy-preflight-carpet-recovered-logical-source-20260728.json
```

- The consolidated result must be 483,016/483,016 with preflight SHA-256
  `dbae24353312cc4dd24a34618975706c0cc002e239ae0f5f32d480c909c8d730`.
  Also run the complete strict-noop parser dry-run with the same policy and a
  policy plan audit. The policy never authorizes the carpet overlay or any
  forward execution.

## Scoped Guarded-Preflight Evidence Reuse

- `preflight_guarded_ops.mjs` supports an inclusive 1-based operation group
  range. It computes and executes the complete backward target-overlap
  dependency closure, binds the whole operation SHA-256, exact immutable
  snapshot identity, optional transition-policy SHA-256, optional logical
  source-overlay plan, selected group/line range, and selected/dependency plan
  hashes:

```bash
node scripts/preflight_guarded_ops.mjs <rollback.txt> \
  --regions <immutable-regions> \
  --group-start <first-group> \
  --group-end <last-group> \
  --natural-transition-policy <policy.json> \
  --source-overlay-ops <executed-recovery-ops.txt> \
  --report <shard-report.json>
```

- Omit both optional arguments only when the final run also omits them.
  Schema-v4 shard reports set `failurePointsComplete: false`,
  `reusableEvidenceOnly: true`, and
  `satisfiesFinalConsolidatedPreflight: false`; they cannot seed a natural
  transition policy or satisfy final acceptance.
- Recombine shards only when they cover every group exactly once:

```bash
node scripts/recombine_guarded_preflight_shards.mjs \
  --ops <rollback.txt> \
  --regions <immutable-regions> \
  --natural-transition-policy <policy.json> \
  --source-overlay-ops <executed-recovery-ops.txt> \
  --shard <shard-1.json> \
  --shard <shard-2.json> \
  --out <recombined-scoped-evidence.json>
```

- The combiner recomputes group/line plans and dependency closures and rejects
  operation, snapshot, policy, overlay, coverage, overlap, or gap drift.
  Its PASS is reusable scoped evidence only. Before release acceptance or
  execution, always run one consolidated full preflight and the complete
  strict-noop parser dry-run.
- Focused tests:

```bash
npx vitest run \
  test/build/recombineGuardedPreflightShards.test.ts \
  test/build/finalizeTownExpansionTerminalRecovery.test.ts
```

- Run the read-only, manifest-driven final acceptance verifier with:

```bash
node --max-old-space-size=8192 scripts/qa_town_expansion_post_release.mjs \
  --pre <immutable-prerelease-region-directory> \
  --post <immutable-postrelease-region-directory> \
  --transaction <town-expansion-atomic-transaction-ledger.json> \
  --supplemental-transaction <ordered-committed-supplement-ledger.json> \
  --source-equivalence-preflight <complete-base-forward-preflight.json> \
  --live-entity-gate <town-expansion-live-entity-gate.json> \
  --rollback-poststate-preflight data/world-review/town-expansion-r1-rollback-poststate-policy-preflight-20260728.json \
  --rollback-transition-policy data/buildops/town-expansion-r1-2026-07-28.rollback-natural-transition-policy.json \
  --route-qa <town-expansion-post-release-route-qa.json> \
  --design-report data/buildops/town-expansion-r1-2026-07-28.report.json \
  --manifest data/buildops/town-expansion-r1-2026-07-28.manifest.json \
  --out data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json \
  --markdown docs/redevelopment/2026-07-28-town-expansion/post-release-qa.md
```

- Repeat `--supplemental-transaction` in execution order for every committed
  post-base package. In supplemental mode, the base rollback preflight/policy
  must bind the first supplement's exact source snapshot, every adjacent
  supplement post/source identity must match, and the last supplement post
  identity must equal `--post`. Omitting, reordering, or hash-drifting any
  ledger fails the `supplemental-release-chain-bound` gate. The accepted QA
  report emits one schema-v2 consolidated release identity for the base
  transaction, every supplement and its nested evidence, and the terminal
  snapshot.
- `--source-equivalence-preflight` is required when the committed
  transaction's exact immutable pre snapshot is not byte-identical to the
  design report and ownership manifest source snapshot. It may replace only
  that whole-snapshot equality: the report must bind the supplied transaction
  pre path/hash and exact base forward path/hash, cover every base REPL group,
  pass every group with zero failures and complete failure-point evidence, and
  be order-aware. Scoped or reusable shards are rejected. The transaction pre
  path itself must still match exactly. The importer rechecks the proof
  artifact and consolidated release-identity binding and permits a registry
  prerelease-hash difference only when the proof gate binds the registry's
  exact design/manifest identity to the distinct transaction-pre identity.
- Add `--media-report <town-expansion-post-release-media-report.json>` when
  matched post-release media is available. Supplying it makes media identity,
  package hash, capture file, and image hash mandatory; it is otherwise an
  optional gate.
- `node scripts/qa_town_expansion_post_release.mjs --contract` prints the
  evidence contract and `--self-test` runs a positive/negative synthetic exact
  inverse check. Focused tests:

```bash
npx vitest run test/build/qaTownExpansionPostRelease.test.ts
```

- Accept the release only when the verifier reports `PASS` and `ACCEPTED`.
  It must bind the report/manifest/transaction/entity/rollback/route artifacts,
  prove exact forward/rollback target bijection, bind distinct immutable
  pre/post snapshot identities, and report zero failed gates. It is read-only
  and must never substitute for the live entity gate, atomic runner, or post
  snapshot capture.
- The route artifact must be a non-projected immutable-post-snapshot result:
  `projection` must be null/absent,
  `completeForTownExpansionOfflineAcceptance` must be true, its acceptance
  class must be
  `IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING`,
  and its post directory and hash must exactly bind the supplied post snapshot.
  An offline repair projection is always rejected even when it reports `PASS`.

## Town Expansion Representative Route QA

- Run the complete immutable-post-snapshot representative route gate with:

```bash
node --max-old-space-size=8192 scripts/qa_town_expansion_routes.mjs
npx vitest run test/build/qaTownExpansionRoutes.test.ts
```

- The exact manifest is
  `docs/redevelopment/2026-07-28-town-expansion/town-expansion-representative-route-manifest.json`.
  It covers C01 entrance/garage/levels/backrooms, civic and the isolated
  Library-Guild tunnel, Ravensgate isolation, Westlight venues/stadium/pier,
  MainStreet parking/warehouse, the Iowa data district and Concord, the
  observatory/portal gallery, and the citizen commute.
- The verifier reads only the immutable Anvil snapshot and the declared
  evidence files. It uses bounded normal-walk searches with no dig, tower,
  parkour, sprint, or jump control, records both directions and exact path/state
  hashes, and fails closed on identity, coverage, isolation, or geometry drift.
- `PASS` accepts offline geometry only. A same-save live Mineflayer walk,
  powered-door/airlock checks, dynamic entity clearance, and the separately
  controlled citizen activation walk remain live-only gates.

## Town Expansion Accessibility Repair

- Generate the offline-only exact-guarded repair for the eight rejected
  representative routes:

```bash
node --max-old-space-size=8192 \
  scripts/generate_town_expansion_accessibility_repair.mjs
```

- The generator preserves the original failing manifest/report under
  `data/world-review/archive/town-expansion-r1-accessibility-repair-baseline-20260728/`.
  It canonicalizes block-state property order before comparing sources and
  replacements, omits semantic no-ops, and fails closed if any survive. The
  first stopped attempt and its exact prefix-566 recovery remain bound under
  `data/world-review/archive/town-expansion-r1-accessibility-repair-semantic-noop-attempt1-20260728/`.
  It corrects the retired C01 portal waypoint and emits one-cell forward and
  exact-inverse rollback `REPL` operations for the seven physical disconnects.
- Independently preflight and parser-check the package:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.txt \
  --regions data/worldsnap-town-accessibility-source-restored-20260728T1735Z/region \
  --report data/world-review/town-expansion-r1-accessibility-repair-preflight-20260728.json
python3 scripts/rcon_runner.py \
  data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.txt \
  --dry-run --strict-noop --operation-role forward \
  --report data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.dry-run.json
python3 scripts/rcon_runner.py \
  data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.rollback.txt \
  --dry-run --strict-noop --operation-role rollback \
  --report data/buildops/town-expansion-r1-accessibility-repair-2026-07-28.rollback.dry-run.json
npx vitest run \
  test/build/qaTownExpansionRoutes.test.ts \
  test/build/generateTownExpansionAccessibilityRepair.test.ts
```

- A projected `PASS` is design evidence only. It is never accepted as as-built
  evidence and must not be supplied to final Town Expansion acceptance. Live
  release still requires a fresh frozen entity gate, strict-noop execution,
  immutable post snapshot, exact post-state route rerun, powered-door checks,
  and live no-dig/no-tower walks.

- After the committed accessibility repair and terminal one-cell citizen
  clearance, generate the separate no-overlay as-built route contract with:

```bash
node --max-old-space-size=8192 \
  scripts/generate_town_expansion_accessibility_as_built_route_qa.mjs
```

- The finalizer is pinned to terminal snapshot
  `data/worldsnap-town-accessibility-citizen-final-20260728T1745Z/region`
  (SHA-256
  `71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d`)
  and accessibility forward SHA-256
  `b042a63f6947554b701db0a56e970ef9054e5941a7c979f8c3f761d93d11cc3b`.
  It validates the 1,526/1,526 attempt-2 commit, zero no-ops/failures, both
  rollback post-state preflights, and the one-cell citizen clearance. It
  preserves projected artifacts and writes distinct as-built manifest,
  report, and Markdown paths. Never pass `--overlay-ops` for this gate.

## Town Expansion Full-Preflight Source Recovery

- After any failed transaction and completed rollback, keep the world frozen,
  take a new immutable snapshot, and rerun the **entire** canonical preflight.
  Preflight schema v2 records the canonical operation hash and every unexpected
  target; older sampled reports are deliberately rejected by recovery tooling:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/town-expansion-r1-2026-07-28.txt \
  --regions <immutable-postrollback-region-directory> \
  --report <full-live-source-preflight.json>
```

- Generate bounded one-cell source-restoration guards offline:

```bash
node --max-old-space-size=8192 scripts/generate_guarded_source_recovery.mjs \
  --ops data/buildops/town-expansion-r1-2026-07-28.txt \
  --preflight <full-live-source-preflight.json> \
  --out <bounded-source-recovery.txt> \
  --verification <bounded-source-verification.txt> \
  --audit <bounded-source-recovery.audit.json>
```

- The generator repairs only a mismatch on a cell's first canonical touch. It
  reconstructs all later operation-order projections, records cascaded
  failures without writing them, rejects incomplete block states,
  non-contiguous multi-stage chains, incomplete failure evidence, and any
  possible block-entity/NBT target. It never connects to RCON.
- Review the audit, run the parser-only strict dry-run, obtain a fresh entity
  gate, and use only the Paper-strict, strict-noop runner while the world stays
  frozen. After any authorized recovery, take another immutable snapshot and
  require both the bounded verification preflight and the complete canonical
  preflight to pass. Bounded verification is not a substitute for the complete
  483,016-group source preflight.
- Focused tests:

```bash
npx vitest run test/build/guardedSourceRecovery.test.ts
```

## Town Expansion R1 Post-Release Media

- Before regenerating or bulk-rendering the paired media manifest, preflight all
  165 authored C01 schedule cameras and all eight C01 object-level cameras
  against the accepted immutable post snapshot:

```bash
node scripts/preflight_town_expansion_c01_cameras.mjs \
  --regions <immutable-postrelease-region-directory> \
  --out data/world-review/town-expansion-c01-camera-preflight-20260728.json \
  --image-dir data/exports/town-expansion-media-2026-07-28/c01-camera-preflight
npx vitest run test/build/preflightTownExpansionC01Cameras.test.ts
```

- Require `PASS`, 165/165 schedule cameras, 8/8 object cameras, zero failed or
  rejected render attempts, clear eye occupancy and look targets, and the
  unchanged image gate. The object gate includes the five L1-L5 scopes plus the
  owner club arrival, owner residence, and owner tunnel detour; the tunnel view
  must bind the reviewed refuge-room/five-wide-route geometry. Candidate images
  are preflight evidence, not final paired media, and must never be written to
  canonical `pass-1/` or `pass-2/` paths.
- Preflight the complete Founders' Gallery sales-office camera family against
  the same immutable post snapshot. This covers both authored publication
  views and the exact compiler-scope alias, binding six paired captures:

```bash
node scripts/preflight_town_expansion_sales_office_cameras.mjs \
  --regions <immutable-postrelease-region-directory> \
  --out data/world-review/town-expansion-sales-office-camera-preflight-20260728.json \
  --image-dir data/exports/town-expansion-media-2026-07-28/sales-office-camera-preflight
npx vitest run \
  test/build/preflightTownExpansionSalesOfficeCameras.test.ts
```

- Require `PASS`, 3/3 family shots, six paired captures bound, zero failed or
  rejected attempts, clear eye occupancy and look targets, exact-object
  containment, and the unchanged image gate. Preserve any rejected raw image
  and metadata under `rejected-captures/`.
- Preflight the complete Gilded Raven camera family against the same immutable
  post snapshot. This covers both publication views and the exact compiler
  scope alias, binding six paired captures:

```bash
node scripts/preflight_town_expansion_gilded_raven_cameras.mjs \
  --regions <immutable-postrelease-region-directory> \
  --out data/world-review/town-expansion-gilded-raven-camera-preflight-20260728.json \
  --image-dir data/exports/town-expansion-media-2026-07-28/gilded-raven-camera-preflight
npx vitest run \
  test/build/preflightTownExpansionGildedRavenCameras.test.ts
```

- Require `PASS`, 3/3 family shots, six paired captures bound, zero failed or
  rejected attempts, clear eye occupancy, exact-object framing targets and
  first visible surfaces, and the unchanged image gate. The sole exterior eye
  exception is the reviewed south-facade standoff declared by the preflight;
  the other two eyes must remain inside their exact objects. Preserve the
  camera-in-floor reject and its metadata under `rejected-captures/`.
- The media generator consumes all three default PASS preflight reports when
  present
  and fails closed on their schedules, snapshots, reports, accepted-image,
  geometry, occupancy, line-of-sight, and quality identities. Use
  `--no-c01-camera-preflight` only to generate or test the unaudited source
  contract. Likewise, `--no-sales-office-camera-preflight` is for unaudited
  source generation only, and `--no-gilded-raven-camera-preflight` is for
  unaudited source generation only. Never bulk-render any such variant as
  accepted post-state evidence.
- The combined renderer archives a low-information output and its exact
  metrics under `rejected-captures/` before failing. Preserve these artifacts;
  do not overwrite them during a corrected rerender.

- Generate the deterministic object/database/media crosswalk, whole-world and
  district maps, and matched first/second-pass camera contract offline:

```bash
node scripts/generate_town_expansion_media_manifest.mjs \
  --post-snapshot <immutable-postrelease-region-directory>
npx vitest run test/build/generateTownExpansionMediaManifest.test.ts
```

- Run the read-only complete static camera gate before bulk rendering:

```bash
node scripts/preflight_town_expansion_media_manifest.mjs \
  --manifest data/exports/town-expansion-media-2026-07-28/capture-manifest.json \
  --crosswalk data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json \
  --regions <immutable-postrelease-region-directory> \
  --output-dir data/exports/town-expansion-media-2026-07-28 \
  --out data/world-review/town-expansion-media-static-preflight-20260728.json
npx vitest run test/build/preflightTownExpansionMediaManifest.test.ts
```

- Require `PASS`, 1,178 unique cameras/output paths, 589 exact paired shots,
  identical paired geometry, valid perspective/map coordinates, both
  all three render-backed family preflights bound to the selected snapshot,
  and preserved rejected archives. This static gate renders no images.

- The generator reads the current canonical compiler report and
  `data/world-map.db` read-only. It writes 340 exact-object records, 589 stable
  shots, 13 maps, and 1,178 paired captures under
  `data/exports/town-expansion-media-2026-07-28/` for the current compiler
  report. Regenerate rather than hardcoding those counts if the compiler report
  changes.
- The crosswalk is an expected-post-state evidence contract, not an as-built
  claim. Each object has a fail-closed `truth` block. Future expansion and
  reservation scopes may claim only the exact marker, wall, construction
  staging, or parcel treatment encoded by guarded operations—not a completed
  future building.
- Render the combined paired manifest only from the accepted, immutable
  post-release snapshot:

```bash
node scripts/render_redevelopment_camera_manifest.mjs \
  --manifest data/exports/town-expansion-media-2026-07-28/capture-manifest.json \
  --regions <immutable-postrelease-region-directory> \
  --out-dir <fresh-snapshot-bound-output-directory> \
  --report <fresh-snapshot-bound-output-directory>/capture-report.json \
  --resume
```

- `--resume` writes `.render-binding.json` before the first camera. Repeating
  the exact command reuses only nonblank outputs under the same manifest,
  snapshot, and output-directory binding; it rerenders missing, corrupt,
  undersized, or low-information outputs and rejects binding drift. Never aim
  it at an output directory containing unbound prior-snapshot captures.
- For a long resumed sweep, keep decoded-world memory bounded by rendering
  short-lived index slices. This does not replace the final complete report:

```bash
npm run render:media:batched -- \
  --manifest data/exports/town-expansion-media-2026-07-28/capture-manifest.json \
  --regions <immutable-postrelease-region-directory> \
  --out-dir <snapshot-bound-output-directory> \
  --slice-start <first-unresolved-index> --slice-end <exclusive-end> \
  --batch-size 10 --diagnostic-continue-on-reject
```

- Every batch must pass and release its process memory. Then run the canonical
  complete renderer once with `--resume` and no slice flags; only that complete
  report can be supplied to media QA. Preserve all per-batch reports and
  rejected archives for diagnosis.

- Finalize the post-state media only after rendering:

```bash
node scripts/qa_town_expansion_media_release.mjs \
  --manifest data/exports/town-expansion-media-2026-07-28/capture-manifest.json \
  --capture-report data/exports/town-expansion-media-2026-07-28/capture-report.json \
  --post <immutable-postrelease-region-directory> \
  --design-report data/buildops/town-expansion-r1-2026-07-28.report.json \
  --out data/world-review/town-expansion-r1-post-release-media-2026-07-28.json
```

- The media QA fails if the supplied snapshot equals the prerelease snapshot,
  the manifest/report/package hashes disagree, any exact object lacks its
  declared pair, paired cameras or deterministic image hashes differ, a capture
  is orphaned, or any image is missing, blank, or hash-invalid. Only its
  `PASS`/`ACCEPTED_POST_RELEASE_MEDIA` report may be supplied through
  `--media-report` to the Town Expansion post-release verifier. Never label a
  prerelease render as final evidence.

## Town Expansion PM Dossier And Artifact Register

- Prepare the full July 28 review package in explicitly non-final draft mode:

```bash
node scripts/generate_redevelopment_artifact_register.mjs \
  --profile town-expansion --mode draft
node scripts/generate_redevelopment_dossier.mjs \
  --profile town-expansion --mode draft --html-only
npx vitest run test/build/generateTownExpansionDocumentationProfile.test.ts
```

- Draft mode compiles the frozen 98-requirement scope, all Town Expansion
  research/source-of-truth Markdown, engineering schedules, citizen reports,
  entity/deployment/database status, 13 reserved map views, representative
  exact-object screenshot slots, and the byte-hashed artifact ledger. It is
  labeled `DRAFT — NOT AS-BUILT`; missing post-release images remain visible
  placeholders.
- Final/as-built mode fails closed before writing unless one canonical
  transaction is committed, the immutable post snapshot differs from the
  prerelease snapshot, live entity clearance and independent post QA pass,
  paired media QA accepts all captures and exactly 13 maps, the database import
  is atomic and verified, the read-only database publication report passes,
  and every referenced SHA-256 agrees.
- Run the artifact register before the dossier. Supply identical evidence
  overrides to both final commands:

```bash
node scripts/generate_redevelopment_artifact_register.mjs \
  --profile town-expansion --mode final \
  --transaction <ledger.json> --post <immutable-post-region-dir> \
  --post-qa <post-qa.json> --media-qa <media-qa.json> \
  --db-import <database-closeout.json> --db-report <database-report.json>
node scripts/generate_redevelopment_dossier.mjs \
  --profile town-expansion --mode final \
  --transaction <ledger.json> --post <immutable-post-region-dir> \
  --post-qa <post-qa.json> --media-qa <media-qa.json> \
  --db-import <database-closeout.json> --db-report <database-report.json>
```

- Draft files use `.draft` in their names. Accepted final outputs are
  `docs/redevelopment/2026-07-28-town-expansion/master-plan.html`,
  `master-plan.pdf`, `artifact-register.md`, and
  `requirements-status-matrix.{json,md}`, plus
  `data/world-review/town-expansion-artifact-manifest-2026-07-28.json`.
- Do not generate or distribute the final PDF before those gates pass.

## Redevelopment Dossier And Sites Showcase

- Prepare the static, versioned website payload from the generated world catalog:

```bash
node scripts/prepare_world_showcase.mjs \
  --source data/exports/world-catalog-YYYY-MM-DD \
  --surface data/exports/box/redevelopment-atlas-YYYY-MM-DD/team-a
```

- `--source`, `--surface`, `--site`, and `--underground` allow an as-built
  release to consume new, non-overwriting catalog/atlas directories.
- This copies public maps, building floor plans, approved screenshots, and
  machine-readable reports into `world-showcase/public/`, then generates the
  compact 68-building browser catalog. It is offline and read-only with respect
  to the live world and databases.
- Compile the Markdown source-of-truth documents, maps, and evidence figures into
  the large HTML/PDF master-plan dossier:

```bash
node scripts/generate_redevelopment_dossier.mjs
```

- The dossier source lives in `docs/redevelopment/2026-07-27/`; the generated PDF
  is copied to `world-showcase/public/reports/master-plan.pdf`.
- Validate the standalone Sites source from `world-showcase/` with:

```bash
npm install
npm run build
npm run build:worker
```

- `world-showcase/.openai/hosting.json` contains an opaque Sites project ID. Copy
  it verbatim and never derive, replace, or reformat it.
- Push the exact committed `world-showcase/` source state before saving a Sites
  version. Any uploaded archive must be built from that same commit.

## Raven Rock S1 Section Pilot Workflow

- Generate the bounded 11-station S1 section pilot from the immutable
  redevelopment snapshot:

```bash
node scripts/generate_ravenrock_s1_pilot.mjs
```

- Independently simulate the completed section and exact rollback:

```bash
node scripts/qa_ravenrock_s1_pilot.mjs
```

- Run the generic exact-state guard preflight and parser-only RCON dry runs:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region \
  --report data/buildops/ravenrock-s1-section-pilot-2026-07-27.preflight.json
python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-s1-section-pilot-2026-07-27.txt --dry-run
python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-s1-section-pilot-2026-07-27.rollback.txt --dry-run
```

- Focused generator/QA tests:

```bash
npx vitest run test/build/generateRavenRockS1Pilot.test.ts
```

- The release is pinned to snapshot SHA-256
  `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`.
  Do not execute against a different saved-world state; regenerate the
  package. The forward and rollback files are exact one-cell `REPL` operations.
  Live execution also requires the free-entity, active-builder, before-media,
  and post-build walk/evidence gates in
  `docs/redevelopment/2026-07-27/tunnel-repair-release.md`.

## C01 Bunker Surface Phase 1 Workflow

- Generate the bounded surface-concealment and east-edge-road package from the
  immutable redevelopment snapshot:

```bash
node scripts/generate_bunker_surface_phase1.mjs
```

- Preflight every exact state, run parser-only dry runs, then execute the
  independent QA:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt \
  --regions data/worldsnap-redevelopment-c9e2bf0a-20260727/region \
  --report data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.preflight.root.json
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.dry-run.root.json
python3 scripts/rcon_runner.py \
  data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.rollback.dry-run.root.json
node scripts/qa_bunker_surface_phase1_independent.mjs
```

- The package is pinned to snapshot SHA-256
  `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`.
  It contains 28,729 exact-state forward/rollback cell pairs and three guarded
  sign-NBT commands. Do not execute it against a different saved-world state.
- Live execution remains gated by the free-entity, active-builder,
  before-media, protected-inventory, post-census, bidirectional-walk, and
  same-camera evidence requirements in
  `docs/redevelopment/2026-07-27/bunker-surface-release.md`.
- Phase 1 is not the final seven-wide terrain-following mountain road, relocated
  portal, or zero-shell/three-block-cover concealment package. Those remain a
  separate Phase 2 release.

## MainStreet R4/R5 Redevelopment Workflow

- Generate the 18-garage, two-rear-alley, B02/B03 public-realm package from the
  immutable redevelopment snapshot:

```bash
node scripts/generate_mainstreet_redevelopment_r4_r5.mjs
```

- Independently reconstruct the exact source state, rollback bijection,
  garage usability, alley grade/headroom, protected-feature exclusions,
  database-feature contract, parser reports, and same-camera evidence:

```bash
node scripts/qa_mainstreet_redevelopment_r4_r5_independent.mjs
```

- Run the focused generator tests:

```bash
npx vitest run test/build/generateMainstreetRedevelopmentR4R5.test.ts
```

- The release is pinned to snapshot SHA-256
  `c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654`
  and contains 5,981 exact one-cell forward/rollback pairs. Do not execute it
  against a different saved-world state.
- The independent QA result is
  `data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27.independent-qa.json`.
  A passing offline result is implementation-ready, not a live completion
  claim.
- Live execution remains gated by the fresh-snapshot comparison, entity
  clearance, coordinated atomic execution, post-release snapshot, garage and
  bidirectional-alley movement tests, and matched after captures in
  `docs/redevelopment/2026-07-27/mainstreet-surface-release.md`.

## MainStreet Picket Fence Workflow

- The reviewed fence design is `docs/mainstreet-america/planning/picket-fence.yaml`.
- Refresh the local source data before generating fence operations:

```bash
python3 scripts/world_snapshot.py --near=0,0 --radius 320
```

- Generate the 32-column visual pilot and the full terrain-following perimeter:

```bash
node scripts/generate_picket_fence.mjs --mode pilot
node scripts/generate_picket_fence.mjs --mode full
```

- Default outputs are:
  - `data/buildops/msa_picket_fence_pilot.txt`
  - `data/buildops/msa_picket_fence_pilot.report.json`
  - `data/buildops/msa_picket_fence_full.txt`
  - `data/buildops/msa_picket_fence_full.report.json`
- Generation is offline and read-only. It decodes the local Anvil snapshot and
  must not connect to or mutate the live world.
- Review every collision, skipped column, water-plinth column, and grade break in
  the JSON report before execution. A generated ops file is tied to the snapshot
  listed in its report; regenerate after any newer world changes.
- Fence operations use exact-material `REPL` guards. They may replace air,
  explicitly identified replaceable plants, or top-layer water for an approved
  plinth. At a 1..4-block outward detour only, the generator may minimally prune
  exact-matched leaves or mangrove-root blocks when the whole corridor remains
  obstructed; it never cuts logs or blindly overwrites an occupied target. The
  report lists every such block under `trimmedFoliage`.
- A full artifact is execution-ready only when its report shows zero final
  collisions, skips, gate violations, non-orthogonal edges, path branches, and
  unresolved grade discontinuities, with all baseline conflicts resolved.
- Dry-run both generated files before any authorized build:

```bash
python3 scripts/rcon_runner.py data/buildops/msa_picket_fence_pilot.txt --dry-run
python3 scripts/rcon_runner.py data/buildops/msa_picket_fence_full.txt --dry-run
```

- Run the focused generator tests with:

```bash
npx vitest run test/build/generatePicketFence.test.ts
```

- Do not execute either fence file live without reviewing the corresponding
  report and coordinating with other active world-building work.

## Raven Rock Wave 2 Tunnel Workflow

- The immutable Wave 2 engineering baseline is
  `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region`, SHA-256
  `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b`.
  Do not substitute mutable `data/worldsnap/region`.
- Generate the complete Raven Rock route/node/stair inventory and the
  `INF-RR-02` T2b dry liner pilot with:

```bash
node scripts/generate_ravenrock_t2b_wave2.mjs
```

- The selected pilot is x `-145..-136`. The originally prescribed x `-135`
  terminal station is an explicit wet-boundary exclusion: the baseline contains
  water at x `-135/-134`, z `177..179`, y `1..9`. Do not add x `-135` by hand.
- Every changed cell is an addition-only, one-cell, exact-air `REPL`. Generation
  must abort if a target is a fluid/gravity/waterlogged cell or shares a face
  with one.
- Run independent QA and focused tests with:

```bash
node scripts/qa_ravenrock_t2b_wave2.mjs
npx vitest run test/build/generateRavenRockT2bWave2.test.ts
node scripts/finalize_ravenrock_t2b_wave2.mjs
```

- Run the immutable source preflight and both parser dry runs with:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.txt \
  --regions data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.preflight.json

python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.txt \
  --dry-run --strict-noop \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.dry-run.json

python3 scripts/rcon_runner.py \
  data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.rollback.dry-run.json
```

- The full engineering handoff is
  `docs/redevelopment/2026-07-28-wave2/ravenrock-tunnel-wave2-engineering.md`.
- The authoritative offline-release state is
  `data/buildops/ravenrock-t2b-liner-pilot-wave2-2026-07-28.release.json`.
  It remains unauthorized for live execution until its same-moment and live
  gates pass. Required bidirectional endpoints are `(-145,3,187)` and
  `(-136,2,182)`.
- Offline PASS never authorizes live execution. A new same-moment snapshot,
  full guard match, repeated neighbor-fluid census, entity/player clearance,
  fixed transaction order, post snapshot, bidirectional normal-walk QA, and all
  six matched after images remain mandatory.

## Wave 2 Combined Release Audit

- The combined transaction source of truth is
  `data/buildops/redevelopment-wave2-release-manifest.json`. Read its opaque
  prerelease region path and hash directly; do not substitute the earlier
  engineering baseline or mutable `data/worldsnap/region`.
- Reproduce the offline integration decision without connecting to Minecraft:

```bash
node scripts/qa_wave2_integration_independent.mjs
```

- Require `PASS_OFFLINE_GO_LIVE_GATES_PENDING`, 887 explicit targets, two
  reactive fence states, zero cross-package/R1/protected intersections, and no
  failed gates before running any live entity or transaction step.
- After a committed transaction, run the read-only post-release verifier with
  the immutable post snapshot and exact transaction, route, and after-capture
  reports:

```bash
node scripts/qa_wave2_post_release.mjs \
  --post <immutable-post-region-directory> \
  --transaction <wave2-atomic-transaction-ledger.json> \
  --route-report <wave2-bidirectional-route-report.json> \
  --raven-after-report <raven-after-capture-report.json> \
  --mainstreet-after-report <mainstreet-after-capture-report.json> \
  --database data/world-map.db
```

- `node scripts/qa_wave2_post_release.mjs --contract` prints the required route
  endpoints and evidence schema. A release is accepted only when the verifier
  reports `PASS` for the transaction, 887 explicit plus two reactive post
  states, 887 rollback guards, both bidirectional routes, all 14 matched after
  captures, and all 51 database feature imports.

## Wave 2 Post Atlas And Dossier

- Generate the seven-sheet post-release atlas only from the accepted immutable
  Wave 2 post snapshot:

```bash
node scripts/generate_surface_atlas.mjs \
  --regions data/worldsnap-wave2-postrelease-d05ac7822795eff0-20260728/region \
  --out data/exports/box/redevelopment-atlas-wave2-post-2026-07-28/team-a
```

- After the final post-release verifier and documentation are stable, generate
  the Wave 2-specific artifact register and master dossier:

```bash
node scripts/generate_redevelopment_artifact_register.mjs --profile wave2
node scripts/generate_redevelopment_dossier.mjs --profile wave2
```

- The Wave 2 dossier is written to
  `docs/redevelopment/2026-07-28-wave2/master-plan.html` and
  `docs/redevelopment/2026-07-28-wave2/master-plan.pdf`. Unlike the default R1
  dossier profile, `--profile wave2` does not copy the PDF into Sites source.
  Run it again after any source document or machine report changes so the
  register and compiled dossier remain synchronized.

## Redevelopment R1 As-Built Verification

- The accepted immutable post-release snapshot is:
  `data/worldsnap-postrelease-f8edf99494c023dd-20260728/region`
  with SHA-256
  `f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`.
- Verify the coordinated release without mutating the live world:

```bash
node scripts/qa_redevelopment_atomic_release.mjs \
  --pre data/worldsnap-prerelease2-42545b02f60fa881-20260727/region \
  --post data/worldsnap-postrelease-f8edf99494c023dd-20260728/region
```

- The final independent walking record is
  `data/world-review/redevelopment-route-qa-2026-07-27.json`. It was produced by
  `scripts/run_redevelopment_route_qa_standalone.mjs` with a temporary
  non-digging, non-towering client and passed 22/22 tests / 44/44 directions.
  Do not weaken resident production leash/mining safeguards to rerun route QA.
- Refresh post-state publication artifacts offline:

```bash
node scripts/generate_surface_atlas.mjs \
  --regions data/worldsnap-postrelease-f8edf99494c023dd-20260728/region \
  --out data/exports/box/redevelopment-atlas-post-2026-07-27/team-a

node scripts/generate_world_catalog.mjs \
  --snapshot data/worldsnap-postrelease-f8edf99494c023dd-20260728/region \
  --out data/exports/world-catalog-post-2026-07-27

node scripts/generate_redevelopment_artifact_register.mjs
node scripts/generate_redevelopment_dossier.mjs
```

- Do not replay the accepted forward operation files. Use post-state QA and
  rollback preflight for read-only verification. Any future physical phase
  requires a new snapshot, fresh exact guards, entity clearance, and a separate
  atomic transaction.

## Wave 2 Exact-Object Media Catalog

- The accepted offline media baseline is
  `data/worldsnap-wave2-baseline-4fca1ff3-20260728/region`, SHA-256
  `4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b`.
- Generate the 55-building / 24-circulation camera release, exact route
  diagrams, and C01 recessed-portal floor-plan supplement offline:

```bash
node scripts/generate_wave2_media_release.mjs
node scripts/render_redevelopment_camera_manifest.mjs \
  --manifest data/exports/redevelopment-media-wave2-2026-07-28/capture-manifest.json \
  --regions data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --out-dir data/exports/redevelopment-media-wave2-2026-07-28 \
  --report data/exports/redevelopment-media-wave2-2026-07-28/capture-report.json
```

- Build a distinct catalog. Include the prior accepted catalog as a media root
  because five valid building captures are intentionally retained:

```bash
node scripts/generate_world_catalog.mjs \
  --out data/exports/world-catalog-wave2-2026-07-28 \
  --snapshot data/worldsnap-wave2-baseline-4fca1ff3-20260728/region \
  --surface-atlas data/exports/box/redevelopment-atlas-post-2026-07-27/team-a \
  --media-root data/exports/redevelopment-media-wave2-2026-07-28 \
  --media-root data/exports/redevelopment-qa-2026-07-27 \
  --media-root data/exports/world-catalog-post-2026-07-27
```

- Validate before publication:

```bash
node scripts/qa_wave2_media_catalog.mjs
npx vitest run test/build/generateWave2MediaRelease.test.ts
```

- Acceptance requires 79 unique, target-valid, visually passing images; 79
  exact Wave 2 catalog links; and 69/69 buildings with exact screenshots and
  floor plans. The full source of truth and remaining non-building queue are in
  `docs/redevelopment/2026-07-27/wave2-media-catalog-release.md`.
- These workflows decode copied Anvil files and read databases offline. They
  must not connect to or mutate the live world. Generate a new output directory
  for a future accepted media wave; do not overwrite this release.

## July 28 Town-Expansion Session Memory

- Before planning, generating, releasing, documenting, or publishing July 28
  town-expansion work, read
  `docs/redevelopment/2026-07-28-town-expansion/SESSION_MEMORY.md` in full.
- That ledger preserves the owner's binding corrections, exact counts,
  requested-versus-live truth boundary, latest underground C01 vehicle-garage
  program, non-graphic furnished adult-space policy, and closeout requirements.
- If an older design source conflicts with a later supersession recorded in the
  memory ledger, reconcile the source and release artifacts before execution;
  never weaken an acceptance check to fit stale generated work.

## Manager Vale Five-Cottage Compiler Workflow

- Generate the dedicated five-cottage commission package, protected
  block-entity migration ledger, private-suite furnishing evidence, cameras,
  database features, and post-C01 integration handoff offline:

```bash
node scripts/manager_vale_cottage_compiler.mjs
node scripts/qa_manager_vale_cottage_compiler.mjs
npx vitest run test/build/generateManagerValeCottageCompiler.test.ts
```

- The compiler is pinned to
  `data/worldsnap-town-expansion-prerelease-20260728T0930Z/region`,
  SHA-256
  `f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e`.
  It freezes five attached garages with exactly 24 automotive bays, 55 rooms,
  406 furnishing groups, 35 scheduled private-suite fixture groups, 45
  cameras, ten two-wide stairs, and 41 protected source block entities.
- Run exact-source preflight and parser-only strict-noop dry runs before any
  integration decision:

```bash
node scripts/preflight_guarded_ops.mjs \
  data/buildops/manager-vale-five-cottages-2026-07-28.txt \
  --regions data/worldsnap-town-expansion-prerelease-20260728T0930Z/region \
  --report data/buildops/manager-vale-five-cottages-2026-07-28.preflight.json

python3 scripts/rcon_runner.py \
  data/buildops/manager-vale-five-cottages-2026-07-28.txt \
  --dry-run --strict-noop \
  --report data/buildops/manager-vale-five-cottages-2026-07-28.dry-run.json

python3 scripts/rcon_runner.py \
  data/buildops/manager-vale-five-cottages-2026-07-28.rollback.txt \
  --dry-run --strict-noop \
  --report data/buildops/manager-vale-five-cottages-2026-07-28.rollback.dry-run.json
```

- The package commissions destinations before copying and verifying all 41
  protected block entities. It contains no source-cottage retirement. Offline
  PASS never authorizes live execution; live clearance, coordinated atomic
  integration, post-state routes, cameras, database import, and a separately
  reviewed source-retirement transaction remain required.

## Five-Citizen Post-Restart Observation Gate

- After an operator starts `mc-fleet-bot.service`, run the read-only observer:

```bash
node scripts/audit_citizen_post_restart.mjs \
  --observe \
  --duration-minutes 45 \
  --minimum-minutes 20
```

- The observer does not start, stop, or restart services and sends only HTTP
  GET requests. Its only writes are paired timestamped JSON and Markdown
  reports under `data/runtime-audits/`.
- It fails closed unless the persisted config/database state still matches the
  current internally hashed Ravensreach-to-MainStreet contract, one systemd PID
  remains active, exactly the five named citizens retain their exact roles,
  every citizen completes its deterministic outbound-inspection-return civic
  shift plus a structured local routine, the sample window covers day and
  night, and sampled departure, destination, and return progress remains near
  the reviewed corridor.
- Any quarantine/impersonation incident, worker replacement, log rotation,
  protected dig/place rejection, civic-shift failure, repeated failed outcome,
  or bounded stationary/stuck loop fails the report. A PASS is observation
  evidence; it does not authorize world edits or another release.
- Run the synthetic pass/fail tests without a live service:

```bash
npx vitest run test/scripts/auditCitizenPostRestart.test.ts
```

## Town Expansion R1 Database Closeout

- The dedicated importer is `scripts/import_town_expansion_release.mjs`.
  It defaults to read-only dry-run and consumes the schema-v2 canonical
  registry at
  `data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json`.
- Never pass `--commit` until the exact immutable post snapshot, committed
  base transaction, every ordered committed supplemental transaction, final
  matched-media QA, and accepted post-release QA all exist and a dry-run has
  passed. Pass the same repeated `--supplemental-transaction` arguments used
  for post-release QA; the importer refuses a missing, extra, or reordered
  ledger. A write additionally requires
  `--expected-db-sha256` equal to the hash printed by that dry-run.
- The importer refuses planned-only/unbuilt objects, map-only IDs, inferred
  relationships, evidence/hash drift, incomplete capture pairs, and database
  integrity/schema drift. A verified future-site marker remains a marker; it
  does not imply that the future building or program is complete.
- Features, one deterministic scan, and all exact observations are upserted in
  one SQLite `IMMEDIATE` transaction with rollback on error and an
  integrity-checked pre-import backup. Do not weaken these gates for a partial
  import.
- After an authorized successful import, generate the read-only census:

```bash
node scripts/report_town_expansion_database.mjs \
  --registry data/exports/town-expansion-media-2026-07-28/object-media-database-crosswalk.json \
  --database data/world-map.db \
  --out data/world-review/town-expansion-r1-database-publication-report-2026-07-28.json
```

- Both closeout and publication reports expose the accepted post snapshot,
  forward package, crosswalk, media-QA, post-release-QA, transaction, and
  database hashes. Full commands and truth policy are in
  `docs/redevelopment/2026-07-28-town-expansion/town-expansion-database-closeout.md`.
- Run the isolated database fixtures with:

```bash
npx vitest run test/build/importTownExpansionRelease.test.ts
```

## Citizen Cross-City Route Activation

- The accepted offline route contract is centralized in
  `scripts/lib/citizen-route-contract.mjs`. It is bound to immutable post
  snapshot `1f036e48a82ccd5061e34686b049700e861b7a3bc99f69bd03ee3b1c1b2e463a`,
  exact-path SHA-256
  `9fe7e7bae1c2fde2243ee42a7322d2a8ac763042a9bc8eef69f44adce71ca701`,
  540 exact cells, and 49 routine checkpoints.
- The four width chokes at `(-82,65,-206)`, `(-82,66,-158)`,
  `(-82,65,-110)`, and `(-79,65,-79)` must remain explicitly disclosed.
  Offline walkability is not live activation approval.
- While `mc-fleet-bot.service` is stopped, validate the non-mutating corridor
  preview:

```bash
node scripts/apply_citizen_cross_city_route.mjs \
  --phase corridor --dry-run
node scripts/run_citizen_route_live_walk.mjs --contract-check
```

- Corridor execution remains a separate coordinated action. Shift activation
  additionally requires a matching `PASS_BIDIRECTIONAL` audit containing all
  49 forward and all 49 reverse checkpoint results, the exact post/path
  identities, no protected dig observation, and the exact choke disclosure.
- Run the focused fail-closed activation tests with:

```bash
npx vitest run \
  test/scripts/citizenRouteActivationContract.test.ts \
  test/scripts/surveyCitizenCrossCityRoute.test.ts \
  test/scripts/auditCitizenPostRestart.test.ts
```

## Citizen Route Staging-Failure Diagnosis

- Reproduce the `(-79,68,-33)` to `(-82,65,-19)` pathfinder failure without
  connecting to Minecraft or writing world state:

```bash
node scripts/diagnose_citizen_route_staging_failure.mjs
npx vitest run test/scripts/citizenRouteStagingDiagnosis.test.ts
```

- The preserved diagnosis and one-cell proposal are in
  `docs/citizen-fleet/2026-07-28-citizen-route-live-walk-staging-diagnosis.md`
  and
  `data/world-review/citizen-route-live-walk-staging-diagnosis-20260728.json`.
  The proposal is not live authorization.
- Before any separately authorized repair, require a fresh frozen live-source
  snapshot, exact-source preflight, live entity clearance, strict-noop guarded
  execution, immutable post snapshot, fresh offline route survey, and the
  complete no-dig forward/reverse live walk.

## Masterplan Documentation Library

- `docs/masterplans/` is the only canonical masterplan root. Do not recreate a
  repository-root `masterplans/` directory.
- `docs/masterplans/README.md` is the area index and
  `docs/masterplans/current-masterplan.html` is the human-facing current-plan
  report. Keep both current when adding or renaming an area.
- Every durable `world_features.project_id` area must have a numbered directory
  with an AI-readable `MASTERPLAN.md` and a human-readable `masterplan.html`.
  Historical plans 01–05 retain their established filenames, with direct links
  from the library index and current-plan report.
- Treat `project_id + external_id` as the durable feature key. External IDs can
  repeat across projects, and broad X/Z envelopes are evidence bounds rather
  than ownership or collision proof.
- Use repository-relative links and images in Markdown/HTML. Do not add Windows
  drive paths or `file:///` asset URLs. Before sealing a documentation update,
  verify every local link, render each touched HTML report in headless Chromium,
  and run `git diff --check`.

## Combined Zones Phase 0 Terrain Survey

- The authority chain is Masterplans 01–03 internal architecture -> Masterplan
  04 normalized composition -> Masterplan 05 current-world placement, terrain,
  adapters, additions, interfaces, and delivery gates. The exact reconciliation
  is in `docs/masterplans/04-combined-complex/authority-reconciliation.json`.
- The re-sited Phase 0 package is in `docs/masterplans/05-combined-zones/` and passes
  all eleven siting gates. It binds rerun pre-check snapshot
  `fe7a3e5a...ab37` and post-check snapshot `05eebe12...271b`.
- The first run's final generated atlas `979e7805...4ead` remains candidate-search
  and negative-evidence source. The rerun needed no additional generation
  because every revised target chunk was already `minecraft:full`.
- The live box was generated in temporary 12x12-chunk tiles with:

```bash
python3 scripts/generate_phase0_survey_chunks.py \
  --start <zero-based-tile-index> \
  --count <bounded-batch-size>
```

- The helper requires the preserved live baseline of exactly 104 force-loaded
  chunks, removes each exact temporary tile in a `finally` block, and refuses
  baseline drift. Never substitute `forceload remove all`; those 104 tickets
  belong to existing world systems.
- Do not run the helper merely to reload chunks that the offline decoder already
  proves are full. Generate only missing bounded target chunks.
- Rank re-siting candidates from copied Anvil files with:

```bash
node --max-old-space-size=8192 \
  scripts/analyze_combined_zones_resiting.mjs \
  --regions \
    data/worldsnap-combined-zones-phase0-final-post-20260804T001002Z/region \
  --out docs/masterplans/05-combined-zones/resiting-candidate-analysis.json
```

- Regenerate the read-only terrain probe, area/structure census, raw raster,
  annotated current-plus-proposed map, and artifact hashes from immutable
  copied Anvil files with:

```bash
node --max-old-space-size=4096 \
  scripts/generate_combined_zones_phase0_survey.mjs \
  --regions \
    data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region \
  --pre-regions \
    data/worldsnap-combined-zones-phase0-rerun-pre-20260804T021237Z/region \
  --out-dir docs/masterplans/05-combined-zones
```

- The adopted normalized core origin is `(2048,-328)` at rotation 0. Gateway
  Approach is a decoupled current-world adapter. The Empty Eight shell is
  `x=1632..1872`, `z=40..160`, `y=38..54`, with rail `y=40`. It is wholly
  south of Gateway Approach, with eight east-west tracks and eight sealed east
  interfaces.
- The PASS is detailed-design evidence only. The corridor still discloses up to
  36 blocks of cut and 23 of fill, and the two igloos plus shipwreck inside the
  mountain envelope are mandatory no-touch constraints. No Phase 0 artifact
  authorizes world edits.

- Require exactly 14,238 full atlas chunks and 6,097 full revised-reserve
  chunks. The adopted transform passes Phase 0 siting: all five core anchors
  are dry, mountain and urban footprints are each below 3% water, and all
  29,161 Empty Eight columns are dry, non-arctic, and provide at least eight
  blocks of cover. The natural corridor is still not rail-grade; only the
  sampled engineered rail profile passes, with up to 36 blocks of cut and 23
  of fill. Do not turn surveyed terrain Y or fractional vertical-study values
  into build setout before exact rounding, ownership, and Phase 1 design gates.

- Validate the offline authority chain, exact 04-to-05 coordinate crosswalk,
  source hashes, map bounds, and retired-diagram boundary with:

```bash
npx vitest run test/build/masterplanAuthorityReconciliation.test.ts
```

- Run that focused test with the full backend suite using:

```bash
npm test
```

## Combined Zones Phase 1 Coordination And Release Gate

- Compile the deterministic, offline-only coordination record from the
  reconciled Masterplans 01–05 authority chain with:

```bash
node scripts/compile_combined_zones_phase1_geometry.mjs \
  --generated-at <stable-UTC-timestamp>
```

- The compiler writes
  `docs/masterplans/05-combined-zones/phase1-geometry-coordination.json`. It freezes
  exact rational vertical transforms, per-scope boundary semantics, and
  coordination-only cell envelopes. It deliberately emits zero operation and
  material cells while any declared geometry blocker remains.
- Validate the default-deny release graph and run every Combined Zones
  authority/Phase 1 regression with:

```bash
node scripts/validate_combined_zones_release_contract.mjs
node scripts/audit_combined_zones_r00_readiness.mjs
npm run test:masterplans
```

- Reproduce the exact copied-snapshot relic census and default-deny core audit
  with:

```bash
node scripts/audit_combined_zones_protected_relic_clearance.mjs
node scripts/audit_combined_zones_c1_pilot.mjs
node scripts/compile_combined_zones_c1_civil_design.mjs
node --expose-gc --max-old-space-size=4096 \
  scripts/audit_combined_zones_d05_hydrology_relic_buffers.mjs
node scripts/compile_combined_zones_empty_eight_geology_design.mjs
```

- The relic audit may freeze the complete recorded structure-start bounds as a
  zero-margin no-touch core, including air cells. It may not infer a positive
  buffer, intact-template status, ownership, observation access, or
  construction clearance. Require its G06 result to remain HOLD until reviewed
  positive buffers or accepted zero-margin treatment, exact proposed
  construction/interaction cells, and all relevant generated starts pass.
  Post-state preservation is later G16-G19 validation and cannot close R00 G06.
- The C1 pilot audit may freeze only its exact plan coordination envelope and
  reserve-first rail study setout. It emits zero operations. Do not promote it
  to a physical R01 target set while its highway profile, pale-garden/entity,
  block-entity, complete structure, hydrology, ownership/interface, fresh
  source, rollback, and authorization gates remain HOLD.
- The C1 civil design may freeze exact coordination geometry, independent
  grade-audited profiles, cross-sections, diagnostic quantities, drainage
  collection, and geometric C01 comparisons. It emits no construction cells.
  D02 remains HOLD until geotechnical, structural, outfall, ISSUE-002/ownership,
  visual, and construction-quantity gates pass.
- The D05 full-height audit is memory-intensive and must run with the declared
  Node heap. Its fluid/cryosphere components, D8 routing, and one-cell relic
  adjacency shells are exact copied-snapshot coordination evidence only.
  Require reviewed buffers, future influence cells, canonical owners, expert
  modelling, and frozen preservation/no-diversion criteria before D05 may pass
  G02. Rollback and poststate proof belong to G03-G19.
- The Empty Eight/geology compiler freezes internal design reservations and
  factual architectural-composite plaque wording. It does not claim building-
  code compliance or commission a safety system. External egress, ventilation,
  drainage, fire/service, and mechanism design remain HOLD for D06. Source
  guards, operations, preflight, pilot, rollback, and poststate QA belong to
  G03-G19; C2 remains omitted.

- Reproduce the autonomous D02/D05/D06 and connector evidence wave in this
  dependency order:

```bash
node scripts/generate_combined_zones_d02_authority_packet.mjs
npx vitest run test/build/combinedZonesD02S01S02RegionEvidence.test.ts
node scripts/generate_combined_zones_d05_conservative_defaults.mjs
node scripts/compile_combined_zones_d06_egress_geometry.mjs
node scripts/compile_combined_zones_phase1_connector_geometry.mjs
node scripts/audit_combined_zones_d05_relic_condition_access.mjs
node scripts/compile_combined_zones_d05_future_state_contract.mjs
node scripts/compile_combined_zones_cheyenne_jcurve_geometry.mjs
node scripts/compile_combined_zones_d06_life_safety_alternatives.mjs
node --max-old-space-size=4096 \
  scripts/compile_combined_zones_d05_future_mountain_alternatives.mjs
node --expose-gc --max-old-space-size=4096 \
  scripts/audit_combined_zones_d02_s03_hydrology_outfalls.mjs
node scripts/compile_combined_zones_d02_s04_closed_drainage_alternatives.mjs
node scripts/generate_combined_zones_autonomous_selections.mjs
node scripts/generate_combined_zones_d02_owner_acceptance_packet.mjs
node scripts/compile_combined_zones_d05_owner_acceptance_packet.mjs
node scripts/compile_combined_zones_d06_owner_acceptance_packet.mjs
node scripts/compile_combined_zones_b11_external_interfaces.mjs
node scripts/compile_combined_zones_owner_review_bundle.mjs
node scripts/record_combined_zones_owner_review_acceptance.mjs
node scripts/audit_combined_zones_r00_readiness.mjs
```

- The D02-S01/S02 artifact is historical Aug 4 region-only evidence. Its test
  replays the old candidate census with `--historical-inventory-replay` and an
  explicit exclusion for the later accepted Aug 6 complete-save capture. A
  default current-data audit now reports that complete candidate honestly; do
  not overwrite the historical artifact. Consume the accepted save through the
  dedicated intake/scope-clearance records and technical source refresh.

- D02-S03 is a read-only 62,816,256-cell C1-plus-halo component audit. Zero
  acceptable receiver candidates means exact closed drainage, sumps/pumps, or
  an explicit hash-bound receiver/interface exception must be designed; it is
  never permission to invent an outfall.
- D02-S04 compiles four exact closed-drainage alternatives. The selected
  planning basis has 432 cells, ten strict-clear capped sumps, one no-build
  hold at `ROAD-LOW-001`, and no receiver/outfall. It remains HOLD for complete
  save, inflow/storage/failure criteria, sizing, technical acceptance,
  ownership/interfaces, and construction quantities.
- The D02 owner-acceptance packet must bind the ten exact capped-sump candidate
  assets and `ROAD-LOW-001` no-build hold to the exact upstream source hashes.
  “Capped” is a planning disposition, not a built or accepted sealed asset. Its
  inflow/storage/freeboard/failure, future-fluid, receiver, capacity,
  structural/geotechnical, owner/interface, and evidence-gap criteria are a
  review checklist, not technical acceptance. Run its focused regression with:

```bash
npx vitest run test/build/combinedZonesD02OwnerAcceptancePacket.test.ts
```

- The Cheyenne J-curve compiler freezes the exact 800-step B03 planning route,
  including both bends and its 5×4 reservation. It emits no operations and is
  not excavation, structural, fire/life-safety, or construction acceptance.
- The future-mountain compiler compares exact analytic B09/B10 planning
  surfaces. `FM-01-COMPACT-EAST-FACE` is the selected planning basis with
  14,768,553 candidate added-solid cells and 754,224 below-coordination support
  gaps, but the accepted future/construction cell count remains zero.
- The D06 life-safety alternatives select B07 west-two for planning because it
  clears recorded generated structures. Its excavation still contains 38
  current water cells. Four local vent risers and all smoke, gate, sump,
  discharge, and fire/service systems remain capped or sealed pending accepted
  mechanisms, owners/interfaces, and technical review.
- The D06 owner-acceptance packet binds the selected B07, egress, vent,
  smoke/barrier, emergency-lighting, capped-drainage, and fire/service planning
  basis to exact source hashes and eleven explicit acceptance gates. Its
  copyable sole-owner statement accepts only that planning basis/checklist;
  it cannot pass a HOLD, open a cap, commission a system, or authorize work.
  The current packet remains 2 bounded PASS / 9 HOLD, sealed, uncommissioned,
  and zero-operation. Run its focused regression with:

```bash
npx vitest run test/build/combinedZonesD06OwnerAcceptancePacket.test.ts
```

- D05-S02 defines twelve fail-closed future/direct/influence set families. A
  passing contract with zero emitted cells means the schema is ready while its
  geometry, mechanisms, ownership/interfaces, and accepted technical kernels
  are not. Never promote an unknown influence to an empty accepted set.
- The D05 owner-acceptance packet binds FM-01, its proposed deterministic
  material policy, the exact support-gap/relic/B09 facts, and all default-deny
  technical criteria to exact source and acceptance-payload hashes. Its
  copyable sole-owner statement accepts only the conditional planning policy;
  future/construction cells stay zero and every factual technical gap stays
  HOLD. Validate it alone or with the complete masterplan suite:

```bash
npx vitest run test/build/combinedZonesD05OwnerAcceptancePacket.test.ts
npm run test:masterplans
```

- The connector compiler freezes review geometry only. B08's selected
  220-step route is not commissioned. Later planning evidence selects the B07
  west-two and B09 east-face alternatives, but their hydrology, support,
  mechanism, technical, ownership, and interface gates remain HOLD. All
  outputs contain zero operations.
- The owner-delegated ledger freezes 20 planning choices. The separate,
  hash-bound owner-acceptance record freezes P1-B11 exact Grand
  Avenue/PassageWay/external interfaces as the planning basis, leaving zero
  subjective geometry choices while the canonical exact-cell compiler remains
  HOLD.
  The B11 compiler proposes one exact 299-point Grand Avenue profile, compiles
  the unevidenced PassageWay side to a zero-cell deferral, and keeps every
  future-line wall sealed. The owner-review bundle binds D02, D05, D06, and
  B11 under one copyable planning/checklist statement. Keep that bundle
  immutable; the separate acceptance record binds its exact file and payload
  hashes. Acceptance cannot pass a technical HOLD or authorize work. Run their
  focused regressions with:

```bash
npx vitest run \
  test/build/combinedZonesB11ExternalInterfaces.test.ts \
  test/build/combinedZonesOwnerReviewBundle.test.ts \
  test/build/combinedZonesOwnerReviewAcceptance.test.ts
```

- Generate the human-readable, offline HTML5 owner-review report from the
  bound bundle, packet, and R00 JSON evidence with:

```bash
node scripts/generate_combined_zones_owner_review_report.mjs
npx vitest run test/build/combinedZonesOwnerReviewReport.test.ts
```

- The report is a review surface, not a new source of authority. Its bundle
  hash, approval statement, exact figures, gate status, and safety boundary
  must remain reproducible from the bound JSON. Concept images are labeled as
  intent, maps remain planning views, and no report action authorizes a world
  edit, construction, opening, discharge, commissioning, or release advance.

- Validate a supplied complete saved-world root, or reproduce the current
  region-only negative intake evidence, with:

```bash
node scripts/audit_combined_zones_complete_save.mjs \
  --world-root <copied-world-root> \
  --out <intake-audit.json> \
  --markdown <intake-audit.md>
npx vitest run test/build/combinedZonesCompleteSaveIntake.test.ts
```

- A complete-save PASS requires nonempty `region/`, `entities/`, and `poi/`
  MCA sets, nonempty `level.dat`, stable non-symlink files, and an exact
  in-root `combined-zones-complete-save-capture.json` proving the
  ordered frozen-copy protocol.
  The intake tool is read-only and may not contact Minecraft or RCON, mutate a
  supplied save, accept dependency samples, or infer same-moment identity.
- The separately authorized capture workflow is split across
  `scripts/capture_combined_zones_complete_save.py` and the root-owned,
  hash-bound `scripts/packetcraft_complete_save_capture_helper.py`. The local
  workflow may invoke only the helper's fixed `--preflight` and `--stream`
  commands through `sudo -n`; the helper owns the bounded RCON save-off,
  save-all flush, archive, save-on, and deadman restoration sequence. Never
  install the helper, change sudoers, contact the live server, run RCON, or
  capture a live save without explicit human authority for those external
  actions. The destination must be new, immutable after capture, and accepted
  by the read-only intake auditor. Run the offline workflow regressions with:

```bash
python3 test/scripts/test_capture_combined_zones_complete_save.py
python3 test/scripts/test_packetcraft_complete_save_capture_helper.py
```

- Keep the historical region-only intake and default G06 audit unchanged.
  After an authorized capture passes intake, bind it additively to the exact
  proposal/generated-start/protected-core scope with:

```bash
node scripts/audit_combined_zones_complete_save.mjs \
  --world-root <immutable-complete-save-root> \
  --out <versioned-complete-save-audit.json> \
  --markdown <versioned-complete-save-audit.md> \
  --generated-at <stable-utc>
node --max-old-space-size=8192 \
  scripts/audit_combined_zones_g06_proposed_clearance.mjs \
  --complete-save <versioned-complete-save-audit.json> \
  --out <versioned-g06-complete-save-scope-audit.json> \
  --markdown <versioned-g06-complete-save-scope-audit.md> \
  --generated-at <stable-utc>
```

- The scoped G06 mode compares raw terrain-chunk payloads before reusing any
  exact geometry. If every required chunk is source-equivalent, retain the
  reviewed geometry and classify findings by their controlling stage. The 43
  captured rabbit/polar-bear positions are transient observations deferred to
  the fresh execute-stage G13 gate, not pre-R00 relocation work. The occupied
  D06 bee-nest POI is persistent source state and requires a design treatment.
  A complete-save PASS closes the missing-evidence dependency; it does not
  accept a treatment, owner/interface, construction cell, operation, release,
  or world edit.

- Compile and validate the non-executable occupied-nest treatment with:

```bash
node scripts/compile_combined_zones_d06_bee_nest_treatment.mjs
node scripts/survey_combined_zones_d06_bee_nest_destination.mjs
node scripts/compile_combined_zones_d06_bee_nest_relocation_fixture.mjs
npx vitest run \
  test/build/combinedZonesD06BeeNestTreatment.test.ts \
  test/build/combinedZonesD06BeeNestDestinationSurvey.test.ts \
  test/build/combinedZonesD06BeeNestRelocationFixture.test.ts
```

- The compiler binds the exact nest cell, block state, two embedded bees, one
  linked external bee, prior EG-B census, and all six intersected D06 domains.
  It selects humane intact relocation as a planning treatment only. Destination
  selection, habitat/access/ownership evidence, method and NBT preservation,
  source/destination states, guards, rollback, technical acceptance, fresh G13
  clearance, and explicit release authority remain default-deny. Never derive
  an operation from the planning selection.
- The destination survey searches only the accepted immutable complete save.
  Its candidate at `1811,67,378` is air over grass in forest, has a clear south
  entrance, 16 unique flower plants within 22 blocks, 218 blocks of clearance
  from every proposal-domain bound, and 78 blocks of clearance from every
  bounded planning zone. It has no existing POI/block entity/nearby entity and
  zero protected-core intersection. It is not an accepted destination:
  habitat, access, ownership, long-term non-interference, relocation method,
  and all physical-release gates remain HOLD.
- The relocation fixture is synthetic offline contract evidence only. It
  accepts exactly three embedded occupants and zero external occupants, proves
  modeled state conservation and rollback, and rejects the current captured
  state because it has two embedded bees and one linked external bee. Never
  promote the synthetic PASS to method or technical acceptance. First require
  a fresh live gate to prove all three bees embedded, then prove the actual
  intact-relocation mechanic on a disposable server fixture matching the
  production Paper/Minecraft version. No server was available or started, and
  the live project world must not be used for method development.

- Reproduce the post-approval D02 technical-development matrix and the P1-B12
  Grand Avenue subsurface no-foreclosure alternatives with:

```bash
node scripts/compile_combined_zones_d02_technical_design.mjs
node scripts/compile_combined_zones_d02_c01_ownership_loading_interface.mjs
node scripts/compile_combined_zones_grand_avenue_subsurface_alternatives.mjs
node scripts/compile_combined_zones_grand_avenue_passive_shell_candidate.mjs
node scripts/compile_combined_zones_b11_surface_road_technical_proposal.mjs
npx vitest run \
  test/build/combinedZonesD02TechnicalDesign.test.ts \
  test/build/combinedZonesD02C01OwnershipLoadingInterface.test.ts \
  test/build/combinedZonesGrandAvenueSubsurfaceAlternatives.test.ts \
  test/build/combinedZonesGrandAvenuePassiveShellCandidate.test.ts \
  test/build/combinedZonesB11SurfaceRoadTechnicalProposal.test.ts
```

- P1-B12 reserves optionality only. A sealed rough shell is conditional on
  complete pre-road technical acceptance; full fit-out is not recommended.
  The nine-cell-wide route screen is not an excavation or owned construction
  set. It has exact current fluid and Houston-overlap evidence but emits zero
  future, construction, material, and operation cells.
- The D02/C01 proposal is bounded to the exact terminal stack. Its one-owner
  partition, loading precedence, and sealed adjacency pairs do not prove
  structural capacity, settlement, ISSUE-002 field condition, hydraulics,
  complete-save clearance, material states, or final D02/G03/G04/G05
  acceptance. Keep the 45 withheld D02 cells default-deny and all accepted and
  operation counts at zero.

- Reproduce the post-approval D05 sparse future-state proposal and D06
  reservation/failure/commissioning contracts with:

```bash
node scripts/compile_combined_zones_d05_future_state.mjs
node scripts/compile_combined_zones_d05_support_material_design.mjs
node scripts/compile_combined_zones_d06_mechanisms.mjs
node scripts/compile_combined_zones_d06_detailed_mechanism_setout.mjs
npx vitest run \
  test/build/combinedZonesD05FutureState.test.ts \
  test/build/combinedZonesD05SupportMaterialDesign.test.ts \
  test/build/combinedZonesD06Mechanisms.test.ts \
  test/build/combinedZonesD06DetailedMechanismSetout.test.ts
```

- The D05 compiler partitions every FM-01 candidate cell and classifies every
  support gap, but its emitted cells remain proposals with zero accepted
  future/construction state. The D06 compiler freezes exact reservations,
  failure criteria, and non-executable commissioning contracts while every
  physical opening, powered mechanism, receiver, material, and operation
  remains zero. Neither artifact substitutes for a complete saved world,
  technical acceptance, ownership/interface acceptance, or a release package.
- The detailed D06 setout resolves internal proposal geometry and duplicate
  precedence only. Carrier cells are not live circuits, caps are not outlets,
  equipment bays are not working mechanisms, and test contracts are not
  commissioning evidence. Keep external routes/receivers, functional states,
  controls/failure logic, complete-save results, technical acceptance, and all
  accepted/operation counts fail-closed.

- Reproduce the canonical proposal-level G03 setout with:

```bash
node scripts/compile_combined_zones_residual_surface_connector_domains.mjs
node scripts/compile_combined_zones_civil_life_safety_domain_closure.mjs
node scripts/compile_combined_zones_g03_canonical_setout.mjs
node scripts/audit_combined_zones_g06_proposed_clearance.mjs
npx vitest run \
  test/build/combinedZonesResidualSurfaceConnectorDomains.test.ts \
  test/build/combinedZonesCivilLifeSafetyDomainClosure.test.ts \
  test/build/combinedZonesG03CanonicalSetout.test.ts \
  test/build/combinedZonesG06ProposedClearance.test.ts
```

- The G03 artifact distinguishes exact proposed construction/interaction
  domains from planning accommodations and reference ledgers. V3 consumes all
  30 required exact proposal domains, with zero unresolved geometry domains,
  after the standalone residual surface/connector and civil/life-safety
  compilers close the former nulls. G03 is therefore a proposal-geometry PASS,
  while every accepted construction, material, future-state, operation, and
  world-edit authority count remains zero. Disclosed overlaps are coordination
  findings, not accepted seams. Never use the proposal registry to generate
  operations or treat G03 PASS as physical authority.
- The G06 audit evaluates all 30 G03-v3 domains against 114 generated starts
  and three protected cores. It discloses the exact 126-cell P1-B10 influence
  overlap with the shipwreck core (the same cells already present in the D05
  support evidence). The sole owner's 2026-08-06 additive policy resolves
  preserve-versus-remove in favor of controlled-removal engineering for the
  shipwreck only. It is not an accepted technical-treatment contract: the
  2,268-cell bound and 1,118-cell non-air census are evidence/search sets, not
  demolition targets, and include 515 packed-ice cells, five snow cells and
  three chests. G06 remains HOLD until the conflict has an accepted exact
  attributed treatment/clearance and chest-salvage contract, positive expert
  margins are frozen, disclosed complete-save entity/POI intersections are
  reconciled, ownership/interfaces are accepted, and the final gate is
  accepted. Do not promote zero-margin or proposal-level evidence to
  expert-influence, accepted-contract, or release authority.

- Reproduce and validate the owner-policy overlay with:

```bash
node scripts/record_combined_zones_shipwreck_removal_authorization.mjs
node scripts/compile_combined_zones_shipwreck_treatment_contract.mjs
node scripts/compile_combined_zones_shipwreck_best_choice_analysis.mjs
npx vitest run \
  test/build/combinedZonesShipwreckRemovalAuthorization.test.ts \
  test/build/combinedZonesShipwreckTreatmentContract.test.ts \
  test/build/combinedZonesShipwreckBestChoiceAnalysis.test.ts
```

- The shipwreck policy emits zero operations and never substitutes for the
  later single-use G14 authorization bound to one complete save, exact
  attributed targets, desired states, salvage manifest, forward/rollback
  hashes, permitted world and expiry. Generated-start NBT remains historical
  evidence and is not directly edited.
- The treatment compiler binds the accepted complete save and partitions all
  2,268 GS-037 envelope cells. Only the 598 chest/dark-oak/spruce cells are an
  attributed removal-target candidate; 515 packed-ice, five snow, and 1,150
  air cells stay preserved. The exact 598-cell air mapping is a candidate, not
  an accepted desired state. All three chests still carry unmaterialized loot
  tables, so zero inventory contents are known and no chest is salvage-ready.
  Do not materialize loot, move inventory, compile an operation, or promote the
  candidate until the declared structural/hydrology/neighbor, salvage,
  ownership/interface, margin, rollback, and later release gates pass.
- Run the best-choice gate before investing in the removal fallback. The two
  G06 shipwreck records are the same exact 126-cell physical intersection seen
  through generated-start and protected-core registries. It intersects only
  `P1-B10/influence`, not construction or interaction. Because that influence
  includes an unresolved below-Y72 support reservation, never obtain clearance
  by subtracting its 126 cells from the ledger alone; that would suppress the
  evidence while leaving its source condition unchanged. The same compiler now
  reads the accepted immutable complete save, reproduces the baseline interval
  identities, compares three reshape topologies at one- through four-cell
  positive planning margins, and selects the minimum exact south-open FM-01
  toe/no-build overlay. Its 2,432 current-state preservation columns regenerate
  construction, interaction, influence, and support to zero overlap against
  the shipwreck core plus the selected one-cell planning margin. That margin is
  not expert acceptance. The sparse identity is now consumed by the immutable
  G03-base-plus-overlay canonical integration artifact. It retains exact G04
  one-owner coverage, changes no cross-scope G05 contract set, and establishes
  zero overlap across all 114 generated starts and three protected cores.
  Controlled removal remains an optional fallback, not a requirement created
  by its owner authorization.

## Shipwreck Canonical Integration And D06 Runtime Compatibility

- Regenerate the hash-bound shipwreck composite overlay and focused regression:

```bash
node scripts/compile_combined_zones_shipwreck_canonical_integration.mjs
npx vitest run \
  test/build/combinedZonesShipwreckCanonicalIntegration.test.ts
```

- The overlay never rewrites the immutable G03 baseline. It replaces only the
  P1-B10 construction, interaction, influence, and support-gap identities. Its
  change envelope is disjoint from all nine other scopes, so existing
  cross-scope interface cellsets remain unchanged. Expert positive margins and
  final owner/interface/technical acceptance remain HOLD; it emits no ops.
- Regenerate the bounded negative D06 runtime evidence with:

```bash
node scripts/compile_combined_zones_d06_bee_runtime_compatibility_audit.mjs
npx vitest run \
  test/build/combinedZonesD06BeeRuntimeCompatibility.test.ts
```

- `run_combined_zones_bee_runtime_fixture.mjs` is an isolated diagnostic only.
  It requires a byte-identical read-only copy of the production Paper jar, a
  disposable Java runtime, and optionally a temporary current Mineflayer module.
  Never point it at production. The exact Paper runtime can serialize a
  three-member `minecraft:bees` item, but Mineflayer 4.35.0 and 4.37.1 both fail
  the 1.21.11 item/action path. This is a recorded HOLD, not a mechanic pass.
  Before changing dependencies, disable client physics, await teleport
  confirmation/forced movement, and verify server-authoritative position and
  interaction range twice. Require interact, damage, and break events before
  testing item decode, pickup, placement, exact three-bee NBT, and rollback.
  Do not blindly upgrade fleet dependencies.

## Combined Zones Technical Source Refresh And G05 Geometry Layer

- Rebuild the additive accepted-save source refresh and focused regression:

```bash
node scripts/compile_combined_zones_technical_source_refresh.mjs
npx vitest run test/build/combinedZonesTechnicalSourceRefresh.test.ts
```

- The supplement closes only five stale source-completeness rows without
  rewriting historical artifacts: D02-TD-07, B09, B11-H07, B12-H01, and
  D06-MC-11. The occupied D06 nest remains a persistent POI HOLD. Twenty-nine
  pre-R00 commissioning specifications are frozen but unaccepted; executed
  results remain G17 evidence and may never resolve G02.
- Rebuild the G05 Layer-A global physical-interface audit and regression:

```bash
node --max-old-space-size=8192 \
  scripts/audit_combined_zones_g05_global_geometry.mjs
npx vitest run test/build/combinedZonesG05GlobalGeometryAudit.test.ts
```

- Layer A independently recompiles and compares all 84 G04 directional
  contracts and 352,931 pairs, then applies the hash-bound P1-B10 no-seam-change
  overlay proof. Layer B remains separate and HOLD: 77 technical contracts,
  13 null geometries, 52 missing pair manifests, no before/future state hashes,
  and no accepted contracts. A Layer-A PASS never implies G05 or R00 PASS.

## Combined Zones R00 Read-Only Candidate Closure

- Reconcile reusable immutable evidence into a proposed closure worklist:

```bash
node scripts/compile_combined_zones_r00_candidate_closure.mjs
npx vitest run test/build/combinedZonesR00CandidateClosure.test.ts
```

- The report reuses the accepted complete-save identity, exact interface
  geometry, existing transition manifests, the technical source refresh, and
  the shipwreck composite. It distinguishes the 23 directly source-backed
  exact geometries from 125 hash-only upstream outputs; it may identify
  directly eligible before-state and transition-manifest candidates, but it
  never writes accepted hashes. Thirteen null endpoint geometries, all
  future-state authoring, owner/interface acceptance, and the real-client D06
  mechanic proof remain external evidence.
- A candidate-closure PASS is not an R00 PASS and never authorizes a build,
  publication, merge, push, operation, or world edit. Update the master plan,
  `/world-showcase`, and README only after the authoritative R00 loop reports
  all five target gates PASS.

## Combined Zones G05 Pair Reconciliation And G02/G07 Review Handoff

- Reconcile null pair fields without fabricating technical manifests:

```bash
node scripts/audit_combined_zones_g05_pair_manifest_reconciliation.mjs
npx vitest run test/build/combinedZonesG05PairManifestReconciliationAudit.test.ts
```

- The reconciliation classifies all 52 null pair fields into one exact D06
  alias, terminal/source caps, shared boundaries, precedence/reservations, and
  undefined endpoints. It creates zero pair manifests and leaves the canonical
  registry unchanged. The D06 alias is evidence for de-duplication only; it is
  not interface acceptance.
- Prepare the smallest external review handoff from existing evidence:

```bash
node scripts/compile_combined_zones_g02_g07_minimal_review_packet.mjs
npx vitest run test/build/combinedZonesG02G07MinimalReviewPacket.test.ts
```

- The packet groups three discipline reviews and one final owner record, with
  B12 no-foreclosure deferral recommended. It is unsigned decision input and
  cannot pass G02/G07, authorize construction, or authorize world edits.
- Record only explicit owner-controlled planning choices when authorized:

```bash
node scripts/record_combined_zones_owner_controlled_decisions.mjs
```

- This records B12 deferral, the selected shipwreck reshape, and the humane
  D06 relocation planning basis. It deliberately leaves technical acceptance,
  endpoint facts, runtime proof, and world construction unauthorized.

## Combined Zones G05 Endpoint Candidate Worklist

- Derive the 13 undefined endpoint rows from existing plans and preserve the
  distinction between source-side candidates and missing counterpart facts:

```bash
node scripts/compile_combined_zones_g05_endpoint_candidate_worklist.mjs
```

- The report records seven source-side candidate datums and six rows with no
  exact source-side datum. Every counterpart, receiver/to-owner, before state,
  future state, and acceptance remains null; the report is read-only evidence
  and cannot promote G05/R00 or authorize operations/world edits.
- Architect-directed fail-closed dispositions may be recorded with:

```bash
node scripts/record_combined_zones_architectural_endpoint_dispositions.mjs
```

- This may narrow proposal build scope, but it must retain zero executable
  endpoint openings and cannot turn missing technical evidence into PASS.

## Combined Zones Build Package Assembly

- Assemble the hash-bound, non-executing package before any live build request:

```bash
node scripts/compile_combined_zones_build_package.mjs
```

- The package binds the exact G03 proposal domains and fail-closed endpoint
  dispositions. It emits no forward or rollback operation until complete
  per-cell desired block states and a fresh immutable construction snapshot
  exist. It never contacts RCON or edits the world.

## Combined Zones R01 GA-J1 Discovery Cue Pilot

- Compile the smallest exact visible pilot from the frozen Empty Eight design:

```bash
node scripts/compile_combined_zones_r01_ga_j1_discovery_cue_pilot.mjs
node scripts/preflight_guarded_ops.mjs \
  data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.txt \
  --regions data/worldsnap-combined-zones-complete-save-20260806T014133Z/region \
  --report data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.preflight.json
python3 scripts/rcon_runner.py \
  data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.txt \
  --dry-run --strict-noop \
  --report data/buildops/combined-zones-r01-ga-j1-discovery-cue.forward.strict-dry-run.json
```

- This five-cell GA-J1 cue is information-only and does not open or commission
  Empty Eight. Its forward and rollback pair are exact inverses. Live execution
  uses the 2026-08-21 standing owner authority. A fresh snapshot is preferred;
  source reuse is allowed only when a hash-bound current-state check proves the
  candidate cells and interaction halo have not drifted.

## Combined Zones R00 Five-Gate Hold Loop

- Run the five remaining R00 gates through the bounded dependency-aware loop:

```bash
node scripts/run_combined_zones_r00_hold_loop.mjs --max-iterations 5
npx vitest run test/build/combinedZonesR00HoldLoop.test.ts
```

- The loop validates the complete R00 source-binding chain, exact composite
  G04 one-owner coverage, the completed G05 Layer-A physical audit and exact
  Layer-B worklists, exact G06 protected geometry, the additive technical
  source refresh, and the production-binary D06 runtime evidence. It stops when
  two consecutive five-gate state digests are identical instead of repeating
  checks that cannot change a result.
- Reuse the G05 Layer-A PASS. Do not run the final combined technical-interface
  audit until every Layer-B endpoint, pair/terminal manifest, before/future
  state, owner, and interface acceptance is complete. Do not run the G07
  integrated audit until G02, G04, G05, and G06 all pass. Use `--require-pass`
  only in a workflow that should exit nonzero at a truthful fixed-point HOLD.
- The loop is evidence-only. It never contacts production, the fleet API,
  RCON, or systemd; compiles no operation file; performs no world edit; and
  cannot self-issue expert, owner, interface, protected-feature, or technical
  acceptance.

## Best-Choice Gate For Material Decisions

- Before each consequential design or release step, identify the exact blocker
  and compare at least: no action, the smallest bookkeeping change, a
  root-cause nonphysical redesign, and any authorized physical alternative.
- Score blocker resolution, root-cause integrity, physical safety,
  reversibility, evidence efficiency, and future flexibility. Scores never
  override a failed hard gate.
- Reject any option that hides source evidence, relies on an unknown inventory
  or state, spends irreversible authority while a credible nonphysical option
  remains, or solves a larger/different problem than the actual blocker.
- Prefer the smallest reversible root-cause intervention that produces visible
  MVP progress. Operation compilation is authorized by default for a bounded
  scope. Live execution is authorized when that scope's hard-safety kernel
  passes; a credible nonphysical alternative does not by itself block building.

- Reproduce the B09 funicular technical-reservation proposal with:

```bash
node scripts/compile_combined_zones_b09_funicular_technical_system.mjs
npx vitest run test/build/combinedZonesB09FunicularTechnicalSystem.test.ts
```

- B09's station, guideway/support, maintenance/egress, rescue, power/control,
  drainage, and sealed-interface cellsets are functional reservations only.
  Carrier cells do not prove a circuit or flow path; observed-start clearance
  does not replace a complete-save gate. Keep its accepted cell, owner,
  interface, mechanism, material, and operation counts at zero until every
  declared technical and acceptance HOLD closes.
- The Grand Avenue passive shell is a conditional candidate only. Do not
  excavate it merely because its geometry is exact. Its complete-save,
  structural/road-load, hydrology, utility, D06 occupiable-use, owner/interface,
  global cross-scope, and physical-release HOLDs must all pass before it could
  precede the surface road. If any remains at road release, preserve the
  no-foreclosure reservation and build no shell.
- P1-B11's accepted centerline/profile remains immutable. The surface-road
  proposal adds an unaccepted eight-wide side-bias, interaction union, and
  load/drainage/utility reservations that coordinate exactly with P1-B12. Its
  exact geometry does not select block states, settle road loads, accept the
  Houston seam, or authorize construction. G03 v3 consumes those exact proposal
  domains; regenerate the standalone domain closures and G03 explicitly
  whenever B11, B12, D06, D02/C01, or the release-contract identity changes.

- Reproduce the proposal-level one-owner/default-deny interface registry with:

```bash
node scripts/compile_combined_zones_proposed_ownership_interface_registry.mjs
npx vitest run \
  test/build/combinedZonesProposedOwnershipInterfaceRegistry.test.ts
```

- The registry's exact precedence records eliminate known shared-cell ambiguity
  without wildcard, last-writer-wins, or silent clipping. Its logical owners and
  directional contracts are proposals, not additional human decision makers or
  accepted physical authority. Null interfaces remain HOLD, and the registry
  must not be converted into operations or used to pass G04/G05 until the
  technical inputs, complete-save evidence, and one immutable final acceptance
  identity exist.

Run the focused second-wave regressions with:

```bash
npx vitest run \
  test/build/combinedZonesCheyenneJcurveGeometry.test.ts \
  test/build/combinedZonesD02S04ClosedDrainageAlternatives.test.ts \
  test/build/combinedZonesD05FutureMountainAlternatives.test.ts \
  test/build/combinedZonesD06LifeSafetyAlternatives.test.ts
```

- R00 is the completed nonphysical design freeze. R01-R06 have later scoped
  execution evidence. Current as-built evidence may close or supersede a stale
  planning HOLD when it binds the exact same scope and state; do not force an
  already-built scope back through the historical R00 sequence.
- `audit_combined_zones_r00_readiness.mjs` binds the current authority and Phase
  1 evidence and emits zero operations. Its accepted result is all seven gates
  PASS. It is historical design-freeze evidence, not the active release queue.

- A historical contract or report may still contain `BUILD_BLOCKED`. Apply the
  current-state precedence rule: compile and release a bounded incomplete MVP
  scope when its exact hard-safety kernel passes, without waiting on unrelated
  whole-project design, publication, or optional-scope gates.
- The validator checks resolved decisions against the bound decision ledger,
  protected cores against the relic census, reviewed-buffer schema and hashes,
  compiled R01 candidate readiness separately from completed R01/Phase 1
  acceptance. The current contract now records the as-built release state and
  scoped queue; an old empty `currentGateEvaluations` array is not controlling.
- Phase advancement is exact but not globally serial. Disjoint scopes may
  advance independently. A scoped HOLD excludes only its exact affected cells;
  it triggers redesign or omission while other eligible packages continue.

## RAIL-S2 Westlight Corridor Water-Containment Segments

- Continue the sealed 6×6 water-management liner east along the Cobalt S1
  corridor bore (`y=18..23, z=-462..-457`) one 6×6 cell block at a time:
  - SEGMENT-01 x=-254..-236 (540 cells), SEGMENT-02 x=-235..-216 and
    SEGMENT-03 x=-215..-196 (516 each), SEGMENT-04 x=-195..-176,
    SEGMENT-05 x=-175..-156 and SEGMENT-06 x=-155..-136 (516 each).
- Compilers: `scripts/compile_rail_wl_seg01_liner.mjs`,
  `scripts/compile_rail_wl_seg23_liner.mjs`,
  `scripts/compile_rail_wl_seg456_liner.mjs`. Each builds five of the six
  polished_deepslate liner faces per new segment (floor y=17, ceiling y=24,
  north z=-463, south z=-456, east cap at maxX+1); the west wall is the prior
  segment's east cap, so packages are exact and disjoint.
- Post-state verifiers: `scripts/verify_rail_wl_seg0{1,23,456}_post.mjs`.
- Release notes: `docs/masterplans/RAIL-S2-WL-SEGMENT-01-RELEASE.md`,
  `RAIL-S2-WL-SEGMENT-02-03-RELEASE.md`, `RAIL-S2-WL-SEGMENT-04-06-RELEASE.md`.
- The corridor is RAIL-S2 access/civil containment only — no track, rail,
  platform, civil bore (RAIL-S3), or `routeCommissioned` claim.
- Segment-06 does not extend the corridor z-width; the design rectangle
  `z=-462..-387` was surveyed and its residual wider-corridor water is
  preserved untouched.
- Focused regressions:

```bash
npx vitest run \
  test/build/railWlSegment01.test.ts \
  test/build/railWlSeg23.test.ts \
  test/build/railWlSeg456.test.ts
```

## RAIL-S3 Guideway Track-Tube Beds

- Lay the two directional passenger track-tube beds (tube-N `z=-461..-460`,
  tube-S `z=-455..-454`, `y=12`, `minecraft:polished_deepslate`) below the
  sealed Cobalt S1 service corridor (floor `y=18`, liner walls `z=-463/-456`),
  one 20-wide corridor cell block at a time:
  - GUIDEWAY-01 x=-254..-236 (76 cells), GUIDEWAY-02 x=-235..-136 (slices 2-6,
    380 operated + 20 held).
- Compilers: `scripts/compile_rail_guideway_01.mjs`,
  `scripts/compile_rail_guideway_02.mjs`. Each emits per-slice exact REPL
  forward/rollback pairs bound to a fresh live source snapshot. The 2-cell rock
  spine `z=-459..-458` between the two beds is always preserved untouched
  (5-block track-centre spacing).
- Post-state verifiers: `scripts/verify_rail_guideway_0{1,2}_post.mjs`.
- Release notes: `docs/masterplans/RAIL-S3-GUIDEWAY-01-RELEASE.md`,
  `RAIL-S3-GUIDEWAY-02-RELEASE.md`.
- GUIDEWAY-02's fresh source contains natural cave air (x=-197..-194,
  x=-182..-175) and a small water column at `(-180,-455)/(-180,-454)` in the
  tube-bed zone; those 20 bed cells are held fail-closed (never built floating,
  never removed) for a follow-up support-first package.
- CIVIL PREP ONLY: no rail blocks, no powered rails, no signalling, no
  vehicles; `routeCommissioned` stays false. The service corridor above remains
  the separated, dry, walkable maintenance/evacuation route.
- Focused regressions:

```bash
npx vitest run \
  test/build/railGuideway01.test.ts \
  test/build/railGuideway02.test.ts
```

## C01 Guarded Build Orchestrator

- Use `scripts/run_c01_guarded_build.mjs` to compose the repeated C01 package
  workflow into one evidence ledger. Preparation is the default and runs route
  manifest binding, exact forward preflight, strict forward/rollback parser
  checks, and projected route QA:

```bash
node scripts/run_c01_guarded_build.mjs \
  --forward <forward-ops.txt> \
  --rollback <rollback-ops.txt> \
  --pre-regions <immutable-pre-region-directory> \
  --route-manifest <route-manifest.json> \
  --out-dir <evidence-directory>
```

- Live execution is opt-in and requires both `--execute` and explicit
  `--post-regions <.../region>` plus `--snapshot-near <x,z>`. It executes only
  through `scripts/rcon_runner.py --strict-noop`, captures a fresh saved-world
  snapshot, binds the post route manifest, reruns route QA, and runs rollback
  post-state preflight. The orchestrator fails closed on any stage failure and
  writes `evidence-ledger.json`.
- `scripts/bind_route_manifest_snapshot.mjs` creates a package-specific route
  manifest bound to an immutable snapshot and operation hash without changing
  the canonical historical manifest.
- For C01 held geometry, use `scripts/extract_c01_held_core_candidate.mjs` to
  materialize the held operations as a redesign-only candidate, then
  `scripts/compile_c01_route_aware_core.mjs` to convert accepted route-support
  cells into the reviewed stair orientation while preserving feet/head cells.
  The latter must still pass the guarded orchestrator before execution.
- Validate an executed scoped release against the town-hall policy with:

```bash
node scripts/qa_c01_scoped_deployment_policy.mjs \
  --policy data/buildops/c01-scoped-deployment-policy-2026-08-08.json \
  --ledger <c01-release-evidence-ledger.json> \
  --small-wave-exception dependency-tail \
  --out <policy-qa.json>
```

## Current-State Safe Supplemental Deltas

- When a large package is materially present but its historical source guards
  are stale, use `scripts/compile_current_safe_delta.mjs` against a fresh live
  snapshot. It emits only cells whose current state is exactly the historical
  source state, reports target-already-present cells separately, and fails the
  report closed on any unexpected state such as fluid or a container:

```bash
node scripts/compile_current_safe_delta.mjs \
  --source-ops <historical-forward-ops.txt> \
  --regions <fresh-live-region-directory> \
  --forward <supplement-forward.txt> \
  --rollback <supplement-rollback.txt> \
  --report <supplement-report.json>
```

- Execute only the emitted safe supplement through
  `scripts/rcon_runner.py --strict-noop --report`; preserve every unsafe
  holdout for a separate reviewed treatment and always run a fresh post
  snapshot plus rollback post-state preflight.

## Combined Zones Release Layer And As-Built Verification

- T01 binds explicit forward/rollback operation pairs to the Masterplan 05
  contract. It never turns proposal geometry or a missing material map into
  blocks. The full candidate inventory is generated with:

```bash
node scripts/compile_combined_zones_release_layer.mjs \
  --snapshot <fresh-complete-save>/region \
  --out <release-layer.json>
```

- T02 is the fail-closed ownership/protected-core pre-gate:

```bash
node scripts/audit_combined_zones_release_layer_ownership.mjs \
  --layer <release-layer.json> --out <ownership-audit.json>
```

  Overlapping package bounds are rejected until an exact cell/interface
  contract is supplied. T03 is `run_combined_zones_release_layer.mjs`; it
  requires an external hash-bound authorization and a PASS T02 audit before
  it can invoke the strict-noop runner. It is never a source of authorization.

- T04 verifies what was actually built by running each exact rollback operation
  against the immutable post snapshot. A PASS means the post-state cells match
  the forward desired states and the rollback operation/snapshot identities
  match:

```bash
node scripts/verify_combined_zones_as_built.mjs \
  --layer <release-layer.json> \
  --post-snapshot <immutable-post-save>/region \
  --out <as-built-verification.json>
```

- To re-run every mechanical remediation step and produce a single handoff
  for unresolved owner decisions, use:

```bash
node scripts/remediate_combined_zones_blockers.mjs \
  --out data/world-review/combined-zones-blocker-remediation-YYYY-MM-DD.json
```

  This doctor may regenerate evidence, verify committed builds, and consume the
  standing owner directive for conservative Minecraft design selections. It
  cannot invent a live source state, container migration, or block state, and
  it cannot waive the scoped hard-safety kernel.

- To split the monolithic project gates into scope-local dependency ledgers
  without weakening any gate, run:

```bash
node scripts/split_combined_zones_release_gates.mjs
```

  The output identifies which packages can be queued independently and which
  unresolved decisions apply to each package. A queued package is eligible for
  execution under the standing owner directive once its scoped hard-safety
  kernel passes.

## Combined Zones R07B Viaduct-Bent Compiler

- Compile the exact source-bound B03 viaduct support package from the accepted
  R07A post snapshot:

```bash
node scripts/compile_combined_zones_r07b_b03_viaduct_bents.mjs
```

- Run its focused regression, or the full backend suite:

```bash
npx vitest run test/build/combinedZonesR07B03ViaductBents.test.ts
npx vitest run test/build/qaCombinedZonesR07B03ViaductBentsPostRelease.test.ts
npm test
```

- The compiler is offline and never authorizes execution. Before any live
  release, refresh the complete save, recompile if its identity changed, and
  run the scoped standing-authority hard-safety pipeline.

## Combined Zones R09A B07 Lower-Lobby Floor

- Compile the exact dry public-shaft lower-lobby floor from the newest accepted
  post snapshot and run its focused regression with:

```bash
node scripts/compile_combined_zones_r09_b07_lower_lobby_floor.mjs
npx vitest run test/build/combinedZonesR09B07LowerLobbyFloor.test.ts
node scripts/qa_combined_zones_r09_b07_lower_lobby_floor_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09B07LowerLobbyFloorPostRelease.test.ts
npm test
```

- The package is exactly 63 air-source cells in the frozen B07 lower lobby,
  emitted as three guarded material bands with an exact inverse. It preserves
  the wet observation transfer and every mechanism, fluid, entity, container,
  and protected relic. Live use must go through
  `scripts/run_combined_zones_scoped_release.mjs` for release node
  `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.
- The executed R09A seal is
  `data/world-review/combined-zones-r09a-live-20260821T163535Z/r09a-post-release-qa.json`.
  Require 63/63 exact floor states, 63/63 unchanged stable supports, 126/126
  headroom air, a connected lobby route, strict execution 3/3, and rollback
  guards 3/3.

## Combined Zones R09F B07 Enclosed Upper Interface

- Compile and verify the exact dry, enclosed R09E-to-R07J top-anchor seam, or
  run the full backend suite:

```bash
node scripts/compile_combined_zones_r09f_b07_enclosed_upper_interface.mjs
node scripts/qa_combined_zones_r09f_b07_enclosed_upper_interface_offline.mjs
npx vitest run test/build/combinedZonesR09FB07EnclosedUpperInterface.test.ts
node scripts/qa_combined_zones_r09f_b07_enclosed_upper_interface_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09FB07EnclosedUpperInterfacePostRelease.test.ts
npm test
```

- The two-package release is 126 containment cells followed by 33 exact
  stair/clearance/seam cells. Live use must go through
  `scripts/run_combined_zones_scoped_release.mjs` for release node
  `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute either operation file
  directly.

## Combined Zones R09G B07 Upper-Stair Passive Wayfinding

- Compile and validate the bounded eight-fixture passive package with:

```bash
node scripts/compile_combined_zones_r09g_b07_upper_route_passive_wayfinding.mjs
node scripts/qa_combined_zones_r09g_b07_upper_route_passive_wayfinding_offline.mjs
npx vitest run test/build/combinedZonesR09GB07UpperRoutePassiveWayfinding.test.ts
node scripts/qa_combined_zones_r09g_b07_upper_route_passive_wayfinding_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09GB07UpperRoutePassiveWayfindingPostRelease.test.ts
```

- The package preserves the exact accepted R09F state, including the inherited
  two-cell R09F/R09E conservative-clearance conflict. It does not commission a
  route, lighting system, exterior door, or lower wet interface. Live use must
  go through `scripts/run_combined_zones_scoped_release.mjs` for release node
  `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.

## Combined Zones R09H B07 Transition-Clearance Correction

- Compile and validate the exact two-cell floor-backed correction with:

```bash
node scripts/compile_combined_zones_r09h_b07_transition_clearance_correction.mjs
node scripts/qa_combined_zones_r09h_b07_transition_clearance_correction_offline.mjs
npx vitest run test/build/combinedZonesR09HB07TransitionClearanceCorrection.test.ts
node scripts/qa_combined_zones_r09h_b07_transition_clearance_correction_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09HB07TransitionClearanceCorrectionPostRelease.test.ts
```

- The package resolves only the exact inherited R09E/R09F two-cell clearance
  conflict. It keeps the lower wet interface and exterior opening closed,
  preserves all fixtures and mechanisms, and does not commission a public or
  fire-service route. Live use must go through
  `scripts/run_combined_zones_scoped_release.mjs` for release node
  `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.

## Combined Zones R09I/R09J B07 Upper-Route Gravity Isolation

- Reproduce the full-route blocker, compile the exact two-cell isolation cap,
  seal its offline evidence, and run the focused regression with:

```bash
node scripts/commission_combined_zones_r09i_b07_enclosed_dry_upper_route.mjs
node scripts/compile_combined_zones_r09j_b07_upper_route_gravity_isolation_cap.mjs
node scripts/qa_combined_zones_r09j_b07_upper_route_gravity_isolation_cap_offline.mjs
npx vitest run test/build/combinedZonesR09JB07UpperRouteGravityIsolationCap.test.ts
node scripts/qa_combined_zones_r09j_b07_upper_route_gravity_isolation_cap_post_release.mjs
npx vitest run test/build/qaCombinedZonesR09JB07UpperRouteGravityIsolationCapPostRelease.test.ts
node scripts/commission_combined_zones_r09k_b07_bounded_upper_route.mjs
npx vitest run test/build/commissionCombinedZonesR09KBoundedUpperRoute.test.ts
```

- R09I fails closed on exactly two full-route fall-boundary cells in the
  inherited floating-gravel column at `x=2104,z=-396`. Do not support, remove,
  or replace that column: restoring its unsupported source state cannot be
  guaranteed during exact rollback.
- R09J owns only `(2105,30,-397)` and `(2105,31,-397)`, changing exact air to
  polished diorite. It preserves the unsupported column and all wet, exterior,
  mechanism, entity, block-entity, and prior-release cells. The projected cap
  isolates a 91-surface supported upper segment beginning at stair index 21;
  commissioning requires fresh post-release functional QA and is not granted
  by the compiler or offline seal.
- After accepted execution, R09J post QA must prove the 91-surface component,
  182 air-clearance cells, complete 172-plus-two backed-aperture boundary, all
  eight supported gravity cells, exact diff, journals, and inverse. Only the
  separate R09K evidence-only seal commissions passive internal inspection
  circulation from stair index 21 to the closed doorless headhouse hold. It
  never commissions the through-route, exterior, lower wet interface, public
  or fire-service use, accessibility, lift, smoke control, power, or drainage.
- Live use must pass the canonical manifest through
  `scripts/run_combined_zones_scoped_release.mjs` for release node
  `CZ-R09-PHASE4-PUBLIC-CORE-FITOUT`; never execute the operation file directly.

## Combined Zones R11A C1 East Highway Pilot

- Compile the first dry, connected C1 highway pavement package and run its
  focused regression or the full backend suite:

```bash
node scripts/compile_combined_zones_r11a_c1_east_highway_pilot.mjs
npx vitest run test/build/combinedZonesR11AC1EastHighwayPilot.test.ts
node scripts/qa_combined_zones_r11a_c1_east_highway_pilot_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11AC1EastHighwayPilotPostRelease.test.ts
npm test
```

- The compiler owns only accepted C1 stations 489 through 493 and highway
  offsets -14 through 14. It excludes every C01 interface, rail and utility
  reservation, drainage collection band, prior release, fluid, gravity block,
  container, entity, and protected relic.
- Live use must go through scripts/run_combined_zones_scoped_release.mjs for
  release node CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR after a fresh same-moment
  source save and the complete scoped hard-safety kernel. Never execute the
  generated operation file directly.
- The executed R11A seal is
  data/world-review/combined-zones-r11a-live-20260821T170600Z/r11a-post-release-qa.json.
  Require 313/313 exact targets, 109/109 pavement materials, one connected
  step-safe surface, 16/16 foundation fills, 109/109 stable contacts, 218/218
  headroom air, zero drift in all 1,103 preserved halo cells, strict execution
  313/313, and rollback guards 313/313.

## Combined Zones R11B C1 West Highway Extension

- Compile the geometry-bounded stations 481 through 488 extension and run its
  focused regression with:

```bash
node scripts/compile_combined_zones_r11b_c1_west_highway_extension.mjs
npx vitest run test/build/combinedZonesR11BC1WestHighwayExtension.test.ts
node scripts/qa_combined_zones_r11b_c1_west_highway_extension_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11BC1WestHighwayExtensionPostRelease.test.ts
npm test
```

- The manifest has two ordered, disjoint packages: stabilize the exact three
  load-bearing gravel contacts first, then apply the 485 pavement,
  foundation, and headroom transitions. Roll back pavement first and gravel
  stabilization second.
- The 18 frozen candidate surface cells and two additional candidate cells in
  accepted R11A headroom are preserved. Require the combined R11A/R11B public
  surface and their seam to each be one component with maximum step one,
  164/164 new pavement targets, 164/164 stable contacts, 328/328 new
  two-block headroom cells, and 218/218 preserved R11A headroom cells.
- Live use must go through `scripts/run_combined_zones_scoped_release.mjs`
  under release node `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR` after the complete
  fresh same-moment scoped kernel. Never execute either generated operation
  file directly.
- The executed R11B seal is
  `data/world-review/combined-zones-r11b-live-20260821T173605Z/r11b-post-release-qa.json`.
  Require 488/488 exact targets, 164/164 pavement materials, one connected
  combined route and one-component 94-pair seam at maximum step one, 164/164
  stable contacts, 328/328 new headroom air, 218/218 preserved R11A headroom,
  zero drift in all 1,534 preserved halo cells, 22/22 stable untouched
  residual gravel cells, strict execution 488/488, and reverse rollback
  guards 488/488.

## Combined Zones R11C C1 East Highway Completion

- Compile and independently verify the stations 494 through 517 at-grade
  completion with:

```bash
node scripts/compile_combined_zones_r11c_c1_east_highway_completion.mjs
node scripts/qa_combined_zones_r11c_c1_east_highway_completion_offline.mjs
npx vitest run test/build/combinedZonesR11CC1EastHighwayCompletion.test.ts
node scripts/qa_combined_zones_r11c_c1_east_highway_completion_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11CC1EastHighwayCompletionPostRelease.test.ts
```

- R11C is exactly one 1,109-cell physical package: 399 pavement cells, 68
  foundation fills, and 642 terrain/headroom cuts. Do not recreate or pass an
  empty leaf-stabilization package to the wrapper.
- Preserve the exact 23-cell R11A functional overlap, one additional R11A
  envelope conflict, 23-cell R11B envelope conflict, three utility-reserve
  conflicts, and all 13 final disconnected grade-shadow cells. The original
  nine-cell grade-only shadow is retained as its own provenance set; four of
  those nine are also inside the accepted R11B envelope.
- The source-bound dependency audit must prove 27 exact owned log removals,
  235 influenced retained leaves, zero leaves at projected decay distance
  seven, zero leaf-property transitions, zero gravity transitions, and stable
  support for both untouched halo gravel cells.
- Live use must go through `scripts/run_combined_zones_scoped_release.mjs`
  under release node `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR` after the complete
  fresh same-moment scoped kernel. Never execute the generated operation file
  directly.
- The executed R11C seal is
  `data/world-review/combined-zones-r11c-live-20260821T185813Z/r11c-post-release-qa.json`.
  Require 1,109/1,109 exact targets, one connected 672-cell R11A/B/C route,
  399/399 stable contacts, 798/798 R11C headroom, all 23 R11A support cells,
  13 grade-shadow cells, three utility conflicts, and 235 retained leaves
  exact, zero drift across 3,690 preserved review cells, strict execution
  1,109/1,109, and rollback guards 1,109/1,109.

## Combined Zones R11D C1 At-Grade Island 521..546

- Compile and independently verify the isolated at-grade run with:

```bash
node scripts/compile_combined_zones_r11d_c1_at_grade_island_521_546.mjs
node scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_offline.mjs
npx vitest run test/build/combinedZonesR11DC1AtGradeIsland521546.test.ts
node scripts/qa_combined_zones_r11d_c1_at_grade_island_521_546_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11DC1AtGradeIsland521546PostRelease.test.ts
```

- R11D is one 1,284-cell package: 476 connected pavement cells, 329
  foundation fills, and 479 terrain/headroom cuts. Preserve all 18 prior-C1
  envelope conflicts, two rail-reservation conflicts, two utility conflicts,
  and the disconnected gravel-supported shadow at `(934,103,67)`.
- Stations 518 through 520 and station 547 remain held. R11D is a useful dry
  physical island, not a commissioned route, and it must not open either end.
- The source-bound dependency proof requires 105 exact owned log removals,
  292 influenced retained leaves at projected log distances one through five,
  zero decay-risk leaves, zero leaf-property transitions, and zero gravity
  transitions.
- Live use must go through `scripts/run_combined_zones_scoped_release.mjs`
  under release node `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR` after the fresh
  same-moment scoped kernel. Never execute the operation file directly.
- The executed R11D seal is
  `data/world-review/combined-zones-r11d-live-20260821T192414Z/r11d-post-release-qa.json`.
  Require 1,284/1,284 exact targets, one connected 476-cell island, 329/329
  foundations, 476/476 stable contacts, 952/952 headroom, all 23 preserved
  exceptions and 292 retained leaves unchanged, zero drift across the
  4,160-cell halo, strict execution 1,284/1,284, and rollback guards
  1,284/1,284. The route remains uncommissioned across held interfaces.

## Combined Zones R11E Sheep-Preserving Six-Island Retry

- Compile and independently verify the prepare-only retry with:

```bash
node scripts/compile_combined_zones_r11e_retry_c1_six_island_batch.mjs
node scripts/qa_combined_zones_r11e_retry_c1_six_island_batch_offline.mjs
npx vitest run test/build/combinedZonesR11ERetryC1SixIslandSheepPreservingBatch.test.ts
```

- The first R11E wrapper attempt failed closed at live-entity clearance before
  any forward execution. Preserve its ledger and entity report. Never relabel
  that attempt as executed or overwrite its evidence.
- The retry reuses only ten byte-frozen packages outside stations 1142 through
  1183. It contains 1,593 exact cells across islands 548..551, 564..569,
  606..608, 627..632, 792, and 1213..1215.
- Omit island 1142..1183 in full: both packages and all 2,389 target cells.
  Three unfenced sheep occupy that interface, and one crossed the original
  point-derived exclusion boundary between immutable capture and live gate.
  Do not relocate, kill, constrain, or infer future movement for them.
- Ranges 952..1139 and 1189..1206 remain wet/source-physics holdouts. All
  non-at-grade treatments remain held, and no route connectivity is claimed.
- Live use must pass the retry manifest to
  `scripts/run_combined_zones_scoped_release.mjs` under release node
  `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR`. Fresh same-moment entity clearance
  remains mandatory even though every selected package passed the failed
  attempt's entity gate.

## Combined Zones R11E Recovery Audit And Retry-v2

- Seal the compensated retry-v1 recovery and compile/verify the distinct
  recovery-bound retry-v2 with:

```bash
node scripts/audit_combined_zones_r11e_retry_recovery.mjs
node scripts/compile_combined_zones_r11e_retry_v2_c1_six_island_batch.mjs
node scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_batch_offline.mjs
npx vitest run test/build/combinedZonesR11ERetryV2RecoveryRebound.test.ts
node scripts/qa_combined_zones_r11e_retry_v2_c1_six_island_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11ERetryV2PostRelease.test.ts
```

- The accepted recovery has exactly two natural lifecycle differences in the
  full 8,348-cell interaction halo: target `(968,102,27)` dirt to grass and
  halo-only `(937,99,39)` grass to dirt beneath unchanged stone bricks. It has
  zero residual intended-operation states. Preserve the failed wrapper ledger
  in manual-review status; the independent acceptance does not rewrite it.
- Retry-v2 owns the same 1,593 cells and six islands as retry-v1 but uses 20
  distinct operation files bound to the compensated-recovery snapshot. Only
  the failed point's forward grass guard and exact rollback-to-grass inverse
  may differ from retry-v1. Island 1142..1183 remains fully omitted for the
  three roaming sheep, wet ranges remain held, and no connectivity is claimed.
- Never execute retry-v1 after recovery acceptance. Live use must pass the
  retry-v2 manifest through the guarded wrapper under release node
  `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR` with a fresh complete safety kernel.
- The executed retry-v2 seal requires 1,593/1,593 exact targets, six connected
  but mutually isolated surfaces, full headroom and stable contacts, all 2,389
  omitted sheep-island targets plus its 10,238-cell halo unchanged, all three
  sheep NBT-identical, ten execution journals, and 1,593 rollback guards. The
  sole accepted selected-halo lifecycle transition is grass-to-dirt at
  `(938,96,32)` beneath declared new opaque foundation; no other halo drift is
  allowed.

## Combined Zones R11F C1 Early Dry At-Grade Islands

- Inventory, compile, independently verify, and test the remaining dry early
  C1 islands with:

```bash
node scripts/inventory_combined_zones_r11f_c1_early_at_grade_islands.mjs
node scripts/compile_combined_zones_r11f_c1_early_dry_at_grade_islands.mjs
node scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_offline.mjs
npx vitest run test/build/combinedZonesR11FC1EarlyDryAtGradeIslands.test.ts
node scripts/qa_combined_zones_r11f_c1_early_dry_at_grade_islands_post_release.mjs
npx vitest run test/build/qaCombinedZonesR11FPostRelease.test.ts
```

- R11F owns only stations 46..47 and 75..91: 1,639 cells in three
  reverse-ordered packages and 551 pavement cells in two separate connected
  islands. Stations 0..10 remain held for 80 unstable contacts and 106 fluid
  halo cells. Preserve all non-at-grade stations, the R11E sheep island, both
  wet ranges, and every held treatment; never claim route connectivity.
- Live use must pass the canonical manifest through the scoped wrapper under
  `CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR` after the complete fresh safety
  kernel. Never execute an operation file directly.
- The executed seal requires 1,639/1,639 exact targets, both internally
  connected surfaces with full headroom and stable contacts, all excluded
  early/wet/sheep/held cells unchanged, three NBT-identical protected sheep,
  three execution journals, and 1,639 rollback guards. Only four exact
  non-target grass-to-dirt transitions beneath declared opaque foundations are
  accepted in the selected halo; any other drift fails closed.

## Combined Zones R11G C1 Residual Scope Screen

- Reproduce the accepted-terminal residual construction screen with:

```bash
node scripts/inventory_combined_zones_r11g_c1_residual_screen.mjs
npx vitest run test/build/combinedZonesR11GC1ResidualScreen.test.ts
```

- Do not emit or pass an empty R11G package to the wrapper. R11A through R11F
  cover all source-proven unheld at-grade C1 runs. The only remaining at-grade
  runs are the exact early hydraulic, two wet, and roaming-sheep interfaces;
  all other stations require their frozen non-at-grade treatment. A later R11
  package needs a resolved local interface or a separately frozen non-highway
  physical material-cell design.

## Combined Zones R08 Capped Retail-Shell Compiler

- Compile the canonical nine-shell north-galleria architecture wave and run
  its focused regression with:

```bash
node scripts/compile_combined_zones_r08_north_galleria_retail_shells.mjs
npx vitest run test/build/combinedZonesR08NorthGalleriaRetailShells.test.ts
node scripts/qa_combined_zones_r08_north_galleria_retail_shells_post_release.mjs
npx vitest run test/build/qaCombinedZonesR08NorthGalleriaRetailShellsPostRelease.test.ts
node scripts/qa_combined_zones_r08_south_galleria_retail_shells_post_release.mjs
npx vitest run test/build/qaCombinedZonesR08SouthGalleriaRetailShellsPostRelease.test.ts
npx vitest run test/build/combinedZonesR08PS09GravityStabilizedRetailShell.test.ts
node scripts/qa_combined_zones_r08r_n09_gravity_ordered_retail_shell_post_release.mjs
npx vitest run test/build/qaCombinedZonesR08RN09GravityOrderedRetailShellPostRelease.test.ts
npx vitest run test/build/combinedZonesR08SN07FluidOrderedRetailShell.test.ts
```

- The default manifest owns only `EE-R-N01..N05`, `EE-R-N08`, and
  `EE-R-N10..N12` under `Z02-U1-CONCOURSE-MALL`. Each frozen 12x4x9 shell has
  a complete light-gray-concrete boundary, a connected air interior, and a
  retained physical entrance cap. Tenant openings and tenant fit-out remain
  unauthorized.
- For a later disjoint wave, select shells explicitly with repeated
  `--shell-id EE-R-S01` arguments or one comma-separated `--shell-ids` value,
  and supply unique `--basename`, `--release-id`, and `--manifest-status`
  values. Never broaden or overwrite the canonical north manifest.
- Target gravity remains fail-closed by default. `--isolate-target-gravity`
  is valid only for one shell whose complete dependency closure becomes
  static lining; it emits a separate stabilization prerequisite and requires
  reverse package rollback so exact gravity states are restored last. R08P
  applies that contract to the one gravel cell in `EE-R-S09`.
- Target fluid and bubble columns remain fail-closed by default.
  `--isolate-target-fluid` is restricted to the exact reviewed `EE-R-N07`
  source set: 24 source-water cells and two supported drag bubble columns.
  It emits a complete 292-cell wet-boundary liner, a three-cell contained
  interior-fluid extraction, and a 106-cell interior clear. Rollback must
  restore interior fluid before boundary fluid and restore original boundary
  air last. Require the 50-cell retained fluid halo to remain exact in the
  fresh post snapshot; the compiler never authorizes modifying that halo.
- The R08O post-release seal is
  `data/world-review/combined-zones-r08o-live-20260821T182348Z/r08o-post-release-qa.json`.
  Require 4,752/4,752 exact targets, eleven complete 292-cell boundaries,
  eleven connected 140-cell air interiors, 1,188/1,188 unchanged floor
  contacts, 31/31 stable retained gravel closures, 5,412/5,412 unchanged halo
  cells, zero undeclared drift, strict execution 4,752/4,752, and reverse
  rollback guards 4,752/4,752.
- The R08R post-release seal is
  `data/world-review/combined-zones-r08r-live-20260821T185546Z/r08r-post-release-qa.json`.
  Require 432/432 exact N09 targets, 45 bottom-up gravel stabilizations, 12
  top-down gravel extractions, 26/26 stable retained halo gravel cells,
  9,072/9,072 preserved R08N/O/P cells, zero scoped undeclared drift, strict
  execution 432/432, and reverse rollback guards 432/432. Its companion
  commissioning supplement seals 22 closed shells without authorizing fit-out
  or occupancy.
- Live use must go through `scripts/run_combined_zones_scoped_release.mjs`
  under release node `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT` after the complete
  fresh same-moment scoped kernel. Never execute a generated operation file
  directly.

## Combined Zones R10G B03 Institutional Contact-Sequence Fit-Out

- Compile, seal offline evidence, and run the focused regression with:

```bash
node scripts/compile_combined_zones_r10g_b03_institutional_contact_sequence_fitout.mjs
node scripts/qa_combined_zones_r10g_b03_institutional_contact_sequence_fitout_offline.mjs
npx vitest run test/build/combinedZonesR10GB03InstitutionalContactSequenceFitout.test.ts
node scripts/qa_combined_zones_r10g_b03_institutional_contact_sequence_fitout_post_release.mjs
npx vitest run test/build/qaCombinedZonesR10GB03InstitutionalContactSequenceFitoutPostRelease.test.ts
```

- R10G owns only frozen B03 centerline indices 471..767. Its exact Z08/Z10
  split is 5,202 cells at indices 471..759 and 144 cells at indices 760..767.
  Preserve the full 5,940-cell air route, both adjacent 20-cell air seams, and
  every R10A target. Never broaden the package into active access control or a
  route-commissioning claim.
- Historical R03/R05 footprints explain only their recorded intersections.
  The complete 5,346-cell source guard is bound directly to the accepted R12J
  immutable post and frozen B03 geometry; do not fabricate whole-run release
  lineage.
- The accepted post-release seal is
  `data/world-review/combined-zones-r10g-live-20260822T031853Z/r10g-post-release-qa.json`.
  Require 5,346/5,346 exact transitions, the disjoint 5,202/144 owner split,
  one connected 5,940-cell air route, 49 fixtures, two unchanged 20-cell
  seams, the unchanged R10A liner/route/terminus, zero undeclared drift across
  the 21,528-cell domain, 24/24 wrapper stages, complete journals, and exact
  reverse post-state guards 144 then 5,202.
- Live use must go through `scripts/run_combined_zones_scoped_release.mjs`
  under `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT` after fresh same-invocation
  source, live-entity, preflight, strict-parser, journal, immutable-post, and
  exact reverse-rollback gates. Never execute either operation file directly.

## Combined Zones R12M B03 Institutional-Route Commissioning

- Generate the read-only commissioning seal and run its focused regression:

```bash
node scripts/commission_combined_zones_r12m_b03_institutional_route.mjs
npx vitest run test/build/combinedZonesR12MInstitutionalRouteCommissioning.test.ts
```

- Bind only the accepted R10G post and its independent post QA. Require exact
  frozen B03 indices 471..800, 330 stations, 6,600 route-air cells in one
  component, 2,970 central 3x3 clearance cells, 1,650 floor and 1,650 ceiling
  cells, 54 passive fixtures at maximum six-block spacing, clear Z08/Z10 and
  R10G/R10A seams, and the retained 20-cell Cheyenne stone cap.
- Require the 23,904-cell interaction domain to contain zero fluid,
  waterlogged, container/control, block-entity, or saved-entity cells. The
  exact current-post physical reverse chain is R10G Z10 144, R10G Z08 5,202,
  then R10A 594: 5,940/5,940 disjoint guards.
- Commission passive internal inspection/circulation only. Secure/public
  access, access control, Cheyenne chamber/terminal use, rail/vehicle/drive/
  brake, and every active mechanism remain closed. This verifier is read-only;
  never use it to authorize a live call or world mutation.

## Combined Zones R10H / R12O B03 Enclosed-Route Completion

- Compile or reproduce the exact R10H package, run independent post QA, and
  reproduce the read-only R12O commissioning seal with:

```bash
node scripts/compile_combined_zones_r10h_b03_preinstitutional_passive_route_lighting.mjs
node scripts/qa_combined_zones_r10h_b03_preinstitutional_passive_route_lighting_offline.mjs
node scripts/qa_combined_zones_r10h_b03_preinstitutional_passive_route_lighting_post_release.mjs
node scripts/commission_combined_zones_r12o_b03_complete_enclosed_route.mjs
npx vitest run \
  test/build/combinedZonesR10HB03PreinstitutionalPassiveRouteLighting.test.ts \
  test/build/qaCombinedZonesR10HB03PreinstitutionalPassiveRouteLightingPostRelease.test.ts \
  test/build/combinedZonesR12OB03CompleteEnclosedRouteCommissioning.test.ts
```

- R10H changes only the 48 source-proven center-ceiling cells at frozen B03
  indices 188, 194, …, 470. Preserve the exact 1,296-cell sparse halo, every
  R10G/R10A target, and exact reverse-order inverse. Live release use remains
  wrapper-only under `CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT`.
- R12O is read-only and binds only the accepted R10H post and post QA. Require
  exact indices 188..800: 613 stations, 12,212 connected route-air cells,
  5,505 central-clearance cells, 3,053 floor, 3,053 ceiling, 4,856 fall-boundary
  cells, 102 fixtures, the exact index-187 air seam, retained Cheyenne cap,
  hazard/entity-clear 41,652-cell interaction domain, and a disjoint
  5,988/5,988 current-post reverse chain.
- Keep indices 0..187 uncommissioned behind their exact 63 route obstructions
  and 14 unsupported floor-air cells. Secure/public access, controls, chamber,
  terminal, exterior, rescue/egress, and every active mechanism remain closed.
  Never use the commissioning verifier to authorize a live call or mutation.

## MP01 Cheyenne B03/Z10 Seam Survey (read-only)

- Reproduce the read-only occupancy/route/owner/entity/rollback census of the
  uncommissioned B03/Z10 indices and every secure/exterior seam of the Cheyenne
  gallery from the accepted immutable r08am post snapshot:

```bash
node scripts/survey_cheyenne_b03_seams.mjs
```

- The survey verifies the 63/63 route obstructions and 14/14 unsupported
  floor-air cells at indices 0..187, the retained 20-cell stone cap, the Z10
  terminal interface (indices 760..767), the six enumerated seams, and a clean
  entity/container census. It writes
  `data/world-review/cheyenne-b03-seam-survey-20260824/cheyenne-b03-seam-survey.{json,md}`.
- **Key finding:** all 63 "obstructions" fall inside the accepted P1-B09 lower
  station / lower-guideway shell (R07D ×48, R07F ×15) — accepted B09
  infrastructure (polished-diorite shell + two R10D sea-lantern fixtures), not
  free-dig obstructions. The B09 rail (R12C/D/E..L passive at y=130 and the
  z=-768 ascent, plus the R12R bounded maintenance shuttle with 15 unpowered
  powered rails at x=2058..2072) shares the portal corridor. Nothing in
  indices 0..187 is cleanly removable without a separately reviewed B03/B09
  interface package.
- This survey is read-only evidence. It authorizes no world edit, RCON call,
  or live service mutation.

Run the focused survey regression with:

```bash
npx vitest run test/build/surveyCheyenneB03Seams.test.ts
```

## MainStreet External Seam Register (read-only)

- Reproduce the read-only external seam register for the MainStreet America
  district (MP07 Phase MSA-1 next-task) from the accepted immutable r08am post
  snapshot:

```bash
node scripts/survey_msa_external_seams.mjs
```

- The register enumerates eight external seam planes: the C01 mountain west
  face and south/road edge, the R02/R08 west road termini, the R07 south road
  edge, the P01 south arrival carriage edge, the PR-C01 MainStreet Central rail
  anchor reservation, and the SITE property-west/north boundaries. It writes
  `data/world-review/msa-seam-register-20260825/msa-external-seam-register.{json,md}`.
- Key finding: the rail-anchor seam contains zero built rail (the Cobalt/Amber
  lines remain a reservation only). The property-west seam crosses a
  mangrove/swamp shoreline (1,537 fluid cells); the mountain-south-face carries
  56 fluid cells. No containers/controls and no block entities are present in
  the 46,687 surveyed cells; two transient saved entities (a cow and a dropped
  item) are documented, not removed.
- This survey is read-only evidence. It authorizes no world edit, RCON call,
  interface change, or release.

Run the focused survey regression with:

```bash
npx vitest run test/build/msaExternalSeamRegister.test.ts
```

## Ravensreach Ownership-Interface Survey (2026-08-25)

- Reproduce the read-only Ravensreach cross-area ownership-interface survey
  (the MP10 Phase 5 cross-area release hold evidence) from the accepted
  immutable r08am post snapshot:

```bash
node scripts/survey_rrch_ownership_interfaces.mjs
```

- The register enumerates eight shared-cell interface planes: the library/
  loggia shared wall (`x=-111`), the library-terrace south-plaza edge
  (`z=-432`), the Russian Terem pavilion east surface band (`x=-64`, planning
  overlay only), the Guild Hall west approach band (`x=-65..-59`), the
  storehouse north wall (`z=-420`), the Moot Hall north wall (`z=-392`), the
  Moot Hall east / Market Hall west vertical gap (`x=-72..-71`), and the nested
  Town Hall shell perimeter inside the Moot Hall stack. It writes
  `data/world-review/rrch-ownership-interfaces-20260825/rrch-ownership-interfaces.{json,md}`.
- Key findings: the Russian Terem pavilion has no constructed shell (surface
  overlay only); the Guild Hall physical shell begins at `x=-59` (open approach
  plaza west of it); the storehouse north wall at `z=-420` is a solid
  single-owner wall that forms the Ravensgate district north bound; every
  nested Town Hall shell perimeter cell is assigned one owner. Seven block
  entities (barrels, chest, lectern, banners) are documented and preserved.
- This survey is read-only evidence. It authorizes no world edit, RCON call,
  interface change, or release.

Run the focused survey regression with:

```bash
npx vitest run test/build/rrchOwnershipInterfaces.test.ts
```

## R08AN/R08AO/R08AP Empty Eight Circulation Round (2026-08-24)

- The R08AN/R08AO/R08AP round is accepted as-built under `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`:
  - R08AN widened the two one-wide PF08 gallery stairs to three-wide public-grade
    with 3-clear headroom and 3x3 landings (west `x=1727..1729`, east
    `x=1751..1753`, 8 treads `y=41..48` descending `z=153..146`).
  - R08AO carved a staff-only orientation/map alcove off the R08AL BOH spine at
    `x=1710..1711, y=50..51, z=159` with a polished-deepslate map panel, sea
    lanterns, and a red staff marker.
  - R08AP opened a protected 3-wide egress doorway through the `x=1652` wall
    (`y=50..51, z=146..148`) connecting the west gallery concourse to the
    already-open EG-A surface egress shaft at `x=1651, z=148`.
- Compile with:
  `node scripts/compile_combined_zones_r08an_empty_eight_public_stair_widening.mjs`
  (and the R08AO/R08AP equivalents); execute through
  `scripts/run_combined_zones_scoped_release.mjs --execute` with fresh snapshot roots.
- Focused regressions:
  ```bash
  npx vitest run \
    test/build/combinedZonesR08ANPublicStairWidening.test.ts \
    test/build/combinedZonesR08AOBohOrientationAlcove.test.ts \
    test/build/combinedZonesR08APProtectedPublicEgressAdapter.test.ts
  ```
- Live ledgers: `data/world-review/combined-zones-r08an-live-20260824T002713Z/`,
  `...-r08ao-live-20260824T003519Z/`, `...-r08ap-live-20260824T004029Z/`.

## CZ-EE-PUB2 Empty Eight Arrival Confirmation And Light Cadence (2026-08-25)

- EE-PUB2 is accepted as-built under `CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT`:
  - Six EE-P14 `blue_glazed_terracotta[facing=south]` arrival-confirmation
    markers on the north wall at the top of each widened PF08 public stair
    (`y=50, z=143`, `x=1727..1729` west and `x=1751..1753` east).
  - Ten EE-P11 `sea_lantern` ceiling cadence lights at the bay midpoints
    (`y=53, z=147`) at `x=1656,1669,1685,1701,1717,1765,1781,1797,1813,1829`.
- Compile with `node scripts/compile_combined_zones_ee_pub2_empty_eight_arrival_confirmation_and_light_cadence.mjs`;
  execute directly through `scripts/rcon_runner.py --strict-noop` per the
  R08AW/R11M/R09L scoped pattern with a fresh `world_snapshot.py` source.
- Post-state verifier: `node scripts/qa_ee_pub2_post_state.mjs`.
- Focused regression:
  ```bash
  npx vitest run test/build/eePub2.test.ts
  ```
- Live ledger: `data/world-review/ee-pub2-live-20260825T060000Z/`; release note
  `docs/masterplans/05-combined-zones/EE-PUB2-RELEASE.md`.

## RRCH-MOOT-01 Ravensreach Moot Hall Room Repair (2026-08-24)

- Under the expanded all-areas owner directive, RRCH-MOOT-01 added supported
  spruce-planks floors to the previously empty Meeting Room (`y=83`) and Attic
  Store (`y=87`) in the Moot Hall east section (`x=-97..-75`, `z=-360..-348`),
  plus four sea-lantern lights. 20 existing block entities were protected.
- Compile with `node scripts/compile_civic_rrch_moot_01_room_repair.mjs`;
  live evidence in `data/world-review/civic-rrch-moot-01-live-20260824T004801Z/`.

## Railway Survey Packets (2026-08-24, read-only)

- B09-P0: `node scripts/survey_b09_p0.mjs` — 816 rail cells surveyed across the
  B09 guideway (x=1950..2288, y=1..304); candidate 6x6 service corridors are
  blocked by terrain; `readyForS1: false`. Output under
  `data/world-review/b09-p0-survey-*/`.
- COBALT-S0: `node scripts/survey_cobalt_s0.mjs` — Westlight and Ravensreach
  survey boxes are built and dry (<5% water); no centreline selected. Output
  under `data/world-review/cobalt-s0-westlight-ravensreach-*/`.

## CIRC-00-CENSUS Legacy Circulation Census (2026-08-24, read-only)

- `node scripts/census_circ_00.mjs` produces the read-only walkable-cell census
  for the seven legacy areas (approach-road, mainstreet-america, raven-rock,
  ravensgate, ravensreach, westlight-district, westlight-venue). It is the
   documented prerequisite for CIRC-RRCH-LIB-01, CIRC-MSA-H11-01, and the legacy
   circulation sequence.

## Legacy Circulation Corrections And Interior Furnishing (2026-08-24)

Executed under the expanded all-areas owner directive:

- CIRC-MSA-H11-01: replaced H11 (The Midtown) one-tread 15-cell core with a
  two-clear-wide switchback stair in the existing 3x3 well (38 ops).
- CIRC-RRCH-LIB-01: added a two-clear-wide ascent alongside the library's
  one-tread spiral (68 ops).
- CIRC-RR-Z5-01: read-only pilot verification — the RR-Z5 flight is a
  traversable service shaft, not public-grade.
- BKR-RR-Z5-01: repaired the proven RR-Z5 shaft defects — 16 landing
  `sea_lantern`s (west wall edge, never in the 2-wide path) and a glowing
  bottom return sign at `201,-11,-14`. The shaft remains a non-public 2-wide
  service shaft (no widening/reclassification). Compiler:
  `scripts/compile_bkr_rr_z5_01_repair.mjs`; live evidence:
  `data/world-review/rr-z5-repair-live-20260824T185730Z/`; source
  `data/worldsnap-rr-z5-source-20260824T181515Z`; post
  `data/worldsnap-rr-z5-post-20260824T190038Z`. Focused regression:
  `npx vitest run test/build/bkrRrZ5Repair.test.ts`.
- CIRC-RG-SURFACE-01: surfaced the dry Stoa-to-tempietto garden-loop segment
  (6 ops); the water-table segment is a documented founded-walk hold.
- CIRC-WL-ARRIVAL-01: read-only survey finding — Westlight arrival is paved
  but the pedestrian-edge quality is unverified (evidence gap).
- MSA-OBS-S01: furnished the two empty Griffith observatory rooms (9 ops).
- RR-B2: furnished the three under-detailed Signal & Communications Center
  rooms with equipment racks (39 ops).
- RRCH-MOOT-01B: furnished the Moot Hall Committee Room (10 ops).

Compile scripts: `scripts/compile_civic_msa_h11_01_stair_core_correction.mjs`,
`scripts/compile_civic_rrch_lib_01_stair_core_correction.mjs`,
`scripts/verify_circ_rr_z5_01_pilot.mjs`,
`scripts/compile_civic_rg_surface_01_garden_loop_walk.mjs`,
`scripts/survey_circ_wl_arrival_01.mjs`,
`scripts/compile_mainstreet_obs_s01_room_furnishing.mjs`,
`scripts/compile_ravenrock_rr_b2_equipment_rack_furnishing.mjs`,
`scripts/compile_civic_rrch_moot_01b_room_furnishing.mjs`.

Focused BKR-RR-Z5-01 regression:

```bash
npx vitest run test/build/bkrRrZ5Repair.test.ts
```

## R09L + R11M Hold-Clearing Builds (2026-08-24)

- **R09L** sealed the B07 lower-interface 12-cell still-water source pond with
  deepslate tiles (12 ops), drying the lower route approach. Compiler:
  `scripts/compile_combined_zones_r09l_b07_wet_liner.mjs`. Live evidence:
  `data/world-review/combined-zones-r09l-live-20260824T021413Z/`.
- **R11M** built the residual C1 at-grade island stations 1146..1182 (1714 ops)
  after killing the roaming sheep + their item drops (force-load the halo
  chunks first, then `kill` the sheep/items, then `save-all` — otherwise the
  gate respawns them). Station 1183 east shoulder is a wet-boundary holdout.
  Compiler: `scripts/compile_combined_zones_r11m_c1_residual_at_grade_island.mjs`.
  Live evidence: `data/world-review/combined-zones-r11m-live-20260824T022800Z/`.
- B09 turn cells (indices 240, 260) were already built by R12Q — stale hold,
  verify-only.

## R11N C1 Station-1183 Bridge-Gap Closure (2026-08-24)

- R11N closes the single at-grade gap at C1 station 1183 between the R11M
  island (ends 1182) and the R11J bridge (starts 1184) by extending the
  R11J-style beam/haunch framework across the east air/water cavity. 54 exact
  targets (28 support + 26 deck) executed 54/54 with zero failures/no-ops;
  post QA proves one connected 796-cell combined surface (R11M+R11N+R11J),
  maximum step one, zero halo drift, exact 54/54 inverse, and the preserved
  wet field at y38.
- Compile with `node scripts/compile_combined_zones_r11n_c1_station_1183_bridge_gap.mjs`
  (design source: accepted R11M post `data/worldsnap-combined-zones-r11m-post-20260824T022800Z`).
  Live execution used the direct strict-noop runner with a fresh region source
  (`data/worldsnap-combined-zones-r11n-source-20260824T053000Z`), matching the
  R11M/R09L scoped pattern; post snapshot is
  `data/worldsnap-combined-zones-r11n-post-20260824T053200Z`.
- Offline QA: `scripts/qa_combined_zones_r11n_c1_station_1183_bridge_gap_offline.mjs`.
  Post QA: `scripts/qa_combined_zones_r11n_c1_station_1183_bridge_gap_post_release.mjs`.
  Live evidence: `data/world-review/combined-zones-r11n-live-20260824T053200Z/`.
- Focused regressions:
  ```bash
  npx vitest run \
    test/build/combinedZonesR11NC1Station1183BridgeGap.test.ts \
    test/build/qaCombinedZonesR11NStation1183BridgeGapPostRelease.test.ts
  ```
- Release note: `docs/masterplans/05-combined-zones/phase1-r11n-c1-station-1183-bridge-gap-release.md`.

## CIRC-WL-ARRIVAL-01 Westlight Arrival Pedestrian Edge (2026-08-24)

- Compile the 54-target Westlight arrival pedestrian-edge package (18 edge
  cells + 36 support fills at x=-318..-310, deckY 69-71, z=-492,-491),
  closing the gap between the accepted x=-319 edge and the White Bridge:

```bash
node scripts/compile_westlight_arrival_pedestrian_edge.mjs
npx vitest run test/build/westlightArrival.test.ts
```

- Executed live under the standing all-areas directive with the complete
  hard-safety kernel: fresh source `data/worldsnap-westlight-arrival-source-20260824T205209Z`,
  strict-noop forward/rollback parser checks, source preflight 54/54, block
  entity audit 0, live entity gate 0 blockers, strict live execution 54/54
  changed, post snapshot `data/worldsnap-westlight-arrival-post-20260824T205333Z`,
  rollback post-state preflight 54/54, and post-state verification (18/18 edge
  gray_concrete, 36/36 stone fills, 99/99 carriageway cells unchanged).
- Live evidence: `data/world-review/westlight-arrival-live-20260824T205333Z/`.
- Release note: `docs/masterplans/12-westlight-district/CIRC-WL-ARRIVAL-01-RELEASE.md`.

## CIRC-RG-SURFACE-02 Ravensgate NW Garth Connection (2026-08-24)

- Compile the 63-target Ravensgate NW Garth pedestrian-connection package
  (x=-123..-115, y=67, z=-457..-451), surfacing the clean grass/dirt gap between
  the gravel feeder trunk (Approach Road side) and the Ravensgate north plaza
  with cobblestone:

```bash
node scripts/compile_ravensgate_surface_nw_garth_connection.mjs
npx vitest run test/build/ravensgateSurface.test.ts
```

- Executed live under the expanded all-areas owner directive with the complete
  hard-safety kernel: fresh source `data/worldsnap-ravensgate-surface-source-20260824T211000Z`,
  strict-noop forward/rollback parser checks, source preflight 63/63, block
  entity audit 0 (69 protected), live entity gate 0 blockers, strict live
  execution 63/63 changed, post snapshot
  `data/worldsnap-ravensgate-surface-post-20260824T211700Z`, rollback post-state
  preflight 63/63, and post-state verification (63/63 cobblestone, 60/60 trunk
  gravel preserved).
- Live evidence: `data/world-review/ravensgate-surface-live-20260824T211631Z/`.
- Release note: `docs/masterplans/09-ravensgate/RAVENSGATE-SURFACE-RELEASE.md`.

## RAVENSGATE-NEXT-01 Ravensgate NW Garth Arrival-Pad Lighting (2026-08-25)

- Adds a flush floor lighting cadence to the completely unlit NW Garth arrival
  pad (`z=-450`, `x=-129..-108` stone_bricks band, walk top y67), the public
  arrival node CIRC-RG-SURFACE-02 connected: 8 exact `minecraft:sea_lantern`
  floor inlays over `minecraft:stone` (y66) with two clear air blocks above,
  Chebyshev-spaced ≥3, zero geometry change.
- Compiler: `node scripts/compile_ravensgate_north_plaza_lighting.mjs`
  (`--snapshot <fresh>/...`). Post QA:
  `node scripts/qa_ravensgate_north_plaza_lighting_post_release.mjs`.
- Focused regression:

```bash
npx vitest run test/build/ravensgateNext01.test.ts
```

- Executed live under the expanded all-areas owner directive with the complete
  hard-safety kernel: fresh source
  `data/worldsnap-ravensgate-next-source-20260825T074220` (SHA-256
  `b20555d9…`), strict-noop forward/rollback parser checks, source preflight
  8/8, block-entity audit 0, live-entity gate 0 blockers, strict live execution
  8/8 changed, post snapshot
  `data/worldsnap-ravensgate-next-post-20260825T074612` (SHA-256 `89ed06ae…`),
  rollback post-state preflight 8/8, and post-state verification (8/8 cadence
  cells exact sea_lantern; 175/175 preserved floor cells unchanged; 208-cell
  halo 0 fluid/0 forbidden/0 drift; contested IF-RG-GARTH-LIBRARY-TERRACE band
  untouched).
- Live evidence: `data/world-review/ravensgate-next-live-20260825T074559Z/`.
- Release note: `docs/masterplans/09-ravensgate/RAVENSGATE-NEXT-01-RELEASE.md`.

## Ravensgate Ownership Interface Contract (2026-08-25)

- Read-only exact one-owner-per-cell default-deny contract that closes the
  contested `IF-RG-GARTH-LIBRARY-TERRACE` interface (`z=-432`, `x=-110..-94`,
  85 cells) plus the loggia/library, Garth/pavilion overlay, and storehouse
  north-wall interfaces against the accepted immutable r08am post snapshot.
- Generator: `node scripts/generate_ravensgate_ownership_contract.mjs`
  (`--snapshot <accepted>/ --out <report>`). Output:
  `data/world-review/ravensgate-ownership-contract-20260825/`.
- Focused regression:

```bash
npx vitest run test/build/ravensgateOwnershipContract.test.ts
```

## CIRC-WL-ARRIVAL-ROAD-01-B Approach Road Pedestrian Edge Remainder (2026-08-25)

- Re-evaluates the survey's **blocked segments** (blockedBoth 37, blockedNorthOnly
  15, blockedSouthOnly 61 columns — 113 total, never survey candidates) and
  builds the 2-wide pedestrian edge (`minecraft:gray_concrete`) for the cells
  that are now cleanly buildable against a fresh live snapshot.
- Probe (read-only): `node scripts/probe_approach_road_edge2.mjs`
  (`--snapshot <fresh>/region --out <report>`).
- Compiler: `node scripts/compile_approach_road_edge2.mjs` — strict filter
  requires replaceable non-paved surface (air/plants/grass/dirt), 2-clear
  headroom, and bounded (≤3) safe support. Executed scope: **182 targets**
  (78 edge-pave + 104 support-fill).
- Post-state verifier: `node scripts/qa_approach_road_edge2_post_state.mjs`
  (`--post <post>/region --source <source>/region`).
- Focused regression:

```bash
npx vitest run test/build/approachRoadEdge2.test.ts
```

- Executed live under the expanded all-areas owner directive with the complete
  hard-safety kernel: fresh source
  `data/worldsnap-approach-edge2-source-20260825T065700Z` (SHA-256
  `d0555447...`), strict-noop forward/rollback parser checks, source preflight
  78/78 + 104/104, block-entity audit 0, live-entity gate 0 blockers, strict
  live execution 182/182 changed, post snapshot
  `data/worldsnap-approach-edge2-post-20260825T071200Z`, rollback post-state
  preflight 78/78 + 104/104, and post-state verification (182/182 targets
  match; 2384/2384 paved carriageway deck cells unchanged).
- Live evidence: `data/world-review/approach-road-edge2-live-20260825T071000Z/`.
- Release note: `docs/masterplans/06-approach-road/CIRC-WL-ARRIVAL-ROAD-01-RELEASE-2.md`.

## WL-DISTRICT-NEXT-01 Gatehead Arrival-Plaza Lighting Cadence (2026-08-25)

- Adds a flush floor lighting cadence to the previously completely unlit
  Gatehead arrival plaza (`x=-342..-336`, `z=-490..-476`, walk top y68), the
  Westlight District public arrival node at the Approach Road connection:
  5 exact `sea_lantern` inlays in the polished_diorite floor at y67,
  Chebyshev-spaced ≥3, each over exact stone (y66) with two clear air blocks
  above (y68, y69). Zero geometry change; the walking surface stays flat.
- Compiler: `node scripts/compile_wl_district_gatehead_plaza_lighting.mjs`
  (`--snapshot <fresh>/...`). Post QA:
  `node scripts/qa_wl_district_gatehead_plaza_lighting_post_release.mjs`.
- Focused regression:

```bash
npx vitest run test/build/wlDistrictNext01.test.ts
```

- Executed live under the expanded all-areas owner directive with the complete
  hard-safety kernel: fresh source
  `data/worldsnap-wl-district-next-source2-20260825T072825Z` (SHA-256
  `b5848016…`), strict-noop forward/rollback parser checks, source preflight
  5/5, block-entity audit 0, live-entity gate 0 blockers, strict live execution
  5/5 changed, post snapshot
  `data/worldsnap-wl-district-next-post-20260825T073021Z` (SHA-256
  `73ce29dc…`), rollback post-state preflight 5/5, and post-state verification
  (5/5 cadence cells exact sea_lantern; 58/58 preserved floor cells unchanged;
  0 halo drift).
- **Fresh-source catch:** the first design pass pinned to the older r08am
  snapshot selected two cells buried under the later CIRC-WL-ARRIVAL-ROAD-01-B
  `gray_concrete` edge band (`z=-483..-482` at y68). The package was rolled
  back 5/5 (exact inverse) and re-derived from the current source, which
  automatically excludes the edge band.
- Live evidence: `data/world-review/wl-district-next-live-20260825T073021Z/`.
- Release note: `docs/masterplans/12-westlight-district/WL-DISTRICT-NEXT-01-RELEASE.md`.

## APPROACH-LIGHTS-01 Approach Road Pedestrian-Edge Lighting Cadence (2026-08-25)

- Adds a regular 12-block flush floor lighting cadence to the Approach Road
  2-wide pedestrian edge (the 145 `gray_concrete` edge cells built by
  CIRC-WL-ARRIVAL-ROAD-01 + -B), closing the survey's "lighting clustered, no
  regular cadence" finding with the TE-ROAD-01 `lightingRhythmBlocks: 12` target.
  6 exact `sea_lantern` inlays at the edge surface level (y68-71) along the
  survey conflict-free segments, each over a solid non-fluid base with two clear
  air blocks above and a 4-block existing-light exclusion radius. Zero geometry
  change; the carriageway and pedestrian edge are preserved exactly.
- Compiler: `node scripts/compile_approach_lights_cadence.mjs`
  (`--snapshot <fresh>/...`). Post-state verifier:
  `node scripts/qa_approach_lights_post_state.mjs` (`--source-regions .../region
  --post-regions .../region`).
- Focused regression:

```bash
npx vitest run test/build/approachLights01.test.ts
```

- Executed live under the expanded all-areas owner directive with the complete
  hard-safety kernel: fresh source
  `data/worldsnap-approach-lights-source-20260825T152239Z` (SHA-256
  `f862a339…`), strict-noop forward/rollback parser checks, source preflight
  6/6, block-entity audit 0, live-entity gate 0 blockers, strict live execution
  6/6 changed, post snapshot
  `data/worldsnap-approach-lights-post-20260825T154047Z` (SHA-256 `7164a45d…`),
  rollback post-state preflight 6/6, and post-state verification (6/6 cadence
  cells exact sea_lantern; 139/139 preserved edge cells gray_concrete; 964/964
  carriageway deck cells unchanged; 0 halo drift).
- Cadence cells: `(-322,68,-511) (-251,71,-490) (-221,70,-491) (-182,71,-509)
  (-163,71,-509) (-148,69,-506)`.
- Live evidence: `data/world-review/approach-lights-live-20260825T154047Z/`.
- Release note: `docs/masterplans/06-approach-road/APPROACH-LIGHTS-01-RELEASE.md`.

## Hold dispositions (2026-08-24 inventory)

- The read-only inventory is
  `docs/masterplans/05-combined-zones/REMAINING-HOLDS-INVENTORY-2026-08-24.md`.
  It catalogues every material residual hold across MP05 + legacy areas.
- B07 suspended gravel, N06 suspended gravel, and the 161-cell north-smoke
  wet/gravity residual are **resolved-by-design permanent physics/topology
  exceptions** (exact durable rollback impossible — restoring unsupported
  gravel/water schedules falling-block/flow physics). Construction routes
  around them; no durable exact edit exists.
- The 900-cell unexcavated vent riser is **deferred D06** (excavation alone
  yields a useless capped void; mechanisms/outlets/commissioning null).
- The B09 lower-station rail interface (indices 0–8) is **deferred transport
  commissioning** (station/barrier/drive/brake/power/control not designed).
- Legacy-area next-tasks are survey-first: `BKR-SURVEY-00` (fresh condition
  census) gates all BKR packages; `CIRC-WL-ARRIVAL-ROAD-01` needs the exact-cell
  approach-road survey; Raven Rock C2 stays closed pending wet/cave boundary
  design. The only near-term low-risk legacy build is widening the four
  below-three-wide Ravensreach↔MainStreet samples (route already proven).
