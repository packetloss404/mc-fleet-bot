import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

type FenceModule = typeof import('../../scripts/generate_picket_fence.mjs');

let fence: FenceModule;
let plan: ReturnType<FenceModule['loadFencePlan']>;

beforeAll(async () => {
  // The production generator is an executable ESM script with exported pure
  // helpers; importing it does not run its CLI entrypoint.
  fence = await import('../../scripts/generate_picket_fence.mjs');
  plan = fence.loadFencePlan(
    path.resolve('mainstreet-america/planning/picket-fence.yaml'),
  );
});

describe('generate_picket_fence', () => {
  it('retains complete, deterministically ordered block properties', () => {
    const snapshot = new fence.AnvilSnapshot('/not-used-by-this-test');
    const chunk = {
      sections: new Map([
        [4, {
          palette: [{
            Name: 'minecraft:birch_fence',
            Properties: {
              west: 'true',
              waterlogged: 'false',
              south: 'false',
              north: 'false',
              east: 'true',
            },
          }],
        }],
      ]),
    };

    expect(snapshot.blockName(chunk, 0, 64, 0)).toBe('minecraft:birch_fence');
    expect(snapshot.blockState(chunk, 0, 64, 0)).toBe(
      'minecraft:birch_fence['
      + 'east=true,north=false,south=false,waterlogged=false,west=true]',
    );
  });

  it('builds one unique 2,440-column ring and preserves all five gate openings', () => {
    const columns = fence.buildPerimeterColumns(plan, 'full');
    const keys = new Set(columns.map((column) => `${column.x},${column.z}`));
    const open = columns.filter((column) => column.gate);
    const byGate = Object.fromEntries(
      plan.gates.map((gate: { id: string; width: number }) => [
        gate.id,
        open.filter((column) => column.gate === gate.id).length,
      ]),
    );

    expect(columns).toHaveLength(2440);
    expect(keys.size).toBe(columns.length);
    expect(open).toHaveLength(97);
    for (const gate of plan.gates) {
      expect(byGate[gate.id]).toBe(gate.width);
    }
  });

  it('selects exactly the approved 32-block south pilot outside every gate', () => {
    const pilot = fence.buildPerimeterColumns(plan, 'pilot');

    expect(pilot).toHaveLength(32);
    expect(pilot.every((column) => column.side === 'south' && column.z === 305)).toBe(true);
    expect(Math.min(...pilot.map((column) => column.x))).toBe(20);
    expect(Math.max(...pilot.map((column) => column.x))).toBe(51);
    expect(pilot.every((column) => !column.gate)).toBe(true);
  });

  it('ignores tree foliage and replaceable plants when finding real support', () => {
    const blocks = new Map<number, string>([
      [72, 'minecraft:oak_leaves'],
      [71, 'minecraft:oak_log'],
      [65, 'minecraft:short_grass'],
      [64, 'minecraft:grass_block'],
    ]);
    const support = fence.findSafeSupport(
      { get: (y: number) => blocks.get(y) ?? 'minecraft:air' },
      -64,
      200,
    );

    expect(support.y).toBe(64);
    expect(support.block).toBe('minecraft:grass_block');
    expect(support.kind).toBe('land');
    expect(support.ignoredFoliage).toHaveLength(2);
    expect(fence.isFoliageBlock(support.block!)).toBe(false);
  });

  it('treats aquatic plants as vegetation and finds the water support below', () => {
    const blocks = new Map<number, string>([
      [64, 'minecraft:lily_pad'],
      [63, 'minecraft:seagrass'],
      [62, 'minecraft:water'],
    ]);
    const support = fence.findSafeSupport(
      { get: (y: number) => blocks.get(y) ?? 'minecraft:air' },
      -64,
      200,
    );

    expect(support.y).toBe(62);
    expect(support.block).toBe('minecraft:water');
    expect(support.kind).toBe('water');
    expect(support.ignoredReplaceable).toHaveLength(2);
  });

  it('can ignore an existing planned fence assembly when locating terrain', () => {
    const blocks = new Map<number, string>([
      [66, 'minecraft:smooth_quartz_slab'],
      [65, 'minecraft:white_concrete'],
      [64, 'minecraft:birch_fence'],
      [63, 'minecraft:grass_block'],
    ]);
    const support = fence.findSafeSupport(
      { get: (y: number) => blocks.get(y) ?? 'minecraft:air' },
      -64,
      200,
      (block: string) => new Set([
        'minecraft:smooth_quartz_slab',
        'minecraft:white_concrete',
        'minecraft:birch_fence',
      ]).has(block),
    );

    expect(support.y).toBe(63);
    expect(support.block).toBe('minecraft:grass_block');
    expect(support.ignoredPlanned).toHaveLength(3);
  });

  it('merges only contiguous operations with identical snapshot guards', () => {
    const base = {
      y: 64,
      z: 305,
      block: 'minecraft:birch_fence',
      expected: 'minecraft:air',
      role: 'field',
      phase: 1,
      side: 'south',
    };
    const merged = fence.mergePlacements([
      { ...base, x: 20 },
      { ...base, x: 21 },
      { ...base, x: 22, expected: 'minecraft:short_grass' },
      { ...base, x: 24 },
    ]);

    expect(merged).toHaveLength(3);
    expect(merged[0]).toMatchObject({ x1: 20, x2: 21, expected: 'minecraft:air' });
    expect(merged[1]).toMatchObject({ x1: 24, x2: 24, expected: 'minecraft:air' });
    expect(merged[2]).toMatchObject({ x1: 22, x2: 22, expected: 'minecraft:short_grass' });
  });

  it('routes a collided column outward with orthogonal connector cells', async () => {
    const fakeSnapshot = {
      async readColumn(x: number, z: number) {
        return {
          x,
          z,
          get(y: number) {
            if (x === 35 && z === 305 && y === 64) return 'minecraft:oak_log';
            if (y === 63) return 'minecraft:grass_block';
            return 'minecraft:air';
          },
        };
      },
    };
    const generated = await fence.generateFence({
      plan,
      snapshot: fakeSnapshot,
      mode: 'pilot',
      yMin: -64,
      yMax: 200,
    });

    expect(generated.stats.requestedFenceColumns).toBe(32);
    expect(generated.stats.readyFenceColumns).toBe(32);
    expect(generated.stats.baselineCollisionColumns).toBe(1);
    expect(generated.stats.resolvedBaselineCollisionColumns).toBe(1);
    expect(generated.stats.skippedFenceColumns).toBe(0);
    expect(generated.stats.collisionColumns).toBe(0);
    expect(generated.stats.orthogonalConnectorColumns).toBeGreaterThanOrEqual(2);
    expect(generated.stats.nonOrthogonalPathEdges).toBe(0);
    expect(generated.pathNodes).toContainEqual(expect.objectContaining({
      originalX: 35,
      originalZ: 305,
      primary: true,
      outwardDepth: 1,
    }));
    const nodes = new Map(
      generated.pathNodes.map((node) => [`${node.x},${node.z}`, node]),
    );
    for (const edge of generated.pathEdges) {
      const first = nodes.get(edge.a)!;
      const second = nodes.get(edge.b)!;
      expect(Math.abs(first.x - second.x) + Math.abs(first.z - second.z)).toBe(1);
    }
  });

  it('exact-mask trims a canopy only after moving the route outward', async () => {
    const fakeSnapshot = {
      async readColumn(x: number, z: number) {
        return {
          x,
          z,
          get(y: number) {
            if (x === 35 && z >= 305 && z <= 309 && y === 64) {
              return 'minecraft:oak_leaves';
            }
            if (y === 63) return 'minecraft:grass_block';
            return 'minecraft:air';
          },
        };
      },
    };
    const generated = await fence.generateFence({
      plan,
      snapshot: fakeSnapshot,
      mode: 'pilot',
      yMin: -64,
      yMax: 200,
    });

    expect(generated.stats.baselineCollisionColumns).toBe(1);
    expect(generated.stats.resolvedBaselineCollisionColumns).toBe(1);
    expect(generated.stats.trimmedFoliageBlocks).toBeGreaterThanOrEqual(1);
    expect(generated.trimmedFoliage.every((item) => item.z > 305)).toBe(true);
    expect(generated.trimmedFoliage.every(
      (item) => item.expected === 'minecraft:oak_leaves',
    )).toBe(true);
    expect(generated.collisions).toHaveLength(0);
  });

  it('fills steep terrain changes with solid white grade connectors', async () => {
    const fakeSnapshot = {
      async readColumn(x: number, z: number) {
        const supportY = x === 34 && z === 305 ? 67 : 63;
        return {
          x,
          z,
          get(y: number) {
            return y === supportY ? 'minecraft:grass_block' : 'minecraft:air';
          },
        };
      },
    };
    const generated = await fence.generateFence({
      plan,
      snapshot: fakeSnapshot,
      mode: 'pilot',
      yMin: -64,
      yMax: 200,
    });

    const gradeBreak = generated.gradeBreaks.find((item) => Math.abs(item.delta) === 4);
    expect(gradeBreak).toBeDefined();
    expect(generated.stats.unresolvedGradeDiscontinuities).toBe(0);
    const lower = gradeBreak!.lowerNode.split(',').map(Number);
    const connectorYs = generated.placements
      .filter((item) => (
        item.x === lower[0]
        && item.z === lower[1]
        && item.role === 'grade_post'
      ))
      .map((item) => item.y);
    expect(Math.min(...connectorYs)).toBeLessThan(gradeBreak!.requiredTopY);
    expect(Math.max(...connectorYs)).toBe(gradeBreak!.requiredTopY);
  });

  it('keeps all five gate corridors as the only full-ring path breaks', async () => {
    const fakeSnapshot = {
      async readColumn(x: number, z: number) {
        return {
          x,
          z,
          get(y: number) {
            return y === 63 ? 'minecraft:grass_block' : 'minecraft:air';
          },
        };
      },
    };
    const generated = await fence.generateFence({
      plan,
      snapshot: fakeSnapshot,
      mode: 'full',
      yMin: -64,
      yMax: 200,
    });

    expect(generated.openColumns).toHaveLength(97);
    expect(generated.gateViolations).toHaveLength(0);
    expect(generated.stats.graphComponents).toBe(5);
    expect(generated.stats.pathEndpointNodes).toBe(10);
    expect(generated.stats.pathBranchNodes).toBe(0);
  });
});
