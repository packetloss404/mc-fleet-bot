import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BotState } from '../../src/bot/BotState';
import { BotManager } from '../../src/bot/BotManager';
import { WorkerHandle } from '../../src/worker/WorkerHandle';
import { logger } from '../../src/util/logger';
import {
  FleetCraftBridge,
  FleetCraftClient,
  type FleetCraftStateUpdate,
  type FleetCraftTransport,
} from '../../src/integrations/FleetCraftClient';

const temporaryDirectories: string[] = [];

function makePendingDeletionsPath(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fleetcraft-bridge-'));
  temporaryDirectories.push(directory);
  return path.join(directory, 'pending-deletions.json');
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('FleetCraftClient', () => {
  it('is disabled unless both URL and API key are configured', () => {
    expect(FleetCraftClient.fromEnv({})).toBeNull();
    expect(FleetCraftClient.fromEnv({ FLEETCRAFT_URL: 'http://fleetcraft.test' })).toBeNull();
    expect(FleetCraftClient.fromEnv({ FLEETCRAFT_API_KEY: 'secret' })).toBeNull();
  });

  it('sends the thin controller contract with server-side authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ whitelistReloaded: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FleetCraftClient({
      baseUrl: 'http://fleetcraft.test/',
      apiKey: 'test-key',
    });
    const state: FleetCraftStateUpdate = {
      botState: BotState.EXECUTING_TASK,
      townRole: 'builder',
      observedRole: 'miner',
      activity: 'Repair the east gate',
    };

    await expect(client.registerBot('Bot One')).resolves.toBe(true);
    await expect(client.updateBotState('Bot One', state)).resolves.toBe(true);
    await expect(client.deregisterBot('Bot One')).resolves.toBe(true);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://fleetcraft.test/api/fleet/bots',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-Api-Key': 'test-key' }),
        body: JSON.stringify({ username: 'Bot One' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://fleetcraft.test/api/fleet/bots/Bot%20One/state',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify(state) }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://fleetcraft.test/api/fleet/bots/Bot%20One',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('fails open when FleetCraft cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const client = new FleetCraftClient({
      baseUrl: 'http://fleetcraft.test',
      apiKey: 'test-key',
    });

    await expect(client.registerBot('Builder')).resolves.toBe(false);
  });

  it('treats an already-absent deregistration as successful', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ removed: false, whitelistReloaded: true }),
    }));
    const client = new FleetCraftClient({
      baseUrl: 'http://fleetcraft.test',
      apiKey: 'test-key',
    });

    await expect(client.deregisterBot('Builder')).resolves.toBe(true);
  });

  it('rejects partial whitelist reloads and safely accepts idempotent retries', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ added: true, whitelistReloaded: false }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ added: false, whitelistReloaded: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ removed: true, whitelistReloaded: false }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ removed: false, whitelistReloaded: true }),
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FleetCraftClient({
      baseUrl: 'http://fleetcraft.test',
      apiKey: 'test-key',
    });

    await expect(client.registerBot('Builder')).resolves.toBe(false);
    await expect(client.registerBot('Builder')).resolves.toBe(true);
    await expect(client.deregisterBot('Builder')).resolves.toBe(false);
    await expect(client.deregisterBot('Builder')).resolves.toBe(true);
  });
});

describe('FleetCraftBridge', () => {
  function setup(
    includeExistingWorker = true,
    pendingDeletionsPath = makePendingDeletionsPath(),
  ) {
    let statusListener: (() => void) | null = null;
    let spawnListener: ((handle: any) => void) | null = null;
    let removalListener: ((name: string, worker: any) => void) | null = null;
    const basic: Record<string, unknown> = { state: BotState.IDLE };
    const detailed: Record<string, any> = {
      state: BotState.EXECUTING_TASK,
      voyager: { currentTask: 'Build the town hall roof' },
    };
    const handle = {
      botName: 'Architect',
      getCachedStatus: () => basic,
      getCachedDetailedStatus: () => detailed,
      onStatusUpdate: (listener: () => void) => {
        statusListener = listener;
        return () => { statusListener = null; };
      },
    };
    const manager = {
      getAllWorkers: () => includeExistingWorker ? [handle] : [],
      onBotSpawned: (listener: (worker: any) => void) => { spawnListener = listener; },
      onBotRemoved: (listener: (name: string, worker: any) => void) => {
        removalListener = listener;
      },
      getTownRoleForBot: () => 'builder',
    };
    const transport: FleetCraftTransport = {
      heartbeatIntervalMs: 30_000,
      registerBot: vi.fn().mockResolvedValue(true),
      updateBotState: vi.fn().mockResolvedValue(true),
      deregisterBot: vi.fn().mockResolvedValue(true),
    };
    const bridge = new FleetCraftBridge(
      transport,
      manager as any,
      () => 'miner',
      pendingDeletionsPath,
    );
    return {
      basic,
      bridge,
      detailed,
      handle,
      manager,
      pendingDeletionsPath,
      transport,
      fireStatus: () => statusListener?.(),
      fireSpawn: () => spawnListener?.(handle),
      fireRemoval: () => removalListener?.(handle.botName, handle),
    };
  }

  it('registers first and publishes only real worker, town, and observed-role state', async () => {
    const ctx = setup();
    ctx.bridge.start();

    // BotManager's spawn listener can return immediately and start Mineflayer,
    // but the outbound registration request has already been initiated.
    expect(ctx.transport.registerBot).toHaveBeenCalledWith('Architect');
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));
    expect(vi.mocked(ctx.transport.registerBot).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(ctx.transport.updateBotState).mock.invocationCallOrder[0],
    );
    expect(ctx.transport.updateBotState).toHaveBeenCalledWith('Architect', {
      botState: BotState.EXECUTING_TASK,
      townRole: 'builder',
      observedRole: 'miner',
      activity: 'Build the town hall roof',
    });

    await ctx.bridge.stop();
  });

  it('keeps the async spawn hook pending until initial registration and state sync finish', async () => {
    const ctx = setup(false);
    let releaseRegistration: ((success: boolean) => void) | null = null;
    vi.mocked(ctx.transport.registerBot).mockImplementation(() =>
      new Promise<boolean>((resolve) => { releaseRegistration = resolve; }));
    ctx.bridge.start();

    const spawnPromise = ctx.fireSpawn();
    expect(spawnPromise).toBeInstanceOf(Promise);
    let settled = false;
    void spawnPromise?.then(() => { settled = true; });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);
    expect(ctx.transport.updateBotState).not.toHaveBeenCalled();

    releaseRegistration?.(true);
    await spawnPromise;
    expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1);
    expect(settled).toBe(true);

    await ctx.bridge.stop();
  });

  it('reports SPAWNING before connect when the worker caches are empty', async () => {
    const ctx = setup(false);
    delete ctx.basic.state;
    delete ctx.detailed.state;
    delete ctx.detailed.voyager;
    ctx.bridge.start();

    await ctx.fireSpawn();

    expect(ctx.transport.updateBotState).toHaveBeenCalledWith(
      'Architect',
      expect.objectContaining({ botState: BotState.SPAWNING }),
    );
    await ctx.bridge.stop();
  });

  it('deduplicates unchanged status, but sends a changed state promptly', async () => {
    const ctx = setup();
    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));

    ctx.fireStatus();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1);

    ctx.detailed.state = BotState.IDLE;
    ctx.detailed.voyager.currentTask = null;
    ctx.fireStatus();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(2));
    expect(ctx.transport.updateBotState).toHaveBeenLastCalledWith(
      'Architect',
      expect.objectContaining({ botState: BotState.IDLE, activity: null }),
    );

    await ctx.bridge.stop();
  });

  it('deregisters an intentionally removed bot and does not publish after deletion', async () => {
    const ctx = setup();
    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));

    ctx.fireRemoval();
    await vi.waitFor(() => expect(ctx.transport.deregisterBot).toHaveBeenCalledWith('Architect'));
    ctx.fireStatus();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1);

    await ctx.bridge.stop();
  });

  it('retries and drains an intentional deletion without re-attaching the removed handle', async () => {
    const ctx = setup();
    let releaseFirstDelete: ((success: boolean) => void) | null = null;
    vi.mocked(ctx.transport.deregisterBot)
      .mockImplementationOnce(() =>
        new Promise<boolean>((resolve) => { releaseFirstDelete = resolve; }))
      .mockResolvedValueOnce(true);
    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));

    ctx.fireRemoval();
    await vi.waitFor(() => expect(ctx.transport.deregisterBot).toHaveBeenCalledTimes(1));

    // A stale callback for the exact removed handle is ignored even while the
    // bridge is still running and its DELETE is pending.
    await ctx.fireSpawn();
    expect(ctx.transport.registerBot).toHaveBeenCalledTimes(1);
    expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1);

    const stopPromise = ctx.bridge.stop();
    let stopSettled = false;
    void stopPromise.then(() => { stopSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(stopSettled).toBe(false);

    releaseFirstDelete?.(false);
    await stopPromise;
    expect(ctx.transport.deregisterBot).toHaveBeenCalledTimes(2);
    expect(stopSettled).toBe(true);
  });

  it('retries a deletion from durable storage after a fresh bridge startup', async () => {
    const first = setup();
    vi.mocked(first.transport.deregisterBot).mockResolvedValue(false);
    first.bridge.start();
    await vi.waitFor(() => expect(first.transport.updateBotState).toHaveBeenCalledTimes(1));

    first.fireRemoval();
    await vi.waitFor(() => expect(first.transport.deregisterBot).toHaveBeenCalledTimes(1));
    await first.bridge.stop();
    expect(first.transport.deregisterBot).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fs.readFileSync(first.pendingDeletionsPath, 'utf8'))).toEqual([
      'Architect',
    ]);

    const restarted = setup(false, first.pendingDeletionsPath);
    restarted.bridge.start();
    await vi.waitFor(() => expect(restarted.transport.deregisterBot).toHaveBeenCalledWith('Architect'));
    await vi.waitFor(() => {
      expect(JSON.parse(fs.readFileSync(first.pendingDeletionsPath, 'utf8'))).toEqual([]);
    });
    await restarted.bridge.stop();
  });

  it('ignores corrupt durable tombstones without blocking startup', async () => {
    const pendingDeletionsPath = makePendingDeletionsPath();
    fs.writeFileSync(pendingDeletionsPath, '{not-json', 'utf8');
    const ctx = setup(false, pendingDeletionsPath);
    const warn = vi.spyOn(logger, 'warn');

    expect(() => ctx.bridge.start()).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ path: pendingDeletionsPath }),
      'FleetCraft pending-deletion file is corrupt; ignoring it',
    );
    expect(ctx.transport.deregisterBot).not.toHaveBeenCalled();
    await ctx.bridge.stop();
  });

  it('persistently cancels a stale tombstone when a new live handle has the same name', async () => {
    const pendingDeletionsPath = makePendingDeletionsPath();
    fs.writeFileSync(pendingDeletionsPath, JSON.stringify(['Architect']), 'utf8');
    const ctx = setup(true, pendingDeletionsPath);

    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));

    expect(ctx.transport.deregisterBot).not.toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(pendingDeletionsPath, 'utf8'))).toEqual([]);
    await ctx.bridge.stop();
  });

  it('publishes disconnected without deleting the roster on service shutdown', async () => {
    const ctx = setup();
    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));

    await ctx.bridge.stop();

    expect(ctx.transport.updateBotState).toHaveBeenLastCalledWith(
      'Architect',
      expect.objectContaining({ botState: BotState.DISCONNECTED }),
    );
    expect(ctx.transport.deregisterBot).not.toHaveBeenCalled();
  });

  it('re-registers after a failed update, repairing a restarted FleetCraft sidecar', async () => {
    const ctx = setup();
    vi.mocked(ctx.transport.updateBotState)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    ctx.bridge.start();
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(1));
    expect(ctx.transport.registerBot).toHaveBeenCalledTimes(1);

    ctx.detailed.state = BotState.IDLE;
    ctx.detailed.voyager.currentTask = null;
    ctx.fireStatus();

    await vi.waitFor(() => expect(ctx.transport.registerBot).toHaveBeenCalledTimes(2));
    await vi.waitFor(() => expect(ctx.transport.updateBotState).toHaveBeenCalledTimes(2));
    expect(ctx.transport.registerBot).toHaveBeenLastCalledWith('Architect');

    await ctx.bridge.stop();
  });
});

describe('BotManager async spawn lifecycle', () => {
  it('does not start the worker until async spawn listeners settle', async () => {
    const start = vi.spyOn(WorkerHandle.prototype, 'start').mockImplementation(() => undefined);
    let releaseListener: (() => void) | null = null;
    const listenerGate = new Promise<void>((resolve) => { releaseListener = resolve; });
    const manager = Object.create(BotManager.prototype) as any;
    Object.assign(manager, {
      workers: new Map(),
      viewerSlots: new Map(),
      config: {
        bots: { maxBots: 4, defaultMode: 'codegen', joinStaggerMs: 0 },
      },
      nextStaggerAt: 0,
      spawnListeners: [],
      llmClient: null,
      affinityManager: {},
      conversationManager: {},
      blackboardManager: {},
      sharedWorldModel: {},
      difficultyBalancer: {},
      playerIntentModel: {},
      cultureManager: {},
      botComms: {},
      botReputation: {},
      saveBots: vi.fn(),
    });
    manager.onBotSpawned(async () => listenerGate);

    const spawnPromise = manager.spawnBot('Awaiter', 'builder');
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(start).not.toHaveBeenCalled();

    releaseListener?.();
    const handle = await spawnPromise;
    expect(handle?.botName).toBe('Awaiter');
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('persists a roster removal before notifying removal listeners', async () => {
    const dataPath = path.join(path.dirname(makePendingDeletionsPath()), 'bots.json');
    fs.writeFileSync(dataPath, JSON.stringify({ bots: [{ name: 'RetiringBot' }] }));

    const handle = {
      botName: 'RetiringBot',
      personality: 'builder',
      mode: 'codegen',
      spawnLocation: undefined,
      workerSlotIndex: 0,
      terminate: vi.fn().mockResolvedValue(undefined),
    };
    const manager = Object.create(BotManager.prototype) as any;
    Object.assign(manager, {
      workers: new Map([['retiringbot', handle]]),
      viewerSlots: new Map([[0, 'retiringbot']]),
      pendingGhostChecks: new Map(),
      removalListeners: [],
      saveTimer: null,
      loadingBots: false,
      dataPath,
    });

    let rosterSeenByListener: unknown;
    manager.onBotRemoved(() => {
      rosterSeenByListener = JSON.parse(fs.readFileSync(dataPath, 'utf8')).bots;
    });

    await expect(manager.removeBot('RetiringBot')).resolves.toBe(true);
    expect(rosterSeenByListener).toEqual([]);
    expect(handle.terminate).toHaveBeenCalledTimes(1);
  });
});
