import { describe, expect, it } from 'vitest';
import { getPathfinderBreakExclusionCost } from '../../src/actions/geofence';
import { applyPathfinderMovementSafety } from '../../src/bot/PathfinderMovementPolicy';

function movementsStub() {
  return {
    canDig: false,
    digCost: 1,
    allow1by1towers: true,
    allowParkour: true,
    exclusionAreasBreak: [] as Array<(block: any) => number>,
    exclusionAreasStep: [] as Array<(block: any) => number>,
  };
}

describe('applyPathfinderMovementSafety', () => {
  it('applies the movement and hard-break policy to any Movements-compatible instance', () => {
    const movements = movementsStub();

    expect(applyPathfinderMovementSafety(movements)).toBe(movements);
    expect(movements.canDig).toBe(true);
    expect(movements.digCost).toBe(12);
    expect(movements.allow1by1towers).toBe(false);
    expect(movements.allowParkour).toBe(false);
    expect(movements.exclusionAreasBreak).toEqual([getPathfinderBreakExclusionCost]);
  });

  it('is idempotent when the same plugin movements survive a respawn', () => {
    const movements = movementsStub();

    applyPathfinderMovementSafety(movements);
    applyPathfinderMovementSafety(movements);

    expect(movements.exclusionAreasBreak).toHaveLength(1);
  });

  it('preserves independent pre-existing exclusions', () => {
    const movements = movementsStub();
    const localExclusion = () => 25;
    movements.exclusionAreasBreak.push(localExclusion);

    applyPathfinderMovementSafety(movements);

    expect(movements.exclusionAreasBreak).toEqual([
      localExclusion,
      getPathfinderBreakExclusionCost,
    ]);
  });

  it('installs an optional civic step exclusion exactly once', () => {
    const movements = movementsStub();
    const civicStepExclusion = () => 100;

    applyPathfinderMovementSafety(movements, civicStepExclusion);
    applyPathfinderMovementSafety(movements, civicStepExclusion);

    expect(movements.exclusionAreasStep).toEqual([civicStepExclusion]);
  });

  it('replaces a stale civic exclusion without removing independent policies', () => {
    const movements = movementsStub();
    const independentExclusion = () => 25;
    const oldCivicExclusion = () => 100;
    const newCivicExclusion = () => 100;
    movements.exclusionAreasStep.push(independentExclusion);

    applyPathfinderMovementSafety(movements, oldCivicExclusion);
    applyPathfinderMovementSafety(movements, newCivicExclusion);

    expect(movements.exclusionAreasStep).toEqual([
      independentExclusion,
      newCivicExclusion,
    ]);
  });
});
