#!/usr/bin/env node
/** Compile the disposable R12Q-bound B09 active-shuttle candidate outside buildops. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  dilateCells,
  hashCells,
  replLine,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:20:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r12q-post-20260822T044855Z');
const LEDGER = value(
  '--source-ledger',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const QA = value(
  '--source-qa',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const OUT_DIR = value(
  '--out-dir',
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12q-candidate',
);
const BASENAME = 'r12q-b09-bounded-active-shuttle';
const PASSIVE_RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const PARKED_RAIL =
  'minecraft:powered_rail[powered=false,shape=east_west,waterlogged=false]';
const POWERED_RAIL =
  'minecraft:powered_rail[powered=true,shape=east_west,waterlogged=false]';
const CONTROL_OFF = 'minecraft:lever[face=wall,facing=north,powered=false]';
const CONTROL_ON = 'minecraft:lever[face=wall,facing=north,powered=true]';
const DIORITE = 'minecraft:polished_diorite';
const AIR = 'minecraft:air';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  r12cManifest:
    'data/buildops/combined-zones-r12c-b09-isolated-lower-straight-passive-rail-design-freeze.release-manifest.json',
  runtimeProof:
    'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/disposable-runtime-proof.json',
  wrapper: 'scripts/run_combined_zones_scoped_release.mjs',
  preflight: 'scripts/preflight_guarded_ops.mjs',
  runner: 'scripts/rcon_runner.py',
  taggedMinecartExecutor: 'scripts/run_guarded_tagged_minecart_transaction.py',
  taggedMinecartRuntimeProof:
    'data/world-review/combined-zones-r12-tagged-minecart-executor-runtime-proof-20260822T051000Z/runtime-proof.json',
});
const EXPECTED = Object.freeze({
  ledger: '9c2bb1ebd3bdb7f6f121769f53d66d55aee4b8d4ab384a6395e94548e0985b8e',
  qa: '51048554e663975d18dcae21df937009b3dfd9059e8c312df4a4a6d8ddf24835',
  qaPayload: '79ac2593021bf1d24becb7c9001f837e30bf0062eb831b3e79af1d2d02423e11',
  sourceComplete: 'ff40e5e40c7f144694b80ede6e600a21ed266f0ad4b5069a36c8c78b35478e55',
  sourceRegion: '1732b30ba39b6b81dd88d0985b9018ba399c41bec295d12397004e20fbe97274',
  sourceCompleted: 'ee059a2d4ac5f030a392ba275487dd2f0083ba7dd3e1379de8ac656e02a49c91',
  r12cManifest: 'de097788b3f93bfb3ac0364e17fc07424801a8eb59cdd769758da9c9831e4a91',
  technical: 'f9b57fb317ff983acacbf98cb0a7776246c242025f583d9795594a6a799898c8',
  runtimeProof: '38ad48f35d6dcdd424f25268e3e16838893d456ae90cb84c355593252c2eb626',
  runtimePayload: '79fac54245e1495d307f9fa324a2d3686cfb98fc271fa9752715d9ed9a76a434',
  wrapper: 'b28bd685f685c664c2d552ece449fa526f935a33523f8302bfe992d5d6cefd85',
  preflight: '6d18e028553623bc855485af80dce3289e6b78672476d41f0b4bb4d21f7c802d',
  runner: 'f3c29f052cfe9f9a59e41a86c5ae6f7655c33e09962d5a47d6d5b62c1735a0da',
  taggedMinecartExecutor:
    'af9e68a5bf78b29f2845cdd084e78a8e7003637a21b837f7bfaeda992b778b7c',
  taggedMinecartRuntimeProof:
    '50bf968aaadd66e5b6ca32eae59b838979c47fda39ae078a086b17ba8c0c98bc',
  taggedMinecartRuntimePayload:
    '89306a709025758d098ad5066fd4471775126e1d5ce75384ca3baf4b9e486588',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12 B09 active-shuttle candidate rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const stateBase = (state) => state.split('[', 1)[0];
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: boundsOf(exact),
    coordinateSetSha256: hashCells(exact),
  };
};
const stateSetSha256 = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice().sort((left, right) => left.cell.x - right.cell.x
    || left.cell.y - right.cell.y || left.cell.z - right.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);

const ledger = readJson(LEDGER);
const qa = readJson(QA);
const technical = readJson(INPUTS.technical);
const r12c = readJson(INPUTS.r12cManifest);
const runtime = readJson(INPUTS.runtimeProof);
invariant(fileBinding(LEDGER).sha256 === EXPECTED.ledger
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompleted
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && ledger.postSnapshot.root === SNAPSHOT, 'R12Q source ledger drifted');
invariant(fileBinding(QA).sha256 === EXPECTED.qa
  && qa.qaPayloadSha256 === EXPECTED.qaPayload
  && qa.summary?.passed === true
  && qa.postSnapshot.completeSaveSha256 === EXPECTED.sourceComplete
  && qa.postSnapshot.regionSha256 === EXPECTED.sourceRegion
  && qa.exactPostState.resultingConnectedComponent.cellCount === 552
  && qa.disposition.activeSystemInstalled === false,
'R12Q accepted post-QA drifted');
invariant(fileBinding(INPUTS.r12cManifest).sha256 === EXPECTED.r12cManifest
  && r12c.scope.selection.firstCenterlineIndex === 9
  && r12c.scope.selection.lastCenterlineIndex === 239
  && r12c.scope.geometry.selectedStraightRail.cellCount === 231,
'accepted lower-straight geometry drifted');
invariant(fileBinding(INPUTS.technical).sha256 === EXPECTED.technical
  && technical.deterministicGeometryContract.centerlinePointCount === 561
  && technical.deterministicGeometryContract.curveIndices.join(',') === '240,260,500',
'frozen B09 technical geometry drifted');
invariant(fileBinding(INPUTS.runtimeProof).sha256 === EXPECTED.runtimeProof
  && runtime.proofPayloadSha256 === EXPECTED.runtimePayload
  && runtime.status
    === 'PASS_EXACT_PAPER_POWERED_SHUTTLE_REVERSAL_FAIL_CLOSED_TERMINAL_PARK_AND_CLEANUP'
  && runtime.mechanism.totalBlockTransitionCount === 19
  && runtime.functionalAcceptance.terminalControlsDeEnergized === true
  && runtime.functionalAcceptance.terminalRailsUnpowered === true
  && runtime.functionalAcceptance.terminalVehicleStationary === true,
'disposable active-shuttle runtime proof drifted');
invariant(fileBinding(INPUTS.wrapper).sha256 === EXPECTED.wrapper
  && fileBinding(INPUTS.preflight).sha256 === EXPECTED.preflight
  && fileBinding(INPUTS.runner).sha256 === EXPECTED.runner,
'block-only safety-kernel tooling drifted');
const taggedMinecartRuntime = readJson(INPUTS.taggedMinecartRuntimeProof);
invariant(fileBinding(INPUTS.taggedMinecartExecutor).sha256
    === EXPECTED.taggedMinecartExecutor
  && fileBinding(INPUTS.taggedMinecartRuntimeProof).sha256
    === EXPECTED.taggedMinecartRuntimeProof
  && taggedMinecartRuntime.proofPayloadSha256
    === EXPECTED.taggedMinecartRuntimePayload
  && taggedMinecartRuntime.status
    === 'PASS_EXACT_PAPER_1_21_11_UUID_TARGETED_FORWARD_ROLLBACK_AND_COMPENSATION',
'tagged-minecart executor or disposable executor runtime proof drifted');

const indexCell = (index) => ({ x: 2048 + index, y: 130, z: -748, index });
const stopPoints = [indexCell(9), indexCell(25)];
const activePoints = Array.from({ length: 15 }, (_, offset) => indexCell(10 + offset));
const controlPoints = [13, 22].map((index) => ({
  x: 2048 + index,
  y: 130,
  z: -747,
  index,
}));
const railCells = activePoints.map(({ x, y, z }) => ({ x, y, z }));
const stopCells = stopPoints.map(({ x, y, z }) => ({ x, y, z }));
const controlCells = controlPoints.map(({ x, y, z }) => ({ x, y, z }));
const targets = uniqueCells([...controlCells, ...stopCells, ...railCells]);
const supports = activePoints.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const headroom = [...stopPoints, ...activePoints].map(({ x, y, z }) => ({ x, y: y + 1, z }));
const oppositeWall = [...stopPoints, ...activePoints].map(({ x, y, z }) => ({ x, y, z: z - 1 }));
const controlBacking = controlPoints.map(({ x, y, z }) => ({ x, y, z: z + 1 }));
const interactionHalo = dilateCells(targets, 1);
invariant(targets.length === 19
  && activePoints.every((point, offset) => point.index === 10 + offset
    && point.x === 2058 + offset && point.y === 130 && point.z === -748)
  && controlPoints.map(({ index }) => index).join(',') === '13,22'
  && stopPoints.map(({ index }) => index).join(',') === '9,25'
  && ![240, 260].some((index) => [...stopPoints, ...activePoints]
    .some((point) => point.index === index)),
'candidate geometry or turn disjointness drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
async function records(cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({
      cell,
      state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}
const controlSource = await records(controlCells);
const stopSource = await records(stopCells);
const railSource = await records(railCells);
const supportSource = await records(supports);
const headroomSource = await records(headroom);
const oppositeWallSource = await records(oppositeWall);
const backingSource = await records(controlBacking);
const haloSource = await records(interactionHalo);
invariant(controlSource.every(({ state }) => state === DIORITE)
  && stopSource.every(({ state }) => state === PASSIVE_RAIL)
  && railSource.every(({ state }) => state === PASSIVE_RAIL)
  && supportSource.every(({ state }) => state === DIORITE)
  && headroomSource.every(({ state }) => state === AIR)
  && oppositeWallSource.every(({ state }) => state === DIORITE)
  && backingSource.every(({ state }) => state === 'minecraft:stone'),
'R12Q candidate source, support, headroom, containment, or backing state drifted');

const targetKeys = new Set(targets.map(cellKey));
const haloKeys = new Set(interactionHalo.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (const key of [...new Set(interactionHalo.map(({ x, z }) => (
  `${Math.floor(x / 16)},${Math.floor(z / 16)}`
)))]) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const blockEntity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    if (haloKeys.has(`${blockEntity.x},${blockEntity.y},${blockEntity.z}`)) {
      blockEntities.push(blockEntity);
    }
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const cell = {
      x: Math.floor(Number(entity.Pos[0])),
      y: Math.floor(Number(entity.Pos[1])),
      z: Math.floor(Number(entity.Pos[2])),
    };
    if (haloKeys.has(cellKey(cell))) savedEntities.push(entity);
  }
}
const fluidStates = haloSource.filter(({ state }) => (
  ['minecraft:water', 'minecraft:lava'].includes(stateBase(state))
    || state.includes('waterlogged=true')
));
const gravityStates = haloSource.filter(({ state }) => (
  ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
    'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
    'minecraft:dragon_egg'].includes(stateBase(state))
    || stateBase(state).endsWith('_concrete_powder')
    || stateBase(state).endsWith('_anvil')
));
const containerStates = haloSource.filter(({ state }) => (
  ['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
    'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
    'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:beehive',
    'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:command_block',
    'minecraft:chain_command_block', 'minecraft:repeating_command_block',
    'minecraft:structure_block'].includes(stateBase(state))
));
const undeclaredMechanisms = haloSource.filter(({ cell, state }) => (
  ['minecraft:rail', 'minecraft:powered_rail', 'minecraft:detector_rail',
    'minecraft:activator_rail', 'minecraft:redstone_wire',
    'minecraft:redstone_torch', 'minecraft:redstone_wall_torch',
    'minecraft:lever'].includes(stateBase(state))
    && !(stateBase(state) === 'minecraft:rail'
      && (targetKeys.has(cellKey(cell))
        || (cell.y === 130 && cell.z === -748
          && [2056, 2074].includes(cell.x))))
));
invariant(blockEntities.length === 0 && savedEntities.length === 0
  && fluidStates.length === 0 && gravityStates.length === 0
  && containerStates.length === 0 && undeclaredMechanisms.length === 0,
'candidate halo contains a block entity, saved entity, fluid, gravity, container, or undeclared mechanism hazard');

const controlForward = controlSource.map(({ cell, state }) => ({
  cell,
  fromState: state,
  toState: CONTROL_OFF,
}));
const trackForward = [
  ...stopSource.map(({ cell, state }) => ({ cell, fromState: state, toState: DIORITE })),
  ...railSource.map(({ cell, state }) => ({ cell, fromState: state, toState: PARKED_RAIL })),
];
const inverse = (operations) => operations.slice().reverse().map((operation) => ({
  cell: operation.cell,
  fromState: operation.toState,
  toState: operation.fromState,
}));
const controlRollback = inverse(controlForward);
const trackRollback = inverse(trackForward);
invariant(controlForward.length === 2 && trackForward.length === 17
  && [...controlForward, ...trackForward].every((operation, index, all) => (
    all.findIndex((candidate) => cellKey(candidate.cell) === cellKey(operation.cell)) === index
  ))
  && [...trackRollback, ...controlRollback].every((operation, index) => {
    const source = [...controlForward, ...trackForward].slice().reverse()[index];
    return cellKey(operation.cell) === cellKey(source.cell)
      && operation.fromState === source.toState
      && operation.toState === source.fromState;
  }), 'candidate packages are not a unique exact reverse-order inverse');

const operationBody = (operations) => `${operations.map((operation) => replLine(
  operation.cell,
  operation.fromState,
  operation.toState,
)).join('\n')}\n`;
const packageSpecs = [
  { key: 'b09-active-shuttle-fail-closed-controls', forward: controlForward,
    rollback: controlRollback },
  { key: 'b09-active-shuttle-fail-closed-track', forward: trackForward,
    rollback: trackRollback },
];
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const packages = [];
const operations = {};
for (const spec of packageSpecs) {
  const forwardBody = operationBody(spec.forward);
  const rollbackBody = operationBody(spec.rollback);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.rollback.txt`);
  const header = (role, bodySha256) => `# DISPOSABLE OFFLINE CANDIDATE - NOT A LIVE BUILDOPS INPUT\n`
    + `# ${BASENAME}/${spec.key} ${role}\n`
    + `# source complete-save SHA-256: ${EXPECTED.sourceComplete}\n`
    + `# operation body SHA-256: ${bodySha256}\n`;
  fs.writeFileSync(absolute(forwardPath), `${header('forward', sha256(forwardBody))}${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${header('rollback', sha256(rollbackBody))}${rollbackBody}`);
  packages.push({
    key: spec.key,
    forward: relative(forwardPath),
    rollback: relative(rollbackPath),
  });
  operations[spec.key] = {
    targetCellCount: spec.forward.length,
    targetCoordinateSetSha256: hashCells(spec.forward.map(({ cell }) => cell)),
    forwardBodySha256: sha256(forwardBody),
    rollbackBodySha256: sha256(rollbackBody),
    forwardFile: fileBinding(forwardPath),
    rollbackFile: fileBinding(rollbackPath),
    exactReverseOrderInverse: true,
  };
}

const candidateWithoutIdentity = {
  schemaVersion: 1,
  id: 'CZ-R12-B09-R12Q-BOUNDED-ACTIVE-SHUTTLE-DISPOSABLE-CANDIDATE',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_PROVEN_DISPOSABLE_CANDIDATE_NOT_A_LIVE_RELEASE_MANIFEST',
  source: {
    predecessor: {
      transactionId: ledger.transactionId,
      executionLedger: fileBinding(LEDGER),
      postQa: fileBinding(QA),
      completedReleaseIdentitySha256: EXPECTED.sourceCompleted,
      postCompleteSaveSha256: EXPECTED.sourceComplete,
      postRegionSha256: EXPECTED.sourceRegion,
    },
    candidateDerivationSnapshot: {
      root: SNAPSHOT,
      completeSaveSha256: EXPECTED.sourceComplete,
      regionSha256: EXPECTED.sourceRegion,
    },
    freshExecutionSourceContract: {
      freshCompleteSaveRequired: true,
      wholeSaveEqualityToPredecessorRequired: false,
      exactNineteenCellSourcePreflightRequired: true,
      exactInteractionHaloClearanceRequired: true,
    },
  },
  scope: {
    canonicalOwner: 'Z11-FUNICULAR-OPERATIONS',
    centerlineIndices: { first: 9, last: 25, poweredFirst: 10, poweredLast: 24 },
    targetCells: classManifest(targets),
    controls: {
      ...classManifest(controlCells),
      centerlineSideIndices: [13, 22],
      sourceState: DIORITE,
      parkedState: CONTROL_OFF,
      functionalState: CONTROL_ON,
      retainedBacking: { ...classManifest(controlBacking), state: 'minecraft:stone' },
    },
    terminalStops: {
      ...classManifest(stopCells),
      centerlineIndices: [9, 25],
      sourceState: PASSIVE_RAIL,
      finalState: DIORITE,
    },
    poweredTrack: {
      ...classManifest(railCells),
      centerlineIndices: { first: 10, last: 24 },
      sourceState: PASSIVE_RAIL,
      parkedState: PARKED_RAIL,
      functionalState: POWERED_RAIL,
    },
    unchangedSupport: { ...classManifest(supports), state: DIORITE },
    retainedHeadroom: { ...classManifest(headroom), state: AIR },
    retainedOppositeWall: { ...classManifest(oppositeWall), state: DIORITE },
    interactionHalo: {
      ...classManifest(interactionHalo),
      sourceStateSetSha256: stateSetSha256(haloSource),
    },
    disjointFromPassiveTurnCells: [240, 260],
  },
  packages,
  executionOrder: packages.map(({ key }) => key),
  rollbackOrder: packages.slice().reverse().map(({ key }) => key),
  operations,
  exactInverse: {
    totalBlockTransitionCount: 19,
    packageCount: 2,
    uniqueTargetCellCount: targets.length,
    reversePackageOrder: true,
    reverseOperationOrder: true,
  },
  staticSafety: {
    sourceBlockEntityCount: blockEntities.length,
    sourceSavedEntityCount: savedEntities.length,
    haloFluidCount: fluidStates.length,
    haloGravityCount: gravityStates.length,
    haloContainerCount: containerStates.length,
    haloUndeclaredMechanismCount: undeclaredMechanisms.length,
    priorPassiveRailMigrationExplicit: true,
    acceptedR12QTurnsTouched: false,
  },
  terminalPostContract: {
    controlsDeEnergized: true,
    railsUnpowered: true,
    minecartStationary: true,
    minecartParkEnvelope: {
      minX: 2058,
      maxX: 2059,
      minY: 130,
      maxY: 131,
      minZ: -748,
      maxZ: -747,
    },
    terminalSnapshotCapturedOnlyAfterFunctionalProofAndPark: true,
  },
  requiredEntityTransaction: {
    required: true,
    transactionId: 'combined-zones-r12r-b09-bounded-active-shuttle',
    entityType: 'minecraft:minecart',
    deterministicTag: 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b',
    deterministicName: 'CZ R12 minecart 7464210e11d51e28',
    identitySeedSha256:
      '7464210e11d51e28eb4e133e2d40fd0b15bbb49f155e0c95ee02554c7b87f79e',
    deterministicUuidRequired: true,
    summonPosition: { x: 2058.5, y: 130.0625, z: -747.5 },
    transactionOccupancyEnvelope: {
      minX: 2058,
      maxX: 2073,
      minY: 130,
      maxY: 131,
      minZ: -748,
      maxZ: -747,
    },
    terminalParkEnvelope: {
      minX: 2058,
      maxX: 2059,
      minY: 130,
      maxY: 131,
      minZ: -748,
      maxZ: -747,
    },
    exactZeroPreexistingTagAndUuidRequired: true,
    executor: fileBinding(INPUTS.taggedMinecartExecutor),
    executorRuntimeProof: fileBinding(INPUTS.taggedMinecartRuntimeProof),
    executorRuntimeProofPayloadSha256: taggedMinecartRuntime.proofPayloadSha256,
    compensationOrder: ['tagged-minecart',
      'b09-active-shuttle-fail-closed-track',
      'b09-active-shuttle-fail-closed-controls'],
  },
  runtimeProof: fileBinding(INPUTS.runtimeProof),
  runtimeProofPayloadSha256: runtime.proofPayloadSha256,
  toolingBoundary: {
    currentBlockOnlyWrapper: fileBinding(INPUTS.wrapper),
    currentBlockPreflight: fileBinding(INPUTS.preflight),
    currentStrictRunner: fileBinding(INPUTS.runner),
    taggedMinecartExecutor: fileBinding(INPUTS.taggedMinecartExecutor),
    taggedMinecartExecutorRuntimeProof:
      fileBinding(INPUTS.taggedMinecartRuntimeProof),
    candidateStoredOutsideBuildops: true,
    canonicalBuildopsEdited: false,
    currentWrapperAcceptsEntityLifecycle: false,
    separateGuardedTaggedMinecartExecutorReady: true,
    blockOnlyExecutionWouldCommissionTransport: false,
  },
  commissioningBoundary: {
    boundedMaintenanceOnlyActiveShuttleMayPassAfterComposedLiveTransaction: true,
    fullB09FunicularCommissioned: false,
    passengerOrPublicTransportCommissioned: false,
    rescueTransportCommissioned: false,
    fullGuidewayContinuityPreservedDuringCandidate: false,
    remainingPassiveGuidewayEastOfIndex25Preserved: true,
  },
  liveCallsPerformed: false,
  worldMutationsPerformed: false,
};
const candidatePayloadSha256 = sha256(JSON.stringify(candidateWithoutIdentity));
const candidate = { ...candidateWithoutIdentity, candidatePayloadSha256 };
const manifestPath = path.join(OUT_DIR, `${BASENAME}.candidate-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(candidate, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: candidate.status,
  manifest: relative(manifestPath),
  candidatePayloadSha256,
  targetCellCount: targets.length,
  packageCount: packages.length,
  requiresPersistentMinecart: true,
  liveReady: false,
}, null, 2)}\n`);
