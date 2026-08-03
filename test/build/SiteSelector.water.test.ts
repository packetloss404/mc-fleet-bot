import { describe, it, expect } from 'vitest';

import { selectBuildSite, BlockProbe } from '../../src/build/SiteSelector';

/**
 * Regression tests for "the site selector builds in lakes".
 *
 * Ravensreach's TownBrain sited a well at (-45,67,-335), in water. The cause was
 * not randomness — the selector was ATTRACTED to water:
 *
 *   1. `isSolidGround()` treats fluid as not-ground, so `topSolidY()` scans DOWN
 *      THROUGH a lake and returns the lake BED as the surface height.
 *   2. A lake bed is the flattest terrain in Minecraft, so it beat real ground on
 *      the flatness test instead of being rejected by it.
 *   3. `originY = minY + 1` then placed the build floor one block above the bed.
 *   4. The ground-layer fluid probe at `originY - 1` sampled the BED (sand), so
 *      FLUID_PENALTY frequently never fired at all for the case it existed for.
 *
 * Even when the penalty did fire it was only 20 points against a base of 100
 * (+20 near bonus, +10 sunlit), and acceptance was `score > 0` — so a few water
 * blocks were priced in and built over.
 *
 * The world model below is deliberately literal: a lake occupying x < 50 whose
 * surface is y64 and whose bed is y60, and dry flat ground at y64 for x >= 50.
 * The old code preferred the lake (bed is flatter and nearer the reference
 * position); the fix must reject it and walk out to the dry ground.
 */

const LAKE_MAX_X = 20;
const LAKE_SURFACE_Y = 64;
const LAKE_BED_Y = 60;
const GROUND_Y = 64;

/** A world that is lake to the west and dry flat ground to the east. */
function lakeWorld(): BlockProbe {
  return async (x: number, y: number, _z: number) => {
    const inLake = x < LAKE_MAX_X;
    if (inLake) {
      if (y <= LAKE_BED_Y) return { name: 'sand', boundingBox: 'block' };
      if (y <= LAKE_SURFACE_Y) return { name: 'water', boundingBox: 'empty' };
      return { name: 'air', boundingBox: 'empty' };
    }
    if (y <= GROUND_Y) return { name: 'grass_block', boundingBox: 'block' };
    return { name: 'air', boundingBox: 'empty' };
  };
}

/** Entirely lake — there is nowhere dry to go. */
function allWater(): BlockProbe {
  return async (_x: number, y: number, _z: number) => {
    if (y <= LAKE_BED_Y) return { name: 'sand', boundingBox: 'block' };
    if (y <= LAKE_SURFACE_Y) return { name: 'water', boundingBox: 'empty' };
    return { name: 'air', boundingBox: 'empty' };
  };
}

const SIZE = { x: 5, y: 6, z: 5 };
// maxCandidates/maxProbes are set generously because a wide spiral over water is
// expensive: the spiral exhausts its candidate budget ring by ring, and with the
// production default (120 candidates, step 8) it would give up around ring 40 —
// i.e. never reach the shore at all. That is worth knowing for real builds sited
// beside a large lake: the selector may return null simply because it ran out of
// candidates before reaching dry land, not because no dry land exists.
const OPTS = {
  radius: 64, fallbackRadius: 96, step: 8,
  maxCandidates: 400, maxProbes: 500_000, deadlineMs: 30_000,
};

describe('SiteSelector water rejection', () => {
  it('does not place a build in a lake when dry ground exists', async () => {
    // Reference position is in the middle of the lake, so the nearest and
    // flattest candidates are all submerged. It must walk out to dry land.
    const site = await selectBuildSite(lakeWorld(), { x: 0, y: 64, z: 0 }, SIZE, OPTS);

    expect(site).not.toBeNull();
    // Chosen site must be east of the shoreline — entirely out of the water.
    expect(site!.origin.x).toBeGreaterThanOrEqual(LAKE_MAX_X);
    expect(site!.obstacles.fluid).toBe(0);
  });

  it('sits on the dry surface, not one block above a lake bed', async () => {
    const site = await selectBuildSite(lakeWorld(), { x: 0, y: 64, z: 0 }, SIZE, OPTS);
    // The old bug produced originY = LAKE_BED_Y + 1 = 61 (underwater).
    expect(site!.origin.y).not.toBe(LAKE_BED_Y + 1);
    expect(site!.origin.y).toBe(GROUND_Y + 1);
  });

  it('refuses entirely rather than building underwater when everything is lake', async () => {
    // Refusing is correct: TownBrain treats null as "no site, retry later", which
    // is far better than a building at the bottom of a lake.
    const site = await selectBuildSite(allWater(), { x: 0, y: 64, z: 0 }, SIZE, OPTS);
    expect(site).toBeNull();
  });

  it('can be opted out of, for builds that are meant to touch water', async () => {
    // A dock or bridge legitimately sits in water, so the gate is configurable
    // rather than absolute.
    const site = await selectBuildSite(allWater(), { x: 0, y: 64, z: 0 }, SIZE, {
      ...OPTS,
      maxSubmergedCols: 999,
      maxFluidBlocks: 999,
    });
    expect(site).not.toBeNull();
  });

  it('still accepts ordinary dry flat ground', async () => {
    const dry: BlockProbe = async (_x, y) =>
      y <= GROUND_Y ? { name: 'grass_block', boundingBox: 'block' } : { name: 'air', boundingBox: 'empty' };
    const site = await selectBuildSite(dry, { x: 0, y: 64, z: 0 }, SIZE, OPTS);
    expect(site).not.toBeNull();
    expect(site!.origin.y).toBe(GROUND_Y + 1);
    expect(site!.obstacles.fluid).toBe(0);
  });
});
