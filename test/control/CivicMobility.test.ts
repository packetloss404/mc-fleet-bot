import { describe, expect, it } from 'vitest';

import {
  canMoveWithinCivicMobility,
  distanceToCivicMobility,
  getCivicStepExclusionCost,
  isInsideCivicMobility,
} from '../../src/control/CivicMobility';

const boundary = {
  x: 0,
  z: 0,
  radius: 10,
  destinations: [
    { name: 'work', x: 100, z: 0, radius: 8 },
  ],
  corridors: [{
    name: 'surveyed-route',
    width: 3,
    waypoints: [
      { x: 10, z: 0 },
      { x: 50, z: 10 },
      { x: 92, z: 0 },
    ],
  }],
};

describe('CivicMobility', () => {
  it('allows the home district, named destination, and bent corridor', () => {
    expect(isInsideCivicMobility(boundary, { x: 5, z: 5 })).toBe(true);
    expect(isInsideCivicMobility(boundary, { x: 100, z: 7 })).toBe(true);
    expect(isInsideCivicMobility(boundary, { x: 50, z: 12 })).toBe(true);
  });

  it('rejects shortcuts outside surveyed areas', () => {
    expect(isInsideCivicMobility(boundary, { x: 50, z: -20 })).toBe(false);
    expect(canMoveWithinCivicMobility(
      boundary,
      { x: 5, z: 0 },
      { x: 50, z: -20 },
    )).toBe(false);
  });

  it('permits an out-of-bounds recovery step only when it gets closer', () => {
    const stranded = { x: 50, z: -30 };
    const recovering = { x: 50, z: -20 };
    const worsening = { x: 50, z: -40 };
    expect(distanceToCivicMobility(boundary, recovering))
      .toBeLessThan(distanceToCivicMobility(boundary, stranded));
    expect(canMoveWithinCivicMobility(boundary, stranded, recovering)).toBe(true);
    expect(canMoveWithinCivicMobility(boundary, stranded, worsening)).toBe(false);
  });

  it('hard-excludes intermediate A* shortcuts outside the civic network', () => {
    expect(getCivicStepExclusionCost(
      boundary,
      { x: 0, z: 0 },
      { position: { x: 50, z: -20 } },
    )).toBe(100);
    expect(getCivicStepExclusionCost(
      boundary,
      { x: 0, z: 0 },
      { position: { x: 50, z: 10 } },
    )).toBe(0);
  });

  it('fails closed when pathfinder supplies an uninspectable step', () => {
    expect(getCivicStepExclusionCost(boundary, { x: 0, z: 0 }, null)).toBe(100);
    expect(getCivicStepExclusionCost(
      boundary,
      { x: 0, z: 0 },
      { position: { x: Number.NaN, z: 0 } },
    )).toBe(100);
  });
});
