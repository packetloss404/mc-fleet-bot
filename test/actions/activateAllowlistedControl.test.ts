import { describe, expect, it, vi } from 'vitest';
import { Vec3 } from 'vec3';
import { activateAllowlistedControl } from '../../src/actions/activateAllowlistedControl';

type PropertyValue = string | number | boolean | null;

interface FakeBlockState {
  name: string;
  stateId: number;
  metadata?: number;
  properties: Record<string, PropertyValue>;
}

function key(position: { x: number; y: number; z: number }): string {
  return `${position.x},${position.y},${position.z}`;
}

function makeControlBot(states: Record<string, FakeBlockState>) {
  const blockAt = vi.fn((position: Vec3) => {
    const state = states[key(position)];
    if (!state) return null;
    return {
      ...state,
      position: new Vec3(position.x, position.y, position.z),
      getProperties: () => ({ ...state.properties }),
    };
  });
  const activateBlock = vi.fn(async () => {
    // Simulate the exact isolated MP01-style lever → wire → lamp transition.
    states['2001,166,-902'] = { name: 'lever', stateId: 11, properties: { face: 'floor', facing: 'north', powered: true } };
    states['2002,166,-902'] = { name: 'redstone_wire', stateId: 12, properties: { east: 'side', north: 'none', power: 15, south: 'none', west: 'side' } };
    states['2003,166,-902'] = { name: 'redstone_lamp', stateId: 13, properties: { lit: true } };
  });
  const waitForTicks = vi.fn(async () => undefined);
  return {
    bot: {
      entity: { position: new Vec3(2001, 166, -899) },
      blockAt,
      activateBlock,
      waitForTicks,
    } as any,
    blockAt,
    activateBlock,
    waitForTicks,
    states,
  };
}

function isolatedControlRequest() {
  return {
    actionId: 'MP01-D01-isolated-control-test',
    target: { x: 2001, y: 166, z: -902 },
    allowlistedTargetCoordinates: [{ x: 2001, y: 166, z: -902 }],
    declaredSignalCoordinates: [{ x: 2002, y: 166, z: -902 }],
    declaredOutputCoordinates: [{ x: 2003, y: 166, z: -902 }],
    expectedPreActivation: [
      {
        coordinate: { x: 2001, y: 166, z: -902 },
        name: 'lever',
        properties: { face: 'floor', facing: 'north', powered: false },
      },
      {
        coordinate: { x: 2002, y: 166, z: -902 },
        name: 'redstone_wire',
        properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' },
      },
      { coordinate: { x: 2003, y: 166, z: -902 }, name: 'redstone_lamp', properties: { lit: false } },
    ],
    expectedPostActivation: [
      { coordinate: { x: 2001, y: 166, z: -902 }, name: 'lever', properties: { face: 'floor', facing: 'north', powered: true } },
      { coordinate: { x: 2002, y: 166, z: -902 }, name: 'redstone_wire', properties: { east: 'side', north: 'none', power: 15, south: 'none', west: 'side' } },
      { coordinate: { x: 2003, y: 166, z: -902 }, name: 'redstone_lamp', properties: { lit: true } },
    ],
  };
}

describe('activateAllowlistedControl', () => {
  it('activates only the exact allowlisted lever and records target, signal, and output twice after normal ticks', async () => {
    const { bot, activateBlock, waitForTicks } = makeControlBot({
      '2001,166,-902': { name: 'lever', stateId: 10, properties: { face: 'floor', facing: 'north', powered: false } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });

    const result = await activateAllowlistedControl(bot, isolatedControlRequest());

    expect(result.success).toBe(true);
    expect(activateBlock).toHaveBeenCalledTimes(1);
    expect(waitForTicks).toHaveBeenCalledTimes(2);
    expect(waitForTicks).toHaveBeenNthCalledWith(1, 2);
    expect(waitForTicks).toHaveBeenNthCalledWith(2, 2);
    expect(result.data?.activationMethod).toBe('mineflayer.activateBlock');
    expect(result.data?.observations.map((observation) => observation.phase)).toEqual([
      'before_activation',
      'after_first_normal_tick_window',
      'after_second_normal_tick_window',
    ]);
    expect(result.data?.observations[0].target.properties.powered).toBe(false);
    for (const observation of result.data?.observations.slice(1) ?? []) {
      expect(observation.target.properties.powered).toBe(true);
      expect(observation.signals[0].properties.power).toBe(15);
      expect(observation.outputs[0].properties.lit).toBe(true);
    }
    expect(result.data?.expectationFailures).toEqual([]);
  });

  it('refuses a target that is not in the exact coordinate allowlist before reading or activating anything', async () => {
    const { bot, blockAt, activateBlock } = makeControlBot({
      '2001,166,-902': { name: 'lever', stateId: 10, properties: { face: 'floor', facing: 'north', powered: false } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });
    const request = isolatedControlRequest();
    request.target = { x: 2001, y: 166, z: -901 };

    const result = await activateAllowlistedControl(bot, request);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/not allowlisted/i);
    expect(blockAt).not.toHaveBeenCalled();
    expect(activateBlock).not.toHaveBeenCalled();
  });

  it('refuses non-lever blocks even when their coordinate is allowlisted', async () => {
    const { bot, activateBlock } = makeControlBot({
      '2001,166,-902': { name: 'chest', stateId: 10, properties: { facing: 'north' } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });

    const result = await activateAllowlistedControl(bot, isolatedControlRequest());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/only permits an exact lever/i);
    expect(activateBlock).not.toHaveBeenCalled();
  });

  it('refuses an expected-state assertion outside the declared exact observation set before activating the lever', async () => {
    const { bot, activateBlock } = makeControlBot({
      '2001,166,-902': { name: 'lever', stateId: 10, properties: { face: 'floor', facing: 'north', powered: false } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });
    const request = isolatedControlRequest();
    request.expectedPostActivation.push({
      coordinate: { x: 2004, y: 166, z: -902 },
      name: 'redstone_wire',
      properties: { power: 15 },
    });

    const result = await activateAllowlistedControl(bot, request);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/only reference the target or declared signal\/output/i);
    expect(activateBlock).not.toHaveBeenCalled();
  });

  it('returns the complete two-window audit as failure when the declared output does not reach its exact expected state', async () => {
    const { bot, activateBlock, states } = makeControlBot({
      '2001,166,-902': { name: 'lever', stateId: 10, properties: { face: 'floor', facing: 'north', powered: false } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });
    // Simulate the lever and wire energizing without the declared lamp output.
    // A click is not proof that the full control path actually worked.
    activateBlock.mockReset();
    activateBlock.mockImplementation(async () => {
      states['2001,166,-902'] = { name: 'lever', stateId: 11, properties: { face: 'floor', facing: 'north', powered: true } };
      states['2002,166,-902'] = { name: 'redstone_wire', stateId: 12, properties: { east: 'side', north: 'none', power: 15, south: 'none', west: 'side' } };
    });
    const result = await activateAllowlistedControl(bot, isolatedControlRequest());

    expect(result.success).toBe(false);
    expect(result.data?.observations).toHaveLength(3);
    expect(result.data?.expectationFailures.join(' ')).toMatch(/2003,166,-902.*lit expected true/i);
  });

  it('refuses exact MP01 pre-activation drift before clicking the lever', async () => {
    const { bot, activateBlock } = makeControlBot({
      '2001,166,-902': { name: 'lever', stateId: 10, properties: { face: 'floor', facing: 'north', powered: true } },
      '2002,166,-902': { name: 'redstone_wire', stateId: 9, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } },
      '2003,166,-902': { name: 'redstone_lamp', stateId: 8, properties: { lit: false } },
    });

    const result = await activateAllowlistedControl(bot, isolatedControlRequest());

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/pre-activation assertions failed/i);
    expect(result.data?.observations).toHaveLength(1);
    expect(result.data?.expectationFailures.join(' ')).toMatch(/powered expected false, observed true/i);
    expect(activateBlock).not.toHaveBeenCalled();
  });
});
