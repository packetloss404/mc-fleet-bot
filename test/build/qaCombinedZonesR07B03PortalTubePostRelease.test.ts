import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07_b03_portal_tube_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07a-live-20260821T154500Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07a-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07a-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07a-post-qa-'),
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
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
  };
  executionEvidence: {
    strictSuccessfulGroupCount: number;
    strictFailedGroupCount: number;
    strictNoopCount: number;
    packages: Array<{ passed: boolean }>;
    rollbackPoststatePreflights: Array<{
      passed: boolean;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
    }>;
  };
  geometry: {
    routeVoid: ExactSet;
    enclosure: ExactSet;
    stoneTieIns: ExactSet;
    constructionAndEnclosureDisjoint: boolean;
  };
  postState: {
    routeVoid: {
      expectedState: string;
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
      connectivity: {
        componentCount: number;
        largestComponentCellCount: number;
      };
    };
    enclosure: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
  };
  checks: Array<{ id: string; status: string }>;
  summary: {
    passed: boolean;
    checkCount: number;
    passCount: number;
    failCount: number;
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
    '2026-08-21T15:48:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07A B03 portal tube post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the terminal ledger, manifest, and complete post save', () => {
    const report = readReport();
    expect(report).toMatchObject({
      status: 'PASS_R07A_B03_PORTAL_TUBE_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '2c60b5db4aef7d3fc52f3b5d8b338d4a45dec0e22f5445b40b9f5582275de482',
      release: {
        transactionId: 'combined-zones-r07-b03-portal-tube',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B03'],
        manifestIdentity:
          'ee64005564179da374f4dd2847927363d7b875fcb5a2d4db6421fd1ba87391e8',
      },
      bindings: {
        ledger: {
          sha256: '496d511476361af1c981821e8b3e5329c66462e30b5604f5c3bc9da4e20bccb1',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'c6d78582e2f278bb54dcc0e835aa3790e04963f833b230233e8c7a03e903f136',
        },
        postCompleteSave: {
          completeSaveSha256:
            '398d1ca5cb3b2b1791cc4b1b3a33ada2a831f7165e899de27e1307f8210267b0',
          regionSnapshotSha256:
            'da788c954d9ee09ec180987c7d9a9ccd89603c6b1bfcd70ced4c608d0bb4e7b9',
        },
      },
    });
  });

  it('proves every route and enclosure cell has its exact intended post state', () => {
    const report = readReport();
    expect(report.geometry).toEqual({
      routeVoid: {
        cellCount: 8532,
        bounds: expect.any(Object),
        coordinateSetSha256:
          '16bc4e50ded34ee3947005783707de1801c6147067077ef16f10952b5262da92',
      },
      enclosure: {
        cellCount: 7682,
        bounds: expect.any(Object),
        coordinateSetSha256:
          'eb2c21a45b3299ca8a5afa183d3ec4be834b5629a411c434bc95bae39845a63f',
      },
      stoneTieIns: {
        cellCount: 10,
        bounds: expect.any(Object),
        coordinateSetSha256:
          'cb39f2cf911c140adee6f99d99ccb91320993e2e84da98c5828db47559bb1613',
      },
      constructionAndEnclosureDisjoint: true,
    });
    expect(report.postState.routeVoid).toMatchObject({
      expectedState: 'minecraft:air',
      stateCensus: { 'minecraft:air': 8532 },
      matchingCellCount: 8532,
      mismatchCellCount: 0,
      connectivity: {
        componentCount: 1,
        largestComponentCellCount: 8532,
      },
    });
    expect(report.postState.enclosure).toMatchObject({
      stateCensus: {
        'minecraft:polished_diorite': 7672,
        'minecraft:stone': 10,
      },
      matchingCellCount: 7682,
      mismatchCellCount: 0,
    });
  });

  it('binds clean strict execution and complete rollback readiness', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 7685,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
    });
    expect(report.executionEvidence.packages.every(({ passed }) => passed)).toBe(true);
    expect(report.executionEvidence.rollbackPoststatePreflights
      .every(({ passed, failedGuards, regionSnapshotSha256 }) => (
        passed
        && failedGuards === 0
        && regionSnapshotSha256
          === 'da788c954d9ee09ec180987c7d9a9ccd89603c6b1bfcd70ced4c608d0bb4e7b9'
      ))).toBe(true);
    expect(report.executionEvidence.rollbackPoststatePreflights
      .reduce((sum, { passedGuards }) => sum + passedGuards, 0)).toBe(7685);
    expect(report.checks).toHaveLength(10);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 10,
      passCount: 10,
      failCount: 0,
      routeAirCellCount: 8532,
      enclosurePolishedDioriteCellCount: 7672,
      enclosureStoneTieInCellCount: 10,
      routeComponentCount: 1,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
