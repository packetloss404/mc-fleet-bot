import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const CONTRACT_PATH = path.join(
  ROOT,
  'docs/redevelopment/2026-07-28-town-expansion/town-expansion-cross-scope-interface-contracts.json',
);

interface Bounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

interface Contract {
  id: string;
  fromScope: string;
  toScope: string;
  cells: number;
  transitionEvents: number;
  inclusiveBounds: Bounds;
  sortedCellSetSha256: string;
  componentCount: number;
  largestComponentCells: number;
  componentSetSha256: string;
  reason: string;
  geometryEvidence: string;
}

interface AuditInterface extends Contract {
  interfaceId: string;
  review: Contract;
}

interface Audit {
  status: string;
  liveWorldMutated: boolean;
  targetCells: number;
  managerVale: {
    status: string;
    counts: {
      cottages: number;
      bays: number;
      rooms: number;
      furnishings: number;
      privateSuites: number;
      privateSuiteFixtures: number;
      cameras: number;
    };
    operations: {
      changedCellCount: number;
      uniqueTargetCells: number;
      rollbackCellCount: number;
      exactReverseRollback: boolean;
      forwardSha256: string;
      rollbackSha256: string;
      overrideAudit: {
        unreviewedCrossScopeOverrides: number;
      };
    };
    protectedMigration: {
      protectedBlockEntities: number;
      sourceRetirementIncluded: boolean;
      sourceRetirementOperationCount: number;
    };
    ownership: {
      owner: string;
      exactOneCellOperations: number;
      uniqueTargetCells: number;
      sharedModelTargetIntersections: number;
      intersectionExamples: unknown[];
      scopes: Array<{
        scope: string;
        targetCells: number;
      }>;
    };
  };
  canonicalOwnershipAssignments: Array<{ scope: string; owner: string }>;
  reviewedInterfaces: AuditInterface[];
  unreviewedInterfaces: AuditInterface[];
  observedInterfaces: Array<{
    fromScope: string;
    toScope: string;
    cells: number;
  }>;
}

let audit: Audit;
let contracts: {
  schemaVersion: number;
  status: string;
  wildcardsAllowed: boolean;
  driftAction: string;
  interfaces: Contract[];
};

beforeAll(() => {
  audit = JSON.parse(execFileSync(
    process.execPath,
    ['scripts/generate_town_expansion_r1.mjs', '--audit-cross-scope-only'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    },
  ));
  contracts = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));
}, 120000);

describe('Town Expansion global cross-scope release gate', () => {
  it('passes the complete model with no unreviewed or stale approved interface', () => {
    expect(audit.status).toBe('GLOBAL_CROSS_SCOPE_INTERFACE_GATE_PASS');
    expect(audit.liveWorldMutated).toBe(false);
    expect(audit.targetCells).toBeGreaterThan(6_000_000);
    expect(audit.reviewedInterfaces).toHaveLength(13);
    expect(audit.unreviewedInterfaces).toEqual([]);
    expect(audit.observedInterfaces).toHaveLength(13);
  });

  it('binds every observed interface to exact geometry and component hashes', () => {
    expect(contracts).toMatchObject({
      schemaVersion: 2,
      status: 'APPROVED_EXACT_DEFAULT_DENY',
      wildcardsAllowed: false,
      driftAction: 'ABORT_GENERATION',
    });
    expect(contracts.interfaces).toHaveLength(13);

    const observedIds = new Set(audit.observedInterfaces.map(
      ({ fromScope, toScope }) => `${fromScope} -> ${toScope}`,
    ));
    const contractIds = new Set(contracts.interfaces.map(
      ({ fromScope, toScope }) => `${fromScope} -> ${toScope}`,
    ));
    expect(contractIds).toEqual(observedIds);

    for (const contract of contracts.interfaces) {
      expect(contract.id).not.toContain('*');
      expect(contract.fromScope).not.toContain('*');
      expect(contract.toScope).not.toContain('*');
      expect(contract.cells).toBeGreaterThan(0);
      expect(contract.transitionEvents).toBeGreaterThanOrEqual(contract.cells);
      expect(contract.componentCount).toBeGreaterThan(0);
      expect(contract.largestComponentCells).toBeLessThanOrEqual(contract.cells);
      expect(contract.sortedCellSetSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(contract.componentSetSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(contract.reason.length).toBeGreaterThan(30);
      expect(contract.geometryEvidence.length).toBeGreaterThan(30);
    }
  });

  it('uses one owner for former longitudinal roads and parent-child programs', () => {
    const owners = new Map(audit.canonicalOwnershipAssignments.map(
      ({ scope, owner }) => [scope, owner],
    ));
    for (const scope of [
      'TE-ROAD-01',
      'TE-WL-FREIGHT',
      'TE-WL-PARKWAY-EXTENSION',
      'TE-PAN-RV01-ROAD',
    ]) {
      expect(owners.get(scope)).toBe('TE-REGIONAL-APPROACH-ROAD');
    }
    expect(owners.get('TE-WL-RAVENCREST-GATE')).toBe('TE-WL-RAVENCREST');
    expect(owners.get('TE-WL-NORTHWIND-WAVE')).toBe('TE-WL-NORTHWIND');
    expect(owners.get('TE-OBS-PORTAL-SPARE-B')).toBe(
      'TE-OBSERVATORY-MEGA-ESTATE',
    );
    expect(owners.get('TE-PAN-RV48-D')).toBe('TE-PAN-RV01-DEALERSHIP');

    const observedIds = audit.observedInterfaces.map(
      ({ fromScope, toScope }) => `${fromScope} -> ${toScope}`,
    );
    expect(observedIds).not.toContain(
      'TE-WL-FREIGHT -> TE-WL-PARKWAY-EXTENSION',
    );
    expect(observedIds).not.toContain(
      'TE-WL-CRATER-WEST-GREEN-LINK -> TE-WL-HL-A',
    );
    expect(observedIds).not.toContain(
      'TE-OASIS-01 -> TE-PAN-RV01-ROAD',
    );
  });

  it('integrates the exact Manager Vale module with zero shared ownership overlap', () => {
    expect(audit.managerVale.status).toBe(
      'PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING',
    );
    expect(audit.managerVale.counts).toMatchObject({
      cottages: 5,
      bays: 24,
      rooms: 55,
      furnishings: 406,
      privateSuites: 5,
      privateSuiteFixtures: 35,
      cameras: 45,
    });
    expect(audit.managerVale.operations).toMatchObject({
      changedCellCount: 37_584,
      uniqueTargetCells: 37_584,
      rollbackCellCount: 37_584,
      exactReverseRollback: true,
      forwardSha256:
        'b6a37a4c98fc117d2a6f7d2af360091ab75b9ce197f3b964c0b6350838100c96',
      rollbackSha256:
        '3a8cc167d0247fdfbed2e03789cad6c7b8999adcfc1fc3afb6f615faecfdfc81',
    });
    expect(
      audit.managerVale.operations.overrideAudit.unreviewedCrossScopeOverrides,
    ).toBe(0);
    expect(audit.managerVale.ownership).toMatchObject({
      owner:
        'scripts/manager_vale_cottage_compiler.mjs#compileManagerValeCottages',
      exactOneCellOperations: 37_584,
      uniqueTargetCells: 37_584,
      sharedModelTargetIntersections: 0,
      intersectionExamples: [],
    });
    expect(audit.managerVale.ownership.scopes.length).toBeGreaterThan(40);
    expect(audit.managerVale.protectedMigration).toMatchObject({
      protectedBlockEntities: 41,
      sourceRetirementIncluded: false,
      sourceRetirementOperationCount: 0,
    });
  });
});
