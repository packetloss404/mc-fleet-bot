import fs from 'fs';
import os from 'os';
import path from 'path';
import { Vec3 } from 'vec3';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SurvivalMission,
  SURVIVAL_SMELTING_INPUTS,
  blockIntersectsEntity,
  createSurvivalMission,
  findCraftableBed,
  isSurvivalMissionTarget,
  selectSurvivalTool,
  survivalMiningDisposition,
} from '../../src/survival/SurvivalMission';

const temporaryDirectories: string[] = [];

function temporaryDataDir(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fleet-survival-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe('survival mission opt-in', () => {
  it('targets only the exact configured bot when explicitly enabled', () => {
    expect(isSurvivalMissionTarget({ survival: undefined }, 'FayaazMJacc')).toBe(false);
    expect(isSurvivalMissionTarget({
      survival: { enabled: false, botName: 'FayaazMJacc' },
    }, 'FayaazMJacc')).toBe(false);
    expect(isSurvivalMissionTarget({
      survival: { enabled: true, botName: 'FayaazMJacc' },
    }, 'fayaazmjacc')).toBe(false);
    expect(isSurvivalMissionTarget({
      survival: { enabled: true, botName: 'FayaazMJacc' },
    }, 'FayaazMJacc')).toBe(true);
  });

  it('creates no mission, timer, or progress directory for a non-target bot', () => {
    const dataDir = temporaryDataDir();
    const target = path.join(dataDir, 'survival');
    const mission = createSurvivalMission(
      { survival: { enabled: true, botName: 'FayaazMJacc' } },
      'Scout',
      {
        dataDir,
        botGetter: () => null,
        pauseVoyager: vi.fn(),
        resumeVoyager: vi.fn(),
      },
    );

    expect(mission).toBeNull();
    expect(fs.existsSync(target)).toBe(false);
  });
});

describe('survival mission progress', () => {
  it('persists deaths and pause state, then hands control back to Voyager', async () => {
    const dataDir = temporaryDataDir();
    const resumeVoyager = vi.fn();
    const options = {
      name: 'FayaazMJacc',
      dataDir,
      botGetter: () => null,
      pauseVoyager: vi.fn(),
      resumeVoyager,
      tickMs: 250,
    };

    const first = new SurvivalMission(options);
    first.recordDeath();
    first.start();
    expect(first.status()).toMatchObject({ running: true, paused: false, deaths: 1 });
    expect(await first.pause()).toMatchObject({ running: false, paused: true, deaths: 1 });
    expect(resumeVoyager).toHaveBeenCalledTimes(1);

    const restored = new SurvivalMission(options);
    expect(restored.status()).toMatchObject({
      bot: 'FayaazMJacc',
      stage: 'wood',
      running: false,
      paused: true,
      deaths: 1,
    });
    expect(restored.resume()).toMatchObject({ running: true, paused: false, deaths: 1 });
    restored.shutdown();
    first.shutdown();

    const resumedState = new SurvivalMission(options);
    expect(resumedState.status()).toMatchObject({ paused: false, deaths: 1 });
    resumedState.shutdown();
  });

  it('crafts a bed only from three matching wool, including split stacks', () => {
    expect(findCraftableBed([
      { name: 'red_wool', count: 1 },
      { name: 'red_wool', count: 2 },
    ])).toBe('red_bed');
    expect(findCraftableBed([
      { name: 'white_wool', count: 2 },
      { name: 'black_wool', count: 2 },
    ])).toBeNull();
  });

  it('routes below-floor objectives to the mine site and fails closed without one', () => {
    const mineSite = { x: -85, y: 64, z: -440, radius: 20 };

    expect(survivalMiningDisposition(64, 50, mineSite)).toEqual({ kind: 'unrestricted' });
    expect(survivalMiningDisposition(-54, null, null)).toEqual({ kind: 'unrestricted' });
    expect(survivalMiningDisposition(-54, 50, null)).toEqual({ kind: 'blocked' });
    expect(survivalMiningDisposition(-54, 50, mineSite)).toEqual({
      kind: 'mine-site',
      site: mineSite,
    });
  });

  it('rejects utility cells intersecting the bot and accepts clear adjacent cells', () => {
    const bot = new Vec3(0.8, 64, 0.5);

    expect(blockIntersectsEntity(new Vec3(0, 64, 0), bot)).toBe(true);
    expect(blockIntersectsEntity(new Vec3(1, 64, 0), bot)).toBe(true);
    expect(blockIntersectsEntity(new Vec3(2, 64, 0), bot)).toBe(false);
  });

  it('selects the strongest appropriate harvesting tool', () => {
    const items = [
      { name: 'wooden_pickaxe', count: 1, type: 1 },
      { name: 'stone_pickaxe', count: 1, type: 2 },
      { name: 'iron_axe', count: 1, type: 3 },
      { name: 'stone_shovel', count: 1, type: 4 },
    ];

    expect(selectSurvivalTool(items, 'iron_ore')?.name).toBe('stone_pickaxe');
    expect(selectSurvivalTool(items, 'oak_log')?.name).toBe('iron_axe');
    expect(selectSurvivalTool(items, 'gravel')?.name).toBe('stone_shovel');
  });

  it('recognizes modern raw iron and raw gold furnace inputs', () => {
    expect(SURVIVAL_SMELTING_INPUTS.iron).toContain('raw_iron');
    expect(SURVIVAL_SMELTING_INPUTS.gold).toContain('raw_gold');
  });

  it('establishes a stone-or-better pickaxe before seeking iron ore', async () => {
    const mission = new SurvivalMission({
      name: 'FayaazMJacc',
      dataDir: temporaryDataDir(),
      botGetter: () => ({ inventory: { items: () => [] } }),
      pauseVoyager: vi.fn(),
      resumeVoyager: vi.fn(),
    });
    const ensureStonePickaxe = vi.fn(async () => {});
    const mineAtY = vi.fn(async () => {});
    (mission as any).ensureStonePickaxe = ensureStonePickaxe;
    (mission as any).findBlock = vi.fn(() => null);
    (mission as any).mineAtY = mineAtY;

    await (mission as any).iron();

    expect(ensureStonePickaxe).toHaveBeenCalledTimes(1);
    expect(mineAtY).toHaveBeenCalledTimes(1);
    expect(ensureStonePickaxe.mock.invocationCallOrder[0])
      .toBeLessThan(mineAtY.mock.invocationCallOrder[0]);
  });

  it('does not report paused or resume Voyager until the active tick settles', async () => {
    const resumeVoyager = vi.fn();
    const mission = new SurvivalMission({
      name: 'FayaazMJacc',
      dataDir: temporaryDataDir(),
      botGetter: () => null,
      pauseVoyager: vi.fn(),
      resumeVoyager,
    });
    mission.start();
    let settle!: () => void;
    (mission as any).activeTick = new Promise<void>((resolve) => { settle = resolve; });

    const pause = mission.pause();
    await Promise.resolve();
    expect(resumeVoyager).not.toHaveBeenCalled();
    settle();

    expect(await pause).toMatchObject({ running: false, paused: true });
    expect(resumeVoyager).toHaveBeenCalledTimes(1);
  });

  it('reopens a furnace and retrieves output even when the batch left inventory', async () => {
    let output: any = { name: 'iron_ingot', count: 7 };
    const takeOutput = vi.fn(async () => { output = null; });
    const opened = {
      outputItem: () => output,
      inputItem: () => ({ name: 'raw_iron', count: 25 }),
      fuelItem: () => null,
      fuelSeconds: 0,
      takeOutput,
      close: vi.fn(),
    };
    const bot = {
      entity: { position: new Vec3(0, 64, 0) },
      inventory: { items: () => [] },
      openFurnace: vi.fn(async () => opened),
    };
    const mission = new SurvivalMission({
      name: 'FayaazMJacc',
      dataDir: temporaryDataDir(),
      botGetter: () => bot,
      pauseVoyager: vi.fn(),
      resumeVoyager: vi.fn(),
    });
    mission.start();
    (mission as any).ensureFurnace = vi.fn(async () => ({ position: new Vec3(0, 64, 1) }));
    (mission as any).moveNear = vi.fn(async () => {});

    expect(await (mission as any).smelt(['raw_iron', 'iron_ore'])).toBe('needs-fuel');
    expect(takeOutput).toHaveBeenCalledTimes(1);
    await mission.pause();
  });
});
