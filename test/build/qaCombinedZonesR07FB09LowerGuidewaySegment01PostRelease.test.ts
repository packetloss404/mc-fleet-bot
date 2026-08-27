import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07f_b09_lower_guideway_segment_01_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07f-live-20260821T172700Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07f-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07f-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07f-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface ExactSet {
  cellCount: number;
  coordinateSetSha256: string;
}

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string | string[]>;
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    evidenceBindingCount: number;
    evidenceBindingFailures: unknown[];
    sourceCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
    postCompleteSave: { completeSaveSha256: string; regionSnapshotSha256: string };
  };
  geometry: Record<string, ExactSet>;
  postState: Record<string, any>;
  executionEvidence: Record<string, unknown>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  safetyBoundary: Record<string, boolean>;
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T17:30:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07F B09 lower guideway segment 01 post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, complete saves, and release identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07F_B09_LOWER_GUIDEWAY_SEGMENT_01_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '516be068e82892c8c0f2b92aeffa901b501dc60eae5544fbbfb4aede64bc8d1c',
      release: {
        transactionId: 'combined-zones-r07f-b09-lower-guideway-segment-01',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B09'],
        manifestIdentity:
          '0260263944b561a612f786f1fb0fd0345d1afd18da4f5ff13e207cd777687354',
        sourceBoundReleaseIdentitySha256:
          'a1fa1cdcbc598d0d666116f81bab554c6300c13f0cdbdf254c9b4faa0e944b27',
        completedReleaseIdentitySha256:
          '15facdcd036fdfba27ef0e76a0167b00e1acf118804415da159167e46b4a806e',
      },
      bindings: {
        ledger: {
          sha256: 'f7c7aa14e7f8a6b6d29c802aa1b6c7525313a1ae60f8d2a65a5d3f3e55afa0d0',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'f8ade888c396f8407a40d4450f1dd9a01240a8640f7791185c7d23e253694823',
        },
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            'cc16e117d71b08fb887ab8960c48ea909b90c19ad6a9e281875db14c737f0d7f',
          regionSnapshotSha256:
            '34fe4e5f0d9f55fae19bfa97538cf35c4c599ad4f804cc866b794fc8132ce5c4',
        },
        postCompleteSave: {
          completeSaveSha256:
            'b7f0ec5a7712dd1b7252f0adb755ae8d8374bf2f63740f089ec79f15f03c7410',
          regionSnapshotSha256:
            '59806371004dc7b8244568ead943393206322af449d4b1808da95b5518926096',
        },
      },
    });
  });

  it('re-derives the exact segment, connected void, boundary, and interfaces', () => {
    expect(readReport().geometry).toMatchObject({
      minimumPlanningAccommodation: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      staticSegmentShell: {
        cellCount: 162,
        coordinateSetSha256:
          '7cb64c9af7d0f37695b9a4c30f888bfe373eb315bec4d9530ab915674a567ea6',
      },
      ownedInternalSeamOpening: {
        cellCount: 2,
        coordinateSetSha256:
          '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
      },
      operatedUnion: {
        cellCount: 164,
        coordinateSetSha256:
          '2d0ac7f21afb5835112b47f3fba677939a4d4d2617f497cfe284cc0d11beed96',
      },
      connectedLowerStationAndSegmentVoid: {
        cellCount: 44,
        coordinateSetSha256:
          '5eedb05ad65d442f00c56caa04d37f5e29838bd4006df577605a1b6dcc4563e5',
      },
      connectedVoidFaceBoundary: {
        cellCount: 136,
        coordinateSetSha256:
          '0eb5742bd6dbb6a11959dbe79b5b714a40a575bc69d53a756d54afbebe849697',
      },
      retainedNearCapCollar: { cellCount: 10 },
      farIsolationCap: { cellCount: 12 },
      b08PortalSeam: { cellCount: 36 },
      summitInterfaceCap: { cellCount: 12 },
      acceptedR07ESummitShell: { cellCount: 162 },
    });
  });

  it('proves all shell, seam, connected-void, boundary, and cap states', () => {
    expect(readReport().postState).toMatchObject({
      shell: {
        sourceStateCensus: { 'minecraft:air': 162 },
        postStateCensus: { 'minecraft:polished_diorite': 162 },
        matchingTransitionCount: 162,
        mismatchCount: 0,
      },
      internalSeam: {
        sourceStateCensus: { 'minecraft:polished_diorite': 2 },
        postStateCensus: { 'minecraft:air': 2 },
        matchingTransitionCount: 2,
        mismatchCount: 0,
      },
      connectedVoid: {
        postStateCensus: { 'minecraft:air': 44 },
        airCellCount: 44,
        mismatchCount: 0,
        connectivity: { componentCount: 1, largestComponentCellCount: 44 },
      },
      completeBoundary: {
        postStateCensus: { 'minecraft:polished_diorite': 136 },
        polishedDioriteCellCount: 136,
        mismatchCount: 0,
      },
      farIsolationCap: {
        matchingTransitionCount: 12,
        mismatchCount: 0,
        physicallyClosed: true,
      },
      retainedNearCapCollar: {
        unchangedCellCount: 10,
        changedCellCount: 0,
      },
    });
  });

  it('proves B08, Z11, and R07E remain unchanged', () => {
    expect(readReport().postState.preservedInterfaces).toMatchObject({
      b08PortalSeam: { unchangedCellCount: 36, changedCellCount: 0 },
      summitInterfaceCap: { unchangedCellCount: 12, changedCellCount: 0 },
      acceptedR07ESummitShell: { unchangedCellCount: 162, changedCellCount: 0 },
    });
  });

  it('proves zero undeclared changes across all 7,800 B09 cells', () => {
    expect(readReport().postState.fullB09Accommodation).toEqual({
      sourceStateCensus: {
        'minecraft:air': 7551,
        'minecraft:polished_diorite': 249,
      },
      postStateCensus: {
        'minecraft:air': 7391,
        'minecraft:polished_diorite': 409,
      },
      sourceStateSetSha256:
        'a84911a9e54009f6d3ad4e4f6792c4ff60ee0b9fc8a068d9453f25f1c3e98846',
      postStateSetSha256:
        'c68ad8effd7a3f0e258311575fd3414a29c52e363bb793b099487779f03ba561',
      changedCellCount: 164,
      nonOperatedChangedCellCount: 0,
    });
  });

  it('binds strict execution, rollback, all checks, and read-only scope', () => {
    const report = readReport();
    expect(report.executionEvidence).toEqual({
      strictForwardExecution: {
        path: expect.any(String),
        sha256: 'df04c48cc07812cb46ca1dc1aac75d24ae1d397ac1049f2449cb426318b4a79f',
        bytes: expect.any(Number),
        operationSha256:
          '210cc1793f48557a1f56181f66203d2ca80debbdbfcd33afb5190281d9a93071',
        successfulGroups: 164,
        failedGroups: 0,
        noopCommands: 0,
        unknownReplyCommands: 0,
        worldEditLeftoverCount: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        path: expect.any(String),
        sha256: 'b167482fcc01fc82b0aff31717909d24b65a45acf2955bd7b9419b0d132ab17a',
        bytes: expect.any(Number),
        opsSha256:
          '42f38ff84f23419a2d2a1992d6e859ec7a96c9b66014b2f43289a3563259fc99',
        passedGuards: 164,
        failedGuards: 0,
        regionSnapshotSha256:
          '59806371004dc7b8244568ead943393206322af449d4b1808da95b5518926096',
        passed: true,
      },
      exactReverseOrderInverse: true,
      rollbackResealsSeamBeforeShellRemoval: true,
    });
    expect(report.checks).toHaveLength(15);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 15,
      passCount: 15,
      failCount: 0,
      shellTransitionCount: 162,
      seamTransitionCount: 2,
      connectedVoidAirCellCount: 44,
      boundaryPolishedDioriteCellCount: 136,
      farCapClosedCellCount: 12,
      nearCollarUnchangedCellCount: 10,
      b08UnchangedCellCount: 36,
      z11UnchangedCellCount: 12,
      r07eShellUnchangedCellCount: 162,
      fullB09ChangedCellCount: 164,
      undeclaredB09ChangeCount: 0,
      strictSuccessfulGroupCount: 164,
      rollbackGuardPassCount: 164,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
