import { describe, expect, it, vi } from 'vitest';
import { Vec3 } from 'vec3';

import { commissionMp01IsolatedReactiveControl } from '../../src/actions/commissionMp01IsolatedReactiveControl';

type PropertyValue = string | number | boolean | null;

interface State {
  name: string;
  stateId: number;
  properties: Record<string, PropertyValue>;
}

function key(position: { x: number; y: number; z: number }): string {
  return `${position.x},${position.y},${position.z}`;
}

function makeCommissioningBot(onFirstInteraction?: (states: Record<string, State>) => void) {
  const states: Record<string, State> = {};
  for (let x = 2001; x <= 2004; x += 1) {
    states[`${x},165,-902`] = { name: 'polished_blackstone_bricks', stateId: 1, properties: {} };
  }
  for (let x = 2001; x <= 2003; x += 1) {
    for (let z = -899; z >= -901; z -= 1) {
      states[`${x},164,${z}`] = { name: 'polished_andesite', stateId: 2, properties: {} };
      states[`${x},165,${z}`] = { name: 'air', stateId: 0, properties: {} };
      states[`${x},166,${z}`] = { name: 'air', stateId: 0, properties: {} };
    }
  }
  states['2001,166,-902'] = { name: 'lever', stateId: 3, properties: { face: 'floor', facing: 'north', powered: false } };
  states['2002,166,-902'] = { name: 'redstone_wire', stateId: 4, properties: { east: 'side', north: 'none', power: 0, south: 'none', west: 'side' } };
  states['2003,166,-902'] = { name: 'redstone_lamp', stateId: 5, properties: { lit: false } };

  const blockAt = vi.fn((position: Vec3) => {
    const state = states[key(position)] ?? { name: 'air', stateId: 0, properties: {} };
    return {
      ...state,
      position: new Vec3(position.x, position.y, position.z),
      getProperties: () => ({ ...state.properties }),
    };
  });
  let interactionCount = 0;
  const activateBlock = vi.fn(async () => {
    interactionCount += 1;
    const powered = interactionCount === 1;
    states['2001,166,-902'] = { name: 'lever', stateId: powered ? 6 : 3, properties: { face: 'floor', facing: 'north', powered } };
    states['2002,166,-902'] = { name: 'redstone_wire', stateId: powered ? 7 : 4, properties: { east: 'side', north: 'none', power: powered ? 15 : 0, south: 'none', west: 'side' } };
    states['2003,166,-902'] = { name: 'redstone_lamp', stateId: powered ? 8 : 5, properties: { lit: powered } };
    if (interactionCount === 1) onFirstInteraction?.(states);
  });

  return {
    bot: {
      username: 'MP01Commissioner',
      entity: { position: new Vec3(2002, 165, -899) },
      blockAt,
      activateBlock,
      waitForTicks: vi.fn(async () => undefined),
    } as any,
    activateBlock,
    states,
  };
}

describe('commissionMp01IsolatedReactiveControl', () => {
  it('runs only the fixed genuine OFF → ON → OFF interaction and records core plus halo evidence', async () => {
    const { bot, activateBlock } = makeCommissioningBot();

    const result = await commissionMp01IsolatedReactiveControl(bot);

    expect(result.success).toBe(true);
    expect(activateBlock).toHaveBeenCalledTimes(2);
    expect(result.data?.botIdentity).toBe('MP01Commissioner');
    expect(result.data?.stagingPosition).toEqual({ x: 2002, y: 165, z: -899 });
    expect(result.data?.snapshots.map((snapshot) => snapshot.phase)).toEqual([
      'before_first_interaction',
      'after_first_interaction',
      'before_second_interaction',
      'after_second_interaction',
    ]);
    for (const snapshot of result.data?.snapshots ?? []) {
      expect(snapshot.core).toHaveLength(7);
      expect(snapshot.halo.length).toBeGreaterThan(0);
    }
  });

  it('aborts before reset when a non-reactive halo cell drifts after the first interaction', async () => {
    const { bot, activateBlock } = makeCommissioningBot((states) => {
      states['2000,165,-902'] = { name: 'stone', stateId: 99, properties: {} };
    });

    const result = await commissionMp01IsolatedReactiveControl(bot);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/undeclared halo drift at 2000,165,-902/i);
    expect(activateBlock).toHaveBeenCalledTimes(1);
    expect(result.data?.snapshots).toHaveLength(2);
  });

  it('does not interact when the bot is outside the three exact staging squares', async () => {
    const { bot, activateBlock } = makeCommissioningBot();
    bot.entity.position = new Vec3(2004, 165, -899);

    const result = await commissionMp01IsolatedReactiveControl(bot);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/allowlisted safe staging position/i);
    expect(activateBlock).not.toHaveBeenCalled();
  });
});
