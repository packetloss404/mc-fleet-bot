import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12k-b09-r12h-r12i-seven-cell-rail-adjacency-closure';
const PACKAGE = 'b09-r12h-r12i-seven-cell-rail-adjacency-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12k-b09-r12h-r12i-adjacency-closure-offline-20260822T031200Z');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12k-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12k-rail-closure-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12k_b09_r12h_r12i_adjacency_closure.mjs',
    '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T03:12:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_offline.mjs',
    '--generated-at', '2026-08-22T03:12:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12K exact R12H/R12I seven-cell adjacency closure', () => {
  it('regenerates manifest and exact inverse byte-for-byte', () => {
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`)))
      .toEqual(fs.readFileSync(MANIFEST));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.forward.txt`)))
      .toEqual(fs.readFileSync(FORWARD));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.rollback.txt`)))
      .toEqual(fs.readFileSync(ROLLBACK));
  });

  it('regenerates readiness evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12k-offline-readiness.md')));
  });

  it('uses the exact Paper-proven order and reverse inverse', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2256 153 -768 2256 153 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2257 152 -768 2257 152 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2258 151 -768 2258 151 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2259 151 -768 2259 151 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2260 150 -768 2260 150 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2261 149 -768 2261 149 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2262 148 -768 2262 148 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds the 15-cell topology and exact Paper proof', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      target: { operatedUnion: { cellCount: 7,
        coordinateSetSha256: 'ddb53df35589e76f7fddfbba92dc76a13d682a99cbd87afe2131accf9ccf9849' } },
      scope: { selection: { firstCenterlineIndex: 286, lastCenterlineIndex: 292,
        acceptedLowerInterfaceIndex: 285, acceptedUpperInterfaceIndex: 293,
        resultingConnectedCellCount: 15 } },
      runtimeUpdateProof: { proofPayloadSha256:
        '0b18785f201fb7533f8752fb9c3ad7bbaeff87ecab93e65beff9fd638cbe19f1',
      forwardStatePassCount: 15, rollbackAirPassCount: 7, rollbackPriorStatePassCount: 8 },
    });
  });

  it('passes all offline gates while preserving prior rail and caps', () => {
    expect(readJson(READINESS)).toMatchObject({
      status: 'PASS_R12K_R12H_R12I_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: '1d747e48d8e94b59f864190decd3c2a6bb9b25a9717a4654d5eb7d30b1bd29d4',
      result: { targetCellCount: 7, acceptedInterfaceCellCount: 2,
        resultingConnectedRailCellCount: 15, supportCellCount: 7,
        headroomCellCount: 7, preservedPriorRailCount: 352,
        forwardPreflightPassed: 7, projectedRollbackPreflightPassed: 7,
        wrapperMode: 'PREPARE_ONLY' },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
  });

  it('does not commission transport or mutate the live world', () => {
    expect(Object.values(readJson(MANIFEST).safetyBoundary)).toEqual([
      false, false, false, false, false, false, false,
    ]);
  });
});
