/**
 * Regression test for the findGroundedBuildOrigin null-guard fix (team-b #1).
 *
 * Background: `decomposeAndSetLongTermGoal` calls `findGroundedBuildOrigin`
 * to seed `goal.origin` on a build_structure long-term goal. The function
 * dereferences `this.bot.entity.position`, but `this.bot.entity` is null in
 * the death → respawn window. Before the fix, a build-ask landing on a bot
 * mid-respawn crashed the worker with a TypeError; the catch on
 * `queueLongTermGoal` then fell back to the player task queue, but the
 * log was full of stack traces.
 *
 * The fix: `findGroundedBuildOrigin` returns null when `this.bot?.entity`
 * is null, and the caller in `decomposeAndSetLongTermGoal` throws a
 * specific Error so the chat handler's catch can still recover cleanly.
 *
 * An earlier draft of this test mocked the Blueprint.ts pipeline
 * (`generateSimpleHouseBlueprint`, `validateBlueprint`,
 * `countBlueprintMaterials`) to isolate the null-guard contract. That
 * was unsatisfying: it left the real error path untested. The first
 * pass hit a test-setup artifact where `bot.version` was undefined, so
 * `minecraft-data(undefined)` returned null and the test crashed in
 * `validateBlueprint` with a misleading "blocksByName" error before
 * reaching `findGroundedBuildOrigin`. The artifact is now fixed (the
 * factory sets `bot.version`) and the mocks are removed — the test
 * exercises the real pipeline end-to-end and verifies that the
 * findGroundedBuildOrigin null-guard is the only thing that needs to
 * catch a respawn-time build-ask, because everything earlier in the
 * chain survives a null `bot.entity` (inventory is independent of
 * entity state; worldMemory.findNearest has its own null-safe guard;
 * minecraft-data(bot.version) is independent of entity state since
 * `bot.version` is set on `createBot` and stays set across respawn).
 */
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
  const skillsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'find-grounded-origin-'));
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
  } as Config;
}

/**
 * A complete-enough mineflayer bot mock for the Blueprint.ts pipeline.
 * `bot.version` is required for `minecraft-data(bot.version)` in
 * `validateBlueprint`; without it, the call returns null and the
 * validation step crashes with a misleading "blocksByName" error
 * before the findGroundedBuildOrigin guard is reached.
 */
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
    version: '1.21.11', // minecraft-data() needs a real version string
    entity,
    entities: { self: entity },
    inventory: {
      items: () => [],
      slots: {},
    },
    findBlock: vi.fn(() => null),
    // blockAt at any (x, y, z) returns grass_block below / air above, which is
    // what findGroundedBuildOrigin's loop is looking for to settle the y.
    blockAt: vi.fn((pos: Vec3) => ({ name: pos.y % 2 === 0 ? 'grass_block' : 'air' })),
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

describe('VoyagerLoop findGroundedBuildOrigin null-guard (team-b #1)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it('returns null when bot.entity is missing (death -> respawn window)', () => {
    const loop = new VoyagerLoop(makeBot(), 'Surveyor', 'builder', makeConfig(), null);
    // Simulate the death -> respawn window. Before the fix this would
    // throw a TypeError on `this.bot.entity.position`.
    (loop as any).bot.entity = null;

    const origin = (loop as any).findGroundedBuildOrigin();

    expect(origin).toBeNull();
  });

  it('returns null when bot itself is undefined (defensive)', () => {
    const loop = new VoyagerLoop(makeBot(), 'Surveyor', 'builder', makeConfig(), null);
    (loop as any).bot = undefined;

    const origin = (loop as any).findGroundedBuildOrigin();

    expect(origin).toBeNull();
  });

  it('returns a usable origin when bot.entity is in-world', () => {
    const loop = new VoyagerLoop(makeBot(), 'Surveyor', 'builder', makeConfig(), null);

    const origin = (loop as any).findGroundedBuildOrigin();

    expect(origin).not.toBeNull();
    expect(origin).toMatchObject({
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
    });
    // The function searches the column at (base.x + 2, base.y - 20..base.y).
    // With a position of -111, 69, -332, the start is (-109, ?, -330). The y
    // is whatever the column-search settles on; the floor is a grass block
    // at every even y in the stub blockAt.
    expect(origin.x).toBe(-109);
    expect(origin.z).toBe(-330);
  });

  it('decomposeAndSetLongTermGoal throws the documented respawn error end-to-end (no mocks)', async () => {
    // Exercises the real Blueprint.ts pipeline: generateSimpleHouseBlueprint,
    // validateBlueprint, countBlueprintMaterials, then findGroundedBuildOrigin.
    // The pipeline survives a null `bot.entity` (inventory is independent;
    // worldMemory.findNearest has its own null-safe guard; bot.version is
    // set on createBot and stays set across respawn), so the only crash
    // is the findGroundedBuildOrigin null-guard, which surfaces as the
    // documented Error the chat handler's catch can recover from.
    const loop = new VoyagerLoop(makeBot(), 'Surveyor', 'builder', makeConfig(), null);
    (loop as any).bot.entity = null;
    (loop as any).blackboardManager = { setBotGoal: vi.fn() };

    await expect(
      (loop as any).decomposeAndSetLongTermGoal('build a small house', 'test-player'),
    ).rejects.toThrow(/cannot derive build origin: bot is not in-world \(respawn in progress\)/);

    // The function throws BEFORE persisting `activeLongTermGoal` — the
    // goal is a local in `decomposeAndSetLongTermGoal`, and only the
    // happy path promotes it to the instance field. This is intentional:
    // a partial goal with no usable build origin shouldn't be visible to
    // the blackboard, the next-cycle check, or any external observer.
    // The chat handler's outer catch in `queueLongTermGoal` then falls
    // back to the player task queue, and that's where the recovery lives.
    expect((loop as any).activeLongTermGoal).toBeNull();
  });

  it('decomposeAndSetLongTermGoal still produces a goal when the entity is in-world (real pipeline)', async () => {
    const loop = new VoyagerLoop(makeBot(), 'Surveyor', 'builder', makeConfig(), null);
    (loop as any).blackboardManager = { setBotGoal: vi.fn() };

    await (loop as any).decomposeAndSetLongTermGoal('build a small house', 'test-player');

    const goal = (loop as any).activeLongTermGoal;
    expect(goal).toBeTruthy();
    expect(goal.origin).toBeTruthy();
    expect(goal.buildState).toBe('blueprint_ready');
  });
});
