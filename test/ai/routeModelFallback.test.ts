import { describe, it, expect, vi } from 'vitest';
import { ModelRouter } from '../../src/ai/ModelRouter';
import type { LLMClient } from '../../src/ai/LLMClient';

/**
 * A route's `model` is provider-specific. If it leaks onto a FALLBACK
 * provider, the request carries e.g. `claude-haiku-4-5` to Gemini, which 404s
 * — and 404 is terminal here, so the fallback silently never fires and the
 * configured safety net is dead. This pins that the override is applied only
 * to the provider the route names.
 */
function fakeClient(name: string, seen: Array<{ provider: string; model?: string }>, fail = false): LLMClient {
  return {
    getModelId: () => `${name}-default`,
    async chat() { throw new Error('unused'); },
    async generate(_s: string, _u: string, _m?: number, options?: any) {
      seen.push({ provider: name, model: options?.model });
      if (fail) throw new Error(`${name} API 500: transient`);
      return { text: 'ok', inputTokens: 1, outputTokens: 1 };
    },
  } as unknown as LLMClient;
}

const ledger = { record: vi.fn() } as any;

describe('route model override vs fallback provider', () => {
  it('applies the route model to the routed provider only', async () => {
    const seen: Array<{ provider: string; model?: string }> = [];
    const clients = new Map<string, LLMClient>([
      ['anthropic', fakeClient('anthropic', seen)],
      ['gemini', fakeClient('gemini', seen)],
    ]);
    const router = new ModelRouter(clients, {
      defaultProvider: 'anthropic',
      routes: { critic: { provider: 'anthropic', model: 'claude-haiku-4-5', fallback: ['gemini'] } },
    } as any, ledger);

    await router.generate('sys', 'hi', 64, { taskType: 'critic' });
    expect(seen).toEqual([{ provider: 'anthropic', model: 'claude-haiku-4-5' }]);
  });

  it('does NOT send the routed model to the fallback provider', async () => {
    const seen: Array<{ provider: string; model?: string }> = [];
    const clients = new Map<string, LLMClient>([
      // Primary always fails with a retryable error so we fall through.
      ['anthropic', fakeClient('anthropic', seen, true)],
      ['gemini', fakeClient('gemini', seen)],
    ]);
    const router = new ModelRouter(clients, {
      defaultProvider: 'anthropic',
      routes: { critic: { provider: 'anthropic', model: 'claude-haiku-4-5', fallback: ['gemini'] } },
    } as any, ledger);

    const res = await router.generate('sys', 'hi', 64, { taskType: 'critic' });
    expect(res.text).toBe('ok');

    const geminiCalls = seen.filter((c) => c.provider === 'gemini');
    expect(geminiCalls.length).toBeGreaterThan(0);
    // The whole point: Gemini must NOT receive an Anthropic model id.
    for (const c of geminiCalls) expect(c.model).toBeUndefined();
  });
});
