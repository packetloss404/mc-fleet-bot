# Models & Routing — dedicated page design

**Status:** design only. Nothing in `web/` is modified by this document.
**Target route:** `/models` (Next.js App Router, `web/src/app/models/page.tsx`)
**Replaces:** the `ai` tab inside `web/src/app/settings/page.tsx` (lines 206–1030)
**Date:** 2026-07-24
**Author:** research/design pass

---

## 0. Why this is not a cosmetic port

Before designing anything I read the backend and then queried the **live** system.
The live state is not hypothetical, and it invalidates the way the current tab
presents itself. Everything below is grounded in these observations.

```
GET /api/llm/budget
{"budget":{"dailyUsd":10,"scope":"anthropic","override":false,"idleThrottle":false},
 "spendTodayUsd":{"anthropic":10.1836,"total":10.1861},
 "codegenPaidAllowed":false}
```

```
GET /api/llm/providers
providers: gemini(gemini-2.5-flash, enabled), anthropic(claude-opus-4-8, enabled)
defaultProvider: anthropic
routes:
  codegen    -> anthropic / claude-opus-4-8   fallback [gemini]
  critic     -> anthropic / claude-haiku-4-5  fallback [gemini]
  curriculum -> anthropic / claude-haiku-4-5  fallback [gemini]
  chat       -> anthropic / claude-haiku-4-5  fallback [gemini]
  embed      -> gemini    / (none)            fallback [anthropic]
```

Direct analysis of `data/token-ledger.json` (10,000 records, the full buffer,
spanning only **2026-07-24 13:25 → 20:28**):

| model recorded | calls | input tok | output tok | est. cost | success | avg latency |
|---|---:|---:|---:|---:|---:|---:|
| `claude-opus-4-8`  | 475  | 800,945    | 218,863   | $9.7008 | 100% | 7400 ms |
| `claude-haiku-4-5` | 281  | 300,608    | 36,429    | $0.4828 | 100% | 3444 ms |
| `gemini-2.5-flash` | 2895 | 15,704     | 290       | $0.0025 | **24%** | 102 ms |
| `embedding`        | 1216 | 24,096     | 0         | **$0.0000** | 100% | 194 ms |
| `gemini`           | 5133 | 14,640,425 | 1,708,176 | **$0.0000** | 90% | 2347 ms |

Five findings that the page must be designed *around*, not decorated with:

1. **The cap is tripped and the fleet did not stop.** `codegenPaidAllowed:false`.
   `ModelRouter.dispatch` does not halt — it *filters governed providers out of
   the chain* (lines 374–386) and proceeds on the fallbacks. Only if the entire
   chain is governed does it throw `BudgetCappedError`. So the honest headline is
   **"Anthropic is refused; every task has silently degraded to Gemini"**, not
   "AI stopped."
2. **The degraded path is failing.** `gemini-2.5-flash` is succeeding on **24%**
   of calls at 102 ms average — the signature of fast rejections, not work. The
   safety net the cap falls back onto is mostly dead, and nothing in the current
   UI could tell you that. This single fact justifies the whole page.
3. **16.3M tokens are priced at $0.00.** `gemini` (5133 calls) and `embedding`
   (1216 calls) are model IDs absent from `COST_PER_MILLION`, so
   `TokenLedger.estimateCost` returns `0` (line 201: `if (!rates) return 0`).
   Cost displays must never render a bare `$0.00` for an unpriced model — that is
   indistinguishable from "free" and is how a cap silently under-counts.
4. **`byBot` is permanently empty.** All 10,000 records have `botName: ''`, so
   `usage.byBot` is `{}` and `GET /api/bots/:name/llm-trace` (which filters on
   `botName`) returns nothing for every bot. Per-bot attribution does not exist.
5. **`/api/llm/usage` totals are a 10k circular buffer, not "today."**
   `MAX_RECORDS = 10000`. Today the buffer happens to hold only today, so
   `totalEstimatedCostUsd` ($10.1861) coincidentally equals
   `spendTodayUsd.total` ($10.1861). That is an accident of saturation. At higher
   volume the buffer will silently truncate today. **The page must never source a
   "today" number from `/api/llm/usage`.**

And the restart claim in the brief is real. Mechanism, exactly:

- `BotManager` constructs each `WorkerHandle` with `this.llmClient`
  (`src/bot/BotManager.ts:199`), passing the **object reference**.
- `WorkerHandle` stores it (`this.llmClient = llmClient`, line ~148) and every
  bot LLM call proxies back over IPC to `this.llmClient.generate(...)`
  (`WorkerHandle.ts:209–220`).
- `POST /api/llm/reload` reassigns the **field**:
  `(botManager as any).llmClient = router` (`llmRoutes.ts:82`). Live
  `WorkerHandle`s still hold the *old* `ModelRouter`, with the old `routes` Map
  frozen in its constructor (`ModelRouter.ts:170–175`).
- Worse: `PUT /api/llm/routes` (`llmRoutes.ts:64–74`) calls `setRoutes()` and
  **never rebuilds the router at all**. So a saved route is not live even on the
  main thread until someone separately hits `/api/llm/reload`.

Net: **saved routes reach nothing that matters until `systemctl restart
mc-fleet-bot`.** (Corroborated on the host: `dist/` was rebuilt at 20:26:32 while
the running unit started at 19:56:29 — the live process is older than the build.)

---

## 1. Page structure

### 1.1 Route and navigation

| | |
|---|---|
| Path | `/models` |
| File | `web/src/app/models/page.tsx` |
| Sidebar | New `NAV_ITEMS` entry **"Models & Routing"**, placed directly above **Settings**, icon = a 3-node routing fork |
| Settings tab | The `ai` tab is *kept* but reduced to a single card: "Provider, routing and spend controls have moved." + `<Link href="/models">`. `?tab=ai` therefore never 404s for a bookmarked URL. |
| Badge | Sidebar badge shows a red dot whenever `codegenPaidAllowed === false` **or** `aiEnabled === false` |

### 1.2 Component tree

```
app/models/page.tsx                        server component: <Suspense> + skeleton
└── ModelsRoutingPage                      'use client' — owns all state
    │
    ├── PageHeader "Models & Routing"
    │   └── HeaderPills                    aiEnabled · cap state · router freshness
    │
    ├── SafetyBanner                       conditional, full-bleed, top of content
    │   ├── CapTrippedBanner               budget exceeded (THE state, see §5)
    │   ├── KillSwitchBanner               aiEnabled === false
    │   ├── OverrideBanner                 budget.override === true
    │   └── StaleRouterBanner              routes saved since last process start
    │
    ├── SpendPanel                                                        [§4]
    │   ├── SpendMeter                     today vs cap — meter, not a chart
    │   ├── KpiRow
    │   │   ├── StatTile "Spent today"
    │   │   ├── StatTile "Burn rate"
    │   │   ├── StatTile "Projected today"
    │   │   └── StatTile "Cache hit rate"
    │   └── BudgetControls                 cap $, scope, idleThrottle, override
    │
    ├── RoutingMatrix                      ★ core of the page                [§3]
    │   ├── MatrixHeader                   column legend + "Configured/Effective"
    │   ├── RouteRow × 5                   codegen curriculum critic chat embed
    │   │   ├── TaskTypeCell
    │   │   ├── ProviderSelect
    │   │   ├── ModelSelect                constrained to provider (§3.2)
    │   │   ├── EffortCell                 maxTokens · temperature · thinking
    │   │   ├── FallbackChainEditor        ordered, add/remove/reorder
    │   │   ├── EffectiveChainPreview      what the router does RIGHT NOW (§3.3)
    │   │   └── RouteCostCell              $/1M + modelled $/call
    │   └── RouteSaveBar                   validation summary · save · reload · restart
    │
    ├── ProvidersPanel                                                     [§2]
    │   ├── ProviderCard × N               health · key · model · concurrency
    │   └── AddProviderForm                write-only key entry
    │
    ├── CostBreakdown                                                      [§4.4]
    │   ├── CostByTaskTypeChart            horizontal bars, one hue
    │   ├── CostByModelChart               horizontal bars + unpriced flag
    │   └── ReliabilityTable               calls · success% · latency by model
    │
    └── ModelCatalogTable                  rate card + "used by" backlinks    [§6]
```

Reused existing primitives (do not re-implement): `PageHeader`,
`ui/StatCard`, `ui/ProgressBar`, `ui/StatusBadge`, `Toast`, `ErrorBoundary`,
`SkeletonLoader`.

### 1.3 Full-page wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard / Models & Routing                                                      │
│ Models & Routing                          [● AI ON] [▲ CAP TRIPPED] [⟳ STALE]     │
│ Providers, per-task routing, and spend.                                           │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ╔══════════════════════════════════════════════════════════════════════════════╗ │
│ ║ ▲  DAILY CAP REACHED — paid calls are being refused                          ║ │
│ ║    $10.18 of $10.00 spent on Anthropic today. Anthropic is dropped from      ║ │
│ ║    every route chain; 4 of 5 task types are running on their fallback.       ║ │
│ ║    ⚠ codegen's fallback (gemini · gemini-2.5-flash) is succeeding on 24%     ║ │
│ ║      of calls. The degraded path is not healthy.                             ║ │
│ ║    [ Raise cap… ]  [ Go hog wild (bypass) ]  [ Turn AI off ]                 ║ │
│ ╚══════════════════════════════════════════════════════════════════════════════╝ │
├──────────────────────────────────────────────────────────────────────────────────┤
│ SPEND                                                              scope: Anthropic│
│                                                                                   │
│  $10.18 ───────────────────────────────────────────────────────────── of $10.00   │
│  ████████████████████████████████████████████████████████████████████▌▌  102%     │
│  0                                                                    cap ↑       │
│                                                                                   │
│  ┌────────────┬────────────┬────────────┬────────────┐                            │
│  │SPENT TODAY │ BURN RATE  │ PROJECTED  │ CACHE HITS │                            │
│  │  $10.18    │ $1.44 /hr  │  $15.20    │    29%     │                            │
│  │ Anthropic  │ last 12 min│ at midnight│ of input   │                            │
│  └────────────┴────────────┴────────────┴────────────┘                            │
│                                                                                   │
│  Daily cap [ 10.00 ] [Set]   Scope [Anthropic ▾]   ☐ Idle throttle   Override(○ )  │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ROUTING                                        [Show effective ▾] [Save] [Restart]│
│  (see §3 wireframe)                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ PROVIDERS                                                            [+ Add]      │
│  (see §2 wireframe)                                                               │
├──────────────────────────────────────────────────────────────────────────────────┤
│ COST BREAKDOWN            window: last 10,000 calls (13:25–20:28) ⓘ not "today"   │
│  (see §4.4 wireframe)                                                             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ MODEL CATALOG                                                                     │
│  (see §6 wireframe)                                                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Provider management

### 2.1 Data

`GET /api/llm/providers` returns the whole settings blob. Note it is *not* just
providers — it carries `routes`, `defaultProvider`, `aiEnabled` and `budget` too,
so it is the page's single structural read.

```ts
// GET /api/llm/providers  →  200
{
  providers: [
    { name: 'gemini',    model: 'gemini-2.5-flash',  maxConcurrentRequests: 3, enabled: true, keyMasked: 'AIzaSy...XIc4' },
    { name: 'anthropic', model: 'claude-opus-4-8',   maxConcurrentRequests: 3, enabled: true, keyMasked: 'sk-ant...BAAA' },
  ],
  routes: Record<TaskType, RouteConfig>,
  defaultProvider: 'anthropic',
  aiEnabled: true,
  budget: { dailyUsd: 10, scope: 'anthropic', override: false, idleThrottle: false },
}
```

`apiKey` is **stripped server-side** (`LLMSettings.getSettings()` destructures it
out and emits only `keyMasked`). The page therefore has no raw key to display and
**must not** contain a reveal affordance, a "copy key" button, or a text input
pre-filled from the server. Key entry is write-only.

### 2.2 Provider card

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ● anthropic                                            ◉ enabled   [⋯]     │
│   default model  claude-opus-4-8            $5.00 / $25.00 per 1M          │
│   key            sk-ant...BAAA   [Replace key]                             │
│   concurrency    [ 3 ]  simultaneous requests                              │
│                                                                            │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │ HEALTH   756 calls · 100% ok · 3.4–7.4 s   ▲ refused by cap       │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│   used by  codegen · curriculum · critic · chat   + fallback for embed      │
└────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ ● gemini                                               ◉ enabled   [⋯]     │
│   default model  gemini-2.5-flash           $0.15 / $0.60 per 1M           │
│   key            AIzaSy...XIc4   [Replace key]                             │
│   concurrency    [ 3 ]                                                     │
│                                                                            │
│   ┌──────────────────────────────────────────────────────────────────┐     │
│   │ HEALTH   8028 calls · ▲ 24% ok on gemini-2.5-flash · 102 ms       │     │
│   │          A 24% success rate means this fallback is mostly dead.   │     │
│   └──────────────────────────────────────────────────────────────────┘     │
│   used by  embed   + fallback for codegen · curriculum · critic · chat      │
└────────────────────────────────────────────────────────────────────────────┘
┌ not configured ───────────────────────────────────────────────────────────┐
│ ○ openai      · minimax · voyage (embeddings) · ollama (local)             │
│   [+ Add API key]                                              get key ↗   │
└────────────────────────────────────────────────────────────────────────────┘
```

**"Health" is derived, not fetched.** There is no provider-health endpoint (gap
G7). The card computes health by folding `usage.byProvider` plus a client-side
per-model rollup, and labels it *observed*, never *live*. The three states:

| State | Rule | Presentation |
|---|---|---|
| Healthy | ≥ 90% success over ≥ 20 calls | green dot + "n calls · n% ok" |
| Degraded | 50–89% success, or a governed provider currently refused by the cap | amber dot + reason text |
| Failing | < 50% success over ≥ 20 calls | red dot + "mostly dead" copy |
| Unknown | < 20 calls in the buffer | gray dot + "not enough calls" |

The "used by" line is computed from `routes` and makes deletion consequences
visible: removing a provider that a route points at is what turns a chain into a
silent no-op (§3.3).

### 2.3 Key entry (write-only)

```
Add / replace provider
┌──────────────────────────────────────────────────────────────────────────┐
│ Provider  [ anthropic ▾ ]        Default model [ claude-opus-4-8    ▾ ]  │
│ API key   [ ················· ]  ⓘ write-only — never displayed back     │
│           Get a key: console.anthropic.com ↗                             │
│ Max concurrent requests [ 3 ]                                            │
│                                              [ Cancel ]  [ Save & load ] │
└──────────────────────────────────────────────────────────────────────────┘
```

- `type="password"`, `autoComplete="off"`, `spellCheck={false}`, never mirrored
  into any other state slice, cleared from React state the moment the POST
  resolves.
- **Empty key on an existing provider = keep the current key.** This is real
  backend behaviour (`LLMSettings.upsertProvider` lines 121–124) and the form
  must say so, because otherwise operators retype keys to change concurrency.
  Placeholder when editing: *"leave blank to keep the existing key"*.
- Ollama needs no key: the field disables with "Not required (local)".
- On success the page immediately fires `POST /api/llm/reload` (matching the
  existing tab's behaviour) so a *new provider* is usable on the main thread
  without a restart. This is the one mutation where reload is genuinely
  sufficient for new bots; the banner in §5.3 still governs live bots.

### 2.4 Wire shapes

```ts
// POST /api/llm/providers                       (upsert; also used by enable/disable)
→ { name: string, apiKey: string, model: string,
    maxConcurrentRequests: number, enabled: boolean }
← { success: true, settings: Settings }          // 400 { error } if name missing

// enable/disable toggle re-POSTs the whole record with apiKey:'' to preserve the key
→ { name:'gemini', apiKey:'', model:'gemini-2.5-flash', maxConcurrentRequests:3, enabled:false }

// DELETE /api/llm/providers/:name
← { success: true }                              // 404 { error:'Provider not found' }

// POST /api/llm/reload
← { success: true, providers: string[] }
← { success: false, error: 'No providers with valid API keys' }   // note: HTTP 200
```

Two backend behaviours the UI must compensate for:

- `DELETE /api/llm/providers/:name` **does not rebuild the router** and does not
  clear routes that referenced the provider. The page must (a) warn in the delete
  confirm when routes point at it, listing them, and (b) chase the DELETE with a
  `POST /api/llm/reload`.
- `POST /api/llm/reload` returns **HTTP 200 with `success:false`** when no
  provider has a key. `res.ok` is therefore not a success test anywhere on this
  page — always branch on the `success` field.

---

## 3. The routing matrix

This is the page. Everything else is context for it.

### 3.1 Wireframe

```
ROUTING                                                    [Save routes] [Reload] 
Configured route → what the router will use once restarted. "Effective now" is
what live bots are actually doing under the current cap + provider health.

┌──────────┬───────────────┬──────────────────────┬──────────┬────────────────────┐
│ TASK     │ PROVIDER      │ MODEL                │ EFFORT   │ FALLBACK CHAIN     │
├──────────┼───────────────┼──────────────────────┼──────────┼────────────────────┤
│ codegen  │ [anthropic ▾] │ [claude-opus-4-8  ▾] │ max [ ]  │ ⟨gemini ×⟩ [+ add] │
│          │               │ $5.00 / $25.00 /1M   │ ☑ think  │                    │
│          │                                                                       │
│          │ EFFECTIVE NOW  ▲ anthropic  SKIPPED — daily cap reached               │
│          │                → gemini · gemini-2.5-flash · $0.15/$0.60              │
│          │                  ▲ 24% success over 2895 calls — degraded path failing│
│          │ modelled cost   ~$0.031 / call at observed 1.7K in / 460 out          │
├──────────┼───────────────┼──────────────────────┼──────────┼────────────────────┤
│curriculum│ [anthropic ▾] │ [claude-haiku-4-5 ▾] │ max [ ]  │ ⟨gemini ×⟩ [+ add] │
│          │               │ $1.00 / $5.00 /1M    │          │                    │
│          │ EFFECTIVE NOW  ▲ anthropic SKIPPED (cap) → gemini · gemini-2.5-flash  │
├──────────┼───────────────┼──────────────────────┼──────────┼────────────────────┤
│ critic   │ [anthropic ▾] │ [claude-haiku-4-5 ▾] │ max [ ]  │ ⟨gemini ×⟩ [+ add] │
├──────────┼───────────────┼──────────────────────┼──────────┼────────────────────┤
│ chat     │ [anthropic ▾] │ [claude-haiku-4-5 ▾] │ max [ ]  │ ⟨gemini ×⟩ [+ add] │
├──────────┼───────────────┼──────────────────────┼──────────┼────────────────────┤
│ embed    │ [gemini    ▾] │ [— provider default] │    —     │ ⟨anthropic ×⟩ …    │
│          │ EFFECTIVE NOW  ✔ gemini — not governed by the cap                     │
│          │                ▲ fallback "anthropic" has no embed support            │
└──────────┴───────────────┴──────────────────────┴──────────┴────────────────────┘

  ▲ 1 warning, 0 errors.        [ Discard ]  [ Save routes ]
  ⓘ Saving writes config to disk. Live bots keep the OLD routes until the
    service restarts — see the banner above.
```

### 3.2 Making an invalid route impossible to express

The failure mode from the brief is real and terminal. `ModelRouter.routedModelFor`
(lines 197–199):

```ts
return route && route.provider === providerName ? route.model : undefined;
```

A model string is applied **only** to the provider that owns it. But nothing
validates that `route.model` actually belongs to `route.provider` in the first
place — and if it doesn't, the primary call sends e.g. `claude-haiku-4-5` to
Gemini, gets a 404, and 404 is in `TERMINAL_CODES` (line 11), so `dispatch`
re-throws immediately (line 482) **without trying any fallback**. One bad string
in one cell disables the entire chain for that task type, permanently, silently.

Four mechanisms, in order of strength:

**(a) Model is a `<select>`, not a `<datalist>`.**
The current tab uses `<input list=…>`, which accepts any typed string — that is
the hole. The new control is a real `<select>` whose `<option>`s are exactly
`CATALOG[route.provider]`. There is no code path from the keyboard to an
unlisted string.

**(b) Changing provider clears the model.**
`onChange` for `ProviderSelect` dispatches `{type:'SET_PROVIDER', taskType,
provider}` and the reducer sets `model: undefined` in the same update. It never
carries a stale model across providers. `undefined` is the safe value — it means
"use the provider's configured default model," which is what `embed` already does
and what `routedModelFor` returns anyway.

```ts
case 'SET_PROVIDER':
  return { ...state, routes: { ...state.routes,
    [a.taskType]: { ...state.routes[a.taskType], provider: a.provider, model: undefined } } };
```

**(c) Fallbacks never carry a model, and the UI says so.**
Per `routedModelFor`, a fallback hop always runs on that provider's *own*
`ProviderConfig.model`. So the fallback chip is not editable for model — it
**renders** the model that will actually be used, read from
`providers.find(p => p.name === chip).model`:

```
⟨ gemini → gemini-2.5-flash ×⟩
```

This turns the invariant into something the operator can see rather than a rule
they must remember. There is deliberately no per-fallback model field, because
`RouteConfig` has nowhere to put one.

**(d) A validator that blocks Save.** Runs on every draft change:

| # | Rule | Severity | Message |
|---|---|---|---|
| V1 | `model ∈ CATALOG[provider]` | **error** | "claude-haiku-4-5 is not a gemini model. A model from the wrong provider 404s, and a 404 is terminal — the fallback chain will never run." |
| V2 | `provider` exists in `providers[]` | **error** | "No provider named 'openai' is configured. `clients.get()` returns undefined and this hop is skipped entirely." |
| V3 | every `fallback[i]` exists in `providers[]` | **error** | same as V2, "this fallback is a no-op." |
| V4 | provider (or fallback) has `enabled:false` or `keyMasked === '(not set)'` | **error** | "Disabled/keyless providers are skipped by `buildRouter`. This hop does nothing." |
| V5 | `fallback` contains duplicates or the primary provider | warn | "Duplicate hop — `dispatch` will try it twice." |
| V6 | every provider in the chain is governed while the cap is armed | warn | "Whole chain is Anthropic. When the cap trips this task type throws `BudgetCappedError` instead of degrading." |
| V7 | `taskType === 'embed'` and a chain member has no `embed()` | warn | "anthropic has no embed support; `ModelRouter.embed` skips clients without it." |
| V8 | chosen model absent from the rate card | warn | "No published price for this model — its spend will be recorded as $0.00 and will not count against the cap." |
| V9 | `maxTokens` set on `embed` | warn | "`maxTokens` is ignored for embeddings." |

Errors disable **Save routes** outright. Warnings show a count and require one
extra click ("Save anyway"). V8 is the direct defence against finding 3.

### 3.3 "Effective now" — the chain simulator

The most valuable widget on the page, and it needs no new backend. It replays
`ModelRouter.dispatch`'s chain construction (lines 361–386) in the browser against
current state:

```ts
function effectiveChain(route: RouteConfig, s: Settings, budget: BudgetState) {
  const raw = [route.provider, ...(route.fallback ?? [])];
  if (!raw.includes(s.defaultProvider)) raw.push(s.defaultProvider);   // line 367
  return raw.map(name => {
    const p = s.providers.find(x => x.name === name);
    if (!p)                       return { name, verdict: 'absent'   };  // clients.get() undefined
    if (!p.enabled)               return { name, verdict: 'disabled' };  // buildRouter skips
    if (!p.apiKey && name !== 'ollama') return { name, verdict: 'keyless' };
    if (!paidAllowed(name, budget))     return { name, verdict: 'capped' }; // gated out
    return { name, model: route.provider === name ? (route.model ?? p.model) : p.model,
             verdict: 'active' };
  });
}
// paidAllowed mirrors LLMSettings.isPaidCallAllowed:
//   override → true; scope==='anthropic' && name!=='anthropic' → true;
//   dailyUsd > 0 && scopedSpend >= dailyUsd → false
```

The first `active` hop is what runs. Rendering, per hop:

| verdict | glyph | copy |
|---|---|---|
| `capped` | ▲ | "SKIPPED — daily cap reached" |
| `absent` | ✕ | "not configured — this hop is skipped silently" |
| `disabled` | ✕ | "disabled — `buildRouter` never builds a client" |
| `keyless` | ✕ | "no API key — `buildRouter` skips it" |
| `active` | → | "provider · model · $in/$out" + observed success rate |
| all skipped | ⛔ | "**Every hop blocked — this task type throws `BudgetCappedError` and idles.**" |

Against live state this renders exactly the truth the current UI hides:
*codegen: anthropic SKIPPED (cap) → gemini/gemini-2.5-flash, 24% success.*

A **[Show effective ▾]** toggle in the section header switches every row between
Configured (edit mode) and Effective (diagnostic mode).

### 3.4 Effort controls

`RouteConfig` supports `temperature`, `maxTokens`, `useThinking`. Rendering:

- `maxTokens` — number input, blank = inherit the call site's value
  (`effectiveMaxTokens = route.maxTokens ?? maxTokens`, line 388). Placeholder
  shows the client default (2048).
- `temperature` — 0–2 step 0.1, blank = provider default (0.7). Behind a
  per-row "⋯ more" disclosure; it is rarely touched and steals matrix width.
- `useThinking` — checkbox, **only enabled on the `codegen` row**. This is not a
  style choice: `ModelRouter.generate` gates it on
  `route?.useThinking && taskType === 'codegen'` (line 228), so the flag is inert
  everywhere else. Other rows render it disabled with the tooltip "only applied to
  codegen." A second condition is worth surfacing: the branch calls
  `generateWithThinking` only if `isThinkingCapable(client)`, and it drops the
  `modelOverride` while doing so — so with thinking on, the route's `model` is not
  applied. Show an inline note: *"Thinking mode uses the provider's default model,
  not the route's."*

### 3.5 Fallback chain editor

Ordered chips, drag-to-reorder (or ▲▼ buttons — the chains are ≤ 3 long), `×` to
remove, `[+ add]` opens a menu of configured providers not already in the chain.
The chip shows `provider → resolved-model`. A trailing ghost chip renders
`defaultProvider` when it is not already in the chain, greyed, labelled
"appended automatically" — because `dispatch` line 367 does exactly that and the
operator cannot otherwise know their chain has a hidden final hop.

```
FALLBACK CHAIN
⟨1 gemini → gemini-2.5-flash  ▲ 24% ok  ×⟩  [+ add]   ⟨anthropic (default, auto) ⟩
```

### 3.6 Save

```ts
// PUT /api/llm/routes
→ { routes: Record<TaskType, RouteConfig>, defaultProvider: string }
← { success: true, settings: Settings }
```

Post-save sequence:
1. `PUT /api/llm/routes` with the full draft.
2. `POST /api/llm/reload` — needed because `PUT` alone never rebuilds the router.
3. Persist `localStorage['models.routesSavedAt'] = Date.now()`.
4. Raise the **Pending fleet restart** banner (§5.3) and keep it raised.

---

## 4. Live cost

### 4.1 Which endpoint feeds which number

This mapping matters more than the visuals, because the two sources mean
different things and the current tab conflates them.

| Widget | Source | Field | Window |
|---|---|---|---|
| Spend meter, "Spent today" | `GET /api/llm/budget` | `spendTodayUsd.{anthropic,total}` | **since local midnight** — authoritative |
| Cap, scope, override, idle | `GET /api/llm/budget` | `budget` | — |
| "Paid calls refused" | `GET /api/llm/budget` | `codegenPaidAllowed` | live gate decision |
| Burn rate, projected | client-derived from polled `spendTodayUsd` deltas | — | since page open |
| Cost by task type / model | `GET /api/llm/usage` | `usage.byTaskType`, derived byModel | **last ≤10,000 calls** |
| Calls / success / latency | `GET /api/llm/usage` | `totalCalls`, `successRate`, `avgLatencyMs` | last ≤10,000 calls |
| Cache hit rate | **not available** — gap G1 | — | — |

Every `usage`-sourced panel carries a window chip:
`window: last 10,000 calls · 13:25–20:28` with a tooltip explaining the circular
buffer. Never labelled "today."

### 4.2 Burn rate and projection, without a backend series

There is no historical spend endpoint (gap G3). An honest client-side derivation:

```ts
// ring buffer of {t, usd} samples, appended on each 10s /api/llm/budget poll
const w = samples.filter(s => s.t > Date.now() - 15*60_000);   // 15-min window
const span = (w.at(-1).t - w[0].t) / 3_600_000;                // hours
const burnUsdPerHour = span > 0.05 ? (w.at(-1).usd - w[0].usd) / span : null;

const msLeft = endOfLocalDay() - Date.now();
const projected = burnUsdPerHour === null ? null
  : spendToday + burnUsdPerHour * (msLeft / 3_600_000);
```

Rules that keep this honest:
- Needs ≥ 3 min of samples; below that the tile reads **"measuring…"** with a
  spinner, never a wild number from a 10-second span.
- The tile hint always states the basis: `last 12 min, this tab only`.
- Reloading the page resets the window. The tile says so on hover.
- If the cap is tripped, burn is typically ~0 on the governed scope while the
  fallback still spends; the projection tile then shows the **total** scope
  alongside, so "we're capped" doesn't read as "we've stopped spending."

### 4.3 Cache hit rate

`TokenLedger` *records* `cacheCreationInputTokens` / `cacheReadInputTokens`
(lines 76–87, and `estimateCost` bills them at 1.25× / 0.1×), but
`getMetrics()` (lines 113–163) never sums them, and no endpoint exposes raw
records globally. **The number is not computable in the browser today.**

The intended metric, once G1 lands:

```
cacheHitRate = cacheReadInputTokens / (inputTokens + cacheReadInputTokens + cacheCreationInputTokens)
```

Measured directly from the ledger file for this design: Anthropic records show
`input 1,101,553 · cacheRead 449,030 · cacheCreate 0` → **29.0%**, over the 204
records that carry the fields. Both the value and the thin coverage (204 of 756
Anthropic calls) are worth showing — a cache-write count of zero with non-zero
reads is itself a signal.

Until G1 lands the tile renders a real empty state, not a fake zero:

```
┌────────────────────┐
│ CACHE HIT RATE     │
│        —           │
│ needs /api/llm/    │
│ usage cacheTokens  │
└────────────────────┘
```

### 4.4 Breakdown charts

Per the form heuristic: the job here is **compare magnitude, low → high**, and the
categories are nominal (task types, model IDs). That is a one-hue sequential job,
**not** categorical — colouring five bars five hues would spend the identity
channel re-encoding what bar length already shows, and would drag in the whole
CVD-ordering problem for nothing.

**Palette** (dark surface only — the dashboard is `bg-zinc-950`, cards
`bg-zinc-900` `#18181b`):

| Role | Hex | Contrast vs `#18181b` | Note |
|---|---|---|---|
| Bar fill (all bars) | `#3987e5` | 4.87:1 | slot-1 blue, dark step |
| Bar fill, emphasis | `#6da7ec` | 7.08:1 | the hovered/selected bar |
| Track / remainder | `#27272a` | — | zinc-800 |
| Axis / label ink | `#a1a1aa` | — | zinc-400, text token |
| good | `#10B981` | 6.98:1 | existing dashboard intent |
| warning | `#F59E0B` | 8.25:1 | existing |
| critical | `#EF4444` | 4.71:1 | existing |

Status colours were run through `validate_palette.js --mode dark --surface
#18181b`: **Contrast PASS (all ≥ 3:1)**, chroma PASS, CVD PASS (worst adjacent
ΔE 8.9), normal-vision PASS (19.8). The lightness-band check FAILs, but that gate
scopes to *categorical* palettes; these are a reserved status scale and ship with
icon + label, never colour alone, per the non-negotiables. Bars use a single hue,
so no categorical gate applies to them at all.

```
COST BY TASK TYPE              window: last 10,000 calls (13:25–20:28) ⓘ
codegen     ████████████████████████████████████████████  $7.5193   3866 calls
critic      ██████████▌                                   $1.7911   1599
curriculum  ███▏                                          $0.5221   1121
chat        ██                                            $0.3519   1493
embed       ▏                                             $0.0018   1921

COST BY MODEL
claude-opus-4-8   ████████████████████████████████████████ $9.7008   475 calls
claude-haiku-4-5  ██                                       $0.4828   281
gemini-2.5-flash  ▏                                        $0.0025  2895
gemini            ▏  ▲ unpriced — 16.3M tokens billed as $0.00       5133
embedding         ▏  ▲ unpriced                                      1216
                     ▲ 2 model IDs have no rate-card entry. Their real
                       spend is invisible and never counts against the cap.

RELIABILITY BY MODEL                                    ⓘ derived client-side
model              calls   ok      avg latency
claude-opus-4-8      475   100%       7,400 ms
claude-haiku-4-5     281   100%       3,444 ms
gemini              5133    90%       2,347 ms
gemini-2.5-flash    2895  ▲ 24%         102 ms   ← fallback for 4 task types
embedding           1216   100%         194 ms
```

Interaction per `interaction.md`: hover tooltip on every bar giving calls,
tokens, cost, and share of total; row hit-target is the full row width, not the
bar. Direct labels on every bar (5 rows — well under the "never a number on every
point" threshold, which targets dense series). A **[Table]** toggle mirrors the
charts as a plain `<table>` for the accessibility path.

**Cost-by-model is derived, not fetched** — `usage` has `byProvider` and
`byTaskType` but no `byModel` (gap G2). Until G2, the panel renders provider-level
truth from `byProvider` and shows model-level rows only as an explicitly-labelled
estimate, or hides behind a "needs backend" note. My recommendation: ship G2
first; a model breakdown assembled from anything other than the ledger will drift.

---

## 5. Safety rails

### 5.1 Kill switch

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⛔ AI DISABLED — every LLM call throws AI_DISABLED                        │
│    All voyager loops are paused. Bots stay connected and idle. No spend.  │
│                                                    [ Re-enable AI  ⟶ ]   │
└──────────────────────────────────────────────────────────────────────────┘
```

```ts
// GET  /api/llm/enabled   ← { enabled: boolean }
// POST /api/llm/enabled   → { enabled: boolean }   ← { success:true, enabled } | 400 { error }
```

This is the one control that **does** reach the workers: the handler loops
`botManager.getAllWorkers()` and calls `pauseVoyager`/`resumeVoyager` per worker
(`llmRoutes.ts:114–121`). Say so in the UI — "applies to all bots immediately, no
restart" — precisely because the neighbouring routing control does *not*.

Turning it **off** is a one-click destructive-ish action: no confirm (it is the
emergency brake; friction is wrong here), but a toast with a 6-second **Undo**.
Turning it back **on** is plain.

### 5.2 Budget override — "hog wild"

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ⚠ OVERRIDE ACTIVE — the daily cap is bypassed                            │
│   Paid calls run unrestricted. Spent today: $10.18 (cap $10.00, ignored). │
│   Turn this off when you're done.                    [ Re-arm cap ]       │
└──────────────────────────────────────────────────────────────────────────┘
```

Enabling requires a confirm dialog naming the current numbers:

> **Bypass the daily cap?** You have already spent **$10.18** today against a
> **$10.00** cap. With override on there is no ceiling — Anthropic calls run at
> $5.00/$25.00 per 1M until you turn it back off.
> `[ Cancel ]  [ Bypass the cap ]`

`budget.override` also bypasses the idle throttle (`isPaidCallAllowed` line 204
returns before the throttle check), so the copy says "cap **and** idle throttle."

```ts
// GET /api/llm/budget
← { budget: {dailyUsd, scope:'anthropic'|'all', override, idleThrottle},
    spendTodayUsd: { anthropic: number, total: number },
    codegenPaidAllowed: boolean }

// PUT /api/llm/budget           partial merge; each field independently validated
→ { dailyUsd?: number, scope?: 'anthropic'|'all', override?: boolean, idleThrottle?: boolean }
← { success:true, budget }   |  400 { error:'dailyUsd must be a non-negative number' }

// POST /api/llm/budget/override                    (convenience alias)
→ { override: boolean }        ← { success:true, budget }
```

Budget writes take effect **immediately with no reload** — the gate is a closure
reading `llmSettings` live on every call (`buildRouter` line 290). This is the one
place the page can promise instant effect, and it should, in contrast to routing.

Note `dailyUsd: 0` disables the cap entirely (`if (b.dailyUsd > 0)`, line 212).
The input must warn on 0: *"0 disables the cap — that is not 'no spending', it is
'unlimited'."* This is an easy and expensive misreading.

The **idle throttle** checkbox needs a caveat: it is inert unless a human-count
provider is wired (`b.idleThrottle && this.onlineHumanCountFn`, line 208), and it
only ever gates `codegen`. Label: *"pause paid codegen when no players are online
(requires the player-count hook; no effect if unwired)."*

### 5.3 The restart warning

Given §0, a passive footnote is not enough. Three layers:

**Layer 1 — inline, at the point of edit.** Under the Save bar, permanently:

> ⓘ Saving writes `data/llm-settings.json` and reloads the main-thread router.
> **Live bots keep their old routes.** Each bot's worker holds a reference to the
> `ModelRouter` that existed when it spawned; `/api/llm/reload` swaps the field on
> `BotManager`, not the references already handed out. Only a service restart (or
> respawning every bot) applies new routes fleet-wide.

**Layer 2 — a sticky post-save banner.**

```
╔════════════════════════════════════════════════════════════════════════════╗
║ ⟳ ROUTES SAVED — NOT LIVE ON THE FLEET                                     ║
║   Saved 4 min ago. 6 running bots are still using the previous routing.    ║
║   Apply with:   sudo systemctl restart mc-fleet-bot        [ Copy ]        ║
║   (or respawn each bot — new workers pick up the reloaded router)          ║
╚════════════════════════════════════════════════════════════════════════════╝
```

The command is copy-to-clipboard, not a button: restarting needs root and the
dashboard has no such privilege. **Do not** wire this to `POST /api/admin/restart`
— under `Restart=on-failure` that endpoint's clean `process.exit(0)` is *not*
respawned, so it would stop the fleet and leave it down (documented in
`CLAUDE.md`). If a button is ever wanted here it must be labelled "Flush & stop".

**Layer 3 — staleness detection.** Compare `localStorage['models.routesSavedAt']`
against process start, derived today as `Date.now() - adminInfo.uptime*1000` from
the existing `GET /api/admin/info` (already in `api.ts` as `getAdminInfo`). If the
process started *after* the last save, the banner self-clears. This works with
today's backend; gap G4 proposes the clean version.

```ts
const startedAt = Date.now() - adminInfo.uptime * 1000;
const stale = savedAt !== null && savedAt > startedAt;
```

### 5.4 Banner precedence

At most one banner renders, highest first, so the operator is never triaging a
stack:

1. `aiEnabled === false` → **Kill switch** (nothing else matters)
2. `codegenPaidAllowed === false` → **Cap tripped**
3. `budget.override === true` → **Override active**
4. `stale === true` → **Pending restart**

Lower-priority states demote to pills in `HeaderPills`, which are always visible
and clickable (scroll-to-section).

---

## 6. Model catalog with prices

Rate card, per 1M tokens, from the brief and cross-checked against
`TokenLedger.COST_PER_MILLION` — **they agree on every overlapping entry**, so
there is no conflict to resolve today. The server file stays authoritative.

| Model | Provider | Input | Output | In catalog | Priced by ledger |
|---|---|---:|---:|:--:|:--:|
| `claude-opus-5` | anthropic | $5.00 | $25.00 | ✔ | ✔ |
| `claude-opus-4-8` | anthropic | $5.00 | $25.00 | ✔ | ✔ |
| `claude-sonnet-5` | anthropic | $3.00 | $15.00 | ✔ | ✔ |
| `claude-fable-5` | anthropic | $10.00 | $50.00 | ✔ | ✔ |
| `claude-haiku-4-5` | anthropic | $1.00 | $5.00 | ✔ | ✔ |
| `gemini-2.5-flash` | gemini | $0.15 | $0.60 | ✔ | ✔ |
| `gemini-3.5-flash` | gemini | $1.50 | $9.00 | ✔ | ✔ |
| `MiniMax-M3` | minimax | $0.30 | $1.20 | ✔ | ✔ |
| `gpt-5.6-sol` | openai | $5.00 | $30.00 | ✔ | ✔ |
| `gpt-5.6-terra` | openai | $2.50 | $15.00 | ✔ | ✔ |
| `gpt-5.6-luna` | openai | $1.00 | $6.00 | ✔ | ✔ |

Two footnotes the table must carry, both from the ledger's own comments:

- **`gemini-3.5-flash` is not cheap Flash.** $1.50/$9.00 is 10× `gemini-2.5-flash`.
  The row gets a "10× 2.5-flash" chip so nobody swaps them thinking it's a
  free upgrade.
- **GPT-5.6 prices are the below-breakpoint tier.** Above 272K input tokens the
  real rate roughly doubles. Chip: "≤272K input; ~2× above."

```
MODEL CATALOG                                    [ all ▾ ] [ ☐ only configured ]
┌────────────────────┬───────────┬─────────┬──────────┬─────────────┬──────────┐
│ MODEL              │ PROVIDER  │ IN /1M  │ OUT /1M  │ REL. COST   │ USED BY  │
├────────────────────┼───────────┼─────────┼──────────┼─────────────┼──────────┤
│ claude-fable-5     │ anthropic │ $10.00  │  $50.00  │ ██████████  │ —        │
│ claude-opus-5      │ anthropic │  $5.00  │  $25.00  │ █████       │ —        │
│ claude-opus-4-8    │ anthropic │  $5.00  │  $25.00  │ █████       │ codegen  │
│ gpt-5.6-sol        │ openai    │  $5.00  │  $30.00  │ █████▌      │ —        │
│ claude-sonnet-5    │ anthropic │  $3.00  │  $15.00  │ ███         │ —        │
│ gpt-5.6-terra      │ openai    │  $2.50  │  $15.00  │ ██▌         │ —        │
│ gemini-3.5-flash   │ gemini    │  $1.50  │   $9.00  │ █▌ 10× 2.5  │ —        │
│ claude-haiku-4-5   │ anthropic │  $1.00  │   $5.00  │ █           │ critic,  │
│                    │           │         │          │             │ chat,    │
│                    │           │         │          │             │curriculum│
│ gpt-5.6-luna       │ openai    │  $1.00  │   $6.00  │ █           │ —        │
│ MiniMax-M3         │ minimax   │  $0.30  │   $1.20  │ ▎           │ —        │
│ gemini-2.5-flash   │ gemini    │  $0.15  │   $0.60  │ ▏           │ embed    │
└────────────────────┴───────────┴─────────┴──────────┴─────────────┴──────────┘
   Providers greyed out are not configured. "Rel. cost" is a blended
   1-in : 3-out index, normalised to the most expensive row.
```

Selecting a model in the routing matrix shows its price **inline in the cell**
(`$5.00 / $25.00 /1M`) plus a modelled per-call cost using that task type's
observed average token shape from `usage.byTaskType`:

```
modelledPerCall = (avgIn * inRate + avgOut * outRate) / 1e6
// codegen observed: 14.09M tokens over 3866 calls → ~$0.031/call on opus-4-8
```

Swapping a model updates the figure live, and a delta chip renders next to it:
`↓ 83% vs current`. That is the "cost consequence inline" requirement, and it is
the thing that makes the catalog worth having on the page rather than in a doc.

**Catalog ownership.** Today `MODEL_CATALOG` is hardcoded in the settings page
(lines 233–299) and `COST_PER_MILLION` is hardcoded in `TokenLedger.ts` — two
lists that will drift. Interim: extract to
`web/src/lib/modelCatalog.ts` as `{ id, provider, inputPer1M, outputPer1M,
notes?, legacy? }[]`, imported by both the matrix and the table so there is one
web-side source. Long term: gap G5 serves it from the backend and deletes the
web copy.

---

## 7. State and data flow

### 7.1 Shape

```ts
type Async<T> = { status:'loading' } | { status:'error', error:string, stale?:T }
              | { status:'ready', data:T, at:number };

interface PageState {
  settings: Async<Settings>;        // GET /api/llm/providers   (structure)
  budget:   Async<BudgetPayload>;   // GET /api/llm/budget      (live money)
  usage:    Async<UsageMetrics>;    // GET /api/llm/usage        (aggregates)
  admin:    Async<AdminInfo>;       // GET /api/admin/info       (uptime → staleness)

  draft: {                          // client-only, never fetched
    routes: Record<TaskType, RouteConfig>;
    defaultProvider: string;
  };
  baseline: string;                 // stableStringify(settings.routes) at last sync
  providerForm: { name; apiKey; model; maxConcurrent } | null;
  burnSamples: { t:number; usd:number }[];   // ring buffer, cap 180
}
```

**Local `useReducer`, not a zustand store.** The repo's `lib/store.ts` stores are
for cross-page live fleet state; routing edits are a *draft* that must die on
navigation. Putting an unsaved draft in a global store means leaving the page and
coming back shows phantom edits that were never persisted — the exact bug class
this page exists to prevent. The only cross-page signal is the sidebar badge,
which reads the polled budget, not the draft.

### 7.2 Fetch cadence

| Call | Trigger | Interval | On failure |
|---|---|---|---|
| `/api/llm/providers` | mount, after any mutation | 30 s | keep stale, amber "structure may be out of date" |
| `/api/llm/budget` | mount | **10 s** | keep stale + freeze burn window |
| `/api/llm/usage` | mount | 30 s | keep stale |
| `/api/admin/info` | mount | 60 s | staleness banner degrades to "unknown — restart to be sure" |

Polling pauses on `document.hidden` and fires one immediate catch-up poll on
`visibilitychange`, so a backgrounded tab neither hammers the API nor produces a
bogus burn-rate spike across the gap. Burn samples recorded while hidden are
dropped rather than interpolated.

`llm:call` Socket.IO events are already emitted (`index.ts:134–137`) but **not**
subscribed by `SocketProvider`. Optional enhancement: subscribe on this page only
and use each event to (a) pulse a live-activity dot per route row and (b) trigger
an early `/api/llm/budget` refetch, debounced to ≥2 s. Not required for v1; the
10 s poll is sufficient and the socket path adds a second source of truth.

### 7.3 Dirty tracking

Reuse `stableStringify` from the settings page (lines 199–204) — move it to
`web/src/lib/stableStringify.ts` so both call sites share it rather than
duplicating. `dirty = stableStringify(draft) !== baseline`. A `beforeunload`
handler and a Next `router` interception warn on navigation while dirty; the
existing tab has no such guard and silently drops edits on tab switch.

### 7.4 Loading / empty / error states

| Situation | Detect | Render |
|---|---|---|
| First load | all `Async` loading | Full-page skeleton: 4 shimmer stat tiles, 5 shimmer matrix rows, 2 shimmer provider cards. Never a bare "Loading…" |
| Backend unreachable | `fetchJSON` throws "Cannot reach backend" | Full-page error card, the API-base hint from `api.ts`, **[Retry]**. Nothing else renders — a routing matrix with no data is a trap. |
| 401 | `fetchJSON` handles | redirect to `/login?next=/models` (existing `handleUnauthorized`) |
| Partial failure (budget ok, usage 500) | per-slice status | Cost panels show an inline error strip with **[Retry]**; matrix and spend meter render normally |
| **No providers configured** | `providers.length === 0` | Matrix is disabled and greyed with an overlay: "Add a provider before routing anything." CTA scrolls to the add form. Empty state, not an error. |
| No routes configured | `Object.keys(routes).length === 0` | Matrix renders 5 rows all reading "Default → {defaultProvider}", with a "using defaults" chip |
| No usage yet | `usage.totalCalls === 0` | Charts replaced by "No calls recorded yet. Charts appear after the first LLM call." |
| Router failed to build | `/api/llm/reload` → `success:false` | Red strip: "No provider has a valid API key — the router is null and every call fails." |
| Ledger buffer saturated | `totalCalls === 10000` | Window chip turns amber: "buffer full — older calls have been dropped" |
| Stale data | `Date.now() - at > 3× interval` | Timestamp goes amber, "last updated 2m ago" |

### 7.5 Optimistic updates

Toggles (`enabled`, `override`, `idleThrottle`, provider enable) apply
optimistically and revert on failure with an error toast — they are cheap, fast,
and idempotent. **Route saves are never optimistic**: the button enters a pending
state and the matrix only re-baselines from the `settings` object in the response.
Route state is exactly what the operator must be able to trust.

---

## 8. Backend gap list

Ordered by how much the page needs them. G1, G2 and G6 are the ones that force
visible "needs backend" holes in the UI.

| # | Gap | Consequence today | Proposed |
|---|---|---|---|
| **G1** | **Cache token aggregates.** `TokenLedger` records `cacheCreationInputTokens`/`cacheReadInputTokens` and bills them, but `getMetrics()` never sums them and no endpoint exposes raw records globally. | Prompt-cache hit rate — an explicit requirement — is **not computable in the browser**. The tile ships as an empty state. | Add to `UsageMetrics`: `totalCacheCreationInputTokens`, `totalCacheReadInputTokens`, and the same two fields inside each `byProvider`/`byTaskType`/`byModel` bucket. ~10 lines in `getMetrics()`. |
| **G2** | **No `byModel` breakdown.** `getMetrics()` buckets by provider, task type and bot — never by model. | "Cost by model" (an explicit requirement) can't be sourced. With multiple models per provider, `byProvider` is too coarse to act on. | Add `byModel: Record<string, {calls, tokens, cost, inputTokens, outputTokens, successCount, latencyMs}>`. Same loop, one more accumulator. |
| **G3** | **No historical spend series.** Records carry `timestamp` but nothing exposes a time-bucketed rollup. | Burn rate and projection are derived client-side from polled deltas and only cover "since this tab opened". Resets on reload. No spend sparkline, no day-over-day. | `GET /api/llm/usage/series?bucket=5m&since=<ts>&groupBy=model|taskType|provider` → `{ buckets: [{t, calls, cost, inputTokens, outputTokens, cacheReadInputTokens}] }`. |
| **G4** | **No router/worker freshness signal.** Nothing reports when the router was built, or whether live workers hold a stale one. | The "routes not live" banner is inferred from `localStorage` + `admin.uptime`. Wrong across browsers/machines. | `GET /api/llm/router-status` → `{ builtAt, processStartedAt, routesSavedAt, providers: string[], workers: [{botName, routerBuiltAt, stale: boolean}] }`. Fixing the *underlying* bug (have `WorkerHandle` read `botManager.getLLMClient()` per call instead of caching the reference at construction) would remove the need for the banner entirely — worth doing regardless. |
| **G5** | **Rate card is server-private.** `COST_PER_MILLION` lives in `TokenLedger.ts`; the web has an independent hardcoded `MODEL_CATALOG`. | Two lists drift. A model the web offers may be unpriced by the server and silently cost $0. | `GET /api/llm/catalog` → `{ models: [{id, provider, inputPer1M, outputPer1M, supportsThinking, supportsEmbed, legacy}] }`, served from the same constant the ledger prices with. |
| **G6** | **Unpriced models are invisible.** `estimateCost` returns `0` for any unknown model ID. Live: `gemini` (5133 calls, 16.3M tokens) and `embedding` (1216 calls) are both unpriced → **$0.00**. | Real spend is under-counted and the daily cap under-fires. The UI cannot distinguish "free" from "unknown". | Return a `priced: boolean` per record/bucket (or expose the rate-card key set via G5) so the UI can render "unpriced" instead of `$0.00`. Separately: **fix the recording** — a model of `gemini` means `getModelId()` was unavailable and `providerName` was used as the fallback (`ModelRouter.ts:411`). Consider making an unpriced model ID a logged warning. |
| **G7** | **No provider health / key validation.** No way to test a key, and no liveness probe. | "Health" is inferred from historical success rates; a brand-new provider is Unknown until it has served 20 calls, and a bad key is only discovered by a failing bot. | `POST /api/llm/providers/:name/test` → `{ ok, latencyMs, model, error? }`, doing one minimal call. Add a **[Test]** button per provider card. |
| **G8** | **No route validation server-side.** `PUT /api/llm/routes` accepts any shape — a model from the wrong provider, a fallback naming a nonexistent provider, an unknown task type. | The client validator (§3.2) is the *only* guard. Anything writing `llm-settings.json` directly, or a stale browser tab, bypasses it. | Validate in the handler: model ∈ provider's catalog, provider/fallbacks configured, task type in the known set. Return `400 { error, field }`. |
| **G9** | **`PUT /api/llm/routes` doesn't rebuild the router**, and `DELETE /api/llm/providers/:name` doesn't either. | Saved routes aren't live even on the main thread until a separate `/api/llm/reload`. Deleting a provider leaves the old client live and leaves routes dangling. | Call `buildRouter()` at the end of both handlers, and return the reload result in the response so the client needs one round-trip. |
| **G10** | **`byBot` is dead.** All 10,000 ledger records have `botName: ''`, so `usage.byBot` is `{}` and `GET /api/bots/:name/llm-trace` returns nothing for every bot. | No per-bot cost attribution — "which bot burned the budget" is unanswerable. Also blocks the existing per-bot LLM waterfall. | Trace why `options.botName` is lost between the voyager call sites and `ModelRouter.dispatch` (`options?.botName ?? ''`, line 358) — likely dropped across the worker IPC proxy. |
| **G11** | **No spend reset / ledger admin.** The buffer is fixed at 10,000 records with no pruning, filtering, or reset. | "Today" is only correct while the buffer happens to hold a whole day. At higher volume `getSpendTodayUsd` silently under-counts, which *loosens the cap*. | Persist a daily rollup separate from the raw ring buffer so `getSpendTodayUsd` is exact regardless of buffer pressure. This one is a correctness bug in the cap, not just a UI gap. |
| **G12** | No `GET /api/llm/budget` history of cap trips. | Can't answer "when did we trip today" or "how often". | Emit a `budget:tripped` event / log entry and expose the last N. Low priority. |

**Not gaps** (verified present and sufficient): kill switch worker broadcast,
budget live-read without reload, key masking, `codegenPaidAllowed` as a
ready-made "is it refused right now" boolean, and the `llm:call` socket event
(emitted, just unsubscribed on the client).

---

## 9. Implementation notes for whoever builds this

1. **`API_BASE` is `''`.** Use `api.ts`'s `fetchJSON` helpers; do not reintroduce
   `http://localhost:3001`, and do not read `process.env.NEXT_PUBLIC_API_URL`
   directly the way the current settings tab does in nine places (it works, but it
   bypasses the timeout, the 401 redirect and the error copy). Add the eight LLM
   calls to the `api` object.
2. **`res.ok` is not a success test** for `/api/llm/reload` (200 + `success:false`).
3. **Never source a "today" figure from `/api/llm/usage`.** Only
   `/api/llm/budget.spendTodayUsd` is midnight-anchored.
4. **Do not add a reveal/copy affordance for keys.** The server does not send
   them; any such control would be a lie or a regression.
5. **Do not wire a Restart button to `POST /api/admin/restart`** — it stops the
   fleet under `Restart=on-failure` and does not bring it back.
6. **Ship G1 + G2 before the cost panels**, or the page launches with two
   requirement-level widgets in a permanent empty state.
7. Extract `stableStringify` and `MODEL_CATALOG` out of `settings/page.tsx` into
   `web/src/lib/` rather than copying them, so the reduced settings tab and the
   new page cannot drift.
```
