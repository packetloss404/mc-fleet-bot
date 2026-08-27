import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10b_b09_summit_internal_approach_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10b-live-20260821T230936Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10b-post-qa-'),
);
const OUTPUT = path.join(temporaryDirectory, 'qa.json');
const MARKDOWN = path.join(temporaryDirectory, 'qa.md');

interface QaReport {
  status: string;
  qaPayloadSha256: string;
  ledger: { sha256: string };
  manifest: { sha256: string };
  sourceSnapshot: Record<string, string>;
  postSnapshot: Record<string, string>;
  releaseIdentity: Record<string, string>;
  exactPostState: Record<string, number | string>;
  connectivity: Record<string, unknown> & {
    withoutSeam: { componentCount: number; componentSizes: number[] };
    withSeam: { componentCount: number; componentSizes: number[] };
  };
  preservation: Record<string, number | boolean | string>;
  execution: Record<string, number | boolean>;
  evidence: Record<string, number | string>;
  disposition: Record<string, boolean | string>;
  summary: { checkCount: number; passCount: number; failCount: number; passed: boolean };
}

let report: QaReport;
let firstJson: Buffer;
let firstMarkdown: Buffer;

beforeAll(() => {
  const args = [
    SCRIPT,
    '--ledger', LEDGER,
    '--generated-at', '2026-08-21T23:20:00Z',
    '--out', OUTPUT,
    '--markdown', MARKDOWN,
  ];
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
  firstJson = fs.readFileSync(OUTPUT);
  firstMarkdown = fs.readFileSync(MARKDOWN);
  report = JSON.parse(firstJson.toString('utf8')) as QaReport;
  execFileSync(process.execPath, args, { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('CZ-R10B B09 summit internal approach post-release QA', () => {
  it('regenerates both QA artifacts byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status: 'PASS_EXACT_INTERNAL_SEAM_CONNECTED_EXTERNAL_CAP_RETAINED_REVERSIBLE',
      qaPayloadSha256:
        '8340189fce3197684041859f91113c791f79992c8d0e681e1ceb84576d4f8e0c',
      ledger: {
        sha256: '9feb475e5372a1746f8b82c4029651f7e3c2464b544e9b29d3b0587a1c638709',
      },
      manifest: {
        sha256: '0afc5608b73ac59ac44425a16195cd2c603e8a068c67d1140f02faaa115777d5',
      },
      sourceSnapshot: {
        completeSaveSha256:
          'e951f1c7d29f1dadee5e2ed80ad8762657f24d2ca737efb7ea7f492e50948a76',
      },
      postSnapshot: {
        completeSaveSha256:
          'e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80',
        regionSha256:
          'a693c537107f172adeb54e170f20448c26c783484a9affc1c0426c12eabb9138',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474',
      },
    });
  });

  it('proves both exact transitions and the required 1116-cell connectivity', () => {
    expect(report.exactPostState).toEqual({
      targetCellCount: 2,
      targetCoordinateSetSha256:
        '8100289cadea36a33df57d789c17b6972124bdc65101ffa2dc439967c8ba8f75',
      exactTransitionPassCount: 2,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:air',
    });
    expect(report.connectivity).toMatchObject({
      acceptedGuidewayCellCount: 1096,
      acceptedSummitInteriorCellCount: 18,
      withoutSeam: { componentCount: 2, componentSizes: [1096, 18] },
      connectedVoidCellCount: 1116,
      connectedVoidCoordinateSetSha256:
        'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
      withSeam: { componentCount: 1, componentSizes: [1116] },
      postAirPassCount: 1116,
      postAirFailureCount: 0,
    });
  });

  it('preserves the collar, exterior cap, and every undeclared B09 cell', () => {
    expect(report.preservation).toMatchObject({
      retainedApproachCollarCellCount: 10,
      retainedApproachCollarCoordinateSetSha256:
        '0f53c2e23365f1cec787382867b16d9d67b5b10c93dceba1dc60266e1cbdb624',
      retainedExternalZ11CapCellCount: 12,
      retainedExternalZ11CapCoordinateSetSha256:
        'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
      b09AccommodationCellCount: 7800,
      declaredDifferenceCount: 2,
      undeclaredDifferenceCount: 0,
      preservedNonTargetB09CellCount: 7798,
      externalZ11InterfaceOpened: false,
      activeMechanismChanged: false,
    });
  });

  it('seals all 17 stages, strict execution, evidence, and exact rollback', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 2,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      rollbackPoststatePassCount: 2,
      rollbackPoststateFailCount: 0,
      exactReverseOrderInverse: true,
      allTemporaryChunksReleased: true,
    });
    expect(report.evidence).toMatchObject({
      requiredStageCount: 17,
      requiredStagePassCount: 17,
      evidenceBindingCount: 17,
      evidenceBindingFailureCount: 0,
      manifestQa: 'PASS',
      blockEntityClearance: 'PASS',
      liveEntityClearance: 'PASS',
      sameMomentEntityClearance: 'PASS',
    });
  });

  it('accepts only the static internal threshold and no commissioned system', () => {
    expect(report.disposition).toEqual({
      acceptedScope: 'static two-cell internal B09 summit threshold only',
      externalZ11CapRemainsFailClosed: true,
      railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
      funicularCommissioned: false,
      pedestrianRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      checkCount: 12,
      passCount: 12,
      failCount: 0,
      passed: true,
    });
    expect(fs.readFileSync(MARKDOWN, 'utf8')).toContain('All 17 wrapper stages pass');
  });
});
