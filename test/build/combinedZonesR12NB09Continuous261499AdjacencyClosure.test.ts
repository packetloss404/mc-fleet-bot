import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME =
  'combined-zones-r12n-b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure';
const PACKAGE = 'b09-continuous-261-499-one-hundred-twenty-three-cell-rail-adjacency-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12n-b09-continuous-261-499-adjacency-closure-offline-20260822T040800Z');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12n-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12n-rail-closure-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12k_b09_r12h_r12i_adjacency_closure.mjs',
    '--profile', 'r12n', '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T04:08:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_offline.mjs',
    '--profile', 'r12n', '--generated-at', '2026-08-22T04:08:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12N exact continuous 261..499 adjacency closure', () => {
  it('regenerates manifest and exact inverse byte-for-byte', () => {
    for (const suffix of [
      '.release-manifest.json', `.${PACKAGE}.forward.txt`, `.${PACKAGE}.rollback.txt`,
    ]) expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}${suffix}`)))
      .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}${suffix}`)));
  });

  it('regenerates readiness evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12n-offline-readiness.md')));
  });

  it('uses 123 exact one-cell guards and reverse-order inverse', () => {
    expect(operations(FORWARD)).toHaveLength(123);
    expect(operations(ROLLBACK)).toHaveLength(123);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds the exact 239-cell topology and Paper proof', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      target: { operatedUnion: { cellCount: 123,
        coordinateSetSha256: '25f09aebcb490dcf1815d172ff04417445aedb495386d7e1011694b33187fcdb' },
      desiredStateCensus: {
        'minecraft:rail[shape=ascending_west,waterlogged=false]': 90,
        'minecraft:rail[shape=east_west,waterlogged=false]': 33,
      } },
      scope: { selection: { firstCenterlineIndex: 297, lastCenterlineIndex: 419,
        acceptedLowerInterfaceIndex: 296, acceptedUpperInterfaceIndex: 420,
        resultingConnectedFirstCenterlineIndex: 261, resultingConnectedLastCenterlineIndex: 499,
        resultingConnectedCellCount: 239 } },
      runtimeUpdateProof: {
        proofPayloadSha256: 'b7f3360f304f0b99f6e9829970f3e807aebd1795bcfb99d82063ab95648db713',
        forwardStatePassCount: 239, rollbackAirPassCount: 123,
        rollbackPriorStatePassCount: 116,
      },
    });
  });

  it('passes all 15 offline gates while preserving all prior rails and caps', () => {
    expect(readJson(READINESS)).toMatchObject({
      status:
        'PASS_R12N_CONTINUOUS_261_499_ONE_HUNDRED_TWENTY_THREE_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: '80952d0cbcc23ddeee08f30d02b04434b1318a7797c93c2b4ae0e45360dbf3c2',
      result: { targetCellCount: 123, acceptedInterfaceCellCount: 2,
        resultingConnectedRailCellCount: 239, supportCellCount: 123,
        headroomCellCount: 123, preservedPriorRailCount: 366,
        forwardPreflightPassed: 123, projectedRollbackPreflightPassed: 123,
        wrapperMode: 'PREPARE_ONLY' },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
  });

  it('keeps turns, caps, and active systems fail-closed', () => {
    const manifest = readJson(MANIFEST);
    expect(manifest.preservation).toMatchObject({ acceptedPriorRailCount: 366,
      retainedLowerB08Cap: { cellCount: 12 }, retainedSummitZ11Cap: { cellCount: 12 } });
    expect(Object.values(manifest.safetyBoundary)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });
});
