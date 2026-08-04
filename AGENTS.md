# AGENTS.md

Guidance for coding agents working in `/opt/mc-fleet-bot`.

## Repository Shape

- This repo has two TypeScript apps:
- Backend bot sidecar in the repository root (`src/`, compiled to `dist/`).
- Frontend dashboard in `web/` (Next.js App Router).
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
- `src/worker/` per-bot worker threads, IPC channel, and cross-thread proxies.
- `src/ai/` LLM client abstraction (Anthropic, Gemini, OpenAI, MiniMax, Ollama, VoyageAI behind a `ModelRouter`) and prompt logic.
- `src/server/` Express + Socket.IO API.

## Source Of Truth

- Follow existing code over generic style advice.
- Respect `CLAUDE.md` in the repo root; it contains operational project notes.
- No `.cursorrules`, `.cursor/rules/`, or `.github/copilot-instructions.md` files were present when this file was written.
- There was no existing repo-root `AGENTS.md`; this file is the canonical agent guide.

## Environment And Setup

- Install backend deps from the repo root with `npm install`.
- Install frontend deps with `npm install --prefix web` if needed.
- Copy `.env.example` to `.env` and set `GOOGLE_API_KEY` for AI-enabled bot behavior.
- Main runtime config lives in `config.yml`.
- Persistent data is stored under `data/` and learned skills under `skills/`.

## Build, Lint, Test, Run

### Backend (repo root)

- Build: `npm run build`
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

Run all control platform tests:
```bash
npx vitest run test/control/
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
- `npm run lint --prefix web` currently reports existing frontend warnings and errors.
- Do not assume the frontend is lint-clean before making changes; check whether failures are pre-existing.

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

## Combined Zones Phase 0 Terrain Survey

- The authority chain is Masterplans 01–03 internal architecture -> Masterplan
  04 normalized composition -> Masterplan 05 current-world placement, terrain,
  adapters, additions, interfaces, and delivery gates. The exact reconciliation
  is in `masterplans/04-combined-complex/authority-reconciliation.json`.
- The re-sited Phase 0 package is in `masterplans/05-combined-zones/` and passes
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
  --out masterplans/05-combined-zones/resiting-candidate-analysis.json
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
  --out-dir masterplans/05-combined-zones
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
  `masterplans/05-combined-zones/phase1-geometry-coordination.json`. It freezes
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
node --expose-gc --max-old-space-size=4096 \
  scripts/audit_combined_zones_d02_s01_s02_region_evidence.mjs
node scripts/generate_combined_zones_d05_conservative_defaults.mjs
node scripts/audit_combined_zones_d05_relic_condition_access.mjs
node scripts/compile_combined_zones_d06_egress_geometry.mjs
node scripts/compile_combined_zones_phase1_connector_geometry.mjs
node scripts/generate_combined_zones_autonomous_selections.mjs
node --expose-gc --max-old-space-size=4096 \
  scripts/audit_combined_zones_d02_s03_hydrology_outfalls.mjs
node scripts/compile_combined_zones_d05_future_state_contract.mjs
node scripts/audit_combined_zones_r00_readiness.mjs
```

- D02-S03 is a read-only 62,816,256-cell C1-plus-halo component audit. Zero
  acceptable receiver candidates means exact closed drainage, sumps/pumps, or
  an explicit hash-bound receiver/interface exception must be designed; it is
  never permission to invent an outfall.
- D05-S02 defines twelve fail-closed future/direct/influence set families. A
  passing contract with zero emitted cells means the schema is ready while its
  geometry, mechanisms, ownership/interfaces, and accepted technical kernels
  are not. Never promote an unknown influence to an empty accepted set.
- The connector compiler freezes review geometry only. B08's selected
  220-step route is not commissioned; B07's mineshaft overlap and B09's absent
  future mountain face remain hard HOLDs. All outputs contain zero operations.

- R00 is the nonphysical G01-G07 design freeze. D02, D05, and D06 may resolve
  only from immutable pre-R00 design/external-acceptance evidence. Operations,
  source guards, manifests, preflights, live entity clearance, pilots,
  execution, rollback, route QA, and post-state QA cannot satisfy G02. After
  accepted R00, R01 is the bounded physical validation and must pass G01-G19
  before R02 becomes eligible.
- `audit_combined_zones_r00_readiness.mjs` binds the current authority and Phase
  1 evidence, evaluates only G01-G07, classifies blockers as `OFFLINE_ACTION`,
  `EXTERNAL_EVIDENCE`, or `DEFERRED_G08_G19`, and emits zero operations. Its
  current result is G01 PASS, G02-G07 HOLD; it is not release authorization.

- A valid contract may still report `CONTRACT_VALID_BUILD_BLOCKED`. Do not use
  `--require-ready`, generate operations, take a live entity gate, or execute a
  release until all design, ownership, interface, protected-feature, civil,
  hydrology, compiler, fresh-snapshot, preflight, and authorization gates pass
  against identical artifact hashes.
- The validator checks resolved decisions against the bound decision ledger,
  protected cores against the relic census, reviewed-buffer schema and hashes,
  compiled R01 candidate readiness separately from completed R01/Phase 1
  acceptance, and explicit hash-bound current evaluations for G01–G14. The
  present contract intentionally
  has an empty `currentGateEvaluations` array and all R00–R13 nodes `BLOCKED`.
  Advancing a node requires the missing project release tooling and a reviewed
  contract-state transition; the current-state validator is not an execution
  wrapper.
- Phase advancement is exact and serial: G01–G14 precede a transaction, G15 is
  journaled atomic execution, and G01–G19 precede acceptance. A PASS advances
  to the next release node; HOLD triggers offline remediation and never a
  narrative or manual waiver.
