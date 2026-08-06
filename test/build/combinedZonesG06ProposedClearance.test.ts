import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const AUDITOR = path.join(ROOT, 'scripts/audit_combined_zones_g06_proposed_clearance.mjs');
const ACCEPTED_COMPLETE_SAVE =
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json';
const COMMITTED_COMPLETE_SAVE_SCOPE = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
);
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

function auditCompleteSaveScope(directory: string) {
  const output = path.join(directory, 'g06-complete-save-scope.json');
  const markdown = path.join(directory, 'g06-complete-save-scope.md');
  execFileSync('node', [
    AUDITOR,
    '--complete-save', ACCEPTED_COMPLETE_SAVE,
    '--generated-at', '2026-08-06T02:57:00Z',
    '--out', output,
    '--markdown', markdown,
  ], { cwd: ROOT, stdio: 'pipe' });
  return {
    json: JSON.parse(fs.readFileSync(output, 'utf8')) as JsonRecord,
    jsonText: fs.readFileSync(output, 'utf8'),
    markdown: fs.readFileSync(markdown, 'utf8'),
  };
}

const auditDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-g06-'));
let defaultAudit: ReturnType<typeof audit>;
let repeatedDefaultAudit: ReturnType<typeof audit>;
let completeSaveScopeAudit: ReturnType<typeof auditCompleteSaveScope>;

beforeAll(() => {
  defaultAudit = audit(auditDirectory, 'default');
  repeatedDefaultAudit = audit(auditDirectory, 'default-repeat');
  completeSaveScopeAudit = auditCompleteSaveScope(auditDirectory);
}, TEST_TIMEOUT_MS);

afterAll(() => {
  fs.rmSync(auditDirectory, { recursive: true, force: true });
});

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
    const { json: report } = defaultAudit;

    expect(report.schemaVersion).toBe(3);
    expect(report.status).toBe(
      'PARTIAL_PASS_G03_V3_ALL_30_EXACT_PROPOSAL_DOMAINS_AUDITED_SHIPWRECK_OWNER_POLICY_RECORDED_TECHNICAL_TREATMENT_G06_HOLD',
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
      unresolvedG03GeneratedStartOverlapRecordCount: 1,
      unresolvedG03ProtectedCoreOverlapRecordCount: 1,
      ownerRemovalPolicyAcknowledgedOverlapRecordCount: 2,
      acceptedTechnicalTreatmentOverlapRecordCount: 0,
      allNonNullG03DomainsExactZeroAgainstGeneratedStarts: false,
      allNonNullG03DomainsExactZeroAgainstFrozenCores: false,
      allNonNullG03DomainOverlapsExactZeroOrSeparatelyAuthorized: false,
      shipwreckPreserveOrRemovePolicyResolved: true,
      exactShipwreckOverlapResolvedByAcceptedTechnicalContract: false,
      acceptedRemovalTechnicalTreatmentContractCount: 0,
      shipwreckPhysicalRemovalPackageAccepted: false,
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
      ownerRemovalPolicyRecordCount: 1,
    });
    expect(report.completeSaveContext).toMatchObject({
      status: 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE',
      clearanceEstablished: false,
    });
    expect(report.safetyBoundary.operationCellCount).toBe(0);
    expect(report.safetyBoundary.acceptedProtectedFeatureContractCount).toBe(0);
    expect(report.safetyBoundary.ownerProtectedFeaturePolicyRecordCount).toBe(1);
    expect(report.safetyBoundary.worldEditAuthorized).toBe(false);
  }, TEST_TIMEOUT_MS);

  it('discloses the exact shipwreck overlap in both G03 influence and support evidence', () => {
    const { json: report, markdown } = defaultAudit;
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
      ownerDispositionAuthorization: {
        acceptedTechnicalTreatmentContract: false,
        evidenceClass:
          'PRESERVE_OR_REMOVE_POLICY_RESOLVED_TECHNICAL_TREATMENT_REMAINS_HOLD',
      },
      separatelyAuthorizedContract: null,
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
      ownerDispositionAuthorization: {
        acceptedTechnicalTreatmentContract: false,
        evidenceClass: 'SUPPORT_TREATMENT_REMAINS_SEPARATE_HOLD',
      },
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
    const first = defaultAudit;
    const second = repeatedDefaultAudit;

    expect(second.jsonText).toBe(first.jsonText);
    expect(second.markdown).toBe(first.markdown);
    expect(first.json.auditPayloadSha256).toBe(
      '501a2369c43611637f9c770c2bddab94d204cd95e8f3052f27d886856b580b3d',
    );
    expect(first.json.reportIdentitySha256).toBe(
      '641afaef6e7416499b99aa75e861ab2502352f6538609b5e51941eb562441afe',
    );
  }, TEST_TIMEOUT_MS);

  it('binds the accepted complete save without rebuilding source-equivalent geometry', () => {
    const { json: report, jsonText, markdown } = completeSaveScopeAudit;

    expect(jsonText).toBe(fs.readFileSync(COMMITTED_COMPLETE_SAVE_SCOPE, 'utf8'));
    expect(report.status).toBe(
      'PARTIAL_PASS_COMPLETE_SAVE_SCOPE_BOUND_TRANSIENT_ENTITIES_DEFERRED_ONE_PERSISTENT_D06_POI_G06_HOLD',
    );
    expect(report.completeSaveContext).toMatchObject({
      status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
      acceptedCompleteSaveCandidateCount: 1,
      completeSaveSha256:
        '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
      projectScopeSourceEquivalent: true,
      generatedStartCensusSourceEquivalent: true,
      entityConflictRecordCount: 43,
      poiConflictRecordCount: 1,
      deferredG13EntityObservationCount: 43,
      persistentPoiTreatmentRequiredCount: 1,
      clearanceEstablished: false,
    });
    expect(report.completeSaveScopeEvidence.regionEquivalence).toMatchObject({
      sourceRegionFileCount: 51,
      capturedRegionFileCount: 51,
      changedRegionFileCount: 5,
      globalChangedChunkCount: 437,
      requiredChunkCount: 6701,
      scopedDifferenceCount: 0,
      projectScopeSourceEquivalent: true,
    });
    expect(report.completeSaveScopeEvidence.inventory).toMatchObject({
      entityRecordCount: 1546,
      poiRecordCount: 321,
    });
    expect(report.completeSaveScopeEvidence.intersections).toMatchObject({
      entityConflictRecordCount: 43,
      entityDomainIntersectionCount: 76,
      poiConflictRecordCount: 1,
      poiDomainIntersectionCount: 6,
      protectedCoreEntityRecordCount: 0,
      protectedCorePoiRecordCount: 1,
    });
    expect(report.completeSaveScopeEvidence.intersections.entityConflictRecords
      .every((record: JsonRecord) => (
        record.entityType === 'minecraft:rabbit'
        || record.entityType === 'minecraft:polar_bear'
      ))).toBe(true);
    expect(report.completeSaveScopeEvidence.intersections.poiConflictRecords[0])
      .toMatchObject({
        poiType: 'minecraft:bee_nest',
        blockPosition: { x: 1849, y: 66, z: 145 },
        sourceStateEvidence: {
          blockState: {
            name: 'minecraft:bee_nest',
            properties: { facing: 'south', honey_level: '0' },
          },
          embeddedOccupantCount: 2,
          linkedExternalEntityCount: 1,
          colonyMemberCount: 3,
          blockEntityPreservationProjection: {
            bukkitMaxEntities: 3,
            components: {},
            id: 'minecraft:beehive',
            keepPacked: 0,
          },
          unmodeledBlockEntityFields: [],
          sourceStateProjectionSha256:
            '1c6b21774842a2cea9825e637da2b47e2d2b10a38078056f073a4d5d39ad0814',
        },
      });
    expect(report.completeSaveScopeEvidence.intersections.poiConflictRecords[0]
      .sourceStateEvidence.blockEntityPreservationProjection.bees).toHaveLength(2);
    expect(report.completeSaveScopeEvidence.findingDisposition).toMatchObject({
      preR00ClassificationEstablished: true,
      deferredToG13EntityObservationCount: 43,
      unclassifiedEntityConflictRecordCount: 0,
      persistentPoiTreatmentRequiredCount: 1,
      preR00UnresolvedFindingCount: 1,
      g13FreshLiveEntityGateStillRequired: true,
      physicalActionAuthorized: false,
      entityRemovalAuthorized: false,
      blockOrPoiEditAuthorized: false,
    });
    expect(report.gate).toMatchObject({
      result: 'HOLD',
      completeSaveEvidenceEstablished: true,
      completeSaveProjectScopeSourceEquivalent: true,
      completeSaveGeneratedStartCensusSourceEquivalent: true,
      completeSaveClearanceEstablished: false,
      completeSaveDeferredG13EntityObservationCount: 43,
      completeSavePersistentPoiTreatmentRequiredCount: 1,
      completeSavePreR00FindingClassificationEstablished: true,
      physicalReleaseAuthorized: false,
      operationGenerationAuthorized: false,
      worldEditAuthorized: false,
    });
    expect(markdown).toContain('## Complete-save scope binding');
    expect(markdown).toContain('source-equivalence check avoids recompiling unchanged geometry');
    expect(markdown).toContain('are not turned into 43 offline relocation tasks');
  }, TEST_TIMEOUT_MS);
});
