import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import crypto from 'crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_g02_g07_minimal_review_packet.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g02-g07-minimal-review-packet.md',
);
const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-g02-g07-review-'));
const regeneratedJson = path.join(temporaryDirectory, 'packet.json');
const regeneratedMarkdown = path.join(temporaryDirectory, 'packet.md');

type JsonRecord = Record<string, unknown>;

function report(): JsonRecord {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as JsonRecord;
}

function canonicalJson(input: unknown): string {
  if (input === null || typeof input !== 'object') return JSON.stringify(input);
  if (Array.isArray(input)) return `[${input.map(canonicalJson).join(',')}]`;
  const record = input as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(record[key])}`
  )).join(',')}}`;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--generated-at', '2026-08-06T22:05:00Z',
    '--out', regeneratedJson,
    '--markdown', regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe' });
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones G02/G07 minimal review packet', () => {
  it('regenerates the committed packet byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });

  it('binds the unsigned packet payload and completed report deterministically', () => {
    const value = report();
    const packetPayloadSha256 = value.packetPayloadSha256 as string;
    const reportIdentitySha256 = value.reportIdentitySha256 as string;

    const unsignedPayload = structuredClone(value);
    delete unsignedPayload.packetPayloadSha256;
    delete unsignedPayload.reportIdentitySha256;
    (unsignedPayload.finalOwnerAcceptanceRecord as Record<string, unknown>)
      .packetPayloadSha256 = null;
    expect(sha256(`${canonicalJson(unsignedPayload)}\n`)).toBe(packetPayloadSha256);

    const reportPayload = structuredClone(value);
    delete reportPayload.reportIdentitySha256;
    expect(sha256(`${canonicalJson(reportPayload)}\n`)).toBe(reportIdentitySha256);
  });

  it('reduces external review to three discipline records and one owner record', () => {
    expect(report()).toMatchObject({
      status: 'MINIMAL_REVIEW_PACKET_SUBMISSIONS_RECORDED_BY_SOLE_OWNER_ACCEPTANCE',
      submissionResolution: {
        independentThirdPartyReview: false,
        soleOwnerAcceptance: true,
      },
      alreadyResolvedDoNotRepeat: {
        planningGeometryChoiceCountRemaining: 0,
        exactCompleteSaveAccepted: true,
        staleSourceRowsClosed: 5,
        repeatedSubjectivePlanningReviewRequired: false,
        preflightOrPostStateEvidenceMayResolveG02: false,
      },
      summary: {
        externalSubmissionCount: 4,
        disciplineReviewSubmissionCount: 3,
        finalOwnerRecordCount: 1,
        separateMissingFactEvidenceCount: 2,
        nullEndpointContractCount: 13,
        proposedInterfaceContractCount: 161,
        proposedOwnerRecordCount: 27,
        commissioningSpecificationCountToFreezeAndAccept: 29,
        commissioningExecutedResultCountRequiredForG02: 0,
        b12FullTechnicalReviewAvoidedByRecommendedDeferral: true,
        submissionsRecordedBySoleOwnerAcceptance: true,
      },
    });
  });

  it('keeps every external reviewer and owner acceptance field unsigned', () => {
    const value = report() as {
      externalReviewSubmissions: Array<{ submission: Record<string, unknown> }>;
      finalOwnerAcceptanceRecord: Record<string, unknown>;
      minimumScopeDecision: Record<string, unknown>;
    };
    for (const review of value.externalReviewSubmissions) {
      expect(review.submission.reviewerIdentity).toBeNull();
      expect(review.submission.decision).toBeNull();
      expect(review.submission.reviewRecordSha256).toBeNull();
    }
    expect(value.minimumScopeDecision.ownerDecision).toBeNull();
    expect(value.finalOwnerAcceptanceRecord.ownerIdentity).toBeNull();
    expect(value.finalOwnerAcceptanceRecord.decision).toBeNull();
    expect(value.finalOwnerAcceptanceRecord.acceptanceRecordSha256).toBeNull();
  });

  it('recommends bounded B12 deferral without converting it into acceptance', () => {
    expect(report()).toMatchObject({
      minimumScopeDecision: {
        status: 'OWNER_CONFIRMATION_REQUIRED_NOT_ACCEPTED_BY_THIS_PACKET',
        recommendedDecision:
          'DEFER_P1_B12_PHYSICAL_SHELL_RETAIN_NO_FORECLOSURE_RESERVATION',
        existingCandidateFacts: {
          constructNow: false,
          fitOutNow: false,
          retainNoForeclosureReservation: true,
          candidateAcceptedByOwner: false,
        },
      },
    });
  });

  it('does not claim a build, operation, or production action', () => {
    expect(report()).toMatchObject({
      summary: {
        buildAuthorized: false,
        worldEditAuthorized: false,
      },
      safetyBoundary: {
        readOnly: true,
        operationCount: 0,
        productionContacted: false,
        rconContacted: false,
        fleetApiContacted: false,
        systemdContacted: false,
        acceptanceClaimed: false,
        reviewerIdentityFabricated: false,
        worldEditAuthorized: false,
        physicalBuildAuthorized: false,
      },
    });
  });
});
