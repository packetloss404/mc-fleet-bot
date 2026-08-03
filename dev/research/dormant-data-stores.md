# Dormant Data Stores — Audit

**Snapshot:** 2026-07-24 ~20:45 UTC, host `/opt/stacks/mc-fleet-bot`, service `mc-fleet-bot` PID 145932 (booted 20:29:18).
**Method:** every file inspected directly with `python3`/`sqlite3` (read-only), then traced to its owner class and its read/write call sites in `src/`. Several findings verified empirically against the running service (60 s file-mtime sampling, repeated md5/row-count sampling, 150 MB log analysis). No code changed, no data deleted, no service restarted.

> **Caveat:** other sessions were actively editing this repo during the audit (`dist/ai/TokenLedger.js` recompiled at 20:40:47, a `web` build running at 20:43). Line numbers and a few file states are a moving target; the classifications are not.

---

## 0. Root cause first — a `VoyagerLoop` leak corrupts six stores at once

This is the single most important finding, and it reframes most of the table below.

`VoyagerLoop` is recreated on **every mineflayer `spawn` event**, including every respawn-after-death, with **no teardown of the previous one**. `BotInstance.ts:470` calls `startVoyagerIfCodegen()` from the spawn handler, and `BotInstance.ts:1435-1438` has no `if (this.voyagerLoop) stop()` guard — unlike `setMode` at `:2117`, which does. The orphaned loop keeps running: `start()` sets `running = true` and self-schedules, and nothing ever clears it.

Log evidence: **1 422 "Voyager loop started" vs 446 "Voyager loop stopped"**. Since the 20:29 restart: 28 started, 2 stopped → **~26 live VoyagerLoops for 5 bots**, i.e. roughly **5 concurrent instances per bot**.

Each leaked loop carries its own `CurriculumAgent`, `BlockerMemory`, `WorldMemory`, `StatsTracker`, `PlanLibrary`, `SkillAttribution` and `SkillLibrary`, each holding a private in-memory snapshot taken at *its own* construction time, and each doing **whole-file rewrites of the same paths**. `src/util/atomicWrite.ts:19-22` already documents the hazard: *"last writer still wins on whole-file rewrites."* Worse, `WorldMemory.ts:226` and `BlackboardManager.ts:588` don't even use that helper — they have private `writeAtomic()` with a **fixed `.tmp` path**, the exact torn-write case the helper exists to prevent.

**Proven empirically.** Sampling `data/world_memory.json` every 6 s for a minute, the record count oscillates `23 → 23 → 25 → 25 → 29 → 29 → 29 → 27 → 23 → 25` with a different md5 each time. Records vanish and reappear as competing instances rewrite the file from stale views.

Directly corrupted by this: `world_memory.json`, `stats.json`, `blockers.json`, `qa_cache.json`, `completed_tasks.json`/`failed_tasks.json`, `skills/index.json`. A one-line guard collapses ~5 writers per bot back to 1.

---

## 1. Classification summary

`LIVE` = written and read on a reachable path · `WRITE-ONLY` = dead weight · `READ-ONLY` = stale/never refreshed · `EMPTY` = built, never populated · `BROKEN` = structurally cannot work.

| Store | Owner | Size / rows | Class | Why |
|---|---|---|---|---|
| `skills/*.js` + `skills/index.json` | `SkillLibrary` | 936 files / 518 idx entries, 2.8 MB | **BROKEN** | Retrieval is live, but concurrent instances read-modify-write the same 2.8 MB index → 454 orphan files, 29 dangling entries, 7 duplicate entries. Actively losing entries (newest orphan 19:50 today). |
| `data/token-ledger.json` | `TokenLedger` | 2.6 MB / 10 000 | **LIVE (lossy)** | Ring buffer holds only **7.06 h** at 34 k calls/day. `botName` is `""` on **100 % of records** → `byBot` metrics and `/api/bots/:name/llm-trace` are permanently empty. |
| `data/token-spend-daily.json` | `TokenLedger` | 56 B / 1 day | **LIVE (new)** | Added today, first appeared 20:43. Reads `{"2026-07-24":{"anthropic\|codegen":11.75}}` — over the $10 cap, so anthropic is hard-blocked fleet-wide (§3.2). |
| `data/world_memory.json` | `WorldMemory` | 2.5 KB / 23-29 | **LIVE, corrupted** | Genuinely read into 5 prompt sites and drives `findNearest` material decisions. But record count observably oscillates 23↔29 under competing writers on a fixed `.tmp` path. |
| `data/stats.json` | `StatsTracker` | 1.9 KB / 5 bots | **LIVE reads, corrupted writes** | **Two trackers per bot** (`BotInstance.ts:174` + `VoyagerLoop.ts:289`) × ~26 loops ≈ 10+ whole-map writers. `interrupts`/`movementTimeouts` stuck at 0 for all bots despite being handled. Feeds `/api/bots/:name/observed-role` and civilization metrics. |
| `data/bots.json` | `BotManager` | 661 B / 5 | **LIVE** | Correct lifecycle — flushed before worker teardown (`index.ts:373`). The only store in the fleet with fully correct shutdown ordering. |
| `data/commands.json` | `CommandCenter` | 587 B / 1 | **LIVE (barely)** | Only control store with correct retention (cap 500, timer-driven `cleanup()`). Its single row is an auditor's failed probe, not real usage. |
| `data/llm-settings.json` | `LLMSettings` | 1.3 KB | **LIVE** | Source of truth for routing + budget; read at boot and on hot-reload. |
| `data/blackboard.json` — `tasks` | `BlackboardManager` | 94 | **LIVE** | Read by `claimBestTask` (`VoyagerLoop.ts:1192`) with real scoring. GC wired from `index.ts:158` + `ScheduleManager`. But status is `blocked` 59 / `completed` 35 / **`pending` 0** — every row is terminal right now, so `claimBestTask` returns null. |
| `data/blackboard.json` — `messages` | " | 200 (at cap) | **WRITE-ONLY** | Written from 7+ sites; the three derived readers (`getRecentMessages`, `getRecentMessagesForBot`, `getBlockedTaskDescriptions`) have **zero callers**. Only consumer is a raw `getState()` dashboard dump. Whole log rolls over every **~20 min**. |
| `data/blackboard.json` — `goals`/`swarmGoal`/`reservations` | " | empty | **EMPTY** | Goals need a player/API directive never issued. Reservations are correct-by-design (45 s TTL, empty at rest). `hasReservation`/`getSwarmGoal` have zero callers. |
| `data/blockers.json` | `BlockerMemory` | 10 KB / 29 | **BROKEN** | `summarize()` reaches prompts, but every *decision* read is exact-`description` equality against freeform LLM text. **`hasStrongBlocker` fired 0 times in 18.6 h across 1 006 task failures.** `replanTaskStep` only handles `wooden_hoe`/`farmland`/`wheat_seeds`, none of which occur here. File frozen at `updatedAt` 14:04 by stale-instance clobbering. **No cap, no TTL, no prune.** |
| `data/qa_cache.json` + `qa_embeddings.json` | `CurriculumAgent` | 15 entries vs 200 cap | **BROKEN** | Cache structurally cannot hit; each miss costs 2 embeds (§3.3). |
| `data/completed_tasks.json` + `failed_tasks.json` | `CurriculumAgent` | 64 / 31 (caps 100/50) | **LIVE but ineffective** | Hard dedup (`:341`) applies **only to the 22 hardcoded `FALLBACK_TASKS`**. On the LLM path they are prompt text only — no post-hoc rejection of a proposed task matching a completed one. 4 descriptions appear in *both* lists simultaneously, which `updateProgress:174` should make impossible — a lost-update fingerprint. |
| `data/bot_reputation.json` | `BotReputation` | **409 KB / 2 122** | **WRITE-ONLY** | Read only by 2 API routes + one dashboard tab. `shouldTrust`/`getMostReliable`/`getMostCooperative`/`getBotComparison`/`getEventHistory` have **zero callers** and no IPC route — unreachable from a bot. Only **2 of 9** event types are ever emitted (`task_completed` 1 118, `task_failed` 1 006), so `cooperation` is permanently the neutral 50. Cap 5 000 is hit in ~44 h, making the 14-day `decay()` **unreachable**. Sync ~400 KB rewrite on the main thread every 2 s. |
| `data/shared_world.json` | `SharedWorldModel` | 3.9 KB | **WRITE-ONLY** | Pruning now works (3 MB → 3.9 KB), but `SharedWorldProxy` exposes only `notify*`; no `sharedWorld.*` in `routeRequest`. Query methods unreachable from any bot. |
| `data/plan_templates.json` | `PlanLibrary` | 41 KB / 80 | **WRITE-ONLY** | Only `savePlan()` is ever called (`VoyagerLoop.ts:1799`). `findBestPlan`/`getByGoal`/`recordOutcome`/`adaptPlan`/`generatePlanWithLLM` have zero callers. All 80 rows `successCount: 0`. No cap, no prune. |
| `data/skill_attribution.json` | `SkillAttribution` | 132 KB / 70 reps | **BROKEN** | Only `recordUsage()` called; all 6 read methods + `prune()` have zero callers. *And* keyed **camelCase** (`findAndEatFoodUrgently`) vs the skill index's **snake_case** (`walk_to_the_nearest_shore_v23`) — only **3 of 70** overlap, so wiring it up as-is would still miss 96 %. `votes: {}` forever. |
| `data/social_memory.json` | `SocialMemory` | 37 KB / 3 bots | **BROKEN** | 6 concurrent writers, **no debounce** — a 37 KB sync rewrite per memory event, last-writer-wins. Only `scout`(100, at cap)/`steward`(16)/`surveyor`(3) survive; Mason + Architect erased. Dashboard reads the main-thread copy, which never sees a worker write → `/api/bots/:name/memories` is a boot-time snapshot forever. **Not** a casing bug — every path calls `.toLowerCase()`. |
| `data/bot_comms.json` | `BotComms` | 92 B / 4 empty inboxes | **EMPTY** | Correctly proxied, no threading bug. Every `sendMessage` call site is a *reply*; no proactive sender, no spawn broadcast. **The inter-bot bus cannot bootstrap itself.** |
| `data/culture.json` | `CultureManager` | 59 B, all empty | **EMPTY** | `social.culture: true` and the code is sound, but `observeChat` is reachable only from an inter-bot message → blocked by `BotComms`. Adoption additionally needs bot↔bot affinity ≥ 70, also only writable from an inter-bot message. |
| `campaigns.json` / `supply_chains.json` / `markers.json` | `BuildCampaign` / `ChainCoordinator` / `MarkerStore` | `[]` | **EMPTY** | Exist only because their `shutdown()` is wired and writes unconditionally. |
| `zones`/`routes`/`missions`/`squads`/`roles`/`routines`/`templates`/`builds`/`commander-history`.json | control platform | **absent** | **EMPTY** | Feature never exercised. Files are missing (not broken) because these managers' `shutdown()` is never called — §3.4. |
| `data/templates.json` | `TemplateManager` | absent | **BROKEN** | `saveCustom()` persists only non-builtin templates and is reachable only from create/update/delete — but the router exposes **only `GET`**. There is no way to create a custom template, so the file can never be written. |
| `affinities.json`, `conversations.json` | `AffinityManager`, `ConversationManager` | **absent** | **EMPTY** | No player has ever chatted at / hit / gifted a bot. CLAUDE.md documents `affinities.json` as a core data file — that is aspirational. |
| `data/town.db` — 10 of 11 tables | `TownManager` et al. | 143 KB / **0 rows** | **EMPTY** | Nothing blocks founding: there is **no `town:` section in `config.yml` at all**, no enable flag, and `POST /api/towns` is complete and unauthenticated. Verdict: nobody clicked the button. |
| `data/town.db` — `bot_journals` | — | 0 rows | **BROKEN (schema-only)** | `insertBotJournal` exists but has **zero call sites in `src/`**. Dead even if a town existed. `townRoutes.ts:495` admits it: *"Phase 4-B scaffolding only"*. |
| `data/towns/<id>/districts/<id>/style.json` | `DistrictManager` | absent | **WRITE-ONLY** | `loadDistrictStyle:334` has zero callers; design falls back to the town-level doc. |
| `data/towns/<id>/budget.json` | `budgetLedger` | absent | **READ-ONLY (dead)** | Legacy migration shim with no writer in current code — a fresh install can never produce this file, so the shim is permanently unreachable. |
| `data/towns/<id>/*.jsonl` | `fallback.ts` | absent | **BROKEN (latent)** | Dead-letter queue **is** drained — but boot-only (`TownManager.ts:315`), never exercised (0 log hits in 150 MB), untested, and **lossy**: `disasters` replay drops `dedupeKey` (loses Phoenix idempotency), `approvals` replay drops `handlerDescriptorJson` (handler can never rehydrate → silent no-op). `residents`/`districts` writes have neither fallback nor retry. |
| `skills/quarantine/` | *(none)* | 20 files, 2.7 MB | **WRITE-ONLY** | Created by hand (commit `9dd569d`). `SkillLibrary` contains **no reference to "quarantine"**. 2.7 MB of it is one file, `index.json.pre-quarantine.bak`. |

---

## 2. Fleet cost baseline (from `data/token-ledger.json`)

The buffer covers **7.06 h**, so this is a live rate, not a lifetime total.

| Task type | Calls (7 h) | Calls/day |
|---|---|---|
| codegen | 3 874 | 13 167 |
| embed | 1 865 | **6 339** |
| critic | 1 558 | 5 295 |
| chat | 1 549 | 5 265 |
| curriculum | 1 154 | 3 922 |
| **total** | **10 000** | **33 989** |

- **Success rate 71.3 %.** 2 878 calls failed in 7 h → **~9 760 failed calls/day**, all recording 0 tokens (transport/rate-limit, not truncation). codegen alone fails 30 % of the time.
- **Real spend, post-pricing-fix window (2.48 h): $10.19 → ~$98.72/day**, of which **95 % is `claude-opus-4-8`** (475 calls, $9.70).
- `botName` is `""` on all 10 000 records, so every per-bot cost attribution in the product is blank.

---

## 3. The non-LIVE stores: what it takes, and the payoff

### 3.1 `skills/index.json` — the most expensive defect

`saveIndex()` (`SkillLibrary.ts:519`) re-reads the **entire 2.8 MB file**, keeps only `deprecated` rows, and rewrites it — and it is called from `recordOutcome()` (`:382`), i.e. **on every task success or failure**, in every live loop. The merge preserves deprecated rows but **not other instances' new entries**, so concurrent writes silently drop skills.

Measured live over 60 s: **3 writes/min × 2.8 MB ≈ 12.1 GB/day** written, and since it is a read-modify-write, ~24 GB/day of total I/O on one file.

Damage: 454 orphan `.js` files whose index entries were clobbered, spanning 01:49 → **19:50 today** — the race is active. 518 index entries hold only **269 distinct base names**; `walk_to_the_nearest_shore` has **70** index variants (85 files on disk), `mine_1_oak_log` 35. 269 of 518 entries have `successCount: 0`.

**Fix:** apply the §0 leak guard first (that alone removes ~4 of 5 writers per bot), then make the index single-writer via a `SkillLibraryProxy` — the pattern already exists for affinity/culture/blackboard/botComms. Then sweep the 454 orphans offline. **Payoff:** stops active skill loss, removes ~24 GB/day of I/O, and lets dedup work — the 70 near-identical shore-walking skills are 70 codegen calls a working index would have avoided. At 13 167 codegen calls/day, even a 10 % dedup win is ~1 300 calls/day.

### 3.2 Budget cap — working, and currently throttling the whole fleet

`data/token-spend-daily.json` now reads `{"2026-07-24":{"anthropic|codegen":11.75}}` against `budget.dailyUsd: 10, scope: "anthropic"`, so `LLMSettings.isWithinBudget` (`:214`) returns false for every anthropic route.

This is **live right now**: the log shows repeated `Budget cap: skipping paid provider, falling through to cheaper fallback`, and all 327 ledger records since the 20:29 boot are `gemini-2.5-flash`. Routing sends codegen→`claude-opus-4-8` and critic/curriculum/chat→`claude-haiku-4-5`, all with a `gemini` fallback — so the fleet is presently running **entirely on the fallback model**. That is a plausible contributor to the 30 % codegen failure rate and the low skill quality.

Two caveats to verify after a clean restart: (a) the $11.75 figure is inconsistent with the record buffer since boot, suggesting a second process wrote it — the file appeared 3 min after `dist` was recompiled; (b) `scope: "anthropic"` means **gemini is entirely ungoverned**, and 4 961 older records carry the un-priced model string `gemini` (14.2 M input tokens) costed at $0. The model-name bug is fixed in `ModelRouter`, but nothing caps gemini spend.

### 3.3 QA cache — cannot hit, and pays two embeds to find out

`lookupCachedAnswer` (`:602`) tries an exact key, then embeds the question and requires cosine **≥ 0.92**. On a miss, `storeCachedAnswer` (`:623`) embeds it **again**. Exact-key hit is the only free path.

Both key shapes are unbounded by construction:
- `getTaskContext` (`:583`): `How to ${taskDescription} in Minecraft given…` — descriptions routinely carry coordinates (`"Craft a stone pickaxe … at 5, 58, -298."`).
- `generateDynamicQuestions` (`:562`): `Which remembered location from ${worldMemory.summary()} is most actionable right now?` — **the entire coordinate list is in the key.**

**Measured:** across all 105 pairwise cosines of the stored embeddings, **exactly 1 clears the 0.92 threshold** (the two coordinate-templated keys, at 0.9980); median is 0.851. The runner-up at 0.9195 is *semantically wrong* (wooden pickaxe vs furnace) and sits 0.0005 below the cutoff — the threshold is one embedding-model tweak away from serving wrong answers.

**Cost per warm task proposal with full misses: ~6 generate + 8 embed round-trips.** After **11 424 curriculum responses** the cache holds **15 entries against a 200 cap** — the cap is never reached because competing instances rewrite the map from stale snapshots.

**Fix:** normalise the key (strip coordinates and inventory counts, keep the semantic question shape) and single-writer the store — or delete the QA cache outright. **Payoff:** embed is **6 339 calls/day**, the second-largest task type, currently bought at a 1-in-105 hit rate.

### 3.4 Control platform — 8 stores that can never flush

Every control manager (`MarkerStore`, `SquadManager`, `RoleManager`, `RoutineManager`, `MissionManager`, `CommandCenter`, `CommanderService`) is constructed as a **local inside `createAPIServer`** (`api.ts:359-385`) and never returned; `index.ts:111` destructures only 8 other things. So `shutdown()`/`flush()`/`cleanup()` on all of them have **zero call sites**.

Effects: 0.5–2 s of debounced writes dropped on every restart, and `MissionManager.cleanup()` — the only thing that prunes missions — never runs. This also explains *why* those files are absent: the only stores whose `shutdown()` is wired to SIGTERM are `chainCoordinator`, `campaignManager` and `botManager.shutdownPersistence()` — exactly the set that produced empty-but-present files.

**Fix:** return the managers from `createAPIServer` and flush them in the SIGTERM handler. Cheap, mechanical, and a prerequisite for trusting any of these features.

### 3.5 `bot_reputation.json` — 409 KB of write-only, measuring one thing

2 122 events, read only by two dashboard routes and unreachable from any bot. Only `task_completed`/`task_failed` are ever emitted, so `reliability` and `competence` are near-identical by construction and `cooperation` is a constant 50 — the dashboard bar is decorative. The 5 000 cap is reached in ~44 h, so the 14-day `decay()` can never fire. Either wire `shouldTrust()` into behaviour and emit the other 7 event types, or delete the store and its tab.

### 3.6 Town subsystem — empty but cheap

`wireBrains` iterates 0 towns → **0 TownBrain instances, 0 timers, 0 LLM spend** (confirmed: `grep -c "TownBrain"` = 0 across 18 boots). The only unconditional cost is `ChronicleScheduler`, ~72 no-op `SELECT`s/day. Founding a town would activate 10 of 11 tables and 6 satellite JSON stores — but residents do **not** auto-enrol (`townRoutes.ts:520` is the sole `addResident` caller) and `TownBrain.demandLoop` early-returns on zero residents, so founding alone yields an idle brain.

Live consequence today: `/api/bots/:name/observed-role` works but `assignedRole` is hard-null forever (it scans the empty `residents` table), so the endpoint's stated purpose — compare observed vs assigned — is half-dead.

---

## 4. Growth and retention

**Unbounded, no cap, no prune:**
`blockers.json` (grows one row per unique description × blocker-class, against LLM-generated descriptions) · `plan_templates.json` · `MarkerStore` markers/zones/routes (no prune method at all) · `CommanderService.drafts` · `BuildCampaign.campaigns` · `SquadManager` · `RoutineManager` · `/var/log/mc-fleet-bot.log` (**150 MB**, 2.7 M lines, no rotation observed).

**Retention logic that exists but never runs:**
`SkillAttribution.prune()` (zero callers) · `MissionManager.cleanup()` (zero callers) · `BotReputation.decay()` (unreachable behind the 5 000 cap) · `AffinityManager.decayTowardDefault()` (verify caller) · `BuildCoordinator` terminal-job eviction (1 h timer with `unref()`, does not survive restart).

**Caps that work:** `TokenLedger` 10 000 · `WorldMemory` 2 000 + 30 min confidence decay · `SocialMemory` 100/bot · `BotComms` 100/inbox · `CultureManager` 50 memes / 500 keywords · `CommandCenter` 500 · `Blackboard.messages` 200 · `SharedWorldModel` 500 resources / 50 k chunks / 5 min threat TTL · QA cache 200 (never reached).

**Measured write amplification (60 s live sample, extrapolated):**

| File | writes/min | MB/day |
|---|---|---|
| `skills/index.json` | 3.0 | **12 102** |
| `data/token-ledger.json` | 1.0 | **3 732** |
| `data/bot_reputation.json` | 1.0 | 590 |
| `data/blackboard.json` | 3.0 | 336 |
| `data/social_memory.json` | 5.0 | 274 |
| `data/qa_embeddings.json` | 2.0 | 202 |
| *(10 others)* | — | 358 |
| **total** | | **~17.2 GB/day** |

`skills/index.json` + `token-ledger.json` are **90 %** of it. Both are whole-file rewrites of multi-MB JSON on a short debounce; the ledger is additionally pretty-printed (`JSON.stringify(..., null, 2)`), roughly doubling its size for no reader benefit.

Stores with **no debounce at all** — a synchronous whole-file write per event: `SocialMemory.save()`, `BlockerMemory.persist()` (including the no-op `clearTask` after every success), `StatsTracker`, and `ChainCoordinator.save()` (17 call sites, four inside a 5 s poll loop — harmless today only because there are zero chains).

---

## 5. Consistency — three views of one fact

`skills/index.json`, `plan_templates.json` and `skill_attribution.json` all record "how well did this behaviour work", under **three incompatible key spaces**:

| Store | Key | Example | Outcome field |
|---|---|---|---|
| `skills/index.json` | snake_case skill name | `walk_to_the_nearest_shore_v23` | `successCount`/`failureCount`/`quality` |
| `skill_attribution.json` | camelCase function name | `findAndEatFoodUrgently` | `reputations`/`usageHistory` |
| `plan_templates.json` | free-text goal | `Swim to shore — drowning and taking damage` | `successCount` (all 0) |

Overlap is negligible: **3 of 70** attribution names appear in the skill index; **25 of 80** plan goals match a skill description; all 80 plan goals are distinct, so goal-keyed lookup could never hit even if it were called.

`skills/index.json` is the only one of the three with a working read path. **Recommendation: delete `PlanLibrary` and `SkillAttribution`, or fold their fields into the skill index entry.** They are 173 KB of writes and ~250 MB/day of I/O producing data no code consumes. If per-bot/per-personality attribution is genuinely wanted, it belongs as columns on the existing index entry, keyed by the same snake_case name.

A fourth view of the same fact is `bot_reputation.json`, whose only two event types are `task_completed`/`task_failed` — precisely the `successCount`/`failureCount` already on the skill index entry, re-keyed by bot instead of by skill.

Secondary duplication: `stats.json` (capitalised bot names) vs `social_memory.json`/`bot_comms.json` (lowercased). Internally consistent within each store, but no cross-store join is possible without normalisation.

---

## 6. Top 3 fixes by payoff

1. **Stop the `VoyagerLoop` leak** — add a `this.voyagerLoop?.stop()` guard at `BotInstance.ts:1435`. One line. It collapses ~5 concurrent writers per bot back to 1 and is a precondition for `world_memory`, `stats`, `blockers`, `qa_cache`, `completed_tasks` and `skills/index.json` ever being correct. It also stops ~26 loops doing duplicate LLM work for 5 bots, which plausibly accounts for a large share of the 33 989 calls/day.
2. **Single-writer the skill index, then dedup** (§3.1) — stops active skill loss, removes ~24 GB/day of I/O, and makes the 70 duplicate shore-walking skills stop being regenerated. Largest codegen win.
3. **Fix the QA cache key, or delete the cache** (§3.3) — embed is 6 339 calls/day bought at a measured 1-in-105 hit rate, at 2 embeds per miss.

Runners-up, all cheap: normalise task descriptions before `BlockerMemory`/`completedTasks` comparisons (otherwise dedup stays at a 0 % hit rate and `hasStrongBlocker` keeps firing zero times); delete `PlanLibrary` + `SkillAttribution` (§5, pure subtraction, no behaviour risk); return the control managers from `createAPIServer` so 8 stores can flush (§3.4); populate `botName` in `TokenLedger.record()` so per-bot cost attribution stops being blank.
