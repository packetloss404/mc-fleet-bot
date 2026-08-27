import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/qa_combined_zones_r08_pf01_fitout_post_release.mjs');
const EVIDENCE = 'data/world-review/combined-zones-r08m-live-20260821T174621Z';
const LEDGER = `${EVIDENCE}/evidence-ledger.json`;
const BASE_QA = `${EVIDENCE}/r08m-post-release-qa.json`;
const POST_ROOT = 'data/worldsnap-combined-zones-r08m-post-20260821T174621Z';
const POST_INTAKE = `${EVIDENCE}/post-complete-save-intake.json`;
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r08m-pf01-qa-'));
const REPORT = path.join(DIRECTORY, 'retention-supplement.json');
const MARKDOWN = path.join(DIRECTORY, 'retention-supplement.md');

let firstArtifacts: Buffer[] = [];

function args(): string[] {
  return [
    SCRIPT,
    '--generated-at', '2026-08-21T17:49:00Z',
    '--evidence-dir', EVIDENCE,
    '--ledger', LEDGER,
    '--manifest',
    'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
    '--post-root', POST_ROOT,
    '--post-intake', POST_INTAKE,
    '--base-qa', BASE_QA,
    '--out', REPORT,
    '--markdown', MARKDOWN,
  ];
}

beforeAll(() => {
  execFileSync(process.execPath, args(), { cwd: ROOT, stdio: 'pipe' });
  firstArtifacts = [REPORT, MARKDOWN].map((filename) => fs.readFileSync(filename));
  execFileSync(process.execPath, args(), { cwd: ROOT, stdio: 'pipe' });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('Combined Zones R08M PF01 post-release QA supplement', () => {
  it('regenerates the JSON and Markdown seal byte-for-byte', () => {
    expect([REPORT, MARKDOWN].map((filename) => fs.readFileSync(filename)))
      .toEqual(firstArtifacts);
  });

  it('binds the terminal ledger, completed identity, immutable post, and base QA', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    expect(report).toMatchObject({
      status: 'PASS_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE_ACCEPTED',
      release: {
        manifestIdentity:
          '2e339c92c7505d0a1321263a6ef2d8dc1047868a74fd037b7e4659fc79d69add',
        completedReleaseIdentitySha256:
          'e97d45132458b3fe82a1d3fdb16a840ad92cc1f0d3fe1a13de60d510d6b4b4e7',
      },
      bindings: {
        canonicalBaseQa: {
          status: 'PASS_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE_ACCEPTED',
          qaPayloadSha256:
            'ca8afa36ae6aded18aeced1c2d1ee0ed5b227357dfe86d7cf5396bd0f33f7afc',
        },
        postCompleteSave: {
          root: POST_ROOT,
          completeSaveSha256:
            '729e0ce1cbbfc46fcba8c8e4e906b15b9c9f78036a3ddb888791de55abcc87a2',
          regionSnapshotSha256:
            '17e6965f93dc3c06c2df6d39ad90572f39c4ff54b3ac3e8eb3e70a44c56d409a',
        },
      },
    });
  });

  it('verifies every fitout target and the connected 2,432-cell interior', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    expect(report.geometry).toMatchObject({
      chamber: { cellCount: 4242 },
      clearInterior: { cellCount: 2432 },
      preservedMechanisms: { cellCount: 201 },
      preservedCarrierBands: { cellCount: 194 },
      lightingFixtures: { cellCount: 7 },
      completeBarrier: { cellCount: 202 },
      operatedTargets: {
        cellCount: 3859,
        coordinateSetSha256:
          '36d587b7cb1ace89e869f832d7e0b75eb92f5ac30c589db7468cbc8bbe95c6f1',
      },
    });
    expect(report.postState).toMatchObject({
      operatedTargets: { matchingCellCount: 3859, mismatchCellCount: 0 },
      clearInterior: {
        matchingCellCount: 2432,
        mismatchCellCount: 0,
        stateCensus: {
          'minecraft:air': 2391,
          'minecraft:cave_air': 41,
        },
        connectivity: { componentCount: 1, largestComponentCellCount: 2432 },
      },
      preservedMechanisms: { matchingCellCount: 201, mismatchCellCount: 0 },
    });
  });

  it('seals the exact retained liners, feeds, lava edge, and future interfaces', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    expect(report.geometry).toMatchObject({
      retainedLinerBoundary: {
        cellCount: 21,
        coordinateSetSha256:
          '258c990049ba981fb5cfd964dbe140b3197d24d1fdb84d84fd1f008cb8dc4ddc',
      },
      retainedOuterLavaLiner: { cellCount: 16 },
      retainedWaterBoundaryLiner: { cellCount: 5 },
      retainedWaterFeed: {
        cellCount: 5,
        coordinateSetSha256:
          'd9824289b273ef811fed46fe6a57edac06e7ec01ff5c88dd3c764ce078d69d88',
      },
      retainedExternalLavaSources: {
        cellCount: 16,
        coordinateSetSha256:
          'a3f6aec2442f9495c37489700bc1a8bcee15dd79f11a2e802d226dbb11672368',
      },
      futureSeals: { cellCount: 200 },
      nonTargetAuditUniverse: { cellCount: 3779 },
    });
    expect(report.postState).toMatchObject({
      retainedBoundary: {
        linerMatchCount: 21,
        feedMatchCount: 5,
        rootMatchCount: 1,
        externalLavaMatchCount: 16,
      },
      undeclaredDrift: { auditedCellCount: 3779, driftCellCount: 0, listedDrift: [] },
    });
  });

  it('binds strict execution and complete reverse-order rollback viability', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    expect(report.executionEvidence).toMatchObject({
      strictSuccessfulGroupCount: 3859,
      strictFailedGroupCount: 0,
      strictNoopCount: 0,
    });
    expect(report.executionEvidence.packages).toEqual([
      expect.objectContaining({ status: 'complete', successfulGroups: 1609, passed: true }),
      expect.objectContaining({ status: 'complete', successfulGroups: 2250, passed: true }),
    ]);
    expect(report.executionEvidence.rollbackPoststatePreflights).toEqual([
      expect.objectContaining({ passedGuards: 2250, overlayArtifactCount: 0, passed: true }),
      expect.objectContaining({ passedGuards: 1609, overlayArtifactCount: 1, passed: true }),
    ]);
    expect(report.summary).toMatchObject({
      passed: true,
      failCount: 0,
      rollbackGuardPassCount: 3859,
      undeclaredDriftCellCount: 0,
    });
  });

  it('fails closed when the selected post root is not ledger-bound', () => {
    const wrongPostArgs = args();
    wrongPostArgs[wrongPostArgs.indexOf('--post-root') + 1]
      = 'data/worldsnap-combined-zones-r08l-liner-post-20260821T174037Z';
    wrongPostArgs[wrongPostArgs.indexOf('--out') + 1] = path.join(DIRECTORY, 'wrong-post.json');
    wrongPostArgs[wrongPostArgs.indexOf('--markdown') + 1]
      = path.join(DIRECTORY, 'wrong-post.md');
    expect(() => execFileSync(process.execPath, wrongPostArgs, {
      cwd: ROOT,
      stdio: 'pipe',
    })).toThrow();
  });

  it('contains only PASS checks and declares a read-only safety boundary', () => {
    const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
    expect(report.checks).toHaveLength(13);
    expect(report.checks.every(({ status }: { status: string }) => status === 'PASS')).toBe(true);
    expect(report.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      readOnlyAnvilInputs: true,
    });
    expect(report.qaPayloadSha256)
      .toBe('ddfcb321744b9b43d71f1217d725452e3362af0d25ade71c429d380bcdf9bf05');
  });
});
