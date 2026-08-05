import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-r00-readiness-audit.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r00-'));
const regeneratedJson = path.join(tempDir, 'audit.json');
const regeneratedMarkdown = path.join(tempDir, 'audit.md');

interface Blocker {
  id: string;
  classification: 'OFFLINE_ACTION' | 'EXTERNAL_EVIDENCE' | 'DEFERRED_G08_G19';
  requirement: string;
  evidencePath: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  sequencingValidation: {
    g02ClosureBoundary: string;
    descendantEvidenceCycleFree: boolean;
    closureChecks: Array<{ scope: string; descendantEvidenceMatches: string[] }>;
    r01ValidationRole: string;
  };
  authorityBindingChecks: Array<{ passed: boolean }>;
  gates: Array<{
    id: string;
    status: 'PASS' | 'HOLD';
    blockers: Blocker[];
  }>;
  deferredEvidence: Blocker[];
  summary: {
    gateCount: number;
    passCount: number;
    holdCount: number;
    r00Ready: boolean;
    blockerCountsByClassification: Record<string, number>;
    delegatedSelectionsValid: boolean;
    ownerDelegatedSelectionCount: number;
    additionalHumanDecisionMakersRequired: boolean;
    remainingGeometryBlockerCount: number;
    copiedSaveCandidatesAudited: number;
    completeCopiedSaveCandidates: number;
    d05S01SurveyComplete: boolean;
    b03ExactRouteSelected: boolean;
    b03HorizontalStepCount: number;
    b07ExactRouteSelected: boolean;
    b07SelectedExcavationStructureConflictCellCount: number;
    b07SelectedExcavationWaterCellCount: number;
    b08ExactRouteSelected: boolean;
    b07CenteredBaselineConflictCellCount: number;
    d02AcceptableOutfallCandidateCount: number;
    d02PreferredDrainageCandidateCellCount: number;
    d02HeldLowRunCount: number;
    d05FutureStateContractPassed: boolean;
    d05FutureStateCellCount: number;
    d05SelectedPlanningAlternativeId: string;
    d05CandidateAddedSolidCellCount: number;
    d05BelowCoordinationSupportGapCellCount: number;
    b09ExactRouteSelected: boolean;
    b10AnalyticSurfaceSelected: boolean;
    d06CappedVentRiserCount: number;
    d06DetailedProposalLayerCount: number;
    d06DetailedCanonicalProposalCellCount: number;
    d02C01TerminalDatumCellCount: number;
    d02C01LoadingPrecedenceWithheldCellCount: number;
    d02C01ProposedTerminalCapCellCount: number;
    ownerReviewBundleReady: boolean;
    ownerReviewBundlePayloadSha256: string;
    ownerReviewBundleAcceptanceRecorded: boolean;
    ownerReviewAcceptanceValid: boolean;
    ownerReviewAcceptanceRecordSha256: string;
    ownerReviewAcceptancePayloadSha256: string;
    d02OwnerPacketReady: boolean;
    d05OwnerPacketReady: boolean;
    d06OwnerPacketReady: boolean;
    p1B11OwnerPacketReady: boolean;
    p1B11PlanningBasisAccepted: boolean;
    p1B11GrandAvenueCenterlinePointCount: number;
    autonomousOfflineWorkMayContinue: boolean;
    autonomousOfflineWorkCanCompleteR00: boolean;
    externalEvidenceStillRequired: boolean;
  };
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/audit_combined_zones_r00_readiness.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', '2026-08-04T18:00:00Z',
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones R00 readiness audit', () => {
  it('regenerates the committed audit byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds every local input to its current SHA-256', () => {
    const report = readReport();
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.existsSync(filename), source.path).toBe(true);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
    expect(report.authorityBindingChecks.every(({ passed }) => passed)).toBe(true);
  });

  it('evaluates only G01-G07 and reports the honest R00 hold', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-r00-readiness-audit',
      status: 'R00_HOLD',
      executable: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      summary: {
        gateCount: 7,
        passCount: 1,
        holdCount: 6,
        r00Ready: false,
        delegatedSelectionsValid: true,
        ownerDelegatedSelectionCount: 20,
        additionalHumanDecisionMakersRequired: false,
        remainingGeometryBlockerCount: 0,
        copiedSaveCandidatesAudited: 56,
        completeCopiedSaveCandidates: 0,
        d05S01SurveyComplete: true,
        b03ExactRouteSelected: true,
        b03HorizontalStepCount: 800,
        b07ExactRouteSelected: true,
        b07SelectedExcavationStructureConflictCellCount: 0,
        b07SelectedExcavationWaterCellCount: 38,
        b08ExactRouteSelected: true,
        b07CenteredBaselineConflictCellCount: 217,
        d02AcceptableOutfallCandidateCount: 0,
        d02PreferredDrainageCandidateCellCount: 432,
        d02HeldLowRunCount: 1,
        d05FutureStateContractPassed: true,
        d05FutureStateCellCount: 0,
        d05SelectedPlanningAlternativeId: 'FM-01-COMPACT-EAST-FACE',
        d05CandidateAddedSolidCellCount: 14768553,
        d05BelowCoordinationSupportGapCellCount: 754224,
        b09ExactRouteSelected: true,
        b10AnalyticSurfaceSelected: true,
        d06CappedVentRiserCount: 4,
        d06DetailedProposalLayerCount: 31,
        d06DetailedCanonicalProposalCellCount: 9065,
        d02C01TerminalDatumCellCount: 7803,
        d02C01LoadingPrecedenceWithheldCellCount: 45,
        d02C01ProposedTerminalCapCellCount: 9,
        ownerReviewBundleReady: true,
        ownerReviewBundleAcceptanceRecorded: true,
        ownerReviewAcceptanceValid: true,
        d02OwnerPacketReady: true,
        d05OwnerPacketReady: true,
        d06OwnerPacketReady: true,
        p1B11OwnerPacketReady: true,
        p1B11PlanningBasisAccepted: true,
        p1B11GrandAvenueCenterlinePointCount: 299,
        autonomousOfflineWorkMayContinue: true,
        autonomousOfflineWorkCanCompleteR00: false,
        externalEvidenceStillRequired: true,
      },
    });
    expect(report.gates.map(({ id, status }) => [id, status])).toEqual([
      ['G01_AUTHORITY', 'PASS'],
      ['G02_DESIGN_DECISIONS', 'HOLD'],
      ['G03_INTEGER_SET_OUT', 'HOLD'],
      ['G04_OWNERSHIP', 'HOLD'],
      ['G05_INTERFACES', 'HOLD'],
      ['G06_PROTECTED_FEATURES', 'HOLD'],
      ['G07_CIVIL_HYDROLOGY_STRUCTURE', 'HOLD'],
    ]);
    expect(report.gates.find(({ id }) => id === 'G03_INTEGER_SET_OUT')?.blockers)
      .toMatchObject([
        {
          id: 'R00-G03-CANONICAL-INTEGER-COMPILER',
          classification: 'OFFLINE_ACTION',
        },
      ]);
  });

  it('proves G02 cycle-free and classifies current versus deferred evidence', () => {
    const report = readReport();
    expect(report.sequencingValidation).toMatchObject({
      g02ClosureBoundary: 'PRE_R00_DESIGN_ACCEPTANCE_ONLY',
      descendantEvidenceCycleFree: true,
      r01ValidationRole: 'POST_R00_VALIDATION_NOT_D02_D05_D06_OR_G02_CLOSURE_EVIDENCE',
    });
    expect(report.sequencingValidation.closureChecks.every(
      ({ descendantEvidenceMatches }) => descendantEvidenceMatches.length === 0,
    )).toBe(true);
    expect(report.summary.blockerCountsByClassification).toEqual({
      OFFLINE_ACTION: 5,
      EXTERNAL_EVIDENCE: 7,
      DEFERRED_G08_G19: 2,
    });
    expect(report.deferredEvidence).toHaveLength(2);
    expect(report.deferredEvidence.every(
      ({ classification }) => classification === 'DEFERRED_G08_G19',
    )).toBe(true);
  });

  it('validates the separate acceptance record against the immutable bundle', () => {
    const report = readReport();
    const acceptance = JSON.parse(fs.readFileSync(
      path.join(
        ROOT,
        'masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
      ),
      'utf8',
    )) as {
      bundleFileSha256: string;
      bundlePayloadSha256: string;
      acceptanceRecordPayloadSha256: string;
    };
    const bundleSource = report.sourceBindings.ownerReviewBundle;
    expect(acceptance.bundleFileSha256).toBe(bundleSource.sha256);
    expect(acceptance.bundlePayloadSha256).toBe(report.summary.ownerReviewBundlePayloadSha256);
    expect(report.summary.ownerReviewAcceptanceRecordSha256)
      .toBe(report.sourceBindings.ownerReviewAcceptance.sha256);
    expect(report.summary.ownerReviewAcceptancePayloadSha256)
      .toBe(acceptance.acceptanceRecordPayloadSha256);
  });
});
