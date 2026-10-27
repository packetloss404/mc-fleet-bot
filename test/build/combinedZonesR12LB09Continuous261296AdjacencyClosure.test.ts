import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12l-b09-continuous-261-296-seven-cell-rail-adjacency-closure';
const PACKAGE = 'b09-continuous-261-296-seven-cell-rail-adjacency-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12l-b09-continuous-261-296-adjacency-closure-offline-20260822T033800Z');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12l-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12l-rail-closure-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12k_b09_r12h_r12i_adjacency_closure.mjs',
    '--profile', 'r12l', '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T03:38:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_offline.mjs',
    '--profile', 'r12l', '--generated-at', '2026-08-22T03:38:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12L exact continuous 261..296 seven-cell closure', () => {
  it('regenerates manifest and exact inverse byte-for-byte', () => {
    for (const suffix of [
      '.release-manifest.json', `.${PACKAGE}.forward.txt`, `.${PACKAGE}.rollback.txt`,
    ]) expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}${suffix}`)))
      .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}${suffix}`)));
  });

  it('regenerates readiness evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12l-offline-readiness.md')));
  });

  it('uses the exact seven states and reverse-order inverse', () => {
    expect(operations(FORWARD)).toHaveLength(7);
    expect(operations(FORWARD).map((line) => line.split(/\s+/).slice(1, 4).join(',')))
      .toEqual(['2267,145,-768', '2268,144,-768', '2269,143,-768', '2270,143,-768',
        '2271,142,-768', '2272,141,-768', '2273,140,-768']);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds one exact 36-cell continuous component and Paper proof', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      scope: { selection: { firstCenterlineIndex: 275, lastCenterlineIndex: 281,
        resultingConnectedFirstCenterlineIndex: 261, resultingConnectedLastCenterlineIndex: 296,
        resultingConnectedCellCount: 36 } },
      runtimeUpdateProof: {
        proofPayloadSha256: '0ae94eca43a1b080011e428098451af70caf5db2a38332702985561baf8c9be4',
        forwardStatePassCount: 36, rollbackAirPassCount: 7, rollbackPriorStatePassCount: 29,
      },
    });
  });

  it('passes all 15 offline readiness gates', () => {
    expect(readJson(READINESS)).toMatchObject({
      status: 'PASS_R12L_CONTINUOUS_261_296_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: '8c8c498afb52dd8e0ef1c63f004ce05907d78ddc4b27e3b290d25cf54f423e0f',
      result: { targetCellCount: 7, resultingConnectedRailCellCount: 36,
        preservedPriorRailCount: 359, forwardPreflightPassed: 7,
        projectedRollbackPreflightPassed: 7, wrapperMode: 'PREPARE_ONLY' },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
  });

  it('keeps caps and active systems fail-closed', () => {
    const manifest = readJson(MANIFEST);
    expect(manifest.preservation).toMatchObject({ acceptedPriorRailCount: 359,
      retainedLowerB08Cap: { cellCount: 12 }, retainedSummitZ11Cap: { cellCount: 12 } });
    expect(Object.values(manifest.safetyBoundary)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });
});
