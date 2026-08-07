import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TokenLedger } from '../../src/ai/TokenLedger';

/**
 * The raw call-count backstop. The dollar cap is only as good as the pricing
 * table — unknown model ids, failed-call rows, and the SAFETY-block loop all
 * ledgered at $0 and were invisible to it (2026-08). A call count cannot be
 * fooled by a price.
 */
describe('daily call counting', () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'call-cap-'));

  const row = (provider: string, success = false) => ({
    provider,
    model: 'not-a-real-model',
    taskType: 'codegen' as const,
    botName: '',
    inputTokens: 0,
    outputTokens: 0,
    latencyMs: 10,
    success,
  });

  it('counts every recorded call, including $0 failures', () => {
    const ledger = new TokenLedger(tmp());
    ledger.record(row('gemini'));
    ledger.record(row('gemini'));
    ledger.record(row('anthropic', true));
    expect(ledger.getCallsTodayCount()).toBe(3);
    expect(ledger.getCallsTodayCount('gemini')).toBe(2);
    ledger.shutdown();
  });

  it('excludes local ollama calls from the unscoped total', () => {
    const ledger = new TokenLedger(tmp());
    ledger.record(row('ollama'));
    ledger.record(row('gemini'));
    expect(ledger.getCallsTodayCount()).toBe(1);
    expect(ledger.getCallsTodayCount('ollama')).toBe(1);
    ledger.shutdown();
  });

  it('persists counts across ledger instances (restart survival)', () => {
    const dir = tmp();
    const a = new TokenLedger(dir);
    a.record(row('gemini'));
    a.shutdown();
    const b = new TokenLedger(dir);
    expect(b.getCallsTodayCount('gemini')).toBe(1);
    b.shutdown();
  });

  it('bills unknown models at the conservative fallback rate, not $0', () => {
    const ledger = new TokenLedger(tmp());
    ledger.record({
      provider: 'gemini',
      model: 'gemini-99-ultra-new',
      taskType: 'codegen',
      botName: '',
      inputTokens: 1_000_000,
      outputTokens: 0,
      latencyMs: 10,
      success: true,
    });
    // $10/M input fallback — the cap must SEE unpriced traffic.
    expect(ledger.getSpendTodayUsd()).toBeCloseTo(10.0, 3);
    ledger.shutdown();
  });
});
