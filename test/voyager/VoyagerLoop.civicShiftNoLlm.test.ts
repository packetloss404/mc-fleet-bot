import fs from 'fs';
import os from 'os';
import path from 'path';
import { Vec3 } from 'vec3';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { Config } from '../../src/config';
import { VoyagerLoop } from '../../src/voyager/VoyagerLoop';

const tempRoots: string[] = [];

function makeConfig(): Config {
  const skillsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'civic-shift-no-llm-'));
  tempRoots.push(skillsDirectory);
  return {
    api: { port: 3001, host: '127.0.0.1' },
    minecraft: { host: 'localhost', port: 25565, version: '1.21', auth: 'offline' },
    bots: {
      maxBots: 5,
      defaultMode: 'codegen',
      joinStaggerMs: 0,
      reconnectDelaySec: 5,
      maxReconnectAttempts: 3,
    },
    behavior: {
      headTrackingRange: 6,
      headTrackingTickMs: 200,
      wanderRadius: 8,
      wanderIntervalMs: 5000,
      ambientChatMinSec: 600,
      ambientChatMaxSec: 1200,
      conversationRadius: 6,
    },
    affinity: {
      default: 0,
      hitPenalty: -5,
      chatBonus: 1,
      giftBonus: 5,
      negativeSentimentPenalty: -2,
      hostileThreshold: -10,
      trustThreshold: 10,
    },
    instincts: {
      enabled: true,
      attackCooldownMs: 800,
      lowHealthThreshold: 6,
      fleeDistance: 16,
      fightRange: 3,
      drowningOxygenThreshold: 100,
      drowningSurfaceClearOxygen: 280,
    },
    voyager: {
      enabled: true,
      taskCooldownMs: 100,
      maxRetriesPerTask: 2,
      codeExecutionTimeoutMs: 5000,
      curriculumLLMCalls: false,
      criticLLMCalls: false,
    },
    llm: {
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      chatMaxTokens: 200,
      codeGenMaxTokens: 1000,
      maxConcurrentRequests: 1,
    },
    skills: { directory: skillsDirectory, maxSkills: 100 },
    logging: { level: 'silent' },
  };
}

function makeBot() {
  const position = new Vec3(-111, 69, -332);
  const entity = {
    position,
    velocity: new Vec3(0, 0, 0),
    oxygenLevel: 300,
    type: 'player',
  };
  return {
    username: 'Surveyor',
    entity,
    entities: { self: entity },
    inventory: { items: () => [] },
    findBlock: vi.fn(() => null),
    blockAt: vi.fn(() => ({ name: 'grass_block' })),
    time: { timeOfDay: 6000, day: 1 },
    health: 20,
    food: 20,
    oxygenLevel: 300,
    heldItem: null,
    nearestEntity: vi.fn(() => null),
    isRaining: false,
    players: {},
    chat: vi.fn(),
  } as any;
}

const reviewedShift = {
  description: 'town:ravensreach work the approved MainStreet civic shift',
  keywords: [
    'civic-shift',
    'shift:mainstreet-day-shift-guard',
    'guard',
    'non-destructive',
  ],
  metadata: {
    kind: 'civic-shift',
    version: 2,
    shiftId: 'mainstreet-day-shift-guard',
    roundTrip: true,
    destinationActivity: 'Inspect MainStreet wayfinding without editing blocks.',
    waypoints: [
      { x: -111, y: 69, z: -332 },
      { x: -82, y: 65, z: 90 },
    ],
  },
};

function prepareLoop() {
  const loop = new VoyagerLoop(
    makeBot(),
    'Surveyor',
    'guard',
    makeConfig(),
    null,
  );
  const internals = loop as any;
  internals.running = true;

  const execute = vi.fn().mockResolvedValue({
    success: true,
    output: 'round trip complete',
    events: [],
  });
  internals.codeExecutor.execute = execute;
  vi.spyOn(internals.statsTracker, 'trackExecution').mockImplementation(() => {});
  vi.spyOn(internals.curriculumAgent, 'updateProgress').mockImplementation(() => {});
  vi.spyOn(internals.curriculumAgent.getWorldMemory(), 'rememberFromBot')
    .mockResolvedValue(undefined);
  const save = vi.spyOn(internals.skillLibrary, 'save');
  const bestMatch = vi.spyOn(internals.skillLibrary, 'getBestMatch');
  const composable = vi.spyOn(internals.skillLibrary, 'getComposableMatches');

  return {
    loop,
    internals,
    execute,
    save,
    bestMatch,
    composable,
  };
}

describe('VoyagerLoop deterministic civic shifts without an LLM', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('executes the reviewed route while ActionAgent is unavailable', async () => {
    const {
      loop,
      internals,
      execute,
      save,
      bestMatch,
      composable,
    } = prepareLoop();
    vi.spyOn(internals.criticAgent, 'evaluate').mockResolvedValue({
      success: true,
      reason: 'round trip completed',
      critique: '',
    });

    const resultPromise = internals.executeTaskStep(reviewedShift);
    await vi.advanceTimersByTimeAsync(2_100);

    await expect(resultPromise).resolves.toBe(true);
    expect(internals.actionAgent).toBeNull();
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][1].functionCode)
      .toContain('performApprovedCivicShiftRoundTrip');
    expect(bestMatch).not.toHaveBeenCalled();
    expect(composable).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    void loop;
  });

  it('retries the same deterministic code instead of requesting an LLM rewrite', async () => {
    const { internals, execute } = prepareLoop();
    vi.spyOn(internals.criticAgent, 'evaluate')
      .mockResolvedValueOnce({
        success: false,
        reason: 'transient observer lag',
        critique: 'retry the exact accepted route',
      })
      .mockResolvedValueOnce({
        success: true,
        reason: 'round trip confirmed',
        critique: '',
      });

    const resultPromise = internals.executeTaskStep(reviewedShift);
    await vi.advanceTimersByTimeAsync(6_200);

    await expect(resultPromise).resolves.toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[1][1].functionCode)
      .toBe(execute.mock.calls[0][1].functionCode);
  });
});
