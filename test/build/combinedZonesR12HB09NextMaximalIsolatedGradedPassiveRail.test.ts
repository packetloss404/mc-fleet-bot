import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12h-b09-next-maximal-isolated-four-cell-graded-passive-rail';
const PACKAGE = 'b09-next-maximal-isolated-four-cell-graded-passive-rail';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12h-b09-next-maximal-isolated-graded-passive-rail-offline-20260822T022500Z',
);
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12h-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12h-graded-rail-'));
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
    'scripts/compile_combined_zones_r12h_b09_next_maximal_isolated_graded_passive_rail.mjs',
    '--out-dir', temporaryDirectory,
    '--basename', BASENAME,
    '--generated-at', '2026-08-22T02:22:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12h_b09_next_maximal_isolated_graded_passive_rail_offline.mjs',
    '--generated-at', '2026-08-22T02:25:00Z',
    '--out', temporaryQa,
    '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R12H next maximal isolated four-cell graded passive rail', () => {
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
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12h-offline-readiness.md')));
  });

  it('uses the production-proven upper-to-lower forward and exact reverse order', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2263 148 -768 2263 148 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2264 147 -768 2264 147 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2265 146 -768 2265 146 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2266 145 -768 2266 145 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual([
      'REPL 2266 145 -768 2266 145 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2265 146 -768 2265 146 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2264 147 -768 2264 147 -768 minecraft:rail[shape=ascending_west,waterlogged=false] minecraft:air',
      'REPL 2263 148 -768 2263 148 -768 minecraft:rail[shape=east_west,waterlogged=false] minecraft:air',
    ]);
  });

  it('binds the exact Paper 1.21.11 runtime proof', () => {
    const manifest = readJson(MANIFEST) as Manifest;
    expect(manifest.runtimeUpdateProof).toMatchObject({
      proofPayloadSha256: 'e2bf30863292c6705526f21b61ee02ecb55ba7fe8a487a4ad1b06fa29dc0c2fe',
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
      coordinateSetSha256: '7e0c109ad5a16196ec13f7d7b9fb98b35dee4c4c5085e623da8e64b327b14ead',
    }));
    expect(manifest.scope.selection).toMatchObject({
      firstCenterlineIndex: 282,
      lastCenterlineIndex: 285,
      retainedLeftLevelGapIndex: 281,
      retainedRightLevelGapIndex: 286,
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
    });
  });

  it('passes every offline kernel gate', () => {
    const readiness = readJson(READINESS);
    expect(readiness).toMatchObject({
      status: 'PASS_R12H_NEXT_MAXIMAL_ISOLATED_FOUR_CELL_GRADED_PASSIVE_RAIL_OFFLINE_READY',
      readinessPayloadSha256:
        'fe354b6a8005b1a6c5c27690a06d74de168d656b8758f03588e75a77a837340e',
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
