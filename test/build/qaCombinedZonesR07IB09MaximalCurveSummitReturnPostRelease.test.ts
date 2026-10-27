import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r07i_b09_maximal_curve_summit_return_post_release.mjs',
);
const EVIDENCE = path.join(
  ROOT,
  'data/world-review/combined-zones-r07i-live-20260821T190347Z',
);
const COMMITTED_JSON = path.join(EVIDENCE, 'r07i-post-release-qa.json');
const COMMITTED_MARKDOWN = path.join(EVIDENCE, 'r07i-post-release-qa.md');
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r07i-post-qa-'),
);
const regeneratedJson = path.join(temporaryDirectory, 'report.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'report.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  release: Record<string, string | string[]>;
  bindings: Record<string, unknown>;
  geometry: Record<string, Record<string, unknown>>;
  postState: Record<string, Record<string, unknown>>;
  executionEvidence: Record<string, unknown>;
  checks: Array<{ id: string; status: string }>;
  summary: Record<string, number | boolean>;
  safetyBoundary: Record<string, boolean>;
}

function report(): QaReport {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as QaReport;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-21T19:08:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

describe('CZ-R07I B09 maximal route post-release QA', () => {
  it('regenerates both sealed reports byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds terminal identities and immutable source/post saves', () => {
    expect(report()).toMatchObject({
      status: 'PASS_R07I_B09_MAXIMAL_CURVE_SUMMIT_RETURN_POST_RELEASE_ACCEPTED',
      qaPayloadSha256:
        '2f7b3da436ce5790f53a076befeb4b24aead7881b0f064c75e4242f00ef85d48',
      release: {
        transactionId: 'combined-zones-r07i-b09-maximal-curve-summit-return',
        manifestIdentity:
          'a4cb61ca44395ab97af49fb5075cb428e357a2b5f2724fd74960030b30c3a3f8',
        sourceBoundReleaseIdentitySha256:
          '01b0fdbf18f77693e706491ecd25b4ddf99422059fc158584a5ed5816fd962ee',
        completedReleaseIdentitySha256:
          'fc488920b7eed11c0d3a86a4296ca51ed0308abffd6deee1eddfeeee5f8cc252',
      },
      bindings: {
        ledger: {
          sha256: '0d5b4d7bf233f9d383d4ea6cd507ee6932bf86dba78eb84fac836478582d4cb6',
          status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
        },
        manifest: {
          sha256: 'd89fb62731a8d4d3a238d029a43d0be246e1170b3ff222b5e61cc380d5745098',
        },
        evidenceBindingCount: 17,
        evidenceBindingFailures: [],
        sourceCompleteSave: {
          completeSaveSha256:
            '816df60a41641b1fd59e2aa8cf3a85c647fe8e99bcd7335949ebfa627aa684fc',
          regionSnapshotSha256:
            'b09e044f581fbb53c0949d6786ac1654803049442d1ea89003770651eccbabaa',
        },
        postCompleteSave: {
          completeSaveSha256:
            '569e8ab80a5ea4ea2ef35ef994de75b4fbc6d18f721c47453c9dc70ebedff0a0',
          regionSnapshotSha256:
            '3bc894ee8455600f1559351ed67dd76c9779efbe8561d262d306b40d39043572',
        },
      },
    });
  });

  it('proves exact geometry, the four-cell aperture, and two-cell negative control', () => {
    expect(report().geometry).toMatchObject({
      staticSegmentShell: { cellCount: 4092 },
      ownedR07hFourCellTurnAperture: {
        cellCount: 4,
        coordinateSetSha256:
          '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
      },
      operatedUnion: { cellCount: 4096 },
      connectedLowerStationAndGuidewayVoid: {
        cellCount: 1096,
        componentCount: 1,
        largestComponentCellCount: 1096,
      },
      nominalTwoCellNegativeControl: {
        cellCount: 1094,
        componentCount: 2,
        componentSizes: [618, 476],
      },
      connectedVoidFaceBoundary: { cellCount: 3286 },
      retainedR07eApproachCap: { cellCount: 12 },
    });
  });

  it('proves every transition, connected air cell, boundary cell, and retained cap', () => {
    expect(report().postState).toMatchObject({
      shell: {
        sourceStateCensus: { 'minecraft:air': 4092 },
        postStateCensus: { 'minecraft:polished_diorite': 4092 },
        matchingTransitionCount: 4092,
        mismatchCount: 0,
      },
      turnAperture: {
        sourceStateCensus: { 'minecraft:polished_diorite': 4 },
        postStateCensus: { 'minecraft:air': 4 },
        matchingTransitionCount: 4,
        mismatchCount: 0,
      },
      connectedRoute: { airCellCount: 1096, mismatchCount: 0 },
      completeBoundary: { polishedDioriteCellCount: 3286, mismatchCount: 0 },
      retainedR07eApproachCap: {
        unchangedCellCount: 12,
        changedCellCount: 0,
        physicallyClosed: true,
      },
    });
  });

  it('proves all prior cells outside the aperture and all B09 drift', () => {
    expect(report().postState).toMatchObject({
      priorReleasePreservation: {
        r07d: { cellCount: 84, unchangedCellCount: 84, changedCellCount: 0 },
        r07e: { cellCount: 162, unchangedCellCount: 162, changedCellCount: 0 },
        r07f: { cellCount: 164, unchangedCellCount: 164, changedCellCount: 0 },
        r07h: {
          cellCount: 2150,
          excludedOwnedApertureCellCount: 4,
          unchangedCellCount: 2150,
          changedCellCount: 0,
        },
      },
      preservedExternalInterfaces: {
        b08PortalSeam: { unchangedCellCount: 36, changedCellCount: 0 },
        summitInterfaceCap: { unchangedCellCount: 12, changedCellCount: 0 },
      },
      fullB09Accommodation: {
        sourceStateCensus: {
          'minecraft:air': 5241,
          'minecraft:polished_diorite': 2559,
        },
        postStateCensus: {
          'minecraft:polished_diorite': 6647,
          'minecraft:air': 1153,
        },
        sourceStateSetSha256:
          'b5f545101ceb768cc765daa9e668c2f6ffefa623864faba70db656cafb758b20',
        postStateSetSha256:
          'c9ab509e6e14bd267d4c509808be87677a7e36033e9bda53f69611d02aa46635',
        changedCellCount: 4096,
        nonOperatedChangedCellCount: 0,
      },
    });
  });

  it('binds strict execution, rollback, all checks, and read-only scope', () => {
    const qa = report();
    expect(qa.executionEvidence).toMatchObject({
      strictForwardExecution: {
        sha256: '7d7c805819610436273dd00f2f5881a37929c0795c46220ed11631b7595f7f32',
        operationSha256:
          '653c4173be744e2efc3fa2ea632e07b8af1ee8abf92dda4b3f9cfd648ac80c8c',
        successfulGroups: 4096,
        failedGroups: 0,
        noopCommands: 0,
        passed: true,
      },
      rollbackPoststatePreflight: {
        sha256: 'e7951e7989bbc5ce7333e53e2fb9eb0bde7732e1b1c12d925afdc41d1d788aeb',
        opsSha256:
          '72ea351a4d6b57b4b22989e080fbbbc1aa5be9b1299483a083ead21bae63ed1b',
        passedGuards: 4096,
        failedGuards: 0,
        passed: true,
      },
      exactReverseOrderInverse: true,
      rollbackResealsFourCellApertureBeforeShellRemoval: true,
    });
    expect(qa.checks).toHaveLength(15);
    expect(qa.checks.every(({ status }) => status === 'PASS')).toBe(true);
    expect(qa.summary).toMatchObject({
      passed: true,
      checkCount: 15,
      passCount: 15,
      failCount: 0,
      shellTransitionCount: 4092,
      apertureTransitionCount: 4,
      connectedRouteAirCellCount: 1096,
      boundaryPolishedDioriteCellCount: 3286,
      r07eCapUnchangedCellCount: 12,
      r07hNonAperturePreservedCellCount: 2150,
      fullB09ChangedCellCount: 4096,
      undeclaredB09ChangeCount: 0,
      strictSuccessfulGroupCount: 4096,
      rollbackGuardPassCount: 4096,
    });
    expect(qa.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
  });
});
