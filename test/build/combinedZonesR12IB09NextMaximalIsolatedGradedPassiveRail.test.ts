import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12i-b09-next-maximal-isolated-four-cell-graded-passive-rail';
const PACKAGE = 'b09-next-maximal-02-isolated-four-cell-graded-passive-rail';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12i-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T024000Z',
);
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12i-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12i-graded-rail-'));
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
    'scripts/compile_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail.mjs',
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
    '--generated-at', '2026-08-22T02:36:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12i_b09_next_maximal_isolated_graded_passive_rail_offline.mjs',
    '--generated-at', '2026-08-22T02:40:00Z',
    '--out', temporaryQa,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12I next maximal isolated four-cell graded passive rail', () => {
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
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12i-offline-readiness.md')));
  });

  it('uses the production-proven upper-to-lower forward and exact reverse order', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2252 156 -768 2252 156 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2253 155 -768 2253 155 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2254 154 -768 2254 154 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2255 153 -768 2255 153 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual([
      'REPL 2255 153 -768 2255 153 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2254 154 -768 2254 154 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2253 155 -768 2253 155 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2252 156 -768 2252 156 -768 minecraft:rail[shape=east_west,waterlogged=false] minecraft:air',
    ]);
  });

  it('binds the exact Paper 1.21.11 runtime proof', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.runtimeUpdateProof).toMatchObject({
      proofPayloadSha256: 'ed7215a5de7c23f42d29ee7f05ba606d1e5a641068bf5ffde00a21933f3c60f2',
      exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
      forwardStatePassCount: 4,
      rollbackAirPassCount: 4,
      productionMutationPerformed: false,
    });
  });

  it('freezes the exact indices, gaps, supports, headroom, and prior rails', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.target.operatedUnion).toEqual(expect.objectContaining({
      cellCount: 4,
      coordinateSetSha256: '0def8552020fb272fe57c09a7441dd5a3dc4dfcdc672ea72274544a007d95ad0',
    }));
    expect(manifest.scope.selection).toMatchObject({
      firstCenterlineIndex: 293,
      lastCenterlineIndex: 296,
      retainedLeftLevelGapIndex: 292,
      retainedRightLevelGapIndex: 297,
      maximumAscendingWestRunCellCount: 4,
      horizontalDirection: 'WEST',
      risePerStep: 1,
    });
    expect(manifest.preservation).toMatchObject({
      exactSupport: { cellCount: 4 },
      retainedHeadroom: { cellCount: 4 },
      retainedIsolationGaps: { cellCount: 2 },
      preservedR12cRail: { cellCount: 231 },
      preservedR12dRail: { cellCount: 19 },
      preservedR12eRail: { cellCount: 80 },
      preservedR12fRail: { cellCount: 3 },
      preservedR12gRail: { cellCount: 4 },
      preservedR12hRail: { cellCount: 4 },
    });
  });

  it('passes every offline kernel gate', () => {
    const readiness = readJson(READINESS);
    expect(readiness).toMatchObject({
      status: 'PASS_R12I_NEXT_MAXIMAL_02_ISOLATED_FOUR_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
      readinessPayloadSha256:
        '0c4bb33a6ade53657dd943bd9c9942d6aa730b2b4884f3302569c6e0508daf84',
      result: {
        targetCellCount: 4,
        supportCellCount: 4,
        headroomCellCount: 4,
        retainedIsolationGapCount: 2,
        forwardPreflightPassed: 4,
        projectedRollbackPreflightPassed: 4,
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
