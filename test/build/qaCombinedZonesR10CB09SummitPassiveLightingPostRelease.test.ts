import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/qa_combined_zones_r10c_b09_summit_passive_lighting_post_release.mjs',
);
const LEDGER =
  'data/world-review/combined-zones-r10c-live-20260821T233530Z/evidence-ledger.json';
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r10c-post-qa-'),
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
    '--generated-at', '2026-08-21T23:45:00Z',
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

describe('CZ-R10C B09 summit passive lighting post-release QA', () => {
  it('regenerates both QA artifacts byte-for-byte', () => {
    expect(fs.readFileSync(OUTPUT)).toEqual(firstJson);
    expect(fs.readFileSync(MARKDOWN)).toEqual(firstMarkdown);
  });

  it('binds the completed ledger, frozen manifest, and immutable snapshots', () => {
    expect(report).toMatchObject({
      status: 'PASS_EXACT_PASSIVE_FIXTURES_ENCLOSURE_AND_CAPS_PRESERVED_REVERSIBLE',
      qaPayloadSha256:
        '0c3e390a7b1b4a2e9907c50f2a527b6fc2e74eceeaf007d9bfe4a595fe6704cd',
      ledger: {
        sha256: 'd1e27f56639c5df52c4dfd6e7c063baeaf8b76b363efa615216b6d57b5160da6',
      },
      manifest: {
        sha256: 'f0141a2f4d4c94f51aa8ec992b60cdfb82797efdd1c917741618c79971901698',
      },
      sourceSnapshot: {
        completeSaveSha256:
          'e317222a820f53b2f04fdd63028228a616f6dfa1b44691de5873d3eddd758bfb',
      },
      postSnapshot: {
        completeSaveSha256:
          'e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7',
        regionSha256:
          '3a9089869493c48a0f9dea501044b88c6bc5c271c82a03d3517e4bbd5bc46986',
      },
      releaseIdentity: {
        completedReleaseIdentitySha256:
          'e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14',
      },
    });
  });

  it('proves all three exact fixtures and their bounded cadence', () => {
    expect(report.exactPostState).toEqual({
      targetCellCount: 3,
      targetCoordinateSetSha256:
        'b06b4450bff0ddef846731cdad037966d32b4ff9819763cf93015a805e10bfe6',
      exactTransitionPassCount: 3,
      exactTransitionFailureCount: 0,
      desiredState: 'minecraft:sea_lantern',
      fixtureCenterlineIndices: [552, 556, 560],
      maximumStationIndexDistanceToFixture: 2,
    });
  });

  it('preserves the route void, enclosure, owned seam, collar, cap, and halo', () => {
    expect(report.preservation).toMatchObject({
      summitInteriorCellCount: 18,
      sourceInteriorAirPassCount: 18,
      postInteriorAirPassCount: 18,
      summitShellCellCount: 162,
      enclosureFaceBoundaryCellCount: 58,
      retainedOwnedInternalSeamCellCount: 2,
      sourceShellStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 160,
      },
      postShellStateCensus: {
        'minecraft:air': 2,
        'minecraft:polished_diorite': 157,
        'minecraft:sea_lantern': 3,
      },
      retainedApproachCollarCellCount: 10,
      retainedApproachCollarCoordinateSetSha256:
        '0f53c2e23365f1cec787382867b16d9d67b5b10c93dceba1dc60266e1cbdb624',
      retainedExternalZ11CapCellCount: 12,
      retainedExternalZ11CapCoordinateSetSha256:
        'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
      haloCellCount: 21,
      haloDeclaredDifferenceCount: 3,
      haloUndeclaredDifferenceCount: 0,
      externalZ11InterfaceOpened: false,
    });
  });

  it('finds exactly three declared B09 differences and no drift', () => {
    expect(report.preservation).toMatchObject({
      b09AccommodationCellCount: 7800,
      sourceB09StateSetSha256:
        '23f8adaf3b2035ef88d1445168783f1a60f615597483e061768f4ce2c024c873',
      declaredB09DifferenceCount: 3,
      undeclaredB09DifferenceCount: 0,
      preservedNonTargetB09CellCount: 7797,
    });
  });

  it('seals the wrapper, journal, evidence, and exact rollback', () => {
    expect(report.execution).toEqual({
      strictForwardGroupPassCount: 3,
      failedGroupCount: 0,
      noOpCount: 0,
      unknownReplyCount: 0,
      worldEditLeftoverCount: 0,
      streamJournalEntryCount: 12,
      streamJournalSha256:
        '222f3cb3037d358f29a19656cf49d1975994fdd9bf33f7b215857bcf9dae6f7f',
      streamJournalFinalStatus: 'complete',
      rollbackPoststatePassCount: 3,
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
      acceptedScope: 'three full-cube passive summit-headhouse ceiling fixtures only',
      routeClearanceAndEnclosurePreserved: true,
      externalZ11CapRemainsFailClosed: true,
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
