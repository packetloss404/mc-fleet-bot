import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const COMMITTED_JSON = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-d05-s02-'));
const regeneratedJson = path.join(tempDir, 'contract.json');
const regeneratedMarkdown = path.join(tempDir, 'contract.md');

interface SourceBinding {
  path: string;
  bytes: number;
  sha256: string;
  regionFileCount?: number;
}

interface SetFamily {
  id: string;
  status: string;
  missingDependencyIds: string[];
  influenceRuleId: string;
  compiledSet: {
    emitted: boolean;
    cellCount: number;
    coordinateSetSha256: string | null;
    blockStateSetSha256: string | null;
    ownerManifestSha256: string | null;
  };
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  worldEditAuthorized: boolean;
  constructionOwnershipAuthorized: boolean;
  futureStateAuthorized: boolean;
  operationCellCount: number;
  materialCellCount: number;
  futureCellCount: number;
  constructionCellCount: number;
  sourceBindings: Record<string, SourceBinding>;
  authorityBoundary: {
    permittedInputs: string;
    excludedInputs: string[];
    planningEnvelopeIsMaterial: boolean;
    missingInputRule: string;
  };
  deterministicCompilerContract: {
    coordinateOrder: string;
    canonicalBlockState: string;
    coordinateSetHash: { algorithm: string; preamble: string; record: string };
    blockStateSetHash: { algorithm: string; preamble: string; record: string };
    typedFamilyHash: { algorithm: string; preamble: string; record: string };
    futureModelManifestHash: { algorithm: string; preamble: string; orderedInputs: string[] };
    compilationOrder: string[];
    overlapAndOwnershipRules: string[];
  };
  requiredInputSchemas: {
    ownershipRegistry: { requiredOwnerIds: string[]; rules: string[] };
    interfaceContracts: { requiredFields: string[]; rules: string[] };
    influenceKernelRegistry: { requiredFields: string[]; rules: string[] };
  };
  influenceExpansionRules: Array<{
    id: string;
    appliesTo: string[];
    rule: string;
    requiredInput: string;
  }>;
  dependencyMatrix: Array<{
    id: string;
    status: string;
    classification: string;
  }>;
  setFamilies: SetFamily[];
  d06ReferenceReservations: Array<{
    id: string;
    status: string;
    externalContinuation: {
      cellCount: number;
      coordinateSetSha256: string;
    };
    physicalOpeningAuthorized: boolean;
    mechanismCommissioned: boolean;
  }>;
  readinessChecks: Array<{ id: string; status: string }>;
  readinessDisposition: {
    contractSchemaPassed: boolean;
    inputsReady: boolean;
    readyToCompileFutureState: boolean;
    readyToEmitConstructionCells: boolean;
    readyToResolveD05: boolean;
    passedDependencyCount: number;
    holdDependencyCount: number;
    readyFamilyCount: number;
    holdFamilyCount: number;
    d05Resolved: boolean;
    g02Passed: boolean;
    g03Passed: boolean;
    g04Passed: boolean;
    g05Passed: boolean;
    g06Passed: boolean;
    g07Passed: boolean;
    operationCellCount: number;
    materialCellCount: number;
    futureCellCount: number;
    constructionCellCount: number;
    worldEditAuthorized: boolean;
  };
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
  d06EgressGeometry:
    'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  immutablePhase0PostRegionSnapshot:
    'data/worldsnap-combined-zones-phase0-rerun-post-20260804T021358Z/region',
};

const expectedFamilyIds = [
  'native-solid-retained',
  'excavation-direct',
  'fill-direct',
  'liner-and-retaining-direct',
  'surface-finish-direct',
  'construction-staging-and-access',
  'water-and-lava-direct-interaction',
  'frozen-and-snow-direct-interaction',
  'dewatering-and-sump-influence',
  'drainage-and-discharge-influence',
  'groundwater-infiltration-and-erosion-influence',
  'protected-relic-support-and-access-influence',
];

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256File(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/compile_combined_zones_d05_future_state_contract.mjs',
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

describe('Combined Zones D05-S02 future-state compiler contract', () => {
  it('regenerates byte-identically from only the permitted exact source chain', () => {
    expect(fs.readFileSync(regeneratedJson).equals(fs.readFileSync(COMMITTED_JSON))).toBe(true);
    expect(fs.readFileSync(regeneratedMarkdown).equals(fs.readFileSync(COMMITTED_MARKDOWN)))
      .toBe(true);

    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-d05-future-state-compiler-contract',
      status: 'CONTRACT_PASS_INPUT_READINESS_HOLD_ZERO_FUTURE_CELLS',
    });
    expect(Object.fromEntries(Object.entries(report.sourceBindings)
      .map(([id, source]) => [id, source.path]))).toEqual(expectedSourcePaths);
    for (const [id, source] of Object.entries(report.sourceBindings)) {
      if (source.regionFileCount !== undefined) continue;
      const filename = path.join(ROOT, source.path);
      expect(fs.statSync(filename).size, id).toBe(source.bytes);
      expect(sha256File(filename), id).toBe(source.sha256);
    }
    expect(report.sourceBindings.immutablePhase0PostRegionSnapshot).toMatchObject({
      sha256: '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
      regionFileCount: 51,
      bytes: 290_946_492,
    });
    expect(Object.values(report.sourceBindings).map((source) => source.path))
      .not.toEqual(expect.arrayContaining([
        expect.stringMatching(/autonomous-design-selections/i),
        expect.stringMatching(/r00/i),
      ]));
  });

  it('emits a machine-readable dependency HOLD instead of inventing geometry', () => {
    const report = readReport();
    expect(report.dependencyMatrix.map(({ id, status }) => [id, status])).toEqual([
      ['DEP-SOURCE-CHAIN', 'PASS'],
      ['DEP-IMMUTABLE-SNAPSHOT', 'PASS'],
      ['DEP-D05-BASELINE', 'PASS'],
      ['DEP-D05-S01-RELIC-SURVEY', 'PASS'],
      ['DEP-D06-EGRESS-RESERVATIONS', 'PASS'],
      ['DEP-VERTICAL-ACTIVATION', 'HOLD'],
      ['DEP-MOUNTAIN-SOLID-SURFACE', 'HOLD'],
      ['DEP-MOUNTAIN-ROUTE-GEOMETRY', 'HOLD'],
      ['DEP-D06-MECHANISM-CELL-SETS', 'HOLD'],
      ['DEP-RELIC-POLICY-ACCEPTANCE', 'HOLD'],
      ['DEP-OWNERSHIP-REGISTRY', 'HOLD'],
      ['DEP-INTERFACE-CONTRACTS', 'HOLD'],
      ['DEP-HYDROLOGY-GEOTECHNICAL-CRITERIA', 'HOLD'],
      ['DEP-COMPILER-IMPLEMENTATION', 'HOLD'],
    ]);
    expect(report.authorityBoundary).toMatchObject({
      planningEnvelopeIsMaterial: false,
    });
    expect(report.authorityBoundary.missingInputRule).toMatch(/never infer/);
    expect(report.authorityBoundary.excludedInputs.join(' ')).toMatch(/autonomous.*R00/s);
  });

  it('defines every exact family in canonical order and emits zero cells or hashes', () => {
    const families = readReport().setFamilies;
    expect(families.map((family) => family.id)).toEqual(expectedFamilyIds);
    expect(families.every((family) => family.status === 'HOLD_DEPENDENCIES')).toBe(true);
    expect(families.every((family) => family.missingDependencyIds.length > 0)).toBe(true);
    expect(families.map((family) => family.compiledSet)).toEqual(
      Array.from({ length: 12 }, () => ({
        emitted: false,
        cellCount: 0,
        coordinateSetSha256: null,
        blockStateSetSha256: null,
        ownerManifestSha256: null,
        reason: 'No exact future/construction set is emitted while any required dependency is HOLD.',
      })),
    );
  });

  it('freezes deterministic hash, ownership, interface, and influence contracts', () => {
    const report = readReport();
    const compiler = report.deterministicCompilerContract;
    expect(compiler.coordinateOrder).toBe('numeric x, then y, then z');
    expect([
      compiler.coordinateSetHash,
      compiler.blockStateSetHash,
      compiler.typedFamilyHash,
      compiler.futureModelManifestHash,
    ].every((contract) => contract.algorithm === 'SHA-256')).toBe(true);
    expect(compiler.compilationOrder.at(-1)).toMatch(/emit hashes only when every required input/);
    expect(compiler.overlapAndOwnershipRules.join(' ')).toMatch(/exactly one owner/);

    expect(report.requiredInputSchemas.ownershipRegistry.requiredOwnerIds).toEqual([
      'CZ05-PROTECTED-RELIC-CONTROL',
      'CZ05-MOUNTAIN-HYDROLOGY-CONTROL',
      'CZ05-SCOPE-CONSTRUCTION-CONTROL',
    ]);
    expect(report.requiredInputSchemas.interfaceContracts.requiredFields)
      .toEqual(expect.arrayContaining([
        'direction',
        'interfaceCellSetSha256',
        'transitionPairManifestSha256',
        'receiverId',
        'acceptedBy',
      ]));
    expect(report.requiredInputSchemas.influenceKernelRegistry.rules.join(' '))
      .toMatch(/no inferred radius.*unknown influence is a HOLD/i);

    expect(report.influenceExpansionRules).toHaveLength(8);
    expect(new Set(report.influenceExpansionRules.flatMap((rule) => rule.appliesTo)))
      .toEqual(new Set(expectedFamilyIds));
    expect(report.influenceExpansionRules.every((rule) => rule.requiredInput.length > 0))
      .toBe(true);
    expect(report.influenceExpansionRules.find(
      (rule) => rule.id === 'IR-RELIC-SUPPORT-ACCESS-EXACT',
    )?.rule).toMatch(/never promoted automatically/);
  });

  it('keeps D06 reservations reference-only and all release gates closed', () => {
    const report = readReport();
    expect(report.d06ReferenceReservations.map((item) => ({
      id: item.id,
      status: item.status,
      cellCount: item.externalContinuation.cellCount,
      hash: item.externalContinuation.coordinateSetSha256,
      opening: item.physicalOpeningAuthorized,
      commissioned: item.mechanismCommissioned,
    }))).toEqual([
      {
        id: 'EG-A',
        status: 'REFERENCE_RESERVATION_NOT_CONSTRUCTION_OR_HYDROLOGY_OWNERSHIP',
        cellCount: 1_274,
        hash: 'da0d3c3a2db61ea29efe64b55e13a977cc5c36a8773c1030af8cd91e856b2213',
        opening: false,
        commissioned: false,
      },
      {
        id: 'EG-B',
        status: 'REFERENCE_RESERVATION_NOT_CONSTRUCTION_OR_HYDROLOGY_OWNERSHIP',
        cellCount: 833,
        hash: '8c5e784edcafe9355e0a4986616e5289264112b455e0b280962895a1a036c70a',
        opening: false,
        commissioned: false,
      },
    ]);
    expect(report.readinessChecks.map(({ id, status }) => [id, status])).toEqual([
      ['S02-R01-PERMITTED-SOURCES-BOUND', 'PASS'],
      ['S02-R02-FAMILY-CONTRACT-COMPLETE', 'PASS'],
      ['S02-R03-INFLUENCE-RULES-FAIL-CLOSED', 'PASS'],
      ['S02-R04-GEOMETRY-INPUTS-COMPLETE', 'HOLD'],
      ['S02-R05-OWNERSHIP-INTERFACES-COMPLETE', 'HOLD'],
      ['S02-R06-HYDROLOGY-EXPERT-INPUTS-COMPLETE', 'HOLD'],
      ['S02-R07-ALL-FAMILIES-READY', 'HOLD'],
      ['S02-R08-ZERO-CELL-FAIL-CLOSED', 'PASS'],
    ]);
    expect(report.readinessDisposition).toEqual({
      contractSchemaPassed: true,
      inputsReady: false,
      readyToCompileFutureState: false,
      readyToEmitConstructionCells: false,
      readyToResolveD05: false,
      passedDependencyCount: 5,
      holdDependencyCount: 9,
      readyFamilyCount: 0,
      holdFamilyCount: 12,
      d05Resolved: false,
      g02Passed: false,
      g03Passed: false,
      g04Passed: false,
      g05Passed: false,
      g06Passed: false,
      g07Passed: false,
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
      worldEditAuthorized: false,
    });
    expect(report).toMatchObject({
      worldEditAuthorized: false,
      constructionOwnershipAuthorized: false,
      futureStateAuthorized: false,
      operationCellCount: 0,
      materialCellCount: 0,
      futureCellCount: 0,
      constructionCellCount: 0,
    });
  });
});
