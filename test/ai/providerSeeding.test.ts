import os from 'node:os';
import fs from 'node:fs';
import pathMod from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * `seedFromEnv()` used to bail entirely if ANY provider was already
 * configured, which made the env vars effectively write-once: with
 * gemini+anthropic already in llm-settings.json, adding MINIMAX_API_KEY or
 * OPENAI_API_KEY to .env did nothing, silently. Seeding is now per-provider.
 */
let cwd: string;
let prevCwd: string;
const KEYS = ['GOOGLE_API_KEY', 'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'MINIMAX_API_KEY', 'VOYAGE_API_KEY', 'OLLAMA_BASE_URL'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  prevCwd = process.cwd();
  cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'llmset-'));
  fs.mkdirSync(path.join(cwd, 'data'), { recursive: true });
  process.chdir(cwd);
  for (const k of KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  vi.resetModules();
});
afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(cwd, { recursive: true, force: true });
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

async function freshSettings() {
  vi.resetModules();
  const { LLMSettings } = await import('../../src/ai/LLMSettings');
  const { TokenLedger } = await import('../../src/ai/TokenLedger');
  return new LLMSettings(new TokenLedger(fs.mkdtempSync(pathMod.join(os.tmpdir(), 'ledger-'))));
}

describe('per-provider env seeding', () => {
  it('registers a NEW provider even when others already exist', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-X';
    const first = await freshSettings();
    expect(first.getSettings().providers.map((p) => p.name)).toEqual(['anthropic']);

    // Operator now drops in a MiniMax key and restarts.
    process.env.MINIMAX_API_KEY = 'mm-key';
    const second = await freshSettings();
    const names = second.getSettings().providers.map((p) => p.name);
    expect(names).toContain('anthropic');
    expect(names).toContain('minimax');
  });

  it('defaults MiniMax to M3 and OpenAI to a current model', async () => {
    process.env.MINIMAX_API_KEY = 'mm-key';
    process.env.OPENAI_API_KEY = 'sk-openai';
    const s = await freshSettings();
    const byName = Object.fromEntries(s.getSettings().providers.map((p) => [p.name, p.model]));
    expect(byName.minimax).toBe('MiniMax-M3');
    expect(byName.openai).toBe('gpt-5.6-sol');
  });

  it('never overwrites a provider the operator already configured', async () => {
    process.env.MINIMAX_API_KEY = 'mm-key';
    const s1 = await freshSettings();
    s1.upsertProvider({ name: 'minimax', apiKey: 'operator-key', model: 'MiniMax-M2.5', maxConcurrentRequests: 1, enabled: true });

    const s2 = await freshSettings();
    const mm = s2.getSettings().providers.find((p) => p.name === 'minimax');
    // Operator's model choice survives re-seeding.
    expect(mm?.model).toBe('MiniMax-M2.5');
  });

  it('does not steal the default provider once one is chosen', async () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-X';
    const s1 = await freshSettings();
    s1.setDefaultProvider('anthropic');

    process.env.GOOGLE_API_KEY = 'AIza';
    const s2 = await freshSettings();
    expect(s2.getSettings().defaultProvider).toBe('anthropic');
  });
});
