import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { ScheduleManager } from '../../src/town/ScheduleManager';
import type { TownManager } from '../../src/town/TownManager';
import { resourceLocaleHint } from '../../src/town/resourceThresholds';
import { BlackboardManager } from '../../src/voyager/BlackboardManager';

describe('BlackboardManager explicit town-role dispatch', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  function createBoard(): BlackboardManager {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'blackboard-role-'));
    roots.push(root);
    return new BlackboardManager(root);
  }

  it('leaves an explicitly role-scoped supply job for the matching resident', () => {
    const board = createBoard();
    board.addTask(
      {
        description: 'town:t1 needs 8 more food (requesting role: farmer).',
        keywords: ['food', 'farmer', 'town', 'supply'],
      },
      'swarm',
    );

    expect(board.claimBestTask('Scout', '', 'explorer', undefined, 'lumberjack')).toBeNull();
    expect(board.claimBestTask('Steward', '', 'builder', undefined, 'farmer')?.assignedBot)
      .toBe('Steward');
    board.shutdown();
  });

  it('keeps residents on town work while leaving unassigned bots unrestricted', () => {
    const board = createBoard();
    board.addTask(
      { description: 'repair the market awning', keywords: ['repair', 'builder'] },
      'swarm',
    );

    expect(board.claimBestTask('Architect', '', 'builder', undefined, 'builder'))
      .toBeNull();
    expect(board.claimBestTask('Guest', '', 'explorer'))
      .toMatchObject({ description: 'repair the market awning' });
    board.shutdown();

    const unassignedBoard = createBoard();
    unassignedBoard.addTask(
      {
        description: 'town:t1 needs 16 more stone (requesting role: miner).',
        keywords: ['stone', 'miner', 'town', 'supply'],
      },
      'swarm',
    );
    expect(unassignedBoard.claimBestTask('Guest', '', 'explorer'))
      .toMatchObject({ assignedBot: 'Guest' });
    unassignedBoard.shutdown();

    const legacyTownBoard = createBoard();
    legacyTownBoard.addTask(
      {
        description: 'town:t1 repair the fountain',
        keywords: ['town', 'repair', 'build'],
      },
      'swarm',
    );
    expect(legacyTownBoard.claimBestTask('Architect', '', 'builder', undefined, 'builder'))
      .toMatchObject({ assignedBot: 'Architect' });
    legacyTownBoard.shutdown();
  });

  it('emits schedule work with an enforceable town and role contract', () => {
    const board = createBoard();
    const townManager = {
      listResidents: () => [
        {
          id: 'resident-1',
          townId: 'ravensreach',
          botName: 'Mason',
          joinedAt: Date.now(),
          currentRole: 'miner',
          status: 'alive',
        },
      ],
    } as unknown as TownManager;
    const schedules = new ScheduleManager(townManager, board);

    schedules.tick('ravensreach', 6_000);

    expect(board.claimBestTask('Scout', '', 'explorer', undefined, 'lumberjack'))
      .toBeNull();
    const first = board.claimBestTask('Mason', '', 'builder', undefined, 'miner');
    expect(first).toMatchObject({
        assignedBot: 'Mason',
        description:
          'town:ravensreach mine cobblestone and ore from nearby exposed stone (requesting role: miner).',
      });
    schedules.tick('ravensreach', 6_000);
    expect(board.getState().tasks).toHaveLength(1);

    board.completeTask(first!.description, 'Mason');
    schedules.tick('ravensreach', 6_000);
    expect(board.getState().tasks.filter((task) => task.status === 'pending'))
      .toHaveLength(1);
    board.shutdown();
  });

  it('backs off a failed routine family and rotates to useful non-destructive work', () => {
    const board = createBoard();
    const townManager = {
      listResidents: () => [
        {
          id: 'resident-1',
          townId: 'ravensreach',
          botName: 'Mason',
          joinedAt: Date.now(),
          currentRole: 'miner',
          status: 'alive',
        },
      ],
      getTown: () => null,
    } as unknown as TownManager;
    const schedules = new ScheduleManager(townManager, board);

    schedules.tick('ravensreach', 6_000);
    const failed = board.claimBestTask('Mason', '', 'builder', undefined, 'miner');
    board.blockTask(failed!.description, 'Mason', 'protected authored structure');
    const blocked = board.getState().tasks.find((task) => task.id === failed!.id);
    expect(blocked?.failureCount).toBe(1);
    expect(blocked?.retryAfter).toBeGreaterThan(Date.now());

    schedules.tick('ravensreach', 6_000);
    const pending = board.getState().tasks.filter((task) => task.status === 'pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].description).toContain('inspect the approved mine approach');
    expect(pending[0].keywords).toContain('non-destructive');
    board.shutdown();
  });

  it('discards unclaimed prior-phase routines when day or night changes', () => {
    const board = createBoard();
    const townManager = {
      listResidents: () => [{
        id: 'resident-1',
        townId: 'ravensreach',
        botName: 'Mason',
        joinedAt: Date.now(),
        currentRole: 'miner',
        status: 'alive',
      }],
      getTown: () => null,
    } as unknown as TownManager;
    const schedules = new ScheduleManager(townManager, board);

    schedules.tick('ravensreach', 6_000);
    expect(board.getState().tasks).toHaveLength(1);
    expect(board.getState().tasks[0].keywords).toContain('day');

    schedules.tick('ravensreach', 18_000);
    expect(board.getState().tasks).toHaveLength(1);
    expect(board.getState().tasks[0].keywords).toContain('night');
    expect(board.getState().tasks[0].keywords).not.toContain('day');
    board.shutdown();
  });

  it('emits a reviewed cross-city shift with exact waypoints and safety fallback', () => {
    const board = createBoard();
    const townManager = {
      listResidents: () => [
        {
          id: 'resident-1',
          townId: 'ravensreach',
          botName: 'Surveyor',
          joinedAt: Date.now(),
          currentRole: 'guard',
          status: 'alive',
        },
      ],
      getTown: () => ({
        id: 'ravensreach',
        config: {
          citizenRoutine: {
            shifts: [{
              id: 'mainstreet-wayfinding',
              destination: 'MainStreet employee lounge',
              role: 'guard',
              phase: 'day',
              activity: 'inspect employee wayfinding and return to Ravensreach',
              waypoints: [
                { x: -64, y: 82, z: -351 },
                { x: -82, y: 65, z: 90 },
              ],
            }],
          },
        },
      }),
    } as unknown as TownManager;
    const schedules = new ScheduleManager(townManager, board);

    // Reviewed configured shifts are offered before generic semantic patrols.
    schedules.tick('ravensreach', 6_000);

    const task = board.getState().tasks.find((candidate) => candidate.status === 'pending');
    expect(task?.description).toContain('(-64,82,-351) -> (-82,65,90)');
    expect(task?.description).toContain('Do not break or place blocks');
    expect(task?.keywords).toContain('shift:mainstreet-wayfinding');
    expect(task?.metadata).toEqual({
      kind: 'civic-shift',
      version: 2,
      shiftId: 'mainstreet-wayfinding',
      roundTrip: true,
      destinationActivity: 'inspect employee wayfinding and return to Ravensreach',
      waypoints: [
        { x: -64, y: 82, z: -351 },
        { x: -82, y: 65, z: 90 },
      ],
    });
    board.shutdown();
  });

  it('skips malformed persisted shift geometry without breaking generic schedules', () => {
    const board = createBoard();
    const townManager = {
      listResidents: () => [{
        id: 'resident-1',
        townId: 'ravensreach',
        botName: 'Surveyor',
        joinedAt: Date.now(),
        currentRole: 'guard',
        status: 'alive',
      }],
      getTown: () => ({
        id: 'ravensreach',
        config: {
          citizenRoutine: {
            shifts: [{
              id: 'bad-route',
              destination: 'MainStreet',
              role: 'guard',
              phase: 'day',
              activity: 'inspect',
              waypoints: [
                { x: -64, y: 82, z: -351 },
                { x: 'not-a-coordinate', y: 65, z: 90 },
              ],
            }],
          },
        },
      }),
    } as unknown as TownManager;
    const schedules = new ScheduleManager(townManager, board);

    expect(() => schedules.tick('ravensreach', 6_000)).not.toThrow();
    expect(board.getState().tasks).toHaveLength(1);
    expect(board.getState().tasks[0].description).toContain('patrol the town perimeter');
    expect(board.getState().tasks[0].metadata).toBeUndefined();
    board.shutdown();
  });

  it('keeps underground shortage guidance above the configured safety floor', () => {
    const hint = resourceLocaleHint('stone');
    expect(hint).toContain('ABOVE the configured dig-depth floor');
    expect(hint).not.toContain('Y 0 to 48');
  });
});
