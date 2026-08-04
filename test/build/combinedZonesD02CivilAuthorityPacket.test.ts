import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const GENERATED_AT = '2026-08-04T21:45:58Z';
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d02-civil-authority-packet.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d02-authority-'));
const regeneratedJson = path.join(tempDir, 'authority-packet.json');
const regeneratedMarkdown = path.join(tempDir, 'authority-packet.md');

interface Recommendation {
  blockerId: string;
  readiness: string;
  recommendedSoleAuthorityDefault: string;
  currentWorldEvidenceCanEstablish: string[];
  currentWorldEvidenceCannotEstablish: string[];
  requiredSurveyIds: string[];
  ownerAcceptanceAfterSurvey: string;
}

interface Survey {
  id: string;
  status: string;
  mode: string;
  minimumScope: string[];
  requiredOutputs: string[];
  prohibitedActions: string[];
}

interface AuthorityPacket {
  schemaVersion: number;
  id: string;
  status: string;
  authorityModel: {
    additionalDecisionMakersRequired: boolean;
    agentRecommendationsAreAcceptance: boolean;
    explicitSoleAuthorityAcceptanceRequired: boolean;
    technicalEvidenceMayBeGeneratedAutonomously: boolean;
    realWorldEngineeringOrCodeComplianceClaimed: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: unknown[];
    operationCells: unknown[];
    materialCells: unknown[];
    operationCellCount: number;
    worldEditAuthorized: boolean;
    physicalBuildAuthorized: boolean;
    d02Resolved: boolean;
    r00Accepted: boolean;
  };
  sourceBindings: Array<{ path: string; sha256: string; bytes: number }>;
  evidenceIdentity: {
    immutablePhase0Snapshot: { sha256: string; regionFileCount: number; bytes: number };
    c1ReferenceCenterline: {
      pointCount: number;
      coordinateSetSha256: string;
      endpoints: { start: { x: number; z: number }; end: { x: number; z: number } };
    };
    currentD02Status: string;
    currentR00G02Status: string;
  };
  acceptanceBoundary: {
    d02MayResolveOnlyFrom: string;
    d02MustRemainHoldInThisPacket: boolean;
    r00PrerequisiteForPhysicalPilot: boolean;
    r01ResolvesD02: boolean;
    deferredToR01AndLater: string[];
  };
  recommendationSummary: {
    blockerCount: number;
    readyForImmediateSoleAuthorityReview: string[];
    readOnlySurveyOrDesignEvidenceStillRequired: string[];
  };
  recommendations: Recommendation[];
  readOnlySurveyProgram: Survey[];
  finalGate: { status: string; worldEditAuthorized: boolean };
}

function readPacket(filename: string): AuthorityPacket {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as AuthorityPacket;
}

function sha256File(relativePath: string): string {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_combined_zones_d02_authority_packet.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', GENERATED_AT,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D02 sole-authority recommendation packet', () => {
  it('regenerates the committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds every current source by exact hash', () => {
    const report = readPacket(COMMITTED_JSON);

    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d02-civil-authority-packet',
      status: 'RECOMMENDATIONS_READY_D02_HOLD',
      evidenceIdentity: {
        immutablePhase0Snapshot: {
          sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
          regionFileCount: 51,
          bytes: 290946492,
        },
        c1ReferenceCenterline: {
          pointCount: 1216,
          coordinateSetSha256: '34fb2d5b349c71421ce2959a4dc0b090f0ab2df139d06ac9d42ff71e3c39f48b',
          endpoints: {
            start: { x: 430, z: 80 },
            end: { x: 1550, z: -250 },
          },
        },
        currentD02Status: 'HOLD',
        currentR00G02Status: 'HOLD',
      },
    });
    expect(report.sourceBindings).toHaveLength(9);
    for (const binding of report.sourceBindings) {
      expect(sha256File(binding.path)).toBe(binding.sha256);
      expect(fs.statSync(path.join(ROOT, binding.path)).size).toBe(binding.bytes);
    }
  });

  it('gives conservative defaults for all six D02 acceptances', () => {
    const report = readPacket(COMMITTED_JSON);

    expect(report.recommendations.map((item) => item.blockerId)).toEqual([
      'D02-B01',
      'D02-B02',
      'D02-B03',
      'D02-B04',
      'D02-B05',
      'D02-B06',
    ]);
    expect(report.recommendationSummary).toEqual(expect.objectContaining({
      blockerCount: 6,
      readyForImmediateSoleAuthorityReview: ['D02-B05'],
      readOnlySurveyOrDesignEvidenceStillRequired: [
        'D02-B01',
        'D02-B02',
        'D02-B03',
        'D02-B04',
        'D02-B06',
      ],
    }));
    for (const recommendation of report.recommendations) {
      expect(recommendation.recommendedSoleAuthorityDefault.length).toBeGreaterThan(100);
      expect(recommendation.currentWorldEvidenceCanEstablish.length).toBeGreaterThan(1);
      expect(recommendation.currentWorldEvidenceCanEstablish.join(' ')).not.toContain('undefined');
      expect(recommendation.currentWorldEvidenceCannotEstablish.length).toBeGreaterThan(1);
      expect(recommendation.ownerAcceptanceAfterSurvey.length).toBeGreaterThan(60);
    }
    expect(report.recommendations.find((item) => item.blockerId === 'D02-B05'))
      .toEqual(expect.objectContaining({
        readiness: 'READY_FOR_SOLE_AUTHORITY_VISUAL_ACCEPTANCE_FROM_CURRENT_EVIDENCE',
        requiredSurveyIds: [],
      }));
  });

  it('defines bounded read-only surveys without pretending they have passed', () => {
    const report = readPacket(COMMITTED_JSON);
    const surveyIds = report.readOnlySurveyProgram.map((survey) => survey.id);

    expect(surveyIds).toEqual([
      'D02-S01-C1-FULL-HEIGHT-WORLD-CENSUS',
      'D02-S02-C01-ISSUE-002-INTERFACE-SURVEY',
      'D02-S03-C1-HYDROLOGY-OUTFALL-SURVEY',
      'D02-S04-OPTION-SPECIFIC-QUANTITY-TAKEOFF',
    ]);
    for (const survey of report.readOnlySurveyProgram) {
      expect(survey.status).not.toBe('PASS');
      expect(survey.mode).toMatch(/READ_ONLY|OFFLINE/);
      expect(survey.minimumScope.length).toBeGreaterThan(1);
      expect(survey.requiredOutputs.length).toBeGreaterThan(2);
      expect(survey.prohibitedActions).toContain('world mutation');
    }
    for (const recommendation of report.recommendations) {
      for (const surveyId of recommendation.requiredSurveyIds) {
        expect(surveyIds).toContain(surveyId);
      }
    }
  });

  it('keeps D02, R00, and every physical action fail-closed', () => {
    const report = readPacket(COMMITTED_JSON);

    expect(report.authorityModel).toMatchObject({
      additionalDecisionMakersRequired: false,
      agentRecommendationsAreAcceptance: false,
      explicitSoleAuthorityAcceptanceRequired: true,
      technicalEvidenceMayBeGeneratedAutonomously: true,
      realWorldEngineeringOrCodeComplianceClaimed: false,
    });
    expect(report.safetyBoundary).toEqual(expect.objectContaining({
      liveCallsPerformed: [],
      operationCells: [],
      materialCells: [],
      operationCellCount: 0,
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
      d02Resolved: false,
      r00Accepted: false,
    }));
    expect(report.acceptanceBoundary).toEqual(expect.objectContaining({
      d02MayResolveOnlyFrom: 'PRE_R00_DESIGN_AND_EXTERNAL_ACCEPTANCE_EVIDENCE',
      d02MustRemainHoldInThisPacket: true,
      r00PrerequisiteForPhysicalPilot: true,
      r01ResolvesD02: false,
    }));
    expect(report.acceptanceBoundary.deferredToR01AndLater).toContain('physical pilot');
    expect(report.acceptanceBoundary.deferredToR01AndLater).toContain('post-state QA');
    expect(report.finalGate).toEqual({
      status: 'HOLD_D02_NOT_RESOLVED_NO_WORLD_EDITS',
      reason: expect.any(String),
      worldEditAuthorized: false,
    });
  });
});
