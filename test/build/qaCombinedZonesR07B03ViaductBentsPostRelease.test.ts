import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07b_b03_viaduct_bents_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07b-live-20260821T161500Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07b-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07b-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07b-post-qa-'),
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
    };
    rollbackPoststatePreflight: {
      passed: boolean;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
    };
  };
  geometry: {
    candidateAnchorIndices: number[];
    selectedAnchorIndices: number[];
    excludedCandidates: Array<{
      anchorIndex: number;
      exclusions: Array<{ state: string; role: string }>;
    }>;
    beam: ExactSet;
    pairedLegs: ExactSet;
    completeSupportSet: ExactSet;
    foundationContacts: ExactSet & {
      sourceStateCensus: Record<string, number>;
    };
    connectivity: {
      componentCount: number;
      largestComponentCellCount: number;
      componentSetSha256: string;
    };
    tubeAttachments: ExactSet & {
      attachedComponentCount: number;
      everyBentAttached: boolean;
    };
  };
  stateTransition: {
    sourceStateCensus: Record<string, number>;
    sourceMatchingCellCount: number;
    sourceMismatchCellCount: number;
    expectedPostState: string;
    postStateCensus: Record<string, number>;
    postMatchingCellCount: number;
    postMismatchCellCount: number;
    rollbackExactInverse: boolean;
  };
  foundations: {
    matchingCellCount: number;
    mismatchCellCount: number;
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
    bentCount: number;
    stoneBrickCellCount: number;
    supportComponentCount: number;
    tubeAttachmentCellCount: number;
    stableFoundationContactCount: number;
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
    '2026-08-21T16:30:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07B B03 viaduct-bent post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the manifest, terminal ledger, saves, and completed release identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R07B_B03_VIADUCT_BENTS_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '07f062404e6baa1dbb3023b850f3c171840ec8e5df59a3c2bc79600bd0a69161',
      release: {
        transactionId: 'combined-zones-r07b-b03-viaduct-bents',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B03'],
        manifestIdentity:
          'fb5fab99755da2ab8967e7b4c448ced19b660ea2da3bbdd15d049338ae43891a',
        sourceBoundReleaseIdentitySha256:
          '186aab717c66cf9340f04b491ad31c0d83043d52a4e4647a7fed0e0464440fe2',
        completedReleaseIdentitySha256:
          'c02e6e3cd0b3215e742f52b852f819ee2b0603549f9c971d63fccf7b934a44f9',
      },
      bindings: {
        ledger: {
          sha256: '1d82f8223b0239d427d37b8539bb9fc79a96afbf71bda132fdef3bb4a558e613',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '96e91005fe88483518c9169ab279de5b990486bd151ed0ddc71e19abf64e9b2d',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '99ddd136557e661724a418acd9d47ae1f8e9ea0dc767d543fccd19389e2a3f4b',
          regionSnapshotSha256:
            '5d1a0e3edfbf4072aae1df3bedbc5f3bd41b2809462f4e38941d91ad5d7cae34',
        },
        postCompleteSave: {
          completeSaveSha256:
            '0daa9de0249777de943b9033786651970da93d894fafd97376a93ebfd6dfd71a',
          regionSnapshotSha256:
            '8abeba854bf61fff2431359729c01c51a1ef50d785879d79d232c7ea7769759d',
        },
        terminalEvidenceBindingCount: 17,
        terminalEvidenceBindingFailureCount: 0,
      },
    });
  });

  it('reproduces the exact source-derived support geometry and connectivity', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      selectedAnchorIndices: [
        196, 212, 228, 244, 260, 276, 292, 308, 324, 340, 356, 372, 388,
        404, 420, 436, 452, 460, 468, 500, 516, 532, 548, 564, 580, 596,
      ],
      excludedCandidates: [{
        anchorIndex: 484,
        exclusions: [{ state: 'minecraft:short_grass', role: 'foundation' }],
      }],
      beam: {
        cellCount: 364,
        coordinateSetSha256:
          '41a989772655b1c203f69d7f878be4077841a5507213659f603abdfa7a2206e9',
      },
      pairedLegs: {
        cellCount: 11394,
        coordinateSetSha256:
          '3334da0d780c16b2b73245cfca730d674359fd40c770769fc80c36980d26462a',
      },
      completeSupportSet: {
        cellCount: 11758,
        coordinateSetSha256:
          'd30393d3db6a00c91bf86ddbc9ec6f5ae0ffdc13dbf8538f7eaf5c9a7ae3f85a',
      },
      foundationContacts: {
        cellCount: 208,
        coordinateSetSha256:
          '852a562a96e477d7cb30cca6c36698c330bca96b3b9e9599fc554ed75a618f31',
      },
      connectivity: {
        componentCount: 26,
        largestComponentCellCount: 636,
        componentSetSha256:
          '1db0a01768d1103b1fa0f8706e28eb603ce0a136ce3fd6c081d5313413bd1082',
      },
      tubeAttachments: {
        cellCount: 261,
        coordinateSetSha256:
          '2b4eb6c16bac03bff20b3f3ce2f5cdf61cf8bfc16574984384f09e575f0f7d26',
        attachedComponentCount: 26,
        everyBentAttached: true,
      },
    });
    expect(report.geometry.candidateAnchorIndices).toHaveLength(27);
  });

  it('proves every exact source transition, post state, and foundation contact', () => {
    const report = readReport();
    expect(report.stateTransition).toMatchObject({
      sourceStateCensus: {
        'minecraft:air': 11646,
        'minecraft:snow[layers=1]': 112,
      },
      sourceMatchingCellCount: 11758,
      sourceMismatchCellCount: 0,
      expectedPostState: 'minecraft:stone_bricks',
      postStateCensus: { 'minecraft:stone_bricks': 11758 },
      postMatchingCellCount: 11758,
      postMismatchCellCount: 0,
      rollbackExactInverse: true,
    });
    expect(report.foundations).toMatchObject({
      matchingCellCount: 208,
      mismatchCellCount: 0,
    });
  });

  it('binds clean strict execution, rollback readiness, and read-only QA', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 476,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
      package: {
        passed: true,
        allTemporaryChunksReleased: true,
      },
      rollbackPoststatePreflight: {
        passed: true,
        passedGuards: 476,
        failedGuards: 0,
        regionSnapshotSha256:
          '8abeba854bf61fff2431359729c01c51a1ef50d785879d79d232c7ea7769759d',
      },
    });
    expect(report.checks).toHaveLength(12);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 12,
      passCount: 12,
      failCount: 0,
      bentCount: 26,
      stoneBrickCellCount: 11758,
      supportComponentCount: 26,
      tubeAttachmentCellCount: 261,
      stableFoundationContactCount: 208,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
