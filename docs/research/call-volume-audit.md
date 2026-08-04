# LLM Call-Volume Audit — mc-fleet-bot

**Date:** 2026-07-24 · **Analyst:** automated audit · **Scope:** analysis only, no code changes.

**Data sources**
- `data/token-ledger.json` — 10,000 records, window **11:05:05 → 18:22:59 (7.30 h)**, 5 bots (Scout, Architect, Mason, Surveyor, Steward).
- `/var/log/mc-fleet-bot.log` — 126 MB, window **01:54 → 18:25 (16.5 h)**, used for per-call-site attribution (the ledger does not record call sites).
- Live `GET /api/llm/usage`.

---

## 0. Correction to the premise: it is not 10k calls/day, it is ~33k/day

`TokenLedger.MAX_RECORDS = 10000` (`src/ai/TokenLedger.ts:8`, truncation at `:86`, `:195`, `:207`). The ledger is a fixed 10k circular buffer. The "10,000 calls in a day" figure is the *buffer size*, not a daily total.

The 10,000 retained records cover **7.30 hours**, i.e. **1,370 calls/hour**.

| | measured (7.3 h sample) | true 24 h run-rate |
|---|---|---|
| calls | 10,000 | **~32,900** |
| input tokens | 21.5 M | **~70.7 M** |
| output tokens | 2.51 M | ~8.3 M |

Everything below is quoted on the 7.3 h sample with the ×3.29 daily extrapolation alongside. **Actual exposure is ~3.3× the assumed baseline.**

---

## 1. Calls and tokens by taskType

`static sys tok` = the byte-identical system prompt, resent in full on every call
(`ACTION_SYSTEM_PROMPT` 13,968 chars ≈ 3,492 tok; `CRITIC_SYSTEM_PROMPT` 3,907 chars ≈ 977 tok; `CURRICULUM_SYSTEM_PROMPT` 1,224 chars ≈ 306 tok).

| taskType | calls | % calls | input tok | % input | output tok | mean in/call | static sys tok | static as % of that type's input | fail rows | calls/day |
|---|---|---|---|---|---|---|---|---|---|---|
| codegen | 3,708 | 37.1% | 16,647,552 | **77.4%** | 2,187,130 | 4,489 | 12,948,336 | 78% | 213 | 12,197 |
| critic | 1,774 | 17.7% | 2,246,850 | 10.4% | 217,146 | 1,266 | 1,732,754 | 77% | 84 | 5,835 |
| curriculum | 1,064 | 10.6% | 2,212,751 | 10.3% | 61,640 | 2,079 | 325,584 | 15% | 45 | 3,499 |
| chat | 1,211 | 12.1% | 358,076 | 1.7% | 48,541 | 295 | 0 | — | 140 | 3,983 |
| embed | 2,243 | 22.4% | 43,429 | 0.2% | 0 | 19 | 0 | — | 0 | 7,378 |
| **TOTAL** | **10,000** | 100% | **21,508,658** | 100% | 2,514,457 | 2,150 | **15,006,674** | **70%** | 482 | **32,894** |

**By bot: unavailable.** `byBot` is `{}` in `/api/llm/usage` and `botName` is `""` on 8,789 of 10,000 rows. `ModelRouter.dispatch` reads `options?.botName` (`src/ai/ModelRouter.ts:325`) but `ActionAgent.ts:333`, `CriticAgent.ts:250` and `CurriculumAgent.ts:412` never pass it. Only `BotInstance.ts:1235` does. See finding **F8**.

### What drives the 4,489-token mean on codegen

Measured over 6,513 `ActionAgent LLM call stats` log records:

| component | chars | ≈ tokens | share |
|---|---|---|---|
| `ACTION_SYSTEM_PROMPT` (identical on **100.0%** of calls — only one distinct value observed) | 13,968 | 3,492 | **78%** |
| user message (observation + skill summaries + best-skill code + retry context) | mean 3,766 / p95 4,598 / max 5,573 | ~995 | 22% |

So the dominant cost is not inventory dumps or skill listings — it is a **3.5k-token constant** multiplied by call count. Same shape on critic (77%). Across all task types, **70% of every input token spent is a static prefix.**

---

## 2. Every LLM call site, with trigger class

| # | site | taskType | trigger | notes |
|---|---|---|---|---|
| 1 | `src/voyager/ActionAgent.ts:333` | codegen | **per task-step + per retry** | inside `for (attempt ≤ MAX_PARSE_RETRIES=3)` at `:314` |
| 2 | `src/voyager/CriticAgent.ts:250` | critic | **per execution attempt**, only after `runSuccessChecks` returns null (`:200`) | |
| 3 | `src/voyager/CurriculumAgent.ts:412` | curriculum | **per loop cycle** when no queued task | |
| 4 | `src/voyager/CurriculumAgent.ts:589` (`getTaskContext`) | *untagged → chat* | **per LLM task proposal** | |
| 5 | `src/voyager/CurriculumAgent.ts:566` (`generateDynamicQuestions`) | *untagged → chat* | per `buildCurriculumContext` (warm-up gated, ≥15 completed) | |
| 6 | `src/voyager/CurriculumAgent.ts:536` (QA context) | *untagged → chat* | 3× per `buildCurriculumContext` | |
| 7 | `src/voyager/CurriculumAgent.ts:711` (`decomposeTask`) | *untagged → chat* | per player/swarm goal | event |
| 8 | `src/voyager/SkillLibrary.ts:569` | embed | **per retrieval query** | TTL cache |
| 9 | `src/voyager/SkillLibrary.ts:259`, `:586` | embed | per skill save / index backfill | |
| 10 | `src/voyager/CurriculumAgent.ts:605`, `:625` | embed | per QA cache lookup/store | |
| 11 | `src/voyager/PlanLibrary.ts:207` | *untagged → chat* | per plan synthesis | |
| 12 | `src/bot/BotInstance.ts:1235` | chat | **per player chat message** | event — correct |
| 13 | `src/bot/BotInstance.ts:1345` (ambient chat) | *untagged → chat* | **timer**, `scheduleAmbientChat` 10–20 min ×0.3 | fired **0 times** in 16.5 h (no players in radius) — not a cost source today, but it is an unconditional timer |
| 14 | `src/control/CommanderService.ts:874` | *untagged → chat* | per commander parse | event |
| 15 | `src/social/CultureManager.ts:301` | chat | culture tick | |
| 16 | `src/town/ChronicleGenerator.ts:325`, `:345` | chat | `ChronicleScheduler` **timer** | no towns active |
| 17 | `src/town/LlmDesigner.ts:334` | codegen | per town design | no towns active |

**Loop driver:** `VoyagerLoop.scheduleNext()` (`src/voyager/VoyagerLoop.ts:850-864`) re-arms `runOneCycle` every `voyager.taskCooldownMs = 2000` ms per bot. Nothing in `runOneCycle` is gated on world state having changed — a bot with an identical inventory, position and surroundings runs the identical curriculum → codegen → critic sequence again 2 s later.

**Nested retry multiplication** (worst case per logical codegen):

```
VoyagerLoop.ts:1668   maxRetriesPerTask       = 3
  × ActionAgent.ts:314 MAX_PARSE_RETRIES       = 3
    × ModelRouter.ts:25 PER_PROVIDER_RETRIES   = 3  (→ 4 attempts)
      × fallback chain (gemini → anthropic)    = 2
= up to 72 HTTP requests for one task step
```

---

## 3. Retry / fallback amplification — smaller than it looks

- **ModelRouter retries: 482 of 10,000 rows (4.8%).** Each failed attempt is written as its own ledger row (`ModelRouter.ts:428-441`), so failures *are* separately counted. They carry `inputTokens: 0` and mean latency 70 ms — these are fast local rejections, **0 token cost**, but they consume request quota.
- Distribution: **28 bursts**, not evenly spread. Largest runs are 231, 55, 50, 38 consecutive failures — provider outage windows. `BREAKER_THRESHOLD = 5` / `BREAKER_COOLDOWN_MS = 30_000` (`ModelRouter.ts:29-30`) let 231 consecutive attempts through during one window; the breaker resets on a single success, so an intermittently-failing provider never trips it durably.
- **ActionAgent parse retries: 19 of 6,513 (0.3%)** — `parseAttempt` was 2 on 18 calls, 3 on 1. Negligible.
- **Verdict: retry amplification is ~5% of call volume and ~0% of tokens.** It is not the multiplier. The real multiplier is semantic retry (below).

---

## 4. THE dominant driver: a non-terminating failure loop

From the 16.5 h log:

| metric | value |
|---|---|
| `Voyager task evaluated` | 13,763 |
| of which **failed** | **12,943 (94.0%)** |
| `Executing generated code` | 14,512 |
| `Retrying with error feedback` | **6,805** |
| `Abandoning task: same error appeared twice` | 2,804 |
| `Task failed after max retries` | 975 |
| `Reusing saved skill` | 8,059 |
| `Using action template` | 1 |
| fresh-codegen chosen at the top of `executeTaskStep` | **~0** |

**Every one of the 6,496 `Code generated by ActionAgent` events came from the retry path at `VoyagerLoop.ts:1878`, not the first-pass path at `:1629`.** The skill library wins the `useDirectSkill` decision essentially 100% of the time (`VoyagerLoop.ts:1588-1600`), the cached skill then fails the critic ~94% of the time, and each failure buys 1 critic call + 1 codegen call.

Per-task pass rates (log):

| task | evaluations | critic pass rate | codegen calls |
|---|---|---|---|
| Mine 1 oak log | 4,357 | **2%** | 2,310 |
| Craft 1 oak planks | 2,191 | **1%** | 414 |
| Walk to the nearest shore or land — in water | 775 | 10% | 464 |
| Flee from nearby hostile mobs | 635 | 9% | 316 |
| Find and eat food urgently — health is critical | 446 | 11% | 280 |
| Craft 4 sticks | 257 | **0%** | 95 |

**97% of codegen calls are for a task description already attempted before. 82% are for a task attempted ≥10 times.** 602 unique task strings consumed 6,513 codegen calls — **10.8 codegen calls per distinct task.**

### Root cause: failures never reach `BlockerMemory`

`hasStrongBlocker` (`src/voyager/BlockerMemory.ts:50`) requires `count >= 2`. It fired **0 times** in 16.5 h (`grep -c "strong blocker (count>=2)"` = 0). `data/blockers.json` holds **31 records, every one with `count: 1`**, against 12,943 recorded failures. Three compounding reasons:

1. `recordTaskFailure` is only called after the retry loop is exhausted (`VoyagerLoop.ts:1907`). The two early exits — abandon-on-duplicate-error (2,804 hits) and `ErrorRecovery.replaceTask` — `return false` **without recording a blocker**. 2,804 abandons vs 975 recorded failures: **74% of failures are invisible to the blocker memory.**
2. Records are keyed on `(task, blocker-class)` (`BlockerMemory.ts:30`). The class is re-derived from the error text each time, so alternating classifications (`general` / `materials`) split the count across rows and neither reaches 2.
3. `clearTask` on success (`VoyagerLoop.ts:1766`) wipes the count entirely — a 2% pass rate is enough to reset the counter indefinitely.

Downstream: `proposeStaticTask` only excludes `this.failedTasks.slice(-5)` (`CurriculumAgent.ts:334`), and `data/failed_tasks.json` holds only 32 entries. Nothing in the system can retire a doomed task.

---

## 5. Calls that should be pure code

**5a. Critic no-op guard — 58% of critic LLM calls.**
`runSuccessChecks` already resolves 8,048 of 11,103 critic decisions programmatically (72%). Of the 3,057 that escalate to the LLM, **1,781 (58%) are decided purely on "position unchanged" and/or "inventory delta: none"** — and 1,775 of those 1,781 (99.7%) come back `false`. Both signals are computed *before* the call, at `CriticAgent.ts:228-229`:

```ts
const inventoryDelta = this.formatInventoryDelta(preState.inventory, postState.inventory);
const distanceMoved  = preState.position.distanceTo(postState.position);
```

A guard — no inventory delta, no movement, no health/hunger/oxygen change ⇒ auto-fail — is deterministic and removes those calls outright.

**5b. Curriculum answers computed, then discarded.**
`proposeLLMTask` calls the LLM at `CurriculumAgent.ts:412`, and only *afterwards* runs the pure-code validators `isTaskFeasible` / `taskMatchesProgression` / `hasStrongBlocker` / `isOnCooldown` (`:445-455`), falling back to `proposeStaticTask` when they reject. Log counts: **252** infeasible + **5** on cooldown + **206** hard failures = **463 curriculum calls whose answer was thrown away** (~19% of curriculum volume). Running the validators first (to constrain the candidate set, or to skip the call entirely) reclaims all of it.

**5c. Chat-bucket calls are template-fillable.**
`getTaskContext` (`CurriculumAgent.ts:589`, ~295 input tokens, fires once per LLM proposal) asks the model "How to \<task\> given this inventory / world memory / blockers". For the top-30 task families this is a static recipe lookup. `data/qa_cache.json` is 3.3 KB and **fails to parse** (`Extra data: line 11 column 4`) — the cache that should be absorbing these is corrupt, so every lookup misses.

---

## 6. Near-identical prompts sent repeatedly

- **The 3,492-token `ACTION_SYSTEM_PROMPT` is byte-identical on 100.0% of 6,513 codegen calls** (`systemPromptChars` had exactly one distinct value: 13,968). Same for critic (977 tok × 1,774) and curriculum (306 tok × 1,064). **15.0 M of 21.5 M input tokens (70%) are re-sent constants.**
- `GeminiClient.ts:27` and `:79` do place it in `systemInstruction`, which is the right position for implicit prefix caching, but `GeminiClient.ts:52-56` reads only `usageMetadata.promptTokenCount` and never `cachedContentTokenCount` — **we have no evidence caching is being hit, and no instrumentation to tell.**
- Beyond the system prompt, the *user* messages repeat too: 2,310 codegen calls carried the identical task string "Mine 1 oak log" against a near-identical observation, differing only in coordinates and a retry critique.

---

## 7. Skill-library duplicate explosion (feeds 1, 4 and 6)

`skills/` holds **934 `.js` files**; `skills/index.json` is **2.8 MB / 518 indexed entries** across only **269 distinct base names**:

| skill family | saved versions |
|---|---|
| `walk_to_the_nearest_shore` | **70** |
| `mine_1_oak_log` | **33** |
| `seek_shelter_urgently_rainy_night` | 26 |
| `towntownmph4x8tze3237864_needs_32_more_wood` | 21 |
| `towntownmph4x8tze3237864_needs_8_more_food` | 15 |
| `mine_the_new_ironingot_deposit` | 14 |

Each rare critic pass writes a new `_vN` skill (`VoyagerLoop.ts:1757`) for a family that fails 90–98% of the time. Consequences: (a) `getBestMatch` (`VoyagerLoop.ts:1588`) keeps selecting a bad version, guaranteeing the reuse→fail→regenerate cycle; (b) `buildSkillSummary()` over 518 entries is interpolated into the curriculum prompt at `CurriculumAgent.ts:402`, which is the bulk of curriculum's 1,773-token user message; (c) 518 embeddings loaded and matched per query.

The `towntown...` family names also reveal town-generated task strings carrying a raw town ID, so each town target ("needs 32 more wood") mints a permanently unique task string that can never match an existing skill.

---

## 8. Ranked findings with estimated reduction

Reductions are stated against the **7.3 h / 10,000-call sample**, with the 24 h figure in brackets.

| # | Finding | file:line | Calls removed | Input tokens removed |
|---|---|---|---|---|
| **F1** | **Non-terminating failure loop.** 94% critic-fail rate; 10.8 codegen calls per distinct task; blocker memory never trips because 74% of failures exit before `recordTaskFailure`. Capping any task description at 3 lifetime attempts (record blockers on *all* exit paths incl. `VoyagerLoop.ts:1846` abandon; key blockers on task only, not `(task, class)`; stop `clearTask` from zeroing a long history) collapses 6,513 codegen → ~1,806, and critic/curriculum/embed scale with it. | `VoyagerLoop.ts:1846`, `:1907`, `:1766`; `BlockerMemory.ts:30`, `:50`; `CurriculumAgent.ts:334` | **~5,500 (55%)** [~18,100/day] | **~14.0 M (65%)** [~46 M/day] |
| **F2** | **70% of all input tokens are a re-sent static prefix.** 3,492-tok `ACTION_SYSTEM_PROMPT` × 3,708 + 977-tok critic × 1,774 + 306-tok curriculum × 1,064. Add explicit prompt caching (Gemini context cache / Anthropic `cache_control`) and instrument `cachedContentTokenCount`. Reduces *tokens only*, not call count — and stacks multiplicatively with F1. | `ActionAgent.ts:23`, `CriticAgent.ts:16`, `CurriculumAgent.ts:25`, `GeminiClient.ts:52-56` | 0 | **~15.0 M billed (70%)** [~49 M/day] |
| **F3** | **Critic no-op guard.** 1,781 of 3,057 LLM critic calls (58%) decide on `distanceMoved == 0` + `inventoryDelta == none`, already computed two lines above the call. 99.7% return `false`. | `CriticAgent.ts:200`, `:228-229`, `:250` | **~1,030 (10.3%)** [~3,390/day] | ~1.30 M (6.0%) [~4.3 M/day] |
| **F4** | **Redundant embedding retrievals.** 2,243 embed calls = 22.4% of request volume for 0.2% of tokens. Per task step: `VoyagerLoop.ts:1588-1589` runs `getBestMatch` + `getComposableMatches`, then `ActionAgent.ts:296-306` re-runs `buildSkillSummary` + `getTopKSkillCode` + `getComposableMatches` — 5 retrievals for 2 near-identical queries, and the ActionAgent query is chatlog-enriched on retries (`ActionAgent.ts:288-290`) which busts the TTL cache every time. Pass the loop's results into `generateCode` instead of re-retrieving. | `VoyagerLoop.ts:1588`, `ActionAgent.ts:288-306`, `SkillLibrary.ts:569` | **~1,350 (13.5%)** [~4,440/day] | ~0.03 M (0.1%) |
| **F5** | **Curriculum answers discarded post-hoc.** 463 of ~2,425 logged proposals (19%) are LLM-answered then rejected by pure-code validators. Run validators first. Plus: `data/qa_cache.json` is corrupt (`Extra data: line 11 col 4`) so `getTaskContext`'s cache never hits. | `CurriculumAgent.ts:412`, `:445-455`, `:589`, `:605` | **~400 (4.0%)** [~1,320/day] | ~0.45 M (2.1%) |
| **F6** | **Skill duplicate explosion.** 934 files / 518 indexed / 269 base names; 70× `walk_to_the_nearest_shore`, 33× `mine_1_oak_log`. Bloats `buildSkillSummary` in the curriculum prompt (`CurriculumAgent.ts:402`) and keeps `getBestMatch` selecting failing versions. Dedupe by base name keeping the highest-quality version; stop minting town task strings containing raw town IDs. | `VoyagerLoop.ts:1757`, `CurriculumAgent.ts:402`, `SkillLibrary` index | small (feeds F1) | ~0.9 M (4.2%) on curriculum |
| **F7** | **Retry/breaker amplification.** 482 rows (4.8%) are ModelRouter retry attempts, in 28 bursts (largest 231 consecutive). Zero token cost but real quota cost. `BREAKER_THRESHOLD=5` resets on any single success, so an intermittent provider never trips it durably. | `ModelRouter.ts:25`, `:29-30`, `:428-441`, `:499-509` | **~350 (3.5%)** [~1,150/day] | 0 |
| **F8** | **Instrumentation is wrong, which is why this took a log dive.** (a) `botName` empty on 88% of rows — `byBot` is `{}`; `ActionAgent.ts:333` / `CriticAgent.ts:250` / `CurriculumAgent.ts:412` never pass it. (b) 7 call sites omit `taskType` and silently land in the `chat` bucket via `options?.taskType ?? 'chat'` — the 1,211 "chat" calls are almost entirely curriculum-side QA, not player conversation (`Ambient chat` fired **0** times in 16.5 h). (c) `MAX_RECORDS=10000` hides the true 33k/day rate. (d) no call-site field at all. | `ModelRouter.ts:321-325`; `CurriculumAgent.ts:536,566,589,711`; `PlanLibrary.ts:207`; `BotInstance.ts:1345`; `CommanderService.ts:874`; `TokenLedger.ts:8` | 0 | 0 |
| **F9** | **Unconditional 2 s loop.** `scheduleNext` re-arms `runOneCycle` every `taskCooldownMs=2000` per bot with no state-change gate; identical inventory + position + surroundings replays the full curriculum→codegen→critic sequence. Mostly masked today because execution blocks for seconds, but it is the mechanism that lets F1 spin. Raising `taskCooldownMs` is the crude lever; a world-state-hash gate is the correct one. | `VoyagerLoop.ts:850-864`, `config.yml:72` | linear in cooldown | linear |

### Stacked estimate

Applying F1 → F3 → F4 → F5 → F7 in sequence (each on the survivors of the last):

| | now (7.3 h) | after | reduction | per day |
|---|---|---|---|---|
| calls | 10,000 | **~3,400** | **−66%** | 32,900 → ~11,200 |
| input tokens (raw) | 21.5 M | **~6.6 M** | **−69%** | 70.7 M → ~21.7 M |
| input tokens (raw + F2 caching) | 21.5 M | **~2.9 M billed** | **−86%** | 70.7 M → ~9.6 M |

Order of work by impact-per-effort: **F3** (smallest change, ~10% of calls, hours of work) → **F1** (largest single win, ~55% of calls) → **F2** (largest token win, no behavior change) → **F4** → **F5/F6** → **F8** (do this first anyway; without per-bot and per-call-site attribution the next audit costs the same log dive).

### Caveat

F1's 55% is the fleet ceasing to burn calls on tasks it cannot complete. It does **not** by itself make the bots succeed — the underlying reason "Mine 1 oak log" fails 98% of the time (bots at y=16–61 around x≈0–25, z≈−192 to −3, with critic reasons "Could not find oak_log even after exploring", "Execution timed out", and repeated drowning/shore tasks) is a **world/placement problem on the fresh 10.80.13.14 server**, not an LLM problem. Fixing spawn placement would independently raise the pass rate and cut calls further; the failure-loop cap is the guard that stops cost scaling with world quality.
