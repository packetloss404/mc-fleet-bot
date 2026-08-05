#!/usr/bin/env node
/**
 * Compile the strongest deterministic D02 Minecraft-domain technical-
 * development record supported by the accepted planning basis and current
 * offline evidence. This compiler emits no operations or material cells and
 * cannot turn a missing complete save or technical HOLD into PASS.
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

const GENERATED_AT = value('--generated-at', '2026-08-05T01:10:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d02-technical-design.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d02-technical-design.md',
));

const INPUTS = Object.freeze({
  ownerAcceptance: 'masterplans/05-combined-zones/phase1-owner-review-acceptance.json',
  d02OwnerPacket: 'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
  c1CivilDesign: 'masterplans/05-combined-zones/phase1-c1-civil-design.json',
  d02RegionEvidence: 'masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  d02HydrologyOutfalls: 'masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
  d02ClosedDrainage: 'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
});

const ROLES = Object.freeze({
  ownerAcceptance: 'sole-owner planning-policy acceptance; all technical HOLDs retained',
  d02OwnerPacket: 'accepted D02 planning basis, evidence taxonomy, and closure checklist',
  c1CivilDesign: 'exact C1 setout, cross-section, collection datums, and D02 blockers',
  d02RegionEvidence: 'region-only state evidence and complete copied-save audit',
  d02HydrologyOutfalls: 'exact current fluid topology, gravity lows, and receiver evaluation',
  d02ClosedDrainage: 'exact capped-sump alternatives, selected manifests, and no-build hold',
});

const SELECTED_ALTERNATIVE
  = 'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD';

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

function compareCells(left, right) {
  return left.x - right.x || left.y - right.y || left.z - right.z;
}

function hashRoleCells(cells, preamble) {
  const coordinate = crypto.createHash('sha256');
  const role = crypto.createHash('sha256');
  coordinate.update(`${preamble}-coordinates\n`);
  role.update(`${preamble}-roles\n`);
  for (const cell of [...cells].sort(compareCells)) {
    coordinate.update(`${cell.x},${cell.y},${cell.z}\n`);
    role.update(`${cell.x},${cell.y},${cell.z},${[...(cell.roles ?? [])].sort().join('+')}\n`);
  }
  return {
    coordinateSetSha256: coordinate.digest('hex'),
    roleStreamSha256: role.digest('hex'),
  };
}

function insideBounds(cell, bounds) {
  return cell.x >= bounds.minX && cell.x <= bounds.maxX
    && cell.y >= bounds.minY && cell.y <= bounds.maxY
    && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
}

function manifestWithoutCells(manifest) {
  const { cells: _cells, ...identity } = manifest;
  return identity;
}

function matrixRow(id, result, scope, currentEvidence, passRule, currentDisposition = null) {
  return { id, result, scope, currentEvidence, passRule, currentDisposition };
}

const sourceBindings = Object.fromEntries(Object.entries(INPUTS).map(([key, relativePath]) => [
  key,
  binding(relativePath, ROLES[key]),
]));
const ownerAcceptance = readJson(INPUTS.ownerAcceptance);
const d02Packet = readJson(INPUTS.d02OwnerPacket);
const civil = readJson(INPUTS.c1CivilDesign);
const region = readJson(INPUTS.d02RegionEvidence);
const hydrology = readJson(INPUTS.d02HydrologyOutfalls);
const closedDrainage = readJson(INPUTS.d02ClosedDrainage);

assert(ownerAcceptance.status
  === 'OWNER_ACCEPTANCE_RECORDED_PLANNING_POLICY_FROZEN_ALL_TECHNICAL_HOLDS_RETAINED',
'Owner-acceptance status drift');
assert(ownerAcceptance.effectivePlanningDisposition?.d02PlanningPolicyAccepted === true,
  'D02 planning policy is not owner-accepted');
assert(ownerAcceptance.effectivePlanningDisposition?.technicalHoldPassedCount === 0
  && ownerAcceptance.disposition?.allTechnicalHoldsRetained === true,
'Owner acceptance must retain every technical HOLD');
assert(ownerAcceptance.disposition?.g02Passed === false
  && ownerAcceptance.disposition?.r00Passed === false,
'Owner acceptance cannot pass G02 or R00');
assert(ownerAcceptance.safetyBoundary?.operationCellCount === 0
  && ownerAcceptance.safetyBoundary?.worldEditAuthorized === false,
'Owner-acceptance safety boundary drift');
assert(d02Packet.id === 'combined-zones-phase1-d02-owner-acceptance-packet',
  'D02 packet identity drift');
assert(d02Packet.selectedClosedDrainageBasis?.alternativeId === SELECTED_ALTERNATIVE,
  'D02 selected drainage identity drift');
assert(d02Packet.finalGate?.d02Resolved === false
  && d02Packet.finalGate?.r00G02Passed === false,
'D02 packet must remain unresolved');
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'C1 civil status drift');
assert(region.status === 'PARTIAL_PASS_REGION_FACTS_COMPLETE_SAVE_MISSING_D02_HOLD',
  'D02-S01/S02 status drift');
assert(hydrology.status
  === 'PARTIAL_PASS_EXACT_CURRENT_COMPONENTS_NO_ACCEPTABLE_OUTFALL_D02_HOLD',
'D02-S03 status drift');
assert(closedDrainage.status
  === 'PARTIAL_PASS_PREFERRED_CLOSED_SUMP_PLANNING_GEOMETRY_D02_HOLD',
'D02-S04 status drift');
assert(region.selectedRegionOnlyEvidence?.identity?.sha256
  === hydrology.immutableEvidenceIdentity?.regionSnapshot?.sha256
  && region.selectedRegionOnlyEvidence?.identity?.sha256 === civil.immutableSnapshot?.sha256,
'Immutable region identity drift across D02 sources');
assert(hydrology.receiverEvaluation?.acceptedReceiverCount === 0
  && hydrology.receiverEvaluation?.selectedOutfall === null,
'Current evidence must not contain an accepted receiver or outfall');
assert(region.copiedSaveCompletenessAudit?.completeCandidateCount === 0,
'A complete save unexpectedly exists; regenerate the upstream audit first');

const preferred = closedDrainage.alternatives.find(({ id }) => id === SELECTED_ALTERNATIVE);
const rejectedRoadAsset = closedDrainage.alternatives
  .find(({ id }) => id === 'ALT-D02-S04-A-DISTRIBUTED-CAPPED-SUMPS')
  ?.assetRecords?.find(({ lowRunId }) => lowRunId === 'ROAD-LOW-001');
assert(preferred, 'Selected D02-S04 alternative missing');
assert(rejectedRoadAsset, 'ROAD-LOW-001 rejected chamber evidence missing');
assert(closedDrainage.preferredPlanningAlternative?.alternativeId === preferred.id,
  'Preferred D02-S04 alternative drift');
assert(preferred.sumpCount === 10 && preferred.noBuildPreservationHoldCount === 1,
  'Expected ten capped-sump candidates and one no-build hold');
assert(preferred.candidateCellManifest?.cellCount === 432,
  'Selected aggregate candidate count drift');
assert(preferred.currentRegionAudit?.strictNoCurrentFluidInteraction === true
  && preferred.currentRegionAudit?.blockEntityIntersectionCount === 0
  && preferred.currentRegionAudit?.generatedStructureBoundsIntersectionCount === 0,
'Selected current-region clearance drift');

const lowRunInterfaces = new Map([
  ...hydrology.collectionSystems.roadSouthDrain.gravityLowInterfaces.map((record) => [
    record.id,
    { ...record, system: 'C1_ROAD_SOUTH_DRAIN' },
  ]),
  ...hydrology.collectionSystems.railNorthCess.gravityLowInterfaces.map((record) => [
    record.id,
    { ...record, system: 'C1_RAIL_NORTH_CESS' },
  ]),
]);
assert(lowRunInterfaces.size === 11, 'Expected eleven exact gravity-low interfaces');

const packetCandidates = new Map(d02Packet.selectedClosedDrainageBasis.selectedSumpCandidates
  .map((record) => [record.lowRunId, record]));
const selectedOwnership = new Map(preferred.ownershipAndInterfaces
  .map((record) => [record.lowRunId, record]));
assert(packetCandidates.size === 10 && selectedOwnership.size === 10,
  'Selected per-asset inventory drift');

const aggregateCells = preferred.candidateCellManifest.cells;
const exactAssetDesigns = [...selectedOwnership.values()]
  .sort((left, right) => left.lowRunId.localeCompare(right.lowRunId))
  .map((record) => {
    const packetRecord = packetCandidates.get(record.lowRunId);
    const lowRun = lowRunInterfaces.get(record.lowRunId);
    assert(packetRecord && lowRun, `Missing bound evidence for ${record.lowRunId}`);
    assert(packetRecord.assetId === record.assetId
      && JSON.stringify(packetRecord.exactAssetCellManifest)
        === JSON.stringify(record.exactAssetCellManifest),
    `Asset manifest drift for ${record.lowRunId}`);
    assert(packetRecord.anchorStation >= lowRun.startStation
      && packetRecord.anchorStation <= lowRun.endStation,
    `Anchor station outside gravity-low run for ${record.lowRunId}`);
    const cells = aggregateCells.filter((cell) => insideBounds(
      cell,
      record.exactAssetCellManifest.bounds,
    ));
    assert(cells.length === record.exactAssetCellManifest.cellCount,
      `Aggregate partition count drift for ${record.lowRunId}`);
    const hashes = hashRoleCells(
      cells,
      `combined-zones-d02-s04-ALT-D02-S04-D-${record.lowRunId}`,
    );
    assert(hashes.coordinateSetSha256 === record.exactAssetCellManifest.coordinateSetSha256
      && hashes.roleStreamSha256 === record.exactAssetCellManifest.roleStreamSha256,
    `Aggregate partition hash drift for ${record.lowRunId}`);
    const excavationEnvelopeCellCount = cells.filter(
      ({ roles }) => roles.includes('SUMP_EXCAVATION_ENVELOPE'),
    ).length;
    const sealedCapEnvelopeCellCount = cells.filter(
      ({ roles }) => roles.includes('SEALED_CAP_ENVELOPE'),
    ).length;
    assert(excavationEnvelopeCellCount + sealedCapEnvelopeCellCount === cells.length,
      `Unexpected role in ${record.lowRunId}`);
    return {
      assetId: record.assetId,
      lowRunId: record.lowRunId,
      system: record.system,
      gravityLow: {
        startStation: lowRun.startStation,
        endStation: lowRun.endStation,
        datumY: lowRun.datumY,
        kind: lowRun.kind,
        interfaceCellCount: lowRun.interfaceCellCount,
        interfaceCellSetSha256: lowRun.interfaceCellSetSha256,
        continuousOneWayGravityOutlet: false,
      },
      selectedAnchorStation: packetRecord.anchorStation,
      exactCandidateCellManifest: record.exactAssetCellManifest,
      envelopeRoleCounts: {
        excavationEnvelopeCellCount,
        sealedCapEnvelopeCellCount,
        derivation: 'Exact cells are partitioned by the SUMP_EXCAVATION_ENVELOPE and SEALED_CAP_ENVELOPE roles; neither role is an accepted material or storage interior.',
      },
      presentRegionEvidence: packetRecord.presentStateAudit,
      collectionInlet: record.interfaces.collectionInlet,
      capacityAndStorage: {
        candidateExcavationEnvelopeCellCount: excavationEnvelopeCellCount,
        acceptedInteriorStorageCellManifest: null,
        acceptedWorkingStorageWaterBlockCount: null,
        acceptedPeakWetStorageCellCount: null,
        acceptedEvaluationTickCount: null,
        acceptedRecoveryReserveCellCount: null,
        acceptedFreeboardBlocks: null,
        status: 'HOLD_ENVELOPE_IS_NOT_A_STORAGE_OR_CAPACITY_PROOF',
      },
      failureAndRecovery: {
        failClosedDisposition: 'KEEP_SEALED_UNCOMMISSIONED_NO_OVERFLOW_NO_DISCHARGE',
        overflowCellCount: record.interfaces.overflow.cellManifest.cellCount,
        overflowReceiverId: record.interfaces.overflow.receiverId,
        outfallCellCount: record.interfaces.outfall.cellManifest.cellCount,
        outfallReceiverId: record.interfaces.outfall.receiverId,
        recoveryRouteCellManifest: record.interfaces.maintenanceAccess.routeCellManifest,
        status: 'HOLD_NO_ACCEPTED_FAILURE_SIMULATION_ALARM_OR_RECOVERY_ROUTE',
      },
      ownershipAndInterfaces: {
        provisionalOwnerKey: record.provisionalOwnerKey,
        ownerStatus: record.ownerStatus,
        collectionInletAcceptanceStatus: record.interfaces.collectionInlet.acceptanceStatus,
        maintenanceAccessStatus: record.interfaces.maintenanceAccess.status,
        pumpPowerAndControl: record.interfaces.pumpPowerAndControl,
        status: 'HOLD_OWNER_AND_INTERFACES_UNACCEPTED',
      },
      acceptedConstructionCellCount: 0,
      acceptedMaterialCellCount: 0,
      technicalAcceptanceClaimed: false,
    };
  });

const exactCandidateCellCount = exactAssetDesigns.reduce(
  (sum, asset) => sum + asset.exactCandidateCellManifest.cellCount,
  0,
);
const excavationEnvelopeCellCount = exactAssetDesigns.reduce(
  (sum, asset) => sum + asset.envelopeRoleCounts.excavationEnvelopeCellCount,
  0,
);
const sealedCapEnvelopeCellCount = exactAssetDesigns.reduce(
  (sum, asset) => sum + asset.envelopeRoleCounts.sealedCapEnvelopeCellCount,
  0,
);
const collectionInletCellCount = exactAssetDesigns.reduce(
  (sum, asset) => sum + asset.collectionInlet.cellManifest.cellCount,
  0,
);
assert(exactCandidateCellCount === preferred.candidateCellManifest.cellCount,
  'Per-asset candidate manifests do not partition the aggregate');
assert(excavationEnvelopeCellCount === 360 && sealedCapEnvelopeCellCount === 72,
  'Selected envelope role count drift');
assert(collectionInletCellCount === 16, 'Collection-inlet cell count drift');

const roadLow001 = lowRunInterfaces.get('ROAD-LOW-001');
const roadDisposition = preferred.lowRunDispositions
  .find(({ lowRunId }) => lowRunId === 'ROAD-LOW-001');
assert(roadDisposition?.disposition
  === 'NO_BUILD_PRESERVATION_HOLD_CURRENT_FLUID_INTERACTION',
'ROAD-LOW-001 no-build disposition drift');
assert(rejectedRoadAsset.audit?.waterFamilyCells === 6
  && rejectedRoadAsset.audit?.faceAdjacentCurrentFluidCellCount === 16
  && rejectedRoadAsset.audit?.planningGeometryClear === false,
'ROAD-LOW-001 rejection evidence drift');

const roadLow001NoBuildHold = {
  lowRunId: 'ROAD-LOW-001',
  system: 'C1_ROAD_SOUTH_DRAIN',
  gravityLow: {
    startStation: roadLow001.startStation,
    endStation: roadLow001.endStation,
    datumY: roadLow001.datumY,
    kind: roadLow001.kind,
    interfaceCellCount: roadLow001.interfaceCellCount,
    interfaceCellSetSha256: roadLow001.interfaceCellSetSha256,
  },
  exactPreservationCellManifest: preferred.heldLowRunPreservationCellManifest,
  rejectedChamberEvidence: {
    anchorStation: rejectedRoadAsset.anchorStation,
    exactCandidateCellManifest: manifestWithoutCells(rejectedRoadAsset.geometry),
    currentStateSetSha256: rejectedRoadAsset.audit.currentStateSetSha256,
    currentWaterFamilyCellCount: rejectedRoadAsset.audit.waterFamilyCells,
    faceAdjacentCurrentFluidCellCount: rejectedRoadAsset.audit.faceAdjacentCurrentFluidCellCount,
    strictNoCurrentFluidInteraction: rejectedRoadAsset.audit.strictNoCurrentFluidInteraction,
    planningGeometryClear: rejectedRoadAsset.audit.planningGeometryClear,
  },
  selectedDrainageAssetId: null,
  acceptedStorageCellCount: 0,
  overflowCellCount: 0,
  outfallCellCount: 0,
  receiverId: null,
  disposition: 'PASS_NO_BUILD_PRESERVATION_CONTROL_DRAINAGE_SERVICE_UNRESOLVED',
  releaseEffect: 'Any chamber, culvert, overflow, receiver, or outfall remains prohibited until separately exact, technically accepted, and bound to a complete save.',
};

const hydraulicStorageFailureRecoveryContract = {
  domain: 'MINECRAFT_DISCRETE_BLOCK_STATE_AND_TICK_MODEL_ONLY',
  realWorldHydraulicOrCodeComplianceClaimed: false,
  currentAcceptedValues: {
    catchmentCellManifest: null,
    currentSourceFluidCellManifest: null,
    futureSourceFluidCellManifest: null,
    acceptedPeakInflowWaterBlocksPerTick: null,
    acceptedEvaluationTickCount: null,
    acceptedInteriorStorageCellManifest: null,
    acceptedWorkingStorageWaterBlockCount: null,
    acceptedFreeboardBlocks: null,
    acceptedRecoveryReserveCellCount: null,
    acceptedAlarmThresholdWaterBlockCount: null,
  },
  proposedAcceptanceRules: [
    'Model water-family block states over an explicit deterministic tick count; a source block is persistent and must never be converted into a finite one-block inflow assumption.',
    'Publish exact interior storage cells separately from excavation, lining, access, and sealed-cap envelopes; an excavation-envelope cell is never counted as accepted storage.',
    'Require peak simultaneously wet interior cells plus an accepted recovery reserve to be no greater than accepted working storage cells.',
    'Keep at least one complete accepted air-cell layer between the maximum accepted wet-cell elevation and the underside of every sealed cap; this one-block rule is a proposed Minecraft-domain minimum, not accepted capacity or real-world freeboard.',
    'Fail closed when any source/influence cell, simulation tick count, storage cell, cap state, owner, alarm, or recovery route is missing or hash-drifted.',
    'On modeled exceedance, retain no-build/sealed status. No overflow, discharge, teleport removal, or inferred receiver is permitted as recovery.',
    'Recovery requires an exact maintenance route, entity/POI clearance, accepted destination/receiver, before/after fluid component accounting, and an independently reproducible reset test.',
  ],
  currentResult: 'HOLD_NUMERIC_INFLOW_STORAGE_FREEBOARD_FAILURE_AND_RECOVERY_INPUTS_UNACCEPTED',
};

const sourceAndFutureFluidAccountingContract = {
  currentEvidence: {
    immutableRegionSha256: hydrology.immutableEvidenceIdentity.regionSnapshot.sha256,
    surveyedCellCount: hydrology.studyDomain.surveyedCellCount,
    haloChunkCount: hydrology.studyDomain.haloChunkCount,
    haloChunkSetSha256: hydrology.studyDomain.haloChunkSetSha256,
    boundaryTruncatedComponentsCannotBeReceivers: true,
    acceptedReceiverCount: hydrology.receiverEvaluation.acceptedReceiverCount,
    selectedOutfall: hydrology.receiverEvaluation.selectedOutfall,
  },
  requiredExactSetFamilies: [
    'CURRENT_SOURCE_FLUID_CELLS',
    'CURRENT_BOUNDARY_TRUNCATED_COMPONENT_CELLS',
    'FUTURE_DIRECT_FLUID_CELLS',
    'FUTURE_FLUID_INFLUENCE_CELLS',
    'ACCEPTED_INTERIOR_STORAGE_CELLS',
    'EXCAVATION_LINING_CAP_BACKFILL_ACCESS_CELLS',
    'ACCEPTED_RECEIVER_AND_DISCHARGE_EXCEPTION_CELLS',
  ],
  perComponentRequiredFields: [
    'currentComponentId',
    'currentCellManifestSha256',
    'futureComponentId',
    'futureCellManifestSha256',
    'createdCellCount',
    'removedCellCount',
    'mergedComponentIds',
    'splitComponentIds',
    'ownerId',
    'receiverId',
    'interfaceContractId',
    'acceptanceTestId',
  ],
  defaultRule: 'ADOPT_ZERO_UNDECLARED_CHANGE_AND_DEFAULT_NO_DIVERSION',
  acceptedFutureFluidCellCount: 0,
  acceptedReceiverCount: 0,
  dischargeExceptionCount: 0,
  interpretation: 'Zero accepted future-fluid cells is a fail-closed absence of accepted future evidence, not proof that the proposed design has no fluid effect.',
  currentResult: 'HOLD_FUTURE_DIRECT_INFLUENCE_AND_COMPONENT_ACCOUNTING_NOT_COMPILED',
};

const structureGeotechnicalLoadingQuantityContract = {
  qualifiedCurrentRegionPass: {
    candidateCellCount: preferred.candidateCellManifest.cellCount,
    candidateCurrentStateSetSha256: preferred.currentRegionAudit.currentStateSetSha256,
    waterFamilyCellCount: preferred.currentRegionAudit.waterFamilyCells,
    lavaCellCount: preferred.currentRegionAudit.lavaCells,
    gravitySensitiveCellCount: preferred.currentRegionAudit.gravitySensitiveCells,
    blockEntityIntersectionCount: preferred.currentRegionAudit.blockEntityIntersectionCount,
    generatedStructureBoundsIntersectionCount:
      preferred.currentRegionAudit.generatedStructureBoundsIntersectionCount,
    civilThreeDimensionalInterfaceIntersectionCount:
      preferred.currentRegionAudit.civilThreeDimensionalInterfaceIntersectionCount,
    dataDistrictCrossroadForbiddenCellCount:
      preferred.currentRegionAudit.dataDistrictCrossroadForbiddenCellCount,
    outsideExactLandTakeCellCount: preferred.currentRegionAudit.outsideExactLandTakeCellCount,
    qualification: preferred.currentRegionAudit.qualification,
  },
  exactPlanningQuantities: {
    cappedSumpCandidateCount: exactAssetDesigns.length,
    aggregateCandidateEnvelopeCellCount: exactCandidateCellCount,
    excavationEnvelopeCellCount,
    sealedCapEnvelopeCellCount,
    collectionInletInterfaceCellCount: collectionInletCellCount,
    roadLow001PreservationCellCount:
      preferred.heldLowRunPreservationCellManifest.cellCount,
    rejectedRoadLow001CandidateCellCount: rejectedRoadAsset.geometry.cellCount,
  },
  requiredBeforeTechnicalPass: [
    'One complete same-moment save with region, entities, POI, and level.dat.',
    'Exact accepted excavation, lining, cap, backfill, interior, access, and influence cell manifests.',
    'Canonical before/after Minecraft block states and one accepted material owner for every construction cell.',
    'Deterministic gravity-sensitive, void, fluid exposure, settlement, retaining, lining, cap-span, surcharge, collision, and access checks.',
    'Exact C01/Data District loading, clearance, exclusion, foundation, crossing, and ISSUE-002 dispositions.',
    'Independent recomputation of construction quantities and a block-family spoil/reuse/borrow ledger over accepted cells.',
  ],
  acceptedMaterialPalette: null,
  acceptedExcavationCellCount: 0,
  acceptedPlacementCellCount: 0,
  acceptedSpoilCellCount: 0,
  acceptedBorrowCellCount: 0,
  realWorldStructuralOrGeotechnicalComplianceClaimed: false,
  currentResult: 'HOLD_CURRENT_REGION_CLEARANCE_IS_NOT_STRUCTURE_GEOTECHNICAL_LOADING_OR_QUANTITY_ACCEPTANCE',
};

const ownershipInterfaceContract = {
  candidateAssetCount: exactAssetDesigns.length,
  acceptedCanonicalOwnerCount: 0,
  unassignedAssetOwnerCount: exactAssetDesigns.filter(
    (asset) => asset.ownershipAndInterfaces.ownerStatus
      === 'UNASSIGNED_REQUIRES_SOLE_AUTHORITY_ACCEPTANCE',
  ).length,
  collectionInletCount: exactAssetDesigns.length,
  collectionInletCellCount,
  acceptedCollectionInletCount: 0,
  acceptedMaintenanceRouteCount: 0,
  acceptedPumpPowerControlCount: 0,
  acceptedOverflowCount: 0,
  acceptedOutfallCount: 0,
  acceptedReceiverCount: 0,
  passRule: 'Every candidate, future construction, storage, access, influence, preservation, and interaction cell has exactly one accepted owner, and every cross-owner boundary has one exact direction-specific interface contract with no unreviewed cells.',
  currentResult: 'HOLD_ALL_ASSET_OWNERS_INLETS_AND_MAINTENANCE_INTERFACES_UNACCEPTED',
};

const completeSaveDependency = {
  auditedCopiedSaveCandidateCount: region.copiedSaveCompletenessAudit.candidateCount,
  completeCopiedSaveCandidateCount: region.copiedSaveCompletenessAudit.completeCandidateCount,
  currentRegionOnlyIdentity: region.selectedRegionOnlyEvidence.identity,
  currentCompleteness: region.selectedRegionOnlyEvidence.completeness,
  requiredComponents: ['region/', 'entities/', 'poi/', 'level.dat'],
  passRule: region.exactExternalRequirement.missingArtifact,
  afterReceipt: region.exactExternalRequirement.afterReceipt,
  currentResult: 'HOLD_NO_COMPLETE_SAME_MOMENT_COPIED_SAVE',
};

const acceptanceMatrix = [
  matrixRow(
    'D02-TD-01-SOURCE-BINDINGS',
    'PASS',
    'source identity',
    'All six direct inputs are file-hash and byte-count bound.',
    'Every direct source exists and matches this artifact source binding.',
  ),
  matrixRow(
    'D02-TD-02-OWNER-PLANNING-ACCEPTANCE',
    'PASS',
    'planning authority only',
    `Acceptance payload ${ownerAcceptance.acceptanceRecordPayloadSha256} freezes D02 policy while passing zero technical HOLDs.`,
    'The separate owner record binds the accepted D02 planning policy and retains all limitations.',
  ),
  matrixRow(
    'D02-TD-03-EXACT-ASSET-PARTITION',
    'PASS',
    'candidate geometry',
    'Ten per-asset manifests exactly partition the 432-cell aggregate as 360 excavation-envelope and 72 cap-envelope cells.',
    'Counts, bounds, coordinate hashes, role hashes, and aggregate partition all reproduce.',
  ),
  matrixRow(
    'D02-TD-04-CURRENT-REGION-CLEARANCE',
    'PASS',
    'qualified region-only planning clearance',
    'The 432 selected candidate cells have zero same-cell/face-adjacent current fluid, block-entity, generated-structure-bound, civil-interface, Data District forbidden, or outside-land-take hits.',
    'Current region-only clearance reproduces with its published qualification; it is not entity, future-state, structural, or construction clearance.',
  ),
  matrixRow(
    'D02-TD-05-ROAD-LOW-001-NO-BUILD',
    'PASS',
    'preservation control only',
    'The exact 24-cell preservation manifest remains asset-free; the rejected 36-cell chamber has six current water-family cells and sixteen face-adjacent current-fluid cells.',
    'ROAD-LOW-001 remains unserved and no chamber, culvert, overflow, receiver, or outfall is promoted.',
  ),
  matrixRow(
    'D02-TD-06-DEFAULT-NO-DIVERSION',
    'PASS',
    'fail-closed control only',
    'Accepted receiver count, outfall count, overflow count, and discharge exception count remain zero.',
    'Every undeclared fluid change or discharge remains prohibited.',
  ),
  matrixRow(
    'D02-TD-07-COMPLETE-SAVE',
    'HOLD',
    'source completeness',
    'Fifty-six copied-save candidates were audited and zero are complete.',
    'Pass one same-moment region/entities/POI/level.dat package and repeat all affected audits.',
    completeSaveDependency.currentResult,
  ),
  matrixRow(
    'D02-TD-08-INFLOW-AND-CAPACITY',
    'HOLD',
    'Minecraft-domain hydraulic model',
    'No accepted source-cell, peak-inflow, simulation-duration, or working-storage values exist.',
    'Bind numeric discrete block-state/tick inputs and pass deterministic peak wet-cell sizing.',
    hydraulicStorageFailureRecoveryContract.currentResult,
  ),
  matrixRow(
    'D02-TD-09-STORAGE-INTERIOR-AND-FREEBOARD',
    'HOLD',
    'storage geometry',
    'The 360 cells are excavation envelopes, not accepted interiors; accepted freeboard is null.',
    'Publish exact interior/storage/freeboard cellsets separately and accept the evaluation rule.',
    'HOLD_NO_ACCEPTED_INTERIOR_STORAGE_OR_FREEBOARD',
  ),
  matrixRow(
    'D02-TD-10-FAILURE-ALARM-RECOVERY',
    'HOLD',
    'failure state',
    'Assets have no accepted failure simulation, alarm threshold, maintenance route, receiver, or recovery test.',
    'Pass exact exceedance, isolation, alarm, access, recovery-destination, and reset criteria.',
    'HOLD_FAILURE_AND_RECOVERY_UNDEFINED',
  ),
  matrixRow(
    'D02-TD-11-FUTURE-FLUID-ACCOUNTING',
    'HOLD',
    'future topology',
    'Accepted future-fluid and discharge-exception cell counts are zero because no accepted future accounting exists.',
    'Compile every direct/influence cell and exact per-component before/after accounting.',
    sourceAndFutureFluidAccountingContract.currentResult,
  ),
  matrixRow(
    'D02-TD-12-GEOTECHNICAL-BLOCK-BEHAVIOR',
    'HOLD',
    'excavation and support',
    'Region block states are known, but accepted void/fluid, gravity, stability, foundation, lining, retaining, and influence treatments are absent.',
    'Pass deterministic Minecraft-domain treatment and influence checks for every exact cell.',
    'HOLD_GEOTECHNICAL_TREATMENTS_UNACCEPTED',
  ),
  matrixRow(
    'D02-TD-13-STRUCTURE-LOADING-C01',
    'HOLD',
    'caps, crossings, and contested interfaces',
    'No accepted cap palette/span/load rule, foundation, exclusion, clearance, or ISSUE-002 disposition exists.',
    'Pass exact structure/loading/C01/Data District criteria and independent recomputation.',
    'HOLD_STRUCTURE_LOADING_AND_ISSUE_002_UNRESOLVED',
  ),
  matrixRow(
    'D02-TD-14-MATERIALS-QUANTITIES',
    'HOLD',
    'construction takeoff',
    'Candidate envelope quantities are exact, but accepted excavation, placement, spoil, borrow, and material counts remain zero.',
    'Compile accepted canonical before/after states and independently reproduce the one-owner takeoff.',
    'HOLD_CANDIDATE_ENVELOPES_ARE_NOT_CONSTRUCTION_QUANTITIES',
  ),
  matrixRow(
    'D02-TD-15-OWNERS-INTERFACES-MAINTENANCE',
    'HOLD',
    'operational ownership',
    'All ten asset owners, ten collection inlets, and every maintenance route remain unaccepted.',
    'Assign one owner per cell and accept every exact collection, access, emergency, receiver, and boundary contract.',
    ownershipInterfaceContract.currentResult,
  ),
  matrixRow(
    'D02-TD-16-TECHNICAL-ACCEPTANCE',
    'HOLD',
    'design identity',
    'The owner accepted planning policy/checklists only; no technical acceptance was recorded.',
    'All D02-TD-07 through D02-TD-15 rows must pass against one immutable technical identity.',
    'HOLD_TECHNICAL_ACCEPTANCE_NOT_AVAILABLE_FROM_CURRENT_EVIDENCE',
  ),
  matrixRow(
    'D02-TD-17-D02-G02-CLOSURE',
    'HOLD',
    'release gate',
    'D02 and R00 G02 remain explicitly unresolved.',
    'Every D02 technical row and the remaining D02/C01 criteria must pass before closure.',
    'HOLD_D02_AND_R00_G02',
  ),
];

const technicalDevelopmentPayload = {
  acceptedPlanningIdentity: {
    ownerAcceptancePath: INPUTS.ownerAcceptance,
    ownerAcceptanceFileSha256: sourceBindings.ownerAcceptance.sha256,
    ownerAcceptancePayloadSha256: ownerAcceptance.acceptanceRecordPayloadSha256,
    d02PlanningBasisSha256: d02Packet.acceptanceBasisIdentity.sha256,
    acceptedAtUtc: ownerAcceptance.acceptedAtUtc,
    planningPolicyAccepted: true,
    technicalHoldPassedCount: 0,
    technicalAcceptanceRecorded: false,
  },
  selectedBasis: {
    alternativeId: preferred.id,
    planningDisposition: preferred.planningDisposition,
    exactAggregateCandidateCellManifest: preferred.candidateCellManifest,
    cappedSumpCandidateCount: preferred.sumpCount,
    noBuildPreservationHoldCount: preferred.noBuildPreservationHoldCount,
    pumpSocketCount: preferred.pumpSocketCount,
    forceMainCount: preferred.forceMainCount,
    terminalTankCount: preferred.terminalTankCount,
    overflowCandidateCellCount: preferred.overflowCandidateCells.length,
    outfallCandidateCellCount: preferred.outfallCandidateCells.length,
    receiverId: null,
  },
  exactAssetDesigns,
  roadLow001NoBuildHold,
  hydraulicStorageFailureRecoveryContract,
  sourceAndFutureFluidAccountingContract,
  structureGeotechnicalLoadingQuantityContract,
  ownershipInterfaceContract,
  completeSaveDependency,
  acceptanceMatrix,
};
const technicalDevelopmentPayloadSha256 = sha256(
  `${JSON.stringify(technicalDevelopmentPayload)}\n`,
);
const passCount = acceptanceMatrix.filter(({ result }) => result === 'PASS').length;
const holdCount = acceptanceMatrix.filter(({ result }) => result === 'HOLD').length;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-technical-design',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_EXACT_D02_TECHNICAL_DEVELOPMENT_D02_G02_HOLD',
  purpose: 'Bind the accepted D02 planning policy to exact Minecraft-domain technical-development contracts without inventing receivers, outfalls, capacity, construction cells, or technical acceptance.',
  executable: false,
  sourceBindings,
  technicalDevelopmentPayload,
  technicalDevelopmentPayloadSha256,
  summary: {
    acceptanceCriterionCount: acceptanceMatrix.length,
    passCount,
    holdCount,
    cappedSumpCandidateCount: exactAssetDesigns.length,
    noBuildPreservationHoldCount: 1,
    exactCandidateEnvelopeCellCount: exactCandidateCellCount,
    excavationEnvelopeCellCount,
    sealedCapEnvelopeCellCount,
    collectionInletCellCount,
    acceptedInteriorStorageCellCount: 0,
    acceptedReceiverCount: 0,
    acceptedOutfallCellCount: 0,
    completeCopiedSaveCandidateCount: region.copiedSaveCompletenessAudit.completeCandidateCount,
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    d02Resolved: false,
    r00G02Passed: false,
    technicalAcceptanceClaimed: false,
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
    receiverInvented: false,
    outfallInvented: false,
    diversionAuthorized: false,
    constructionAuthorized: false,
    physicalBuildAuthorized: false,
    worldEditAuthorized: false,
  },
};

const assetRows = exactAssetDesigns.map((asset) => (
  `| ${asset.lowRunId} | ${asset.selectedAnchorStation} | ${asset.gravityLow.datumY} | ${asset.exactCandidateCellManifest.cellCount} | ${asset.envelopeRoleCounts.excavationEnvelopeCellCount} | ${asset.envelopeRoleCounts.sealedCapEnvelopeCellCount} | HOLD |`
)).join('\n');
const matrixRows = acceptanceMatrix.map((row) => (
  `| ${row.id} | **${row.result}** | ${row.scope} | ${row.currentEvidence} |`
)).join('\n');
const markdown = `# Combined Zones Phase 1 D02 technical design\n\n`
  + `Status: **${report.status} — OFFLINE ONLY — ZERO OPERATIONS**\n\n`
  + `This record advances the accepted D02 planning basis into the strongest exact Minecraft-domain technical-development matrix supported by current evidence. It is not a real-world hydraulic, structural, geotechnical, safety, or code-compliance claim. D02 and R00 G02 remain HOLD.\n\n`
  + `Technical-development payload SHA-256: \`${technicalDevelopmentPayloadSha256}\`\n\n`
  + `## Exact selected assets\n\n`
  + `| Low run | Anchor station | Datum Y | Candidate cells | Excavation envelope | Cap envelope | Capacity |\n|---|---:|---:|---:|---:|---:|---|\n`
  + `${assetRows}\n\n`
  + `The ten manifests exactly partition 432 candidate cells: 360 excavation-envelope cells and 72 sealed-cap-envelope cells. These are planning envelopes, not storage interiors, construction quantities, or material cells. Accepted storage, construction, and material counts remain zero.\n\n`
  + `## ROAD-LOW-001\n\n`
  + `ROAD-LOW-001 retains an exact ${roadLow001NoBuildHold.exactPreservationCellManifest.cellCount}-cell no-build preservation manifest. Its rejected ${roadLow001NoBuildHold.rejectedChamberEvidence.exactCandidateCellManifest.cellCount}-cell chamber intersects ${roadLow001NoBuildHold.rejectedChamberEvidence.currentWaterFamilyCellCount} current water-family cells and has ${roadLow001NoBuildHold.rejectedChamberEvidence.faceAdjacentCurrentFluidCellCount} face-adjacent current-fluid cells. No drainage asset, culvert, overflow, receiver, or outfall is selected.\n\n`
  + `## Capacity, failure, and fluid boundary\n\n`
  + `The artifact publishes deterministic acceptance rules but leaves inflow, tick duration, interior storage, working capacity, freeboard, alarm, recovery reserve, receiver, and recovery-route values null. A persistent Minecraft water source cannot be treated as a finite one-block inflow. Any unknown or modeled exceedance keeps the asset sealed and uncommissioned; it never creates an overflow or inferred discharge.\n\n`
  + `The current 62,816,256-cell copied-region fluid census is exact within its declared halo, but no accepted future direct/influence sets or before/after component accounting exist. Zero accepted future-fluid cells means missing accepted future evidence, not proof of zero effect.\n\n`
  + `## Acceptance matrix\n\n`
  + `| Criterion | Result | Scope | Current evidence |\n|---|---|---|---|\n`
  + `${matrixRows}\n\n`
  + `Current result: **${passCount} PASS / ${holdCount} HOLD**. The PASS rows bind sources, accepted planning policy, exact candidate geometry, qualified current-region clearance, the ROAD-LOW-001 no-build control, and default no-diversion. They do not constitute technical acceptance.\n\n`
  + `A complete same-moment save containing \`region/\`, \`entities/\`, \`poi/\`, and \`level.dat\` remains mandatory. No receiver or outfall was invented, no operation or material cell was emitted, and no construction or world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

process.stdout.write(`${JSON.stringify({
  output: path.relative(ROOT, OUTPUT),
  markdown: path.relative(ROOT, MARKDOWN),
  status: report.status,
  technicalDevelopmentPayloadSha256,
  passCount,
  holdCount,
  exactCandidateEnvelopeCellCount: exactCandidateCellCount,
  operationCellCount: 0,
}, null, 2)}\n`);
