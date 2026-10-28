import { describe, expect, it } from 'vitest';

import { buildDeterministicExplorationCode } from '../../src/voyager/DeterministicExplorationCode';
import { inferTaskSpec } from '../../src/voyager/TaskSpec';
import { buildTaskGuidance } from '../../src/voyager/TaskGuidance';
import { extractTaskGoal } from '../../src/voyager/SuccessChecks';

describe('buildDeterministicExplorationCode', () => {
  it('parses both supported directional task word orders', () => {
    expect(buildDeterministicExplorationCode({
      description: 'Explore north for 55 blocks to find iron_ingot',
      keywords: ['explore'],
    })?.execCode).toBe("await exploreDirectionForDistance(bot, 'north', 55);");
    expect(buildDeterministicExplorationCode({
      description: 'Explore 50 blocks to the west',
      keywords: ['explore'],
    })?.execCode).toBe("await exploreDirectionForDistance(bot, 'west', 50);");
  });

  it('does not capture open-ended or excessive movement tasks', () => {
    expect(buildDeterministicExplorationCode({
      description: 'Explore until you find a village',
      keywords: ['explore'],
    })).toBeNull();
    expect(buildDeterministicExplorationCode({
      description: 'Explore east for 9999 blocks',
      keywords: ['explore'],
    })).toBeNull();
  });

  it('extracts the real item from legacy "find new" scarcity tasks', () => {
    const task = {
      description: 'Explore south for 67 blocks to find new iron_ingot',
      keywords: ['explore', 'iron_ingot', 'south'],
    };
    expect(inferTaskSpec(task).target).toBe('iron_ingot');
    expect(extractTaskGoal(task.description).item).toBe('iron_ingot');
    expect(buildTaskGuidance(task).guidance.join(' ')).toContain('(iron_ingot)');
  });
});
