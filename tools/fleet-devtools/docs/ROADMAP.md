# Roadmap

## Phase 1 — read-only foundation (implemented)

- standalone npm workspace;
- server/world registry and local connector;
- deterministic Anvil snapshot identity, including handling of the pre-1.17
  `Level` wrapper and the post-1.17 `Sections` casing;
- bounded or whole-snapshot block census with per-region progress events;
- per-region SHA-256 diff between two snapshots on the same server;
- read-only SQLite catalog and world-feature export with safe-integer JSON;
- declarative recipe engine with typed parameters (`string`, `integer`,
  `bounds` with optional min/max);
- persistent job log, hash-bound artifact manifest, and step result cache for
  `snapshot-summary` and `database-catalog`;
- CLI, REST API, serialized worker, and responsive dashboard;
- job cancellation across API, CLI, and dashboard;
- CI on push and PR against main (build, test, lint, format check);
- ignored local IANLAN adapter and reusable example configuration.

## Phase 2 — report and mapping engine

- extract the offline perspective and top-down Anvil renderer;
- reusable map layers, legends, labels, bounds, and vertical slices;
- HTML section/layout components and Chromium PDF finalization;
- screenshot/capture manifests and contact sheets;
- resume caches for `block-census` and `world-features` (cache layer exists;
  per-step opt-in pending);
- IANLAN preset for Master Plan and Underground Navigation;
- publisher adapters for IANLAN NextGen and Box, kept outside report execution.

## Phase 3 — Design Studio

- editable points, bounds, routes, rooms, tunnels, and vertical stacks;
- palette and material schedules;
- before/proposed/diff map layers;
- collision, ownership, accessibility, and block-count checks;
- compile designs into reviewable forward and rollback operation plans;
- issue links without embedding server-specific issues in core.

## Phase 4 — guarded releases

- separate release service and permission boundary;
- immutable source-state preflight;
- complete exact rollback;
- entity/live-clearance gates;
- explicit operator approval;
- strict-noop execution adapters;
- atomic transaction ledgers;
- immutable post snapshot and route/media QA.

No Phase 4 capability should be reachable from a report recipe.
