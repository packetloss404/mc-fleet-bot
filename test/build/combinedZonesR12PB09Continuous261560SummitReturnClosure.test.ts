import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME =
  'combined-zones-r12p-b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure';
const PACKAGE = 'b09-continuous-261-560-sixty-one-cell-summit-return-rail-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12p-b09-continuous-261-560-summit-return-rail-closure-offline-20260822T042800Z');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12p-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12p-rail-closure-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12k_b09_r12h_r12i_adjacency_closure.mjs',
    '--profile', 'r12p', '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T04:28:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_offline.mjs',
    '--profile', 'r12p', '--generated-at', '2026-08-22T04:28:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12P exact continuous 261..560 summit-return closure', () => {
  it('regenerates the manifest and exact inverse byte-for-byte', () => {
    for (const suffix of [
      '.release-manifest.json', `.${PACKAGE}.forward.txt`, `.${PACKAGE}.rollback.txt`,
    ]) expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}${suffix}`)))
      .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}${suffix}`)));
  });

  it('regenerates readiness evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12p-offline-readiness.md')));
  });

  it('uses 61 exact one-cell guards and reverse-order inverse', () => {
    expect(operations(FORWARD)).toHaveLength(61);
    expect(operations(ROLLBACK)).toHaveLength(61);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds the exact turn, ascending states, 300-cell topology, and Paper proof', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      mvpScope: true,
      target: { operatedUnion: { cellCount: 61,
        coordinateSetSha256: 'ade4597321fc40ebba2313b282b240c19fdabfeae5cc86f6887cf3ce5392b603' },
      desiredStateCensus: {
        'minecraft:rail[shape=ascending_north,waterlogged=false]': 58,
        'minecraft:rail[shape=north_east,waterlogged=false]': 1,
        'minecraft:rail[shape=north_south,waterlogged=false]': 2,
      } },
      scope: { selection: { firstCenterlineIndex: 500, lastCenterlineIndex: 560,
        acceptedLowerInterfaceIndex: 499, acceptedUpperInterfaceIndex: null,
        resultingConnectedFirstCenterlineIndex: 261, resultingConnectedLastCenterlineIndex: 560,
        resultingConnectedCellCount: 300 } },
      runtimeUpdateProof: {
        proofPayloadSha256: '8ffe8ba98ddbb46fad9a1adf72c8ed36cad97bcc579c4bee6be19c0de4d3d7e1',
        forwardStatePassCount: 300, rollbackAirPassCount: 61,
        rollbackPriorStatePassCount: 239,
      },
    });
  });

  it('passes all 15 gates while preserving prior rails, caps, and reviewed layering', () => {
    expect(readJson(READINESS)).toMatchObject({
      status: 'PASS_R12P_CONTINUOUS_261_560_SIXTY_ONE_CELL_SUMMIT_RETURN_RAIL_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: '5824644454fe72b3a8207b68ef00ee80e7624b43b2521d73ce99819b2b595849',
      result: { targetCellCount: 61, acceptedInterfaceCellCount: 1,
        resultingConnectedRailCellCount: 300, supportCellCount: 61,
        headroomCellCount: 61, preservedPriorRailCount: 489,
        forwardPreflightPassed: 61, projectedRollbackPreflightPassed: 61,
        wrapperMode: 'PREPARE_ONLY' },
      functionalBoundary: { exactContinuous261Through560SummitReturnClosureReady: true,
        turnRailDesignedOrInstalled: true, funicularCommissioned: false },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
    const manifest = readJson(MANIFEST);
    expect(manifest.preservation).toMatchObject({ acceptedPriorRailCount: 489,
      retainedLowerB08Cap: { cellCount: 12 }, retainedSummitZ11Cap: { cellCount: 12 },
      undeclaredPriorReleaseIntersectionCount: 0 });
    expect(manifest.preservation.acceptedPriorReleaseTargetProof
      .filter((entry: { reviewedLayeredFitoutOverlap?: boolean }) => entry.reviewedLayeredFitoutOverlap))
      .toHaveLength(2);
  });

  it('tests the real wrapper print-plan and keeps active transport closed', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs', '--manifest', path.relative(ROOT, MANIFEST),
      '--release-node', 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING', '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' }));
    expect(plan).toMatchObject({ mode: 'PREPARE_ONLY', globalGateDependency: 'NONE',
      packageOrder: [PACKAGE] });
    expect(plan.stages).toHaveLength(10);
    expect(Object.values(readJson(MANIFEST).safetyBoundary)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });
});
