#!/usr/bin/env node
/**
 * Generate the deterministic D02 owner-acceptance evidence packet.
 *
 * The packet classifies bound evidence as facts, derivations, planning
 * assumptions, acceptance criteria, or evidence gaps. It reads committed
 * offline artifacts only, emits no operation/material cells, and keeps D02
 * and R00 G02 fail-closed.
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

const GENERATED_AT = value('--generated-at', '2026-08-04T23:55:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.md',
));

const INPUTS = Object.freeze({
  authorityReconciliation: 'masterplans/04-combined-complex/authority-reconciliation.json',
  designDecisions: 'masterplans/05-combined-zones/phase1-design-decisions.json',
  c1CivilDesign: 'masterplans/05-combined-zones/phase1-c1-civil-design.json',
  civilAuthorityPacket: 'masterplans/05-combined-zones/phase1-d02-civil-authority-packet.json',
  regionEvidence: 'masterplans/05-combined-zones/phase1-d02-s01-s02-region-evidence.json',
  hydrologyOutfalls: 'masterplans/05-combined-zones/phase1-d02-s03-hydrology-outfalls.json',
  closedDrainage: 'masterplans/05-combined-zones/phase1-d02-s04-closed-drainage-alternatives.json',
  delegatedSelections: 'masterplans/05-combined-zones/phase1-autonomous-design-selections.json',
});

const SOURCE_ROLES = Object.freeze({
  authorityReconciliation: 'field-scoped Masterplan 04 to Masterplan 05 authority boundary',
  designDecisions: 'canonical D02 status and six pre-R00 closure requirements',
  c1CivilDesign: 'exact alignment, civil evidence, and D02 blocker identities',
  civilAuthorityPacket: 'sole-authority and pre-R00 acceptance boundary',
  regionEvidence: 'D02-S01/S02 copied-save audit and region-only evidence',
  hydrologyOutfalls: 'D02-S03 current fluid topology and receiver evaluation',
  closedDrainage: 'D02-S04 exact alternatives, selected sump candidates, and held low run',
  delegatedSelections: 'owner-delegated B05 and S04 planning selections',
});

const OUTPUT_RELATIVE = 'masterplans/05-combined-zones/phase1-d02-owner-acceptance-packet.json';
const PREFERRED_ALTERNATIVE_ID =
  'ALT-D02-S04-D-HYBRID-CAPPED-SUMPS-WITH-AQUATIC-NO-BUILD-HOLD';
const EXPECTED_BLOCKER_IDS = [
  'D02-B01',
  'D02-B02',
  'D02-B03',
  'D02-B04',
  'D02-B05',
  'D02-B06',
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function absolute(relativePath) {
  return path.join(ROOT, relativePath);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(absolute(relativePath), 'utf8'));
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function binding(key, relativePath) {
  const data = fs.readFileSync(absolute(relativePath));
  return {
    key,
    path: relativePath,
    sha256: sha256(data),
    bytes: data.length,
    role: SOURCE_ROLES[key],
  };
}

function sourceRef(sourceKey, ...jsonPointers) {
  return { sourceKey, jsonPointers };
}

function compactManifest(manifest) {
  return {
    cellCount: manifest.cellCount,
    coordinateSetSha256: manifest.coordinateSetSha256,
    roleStreamSha256: manifest.roleStreamSha256,
    bounds: manifest.bounds,
  };
}

const authority = readJson(INPUTS.authorityReconciliation);
const decisions = readJson(INPUTS.designDecisions);
const civil = readJson(INPUTS.c1CivilDesign);
const civilAuthority = readJson(INPUTS.civilAuthorityPacket);
const region = readJson(INPUTS.regionEvidence);
const hydrology = readJson(INPUTS.hydrologyOutfalls);
const drainage = readJson(INPUTS.closedDrainage);
const selections = readJson(INPUTS.delegatedSelections);

const d02 = decisions.decisions?.find((item) => item.id === 'D02');
const preferred = drainage.alternatives?.find((item) => item.id === PREFERRED_ALTERNATIVE_ID);
const b05Selection = selections.selections?.find((item) => item.id === 'SEL-D02-B05-C1-RASTER');
const s04Selection = selections.selections?.find(
  (item) => item.id === 'SEL-D02-S04-CLOSED-DRAINAGE',
);
const heldRoadLow = preferred?.lowRunDispositions?.find(
  (item) => item.lowRunId === 'ROAD-LOW-001',
);
const heldRoadLowBasis = drainage.exactLowRunBasis?.anchorSelectionEvidence?.find(
  (item) => item.lowRunId === 'ROAD-LOW-001',
);
const heldRoadOwner = preferred?.heldOwnershipAndInterfaceRecords?.find(
  (item) => item.lowRunId === 'ROAD-LOW-001',
);

assert(
  authority.status === 'RECONCILED_FOR_DETAILED_DESIGN_NOT_AUTHORIZED_FOR_WORLD_EDITS'
    && authority.worldEditAuthorized === false,
  'Masterplan 04 to 05 authority boundary drifted',
);
assert(d02?.status === 'HOLD', 'D02 must be HOLD');
assert(d02.closureEvidenceRequired?.length === 6, 'D02 must retain six closure requirements');
assert(
  JSON.stringify(civil.decisionD02?.blockers?.map((item) => item.id))
    === JSON.stringify(EXPECTED_BLOCKER_IDS),
  'D02 blocker identity/order drifted',
);
assert(civil.status === 'PARTIAL_PASS_D02_HOLD', 'C1 civil status drifted');
assert(
  civilAuthority.acceptanceBoundary?.d02MustRemainHoldInThisPacket === true
    && civilAuthority.acceptanceBoundary?.r01ResolvesD02 === false,
  'D02 pre-R00 acceptance boundary drifted',
);
assert(
  region.copiedSaveCompletenessAudit?.candidateCount === 56
    && region.copiedSaveCompletenessAudit?.completeCandidateCount === 0,
  'Copied-save completeness evidence drifted',
);
assert(region.safetyBoundary?.operationCellCount === 0, 'Region evidence contains operations');
assert(
  hydrology.receiverEvaluation?.candidateCount === 0
    && hydrology.receiverEvaluation?.acceptedReceiverCount === 0
    && hydrology.receiverEvaluation?.selectedOutfall === null,
  'Hydrology receiver result drifted',
);
assert(
  hydrology.collectionSystems?.roadSouthDrain?.profile?.continuousOneWayGravityOutlet === false
    && hydrology.collectionSystems?.railNorthCess?.profile?.continuousOneWayGravityOutlet === false,
  'Collection-system gravity result drifted',
);
assert(drainage.preferredPlanningAlternative?.alternativeId === PREFERRED_ALTERNATIVE_ID, 'Preferred S04 alternative drifted');
assert(s04Selection?.selection === PREFERRED_ALTERNATIVE_ID, 'Delegated S04 planning selection drifted');
assert(b05Selection?.technicalAcceptanceClaimed === false, 'B05 selection claims technical acceptance');
assert(s04Selection?.technicalAcceptanceClaimed === false, 'S04 selection claims technical acceptance');
assert(preferred?.sumpCount === 10, 'Preferred alternative must retain ten sump candidates');
assert(preferred?.noBuildPreservationHoldCount === 1, 'Preferred alternative must retain one hold');
assert(preferred?.candidateCellManifest?.cellCount === 432, 'Preferred candidate manifest drifted');
assert(heldRoadLow?.disposition === 'NO_BUILD_PRESERVATION_HOLD_CURRENT_FLUID_INTERACTION', 'ROAD-LOW-001 disposition drifted');
assert(heldRoadLowBasis?.strictClearAnchorCount === 0, 'ROAD-LOW-001 unexpectedly has a strict-clear anchor');
assert(drainage.safetyBoundary?.operationCellCount === 0, 'Closed-drainage evidence contains operations');
assert(drainage.safetyBoundary?.worldEditAuthorized === false, 'Closed-drainage evidence authorizes edits');
assert(selections.disposition?.d02Resolved === false, 'Delegated selections unexpectedly resolve D02');
assert(selections.disposition?.r00G02Passed === false, 'Delegated selections unexpectedly pass G02');

const snapshotSha256 = region.selectedRegionOnlyEvidence.identity.sha256;
assert(snapshotSha256 === civil.immutableSnapshot.sha256, 'Civil and region snapshot identities disagree');
assert(snapshotSha256 === hydrology.immutableEvidenceIdentity.regionSnapshot.sha256, 'Hydrology snapshot identity disagrees');
assert(snapshotSha256 === drainage.immutableEvidenceIdentity.regionSnapshot.sha256, 'Drainage snapshot identity disagrees');

const selectedSumpCandidates = preferred.ownershipAndInterfaces
  .map((asset) => {
    const disposition = preferred.lowRunDispositions.find(
      (item) => item.lowRunId === asset.lowRunId,
    );
    assert(disposition, `Missing low-run disposition for ${asset.lowRunId}`);
    assert(
      disposition.candidateCellCount === asset.exactAssetCellManifest.cellCount,
      `Candidate-cell count drift for ${asset.lowRunId}`,
    );
    return {
      lowRunId: asset.lowRunId,
      system: asset.system,
      assetId: asset.assetId,
      anchorStation: disposition.anchorStation,
      disposition: disposition.disposition,
      exactAssetCellManifest: compactManifest(asset.exactAssetCellManifest),
      presentStateAudit: {
        currentFluidSameCellCount: disposition.currentFluidSameCellCount,
        currentFluidFaceAdjacentCellCount: disposition.currentFluidFaceAdjacentCellCount,
      },
      ownership: {
        provisionalOwnerKey: asset.provisionalOwnerKey,
        ownerStatus: asset.ownerStatus,
      },
      collectionInlet: {
        interfaceId: asset.interfaces.collectionInlet.interfaceId,
        acceptanceStatus: asset.interfaces.collectionInlet.acceptanceStatus,
        cellManifest: compactManifest(asset.interfaces.collectionInlet.cellManifest),
      },
      overflow: {
        cellCount: asset.interfaces.overflow.cellManifest.cellCount,
        receiverId: asset.interfaces.overflow.receiverId,
        status: asset.interfaces.overflow.status,
      },
      outfall: {
        cellCount: asset.interfaces.outfall.cellManifest.cellCount,
        receiverId: asset.interfaces.outfall.receiverId,
        ownerId: asset.interfaces.outfall.ownerId,
        status: asset.interfaces.outfall.status,
      },
      technicalAcceptanceClaimed: false,
    };
  })
  .sort((left, right) => left.lowRunId.localeCompare(right.lowRunId));

assert(selectedSumpCandidates.length === 10, 'Selected sump asset register must contain ten assets');
assert(
  selectedSumpCandidates.reduce(
    (total, item) => total + item.exactAssetCellManifest.cellCount,
    0,
  ) === preferred.candidateCellManifest.cellCount,
  'Selected sump assets do not exactly partition the preferred candidate manifest',
);
assert(
  selectedSumpCandidates.every((item) => (
    item.presentStateAudit.currentFluidSameCellCount === 0
      && item.presentStateAudit.currentFluidFaceAdjacentCellCount === 0
      && item.ownership.ownerStatus === 'UNASSIGNED_REQUIRES_SOLE_AUTHORITY_ACCEPTANCE'
      && item.collectionInlet.acceptanceStatus === 'UNACCEPTED_PLANNING_INTERFACE'
      && item.overflow.cellCount === 0
      && item.outfall.cellCount === 0
  )),
  'Selected sump present-state or acceptance boundary drifted',
);

const sourceBindings = Object.entries(INPUTS).map(([key, relativePath]) => (
  binding(key, relativePath)
));

const facts = [
  {
    id: 'FACT-D02-001-AUTHORITY',
    category: 'FACT',
    status: 'PASS',
    statement: 'Masterplan 04 owns normalized local composition; Masterplan 05 owns current-world placement, terrain adaptation, external interfaces, and release gates.',
    sourceRefs: [sourceRef(
      'authorityReconciliation',
      '/authorityModel/rules/1',
      '/authorityModel/rules/2',
      '/canonicalSources/currentWorldPlacement',
    )],
    qualification: 'Neither authority layer authorizes a world edit.',
  },
  {
    id: 'FACT-D02-002-DECISION-STATE',
    category: 'FACT',
    status: 'PASS',
    statement: 'D02 is HOLD and has six pre-R00 closure requirements.',
    values: { d02Status: d02.status, closureRequirementCount: d02.closureEvidenceRequired.length },
    sourceRefs: [sourceRef('designDecisions', '/decisions[id=D02]')],
    qualification: 'A physical pilot, execution, or post-state result cannot close D02.',
  },
  {
    id: 'FACT-D02-003-INCOMPLETE-SAVE',
    category: 'FACT',
    status: 'PASS',
    statement: 'The copied-save audit found no candidate containing nonempty region, entities, and POI data plus level.dat.',
    values: {
      candidateCount: region.copiedSaveCompletenessAudit.candidateCount,
      completeCandidateCount: region.copiedSaveCompletenessAudit.completeCandidateCount,
      inventorySha256: region.copiedSaveCompletenessAudit.inventorySha256,
      conclusion: region.copiedSaveCompletenessAudit.conclusion,
    },
    sourceRefs: [sourceRef('regionEvidence', '/copiedSaveCompletenessAudit')],
    qualification: 'The exact region evidence is not a complete same-moment save identity.',
  },
  {
    id: 'FACT-D02-004-REGION-CENSUS',
    category: 'FACT',
    status: 'PASS',
    statement: 'The selected immutable region snapshot has a complete full-height census over the exact C1 land-take scope with zero missing region chunks.',
    values: {
      snapshotSha256,
      columnCount: region.d02S01.c1FullHeight.scope.columnCount,
      surveyedCellCount: region.d02S01.c1FullHeight.scope.surveyedCellCount,
      touchedChunkCount: region.d02S01.c1FullHeight.scope.touchedChunkCount,
      missingChunkCount: region.d02S01.c1FullHeight.scope.missingChunkCount,
      stateStreamSha256: region.d02S01.c1FullHeight.stateCensus.stateStreamSha256,
    },
    sourceRefs: [
      sourceRef('regionEvidence', '/selectedRegionOnlyEvidence/identity'),
      sourceRef('regionEvidence', '/d02S01/c1FullHeight'),
    ],
    qualification: 'This passes exact region-state identity only, not entities, POI, world metadata, treatment selection, stability, ownership, or construction acceptance.',
  },
  {
    id: 'FACT-D02-005-ZERO-OPERATIONS',
    category: 'FACT',
    status: 'PASS',
    statement: 'Every bound D02 evidence package is offline/read-only and contributes zero operation cells to this packet.',
    values: {
      civilOperationCellCount: civil.offlineSafetyBoundary.operationCells.length,
      authorityPacketOperationCellCount: civilAuthority.safetyBoundary.operationCellCount,
      regionOperationCellCount: region.safetyBoundary.operationCellCount,
      hydrologyOperationCellCount: hydrology.safetyBoundary.operationCellCount,
      drainageOperationCellCount: drainage.safetyBoundary.operationCellCount,
      selectionsOperationCellCount: selections.safetyBoundary.operationCellCount,
    },
    sourceRefs: [
      sourceRef('c1CivilDesign', '/offlineSafetyBoundary'),
      sourceRef('civilAuthorityPacket', '/safetyBoundary'),
      sourceRef('regionEvidence', '/safetyBoundary'),
      sourceRef('hydrologyOutfalls', '/safetyBoundary'),
      sourceRef('closedDrainage', '/safetyBoundary'),
      sourceRef('delegatedSelections', '/safetyBoundary'),
    ],
    qualification: 'Candidate cells are evidence geometry, not operations or construction cells.',
  },
];

const derivations = [
  {
    id: 'DERIVATION-D02-001-FLUID-TOPOLOGY',
    category: 'DERIVATION',
    status: 'PASS',
    method: 'Six-face current-state component census over every C1 land-take chunk plus a one-chunk horizontal halo.',
    values: {
      surveyedCellCount: hydrology.studyDomain.surveyedCellCount,
      missingChunkCount: hydrology.studyDomain.missingChunkCount,
      waterComponentCount: hydrology.currentFluidComponents.water.componentCount,
      waterManifestSha256: hydrology.currentFluidComponents.water.manifestSha256,
      lavaComponentCount: hydrology.currentFluidComponents.lava.componentCount,
      lavaManifestSha256: hydrology.currentFluidComponents.lava.manifestSha256,
    },
    sourceRefs: [
      sourceRef('hydrologyOutfalls', '/studyDomain'),
      sourceRef('hydrologyOutfalls', '/currentFluidComponents'),
    ],
    qualification: 'Boundary-touching components are truncated; this is current geometry, not rainfall, groundwater, snowmelt, erosion, or capacity modelling.',
  },
  {
    id: 'DERIVATION-D02-002-GRAVITY-LOWS',
    category: 'DERIVATION',
    status: 'PASS',
    method: 'Enumerate local-minimum runs from the frozen road south-drain and rail north-cess coordination profiles.',
    values: {
      roadLowRunCount: drainage.exactLowRunBasis.roadLowRunCount,
      railLowRunCount: drainage.exactLowRunBasis.railLowRunCount,
      totalLowRunCount: drainage.exactLowRunBasis.lowRunCount,
      roadContinuousOneWayGravityOutlet:
        hydrology.collectionSystems.roadSouthDrain.profile.continuousOneWayGravityOutlet,
      railContinuousOneWayGravityOutlet:
        hydrology.collectionSystems.railNorthCess.profile.continuousOneWayGravityOutlet,
      acceptableReceiverCandidateCount: hydrology.receiverEvaluation.candidateCount,
      acceptedReceiverCount: hydrology.receiverEvaluation.acceptedReceiverCount,
      selectedOutfall: hydrology.receiverEvaluation.selectedOutfall,
    },
    sourceRefs: [
      sourceRef('hydrologyOutfalls', '/collectionSystems', '/receiverEvaluation'),
      sourceRef('closedDrainage', '/exactLowRunBasis'),
    ],
    qualification: 'A gravity-low run is not a sized drain, sump, pump, overflow, receiver, or outfall.',
  },
  {
    id: 'DERIVATION-D02-003-PREFERRED-MANIFEST',
    category: 'DERIVATION',
    status: 'PASS',
    method: 'Apply the committed S04 local-sump geometry rule to strict-clear anchors and union the ten exact asset manifests.',
    values: {
      alternativeId: PREFERRED_ALTERNATIVE_ID,
      sumpCandidateCount: selectedSumpCandidates.length,
      noBuildHoldCount: preferred.noBuildPreservationHoldCount,
      candidateCellManifest: compactManifest(preferred.candidateCellManifest),
      selectedAssetCellCount: selectedSumpCandidates.reduce(
        (total, item) => total + item.exactAssetCellManifest.cellCount,
        0,
      ),
    },
    sourceRefs: [sourceRef(
      'closedDrainage',
      '/geometryRules',
      `/alternatives[id=${PREFERRED_ALTERNATIVE_ID}]`,
    )],
    qualification: 'The manifest passes reproducibility and present-state planning clearance only; it is not a construction cell set.',
  },
  {
    id: 'DERIVATION-D02-004-ROAD-LOW-001',
    category: 'DERIVATION',
    status: 'PASS',
    method: 'Audit every candidate chamber anchor at ROAD-LOW-001 against immutable current region states and six-face fluid neighbors.',
    values: {
      lowRunId: heldRoadLow.lowRunId,
      strictClearAnchorCount: heldRoadLowBasis.strictClearAnchorCount,
      rejectedAnchorStation: heldRoadLow.rejectedAnchorStation,
      rejectedCandidateCellCount: heldRoadLow.rejectedCandidateCellCount,
      rejectedCandidateWaterFamilyCellCount: heldRoadLow.currentFluidSameCellCount,
      rejectedCandidateFaceAdjacentFluidCellCount:
        heldRoadLow.currentFluidFaceAdjacentCellCount,
      disposition: heldRoadLow.disposition,
      ownerStatus: heldRoadOwner.ownerStatus,
      assetSelected: heldRoadOwner.drainageAssetId !== null,
    },
    sourceRefs: [
      sourceRef('closedDrainage', '/exactLowRunBasis/anchorSelectionEvidence[lowRunId=ROAD-LOW-001]'),
      sourceRef(
        'closedDrainage',
        `/alternatives[id=${PREFERRED_ALTERNATIVE_ID}]/lowRunDispositions[lowRunId=ROAD-LOW-001]`,
      ),
    ],
    qualification: 'The deterministic PASS is preservation of the no-build hold, not provision of drainage service to this low run.',
  },
];

const planningAssumptions = [
  {
    id: 'ASSUMPTION-D02-001-C1-RASTER',
    category: 'PLANNING_ASSUMPTION',
    status: 'SELECTED_PLANNING_BASIS',
    statement: b05Selection.selection,
    selectedBy: b05Selection.id,
    technicalAcceptanceClaimed: b05Selection.technicalAcceptanceClaimed,
    sourceRefs: [sourceRef('delegatedSelections', '/selections[id=SEL-D02-B05-C1-RASTER]')],
    qualification: 'This closes the subjective B05 planning choice only; it supplies no civil technical acceptance.',
  },
  {
    id: 'ASSUMPTION-D02-002-NO-DIVERSION',
    category: 'PLANNING_ASSUMPTION',
    status: 'SELECTED_FAIL_CLOSED_RULE',
    statement: drainage.defaultNoDiversionProof.selectedRule,
    selectedBy: drainage.immutableEvidenceIdentity.selectedNoDiversionRule.selectionId,
    technicalAcceptanceClaimed:
      drainage.immutableEvidenceIdentity.selectedNoDiversionRule.technicalAcceptanceClaimed,
    sourceRefs: [sourceRef('closedDrainage', '/immutableEvidenceIdentity/selectedNoDiversionRule')],
    qualification: 'The rule prohibits unaccepted diversion; it does not prove hydraulic performance or future no-diversion behavior.',
  },
  {
    id: 'ASSUMPTION-D02-003-CLOSED-DRAINAGE-BASIS',
    category: 'PLANNING_ASSUMPTION',
    status: 'SELECTED_FOR_TECHNICAL_DEVELOPMENT_ONLY',
    statement: PREFERRED_ALTERNATIVE_ID,
    selectedBy: s04Selection.id,
    technicalAcceptanceClaimed: s04Selection.technicalAcceptanceClaimed,
    sourceRefs: [
      sourceRef('delegatedSelections', '/selections[id=SEL-D02-S04-CLOSED-DRAINAGE]'),
      sourceRef('closedDrainage', '/preferredPlanningAlternative'),
    ],
    qualification: drainage.preferredPlanningAlternative.nonAcceptanceBoundary,
  },
  {
    id: 'ASSUMPTION-D02-004-NUMERIC-DESIGN-CRITERIA',
    category: 'PLANNING_ASSUMPTION',
    status: 'UNSET_HOLD',
    statement: 'No inflow, storage duration, freeboard, snowmelt-like, groundwater-like void, erosion, failure, pump-duty, recovery, or capacity values are assumed by this packet.',
    values: {
      inflow: null,
      storageDuration: null,
      freeboard: null,
      snowmeltLike: null,
      groundwaterLikeVoid: null,
      erosion: null,
      failure: null,
      pumpDuty: null,
      recovery: null,
      capacity: null,
    },
    technicalAcceptanceClaimed: false,
    sourceRefs: [sourceRef('closedDrainage', '/remainingBlockers')],
    qualification: 'Null is intentional and fail-closed; no number may be inferred from candidate geometry.',
  },
];

const evidenceGaps = [
  {
    id: 'GAP-D02-001-COMPLETE-SAVE',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'One immutable same-moment copied save with nonempty region, entities, POI, and level.dat.',
    closesWhen: 'A hash-bound completeness audit passes and the C1/C01/entity/POI/world-metadata scopes are recomputed from that save.',
  },
  {
    id: 'GAP-D02-002-GEOTECHNICAL',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Accepted Minecraft-domain excavation stability, void/fluid behavior, foundation, retaining, lining, and treatment criteria bound to exact runs and influence cells.',
    closesWhen: 'Every run has one accepted treatment, exact construction/influence manifests, deterministic checks, and an acceptance identity.',
  },
  {
    id: 'GAP-D02-003-STRUCTURAL',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Accepted spans, clearances, loading/exclusion rules, foundations, caps, crossings, and independent structural recomputation.',
    closesWhen: 'Every bridge, tunnel, culvert, retaining, sump, cap, and C01/Data District interface passes exact geometry and independent checks.',
  },
  {
    id: 'GAP-D02-004-HYDRAULIC-CRITERIA',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Accepted inflow, storage duration, freeboard, capacity, erosion, failure, recovery, pump, control, and alarm criteria.',
    closesWhen: 'Numeric Minecraft-domain rules are explicit, reviewed, bound to the selected geometry, and pass deterministic sizing/failure tests.',
  },
  {
    id: 'GAP-D02-005-FUTURE-FLUID-ACCOUNTING',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Exact future excavation, lining, cap, backfill, access, influence, and before/after fluid-component accounting.',
    closesWhen: 'The complete future-state topology proves every declared preservation rule and enumerates any accepted exception.',
  },
  {
    id: 'GAP-D02-006-OWNERSHIP-INTERFACES',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Accepted canonical owners and exact collection, drainage, road, rail, maintenance, power/control, emergency, overflow, receiver, and outfall interfaces.',
    closesWhen: 'Every candidate and interaction cell has exactly one owner and every cross-owner boundary has an accepted exact contract.',
  },
  {
    id: 'GAP-D02-007-C01-ISSUE-002',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Authoritative current C01 field evidence and explicit ISSUE-002 relocation, road, parking, entrance, protection, loading, exclusion, clearance, and ownership dispositions.',
    closesWhen: 'No assertion is inferred from catalog bounds and every finding is hash-bound and explicitly accepted.',
  },
  {
    id: 'GAP-D02-008-QUANTITIES-MASS-HAUL',
    category: 'EVIDENCE_GAP',
    status: 'OPEN',
    missing: 'Accepted formation, slopes, structures/voids, unsuitable-material, spoil/borrow, exact construction quantities, and conservative mass-haul rules.',
    closesWhen: 'A byte-reproducible, one-owner takeoff over accepted construction cells passes independent recomputation.',
  },
];

const acceptanceCriteria = [
  {
    id: 'D02-B01',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'geotechnical_subsurface_groundwater_foundations',
    disposition: 'HOLD',
    evidenceDisposition: 'PARTIAL_PASS_REGION_FACTS_ONLY',
    passRule: 'Accept exact treatment, excavation-stability, void/fluid, foundation, retaining, and influence criteria for every contiguous run against one complete immutable save.',
    satisfiedEvidence: ['FACT-D02-004-REGION-CENSUS'],
    blockingGapIds: ['GAP-D02-001-COMPLETE-SAVE', 'GAP-D02-002-GEOTECHNICAL'],
    sourceRefs: [sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B01]')],
  },
  {
    id: 'D02-B02',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'structural_c01_data_district',
    disposition: 'HOLD',
    evidenceDisposition: 'PARTIAL_PASS_EXACT_COORDINATION_ONLY',
    passRule: 'Accept exact spans, clearances, loading/exclusion, foundations, supports, caps, crossings, and an independent recomputation for every treatment and C01/Data District interface.',
    satisfiedEvidence: ['FACT-D02-004-REGION-CENSUS'],
    blockingGapIds: [
      'GAP-D02-001-COMPLETE-SAVE',
      'GAP-D02-003-STRUCTURAL',
      'GAP-D02-007-C01-ISSUE-002',
    ],
    sourceRefs: [sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B02]')],
  },
  {
    id: 'D02-B03',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'hydraulic_drainage_outfall',
    disposition: 'HOLD',
    evidenceDisposition: 'PARTIAL_PASS_CURRENT_TOPOLOGY_AND_PLANNING_GEOMETRY',
    passRule: 'Accept catchments/inflow, storage, freeboard, capacity, failure/recovery, erosion, future fluid topology, and exact owner/interface contracts; keep every receiver/outfall prohibited unless separately proved and accepted.',
    satisfiedEvidence: [
      'DERIVATION-D02-001-FLUID-TOPOLOGY',
      'DERIVATION-D02-002-GRAVITY-LOWS',
      'DERIVATION-D02-003-PREFERRED-MANIFEST',
      'DERIVATION-D02-004-ROAD-LOW-001',
    ],
    blockingGapIds: [
      'GAP-D02-001-COMPLETE-SAVE',
      'GAP-D02-004-HYDRAULIC-CRITERIA',
      'GAP-D02-005-FUTURE-FLUID-ACCOUNTING',
      'GAP-D02-006-OWNERSHIP-INTERFACES',
    ],
    sourceRefs: [
      sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B03]'),
      sourceRef('closedDrainage', '/remainingBlockers'),
    ],
  },
  {
    id: 'D02-B04',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'issue_002_c01_interface_ownership',
    disposition: 'HOLD',
    evidenceDisposition: 'PARTIAL_PASS_REGION_VOLUMES_NEGATIVE_SEMANTIC_EVIDENCE',
    passRule: 'Resolve each ISSUE-002 assertion from a complete current save and accept exact protection, exclusion, loading, clearance, owner, and interface cell sets without inferred relocation or recovery.',
    satisfiedEvidence: ['FACT-D02-004-REGION-CENSUS'],
    blockingGapIds: ['GAP-D02-001-COMPLETE-SAVE', 'GAP-D02-007-C01-ISSUE-002'],
    sourceRefs: [
      sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B04]'),
      sourceRef('regionEvidence', '/d02S02'),
    ],
  },
  {
    id: 'D02-B05',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'curve_visual_staircase',
    disposition: 'PASS_DELEGATED_PLANNING_ACCEPTANCE',
    evidenceDisposition: 'PASS',
    passRule: 'Record acceptance of the exact R140/R120/R140 integer raster or replace it with a revised hash-bound raster; keep staircase rhythm non-controlling.',
    satisfiedEvidence: ['ASSUMPTION-D02-001-C1-RASTER'],
    blockingGapIds: [],
    sourceRefs: [
      sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B05]'),
      sourceRef('delegatedSelections', '/selections[id=SEL-D02-B05-C1-RASTER]'),
    ],
    qualification: 'PASS applies only to the delegated subjective planning choice and authorizes no technical or physical work.',
  },
  {
    id: 'D02-B06',
    category: 'ACCEPTANCE_CRITERION',
    topic: 'quantities_mass_haul',
    disposition: 'HOLD',
    evidenceDisposition: 'PARTIAL_PASS_DIAGNOSTICS_AND_CANDIDATE_COUNTS_ONLY',
    passRule: 'Accept exact formation, slope, structure/void, unsuitable-material, spoil/borrow, construction quantity, ownership, and mass-haul rules over accepted design cells with independent recomputation.',
    satisfiedEvidence: ['DERIVATION-D02-003-PREFERRED-MANIFEST'],
    blockingGapIds: [
      'GAP-D02-002-GEOTECHNICAL',
      'GAP-D02-003-STRUCTURAL',
      'GAP-D02-008-QUANTITIES-MASS-HAUL',
    ],
    sourceRefs: [sourceRef('c1CivilDesign', '/decisionD02/blockers[id=D02-B06]')],
  },
];

const closedDrainageGates = [
  {
    id: 'S04-G01-PLANNING-SELECTION',
    disposition: 'PASS',
    criterion: 'The delegated selection exactly matches the preferred S04 alternative identity.',
    evidenceIds: ['ASSUMPTION-D02-003-CLOSED-DRAINAGE-BASIS'],
  },
  {
    id: 'S04-G02-EXACT-ASSET-MANIFESTS',
    disposition: 'PASS',
    criterion: 'Ten exact per-low-run asset manifests partition the 432-cell preferred candidate manifest.',
    evidenceIds: ['DERIVATION-D02-003-PREFERRED-MANIFEST'],
  },
  {
    id: 'S04-G03-PRESENT-STATE-CLEARANCE',
    disposition: 'PASS_QUALIFIED_CURRENT_REGION_ONLY',
    criterion: 'Every selected candidate has zero same-cell and face-adjacent current fluid cells and clears the committed present-state planning audit.',
    evidenceIds: ['DERIVATION-D02-003-PREFERRED-MANIFEST'],
  },
  {
    id: 'S04-G04-ROAD-LOW-001-PRESERVATION',
    disposition: 'PASS_NO_BUILD_HOLD_PRESERVED',
    criterion: 'ROAD-LOW-001 remains unserved with no selected asset because no strict-clear chamber anchor exists.',
    evidenceIds: ['DERIVATION-D02-004-ROAD-LOW-001'],
  },
  {
    id: 'S04-G05-COMPLETE-SAVE-CLEARANCE',
    disposition: 'HOLD',
    criterion: 'Repeat selected-asset clearance against one complete immutable save including entities, POI, and level.dat.',
    blockingGapIds: ['GAP-D02-001-COMPLETE-SAVE'],
  },
  {
    id: 'S04-G06-HYDRAULIC-CAPACITY-FAILURE',
    disposition: 'HOLD',
    criterion: 'Pass accepted inflow, storage, freeboard, capacity, failure, recovery, erosion, and alarm rules.',
    blockingGapIds: ['GAP-D02-004-HYDRAULIC-CRITERIA'],
  },
  {
    id: 'S04-G07-FUTURE-STATE-ACCOUNTING',
    disposition: 'HOLD',
    criterion: 'Pass exact future construction/influence and before/after fluid-component accounting.',
    blockingGapIds: ['GAP-D02-005-FUTURE-FLUID-ACCOUNTING'],
  },
  {
    id: 'S04-G08-STRUCTURE-GEOTECHNICAL',
    disposition: 'HOLD',
    criterion: 'Pass accepted excavation, chamber, lining, cap, backfill, stability, loading, and independent structural checks.',
    blockingGapIds: ['GAP-D02-002-GEOTECHNICAL', 'GAP-D02-003-STRUCTURAL'],
  },
  {
    id: 'S04-G09-OWNERSHIP-INTERFACES',
    disposition: 'HOLD',
    criterion: 'Assign one accepted owner per cell and accept every collection, maintenance, emergency, overflow, receiver, and outfall interface.',
    blockingGapIds: ['GAP-D02-006-OWNERSHIP-INTERFACES'],
  },
  {
    id: 'S04-G10-TECHNICAL-ACCEPTANCE',
    disposition: 'HOLD',
    criterion: 'Bind all preceding technical PASS results to one explicit accepted design identity.',
    blockingGapIds: [
      'GAP-D02-001-COMPLETE-SAVE',
      'GAP-D02-002-GEOTECHNICAL',
      'GAP-D02-003-STRUCTURAL',
      'GAP-D02-004-HYDRAULIC-CRITERIA',
      'GAP-D02-005-FUTURE-FLUID-ACCOUNTING',
      'GAP-D02-006-OWNERSHIP-INTERFACES',
    ],
  },
];

const sourceBindingSetSha256 = sha256(`${sourceBindings
  .map((item) => `${item.key}\0${item.path}\0${item.sha256}\0${item.bytes}\n`)
  .join('')}`);
const acceptanceBasisPayload = {
  schemaVersion: 1,
  sourceBindingSetSha256,
  immutableRegionSnapshotSha256: snapshotSha256,
  c1ReferenceCenterlineSha256: civil.horizontalAlignment.referenceCenterlineColumnSetSha256,
  preferredAlternativeId: PREFERRED_ALTERNATIVE_ID,
  preferredCandidateCellSetSha256: preferred.candidateCellManifest.coordinateSetSha256,
  heldRoadLowId: heldRoadLow.lowRunId,
  heldRoadLowDisposition: heldRoadLow.disposition,
  heldRoadLowPreservationCellSetSha256:
    preferred.heldLowRunPreservationCellManifest.coordinateSetSha256,
  d02Criteria: acceptanceCriteria.map((item) => ({
    id: item.id,
    disposition: item.disposition,
    blockingGapIds: item.blockingGapIds,
  })),
  closedDrainageGates: closedDrainageGates.map((item) => ({
    id: item.id,
    disposition: item.disposition,
  })),
  operationCellCount: 0,
  worldEditAuthorized: false,
};
const acceptanceBasisSha256 = sha256(JSON.stringify(acceptanceBasisPayload));
const copyableSoleOwnerAcceptanceStatement = `I, the sole project owner, accept Combined Zones D02 planning-basis SHA-256 ${acceptanceBasisSha256} only as the controlling pre-R00 planning basis and acceptance-criteria register: the R140/R120/R140 C1 raster; ${PREFERRED_ALTERNATIVE_ID}; its ten exact capped-sump candidate assets; and the explicit unserved no-build hold at ROAD-LOW-001. I do not accept or infer complete-save identity, hydraulic capacity, future fluid behavior, geotechnical or structural adequacy, C01/ISSUE-002 resolution, ownership or interfaces, quantities or mass haul, technical acceptance, D02 closure, R00 G02 passage, construction, operations, or world edits. Every item marked HOLD remains HOLD until its exact bound evidence passes.`;

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d02-owner-acceptance-packet',
  generatedAtUtc: GENERATED_AT,
  status: 'PARTIAL_PASS_CLASSIFIED_EVIDENCE_D02_G02_HOLD',
  purpose: 'Give the sole owner one source-bound, fail-closed D02 acceptance record that separates current facts and deterministic derivations from planning assumptions, acceptance criteria, and evidence gaps.',
  authorityBoundary: {
    masterplan04Role: authority.authorityModel.rules[1],
    masterplan05Role: authority.authorityModel.rules[2],
    soleHumanAuthority: civilAuthority.authorityModel.soleHumanAuthority,
    delegationMode: selections.authority.delegationMode,
    delegatedPlanningSelectionsMayPass: true,
    agentMayInventTechnicalEvidence: selections.authority.agentMayInventTechnicalEvidence,
    agentMayClaimExpertAcceptance: selections.authority.agentMayClaimExpertAcceptance,
    currentPacketMayResolveD02: false,
    currentPacketMayPassR00G02: false,
  },
  safetyBoundary: {
    committedOfflineInputsOnly: true,
    liveCallsPerformed: [],
    databasesOpened: [],
    operationCells: [],
    materialCells: [],
    operationCellCount: 0,
    candidateCellsAreOperations: false,
    constructionAuthorized: false,
    worldEditAuthorized: false,
    technicalAcceptanceClaimed: false,
    d02Resolved: false,
    r00G02Passed: false,
  },
  sourceGraph: {
    direction: 'BOUND_SOURCE_TO_PACKET_ONLY',
    packetPath: OUTPUT_RELATIVE,
    directInputs: sourceBindings,
    prohibitedDownstreamInputs: [
      'masterplans/05-combined-zones/phase1-r00-readiness-audit.json',
      'R01 or later source guards, operations, manifests, preflights, pilots, executions, rollback evidence, route QA, or post-state QA',
    ],
    cycleFree: true,
    note: 'R00 may consume this packet later; this packet deliberately does not consume R00.',
  },
  acceptanceBasisIdentity: {
    algorithm: 'sha256(JSON.stringify(acceptanceBasisPayload))',
    sha256: acceptanceBasisSha256,
    payload: acceptanceBasisPayload,
  },
  copyableSoleOwnerAcceptance: {
    status: 'TEMPLATE_NOT_EXECUTED',
    statement: copyableSoleOwnerAcceptanceStatement,
    scope: 'PLANNING_BASIS_AND_ACCEPTANCE_CRITERIA_ONLY',
    technicalAcceptanceClaimed: false,
    d02Resolved: false,
    r00G02Passed: false,
    worldEditAuthorized: false,
  },
  evidenceTaxonomy: {
    FACT: 'A value copied from an exact field in a bound source without interpretive transformation.',
    DERIVATION: 'A deterministic result recomputed or cross-checked from bound facts under a stated method.',
    PLANNING_ASSUMPTION: 'A selected rule or design basis that is neither observed fact nor technical acceptance.',
    ACCEPTANCE_CRITERION: 'A fail-closed predicate; PASS requires every stated input, check, owner, and acceptance identity.',
    EVIDENCE_GAP: 'A missing or insufficient input that prevents an acceptance criterion from passing.',
  },
  facts,
  derivations,
  planningAssumptions,
  selectedClosedDrainageBasis: {
    alternativeId: PREFERRED_ALTERNATIVE_ID,
    status: drainage.preferredPlanningAlternative.status,
    aggregateCandidateCellManifest: compactManifest(preferred.candidateCellManifest),
    selectedSumpCandidates,
    heldLowRun: {
      lowRunId: heldRoadLow.lowRunId,
      disposition: heldRoadLow.disposition,
      strictClearAnchorCount: heldRoadLowBasis.strictClearAnchorCount,
      rejectedAnchorStation: heldRoadLow.rejectedAnchorStation,
      rejectedCandidateCellCount: heldRoadLow.rejectedCandidateCellCount,
      rejectedCandidateWaterFamilyCellCount: heldRoadLow.currentFluidSameCellCount,
      rejectedCandidateFaceAdjacentFluidCellCount:
        heldRoadLow.currentFluidFaceAdjacentCellCount,
      preservationCellManifest: compactManifest(preferred.heldLowRunPreservationCellManifest),
      ownerStatus: heldRoadOwner.ownerStatus,
      drainageAssetId: heldRoadOwner.drainageAssetId,
      status: heldRoadOwner.status,
      acceptanceMeaning: 'PASS means the no-build preservation hold is exact and retained; it does not mean the low run is served.',
    },
    technicalAcceptanceClaimed: false,
  },
  closedDrainageAcceptanceGates: closedDrainageGates,
  acceptanceCriteria,
  evidenceGaps,
  ownerDecisionRegister: [
    {
      id: 'OWNER-D02-B05-PLANNING-SELECTION',
      status: 'RECORDED_BY_DELEGATED_SELECTION',
      selectionId: b05Selection.id,
      effect: 'D02-B05 passes as a subjective planning selection only.',
      technicalAcceptanceClaimed: false,
    },
    {
      id: 'OWNER-D02-S04-PLANNING-SELECTION',
      status: 'RECORDED_BY_DELEGATED_SELECTION',
      selectionId: s04Selection.id,
      effect: 'The hybrid capped-sump/no-build alternative is the basis for further offline technical development only.',
      technicalAcceptanceClaimed: false,
    },
    {
      id: 'OWNER-D02-TECHNICAL-ACCEPTANCE',
      status: 'NOT_ACCEPTABLE_FROM_CURRENT_EVIDENCE',
      effect: 'An owner signature cannot substitute for the open complete-save, technical, future-state, C01, quantity, ownership, or interface evidence.',
      technicalAcceptanceClaimed: false,
    },
  ],
  acceptanceSummary: {
    factPassCount: facts.filter((item) => item.status === 'PASS').length,
    derivationPassCount: derivations.filter((item) => item.status === 'PASS').length,
    d02BlockerPassIds: acceptanceCriteria
      .filter((item) => item.disposition.startsWith('PASS'))
      .map((item) => item.id),
    d02BlockerHoldIds: acceptanceCriteria
      .filter((item) => item.disposition === 'HOLD')
      .map((item) => item.id),
    closedDrainagePassGateIds: closedDrainageGates
      .filter((item) => item.disposition.startsWith('PASS'))
      .map((item) => item.id),
    closedDrainageHoldGateIds: closedDrainageGates
      .filter((item) => item.disposition === 'HOLD')
      .map((item) => item.id),
    openEvidenceGapCount: evidenceGaps.length,
    d02Status: 'HOLD',
    r00G02Status: 'HOLD',
  },
  finalGate: {
    status: 'HOLD_D02_AND_R00_G02_NO_WORLD_EDITS',
    reason: 'The raster and closed-drainage planning geometry are exact and selected, but five D02 blockers and six S04 technical gates remain on HOLD; ROAD-LOW-001 is deliberately unserved.',
    operationCellCount: 0,
    worldEditAuthorized: false,
    technicalAcceptanceClaimed: false,
    d02Resolved: false,
    r00G02Passed: false,
  },
};

const markdown = `# D02 owner-acceptance evidence packet\n\n`
  + `**Status:** ${report.finalGate.status}\n`
  + `**Generated:** ${GENERATED_AT}\n`
  + `**Immutable region evidence:** \`${snapshotSha256}\`\n\n`
  + `This is the source-bound D02 acceptance record for the sole owner. It separates facts and deterministic derivations from selected planning assumptions, acceptance criteria, and open evidence gaps. It contains zero operation cells, does not resolve D02 or R00 G02, and authorizes no world edit.\n\n`
  + `## Deterministic outcome now\n\n`
  + `- **PASS:** exact authority/status facts; region-only census identity; current fluid-component derivation; eleven gravity-low runs; the delegated R140/R120/R140 raster choice; the selected 432-cell hybrid planning manifest; ten exact strict-clear sump candidate assets; and preservation of the \`ROAD-LOW-001\` no-build hold.\n`
  + `- **HOLD:** complete-save identity; geotechnical and structural acceptance; hydraulic inflow/storage/freeboard/capacity/failure criteria; future fluid accounting; C01/ISSUE-002; owners and interfaces; quantities and mass haul; technical acceptance; D02; and R00 G02.\n\n`
  + `A PASS below is limited to its stated predicate. In particular, present-state planning clearance is not hydraulic, geotechnical, structural, ownership, construction, or future-state acceptance.\n\n`
  + `## Copyable sole-owner acceptance statement\n\n`
  + `Acceptance-basis SHA-256: \`${acceptanceBasisSha256}\`\n\n`
  + `> ${copyableSoleOwnerAcceptanceStatement}\n\n`
  + `This is an unexecuted template. Copying it records only the planning basis and fail-closed criteria identified by the hash; it cannot turn any HOLD into a technical PASS.\n\n`
  + `## Evidence taxonomy\n\n`
  + `| Class | Meaning |\n|---|---|\n`
  + Object.entries(report.evidenceTaxonomy)
    .map(([key, description]) => `| ${key} | ${description} |`)
    .join('\n')
  + `\n\n## Facts\n\n`
  + `| ID | Status | Fact | Qualification |\n|---|---|---|---|\n`
  + facts.map((item) => `| ${item.id} | ${item.status} | ${item.statement} | ${item.qualification} |`).join('\n')
  + `\n\n## Deterministic derivations\n\n`
  + `| ID | Status | Method | Qualification |\n|---|---|---|---|\n`
  + derivations.map((item) => `| ${item.id} | ${item.status} | ${item.method} | ${item.qualification} |`).join('\n')
  + `\n\n## Planning assumptions\n\n`
  + `| ID | Status | Basis | Technical acceptance? |\n|---|---|---|---|\n`
  + planningAssumptions.map((item) => `| ${item.id} | ${item.status} | ${item.statement} | ${item.technicalAcceptanceClaimed ? 'yes' : 'no'} |`).join('\n')
  + `\n\nNo numeric hydraulic or failure criterion is supplied: all such values remain explicit \`null\` in the JSON packet.\n\n`
  + `## Selected capped-sump candidates\n\n`
  + `The delegated planning basis is \`${PREFERRED_ALTERNATIVE_ID}\`. The ten asset manifests exactly partition its 432 candidate cells. Every owner and collection interface remains unaccepted. Overflow and outfall cell counts remain zero.\n\n`
  + `| Low run | Anchor station | Cells | Coordinate SHA-256 | Current fluid same/face | Owner |\n|---|---:|---:|---|---:|---|\n`
  + selectedSumpCandidates.map((item) => (
    `| ${item.lowRunId} | ${item.anchorStation} | ${item.exactAssetCellManifest.cellCount} | \`${item.exactAssetCellManifest.coordinateSetSha256}\` | ${item.presentStateAudit.currentFluidSameCellCount}/${item.presentStateAudit.currentFluidFaceAdjacentCellCount} | ${item.ownership.ownerStatus} |`
  )).join('\n')
  + `\n\n### ROAD-LOW-001\n\n`
  + `\`ROAD-LOW-001\` has zero strict-clear anchors. Its rejected 36-cell chamber candidate contains ${heldRoadLow.currentFluidSameCellCount} current water-family cells and has ${heldRoadLow.currentFluidFaceAdjacentCellCount} face-adjacent current fluid cells. It therefore remains \`${heldRoadLow.disposition}\`, with no asset, overflow, receiver, or outfall selected. This preservation disposition passes; drainage service does not.\n\n`
  + `## D02 acceptance criteria\n\n`
  + `| Blocker | Disposition | Evidence state | Pass rule | Open gaps |\n|---|---|---|---|---|\n`
  + acceptanceCriteria.map((item) => (
    `| ${item.id} | ${item.disposition} | ${item.evidenceDisposition} | ${item.passRule} | ${item.blockingGapIds.length ? item.blockingGapIds.join(', ') : 'none'} |`
  )).join('\n')
  + `\n\nOnly D02-B05 passes, and only as the recorded delegated planning choice. The other five D02 blockers remain HOLD.\n\n`
  + `## Closed-drainage acceptance gates\n\n`
  + `| Gate | Disposition | Criterion |\n|---|---|---|\n`
  + closedDrainageGates.map((item) => `| ${item.id} | ${item.disposition} | ${item.criterion} |`).join('\n')
  + `\n\n## Open evidence gaps\n\n`
  + evidenceGaps.map((item) => `- **${item.id}:** ${item.missing} Closure: ${item.closesWhen}`).join('\n')
  + `\n\n## Source and cycle boundary\n\n`
  + `Dependencies run only from the following bound sources into this packet. The R00 audit and every R01-or-later release artifact are prohibited as inputs, so a later R00 audit may consume this packet without creating a dependency cycle.\n\n`
  + `| Source | SHA-256 | Role |\n|---|---|---|\n`
  + sourceBindings.map((item) => `| \`${item.path}\` | \`${item.sha256}\` | ${item.role} |`).join('\n')
  + `\n\n## Final gate\n\n`
  + `**${report.finalGate.status}.** ${report.finalGate.reason} No technical acceptance or world edit is authorized.\n`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(`Wrote ${OUTPUT}`);
console.log(`Wrote ${MARKDOWN}`);
