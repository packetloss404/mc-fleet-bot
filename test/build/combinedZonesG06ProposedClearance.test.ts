import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const AUDITOR = path.join(ROOT, 'scripts/audit_combined_zones_g06_proposed_clearance.mjs');
const TEST_TIMEOUT_MS = 120_000;

type JsonRecord = Record<string, any>;

function audit(directory: string, suffix: string) {
  const output = path.join(directory, `g06-${suffix}.json`);
  const markdown = path.join(directory, `g06-${suffix}.md`);
  execFileSync('node', [
    AUDITOR,
    '--generated-at', '2026-08-05T07:00:00Z',
    '--out', output,
    '--markdown', markdown,
  ], { cwd: ROOT, stdio: 'pipe' });
  return {
    json: JSON.parse(fs.readFileSync(output, 'utf8')) as JsonRecord,
    jsonText: fs.readFileSync(output, 'utf8'),
    markdown: fs.readFileSync(markdown, 'utf8'),
  };
}

const EXPECTED_DOMAIN_IDS = [
  'P1-B03/construction',
  'P1-B03/interaction',
  'P1-B03/influence',
  'P1-B07/construction',
  'P1-B07/interaction',
  'P1-B07/influence',
  'P1-B08/construction',
  'P1-B08/interaction',
  'P1-B08/influence',
  'P1-B09/construction',
  'P1-B09/interaction',
  'P1-B09/influence',
  'D02/construction',
  'D02/interaction',
  'D02/influence',
  'D06-RESERVATIONS/construction',
  'D06-RESERVATIONS/interaction',
  'D06-RESERVATIONS/influence',
  'D06-MECHANISMS/construction',
  'D06-MECHANISMS/interaction',
  'D06-MECHANISMS/influence',
  'P1-B11/construction',
  'P1-B11/interaction',
  'P1-B11/influence',
  'P1-B12/construction',
  'P1-B12/interaction',
  'P1-B12/influence',
  'P1-B10/construction',
  'P1-B10/interaction',
  'P1-B10/influence',
];

const NEWLY_AUDITED_DOMAIN_IDS = [
  'P1-B03/influence',
  'P1-B08/influence',
  'P1-B09/construction',
  'P1-B09/influence',
  'P1-B10/interaction',
  'P1-B10/influence',
  'P1-B12/influence',
  'P1-B07/influence',
  'D02/interaction',
  'D02/influence',
  'D06-RESERVATIONS/construction',
  'D06-RESERVATIONS/interaction',
  'D06-RESERVATIONS/influence',
  'D06-MECHANISMS/construction',
  'D06-MECHANISMS/influence',
];

describe('combined-zones G06 proposed-set protected-feature clearance', () => {
  it('audits all 30 exact G03-v3 domains without claiming G06 or release authority', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-'));
    const { json: report } = audit(directory, 'primary');

    expect(report.schemaVersion).toBe(3);
    expect(report.status).toBe(
      'PARTIAL_PASS_G03_V3_ALL_30_EXACT_PROPOSAL_DOMAINS_AUDITED_POSITIVE_MARGIN_COMPLETE_SAVE_SUPPORT_ACCEPTANCE_G06_HOLD',
    );
    expect(report.domainSummary.map((domain: JsonRecord) => domain.domainId)).toEqual(
      EXPECTED_DOMAIN_IDS,
    );
    expect(report.generatedStartSubjects).toHaveLength(114);
    expect(report.protectedCoreSubjects).toHaveLength(3);
    expect(report.generatedStartAudits).toHaveLength(30);
    expect(report.protectedCoreAudits).toHaveLength(30);
    expect([...report.g03NonNullDomainIds].sort()).toEqual([...EXPECTED_DOMAIN_IDS].sort());
    expect(report.generatedStartAudits.map((domain: JsonRecord) => domain.domainId)).toEqual(
      EXPECTED_DOMAIN_IDS,
    );
    expect(report.protectedCoreAudits.map((domain: JsonRecord) => domain.domainId)).toEqual(
      EXPECTED_DOMAIN_IDS,
    );
    expect(report.generatedStartAudits.every((domain: JsonRecord) =>
      domain.subjectCount === 114
      && domain.exactZeroSubjectCount + domain.overlapSubjectCount === 114)).toBe(true);
    expect(report.protectedCoreAudits.every((domain: JsonRecord) =>
      domain.subjectCount === 3
      && domain.exactZeroSubjectCount + domain.overlapSubjectCount === 3)).toBe(true);

    expect(report.nullDomainLedger).toEqual([]);
    expect(report.positiveMarginLedger).toHaveLength(3);
    expect(report.positiveMarginLedger.every((record: JsonRecord) =>
      record.status === 'HOLD_NOT_FROZEN'
      && record.clearanceOutsideFrozenCore === 'UNKNOWN_NOT_AUDITABLE')).toBe(true);

    expect(report.gate).toMatchObject({
      result: 'HOLD',
      g06Passed: false,
      exactNonNullG03DomainCount: 30,
      nullUnknownDomainCount: 0,
      generatedStartCount: 114,
      protectedCoreCount: 3,
      generatedStartDomainEvaluationCount: 3420,
      protectedCoreDomainEvaluationCount: 90,
      exactG03GeneratedStartOverlapRecordCount: 1,
      exactG03ProtectedCoreOverlapRecordCount: 1,
      exactG03GeneratedStartOverlapCellCount: 126,
      exactG03ProtectedCoreOverlapCellCount: 126,
      allNonNullG03DomainsExactZeroAgainstGeneratedStarts: false,
      allNonNullG03DomainsExactZeroAgainstFrozenCores: false,
      positiveMarginClearanceEstablished: false,
      completeSaveClearanceEstablished: false,
      allInfluenceDomainsKnown: true,
      allProposalGeometryDomainsKnown: true,
      expertPositiveMarginClearanceEstablished: false,
      allProtectedFeatureContractsAccepted: false,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
      g03CanonicalPayloadSha256:
        '1e4609275a2fd6aed8aa8a3dac00e8bdadae97dc756ca222922ce57a2c9b0712',
    });
    expect(report.convergenceDelta).toMatchObject({
      baseline: {
        exactNonNullG03DomainCount: 15,
        nullUnknownDomainCount: 15,
        generatedStartDomainEvaluationCount: 1710,
        protectedCoreDomainEvaluationCount: 45,
        exactG03GeneratedStartOverlapRecordCount: 0,
        exactG03ProtectedCoreOverlapRecordCount: 0,
      },
      current: {
        exactNonNullG03DomainCount: 30,
        nullUnknownDomainCount: 0,
        generatedStartDomainEvaluationCount: 3420,
        protectedCoreDomainEvaluationCount: 90,
        exactG03GeneratedStartOverlapRecordCount: 1,
        exactG03ProtectedCoreOverlapRecordCount: 1,
      },
      change: {
        exactNonNullG03DomainCount: 15,
        nullUnknownDomainCount: -15,
        generatedStartDomainEvaluationCount: 1710,
        protectedCoreDomainEvaluationCount: 45,
        exactG03GeneratedStartOverlapRecordCount: 1,
        exactG03ProtectedCoreOverlapRecordCount: 1,
      },
      newlyAuditedDomainIds: NEWLY_AUDITED_DOMAIN_IDS,
    });

    const domains = new Map(report.domainSummary.map((domain: JsonRecord) => [
      domain.domainId,
      domain,
    ]));
    expect(domains.get('P1-B03/influence')).toMatchObject({
      sourceCellCount: 55216,
      sourceCoordinateSetSha256:
        'a8879f11717f7be8c33bd1fc7cdcaf8ab5278b501e18a83bebfc678b01ba1ac6',
    });
    expect(domains.get('D02/influence')).toMatchObject({
      sourceCellCount: 456,
      sourceCoordinateSetSha256:
        'f870407859b79aa6048b8c6d4411b5a58cdf2444e20858c04b7c5aa8ab98563f',
    });
    expect(domains.get('D06-RESERVATIONS/construction')).toMatchObject({
      sourceCellCount: 19836,
      sourceCoordinateSetSha256:
        '98fbedb97343de4217a7e206287e23374761a6c404b9571f9d5abda03d955e8a',
    });
    expect(domains.get('D06-MECHANISMS/construction')).toMatchObject({
      sourceCellCount: 9065,
      sourceCoordinateSetSha256:
        '3d389f1d42a9a7261010e29e3f64ed130d46bdefdff5fb325dc9cebdb2bec436',
    });
    expect(domains.get('P1-B10/interaction')).toMatchObject({
      sourceCellCount: 433549,
      sourceIntervalManifestSha256:
        '9dcae3deeefc09f563a47955dd7d3fba75eac8e8ca74f44ab26b24d3a4535ba8',
    });
    expect(domains.get('P1-B10/influence')).toMatchObject({
      sourceCellCount: 1082149,
      sourceIntervalManifestSha256:
        '1a209dbae3552c0b49a7972f22c4838a30e09c8391bce8d20979a1b4f542447d',
    });
    expect(report.ownershipContext).toMatchObject({
      acceptedOwnerRecordCount: 0,
      acceptedInterfaceContractCount: 0,
      separatelyAuthorizedProtectedFeatureContractCount: 0,
    });
    expect(report.completeSaveContext).toMatchObject({
      status: 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
      clearanceEstablished: false,
    });
    expect(report.safetyBoundary.operationCellCount).toBe(0);
    expect(report.safetyBoundary.worldEditAuthorized).toBe(false);
  }, TEST_TIMEOUT_MS);

  it('discloses the exact shipwreck overlap in both G03 influence and support evidence', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-support-'));
    const { json: report, markdown } = audit(directory, 'support');
    const generatedOverlaps = report.supportEvidenceAudit.generatedStarts.records
      .filter((record: JsonRecord) => record.intersection.cellCount > 0);
    const coreOverlaps = report.supportEvidenceAudit.protectedCores.records
      .filter((record: JsonRecord) => record.intersection.cellCount > 0);

    expect(report.exactOverlapSummary.g03GeneratedStartOverlaps).toHaveLength(1);
    expect(report.exactOverlapSummary.g03GeneratedStartOverlaps[0]).toMatchObject({
      domainId: 'P1-B10/influence',
      subjectId: 'GS-037',
      structureId: 'minecraft:shipwreck',
      result: 'OVERLAP_DISCLOSED_HOLD',
      intersection: {
        cellCount: 126,
        coordinateSetSha256:
          '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
      },
    });
    expect(report.exactOverlapSummary.g03ProtectedCoreOverlaps).toHaveLength(1);
    expect(report.exactOverlapSummary.g03ProtectedCoreOverlaps[0]).toMatchObject({
      domainId: 'P1-B10/influence',
      subjectId: 'CORE-shipwreck',
      intersection: { cellCount: 126 },
    });

    expect(generatedOverlaps).toHaveLength(1);
    expect(generatedOverlaps[0]).toMatchObject({
      subjectId: 'GS-037',
      sourceIndex: 37,
      structureId: 'minecraft:shipwreck',
      result: 'OVERLAP_DISCLOSED_HOLD',
      intersection: {
        cellCount: 126,
        bounds: {
          minX: 2072,
          maxX: 2099,
          minY: 69,
          maxY: 71,
          minZ: -661,
          maxZ: -653,
        },
        coordinateSetSha256:
          '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
      },
      separatelyAuthorizedContract: null,
    });
    expect(coreOverlaps).toHaveLength(1);
    expect(coreOverlaps[0]).toMatchObject({
      subjectId: 'CORE-shipwreck',
      relicKey: 'shipwreck',
      structureId: 'minecraft:shipwreck',
      intersection: {
        cellCount: 126,
        coordinateSetSha256:
          '77350225547fce64783a9d3d3d8953631b847a733e9bc060211c13b952df0e98',
      },
    });
    expect(report.supportEvidenceAudit.classification).toBe(
      'EXACT_UNRESOLVED_SUPPORT_EVIDENCE_NOT_A_G03_CONSTRUCTION_INTERACTION_OR_INFLUENCE_DOMAIN',
    );
    expect(report.gate.supportEvidenceGeneratedStartOverlapRecordCount).toBe(1);
    expect(report.gate.supportEvidenceProtectedCoreOverlapRecordCount).toBe(1);
    expect(report.gate.supportEvidenceGeneratedStartOverlapCellCount).toBe(126);
    expect(report.gate.supportEvidenceProtectedCoreOverlapCellCount).toBe(126);
    expect(markdown).toContain('G06 result: **HOLD**');
    expect(markdown).toContain('## G03 v2 to v3 convergence');
    expect(markdown).toContain('| GENERATED_START | GS-037 | minecraft:shipwreck |');
    expect(markdown).toContain('actual commissioning results are post-build G17/G19 evidence');
    expect(markdown).toContain('World edits: **not authorized**');
  }, TEST_TIMEOUT_MS);

  it('is byte-deterministic for a fixed generation time', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-determinism-'));
    const first = audit(directory, 'first');
    const second = audit(directory, 'second');

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
    expect(first.json.auditPayloadSha256).toBe(
      '44f03ae8531544a233c3f4de0af069617f23929477b3e078be2bbc4bd0640c95',
    );
    expect(first.json.reportIdentitySha256).toBe(
      '5ae5d187fb8fd750e4b81cea05461ed9ec71990b27001291e881e03f0f11f2fb',
    );
  }, TEST_TIMEOUT_MS);
});
