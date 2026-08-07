import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../util/logger';
import type { LLMClient } from './LLMClient';
import type { RouteConfig, TaskType } from './TaskType';
import { GeminiClient } from './GeminiClient';
import { AnthropicClient } from './AnthropicClient';
import { OllamaClient } from './OllamaClient';
import { MiniMaxClient } from './MiniMaxClient';
import { OpenAIClient } from './OpenAIClient';
import { VoyageAIClient } from './VoyageAIClient';
import { ModelRouter, type LLMCallEvent } from './ModelRouter';
import type { TokenLedger } from './TokenLedger';

const SETTINGS_PATH = path.join(process.cwd(), 'data', 'llm-settings.json');

export interface ProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  maxConcurrentRequests: number;
  enabled: boolean;
}

/** Daily-spend guardrail on the paid LLM path. See LLMSettings.isPaidCallAllowed. */
export interface BudgetConfig {
  /** Daily USD cap on governed (paid) providers. <= 0 disables the cap. */
  dailyUsd: number;
  /** 'anthropic' = only gate Anthropic (the expensive path); 'all' = gate every provider. */
  scope: 'anthropic' | 'all';
  /** "Go hog wild" — when true, the cap AND idle throttle are bypassed. */
  override: boolean;
  /** When true, block governed codegen while zero humans are online (needs an online-count hook). */
  idleThrottle: boolean;
  /**
   * Daily cap on RAW paid-call count (all governed providers combined,
   * successes and failures alike). <= 0 disables. This is the pricing-
   * independent backstop: the dollar cap fails open whenever the pricing
   * table is wrong or calls are ledgered at $0 (2026-08: unknown model ids,
   * failed-call rows, the SAFETY-block loop). A call count cannot be fooled
   * by a price.
   */
  dailyCallCap: number;
}

export interface LLMSettingsData {
  providers: ProviderConfig[];
  routes: Record<string, RouteConfig>;
  defaultProvider: string;
  /** Global kill switch — when false, all LLM calls throw AI_DISABLED without spending. */
  aiEnabled: boolean;
  /** Daily spend guardrail. Absent = defaults (see getBudget). */
  budget?: BudgetConfig;
}

const DEFAULT_BUDGET: BudgetConfig = {
  dailyUsd: 5,
  // 'all', not 'anthropic'. An anthropic-only scope means the router falls
  // through to an UNgoverned provider the moment Anthropic is capped or out
  // of credit — which is exactly how the 2026-08 stone-supply loop burned
  // ~$99 of Gemini in two days after exhausting the Anthropic balance.
  scope: 'all',
  override: false,
  idleThrottle: false,
  // ~4x a busy-but-healthy day for this 5-bot fleet; the $240 incident ran
  // ~10k calls/day. Generous enough to never bite legitimate operation.
  dailyCallCap: 2000,
};

const DEFAULT_SETTINGS: LLMSettingsData = {
  providers: [],
  routes: {},
  defaultProvider: 'gemini',
  aiEnabled: true,
  budget: { ...DEFAULT_BUDGET },
};

/**
 * Manages LLM provider API keys and routing config.
 * Persists to data/llm-settings.json and supports hot-reload.
 */
export class LLMSettings {
  private settings: LLMSettingsData;
  private ledger: TokenLedger;
  private currentRouter: ModelRouter | null = null;
  /** Listener re-applied after every buildRouter() so hot-reload keeps emitting. */
  private callListener: ((event: LLMCallEvent) => void) | null = null;
  /** Optional hook returning the number of real (non-bot) players online; drives idle throttle. */
  private onlineHumanCountFn: (() => number) | null = null;

  constructor(ledger: TokenLedger) {
    this.ledger = ledger;
    this.settings = this.load();
    // Merge env vars as initial providers if no settings file exists
    this.seedFromEnv();
  }

  /**
   * Register a listener that fires on every LLM call routed through this
   * settings instance. Survives hot-reload (re-applied after each
   * buildRouter()).
   */
  setCallListener(fn: (event: LLMCallEvent) => void): void {
    this.callListener = fn;
    if (this.currentRouter) {
      this.currentRouter.setCallListener(fn);
    }
  }

  /**
   * Get current settings (API keys are masked).
   *
   * The raw `apiKey` is stripped, not just supplemented with `keyMasked`. This
   * feeds `GET /api/llm/providers`, which is reachable by anything that can
   * hit the API port — spreading `...p` here leaked every provider key in
   * plaintext. Use `getRawSettings()` for internal callers that need the key.
   */
  getSettings(): Omit<LLMSettingsData, 'providers'> & { providers: (Omit<ProviderConfig, 'apiKey'> & { keyMasked: string })[] } {
    return {
      ...this.settings,
      providers: this.settings.providers.map(({ apiKey, ...rest }) => ({
        ...rest,
        keyMasked: apiKey ? apiKey.slice(0, 6) + '...' + apiKey.slice(-4) : '(not set)',
      })),
    };
  }

  /** Get raw settings (with full keys — internal use only). */
  getRawSettings(): LLMSettingsData {
    return this.settings;
  }

  /** Add or update a provider. */
  upsertProvider(provider: ProviderConfig): void {
    const idx = this.settings.providers.findIndex((p) => p.name === provider.name);
    if (idx >= 0) {
      // Update — preserve existing key if new key is empty
      if (!provider.apiKey && this.settings.providers[idx].apiKey) {
        provider.apiKey = this.settings.providers[idx].apiKey;
      }
      this.settings.providers[idx] = provider;
    } else {
      this.settings.providers.push(provider);
    }
    this.save();
  }

  /** Remove a provider. */
  removeProvider(name: string): boolean {
    const before = this.settings.providers.length;
    this.settings.providers = this.settings.providers.filter((p) => p.name !== name);
    if (this.settings.providers.length < before) {
      this.save();
      return true;
    }
    return false;
  }

  /** Update routing config. */
  setRoutes(routes: Record<string, RouteConfig>): void {
    this.settings.routes = routes;
    this.save();
  }

  /** Set the default provider. */
  setDefaultProvider(name: string): void {
    this.settings.defaultProvider = name;
    this.save();
  }

  /** Global AI kill switch. */
  isAiEnabled(): boolean {
    return this.settings.aiEnabled !== false;
  }

  setAiEnabled(enabled: boolean): void {
    this.settings.aiEnabled = enabled;
    this.save();
    logger.warn({ aiEnabled: enabled }, 'AI kill switch toggled');
  }

  /** Register a source for the online (human) player count, used by the idle throttle. */
  setOnlineHumanCountProvider(fn: () => number): void {
    this.onlineHumanCountFn = fn;
  }

  /** Current budget guardrail, with defaults filled in for older settings files. */
  getBudget(): BudgetConfig {
    const b: Partial<BudgetConfig> = this.settings.budget ?? {};
    return {
      dailyUsd: typeof b.dailyUsd === 'number' ? b.dailyUsd : DEFAULT_BUDGET.dailyUsd,
      // Honor an explicit 'anthropic' choice; anything else (including older
      // settings files with no scope) governs all paid providers.
      scope: b.scope === 'anthropic' ? 'anthropic' : 'all',
      override: b.override === true,
      idleThrottle: b.idleThrottle === true,
      dailyCallCap: typeof b.dailyCallCap === 'number' ? b.dailyCallCap : DEFAULT_BUDGET.dailyCallCap,
    };
  }

  /** Merge-update the budget guardrail and persist. */
  setBudget(partial: Partial<BudgetConfig>): BudgetConfig {
    const next = { ...this.getBudget(), ...partial };
    this.settings.budget = next;
    this.save();
    logger.warn({ budget: next }, 'LLM budget guardrail updated');
    return next;
  }

  /** Convenience for the "go hog wild" toggle. */
  setBudgetOverride(override: boolean): BudgetConfig {
    return this.setBudget({ override });
  }

  /**
   * Decide whether a paid/governed provider may be used for this call. Returns
   * true (allow) unless the guardrail says otherwise. Consulted per call by the
   * ModelRouter — when it returns false the router skips that provider and falls
   * through to the cheap fallbacks (or idles if none remain).
   */
  isPaidCallAllowed(provider: string, taskType: string): boolean {
    const b = this.getBudget();
    if (b.override) return true; // hog-wild: no cap, no throttle
    // Ollama is local and free — gating it under scope 'all' would leave the
    // fleet with no fallback at all once the cap trips.
    const governed = b.scope === 'all' ? provider !== 'ollama' : provider === 'anthropic';
    if (!governed) return true; // free/ungoverned providers are never gated
    // Idle throttle: only when a human-count source is wired (else inert).
    if (b.idleThrottle && this.onlineHumanCountFn && taskType === 'codegen') {
      if (this.onlineHumanCountFn() <= 0) return false;
    }
    // Daily dollar cap.
    if (b.dailyUsd > 0) {
      const scopeProvider = b.scope === 'all' ? undefined : 'anthropic';
      if (this.ledger.getSpendTodayUsd({ provider: scopeProvider }) >= b.dailyUsd) return false;
    }
    // Daily call-count cap — the pricing-independent backstop (see
    // BudgetConfig.dailyCallCap). Scoped like the dollar cap.
    if (b.dailyCallCap > 0) {
      const scopeProvider = b.scope === 'all' ? undefined : 'anthropic';
      if (this.ledger.getCallsTodayCount(scopeProvider) >= b.dailyCallCap) return false;
    }
    return true;
  }

  /** Build a new ModelRouter from current settings. Returns null if no providers have keys. */
  buildRouter(): ModelRouter | null {
    const clients = new Map<string, LLMClient>();

    for (const p of this.settings.providers) {
      if (!p.enabled) continue;
      // Ollama is local-only and does not require an API key
      if (p.name !== 'ollama' && !p.apiKey) continue;

      try {
        if (p.name === 'gemini') {
          clients.set('gemini', new GeminiClient({
            apiKey: p.apiKey,
            model: p.model || 'gemini-2.5-flash-preview-05-20',
            temperature: 0.7,
            maxTokens: 2048,
            maxConcurrentRequests: p.maxConcurrentRequests || 3,
          }));
        } else if (p.name === 'anthropic') {
          clients.set('anthropic', new AnthropicClient({
            apiKey: p.apiKey,
            model: p.model || 'claude-opus-4-8',
            temperature: 0.7,
            maxTokens: 2048,
            maxConcurrentRequests: p.maxConcurrentRequests || 3,
          }));
        } else if (p.name === 'ollama') {
          clients.set('ollama', new OllamaClient({
            baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
            chatModel: p.model || 'llama3.2:3b',
            codeModel: process.env.OLLAMA_CODE_MODEL || 'qwen2.5-coder:3b',
            temperature: 0.7,
            maxTokens: 2048,
            timeoutMs: 30000,
          }));
        } else if (p.name === 'minimax') {
          clients.set('minimax', new MiniMaxClient({
            apiKey: p.apiKey,
            model: p.model || 'MiniMax-M3',
            baseUrl: process.env.MINIMAX_BASE_URL,
            temperature: 0.7,
            maxTokens: 2048,
            maxConcurrentRequests: p.maxConcurrentRequests || 3,
          }));
        } else if (p.name === 'openai') {
          clients.set('openai', new OpenAIClient({
            apiKey: p.apiKey,
            model: p.model || 'gpt-5.5',
            baseUrl: process.env.OPENAI_BASE_URL,
            temperature: 0.7,
            maxTokens: 2048,
            maxConcurrentRequests: p.maxConcurrentRequests || 3,
          }));
        } else if (p.name === 'voyage') {
          clients.set('voyage', new VoyageAIClient({
            apiKey: p.apiKey,
            model: p.model || 'voyage-4-large',
          }));
        }
        logger.info({ provider: p.name, model: p.model }, 'Provider client rebuilt');
      } catch (err: any) {
        logger.error({ provider: p.name, err: err.message }, 'Failed to build provider client');
      }
    }

    if (clients.size === 0) return null;

    this.currentRouter = new ModelRouter(clients, {
      defaultProvider: this.settings.defaultProvider,
      routes: Object.keys(this.settings.routes).length > 0 ? this.settings.routes : undefined,
      isEnabled: () => this.isAiEnabled(),
      paidProviderAllowed: (provider, taskType) => this.isPaidCallAllowed(provider, taskType),
    }, this.ledger);

    // Re-apply any previously registered call listener so the live timeline
    // keeps receiving events after /api/llm/reload.
    if (this.callListener) {
      this.currentRouter.setCallListener(this.callListener);
    }

    return this.currentRouter;
  }

  /** Get the current router (for hot-swap). */
  getCurrentRouter(): ModelRouter | null {
    return this.currentRouter;
  }

  /**
   * Register any provider that has an env key and isn't configured yet.
   *
   * This used to bail entirely when ANY provider existed, which made the env
   * vars write-once: with gemini+anthropic already in llm-settings.json,
   * adding MINIMAX_API_KEY or OPENAI_API_KEY to .env did nothing at all, with
   * no error — the provider simply never appeared. Seeding per-provider makes
   * dropping in a new key turn-key.
   *
   * Existing entries are never modified: a key or model edited through the
   * dashboard wins over the environment.
   */
  private seedFromEnv(): void {
    const already = new Set(this.settings.providers.map((p) => p.name));
    const seededBefore = this.settings.providers.length;

    const googleKey = process.env.GOOGLE_API_KEY;
    if (googleKey) {
      if (!already.has('gemini')) this.settings.providers.push({
        name: 'gemini',
        apiKey: googleKey,
        model: 'gemini-2.5-flash-preview-05-20',
        maxConcurrentRequests: 3,
        enabled: true,
      });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      if (!already.has('anthropic')) this.settings.providers.push({
        name: 'anthropic',
        apiKey: anthropicKey,
        model: 'claude-opus-4-8',
        maxConcurrentRequests: 3,
        enabled: true,
      });
    }

    const openaiKey = process.env.OPENAI_API_KEY;
    if (openaiKey) {
      if (!already.has('openai')) this.settings.providers.push({
        name: 'openai',
        apiKey: openaiKey,
        model: 'gpt-5.6-sol',
        maxConcurrentRequests: 3,
        enabled: true,
      });
    }

    const voyageKey = process.env.VOYAGE_API_KEY;
    if (voyageKey) {
      if (!already.has('voyage')) this.settings.providers.push({
        name: 'voyage',
        apiKey: voyageKey,
        model: 'voyage-4-large',
        maxConcurrentRequests: 3,
        enabled: true,
      });
    }

    const minimaxKey = process.env.MINIMAX_API_KEY;
    if (minimaxKey) {
      if (!already.has('minimax')) this.settings.providers.push({
        name: 'minimax',
        apiKey: minimaxKey,
        model: 'MiniMax-M3',
        maxConcurrentRequests: 3,
        enabled: true,
      });
    }

    // Ollama: enabled when OLLAMA_BASE_URL is set (no API key needed for local).
    if (process.env.OLLAMA_BASE_URL) {
      if (!already.has('ollama')) this.settings.providers.push({
        name: 'ollama',
        apiKey: '',
        model: process.env.OLLAMA_CHAT_MODEL || 'llama3.2:3b',
        maxConcurrentRequests: 1,
        enabled: true,
      });
    }

    // Only (re)pick a default when there wasn't one — never steal the default
    // away from a provider the operator selected.
    if (this.settings.providers.length > 0 && !this.settings.defaultProvider) {
      this.settings.defaultProvider = this.settings.providers[0].name;
    }
    if (this.settings.providers.length !== seededBefore) {
      logger.info(
        { added: this.settings.providers.filter((p) => !already.has(p.name)).map((p) => p.name) },
        'Seeded new LLM providers from environment',
      );
      this.save();
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(SETTINGS_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      // Unique temp name: a fixed `.tmp` is not atomic under concurrent
      // writers (see util/atomicWrite.ts for the same fix).
      const tmpPath = `${SETTINGS_PATH}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
      // mode 0o600: this file holds plaintext provider API keys. Restrict to
      // owner read/write so other local users can't read the credentials.
      // writeFileSync sets the mode on create; rename preserves it.
      fs.writeFileSync(tmpPath, JSON.stringify(this.settings, null, 2), { mode: 0o600 });
      fs.renameSync(tmpPath, SETTINGS_PATH);
      try { fs.chmodSync(SETTINGS_PATH, 0o600); } catch { /* best-effort on pre-existing file */ }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to save LLM settings');
    }
  }

  private load(): LLMSettingsData {
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        const data = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
        return { ...DEFAULT_SETTINGS, ...data };
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to load LLM settings, using defaults');
    }
    return { ...DEFAULT_SETTINGS };
  }
}
