import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const JSON_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
);
const MARKDOWN_PATH = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-autonomous-design-selections.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-selections-'));
const regeneratedJson = path.join(tempDir, 'selections.json');
const regeneratedMarkdown = path.join(tempDir, 'selections.md');

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  authority: Record<string, unknown>;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  technicalEvidenceAdvances: {
    d02S01S02: Record<string, unknown>;
    d05S01: Record<string, unknown>;
    d06SurfaceEgress: Record<string, unknown>;
    connectorGeometry: Record<string, unknown>;
    d02ClosedDrainage: Record<string, unknown>;
    d05FutureMountain: Record<string, unknown>;
    d06LifeSafety: Record<string, unknown>;
    cheyenneJcurve: Record<string, unknown>;
  };
  selections: Array<{
    id: string;
    scope: string;
    selection: string;
    effect: string;
    technicalAcceptanceClaimed: boolean;
  }>;
  disposition: {
    selectionCount: number;
    selectedSubjectiveChoices: string[];
    remainingTechnicalWork: string[];
    d02Resolved: boolean;
    d05Resolved: boolean;
    d06Resolved: boolean;
    r00G02Passed: boolean;
  };
  safetyBoundary: Record<string, unknown>;
}

const readReport = (): Report => JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) as Report;
const sha256File = (filename: string): string => crypto.createHash('sha256')
  .update(fs.readFileSync(filename))
  .digest('hex');

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_combined_zones_autonomous_selections.mjs',
      '--generated-at', '2026-08-04T22:10:00Z',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones owner-delegated autonomous selections', () => {
  it('regenerates both committed artifacts byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(JSON_PATH));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(MARKDOWN_PATH));
  });

  it('binds each recommendation packet exactly', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-autonomous-design-selections',
      status: 'PARTIAL_PASS_OWNER_DELEGATED_SELECTIONS_FROZEN_TECHNICAL_GATES_HOLD',
    });
    expect(Object.keys(report.sourceBindings)).toEqual([
      'd02',
      'd02RegionEvidence',
      'd02ClosedDrainage',
      'd05',
      'd05RelicSurvey',
      'd05FutureMountain',
      'd06',
      'd06LifeSafety',
      'connectorGeometry',
      'cheyenneJcurve',
    ]);
    for (const binding of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size, binding.path).toBe(binding.bytes);
      expect(sha256File(filename), binding.path).toBe(binding.sha256);
    }
  });

  it('records the bounded technical evidence gained without promoting the gates', () => {
    const report = readReport();
    expect(report.technicalEvidenceAdvances).toEqual({
      d02S01S02: {
        status: 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD',
        copiedSaveCandidatesAudited: 56,
        completeCopiedSaveCandidates: 0,
        s01Complete: false,
        s02Complete: false,
      },
      d05S01: {
        status: 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD',
        relicCount: 3,
        presentFabricCells: {
          'igloo-east': 0,
          'igloo-west': 187,
          shipwreck: 1118,
        },
        observationCandidateRouteLengths: {
          'igloo-east': 0,
          'igloo-west': 14,
          shipwreck: 19,
        },
      },
      d06SurfaceEgress: {
        status: 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN',
        exactEndpointCount: 2,
        routeSetsDisjoint: true,
      },
      connectorGeometry: {
        status: 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
        b07Status: 'PARTIAL_PASS_EXACT_OFFLINE_GEOMETRY_B07_LIFE_SAFETY_HOLD',
        b07ExcavationCells: 7791,
        b07WaterCells: 38,
        b08Status: 'PARTIAL_PASS_EXACT_RAIL_BUILDABLE_CANDIDATE_B08_REVIEW_HOLD',
        b08HorizontalSteps: 220,
        b08ExcavationCells: 7878,
        b08Selected: true,
        b09FaceSelected: false,
      },
      d02ClosedDrainage: {
        status: 'PARTIAL_PASS_PREFERRED_CLOSED_SUMP_PLANNING_GEOMETRY_D02_HOLD',
        preferredAlternativeId: 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD',
        candidateCellCount: 432,
        noBuildLowRunCount: 1,
      },
      d05FutureMountain: {
        status: 'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD',
        recommendedAlternativeId: 'FM-01-COMPACT-EAST-FACE',
        recommendationSelectedByThisLedger: true,
        futureCellCount: 0,
      },
      d06LifeSafety: {
        status: 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
        recommendedB07CandidateId: 'B07-C-WEST-2',
        ventAlternativeId: 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS',
      },
      cheyenneJcurve: {
        status: 'PARTIAL_PASS_EXACT_JCURVE_PLANNING_GEOMETRY_P1_B03_TECHNICAL_HOLD',
        horizontalSteps: 800,
        excavationCells: 15972,
        selectedByThisLedger: true,
      },
    });
  });

  it('freezes only ready conservative choices under the owner delegation', () => {
    const report = readReport();
    expect(report.authority).toMatchObject({
      decisionAuthority: 'sole human project owner',
      delegationMode: 'OWNER_DIRECTED_AUTONOMOUS_RESEARCH_DESIGN_AND_PLANNING',
      additionalHumanDecisionMakersRequired: false,
      agentMaySelectReadyConservativePlanningDefaults: true,
      agentMayInventTechnicalEvidence: false,
      agentMayClaimExpertAcceptance: false,
    });
    expect(report.selections.map(({ scope }) => scope)).toEqual([
      'D02-B05',
      'D05-buffer-policy',
      'D05-east-igloo',
      'D05-ownership-interfaces',
      'D05-future-model',
      'D05-preservation',
      'D06-egress',
      'D06-systems',
      'P1-B08-SERVICE-TUNNEL-CENTERLINE',
      'D02-S04-closed-drainage',
      'P1-B03-CHEYENNE-JCURVE',
      'P1-B07-PUBLIC-SHAFT-DOGLEG',
      'P1-B09-FUNICULAR-CENTERLINE',
      'P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS',
      'D06-mechanism-reservations',
      'P1-B01-VERTICAL-AUTHORITY-ACTIVATION',
      'P1-B02-CHEYENNE-INTERNAL-FIT',
      'P1-B04-SUBTROPOLIS-NORMALIZATION',
      'P1-B05-SUBTROPOLIS-PILLARS',
      'P1-B06-HOUSTON-GENERIC-PLACEMENT',
    ]);
    expect(report.disposition.selectionCount).toBe(20);
    for (const selection of report.selections) {
      expect(selection.selection.length).toBeGreaterThan(30);
      expect(selection.effect.length).toBeGreaterThan(45);
      expect(selection.technicalAcceptanceClaimed).toBe(false);
    }
  });

  it('does not overstate remaining design or R00 readiness', () => {
    const report = readReport();
    expect(report.disposition).toMatchObject({
      d02Resolved: false,
      d05Resolved: false,
      d06Resolved: false,
      r00G02Passed: false,
    });
    expect(report.disposition.remainingTechnicalWork).toHaveLength(8);
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      operations: [],
      operationCellCount: 0,
      materialCellCount: 0,
      liveCallsPerformed: [],
      worldEditAuthorized: false,
      physicalBuildAuthorized: false,
    });
  });
});
