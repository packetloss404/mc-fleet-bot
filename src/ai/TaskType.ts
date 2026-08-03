/**
 * Task types for LLM call routing.
 * Each type maps to a different model/provider configuration.
 */
export type TaskType = 'codegen' | 'curriculum' | 'critic' | 'chat' | 'embed';

/** Options passed with every LLM call for routing and tracking. */
export interface LLMCallOptions {
  /** Which task category this call belongs to — determines model routing. */
  taskType?: TaskType;
  /** Bot making the call — for per-bot cost tracking. */
  botName?: string;
  /**
   * Per-call model override, supplied by ModelRouter from `RouteConfig.model`.
   *
   * Without this, a route's `model` was only ever written to the TokenLedger —
   * the request still used whatever model the provider's client was built
   * with. Setting a cheap model on a route therefore billed at the expensive
   * model's rate while recording the cheap one, under-reporting spend and
   * defeating the daily cap.
   */
  model?: string;
}

/** Per-task-type routing configuration (from config.yml). */
export interface RouteConfig {
  provider: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** If true and the provider supports it, use extended thinking mode. */
  useThinking?: boolean;
  /** Ordered list of fallback provider names on failure. */
  fallback?: string[];
}

/** Token usage record for the ledger. */
export interface TokenUsageRecord {
  timestamp: number;
  provider: string;
  model: string;
  taskType: TaskType | 'unknown';
  botName: string;
  inputTokens: number;
  outputTokens: number;
  /**
   * Anthropic prompt-cache accounting. `input_tokens` from the API EXCLUDES
   * cached tokens, so recording only `inputTokens` under-counts what was
   * actually billed. Cache writes bill at 1.25x input, cache reads at 0.1x.
   * Dropping these made the daily cap under-report Anthropic spend.
   */
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
  estimatedCostUsd: number;
  latencyMs: number;
  success: boolean;
}

/** Aggregated usage metrics. */
export interface UsageMetrics {
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalEstimatedCostUsd: number;
  avgLatencyMs: number;
  successRate: number;
  byProvider: Record<string, { calls: number; tokens: number; cost: number }>;
  byTaskType: Record<string, { calls: number; tokens: number; cost: number }>;
  byBot: Record<string, { calls: number; tokens: number; cost: number }>;
}
