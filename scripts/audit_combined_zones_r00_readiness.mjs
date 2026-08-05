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

const GENERATED_AT = value('--generated-at', '2026-08-04T18:00:00Z');
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
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  g06ProposedClearance: 'docs/masterplans/05-combined-zones/phase1-g06-proposed-clearance-audit.json',
  ownerReviewBundle: 'docs/masterplans/05-combined-zones/phase1-owner-review-bundle.json',
  ownerReviewAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  siteGateAudit: 'docs/masterplans/05-combined-zones/phase1-site-gate-audit.json',
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
const d05RelicSurvey = readJson(INPUTS.d05RelicSurvey);
const d05FutureStateContract = readJson(INPUTS.d05FutureStateContract);
const d05FutureMountain = readJson(INPUTS.d05FutureMountain);
const d05FutureState = readJson(INPUTS.d05FutureState);
const d05SupportMaterialDesign = readJson(INPUTS.d05SupportMaterialDesign);
const d06LifeSafety = readJson(INPUTS.d06LifeSafety);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const d06DetailedSetout = readJson(INPUTS.d06DetailedSetout);
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
const g03CanonicalSetout = readJson(INPUTS.g03CanonicalSetout);
const g06ProposedClearance = readJson(INPUTS.g06ProposedClearance);
const ownerReviewBundle = readJson(INPUTS.ownerReviewBundle);
const ownerReviewAcceptance = readJson(INPUTS.ownerReviewAcceptance);
const site = readJson(INPUTS.siteGateAudit);

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

const decisionsPassed = decisions.summary?.phase1DecisionGatePassed === true
  && decisions.decisions?.every((decision) => decision.status === 'RESOLVED')
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
      sources.completeSaveIntake,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureStateContract, sources.d05FutureMountain,
      sources.d05FutureState, sources.d05SupportMaterialDesign,
      sources.emptyEightGeologyDesign, sources.d06EgressGeometryDesign,
      sources.d06LifeSafety, sources.d06Mechanisms, sources.d06DetailedSetout,
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
        'The D02 planning basis now has an exact 6-PASS/11-HOLD technical matrix, but closure still requires one complete immutable copied save with region/entities/poi/level.dat, accepted inflow/storage/freeboard/failure criteria, future-fluid accounting, receiver ownership/interfaces, capacity, structure/geotechnical/loading/quantity evidence, and complete technical acceptance.',
        INPUTS.d02TechnicalDesign,
      ),
      blocker(
        'R00-G02-D05-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'The D05 proposal now partitions all 14,768,553 direct cells and all 754,224 support-gap cells; 17,997 support cells have treatment-class proposals while 736,227 remain treatment-null and all support canonical states remain null. Closure still requires complete-save evidence, accepted hydrology/cryosphere/geotechnical and relic influence, B09 mechanisms/egress, maintenance/staging, owners/interfaces, and independent technical acceptance.',
        INPUTS.d05SupportMaterialDesign,
      ),
      blocker(
        'R00-G02-D06-EXTERNAL-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'The D06 proposal now compiles 31 exact detailed layers into 9,065 canonical proposal cells and retains 29 commissioning contracts, but pre-R00 closure still requires external egress/discharge/fire-route design, functional mechanisms and controls/failure logic, independent circuit sources, hydraulic receivers, structural/material acceptance, complete-save evidence, owners/interfaces, technical acceptance, and accepted commissioning methods/pass criteria. Actual commissioning results are post-build G17/G19 evidence and cannot close G02.',
        INPUTS.d06DetailedSetout,
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
    status: 'HOLD',
    evidence: [sources.geometryCoordination, sources.d05FutureStateContract,
      sources.d02ClosedDrainage, sources.d05FutureMountain,
      sources.d06LifeSafety, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.b11OwnerAcceptance, sources.ownerReviewAcceptance,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.proposedOwnershipInterfaces, sources.g03CanonicalSetout,
      sources.d02C01OwnershipLoadingInterface,
      sources.siteGateAudit],
    blockers: [
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
    status: 'HOLD',
    evidence: [sources.geometryCoordination, sources.d05FutureStateContract,
      sources.d02ClosedDrainage, sources.d05FutureMountain,
      sources.d06LifeSafety, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.b11OwnerAcceptance, sources.ownerReviewAcceptance,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.proposedOwnershipInterfaces, sources.g03CanonicalSetout,
      sources.d02C01OwnershipLoadingInterface,
      sources.siteGateAudit],
    blockers: [
      blocker(
        'R00-G05-INTERFACE-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        `Close every null technical counterpart and accept one immutable set of exact directional contracts. The current proposal has ${proposedOwnershipInterfaces.proposedDirectionalInterfaceRegistry?.contractCount ?? 0} default-deny contracts, ${proposedOwnershipInterfaces.proposedDirectionalInterfaceRegistry?.exactInterfaceCellSetCount ?? 0} exact interface cell sets, and ${proposedOwnershipInterfaces.proposedDirectionalInterfaceRegistry?.nullInterfaceCellSetCount ?? 0} null/HOLD interfaces.`,
        INPUTS.proposedOwnershipInterfaces,
      ),
      blocker(
        'R00-G05-GLOBAL-INTERFACE-GATE',
        'OFFLINE_ACTION',
        'Regenerate the default-deny global cross-scope audit after G03 completion; require exact transitions/states and zero undeclared seams with no wildcard, shared owner, silent clipping, or last-writer-wins rule.',
        INPUTS.proposedOwnershipInterfaces,
      ),
    ],
  },
  {
    id: 'G06_PROTECTED_FEATURES',
    status: relics.g06Disposition?.status === 'PASS' ? 'PASS' : 'HOLD',
    evidence: [sources.protectedRelicClearance, sources.phase0Evidence,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureMountain, sources.cheyenneJcurve,
      sources.autonomousDesignSelections, sources.d05OwnerAcceptance,
      sources.d05SupportMaterialDesign,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.g03CanonicalSetout,
      sources.g06ProposedClearance],
    blockers: relics.g06Disposition?.status === 'PASS' ? [] : [
      blocker(
        'R00-G06-RELIC-REVIEW',
        'EXTERNAL_EVIDENCE',
        `Review and accept positive-margin structural, hydrology, access, staging, settlement, erosion, and construction-method influence kernels. The current audit evaluates all ${g06ProposedClearance.gate?.exactNonNullG03DomainCount ?? 0} exact G03 domains with ${g06ProposedClearance.gate?.nullUnknownDomainCount ?? 0} null domains remaining, and discloses the exact ${g06ProposedClearance.gate?.exactG03ProtectedCoreOverlapCellCount ?? 0}-cell P1-B10 influence overlap with the shipwreck core; the same cells remain visible in D05 support evidence.`,
        INPUTS.g06ProposedClearance,
      ),
      blocker(
        'R00-G06-EXACT-DESIGN-CLEARANCE',
        'OFFLINE_ACTION',
        'After G03/null-domain completion and a complete save, rerun the exact all-start/entity/POI clearance against every accepted protected core/buffer and the complete proposed construction/interaction/influence union.',
        INPUTS.g06ProposedClearance,
      ),
    ],
  },
  {
    id: 'G07_CIVIL_HYDROLOGY_STRUCTURE',
    status: 'HOLD',
    evidence: [sources.c1CivilDesign, sources.d02AuthorityPacket,
      sources.d02RegionEvidence, sources.d02HydrologyOutfalls,
      sources.d02ClosedDrainage, sources.d02TechnicalDesign,
      sources.d02C01OwnershipLoadingInterface,
      sources.completeSaveIntake,
      sources.d05HydrologyRelicDesign,
      sources.d05ConservativeDefaults, sources.d05RelicSurvey,
      sources.d05FutureStateContract, sources.d05FutureMountain,
      sources.d05FutureState, sources.d05SupportMaterialDesign,
      sources.emptyEightGeologyDesign, sources.d06EgressGeometryDesign,
      sources.d06LifeSafety, sources.d06Mechanisms, sources.d06DetailedSetout,
      sources.connectorGeometry, sources.cheyenneJcurve,
      sources.b09TechnicalSystem, sources.b11SurfaceRoadTechnical,
      sources.b12PassiveShell, sources.proposedOwnershipInterfaces,
      sources.residualSurfaceConnectorDomains,
      sources.civilLifeSafetyDomainClosure,
      sources.g03CanonicalSetout, sources.g06ProposedClearance,
      sources.autonomousDesignSelections, sources.d02OwnerAcceptance,
      sources.d05OwnerAcceptance, sources.d06OwnerAcceptance,
      sources.ownerReviewBundle, sources.ownerReviewAcceptance],
    blockers: [
      blocker(
        'R00-G07-EXPERT-DESIGN-ACCEPTANCE',
        'EXTERNAL_EVIDENCE',
        'Complete and independently accept the remaining D02 civil/C01, D05 hydrology/geotechnical/relic, B09, Grand Avenue/B12, and D06 functional life-safety engineering against one complete saved-world and design identity.',
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
    completeSaveIntakePassed: completeSaveIntake.summary?.passed === true,
    completeSaveIntakeRegionFileCount: completeSaveIntake.summary?.regionFileCount ?? 0,
    completeSaveIntakeEntityFileCount: completeSaveIntake.summary?.entityFileCount ?? 0,
    completeSaveIntakePoiFileCount: completeSaveIntake.summary?.poiFileCount ?? 0,
    completeSaveIntakeLevelDatPresent: completeSaveIntake.summary?.levelDatPresent === true,
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
    g03CanonicalExactScopeCount: g03CanonicalSetout.gate?.exactScopeCount ?? 0,
    g03CanonicalUnresolvedDomainCount: g03CanonicalSetout
      .gate?.unresolvedRequiredDomainCount ?? 0,
    g03CanonicalPassed: g03SetoutPassed,
    g06NonNullDomainCount: g06ProposedClearance.gate?.exactNonNullG03DomainCount ?? 0,
    g06NullUnknownDomainCount: g06ProposedClearance.gate?.nullUnknownDomainCount ?? 0,
    g06SupportShipwreckOverlapCellCount: g06ProposedClearance
      .supportEvidenceAudit?.protectedCores?.overlapCellCount ?? 0,
    autonomousOfflineWorkMayContinue: true,
    autonomousOfflineWorkCanCompleteR00: false,
    nextAutonomousArtifact: 'maintain the guarded capture tooling and documentation package; obtain explicit live helper-install/capture authority before complete-save intake, then resolve the exact shipwreck treatment and remaining technical/interface acceptance holds against one immutable identity',
    externalEvidenceStillRequired: true,
  },
};

const markdown = `# Combined Zones Phase 1 R00 readiness audit\n\n`
  + `Status: **${report.status} — READ-ONLY — ZERO OPERATIONS**\n\n`
  + `This audit evaluates only the nonphysical R00 design-freeze gates G01-G07. It does not use R01 pilot, execution, rollback, route-QA, or post-state evidence to close a design decision.\n\n`
  + `## Sequencing result\n\n`
  + `The evidence graph is cycle-free: **${descendantEvidenceCycleFree ? 'PASS' : 'FAIL'}**. The required order is D01-D07 design acceptance → R00 freeze → R01 physical validation → R02 eligibility.\n\n`
  + `The owner-delegated ledger freezes **${report.summary.ownerDelegatedSelectionCount}** conservative planning choices. The sole owner accepted four exact review packets under owner-review payload \`${report.summary.ownerReviewBundlePayloadSha256}\`, bound by acceptance-record payload \`${report.summary.ownerReviewAcceptancePayloadSha256}\`. The acceptance freezes P1-B11 and the planning policies/checklists but passes zero technical HOLDs. No additional human decision-makers are required. The remaining holds are technical evidence, exact-cell compilation, independent checks, ownership/interface cellsets, and later release authorization.\n\n`
  + `## R00 gates\n\n`
  + `| Gate | Status | Current blockers |\n|---|---|---:|\n`
  + gates.map((gate) => `| ${gate.id} | **${gate.status}** | ${gate.blockers.length} |`).join('\n')
  + `\n\nG01 is ${authorityPassed ? 'ready from the current hash-bound authority chain' : 'not ready'} and G03 is ${g03SetoutPassed ? 'ready with all 30 required domains exact' : 'not ready'}. G02 and G04-G07 remain fail-closed; the current evidence cannot autonomously complete R00.\n\n`
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
