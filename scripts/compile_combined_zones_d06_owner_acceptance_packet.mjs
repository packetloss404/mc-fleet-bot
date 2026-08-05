#!/usr/bin/env node
/**
 * Compile the deterministic D06 sole-owner technical-acceptance packet.
 *
 * The packet binds already-selected offline planning geometry and states the
 * exact evidence predicates that must pass before D06 or R00 G02 can close.
 * It reads local artifacts only and never emits Minecraft operations.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T23:30:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d06-owner-acceptance-packet.md',
));

const INPUTS = Object.freeze({
  emptyEight: 'masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  egress: 'masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  lifeSafety: 'masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  selections: 'masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function binding(relativePath, role) {
  const data = fs.readFileSync(path.join(ROOT, relativePath));
  return {
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
    role,
  };
}

function setReference(set, sourcePath, jsonPointer, hashField = 'coordinateSetSha256') {
  assert(set && Number.isInteger(set.cellCount), `${jsonPointer} is not an exact set`);
  const setSha256 = set[hashField] ?? set.cellSetSha256;
  assert(/^[0-9a-f]{64}$/.test(setSha256), `${jsonPointer} exact-set hash is invalid`);
  return {
    sourcePath,
    jsonPointer,
    cellCount: set.cellCount,
    bounds: set.bounds,
    coordinateSetSha256: setSha256,
  };
}

function criterion(id, subject, status, currentEvidence, passWhenAll, holdReason = null) {
  return {
    id,
    subject,
    status,
    currentEvidence,
    passWhenAll,
    holdReason,
  };
}

const emptyEight = readJson(INPUTS.emptyEight);
const egress = readJson(INPUTS.egress);
const lifeSafety = readJson(INPUTS.lifeSafety);
const selections = readJson(INPUTS.selections);

assert(
  emptyEight.status === 'D06_INTERNAL_DESIGN_FROZEN_EXTERNAL_LIFE_SAFETY_HOLD_D07_WORDING_RESOLVED_C2_OMITTED',
  'Empty Eight D06 source status drift',
);
assert(
  egress.status === 'PARTIAL_PASS_D06_SURFACE_ENDPOINTS_AND_ROUTE_RESERVATIONS_FROZEN',
  'D06 egress source status drift',
);
assert(
  lifeSafety.status === 'PARTIAL_PASS_FAIL_CLOSED_B07_D06_ALTERNATIVES_FROZEN_ALL_RELEASE_AND_COMMISSIONING_HOLD',
  'D06 life-safety source status drift',
);
assert(
  selections.status === 'PARTIAL_PASS_OWNER_DELEGATED_SELECTIONS_FROZEN_TECHNICAL_GATES_HOLD',
  'owner-delegated selection source status drift',
);

const selectionIds = new Set(selections.selections.map(({ id }) => id));
for (const id of [
  'SEL-D06-TWO-EGRESS-ENDPOINTS',
  'SEL-D06-LIFE-SAFETY-BASIS',
  'SEL-D06-FAIL-CLOSED-MECHANISM-RESERVATIONS',
  'SEL-P1-B07-PUBLIC-SHAFT-DOGLEG',
]) {
  assert(selectionIds.has(id), `required delegated selection ${id} is missing`);
}

const life = lifeSafety.d06EmptyEightLifeSafety;
const selectedB07 = lifeSafety.b07PublicShaftTransfer.candidates.find(
  ({ id }) => id === lifeSafety.b07PublicShaftTransfer.recommendedCandidateId,
);
assert(selectedB07?.id === 'B07-C-WEST-2', 'selected B07 planning candidate drift');
assert(selectedB07.recommendedForSoleAuthorityReview === true, 'B07 west-two recommendation drift');
assert(selectedB07.immutableSnapshotAudit.generatedStructureExcavationIntersections.length === 0, 'B07 west-two excavation structure clearance drift');
assert(selectedB07.immutableSnapshotAudit.generatedStructureInteractionIntersections.length === 0, 'B07 west-two interaction structure clearance drift');
assert(selectedB07.immutableSnapshotAudit.excavationStateCensus.waterCellCount === 38, 'B07 west-two water count drift');

const selectedVent = life.ventilationOutletAlternatives.alternatives.find(
  ({ id }) => id === life.ventilationOutletAlternatives.recommendedAlternativeId,
);
const selectedDrainage = life.drainageAlternatives.alternatives.find(
  ({ id }) => id === life.drainageAlternatives.recommendedAlternativeId,
);
const selectedFire = life.fireServiceAccessAlternatives.alternatives.find(
  ({ id }) => id === life.fireServiceAccessAlternatives.recommendedAlternativeId,
);
assert(selectedVent?.id === 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS', 'selected vent basis drift');
assert(selectedVent.risers.length === 4, 'selected vent riser count drift');
assert(selectedVent.combinedReservation.cellCount === 900, 'selected vent union drift');
assert(selectedDrainage?.id === 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS', 'selected drainage basis drift');
assert(selectedDrainage.localSumpInterfaceCaps.length === 8, 'local sump cap count drift');
assert(selectedDrainage.capUnion.cellCount === 24, 'local sump cap union drift');
assert(selectedFire?.id === 'FIRE-EG-B', 'selected fire-service basis drift');

const selectedCoreLayouts = life.protectedEgressCoreLayouts.map((core, coreIndex) => {
  const layout = core.layoutAlternatives.find(({ recommendedForSoleAuthorityReview }) => (
    recommendedForSoleAuthorityReview
  ));
  assert(layout, `${core.id} has no recommended frozen layout`);
  const base = `/d06EmptyEightLifeSafety/protectedEgressCoreLayouts/${coreIndex}`;
  return {
    coreId: core.id,
    surveyedSurfaceEndpoint: core.surveyedSurfaceEndpoint,
    selectedLayoutId: layout.id,
    combinedProtectedCoreReservation: setReference(
      core.combinedProtectedCoreReservation,
      INPUTS.lifeSafety,
      `${base}/combinedProtectedCoreReservation`,
    ),
    protectedStairReservation: setReference(
      layout.stairReservation,
      INPUTS.lifeSafety,
      `${base}/layoutAlternatives/${core.layoutAlternatives.indexOf(layout)}/stairReservation`,
    ),
    accessibleLiftReservation: setReference(
      layout.accessibleLiftReservation,
      INPUTS.lifeSafety,
      `${base}/layoutAlternatives/${core.layoutAlternatives.indexOf(layout)}/accessibleLiftReservation`,
    ),
    compartmentSeparatorCap: setReference(
      core.compartmentSeparatorCap,
      INPUTS.lifeSafety,
      `${base}/compartmentSeparatorCap`,
    ),
    roofTransitionCap: setReference(
      core.retainedRoofTransitionCap,
      INPUTS.lifeSafety,
      `${base}/retainedRoofTransitionCap`,
    ),
    surfaceOutletCap: setReference(
      core.retainedSurfaceOutletCap,
      INPUTS.lifeSafety,
      `${base}/retainedSurfaceOutletCap`,
    ),
    mechanismSelected: core.mechanismSelected,
    commissionedEgress: core.commissionedEgress,
    commissionedAccessibleRoute: core.commissionedAccessibleRoute,
  };
});

const ventRisers = selectedVent.risers.map((riser, index) => ({
  id: riser.id,
  reservation: setReference(
    riser.riserReservation,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/ventilationOutletAlternatives/alternatives/0/risers/${index}/riserReservation`,
  ),
  surveyedSurface: riser.surveyedSurface,
  currentSnapshotAudit: {
    waterCellCount: riser.immutableSnapshotAudit.stateCensus.waterCellCount,
    waterloggedCellCount: riser.immutableSnapshotAudit.stateCensus.waterloggedCellCount,
    lavaCellCount: riser.immutableSnapshotAudit.stateCensus.lavaCellCount,
    generatedStructureExcavationIntersectionCount:
      riser.immutableSnapshotAudit.generatedStructureExcavationIntersections.length,
    generatedStructureInteractionIntersectionCount:
      riser.immutableSnapshotAudit.generatedStructureInteractionIntersections.length,
    blockEntityInteractionCount: riser.immutableSnapshotAudit.blockEntityInteractionIntersections.length,
  },
  exteriorOutletOpened: riser.exteriorOutletOpened,
  commissioned: riser.commissioned,
}));

const platformBarriers = life.failClosedBarriersAndSmokeInterfaces.platformBarriers.map((barrier, index) => ({
  id: barrier.id,
  retainedClosedBarrierReservation: setReference(
    barrier.retainedClosedBarrierReservation,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/platformBarriers/${index}/retainedClosedBarrierReservation`,
  ),
  staticGateBayCap: setReference(
    barrier.staticGateBayCap,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/platformBarriers/${index}/staticGateBayCap`,
  ),
  completeFailClosedBarrier: setReference(
    barrier.completeFailClosedBarrier,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/platformBarriers/${index}/completeFailClosedBarrier`,
  ),
  poweredGateMechanism: barrier.poweredGateMechanism,
  operationallyAuthorized: barrier.operationallyAuthorized,
}));

const smokeBoundaries = life.failClosedBarriersAndSmokeInterfaces.smokeBoundaries.map((boundary, index) => ({
  id: boundary.id,
  retainedBoundaryPlane: setReference(
    boundary.retainedBoundaryPlane,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/smokeBoundaries/${index}/retainedBoundaryPlane`,
  ),
  staticOpeningCaps: setReference(
    boundary.staticOpeningCaps,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/smokeBoundaries/${index}/staticOpeningCaps`,
  ),
  completeFailClosedBoundary: setReference(
    boundary.completeFailClosedBoundary,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/failClosedBarriersAndSmokeInterfaces/smokeBoundaries/${index}/completeFailClosedBoundary`,
  ),
  smokeDoorMechanism: boundary.smokeDoorMechanism,
  operationallyAuthorized: boundary.operationallyAuthorized,
}));

const fixtureReservations = emptyEight.d06.platforms.map((platform, index) => ({
  platformId: platform.id,
  reservation: setReference(
    platform.emergencyLightingDesign,
    INPUTS.emptyEight,
    `/d06/platforms/${index}/emergencyLightingDesign`,
    'cellSetSha256',
  ),
}));
assert(fixtureReservations.reduce((sum, item) => sum + item.reservation.cellCount, 0) === 56, 'fixture schedule count drift');

const localSumpCaps = selectedDrainage.localSumpInterfaceCaps.map((item, index) => ({
  id: item.id,
  cap: setReference(
    item.cap,
    INPUTS.lifeSafety,
    `/d06EmptyEightLifeSafety/drainageAlternatives/alternatives/0/localSumpInterfaceCaps/${index}/cap`,
  ),
}));

const fireIndex = life.fireServiceAccessAlternatives.alternatives.indexOf(selectedFire);
const acceptanceCriteria = [
  criterion(
    'D06-AC-01',
    'delegated planning basis and exact reservation identity',
    'PASS',
    {
      requiredSelectionIdsPresent: true,
      exactSourceBindingsPresent: true,
      technicalAcceptanceClaimedBySelections: false,
    },
    [
      'all four required owner-delegated planning selections remain hash-bound',
      'every exact reservation reference retains its source path, JSON pointer, cell count, bounds, and coordinate-set SHA-256',
    ],
  ),
  criterion(
    'D06-AC-02',
    'bounded current-snapshot geometry checks',
    'PASS',
    {
      protectedCoreSetsDisjoint: life.independenceProof.protectedCoreSetsDisjoint,
      ventRiserSetsDisjoint: life.independenceProof.recommendedVentRiserSetsDisjoint,
      localDrainCapsDisjoint: life.independenceProof.localDrainInterfaceCapsDisjoint,
      b07GeneratedStructureExcavationIntersections: 0,
      b07GeneratedStructureInteractionIntersections: 0,
    },
    [
      'bounded checks remain true against the source-bound immutable region evidence',
      'PASS is represented only as geometry/collision evidence, never structural, code, route, or commissioning acceptance',
    ],
  ),
  criterion(
    'D06-AC-03',
    'B07 west-two hydrology, lining, transfer, ownership, and technical design',
    'HOLD',
    {
      selectedCandidateId: selectedB07.id,
      excavationWaterCellCount: selectedB07.immutableSnapshotAudit.excavationStateCensus.waterCellCount,
      excavationWaterloggedCellCount: selectedB07.immutableSnapshotAudit.excavationStateCensus.waterloggedCellCount,
      interactionWaterCellCount: selectedB07.immutableSnapshotAudit.interactionStateCensus.waterCellCount,
      exactHydrologyTreatmentAccepted: false,
      exactLiningAndSupportAccepted: false,
      exactTransferMechanismsAccepted: false,
      exactOwnerAndInterfacesAccepted: false,
      independentTechnicalAcceptance: false,
    },
    [
      'all 38 water cells and the waterlogged state have an exact source-to-future disposition with no undeclared diversion',
      'lining, support, observation-refuge transfer, stair/lift, smoke, drainage, owners, and both endpoint interfaces are exact and technically accepted',
    ],
    'Structure-bound clearance passes, but 38 current water cells and every technical mechanism remain unresolved.',
  ),
  criterion(
    'D06-AC-04',
    'two independent protected stair and accessible-lift routes',
    'HOLD',
    {
      exactCoreReservations: true,
      exactDrySurfaceEndpoints: true,
      selectedMechanismCount: 0,
      commissionedEgressRouteCount: 0,
      commissionedAccessibleRouteCount: 0,
      independentTechnicalAcceptance: false,
    },
    [
      'each occupied-space-to-exterior stair route is continuous, exact, independently owned, fail-safe, and technically accepted',
      'each reserved accessible-lift route has an exact mechanism, refuge/transfer treatment, emergency operation, power, controls, ownership, and independent technical acceptance',
      'both routes remain independent under each declared single failure and have frozen commissioning tests',
    ],
    'The packet binds exact reservations and caps only; no complete stair, lift, or accessible route is commissioned.',
  ),
  criterion(
    'D06-AC-05',
    'smoke compartments and four local vent risers',
    'HOLD',
    {
      exactLocalVentRiserCount: ventRisers.length,
      exactLocalVentReservationCellCount: selectedVent.combinedReservation.cellCount,
      exteriorOutletCountOpened: life.ventilationOutletAlternatives.exteriorOutletCountOpened,
      smokeModelValidated: life.ventilationOutletAlternatives.smokeModelValidated,
      mechanismSelected: life.ventilationOutletAlternatives.mechanismSelected,
      commissioned: life.ventilationOutletAlternatives.commissioned,
    },
    [
      'smoke design criteria, scenarios, control zones, flow direction, outlet separation, failure states, and acceptance thresholds are authored and independently accepted',
      'every duct, fan/control mechanism, cap transition, exterior outlet, owner, interface, power source, and commissioning test is exact and hash-bound',
      'the four presently capped risers remain sealed until all criteria pass',
    ],
    'Four dry, structure-clear riser reservations pass geometry review, but no outlet, smoke model, mechanism, or commissioning exists.',
  ),
  criterion(
    'D06-AC-06',
    'platform barriers and smoke-opening mechanisms',
    'HOLD',
    {
      platformStaticGateCapCells: life.failClosedBarriersAndSmokeInterfaces.totals.platformStaticGateCapCells,
      smokeOpeningCapCells: life.failClosedBarriersAndSmokeInterfaces.totals.smokeOpeningCapCells,
      poweredPlatformMechanismCount: 0,
      smokeDoorMechanismCount: 0,
      operationallyAuthorizedCount: 0,
    },
    [
      'all barrier and smoke-door mechanism cells, controls, manual release, train-door alignment, failure state, owner, interface, and test criteria are exact and independently accepted',
      'static caps remain in the source/future contract until the complete mechanisms pass',
    ],
    'The exact 192 platform-gate and 72 smoke-opening cap cells are fail-closed reservations, not working systems.',
  ),
  criterion(
    'D06-AC-07',
    'normal and redundant emergency lighting/power circuits',
    'HOLD',
    {
      exactFixtureReservationCount: emptyEight.d06.lifeSafety.emergencyLighting.exactPlatformFixtureCount,
      fixtureBlock: emptyEight.d06.lifeSafety.emergencyLighting.fixtureBlock,
      photometricValidation: emptyEight.d06.lifeSafety.emergencyLighting.photometricOrEmergencyPowerValidation,
      exactNormalCircuitCellSetAccepted: false,
      exactEmergencyCircuitACellSetAccepted: false,
      exactEmergencyCircuitBCellSetAccepted: false,
      exactEmergencyPowerSourceAccepted: false,
      transferAndFailureLogicAccepted: false,
    },
    [
      'normal and two independent emergency circuit cellsets, sources, controls, transfer/failure behavior, owners, interfaces, and commissioning tests are exact and independently accepted',
      'the 56 fixture reservations pass an accepted coverage/visibility criterion under normal and every declared emergency state',
    ],
    'Fixture points are exact, but circuit paths, sources, redundancy, performance, and commissioning evidence do not exist.',
  ),
  criterion(
    'D06-AC-08',
    'eight capped local drainage interfaces',
    'HOLD',
    {
      exactLocalSumpCapCount: localSumpCaps.length,
      exactLocalSumpCapCellCount: selectedDrainage.capUnion.cellCount,
      externalDischargePoint: life.drainageAlternatives.externalDischargePoint,
      pumpMechanismSelected: life.drainageAlternatives.pumpMechanismSelected,
      hydraulicModelValidated: life.drainageAlternatives.hydraulicModelValidated,
      commissioned: life.drainageAlternatives.commissioned,
    },
    [
      'inflow, storage, freeboard, duration, failure, recovery, no-diversion, and future-fluid criteria are exact and accepted',
      'each sump/channel, pump/control if any, retained header, external discharge if any, owner, interface, and failure test is exact and independently accepted',
      'D05 accepts any external receiver/discharge ownership before a boundary cap may open',
    ],
    'Eight three-cell local caps remain sealed; no hydraulic model, pump, receiver, or external discharge is accepted.',
  ),
  criterion(
    'D06-AC-09',
    'fire/service access and exterior approach',
    'HOLD',
    {
      selectedPlanningAlternativeId: selectedFire.id,
      internalSpineReservationCellCount: life.fireServiceAccessAlternatives.internalSpineReservation.cellCount,
      normallyClosedSpineInterfaceCapCellCount: selectedFire.normallyClosedSpineInterfaceCap.cellCount,
      surfaceCompoundReservationCellCount: selectedFire.surfaceCompoundReservation.cellCount,
      externalApproachRoute: selectedFire.externalApproachRoute,
      emergencyServiceAcceptance: life.fireServiceAccessAlternatives.emergencyServiceAcceptance,
      commissioned: life.fireServiceAccessAlternatives.commissioned,
    },
    [
      'an exact external approach route, usable access criterion, surface compound, internal transfer, owner, interfaces, controls, and failure states are accepted',
      'the relevant emergency-service technical review and frozen commissioning tests pass',
      'the spine and surface caps remain sealed until all criteria pass',
    ],
    'EG-B is selected only as the minimum-geometry review interface; the external route is null and all interfaces remain closed.',
  ),
  criterion(
    'D06-AC-10',
    'canonical owners and exact cross-scope interface contracts',
    'HOLD',
    {
      canonicalOwnerIdsAssigned: 0,
      acceptedInterfaceContractIds: 0,
      undeclaredSharedPhysicalCellsPermitted: 0,
    },
    [
      'every construction, interaction, mechanism, control, utility, route, cap, outlet, and future-state cell has exactly one canonical owner',
      'every cross-owner seam has an exact, directioned, hash-bound interface contract and the global interface audit passes with zero undeclared seams',
    ],
    'The packet deliberately records null owner and interface IDs instead of inventing authority.',
  ),
  criterion(
    'D06-AC-11',
    'independent technical acceptance and D06 resolution',
    'HOLD',
    {
      lifeSafetyAcceptance: false,
      accessibilityAndLiftAcceptance: false,
      smokeAndVentilationAcceptance: false,
      fireServiceAcceptance: false,
      barrierAcceptance: false,
      emergencyPowerAcceptance: false,
      hydraulicAcceptance: false,
      structuralAcceptance: false,
      d06Resolved: false,
      r00G02Passed: false,
    },
    [
      'D06-AC-03 through D06-AC-10 all PASS against the same source-bound design identity',
      'the sole owner records acceptance of that complete technical identity without converting later release evidence into G02 evidence',
    ],
    'Planning selections are frozen, but technical acceptance, ownership/interfaces, and mechanisms are incomplete.',
  ),
];

const ownershipAndInterfaces = [
  ['OWN-D06-EG-A', 'EG-A protected stair, lift, separator, roof, and surface cap'],
  ['OWN-D06-EG-B', 'EG-B protected stair, lift, separator, roof, and surface cap'],
  ['OWN-D06-VENT', 'four local vent risers, duct/fan mechanisms, controls, and exterior outlets'],
  ['OWN-D06-SMOKE', 'two smoke boundaries, doors, detectors/controls, and compartment interfaces'],
  ['OWN-D06-BARRIER', 'eight platform barriers, gate mechanisms, controls, and train interfaces'],
  ['OWN-D06-POWER', 'normal lighting plus two independent emergency circuits, sources, and controls'],
  ['OWN-D06-DRAIN', 'eight local sumps, channels, caps, headers, pumps/controls, and receiver/discharge'],
  ['OWN-D06-FIRE', 'internal service spine, EG-B interface, surface compound, and external approach'],
  ['OWN-B07', 'public shaft west-two excavation, lining, transfer, utilities, drainage, and endpoint seams'],
].map(([slotId, subject]) => ({
  slotId,
  subject,
  canonicalOwnerId: null,
  acceptedInterfaceContractIds: [],
  status: 'HOLD_OWNER_AND_INTERFACES_UNASSIGNED',
}));

const sourceBindings = {
  emptyEight: binding(INPUTS.emptyEight, 'exact internal D06 reservations and sealed-state facts'),
  egress: binding(INPUTS.egress, 'exact surveyed egress endpoints and selected system basis'),
  lifeSafety: binding(INPUTS.lifeSafety, 'exact B07 and D06 fail-closed alternatives'),
  selections: binding(INPUTS.selections, 'owner-delegated planning selections without technical acceptance'),
};
const acceptanceBasis = {
  sourceBindings: Object.fromEntries(Object.entries(sourceBindings).map(([key, item]) => [key, {
    path: item.path,
    sha256: item.sha256,
  }])),
  selectionIds: [...selectionIds].filter((id) => id.startsWith('SEL-D06-') || id === 'SEL-P1-B07-PUBLIC-SHAFT-DOGLEG').sort(),
  b07CandidateId: selectedB07.id,
  b07ExcavationSha256: selectedB07.exactCellSets.excavationReservation.coordinateSetSha256,
  b07InteractionSha256: selectedB07.exactCellSets.interactionUnion.coordinateSetSha256,
  protectedCoreLayoutIds: selectedCoreLayouts.map(({ selectedLayoutId }) => selectedLayoutId),
  protectedCoreSha256: selectedCoreLayouts.map(({ combinedProtectedCoreReservation }) => (
    combinedProtectedCoreReservation.coordinateSetSha256
  )),
  ventAlternativeId: selectedVent.id,
  ventUnionSha256: selectedVent.combinedReservation.coordinateSetSha256,
  drainageAlternativeId: selectedDrainage.id,
  drainageCapUnionSha256: selectedDrainage.capUnion.coordinateSetSha256,
  fireServiceAlternativeId: selectedFire.id,
  fireServiceInterfaceSha256: selectedFire.normallyClosedSpineInterfaceCap.coordinateSetSha256,
  criterionIds: acceptanceCriteria.map(({ id }) => id),
};
const acceptanceBasisSha256 = sha256(
  `combined-zones-d06-owner-acceptance-basis-v1\n${JSON.stringify(acceptanceBasis)}\n`,
);
const ownerAcceptanceStatement = `I, the sole owner, accept D06/B07 planning and acceptance-criteria basis SHA-256 ${acceptanceBasisSha256} as the controlling fail-closed basis for continued technical development only. I do not mark any current HOLD as PASS, accept a missing mechanism, assign a missing owner or interface, open a cap, commission a system, authorize operations or construction, or authorize a world edit.`;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-owner-acceptance-packet',
  generatedAtUtc: GENERATED_AT,
  status: 'READY_FOR_SOLE_OWNER_REVIEW_PLANNING_BASIS_BOUND_D06_AND_G02_HOLD',
  authority: {
    chain: '01 + 02 + 03 -> 04 normalized architecture -> 05 current-world placement',
    soleHumanAuthority: true,
    additionalHumanDecisionMakerRequired: false,
    planningSelectionsAlreadyDelegatedAndRecorded: true,
    technicalAcceptanceRecorded: false,
    executable: false,
    constructionAuthorized: false,
    worldEditAuthorized: false,
    operationCellCount: 0,
    materialCellCount: 0,
    commissioned: false,
    codeComplianceClaimed: false,
  },
  sourceBindings,
  acceptanceBasisSha256,
  evidenceClassification: {
    immutableFacts: [
      'source file hashes, exact copied-snapshot block-state counts, surveyed endpoints, and source-emitted exact-set hashes',
    ],
    deterministicDerivations: [
      'set counts, bounds, intersections, disjointness, selected-alternative schedules, and current gate evaluations reproduced from bound sources',
    ],
    ownerSelectedPlanningAssumptions: [
      'two existing stair/lift core layouts, B07 west-two, four local capped vents, static barrier/smoke caps, eight local drainage caps, and EG-B fire-service review interface',
    ],
    evidenceGaps: [
      'mechanism cells and specifications, capacity/performance criteria, complete future states, canonical owners, interface contracts, independent technical acceptance, and commissioning evidence',
    ],
    prohibition: 'A planning assumption or evidence gap must never be serialized as an immutable fact, technical PASS, owner assignment, commissioned system, or release authorization.',
  },
  selectedPlanningBasis: {
    sourceSelectionIds: acceptanceBasis.selectionIds,
    ownerReviewMeaning: 'Confirm that the already-delegated fail-closed planning basis controls further technical work.',
    ownerReviewDoesNotMean: [
      'technical, expert, code, structural, hydraulic, accessibility, smoke, fire-service, or commissioning acceptance',
      'assignment of a canonical owner or acceptance of any interface contract',
      'permission to open a cap, generate operations, mutate the world, or advance R00',
    ],
  },
  soleOwnerAcceptanceStatementTemplate: {
    acceptanceBasisSha256,
    copyableStatement: ownerAcceptanceStatement,
    accepts: [
      'the exact already-delegated fail-closed D06/B07 planning basis',
      'the evidence classifications and D06-AC-01 through D06-AC-11 acceptance criteria as the controlling technical-development checklist',
    ],
    doesNotAccept: [
      'any current HOLD as PASS',
      'technical, expert, code, structural, hydraulic, accessibility, smoke, fire-service, emergency-power, or commissioning acceptance',
      'a missing mechanism, owner, interface contract, future state, receiver, route, performance criterion, or test result',
      'opening, commissioning, operation generation, construction, release advancement, or world edits',
    ],
    recordingBoundary: 'Copying this statement records planning-basis/checklist acceptance only. A separate future statement bound to one complete accepted technical identity is required to resolve D06.',
  },
  b07WestTwo: {
    candidateId: selectedB07.id,
    anchors: selectedB07.anchors,
    centerline: {
      pointCount: selectedB07.centerline.pointCount,
      orderedSha256: selectedB07.centerline.orderedSha256,
    },
    crossSection: selectedB07.crossSection,
    excavationReservation: setReference(
      selectedB07.exactCellSets.excavationReservation,
      INPUTS.lifeSafety,
      '/b07PublicShaftTransfer/candidates/2/exactCellSets/excavationReservation',
    ),
    interactionUnion: setReference(
      selectedB07.exactCellSets.interactionUnion,
      INPUTS.lifeSafety,
      '/b07PublicShaftTransfer/candidates/2/exactCellSets/interactionUnion',
    ),
    immutableSnapshotFacts: {
      excavationWaterCellCount: selectedB07.immutableSnapshotAudit.excavationStateCensus.waterCellCount,
      excavationWaterloggedCellCount: selectedB07.immutableSnapshotAudit.excavationStateCensus.waterloggedCellCount,
      excavationLavaCellCount: selectedB07.immutableSnapshotAudit.excavationStateCensus.lavaCellCount,
      interactionWaterCellCount: selectedB07.immutableSnapshotAudit.interactionStateCensus.waterCellCount,
      interactionWaterloggedCellCount: selectedB07.immutableSnapshotAudit.interactionStateCensus.waterloggedCellCount,
      generatedStructureExcavationIntersectionCount: 0,
      generatedStructureInteractionIntersectionCount: 0,
      protectedRelicInteractionIntersectionCount: 0,
      blockEntityInteractionIntersectionCount: 0,
    },
    technicalDisposition: 'HOLD_38_WATER_CELLS_AND_MECHANISMS_OWNERS_INTERFACES_UNACCEPTED',
  },
  protectedEgressAndAccessibleLiftCores: {
    selectedLayouts: selectedCoreLayouts,
    protectedCoreSetsDisjoint: life.independenceProof.protectedCoreSetsDisjoint,
    mechanismSelectedCount: 0,
    commissionedEgressRouteCount: 0,
    commissionedAccessibleRouteCount: 0,
    technicalDisposition: 'HOLD_EXACT_RESERVATIONS_AND_CAPS_ONLY',
  },
  smokeVentilationAndBarriers: {
    localVentAlternativeId: selectedVent.id,
    localVentRisers: ventRisers,
    localVentUnion: setReference(
      selectedVent.combinedReservation,
      INPUTS.lifeSafety,
      '/d06EmptyEightLifeSafety/ventilationOutletAlternatives/alternatives/0/combinedReservation',
    ),
    riserSetsPairwiseDisjoint: selectedVent.riserSetsPairwiseDisjoint,
    exteriorOutletCountOpened: life.ventilationOutletAlternatives.exteriorOutletCountOpened,
    smokeModelValidated: life.ventilationOutletAlternatives.smokeModelValidated,
    mechanismSelected: life.ventilationOutletAlternatives.mechanismSelected,
    commissioned: life.ventilationOutletAlternatives.commissioned,
    platformBarriers,
    smokeBoundaries,
    totals: life.failClosedBarriersAndSmokeInterfaces.totals,
    failClosedPrinciple: life.failClosedBarriersAndSmokeInterfaces.recommendedFailClosedPrinciple,
    technicalDisposition: 'HOLD_RISERS_AND_OPENINGS_CAPPED_NO_SMOKE_MODEL_MECHANISM_OUTLET_OR_COMMISSIONING',
  },
  emergencyLightingAndPower: {
    ownerSelectedRequirement: egress.soleAuthorityRecommendations.d06.emergencyLighting,
    fixtureReservations,
    exactFixtureReservationCount: emptyEight.d06.lifeSafety.emergencyLighting.exactPlatformFixtureCount,
    fixtureBlock: emptyEight.d06.lifeSafety.emergencyLighting.fixtureBlock,
    normalCircuitReservation: null,
    emergencyCircuitAReservation: null,
    emergencyCircuitBReservation: null,
    emergencyPowerSource: null,
    transferAndFailureLogic: null,
    photometricOrEmergencyPowerValidation: emptyEight.d06.lifeSafety.emergencyLighting.photometricOrEmergencyPowerValidation,
    commissioned: false,
    technicalDisposition: 'HOLD_FIXTURE_POINTS_ONLY_CIRCUITS_SOURCES_FAILURE_LOGIC_AND_VALIDATION_MISSING',
  },
  cappedDrainage: {
    selectedAlternativeId: selectedDrainage.id,
    localSumpInterfaceCaps: localSumpCaps,
    capUnion: setReference(
      selectedDrainage.capUnion,
      INPUTS.lifeSafety,
      '/d06EmptyEightLifeSafety/drainageAlternatives/alternatives/0/capUnion',
    ),
    retainedUnconnectedHeaderReservation: setReference(
      selectedDrainage.retainedUnconnectedHeaderReservation,
      INPUTS.lifeSafety,
      '/d06EmptyEightLifeSafety/drainageAlternatives/alternatives/0/retainedUnconnectedHeaderReservation',
    ),
    retainedExternalBoundaryCap: setReference(
      selectedDrainage.retainedExternalBoundaryCap,
      INPUTS.lifeSafety,
      '/d06EmptyEightLifeSafety/drainageAlternatives/alternatives/0/retainedExternalBoundaryCap',
    ),
    externalDischargePoint: life.drainageAlternatives.externalDischargePoint,
    pumpMechanismSelected: life.drainageAlternatives.pumpMechanismSelected,
    hydraulicModelValidated: life.drainageAlternatives.hydraulicModelValidated,
    commissioned: life.drainageAlternatives.commissioned,
    technicalDisposition: 'HOLD_EIGHT_LOCAL_CAPS_SEALED_NO_PUMP_RECEIVER_DISCHARGE_OR_HYDRAULIC_ACCEPTANCE',
  },
  fireAndServiceAccess: {
    selectedAlternativeId: selectedFire.id,
    internalSpineReservation: setReference(
      life.fireServiceAccessAlternatives.internalSpineReservation,
      INPUTS.lifeSafety,
      '/d06EmptyEightLifeSafety/fireServiceAccessAlternatives/internalSpineReservation',
    ),
    internalTransferReservation: setReference(
      selectedFire.internalTransferReservation,
      INPUTS.lifeSafety,
      `/d06EmptyEightLifeSafety/fireServiceAccessAlternatives/alternatives/${fireIndex}/internalTransferReservation`,
    ),
    normallyClosedSpineInterfaceCap: setReference(
      selectedFire.normallyClosedSpineInterfaceCap,
      INPUTS.lifeSafety,
      `/d06EmptyEightLifeSafety/fireServiceAccessAlternatives/alternatives/${fireIndex}/normallyClosedSpineInterfaceCap`,
    ),
    surfaceCompoundReservation: setReference(
      selectedFire.surfaceCompoundReservation,
      INPUTS.lifeSafety,
      `/d06EmptyEightLifeSafety/fireServiceAccessAlternatives/alternatives/${fireIndex}/surfaceCompoundReservation`,
    ),
    sealedSurfaceApproachInterface: setReference(
      selectedFire.sealedSurfaceApproachInterface,
      INPUTS.lifeSafety,
      `/d06EmptyEightLifeSafety/fireServiceAccessAlternatives/alternatives/${fireIndex}/sealedSurfaceApproachInterface`,
    ),
    externalApproachRoute: selectedFire.externalApproachRoute,
    emergencyServiceAcceptance: life.fireServiceAccessAlternatives.emergencyServiceAcceptance,
    externalApproachRouteProven: life.fireServiceAccessAlternatives.externalApproachRouteProven,
    commissioned: life.fireServiceAccessAlternatives.commissioned,
    technicalDisposition: 'HOLD_EG_B_REVIEW_INTERFACE_SEALED_EXTERNAL_APPROACH_NULL',
  },
  ownershipAndInterfaces: {
    rule: 'Every physical or interaction cell must have exactly one canonical owner; every cross-owner seam requires an exact accepted interface contract.',
    register: ownershipAndInterfaces,
    acceptedCanonicalOwnerCount: 0,
    acceptedInterfaceContractCount: 0,
    technicalDisposition: 'HOLD_NO_OWNER_OR_INTERFACE_ID_INVENTED',
  },
  acceptanceCriteria,
  disposition: {
    passCount: acceptanceCriteria.filter(({ status }) => status === 'PASS').length,
    holdCount: acceptanceCriteria.filter(({ status }) => status === 'HOLD').length,
    ownerPlanningBasisSelected: true,
    ownerTechnicalAcceptanceRecorded: false,
    d06Resolved: false,
    r00G02Passed: false,
    sealed: true,
    commissioned: false,
    operationCellCount: 0,
    materialCellCount: 0,
    worldEditAuthorized: false,
    nextOwnerReviewAction: 'Review and retain the already-selected fail-closed planning basis; do not mark technical acceptance until D06-AC-03 through D06-AC-10 all pass against one hash-bound design identity.',
  },
  releaseBoundary: {
    preR00EvidenceOnly: true,
    laterEvidenceCannotCloseD06OrG02: [
      'operations',
      'source guards',
      'preflight',
      'entity clearance',
      'pilot execution',
      'rollback',
      'route QA',
      'post-state QA',
    ],
    statement: 'This packet is review and acceptance-criteria evidence only. It emits no operation, opens no cap, commissions no system, and authorizes no physical work.',
  },
};

const gateRows = acceptanceCriteria.map((item) => (
  `| ${item.id} | ${item.subject} | **${item.status}** | ${item.holdReason ?? 'Bounded criterion passes only in the stated scope.'} |`
)).join('\n');
const coreRows = selectedCoreLayouts.map((core) => (
  `| ${core.coreId} | ${core.selectedLayoutId} | ${core.protectedStairReservation.cellCount.toLocaleString()} | ${core.accessibleLiftReservation.cellCount.toLocaleString()} | ${core.surfaceOutletCap.cellCount} | sealed / uncommissioned |`
)).join('\n');
const ventRows = ventRisers.map((riser) => (
  `| ${riser.id} | ${riser.reservation.cellCount} | ${riser.surveyedSurface.landingY} | ${riser.currentSnapshotAudit.waterCellCount}/${riser.currentSnapshotAudit.lavaCellCount} | 0 | capped / uncommissioned |`
)).join('\n');
const ownershipRows = ownershipAndInterfaces.map((item) => (
  `| ${item.slotId} | ${item.subject} | null | 0 | **HOLD** |`
)).join('\n');

const markdown = `# D06 sole-owner technical-acceptance packet\n\n`
  + `Status: **READY FOR SOLE-OWNER REVIEW — PLANNING BASIS BOUND — D06 AND R00 G02 HOLD — ZERO OPERATIONS**\n\n`
  + `This packet binds the already delegated D06/B07 planning choices and states the exact evidence predicates for technical acceptance. The sole owner is the only human decision authority. Technical reviewers provide evidence; they do not become additional project decision-makers. The packet does not accept missing mechanisms, owners, interfaces, performance, or commissioning evidence.\n\n`
  + `## Truth boundary\n\n`
  + `- **Immutable facts:** source hashes, exact copied-snapshot counts, surveyed endpoints, and source-emitted cell-set hashes.\n`
  + `- **Deterministic derivations:** counts, bounds, intersections, disjointness, schedules, and gate evaluations reproduced from those sources.\n`
  + `- **Owner-selected planning assumptions:** two frozen stair/lift cores, B07 west-two, four local capped vents, static barrier/smoke caps, eight local drainage caps, and the sealed EG-B service-review interface.\n`
  + `- **Evidence gaps:** mechanisms, capacity/performance criteria, future states, owners, contracts, independent technical acceptance, and commissioning. A gap is never a PASS.\n\n`
  + `Acceptance-basis SHA-256: \`${report.acceptanceBasisSha256}\`. Every exact set below retains its source JSON pointer and coordinate-set SHA-256 in the JSON packet.\n\n`
  + `## Current decision\n\n`
  + `The owner-delegated planning basis is selected. Technical acceptance is **not** recorded. D06 and R00 G02 remain **HOLD**. The safe present state is sealed and uncommissioned.\n\n`
  + `### Copyable sole-owner planning-basis acceptance\n\n`
  + `Copying the following statement accepts only the exact planning basis and the acceptance checklist. It cannot mark a HOLD as PASS or authorize physical work.\n\n`
  + `> ${ownerAcceptanceStatement}\n\n`
  + `## B07 west-two\n\n`
  + `B07-C-WEST-2 preserves the three authored anchors and 7×7 section. Its exact excavation set is ${selectedB07.exactCellSets.excavationReservation.cellCount.toLocaleString()} cells (\`${selectedB07.exactCellSets.excavationReservation.coordinateSetSha256}\`) and its interaction union is ${selectedB07.exactCellSets.interactionUnion.cellCount.toLocaleString()} cells. Both clear the recorded generated-structure bounds. The excavation still contains **38 water cells** and one waterlogged state; the interaction union contains 109 water cells and two waterlogged states. No lining, support, transfer, hydrology treatment, owner, or interface is accepted.\n\n`
  + `## Protected stairs and accessible lifts\n\n`
  + `| Core | Frozen layout | Stair cells | Lift cells | Surface-cap cells | State |\n|---|---|---:|---:|---:|---|\n${coreRows}\n\n`
  + `The two protected-core sets are disjoint and terminate at exact dry surveyed landings. Their separator, roof, and outlet sets are static caps. No lift, door, refuge-transfer, emergency-operation, or accessible-route mechanism is selected or commissioned.\n\n`
  + `## Smoke, barriers, and four capped vents\n\n`
  + `| Riser | Cells | Surveyed landing Y | Water/lava cells | Structure intersections | State |\n|---|---:|---:|---:|---:|---|\n${ventRows}\n\n`
  + `The four local 3×3 risers form a ${selectedVent.combinedReservation.cellCount}-cell exact union and are pairwise disjoint. Their bounded snapshot checks are dry and structure-clear, but no outlet is open and no smoke model, fan/duct mechanism, power, owner, interface, or commissioning test is accepted.\n\n`
  + `All eight platform barriers retain ${life.failClosedBarriersAndSmokeInterfaces.totals.platformStaticGateCapCells} static gate-cap cells. The two smoke boundaries retain ${life.failClosedBarriersAndSmokeInterfaces.totals.smokeOpeningCapCells} static opening-cap cells. Powered mechanisms are null and operational authorization is false.\n\n`
  + `## Emergency lighting and power\n\n`
  + `The internal design reserves 56 sea-lantern fixture points, seven per platform. The selected requirement calls for separately switched redundant emergency circuits, but exact normal/emergency circuit routes, sources, transfer logic, failure behavior, owners, performance validation, and commissioning tests are null or false. Fixture reservations alone cannot pass D06.\n\n`
  + `## Capped drainage\n\n`
  + `Eight pairwise-disjoint three-cell local sump-interface caps form a 24-cell exact union. The retained header and external boundary remain capped. External discharge is null; pump selection, hydraulic validation, receiver ownership, and commissioning are false. No cap may open until inflow, storage, freeboard, duration, failure/recovery, future-fluid, no-diversion, owner/interface, and D05 receiver criteria all pass.\n\n`
  + `## Fire and service access\n\n`
  + `EG-B remains the selected minimum-geometry review interface beside the ${life.fireServiceAccessAlternatives.internalSpineReservation.cellCount.toLocaleString()}-cell internal spine. Its 35-cell spine interface and surface approach remain closed. The external approach route is null, emergency-service acceptance is false, and the system is uncommissioned.\n\n`
  + `## Owner and interface register\n\n`
  + `| Required slot | Subject | Canonical owner | Accepted contracts | Status |\n|---|---|---|---:|---|\n${ownershipRows}\n\n`
  + `Null is intentional. The packet does not invent owners or agreements. Every physical/interaction cell needs one canonical owner, and every cross-owner seam needs an exact hash-bound contract before technical acceptance.\n\n`
  + `## Explicit acceptance gates\n\n`
  + `| Gate | Subject | Current | Reason |\n|---|---|---|---|\n${gateRows}\n\n`
  + `Current totals: **${report.disposition.passCount} bounded PASS / ${report.disposition.holdCount} HOLD**. The PASS items cover planning authority and bounded geometry checks only. D06 closes only when D06-AC-03 through D06-AC-10 all pass against the same hash-bound design identity and the sole owner records technical acceptance.\n\n`
  + `## Release boundary\n\n`
  + `World edits authorized: **no**. Operation cells: **0**. Material cells: **0**. Commissioned systems: **0**. Operations, source guards, preflight, entity clearance, pilot execution, rollback, route QA, and post-state QA are later release evidence and cannot substitute for pre-R00 D06/G02 technical acceptance.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);
process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  passCount: report.disposition.passCount,
  holdCount: report.disposition.holdCount,
  d06Resolved: report.disposition.d06Resolved,
  operationCellCount: report.disposition.operationCellCount,
})}\n`);
