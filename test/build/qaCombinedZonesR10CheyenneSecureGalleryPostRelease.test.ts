import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10_cheyenne_secure_gallery_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r10a-live-20260821T163935Z',
);
const CANONICAL_JSON = path.join(EVIDENCE, 'r10a-post-release-qa.json');
const CANONICAL_MARKDOWN = path.join(EVIDENCE, 'r10a-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10a-post-qa-'),
);
const temporaryJson = path.join(temporaryDirectory, 'r10a-post-release-qa.json');
const temporaryMarkdown = path.join(temporaryDirectory, 'r10a-post-release-qa.md');

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
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    sourceCompleteSave: { completeSaveSha256: string };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  geometry: {
    exteriorLiner: ExactSet;
    preservedRoute: ExactSet;
    preservedTerminusCap: ExactSet;
    routeConnectivity: {
      componentCount: number;
      largestComponentCellCount: number;
      componentSetSha256: string;
    };
  };
  postState: {
    exteriorLiner: {
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
    };
    preservedRoute: {
      expectedState: string;
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
      connectivity: { componentCount: number; largestComponentCellCount: number };
    };
    preservedTerminusCap: {
      expectedState: string;
      matchingCellCount: number;
      mismatchCellCount: number;
      stateCensus: Record<string, number>;
    };
  };
  executionEvidence: {
    strictForwardExecution: {
      status: string;
      strictNoop: boolean;
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
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
    linerMatchCount: number;
    routeAirMatchCount: number;
    routeComponentCount: number;
    terminusStoneMatchCount: number;
    strictExecutionPassCount: number;
    rollbackGuardPassCount: number;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    worldEditsPerformed: boolean;
    readOnlyAnvilInputs: boolean;
  };
}

function readReport(filename = CANONICAL_JSON): QaReport {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at',
    '2026-08-21T16:42:00Z',
    '--out',
    temporaryJson,
    '--markdown',
    temporaryMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones CZ-R10A post-release QA seal', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(temporaryJson)).toEqual(fs.readFileSync(CANONICAL_JSON));
    expect(fs.readFileSync(temporaryMarkdown)).toEqual(fs.readFileSync(CANONICAL_MARKDOWN));
  });

  it('binds the completed ledger, release, and distinct source/post identities', () => {
    expect(readReport()).toMatchObject({
      status: 'PASS_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE_ACCEPTED',
      qaPayloadSha256: '88db997f951847d624608eba8a0a20800c9bb5631b4334ff23bf2f56323ee60a',
      release: {
        transactionId: 'combined-zones-r10-cheyenne-secure-gallery',
        releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
        manifestIdentity: '3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c',
        executionBindingSha256:
          'fffe0dd8d1a7cd15250976af47559752ecf00571392d3dfc18343bd499efb002',
      },
      bindings: {
        ledger: {
          sha256: '84ddf28bc2127850eaf77546715feac3a3644d40571bc6b170f817b821091058',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'd4ad3c70a5454c6cf95262aa006a4c27cd0b7955a32d732ff07005a0e95a00cb',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '7d0ee0324d533bfd52fd158f7942c23311627efccd1f616083a4699ad2133c26',
        },
        postCompleteSave: {
          completeSaveSha256:
            'bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486',
          regionSnapshotSha256:
            'bd4c325d66ff83ada72273c98fc7b881d9c861736df2f1a92c1aa8bd7ddb004c',
        },
      },
    });
  });

  it('verifies all liner states with the exact material census', () => {
    const report = readReport();
    expect(report.geometry.exteriorLiner).toEqual({
      cellCount: 594,
      bounds: {
        minX: 2048, maxX: 2080, minY: 165, maxY: 170, minZ: -871, maxZ: -865,
      },
      coordinateSetSha256:
        'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
    });
    expect(report.postState.exteriorLiner).toMatchObject({
      matchingCellCount: 594,
      mismatchCellCount: 0,
      stateCensus: {
        'minecraft:polished_granite': 398,
        'minecraft:smooth_stone': 155,
        'minecraft:polished_blackstone_bricks': 36,
        'minecraft:sea_lantern': 5,
      },
    });
  });

  it('proves the connected air route and fail-closed terminus stayed exact', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      preservedRoute: {
        cellCount: 660,
        coordinateSetSha256:
          'eaeb38e78705d7ef7643fa24bb73ad4fa8cf6db2cbf17aaf39db4707e1656e67',
      },
      preservedTerminusCap: {
        cellCount: 20,
        coordinateSetSha256:
          'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
      },
      routeConnectivity: {
        componentCount: 1,
        largestComponentCellCount: 660,
        componentSetSha256:
          '05a82a83abeefa4ef5123ec7abd40625da3179ac17fbe19dca9d9231f1605290',
      },
    });
    expect(report.postState.preservedRoute).toMatchObject({
      expectedState: 'minecraft:air',
      matchingCellCount: 660,
      mismatchCellCount: 0,
      stateCensus: { 'minecraft:air': 660 },
      connectivity: { componentCount: 1, largestComponentCellCount: 660 },
    });
    expect(report.postState.preservedTerminusCap).toMatchObject({
      expectedState: 'minecraft:stone',
      matchingCellCount: 20,
      mismatchCellCount: 0,
      stateCensus: { 'minecraft:stone': 20 },
    });
  });

  it('binds clean strict execution and post-state rollback readiness', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictForwardExecution: {
        status: 'complete',
        strictNoop: true,
        successfulGroups: 594,
        failedGroups: 0,
        noopCommands: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        status: 'PASS',
        passedGuards: 594,
        failedGuards: 0,
        regionSnapshotSha256:
          'bd4c325d66ff83ada72273c98fc7b881d9c861736df2f1a92c1aa8bd7ddb004c',
        passed: true,
      },
    });
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 9,
      passCount: 9,
      failCount: 0,
      linerMatchCount: 594,
      routeAirMatchCount: 660,
      routeComponentCount: 1,
      terminusStoneMatchCount: 20,
      strictExecutionPassCount: 594,
      rollbackGuardPassCount: 594,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
