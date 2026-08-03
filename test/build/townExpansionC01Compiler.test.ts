import { describe, expect, it } from 'vitest';

import { modelC01FiveLevelBunker } from '../../scripts/town_expansion_c01_compiler.mjs';

interface Cell {
  x: number;
  y: number;
  z: number;
  state: string;
  scope: string;
  role: string;
  phase: number;
}

class TestModel {
  cells = new Map<string, Cell>();

  set(
    x: number,
    y: number,
    z: number,
    state: string,
    metadata: Pick<Cell, 'scope' | 'role' | 'phase'>,
  ) {
    this.cells.set(`${x},${y},${z}`, {
      x,
      y,
      z,
      state,
      ...metadata,
    });
  }

  box(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    state: string,
    metadata: Pick<Cell, 'scope' | 'role' | 'phase'>,
    predicate: null | ((x: number, y: number, z: number) => boolean) = null,
  ) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
      for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
        for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
          if (!predicate || predicate(x, y, z)) {
            this.set(x, y, z, state, metadata);
          }
        }
      }
    }
  }
}

describe('town expansion C01 compiler', () => {
  it('authors the frozen buried vehicle-garage bunker and preserves fail-closed counts', async () => {
    const model = new TestModel();
    const snapshot = {
      blockEntitiesInBox: async () => [],
    };
    const report = await modelC01FiveLevelBunker(model, snapshot);

    expect(report.status).toBe('C01_SOURCE_MODEL_PASS_LIVE_GATES_PENDING');
    expect(report.manifest.classifiedCells).toBe(885022);
    expect(report.manifest.occupiedRoomAndRouteObjects).toBe(165);
    expect(report.manifest.cameras).toBe(165);
    expect(report.garage.vehicleCount).toBe(24);
    expect(report.garage.activeHangarProgram).toBe(false);
    expect(report.tagCounts.public_adult_private_room).toBe(24);
    expect(report.tagCounts.public_adult_one_to_one_room).toBe(5);
    expect(report.tagCounts.owner_private_adult_room).toBe(12);
    expect(report.tagCounts.poly_suite).toBe(15);
    expect(report.tagCounts.master_bedroom).toBe(3);
    expect(report.tagCounts.master_kitchen).toBe(2);
    expect(report.containment.activePortalCells).toBe(28);
    expect(report.migration.counts).toMatchObject({
      blockEntities: 1896,
      inventories: 1622,
      itemStacks: 92,
      totalItemCount: 5132,
      move: 1619,
      retain: 277,
    });
    expect(report.migrationPlacements.placements).toBe(1619);
    expect(report.migrationPlacements.companions).toBe(25);
    expect(report.deferredScopes).toEqual(['c01_source_exact_retirement']);
    expect(Object.values(report.checks).every(Boolean)).toBe(true);

    const forbiddenRoles = [...model.cells.values()].filter((cell) => (
      /(?:aircraft|hangar|arena|stadium)/i.test(cell.role)
    ));
    expect(forbiddenRoles).toEqual([]);
    const activePortals = [...model.cells.values()].filter((cell) => (
      cell.state.startsWith('minecraft:nether_portal')
    ));
    expect(activePortals).toHaveLength(28);
    expect(activePortals.every(
      (cell) => cell.scope === 'c01_east_l5_power_escape',
    )).toBe(true);
  }, 20000);
});
