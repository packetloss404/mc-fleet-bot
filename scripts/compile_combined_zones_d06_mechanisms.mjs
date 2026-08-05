#!/usr/bin/env node
/**
 * Compile the strongest deterministic D06 candidate mechanism/reservation
 * contract supported by current offline evidence. Exact reservations and
 * fail-closed test contracts may pass; missing mechanisms, openings, owners,
 * complete-save evidence, commissioning, and technical acceptance stay HOLD.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T02:05:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.md',
));

const INPUTS = Object.freeze({
  ownerAcceptance: 'docs/masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  d06OwnerPacket: 'docs/masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
  d06LifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  d06Egress: 'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  connectorGeometry: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  d02TechnicalDesign: 'docs/masterplans/05-combined-zones/phase1-d02-technical-design.json',
  d05FutureStateContract: 'docs/masterplans/05-combined-zones/phase1-d05-future-state-compiler-contract.json',
  d05OwnerPacket: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  immutableRegionEvidence: 'docs/masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
});

const ROLES = Object.freeze({
  ownerAcceptance: 'sole-owner acceptance of the D06 planning policy with every technical HOLD retained',
  d06OwnerPacket: 'D06 selected basis, exact reservations, ownership slots, and acceptance criteria',
  d06LifeSafety: 'B07 alternatives and exact D06 life-safety reservation manifests',
  d06Egress: 'two exact dry external-continuation designs and independence proof',
  connectorGeometry: 'upstream B07 connector geometry basis and construction HOLD',
  emptyEight: 'frozen internal Empty Eight design and exact fixture reservations',
  d02TechnicalDesign: 'Minecraft-domain drainage/future-fluid contract and complete-save dependency',
  d05FutureStateContract: 'available D05 set-family/compiler contract and missing D06-mechanism dependency',
  d05OwnerPacket: 'available D05 hydrology, ownership, and interface acceptance contracts',
  immutableRegionEvidence: 'immutable region-only identity and complete copied-save audit',
});

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

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function resolveJsonPointer(document, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/'),
    `Invalid JSON pointer: ${pointer}`);
  return pointer.slice(1).split('/').reduce((valueAtPointer, encodedPart) => {
    const part = encodedPart.replace(/~1/g, '/').replace(/~0/g, '~');
    assert(valueAtPointer !== null && valueAtPointer !== undefined
      && Object.prototype.hasOwnProperty.call(valueAtPointer, part),
    `Missing JSON pointer segment ${part} in ${pointer}`);
    return valueAtPointer[part];
  }, document);
}

function collectManifestReferences(valueToWalk, logicalPath, records) {
  if (!valueToWalk || typeof valueToWalk !== 'object') return;
  if (typeof valueToWalk.sourcePath === 'string'
    && typeof valueToWalk.jsonPointer === 'string'
    && Number.isInteger(valueToWalk.cellCount)
    && typeof valueToWalk.coordinateSetSha256 === 'string') {
    records.push({ logicalPath, manifest: valueToWalk });
  }
  for (const [key, child] of Object.entries(valueToWalk)) {
    collectManifestReferences(child, `${logicalPath}/${key}`, records);
  }
}

function matrixRow(id, result, scope, currentEvidence, passRule, currentDisposition = null) {
  return { id, result, scope, currentEvidence, passRule, currentDisposition };
}

function commissioningTest(
  id,
  systemId,
  failureStimulus,
  requiredResult,
  evidenceRequired,
) {
  return {
    id,
    systemId,
    classification: 'OFFLINE_COMMISSIONING_CONTRACT_ONLY',
    prerequisites: [
      'complete same-moment copied save bound',
      'exact mechanism, control, power, ownership, and interface manifests technically accepted',
      'separate sole-owner acceptance of the immutable technical identity',
      'separately authorized non-production test plan with rollback and source guards',
    ],
    failureStimulus,
    requiredResult,
    evidenceRequired,
    operation: null,
    currentStatus: 'HOLD_NOT_EXECUTABLE_NO_COMMISSIONING_EVIDENCE',
  };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
  key,
  binding(relativePath, ROLES[key]),
]));
const owner = readJson(INPUTS.ownerAcceptance);
const packet = readJson(INPUTS.d06OwnerPacket);
const lifeSafety = readJson(INPUTS.d06LifeSafety);
const egress = readJson(INPUTS.d06Egress);
const connector = readJson(INPUTS.connectorGeometry);
const emptyEight = readJson(INPUTS.emptyEight);
const d02 = readJson(INPUTS.d02TechnicalDesign);
const d05Contract = readJson(INPUTS.d05FutureStateContract);
const d05Packet = readJson(INPUTS.d05OwnerPacket);
const region = readJson(INPUTS.immutableRegionEvidence);

assert(owner.status
  === 'OWNER_ACCEPTANCE_RECORDED_PLANNING_POLICY_FROZEN_ALL_TECHNICAL_HOLDS_RETAINED',
'Owner-acceptance status drift');
assert(owner.effectivePlanningDisposition?.d06PlanningPolicyAccepted === true,
  'D06 planning policy is not owner-accepted');
assert(owner.effectivePlanningDisposition?.technicalHoldPassedCount === 0
  && owner.disposition?.allTechnicalHoldsRetained === true,
'Owner acceptance must retain all technical HOLDs');
assert(owner.disposition?.g02Passed === false && owner.disposition?.r00Passed === false,
  'Owner acceptance cannot pass G02 or R00');
assert(owner.safetyBoundary?.operationCellCount === 0
  && owner.safetyBoundary?.worldEditAuthorized === false,
'Owner-acceptance safety boundary drift');
assert(packet.status === 'READY_FOR_SOLE_OWNER_REVIEW_PLANNING_BASIS_BOUND_D06_AND_G02_HOLD',
  'D06 owner-packet status drift');
assert(packet.acceptanceBasisSha256
  === '870e9334a5f80ee949ea2c44153fc92e1e64dc5fecea3fb992a8b1c8a3a56317',
'D06 owner-packet acceptance identity drift');
assert(packet.disposition?.passCount === 2 && packet.disposition?.holdCount === 9
  && packet.disposition?.ownerPlanningBasisSelected === true
  && packet.disposition?.ownerTechnicalAcceptanceRecorded === false
  && packet.disposition?.sealed === true && packet.disposition?.commissioned === false,
'D06 owner-packet disposition drift');
assert(lifeSafety.status
  === 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
'D06 life-safety status drift');
assert(egress.status === 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN',
  'D06 egress status drift');
assert(connector.status
  === 'PARTIAL_PASS_EXACT_B07_B08_CANDIDATES_B09_PROFILE_ALL_CONSTRUCTION_HOLD',
'Connector-geometry status drift');
assert(connector.worldEditAuthorized === false && connector.operationCellCount === 0,
  'Connector geometry cannot authorize physical work');
assert(emptyEight.status
  === 'D06_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_HOLD_D07_WORDING_RESOLVED_C2_OMITTED',
'Empty Eight design status drift');
assert(emptyEight.gateDecision?.d06InternalDesignFreezePassed === true
  && emptyEight.gateDecision?.d06CompleteLifeSafetyGatePassed === false
  && emptyEight.gateDecision?.liveBuildMayProceed === false,
'Empty Eight D06 gate drift');
assert(d02.status === 'PARTIAL_PASS_EXACT_D02_TECHNICAL_DEVELOPMENT_D02_G02_HOLD',
  'D02 technical-design status drift');
assert(d05Contract.status === 'CONTRACT_PASS_INPUT_READINESS_HOLD_ZERO_FUTURE_CELLS',
  'D05 future-state contract status drift');
assert(d05Packet.status === 'OWNER_ACCEPTANCE_PACKET_READY_POLICY_AND_TECHNICAL_D05_G02_HOLD',
  'D05 owner-packet status drift');
assert(region.status === 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD',
  'Immutable region evidence status drift');

const immutableRegionSha256 = region.selectedRegionOnlyEvidence.identity.sha256;
assert(immutableRegionSha256
  === '05eebe12ba419abd75b80033c265daf452b652a575c912f6df497735e00d271b',
'Immutable region identity drift');
assert(immutableRegionSha256 === egress.immutableSnapshot.sha256
  && immutableRegionSha256 === lifeSafety.sourceBindings.immutablePhase0PostSnapshot.sha256
  && immutableRegionSha256
    === d02.technicalDevelopmentPayload.completeSaveDependency.currentRegionOnlyIdentity.sha256
  && immutableRegionSha256 === d05Packet.immutableEvidenceIdentity.snapshot.sha256,
'Cross-source immutable region identity drift');
assert(region.copiedSaveCompletenessAudit.completeCandidateCount === 0
  && d02.technicalDevelopmentPayload.completeSaveDependency.completeCopiedSaveCandidateCount === 0,
'A complete save unexpectedly exists; regenerate upstream audits first');

const packetReferenceRoots = [
  'b07WestTwo',
  'protectedEgressAndAccessibleLiftCores',
  'smokeVentilationAndBarriers',
  'emergencyLightingAndPower',
  'cappedDrainage',
  'fireAndServiceAccess',
];
const rawReferences = [];
for (const root of packetReferenceRoots) {
  collectManifestReferences(packet[root], root, rawReferences);
}
assert(rawReferences.length === 73, 'Expected 73 exact D06 owner-packet manifest references');
const permittedManifestSources = new Map([
  [INPUTS.d06LifeSafety, lifeSafety],
  [INPUTS.emptyEight, emptyEight],
]);
const exactReservationReferenceValidation = rawReferences.map(({ logicalPath, manifest }) => {
  const source = permittedManifestSources.get(manifest.sourcePath);
  assert(source, `Unpermitted D06 manifest source: ${manifest.sourcePath}`);
  const sourceManifest = resolveJsonPointer(source, manifest.jsonPointer);
  const sourceCoordinateHash = sourceManifest.coordinateSetSha256 ?? sourceManifest.cellSetSha256;
  assert(sourceManifest.cellCount === manifest.cellCount,
    `Cell-count drift at ${logicalPath}`);
  assert(sourceCoordinateHash === manifest.coordinateSetSha256,
    `Coordinate hash drift at ${logicalPath}`);
  assert(sameJson(sourceManifest.bounds ?? null, manifest.bounds ?? null),
    `Bounds drift at ${logicalPath}`);
  return {
    logicalPath,
    sourcePath: manifest.sourcePath,
    jsonPointer: manifest.jsonPointer,
    cellCount: manifest.cellCount,
    bounds: manifest.bounds ?? null,
    coordinateSetSha256: manifest.coordinateSetSha256,
    result: 'PASS_EXACT_REFERENCE_REPRODUCED',
    interpretation: 'Candidate reservation/cap identity only; not a mechanism, construction set, or operation.',
  };
});

const d05MechanismDependency = d05Contract.dependencyMatrix.find(
  ({ id }) => id === 'DEP-D06-MECHANISM-CELL-SETS',
);
assert(d05MechanismDependency?.status === 'HOLD',
  'D05 must retain the missing D06 mechanism-cell-set dependency');
assert(d05Contract.readinessDisposition?.futureCellCount === 0
  && d05Contract.readinessDisposition?.constructionCellCount === 0
  && d05Contract.readinessDisposition?.readyToCompileFutureState === false,
'D05 must remain zero-cell and not ready');
assert(d05Packet.disposition?.technicalInputsComplete === false
  && d05Packet.ownershipAndInterfacePlan?.currentDisposition?.accepted === false,
'D05 technical/ownership acceptance unexpectedly passed');

const d05EgressReferences = new Map(d05Contract.d06ReferenceReservations.map((item) => [
  item.id,
  item,
]));
const egressDesigns = new Map(egress.egressDesigns.map((item) => [item.id, item]));
const protectedEgressAndLiftSystems = packet.protectedEgressAndAccessibleLiftCores
  .selectedLayouts.map((layout) => {
    const external = egressDesigns.get(layout.coreId);
    const d05Reference = d05EgressReferences.get(layout.coreId);
    assert(external && d05Reference, `Missing external/D05 reference for ${layout.coreId}`);
    assert(sameJson(external.externalContinuationDesign.bounds, d05Reference.externalContinuation.bounds)
      && external.externalContinuationDesign.cellCount === d05Reference.externalContinuation.cellCount
      && external.externalContinuationDesign.coordinateSetSha256
        === d05Reference.externalContinuation.coordinateSetSha256,
    `External-continuation D05 contract drift for ${layout.coreId}`);
    assert(sameJson(
      external.externalContinuationDesign.stairReservation,
      d05Reference.stairReservation,
    ) && sameJson(
      external.externalContinuationDesign.accessibleLiftReservation,
      d05Reference.accessibleLiftReservation,
    ), `D05 stair/lift reference drift for ${layout.coreId}`);
    assert(external.immutableSourceCensus.waterCellCount === 0
      && external.immutableSourceCensus.lavaCellCount === 0
      && external.designGate.physicalOpeningAuthorized === false,
    `External route is not dry and closed for ${layout.coreId}`);
    return {
      systemId: `D06-EGRESS-LIFT-${layout.coreId}`,
      coreId: layout.coreId,
      selectedLayoutId: layout.selectedLayoutId,
      surveyedSurfaceEndpoint: layout.surveyedSurfaceEndpoint,
      combinedProtectedCoreReservation: layout.combinedProtectedCoreReservation,
      protectedStairReservation: layout.protectedStairReservation,
      accessibleLiftReservation: layout.accessibleLiftReservation,
      compartmentSeparatorCap: layout.compartmentSeparatorCap,
      roofTransitionCap: layout.roofTransitionCap,
      surfaceOutletCap: layout.surfaceOutletCap,
      exactExternalContinuationReference: {
        bounds: external.externalContinuationDesign.bounds,
        cellCount: external.externalContinuationDesign.cellCount,
        coordinateSetSha256: external.externalContinuationDesign.coordinateSetSha256,
        protectedStairReservation: external.externalContinuationDesign.stairReservation,
        accessibleLiftReservation: external.externalContinuationDesign.accessibleLiftReservation,
        d05Status: d05Reference.status,
      },
      candidateMechanismManifests: {
        stairMechanism: null,
        accessibleLiftMechanism: null,
        refugeAndTransferMechanism: null,
        emergencyOperationControls: null,
      },
      failureStateContract: {
        defaultState: 'SEALED_UNOPENED_UNCOMMISSIONED',
        lossOfNormalPower: 'NO_ROUTE_CREDIT_UNTIL_TWO_EMERGENCY_CIRCUITS_AND_LIFT_FAILURE_BEHAVIOR_PASS',
        liftOrControlFailure: 'LIFT_UNAVAILABLE_ROUTE_UNCOMMISSIONED_CAPS_RETAINED',
        stairOrCompartmentFailure: 'AFFECTED_ROUTE_UNCOMMISSIONED_CAPS_RETAINED',
        singleFailureIndependenceClaimed: false,
      },
      physicalOpeningAuthorized: false,
      commissionedEgress: false,
      commissionedAccessibleRoute: false,
      technicalAcceptanceClaimed: false,
    };
  });
assert(packet.protectedEgressAndAccessibleLiftCores.protectedCoreSetsDisjoint === true
  && egress.independenceProof.exactExternalContinuationSetsDisjoint === true
  && egress.independenceProof.horizontalSeparationBlocks === 193,
'Protected-route independence geometry drift');

const ventSystems = packet.smokeVentilationAndBarriers.localVentRisers.map((vent) => ({
  systemId: `D06-VENT-${vent.id}`,
  ventId: vent.id,
  exactRiserReservation: vent.reservation,
  surveyedSurface: vent.surveyedSurface,
  currentSnapshotAudit: vent.currentSnapshotAudit,
  candidateMechanismManifests: {
    duct: null,
    fan: null,
    control: null,
    exteriorOutlet: null,
  },
  failureStateContract: {
    defaultState: 'CAPPED_EXTERIOR_OUTLET_CLOSED',
    lossOfPowerOrControl: 'CAP_REMAINS_CLOSED_SYSTEM_UNCOMMISSIONED',
    smokeCriteriaMissingOrExceeded: 'NO_VENTILATION_CREDIT_NO_OPENING',
  },
  exteriorOutletOpened: false,
  commissioned: false,
  technicalAcceptanceClaimed: false,
}));
assert(ventSystems.length === 4
  && packet.smokeVentilationAndBarriers.localVentUnion.cellCount === 900
  && packet.smokeVentilationAndBarriers.riserSetsPairwiseDisjoint === true
  && ventSystems.every((vent) => vent.currentSnapshotAudit.waterCellCount === 0
    && vent.currentSnapshotAudit.lavaCellCount === 0
    && vent.currentSnapshotAudit.generatedStructureExcavationIntersectionCount === 0),
'Four-vent exact planning evidence drift');

const smokeBoundaries = packet.smokeVentilationAndBarriers.smokeBoundaries.map((boundary) => ({
  systemId: `D06-SMOKE-${boundary.id}`,
  ...boundary,
  failureStateContract: {
    defaultState: 'COMPLETE_FAIL_CLOSED_BOUNDARY_WITH_STATIC_OPENING_CAPS',
    detectorControlOrPowerFailure: 'OPENING_CAPS_REMAIN_CLOSED_NO_SMOKE_DOOR_CREDIT',
    mechanismManifestMissing: 'NO_PHYSICAL_OPENING_NO_OPERATIONAL_AUTHORITY',
  },
}));
const platformBarriers = packet.smokeVentilationAndBarriers.platformBarriers.map((barrier) => ({
  systemId: `D06-BARRIER-${barrier.id}`,
  ...barrier,
  failureStateContract: {
    defaultState: 'COMPLETE_FAIL_CLOSED_BARRIER_WITH_STATIC_GATE_CAP',
    powerControlTrainAlignmentOrManualReleaseFailure: 'GATE_CAP_REMAINS_CLOSED_NO_PLATFORM_OPERATION',
    mechanismManifestMissing: 'NO_GATE_OPENING_NO_OPERATIONAL_AUTHORITY',
  },
}));
assert(smokeBoundaries.length === 2
  && smokeBoundaries.every((item) => item.retainedBoundaryPlane.cellCount === 1336
    && item.staticOpeningCaps.cellCount === 36
    && item.completeFailClosedBoundary.cellCount === 1372
    && item.smokeDoorMechanism === null)
  && platformBarriers.length === 8
  && platformBarriers.every((item) => item.retainedClosedBarrierReservation.cellCount === 178
    && item.staticGateBayCap.cellCount === 24
    && item.completeFailClosedBarrier.cellCount === 202
    && item.poweredGateMechanism === null)
  && packet.smokeVentilationAndBarriers.totals.platformStaticGateCapCells === 192
  && packet.smokeVentilationAndBarriers.totals.smokeOpeningCapCells === 72,
'Smoke-boundary/platform-barrier exact evidence drift');

const lightingAndPowerSystem = {
  systemId: 'D06-LIGHTING-AND-THREE-CIRCUITS',
  ownerSelectedRequirement: packet.emergencyLightingAndPower.ownerSelectedRequirement,
  exactFixtureReservations: packet.emergencyLightingAndPower.fixtureReservations,
  exactFixtureReservationCount: packet.emergencyLightingAndPower.exactFixtureReservationCount,
  fixtureBlock: packet.emergencyLightingAndPower.fixtureBlock,
  circuitSlots: [
    {
      id: 'D06-CIRCUIT-NORMAL',
      role: 'NORMAL_LIGHTING',
      exactCircuitCellManifest: packet.emergencyLightingAndPower.normalCircuitReservation,
      exactSourceManifest: null,
      currentResult: 'HOLD_NO_NORMAL_CIRCUIT_OR_SOURCE_MANIFEST',
    },
    {
      id: 'D06-CIRCUIT-EMERGENCY-A',
      role: 'INDEPENDENT_EMERGENCY_LIGHTING_A',
      exactCircuitCellManifest: packet.emergencyLightingAndPower.emergencyCircuitAReservation,
      exactSourceManifest: packet.emergencyLightingAndPower.emergencyPowerSource,
      currentResult: 'HOLD_NO_EMERGENCY_A_CIRCUIT_OR_SOURCE_MANIFEST',
    },
    {
      id: 'D06-CIRCUIT-EMERGENCY-B',
      role: 'INDEPENDENT_EMERGENCY_LIGHTING_B',
      exactCircuitCellManifest: packet.emergencyLightingAndPower.emergencyCircuitBReservation,
      exactSourceManifest: packet.emergencyLightingAndPower.emergencyPowerSource,
      currentResult: 'HOLD_NO_EMERGENCY_B_CIRCUIT_OR_SOURCE_MANIFEST',
    },
  ],
  transferAndFailureLogic: packet.emergencyLightingAndPower.transferAndFailureLogic,
  failureStateContract: {
    normalFailure: 'NORMAL_CIRCUIT_UNAVAILABLE; BOTH INDEPENDENT EMERGENCY CIRCUITS MUST EACH BE TESTED',
    emergencyAFailure: 'NO_REDUNDANCY_CREDIT_UNLESS EMERGENCY_B_INDEPENDENTLY_PASSES',
    emergencyBFailure: 'NO_REDUNDANCY_CREDIT_UNLESS EMERGENCY_A_INDEPENDENTLY_PASSES',
    sharedSourceControlOrPath: 'FAIL_INDEPENDENCE_RETAIN_UNCOMMISSIONED_STATE',
    unknownPhotometricCoverage: 'NO_LIGHTING_OR_EGRESS_CREDIT',
  },
  photometricOrEmergencyPowerValidation: false,
  commissioned: false,
  technicalAcceptanceClaimed: false,
};
assert(lightingAndPowerSystem.exactFixtureReservations.length === 8
  && lightingAndPowerSystem.exactFixtureReservationCount === 56
  && lightingAndPowerSystem.circuitSlots.every((slot) => slot.exactCircuitCellManifest === null)
  && packet.emergencyLightingAndPower.emergencyPowerSource === null,
'Lighting/power evidence drift');

const d02FluidContract = d02.technicalDevelopmentPayload.sourceAndFutureFluidAccountingContract;
const d02HydraulicContract = d02.technicalDevelopmentPayload
  .hydraulicStorageFailureRecoveryContract;
assert(d02FluidContract.acceptedReceiverCount === 0
  && d02FluidContract.acceptedFutureFluidCellCount === 0
  && d02FluidContract.dischargeExceptionCount === 0
  && d02HydraulicContract.realWorldHydraulicOrCodeComplianceClaimed === false,
'D02 default-no-discharge contract drift');
const cappedDrainageSystem = {
  systemId: 'D06-EIGHT-LOCAL-DRAINAGE-CAPS',
  selectedAlternativeId: packet.cappedDrainage.selectedAlternativeId,
  localCaps: packet.cappedDrainage.localSumpInterfaceCaps,
  exactCapUnion: packet.cappedDrainage.capUnion,
  retainedUnconnectedHeaderReservation:
    packet.cappedDrainage.retainedUnconnectedHeaderReservation,
  retainedExternalBoundaryCap: packet.cappedDrainage.retainedExternalBoundaryCap,
  candidateMechanismManifests: {
    localSumpsAndChannels: null,
    pumpAndControl: null,
    externalReceiverAndDischarge: null,
  },
  d02MinecraftDomainAcceptanceContract: {
    domain: d02HydraulicContract.domain,
    acceptedValues: d02HydraulicContract.currentAcceptedValues,
    currentHydraulicResult: d02HydraulicContract.currentResult,
    acceptedFutureFluidCellCount: d02FluidContract.acceptedFutureFluidCellCount,
    acceptedReceiverCount: d02FluidContract.acceptedReceiverCount,
    dischargeExceptionCount: d02FluidContract.dischargeExceptionCount,
    futureFluidResult: d02FluidContract.currentResult,
  },
  d05ExternalContract: {
    futureStateInputsReady: d05Contract.readinessDisposition.inputsReady,
    futureCellCount: d05Contract.readinessDisposition.futureCellCount,
    hydrologyExpertInputsComplete:
      d05Contract.readinessChecks.find(({ id }) => id === 'S02-R06-HYDROLOGY-EXPERT-INPUTS-COMPLETE')?.status,
    d05OwnerTechnicalInputsComplete: d05Packet.disposition.technicalInputsComplete,
    exactReceiverAccepted: false,
  },
  failureStateContract: {
    defaultState: 'EIGHT_LOCAL_CAPS_AND_EXTERNAL_BOUNDARY_CAP_SEALED_HEADER_UNCONNECTED',
    inflowCapacityFreeboardOrRecoveryUnknown: 'NO_DRAINAGE_CREDIT_NO_CAP_OPENING',
    pumpPowerOrControlFailure: 'NO_DISCHARGE_NO_INFERRED_RECEIVER_RETAIN_SEALED_STATE',
    futureFluidOrReceiverContractMissing: 'ZERO_ACCEPTED_DISCHARGE_EXCEPTIONS',
  },
  externalDischargePoint: null,
  commissioned: false,
  technicalAcceptanceClaimed: false,
};
assert(cappedDrainageSystem.localCaps.length === 8
  && cappedDrainageSystem.localCaps.every(({ cap }) => cap.cellCount === 3)
  && cappedDrainageSystem.exactCapUnion.cellCount === 24
  && cappedDrainageSystem.retainedUnconnectedHeaderReservation.cellCount === 9
  && cappedDrainageSystem.retainedExternalBoundaryCap.cellCount === 9
  && packet.cappedDrainage.externalDischargePoint === null,
'Capped drainage evidence drift');

const fireServiceSystem = {
  systemId: 'D06-FIRE-SERVICE-EG-B',
  selectedAlternativeId: packet.fireAndServiceAccess.selectedAlternativeId,
  internalSpineReservation: packet.fireAndServiceAccess.internalSpineReservation,
  internalTransferReservation: packet.fireAndServiceAccess.internalTransferReservation,
  normallyClosedSpineInterfaceCap:
    packet.fireAndServiceAccess.normallyClosedSpineInterfaceCap,
  surfaceCompoundReservation: packet.fireAndServiceAccess.surfaceCompoundReservation,
  sealedSurfaceApproachInterface: packet.fireAndServiceAccess.sealedSurfaceApproachInterface,
  candidateMechanismManifests: {
    externalApproachRoute: null,
    internalTransfer: null,
    accessControls: null,
  },
  failureStateContract: {
    defaultState: 'SPINE_AND_SURFACE_APPROACH_INTERFACES_SEALED',
    externalRouteOrEmergencyServiceAcceptanceMissing: 'NO_FIRE_SERVICE_ACCESS_CREDIT',
    controlOrInterfaceFailure: 'RETAIN_NORMALLY_CLOSED_CAPS_NO_OPENING',
  },
  emergencyServiceAcceptance: false,
  commissioned: false,
  technicalAcceptanceClaimed: false,
};
assert(fireServiceSystem.selectedAlternativeId === 'FIRE-EG-B'
  && fireServiceSystem.internalSpineReservation.cellCount === 3025
  && fireServiceSystem.internalTransferReservation.cellCount === 0
  && fireServiceSystem.normallyClosedSpineInterfaceCap.cellCount === 35
  && fireServiceSystem.surfaceCompoundReservation.cellCount === 49
  && fireServiceSystem.sealedSurfaceApproachInterface.cellCount === 21,
'Fire/service exact evidence drift');

const b07WestTwoSystem = {
  systemId: 'D06-B07-WEST-TWO',
  candidateId: packet.b07WestTwo.candidateId,
  sourceConnectorBlockerId: connector.publicShaftDogleg.blockerId,
  sourceConnectorDisposition: connector.publicShaftDogleg.disposition,
  anchors: packet.b07WestTwo.anchors,
  centerline: packet.b07WestTwo.centerline,
  crossSection: packet.b07WestTwo.crossSection,
  exactExcavationReservation: packet.b07WestTwo.excavationReservation,
  exactInteractionUnion: packet.b07WestTwo.interactionUnion,
  immutableSnapshotFacts: packet.b07WestTwo.immutableSnapshotFacts,
  candidateMechanismManifests: {
    protectedStair: null,
    liftAndTransfer: null,
    liningAndSupport: null,
    drainageAndWaterTreatment: null,
    smokeAndPower: null,
  },
  waterTreatmentContract: {
    excavationWaterCellCount: packet.b07WestTwo.immutableSnapshotFacts.excavationWaterCellCount,
    excavationWaterloggedCellCount:
      packet.b07WestTwo.immutableSnapshotFacts.excavationWaterloggedCellCount,
    interactionWaterCellCount: packet.b07WestTwo.immutableSnapshotFacts.interactionWaterCellCount,
    exactSourceToFutureDispositionManifest: null,
    acceptedReceiverId: null,
    dischargeExceptionCellCount: 0,
    rule: 'All 38 current excavation water cells and the waterlogged state remain unchanged unless an exact D02/D05 source-to-future component treatment and receiver/interface contract is independently accepted.',
  },
  failureStateContract: {
    defaultState: 'NO_EXCAVATION_NO_MECHANISM_NO_FLUID_CHANGE',
    anyUndeclaredWaterLiningSupportOrTransferState: 'FAIL_CLOSED_B07_REMAINS_HOLD',
    generatedStructureRelicOrBlockEntityDrift: 'FAIL_CLOSED_REAUDIT_REQUIRED',
  },
  physicalOpeningAuthorized: false,
  commissioned: false,
  technicalAcceptanceClaimed: false,
};
assert(b07WestTwoSystem.candidateId === 'B07-C-WEST-2'
  && b07WestTwoSystem.centerline.pointCount === 163
  && b07WestTwoSystem.exactExcavationReservation.cellCount === 8134
  && b07WestTwoSystem.exactInteractionUnion.cellCount === 13608
  && b07WestTwoSystem.immutableSnapshotFacts.excavationWaterCellCount === 38
  && b07WestTwoSystem.immutableSnapshotFacts.excavationWaterloggedCellCount === 1
  && b07WestTwoSystem.immutableSnapshotFacts.generatedStructureExcavationIntersectionCount === 0
  && b07WestTwoSystem.immutableSnapshotFacts.generatedStructureInteractionIntersectionCount === 0
  && b07WestTwoSystem.immutableSnapshotFacts.protectedRelicInteractionIntersectionCount === 0
  && b07WestTwoSystem.immutableSnapshotFacts.blockEntityInteractionIntersectionCount === 0,
'B07 west-two evidence drift');

const controlOwnershipInterfaceContract = {
  controlFailureRule: 'Any missing, ambiguous, shared, unpowered, unaccepted, or hash-drifted control leaves the affected system capped, closed, unavailable, and uncommissioned.',
  oneOwnerRule: packet.ownershipAndInterfaces.rule,
  register: packet.ownershipAndInterfaces.register,
  acceptedCanonicalOwnerCount: packet.ownershipAndInterfaces.acceptedCanonicalOwnerCount,
  acceptedInterfaceContractCount: packet.ownershipAndInterfaces.acceptedInterfaceContractCount,
  D05OwnerContract: d05Packet.ownershipAndInterfacePlan.ownershipRegistryContract,
  D05InterfaceContract: d05Packet.ownershipAndInterfacePlan.interfaceContract,
  acceptedControlManifestCount: 0,
  acceptedFailureLogicCount: 0,
  currentResult: 'HOLD_NINE_OWNER_SLOTS_ALL_INTERFACES_AND_CONTROLS_UNACCEPTED',
};
assert(controlOwnershipInterfaceContract.register.length === 9
  && controlOwnershipInterfaceContract.register.every((slot) => slot.canonicalOwnerId === null
    && slot.acceptedInterfaceContractIds.length === 0)
  && controlOwnershipInterfaceContract.acceptedCanonicalOwnerCount === 0
  && controlOwnershipInterfaceContract.acceptedInterfaceContractCount === 0,
'D06 owner/interface register drift');

const commissioningTestRegister = [
  ...protectedEgressAndLiftSystems.map((system) => commissioningTest(
    `CT-${system.coreId}-EGRESS-LIFT`,
    system.systemId,
    'normal-power loss, lift/control failure, stair obstruction, and each declared single failure',
    'route remains protected or is explicitly unavailable; caps and separation remain fail-closed; no unproved route receives egress/accessibility credit',
    'exact route trace, control/power state trace, cap state, before/after manifests, independent route result, and reset evidence',
  )),
  ...ventSystems.map((system) => commissioningTest(
    `CT-${system.ventId}`,
    system.systemId,
    'fan, control, power, outlet, or smoke-criterion failure',
    'outlet and affected compartment remain fail-closed with no ventilation credit',
    'exact mechanism/control states, outlet/cap states, accepted scenario result, and reset evidence',
  )),
  ...smokeBoundaries.map((system) => commissioningTest(
    `CT-${system.id}`,
    system.systemId,
    'detector, control, power, or smoke-door mechanism failure',
    'complete boundary remains closed and no opening receives operational credit',
    'exact opening/mechanism/control states, compartment result, and reset evidence',
  )),
  ...platformBarriers.map((system) => commissioningTest(
    `CT-${system.id}`,
    system.systemId,
    'power, control, alignment, train interface, or manual-release failure',
    'static gate cap remains closed and platform operation remains unauthorized',
    'exact gate/control/alignment states, failure result, manual-reset result, and before/after manifests',
  )),
  ...lightingAndPowerSystem.circuitSlots.map((circuit) => commissioningTest(
    `CT-${circuit.id}`,
    circuit.id,
    'loss of this circuit plus each accepted common-cause and transfer failure',
    'accepted independent circuits retain their specified fixture coverage or the affected routes remain unavailable',
    'exact circuit/source/control state trace, independence proof, fixture coverage result, and reset evidence',
  )),
  ...cappedDrainageSystem.localCaps.map((record) => commissioningTest(
    `CT-${record.id}`,
    cappedDrainageSystem.systemId,
    'accepted inflow exceedance, pump/control loss if applicable, blockage, cap, receiver, or recovery failure',
    'local and exterior caps remain sealed and no overflow, diversion, or inferred discharge occurs',
    'exact wet-cell/component accounting, storage/freeboard result, cap/control states, accepted receiver identity, recovery, and reset evidence',
  )),
  commissioningTest(
    'CT-D06-FIRE-SERVICE-EG-B',
    fireServiceSystem.systemId,
    'external-route, interface, access-control, or emergency-service acceptance failure',
    'spine and surface approach remain sealed and no fire/service access credit is claimed',
    'exact route/access trace, interface/control states, reviewer acceptance, and reset evidence',
  ),
  commissioningTest(
    'CT-D06-B07-WEST-TWO',
    b07WestTwoSystem.systemId,
    'water-treatment, lining/support, lift/transfer, smoke, power, control, or endpoint failure',
    'B07 remains unopened with zero fluid change, zero discharge, and no route credit',
    'exact source/future states for all 38 water cells and waterlogged state, component accounting, mechanism traces, endpoints, and reset evidence',
  ),
];
assert(commissioningTestRegister.length === 29
  && commissioningTestRegister.every((test) => test.operation === null
    && test.currentStatus === 'HOLD_NOT_EXECUTABLE_NO_COMMISSIONING_EVIDENCE'),
'Commissioning test-register drift');

const completeSaveDependency = {
  auditedCopiedSaveCandidateCount: region.copiedSaveCompletenessAudit.candidateCount,
  completeCopiedSaveCandidateCount: region.copiedSaveCompletenessAudit.completeCandidateCount,
  currentRegionOnlyIdentity: region.selectedRegionOnlyEvidence.identity,
  currentCompleteness: region.selectedRegionOnlyEvidence.completeness,
  requiredComponents: ['region/', 'entities/', 'poi/', 'level.dat'],
  currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_COPIED_SAVE',
};

const acceptanceMatrix = [
  matrixRow('D06-MC-01-SOURCE-BINDINGS', 'PASS', 'source identity',
    'All ten direct inputs are file-hash and byte-count bound.',
    'Every direct source exists and matches this artifact binding.'),
  matrixRow('D06-MC-02-OWNER-PLANNING-ACCEPTANCE', 'PASS', 'planning authority only',
    `Owner acceptance ${owner.acceptanceRecordPayloadSha256} freezes D06 policy while passing zero technical HOLDs.`,
    'The separate owner record accepts planning policy and retains every limitation.'),
  matrixRow('D06-MC-03-EGRESS-RESERVATIONS', 'PASS', 'candidate geometry only',
    'Two disjoint full protected-core reservations and two dry, disjoint external-continuation references reproduce exactly.',
    'Counts, bounds, hashes, dry censuses, separation, and closed caps reproduce.'),
  matrixRow('D06-MC-04-VENT-RESERVATIONS', 'PASS', 'candidate geometry only',
    'Four pairwise-disjoint capped riser reservations total 900 cells and are dry and structure-clear in the bounded audit.',
    'All four manifest references and bounded snapshot checks reproduce; outlets stay closed.'),
  matrixRow('D06-MC-05-SMOKE-STATIC-CAPS', 'PASS', 'fail-closed geometry only',
    'Two 1,372-cell complete boundaries retain 72 total static opening-cap cells.',
    'Boundary, opening-cap, and complete fail-closed manifest identities reproduce.'),
  matrixRow('D06-MC-06-PLATFORM-STATIC-BARRIERS', 'PASS', 'fail-closed geometry only',
    'Eight 202-cell complete barriers retain 192 total static gate-cap cells.',
    'Barrier, gate-cap, and complete fail-closed manifest identities reproduce.'),
  matrixRow('D06-MC-07-FIXTURE-RESERVATIONS', 'PASS', 'candidate geometry only',
    'Eight seven-cell sea-lantern fixture reservations reproduce, totaling 56 cells.',
    'Every fixture reference resolves to the frozen Empty Eight design.'),
  matrixRow('D06-MC-08-DRAINAGE-CAPS', 'PASS', 'default-no-discharge control only',
    'Eight three-cell local caps, 24-cell union, nine-cell header, and nine-cell boundary cap reproduce; receiver remains null.',
    'All cap manifests reproduce and no pump, opening, receiver, outfall, or discharge is promoted.'),
  matrixRow('D06-MC-09-FIRE-SERVICE-RESERVATIONS', 'PASS', 'sealed candidate geometry only',
    'FIRE-EG-B binds a 3,025-cell spine, zero-cell transfer, 35-cell closed interface, 49-cell compound, and 21-cell sealed approach.',
    'Exact manifests reproduce while the external route remains null and interfaces sealed.'),
  matrixRow('D06-MC-10-B07-CURRENT-GEOMETRY', 'PASS', 'candidate geometry and current census only',
    'B07-C-WEST-2 binds 163 centerline points, 8,134 excavation cells, 13,608 interaction cells, and the exact current 38-water-cell finding.',
    'Geometry/current-snapshot manifests reproduce; PASS never implies treatment, lining, route, or construction acceptance.'),
  matrixRow('D06-MC-11-COMPLETE-SAVE', 'HOLD', 'source completeness',
    'Fifty-six candidates were audited and zero are complete same-moment saves.',
    'Bind region/entities/POI/level.dat from one frozen capture and repeat affected audits.',
    completeSaveDependency.currentResult),
  matrixRow('D06-MC-12-STAIR-LIFT-MECHANISMS', 'HOLD', 'two protected and accessible routes',
    'Stair, lift, refuge/transfer, emergency operation, and control mechanism manifests are null.',
    'Freeze exact mechanisms and pass accessibility, independence, failure, owner/interface, and test contracts.',
    'HOLD_TWO_STAIR_LIFT_SYSTEMS_ARE_RESERVATIONS_ONLY'),
  matrixRow('D06-MC-13-VENT-SMOKE-MECHANISMS', 'HOLD', 'ventilation and smoke control',
    'Four outlets remain closed; ducts, fans, controls, smoke scenarios, thresholds, and door mechanisms are absent.',
    'Accept exact smoke/vent criteria and complete capped-to-operational mechanisms for each system.',
    'HOLD_CAPS_ONLY_NO_SMOKE_MODEL_OUTLETS_OR_MECHANISMS'),
  matrixRow('D06-MC-14-DOOR-GATE-MECHANISMS', 'HOLD', 'openings and platform barriers',
    'All smoke doors and eight powered gate mechanisms are null; operational authority count is zero.',
    'Freeze every mechanism/control/manual-release/train interface and pass failure tests.',
    'HOLD_STATIC_CAPS_ARE_NOT_WORKING_DOORS_OR_GATES'),
  matrixRow('D06-MC-15-NORMAL-CIRCUIT', 'HOLD', 'normal lighting circuit',
    'The normal circuit path, source, controls, and accepted fixture-coverage result are null.',
    'Bind exact circuit/source/control manifests and pass coverage and failure tests.',
    'HOLD_NO_NORMAL_CIRCUIT'),
  matrixRow('D06-MC-16-EMERGENCY-CIRCUIT-A', 'HOLD', 'independent emergency circuit A',
    'Emergency circuit A and its independent source/control contract are null.',
    'Bind exact independent A manifests and pass coverage, loss, transfer, and common-cause tests.',
    'HOLD_NO_EMERGENCY_CIRCUIT_A'),
  matrixRow('D06-MC-17-EMERGENCY-CIRCUIT-B', 'HOLD', 'independent emergency circuit B',
    'Emergency circuit B and its independent source/control contract are null.',
    'Bind exact independent B manifests and pass coverage, loss, transfer, and common-cause tests.',
    'HOLD_NO_EMERGENCY_CIRCUIT_B'),
  matrixRow('D06-MC-18-DRAINAGE-HYDRAULICS-RECEIVER', 'HOLD', 'Minecraft-domain drainage',
    'Inflow, storage, freeboard, pump/control, future-fluid, receiver, recovery, and discharge inputs are unaccepted.',
    'Pass D02/D05 exact discrete-fluid/component and receiver/interface contracts before any cap opens.',
    'HOLD_NO_HYDRAULIC_MODEL_PUMP_RECEIVER_OR_DISCHARGE'),
  matrixRow('D06-MC-19-FIRE-SERVICE-EXTERIOR', 'HOLD', 'external fire/service access',
    'The external approach route and emergency-service technical acceptance are null/false.',
    'Bind and accept exact route, access, controls, interfaces, owner, failure states, and tests.',
    'HOLD_EXTERNAL_APPROACH_NULL'),
  matrixRow('D06-MC-20-B07-WATER-LINING-SUPPORT', 'HOLD', 'B07 technical design',
    'All 38 excavation water cells, one waterlogged state, lining/support, stair/lift transfer, drainage, smoke, and power treatments are unresolved.',
    'Bind exact source-to-future fluid disposition and every mechanism/treatment without undeclared diversion.',
    packet.b07WestTwo.technicalDisposition),
  matrixRow('D06-MC-21-CONTROLS-FAILURE-LOGIC', 'HOLD', 'system controls',
    'Accepted control manifests and accepted failure-logic count remain zero.',
    'Bind deterministic state machines, dependencies, manual recovery, alarms, and fail-closed tests for every system.',
    'HOLD_CONTROLS_AND_FAILURE_LOGIC_UNACCEPTED'),
  matrixRow('D06-MC-22-OWNERS-INTERFACES', 'HOLD', 'canonical authority',
    'All nine owner slots are null and accepted interface-contract count is zero.',
    'Assign exactly one canonical owner per cell and one exact directional contract per seam.',
    controlOwnershipInterfaceContract.currentResult),
  matrixRow('D06-MC-23-COMMISSIONING', 'HOLD', 'functional evidence',
    'Twenty-nine deterministic commissioning test contracts exist; all are non-executable and have no evidence.',
    'After technical/owner acceptance and separate authorization, pass every frozen test against one identity.',
    'HOLD_29_TEST_CONTRACTS_ZERO_COMMISSIONED_SYSTEMS'),
  matrixRow('D06-MC-24-INDEPENDENT-TECHNICAL-OWNER-ACCEPTANCE', 'HOLD', 'acceptance identity',
    'Owner planning policy is accepted; independent system reviewers and technical-identity owner acceptance are absent.',
    'Independent technical reviews pass and the sole owner separately accepts the complete immutable technical identity.',
    'HOLD_TECHNICAL_AND_OWNER_ACCEPTANCE_NOT_RECORDED'),
  matrixRow('D06-MC-25-D06-G02-CLOSURE', 'HOLD', 'release gate',
    'D06 and R00 G02 remain unresolved; zero mechanisms are commissioned and every opening stays closed.',
    'D06-MC-11 through D06-MC-24 all pass against one source-bound identity.',
    'HOLD_D06_AND_R00_G02'),
];

const mechanismDevelopmentPayload = {
  acceptedPlanningIdentity: {
    ownerAcceptancePath: INPUTS.ownerAcceptance,
    ownerAcceptanceFileSha256: sourceBindings.ownerAcceptance.sha256,
    ownerAcceptancePayloadSha256: owner.acceptanceRecordPayloadSha256,
    d06AcceptanceBasisSha256: packet.acceptanceBasisSha256,
    planningPolicyAccepted: true,
    technicalHoldPassedCount: 0,
    independentTechnicalAcceptanceRecorded: false,
    completeTechnicalIdentityOwnerAcceptanceRecorded: false,
  },
  immutableSnapshotIdentity: {
    regionOnly: region.selectedRegionOnlyEvidence.identity,
    crossSourceIdentityMatched: true,
    completeSameMomentSaveAvailable: false,
  },
  exactReservationReferenceContract: {
    referenceCount: exactReservationReferenceValidation.length,
    passedReferenceCount: exactReservationReferenceValidation.length,
    failedReferenceCount: 0,
    allPassed: true,
    references: exactReservationReferenceValidation,
    interpretation: 'These references freeze exact candidate reservations, retained caps, and current-evidence geometry. They do not create mechanism, construction, material, or operation cells.',
  },
  protectedEgressAndLiftSystems,
  ventSystems,
  smokeAndBarrierSystems: {
    smokeBoundaries,
    platformBarriers,
    smokeOpeningStaticCapCellCount: 72,
    platformGateStaticCapCellCount: 192,
    acceptedSmokeDoorMechanismCount: 0,
    acceptedPoweredGateMechanismCount: 0,
    physicalOpeningCount: 0,
  },
  lightingAndPowerSystem,
  cappedDrainageSystem,
  fireServiceSystem,
  b07WestTwoSystem,
  controlOwnershipInterfaceContract,
  completeSaveDependency,
  availableD02D05Contracts: {
    d02MinecraftDomainHydraulicContractResult: d02HydraulicContract.currentResult,
    d02FutureFluidContractResult: d02FluidContract.currentResult,
    d02AcceptedReceiverCount: d02FluidContract.acceptedReceiverCount,
    d02AcceptedFutureFluidCellCount: d02FluidContract.acceptedFutureFluidCellCount,
    d05ContractSchemaPassed: d05Contract.readinessDisposition.contractSchemaPassed,
    d05MechanismDependency: d05MechanismDependency,
    d05InputsReady: d05Contract.readinessDisposition.inputsReady,
    d05FutureCellCount: d05Contract.readinessDisposition.futureCellCount,
    d05ConstructionCellCount: d05Contract.readinessDisposition.constructionCellCount,
    d05OwnerPolicyAccepted: d05Packet.disposition.ownerPolicyAccepted,
    d05TechnicalInputsComplete: d05Packet.disposition.technicalInputsComplete,
    interpretation: 'Available contracts define required schemas and fail-closed rules; they do not satisfy the missing D06 mechanisms or D05 technical inputs.',
  },
  commissioningTestRegister,
  acceptanceMatrix,
};
const mechanismDevelopmentPayloadSha256 = sha256(
  `${JSON.stringify(mechanismDevelopmentPayload)}\n`,
);
const passCount = acceptanceMatrix.filter(({ result }) => result === 'PASS').length;
const holdCount = acceptanceMatrix.filter(({ result }) => result === 'HOLD').length;
assert(passCount === 10 && holdCount === 15, 'D06 acceptance-matrix count drift');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-mechanisms',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_D06_RESERVATION_AND_FAILURE_CONTRACTS_ALL_MECHANISMS_D06_G02_HOLD',
  purpose: 'Bind owner-accepted D06 planning policy to exact Minecraft-domain candidate reservations, fail-closed failure contracts, and frozen commissioning-test requirements without inventing powered mechanisms, circuits, openings, receivers, ownership, technical acceptance, or world edits.',
  executable: false,
  sourceBindings,
  mechanismDevelopmentPayload,
  mechanismDevelopmentPayloadSha256,
  summary: {
    acceptanceCriterionCount: acceptanceMatrix.length,
    passCount,
    holdCount,
    exactManifestReferenceCount: exactReservationReferenceValidation.length,
    protectedEgressAndLiftSystemCount: protectedEgressAndLiftSystems.length,
    cappedVentSystemCount: ventSystems.length,
    smokeBoundaryCount: smokeBoundaries.length,
    platformBarrierCount: platformBarriers.length,
    exactFixtureReservationCount: lightingAndPowerSystem.exactFixtureReservationCount,
    circuitSlotCount: lightingAndPowerSystem.circuitSlots.length,
    exactCircuitManifestCount: 0,
    localDrainageCapCount: cappedDrainageSystem.localCaps.length,
    b07ExcavationWaterCellCount: b07WestTwoSystem.immutableSnapshotFacts.excavationWaterCellCount,
    acceptedMechanismManifestCount: 0,
    physicalOpeningCount: 0,
    acceptedReceiverCount: 0,
    commissioningTestContractCount: commissioningTestRegister.length,
    passedCommissioningTestCount: 0,
    completeCopiedSaveCandidateCount: completeSaveDependency.completeCopiedSaveCandidateCount,
    acceptedOwnerCount: 0,
    acceptedInterfaceContractCount: 0,
    operationCellCount: 0,
    materialCellCount: 0,
    d06Resolved: false,
    r00G02Passed: false,
    independentTechnicalAcceptanceClaimed: false,
    realWorldComplianceClaimed: false,
  },
  safetyBoundary: {
    offlineOnly: true,
    liveCallsPerformed: [],
    databasesOpened: [],
    operations: [],
    operationCellCount: 0,
    materialCells: [],
    materialCellCount: 0,
    futureCellsEmitted: [],
    futureCellCount: 0,
    mechanismCellsEmitted: [],
    mechanismCellCount: 0,
    receiverInvented: false,
    outfallInvented: false,
    dischargeInvented: false,
    capOpeningAuthorized: false,
    commissioningAuthorized: false,
    operationsAuthorized: false,
    constructionAuthorized: false,
    physicalBuildAuthorized: false,
    worldEditAuthorized: false,
    realWorldCodeOrLifeSafetyComplianceClaimed: false,
  },
};

const systemRows = [
  ['Protected stair/lift cores', 2, '3,381 full-core reservation cells', 'HOLD — mechanisms null; routes uncommissioned'],
  ['Local vent risers', 4, '900 capped reservation cells', 'HOLD — outlets, fans, ducts, controls null'],
  ['Smoke boundaries', 2, '2,744 complete fail-closed cells', 'HOLD — door mechanisms null'],
  ['Platform barriers', 8, '1,616 complete fail-closed cells', 'HOLD — powered gates null'],
  ['Lighting/power', 3, '56 fixture cells; zero circuit cells', 'HOLD — normal + emergency A/B null'],
  ['Local drainage', 8, '24 local cap cells; sealed header/boundary', 'HOLD — receiver/discharge null'],
  ['Fire/service access', 1, '3,025-cell internal spine; sealed interfaces', 'HOLD — external route null'],
  ['B07 west-two', 1, '8,134 excavation / 13,608 interaction cells', 'HOLD — 38 water cells and mechanisms unresolved'],
];
const systemTable = systemRows.map((row) => `| ${row.join(' | ')} |`).join('\n');
const matrixRows = acceptanceMatrix.map((row) => (
  `| ${row.id} | **${row.result}** | ${row.scope} | ${row.currentEvidence} |`
)).join('\n');
const markdown = `# Combined Zones Phase 1 D06 mechanism closure contract\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `This artifact is the strongest deterministic D06 mechanism-development record supported by current evidence. It validates exact candidate reservations and defines fail-closed mechanism and commissioning contracts. It does not claim that a stair, lift, vent, smoke door, platform gate, circuit, drain, fire route, or B07 system has been built, opened, commissioned, or shown compliant with any real-world code.\n\n`
  + `Mechanism-development payload SHA-256: \`${mechanismDevelopmentPayloadSha256}\`\n\n`
  + `## Exact candidate systems\n\n`
  + `| System | Count | Exact evidence | Current disposition |\n|---|---:|---|---|\n`
  + `${systemTable}\n\n`
  + `All 73 owner-packet manifest references reproduce against their exact source JSON pointers, counts, bounds, and coordinate hashes. These are reservation, retained-cap, and current-snapshot identities only. Accepted mechanism, circuit, future, construction, material, and operation cell counts remain zero.\n\n`
  + `The two external egress continuations are dry, disjoint, separated by 193 horizontal blocks, and identical to the D05 reference contract: EG-A has 1,274 continuation cells (546 stair / 234 lift) and EG-B has 833 (357 stair / 153 lift). Their physical openings remain unauthorized.\n\n`
  + `## Failure and fluid boundary\n\n`
  + `Every system defaults to capped, closed, unavailable, and uncommissioned when its mechanism, power, control, owner, interface, failure logic, or acceptance evidence is missing. The normal circuit and two independent emergency-circuit slots are explicit, but all three exact circuit manifests are null. The 29 commissioning records are frozen test contracts only and cannot be executed by this artifact.\n\n`
  + `B07-C-WEST-2 retains the exact 38 current water cells and one waterlogged state as unresolved inputs. D02 accepts zero receivers, zero future-fluid cells, and zero discharge exceptions; D05 remains unready and explicitly lists D06 mechanism cell sets as HOLD. No receiver, outfall, fluid treatment, or discharge is inferred.\n\n`
  + `## Acceptance matrix\n\n`
  + `| Criterion | Result | Scope | Current evidence |\n|---|---|---|---|\n`
  + `${matrixRows}\n\n`
  + `Current result: **${passCount} PASS / ${holdCount} HOLD**. PASS is limited to source identity, accepted planning policy, exact reservation geometry, bounded current-snapshot findings, and fail-closed static-cap/no-discharge controls. Mechanisms, complete-save evidence, physical openings, commissioning, operations, owners/interfaces, independent technical review, the separate owner acceptance of a complete technical identity, D06, and R00 G02 all remain HOLD.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  mechanismDevelopmentPayloadSha256,
  exactManifestReferenceCount: exactReservationReferenceValidation.length,
  commissioningTestContractCount: commissioningTestRegister.length,
  passCount,
  holdCount,
  operationCellCount: 0,
}, null, 2)}\n`);
