import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09f_b07_enclosed_upper_interface_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09f-live-20260822T013916Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09f-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string>;
  bindings: Record<string, unknown>;
  exactState: Record<string, unknown>;
  topology: Record<string, unknown>;
  containment: Record<string, unknown>;
  preservation: {
    priorReleaseTargets: Record<string, Record<string, number>>;
    gravity: Record<string, number>;
  };
  drift: Record<string, unknown>;
  entityAndBlockEntityPreservation: Record<string, unknown>;
  executionEvidence: {
    wrapperStageCount: number;
    wrapperPassedStageCount: number;
    wrapperFailedStageCount: number;
    packageEvidence: Record<string, {
      strictForwardExecution: Record<string, unknown>;
      rollbackPoststatePreflight: Record<string, unknown>;
    }>;
  };
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

const report = (): QaReport => JSON.parse(
  fs.readFileSync(path.join(EVIDENCE, 'r09f-post-release-qa.json'), 'utf8'),
) as QaReport;
let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T01:43:00Z',
    '--evidence-dir', 'data/world-review/combined-zones-r09f-live-20260822T013916Z',
    '--ledger',
    'data/world-review/combined-zones-r09f-live-20260822T013916Z/evidence-ledger.json',
    '--manifest',
    'data/buildops/combined-zones-r09f-b07-enclosed-upper-interface.release-manifest.json',
    '--source-root', 'data/worldsnap-combined-zones-r09f-source-20260822T013916Z',
    '--post-root', 'data/worldsnap-combined-zones-r09f-post-20260822T013916Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(temporaryJson);
  firstMarkdown = fs.readFileSync(temporaryMarkdown);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('Combined Zones CZ-R09F B07 enclosed upper-interface post-release QA', () => {
  it('regenerates canonical evidence byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(firstJson);
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(firstMarkdown);
    expect(firstJson).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r09f-post-release-qa.json')));
    expect(firstMarkdown).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r09f-post-release-qa.md')));
  });

  it('binds wrapper, manifest, completed identity, and immutable snapshots', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R09F_B07_ENCLOSED_UPPER_INTERFACE_POSTSTATE_VERIFIED_REVERSIBLE',
      qaPayloadSha256:
        '01c22b585864d130d3e1840d234923a6f66fbdf0fd0263ee9e13de21b47d5ed0',
      release: {
        manifestIdentity:
          'bdec6c796b92aee6b4d97da9e70945601f547e0b7f41eeb562b5cfec09a4d588',
        sourceBoundReleaseIdentitySha256:
          '0dfbc7c22ea08ae077fee1c40e709127f484392fde6a01a33957d979bccbab7f',
        completedReleaseIdentitySha256:
          '3b9b5c0836b5c42a1e05c7b6a5efd9195015355a33bfad9697473ea5a18059f1',
      },
      bindings: {
        evidenceBindingCount: 25,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            'b0c38b5bcefc9152f84f4e0c7202206da09622c8ac548be3ebb0f58b5a210f6d',
          regionSnapshotSha256:
            '2029d6837876d971e5f5278e578996203b98d5238f67ef4bbc315f4894d1eb60',
        },
        postCompleteSave: {
          completeSaveSha256:
            'df6b887176e00a708d55e9022058781a0909df02603f91e482ed78234e1627d0',
          regionSnapshotSha256:
            'a99bf9398a1fdeb24ee9f32afc337ebac8551f5224e8387728e7e427180789f8',
        },
      },
    });
  });

  it('proves all 126 + 33 exact states and reverse readiness', () => {
    expect(report()).toMatchObject({
      exactState: {
        sourceMatchingCellCount: 159,
        sourceMismatchCount: 0,
        postMatchingCellCount: 159,
        postMismatchCount: 0,
        containmentMatchingCellCount: 126,
        seamMatchingCellCount: 33,
      },
      summary: {
        exactTargetCellCount: 159,
        containmentCellCount: 126,
        seamCellCount: 33,
        rollbackReadyCellCount: 159,
      },
    });
  });

  it('proves half-step continuity, clearance, barrier, seam, caps, and closed route', () => {
    expect(report()).toMatchObject({
      topology: {
        orderedStepCount: 23,
        cardinalHalfStepEdgeCount: 23,
        topologyFailureCount: 0,
        lowestSurfaceY2: 123,
        highestSurfaceY2: 145,
        topAnchor: { x: 2108, y: 72, z: -398 },
        retainedInteriorDeck: { x: 2108, y: 72, z: -399 },
        finalDeckCardinalDistance: 1,
      },
      containment: {
        headClearanceAirCellCount: 46,
        headClearanceMismatchCount: 0,
        outerBarrierSolidCellCount: 40,
        outerBarrierMismatchCount: 0,
        retainedCapCellCount: 2,
        retainedCapMismatchCount: 0,
        retainedCrownCellCount: 12,
        retainedCrownMismatchCount: 0,
        exteriorDoorInstalled: false,
        publicRouteCommissioned: false,
      },
    });
  });

  it('proves bounded drift and all retained releases/gravity/entities remain unchanged', () => {
    const current = report();
    expect(current.drift).toMatchObject({
      interactionHaloCellCount: 638,
      changedCellCount: 159,
      declaredTargetChangedCellCount: 159,
      undeclaredChangedCellCount: 0,
      lifecycleTransitionCount: 0,
    });
    expect(Object.values(current.preservation.priorReleaseTargets).every((record) => (
      record.retainedChangedCellCount === 0
    ))).toBe(true);
    expect(current.preservation.priorReleaseTargets).toMatchObject({
      r07jSurfaceHeadhouse: { transformedInterfaceCellCount: 5 },
      r09eDryUpperStair: { transformedInterfaceCellCount: 6 },
    });
    expect(current.preservation.gravity).toEqual({
      cellCount: 7,
      changedCellCount: 0,
      unsupportedCellCount: 0,
      supportChangedCellCount: 0,
    });
    expect(current.entityAndBlockEntityPreservation).toMatchObject({
      sourceSnapshotBlockEntityCount: 0,
      sourceSnapshotSavedEntityCount: 0,
      postSnapshotBlockEntityCount: 0,
      postSnapshotSavedEntityCount: 0,
    });
  });

  it('binds 24/24 stages, both journals, entity gates, and reverse 33 then 126', () => {
    const current = report();
    expect(current.executionEvidence).toMatchObject({
      wrapperStageCount: 24,
      wrapperPassedStageCount: 24,
      wrapperFailedStageCount: 0,
    });
    expect(Object.values(current.executionEvidence.packageEvidence).every((evidence) => (
      evidence.strictForwardExecution.passed === true
      && evidence.rollbackPoststatePreflight.passed === true
    ))).toBe(true);
    expect(current.checks).toHaveLength(14);
    expect(current.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(current.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
      publicOrFireServiceCommissioningGranted: false,
    });
  });
});
