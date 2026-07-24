import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicClient } from '../../src/ai/AnthropicClient';
import { TokenLedger } from '../../src/ai/TokenLedger';

function mockFetchOnce(payload: unknown) {
  const spy = vi.fn().mockResolvedValue({ ok: true, json: async () => payload, text: async () => '' });
  vi.stubGlobal('fetch', spy);
  return spy;
}
const OK = { content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 10, output_tokens: 5 } };
afterEach(() => vi.unstubAllGlobals());

/**
 * Anthropic's minimum cacheable prefix is per-model and NOT monotonic across
 * generations. Below the minimum the server silently ignores cache_control —
 * no error, just a wasted breakpoint. A single global threshold is wrong in
 * both directions.
 */
describe('model-aware prompt cache threshold', () => {
  const base = { apiKey: 'sk-ant-api03-X', temperature: 0.7, maxTokens: 64 };

  async function cacheControlUsed(model: string, promptChars: number): Promise<boolean> {
    const spy = mockFetchOnce(OK);
    await new AnthropicClient({ ...base, model }).generate('x'.repeat(promptChars), 'hi');
    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    return Array.isArray(body.system) && !!body.system[0]?.cache_control;
  }

  it('caches a ~977-token prompt on Opus 5 (512-token minimum)', async () => {
    expect(await cacheControlUsed('claude-opus-5', 3907)).toBe(true);
  });

  it('does NOT cache that same prompt on Haiku 4.5 (4096-token minimum)', async () => {
    // This is exactly the CRITIC_SYSTEM_PROMPT case: marking it would burn a
    // breakpoint and cache nothing.
    expect(await cacheControlUsed('claude-haiku-4-5', 3907)).toBe(false);
  });

  it('caches the 13,968-char codegen prompt on Opus 4.8 (1024-token minimum)', async () => {
    expect(await cacheControlUsed('claude-opus-4-8', 13968)).toBe(true);
  });

  it('honours the OVERRIDE model when deciding the threshold', async () => {
    const spy = mockFetchOnce(OK);
    // Client built as Opus 5 (512 min) but routed to Haiku 4.5 (4096 min).
    await new AnthropicClient({ ...base, model: 'claude-opus-5' })
      .generate('x'.repeat(3907), 'hi', 64, { taskType: 'critic', model: 'claude-haiku-4-5' });
    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.model).toBe('claude-haiku-4-5');
    expect(Array.isArray(body.system)).toBe(false);
  });
});

describe('prompt-cache cost accounting', () => {
  it('prices cache writes at 1.25x and reads at 0.1x of the input rate', () => {
    const ledger = new TokenLedger();
    const common = {
      provider: 'anthropic', model: 'claude-opus-4-8', taskType: 'codegen' as const,
      botName: 'T', latencyMs: 1, success: true, outputTokens: 0,
    };
    const before = ledger.getSpendTodayUsd({ provider: 'anthropic' });

    // 1M cache-read tokens at $5/M input => 1M * 5 * 0.1 / 1M = $0.50
    ledger.record({ ...common, inputTokens: 0, cacheReadInputTokens: 1_000_000 });
    const afterRead = ledger.getSpendTodayUsd({ provider: 'anthropic' });
    expect(afterRead - before).toBeCloseTo(0.5, 6);

    // 1M cache-write tokens => 1M * 5 * 1.25 / 1M = $6.25
    ledger.record({ ...common, inputTokens: 0, cacheCreationInputTokens: 1_000_000 });
    expect(ledger.getSpendTodayUsd({ provider: 'anthropic' }) - afterRead).toBeCloseTo(6.25, 6);
  });

  it('still counts uncached input at the full rate', () => {
    const ledger = new TokenLedger();
    const before = ledger.getSpendTodayUsd({ provider: 'anthropic' });
    ledger.record({
      provider: 'anthropic', model: 'claude-opus-4-8', taskType: 'codegen',
      botName: 'T', inputTokens: 1_000_000, outputTokens: 0, latencyMs: 1, success: true,
    });
    expect(ledger.getSpendTodayUsd({ provider: 'anthropic' }) - before).toBeCloseTo(5.0, 6);
  });
});
