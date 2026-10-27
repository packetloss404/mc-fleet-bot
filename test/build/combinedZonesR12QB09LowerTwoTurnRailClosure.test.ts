import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r12q-b09-lower-two-turn-rail-closure';
const PACKAGE = 'b09-lower-two-turn-rail-closure';
const BUILDOPS = path.join(ROOT, 'data/buildops');
const EVIDENCE = path.join(ROOT,
  'data/world-review/combined-zones-r12q-b09-lower-two-turn-rail-closure-offline-20260822T044800Z');
const MANIFEST = path.join(BUILDOPS, `${BASENAME}.release-manifest.json`);
const FORWARD = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.forward.txt`);
const ROLLBACK = path.join(BUILDOPS, `${BASENAME}.${PACKAGE}.rollback.txt`);
const READINESS = path.join(EVIDENCE, 'r12q-offline-readiness.json');
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12q-lower-turns-'));
const temporaryQa = path.join(temporaryDirectory, 'readiness.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'readiness.md');
const readJson = (filename: string) => JSON.parse(fs.readFileSync(filename, 'utf8'));
const operations = (filename: string) => fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line.startsWith('REPL '));

beforeAll(() => {
  execFileSync(process.execPath, [
    'scripts/compile_combined_zones_r12k_b09_r12h_r12i_adjacency_closure.mjs',
    '--profile', 'r12q', '--out-dir', temporaryDirectory, '--basename', BASENAME,
    '--generated-at', '2026-08-22T04:48:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  execFileSync(process.execPath, [
    'scripts/qa_combined_zones_r12k_b09_r12h_r12i_adjacency_closure_offline.mjs',
    '--profile', 'r12q', '--generated-at', '2026-08-22T04:48:00Z',
    '--out', temporaryQa, '--markdown', temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R12Q exact lower two-turn passive rail closure', () => {
  it('regenerates the manifest and exact inverse byte-for-byte', () => {
    for (const suffix of [
      '.release-manifest.json', `.${PACKAGE}.forward.txt`, `.${PACKAGE}.rollback.txt`,
    ]) expect(fs.readFileSync(path.join(temporaryDirectory, `${BASENAME}${suffix}`)))
      .toEqual(fs.readFileSync(path.join(BUILDOPS, `${BASENAME}${suffix}`)));
  });

  it('regenerates readiness evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryQa)).toEqual(fs.readFileSync(READINESS));
    expect(fs.readFileSync(temporaryMarkdown))
      .toEqual(fs.readFileSync(path.join(EVIDENCE, 'r12q-offline-readiness.md')));
  });

  it('uses exactly two one-cell guards in proven order and exact reverse inverse', () => {
    expect(operations(FORWARD)).toEqual([
      'REPL 2288 130 -768 2288 130 -768 minecraft:air minecraft:rail[shape=south_west,waterlogged=false]',
      'REPL 2288 130 -748 2288 130 -748 minecraft:air minecraft:rail[shape=north_west,waterlogged=false]',
    ]);
    expect(operations(ROLLBACK)).toEqual(operations(FORWARD).slice().reverse().map((line) => {
      const fields = line.split(/\s+/);
      return [...fields.slice(0, 7), fields[8], fields[7]].join(' ');
    }));
  });

  it('binds both exact turns, all four interfaces, 552-cell topology, and Paper proof', () => {
    expect(readJson(MANIFEST)).toMatchObject({
      mvpScope: true,
      target: { operatedUnion: { cellCount: 2,
        coordinateSetSha256: '021919255d63bd29c496a22493a9719131890f7c10b793c28ebdb7f1fc940984' },
      desiredStateCensus: {
        'minecraft:rail[shape=north_west,waterlogged=false]': 1,
        'minecraft:rail[shape=south_west,waterlogged=false]': 1,
      } },
      scope: { selection: { exactTargetCenterlineIndices: [240, 260],
        exactAcceptedInterfaceIndices: [239, 241, 259, 261],
        resultingConnectedFirstCenterlineIndex: 9, resultingConnectedLastCenterlineIndex: 560,
        resultingConnectedCellCount: 552 } },
      runtimeUpdateProof: {
        proofPayloadSha256: '7100e594e3f0bb4c62464a3ff9a6ffbe137ef9927135b4504082974bce460310',
        forwardStatePassCount: 552, rollbackAirPassCount: 2,
        rollbackPriorStatePassCount: 550,
      },
    });
  });

  it('passes all 15 gates while preserving 550 rails and both exterior caps', () => {
    expect(readJson(READINESS)).toMatchObject({
      status: 'PASS_R12Q_LOWER_TWO_TURN_RAIL_CLOSURE_OFFLINE_READY',
      readinessPayloadSha256: '26a5ef3781b4e03578f3014e04089a4244d28a410f76baa91e5245fd99a683a8',
      result: { targetCellCount: 2, acceptedInterfaceCellCount: 4,
        resultingConnectedRailCellCount: 552, supportCellCount: 2,
        headroomCellCount: 2, preservedPriorRailCount: 550,
        forwardPreflightPassed: 2, projectedRollbackPreflightPassed: 2,
        wrapperMode: 'PREPARE_ONLY' },
      functionalBoundary: { exactContinuous9Through560LowerTurnClosureReady: true,
        turnRailDesignedOrInstalled: true, funicularCommissioned: false },
      summary: { passed: true, checkCount: 15, passCount: 15, failCount: 0 },
    });
    const manifest = readJson(MANIFEST);
    expect(manifest.preservation).toMatchObject({ acceptedPriorRailCount: 550,
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
