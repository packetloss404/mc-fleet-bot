import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12f-b09-isolated-three-cell-graded-passive-rail';
const PACKAGE = 'b09-isolated-three-cell-graded-passive-rail';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12f-b09-isolated-graded-passive-rail-offline-20260822T015000Z',
);
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12f-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12f-graded-rail-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');

interface Manifest {
  manifestIdentity: string;
  target: { operatedUnion: { cellCount: number; coordinateSetSha256: string } };
  scope: { selection: Record<string, number | string | boolean>; failSafeState: Record<string, unknown> };
  runtimeUpdateProof: Record<string, unknown>;
  preservation: Record<string, { cellCount?: number } | number>;
  safetyAudit: Record<string, unknown> & { railUpdateDeterminism: Record<string, unknown> };
  safetyBoundary: Record<string, boolean>;
}

const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/)
  .filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12f_b09_isolated_graded_passive_rail.mjs',
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
    '--generated-at', '2026-08-22T01:45:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12f_b09_isolated_graded_passive_rail_offline.mjs',
    '--generated-at', '2026-08-22T01:50:00Z',
    '--out', temporaryQa,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12F isolated three-cell graded passive rail', () => {
  it('regenerates the frozen manifest and exact inverse byte-for-byte', () => {
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`)))
      .toEqual(fs.readFileSync(MANIFEST));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.forward.txt`)))
      .toEqual(fs.readFileSync(FORWARD));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.rollback.txt`)))
      .toEqual(fs.readFileSync(ROLLBACK));
  });

  it('regenerates the offline readiness seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12f-offline-readiness.md')));
  });

  it('uses the production-proven upper-to-lower forward and exact reverse order', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2285 132 -768 2285 132 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2286 131 -768 2286 131 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2287 130 -768 2287 130 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual([
      'REPL 2287 130 -768 2287 130 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2286 131 -768 2286 131 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2285 132 -768 2285 132 -768 minecraft:rail[shape=east_west,waterlogged=false] minecraft:air',
    ]);
  });

  it('binds the exact Paper 1.21.11 runtime proof', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.runtimeUpdateProof).toMatchObject({
      proofPayloadSha256: '9f734939a5217d5bc5bc0616f3dbd78f0ac75275bcc5fd11f16ff35dd696f8be',
      exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
      forwardStatePassCount: 3,
      rollbackAirPassCount: 3,
      productionMutationPerformed: false,
    });
  });

  it('freezes the exact indices, gaps, supports, headroom, and prior rails', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.target.operatedUnion).toEqual(expect.objectContaining({
      cellCount: 3,
      coordinateSetSha256: '4ef1dd45742537a3300286c1bc3742600626540ec2327bb46a0e6149568cb973',
    }));
    expect(manifest.scope.selection).toMatchObject({
      firstCenterlineIndex: 261,
      lastCenterlineIndex: 263,
      excludedLeftTurnIndex: 260,
      excludedRightLevelGapIndex: 264,
      horizontalDirection: 'WEST',
      risePerStep: 1,
    });
    expect(manifest.preservation).toMatchObject({
      exactSupport: { cellCount: 3 },
      retainedHeadroom: { cellCount: 3 },
      retainedIsolationGaps: { cellCount: 2 },
      preservedR12cRail: { cellCount: 231 },
      preservedR12dRail: { cellCount: 19 },
      preservedR12eRail: { cellCount: 80 },
    });
  });

  it('passes every offline kernel gate', () => {
    const readiness = readJson(READINESS);
    expect(readiness).toMatchObject({
      status: 'PASS_R12F_ISOLATED_THREE_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
      readinessPayloadSha256:
        'df2de8bf7bf4d636fcd7f41206d4bbe13e389cd1060031fd9610d5880c67c35f',
      result: {
        targetCellCount: 3,
        supportCellCount: 3,
        headroomCellCount: 3,
        retainedIsolationGapCount: 2,
        forwardPreflightPassed: 3,
        projectedRollbackPreflightPassed: 3,
        wrapperMode: 'PREPARE_ONLY',
      },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
  });

  it('does not commission transport or mutate the live world', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.safetyBoundary).toEqual(expect.objectContaining({
      liveCallsPerformed: false,
      apiCallsPerformed: false,
      rconCallsPerformed: false,
      serviceMutationsPerformed: false,
      worldEditsPerformed: false,
      funicularOrRouteCommissioned: false,
    }));
  });
});
