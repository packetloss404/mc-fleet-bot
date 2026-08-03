import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bunker-portal-phase2-'));
const outputPath = path.join(tempDir, 'portal.txt');
const reportPath = outputPath.replace(/\.txt$/, '.report.json');
const rollbackPath = outputPath.replace(/\.txt$/, '.rollback.txt');
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
      'scripts/generate_bunker_recessed_portal_phase2.mjs',
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

describe('MainStreet C01 recessed portal Phase 2', () => {
  it('emits exact guarded operations, a guarded sign merge, and an inverse rollback', () => {
    const forward = operations(outputPath);
    const rollback = operations(rollbackPath);
    const forwardByBox = new Map(
      forward.map((operation) => [operation.box, operation]),
    );
    const commands = fs.readFileSync(outputPath, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('CMD '));

    expect(forward).toHaveLength(79);
    expect(rollback).toHaveLength(forward.length);
    expect(forwardByBox.size).toBe(forward.length);
    expect(commands).toHaveLength(1);
    expect(commands[0]).toMatch(
      /^CMD execute if block 146 65 187 minecraft:oak_wall_sign\[facing=west,waterlogged=false\] run data merge block /,
    );
    expect(forward.some((operation) => operation.desired.includes(
      'polished_deepslate_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    ))).toBe(true);
    expect(fs.readFileSync(outputPath, 'utf8')).not.toMatch(/^SET /m);

    for (const inverse of rollback) {
      const operation = forwardByBox.get(inverse.box);
      expect(operation).toBeDefined();
      expect(inverse.expected).toBe(operation?.desired);
      expect(inverse.desired).toBe(operation?.expected);
    }
  });

  it('pins the snapshot, clear route, hazards, cover, and protected-space clearances', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    expect(report.baseline.observedSha256).toBe(BASELINE_HASH);
    expect(report.baseline.hashMatched).toBe(true);
    expect(report.design.oldPortalRemainsOperational).toBe(true);
    expect(report.design.mouth).toMatchObject({
      orientation: 'south-facing',
      clearWidth: 5,
      clearHeight: 4,
    });
    expect(report.design.lobbyConnection.substratePreserved).toContain(
      'outside both target cells and the one-cell safety halo',
    );
    expect(report.safety.blockEntityCensus).toMatchObject({
      count: 0,
      passed: true,
    });
    expect(report.safety.targetHazards).toEqual([]);
    expect(report.safety.safetyHaloHazards).toEqual([]);
    expect(report.safety.minimumNaturalCover).toBeGreaterThanOrEqual(3);
    expect(report.safety.coverChecks.passed).toBe(true);
    expect(report.safety.commandGuards).toMatchObject({
      count: 1,
      exactDesiredBlockPredicateRequired: true,
      allCommandsGuarded: true,
    });
    expect(report.safety.unapprovedDatabaseIntersections).toEqual([]);
    expect(
      report.safety.database2dOnlyClearance.map(
        (feature: { external_id: string }) => feature.external_id,
      ),
    ).toContain('C01-LOWER-THEATER');
    expect(report.operations).toMatchObject({
      changedCellCount: 1632,
      guardedBoxCount: 79,
      commandCount: 1,
      setOperationCount: 0,
      duplicateTargetCells: 0,
    });
    expect(report.retirementGate.oldPortalClosureIncluded).toBe(false);
    expect(report.acceptance.dynamicEntitySweepRequired).toBe(true);
    expect(report.runtimeSafety).toMatchObject({
      supportDependentRollbackFirst: {
        blocks: ['minecraft:oak_wall_sign'],
        cells: 1,
        passed: true,
      },
      desiredStateNormalization: {
        statefulBlock: 'minecraft:polished_deepslate_stairs',
        cells: 20,
        authoredShape: 'straight',
        perpendicularNeighborPairs: [],
        passed: true,
      },
      materialExactRemovalExceptions: [],
    });

    const firstRollback = fs.readFileSync(rollbackPath, 'utf8')
      .split(/\r?\n/)
      .find((line) => line.startsWith('REPL '));
    expect(firstRollback).toMatch(
      /^REPL 146 65 187 146 65 187 minecraft:oak_wall_sign\[facing=west,waterlogged=false\] minecraft:stone$/,
    );
  });

  it('publishes exact database feature geometry and four separate quality statuses', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

    expect(report.databaseFeatures).toHaveLength(3);
    expect(report.databaseFeatures[0]).toMatchObject({
      externalId: 'C01-PUBLIC-PORTAL-RECESSED-PHASE2',
      parentExternalId: 'C01',
      sourceRef: path.relative(ROOT, outputPath),
      geometry: {
        type: 'bounds',
        minX: 139,
        minY: 62,
        minZ: 163,
        maxX: 147,
        maxY: 69,
        maxZ: 201,
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
      operationCount: 79,
      passed: 79,
      failed: 0,
    });
    expect(dryRun).toMatchObject({
      status: 'dry_run',
      dryRun: true,
      strictNoop: true,
      sourceOperationCount: 80,
      commandCount: 80,
      worldEditLeftoverCount: 0,
    });
  });
});
