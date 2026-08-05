# Changelog

All notable changes to DyoBot are documented in this file.

---

## 2026-08-05

### World Showcase — masterplan program report (v1.1.0)

New **Report 03 · Masterplan Program** at `/reports/masterplan-program`, filling
the gap the library had between reports 02 and 04. It surfaces all thirteen
plans in `docs/masterplans/`:

- The `01 + 02 + 03 → 04 → 05` authority chain, drawn as a flow so the
  composition order is legible.
- A filterable library of all thirteen plans — authority chain vs. area
  baselines — each with its role, status, summary, and key figures.
- The R00 readiness board: G01 and G03 pass; G02 and G04–G07 hold.
- Six standing constraints, including that no masterplan artifact authorizes a
  world edit and that broad 2D envelopes are not ownership claims.
- Eleven design views downscaled from the 01–05 rendering and map sets.

Plan figures are transcribed into `world-showcase/lib/masterplans.ts` from the
committed `build-info.json` (plans 01–05) and `MASTERPLAN.md` front matter
(plans 06–13). Cover and gallery art is generated into
`world-showcase/public/masterplans/` (17 WebP files, 2.0 MB total).

### World Showcase — cleanup

The unused Cloudflare Workers deploy path was removed; Railway is now the single
documented deployment. Deleted `wrangler.jsonc`, `open-next.config.ts`, and
`scripts/prepare_sites_worker.mjs`; dropped the `build:worker`, `build:sites`,
and `preview` scripts and the `@opennextjs/cloudflare` and `wrangler`
devDependencies; pruned the stale ignore entries from `.gitignore` and
`.railwayignore`.

The Railway setup itself is unchanged — Railpack builder, `npm run build` /
`npm run start`, `/api/health` check, restart-on-failure with three retries.

`README.md` gains a World Showcase section covering the report library, the run
and deploy commands, and the auth model.

---

## 2026-08-03

### Repository reorganisation

Site design packages and historical review docs moved out of the repo root into
`docs/`:

- `mainstreet-america/`, `raven-rock/`, `ravensreach/`, `worker-town/`, `audits/`
  → `docs/…`
- `BUYWITHMONEY.md`, `REPO_REVIEW.md`, `REPO_REVIEW_NOTES.md`,
  `TOWN_BUILDER_SPEC.md`, `barley-audit.md` → `docs/`

Ravensreach material was consolidated from three locations into one:

- `audits/ravensreach*.yaml` → `docs/ravensreach/audits/`
- `docs/MASTERPLAN-RAVENSREACH-PUBLIC-REALM.md`, `docs/RAVENSREACH-*.md`
  → `docs/ravensreach/design/`
- `docs/INCIDENT-2026-07-25-ravensreach-structure-loss.md`
  → `docs/ravensreach/qa/`

The two handoffs were merged into a single `HANDOFF.md`:

- `HANDOFF-2026-07-26.md` (Westlight session) was folded in and deleted. Its
  completed build log is history and was dropped; its durable content survives as
  §4 traps 16–20 (RCON vs bot, shafts last, doors need two ops, `iron_chain`,
  `pgrep` self-match) and a new §9 covering the fresh-session checklist, the Moot
  Hall basement venues that were never re-verified, and the nine one-shot repair
  ops files that stray-unit checks will otherwise flag.
- Fixed a pre-existing formatting bug: traps 16–17 had been appended to the end of
  §8 instead of §4, so the trap list read 1–15 and then stopped. Now contiguous
  1–20.

Other moves:

- `check_json.py`, `check_pdf.py` → `scripts/`
- `ISSUES.MD` → `ISSUES.md` (extension case)
- `CLAUDE.md` untracked (it was already listed in `.gitignore`, which does not
  retroactively untrack; the file remains on disk)

**183 path references were rewritten across 53 files** so the moved paths still
resolve — 22 code files (`scripts/`, `src/integrations/BoxIntegration.ts`,
`test/`, `builds/manifest.yaml`) and 31 docs. Several `scripts/*.mjs` carried the
old locations as *default* argument values, so they would have failed only when
run the way the docs describe.

Deliberately **not** rewritten, to avoid falsifying dated records: entries above
this line in this changelog, `docs/redevelopment/**`, `world-showcase/public/**`,
and the sealed `masterplans/01-05` packages. Paths quoted there refer to the
layout as it stood at the time.

---

## 2026-07-27

### Features — MainStreet secure complex detail wave
- **Parking-side bunker rebuilt as a complete facility** — added an enclosed,
  two-wide primary stair serving lower operations, upper hangar/arena, shelter,
  surface hangar, and office; rebuilt the lower theater and three conference
  rooms; and fitted the hangar with aircraft, rotorcraft, rescue equipment, a
  catwalk, and the arena with a response course, triage, and decontamination.
- **Observatory given its own program and working visual identity** — divided
  the public observatory into a foyer, instrument archive, optics workshops,
  observation logs, lab, and photo-control rooms. All three domes now have open
  roof apertures, bearing rings, telescope tubes, shutters, and distinct lenses.
- **Hidden penthouse and secure stack completed** — separated the private
  apartment from public observatory circulation and fitted its library salon,
  twelve-monitor command room, dressing lounge, bedroom, living salon,
  dining-kitchen, glass-and-marble spa, and safe suite. The concealed stair now
  continues through a furnished fallout shelter to the dry three-level grand
  vault, whose galleries have working stairs, rails, and loaded treasure stores.
- **Secure-complex atlas and database refresh** — published five annotated map
  sheets plus a combined PDF and recorded 41 authoritative feature
  observations against the final post-build snapshot.

### Bug Fixes — MainStreet secure complex
- **Misleading surface route** — removed the public scaffold that crossed the
  penthouse bedroom, capped and labeled the legacy U01 riser as maintenance
  access, and installed clear level signs on the new primary stair.
- **One-way and unfinished underground spaces** — repaired the shelter treasury
  connection, restored the safe-room bulkhead, sealed raw cavern edges, added
  real shelter beds and facilities, and installed rails across all three vault
  levels.

### Verification — MainStreet secure complex
- **Saved-world proof** — 2,075/2,075 guarded build commands and 11/11 final
  wayfinding commands succeeded live. The immutable post-sign snapshot
  `8fbf6997638da3ef36f200ce73315e0becbea3746ffbc350817cb3d1b0de66ac`
  passes 21/21 route and structural assertions, including fourteen
  bidirectional route suites.

### Features — worldwide interiors
- **Whole-world room register and fit-out** — promoted 68 active structures and
  236 named functional rooms into the spatial database, then furnished every
  room that the snapshot census classified as empty or under-detailed.
- **Ladder-free vertical circulation** — rebuilt Raven Rock building stairs,
  RR-Z5's seventeen-level surface stair, the Ravensgate campanile, Westlight
  upper floors, H11, and the six-level Ravensreach Library. The final census
  reports zero cataloged ladders and zero multi-floor structures without stairs.
- **First-class scan history** — seven final `region_snapshot` scans attach 335
  observations and the authoritative snapshot hash to active-area buildings,
  rooms, circulation records, and the approach road.

### Bug Fixes — world
- **Beacon Inn tower was solid** — excavated the advertised lower lounge,
  authored three occupied tower levels and a continuous quartz spiral, and
  removed a floor plate that allowed descent but blocked ascent to the lookout.
- **Four C01 rooms were sealed** — connected the finished Bunk, Records, Comms,
  and Fabrication rooms to the lower operations gallery with broad walkable
  arches.
- **Hidden room failures** — opened H09's sealed primary suite, replaced H11
  scaffolding with a real four-floor stair, and removed 45 legacy ladders from
  the Library, Market, and Grange.

### Verification
- **Saved-world proof after execution** — 4,340/4,340 commands succeeded across
  four waves. A fresh 26-region snapshot passes 32/32 route suites and a final
  census of 236/236 fitted rooms.

---

## 2026-07-26

### Tooling — build verification
- **Builds are now checked for traversability, not just placement** — `verify_ops.py`
  scored the Moot Hall descent BUILT 5/5 while it was an unusable shaft: every sampled
  block existed, and a corridor ceiling, a dome cap and a missing ladder made it a
  staircase to nowhere. Added `scripts/reachability.mjs` (flood-fills player-occupiable
  space; `--box` mode reports what fraction of a room's interior is reachable),
  `builds/manifest.yaml` (every build unit, its ops files and its walk assertions), and
  `scripts/build_status.py` (runs both checks over every unit, one table). Unlisted ops
  files are flagged — an unchecked build is how things get forgotten.
- **`both_ways` walk checks** — a player falls any distance but climbs one block, so a
  one-way check passes on a hole in the floor. Every basement in Ravensreach passed
  that way; the Moot Hall's were in fact completely sealed.
- **`scripts/verify_ops.py`** — samples ops against the world instead of trusting a
  runner's "issued" tally, and is ordering-aware so a later op legitimately overwriting
  an earlier one is not reported as missing. It found that **seven ops files had never
  run at all**.

### Performance
- **Build ops moved from WorldEdit-via-bot to RCON `/fill`** — measured **0.002 s per
  command against ~1.5 s per op**; the 9,500-op Westlight programme went from a
  projected four hours to **19 seconds**. `scripts/rcon_runner.py` handles the three
  ways `/fill` fails silently: unloaded chunks (it force-loads the bounding box and
  restores the operator's pinned chunks), the 32768-block cap, and the absence of random
  patterns — geometry is laid flat and accents scattered in a few big `//replace` passes.

### Features — world
- **WESTLIGHT** — the stadium complex, relocated ~275 blocks west to (-360,-560): a
  6,000-seat enclosed theatre at y18-46 inside a deep blue drum with a flat technical
  sky grid, a transfer slab at y54-57, a 23-terrace bowl with its field nine blocks
  below grade, and a canopy at radii 74x66 on columns at 70x62. The larger canopy is
  what makes an honest ~10,800 capacity possible; the town site was capped at ~6,200 by
  plan area inside its column ring. The old stadium at (-85,-513) was demolished and the
  site returned to flat grass.
- **The Sanctum** — a circular theatre-and-temple beneath the town, floor y26, domed to
  y50, with tiered seating in a semicircle around a raised stage and a continuous
  backlit screen around the perimeter wall.
- **Moot Hall penthouse** — the roof void converted to an attic storey with dormers, a
  railed terrace cut into the south slope, and a concealed door behind the bookcase.
- **Moot Hall vertical core** — one shaft serving penthouse, ground, B1, B2 and the deep
  corridor. Before it, the entire basement programme (three-screen multiplex, bowling
  alley, two-level bar, arcade, bank, IT office) was **sealed**.
- **Library, Amsterdam square, walkways, Market Hall and Grange Hall interiors** — the
  six-storey library (three above, three below), klinker paving with two canals and a
  stepped-gable terrace, a connected road network, and both Fable 5 interior plans
  executed non-destructively (chest counts verified unchanged).

### Bug Fixes
- **Every door placed by a generator had silently vanished** — a door is two blocks with
  *different* states, and setting a 2-tall selection to a door id writes two
  `half=lower` halves, which pop off on load. 29 doors re-placed; all four generators
  now carry a `door()` helper.
- **The library's upper floors were unreachable** — the stair core built five straight
  flights in one footprint, each a step short of its landing. Rebuilt as switchbacks.
- **Both Ravensreach canals leaked** — dug with open ends, they put 23 blocks of water
  inside a cottage and 107 more across the ground. Ends capped; irrigation channels
  walled and their courts filled so `REPL air` gaps could not spread.
- **The walkway generator cut through three cottages** — `road()` clears y68-71 to air.
  Walls restored, fittings replaced, routes moved. Chest *contents* were unrecoverable.
- **An audit check passed while finding a leak** — `contains` takes only a minimum, so
  `max: 2` was ignored and nine blocks of escaped water read as green. Now `absent`.

### Documentation
- `HANDOFF-2026-07-26.md` — next steps in order of leverage, the sealed-build findings,
  and a fresh-session checklist so nothing built today is missed.
- `audits/ravensreach.yaml` grew 52 -> 65 checks (Amsterdam square, library, pavilion),
  re-baselined the plaza paving and the Moot Hall roof, and retired the mine-apron check
  with the evidence for why.

---

## 2026-07-02

### Features — Rail & bunker
- **Town↔island-HQ rail link complete** — Finished the hub-and-spoke rail tunnel under Hollybrook: a 5-tall lit corridor (floor Y=51, track Y=52) with `powered_rail` every 8 blocks, a central hub at `(1700, 51, 180)`, a terminus station, and per-building vertical risers back to the shared corridor. Includes a terrain nearest-probe fix and a bunker spur cart route from the town hub into the sub-bunker vestibule. Documented in `docs/RAILWAY.md`.
- **Grand staircase entrances** — Replaced the old 1×1 riser shafts with 5 grand stone-brick staircases (red-carpet landings, lantern-lit, arched beside the track) plus 4 kiosk heads over the surviving ladder shafts (`docs/RAILWAY.md`, Hollybrook cleanup).

### Documentation
- **Bunker ground-truth audit** — `docs/BUNKER.md` / `docs/BUNKER-MAP.md` correct the earlier "furnished shelter" assumption: the outpost at `(1226, 51, 524)` is a half-finished natural cave shaft (drained 2026-07-01, diamond-block plug left in place), not a built bunker with rooms or rails.

---

## 2026-07-01

### Performance
- **Cut 24/7 LLM burn ~88%** — Reduced always-on LLM cost with a daily budget guardrail and a stranded-bot rescue path.

### Bug Fixes
- **Stop night-shelter dragging the fleet to the HQ zone** — Night-shelter behavior no longer pulls the whole fleet off-task; town buildout fixes alongside.

---

## 2026-06-30

### Features
- **Dashboard telemetry** — Emit per-bot stats/armor/combat state and add a town resource-demand view.

### Bug Fixes
- **Per-bot movement leash** — Keep a caretaker bot pinned to its island instead of wandering.
- **Footprint-aware site selection** — Stop buildings stacking on each other; avoid-aware fallback when no flat site qualifies.
- **Town supply-task hygiene** — Dedup supply tasks (stop unbounded blackboard accumulation), locale-aware position bias when claiming, location-aware supply tasks, and stop routing food gathers as "eat".
- **Voyager guards** — Teach ActionAgent to guard find-then-mine lookups; reject empty-name primitive calls at runtime.
- **Web GUI audit pass** — Remove dead code, fix contract bugs and stale copy, add the supply-queue view.

---

## 2026-06-29

### Bug Fixes
- **Recover zombie disconnects** — Detect and recover bots stuck in a half-disconnected state; break the perpetual iron-explore loop.
- **Per-task LLM routing** — Wire up per-task provider/model routing and repair provider/model API mismatches.

---

## 2026-06-18

### Features
- **Runtime-switchable Minecraft server** — Change the target server at runtime via a new Settings "Server" tab.
- **Walkable stair risers + enclosed-building links** — Building risers are now walkable; footprints persist to the town registry. Town rail-network connector now sources from completed build jobs.

---

## 2026-06-17

### Refactor — API + Town decomposition
- **`api.ts` decomposition** — Split the monolithic `createAPIServer` into focused route modules under `src/server/routes/` (bots, build/tunnel, terrain, schematics, supply-chains, metrics/civilization, missions/commands, commander, control platform (markers/zones/routes/squads/roles), campaigns, routines/templates, runtime-config, skill-library, Java-plugin event relay, Town Builder + `requireMayor`), with shared helpers lifted to `routes/helpers.ts`. Removed imports left unused after the split.
- **TownManager repositories** — Decomposed `TownManager` into per-domain repositories (Building, District, Disaster, Chronicle, StyleObservation, Relationship, Approval) with shared row helpers (`rows.ts`). Consolidated ApprovalManager's second DB connection into TownManager.
- **Build-engine extractions** — Extracted `GatherPlanner` and `SchematicStore` from `BuildCoordinator`.

### Bug Fixes
- **Security + crash-safety hardening (Phase 1)** — Hardened the API surface and crash-safety paths.
- **Town DB migrations** — Version-gated migrations via `user_version`; wrap `deleteBuilding`'s two deletes in a transaction; ApprovalManager awaits rehydration before firing handlers.
- **Build/supply stability** — Rewire ChainCoordinator to worker IPC with a double-exec guard; cancel timed-out site-prep instead of digging on; require explicit confirm to carve the hard-coded tunnel; holes-only verify-repair (stop reverting player edits); keep paused builds paused across restart; make `clearSite` respect the mining geofence; idempotent child-town founding.

### Documentation
- Added the staff-engineer repo review + working notes (`REPO_REVIEW.md`, `REPO_REVIEW_NOTES.md`).

---

## 2026-06-01

### Documentation
- **README rewrite** — Rewrote `README.md` to reflect actual implemented features from a code-grounded audit.

---

## 2026-05-28

### Bug Fixes — Stability & memory
- **Unbounded-growth caps** — GC terminal blackboard tasks (and drop deep-clone on read); FIFO-cap `exploredChunks` at 50000; cap reputation events at 5000 with hourly auto-decay; evict terminal build jobs from in-memory maps after a 1h grace; global blackboard GC loop independent of town state; 60s memory-usage diagnostics with per-collection sizes.
- **Town-build resilience** — Per-kind build-failure backoff in TownBrain; persist the brain paused flag; relax SiteSelector flatness and enable clearSite/snapToGround for town builds; raise SiteSelector budgets to fit town-scale schematics; pick the closest connected bot as the probe; cascade-delete `style_observations` on `deleteBuilding`.
- **Voyager** — Tolerate any direction shape in `exploreUntil`; suppress LLM-proposed tasks with strong blockers; seed auto-flat site spiral at the caller origin.

---

## 2026-05-26

### Bug Fixes — Overnight stability
- **Unattended uptime** — Bump `maxReconnectAttempts` 30→1000 for overnight uptime; disable always-on cognition timers to stop the keepalive bounce.
- **Town↔build linkage** — Reconcile building rows on `build:completed` so linkage survives restart; bound the `startBuild` pre-job phase so site-selection can't freeze the tick loop; wire town↔build linkage so auto-builds can't deadlock.

---

## 2026-05-25

### Features
- **Town-build resilience + tunnel tooling** — Town-build resilience improvements, mining geofence, and cleanup + tunnel tooling.

---

## 2026-05-24

### Security
- **Bot impersonation detection** — When someone logs in under a bot's username, Minecraft kicks the real bot with a duplicate-login reason. The bot now recognizes that kick, **quarantines itself** (new `BotState.QUARANTINED`, stops the reconnect tug-of-war), and alerts via the dashboard activity feed + log, optional in-game chat broadcast, and an optional Discord/Slack webhook (`IMPERSONATION_ALERT_WEBHOOK`). A corroborating "ghost name online" signal catches it when another bot sees the impostor. New: `GET /api/security/impersonation`, `POST /api/bots/:name/quarantine/release`, `security.impersonationDetection` config (on by default).

### Features — Project Sid concepts (flag-gated, OFF by default)
Inspired by *Project Sid: Many-agent simulations toward AI civilization* (arXiv:2411.00114). See `docs/project-sid-roadmap.md`. All behavior-changing features are gated and default off; the codebase is a verified no-op with every flag at its default.
- **P1 — Civilization metrics + emergent roles** (read-only, on): infers each bot's role from its action tallies (`GET /api/bots/:name/observed-role`) and reports role-distribution entropy, action exclusivity, and cumulative unique items (`GET /api/metrics/civilization`) with a dashboard card.
- **P2 — Governance that bites** (`governance.enabled`): mayor decrees persist as standing town rules that bias task scoring and are injected into resident prompts; bots propose rules through the existing approval/vote workflow. New: `GET /api/towns/:id/rules`, `POST /api/towns/:id/propose-rule`.
- **P3 — Culture & social spread** (`social.botAffinity`, `social.culture`): bot↔bot affinity edges gate cooperation (declining disliked peers); emergent keyword "memes" adopted from trusted peers bias ambient chat + goals. Added a main-thread `BotComms` relay so inter-bot messages cross worker threads. New: `GET /api/culture`.
- **P4 — PIANO cognition** (`cognition.perceptionTick`, `cognition.cognitiveController`): an independent perception tick + per-bot `AgentState` so threats are perceived mid-task; a `CognitiveController` emits a structured decision broadcast so chat coheres with the current action.

### Maintenance
- **Document systemd deployment** — `CLAUDE.md` now documents the `dyobot` (3001) + `dyobot-web` (3000) services, log paths, and the IPv6 `next-server` lsof caveat, replacing the old foreground-run notes.
- **Tests** — ~110 unit tests added across the security and Project Sid modules (394 total, green).
- Snapshot the learned skill library; add the small-medieval-town-hall schematic.

---

## [Unreleased] — 2026-03-25

### Bug Fixes
- **Fix player task responsiveness** — Player chat tasks now interrupt autonomous tasks instead of queuing behind them. Auto-resumes voyager loop if paused. Removed task decomposition for chat requests (was turning "scout for an island" into "mine logs → craft planks → craft boat").
- **Fix memory leaks in BotInstance** — Reflection interval, pendingConnectTimeout, reconnectTimer now cleared on disconnect. BotComms listener unregistered. Duplicate message listeners on reconnect prevented. Chat cooldown map cleared. Inventory debounce timer cleared. EventEmitter listeners cleaned up.
- **Fix container/furnace never closing on error** — All container and furnace operations now use try-finally to guarantee close() runs even on exceptions.
- **Wire up affinity system** — `onHit()` now fires when players attack bots (affinity penalty). `isHostile()` checked before auto-attacking players. `onGift()` callback added to giveItem action.
- **Fix file write race conditions** — Added 2-second debounced writes with atomic temp-file-then-rename to BlackboardManager, AffinityManager, SocialMemory, StatsTracker, BlockerMemory, and WorldMemory. Added shutdown flush chain from index.ts through all managers.
- **Fix walkTo race condition** — Added `finished` guard to prevent double promise resolution. Added `pathfinder.stop()` on noPath. Proper listener cleanup.
- **Fix attack.ts double resolve** — Added `finished` guard in `finish()` to prevent multiple resolve/reject calls from concurrent code paths.
- **Fix path traversal vulnerability** — Schematic filename validation now rejects `..`, `/`, `\` in GET and POST endpoints.
- **Fix override expiry never checked** — `checkOverrideTimeouts()` now runs on 30-second interval in RoleManager.
- **Fix voyager pause flag desync** — Replaced boolean `voyagerPausedByInstinct` with Set-based `pauseReasons` system. `forceResume()` clears all reasons for player/dashboard overrides.
- **Fix squad mission resolution** — Missions with `assigneeType: 'squad'` now resolve squad IDs to actual bot names. `cancelMission()` also resolves correctly. Empty squads fail immediately instead of creating zombie missions.
- **Fix multi-bot mission progress** — Progress check now waits for ALL assignees to complete instead of completing on first bot finish.
- **Fix inventory listener crash on startup** — Moved `inventory.on('updateSlot')` into spawn handler since mineflayer inventory isn't available until after spawn.
- **Fix bot-to-bot message loop risk** — Tightened keyword detector to require direct request phrases ("please", "can you", etc.) to avoid matching status chatter.
- **Auto-cleanup build bots** — Bots created specifically for a build job are automatically removed when the build completes.

### Features
- **Personality-specific task selection** — Each personality type (farmer, merchant, builder, guard, explorer, blacksmith, elder) now has a weighted task pool. 65% chance to pick personality-appropriate tasks before falling back to generic progression.
- **Emotional state drives behavior** — Bot mood now affects ambient chat frequency: lonely bots chat more (5-10 min), annoyed bots chat less (20-40 min), scared bots are quiet (15-30 min). Idle detection triggers `idle_long` → lonely mood after 10 minutes of no interaction.
- **Bot-to-bot task coordination** — Bots can now process incoming inter-bot messages and queue tasks from direct requests (e.g., "can you mine some iron").
- **Event-driven socket updates** — Position, health, state, and inventory changes now emit immediately via EventEmitter instead of relying solely on 2-second polling. Polling interval reduced to 10-second fallback.
- **Dashboard control platform consolidation** — Unified frontend command/mission state, normalized dashboard API contracts, and live `command:*` / `mission:*` socket updates now drive tactical UI state more consistently.
- **Mission and history UX upgrade** — Mission queue actions now support real retry/cancel/reorder behavior, and history/commander surfaces are tied more closely to shared command and mission records.
- **Fleet, roles, and commander polish** — Fleet actions now use shared commands, role management supports override visibility and policy fields, and commander drafts/history persist locally with richer execution audit views.
- **Map-first control expansion** — Map supports marker/zone/route creation and editing, selected-object actions for missions and commands, squad and mission overlays, and canvas-level selection for more world objects.

### Maintenance
- **Planning docs refreshed** — Updated `dev/dashrevamp/plan/` with current-state health checks, milestone/epic status, and next-sprint guidance.
- **Frontend tests expanded** — Replaced placeholder web tests with shared control store/helper coverage and added more tactical control assertions.

### Performance
- **Trim ActionAgent prompt** — Consolidated duplicate rules sections, ~60% line reduction.
- **Trim Critic prompt** — Reduced examples from 11 to 5 covering distinct evaluation patterns.

---

## 2026-03-24

### Maintenance
- Add `diagnostics/` to .gitignore.

---

## 2026-03-23

### Bug Fixes
- Fix OOM on schematic loading: skip parsing for large files, add volume guard (max 2M voxels, 10MB file size).
- Increase Node heap to 8GB, raise schematic limits, add file size guard.
- Restore missing social memory, bot comms, and players API endpoints.
- Restore build/schematic/chain endpoints lost during dashboard revamp merges.
- Guard marker.position access for markers with missing position data.
- Fix duplicate /fleet nav item and null guard on pendingCommands.targets.
- Fix runtime guards for persisted data with missing fields in metrics.
- Fix Phase 3 integration: resolve merge conflicts and type errors.
- Fix Phase 2 frontend integration: restore build/chain store, fix map/role type refs.
- Fix remaining merge conflict markers across control services.
- Fix CommanderService merge conflicts and duplicate log lines.

### Features — Dashboard Revamp (Phases 1-4)
- **Phase 4**: QA, telemetry, polish, and launch prep. Comprehensive tests, health endpoint, standardized logging, graceful shutdown.
- **Phase 3**: Visual schematic placement with inline mini-map, footprint preview, and click-to-place. Map rendering polish, keyboard shortcut help. Fleet batch operations, empty states, squad management UX.
- **Phase 2**: Commander page with natural language input, plan preview, and execution. Mission queue panel, command history panel, history page. Role badges on bot cards, build/chain connected to missions. Squad overlays, mission indicators, build site overlay on map. Manual override tracking, role-command integration, override UI.
- **Phase 1**: CommandCenter service with dispatch, persistence, and endpoint migration. MissionManager with lifecycle tracking and VoyagerLoop bridge. MarkerStore with CRUD, persistence, and world planning endpoints. SquadManager with CRUD and squad endpoints. RoleManager with CRUD, persistence, and role endpoints. CommanderService with NL parsing and execution. Unit tests for all control platform services.
- Add metrics endpoint.

---

## 2026-03-22

### Features
- **Control platform foundation** — Shared type system, control/mission store slices, SocketProvider upgrade.
- **BlackboardManager** — Shared task blackboard with swarm goals, bot goals, task claiming, resource reservations, and message posting.
- **Swarm directives** — Anthropic Claude support for multi-bot coordination via swarm override system.
- **Supply chain automation** — Multi-stage supply chains with input/output chests, stage sequencing, loop support, and templates.
- **Multi-bot blueprint building** — Schematic loading, Y-layer partitioning across bots, parallel block placement via /setblock commands.
- **Social AI system** — Bot-to-bot communication, social memory with decay, emotional state tracking, periodic reflections.
- **Web dashboard** — Next.js App Router dashboard with bot cards, map, activity feed, chat, stats, skills, relationships, and build pages. Zustand stores, Socket.IO real-time updates.
- **"Create Bots for Task" on Build page** — Auto-spawn builder bots with staggered connections.
- **Vitest test infrastructure** — Backend and frontend test setup.

### Bug Fixes
- Fix build system: balanced Y-layer partitioning, spam protection, bot control.
- Fix Gemini thinking config, auth class selection, and build page errors.
- Fix null-safety crashes in BotInstance.
- Build system hardening and bot management improvements.
- Fix out-of-memory errors (multiple commits).

---

## 2026-03-21

### Features
- **Initial release** — DyoBot AI-powered Minecraft bot with Voyager-style code generation.
- **Mineflayer integration** — Bot lifecycle, connection management, pathfinding, combat.
- **LLM code generation** — Gemini-powered action generation, curriculum agent, critic evaluation, skill library.
- **Personality system** — 6 personality types (merchant, guard, explorer, farmer, blacksmith, elder) with affinity tracking.
- **Instinct system** — Attack, hazard, and drowning instincts with automatic threat response.
- **Primitive actions** — Walk, mine, craft, smelt, attack, place blocks, use containers, patrol, follow, give items.
- **Web dashboard backend** — Express API with Socket.IO for real-time bot monitoring.
- **Conversation system** — Per-player chat history with LLM-driven responses and sentiment analysis.

### Bug Fixes
- Fix chat truncation and improve follow reliability.
- Fix broken conversations and add building capabilities.
- Fix primitives reliability.
