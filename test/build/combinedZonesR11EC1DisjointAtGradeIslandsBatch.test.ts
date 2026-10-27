import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const BASENAME = 'combined-zones-r11e-c1-disjoint-at-grade-islands-batch';
const MANIFEST_PATH = path.join(ROOT, `data/buildops/${BASENAME}.release-manifest.json`);
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_r11e_c1_disjoint_at_grade_islands_batch.mjs',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11e-islands-'),
);

interface Package {
  key: string;
  forward: string;
  rollback: string;
}

interface Operation {
  cell: [number, number, number];
  sourceState: string;
  targetState: string;
}

interface Manifest {
  schemaVersion: number;
  transactionId: string;
  status: string;
  releaseNodeId: string;
  mvpScope: boolean;
  packages: Package[];
  executionOrder: { forward: string[]; rollback: string[] };
  scope: {
    includedIslands: Array<Record<string, unknown>>;
    excludedAtGradeRanges: Array<Record<string, unknown>>;
    heldTreatmentMutationCount: number;
    corridorConnectivityClaimed: boolean;
  };
  source: Record<string, unknown>;
  target: Record<string, unknown>;
  operations: Record<string, unknown>;
  isolation: Record<string, unknown>;
  compileGuards: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
  manifestIdentity: string;
}

let committed: Manifest;
let regenerated: Manifest;

function parseOperations(filename: string): Operation[] {
  return fs.readFileSync(filename, 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL '))
    .map((line) => {
      const fields = line.split(/\s+/);
      expect(fields).toHaveLength(9);
      const cell = fields.slice(1, 4).map(Number) as [number, number, number];
      expect(fields.slice(4, 7).map(Number)).toEqual(cell);
      return { cell, sourceState: fields[7], targetState: fields[8] };
    });
}

beforeAll(() => {
  committed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T19:45:00Z',
    '--snapshot', 'data/worldsnap-combined-zones-r11d-post-20260821T192414Z',
    '--intake-audit',
    'data/world-review/combined-zones-r11d-live-20260821T192414Z/post-complete-save-intake.json',
    '--out-dir', temporaryDirectory,
  ], { cwd: ROOT, stdio: 'pipe', timeout: 90_000 });
  regenerated = JSON.parse(fs.readFileSync(
    path.join(temporaryDirectory, `${BASENAME}.release-manifest.json`),
    'utf8',
  )) as Manifest;
}, 100_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11E disjoint C1 at-grade island batch compiler', () => {
  it('regenerates all 24 operation files byte-for-byte and the manifest payload', () => {
    expect(committed.packages).toHaveLength(12);
    for (const pkg of committed.packages) {
      for (const role of ['forward', 'rollback'] as const) {
        const committedPath = path.join(ROOT, pkg[role]);
        const regeneratedPath = path.join(
          temporaryDirectory,
          path.basename(pkg[role]),
        );
        expect(fs.readFileSync(regeneratedPath)).toEqual(fs.readFileSync(committedPath));
      }
    }
    regenerated.packages = committed.packages;
    const { manifestIdentity: regeneratedIdentity, ...regeneratedPayload } = regenerated;
    const { manifestIdentity: committedIdentity, ...committedPayload } = committed;
    expect(regeneratedIdentity).not.toBe('');
    expect(committedIdentity).not.toBe('');
    expect(regeneratedPayload).toEqual(committedPayload);
  });

  it('binds accepted R11D post and the standing R11 authority', () => {
    expect(committed).toMatchObject({
      schemaVersion: 1,
      transactionId: BASENAME,
      status:
        'COMPILED_FROM_ACCEPTED_R11D_POST_OFFLINE_BATCH_AWAITING_FRESH_EXECUTION_KERNEL',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      mvpScope: true,
      source: {
        snapshotRoot: 'data/worldsnap-combined-zones-r11d-post-20260821T192414Z',
        completeSaveSha256:
          'b18af0b34c2156c51d2cdf4e8ade401efdcfd184c35787709c7048e5ba4cebe6',
        sourceLedgerCompletedReleaseIdentitySha256:
          'e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb',
      },
    });
  });

  it('includes seven exact islands and preserves both wet at-grade holdouts', () => {
    const ranges = committed.scope.includedIslands.map((island) => {
      const stations = island.stations as Record<string, number>;
      return [stations.start, stations.end];
    });
    expect(ranges).toEqual([
      [548, 551], [564, 569], [606, 608], [627, 632],
      [792, 792], [1142, 1183], [1213, 1215],
    ]);
    expect(committed.scope.excludedAtGradeRanges).toMatchObject([
      {
        key: 'island-952-1139',
        sourceHazardCount: 43,
        haloHazardCount: 108,
        disposition: 'PRESERVED_UNTOUCHED_LOCAL_HOLDOUT_NO_OPERATION_PACKAGE',
      },
      {
        key: 'island-1189-1206',
        sourceHazardCount: 0,
        haloHazardCount: 10,
        disposition: 'PRESERVED_UNTOUCHED_LOCAL_HOLDOUT_NO_OPERATION_PACKAGE',
      },
    ]);
    expect(committed.scope).toMatchObject({
      heldTreatmentMutationCount: 0,
      corridorConnectivityClaimed: false,
    });
  });

  it('preserves saved-entity cells and emits only exact gravity/leaf dependencies', () => {
    const island = committed.scope.includedIslands.find(
      (entry) => entry.key === 'island-1142-1183',
    ) as Record<string, unknown>;
    expect(island.geometry as Record<string, unknown>).toMatchObject({
      savedEntityConflicts: { cellCount: 5 },
      sourceSavedEntityPositionCount: 4,
      gravityDependencies: { cellCount: 2 },
      leafPropertyTransitions: { cellCount: 79 },
      routeCommissioned: false,
    });
    expect(committed.isolation).toMatchObject({
      savedEntityHaloIntersectionCount: 0,
      blockEntityHaloIntersectionCount: 0,
      protectedRelicHaloIntersectionCount: 0,
      c01DefaultDenyHaloIntersectionCount: 0,
      heldTreatmentMutationCount: 0,
      routeCommissioned: false,
    });
  });

  it('emits 12 nonempty disjoint packages and exact global reverse rollback', () => {
    expect(committed.executionOrder.forward).toHaveLength(12);
    expect(committed.executionOrder.rollback)
      .toEqual(committed.executionOrder.forward.slice().reverse());
    const operated = new Set<string>();
    let operationCount = 0;
    for (const pkg of committed.packages) {
      const forward = parseOperations(path.join(ROOT, pkg.forward));
      const rollback = parseOperations(path.join(ROOT, pkg.rollback));
      expect(forward.length).toBeGreaterThan(0);
      expect(rollback).toEqual(forward.slice().reverse().map((record) => ({
        cell: record.cell,
        sourceState: record.targetState,
        targetState: record.sourceState,
      })));
      for (const record of forward) {
        expect(operated.has(record.cell.join(','))).toBe(false);
        operated.add(record.cell.join(','));
      }
      operationCount += forward.length;
    }
    expect(operationCount).toBe(3_982);
    expect(committed.target).toMatchObject({
      operatedUnion: {
        cellCount: 3_982,
        coordinateSetSha256:
          'c661565151aedd8d91bb959a5151911279b2db6b77d5cad5bce62b6669c762ef',
      },
      islandTargetSetsDisjoint: true,
      islandInteractionHalosDisjoint: true,
      packageTargetsDisjoint: true,
    });
  });

  it('passes independent immutable-source QA', () => {
    const out = path.join(temporaryDirectory, 'r11e-offline-qa.json');
    execFileSync(process.execPath, [
      'scripts/qa_combined_zones_r11e_c1_disjoint_at_grade_islands_offline.mjs',
      '--out', out,
      '--generated-at', '2026-08-21T19:50:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'PASS',
      checks: {
        physicalPackageCount: 12,
        exactSourceGuardMatchCount: 3_982,
        exactInverseRecordCount: 3_982,
        includedIslandCount: 7,
        excludedWetRangeCount: 2,
        gravityTransitionCount: 10,
        leafPropertyTransitionCount: 140,
        heldTreatmentMutationCount: 0,
        corridorConnectivityClaimed: false,
      },
    });
  });

  it('binds manifest identity to the complete payload', () => {
    const { manifestIdentity, ...payload } = committed;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(manifestIdentity);
  });

  it('retains 12-package scoped-wrapper print-plan compatibility', () => {
    const plan = JSON.parse(execFileSync(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs',
      '--manifest', `data/buildops/${BASENAME}.release-manifest.json`,
      '--release-node', 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      '--print-plan',
    ], { cwd: ROOT, encoding: 'utf8' })) as Record<string, unknown>;
    expect(plan).toMatchObject({
      mode: 'PREPARE_ONLY',
      globalGateDependency: 'NONE',
      packageOrder: committed.executionOrder.forward,
    });
  });
});
