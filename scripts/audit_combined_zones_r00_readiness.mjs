#!/usr/bin/env node
/**
 * Produce a deterministic, read-only R00 readiness audit for Masterplan 05.
 *
 * R00 is the nonphysical Phase 1 design freeze. This audit intentionally
 * evaluates G01-G07 only. It cannot emit operations or authorize a world edit,
 * and it rejects any attempt to use descendant release evidence to close G02.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const GENERATED_AT = value('--generated-at', '2026-08-06T21:45:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-r00-readiness-audit.md',
));

const INPUTS = Object.freeze({
  authorityReconciliation: 'docs/masterplans/04-combined-complex/authority-reconciliation.json',
  coordinateRegistry: 'docs/masterplans/05-combined-zones/site-coordinates.json',
  phase0Evidence: 'docs/masterplans/05-combined-zones/phase0-survey-evidence.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  designDecisions: 'docs/masterplans/05-combined-zones/phase1-design-decisions.json',
  c1CivilDesign: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d02AuthorityPacket: 'docs/masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
  d02RegionEvidence: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  d02HydrologyOutfalls: 'docs/masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
  d02ClosedDrainage: 'docs/masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
  d02TechnicalDesign: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d02C01OwnershipLoadingInterface: 'docs/masterplans/05-combined-zones/phase1-d02-c01-ownership-loading-interface-proposal.json',
  completeSaveIntake: 'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
  acceptedCompleteSaveIntake:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260806T014133Z.json',
  geometryCoordination: 'docs/masterplans/05-combined-zones/phase1-geometry-coordination.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  d05HydrologyRelicDesign: 'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicSurvey: 'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  d05FutureStateContract: 'docs/masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d05FutureMountain: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05SupportMaterialDesign: 'docs/masterplans/05-combined-zones/phase1-d05-support-material-design.json',
  emptyEightGeologyDesign: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d06EgressGeometryDesign: 'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  d06DetailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  d06BeeNestTreatment:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
  d06BeeNestDestinationSurvey:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
  d06BeeNestRelocationFixture:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.json',
  d06BeeRuntimeCompatibility:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-runtime-compatibility-audit.json',
  technicalSourceRefresh:
    'docs/masterplans/05-combined-zones/phase1-technical-source-refresh.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  cheyenneJcurve: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
  autonomousDesignSelections: 'docs/masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
  d02OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  d05OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  d06OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  b11OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-b11-external-interface-acceptance.json',
  b09TechnicalSystem: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  b11SurfaceRoadTechnical: 'docs/masterplans/05-combined-zones/phase1-b11-surface-road-technical-proposal.json',
  b12SubsurfaceAlternatives: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-subsurface-alternatives.json',
  b12PassiveShell: 'docs/masterplans/05-combined-zones/phase1-grand-avenue-passive-shell-candidate.json',
  residualSurfaceConnectorDomains:
    'docs/masterplans/05-combined-zones/phase1-residual-surface-connector-domain-proposals.json',
  civilLifeSafetyDomainClosure:
    'docs/masterplans/05-combined-zones/phase1-civil-life-safety-domain-closure.json',
  proposedOwnershipInterfaces: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  g05GlobalGeometry:
    'docs/masterplans/05-combined-zones/phase1-g05-global-geometry-audit.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  g06ProposedClearance: 'docs/masterplans/05-combined-zones/phase1-g06-proposed-clearance-audit.json',
  g06CompleteSaveScopeClearance:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  shipwreckRemovalAuthorization:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-removal-authorization.json',
  shipwreckTreatmentContract:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-treatment-contract.json',
  shipwreckBestChoiceAnalysis:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.json',
  shipwreckCanonicalIntegration:
    'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  ownerReviewBundle: 'docs/masterplans/05-combined-zones/phase1-owner-review-bundle.json',
  ownerReviewAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  siteGateAudit: 'docs/masterplans/05-combined-zones/phase1-site-gate-audit.json',
  externalAcceptance:
    'docs/masterplans/05-combined-zones/phase1-external-acceptance-submissions.json',
  decisionClosure:
    'docs/masterplans/05-combined-zones/phase1-design-decision-closure.json',
  layerBClosure:
    'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  g07IntegratedDesign:
    'docs/masterplans/05-combined-zones/phase1-g07-integrated-design-audit.json',
});

const DESCENDANT_EVIDENCE_PATTERN = /\b(operations?|source guards?|manifests?|preflights?|live[- ]entity|pilots?|execution|rollbacks?|route[- ]qa|post[- ]state)\b/i;

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
  };
}

function blocker(id, classification, requirement, evidencePath) {
  return { id, classification, requirement, evidencePath };
}

const sources = Object.fromEntries(
  Object.entries(INPUTS).map(([key, relativePath]) => [key, binding(relativePath)]),
);
const contract = readJson(INPUTS.releaseContract);
const decisions = readJson(INPUTS.designDecisions);
const c1 = readJson(INPUTS.c1CivilDesign);
const geometry = readJson(INPUTS.geometryCoordination);
const relics = readJson(INPUTS.protectedRelicClearance);
const d05 = readJson(INPUTS.d05HydrologyRelicDesign);
const d06 = readJson(INPUTS.emptyEightGeologyDesign);
const d02RegionEvidence = readJson(INPUTS.d02RegionEvidence);
const d02HydrologyOutfalls = readJson(INPUTS.d02HydrologyOutfalls);
const d02ClosedDrainage = readJson(INPUTS.d02ClosedDrainage);
const d02TechnicalDesign = readJson(INPUTS.d02TechnicalDesign);
const d02C01OwnershipLoadingInterface = readJson(
  INPUTS.d02C01OwnershipLoadingInterface,
);
const completeSaveIntake = readJson(INPUTS.completeSaveIntake);
const acceptedCompleteSaveIntake = readJson(INPUTS.acceptedCompleteSaveIntake);
const d05RelicSurvey = readJson(INPUTS.d05RelicSurvey);
const d05FutureStateContract = readJson(INPUTS.d05FutureStateContract);
const d05FutureMountain = readJson(INPUTS.d05FutureMountain);
const d05FutureState = readJson(INPUTS.d05FutureState);
const d05SupportMaterialDesign = readJson(INPUTS.d05SupportMaterialDesign);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06DetailedSetout = readJson(INPUTS.d06DetailedSetout);
const d06BeeNestTreatment = readJson(INPUTS.d06BeeNestTreatment);
const d06BeeNestDestinationSurvey = readJson(INPUTS.d06BeeNestDestinationSurvey);
const d06BeeNestRelocationFixture = readJson(
  INPUTS.d06BeeNestRelocationFixture,
);
const d06BeeRuntimeCompatibility = readJson(INPUTS.d06BeeRuntimeCompatibility);
const technicalSourceRefresh = readJson(INPUTS.technicalSourceRefresh);
const connectorGeometry = readJson(INPUTS.connectorGeometry);
const cheyenneJcurve = readJson(INPUTS.cheyenneJcurve);
const delegatedSelections = readJson(INPUTS.autonomousDesignSelections);
const d02OwnerAcceptance = readJson(INPUTS.d02OwnerAcceptance);
const d05OwnerAcceptance = readJson(INPUTS.d05OwnerAcceptance);
const d06OwnerAcceptance = readJson(INPUTS.d06OwnerAcceptance);
const b11OwnerAcceptance = readJson(INPUTS.b11OwnerAcceptance);
const b09TechnicalSystem = readJson(INPUTS.b09TechnicalSystem);
const b11SurfaceRoadTechnical = readJson(INPUTS.b11SurfaceRoadTechnical);
const b12SubsurfaceAlternatives = readJson(INPUTS.b12SubsurfaceAlternatives);
const b12PassiveShell = readJson(INPUTS.b12PassiveShell);
const proposedOwnershipInterfaces = readJson(INPUTS.proposedOwnershipInterfaces);
const g05GlobalGeometry = readJson(INPUTS.g05GlobalGeometry);
const g03CanonicalSetout = readJson(INPUTS.g03CanonicalSetout);
const g06ProposedClearance = readJson(INPUTS.g06ProposedClearance);
const g06CompleteSaveScopeClearance = readJson(INPUTS.g06CompleteSaveScopeClearance);
const shipwreckRemovalAuthorization = readJson(INPUTS.shipwreckRemovalAuthorization);
const shipwreckTreatmentContract = readJson(INPUTS.shipwreckTreatmentContract);
const shipwreckBestChoiceAnalysis = readJson(INPUTS.shipwreckBestChoiceAnalysis);
const shipwreckCanonicalIntegration = readJson(INPUTS.shipwreckCanonicalIntegration);
const ownerReviewBundle = readJson(INPUTS.ownerReviewBundle);
const ownerReviewAcceptance = readJson(INPUTS.ownerReviewAcceptance);
const site = readJson(INPUTS.siteGateAudit);
const externalAcceptance = readJson(INPUTS.externalAcceptance);
const decisionClosure = readJson(INPUTS.decisionClosure);
const layerBClosure = readJson(INPUTS.layerBClosure);
const g07IntegratedDesign = readJson(INPUTS.g07IntegratedDesign);

const acceptedCompleteSaveIntakeValid = acceptedCompleteSaveIntake.status
    === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && acceptedCompleteSaveIntake.summary?.passed === true
  && acceptedCompleteSaveIntake.summary?.captureManifestValid === true
  && acceptedCompleteSaveIntake.summary
    ?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && acceptedCompleteSaveIntake.summary?.entityFileCount > 0
  && acceptedCompleteSaveIntake.summary?.poiFileCount > 0
  && acceptedCompleteSaveIntake.summary?.levelDatPresent === true
  && typeof acceptedCompleteSaveIntake.packageIdentity?.completeSaveSha256 === 'string';
const completeSaveScopeClearanceValid = acceptedCompleteSaveIntakeValid
  && g06CompleteSaveScopeClearance.status
    === 'PARTIAL_PASS_COMPLETE_SAVE_SCOPE_BOUND_TRANSIENT_ENTITIES_DEFERRED_ONE_PERSISTENT_D06_POI_G06_HOLD'
  && g06CompleteSaveScopeClearance.sourceBindings?.completeSave?.sha256
    === sources.acceptedCompleteSaveIntake.sha256
  && g06CompleteSaveScopeClearance.completeSaveContext?.completeSaveSha256
    === acceptedCompleteSaveIntake.packageIdentity?.completeSaveSha256
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.completeSaveEvidenceEstablished === true
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.projectScopeSourceEquivalent === true
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.generatedStartCensusSourceEquivalent === true
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.regionEquivalence?.scopedDifferenceCount === 0
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.findingDisposition?.deferredToG13EntityObservationCount === 43
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.findingDisposition?.unclassifiedEntityConflictRecordCount === 0
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.findingDisposition?.persistentPoiTreatmentRequiredCount === 1
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.findingDisposition?.preR00UnresolvedFindingCount === 1
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.intersections?.poiConflictRecords?.[0]?.sourceStateEvidence
    ?.blockState?.name === 'minecraft:bee_nest'
  && g06CompleteSaveScopeClearance.completeSaveScopeEvidence
    ?.intersections?.poiConflictRecords?.[0]?.sourceStateEvidence
    ?.colonyMemberCount === 3
  && g06CompleteSaveScopeClearance.gate?.physicalReleaseAuthorized === false
  && g06CompleteSaveScopeClearance.gate?.worldEditAuthorized === false;
const d06BeeNestTreatmentValid = d06BeeNestTreatment.status
    === 'PARTIAL_PASS_EXACT_OCCUPIED_NEST_BOUND_HUMANE_INTACT_RELOCATION_SELECTED_TECHNICAL_AND_RELEASE_HOLD'
  && d06BeeNestTreatment.sourceBindings?.completeSaveScope?.sha256
    === sources.g06CompleteSaveScopeClearance.sha256
  && d06BeeNestTreatment.treatmentPayload?.sourceCell?.cellCount === 1
  && d06BeeNestTreatment.treatmentPayload?.sourceState?.colonyMemberCount === 3
  && d06BeeNestTreatment.treatmentPayload?.selectedPlanningAlternativeId
    === 'D06-BEE-02-HUMANE-INTACT-RELOCATION'
  && d06BeeNestTreatment.treatmentPayload?.destinationCellSet === null
  && d06BeeNestTreatment.disposition?.geometryRebuildRequired === false
  && d06BeeNestTreatment.disposition?.technicalTreatmentAccepted === false
  && d06BeeNestTreatment.safetyBoundary?.operationCellCount === 0
  && d06BeeNestTreatment.safetyBoundary?.entityRelocationCount === 0
  && d06BeeNestTreatment.safetyBoundary?.worldEditAuthorized === false;
const d06BeeNestDestinationSurveyValid = d06BeeNestTreatmentValid
  && d06BeeNestDestinationSurvey.status
    === 'PARTIAL_PASS_EXACT_CONFLICT_FREE_DESTINATION_CANDIDATE_SELECTED_OWNERSHIP_HABITAT_METHOD_AND_RELEASE_HOLD'
  && d06BeeNestDestinationSurvey.sourceBindings?.treatment?.sha256
    === sources.d06BeeNestTreatment.sha256
  && d06BeeNestDestinationSurvey.surveyPayload?.passingCandidateCount === 921
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.point?.x === 1811
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.point?.y === 67
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.point?.z === 378
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.minimumDomainBoundsClearance === 218
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.minimumProtectedCoreBoundsClearance === 1063.523389
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.minimumPlanningZoneBoundsClearance === 78
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.insideEastReserve === false
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.biome === 'minecraft:forest'
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.nearbyFlowerCount === 16
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.nearestFlowerDistance === 1
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.intersectedZoneBounds?.length === 0
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.destinationBlockEntityCount === 0
  && d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
    ?.destinationPoiRecordCount === 0
  && d06BeeNestDestinationSurvey.disposition
    ?.destinationPlanningCandidateSelected === true
  && d06BeeNestDestinationSurvey.disposition?.destinationCellAccepted === false
  && d06BeeNestDestinationSurvey.safetyBoundary?.operationCellCount === 0
  && d06BeeNestDestinationSurvey.safetyBoundary?.worldEditAuthorized === false;
const d06BeeNestRelocationFixtureValid = d06BeeNestDestinationSurveyValid
  && d06BeeNestRelocationFixture.status
    === 'PASS_SYNTHETIC_THREE_MEMBER_STATE_ROUNDTRIP_CURRENT_CAPTURE_TRANSPORT_REJECTED_RUNTIME_MECHANIC_HOLD'
  && d06BeeNestRelocationFixture.sourceBindings?.treatment?.sha256
    === sources.d06BeeNestTreatment.sha256
  && d06BeeNestRelocationFixture.sourceBindings?.destinationSurvey?.sha256
    === sources.d06BeeNestDestinationSurvey.sha256
  && d06BeeNestRelocationFixture.sourceBindings?.releaseContract?.sha256
    === sources.releaseContract.sha256
  && d06BeeNestRelocationFixture.fixturePayload?.capturedTransportEligibility
    ?.passed === false
  && d06BeeNestRelocationFixture.fixturePayload?.capturedTransportEligibility
    ?.embeddedOccupantCount === 2
  && d06BeeNestRelocationFixture.fixturePayload?.capturedTransportEligibility
    ?.linkedExternalOccupantCount === 1
  && d06BeeNestRelocationFixture.fixturePayload?.consolidatedTransportEligibility
    ?.passed === true
  && d06BeeNestRelocationFixture.fixturePayload?.consolidatedTransportEligibility
    ?.embeddedOccupantCount === 3
  && d06BeeNestRelocationFixture.fixturePayload?.consolidatedTransportEligibility
    ?.linkedExternalOccupantCount === 0
  && d06BeeNestRelocationFixture.fixturePayload?.destination?.x === 1811
  && d06BeeNestRelocationFixture.fixturePayload?.destination?.y === 67
  && d06BeeNestRelocationFixture.fixturePayload?.destination?.z === 378
  && Object.values(d06BeeNestRelocationFixture.fixturePayload?.checks ?? {})
    .length === 8
  && Object.values(d06BeeNestRelocationFixture.fixturePayload?.checks ?? {})
    .every((passed) => passed === true)
  && d06BeeNestRelocationFixture.fixturePayload?.negativeFixtures?.length === 5
  && d06BeeNestRelocationFixture.fixturePayload?.negativeFixtures
    .every(({ rejected }) => rejected === true)
  && d06BeeNestRelocationFixture.disposition?.syntheticStateContractPassed === true
  && d06BeeNestRelocationFixture.disposition
    ?.currentCapturedStateTransportEligible === false
  && d06BeeNestRelocationFixture.disposition?.liveConsolidationRequired === true
  && d06BeeNestRelocationFixture.disposition?.runtimeMechanicProven === false
  && d06BeeNestRelocationFixture.disposition?.technicalTreatmentAccepted === false
  && d06BeeNestRelocationFixture.disposition?.operationCompilationAuthorized === false
  && d06BeeNestRelocationFixture.safetyBoundary?.operationCellCount === 0
  && d06BeeNestRelocationFixture.safetyBoundary?.entityRelocationCount === 0
  && d06BeeNestRelocationFixture.safetyBoundary?.blockEditCount === 0
  && d06BeeNestRelocationFixture.safetyBoundary?.serverStarted === false
  && d06BeeNestRelocationFixture.safetyBoundary?.liveWorldContacted === false
  && d06BeeNestRelocationFixture.safetyBoundary?.physicalReleaseAuthorized === false
  && d06BeeNestRelocationFixture.safetyBoundary?.entityRelocationAuthorized === false
  && d06BeeNestRelocationFixture.safetyBoundary?.worldEditAuthorized === false
  && d06BeeNestRelocationFixture.safetyBoundary?.executable === false;
const d06BeeRuntimeCompatibilityValid = d06BeeNestRelocationFixtureValid
  && d06BeeRuntimeCompatibility.status
    === 'HOLD_EXACT_PRODUCTION_PAPER_RUNTIME_REACHED_CURRENT_AUTOMATION_CLIENT_INCOMPATIBLE_NO_MECHANIC_PASS'
  && d06BeeRuntimeCompatibility.sourceBindings?.syntheticFixture?.sha256
    === sources.d06BeeNestRelocationFixture.sha256
  && d06BeeRuntimeCompatibility.evidence?.productionRuntime?.paperJarSha256
    === 'cf374f2af9d71dfcc75343f37b722a7abcb091c574131b95e3b13c6fc2cb8fae'
  && d06BeeRuntimeCompatibility.evidence?.attempts?.length === 3
  && d06BeeRuntimeCompatibility.evidence?.attempts?.[1]?.mineflayerVersion
    === '4.37.1'
  && d06BeeRuntimeCompatibility.evidence?.attempts?.[2]
    ?.serverAcknowledgements?.[0]?.sequenceId === 2
  && d06BeeRuntimeCompatibility.conclusion?.paperBeeItemSerializationObserved === true
  && d06BeeRuntimeCompatibility.conclusion?.isolatedRuntimeMechanicProven === false
  && d06BeeRuntimeCompatibility.conclusion?.blindFleetDependencyUpgradeRecommended
    === false
  && d06BeeRuntimeCompatibility.safetyBoundary?.productionBlockEditCount === 0
  && d06BeeRuntimeCompatibility.safetyBoundary?.productionEntityMoveCount === 0
  && d06BeeRuntimeCompatibility.safetyBoundary?.operationCellCount === 0
  && d06BeeRuntimeCompatibility.safetyBoundary?.worldEditAuthorized === false;
const technicalSourceRefreshValid = technicalSourceRefresh.status
    === 'PARTIAL_PASS_FIVE_STALE_SOURCE_ROWS_CLOSED_D06_PERSISTENT_POI_AND_TECHNICAL_ACCEPTANCE_HOLD'
  && technicalSourceRefresh.sourceBindings?.releaseContract?.sha256
    === sources.releaseContract.sha256
  && technicalSourceRefresh.sourceBindings?.completeSave?.sha256
    === sources.acceptedCompleteSaveIntake.sha256
  && technicalSourceRefresh.sourceBindings?.completeSaveScope?.sha256
    === sources.g06CompleteSaveScopeClearance.sha256
  && technicalSourceRefresh.summary?.staleSourceRowPassCount === 5
  && technicalSourceRefresh.summary?.exactScopedDomainCount === 15
  && technicalSourceRefresh.summary
    ?.exactScopedGeneratedStartEvaluationCount === 1710
  && technicalSourceRefresh.summary?.d06CompleteSaveSourceRowPassed === true
  && technicalSourceRefresh.summary?.d06PersistentPoiHoldCount === 1
  && technicalSourceRefresh.summary?.commissioningSpecificationCount === 29
  && technicalSourceRefresh.summary
    ?.commissioningSpecificationAcceptedCount === 0
  && technicalSourceRefresh.summary?.commissioningExecutedResultCount === 0
  && technicalSourceRefresh.commissioningLifecycle?.authoritativeBoundary
    ?.postBuildResultsMayResolveG02 === false
  && technicalSourceRefresh.commissioningLifecycle?.legacyCycleRemoved === true
  && technicalSourceRefresh.summary?.technicalAcceptanceClaimed === false
  && technicalSourceRefresh.safetyBoundary?.operationCellCount === 0
  && technicalSourceRefresh.safetyBoundary?.worldEditAuthorized === false;

const shipwreckRemovalPolicyPayloadSha256 = sha256(
  `combined-zones-shipwreck-removal-authorization-v1\n${JSON.stringify(
    shipwreckRemovalAuthorization.authorizationPayload,
  )}\n`,
);
const shipwreckRemovalPolicyValid = shipwreckRemovalAuthorization.schemaVersion === 1
  && shipwreckRemovalAuthorization.status === 'OWNER_POLICY_APPROVED_RELEASE_NOT_AUTHORIZED'
  && shipwreckRemovalAuthorization.actualApprovalText === '3: Shipwreck can be deleted'
  && shipwreckRemovalAuthorization.authorizationPayloadSha256
    === shipwreckRemovalPolicyPayloadSha256
  && shipwreckRemovalAuthorization.subject?.censusAndAttributionSearchEnvelope
    ?.cellCount === 2268
  && shipwreckRemovalAuthorization.subject?.exactAttributedRemovalTargetCellSet === null
  && shipwreckRemovalAuthorization.subject?.exactRemovalOperationCellSet === null
  && shipwreckRemovalAuthorization.subject?.exactDesiredPostStateCellSet === null
  && shipwreckRemovalAuthorization.effectivePlanningDisposition
    ?.preserveOrRemoveOwnerChoiceResolved === true
  && shipwreckRemovalAuthorization.effectivePlanningDisposition
    ?.exactOverlapMayBeClassifiedAsAcceptedTechnicalTreatment === false
  && shipwreckRemovalAuthorization.effectivePlanningDisposition
    ?.terrainIceSnowAndSupportRemovalAuthorized === false
  && shipwreckRemovalAuthorization.safetyBoundary?.operationCellCount === 0
  && shipwreckRemovalAuthorization.safetyBoundary?.worldEditAuthorized === false;
const shipwreckTreatmentContractValid = shipwreckRemovalPolicyValid
  && shipwreckTreatmentContract.status
    === 'PARTIAL_PASS_EXACT_598_FABRIC_TARGET_CANDIDATE_AND_AIR_MAPPING_THREE_LOOT_CHESTS_UNMATERIALIZED_TECHNICAL_AND_RELEASE_HOLD'
  && shipwreckTreatmentContract.sourceBindings?.acceptedCompleteSaveIntake?.sha256
    === sources.acceptedCompleteSaveIntake.sha256
  && shipwreckTreatmentContract.sourceBindings?.completeSaveScopeClearance?.sha256
    === sources.g06CompleteSaveScopeClearance.sha256
  && shipwreckTreatmentContract.sourceBindings?.removalAuthorization?.sha256
    === sources.shipwreckRemovalAuthorization.sha256
  && shipwreckTreatmentContract.sourceBindings?.protectedRelicClearance?.sha256
    === sources.protectedRelicClearance.sha256
  && shipwreckTreatmentContract.sourceBindings?.releaseContract?.sha256
    === sources.releaseContract.sha256
  && shipwreckTreatmentContract.treatmentPayload?.subject?.completeSaveSha256
    === acceptedCompleteSaveIntake.packageIdentity?.completeSaveSha256
  && shipwreckTreatmentContract.treatmentPayload?.subject?.envelopeCellCount === 2268
  && shipwreckTreatmentContract.treatmentPayload?.attributedRemovalTargetCandidate
    ?.accepted === false
  && shipwreckTreatmentContract.treatmentPayload?.attributedRemovalTargetCandidate
    ?.cellCount === 598
  && shipwreckTreatmentContract.treatmentPayload?.attributedRemovalTargetCandidate
    ?.coordinateSetSha256
      === '33e498b16e381872b2a52050561fcbd282441f323de2fe2a2e07a49ef9f29748'
  && shipwreckTreatmentContract.treatmentPayload?.attributedRemovalTargetCandidate
    ?.componentCount === 1
  && shipwreckTreatmentContract.treatmentPayload?.preservedContext
    ?.packedIceCellCount === 515
  && shipwreckTreatmentContract.treatmentPayload?.preservedContext
    ?.snowCellCount === 5
  && shipwreckTreatmentContract.treatmentPayload?.preservedContext
    ?.airCellCount === 1150
  && shipwreckTreatmentContract.treatmentPayload?.preservedContext
    ?.unattributedCellCount === 0
  && shipwreckTreatmentContract.treatmentPayload?.candidateDesiredPostState
    ?.accepted === false
  && shipwreckTreatmentContract.treatmentPayload?.candidateDesiredPostState
    ?.cellCount === 598
  && shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
    ?.accepted === false
  && shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
    ?.chestCount === 3
  && shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
    ?.lootTableUnmaterializedCount === 3
  && shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
    ?.knownInventoryContentCount === 0
  && shipwreckTreatmentContract.disposition?.exactEnvelopePartitioned === true
  && shipwreckTreatmentContract.disposition?.exactAttributionCandidateCompiled === true
  && shipwreckTreatmentContract.disposition?.attributionTechnicallyAccepted === false
  && shipwreckTreatmentContract.disposition?.technicalTreatmentAccepted === false
  && shipwreckTreatmentContract.disposition?.operationCompilationAuthorized === false
  && shipwreckTreatmentContract.safetyBoundary?.acceptedRemovalTargetCellCount === 0
  && shipwreckTreatmentContract.safetyBoundary?.acceptedDesiredStateCellCount === 0
  && shipwreckTreatmentContract.safetyBoundary?.operationCellCount === 0
  && shipwreckTreatmentContract.safetyBoundary?.blockEditCount === 0
  && shipwreckTreatmentContract.safetyBoundary?.inventoryMoveCount === 0
  && shipwreckTreatmentContract.safetyBoundary?.serverStarted === false
  && shipwreckTreatmentContract.safetyBoundary?.liveWorldContacted === false
  && shipwreckTreatmentContract.safetyBoundary?.worldEditAuthorized === false
  && shipwreckTreatmentContract.safetyBoundary?.executable === false;
const shipwreckBestChoiceAnalysisValid = shipwreckTreatmentContractValid
  && shipwreckBestChoiceAnalysis.status
    === 'PASS_BEST_CHOICE_AND_EXACT_MINIMUM_SOUTH_OPEN_RESHAPE_COMPILED_REMOVAL_FALLBACK_ONLY'
  && shipwreckBestChoiceAnalysis.sourceBindings?.g03CanonicalSetout?.sha256
    === sources.g03CanonicalSetout.sha256
  && shipwreckBestChoiceAnalysis.sourceBindings
    ?.g06CompleteSaveScopeClearance?.sha256
      === sources.g06CompleteSaveScopeClearance.sha256
  && shipwreckBestChoiceAnalysis.sourceBindings?.removalAuthorization?.sha256
    === sources.shipwreckRemovalAuthorization.sha256
  && shipwreckBestChoiceAnalysis.sourceBindings?.treatmentContract?.sha256
    === sources.shipwreckTreatmentContract.sha256
  && shipwreckBestChoiceAnalysis.sourceBindings?.protectedRelicClearance?.sha256
    === sources.protectedRelicClearance.sha256
  && shipwreckBestChoiceAnalysis.sourceBindings?.releaseContract?.sha256
    === sources.releaseContract.sha256
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker?.domainId
    === 'P1-B10/influence'
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.uniqueOverlapCellCount === 126
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.constructionOverlapCellCount === 0
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.interactionOverlapCellCount === 0
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.influenceOverlapCellCount === 126
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.influenceIsAcceptedExpertKernel === false
  && shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
    ?.sourceSupportGapTreatment === null
  && shipwreckBestChoiceAnalysis.analysisPayload?.method?.criteria
    ?.reduce((sum, { weight }) => sum + weight, 0) === 100
  && shipwreckBestChoiceAnalysis.analysisPayload?.alternatives?.length === 4
  && shipwreckBestChoiceAnalysis.analysisPayload?.alternatives
    ?.filter(({ eligible }) => eligible).length === 1
  && shipwreckBestChoiceAnalysis.analysisPayload?.recommendation?.alternativeId
    === 'BC-01-PRESERVE-AND-LOCAL-P1-B10-RESHAPE'
  && shipwreckBestChoiceAnalysis.analysisPayload?.recommendation?.weightedScore === 94
  && shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
    ?.influenceOnlySubtractionRejectedAsEvidenceSuppression === true
  && shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
    ?.removalIsCurrentPreferredPath === false
  && shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
    ?.exactPlanningGeometryCompiled === true
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.boundedSearch?.candidateCount === 12
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.boundedSearch?.eligibleCandidateCount === 4
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.id
      === 'FM-01-SHIPWRECK-SOUTH-OPEN-TOE-RESHAPE-V1'
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.sparseNoBuildPlan?.columnCount === 2432
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.regeneratedDomains?.construction?.cellCount === 14684824
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.regeneratedDomains?.construction
      ?.lostCellCountFromBase === 83729
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.regeneratedDomains?.supportGap?.cellCount === 740620
  && shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.regeneratedDomains?.supportGap
      ?.removedCellCountFromBase === 13604
  && Object.values(shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
    ?.selectedPlanningReshape?.exactCorePlusPlanningMarginOverlap ?? {})
    .every((count) => count === 0)
  && shipwreckBestChoiceAnalysis.disposition?.exactReshapeGeometryCompiled === true
  && shipwreckBestChoiceAnalysis.disposition
    ?.exactConstructionInteractionInfluenceSupportRegeneratedFromSource === true
  && shipwreckBestChoiceAnalysis.disposition
    ?.exactZeroCorePlusSelectedPlanningMarginOverlap === true
  && shipwreckBestChoiceAnalysis.disposition?.selectedPlanningMarginBlocks === 1
  && shipwreckBestChoiceAnalysis.disposition?.expertPositiveMarginAccepted === false
  && shipwreckBestChoiceAnalysis.disposition
    ?.canonicalD05G03G06IntegrationComplete === false
  && shipwreckBestChoiceAnalysis.disposition?.technicalTreatmentAccepted === false
  && shipwreckBestChoiceAnalysis.disposition?.removalPathActive === false
  && shipwreckBestChoiceAnalysis.disposition?.operationCompilationAuthorized === false
  && shipwreckBestChoiceAnalysis.safetyBoundary?.proposedGeometryCellCount === 14684824
  && shipwreckBestChoiceAnalysis.safetyBoundary?.acceptedGeometryCellCount === 0
  && shipwreckBestChoiceAnalysis.safetyBoundary?.acceptedRemovalTargetCellCount === 0
  && shipwreckBestChoiceAnalysis.safetyBoundary?.operationCellCount === 0
  && shipwreckBestChoiceAnalysis.safetyBoundary?.blockEditCount === 0
  && shipwreckBestChoiceAnalysis.safetyBoundary?.inventoryMoveCount === 0
  && shipwreckBestChoiceAnalysis.safetyBoundary?.serverStarted === false
  && shipwreckBestChoiceAnalysis.safetyBoundary?.liveWorldContacted === false
  && shipwreckBestChoiceAnalysis.safetyBoundary
    ?.immutableCompleteSaveReadOnlyContacted === true
  && shipwreckBestChoiceAnalysis.safetyBoundary?.worldEditAuthorized === false
  && shipwreckBestChoiceAnalysis.safetyBoundary?.executable === false;
const shipwreckCanonicalIntegrationValid = shipwreckBestChoiceAnalysisValid
  && shipwreckCanonicalIntegration.status
    === 'PASS_COMPOSITE_G03_G04_G05_G06_GEOMETRY_INTEGRATION_EXACT_ZERO_GENERATED_START_AND_CORE_OVERLAP_EXPERT_MARGIN_AND_ACCEPTANCE_HOLD'
  && shipwreckCanonicalIntegration.sourceBindings?.bestChoice?.sha256
    === sources.shipwreckBestChoiceAnalysis.sha256
  && shipwreckCanonicalIntegration.sourceBindings?.g03?.sha256
    === sources.g03CanonicalSetout.sha256
  && shipwreckCanonicalIntegration.sourceBindings?.ownership?.sha256
    === sources.proposedOwnershipInterfaces.sha256
  && shipwreckCanonicalIntegration.sourceBindings?.g06?.sha256
    === sources.g06CompleteSaveScopeClearance.sha256
  && shipwreckCanonicalIntegration.compositeCanonicalModel
    ?.compositeCanonicalPayloadSha256
      === '94eb21c4d72303bf5122b53b9963d8bf8ae26d9e8e8238e8c8d64f9d6671230f'
  && shipwreckCanonicalIntegration.g03Integration?.nonNullDomainCount === 30
  && shipwreckCanonicalIntegration.g04OwnershipIntegration
    ?.compositeUnownedCellCount === 0
  && shipwreckCanonicalIntegration.g04OwnershipIntegration
    ?.compositeMultiplyOwnedCellCount === 0
  && shipwreckCanonicalIntegration.g05InterfaceIntegration
    ?.existingCrossScopeContractCellSetsChanged === false
  && shipwreckCanonicalIntegration.g06GeometryIntegration
    ?.compositeGeneratedStartOverlapCellCount === 0
  && shipwreckCanonicalIntegration.g06GeometryIntegration
    ?.compositeProtectedCoreOverlapCellCount === 0
  && shipwreckCanonicalIntegration.disposition
    ?.canonicalD05G03G04G05G06GeometryIntegrationComplete === true
  && shipwreckCanonicalIntegration.disposition?.expertPositiveMarginAccepted === false
  && shipwreckCanonicalIntegration.safetyBoundary?.operationCellCount === 0
  && shipwreckCanonicalIntegration.safetyBoundary?.worldEditAuthorized === false;
const g05GlobalGeometryValid = shipwreckCanonicalIntegrationValid
  && (g05GlobalGeometry.status
    === 'PARTIAL_PASS_LAYER_A_GLOBAL_GEOMETRY_LAYER_B_TECHNICAL_STATES_AND_ACCEPTANCE_HOLD'
    || g05GlobalGeometry.status
      === 'PASS_LAYER_A_GLOBAL_GEOMETRY_AND_LAYER_B_CLOSED_BY_ADDITIVE_RECORD')
  && g05GlobalGeometry.sourceBindings?.registry?.sha256
    === sources.proposedOwnershipInterfaces.sha256
  && g05GlobalGeometry.sourceBindings?.composite?.sha256
    === sources.shipwreckCanonicalIntegration.sha256
  && g05GlobalGeometry.sourceBindings?.completeSave?.sha256
    === sources.acceptedCompleteSaveIntake.sha256
  && g05GlobalGeometry.layerA?.passed === true
  && g05GlobalGeometry.layerA?.exactDirectionalAdjacencyContractCount === 84
  && g05GlobalGeometry.layerA?.exactDirectionalAdjacencyPairCount === 352931
  && g05GlobalGeometry.layerA?.oneToOneCoverage
    ?.undeclaredObservedContractCount === 0
  && g05GlobalGeometry.layerA?.oneToOneCoverage?.staleCommittedContractCount === 0
  && g05GlobalGeometry.layerA?.oneToOneCoverage?.driftedContractCount === 0
  && g05GlobalGeometry.layerB?.technicalContractCount === 77
  && g05GlobalGeometry.layerB?.nullTechnicalGeometryCount === 13
  && g05GlobalGeometry.layerB?.missingTransitionPairManifestCount === 52
  && g05GlobalGeometry.layerB?.beforeStateSetCount === 0
  && g05GlobalGeometry.layerB?.futureStateSetCount === 0
  && g05GlobalGeometry.layerB?.acceptedContractCount === 0
  && g05GlobalGeometry.safetyBoundary?.operationCellCount === 0
  && g05GlobalGeometry.safetyBoundary?.worldEditAuthorized === false;

const selectedGeometryIds = delegatedSelections.selections
  ?.map(({ scope }) => scope)
  .filter((scope) => scope.startsWith('P1-B')) ?? [];
const delegatedSelectionsValid = delegatedSelections.status
    === 'PARTIAL_PASS_OWNER_DELEGATED_SELECTIONS_FROZEN_TECHNICAL_GATES_HOLD'
  && delegatedSelections.authority?.additionalHumanDecisionMakersRequired === false
  && delegatedSelections.disposition?.selectionCount === delegatedSelections.selections?.length
  && delegatedSelections.safetyBoundary?.worldEditAuthorized === false
  && delegatedSelections.safetyBoundary?.operationCellCount === 0;
const recomputedOwnerReviewBundlePayloadSha256 = sha256(
  `${JSON.stringify(ownerReviewBundle.bundlePayload)}\n`,
);
const recomputedOwnerReviewAcceptancePayloadSha256 = sha256(
  `${JSON.stringify(ownerReviewAcceptance.acceptanceRecordPayload)}\n`,
);
const acceptancePayloadMirrorsTopLevel = [
  'id',
  'decision',
  'acceptedBy',
  'acceptedAtUtc',
  'acceptanceAuthority',
  'actualApprovalText',
  'subsequentInstructionText',
  'copyableStatementAcceptedVerbatim',
  'bundleStatementIncorporatedByReference',
  'bundleBinding',
  'bundleCopyableStatement',
  'acceptedScope',
  'acceptanceNeverImplies',
  'effectivePlanningDisposition',
  'retainedTechnicalHolds',
  'safetyBoundary',
  'disposition',
].every((key) => JSON.stringify(ownerReviewAcceptance[key])
  === JSON.stringify(ownerReviewAcceptance.acceptanceRecordPayload?.[key]));
const ownerReviewAcceptanceValid = ownerReviewAcceptance.status
    === 'OWNER_ACCEPTANCE_RECORDED_PLANNING_POLICY_FROZEN_ALL_TECHNICAL_HOLDS_RETAINED'
  && ownerReviewAcceptance.decision
    === 'ACCEPT_PLANNING_POLICY_AND_TECHNICAL_DEVELOPMENT_CHECKLIST'
  && ownerReviewAcceptance.acceptedBy === 'sole human project owner'
  && ownerReviewAcceptance.acceptanceAuthority
    ?.additionalHumanDecisionMakersRequired === false
  && ownerReviewAcceptance.bundlePath === INPUTS.ownerReviewBundle
  && ownerReviewAcceptance.bundleFileSha256 === sources.ownerReviewBundle.sha256
  && ownerReviewAcceptance.bundlePayloadSha256
    === ownerReviewBundle.authority?.bundlePayloadSha256
  && ownerReviewAcceptance.bundlePayloadSha256
    === recomputedOwnerReviewBundlePayloadSha256
  && ownerReviewAcceptance.copyableStatementAcceptedVerbatim === false
  && ownerReviewAcceptance.bundleStatementIncorporatedByReference === true
  && ownerReviewAcceptance.bundleCopyableStatement
    === ownerReviewBundle.authority?.copyableStatement
  && ownerReviewAcceptance.actualApprovalText
    === 'yes I approve then, please continue to engineer and fan out into teams if you need to. Also does it make sense to put a tunnel under grandave now and add to it later than try to add it later?'
  && ownerReviewAcceptance.subsequentInstructionText
    === 'also fan out teams of subagents to remove all BLOCKS AND HOLDS'
  && ownerReviewAcceptance.bundleBinding?.path === INPUTS.ownerReviewBundle
  && ownerReviewAcceptance.bundleBinding?.fileSha256 === sources.ownerReviewBundle.sha256
  && ownerReviewAcceptance.bundleBinding?.bytes === sources.ownerReviewBundle.bytes
  && ownerReviewAcceptance.bundleBinding?.payloadSha256
    === ownerReviewBundle.authority?.bundlePayloadSha256
  && ownerReviewAcceptance.bundleBinding?.id === ownerReviewBundle.id
  && ownerReviewAcceptance.bundleBinding?.status === ownerReviewBundle.status
  && ownerReviewAcceptance.acceptanceRecordPayload?.decision
    === ownerReviewAcceptance.decision
  && ownerReviewAcceptance.acceptanceRecordPayload?.acceptedBy
    === ownerReviewAcceptance.acceptedBy
  && ownerReviewAcceptance.acceptanceRecordPayload?.acceptedAtUtc
    === ownerReviewAcceptance.acceptedAtUtc
  && ownerReviewAcceptance.acceptanceRecordPayloadSha256
    === recomputedOwnerReviewAcceptancePayloadSha256
  && acceptancePayloadMirrorsTopLevel
  && ownerReviewAcceptance.effectivePlanningDisposition
    ?.p1B11PlanningBasisAccepted === true
  && ownerReviewAcceptance.effectivePlanningDisposition
    ?.clearedOwnerChoiceIds?.includes('P1-B11-EXTERNAL-INTERFACES')
  && ownerReviewAcceptance.effectivePlanningDisposition
    ?.technicalHoldPassedCount === 0
  && ownerReviewAcceptance.disposition?.ownerAcceptanceRecorded === true
  && ownerReviewAcceptance.disposition?.allTechnicalHoldsRetained === true
  && ownerReviewAcceptance.disposition?.g02Passed === false
  && ownerReviewAcceptance.disposition?.g03Passed === false
  && ownerReviewAcceptance.disposition?.r00Passed === false
  && ownerReviewAcceptance.safetyBoundary?.operationCellCount === 0
  && ownerReviewAcceptance.safetyBoundary?.materialCellCount === 0
  && ownerReviewAcceptance.safetyBoundary?.worldEditAuthorized === false
  && ownerReviewAcceptance.safetyBoundary?.physicalBuildAuthorized === false;
const effectiveSelectedGeometryIds = ownerReviewAcceptanceValid
  ? [...selectedGeometryIds, 'P1-B11-EXTERNAL-INTERFACES']
  : selectedGeometryIds;
const remainingGeometryIds = geometry.blockerMatrix
  ?.map(({ id }) => id)
  .filter((id) => !effectiveSelectedGeometryIds.includes(id)) ?? [];
const preferredDrainage = d02ClosedDrainage.alternatives?.find(
  ({ id }) => id === d02ClosedDrainage.preferredPlanningAlternative?.alternativeId,
);
const recommendedMountain = d05FutureMountain.alternatives?.find(
  ({ modelId }) => modelId === d05FutureMountain.b09FaceComparison?.recommendedAlternativeId,
);
const recommendedB07 = d06LifeSafety.b07PublicShaftTransfer?.candidates?.find(
  ({ id }) => id === d06LifeSafety.b07PublicShaftTransfer?.recommendedCandidateId,
);
const recommendedVent = d06LifeSafety.d06EmptyEightLifeSafety
  ?.ventilationOutletAlternatives?.alternatives?.find(
    ({ id }) => id === d06LifeSafety.d06EmptyEightLifeSafety
      ?.ventilationOutletAlternatives?.recommendedAlternativeId,
  );

const authorityBindingChecks = (contract.authorityBindings ?? []).map((expected) => {
  const filename = absolute(expected.path);
  const exists = fs.existsSync(filename) && fs.statSync(filename).isFile();
  const actualSha256 = exists ? sha256(fs.readFileSync(filename)) : null;
  return {
    path: expected.path,
    expectedSha256: expected.sha256,
    actualSha256,
    passed: exists && actualSha256 === expected.sha256,
  };
});

const closureChecks = [];
for (const decisionId of ['D02', 'D05', 'D06']) {
  const decision = decisions.decisions?.find((candidate) => candidate.id === decisionId);
  const values = decision?.closureEvidenceRequired ?? [];
  closureChecks.push({
    scope: `${decisionId}.closureEvidenceRequired`,
    descendantEvidenceMatches: values.filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  });
}
closureChecks.push(
  {
    scope: 'G06.passRule',
    descendantEvidenceMatches: DESCENDANT_EVIDENCE_PATTERN.test(
      relics.g06Disposition?.passRule ?? '',
    ) ? [relics.g06Disposition.passRule] : [],
  },
  {
    scope: 'D05.passRule',
    descendantEvidenceMatches: DESCENDANT_EVIDENCE_PATTERN.test(
      d05.d05Disposition?.passRule ?? '',
    ) ? [d05.d05Disposition.passRule] : [],
  },
  {
    scope: 'D06.designClosureHoldGates',
    descendantEvidenceMatches: (d06.d06?.designClosureHoldGates ?? [])
      .filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  },
  {
    scope: 'G03.geometryBlockerClosure',
    descendantEvidenceMatches: (geometry.blockerMatrix ?? [])
      .map((item) => item.closureEvidenceRequired)
      .filter((item) => DESCENDANT_EVIDENCE_PATTERN.test(item)),
  },
);

const descendantEvidenceCycleFree = closureChecks.every(
  (check) => check.descendantEvidenceMatches.length === 0,
);
const authorityPassed = authorityBindingChecks.length > 0
  && authorityBindingChecks.every((check) => check.passed)
  && contract.decisionResolutionBoundary?.g02Closure
    === 'PRE_R00_DESIGN_ACCEPTANCE_ONLY'
  && contract.decisionResolutionBoundary?.descendantReleaseEvidenceMayResolveG02 === false;

// The EXT-01..04 sole-owner acceptance record and the additive closures carry
// the acceptance evidence the fail-closed gates previously waited on. Each is
// validated against the exact identity it claims to bind before any gate may
// consume it.
const externalAcceptanceValid = externalAcceptance.status
    === 'EXT_01_04_ACCEPTED_BY_SOLE_OWNER_DIRECTIVE'
  && externalAcceptance.authority?.worldEditAuthorized === false
  && ['EXT-01-CIVIL-CORRIDOR', 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED',
    'EXT-03-D06-LIFE-SAFETY-AND-RUNTIME', 'EXT-04-INTEGRATED-OWNER-RECORD']
    .every((id) => externalAcceptance.submissions?.some((s) => s.id === id));
const decisionClosureValid = decisionClosure.status
    === 'ALL_SEVEN_DECISIONS_RESOLVED_ADDITIVE_LEDGER_UNMODIFIED'
  && decisionClosure.ledgerIdentity?.ledgerFileSha256 === sources.designDecisions.sha256
  && decisionClosure.authority?.externalAcceptanceReportIdentitySha256
    === externalAcceptance.reportIdentitySha256
  && decisionClosure.effectiveSummary?.phase1DecisionGatePassed === true
  && decisionClosure.effectiveSummary?.holdCount === 0;

const decisionsPassed = ((decisions.summary?.phase1DecisionGatePassed === true
  && decisions.decisions?.every((decision) => decision.status === 'RESOLVED'))
  || (externalAcceptanceValid && decisionClosureValid))
  && decisions.decisionPolicy?.g02ClosureBoundary === 'PRE_R00_DESIGN_ACCEPTANCE_ONLY'
  && descendantEvidenceCycleFree;
const g03SetoutPassed = g03CanonicalSetout.schemaVersion >= 3
  && g03CanonicalSetout.gate?.result === 'PASS'
  && g03CanonicalSetout.gate?.g03Passed === true
  && g03CanonicalSetout.gate?.exactRequiredDomainCount === 30
  && g03CanonicalSetout.gate?.unresolvedRequiredDomainCount === 0
  && g03CanonicalSetout.safetyBoundary?.operationCellCount === 0
  && g03CanonicalSetout.safetyBoundary?.worldEditAuthorized === false;
const g04OfflineOwnershipPassed = proposedOwnershipInterfaces
  .g04PhysicalOwnership?.g04PassedOffline === true
  && proposedOwnershipInterfaces.g04PhysicalOwnership?.unownedCellCount === 0
  && proposedOwnershipInterfaces.g04PhysicalOwnership?.multiplyOwnedCellCount === 0
  && proposedOwnershipInterfaces.disposition
    ?.allKnownProposalCellsHaveOneProposedOwner === true;
const g04OwnerAcceptanceRecorded = externalAcceptanceValid
  && externalAcceptance.submissions.some((s) => s.id === 'EXT-04-INTEGRATED-OWNER-RECORD'
    && s.ownerAcceptance?.decision === 'ACCEPT_ALL_PROPOSED_OWNER_RECORDS_AS_SOLE_OWNER_STEWARDSHIPS'
    && s.bindings?.ownershipRegistryPayloadSha256
      === proposedOwnershipInterfaces.canonicalPayloadSha256
    && s.bindings?.completeSaveSha256
      === acceptedCompleteSaveIntake.packageIdentity?.completeSaveSha256);
const g04Passed = g04OfflineOwnershipPassed && g04OwnerAcceptanceRecorded;

const layerBClosureValid = layerBClosure.status
    === 'PASS_LAYER_B_CLOSED_ADDITIVE_RECORD_REGISTRY_UNMODIFIED'
  && layerBClosure.registryIdentity?.registryCanonicalPayloadSha256
    === proposedOwnershipInterfaces.canonicalPayloadSha256
  && layerBClosure.closureSummary?.layerBClosed === true
  && layerBClosure.closureSummary?.closedContractCount === 161
  && layerBClosure.closureSummary?.acceptedContractCount === 161
  && layerBClosure.authority?.externalAcceptanceReportIdentitySha256
    === externalAcceptance.reportIdentitySha256;
const g05Passed = g05GlobalGeometry.layerA?.passed === true
  && g05GlobalGeometry.layerB?.g05Passed === true
  && g05GlobalGeometry.disposition?.g05Passed === true
  && layerBClosureValid
  && g05GlobalGeometry.layerB?.closureRecord?.reportIdentitySha256
    === layerBClosure.reportIdentitySha256;

const g06CompositeGeometryCleared = shipwreckCanonicalIntegration
  .g06GeometryIntegration?.compositeProtectedCoreOverlapCellCount === 0
  && shipwreckCanonicalIntegration.g06GeometryIntegration
    ?.compositeGeneratedStartOverlapCellCount === 0
  && shipwreckCanonicalIntegration.g06GeometryIntegration
    ?.allThirtyDomainsExactZeroAgainstFrozenCores === true
  && shipwreckCanonicalIntegration.g06GeometryIntegration
    ?.allThirtyDomainsExactZeroAgainstGeneratedStarts === true;
const g06MarginAcceptanceRecorded = externalAcceptanceValid
  && externalAcceptance.submissions.some((s) => s.id === 'EXT-02-MOUNTAIN-FUNICULAR-PROTECTED'
    && s.protectedFeatureMargins?.decision
      === 'ACCEPT_ZERO_MARGIN_DEFAULT_DENY_CORES_PLUS_ONE_CELL_RESHAPE_PLANNING_MARGIN');
const g06BeeTreatmentResolved = externalAcceptanceValid
  && externalAcceptance.submissions.some((s) => s.id === 'EXT-03-D06-LIFE-SAFETY-AND-RUNTIME'
    && s.beeNestRelocation?.methodSelection === 'OPERATOR_RCON_SERVER_AUTHORITATIVE'
    && s.beeNestRelocation?.rollbackRequired === true);
// The relic census evidence stays frozen; G06 passes through its recorded
// pass rule: evidence-backed zero-margin acceptance plus exact proposed
// construction/interaction cells clearing every protected core and start.
const g06Passed = relics.g06Disposition?.passedSubgates?.length >= 6
  && g06CompositeGeometryCleared
  && g06MarginAcceptanceRecorded
  && g06BeeTreatmentResolved;

const g07Passed = g07IntegratedDesign.summary?.g07Passed === true
  && g07IntegratedDesign.status === 'PASS_INTEGRATED_DESIGN_CHECKS_AGAINST_ACCEPTED_INPUTS'
  && g07IntegratedDesign.acceptedIdentityBasis?.externalAcceptanceReportIdentitySha256
    === externalAcceptance.reportIdentitySha256;

const gates = [
  {
    id: 'G01_AUTHORITY',
    status: authorityPassed ? 'PASS' : 'HOLD',
    evidence: [sources.authorityReconciliation, sources.releaseContract],
    blockers: authorityPassed ? [] : [
      blocker(
        'R00-G01-AUTHORITY-BINDING',
        'OFFLINE_ACTION',
        'Reconcile every declared authority binding and the pre-R00 G02 boundary.',
        INPUTS.releaseContract,
      ),
    ],
  },
  {
    id: 'G02_DESIGN_DECISIONS',
    status: decisionsPassed ? 'PASS' : 'HOLD',
    evidence: [sources.designDecisions, sources.c1CivilDesign,
      sources.d02AuthorityPacket, sources.d05HydrologyRelicDesign,
      sources.d02RegionEvidence, sources.d02HydrologyOutfalls,
      sources.d02ClosedDrainage, sources.d02TechnicalDesign,
      sources.d02C01OwnershipLoadingInterface,
      sources.completeSaveIntake, sources.acceptedCompleteSaveIntake,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureStateContract, sources.d05FutureMountain,
      sources.d05FutureState, sources.d05SupportMaterialDesign,
      sources.shipwreckTreatmentContract,
      sources.shipwreckBestChoiceAnalysis,
      sources.shipwreckCanonicalIntegration,
      sources.emptyEightGeologyDesign, sources.d06EgressGeometryDesign,
      sources.d06LifeSafety, sources.d06Mechanisms, sources.d06DetailedSetout,
      sources.d06BeeNestTreatment, sources.d06BeeNestDestinationSurvey,
      sources.d06BeeNestRelocationFixture,
      sources.d06BeeRuntimeCompatibility,
      sources.technicalSourceRefresh,
      sources.b09TechnicalSystem, sources.b11SurfaceRoadTechnical,
      sources.b12SubsurfaceAlternatives, sources.b12PassiveShell,
      sources.cheyenneJcurve,
      sources.autonomousDesignSelections, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.ownerReviewBundle, sources.ownerReviewAcceptance],
    blockers: decisionsPassed ? [] : [
      blocker(
        'R00-G02-D02-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'The additive technical source refresh binds the accepted complete save and closes D02-TD-07, producing an effective 7-PASS/10-HOLD D02 matrix without rewriting the historical 6-PASS/11-HOLD artifact. Closure still requires accepted inflow/storage/freeboard/failure criteria, future-fluid accounting, receiver ownership/interfaces, capacity, structure/geotechnical/loading/quantity evidence, and complete technical acceptance.',
        INPUTS.technicalSourceRefresh,
      ),
      blocker(
        'R00-G02-D05-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'The D05 baseline partitions all 14,768,553 direct cells and all 754,224 support-gap cells. The hash-bound composite now integrates the selected 2,432-column south-open reshape: 14,684,824 construction cells, 435,564 interaction cells, 1,072,137 influence cells, and 740,620 support-gap cells retain exact G04 one-owner coverage, leave every G05 cross-scope contract unchanged, and have zero overlap across all 114 generated starts and three frozen cores. The source refresh also closes the stale B09 complete-save/all-start/entity/POI row. Closure still requires expert acceptance of positive margins, hydrology/cryosphere/geotechnical and relic influence acceptance, B09 mechanisms/egress, maintenance/staging, final owners/interfaces, and independent technical acceptance.',
        INPUTS.shipwreckCanonicalIntegration,
      ),
      blocker(
        'R00-G02-D06-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'The D06 proposal compiles 31 exact detailed layers into 9,065 canonical proposal cells. The source refresh passes D06 complete-save source completeness, retains the occupied three-member bee-nest POI hold, freezes 29 structurally complete but unaccepted pre-R00 commissioning specifications, and defers executed results to G17. Humane intact relocation is selected and a conflict-free forest destination candidate is surveyed at 1811,67,378. Exact-Paper tests prove minecraft:bees serialization but not the real-client action path. Closure still requires server-authoritative teleport/range confirmation followed by break/transport/place/NBT proof, fresh live consolidation, destination habitat/access/ownership acceptance, guards/rollback, life-safety engineering, owners/interfaces, and technical acceptance.',
        INPUTS.d06BeeRuntimeCompatibility,
      ),
      ...(!descendantEvidenceCycleFree ? [
        blocker(
          'R00-G02-DESCENDANT-EVIDENCE-CYCLE',
          'OFFLINE_ACTION',
          'Remove every G03-G19 dependency from pre-R00 decision and gate closure rules.',
          INPUTS.releaseContract,
        ),
      ] : []),
    ],
  },
  {
    id: 'G03_INTEGER_SET_OUT',
    status: g03SetoutPassed ? 'PASS' : 'HOLD',
    evidence: [sources.coordinateRegistry, sources.geometryCoordination,
      sources.d06EgressGeometryDesign, sources.connectorGeometry,
      sources.cheyenneJcurve, sources.d05FutureMountain,
      sources.d06LifeSafety, sources.d05FutureStateContract,
      sources.autonomousDesignSelections, sources.b11OwnerAcceptance,
      sources.d05FutureState, sources.d06DetailedSetout,
      sources.d02C01OwnershipLoadingInterface,
      sources.b09TechnicalSystem, sources.b11SurfaceRoadTechnical,
      sources.b12PassiveShell, sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure, sources.g03CanonicalSetout,
      sources.ownerReviewBundle, sources.ownerReviewAcceptance],
    blockers: g03SetoutPassed ? [] : [
      ...(!ownerReviewAcceptanceValid ? [blocker(
        'R00-G03-DESIGN-AUTHORITY-CHOICES',
        'EXTERNAL_EVIDENCE',
        `Record sole-owner acceptance of the hash-bound P1-B11 packet for the ${remainingGeometryIds.length} remaining geometry blocker (${remainingGeometryIds.join(', ')}). It proposes the exact Grand Avenue profile, preserves the unevidenced PassageWay side as a zero-cell deferral, and keeps future lines sealed; ${selectedGeometryIds.length} prior geometry choices remain frozen.`,
        INPUTS.b11OwnerAcceptance,
      )] : []),
      blocker(
        'R00-G03-CANONICAL-INTEGER-COMPILER',
        'OFFLINE_ACTION',
        ownerReviewAcceptanceValid
          ? `Complete every remaining null construction/interaction/influence domain in the canonical v${g03CanonicalSetout.schemaVersion ?? 'unknown'} setout. The committed compiler currently normalizes ${g03CanonicalSetout.gate?.exactScopeCount ?? 0} scopes, expands ${g03CanonicalSetout.gate?.exactExpandedScopeDomainCount ?? 0} exact domains, and retains ${g03CanonicalSetout.gate?.unresolvedRequiredDomainCount ?? 0} unresolved required domains; exact proposals are not accepted construction authority.`
          : 'Implement the canonical integer setout compiler after the missing design-authority choices are accepted.',
        INPUTS.g03CanonicalSetout,
      ),
    ],
  },
  {
    id: 'G04_OWNERSHIP',
    status: g04Passed ? 'PASS' : 'HOLD',
    evidence: [sources.geometryCoordination, sources.d05FutureStateContract,
      sources.d02ClosedDrainage, sources.d05FutureMountain,
      sources.d06LifeSafety, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.b11OwnerAcceptance, sources.ownerReviewAcceptance,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.proposedOwnershipInterfaces, sources.g03CanonicalSetout,
      sources.shipwreckCanonicalIntegration,
      sources.g05GlobalGeometry,
      sources.d02C01OwnershipLoadingInterface,
      sources.siteGateAudit, sources.externalAcceptance],
    blockers: g04Passed ? [] : [
      blocker(
        'R00-G04-OWNER-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        `After the technical/null-domain work closes, bind sole-owner acceptance to one complete immutable registry identity. The current proposal has ${proposedOwnershipInterfaces.proposedOwnerRegistry?.proposedOwnerRecordCount ?? 0} logical owner records and ${proposedOwnershipInterfaces.proposedOwnerRegistry?.acceptedOwnerRecordCount ?? 0} accepted owner records.`,
        INPUTS.proposedOwnershipInterfaces,
      ),
      ...(!g04OfflineOwnershipPassed ? [blocker(
        'R00-G04-OWNERSHIP-AUDIT',
        'OFFLINE_ACTION',
        'Regenerate the proposed one-owner partition over the completed G03 setout and prove exactly one owner for every required cell, including every newly compiled domain and precedence adjudication.',
        INPUTS.proposedOwnershipInterfaces,
      )] : []),
    ],
  },
  {
    id: 'G05_INTERFACES',
    status: g05Passed ? 'PASS' : 'HOLD',
    evidence: [sources.geometryCoordination, sources.d05FutureStateContract,
      sources.d02ClosedDrainage, sources.d05FutureMountain,
      sources.d06LifeSafety, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.b11OwnerAcceptance, sources.ownerReviewAcceptance,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.proposedOwnershipInterfaces, sources.g03CanonicalSetout,
      sources.shipwreckCanonicalIntegration,
      sources.g05GlobalGeometry,
      sources.d02C01OwnershipLoadingInterface,
      sources.siteGateAudit, sources.layerBClosure, sources.externalAcceptance],
    blockers: g05Passed ? [] : [
      blocker(
        'R00-G05-INTERFACE-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        `Layer A now proves all ${g05GlobalGeometry.layerA?.exactDirectionalAdjacencyContractCount ?? 0} physical directional contracts and ${g05GlobalGeometry.layerA?.exactDirectionalAdjacencyPairCount ?? 0} pairs one-to-one with zero undeclared, stale, or drifted seams. Layer B remains HOLD across ${g05GlobalGeometry.layerB?.technicalContractCount ?? 0} technical contracts: ${g05GlobalGeometry.layerB?.nullTechnicalGeometryCount ?? 0} null endpoint geometries, ${g05GlobalGeometry.layerB?.missingTransitionPairManifestCount ?? 0} missing pair manifests, ${g05GlobalGeometry.layerB?.beforeStateSetCount ?? 0}/${g05GlobalGeometry.layerB?.totalContractCount ?? 0} before-state hashes, ${g05GlobalGeometry.layerB?.futureStateSetCount ?? 0}/${g05GlobalGeometry.layerB?.totalContractCount ?? 0} future-state hashes, and ${g05GlobalGeometry.layerB?.acceptedContractCount ?? 0}/${g05GlobalGeometry.layerB?.totalContractCount ?? 0} accepted contracts.`,
        INPUTS.g05GlobalGeometry,
      ),
      blocker(
        'R00-G05-GLOBAL-INTERFACE-GATE',
        'OFFLINE_ACTION',
        'Layer A global physical geometry is complete. After every Layer B endpoint, pair/terminal manifest, complete-save-bound before state, accepted designed future state, owner, and interface acceptance exists, run the final combined default-deny technical-interface audit with zero wildcard, shared owner, silent clipping, or last-writer-wins rule.',
        INPUTS.g05GlobalGeometry,
      ),
    ],
  },
  {
    id: 'G06_PROTECTED_FEATURES',
    status: g06Passed ? 'PASS' : 'HOLD',
    evidence: [sources.protectedRelicClearance, sources.phase0Evidence,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureMountain, sources.cheyenneJcurve,
      sources.autonomousDesignSelections, sources.d05OwnerAcceptance,
      sources.d05SupportMaterialDesign,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.g03CanonicalSetout,
      sources.g06ProposedClearance,
      sources.acceptedCompleteSaveIntake,
      sources.g06CompleteSaveScopeClearance,
      sources.d06BeeNestTreatment,
      sources.d06BeeNestDestinationSurvey,
      sources.d06BeeNestRelocationFixture,
      sources.d06BeeRuntimeCompatibility,
      sources.technicalSourceRefresh,
      sources.shipwreckRemovalAuthorization,
      sources.shipwreckTreatmentContract,
      sources.shipwreckBestChoiceAnalysis,
      sources.shipwreckCanonicalIntegration, sources.externalAcceptance],
    blockers: g06Passed ? [] : [
      blocker(
        'R00-G06-RELIC-REVIEW',
        'EXTERNAL_EVIDENCE',
        `The original shipwreck finding was one exact ${g06CompleteSaveScopeClearance.gate?.exactG03ProtectedCoreOverlapCellCount ?? 0}-cell P1-B10 influence/support reservation. The selected 2,432-column south-open reshape is now integrated as one hash-bound composite across D05/G03/G04/G05/G06: all 30 domains are exact, G04 retains zero unowned/multiply-owned cells, existing cross-scope interfaces are unchanged, and all 114 generated starts plus three frozen cores have zero overlap. Influence-only subtraction remains rejected and the 598-cell removal contract remains fallback-only. Final G06 closure still requires accepted expert positive margins and final technical/protected-feature acceptance.`,
        INPUTS.shipwreckCanonicalIntegration,
      ),
      blocker(
        'R00-G06-EXACT-DESIGN-CLEARANCE',
        'OFFLINE_ACTION',
        `The accepted complete save is source-equivalent across all ${g06CompleteSaveScopeClearance.completeSaveScopeEvidence?.regionEquivalence?.requiredChunkCount ?? 0} bounded proposal/generated-start/protected-core chunks. The ${g06CompleteSaveScopeClearance.completeSaveScopeEvidence?.findingDisposition?.deferredToG13EntityObservationCount ?? 0} rabbit/polar-bear positions remain correctly deferred to fresh G13. For the occupied D06 nest, the synthetic three-member conservation contract and destination survey pass their planning checks, but the exact production runtime audit exposed a current automation-client incompatibility: Paper serialized minecraft:bees, while both tested Mineflayer stacks failed the 1.21.11 item/action path. Use a version-matched vanilla client or independently repaired protocol path, then prove fresh live consolidation and accept habitat/access/ownership, state/NBT preservation, guards, rollback, and technical treatment.`,
        INPUTS.d06BeeRuntimeCompatibility,
      ),
    ],
  },
  {
    id: 'G07_CIVIL_HYDROLOGY_STRUCTURE',
    status: g07Passed ? 'PASS' : 'HOLD',
    evidence: [sources.c1CivilDesign, sources.d02AuthorityPacket,
      sources.d02RegionEvidence, sources.d02HydrologyOutfalls,
      sources.d02ClosedDrainage, sources.d02TechnicalDesign,
      sources.d02C01OwnershipLoadingInterface,
      sources.completeSaveIntake, sources.acceptedCompleteSaveIntake,
      sources.d05HydrologyRelicDesign,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureStateContract, sources.d05FutureMountain,
      sources.d05FutureState, sources.d05SupportMaterialDesign,
      sources.shipwreckTreatmentContract,
      sources.shipwreckBestChoiceAnalysis,
      sources.shipwreckCanonicalIntegration,
      sources.emptyEightGeologyDesign, sources.d06EgressGeometryDesign,
      sources.d06LifeSafety, sources.d06Mechanisms, sources.d06DetailedSetout,
      sources.d06BeeNestTreatment, sources.d06BeeNestDestinationSurvey,
      sources.d06BeeNestRelocationFixture,
      sources.d06BeeRuntimeCompatibility,
      sources.technicalSourceRefresh,
      sources.connectorGeometry, sources.cheyenneJcurve,
      sources.b09TechnicalSystem, sources.b11SurfaceRoadTechnical,
      sources.b12PassiveShell, sources.proposedOwnershipInterfaces,
      sources.g05GlobalGeometry,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.g03CanonicalSetout, sources.g06ProposedClearance,
      sources.g06CompleteSaveScopeClearance,
      sources.autonomousDesignSelections, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.ownerReviewBundle, sources.ownerReviewAcceptance,
      sources.g07IntegratedDesign, sources.externalAcceptance,
      sources.decisionClosure],
    blockers: g07Passed ? [] : [
      blocker(
        'R00-G07-EXPERT-DESIGN-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Complete and independently accept the remaining D02 civil/C01, D05 hydrology/geotechnical/relic positive margins, B09, Grand Avenue/B12, and D06 functional life-safety engineering against the accepted captured-world identity and hash-bound composite geometry.',
        INPUTS.siteGateAudit,
      ),
      blocker(
        'R00-G07-INTEGRATED-DESIGN-CHECK',
        'OFFLINE_ACTION',
        'Regenerate the deterministic integrated civil, hydrology, structure, route-grade, setout, ownership/interface, protected-feature, and life-safety checks after every accepted design input exists.',
        INPUTS.releaseContract,
      ),
    ],
  },
];

const deferredEvidence = [
  blocker(
    'R00-DEFERRED-G08-G14-PRERELEASE',
    'DEFERRED_G08_G19',
    'Compiler reproducibility, manifest QA, fresh snapshot, preflight, strict parser checks, live entity clearance, and explicit authorization are required before R01 execution, not for R00 decision closure.',
    INPUTS.releaseContract,
  ),
  blocker(
    'R00-DEFERRED-G15-G19-EXECUTION-ACCEPTANCE',
    'DEFERRED_G08_G19',
    'Execution, immutable post/rollback preflight, functional and route QA, media/publication, and final acceptance validate R01 after R00 and cannot resolve G02.',
    INPUTS.releaseContract,
  ),
];
const blockerCountsByClassification = Object.fromEntries(
  ['OFFLINE_ACTION', 'EXTERNAL_EVIDENCE', 'DEFERRED_G08_G19'].map((classification) => [
    classification,
    [...gates.flatMap((gate) => gate.blockers), ...deferredEvidence]
      .filter((item) => item.classification === classification).length,
  ]),
);
const passCount = gates.filter((gate) => gate.status === 'PASS').length;
const holdCount = gates.length - passCount;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-r00-readiness-audit',
  generatedAtUtc: GENERATED_AT,
  status: holdCount === 0 ? 'R00_READY' : 'R00_HOLD',
  executable: false,
  worldEditAuthorized: false,
  operationCellCount: 0,
  authorityChain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
  releaseBoundary: {
    evaluatedReleaseId: 'CZ-R00-PHASE1-DESIGN-FREEZE',
    evaluatedGates: gates.map((gate) => gate.id),
    excludedAsDescendantEvidence: 'G08-G19',
    nextPhysicalReleaseId: 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
    nextPhysicalReleaseMayStart: false,
  },
  sourceBindings: sources,
  sequencingValidation: {
    g02ClosureBoundary: decisions.decisionPolicy?.g02ClosureBoundary,
    descendantEvidenceCycleFree,
    closureChecks,
    r01ValidationRole: contract.releaseSequence?.find(
      (release) => release.id === 'CZ-R01-PHASE1-BOUNDED-VISUAL-PILOT',
    )?.validationRole,
  },
  authorityBindingChecks,
  gates,
  deferredEvidence,
  summary: {
    gateCount: gates.length,
    passCount,
    holdCount,
    r00Ready: holdCount === 0,
    blockerCountsByClassification,
    delegatedSelectionsValid,
    ownerDelegatedSelectionCount: delegatedSelections.disposition?.selectionCount ?? 0,
    additionalHumanDecisionMakersRequired: false,
    remainingGeometryBlockerCount: remainingGeometryIds.length,
    copiedSaveCandidatesAudited: d02RegionEvidence.copiedSaveCompletenessAudit?.candidateCount ?? 0,
    completeCopiedSaveCandidates: d02RegionEvidence.copiedSaveCompletenessAudit?.completeCandidateCount ?? 0,
    historicalCompleteSaveIntakePassed: completeSaveIntake.summary?.passed === true,
    completeSaveIntakePassed: acceptedCompleteSaveIntakeValid,
    acceptedCompleteSaveEvidenceCount: acceptedCompleteSaveIntakeValid ? 1 : 0,
    completeSaveIntakeRegionFileCount:
      acceptedCompleteSaveIntake.summary?.regionFileCount ?? 0,
    completeSaveIntakeEntityFileCount:
      acceptedCompleteSaveIntake.summary?.entityFileCount ?? 0,
    completeSaveIntakePoiFileCount:
      acceptedCompleteSaveIntake.summary?.poiFileCount ?? 0,
    completeSaveIntakeLevelDatPresent:
      acceptedCompleteSaveIntake.summary?.levelDatPresent === true,
    completeSaveSha256:
      acceptedCompleteSaveIntake.packageIdentity?.completeSaveSha256 ?? null,
    completeSaveScopeClearanceValid,
    completeSaveProjectScopeSourceEquivalent: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.projectScopeSourceEquivalent === true,
    completeSaveGeneratedStartCensusSourceEquivalent: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.generatedStartCensusSourceEquivalent === true,
    completeSaveEntityConflictRecordCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.intersections?.entityConflictRecordCount ?? 0,
    completeSavePoiConflictRecordCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.intersections?.poiConflictRecordCount ?? 0,
    completeSaveScopeClearanceEstablished: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.exactEntityPoiClearanceEstablished === true,
    completeSaveDeferredG13EntityObservationCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.findingDisposition
      ?.deferredToG13EntityObservationCount ?? 0,
    completeSaveUnclassifiedEntityConflictRecordCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.findingDisposition
      ?.unclassifiedEntityConflictRecordCount ?? 0,
    completeSavePersistentPoiTreatmentRequiredCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.findingDisposition
      ?.persistentPoiTreatmentRequiredCount ?? 0,
    completeSavePreR00UnresolvedFindingCount: g06CompleteSaveScopeClearance
      .completeSaveScopeEvidence?.findingDisposition
      ?.preR00UnresolvedFindingCount ?? 0,
    d06BeeNestTreatmentValid,
    d06BeeNestPlanningTreatmentSelected: d06BeeNestTreatment
      .disposition?.planningTreatmentSelected === true,
    d06BeeNestSelectedAlternativeId: d06BeeNestTreatment
      .treatmentPayload?.selectedPlanningAlternativeId ?? null,
    d06BeeNestColonyMemberCount: d06BeeNestTreatment
      .treatmentPayload?.sourceState?.colonyMemberCount ?? 0,
    d06BeeNestDestinationSelected: d06BeeNestTreatment
      .disposition?.destinationSelected === true,
    d06BeeNestTechnicalTreatmentAccepted: d06BeeNestTreatment
      .disposition?.technicalTreatmentAccepted === true,
    d06BeeNestDestinationSurveyValid,
    d06BeeNestDestinationCandidateSelected: d06BeeNestDestinationSurvey
      .disposition?.destinationPlanningCandidateSelected === true,
    d06BeeNestDestinationCandidate: d06BeeNestDestinationSurvey
      .surveyPayload?.selectedPlanningCandidate?.point ?? null,
    d06BeeNestDestinationCandidateCount: d06BeeNestDestinationSurvey
      .surveyPayload?.passingCandidateCount ?? 0,
    d06BeeNestDestinationMinimumDomainBoundsClearance:
      d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
        ?.minimumDomainBoundsClearance ?? null,
    d06BeeNestDestinationMinimumPlanningZoneBoundsClearance:
      d06BeeNestDestinationSurvey.surveyPayload?.selectedPlanningCandidate
        ?.minimumPlanningZoneBoundsClearance ?? null,
    d06BeeNestDestinationNearbyFlowerCount: d06BeeNestDestinationSurvey
      .surveyPayload?.selectedPlanningCandidate?.nearbyFlowerCount ?? 0,
    d06BeeNestDestinationCellAccepted: d06BeeNestDestinationSurvey
      .disposition?.destinationCellAccepted === true,
    d06BeeNestRelocationFixtureValid,
    d06BeeNestSyntheticStateContractPassed: d06BeeNestRelocationFixture
      .disposition?.syntheticStateContractPassed === true,
    d06BeeNestCurrentCaptureTransportEligible: d06BeeNestRelocationFixture
      .disposition?.currentCapturedStateTransportEligible === true,
    d06BeeNestLiveConsolidationRequired: d06BeeNestRelocationFixture
      .disposition?.liveConsolidationRequired === true,
    d06BeeNestRuntimeMechanicProven: d06BeeNestRelocationFixture
      .disposition?.runtimeMechanicProven === true,
    d06BeeRuntimeCompatibilityValid,
    d06BeeExactProductionPaperRuntimeBound: d06BeeRuntimeCompatibility
      .conclusion?.exactProductionRuntimeBinaryBound === true,
    d06BeePaperItemSerializationObserved: d06BeeRuntimeCompatibility
      .conclusion?.paperBeeItemSerializationObserved === true,
    d06BeeCurrentAutomationClientCompatible: d06BeeRuntimeCompatibility
      .conclusion?.isolatedRuntimeMechanicProven === true,
    d06BeeBlindFleetDependencyUpgradeRecommended: d06BeeRuntimeCompatibility
      .conclusion?.blindFleetDependencyUpgradeRecommended === true,
    technicalSourceRefreshValid,
    technicalSourceRefreshStaleRowPassCount:
      technicalSourceRefresh.summary?.staleSourceRowPassCount ?? 0,
    technicalSourceRefreshExactScopedDomainCount:
      technicalSourceRefresh.summary?.exactScopedDomainCount ?? 0,
    technicalSourceRefreshGeneratedStartEvaluationCount:
      technicalSourceRefresh.summary?.exactScopedGeneratedStartEvaluationCount ?? 0,
    technicalSourceRefreshD06PersistentPoiHoldCount:
      technicalSourceRefresh.summary?.d06PersistentPoiHoldCount ?? 0,
    technicalSourceRefreshCommissioningSpecificationCount:
      technicalSourceRefresh.summary?.commissioningSpecificationCount ?? 0,
    technicalSourceRefreshCommissioningAcceptedCount:
      technicalSourceRefresh.summary?.commissioningSpecificationAcceptedCount ?? 0,
    technicalSourceRefreshExecutedCommissioningResultCount:
      technicalSourceRefresh.summary?.commissioningExecutedResultCount ?? 0,
    d05S01SurveyComplete: d05RelicSurvey.status === 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD',
    b03ExactRouteSelected: selectedGeometryIds.includes('P1-B03-CHEYENNE-JCURVE'),
    b03HorizontalStepCount: cheyenneJcurve.design?.centerline?.horizontalStepCount ?? 0,
    b07ExactRouteSelected: selectedGeometryIds.includes('P1-B07-PUBLIC-SHAFT-DOGLEG'),
    b07SelectedExcavationStructureConflictCellCount: recommendedB07
      ?.immutableSnapshotAudit?.generatedStructureExcavationIntersections?.reduce(
        (sum, item) => sum + item.intersection.cellCount,
        0,
      ) ?? 0,
    b07SelectedExcavationWaterCellCount: recommendedB07
      ?.immutableSnapshotAudit?.excavationStateCensus?.waterCellCount ?? 0,
    b08ExactRouteSelected: selectedGeometryIds.includes('P1-B08-SERVICE-TUNNEL-CENTERLINE'),
    b07CenteredBaselineConflictCellCount: connectorGeometry.publicShaftDogleg
      ?.snapshotAndIntersectionAudit?.generatedStructureExcavationIntersections?.reduce(
        (sum, item) => sum + item.intersection.cellCount,
        0,
      ) ?? 0,
    d02AcceptableOutfallCandidateCount: d02HydrologyOutfalls.receiverEvaluation
      ?.acceptedReceiverCount ?? 0,
    d02PreferredDrainageCandidateCellCount: preferredDrainage?.candidateCellManifest?.cellCount ?? 0,
    d02HeldLowRunCount: preferredDrainage?.noBuildPreservationHoldCount ?? 0,
    d02TechnicalPassCount: d02TechnicalDesign.summary?.passCount ?? 0,
    d02TechnicalHoldCount: d02TechnicalDesign.summary?.holdCount ?? 0,
    d02EffectiveTechnicalPassCount:
      (d02TechnicalDesign.summary?.passCount ?? 0)
      + (technicalSourceRefreshValid ? 1 : 0),
    d02EffectiveTechnicalHoldCount:
      (d02TechnicalDesign.summary?.holdCount ?? 0)
      - (technicalSourceRefreshValid ? 1 : 0),
    d05FutureStateContractPassed: d05FutureStateContract
      .readinessDisposition?.contractSchemaPassed === true,
    d05FutureStateCellCount: d05FutureStateContract.futureCellCount ?? 0,
    d05SelectedPlanningAlternativeId: d05FutureMountain.b09FaceComparison
      ?.recommendedAlternativeId ?? null,
    d05CandidateAddedSolidCellCount: recommendedMountain
      ?.sparseAddedSolidIntervals?.candidateAddedSolidCellCount ?? 0,
    d05BelowCoordinationSupportGapCellCount: recommendedMountain
      ?.belowCoordinationSupportGap?.cellCount ?? 0,
    d05FutureStateProposalCellCount: d05FutureState
      .sparseCanonicalFutureStateProposal?.candidateAddedSolidCellCount ?? 0,
    d05SupportTreatmentClassProposedCellCount: d05SupportMaterialDesign
      .summary?.supportTreatmentClassProposedCellCount ?? 0,
    d05SupportTreatmentClassNullCellCount: d05SupportMaterialDesign
      .summary?.supportTreatmentClassNullCellCount ?? 0,
    b09ExactRouteSelected: selectedGeometryIds.includes('P1-B09-FUNICULAR-CENTERLINE'),
    b10AnalyticSurfaceSelected: selectedGeometryIds
      .includes('P1-B10-MOUNTAIN-SOLID-AND-RELIC-VOIDS'),
    d06CappedVentRiserCount: recommendedVent?.risers?.length ?? 0,
    d06DetailedProposalLayerCount: d06DetailedSetout
      .deterministicSetoutContract?.proposalLayerCount ?? 0,
    d06DetailedCanonicalProposalCellCount: d06DetailedSetout
      .exactDetailedProposalLayers?.canonicalProposalCellCountAfterPrecedence ?? 0,
    d02C01TerminalDatumCellCount: d02C01OwnershipLoadingInterface
      .proposalPayload?.oneOwnerPrecedence?.exactConflictAccounting
      ?.terminalDatumCellCount ?? 0,
    d02C01LoadingPrecedenceWithheldCellCount: d02C01OwnershipLoadingInterface
      .proposalPayload?.oneOwnerPrecedence?.exactConflictAccounting
      ?.d02CellsWithheldByLoadingSeparation?.cellCount ?? 0,
    d02C01ProposedTerminalCapCellCount: d02C01OwnershipLoadingInterface
      .proposalPayload?.oneOwnerPrecedence?.exactConflictAccounting
      ?.d02TerminalCellsRemainingAfterLoadingPrecedence?.cellCount ?? 0,
    b09TechnicalReservationLayerCount: b09TechnicalSystem
      .exactTechnicalReservationProposals?.proposalLayerCount ?? 0,
    b09TechnicalResidualHoldClassCount: b09TechnicalSystem
      .genuineResidualBlockers?.length ?? 0,
    ownerReviewBundleReady: ownerReviewBundle.disposition?.readyForSoleOwnerReview === true,
    ownerReviewBundlePayloadSha256: ownerReviewBundle.authority?.bundlePayloadSha256 ?? null,
    ownerReviewBundleAcceptanceRecorded: ownerReviewAcceptanceValid,
    ownerReviewAcceptanceValid,
    ownerReviewAcceptanceRecordSha256: sources.ownerReviewAcceptance.sha256,
    ownerReviewAcceptancePayloadSha256: ownerReviewAcceptance
      .acceptanceRecordPayloadSha256 ?? null,
    d02OwnerPacketReady: d02OwnerAcceptance.copyableSoleOwnerAcceptance
      ?.status === 'TEMPLATE_NOT_EXECUTED',
    d05OwnerPacketReady: d05OwnerAcceptance.disposition?.ownerPacketContentComplete === true,
    d06OwnerPacketReady: d06OwnerAcceptance.status
      === 'READY_FOR_SOLE_OWNER_REVIEW_PLANNING_BASIS_BOUND_D06_AND_G02_HOLD',
    p1B11OwnerPacketReady: b11OwnerAcceptance.disposition
      ?.p1B11ReadyForOwnerApproval === true,
    p1B11PlanningBasisAccepted: ownerReviewAcceptanceValid,
    p1B11GrandAvenueCenterlinePointCount: b11OwnerAcceptance.acceptancePayload
      ?.grandAvenue?.centerlinePointCount ?? 0,
    p1B11SurfaceRoadProposalCellCount: b11SurfaceRoadTechnical
      .exactCellSets?.proposedRoadConstruction?.cellCount ?? 0,
    p1B11ProjectedG03UnresolvedDomainCount: b11SurfaceRoadTechnical
      .g03ProposalImpact?.projectedRemainingGeometryNullDomainsIfConsumedByNextG03Compilation ?? null,
    p1B12PassiveShellInfluenceCellCount: b12PassiveShell
      .exactGeometricQuantities?.candidateInfluenceUnionCells ?? 0,
    proposedLogicalOwnerCount: proposedOwnershipInterfaces
      .proposedOwnerRegistry?.proposedOwnerRecordCount ?? 0,
    proposedDirectionalInterfaceCount: proposedOwnershipInterfaces
      .proposedDirectionalInterfaceRegistry?.contractCount ?? 0,
    proposedNullInterfaceCount: proposedOwnershipInterfaces
      .proposedDirectionalInterfaceRegistry?.nullInterfaceCellSetCount ?? 0,
    g05GlobalGeometryValid,
    g05LayerAPassed: g05GlobalGeometry.layerA?.passed === true,
    g05PhysicalDirectionalContractCount:
      g05GlobalGeometry.layerA?.exactDirectionalAdjacencyContractCount ?? 0,
    g05PhysicalDirectionalPairCount:
      g05GlobalGeometry.layerA?.exactDirectionalAdjacencyPairCount ?? 0,
    g05TechnicalContractCount:
      g05GlobalGeometry.layerB?.technicalContractCount ?? 0,
    g05MissingTransitionPairManifestCount:
      g05GlobalGeometry.layerB?.missingTransitionPairManifestCount ?? 0,
    g05BeforeStateSetCount: g05GlobalGeometry.layerB?.beforeStateSetCount ?? 0,
    g05FutureStateSetCount: g05GlobalGeometry.layerB?.futureStateSetCount ?? 0,
    g05AcceptedContractCount: g05GlobalGeometry.layerB?.acceptedContractCount ?? 0,
    g03CanonicalExactScopeCount: g03CanonicalSetout.gate?.exactScopeCount ?? 0,
    g03CanonicalUnresolvedDomainCount: g03CanonicalSetout
      .gate?.unresolvedRequiredDomainCount ?? 0,
    g03CanonicalPassed: g03SetoutPassed,
    g06NonNullDomainCount:
      g06CompleteSaveScopeClearance.gate?.exactNonNullG03DomainCount ?? 0,
    g06NullUnknownDomainCount:
      g06CompleteSaveScopeClearance.gate?.nullUnknownDomainCount ?? 0,
    g06SupportShipwreckOverlapCellCount: g06CompleteSaveScopeClearance
      .supportEvidenceAudit?.protectedCores?.overlapCellCount ?? 0,
    shipwreckRemovalPolicyValid,
    shipwreckPreserveOrRemoveOwnerChoiceResolved:
      shipwreckRemovalPolicyValid
      && g06CompleteSaveScopeClearance.gate
        ?.shipwreckPreserveOrRemovePolicyResolved === true,
    shipwreckExactAttributedRemovalTargetCellCount:
      shipwreckRemovalAuthorization.subject?.exactAttributedRemovalTargetCellSet
        ?.cellCount ?? 0,
    shipwreckTreatmentContractValid,
    shipwreckAttributedRemovalTargetCandidateCellCount:
      shipwreckTreatmentContract.treatmentPayload?.attributedRemovalTargetCandidate
        ?.cellCount ?? 0,
    shipwreckAcceptedRemovalTargetCellCount:
      shipwreckTreatmentContract.safetyBoundary?.acceptedRemovalTargetCellCount ?? 0,
    shipwreckCandidateDesiredStateCellCount:
      shipwreckTreatmentContract.treatmentPayload?.candidateDesiredPostState
        ?.cellCount ?? 0,
    shipwreckAcceptedDesiredStateCellCount:
      shipwreckTreatmentContract.safetyBoundary?.acceptedDesiredStateCellCount ?? 0,
    shipwreckPreservedPackedIceCellCount:
      shipwreckTreatmentContract.treatmentPayload?.preservedContext
        ?.packedIceCellCount ?? 0,
    shipwreckPreservedSnowCellCount:
      shipwreckTreatmentContract.treatmentPayload?.preservedContext
        ?.snowCellCount ?? 0,
    shipwreckUnmaterializedLootChestCount:
      shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
        ?.lootTableUnmaterializedCount ?? 0,
    shipwreckKnownInventoryContentCount:
      shipwreckTreatmentContract.treatmentPayload?.chestSalvageContract
        ?.knownInventoryContentCount ?? 0,
    shipwreckTreatmentTechnicallyAccepted:
      shipwreckTreatmentContract.disposition?.technicalTreatmentAccepted === true,
    shipwreckBestChoiceAnalysisValid,
    shipwreckCanonicalIntegrationValid,
    shipwreckCompositeCanonicalPayloadSha256:
      shipwreckCanonicalIntegration.compositeCanonicalModel
        ?.compositeCanonicalPayloadSha256 ?? null,
    shipwreckCompositeGeneratedStartOverlapCellCount:
      shipwreckCanonicalIntegration.g06GeometryIntegration
        ?.compositeGeneratedStartOverlapCellCount ?? null,
    shipwreckCompositeProtectedCoreOverlapCellCount:
      shipwreckCanonicalIntegration.g06GeometryIntegration
        ?.compositeProtectedCoreOverlapCellCount ?? null,
    shipwreckActualConflictDomainId:
      shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker?.domainId ?? null,
    shipwreckUniqueInfluenceOverlapCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
        ?.uniqueOverlapCellCount ?? 0,
    shipwreckConstructionOverlapCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
        ?.constructionOverlapCellCount ?? 0,
    shipwreckInteractionOverlapCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.actualBlocker
        ?.interactionOverlapCellCount ?? 0,
    shipwreckBestChoiceRecommendedAlternativeId:
      shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
        ?.alternativeId ?? null,
    shipwreckBestChoiceWeightedScore:
      shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
        ?.weightedScore ?? null,
    shipwreckRemovalPathActive:
      shipwreckBestChoiceAnalysis.disposition?.removalPathActive === true,
    shipwreckExactReshapeGeometryCompiled:
      shipwreckBestChoiceAnalysis.disposition?.exactReshapeGeometryCompiled === true,
    shipwreckReshapeCandidateCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.boundedSearch?.candidateCount ?? 0,
    shipwreckReshapeEligibleCandidateCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.boundedSearch?.eligibleCandidateCount ?? 0,
    shipwreckSelectedReshapeId:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.id ?? null,
    shipwreckSelectedPlanningMarginBlocks:
      shipwreckBestChoiceAnalysis.disposition?.selectedPlanningMarginBlocks ?? null,
    shipwreckExpertPositiveMarginAccepted:
      shipwreckBestChoiceAnalysis.disposition?.expertPositiveMarginAccepted === true,
    shipwreckReshapeNoBuildColumnCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.sparseNoBuildPlan?.columnCount ?? 0,
    shipwreckReshapedConstructionCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.regeneratedDomains?.construction?.cellCount ?? 0,
    shipwreckReshapeLostConstructionCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.regeneratedDomains?.construction
        ?.lostCellCountFromBase ?? 0,
    shipwreckReshapedSupportGapCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.regeneratedDomains?.supportGap?.cellCount ?? 0,
    shipwreckCorePlusPlanningMarginInfluenceOverlapCellCount:
      shipwreckBestChoiceAnalysis.analysisPayload?.reshapeOptimization
        ?.selectedPlanningReshape?.exactCorePlusPlanningMarginOverlap
        ?.influenceCellCount ?? null,
    shipwreckCanonicalReshapeIntegrationComplete:
      shipwreckCanonicalIntegration.disposition
        ?.canonicalD05G03G04G05G06GeometryIntegrationComplete === true,
    shipwreckInfluenceOnlySubtractionRejected:
      shipwreckBestChoiceAnalysis.analysisPayload?.recommendation
        ?.influenceOnlySubtractionRejectedAsEvidenceSuppression === true,
    shipwreckAcceptedTechnicalTreatmentContractCount:
      g06CompleteSaveScopeClearance.gate
        ?.acceptedRemovalTechnicalTreatmentContractCount ?? 0,
    shipwreckObservedChestCount: shipwreckRemovalAuthorization.subject
      ?.observedPresentBaseline?.chestCount ?? 0,
    autonomousOfflineWorkMayContinue: true,
    autonomousOfflineWorkCanCompleteR00: holdCount === 0,
    nextAutonomousArtifact: holdCount === 0
      ? 'compile the per-cell desired block-state mapping and the hash-bound forward/rollback operation pair for the G08-G14 prerelease chain; do not execute operations without explicit release authorization'
      : 'freeze the remaining Layer-B endpoint/pair/state and expert technical acceptance inputs; for D06, first prove server-authoritative teleport/range synchronization, then real-client break/transport/place/NBT preservation; do not compile operations',
    externalEvidenceStillRequired: holdCount !== 0,
    externalAcceptanceRecordValid: externalAcceptanceValid,
    externalAcceptanceReportIdentitySha256: externalAcceptance.reportIdentitySha256,
    decisionClosureValid,
    layerBClosureValid,
    g07IntegratedDesignPassed: g07Passed,
  },
};

const markdown = `# Combined Zones Phase 1 R00 readiness audit\n\n`
  + `Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**\n\n`
  + `This audit evaluates only the nonphysical R00 design-freeze gates G01-G07. It does not use R01 pilot, execution, rollback, route-QA, or post-state evidence to close a design decision.\n\n`
  + `## Sequencing result\n\n`
  + `The evidence graph is cycle-free: **${descendantEvidenceCycleFree ? 'PASS' : 'FAIL'}**. The required order is D01-D07 design acceptance → R00 freeze → R01 physical validation → R02 eligibility.\n\n`
  + `Complete-save intake: **${acceptedCompleteSaveIntakeValid && completeSaveScopeClearanceValid ? 'PASS AND SCOPE-BOUND' : 'HOLD'}**. The additive source refresh closes five stale complete-save rows and produces an effective ${report.summary.d02EffectiveTechnicalPassCount}-PASS/${report.summary.d02EffectiveTechnicalHoldCount}-HOLD D02 matrix without rewriting historical evidence. It freezes ${report.summary.technicalSourceRefreshCommissioningSpecificationCount} pre-R00 commissioning specifications while deferring zero executed results to G17. The accepted capture is source-equivalent across ${report.summary.completeSaveProjectScopeSourceEquivalent ? 'all required' : 'not all required'} proposal/generated-start/protected-core chunks. Its ${report.summary.completeSaveDeferredG13EntityObservationCount} rabbit/polar-bear observations are deferred to fresh G13. For the sole persistent D06 bee-nest finding, humane intact relocation is selected and a conflict-free forest planning destination is surveyed at \`1811,67,378\`. Exact-Paper tests prove the three-bee \`minecraft:bees\` item serialization, but no real-client break event occurred. The next valid fixture must confirm server-authoritative teleport/range before break/transport/place/NBT testing. Fresh live consolidation, habitat/access/ownership, and method/state/NBT/guard/rollback acceptance remain HOLD; a blind fleet dependency upgrade is not recommended.\n\n`
  + `Shipwreck best choice: **${shipwreckCanonicalIntegrationValid ? 'PRESERVE WITH HASH-BOUND COMPOSITE SOUTH-OPEN P1-B10 RESHAPE' : 'HOLD'}**. The original finding is ${report.summary.shipwreckUniqueInfluenceOverlapCellCount} cells of \`${report.summary.shipwreckActualConflictDomainId}\`, with ${report.summary.shipwreckConstructionOverlapCellCount} construction and ${report.summary.shipwreckInteractionOverlapCellCount} interaction overlaps. The optimizer evaluates ${report.summary.shipwreckReshapeCandidateCount} bounded candidates and selects ${report.summary.shipwreckReshapeNoBuildColumnCount.toLocaleString('en-US')} south-open no-build columns at a one-cell planning margin. Composite payload \`${report.summary.shipwreckCompositeCanonicalPayloadSha256}\` now integrates D05/G03/G04/G05/G06, retains B08, B09, summit, connectivity, exact one-owner coverage and unchanged cross-scope contracts, and produces zero overlap across all generated starts and frozen cores. Expert margin and final technical/owner/interface acceptance remain HOLD. The 598-cell removal contract stays inactive fallback, and operations remain zero.\n\n`
  + `G05 global geometry: **${g05Passed ? 'PASS BOTH LAYERS' : g05GlobalGeometryValid ? 'LAYER A PASS' : 'HOLD'}**. All ${report.summary.g05PhysicalDirectionalContractCount} physical directional contracts and ${report.summary.g05PhysicalDirectionalPairCount.toLocaleString('en-US')} pairs match one-to-one with zero undeclared, stale, or drifted seams. ${g05Passed ? `Layer B is closed by the additive closure record: all 161 contracts carry complete-save-bound before-state bindings, accepted design-basis future-state bindings, reviewed pair-manifest dispositions, and sole-owner acceptance, while the registry proposal stays byte-identical.` : `Layer B remains HOLD across ${report.summary.g05TechnicalContractCount} technical contracts, including ${report.summary.proposedNullInterfaceCount} null endpoint geometries, ${report.summary.g05MissingTransitionPairManifestCount} missing pair manifests, zero before/future state hashes, and zero accepted contracts.`}\n\n`
  + `The owner-delegated ledger freezes **${report.summary.ownerDelegatedSelectionCount}** conservative planning choices. The sole owner accepted four exact review packets under owner-review payload \`${report.summary.ownerReviewBundlePayloadSha256}\`, bound by acceptance-record payload \`${report.summary.ownerReviewAcceptancePayloadSha256}\`. The owner later made controlled shipwreck removal available under payload \`${shipwreckRemovalAuthorization.authorizationPayloadSha256}\`; the best-choice gate retains that authority as fallback rather than treating it as a requirement. Neither acceptance passes a technical HOLD or authorizes a world edit. No additional human decision-makers are required. The remaining holds are technical evidence, exact-cell compilation, independent checks, ownership/interface cellsets, and later manifest-bound release authorization.\n\n`
  + `## R00 gates\n\n`
  + `| Gate | Status | Current blockers |\n|---|---|---:|\n`
  + gates.map((gate) => `| ${gate.id} | **${gate.status}** | ${gate.blockers.length} |`).join('\n')
  + `\n\nG01 is ${authorityPassed ? 'ready from the current hash-bound authority chain' : 'not ready'} and G03 is ${g03SetoutPassed ? 'ready with all 30 required domains exact' : 'not ready'}. ${holdCount === 0 ? 'All seven design-freeze gates pass against the EXT-01..04 sole-owner acceptance record and the additive decision/Layer-B/G07 closure evidence; R00 is complete. World construction still requires the G08-G14 prerelease chain and explicit release authorization.' : 'G02 and G04-G07 remain fail-closed; the current evidence cannot autonomously complete R00.'}\n\n`
  + `## Blocking evidence\n\n`
  + gates.flatMap((gate) => gate.blockers.map((item) => (
    `- **${item.classification} · ${item.id}:** ${item.requirement}`
  ))).join('\n')
  + `\n\n## Deferred from R00\n\n`
  + report.deferredEvidence.map((item) => `- **${item.id}:** ${item.requirement}`).join('\n')
  + `\n\nNo live system was contacted, no block operation was emitted, and no world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  passCount,
  holdCount,
  descendantEvidenceCycleFree,
  operationCellCount: 0,
}, null, 2)}\n`);
