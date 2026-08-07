import { describe, it, expect, vi } from 'vitest';
import { ModelRouter } from '../../src/ai/ModelRouter';
import type { LLMClient } from '../../src/ai/LLMClient';

/**
 * The degradation ladder's last two rungs.
 *
 * On 2026-08-07 every provider was out of credit at once. The circuit breaker
 * alone did not stop it: a 30s cooldown followed by another doomed attempt is
 * a rate limiter, not an off switch, so five bots churned indefinitely against
 * a chain that could never answer. These pin the hand-off to the global kill
 * switch, and the probe that undoes it once somebody's credit returns.
 */

/** Terminal (non-retryable) failure — what a drained/unauthorized key returns. */
function deadClient(name: string, calls: string[]): LLMClient {
  return {
    getModelId: () => `${name}-default`,
    async chat() { throw new Error('unused'); },
    async generate() {
      calls.push(name);
      const err: any = new Error(`${name} API 401: no credit`);
      err.status = 401;
      throw err;
    },
  } as unknown as LLMClient;
}

function liveClient(name: string, calls: string[]): LLMClient {
  return {
    getModelId: () => `${name}-default`,
    async chat() { throw new Error('unused'); },
    async generate() {
      calls.push(name);
      return { text: 'OK', inputTokens: 1, outputTokens: 1 };
    },
  } as unknown as LLMClient;
}

const ledger = () => ({ record: vi.fn() }) as any;

async function expectThrows(fn: () => Promise<unknown>): Promise<void> {
  await expect(fn()).rejects.toThrow();
}

describe('auto-disable on total provider failure', () => {
  it('signals total failure after 3 consecutive full-chain failures', async () => {
    const calls: string[] = [];
    const onTotalFailure = vi.fn();
    const router = new ModelRouter(
      new Map([['anthropic', deadClient('anthropic', calls)]]),
      { defaultProvider: 'anthropic', onTotalFailure } as any,
      ledger(),
    );

    await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    expect(onTotalFailure).not.toHaveBeenCalled();
    await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    expect(onTotalFailure).not.toHaveBeenCalled();

    await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    expect(onTotalFailure).toHaveBeenCalledTimes(1);
    expect(onTotalFailure).toHaveBeenCalledWith(3);
  });

  it('fires once per outage, not once per failing call', async () => {
    const calls: string[] = [];
    const onTotalFailure = vi.fn();
    const router = new ModelRouter(
      new Map([['anthropic', deadClient('anthropic', calls)]]),
      { defaultProvider: 'anthropic', onTotalFailure } as any,
      ledger(),
    );

    for (let i = 0; i < 8; i++) {
      await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    }

    expect(onTotalFailure).toHaveBeenCalledTimes(1);
  });

  it('a throwing listener does not break the call path', async () => {
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([['anthropic', deadClient('anthropic', calls)]]),
      {
        defaultProvider: 'anthropic',
        onTotalFailure: () => { throw new Error('listener blew up'); },
      } as any,
      ledger(),
    );

    // The third call must still reject with the PROVIDER error, not the
    // listener's — otherwise a bad listener masks the real outage.
    await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    await expect(router.generate('s', 'u', 8, { taskType: 'codegen' })).rejects.toThrow(/no credit/);
  });
});

describe('recovery probe', () => {
  it('bypasses the kill switch — the switch under test would refuse it', async () => {
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([['anthropic', liveClient('anthropic', calls)]]),
      { defaultProvider: 'anthropic', isEnabled: () => false } as any,
      ledger(),
    );

    // A normal call is refused while disabled...
    await expect(router.generate('s', 'u', 8, { taskType: 'codegen' })).rejects.toThrow(/disabled/i);
    // ...but the probe still gets through, which is the whole point.
    await expect(router.probe()).resolves.toBeUndefined();
    expect(calls).toContain('anthropic');
  });

  it('does NOT accept a free local provider as proof the paid chain recovered', async () => {
    // A local Ollama is always up. Treating its success as recovery would
    // re-enable the fleet every 15 min against a still-drained paid chain —
    // a spend sawtooth that arms as soon as OLLAMA_BASE_URL is set.
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([
        ['anthropic', deadClient('anthropic', calls)],
        ['ollama', liveClient('ollama', calls)],
      ]),
      { defaultProvider: 'anthropic' } as any,
      ledger(),
    );

    await expect(router.probe()).rejects.toThrow(/no credit/);
    expect(calls).toEqual(['anthropic']);
    expect(calls).not.toContain('ollama');
  });

  it('recovers when the paid provider answers again', async () => {
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([
        ['anthropic', liveClient('anthropic', calls)],
        ['ollama', liveClient('ollama', calls)],
      ]),
      { defaultProvider: 'anthropic' } as any,
      ledger(),
    );

    await expect(router.probe()).resolves.toBeUndefined();
    expect(calls).toEqual(['anthropic']);
  });

  it('falls back to free providers only when no paid provider is configured', async () => {
    // Ollama-only deployment: there is no paid chain to recover, so its
    // success is the only signal available and does count.
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([['ollama', liveClient('ollama', calls)]]),
      { defaultProvider: 'ollama' } as any,
      ledger(),
    );

    await expect(router.probe()).resolves.toBeUndefined();
    expect(calls).toEqual(['ollama']);
  });

  it('throws while every provider is still refusing', async () => {
    const calls: string[] = [];
    const router = new ModelRouter(
      new Map([['anthropic', deadClient('anthropic', calls)]]),
      { defaultProvider: 'anthropic' } as any,
      ledger(),
    );

    await expect(router.probe()).rejects.toThrow(/no credit/);
  });

  it('a successful probe clears the latch so a later outage re-fires', async () => {
    const calls: string[] = [];
    const onTotalFailure = vi.fn();
    let dead = true;
    const flaky = {
      getModelId: () => 'flaky',
      async chat() { throw new Error('unused'); },
      async generate() {
        calls.push('flaky');
        if (dead) {
          const err: any = new Error('flaky API 401: no credit');
          err.status = 401;
          throw err;
        }
        return { text: 'OK', inputTokens: 1, outputTokens: 1 };
      },
    } as unknown as LLMClient;

    const router = new ModelRouter(
      new Map([['flaky', flaky]]),
      { defaultProvider: 'flaky', onTotalFailure } as any,
      ledger(),
    );

    for (let i = 0; i < 3; i++) {
      await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    }
    expect(onTotalFailure).toHaveBeenCalledTimes(1);

    dead = false;
    await router.probe();

    dead = true;
    for (let i = 0; i < 3; i++) {
      await expectThrows(() => router.generate('s', 'u', 8, { taskType: 'codegen' }));
    }
    expect(onTotalFailure).toHaveBeenCalledTimes(2);
  });
});
