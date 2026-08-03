import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TokenLedger } from '../../src/ai/TokenLedger';

/**
 * `getSpendTodayUsd()` used to sum the record array, which is a fixed 10,000
 * entry ring buffer covering only ~7 hours at this fleet's volume. Spend older
 * than the buffer vanished, so the daily total under-reported and the budget
 * cap got LOOSER the busier the fleet got. Totals are now accumulated
 * separately and survive rotation.
 */
let dir: string;
beforeEach(() => {
  // Isolated data dir per test. TokenLedger resolves its paths at
  // construction precisely so a test can never write the real spend file —
  // doing so would inflate the live budget cap.
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

const call = (n: number) => ({
  provider: 'anthropic', model: 'claude-opus-4-8', taskType: 'codegen' as const,
  botName: 'T', inputTokens: n, outputTokens: 0, latencyMs: 1, success: true,
});

describe('daily spend survives ring-buffer rotation', () => {
  it('keeps counting after more than MAX_RECORDS calls', () => {
    const ledger = new TokenLedger(dir);
    // 1M input tokens at $5/M = $5.00 total, spread over 12,000 calls so the
    // 10,000-record buffer rotates ~2,000 of them away.
    for (let i = 0; i < 12_000; i++) ledger.record(call(1_000_000 / 12_000));

    const spend = ledger.getSpendTodayUsd({ provider: 'anthropic' });
    // Under the old implementation ~2,000 calls' worth would have been lost.
    expect(spend).toBeCloseTo(5.0, 2);
  });

  it('filters by provider and task type', () => {
    const ledger = new TokenLedger(dir);
    ledger.record(call(1_000_000));
    ledger.record({ ...call(1_000_000), provider: 'gemini', model: 'gemini-2.5-flash' });

    expect(ledger.getSpendTodayUsd({ provider: 'anthropic' })).toBeCloseTo(5.0, 4);
    expect(ledger.getSpendTodayUsd({ provider: 'anthropic', taskType: 'critic' })).toBe(0);
    expect(ledger.getSpendTodayUsd()).toBeGreaterThan(5.0);
  });

  it('persists totals across a restart', () => {
    new TokenLedger(dir).record(call(1_000_000));
    // A fresh instance (process restart) must not lose today's spend.
    expect(new TokenLedger(dir).getSpendTodayUsd({ provider: 'anthropic' })).toBeCloseTo(5.0, 4);
  });
});
