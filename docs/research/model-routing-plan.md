# Cost-Optimal Model Routing Plan

**Date:** 2026-07-24
**Status:** Analysis only — no config or code changed, nothing PUT to the API.
**Data sources:** `data/token-ledger.json` (10,000 records), `GET /api/llm/usage`,
`src/ai/TokenLedger.ts` COST_PER_MILLION, `src/ai/ModelRouter.ts`, `src/ai/LLMSettings.ts`.

---

## 0. Three findings that change the plan before you read it

### 0.1 `route.model` works — but only in uncommitted code, and it poisons the fallback chain

Per-route model override was **historically ledger-only**: `LLMClient.chat()/.generate()`
took no model parameter, so a route's `model` was written to the ledger while the request
used whatever model the provider's client was built with — billing Opus rates and recording
Haiku ones, which under-counts spend and defeats the daily cap.

That is fixed in the **uncommitted working tree** (`git status` shows all 11 `src/ai/*.ts`
files modified). `LLMCallOptions` gained `model?: string`, `ModelRouter.withRouteModel()`
injects `RouteConfig.model` into the call options, and both `GeminiClient:25` and
`AnthropicClient:58` honor it via `const effectiveModel = options?.model ?? this.model`.
Two caveats:

**(a) Only gemini and anthropic honor it.** MiniMax, OpenAI, Ollama, and Voyage received
only a `getModelId()` method in the same changeset, not `options.model` support. Since those
four have no API key anyway, this is not currently limiting.

**(b) The route model leaks into fallback providers — a real bug.** `withRouteModel()` is
evaluated **once**, before `dispatch()`, and the resulting closure passes the same options
object to *every* provider in the chain:

```ts
const genOpts = this.withRouteModel(options, 'chat');       // computed once
return this.dispatch('generate', options, (client, mTokens) =>
  client.generate(systemPrompt, userMessage, mTokens, genOpts),   // same genOpts for all
  maxTokens,
);
```

So a route of `{provider: "gemini", model: "gemini-2.5-flash", fallback: ["anthropic"]}`
sends `{"model": "gemini-2.5-flash"}` to the **Anthropic** API on fallback. That returns
404, and `404 ∈ TERMINAL_CODES`, so `isRetryableError()` returns false and the fallback is
dead on arrival — every time. The premium safety net would look configured and never fire.

**Rule this imposes on the config in §3.3: never set `model` on a route that also has a
cross-provider `fallback`.** Omit it and each client uses its own configured model, with
`client.getModelId()` supplying an accurate ledger label. Routes without a cross-provider
fallback can set `model` freely.

**Deployment state:** `dist/ai/ModelRouter.js` was rebuilt at 18:30:55 and contains
`withRouteModel`; `mc-fleet-bot.service` restarted at **18:32:21**, after that build. The
running process therefore **does** honor `route.model` as of this writing. (It did not
earlier in this analysis — the service had been up since 18:11:30 — so if you are reading
stale notes, re-check `systemctl show mc-fleet-bot -p ActiveEnterTimestamp` against the
`dist/` mtime before trusting a route's `model` field.) The changes remain **uncommitted**;
a `git checkout` of `src/ai/` plus a rebuild would silently revert per-route model to
ledger-only and re-introduce the mis-pricing.

Note the obvious alternative workaround does **not** exist: registering `gemini` twice under
different names fails because `buildRouter` matches provider names exactly (`if (p.name ===
'gemini')`, `else if (p.name === 'anthropic')`, …), so a provider named `gemini-cheap`
builds no client and is silently skipped.

### 0.2 Only two providers have keys

`data/llm-settings.json` has exactly two enabled providers with keys: `gemini`
(`gemini-2.5-flash`) and `anthropic` (`claude-opus-4-8`). `.env` has only `GOOGLE_API_KEY`
and `ANTHROPIC_API_KEY`. No OpenAI, MiniMax, or Voyage key exists, so any plan involving
`gpt-5.6-luna` or `MiniMax-M3` requires procurement first. (Note `config.yml` comments
describe MiniMax-M3 as "the codegen brain" — that is stale; MiniMax is not wired.)

### 0.3 The ledger's own cost column is wrong, and the real call rate is ~3.4x the stated one

- `GET /api/llm/usage` reports `totalEstimatedCostUsd: $2.737` for the sample. That is
  fiction: 7,557 of 10,000 records store `model: "gemini"`, which is not a key in
  `COST_PER_MILLION`, so they priced at **$0**. Correctly priced, the same traffic is
  ~$4.70. All costs in this document are computed from raw token counts x rate card, not
  from that column.
- The ledger is a 10,000-record ring buffer (`MAX_RECORDS = 10000`) covering only
  **7.31 hours** (11:05–18:24 on 2026-07-24). The "~10,000 calls/day" planning figure
  appears to be a misreading of the buffer size. Full clock hours 12–17 average
  **1,422 calls/hour → ~34,120 calls/day** on a service that runs 24/7.

Every projection below is given at both rates. The mix percentages are stable across all
hours, so the routing conclusions hold either way; only the absolute totals move.

---

## 1. Per-task-type volume table

From the 10,000-record sample. Token stats are over **successful** calls only (failed calls
record 0 tokens, so including them would deflate the means).

| Task type  | Calls | % of calls | Mean in | Mean out | Sum in | Sum out | % of all input | Fail % |
|------------|------:|-----------:|--------:|---------:|-------:|--------:|---------------:|-------:|
| codegen    | 3,703 | 37.0% | 4,798 | 625 | 16,745,933 | 2,180,183 | **77.6%** | 5.8% |
| embed      | 2,261 | 22.6% |    19 |   0 |     43,794 |         0 |  0.2% | 0.0% |
| critic     | 1,747 | 17.5% | 1,317 | 127 |  2,189,778 |   211,397 | 10.2% | 4.8% |
| chat       | 1,218 | 12.2% |   334 |  45 |    360,370 |    48,790 |  1.7% | 11.5% |
| curriculum | 1,071 | 10.7% | 2,171 |  61 |  2,227,878 |    62,084 | 10.3% | 4.2% |
| **Total**  | 10,000 | 100% | — | — | 21,567,753 | 2,502,454 | 100% | 5.9% |

Output-token percentiles (these set the safe `maxTokens` caps in §3):

| Task type  | mean | p50 | p90 | p99 | max | current cap |
|------------|-----:|----:|----:|----:|----:|------------:|
| codegen    | 625 | 482 | 1,183 | 2,170 | 3,753 | 16,384 |
| critic     | 128 | 122 |   166 |   248 |   389 |  1,000 |
| curriculum |  61 |  59 |    73 |    91 |    97 |  1,000 |
| chat       |  45 |  41 |    68 |    88 |   109 |  2,048 |

### Capability judgement per task type

**codegen — 37% of calls, 78% of input tokens, 87% of output tokens. This is the whole
cost problem, and the one place quality genuinely matters.** It writes executable
JavaScript against the mineflayer API from a 14,037-char spec (`ACTION_SYSTEM_PROMPT`,
`src/voyager/ActionAgent.ts:23`). Bad code fails at runtime, the critic rejects it, and the
loop retries — so a cheaper model that fails more does not save money linearly, it burns
extra critic + codegen calls. This is the route to spend the budget on and the route to
watch after any downgrade.

**critic — 17.5%, 1,317 in / 127 out.** Reads a task + observed outcome and emits a
short structured success/failure verdict with a one-line critique. Classification with a
tight output shape; p99 output is 248 tokens. Frontier capability buys essentially nothing
here. Strong cheap-model candidate.

**curriculum — 10.7%, 2,171 in / 61 out.** Proposes the next task name given inventory and
completed-task history. 61 output tokens mean — it is picking a short string. The input is
large but the reasoning is shallow. Strong cheap-model candidate.

**chat — 12.2%, 334 in / 45 out.** In-game conversational replies with personality.
Smallest payload of any task type; total spend at frontier rates is only $3.02 per 10k
calls, so there is little to save, but also no quality argument for a premium model. Note
it carries the **highest failure rate at 11.5%**, worth a separate look — that is a
reliability bug, not a model-choice problem.

**embed — 22.6% of calls, 0.2% of tokens.** 19 input tokens, no output. Priced at
`gemini-embedding-001: {input: 0, output: 0}` in `COST_PER_MILLION`, i.e. **already free**
and already the cheapest possible route. There is nothing to optimize; the only action is
to pin the model string so the ledger stops mislabeling it. (Caveat: the $0 rate is an
assumption baked into the price table. Even at a paid $0.15/M rate this is $0.007 per 10k
calls — immaterial either way.)

---

## 2. Prompt-caching leverage — the hidden structure of the codegen bill

`AnthropicClient` wraps system prompts >= 4,096 chars in a `cache_control: {type:
'ephemeral'}` block (`src/ai/AnthropicClient.ts:17,44`). Measured prompt sizes:

| Prompt | Chars | >= 4096? | Cacheable |
|---|---:|:--:|:--|
| `ACTION_SYSTEM_PROMPT` (codegen) | 14,037 | yes | **cached** |
| `CRITIC_SYSTEM_PROMPT` | 3,908 | no | not cached — misses by 188 chars |
| `CURRICULUM_SYSTEM_PROMPT` | 1,225 | no | not cached |
| `PLAN_GENERATION_SYSTEM_PROMPT` | 1,076 | no | not cached |

The ledger confirms caching is live and shows exactly how much prefix it absorbs. Splitting
codegen by provider:

| Provider | codegen calls | mean input **as recorded** |
|---|---:|---:|
| gemini | 3,619 | 4,875 |
| anthropic | 84 | **1,677** |

Anthropic's `input_tokens` **excludes** `cache_read_input_tokens`, so the 3,198-token gap is
the cached `ACTION_SYSTEM_PROMPT` prefix being served at 10% of input rate. Two consequences:

1. **Codegen on Anthropic is ~36% cheaper than raw token counts imply.** Per call:
   1,677 fresh + 3,198 cached. On `claude-opus-4-8` that is
   `1,677x$5/M + 3,198x$0.50/M + 625x$25/M = $0.0084 + $0.0016 + $0.0156 = $0.0256`,
   versus $0.0400 uncached. Cache *writes* (1.25x) are negligible: the prefix is a module
   constant, codegen runs ~500/hour, so the 5-minute ephemeral TTL never expires during
   operation — roughly 88 writes per 7.3h window, under $0.002 total.
2. **`ModelRouter` drops the cache fields on the floor.** `LLMResponse` carries
   `cacheCreationInputTokens` / `cacheReadInputTokens`, but `dispatch()` records only
   `response.inputTokens ?? 0`. So Anthropic rows under-report real billed input by ~65%,
   and the daily budget cap under-counts Anthropic spend by the same margin. Worth fixing
   independently of routing (Appendix A).

**The generalized lever:** that 3,198-token static prefix is `11.16M tokens per 10k calls`
— **67% of all codegen input and 52% of the entire fleet's input tokens.** The single
largest line item in this system is re-sending the same 14KB prompt ~3,500 times a day.
`GeminiClient` implements no explicit caching (no `cachedContent` usage), though Gemini 2.5
models apply *implicit* caching automatically to repeated prefixes above ~1–2k tokens at a
75% discount. If that fires, codegen on `gemini-2.5-flash` drops from $3.82 to **$2.56 per
10k calls (-33%)**. Treat it as upside, not as a number to bank — verify against a Gemini
billing export, since the ledger cannot see it.

---

## 3. Recommended routing

### 3.1 Baseline: what the current config costs

Today `defaultProvider: "anthropic"`, `routes: {}`, so every task type hits
`claude-opus-4-8` at $5/M in, $25/M out.

```
codegen    (with prompt cache, 3,490 ok calls):
  fresh   (16,745,933 - 3,198x3,490 = 5,585,913) x $5/M   = $27.93
  cached  (3,198 x 3,490 = 11,160,020)          x $0.50/M =  $5.58
  output   2,180,183                            x $25/M   = $54.50
                                                            -------
                                                             $88.01
critic       2,189,778 x $5/M +   211,397 x $25/M           = $16.23
curriculum   2,227,878 x $5/M +    62,084 x $25/M           = $12.69
chat           360,370 x $5/M +    48,790 x $25/M           =  $3.02
embed        (routes to gemini embeddings regardless)       =  $0.00
                                                            -------
TOTAL                                                        $119.96 per 10,000 calls
```

- @ 10,000 calls/day (stated): **$119.96/day** — 12.0x over the $10 cap.
- @ 34,120 calls/day (observed): **$409.29/day** — 41x over.

The 12.0x figure reproduces the operator's stated 12x shortfall almost exactly, which is a
good cross-check that this cost model is calibrated. Note that without prompt caching the
same traffic would be $170.40/10k — caching is already saving 30%.

### 3.2 Candidate costs per 10,000 calls

Codegen (the only route where the choice is material):

| Model | Rate ($/M in-out) | Cost, no cache | Cost, w/ cache | Key available? |
|---|---|---:|---:|:--:|
| claude-opus-4-8 | 5 / 25 | $138.23 | **$88.01** | yes |
| claude-sonnet-5 | 3 / 15 | $82.94 | **$52.81** | yes (needs client model change) |
| gemini-3.5-flash | 1.50 / 9 | $44.74 | — | yes (needs client model change) |
| gpt-5.6-luna | 1 / 6 | $29.83 | — | **no key** |
| claude-haiku-4-5 | 1 / 5 | $27.65 | **$17.60** | yes (needs client model change) |
| MiniMax-M3 | 0.30 / 1.20 | $7.64 | — | **no key** |
| **gemini-2.5-flash** | 0.15 / 0.60 | **$3.82** | $2.56 (implicit) | **yes, live now** |
| gemini-2.0-flash | 0.10 / 0.40 | $2.55 | — | yes, routable after restart |

Note `gemini-3.5-flash` is **not** a cheap model — at $1.50/$9.00 it costs 12x
`gemini-2.5-flash`. The `COST_PER_MILLION` comment warns about exactly this confusion.

Non-codegen routes:

| Task | opus-4-8 | haiku-4-5 | gemini-2.5-flash | gemini-2.0-flash |
|---|---:|---:|---:|---:|
| critic | $16.234 | $3.247 | $0.455 | $0.304 |
| curriculum | $12.691 | $2.538 | $0.371 | $0.248 |
| chat | $3.022 | $0.604 | $0.083 | $0.056 |
| embed | $0.219 | $0.044 | $0.007 | $0.004 |

The three non-codegen text routes together cost **$0.91 per 10k calls on Gemini Flash**
versus $31.95 on Opus. That is a 35x reduction on 40% of all calls for essentially no
quality exposure, and it is the easiest win in this document.

### 3.3 Recommended routes JSON

This is the exact body to `PUT /api/llm/routes`. It follows the §0.1 rule: `codegen` has a
cross-provider fallback so it **omits `model`** (falling back to the `gemini` client's own
`gemini-2.5-flash`, which is what we want anyway, and letting the Anthropic fallback
actually work); the other routes have no cross-provider fallback so they set `model`
explicitly and drop to the cheaper `gemini-2.0-flash`.

```json
{
  "codegen": {
    "provider": "gemini",
    "maxTokens": 4096,
    "fallback": ["anthropic"]
  },
  "critic": {
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "maxTokens": 512
  },
  "curriculum": {
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "maxTokens": 256
  },
  "chat": {
    "provider": "gemini",
    "model": "gemini-2.0-flash",
    "maxTokens": 256
  },
  "embed": {
    "provider": "gemini",
    "model": "gemini-embedding-001"
  }
}
```

**Prerequisite (already satisfied):** the running process must include the `withRouteModel`
build — it does, as of the 18:32:21 restart (§0.1). If the service is ever rolled back to a
build without it, the three `gemini-2.0-flash` routes would execute on `gemini-2.5-flash`
while *recording* 2.0 rates — a 33% under-count that also weakens the budget cap. The §3.3b
variant below is immune to that and is the safer choice if the `src/ai/` changes might be
reverted before they are committed.

`embed` is safe to label: `ModelRouter.embed()` calls `client.embed(texts)`, which takes no
options, so `model` there is a pure ledger label and `GeminiClient.embed` hardcodes
`models/gemini-embedding-001` regardless.

**Also required:** set `defaultProvider` to `"gemini"`. It is currently `"anthropic"`, and
`dispatch()` appends the default to every provider chain — leaving it as `anthropic` makes
Opus the universal fallback for all five routes.

`maxTokens` notes — `dispatch()` uses `route?.maxTokens ?? maxTokens`, so a route cap
**overrides** the call site. Caps are set above p99 with headroom (codegen 4,096 vs 3,753
observed max; critic 512 vs 389; curriculum 256 vs 97; chat 256 vs 109). These do not reduce
average cost — you bill actual output — but they bound tail risk, which matters more after a
downgrade because small models are the ones that ramble or loop. The codegen cap also
replaces the current 16,384 (`config.yml: codeGenMaxTokens`), which was raised for
MiniMax-M3's chain-of-thought and is 4x larger than anything Gemini has ever emitted here.

**Projected cost:**

```
codegen     gemini-2.5-flash   16,745,933 x $0.15/M + 2,180,183 x $0.60/M = $3.820
critic      gemini-2.0-flash    2,189,778 x $0.10/M +   211,397 x $0.40/M = $0.304
curriculum  gemini-2.0-flash    2,227,878 x $0.10/M +    62,084 x $0.40/M = $0.248
chat        gemini-2.0-flash      360,370 x $0.10/M +    48,790 x $0.40/M = $0.056
embed       gemini-embedding-001                                          = $0.000
                                                                            ------
TOTAL                                                                       $4.43 per 10,000 calls
```

| Scenario | Before | After | Reduction |
|---|---:|---:|---:|
| @ 10,000 calls/day (stated) | $119.96/day | **$4.43/day** | **27.1x** |
| @ 34,120 calls/day (observed) | $409.29/day | **$15.11/day** | 27.1x |
| @ 34,120/day, if Gemini implicit caching fires on codegen | — | ~$10.8/day | 37.9x |

At $4.43/10k, the $10/day cap buys **22,600 calls/day**.

**§3.3b — restart-independent variant.** Drop the three `model` fields (everything runs on
the `gemini` client's `gemini-2.5-flash`). This is correct whether or not the service has
been restarted, and costs $4.73/10k → **$4.73/day** at 10k, $16.13/day at observed volume.
The $0.30/10k difference is 6% — take this variant if you want zero coupling to the
uncommitted `src/ai/` changes, and move to §3.3 after those changes are committed and
deployed.

### 3.4 The volume problem

At the stated 10k calls/day this config lands at $4.43 — comfortably under the $10 cap with
2.3x headroom. **At the observed 34,120 calls/day it lands at $15.11 — still 51% over the
cap**, even with every route on the cheapest live model. Routing alone cannot close that
gap; the remaining levers are volume and prompt size, not model choice:

1. **Confirm the real rate first.** Everything downstream depends on whether 34k/day is
   sustained or an artifact of a busy afternoon. Watch `/api/llm/usage` across a full 24h.
2. **Cut the static prefix.** The 14,037-char `ACTION_SYSTEM_PROMPT` is 52% of all fleet
   input tokens. Either verify Gemini implicit caching is discounting it (-33% on codegen),
   wire explicit Gemini `cachedContent`, or trim the prompt. Trimming it to 7KB would cut
   ~$2.8/day at observed volume — comparable to any remaining model downgrade.
3. **Cut codegen retries.** 5.8% of codegen calls fail outright, and each critic rejection
   costs another codegen + critic round trip. Skill-library reuse is the intended mechanism.
4. **Fix the 11.5% chat failure rate** — 140 wasted calls per 10k.
5. Only then consider `gemini-2.0-flash` for codegen ($2.55/10k → ~$10.78/day at observed
   volume). This is the last resort, not the first move: it is the biggest quality risk in
   the document for a $5/day saving.

### 3.5 The escalation route you cannot express today

The natural design — cheap model writes code, premium model retries what the critic
rejects — **cannot be expressed in `routes`**. `fallback` triggers only on provider
*transport* errors (`isRetryableError`: 429/5xx/timeouts), never on a semantic quality
failure. The critic's verdict lives in `src/voyager/CriticAgent.ts` and never reaches the
router.

What the recommended config *does* give you is a useful approximation: `codegen.fallback:
["anthropic"]` catches Gemini transport failures with Opus, and because
`budget.scope === "anthropic"` with `dailyUsd: 10`, `isPaidCallAllowed()` automatically
drops Anthropic from the chain once the cap is hit. Cheap primary, premium error-fallback,
hard-gated by the cap. Costed at the observed 5.8% codegen failure rate (205 calls per 10k):

| Fallback model | Per-call (cached) | Added per 10k | New total | @ 34.1k/day |
|---|---:|---:|---:|---:|
| claude-opus-4-8 | $0.02561 | $5.25 | $9.98 | $34.05 |
| claude-haiku-4-5 | $0.00512 | $1.05 | $5.78 | $19.72 |

At the stated 10k/day, Opus-as-fallback fits the cap ($9.98). At observed volume it does
not — which is precisely what the budget cap will enforce for you.

Note the fallback model is **not** selectable from the route today: because of the §0.1(b)
leak you must omit `model` on the codegen route, so the Anthropic fallback runs whatever
`llm-settings.json` gives the anthropic client — currently `claude-opus-4-8`, the expensive
row above. Getting the cheap Haiku fallback requires either fixing the leak (Appendix A) or
changing the anthropic provider's configured model to `claude-haiku-4-5`, which would also
demote it everywhere else it is used.

### 3.6 If a third provider key is ever added

`MiniMax-M3` at $0.30/$1.20 is the only unwired model that would meaningfully change the
picture for codegen ($7.64/10k — 2x Gemini Flash but a genuine coding model, and
`config.yml` already sizes `codeGenMaxTokens: 16384` for its chain-of-thought output). It
would need an API key, a `minimax` provider entry, and `options.model` support in
`MiniMaxClient` (it currently has only `getModelId()`). Worth evaluating only if the
Gemini Flash codegen quality in §5 proves inadequate.

---

## 4. Local Ollama offload — not viable on this host

**Ollama is not installed.** No binary on `PATH`, no systemd unit, nothing listening on
11434, `curl localhost:11434/api/tags` refuses. The `OllamaClient` is wired into
`buildRouter` but no `ollama` provider entry exists in `llm-settings.json`.

**Host capacity:**

| Resource | Value |
|---|---|
| CPU | Intel Xeon E5-2680 v4 @ 2.40GHz, **2 vCPU**, 1 thread/core |
| RAM | 7 GB total, ~5 GB available |
| GPU | **None** — VMware SVGA II virtual adapter, no CUDA |
| Disk | 49 GB free |
| Load average | **5.99 / 4.52 / 3.85** |

That load average is the decisive number: a 2-core box already running at **3x
oversubscription** from the mineflayer fleet, the bot API, and the Next.js dashboard. There
are no spare cycles to give an inference engine.

**Feasibility per task type** (CPU-only 3B Q4 on 2 contended cores: ~20–40 tok/s prefill,
~3–6 tok/s generation):

| Task | Prefill | Generate | Est. latency | vs 30s client timeout | Verdict |
|---|---|---|---|---|---|
| codegen | 4,875 tok | 625 tok | **3–6 min** | times out every call | impossible |
| critic | 1,317 tok | 128 tok | 60–90 s | times out | impossible |
| curriculum | 2,171 tok | 61 tok | 70–110 s | times out | impossible |
| chat | 334 tok | 45 tok | 10–20 s | marginal | technically possible |
| embed | 19 tok | 0 | ~1 s | fine | pointless — already $0 |

`buildRouter` constructs `OllamaClient` with `timeoutMs: 30000`, so codegen, critic, and
curriculum would fail on **every** call, and `isRetryableError` treats timeouts as
retryable — meaning each one burns 4 attempts before falling through. Local offload would
*increase* cost by adding latency and retries before the paid call happens anyway.

**Fraction of daily calls that could run locally: ~12% (chat only), saving $0.083 per 10k
calls — about $0.28/day at observed volume.** That is the entire economic case, and it buys
a 10–20 second in-game reply latency against the current 1.9s average, on a model
(`llama3.2:3b`) with no personality-consistency guarantees, while stealing CPU from the
mineflayer physics and pathfinding ticks that keep the bots functional.

**Recommendation: do not deploy Ollama on this host.** The deeper point is that the Gemini
Flash tiering in §3.3 already reduces all non-codegen work to **$0.91 per 10k calls
(~$3.10/day at observed volume)**. Local inference cannot meaningfully beat "already nearly
free," and the only route with real money in it — codegen — is exactly the one a 3B CPU
model cannot serve on quality *or* latency. Even with a dedicated GPU box, the ceiling on
this strategy is ~$3/day. Spend the effort on the volume levers in §3.4 instead.

---

## 5. Quality-risk notes per route

| Route | Change | Risk | Mitigation / signal to watch |
|---|---|---|---|
| **codegen** | opus-4-8 → gemini-2.5-flash | **High — the one that matters.** Frontier → mid-tier on the only task where output correctness is externally validated. Expect the 5.8% hard-failure rate and the critic rejection rate to rise. Failures are not free: each costs another codegen + critic round trip, so a large enough quality drop eats the savings. | Baseline `grep -c "Execution result.*fail" /var/log/mc-fleet-bot.log` and the critic pass rate for 24h **before** switching. If the failure rate roughly doubles (>12%), escalate to `gemini-3.5-flash` ($44.74/10k) or `claude-haiku-4-5` w/ cache ($17.60/10k) — note both would require dropping `fallback` or fixing the §0.1(b) leak first. Keep `fallback: ["anthropic"]`. |
| **critic** | opus-4-8 → gemini-2.0-flash | **Low-moderate.** Short structured verdict; well within Flash capability. The real risk is *correlated* failure: a weaker critic that rubber-stamps bad code silently degrades the whole Voyager loop, and it is the component least likely to complain. | Watch for the pass rate climbing while runtime failures also climb — that divergence is the signature of a broken critic. Sample ~20 verdicts by hand after the switch. Keep `maxTokens: 512` (p99 = 248) so a truncated JSON verdict never masquerades as a parse failure. |
| **curriculum** | opus-4-8 → gemini-2.0-flash | **Low.** 61 output tokens — it selects a short task string. Degradation shows up as less diverse or repetitive task proposals rather than errors. | Watch `grep "task proposed" /var/log/mc-fleet-bot.log` for repetition loops. Cheap to revert; only $12.69/10k to put back on Opus. |
| **chat** | opus-4-8 → gemini-2.0-flash | **Low, cosmetic.** Player-visible personality quality may soften. No functional dependency. | Total spend here is $3.02/10k at frontier rates — if players complain, this is the cheapest route to restore. Separately: the 11.5% failure rate is pre-existing and unrelated to model choice. |
| **embed** | pin `gemini-embedding-001` | **None.** Already the model in use; this only fixes the ledger label. | Verify the $0/$0 rate in `COST_PER_MILLION` against a real Gemini bill. |
| **all** | `defaultProvider` → `gemini` | **Low, but load-bearing.** Without it every route keeps Opus as an implicit final fallback and the savings leak. | Confirm via `GET /api/llm/usage` `byProvider` that Anthropic calls drop to near zero. |
| **all** | route `maxTokens` caps | **Low.** All caps sit above observed p99 with headroom. | If truncation appears, the symptom is malformed JSON / unterminated code. Raise the specific cap; do not remove caps globally. |

**Rollback:** `PUT /api/llm/routes` with `{}` and set `defaultProvider` back to
`anthropic`. Routing is hot-reloadable (`buildRouter()` re-runs, listener re-applied), so
reverting needs no restart.

---

## Appendix A — follow-up fixes (not applied)

Steps 1–2 of the original per-route-model patch are **already done** in the uncommitted
`src/ai/` working set (§0.1). What remains:

1. **Fix the fallback model leak — highest priority, it silently breaks every premium
   safety net.** `withRouteModel()` is evaluated once outside the provider loop
   (`ModelRouter.ts`, `chat()`/`generate()`), so the primary provider's model string is sent
   to fallback providers too, producing a terminal 404. Move the override inside
   `dispatch()`'s provider loop and apply `route.model` **only when `providerName ===
   route.provider`**, leaving fallbacks on their client-configured model. Until this lands,
   `model` and a cross-provider `fallback` are mutually exclusive in a route.
2. **Guard the mispricing footgun:** on `PUT /api/llm/routes`, reject any route whose
   `model` is absent from `COST_PER_MILLION`, so a typo cannot silently zero a route's cost
   and disable the budget cap.
3. **Extend `options.model` support to the remaining clients** (MiniMax, OpenAI, Ollama,
   Voyage). They got `getModelId()` but not the override, so per-route model silently
   no-ops on them — the same class of bug that was just fixed for Gemini/Anthropic.
4. **Record cache tokens.** `dispatch()` drops `cacheCreationInputTokens` /
   `cacheReadInputTokens` from `LLMResponse`. Add them to `TokenUsageRecord` and price at
   1.25x / 0.10x input. Today Anthropic rows under-report billed input by ~65% (§2) and the
   daily cap under-counts by the same margin.
5. **Consider caching the critic prompt.** `CRITIC_SYSTEM_PROMPT` is 3,908 chars — 188 short
   of `CACHEABLE_SYSTEM_THRESHOLD_CHARS`. It is also just under Anthropic's ~1024-token
   caching minimum, so padding it alone would not help; it would need real content growth to
   become cacheable. Only relevant if critic ever moves back to Anthropic.
6. **Backfill or ignore the `model: "gemini"` rows.** 7,557 of 10,000 records price at $0
   because the model string is a provider name (fixed going forward by the `getModelId()`
   fallback, but the historical rows still poison `/api/llm/usage`).
