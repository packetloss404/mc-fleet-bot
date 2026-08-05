import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_residual_surface_connector_domains.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-residual-domains-'));
const regeneratedJson = path.join(tempDir, 'report.json');
const regeneratedMarkdown = path.join(tempDir, 'report.md');

interface ExactSet {
  status: string;
  cellCount: number;
  bounds: Record<string, number>;
  coordinateSetSha256?: string;
  sparseIntervals: {
    columnRecordCount: number;
    intervalCount: number;
    intervalManifestSha256: string;
  };
  accepted: boolean;
  expertPhysicalInfluenceAccepted: boolean;
  constructionOwnershipAccepted: boolean;
  operationAuthorization: boolean;
  [key: string]: unknown;
}

interface Report {
  status: string;
  proposalPayloadSha256: string;
  proposalPayload: {
    g03MigrationBaseline: Record<string, number | string | boolean>;
    proposalSets: Record<string, Record<string, ExactSet>>;
    proposedDomains: Array<{
      scopeId: string;
      domain: string;
      cellCount: number;
      exactSetIdentitySha256: string;
    }>;
    externalTechnicalHolds: Array<{ id: string; status: string; requirement: string }>;
  };
  projectedG03Impact: {
    proposalCompilerMutatesCanonicalG03: boolean;
    migrationBaselineUnresolvedRequiredDomainCount: number;
    exactProposalGeometryDomainCount: number;
    projectedUnresolvedRequiredDomainCountIfConsumedWithoutOtherChanges: number;
    migrationBaselineCanonicalG03Passed: boolean;
  };
  safetyBoundary: Record<string, boolean | number | unknown[]>;
}

function readReport(): Report {
  return JSON.parse(fs.readFileSync(COMMITTED_JSON, 'utf8')) as Report;
}

beforeAll(() => {
  execFileSync(process.execPath, [
    '--max-old-space-size=2048',
    SCRIPT,
    '--generated-at',
    '2026-08-05T07:00:00Z',
    '--out',
    regeneratedJson,
    '--markdown',
    regeneratedMarkdown,
  ], { cwd: ROOT, stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 });
}, 90_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones residual surface and connector domain proposals', () => {
  it('regenerates the source-bound report byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('authors all seven assigned null domains as exact unaccepted proposals', () => {
    const report = readReport();
    expect(report.status).toBe(
      'PASS_SEVEN_EXACT_PROPOSAL_DOMAINS_COMPILED_ALL_TECHNICAL_ACCEPTANCE_AND_RELEASE_GATES_HOLD',
    );
    expect(report.proposalPayload.proposedDomains.map(({ scopeId, domain, cellCount }) => ({
      scopeId,
      domain,
      cellCount,
    }))).toEqual([
      { scopeId: 'P1-B03', domain: 'influence', cellCount: 55216 },
      { scopeId: 'P1-B08', domain: 'influence', cellCount: 24690 },
      { scopeId: 'P1-B09', domain: 'construction', cellCount: 7800 },
      { scopeId: 'P1-B09', domain: 'influence', cellCount: 20430 },
      { scopeId: 'P1-B10', domain: 'interaction', cellCount: 433549 },
      { scopeId: 'P1-B10', domain: 'influence', cellCount: 1082149 },
      { scopeId: 'P1-B12', domain: 'influence', cellCount: 30732 },
    ]);
    expect(report.projectedG03Impact).toEqual({
      proposalCompilerMutatesCanonicalG03: false,
      migrationBaselineUnresolvedRequiredDomainCount: 15,
      exactProposalGeometryDomainCount: 7,
      projectedUnresolvedRequiredDomainCountIfConsumedWithoutOtherChanges: 8,
      exactProposalDomains: [
        { scopeId: 'P1-B03', domain: 'influence' },
        { scopeId: 'P1-B08', domain: 'influence' },
        { scopeId: 'P1-B09', domain: 'construction' },
        { scopeId: 'P1-B09', domain: 'influence' },
        { scopeId: 'P1-B10', domain: 'interaction' },
        { scopeId: 'P1-B10', domain: 'influence' },
        { scopeId: 'P1-B12', domain: 'influence' },
      ],
      migrationBaselineCanonicalG03Passed: false,
      reason: expect.any(String),
    });
  });

  it('binds the exact small-domain coordinate hashes and large B10 interval hashes', () => {
    const report = readReport();
    const sets = report.proposalPayload.proposalSets;
    expect(sets['P1-B03'].influence).toMatchObject({
      coordinateSetSha256: 'a8879f11717f7be8c33bd1fc7cdcaf8ab5278b501e18a83bebfc678b01ba1ac6',
      sparseIntervals: {
        columnRecordCount: 7225,
        intervalManifestSha256:
          '0f71473f651315a78f1d39cb2603f21a93fccc8b07d2c283e7c800fa7dbcddcf',
      },
    });
    expect(sets['P1-B08'].influence.coordinateSetSha256).toBe(
      '3c037ebe9bfffa3ca73cd42a27312b3d96eacf317006db0c9ba36e0c3b9337b2',
    );
    expect(sets['P1-B09'].construction.coordinateSetSha256).toBe(
      'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
    );
    expect(sets['P1-B09'].influence.coordinateSetSha256).toBe(
      'f10bbc071a09b24be7842065b3d5e1486af3b5af15d45733f9be2bce97d017ba',
    );
    expect(sets['P1-B10'].interaction).toMatchObject({
      sparseIntervals: {
        columnRecordCount: 191323,
        intervalCount: 383907,
        intervalManifestSha256:
          '9dcae3deeefc09f563a47955dd7d3fba75eac8e8ca74f44ab26b24d3a4535ba8',
      },
      includedConstructionCellCount: 0,
      sourceConstructionIntervalManifestSha256:
        'ed95837647ab5f13699e93fcc17de691d4da5f08115c4be34734e238b19b4196',
    });
    expect(sets['P1-B10'].influence).toMatchObject({
      sparseIntervals: {
        columnRecordCount: 192024,
        intervalCount: 384655,
        intervalManifestSha256:
          '1a209dbae3552c0b49a7972f22c4838a30e09c8391bce8d20979a1b4f542447d',
      },
      sourceSupportGapIntervalManifestSha256:
        '31664bc00e7a1d361567fb878e8653c2a4018045169d54900ca9ad15bddd7171',
      expertGroundwaterKernel: null,
      expertCryosphereKernel: null,
      acceptedReceiver: null,
      acceptedOutfall: null,
    });
    expect(sets['P1-B12'].influence.coordinateSetSha256).toBe(
      'edc9d6816f8db8d0f96debe9a6c2e2a656e7710cd97a5f0aa86130f978eb30d2',
    );
    expect(report.proposalPayloadSha256).toBe(
      'b16a05525c4d68f3d3499d6db8a85ccd1eec44c89027ea1adca49dfed891af61',
    );
  });

  it('keeps expert acceptance, ownership, materials, operations, and release closed', () => {
    const report = readReport();
    for (const domains of Object.values(report.proposalPayload.proposalSets)) {
      for (const set of Object.values(domains)) {
        expect(set).toMatchObject({
          accepted: false,
          expertPhysicalInfluenceAccepted: false,
          constructionOwnershipAccepted: false,
          operationAuthorization: false,
        });
      }
    }
    expect(report.proposalPayload.externalTechnicalHolds).toHaveLength(6);
    expect(report.proposalPayload.externalTechnicalHolds.every(({ status }) => status === 'HOLD'))
      .toBe(true);
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      immutableCopiedRegionOnly: true,
      liveCallsPerformed: [],
      databasesOpened: [],
      operations: [],
      proposedBlockStatePalette: [],
      acceptedConstructionCellCount: 0,
      acceptedInfluenceCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedFutureCellCount: 0,
      acceptedOwnerAssignmentCount: 0,
      acceptedInterfaceContractCount: 0,
      operationCellCount: 0,
      constructionAuthorized: false,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
      executable: false,
    });
  });
});
