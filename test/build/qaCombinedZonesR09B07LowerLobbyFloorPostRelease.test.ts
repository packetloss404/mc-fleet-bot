import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r09_b07_lower_lobby_floor_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r09a-live-20260821T163535Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r09a-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r09a-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r09a-post-qa-'),
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
    sourceCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    terminalEvidenceBindingCount: number;
    terminalEvidenceBindingFailureCount: number;
  };
  executionEvidence: {
    strictSuccessfulGroupCount: number;
    strictFailedGroupCount: number;
    strictNoopCount: number;
    package: {
      passed: boolean;
      allTemporaryChunksReleased: boolean;
      forceLoadSetRestored: boolean;
      streamJournal: { sha256: string };
    };
    rollbackPoststatePreflight: {
      passed: boolean;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
    };
  };
  geometry: {
    floor: ExactSet;
    primaryFinish: ExactSet;
    secondaryAisle: ExactSet;
    support: ExactSet;
    headroom: ExactSet;
    shaftApproach: ExactSet;
    shaftSeam: ExactSet;
    floorConnectivity: {
      componentCount: number;
      largestComponentCellCount: number;
      everyCellHasTwoBlockHeadroom: boolean;
      shaftAccessFloorCellCount: number;
    };
  };
  stateTransition: {
    sourceStateCensus: Record<string, number>;
    sourceMatchingCellCount: number;
    sourceMismatchCellCount: number;
    postStateCensus: Record<string, number>;
    postMatchingCellCount: number;
    postMismatchCellCount: number;
    rollbackExactInverse: boolean;
  };
  support: {
    sourceStateCensus: Record<string, number>;
    postStateCensus: Record<string, number>;
    stableMatchingCellCount: number;
    mismatchCellCount: number;
  };
  clearanceAndRoute: {
    headroomStateCensus: Record<string, number>;
    headroomAirCellCount: number;
    headroomMismatchCount: number;
    shaftApproachAirCellCount: number;
    shaftApproachMismatchCount: number;
    shaftSeamAirCellCount: number;
    shaftSeamMismatchCount: number;
    lobbyUsable: boolean;
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
    exactFloorStateCellCount: number;
    polishedAndesiteCellCount: number;
    polishedDioriteCellCount: number;
    stableSupportCellCount: number;
    headroomAirCellCount: number;
    shaftApproachAirCellCount: number;
    shaftSeamAirCellCount: number;
    lobbyUsable: boolean;
    rollbackGuardCount: number;
  };
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
    '--generated-at',
    '2026-08-21T16:50:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R09A B07 lower-lobby floor post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, saves, and completed identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R09A_B07_LOWER_LOBBY_FLOOR_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '85ec48c7c9ede8ea96ce3214a712b6945727369ffaec4eb0f4296fc230975d3c',
      release: {
        transactionId: 'combined-zones-r09-b07-lower-lobby-floor',
        releaseNodeId: 'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
        scopeIds: ['P1-B07', 'Z06-PUBLIC-SHAFT-FITOUT'],
        manifestIdentity:
          'fc0fc7c512a7c8aab7276322958a3a2d6860acdf9a2c8447f112dde4bc959df6',
        sourceBoundReleaseIdentitySha256:
          'fb9008138cf47236a97dd618d9583f8bebde0b86c3566a9cb84bd0c92c78a087',
        completedReleaseIdentitySha256:
          '8396512df6919d7497d7b39c0af3019777d4133122dee8ff80b03932e6ac0ee8',
      },
      bindings: {
        ledger: {
          sha256:
            '051d6e9898161db0940b32dcac5226913e6e67bce610b2be2c8c191c194c277b',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256:
            'feb13cf67655b59fb810316d0b7f47d32bca5f93512ee24eb03d80251c70c47a',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '6e52f5b3f81c0451801a7cebbfdd6677af13da09c27a6d6fae4f0bacdbd48d89',
          regionSnapshotSha256:
            'b867d63962a32ed9f3a02fc96a7be0e25ba19d3542019369e9e9302db0f9b8e7',
        },
        postCompleteSave: {
          completeSaveSha256:
            'ae68ac762092df0cff0203e87926eb8f809166e44231ca68a1e1eda6fd1b50cb',
          regionSnapshotSha256:
            '7dadac331af83c96693723dce2e06640a0f1740ec8cd14ee558aa7d5ebfb9c6c',
        },
        terminalEvidenceBindingCount: 17,
        terminalEvidenceBindingFailureCount: 0,
      },
    });
  });

  it('proves all exact floor states and stable unchanged support', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      floor: {
        cellCount: 63,
        coordinateSetSha256:
          '1d6d17740ee4df2253b3d2825456097cdadae5d108142d84174b03a38c9a82cd',
      },
      primaryFinish: { cellCount: 36 },
      secondaryAisle: { cellCount: 27 },
      support: {
        cellCount: 63,
        coordinateSetSha256:
          '80078ac75c01dbeaa857ed8300d32d8a7a2a2595c76a86b66083020719233ea9',
      },
    });
    expect(report.stateTransition).toEqual({
      sourceStateCensus: { 'minecraft:air': 63 },
      sourceMatchingCellCount: 63,
      sourceMismatchCellCount: 0,
      listedSourceMismatches: [],
      postStateCensus: {
        'minecraft:polished_andesite': 36,
        'minecraft:polished_diorite': 27,
      },
      postMatchingCellCount: 63,
      postMismatchCellCount: 0,
      listedPostMismatches: [],
      rollbackExactInverse: true,
    });
    expect(report.support).toMatchObject({
      sourceStateCensus: {
        'minecraft:deepslate[axis=y]': 43,
        'minecraft:bedrock': 10,
        'minecraft:tuff': 10,
      },
      postStateCensus: {
        'minecraft:deepslate[axis=y]': 43,
        'minecraft:bedrock': 10,
        'minecraft:tuff': 10,
      },
      stableMatchingCellCount: 63,
      mismatchCellCount: 0,
    });
  });

  it('proves two-block clearance and a connected lobby-to-shaft route', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      headroom: { cellCount: 126 },
      shaftApproach: { cellCount: 343 },
      shaftSeam: { cellCount: 49 },
      floorConnectivity: {
        componentCount: 1,
        largestComponentCellCount: 63,
        everyCellHasTwoBlockHeadroom: true,
        shaftAccessFloorCellCount: 49,
      },
    });
    expect(report.clearanceAndRoute).toMatchObject({
      headroomStateCensus: { 'minecraft:air': 126 },
      headroomAirCellCount: 126,
      headroomMismatchCount: 0,
      shaftApproachAirCellCount: 343,
      shaftApproachMismatchCount: 0,
      shaftSeamAirCellCount: 49,
      shaftSeamMismatchCount: 0,
      lobbyUsable: true,
    });
  });

  it('seals strict execution, inverse guards, checks, and read-only scope', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 3,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
      package: {
        passed: true,
        allTemporaryChunksReleased: true,
        forceLoadSetRestored: true,
        streamJournal: {
          sha256:
            '16635ea5066f7524cabd2d8e89c1a370d8a2569706ea9481d613ac9e2bb929b7',
        },
      },
      rollbackPoststatePreflight: {
        passed: true,
        passedGuards: 3,
        failedGuards: 0,
        regionSnapshotSha256:
          '7dadac331af83c96693723dce2e06640a0f1740ec8cd14ee558aa7d5ebfb9c6c',
      },
    });
    expect(report.checks).toHaveLength(12);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 12,
      passCount: 12,
      failCount: 0,
      exactFloorStateCellCount: 63,
      polishedAndesiteCellCount: 36,
      polishedDioriteCellCount: 27,
      stableSupportCellCount: 63,
      headroomAirCellCount: 126,
      shaftApproachAirCellCount: 343,
      shaftSeamAirCellCount: 49,
      lobbyUsable: true,
      rollbackGuardCount: 3,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
