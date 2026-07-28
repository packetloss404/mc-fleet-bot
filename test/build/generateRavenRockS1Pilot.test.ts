import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ravenrock-s1-pilot-'));
const basePath = path.join(tempDir, 'pilot');
const outputPath = `${basePath}.txt`;
const rollbackPath = `${basePath}.rollback.txt`;
const reportPath = `${basePath}.report.json`;
const prestatePath = `${basePath}.prestate.json`;
const qaPath = `${basePath}.qa.json`;
const preflightPath = `${basePath}.preflight.json`;
const regions = path.join(
  ROOT,
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_ravenrock_s1_pilot.mjs',
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

function operations(filename: string) {
  return fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      return {
        first: fields.slice(1, 4).map(Number),
        second: fields.slice(4, 7).map(Number),
        expected: fields[7],
        desired: fields[8],
      };
    });
}

describe('Raven Rock S1 section pilot', () => {
  it('emits a unique, one-cell, exact-guard package and reverse rollback', () => {
    const forward = operations(outputPath);
    const rollback = operations(rollbackPath);
    const targets = forward.map((operation) => operation.first.join(','));

    expect(forward).toHaveLength(335);
    expect(rollback).toHaveLength(forward.length);
    expect(new Set(targets).size).toBe(forward.length);
    expect(forward.every((operation) =>
      operation.first.join(',') === operation.second.join(','))).toBe(true);

    for (let index = 0; index < forward.length; index += 1) {
      const operation = forward[index];
      const inverse = rollback[rollback.length - index - 1];
      expect(inverse.first).toEqual(operation.first);
      expect(inverse.expected).toBe(operation.desired);
      expect(inverse.desired).toBe(operation.expected);
    }
  });

  it('pins the immutable snapshot and the complete design prestate', () => {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const prestate = JSON.parse(fs.readFileSync(prestatePath, 'utf8'));

    expect(report.baseline.sha256).toBe(
      'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654',
    );
    expect(report.design.clearWidth).toBe(7);
    expect(report.design.clearHeight).toBe(8);
    expect(report.design.stationCount).toBe(11);
    expect(report.safety.blockEntityCount).toBe(0);
    expect(report.safety.fluidOrGravityHazardCount).toBe(0);
    expect(report.exclusions.t4AquiferBulkheadUntouched).toBe(true);
    expect(report.databaseFeatures).toHaveLength(1);
    expect(report.databaseFeatures[0]).toMatchObject({
      externalId: 'RR-S1-STANDARD-PILOT',
      parentExternalId: 'raven-rock:DISTRICT',
      kind: 'custom',
      conditionScore: null,
      geometry: {
        type: 'bounds',
        minX: 138,
        minY: -12,
        minZ: -18,
        maxX: 148,
        maxY: -3,
        maxZ: -10,
      },
    });
    expect(new Set(Object.values(
      report.databaseFeatures[0].attributes.quality,
    ).map((quality: unknown) => (quality as { status: string }).status)).size)
      .toBe(4);
    expect(prestate.cells).toHaveLength(946);
    expect(prestate.cells.filter((cell: { changed: boolean }) => cell.changed))
      .toHaveLength(335);
  });

  it('passes independent section simulation and the generic frozen guard preflight', () => {
    execFileSync(
      process.execPath,
      [
        'scripts/qa_ravenrock_s1_pilot.mjs',
        '--base',
        basePath,
        '--regions',
        regions,
        '--out',
        qaPath,
      ],
      { cwd: ROOT },
    );
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

    const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
    expect(qa.status).toBe('PASS_OFFLINE_LIVE_GATE_PENDING');
    expect(qa.summary.passingStations).toBe(11);
    expect(qa.summary.totalStations).toBe(11);
    expect(qa.summary.blockEntities).toBe(0);
    expect(qa.summary.fluidOrGravityHazards).toBe(0);
    expect(qa.failures).toEqual([]);
    expect(preflight.passed).toBe(335);
    expect(preflight.failed).toBe(0);
  });
});
