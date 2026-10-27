import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r11a_c1_east_highway_pilot_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r11a-live-20260821T170600Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r11a-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r11a-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r11a-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r11a-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r11a-post-release-qa.md');

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
    sourceCompleteSave: { completeSaveSha256: string };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  geometry: {
    pavementSurface: { cellCount: number; coordinateSetSha256: string };
    foundationFill: { cellCount: number; coordinateSetSha256: string };
    headroom: { cellCount: number; coordinateSetSha256: string };
    operatedUnion: { cellCount: number; coordinateSetSha256: string };
    preservedHalo: { cellCount: number; coordinateSetSha256: string };
    surfaceConnectivity: {
      componentCount: number;
      largestComponentCellCount: number;
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
      stateCensus: Record<string, number>;
    };
    foundation: {
      exactFillCount: number;
      stableSupportCount: number;
      unstableSupportCount: number;
    };
    headroom: {
      airCellCount: number;
      mismatchCellCount: number;
      expectedCellCount: number;
    };
    preservedHalo: {
      unchangedCellCount: number;
      driftCellCount: number;
    };
  };
  executionEvidence: {
    strictForwardExecution: {
      status: string;
      successfulGroups: number;
      failedGroups: number;
      noopCommands: number;
      passed: boolean;
    };
    rollbackPoststatePreflight: {
      status: string;
      passedGuards: number;
      failedGuards: number;
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
    '2026-08-21T17:12:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R11A post-release QA seal', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the completed release and immutable source/post identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R11A_C1_EAST_HIGHWAY_PILOT_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        'f34fb2ba6f4b1fa3dd4aee90098995334245a5beccb0be6f7bec87cbf69a0dd3',
      release: {
        transactionId: 'combined-zones-r11a-c1-east-highway-pilot',
        releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
        manifestIdentity:
          '24489cfadb8eaedc4fc1e3d0b2b8f20656dc03b7e6d8755a6e55c74ab6c3d057',
        executionBindingSha256:
          'e14bd605efdded139dd6797e76abdf8f01f75641e0be3c690dec2cc73f74f943',
        completedReleaseIdentitySha256:
          '683bfb67927f9f71a03011e2d2e915a7169f8e947d5a6afef5a7ab101aa39b8f',
      },
      bindings: {
        ledger: {
          sha256: '2248f4db565000559ef7766363ebd73bd6465b24a6f42e4fc1248dba2246bb40',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'd6103791e8fc4afae575d90a743450d55b6e85cbe1d58cf3492132c254af7482',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            'ce761bacacc7848c4c057df3eee84a9e55ef89475b59440275ca8033c61e71f8',
        },
        postCompleteSave: {
          completeSaveSha256:
            'a52884ed9ea7c760a9d357e5c14571a3a980ed5ff68a905cafabf79fab56243e',
          regionSnapshotSha256:
            '26215fc70ce8891bfb1ba6008f6e9a02281557c6c2c02dd498af48e22897f08e',
        },
      },
    });
  });

  it('verifies exact targets, materials, connectivity, support, and headroom', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      pavementSurface: {
        cellCount: 109,
        coordinateSetSha256:
          '67c334af780bdaf20db92267c5697cd601dcf85d05b31d7bad1d589b46661f16',
      },
      foundationFill: {
        cellCount: 16,
        coordinateSetSha256:
          '234aafe7012f374ad7584efde23a50dbb415acda23cb538854ba8cbe2ff87809',
      },
      headroom: { cellCount: 218 },
      operatedUnion: {
        cellCount: 313,
        coordinateSetSha256:
          'db6564894b86f2c0a3c5a2889bd9ad9f75505d63cf78da3b738f367337bd1c1f',
      },
      surfaceConnectivity: {
        componentCount: 1,
        largestComponentCellCount: 109,
        maximumAdjacentStep: 1,
      },
    });
    expect(report.postState).toMatchObject({
      operatedTargets: {
        matchingCellCount: 313,
        mismatchCellCount: 0,
        stateCensus: {
          'minecraft:air': 188,
          'minecraft:gray_concrete': 73,
          'minecraft:smooth_stone': 26,
          'minecraft:stone_bricks': 16,
          'minecraft:yellow_concrete': 10,
        },
      },
      pavement: {
        matchingCellCount: 109,
        stateCensus: {
          'minecraft:gray_concrete': 73,
          'minecraft:smooth_stone': 26,
          'minecraft:yellow_concrete': 10,
        },
      },
      foundation: {
        exactFillCount: 16,
        stableSupportCount: 109,
        unstableSupportCount: 0,
      },
      headroom: {
        airCellCount: 218,
        mismatchCellCount: 0,
        expectedCellCount: 218,
      },
    });
  });

  it('proves zero undeclared halo drift and exact rollback readiness', () => {
    const report = readReport();
    expect(report.geometry.preservedHalo).toMatchObject({ cellCount: 1103 });
    expect(report.postState.preservedHalo).toMatchObject({
      unchangedCellCount: 1103,
      driftCellCount: 0,
    });
    expect(report.executionEvidence).toMatchObject({
      strictForwardExecution: {
        status: 'complete',
        successfulGroups: 313,
        failedGroups: 0,
        noopCommands: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        status: 'PASS',
        passedGuards: 313,
        failedGuards: 0,
        regionSnapshotSha256:
          '26215fc70ce8891bfb1ba6008f6e9a02281557c6c2c02dd498af48e22897f08e',
        passed: true,
      },
    });
  });

  it('accepts all checks while remaining strictly read-only', () => {
    expect(readReport()).toMatchObject({
      summary: {
        passed: true,
        checkCount: 12,
        passCount: 12,
        failCount: 0,
        exactTargetMatchCount: 313,
        pavementMatchCount: 109,
        foundationFillMatchCount: 16,
        stableSupportCount: 109,
        headroomAirCount: 218,
        preservedHaloUnchangedCount: 1103,
        strictExecutionPassCount: 313,
        rollbackGuardPassCount: 313,
      },
      safetyBoundary: {
        liveCallsPerformed: false,
        worldEditsPerformed: false,
        readOnlyAnvilInputs: true,
      },
    });
  });
});
