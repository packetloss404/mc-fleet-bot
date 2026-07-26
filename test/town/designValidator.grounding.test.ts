import { describe, it, expect } from 'vitest';
import { validate } from '../../src/town/DesignValidator';

/**
 * Regression tests for the two defects that let the town brain build the Ravensreach
 * annex: a forge, an inn, a wizard tower and a smeltery whose FITTINGS were placed and
 * whose SHELLS never were. The operator found furniture floating in the sky, and a
 * debris sweep later destroyed one of those buildings as junk.
 *
 * Both defects passed the old validator cleanly, so both get a test built from the
 * exact shape that shipped.
 */

const dims = { w: 16, h: 16, d: 16 };
const plan = (blocks: Array<{ x: number; y: number; z: number; name: string }>) =>
  ({ dimensions: dims, blocks } as any);

/** A slab of fabric on the ground, so plans under test are not rejected for the
 *  unrelated furniture-vs-building reason. */
function floor(y = 0, n = 12) {
  const out = [];
  for (let x = 0; x < n; x++) for (let z = 0; z < n; z++) {
    out.push({ x, y, z, name: 'minecraft:stone_bricks' });
  }
  return out;
}

describe('DesignValidator — ground connectivity', () => {
  it('REJECTS a self-supporting chest column that never reaches the ground', () => {
    // THE ORIGINAL BUG. Every chest has a 6-neighbour (the chest above or below), so
    // the old local-adjacency test passed the whole stack while it hung in mid-air.
    const blocks = [...floor()];
    for (let y = 5; y <= 9; y++) blocks.push({ x: 3, y, z: 3, name: 'minecraft:chest' });
    const r = validate(plan(blocks));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/floating/i);
  });

  it('REJECTS a floating furnace bank, the shape the smeltery actually shipped as', () => {
    const blocks = [...floor()];
    for (let x = 2; x <= 6; x++) for (let y = 6; y <= 8; y++) {
      blocks.push({ x, y, z: 4, name: 'minecraft:furnace' });
    }
    const r = validate(plan(blocks));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/floating/i);
  });

  it('ACCEPTS the same fittings once a wall connects them to the ground', () => {
    // The fix must not reject legitimate designs: identical chests, now reachable.
    const blocks = [...floor()];
    for (let y = 1; y <= 9; y++) blocks.push({ x: 3, y, z: 2, name: 'minecraft:stone_bricks' });
    for (let y = 5; y <= 9; y++) blocks.push({ x: 3, y, z: 3, name: 'minecraft:chest' });
    for (let y = 1; y <= 9; y++) for (const z of [4, 5, 6]) {
      blocks.push({ x: 3, y, z, name: 'minecraft:stone_bricks' });
    }
    const r = validate(plan(blocks));
    expect(r.ok).toBe(true);
  });

  it('still catches a floating beam even though its lantern is exempt', () => {
    // Attachments are unconditionally exempt, because the LLM routinely omits the wall
    // a torch hangs on. That does not create a hole: the BEAM is tested independently
    // and fails on its own, so the cluster cannot be laundered by decorating it.
    const blocks = [...floor()];
    for (let x = 2; x <= 8; x++) blocks.push({ x, y: 10, z: 5, name: 'minecraft:spruce_planks' });
    blocks.push({ x: 5, y: 9, z: 5, name: 'minecraft:lantern' });
    const r = validate(plan(blocks));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/floating/i);
  });

  it('accepts a normal grounded building', () => {
    const blocks = [...floor()];
    for (let y = 1; y <= 4; y++) {
      for (let x = 0; x < 8; x++) {
        blocks.push({ x, y, z: 0, name: 'minecraft:stone_bricks' });
        blocks.push({ x, y, z: 7, name: 'minecraft:stone_bricks' });
      }
      for (let z = 1; z < 7; z++) {
        blocks.push({ x: 0, y, z, name: 'minecraft:stone_bricks' });
        blocks.push({ x: 7, y, z, name: 'minecraft:stone_bricks' });
      }
    }
    blocks.push({ x: 3, y: 1, z: 3, name: 'minecraft:chest' });
    blocks.push({ x: 4, y: 1, z: 3, name: 'minecraft:crafting_table' });
    const r = validate(plan(blocks));
    expect(r.ok).toBe(true);
  });
});

describe('DesignValidator — furniture is not a building', () => {
  it('REJECTS a grounded plan that is all contents and no fabric', () => {
    // The second half of the failure: grounded, so connectivity passes, but there is
    // no wall, floor or roof anywhere. This is what "interiors remain but the walls
    // and roofs are gone" looked like at design time.
    const blocks = [];
    for (let x = 0; x < 6; x++) for (let z = 0; z < 4; z++) {
      blocks.push({ x, y: 0, z, name: 'minecraft:barrel' });
    }
    const r = validate(plan(blocks));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/furniture, not a building/i);
  });

  it('names both the fitting and the fabric counts so the retry prompt can act', () => {
    const blocks = [];
    for (let x = 0; x < 5; x++) for (let z = 0; z < 3; z++) {
      blocks.push({ x, y: 0, z, name: 'minecraft:furnace' });
    }
    const r = validate(plan(blocks));
    expect(r.ok).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/15 fitting block/);
    expect(r.reasons.join(' ')).toMatch(/0 structural block/);
  });

  it('allows a dense workshop when the fabric is actually there', () => {
    const blocks = [...floor(0, 14)];               // 196 fabric
    for (let x = 2; x <= 6; x++) for (let z = 2; z <= 4; z++) {
      blocks.push({ x, y: 1, z, name: 'minecraft:furnace' });   // 15 fittings
    }
    const r = validate(plan(blocks));
    expect(r.ok).toBe(true);
  });

  it('ignores the fabric rule for small decorative plans', () => {
    // Under 8 fittings the rule does not apply: a bench and a pot are not a claim to
    // be a building, and rejecting them would block legitimate small props.
    const blocks = [{ x: 0, y: 0, z: 0, name: 'minecraft:flower_pot' },
                    { x: 1, y: 0, z: 0, name: 'minecraft:decorated_pot' }];
    const r = validate(plan(blocks));
    expect(r.ok).toBe(true);
  });
});
