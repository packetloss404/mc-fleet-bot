import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'manager-vale-cottages-'));
const base = path.join(tempDir, 'manager-vale');
const handoffPath = path.join(tempDir, 'integration-handoff.json');
const auditPath = path.join(tempDir, 'independent-qa.json');
const forwardPath = `${base}.txt`;
const rollbackPath = `${base}.rollback.txt`;
const reportPath = `${base}.report.json`;
const ledgerPath = `${base}.nbt-ledger.json`;
const furnishingPath = `${base}.furnishings.json`;
const privateSuitePath = `${base}.private-suites.json`;
const cameraPath = `${base}.cameras.json`;
const databasePath = `${base}.database-features.json`;

interface Operation {
  point: string;
  expected: string;
  desired: string;
}

function operations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      return {
        point: fields.slice(1, 4).join(' '),
        expected: fields[7],
        desired: fields[8],
      };
    });
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/manager_vale_cottage_compiler.mjs',
      '--out-base',
      base,
      '--handoff',
      handoffPath,
    ],
    { cwd: ROOT },
  );
  execFileSync(
    process.execPath,
    [
      'scripts/qa_manager_vale_cottage_compiler.mjs',
      '--base',
      base,
      '--out',
      auditPath,
    ],
    { cwd: ROOT },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Manager Vale five-cottage compiler', () => {
  it('emits a unique exact-state transaction and bijective rollback', () => {
    const forward = operations(forwardPath);
    const rollback = operations(rollbackPath);
    const forwardByPoint = new Map(
      forward.map((operation) => [operation.point, operation]),
    );

    expect(forward.length).toBeGreaterThan(30_000);
    expect(forwardByPoint.size).toBe(forward.length);
    expect(rollback).toHaveLength(forward.length);
    expect(fs.readFileSync(forwardPath, 'utf8')).not.toMatch(/^SET /m);

    for (const inverse of rollback) {
      const operation = forwardByPoint.get(inverse.point);
      expect(operation).toBeDefined();
      expect(inverse.expected).toBe(operation?.desired);
      expect(inverse.desired).toBe(operation?.expected);
    }
  });

  it('locks the five houses, exact 24 attached bays, rooms, roads, and furnishings', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const furnishings = JSON.parse(
      fs.readFileSync(furnishingPath, 'utf8'),
    ).entries;
    const features = JSON.parse(fs.readFileSync(databasePath, 'utf8')).features;

    expect(report.status).toBe('PASS_OFFLINE_INTEGRATION_READY_LIVE_GATES_PENDING');
    expect(report.source.snapshot).toMatchObject({
      sha256: 'f9a6a21ec115bd556d7626a9b18151b38d1d4f145226c9e3f741de636528eb8e',
      hashMatched: true,
    });
    expect(report.counts).toMatchObject({
      cottages: 5,
      attachedGarages: 5,
      bays: 24,
      garageDoorOpenings: 24,
      garageTurningEnvelopes: 5,
      garageStreetRoutes: 5,
      rooms: 55,
      furnishings: 406,
      cameras: 45,
      roads: 3,
      mainStairs: 5,
      remoteStairs: 5,
    });
    expect(report.garageCapacityByHouse).toEqual({
      'RRCH-ARCHITECT': 6,
      'RRCH-STEWARD': 6,
      'RRCH-MASON': 4,
      'RRCH-SURVEYOR': 4,
      'RRCH-SCOUT': 4,
    });
    expect(report.operations).toMatchObject({
      exactReverseRollback: true,
      setOperationCount: 0,
      fluidTargets: 0,
      preexistingDestinationBlockEntities: 0,
    });
    expect(report.operations.overrideAudit.unreviewedCrossScopeOverrides).toBe(0);
    expect(furnishings).toHaveLength(406);
    expect(new Set(furnishings.map((entry: { id: string }) => entry.id)).size)
      .toBe(406);
    expect(features.filter(
      (feature: { featureType: string }) => feature.featureType === 'building',
    )).toHaveLength(5);
    expect(features.filter(
      (feature: { featureType: string }) => feature.featureType === 'room',
    )).toHaveLength(55);
    expect(features.filter(
      (feature: { featureType: string }) => feature.featureType === 'garage',
    )).toHaveLength(5);
    expect(features.filter(
      (feature: { featureType: string }) => feature.featureType === 'road',
    )).toHaveLength(3);
  });

  it('compiles the complete non-graphic private-suite anatomy and evidence crosswalk', () => {
    const privateSuites = JSON.parse(
      fs.readFileSync(privateSuitePath, 'utf8'),
    );
    const requiredTypes = [
      'VESTIBULE',
      'CANOPY-BED',
      'CHAISE',
      'RATED-SUSPENDED-LOUNGE',
      'CLOSED-TOY-STORAGE',
      'DRESSING-VANITY',
      'WASH',
    ];

    expect(privateSuites.fixtures).toHaveLength(35);
    expect(privateSuites.design.suiteCount).toBe(5);
    expect(privateSuites.design.scheduledFixtureGroups).toBe(35);
    expect(privateSuites.design.everySuiteHasRequiredAnatomy).toBe(true);
    expect(new Set(Object.values(privateSuites.design.themes).map(
      (theme: unknown) => (theme as { id: string }).id,
    )).size).toBe(5);
    expect(privateSuites.design.cameraCrosswalk).toHaveLength(5);
    for (const cottageId of Object.keys(privateSuites.design.themes)) {
      const fixtures = privateSuites.fixtures.filter(
        (entry: { cottageId: string }) => entry.cottageId === cottageId,
      );
      expect(fixtures).toHaveLength(7);
      expect(new Set(fixtures.map(
        (entry: { fixtureType: string }) => entry.fixtureType,
      ))).toEqual(new Set(requiredTypes));
    }
  });

  it('enforces exact protected-NBT commission before any source retirement', () => {
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const copyCommands = fs.readFileSync(
      `${base}.nbt-copy.commands.txt`,
      'utf8',
    ).split(/\r?\n/).filter((line) => line.startsWith('CMD '));
    const verifyCommands = fs.readFileSync(
      `${base}.nbt-verify.commands.txt`,
      'utf8',
    ).split(/\r?\n/).filter((line) => line.startsWith('CMD '));

    expect(ledger.entries).toHaveLength(41);
    expect(ledger.counts.byType).toEqual({
      'minecraft:barrel': 9,
      'minecraft:bed': 11,
      'minecraft:chest': 10,
      'minecraft:chiseled_bookshelf': 1,
      'minecraft:furnace': 7,
      'minecraft:lectern': 3,
    });
    expect(Object.values(ledger.checks).every(Boolean)).toBe(true);
    expect(ledger.sourceRetirementIncluded).toBe(false);
    expect(ledger.sourceRetirementOperationCount).toBe(0);
    expect(ledger.entries.every(
      (entry: { sourceRetirementCommand: null }) =>
        entry.sourceRetirementCommand === null,
    )).toBe(true);
    expect(copyCommands).toHaveLength(41);
    expect(copyCommands.every((line) => line.startsWith(
      'CMD execute if block ',
    ))).toBe(true);
    expect(verifyCommands).toHaveLength(82);
    expect(ledger.commissionBeforeRetireStages.map(
      (stage: { id: string }) => stage.id,
    )).toEqual([
      'COMMISSION-STRUCTURE',
      'SOURCE-NBT-PREFLIGHT',
      'COPY-NBT',
      'VERIFY-DESTINATION',
      'COMMISSION-FUNCTION-AND-MEDIA',
      'RETIRE-SOURCE-SEPARATELY',
    ]);
  });

  it('preserves Scott identity lineage and passes the independent audit', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const handoff = JSON.parse(fs.readFileSync(handoffPath, 'utf8'));
    const cameras = JSON.parse(fs.readFileSync(cameraPath, 'utf8')).cameras;
    const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

    expect(report.identityCrosswalk).toEqual({
      occupantFacingName: 'Scott',
      residenceName: 'Scott House mini-mansion',
      historicalExternalIdAlias: 'RRCH-SCOUT',
      migrationMode: 'atomic-crosswalk-no-duplicate-resident',
    });
    expect(cameras).toHaveLength(45);
    expect(cameras.filter(
      (camera: { id: string }) => camera.id.includes('AFTER-GARAGE'),
    )).toHaveLength(5);
    expect(handoff).toMatchObject({
      status: 'READY_FOR_POST_C01_GENERATOR_INTEGRATION',
      sourceRetirementIncluded: false,
      sourceRetirementOperationCount: 0,
    });
    expect(audit.status).toBe('PASS');
    expect(audit.summary.failed).toBe(0);
  });
});
