import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-owner-review-acceptance.md',
);
const BUNDLE_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-owner-review-bundle.json',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-owner-acceptance-'));
const regeneratedJson = path.join(tempDir, 'acceptance.json');
const regeneratedMarkdown = path.join(tempDir, 'acceptance.md');

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  decision: string;
  acceptedBy: string;
  acceptedAtUtc: string;
  bundlePath: string;
  bundleFileSha256: string;
  bundlePayloadSha256: string;
  actualApprovalText: string;
  subsequentInstructionText: string;
  copyableStatementAcceptedVerbatim: boolean;
  bundleStatementIncorporatedByReference: boolean;
  bundleCopyableStatement: string;
  acceptanceRecordPayload: Record<string, unknown>;
  acceptanceRecordPayloadSha256: string;
  effectivePlanningDisposition: {
    p1B11PlanningBasisAccepted: boolean;
    clearedOwnerChoiceIds: string[];
    remainingGeometryChoiceCount: number;
    technicalHoldPassedCount: number;
  };
  retainedTechnicalHolds: Array<{
    scope: string;
    bundleReviewHoldCount: number;
    retained: boolean;
    technicalHoldPassedByAcceptance: boolean;
  }>;
  safetyBoundary: Record<string, unknown>;
  disposition: Record<string, unknown>;
}

function sha256(data: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) as Report;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/record_combined_zones_owner_review_acceptance.mjs',
      '--accepted-at', '2026-08-05T00:55:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones sole-owner review acceptance', () => {
  it('regenerates both committed artifacts byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds the immutable bundle file, payload, and exact statement', () => {
    const report = readReport();
    const bundleBytes = fs.readFileSync(BUNDLE_PATH);
    const bundle = JSON.parse(bundleBytes.toString('utf8')) as {
      bundlePayload: Record<string, unknown>;
      authority: { bundlePayloadSha256: string; copyableStatement: string };
    };
    expect(report.bundlePath).toBe(
      'masterplans/05-combined-zones/phase1-owner-review-bundle.json',
    );
    expect(report.bundleFileSha256).toBe(sha256(bundleBytes));
    expect(report.bundlePayloadSha256).toBe(sha256(`${JSON.stringify(bundle.bundlePayload)}\n`));
    expect(report.bundlePayloadSha256).toBe(bundle.authority.bundlePayloadSha256);
    expect(report.copyableStatementAcceptedVerbatim).toBe(false);
    expect(report.bundleStatementIncorporatedByReference).toBe(true);
    expect(report.bundleCopyableStatement).toBe(bundle.authority.copyableStatement);
    expect(report.acceptanceRecordPayloadSha256)
      .toBe(sha256(`${JSON.stringify(report.acceptanceRecordPayload)}\n`));
  });

  it('records the sole-owner decision and clears only the B11 planning choice', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-owner-review-acceptance',
      status: 'OWNER_ACCEPTANCE_RECORDED_PLANNING_POLICY_FROZEN_ALL_TECHNICAL_HOLDS_RETAINED',
      decision: 'ACCEPT_PLANNING_POLICY_AND_TECHNICAL_DEVELOPMENT_CHECKLIST',
      acceptedBy: 'sole human project owner',
      acceptedAtUtc: '2026-08-05T00:55:00Z',
      actualApprovalText: 'yes I approve then, please continue to engineer and fan out into teams if you need to. Also does it make sense to put a tunnel under grandave now and add to it later than try to add it later?',
      subsequentInstructionText: 'also fan out teams of subagents to remove all BLOCKS AND HOLDS',
      copyableStatementAcceptedVerbatim: false,
      bundleStatementIncorporatedByReference: true,
      effectivePlanningDisposition: {
        p1B11PlanningBasisAccepted: true,
        clearedOwnerChoiceIds: ['P1-B11-EXTERNAL-INTERFACES'],
        remainingGeometryChoiceCount: 0,
        technicalHoldPassedCount: 0,
      },
      disposition: {
        ownerAcceptanceRecorded: true,
        planningPolicyFrozen: true,
        allTechnicalHoldsRetained: true,
        p1B11PlanningBasisFrozen: true,
        g02Passed: false,
        g03Passed: false,
        r00Passed: false,
        completeSavedWorldStillRequired: true,
      },
    });
  });

  it('retains the exact packet HOLD inventory and cannot authorize physical work', () => {
    const report = readReport();
    expect(report.retainedTechnicalHolds.map(({ scope, bundleReviewHoldCount }) => ({
      scope,
      bundleReviewHoldCount,
    }))).toEqual([
      { scope: 'D02', bundleReviewHoldCount: 11 },
      { scope: 'D05', bundleReviewHoldCount: 8 },
      { scope: 'D06', bundleReviewHoldCount: 9 },
    ]);
    expect(report.retainedTechnicalHolds.every(
      ({ retained, technicalHoldPassedByAcceptance }) => (
        retained && !technicalHoldPassedByAcceptance
      ),
    )).toBe(true);
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      operations: [],
      operationCellCount: 0,
      materialCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
    });
  });
});
