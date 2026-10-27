#!/usr/bin/env node
/**
 * Compile MP07-RRMSA-FULL-CIRCULATION-01 from a complete immutable snapshot.
 *
 * This is deliberately a static compiler, not an execution tool.  It only
 * emits an exact guarded forward/rollback pair after a separately accepted,
 * hash-bound three-cell ownership contract is supplied.  A design proposal is
 * not enough authority to create an operation file.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP07-RRMSA-FULL-CIRCULATION-01';
const CONTRACT_STATUS = 'ACCEPTED_EXACT_3D_INTERFACE_CONTRACT';
const args = process.argv.slice(2);
const option = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`);
};
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const stateName = (state) => String(state).split('[', 1)[0];

const SNAPSHOT = option('--snapshot');
const CONTRACT = option('--contract');
const ROUTE_SURVEY = option('--route-survey');
const OUT_DIR = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'mp07-rrmsa-full-circulation-01-static');
const GENERATED_AT = option('--generated-at', '1970-01-01T00:00:00Z');

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg',
  'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const PROTECTED = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon',
  'minecraft:spawner', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
  'minecraft:blast_furnace', 'minecraft:furnace', 'minecraft:smoker',
  'minecraft:brewing_stand', 'minecraft:decorated_pot', 'minecraft:ender_chest',
]);
const CONTROL = new Set([
  'minecraft:lever', 'minecraft:redstone_wire', 'minecraft:repeater',
  'minecraft:comparator', 'minecraft:daylight_detector', 'minecraft:target',
]);

const TARGETS = [
  {
    point: { x: -80, y: 66, z: -79 },
    sourceState: 'minecraft:polished_andesite',
    replacement: 'minecraft:air',
    transferFrom: 'mainstreet-america / R02 West Lane + town-expansion-r1 / TE-RAVENSREACH-MAINSTREET-STAFF-PATH',
    receiver: 'MP07-RRMSA-CIRCULATION-INTERFACE / WEST-LANE-GATEWAY-HEADROOM',
  },
  {
    point: { x: -58, y: 70, z: -309 },
    sourceState: 'minecraft:stripped_dark_oak_log[axis=y]',
    replacement: 'minecraft:air',
    transferFrom: 'town-expansion-r1 / RRCH-STEWARD:HOUSE:1',
    receiver: 'MP07-RRMSA-CIRCULATION-INTERFACE / STEWARD-SERVICE-ARCADE',
  },
  {
    point: { x: -58, y: 71, z: -309 },
    sourceState: 'minecraft:stripped_dark_oak_log[axis=y]',
    replacement: 'minecraft:air',
    transferFrom: 'town-expansion-r1 / RRCH-STEWARD:HOUSE:1',
    receiver: 'MP07-RRMSA-CIRCULATION-INTERFACE / STEWARD-SERVICE-ARCADE',
  },
];
const RETAINED_STEWARD_BOUNDARY = [
  { point: { x: -58, y: 69, z: -309 }, sourceState: 'minecraft:stone_bricks' },
  { point: { x: -58, y: 72, z: -309 }, sourceState: 'minecraft:stripped_dark_oak_log[axis=y]' },
  { point: { x: -58, y: 70, z: -308 }, sourceState: 'minecraft:calcite' },
  { point: { x: -58, y: 71, z: -308 }, sourceState: 'minecraft:calcite' },
  { point: { x: -59, y: 70, z: -309 }, sourceState: 'minecraft:stripped_dark_oak_log[axis=y]' },
  { point: { x: -57, y: 70, z: -309 }, sourceState: 'minecraft:short_grass' },
];
const TARGET_CELL_SET = uniqueCells(TARGETS.map(({ point }) => point));
const TARGET_COORDINATE_SHA256 = hashCells(TARGET_CELL_SET);

function pointFromArray(point) {
  fail(Array.isArray(point) && point.length === 3 && point.every(Number.isInteger),
    `invalid contract point ${JSON.stringify(point)}`);
  return { x: point[0], y: point[1], z: point[2] };
}

function exactSet(cells) {
  const unique = uniqueCells(cells);
  return {
    cellCount: unique.length,
    bounds: boundsOf(unique),
    coordinateSetSha256: hashCells(unique),
  };
}

function interactionHalo(cells) {
  return uniqueCells(cells.flatMap(({ x, y, z }) => (
    Array.from({ length: 3 }, (_, dx) => dx - 1).flatMap((dx) => (
      Array.from({ length: 3 }, (_, dy) => dy - 1).flatMap((dy) => (
        Array.from({ length: 3 }, (_, dz) => dz - 1)
          .map((dz) => ({ x: x + dx, y: y + dy, z: z + dz }))
      ))
    ))
  )));
}

function isProtectedState(state) {
  const name = stateName(state);
  return PROTECTED.has(name) || CONTROL.has(name) || name.endsWith('_shulker_box');
}

function isFluid(state) {
  return FLUID.has(stateName(state)) || String(state).includes('waterlogged=true');
}

function isGravity(state) {
  return GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
}

function assertContract(contract, sourceRegion, sourceIdentity) {
  fail(contract?.schemaVersion === 1, 'contract schemaVersion must be 1');
  fail(contract.contractId === 'MP07-RRMSA-FULL-CIRCULATION-INTERFACE-01',
    'unexpected contractId');
  fail(contract.status === CONTRACT_STATUS,
    `contract status must be ${CONTRACT_STATUS}, got ${contract.status ?? 'missing'}`);
  fail(contract.mutationAuthorityGranted === false,
    'contract may authorize ownership transfer only; it may not authorize execution');
  fail(typeof contract.acceptedAtUtc === 'string' && contract.acceptedAtUtc.length > 0,
    'accepted contract lacks acceptedAtUtc');
  fail(Array.isArray(contract.approvals?.ownerApprovals) && contract.approvals.ownerApprovals.length >= 2,
    'accepted contract lacks named owner approvals');

  const source = contract.sourceSnapshot;
  fail(source?.algorithm === 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    'contract source hash algorithm is not the canonical region identity algorithm');
  fail(source?.sha256 === sourceIdentity.sha256, 'contract source-region SHA-256 does not match snapshot');
  fail(source.regionFileCount === sourceIdentity.regionFileCount,
    'contract source-region file count does not match snapshot');
  fail(path.resolve(ROOT, source.directory) === sourceRegion,
    'contract source directory is not this exact snapshot region');

  const expectedContractCells = TARGETS.map(({ point, sourceState, replacement }) => ({
    point: [point.x, point.y, point.z], sourceState, replacement,
  })).sort((left, right) => left.point.join(',').localeCompare(right.point.join(',')));
  const contractCells = (contract.transfers ?? []).flatMap((transfer) => (transfer.exactCells ?? [])
    .map(({ point, sourceState, replacement }) => ({ point, sourceState, replacement })))
    .sort((left, right) => String(left.point).localeCompare(String(right.point)));
  fail(sameJson(contractCells, expectedContractCells),
    'contract exactCells are not the canonical three-cell source/replacement set');
  const contractPoints = contractCells.map(({ point }) => pointFromArray(point));
  fail(hashCells(contractPoints) === TARGET_COORDINATE_SHA256,
    'contract coordinate-set hash does not bind the canonical three cells');

  const stewardTransfer = (contract.transfers ?? []).find((transfer) => (
    transfer.from === TARGETS[1].transferFrom
      && transfer.to === TARGETS[1].receiver
  ));
  const westLaneTransfer = (contract.transfers ?? []).find((transfer) => (
    transfer.from === TARGETS[0].transferFrom
      && transfer.to === TARGETS[0].receiver
  ));
  fail(stewardTransfer?.noOtherStewardHouseCellsTransferred === true,
    'contract does not exclude every other Steward House cell');
  fail(westLaneTransfer?.noOtherWestLaneOrTownExpansionCellsTransferred === true,
    'contract does not exclude every other West Lane/Town Expansion cell');
  const retained = (stewardTransfer?.retainedAdjacentCells ?? []).map(({ point, sourceState }) => ({
    point: pointFromArray(point), sourceState,
  })).sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  const expectedRetained = RETAINED_STEWARD_BOUNDARY.slice()
    .sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  fail(sameJson(retained, expectedRetained), 'contract retained Steward facade boundary differs from design');

  const approvalOwners = new Set(contract.approvals.ownerApprovals.map(({ owner }) => owner));
  for (const owner of new Set(TARGETS.map(({ transferFrom }) => transferFrom))) {
    fail(approvalOwners.has(owner), `accepted contract lacks named approval for ${owner}`);
  }
  const binding = contract.operationBinding;
  fail(binding?.releaseId === RELEASE_ID, 'contract operationBinding releaseId mismatch');
  fail(binding.targetCoordinateSetSha256 === TARGET_COORDINATE_SHA256,
    'contract operationBinding does not hash-bind the exact target set');
  fail(binding.exactInverseRequired === true,
    'contract operationBinding does not require exact inverse');
  const bindingCells = (binding.cells ?? []).map(({ point, fromState, toState }) => ({
    point, sourceState: fromState, replacement: toState,
  })).sort((left, right) => String(left.point).localeCompare(String(right.point)));
  fail(sameJson(bindingCells, expectedContractCells),
    'contract operationBinding does not bind the exact forward/reverse states');
}

function assertRouteEvidence(routeSurvey, sourceIdentity) {
  const accepted = routeSurvey?.accepted;
  fail(routeSurvey?.status === 'PASS', 'route survey is not accepted PASS evidence');
  fail(accepted?.status === 'PASS_OFFLINE_NORMAL_WALK', 'route survey normal-walk proof did not pass');
  fail(accepted?.snapshot?.sha256 === sourceIdentity.sha256,
    'route survey does not bind this source region');
  fail(Array.isArray(accepted.forwardSegments) && accepted.forwardSegments.length === 48,
    'route survey must contain exactly 48 forward segments');
  fail(Array.isArray(accepted.reverseSegments) && accepted.reverseSegments.length === 48,
    'route survey must contain exactly 48 reverse segments');
  fail(accepted.forwardSegments.every((segment) => segment.passed === true && Array.isArray(segment.exactPath)),
    'not all 48 forward route proofs passed');
  fail(accepted.reverseSegments.every((segment) => segment.passed === true && Array.isArray(segment.exactPath)),
    'not all 48 reverse route proofs passed');
  fail(accepted.exactPathCellCount === 534 && Array.isArray(accepted.exactPath)
    && accepted.exactPath.length === 534, 'route survey exact path is not the accepted 534-cell trace');
  fail(sha256(JSON.stringify(accepted.exactPath)) === accepted.exactPathSha256,
    'route survey exact path SHA-256 drifted');
  const routeCore = new Set(accepted.exactPath.flatMap(([x, y, z]) => (
    [[x, y - 1, z], [x, y, z], [x, y + 1, z]].map((point) => point.join(','))
  )));
  for (const { point } of TARGETS) {
    fail(!routeCore.has(`${point.x},${point.y},${point.z}`),
      `target ${cellKey(point)} unexpectedly intersects canonical feet/head/support route core`);
  }
  return accepted;
}

async function exactEntityAudit(reader, entityReader, cells) {
  const keys = new Set(cells.map(cellKey));
  const chunks = [...new Set(cells.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
  const blockEntities = [];
  const savedEntities = [];
  for (const chunkKey of chunks) {
    const [x, z] = chunkKey.split(',').map(Number);
    const blockChunk = await reader.chunk(x, z);
    for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (keys.has(cellKey(point))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(x, z);
    for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const point = { x: Math.floor(Number(entity.Pos[0])), y: Math.floor(Number(entity.Pos[1])), z: Math.floor(Number(entity.Pos[2])) };
      if (keys.has(cellKey(point))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, point });
    }
  }
  return { blockEntities, savedEntities };
}

function operationHeader(direction, source, contractPath, contractSha256, bodySha256) {
  return [
    `# GENERATED FILE — ${RELEASE_ID} (${direction})`,
    `# immutable offline source: ${relative(source)}`,
    `# accepted ownership contract: ${relative(contractPath)}`,
    `# contract SHA-256: ${contractSha256}`,
    '# NOT AUTHORIZED FOR EXECUTION: fresh same-moment source and complete guarded kernel required.',
    `# operation SHA-256: ${bodySha256}`,
  ].join('\n');
}

async function main() {
  fail(SNAPSHOT, '--snapshot is required');
  fail(CONTRACT, '--contract is required and must be accepted');
  fail(ROUTE_SURVEY, '--route-survey is required');
  const snapshotRoot = absolute(SNAPSHOT);
  const sourceRegion = path.join(snapshotRoot, 'region');
  const contractPath = absolute(CONTRACT);
  const routeSurveyPath = absolute(ROUTE_SURVEY);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    fail(fs.existsSync(path.join(snapshotRoot, member)), `complete immutable source missing ${member}`);
  }
  fail(fs.existsSync(contractPath), `contract not found: ${CONTRACT}`);
  fail(fs.existsSync(routeSurveyPath), `route survey not found: ${ROUTE_SURVEY}`);
  const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  fail(capture.immutableCopy === true, 'source capture is not immutable');
  const sourceIdentity = hashSnapshotDirectory(sourceRegion);
  const contractBytes = fs.readFileSync(contractPath);
  const contract = JSON.parse(contractBytes);
  fail(path.resolve(ROOT, contract?.sourceSnapshot?.completeSaveCapture ?? '') === capturePath,
    'contract complete-save capture path is not this exact immutable source');
  assertContract(contract, sourceRegion, sourceIdentity);
  const routeSurveyBytes = fs.readFileSync(routeSurveyPath);
  const acceptedRoute = assertRouteEvidence(JSON.parse(routeSurveyBytes), sourceIdentity);

  const reader = new AnvilReader(sourceRegion);
  const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
  const sourceAt = async (point) => stateToCommandString(await reader.blockState(point.x, point.y, point.z));
  const sourceStates = [];
  for (const target of TARGETS) {
    const actual = await sourceAt(target.point);
    fail(actual === target.sourceState,
      `source state at ${cellKey(target.point)} is ${actual}, expected ${target.sourceState}`);
    fail(!isFluid(actual) && !isGravity(actual) && !isProtectedState(actual),
      `target ${cellKey(target.point)} is not an ordinary exact structural source state`);
    sourceStates.push({ point: target.point, state: actual });
  }
  const retainedFacade = [];
  for (const boundary of RETAINED_STEWARD_BOUNDARY) {
    const actual = await sourceAt(boundary.point);
    fail(actual === boundary.sourceState,
      `retained Steward boundary drift at ${cellKey(boundary.point)}: ${actual}`);
    retainedFacade.push({ point: boundary.point, state: actual });
  }
  const interaction = interactionHalo(TARGET_CELL_SET);
  const targetKeys = new Set(TARGET_CELL_SET.map(cellKey));
  const halo = interaction.filter((cell) => !targetKeys.has(cellKey(cell)));
  const haloHazards = [];
  for (const cell of halo) {
    const state = await sourceAt(cell);
    if (isFluid(state) || isGravity(state) || isProtectedState(state)) haloHazards.push({ cell, state });
  }
  fail(haloHazards.length === 0,
    `fluid/gravity/protected-core state in exact interaction halo: ${JSON.stringify(haloHazards)}`);
  const entities = await exactEntityAudit(reader, entityReader, interaction);
  fail(entities.blockEntities.length === 0 && entities.savedEntities.length === 0,
    `stored entity intersection: ${JSON.stringify(entities)}`);

  const forwardCells = TARGETS.slice().sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  const rollbackCells = forwardCells.slice().reverse();
  const forwardBody = `${forwardCells.map((target) => replLine(target.point, target.sourceState, target.replacement)).join('\n')}\n`;
  const rollbackBody = `${rollbackCells.map((target) => replLine(target.point, target.replacement, target.sourceState)).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const contractSha256 = sha256(contractBytes);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
  const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);

  const baseManifest = {
    schemaVersion: 1,
    releaseId: RELEASE_ID,
    transactionId: 'mp07-rrmsa-full-circulation-01',
    generatedAtUtc: GENERATED_AT,
    status: 'COMPILED_FROM_ACCEPTED_3D_INTERFACE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL',
    packages: [{ key: 'full-circulation', forward: relative(forwardPath), rollback: relative(rollbackPath) }],
    executionOrder: { forward: ['full-circulation'], rollback: ['full-circulation'] },
    source: {
      snapshotRoot: relative(SNAPSHOT),
      captureManifest: relative(capturePath),
      captureManifestSha256: sha256(fs.readFileSync(capturePath)),
      completePlanes: ['region', 'entities', 'poi', 'level.dat'],
      regionSnapshotSha256: sourceIdentity.sha256,
      regionFileCount: sourceIdentity.regionFileCount,
    },
    ownership: {
      contract: relative(CONTRACT),
      contractSha256,
      contractId: contract.contractId,
      acceptedAtUtc: contract.acceptedAtUtc,
      ownerApprovals: contract.approvals.ownerApprovals,
      targetCoordinateSetSha256: TARGET_COORDINATE_SHA256,
      allAndOnlyThreeTransferredCells: true,
      retainedStewardFacadeBoundary: { cells: exactSet(RETAINED_STEWARD_BOUNDARY.map(({ point }) => point)), states: retainedFacade },
    },
    target: {
      cells: exactSet(TARGET_CELL_SET),
      canonicalSourceStates: sourceStates,
      desiredState: 'minecraft:air',
      exactInverse: true,
      interactionHalo: exactSet(halo),
    },
    sourceSafety: {
      targetFluidGravityProtectedCount: 0,
      haloFluidGravityProtectedCount: haloHazards.length,
      storedBlockEntityIntersectionCount: entities.blockEntities.length,
      savedEntityIntersectionCount: entities.savedEntities.length,
      protectedCoreExclusion: true,
    },
    functionalAcceptance: {
      routeSurvey: relative(ROUTE_SURVEY),
      routeSurveySha256: sha256(routeSurveyBytes),
      sourceRouteIdentity: acceptedRoute.exactPathSha256,
      exactPathCells: acceptedRoute.exactPathCellCount,
      requiredForwardEdges: 48,
      requiredReverseEdges: 48,
      sourceEvidenceForwardPassed: acceptedRoute.forwardSegments.filter(({ passed }) => passed).length,
      sourceEvidenceReversePassed: acceptedRoute.reverseSegments.filter(({ passed }) => passed).length,
      targetsOutsideCanonicalFeetHeadSupport: true,
      postReleaseQaRequired: 'scripts/qa_mp07_rrmsa_full_circulation_independent_post.mjs must prove all 48 forward and 48 reverse exact paths plus zero below-three-wide cross-sections on the immutable post snapshot.',
    },
    operations: {
      forward: { path: relative(forwardPath), sha256: forwardSha256, commandCount: forwardCells.length },
      rollback: { path: relative(rollbackPath), sha256: rollbackSha256, commandCount: rollbackCells.length },
    },
    safetyBoundary: {
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      rconCalled: false,
      executionAuthorizedByThisManifest: false,
    },
    executionAuthority: {
      authorizedByThisArtifact: false,
      requiredBeforeExecution: [
        'fresh immutable source immediately before execution',
        'fresh accepted contract source-state/ownership binding',
        'fresh protected-core/block-entity and live-entity clearance',
        'strict-noop forward and rollback parser checks',
        'exact source and projected rollback preflight',
        'journalled strict execution',
        'fresh complete post snapshot and rollback preflight',
        'independent 48/48 bidirectional exact-path and zero-below-three-wide QA',
      ],
    },
  };
  const manifest = { ...baseManifest, manifestIdentity: sha256(`${JSON.stringify(baseManifest, null, 2)}\n`) };
  fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
  fs.writeFileSync(absolute(forwardPath), `${operationHeader('forward', SNAPSHOT, CONTRACT, contractSha256, forwardSha256)}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${operationHeader('rollback', SNAPSHOT, CONTRACT, contractSha256, rollbackSha256)}\n${rollbackBody}`);
  fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    releaseId: RELEASE_ID,
    forward: relative(forwardPath),
    rollback: relative(rollbackPath),
    manifest: relative(manifestPath),
    targetCells: manifest.target.cells,
    contractSha256,
    manifestIdentity: manifest.manifestIdentity,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  }, null, 2)}\n`);
}

await main();
