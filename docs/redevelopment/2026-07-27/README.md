# World Redevelopment Program — 2026-07-27

This directory is the source-of-truth handoff for the atlas, database/media
catalog, infrastructure standards, and physical redevelopment requested on
2026-07-27.

## Final disposition

`REDEV-2026-07-27-R1` is **accepted as built**. Five live packages committed
atomically, final machine QA is `PASS`, 7,265/7,265 rollback guards match the
installed post-state, 44/44 directional route runs passed, 91 post-release
screenshots were accepted, and 44 as-built database features were imported.

The authoritative completion narrative is `as-built-release-completion.md`.
The authoritative machine result is
`data/world-review/redevelopment-post-deployment-qa-2026-07-27.json`.

## Naming note

The request calls the development **GrandStreet America**. The built project,
source files, database keys, WorldGuard region, markers, and scripts consistently
call it **MainStreet America**. This package retains `mainstreet-america` in every
machine-facing identifier so automation remains safe, while treating
“GrandStreet America” as a user-facing alias.

## Evidence hierarchy

1. The accepted immutable post-release snapshot in
   `data/worldsnap-postrelease-f8edf99494c023dd-20260728/region`.
2. The spatial catalog in `data/world-map.db`.
3. Exact block census and reachability results pinned to the snapshot hash.
4. Authored plans and manifests in `mainstreet-america/planning`.
5. Generated maps and same-snapshot offline perspective captures.
6. External primary and authoritative planning/design sources.
7. Design recommendations, explicitly labeled as recommendations.

No map, screenshot, observation, or completion claim should be mixed across
snapshot hashes without being labeled.

`data/worldsnap/region` is the mutable operational mirror. It has already
advanced through ordinary server saves and is not release evidence.

## Package index

- `requirements-traceability.md` — request-by-request scope, owner, evidence,
  implementation state, and acceptance test.
- `as-built-release-completion.md` — final physical outcome, package hashes,
  incident/correction record, snapshots, routes, media, database delta,
  operational handoff, known boundaries, and final acceptance.
- `master-plan.md` — research synthesis and governing development plan.
- `infrastructure-standards.md` — tunnels, stairs, wayfinding, stadium,
  underground concealment, roads, parking, and residential frontage.
- `execution-register.md` — work packages, dependencies, protected assets,
  rollback rules, and QA gates.
- `release-attempt-1-incident.md` — append-only first live attempt record,
  automatic compensation evidence, neighbor-update root cause, and corrective
  rebase requirements.
- `artifact-register.md` — generated file-level evidence inventory with byte
  sizes, SHA-256 hashes, image dimensions, status fields, package bindings, and
  snapshot bindings.
- `bunker-surface-release.md` — C01 Phase 1 landform/road package, independent
  exact-state QA, release/rollback gates, and distinct Phase 2 requirements.
- `mainstreet-surface-release.md` — GrandStreet/MainStreet R4/R5 garage,
  rear-alley, B02/B03 public-realm release, atomic rollback contract, media
  schedule, and independent 24-gate QA addendum.
- `mainstreet-r4-r5-engineering-release.md` — compact engineering crosswalk for
  the R4/R5 operation, design, test, and machine-report artifacts.
- `database-and-media-report.md` — schema, content census, coverage gaps, and
  database-object-to-media crosswalk.
- `visual-evidence-plan.md` — mandatory before/after and recurring capture set.
- `risk-register.md` — active risks, mitigations, and stop-work triggers.
- `research-bibliography.md` — web sources and how each source informed the plan.
- `master-plan.pdf` — compiled review document containing the major reports,
  maps, screenshots, and appendices.

## Immutable accepted post-state

- Snapshot date: 2026-07-28 UTC
- Snapshot SHA-256: `f8edf99494c023dd4b7e412d146a9018bb4ac29636f19c27431083e6b0f6ec10`
- Immutable directory:
  `data/worldsnap-postrelease-f8edf99494c023dd-20260728/region`
- Snapshot completeness for the full surface atlas: 3,808 / 3,808 requested
  chunks loaded; zero missing.
- New master map:
  `data/exports/box/redevelopment-atlas-post-2026-07-27/team-a/00-overall-active-world-surface-atlas.png`
- Final catalog: 824 features, 21 scans, 1,830 observations.
- Post media: 91 accepted release screenshots and seven atlas maps.

The earlier `c9e2bf0a…` baseline is retained throughout the planning documents
for before-state provenance. It is not the final as-built snapshot.

## Deployment rule

Physical work is released in small, snapshot-pinned packages. Every package must
have:

1. exact source-state guards or a documented reason a guarded operation is
   impossible;
2. a dry run;
3. a saved-world backup/snapshot reference;
4. an explicit protected-block and block-entity inventory;
5. a post-run snapshot;
6. block census and reachability checks;
7. before/after screenshots from recorded cameras;
8. database and marker updates;
9. a rollback artifact or restoration procedure.

All nine gates were met for the accepted five-package release. Future packages
must repeat them against a new snapshot; acceptance of this release does not
authorize replaying its forward operations.
