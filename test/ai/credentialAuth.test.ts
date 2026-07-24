import { describe, it, expect, vi, afterEach } from 'vitest';
import { AnthropicClient } from '../../src/ai/AnthropicClient';
import { GeminiClient } from '../../src/ai/GeminiClient';

/**
 * Anthropic and Google each accept two credential types on the same endpoint,
 * and they are NOT sent the same way. Getting this wrong is a 401 on every
 * call, which ModelRouter treats as terminal — the exact failure shape that
 * previously killed a whole provider silently. These tests pin the wire
 * format for both credential kinds so a refactor can't quietly swap them.
 */

function mockFetchOnce(payload: unknown) {
  const spy = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

const ANTHROPIC_OK = { content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } };
const GEMINI_OK = { candidates: [{ content: { parts: [{ text: 'ok' }] } }], usageMetadata: {} };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('AnthropicClient credential handling', () => {
  const opts = { model: 'claude-opus-4-8', temperature: 0.7, maxTokens: 64 };

  it('sends an API key via x-api-key and no oauth beta header', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    await new AnthropicClient({ ...opts, apiKey: 'sk-ant-api03-EXAMPLE' }).generate('sys', 'hi');

    const headers = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('sk-ant-api03-EXAMPLE');
    expect(headers['Authorization']).toBeUndefined();
    expect(headers['anthropic-beta']).toBeUndefined();
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });

  it('sends an OAuth token as a bearer token with the oauth beta header', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    await new AnthropicClient({ ...opts, apiKey: 'sk-ant-oat01-EXAMPLE' }).generate('sys', 'hi');

    const headers = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-ant-oat01-EXAMPLE');
    expect(headers['anthropic-beta']).toBe('oauth-2025-04-20');
    // An OAuth token sent as x-api-key is a 401 — it must not appear there.
    expect(headers['x-api-key']).toBeUndefined();
  });

  it('omits temperature for models that reject sampling params', async () => {
    for (const model of ['claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-fable-5']) {
      const spy = mockFetchOnce(ANTHROPIC_OK);
      await new AnthropicClient({ ...opts, model, apiKey: 'sk-ant-api03-X' }).generate('sys', 'hi');
      const body = JSON.parse(spy.mock.calls[0][1].body as string);
      expect(body.temperature, `${model} must not send temperature`).toBeUndefined();
      vi.unstubAllGlobals();
    }
  });

  it('still sends temperature for models that accept it', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    await new AnthropicClient({ ...opts, model: 'claude-haiku-4-5', apiKey: 'sk-ant-api03-X' }).generate('sys', 'hi');
    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.temperature).toBe(0.7);
  });

  it('reports its concrete model id for cost attribution', () => {
    const client = new AnthropicClient({ ...opts, apiKey: 'sk-ant-api03-X' });
    expect(client.getModelId()).toBe('claude-opus-4-8');
  });
});

describe('GeminiClient credential handling', () => {
  const opts = { model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 64 };

  it('puts an API key in the query string, not a header', async () => {
    const spy = mockFetchOnce(GEMINI_OK);
    await new GeminiClient({ ...opts, apiKey: 'AIzaSyEXAMPLE' }).generate('sys', 'hi');

    const url = spy.mock.calls[0][0] as string;
    const headers = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(url).toContain('key=AIzaSyEXAMPLE');
    expect(headers['Authorization']).toBeUndefined();
  });

  it('puts an OAuth token in a bearer header and keeps it out of the URL', async () => {
    const spy = mockFetchOnce(GEMINI_OK);
    await new GeminiClient({ ...opts, apiKey: 'ya29.EXAMPLE-TOKEN' }).generate('sys', 'hi');

    const url = spy.mock.calls[0][0] as string;
    const headers = spy.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer ya29.EXAMPLE-TOKEN');
    // Credentials in a URL leak into logs and proxies — must not be there.
    expect(url).not.toContain('ya29.');
    expect(url).not.toContain('key=');
  });

  it('reports its concrete model id for cost attribution', () => {
    expect(new GeminiClient({ ...opts, apiKey: 'AIza' }).getModelId()).toBe('gemini-2.5-flash');
  });
});

describe('per-call model override (RouteConfig.model)', () => {
  it('AnthropicClient calls the overridden model, not its constructor model', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    const client = new AnthropicClient({
      apiKey: 'sk-ant-api03-X', model: 'claude-opus-4-8', temperature: 0.7, maxTokens: 64,
    });
    await client.generate('sys', 'hi', 64, { taskType: 'critic', model: 'claude-haiku-4-5' });

    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    // If this regresses, a cheap route silently bills at the expensive model's
    // rate while the ledger records the cheap one.
    expect(body.model).toBe('claude-haiku-4-5');
    // Haiku accepts temperature; the check must use the EFFECTIVE model.
    expect(body.temperature).toBe(0.7);
  });

  it('AnthropicClient suppresses temperature when the OVERRIDE model rejects it', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    const client = new AnthropicClient({
      apiKey: 'sk-ant-api03-X', model: 'claude-haiku-4-5', temperature: 0.7, maxTokens: 64,
    });
    await client.generate('sys', 'hi', 64, { taskType: 'codegen', model: 'claude-opus-5' });

    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.model).toBe('claude-opus-5');
    expect(body.temperature).toBeUndefined();
  });

  it('GeminiClient calls the overridden model in the URL', async () => {
    const spy = mockFetchOnce(GEMINI_OK);
    const client = new GeminiClient({
      apiKey: 'AIzaX', model: 'gemini-2.5-flash', temperature: 0.7, maxTokens: 64,
    });
    await client.chat('sys', [{ role: 'user', parts: [{ text: 'hi' }] }], 64, {
      taskType: 'chat', model: 'gemini-3.5-flash',
    });

    expect(spy.mock.calls[0][0] as string).toContain('gemini-3.5-flash:generateContent');
  });

  it('falls back to the constructor model when no override is given', async () => {
    const spy = mockFetchOnce(ANTHROPIC_OK);
    const client = new AnthropicClient({
      apiKey: 'sk-ant-api03-X', model: 'claude-opus-4-8', temperature: 0.7, maxTokens: 64,
    });
    await client.generate('sys', 'hi', 64, { taskType: 'codegen' });
    expect(JSON.parse(spy.mock.calls[0][1].body as string).model).toBe('claude-opus-4-8');
  });
});

import { MiniMaxClient } from '../../src/ai/MiniMaxClient';
import { OpenAIClient } from '../../src/ai/OpenAIClient';

const MINIMAX_OK = { choices: [{ message: { content: 'ok' } }], usage: {} };
const OPENAI_OK = { choices: [{ message: { content: 'ok' } }], usage: {} };

describe('MiniMax / OpenAI model override', () => {
  it('MiniMax defaults to its configured model (M3)', async () => {
    const spy = mockFetchOnce(MINIMAX_OK);
    await new MiniMaxClient({
      apiKey: 'k', model: 'MiniMax-M3', temperature: 0.7, maxTokens: 64,
    }).generate('sys', 'hi');
    expect(JSON.parse(spy.mock.calls[0][1].body as string).model).toBe('MiniMax-M3');
  });

  it('MiniMax honours a per-route model override', async () => {
    const spy = mockFetchOnce(MINIMAX_OK);
    await new MiniMaxClient({
      apiKey: 'k', model: 'MiniMax-M3', temperature: 0.7, maxTokens: 64,
    }).generate('sys', 'hi', 64, { taskType: 'critic', model: 'MiniMax-M2.5' });
    // Without this the ledger recorded M2.5 while the request used M3.
    expect(JSON.parse(spy.mock.calls[0][1].body as string).model).toBe('MiniMax-M2.5');
  });

  it('OpenAI picks the reasoning-era request shape from the OVERRIDE model', async () => {
    const spy = mockFetchOnce(OPENAI_OK);
    // Client built as a legacy model, routed to a GPT-5-era one.
    await new OpenAIClient({
      apiKey: 'k', model: 'gpt-4', temperature: 0.7, maxTokens: 64,
    }).generate('sys', 'hi', 64, { taskType: 'codegen', model: 'gpt-5.6-sol' });

    const body = JSON.parse(spy.mock.calls[0][1].body as string);
    expect(body.model).toBe('gpt-5.6-sol');
    // Reasoning-era models take max_completion_tokens and reject temperature.
    expect(body.max_completion_tokens).toBeDefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.temperature).toBeUndefined();
  });
});
