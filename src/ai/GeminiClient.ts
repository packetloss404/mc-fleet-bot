import { LLMClient, LLMResponse } from './LLMClient';
import type { LLMCallOptions } from './TaskType';
import { logger } from '../util/logger';
import { Semaphore } from '../util/Semaphore';

export class GeminiClient implements LLMClient {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private defaultMaxTokens: number;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/';
  private semaphore: Semaphore;

  constructor(opts: { apiKey: string; model: string; temperature: number; maxTokens: number; maxConcurrentRequests?: number }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.defaultMaxTokens = opts.maxTokens;
    this.semaphore = new Semaphore(opts.maxConcurrentRequests ?? 3);
  }

  async chat(systemPrompt: string, contents: any[], maxTokens?: number, options?: LLMCallOptions): Promise<LLMResponse> {
    await this.semaphore.acquire();
    try {
      const effectiveModel = options?.model ?? this.model;
      const url = this.endpoint(`${effectiveModel}:generateContent`);

      const body: any = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: maxTokens || this.defaultMaxTokens,
          thinkingConfig: {
            thinkingBudget: 128, // Minimal thinking for fast chat responses
          },
        },
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Gemini API ${resp.status}: ${errBody}`);
      }

      const json: any = await resp.json();
      const text = this.extractText(json);
      const usage = json.usageMetadata;

      return {
        text,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
      };
    } finally {
      this.semaphore.release();
    }
  }

  async generate(systemPrompt: string, userMessage: string, maxTokens?: number): Promise<LLMResponse> {
    const contents = [{ role: 'user', parts: [{ text: userMessage }] }];
    return this.chat(systemPrompt, contents, maxTokens);
  }

  /**
   * Generate with thinking enabled — use for code generation tasks
   * where reasoning improves output quality.
   */
  async generateWithThinking(systemPrompt: string, userMessage: string, maxTokens?: number): Promise<LLMResponse> {
    await this.semaphore.acquire();
    try {
      const url = this.endpoint(`${this.model}:generateContent`);

      const body = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: {
          temperature: this.temperature,
          maxOutputTokens: maxTokens || this.defaultMaxTokens,
          thinkingConfig: {
            thinkingBudget: 2048,
          },
        },
      };

      const resp = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Gemini API ${resp.status}: ${errBody}`);
      }

      const json: any = await resp.json();
      const text = this.extractText(json);
      const usage = json.usageMetadata;

      return {
        text,
        inputTokens: usage?.promptTokenCount,
        outputTokens: usage?.candidatesTokenCount,
      };
    } finally {
      this.semaphore.release();
    }
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    await this.semaphore.acquire();
    try {
      const url = this.endpoint('gemini-embedding-001:batchEmbedContents');
      const requests = texts.map((text) => ({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 256,
      }));
      const resp = await fetch(url, {
        method: 'POST',
        headers: this.authHeaders(),
        body: JSON.stringify({ requests }),
        signal: AbortSignal.timeout(30000),
      });
      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`Gemini Embedding API ${resp.status}: ${errBody}`);
      }
      const json: any = await resp.json();
      const embeddings = json.embeddings;
      if (!embeddings || !Array.isArray(embeddings)) {
        throw new Error('No embeddings in Gemini response');
      }
      return embeddings.map((e: any) => e.values);
    } finally {
      this.semaphore.release();
    }
  }

  private extractText(json: any): string {
    const candidates = json.candidates;
    if (!candidates || candidates.length === 0) {
      throw new Error('No candidates in Gemini response');
    }

    const finishReason = candidates[0].finishReason;
    if (finishReason === 'SAFETY') {
      logger.warn('Gemini response blocked by safety filter');
      return '';
    }
    if (finishReason === 'MAX_TOKENS') {
      logger.warn('Gemini response truncated (MAX_TOKENS)');
    }

    const parts = candidates[0].content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error('No parts in Gemini response');
    }

    // Skip thinking parts (thought: true) — only return actual content
    const contentParts = parts.filter((p: any) => !p.thought);
    if (contentParts.length === 0) {
      // Fallback: if all parts are thinking, return the last part
      return parts[parts.length - 1].text?.trim() || '';
    }
    return contentParts.map((p: any) => p.text || '').join('').trim();
  }


  /**
   * Google accepts two credential types, sent differently:
   *   - AI Studio API keys go in the `?key=` query parameter.
   *   - OAuth access tokens (`ya29....`, from `gcloud auth`/ADC or a service
   *     account) go in an `Authorization: Bearer` header and must NOT appear
   *     in the query string.
   * Detecting by prefix lets an operator paste either into the same provider
   * field. OAuth tokens are short-lived and are not refreshed here, so an API
   * key remains the right choice for unattended fleet operation.
   */
  private isOAuthCredential(): boolean {
    return /^ya29\./.test(this.apiKey);
  }

  private endpoint(pathAndMethod: string): string {
    return this.isOAuthCredential()
      ? `${this.baseUrl}${pathAndMethod}`
      : `${this.baseUrl}${pathAndMethod}?key=${this.apiKey}`;
  }

  private authHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.isOAuthCredential()) headers['Authorization'] = `Bearer ${this.apiKey}`;
    return headers;
  }

  /** Concrete model ID, for accurate TokenLedger cost attribution. */
  getModelId(): string {
    return this.model;
  }

  /** embed() is hardcoded to gemini-embedding-001; attribute it honestly. */
  getEmbedModelId(): string {
    return 'gemini-embedding-001';
  }

}
