#!/usr/bin/env node
/**
 * Compile an exact, reference-indexed D05 support-treatment and material
 * proposal from the frozen FM-01 future-state ledger. This compiler does not
 * accept support, material, ownership, influence, access, or construction
 * cells and emits no operations.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-05T02:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d05-support-material-design.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d05-support-material-design.md',
));

const INPUTS = Object.freeze({
  ownerAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05OwnerPacket: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  d05FutureMountain:
    'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  d05HydrologyRelic:
    'docs/masterplans/05-combined-zones/phase1-d05-hydrology-relic-buffer-design.json',
  d05ConservativeDefaults:
    'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05RelicSurvey:
    'docs/masterplans/05-combined-zones/phase1-d05-relic-condition-access-survey.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d06Egress: 'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  d06Mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  completeSaveAudit:
    'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit.json',
});

const ROLES = Object.freeze({
  ownerAcceptance: 'sole-owner D05 planning-policy acceptance with technical HOLDs retained',
  d05FutureState: 'exact FM-01 sparse material proposal and exhaustive support-gap classification',
  d05OwnerPacket: 'canonical material policy, support classes, technical criteria, and owner/interface contracts',
  d05FutureMountain: 'selected FM-01 alternative and route/relic material boundary',
  d05HydrologyRelic: 'immutable fluid/cryosphere census and three exact protected cores',
  d05ConservativeDefaults: 'no-diversion, relic-preservation, and unknown-influence default-deny policy',
  d05RelicSurvey: 'current relic condition and access evidence with no observation access authorization',
  connectorGeometry: 'exact B09 planning profile and construction HOLD',
  d06Egress: 'two exact dry/disjoint external continuation reservations',
  d06Mechanisms: 'exact D06 full protected-core reservations and all-mechanism HOLD',
  completeSaveAudit: 'complete-save intake result and exact missing members',
});

const SUPPORT_OVERLAY_PREAMBLE
  = 'combined-zones-d05-support-treatment-overlay-v1\n';
const DIRECT_MATERIAL_OVERLAY_PREAMBLE
  = 'combined-zones-d05-direct-material-overlay-v1\n';

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(absolute(relativePath));
  return { path: relativePath, sha256: sha256(data), bytes: data.length, role };
}

function canonicalJson(valueToEncode) {
  if (valueToEncode === null || typeof valueToEncode !== 'object') {
    return JSON.stringify(valueToEncode);
  }
  if (Array.isArray(valueToEncode)) {
    return `[${valueToEncode.map(canonicalJson).join(',')}]`;
  }
  return `{${Object.keys(valueToEncode).sort().map((key) => (
    `${JSON.stringify(key)}:${canonicalJson(valueToEncode[key])}`
  )).join(',')}}`;
}

function manifest(records, preamble) {
  const lines = records.map((record) => canonicalJson(record));
  const bytes = `${preamble}${lines.map((line) => `${line}\n`).join('')}`;
  return {
    algorithm: 'SHA-256',
    preamble,
    record: 'canonical JSON object with lexicographically sorted keys; one newline-terminated record per exact source sparse family',
    recordCount: records.length,
    sha256: sha256(bytes),
  };
}

function aabbIntersects(left, right) {
  return left.minX <= right.maxX && left.maxX >= right.minX
    && left.minY <= right.maxY && left.maxY >= right.minY
    && left.minZ <= right.maxZ && left.maxZ >= right.minZ;
}

function matrixRow(id, result, scope, evidence, passRule, currentDisposition = null) {
  return { id, result, scope, evidence, passRule, currentDisposition };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
  key,
  binding(relativePath, ROLES[key]),
]));
const owner = readJson(INPUTS.ownerAcceptance);
const future = readJson(INPUTS.d05FutureState);
const packet = readJson(INPUTS.d05OwnerPacket);
const futureMountain = readJson(INPUTS.d05FutureMountain);
const hydrologyRelic = readJson(INPUTS.d05HydrologyRelic);
const conservative = readJson(INPUTS.d05ConservativeDefaults);
const relicSurvey = readJson(INPUTS.d05RelicSurvey);
const connector = readJson(INPUTS.connectorGeometry);
const d06Egress = readJson(INPUTS.d06Egress);
const d06Mechanisms = readJson(INPUTS.d06Mechanisms);
const completeSave = readJson(INPUTS.completeSaveAudit);

assert(owner.status
  === 'OWNER_ACCEPTANCE_RECORDED_PLANNING_POLICY_FROZEN_ALL_TECHNICAL_HOLDS_RETAINED',
'Owner-acceptance status drift');
assert(owner.effectivePlanningDisposition?.d05PlanningPolicyAccepted === true
  && owner.effectivePlanningDisposition?.technicalHoldPassedCount === 0
  && owner.disposition?.allTechnicalHoldsRetained === true,
'D05 planning acceptance must retain all technical HOLDs');
assert(future.status
  === 'PARTIAL_PASS_EXACT_SPARSE_FUTURE_STATE_PROPOSAL_AND_SUPPORT_CLASSIFICATION_D05_G02_HOLD',
'D05 future-state status drift');
assert(future.reportIdentitySha256
  === 'ee688150305dd4cda34c56003054d7251bf2166e5ddfd5c8c494840eb31c614b',
'D05 future-state report identity drift');
assert(packet.status === 'OWNER_ACCEPTANCE_PACKET_READY_POLICY_AND_TECHNICAL_D05_G02_HOLD',
  'D05 owner-packet status drift');
assert(futureMountain.status
  === 'PARTIAL_PASS_EXACT_FUTURE_MOUNTAIN_ALTERNATIVES_RECOMMENDATION_ONLY_D05_G02_HOLD',
'D05 future-mountain status drift');
assert(hydrologyRelic.status === 'PARTIAL_PASS_EXACT_BASELINE_AND_BUFFER_CANDIDATES_D05_HOLD',
  'D05 hydrology/relic status drift');
assert(conservative.status === 'RECOMMENDATION_READY_D05_AND_G06_HOLD',
  'D05 conservative-default status drift');
assert(relicSurvey.status === 'D05_S01_OFFLINE_SURVEY_COMPLETE_D05_G06_HOLD',
  'D05 relic-survey status drift');
assert(connector.status
  === 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
'Connector-geometry status drift');
assert(d06Egress.status
  === 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN',
'D06 egress status drift');
assert(d06Mechanisms.status
  === 'PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD',
'D06 mechanism-contract status drift');
assert(completeSave.status === 'HOLD_INCOMPLETE_OR_UNBOUND_SAVE'
  && completeSave.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === false,
'Complete-save audit must remain HOLD');

const immutableRegionSha256 = hydrologyRelic.sourceBindings
  .immutablePhase0PostRegionSnapshot.sha256;
assert(immutableRegionSha256
  === '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b'
  && immutableRegionSha256
    === conservative.immutableEvidenceIdentity.snapshot.sha256
  && immutableRegionSha256
    === packet.immutableEvidenceIdentity.snapshot.sha256
  && immutableRegionSha256
    === d06Egress.immutableSnapshot.sha256,
'Immutable snapshot identity drift across D05/D06 inputs');

const selected = future.selectedPlanningIdentity;
assert(selected.modelId === 'FM-01-COMPACT-EAST-FACE'
  && selected.modelIdentitySha256
    === packet.immutableEvidenceIdentity.modelIdentity.modelIdentitySha256,
'FM-01 selected planning identity drift');
assert(selected.boundCandidateAddedSolidIntervals.candidateAddedSolidCellCount === 14_768_553
  && selected.boundCandidateAddedSolidIntervals.intervalManifestSha256
    === packet.selectedFm01PlanningBasis.candidateAddedSolidIntervals.intervalManifestSha256,
'FM-01 candidate interval identity drift');
assert(future.sparseCanonicalFutureStateProposal.partitionComplete === true
  && future.sparseCanonicalFutureStateProposal.exactProposalPartitionCellCount === 14_768_553
  && future.sparseCanonicalFutureStateProposal.acceptedFutureCellCount === 0
  && future.sparseCanonicalFutureStateProposal.acceptedConstructionCellCount === 0,
'D05 sparse direct proposal boundary drift');

const materialClassMap = new Map(packet.canonicalMaterialStatePlan.stateClasses.map((item) => [
  item.id,
  item,
]));
const bulkMaterialClass = materialClassMap.get('MAT-BULK-STRUCTURAL-FILL-CANDIDATE');
const lowerFinishClass = materialClassMap.get('MAT-LOWER-ARCHITECTURAL-FINISH-CANDIDATE');
const upperFinishClass = materialClassMap.get('MAT-UPPER-ARCHITECTURAL-FINISH-CANDIDATE');
const supportMaterialClass = materialClassMap.get('MAT-SUPPORT-LINER-RETAINING');
const cryosphereSurfaceClass = materialClassMap.get(
  'MAT-SURFACE-CAP-CRYOSPHERE-LANDSCAPE',
);
assert(bulkMaterialClass?.futureCanonicalState === 'minecraft:stone'
  && lowerFinishClass?.futureCanonicalState === 'minecraft:smooth_stone'
  && upperFinishClass?.futureCanonicalState === 'minecraft:polished_diorite'
  && supportMaterialClass?.futureCanonicalState === null
  && cryosphereSurfaceClass?.futureCanonicalState === null,
'D05 canonical material-state policy drift');

const typedFamilyMap = new Map(future.typedDirectAndInfluenceFamilies.map((item) => [
  item.familyId,
  item,
]));
const bulkSource = typedFamilyMap.get('fill-direct');
const finishSource = typedFamilyMap.get('surface-finish-direct');
assert(bulkSource?.proposalCellCount === 14_580_291
  && bulkSource.proposalCanonicalStateCounts?.['minecraft:stone'] === 14_580_291
  && finishSource?.proposalCellCount === 188_262
  && finishSource.proposalCanonicalStateCounts?.['minecraft:smooth_stone'] === 77_395
  && finishSource.proposalCanonicalStateCounts?.['minecraft:polished_diorite'] === 110_867,
'Exact direct material proposal family drift');

const directMaterialFamilies = [
  {
    id: 'D05-MAT-BULK-STRUCTURAL-FILL-PROPOSAL',
    sourceFamilyId: bulkSource.familyId,
    sourceProposalSparseManifestSha256: bulkSource.proposalSparseManifestSha256,
    exactProposalCellCount: bulkSource.proposalCellCount,
    exactProposalColumnRecordCount: bulkSource.proposalColumnRecordCount,
    exactProposalIntervalCount: bulkSource.proposalIntervalCount,
    proposedTreatmentClass: 'MOUNTAIN-BULK-FILL',
    proposedCanonicalStateCounts: bulkSource.proposalCanonicalStateCounts,
    proposedMaterialClassIds: [bulkMaterialClass.id],
    proposedOwnerClass: bulkSource.proposalOwnerClass,
    influenceAssumptionId: 'INF-D05-DIRECT-NO-IMPLICIT-EXPANSION',
    maintenanceAccessAssumptionId: 'ACC-D05-NONE-INFERRED',
    acceptedCellCount: 0,
    acceptedMaterialStateManifestSha256: null,
    status: 'PASS_EXACT_PROPOSAL_ONLY_TECHNICAL_ACCEPTANCE_HOLD',
  },
  {
    id: 'D05-MAT-EXPOSED-SURFACE-FINISH-PROPOSAL',
    sourceFamilyId: finishSource.familyId,
    sourceProposalSparseManifestSha256: finishSource.proposalSparseManifestSha256,
    exactProposalCellCount: finishSource.proposalCellCount,
    exactProposalColumnRecordCount: finishSource.proposalColumnRecordCount,
    exactProposalIntervalCount: finishSource.proposalIntervalCount,
    proposedTreatmentClass: 'MOUNTAIN-EXPOSED-ARCHITECTURAL-FINISH',
    proposedCanonicalStateCounts: finishSource.proposalCanonicalStateCounts,
    proposedMaterialClassIds: [lowerFinishClass.id, upperFinishClass.id],
    deterministicStateRule: 'Y < 130 -> minecraft:smooth_stone; Y >= 130 -> minecraft:polished_diorite, exactly as already encoded in the bound source sparse proposal.',
    cryosphereLandscapeSurfaceCapState: null,
    proposedOwnerClass: finishSource.proposalOwnerClass,
    influenceAssumptionId: 'INF-D05-DIRECT-NO-IMPLICIT-EXPANSION',
    maintenanceAccessAssumptionId: 'ACC-D05-NONE-INFERRED',
    acceptedCellCount: 0,
    acceptedMaterialStateManifestSha256: null,
    status: 'PASS_EXACT_PROPOSAL_ONLY_CRYOSPHERE_AND_TECHNICAL_ACCEPTANCE_HOLD',
  },
];
const directMaterialOverlayRecords = directMaterialFamilies.map((family) => ({
  familyId: family.id,
  sourceFamilyId: family.sourceFamilyId,
  sourceProposalSparseManifestSha256: family.sourceProposalSparseManifestSha256,
  exactProposalCellCount: family.exactProposalCellCount,
  proposedTreatmentClass: family.proposedTreatmentClass,
  proposedCanonicalStateCounts: family.proposedCanonicalStateCounts,
  proposedMaterialClassIds: family.proposedMaterialClassIds,
  influenceAssumptionId: family.influenceAssumptionId,
  maintenanceAccessAssumptionId: family.maintenanceAccessAssumptionId,
}));
const directMaterialOverlayManifest = manifest(
  directMaterialOverlayRecords,
  DIRECT_MATERIAL_OVERLAY_PREAMBLE,
);
for (const family of directMaterialFamilies) {
  const record = directMaterialOverlayRecords.find(({ familyId }) => familyId === family.id);
  family.referenceIndexedOverlayRecordSha256 = sha256(
    `${DIRECT_MATERIAL_OVERLAY_PREAMBLE}${canonicalJson(record)}\n`,
  );
}

const supportSource = future.supportGapStatusLedger;
assert(supportSource.status
  === 'PASS_EXACT_EXHAUSTIVE_STATUS_CLASSIFICATION_TREATMENT_ACCEPTANCE_HOLD'
  && supportSource.cellCount === 754_224
  && supportSource.classifiedCellCount === 754_224
  && supportSource.unclassifiedCellCount === 0
  && supportSource.multiplyClassifiedCellCount === 0
  && supportSource.boundIntervalManifestSha256
    === selected.boundSupportGap.intervalManifestSha256,
'Support-gap exhaustive classification drift');
assert(supportSource.families.length === 9, 'Expected nine exact support status families');

const supportMaterialPolicy = new Map([
  ['SUPPORT-STATUS-RELIC-PRESERVE', {
    treatmentClass: 'SUPPORT-RETAIN-VOID',
    materialClassId: 'MAT-CURRENT-STATE-RETAINED',
    canonicalState: null,
    decision: 'PROPOSE_RETAIN_VOID_PRESERVE_CURRENT_STATE_TOKEN_STATE_REQUIRES_COMPLETE_SAVE',
    reason: 'The exact relic-planning-exclusion intersection remains unchanged; no support, fill, access, or expert influence is inferred.',
  }],
  ['SUPPORT-STATUS-B08-RESERVATION', {
    treatmentClass: 'SUPPORT-RETAIN-VOID',
    materialClassId: 'MAT-ROUTE-PASSABLE-CANDIDATE',
    canonicalState: null,
    decision: 'PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS',
    reason: 'B08 is an exact planning reservation only; lining, support, and passable states remain separate technical work.',
  }],
  ['SUPPORT-STATUS-B09-RESERVATION', {
    treatmentClass: 'SUPPORT-RETAIN-VOID',
    materialClassId: 'MAT-B09-GUIDEWAY-STATION-MECHANISM',
    canonicalState: null,
    decision: 'PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS',
    reason: 'B09 planning accommodation remains withheld from fill; its guideway, station, support, and maintenance systems are null.',
  }],
  ['SUPPORT-STATUS-D06-RESERVATION', {
    treatmentClass: 'SUPPORT-RETAIN-VOID',
    materialClassId: 'MAT-ROUTE-PASSABLE-CANDIDATE',
    canonicalState: null,
    decision: 'PROPOSE_RETAIN_VOID_ZERO_CURRENT_SUPPORT_GAP_CELLS',
    reason: 'D06 external continuations remain closed reference reservations with no mechanism or lining state.',
  }],
  ['SUPPORT-STATUS-WATER-ADJACENT', {
    treatmentClass: null,
    materialClassId: 'MAT-SUPPORT-LINER-RETAINING',
    canonicalState: null,
    decision: 'HOLD_NULL_HYDROLOGY_AND_GEOTECHNICAL_TREATMENT',
    reason: 'Current water adjacency is not a groundwater, dewatering, capacity, receiver, or component-treatment model.',
  }],
  ['SUPPORT-STATUS-LAVA-ADJACENT', {
    treatmentClass: null,
    materialClassId: 'MAT-SUPPORT-LINER-RETAINING',
    canonicalState: null,
    decision: 'HOLD_NULL_HYDROLOGY_THERMAL_AND_GEOTECHNICAL_TREATMENT',
    reason: 'A zero-cell current family remains explicitly typed but does not create a reusable treatment default.',
  }],
  ['SUPPORT-STATUS-FROZEN-ADJACENT', {
    treatmentClass: null,
    materialClassId: 'MAT-SURFACE-CAP-CRYOSPHERE-LANDSCAPE',
    canonicalState: null,
    decision: 'HOLD_NULL_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT',
    reason: 'Frozen adjacency does not authorize melt, replacement, retaining, drainage, or future cap state.',
  }],
  ['SUPPORT-STATUS-SNOW-ADJACENT', {
    treatmentClass: null,
    materialClassId: 'MAT-SURFACE-CAP-CRYOSPHERE-LANDSCAPE',
    canonicalState: null,
    decision: 'HOLD_NULL_CRYOSPHERE_AND_GEOTECHNICAL_TREATMENT',
    reason: 'Snow adjacency does not authorize melt, removal, load, erosion, drainage, or future cap state.',
  }],
  ['SUPPORT-STATUS-OTHER-SURFACE', {
    treatmentClass: 'SUPPORT-ENGINEERED-FILL',
    materialClassId: 'MAT-SUPPORT-LINER-RETAINING',
    canonicalState: null,
    decision: 'PROPOSE_TREATMENT_CLASS_STATE_NULL_GEOTECHNICAL_ACCEPTANCE_HOLD',
    reason: 'The exact non-fluid/non-cryosphere family supports an engineered-fill design branch, but the owner material policy forbids assigning bulk stone to support work without geotechnical acceptance.',
  }],
]);

const supportTreatmentFamilies = supportSource.families.map((sourceFamily) => {
  const policy = supportMaterialPolicy.get(sourceFamily.id);
  assert(policy, `No support material policy for ${sourceFamily.id}`);
  assert(policy.treatmentClass === sourceFamily.proposedTreatmentClass,
    `Support treatment-class drift for ${sourceFamily.id}`);
  return {
    id: `D05-TREAT-${sourceFamily.id}`,
    sourceSupportStatusFamilyId: sourceFamily.id,
    sourcePrecedence: sourceFamily.precedence,
    sourceClassificationBasis: sourceFamily.classificationBasis,
    exactCellCount: sourceFamily.cellCount,
    exactColumnCount: sourceFamily.columnCount,
    exactBounds: sourceFamily.bounds,
    exactCoordinateSetSha256: sourceFamily.coordinateSetSha256,
    sourceSparseIntervalRecordCount: sourceFamily.sparseIntervalRecordCount,
    sourceSparseIntervalManifestSha256: sourceFamily.sparseIntervalManifestSha256,
    proposedTreatmentClass: policy.treatmentClass,
    proposedMaterialClassId: policy.materialClassId,
    proposedCanonicalState: policy.canonicalState,
    proposalDecision: policy.decision,
    reason: policy.reason,
    influenceAssumptionId: sourceFamily.id === 'SUPPORT-STATUS-RELIC-PRESERVE'
      ? 'INF-D05-RELIC-EXPERT-SUPPORT-ACCESS-NULL'
      : 'INF-D05-GEOTECH-HYDROLOGY-KERNELS-NULL',
    maintenanceAccessAssumptionId: 'ACC-D05-NONE-INFERRED',
    acceptedTreatment: false,
    acceptedCellCount: 0,
    acceptedCanonicalStateManifestSha256: null,
    acceptedOwnerAssignmentCount: 0,
    status: policy.decision.startsWith('HOLD_')
      ? policy.decision
      : `${policy.decision}_NOT_ACCEPTED`,
  };
});
const supportOverlayRecords = supportTreatmentFamilies.map((family) => ({
  familyId: family.id,
  sourceSupportStatusFamilyId: family.sourceSupportStatusFamilyId,
  sourceSparseIntervalManifestSha256: family.sourceSparseIntervalManifestSha256,
  exactCoordinateSetSha256: family.exactCoordinateSetSha256,
  exactCellCount: family.exactCellCount,
  proposedTreatmentClass: family.proposedTreatmentClass,
  proposedMaterialClassId: family.proposedMaterialClassId,
  proposedCanonicalState: family.proposedCanonicalState,
  influenceAssumptionId: family.influenceAssumptionId,
  maintenanceAccessAssumptionId: family.maintenanceAccessAssumptionId,
}));
const supportTreatmentOverlayManifest = manifest(
  supportOverlayRecords,
  SUPPORT_OVERLAY_PREAMBLE,
);
for (const family of supportTreatmentFamilies) {
  const record = supportOverlayRecords.find(({ familyId }) => familyId === family.id);
  family.referenceIndexedOverlayRecordSha256 = sha256(
    `${SUPPORT_OVERLAY_PREAMBLE}${canonicalJson(record)}\n`,
  );
}

const classifiedSupportCellCount = supportTreatmentFamilies.reduce(
  (sum, family) => sum + family.exactCellCount,
  0,
);
const treatmentClassProposedSupportCellCount = supportTreatmentFamilies
  .filter((family) => family.proposedTreatmentClass !== null)
  .reduce((sum, family) => sum + family.exactCellCount, 0);
const treatmentClassNullSupportCellCount = supportTreatmentFamilies
  .filter((family) => family.proposedTreatmentClass === null)
  .reduce((sum, family) => sum + family.exactCellCount, 0);
const proposedCanonicalStateSupportCellCount = supportTreatmentFamilies
  .filter((family) => family.proposedCanonicalState !== null)
  .reduce((sum, family) => sum + family.exactCellCount, 0);
assert(classifiedSupportCellCount === 754_224
  && treatmentClassProposedSupportCellCount === 17_997
  && treatmentClassNullSupportCellCount === 736_227
  && proposedCanonicalStateSupportCellCount === 0,
'Support treatment/material accounting drift');

const proposedMaterialRegistry = {
  sourcePlanId: packet.canonicalMaterialStatePlan.planId,
  architecturalTransitionWorldStudyY:
    packet.canonicalMaterialStatePlan.architecturalTransitionWorldStudyY,
  directProposalClasses: [bulkMaterialClass, lowerFinishClass, upperFinishClass],
  supportAndSurfaceTechnicalGapClasses: [supportMaterialClass, cryosphereSurfaceClass],
  canonicalDirectProposalStateCounts:
    future.sparseCanonicalFutureStateProposal.canonicalCandidateStateCounts,
  supportCanonicalStateCount: 0,
  acceptedMaterialClassCount: 0,
  acceptedStateRecordCount: 0,
  acceptedCoordinateSetSha256: null,
  acceptedBlockStateSetSha256: null,
  qualification: 'Stone, smooth-stone, and polished-diorite states are exact direct proposal states already encoded in the bound sparse future-state proposal. No state is accepted, and no support/liner/retaining or cryosphere/landscape state is assigned.',
};

const influenceAndMaintenanceAccessAssumptions = {
  influenceAssumptions: [
    {
      id: 'INF-D05-DIRECT-NO-IMPLICIT-EXPANSION',
      appliesTo: ['bulk structural fill proposal', 'exposed surface finish proposal'],
      exactInfluenceCellManifest: null,
      rule: 'Direct proposal cells create no inferred buffer; groundwater, infiltration, erosion, settlement, surcharge, retaining, and cryosphere influence remain unknown and nonzero-by-default.',
      status: 'HOLD_EXPERT_FINITE_KERNELS_NOT_AVAILABLE',
    },
    {
      id: 'INF-D05-GEOTECH-HYDROLOGY-KERNELS-NULL',
      appliesTo: ['all support-gap families except relic preserve'],
      exactInfluenceCellManifest: null,
      rule: 'No narrative radius, adjacency count, generic buffer, boundary clip, or empty unknown set may substitute for accepted finite treatment-class kernels and component closure.',
      status: 'HOLD_EXPERT_FINITE_KERNELS_NOT_AVAILABLE',
    },
    {
      id: 'INF-D05-RELIC-EXPERT-SUPPORT-ACCESS-NULL',
      appliesTo: ['SUPPORT-STATUS-RELIC-PRESERVE', 'three exact protected cores'],
      exactInfluenceCellManifest: null,
      rule: 'The 4,890-cell minimum planning exclusion is a default-deny planning control, not an expert structural, groundwater, staging, equipment, or access influence set.',
      status: 'HOLD_RELIC_EXPERT_INFLUENCE_NOT_AVAILABLE',
    },
  ],
  maintenanceAndStagingAccess: {
    exactMaintenanceAccessCellManifest: null,
    exactConstructionStagingCellManifest: null,
    exactEquipmentSweptVolumeManifest: null,
    exactRestorationCellManifest: null,
    widthOrRouteInferencePermitted: false,
    relicObservationAccessAuthorized: false,
    b09MaintenanceAndRescueSystemAccepted: false,
    status: 'HOLD_NO_EXACT_MAINTENANCE_STAGING_EQUIPMENT_OR_RESTORATION_SETS',
  },
  acceptedInfluenceCellCount: 0,
  acceptedMaintenanceAccessCellCount: 0,
};
assert(relicSurvey.observationAccessAuthorized === false
  && future.typedDirectAndInfluenceFamilies.find(
    ({ familyId }) => familyId === 'construction-staging-and-access',
  )?.proposalCellCount === null,
'Access evidence unexpectedly advanced');

const fm01Bounds = {
  minX: selected.formula.center.x - selected.formula.extents.west,
  maxX: selected.formula.center.x + selected.formula.extents.east,
  minY: 72,
  maxY: selected.formula.peakSurfaceY,
  minZ: selected.formula.center.z - selected.formula.extents.north,
  maxZ: selected.formula.center.z + selected.formula.extents.south,
};
const d06FullCores = d06Mechanisms.mechanismDevelopmentPayload
  .protectedEgressAndLiftSystems.map((system) => ({
    id: system.coreId,
    bounds: system.combinedProtectedCoreReservation.bounds,
    cellCount: system.combinedProtectedCoreReservation.cellCount,
    coordinateSetSha256: system.combinedProtectedCoreReservation.coordinateSetSha256,
  }));
assert(d06FullCores.length === 2
  && d06FullCores.every(({ bounds }) => !aabbIntersects(fm01Bounds, bounds)),
'D06 protected core unexpectedly intersects FM-01 proposal bounds');
assert(future.exactReservationsAndInterfaces.d06ExternalContinuations.every(
  ({ fm01SupportGapIntersectionCellCount }) => fm01SupportGapIntersectionCellCount === 0,
), 'D06 egress/support-gap intersection drift');

const protectedCores = hydrologyRelic.protectedRelicBufferCandidates.map((record) => ({
  relicKey: record.relicKey,
  exactProtectedCore: record.protectedCore,
}));
assert(protectedCores.length === 3
  && future.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion
    .excludedFromCandidateFill === true,
'Protected relic planning-exclusion drift');

const conflictAndReservationChecks = [
  {
    id: 'CONFLICT-D05-PROTECTED-RELIC-EXCLUSION',
    result: 'PASS_PLANNING_SUBTRACTION_ONLY',
    exactProtectedCoreCount: protectedCores.length,
    exactMinimumPlanningExclusionCellCount:
      future.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion.cellCount,
    withheldCandidateFillCellCount:
      selected.boundCandidateAddedSolidIntervals.protectedRelicWithheldFillCellCount,
    classifiedSupportPreserveCellCount: supportTreatmentFamilies.find(
      ({ sourceSupportStatusFamilyId }) => (
        sourceSupportStatusFamilyId === 'SUPPORT-STATUS-RELIC-PRESERVE'
      ),
    ).exactCellCount,
    proposedDirectConflictCellCount: 0,
    qualification: 'The exact minimum planning exclusion was subtracted before the direct proposal; expert support/access influence remains null.',
  },
  {
    id: 'CONFLICT-D05-B08-RESERVATION',
    result: 'PASS_PLANNING_SUBTRACTION_ONLY',
    exactReservationCellCount:
      future.exactReservationsAndInterfaces.b08Interaction.cellCount,
    withheldCandidateFillCellCount:
      selected.boundCandidateAddedSolidIntervals.b08WithheldFillCellCount,
    supportGapIntersectionCellCount:
      future.exactReservationsAndInterfaces.b08Interaction.supportGapRawIntersectionCellCount,
    proposedDirectConflictCellCount: 0,
    qualification: 'B08 reservation cells were withheld; technical lining/support/interface states remain null.',
  },
  {
    id: 'CONFLICT-D05-B09-RESERVATION',
    result: 'PASS_PLANNING_SUBTRACTION_ONLY',
    exactReservationCellCount:
      future.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation.cellCount,
    withheldCandidateFillCellCount:
      selected.boundCandidateAddedSolidIntervals.b09WithheldFillCellCount,
    supportGapIntersectionCellCount:
      future.exactReservationsAndInterfaces.b09MinimumPlanningAccommodation
        .supportGapRawIntersectionCellCount,
    proposedDirectConflictCellCount: 0,
    connectorConstructionAuthorized: connector.constructionOwnershipAuthorized,
    qualification: 'The 7,800-cell minimum accommodation is withheld planning geometry, not an accepted guideway, support, station, or maintenance system.',
  },
  {
    id: 'CONFLICT-D05-D06-EGRESS-AND-PROTECTED-CORES',
    result: 'PASS_EXACT_DISJOINT_BOUNDS_AND_ZERO_SUPPORT_INTERSECTION',
    fm01Bounds,
    d06ExternalContinuationCount:
      future.exactReservationsAndInterfaces.d06ExternalContinuations.length,
    d06FullProtectedCoreCount: d06FullCores.length,
    d06FullProtectedCores: d06FullCores,
    supportGapIntersectionCellCount: 0,
    proposedDirectConflictCellCount: 0,
    physicalOpeningAuthorized: false,
    qualification: 'D06 cores and continuations are west of FM-01 and remain closed; disjointness does not commission D06.',
  },
  {
    id: 'CONFLICT-D05-CURRENT-FLUID-CRYOSPHERE-DIRECT-REPLACEMENT',
    result: 'PASS_ZERO_DIRECT_REPLACEMENT_ONLY',
    proposedDirectConflictCellCount: 0,
    currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal:
      future.hydrologyAndRelicBoundary
        .currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal,
    topSurfaceAdjacencyDiagnostic: {
      water: typedFamilyMap.get('water-and-lava-direct-interaction')
        .immutableCurrentTopSurfaceAdjacencyDiagnostic.waterCellCount,
      lava: typedFamilyMap.get('water-and-lava-direct-interaction')
        .immutableCurrentTopSurfaceAdjacencyDiagnostic.lavaCellCount,
      frozen: typedFamilyMap.get('frozen-and-snow-direct-interaction')
        .immutableCurrentTopSurfaceAdjacencyDiagnostic.frozenCellCount,
      snow: typedFamilyMap.get('frozen-and-snow-direct-interaction')
        .immutableCurrentTopSurfaceAdjacencyDiagnostic.snowCellCount,
    },
    noDiversionTechnicallyAccepted: false,
    qualification: 'Zero direct replacement is not zero influence; all hydrology, component, cryosphere, erosion, and surface-cap effects remain HOLD.',
  },
];
assert(conflictAndReservationChecks.every(({ proposedDirectConflictCellCount }) => (
  proposedDirectConflictCellCount === 0
)), 'A planning conflict unexpectedly remains in the direct proposal');

const technicalAmbiguityDisposition = {
  removedByThisArtifact: [
    'Every one of the 14,768,553 exact direct proposal cells is bound to the existing bulk or exposed-finish sparse material proposal and owner-policy material class.',
    'Every one of the 754,224 exact support-gap cells has one reference-indexed treatment/material record tied to its coordinate and sparse-interval hashes.',
    'Exactly 17,997 support cells have a proposed treatment class: 363 relic-preserve retain-void cells and 17,634 other-surface engineered-fill candidate cells.',
    'Exactly 736,227 water/frozen/snow-classified support cells retain null treatment; the zero-cell lava family is also explicit and cannot become a default.',
    'No support cell receives a canonical material state; bulk stone is not silently reused for support, liner, retaining, cryosphere, or landscape work.',
    'D06 egress/full cores are exactly disjoint, and B08/B09/relic planning reservations remain explicitly subtracted from the direct proposal.',
  ],
  genuinelyRequiresCompleteSave: [
    'One same-moment world root containing region/, entities/, poi/, level.dat, and a valid exact capture manifest.',
    'Entity, POI, world-metadata, and full-state source guards for every future support, access, staging, and construction record.',
  ],
  genuinelyRequiresEngineeringAcceptance: [
    'Geotechnical treatment, canonical support/liner/retaining states, load/stability/foundation criteria, and exact influence cells for all support families.',
    'Groundwater, infiltration, dewatering, sump, erosion, drainage, discharge, receiver, snow/ice, and component-accounting rules for the 736,227 hydrology/cryosphere-adjacent support cells and all exposed finishes.',
    'Expert structural, groundwater, staging, equipment-sweep, maintenance, and observation-access influence cells for the three protected relic records.',
    'Exact B09 guideway/station/support/maintenance/rescue design and accepted D06 mechanisms/interfaces.',
    'Exact construction staging, maintenance access, equipment-swept-volume, restoration, owner assignments, and directional interface contracts.',
    'Independent technical acceptance and a separate sole-owner acceptance of one immutable complete technical identity.',
  ],
};

const completeSaveDependency = {
  status: completeSave.status,
  regionFileCount: completeSave.summary.regionFileCount,
  entityFileCount: completeSave.summary.entityFileCount,
  poiFileCount: completeSave.summary.poiFileCount,
  levelDatPresent: completeSave.summary.levelDatPresent,
  captureManifestValid: completeSave.summary.captureManifestValid,
  completeSaveSha256: completeSave.packageIdentity.completeSaveSha256,
  blockers: completeSave.blockers,
  currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_SAVED_WORLD_IDENTITY',
};

const acceptanceMatrix = [
  matrixRow('D05-SM-01-SOURCE-BINDINGS', 'PASS', 'source identity',
    'All eleven direct inputs are hash and byte-count bound.',
    'Every direct input exists and matches its binding.'),
  matrixRow('D05-SM-02-OWNER-PLANNING-POLICY', 'PASS', 'planning policy only',
    'The owner accepted D05 planning policy while passing zero technical HOLDs.',
    'Planning acceptance remains distinct from technical/material acceptance.'),
  matrixRow('D05-SM-03-FM01-DIRECT-PROPOSAL-IDENTITY', 'PASS', 'exact proposal accounting',
    'The 14,768,553-cell direct proposal and its exact source sparse identity reproduce.',
    'The bulk and exposed proposal counts exactly partition the bound candidate cells.'),
  matrixRow('D05-SM-04-BULK-MATERIAL-PROPOSAL', 'PASS_PROPOSAL_ONLY', 'direct proposal material',
    '14,580,291 bulk cells retain the exact proposed minecraft:stone sparse family.',
    'Source sparse hash, counts, treatment class, and owner-policy class reproduce; acceptance remains zero.'),
  matrixRow('D05-SM-05-EXPOSED-FINISH-PROPOSAL', 'PASS_PROPOSAL_ONLY', 'direct proposal material',
    '188,262 exposed cells retain 77,395 smooth-stone and 110,867 polished-diorite proposals.',
    'The Y=130 rule and exact source sparse manifest reproduce; cryosphere/landscape cap stays null.'),
  matrixRow('D05-SM-06-SUPPORT-CLASSIFICATION', 'PASS_CLASSIFICATION_ONLY', 'support accounting',
    'All 754,224 support-gap cells are uniquely classified with zero gap or overlap.',
    'The nine exact family counts/hashes reproduce the bound support-gap identity.'),
  matrixRow('D05-SM-07-SUPPORT-OVERLAY-CONTRACT', 'PASS_PROPOSAL_ONLY', 'treatment overlay',
    'Nine reference-indexed records assign an explicit proposed class or null HOLD to every exact family.',
    'Each overlay binds the exact coordinate/sparse hashes, count, material class, influence, and access assumptions.'),
  matrixRow('D05-SM-08-RESERVATION-CONFLICTS', 'PASS_PLANNING_ONLY', 'relic/B08/B09/D06 conflicts',
    'Direct proposal conflict count is zero by exact subtraction or exact disjoint bounds; support intersections are explicit.',
    'All withheld counts and disjointness checks reproduce without creating technical clearance.'),
  matrixRow('D05-SM-09-ZERO-DIRECT-FLUID-CRYOSPHERE-REPLACEMENT', 'PASS_BOUNDED_ONLY', 'preservation control',
    'The direct proposal replaces zero current water/lava/frozen/snow cells.',
    'Zero direct replacement reproduces and is never represented as no-influence acceptance.'),
  matrixRow('D05-SM-10-HYDROLOGY-CRYOSPHERE-SUPPORT', 'HOLD', '736,227 support cells',
    'Water, frozen, snow, and zero-cell lava families retain null treatment and state.',
    'Accept exact treatment, future components, receiver, drainage, erosion, snow/ice, and failure criteria.',
    'HOLD_HYDROLOGY_CRYOSPHERE_TREATMENTS_NULL'),
  matrixRow('D05-SM-11-OTHER-SURFACE-SUPPORT-STATE', 'HOLD', '17,634 support cells',
    'SUPPORT-ENGINEERED-FILL is proposed, but canonical state, support criteria, and ownership are null.',
    'Accept exact geotechnical treatment and canonical state without defaulting to bulk stone.',
    'HOLD_SUPPORT_ENGINEERED_FILL_STATE_NULL'),
  matrixRow('D05-SM-12-RELIC-SUPPORT-ACCESS', 'HOLD', '363 support cells and expert influence',
    'Retain-void is proposed for the exact relic intersection; complete current states and expert access/influence are absent.',
    'Bind complete-save states and accept exact structural, groundwater, access, staging, and equipment influence.',
    'HOLD_RELIC_EXPERT_SUPPORT_ACCESS_INFLUENCE_NULL'),
  matrixRow('D05-SM-13-EXPOSED-CAP-CRYOSPHERE-LANDSCAPE', 'HOLD', 'future exposed surfaces',
    'Architectural finish is exact as a proposal, but future snow/ice/soil/drainage/erosion cap state is null.',
    'Accept complete exposed-cap and cryosphere/landscape behavior against exact component evidence.',
    'HOLD_FUTURE_SURFACE_CAP_AND_CRYOSPHERE_STATE_NULL'),
  matrixRow('D05-SM-14-INFLUENCE-KERNELS', 'HOLD', 'physics influence',
    'Groundwater, infiltration, dewatering, erosion, settlement, surcharge, retaining, and relic kernels are null.',
    'Accept exact finite offsets, seeds, closure rules, boundaries, owners, and tests.',
    'HOLD_UNKNOWN_INFLUENCE_NOT_ZERO'),
  matrixRow('D05-SM-15-MAINTENANCE-STAGING-ACCESS', 'HOLD', 'temporary and operational access',
    'Maintenance, construction staging, equipment sweep, and restoration manifests are null.',
    'Compile exact cells without width, route, or bounding-box inference.',
    influenceAndMaintenanceAccessAssumptions.maintenanceAndStagingAccess.status),
  matrixRow('D05-SM-16-OWNERS-INTERFACES', 'HOLD', 'canonical authority',
    'Owner classes are proposal labels; accepted exact assignments and interface contracts remain zero.',
    'Assign one owner per cell and one exact directional contract per seam/receiver.',
    'HOLD_OWNER_CLASSES_ARE_NOT_CELL_ASSIGNMENTS'),
  matrixRow('D05-SM-17-COMPLETE-SAVE', 'HOLD', 'source completeness',
    'entities/, poi/, level.dat, capture manifest, and complete-save identity are absent.',
    'Provide and bind one same-moment complete saved-world package.',
    completeSaveDependency.currentResult),
  matrixRow('D05-SM-18-TECHNICAL-MATERIAL-ACCEPTANCE', 'HOLD', 'acceptance identity',
    'Proposed states/treatments are exact where evidence permits, but accepted treatment/material cell count is zero.',
    'All technical rows pass, independent reviewers accept them, and the sole owner separately accepts the full identity.',
    'HOLD_NO_TECHNICAL_OR_COMPLETE_IDENTITY_OWNER_ACCEPTANCE'),
  matrixRow('D05-SM-19-D05-G02-CLOSURE', 'HOLD', 'release gate',
    'D05 and R00 G02 remain unresolved with zero accepted future/construction cells.',
    'D05-SM-10 through D05-SM-18 all pass against one immutable identity.',
    'HOLD_D05_AND_R00_G02'),
];
const passCount = acceptanceMatrix.filter(({ result }) => result.startsWith('PASS')).length;
const holdCount = acceptanceMatrix.filter(({ result }) => result === 'HOLD').length;
assert(passCount === 9 && holdCount === 10, 'Acceptance-matrix count drift');

const supportMaterialDesignPayload = {
  acceptedPlanningIdentity: {
    ownerAcceptanceFileSha256: sourceBindings.ownerAcceptance.sha256,
    ownerAcceptancePayloadSha256: owner.acceptanceRecordPayloadSha256,
    d05PlanningPolicyAccepted: true,
    technicalHoldPassedCount: 0,
    d05FutureStateReportIdentitySha256: future.reportIdentitySha256,
    modelId: selected.modelId,
    modelIdentitySha256: selected.modelIdentitySha256,
    independentTechnicalAcceptanceRecorded: false,
  },
  immutableEvidenceIdentity: {
    regionOnlySha256: immutableRegionSha256,
    completeSameMomentSavedWorldAvailable: false,
  },
  referenceIndexedSparseOverlayContract: {
    meaning: 'Each overlay record binds one exact upstream sparse coordinate family by source hash and assigns uniform or source-preserved proposal metadata to every cell in that family. It is not an accepted typed-family or operation manifest.',
    directMaterialOverlayManifest,
    supportTreatmentOverlayManifest,
  },
  directMaterialFamilies,
  proposedMaterialRegistry,
  supportGapTreatmentLedger: {
    sourceBoundIntervalManifestSha256: supportSource.boundIntervalManifestSha256,
    sourceCoordinateSetSha256: supportSource.coordinateSetSha256,
    exactCellCount: supportSource.cellCount,
    exactColumnCount: supportSource.columnCount,
    familyCount: supportTreatmentFamilies.length,
    classifiedCellCount: classifiedSupportCellCount,
    unclassifiedCellCount: 0,
    multiplyClassifiedCellCount: 0,
    treatmentClassProposedCellCount: treatmentClassProposedSupportCellCount,
    treatmentClassNullCellCount: treatmentClassNullSupportCellCount,
    proposedCanonicalStateCellCount: proposedCanonicalStateSupportCellCount,
    acceptedTreatmentCellCount: 0,
    acceptedMaterialStateCellCount: 0,
    families: supportTreatmentFamilies,
  },
  influenceAndMaintenanceAccessAssumptions,
  protectedRelics: {
    exactProtectedCores: protectedCores,
    minimumPlanningExclusion:
      future.hydrologyAndRelicBoundary.protectedRelicMinimumPlanningExclusion,
    expertInfluenceCellManifest: null,
    observationAccessAuthorized: false,
    acceptedSupportOrAccessCellCount: 0,
  },
  preservationAndNoDiversionContract: {
    policy: future.hydrologyAndRelicBoundary.preservationPolicy,
    currentWaterLavaFrozenSnowCellsDirectlyReplacedByProposal: 0,
    noDiversionTechnicallyAccepted: false,
    acceptedReceiverCount: 0,
    acceptedOutfallCount: 0,
    acceptedDischargeExceptionCellCount: 0,
    futureComponentAccountingManifest: null,
    futureSnowIceLandscapeCapManifest: null,
    defaultRule: 'UNKNOWN_INFLUENCE_IS_HOLD_NEVER_ZERO; NO_RECEIVER_OR_DISCHARGE_IS_INFERRED',
  },
  conflictAndReservationChecks,
  completeSaveDependency,
  technicalAmbiguityDisposition,
  acceptanceMatrix,
};
const supportMaterialDesignPayloadSha256 = sha256(
  `${JSON.stringify(supportMaterialDesignPayload)}\n`,
);

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d05-support-material-design',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_D05_SUPPORT_MATERIAL_PROPOSAL_UNRESOLVED_TREATMENTS_D05_G02_HOLD',
  purpose: 'Bind every exact FM-01 direct proposal and support-gap status family to an explicit proposed treatment/material record wherever current evidence permits, while retaining null states for support, hydrology, cryosphere, relic, influence, and access cases that require complete-save or engineering acceptance.',
  executable: false,
  sourceBindings,
  supportMaterialDesignPayload,
  supportMaterialDesignPayloadSha256,
  summary: {
    acceptanceCriterionCount: acceptanceMatrix.length,
    passCount,
    holdCount,
    directProposalCellCount: 14_768_553,
    bulkStructuralFillProposalCellCount: 14_580_291,
    exposedFinishProposalCellCount: 188_262,
    smoothStoneProposalCellCount: 77_395,
    polishedDioriteProposalCellCount: 110_867,
    supportGapCellCount: 754_224,
    supportStatusFamilyCount: 9,
    supportTreatmentClassProposedCellCount: treatmentClassProposedSupportCellCount,
    supportTreatmentClassNullCellCount: treatmentClassNullSupportCellCount,
    supportCanonicalStateProposedCellCount: 0,
    hydrologyCryosphereAdjacentSupportCellCount: 736_227,
    relicPreserveSupportCellCount: 363,
    otherSurfaceSupportCellCount: 17_634,
    proposedDirectConflictCellCount: 0,
    acceptedTreatmentCellCount: 0,
    acceptedMaterialStateCellCount: 0,
    acceptedInfluenceCellCount: 0,
    acceptedMaintenanceAccessCellCount: 0,
    acceptedFutureCellCount: 0,
    acceptedConstructionCellCount: 0,
    operationCellCount: 0,
    materialCellCount: 0,
    acceptedOwnerAssignmentCount: 0,
    acceptedInterfaceContractCount: 0,
    completeSavedWorldAccepted: false,
    d05Resolved: false,
    r00G02Passed: false,
    realWorldEngineeringOrComplianceClaimed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    databasesOpened: [],
    operations: [],
    operationCellCount: 0,
    materialCells: [],
    materialCellCount: 0,
    acceptedFutureCells: [],
    acceptedFutureCellCount: 0,
    acceptedConstructionCells: [],
    acceptedConstructionCellCount: 0,
    receiverInvented: false,
    outfallInvented: false,
    dischargeInvented: false,
    hydrologyAccepted: false,
    geotechnicalAccepted: false,
    constructionAuthorized: false,
    physicalBuildAuthorized: false,
    worldEditAuthorized: false,
  },
};

const supportRows = supportTreatmentFamilies.map((family) => (
  `| ${family.sourceSupportStatusFamilyId} | ${family.exactCellCount.toLocaleString('en-US')} | ${family.proposedTreatmentClass ?? 'null'} | ${family.proposedCanonicalState ?? 'null'} | ${family.proposalDecision} |`
)).join('\n');
const matrixRows = acceptanceMatrix.map((row) => (
  `| ${row.id} | **${row.result}** | ${row.scope} | ${row.evidence} |`
)).join('\n');
const markdown = `# Combined Zones Phase 1 D05 support-treatment and material design\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO ACCEPTED CELLS / OPERATIONS**\n\n`
  + `This artifact removes deterministic proposal ambiguity without converting proposal into technical acceptance. It binds the exact FM-01 bulk/exposed sparse material proposal and assigns one explicit treatment/material record to every exact support-gap family. It is not a real-world geotechnical, hydrology, structural, cryosphere, safety, or code-compliance claim.\n\n`
  + `Support/material payload SHA-256: \`${supportMaterialDesignPayloadSha256}\`\n\n`
  + `## Direct material proposal\n\n`
  + `The existing 14,768,553-cell direct proposal remains exact: 14,580,291 internal cells propose \`minecraft:stone\`; 77,395 exposed cells below Y=130 propose \`minecraft:smooth_stone\`; and 110,867 exposed cells at or above Y=130 propose \`minecraft:polished_diorite\`. These are source-bound proposal states, not accepted material, construction, or operation cells. Future snow/ice/soil/drainage/erosion cap states remain null.\n\n`
  + `## Support-gap treatment ledger\n\n`
  + `| Exact support family | Cells | Proposed treatment | Proposed canonical state | Disposition |\n|---|---:|---|---|---|\n`
  + `${supportRows}\n\n`
  + `All 754,224 below-Y72 cells are accounted for exactly once. Treatment classes are proposed for 17,997 cells (363 relic-preserve retain-void and 17,634 other-surface engineered-fill candidates). The remaining 736,227 water/frozen/snow-adjacent cells retain null treatment; the explicit zero-cell lava family also retains no reusable default. No support cell receives a canonical material state because the owner material policy reserves support, liner, retaining, and cryosphere/landscape states for technical acceptance.\n\n`
  + `## Conflicts, influence, and access\n\n`
  + `Relic, B08, and B09 reservation cells remain exactly subtracted from the direct proposal. The two D06 external continuations and full protected cores are exactly disjoint from the FM-01 bounds and have zero support-gap intersection. These planning conflict checks do not establish lining, support, maintenance, access, or mechanism acceptance.\n\n`
  + `Influence kernels, maintenance access, construction staging, equipment swept volumes, restoration cells, receiver/outfall contracts, and future component accounting remain null. Zero current water/lava/frozen/snow cells are directly replaced, but current top-surface adjacency is nonzero; therefore no-diversion and no-influence are not technically accepted.\n\n`
  + `## What still requires complete-save or engineering evidence\n\n`
  + `A complete same-moment world root must add \`entities/\`, \`poi/\`, \`level.dat\`, and a valid capture manifest. Engineering acceptance must supply support states and criteria, finite hydrology/geotechnical/cryosphere/relic kernels, B09 and D06 systems, exact maintenance/staging/access sets, owner assignments, directional interfaces, and independent technical plus separate complete-identity owner acceptance.\n\n`
  + `## Acceptance matrix\n\n`
  + `| Criterion | Result | Scope | Current evidence |\n|---|---|---|---|\n`
  + `${matrixRows}\n\n`
  + `Current result: **${passCount} proposal/accounting PASS / ${holdCount} HOLD**. Accepted treatment, material, influence, maintenance-access, future, construction, operation, and material-cell counts remain zero. D05 and R00 G02 remain HOLD.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  supportMaterialDesignPayloadSha256,
  directProposalCellCount: report.summary.directProposalCellCount,
  supportGapCellCount: report.summary.supportGapCellCount,
  supportTreatmentClassProposedCellCount:
    report.summary.supportTreatmentClassProposedCellCount,
  supportTreatmentClassNullCellCount: report.summary.supportTreatmentClassNullCellCount,
  acceptedCellCount: 0,
  operationCellCount: 0,
}, null, 2)}\n`);
