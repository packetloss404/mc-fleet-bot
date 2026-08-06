#!/usr/bin/env node
/**
 * Compile a synthetic, offline state-machine fixture for intact nest relocation.
 *
 * This proves the planning contract rejects partial-colony transport and
 * preserves the complete projected block state, block-entity data, and three
 * fixture occupants through forward and rollback transforms. It does not prove
 * live server mechanics and emits no Minecraft command or operation.
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
const GENERATED_AT = value('--generated-at', '2026-08-06T03:35:00Z');
const OUTPUT = path.resolve(value(
  '--out',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.json',
));
const MARKDOWN = path.resolve(value(
  '--markdown',
  'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-relocation-fixture.md',
));
const INPUTS = Object.freeze({
  treatment: 'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-treatment.json',
  destinationSurvey:
    'docs/masterplans/05-combined-zones/phase1-d06-bee-nest-destination-survey.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
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

function canonicalize(valueToCanonicalize) {
  if (Array.isArray(valueToCanonicalize)) return valueToCanonicalize.map(canonicalize);
  if (valueToCanonicalize && typeof valueToCanonicalize === 'object') {
    return Object.fromEntries(Object.keys(valueToCanonicalize).sort().map((key) => (
      [key, canonicalize(valueToCanonicalize[key])]
    )));
  }
  return valueToCanonicalize;
}

function canonicalJson(valueToCanonicalize) {
  return JSON.stringify(canonicalize(valueToCanonicalize));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
}

function binding(filename, role) {
  const data = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(data), bytes: data.length, role };
}

function invariant(condition, message) {
  if (!condition) throw new Error(`D06 bee relocation fixture rejected: ${message}`);
}

const sourceBindings = {
  treatment: binding(
    INPUTS.treatment,
    'exact occupied source state and selected humane intact-relocation treatment',
  ),
  destinationSurvey: binding(
    INPUTS.destinationSurvey,
    'improved conflict-free destination candidate and current destination state',
  ),
  releaseContract: binding(
    INPUTS.releaseContract,
    'G13 fresh-live-state and later physical-release boundary',
  ),
};
const treatment = readJson(INPUTS.treatment);
const destinationSurvey = readJson(INPUTS.destinationSurvey);
const releaseContract = readJson(INPUTS.releaseContract);
invariant(
  treatment.status
    === 'PARTIAL_PASS_EXACT_OCCUPIED_NEST_BOUND_HUMANE_INTACT_RELOCATION_SELECTED_TECHNICAL_AND_RELEASE_HOLD'
    && treatment.treatmentPayload?.selectedPlanningAlternativeId
      === 'D06-BEE-02-HUMANE-INTACT-RELOCATION',
  'treatment input drift',
);
invariant(
  destinationSurvey.status
    === 'PARTIAL_PASS_EXACT_CONFLICT_FREE_DESTINATION_CANDIDATE_SELECTED_OWNERSHIP_HABITAT_METHOD_AND_RELEASE_HOLD'
    && destinationSurvey.sourceBindings?.treatment?.sha256 === sourceBindings.treatment.sha256
    && destinationSurvey.disposition?.destinationCellAccepted === false,
  'destination survey input drift',
);
const g13 = releaseContract.gateDefinitions?.find(({ id }) => id === 'G13_LIVE_ENTITY_CLEARANCE');
invariant(g13?.stage === 'execute' && g13.pass?.includes('at most 300 seconds old'),
  'G13 boundary drift');

const sourceState = treatment.treatmentPayload.sourceState;
const source = {
  x: treatment.treatmentPayload.sourceCell.bounds.minX,
  y: treatment.treatmentPayload.sourceCell.bounds.minY,
  z: treatment.treatmentPayload.sourceCell.bounds.minZ,
};
const destination = destinationSurvey.surveyPayload.selectedPlanningCandidate.point;
invariant(
  sourceState.blockState?.name === 'minecraft:bee_nest'
    && sourceState.blockEntityId === 'minecraft:beehive'
    && sourceState.unmodeledBlockEntityFields?.length === 0
    && sourceState.blockEntityPreservationProjection?.bees?.length === 2
    && sourceState.linkedExternalEntityCount === 1
    && sourceState.colonyMemberCount === 3,
  'source preservation projection drift',
);
invariant(
  destinationSurvey.surveyPayload.selectedPlanningCandidate.currentBlock === 'minecraft:air'
    && destinationSurvey.surveyPayload.selectedPlanningCandidate.southEntranceBlock
      === 'minecraft:air'
    && destinationSurvey.surveyPayload.selectedPlanningCandidate
      .destinationBlockEntityCount === 0
    && destinationSurvey.surveyPayload.selectedPlanningCandidate.destinationPoiRecordCount === 0,
  'destination is not an empty fixture target',
);

const capturedOccupants = [
  ...sourceState.blockEntityPreservationProjection.bees.map((preservedNbt, index) => ({
    fixtureId: `embedded-source-${index + 1}`,
    sourceClass: 'EMBEDDED_SOURCE_NBT',
    preservedNbt,
  })),
  {
    fixtureId: 'linked-external-source-1',
    sourceClass: 'LINKED_EXTERNAL_ENTITY_REQUIRES_LIVE_CONSOLIDATION',
    preservedNbt: {
      entityType: sourceState.linkedExternalEntities[0].entityType,
      sourceEvidenceId: sourceState.linkedExternalEntities[0].evidenceId,
      homeHivePosition: sourceState.linkedExternalEntities[0].homeHivePosition,
    },
  },
];
const capturedState = {
  phase: 'CAPTURED_SOURCE_NOT_TRANSPORT_ELIGIBLE',
  nestPosition: source,
  blockState: sourceState.blockState,
  blockEntityNonCoordinateProjection: sourceState.blockEntityPreservationProjection,
  embeddedOccupants: capturedOccupants.filter(({ sourceClass }) => (
    sourceClass === 'EMBEDDED_SOURCE_NBT'
  )),
  linkedExternalOccupants: capturedOccupants.filter(({ sourceClass }) => (
    sourceClass !== 'EMBEDDED_SOURCE_NBT'
  )),
};

function occupantIdentity(records) {
  return records.map(({ fixtureId }) => fixtureId).sort();
}

function transportEligibility(state, destinationCurrentBlock = 'minecraft:air') {
  const all = [...state.embeddedOccupants, ...state.linkedExternalOccupants];
  const identities = occupantIdentity(all);
  return {
    passed: state.embeddedOccupants.length === 3
      && state.linkedExternalOccupants.length === 0
      && identities.length === 3
      && new Set(identities).size === 3
      && destinationCurrentBlock === 'minecraft:air',
    embeddedOccupantCount: state.embeddedOccupants.length,
    linkedExternalOccupantCount: state.linkedExternalOccupants.length,
    uniqueOccupantCount: new Set(identities).size,
    destinationCurrentBlock,
  };
}

function consolidatedFixtureState() {
  return {
    phase: 'SYNTHETIC_ALL_THREE_EMBEDDED_PRECONDITION',
    nestPosition: source,
    blockState: sourceState.blockState,
    blockEntityNonCoordinateProjection: {
      ...sourceState.blockEntityPreservationProjection,
      bees: capturedOccupants.map(({ fixtureId, sourceClass, preservedNbt }) => ({
        fixtureId,
        sourceClass,
        preservedNbt,
      })),
    },
    embeddedOccupants: capturedOccupants,
    linkedExternalOccupants: [],
  };
}

function relocateFixture(state, target) {
  invariant(transportEligibility(state).passed, 'transport precondition failed');
  return {
    ...state,
    phase: 'SYNTHETIC_RELOCATED',
    nestPosition: target,
  };
}

function stateProjection(state) {
  return canonicalize({
    blockState: state.blockState,
    blockEntityNonCoordinateProjection: state.blockEntityNonCoordinateProjection,
    occupantIds: occupantIdentity([
      ...state.embeddedOccupants,
      ...state.linkedExternalOccupants,
    ]),
  });
}

const capturedEligibility = transportEligibility(capturedState);
const consolidated = consolidatedFixtureState();
const consolidatedEligibility = transportEligibility(consolidated);
const relocated = relocateFixture(consolidated, destination);
const rolledBack = relocateFixture(relocated, source);
const consolidatedProjection = stateProjection(consolidated);
const relocatedProjection = stateProjection(relocated);
const rollbackProjection = stateProjection(rolledBack);
const projectionSha256 = sha256(
  `combined-zones-d06-bee-relocation-state-v1\n${canonicalJson(consolidatedProjection)}\n`,
);

const negativeFixtures = [
  {
    id: 'CURRENT_CAPTURE_ONE_BEE_EXTERNAL',
    rejected: !capturedEligibility.passed,
    reason: 'Transport is forbidden until a fresh live observation proves all three colony members embedded and zero linked bees external.',
  },
  {
    id: 'MISSING_OCCUPANT',
    rejected: !transportEligibility({
      ...consolidated,
      embeddedOccupants: consolidated.embeddedOccupants.slice(0, 2),
    }).passed,
    reason: 'A two-member projection fails the exact three-member conservation rule.',
  },
  {
    id: 'DUPLICATED_OCCUPANT',
    rejected: !transportEligibility({
      ...consolidated,
      embeddedOccupants: [
        consolidated.embeddedOccupants[0],
        consolidated.embeddedOccupants[0],
        consolidated.embeddedOccupants[2],
      ],
    }).passed,
    reason: 'Duplicate fixture identities fail the occupant bijection.',
  },
  {
    id: 'DESTINATION_NOT_AIR',
    rejected: !transportEligibility(consolidated, 'minecraft:grass_block').passed,
    reason: 'A non-air destination fails the no-undeclared-replacement rule.',
  },
  {
    id: 'BLOCK_STATE_DRIFT',
    rejected: canonicalJson({
      ...consolidatedProjection,
      blockState: {
        ...consolidatedProjection.blockState,
        properties: { facing: 'north', honey_level: '0' },
      },
    }) !== canonicalJson(consolidatedProjection),
    reason: 'Facing or honey-level drift changes the preservation projection.',
  },
];
const checks = {
  currentCaptureCorrectlyRejectedForTransport: capturedEligibility.passed === false,
  allThreeEmbeddedPreconditionAccepted: consolidatedEligibility.passed === true,
  exactThreeMemberOccupantBijection:
    JSON.stringify(occupantIdentity(consolidated.embeddedOccupants))
      === JSON.stringify(occupantIdentity(relocated.embeddedOccupants))
    && JSON.stringify(occupantIdentity(consolidated.embeddedOccupants))
      === JSON.stringify(occupantIdentity(rolledBack.embeddedOccupants)),
  forwardNonCoordinateStateExact:
    canonicalJson(consolidatedProjection) === canonicalJson(relocatedProjection),
  rollbackNonCoordinateStateExact:
    canonicalJson(consolidatedProjection) === canonicalJson(rollbackProjection),
  sourceAndRollbackCoordinatesExact:
    canonicalJson(rolledBack.nestPosition) === canonicalJson(source),
  destinationCoordinatesExact:
    canonicalJson(relocated.nestPosition) === canonicalJson(destination),
  everyNegativeFixtureRejected: negativeFixtures.every(({ rejected }) => rejected),
};
invariant(Object.values(checks).every(Boolean), 'synthetic fixture check failed');

const fixturePayload = {
  source,
  destination,
  capturedSourceState: capturedState,
  capturedTransportEligibility: capturedEligibility,
  syntheticConsolidatedPrecondition: consolidated,
  consolidatedTransportEligibility: consolidatedEligibility,
  syntheticRelocatedState: relocated,
  syntheticRollbackState: rolledBack,
  conservedStateProjectionSha256: projectionSha256,
  checks,
  negativeFixtures,
  liveProofRequirements: [
    'Use a disposable isolated server fixture matching the production Paper/Minecraft version; never use the live project world for method development.',
    'Prove a fresh pre-transport state with exactly three embedded bees and zero linked external bees; the accepted complete save currently has only two embedded and one external.',
    'Prove the chosen intact-relocation mechanism round-trips block state, every non-coordinate block-entity field, all three occupants, source/destination states, and rollback without loss or duplication.',
    'Bind the proven runtime method and version identity into the technical-treatment contract before any operation is compiled.',
  ],
};
const report = {
  schemaVersion: 1,
  id: 'combined-zones-phase1-d06-bee-nest-relocation-fixture',
  generatedAtUtc: GENERATED_AT,
  status:
    'PASS_SYNTHETIC_THREE_MEMBER_STATE_ROUNDTRIP_CURRENT_CAPTURE_TRANSPORT_REJECTED_RUNTIME_MECHANIC_HOLD',
  purpose: 'Prove the fail-closed relocation state contract and occupant bijection offline without claiming the current captured colony is transport-ready or that live server mechanics are validated.',
  sourceBindings,
  fixturePayload,
  disposition: {
    syntheticStateContractPassed: true,
    currentCapturedStateTransportEligible: false,
    liveConsolidationRequired: true,
    isolatedRuntimeMechanicProofRequired: true,
    runtimeMechanicProven: false,
    technicalTreatmentAccepted: false,
    operationCompilationAuthorized: false,
  },
  safetyBoundary: {
    operationCellCount: 0,
    entityRelocationCount: 0,
    blockEditCount: 0,
    serverStarted: false,
    liveWorldContacted: false,
    physicalReleaseAuthorized: false,
    entityRelocationAuthorized: false,
    worldEditAuthorized: false,
    executable: false,
  },
};
report.fixturePayloadSha256 = sha256(
  `combined-zones-d06-bee-relocation-fixture-payload-v1\n${JSON.stringify(fixturePayload)}\n`,
);
report.reportIdentitySha256 = sha256(
  `combined-zones-d06-bee-relocation-fixture-report-v1\n${JSON.stringify({
    schemaVersion: report.schemaVersion,
    id: report.id,
    generatedAtUtc: report.generatedAtUtc,
    status: report.status,
    sourceBindings: report.sourceBindings,
    fixturePayloadSha256: report.fixturePayloadSha256,
    disposition: report.disposition,
    safetyBoundary: report.safetyBoundary,
  })}\n`,
);

const markdown = `# Combined Zones D06 bee-nest relocation fixture

Generated: ${GENERATED_AT}

Status: **${report.status}**

This synthetic offline fixture proves the relocation contract conserves the complete projected nest block state, every modeled non-coordinate block-entity field, and a three-member occupant bijection through forward and rollback coordinate transforms.

## Important fail-closed result

The accepted capture is **not transport-ready**: two bees are embedded and one linked bee is outside. Relocation is forbidden until a fresh live observation proves all three embedded and zero linked external bees.

The synthetic three-member state passes forward and rollback conservation. Missing or duplicated occupants, an external bee, a non-air destination, and block-state drift all fail.

## Remaining real proof

${fixturePayload.liveProofRequirements.map((requirement) => `- ${requirement}`).join('\n')}

No server was started, no live world was contacted, and no command or operation was generated. This fixture does not prove Silk Touch, item-component, plugin, or server-version behavior.

Fixture payload SHA-256: \`${report.fixturePayloadSha256}\`

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
  currentCaptureTransportEligible:
    report.disposition.currentCapturedStateTransportEligible,
  syntheticCheckCount: Object.keys(checks).length,
  negativeFixtureCount: negativeFixtures.length,
  operationCellCount: report.safetyBoundary.operationCellCount,
  fixturePayloadSha256: report.fixturePayloadSha256,
  reportIdentitySha256: report.reportIdentitySha256,
}, null, 2));
