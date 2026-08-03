import { describe, expect, it } from 'vitest';

type CompleteStateModule = typeof import(
  '../../scripts/lib/complete_block_state.mjs'
);

describe('completeBlockState', () => {
  it('fills all default properties while preserving authored overrides', async () => {
    const { completeBlockState } = await import(
      '../../scripts/lib/complete_block_state.mjs'
    ) as CompleteStateModule;

    expect(completeBlockState('minecraft:iron_bars')).toBe(
      'minecraft:iron_bars['
      + 'east=false,north=false,south=false,waterlogged=false,west=false]',
    );
    expect(
      completeBlockState('minecraft:pink_petals[flower_amount=4]'),
    ).toBe('minecraft:pink_petals[facing=north,flower_amount=4]');
    expect(
      completeBlockState('minecraft:oak_leaves[persistent=true]'),
    ).toBe(
      'minecraft:oak_leaves['
      + 'distance=7,persistent=true,waterlogged=false]',
    );
  });

  it('completes high-cardinality states deterministically', async () => {
    const { completeBlockState } = await import(
      '../../scripts/lib/complete_block_state.mjs'
    ) as CompleteStateModule;

    expect(
      completeBlockState('minecraft:chiseled_bookshelf[facing=east]'),
    ).toBe(
      'minecraft:chiseled_bookshelf['
      + 'facing=east,slot_0_occupied=false,slot_1_occupied=false,'
      + 'slot_2_occupied=false,slot_3_occupied=false,'
      + 'slot_4_occupied=false,slot_5_occupied=false]',
    );
  });

  it('rejects malformed and unknown authored properties', async () => {
    const { completeBlockState } = await import(
      '../../scripts/lib/complete_block_state.mjs'
    ) as CompleteStateModule;

    expect(() => completeBlockState(
      'minecraft:oak_log[not_a_property=true]',
    )).toThrow(/unknown property/);
    expect(() => completeBlockState(
      'minecraft:not_a_real_block',
    )).toThrow(/unknown Minecraft block state/);
  });
});
