import crypto from 'crypto';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT,
  'scripts/compile_combined_zones_civil_life_safety_domain_closure.mjs',
);
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-cls-closure-'));
const regeneratedJson = path.join(tempDir, 'closure.json');
const regeneratedMarkdown = path.join(tempDir, 'closure.md');

interface Binding {
  path: string;
  bytes: number;
  sha256: string;
  role: string;
}

interface Domain {
  status: string;
  representation: string;
  derivation: string;
  semantics: string;
  cellCount: number;
  bounds: Record<string, number> | null;
  coordinatePreamble: string;
  coordinateSetSha256: string;
  componentCount: number;
  largestComponentCellCount: number;
  componentSizeMultisetSha256: string;
  sourceIdentities: Record<string, string | number>;
  accepted: boolean;
  acceptedConstructionCellCount: number;
  acceptedInfluenceCellCount: number;
  acceptedMaterialCellCount: number;
  operationCellCount: number;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  sourceBindings: Record<string, Binding>;
  proposalDomains: {
    'P1-B07': { influence: Domain };
    D02: { interaction: Domain; influence: Domain };
    'D06-RESERVATIONS': {
      construction: Domain;
      interaction: Domain;
      influence: Domain;
    };
    'D06-MECHANISMS': { construction: Domain; influence: Domain };
  };
  referenceUnionAudit: {
    exactReferenceCount: number;
    reproducedReferenceCount: number;
    rawMembershipCount: number;
    uniqueInteractionCellCount: number;
    duplicateCoordinateCount: number;
  };
  detailedLayerAudit: {
    layerCount: number;
    rawMembershipCount: number;
    uniqueProposalCellCount: number;
    sourceSetoutManifestSha256: string;
  };
  closureAccounting: {
    requestedDomainCount: number;
    exactSourceLimitedProposalDomainCount: number;
    geometryNullDomainCountAfterThisCompiler: number;
    expertInfluenceKernelAcceptedCount: number;
    acceptedPhysicalSystemCount: number;
    acceptedConstructionCellCount: number;
    acceptedMaterialCellCount: number;
    operationCellCount: number;
    geometricallyClosedDomains: Array<{ scopeId: string; domain: string }>;
  };
  genuineExternalHolds: Array<{
    id: string;
    status: string;
    exactProposalDomain: null;
    requirement: string;
  }>;
  authorityBoundary: Record<string, boolean>;
  safetyBoundary: {
    offlineOnly: boolean;
    liveCallsPerformed: unknown[];
    operations: unknown[];
    operationCellCount: number;
    acceptedConstructionCellCount: number;
    acceptedMaterialCellCount: number;
    acceptedFutureCellCount: number;
    physicalBuildAuthorized: boolean;
    worldEditAuthorized: boolean;
    executable: boolean;
  };
  canonicalPayloadSha256: string;
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
    [SCRIPT, '--out', regeneratedJson, '--markdown', regeneratedMarkdown],
    { cwd: ROOT, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 },
  );
}, 30_000);

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones civil/life-safety proposal-domain closure', () => {
  it('regenerates byte-identically and binds every source by size and SHA-256', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'COMBINED-ZONES-PHASE1-CIVIL-LIFE-SAFETY-DOMAIN-CLOSURE-V1',
      status:
        'PASS_EIGHT_SOURCE_LIMITED_PROPOSAL_DOMAINS_EXACT_ALL_FUNCTIONAL_AND_RELEASE_GATES_HOLD',
      canonicalPayloadSha256:
        '8fb2d3425bcd002fa8e782fae40a5d9eb591e9583535037b5471f009fe103459',
    });
    expect(Object.keys(report.sourceBindings)).toHaveLength(8);
    for (const binding of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, binding.path);
      expect(fs.statSync(filename).size).toBe(binding.bytes);
      expect(sha256File(filename)).toBe(binding.sha256);
      expect(binding.role.length).toBeGreaterThan(20);
    }
  });

  it('closes the requested B07 and whole-D02 geometry domains without inventing a margin', () => {
    const report = readReport();
    expect(report.proposalDomains['P1-B07'].influence).toMatchObject({
      cellCount: 13_608,
      coordinateSetSha256:
        '4a72c3dae60c49e09e7585de17b3475b17f5247a0b75c850ac4303c81581696a',
      componentCount: 1,
      accepted: false,
      acceptedInfluenceCellCount: 0,
      operationCellCount: 0,
    });
    expect(report.proposalDomains.D02.interaction).toMatchObject({
      cellCount: 432,
      coordinateSetSha256:
        'f671e5f2828825e7b1017043f2cfda67bbcfdbc27cad3294bef1810f12e5390d',
      componentCount: 42,
      accepted: false,
    });
    expect(report.proposalDomains.D02.influence).toMatchObject({
      cellCount: 456,
      coordinateSetSha256:
        'b028679e8db88801bff71bc6be20f889aa0fb508a5496a64076040fc1c2c4d78',
      componentCount: 43,
      acceptedInfluenceCellCount: 0,
    });
    expect(report.proposalDomains.D02.influence.semantics)
      .toContain('NOT_HYDRAULIC_STRUCTURAL_OR_GEOTECHNICAL_KERNEL');
  });

  it('reproduces and canonicalizes all 73 D06 reservation references', () => {
    const report = readReport();
    expect(report.referenceUnionAudit).toEqual({
      exactReferenceCount: 73,
      reproducedReferenceCount: 73,
      rawMembershipCount: 41_644,
      uniqueInteractionCellCount: 25_310,
      duplicateCoordinateCount: 16_001,
    });
    expect(report.proposalDomains['D06-RESERVATIONS'].construction).toMatchObject({
      cellCount: 19_836,
      coordinateSetSha256:
        '98fbedb97343de4217a7e206287e23374761a6c404b9571f9d5abda03d955e8a',
      componentCount: 78,
      acceptedConstructionCellCount: 0,
    });
    expect(report.proposalDomains['D06-RESERVATIONS'].interaction).toMatchObject({
      cellCount: 25_310,
      coordinateSetSha256:
        '1576d6833c6b27a3301980ac4605c6e3e084ae1b484f00304abcf130f6e5892a',
    });
    expect(report.proposalDomains['D06-RESERVATIONS'].influence.coordinateSetSha256)
      .toBe(report.proposalDomains['D06-RESERVATIONS'].interaction.coordinateSetSha256);
    expect(report.proposalDomains['D06-RESERVATIONS'].influence.sourceIdentities)
      .toMatchObject({ exactReferenceCount: 73, addedUnevidencedMarginCellCount: 0 });
  });

  it('reproduces all 31 D06 detailed layers as proposal geometry only', () => {
    const report = readReport();
    expect(report.detailedLayerAudit).toEqual({
      layerCount: 31,
      rawMembershipCount: 9_464,
      uniqueProposalCellCount: 9_065,
      sourceSetoutManifestSha256:
        '697a9b522789e557185ec1855e037fe81b3f96af1b93b78eae22d01d38c6ac80',
    });
    expect(report.proposalDomains['D06-MECHANISMS'].construction).toMatchObject({
      cellCount: 9_065,
      coordinateSetSha256:
        '9a5f1af375293b7cb3bfa06f81f9abd940415656b930a64e386bd123fbe44d8e',
      componentCount: 56,
      acceptedConstructionCellCount: 0,
      operationCellCount: 0,
    });
    expect(report.proposalDomains['D06-MECHANISMS'].influence.coordinateSetSha256)
      .toBe(report.proposalDomains['D06-MECHANISMS'].construction.coordinateSetSha256);
    expect(report.proposalDomains['D06-MECHANISMS'].influence.sourceIdentities)
      .toMatchObject({ addedUnevidencedMarginCellCount: 0 });
  });

  it('accounts for eight geometric closures while retaining genuine external holds', () => {
    const report = readReport();
    expect(report.closureAccounting).toMatchObject({
      requestedDomainCount: 8,
      exactSourceLimitedProposalDomainCount: 8,
      geometryNullDomainCountAfterThisCompiler: 0,
      expertInfluenceKernelAcceptedCount: 0,
      acceptedPhysicalSystemCount: 0,
      acceptedConstructionCellCount: 0,
      acceptedMaterialCellCount: 0,
      operationCellCount: 0,
    });
    expect(report.closureAccounting.geometricallyClosedDomains).toEqual([
      { scopeId: 'P1-B07', domain: 'influence' },
      { scopeId: 'D02', domain: 'interaction' },
      { scopeId: 'D02', domain: 'influence' },
      { scopeId: 'D06-RESERVATIONS', domain: 'construction' },
      { scopeId: 'D06-RESERVATIONS', domain: 'interaction' },
      { scopeId: 'D06-RESERVATIONS', domain: 'influence' },
      { scopeId: 'D06-MECHANISMS', domain: 'construction' },
      { scopeId: 'D06-MECHANISMS', domain: 'influence' },
    ]);
    expect(report.genuineExternalHolds).toHaveLength(6);
    expect(report.genuineExternalHolds.every((hold) => (
      hold.status.startsWith('HOLD_') && hold.exactProposalDomain === null
    ))).toBe(true);
    expect(report.genuineExternalHolds.map(({ id }) => id)).toContain(
      'CLS-H01-COMPLETE-SAME-MOMENT-SAVE',
    );
  });

  it('never promotes proposal unions into receivers, functions, acceptance, or operations', () => {
    const report = readReport();
    expect(report.authorityBoundary).toEqual({
      reservationGeometryIsConstructionAcceptance: false,
      sourceLimitedInfluenceReservationIsExpertInfluenceKernel: false,
      receiverInferred: false,
      flowInferred: false,
      powerSourceInferred: false,
      functionalStateInferred: false,
      expertMarginInferred: false,
      technicalAcceptanceClaimed: false,
      ownerAcceptanceClaimed: false,
      commissioningClaimed: false,
    });
    expect(report.safetyBoundary).toEqual({
      offlineOnly: true,
      liveCallsPerformed: [],
      operations: [],
      operationCellCount: 0,
      acceptedConstructionCellCount: 0,
      acceptedMaterialCellCount: 0,
      acceptedFutureCellCount: 0,
      physicalBuildAuthorized: false,
      worldEditAuthorized: false,
      executable: false,
    });
  });
});
