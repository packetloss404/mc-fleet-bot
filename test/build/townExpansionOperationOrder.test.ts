import { describe, expect, it } from 'vitest';

describe('Town Expansion operation ordering', () => {
  it('clears dependent blocks from the top down within one work group', async () => {
    const { compareOperationOrder } = await import(
      '../../scripts/lib/town_operation_order.mjs'
    );
    const common = {
      phase: 10,
      scope: 'TE-ATTACHED-GARAGE-H07',
      role: 'attached_garage_clearance',
      x1: 43,
      z1: 38,
      replacement: 'minecraft:air',
    };
    const operations = [
      { ...common, y1: 73 },
      { ...common, y1: 74 },
    ].sort(compareOperationOrder);

    expect(operations.map(({ y1 }) => y1)).toEqual([74, 73]);
  });

  it('retains bottom-up ordering for construction operations', async () => {
    const { compareOperationOrder } = await import(
      '../../scripts/lib/town_operation_order.mjs'
    );
    const common = {
      phase: 20,
      scope: 'TEST',
      role: 'construction',
      x1: 0,
      z1: 0,
      replacement: 'minecraft:stone_bricks',
    };
    const operations = [
      { ...common, y1: 75 },
      { ...common, y1: 70 },
    ].sort(compareOperationOrder);

    expect(operations.map(({ y1 }) => y1)).toEqual([70, 75]);
  });
});
