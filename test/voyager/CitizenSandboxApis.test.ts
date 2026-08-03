import { describe, expect, it, vi } from 'vitest';
import { Vec3 } from 'vec3';

import { containerItemsFromResult } from '../../src/actions/container';
import { ACTION_SYSTEM_PROMPT } from '../../src/voyager/ActionAgent';
import { CodeExecutor } from '../../src/voyager/CodeExecutor';

describe('citizen generated-code sandbox APIs', () => {
  it('turns container ActionResult data into an array safe for collection methods', () => {
    const items = containerItemsFromResult({
      success: true,
      message: 'ok',
      data: { items: { wheat: 12, oak_log: 4 } },
    });
    expect(items.find((item) => item.name === 'wheat')).toEqual({
      name: 'wheat',
      count: 12,
    });
    expect(containerItemsFromResult({ success: false, message: 'closed' })).toEqual([]);
  });

  it('normalizes findBlocks positions into documented block-like results', () => {
    const position = new Vec3(2, 64, 3);
    const block = {
      name: 'wheat',
      position,
      hardness: 0,
      getProperties: () => ({ age: 7 }),
    };
    const bot = {
      entity: { position: new Vec3(0, 64, 0), velocity: new Vec3(0, 0, 0) },
      health: 20,
      food: 20,
      time: { timeOfDay: 0, day: 1 },
      isRaining: false,
      inventory: { items: () => [] },
      pathfinder: {
        setGoal: vi.fn(),
        setMovements: vi.fn(),
        isMoving: () => false,
        stop: vi.fn(),
      },
      findBlocks: vi.fn(() => [position]),
      blockAt: vi.fn(() => block),
    };
    const executor = new CodeExecutor(1000);
    const proxy = (executor as any).createBotProxy(bot, vi.fn(), async () => {});
    const found = proxy.findBlocks({
      matching: () => true,
      maxDistance: 16,
      count: 8,
    });

    expect(found).toHaveLength(1);
    expect(found[0].name).toBe('wheat');
    expect(found[0]).toMatchObject({ x: 2, y: 64, z: 3 });
    expect(found[0].offset(0, 1, 0)).toEqual(new Vec3(2, 65, 3));
    expect(found[0].getProperties()).toEqual({ age: 7 });
    expect(bot.findBlocks).toHaveBeenCalledWith(expect.objectContaining({ count: 8 }));
  });

  it('preserves safe block-state inspection on blockAt results', () => {
    const position = new Vec3(4, 65, 7);
    const bot = {
      entity: { position: new Vec3(0, 64, 0), velocity: new Vec3(0, 0, 0) },
      health: 20,
      food: 20,
      time: { timeOfDay: 0, day: 1 },
      isRaining: false,
      inventory: { items: () => [] },
      pathfinder: {
        setGoal: vi.fn(),
        setMovements: vi.fn(),
        isMoving: () => false,
        stop: vi.fn(),
      },
      blockAt: vi.fn(() => ({
        name: 'wheat',
        position,
        hardness: 0,
        getProperties: () => ({ age: 7 }),
      })),
    };
    const executor = new CodeExecutor(1000);
    const proxy = (executor as any).createBotProxy(bot, vi.fn(), async () => {});
    const block = proxy.blockAt(position);

    expect(block).toMatchObject({ name: 'wheat', x: 4, y: 65, z: 7 });
    expect(block.getProperties()).toEqual({ age: 7 });
    expect(block.offset(0, 1, 0)).toEqual(new Vec3(4, 66, 7));
  });

  it('documents the collection contracts presented to code generation', () => {
    expect(ACTION_SYSTEM_PROMPT).toContain('inspectContainer');
    expect(ACTION_SYSTEM_PROMPT).toContain('Safe to use .find/.filter/.some');
    expect(ACTION_SYSTEM_PROMPT).toContain('findBlocks');
  });
});
