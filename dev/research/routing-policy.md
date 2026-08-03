# LLM Routing Policy — mc-fleet-bot

**Date:** 2026-07-24
**Status:** Analysis + recommendation only. No code changed, nothing PUT to the API.
**Rate card:** the July-2026 card supplied by the operator (reproduced in §1). Not looked up, not inferred.
**Primary evidence:** `data/token-ledger.json` (10,000-record circular buffer), `/var/log/mc-fleet-bot.log`,
`src/ai/{ModelRouter,AnthropicClient,GeminiClient,TokenLedger,LLMSettings,TaskType}.ts`,
`src/voyager/{ActionAgent,CriticAgent,CurriculumAgent}.ts`, `src/town/*`, `src/social/CultureManager.ts`,
`data/llm-settings.json`, `config.yml`.

---

## 0. Executive summary

| | |
|---|---|
| Measured cost of the **current** routing | **$10.85/h → $260/day** |
| $10/day budget cap | **tripped in 50 minutes**, and it halts rather than degrades |
| Share of spend that is codegen | **90 %** |
| Recommended policy (incl. new social/governance layer) | **$152.72/day** (sonnet-5 intro) / **$213.52/day** after 2026-08-31 |
| Aggressive tier, gated on one measured number | **$78.00/day** |
| Single largest correctable defect | `CHARS_PER_TOKEN = 4` in `AnthropicClient.ts:29` silently disables prompt caching for two real prompts |

The rest of this document derives every one of those numbers.

---

## 1. Rate card (authoritative, as supplied)

| model | input $/1M | output $/1M | notes |
|---|---|---|---|
| claude-opus-5 | 5 | 25 | 1M ctx, 128K out. **Thinking ON by default**; disabling only allowed at effort ≤ high |
| claude-opus-4-8 | 5 | 25 | 1M ctx. Thinking OFF unless requested |
| claude-sonnet-5 | 3 | 15 | intro $2/$10 through 2026-08-31. **~30 % more tokens for the same text** (new tokenizer) |
| claude-fable-5 | 10 | 50 | thinking always on; **30-day data retention required, NOT available under ZDR** |
| claude-haiku-4-5 | 1 | 5 | |
| gemini-2.5-flash | 0.15 | 0.60 | |
| gemini-3.5-flash | 1.50 | 9.00 | |
| MiniMax-M3 | 0.30 | 1.20 | approximate |
| gpt-5.6-sol / terra / luna | 5 / 2.50 / 1 | 30 / 15 / 6 | breakpoint pricing above 272K input |

**Prompt caching:** writes bill 1.25× input, reads bill 0.1× input.
**Minimum cacheable prefix is per-model and non-monotonic:**

| model | minimum cacheable prefix |
|---|---|
| claude-opus-5 (also fable-5, mythos-5) | **512** tokens |
| claude-opus-4-8, claude-sonnet-5 | **1024** tokens |
| claude-opus-4-7 | **2048** tokens |
| claude-opus-4-6, **claude-haiku-4-5** | **4096** tokens |

This table already exists, correctly, in the codebase (`src/ai/AnthropicClient.ts:20-25`). What is wrong is the
*estimator* that decides whether a prompt clears it — see §5.

---

## 2. Volume: derived from the ledger, extrapolated to 24 h

### 2.1 The buffer is 7.05 h, not a day — everything below is extrapolated

`TokenLedger.MAX_RECORDS = 10000` (`src/ai/TokenLedger.ts:8`, truncation at `:86/:195/:207`). The file is a
fixed-size circular buffer, so "10,000 records" is the buffer capacity, not a daily call count.

```
records            10,000
window             2026-07-24 13:24:28  →  20:27:22   = 7.098 h
24 h scale factor  24 / 7.098 = 3.381 ×
```

**Every daily figure in this document is an extrapolation from a sub-window of that 7.098 h buffer, stated
explicitly at each use.** It is a single-afternoon sample from one host running five bots; treat it as an
order-of-magnitude baseline with a ±30 % band, not a forecast.

### 2.2 Task-type mix over the whole buffer — verifying the ~77 % codegen claim

`dev/research/call-volume-audit.md` measured codegen at ~77 % of input tokens. **Verified, and slightly higher:**

| taskType | calls | % calls | input tokens | **% input** | output tokens | % output | mean in | mean out |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| codegen | 3,864 | 38.6 % | 12,383,549 | **78.3 %** | 1,717,134 | 87.2 % | 3,205 | 444 |
| critic | 1,601 | 16.0 % | 1,638,876 | 10.4 % | 166,035 | 8.4 % | 1,024 | 104 |
| curriculum | 1,121 | 11.2 % | 1,485,256 | 9.4 % | 42,363 | 2.2 % | 1,325 | 38 |
| chat | 1,493 | 14.9 % | 269,302 | 1.7 % | 43,268 | 2.2 % | 180 | 29 |
| embed | 1,921 | 19.2 % | 36,134 | 0.2 % | 0 | 0 % | 19 | 0 |
| **total** | **10,000** | | **15,813,117** | | **1,968,800** | | | |

Codegen is **78.3 % of input and 87.2 % of output tokens**. The prior figure stands.

### 2.3 The buffer contains three distinct regimes — do not average across them

| window | duration | what was running |
|---|---|---|
| 13:24 → 18:10 | 4.75 h | **Gemini era.** Everything on `gemini-2.5-flash`, ledgered as model `"gemini"` |
| 18:12 → 18:37 | 0.42 h | Anthropic on, but `route.model` not yet honoured → *everything* on opus-4-8 |
| **18:37 → 19:02** | **0.42 h** | **`data/llm-settings.json` routes actually in force** (opus-4-8 codegen, haiku critic/curriculum/chat) |
| 19:02 → 20:27 | 1.42 h | **Dead.** $10 anthropic cap tripped; the only fallback (`gemini`) returns HTTP 429 |

Two independent faults are visible and both matter for the policy:

1. **The gemini era was billed at $0.** The router recorded model `"gemini"` (the *provider* name), which is not a
   key in `TokenLedger.COST_PER_MILLION`, so `estimateCost()` returned 0 for 5,133 calls. Repricing that traffic
   at $0.15/$0.60 puts the true buffer spend at **$13.39, not the ledgered $10.19 — a 1.31× under-count.**
   Fixed in the working tree (`ModelRouter.ts:409` now falls back to `client.getModelId()`, never a provider name).
2. **The `gemini` fallback is dead.** 3,159 × `Gemini API 429: You exceeded your current quota` in the log; of
   2,195 non-embed gemini calls after 18:12, **3 succeeded**. Failure latency is 53 ms (p50), so the fleet spins
   through the fallback chain for free and produces nothing. A further 709 × HTTP 404 are the historical
   model-string leak (an `anthropic` model name sent to the Gemini endpoint). **Any policy that lists `gemini`
   as a safety net is fiction until billing is enabled on that key.**

### 2.4 Normalised daily workload (NDW)

Per-call token profiles and call rates are taken from **18:37 → 19:02** — the only window in which the configured
routes actually executed against Anthropic. Scaled by 24 / 0.421 = **57.0×**.

| taskType | calls/h | **calls/day** | uncached in | cached prefix (read) | cache-hit rate | out |
|---|---:|---:|---:|---:|---:|---:|
| codegen | 333 | **8,000** | 1,790 | 5,410 | 56.4 % | 749 |
| critic | 235 | **5,640** | 1,322 | 0 (see §5) | 0 % | 202 |
| curriculum | 121 | **2,900** | 2,319 | 0 | 0 % | 88 |
| chat | 297 | **7,100** | 363 | 0 | 0 % | 92 |
| embed | 680 | **16,300** | 20 | — | — | 0 |

**Cross-check** against the largest clean sample (13:24 → 19:02, 5.565 h to the budget cap, ×4.312):
codegen 11,727/day, critic 5,171, curriculum 2,803, chat 3,338, embed 6,862. Critic and curriculum agree within
10 %. Codegen is 47 % higher there because the Gemini era sustained 489 successful codegen/h against opus-4-8's
333/h — **a slower model mechanically buys fewer calls per day.** That self-limiting effect is why the
conservative NDW (8,000) is used below; a policy that moves codegen to a faster model will raise call volume and
partially eat its own per-call saving. The budget cap, not the model choice, is what bounds the day.

### 2.5 Sanity check: NDW reproduces the measured spend

```
codegen     8,000 × $0.029200 = $233.60
critic      5,640 × $0.002332 = $ 13.15
curriculum  2,900 × $0.002759 = $  8.00
chat        7,100 × $0.000823 = $  5.84
embed      16,300 × ~$0       = $  0.01
                                -------
                                $260.60 / day
```
Directly measured in the same window: $4.564 in 0.421 h = **$10.85/h = $260.40/day**. Agreement to 0.1 %.
**Codegen is 89.6 % of the bill.**

---

## 3. The metric that decides everything: cost per *landed* task, not per call

A codegen call is not the unit of work. The unit is a **landed task**: a `codegen` call, a `critic` call, and
however many retries it takes. The retry ladder is capped at 3 attempts (measured: `attempt` ∈ {1,2,3}, n = 15,063
`Voyager task evaluated` blocks in the log).

Let `p` = per-attempt landing probability, `q = 1 − p`, cap = 3.

```
E[attempts]      = 1 + q + q²
P(lands ≤ 3)     = 1 − q³ = (1 − q)(1 + q + q²)

cost per landed  = E[attempts] · C_attempt / P(lands)
                 = (1 + q + q²) · C_attempt / [(1 − q)(1 + q + q²)]
                 = C_attempt / p
```

**The retry cap cancels exactly.** Cost per landed task is `C_attempt / p`, independent of the cap. That single
identity makes the cheap-vs-expensive question falsifiable:

> **A more expensive model is cheaper per landed task iff its cost multiple is smaller than its success multiple:
> cheap wins iff `C_exp / C_cheap > p_exp / p_cheap`.**

### 3.1 Measured landing probabilities

Parsed from 15,063 `Voyager task evaluated` blocks in `/var/log/mc-fleet-bot.log`:

| era | attempts | landed | **p** | landed/h | LLM $/h | **$/landed task** |
|---|---:|---:|---:|---:|---:|---:|
| Gemini 13:25–18:10 (4.75 h) | 4,711 | 250 | **5.3 %** | 53 | $0.67 | **$0.0127** |
| Anthropic 18:12–19:02 (0.84 h) | 620 | 188 | **30.3 %** | 225 | $11.93 | **$0.0531** |

**Confound, stated plainly:** the process restarted at 18:01:13 (pid 89012) after a long run on pid 20673, and a
further six times before 19:02. The 5.7× jump in `p` therefore mixes *model change* with *code change*. The
figures are directionally strong (a 4.75 h sample against a 0.84 h sample) but they are not a clean A/B. The
policy below is built on the **breakeven algebra**, which does not depend on trusting either number — only on
measuring `p` after the switch.

### 3.2 The uncomfortable result

```
C_attempt(opus-4-8 codegen + haiku critic) = $0.029200 + $0.002332 = $0.031533
C_attempt(gemini-2.5 codegen + gemini critic) = $0.001097 + $0.000268 = $0.001365

cost ratio     C_opus / C_gemini = 23.10×
success ratio  p_opus / p_gemini = 0.303 / 0.053 = 5.72×

23.10 > 5.72  →  gemini is 4.04× cheaper PER LANDED TASK
```

| routing | $/attempt | p | **$/landed task** |
|---|---:|---:|---:|
| opus-4-8 + haiku critic | $0.031533 | 0.303 | **$0.1041** |
| sonnet-5 (intro) + haiku critic | $0.017516 | 0.303 (assumed) | **$0.0578** |
| gemini-2.5-flash + gemini critic | $0.001365 | 0.053 | **$0.0258** |

**Cheap models are not false economy in dollars per landed task — they win, and no model at $5/$25 can ever beat
them here.** To match gemini on $/landed, an opus-priced model would need `p ≥ 23.10 × 0.053 = 1.22`, i.e. a
success rate above 100 %. That is arithmetically impossible.

**So where is the false economy?** Not in $/task. It is in three places the $/call view cannot see:

1. **Throughput.** 53 landed tasks/h vs 225/h — a **4.2× loss of useful work per wall-clock hour**. Since the
   fleet's value is measured in what gets built per evening, not per dollar, the cheap model buys back its
   savings by needing 4.2× longer.
2. **Abandonment on dependency chains.** With a 3-attempt cap, `P(land) = 1 − q³` is 15.1 % (gemini) vs 66.1 %
   (opus-4-8). A build is a *chain*: if step *k* is abandoned, steps *k+1…N* never run. Expected attempts to land
   a step with outer-loop re-queueing is `1/p`: **19 attempts (gemini) vs 3.3 (opus)**. A 30-step build costs
   566 gemini attempt-pairs ($0.77, ~44 min of serialised LLM latency at 4.65 s/pair) versus 99 opus pairs
   ($3.12, ~19 min at 11.6 s/pair). 4× the money, 2.3× less wall-clock — and the world moves underneath the bot
   during those extra 25 minutes (nightfall, hunger, mobs, inventory drift), which is itself a source of `p`
   decay that the model never sees.
3. **Skill-library pollution.** The critic gates what enters `skills/`. At `p = 0.053`, 94.7 % of attempts write
   a `failed_tasks` row and the retry storm churns the library. The repo already shows the symptom —
   `craft_4_oak_planks_v2/v3`, `mine_1_oak_log_v33/v34/v35`, and `Skill library full, cannot save` in the log.

### 3.3 Breakeven table — the decision rule

Everything below `p` = the breakeven column is *worse* than staying on opus-4-8, measured in $/landed task.
Baseline: opus-4-8 at the measured `p = 0.303`.

| codegen model | $/call | $/attempt (with haiku critic) | **breakeven `p`** | measured `p` |
|---|---:|---:|---:|---|
| opus-4-8 (thinking off) | $0.02920 | $0.031533 | 0.303 (baseline) | **0.303** |
| sonnet-5, standard $3/$15 | $0.02278 | $0.025112 | **0.241** | untested |
| sonnet-5, intro $2/$10 | $0.01518 | $0.017516 | **0.168** | untested |
| haiku-4-5, as-is (cache blocked, §5) | $0.01094 | $0.013276 | **0.128** | untested |
| haiku-4-5, cache gate fixed | $0.00584 | $0.008176 | **0.079** | untested |
| gemini-2.5-flash | $0.00110 | $0.001365 | **0.013** | **0.053** ✔ |
| opus-5, thinking ON (default) | $0.05920 | $0.061533 | 0.591 — *needs to nearly double `p`* | untested |
| fable-5, thinking always on | $0.11840 | $0.120733 | 1.16 — **impossible** | — |

**This is the policy.** Pick the cheapest model, measure `p` over a two-hour window, and only escalate a tier when
the measured `p` falls below that tier's breakeven. It is a decision rule, not a preference.

---

## 4. Where a frontier model actually earns its cost

### 4.1 Against opus-5 / fable-5 on the routine task loop

The routine loop is 8,000 codegen + 5,640 critic + 2,900 curriculum calls a day of short, formulaic,
schema-constrained work: emit one named async mineflayer function against a 5,410-token system prompt, then judge
an inventory delta. From §3.3, **fable-5 needs `p ≥ 1.16` on the loop — arithmetically impossible.** opus-5 with
its default thinking on needs `p ≥ 0.591`, i.e. it must land nearly twice as many attempts as opus-4-8 to pay for
its own reasoning tokens. Neither is defensible on the loop.

Two further, non-price arguments against putting them there:

- **fable-5 requires 30-day data retention and is unavailable under ZDR.** This fleet ingests real player chat
  (`POST /api/events/chat`, `src/server/routes/` event relays) and player positions and forwards them into
  prompts. Routing that through a model with mandatory 30-day retention is a data-governance decision, not a
  cost decision, and it should not be made by a routing table. **Recommend: do not enable fable-5 anywhere in
  this fleet.**
- **The 1M context window is currently unused.** Measured codegen prompt: 1,790 uncached + 5,410 cached =
  **7,200 tokens.** The largest single prompt anywhere in the buffer is 5,377 uncached tokens. The fleet is
  paying frontier prices for a 1M-token window and sending it 0.7 % of one. Context capacity is not a reason to
  pay for opus *today*; it becomes one only when the build coordinator starts feeding whole build histories.

### 4.2 For a frontier model on long multi-hour / multi-session autonomous builds

The operator's specific question. The case is real but it is **not the codegen loop** — it is the small number of
calls that *decide what the loop will spend the next four hours doing*.

A multi-hour build has a structure the task loop does not:

| property | routine task loop | multi-hour build |
|---|---|---|
| calls per decision | 1 | 1 |
| downstream cost of a bad output | one retry (~$0.03) | **hundreds of codegen calls (~$100s)** |
| context required | 7.2 K tokens | full build plan + placement history + prior failures + terrain → **100 K–500 K** |
| state carried across sessions | none (task is atomic) | **the whole point** |
| calls/day | 8,000 | ~40 |
| error is recoverable by retry? | yes | no — a wrong plan is executed faithfully |

For those ~40 calls a day the arithmetic inverts completely. At 40 calls of ~6,000 in / ~2,000 out, opus-4-8
costs `40 × (6000×5 + 2000×25)/1e6 = 40 × $0.080 = $3.20/day`. **That is 1.2 % of the current bill to make the
decision that governs the other 98.8 %.** The breakeven identity says: a planning model is worth its multiple if
it changes the downstream `p` of the tasks it schedules by more than that multiple. Going from haiku to opus on
planning costs `+$2.60/day`; a 1-percentage-point lift in downstream `p` (0.303 → 0.313) is worth
`2,424 landed/day × ($0.1041 − $0.1008) = $8.00/day`. The planning route pays for itself at a **0.4 pp** lift.

Concretely, the capability differences that matter *here* and only here:

- **Thinking-on-by-default (opus-5) is an asset on a plan and a liability on a loop.** Plan quality is
  reasoning-bound; the +1,200 thinking tokens cost $0.030 on a call that gates $100s of downstream work. On the
  loop the same 1,200 tokens are pure overhead × 8,000/day = **+$240/day for nothing**.
- **The effort ladder is the actual control surface.** high effort on the once-per-build architecture call, low
  effort or thinking-off on everything else. Note the hard constraint in the rate card: **thinking can only be
  disabled at effort ≤ high** — so an effort-max opus-5 route can never be made cheap, and must never be applied
  to a per-task route.
- **1M context earns its cost only on multi-*session* builds**, where the model must reload "what did we already
  place, what failed, and why" rather than re-derive it. That is worth paying for at ~40 calls/day. It is worth
  nothing at 8,000 calls/day of 7.2 K prompts.

**Verdict.** Give the build/design path **its own task type**, route it to opus-4-8 (or opus-5 once thinking can
be explicitly disabled — see §6.3), and take the routine codegen loop *off* frontier pricing. `src/town/LlmDesigner.ts:333`
already exists and is mis-tagged `codegen`, so today it rides the same route as 8,000 crafting calls: the fleet is
simultaneously over-paying for planks and under-thinking its architecture. **Do not use fable-5 for this** — its
4.06× multiple over opus-4-8 buys nothing measurable, and its retention requirement is a governance problem.

---

## 5. Prompt caching: the minimums, and the constant that defeats them

This is where the most money is being left on the table, and it is entirely invisible from the rate card.

`AnthropicClient.ts` gets the *policy* exactly right — a per-model, non-monotonic minimum table at lines 20-25.
It then gets the *measurement* wrong:

```ts
const CHARS_PER_TOKEN = 4;                                  // AnthropicClient.ts:29
function cacheThresholdChars(model: string): number {
  return (hit ? hit[1] : DEFAULT_CACHE_MIN_TOKENS) * CHARS_PER_TOKEN;
}
const useCache = systemPrompt.length >= cacheThresholdChars(effectiveModel);   // :67
```

The gate is applied to `systemPrompt.length` in **characters**. The comment calls under-estimating "safe" — it is
not. Under-estimating tokens means *over*-estimating the character threshold, which **refuses `cache_control` on
prompts that would have cached fine.** Measured against reality:

| system prompt | chars | **true tokens** | chars/token |
|---|---:|---:|---:|
| `ACTION_SYSTEM_PROMPT` (codegen, `ActionAgent.ts:23`) | 14,036 | **5,410** (measured `cache_read_input_tokens`) | **2.59** |
| `CRITIC_SYSTEM_PROMPT` (`CriticAgent.ts:16`) | 3,907 | ~1,150 (bounded by min observed prompt = 1,216) | ~3.4 |
| `CURRICULUM_SYSTEM_PROMPT` (`CurriculumAgent.ts:25`) | 1,224 | ~360 | ~3.4 |

Code-and-JSON-heavy prompts tokenise at **2.6 chars/token, not 4**. Cross-referencing against each model's
minimum:

| prompt → model | true tokens vs minimum | char gate | outcome |
|---|---|---|---|
| codegen → opus-4-8 (1024) | 5,410 > 1,024 ✔ | 14,036 ≥ 4,096 ✔ | **cached** — correct, and confirmed by 83 records with `cache_read = 5,410` |
| codegen → haiku-4-5 (4096) | 5,410 > 4,096 ✔ | 14,036 < 16,384 ✘ | **FALSE NEGATIVE — cache refused on a prompt that qualifies** |
| critic → haiku-4-5 (4096) | 1,150 < 4,096 ✘ | blocked ✘ | correctly uncached (confirmed: all 121 haiku records have `cache_read = 0`) |
| critic → opus-4-8 / sonnet-5 (1024) | 1,150 > 1,024 ✔ | 3,907 < 4,096 ✘ | **FALSE NEGATIVE — misses by 189 characters** |
| critic → opus-5 (512) | 1,150 > 512 ✔ | 3,907 ≥ 2,048 ✔ | **cached** |
| curriculum → any | ~360 < 512 ✘ | blocked ✘ | correctly uncached — genuinely uncacheable everywhere |
| chat → any | whole prompt is 363 tokens | blocked ✘ | correctly uncached |

**Value of fixing `CHARS_PER_TOKEN` (one constant, ~2.6 or a real token count):**

- codegen on haiku-4-5: **$0.01094 → $0.00584/call, a 47 % cut**, and it drops haiku's breakeven `p` from
  0.128 to 0.079 — which is what makes the aggressive tier in §7 viable at all.
- critic on sonnet-5/opus-4-8: unlocks caching there, though §6.2 shows critic should stay on haiku anyway.

This is the highest-ROI change in the whole analysis and it is one line. **It is a code change and is therefore
out of scope for this document — logged as follow-up F1 in §9.**

---

## 6. Model-by-model verdicts

### 6.1 Opus 4.8 vs Opus 5 at identical $5/$25 — is there a reason to stay on 4.8?

At the same price the newer model should win by default. Here it does not, for one reason, and the cache argument
that is supposed to favour it turns out to be worth almost nothing on this workload.

**The cache-minimum argument (512 vs 1024), measured rather than assumed.** "More prompts become cacheable" is
true in general. In *this* fleet it applies to exactly one prompt:

| task | prompt tokens | ≥512 (opus-5)? | ≥1024 (opus-4-8)? | gain from opus-5 |
|---|---:|---|---|---|
| codegen | 5,410 prefix | ✔ | ✔ | **none** — already cached |
| **critic** | ~1,150 prefix | ✔ | ✔ *(but char gate blocks it, §5)* | **the only real win** |
| curriculum | ~360 prefix | ✘ | ✘ | none |
| chat | 363 total | ✘ | ✘ | none |

So the 512-token minimum buys precisely one thing: it lets `CRITIC_SYSTEM_PROMPT` past the client's own
character gate, because 3,907 chars clears opus-5's 2,048-char threshold but not opus-4-8's 4,096-char one. That
is a real, measurable win — and it is worth **less than nothing** once priced, because critic on any opus-priced
model is 2.8–8× worse than critic on haiku (§6.2). The cache minimum is a solution to a problem this fleet does
not have.

**The reason to stay on 4.8, and it is decisive today:** *the codebase cannot turn opus-5's thinking off.*

- `AnthropicClient` never emits a `thinking` field in its request body (`AnthropicClient.ts:78-96` — the body is
  `model`, `system`, `max_tokens`, `messages`, and conditionally `temperature`).
- `RouteConfig.useThinking` is consulted in exactly one place: `ModelRouter.ts:228`,
  `if (route?.useThinking && taskType === 'codegen')`, and it selects `generateWithThinking()`, a method that
  **only `GeminiClient` implements**. For Anthropic it is a no-op in both directions.

Therefore, setting `"model": "claude-opus-5"` on the codegen route today gives you thinking-on with no way to
disable it: **$0.02920 → $0.05920 per call, +$240/day at NDW, for zero configuration change that would warn you.**
And `useThinking: false` in the route payload would read as if it had prevented that. It would not.

| | opus-4-8 | opus-5 |
|---|---|---|
| price | $5/$25 | $5/$25 |
| thinking default | **OFF** — matches what the code can express | **ON** — code cannot disable it |
| codegen $/call at NDW shape | **$0.02920** | $0.05920 (default) / $0.02920 (if thinking could be disabled) |
| cache minimum | 1024 | 512 |
| prompts in this fleet that 512 unlocks | — | 1 (critic), which should not be on opus anyway |
| `max_tokens` budgeting | budget = visible output only; `codeGenMaxTokens: 16384` vs measured max 3,165 → 5× headroom | budget is **shared** by thinking + visible output; the truncation failure mode already documented in `config.yml:83-87` for MiniMax-M3 returns |

**Verdict: stay on opus-4-8 for any per-task route.** Move to opus-5 only where thinking is *wanted* and paid for
deliberately — which in the recommended policy is the `governance` route (§8) and, later, the `design` route.
Once `AnthropicClient` learns to send `thinking: {type: "disabled"}` (follow-up F2), opus-5 becomes a
strictly-better drop-in for opus-4-8 at the same price and the recommendation flips.

### 6.2 Sonnet 5's tokenizer tax — the effective ratio

Sonnet-5's nominal card is $3/$15 against opus's $5/$25 — a naive 0.600 ratio. It emits **~30 % more tokens for
the same text**, and you are billed per token, so the ratio to use is:

```
effective ratio = price ratio × token multiplier

standard:  (3/5) × 1.30 = 0.780      → sonnet-5 is 78 % of opus, NOT 60 %
intro:     (2/5) × 1.30 = 0.520      → 52 % of opus, through 2026-08-31
```

Verified end-to-end on the measured codegen shape (1,790 uncached + 5,410 prefix @ 56.4 % hit + 749 out, all ×1.30):

```
sonnet-5 std:   2,327×3 + 7,033×0.564×0.1×3 + 974×15 = 6,981 + 1,190 + 14,610 = 22,781  → $0.02278
opus-4-8:       1,790×5 + 5,410×0.564×0.1×5 + 749×25 = 8,950 + 1,526 + 18,725 = 29,201  → $0.02920
ratio = 0.02278 / 0.02920 = 0.780 ✔
sonnet-5 intro: 2,327×2 + 7,033×0.564×0.1×2 +  974×10 = 4,654 +   793 +  9,740 = 15,187 → $0.01518
ratio = 0.01518 / 0.02920 = 0.520 ✔
```

**A 22 % saving, not the 40 % the card advertises.** Two second-order consequences the naive reading also misses:

- **Effective context shrinks.** A 1M-token window holds ~770 K tokens' worth of the *same text*. Irrelevant at
  today's 7.2 K prompts; relevant the moment §4.2's long-context build path is built.
- **The tax interacts with the cache minimum, in sonnet's favour — but the code can't see it.** A prompt of 800
  "opus tokens" becomes ~1,040 sonnet tokens and clears sonnet's 1,024 minimum. The client gates on *characters*
  (§5), which is tokenizer-blind, so this upside is invisible to the current implementation. Another reason F1
  should be a real token count rather than a tuned constant.

**Verdict: sonnet-5 is the right codegen model right now**, at 52 % of opus through 2026-08-31 and 78 % after,
with a clearly stated quality bar: it must land ≥16.8 % of attempts (intro) or ≥24.1 % (standard) to beat
opus-4-8 on $/landed task. Against opus's measured 30.3 %, that is a **22 % relative quality budget** — a
generous, falsifiable margin.

### 6.3 The others

- **haiku-4-5** — correct for critic, curriculum and the chronicle. Note its 4,096-token cache minimum is the
  *worst in the family*, so it is exactly the model where a long system prompt hurts most; that is not a problem
  for critic (~1,150-token prefix, genuinely uncacheable) but it is a 47 % penalty on codegen until F1 lands.
- **gemini-2.5-flash** — 26× cheaper than opus per codegen call and, per §3.2, unbeatable on $/landed task. Two
  hard blockers: **quota exhausted (429)**, and 53 landed tasks/h against opus's 225. Correct role: ambient
  social, chat, embed, and the fallback tier — *after* billing is enabled.
- **gemini-3.5-flash** ($1.50/$9.00) — $0.01754/codegen call *with no prompt caching modelled*, which is worse
  than haiku-with-cache ($0.00584) and barely under sonnet-5 intro. No niche in this fleet.
- **MiniMax-M3** ($0.30/$1.20) — nominally cheap, but `config.yml:83-87` already documents it as a
  chain-of-thought model that "spends output tokens on reasoning BEFORE emitting the code block" and required
  `codeGenMaxTokens` to be doubled to 16,384 to stop truncation. At a realistic 3,000 output tokens its codegen
  cost is $0.00576 — level with cached haiku, not the 4× win the card implies. **Its output inflation makes it
  actively wrong for short ambient replies** (see §8.4). No API key configured.
- **gpt-5.6 family** — no provider client with a key; breakpoint pricing at 272K input is irrelevant at 7.2 K
  prompts. Out of scope.
- **fable-5** — 4.06× opus-4-8 on codegen, breakeven `p` of 1.16 (impossible), and 30-day retention /
  no-ZDR on a fleet that ingests player chat. **Do not enable.**

---

## 7. Recommended routing policy

### 7.1 Design principles

1. **Route by leverage, not by task name.** High-volume/low-stakes → cheapest model that emits a structurally
   valid artifact. Low-volume/high-stakes → the best model, with thinking, deliberately paid for.
2. **Never make an unreachable provider the primary.** `gemini` is 429ing; it stays in fallback position until
   billing is fixed.
3. **Cap the fallback blast radius.** `ModelRouter.routedModelFor()` correctly refuses to apply a route's model
   to a foreign provider — but the foreign provider then uses **its own default model**. `data/llm-settings.json`
   currently sets the `anthropic` provider default to `claude-opus-4-8`, so *any* gemini-primary route that falls
   back to `anthropic` silently executes at $5/$25. For the ambient-social route that is
   $0.000162 → $0.006/call, a **37× blowout on the failure path.**
   **→ Change the `anthropic` provider's default model to `claude-haiku-4-5`** and let expensive routes name
   their model explicitly. This is a `POST /api/llm/providers` change, not part of the routes payload.
4. **Every escalation must have a stated, measurable trigger** (the breakeven `p` from §3.3), never a preference.

### 7.2 The policy

| taskType | provider / model | maxTokens | thinking | fallback | why |
|---|---|---:|---|---|---|
| `codegen` | anthropic / **claude-sonnet-5** | 6144 | off | `[gemini]` | 52 % of opus (intro) / 78 % (std). Breakeven `p` 0.168 vs opus's measured 0.303. maxTokens 6144 = 1.9× the observed max output (3,165) — down from 16,384, which was sized for MiniMax's CoT and is 5× oversized here |
| `design` *(new)* | anthropic / **claude-opus-4-8** | 8192 | off | `[gemini]` | §4.2. ~40 calls/day gating hundreds of codegen calls; pays for itself at a 0.4 pp downstream `p` lift. Inert until `LlmDesigner.ts:333` is retagged (F3) |
| `critic` | anthropic / **claude-haiku-4-5** | 1024 | off | `[gemini]` | Prefix (~1,150 tok) is below haiku's 4,096 minimum so caching is genuinely impossible — and still 2.8× cheaper than the cheapest opus-5 variant. Observed max output 389 |
| `curriculum` | anthropic / **claude-haiku-4-5** | 512 | off | `[gemini]` | Prefix ~360 tok — uncacheable on every model, so there is no caching argument for anything pricier. Observed max output 127 |
| `chat` | gemini / **gemini-2.5-flash** | 512 | — | `[anthropic]` | §8.1: this bucket is **not** player chat, it is three mis-tagged `CurriculumAgent` sub-calls. $0.000823 → $0.000075/call |
| `social` *(new)* | gemini / **gemini-2.5-flash** | 256 | — | `[anthropic]` | §8.4 |
| `governance` *(new)* | anthropic / **claude-opus-5** | 4096 | on (default) | *(none — chain resolves to `[anthropic]`)* | §8.2. ~146 calls/day; thinking is the point |
| `embed` | gemini *(no model key)* | — | — | `[]` | `GeminiClient.embed()` hardcodes `gemini-embedding-001` and ignores `route.model`; setting one only mislabels the ledger. `AnthropicClient` has no `embed()`, so an `anthropic` fallback here is inert — drop it |

### 7.3 Projected daily cost

At the §2.4 NDW plus the §8 social-layer estimate:

```
codegen      8,000 × $0.015180  (sonnet-5 intro)  = $121.44
design          40 × $0.080000  (opus-4-8)        = $  3.20
critic       5,640 × $0.002332  (haiku-4-5)       = $ 13.15
curriculum   2,900 × $0.002759  (haiku-4-5)       = $  8.00
chat         7,100 × $0.000075  (gemini-2.5)      = $  0.53
embed       16,300 × ~$0        (gemini-embed)    = $  0.01
social       6,480 × $0.000162  (gemini-2.5)      = $  1.05
culture        144 × $0.000334  (gemini-2.5)      = $  0.05
journals         6 × $0.000705  (gemini-2.5)      = $  0.00
chronicle       10 × $0.007000  (haiku-4-5)       = $  0.07
governance     146 × $0.035750  (opus-5, cached)  = $  5.22
                                                    -------
                                                    $152.72 / day
```

**$153/day, against the measured $260/day today — a 41 % cut, while adding an entire social/governance layer.**

After the sonnet-5 intro window closes on **2026-08-31**, codegen becomes `8,000 × $0.02278 = $182.24` and the
total becomes **$213.52/day**. That date is a scheduled 40 % cost increase and should be diarised.

### 7.4 The two cheaper tiers, and what unlocks them

| tier | codegen route | codegen $/day | **total $/day** | unlock condition |
|---|---|---:|---:|---|
| current | opus-4-8 | $233.60 | **$260.60** | — |
| **recommended** | sonnet-5 (intro) | $121.44 | **$152.72** | none — deployable now |
| aggressive | haiku-4-5 | $46.72 | **$78.00** | F1 (cache constant) + measured `p ≥ 0.079` over a 2 h window |
| floor | gemini-2.5-flash | $8.80 | **$40.08** | gemini billing enabled + accepting 4.2× lower throughput |

The aggressive tier is a **70 % cut** and hinges on a single one-line constant plus one measurement. Recommend
deploying the sonnet-5 policy now and running the haiku trial next.

### 7.5 The budget cap must change too

`data/llm-settings.json` sets `budget: {dailyUsd: 10, scope: "anthropic"}`. Measured behaviour:

- It tripped at **19:02:14, fifty minutes** after Anthropic routing came up.
- After tripping, `ModelRouter` gates the anthropic provider out of every chain (`ModelRouter.ts:372-385`) and the
  calls fall through to `gemini` — which returns 429 in 53 ms. **The fleet did not degrade, it stopped**: 2,505
  calls in the next 84 minutes, of which every non-embed one failed, and the landed-task rate collapsed from
  225/h to under 10/h.
- Because `Restart=on-failure` and the process never exits, nothing alerts. The fleet looks alive and produces
  nothing.

Recommendations: set `dailyUsd` to **$170** (recommended policy + 10 % headroom) with `scope: "all"` so the
gemini traffic the new social layer creates is actually counted; **and treat the dead fallback as the real bug** —
a cap whose degrade path is a 429 is a kill switch with extra steps.

---

## 8. The social / governance layer

### 8.1 First: today's `chat` bucket is not chat

`ModelRouter.generate()` defaults `taskType` to `'chat'` when the caller passes no options
(`ModelRouter.ts:222`). Three `CurriculumAgent` call sites do exactly that:

| site | purpose | maxTokens |
|---|---|---:|
| `CurriculumAgent.ts:536` | answer a generated curriculum question | 120 |
| `CurriculumAgent.ts:566` | generate 3 curriculum questions (JSON array) | 160 |
| `CurriculumAgent.ts:589` | fetch task context (prerequisites/tools) | 140 |

Confirmed empirically: **100 % of `chat`-tagged successful calls have output ≤ 165 tokens** (p50 = 49, p90 = 93,
max = 141), matching those three caps exactly, and the input distribution (p50 = 323) matches their prompt
shapes. **There is no player chat in this sample at all.** The `chat` bucket — 7,100 calls/day, 14.9 % of all
calls — is mis-attributed curriculum work.

Consequences: the ledger's per-task cost attribution is wrong; anyone tuning the "chat" route is unknowingly
tuning curriculum sub-calls; and when real social traffic arrives it will land in the same bucket and become
indistinguishable. **Retagging these three call sites is a prerequisite for the social layer, not a nice-to-have.**

### 8.2 What is dormant, and what activating it costs

Current LLM users in `src/town/` and `src/social/`:

| component | today | proposed type |
|---|---|---|
| `BotInstance.ts:1310` — player/bot conversation | `chat` | `social` |
| `CultureManager.ts:301` — `extractMemesWithLLM` | `chat` | `social` |
| `ChronicleGenerator.ts:325,345` — daily chronicle + milestones | `chat` | `social` |
| `LlmDesigner.ts:333` — building design | `codegen` | `design` |
| `VoteHeuristic.ts` | **LLM-free** — a personality lookup table; header says *"Phase 8 swaps this out for an LLM-driven"* version | `governance` |
| `ApprovalManager`, `DecreeManager`, `MayorService` | no LLM today | `governance` |

`TownBrain` ticks every 60 s (`TownBrain.ts:86`) and runs five sub-loops, so the *cadence* infrastructure already
exists; only the LLM calls are missing.

**Volume model** (assumptions stated so they can be rescaled — the operator should treat these as parameters,
not measurements; nothing in the buffer exercises this path):

| workload | rate assumption | calls/day | in / out tokens |
|---|---|---:|---|
| ambient social (town-hall chatter, greetings, small talk) | 6 bots × 3 utterances/min × 25 % duty cycle | **6,480** | 600 / 120 |
| culture + meme extraction | every 10 min | 144 | 1,200 / 256 |
| resident journals | 1 per resident per day | 6 | 1,500 / 800 |
| chronicle + milestones | 1/town/day + ad-hoc | 10 | 3,000 / 800 |
| governance: votes | 20 approvals × 6 residents | 120 | 2,500 / 400 |
| governance: decisions, decrees, elections | 20 + 5 + 1 | 26 | 2,500 / 400 |

Ambient social alone is **6,480 calls/day — 81 % of the codegen call count.** This is why the tier split is not
optional.

### 8.3 Costed, at the recommended split

```
ambient social  6,480 × gemini-2.5-flash   (600 in ×0.15 + 120 out ×0.60)/1e6 = $0.000162 → $1.05/day
culture/memes     144 × gemini-2.5-flash   (1,200×0.15 + 256×0.60)/1e6        = $0.000334 → $0.05/day
journals            6 × gemini-2.5-flash   (1,500×0.15 + 800×0.60)/1e6        = $0.000705 → $0.00/day
chronicle          10 × haiku-4-5          (3,000×1 + 800×5)/1e6              = $0.007000 → $0.07/day
governance        146 × opus-5, thinking on, 1,500-tok cached prefix:
                        (1,000×5 + 1,500×0.1×5 + 1,200×25)/1e6                = $0.035750 → $5.22/day
                                                                                           ---------
                                                                                           $6.39/day
```

**The whole social + governance layer costs $6.39/day at the recommended routing — 4.2 % of the projected total.**

The counterfactuals show why the split matters:

| ambient social routed to… | $/call | **$/day** | vs recommended |
|---|---:|---:|---:|
| gemini-2.5-flash *(recommended)* | $0.000162 | **$1.05** | — |
| haiku-4-5 | $0.001200 | $7.78 | 7.4× |
| opus-4-8 *(what the `anthropic` fallback does today)* | $0.006000 | **$38.88** | **37×** |
| MiniMax-M3 (CoT, ~500 real output tokens) | $0.000780 | $5.05 | 4.8× |

And governance the other way: routing 146 governance calls to gemini-2.5-flash would save $5.13/day — **3.4 % of
the bill** — in exchange for cheap-model reasoning on decisions that are written into an append-only town record
(`chronicle_entries`, `bot_journals` in `src/town/db.ts:99`, decrees, role assignments). A bad decree is not
retried; it becomes history. **This is the one place in the fleet where the frontier model is cheap relative to
the cost of being wrong**, and it is where thinking-on-by-default is a feature rather than a $240/day tax.

Note the governance prefix is cacheable *by construction*: town charter + rules + role table are stable per town.
At ~1,500 tokens that clears opus-5's 512 minimum comfortably (and would clear 1024 too), cutting the input
component by 90 %. That is the one workload in this fleet where §6.1's cache-minimum argument would have paid —
but it pays on opus-4-8 as well, so it still is not a reason to prefer opus-5. The reason to prefer opus-5 here
is the thinking.

**Effect on the total: +$6.39/day on a $146.33 base → $152.72/day.** But note the framing problem: the $10/day cap is
*already* tripped in 50 minutes, so **every social call added today competes directly with codegen for the same
exhausted budget.** Activating the social layer before raising the cap (§7.5) will not cost more money — it will
starve codegen sooner. The cap change is a prerequisite for the social layer, not a follow-up to it.

### 8.4 The cheap-model floor for ambient social: `gemini-2.5-flash`

Ranking the three candidates on the actual workload — short, low-stakes, ~120-token conversational replies with
no cacheable prefix (a per-bot personality prompt is ~300–500 tokens, below *every* model's minimum, so caching
cannot rescue an expensive model here):

1. **gemini-2.5-flash ($0.15/$0.60) — recommended.** 7.4× cheaper than haiku on this shape. Ambient chatter that
   is slightly less witty is invisible; it is not persisted as a decision, and `CultureManager` distils it
   through a second pass anyway. **Precondition: enable billing on the Gemini key** — the free-tier quota is
   exhausted (3,159 × 429) and today this route would fail instantly.
2. **haiku-4-5 ($1/$5) — the fallback, and the interim primary until Gemini billing is fixed.** $7.78/day is
   still affordable; it is the only *working* cheap option right now.
3. **MiniMax-M3 ($0.30/$1.20) — reject, despite the nominal price.** `config.yml:83-87` already documents it as
   a chain-of-thought model that "spends output tokens on reasoning BEFORE emitting the code block", and that
   required `codeGenMaxTokens` to be doubled to 16,384 to stop truncation. For a 120-token social reply, a CoT
   model that emits 400 tokens of reasoning first turns a nominal $1.20/M output into an effective ~$4.80/M —
   **worse than haiku, at a model with no API key and no `options.model` support in its client.** Cheap
   *per token* is not cheap *per short reply*.

**Fallback ordering: `social → gemini-2.5-flash, fallback [anthropic]`** — and this is precisely why §7.1's
principle 3 matters. With the `anthropic` provider default left at `claude-opus-4-8`, that fallback executes
ambient small talk at $5/$25. Set the provider default to `claude-haiku-4-5` and the same failure path costs
$7.78/day instead of $38.88/day.

### 8.5 Do these need new task types in `src/ai/TaskType.ts`?

**Yes — `social`, `governance`, and `design`. Overloading `chat` is not viable**, for three reasons:

1. `chat` is already overloaded and already wrong (§8.1). Adding 6,480 ambient calls/day to a bucket that is
   really curriculum sub-calls makes the ledger permanently uninterpretable.
2. The whole point of the operator's steer is that ambient chatter and governance decisions need *different
   models*. One route key cannot express two models. There is no other discriminator available at dispatch time.
3. Budget and throttle policy is per-task-type (`LLMSettings.ts:208` special-cases `codegen` for idle-throttle).
   Governance should never be throttled by an idle-server rule; ambient social always should. That requires
   distinct keys.

**Cost to add:**

| change | file | size |
|---|---|---|
| extend the union | `src/ai/TaskType.ts:5` | 1 line — `'social' \| 'governance' \| 'design'` |
| dashboard task-type list | `src/server/llmRoutes.ts:59` | 1 line, cosmetic (`GET /api/llm/routes` advertises the list) |
| retag ambient/culture/chronicle | `BotInstance.ts:1310`, `CultureManager.ts:301`, `ChronicleGenerator.ts:325,345` | 4 one-line edits |
| retag design | `LlmDesigner.ts:333` | 1 line |
| **fix the mis-tag** | `CurriculumAgent.ts:536,566,589` | 3 one-line edits — pass `{taskType: 'curriculum'}` |
| tag new governance call sites | `VoteHeuristic`/`ApprovalManager`/`DecreeManager` | part of building them |
| default routes | `data/llm-settings.json` / `config.yml` | config, no code |

**No schema migration and no API change.** `UsageMetrics.byTaskType` is a `Record<string, …>`;
`PUT /api/llm/routes` performs **no key validation** (`llmRoutes.ts:63-73` → `LLMSettings.setRoutes()`), so the
payload in §9 can be applied today. The new keys are simply **inert until the call sites are tagged** —
`ModelRouter` dispatches on the `taskType` the caller passes, so until then `social`/`governance` traffic keeps
defaulting to `chat`. That is a safe, ordered rollout: apply routes first, retag second.

⚠️ **`setRoutes()` replaces the entire routes object** (`LLMSettings.ts:144-147`) — it is not a merge. The PUT
payload must contain **every** route, or the omitted ones fall back to `defaultProvider` with that provider's
default model.

---

## 9. The payload

`PUT /api/llm/routes` — complete replacement, all routes present. Every `model` string belongs to its own route's
`provider`; no model name can reach a foreign provider (and `ModelRouter.routedModelFor()` enforces this
independently — a leaked model name 404s, and 404 is in `TERMINAL_CODES`, so the fallback would silently never
fire).

```json
{
  "defaultProvider": "anthropic",
  "routes": {
    "codegen": {
      "provider": "anthropic",
      "model": "claude-sonnet-5",
      "maxTokens": 6144,
      "useThinking": false,
      "fallback": ["gemini"]
    },
    "design": {
      "provider": "anthropic",
      "model": "claude-opus-4-8",
      "maxTokens": 8192,
      "useThinking": false,
      "fallback": ["gemini"]
    },
    "critic": {
      "provider": "anthropic",
      "model": "claude-haiku-4-5",
      "maxTokens": 1024,
      "useThinking": false,
      "fallback": ["gemini"]
    },
    "curriculum": {
      "provider": "anthropic",
      "model": "claude-haiku-4-5",
      "maxTokens": 512,
      "useThinking": false,
      "fallback": ["gemini"]
    },
    "chat": {
      "provider": "gemini",
      "model": "gemini-2.5-flash",
      "maxTokens": 512,
      "fallback": ["anthropic"]
    },
    "social": {
      "provider": "gemini",
      "model": "gemini-2.5-flash",
      "maxTokens": 256,
      "fallback": ["anthropic"]
    },
    "governance": {
      "provider": "anthropic",
      "model": "claude-opus-5",
      "maxTokens": 4096,
      "fallback": []
    },
    "embed": {
      "provider": "gemini",
      "fallback": []
    }
  }
}
```

**Companion change, required for the fallback costs in §8.3 to hold** — this is a *provider* update
(`POST /api/llm/providers`), not part of the routes payload:

```json
{ "name": "anthropic", "model": "claude-haiku-4-5", "maxConcurrentRequests": 3, "enabled": true }
```

Without it, every `gemini`-primary route that falls back to `anthropic` runs at opus-4-8's $5/$25 — 37× the
intended cost for ambient social.

**Also set the budget** (`PUT /api/llm/budget`): `{"dailyUsd": 170, "scope": "all"}` — see §7.5.

### 9.1 Deployment notes

- Per-route `model` is only honoured by the **working-tree** build of `src/ai/*` (`ModelRouter.withRouteModel()`
  → `LLMCallOptions.model` → `AnthropicClient:66` / `GeminiClient:25`). It was live from the 18:36 restart
  onward, which is why the 18:37–19:02 window shows genuine haiku pricing — but it is **uncommitted**
  (`git status` shows the `src/ai/*.ts` changes). Run `npm run build && sudo systemctl restart mc-fleet-bot`, and
  commit, before relying on this payload. On an older build the route models are ledger fiction: billed at the
  provider default, recorded as the route model.
- `route.maxTokens` **overrides** the call-site value (`ModelRouter.ts:387`,
  `const effectiveMaxTokens = route?.maxTokens ?? maxTokens`). The values above are sized from measured p99/max
  output (codegen p99 2,092 / max 3,165; critic max 389; curriculum max 127; chat max 141). Do not lower them
  further without re-measuring — `config.yml:83-87` documents the truncation failure this caused before.
- Only `gemini` and `anthropic` honour `options.model`. MiniMax, OpenAI, Ollama and Voyage received only
  `getModelId()`; none has a key configured, so this is not currently limiting.

---

## 10. Follow-ups, ranked by value

| # | change | value | effort |
|---|---|---|---|
| **F1** | `AnthropicClient.ts:29` — replace `CHARS_PER_TOKEN = 4` with a real token count (or ~2.6 for code-heavy prompts). Two measured false negatives today (§5) | **Unlocks the $78/day tier**: haiku codegen $0.01094 → $0.00584, breakeven `p` 0.128 → 0.079 | 1 line |
| **F2** | `AnthropicClient` — send an explicit `thinking` block so `RouteConfig.useThinking` means something on Anthropic. Today `ModelRouter.ts:228` only honours it for `codegen`, and only `GeminiClient` implements `generateWithThinking` | Makes opus-5 a safe drop-in for opus-4-8 at the same price; removes a silent +$240/day footgun | small |
| **F3** | Retag `CurriculumAgent.ts:536,566,589` → `curriculum`; `LlmDesigner.ts:333` → `design`; social sites → `social` | Makes cost attribution true; activates the `design` and `social` routes | 8 one-line edits |
| **F4** | Enable billing on the Gemini key | Restores the fallback chain (currently 3,159 × 429) and unlocks the $40/day floor tier | account change |
| **F5** | Raise the budget cap to $170 / `scope: "all"`, and alert on a *tripped* cap | The cap currently halts the fleet silently at 50 min | config |
| **F6** | Add ~200 chars of stable text to `CRITIC_SYSTEM_PROMPT` (3,907 → >4,096 chars) | Would make critic cacheable on opus-4-8/sonnet-5 — **only worth doing if critic ever moves off haiku**, since haiku's 4,096-*token* minimum makes it genuinely uncacheable there | 1 line |
| **F7** | Instrument per-model `p` (landed/attempted) on a dashboard tile | Every escalation decision in §3.3 depends on it; today it must be scraped from the log | small |

---

## Appendix A — reproducing the numbers

```bash
# Task-type mix and the 78.3% codegen figure (§2.2)
python3 -c "
import json,collections
d=json.load(open('data/token-ledger.json'))
a=collections.defaultdict(lambda:[0,0,0])
for r in d:
    x=a[r['taskType']]; x[0]+=1; x[1]+=r['inputTokens']; x[2]+=r['outputTokens']
T=sum(x[1] for x in a.values())
for k,x in sorted(a.items(),key=lambda y:-y[1][1]):
    print(f'{k:<12}{x[0]:>6}{x[1]:>11}{100*x[1]/T:>7.1f}%{x[2]:>10}')"

# Landing probability p, per era (§3.1)
python3 -c "
import re,collections
t=re.sub(r'\x1b\[[0-9;]*m','',open('/var/log/mc-fleet-bot.log',errors='ignore').read())
b=re.findall(r'\[(\d\d):\d\d:\d\d\] INFO \(\d+\): Voyager task evaluated\n((?:    \w+: .*\n)+)',t)
h=collections.defaultdict(collections.Counter)
for hh,blk in b: h[int(hh)][dict(re.findall(r'    (\w+): (.*)',blk)).get('success')]+=1
for k in sorted(h):
    c=h[k]; n=c['true']+c['false']
    print(f'{k:>3}h  n={n:<5} landed={c[\"true\"]:<4} p={100*c[\"true\"]/max(n,1):.1f}%')"

# Dead fallback (§2.3)
grep -oE "Gemini API [0-9]+" /var/log/mc-fleet-bot.log | sort | uniq -c

# True token counts behind the cache analysis (§5)
python3 -c "
import json
d=json.load(open('data/token-ledger.json'))
c=[r for r in d if r.get('cacheReadInputTokens',0)>0]
print('codegen cached prefix:',sorted({r['cacheReadInputTokens'] for r in c}))
print('haiku records with a cache read:',sum(1 for r in d if r['model']=='claude-haiku-4-5' and r.get('cacheReadInputTokens',0)>0))"
```

Per-call cost function used throughout (mirrors `TokenLedger.estimateCost`, `TokenLedger.ts:198-206`):

```
cost = (uncached_in × rate_in
      + cache_read  × rate_in × 0.1
      + cache_write × rate_in × 1.25
      + output      × rate_out) / 1e6
```
