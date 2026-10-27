import { execFileSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r11c_c1_east_highway_completion_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11c-live-20260821T185813Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r11c-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r11c-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11c-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r11c-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r11c-post-release-qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string>;
  bindings: Record<string, unknown>;
  geometry: Record<string, unknown>;
  postState: Record<string, unknown>;
  executionEvidence: Record<string, unknown>;
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
    '2026-08-21T19:00:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11C post-release QA seal', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, execution, and immutable saves', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R11C_C1_EAST_HIGHWAY_COMPLETION_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        'cdf242299fcc372183f92a237b5062f0f7b0ca63ca8405635dd1aea768665680',
      release: {
        transactionId: 'combined-zones-r11c-c1-east-highway-completion',
        releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
        manifestIdentity:
          '0cc83635202a9aac17ed347e88f6a7882598b35321a3546b4494fafd0a2affc3',
        executionBindingSha256:
          '71dc29663a981180396ff19d14574217a57318f330e826b276f5b31a82cbd650',
        completedReleaseIdentitySha256:
          'f2c37e1c70a8829981352a0d64d1e69edb556a19359d1afd56061e9fe2169bb9',
      },
      bindings: {
        ledger: {
          sha256: 'ce3bb0d112061e9e111a75bb605ca955c60a944a0e32a794c89b6b5388ee55d5',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: '32f75bc8c089947934c6fe4f77e4f18e418de6f86ebca2ca87ffa0c044175b73',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '4f110e953af0d21052c535c3526e5456ab5d5d3b79a6df6579935248f3d025d3',
          regionSnapshotSha256:
            '1a4064c444da36336612431e1f17e6339d337f259df5a9c466223496708e5b4c',
        },
        postCompleteSave: {
          completeSaveSha256:
            'a4e7f8a9066ef0818436b4d3c92e594daa91fb4136cd8d7603988bed565ce219',
          regionSnapshotSha256:
            'f0a0548def916101e31eaa33e9138132a7c5d469e549e3216a6b3bd09ab8941d',
        },
        ledgerEvidence: {
          declaredBindingCount: 17,
          matchingBindingCount: 17,
          mismatchCount: 0,
        },
      },
    });
  });

  it('verifies all targets, foundation contacts, and full route headroom', () => {
    expect(readReport()).toMatchObject({
      geometry: {
        r11cSurface: {
          cellCount: 399,
          coordinateSetSha256:
            'd290098f6186f7ed133b1448e4738c37a0e62f42fb7e74755583b6271db87239',
        },
        foundationFill: { cellCount: 68 },
        r11cHeadroom: { cellCount: 798 },
        r11aHeadroom: { cellCount: 218 },
        r11bHeadroom: { cellCount: 328 },
        operatedUnion: {
          cellCount: 1_109,
          coordinateSetSha256:
            '2e671a5ae94babdc29c518bacdc167f9e71a23db32b539f98b023903c7bd2a74',
        },
      },
      postState: {
        exactTargets: {
          matchingCellCount: 1_109,
          mismatchCellCount: 0,
          stateCensus: {
            'minecraft:air': 642,
            'minecraft:gray_concrete': 267,
            'minecraft:smooth_stone': 84,
            'minecraft:stone_bricks': 68,
            'minecraft:yellow_concrete': 48,
          },
        },
        foundation: {
          exactFillCount: 68,
          stableContactCount: 399,
          unstableContactCount: 0,
        },
        headroom: {
          r11cAirCellCount: 798,
          r11aAirCellCount: 218,
          r11bAirCellCount: 328,
        },
      },
    });
  });

  it('proves the connected R11A/B/C route and every step-safe seam', () => {
    expect(readReport()).toMatchObject({
      geometry: {
        combinedRoute: { cellCount: 672 },
        combinedRouteConnectivity: {
          componentCount: 1,
          largestComponentCellCount: 672,
        },
        seams: {
          r11aR11b: { adjacentPairCount: 94, maximumAdjacentStep: 1 },
          r11aR11c: { adjacentPairCount: 93, maximumAdjacentStep: 1 },
          r11bR11c: { adjacentPairCount: 46, maximumAdjacentStep: 1 },
        },
      },
    });
  });

  it('preserves support, grade/utility exceptions, leaves, and the drift domain', () => {
    expect(readReport()).toMatchObject({
      geometry: {
        preservedR11ASupport: {
          cellCount: 23,
          coordinateSetSha256:
            'faab25d6ed2ee368d2296ed49e651979e19b7f6f3632d0f449997e6fecf5d921',
        },
        preservedGradeShadows: {
          cellCount: 13,
          coordinateSetSha256:
            'cec12d7786e2d8a0e165f463910fc11f9ce07fabbaf5d745ac1cc34b9c155766',
        },
        preservedUtilityConflicts: {
          cellCount: 3,
          coordinateSetSha256:
            '454d9ed2fbaf386c10b244a593027fc3b34b8a8fa7a7be3c262df00adfdaa058',
        },
        preservedExceptions: { cellCount: 63 },
        preservedReviewDomain: {
          cellCount: 3_690,
          coordinateSetSha256:
            'ce38be6cfa46e25d66f1be11bb7a7f702fa676365c9fe3373a15ef56a18e2233',
        },
      },
      postState: {
        retainedLeaves: {
          exactRetainedCellCount: 235,
          violationCount: 0,
          retainedLogDistanceCensus: { 1: 68, 2: 85, 3: 67, 4: 13, 5: 2 },
          coordinateSet: {
            cellCount: 235,
            coordinateSetSha256:
              'edf69cab488de9066ee819b228caa5e9c182b056626bed67b89610d67793e165',
          },
        },
        preservedReviewDomain: {
          unchangedCellCount: 3_690,
          driftCellCount: 0,
        },
      },
    });
  });

  it('accepts strict execution, rollback, all checks, and remains read-only', () => {
    const report = readReport();
    const { qaPayloadSha256, ...payload } = report;
    expect(crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex'))
      .toBe(qaPayloadSha256);
    expect(report).toMatchObject({
      executionEvidence: {
        stageOrder: { exact: true },
        strictForwardExecution: {
          successfulGroups: 1_109,
          failedGroups: 0,
          noopCommands: 0,
          passed: true,
        },
        rollbackPoststatePreflight: {
          passedGuards: 1_109,
          failedGuards: 0,
          regionSnapshotSha256:
            'f0a0548def916101e31eaa33e9138132a7c5d469e549e3216a6b3bd09ab8941d',
          passed: true,
        },
      },
      summary: {
        passed: true,
        checkCount: 16,
        passCount: 16,
        failCount: 0,
        exactTargetMatchCount: 1_109,
        combinedRouteCellCount: 672,
        combinedRouteComponentCount: 1,
        stableSupportCount: 399,
        r11cHeadroomAirCount: 798,
        retainedLeafExactCount: 235,
        preservedReviewDomainUnchangedCount: 3_690,
        strictExecutionPassCount: 1_109,
        rollbackGuardPassCount: 1_109,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        readOnlyAnvilInputs: true,
      },
    });
  });
});
