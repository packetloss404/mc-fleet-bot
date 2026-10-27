import fs from 'fs';
import path from 'path';
import { BotState } from '../bot/BotState';
import type { BotManager } from '../bot/BotManager';
import type { WorkerHandle } from '../worker/WorkerHandle';
import { loadObservedRole } from '../town/ObservedRoleModel';
import { TOWN_ROLES, type TownRole } from '../town/RoleManager';
import { logger } from '../util/logger';
import { atomicWriteJsonSync } from '../util/atomicWrite';

const DEFAULT_REQUEST_TIMEOUT_MS = 3_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const FAILURE_WARNING_INTERVAL_MS = 5 * 60_000;
const DEFAULT_PENDING_DELETIONS_PATH = path.join(
  process.cwd(),
  'data',
  'fleetcraft-pending-deletions.json',
);

const BOT_STATES = new Set<string>(Object.values(BotState));
const TOWN_ROLE_SET = new Set<string>(TOWN_ROLES);

export interface FleetCraftStateUpdate {
  botState: BotState;
  townRole: TownRole | null;
  observedRole: TownRole;
  activity: string | null;
}

export interface FleetCraftTransport {
  readonly heartbeatIntervalMs: number;
  registerBot(username: string): Promise<boolean>;
  updateBotState(username: string, update: FleetCraftStateUpdate): Promise<boolean>;
  deregisterBot(username: string): Promise<boolean>;
}

export interface FleetCraftClientOptions {
  baseUrl: string;
  apiKey: string;
  requestTimeoutMs?: number;
  heartbeatIntervalMs?: number;
}

function boundedNumber(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

/**
 * Fail-open HTTP transport for FleetCraft's controller-only bot registry.
 * Every operation resolves to a boolean; connectivity can never throw into bot
 * lifecycle code.
 */
export class FleetCraftClient implements FleetCraftTransport {
  readonly heartbeatIntervalMs: number;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly requestTimeoutMs: number;
  private readonly lastFailureWarningAt = new Map<string, number>();

  constructor(options: FleetCraftClientOptions) {
    const parsed = new URL(options.baseUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('FleetCraft URL must use http or https');
    }
    if (parsed.search || parsed.hash) {
      throw new Error('FleetCraft URL cannot contain a query string or fragment');
    }
    this.baseUrl = parsed.toString().replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.requestTimeoutMs = Math.min(
      10_000,
      Math.max(250, options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS),
    );
    this.heartbeatIntervalMs = Math.min(
      5 * 60_000,
      Math.max(5_000, options.heartbeatIntervalMs ?? DEFAULT_HEARTBEAT_INTERVAL_MS),
    );
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): FleetCraftClient | null {
    const baseUrl = env.FLEETCRAFT_URL?.trim();
    const apiKey = env.FLEETCRAFT_API_KEY?.trim();
    if (!baseUrl && !apiKey) {
      logger.info('FleetCraft bridge disabled (FLEETCRAFT_URL and FLEETCRAFT_API_KEY are unset)');
      return null;
    }
    if (!baseUrl || !apiKey) {
      logger.warn(
        { hasUrl: Boolean(baseUrl), hasApiKey: Boolean(apiKey) },
        'FleetCraft bridge disabled: both FLEETCRAFT_URL and FLEETCRAFT_API_KEY are required',
      );
      return null;
    }
    try {
      return new FleetCraftClient({
        baseUrl,
        apiKey,
        requestTimeoutMs: boundedNumber(
          env.FLEETCRAFT_TIMEOUT_MS,
          DEFAULT_REQUEST_TIMEOUT_MS,
          250,
          10_000,
        ),
        heartbeatIntervalMs: boundedNumber(
          env.FLEETCRAFT_SYNC_INTERVAL_MS,
          DEFAULT_HEARTBEAT_INTERVAL_MS,
          5_000,
          5 * 60_000,
        ),
      });
    } catch (err) {
      logger.warn(
        { err: (err as Error).message },
        'FleetCraft bridge disabled: FLEETCRAFT_URL is invalid',
      );
      return null;
    }
  }

  registerBot(username: string): Promise<boolean> {
    return this.request(
      'POST',
      '/api/fleet/bots',
      { username },
      username,
      [],
      true,
    );
  }

  updateBotState(username: string, update: FleetCraftStateUpdate): Promise<boolean> {
    return this.request(
      'PUT',
      `/api/fleet/bots/${encodeURIComponent(username)}/state`,
      update,
      username,
    );
  }

  deregisterBot(username: string): Promise<boolean> {
    return this.request(
      'DELETE',
      `/api/fleet/bots/${encodeURIComponent(username)}`,
      undefined,
      username,
      [404],
      true,
    );
  }

  private async request(
    method: 'POST' | 'PUT' | 'DELETE',
    pathname: string,
    body: object | undefined,
    username: string,
    acceptedStatuses: number[] = [],
    requireWhitelistReloaded = false,
  ): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    timeout.unref?.();
    const failureKey = `${method}:${pathname}`;

    try {
      const response = await fetch(`${this.baseUrl}${pathname}`, {
        method,
        headers: {
          'X-Api-Key': this.apiKey,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      if (!response.ok && !acceptedStatuses.includes(response.status)) {
        this.logFailure(failureKey, username, `HTTP ${response.status}`);
        return false;
      }
      if (requireWhitelistReloaded) {
        let result: unknown;
        try {
          result = await response.json();
        } catch {
          this.logFailure(failureKey, username, 'response was not valid JSON');
          return false;
        }
        if (
          typeof result !== 'object'
          || result === null
          || (result as Record<string, unknown>).whitelistReloaded !== true
        ) {
          this.logFailure(failureKey, username, 'whitelist reload was not confirmed');
          return false;
        }
      }
      this.lastFailureWarningAt.delete(failureKey);
      return true;
    } catch (err) {
      const message = (err as Error).name === 'AbortError'
        ? `timed out after ${this.requestTimeoutMs}ms`
        : (err as Error).message;
      this.logFailure(failureKey, username, message);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private logFailure(key: string, username: string, error: string): void {
    const now = Date.now();
    const previous = this.lastFailureWarningAt.get(key) ?? 0;
    if (now - previous >= FAILURE_WARNING_INTERVAL_MS) {
      this.lastFailureWarningAt.set(key, now);
      logger.warn({ bot: username, error }, 'FleetCraft bridge request failed; bot operation continues');
    } else {
      logger.debug({ bot: username, error }, 'FleetCraft bridge request still unavailable');
    }
  }
}

interface PublishedState {
  signature: string;
  attemptedAt: number;
  succeededAt: number;
}

type StatusUnsubscribe = () => void;

/**
 * Adapts mc-fleet-bot's real worker/town state to FleetCraft's intentionally
 * thin citizen projection. It owns ordering per bot so an intentional DELETE
 * cannot be followed by a late state update.
 */
export class FleetCraftBridge {
  private readonly handles = new Map<string, WorkerHandle>();
  private readonly registered = new Set<string>();
  private readonly published = new Map<string, PublishedState>();
  private readonly liveStatusSignatures = new Map<string, string>();
  private readonly queues = new Map<string, Promise<void>>();
  private readonly pendingDeletions = new Map<string, string>();
  private readonly removedHandles = new WeakSet<WorkerHandle>();
  private readonly unsubscribeStatus = new Map<string, StatusUnsubscribe>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private stopped = false;

  constructor(
    private readonly transport: FleetCraftTransport,
    private readonly botManager: BotManager,
    private readonly observedRoleForBot: (name: string) => string = (name) =>
      loadObservedRole(name).observedRole,
    private readonly pendingDeletionsPath = DEFAULT_PENDING_DELETIONS_PATH,
  ) {}

  start(): void {
    if (this.interval || this.stopped) return;
    this.loadPendingDeletions();
    for (const handle of this.botManager.getAllWorkers()) void this.attach(handle);
    this.botManager.onBotSpawned((handle) => this.attach(handle));
    this.botManager.onBotRemoved((name, handle) => this.detach(name, handle));
    // Retry durable tombstones immediately at boot. Existing live handles were
    // attached first so a deliberate re-add of the same username cancels its
    // stale tombstone before any DELETE can run.
    for (const name of this.pendingDeletions.values()) void this.scheduleDeletion(name);
    this.interval = setInterval(() => {
      for (const handle of this.handles.values()) void this.scheduleSync(handle);
      for (const name of this.pendingDeletions.values()) void this.scheduleDeletion(name);
    }, this.transport.heartbeatIntervalMs);
    this.interval.unref?.();
    logger.info(
      { syncIntervalMs: this.transport.heartbeatIntervalMs },
      'FleetCraft bridge enabled',
    );
  }

  /**
   * Publish a final disconnected state but retain the registry entry across a
   * normal service restart. DELETE is reserved for an intentional bot removal.
   */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    for (const unsubscribe of this.unsubscribeStatus.values()) unsubscribe();
    this.unsubscribeStatus.clear();

    const finalUpdates = [...this.handles.values()].map((handle) =>
      this.enqueue(handle.botName, async () => {
        const key = handle.botName.toLowerCase();
        if (!this.registered.has(key)) {
          const registered = await this.transport.registerBot(handle.botName);
          if (!registered) return;
          this.registered.add(key);
        }
        const state = this.buildState(handle, BotState.DISCONNECTED);
        await this.transport.updateBotState(handle.botName, state);
      }),
    );
    const finalDeletions = [...this.pendingDeletions.values()].map((name) =>
      this.scheduleDeletion(name));
    await Promise.all([...finalUpdates, ...finalDeletions]);
    // A detach may already have queued a DELETE before stop() took its
    // snapshot. Drain every remaining per-bot queue before allowing process
    // shutdown; each HTTP attempt is independently timeout-bounded.
    await Promise.all([...this.queues.values()]);
  }

  private attach(handle: WorkerHandle): Promise<void> {
    if (this.stopped || this.removedHandles.has(handle)) return Promise.resolve();
    const key = handle.botName.toLowerCase();
    if (this.handles.get(key) === handle) return Promise.resolve();
    // A newly-created handle with the same username is a new operator intent.
    // It supersedes retries for the old handle; queue ordering still ensures
    // any DELETE already in flight completes before this handle POSTs again.
    if (this.pendingDeletions.delete(key)) this.persistPendingDeletions();
    this.unsubscribeStatus.get(key)?.();
    this.handles.set(key, handle);
    this.liveStatusSignatures.set(key, this.liveStatusSignature(handle));
    this.unsubscribeStatus.set(
      key,
      handle.onStatusUpdate(() => {
        const signature = this.liveStatusSignature(handle);
        if (this.liveStatusSignatures.get(key) === signature) return;
        this.liveStatusSignatures.set(key, signature);
        void this.scheduleSync(handle);
      }),
    );
    // BotManager awaits this initial bounded, fail-open sync before
    // handle.start(), ensuring FleetCraft has completed the whitelist
    // write/reload before Mineflayer attempts its first connection.
    return this.scheduleSync(handle, true);
  }

  private detach(name: string, handle: WorkerHandle): void {
    const key = name.toLowerCase();
    this.removedHandles.add(handle);
    if (this.handles.get(key) === handle) {
      this.handles.delete(key);
      this.liveStatusSignatures.delete(key);
      this.unsubscribeStatus.get(key)?.();
      this.unsubscribeStatus.delete(key);
    }
    this.published.delete(key);
    this.registered.delete(key);
    this.pendingDeletions.set(key, name);
    this.persistPendingDeletions();
    void this.scheduleDeletion(name);
  }

  private scheduleDeletion(name: string): Promise<void> {
    const key = name.toLowerCase();
    return this.enqueue(name, async () => {
      if (!this.pendingDeletions.has(key)) return;
      if (await this.transport.deregisterBot(name)) {
        this.pendingDeletions.delete(key);
        this.persistPendingDeletions();
      }
    });
  }

  private loadPendingDeletions(): void {
    if (!fs.existsSync(this.pendingDeletionsPath)) return;
    try {
      const parsed = JSON.parse(fs.readFileSync(this.pendingDeletionsPath, 'utf8')) as unknown;
      if (
        !Array.isArray(parsed)
        || parsed.some((name) => typeof name !== 'string' || !/^[A-Za-z0-9_]{3,16}$/.test(name))
      ) {
        throw new Error('expected an array of Minecraft usernames');
      }
      for (const name of parsed) this.pendingDeletions.set(name.toLowerCase(), name);
    } catch (err) {
      // A bad tombstone file must never block bot startup. Leave it untouched
      // for diagnosis; the next legitimate queue mutation atomically replaces
      // it with the current in-memory username-only list.
      logger.warn(
        { path: this.pendingDeletionsPath, err: (err as Error).message },
        'FleetCraft pending-deletion file is corrupt; ignoring it',
      );
    }
  }

  private persistPendingDeletions(): void {
    try {
      atomicWriteJsonSync(
        this.pendingDeletionsPath,
        [...this.pendingDeletions.values()].sort((a, b) => a.localeCompare(b)),
      );
    } catch (err) {
      logger.warn(
        { path: this.pendingDeletionsPath, err: (err as Error).message },
        'FleetCraft pending-deletion persistence failed; continuing in memory',
      );
    }
  }

  private scheduleSync(handle: WorkerHandle, force = false): Promise<void> {
    if (this.stopped || this.handles.get(handle.botName.toLowerCase()) !== handle) {
      return Promise.resolve();
    }
    return this.enqueue(handle.botName, () => this.sync(handle, force));
  }

  private async sync(handle: WorkerHandle, force: boolean): Promise<void> {
    const key = handle.botName.toLowerCase();
    if (this.stopped || this.handles.get(key) !== handle) return;

    const state = this.buildState(handle);
    const signature = JSON.stringify(state);
    const now = Date.now();
    const previous = this.published.get(key);
    if (
      !force
      && previous?.signature === signature
      && now - previous.attemptedAt < this.transport.heartbeatIntervalMs
    ) {
      return;
    }
    this.published.set(key, {
      signature,
      attemptedAt: now,
      succeededAt: previous?.succeededAt ?? 0,
    });

    if (!this.registered.has(key)) {
      const registered = await this.transport.registerBot(handle.botName);
      if (!registered) return;
      this.registered.add(key);
    }
    if (this.stopped || this.handles.get(key) !== handle) return;

    if (await this.transport.updateBotState(handle.botName, state)) {
      this.published.set(key, { signature, attemptedAt: now, succeededAt: Date.now() });
    } else {
      // FleetCraft's registry is process-local. A sidecar restart makes PUT
      // return 404 even though this process previously registered the bot.
      // Treat any failed update as loss of registration so the next bounded
      // sync repairs POST -> PUT ordering automatically.
      this.registered.delete(key);
    }
  }

  private buildState(handle: WorkerHandle, overrideState?: BotState): FleetCraftStateUpdate {
    const basic = handle.getCachedStatus() ?? {};
    const detailed = handle.getCachedDetailedStatus() ?? {};
    const rawState = overrideState ?? detailed.state ?? basic.state ?? BotState.SPAWNING;
    const botState = typeof rawState === 'string' && BOT_STATES.has(rawState)
      ? rawState as BotState
      : BotState.DISCONNECTED;
    const currentTask = detailed.voyager?.currentTask;
    const activity = typeof currentTask === 'string' && currentTask.trim()
      ? currentTask.trim().slice(0, 200)
      : null;
    const observed = this.observedRoleForBot(handle.botName);
    const observedRole = TOWN_ROLE_SET.has(observed) ? observed as TownRole : 'idle';

    return {
      botState,
      townRole: this.botManager.getTownRoleForBot(handle.botName),
      observedRole,
      activity,
    };
  }

  /** Signature only fields that can change inside the worker heartbeat. */
  private liveStatusSignature(handle: WorkerHandle): string {
    const basic = handle.getCachedStatus() ?? {};
    const detailed = handle.getCachedDetailedStatus() ?? {};
    return JSON.stringify({
      state: detailed.state ?? basic.state ?? BotState.SPAWNING,
      currentTask: detailed.voyager?.currentTask ?? null,
    });
  }

  private enqueue(name: string, operation: () => Promise<void>): Promise<void> {
    const key = name.toLowerCase();
    const previous = this.queues.get(key);
    // Run an unqueued first operation immediately. The spawn hook returns this
    // same promise so BotManager can await its bounded registration/state sync
    // before opening the Minecraft connection.
    const next = (previous
      ? previous.catch(() => undefined).then(operation)
      : operation())
      .catch((err) => {
        // The transport itself is fail-open; this protects lifecycle code from
        // future adapter errors too.
        logger.warn(
          { bot: name, err: (err as Error).message },
          'FleetCraft bridge operation failed; bot operation continues',
        );
      });
    this.queues.set(key, next);
    void next.finally(() => {
      if (this.queues.get(key) === next) this.queues.delete(key);
    });
    return next;
  }
}
