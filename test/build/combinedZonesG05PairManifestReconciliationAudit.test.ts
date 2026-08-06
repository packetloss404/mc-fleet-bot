import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/audit_combined_zones_g05_pair_manifest_reconciliation.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g05-pair-manifest-reconciliation-audit.md',
);

interface Audit {
  status: string;
  reportIdentitySha256: string;
  sourceBindings: Record<string, { sha256: string }>;
  registryBinding: {
    canonicalPayloadSha256: string;
    reportIdentitySha256: string;
    registryModified: boolean;
  };
  reconciliation: {
    status: string;
    nullTransitionPairFieldCount: number;
    classifiedRecordCount: number;
    classificationCounts: {
      canonicalAdjacencyAlias: number;
      terminalCap: number;
      sharedBoundary: number;
      precedenceOrReservation: number;
      undefinedEndpoint: number;
    };
    canonicalAlias: {
      aliasContractId: string;
      localCanonicalContractId: string;
      globalCanonicalContractId: string;
      direction: string;
      sourceCapCellCount: number;
      transitionPairCount: number;
      transitionPairManifestSha256: string;
      interfaceCellCount: number;
      interfaceBounds: Record<string, number>;
      interfaceCoordinateSetSha256: string;
      canonicalReferenceOnly: boolean;
      duplicatePhysicalSeamMustNotBeCounted: boolean;
      acceptanceInferred: boolean;
    };
    pairManifestReusedCount: number;
    pairManifestCreatedCount: number;
    pairManifestFabricatedCount: number;
    currentGeometryPairNotApplicableCount: number;
    pairRequirementUndeterminedCount: number;
    records: Array<{
      contractId: string;
      classification: string;
      beforeStateSetSha256: string | null;
      futureStateSetSha256: string | null;
      accepted: boolean;
    }>;
  };
  remainingHold: {
    status: string;
    undefinedEndpointGeometryCount: number;
    beforeStateSetCount: number;
    futureStateSetCount: number;
    acceptedContractCount: number;
    g05Passed: boolean;
    r00Passed: boolean;
  };
  safetyBoundary: Record<string, boolean | number>;
  disposition: {
    canonicalAliasMayBeReferenced: boolean;
    canonicalRegistryMayBeRewrittenByThisAudit: boolean;
    nonAdjacencyPairsMayBeInferred: boolean;
    undefinedEndpointsMayBeInferred: boolean;
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
    'combined-zones-g05-pair-reconciliation-test-',
  ));
  generatedJson = path.join(temporaryDirectory, 'audit.json');
  generatedMarkdown = path.join(temporaryDirectory, 'audit.md');
  execFileSync(
    process.execPath,
    [SCRIPT, '--out', generatedJson, '--markdown', generatedMarkdown],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  audit = JSON.parse(fs.readFileSync(generatedJson, 'utf8')) as Audit;
});

afterAll(() => {
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
});

describe('Combined Zones G05 pair-manifest reconciliation audit', () => {
  it('classifies all 52 null fields exactly once without treating non-pairs as missing', () => {
    expect(audit.status).toBe(
      'PASS_NULL_PAIR_FIELDS_RECONCILED_AND_LAYER_B_CLOSED_BY_ADDITIVE_RECORD',
    );
    expect(audit.reconciliation).toMatchObject({
      status: 'PASS_COMPLETE_ONE_TO_ONE_NULL_FIELD_CLASSIFICATION_NO_MANIFEST_FABRICATION',
      nullTransitionPairFieldCount: 52,
      classifiedRecordCount: 52,
      classificationCounts: {
        canonicalAdjacencyAlias: 1,
        terminalCap: 22,
        sharedBoundary: 10,
        precedenceOrReservation: 6,
        undefinedEndpoint: 13,
      },
      currentGeometryPairNotApplicableCount: 38,
      pairRequirementUndeterminedCount: 13,
    });
    expect(new Set(audit.reconciliation.records.map(({ contractId }) => contractId)).size)
      .toBe(52);
  });

  it('reuses the exact existing D06 35-pair adjacency as an alias only', () => {
    expect(audit.reconciliation.canonicalAlias).toEqual(expect.objectContaining({
      aliasContractId: 'IF-D06-FIRE-SPINE-TO-EG-B',
      localCanonicalContractId: 'IF-D06-ADJ-03',
      globalCanonicalContractId: 'IF-G04-GLOBAL-EXPANDED-ADJ-29',
      direction: 'POSITIVE_X',
      sourceCapCellCount: 35,
      transitionPairCount: 35,
      transitionPairManifestSha256:
        '86fa8755867325fc1bea7e602d3d2eab536c5702a5a24ec111d2cf7907ea7915',
      interfaceCellCount: 70,
      interfaceBounds: {
        minX: 1849,
        maxX: 1850,
        minY: 48,
        maxY: 52,
        minZ: 145,
        maxZ: 151,
      },
      interfaceCoordinateSetSha256:
        '8c1ac38a456840012561068a82d9b92cd3984c5305e7d0d912cf59b858b68502',
      canonicalReferenceOnly: true,
      duplicatePhysicalSeamMustNotBeCounted: true,
      acceptanceInferred: false,
    }));
    expect(audit.reconciliation.pairManifestReusedCount).toBe(1);
    expect(audit.reconciliation.pairManifestCreatedCount).toBe(0);
    expect(audit.reconciliation.pairManifestFabricatedCount).toBe(0);
  });

  it('records the additive Layer B closure while inline registry state stays explicit', () => {
    expect(audit.remainingHold).toMatchObject({
      status: 'CLOSED_BY_ADDITIVE_LAYER_B_CLOSURE_RECORD_CLASSIFICATIONS_REMAIN_EVIDENCE',
      undefinedEndpointGeometryCount: 13,
      beforeStateSetCount: 0,
      futureStateSetCount: 0,
      acceptedContractCount: 0,
      g05Passed: true,
      r00Passed: false,
    });
    expect(audit.reconciliation.records.every((record) => (
      record.beforeStateSetSha256 === null
      && record.futureStateSetSha256 === null
      && record.accepted === false
    ))).toBe(true);
    expect(audit.registryBinding.registryModified).toBe(false);
    expect(audit.disposition).toEqual({
      canonicalAliasMayBeReferenced: true,
      canonicalRegistryMayBeRewrittenByThisAudit: false,
      nonAdjacencyPairsMayBeInferred: false,
      undefinedEndpointsMayBeInferred: false,
      g05Passed: true,
      r00Passed: false,
    });
  });

  it('binds sources, performs no live action, and regenerates byte-for-byte', () => {
    expect(Object.values(audit.sourceBindings).every(
      ({ sha256 }) => /^[a-f0-9]{64}$/.test(sha256),
    )).toBe(true);
    expect(audit.reportIdentitySha256).toMatch(/^[a-f0-9]{64}$/);
    expect(audit.safetyBoundary).toEqual({
      inputFilesReadOnly: true,
      canonicalRegistryModified: false,
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
    expect(fs.readFileSync(generatedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(generatedMarkdown)).toEqual(
      fs.readFileSync(COMMITTED_MARKDOWN),
    );
  });
});
