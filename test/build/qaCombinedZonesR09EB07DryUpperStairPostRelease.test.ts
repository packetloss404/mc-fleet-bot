import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09e_b07_dry_upper_stair_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09e-live-20260822T011348Z',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09e-post-qa-'),
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

const readReport = (): QaReport => JSON.parse(
  fs.readFileSync(path.join(EVIDENCE, 'r09e-post-release-qa.json'), 'utf8'),
) as QaReport;

let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--generated-at', '2026-08-22T01:20:00Z',
    '--evidence-dir', 'data/world-review/combined-zones-r09e-live-20260822T011348Z',
    '--ledger',
    'data/world-review/combined-zones-r09e-live-20260822T011348Z/evidence-ledger.json',
    '--manifest',
    'data/buildops/combined-zones-r09e-b07-dry-upper-stair.release-manifest.json',
    '--source-root', 'data/worldsnap-combined-zones-r09e-source-20260822T011348Z',
    '--post-root', 'data/worldsnap-combined-zones-r09e-post-20260822T011348Z',
    '--out', temporaryJson,
    '--markdown', temporaryMarkdown,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(temporaryJson);
  firstMarkdown = fs.readFileSync(temporaryMarkdown);
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R09E B07 dry upper-stair post-release QA', () => {
  it('regenerates canonical JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(firstJson);
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(firstMarkdown);
    expect(firstJson).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r09e-post-release-qa.json')));
    expect(firstMarkdown).toEqual(fs.readFileSync(path.join(EVIDENCE, 'r09e-post-release-qa.md')));
  });

  it('binds the completed wrapper and immutable source/post identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R09E_B07_DRY_UPPER_STAIR_POSTSTATE_VERIFIED_REVERSIBLE_FAIL_CLOSED',
      qaPayloadSha256:
        '456810635961f7e8725c2da2e5a01fbc6f653cd52a99ef14be31135bfdcf269f',
      release: {
        manifestIdentity:
          '10fb02c514bcd5bb14e7febf987ae9fa7f1c22ab9e5bbb4fcdb9f30698ffcc7f',
        sourceBoundReleaseIdentitySha256:
          '1c50d337c0032bfd814e4b35f4a43c59e4850b28753ecba2e7ee78a0d62365d5',
        completedReleaseIdentitySha256:
          '2ea1f26641a95b82078f10061a4c760b5b47cb2fd4586efb3fc1747069d6495e',
      },
      bindings: {
        evidenceBindingCount: 25,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '44ab7d9018dcfa1ca165fb4b8c8d79ecc98a677e1875ceeff6e9568ea9bf8f44',
          regionSnapshotSha256:
            'e03aff6c4be1efa772b08776a6d98e8eb50f34eea3e68518bd6b2e9cf68a46c9',
        },
        postCompleteSave: {
          completeSaveSha256:
            '68b36cde83b73b4bd3fd696385fa43140fd60cd1ee5351189418103a1cf73694',
          regionSnapshotSha256:
            'c448fa5d6f623255f78d30de4f25d940f0881f6588fb8c02e5509635105ce784',
        },
      },
    });
  });

  it('proves every target state, material, and reverse guard', () => {
    expect(readReport()).toMatchObject({
      exactState: {
        sourceCensus: { 'minecraft:air': 1232 },
        desiredCensus: {
          'minecraft:polished_andesite': 1091,
          'minecraft:polished_diorite': 53,
          'minecraft:smooth_stone_slab[type=top,waterlogged=false]': 46,
          'minecraft:smooth_stone_slab[type=bottom,waterlogged=false]': 42,
        },
        sourceMatchingCellCount: 1232,
        sourceMismatchCount: 0,
        postMatchingCellCount: 1232,
        postMismatchCount: 0,
        deckMatchingCellCount: 49,
        frameworkMatchingCellCount: 1183,
      },
      summary: {
        exactTargetCellCount: 1232,
        deckCellCount: 49,
        frameworkCellCount: 1183,
        rollbackReadyCellCount: 1232,
      },
    });
  });

  it('proves topology, clearance, containment, caps, and closed termini', () => {
    expect(readReport()).toMatchObject({
      topology: {
        orderedStepCount: 88,
        cardinalAdjacencyCount: 87,
        maximumRiseHalfBlocks: 1,
        topologyFailureCount: 0,
        lowestSurfaceY2: 39,
        highestSurfaceY2: 122,
      },
      containment: {
        headClearanceAirCellCount: 176,
        headClearanceMismatchCount: 0,
        headClearanceChangedCellCount: 0,
        requiredOuterBarrierCellCount: 176,
        retainedOuterBarrierCellCount: 174,
        operatedOuterGapCellCount: 2,
        containmentFailureCount: 0,
        retainedBarrierChangedCellCount: 0,
        lowerInterfaceDeckClosedCellCount: 49,
        upperRetainedCapCellCount: 2,
        upperCoreCrownCellCount: 16,
        lowerInterfaceClosed: true,
        upperInterfaceClosed: true,
        upperStairCommissioned: false,
      },
    });
  });

  it('proves bounded drift and every adjacent release remains unchanged', () => {
    const report = readReport();
    expect(report.drift).toMatchObject({
      interactionHaloCellCount: 2852,
      changedCellCount: 1232,
      declaredTargetChangedCellCount: 1232,
      undeclaredChangedCellCount: 0,
      lifecycleTransitionCount: 0,
      lifecycleTransitions: [],
    });
    expect(Object.values(report.preservation.priorReleaseTargets).every((record) => (
      record.changedCellCount === 0
    ))).toBe(true);
    expect(report.preservation.priorReleaseTargets.r06WetTreatment).toMatchObject({
      sourceDesiredMismatchCount: 12,
      postDesiredMismatchCount: 12,
    });
    expect(Object.entries(report.preservation.priorReleaseTargets)
      .filter(([key]) => key !== 'r06WetTreatment')
      .every(([, record]) => record.postDesiredMismatchCount === 0)).toBe(true);
    expect(report.summary).toMatchObject({
      priorReleaseChangedCellCount: 0,
      undeclaredHaloChangedCellCount: 0,
      routeCommissioned: false,
    });
  });

  it('binds 24/24 wrapper stages, both journals, rollback, and entity gates', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      wrapperStageCount: 24,
      wrapperPassedStageCount: 24,
      wrapperFailedStageCount: 0,
    });
    expect(Object.values(report.executionEvidence.packageEvidence).every((evidence) => (
      evidence.strictForwardExecution.passed === true
      && evidence.rollbackPoststatePreflight.passed === true
    ))).toBe(true);
    expect(report.entityAndBlockEntityPreservation).toMatchObject({
      sourceSnapshotBlockEntityCount: 0,
      sourceSnapshotSavedEntityCount: 0,
      postSnapshotBlockEntityCount: 0,
      postSnapshotSavedEntityCount: 0,
    });
    expect(report.checks).toHaveLength(20);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
      publicOrFireServiceCommissioningGranted: false,
    });
  });
});
