import { Worker } from 'worker_threads';
import path from 'path';
import { IPCChannel } from './IPCChannel';
import { LLMClient } from '../ai/LLMClient';
import { AffinityManager } from '../personality/AffinityManager';
import { ConversationManager } from '../personality/ConversationManager';
import { BlackboardManager } from '../voyager/BlackboardManager';
import { SharedWorldModel } from '../voyager/SharedWorldModel';
import { DifficultyBalancer } from '../voyager/DifficultyBalancer';
import { PlayerIntentModel } from '../voyager/PlayerIntentModel';
import { TraceRecord, TraceType } from '../voyager/DecisionTrace';
import type { TownRule } from '../town/RuleStore';
import type { CultureManager } from '../social/CultureManager';
import type { BotComms } from '../social/BotComms';
import { logger } from '../util/logger';

/**
 * Per-worker V8 old-generation heap cap, in MB.
 *
 * Why this exists: `new Worker()` was previously constructed with NO
 * `resourceLimits`, so every bot worker inherited the process-wide V8 default —
 * a ~2 GB heap ceiling on this host. Five bots each believing they may grow to
 * 2 GB oversubscribes a 7 GB box by more than 3x, and on 2026-07-24 three
 * workers died inside two minutes with:
 *
 *     Worker terminated due to reaching memory limit: JS heap out of memory
 *
 * (Scout twice, Architect once.) Those crashes are also what makes the fleet
 * *look* like it is leaking VoyagerLoops: each crash restarts the worker with a
 * fresh BotInstance, so the teardown guard in `startVoyagerIfCodegen` sees a
 * null loop and logs another "Voyager loop started" with no matching "stopped".
 * The loops are not leaking — the threads are dying.
 *
 * Why 512: measured steady state is ~200 MB per worker (process RSS ~1.0 GB
 * across five workers while the main thread's own heap is only ~37 MB, so
 * essentially all of it is worker heap). 512 MB is ~2.5x that — generous room
 * for the join-time spike when a bot loads chunks and its own copy of the
 * minecraft-data registry, while keeping 5 x 512 MB + main well inside 7 GB.
 *
 * The honest caveat: a worker that genuinely needs more than 512 MB will now be
 * killed *sooner* than before. That is the intended trade — an explicit,
 * contained, restartable single-worker failure beats an unpredictable one that
 * can drag the whole box toward swap. But note the crashing worker reached
 * ~2 GB, a 10x spike over steady state, which looks like a runaway allocation
 * rather than normal chunk loading — capping bounds the blast radius, it does
 * not explain the spike. Finding that cause is separate follow-up work.
 *
 * Override with MC_WORKER_HEAP_MB when tuning or after adding RAM.
 */
const WORKER_HEAP_MB = Math.max(
  128,
  Number(process.env.MC_WORKER_HEAP_MB) || 512,
);

export interface WorkerBotData {
  botName: string;
  personality: string;
  mode: string;
  spawnLocation?: { x: number; y: number; z: number };
  /**
   * Stable small integer slot assigned by BotManager at spawn time.
   * Used to derive a deterministic prismarine-viewer port (3100 + slot)
   * so the same bot keeps the same iframe URL across restarts.
   */
  workerSlotIndex: number;
}

/**
 * Lifecycle of the worker thread, used to gate IPC traffic so concurrent
 * sendRequest() calls during a crash window fail fast instead of timing out
 * after 60s against a dead postMessage target.
 *
 *   IDLE ───start()──▶ RUNNING ──worker exit──▶ DEAD ──maybeRestart()──▶ RESTARTING
 *                         │                                                   │
 *                         └──terminate()──▶ STOPPING ──exit──▶ DEAD            └──start()──▶ RUNNING
 *
 * Only RUNNING accepts new requests. Any other state rejects synchronously.
 */
export type WorkerState = 'IDLE' | 'RUNNING' | 'STOPPING' | 'DEAD' | 'RESTARTING';

/**
 * Worker events are only authoritative for the exact worker generation that
 * currently owns the handle. Kept as a pure helper so the stale-exit
 * regression can be tested without starting real Minecraft workers.
 */
export function isCurrentWorkerGeneration(
  activeGeneration: number,
  eventGeneration: number,
  activeWorker: Worker | null,
  eventWorker: Worker,
): boolean {
  return activeGeneration === eventGeneration && activeWorker === eventWorker;
}

/**
 * Age of the current generation's liveness signal.
 *
 * Before the first status heartbeat, the generation start time is the only
 * evidence available. Falling back to it prevents a worker that wedges during
 * startup from remaining RUNNING forever merely because it never emitted the
 * first heartbeat. Once a heartbeat arrives, its timestamp becomes the
 * authoritative baseline.
 */
export function getWorkerHeartbeatAgeMs(
  now: number,
  startedAt: number,
  lastStatusReceivedAt: number,
): number {
  const baseline = lastStatusReceivedAt > 0 ? lastStatusReceivedAt : startedAt;
  if (
    !Number.isFinite(now)
    || !Number.isFinite(baseline)
    || baseline <= 0
  ) {
    return 0;
  }
  return Math.max(0, now - baseline);
}

export class WorkerHandle {
  readonly botName: string;
  readonly personality: string;
  readonly mode: string;
  readonly spawnLocation?: { x: number; y: number; z: number };
  readonly workerSlotIndex: number;

  private worker: Worker | null = null;
  private ipc: IPCChannel | null = null;
  private intentionalShutdown = false;
  private crashCount = 0;
  private crashWindowStart = 0;
  private state: WorkerState = 'IDLE';
  /** Monotonic ownership token for worker/IPC callbacks. */
  private generation = 0;
  /** Wall-clock time the current generation started, used by watchdog grace. */
  private startedAt = 0;
  /** Coalesce concurrent watchdog/admin restart attempts into one replacement. */
  private forceRestartPromise: Promise<void> | null = null;
  /** Cancel a scheduled crash restart when the handle is intentionally stopped. */
  private restartTimer: NodeJS.Timeout | null = null;

  // Cached state pushed by the worker
  lastStatus: any = null;
  lastDetailedStatus: any = null;
  lastDiagnostics: any = null;
  /** Wall-clock of the most recent status.update received from the worker. The
   *  worker force-posts a heartbeat every <=30s (STATUS_HEARTBEAT_MS), so a gap
   *  much larger than that means the worker event loop is wedged (blocked by a
   *  runaway codegen/LLM loop) and cannot process a 'reconnect' IPC — the main
   *  thread must terminate+restart it. 0 until the first heartbeat arrives. */
  lastStatusReceivedAt = 0;

  // Decision trace buffer (forwarded from worker)
  private traceBuffer: TraceRecord[] = [];
  private traceMaxSize = 500;
  private onTrace?: (record: TraceRecord) => void;
  private onReputationEvent?: (event: any) => void;
  private onDeath?: (event: { botName: string; position: { x: number; y: number; z: number } | null }) => void;
  private onPlayerJoined?: (playerName: string) => void;
  private onPlayerLeft?: (playerName: string) => void;
  private onImpersonation?: (info: { botName: string; reason: string; signal: string }) => void;

  // Shared managers for IPC routing
  private llmClient: LLMClient | null;
  private affinityManager: AffinityManager;
  private conversationManager: ConversationManager;
  private blackboardManager: BlackboardManager;
  private sharedWorldModel: SharedWorldModel;
  private difficultyBalancer: DifficultyBalancer | null;
  private playerIntentModel: PlayerIntentModel | null;
  private onSwarmDirective: (description: string, requestedBy: string) => void;
  /**
   * Optional resolver for a bot's town role. Wired by BotManager from the
   * TownManager. Returns the bot's currentRole or null when the bot isn't
   * a town resident. WorkerHandle caches the lookup for 60s to keep the
   * hot Voyager-claim path (~1 IPC per claim) cheap. Followup #40.
   */
  private resolveBotRole: ((botName: string) => string | null) | null = null;
  private botRoleCache: { value: string | null; expiresAt: number } | null = null;
  private static readonly ROLE_CACHE_TTL_MS = 60_000;
  /**
   * Project Sid P2-B — resolver for a bot's ACTIVE town rules. Wired by
   * BotManager from the RuleStore/TownManager; returns [] when the bot isn't
   * a resident OR `config.governance.enabled` is off. Cached for 60s (same as
   * the role cache) to keep the resident task-proposal path cheap.
   */
  private resolveActiveRules: ((botName: string) => TownRule[]) | null = null;
  private activeRulesCache: { value: TownRule[]; expiresAt: number } | null = null;
  private static readonly RULES_CACHE_TTL_MS = 60_000;
  /**
   * Project Sid P3-B — the cross-worker cultural-meme registry (owned by the
   * main thread) and a resolver for this bot's town id (for per-town adoption
   * tracking). Both wired by BotManager. Routed to the worker's CultureProxy
   * over IPC. Null in headless/test instantiations; the town id is cached for
   * 60s like the role/rules caches.
   */
  private cultureManager: CultureManager | null = null;
  private resolveTownId: ((botName: string) => string) | null = null;
  private townIdCache: { value: string; expiresAt: number } | null = null;
  private static readonly TOWN_CACHE_TTL_MS = 60_000;
  /**
   * Project Sid P3 (SHOULD-FIX #1) — the AUTHORITATIVE cross-worker inter-bot
   * message relay (owned by the main thread, like cultureManager). Routed to
   * the worker's BotCommsProxy over IPC so a broadcast/sendMessage from one
   * bot's worker actually lands in OTHER bots' worker inboxes. Null in
   * headless/test instantiations AND whenever both `social.botAffinity` and
   * `social.culture` are off (the worker never builds a BotCommsProxy then, so
   * none of these IPC types are ever sent — flag-off behavior is byte-identical).
   */
  private botComms: BotComms | null = null;

  constructor(
    data: WorkerBotData,
    llmClient: LLMClient | null,
    affinityManager: AffinityManager,
    conversationManager: ConversationManager,
    blackboardManager: BlackboardManager,
    sharedWorldModel: SharedWorldModel,
    onSwarmDirective: (description: string, requestedBy: string) => void,
    difficultyBalancer: DifficultyBalancer | null = null,
    playerIntentModel: PlayerIntentModel | null = null,
    resolveBotRole: ((botName: string) => string | null) | null = null,
    resolveActiveRules: ((botName: string) => TownRule[]) | null = null,
    cultureManager: CultureManager | null = null,
    resolveTownId: ((botName: string) => string) | null = null,
    botComms: BotComms | null = null,
  ) {
    this.botName = data.botName;
    this.personality = data.personality;
    this.mode = data.mode;
    this.spawnLocation = data.spawnLocation;
    this.workerSlotIndex = data.workerSlotIndex;
    this.llmClient = llmClient;
    this.affinityManager = affinityManager;
    // NOTE: llmClient is hot-swappable via setLlmClient — /api/llm/reload
    // must reach live workers, not just the BotManager (2026-08 audit).
    this.conversationManager = conversationManager;
    this.blackboardManager = blackboardManager;
    this.sharedWorldModel = sharedWorldModel;
    this.difficultyBalancer = difficultyBalancer;
    this.playerIntentModel = playerIntentModel;
    this.onSwarmDirective = onSwarmDirective;
    this.resolveBotRole = resolveBotRole;
    this.resolveActiveRules = resolveActiveRules;
    this.cultureManager = cultureManager;
    this.resolveTownId = resolveTownId;
    this.botComms = botComms;

    // Provide a basic cached status while worker boots
    this.lastStatus = {
      name: data.botName,
      personality: data.personality,
      mode: data.mode,
      state: 'SPAWNING',
      position: data.spawnLocation || null,
    };
  }

  start(): void {
    if (this.worker) {
      logger.warn(
        { bot: this.botName, generation: this.generation, state: this.state },
        'Worker start skipped: an active generation already owns the handle',
      );
      return;
    }
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }

    const workerPath = path.join(__dirname, 'botWorker.js');
    const worker = new Worker(workerPath, {
      workerData: {
        botName: this.botName,
        personality: this.personality,
        mode: this.mode,
        spawnLocation: this.spawnLocation,
        workerSlotIndex: this.workerSlotIndex,
      },
      resourceLimits: {
        maxOldGenerationSizeMb: WORKER_HEAP_MB,
      },
    });
    const ipc = new IPCChannel(worker);
    const generation = ++this.generation;
    this.worker = worker;
    this.ipc = ipc;
    this.intentionalShutdown = false;
    this.startedAt = Date.now();
    this.lastStatusReceivedAt = 0;
    this.lastStatus = {
      name: this.botName,
      personality: this.personality,
      mode: this.mode,
      state: 'SPAWNING',
      position: this.spawnLocation || null,
    };
    this.lastDetailedStatus = null;
    this.lastDiagnostics = null;
    this.state = 'RUNNING';
    this.setupIPC(worker, ipc, generation);
    this.setupWorkerEvents(worker, ipc, generation);

    logger.info(
      { bot: this.botName, heapCapMb: WORKER_HEAP_MB, generation },
      'Worker thread started',
    );
  }

  private setupIPC(worker: Worker, ipc: IPCChannel, generation: number): void {
    // Handle requests from worker → main (LLM, blackboard, affinity, conversation)
    ipc.onRequest(async (type, args) => {
      if (!isCurrentWorkerGeneration(this.generation, generation, this.worker, worker)) {
        throw new Error(`Stale worker generation ${generation}`);
      }
      return this.routeRequest(type, args);
    });

    // Handle notifications from worker
    ipc.onNotify((type, data) => {
      if (!isCurrentWorkerGeneration(this.generation, generation, this.worker, worker)) return;
      this.routeNotification(type, data);
    });
  }

  private async routeRequest(type: string, args: any[]): Promise<any> {
    // LLM
    if (type === 'llm.chat') {
      if (!this.llmClient) throw new Error('No LLM client available');
      // args[3] = LLMCallOptions ({taskType, botName}) — forward it so per-task
      // routing/temperature in ModelRouter actually applies to fleet calls.
      return this.llmClient.chat(args[0], args[1], args[2], args[3]);
    }
    if (type === 'llm.generate') {
      if (!this.llmClient) throw new Error('No LLM client available');
      return this.llmClient.generate(args[0], args[1], args[2], args[3]);
    }
    if (type === 'llm.embed') {
      if (!this.llmClient?.embed) throw new Error('LLM client does not support embed');
      return this.llmClient.embed(args[0]);
    }

    // Blackboard
    if (type === 'blackboard.setSwarmGoal') return this.blackboardManager.setSwarmGoal(args[0], args[1], args[2]);
    if (type === 'blackboard.setBotGoal') return this.blackboardManager.setBotGoal(args[0], args[1]);
    if (type === 'blackboard.clearBotGoal') return this.blackboardManager.clearBotGoal(args[0]);
    if (type === 'blackboard.addTask') return this.blackboardManager.addTask(args[0], args[1], args[2]);
    if (type === 'blackboard.claimBestTask') return this.blackboardManager.claimBestTask(args[0], args[1], args[2], args[3], args[4]);
    if (type === 'blackboard.getBotRole') return this.getCachedBotRole(args[0]);
    if (type === 'town.getActiveRulesForBot') return this.getCachedActiveRules(args[0]);
    if (type === 'blackboard.getState') return this.blackboardManager.getState();
    if (type === 'blackboard.getRecentMessages') return this.blackboardManager.getRecentMessages(args[0]);
    if (type === 'blackboard.getSwarmGoal') return this.blackboardManager.getSwarmGoal();
    if (type === 'blackboard.claimReservation') return this.blackboardManager.claimReservation(args[0], args[1], args[2], args[3], args[4]);
    if (type === 'blackboard.hasReservation') return this.blackboardManager.hasReservation(args[0], args[1], args[2]);
    if (type === 'blackboard.releaseStale') return this.blackboardManager.releaseStale(args[0]);
    if (type === 'blackboard.getSwarmRelevantTasks') return this.blackboardManager.getSwarmRelevantTasks(args[0]);
    if (type === 'blackboard.getBlockedTaskDescriptions') return [...this.blackboardManager.getBlockedTaskDescriptions(args[0])];
    if (type === 'blackboard.getRecentMessagesForBot') return this.blackboardManager.getRecentMessagesForBot(args[0], args[1]);

    // Affinity
    if (type === 'affinity.get') return this.affinityManager.get(args[0], args[1]);
    if (type === 'affinity.isHostile') return this.affinityManager.isHostile(args[0], args[1]);
    if (type === 'affinity.getAllForBot') return this.affinityManager.getAllForBot(args[0]);
    if (type === 'affinity.getAll') return this.affinityManager.getAll();

    // Culture (Project Sid P3-B). Reads route to the main-thread registry so a
    // meme observed in any worker is visible here. Returns inert values when no
    // registry is wired (headless/test) so the worker degrades to a no-op.
    if (type === 'culture.matchMeme') return this.cultureManager ? this.cultureManager.matchMeme(args[0]) : null;
    if (type === 'culture.getAdoptedMemes') return this.cultureManager ? this.cultureManager.getAdoptedMemes(args[0]) : [];

    // Inter-bot message relay reads (Project Sid P3 SHOULD-FIX #1). Route to the
    // main-thread BotComms so a bot drains the SAME inbox every other worker
    // delivered into. Inert ([] ) when no relay is wired (headless/test), so the
    // worker's drain degrades to a clean no-op.
    if (type === 'botComms.getUnread') return this.botComms ? this.botComms.getUnread(args[0]) : [];
    if (type === 'botComms.getKnownBots') return this.botComms ? this.botComms.getKnownBots() : [];

    // Conversation
    if (type === 'conversation.getHistory') return this.conversationManager.getHistory(args[0], args[1]);
    if (type === 'conversation.buildContentsArray') return this.conversationManager.buildContentsArray(args[0], args[1], args[2]);
    if (type === 'conversation.getAllConversations') return this.conversationManager.getAllConversations(args[0]);

    // DifficultyBalancer
    if (type === 'difficulty.getBotBehaviorModifiers') {
      if (!this.difficultyBalancer) {
        // Sensible neutral defaults if no balancer is wired in this deployment.
        return { taskCooldownMultiplier: 1.0, preferredTaskTypes: [], chatProbability: 0.4, helpRadius: 32 };
      }
      return this.difficultyBalancer.getBotBehaviorModifiers();
    }

    // PlayerIntentModel
    if (type === 'playerIntent.predictIntent') {
      if (!this.playerIntentModel) {
        return { intent: 'unknown', confidence: 0, evidence: [], suggestedBotResponse: '' };
      }
      return this.playerIntentModel.predictIntent(args[0]);
    }

    throw new Error(`Unknown IPC request type: ${type}`);
  }

  private routeNotification(type: string, data: any): void {
    // Status updates from worker
    if (type === 'status.update') {
      this.lastStatusReceivedAt = Date.now();
      this.lastStatus = data.status;
      this.lastDetailedStatus = data.detailedStatus;
      this.lastDiagnostics = data.diagnostics;
      return;
    }

    // Swarm directive forwarding
    if (type === 'swarm.directive') {
      this.onSwarmDirective(data.description, data.requestedBy);
      return;
    }

    // Reputation event forwarding from worker
    if (type === 'reputation.recordEvent') {
      if (this.onReputationEvent) {
        try { this.onReputationEvent(data); }
        catch (err: any) { logger.error({ bot: this.botName, err: err.message }, 'Reputation event handler error'); }
      } else {
        logger.debug({ bot: this.botName }, 'Reputation event received but no listener set');
      }
      return;
    }

    // Bot death forwarding from worker
    if (type === 'bot.died') {
      if (this.onDeath) {
        try { this.onDeath(data); }
        catch (err: any) { logger.error({ bot: this.botName, err: err.message }, 'Death event handler error'); }
      }
      return;
    }

    // Impersonation (duplicate-login kick) forwarding from worker.
    if (type === 'security.impersonation') {
      if (this.onImpersonation) {
        try { this.onImpersonation(data); }
        catch (err: any) { logger.error({ bot: this.botName, err: err.message }, 'Impersonation event handler error'); }
      }
      return;
    }

    // Player join/leave forwarding from worker (one event per bot that saw it;
    // BotManager dedupes across the fleet and filters out our own bot names).
    if (type === 'player.joined') {
      if (this.onPlayerJoined && data?.playerName) {
        try { this.onPlayerJoined(data.playerName); }
        catch (err: any) { logger.error({ bot: this.botName, err: err.message }, 'PlayerJoined handler error'); }
      }
      return;
    }
    if (type === 'player.left') {
      if (this.onPlayerLeft && data?.playerName) {
        try { this.onPlayerLeft(data.playerName); }
        catch (err: any) { logger.error({ bot: this.botName, err: err.message }, 'PlayerLeft handler error'); }
      }
      return;
    }

    // Decision trace forwarding from worker
    if (type === 'decision.trace') {
      const record = data as TraceRecord;
      this.traceBuffer.push(record);
      if (this.traceBuffer.length > this.traceMaxSize) {
        this.traceBuffer.shift();
      }
      this.onTrace?.(record);
      return;
    }

    // Fire-and-forget blackboard operations
    if (type === 'blackboard.completeTask') { this.blackboardManager.completeTask(data[0], data[1]); return; }
    if (type === 'blackboard.blockTask') { this.blackboardManager.blockTask(data[0], data[1], data[2]); return; }
    if (type === 'blackboard.postMessage') { this.blackboardManager.postMessage(data[0], data[1], data[2]); return; }
    if (type === 'blackboard.releaseReservationsForBot') { this.blackboardManager.releaseReservationsForBot(data[0], data[1]); return; }

    // Fire-and-forget affinity operations
    if (type === 'affinity.onPositiveChat') { this.affinityManager.onPositiveChat(data[0], data[1]); return; }
    if (type === 'affinity.onNegativeSentiment') { this.affinityManager.onNegativeSentiment(data[0], data[1]); return; }
    if (type === 'affinity.onHit') { this.affinityManager.onHit(data[0], data[1]); return; }
    if (type === 'affinity.onGift') { this.affinityManager.onGift(data[0], data[1]); return; }
    if (type === 'affinity.clearBot') { this.affinityManager.clearBot(data[0]); return; }

    // Fire-and-forget culture operations (Project Sid P3-B). Swallowed when no
    // registry is wired, so a worker built with the flag off (no CultureProxy)
    // never reaches here anyway.
    if (type === 'culture.adopt') {
      // Tag the adoption with the bot's town (resolved + cached main-side) so
      // GET /api/culture can mirror Sid's per-town meme curves. The worker
      // passes '' since it doesn't know its town; we fill it in here.
      const townId = data[2] || this.getCachedTownId(data[1]);
      this.cultureManager?.adopt(data[0], data[1], townId);
      return;
    }
    if (type === 'culture.observeChat') { this.cultureManager?.observeChat(data[0]); return; }
    if (type === 'culture.addMeme') { this.cultureManager?.addMeme(data[0], data[1], data[2]); return; }

    // Fire-and-forget inter-bot message relay writes (Project Sid P3 SHOULD-FIX
    // #1). Fan-out happens main-side: a broadcast lands in every OTHER bot's
    // inbox; a direct send lands only in the named recipient's inbox. Swallowed
    // when no relay is wired — and a worker built with both social flags off
    // never builds a BotCommsProxy, so it never reaches here at all.
    if (type === 'botComms.sendMessage') { this.botComms?.sendMessage(data[0], data[1], data[2], data[3]); return; }
    if (type === 'botComms.broadcast') { this.botComms?.broadcast(data[0], data[1], data[2]); return; }
    if (type === 'botComms.registerBot') { this.botComms?.registerBot(data[0]); return; }
    if (type === 'botComms.unregisterBot') { this.botComms?.unregisterBot(data[0]); return; }

    // Fire-and-forget conversation operations
    if (type === 'conversation.addPlayerMessage') { this.conversationManager.addPlayerMessage(data[0], data[1], data[2]); return; }
    if (type === 'conversation.addBotResponse') { this.conversationManager.addBotResponse(data[0], data[1], data[2]); return; }
    if (type === 'conversation.clearBot') { this.conversationManager.clearBot(data[0]); return; }

    // Fire-and-forget SharedWorldModel updates
    if (type === 'sharedWorld.reportResource') { this.sharedWorldModel.reportResource(data[0], data[1]); return; }
    if (type === 'sharedWorld.reportThreat') { this.sharedWorldModel.reportThreat(data[0], data[1]); return; }
    if (type === 'sharedWorld.updateBotState') { this.sharedWorldModel.updateBotState(data[0]); return; }
    if (type === 'sharedWorld.markChunkExplored') { this.sharedWorldModel.markChunkExplored(data[0], data[1]); return; }
    if (type === 'sharedWorld.updateServerState') { this.sharedWorldModel.updateServerState(data[0], data[1]); return; }
  }

  private setupWorkerEvents(worker: Worker, ipc: IPCChannel, generation: number): void {
    worker.on('error', (err) => {
      logger.error(
        { bot: this.botName, err: err.message, generation },
        'Worker thread error',
      );
    });

    worker.on('exit', (code) => {
      const current = isCurrentWorkerGeneration(
        this.generation,
        generation,
        this.worker,
        worker,
      );
      logger.info(
        {
          bot: this.botName,
          code,
          generation,
          current,
          intentional: this.intentionalShutdown,
        },
        'Worker thread exited',
      );
      // Always retire the channel owned by the exiting generation. Never use
      // this.ipc here: it may already belong to a replacement worker.
      ipc.destroy();
      if (!current) return;

      // Flip to DEAD before destroying IPC so any concurrent sendRequest()
      // that races between the worker dying and us seeing the exit event
      // will reject through the gate rather than posting to a dead port.
      this.state = 'DEAD';
      this.ipc = null;
      this.worker = null;

      if (!this.intentionalShutdown) {
        this.maybeRestart(generation);
      }
    });
  }

  private maybeRestart(exitedGeneration: number): void {
    if (this.generation !== exitedGeneration || this.worker) return;
    const now = Date.now();
    if (now - this.crashWindowStart > 60000) {
      this.crashCount = 0;
      this.crashWindowStart = now;
    }
    this.crashCount++;

    if (this.crashCount > 3) {
      logger.error({ bot: this.botName, crashes: this.crashCount }, 'Worker crashed too many times, not restarting');
      this.lastStatus = { ...this.lastStatus, state: 'DISCONNECTED' };
      // Leave state as DEAD so further requests fail fast — there is no
      // worker coming back to service them.
      return;
    }

    // Mark RESTARTING during the cooldown window so sendRequest() still
    // rejects fast instead of timing out while we wait for the restart.
    this.state = 'RESTARTING';
    const delay = 5000 * this.crashCount;
    logger.warn({ bot: this.botName, crashCount: this.crashCount, delayMs: delay }, 'Scheduling worker restart');
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null;
      if (
        !this.intentionalShutdown
        && !this.worker
        && this.generation === exitedGeneration
      ) {
        this.start();
      }
    }, delay);
  }

  /**
   * Followup #40 — resolve the bot's town role with a 60s in-memory cache.
   * Called from the worker's claimBestTask path, so this runs on every
   * Voyager tick when a task is up for grabs. Without the cache that
   * would be one TownManager DB query per claim — cheap individually but
   * pointlessly noisy.
   *
   * Returns null when the resolver isn't wired or the bot isn't a town
   * resident; callers (BlackboardManager.scoreTaskEnhanced) treat null
   * as "no role boost" and behave exactly like before.
   */
  private getCachedBotRole(botName: string): string | null {
    const target = botName ?? this.botName;
    // Cache is keyed implicitly by `this.botName` — a WorkerHandle is per-bot.
    // If a caller ever passes a different name, fall through to the resolver
    // without caching to avoid surprising cross-bot results.
    if (target === this.botName) {
      const now = Date.now();
      if (this.botRoleCache && this.botRoleCache.expiresAt > now) {
        return this.botRoleCache.value;
      }
      let value: string | null = null;
      if (this.resolveBotRole) {
        try { value = this.resolveBotRole(target); } catch { value = null; }
      }
      this.botRoleCache = { value, expiresAt: now + WorkerHandle.ROLE_CACHE_TTL_MS };
      return value;
    }
    if (!this.resolveBotRole) return null;
    try { return this.resolveBotRole(target); } catch { return null; }
  }

  /**
   * Project Sid P2-B — resolve this bot's active town rules, cached for 60s.
   * Mirrors getCachedBotRole: the cache is keyed implicitly by this.botName
   * (one WorkerHandle per bot). Returns [] when no resolver is wired or the
   * resolver throws, so a missing/disabled governance flag is a clean no-op.
   */
  private getCachedActiveRules(botName: string): TownRule[] {
    const target = botName ?? this.botName;
    if (target === this.botName) {
      const now = Date.now();
      if (this.activeRulesCache && this.activeRulesCache.expiresAt > now) {
        return this.activeRulesCache.value;
      }
      let value: TownRule[] = [];
      if (this.resolveActiveRules) {
        try { value = this.resolveActiveRules(target) ?? []; } catch { value = []; }
      }
      this.activeRulesCache = { value, expiresAt: now + WorkerHandle.RULES_CACHE_TTL_MS };
      return value;
    }
    if (!this.resolveActiveRules) return [];
    try { return this.resolveActiveRules(target) ?? []; } catch { return []; }
  }

  /**
   * Project Sid P3-B — resolve this bot's town id, cached for 60s. Mirrors the
   * role/rules caches. Returns '' when no resolver is wired or it throws, so
   * adoptions are simply left untagged (counted under '(unaffiliated)').
   */
  private getCachedTownId(botName: string): string {
    const target = botName ?? this.botName;
    if (target === this.botName) {
      const now = Date.now();
      if (this.townIdCache && this.townIdCache.expiresAt > now) {
        return this.townIdCache.value;
      }
      let value = '';
      if (this.resolveTownId) {
        try { value = this.resolveTownId(target) ?? ''; } catch { value = ''; }
      }
      this.townIdCache = { value, expiresAt: now + WorkerHandle.TOWN_CACHE_TTL_MS };
      return value;
    }
    if (!this.resolveTownId) return '';
    try { return this.resolveTownId(target) ?? ''; } catch { return ''; }
  }

  /** Send a command to the worker */
  sendCommand(type: string, data: any = {}): void {
    this.ipc?.command(type, data);
  }

  /**
   * Fire-and-forget runtime config patch propagation.
   *
   * The main thread's PATCH /api/config/:section handler has already validated
   * and persisted the new values; this just nudges each live worker so its
   * captured `this.config[section]` picks up the change without a restart.
   *
   * Safe to call when the worker is dead or disconnected: a missing IPC
   * channel logs a debug message and returns rather than throwing, so the
   * PATCH handler can broadcast indiscriminately across `getAllWorkers()`.
   */
  /**
   * Hot-swap the LLM client this handle routes worker `llm.*` IPC through.
   * Without this, /api/llm/reload swapped the BotManager's reference while
   * every live worker kept calling the OLD router (old providers, old keys)
   * until process restart — removing a provider to stop its spend "succeeded"
   * without stopping anything (2026-08 audit).
   */
  setLlmClient(client: LLMClient | null): void {
    this.llmClient = client;
  }

  postConfigPatch(section: string, values: Record<string, unknown>): void {
    if (!this.ipc || !this.worker) {
      logger.debug(
        { bot: this.botName, section },
        'postConfigPatch skipped: worker not running',
      );
      return;
    }
    try {
      this.ipc.command('config:patch', { section, values });
    } catch (err: any) {
      logger.warn(
        { bot: this.botName, section, err: err?.message },
        'postConfigPatch failed to dispatch',
      );
    }
  }

  /**
   * Send a request to the worker and await response.
   *
   * Gated on `state === 'RUNNING'`: during the (potentially multi-second)
   * window between worker exit and the next worker becoming ready, we reject
   * synchronously so callers don't accumulate 60s-timeout promises against a
   * dead postMessage target. Callers that want to tolerate a restart should
   * retry on this error after `isAlive()` flips back to true.
   */
  async sendRequest(type: string, args: any[] = []): Promise<any> {
    if (this.state !== 'RUNNING' || !this.ipc) {
      throw new Error(`Worker not running (state=${this.state}, request='${type}')`);
    }
    return this.ipc.request(type, args);
  }

  /** Current lifecycle state — exposed primarily for diagnostics/testing. */
  getState(): WorkerState {
    return this.state;
  }

  /** Start time for the current generation; 0 before the first start. */
  getStartedAt(): number {
    return this.startedAt;
  }

  // ── Build coordinator helpers (forward to worker via IPC) ──

  /** Send a chat / command message through the bot. */
  chat(message: string): void {
    this.sendCommand('chat', { message });
  }

  /** Set the bot's high-level state (e.g. BUILDING, IDLE). */
  setBotState(state: string): void {
    this.sendCommand('setBotState', { state });
  }

  /** Clear an impersonation quarantine and reconnect the bot. */
  releaseQuarantine(): void {
    this.sendCommand('releaseQuarantine', {});
  }

  pauseVoyager(reason?: string): void {
    this.sendCommand('pauseVoyager', { reason });
  }

  resumeVoyager(): void {
    this.sendCommand('resumeVoyager', {});
  }

  stopMovement(): void {
    this.sendCommand('stopMovement', {});
  }

  /**
   * Queue a player task onto the worker's VoyagerLoop. Fire-and-forget command
   * (the worker is the source of truth for the in-thread VoyagerLoop). Used by
   * the supply-chain coordinator, which cannot reach the loop directly across
   * the worker-thread boundary.
   */
  queueTask(description: string, source: string): void {
    this.sendCommand('queueTask', { description, source });
  }

  /**
   * Read the worker's VoyagerLoop task state (current/completed/failed/queued
   * task descriptions) over IPC. Returns null when the worker isn't running or
   * the bot isn't in codegen mode (no VoyagerLoop). Never throws — a restart
   * window resolves to null so callers just skip and retry next tick.
   */
  async getVoyagerTaskState(): Promise<{
    currentTask: string | null;
    completedTasks: string[];
    failedTasks: string[];
    queuedTasks: string[];
  } | null> {
    try {
      return await this.sendRequest('voyagerTaskState');
    } catch {
      return null;
    }
  }

  /** Returns true if the worker thinks the underlying mineflayer bot is connected and spawned. */
  async isBotConnected(): Promise<boolean> {
    if (!this.ipc) return false;
    try {
      return await this.sendRequest('isBotConnected', []);
    } catch {
      return false;
    }
  }

  async getBotVersion(): Promise<string | null> {
    if (!this.ipc) return null;
    try {
      return await this.sendRequest('getBotVersion', []);
    } catch {
      return null;
    }
  }

  /**
   * Get the prismarine-viewer HTTP port for this bot. The worker lazy-mounts
   * the viewer on first request — the WebGL/Express cost is only paid when
   * someone actually opens the View tab.
   *
   * Returns null if the bot isn't connected yet, the viewer failed to start
   * (e.g. native canvas/three dep issue), or the worker isn't running.
   */
  async getViewerPort(): Promise<number | null> {
    if (!this.ipc) return null;
    try {
      const port = await this.sendRequest('getViewerPort', []);
      return typeof port === 'number' ? port : null;
    } catch {
      return null;
    }
  }

  async getTerrainGrid(
    cx: number, cz: number, radius: number, step: number,
    yTop = 120, yBottom = -60,
  ): Promise<string[] | null> {
    if (!this.ipc) return null;
    try {
      return await this.sendRequest('getTerrainGrid', [cx, cz, radius, step, yTop, yBottom]);
    } catch {
      return null;
    }
  }

  async getPlayers(): Promise<Array<{ name: string; position: { x: number; y: number; z: number } | null; isOnline: boolean }>> {
    if (!this.ipc) return [];
    try {
      return await this.sendRequest('getPlayers', []);
    } catch {
      return [];
    }
  }

  async getBlockAt(x: number, y: number, z: number): Promise<{ name: string } | null> {
    if (!this.ipc) return null;
    try {
      return await this.sendRequest('getBlockAt', [x, y, z]);
    } catch {
      return null;
    }
  }

  getCachedStatus(): any {
    return this.lastStatus;
  }

  getCachedDetailedStatus(): any {
    return this.lastDetailedStatus;
  }

  getCachedDiagnostics(): any {
    return this.lastDiagnostics;
  }

  /** Get recent decision traces, optionally filtered by type. Newest first. */
  getDecisionTraces(limit = 50, type?: TraceType): TraceRecord[] {
    let records = this.traceBuffer;
    if (type) {
      records = records.filter((r) => r.type === type);
    }
    return records.slice(-limit).reverse();
  }

  /** Register a callback for real-time trace events (used by Socket.IO). */
  setTraceListener(fn: (record: TraceRecord) => void): void {
    this.onTrace = fn;
  }

  /** Register a callback for reputation events from the worker. */
  setReputationListener(fn: (event: any) => void): void {
    this.onReputationEvent = fn;
  }

  /** Register a callback for death events from the worker. */
  setDeathListener(fn: (event: { botName: string; position: { x: number; y: number; z: number } | null }) => void): void {
    this.onDeath = fn;
  }

  /** Register a callback for impersonation (duplicate-login) events from the worker. */
  setImpersonationListener(fn: (info: { botName: string; reason: string; signal: string }) => void): void {
    this.onImpersonation = fn;
  }

  /** Register callbacks for player join/leave events seen by this worker's bot. */
  setPlayerPresenceListeners(
    onJoin: (playerName: string) => void,
    onLeave: (playerName: string) => void,
  ): void {
    this.onPlayerJoined = onJoin;
    this.onPlayerLeft = onLeave;
  }

  isAlive(): boolean {
    return this.worker !== null;
  }

  /** Forcibly terminate a wedged worker and start a fresh one. Used by the
   *  main-thread watchdog when a worker stops emitting heartbeats (event loop
   *  blocked) — sendCommand('reconnect') can't help because the wedged loop
   *  can't process it. terminate() escalates to worker.terminate() after a 5s
   *  grace period, which kills even a fully blocked worker. */
  async forceRestart(): Promise<void> {
    if (this.forceRestartPromise) return this.forceRestartPromise;
    const restart = (async () => {
      await this.terminate();
      // terminate() leaves us in DEAD with intentionalShutdown=true; reset so
      // exactly one fresh generation can come up.
      this.intentionalShutdown = false;
      this.crashCount = 0;
      this.lastStatusReceivedAt = 0;
      this.start();
    })();
    this.forceRestartPromise = restart;
    try {
      await restart;
    } finally {
      if (this.forceRestartPromise === restart) this.forceRestartPromise = null;
    }
  }

  async terminate(): Promise<void> {
    this.intentionalShutdown = true;
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    const worker = this.worker;
    const ipc = this.ipc;
    const generation = this.generation;
    if (worker) {
      // Mark STOPPING before posting the disconnect so any in-flight call
      // sites see a non-RUNNING state and bail out of sendRequest() early.
      this.state = 'STOPPING';
      ipc?.command('disconnect', {});
      // Wait for graceful exit, then force terminate
      await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          resolve();
        };
        const timeout = setTimeout(() => {
          void worker.terminate()
            .catch((err: any) => {
              logger.warn(
                { bot: this.botName, generation, err: err?.message },
                'Forced worker termination failed',
              );
            })
            .finally(finish);
        }, 5000);
        worker.once('exit', finish);
      });
    }
    // The exit handler normally performs this cleanup. Keep a same-generation
    // fallback for environments where terminate() resolves before 'exit'.
    if (
      this.generation === generation
      && (!this.worker || this.worker === worker)
    ) {
      this.state = 'DEAD';
      ipc?.destroy();
      if (this.ipc === ipc) this.ipc = null;
      if (this.worker === worker) this.worker = null;
    }
  }
}
