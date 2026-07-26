import { describe, it, expect } from 'vitest';

import { validate, stripUncontainedFluids } from '../../src/town/DesignValidator';
import type { BlockPlan } from '../../src/town/LlmDesigner';

/**
 * Regression tests for the Ravensreach well that flooded the town plaza.
 *
 * The LLM designed a perfectly reasonable 66-block well whose only defect was 5
 * UNCONTAINED water sources ringed by dark_oak_stairs. What followed is why this
 * check exists:
 *
 *   1. On flat ground the water sheeted outward ~300 blocks across the plaza.
 *   2. It waterlogged 13 of the well's dark_oak_stairs and 2 stone_brick_slabs.
 *   3. Those 15 waterlogged blocks became PERMANENT HIDDEN SOURCES, feeding ~449
 *      blocks of flow indefinitely — and they were invisible to every tool used to
 *      chase them, because `execute if block ... minecraft:water` does not match a
 *      waterlogged block and `fill ... air replace water` cannot remove one.
 *   4. Because the design was re-placed on every build and repair, draining never
 *      won; the water returned to the identical extent within ~60s each time.
 *
 * The load-bearing insight, and the thing these tests pin down: stairs, slabs,
 * fences, panes, walls and bars LOOK like containment but waterlog instead. Only a
 * full solid block dams a fluid.
 */
const plan = (blocks: Array<[number, number, number, string]>, w = 5, h = 5, d = 5): BlockPlan => ({
  dimensions: { w, h, d },
  kind: 'well',
  style: 'medieval-communal',
  blocks: blocks.map(([x, y, z, name]) => ({ x, y, z, name })),
});

/** A water block boxed in by full solid blocks on all four sides and below. */
const contained = (): BlockPlan =>
  plan([
    [1, 1, 1, 'water'],
    [0, 1, 1, 'cobblestone'], [2, 1, 1, 'cobblestone'],
    [1, 1, 0, 'cobblestone'], [1, 1, 2, 'cobblestone'],
    [1, 0, 1, 'cobblestone'],
  ]);

describe('DesignValidator fluid containment', () => {
  it('accepts water fully boxed in by full solid blocks', () => {
    expect(validate(contained()).ok).toBe(true);
  });

  it('rejects water with an open side — it would sheet out of the footprint', () => {
    const p = contained();
    p.blocks = p.blocks.filter((b) => !(b.x === 2 && b.z === 1)); // remove one wall
    const r = validate(p);
    expect(r.ok).toBe(false);
    expect(r.reasons!.join(' ')).toMatch(/uncontained fluid/i);
  });

  it('rejects water with nothing beneath it', () => {
    const p = contained();
    p.blocks = p.blocks.filter((b) => !(b.y === 0)); // remove the floor
    expect(validate(p).ok).toBe(false);
  });

  it('does NOT accept stairs as containment — this is the actual bug', () => {
    // The real design ringed its water with dark_oak_stairs. Stairs waterlog rather
    // than dam, which is how 15 permanent hidden sources were created.
    const p = plan([
      [1, 1, 1, 'water'],
      [0, 1, 1, 'dark_oak_stairs'], [2, 1, 1, 'dark_oak_stairs'],
      [1, 1, 0, 'dark_oak_stairs'], [1, 1, 2, 'dark_oak_stairs'],
      [1, 0, 1, 'cobblestone'],
    ]);
    const r = validate(p);
    expect(r.ok).toBe(false);
    expect(r.reasons!.join(' ')).toMatch(/waterlog/i);
  });

  it('rejects slabs, fences, panes, walls and bars as containment too', () => {
    for (const shape of ['stone_brick_slab', 'oak_fence', 'glass_pane', 'cobblestone_wall', 'iron_bars']) {
      const p = plan([
        [1, 1, 1, 'water'],
        [0, 1, 1, shape], [2, 1, 1, 'cobblestone'],
        [1, 1, 0, 'cobblestone'], [1, 1, 2, 'cobblestone'],
        [1, 0, 1, 'cobblestone'],
      ]);
      expect(validate(p).ok, `${shape} must not count as containment`).toBe(false);
    }
  });

  it('names the waterlog risk explicitly, so a retry prompt can act on it', () => {
    const p = plan([
      [1, 1, 1, 'water'],
      [0, 1, 1, 'dark_oak_stairs'], [2, 1, 1, 'cobblestone'],
      [1, 1, 0, 'cobblestone'], [1, 1, 2, 'cobblestone'],
      [1, 0, 1, 'cobblestone'],
    ]);
    const reasons = validate(p).reasons!.join(' ');
    expect(reasons).toMatch(/dark_oak_stairs/);
    expect(reasons).toMatch(/hidden sources/i);
  });

  it('treats adjoining water as containment (a body of water is fine)', () => {
    const p = plan([
      [1, 1, 1, 'water'], [1, 1, 2, 'water'],
      [0, 1, 1, 'cobblestone'], [2, 1, 1, 'cobblestone'],
      [1, 1, 0, 'cobblestone'], [1, 0, 1, 'cobblestone'],
      [0, 1, 2, 'cobblestone'], [2, 1, 2, 'cobblestone'],
      [1, 1, 3, 'cobblestone'], [1, 0, 2, 'cobblestone'],
    ]);
    expect(validate(p).ok).toBe(true);
  });

  it('treats y=0 as sitting on the ground, which does contain from below', () => {
    const p = plan([
      [1, 0, 1, 'water'],
      [0, 0, 1, 'cobblestone'], [2, 0, 1, 'cobblestone'],
      [1, 0, 0, 'cobblestone'], [1, 0, 2, 'cobblestone'],
    ]);
    expect(validate(p).ok).toBe(true);
  });

  it('leaves designs with no fluid at all completely unaffected', () => {
    const p = plan([[0, 0, 0, 'cobblestone'], [0, 1, 0, 'cobblestone']]);
    expect(validate(p).ok).toBe(true);
  });
});

describe('stripUncontainedFluids', () => {
  it('removes only the offending fluid and keeps the rest of the build', () => {
    const p = plan([
      [1, 1, 1, 'water'],                                  // open on +x → must go
      [0, 1, 1, 'cobblestone'],
      [1, 1, 0, 'cobblestone'], [1, 1, 2, 'cobblestone'],
      [1, 0, 1, 'cobblestone'],
      // Ground course beneath the walls. Without it, stripping the water orphans
      // them and the floating-block check fails the plan — which is genuine
      // behaviour worth knowing: the salvage path in LlmDesigner re-validates after
      // stripping and declines to salvage when removal leaves the build unsupported.
      [0, 0, 1, 'cobblestone'], [1, 0, 0, 'cobblestone'], [1, 0, 2, 'cobblestone'],
      // Supported from the ground, so removing the water cannot orphan it. Stripping
      // a fluid CAN leave blocks that only touched the fluid floating, which the
      // floating-block check then flags — a real consequence, not a test artefact.
      [3, 0, 3, 'cobblestone'], [3, 1, 3, 'dark_oak_planks'],
    ]);
    const { plan: out, removed } = stripUncontainedFluids(p);
    expect(removed).toHaveLength(1);
    expect(removed[0].name).toBe('water');
    expect(out.blocks).toHaveLength(p.blocks.length - 1);
    // Everything that was not the offending fluid survives.
    expect(out.blocks.some((b) => b.name === 'dark_oak_planks')).toBe(true);
    expect(validate(out).ok).toBe(true);
  });

  it('keeps water that IS contained', () => {
    const { removed } = stripUncontainedFluids(contained());
    expect(removed).toHaveLength(0);
  });

  it('salvages the real Ravensreach case: a good well minus its 5 loose sources', () => {
    // Water ringed by stairs, exactly as designed. Stripping the water yields a dry
    // but structurally correct well — better than a flooded plaza or no well at all.
    // The rim stairs sit on a cobblestone course, as the real well's did, so they
    // stay supported once the water is gone.
    const p = plan([
      [1, 1, 1, 'water'], [1, 2, 1, 'water'],
      [0, 1, 1, 'dark_oak_stairs'], [2, 1, 1, 'dark_oak_stairs'],
      [1, 1, 0, 'dark_oak_stairs'], [1, 1, 2, 'dark_oak_stairs'],
      [0, 0, 1, 'cobblestone'], [2, 0, 1, 'cobblestone'],
      [1, 0, 0, 'cobblestone'], [1, 0, 2, 'cobblestone'],
      [1, 0, 1, 'cobblestone'],
    ]);
    const { plan: out, removed } = stripUncontainedFluids(p);
    expect(removed).toHaveLength(2);
    expect(out.blocks.every((b) => b.name !== 'water')).toBe(true);
    expect(out.blocks.some((b) => b.name === 'dark_oak_stairs')).toBe(true);
    expect(validate(out).ok).toBe(true);
  });

  it('does not mutate the input plan', () => {
    const p = plan([[1, 1, 1, 'water'], [1, 0, 1, 'cobblestone']]);
    const before = p.blocks.length;
    stripUncontainedFluids(p);
    expect(p.blocks).toHaveLength(before);
  });
});
