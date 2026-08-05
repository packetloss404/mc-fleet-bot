import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-owner-review-bundle.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-owner-review-bundle.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-owner-bundle-'));
const regeneratedJson = path.join(tempDir, 'bundle.json');
const regeneratedMarkdown = path.join(tempDir, 'bundle.md');

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: {
    additionalHumanDecisionMakersRequired: boolean;
    ownerAcceptanceRecorded: boolean;
    bundlePayloadSha256: string;
    copyableStatement: string;
  };
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  packetSummary: Array<{
    scope: string;
    approvedByBundle: boolean;
    remainingHoldCount: number;
  }>;
  approvalRecordTemplate: { currentRecord: null };
  safetyBoundary: Record<string, unknown>;
  disposition: Record<string, unknown>;
}

const readReport = (): Report => JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) as Report;

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_owner_review_bundle.mjs',
      '--generated-at', '2026-08-04T23:50:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones sole-owner review bundle', () => {
  it('regenerates both committed artifacts byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds all four review packets exactly', () => {
    const report = readReport();
    expect(Object.keys(report.sourceBindings)).toEqual(['d02', 'd05', 'd06', 'b11']);
    for (const binding of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size).toBe(binding.bytes);
      expect(crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex'))
        .toBe(binding.sha256);
    }
    expect(report.packetSummary.map(({ scope }) => scope)).toEqual(['D02', 'D05', 'D06', 'P1-B11']);
    expect(report.packetSummary.every(({ approvedByBundle }) => !approvedByBundle)).toBe(true);
    expect(report.packetSummary.every(({ remainingHoldCount }) => remainingHoldCount > 0)).toBe(true);
  });

  it('offers one exact approval statement without self-recording approval', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-owner-review-bundle',
      status: 'READY_FOR_SOLE_OWNER_REVIEW_BUNDLE_ACCEPTANCE_PENDING_ALL_TECHNICAL_HOLDS_RETAINED',
      authority: {
        additionalHumanDecisionMakersRequired: false,
        ownerAcceptanceRecorded: false,
      },
      approvalRecordTemplate: { currentRecord: null },
      disposition: {
        readyForSoleOwnerReview: true,
        ownerAcceptanceRecorded: false,
        packetCount: 4,
        p1B11MayFreezeAfterAcceptanceRecord: true,
        technicalHoldMayPassFromThisApproval: false,
        completeSavedWorldStillRequired: true,
        r00Passed: false,
      },
    });
    expect(report.authority.copyableStatement).toContain(report.authority.bundlePayloadSha256);
    expect(report.authority.copyableStatement).toContain('do not mark any current HOLD as PASS');
  });

  it('cannot authorize physical work', () => {
    const report = readReport();
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
