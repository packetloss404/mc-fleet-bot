import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07e_b09_summit_headhouse_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07e-live-20260821T170500Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07e-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07e-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07e-post-qa-'),
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
  release: {
    transactionId: string;
    releaseNodeId: string;
    scopeIds: string[];
    manifestIdentity: string;
    sourceBoundReleaseIdentitySha256: string;
    completedReleaseIdentitySha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    evidenceBindingCount: number;
    evidenceBindingFailures: unknown[];
    sourceCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  geometry: Record<string, ExactSet>;
  postState: {
    shell: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      matchingTransitionCount: number;
      mismatchCount: number;
    };
    preservedInterior: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      unchangedAirCellCount: number;
      mismatchCount: number;
      connectivity: { componentCount: number; largestComponentCellCount: number };
    };
    summitInterfaceCap: {
      matchingTransitionCount: number;
      mismatchCount: number;
      physicallyClosed: boolean;
    };
    guidewayApproachCap: {
      matchingTransitionCount: number;
      mismatchCount: number;
      physicallyClosed: boolean;
    };
    preservedPriorInterfaces: {
      b08PortalSeam: { unchangedCellCount: number; changedCellCount: number };
      acceptedR07DLowerShell: { unchangedCellCount: number; changedCellCount: number };
    };
    fullB09Accommodation: {
      sourceStateCensus: Record<string, number>;
      postStateCensus: Record<string, number>;
      sourceStateSetSha256: string;
      postStateSetSha256: string;
      changedCellCount: number;
      nonShellChangedCellCount: number;
    };
  };
  executionEvidence: Record<string, unknown>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

function readReport(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T17:08:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07E B09 summit-headhouse post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, complete saves, and release identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07E_B09_SUMMIT_HEADHOUSE_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '53d4fce9b5e1dd658655ee364cdf50a6b56922e322e2b2174a5f1d732268943d',
      release: {
        transactionId: 'combined-zones-r07e-b09-summit-headhouse-shell',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B09', 'Z11-SUMMIT-INTERFACE'],
        manifestIdentity:
          'e3e0055b807d28c7d52748c93f16b30d1903a719af3b31176b8805b6fcc0472d',
        sourceBoundReleaseIdentitySha256:
          '18b02fa7d1d5d0c4aa4d77c3122abaafcde92e6ae7ab34673c3939c1b6c4be65',
        completedReleaseIdentitySha256:
          '8ad00954eff48a4d6d5f7b2acb0505bed9169d07ad8c6214818106faec67e953',
      },
      bindings: {
        ledger: {
          sha256: 'f6c5957396048caa4f4771d1d78f00abc80e2b7754c98e6a7f2accdc764345d3',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '454fb9a8cf32550ccf7547921ffe23e5b04dc0fa5aa514ae4ba778b428edf28b',
        },
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '0e0b0f2d72d2d5f565d5f7fb83d0f78aee85a0018f573a959e393fbabfcc614e',
          regionSnapshotSha256:
            '4a2936fc0c7ca463736ad5320dba16f9d50fb63f694ac3d35d2f7426fdff432b',
        },
        postCompleteSave: {
          completeSaveSha256:
            '605535ea361acf3c061586c666e59f6218d7965e4a72308d35a56637ae60ddd3',
          regionSnapshotSha256:
            '773729c102c13f127421a910fb65f6a81e15ae7fadfd311e7062c294d1a795cb',
        },
      },
    });
  });

  it('independently reproduces exact summit shell, void, caps, and interfaces', () => {
    expect(readReport().geometry).toMatchObject({
      minimumPlanningAccommodation: {
        cellCount: 7800,
        coordinateSetSha256:
          'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
      },
      summitStationEnvelope: {
        cellCount: 180,
        coordinateSetSha256:
          '99d28f072ae6055d394a9690c125b4e0de58b09192cc3fd166302060f3bb9599',
      },
      connectedRailAndHeadroomVoid: {
        cellCount: 18,
        coordinateSetSha256:
          '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
      },
      summitHeadhouseShell: {
        cellCount: 162,
        coordinateSetSha256:
          '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
      },
      interiorFaceBoundary: {
        cellCount: 58,
        coordinateSetSha256:
          'bdd0ba179cc533a5c707137a606254fa06c916bfe28fd0c59da77f168f4eab06',
      },
      guidewayApproachCap: {
        cellCount: 12,
        coordinateSetSha256:
          '8ef484d874dca406f5a8abbc6dd8306ff2770ab304c10bddbc01db5c4107ad5c',
      },
      summitInterfaceCap: {
        cellCount: 12,
        coordinateSetSha256:
          'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
      },
      b08PortalSeam: { cellCount: 36 },
      acceptedR07DLowerShell: { cellCount: 84 },
    });
  });

  it('proves exact shell transitions and connected interior air', () => {
    const postState = readReport().postState;
    expect(postState.shell).toMatchObject({
      sourceStateCensus: { 'minecraft:air': 162 },
      postStateCensus: { 'minecraft:polished_diorite': 162 },
      matchingTransitionCount: 162,
      mismatchCount: 0,
    });
    expect(postState.preservedInterior).toMatchObject({
      sourceStateCensus: { 'minecraft:air': 18 },
      postStateCensus: { 'minecraft:air': 18 },
      unchangedAirCellCount: 18,
      mismatchCount: 0,
      connectivity: { componentCount: 1, largestComponentCellCount: 18 },
    });
  });

  it('proves both caps closed and prior R07 interfaces unchanged', () => {
    expect(readReport().postState).toMatchObject({
      summitInterfaceCap: {
        matchingTransitionCount: 12,
        mismatchCount: 0,
        physicallyClosed: true,
      },
      guidewayApproachCap: {
        matchingTransitionCount: 12,
        mismatchCount: 0,
        physicallyClosed: true,
      },
      preservedPriorInterfaces: {
        b08PortalSeam: { unchangedCellCount: 36, changedCellCount: 0 },
        acceptedR07DLowerShell: { unchangedCellCount: 84, changedCellCount: 0 },
      },
    });
  });

  it('proves zero undeclared drift across the full B09 accommodation', () => {
    expect(readReport().postState.fullB09Accommodation).toEqual({
      sourceStateCensus: {
        'minecraft:air': 7713,
        'minecraft:polished_diorite': 87,
      },
      postStateCensus: {
        'minecraft:air': 7551,
        'minecraft:polished_diorite': 249,
      },
      sourceStateSetSha256:
        '2bbe43cd7463cbeccfe3140c63e23edb89eb99b2fadecfe9752887c4dfe624ae',
      postStateSetSha256:
        'a84911a9e54009f6d3ad4e4f6792c4ff60ee0b9fc8a068d9453f25f1c3e98846',
      changedCellCount: 162,
      nonShellChangedCellCount: 0,
    });
  });

  it('binds strict execution, exact inverse, and all acceptance checks', () => {
    const report = readReport();
    expect(report.executionEvidence).toEqual({
      strictForwardExecution: {
        path: expect.any(String),
        sha256: '0f9f1ea80a4511dc21f739c44e0b92b82372e59f20653205aa8967646adab0c5',
        bytes: expect.any(Number),
        operationSha256:
          'b248011a3372caaf3953639e0b2360a819bb6466526a8875ed92e6d7e4ac9d99',
        successfulGroups: 162,
        failedGroups: 0,
        noopCommands: 0,
        unknownReplyCommands: 0,
        worldEditLeftoverCount: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        path: expect.any(String),
        sha256: '41cb93aaa145e40ede1d62a1c28dceb99a8d97a935f382dccc3f87cd4930b846',
        bytes: expect.any(Number),
        opsSha256:
          '363616a49e7c4434cf26132fef25d0335007f8008be5611830909a72dfd96f4a',
        passedGuards: 162,
        failedGuards: 0,
        regionSnapshotSha256:
          '773729c102c13f127421a910fb65f6a81e15ae7fadfd311e7062c294d1a795cb',
        passed: true,
      },
      exactOneCellForwardGuards: true,
      exactReverseOrderInverse: true,
    });
    expect(report.checks).toHaveLength(13);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 13,
      passCount: 13,
      failCount: 0,
      shellTransitionCount: 162,
      interiorUnchangedAirCellCount: 18,
      summitInterfaceCapClosedCellCount: 12,
      guidewayApproachCapClosedCellCount: 12,
      b08SeamUnchangedCellCount: 36,
      r07dLowerShellUnchangedCellCount: 84,
      fullB09ChangedCellCount: 162,
      nonShellB09ChangeCount: 0,
      strictSuccessfulGroupCount: 162,
      rollbackGuardPassCount: 162,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
