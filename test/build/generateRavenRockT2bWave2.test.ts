import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ravenrock-t2b-wave2-'));
const basePath = path.join(tempDir, 'pilot');
const inventoryPath = path.join(tempDir, 'inventory.json');
const databasePath = path.join(tempDir, 'database.json');
const camerasPath = path.join(tempDir, 'cameras.json');
const qaPath = path.join(tempDir, 'qa.json');
const preflightPath = path.join(tempDir, 'preflight.json');
const regions = path.join(
  ROOT,
  'data/worldsnap-wave2-baseline-4fca1ff3-20260728/region',
);

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_ravenrock_t2b_wave2.mjs',
      '--base',
      basePath,
      '--regions',
      regions,
      '--inventory',
      inventoryPath,
      '--database',
      databasePath,
      '--cameras',
      camerasPath,
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

describe('Raven Rock INF-RR-02 T2b Wave 2 pilot', () => {
  it('emits a unique addition-only exact package and inverse rollback', () => {
    const forward = operations(`${basePath}.txt`);
    const rollback = operations(`${basePath}.rollback.txt`);
    const targets = forward.map((operation) => operation.first.join(','));

    expect(forward).toHaveLength(151);
    expect(rollback).toHaveLength(151);
    expect(new Set(targets).size).toBe(151);
    expect(forward.every((operation) =>
      operation.first.join(',') === operation.second.join(','))).toBe(true);
    expect(forward.every((operation) =>
      operation.expected === 'minecraft:air'
      && operation.desired !== 'minecraft:air')).toBe(true);
    expect(forward.every((operation) => operation.first[0] <= -136)).toBe(true);

    for (let index = 0; index < forward.length; index += 1) {
      const operation = forward[index];
      const inverse = rollback[rollback.length - index - 1];
      expect(inverse.first).toEqual(operation.first);
      expect(inverse.expected).toBe(operation.desired);
      expect(inverse.desired).toBe(operation.expected);
    }
  });

  it('pins the immutable snapshot, dry boundary, section, and evidence payloads', () => {
    const report = JSON.parse(
      fs.readFileSync(`${basePath}.report.json`, 'utf8'),
    );
    const prestate = JSON.parse(
      fs.readFileSync(`${basePath}.prestate.json`, 'utf8'),
    );
    const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
    const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    const cameras = JSON.parse(fs.readFileSync(camerasPath, 'utf8'));

    expect(report.baseline.sha256).toBe(
      '4fca1ff3c40ae9c24c9338483b0780678aa5966bb570a642f0d0277885331a2b',
    );
    expect(report.design).toMatchObject({
      routeId: 'RR-T2B',
      stationRange: [-145, -136],
      stationCount: 10,
      clearWidth: 5,
      clearHeight: 5,
      shellBounds: [-145, 1, 179, -136, 8, 190],
    });
    expect(report.accounting).toMatchObject({
      designCells: 450,
      forwardOperations: 151,
      rollbackOperations: 151,
      uniqueTargets: 151,
      additionOnly: true,
    });
    expect(report.safety).toMatchObject({
      blockEntityCount: 0,
      targetHazardCount: 0,
      faceAdjacentTargetHazardCount: 0,
      bufferFluidOrGravityHazardCount: 12,
    });
    expect(report.exclusions).toMatchObject({
      liveWorldMutation: false,
      databaseWrites: false,
      xMinus135WetThresholdTargets: false,
      excavation: false,
    });
    expect(prestate.designCells).toHaveLength(450);
    expect(inventory.routes).toHaveLength(10);
    expect(inventory.nodes).toHaveLength(15);
    expect(inventory.verticalCirculation.flights).toHaveLength(15);
    expect(database.status).toBe('proposal-not-imported');
    expect(database.features.length).toBeGreaterThanOrEqual(40);
    expect(cameras.cameras).toHaveLength(6);
  });

  it('passes independent QA and the generic exact-guard preflight', () => {
    execFileSync(
      process.execPath,
      [
        'scripts/qa_ravenrock_t2b_wave2.mjs',
        '--base',
        basePath,
        '--regions',
        regions,
        '--inventory',
        inventoryPath,
        '--database',
        databasePath,
        '--cameras',
        camerasPath,
        '--out',
        qaPath,
      ],
      { cwd: ROOT },
    );
    execFileSync(
      process.execPath,
      [
        'scripts/preflight_guarded_ops.mjs',
        `${basePath}.txt`,
        '--regions',
        regions,
        '--report',
        preflightPath,
      ],
      { cwd: ROOT },
    );

    const qa = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const preflight = JSON.parse(fs.readFileSync(preflightPath, 'utf8'));
    expect(qa.status).toBe('PASS_OFFLINE_LIVE_GATES_PENDING');
    expect(qa.summary).toMatchObject({
      forwardOperations: 151,
      rollbackOperations: 151,
      uniqueTargets: 151,
      passingStations: 10,
      totalStations: 10,
      bufferWaterHazards: 12,
      targetHazards: 0,
      faceAdjacentTargetHazards: 0,
      blockEntities: 0,
      routeLegsInventoried: 10,
      nodesInventoried: 15,
      stairFlightsInventoried: 15,
      failedAssertions: 0,
    });
    expect(qa.failures).toEqual([]);
    expect(preflight.passed).toBe(151);
    expect(preflight.failed).toBe(0);
  });
});
