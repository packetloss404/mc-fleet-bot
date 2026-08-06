import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/audit_combined_zones_g05_global_geometry.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.md',
);

interface Audit {
  status: string;
  reportIdentitySha256: string;
  sourceBindings: {
    registry: { sha256: string };
    composite: { sha256: string };
    completeSave: { sha256: string };
    registryCompiler: { sha256: string };
  };
  layerA: {
    status: string;
    passed: boolean;
    baselineCanonicalPayloadSha256: string;
    compositeCanonicalPayloadSha256: string;
    completeSaveSha256: string;
    compositePhysicalCellCount: number;
    compositeCanonicalOwnerCellCount: number;
    compositeUnownedCellCount: number;
    compositeMultiplyOwnedCellCount: number;
    exactDirectionalAdjacencyContractCount: number;
    exactExpandedDirectionalAdjacencyContractCount: number;
    exactSparseB10DirectionalAdjacencyContractCount: number;
    exactDirectionalAdjacencyPairCount: number;
    regeneratedDirectionalAdjacencyPairCount: number;
    oneToOneCoverage: {
      committedContractCount: number;
      observedContractCount: number;
      matchedContractCount: number;
      undeclaredObservedContractCount: number;
      staleCommittedContractCount: number;
      driftedContractCount: number;
      undeclaredObserved: unknown[];
      staleCommitted: unknown[];
      drifted: unknown[];
    };
    overlayChangedCellsIntersectAnotherScope: boolean;
    overlayChangedExistingContractCellSet: boolean;
    finalInterfaceAcceptanceRecorded: boolean;
    g05Passed: boolean;
  };
  layerB: {
    status: string;
    totalContractCount: number;
    physicalGeometryContractCount: number;
    technicalContractCount: number;
    exactTechnicalGeometryCount: number;
    nullTechnicalGeometryCount: number;
    transitionPairManifestCount: number;
    missingTransitionPairManifestCount: number;
    beforeStateSetCount: number;
    missingBeforeStateSetCount: number;
    futureStateSetCount: number;
    missingFutureStateSetCount: number;
    acceptedContractCount: number;
    unacceptedContractCount: number;
    g05Passed: boolean;
  };
  safetyBoundary: {
    liveCallsPerformed: boolean;
    networkCallsPerformed: boolean;
    minecraftConnected: boolean;
    rconConnected: boolean;
    apiCalled: boolean;
    systemdCalled: boolean;
    worldFilesMutated: boolean;
    operationCellCount: number;
    worldEditAuthorized: boolean;
    ownerAcceptanceRecorded: boolean;
    interfaceAcceptanceRecorded: boolean;
    technicalAcceptanceRecorded: boolean;
    releaseAuthorized: boolean;
  };
  disposition: {
    layerAGeometryMayBeReused: boolean;
    layerBMayBeInferredFromLayerA: boolean;
    g05Passed: boolean;
    r00Passed: boolean;
  };
}

let temporaryDirectory: string;
let generatedJson: string;
let generatedMarkdown: string;
let audit: Audit;

beforeAll(() => {
  temporaryDirectory = fs.mkdtempSync(path.join(
    os.tmpdir(),
    'combined-zones-g05-global-geometry-test-',
  ));
  generatedJson = path.join(temporaryDirectory, 'audit.json');
  generatedMarkdown = path.join(temporaryDirectory, 'audit.md');
  execFileSync(
    process.execPath,
    [
      '--max-old-space-size=8192',
      SCRIPT,
      '--out',
      generatedJson,
      '--markdown',
      generatedMarkdown,
    ],
    {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  audit = JSON.parse(fs.readFileSync(generatedJson, 'utf8')) as Audit;
}, 240_000);

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones G05 global geometry audit', () => {
  it('matches all 84 observed and committed directional seam contracts exactly', () => {
    expect(audit.status).toBe(
      'PASS_LAYER_A_GLOBAL_GEOMETRY_AND_LAYER_B_CLOSED_BY_ADDITIVE_RECORD',
    );
    expect(audit.layerA).toMatchObject({
      status: 'PASS_EXACT_COMPOSITE_GLOBAL_PHYSICAL_INTERFACE_GEOMETRY',
      passed: true,
      compositePhysicalCellCount: 15_205_262,
      compositeCanonicalOwnerCellCount: 15_205_262,
      compositeUnownedCellCount: 0,
      compositeMultiplyOwnedCellCount: 0,
      exactDirectionalAdjacencyContractCount: 84,
      exactExpandedDirectionalAdjacencyContractCount: 63,
      exactSparseB10DirectionalAdjacencyContractCount: 21,
      overlayChangedCellsIntersectAnotherScope: false,
      overlayChangedExistingContractCellSet: false,
      finalInterfaceAcceptanceRecorded: true,
      g05Passed: true,
    });
    expect(audit.layerA.exactDirectionalAdjacencyPairCount).toBeGreaterThan(0);
    expect(audit.layerA.regeneratedDirectionalAdjacencyPairCount).toBe(
      audit.layerA.exactDirectionalAdjacencyPairCount,
    );
    expect(audit.layerA.oneToOneCoverage).toEqual({
      committedContractCount: 84,
      observedContractCount: 84,
      matchedContractCount: 84,
      undeclaredObservedContractCount: 0,
      staleCommittedContractCount: 0,
      driftedContractCount: 0,
      undeclaredObserved: [],
      staleCommitted: [],
      drifted: [],
    });
  });

  it('closes Layer B through the additive closure record while the registry census stays explicit', () => {
    expect(audit.layerB).toMatchObject({
      status: 'PASS_CLOSED_BY_ADDITIVE_CLOSURE_RECORD_REGISTRY_UNMODIFIED',
      totalContractCount: 161,
      physicalGeometryContractCount: 84,
      technicalContractCount: 77,
      exactTechnicalGeometryCount: 64,
      nullTechnicalGeometryCount: 13,
      transitionPairManifestCount: 109,
      missingTransitionPairManifestCount: 52,
      beforeStateSetCount: 0,
      missingBeforeStateSetCount: 161,
      futureStateSetCount: 0,
      missingFutureStateSetCount: 161,
      acceptedContractCount: 0,
      unacceptedContractCount: 161,
      g05Passed: true,
    });
    expect(audit.layerB.closureRecord).toMatchObject({
      closedContractCount: 161,
      closedNullEndpointCount: 13,
      acceptedContractCount: 161,
      acceptedBy: 'SOLE_OWNER_EXT_04_INTEGRATED_RECORD',
    });
    expect(audit.disposition).toEqual({
      layerAGeometryMayBeReused: true,
      layerBMayBeInferredFromLayerA: false,
      layerBClosedByAdditiveRecord: true,
      g05Passed: true,
      r00Passed: false,
    });
  });

  it('binds the accepted immutable save and performs no live or physical action', () => {
    expect(audit.layerA.completeSaveSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.layerA.compositeCanonicalPayloadSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.values(audit.sourceBindings).every(
      ({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256),
    )).toBe(true);
    expect(audit.safetyBoundary).toEqual({
      liveCallsPerformed: false,
      networkCallsPerformed: false,
      minecraftConnected: false,
      rconConnected: false,
      apiCalled: false,
      systemdCalled: false,
      worldFilesMutated: false,
      operationCellCount: 0,
      worldEditAuthorized: false,
      ownerAcceptanceRecorded: false,
      interfaceAcceptanceRecorded: false,
      technicalAcceptanceRecorded: false,
      releaseAuthorized: false,
    });
  });

  it('regenerates committed JSON and Markdown byte-for-byte', () => {
    expect(fs.readFileSync(generatedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(generatedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
    expect(audit.reportIdentitySha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
