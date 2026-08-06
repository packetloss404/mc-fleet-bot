import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const COMMITTED_JSON = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
);
const COMMITTED_MARKDOWN = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.md',
);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r00-'));
const regeneratedJson = path.join(tempDir, 'audit.json');
const regeneratedMarkdown = path.join(tempDir, 'audit.md');

interface Blocker {
  id: string;
  classification: 'OFFLINE_ACTION' | 'EXTERNAL_EVIDENCE' | 'DEFERRED_G08_G19';
  requirement: string;
  evidencePath: string;
}

interface Report {
  schemaVersion: number;
  id: string;
  status: string;
  executable: boolean;
  worldEditAuthorized: boolean;
  operationCellCount: number;
  sourceBindings: Record<string, { path: string; sha256: string; bytes: number }>;
  sequencingValidation: {
    g02ClosureBoundary: string;
    descendantEvidenceCycleFree: boolean;
    closureChecks: Array<{ scope: string; descendantEvidenceMatches: string[] }>;
    r01ValidationRole: string;
  };
  authorityBindingChecks: Array<{ passed: boolean }>;
  gates: Array<{
    id: string;
    status: 'PASS' | 'HOLD';
    blockers: Blocker[];
  }>;
  deferredEvidence: Blocker[];
  summary: {
    gateCount: number;
    passCount: number;
    holdCount: number;
    r00Ready: boolean;
    blockerCountsByClassification: Record<string, number>;
    delegatedSelectionsValid: boolean;
    ownerDelegatedSelectionCount: number;
    additionalHumanDecisionMakersRequired: boolean;
    remainingGeometryBlockerCount: number;
    copiedSaveCandidatesAudited: number;
    completeCopiedSaveCandidates: number;
    historicalCompleteSaveIntakePassed: boolean;
    completeSaveIntakePassed: boolean;
    acceptedCompleteSaveEvidenceCount: number;
    completeSaveIntakeRegionFileCount: number;
    completeSaveIntakeEntityFileCount: number;
    completeSaveIntakePoiFileCount: number;
    completeSaveIntakeLevelDatPresent: boolean;
    completeSaveSha256: string;
    completeSaveScopeClearanceValid: boolean;
    completeSaveProjectScopeSourceEquivalent: boolean;
    completeSaveGeneratedStartCensusSourceEquivalent: boolean;
    completeSaveEntityConflictRecordCount: number;
    completeSavePoiConflictRecordCount: number;
    completeSaveScopeClearanceEstablished: boolean;
    completeSaveDeferredG13EntityObservationCount: number;
    completeSaveUnclassifiedEntityConflictRecordCount: number;
    completeSavePersistentPoiTreatmentRequiredCount: number;
    completeSavePreR00UnresolvedFindingCount: number;
    d06BeeNestTreatmentValid: boolean;
    d06BeeNestPlanningTreatmentSelected: boolean;
    d06BeeNestSelectedAlternativeId: string;
    d06BeeNestColonyMemberCount: number;
    d06BeeNestDestinationSelected: boolean;
    d06BeeNestTechnicalTreatmentAccepted: boolean;
    d06BeeNestDestinationSurveyValid: boolean;
    d06BeeNestDestinationCandidateSelected: boolean;
    d06BeeNestDestinationCandidate: { x: number; y: number; z: number };
    d06BeeNestDestinationCandidateCount: number;
    d06BeeNestDestinationMinimumDomainBoundsClearance: number;
    d06BeeNestDestinationMinimumPlanningZoneBoundsClearance: number;
    d06BeeNestDestinationNearbyFlowerCount: number;
    d06BeeNestDestinationCellAccepted: boolean;
    d06BeeNestRelocationFixtureValid: boolean;
    d06BeeNestSyntheticStateContractPassed: boolean;
    d06BeeNestCurrentCaptureTransportEligible: boolean;
    d06BeeNestLiveConsolidationRequired: boolean;
    d06BeeNestRuntimeMechanicProven: boolean;
    d06BeeRuntimeCompatibilityValid: boolean;
    d06BeeExactProductionPaperRuntimeBound: boolean;
    d06BeePaperItemSerializationObserved: boolean;
    d06BeeCurrentAutomationClientCompatible: boolean;
    d06BeeBlindFleetDependencyUpgradeRecommended: boolean;
    technicalSourceRefreshValid: boolean;
    technicalSourceRefreshStaleRowPassCount: number;
    technicalSourceRefreshExactScopedDomainCount: number;
    technicalSourceRefreshGeneratedStartEvaluationCount: number;
    technicalSourceRefreshD06PersistentPoiHoldCount: number;
    technicalSourceRefreshCommissioningSpecificationCount: number;
    technicalSourceRefreshCommissioningAcceptedCount: number;
    technicalSourceRefreshExecutedCommissioningResultCount: number;
    d05S01SurveyComplete: boolean;
    b03ExactRouteSelected: boolean;
    b03HorizontalStepCount: number;
    b07ExactRouteSelected: boolean;
    b07SelectedExcavationStructureConflictCellCount: number;
    b07SelectedExcavationWaterCellCount: number;
    b08ExactRouteSelected: boolean;
    b07CenteredBaselineConflictCellCount: number;
    d02AcceptableOutfallCandidateCount: number;
    d02PreferredDrainageCandidateCellCount: number;
    d02HeldLowRunCount: number;
    d02TechnicalPassCount: number;
    d02TechnicalHoldCount: number;
    d02EffectiveTechnicalPassCount: number;
    d02EffectiveTechnicalHoldCount: number;
    d05FutureStateContractPassed: boolean;
    d05FutureStateCellCount: number;
    d05SelectedPlanningAlternativeId: string;
    d05CandidateAddedSolidCellCount: number;
    d05BelowCoordinationSupportGapCellCount: number;
    b09ExactRouteSelected: boolean;
    b10AnalyticSurfaceSelected: boolean;
    d06CappedVentRiserCount: number;
    d06DetailedProposalLayerCount: number;
    d06DetailedCanonicalProposalCellCount: number;
    d02C01TerminalDatumCellCount: number;
    d02C01LoadingPrecedenceWithheldCellCount: number;
    d02C01ProposedTerminalCapCellCount: number;
    ownerReviewBundleReady: boolean;
    ownerReviewBundlePayloadSha256: string;
    ownerReviewBundleAcceptanceRecorded: boolean;
    ownerReviewAcceptanceValid: boolean;
    ownerReviewAcceptanceRecordSha256: string;
    ownerReviewAcceptancePayloadSha256: string;
    d02OwnerPacketReady: boolean;
    d05OwnerPacketReady: boolean;
    d06OwnerPacketReady: boolean;
    p1B11OwnerPacketReady: boolean;
    p1B11PlanningBasisAccepted: boolean;
    p1B11GrandAvenueCenterlinePointCount: number;
    proposedLogicalOwnerCount: number;
    proposedDirectionalInterfaceCount: number;
    proposedNullInterfaceCount: number;
    g05GlobalGeometryValid: boolean;
    g05LayerAPassed: boolean;
    g05PhysicalDirectionalContractCount: number;
    g05PhysicalDirectionalPairCount: number;
    g05TechnicalContractCount: number;
    g05MissingTransitionPairManifestCount: number;
    g05BeforeStateSetCount: number;
    g05FutureStateSetCount: number;
    g05AcceptedContractCount: number;
    shipwreckTreatmentContractValid: boolean;
    shipwreckAttributedRemovalTargetCandidateCellCount: number;
    shipwreckAcceptedRemovalTargetCellCount: number;
    shipwreckCandidateDesiredStateCellCount: number;
    shipwreckAcceptedDesiredStateCellCount: number;
    shipwreckPreservedPackedIceCellCount: number;
    shipwreckPreservedSnowCellCount: number;
    shipwreckUnmaterializedLootChestCount: number;
    shipwreckKnownInventoryContentCount: number;
    shipwreckTreatmentTechnicallyAccepted: boolean;
    shipwreckBestChoiceAnalysisValid: boolean;
    shipwreckCanonicalIntegrationValid: boolean;
    shipwreckCompositeCanonicalPayloadSha256: string;
    shipwreckCompositeGeneratedStartOverlapCellCount: number;
    shipwreckCompositeProtectedCoreOverlapCellCount: number;
    shipwreckActualConflictDomainId: string;
    shipwreckUniqueInfluenceOverlapCellCount: number;
    shipwreckConstructionOverlapCellCount: number;
    shipwreckInteractionOverlapCellCount: number;
    shipwreckBestChoiceRecommendedAlternativeId: string;
    shipwreckBestChoiceWeightedScore: number;
    shipwreckRemovalPathActive: boolean;
    shipwreckExactReshapeGeometryCompiled: boolean;
    shipwreckInfluenceOnlySubtractionRejected: boolean;
    autonomousOfflineWorkMayContinue: boolean;
    autonomousOfflineWorkCanCompleteR00: boolean;
    externalEvidenceStillRequired: boolean;
  };
}

function readReport(filename = COMMITTED_JSON): Report {
  return JSON.parse(fs.readFileSync(filename, 'utf8')) as Report;
}

function sha256(filename: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

beforeAll(() => {
  execFileSync(
    process.execPath,
    [
      'scripts/audit_combined_zones_r00_readiness.mjs',
      '--out', regeneratedJson,
      '--markdown', regeneratedMarkdown,
      '--generated-at', '2026-08-06T21:45:00Z',
    ],
    { cwd: ROOT, stdio: 'pipe' },
  );
});

afterAll(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Combined Zones R00 readiness audit', () => {
  it('regenerates the committed audit byte-for-byte', () => {
    expect(fs.readFileSync(regeneratedJson)).toEqual(fs.readFileSync(COMMITTED_JSON));
    expect(fs.readFileSync(regeneratedMarkdown)).toEqual(fs.readFileSync(COMMITTED_MARKDOWN));
  });

  it('binds every local input to its current SHA-256', () => {
    const report = readReport();
    for (const source of Object.values(report.sourceBindings)) {
      const filename = path.join(ROOT, source.path);
      expect(fs.existsSync(filename), source.path).toBe(true);
      expect(source.sha256, source.path).toBe(sha256(filename));
      expect(source.bytes, source.path).toBe(fs.statSync(filename).size);
    }
    expect(report.authorityBindingChecks.every(({ passed }) => passed)).toBe(true);
  });

  it('evaluates only G01-G07 and reports the completed R00 design freeze', () => {
    const report = readReport();
    expect(report).toMatchObject({
      schemaVersion: 1,
      id: 'combined-zones-phase1-r00-readiness-audit',
      status: 'R00_READY',
      executable: false,
      worldEditAuthorized: false,
      operationCellCount: 0,
      summary: {
        gateCount: 7,
        passCount: 7,
        holdCount: 0,
        r00Ready: true,
        delegatedSelectionsValid: true,
        ownerDelegatedSelectionCount: 20,
        additionalHumanDecisionMakersRequired: false,
        remainingGeometryBlockerCount: 0,
        copiedSaveCandidatesAudited: 56,
        completeCopiedSaveCandidates: 0,
        historicalCompleteSaveIntakePassed: false,
        completeSaveIntakePassed: true,
        acceptedCompleteSaveEvidenceCount: 1,
        completeSaveIntakeRegionFileCount: 51,
        completeSaveIntakeEntityFileCount: 42,
        completeSaveIntakePoiFileCount: 35,
        completeSaveIntakeLevelDatPresent: true,
        completeSaveSha256:
          '1d17c303b975d35cc01e2b46dcc9f6d78a9e4503b578a62c41ccadbd6df43f26',
        completeSaveScopeClearanceValid: true,
        completeSaveProjectScopeSourceEquivalent: true,
        completeSaveGeneratedStartCensusSourceEquivalent: true,
        completeSaveEntityConflictRecordCount: 43,
        completeSavePoiConflictRecordCount: 1,
        completeSaveScopeClearanceEstablished: false,
        completeSaveDeferredG13EntityObservationCount: 43,
        completeSaveUnclassifiedEntityConflictRecordCount: 0,
        completeSavePersistentPoiTreatmentRequiredCount: 1,
        completeSavePreR00UnresolvedFindingCount: 1,
        d06BeeNestTreatmentValid: true,
        d06BeeNestPlanningTreatmentSelected: true,
        d06BeeNestSelectedAlternativeId:
          'D06-BEE-02-HUMANE-INTACT-RELOCATION',
        d06BeeNestColonyMemberCount: 3,
        d06BeeNestDestinationSelected: false,
        d06BeeNestTechnicalTreatmentAccepted: false,
        d06BeeNestDestinationSurveyValid: true,
        d06BeeNestDestinationCandidateSelected: true,
        d06BeeNestDestinationCandidate: { x: 1811, y: 67, z: 378 },
        d06BeeNestDestinationCandidateCount: 921,
        d06BeeNestDestinationMinimumDomainBoundsClearance: 218,
        d06BeeNestDestinationMinimumPlanningZoneBoundsClearance: 78,
        d06BeeNestDestinationNearbyFlowerCount: 16,
        d06BeeNestDestinationCellAccepted: false,
        d06BeeNestRelocationFixtureValid: true,
        d06BeeNestSyntheticStateContractPassed: true,
        d06BeeNestCurrentCaptureTransportEligible: false,
        d06BeeNestLiveConsolidationRequired: true,
        d06BeeNestRuntimeMechanicProven: false,
        d06BeeRuntimeCompatibilityValid: true,
        d06BeeExactProductionPaperRuntimeBound: true,
        d06BeePaperItemSerializationObserved: true,
        d06BeeCurrentAutomationClientCompatible: false,
        d06BeeBlindFleetDependencyUpgradeRecommended: false,
        technicalSourceRefreshValid: true,
        technicalSourceRefreshStaleRowPassCount: 5,
        technicalSourceRefreshExactScopedDomainCount: 15,
        technicalSourceRefreshGeneratedStartEvaluationCount: 1710,
        technicalSourceRefreshD06PersistentPoiHoldCount: 1,
        technicalSourceRefreshCommissioningSpecificationCount: 29,
        technicalSourceRefreshCommissioningAcceptedCount: 0,
        technicalSourceRefreshExecutedCommissioningResultCount: 0,
        d05S01SurveyComplete: true,
        b03ExactRouteSelected: true,
        b03HorizontalStepCount: 800,
        b07ExactRouteSelected: true,
        b07SelectedExcavationStructureConflictCellCount: 0,
        b07SelectedExcavationWaterCellCount: 38,
        b08ExactRouteSelected: true,
        b07CenteredBaselineConflictCellCount: 217,
        d02AcceptableOutfallCandidateCount: 0,
        d02PreferredDrainageCandidateCellCount: 432,
        d02HeldLowRunCount: 1,
        d02TechnicalPassCount: 6,
        d02TechnicalHoldCount: 11,
        d02EffectiveTechnicalPassCount: 7,
        d02EffectiveTechnicalHoldCount: 10,
        d05FutureStateContractPassed: true,
        d05FutureStateCellCount: 0,
        d05SelectedPlanningAlternativeId: 'FM-01-COMPACT-EAST-FACE',
        d05CandidateAddedSolidCellCount: 14768553,
        d05BelowCoordinationSupportGapCellCount: 754224,
        b09ExactRouteSelected: true,
        b10AnalyticSurfaceSelected: true,
        d06CappedVentRiserCount: 4,
        d06DetailedProposalLayerCount: 31,
        d06DetailedCanonicalProposalCellCount: 9065,
        d02C01TerminalDatumCellCount: 7803,
        d02C01LoadingPrecedenceWithheldCellCount: 45,
        d02C01ProposedTerminalCapCellCount: 9,
        ownerReviewBundleReady: true,
        ownerReviewBundleAcceptanceRecorded: true,
        ownerReviewAcceptanceValid: true,
        d02OwnerPacketReady: true,
        d05OwnerPacketReady: true,
        d06OwnerPacketReady: true,
        p1B11OwnerPacketReady: true,
        p1B11PlanningBasisAccepted: true,
        p1B11GrandAvenueCenterlinePointCount: 299,
        proposedLogicalOwnerCount: 27,
        proposedDirectionalInterfaceCount: 161,
        proposedNullInterfaceCount: 13,
        g05GlobalGeometryValid: true,
        g05LayerAPassed: true,
        g05PhysicalDirectionalContractCount: 84,
        g05PhysicalDirectionalPairCount: 352931,
        g05TechnicalContractCount: 77,
        g05MissingTransitionPairManifestCount: 52,
        g05BeforeStateSetCount: 0,
        g05FutureStateSetCount: 0,
        g05AcceptedContractCount: 0,
        shipwreckRemovalPolicyValid: true,
        shipwreckPreserveOrRemoveOwnerChoiceResolved: true,
        shipwreckExactAttributedRemovalTargetCellCount: 0,
        shipwreckTreatmentContractValid: true,
        shipwreckAttributedRemovalTargetCandidateCellCount: 598,
        shipwreckAcceptedRemovalTargetCellCount: 0,
        shipwreckCandidateDesiredStateCellCount: 598,
        shipwreckAcceptedDesiredStateCellCount: 0,
        shipwreckPreservedPackedIceCellCount: 515,
        shipwreckPreservedSnowCellCount: 5,
        shipwreckUnmaterializedLootChestCount: 3,
        shipwreckKnownInventoryContentCount: 0,
        shipwreckTreatmentTechnicallyAccepted: false,
        shipwreckBestChoiceAnalysisValid: true,
        shipwreckCanonicalIntegrationValid: true,
        shipwreckCompositeCanonicalPayloadSha256:
          '94eb21c4d72303bf5122b53b9963d8bf8ae26d9e8e8238e8c8d64f9d6671230f',
        shipwreckCompositeGeneratedStartOverlapCellCount: 0,
        shipwreckCompositeProtectedCoreOverlapCellCount: 0,
        shipwreckActualConflictDomainId: 'P1-B10/influence',
        shipwreckUniqueInfluenceOverlapCellCount: 126,
        shipwreckConstructionOverlapCellCount: 0,
        shipwreckInteractionOverlapCellCount: 0,
        shipwreckBestChoiceRecommendedAlternativeId:
          'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE',
        shipwreckBestChoiceWeightedScore: 94,
        shipwreckRemovalPathActive: false,
        shipwreckExactReshapeGeometryCompiled: true,
        shipwreckReshapeCandidateCount: 12,
        shipwreckReshapeEligibleCandidateCount: 4,
        shipwreckSelectedReshapeId:
          'FM-01-SHIPWRECK-SOUTH-OPEN-TOE-RESHAPE-V1',
        shipwreckSelectedPlanningMarginBlocks: 1,
        shipwreckExpertPositiveMarginAccepted: false,
        shipwreckReshapeNoBuildColumnCount: 2432,
        shipwreckReshapedConstructionCellCount: 14684824,
        shipwreckReshapeLostConstructionCellCount: 83729,
        shipwreckReshapedSupportGapCellCount: 740620,
        shipwreckCorePlusPlanningMarginInfluenceOverlapCellCount: 0,
        shipwreckCanonicalReshapeIntegrationComplete: true,
        shipwreckInfluenceOnlySubtractionRejected: true,
        shipwreckAcceptedTechnicalTreatmentContractCount: 0,
        shipwreckObservedChestCount: 3,
        autonomousOfflineWorkMayContinue: true,
        autonomousOfflineWorkCanCompleteR00: true,
        externalEvidenceStillRequired: false,
        externalAcceptanceRecordValid: true,
        decisionClosureValid: true,
        layerBClosureValid: true,
        g07IntegratedDesignPassed: true,
      },
    });
    expect(report.gates.map(({ id, status }) => [id, status])).toEqual([
      ['G01_AUTHORITY', 'PASS'],
      ['G02_DESIGN_DECISIONS', 'PASS'],
      ['G03_INTEGER_SET_OUT', 'PASS'],
      ['G04_OWNERSHIP', 'PASS'],
      ['G05_INTERFACES', 'PASS'],
      ['G06_PROTECTED_FEATURES', 'PASS'],
      ['G07_CIVIL_HYDROLOGY_STRUCTURE', 'PASS'],
    ]);
    for (const gate of report.gates) {
      expect(gate.blockers, gate.id).toEqual([]);
    }
  });

  it('proves G02 cycle-free and classifies current versus deferred evidence', () => {
    const report = readReport();
    expect(report.sequencingValidation).toMatchObject({
      g02ClosureBoundary: 'PRE_R00_DESIGN_ACCEPTANCE_ONLY',
      descendantEvidenceCycleFree: true,
      r01ValidationRole: 'POST_R00_VALIDATION_NOT_D02_D05_D06_OR_G02_CLOSURE_EVIDENCE',
    });
    expect(report.sequencingValidation.closureChecks.every(
      ({ descendantEvidenceMatches }) => descendantEvidenceMatches.length === 0,
    )).toBe(true);
    expect(report.summary.blockerCountsByClassification).toEqual({
      OFFLINE_ACTION: 0,
      EXTERNAL_EVIDENCE: 0,
      DEFERRED_G08_G19: 2,
    });
    expect(report.deferredEvidence).toHaveLength(2);
    expect(report.deferredEvidence.every(
      ({ classification }) => classification === 'DEFERRED_G08_G19',
    )).toBe(true);
  });

  it('validates the separate acceptance record against the immutable bundle', () => {
    const report = readReport();
    const acceptance = JSON.parse(fs.readFileSync(
      path.join(
        ROOT,
        'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
      ),
      'utf8',
    )) as {
      bundleFileSha256: string;
      bundlePayloadSha256: string;
      acceptanceRecordPayloadSha256: string;
    };
    const bundleSource = report.sourceBindings.ownerReviewBundle;
    expect(acceptance.bundleFileSha256).toBe(bundleSource.sha256);
    expect(acceptance.bundlePayloadSha256).toBe(report.summary.ownerReviewBundlePayloadSha256);
    expect(report.summary.ownerReviewAcceptanceRecordSha256)
      .toBe(report.sourceBindings.ownerReviewAcceptance.sha256);
    expect(report.summary.ownerReviewAcceptancePayloadSha256)
      .toBe(acceptance.acceptanceRecordPayloadSha256);
  });
});
