import { describe, expect, it } from 'vitest';
import {
  buildApprovedCivicShiftCode,
  parseApprovedCivicShiftWaypoints,
} from '../../src/voyager/CivicShiftCode';
import { buildTaskPlan } from '../../src/voyager/TaskPlanner';

const reviewedTask = {
  description:
    'work the approved staff shift: follow waypoints ' +
    '(-111,69,-332) -> (-110,69,-317) -> (-82,65,90); inspect without edits.',
  keywords: ['civic-shift', 'shift:mainstreet-day-shift-builder', 'builder', 'non-destructive'],
  metadata: {
    kind: 'civic-shift',
    version: 2,
    shiftId: 'mainstreet-day-shift-builder',
    roundTrip: true,
    destinationActivity: 'Inspect MainStreet façades without editing blocks.',
    waypoints: [
      { x: -111, y: 69, z: -332 },
      { x: -110, y: 69, z: -317 },
      { x: -82, y: 65, z: 90 },
    ],
  },
};

describe('CivicShiftCode', () => {
  it('extracts the exact reviewed route', () => {
    expect(parseApprovedCivicShiftWaypoints(reviewedTask)).toEqual([
      { x: -111, y: 69, z: -332 },
      { x: -110, y: 69, z: -317 },
      { x: -82, y: 65, z: 90 },
    ]);
  });

  it('builds a deterministic inspect-and-return trip that does not consult stale skills', () => {
    const generated = buildApprovedCivicShiftCode(reviewedTask);
    expect(generated?.functionName).toBe('performApprovedCivicShiftRoundTrip');
    expect(generated?.functionCode).toContain('await moveTo(point.x, point.y, point.z, 1, 45)');
    expect(generated?.functionCode).toContain('attempt <= 2');
    expect(generated?.functionCode).toContain('if (!reached)');
    expect(generated?.functionCode).toContain("await follow(waypoints, 'outbound')");
    expect(generated?.functionCode).toContain('await bot.look(yaw, 0)');
    expect(generated?.functionCode).toContain("await follow([...waypoints].reverse(), 'return')");
    expect(generated?.functionCode).toContain('await bot.waitForTicks(220)');
    expect(generated?.functionCode).not.toMatch(/mineBlock|placeItem|exploreUntil/);
  });

  it('preserves the structured contract through task planning', () => {
    const plan = buildTaskPlan(reviewedTask, {
      hasWood: false,
      hasCraftingTable: false,
      hasWoodenPickaxe: false,
      hasWoodenHoe: false,
      hasCobblestone: false,
      canMineStoneTier: false,
      canFarm: false,
    });
    expect(plan.steps).toHaveLength(1);
    expect(buildApprovedCivicShiftCode(plan.steps[0])).not.toBeNull();
  });

  it('refuses prose with coordinates unless tags and structured contract agree', () => {
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      keywords: ['builder', 'non-destructive'],
    })).toBeNull();
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      keywords: ['civic-shift', 'builder'],
    })).toBeNull();
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      metadata: undefined,
    })).toBeNull();
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      keywords: ['civic-shift', 'shift:another-route'],
    })).toBeNull();
  });

  it('refuses malformed or single-point routes', () => {
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      keywords: ['civic-shift', 'shift:one'],
      metadata: {
        kind: 'civic-shift',
        version: 2,
        shiftId: 'one',
        roundTrip: true,
        destinationActivity: 'Inspect.',
        waypoints: [{ x: -111, y: 69, z: -332 }],
      },
    })).toBeNull();
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      keywords: ['civic-shift', 'shift:bad-y'],
      metadata: {
        kind: 'civic-shift',
        version: 2,
        shiftId: 'bad-y',
        roundTrip: true,
        destinationActivity: 'Inspect.',
        waypoints: [
          { x: -111, y: 999, z: -332 },
          { x: -82, y: 65, z: 90 },
        ],
      },
    })).toBeNull();
  });

  it('rejects stale one-way version-1 civic tasks', () => {
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      metadata: {
        ...reviewedTask.metadata,
        version: 1,
      },
    })).toBeNull();
    expect(buildApprovedCivicShiftCode({
      ...reviewedTask,
      metadata: {
        ...reviewedTask.metadata,
        roundTrip: false,
      },
    })).toBeNull();
  });
});
