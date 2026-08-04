# HIVE MIND — a shared, durable knowledge corpus for the 5-bot fleet

**Status:** design / audit. **No code changed.**
**Date:** 2026-07-24
**Scope:** the *shared-state* layer — what five bots know collectively, how that knowledge is written without losing it, and how it is read before an LLM call is spent.

## 0. Relationship to the existing research

Three documents already live in `dev/research/`. This one deliberately does **not** re-derive their work:

| Doc | Owns | This doc's relationship |
|---|---|---|
| `call-volume-audit.md` | Call volume, the non-terminating failure loop, retry amplification | Consumes its measurements; does not re-measure |
| `knowledge-brain-design.md` | The **caching** layers L0 (minecraft-data fact store), L1 (semantic cache), L2 (prompt caching) | **Complementary.** That doc explicitly scoped out the shared stores: *"all live state, not lookup caches. Out of scope for call reduction"* (§1.7). This doc owns exactly that excluded layer. |
| `skill-reuse-and-techniques.md` | Skill retrieval ranking defects (D1–D7) | Extends **D6** ("cross-worker index races produce orphans"), which it flagged in 8 lines and deferred. D6 is this document's central subject. |

The one-line division: **`knowledge-brain-design.md` makes each call cheaper or unnecessary; this document makes one bot's learning reach the other four, and stops that learning being silently destroyed on write.** Estimates in §7 overlap with those docs and are marked as such — they do not stack.

---

## 1. Headline audit finding

**The fleet's "shared" stores split cleanly into two groups, and the split is architectural, not incidental.**

Three stores are genuinely shared: they live as **singletons on the main thread**, and workers reach them through **IPC proxies**. Five stores are *not* shared at all: each of the five bot workers constructs its **own instance over the same file path**, holds its own in-memory copy, and periodically overwrites the whole file from that private copy. Last writer wins.

Every store in the second group is exactly the kind of knowledge you would want shared.

The most consequential case: **`skills/` is not a shared skill library.** It is five private in-memory libraries that clobber a common index file. `SkillLibrary.loadIndex()` is called **once**, from the constructor (`src/voyager/SkillLibrary.ts:139`), and nothing re-reads the index thereafter. A skill Scout learns at 13:00 is **invisible to Mason for the rest of Mason's process lifetime** — not delayed, never visible. Meanwhile `saveIndex()` (`:516-533`) rewrites the entire 2.8 MB file from the writer's own stale array, deleting the other four bots' rows.

Measured consequence: **447 of 934 skill files (47.9%) exist on disk but are absent from `skills/index.json`** — unreachable by retrieval, and the codegen calls that produced them are wasted. Orphan file mtimes span `01:49` to `19:35` on 2026-07-24, i.e. loss is **continuous and ongoing**, not a one-off migration artifact.

**And the "shared" group is weaker than it looks.** Of the three main-thread singletons, only the blackboard is genuinely bidirectional. `SharedWorldModel` — the 3.0 MB store of every resource, threat, and explored chunk the fleet has ever observed — is exposed to workers through **five notify-only methods and zero read methods** (§2.1a). Bots write to it constantly and **cannot read it at all**.

So the accurate one-line audit is harsher than "skills are siloed":

> **One bot's learning reaches another bot in exactly one way today — the task blackboard. Skills are silently destroyed on write; world observations are write-only; build history is deleted on a one-hour timer.**

---

## 2. Audit table — what exists today

### 2.1 Shared correctly (main-thread singleton + IPC proxy)

| Store | Owner (main thread) | Worker access | Writers | Content today |
|---|---|---|---|---|
| Blackboard (`data/blackboard.json`, 76 KB) | `src/bot/BotManager.ts:93` | `src/worker/proxies/BlackboardProxy.ts` → `src/worker/WorkerHandle.ts:224-239` (request), `:359-362` (notify) | **1** | Live task board: goals, tasks, claims, reservations, messages. **Genuinely cross-bot** — `claimBestTask` (`BlackboardManager.ts:193`) is the fleet's work-distribution primitive, and `claimReservation` (`:270`) is a working cross-bot mutual-exclusion lock. |
| Shared world model (`data/shared_world.json`, **3.0 MB**) | `src/bot/BotManager.ts:94` | `src/worker/proxies/SharedWorldProxy.ts` → `WorkerHandle.ts:401-405` — **all five handlers are notify-only** | **1** | `resources[]` (cap 500), `threats[]` (5-min TTL), `bots[]` live positions, `exploredChunks` (cap 50 k). **See §2.1a — this store is write-only.** |
| Bot reputation (`data/bot_reputation.json`, 396 KB) | `src/bot/BotManager.ts:99` | — | **1** | Single `events` array. |

This group is the **proof that the correct pattern already exists in this codebase**. The hive store should not invent a new mechanism; it should reuse this one.

### 2.1a The shared world model is write-only

`WorkerHandle.routeRequest` (`:206-245`) has **no `sharedWorld.*` entry at all**. Every `sharedWorld.*` handler lives in `routeNotification` (`:401-405`), and `SharedWorldProxy` exposes **five methods, all `notify`, all `void`** — `reportResource`, `reportThreat`, `updateBotState`, `markChunkExplored`, `updateServerState`. There is no `queryResourcesNear`, no `getExplorationGaps`, no read of any kind.

`SharedWorldModel` implements all of those query methods (`SharedWorldModel.ts:197`, `:209`, `:232`, `:262`, `:270`) — **and no bot can call any of them.** They are reachable only from the main thread.

So the fleet's flagship "shared knowledge" store is a **3.0 MB telemetry sink**: five bots write observations into it continuously, and not one of them can ever read it back. And on the consumption side it is equally dark — no dashboard page consumes `GET /api/world/model` (`web/src/app/map/page.tsx` uses `/api/terrain`, not the world model).

This reframes the headline. It is not merely that skills are siloed while world knowledge is shared. **Nothing that a bot learns about the world is readable by any bot, including itself.** Adding the missing read path is arguably a higher-value change than anything else in this document, and Phase 1 delivers it as a side effect.

### 2.2 Siloed — N writers, last-writer-wins over one file

| Store | Constructed at | Instances | Observed damage |
|---|---|---|---|
| **Skill library** (`skills/index.json`, **2.8 MB**) | `src/voyager/VoyagerLoop.ts:245` (VoyagerLoop lives in `BotInstance`, constructed in the worker at `src/worker/botWorker.ts:128`) | **5** | **447 orphan files (47.9%)**; **24 index rows pointing at files that were deleted** by another worker's eviction; skills invisible cross-bot for the whole process lifetime |
| **Skill attribution** (`data/skill_attribution.json`, 125 KB) | `src/bot/BotInstance.ts:1453` | **5** | 70 reputations + 352 usage records — genuinely cross-bot *content* (`discoveredBy: "Scout"`, per-personality stats) written through a racing path |
| **Social memory** (`data/social_memory.json`, 37 KB) | `src/bot/BotInstance.ts:207` **and** `src/bot/BotManager.ts:90` | **6** | Main thread and all five workers write the same file |
| **Stats** (`data/stats.json`) | `src/bot/BotInstance.ts:172` **and** `src/voyager/VoyagerLoop.ts:289` — two per bot | **10** | `load()` reads the whole 5-bot map once (`StatsTracker.ts:119-126`), `persist()` writes the whole map back (`:128-130`). Each of ten instances continuously rolls the other nine's counters back to its own startup snapshot. |
| **Q&A cache** (`data/qa_cache.json` + `qa_embeddings.json`) | `src/voyager/CurriculumAgent.ts:134` | **5** | 15 entries against a 200 cap after 7 h. `call-volume-audit.md` §5c recorded this file **failing to parse** (`Extra data: line 11 column 4`) — see §3.3, that is a torn write, not corruption from nowhere. |
| **Plan library** (`data/plan_templates.json`) | `src/bot/BotInstance.ts:1453` | **5** | 79 plans; `saveToDisk()` rewrites the whole file (`PlanLibrary.ts:306-308`) |
| **Blocker memory** (`data/blockers.json`) | `src/voyager/CurriculumAgent.ts:136` | **5** | Counts split five ways — a direct cause of the `count>=2` threshold never firing (§2.4) |

A sixth reader exists on the **main thread**: `src/server/routes/skillRoutes.ts:19-25` reads `skills/index.json` directly with its own mtime-keyed cache. `GET /api/skills` therefore serves whichever worker's snapshot happened to win the last write — the dashboard shows a view no bot holds.

### 2.3 Durable structured store — schema exists, corpus does not

`data/town.db` — SQLite via `better-sqlite3@12.10.0` + `drizzle-orm@0.45.2`, opened at `src/town/db.ts:270` with `journal_mode = WAL` (`:274`) and `foreign_keys = ON` (`:275`), versioned migrations keyed on `pragma user_version` (`:243-252`).

**11 tables, all zero rows:**

```
towns  residents  districts  buildings  events  chronicle_entries
bot_journals  disasters  style_observations  approvals  relationships
```

This is the single most important asset in the audit and it is being under-read. The premise "the town layer is already a durable structured store with real content" is **half true**: the *machinery* is production-grade and proven to work in this process (WAL, migrations, Drizzle schema, repositories, REST routes, a dashboard page); the *content* is empty because the world was repointed to a fresh server on 2026-07-24 and no town has been founded since. There is nothing to migrate and nothing to break — which makes this the ideal moment to widen the schema.

### 2.4 Other stores

| Store | Size / rows | Note |
|---|---|---|
| `data/world_memory.json` | 43 records | Per-bot remembered locations, folded into the shared model via `SharedWorldModel.mergeFromBotMemory()` (`SharedWorldModel.ts:316`) |
| `data/blockers.json` | 29 records, **every one `count: 1`** | The failures-not-to-repeat store, and it does not work — `hasStrongBlocker` needs `count >= 2` and fired **0 times in 16.5 h** against 12,943 failures (`call-volume-audit.md` §4) |
| `data/completed_tasks.json` / `failed_tasks.json` | 63 / 31 | Flat string arrays, no provenance, no timestamps |
| `data/plan_templates.json` | 79 plans, 41 KB | `PlanLibrary`; its LLM generator has no callers |
| `data/token-ledger.json` | 10 000-record ring, 2.6 MB | `botName` is `""` on **all 10 000 rows** — no per-bot cost attribution exists |
| `schematics/` | **114 `.schem` files**, ~684 KB | Raw files on disk. **No catalog** — `SchematicInfo` (`SchematicStore.ts:7-17`) is only `{filename, size, blockCount, palette?}`; grep for `tags`/`author` returns zero. Files >50 KB are **estimated, not parsed** (`:117-123`). Semantic meaning is inferred from filenames by a hand-written synonym table (`SchematicMatcher.ts:16-25`). |
| `data/builds.json` | **does not exist on disk** | Build jobs are written whole-file by `BuildCoordinator.persistJobs()` (`:239-248`, path `:210`) — and then **deliberately destroyed**: `scheduleTerminalJobEviction()` (`:2079-2091`) drops every terminal job from memory after 1 h and re-persists without it. See §8.2. |
| `data/campaigns.json` | 1 byte | Same pattern (`BuildCampaign.ts:122`, write `:146`) |
| `schematics/<townId>/` | — | `DesignCache` (`src/town/DesignCache.ts:215`) — a **filesystem-backed, content-hash-keyed, genuinely shared** cache of LLM-designed building plans. `knowledge-brain-design.md` §1.7 already names it the in-repo precedent; it is also the precedent for this document. |
| `docs/mainstreet-america/`, `docs/raven-rock/` | 40 files, 1.5 MB, untracked | Hand-authored YAML build corpora — **the best-structured knowledge in the repo**, and completely disconnected from the bots (§8.1) |

---

## 3. The concurrency bug, in full

The 47.9% orphan rate is the single most important engineering fact in this audit, because **any shared store built without solving it will exhibit the same loss**. There are three distinct defects, not one.

### 3.1 Lost updates: whole-file rewrite from a private snapshot

```
SkillLibrary.saveIndex()          src/voyager/SkillLibrary.ts:516-533
  → atomicWriteJsonSync(indexPath, [...this.index, ...deprecated])
```

`this.index` is populated once at construction (`:139` → `loadIndex()` `:484-514`) and mutated only locally thereafter. There is **no re-read, no merge, no compare-and-swap, no lock** — a repo-wide grep for `flock|lockfile|Mutex|Atomics.wait|SharedArrayBuffer` returns nothing.

So:

```
t0  A loads index (500 rows)          B loads index (500 rows)
t1  A.save(X) → writes 501 rows
t2                                    B.save(Y) → writes 501 rows  ← X gone
t3  X.js remains on disk, unreferenced. Orphan.
```

The write is triggered far more often than "on save". `recordOutcome()` calls `saveIndex()` on **every task outcome** (`:379`), and `save()` calls it again (`:326`). At the observed rate (~834 task evaluations/hour) five workers rewrite a **2.8 MB** file on the order of **2 GB/day**, and every one of those writes is a full clobber from a stale snapshot.

### 3.2 Dangling references: eviction races the index

`maxSkills: 500` (`config.yml:92`) and the index holds exactly **500 active + 18 deprecated = 518**. The library is permanently at cap, so **every** `save()` first calls `evictWorst()` (`:285`, `:341-367`), which does `fs.unlinkSync()` on the victim's file (`:358`).

```
t0  A evicts F, unlinks F.js, writes index without F
t1  B (still holding F in its snapshot) writes index WITH F
t2  index references F.js — which no longer exists
t3  getCode(F) → null (:258)  →  getBestMatch returns null (:452)  →  full codegen
```

**24 index rows currently point at deleted files.** Each is a guaranteed retrieval miss that falls through to a ~4.5 k-token codegen call.

### 3.3 Torn writes: `atomicWriteJsonSync` is not atomic under N writers

```ts
// src/util/atomicWrite.ts:16
const tmpPath = filePath + '.tmp';
fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
fs.renameSync(tmpPath, filePath);
```

The temp filename is a **fixed function of the target path**, with no PID, TID, or random suffix. Two threads writing the same target write to the *same* temp file. `writeFileSync` is not a single syscall for multi-megabyte payloads, so their bytes interleave, and whichever `rename` runs second publishes a mixed-provenance file. The identical pattern is open-coded at `BlackboardManager.ts:588-589`.

`renameSync` protects against *crash-during-write*. It provides **no protection whatsoever against concurrent writers** — the very case the fleet is in. This is the most likely explanation for the previously observed `qa_cache.json` parse failure (`Extra data: line 11 column 4` — the classic signature of a longer file being partially overwritten by a shorter one). There is also no `fsync` on the temp file or the parent directory, so the publish is not durable across a power loss.

**The correct pattern is already in this repository, three directories away.** `src/server/routes/schematicRoutes.ts:82` writes uploads via:

```ts
const tmpPath = `${destPath}.tmp.${process.pid}.${Math.random().toString(36).slice(2, 8)}`;
```

The shared helper simply never adopted it.

**Fixing the temp-name alone is not sufficient** — it converts torn writes into clean lost updates. All three defects need the same structural answer.

### 3.4 The self-inflicted cost

| Signal | Value |
|---|---|
| `.js` files on disk | **934** |
| Index rows (500 active + 18 deprecated) | **518** |
| Orphans (on disk, not in index) | **447 (47.9%)** |
| Index rows pointing at deleted files | **24** |
| Disk files that are `_vN` re-derivations | **392 (42.0%)** |
| Skill families with ≥2 versions | **102** |
| `walk_to_the_nearest_shore` variants on disk | **82** |
| `seek_shelter_urgently_rainy_night` | **44** |
| `mine_1_oak_log` | **36** |
| Index rows with zero recorded successes | **268 of 518 (51.7%)** |

Against that: **10 000 LLM calls in 6.98 h (1 432/h ≈ 34 400/day)**, 18.5 M input tokens, of which codegen is 3 626 calls and **14.3 M input tokens (77% of all input)**. The fleet's total physical output over that window was 40 logs mined, 9 crafting tables, and **59 deaths** (`data/stats.json`).

---

## 4. The hive store

### 4.1 Storage decision: reuse SQLite. Argue it explicitly.

**For:**

1. **Already a proven in-process dependency.** `better-sqlite3` + `drizzle-orm` are direct dependencies, already compiled for this Node, already opened in WAL mode with a working migration runner (`src/town/db.ts:243-275`). Zero new dependencies, zero new operational surface.
2. **It fixes §3 by construction.** A single connection serializes writes; `db.transaction()` gives atomic multi-row commits; row-level `UPDATE`/`INSERT` replaces whole-file rewrite, so **a writer can no longer destroy rows it did not touch** — which is the entire orphan bug.
3. **WAL gives readers for free.** Multiple worker threads can open independent **read-only** connections on the same file and read concurrently while the main thread writes, with no reader/writer blocking and no IPC round-trip in the hot retrieval path.
4. **Write amplification collapses.** Appending one outcome row (~100 bytes) replaces rewriting 2.8 MB. ~2 GB/day → single-digit MB/day.
5. **Embeddings belong in a BLOB.** 518 × 256-dim float32 = 530 KB as `BLOB`, versus 2.6 MB as JSON arrays — and no reparse of every vector on every load.
6. **Queries the JSON files cannot answer.** "Resource nodes within 128 blocks, confidence > 0.5, not visited in 6 h" is one indexed query; today it is a full array scan in five separate processes.
7. **The town schema is empty (§2.3).** Widening it now costs nothing and breaks nothing.

**Against, honestly stated:**

- `better-sqlite3` is **synchronous**. Every query blocks the calling thread's event loop. On the main thread this competes with the Express API and Socket.IO. Mitigation: writes are small and indexed; batch bursts inside one transaction; keep the *hot* read path on the workers' own read-only connections so main-thread work stays write-only.
- It is a **native module**; each worker thread needs its own `Database` handle (handles are not transferable across threads).
- No native vector index. At 500–5 000 skills a brute-force cosine over BLOBs is fine (it is already brute force today, in JS, over JSON); beyond that this needs revisiting.

**Decision: one new database file, `data/hive.db`, not an extension of `town.db`.** Same engine, same helper module, same migration pattern — but a separate file, because the town DB is scoped to a town's lifecycle (`DELETE /api/towns/:id` cascades) while hive knowledge must outlive every town, and because a separate file keeps the town layer's zero-row state independently resettable. Factor the connection/migration boilerplate out of `src/town/db.ts` into a shared helper.

### 4.2 Entities and schema

Provenance discipline is **not optional**, and it does not need inventing — `docs/mainstreet-america/planning/*.yaml` already establishes a project vocabulary that every row should carry:

```
verified | high_confidence_inference | moderate_reconstruction | creative_approximation
```

with the rule those files state: *"never upgraded; when prose and tag disagree, trust the tag."* Bot observations enter as `verified` only when directly observed by a bot within the current `world_epoch`.

Every table carries: `id`, `created_at`, `updated_at`, `observed_by` (bot name), `confidence` (0–1, decaying), `confidence_tier` (above), `world_epoch`.

```sql
-- ── SKILLS ──────────────────────────────────────────────────────────────
CREATE TABLE skill (
  name TEXT PRIMARY KEY,
  family TEXT NOT NULL,            -- normalized base name: 'walk_to_the_nearest_shore'
  description TEXT NOT NULL,
  keywords TEXT NOT NULL,          -- JSON array
  code TEXT NOT NULL,              -- source moves INTO the row; .js files become an export
  code_hash TEXT NOT NULL,         -- sha256, for exact dedupe + critic verdict keying
  embedding BLOB,                  -- 256 x float32
  params TEXT,                     -- JSON schema for parameterized skills (see 4.3)
  discovered_by TEXT NOT NULL,
  status TEXT CHECK (status IN ('active','deprecated','quarantined')) DEFAULT 'active',
  world_epoch INTEGER NOT NULL,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX skill_family_idx ON skill(family, status);
CREATE UNIQUE INDEX skill_code_hash_idx ON skill(code_hash);   -- exact dedupe, free

-- APPEND-ONLY. Counters are derived, never mutated. This is the structural
-- fix for §3.1: two workers appending rows cannot lose each other's writes.
CREATE TABLE skill_outcome (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  skill_name TEXT NOT NULL REFERENCES skill(name) ON DELETE CASCADE,
  bot_name TEXT NOT NULL,
  success INTEGER NOT NULL,
  error_class TEXT,                -- 'no_resource' | 'timeout' | 'syntax' | ...
  duration_ms INTEGER,
  task_fingerprint TEXT,
  world_epoch INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX skill_outcome_skill_idx ON skill_outcome(skill_name, created_at);

CREATE VIEW skill_quality AS
SELECT s.name, s.family, s.description, s.embedding, s.status,
       COUNT(o.id)                              AS trials,
       SUM(o.success)                           AS successes,
       COUNT(o.id) - SUM(o.success)             AS failures,
       (SUM(o.success) + 1.0) / (COUNT(o.id) + 2.0) AS quality,  -- Laplace, as today
       MAX(o.created_at)                        AS last_used,
       COUNT(DISTINCT o.bot_name)               AS bots_used_by   -- NEW: cross-bot signal
FROM skill s LEFT JOIN skill_outcome o ON o.skill_name = s.name
GROUP BY s.name;

-- ── WORLD KNOWLEDGE ─────────────────────────────────────────────────────
CREATE TABLE resource_node (            -- migrates SharedWorldModel.resources
  id TEXT PRIMARY KEY,
  block_name TEXT NOT NULL,
  kind TEXT CHECK (kind IN ('resource','workstation','container','ore_vein')),
  x INTEGER, y INTEGER, z INTEGER,
  chunk_key TEXT NOT NULL,              -- 'cx,cz'
  depleted_at INTEGER,                  -- set when a bot mines it out
  observed_by TEXT NOT NULL, first_seen INTEGER, last_seen INTEGER,
  confidence REAL NOT NULL, confidence_tier TEXT NOT NULL,
  world_epoch INTEGER NOT NULL
);
CREATE INDEX resource_node_lookup ON resource_node(block_name, chunk_key, depleted_at);

CREATE TABLE chunk_survey (             -- migrates exploredChunks, but with content
  chunk_key TEXT PRIMARY KEY,
  biome TEXT, surface_y INTEGER,
  block_histogram TEXT,                 -- JSON {oak_log: 12, stone: 400}
  hostile_density REAL,
  surveyed_by TEXT NOT NULL, surveyed_at INTEGER NOT NULL,
  world_epoch INTEGER NOT NULL
);

-- The gazetteer: named places. Populated by bots AND by the hand-authored
-- YAML corpora (§8.1). This is what makes the corpus readable by a human.
CREATE TABLE place (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,                   -- 'Hollybrook Shore', 'MSA Guest Center'
  kind TEXT,                            -- biome|structure|base|landmark|hazard|route
  x INTEGER, y INTEGER, z INTEGER,
  bounds TEXT,                          -- JSON AABB, nullable
  notes TEXT,
  source TEXT NOT NULL,                 -- 'bot' | 'operator' | 'yaml-import'
  observed_by TEXT, confidence_tier TEXT NOT NULL,
  world_epoch INTEGER NOT NULL, created_at INTEGER NOT NULL
);

-- ── FAILURES NOT TO REPEAT ──────────────────────────────────────────────
-- Replaces data/blockers.json, which never reached its count>=2 threshold
-- because counts were per-bot, split across re-derived error classes, and
-- reset on any success (call-volume-audit.md §4).
CREATE TABLE failure (
  fingerprint TEXT PRIMARY KEY,         -- sha256(normalized_task | error_class | chunk_key?)
  task_normalized TEXT NOT NULL,        -- digits bucketed: 'mine N oak_log'
  error_class TEXT NOT NULL,
  detail TEXT,
  count INTEGER NOT NULL DEFAULT 1,     -- FLEET-WIDE, not per-bot
  distinct_bots INTEGER NOT NULL DEFAULT 1,
  location_scoped INTEGER DEFAULT 0,    -- 'no oak_log nearby' is true HERE, not everywhere
  chunk_key TEXT,
  first_seen INTEGER, last_seen INTEGER,
  expires_at INTEGER,                   -- MANDATORY TTL — see §6.3
  world_epoch INTEGER NOT NULL
);
CREATE INDEX failure_task_idx ON failure(task_normalized, expires_at);

-- ── BUILD CORPUS ────────────────────────────────────────────────────────
CREATE TABLE schematic (                -- catalog over the 118 raw .schem files
  filename TEXT PRIMARY KEY,
  display_name TEXT, file_hash TEXT NOT NULL,
  width INTEGER, height INTEGER, depth INTEGER, block_count INTEGER,
  palette TEXT,                         -- JSON {oak_planks: 240, glass: 32}
  tags TEXT,                            -- JSON ['house','medieval']
  times_built INTEGER DEFAULT 0, avg_build_ms INTEGER, success_rate REAL,
  indexed_at INTEGER NOT NULL
);

CREATE TABLE build_record (             -- what got built, where, by whom, from what
  id TEXT PRIMARY KEY,
  schematic_filename TEXT REFERENCES schematic(filename),
  name TEXT, origin_x INTEGER, origin_y INTEGER, origin_z INTEGER,
  bots TEXT,                            -- JSON array
  started_at INTEGER, completed_at INTEGER,
  status TEXT, blocks_placed INTEGER, blocks_failed INTEGER,
  materials_used TEXT,                  -- JSON
  demolished_at INTEGER,
  world_epoch INTEGER NOT NULL
);

-- ── SHARED EMBED CACHE ──────────────────────────────────────────────────
-- 5 workers currently re-embed the same ~518 skill documents independently,
-- and lose the whole cache on restart (ModelRouter LRU, 256 entries, RAM).
CREATE TABLE embed_cache (
  text_hash TEXT NOT NULL, model_id TEXT NOT NULL,
  vector BLOB NOT NULL, created_at INTEGER NOT NULL, hits INTEGER DEFAULT 0,
  PRIMARY KEY (text_hash, model_id)
);

-- ── EPOCH ───────────────────────────────────────────────────────────────
CREATE TABLE world_epoch (
  epoch INTEGER PRIMARY KEY,
  minecraft_host TEXT, minecraft_version TEXT,
  reason TEXT, started_at INTEGER NOT NULL
);
```

`chronicle_entries`, `bot_journals`, `buildings`, and `events` stay in `town.db` — they are town-scoped by design and their repositories already work.

### 4.3 The parameterization the schema enables

`skill.family` + `skill.params` is not decoration. 82 variants of `walk_to_the_nearest_shore` and 36 of `mine_1_oak_log` are the same skill with different constants. Once `family` is a first-class column, a `UNIQUE(family, status='active')` discipline plus an argument schema collapses 392 duplicate files into ~102 parameterized skills. That is the Voyager premise, and `skill-reuse-and-techniques.md` A6.5 already recommends it — the schema is what makes it enforceable rather than aspirational.

---

## 5. Write path — how five workers stay consistent

### 5.1 Single writer, via the mechanism that already works

**Exactly one `Database` handle is opened read-write, on the main thread.** Workers never write. This mirrors `BlackboardManager` / `SharedWorldModel` precisely, so it is a pattern the codebase already runs in production rather than a new invention.

```
worker thread (×5)                      main thread
──────────────────                      ───────────
HiveProxy.recordOutcome(...)  ──notify──▶ WorkerHandle.handleNotify
   (fire-and-forget)                        → HiveStore.recordOutcome()
                                              → db.transaction(INSERT)

HiveProxy.saveSkill(...)      ──request─▶ WorkerHandle.handleRequest
   (awaits the assigned name)  ◀─response─  → HiveStore.saveSkill() → name
```

New files, all mirroring existing siblings:

| New file | Mirrors | Purpose |
|---|---|---|
| `src/hive/HiveStore.ts` | `src/voyager/BlackboardManager.ts` | Main-thread owner, sole writer |
| `src/hive/schema.ts` | `src/town/schema.ts` | Drizzle table definitions |
| `src/hive/db.ts` | `src/town/db.ts` | Connection + migrations (factor out the shared helper) |
| `src/worker/proxies/HiveProxy.ts` | `src/worker/proxies/BlackboardProxy.ts` | Worker-side write proxy |
| `src/hive/HiveReader.ts` | — | Worker-side **read-only** connection (§6.1) |

Wiring points, matching the existing lines exactly:

- Construct at `src/bot/BotManager.ts:~95`, immediately after `sharedWorldModel` (`:94`).
- Dispatch requests in `src/worker/WorkerHandle.ts:~240`, after the `blackboard.*` block (`:224-239`).
- Dispatch notifications at `src/worker/WorkerHandle.ts:~406`, after the `sharedWorld.*` block (`:401-405`).

### 5.2 Why this is correct where the current design is not

| Defect (§3) | Why it disappears |
|---|---|
| Lost updates (§3.1) | One writer, one in-memory state. There is no second stale snapshot to overwrite from. Row-level `INSERT`/`UPDATE` never touches rows the writer did not name. |
| Dangling refs (§3.2) | Code lives in the `skill` row; `ON DELETE CASCADE` removes outcomes with it. Eviction and index update are the *same* transaction. |
| Torn writes (§3.3) | No JSON file, no shared `.tmp` path. WAL + a single writer is transactionally safe by construction. |

**Append-only wherever a counter would otherwise be mutated** is the second half of the fix, and it matters independently. `skill_outcome` rows are appended, never updated; `skill_quality` derives the counters. Even if a future refactor reintroduces a second writer, appends from concurrent writers cannot destroy one another — the worst case degrades to double-counting, which an idempotency key removes.

### 5.3 Alternatives considered and rejected

| Option | Verdict |
|---|---|
| **Per-bot shards, merged offline** | Rejected. Merge is eventually-consistent; a bot cannot see another's skill until a merge runs, which is the current failure mode with extra machinery. |
| **WAL + 5 read-write connections** | Rejected as the default. Legal with SQLite, but `better-sqlite3` is synchronous, so `SQLITE_BUSY` becomes a blocking stall on a game-loop thread. Also gives up the natural serialization point. |
| **File locks (`flock`/`proper-lockfile`)** | Rejected. New dependency, and it fixes only §3.3 while leaving §3.1 (read-modify-write over a whole file) intact. |
| **Fix `atomicWrite` temp names + merge-on-write** | Rejected as insufficient (§3.3), but the **temp-name fix should ship anyway** as a one-line hardening for the JSON stores that survive. |

### 5.4 Write-path rules

1. **Fire-and-forget (`notify`) for appends** — outcomes, observations, chunk surveys, failures. No round-trip on the hot path.
2. **Request/response only where the caller needs the result** — `saveSkill` (returns the assigned name, closing the ratchet bug fixed at `SkillLibrary.ts:280`), `claimDedupeSlot`.
3. **Batch.** Buffer notifies for ~250 ms and commit as one transaction. A burst of chunk surveys must not be N transactions.
4. **Idempotency key on every notify** (`${botName}:${monotonic}`), deduped by the writer, so an IPC retry cannot double-count.
5. **Bounded queue with backpressure.** If the write queue exceeds a cap, drop `chunk_survey` and `resource_node` re-observations first; never drop `skill_outcome` or `failure`.
6. **Every write stamps the current `world_epoch`.**

---

## 6. Read path — checking the hive before spending a call

### 6.1 Reads bypass IPC

Each worker opens its own read-only handle:

```ts
new Database(hivePath, { readonly: true, fileMustExist: true });
// pragma('query_only = true')
```

WAL permits unlimited concurrent readers alongside the single writer with no blocking. This matters: skill retrieval fires **twice per task step** (`VoyagerLoop.ts:1588-1589`) at ~1 400 calls/h fleet-wide; an IPC round-trip there would add latency to the tightest loop in the system. Reads are stale by at most one WAL checkpoint — irrelevant for a corpus, and strictly fresher than today's "stale since process start."

### 6.2 Hook points

| # | Hook | Location | Hive query | Effect |
|---|---|---|---|---|
| **H1** | Skill retrieval | `src/voyager/VoyagerLoop.ts:1588` (`getBestMatch`) and `:1589` (`getComposableMatches`) | `skill_quality` join + cosine over `embedding` BLOBs, filtered `status='active'` | Retrieval sees **all 5 bots'** skills, including the 447 currently orphaned. Same call signature — `SkillLibrary` becomes a facade over `HiveReader`. |
| **H2** | Skill persist | `src/voyager/VoyagerLoop.ts:1762` (`save`), `:1769` / `:1801` (`recordOutcome`) | `HiveProxy.saveSkill` / `.recordOutcome` | Write goes to the single writer. `code_hash` UNIQUE rejects byte-identical re-derivations at zero cost. |
| **H3** | **Pre-codegen doomed-task gate** | `src/voyager/VoyagerLoop.ts:1610-1630`, before the `codeSource='action-agent'` branch at `:1630` | `SELECT … FROM failure WHERE task_normalized=? AND expires_at>?` | If the fleet has failed this task ≥N times with the same error class, **skip codegen** and queue the prerequisite instead. Targets the 11 119 `No oak_log nearby` traces that regenerating JavaScript cannot fix. |
| **H4** | **Pre-codegen fact injection** | `src/voyager/ActionAgent.ts:315-331` (user-message assembly), before the call at `:333` | `resource_node` nearest-N + `chunk_survey` biome + `place` | Injects *"nearest oak_log: (18,69,-297), seen 4 min ago by Mason"*. **This is the read path that does not exist today** (§2.1a). Complements — does not duplicate — the minecraft-data L0 injection in `knowledge-brain-design.md` §2.1: that one supplies **static game rules**, this one supplies **this world's observed state**. |
| **H5** | Pre-retry gate | `src/voyager/VoyagerLoop.ts:1878` (retry) | same as H3 | Terminates the loop that produced 6 805 retries + 2 804 abandons in 16.5 h. |
| **H6** | Critic verdict reuse | `src/voyager/CriticAgent.ts:250` | keyed on `skill.code_hash` + `task_fingerprint` | Only ever an **exact** code-hash match, never fuzzy — consistent with `knowledge-brain-design.md` §3. |
| **H7** | Curriculum proposal | `src/voyager/CurriculumAgent.ts:412` | `failure` + completed-task set + `skill_quality` | Stops proposing tasks the fleet has proven it cannot do. |
| **H8** | Embed cache | `src/ai/ModelRouter.ts:229-256` (256-entry RAM LRU) | `embed_cache` table | Shared across all 5 workers **and** across restarts. |
| **H9** | Build/schematic selection | `src/build/` job creation | `schematic` + `build_record` | Pick schematics by measured success rate rather than by the filename synonym table at `SchematicMatcher.ts:16-25`. |
| **H10** | Build archival | `src/build/BuildCoordinator.ts:2022-2026` (terminal status), **before** eviction at `:2079` | `INSERT INTO build_record` | Makes build history durable instead of one hour long (§8.2). |

### 6.3 Staleness — the failure mode to design against

**The risk is not abstract.** A cached world fact is a claim about a mutable world. `resource_node` says iron ore at (18,14,-70); another bot mined it out an hour ago; a third bot walks 200 blocks and finds nothing, fails, retries, and burns codegen calls. **That is strictly worse than having no hive at all**, because the bot acted with false confidence.

Six defences, layered:

1. **Trust tiers are load-bearing.** Deterministic rows (recipes, `schematic` dimensions, `code_hash`) never expire. Observations decay. `place` rows imported from operator YAML carry the tier the YAML itself declares (`creative_approximation` for invented coordinates) and must **never** be presented to a bot as `verified`.
2. **Confidence decay, already precedented.** `SharedWorldModel` decays 0.05/hour and prunes below 0.05 (`SharedWorldModel.ts:63-64, 276-303`). Keep that curve; add a **hard TTL** per entity class — `resource_node` 6 h, `chunk_survey` 24 h, `failure` 30 min (location-scoped) / 6 h (global), `threat` 5 min.
3. **`world_epoch` invalidation.** Bumped on `minecraft.host` change, `minecraft.version` change, or operator command. Every read filters `world_epoch = current`. This is precisely the event that stranded `mining.protectedZones`/`leash`/`rescueHome` on 2026-07-24 (per `CLAUDE.md`), and it must never silently strand hive rows the same way.
4. **Negative feedback closes the loop.** When a bot arrives and the block is absent, it **must** write back `depleted_at` (H2's sibling). Today nothing does this — `SharedWorldModel` has no depletion path at all, which is why `shared_world.json` is 3.0 MB of resources with no way to be wrong. **This is the single most important new write in the design.**
5. **Verify before acting on stale-tier data.** Reads return `{value, confidence, ageMs, tier}`, never a bare value. Below a confidence floor the caller treats it as a *hint to check*, not a fact to act on. Skills and prompts must be written to that contract.
6. **Location-scope negative facts.** "No oak_log nearby" is true *here*, not everywhere. A `failure` row without `chunk_key` scoping would teach the whole fleet that oak logs do not exist. The `location_scoped` + `chunk_key` columns exist for exactly this, and getting it wrong is the most dangerous single mistake available in this design.

### 6.4 What must NOT be shared

| Excluded | Why |
|---|---|
| **Live bot position / health / food / inventory** | Changes every tick; belongs in `SharedWorldModel.bots` with its existing 5-min semantics. Writing it to a durable corpus is pure write amplification for data that is wrong on arrival. |
| **In-flight task claims, reservations, current goal** | Already correctly owned by the blackboard. Duplicating creates two sources of truth for mutual exclusion — a deadlock generator. |
| **Per-bot conversation history, affinity, emotional state** | Personality is *per-bot by design*. Merging makes five bots into one character and destroys the social layer's point. |
| **Per-bot pathfinding / navigation caches** | Position-relative, worthless to another bot. |
| **Anything keyed on absolute coordinates without an epoch** | The 2026-07-24 repoint is the cautionary tale. |
| **Cached `codegen` output keyed by prompt similarity** | Explicitly ruled out by `knowledge-brain-design.md` §3 and endorsed here. Code reuse goes through the skill library, validated by **execution outcome**, never by text similarity. `Mine 1 oak log` and `Mine 1 dark_oak_log` are ~0.98 similar and need different code. |
| **Commander NL parses** | One human utterance → one fleet plan. A cached parse executes the wrong plan. |

---

## 7. Estimated call reduction

Baseline from `data/token-ledger.json` (10 000 records, 6.98 h): **1 432 calls/h ≈ 34 400/day**, 18.5 M input tokens, `codegen` = 3 626 calls / **14.3 M input tokens (77% of all input)**.

**These estimates overlap with `knowledge-brain-design.md` §6 and do not stack with it.** What follows is the increment attributable specifically to *sharing and durability*.

| # | Mechanism | Calls/day removed | Basis |
|---|---|---:|---|
| 1 | **Shared embed cache** (H8) | **~5 900** | 2 143 embeds / 6.98 h = 7 370/day. Five workers independently re-embed the same ~518 skill documents at every startup, and the 256-entry RAM LRU dies with the process. Persisted **and shared**, ~80% is removable. Zero correctness risk — embeddings are deterministic per model. *(Same magnitude as `knowledge-brain-design.md` step 4; the shared framing adds the 5× worker multiplier as justification.)* |
| 2 | **Fleet-wide failure gate** (H3, H5) | **~3 000–4 500** | 6 805 retries + 2 804 abandons in 16.5 h ≈ 14 000 retry-driven events/day, each costing a codegen + critic call. `blockers.json` currently holds 29 rows all at `count:1` and `hasStrongBlocker` has fired **zero** times. A fleet-wide, correctly-keyed, TTL'd counter reaching threshold on the 2nd occurrence *across any bot* should suppress 25–35%. **Largest genuinely new win in this document.** |
| 3 | **Cross-bot skill visibility** (H1) | **~2 000–4 000** | Enabler, not a direct saving. Restoring 447 orphans grows the retrieval corpus **86%**, and — more importantly — a skill learned by one bot becomes visible to the other four *immediately* rather than never. This is the precondition for `skill-reuse-and-techniques.md` A6.5 (dedupe + parameterize): today a worker **cannot** dedupe against skills it cannot see. Range reflects that the payoff depends on the retrieval-ranking fixes (D1–D5) landing too. |
| 4 | **World-state injection** (H4) | **~1 500–2 500** | 11 119 `No oak_log nearby` traces in 16.5 h ≈ 16 200/day of executions that fail on absent resources. Injecting *"nearest oak_log at (18,69,-297), 40 blocks NE, seen 4 min ago"* converts a doomed execution into a directed one. Conservative — assumes only ~15% conversion. |
| 5 | **Critic verdict reuse** (H6) | **~1 000–2 000** | 1 860 critic calls / 6.98 h = 6 400/day. Exact `code_hash` + `task_fingerprint` match only. Overlaps `knowledge-brain-design.md`'s L1-critic estimate; the increment here is that the verdict is shared across bots rather than recomputed five times. |
| — | Eliminating 24 dangling index rows | ~50 | Each is a guaranteed retrieval miss → full codegen. Small, but free. |

**Total: ~13 500–19 000 calls/day removed of ~34 400 → a 40–55% reduction**, weighted toward `codegen` (the 4.5 k-token bucket). Row 1 alone is zero-risk and needs no shadow period.

**Confidence.** Row 1 is well grounded (measured counts, deterministic mechanism). Row 2 is the softest and the highest-value — it assumes the fingerprint actually collapses the failure distribution, which the shadow-mode run in Phase 4 exists to verify. Rows 3–5 depend on retrieval-ranking fixes landing in parallel.

**The non-cost argument matters as much.** Right now the fleet destroys ~48% of everything it learns. Even at zero call reduction, ending that is worth doing.

---

## 8. The corpus worth having for its own sake

### 8.1 Ingest what already exists

`docs/mainstreet-america/` and `docs/raven-rock/` (40 files, 1.5 MB, currently untracked) are the **best-structured knowledge in the repository** — YAML building manifests, coordinate registries, material palettes, as-built surveys, defect lists, and SVG elevations, all carrying an explicit provenance vocabulary. They are also **completely invisible to the bots**. A builder bot rediscovers, by LLM, coordinates that are written down in `planning/coordinates.yaml`.

A one-way importer (`yaml → place` + `build_record` + `schematic.tags`) makes the operator's hand-authored design corpus directly queryable by the fleet, tier-labelled exactly as the YAML labels itself. This is the highest ratio of value to effort in the whole document.

### 8.2 What to persist for its own sake

| Artifact | Source | Why it is interesting independent of cost |
|---|---|---|
| **World gazetteer** | `place` + `chunk_survey` | A named, browsable map of everything the fleet has found — biomes, shores, ore fields, hazards, bases. Feeds the existing `/map` dashboard page. |
| **Build history** | `build_record` | Every structure ever built: where, when, by whom, from which schematic, materials consumed, what failed. Currently **actively destroyed** — see below. |
| **Schematic library** | `schematic` | 118 files with **zero metadata** today. Add dimensions, palette, block count, tags, and measured `success_rate` / `avg_build_ms`, and it becomes a browsable, ranked catalog. |
| **Skill provenance** | `skill.discovered_by` + `skill_quality.bots_used_by` | "Scout discovered `walk_to_shore`; it has been used 167 times by 4 bots at a 61% success rate." `data/skill_attribution.json` already contains exactly this — through a racing write path. |
| **Chronicles & journals** | `town.db` (existing) | Machinery works, tables empty. Once a town is founded on the new world, this becomes narrative history. |
| **Expedition log** | `chunk_survey` ordered by time | The fleet's exploration as a timeline — genuinely fun, and near-free once surveys are rows. |
| **Failure museum** | `failure` | "Things the fleet has proven it cannot do", ranked. Operationally useful *and* funny. |

**Build history is currently deleted on a one-hour timer, by design.** `BuildCoordinator.scheduleTerminalJobEviction()` (`src/build/BuildCoordinator.ts:2079-2091`, called at `:1717` and `:2075`) removes every `completed` / `completed_with_errors` / `failed` job from the in-memory map one hour after it finishes, then calls `persistJobs()` (`:2087`) which rewrites `data/builds.json` without it. `data/builds.json` does not currently exist on disk at all.

Consequences worth stating plainly:

- The dashboard's `/build/history` page (`web/src/app/build/history/page.tsx:84`) filters on `status === 'completed'` against that map — so "build history" is **a rolling one-hour window**, not history.
- The only durable record of a finished structure is `town.db`'s `buildings` table, written by `src/town/BuildingRepository.ts:112,142` — and **only** for TownBrain-driven builds. Anything created through `POST /api/builds` leaves no trace once the hour elapses.
- Everything else — crew assignment, `failedBlockCount`, origin, timings, materials — is gone.

A `build_record` row written at terminal status (before eviction) costs ~200 bytes and converts the fleet's construction work from a one-hour window into a permanent archive. **This is the cheapest genuinely-cool win in the document**, and it is independent of every other phase.

### 8.3 Exposure

Read-only REST, following the existing `src/server/routes/` conventions, registered in `src/server/api.ts` beside the ~17 current modules:

```
GET /api/hive/skills            filter by family/quality/discoverer; full outcome history
GET /api/hive/skills/:name      code, embedding neighbours, per-bot outcome timeline
GET /api/hive/gazetteer         places + resource nodes, bbox query
GET /api/hive/chunks            survey grid — biome, histogram, surveyed_by
GET /api/hive/builds            build history
GET /api/hive/schematics        the catalog (extends GET /api/schematics)
GET /api/hive/failures          the failure museum
GET /api/hive/stats             corpus size, growth rate, per-bot contribution
GET /api/hive/timeline          unified event stream across all of the above
```

The dashboard already has the surfaces: `web/app/skills`, `map`, `history`, `town`, `build`, `stats`, `activity`. This needs **one new page** (`/hive`, a corpus browser) plus enrichment of `skills` and `map` from hive data. `Socket.IO` already broadcasts `activity` — add `hive:learned` so new knowledge appears live.

---

## 9. Phased build order

Each phase is independently shippable, independently measurable, and ordered so that **nothing depends on an unproven assumption from a later phase**.

### Phase 0 — Stop the bleeding (hours, no new storage)
1. Give `atomicWrite*` a unique temp suffix (`${filePath}.${process.pid}.${threadId}.${rand}.tmp`) — `src/util/atomicWrite.ts:16,32,47,58,72` and the open-coded copy at `BlackboardManager.ts:588`. Converts torn writes into clean lost updates. **One line, five places.**
2. Snapshot `skills/` and `data/` to a timestamped backup.
3. Inventory the 447 orphans and the 24 dangling rows; do **not** re-import yet.

*Exit:* no further torn-write corruption. Lost updates persist by design until Phase 2.

### Phase 1 — Substrate (1–2 days, no behaviour change)
4. Factor connection/migration boilerplate out of `src/town/db.ts:243-290` into a shared helper.
5. Create `data/hive.db` with the §4.2 schema, WAL, `user_version` migrations.
6. Build `HiveStore` (main thread), `HiveProxy` (worker), `HiveReader` (worker, read-only). Wire at `BotManager.ts:~95`, `WorkerHandle.ts:~240` and `:~406`.
7. **Backfill, no reads yet:** import all 934 `.js` files (including the 447 orphans) with their index metadata; import `shared_world.json` resources → `resource_node`; index all 118 schematics → `schematic`; import `docs/mainstreet-america/` + `docs/raven-rock/` YAML → `place` (§8.1).

*Exit:* `data/hive.db` holds the full corpus. Nothing reads it. `GET /api/hive/stats` returns a count. Fully reversible — delete the file.

### Phase 2 — Cut over the skill library (the correctness fix)
8. Reimplement `SkillLibrary` as a facade over `HiveReader` (reads) + `HiveProxy` (writes), preserving its public signature so `VoyagerLoop.ts:1588-1589`, `:1762`, `:1769`, `:1801` need no changes.
9. Dual-write for 24 h (hive **and** `index.json`), compare, then retire the JSON path.
10. Dedupe: enforce `UNIQUE(code_hash)`; collapse the 102 `_vN` families to their best-quality member (`status='deprecated'` for the rest).

*Exit:* orphan rate **0 by construction**; a skill learned by one bot is visible to all five on the next query. Verify: two bots save concurrently, both rows survive — the test that fails today.

### Phase 3 — Zero-risk savings and the missing read path
11. `embed_cache` behind `ModelRouter.ts:229-256` (H8). Expected ~5 900 calls/day, no correctness risk.
12. Negative feedback: write `depleted_at` when a bot finds an expected resource absent (§6.3 rule 4). **Ship this before any hive fact reaches a prompt.**
13. **H10 — archive builds** at `BuildCoordinator.ts:2022-2026`, before the 1-hour eviction at `:2079`. Independent of everything else; ~30 lines; converts `/build/history` from a rolling window into an archive.
14. Index the 114 schematics into `schematic` (dimensions, palette, hash, tags).

*Exit:* first measurable cost reduction; the staleness feedback loop is closed *before* stale facts can influence behaviour; build history stops being deleted.

### Phase 4 — Failure gate, shadow first (highest value, highest risk)
15. Populate `failure` from every failure path — including the two early exits at `VoyagerLoop.ts:1816` (abandon) and `:1824` (`ErrorRecovery.replaceTask`) that today `return false` without recording, hiding 74% of failures.
16. Run **shadow mode** for 24 h: compute the gate decision, log it, and still make the call. Measure would-have-suppressed count and false-suppression rate.
17. Enforce only if the false-suppression rate is near zero. Start with location-scoped rows.

*Exit:* measured suppression rate before any behaviour changes.

### Phase 5 — World-state injection
18. H4 into `ActionAgent.ts:315-331`, respecting the `{value, confidence, ageMs, tier}` contract. Coordinate with the minecraft-data L0 injection from `knowledge-brain-design.md` §2.1 so both land in the **user** message and neither disturbs the cached system prefix (`AnthropicClient.ts:67-73`).
19. H7 (curriculum, `CurriculumAgent.ts:412`) and H6 (critic, `CriticAgent.ts:250`, exact code-hash only).

### Phase 6 — The corpus surfaces
20. `src/server/routes/hiveRoutes.ts` (§8.3).
21. `web/src/app/hive` corpus browser; enrich `skills` and `map`.
22. `hive:learned` Socket.IO broadcast.
23. Nightly `VACUUM` + TTL sweep + `GET /api/hive/stats` growth metrics.

### Phase 7 — Consolidate the remaining siloed stores
24. Move `skill_attribution`, `stats` (**ten** instances), `plan_templates`, `blockers`, and `social_memory` writes to the same single-writer path — they all have the same bug (§2.2), just less visibly.
25. Fix `botName: ''` in the token ledger so per-bot contribution to the corpus is attributable.

---

## 10. Appendix — file:line index

**Worker/thread boundary**
- `src/worker/botWorker.ts:128` — `new BotInstance(...)` — proves `BotInstance`/`VoyagerLoop` run **in the worker thread**
- `src/worker/IPCChannel.ts:69` (`request`), `:85` (`notify`), `:91` (`command`), `:132-150` (dispatch)
- `src/worker/WorkerHandle.ts:196` (`onRequest`), `:201` (`onNotify`), `:224-239` (`blackboard.*` requests), `:359-362` (`blackboard.*` notifies), `:401-405` (`sharedWorld.*` notifies)

**Correctly shared (main-thread singletons)**
- `src/bot/BotManager.ts:90` `SocialMemory` · `:93` `BlackboardManager` · `:94` `SharedWorldModel` · `:99` `BotReputation`
- `src/worker/proxies/BlackboardProxy.ts`, `SharedWorldProxy.ts`

**Siloed (per-worker constructors — the bug)**
- `src/voyager/VoyagerLoop.ts:245` — `new SkillLibrary(...)` ×5
- `src/bot/BotInstance.ts:1454` — `new SkillAttribution('./data')` ×5
- `src/bot/BotInstance.ts:1453` — `new PlanLibrary('./data')` ×5
- `src/bot/BotInstance.ts:207` — `new SocialMemory(...)` ×5 (+ `BotManager.ts:90` on main = 6 writers)
- `src/bot/BotInstance.ts:172` **and** `src/voyager/VoyagerLoop.ts:289` — `new StatsTracker('./data')` ×**10**
- `src/voyager/VoyagerLoop.ts:275` → `src/voyager/CurriculumAgent.ts:132-137` — `completed_tasks`, `failed_tasks`, `qa_cache`, `qa_embeddings`, `blockers`, `world_memory` paths ×5
- `src/server/routes/skillRoutes.ts:19-25` — main-thread **sixth reader** of `skills/index.json`

**Write-only shared world (§2.1a)**
- `src/worker/proxies/SharedWorldProxy.ts` — five methods, all `notify`, all `void`
- `src/worker/WorkerHandle.ts:401-405` — the only `sharedWorld.*` handlers; **none in `routeRequest` (`:206-245`)**
- `src/voyager/SharedWorldModel.ts:197,209,232,262,270` — query methods that no bot can reach

**Ephemeral build state**
- `src/build/BuildCoordinator.ts:210` (path) · `:239-248` (`persistJobs`, whole-file) · `:2022-2026` (terminal status) · `:2079-2091` (**1-hour eviction + re-persist**) · called at `:1717`, `:2075`
- `src/town/BuildingRepository.ts:112,142` — the only durable build record, TownBrain-driven builds only
- `web/src/app/build/history/page.tsx:84` — "history" fed by the 1-hour map
- `src/build/SchematicStore.ts:7-17` (`SchematicInfo`, no tags/author) · `:117-123` (>50 KB estimated, not parsed) · `src/build/SchematicMatcher.ts:16-25` (filename synonyms)
- `src/town/DesignCache.ts:215` — the working shared-cache precedent

**The race**
- `src/voyager/SkillLibrary.ts:139` — `loadIndex()` called **once**, in the constructor
- `src/voyager/SkillLibrary.ts:484-514` — `loadIndex()`; never re-invoked
- `src/voyager/SkillLibrary.ts:516-533` — `saveIndex()`; whole-file rewrite from private snapshot
- `src/voyager/SkillLibrary.ts:326` (save) · `:379` (recordOutcome) — both call `saveIndex()`
- `src/voyager/SkillLibrary.ts:285, 341-367` — `evictWorst()`; `:358` `fs.unlinkSync` races other workers' indexes
- `src/voyager/SkillLibrary.ts:258` — `getCode` returns null for the 24 dangling rows
- `src/util/atomicWrite.ts:16,32,47,58,72` — **fixed** `.tmp` name; no locking
- `src/voyager/BlackboardManager.ts:588-589` — same pattern, open-coded
- `src/voyager/StatsTracker.ts:119-126` (load whole map once) / `:128-130` (write whole map)

**Read/write hooks**
- `src/voyager/VoyagerLoop.ts:934` `runOneCycle` (the tick) · `:1576` `executeTaskStep`
- `src/voyager/VoyagerLoop.ts:1588` `getBestMatch` · `:1589` `getComposableMatches` · `:1599-1601` the `useDirectSkill` gate (`STRONG_DIRECT_SKILL_SCORE = 24`) · `:1612-1631` three-way `codeSource` branch · `:1629` first codegen · `:1762` `save` · `:1769`/`:1801` `recordOutcome` · `:1816`/`:1824`/`:1847` early exits that record no blocker · `:1883` retry codegen
- `src/voyager/ActionAgent.ts:295-308` retrieval · `:315-331` user message · `:333` codegen call · `:220`/`:314` `MAX_PARSE_RETRIES = 3`
- **Worst case per task = 3 outer retries (`config.yml:73`) × 3 inner parse retries = 9 codegen calls**
- `src/voyager/CriticAgent.ts:250` · `src/voyager/CurriculumAgent.ts:412` (proposal), `:602-620` (QA lookup, threshold **0.92** at `:616`)
- `src/ai/ModelRouter.ts:229-256` embed LRU (256, RAM-only) · `src/worker/proxies/LLMClientProxy.ts:14-19` → `WorkerHandle.ts:214-220` — **every LLM call already crosses IPC to one main-thread router**, which is why a main-thread hive writer adds no new architectural hop

**SQLite precedent**
- `src/town/db.ts:270` `new Database` · `:274` `journal_mode = WAL` · `:275` `foreign_keys = ON` · `:243-252` `user_version` migrations
- `package.json` — `better-sqlite3@^12.10.0`, `drizzle-orm@^0.45.2`

**Measurements taken for this document (2026-07-24)**
- `skills/`: 934 `.js`, 518 index rows (500 active + 18 deprecated), **447 orphans (47.9%)**, 24 dangling, 392 `_vN` duplicates (42.0%), 102 families ≥2, 268/518 zero-success, `index.json` **2.8 MB**
- `data/token-ledger.json`: 10 000 calls / 6.98 h = 1 432/h; codegen 3 626 calls / 14.3 M in-tok (77%); critic 1 860; embed 2 143; curriculum 1 060; chat 1 311; 1 410 failures; `botName` empty on all rows
- `data/town.db`: 11 tables, **0 rows**
- `schematics/`: **114** `.schem` files (112 + 2 in `sam-demo/`), no catalog
- `data/builds.json`: **absent from disk**
- `data/stats.json`: 59 deaths across 5 bots; 40 logs mined
