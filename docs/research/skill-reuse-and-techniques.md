# Reducing LLM call volume in mc-fleet-bot

Analysis only — no code was changed.

Evidence base: `/var/log/mc-fleet-bot.log` (126 MB), window **2026-07-24 01:54:28 → 18:27:06 = 16.54 h**,
7 process restarts, plus `skills/index.json` (518 rows) and `skills/*.js` (934 files).
Per-day figures below scale the observed window by **×1.451**.

---

# PART A — Skill reuse

## A0. Headline

**Skill retrieval is not failing to return a match. It returns a match ~100% of the time — and the match
is usually the wrong skill.** A single skill, `walk_to_the_nearest_shore`, ranks #1 for essentially every
query in the library with a lexical score of **0.0** and a semantic score of **0.0**, purely because an
unbounded popularity term contributes **+261** to its score while the maximum possible contribution from
all content-similarity signals combined is **+55**.

The wrong skill executes, fails, and the retry path calls the code generator. **Every single codegen call
in the observed window was a retry** — 6,507 of them, **9,442/day**. That is the ~10k/day figure. It is
essentially all attributable to mis-retrieval.

Corroborating detail: the fleet is hitting Gemini's free-tier ceiling. The log contains repeated
`429 RESOURCE_EXHAUSTED … limit: 10000, model: gemini-2.5-flash`, i.e. the daily quota is being fully
consumed by regeneration.

## A1. Measured pipeline

| Metric | Observed (16.54 h) | Per day |
|---|---:|---:|
| `Voyager task proposed` | 8,073 | 11,715 |
| First attempts served from the skill library | 8,069 (**99.95%**) | 11,709 |
| First attempts served by action templates | 1 | 1 |
| Tasks where the reused skill **failed** | 3,136 (**38.8%**) | 4,551 |
| **Codegen LLM calls (100% on retries)** | **6,507** | **9,442** |
| Codegen calls per failing task | 2.07 | — |
| Skills successfully saved | 325 | 472 |
| Skill saves **rejected — library full** | 495 | 718 |
| Name collisions → `_vN` | 185 | 268 |

The chain is: `11,715 tasks/day → all served from the library → 38.8% retrieve a skill that fails →
×2.07 codegen retries each → 9,442 codegen calls/day`.

## A2. Duplicate-skill census

934 `.js` files; `index.json` holds 518 rows (500 active + 18 deprecated). **442 files (47%) are orphans**
— present on disk, absent from the index, therefore permanently unreachable.

Normalising version suffixes and embedded integers gives **350 semantic families for 500 active entries**.
Distribution is extremely skewed:

| Family (numbers normalised) | Files |
|---|---:|
| `walk_to_the_nearest_shore` | 74 |
| `explore_west_for_N_blocks` | 61 |
| `explore_east_for_N_blocks` | 61 |
| `explore_north_for_N_blocks` | 58 |
| `seek_shelter_urgently_rainy_night` | 45 |
| `explore_south_for_N_blocks` | 40 |
| `mine_N_oak_log` | 36 |
| `towntown…_needs_N_more_wood` | 34 |
| `towntown…_needs_N_more_food` | 25 |
| `mine_the_new_ironingot_deposit` | 17 |

**246 of the 500 active entries (49%) are `_vN` duplicates.** MD5 comparison confirms the version bodies
are genuinely different code (`mine_1_oak_log_v33/v34/v35` all differ), so this is real LLM regeneration,
not repeated saves of identical text.

## A3. Retrieval mechanism

Retrieval is a **hybrid** score, not pure embeddings, computed in
`SkillLibrary.searchWithScores()` — `src/voyager/SkillLibrary.ts:136-209`:

- keyword/name/description lexical matching (lines 168-191), unbounded, realistically ≤ ~60
- exact-description bonus `+12` (line 192)
- TF-IDF sparse cosine `× 20` (lines 193-194)
- **dense embedding cosine `× 25`** (lines 195-197) — Voyage embeddings, so semantic retrieval *is* wired up
- Laplace quality `× 10` (line 198)
- **popularity `successCount × 0.5` (line 199) and `failureCount × 1.5` (line 200) — both unbounded**

`getBestMatch()` (line 358) takes only the top-1 result and requires `score ≥ 16`.
`VoyagerLoop.ts:1600` accepts it when `composableSkills.length <= 1 || score >= 24`.

Both thresholds are trivially cleared by the popularity term alone, so the gate never protects anything.

## A4. Defects

### D1 — Unbounded popularity term dominates ranking (root cause)
`src/voyager/SkillLibrary.ts:199-200`

```js
score += (entry.successCount ?? 0) * 0.5;
score -= (entry.failureCount ?? 0) * 1.5;
```

`walk_to_the_nearest_shore` has 5,025 successes / 1,499 failures →
`5025×0.5 − 1499×1.5 = +261`. Maximum possible content signal is TF-IDF 20 + embedding 25 + quality 10
= **55**. Popularity outweighs all semantics by ~4×, and it is unbounded, so the gap widens forever.

Replaying the real `index.json` through the exact scoring function:

| Query | Rank 1 returned | its lex / sem / popularity | Correct skill | its rank |
|---|---|---|---|---:|
| `mine 1 oak log` | `walk_to_the_nearest_shore` | 0.0 / 0.0 / **+261** | `mine_1_oak_log` | **38** |
| `craft a wooden pickaxe` | `walk_to_the_nearest_shore` | 0.0 / 0.0 / **+261** | `craft_a_stone_pickaxe` | 11 |
| `seek shelter urgently rainy night` | `walk_to_the_nearest_shore` | 0.0 / 0.0 / **+261** | `seek_shelter_urgently_rainy_night_v15` | 3 |
| `explore west for 65 blocks` | `walk_to_the_nearest_shore` | 0.0 / 0.0 / **+261** | `explore_west_for_50_blocks` | 3 |
| `mine the new iron_ingot deposit` | `walk_to_the_nearest_shore` | 7.0 / 1.0 / **+261** | `mine_the_new_ironingot_deposit_v11` | 3 |

Rank 1 with **zero content match** on four of five queries.

This is visible in production. Retrieval collapses onto two skills — the two with the highest
success counts:

| Retrieved skill | Reuses | Led to codegen retry | Fail % |
|---|---:|---:|---:|
| `obtain_oakplanks` | 3,673 | 1,342 | 36.5% |
| `walk_to_the_nearest_shore` | 1,478 | 614 | 41.5% |
| *(next 10 combined)* | ~1,450 | ~600 | ~41% |
| **All** | **8,088** | **3,136** | **38.8%** |

**5,151 of 8,088 retrievals (63.7%) return one of just two skills.**

### D2 — Success credited to the base name, failure to the actual name (the ratchet that built D1)
`src/voyager/VoyagerLoop.ts:1757` / `:1764` vs `:1796`

`SkillLibrary.save()` resolves a name collision by inventing `name_vN`
(`SkillLibrary.ts:246-251`) but **returns `boolean` and discards `finalName`**. The caller then does:

```js
// VoyagerLoop.ts:1757  — may actually have saved as "walk_to_the_nearest_shore_v71"
await this.skillLibrary.save(skillName, task.description, task.keywords, generated.functionCode, quality);
// VoyagerLoop.ts:1764  — credits the BASE name, unconditionally
this.skillLibrary.recordOutcome(skillName, true);
```

But the failure path uses the *actual retrieved* name:

```js
// VoyagerLoop.ts:1796
this.skillLibrary.recordOutcome(bestSkill.name, false);   // may be "..._v71"
```

Measured consequence on the live index:

- **All 246 versioned entries have `successCount` exactly 0. Total: 0.**
- Those same 246 versioned entries carry **5,688 failures**.
- All **10,407 successes** accrued to the 254 base-name entries.
- Net score contribution of the entire versioned corpus: **−8,532**.

So a `_vN` skill can *only* lose points and a base-name skill can *only* gain them. This is a perfect
rich-get-richer ratchet, and it is precisely what manufactured D1's +261 monster. Fixing D1's weighting
without fixing D2 will let a new monster grow.

### D3 — Stopword leak lets the monster into every candidate set
`src/voyager/SkillLibrary.ts:69`, `:138`, `:154`, `:482-483`

`KEYWORD_MIN_LEN = 3` and `w.length > 2` admit `the`, `and`, `for`, `new`, `get`.
`walk_to_the_nearest_shore` contains **`the` in its own name**, so `entryMatchesAnyToken()` matches it for
almost any task description, defeating the pre-filter that was supposed to keep irrelevant skills out.
It then also collects `+4` (exact word in name, line 175) and `+3` (exact word in description, line 180)
from the stopword itself. Confirmed live: task *"Mine the new iron_ingot deposit"* retrieved
`walk_to_the_nearest_shore` at score **716**.

### D4 — The library is full; learning has stopped
`config.yml:92` (`maxSkills: 500`), `src/voyager/SkillLibrary.ts:237`

```js
if (this.index.length >= this.maxSkills) { logger.warn(...); return false; }
```

The active index is **exactly 500**. In the window, **495 saves were rejected vs 325 accepted — 60% of
everything the fleet learned was thrown away.** There is **no eviction policy at all**, so the 246
zero-success `_vN` duplicates permanently squat on 49% of the cap. Any task without an existing skill can
therefore *never* acquire one, and regenerates forever.

### D5 — The exact-match bonus is dead code
`src/voyager/SkillLibrary.ts:192` vs `src/voyager/VoyagerLoop.ts:1587`

```js
if (entry.description.toLowerCase() === lower.trim()) score += 12;   // SkillLibrary.ts:192
```
`lower` is the whole query, which the caller builds as
`task.keywords.join(' ') + ' ' + task.description` (VoyagerLoop.ts:1587). It therefore *never* equals a
bare description. The single strongest exact-match signal available never fires.

### D6 — Cross-worker index races produce orphans
`src/voyager/SkillLibrary.ts:430-447`

Each bot worker builds its own `SkillLibrary` over the shared `skills/` dir, and `saveIndex()` rewrites
the entire file from its own in-memory copy. Last writer wins, so concurrent bots silently drop each
other's rows. Result: **442 of 934 `.js` files (47%) exist on disk but not in the index** — invisible to
retrieval, and the work that produced them is lost.

### D7 — Retry amplification, and retrying the wrong category of failure
`config.yml` `maxRetriesPerTask: 3`; `src/voyager/VoyagerLoop.ts:1878`

Each mis-retrieval costs up to two codegen calls; measured amplification is **2.07 calls per failing task**.

Worse, a large share of failures are **environmental, not code defects**. The log contains **11,336**
`please explore first` traces, of which **11,119 are `No oak_log nearby`**. Regenerating JavaScript cannot
make an oak log appear. Every one of those retries is a wasted frontier-model call.

## A5. What fixing retrieval is worth

Baseline: **9,442 codegen calls/day**, ~100% of LLM spend.

| Scenario | Fixes | Reuse-failure rate | Codegen/day | Saved/day |
|---|---|---:|---:|---:|
| Baseline | — | 38.8% | 9,442 | — |
| Conservative *(est.)* | D1, D2, D3 | ~27% | ~6,480 | **~2,960 (−31%)** |
| Central *(est.)* | D1, D2, D3, D5 | ~20% | ~4,860 | **~4,580 (−48%)** |
| Full *(est.)* | + D4 (cap/eviction), D6, D7 (precondition gate) | ~10-12% | ~2,600 | **~6,850 (−73%)** |

Method: the failure→codegen amplification (2.07) and task volume (11,715/day) are **measured**; the
post-fix reuse-failure rates are **estimates**, anchored on the observation that 63.7% of retrievals go to
two skills that the scoring replay shows win with ~zero content match. The conservative band assumes only
half of those mis-retrievals convert to correct ones.

The **D7 precondition gate is the cheapest single win**: refusing to spend a codegen call when the failure
reason is `No <block> nearby` (and instead queueing an explore/prerequisite task) directly targets the
11,119 occurrences that dominate the failure log.

## A6. Proposed fix

Ordered by leverage-to-effort. All are small, local changes.

**1. Bound the popularity term (D1).** `SkillLibrary.ts:199-200` — replace the two unbounded additive
terms with a bounded multiplier, so content decides *which* skill and reputation only breaks ties:

```js
// was: score += successCount*0.5; score -= failureCount*1.5;
const trials = (entry.successCount ?? 0) + (entry.failureCount ?? 0);
const confidence = Math.min(1, Math.log1p(trials) / Math.log(21));   // saturates ~20 trials
score *= 0.75 + 0.5 * this.getQuality(entry) * confidence;           // multiplier in [0.75, 1.25]
```
Then raise `getBestMatch`'s floor (line 360) to a *content-only* threshold computed before the multiplier,
so a skill can never qualify on reputation alone.

**2. Return and use the real saved name (D2).** Change `save()` (`SkillLibrary.ts:236`) to return
`string | null` (the `finalName`), and at `VoyagerLoop.ts:1757-1764` record the outcome against that
returned name. This alone stops new monsters forming. Consider a one-off migration to redistribute the
existing base-name counts across their families, or simply reset all counts — the current numbers are
corrupt.

**3. Add a stopword list (D3).** `SkillLibrary.ts:69` — filter `the, and, for, with, from, new, get, all,
its, out, use, are, was` out of `queryWords` (line 138) and out of the prefilter token set (line 154),
independently of length. Cheap, and immediately stops name-embedded stopwords acting as wildcards.

**4. Fix the exact-match bonus (D5).** Either compare against `task.description` passed separately, or
normalise both sides before comparison at `SkillLibrary.ts:192`.

**5. Deduplicate and add eviction (D4).** Collapse the 350 families: keep the best-scoring member of each,
mark the rest `deprecated` (the field already exists, `SkillLibrary.ts:21`, and there is already a
migration precedent in `tools/consolidate-explore-skills.js`). Then replace the hard `return false` at
`SkillLibrary.ts:237` with eviction of the lowest-quality / least-recently-used entry. Also
**parameterise** the `explore_<dir>_for_N_blocks` (220 files) and `mine_N_<log>` families into single
skills taking arguments — that is the Voyager premise and it removes ~40% of the corpus outright.

**6. Serialise index writes (D6).** Route `saveIndex()` through a single owner (the main thread already
has worker IPC in `src/worker/`) or re-read-merge-write under a lock. Then re-import the 442 orphan files
or delete them.

**7. Gate codegen on preconditions (D7).** Before the retry at `VoyagerLoop.ts:1878`, if the critic reason
matches `No <resource> nearby`, skip codegen and queue an explore/gather prerequisite instead — the
`resolvePrerequisites` machinery already exists at `VoyagerLoop.ts:1820`.

---

# PART B — External techniques

## B0. What this codebase actually has today (verified)

Important corrections to the working assumptions, because they change which techniques apply:

| Capability | Status in repo | Note |
|---|---|---|
| Active provider | **`gemini` / `gemini-2.5-flash`** (`config.yml` `llm.provider`) | Not Anthropic. |
| Anthropic prompt caching | Implemented — `src/ai/AnthropicClient.ts:40-51` (`cache_control: ephemeral`, ~4096-char floor) | **Inert**, because Anthropic is not the active provider. |
| Gemini caching | **Absent** — zero cache references in `src/ai/GeminiClient.ts` | The fleet currently gets **no prompt caching at all**. |
| Codegen system prompt | `ACTION_SYSTEM_PROMPT` ≈ **14,036 chars / ~3,500 tokens**, `src/voyager/ActionAgent.ts:23` | Stable prefix, comfortably over the 1,024-token cache minimum. |
| Codegen output cap | `codeGenMaxTokens: 16384` (`config.yml`) | Output-heavy; caching helps input only. |
| Concurrency | `maxConcurrentRequests: 1` | Serialised — batching would need restructuring. |
| Embeddings | VoyageAI — `src/ai/VoyageAIClient.ts`; skill embeddings present on all 500 active entries | Semantic retrieval already wired, just outvoted (see D1). |
| Ollama | Client exists (`src/ai/OllamaClient.ts`) but **not configured** in `config.yml` | Local-model routing is one config change away. |
| Semantic Q&A cache | `data/qa_cache.json` — **11 entries**; `qa_embeddings.json` 51 KB | Infrastructure exists but is effectively unused, and covers chat Q&A only — **not codegen**. |
| Per-task routing | `ModelRouter` / `ProviderRegistry`, task types `codegen \| curriculum \| critic \| chat \| embed` (`src/ai/TaskType.ts:5`) | Routing hooks already in place for cheap-model cascades. |
| Cost tracking | `TokenLedger`, daily budget cap | Measurement already available. |

Two consequences worth flagging before any technique is chosen:

1. **Prompt caching is currently worth zero on this deployment.** The cache implementation sits behind a
   provider that is not in use. Wiring Gemini context caching (or switching codegen to Anthropic) is a
   prerequisite for any caching-based saving.
2. **Caching reduces cost per call; it does not reduce call count.** Part A's defects are a *call-count*
   problem — 9,442 avoidable codegen calls/day. Since the fleet is hitting a hard **request/day quota**
   (`limit: 10000, model: gemini-2.5-flash`), not a token budget, caching alone cannot unblock it.
   Part A's fixes are strictly higher priority than anything in this section.

## B1. Ranked techniques

Provenance labels: **MEASURED** = from a paper/benchmark/first-party engineering measurement.
**VENDOR** = marketing claim, no published methodology. **ESTIMATE** = extrapolation, labelled as such.
**UNVERIFIED** = widely circulated but not traceable to a primary source; not cited as fact.

Ranking is by value **to this codebase**, which is not the same as generic value — see the applicability
column. Anchor for scale: Voyager's own FAQ reports **~$50 for ~160 iterations** on GPT-4
(~$0.31/iteration, MEASURED, first-party).

| # | Technique | Expected savings (provenance) | Impl. cost | Applicability **here** | Source |
|---|---|---|---|---|---|
| 1 | **Fix skill retrieval so it fires before codegen** | Voyager w/o skill library reaches diamond in **0/3 runs vs 1/3**, and needs 29±11 vs 21±7 iterations at iron tier (MEASURED, Table 1). Each avoided codegen also avoids up to **4 iterative-prompting rounds + 1 self-verification call** — so one retrieval hit saves up to 5 frontier calls, not 1 (MEASURED) | **Low–Med** | **Highest. This is Part A.** Infrastructure is fully built (`skills/`, `index.json`, Voyage embeddings on all 500 entries); it is outvoted by a scoring bug. Measured local upside: **~2,960–6,850 calls/day** | [arXiv 2305.16291](https://arxiv.org/abs/2305.16291) |
| 2 | **Precondition gate before retry-codegen** | No direct paper; the mechanism is item 11's logic (don't re-invoke the model for a failure the model cannot fix) | **Low** | **Very high, and unique to this repo's data.** 11,119 `No oak_log nearby` failures in 16.5 h are environmental. `resolvePrerequisites` already exists (`VoyagerLoop.ts:1820`) | — (local finding) |
| 3 | **Prompt-cache prefix discipline** | **41–80% cost cut, 13–31% TTFT cut** across Anthropic/OpenAI/Google on a 500+ session agentic benchmark (MEASURED). Naive full-context caching *increased* latency | **Low** | **High — but blocked.** `GeminiClient.ts` has **no caching at all**, so today the saving is 0%. The ~3,500-token `ACTION_SYSTEM_PROMPT` is an ideal stable prefix. Volatile per-tick state (position, health, inventory, time) must move *after* the breakpoint or hit rate is structurally zero | [arXiv 2601.06007](https://arxiv.org/abs/2601.06007) |
| 4 | **Per-task-type routing to cheap models** | RouteLLM: **>85% cost cut on MT-Bench, 45% MMLU, 35% GSM8K at 95% of GPT-4 quality** (MEASURED). FrugalGPT cascades: **up to 98%** matching GPT-4 (MEASURED) | **Low** | **High.** `ModelRouter`/`ProviderRegistry` and the 5 task types already exist (`TaskType.ts:5`); this is config + an eval harness. Route `critic`/`curriculum`/`chat` cheap, keep `codegen` frontier | [arXiv 2406.18665](https://arxiv.org/abs/2406.18665) · [arXiv 2305.05176](https://arxiv.org/abs/2305.05176) |
| 5 | **Exact-hash cache + in-flight coalescing (single-flight)** | 100% saving on true duplicates, **zero correctness risk** (ESTIMATE — magnitude depends on duplicate rate) | **Low** | **High.** A fleet of same-personality bots proposing near-identical tasks on the same tick is the ideal case; `maxConcurrentRequests: 1` means duplicates queue up rather than racing. A promise map keyed by prompt hash | [single-flight writeup](https://dev.to/mukundakatta/single-flight-llm-calls-coalesce-50-concurrent-identical-requests-into-one-api-call-4dk0) |
| 6 | **Deduplicate + parameterise the skill corpus** | AWM: WebArena success **+51.1% relative**, steps/example **7.9 → 5.9** (MEASURED). Affordable Generative Agents: 25-agent town **25.41M → 10.86M tokens (~57%)** (MEASURED) | **Med** | **High.** 220 `explore_<dir>_for_N_blocks` files collapse to one parameterised skill; 350 families for 500 slots. Also unblocks D4 (library full). `deprecated` flag + `tools/consolidate-explore-skills.js` precedent already exist | [arXiv 2409.07429](https://arxiv.org/html/2409.07429) · [arXiv 2402.02053](https://arxiv.org/html/2402.02053) |
| 7 | **Trajectory / context pruning (AgentDiet-style)** | **39.9–59.7% input-token reduction, 21.1–35.9% total cost reduction**, performance maintained (MEASURED) | **Med** | **Medium.** Helps cost-per-call, not call count — and this fleet is capped on **requests/day**, not tokens. Worth doing after the quota pressure is relieved | [arXiv 2509.23586](https://arxiv.org/abs/2509.23586) |
| 8 | **Batch API for deferrable work** | Flat **50% off input and output** (Anthropic/OpenAI/Gemini, MEASURED first-party pricing). Stacks with caching | **Med** | **Medium.** Chronicle, journals, reflections, embeddings are genuinely deferrable. But batch requests still consume request quota, and `maxConcurrentRequests: 1` means the loop is not structured for it | [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| 9 | **Structured outputs / constrained decoding** | Constrained decoding eliminated malformed-JSON failures that were **39% of errors** in prompt-mode experiments (MEASURED) | **Low** | **Medium.** The repo already shows this failure class — `codeGenMaxTokens` was doubled to 16384 because reasoning+code truncated mid-function. Every eliminated retry is a whole duplicate call | [arXiv 2501.10868](https://arxiv.org/html/2501.10868v1) |
| 10 | **Event-driven wake instead of polling ticks** | **$0.08 per 24-hour cycle** over 30+ day deployments, **up to 73% lower per-call token overhead** (MEASURED). A quoted "10–20× vs polling" is **UNVERIFIED** | **Med** | **Medium.** 11,715 task proposals/day at `taskCooldownMs: 2000` is a polling loop. Real upside, but a structural change | [arXiv 2604.05854](https://arxiv.org/abs/2604.05854) |
| 11 | **Server-side context editing** (`clear_tool_uses_*`) | No published %; the API returns exact `cleared_input_tokens` so it self-measures. **Caveat: clearing invalidates the cached prefix** — use `clear_at_least` | **Low** | **Low — not applicable today.** Anthropic-only, and this fleet runs Gemini | [context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) |
| 12 | **Effort / thinking-budget control** | Opus 4.5 at medium effort matched Sonnet 4.5's best SWE-bench Verified using **76% fewer output tokens**; at max effort +4.3pp at **48% fewer tokens** (MEASURED, Anthropic) | **Low** | **Low — not applicable today.** Anthropic-only. Becomes item-1-tier if codegen moves to Anthropic. Note: changing effort mid-conversation invalidates the cache | [effort](https://platform.claude.com/docs/en/build-with-claude/effort) |
| 13 | **Tool-schema slimming / tool search** | Tool Search Tool: **~77K → ~8.7K tokens (85%)**, MCP-eval accuracy *rose* 79.5%→88.1%. Programmatic tool calling: **43,588 → 27,297 tokens (37%)** (MEASURED, Anthropic internal) | **Low–Med** | **Low.** This agent uses generated JS against injected primitives, not a large tool-schema payload. The analogous local win is not injecting `getAllSkillCode()` (9.2 MB corpus) wholesale | [advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) |
| 14 | **Prompt compression (LLMLingua-2)** | **2–5× compression**, **1.6–2.9× latency reduction** (MEASURED). LLMLingua-1: up to **20× at ~1.5% performance loss** (MEASURED/repo-claimed) | **Med** | **Low.** Ollama makes the compressor free to run, but the risk is silently dropping load-bearing world state — exactly the coordinates and block names this agent's failures already hinge on | [arXiv 2403.12968](https://arxiv.org/abs/2403.12968) |
| 15 | **Semantic (embedding) cache** | Chatbot: **61.6–68.8% hit rate at 92.5–97.3% accuracy** (MEASURED). **But on agents it collapses:** GPTCache **37.9% accuracy**; agentic plan caching **0–12% hit rates** (MEASURED) | **Med** | **Do not deploy on the action loop.** See warning below | [arXiv 2602.18922](https://arxiv.org/html/2602.18922) · [arXiv 2411.05276](https://arxiv.org/html/2411.05276v3) |
| 16 | **Distilling frontier traces into a local 7–8B model** | Strong in narrow verifiable domains (distilled 7B: AIME **55.5% vs GPT-4o 9.3%**, MEASURED). Bedrock Distillation: **up to 75% cheaper, <2% accuracy loss** (VENDOR). **But it was tried on Minecraft codegen and failed** | **High** | **Do not attempt for codegen.** See warning below | [arXiv 2501.12948](https://arxiv.org/html/2501.12948v1) · [arXiv 2411.12977](https://arxiv.org/html/2411.12977) |

## B2. Notes that change the decisions

### Prompt caching is a layout problem, and here it is currently worth exactly zero

The economics are unambiguous: Anthropic 5-minute cache writes cost **1.25×** base input, 1-hour writes
**2×**, reads **0.1×** — so caching pays for itself after *one* read on the 5-min TTL. Gemini gives
**90% off** cached tokens on 2.5-and-later models with implicit caching on by default; OpenAI applies
**90% off** automatically above a 1,024-token prefix.

None of that reaches this deployment. `src/ai/GeminiClient.ts` contains **no caching code**, and the
`cache_control` implementation in `AnthropicClient.ts:40-51` sits behind a provider that is not active.

Minimum cacheable lengths are a live trap for a routing plan: **512 tokens** (Opus 5), **1,024**
(Sonnet 5/4.6, Opus 4.8), **4,096** (Haiku 4.5, Opus 4.5/4.6). Routing the critic to Haiku with a
sub-4K prompt means it **cannot be cached at all — silently, with no error.**

Field data shows the spread is enormous for identical prompts: **7% vs 74%** hit rates across
deployments, and **39.7% on Bedrock vs 77.1% on the direct Anthropic API** for the same agent. For a
Minecraft bot the cause is obvious — position, health, inventory, time-of-day and nearby-entity lists
change every tick. **Any of those ahead of the breakpoint forces a 0% hit rate.**

**Do this first regardless:** instrument `cache_read_input_tokens` / `cache_creation_input_tokens` per
task type in the existing `TokenLedger`. That ratio decides whether items 3, 7 and 11 are worth a week
or worth nothing.

### Caching cannot fix this fleet's actual constraint

The 429s in the log are `limit: 10000, model: gemini-2.5-flash` — a **requests-per-day** quota, not a
token budget. Prompt caching, context editing, pruning and compression all reduce *tokens per call*.
They cannot buy back a single request. Only Part A's fixes (call count), item 2 (precondition gate) and
item 5 (dedup/coalescing) move that number. **This is why Part A outranks everything here.**

### Do not deploy a semantic cache on the action loop

The chatbot numbers are good (61.6–68.8% hit rate at 92.5–97.3% accuracy), but the 2026 paper that
evaluated this *on agents* found GPTCache scores **37.9% accuracy** and prior agentic plan caching
achieved **0–12% hit rates**. Its decisive example: *"check email"* and *"send email"* have **cosine
similarity ≈0.91** and require completely different tool sequences. Similarity is "simultaneously too
strict (paraphrases fall below threshold) and too permissive (different intents appear similar)."

This repo has already lived the failure mode. Part A's D1 is precisely a similarity-threshold system
returning confidently wrong matches — `mine 1 oak log` → `walk_to_the_nearest_shore`. In a chatbot a
false hit is a slightly wrong answer; here it is *executing the wrong code*, and it costs 2.07 codegen
retries. Adding a second similarity-threshold layer on top would compound the existing bug.

If the mechanism is wanted anyway, **vCache** replaces the fixed cosine threshold with a per-prompt
verified error bound and reports **up to 12.5× higher hit rate and 26× lower error rate** than static
thresholds (ICLR 2026). Note also that the much-quoted "61.6–68.8%" figures are routinely misattributed
to the GPTCache paper; they are from Regmi & Pun 2024. GPTCache's own paper has no hit-rate table, and
the repo's "10× cheaper, 100× faster" tagline ships with **no benchmark behind it**.

The existing `data/qa_cache.json` (11 entries) is the right scope for this technique — chat Q&A, where a
near-miss is harmless. Leave it there; do not extend it to codegen.

### Do not expect distillation to fix codegen — someone already ran this exact experiment

Distillation is genuinely strong in narrow verifiable domains. But **MindForge** ran precisely this
setup — Voyager-style Minecraft tasks, open-weight models, fine-tuned on GPT-4 execution traces plus
Minecraft manuals:

| Model | collect-dirt | collect-wood |
|---|---:|---:|
| GPT-4 | 100% | 100% |
| Mixtral-8x7B | 27% | 27% |
| Mistral-7B | 7% | 4% |
| Llama-3.1-8B | 4% | 7% |
| Mistral-7B **+ MindForge** (structured multi-agent comms) | 37.5% | 33.3% |

The paper's conclusion is explicit: **"fine-tuning failed to bridge the gap."** What helped was
structured inter-agent communication, not weight updates — and mc-fleet-bot already has bot-to-bot
messaging (`src/social/`) and a blackboard (`BlackboardManager`). That is the cheaper direction.

Where the local Ollama model *does* earn its keep is the cheap-and-verifiable tier: embeddings,
observation summarisation, prompt compression, and the first stage of a cascade — with the caveat from
RouterBench that cascades only beat the single-best-model baseline while the verifier's error rate stays
**below ~0.1**, degrading fast above 0.2.

### Keep routing honest

RouteLLM's headline numbers hold up against the primary source. But **RouterBench** — 405,467 samples
across 11 models — found predictive routers **did not significantly beat "always use the single best
model"**, and that cost for comparable performance varies only **2–5×** across models. The reliable
version for this project is routing by *task type* (a hard-coded, evaluated policy), not a learned
per-request router. A 2026 survey found **no published savings numbers at all** for OpenRouter Auto
Router, Martian, NotDiamond, Requesty or Unify — every commercial-router percentage in circulation is
unverifiable marketing.

## B3. Suggested sequencing

1. **Part A fixes D1/D2/D3/D5 + the D7 precondition gate** — days, no external dependency, targets the
   binding request-quota constraint. **Est. −3,000 to −6,800 calls/day.**
2. **Instrument the TokenLedger** with cache-hit and per-task-type cost. Everything below is
   unmeasurable without it.
3. **Wire Gemini context caching** (or move `codegen` to Anthropic, where caching already works) **and
   reorder the codegen prompt** so the ~3,500-token system prefix precedes all volatile world state.
4. **Task-type routing + exact-hash dedup + single-flight** (items 4, 5). Watch the Haiku 4,096-token
   cache floor.
5. **Corpus dedup/parameterisation + eviction** (item 6, Part A fix 5) — unblocks learning, shrinks the
   9.2 MB `getAllSkillCode()` VM injection.
6. **Pruning, batching, event-driven wake** (items 7, 8, 10) once quota pressure is relieved.
7. **Skip** semantic caching on the action loop; **skip** trace-distillation for codegen.

## B4. Sources

- [Claude pricing — caching multipliers, batch](https://platform.claude.com/docs/en/about-claude/pricing) · [prompt caching — minimums, breakpoints, invalidation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching) · [context editing](https://platform.claude.com/docs/en/build-with-claude/context-editing) · [effort](https://platform.claude.com/docs/en/build-with-claude/effort) · [advanced tool use](https://www.anthropic.com/engineering/advanced-tool-use) · [effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) · [Gemini context caching](https://ai.google.dev/gemini-api/docs/caching)
- Caching/agents: [Don't Break the Cache — 2601.06007](https://arxiv.org/abs/2601.06007) · [TraceLab — 2606.30560](https://arxiv.org/abs/2606.30560) · [cache-hit field data](https://agentmarketcap.ai/blog/2026/04/11/prompt-cache-hit-rate-engineering-2026) · [single-flight coalescing](https://dev.to/mukundakatta/single-flight-llm-calls-coalesce-50-concurrent-identical-requests-into-one-api-call-4dk0)
- Voyager/skills: [Voyager — 2305.16291](https://arxiv.org/abs/2305.16291) · [Voyager FAQ — $50/160 iters](https://github.com/MineDojo/Voyager/blob/main/FAQ.md) · [AWM — 2409.07429](https://arxiv.org/html/2409.07429) · [ExpeL — 2308.10144](https://arxiv.org/abs/2308.10144) · [ACE — 2510.04618](https://arxiv.org/html/2510.04618v1) · [Affordable Generative Agents — 2402.02053](https://arxiv.org/html/2402.02053) · [MindForge — 2411.12977](https://arxiv.org/html/2411.12977)
- Routing/distillation: [RouteLLM — 2406.18665](https://arxiv.org/abs/2406.18665) · [FrugalGPT — 2305.05176](https://arxiv.org/abs/2305.05176) · [RouterBench — 2403.12031](https://arxiv.org/html/2403.12031v2) · [routing survey — 2603.04445](https://arxiv.org/html/2603.04445v2) · [DeepSeek-R1 — 2501.12948](https://arxiv.org/html/2501.12948v1) · [LoRA Land — 2405.00732](https://arxiv.org/abs/2405.00732) · [Bedrock Distillation GA](https://aws.amazon.com/about-aws/whats-new/2025/05/amazon-bedrock-model-distillation-generally-available)
- Caching (negative results): [Why Agent Caching Fails — 2602.18922](https://arxiv.org/html/2602.18922) · [vCache — 2502.03771](https://arxiv.org/abs/2502.03771) · [GPT Semantic Cache — 2411.05276](https://arxiv.org/html/2411.05276v3) · [GPTCache paper](https://aclanthology.org/2023.nlposs-1.24/) · [SCALM — 2406.00025](https://arxiv.org/abs/2406.00025) · [MeanCache — 2403.02694](https://arxiv.org/html/2403.02694v2)
- Other: [AgentDiet — 2509.23586](https://arxiv.org/abs/2509.23586) · [LLMLingua-2 — 2403.12968](https://arxiv.org/abs/2403.12968) · [LLMLingua repo](https://github.com/microsoft/LLMLingua) · [JSONSchemaBench — 2501.10868](https://arxiv.org/html/2501.10868v1) · [zero-cost monitoring — 2604.05854](https://arxiv.org/abs/2604.05854)
