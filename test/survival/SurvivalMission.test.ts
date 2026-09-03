import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  SurvivalMission,
  createSurvivalMission,
  findCraftableBed,
  isSurvivalMissionTarget,
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
  it('persists deaths and pause state, then hands control back to Voyager', () => {
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
    expect(first.pause()).toMatchObject({ running: false, paused: true, deaths: 1 });
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
});
