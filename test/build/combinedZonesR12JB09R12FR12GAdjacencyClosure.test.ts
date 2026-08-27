import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12j-b09-r12f-r12g-seven-cell-rail-adjacency-closure';
const PACKAGE = 'b09-r12f-r12g-seven-cell-rail-adjacency-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r12j-b09-r12f-r12g-adjacency-closure-offline-20260822T025200Z',
);
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12j-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12j-rail-closure-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');

const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12j_b09_r12f_r12g_adjacency_closure.mjs',
    '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T02:52:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12j_b09_r12f_r12g_adjacency_closure_offline.mjs',
    '--generated-at', '2026-08-22T02:52:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12J exact R12F/R12G seven-cell rail adjacency closure', () => {
  it('regenerates the frozen manifest and operations byte-for-byte', () => {
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`)))
      .toEqual(fs.readFileSync(MANIFEST));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.forward.txt`)))
      .toEqual(fs.readFileSync(FORWARD));
    expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}.${PACKAGE}.rollback.txt`)))
      .toEqual(fs.readFileSync(ROLLBACK));
  });

  it('regenerates the readiness seal byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12j-offline-readiness.md')));
  });

  it('uses the Paper-proven upper-to-lower sequence and exact reverse inverse', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2278 137 -768 2278 137 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2279 136 -768 2279 136 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2280 135 -768 2280 135 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2281 135 -768 2281 135 -768 minecraft:air minecraft:rail[shape=east_west,waterlogged=false]',
      'REPL 2282 134 -768 2282 134 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2283 133 -768 2283 133 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
      'REPL 2284 132 -768 2284 132 -768 minecraft:air minecraft:rail[shape=ascending_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds the exact Paper proof and resulting 14-cell topology', () => {
    const manifest = readJson(MANIFEST);
    expect(manifest.runtimeUpdateProof).toMatchObject({
      proofPayloadSha256: '151ad3cf31b24aa15ecc07f7ca7d61f812316b034d34c479ea166de510229c4d',
      exactProductionPaperVersion: '1.21.11-69-main@94d0c97',
      forwardStatePassCount: 14,
      rollbackAirPassCount: 7,
      rollbackPriorStatePassCount: 7,
      resultingConnectedPostTopologyCellCount: 14,
      productionMutationPerformed: false,
    });
    expect(manifest.scope.geometry.resultingConnectedR12fThroughR12gRail.cellCount).toBe(14);
  });

  it('freezes exact indices, interfaces, supports, headroom, prior rails, and caps', () => {
    const manifest = readJson(MANIFEST);
    expect(manifest.target.operatedUnion).toMatchObject({
      cellCount: 7,
      coordinateSetSha256: 'c5d0c02ec59bcabe84377138635250c16b175b135a04c80a2624a6db28fcb366',
    });
    expect(manifest.scope.selection).toMatchObject({
      firstCenterlineIndex: 264, lastCenterlineIndex: 270,
      acceptedLowerInterfaceIndex: 263, acceptedUpperInterfaceIndex: 271,
      resultingConnectedFirstCenterlineIndex: 261,
      resultingConnectedLastCenterlineIndex: 274,
      resultingConnectedCellCount: 14,
    });
    expect(manifest.preservation).toMatchObject({
      exactSupport: { cellCount: 7 }, retainedHeadroom: { cellCount: 7 },
      acceptedAdjacencyInterfaces: { cellCount: 2 },
      preservedR12cRail: { cellCount: 231 }, preservedR12dRail: { cellCount: 19 },
      preservedR12eRail: { cellCount: 80 }, preservedR12fRail: { cellCount: 3 },
      preservedR12gRail: { cellCount: 4 }, preservedR12hRail: { cellCount: 4 },
      preservedR12iRail: { cellCount: 4 },
      retainedLowerB08Cap: { cellCount: 12 }, retainedSummitZ11Cap: { cellCount: 12 },
    });
  });

  it('passes all 15 offline gates and the real wrapper plan', () => {
    expect(readJson(READINESS)).toMatchObject({
      status: 'PASS_R12J_R12F_R12G_SEVEN_CELL_RAIL_ADJACENCY_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: 'ff1b6ea4da02bb83b9e02ec8b2436da8a5a0e57d139e2667f35c19a711b59590',
      result: {
        targetCellCount: 7, acceptedInterfaceCellCount: 2,
        resultingConnectedRailCellCount: 14, supportCellCount: 7,
        headroomCellCount: 7, preservedPriorRailCount: 345,
        forwardPreflightPassed: 7, projectedRollbackPreflightPassed: 7,
        wrapperMode: 'PREPARE_ONLY',
      },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
  });

  it('does not commission transport or mutate the live world', () => {
    expect(readJson(MANIFEST).safetyBoundary).toMatchObject({
      liveCallsPerformed: false, apiCallsPerformed: false, rconCallsPerformed: false,
      serviceMutationsPerformed: false, worldEditsPerformed: false,
      funicularOrRouteCommissioned: false,
    });
  });
});
