# Memory architecture for a long-running Voyager-style bot fleet

**Status:** survey + design. **No code was changed.**
**Date:** 2026-07-24 · **Target:** `/opt/stacks/mc-fleet-bot` (TypeScript, 5 bots, ~33,000 LLM calls/day)
**Host budget:** 2 vCPU / 7 GB / no GPU, load average 5.45 (~3× oversubscribed). Bot process already at **1.98 GB RSS**, ~4 GB available. Embeddings are effectively free and already universal: `gemini-embedding-001` at `outputDimensionality: 256` (`src/ai/GeminiClient.ts:118-147`), present on all 518 skill entries and all 15 QA entries.

**Companion documents** (read these first; this one deliberately does not repeat them):
- `dev/research/call-volume-audit.md` — where the 33k calls/day actually go, per call site.
- `dev/research/knowledge-brain-design.md` — the L0/L1/L2 *caching* design (fact store, semantic cache, prompt caching).
- `dev/research/skill-reuse-and-techniques.md` — skill retrieval defects D1–D7 and external technique ranking.

This document covers what those three do not: **memory as an architecture** — what is remembered, in which tier, for how long, promoted or demoted on what signal, and forgotten by what policy. Caching is a *tactic* for reducing cost per call. Memory is the *structure* that decides whether a call happens at all.

---

## 1. Terminology: "accordion memory" and "piano memory"

**Handle this honestly, because the answer is mostly negative.**

### What we looked for and what we found

| Term searched | Result |
|---|---|
| "accordion memory" (LLM / agent / AI context) | **No prior art.** No paper, framework, or blog post uses this phrase as a term of art for agent memory. |
| "accordion context" / "accordion compression LLM" | **No prior art** as a named technique. |
| **"piano memory"** | **Nothing at all.** Zero relevant hits across multiple phrasings. |
| "piano roll memory agent" / "octave memory tiers" | **Nothing.** |
| "elastic context window" | ⚠️ **Genuinely taken** — see ACE below. |

**Neither "accordion memory" nor "piano memory" is an established term.** They are not in the literature, not in any framework's vocabulary, and nobody reading a design doc would know what they mean. This document does not use them as if they were standard, and no pedigree is invented for them.

### One genuine piece of "accordion" prior art — and it is a naming collision

There is a real project called **Accordion** — *"See and steer your agent's context"* (Darisme, Desai, Shah, Tang; AI Hackathon 2026 @ UC Berkeley; <https://get-accordion.dev/>, <https://github.com/a-Fig/Accordion>). It visualises an agent's context window and lets blocks be **folded / unfolded / pinned / peeked** rather than discarded. Its README states the thesis directly: *"Compaction blasts your whole history into one lossy summary — slow, destructive, all-or-nothing. Sliding windows just drop the oldest tokens — the agent simply forgets."* It keeps the newest ~20k tokens as a protected, never-folded tail.

Be precise about what this establishes: it is a **hackathon project, not a paper, not peer-reviewed, no benchmark**. It does *not* make "accordion memory" a recognised term. It does mean **the name is already in use in exactly this problem space**, which is a reason not to adopt it as this project's vocabulary. (Unrelated collision, different field: "Accordion: Adaptive Gradient Communication…", arXiv 2010.16248, 2020 — distributed-training gradient compression. ⚠️ ID from a search summary, abstract page not fetched.)

### What the operator plausibly means, and the real names for it

The intuition behind both words is sound and maps cleanly onto named, cited architectures:

**"Accordion" = a memory that expands and contracts.** Four independent 2025–2026 lines of work converge on exactly this shape:

- **Context folding** — *Scaling Long-Horizon LLM Agent via Context-Folding*, arXiv [2510.11967](https://arxiv.org/abs/2510.11967). The agent branches into a sub-trajectory, then *folds* it, collapsing intermediate steps while keeping a concise outcome. **Matches or beats ReAct baselines with a 10× smaller active context**, and beats summarisation-based management. **This is the closest real term to "accordion" and the one this document adopts.**
- **Selective re-expansion / drill-down** — HORMA, arXiv [2606.11680](https://arxiv.org/abs/2606.11680). Summarised entities stay **linked to their raw trajectories**; the agent views abstracts and drills down on demand, "dynamically reconstructing historical contexts via selective re-expansion."
- **Elastic context** — ACE, arXiv [2606.31564](https://arxiv.org/abs/2606.31564). Keeps a **lossless layer holding both raw messages and compressed abstractions**, then assigns each step **raw / abstract / drop** per decision. Motivated by the same complaint: *"once information is discarded or compressed, it cannot be recovered even when it becomes critically relevant in later decision steps."*
- **Expand-on-demand hierarchy** — xMemory, arXiv [2602.02007](https://arxiv.org/abs/2602.02007). Message→segment→component→group, retrieved top-down and expanded to raw messages on demand: **34.48 BLEU / 43.98 F1 at 4,711 tok/query** vs naive RAG **27.95 / 36.48 at 8,633 tok** — better quality at roughly half the tokens.

**"Piano" = registered tiers / octaves, where a query strikes one register.** This is simply **tiered memory**, and it is the best-established idea in the field: MemGPT's main-vs-external context (arXiv [2310.08560](https://arxiv.org/abs/2310.08560)), CoALA's working / episodic / semantic / procedural split (arXiv [2309.02427](https://arxiv.org/abs/2309.02427)), MemoryOS's short/mid/long paging (arXiv [2506.06326](https://arxiv.org/abs/2506.06326)). If the intuition is "different kinds of memory live in different registers and you only strike the one you need," that is the tiering in §4.2 and it needs no new word.

**Recommendation:** use **"context folding"** for the expand/contract behaviour and **"tiered memory"** for the registers. Both are legible to the literature and both already have evidence behind them. The design in §4 is what the operator is asking for; only the vocabulary changes.

---

## 2. Survey

Sources are dated and linked. Items marked ⚠️ could not be fully verified and are flagged rather than dropped.

### 2.1 Hierarchical / tiered memory

**MemGPT** (Packer et al., UC Berkeley, arXiv [2310.08560](https://arxiv.org/abs/2310.08560), Oct 2023) is the origin of OS-style paging for agents: **main context** (system instructions + working context + FIFO queue = "RAM") vs **external context** (recall storage + archival storage = "disk"), with the model issuing its own function calls to page between them. Deep Memory Retrieval: GPT-3.5 38.7% → **66.9%**; GPT-4 32.1% → **92.5%**; GPT-4-Turbo 35.3% → **93.4%**. ⚠️ The widely-quoted 93.4% is GPT-4-**Turbo**, not GPT-4.

Its evolution into **Letta** is instructive for a project like this one. MemGPT's two hardcoded blocks became arbitrary labelled **memory blocks** with per-block token limits and cross-agent shareability. Then in Oct 2025 `letta_v1_agent` **deprecated `memgpt_v2_agent` and removed the heartbeat and `send_message` scaffolding entirely**, on the rationale that frontier models are now trained to their own agent loops and the 2023 scaffolding fights them. No published numbers accompany the change. The lesson for us: *elaborate memory scaffolding has a shelf life; the durable part is the data model, not the control flow.*

Cognitive splits come from **CoALA** (Sumers, Yao, Narasimhan, Griffiths, arXiv [2309.02427](https://arxiv.org/abs/2309.02427)) — working / episodic / semantic / procedural. Cite it for vocabulary only: **it is a framework paper and reports zero benchmark numbers.** For the *procedural* tier specifically — the one that matters most for a skill library — **Memp** (arXiv [2508.06433](https://arxiv.org/abs/2508.06433), Aug 2025) is the better reference: Build/Retrieve/Update over distilled trajectories, with the notable result that **procedural memory built by a stronger model transfers to a weaker one**.

Surveys: **A Survey on the Memory Mechanism of LLM-based Agents** (arXiv [2404.13501](https://arxiv.org/abs/2404.13501)) is the standard 2024 citation and is now dated. **Rethinking Memory in LLM based Agents** (arXiv [2505.00675](https://arxiv.org/abs/2505.00675)) supplies the most reusable artifact: six atomic operations — **Consolidation, Updating, Indexing, Forgetting, Retrieval, Condensation**. The most current large survey is arXiv [2602.06052](https://arxiv.org/abs/2602.06052) (Jan 2026), which adds an axis this fleet cares about: **agent-centric vs user-centric memory**. And **Anatomy of Agentic Memory** (arXiv [2602.19320](https://arxiv.org/abs/2602.19320)) is a deliberately sceptical survey — "empirical foundations remain fragile," naming benchmark saturation, LLM-judge sensitivity and backbone dependence.

Systems worth knowing: **A-Mem** (Zettelkasten-style auto-linked notes, arXiv [2502.12110](https://arxiv.org/abs/2502.12110)) · **Mem0** (arXiv [2504.19413](https://arxiv.org/abs/2504.19413): LoCoMo 66.88% vs OpenAI memory 52.90%, p95 1.44s vs 17.12s) · **Zep/Graphiti** (arXiv [2501.13956](https://arxiv.org/abs/2501.13956): bi-temporal knowledge graph, DMR 94.8%).

**The result that should temper all of the above — MemDelta** (arXiv [2606.29914](https://arxiv.org/abs/2606.29914), Jun 2026). One-variable-at-a-time on LongMemEval-S: verbatim RAG ≈ full context (47.2% vs 49.8%, **p=0.34**); swapping **only the embedding model shifts accuracy ±6.2pp (p=0.004)**; **agent self-memory (42%) loses to basic retrieval (47%)**; and Mem0 ties cloud RAG on 2 of 6 question types **at 50× the cost**. Practical consequence for this project: *any architecture decision resting on a sub-10pp benchmark delta is standing on sand.*

### 2.2 Summarisation ladders, compaction, and when re-summarising corrupts

The canonical ladder is **Recursively Summarizing Enables Long-Term Dialogue Memory** (arXiv [2308.15022](https://arxiv.org/abs/2308.15022), *Neurocomputing* 2025) — memorise a small context, then recursively produce new memory from (previous memory + next context). Note what it does *not* do: **it never measures cumulative drift across many rungs.** Anthropic's [*Effective context engineering for AI agents*](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) (Sept 2025) gives the production framing — **compaction**, **structured note-taking**, sub-agents returning 1,000–2,000-token distilled summaries, and the **attention budget** argument for why more context is not free.

**The evidence that it degrades is now strong and specific:**

- **Context Rot** (Hong, Troynikov, Huber; Chroma, July 2025, <https://www.trychroma.com/research/context-rot>) — **18 models**, 8 input lengths × 11 needle positions. Low needle-question semantic similarity → steeper degradation with length. A **single distractor** already degrades performance; impact is non-uniform. Most counterintuitive and most relevant to how a compacted context is ordered: **models did better on shuffled haystacks than logically coherent ones**, across all 18 models. On LongMemEval (~113k tokens) every family scored significantly higher on **focused ~300-token prompts** than full ones.
- **⭐ Governance Decay** (arXiv [2606.22528](https://arxiv.org/abs/2606.22528), Jun 2026) — the cleanest causal evidence. ConstraintRot: **1,323 episodes, 7 model families.** Constraint violation rises from **0% with the policy in full context to 30% after compaction, peaking at 59%**. Crucially conditional on the summariser: when the constraint **survived** summarisation, **0%** violation; when **dropped**, **38%**. Their training-free fix — **Constraint Pinning**, isolating governance text from lossy compression — restored 0%. This is the same idea as Accordion's protected tail: *some blocks must never be folded.*
- **Self-Compacting Language Model Agents** (arXiv [2606.23525](https://arxiv.org/abs/2606.23525), Jun 2026) — argues **compaction timing dominates compaction quality**. Reactive compaction waits too long; periodic compaction discards indiscriminately. Gating on task completion / trajectory convergence and suppressing mid-derivation: **up to +18.1 points on math, +5–9 on agentic search**, at **30–70% lower per-question cost** than fixed-interval compaction.
- **Slipstream** (arXiv [2605.08580](https://arxiv.org/abs/2605.08580)) names the structural problem: *"the compactor must condense context but is fundamentally unaware of precisely what information the agent will need later."* Errors then propagate as "coherent but incorrect behavior."
- **LLM as a Broken Telephone** (arXiv [2502.20258](https://arxiv.org/abs/2502.20258), ACL 2025) — chained iterative generation: **distortion accumulates over iterations**, mitigable but not eliminable by prompting. ⚠️ Per-iteration magnitudes are not in the abstract.
- **Lost in the Middle** (arXiv [2307.03172](https://arxiv.org/abs/2307.03172)) and **NoLiMa** (arXiv [2502.05167](https://arxiv.org/abs/2502.05167), ICML 2025 — at 32K, **11 of 13 long-context models fall below 50% of their short-context baseline**; GPT-4o 99.3% → 69.7%) bound how much a long context can be trusted in the first place.
- **Rate–distortion framing** (arXiv [2607.08032](https://arxiv.org/abs/2607.08032), Jul 2026) unifies KV-cache management, prompt pruning and memory consolidation as one problem, and states the gap plainly: *"while compression is measured carefully on single-turn long context, **the repeated compaction that agents actually perform is almost never measured**."*

**Honest gap statement:** nobody has published a clean loss-per-summarisation-generation curve for agent memory. What exists is content-specific loss at *one* boundary (Governance Decay), timing-sensitivity evidence (SelfCompact, Slipstream), and analogous multi-generation drift in translation chains (Broken Telephone). A useful counterweight: a small LessWrong experiment ([Apr 2025](https://www.lesswrong.com/posts/KHHSryJAezhHmBEu6/does-summarization-affect-llm-performance)) found summarisation hurt only the *stronger* model (o3-mini 75% → 64%; GPT-4o-mini 41% → 41%) and that **degree of compression showed no correlation with degradation** — compressing to 1/5 was about as good as light compression. ⚠️ Small, unreviewed, 3–5 rounds.

### 2.3 Retrieval-augmented agent memory

This repo already does hybrid sparse+dense (§3.2), so the relevant question is what to tune rather than what to build.

**Anthropic's [Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval)** (Sept 2024) is the best-measured single result, on top-20 retrieval failure rate against a 5.7% baseline:

| Configuration | Failure rate | Reduction |
|---|---|---|
| Contextual embeddings | 3.7% | 35% |
| + contextual BM25 | 2.9% | 49% |
| + reranking | 1.9% | 67% |

⚠️ Internal evals on internal datasets, and the 67% arm bundles a reranker. The transferable lesson is that **the win comes from adding context to chunks, not from smarter chunk boundaries** — Chroma's [chunking evaluation](https://www.trychroma.com/research/evaluating-chunking) similarly found 200-token chunks beat 800-token on nearly every metric and that the common 800/400-overlap default scored below average.

**Hybrid fusion.** RRF is Cormack, Clarke, Buettcher & Lynam, SIGIR 2009 ([10.1145/1571941.1572114](https://dl.acm.org/doi/10.1145/1571941.1572114)) — `score = Σ 1/(k + rank)`, **k=60**, which is why every vector DB defaults to 60. Current guidance (**Balancing the Blend**, arXiv [2508.01405](https://arxiv.org/abs/2508.01405), 11 datasets) finds a **"weakest link" effect: one weak retrieval path measurably drags down the fused result.** ⚠️ **Arithmetic correction worth carrying:** the widely-circulated "7.4% hybrid lift" on WANDS compares a *tuned* hybrid-plus-name-boost against BM25. **Plain RRF over BM25+dense is only +1.2% over BM25 and +1.7% over pure dense.** Hybrid is the right cheap default — it is robust on IDs, block names and error strings, which is exactly this fleet's vocabulary — but expected gains over a strong dense path are low single digits.

**⚠️ Reranking is the weakest evidence area.** The oft-repeated "+5 to +15 nDCG@10 from a cross-encoder" has **no traceable primary source**; Cohere's Rerank 3.5 changelog contains zero numbers. Verified academic deltas are much smaller (a controlled biomedical study puts cross-encoder reranking at 0.827 vs 0.822 dense-only).

**For agent memory specifically**, generic document-RAG underperforms: **LongMemEval-V2** (arXiv [2605.12493](https://arxiv.org/abs/2605.12493), May 2026 — agent *trajectories*, up to 115M tokens) reports **AgentRunbook-C 72.5% vs best RAG 48.5%**. **xMemory** (arXiv [2602.02007](https://arxiv.org/abs/2602.02007)) diagnoses why: agent streams are "bounded and coherent" with near-duplicates, so top-k returns **redundant** context. That diagnosis applies directly here — 179 skill families across 500 near-duplicate entries is precisely a redundant-top-k problem.

### 2.4 Reflection / consolidation loops and their real token cost

**Generative Agents** (Park et al., arXiv [2304.03442](https://arxiv.org/abs/2304.03442), UIST '23) is the reference design. Verified specifics: retrieval scores `α_recency·recency + α_relevance·relevance + α_importance·importance` with all α = 1; **recency = γ^(sandbox hours since last retrieval), γ = 0.995** — note the clock is *since last access*, making it LRU-flavoured rather than pure age. Reflection fires **when summed importance of recent events exceeds 150**, which in practice meant **roughly two or three reflections per agent per day**. Ablation (TrueSkill believability): full **μ=29.89** → no-reflection **μ=26.88** → no memory/planning/reflection **μ=21.21**. So reflection does real work.

**What it costs.** The paper's own limitations section: **"required substantial time and resources to simulate 25 agents for two days, costing thousands of dollars in token credits."** ⚠️ **Correction to a widely-cited figure:** the "up to a thousand dollars for 3 days" line is from a **Hacker News commenter**, not the authors — do not attribute it to the paper.

**Does consolidation pay for itself?** The literature's answer is: **only if the consolidated artifact is read many times.**

- **Sleep-time Compute** (arXiv [2504.13171](https://arxiv.org/abs/2504.13171), Letta/Berkeley) is the clearest positive: pre-computing over context before queries arrive gives **~5× less test-time compute at equal accuracy** and **~2.5× lower cost per query when amortised across related queries on the same context**. The amortisation framing is the whole answer — **a single-read consolidation is strictly a loss.**
- **Affordable Generative Agents** (arXiv [2402.02053](https://arxiv.org/abs/2402.02053)) gets its savings mostly by **replacing LLM calls with learned policies**, not by reflecting better: Stanford Town 25 agents **25.41M → 10.86M tokens (42.7%)**; VirtualHome single agent **34,327 → 1,189 tokens (3.4%)**.
- **AgentDiet** (arXiv [2509.23586](https://arxiv.org/abs/2509.23586)) achieves **39.9–59.7% input-token reduction and 21.1–35.9% total cost reduction at equal performance** by **deleting** useless/redundant/expired trajectory content — **with zero extra LLM calls**. Deletion beats summarisation on cost by construction.
- **⭐ Useful Memories Become Faulty When Continuously Updated by LLMs** (arXiv [2605.12978](https://arxiv.org/abs/2605.12978), May 2026) is the strongest critique. Memory utility first rises, then degrades, and can fall **below the no-memory baseline**: **GPT-5.4 fails on 54% of ARC-AGI problems it had previously solved without memory**, even when consolidating from *ground-truth* solutions. Blame is placed on **the consolidation mechanism itself, not the source material** — identical trajectories yield qualitatively different memories under different update schedules. Recommendation: keep raw episodes as first-class evidence and **gate consolidation explicitly rather than firing it after every interaction.**
- **LLMs Cannot Self-Correct Reasoning Yet** (arXiv [2310.01798](https://arxiv.org/abs/2310.01798)) bounds pure introspection: without external feedback, self-correction often *degrades* performance. **Reflexion** (arXiv [2303.11366](https://arxiv.org/abs/2303.11366), 91% pass@1 on HumanEval vs 80%) is the positive case — and note its essential precondition, that it reflects against **external task feedback (test results)**, not introspection. *This fleet has exactly that kind of external signal: critic verdicts and execution outcomes.*

⚠️ **Do not cite as literature:** the circulating "a two-round Reflexion loop costs 3–5×", "a 10-cycle loop costs 50×", "memory cuts 90% of token costs" figures. None trace to a primary source.

### 2.5 Forgetting and eviction

**⭐ The best single citation that unbounded memory hurts** — *How Memory Management Impacts LLM Agents* (Xiong et al., Harvard/MSU/UGA, arXiv [2505.16067](https://arxiv.org/abs/2505.16067), ACL 2026):

| EHRAgent configuration | Accuracy | Records |
|---|---|---|
| Fixed memory (no additions) | 16.75% | 100 |
| **Add-all** | **13.05%** | **2,411** |
| Selective (strict) | 38.50% | 1,012 |
| **Selective + deletion** | **42.34%** | **248** |

**Add-all is worse than never adding anything at all**, on two independent agents (AgentDriver replicates: fixed 40.11% → add-all 32.32% → strict 51.00%). And deletion gained **+3.8pp at roughly a quarter of the store size**. The named mechanisms — *experience-following*, *error propagation*, *misaligned experience replay* — describe this repo's skill library exactly.

**⭐ Classic cache policies do not transfer.** *When Classic Cache Policies Fail* (arXiv [2607.00394](https://arxiv.org/abs/2607.00394), Jul 2026), 8 policies × 4 capacities on LoCoMo + DialSim: **LRU and LFU consistently underperform plain FIFO on semantic workloads** — recency and frequency proxies do not carry over from block caching. Synthetic pools show an **inverted-U between store size and retrieval quality**. Directly relevant: this repo's `evictWorst()` is an importance-weighted policy, which is the right family, but its importance signal is corrupted (§3.3).

**Dilution is measurable.** *When More Documents Hurt RAG* (arXiv [2606.11350](https://arxiv.org/abs/2606.11350)): a deployed system going from **54 → 1,128 documents (88,907 chunks) dropped accuracy from 75% to below 40%**. Plus a **hard-negatives paradox** — stronger embedding models generate *more plausible* distractors.

**Decay and invalidation.** Generative Agents' γ=0.995-per-hour-since-access is the common decay reference. **MemoryBank** (arXiv [2305.10250](https://arxiv.org/abs/2305.10250), AAAI-24) is the Ebbinghaus-forgetting-curve precedent — ⚠️ but its evaluation is **qualitative; it reports no quantitative benchmark showing the forgetting curve improves retrieval.** It is a design precedent, not evidence. **FadeMem** (arXiv [2601.18642](https://arxiv.org/abs/2601.18642), Jan 2026) is one of the few papers where pruning *improves* accuracy: **45% storage reduction with better LoCoMo multi-hop F1**. For contradiction handling, **Mem0**'s ADD/UPDATE/DELETE/NOOP and **Zep/Graphiti**'s **bi-temporal edges** (four timestamps; new edges **invalidate rather than delete**, keeping superseded facts auditable) are the two established patterns.

**Security case for bounded, invalidatable stores:** AgentPoison (arXiv [2407.12784](https://arxiv.org/abs/2407.12784), NeurIPS 2024) achieves **>80% attack success at <0.1% poison rate** with no retraining. An unbounded, never-invalidated memory is an unbounded attack surface.

### 2.6 What the survey implies for this fleet

Three synthesis points carried into the design:

1. **The expand/contract intuition is correct and independently converged on under four names** (context folding, elastic context, selective re-expansion, expand-on-demand hierarchy). The design is well-supported by the literature; only the *name* "accordion" is novel, and it is already taken.
2. **The dangerous operation is consolidation, not deletion.** Deletion is cheap and roughly free-to-positive on accuracy (EHRAgent 1,012→248 records while accuracy rose 38.50%→42.34%; FadeMem −45% storage with better F1; AgentDiet 21–36% cost cut at equal performance, zero extra calls). Eager consolidation is what silently loses constraints (0%→30%, peak 59%) and can push memory *below* the no-memory baseline (54% regression on previously-solved problems). **Prefer invalidation-with-provenance and gated, amortised consolidation over eager rewriting.**
3. **Do not buy a memory framework on a small benchmark delta.** MemDelta shows swapping only the embedding model moves accuracy ±6.2pp — larger than many headline architecture claims.

**⚠️ Unverified / flagged across this survey:** MTEB leaderboard state mid-2026 (contradictory secondary sources; do not quote a ranking); Cohere Rerank 3.5's marketing deltas (changelog has no numbers); "cross-encoders give +5–15 nDCG@10" (untraceable); the WANDS "7.4% hybrid lift" (misattributed — true basic-RRF lift is +1.2%); all Reflexion cost multipliers ("3–5×", "50×") (vendor blogs only); the "$1,000 for 3 days" Generative Agents figure (a Hacker News comment, not the authors); arXiv 2010.16248, 2604.16839, 2605.30690 (abstract pages not fetched). Several 2026 items cited are **single-author preprints with no stated venue** — existence, authorship and abstract claims verified, but peer review has not happened: 2606.22528 (Governance Decay), 2606.15903, 2606.06240.

---

## 3. Current state: what mc-fleet-bot remembers today

Measured live on 2026-07-24 (fresh counts, not inherited from the companion docs).

### 3.1 The stores that exist

| Store | File | Size / rows | Cap | Forgetting policy | Status |
|---|---|---|---|---|---|
| Skill library (procedural) | `skills/index.json` + 934 `.js` | 2.7 MB / **518** (500 active + 18 deprecated) | **500** (`config.yml:92`) | `evictWorst()` `SkillLibrary.ts:341` + quality decay 0.999/7 d | ✅ works |
| Skill embeddings | inline in `index.json` | 518 × 256-dim ≈ **1.6 MB (60% of the file)** | — | — | ✅ |
| Blocker memory (negative) | `data/blockers.json` | 10 KB / **29** | **none** | **none** | ⚠️ §3.4 |
| World memory (positive spatial) | `data/world_memory.json` | 7.4 KB / **38** | 2,000 | confidence decay 30 min, lazy prune | ✅ |
| Shared world model | `data/shared_world.json` | **3.0 MB** | resources 500, chunks 50k, **threats none** | **`pruneExpired()` has zero callers** | ❌ §3.6 |
| Blackboard | `data/blackboard.json` | 76 KB | messages 200, terminal tasks 500 | 5 GC passes, all called | ✅ best-in-repo |
| Bot reputation | `data/bot_reputation.json` | 396 KB / 2,061 events | 5,000 | 24 h half-life, hard delete at 14 d, hourly | ✅ best-in-repo |
| Social memory | `data/social_memory.json` | 37 KB | 100/bot (`scout` pinned at 100) | emotional decay only | ✅ |
| Skill attribution | `data/skill_attribution.json` | 125 KB / 356 rows | **unbounded** | **`prune()` has zero callers** | ❌ |
| Plan templates | `data/plan_templates.json` | 41 KB / 79 | **none** | **none** | ⚠️ |
| Q&A cache | `data/qa_cache.json` + embeddings | 5 KB + 70 KB / **15** | 200 | trim on load + update | ⚠️ §4.5 F-B/F-C |
| Token ledger | `data/token-ledger.json` | 2.6 MB | 10,000 | ring (at cap) | ✅ |
| Town chronicle / events / journals | `data/town.db` (SQLite) | 143 KB / **every table 0 rows** | none | **no retention logic exists** | dormant |
| Affinities, conversations | `data/affinities.json`, `conversations.json` | **do not exist on disk** | 20 events / 20 msgs | decay toward default | ⚠️ never flushed |

Three things this table says that the design has to answer.

**(a) Every store except `town.db` is a whole-file JSON rewrite.** `shared_world.json` is 3.0 MB and `skills/index.json` is 2.7 MB, and `SkillLibrary.recordOutcome()` triggers a **full 2.7 MB rewrite plus `rebuildIndexStats()` plus `vectorCache.clear()` on every single task outcome** (`SkillLibrary.ts:379`). At ~14,500 evaluations/day on a 2-vCPU box at load 5.45, that is the memory layer's largest unbudgeted cost, and it is why the design moves high-churn tiers to append-only/SQLite.

**(b) The forgetting policies that work and the ones that are dead are both already in this repo.** `BotReputation` (24 h half-life, 14-day hard delete, hourly `setInterval`) and `BlackboardManager` (five GC passes, all wired) are correct and should be the template. `SharedWorldModel.pruneExpired()` and `SkillAttribution.prune()` are written, correct, and **never called from anywhere in `src/`, `test/`, `e2e/`, `scripts/` or `tools/`**. A forgetting policy that is not on a timer is not a forgetting policy.

**(c) Observation rendering is CPU-expensive, not just token-expensive.** `getNearbyBlocks` samples a 9×7×9 grid = **567 `bot.blockAt()` calls per observation render** (`Observation.ts:180-205`), and `buildTerrainSummary` scans 81 columns × 17 blocks = **1,377 `blockAt` calls per build-task prompt** (`TerrainSummary.ts:102-103`). On 2 vCPU this is a measurable share of the tick budget. The accordion (§4.3 T1) therefore saves CPU as well as tokens — R0 skips the render entirely.

### 3.2 Retrieval is already hybrid, and it is now correct

`SkillLibrary.searchWithScores()` (`src/voyager/SkillLibrary.ts:157-242`) is a genuine hybrid sparse+dense scorer:

| Signal | Weight | Line |
|---|---|---|
| Exact keyword match | +5/word | `:191` |
| Exact word in name / description | +4 / +3 | `:196`, `:201` |
| Multi-word bonus | +2 × matched | `:212` |
| Exact-description bonus | +12 | `:213` |
| **TF-IDF sparse cosine** | **× 20** | `:215` |
| **Dense embedding cosine (256-dim)** | **× 25** | `:217` |
| Laplace quality | × 10 | `:219` |
| Popularity (saturating) | `+6 · s/(s+5)` | `:232` |
| Reliability penalty (saturating) | `−8 · f/(f+5)` | `:233` |

Retrieval is gated at four different thresholds, all on the same score scale: `getTopKSkillCode` keeps `score ≥ 6`, `getComposableMatches` keeps `score ≥ 8` **and** `isHighQuality`, `getBestMatch` requires `score ≥ 16` **and** `matchedWords > 0`, and `VoyagerLoop`'s `STRONG_DIRECT_SKILL_SCORE = 24` bypasses codegen entirely.

The unbounded-popularity defect documented as D1 in `skill-reuse-and-techniques.md` **has been fixed** — the terms now saturate (`POPULARITY_WEIGHT = 6`, `POPULARITY_HALF_LIFE = 5`), so content decides which skill wins and reputation only breaks ties. A 27-word `STOPWORDS` set exists (`:86-90`, D3 fixed), `save()` returns the real `finalName` (`:280`), and eviction exists (D4 fixed).

**The scoring function is in good shape. Two structural defects behind it are not, and both are memory-lifecycle bugs rather than retrieval bugs:**

- **Index rows point at `.js` files that no longer exist, and the count is growing in real time.** Measured at 26 during this audit and **32 twenty minutes later**, on a live fleet. They still score and can still win a retrieval contest, but `getCode()` returns `null`, so the win is wasted and the task falls through to codegen. The cause is `evictWorst()` unlinking a file while another bot's `SkillLibrary` instance still holds that row in its in-memory index — each of the 5 bots constructs its own `SkillLibrary` over the same shared `skills/` directory (`VoyagerLoop.ts:245`) and `saveIndex()` rewrites the whole file from its own copy, so last writer wins. A store with five concurrent writers needs a single owner or a read-merge-write, plus a referential-integrity pass on load.
- **A dense-embedding failover would silently disable semantic retrieval.** Embeddings are 256-dim from Gemini; the registered fallbacks are OpenAI `text-embedding-3-small` (**1536-dim**) and VoyageAI (also not 256). `cosineSimilarityDense` returns `0` on a length mismatch (`SkillLibrary.ts:625`) rather than raising. So a provider failover degrades the ×25 dense term to zero across the whole library, with no error and no log line — and the store would then be *permanently poisoned* with mixed-dimension vectors. The embedding dimension must be part of the stored record and validated on read.

### 3.3 The eviction incident, and what it actually taught

The operator's framing is right: the library hit a hard 500 cap and **495 saves were rejected** while only 325 were accepted — 60% of everything the fleet learned was discarded. `evictWorst()` fixed the symptom. The comment at `SkillLibrary.ts:282-284` records the diagnosis honestly.

But the live numbers show eviction converted a *stall* into a *treadmill*:

```
active entries            500  (pinned exactly at cap)
semantic families         179  → 2.8 near-duplicates per family
zero-success entries      272  (54% of the cap)
orphan .js files          449  of 934 (48%, on disk but not in the index)
dangling index rows     26→32  (indexed, .js gone — grew during this audit)
top family      walk_to_the_nearest_shore × 76
                mine_N_oak_log            × 32
                explore_<dir>_for_N_blocks × 96 combined
```

At cap, every save forces exactly one eviction, so the library sits permanently pinned at 500. In the current log window there were **364 saves and 33 evictions** — the eviction rate rises as the library saturates and from here it is 1:1. The library is spending its entire capacity churning 179 concepts through 500 slots.

**Three lessons, all of which the design below encodes:**

**1. Eviction is necessary but insufficient — a cap with eviction and no *admission control* is a treadmill.** The fix is to not create the 77th `walk_to_the_nearest_shore` in the first place: dedupe-on-write (reject a save whose embedding is ≥0.97 similar to an incumbent with an equal-or-better success rate, and record an outcome against the incumbent instead), plus parameterisation of the `explore_<dir>_for_N_blocks` and `mine_N_<log>` families. That alone collapses 500 slots to ~180 and the cap stops binding.

**2. The rich-get-richer ratchet is still live, in a new form.** `skill-reuse-and-techniques.md` D2 identified that `save()` discarded the versioned `finalName`, so successes credited the base name while failures credited the versioned name. `save()` now returns `finalName` — but the *caller* is still wrong, and the ratchet survives:

```
VoyagerLoop.ts:1762-1769   on critic PASS  → save(taskToSkillName(task), …)  →  name collides
                                            →  creates a FRESH _vN entry
                                            →  recordOutcome(savedName, true)   ← credit goes to the new entry
VoyagerLoop.ts:1801        on reuse FAIL   → recordOutcome(bestSkill.name, false) ← debit goes to the REUSED entry
```

Those two lines are the **only** `recordOutcome` call sites in `src/`. Consequence: **a reused skill that succeeds is never credited.** The success path always mints a new `_vN` and credits that, while the incumbent absorbs every failure. This is precisely the engine producing 272 zero-success entries and 179 families across 500 slots — the library manufactures a new near-duplicate on every success and penalises the skill that actually did the work. **Fixing admission control without fixing this credit path just moves the churn.** The correct behaviour: when the executed code came from the library, call `recordOutcome(bestSkill.name, true)` and do not save at all; only save when the code was freshly generated.

**3. `failureCount` is a corrupted eviction signal in this world.** `evictWorst()` ranks unproven-first, then **most-failed-first** (`:347`). But 11,512 of 14,489 task evaluations in the current log window fail with `please explore first` — an *environmental* failure. A perfectly good `mine_1_oak_log` skill accrues failures because there is no oak nearby, and eviction then deletes it. Eviction must discriminate **code failure** from **precondition failure**, and must not evict below a minimum trial count. Combined with lesson 2, the current policy preferentially evicts the skills that are actually being used.

### 3.4 The hole: there is positive world memory but no negative world memory

This is the single most important finding in this document.

`data/world_memory.json` holds 48 records of the form:

```json
{ "kind": "resource", "name": "iron_ore", "x": 18, "y": 14, "z": -70,
  "updatedAt": 1784920429818, "confidence": 1 }
```

That is a **positive** spatial memory: "I saw iron here." There is no corresponding **negative** spatial memory: "I searched the region around (0,64,-100) at radius 64 and there was no oak_log." So the fleet cannot remember absence.

The consequence is measurable and it dominates everything else:

| Signal (current log window, ~17.8 h) | Count |
|---|---|
| `Voyager task evaluated` | 14,489 |
| **`please explore first`** | **11,512 (79%)** |
| `Abandoning task: same error appeared twice` | 2,834 |
| `Reusing saved skill` | 8,688 |
| Code generation events | 13,372 |

And the store that is supposed to catch this — `BlockerMemory` — has **29 records, 25 of them with `count: 1`**, against ~13,000 failures:

```
Counter({1: 25, 2: 3, 6: 1})
```

`hasStrongBlocker` requires `count >= 2`. It effectively never fires. So the fleet proposes "Mine 1 oak log", retrieves a skill, executes it, discovers there is no oak, fails, regenerates code (which cannot make oak appear), fails again, abandons — and then proposes "Mine 1 oak log" again two seconds later, having recorded nothing.

Four compounding reasons the counter never reaches 2, all visible in `BlockerMemory.ts`:

| # | Cause | Location |
|---|---|---|
| 1 | Records key on the composite **`(free-text task description, blocker-class)`**. Any rewording forks a new row, and the class is re-derived from error text each time by substring match, so `general`/`materials` alternate and split the count. | `:30`, `classifyBlocker` `:91-109` |
| 2 | `clearTask()` deletes **all** records for a task on a single success. At a 2% pass rate that resets the counter indefinitely. | `:41-44` |
| 3 | The two dominant failure exits — abandon-on-duplicate-error (2,834 events) and `ErrorRecovery.replaceTask` — return without recording anything. | `VoyagerLoop.ts:1846` |
| 4 | There is **no bot dimension**, so five bots' independent discoveries of the same absence merge into one counter rather than reinforcing it — and no cap and no TTL, so what does get written never expires even after the world changes. | `:30`, whole file |

There is also a *working* mechanism sitting unused next to the broken one: `isOnCooldown(task, cooldownMs)` (`:62-65`) already implements exactly the time-decaying suppression the design needs. It fires on the same `count >= 2` that never happens.

**This is a memory-architecture failure, not a caching failure.** No prompt cache, no semantic cache and no cheaper model fixes it, because the calls are *correctly* generated answers to a question that should never have been asked.

### 3.5 Context folding is already half-built — and it only inflates

`ActionAgent.generateCode` already varies its context by attempt:

- `formatCompactObservation(obs, category, !previousError && !previousCode)` (`:271`) — a **compact** first attempt.
- `buildIterativeContext(previousCode, previousError, critique, eventLog, blockerSummary, worldMemory)` (`:315`, defined `:376-395`) — adds prior code, error, chat log, blockers and world memory on retries.

So an expand-on-failure mechanism exists — this is the operator's "accordion", already half-implemented. It has three defects, and the literature names all three:

1. **It never contracts.** There is no path that shrinks context after a success, and no notion of a bot being "confident" about a task family it has completed 500 times. ACE (arXiv 2606.31564) calls the missing piece *elastic typing* — assigning each element raw/abstract/drop per decision, in both directions.
2. **The expansion is binary, not graded.** Attempt 2 and attempt 10 get the same payload. There is no escalation ladder and no stopping rule. SelfCompact (arXiv 2606.23525) is the direct finding here: **compaction timing dominates compaction quality**, and the two failure modes are firing indiscriminately and waiting too long. This fleet does both.
3. **It inflates the wrong axis.** `Chat log:` is emitted unconditionally even on the first attempt (`:384`), and `blockerSummary` is passed but — per §3.4 — is nearly always empty. Meanwhile 70% of every input token spent is a byte-identical static system prefix (`call-volume-audit.md` §6). The context is simultaneously too big in the constant part and too undifferentiated in the variable part.

There is also a fourth property worth noting because it is *correct* and should be preserved: `formatObservationWithWarmup` (`Observation.ts:119-158`) already graduates field inclusion by `completedTaskCount` via `WARMUP_THRESHOLDS`, with an 80% stochastic inclusion once a field unlocks. That is a genuine contraction mechanism — it is simply on the wrong axis (bot age rather than task-family confidence) and it applies only to the curriculum path, not codegen.

### 3.6 Written-but-never-called forgetting policies

`data/shared_world.json` is 3.0 MB. Its contents:

| section | rows | bytes | note |
|---|---|---|---|
| `threats` | **11,108** | **1.87 MB (61%)** | **every single one is already past `expiresAt`** |
| `exploredChunks` | 208 | — | cap 50,000 |
| `bots` | 5 | — | |
| `resources` | **0** | — | cap 500 |

`reportThreat()` does an unconditional `this.threats.push(record)` with **no cap** (`SharedWorldModel.ts:155-166`). `DEFAULT_THREAT_TTL_MS` is 5 minutes, but it is applied only as a *read-time filter* in `queryThreatsNear` and `getSnapshot` — never as a delete. The function that would delete them, `pruneExpired()` (`:276-303`), is correct, complete, and **has zero callers anywhere in the repository**. Resource confidence decay (`CONFIDENCE_DECAY_PER_HOUR = 0.05`) lives inside the same dead function, so it never runs either.

`SkillAttribution.prune(minUses, maxAge)` (`:252-274`) is the same story: written, correct, zero callers, store unbounded at 356 rows and growing.

This is the most instructive fact in the whole audit. The forgetting policies were *designed*; nobody wired them to a timer. **61% of the fleet's largest memory file is garbage that a five-minute TTL should have removed**, and the cost is paid every ~2 seconds as a 3 MB atomic rewrite on a 2-vCPU box at load 5.45. The design's answer is §4.1 R5 and a single owner for retention scheduling, not more policies.

### 3.7 The one consolidation loop that is built correctly

`src/town/ChronicleGenerator.ts` is the in-repo reference implementation for LLM-based consolidation, and the design below generalises it rather than inventing something new. It has every property a consolidation pass needs:

- **Idempotent** per `(townId, dayNumber)` — an existing daily row short-circuits the call (`:160`).
- **Budgeted** — `DEFAULT_BUDGET_USD = 0.5` per town per Minecraft day, checked *before* the call (`:169`), with a persisted per-town ledger so a restart does not reset it.
- **Input-capped** — `MAX_EVENTS_IN_PROMPT = 60`, `MAX_RESIDENTS_IN_PROMPT = 8`.
- **Output-capped** — `MAX_RESPONSE_TOKENS = 800`.
- **Has a zero-LLM fallback** — `quietDayPlaceholder()` produces a valid entry with no call at all on a quiet day, and again on LLM failure (`:200`, `:217`).

That last property is the one most consolidation designs omit and the one that makes the cost bound real.

Two caveats. First, **the town subsystem is currently dormant** — every table in `data/town.db` has 0 rows — so this loop costs nothing today and its budget discipline is untested in production. Second, the town append-only logs (`events`, `chronicle_entries`, `bot_journals`, `disasters`, `style_observations`) have **no cap, no TTL and no retention logic of any kind**. They are the next `shared_world.json` waiting to happen once towns are founded.

The only other LLM-written memory in the repo is `CultureManager.ts:287-302`, which feeds `recentChat.slice(-40)` to a model with *"Distill the memes"*. It is a genuine consolidation call and it is the one place a summarisation ladder would be legitimate — but it has no callers today.

**There is no memory-consolidation, experience-replay or self-reflection pass anywhere in the codebase.** Everything else labelled "summarize" is hard truncation: `slice(-N)`, `slice(0, N)`, or `truncateText`. That is a feature, not a gap — see §4.1 R1.

---

## 4. The design

### 4.1 Design rules, derived from §2 and §3

These are the rules the tiering falls out of. They are stated first because they are what makes this design different from a generic agent-memory stack.

**R1 — This fleet's memory is *structured*, so compress by aggregation, not by generation.**
World state, recipes, schematics, inventories and coordinates are typed records, not prose. A count of oak logs, a block position, an item name — these compress **losslessly** by code (roll up points into a region, count into a histogram, dedupe into a set). Running an LLM over them to produce prose is strictly worse: it costs a call, loses precision, and cannot be re-expanded. **Only the town/social narrative tier is genuinely unstructured**, and it is ~0.1% of event volume. This single rule removes almost all of the summarisation-ladder machinery a chat-agent memory design would need, and with it almost all of the re-summarisation corruption risk documented in §2.2. *This is the most important way this fleet differs from the systems the literature benchmarks* — LoCoMo and LongMemEval measure recall over dialogue; this fleet's memory is a database.

**R2 — Never re-summarise anything containing exact tokens.**
Coordinates, item ids, block names and counts must survive verbatim or the memory is worse than useless — a bot sent to `(18, 14, -70)` when the iron is at `(18, 14, -71)` digs air. A summarisation ladder is permitted only where the atoms are already lossy (narrative). Everywhere else the ladder is an *aggregation* ladder: points → regions → region statistics, each level derived from raw by pure code and each **recomputable from raw** — the lossless-base-layer property ACE (arXiv 2606.31564) and HORMA (arXiv 2606.11680) both identify as the thing that makes re-expansion possible at all. Governance Decay (arXiv 2606.22528) supplies the corollary: **some blocks must be pinned and never folded.** Here the pinned set is coordinates, item ids and counts.

**R3 — A tier must justify itself by the calls it removes, net of the calls it costs, amortised over expected reads.**
State the arithmetic explicitly per tier (§4.4). Sleep-time Compute (arXiv 2504.13171) gives the rule: consolidation pays **~2.5× when amortised across many reads of the same artifact**, and a **single-read consolidation is strictly a loss**. A tier that costs one LLM call per event to save less than one downstream call must not ship.

**R4 — Negative memory outranks positive memory.**
Remembering "X is not here / X does not work" retires *whole task cycles* (curriculum + codegen + critic + embeds ≈ 4–6 calls). Remembering "X is here" saves at most part of one. Given 79% of this fleet's evaluations are precondition failures, negative memory is the highest-value tier by a wide margin, and it costs zero LLM calls to write. The literature under-serves this: the Always-On Agents survey (arXiv 2606.30306, 435 coded works) finds the field "concentrates more heavily on accumulating and retrieving state than on governing, recovering, or relinquishing it."

**R5 — Every bounded store needs admission control *and* eviction *and* a protection period *and* a live timer.**
§3.3: eviction without admission control is a treadmill; eviction on a corrupted signal (`failureCount` inflated by environmental failures) destroys good entries; eviction without a minimum trial count deletes entries before they have been fairly evaluated. §3.6 adds the fourth clause: a prune function nobody calls is not a policy — 61% of the largest memory file in this repo is expired data behind a correct, dead `pruneExpired()`.

**R6 — Retrieval quality degrades with store size, so forgetting is a *precision* mechanism, not just a space mechanism.**
179 concepts spread across 500 entries makes every retrieval a 500-way contest with 2.8 confusable near-duplicates per concept. Shrinking the store improves the answer. This is the best-evidenced claim in §2.5: **add-all scored *below* never-adding-anything** on two independent agents (arXiv 2505.16067), deletion gained +3.8pp at a quarter of the store size, and a deployed RAG system fell from 75% to below 40% as its corpus grew 54→1,128 documents (arXiv 2606.11350). Note also that classic LRU/LFU **underperform plain FIFO** on semantic workloads (arXiv 2607.00394) — importance-weighted eviction is the right family, which is what `evictWorst()` already attempts.

**R7 — Volatile state must sit after the prompt-cache breakpoint.**
Position, health, inventory, time-of-day and nearby-entity lists change every tick. Any of them ahead of the breakpoint forces a 0% cache hit rate. This constrains *where* in the prompt each tier is rendered, not just what it contains.

### 4.2 The tiers

```
                        WRITE PATH                                    READ PATH
                        (what updates it)                             (what consumes it)

  ┌─────────────────────────────────────────────────────────────────────────────────┐
  │ T0  GIVEN KNOWLEDGE          minecraft-data 3.105.0, 1.21.11          0 calls    │
  │     recipes · tools · drops · foods · hostiles · block ids                       │
  │     WRITE never (versioned static)      READ  code + prompt injection + VM       │
  └─────────────────────────────────────────────────────────────────────────────────┘
        │ never promotes — this is the floor
  ┌─────┴───────────────────────────────────────────────────────────────────────────┐
  │ T1  WORKING SET              per bot · RAM · lifetime = one task step  0 calls   │
  │     position · health · inventory · nearby blocks/entities · terrain             │
  │     WRITE every tick from mineflayer   READ  every codegen/critic call           │
  │     ── THE ACCORDION LIVES HERE: width = f(attempt, task confidence) ──          │
  └─────────────────────────────────────────────────────────────────────────────────┘
        │ episodes appended on task completion (code)
  ┌─────┴───────────────────────────────────────────────────────────────────────────┐
  │ T2  EPISODIC LOG             per bot · append-only SQLite · 7d TTL     0 calls   │
  │     (task, skill used, code hash, verdict, error class, inv delta, pos, t)       │
  │     WRITE on every task evaluation     READ  by CODE only — never by an LLM      │
  └─────────────────────────────────────────────────────────────────────────────────┘
        │ aggregated by pure code — no LLM — on a debounced timer
  ┌─────┴──────────────────────────┬──────────────────────────────────────────────┐
  │ T3  PROCEDURAL                 │ T4  SEMANTIC / DERIVED                       │
  │     the skill library          │                                              │
  │     code validated by          │  T4a POSITIVE SPATIAL   resource sightings   │
  │     EXECUTION OUTCOME          │       points → region rollups (code)         │
  │     cap 500 → target ~200      │  T4b NEGATIVE SPATIAL   searched-and-absent  │
  │     hybrid sparse+dense        │       region × resource × t × radius         │
  │     WRITE on critic pass       │  T4c BLOCKER / NEGATIVE PROCEDURAL           │
  │     READ  before every codegen │       (task → failure class → count → decay) │
  │     ── removes codegen calls ──│  WRITE pure code from T2. READ by the        │
  │                                │  CURRICULUM GATE, before any call is made.   │
  │                                │  ── removes WHOLE TASK CYCLES ──             │
  └────────────────────────────────┴──────────────────────────────────────────────┘
        │ only narrative facts promote further — everything else stops here
  ┌─────┴───────────────────────────────────────────────────────────────────────────┐
  │ T5  NARRATIVE / SOCIAL       per town · SQLite · append-only        COSTS calls  │
  │     chronicle · journals · affinities · diplomacy                                │
  │     WRITE 1 LLM call per town per Minecraft DAY, budgeted, idempotent,           │
  │           with a zero-LLM placeholder fallback  (ChronicleGenerator pattern)     │
  │     READ  dashboard + occasional flavour injection. NEVER on the hot loop.       │
  └─────────────────────────────────────────────────────────────────────────────────┘
```

**The load-bearing asymmetry:** T0–T4 are written and read entirely by deterministic code. Only T5 spends an LLM call to *create* memory. Everything below T5 spends LLM calls only to *consume* memory — and consumes it in order to avoid spending more.

### 4.3 Tier specifications

#### T0 — Given knowledge (0 calls, removes calls)

Already specified in `knowledge-brain-design.md` §2.1 as the "fact store"; not repeated here. The memory-architecture point is only this: **T0 is the floor of the ladder and nothing ever promotes into it.** It is versioned by `minecraft.version`, has no invalidation problem, and any question it can answer must never reach a model. It is `minecraft-data` 3.105.0 — 886 recipes, 1,166 blocks, 1,505 items, already a direct dependency, and currently *withheld* from the codegen sandbox by `ActionAgent.ts:117`.

#### T1 — Working set: context folding (0 calls, removes retry rounds)

Per bot, in RAM, rebuilt each task step, never persisted. **This is the tier the operator's "accordion" intuition names**, and it is the tier where the intuition is most useful. In the literature's vocabulary (§1) it is context folding with selective re-expansion over a lossless base layer — T2 is the base layer, and every register below is recomputable from it.

**Register ladder.** Context width is a function of `(attempt, familyConfidence)` where `familyConfidence` is read from T2/T3 (how often this task family has succeeded recently). The ladder both **expands on failure and contracts on confidence** — the second half is what is missing today:

| Register | Trigger | Contents | Approx. user-msg tokens |
|---|---|---|---|
| **R0 · skill-only** | family success rate > 0.8 over ≥10 recent trials | task string + retrieved skill code. **No observation, no LLM call at all** — execute the skill directly. | 0 (no call) |
| **R1 · compact** | attempt 1 | compact observation (pos, equipment, inventory, 6 nearby blocks) + top-1 skill + T0 facts for the target item | ~600 |
| **R2 · corrective** | attempt 2, or attempt 1 after a recent failure in this family | R1 + previous code + error + critique | ~1,400 |
| **R3 · diagnostic** | attempt 3 | R2 + event log + **T4b/T4c negative memory** + composable skills + terrain | ~2,600 |
| **R4 · stop** | attempt 4 or a T4c strong blocker | **no call.** Record blocker, retire the task, propose a different one. | 0 |

Today the system runs approximately R2 on every attempt and has no R0 and no R4. Adding R0 removes calls outright; adding R4 removes the tail of the failure loop; the R1/R3 grading is a token win rather than a call win.

**Contraction is where this fleet has an advantage the literature does not.** Every adaptive-context mechanism in §1 expands under pressure and contracts on a *heuristic* relevance score — Accordion uses attention from a 500M proxy model, ACE learns an elastic type, HORMA uses summary-tree navigation. All of them are guessing at what will matter later, which is precisely the "structural validation gap" Slipstream names (arXiv 2605.08580): *the compactor cannot know what the agent will need.*

This fleet does not have to guess. It has a **ground-truth external signal — the critic verdict and the execution outcome** — which is the same precondition that makes Reflexion work where pure self-reflection fails (§2.4). A skill that has passed the critic 500 times on this exact task family is *verified*, not *estimated*, so R0 can skip the model entirely with a measurable error rate rather than a hoped-for one. **R0 is the fold fully closed, and it is safe here in a way it would not be in a chat agent.**

The stopping rule matters as much as the expansion. SelfCompact's finding — timing dominates quality, and the two failure modes are firing indiscriminately and waiting too long — describes R4's absence exactly: today the loop expands forever and never decides to stop.

**Cache-boundary rule (R7):** the entire T1 payload is volatile, so it renders *after* the static system prefix, and T0 fact injection goes into the user message, never the system prompt.

#### T2 — Episodic log (0 calls)

Append-only, per bot, in SQLite (`data/episodes.db`), not JSON — the current whole-file-rewrite pattern will not survive one row per task evaluation at ~14,500/day. One row per task evaluation:

```
(ts, botName, taskFamily, taskText, skillUsed, codeHash, verdict,
 failureClass, inventoryDelta, position, regionKey, attempt)
```

`failureClass` is the critical field and is derived by **pure code** from the error string — the distinction that §3.3 showed eviction needs:

| class | meaning | consumer |
|---|---|---|
| `precondition` | `No <X> nearby`, `please explore first` | T4b — write a negative-space record. **Never** penalise the skill. |
| `code` | exception, bad arg, parse failure | T3 — penalise the skill. Retry is justified. |
| `timeout` | execution exceeded budget | T3 weakly; T4c if repeated |
| `environmental` | drowned, killed, fell | neither; retry |

Retention 7 days, then rolled up into T4 and dropped. **Read by code only.** No LLM ever sees raw episodes — that is what keeps this tier free.

#### T3 — Procedural memory: the skill library (removes codegen calls)

Keep the existing hybrid retrieval (§3.2) unchanged; it is now correct. Change the *lifecycle*:

- **Fix the credit path first (§3.3 lesson 2).** When the executed code came from the library, `recordOutcome(bestSkill.name, true)` and **do not save**. Save only when the code was freshly generated. Every other change here is undone by the ratchet if this one is skipped.
- **Admission control.** Before `save()`, reject if `cosine(newEmbedding, incumbent) ≥ 0.97` and the incumbent's success rate is ≥ the candidate's. Record an outcome against the incumbent instead. Target: 500 entries → ~200, cap stops binding, retrieval precision rises (R6).
- **Single-writer index.** Five bots each rewrite `skills/index.json` from their own in-memory copy; that is what produces both the 449 orphans and the growing dangling-row count. Route `saveIndex()` through one owner (the main thread already has worker IPC) or read-merge-write under a lock.
- **Referential integrity on load.** Drop or repair the dangling index rows; re-import or delete the 449 orphan files. Validate `embedding.length` against the active embedding model's dimension and refuse to mix (§3.2).
- **Parameterise the mechanical families.** `explore_<dir>_for_N_blocks` (96 entries) and `mine_N_<log>` (32) become two skills taking arguments. This is Voyager's actual premise and it removes ~26% of the corpus outright.
- **Eviction on a clean signal (R5).** `evictWorst()` must rank on `codeFailureCount` from T2's `failureClass`, not raw `failureCount`, and must exempt entries with fewer than ~5 trials (probation) and entries that are the sole member of their family.
- **Outcome, not similarity, is the correctness signal.** Unchanged and worth restating: codegen reuse goes through T3 where the artefact is validated by execution, never through a text-similarity cache. Two task strings can be 0.98 similar and need different code (`Mine 1 oak log` vs `Mine 1 dark_oak_log`).

#### T4 — Semantic / derived memory (0 calls to write, removes whole task cycles)

The tier that does not exist today and that §3.4 shows is worth more than everything else combined. All three sub-tiers are written by **pure code aggregation from T2** on a debounced timer, never by an LLM.

**T4a — positive spatial.** Today's `world_memory.json`, but rolled up. Points are kept verbatim (R2) and *additionally* indexed by a 64-block region key with counts and last-seen timestamps. Confidence decays with age; a sighting older than N in-game days is demoted, not deleted, so "there used to be iron here" is still a better search hint than nothing.

**T4b — negative spatial (the biggest single win).** Records of the form:

```
(regionKey, resource, searchedAt, radius, foundCount=0)
```

written every time a `precondition` failure or a completed-and-empty exploration occurs. Read by the **curriculum gate** *before* a task is proposed: if the bot is in region R and `mine oak_log` has a negative record for R within the last N minutes, the task is not proposed at all — an explore/relocate task is proposed instead. Negative records expire on a timer (the world changes, and players plant trees), which is the correct forgetting policy here: **negative knowledge must decay faster than positive knowledge**, because absence is more likely to be falsified by events than presence.

This directly targets the 11,512 `please explore first` failures — 79% of all evaluations.

**T4c — blocker / negative procedural.** The existing `BlockerMemory`, fixed against the four causes in §3.4: record on *all* exit paths (including the 2,834 abandon-on-duplicate-error cases that currently record nothing); key on a **normalised task family** (digits and coordinates stripped) rather than `(free-text description, re-derived class)` so counts stop splitting across rows and rewordings; **decay** the count over time instead of `clearTask()` zeroing it on a single success; and add a cap and TTL so stale absences expire when the world changes. The suppression mechanism already exists and is correct — `isOnCooldown(task, cooldownMs)` (`:62-65`) — it simply never fires because the count never reaches 2.

#### T5 — Narrative / social (COSTS calls — budget it explicitly)

The only tier where an LLM writes memory, and the only place a summarisation ladder is appropriate (R1/R2: the atoms are already lossy prose). Generalise the `ChronicleGenerator` contract (§3.6) to every consolidation pass in the system:

> **Consolidation contract.** Idempotent on a natural key · hard USD budget checked *before* the call and persisted across restarts · capped input events · capped output tokens · a zero-LLM fallback that produces a valid artefact when over budget or on failure · triggered by a code-computed threshold, never per-event · **raw episodes retained as first-class evidence so the consolidated artefact is never the only copy** (R2, and the explicit recommendation of arXiv 2605.12978).

Every clause maps to a finding in §2.4: the budget and the input/output caps bound the cost; the threshold trigger is SelfCompact's "timing dominates quality"; the retained raw layer is what makes the consolidation non-destructive and re-expandable; and the whole thing is only worth doing because a chronicle entry is read many times relative to the one call that wrote it (R3's amortisation test).

Cost bound: 1 town × 1 Minecraft day ≈ 1 call/20 min ≈ **~72 calls/day worst case**, `$0.50/town/day` ceiling. That is 0.2% of current volume — acceptable, and it is the *product*, not an optimisation.

### 4.4 Which tiers remove calls, and which add them

This is the table the design exists to produce. Per-day figures against the measured ~32,900 calls/day baseline.

| Tier | LLM calls to **write** | LLM calls to **read** | Net effect | Mechanism |
|---|---|---|---|---|
| **T0** given knowledge | 0 | 0 | **−2,400/day** | Answers recipe/tool/drop questions the curriculum Q&A path currently asks a model (~4,000/day untagged `chat` calls) |
| **T1** working set / accordion | 0 | 0 | **−1,200/day** + large token win | R0 skips the call entirely on high-confidence families; R4 stops the retry tail |
| **T2** episodic log | 0 | 0 (code-only) | **0** | Pure substrate. Costs disk I/O, not calls. Its value is that T3/T4 are derivable from it. |
| **T3** procedural | 0 (written on critic pass, which already happened) | 1 embed (cached) | **−2,000/day** | Higher-precision retrieval → fewer failed reuses → fewer codegen retries |
| **T4a** positive spatial | 0 | 0 | **−400/day** | Fewer redundant exploration tasks |
| **T4b** negative spatial | 0 | 0 | **−9,000/day** | Retires the `please explore first` cycle before a task is proposed |
| **T4c** blocker | 0 | 0 | **−7,500/day** | Retires doomed task families (F1 in the call-volume audit) |
| **T5** narrative | **~72/day** | 0 | **+72/day** | The product. Budgeted and capped. |
| *(supporting)* persistent embedding store | 0 | 0 | **−2,400/day** | 256-dim vectors are deterministic per model; the current LRU is 256-entry, in-RAM, lost on restart |

**Everything that removes calls is deterministic code. The only tier that adds calls is the one whose output is the deliverable.** That is not a coincidence — it is R3 applied consistently, and it is the property that makes this design safe to ship on a 2-vCPU box.

### 4.5 The failure mode: when a memory system *increases* cost

Stated plainly, because it is easy to build every one of these by accident — and **four of the seven already exist in this repo today** (F-B, F-C, F-D, F-G).

**F-A — Consolidation that costs more than it saves.** The naive Generative-Agents port is "reflect after every N events." At 14,500 evaluations/day and N=10, that is 1,450 extra calls/day (+4.4%) — and each reflection must then remove >1 downstream call to break even. At N=1 ("summarise each task outcome") it is **+14,500 calls/day, a 44% increase**, for memory that pure-code aggregation produces for free.

Note that Generative Agents' own trigger — importance-sum ≥ 150, yielding **2–3 reflections per agent per day** — is far more conservative than most ports of it, and would be ~15 calls/day across this fleet. The cost is not the problem; *ungated* consolidation is. And the accuracy risk is worse than the cost risk: arXiv 2605.12978 found continuous LLM-driven memory updating pushed performance **below the no-memory baseline**, with a model failing **54% of problems it had previously solved**, even when consolidating from ground-truth solutions — blame attributed to the consolidation mechanism itself rather than the source material. *Guard:* R1 (aggregate, don't generate), R3 (amortise over expected reads), plus the §4.3-T5 consolidation contract. Consolidation is permitted only where the input is genuinely unstructured.

**F-B — The cache that costs an embed to save an embed.** Live in this repo: `CurriculumAgent`'s Q&A cache spends one embed on lookup (`:605`) and another on store (`:625`) — the same text embedded twice — to protect a 140-token answer. With **15 entries against a 200 cap** after months of operation, it has almost certainly cost more calls than it has saved. *Guard:* reuse the lookup vector for the store; count the cache's own calls in its ROI. A cache must be instrumented for net effect, not hit rate.

**F-C — Keys that embed volatile state.** Also live: one stored Q&A key is literally `Which remembered location from resource:coal_ore@25,53,-304 | resource:iron_ore@18,66,-305 | ... is most actionable right now?`. A key containing coordinates can never be hit twice, so the cache is pure overhead. *Guard:* normalise coordinates, health, timestamps and exact counts out of every key (R7's sibling rule).

**F-D — Unbounded growth, and forgetting policies that were written but never scheduled.** §3.6: `shared_world.json` carries **11,108 threat records, 100% of them expired, 1.87 MB — 61% of the file** — because `pruneExpired()` has no callers. `SkillAttribution.prune()` is likewise dead and its store is unbounded. Beyond the rewrite cost, an unbounded store dilutes retrieval precision (R6). *Guard:* one retention scheduler that owns every store's TTL, plus a startup assertion that every store with a declared cap has a live caller for its prune function. A policy that is not on a timer does not exist.

**F-E — Eviction on a corrupted signal.** §3.3: evicting by raw `failureCount` in a world where 79% of failures are environmental deletes the fleet's best skills — and because the credit path never rewards a reused skill (§3.3 lesson 2), the entries doing the real work are the ones with the worst apparent record. *Guard:* classify failures in T2 before any store consumes the count, and fix the credit path first.

**F-F — Re-summarisation drift.** Not yet present here and must not be introduced: each generation of "summarise the summary" compounds loss (arXiv 2502.20258), and for coordinate/count data the first generation is already fatal. Governance Decay measured the single-boundary version of this at **0% → 30% constraint violation, peaking at 59%**, entirely conditional on whether the summariser happened to preserve the specific text. Nobody has published a multi-generation curve for agent memory (arXiv 2607.08032 says so explicitly), which is a reason for caution, not licence. *Guard:* R2 — the ladder is an aggregation ladder, every level recomputable from raw T2, never a summary of a summary.

**F-G — Memory whose write cost exceeds its read value.** Also live. `shared_world.json` is 3.0 MB behind a 2-second leading-edge debounce, and `skills/index.json` is 2.7 MB rewritten in full **on every `recordOutcome()`** — ~14,500 times a day — each write also triggering `rebuildIndexStats()` and a full `vectorCache.clear()`. On a 2-vCPU box at load 5.45 that is the memory layer's dominant cost, and 61% of the bytes being rewritten are expired garbage (F-D). *Guard:* SQLite or append-only for high-churn tiers; batch outcome writes; measure write amplification alongside call volume.

---

## 5. Phased implementation order

Each phase is independently shippable, independently measurable, and ordered by **call-reduction per unit of risk**. Reductions are sequential (each computed on the survivors of the previous phase) against the measured **~32,900 calls/day** baseline.

| Phase | Work | Tier | Risk | Calls removed/day | Running total |
|---|---|---|---|---|---|
| **P0** | **Instrumentation + retention scheduler.** Classify failures (`failureClass`) in code; add `botName` + `taskType` to the untagged call sites; stand up T2 as an append-only SQLite log; wire the dead `pruneExpired()` / `prune()` to a timer and add a startup assertion that every capped store has a live pruner. No behaviour change; reclaims 1.87 MB and most of the 3 MB rewrite cost. | T2 | none | 0 | 32,900 |
| **P1** | **Negative memory.** T4c blocker fixes (record on all exit paths, normalised family key, decay not clear, cap + TTL) + T4b negative-spatial records + a **curriculum gate** that reads both before proposing. | T4b/T4c | low | **~16,500** | ~16,400 |
| **P2** | **Procedural hygiene.** Fix the credit path (`recordOutcome` on reuse-success, save only on fresh generation); single-writer index; dedupe-on-write admission control; parameterise `explore_*`/`mine_N_*`; eviction on `codeFailureCount` with a 5-trial probation; repair the dangling rows and 449 orphans; validate embedding dimension. | T3 | low | **~2,000** | ~14,400 |
| **P3** | **Fact store + accordion.** T0 `FactStore` (fixing `DependencyResolver`'s `recipes[0]` variant bug first); expose it in the VM; add accordion registers R0 (skip the call) and R4 (stop). | T0/T1 | medium | **~3,600** | ~10,800 |
| **P4** | **Spatial rollups.** T4a region aggregation + confidence decay; feed the curriculum gate so exploration targets unexplored regions. | T4a | low | **~900** | ~9,900 |
| **P5** | **Persistent embedding memory.** Disk-backed, keyed `sha256(text)|modelId`, cap ~20k (≈20 MB at 256-dim). | supporting | none | **~2,400** | ~7,500 |
| **P6** | **Narrative consolidation.** Generalise the `ChronicleGenerator` contract; enable town chronicles/journals under budget. | T5 | low | **+150** | ~7,650 |

**Net: ~32,900 → ~7,650 calls/day, a ~77% reduction**, of which ~50 points come from P1 alone and P1 requires no LLM calls and no model changes.

**Confidence.** P1's estimate is the best-grounded number here: it is anchored on 11,512 measured `please explore first` failures and 2,834 measured silent abandons, both of which are precondition failures that a code-only gate removes deterministically. P2 and P5 are well-grounded (measured duplication factors, deterministic embeddings). **P3's accordion R0 estimate is the softest** — it assumes high-confidence families can be executed without an LLM verification round, which should be shadow-tested before enforcement. P6 is a cost, not a saving, and is listed to keep the arithmetic honest.

**Caveat inherited from `call-volume-audit.md` and still true:** these phases stop the fleet *burning calls on tasks it cannot complete*. They do not make the bots succeed. The reason `Mine 1 oak log` fails is that there is no oak near the current spawn on the fresh `10.80.13.14` world. Negative memory is the guard that stops cost scaling with world quality; fixing spawn placement is the independent fix that raises the pass rate.

---

## 6. What NOT to build

- **A semantic cache in front of `codegen`.** Text similarity is the wrong correctness signal for executable code; T3's execution-outcome validation is the right one. (See `skill-reuse-and-techniques.md` B2 on agentic plan-cache hit rates.)
- **An LLM-written reflection loop over task outcomes.** F-A: pure-code aggregation over T2 produces the same facts at zero call cost with exact coordinates preserved, and arXiv 2605.12978 shows the LLM-written version can drive performance *below* the no-memory baseline.
- **A memory framework (Mem0 / Zep / Letta / MemoryOS).** These are built for **user-centric** memory — personas, preferences, dialogue history. This fleet's memory is **agent-centric and structured** (§4.1 R1), which is the axis arXiv 2602.06052 added in 2026 precisely because the two need different designs. MemDelta additionally shows their published deltas are within the noise induced by swapping the embedding model, and that Mem0 ties plain cloud RAG on 2 of 6 question types **at 50× the cost**.
- **A vector database service.** 518 vectors × 256 dims is ~0.5 MB; even at 5,000 it is ~5 MB. It fits in RAM and a flat scan is microseconds. On a 2-vCPU box at load 5.45 with 4 GB free and the bot process already at 1.98 GB RSS, adding a service is a straight loss.
- **A knowledge graph / temporal-graph store.** The relational structure here is shallow (item → recipe → ingredient, already in T0; position → region, already a key). Zep's bi-temporal *invalidation* idea is worth borrowing for T4b (§4.3); its graph substrate is not.
- **Re-summarising any tier that holds coordinates, counts or item ids.** R2, F-F.
- **Chasing embedding or reranker upgrades before P1–P2 land.** MemDelta says the embedding model is worth ±6.2pp and Anthropic's contextual-retrieval numbers are real — but retrieval is not this fleet's bottleneck (§3.2). The bottleneck is that 79% of tasks should never have been proposed.

---

## Appendix — file:line index for this document

⚠️ **Currency warning.** These line numbers were verified at 19:52 on 2026-07-24 against a **live, concurrently-edited working tree** — `src/voyager/SkillLibrary.ts` changed once during the writing of this document (`recordOutcome` shifted `:369` → `:372`). Treat line numbers as hints and the named symbols as authoritative. All counts in the "live measurements" block below are point-in-time from a running fleet and will have moved.

**Skill library (T3)**
`src/voyager/SkillLibrary.ts:157-242` hybrid scoring · `:174-182` keyword pre-filter (`KEYWORD_PREFILTER_MIN_HITS 5`) · `:213` exact-description bonus · `:215` TF-IDF ×20 · `:217` dense cosine ×25 · `:219` quality ×10 · `:232-233` saturating popularity/reliability · `:280` `save()` returning `finalName` · `:281-289` evict-instead-of-reject · `:341-367` `evictWorst()` · `:372` `recordOutcome` (full 2.7 MB rewrite per call) · `:388-397` `getQuality` decay · `:625` `cosineSimilarityDense` length-mismatch → 0 · `:86-90` `STOPWORDS` · retrieval gates `:428` (≥6), `:444` (≥16), `:457` (≥8 + `isHighQuality`) · constants `:24-78` (`QUALITY_DECAY_RATE 0.999`/7 d, `QUERY_EMBED_CACHE_MAX 512`, `CODE_CACHE_MAX 256`, `VECTOR_CACHE_MAX 1024`, `KEYWORD_MIN_LEN 3`, `POPULARITY_WEIGHT 6`, `RELIABILITY_PENALTY 8`, `POPULARITY_HALF_LIFE 5`) · `config.yml:92` `maxSkills: 500`
**Credit path (the live ratchet):** `src/voyager/VoyagerLoop.ts:1762-1769` save+credit on pass · `:1801` debit on reuse-failure · `:1588-1601` reuse decision, `STRONG_DIRECT_SKILL_SCORE = 24` · `:1674` `getAllSkillCode()` VM injection

**Dead forgetting policies (§3.6)**
`src/voyager/SharedWorldModel.ts:155-166` uncapped `reportThreat` · `:276-303` `pruneExpired()` — **zero callers** · `:62` `DEFAULT_THREAT_TTL_MS` 5 min applied read-side only · `src/voyager/SkillAttribution.ts:252-274` `prune()` — **zero callers**
**Correct patterns to copy:** `src/social/BotReputation.ts:50-57`, `:74-79`, `:207-218` (24 h half-life, 14-day delete, hourly timer) · `src/voyager/BlackboardManager.ts:338`, `:372`, `:414`, `:428`, `:575` (five GC passes, all wired)

**Observation cost (§3.1c)**
`src/voyager/Observation.ts:180-205` 567 `blockAt` calls/render · `:207-232` nearby entities · `:119-158` warm-up graduated inclusion · `src/voyager/TerrainSummary.ts:102-103` 1,377 `blockAt` calls per build prompt

**Embeddings**
`src/ai/GeminiClient.ts:118-147` `gemini-embedding-001`, `outputDimensionality: 256` · `src/ai/ModelRouter.ts:244` `embed()` · `:33` `EMBED_CACHE_MAX = 256` (in-RAM, per-process, lost on restart) · `:545-553` LRU eviction · fallbacks `OpenAIClient.ts:101-120` (1536-dim) and `VoyageAIClient.ts:36-60` — dimension mismatch is silent

**Accordion / working set (T1)**
`src/voyager/ActionAgent.ts:271` `formatCompactObservation(..., firstAttempt)` · `:288-290` chatlog-enriched retrieval query · `:295-308` triple retrieval · `:314` `MAX_PARSE_RETRIES` loop · `:315` + `:376-395` `buildIterativeContext` · `:384` unconditional chat log · `:23` `ACTION_SYSTEM_PROMPT` (~14 KB) · `:117` mcData prohibition

**Negative memory (T4b/T4c)**
`src/voyager/BlockerMemory.ts:30` `(free-text task, class)` composite key, no bot dimension, no cap, no TTL · `:41-44` `clearTask()` deletes all records on one success · `:50-52` `hasStrongBlocker` `count >= 2` · `:62-65` `isOnCooldown` (correct, never fires) · `:67-89` `summarize()` top-10 · `:91-109` `classifyBlocker` substring match · `:120-122` synchronous write per failure · `src/voyager/VoyagerLoop.ts:1846` silent abandon path · `:1907` `recordTaskFailure` · `src/voyager/CurriculumAgent.ts:334` `failedTasks.slice(-5)`
**Positive spatial (T4a):** `src/voyager/WorldMemory.ts:19` 30-min confidence horizon · `:22` `PRUNE_THRESHOLD 0.1` · `:37` `MAX_RECORDS 2000` · `:145-153` `summary()` top-10 · `:175` lazy `pruneStale`

**Consolidation contract (T5)**
`src/town/ChronicleGenerator.ts:26` `DEFAULT_BUDGET_USD = 0.5` · `:29` `MAX_RESPONSE_TOKENS = 800` · `:32` `MAX_EVENTS_IN_PROMPT = 60` · `:35` `MAX_RESIDENTS_IN_PROMPT = 8` · `:160` idempotency check · `:169` pre-call budget gate · `:200`/`:217` `quietDayPlaceholder` zero-LLM fallback

**Consolidation, the complete inventory**
LLM-written memory exists in exactly two places: `src/town/ChronicleGenerator.ts` (daily narrative, budgeted) and `src/social/CultureManager.ts:287-302` (*"Distill the memes"*, no callers). Everything else labelled "summarize" is hard truncation. **No reflection, consolidation or experience-replay pass exists.**

**Live measurements (2026-07-24, ~17.8 h log window)**
skill index 518 rows / 500 active / 18 deprecated · 179 families · **272 zero-success** · 449 orphan `.js` of 934 · **26 dangling index rows** · 518 embeddings @ 256-dim (1.6 MB, 60% of `index.json`) · 10,828 successes / 6,750 failures · 364 saves / 33 evictions · `Voyager task evaluated` 14,489 · **`please explore first` 11,512 (79%)** · abandon-on-duplicate 2,834 · `Reusing saved skill` 8,688 · `data/blockers.json` 29 records (`count`: 25×1, 3×2, 1×6) · `data/world_memory.json` 38 records · `data/shared_world.json` 3.0 MB of which **11,108 fully-expired threats = 1.87 MB (61%)** · `data/town.db` every table 0 rows · `data/affinities.json` and `conversations.json` absent from disk
