import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-mountain-'));
const regeneratedJson = path.join(tempDir, 'mountain.json');
const regeneratedMarkdown = path.join(tempDir, 'mountain.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
  regionFileCount?: number;
}

interface CellSet {
  cellCount: number;
  coordinateSetSha256: string;
  bounds: Record<string, number> | null;
}

interface B09Candidate {
  face: string;
  throat: { x: number; y: number; z: number; climbZ: number };
  pointCount: number;
  horizontalStepCount: number;
  orderedCenterlineSha256: string;
  curveIndices: number[];
  ascendingStepCount: number;
  levelStepCount: number;
  descendingStepCount: number;
  maximumAbsoluteRisePerHorizontalStep: number;
  everyStepCardinalAndRailBuildable: boolean;
  everyCurveLevel: boolean;
  faceSurfaceClearance: {
    minimumRailMinusDesignSurfaceY: number;
    maximumRailMinusDesignSurfaceY: number;
    qualification: string;
  };
  minimumPlanningAccommodation: CellSet & {
    constructionOwnership: boolean;
    operationAuthorization: boolean;
    derivation: string;
  };
  immutableSourceCensus: CellSet & {
    blockStateSetSha256: string;
    airCellCount: number;
    presentCellCount: number;
    hydrologyAndCryosphereCellCounts: Record<string, number>;
  };
  protectedRelicPlanningExclusionIntersection: CellSet;
  b08PlanningInterfaceIntersection: CellSet;
  d06ExternalContinuationIntersection: CellSet;
}

interface Alternative {
  modelId: string;
  face: string | null;
  formula: {
    id: string;
    designSurfaceY: string;
    directAddedSolidIntervals: string;
    supportGapRule: string;
    extents: Record<string, number>;
  };
  formulaSha256: string;
  directlyModelledColumnCount: number;
  designSurface: {
    minimumY: number;
    maximumY: number;
    columnManifestSha256: string;
  };
  sparseAddedSolidIntervals: {
    status: string;
    raisedColumnCount: number;
    rawAddedSolidCellCount: number;
    candidateAddedSolidCellCount: number;
    protectedRelicWithheldFillCellCount: number;
    b08WithheldFillCellCount: number;
    b09WithheldFillCellCount: number;
    intervalManifestSha256: string;
    canonicalMaterialState: null;
    constructionOwnership: boolean;
    operationAuthorization: boolean;
  };
  belowCoordinationSupportGap: {
    status: string;
    columnCount: number;
    cellCount: number;
    intervalManifestSha256: string;
    treatment: null;
  };
  routeAccommodation: {
    b09Funicular: B09Candidate | { status: string };
  };
  modelIdentitySha256: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  constructionOwnershipAuthorized: boolean;
  futureStateAuthorized: boolean;
  executable: boolean;
  operationCellCount: number;
  materialCellCount: number;
  futureCellCount: number;
  constructionCellCount: number;
  sourceBindings: Record<string, Binding>;
  authorityBoundary: {
    excludedInputs: string[];
    interpretation: string;
  };
  immutableCurrentSurface: {
    bounds: Record<string, number>;
    columnCount: number;
    minimumY: number;
    maximumY: number;
    meanY: number;
    manifestSha256: string;
  };
  deterministicContracts: Record<string, unknown>;
  protectedRelicVoidPolicy: {
    policyId: string;
    status: string;
    union: CellSet;
    relics: Array<{
      relicKey: string;
      protectedCore: CellSet;
      exactOneCellMinimumPlanningExclusion: CellSet & { positiveMarginBlocks: number };
      exactPreserveCurrentStateCellSet: CellSet;
      futureRule: string;
      engineeringQualification: string;
      constructionOwnership: boolean;
      operationAuthorization: boolean;
    }>;
    automaticObservationRoutePromotion: boolean;
    reconstructionAuthorized: boolean;
    relocationAuthorized: boolean;
    removalAuthorized: boolean;
  };
  routeAndEgressBoundary: {
    b08ServiceTunnelInteraction: CellSet & { constructionOwnership: boolean };
    d06ExternalContinuations: Array<{
      id: string;
      cellCount: number;
      coordinateSetSha256: string;
      mountainCoordinationIntersectionCellCount: number;
      physicalOpeningAuthorized: boolean;
      mechanismCommissioned: boolean;
    }>;
  };
  alternatives: Alternative[];
  b09FaceComparison: {
    inheritedImmutableProfiles: Array<{
      face: string;
      orderedSurfaceProfileSha256: string;
      currentSurface: { meanY: number; maximumAdjacentStep: number };
      generatedStructurePlanIntersectionColumnCount: number;
      protectedRelicPlanIntersections: unknown[];
    }>;
    frozenComparisonOrder: string[];
    scores: Array<Record<string, number | string>>;
    recommendedAlternativeId: string | null;
    selectedAlternativeId: string | null;
    recommendationStatus: string;
  };
  readinessChecks: Array<{ id: string; status: string }>;
  disposition: Record<string, boolean | number>;
}

const expectedSourcePaths = {
  coordinateRegistry: 'masterplans/05-combined-zones/site-coordinates.json',
  geometryCoordination: 'masterplans/05-combined-zones/phase1-geometry-coordination.json',
  d05HydrologyBaseline:
    'masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicConditionAccess:
    'masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d05FutureStateContract:
    'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d06EgressGeometry:
    'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  connectorGeometry:
    'masterplans/05-combined-zones/phase1-connector-geometry.json',
  immutablePhase0PostRegionSnapshot:
    'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
};

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function alternative(report: Report, modelId: string): Alternative {
  const result = report.alternatives.find((item) => item.modelId === modelId);
  if (!result) throw new Error(`missing alternative ${modelId}`);
  return result;
}

function b09(item: Alternative): B09Candidate {
  if (!('face' in item.routeAccommodation.b09Funicular)) {
    throw new Error(`${item.modelId} has no B09 candidate`);
  }
  return item.routeAccommodation.b09Funicular;
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      '--max-old-space-size=4096',
      'scripts/compile_combined_zones_d05_future_mountain_alternatives.mjs',
      '--out',
      regeneratedJson,
      '--markdown',
      regeneratedMarkdown,
    ],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 },
  );
}, 60_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones D05/B09/B10 future-mountain alternatives', () => {
  it('regenerates byte-identically from only the permitted acyclic source chain', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-future-mountain-alternatives',
      status:
        'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD',
    });
    expect(Object.fromEntries(Object.entries(report.sourceBindings)
      .map(([id, source]) => [id, source.path]))).toEqual(expectedSourcePaths);
    for (const [id, source] of Object.entries(report.sourceBindings)) {
      if (source.regionFileCount !== undefined) continue;
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size, id).toBe(source.bytes);
      expect(sha256File(filename), id).toBe(source.sha256);
    }
    expect(Object.values(report.sourceBindings).map((source) => source.path))
      .not.toEqual(expect.arrayContaining([
        expect.stringMatching(/autonomous-design-selections/i),
        expect.stringMatching(/r00/i),
      ]));
    expect(report.sourceBindings.immutablePhase0PostRegionSnapshot).toMatchObject({
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
      bytes: 290_946_492,
    });
  });

  it('freezes the exact immutable surface and three deterministic model functions', () => {
    const report = readReport();
    expect(report.immutableCurrentSurface).toMatchObject({
      bounds: { minX: 1648, maxX: 2447, minZ: -1128, maxZ: -529 },
      columnCount: 480_000,
      minimumY: 12,
      maximumY: 125,
      meanY: 71.317346,
      manifestSha256: 'f4ef7ae28ed876c88e6c78832cd43c4b8d4b5a3fd28b305e0e37899ea66d5573',
    });
    expect(report.alternatives.map((item) => ({
      id: item.modelId,
      face: item.face,
      columns: item.directlyModelledColumnCount,
      surface: item.designSurface,
      formula: item.formulaSha256,
    }))).toEqual([
      {
        id: 'FM-00-FULL-ENVELOPE-REFERENCE',
        face: null,
        columns: 480_000,
        surface: {
          minimumY: 71,
          maximumY: 303,
          columnManifestSha256:
            '20f2f7e7339a4f41aba62ea2c94e289c53955d20ef7fc6e98b844982feda822a',
        },
        formula: '4651ac0aa0e05fe8f967339db6c95fff7849c7c335609be792cf3df438cf5dd0',
      },
      {
        id: 'FM-01-COMPACT-EAST-FACE',
        face: 'east',
        columns: 202_501,
        surface: {
          minimumY: 71,
          maximumY: 303,
          columnManifestSha256:
            '18f8a7eab678b862758bdb71733b0b91a5ba31a85bcb6d4920866461a4888f90',
        },
        formula: 'cd8f6d396f477407263aee4984a50766dff0298a046bb1f348a2c6d139cf6cd6',
      },
      {
        id: 'FM-02-COMPACT-WEST-FACE',
        face: 'west',
        columns: 202_501,
        surface: {
          minimumY: 71,
          maximumY: 303,
          columnManifestSha256:
            '1b9a539325f6337ae5362450c6b6ef646ae89f2cbe6b3836a452d70ac1a19b26',
        },
        formula: '02b5c9749ea54e1f94d9a003178e7d39fe9edb4565ebe77176bc56f2686ffc84',
      },
    ]);
    for (const item of report.alternatives) {
      expect(item.formula).toMatchObject({
        id: 'D05-DIRECTIONAL-RATIONAL-PYRAMID-V1',
      });
      expect(item.formula.designSurfaceY).toMatch(/floor/);
      expect(item.formula.directAddedSolidIntervals).toMatch(/currentSurfaceY/);
      expect(item.formula.supportGapRule).toMatch(/held/);
      expect(item.modelIdentitySha256).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it('emits exact sparse planning intervals while withholding support and authority', () => {
    const report = readReport();
    expect(report.alternatives.map((item) => ({
      id: item.modelId,
      raised: item.sparseAddedSolidIntervals.raisedColumnCount,
      raw: item.sparseAddedSolidIntervals.rawAddedSolidCellCount,
      candidate: item.sparseAddedSolidIntervals.candidateAddedSolidCellCount,
      relic: item.sparseAddedSolidIntervals.protectedRelicWithheldFillCellCount,
      b08: item.sparseAddedSolidIntervals.b08WithheldFillCellCount,
      b09: item.sparseAddedSolidIntervals.b09WithheldFillCellCount,
      fillHash: item.sparseAddedSolidIntervals.intervalManifestSha256,
      gapColumns: item.belowCoordinationSupportGap.columnCount,
      gapCells: item.belowCoordinationSupportGap.cellCount,
      gapHash: item.belowCoordinationSupportGap.intervalManifestSha256,
    }))).toEqual([
      {
        id: 'FM-00-FULL-ENVELOPE-REFERENCE',
        raised: 456_572,
        raw: 36_941_342,
        candidate: 35_008_029,
        relic: 1_977,
        b08: 14_952,
        b09: 0,
        fillHash: 'ad4fc691169a3186e611e395cb4dfef5c4e55e25158dfac43b24ae81badcdf54',
        gapColumns: 274_759,
        gapCells: 1_916_384,
        gapHash: 'c445abf78a1426344df0e62491effea3e4051eceed6adfd02957c536b5ed8588',
      },
      {
        id: 'FM-01-COMPACT-EAST-FACE',
        raised: 190_954,
        raw: 15_540_321,
        candidate: 14_768_553,
        relic: 1_977,
        b08: 11_358,
        b09: 4_245,
        fillHash: 'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
        gapColumns: 107_345,
        gapCells: 754_224,
        gapHash: '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      },
      {
        id: 'FM-02-COMPACT-WEST-FACE',
        raised: 198_993,
        raw: 15_702_152,
        candidate: 14_890_017,
        relic: 1_347,
        b08: 11_576,
        b09: 4_245,
        fillHash: 'a7e665c12bf75bcc9f6c5f2684bb67b98d3e4fcae6480290e1e3b1ae5dff4b80',
        gapColumns: 120_446,
        gapCells: 795_507,
        gapHash: '1bba2e34bc677109cb5a7f377cb4aa7c1ba0bac9814d00acba7e29d60c9f05e4',
      },
    ]);
    for (const item of report.alternatives) {
      expect(item.sparseAddedSolidIntervals).toMatchObject({
        status: 'EXACT_UNMATERIALIZED_PLANNING_INTERVALS_NOT_CONSTRUCTION_CELLS',
        canonicalMaterialState: null,
        constructionOwnership: false,
        operationAuthorization: false,
      });
      expect(item.belowCoordinationSupportGap).toMatchObject({
        status: 'HOLD_EXACT_UNSUPPORTED_BELOW_Y72',
        treatment: null,
      });
    }
  });

  it('preserves exact cores plus one-cell minimum exclusions without claiming buffers', () => {
    const policy = readReport().protectedRelicVoidPolicy;
    expect(policy).toMatchObject({
      policyId: 'CZ05-RELIC-MINIMUM-PLANNING-EXCLUSION-V1',
      status: 'EXACT_MINIMUM_PLANNING_EXCLUSIONS_NOT_ENGINEERING_BUFFERS',
      union: {
        cellCount: 4_890,
        coordinateSetSha256:
          '5dcbcaca22ee39ee9309e1fc5139eb3fbff052bb114ae00d20a723c045eab26b',
      },
      automaticObservationRoutePromotion: false,
      reconstructionAuthorized: false,
      relocationAuthorized: false,
      removalAuthorized: false,
    });
    expect(policy.relics.map((relic) => ({
      key: relic.relicKey,
      core: relic.protectedCore.cellCount,
      shell: relic.exactOneCellMinimumPlanningExclusion.cellCount,
      preserve: relic.exactPreserveCurrentStateCellSet.cellCount,
    }))).toEqual([
      { key: 'igloo-east', core: 280, shell: 350, preserve: 630 },
      { key: 'igloo-west', core: 280, shell: 350, preserve: 630 },
      { key: 'shipwreck', core: 2_268, shell: 1_362, preserve: 3_630 },
    ]);
    for (const relic of policy.relics) {
      expect(relic.exactOneCellMinimumPlanningExclusion.positiveMarginBlocks).toBe(1);
      expect(relic.futureRule).toBe('PRESERVE_EXACT_IMMUTABLE_CURRENT_STATE');
      expect(relic.engineeringQualification).toMatch(/not a structural/);
      expect(relic).toMatchObject({
        constructionOwnership: false,
        operationAuthorization: false,
      });
    }
  });

  it('compiles exact surface-following B09 candidates and route/egress interfaces', () => {
    const report = readReport();
    const east = b09(alternative(report, 'FM-01-COMPACT-EAST-FACE'));
    const west = b09(alternative(report, 'FM-02-COMPACT-WEST-FACE'));
    expect([east, west].map((route) => ({
      face: route.face,
      throat: route.throat,
      points: route.pointCount,
      steps: route.horizontalStepCount,
      curves: route.curveIndices,
      ascending: route.ascendingStepCount,
      level: route.levelStepCount,
      descending: route.descendingStepCount,
      clearance: [
        route.faceSurfaceClearance.minimumRailMinusDesignSurfaceY,
        route.faceSurfaceClearance.maximumRailMinusDesignSurfaceY,
      ],
      reservation: route.minimumPlanningAccommodation.cellCount,
      hash: route.minimumPlanningAccommodation.coordinateSetSha256,
      b08: route.b08PlanningInterfaceIntersection.cellCount,
    }))).toEqual([
      {
        face: 'east',
        throat: { x: 2288, y: 130, z: -748, climbZ: -768 },
        points: 561,
        steps: 560,
        curves: [240, 260, 500],
        ascending: 174,
        level: 386,
        descending: 0,
        clearance: [1, 1],
        reservation: 7_800,
        hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
        b08: 36,
      },
      {
        face: 'west',
        throat: { x: 1808, y: 130, z: -748, climbZ: -768 },
        points: 561,
        steps: 560,
        curves: [240, 260, 500],
        ascending: 174,
        level: 386,
        descending: 0,
        clearance: [1, 1],
        reservation: 7_800,
        hash: '79a50f6ed0297d7d8fdd1bb9da9b429f93aabc9fd6985180db0ada4d4200b6e8',
        b08: 540,
      },
    ]);
    for (const route of [east, west]) {
      expect(route).toMatchObject({
        maximumAbsoluteRisePerHorizontalStep: 1,
        everyStepCardinalAndRailBuildable: true,
        everyCurveLevel: true,
        immutableSourceCensus: {
          airCellCount: 7_800,
          presentCellCount: 0,
          hydrologyAndCryosphereCellCounts: {
            water: 0,
            lava: 0,
            frozen: 0,
            snow: 0,
          },
        },
        protectedRelicPlanningExclusionIntersection: { cellCount: 0 },
        d06ExternalContinuationIntersection: { cellCount: 0 },
      });
      expect(route.minimumPlanningAccommodation.derivation).toMatch(/not an engineering/);
      expect(route.minimumPlanningAccommodation).toMatchObject({
        constructionOwnership: false,
        operationAuthorization: false,
      });
    }
    expect(report.routeAndEgressBoundary.b08ServiceTunnelInteraction).toMatchObject({
      cellCount: 15_096,
      coordinateSetSha256:
        'ea3124fc7925dfb77b491c9685dbdad62714276a8a6c88fa3a60b35d20886f8e',
      constructionOwnership: false,
    });
    expect(report.routeAndEgressBoundary.d06ExternalContinuations.map((item) => ({
      id: item.id,
      cells: item.cellCount,
      mountain: item.mountainCoordinationIntersectionCellCount,
      opening: item.physicalOpeningAuthorized,
      commissioned: item.mechanismCommissioned,
    }))).toEqual([
      { id: 'EG-A', cells: 1_274, mountain: 0, opening: false, commissioned: false },
      { id: 'EG-B', cells: 833, mountain: 0, opening: false, commissioned: false },
    ]);
  });

  it('recommends east deterministically but selects nothing and keeps every gate closed', () => {
    const report = readReport();
    expect(report.b09FaceComparison.inheritedImmutableProfiles.map((profile) => ({
      face: profile.face,
      hash: profile.orderedSurfaceProfileSha256,
      mean: profile.currentSurface.meanY,
      step: profile.currentSurface.maximumAdjacentStep,
      structures: profile.generatedStructurePlanIntersectionColumnCount,
      relics: profile.protectedRelicPlanIntersections.length,
    }))).toEqual([
      {
        face: 'east',
        hash: 'f0ffbe80504f90514d239d3eba27aafd2ac854d1b73ac5bb3e86270e0c36bb31',
        mean: 80.357224,
        step: 6,
        structures: 293,
        relics: 0,
      },
      {
        face: 'west',
        hash: 'ee782de56fcc2924801322d7bd1e804435601a9901ebddfda8c37a54149ae76e',
        mean: 72.366629,
        step: 42,
        structures: 305,
        relics: 0,
      },
    ]);
    expect(report.b09FaceComparison.scores).toEqual([
      {
        modelId: 'FM-01-COMPACT-EAST-FACE',
        protectedRouteIntersectionCellCount: 0,
        d06RouteIntersectionCellCount: 0,
        b08PortalInterfaceCellCount: 36,
        supportGapCellCount: 754_224,
        candidateAddedSolidCellCount: 14_768_553,
        routeHydrologyCryosphereCellCount: 0,
        currentFaceMaximumAdjacentStep: 6,
        currentFaceGeneratedStructurePlanColumnCount: 293,
        currentFaceMeanSurfaceY: 80.357224,
      },
      {
        modelId: 'FM-02-COMPACT-WEST-FACE',
        protectedRouteIntersectionCellCount: 0,
        d06RouteIntersectionCellCount: 0,
        b08PortalInterfaceCellCount: 540,
        supportGapCellCount: 795_507,
        candidateAddedSolidCellCount: 14_890_017,
        routeHydrologyCryosphereCellCount: 0,
        currentFaceMaximumAdjacentStep: 42,
        currentFaceGeneratedStructurePlanColumnCount: 305,
        currentFaceMeanSurfaceY: 72.366629,
      },
    ]);
    expect(report.b09FaceComparison).toMatchObject({
      recommendedAlternativeId: 'FM-01-COMPACT-EAST-FACE',
      selectedAlternativeId: null,
      recommendationStatus: 'RECOMMENDED_FOR_NEXT_PLANNING_REVIEW_NOT_ACCEPTED_OR_AUTHORIZED',
    });
    expect(report.readinessChecks.map(({ id, status }) => [id, status])).toEqual([
      ['D05-B09-B10-R01-EXACT-SOURCE-CHAIN', 'PASS'],
      ['D05-B09-B10-R02-DETERMINISTIC-SURFACE-AND-SPARSE-SOLID', 'PASS'],
      ['D05-B09-B10-R03-PROTECTED-RELIC-VOID-ACCOMMODATION', 'PASS'],
      ['D05-B09-B10-R04-B09-RAIL-BUILDABLE-CANDIDATES', 'PASS'],
      ['D05-B09-B10-R05-B08-D06-ACCOMMODATION', 'PASS'],
      ['D05-B09-B10-R06-CONSERVATIVE-PLANNING-RECOMMENDATION',
        'PASS_RECOMMENDATION_ONLY'],
      ['D05-B09-B10-R07-SUPPORT-GEOTECHNICAL-HYDROLOGY', 'HOLD'],
      ['D05-B09-B10-R08-OWNERSHIP-INTERFACES-MATERIAL-STATES', 'HOLD'],
      ['D05-B09-B10-R09-B09-MAINTENANCE-EGRESS-ACCEPTANCE', 'HOLD'],
      ['D05-B09-B10-R10-D05-G02-CLOSURE', 'HOLD'],
    ]);
    expect(report.disposition).toMatchObject({
      exactPlanningAlternativesCompiled: true,
      exactB09FaceCandidatesCompiled: true,
      planningRecommendationAvailable: true,
      recommendationAccepted: false,
      b09Closed: false,
      b10Closed: false,
      d05Resolved: false,
      g02Passed: false,
      futureStateAuthorized: false,
      constructionOwnershipAuthorized: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
    });
    expect(report).toMatchObject({
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      futureStateAuthorized: false,
      executable: false,
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
    });
    expect(report.authorityBoundary.interpretation).toMatch(/not S02 future\/construction cells/);
  });
});
