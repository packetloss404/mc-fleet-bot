import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r09j_b07_upper_route_gravity_isolation_cap_post_release.mjs');
const REPORT = path.join(ROOT, 'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09j-post-release-qa.json');

interface Report {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, unknown>;
  bindings: Record<string, unknown>;
  exactState: Record<string, unknown>;
  geometry: Record<string, unknown>;
  preservation: Record<string, unknown>;
  drift: Record<string, unknown>;
  executionEvidence: Record<string, unknown>;
  summary: Record<string, unknown>;
  safetyBoundary: Record<string, boolean>;
}

let output = '';
let report: Report;

beforeAll(() => {
  output = execFileSync(process.execPath, [SCRIPT], { cwd: ROOT, encoding: 'utf8' });
  report = JSON.parse(fs.readFileSync(REPORT, 'utf8')) as Report;
}, 30_000);

describe('CZ-R09J B07 upper-route gravity-isolation cap independent post QA', () => {
  it('seals the exact completed release and immutable post', () => {
    expect(JSON.parse(output)).toMatchObject({
      status: 'PASS_R09J_B07_GRAVITY_ISOLATION_CAP_POSTSTATE_VERIFIED_REVERSIBLE',
      qaPayloadSha256: 'f80caf3936e1d485b130a8a5c49df914b69de6a3072322c6bd487ec559efee6a',
    });
    expect(report).toMatchObject({
      release: {
        manifestIdentity: 'c6bcf5546abfd9aaceb24d3e0ee70b4b57cb07e47be800baa08478a1ad2306a1',
        completedReleaseIdentitySha256: '0c722e3ac473ab22239bba599bbab8c1b9776f727212442bf9a044c40494a47d',
      },
      bindings: {
        postCompleteSaveSha256: '81cf43e16f60b875e5e4eb5f50df0f43487ed9b3fd2f52e7883b22e2147c5132',
        postRegionSha256: '072bfa045bbc55b457585bd6725159cc97a4650b73e7769b4f977a2972682067',
      },
    });
  });

  it('verifies both exact air-to-diorite caps and reverse inverse', () => {
    expect(report.exactState).toMatchObject({
      targetCellCount: 2,
      sourceMatchingCellCount: 2,
      postMatchingCellCount: 2,
      sourceState: 'minecraft:air',
      targetState: 'minecraft:polished_diorite',
      exactReverseOrderInverse: true,
    });
    expect(report.geometry).toMatchObject({
      isolationCap: {
        cellCount: 2,
        coordinateSetSha256: '6433ef6a7b50624b39806d156a25bb11fdfe9beef03c494136b5d5fd2d1d163b',
      },
    });
  });

  it('proves the exact isolated upper graph, clearance, boundary, and support', () => {
    expect(report.geometry).toMatchObject({
      retainedUpperSurfaceCount: 91,
      retainedUpperClearanceAirCount: 182,
      retainedUpperBoundaryCellCount: 174,
      retainedUpperBoundaryCollisionCount: 172,
      retainedUpperBoundaryBackedApertureCount: 2,
      retainedUpperBoundaryGravityCount: 8,
      unsupportedUpperBoundaryGravityCount: 0,
      reachableUpperSurfaceCount: 91,
      reachableExcludedLowerSurfaceCount: 0,
      blockedStairIndex: 20,
      commissionedSegmentStartStairIndex: 21,
      commissionedSegmentEndStairIndex: 110,
    });
  });

  it('preserves every unsupported-gravity, wet, exterior, mechanism, and entity hold', () => {
    expect(report.preservation).toMatchObject({
      inheritedUnsupportedBoundaryCellCount: 2,
      unsupportedTerminalAirPreserved: true,
      lowerWetContainmentDeckCellCount: 49,
      doorlessHeadhouseWallCellCount: 72,
      headhouseRoofCellCount: 49,
      passiveFixtureCellCount: 8,
      sourceMechanismCellCount: 0,
      postMechanismCellCount: 0,
      sourceBlockEntityCount: 0,
      postBlockEntityCount: 0,
      sourceSavedEntityCount: 0,
      postSavedEntityCount: 0,
    });
  });

  it('classifies only the two declared changes in halo and full B07 domain', () => {
    expect(report.drift).toMatchObject({
      haloCellCount: 36,
      haloChangedCellCount: 2,
      haloUndeclaredChangedCellCount: 0,
      b07InteractionCellCount: 13608,
      b07InteractionChangedCellCount: 2,
      b07InteractionUndeclaredChangedCellCount: 0,
      lifecycleTransitionCellCount: 0,
      mechanismChangedCellCount: 0,
    });
  });

  it('passes 15/15 with complete wrapper journal and rollback guards', () => {
    expect(report.executionEvidence).toMatchObject({
      stageCount: 17,
      evidenceBindingCount: 17,
      evidenceBindingFailureCount: 0,
      successfulGroupCount: 2,
      noopCommandCount: 0,
      journalEntryCount: 10,
      journalComplete: true,
      rollbackPassed: 2,
      rollbackFailed: 0,
    });
    expect(report.summary).toMatchObject({ passed: true, checkCount: 15, passCount: 15, failCount: 0 });
    expect(report.safetyBoundary).toMatchObject({
      physicalIsolationAccepted: true,
      boundedUpperSegmentCommissionedByThisQa: false,
      fullRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationPerformedByQa: false,
    });
  });
});
