import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ModelRouter, BudgetCappedError } from '../../src/ai/ModelRouter';
import { TokenLedger } from '../../src/ai/TokenLedger';
import type { LLMClient } from '../../src/ai/LLMClient';

/**
 * embed() must pass the same per-provider budget gate as dispatch(). It used
 * to skip the gate entirely and append every registered client to its chain,
 * so a capped fleet kept paying for skill-library embeds — invisibly, since
 * embed models were priced $0 (2026-08 audit).
 */
describe('embed budget gating', () => {
  const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'embed-gate-'));

  function makeClient(): LLMClient & { embed: ReturnType<typeof vi.fn> } {
    return {
      chat: vi.fn(async () => ({ text: 'x' })),
      generate: vi.fn(async () => ({ text: 'x' })),
      embed: vi.fn(async (texts: string[]) => texts.map(() => [1, 0])),
      getModelId: () => 'gemini-2.5-flash',
      getEmbedModelId: () => 'gemini-embedding-001',
    } as any;
  }

  it('throws BudgetCappedError without calling any provider when capped', async () => {
    const client = makeClient();
    const router = new ModelRouter(
      new Map([['gemini', client]]),
      { defaultProvider: 'gemini', paidProviderAllowed: () => false },
      new TokenLedger(tmpDir()),
    );
    await expect(router.embed(['hello'])).rejects.toThrow(BudgetCappedError);
    expect(client.embed).not.toHaveBeenCalled();
  });

  it('still serves fully-cached queries when capped', async () => {
    const client = makeClient();
    let allowed = true;
    const router = new ModelRouter(
      new Map([['gemini', client]]),
      { defaultProvider: 'gemini', paidProviderAllowed: () => allowed },
      new TokenLedger(tmpDir()),
    );
    await router.embed(['hello']); // warm the cache while allowed
    allowed = false;
    await expect(router.embed(['hello'])).resolves.toEqual([[1, 0]]);
    expect(client.embed).toHaveBeenCalledTimes(1);
  });

  it('records failed embeds to the ledger', async () => {
    const client = makeClient();
    client.embed.mockRejectedValue(new Error('provider down'));
    const ledger = new TokenLedger(tmpDir());
    const router = new ModelRouter(
      new Map([['gemini', client]]),
      { defaultProvider: 'gemini' },
      ledger,
    );
    await expect(router.embed(['hello'])).rejects.toThrow('provider down');
    const rows = ledger.getRecords({ limit: 10 });
    expect(rows.some((r) => r.taskType === 'embed' && r.success === false)).toBe(true);
  });
});
