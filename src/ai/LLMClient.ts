import type { LLMCallOptions } from './TaskType';

export type { LLMCallOptions, TaskType } from './TaskType';

export interface LLMResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  /**
   * Anthropic prompt-cache stats. Present when the provider returns them in
   * usage; undefined for providers that don't support caching (Gemini,
   * MiniMax, Ollama, ...).
   */
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}

export interface LLMClient {
  chat(systemPrompt: string, contents: any[], maxTokens?: number, options?: LLMCallOptions): Promise<LLMResponse>;
  generate(systemPrompt: string, userMessage: string, maxTokens?: number, options?: LLMCallOptions): Promise<LLMResponse>;
  embed?(texts: string[]): Promise<number[][]>;
  /**
   * The concrete model ID this client calls (e.g. `claude-opus-4-8`).
   *
   * Without this the TokenLedger had nothing to record but the *provider*
   * name, so every row stored `model: "gemini"`, the price lookup missed, and
   * `estimatedCostUsd` was 0 on all 10k historical calls — which silently
   * disabled the daily budget cap, since the cap sums those costs.
   */
  getModelId?(): string;
}

/** Extended interface for clients that support deeper reasoning. */
export interface ThinkingCapableClient extends LLMClient {
  generateWithThinking(systemPrompt: string, userMessage: string, maxTokens?: number): Promise<LLMResponse>;
}
