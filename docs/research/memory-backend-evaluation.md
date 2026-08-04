# Memory Backend Evaluation — mc-fleet-bot

**Status:** research / evaluation. **No code changed.**
**Date:** 2026-07-24
**Scope:** external memory backends (Honcho and alternatives) judged against this fleet's actual workload and this host's actual capacity.

**Companion documents** (read these first — this one assumes them):
- `dev/research/call-volume-audit.md` — where the ~33k calls/day actually go
- `dev/research/knowledge-brain-design.md` — the L0/L1/L2 caching design this evaluation feeds

---

## 0. Verdict up front

**Do not adopt Honcho.** It is a well-built, genuinely state-of-the-art system solving a problem this fleet does not have. Honcho models *people* — how a peer's beliefs, preferences and psychology change over time. This fleet's memory is *world state, recipes, block coordinates, schematics and executable skill code*. On top of the domain mismatch it fails three hard constraints: it needs PostgreSQL + pgvector + Redis + two Python processes on a 2 vCPU box that has no Docker and is already 3× oversubscribed; it is **AGPL-3.0**; and — decisively — **it consumes LLM calls to build its memory**, when the entire goal is to spend fewer of them.

**Adopt instead:** `sqlite-vec` loaded into the `better-sqlite3` connection this repo *already depends on*, behind a single in-repo `MemoryStore` module that consolidates the twelve stores already on disk. Zero new services, zero new daemons, ~1.5 MB of native binary, MIT/Apache-2.0.

**But the headline finding is not about vectors at all.** The audit in Part C found that **five bot worker threads each construct their own `SkillLibrary`, `CurriculumAgent`, `SocialMemory`, `PlanLibrary`, `SkillAttribution` and `StatsTracker` against the same file paths**, each doing full-file read-modify-write through a shared fixed `<file>.tmp` name. This is already destroying data: **447 skill files on disk that no index entry references, 24 index entries pointing at files that no longer exist, and 3 of 5 bots with no social memory at all.** Adding a memory *service* does not fix that. A single SQLite file with WAL and transactions fixes exactly that — and the repo already runs one (`data/town.db`, `better-sqlite3` + `drizzle-orm`, WAL on, 11 tables, currently 0 rows). **The recommendation is therefore "finish the database you already started," not "buy a memory product."**

---

## PART A — Honcho

### A.1 What it is and who makes it

Honcho is "memory infrastructure for building stateful agents that understand changing people, agents, groups, projects, and ideas over time," built by **Plastic Labs** (New York, VC-backed). The repo is `plastic-labs/honcho`; the hosted product is `honcho.dev`. Server version at time of writing is **3.0.9**, with ~6.2k GitHub stars, 752 forks and 594 commits on main — an actively developed, genuinely popular project, not vapourware.

Its thesis is explicitly psychological: it "leverages the inherent reasoning capabilities of LLMs to build coherent models of user psychology over time." Honcho 3 (2026) rebuilt ingestion around "exhaustive *explicit* information capture" plus a **Dialectic Agent** for agentic retrieval.

### A.2 Data model

Four primitives:

| Primitive | Meaning |
|---|---|
| **Workspace** | Top-level tenant/container isolating data between use cases |
| **Peer** | Any participant — human *or* AI agent — as a first-class entity |
| **Session** | A conversation context involving multiple peers, with configurable observation settings |
| **Message** | Atomic unit labelled by source peer, processed asynchronously to update representations |

Derived facts are stored as **vector-embedded documents keyed by (observer, observed) peer pairs** and surfaced through a Conclusions API. So: yes to identity, yes to episodic memory (messages/sessions), yes to derived facts — but every one of those is shaped around *who said what about whom*. There is no first-class notion of a place, an artifact, a recipe, or a piece of executable code. Everything must be flattened into "messages between peers."

### A.3 Storage: raw text or embeddings?

**Both.** Honcho stores raw messages *and* vector embeddings, and does **hybrid search (BM25 + vector)** across session, peer and workspace scopes. That hybrid retrieval design is the right one — and it is worth stealing the *idea* even while rejecting the product.

### A.4 Self-host vs hosted, and what self-hosting actually costs

Self-hosting is supported (Docker Compose template provided) and requires:

- **PostgreSQL with pgvector** — mandatory
- **Redis** — cache layer
- **API keys for Gemini / Anthropic / OpenAI** — mandatory, the reasoning pipeline does not work without an LLM
- **Two cooperating Python processes**: the FastAPI HTTP API server, and a separate **deriver worker** consuming the background queue
- Python 3.10+ and the `uv` package manager for local dev

The background queue runs representation tasks (Deriver), summary generation (Summarizer), **Dreaming** (consolidating conclusions, building reasoning trees, surprisal-based prioritisation), and reconciliation.

Independent review puts setup at **~30 minutes vs ~30 seconds for Mem0**, and names the operational overhead as its headline criticism: "unsuitable for edge-only environments requiring no external services."

**Against this host:** `docker` is **not installed** (`systemctl is-active docker` → `inactive`, no binary at `/usr/bin`, `/usr/local/bin` or `/snap/bin`). There is no PostgreSQL and no Redis listening (`ss -tlnp` shows nothing on 5432/6379/7687). Standing Honcho up means installing a container runtime, then running Postgres + Redis + two Python services alongside the existing Node bot server, the Next.js dashboard and five mineflayer workers — on **2 vCPU / 7.9 GB at load average 3–6**. Letta's comparable stack (Python server + bundled Postgres + pgvector) is documented at ~800 MB baseline and **past 1.5 GB under load**; Honcho adds Redis and a second worker process on top. This is not a marginal call.

### A.5 Licence

**AGPL-3.0** — confirmed from the repo's `LICENSE` header ("GNU AFFERO GENERAL PUBLIC LICENSE Version 3, 19 November 2007"). Note that marketing copy describing Honcho as "permissive" is inaccurate; the licence file is unambiguous. AGPL's network-use clause is the reason to care: mc-fleet-bot serves an HTTP API and a dashboard. Self-hosting Honcho as a separate network service that this repo merely *calls* is the defensible reading, but it is a legal question the operator would be taking on for a component whose fit is already poor. The hosted API sidesteps this entirely.

### A.6 SDK surface

**Yes, there is a first-class TypeScript SDK:** `@honcho-ai/sdk` on npm (Python is `honcho-ai` on PyPI). Both are versioned independently of the server. The API is clean:

```ts
const honcho = new Honcho({ workspaceId, apiKey });
const user = await honcho.peer("user");
const session = await honcho.session(id);
await session.addPeers([user, assistant]);
await session.addMessages(messages);
const answer = await user.chat("What should I know about this user? 3 sentences max");
```

TS support is **not** the blocker here. Everything else is.

### A.7 Pricing

| Item | Price |
|---|---|
| Ingestion | **$2.00 / M tokens** |
| `context()` retrieval | Unlimited, ~200 ms, not separately charged |
| Dreaming (background inference) | Included |
| Reasoning — minimal / low / medium / high / max | $0.001 / $0.01 / $0.05 / $0.10 / $0.50 per query |
| Free credits on signup | **$100** |
| Startups (<$5M raised) | $1,000 credits, 12 months subsidised |

Ingestion is only charged when a message is actually *processed*; messages in sessions with reasoning disabled are free.

**Do the arithmetic against this fleet.** The measured input volume is **~70.7 M input tokens/day** (`call-volume-audit.md` §1). Feeding even a fraction of that through Honcho ingestion at $2/M is catastrophic against a **$10/day budget cap** (`data/llm-settings.json`: `{"dailyUsd": 10, "scope": "anthropic"}`). Ingesting just 5 M tokens/day — 7% of the fleet's traffic — is **$10/day on its own**, consuming the entire budget before a single bot has thought about anything.

### A.8 Maturity and activity (2026)

Strong. SOTA on three independent agent-memory benchmarks: **90.4% LongMem S**, **89.9% LoCoMo**, top BEAM scores, "while using a median 5% of the available context." Trending on GitHub, 6.2k stars (up from ~4.3k in a May 2026 review — real growth), server at 3.0.9, native MCP integration with Claude Code and Cursor. **This is a good product.** Nothing below is a criticism of its quality.

### A.9 Honest fit judgement

The operator asked specifically about Honcho, so this deserves a plain answer rather than a hedge.

**The domain is a mismatch, and it is not a close one.** Honcho's unit of memory is a claim about a *peer* — "the user prefers concise answers," "this agent tends to over-explain." Retrieval is keyed on `(observer, observed)`. Now look at what this fleet actually needs to remember (Part C): the recipe for a wooden pickaxe; that `oak_log` was seen at `(25, 53, -304)`; that `mine_1_oak_log_v33.js` fails 98% of the time; that a schematic's block palette maps to these placements; that "Craft 4 sticks" has been attempted 257 times and passed 0. **None of those are facts about a peer.** Forcing them through the peer model means inventing fake peers ("the world", "the oak forest") and writing pseudo-conversation so the deriver has something to reason over. That is fighting the tool.

There is one genuine sliver of fit — `data/social_memory.json`, `data/affinities.json` and `src/personality/` really are peer-modelling, and that is exactly Honcho's wheelhouse. But that is a *small, low-traffic, non-costly* corner of the system. Per `call-volume-audit.md`, real player chat (`BotInstance.ts:1235`) fired **zero times** in a 16.5-hour window, and ambient chat fired **zero times** in the same window. **Honcho would be adopted to optimise the one subsystem that currently costs nothing.**

**And then the fatal objection.** The stated goal is to *reduce* LLM call volume. Honcho's deriver makes "a single LLM call per batch using structured output" on ingest, the Summarizer makes more (short summary every 20 messages, long every 60), and the Dreamer makes more again in the background. Self-hosted, those calls come out of the operator's own $10/day budget. Hosted, they come out of the $2/M ingestion charge. **Either way, adopting Honcho to cut LLM spend means adding a system whose defining feature is making LLM calls.** It buys *quality* of recall, which is a real thing worth paying for in a product with users — but it is the opposite of the trade being asked for here.

**Verdict: do not adopt.** Revisit only if the fleet pivots to long-lived player relationships as a headline feature *and* moves off this host.

---

## PART B — The alternatives

### B.1 The hard constraints these are judged against

1. **Host: 2 vCPU / 7.9 GB RAM / no GPU, load average ~3–6, already ~3× oversubscribed.** Verified live: `nproc`=2, `free -m` total 7941 MB with 2432 used, `uptime` load 3.02/3.14/3.11 (and reported as high as ~6). Anything wanting a dedicated server process with a >500 MB resident set is **disqualified on these grounds**, stated explicitly per row below.
2. **No container runtime.** `docker` is not installed and the service is inactive. Any "just run the Docker Compose" answer means first installing and maintaining a container runtime on a box with no spare capacity.
3. **Budget: $10/day cap** against ~$75/day of unthrottled demand. A backend that itself makes LLM calls competes directly with the workload for that cap.
4. **Language: TypeScript/Node.** Python-server backends are usable via HTTP, but each one is another daemon on the 2 vCPU box.
5. **Existing deps are an asset:** `better-sqlite3@12.10.0` and `drizzle-orm@0.45.2` are already direct dependencies and already back `data/town.db`. A backend that reuses them costs nearly nothing to adopt.

### B.2 Comparison table

| Backend | Self-host | TS support | Vector search | Structured/relational | Needs a server? | Operational weight | Licence | Makes its own LLM calls? | Fits this host? |
|---|---|---|---|---|---|---|---|---|---|
| **Honcho** | Yes (Docker Compose) | ✅ `@honcho-ai/sdk` | ✅ hybrid BM25+vector | Peer/session graph only | **Postgres+pgvector, Redis, FastAPI API, deriver worker** | **Very high** | **AGPL-3.0** | **Yes — deriver, summarizer, dreamer** | ❌ **No** |
| **Letta / MemGPT** | Yes | ✅ `@letta-ai/letta-client` | ✅ via pgvector | Agent state, memory blocks/tiers | **Postgres + Python server** | High | Apache-2.0 | **Yes — the agent self-manages memory via LLM** | ❌ **No** — ~800 MB baseline, **>1.5 GB under load**, before Node/Next/5 workers |
| **Zep (Cloud)** | ❌ managed only | ✅ | ✅ | Temporal knowledge graph | Cloud SaaS | Low (someone else's problem) | Proprietary | Yes (ingest) | ⚠️ No host cost, but per-ingest LLM cost + external dependency |
| **Graphiti** (Zep OSS) | Yes | ✅ (Python, TS, Go SDKs) | ✅ hybrid semantic+BM25+graph | **Best-in-class temporal graph** | **Neo4j ≥5.26, FalkorDB, or Kuzu** | **Very high** | Apache-2.0 | **Yes — entity extraction per episode** | ❌ **No** — a JVM graph database on 2 vCPU is not viable. (Kuzu is embedded and would be the only survivable variant, at reduced feature parity.) Note **Zep Community Edition is discontinued**; OSS effort moved to Graphiti |
| **Mem0** (OSS) | Yes | ✅ `mem0ai` npm | ✅ | Thin — facts in a vector store | Postgres + Qdrant (or similar) | Medium | Apache-2.0 | **Yes — one LLM call per `add()`** | ⚠️ Lightest of the managed-memory family, but still 2 services + a per-write LLM call charged to the $10 cap |
| **mem-agent / markdown-first** | Yes (it's just files) | ✅ (fs) | Only if you add an index | Whatever you write | No | **Very low** | n/a | No | ⚠️ Human-readable and git-diffable — genuinely attractive for the *corpus* goal — but "flat markdown alone doesn't scale for retrieval"; needs SQLite+BM25+vectors bolted on, which is B.3 |
| **pgvector** | Yes | ✅ (`pg`) | ✅ mature | ✅ full SQL | **PostgreSQL server** | Medium | PostgreSQL licence | No | ⚠️ Technically survivable but means installing and tuning a Postgres for one app when SQLite is already here |
| **sqlite-vec** | Yes (embedded) | ✅ `npm i sqlite-vec`, `load(db)` on **better-sqlite3** | ✅ exact search, SIMD kernels, 2/3/4-bit TurboQuant scans | ✅ **full SQL, same file, same transaction** | **No** | **Lowest** | MIT / Apache-2.0 | No | ✅ **Yes — recommended** |
| **LanceDB** | Yes (embedded) | ✅ `@lancedb/lancedb` | ✅ IVF_PQ, disk-based | Columnar, limited relational | No | Low | Apache-2.0 | No | ✅ Viable. Low memory footprint, handles larger-than-RAM. But it is a *second* storage engine beside SQLite and adds a heavier native dep |
| **Chroma** | Python only for embedded | ⚠️ **JS client requires a running server** — there is no JS `PersistentClient` | ✅ | Thin | **Yes, for Node** | Medium-high | Apache-2.0 | No | ❌ **No** — the embedded mode Node needs doesn't exist, and a 2026 benchmark measured **4.7 GB RAM** ingesting a TS monorepo. On a 7.9 GB box with 2.4 GB already used, that alone is disqualifying |
| **Qdrant** | Yes | ✅ JS client | ✅ excellent, quantization 4–32× | Payload filtering | **Yes — Rust server** | Medium | Apache-2.0 | No | ❌ **No** — good software, but it is another always-on daemon competing for 2 vCPU, to serve ~500–20k vectors that fit in a few MB |
| **Files + embeddings (status quo)** | — | ✅ | ⚠️ brute-force cosine over JSON | ⚠️ ad-hoc, per-store | No | Low but **fragmenting** | n/a | No | ⚠️ Already here; see Part C for why it is failing |

### B.3 The scale sanity check nobody applies before buying a vector database

This fleet's entire vector corpus today is **518 skill embeddings at 256 dimensions** plus **~11 Q&A embeddings at 256 dimensions**. At 4 bytes per float that is **518 × 256 × 4 ≈ 530 KB**. Even growing the corpus 40× — every distinct task, every world fact, every recipe, every chronicle entry — lands around **20 MB of vectors**.

Twenty megabytes. A brute-force SIMD scan over that is sub-millisecond. **Every clustered/quantised index in this comparison (Qdrant, LanceDB IVF_PQ, pgvector HNSW) is engineered for a problem three to four orders of magnitude larger than this one.** Adopting any of them here is buying a container ship to cross a canal. `sqlite-vec`'s exact search is not a compromise at this scale — it is strictly the correct algorithm, and it removes the index-freshness bugs approximate indexes bring.

The real problem is not vector search speed. It is that the memory is **scattered across ten-plus JSON files with no shared schema, no transactions, no query language and no eviction policy** (Part C). That is a data-modelling problem, and no vector database fixes it.

---

## PART C — What this repo already has

Audited live on 2026-07-24 against the running fleet's data directory. **This is the part that changes the recommendation.** The fleet does not lack a memory backend; it has *twelve* of them, none of which share a schema, a transaction, a query language, or an eviction policy.

### C.0 The architectural fact that dominates everything below

`src/worker/WorkerHandle.ts:174` spawns **one `worker_threads` Worker per bot** — five of them (`data/bots.json`: Scout, Architect, Mason, Surveyor, Steward). Some stores live on the main thread and are reached over IPC proxies (`src/worker/proxies/`). But **six stores are constructed independently inside each worker, all pointing at the same absolute path**:

| Store | Constructed at | Instances |
|---|---|---|
| `SkillLibrary` (`skills/index.json`) | `voyager/VoyagerLoop.ts:245` | **5** |
| `CurriculumAgent` (`world_memory`, `qa_cache`, `qa_embeddings`, `blockers`, `completed_tasks`, `failed_tasks`) | per worker with `'./data'` | **5** |
| `SocialMemory` | `bot/BotManager.ts:90` **and** `bot/BotInstance.ts:207` | **6** (1 main + 5 workers) |
| `PlanLibrary` | `bot/BotInstance.ts:1453` | **5** |
| `SkillAttribution` | `bot/BotInstance.ts:1454` | **5** |
| `StatsTracker` | `voyager/StatsTracker.ts:25` | **5** |

Every one of these does a **full-file read-modify-write** on update, from its own stale in-memory copy. Worse: `src/util/atomicWrite.ts` writes through a **fixed `<file>.tmp` name**, so N concurrent writers do not merely lose the race — their temp files interleave.

**This is not theoretical. The damage is measurable on disk right now:** `skills/` holds **934 `.js` files**, of which **447 are referenced by no index entry**, while **24 index entries point at files that no longer exist**. That drift is the fingerprint of five workers each rewriting a 2.8 MB `index.json` from a stale copy. It also explains why only 2 of 5 bots have any entries in `social_memory.json` — the last writer wins and wipes the rest.

**No external memory service fixes this, and no vector database fixes this. A single database file with WAL and transactions fixes exactly this**, and it is the strongest argument in the entire document — stronger than anything about vector search.

### C.1 Store-by-store

| Store | Size | Records | Capped? | Owner (`src/`) | Actually used? |
|---|---|---|---|---|---|
| `data/world_memory.json` | 6.7 KB | **48** `{kind,name,x,y,z,updatedAt,confidence}` | ✅ 2000 + 30-min confidence decay | `voyager/WorldMemory.ts` | ✅ **Yes — the healthiest store here.** Written by `CurriculumAgent.ts:244`; read via `findNearest()` at `TaskPlanner.ts:74`, `Blueprint.ts:199`, `VoyagerLoop.ts:816,1348,1560-1562,1591,1728`. Backed by `SpatialIndex.ts`, a 16×16 chunk-bucketed grid — **the only genuine index in the repo** |
| `data/shared_world.json` | **3.0 MB** | `resources` **0**, **`threats` 11,108 (100% already expired)**, `bots` 5, `exploredChunks` 208 | ❌ **No cap on threats** | `voyager/SharedWorldModel.ts:110`, main thread via `bot/BotManager.ts:94` | ❌ **Write-only dead code** — see C.2 #1 |
| `data/blackboard.json` | 76 KB | 86 tasks, 200 messages, 0 goals, 0 reservations | ✅ GC + 200-msg cap, run from `index.ts:158-159` | `BlackboardManager` (main thread, `BotManager.ts:93`) | ✅ **Very live** — the central task queue / claim mechanism. Healthy |
| `data/qa_cache.json` + `qa_embeddings.json` | 4.9 KB + 70 KB | **15 entries each**, 256-dim | ✅ 200 | `voyager/CurriculumAgent.ts:134-135`, lookup `:601-621`, store `:622-640` | ⚠️ **Live but inert** — 15 of 200 after hours of running. See C.2 #3 |
| `data/social_memory.json` | 37 KB | 116 across only **2 of 5 bots** | ✅ 100/bot | `social/SocialMemory.ts:36` | ✅ Yes (chat context + mood) — but **6 racing writers** |
| `data/blockers.json` | 10 KB | **29** vs **12,943 failures** | ⚠️ deduped only | `voyager/BlockerMemory.ts` | ⚠️ Read (gates task proposal) but structurally broken — see C.2 #4 |
| `skills/` + `skills/index.json` | 9.2 MB / **2.8 MB index** | 934 `.js`, **518** indexed (18 deprecated) — all with 256-dim embeddings | ✅ 500 (`evictWorst`) | `voyager/SkillLibrary.ts` | ✅ **Yes — the most valuable store here.** Also **447 orphan files / 24 dangling entries** |
| `data/town.db` | 143 KB | **11 tables, 0 rows**, 8 indexes, `user_version=3`, WAL on | — | `town/db.ts` + 7 repositories, **better-sqlite3 + drizzle-orm** | ⚠️ Schema live and correct; no town founded, so the whole subsystem is inert |
| `data/plan_templates.json` | 41 KB | **79**, every one `successCount:0, failureCount:0` | ❌ **No cap** | `voyager/PlanLibrary.ts:68` | ❌ **Write-only. Never read.** See C.2 #2 |
| `data/bot_reputation.json` | 396 KB | 2,053 events | ✅ 5000 + hourly decay | `voyager/BotReputation.ts:66` (main thread) | ⚠️ Live but **dashboard-only** — no agent decision consumes reputation |
| `data/skill_attribution.json` | 125 KB | 70 reputations, 0 votes, 353 usage records | ❌ **`prune()` never called** | `voyager/SkillAttribution.ts:55` | ❌ **Write-only.** `getReputation`/`shouldUseSkill` have no callers |
| `data/token-ledger.json` | **2.5 MB** | **10,000 = at cap**, spanning only ~7 h | ✅ 10,000 | `ai/TokenLedger.ts:6` | ✅ Live and load-bearing (budget cap) — but see C.2 #8 |

Embeddings throughout are **256-dimensional**, produced by **`gemini-embedding-001` at `outputDimensionality: 256`, `taskType: RETRIEVAL_DOCUMENT`** (`src/ai/GeminiClient.ts:118-147`), routed via `data/llm-settings.json` → `routes.embed = {provider: gemini, fallback: [anthropic]}`. Note the declared fallback is a **no-op** — `AnthropicClient` has no `embed()` — so `ModelRouter` falls through to scanning for any client with `embed`, i.e. OpenAI (`text-embedding-3-small`, **1536 dims**) or Voyage AI.

**There are no vector or embedding npm dependencies at all** — no `faiss-node`, `hnswlib-node`, `sqlite-vec`, `@lancedb/*`, `chromadb`, `vectra`, `usearch`, no `langchain`, and not even the official `openai` / `@anthropic-ai/sdk` / `@google/generative-ai` clients. Every LLM and embedding provider in `src/ai/` is a hand-rolled `fetch` client.

### C.2 Overlaps, contradictions and outright bugs

**1. The "shared world model" is write-only, and 3 MB of it is expired garbage.**
`SharedWorldModel` was designed to be the fleet's shared world knowledge. In practice: `reportThreat`, `updateBotState` and `markChunkExplored` fire constantly, but **nothing in any agent path ever calls** `queryThreatsNear`, `queryResourcesNear`, `isAreaSafe`, `getIdleBots`, `getExplorationGaps`, `getResourceSupply`, or `mergeFromBotMemory`. Its only consumer is `server/routes/botsRoutes.ts:288`, feeding a dashboard panel.

Consequences, all verified on disk:
- `resources` is **0**, because `reportResource` is only reachable via the IPC proxy and no caller invokes it — and `mergeFromBotMemory()`, which exists precisely to copy `WorldMemory`'s records across, is never called.
- `threats` is **11,108 entries and 100% of them are already expired**. `pruneExpired()` (`SharedWorldModel.ts:276`) **has no callers anywhere in `src/`**. Threats carry a 5-minute TTL and are filtered at `getSnapshot()` time, but nothing ever removes them from the persisted array. `MAX_RESOURCES=500` and `MAX_EXPLORED_CHUNKS=50_000` caps exist; **threats have no cap at all.**
- The memory diagnostic at `index.ts:249-252` reports `sharedResources` and `exploredChunks` but **not** `threats` — which is why a 3 MB leak went unnoticed.

Meanwhile the store that *does* work — `world_memory.json`, 48 records, spatially indexed, decayed, capped — has its contents flattened to a **string** and pasted into prompts at four call sites (`CurriculumAgent.ts:406,529,558,591`) instead of being queried. **The fleet's best memory is used as prompt filler; its biggest memory is a dead log.**

**2. Three stores track the same success/failure counters, in three key spaces, and two are never read.**
- `skills/index.json` — `successCount`/`failureCount`/`quality` per versioned skill name (`mine_1_oak_log_v33`). **Read.**
- `data/skill_attribution.json` — `reputations`/`votes`/`usageHistory` keyed on `generated.functionName`. Written from `VoyagerLoop.ts:1788,1918`. `getReputation`, `getAllReputations`, `shouldUseSkill` and `prune()` have **zero callers**. **Never read, never pruned.**
- `data/plan_templates.json` — `successCount`/`failureCount`/`avgCompletionMs` per goal. `VoyagerLoop.ts:1789` calls `savePlan(...)` with a **degenerate one-step plan** (the task description as its own single step, all metrics zero). `findBestPlan`, `getByGoal`, `getAll`, `recordOutcome`, `adaptPlan` and `generatePlanWithLLM` have **zero callers**. **Never read.** Every one of the 79 records on disk therefore reads `successCount: 0, failureCount: 0`.

Because the key spaces differ, the three can and do disagree, and there is no reconciliation anywhere. Two of the three are pure write amplification on the hot path.

**3. The Q&A cache is defeated by its own key.**
Keys embed volatile world state. One live key, verbatim:
`Which remembered location from resource:coal_ore@25,53,-304 | resource:iron_ore@18,66,-305 | resource:oak_log@18,69,-297 | ... is most actionable right now?`
Coordinates in the cache key. **That key cannot be hit twice, ever.** Hence 15 entries against a 200 cap. Lookup is exact-string first, then a brute-force cosine loop over every stored embedding at a hardcoded **0.92** threshold (`CurriculumAgent.ts:609-617`). This is not a storage-engine problem — Honcho, Mem0 or Qdrant would store the same unhittable keys just as faithfully.

**4. `blockers.json` counts never reach the threshold that would use them.**
29 records against **12,943 recorded task failures**, because records are keyed on `(task, blocker-class)` where the class is re-derived from error text each time, splitting counts across rows. `hasStrongBlocker` needs `count >= 2` and fired **0 times** in 16.5 hours (`call-volume-audit.md` §4). A data-modelling bug, not a backend bug.

**5. Every similarity search in the repo is a brute-force linear scan, and the code says so.**

| Location | Loop | Corpus |
|---|---|---|
| `SkillLibrary.ts:216-217` → `cosineSimilarityDense:624` | scan over prefiltered candidates, up to all 518 | 256-d dense |
| `SkillLibrary.ts:214` → `cosineSimilarity:607` | sparse TF-IDF over the same set (has an LRU vector cache) | sparse |
| `CurriculumAgent.ts:609-616` | `for (const [key, embedding] of Object.entries(...))` over all entries | 256-d dense |
| `PlanLibrary.ts:97-134` | **rebuilds both TF-IDF vectors from scratch, per template, per call** — 79 templates, no cache | sparse |

`SkillLibrary.searchWithScores` combines *two* cosines per candidate (sparse ×20, dense ×25) plus lexical scores and a quality term, behind a keyword pre-filter added specifically because, per the in-code comment: *"When the library grew past ~600 skills the per-call cosine-similarity loop became a serialized hot path."* **That comment is the business case for `sqlite-vec`, written by the codebase itself** — and it is running on an event loop shared with five mineflayer bots on 2 vCPUs.

**6. A silent, total cache-invalidation hazard.** `cosineSimilarity` returns **0** when vector lengths differ. The declared embed fallback (`anthropic`) has no `embed()`, so `ModelRouter` falls through to any client that does — OpenAI at **1536 dims** against a corpus stored at **256**. If that ever happens, both the Q&A cache and the entire skill index **silently stop matching**, with no error and no metric. Nothing detects this.

**7. Unbounded growth with no eviction.** `shared_world.json` 3 MB (no threat cap, `pruneExpired` dead), `skill_attribution.json` 125 KB (`prune()` dead), `plan_templates.json` 41 KB (no cap), `blockers.json` (deduped only). Each update is a full read-parse-serialise-write. `skills/index.json` is additionally **git-tracked**, so every recorded skill outcome dirties a 2.8 MB blob in the working tree.

**8. Two `TokenLedger` instances write the same file.** `src/index.ts:19` (inside `buildModelRouter`, used as the fallback path at `:82`) and `:72` (for `LLMSettings`) each construct one against the same path with independent in-memory arrays; only one gets `shutdown()` (`:337`). Separately, the 10,000-record cap now spans only **~7 hours**, so `getSpendTodayUsd` — which enforces the **$10/day cap** — silently under-counts a busy day.

**9. `town.db` proves the recommended path already works here.** Eleven tables, drizzle schema, seven repositories, eight indexes, `user_version = 3` migrations, `journal_mode = WAL`, `foreign_keys = ON`. A complete, working, transactional SQLite subsystem in this codebase today, empty only because no town has been founded. **The migration target is not hypothetical — it is already running, it already handles concurrency correctly, and it is the only store in the repo holding nothing.**

**10. Incidental, outside scope but worth flagging:** `data/llm-settings.json` contains **plaintext Google and Anthropic API keys**. Mode is `0600` and `data/` is gitignored, but they are live in the working tree.

### C.3 What Part C means for the recommendation

The fleet's memory problems, ranked:

1. **Six stores with 5–6 concurrent full-file writers and a shared fixed `.tmp` name** — already causing measurable data loss (C.0)
2. Cache keys that embed volatile state and therefore never hit (C.2 #3)
3. Stores written but never read — two of the three counter stores (C.2 #2)
4. Stores that grew into logs instead of knowledge, with their own prune functions dead (C.2 #1, #7)
5. Retrieval as a brute-force loop on the shared event loop (C.2 #5)
6. Counters keyed so they never reach their own thresholds (C.2 #4)
7. A silent dimension-mismatch failure mode with no detection (C.2 #6)

**Only item 5 is a vector-search problem.** Item 1 is a *concurrency* problem, and items 2, 3, 4, 6 and 7 are schema and call-site problems — all of which follow you into *any* backend. An external memory service adopted today would inherit six of the seven and add a daemon.

**So the ranking of what to buy is inverted from the way the question is usually asked.** What this fleet needs, in order, is: (1) **transactions and a single writer** — which SQLite gives for free and JSON files cannot give at all; (2) **one schema with real keys and real eviction**; and only then (3) vector search. `sqlite-vec` is the recommendation because it delivers (1) and (2) as its *primary* value and (3) as a bonus, which is the correct order of importance here.

---

## PART D — Recommendation

### D.1 Adopt: `sqlite-vec` on the existing `better-sqlite3`, behind one `MemoryStore` module

```bash
npm install sqlite-vec        # ~1.5 MB native, MIT / Apache-2.0
```

```ts
import Database from 'better-sqlite3';   // already a dependency
import * as sqliteVec from 'sqlite-vec';
const db = new Database('data/memory.db');
sqliteVec.load(db);
```

**Why this and not the others:**

- **It fixes the concurrency bug, which is the actual top problem (C.0).** Five worker threads currently do full-file read-modify-write on six shared JSON files through a shared fixed `.tmp` name, and it is already costing data — 447 orphaned skill files, 24 dangling index entries, 3 of 5 bots with no social memory. SQLite in WAL mode with `better-sqlite3` gives serialised writes and real transactions across threads against one file. **No other option in this comparison fixes this without also adding a daemon.**
- **Zero new processes.** No Postgres, no Redis, no Neo4j, no Rust daemon, no Python worker, no container runtime to install. On a 2 vCPU box at load 3–6 this is the whole argument.
- **Reuses dependencies already in `package.json`.** `better-sqlite3@12.10.0` and `drizzle-orm@0.45.2` are direct deps and already back `data/town.db` with WAL, `foreign_keys=ON`, `user_version` migrations, eight indexes and seven repositories. The team has already solved this problem once in this repo — `src/town/db.ts` is the template.
- **Right-sized.** ~530 KB of vectors today, ~20 MB at 40× growth (B.3). Exact SIMD search over that is sub-millisecond and has no index-freshness failure mode.
- **Vectors and relations in one transaction.** `WHERE quality > 0.5 AND base_name = ? ORDER BY vec_distance_cosine(...)` in a single statement — which is exactly the query `SkillLibrary` currently approximates with a keyword pre-filter plus two hand-rolled cosine loops.
- **It makes zero LLM calls**, so it competes with nothing for the $10/day cap.
- **MIT / Apache-2.0.** No AGPL question.

### D.2 Migration sketch

Ordered so each step ships independently and nothing is deleted before its replacement is proven.

**Step 0 — schema.** New `src/memory/schema.ts` + `src/memory/MemoryStore.ts` against a new `data/memory.db`. Do **not** touch `town.db`; it has its own lifecycle. Mirror `src/town/db.ts` for the drizzle + WAL setup.

```sql
CREATE TABLE facts (            -- world knowledge: replaces world_memory + shared_world.resources
  id INTEGER PRIMARY KEY, kind TEXT, name TEXT,
  x INT, y INT, z INT, dimension TEXT,
  confidence REAL, source_bot TEXT, updated_at INT, expires_at INT
);
CREATE INDEX facts_kind_name ON facts(kind, name);

CREATE TABLE skills (           -- replaces skills/index.json
  name TEXT PRIMARY KEY, base_name TEXT, file TEXT, description TEXT,
  keywords TEXT, quality REAL, success_count INT, failure_count INT,
  retired_at INT
);
CREATE VIRTUAL TABLE skills_vec USING vec0(
  name TEXT PRIMARY KEY, embedding FLOAT[256]
);

CREATE TABLE cache (            -- replaces qa_cache + qa_embeddings, serves L1
  key TEXT PRIMARY KEY, task_type TEXT, answer TEXT,
  created_at INT, expires_at INT, hits INT DEFAULT 0
);
CREATE VIRTUAL TABLE cache_vec USING vec0(
  key TEXT PRIMARY KEY, embedding FLOAT[256]
);

CREATE TABLE embeddings (       -- persistent embed cache; ModelRouter LRU currently dies on restart
  text_hash TEXT PRIMARY KEY, model TEXT, embedding BLOB, created_at INT
);
```

`skills/*.js` **stay on disk as files.** They are source code, they are git-diffable, and they are the human-readable half of the "interesting corpus" goal. Only the *index* moves into SQLite.

**Step 1 — persistent embedding cache (highest value, zero risk).** Back `ModelRouter.embed`'s in-process LRU (`src/ai/ModelRouter.ts:161`, cap 256 at `:32`) with the `embeddings` table. Embeddings for identical text under the same model are identical by definition — this cache cannot serve a wrong answer. `knowledge-brain-design.md` §6 scores this at **~5,900 calls/day removed**, and it is the step with no staleness risk and no shadow period. **Do this first.**

**Step 2 — skill index (this is the one that stops active data loss).** Move `skills/index.json` into `skills` + `skills_vec`. Five workers stop rewriting a 2.8 MB git-tracked blob from stale copies and start doing single-row `UPDATE`s in a transaction. Reconcile the **447 orphaned `.js` files and 24 dangling index entries** during migration. Replace the keyword pre-filter and both hand-rolled cosine loops in `SkillLibrary.searchWithScores` with one SQL query. Deduplicate on `base_name` — 934 files / 518 indexed / 269 distinct base names, with 70× `walk_to_the_nearest_shore` and 33× `mine_1_oak_log` (`call-volume-audit.md` §7). `retired_at` gives the loop a way to stop selecting a version that fails 98% of the time, which `index.json` structurally cannot express.

Also add a **dimension guard** here: store the embedding model id alongside each vector and refuse a query whose dimensionality does not match, rather than silently scoring 0 (C.2 #6).

**Step 3 — L1 semantic cache at `ModelRouter.dispatch`.** Exactly the design in `knowledge-brain-design.md` §2.2, now with a real store behind it. Delete `CurriculumAgent`'s Q&A cache (`:109-114, 134-135, 143-155, 516-517, 602-640`) rather than extending it. **The key normalisation is the load-bearing part, not the storage** — strip coordinates, bucket inventory, per §2.2. Honour §3's hard rule: `codegen` is never served from fuzzy text similarity.

**Step 4 — facts table.** Migrate `world_memory.json`'s 48 records; keep `SpatialIndex` in front for the 3-D nearest-neighbour queries, since it already works and SQL is not better at that. Then deal with `SharedWorldModel`: either call the `pruneExpired()` that already exists and wire up the query methods that already exist, or delete it — **it is currently 3 MB of expired records that nothing reads.** Route its resource sightings into `facts` so `resources` stops being empty. Replace the four stringified `worldMemory.summary()` prompt injections (`CurriculumAgent.ts:406,529,558,591`) with targeted `findNearest` queries — this shortens prompts *and* improves answers.

**Step 5 — retire the dead weight.** Three stores track the same counters and two are never read (C.2 #2): delete `PlanLibrary` + `data/plan_templates.json`, and either wire up `SkillAttribution`'s `shouldUseSkill`/`prune` or delete it — do not leave two write-only counter stores fighting `skills/index.json` for the truth. Add the missing `threats` cap. Fix the duplicate `TokenLedger` construction in `src/index.ts:19` vs `:72` (C.2 #8) while you are in there; the $10/day cap depends on it.

**Rollback:** every step is additive — the JSON files stay on disk until the SQLite path is proven live. `memory.db` can be deleted and rebuilt from the JSON at any point during migration.

### D.3 Steal from Honcho without adopting it

Three ideas are worth taking:

1. **Hybrid retrieval (BM25 + vector).** SQLite ships FTS5; `sqlite-vec` provides the vector half. Combining both beats the current keyword-prefilter-then-cosine heuristic and costs one extra virtual table.
2. **Derived conclusions as a separate tier from raw episodes.** Honcho separates messages from what was concluded from them. The equivalent here: keep raw outcomes (`skill_attribution`, `blockers`) distinct from derived judgements ("this skill family is doomed; stop generating it").
3. **Background consolidation ("dreaming") — but deterministic.** The idea of periodic offline consolidation is right; it does not require an LLM. Skill deduplication, blocker aggregation and stale-fact expiry are all pure code, and per `call-volume-audit.md` §8 they are worth thousands of calls/day.

---

## PART E — Do NOT adopt

| Backend | Reason |
|---|---|
| **Honcho** | Models *peers and psychology*; this fleet remembers *coordinates, recipes and code*. Needs Postgres + pgvector + Redis + FastAPI + a deriver worker on a 2 vCPU / no-Docker host. **AGPL-3.0.** And its deriver/summarizer/dreamer **spend LLM calls to build memory** — either from the $10/day cap when self-hosted, or at $2/M ingestion when hosted, where 7% of current traffic exhausts the entire daily budget. Excellent product, wrong problem, wrong host, wrong direction on cost. |
| **Letta / MemGPT** | Postgres + Python server, ~800 MB baseline and **>1.5 GB under load**, and its core premise is *the LLM manages its own memory* — more calls, not fewer. Disqualified on host capacity and on cost direction. |
| **Zep Cloud** | Managed-only, proprietary, per-ingest LLM cost, external dependency for a self-hosted hobby fleet. **Zep Community Edition is discontinued** — the OSS path is Graphiti. |
| **Graphiti** | Best temporal-knowledge-graph design in the comparison, and genuinely tempting for "how did this world change over time." But it needs Neo4j ≥5.26 / FalkorDB / Kuzu, and does **LLM-based entity extraction per episode**. A JVM graph database on 2 vCPU at load 6 is not viable. Revisit the embedded-Kuzu variant only if the host grows. |
| **Mem0** | The lightest of the managed-memory family and it has a real TS SDK — but still Postgres + Qdrant, and **one LLM call per `add()`**. Against 33k calls/day of workload, memory writes billed to the same $10 cap is the wrong shape. |
| **Chroma** | **The JS client has no embedded mode** — `PersistentClient` is Python-only, so Node requires a running server. A 2026 benchmark measured **4.7 GB RAM** on ingest; on a 7.9 GB box with 2.4 GB already used, disqualified on host capacity. |
| **Qdrant** | Good software, wrong scale. Another always-on Rust daemon competing for 2 vCPU to serve ~530 KB of vectors. Disqualified on operational weight, not quality. |
| **pgvector** | Perfectly good, but means installing and tuning a PostgreSQL server for one application when `better-sqlite3` is **already a dependency already backing `data/town.db`**. Strictly more work for strictly less integration. |
| **LanceDB** | Not disqualified — genuinely viable, embedded, Apache-2.0, low memory. Rejected only because it would be a **second** storage engine beside SQLite, splitting vectors from the relational data they must be filtered against. Reconsider if the corpus ever exceeds ~10 M vectors, which is ~4 orders of magnitude away. |
| **Status quo (files + brute-force cosine)** | Not a backend so much as its absence. Twelve stores, no shared schema, no transactions, no eviction. **Five worker threads racing on six of those files through a shared fixed `.tmp` name, with 447 orphaned skill files and 24 dangling index entries already on disk to prove it.** A 3 MB "shared world model" whose `resources` array is empty, whose 11,108 threats are 100% expired, and whose `pruneExpired()` has no callers. Two write-only counter stores duplicating a third. A cosine loop the code itself documents as *"a serialized hot path"* past 600 skills — on the same event loop as five mineflayer bots. **This is the option that is actively losing data today.** |

### E.1 The one-line rule

**No memory backend that makes its own LLM calls, and no memory backend that needs its own server process.** Those two rules eliminate Honcho, Letta, Zep, Graphiti, Mem0, Chroma and Qdrant, and leave `sqlite-vec` and LanceDB — of which `sqlite-vec` wins on already being half-installed, and on giving cross-thread transactions that fix C.0.

### E.2 What would change this answer

Stated plainly so the recommendation can be revisited on evidence rather than re-litigated:

- **Host grows to ≥4 vCPU / 16 GB with a container runtime** → Graphiti (embedded Kuzu backend) becomes worth a real look for "how did this world change over time," which is the one thing SQLite genuinely models worse.
- **Corpus exceeds ~10 M vectors** (≈4 orders of magnitude away) → revisit LanceDB.
- **Player-facing social behaviour becomes a headline feature** and real player chat starts firing more than zero times per day → the `social_memory` / `affinities` / `personality` corner becomes a genuine Honcho use case. It still would not touch the world-state, skill or recipe memory.
- **None of the above changes the C.0 concurrency verdict.** That work is worth doing regardless of which backend ever wins.

---

## Sources

- [plastic-labs/honcho — GitHub](https://github.com/plastic-labs/honcho)
- [Honcho architecture notes (CLAUDE.md)](https://github.com/plastic-labs/honcho/blob/main/CLAUDE.md)
- [Honcho LICENSE — AGPL-3.0](https://raw.githubusercontent.com/plastic-labs/honcho/main/LICENSE)
- [honcho.dev — product and pricing](https://honcho.dev/)
- [Honcho quickstart — TypeScript SDK](https://honcho.dev/docs/v3/documentation/introduction/quickstart)
- [Announcing Honcho 3 — Plastic Labs](https://plasticlabs.ai/blog/posts/Honcho-3)
- [Honcho Review: Plastic Labs' Agent Memory Layer (2026) — andrew.ooo](https://andrew.ooo/posts/honcho-plastic-labs-agent-memory-review/)
- [Deploy Letta on a VPS — resource requirements](https://ramnode.com/guides/letta)
- [Letta self-hosting / Postgres docs](https://docs.letta.com/guides/selfhosting/postgres)
- [getzep/graphiti — GitHub](https://github.com/getzep/graphiti)
- [Announcing a New Direction for Zep's Open Source Strategy](https://blog.getzep.com/announcing-a-new-direction-for-zeps-open-source-strategy/)
- [Graphiti quick start — Zep docs](https://help.getzep.com/graphiti/getting-started/quick-start)
- [mem0ai/mem0 — GitHub](https://github.com/mem0ai/mem0)
- [Mem0 open-source overview](https://docs.mem0.ai/open-source/overview)
- [sqlite-vec in Node.js, Deno and Bun — Alex Garcia](https://alexgarcia.xyz/sqlite-vec/js.html)
- [Chroma client-server mode docs](https://docs.trychroma.com/docs/run-chroma/client-server)
- [Chroma clients — Chroma Cookbook](https://cookbook.chromadb.dev/core/clients/)
- [pgvector vs Chroma vs LanceDB — backend performance comparison](https://www.holysheep.ai/articles/en-pgvector-vs-chroma-vs-lancedbcodebase-memory-mcp-x-2026-06-21-0008.html)
- [LanceDB vs ChromaDB — embedded vector DB comparison](https://aicoolies.com/comparisons/lancedb-vs-chromadb)
- [Mem0 vs Zep vs Letta — agent memory platforms compared](https://www.agenticwire.news/article/mem0-zep-letta-agent-memory)
- [Filesystem / Markdown memory family — Memory Atlas](https://www.memoryatlas.dev/families/filesystem-markdown)
