import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10e_b09_lower_guideway_passive_wayfinding_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10e-post-qa-'),
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
    '--generated-at', '2026-08-22T00:25:00Z',
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

describe('CZ-R10E B09 lower-guideway passive wayfinding post-release QA', () => {
  it('regenerates both QA artifacts byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status: 'PASS_EXACT_LOWER_GUIDEWAY_WAYFINDING_ROUTE_BOUNDARY_AND_INTERFACES_PRESERVED',
      qaPayloadSha256:
        '4a5baf32340813da6979d4bb4741e42edb214f54229c57d1743c4a4e4c6cca2e',
      ledger: {
        sha256: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
      },
      manifest: {
        sha256: 'fea2757a99fe42787efe422edc77a3bf5685d246a4a106104cd698d15dcb4f1f',
      },
      sourceSnapshot: {
        completeSaveSha256:
          'd71c13b1cf9030dca2069190ffacf89b79fa6a7e0c7c202a42b880fb189e9886',
        regionSha256:
          '09f9a16344be34478129eec4db3c4c8e18de4c525b9d9deb86d0565c446b93e5',
      },
      postSnapshot: {
        completeSaveSha256:
          '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
        regionSha256:
          '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
      },
    });
  });

  it('proves all fifteen fixtures and the complete accepted cadence', () => {
    expect(report.exactPostState).toEqual({
      targetCellCount: 15,
      targetCoordinateSetSha256:
        '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
      exactTransitionPassCount: 15,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:sea_lantern',
      fixtureCenterlineIndices: [15, 31, 47, 63, 79, 95, 111, 127, 143, 159, 175, 191, 207, 223, 239],
      acceptedPredecessorFixtureIndices: [4, 7],
      maximumRouteIndexDistanceToAcceptedFixture: 8,
      maximumNewFixtureSpacingInIndices: 16,
    });
  });

  it('preserves the route, boundary, B08 cap, curve aperture/collar, and halo', () => {
    expect(report.preservation).toMatchObject({
      lowerRouteCellCount: 474,
      sourceRouteAirPassCount: 474,
      postRouteAirPassCount: 474,
      lowerBoundaryCellCount: 1426,
      sourceBoundaryStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 1422,
        'minecraft:sea_lantern': 2,
      },
      postBoundaryStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 1407,
        'minecraft:sea_lantern': 17,
      },
      boundaryDeclaredDifferenceCount: 15,
      boundaryUndeclaredDifferenceCount: 0,
      retainedB08WestCapCellCount: 12,
      retainedCurveApertureCellCount: 4,
      retainedCurveCollarCellCount: 8,
      haloCellCount: 105,
      haloDeclaredDifferenceCount: 15,
      haloUndeclaredDifferenceCount: 0,
    });
  });

  it('finds exactly fifteen declared B09 differences and no drift', () => {
    expect(report.preservation).toMatchObject({
      b09AccommodationCellCount: 7800,
      sourceB09StateSetSha256:
        '085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca',
      declaredB09DifferenceCount: 15,
      undeclaredB09DifferenceCount: 0,
      preservedNonTargetB09CellCount: 7785,
      b08ExternalInterfaceOpened: false,
      curveApertureChanged: false,
    });
  });

  it('seals the wrapper, journal, evidence, and exact rollback', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 15,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      streamJournalEntryCount: 36,
      streamJournalSha256:
        'fc70c5c6dd6ffc90ea50949a9dfcb8ff9b3fc37b0347a72ba74301889c80023c',
      streamJournalFinalStatus: 'complete',
      rollbackPoststatePassCount: 15,
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

  it('accepts passive visual wayfinding only and no commissioned system', () => {
    expect(report.disposition).toEqual({
      acceptedScope:
        'fifteen full-cube passive B09 lower-guideway ceiling wayfinding fixtures only',
      routeClearanceAndBoundaryPreserved: true,
      b08ExternalCapRemainsFailClosed: true,
      curveApertureAndCollarPreserved: true,
      photometricEmergencyOrLifeSafetyLightingCommissioned: false,
      railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
      funicularCommissioned: false,
      pedestrianRouteCommissioned: false,
      liveCallsPerformedByQa: false,
      worldMutationsPerformedByQa: false,
    });
    expect(report.summary).toEqual({
      checkCount: 14,
      passCount: 14,
      failCount: 0,
      passed: true,
    });
    expect(fs.readFileSync(MARKDOWN, 'utf8')).toContain('All 17 wrapper stages');
  });
});
