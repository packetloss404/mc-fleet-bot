import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-conservative-defaults.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-defaults-'));
const regeneratedJson = path.join(tempDir, 'd05-defaults.json');
const regeneratedMarkdown = path.join(tempDir, 'd05-defaults.md');

interface RelicRecommendation {
  relicKey: string;
  currentFinding: string;
  recommendedDisposition: string;
  protectedCore: { cellCount: number; coordinateSetSha256: string };
  minimumPlanningExclusionShell: {
    positiveMarginBlocks: number;
    cellCount: number;
    coordinateSetSha256: string;
  };
  engineeringQualification: string;
  reconstructionAuthorized: boolean;
  relocationAuthorized: boolean;
  removalAuthorized: boolean;
  observationAccessAuthorized: boolean;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  sourceBindings: Record<string, { path: string; bytes: number; sha256: string }>;
  immutableEvidenceIdentity: {
    snapshot: { path: string; sha256: string };
  };
  machineProvableFacts: {
    protectedRelicRecordCount: number;
    presentRelicFabricCount: number;
    absentRecordedRelicSites: string[];
    exactCurrentFamilies: Record<string, {
      cellCount: number;
      coordinateSetSha256: string;
    }>;
    waterComponentCount: number;
    lavaComponentCount: number;
    d8SurfaceRoutingCandidate: {
      columnCount: number;
      routesToBoundaryColumnCount: number;
      routesToInternalSinkColumnCount: number;
      qualification: string;
    };
  };
  soleAuthorityRecommendations: {
    adoptionState: string;
    bufferPolicy: {
      id: string;
      relics: RelicRecommendation[];
      replacesExpertBufferDesign: boolean;
    };
    eastIglooDisposition: {
      recommendation: string;
      constructionAuthorized: boolean;
    };
    logicalOwnershipAndInterfaces: {
      owners: Array<{ ownerId: string }>;
      interfaceRules: string[];
      exactCellOwnershipFrozen: boolean;
    };
    futureTerrainAndInfluenceModel: {
      modelId: string;
      requiredExactSetFamilies: string[];
      exactModelAvailable: boolean;
    };
    preservationAndNoDiversionCriteria: {
      recommendation: string;
      preR00DesignCriteria: string[];
      allowsNarrativeWaiver: boolean;
    };
  };
  remainingReadOnlySurveyAndDesignEvidence: Array<{
    id: string;
    classification: string;
    canBeDerivedFromCurrentBoundedCensus: boolean;
  }>;
  evidenceBoundary: {
    d05Resolved: boolean;
    g02Passed: boolean;
    g06Passed: boolean;
    g07Passed: boolean;
    ownerAcceptanceRecorded: boolean;
    expertAcceptanceRecorded: boolean;
    exactFutureInfluenceCellsAvailable: boolean;
    exactConstructionCellsAvailable: boolean;
    worldEditAuthorized: boolean;
    constructionOwnershipAuthorized: boolean;
    operationCellCount: number;
    materialCellCount: number;
  };
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/generate_combined_zones_d05_conservative_defaults.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05 conservative defaults', () => {
  it('regenerates byte-identical recommendations bound to current evidence', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-conservative-defaults',
      status: 'RECOMMENDATION_READY_D05_AND_G06_HOLD',
    });
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size, source.path).toBe(source.bytes);
      expect(sha256File(filename), source.path).toBe(source.sha256);
    }
    expect(report.immutableEvidenceIdentity.snapshot).toEqual({
      path: 'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
      bytes: 290_946_492,
      algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    });
  });

  it('separates exact copied-snapshot facts from unmodelled hydrology', () => {
    const facts = readReport().machineProvableFacts;
    expect(facts).toMatchObject({
      protectedRelicRecordCount: 3,
      presentRelicFabricCount: 2,
      absentRecordedRelicSites: ['igloo-east'],
      waterComponentCount: 5_234,
      lavaComponentCount: 941,
      exactCurrentFamilies: {
        water: {
          cellCount: 1_929_621,
          coordinateSetSha256:
            '1c6e3d25121884eb4baba8da8f8713a014360643f78aa30686f8c9785127b04e',
        },
        lava: {
          cellCount: 85_088,
          coordinateSetSha256:
            '6b414c16d0e5965d2c22c899a1fe2523de39f4564d775433745b983ba313ec18',
        },
        frozen: {
          cellCount: 182_791,
          coordinateSetSha256:
            'c230a0ed3582c466736101c7c209dda071070645a2c81381408a8a3bc496a071',
        },
        snow: {
          cellCount: 359_830,
          coordinateSetSha256:
            '0a0af937ba1634ace4d925341465dfa1b1f0a017332744341f9a2cb1a25f4c9b',
        },
      },
    });
    expect(facts.d8SurfaceRoutingCandidate.routesToBoundaryColumnCount
      + facts.d8SurfaceRoutingCandidate.routesToInternalSinkColumnCount)
      .toBe(facts.d8SurfaceRoutingCandidate.columnCount);
    expect(facts.d8SurfaceRoutingCandidate.qualification)
      .toMatch(/not rainfall, infiltration, groundwater, snowmelt/);
  });

  it('recommends exact minimum planning exclusions without inventing safety buffers', () => {
    const recommendations = readReport().soleAuthorityRecommendations;
    expect(recommendations.adoptionState).toBe('PROPOSED_NOT_ACCEPTED');
    expect(recommendations.bufferPolicy).toMatchObject({
      id: 'CZ05-RELIC-MINIMUM-PLANNING-EXCLUSION-V1',
      replacesExpertBufferDesign: false,
    });
    expect(recommendations.bufferPolicy.relics.map((relic) => ({
      key: relic.relicKey,
      core: relic.protectedCore.cellCount,
      shell: relic.minimumPlanningExclusionShell.cellCount,
      shellHash: relic.minimumPlanningExclusionShell.coordinateSetSha256,
    }))).toEqual([
      {
        key: 'igloo-east',
        core: 280,
        shell: 350,
        shellHash: '359fbd6462c5554a49f8c293df1f3645626f83dc286cc3dbf6973942090dc3aa',
      },
      {
        key: 'igloo-west',
        core: 280,
        shell: 350,
        shellHash: '1b10c46805ad61b02194d171d8c89a6cbc0d0c9d85eb28dc015ed8ebda196d20',
      },
      {
        key: 'shipwreck',
        core: 2_268,
        shell: 1_362,
        shellHash: '9e9a497cc8cac69eaa7ea9a173a953610a33638ec51ca2783f98e7ace3f21874',
      },
    ]);
    for (const relic of recommendations.bufferPolicy.relics) {
      expect(relic.minimumPlanningExclusionShell.positiveMarginBlocks).toBe(1);
      expect(relic.engineeringQualification).toMatch(/not a structural/);
      expect(relic).toMatchObject({
        reconstructionAuthorized: false,
        relocationAuthorized: false,
        removalAuthorized: false,
        observationAccessAuthorized: false,
      });
    }
    expect(recommendations.eastIglooDisposition).toEqual(expect.objectContaining({
      recommendation: 'RESERVE_RECORDED_SITE_WITHOUT_RECONSTRUCTION_OR_EXHIBIT_CLAIM',
      constructionAuthorized: false,
    }));
  });

  it('defines fail-closed ownership, future-state, and no-diversion defaults', () => {
    const recommendations = readReport().soleAuthorityRecommendations;
    expect(recommendations.logicalOwnershipAndInterfaces.owners.map((owner) => owner.ownerId))
      .toEqual([
        'CZ05-PROTECTED-RELIC-CONTROL',
        'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
        'CZ05-SCOPE-CONSTRUCTION-CONTROL',
      ]);
    expect(recommendations.logicalOwnershipAndInterfaces.exactCellOwnershipFrozen).toBe(false);
    expect(recommendations.logicalOwnershipAndInterfaces.interfaceRules.join(' '))
      .toMatch(/at most one canonical owner/);
    expect(recommendations.futureTerrainAndInfluenceModel).toMatchObject({
      modelId: 'CZ05-FUTURE-MOUNTAIN-STATE-V1',
      exactModelAvailable: false,
    });
    expect(recommendations.futureTerrainAndInfluenceModel.requiredExactSetFamilies)
      .toHaveLength(12);
    expect(recommendations.preservationAndNoDiversionCriteria).toMatchObject({
      recommendation: 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
      allowsNarrativeWaiver: false,
    });
    expect(recommendations.preservationAndNoDiversionCriteria.preR00DesignCriteria.join(' '))
      .toMatch(/changes zero current water/);
  });

  it('keeps surveys explicit and every release/design gate closed', () => {
    const report = readReport();
    expect(report.remainingReadOnlySurveyAndDesignEvidence.map((item) => item.classification))
      .toEqual([
        'READ_ONLY_SURVEY',
        'DEPENDENT_OFFLINE_DESIGN',
        'EXPERT_DESIGN_ACCEPTANCE',
        'DEPENDENT_OFFLINE_AUDIT',
      ]);
    expect(report.remainingReadOnlySurveyAndDesignEvidence.every(
      (item) => item.canBeDerivedFromCurrentBoundedCensus === false,
    )).toBe(true);
    expect(report.evidenceBoundary).toEqual({
      d05Resolved: false,
      g02Passed: false,
      g06Passed: false,
      g07Passed: false,
      ownerAcceptanceRecorded: false,
      expertAcceptanceRecorded: false,
      exactFutureInfluenceCellsAvailable: false,
      exactConstructionCellsAvailable: false,
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
    });
  });
});
