import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07h_b09_lower_guideway_segment_02_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07h-live-20260821T183544Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07h-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07h-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07h-post-qa-'),
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
  postState: Record<string, Record<string, unknown>>;
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
    '--generated-at', '2026-08-21T18:40:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07H B09 lower guideway Segment 02 post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, immutable saves, and release identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07H_B09_LOWER_GUIDEWAY_SEGMENT_02_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        'b849c99bf162da8bbd3eee063d4bab6699b04acaef73652b84612b07a25ed7ed',
      release: {
        transactionId: 'combined-zones-r07h-b09-lower-guideway-segment-02',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B09'],
        manifestIdentity:
          'a1797eff976b42649ba9dfc3cfa08112e85a6d06f73ca3a14427f6c3dc586416',
        sourceBoundReleaseIdentitySha256:
          'be6e839f4334362c4710498964be327962f030c64fc69bfebd860e2f62bd9963',
        completedReleaseIdentitySha256:
          '1990844b4371b48ed6e5e851ec986cc908e9d5ed030d9760e226c04d02dfe88f',
      },
      bindings: {
        ledger: {
          sha256: '7bdc51889ce5a623deed492ef476cd57925649b46c9134c11ece035d7e8165bc',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '63c8189593a9c6974fc5562630aee6ceffa30d268ccc69bec97f7e91dc5ac18e',
        },
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '670fb4e2a7034cc77ea30ca0fb3850e4c53e16d87cf061bdbad3d055bf09ffb6',
          regionSnapshotSha256:
            '6d444e21d835bffd4a30ae704f746861cbf049db639caf51082648959bf8db30',
        },
        postCompleteSave: {
          completeSaveSha256:
            '12df71af54a5e02e092190fa18b1f3d8206d929d507537cc0593318d7c23182e',
          regionSnapshotSha256:
            '6fc61a5e77a930c3a4fdbddc5ed4a26205ec5980aca7825245c57d932a909b81',
        },
      },
    });
  });

  it('re-derives the exact shell, owned seam, connected void, boundary, and cap', () => {
    expect(readReport().geometry).toMatchObject({
      minimumPlanningAccommodation: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      staticSegmentShell: {
        cellCount: 2152,
        coordinateSetSha256:
          'e5a7cd983244d917f6a10a2fc85673f10d97460a62a5ac697f621d2330ee2097',
      },
      ownedR07fFarCapSeamOpening: {
        cellCount: 2,
        coordinateSetSha256:
          '0ed8967e3b4982f7fe4e1a8d054561552a1c9a21a2c8e2f9ada2f252e8e2cbd7',
      },
      operatedUnion: {
        cellCount: 2154,
        coordinateSetSha256:
          'f797de91a3544c0e233cbbaadfd1a08bbc2b9b1141cd1cb1a0159f19710c1d9d',
      },
      connectedLowerStationAndSegmentsVoid: {
        cellCount: 474,
        coordinateSetSha256:
          '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
      },
      connectedVoidFaceBoundary: {
        cellCount: 1426,
        coordinateSetSha256:
          '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
      },
      retainedPriorFarCapCollar: { cellCount: 10 },
      farIsolationCap: { cellCount: 12 },
      retainedFutureCurveSeam: { cellCount: 2 },
      b08PortalSeam: { cellCount: 36 },
      summitInterfaceCap: { cellCount: 12 },
    });
  });

  it('proves every transition and the complete connected enclosure', () => {
    expect(readReport().postState).toMatchObject({
      shell: {
        sourceStateCensus: { 'minecraft:air': 2152 },
        postStateCensus: { 'minecraft:polished_diorite': 2152 },
        matchingTransitionCount: 2152,
        mismatchCount: 0,
      },
      r07fSeam: {
        sourceStateCensus: { 'minecraft:polished_diorite': 2 },
        postStateCensus: { 'minecraft:air': 2 },
        matchingTransitionCount: 2,
        mismatchCount: 0,
      },
      connectedVoid: {
        postStateCensus: { 'minecraft:air': 474 },
        airCellCount: 474,
        mismatchCount: 0,
        connectivity: { componentCount: 1, largestComponentCellCount: 474 },
      },
      completeBoundary: {
        postStateCensus: { 'minecraft:polished_diorite': 1426 },
        polishedDioriteCellCount: 1426,
        mismatchCount: 0,
      },
      farIsolationCap: {
        matchingTransitionCount: 12,
        mismatchCount: 0,
        physicallyClosed: true,
        futureCurveSeamClosed: true,
      },
    });
  });

  it('proves prior releases and external interfaces remain unchanged', () => {
    expect(readReport().postState).toMatchObject({
      priorReleasePreservation: {
        r07d: { cellCount: 84, unchangedCellCount: 84, changedCellCount: 0 },
        r07e: { cellCount: 162, unchangedCellCount: 162, changedCellCount: 0 },
        r07f: {
          cellCount: 162,
          excludedOwnedSeamCellCount: 2,
          unchangedCellCount: 162,
          changedCellCount: 0,
        },
      },
      preservedExternalInterfaces: {
        b08PortalSeam: { unchangedCellCount: 36, changedCellCount: 0 },
        summitInterfaceCap: { unchangedCellCount: 12, changedCellCount: 0 },
      },
    });
  });

  it('proves zero undeclared drift across the full B09 accommodation', () => {
    expect(readReport().postState.fullB09Accommodation).toEqual({
      sourceStateCensus: {
        'minecraft:air': 7391,
        'minecraft:polished_diorite': 409,
      },
      postStateCensus: {
        'minecraft:air': 5241,
        'minecraft:polished_diorite': 2559,
      },
      sourceStateSetSha256:
        'c68ad8effd7a3f0e258311575fd3414a29c52e363bb793b099487779f03ba561',
      postStateSetSha256:
        'b5f545101ceb768cc765daa9e668c2f6ffefa623864faba70db656cafb758b20',
      changedCellCount: 2154,
      nonOperatedChangedCellCount: 0,
    });
  });

  it('binds strict execution, rollback guards, all checks, and read-only scope', () => {
    const report = readReport();
    expect(report.executionEvidence).toEqual({
      strictForwardExecution: {
        path: expect.any(String),
        sha256: '0848470ae847683b75d038a743f23aaa2585c7033399dc2f70718b1f125bd7f7',
        bytes: expect.any(Number),
        operationSha256:
          'e0e5d05bb0cbb1ab8b1dd0feb231d0d9238a0f55e6062fb3e73bd5bca3036b53',
        successfulGroups: 2154,
        failedGroups: 0,
        noopCommands: 0,
        unknownReplyCommands: 0,
        worldEditLeftoverCount: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        path: expect.any(String),
        sha256: 'eecc64b68acad6f1766c53b35ddcae8b1fbdbab5e81cd446430e070ba00a02ae',
        bytes: expect.any(Number),
        opsSha256:
          'a61356af44c1326e834bf175f62b3d37ebcd01aad25b382c02f400d847d5daea',
        passedGuards: 2154,
        failedGuards: 0,
        regionSnapshotSha256:
          '6fc61a5e77a930c3a4fdbddc5ed4a26205ec5980aca7825245c57d932a909b81',
        passed: true,
      },
      exactReverseOrderInverse: true,
      rollbackResealsSeamBeforeShellRemoval: true,
    });
    expect(report.checks).toHaveLength(14);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 14,
      passCount: 14,
      failCount: 0,
      shellTransitionCount: 2152,
      seamTransitionCount: 2,
      connectedVoidAirCellCount: 474,
      boundaryPolishedDioriteCellCount: 1426,
      farCapClosedCellCount: 12,
      r07dPreservedCellCount: 84,
      r07ePreservedCellCount: 162,
      r07fNonSeamPreservedCellCount: 162,
      b08UnchangedCellCount: 36,
      z11UnchangedCellCount: 12,
      fullB09ChangedCellCount: 2154,
      undeclaredB09ChangeCount: 0,
      strictSuccessfulGroupCount: 2154,
      rollbackGuardPassCount: 2154,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
