import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../util/logger';
import { atomicWriteJsonSync } from '../util/atomicWrite';
import type { TaskType, TokenUsageRecord, UsageMetrics } from './TaskType';

/**
 * Daily spend totals, kept SEPARATELY from the record ring buffer.
 *
 * `getSpendTodayUsd()` used to sum `this.records`, but that array is capped at
 * MAX_RECORDS and at this fleet's volume the buffer covers only ~7 hours. Spend
 * older than the buffer silently vanished, so the daily total under-reported and
 * the budget cap let through more than it should — the cap got LOOSER the busier
 * the fleet got, which is exactly backwards.
 */
/** Days of per-day spend history to retain. */
const DAILY_RETENTION_DAYS = 30;
const DEBOUNCE_MS = 5000;
const MAX_RECORDS = 10000;

/** Cost per 1M tokens (USD). Update as pricing changes. */
const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  // Gemini (3.5 Flash launched May 2026 at $1.50/$9.00 — Pro-level coding at
  // Flash cost; do NOT reuse the old 2.5-flash $0.15/$0.60 rate for it).
  'gemini-3.5-flash': { input: 1.50, output: 9.00 },
  'gemini-3.5-pro': { input: 2.50, output: 15.0 },
  'gemini-3.1-pro': { input: 2.0, output: 12.0 },
  'gemini-3-flash-preview': { input: 1.50, output: 9.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.5-flash-preview-05-20': { input: 0.15, output: 0.60 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-2.5-pro-preview-05-06': { input: 1.25, output: 10.0 },
  'gemini-embedding-001': { input: 0.0, output: 0.0 },
  // Anthropic — legacy Claude 4
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'claude-haiku-3-20240307': { input: 0.25, output: 1.25 },
  // Anthropic — current models (rate card as of 2026-07). Opus 4.7/4.8 are
  // $5/$25 — NOT the old $15/$75 Opus-4 pricing. Sonnet 5 uses standard
  // $3/$15 (not the intro $2/$10) so the budget cap errs on the safe side
  // and trips slightly early rather than overshooting.
  'claude-sonnet-5': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-opus-5': { input: 5.0, output: 25.0 },
  'claude-opus-4-8': { input: 5.0, output: 25.0 },
  'claude-opus-4-7': { input: 5.0, output: 25.0 },
  'claude-opus-4-6': { input: 5.0, output: 25.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
  // Fable/Mythos 5 are the top tier at 2x Opus 5 — $10/$50, not $5/$25.
  // Mythos is Project Glasswing-only; priced here so a manual override is
  // still costed correctly rather than falling through to $0.
  'claude-fable-5': { input: 10.0, output: 50.0 },
  'claude-mythos-5': { input: 10.0, output: 50.0 },
  // OpenAI — GPT-5.6 family (released 2026-07-09; `gpt-5.6` aliases to Sol).
  // All four use breakpoint pricing at 272K input tokens; the rates below are
  // the BELOW-breakpoint tier, which is what this fleet's ~16K-max requests
  // actually hit. Above 272K the real rate is roughly double (Sol $10/$45),
  // so a run that somehow blew past the breakpoint would under-report.
  'gpt-5.6-sol': { input: 5.0, output: 30.0 },
  'gpt-5.6': { input: 5.0, output: 30.0 },
  'gpt-5.6-terra': { input: 2.50, output: 15.0 },
  'gpt-5.6-luna': { input: 1.0, output: 6.0 },
  // gpt-5.5 is the current OpenAI default in LLMSettings and had no entry at
  // all, so every OpenAI call was costed at $0 and never counted against the
  // daily cap.
  'gpt-5.5': { input: 5.0, output: 30.0 },
  // MiniMax — approximate; refresh if MiniMax publishes an exact rate card.
  'MiniMax-M3': { input: 0.30, output: 1.20 },
  'MiniMax-M2.5': { input: 0.30, output: 1.20 },
};

export class TokenLedger {
  /**
   * Paths are resolved per instance, not at module load. Module-level
   * `path.join(process.cwd(), ...)` constants bind to whatever the cwd was at
   * import time, which makes the ledger untestable in isolation and means a
   * test run writes into the REAL spend file and inflates the budget cap.
   */
  private readonly dataPath: string;
  private readonly dailyPath: string;
  private records: TokenUsageRecord[] = [];
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** date (YYYY-MM-DD) -> `${provider}|${taskType}` -> USD. Survives record rotation. */
  private dailySpend: Record<string, Record<string, number>> = {};

  constructor(dataDir?: string) {
    // Refuse to bind the PRODUCTION data dir from inside a test run. The class
    // comment above has warned about this since the paths were made per
    // instance, but a warning is not a guard: two test files kept calling
    // `new TokenLedger()` with no dataDir, so every `npm test` recorded its
    // fixture costs into the real data/token-spend-daily.json. That inflated
    // the daily bucket by ~$11.75 per run and, because the budget cap gates
    // paid codegen on that number, a few test runs alone could switch the
    // fleet off. Observed 2026-07-24: the bucket read $82.25 against $10.19 of
    // genuine spend, purely from repeated test runs.
    if (!dataDir && (process.env.VITEST || process.env.NODE_ENV === 'test')) {
      throw new Error(
        'TokenLedger: refusing to use the production data dir under test. ' +
          'Pass an explicit dataDir (e.g. fs.mkdtempSync(...)) — an unqualified ' +
          'new TokenLedger() in a test writes real spend into data/token-spend-daily.json ' +
          'and can trip the budget cap.',
      );
    }
    const dir = dataDir ?? path.join(process.cwd(), 'data');
    this.dataPath = path.join(dir, 'token-ledger.json');
    this.dailyPath = path.join(dir, 'token-spend-daily.json');
    this.load();
    this.loadDaily();
  }

  /** Local calendar day key. Local, not UTC, so the cap resets at local midnight. */
  private static dayKey(ts: number): string {
    const d = new Date(ts);
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  record(entry: {
    provider: string;
    model: string;
    taskType: TaskType | 'unknown';
    botName: string;
    inputTokens: number;
    outputTokens: number;
    cacheCreationInputTokens?: number;
    cacheReadInputTokens?: number;
    latencyMs: number;
    success: boolean;
  }): void {
    const cost = this.estimateCost(
      entry.model,
      entry.inputTokens,
      entry.outputTokens,
      entry.cacheCreationInputTokens,
      entry.cacheReadInputTokens,
    );
    const record: TokenUsageRecord = {
      timestamp: Date.now(),
      ...entry,
      estimatedCostUsd: cost,
    };
    this.records.push(record);
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(-MAX_RECORDS);
    }

    // Accumulate into the day bucket BEFORE any rotation can drop the record.
    if (cost > 0) {
      const day = TokenLedger.dayKey(record.timestamp);
      const key = `${entry.provider}|${entry.taskType}`;
      const bucket = (this.dailySpend[day] ??= {});
      bucket[key] = (bucket[key] ?? 0) + cost;
      this.pruneDaily();
      this.saveDaily();
    }

    this.scheduleSave();
  }

  /**
   * Query raw records, optionally filtered by bot name. Returns oldest-first so
   * waterfall timelines can render left-to-right.
   */
  getRecords(opts: { botName?: string; limit?: number } = {}): TokenUsageRecord[] {
    let filtered = this.records;
    if (opts.botName) {
      filtered = filtered.filter((r) => r.botName === opts.botName);
    }
    const limit = opts.limit ?? 50;
    return filtered.slice(-limit);
  }

  getMetrics(): UsageMetrics {
    let totalCalls = 0;
    let totalInput = 0;
    let totalOutput = 0;
    let totalCost = 0;
    let totalLatency = 0;
    let successCount = 0;
    const byProvider: Record<string, { calls: number; tokens: number; cost: number }> = {};
    const byTaskType: Record<string, { calls: number; tokens: number; cost: number }> = {};
    const byBot: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const r of this.records) {
      totalCalls++;
      totalInput += r.inputTokens;
      totalOutput += r.outputTokens;
      totalCost += r.estimatedCostUsd;
      totalLatency += r.latencyMs;
      if (r.success) successCount++;

      const tokens = r.inputTokens + r.outputTokens;

      if (!byProvider[r.provider]) byProvider[r.provider] = { calls: 0, tokens: 0, cost: 0 };
      byProvider[r.provider].calls++;
      byProvider[r.provider].tokens += tokens;
      byProvider[r.provider].cost += r.estimatedCostUsd;

      if (!byTaskType[r.taskType]) byTaskType[r.taskType] = { calls: 0, tokens: 0, cost: 0 };
      byTaskType[r.taskType].calls++;
      byTaskType[r.taskType].tokens += tokens;
      byTaskType[r.taskType].cost += r.estimatedCostUsd;

      if (r.botName) {
        if (!byBot[r.botName]) byBot[r.botName] = { calls: 0, tokens: 0, cost: 0 };
        byBot[r.botName].calls++;
        byBot[r.botName].tokens += tokens;
        byBot[r.botName].cost += r.estimatedCostUsd;
      }
    }

    return {
      totalCalls,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalEstimatedCostUsd: Math.round(totalCost * 10000) / 10000,
      avgLatencyMs: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
      successRate: totalCalls > 0 ? Math.round((successCount / totalCalls) * 100) : 0,
      byProvider,
      byTaskType,
      byBot,
    };
  }

  /**
   * Sum of estimated USD spend since the start of the local calendar day,
   * optionally scoped to a provider and/or task type. Drives the daily budget
   * cap. Only records written after the pricing fix carry real cost; older
   * $0-era records simply contribute nothing.
   */
  getSpendTodayUsd(opts: { provider?: string; taskType?: string } = {}): number {
    const bucket = this.dailySpend[TokenLedger.dayKey(Date.now())];
    if (!bucket) return 0;
    let sum = 0;
    for (const [key, cost] of Object.entries(bucket)) {
      const [provider, taskType] = key.split('|');
      if (opts.provider && provider !== opts.provider) continue;
      if (opts.taskType && taskType !== opts.taskType) continue;
      sum += cost;
    }
    return sum;
  }

  private pruneDaily(): void {
    const days = Object.keys(this.dailySpend).sort();
    while (days.length > DAILY_RETENTION_DAYS) {
      const oldest = days.shift();
      if (oldest) delete this.dailySpend[oldest];
    }
  }

  private loadDaily(): void {
    try {
      if (fs.existsSync(this.dailyPath)) {
        const data = JSON.parse(fs.readFileSync(this.dailyPath, 'utf-8'));
        if (data && typeof data === 'object' && !Array.isArray(data)) this.dailySpend = data;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to load daily spend totals, starting fresh');
    }
  }

  private saveDaily(): void {
    try {
      atomicWriteJsonSync(this.dailyPath, this.dailySpend);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to persist daily spend totals');
    }
  }

  /**
   * Cost for one call, including prompt-cache tokens.
   *
   * Anthropic bills cache WRITES at 1.25x the input rate and cache READS at
   * 0.1x, and reports both separately from `input_tokens` (which counts only
   * the uncached remainder). Ignoring them under-reported spend on every
   * cached call — for this fleet's 14KB codegen prefix that is the majority
   * of the real input bill.
   */
  private estimateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    cacheCreationInputTokens = 0,
    cacheReadInputTokens = 0,
  ): number {
    const rates = COST_PER_MILLION[model];
    if (!rates) return 0;
    const uncached = inputTokens * rates.input;
    const cacheWrite = cacheCreationInputTokens * rates.input * 1.25;
    const cacheRead = cacheReadInputTokens * rates.input * 0.1;
    return (uncached + cacheWrite + cacheRead + outputTokens * rates.output) / 1_000_000;
  }

  private scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveImmediate();
    }, DEBOUNCE_MS);
  }

  private saveImmediate(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Unique temp name — a fixed `.tmp` is not atomic under concurrent
      // writers (see util/atomicWrite.ts).
      atomicWriteJsonSync(this.dataPath, this.records.slice(-MAX_RECORDS));
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to save token ledger');
    }
  }

  private load(): void {
    try {
      if (fs.existsSync(this.dataPath)) {
        const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf-8'));
        if (Array.isArray(data)) {
          this.records = data.slice(-MAX_RECORDS);
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to load token ledger, starting fresh');
    }
  }

  shutdown(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    this.saveImmediate();
  }
}
