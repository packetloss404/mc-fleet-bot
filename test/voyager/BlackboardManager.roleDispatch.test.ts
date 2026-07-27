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

  it('keeps underground shortage guidance above the configured safety floor', () => {
    const hint = resourceLocaleHint('stone');
    expect(hint).toContain('ABOVE the configured dig-depth floor');
    expect(hint).not.toContain('Y 0 to 48');
  });
});
