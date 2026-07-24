# Knowledge Brain — caching & memory layer design

**Status:** design / audit. No code changes made.
**Date:** 2026-07-24
**Scope:** reduce LLM call volume for the mc-fleet-bot Voyager fleet by answering from memory instead of re-calling a model.

---

## 0. Executive summary

The operator's framing — *"if it looks up something, remember that, catch it, so we make fewer calls"* — is correct, but the fleet is not actually making 10,000 calls/day. Measured from `data/token-ledger.json`: **10,000 calls in 7 hours 19 minutes**, i.e. **~32,800 calls/day** at the observed rate. Five bots (`data/bots.json`: Scout, Architect, Mason, Surveyor, Steward) generate that, ~4.5 LLM calls per bot per minute.

Cost has two defensible readings and they should not be confused. Summing the ledger's own `estimatedCostUsd` over the full window gives **~$10.4/day** — but that number is an undercount, because 75% of rows price at **$0** (§1.1). Summing only the last measured hour, after the fleet restarted onto `claude-opus-4-8` and started pricing correctly, gives **$3.11/hour → ~$74.58/day**. The second figure is the one to plan against.

Three caching mechanisms already exist. All three are effectively inert:

| Mechanism | Where | Actual effect |
|---|---|---|
| Q&A semantic cache | `src/voyager/CurriculumAgent.ts:602-640` | **11 entries** against a 200 cap; wired to exactly **one** call site; costs 1–2 embed calls per lookup |
| Embedding LRU | `src/ai/ModelRouter.ts:229-256` | In-memory only, 256 entries, **discarded on every restart** |
| Anthropic prompt caching | `src/ai/AnthropicClient.ts:17,44-53` | Applies to `codegen` only. `critic`, `curriculum`, and plan prompts fall **below** the 4096-char gate. Effectiveness is **unmeasurable** — see §1.5 |

Meanwhile the workload is overwhelmingly repetitive: **90.3% of proposed tasks are exact string repeats** (8,057 proposals, 785 distinct; the top 2 tasks alone are 48.6% of all proposals), and `minecraft-data@3.105.0` — already a direct dependency with full 1.21.11 coverage — is deliberately withheld from the codegen sandbox (`src/voyager/ActionAgent.ts:117`), so the model is asked to reason about recipes and tool tiers that are sitting in a local table.

Top three recommendations, with estimated daily call reduction, are in §5–6.

---

## 1. Current-state audit

### 1.1 Measured call volume and cost

`data/token-ledger.json` is a 10,000-record ring buffer (`MAX_RECORDS`, `src/ai/TokenLedger.ts:8`). The buffer currently spans **11:05:33 → 18:24:12 on 2026-07-24**, 7.31 hours.

| taskType | calls | share | input tokens | output tokens | avg input | est. cost |
|---|---:|---:|---:|---:|---:|---:|
| `codegen` | 3,699 | 37.0% | 16,761,566 | 2,177,210 | 4,531 | $1.67 |
| `embed` | 2,266 | 22.7% | 43,875 | 0 | 19 | $0.00 |
| `critic` | 1,740 | 17.4% | 2,175,248 | 210,091 | 1,250 | $0.64 |
| `chat` | 1,221 | 12.2% | 361,338 | 48,959 | 295 | $0.18 |
| `curriculum` | 1,074 | 10.7% | 2,234,369 | 62,266 | 2,080 | $0.29 |

Extrapolations:
- Full buffer: **32,828 calls/day**.
- Last measured hour (17:24–18:24): 1,053 calls → **25,272 calls/day**, **$3.11/hour → ~$74.58/day**.

**The `chat` bucket is not conversation.** This is the most important correction to make before reading the rest of the audit. The only call site that passes `botName` is player chat (`src/bot/BotInstance.ts:1235`), and it fired **zero times** in the 7.31-hour window — it is owner-gated, radius-gated, cooldown-gated, and requires being directly addressed (`:1004-1037`). The 1,221 `chat` calls are almost entirely the **CurriculumAgent's untagged Q&A helpers** (`CurriculumAgent.ts:536`, `:566`, `:589`) leaking into the default bucket (§1.8). The 296-token average input matches those 120–160-token-capped prompts, not the 2,048-token conversation prompt (`config.yml:82`). Practically: **`chat` should be read as more curriculum**, which makes the effective curriculum+context load ~2,300 calls/window (~7,500/day), second only to codegen.

**Retries multiply every row above.** `PER_PROVIDER_RETRIES = 3` (`src/ai/ModelRouter.ts:25`) means one logical call can become **4 HTTP requests per provider**, then repeat down the fallback chain (`:346-354,376-483`) — and every attempt writes its own ledger row. 482 of the 10,000 rows are failures (95.2% success). At the task level, `voyager.maxRetriesPerTask: 3` (`config.yml:73`) means a single task can consume **3 full 4.5k-token codegen calls** plus a critic call each.

**Where the calls originate.** A full sweep of `src/` found 18 LLM call sites. Ranked by measured volume:

| # | Call site | taskType | ~calls/day | What triggers it | Prompt volatility |
|---|---|---|---:|---|---|
| 1 | `src/voyager/ActionAgent.ts:333` | `codegen` | **~12,200** | `VoyagerLoop.ts:1629` (first attempt) + `:1878` (up to 2 retries) | **Maximal.** Terrain summary, full `renderObservation` (biome/pos/health/hunger/inventory/nearby), retrieved skill code, error + critique + 30-event log |
| 2 | `src/voyager/SkillLibrary.ts:569` | `embed` | **~7,400** | Up to **6 per task step**: `VoyagerLoop.ts:1588-1589` (2) + `ActionAgent.ts:295-307` (3) + curriculum (1). Behind a TTL'd query LRU at `:550-577` | Low — query is task text, ~19 tokens |
| 3 | `src/voyager/CriticAgent.ts:250` | `critic` | **~5,700** | `VoyagerLoop.ts:1731`, once per execution attempt. Only reaches the LLM when programmatic checks return null (`CriticAgent.ts:135-146`) | High — pre/post snapshot, inventory JSON + delta |
| 4 | `CurriculumAgent.ts:536` / `:566` / `:589` | **untagged → `chat`** | **~4,000** | 4–5 extra calls per curriculum proposal, once a bot clears the 15-task warm-up gate (`:384`) | Medium; `:589` (`getTaskContext`) is 1:1 with every task proposal |
| 5 | `src/voyager/CurriculumAgent.ts:412` | `curriculum` | **~3,500** | `VoyagerLoop.ts:1262`, one per idle cycle per non-resident bot | High |
| 6 | `src/town/LlmDesigner.ts:333` | `codegen` | low | `TownBrain.ts:1043` on a 60s tick, per town | **Low** — kind + footprint + style + neighbor list. **Already cached** by `DesignCache` (`TownBrain.ts:1006`) |
| 7 | `src/town/ChronicleGenerator.ts:324`, `:344` | `chat` | ~1/town/day | 20-min scheduler tick, idempotent per town-day | Medium, bounded |
| 8 | `src/control/CommanderService.ts:874` | **untagged → `chat`** | human-triggered | Dashboard NL command box | **Lowest in the repo** — constant system prompt + raw user input, no world state |
| 9 | `src/bot/BotInstance.ts:1235` | `chat` | **0 in window** | Owner-only, radius-gated, must be directly addressed | High |
| 10 | `src/bot/BotInstance.ts:1345` | **untagged → `chat`** | ~2/bot/day | Ambient timer + 30% dice roll. Note: hardcoded 600k/1200k ms **overrides** `config.yml:48-49` | Low, 60-token cap |
| — | `src/voyager/PlanLibrary.ts:207`, `src/social/CultureManager.ts:301` | untagged / `chat` | **0 — dead code** | No callers anywhere in `src/`, `test/`, `e2e/` | n/a |

Two non-cache levers are visible here and worth naming even though they are out of scope for this design: `voyager.taskCooldownMs: 2000` (`config.yml:72`) is multiplied by `IDLE_COOLDOWN_MULTIPLIER = 6` (`src/voyager/DifficultyBalancer.ts:132-134`) when no players are online, giving a ~12s cycle per bot; and `criticLLMCalls` / `curriculumLLMCalls` (`config.yml:75-76`) are hard off-switches for rows 3 and 5. `src/town/LlmDesigner.ts` is the existing in-repo precedent that this design generalizes — it already pairs a content cache with a per-town daily USD budget (`TownBrain.ts:1006-1027`).

The last-hour cost is far higher than the buffer-average cost because the fleet restarted around 18:11 and began routing to `claude-opus-4-8`. Before that restart, 7,543 of 10,000 records carry `model: "gemini"` — a string absent from `COST_PER_MILLION` (`src/ai/TokenLedger.ts:11-59`), so `estimateCost` (`:176-180`) returns **0** for 75% of all historical calls. Consequences:

- The daily budget cap (`data/llm-settings.json`: `{"dailyUsd": 10, "scope": "anthropic"}`) sums those zeros via `getSpendTodayUsd` (`src/ai/TokenLedger.ts:163-174`) and is a no-op for anything not billed as `anthropic`.
- Actual spend (~$75/day) is 7.5× the configured cap.

**`botName` is the empty string on all 10,000 records.** `ModelRouter.embed` hardcodes `botName: ''` (`src/ai/ModelRouter.ts:289,302,317`), and every tagged call site except `BotInstance.ts:1235` omits `botName` from `LLMCallOptions` (`CriticAgent.ts:250`, `CurriculumAgent.ts:412`, `ActionAgent.ts:333`). `UsageMetrics.byBot` (`src/ai/TaskType.ts:51`) is therefore always empty, and per-bot attribution — needed to tell which bot is burning the budget — does not work.

### 1.2 Task repetition: the core signal

Parsed from `/var/log/mc-fleet-bot.log` (2.31M lines, 8,063 `Voyager task proposed` events):

- **8,057 task proposals, 785 distinct → 90.3% exact-string repeat rate.**
- After digit normalization (`Mine 3 oak logs` → `mine N oak logs`): 690 distinct → **91.4% repeat**.
- Top proposals: `Mine 1 oak log` **2,120 (26.3%)**, `Craft 1 oak planks` **1,796 (22.3%)**, `Flee from nearby hostile mobs` 545 (6.8%), `Walk to the nearest shore or land — in water` 328 (4.1%).

The two most common tasks are **48.6% of all work the fleet does**. This is the number that justifies the whole design.

### 1.3 What the skill library already prevents (and what it doesn't)

`VoyagerLoop.ts:1580-1629` already short-circuits codegen when a strong skill match exists (`codeSource = 'skill-library'`, gate at `:1597-1600`). Measured from the log:

| code source | count | share |
|---|---:|---:|
| `Reusing saved skill` | 8,059 | **55.3%** |
| `Code generated by ActionAgent` | 6,502 | **44.7%** |
| `Using action template` | 1 | 0.0% |

So there is a real 55% hit rate on the code path — but 6,502 full codegen calls still fire against a task distribution that is 90% repeats. The library is also fragmenting rather than converging: **934 skill files on disk, 518 in `skills/index.json`**, including **74 variants of `walk_to_the_nearest_shore`**, **45 of `seek_shelter_urgently_rainy_night`**, and **36 of `mine_1_oak_log`**. Each variant is a codegen call that produced a near-duplicate of something already learned.

The `ActionTemplates` tier (`src/voyager/ActionTemplates.ts`, gated at `VoyagerLoop.ts:1602-1604` on `confidence >= 0.5`) has fired **once** in the entire log. It is dead code in practice.

### 1.4 The existing Q&A semantic cache

`src/voyager/CurriculumAgent.ts`:
- Fields at `:109-112`, paths at `:134-135`, load at `:143-155`, persist at `:516-517`.
- Lookup `lookupCachedAnswer` at `:602-620`: exact-key hit first, then brute-force cosine over all stored embeddings, threshold **0.92** (`:616`).
- Store `storeCachedAnswer` at `:622-640`, eviction cap `MAX_QA_CACHE_SIZE = 200` (`:114`).

Problems, in order of severity:

1. **One call site.** It is used only by `getTaskContext` (`:582-600`), which produces a 140-token advisory blurb. It does not protect `codegen`, `critic`, or the curriculum task proposal at `:412`.
2. **It is nearly empty.** `data/qa_cache.json` holds **11 entries** (3,061 bytes) against a 200 cap, with 11 matching 256-dim vectors in `data/qa_embeddings.json`. The cache has never filled after ~7 hours of operation, because the questions it keys on embed live state.
3. **Keys embed volatile world state.** The question template at `:583` is `How to ${taskDescription} in Minecraft given this inventory, world memory, and known blockers?`. One stored key is literally `Which remembered location from resource:coal_ore@25,53,-304 | resource:iron_ore@18,66,-305 | ... is most actionable right now?` — coordinates in the cache key. That key can never be hit twice.
4. **It costs LLM calls to save LLM calls.** Every miss spends one `embed` for the lookup (`:605`) *and* one more for the store (`:625`) — the same text, embedded twice, because `ModelRouter.embed`'s LRU is keyed on `sha256(text)` and *will* hit on the second call within a process lifetime, but there is no dedupe at the CurriculumAgent layer.
5. **The stored answers are truncated garbage.** Several cached values end mid-word: `"To craft a furnace, you need 8 cobblestone. You currently have"`, `"With a stone pickaxe and plenty"`, `"The crafting table at"` — the 140-token cap (`:592`) truncates the answer and the truncation is cached permanently.
6. **O(n) brute-force scan** at `:609-615`. Fine at n=11, not at n=200 × per-call.

### 1.5 Anthropic prompt caching: partially wired, wholly unmeasured

`src/ai/AnthropicClient.ts:17` sets `CACHEABLE_SYSTEM_THRESHOLD_CHARS = 4096`, and `:44-53` attaches `cache_control: {type: 'ephemeral'}` to the system block only when the system prompt clears it. Measured system-prompt lengths:

| Constant | file:line | chars | ≈tokens | cache_control attached? |
|---|---|---:|---:|---|
| `ACTION_SYSTEM_PROMPT` | `src/voyager/ActionAgent.ts:23` | **14,036** | ~3,509 | ✅ yes |
| `CRITIC_SYSTEM_PROMPT` | `src/voyager/CriticAgent.ts:16` | **3,907** | ~977 | ❌ **189 chars short** |
| `CURRICULUM_SYSTEM_PROMPT` | `src/voyager/CurriculumAgent.ts:25` | 1,224 | ~306 | ❌ no |
| `PLAN_GENERATION_SYSTEM_PROMPT` | `src/voyager/PlanLibrary.ts:28` | 1,075 | ~269 | ❌ no — but its only consumer (`:207`) is **dead code**; delete rather than fix |

Two separate facts matter here:

- **The 4096-char constant is not wrong for `claude-opus-4-8`.** That model's minimum cacheable prefix is 1,024 tokens, and 4,096 chars ≈ 1,024 tokens. The critic prompt at ~977 tokens is genuinely below the model's own floor — padding it to clear 4096 chars would work, but it is a fragile fix.
- **`claude-opus-5` lowers the minimum to 512 tokens.** On that model the critic prompt (~977 tokens) caches with no padding at all, and the threshold constant should drop to ~2048 chars. This is the cheaper fix and it is a one-line model-ID change plus a constant change.

**Cache effectiveness is currently unmeasurable, and this is a finding in its own right.** `AnthropicClient.chat` correctly returns `cacheCreationInputTokens` / `cacheReadInputTokens` (`:93-94`), and `LLMResponse` declares both (`src/ai/LLMClient.ts:14-15`) — but:

- `ModelRouter.dispatch` reads only `response.inputTokens` / `response.outputTokens` when writing the ledger (`src/ai/ModelRouter.ts:398-399`) and when emitting the socket event (`:417-418`). Both cache fields are **dropped on the floor**.
- `TokenLedger.record()` has no parameters for them (`src/ai/TokenLedger.ts:69-78`), and `TokenUsageRecord` has no fields for them (`src/ai/TaskType.ts:28-39`). Verified: the persisted records contain exactly `timestamp, provider, model, taskType, botName, inputTokens, outputTokens, latencyMs, success, estimatedCostUsd`.
- Consequently `estimateCost` (`:176-180`) prices cache reads at the **full** input rate. Anthropic bills cache reads at ~0.1× and cache writes at 1.25× (5-min TTL). So when caching *does* work on codegen, the ledger **over-reports** cost, and when it silently stops working nothing changes in any dashboard.

There is also a structural limit: `AnthropicClient.chat` places at most one breakpoint, on the system block. The `messages` array — which for codegen carries the observation, terrain block, and retrieved skill code (`ActionAgent.ts:315-331`) — is never cached. That is the right call today because every codegen user message is unique, but it means prompt caching can only ever recover the ~3,509-token system prefix out of a 4,531-token average codegen input (77%).

### 1.6 `minecraft-data` — the largest unexploited asset

`minecraft-data` is a **direct dependency** (`package.json:24`, `^3.69.0`, installed **3.105.0**) and fully supports the pinned `version: "1.21.11"` (`config.yml:16`). For 1.21.11 it carries **1,166 blocks, 1,505 items, 886 recipes, 157 entities, 65 biomes, 44 foods, 925 block-loot tables, 43 enchantments, 25 materials**, plus `blockCollisionShapes` and `entityLoot`.

It is already used in 14 places (`src/actions/craft.ts:49`, `smelt.ts:21`, `mineBlock.ts:42`, `placeBlock.ts:26`, `container.ts:18`, `buildSchematic.ts:82`, `clearSite.ts:222`, `giveItem.ts:6`, `src/bot/BotInstance.ts:357,1613`, `src/town/SchematicEncoder.ts:240,286`, `src/voyager/Blueprint.ts:30`, `src/voyager/DependencyResolver.ts:151`). All 14 call `require('minecraft-data')(bot.version)`, re-instantiating an object mineflayer already holds as `bot.registry` (`node_modules/mineflayer/lib/loader.js:119`) — key sets are identical apart from two dimension-codec helpers.

Two things block it from reducing LLM calls:

**(a) It is explicitly withheld from the codegen sandbox.** `src/voyager/ActionAgent.ts:117` tells the model *"mcData or minecraft-data — not available in the sandbox. Use hardcoded values or bot APIs"*, and `:119-125` then hand-maintains a whitelist of valid block/item names inside the prompt. `src/voyager/ErrorRecovery.ts:125` repeats the message. So the fleet pays an LLM to recall facts it has locally.

**(b) The one wrapper that does read recipes is buggy and barely used.** `src/voyager/DependencyResolver.ts` exposes `getRecipe` (`:208`), `getMiningTool` (`:200`), `canCraft` (`:223`), and a full `resolve`/`flattenToSteps` tree walker (`:167,190`). It is instantiated once (`VoyagerLoop.ts:293`) and called from exactly one place (`VoyagerLoop.ts:1924-1967`, replacement-hint expansion).

`findRecipe` picks `recipes[0]` unconditionally (`:368-369`). `mcData.recipes` is keyed by result item id with an **array of variants**, and variant 0 is frequently not the sensible one. Verified against the project's own compiled resolver:

```
getRecipe(wooden_pickaxe) → {"ingredients":{"cherry_planks":3,"stick":2},"station":"crafting_table"}
getRecipe(iron_ingot)     → {"ingredients":{"iron_nugget":9},"station":"crafting_table"}
```

The first picks cherry wood in an oak biome; the second picks the *uncrafting* recipe, producing `iron_pickaxe → iron_ingot ×3 → iron_nugget ×27 → iron_ingot`. `resolve('wooden_pickaxe')` also emits duplicate un-merged `mine cherry_log` steps. Any fact store built on this must fix variant selection first (§5, step 2).

Substantial hardcoded duplication of mcData exists across `src/`:

| Duplicated knowledge | Hardcoded at | mcData equivalent |
|---|---|---|
| 26-entry recipe table, **twice, byte-identical** | `ErrorRecovery.ts:203-219` and `:292-319` | `mcData.recipes` (886) |
| "needs a crafting table" list | `ErrorRecovery.ts:72` | derivable from `inShape` dims (`DependencyResolver.ts:420`) |
| Harvest-tool tiers | `ErrorRecovery.ts:258-268`, `DependencyResolver.ts:~50-75` (`MINING_TOOL_MAP`), `:135-139` (`HAND_MINEABLE`), `actions/mineBlock.ts:6-8`, `actions/attack.ts:7` | `blocks[].harvestTools`, `mcData.materials` |
| Block → drop map | `DependencyResolver.ts:78-108` (`BLOCK_DROP_MAP`) | `blocks[].drops`, `mcData.blockLoot` |
| Hostile-mob sets (5–11 entries each) | `BotInstance.ts:1764`, `ThreatAssessor.ts:22`, `GoalGenerator.ts:61`, `PlayerIntentModel.ts:66` | `entities[].category === 'Hostile mobs'` (43) |
| Food lists | `GoalGenerator.ts:523-525`, `DungeonMaster.ts:125`, `ActionAgent.ts:125` (prompt) | `mcData.foodsByName` (44) |
| Tech-tree progression | `src/voyager/Progression.ts` (whole file) | derivable from recipes + `harvestTools` |

`SMELT_MAP` (`DependencyResolver.ts:110-121`) is the one genuine exception — minecraft-data carries no smelting recipes. Keep it.

### 1.7 Other memory surfaces

- `SkillLibrary` (`src/voyager/SkillLibrary.ts`) already stores per-skill embeddings (`:259`, `:569`, `:586`) in `skills/index.json`. This is the correct substrate for a code-level semantic cache and needs consolidation, not replacement.
- `data/blackboard.json` (74 KB), `data/world_memory.json` (2.8 KB), `data/shared_world.json` (3.0 MB), `data/social_memory.json` (29 KB) — all live state, not lookup caches. Out of scope for call reduction except as *inputs* that must be excluded from cache keys.
- `data/plan_templates.json` (40 KB) via `src/voyager/PlanLibrary.ts` is a durable plan cache, but its LLM generator (`:207`) has no callers — the file is populated by other means.
- `src/town/LlmDesigner.ts` + `DesignCache` (`src/town/TownBrain.ts:1006-1027`) is the **existing working precedent** for everything this design proposes: a content-keyed cache checked before the call, plus a per-town daily USD budget checked after the cache miss. It is the pattern to generalize.

### 1.8 Untagged call sites (routing + measurement bug)

Seven LLM call sites pass no `LLMCallOptions` at all, so they default to `taskType: 'chat'` (`ModelRouter.generate:210`, `dispatch:342`) and are routed, billed, and cached as chat:

- `src/voyager/CurriculumAgent.ts:536`, `:566`, `:589`, `:711` — curriculum-shaped work; **this is essentially the entire `chat` bucket**
- `src/control/CommanderService.ts:874` — commander parse (should be its own type; must never be cached)
- `src/bot/BotInstance.ts:1345` — ambient chat (60 tokens; legitimately chat)
- `src/voyager/PlanLibrary.ts:207` — dead code, no callers

This is not cosmetic. It means (a) ~4,000 curriculum calls/day are invisible in every per-taskType dashboard, (b) they are routed by the `chat` route rather than the `curriculum` route, and (c) **any per-taskType cache policy is applied to the wrong traffic** — a `chat`-tier similarity threshold would be applied to curriculum work and vice versa. Tagging must precede enforcement (§5, step 1).

Two call sites are dead and should be deleted rather than cached: `src/voyager/PlanLibrary.ts:207` (`generatePlanWithLLM`) and `src/social/CultureManager.ts:301` (`extractMemesWithLLM`) have no callers in `src/`, `test/`, or `e2e/`. This also removes `PLAN_GENERATION_SYSTEM_PROMPT` from the prompt-caching problem in §1.5.

---

## 2. Proposed architecture

Three layers, cheapest first. A request falls through only when the layer above misses.

```
                    ┌──────────────────────────────────────────┐
   LLM call  ──────▶│ L0  FACT STORE  (deterministic, 0 calls) │──▶ answer
                    │     minecraft-data + derived tables       │
                    └──────────────┬───────────────────────────┘
                                   │ miss / not a fact question
                    ┌──────────────▼───────────────────────────┐
                    │ L1  SEMANTIC CACHE (1 cheap embed)       │──▶ answer
                    │     normalized key → prior answer         │
                    └──────────────┬───────────────────────────┘
                                   │ miss
                    ┌──────────────▼───────────────────────────┐
                    │ L2  PROVIDER PROMPT CACHE (billed 0.1x)  │──▶ answer
                    │     Anthropic cache_control on prefix     │
                    └──────────────────────────────────────────┘
```

L0 and L1 remove calls. L2 makes the unavoidable calls cheaper. All three need L3 — measurement — or none of it is provable.

### 2.1 L0 — Knowledge brain / fact store

A single module, e.g. `src/knowledge/FactStore.ts`, that owns one `minecraft-data` instance (preferably `bot.registry`) and exposes typed, synchronous, deterministic lookups. **No LLM ever answers a question this can answer.**

Surface (all synchronous, all pure):

| Method | Backed by | Replaces |
|---|---|---|
| `getRecipe(item, ctx)` | `mcData.recipes` + variant scoring | `ErrorRecovery.ts:203-219,292-319` |
| `getCraftTree(item, count, inventory)` | recursive recipe walk | LLM "how do I make X" reasoning |
| `needsCraftingTable(item)` | `inShape` dimensions | `ErrorRecovery.ts:72` |
| `getHarvestTool(block)` | `blocks[].harvestTools` + `materials` | `MINING_TOOL_MAP`, `ErrorRecovery.ts:258-268` |
| `getDrops(block)` | `blocks[].drops`, `blockLoot` | `BLOCK_DROP_MAP` |
| `isHostile(entityName)` | `entities[].category` | 4 hardcoded sets |
| `isFood(item)` / `getFoodPoints(item)` | `foodsByName` | 3 hardcoded lists |
| `isValidBlock/Item(name)` | `blocksByName` / `itemsByName` | `ActionAgent.ts:119-125` prompt whitelist |
| `getSmeltInput(item)` | `SMELT_MAP` (kept — mcData has no smelting) | — |

**Variant selection is the correctness-critical piece.** `recipes[id][0]` is wrong in production today (§1.6b). The scoring rule must:

1. Reject any variant that is a cycle — where an ingredient's own primary recipe produces the result (kills the `iron_ingot ← 9 iron_nugget` uncrafting recipe).
2. Prefer variants whose ingredients are already in the bot's inventory.
3. Then prefer variants whose ingredients are in `world_memory` / nearby-block observations (kills `cherry_planks` in an oak biome).
4. Then fall back to a stable deterministic tie-break (lowest ingredient id) so the same input always yields the same plan — important, because L1 will cache on top of it.

**Two consumption paths, both required:**

- **Prompt injection.** Before a `codegen` or `curriculum` call, resolve the task's target item/block and inject the concrete recipe, tool requirement, and drop into the user message: `"wooden_pickaxe = 3 oak_planks + 2 stick, needs crafting_table"`. This is strictly better than the model recalling it and it *shortens* the prompt by letting `ActionAgent.ts:119-125`'s hand-maintained whitelist shrink.
- **Sandbox exposure.** Reverse the `ActionAgent.ts:117` prohibition: expose a frozen, read-only `facts` object into the `CodeExecutor` VM (`src/voyager/CodeExecutor.ts`) so generated code can call `facts.getRecipe(...)` instead of hardcoding. This removes a whole class of "wrong plank type" retries.

L0 has **no invalidation problem** — the data is a versioned static table that changes only when `config.yml`'s `minecraft.version` changes. Key the module on that version and rebuild derived tables on change.

### 2.2 L1 — Semantic cache

A cross-cutting cache in front of `ModelRouter.dispatch`, not per-agent. `src/voyager/CurriculumAgent.ts`'s implementation should be deleted and replaced, not extended, for four reasons: it lives in the wrong layer, it embeds volatile state in the key, it double-embeds, and it caches truncated answers.

**Placement.** The right seam is `ModelRouter.dispatch` (`src/ai/ModelRouter.ts:335`) — every worker LLM call already funnels through `WorkerHandle.routeRequest` (`src/worker/WorkerHandle.ts:207-220`) into the main-thread router, so a single cache there serves all 5 bots and survives per-worker restarts. That is a genuine architectural advantage of the current design and should be used.

**What gets keyed.** Not the raw prompt. A **normalized cache key** built per taskType, from which volatile state is stripped:

```
key = sha256( taskType + '|' + modelId + '|' + normalize(systemPrompt) + '|' + normalize(userMessage) )
```

`normalize()` must remove, before hashing and before embedding:

- absolute coordinates (`\d+,\d+,\d+`, `@x,y,z`) — the single biggest reason the existing cache never hits
- health / food / oxygen / XP numerics
- timestamps, tick counts, day numbers
- bot name and position
- exact inventory *counts* (keep the item *set*, bucket counts as `0` / `1` / `2-8` / `9+`)

What deliberately **stays** in the key: the task description (digit-normalized), the item/block nouns, the tool tier, and the error string for retry paths. Those are what actually determine the answer.

**Two-tier lookup:**

1. **Exact:** `Map<keyHash, entry>` — O(1), zero cost, catches the 90.3% exact-repeat traffic on its own.
2. **Semantic:** only on exact miss, embed the normalized key once and do nearest-neighbour against stored key-embeddings.

**Threshold.** Per-taskType, not global:

| taskType | similarity threshold | rationale |
|---|---|---|
| `critic` | **0.97** | a verdict is a boolean+critique; a near-miss serves a wrong pass/fail |
| `codegen` | **0.98** | a near-miss serves broken code (see §3 risk) |
| `curriculum` | **0.93** | proposing a slightly-stale next task is recoverable |
| `chat` | **0.90** for static Q&A only; never for world-state questions | — |

The current global `0.92` (`CurriculumAgent.ts:616`) is too loose for `critic` and far too loose for `codegen`.

Embed one text per lookup, and reuse that same vector for the store on a miss — the existing code embeds twice (`CurriculumAgent.ts:605` and `:625`).

**Staleness and invalidation.** Every entry carries:

```ts
{
  key, taskType, modelId,
  answer, answerComplete: boolean,       // reject truncated answers
  embedding: number[],
  createdAt, lastHitAt, hits,
  worldEpoch: number,                    // bumped on world-changing events
  ttlMs: number
}
```

Invalidation hooks — a cache without these serves stale answers into live bot behavior:

| Hook | Fires on | Action |
|---|---|---|
| `minecraft.version` change | `config.yml` patch / restart | **flush all** (recipes and block ids move) |
| World repoint (`minecraft.host` change) | `config.yml` patch | **flush all** — coordinates, biomes, structures all differ |
| Bot death / respawn | `bot:died` | invalidate that bot's `curriculum` and `chat` entries |
| Skill updated or deleted | `PUT`/`DELETE /api/skills/:name` | invalidate `codegen` + `critic` entries whose prompt referenced that skill |
| Prompt constant change | build / deploy | key includes a hash of the system prompt, so this is automatic |
| Model or route change | `PUT /api/llm/routes`, `POST /api/llm/reload` | key includes `modelId`, so this is automatic |
| Manual | new `POST /api/cache/flush` | operator escape hatch |

`worldEpoch` is a monotonic counter bumped by the second and fourth rows; an entry with `entry.worldEpoch < currentEpoch` is treated as a miss and evicted lazily.

**TTL by taskType** (§3 table). Persist to `data/semantic_cache.json` via the existing atomic-write helper in `src/util/`, with a debounced save mirroring `TokenLedger.scheduleSave` (`src/ai/TokenLedger.ts:182-188`). Cap at ~5,000 entries with LRU-by-`lastHitAt` eviction — the current 200 cap (`CurriculumAgent.ts:114`) is far below the working set.

**Answer completeness gate.** Never cache a response whose `stop_reason` indicates truncation or whose text fails the caller's own parse (e.g. `ActionAgent`'s function-extraction regex, `CriticAgent`'s JSON parse). This alone would have kept the six truncated entries out of `data/qa_cache.json`.

### 2.3 L1b — Skill library consolidation (the codegen-specific cache)

The generic semantic cache should *not* be the primary mechanism for `codegen`. The skill library already is one, and it is fragmenting (§1.3: 74 `walk_to_the_nearest_shore` variants). Three targeted changes:

1. **Lower the direct-reuse bar and remove the composable veto.** `VoyagerLoop.ts:1597-1600` requires either `composableSkills.length <= 1` **or** `bestSkill.score >= 24`. With 934 skills on disk, ≥2 loose composables is now the normal case, so the `<= 1` branch almost never fires and everything hinges on the score-24 gate. Instrument the score distribution of the 6,502 codegen calls before tuning — this is the single highest-leverage knob.
2. **Deduplicate on save.** Before `skillLibrary.save` (`VoyagerLoop.ts:1757`), reject a new skill whose embedding is ≥0.97 similar to an existing skill *with a better success rate*; record an outcome against the incumbent instead. This stops v33/v34/v35 accumulation.
3. **Prune.** 934 files vs 518 indexed means 416 orphans. A one-off consolidation pass keyed on normalized task name + embedding similarity should collapse the 74/45/36-way families to their best-performing member.

### 2.4 L2 — Provider prompt caching

For the calls that genuinely must happen:

1. **Move `critic` and `curriculum` under the cache floor.** Either (a) switch the anthropic provider model to `claude-opus-5`, whose minimum cacheable prefix is **512 tokens**, and lower `CACHEABLE_SYSTEM_THRESHOLD_CHARS` (`AnthropicClient.ts:17`) from 4096 to ~2048; or (b) stay on `claude-opus-4-8` (1,024-token minimum) and grow `CRITIC_SYSTEM_PROMPT` past 4,096 chars. (a) is cleaner and also picks up `CURRICULUM_SYSTEM_PROMPT` (1,224 chars ≈ 306 tokens — still below even the 512 floor, so that one needs prompt growth or accepts no caching).
2. **Keep the prefix byte-stable.** All four system prompts are module-level constants with no interpolation — verified. Do not let the L0 fact injection (§2.1) leak into the *system* prompt; it must go in the user message, after the breakpoint, or it invalidates the prefix on every call.
3. **Do not add message-level breakpoints yet.** Codegen user messages are unique per call; a breakpoint there would pay the 1.25× write premium for zero reads.

### 2.5 L3 — Measurement (non-negotiable)

Without this, none of the above is provable and the cost dashboard stays wrong.

**Extend the ledger record.** Add to `TokenUsageRecord` (`src/ai/TaskType.ts:28-39`) and `TokenLedger.record()` (`src/ai/TokenLedger.ts:69-90`):

```ts
cacheCreationInputTokens?: number;   // from LLMResponse — currently dropped
cacheReadInputTokens?: number;       // from LLMResponse — currently dropped
cacheLayer?: 'l0-fact' | 'l1-exact' | 'l1-semantic' | 'l1b-skill' | 'miss';
cacheSimilarity?: number;            // for l1-semantic, to tune thresholds
normalizedKeyHash?: string;          // to measure would-have-hit rate offline
```

Then plumb them through `ModelRouter.dispatch` (`src/ai/ModelRouter.ts:389-402`) and `emitCall` (`:404-420`) — both currently read only `inputTokens`/`outputTokens`.

**Fix cost accounting.** `estimateCost` (`:176-180`) must price the three token classes separately:

```
cost = (inputTokens        × rate.input
      + cacheCreationTokens × rate.input × 1.25    // 5-min ephemeral write
      + cacheReadTokens     × rate.input × 0.10    // cache read
      + outputTokens        × rate.output) / 1e6
```

**Fix `botName`.** Pass `botName` in `LLMCallOptions` at `CriticAgent.ts:250`, `CurriculumAgent.ts:412`, `ActionAgent.ts:333`, and thread it into `ModelRouter.embed` (`:289,302,317`) instead of the hardcoded `''`.

**Tag the untagged.** Add `taskType` to the six call sites in §1.8.

**Shadow mode first.** Ship L1 with a `cache.mode: 'shadow' | 'enforce'` config flag. In shadow mode, compute the key, do the lookup, log `cacheLayer` and `cacheSimilarity` — **and still make the real call**, then compare the cached answer to the live one. Run for 24 hours. This yields a measured hit rate *and* a measured false-hit rate per taskType before any cached answer touches a bot. Given the correctness risk on `codegen` (§3), shipping straight to enforce is not acceptable.

**Surface it.** Extend `GET /api/metrics` and `GET /api/llm/usage` (`src/server/llmRoutes.ts`) with `{hitRate, byLayer, byTaskType, tokensSaved, usdSaved, cacheReadRatio}`. `cacheReadRatio = cacheRead / (cacheRead + cacheCreation + input)` per taskType is the single number that proves L2 is working.

---

## 3. Per-taskType cacheability

| taskType | share of calls | L0 fact store | L1 semantic cache | Threshold / TTL | Risk if a wrong answer is served | Required invalidation hooks |
|---|---:|---|---|---|---|---|
| **`codegen`** | 37.0% | ✅ **inject recipes/tools/drops** into the user message; expose `facts` in the VM | ⚠️ **only via the skill library (L1b)**, never via the generic text cache | exact-match on normalized task + inventory bucket + skill-set hash; **0.98** semantic floor; TTL 7d | **Severe.** A near-miss returns code that compiles but does the wrong thing — mines the wrong block, crafts with the wrong plank type. Failures are silent and cost real in-game time. | skill add/update/delete; `minecraft.version`; world repoint; bot inventory-class change |
| **`critic`** | 17.4% | ➖ | ✅ **best candidate.** Key = `hash(code) + hash(task) + outcome-summary`. A verdict on byte-identical code with an identical outcome is deterministic. | **0.97**; prefer exact `hash(code)` match only; TTL 30d | **Moderate.** A wrong pass marks a broken skill as good and it gets reused; a wrong fail triggers needless regeneration. Mitigated by requiring exact code hash. | skill code change (implied by code hash); prompt-constant change |
| **`curriculum`** | 10.7% | ✅ **large.** "what's the prerequisite for X" is a recipe-tree query, not an LLM query | ✅ good — 90.3% of proposals repeat | **0.93**; TTL 6h | **Low.** A stale next-task proposal wastes one task cycle and is corrected on the next tick. | bot death; world epoch; completed-task-set change |
| **`chat`** | 12.2% | ✅ for the curriculum Q&A majority | ⚠️ **split it — this bucket is three different things.** (a) **CurriculumAgent Q&A** (`:536,566,589`, ~all of the volume): treat as `curriculum`, ✅ cacheable. (b) **Static Q&A** ("how do I craft a pickaxe"): ✅ 0.90 — but most of these are really L0 fact queries. (c) **Situational** — real player chat (`BotInstance.ts:1235`), ambient (`:1345`), commander parse (`CommanderService.ts:874`): ❌ **never cache** — the answer is a function of live world state or a unique human utterance | 0.93 / TTL 6h for (a); 0.90 / 24h for (b); **no cache** for (c) | **Low-moderate.** For (a), same as curriculum. For (c), player-visible wrongness ("there's iron ore to your east" when there isn't) damages trust but not bot behavior — and a cached commander parse would execute the wrong fleet plan, which is why it is excluded outright. | tag the call sites first (§1.8) — you cannot apply a per-taskType policy to a bucket whose members are mislabelled; then player-session change; world epoch |
| **`embed`** | 22.7% | ➖ | ✅ **already cached, but only in RAM.** `ModelRouter.embedCache` (`:161`, cap 256 at `:33`) is per-process and lost on restart | exact `sha256(text)`; **persist to disk**; TTL ∞ (embeddings are deterministic per model) | **None.** Embeddings for identical text under the same model are identical by definition. This is the safest cache in the system. | embedding-model change only |

**The hard rule:** `codegen` must never be served from a fuzzy text-similarity match. Two task descriptions can be 0.98 similar and require materially different code (`Mine 1 oak log` vs `Mine 1 dark_oak_log`; `Craft 4 oak planks` vs `Craft 4 acacia planks` — both of which appear in the live skill directory). Codegen reuse must go through the skill library, where the artifact is validated by *execution outcome* (`recordOutcome`, `VoyagerLoop.ts:1764,1796`) rather than by prompt similarity. Semantic similarity is a retrieval hint; execution success is the correctness signal.

---

## 4. What to delete

Not everything here is additive. These should go:

- `CurriculumAgent`'s Q&A cache (`:109-114, 134-135, 143-155, 516-517, 602-640`) — superseded by L1 at the router.
- The two byte-identical hardcoded recipe tables in `ErrorRecovery.ts:203-219` and `:292-319`.
- `MINING_TOOL_MAP`, `HAND_MINEABLE`, `BLOCK_DROP_MAP` in `DependencyResolver.ts` once L0 derives them (keep `SMELT_MAP`).
- The four hardcoded hostile-mob sets and three food lists (§1.6).
- The `mcData is not available` prohibition at `ActionAgent.ts:117` and `ErrorRecovery.ts:125`, plus the block/item whitelist at `ActionAgent.ts:119-125` it exists to compensate for — that whitelist is ~1KB of the 14KB system prompt.

---

## 5. Implementation plan (dependency order)

Each step is independently shippable and independently measurable.

**Step 1 — Measurement first (no behavior change).**
Extend `TokenUsageRecord` and `TokenLedger.record()` with the cache-token fields; plumb `cacheCreationInputTokens` / `cacheReadInputTokens` from `LLMResponse` through `ModelRouter.dispatch:389-420`; fix `estimateCost` to price the three token classes; fix `botName` at the four sites; tag the six untagged call sites; add `cacheReadRatio` to `GET /api/llm/usage`.
*Outcome:* current Anthropic cache effectiveness becomes visible for the first time, and the daily budget cap starts working. Nothing else can be evaluated until this lands.

**Step 2 — Fix `DependencyResolver` variant selection.**
Replace `recipes[0]` (`:368-369`) with the scoring rule in §2.1 (cycle rejection → inventory preference → world-memory preference → stable tie-break). Merge duplicate steps in `collectSteps` (`:342`). Add tests asserting `wooden_pickaxe → oak_planks` in an oak context and that `iron_ingot` never resolves through `iron_nugget`.
*Outcome:* prerequisite planning stops producing cherry-wood and nugget-cycle plans. **This must precede L0**, because L0 will cache whatever this returns.

**Step 3 — Build `src/knowledge/FactStore.ts` (L0).**
Wrap `bot.registry` (falling back to `require('minecraft-data')(version)`), expose the §2.1 surface, back it with the fixed resolver. Delete the duplicated tables in §4. Inject facts into `codegen` and `curriculum` **user messages** (never the system prompt — §2.4.2). Expose a frozen `facts` object in `CodeExecutor`'s VM and reverse the `ActionAgent.ts:117` prohibition.
*Outcome:* the largest single win, and it carries **zero cache-staleness risk**.

**Step 4 — Persist and enlarge the embedding cache.**
Back `ModelRouter.embedCache` (`:161`) with a disk file keyed `sha256(text)|modelId`; raise `EMBED_CACHE_MAX` (`:33`) from 256 to ~20,000 (256-dim float32 ≈ 1KB/entry → ~20MB).
*Outcome:* removes most of the 22.7% `embed` bucket, at zero correctness risk. Also a prerequisite for L1, which spends embeds.

**Step 5 — Skill library consolidation (L1b).**
Instrument the `bestSkill.score` distribution across codegen calls; retune the `VoyagerLoop.ts:1597-1600` gate on that evidence; add dedupe-on-save; run a one-off consolidation over the 934 files / 518 index entries.
*Outcome:* raises the existing 55.3% code-reuse rate, which is the only safe lever on `codegen`.

**Step 6 — Semantic cache in shadow mode (L1).**
Build `src/knowledge/SemanticCache.ts` with the normalized keying, per-taskType thresholds, `worldEpoch` invalidation, and the completeness gate. Wire into `ModelRouter.dispatch`. Ship with `cache.mode: 'shadow'`. Run 24h and report measured hit rate + false-hit rate per taskType.
*Outcome:* real numbers, no risk.

**Step 7 — Enforce, taskType by taskType.**
Promote to `enforce` in ascending risk order: `embed` → `critic` (exact code-hash only) → `curriculum` → static `chat`. **Leave `codegen` on shadow indefinitely** unless step 6 shows a near-zero false-hit rate; codegen reuse should stay with L1b.

**Step 8 — L2 prompt-cache fixes.**
Move the anthropic provider to `claude-opus-5` and lower `CACHEABLE_SYSTEM_THRESHOLD_CHARS` to ~2048, bringing `CRITIC_SYSTEM_PROMPT` (977 tokens) above the 512-token floor. Verify via the now-working `cacheReadRatio`.

**Step 9 — Delete the old Q&A cache.**
Remove the `CurriculumAgent` implementation and `data/qa_cache.json` / `data/qa_embeddings.json` once L1 covers `curriculum`.

---

## 6. Estimated call reduction

Baseline: **32,828 calls/day** (buffer-rate) or **25,272 calls/day** (last-hour rate). Using the buffer-rate distribution.

| Step | Mechanism | Calls removed/day | Reasoning |
|---|---|---:|---|
| 4 | Persistent embed cache | **~5,900** | 2,266 embeds / 7.31h = 7,438/day. The in-process LRU already absorbs same-process repeats; persisting it across restarts and raising the cap from 256 to 20k should capture ~80%. Skill-library embeds are the same ~518 documents re-embedded after each restart. |
| 3 | L0 fact injection → fewer codegen retries | **~2,400** | 6,502 of 14,562 code-source decisions were full codegen. `Execution result` fires 27,664 times vs 14,512 `Executing generated code` — a heavy retry loop. Wrong-plank-type and wrong-tool errors are exactly what `ErrorRecovery`'s hardcoded tables are for; ~20% of codegen (incl. retries) should stop firing. Conservative. |
| 3 | L0 → curriculum prerequisite queries | **~2,300** | The untagged `chat` bucket (~4,000/day) is almost entirely `CurriculumAgent.ts:536,566,589` asking prerequisite / "what should I do next" / "what's missing" questions — questions `getCraftTree` and `getHarvestTool` answer deterministically. Sample cached questions confirm it: *"What prerequisite item or workstation is most likely missing for the next useful progression step?"*. Assume ~40% of the combined 7,500/day curriculum+context load is a pure fact query. |
| 5 | Skill dedupe + retuned reuse gate | **~4,300** | Raising code reuse from 55.3% to ~75% removes ~20 pts of 21,350 code-source decisions/day. Justified by 90.3% task repetition and the 74/45/36-way skill families. |
| 6–7 | L1 semantic cache on `critic` | **~4,000** | 1,740 critic calls / 7.31h = 5,713/day. Critic verdicts key on exact code hash + task; with 785 distinct tasks and a converged skill set, ~70% should be exact repeats. |
| 6–7 | L1 on `curriculum` + the untagged Q&A | **~2,600** | ~5,200/day survive step 3. Against a distribution that is 90.3% exact repeats over 785 distinct tasks, a normalized key should hit ~50%. |
| 8 | L2 prompt caching on `critic` | 0 calls | Not a call reduction — a **token cost** reduction: ~977 of 1,250 avg critic input tokens (78%) move from 1.0× to 0.1×, on 5,713 calls/day. |
| 1, 9 | Delete dead call sites | 0 | `PlanLibrary.ts:207` and `CultureManager.ts:301` already fire zero times. Listed for hygiene, not savings. |

**Totals:**

- **~21,100 calls/day removed of 32,828 → ~11,700/day remaining, a ~64% reduction.**
- Steps 3 + 4 alone (zero cache-staleness risk, no shadow period needed) account for **~10,600/day, ~32%**.
- Cost: the removed calls are weighted toward `codegen` (the most expensive bucket at 4,531 avg input tokens). Combined with the L2 critic fix and correct cache-read pricing, the ~$75/day should fall to roughly **$25–30/day**.

**Confidence.** The embed and skill-dedupe estimates are well-grounded (directly measured counts and duplication factors). The L1 critic/curriculum estimates are the softest — they assume the normalized key actually collapses the 90.3% task repetition into cache hits, which is precisely what the shadow-mode run in step 6 exists to verify before anything is enforced.

---

## Appendix — file:line index

**Call sites (18 total; see the table in §1.1)**
- `src/voyager/ActionAgent.ts:333` (`codegen`) · `src/voyager/CriticAgent.ts:250` (`critic`) · `src/voyager/CurriculumAgent.ts:412` (`curriculum`)
- `src/voyager/CurriculumAgent.ts:536,566,589,711` · `src/control/CommanderService.ts:874` · `src/bot/BotInstance.ts:1345` — **untagged, default to `chat`**
- `src/voyager/SkillLibrary.ts:259,569,586` · `src/voyager/CurriculumAgent.ts:605,625` (`embed`)
- `src/town/LlmDesigner.ts:333` (`codegen`, already cached) · `src/town/ChronicleGenerator.ts:324,344` (`chat`) · `src/bot/BotInstance.ts:1235` (`chat`, only site passing `botName`)
- `src/voyager/PlanLibrary.ts:207` · `src/social/CultureManager.ts:301` — **dead, no callers**

**Cadence and amplifiers**
- `config.yml:72` `taskCooldownMs: 2000` × `src/voyager/DifficultyBalancer.ts:132-134` `IDLE_COOLDOWN_MULTIPLIER = 6`
- `config.yml:73` `maxRetriesPerTask: 3` · `config.yml:75-76` `curriculumLLMCalls` / `criticLLMCalls` off-switches
- `src/ai/ModelRouter.ts:25` `PER_PROVIDER_RETRIES = 3` (up to 4 HTTP requests per logical call, per provider)
- `src/town/TownBrain.ts:86` `TICK_INTERVAL_MS = 60_000` · `:1006-1027` `DesignCache` + per-town budget (existing precedent)

**LLM plumbing**
- `src/ai/AnthropicClient.ts:17` — `CACHEABLE_SYSTEM_THRESHOLD_CHARS = 4096`
- `src/ai/AnthropicClient.ts:44-53` — `cache_control` attachment (system block only)
- `src/ai/AnthropicClient.ts:93-94` — cache token fields returned but never consumed
- `src/ai/LLMClient.ts:14-15` — `cacheCreationInputTokens` / `cacheReadInputTokens` declared
- `src/ai/ModelRouter.ts:33,161,229-256,527-535` — embedding LRU (256, in-memory)
- `src/ai/ModelRouter.ts:335,389-420` — dispatch + ledger write (drops cache fields)
- `src/ai/ModelRouter.ts:289,302,317` — hardcoded `botName: ''`
- `src/ai/TokenLedger.ts:8,11-59,69-90,163-180` — ring buffer, price table, record, cost
- `src/ai/TaskType.ts:5,28-39` — `TaskType` union, `TokenUsageRecord`
- `src/worker/WorkerHandle.ts:207-220` — the single chokepoint every worker LLM call passes through

**Existing caches**
- `src/voyager/CurriculumAgent.ts:109-114,134-135,143-155,516-517,582-640` — Q&A cache
- `src/voyager/SkillLibrary.ts:259,569,586` — skill embeddings
- `src/voyager/PlanLibrary.ts:28,207-208` — plan cache + uncached prompt

**Prompts**
- `src/voyager/ActionAgent.ts:23` (14,036 chars), `:117-125` (mcData prohibition + whitelist), `:315-333` (user message + call)
- `src/voyager/CriticAgent.ts:16` (3,907 chars), `:250`
- `src/voyager/CurriculumAgent.ts:25` (1,224 chars), `:412`

**Fact-store substrate**
- `src/voyager/DependencyResolver.ts:151-152` (mcData init), `:200,208,223` (public API), `:342` (dup steps), `:361-369` (**`recipes[0]` bug**), `:420-426` (station derivation), `:50-139` (hardcoded tables)
- `src/voyager/VoyagerLoop.ts:293,1580-1629,1757,1764,1796,1924-1967`
- `src/voyager/ErrorRecovery.ts:72,125,203-219,258-268,292-319` (duplicated tables)
- `package.json:24` — `minecraft-data ^3.69.0` (installed 3.105.0)
- `config.yml:16` — `version: "1.21.11"`
