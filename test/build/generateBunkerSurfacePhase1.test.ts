import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bunker-surface-phase1-'));
const outputPath = path.join(tempDir, 'surface.txt');
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const rollbackPath = outputPath.replace(/\.txt$/, '.rollback.txt');
const camerasPath = outputPath.replace(/\.txt$/, '.before-cameras.json');
const preflightPath = outputPath.replace(/\.txt$/, '.preflight.json');
const dryRunPath = outputPath.replace(/\.txt$/, '.dry-run.json');
const regions = path.join(
  ROOT,
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);
const BASELINE_HASH =
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_bunker_surface_phase1.mjs',
      '--out',
      outputPath,
      '--regions',
      regions,
    ],
    { cwd: ROOT },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

interface Operation {
  box: string;
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
        box: fields.slice(1, 7).join(' '),
        expected: fields[7],
        desired: fields[8],
      };
    });
}

describe('MainStreet C01 bunker surface Phase 1', () => {
  it('emits exact-state guards, guarded sign merges, and an inverse rollback', () => {
    const forward = operations(outputPath);
    const rollback = operations(rollbackPath);
    const forwardByBox = new Map(
      forward.map((operation) => [operation.box, operation]),
    );
    const source = fs.readFileSync(outputPath, 'utf8');
    const commands = source
      .split(/\r?\n/)
      .filter((line) => line.startsWith('CMD '));

    expect(forward).toHaveLength(766);
    expect(rollback).toHaveLength(forward.length);
    expect(forwardByBox.size).toBe(forward.length);
    expect(source).not.toMatch(/^SET /m);
    expect(source).toContain(
      'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]',
    );
    expect(source).toContain(
      'minecraft:smooth_quartz_slab[type=bottom,waterlogged=false]',
    );
    expect(source).toContain('minecraft:grass_block[snowy=false]');
    expect(commands).toHaveLength(3);
    expect(commands.every((line) => line.startsWith(
      'CMD execute if block ',
    ))).toBe(true);

    for (const inverse of rollback) {
      const operation = forwardByBox.get(inverse.box);
      expect(operation).toBeDefined();
      expect(inverse.expected).toBe(operation?.desired);
      if (
        operation?.expected === 'minecraft:birch_fence'
        && operation.desired === 'minecraft:air'
      ) {
        expect(inverse.desired).toBe(
          'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]',
        );
      } else {
        expect(inverse.desired).toBe(operation?.expected);
      }
    }
  });

  it('orders neighbor-sensitive removals and narrowly declares fence material guards', () => {
    const forwardLines = fs.readFileSync(outputPath, 'utf8').split(/\r?\n/);
    const rollbackLines = fs.readFileSync(rollbackPath, 'utf8').split(/\r?\n/);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const boundaryAnchor = forwardLines.findIndex((line) => line === (
      'REPL 119 65 231 119 65 231 '
      + 'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true] '
      + 'minecraft:smooth_quartz'
    ));
    const connectedRemoval = forwardLines.findIndex((line) => line === (
      'REPL 120 65 231 121 65 231 minecraft:birch_fence minecraft:air'
    ));
    expect(boundaryAnchor).toBeGreaterThan(0);
    expect(connectedRemoval).toBeGreaterThan(boundaryAnchor);

    const firstRollbackPlant = rollbackLines.findIndex(
      (line) => /^REPL .* minecraft:(?:flowering_)?azalea minecraft:air$/.test(line),
    );
    const firstRollbackLandform = rollbackLines.findIndex(
      (line) => /^REPL .* minecraft:(?:dirt|grass_block\[snowy=false\]) minecraft:air$/.test(line),
    );
    expect(firstRollbackPlant).toBeGreaterThan(0);
    expect(firstRollbackPlant).toBeLessThan(firstRollbackLandform);
    expect(rollbackLines.filter(
      (line) => /^REPL .* minecraft:(?:flowering_)?azalea minecraft:air$/.test(line),
    )).toHaveLength(89);

    expect(report.runtimeSafety.materialExactRemovalExceptions).toEqual([
      expect.objectContaining({
        sourceMaterial: 'minecraft:birch_fence',
        desired: 'minecraft:air',
        cellCount: 5,
        blockEntityCapable: false,
        snapshotWaterlogged: false,
        fluidNeighborCells: [],
      }),
    ]);
    expect(report.runtimeSafety.supportDependentRollbackFirst).toMatchObject({
      vegetationCells: 89,
      wallSignCells: 3,
      passed: true,
    });
  });

  it('pins concealment, protected volumes, parking reconciliation, and road QA', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    expect(report.baseline.observedSha256).toBe(BASELINE_HASH);
    expect(report.baseline.hashMatched).toBe(true);
    expect(report.decisions).toMatchObject({
      deepComplexTranslated: false,
      oldPortalRetired: false,
      observatoryTreatment: 'retained-as-sole-intentional-surface-landmark',
    });
    expect(report.operations).toMatchObject({
      changedCellCount: 28729,
      guardedBoxCount: 766,
      commandCount: 3,
      duplicateTargetCells: 0,
      setOperationCount: 0,
    });
    expect(report.visualEffect.exposedManufacturedFacade.west
      .exposureReductionPercent).toBeGreaterThanOrEqual(90);
    expect(report.visualEffect.exposedManufacturedFacade.east
      .exposureReductionPercent).toBe(100);
    expect(report.visualEffect.exposedManufacturedFacade.southWest
      .exposureReductionPercent).toBeGreaterThanOrEqual(80);
    expect(report.roadQa).toMatchObject({
      width: 6,
      length: 40,
      passed: true,
    });
    expect(report.roadQa.databaseParkingCheck).toMatchObject({
      available: true,
      individualStallCount: 236,
      intersectedStallIds: [],
    });
    expect(report.protected.noInteriorTargets).toBe(true);
    expect(report.protected.loadedChestCoordinates).toHaveLength(12);
    expect(report.acceptance.noSetOperations).toBe(true);
  });

  it('publishes eight exact database features and the before-camera contract', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const cameras = JSON.parse(fs.readFileSync(camerasPath, 'utf8'));

    expect(report.databaseFeatures).toHaveLength(8);
    expect(report.databaseFeatures.find(
      (feature: { externalId: string }) =>
        feature.externalId === 'C01-EAST-EDGE-ROAD-PHASE1',
    )).toMatchObject({
      parentExternalId: 'DIV-C01-SURFACE',
      sourceRef: path.relative(ROOT, outputPath),
      geometry: {
        type: 'bounds',
        minX: 120,
        minY: 64,
        minZ: 206,
        maxX: 125,
        maxY: 67,
        maxZ: 245,
      },
    });
    for (const feature of report.databaseFeatures) {
      expect(Object.keys(feature.qualityStatus).sort()).toEqual([
        'concealment',
        'functional',
        'legibility',
        'media',
      ]);
    }
    expect(cameras.cameras).toHaveLength(8);
    expect(cameras.capturePolicy).toMatchObject({
      sameCameraAfterRequired: true,
      sameLightingAfterRequired: true,
    });
  });

  it('passes frozen exact-state preflight and the strict command dry-run', () => {
    execFileSync(
      process.execPath,
      [
        'scripts/preflight_guarded_ops.mjs',
        outputPath,
        '--regions',
        regions,
        '--report',
        preflightPath,
      ],
      { cwd: ROOT },
    );
    execFileSync(
      'python3',
      [
        'scripts/rcon_runner.py',
        outputPath,
        '--dry-run',
        '--strict-noop',
        '--report',
        dryRunPath,
      ],
      { cwd: ROOT },
    );

    const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
    const dryRun = JSON.parse(fs.readFileSync(dryRunPath, 'utf8'));
    expect(preflight).toMatchObject({
      operationCount: 766,
      passed: 766,
      failed: 0,
    });
    expect(dryRun).toMatchObject({
      status: 'dry_run',
      dryRun: true,
      strictNoop: true,
      sourceOperationCount: 769,
      commandCount: 769,
      worldEditLeftoverCount: 0,
    });
  });
});
