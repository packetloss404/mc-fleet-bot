import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Bots default to tunnelling down when a surface resource isn't visible, then
 * get entombed tens of blocks under the map — after which every surface task
 * fails permanently ("Mine 1 oak log" was attempted 4,357 times at a 2% pass
 * rate while the fleet sat at y14-y52). The floor makes that impossible.
 */
vi.mock('../../src/config', () => ({ loadConfig: () => mockCfg }));
let mockCfg: any;

import {
  _resetGeofenceCache,
  getMinDigY,
  getPathfinderBreakExclusionCost,
  isBelowDigFloor,
} from '../../src/actions/geofence';

beforeEach(() => { _resetGeofenceCache(); });
afterEach(() => { _resetGeofenceCache(); });

describe('dig depth floor', () => {
  it('fails open when no floor is configured', () => {
    mockCfg = { mining: {} };
    expect(getMinDigY()).toBeNull();
    expect(isBelowDigFloor(0, -50, 0)).toBe(false);
  });

  it('refuses digs below the floor', () => {
    mockCfg = { mining: { minDigY: 58 } };
    expect(isBelowDigFloor(0, 57, 0)).toBe(true);
    expect(isBelowDigFloor(0, 14, 0)).toBe(true);
  });

  it('allows digs at or above the floor', () => {
    mockCfg = { mining: { minDigY: 58 } };
    expect(isBelowDigFloor(0, 58, 0)).toBe(false);
    expect(isBelowDigFloor(0, 64, 0)).toBe(false);
  });

  it('exempts the communal mine site so deep extraction still works', () => {
    mockCfg = { mining: { minDigY: 58, mineSite: { x: 100, y: 64, z: 100, radius: 24 } } };
    // Inside the mine radius: deep digging is sanctioned.
    expect(isBelowDigFloor(100, 10, 100)).toBe(false);
    expect(isBelowDigFloor(115, 10, 100)).toBe(false);
    // Outside it: refused.
    expect(isBelowDigFloor(140, 10, 100)).toBe(true);
  });

  it('uses a 24-block default radius when the site omits one', () => {
    mockCfg = { mining: { minDigY: 58, mineSite: { x: 0, y: 64, z: 0 } } };
    expect(isBelowDigFloor(20, 10, 0)).toBe(false);
    expect(isBelowDigFloor(30, 10, 0)).toBe(true);
  });

  it('hard-excludes below-floor breaks from path planning outside the mine', () => {
    mockCfg = { mining: { minDigY: 58, mineSite: { x: 100, y: 64, z: 100, radius: 24 } } };
    expect(getPathfinderBreakExclusionCost({
      position: { x: 140, y: 57, z: 100 },
    })).toBe(100);
    expect(getPathfinderBreakExclusionCost({
      position: { x: 100, y: 10, z: 100 },
    })).toBe(0);
  });
});
