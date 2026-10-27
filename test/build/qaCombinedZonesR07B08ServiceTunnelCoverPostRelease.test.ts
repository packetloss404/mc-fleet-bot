import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07_b08_service_tunnel_cover_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07c-retry-live-20260821T162026Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07c-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07c-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07c-post-qa-'),
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
    completedReleaseIdentitySha256: string;
  };
  bindings: {
    ledger: { sha256: string; status: string };
    manifest: { sha256: string; manifestIdentity: string };
    sourceCompleteSave: { completeSaveSha256: string };
    postCompleteSave: {
      completeSaveSha256: string;
      regionSnapshotSha256: string;
    };
    priorAttempt: {
      ledger: { sha256: string; status: string };
      reconciled: boolean;
    };
  };
  executionEvidence: {
    strictSuccessfulGroupCount: number;
    strictFailedGroupCount: number;
    strictNoopCount: number;
    reverseRollbackOrderBound: boolean;
    packages: Array<{ passed: boolean }>;
    rollbackPoststatePreflights: Array<{
      passed: boolean;
      passedGuards: number;
      failedGuards: number;
      regionSnapshotSha256: string;
    }>;
  };
  geometry: {
    construction: ExactSet;
    externalBoundary: ExactSet;
    shellDesign: ExactSet;
    westEntrance: ExactSet;
    b03Connection: ExactSet;
    projectedRouteAndEntranceVoid: ExactSet;
    operatedUnion: ExactSet;
    coverAndAperturesPartitionBoundary: boolean;
  };
  postState: {
    operatedTargets: { matchingCellCount: number; mismatchCellCount: number };
    cover: {
      stateCensus: Record<string, number>;
      preservedSourceStateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
    };
    routeAndEntrances: {
      stateCensus: Record<string, number>;
      matchingCellCount: number;
      mismatchCellCount: number;
      westEntranceAirCellCount: number;
      b03ConnectionAirCellCount: number;
      connectivity: { componentCount: number; largestComponentCellCount: number };
    };
  };
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
    '--generated-at',
    '2026-08-21T16:25:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R07C B08 service-tunnel cover post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds the accepted retry, its exact complete saves, and final identity', () => {
    const report = readReport();
    expect(report).toMatchObject({
      status: 'PASS_R07C_B08_SERVICE_TUNNEL_COVER_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        'ac45ce0082fb5f9a9aba7f9f091f705bae039c52e6e555fda9f2237b8db29bef',
      release: {
        transactionId:
          'combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z',
        releaseNodeId: 'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
        scopeIds: ['P1-B08'],
        manifestIdentity:
          '779bf317b625e085c33673381e6bcbb0bc8b1d6290850c8bb5a6cb763b4d3240',
        completedReleaseIdentitySha256:
          '4e99735b102bf4aba9485caa34de0c0731e4a7b5af82b2c9dadcddd9e360cb91',
      },
      bindings: {
        ledger: {
          sha256: '5b319623d2dacdcc6c14ad7fb6c8d7c1997224b35f3688cedec433c1da21a42b',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'a25c2ca849d4782003e6d6d03a6039382074da51f6790412aebba650fdda02fe',
        },
        sourceCompleteSave: {
          completeSaveSha256:
            '350056e1f4f68124e252c2266771ea416d7257bd17e1b20cda094178705b6d66',
        },
        postCompleteSave: {
          completeSaveSha256:
            '605b8a3f898ac40822036ccb4fe97e7adfaba7b146d13eb3431fb1821b5f6cfa',
          regionSnapshotSha256:
            '81e0a969430134d1d62ec9befd2e74cd38bf517d472c20d22ec72d1cc1233050',
        },
      },
    });
  });

  it('proves all exact operated, cover, opening, and route-clearance states', () => {
    const report = readReport();
    expect(report.geometry).toMatchObject({
      construction: {
        cellCount: 7878,
        coordinateSetSha256:
          '967a9ddd39775cfc4cbc851fd51abc4726a1e20ab632b433b45d386393254882',
      },
      externalBoundary: {
        cellCount: 5327,
        coordinateSetSha256:
          '83c7bae09d31a562de9cf0d1c31d35ad68b04438545270ee592e462e6c657994',
      },
      shellDesign: {
        cellCount: 5283,
        coordinateSetSha256:
          'e61aca484f2ff44d2ace64d1b9948236c7c59586743ef79d159dc0a776e7ce79',
      },
      westEntrance: {
        cellCount: 24,
        coordinateSetSha256:
          'b7a6d1173b904243df812c16c7465c081211e30a2f4599d2f858bf0ddffda49f',
      },
      b03Connection: {
        cellCount: 20,
        coordinateSetSha256:
          '95b1b86fa537ebc6aae1bdefae200a218971ba5643cf2f8e1a19f347b8fa0e85',
      },
      projectedRouteAndEntranceVoid: {
        cellCount: 7902,
        coordinateSetSha256:
          '0f09904a321286b61e1ea88dbf011a469c18b183190109a2c096c770db21d62a',
      },
      operatedUnion: {
        cellCount: 5280,
        coordinateSetSha256:
          '4c1cd124726032c338de14bcce68d83a4f8f17c6de6e794318439df61d9a9944',
      },
      coverAndAperturesPartitionBoundary: true,
    });
    expect(report.postState.operatedTargets).toEqual({
      matchingCellCount: 5280,
      mismatchCellCount: 0,
      listedMismatches: [],
    });
    expect(report.postState.cover).toMatchObject({
      stateCensus: {
        'minecraft:polished_diorite': 5252,
        'minecraft:grass_block[snowy=true]': 14,
        'minecraft:dirt': 12,
        'minecraft:stone': 5,
      },
      preservedSourceStateCensus: {
        'minecraft:grass_block[snowy=true]': 14,
        'minecraft:dirt': 12,
        'minecraft:stone': 5,
      },
      matchingCellCount: 5283,
      mismatchCellCount: 0,
    });
    expect(report.postState.routeAndEntrances).toMatchObject({
      stateCensus: { 'minecraft:air': 7902 },
      matchingCellCount: 7902,
      mismatchCellCount: 0,
      westEntranceAirCellCount: 24,
      b03ConnectionAirCellCount: 20,
      connectivity: { componentCount: 1, largestComponentCellCount: 7902 },
    });
  });

  it('binds strict execution and the complete reverse-order rollback plan', () => {
    const report = readReport();
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 5280,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
      reverseRollbackOrderBound: true,
    });
    expect(report.executionEvidence.packages.every(({ passed }) => passed)).toBe(true);
    expect(report.executionEvidence.rollbackPoststatePreflights
      .every(({ passed, failedGuards, regionSnapshotSha256 }) => (
        passed
        && failedGuards === 0
        && regionSnapshotSha256
          === '81e0a969430134d1d62ec9befd2e74cd38bf517d472c20d22ec72d1cc1233050'
      ))).toBe(true);
    expect(report.executionEvidence.rollbackPoststatePreflights
      .reduce((sum, { passedGuards }) => sum + passedGuards, 0)).toBe(5280);
  });

  it('reconciles the stopped first attempt and seals every acceptance check', () => {
    const report = readReport();
    expect(report.bindings.priorAttempt).toEqual(expect.objectContaining({
      ledger: {
        sha256: 'c815b59ccb26f688fddab60b82effbeba531a1aaa1ed6b29784a90b3ba63da96',
        status: 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW',
        path: expect.any(String),
        bytes: expect.any(Number),
      },
      reconciled: true,
    }));
    expect(report.checks).toHaveLength(11);
    expect(report.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(report.summary).toEqual({
      passed: true,
      checkCount: 11,
      passCount: 11,
      failCount: 0,
      operatedMatchingCellCount: 5280,
      coverPolishedDioriteCellCount: 5252,
      coverSourcePreservedCellCount: 31,
      routeAirCellCount: 7902,
      westEntranceAirCellCount: 24,
      b03ConnectionAirCellCount: 20,
      routeComponentCount: 1,
      rollbackGuardPassCount: 5280,
    });
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
