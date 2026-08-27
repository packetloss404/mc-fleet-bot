import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r11b_c1_west_highway_extension_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11b-live-20260821T173605Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r11b-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r11b-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11b-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r11b-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r11b-post-release-qa.md');

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
    manifestIdentity: string;
    executionBindingSha256: string;
    completedReleaseIdentitySha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string };
    sourceCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    ledgerEvidence: {
      declaredBindingCount: number;
      matchingBindingCount: number;
      mismatchCount: number;
    };
  };
  geometry: {
    candidateSurface: ExactSet;
    inheritedR11AFunctional: ExactSet;
    r11bPavementSurface: ExactSet;
    acceptedR11ASurface: ExactSet;
    combinedSurface: ExactSet;
    foundationFill: ExactSet;
    gravityStabilization: ExactSet;
    r11bHeadroom: ExactSet;
    acceptedR11AHeadroom: ExactSet;
    operatedUnion: ExactSet;
    interactionHalo: ExactSet;
    preservedHalo: ExactSet;
    combinedConnectivity: {
      componentCount: number;
      largestComponentCellCount: number;
      maximumAdjacentStep: number;
    };
    seam: {
      adjacentPairCount: number;
      connectivity: {
        componentCount: number;
        largestComponentCellCount: number;
        maximumAdjacentStep: number;
      };
      maximumAdjacentStep: number;
    };
  };
  postState: {
    operatedTargets: {
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
    };
    pavement: {
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
    };
    foundation: {
      exactFillCount: number;
      stabilizationCount: number;
      stableSupportCount: number;
      unstableSupportCount: number;
    };
    headroom: {
      r11bAirCellCount: number;
      r11bMismatchCount: number;
      acceptedR11AAirCellCount: number;
      acceptedR11AMismatchCount: number;
    };
    acceptedR11A: {
      surfaceTargetMatchCount: number;
      surfaceMismatchCount: number;
      headroomAirCount: number;
    };
    gravityClosure: {
      sourceGravityCellCount: number;
      stabilizedCellCount: number;
      residualStableUntouchedCellCount: number;
      residualViolationCount: number;
      postGravityCellCount: number;
      maximumInterveningGravityDepth: number;
    };
    preservedHalo: {
      unchangedCellCount: number;
      driftCellCount: number;
    };
  };
  executionEvidence: {
    stageOrder: { exact: boolean };
    strictForwardExecution: {
      packageOrder: string[];
      successfulGroupCount: number;
      passed: boolean;
    };
    rollbackPoststatePreflight: {
      packageOrder: string[];
      passedGuardCount: number;
      regionSnapshotSha256: string;
      passed: boolean;
    };
  };
  summary: Record<string, number | boolean>;
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

const readReport = (filename = CANONICAL_JSON): QaReport => (
  JSON.parse(fs.readFileSync(filename, 'utf8')) as QaReport
);

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-21T17:40:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11B post-release QA seal', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds every terminal release and immutable snapshot identity', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R11B_C1_WEST_HIGHWAY_EXTENSION_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '700c79ce8378c13257c292d154dd06d9e6e0e361600988a6997c248e2dc0b22c',
      release: {
        transactionId: 'combined-zones-r11b-c1-west-highway-extension',
        releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
        manifestIdentity:
          '92c8cd51eb303e40780a3d8714304815fd54fba693e3728f19cd16eb907f9f99',
        executionBindingSha256:
          '5d16146592fea7c6330b71c2179d6aed7ef72cc8b19007256b1a859f6203ebea',
        completedReleaseIdentitySha256:
          '0529a5ffb29f00cdf1060bf2e9f51e402d0191953ac7b22a381f85b34dc0c8bc',
      },
      bindings: {
        ledger: {
          sha256: '756534ed19b98a3b68a5b8f9cda4f099e616c23de6030908bb02e79a3ff3d849',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'fda638b43c22cc52823e7fae46cc34c3e5246a67c48bd9178c0df7a9a175546d',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '120b79fc9b40faa026d73115fa68c4ce3c9d3dcfdc19565a5cf4cd18dc6daa9d',
          regionSnapshotSha256:
            'b1051bda3dc1eb77ea468a1963db97f6163bbd2c8f85e72d328bc43bc48f2b1a',
        },
        postCompleteSave: {
          completeSaveSha256:
            '857271dc24e4558a28e647c83f006744785d73fb45614b1c3c6c72c43b6f9757',
          regionSnapshotSha256:
            '7b3db9b0148f65fdc5f4c487f4df5d6c9471b28ce84849b8f1d4378928da72fa',
        },
        ledgerEvidence: {
          declaredBindingCount: 25,
          matchingBindingCount: 25,
          mismatchCount: 0,
        },
      },
    });
  });

  it('verifies exact ordered targets, materials, support, and headroom', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      candidateSurface: { cellCount: 184 },
      inheritedR11AFunctional: { cellCount: 20 },
      r11bPavementSurface: {
        cellCount: 164,
        coordinateSetSha256:
          'e48819e8b7e60794cf8707c4073749ab4d79a588a20f4f1ebcd811d507bd9bc1',
      },
      foundationFill: { cellCount: 31 },
      gravityStabilization: { cellCount: 3 },
      r11bHeadroom: { cellCount: 328 },
      acceptedR11AHeadroom: { cellCount: 218 },
      operatedUnion: {
        cellCount: 488,
        coordinateSetSha256:
          '36473b2e69b1e4ca5100060ae2b3493ae5981efc8d0b85122d48ce6a026c73ee',
      },
    });
    expect(report.postState).toMatchObject({
      operatedTargets: {
        matchingCellCount: 488,
        mismatchCellCount: 0,
        stateCensus: {
          'minecraft:air': 290,
          'minecraft:gray_concrete': 104,
          'minecraft:smooth_stone': 43,
          'minecraft:stone_bricks': 34,
          'minecraft:yellow_concrete': 17,
        },
      },
      pavement: {
        matchingCellCount: 164,
        mismatchCellCount: 0,
      },
      foundation: {
        exactFillCount: 31,
        stabilizationCount: 3,
        stableSupportCount: 164,
        unstableSupportCount: 0,
      },
      headroom: {
        r11bAirCellCount: 328,
        r11bMismatchCount: 0,
        acceptedR11AAirCellCount: 218,
        acceptedR11AMismatchCount: 0,
      },
    });
  });

  it('proves one connected route/seam and preserves R11A functionality', () => {
    expect(readReport()).toMatchObject({
      geometry: {
        combinedSurface: { cellCount: 273 },
        combinedConnectivity: {
          componentCount: 1,
          largestComponentCellCount: 273,
          maximumAdjacentStep: 1,
        },
        seam: {
          adjacentPairCount: 94,
          connectivity: {
            componentCount: 1,
            largestComponentCellCount: 92,
            maximumAdjacentStep: 1,
          },
          maximumAdjacentStep: 1,
        },
      },
      postState: {
        acceptedR11A: {
          surfaceTargetMatchCount: 109,
          surfaceMismatchCount: 0,
          headroomAirCount: 218,
        },
      },
    });
  });

  it('proves gravity closure, zero undeclared drift, and reverse rollback', () => {
    expect(readReport()).toMatchObject({
      geometry: {
        interactionHalo: { cellCount: 2022 },
        preservedHalo: {
          cellCount: 1534,
          coordinateSetSha256:
            '74667ce3a87fa527f697a90fcca5a7b7c4692d0338fc939b7c2f1760ac3de4e3',
        },
      },
      postState: {
        gravityClosure: {
          sourceGravityCellCount: 25,
          stabilizedCellCount: 3,
          residualStableUntouchedCellCount: 22,
          residualViolationCount: 0,
          postGravityCellCount: 22,
          maximumInterveningGravityDepth: 5,
        },
        preservedHalo: {
          unchangedCellCount: 1534,
          driftCellCount: 0,
        },
      },
      executionEvidence: {
        stageOrder: { exact: true },
        strictForwardExecution: {
          packageOrder: [
            'c1-west-gravity-stabilization',
            'c1-west-highway-extension',
          ],
          successfulGroupCount: 488,
          passed: true,
        },
        rollbackPoststatePreflight: {
          packageOrder: [
            'c1-west-highway-extension',
            'c1-west-gravity-stabilization',
          ],
          passedGuardCount: 488,
          regionSnapshotSha256:
            '7b3db9b0148f65fdc5f4c487f4df5d6c9471b28ce84849b8f1d4378928da72fa',
          passed: true,
        },
      },
    });
  });

  it('accepts all checks, binds its payload, and remains read-only', () => {
    const report = readReport();
    const { qaPayloadSha256, ...payload } = report;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(qaPayloadSha256);
    expect(report).toMatchObject({
      summary: {
        passed: true,
        checkCount: 16,
        passCount: 16,
        failCount: 0,
        exactTargetMatchCount: 488,
        stabilizationMatchCount: 3,
        extensionMatchCount: 485,
        pavementMatchCount: 164,
        foundationFillMatchCount: 31,
        stableSupportCount: 164,
        r11bHeadroomAirCount: 328,
        r11aHeadroomAirCount: 218,
        preservedHaloUnchangedCount: 1534,
        residualStableUntouchedGravityCount: 22,
        strictExecutionPassCount: 488,
        rollbackGuardPassCount: 488,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        readOnlyAnvilInputs: true,
      },
    });
  });
});
