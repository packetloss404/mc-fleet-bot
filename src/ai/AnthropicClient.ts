import { LLMClient, LLMResponse } from './LLMClient';
import type { LLMCallOptions } from './TaskType';
import { Semaphore } from '../util/Semaphore';

type GeminiLikeContent = {
  role?: string;
  parts?: Array<{ text?: string }>;
};

/**
 * Minimum cacheable prefix, in TOKENS, per model. Below its model's minimum
 * the server silently ignores `cache_control` — no error, just no caching and
 * one of the four breakpoints wasted.
 *
 * This is NOT uniform and NOT monotonic across generations: Opus 5 caches from
 * 512 tokens while Haiku 4.5 needs 4096. A single global threshold is wrong in
 * both directions — too conservative on Opus 5 (missing real savings) and too
 * permissive on Haiku 4.5 (marking prompts that will never cache).
 */
const CACHE_MIN_TOKENS: Array<[RegExp, number]> = [
  [/claude-(opus-5|fable-5|mythos-5)/i, 512],
  [/claude-(opus-4-8|sonnet-5|sonnet-4-6|sonnet-4-5|opus-4-1|opus-4-0|sonnet-4)/i, 1024],
  [/claude-(opus-4-7|mythos-preview|haiku-3-5)/i, 2048],
  [/claude-(opus-4-6|opus-4-5|haiku-4-5)/i, 4096],
];

/**
 * Chars per token, measured against THIS repo's actual prompts (2.59), not the
 * ~4 rule of thumb for English prose — code-heavy system prompts tokenise far
 * denser than prose.
 *
 * The direction of error matters and 4 had it backwards. Too HIGH demands more
 * characters than the model actually needs, so genuinely cacheable prompts are
 * never marked — that is real money on every call. Too LOW merely wastes one of
 * four cache breakpoints on a prompt the server ignores, and this client uses
 * only one. So bias low: 2.5 sits just under the measured 2.59.
 */
const CHARS_PER_TOKEN = 2.5;

/** Fallback for unrecognised models — the most common minimum. */
const DEFAULT_CACHE_MIN_TOKENS = 1024;

function cacheThresholdChars(model: string): number {
  const hit = CACHE_MIN_TOKENS.find(([re]) => re.test(model));
  return (hit ? hit[1] : DEFAULT_CACHE_MIN_TOKENS) * CHARS_PER_TOKEN;
}

export class AnthropicClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private defaultMaxTokens: number;
  private baseUrl = 'https://api.anthropic.com/v1/messages';
  private semaphore: Semaphore;

  constructor(opts: { apiKey: string; model: string; temperature: number; maxTokens: number; maxConcurrentRequests?: number }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.defaultMaxTokens = opts.maxTokens;
    this.semaphore = new Semaphore(opts.maxConcurrentRequests ?? 3);
  }

  async chat(systemPrompt: string, contents: GeminiLikeContent[], maxTokens?: number, options?: LLMCallOptions): Promise<LLMResponse> {
    await this.semaphore.acquire();
    try {
      // Prompt caching: when the system prompt is long enough to benefit
      // (≥ ~1024 tokens), wrap it in a content block with cache_control so
      // Anthropic caches the stable prefix and bills cached re-reads at
      // ~10% of normal input cost. Stable system prompts in this codebase
      // (ACTION_SYSTEM_PROMPT, curriculum/critic templates) easily clear
      // the threshold and repeat verbatim across every call.
      // A route may override the model per call — the cache threshold is
      // model-specific, so resolve the model FIRST.
      const effectiveModel = options?.model ?? this.model;
      const useCache = systemPrompt.length >= cacheThresholdChars(effectiveModel);
      const systemField = useCache
        ? [
            {
              type: 'text' as const,
              text: systemPrompt,
              cache_control: { type: 'ephemeral' as const },
            },
          ]
        : systemPrompt;

      const body: Record<string, any> = {
        model: effectiveModel,
        system: systemField,
        max_tokens: maxTokens || this.defaultMaxTokens,
        messages: this.toAnthropicMessages(contents),
      };
      // Opus 4.6+ / Sonnet 5 / Fable reasoning models reject a custom
      // `temperature` (HTTP 400, which is terminal in ModelRouter — so the
      // codegen/critic fallback to claude-opus-4-8 silently died on every
      // call). Only send temperature for models that accept it (Sonnet 4.x,
      // Haiku, and older Opus).
      //
      // The `-5`+ branch matters: temperature is rejected on claude-opus-5 and
      // claude-sonnet-5 too, and matching only `opus-4-*` meant selecting
      // either one bricked every call the same way 4.6 originally did.
      const rejectsTemperature = /claude-(opus-4-(6|7|8|9)|(opus|sonnet)-[5-9]|fable|mythos)/i.test(effectiveModel);
      if (!rejectsTemperature) {
        body.temperature = this.temperature;
      }

      const resp = await fetch(this.baseUrl, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Anthropic API ${resp.status}: ${errBody}`);
      }

      const json: any = await resp.json();

      return {
        text: this.extractText(json),
        inputTokens: json.usage?.input_tokens,
        outputTokens: json.usage?.output_tokens,
        cacheCreationInputTokens: json.usage?.cache_creation_input_tokens,
        cacheReadInputTokens: json.usage?.cache_read_input_tokens,
      };
    } finally {
      this.semaphore.release();
    }
  }

  async generate(systemPrompt: string, userMessage: string, maxTokens?: number, options?: LLMCallOptions): Promise<LLMResponse> {
    return this.chat(systemPrompt, [{ role: 'user', parts: [{ text: userMessage }] }], maxTokens, options);
  }

  private toAnthropicMessages(contents: GeminiLikeContent[]): Array<{ role: 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const content of contents) {
      const role = content.role === 'model' ? 'assistant' : 'user';
      const text = (content.parts || [])
        .map((part) => part.text || '')
        .join('')
        .trim();

      if (!text) {
        continue;
      }

      const previous = messages[messages.length - 1];
      if (previous && previous.role === role) {
        previous.content = `${previous.content}\n\n${text}`;
        continue;
      }

      messages.push({ role, content: text });
    }

    return messages;
  }

  private extractText(json: any): string {
    const content = Array.isArray(json.content) ? json.content : [];
    const text = content
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => part.text || '')
      .join('')
      .trim();

    if (!text) {
      throw new Error('No text in Anthropic response');
    }

    return text;
  }

  /**
   * Auth headers, chosen by credential shape.
   *
   * Anthropic accepts two credential types on the same endpoint and they are
   * NOT interchangeable in how they're sent:
   *   - API keys (`sk-ant-api...`) go in `x-api-key`.
   *   - OAuth access tokens (`sk-ant-oat...`, e.g. from `ant auth login` /
   *     `ant auth print-credentials --access-token`) go in
   *     `Authorization: Bearer` AND require the `oauth-2025-04-20` beta
   *     header. Sending an OAuth token as `x-api-key` is a 401.
   *
   * Detecting by prefix means an operator can paste either credential into the
   * same provider field and it just works — no config-schema or dashboard
   * change. OAuth tokens are short-lived and are not auto-refreshed here, so
   * an API key remains the right choice for unattended fleet operation.
   */
  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };
    if (/^sk-ant-oat/i.test(this.apiKey)) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
      headers['anthropic-beta'] = 'oauth-2025-04-20';
    } else {
      headers['x-api-key'] = this.apiKey;
    }
    return headers;
  }

  /** Concrete model ID, for accurate TokenLedger cost attribution. */
  getModelId(): string {
    return this.model;
  }

}
