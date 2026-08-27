import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10d_b09_lower_station_passive_lighting_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10d-post-qa-'),
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
  exactPostState: Record<string, number | string | number[]>;
  preservation: Record<string, unknown>;
  execution: Record<string, number | boolean | string>;
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
    '--generated-at', '2026-08-22T00:05:00Z',
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

describe('CZ-R10D B09 lower-station passive lighting post-release QA', () => {
  it('regenerates both QA artifacts byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status: 'PASS_EXACT_LOWER_STATION_FIXTURES_ROUTE_CAP_AND_SEAM_PRESERVED_REVERSIBLE',
      qaPayloadSha256:
        'e6e78f778774bb1bb6b0df6bf1bd594bc39fc50f9cddb1304e118f81f94eff03',
      ledger: {
        sha256: '4371d975528be948049d4ca31fec234e58029e92f33e72179a4d1b439863addb',
      },
      manifest: {
        sha256: '73ff36b566b00ec263e9f6080bca16b235fbde7dcc685b6eb21bc2c3c145c86e',
      },
      sourceSnapshot: {
        completeSaveSha256:
          '8f6370953a12bf66dcb2b2fb3bc92eb90b7fbf384d60491d053d532dcd77f204',
        regionSha256:
          '83ab2368daa4ac8a64723bfe355f86644e61e585c224fee774e0e6503a24003c',
      },
      postSnapshot: {
        completeSaveSha256:
          'f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb',
        regionSha256:
          '5ab0829c8d4a5e5b88f7b3b494b36ddc5461cc52cc902fa7223fa2b440ea1284',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          'f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7',
      },
    });
  });

  it('proves both exact fixtures and their bounded station cadence', () => {
    expect(report.exactPostState).toEqual({
      targetCellCount: 2,
      targetCoordinateSetSha256:
        '07a255938e33df38d4a3b8381e0aacc5b024a26f8fc38019452ec6f75cd93d73',
      exactTransitionPassCount: 2,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:sea_lantern',
      fixtureCenterlineIndices: [4, 7],
      maximumStationIndexDistanceToFixture: 1,
    });
  });

  it('preserves the route, shell, B08 cap, guideway seam/collar, and halo', () => {
    expect(report.preservation).toMatchObject({
      lowerStationInteriorCellCount: 12,
      sourceInteriorAirPassCount: 12,
      postInteriorAirPassCount: 12,
      lowerStationShellCellCount: 84,
      enclosureFaceBoundaryCellCount: 40,
      sourceShellStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 82,
      },
      postShellStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 80,
        'minecraft:sea_lantern': 2,
      },
      retainedB08WestCapCellCount: 12,
      retainedGuidewayInternalSeamCellCount: 2,
      retainedGuidewaySeamCollarCellCount: 10,
      haloCellCount: 14,
      haloDeclaredDifferenceCount: 2,
      haloUndeclaredDifferenceCount: 0,
      b08ExternalInterfaceOpened: false,
      guidewayInternalSeamChanged: false,
    });
  });

  it('finds exactly two declared B09 differences and no drift', () => {
    expect(report.preservation).toMatchObject({
      b09AccommodationCellCount: 7800,
      sourceB09StateSetSha256:
        '8516c1ffb69c6f9ca7eed5aa46e99491042501352289392129e1f8260ff44a79',
      declaredB09DifferenceCount: 2,
      undeclaredB09DifferenceCount: 0,
      preservedNonTargetB09CellCount: 7798,
    });
  });

  it('seals the wrapper, journal, evidence, and exact rollback', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 2,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      streamJournalEntryCount: 10,
      streamJournalSha256:
        '7d08bb5614999c67608135aca529e568136923af765d40be8b83c5c467d36a51',
      streamJournalFinalStatus: 'complete',
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

  it('accepts only passive visual fixtures and no commissioned system', () => {
    expect(report.disposition).toEqual({
      acceptedScope: 'two full-cube passive B09 lower-station ceiling fixtures only',
      routeClearanceAndEnclosurePreserved: true,
      b08ExternalCapRemainsFailClosed: true,
      guidewayInternalSeamPreserved: true,
      photometricOrEmergencyLightingCommissioned: false,
      railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
      funicularCommissioned: false,
      pedestrianRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      checkCount: 13,
      passCount: 13,
      failCount: 0,
      passed: true,
    });
    expect(fs.readFileSync(MARKDOWN, 'utf8')).toContain('All 17 wrapper stages');
  });
});
