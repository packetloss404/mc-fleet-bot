#!/usr/bin/env node
/**
 * Compile the exact, non-executable D06 occupied-bee-nest treatment proposal.
 *
 * This compiler consumes only accepted offline evidence. It selects a planning
 * treatment, but it cannot select a destination, emit operations, relocate an
 * entity or block, accept technical work, or authorize a release.
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

const GENERATED_AT = value('--generated-at', '2026-08-06T03:15:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.md',
));
const INPUTS = Object.freeze({
  completeSaveScope:
    'docs/masterplans/05-combined-zones/phase1-g06-complete-save-scope-clearance-20260806T014133Z.json',
  egressGeometry:
    'docs/masterplans/05-combined-zones/phase1-d06-egress-geometry-design.json',
  releaseContract:
    'docs/masterplans/05-combined-zones/phase1-release-contract.json',
});

function absolute(filename) {
  return path.join(ROOT, filename);
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(data), bytes: data.length, role };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D06 bee-nest treatment rejected: ${message}`);
}

function inside(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.y >= bounds.minY && point.y <= bounds.maxY
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

const sourceBindings = {
  completeSaveScope: binding(
    INPUTS.completeSaveScope,
    'accepted complete-save source equivalence, exact D06 POI conflict, and colony state',
  ),
  egressGeometry: binding(
    INPUTS.egressGeometry,
    'prior immutable-source D06 EG-B bee-nest census and protected-stair envelope',
  ),
  releaseContract: binding(
    INPUTS.releaseContract,
    'controlling G06 persistent-feature and G13 fresh live-entity boundaries',
  ),
};
const completeSaveScope = readJson(INPUTS.completeSaveScope);
const egressGeometry = readJson(INPUTS.egressGeometry);
const releaseContract = readJson(INPUTS.releaseContract);

invariant(
  completeSaveScope.status
    === 'PARTIAL_PASS_COMPLETE_SAVE_SCOPE_BOUND_TRANSIENT_ENTITIES_DEFERRED_ONE_PERSISTENT_D06_POI_G06_HOLD',
  'complete-save scope status drift',
);
invariant(
  completeSaveScope.completeSaveScopeEvidence?.projectScopeSourceEquivalent === true
    && completeSaveScope.completeSaveScopeEvidence
      ?.findingDisposition?.deferredToG13EntityObservationCount === 43
    && completeSaveScope.completeSaveScopeEvidence
      ?.findingDisposition?.unclassifiedEntityConflictRecordCount === 0
    && completeSaveScope.completeSaveScopeEvidence
      ?.findingDisposition?.persistentPoiTreatmentRequiredCount === 1,
  'complete-save finding classification drift',
);
const poiRecords = completeSaveScope.completeSaveScopeEvidence
  ?.intersections?.poiConflictRecords ?? [];
invariant(poiRecords.length === 1, 'exactly one proposal-domain POI finding required');
const poi = poiRecords[0];
const point = poi.blockPosition;
const state = poi.sourceStateEvidence;
invariant(
  poi.poiType === 'minecraft:bee_nest'
    && point.x === 1849 && point.y === 66 && point.z === 145
    && state?.blockState?.name === 'minecraft:bee_nest'
    && state.blockState?.properties?.facing === 'south'
    && state.blockState?.properties?.honey_level === '0'
    && state.blockEntityId === 'minecraft:beehive'
    && state.embeddedOccupantCount === 2
    && state.linkedExternalEntityCount === 1
    && state.colonyMemberCount === 3,
  'occupied bee-nest identity or colony state drift',
);
const requiredDomainIds = [
  'D06-MECHANISMS/construction',
  'D06-MECHANISMS/influence',
  'D06-MECHANISMS/interaction',
  'D06-RESERVATIONS/construction',
  'D06-RESERVATIONS/influence',
  'D06-RESERVATIONS/interaction',
];
invariant(
  JSON.stringify(poi.domainIds) === JSON.stringify(requiredDomainIds),
  'D06 proposal-domain intersection drift',
);
const egB = egressGeometry.egressDesigns?.find(({ id }) => id === 'EG-B');
invariant(
  egB
    && egB.immutableSourceCensus?.materialCounts?.['minecraft:bee_nest'] === 1
    && inside(point, egB.externalContinuationDesign.bounds)
    && inside(point, egB.externalContinuationDesign.stairReservation.bounds)
    && !inside(point, egB.externalContinuationDesign.accessibleLiftReservation.bounds),
  'prior EG-B source census or envelope relation drift',
);
const g06 = releaseContract.gateDefinitions?.find(({ id }) => id === 'G06_PROTECTED_FEATURES');
const g13 = releaseContract.gateDefinitions?.find(({ id }) => id === 'G13_LIVE_ENTITY_CLEARANCE');
invariant(
  g06?.stage === 'design'
    && g13?.stage === 'execute'
    && g13.pass?.includes('at most 300 seconds old'),
  'G06/G13 release boundary drift',
);

const sourceCellManifest = `${point.x},${point.y},${point.z}\n`;
const sourceCell = {
  cellCount: 1,
  bounds: {
    minX: point.x, maxX: point.x,
    minY: point.y, maxY: point.y,
    minZ: point.z, maxZ: point.z,
  },
  coordinateSetSha256: sha256(
    `combined-zones-d06-bee-nest-treatment-cell-v1\n${sourceCellManifest}`,
  ),
};
const alternatives = [
  {
    id: 'D06-BEE-01-PRESERVE-IN-PLACE',
    disposition: 'NOT_SELECTED_REQUIRES_EGRESS_GEOMETRY_REDESIGN',
    basis: 'The occupied nest is inside the exact EG-B protected-stair envelope and six D06 proposal domains. Preservation in place would require a new continuous egress design and full G03/G04/G05/G06/G07 re-evaluation.',
    geometryMutationAuthorized: false,
  },
  {
    id: 'D06-BEE-02-HUMANE-INTACT-RELOCATION',
    disposition: 'SELECTED_PLANNING_TREATMENT_TECHNICAL_ACCEPTANCE_HOLD',
    basis: 'Retain the accepted egress geometry and develop one exact intact colony relocation to a surveyed destination outside every proposal domain, protected core/buffer, route, and interface. Preserve all three colony members and the nest state; do not derive an operation from this planning selection.',
    geometryMutationAuthorized: false,
  },
  {
    id: 'D06-BEE-03-DESTRUCTIVE-REMOVAL',
    disposition: 'REJECTED_DEFAULT_DENY',
    basis: 'The bound nest is occupied by two embedded bees and one linked external bee. Destructive handling is neither necessary nor authorized.',
    geometryMutationAuthorized: false,
  },
];
const closureRequirements = [
  'Survey and freeze one exact destination cell outside every G03 proposal domain, protected core/buffer, route, interface, and construction/staging influence set.',
  'Accept habitat, access, ownership, chunk-loading, and non-interference evidence for the destination.',
  'Define a humane intact-relocation method that preserves the nest block state, block-entity projection, two embedded occupants, one linked external bee, and colony membership.',
  'Freeze exact source and destination desired states, guarded forward and rollback operations, source guards, inventory/NBT projections, and success/failure evidence.',
  'Bind the final operation hash to a fresh package-bound G13 live-entity gate no more than 300 seconds before separately authorized execution.',
  'Obtain technical acceptance and the later explicit manifest-bound release authorization; this proposal supplies neither.',
];
const treatmentPayload = {
  completeSaveSha256: completeSaveScope.completeSaveContext.completeSaveSha256,
  sourcePoiEvidenceId: poi.evidenceId,
  sourceCell,
  sourceStateProjectionSha256: state.sourceStateProjectionSha256,
  sourceState: state,
  intersectedDomainIds: poi.domainIds,
  egressRelationship: {
    egressId: egB.id,
    insideExternalContinuation: true,
    insideProtectedStairReservation: true,
    insideAccessibleLiftReservation: false,
  },
  selectedPlanningAlternativeId: 'D06-BEE-02-HUMANE-INTACT-RELOCATION',
  alternatives,
  destinationCellSet: null,
  acceptedTechnicalTreatmentContract: null,
  exactForwardOperation: null,
  exactRollbackOperation: null,
  closureRequirements,
};

const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-occupied-bee-nest-treatment',
  generatedAtUtc: GENERATED_AT,
  status:
    'PARTIAL_PASS_EXACT_OCCUPIED_NEST_BOUND_HUMANE_INTACT_RELOCATION_SELECTED_TECHNICAL_AND_RELEASE_HOLD',
  purpose: 'Select the least-destructive D06 planning treatment for the sole persistent complete-save POI finding without changing accepted proposal geometry or authorizing physical work.',
  sourceBindings,
  releaseBoundary: {
    g06DesignTreatmentAccepted: false,
    g13FreshLiveEntityGateRequiredLater: true,
    g13MaximumAgeSecondsAtTransactionStart: 300,
  },
  treatmentPayload,
  disposition: {
    exactSourceAndColonyStateBound: true,
    transientAnimalRelocationWorkCreated: false,
    planningTreatmentSelected: true,
    destinationSelected: false,
    technicalTreatmentAccepted: false,
    geometryRebuildRequired: false,
    readyForDestinationSurveyAndTechnicalDevelopment: true,
  },
  safetyBoundary: {
    acceptedConstructionCellCount: 0,
    acceptedMaterialCellCount: 0,
    operationCellCount: 0,
    entityRelocationCount: 0,
    blockEditCount: 0,
    physicalReleaseAuthorized: false,
    entityRelocationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.treatmentPayloadSha256 = sha256(
  `combined-zones-d06-bee-nest-treatment-payload-v1\n${JSON.stringify(treatmentPayload)}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-d06-bee-nest-treatment-report-v1\n${JSON.stringify({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    treatmentPayloadSha256: report.treatmentPayloadSha256,
    disposition: report.disposition,
    safetyBoundary: report.safetyBoundary,
  })}\n`,
);

const markdown = `# Combined Zones D06 occupied bee-nest treatment

Generated: ${GENERATED_AT}

Status: **${report.status}**

The accepted complete save binds one occupied bee nest at \`${point.x},${point.y},${point.z}\`. It is inside the EG-B protected-stair reservation and all six D06 reservation/mechanism construction, interaction, and influence domains. The prior D06 source census already counted this nest; the complete save now proves its POI and colony state.

## Bound source state

- Block: \`${state.blockState.name}[facing=${state.blockState.properties.facing},honey_level=${state.blockState.properties.honey_level}]\`
- Embedded bees: **${state.embeddedOccupantCount}**
- Linked external bees: **${state.linkedExternalEntityCount}**
- Bound colony members: **${state.colonyMemberCount}**
- Source-state projection SHA-256: \`${state.sourceStateProjectionSha256}\`

## Planning treatment

**Selected:** humane intact relocation. Preserve the accepted egress geometry and develop one exact relocation to a surveyed destination outside every proposal, protection, route, interface, and staging domain.

Preserve-in-place is not selected because it would require a new continuous protected-egress design. Destructive removal is default-deny because the nest is occupied. No destination or operation is inferred.

## Remaining closure

${closureRequirements.map((requirement) => `- ${requirement}`).join('\n')}

## Safety boundary

Zero operations, zero entity relocations, and zero block edits are authorized. G13 remains a fresh execute-stage gate; this offline capture cannot substitute for it.

Treatment payload SHA-256: \`${report.treatmentPayloadSha256}\`

Report identity SHA-256: \`${report.reportIdentitySha256}\`
`;

fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.mkdirSync(path.dirname(MARKDOWN), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(MARKDOWN, markdown);

console.log(JSON.stringify({
  output: relative(OUTPUT),
  markdown: relative(MARKDOWN),
  status: report.status,
  sourceCellCount: sourceCell.cellCount,
  colonyMemberCount: state.colonyMemberCount,
  selectedPlanningAlternativeId: treatmentPayload.selectedPlanningAlternativeId,
  operationCellCount: report.safetyBoundary.operationCellCount,
  treatmentPayloadSha256: report.treatmentPayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
