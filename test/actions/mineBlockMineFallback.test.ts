import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Local-first, mine-as-fallback (the fix for the 2026-07/08 stone-supply
 * loop). Bulk materials are not in routeToMineBlocks — town bots gather them
 * locally — but when everything local is inside a protected build zone the
 * old code returned a refusal telling the bot to "travel to the communal
 * mine" while nothing ever walked there, so the same supply task failed
 * identically every minute for two weeks. mineBlock must now relocate to the
 * mine site and rescan before giving up.
 */
vi.mock('../../src/config', () => ({ loadConfig: () => mockCfg }));
let mockCfg: any;

const moveNearWithCleanup = vi.fn(async (bot: any, target: any) => {
  bot.entity.position = { x: target.x, y: target.y, z: target.z };
  return true;
});
vi.mock('../../src/actions/moveHelper', () => ({
  moveNearWithCleanup: (...args: any[]) => moveNearWithCleanup(...(args as [any, any])),
}));

import { mineBlock } from '../../src/actions/mineBlock';
import { _resetGeofenceCache } from '../../src/actions/geofence';

/** Minimal bot: town terrain around the origin, minable stone at the mine. */
function makeBot(opts: { townPositions?: any[]; minePositions?: any[] } = {}): any {
  const townPositions = opts.townPositions ?? [{ x: 2, y: 60, z: 2 }, { x: 3, y: 60, z: 3 }];
  const minePositions = opts.minePositions ?? [{ x: 98, y: 58, z: 98 }];
  const bot: any = {
    version: '1.20.4',
    entity: { position: { x: 0, y: 68, z: 0 } },
    inventory: { items: () => [] },
    equip: vi.fn(async () => {}),
    blockAt: (pos: any) => ({ name: 'stone', position: pos }),
    collectBlock: { collect: vi.fn(async () => {}) },
    findBlocks: vi.fn(() => (bot.entity.position.x < 50 ? townPositions : minePositions)),
  };
  return bot;
}

beforeEach(() => {
  _resetGeofenceCache();
  moveNearWithCleanup.mockClear();
});
afterEach(() => { _resetGeofenceCache(); });

// Everything within findBlocks range of the origin is a protected build zone;
// the communal mine sits at (100, 64, 100).
const TOWN_AND_MINE = {
  mining: {
    minDigY: 50,
    protectedZones: [{ name: 'town', minX: -32, minY: 0, minZ: -32, maxX: 32, maxY: 80, maxZ: 32 }],
    mineSite: { x: 100, y: 64, z: 100, radius: 20 },
    routeToMineBlocks: ['iron_ore'],
  },
};

describe('mineBlock communal-mine fallback', () => {
  it('relocates to the mine and mines when all local stone is protected', async () => {
    mockCfg = TOWN_AND_MINE;
    const bot = makeBot();
    const result = await mineBlock(bot, 'stone', 4);
    expect(moveNearWithCleanup).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
    expect(bot.collectBlock.collect).toHaveBeenCalledTimes(1);
  });

  it('still refuses (without trekking) when no mine site is configured', async () => {
    mockCfg = { mining: { ...TOWN_AND_MINE.mining, mineSite: undefined } };
    const bot = makeBot();
    const result = await mineBlock(bot, 'stone', 4);
    expect(result.success).toBe(false);
    expect(result.message).toContain('protected build zone');
    expect(moveNearWithCleanup).not.toHaveBeenCalled();
  });

  it('does not trek to the mine for materials the mine cannot supply', async () => {
    mockCfg = TOWN_AND_MINE;
    const bot = makeBot({ townPositions: [] });
    const result = await mineBlock(bot, 'oak_log', 1);
    expect(result.success).toBe(false);
    expect(result.message).toContain('No oak_log nearby');
    expect(moveNearWithCleanup).not.toHaveBeenCalled();
  });

  it('treks for a mine-sourced material when none is visible locally', async () => {
    mockCfg = TOWN_AND_MINE;
    const bot = makeBot({ townPositions: [] });
    const result = await mineBlock(bot, 'stone', 4);
    expect(moveNearWithCleanup).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('routes ores to the mine before scanning, as before', async () => {
    mockCfg = TOWN_AND_MINE;
    const bot = makeBot({ minePositions: [{ x: 98, y: 40, z: 98 }] });
    const result = await mineBlock(bot, 'iron_ore', 1);
    expect(moveNearWithCleanup).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
