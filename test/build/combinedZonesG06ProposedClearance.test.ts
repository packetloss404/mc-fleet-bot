import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const AUDITOR = path.join(ROOT, 'scripts/audit_combined_zones_g06_proposed_clearance.mjs');

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

describe('combined-zones G06 proposed-set protected-feature clearance', () => {
  it('audits every non-null G03 domain without claiming G06 or release authority', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-'));
    const { json: report } = audit(directory, 'primary');

    expect(report.status).toBe(
      'PARTIAL_PASS_G03_V2_EXACT_NON_NULL_PROPOSALS_AUDITED_NULL_MARGIN_COMPLETE_SAVE_G06_HOLD',
    );
    expect(report.domainSummary.map((domain: JsonRecord) => domain.domainId)).toEqual([
      'P1-B03/construction',
      'P1-B03/interaction',
      'P1-B07/construction',
      'P1-B07/interaction',
      'P1-B08/construction',
      'P1-B08/interaction',
      'P1-B09/interaction',
      'D02/construction',
      'D06-MECHANISMS/interaction',
      'P1-B11/construction',
      'P1-B11/interaction',
      'P1-B11/influence',
      'P1-B12/construction',
      'P1-B12/interaction',
      'P1-B10/construction',
    ]);
    expect(report.generatedStartSubjects).toHaveLength(114);
    expect(report.protectedCoreSubjects).toHaveLength(3);
    expect(report.generatedStartAudits).toHaveLength(15);
    expect(report.protectedCoreAudits).toHaveLength(15);
    expect(report.g03NonNullDomainIds).toHaveLength(15);
    expect([...report.g03NonNullDomainIds].sort()).toEqual(
      report.generatedStartAudits.map((domain: JsonRecord) => domain.domainId).sort(),
    );
    expect(report.generatedStartAudits.every((domain: JsonRecord) =>
      domain.subjectCount === 114 && domain.exactZeroSubjectCount === 114)).toBe(true);
    expect(report.protectedCoreAudits.every((domain: JsonRecord) =>
      domain.subjectCount === 3 && domain.exactZeroSubjectCount === 3)).toBe(true);
    expect(report.exactOverlapSummary).toEqual({
      g03GeneratedStartOverlaps: [],
      g03ProtectedCoreOverlaps: [],
    });

    expect(report.nullDomainLedger).toHaveLength(15);
    expect(report.nullDomainLedger.every((domain: JsonRecord) =>
      domain.clearanceStatus === 'UNKNOWN_NOT_AUDITABLE_NULL_DOMAIN'
      && domain.exactZeroClaimed === false)).toBe(true);
    expect(report.positiveMarginLedger).toHaveLength(3);
    expect(report.positiveMarginLedger.every((record: JsonRecord) =>
      record.status === 'HOLD_NOT_FROZEN'
      && record.clearanceOutsideFrozenCore === 'UNKNOWN_NOT_AUDITABLE')).toBe(true);

    expect(report.gate).toMatchObject({
      result: 'HOLD',
      g06Passed: false,
      exactNonNullG03DomainCount: 15,
      nullUnknownDomainCount: 15,
      generatedStartCount: 114,
      protectedCoreCount: 3,
      generatedStartDomainEvaluationCount: 1710,
      protectedCoreDomainEvaluationCount: 45,
      exactG03GeneratedStartOverlapRecordCount: 0,
      exactG03ProtectedCoreOverlapRecordCount: 0,
      allNonNullG03DomainsExactZeroAgainstGeneratedStarts: true,
      allNonNullG03DomainsExactZeroAgainstFrozenCores: true,
      positiveMarginClearanceEstablished: false,
      completeSaveClearanceEstablished: false,
      allInfluenceDomainsKnown: false,
      allProtectedFeatureContractsAccepted: false,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
      g03CanonicalPayloadSha256:
        '4742c4d09dd490ccf0cfd89a3139f40bb49e6d3fb2e03ce5584c1c666bd25248',
    });
    expect(report.convergenceDelta).toMatchObject({
      baseline: {
        exactNonNullG03DomainCount: 11,
        nullUnknownDomainCount: 19,
        generatedStartDomainEvaluationCount: 1254,
        protectedCoreDomainEvaluationCount: 33,
        exactG03GeneratedStartOverlapRecordCount: 0,
        exactG03ProtectedCoreOverlapRecordCount: 0,
      },
      current: {
        exactNonNullG03DomainCount: 15,
        nullUnknownDomainCount: 15,
        generatedStartDomainEvaluationCount: 1710,
        protectedCoreDomainEvaluationCount: 45,
        exactG03GeneratedStartOverlapRecordCount: 0,
        exactG03ProtectedCoreOverlapRecordCount: 0,
      },
      change: {
        exactNonNullG03DomainCount: 4,
        nullUnknownDomainCount: -4,
        generatedStartDomainEvaluationCount: 456,
        protectedCoreDomainEvaluationCount: 12,
        exactG03GeneratedStartOverlapRecordCount: 0,
        exactG03ProtectedCoreOverlapRecordCount: 0,
      },
      newlyAuditedDomainIds: [
        'D06-MECHANISMS/interaction',
        'P1-B11/construction',
        'P1-B11/interaction',
        'P1-B11/influence',
      ],
    });
    const domains = new Map(report.domainSummary.map((domain: JsonRecord) => [
      domain.domainId,
      domain,
    ]));
    expect(domains.get('D06-MECHANISMS/interaction')).toMatchObject({
      sourceCellCount: 9065,
      sourceCoordinateSetSha256:
        '3d389f1d42a9a7261010e29e3f64ed130d46bdefdff5fb325dc9cebdb2bec436',
    });
    expect(domains.get('P1-B11/construction')).toMatchObject({ sourceCellCount: 2392 });
    expect(domains.get('P1-B11/interaction')).toMatchObject({ sourceCellCount: 11960 });
    expect(domains.get('P1-B11/influence')).toMatchObject({ sourceCellCount: 5980 });
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
  });

  it('discloses the exact shipwreck support-evidence overlap separately from G03 domains', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-support-'));
    const { json: report, markdown } = audit(directory, 'support');
    const generatedOverlaps = report.supportEvidenceAudit.generatedStarts.records
      .filter((record: JsonRecord) => record.intersection.cellCount > 0);
    const coreOverlaps = report.supportEvidenceAudit.protectedCores.records
      .filter((record: JsonRecord) => record.intersection.cellCount > 0);

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
    expect(markdown).toContain('## G03 v1 to v2 convergence');
    expect(markdown).toContain('| GENERATED_START | GS-037 | minecraft:shipwreck |');
    expect(markdown).toContain('World edits: **not authorized**');
  });

  it('is byte-deterministic for a fixed generation time', () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-determinism-'));
    const first = audit(directory, 'first');
    const second = audit(directory, 'second');

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
    expect(first.json.auditPayloadSha256).toBe(
      '0f5b1d41db427fa6a45de5f45d91c6467f6e67309464cdb0d78a7a8f48ee4034',
    );
    expect(first.json.reportIdentitySha256).toBe(
      '574526ca9b9226f9539c6d4a84ae56cf499da6618cc8cc2accebcae892b5d949',
    );
  });
});
