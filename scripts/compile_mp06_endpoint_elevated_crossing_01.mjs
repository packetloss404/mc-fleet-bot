#!/usr/bin/env node
/**
 * Compile MP06-ENDPOINT-ELEVATED-CROSSING-01 from a complete immutable source.
 *
 * The endpoint study deliberately does not choose a bridge.  This compiler is
 * therefore contract-first and fail-closed: it will never turn the surveyed
 * 117-cell air gap into a deck unless an independently accepted exact 3-D
 * contract supplies the complete bridge, its non-deck systems, and projected
 * normal-walk proof for both the upper and lower routes.
 *
 * It performs no capture, RCON, fleet, or world action.  A compiled package is
 * still only an offline artifact and is not execution authority.
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
const RELEASE_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01';
const CONTRACT_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT';
const CONTRACT_STATUS = 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT';
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
const stateName = (state) => String(state).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:chiseled_bookshelf', 'minecraft:beacon', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:bell',
]);
// Roles describe verified design responsibilities, not necessarily separate
// blocks. A deck cell may also be an abutment/structural or cap-transition
// cell. This prevents the compiler from demanding fake side supports merely
// to satisfy a schema.
const REQUIRED_OPERATION_ROLES = new Set([
  'deck', 'cap-transition', 'structure', 'edge-safety', 'lighting',
]);
const gap = { minX: -264, maxX: -252, y: 71, minZ: -501, maxZ: -493 };
const lowerClearway = { minX: gap.minX, maxX: gap.maxX, minY: 68, maxY: 70, minZ: gap.minZ, maxZ: gap.maxZ };
const deckCells = [];
const lowerClearwayCells = [];
for (let x = gap.minX; x <= gap.maxX; x += 1) {
  for (let z = gap.minZ; z <= gap.maxZ; z += 1) {
    deckCells.push({ x, y: gap.y, z });
    for (let y = lowerClearway.minY; y <= lowerClearway.maxY; y += 1) lowerClearwayCells.push({ x, y, z });
  }
}
const DECK_HASH = hashCells(deckCells);
const LOWER_CLEARWAY_HASH = hashCells(lowerClearwayCells);

const SNAPSHOT = option('--snapshot');
const CONTRACT = option('--contract');
const OUT_DIR = option('--out-dir', 'data/buildops');
const BASENAME = option('--basename', 'mp06-endpoint-elevated-crossing-01-static');
const GENERATED_AT = option('--generated-at', '1970-01-01T00:00:00Z');

function toPoint(raw, label) {
  fail(Array.isArray(raw) && raw.length === 3 && raw.every(Number.isInteger), `${label} must be an integer [x,y,z] point`);
  return { x: raw[0], y: raw[1], z: raw[2] };
}

function sameSet(left, right) {
  return hashCells(left) === hashCells(right) && uniqueCells(left).length === uniqueCells(right).length;
}

function isAir(state) {
  return AIR.has(stateName(state));
}

function isFluid(state) {
  return FLUID.has(stateName(state)) || String(state).includes('waterlogged=true');
}

function isForbidden(state) {
  return FORBIDDEN.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
}

function isInside(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX
    && point.y >= bounds.minY && point.y <= bounds.maxY
    && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

function operationHeader(direction, source, contractPath, contractSha256, bodySha256) {
  return [
    `# GENERATED FILE — ${RELEASE_ID} (${direction})`,
    `# immutable offline source: ${relative(source)}`,
    `# accepted exact 3-D bridge contract: ${relative(contractPath)}`,
    `# contract SHA-256: ${contractSha256}`,
    '# NOT AUTHORIZED FOR EXECUTION: fresh source, acceptance, and complete guarded kernel required.',
    `# operation SHA-256: ${bodySha256}`,
  ].join('\n');
}

function assertContract(contract, sourceRegion, sourceIdentity, capturePath) {
  fail(contract?.schemaVersion === 1, 'contract schemaVersion must be 1');
  fail(contract.contractId === CONTRACT_ID, `contractId must be ${CONTRACT_ID}`);
  fail(contract.status === CONTRACT_STATUS, `contract status must be ${CONTRACT_STATUS}`);
  fail(contract.mutationAuthorityGranted === false,
    'contract may establish a reviewed design but may not authorize execution');
  fail(typeof contract.acceptedAtUtc === 'string' && contract.acceptedAtUtc.length > 0,
    'accepted contract lacks acceptedAtUtc');
  fail(Array.isArray(contract.approvals?.ownerApprovals) && contract.approvals.ownerApprovals.length >= 2,
    'accepted contract lacks at least two named owner approvals');

  const source = contract.sourceSnapshot;
  fail(source?.algorithm === 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
    'source snapshot does not declare the canonical region identity algorithm');
  fail(source.sha256 === sourceIdentity.sha256, 'contract source region SHA-256 does not match this snapshot');
  fail(source.regionFileCount === sourceIdentity.regionFileCount,
    'contract source region file count does not match this snapshot');
  fail(path.resolve(ROOT, source.directory) === sourceRegion,
    'contract source directory is not this exact snapshot region');
  fail(path.resolve(ROOT, source.completeSaveCapture) === capturePath,
    'contract complete-save capture is not this exact immutable source');

  const operations = contract.operations;
  fail(Array.isArray(operations) && operations.length > 0,
    'missing exact operations: source cannot derive palette, structural, drainage, or lighting target states');
  const normalized = operations.map((operation, index) => {
    const point = toPoint(operation.point, `operations[${index}].point`);
    fail(typeof operation.sourceState === 'string' && operation.sourceState.startsWith('minecraft:'),
      `operations[${index}] lacks canonical sourceState`);
    fail(typeof operation.targetState === 'string' && operation.targetState.startsWith('minecraft:'),
      `operations[${index}] lacks exact targetState; the source cannot choose it`);
    fail(Array.isArray(operation.roles) && operation.roles.length > 0,
      `operations[${index}] requires one or more exact design roles`);
    const roles = [...new Set(operation.roles)];
    fail(roles.length === operation.roles.length && roles.every((role) => REQUIRED_OPERATION_ROLES.has(role)),
      `operations[${index}] has an unrecognized or duplicated role`);
    fail(operation.sourceState !== operation.targetState, `operations[${index}] is a prohibited no-op`);
    fail(!isFluid(operation.targetState) && !isAir(operation.targetState) && !isForbidden(operation.targetState),
      `operations[${index}] targetState is not an allowed dry structural/finish state`);
    return { point, sourceState: operation.sourceState, targetState: operation.targetState, roles };
  });
  const cells = normalized.map(({ point }) => point);
  fail(uniqueCells(cells).length === cells.length, 'operations contain duplicate coordinates');
  for (const operation of normalized) {
    fail(!isInside(operation.point, lowerClearway),
      `operation ${cellKey(operation.point)} intrudes on protected lower y=68..70 clearway`);
  }

  const byRole = new Map([...REQUIRED_OPERATION_ROLES]
    .map((role) => [role, normalized.filter((operation) => operation.roles.includes(role))]));
  for (const role of REQUIRED_OPERATION_ROLES) fail(byRole.get(role).length > 0, `missing exact ${role} cells; bare deck fill is prohibited`);
  const deck = byRole.get('deck');
  fail(deck.length === deckCells.length && sameSet(deck.map(({ point }) => point), deckCells),
    'deck role must be all and only the 117-cell x=-264..-252, y=71, z=-501..-493 span');
  fail(new Set(deck.map(({ targetState }) => targetState)).size === 1,
    'deck palette must be one exact canonical state, not a source-derived guess');

  const ownership = contract.ownership;
  fail(ownership?.scopeId === 'TE-REGIONAL-APPROACH-ROAD', 'contract does not bind the MP06 road owner');
  fail(ownership?.operationCoordinateSetSha256 === hashCells(cells),
    'ownership does not bind all and only exact operation coordinates');
  const ownershipCells = (ownership?.operationCells ?? []).map((raw, index) => toPoint(raw, `ownership.operationCells[${index}]`));
  fail(sameSet(ownershipCells, cells), 'ownership operationCells are not all and only the exact operation set');
  fail(ownership?.protectedLowerClearwayCoordinateSetSha256 === LOWER_CLEARWAY_HASH,
    'ownership does not bind the full protected lower-road clearway');

  const design = contract.design;
  fail(typeof design?.palette?.deckState === 'string' && design.palette.deckState === deck[0].targetState,
    'palette deckState is absent or does not bind the exact deck target state');
  for (const field of ['capTransition', 'structural', 'lighting']) {
    fail(design?.[field]?.coordinateSetSha256 === hashCells(byRole.get(
      field === 'capTransition' ? 'cap-transition' : field === 'structural' ? 'structure' : field,
    ).map(({ point }) => point)), `design.${field} is absent or is not hash-bound to its exact cells`);
  }
  fail(design.edgeSafety?.coordinateSetSha256 === hashCells(byRole.get('edge-safety').map(({ point }) => point)),
    'design.edgeSafety is absent or is not hash-bound to exact cells');
  const drainage = design?.drainage;
  fail(drainage?.mode === 'DRY_NO_FLUID_NO_WATERLOGGED_NO_DISCHARGE',
    'drainage must explicitly declare dry/no-fluid/no-waterlogged/no-discharge mode');
  fail(drainage.targetCellCount === 0 && drainage.targetCoordinateSetSha256 === hashCells([]),
    'dry drainage invariant must bind an exact zero-cell target set');
  fail(Array.isArray(drainage.dischargeCells) && drainage.dischargeCells.length === 0,
    'dry drainage invariant must not invent a discharge');
  fail(drainage.noFluidIngress === true && drainage.noWaterloggedBlocks === true && drainage.noDischarge === true,
    'dry drainage invariant lacks no-fluid/no-waterlogged/no-discharge guarantees');
  const sideSupport = design?.structural?.sideSupport;
  fail(sideSupport?.mode === 'NONE_REQUIRED_DECK_IS_STRUCTURAL',
    'structural design must explicitly say whether side supports are absent');
  fail(sideSupport.targetCellCount === 0 && sideSupport.targetCoordinateSetSha256 === hashCells([]),
    'zero side-support invariant must bind an exact zero-cell target set');
  fail(Array.isArray(design.lighting?.fixtureCells) && design.lighting.fixtureCells.length > 0,
    'lighting has no exact fixture cells');

  const binding = contract.operationBinding;
  fail(binding?.releaseId === RELEASE_ID, 'operationBinding releaseId mismatch');
  fail(binding.exactInverseRequired === true, 'operationBinding does not require exact inverse');
  fail(binding.targetCoordinateSetSha256 === hashCells(cells),
    'operationBinding does not bind the exact full operation set');
  const bindingCells = (binding.cells ?? []).map((entry, index) => ({
    point: toPoint(entry.point, `operationBinding.cells[${index}].point`),
    sourceState: entry.fromState,
    targetState: entry.toState,
  })).sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  const expectedBinding = normalized.map(({ point, sourceState, targetState }) => ({ point, sourceState, targetState }))
    .sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  fail(JSON.stringify(bindingCells) === JSON.stringify(expectedBinding),
    'operationBinding cells are not an exact state-for-state inverse binding');
  return { normalized, byRole };
}

function assertProjectedRoute(route, label, finalStateAt) {
  fail(route?.standard === 'NORMAL_WALK_NO_JUMP_NO_SPRINT_NO_DIG_NO_TOWER', `${label} lacks strict normal-walk standard`);
  fail(Array.isArray(route.forward) && Array.isArray(route.reverse) && route.forward.length >= 2 && route.reverse.length >= 2,
    `${label} lacks exact forward and reverse route points`);
  const validate = (rawPath, direction) => {
    const path = rawPath.map((point, index) => toPoint(point, `${label}.${direction}[${index}]`));
    for (let index = 0; index < path.length; index += 1) {
      const feet = path[index];
      const floor = { x: feet.x, y: feet.y - 1, z: feet.z };
      fail(!isAir(finalStateAt(floor)) && !isFluid(finalStateAt(floor)), `${label}.${direction} lacks dry floor at ${cellKey(floor)}`);
      fail(isAir(finalStateAt(feet)) && isAir(finalStateAt({ x: feet.x, y: feet.y + 1, z: feet.z })),
        `${label}.${direction} lacks two-block dry headroom at ${cellKey(feet)}`);
      if (index > 0) {
        const previous = path[index - 1];
        const dx = Math.abs(feet.x - previous.x);
        const dy = Math.abs(feet.y - previous.y);
        const dz = Math.abs(feet.z - previous.z);
        fail(dx + dz === 1 && dy <= 1, `${label}.${direction} has non-normal-walk step ${cellKey(previous)} -> ${cellKey(feet)}`);
      }
    }
    return path;
  };
  const forward = validate(route.forward, 'forward');
  const reverse = validate(route.reverse, 'reverse');
  fail(JSON.stringify(reverse) === JSON.stringify(forward.slice().reverse()), `${label} reverse is not the exact forward inverse`);
  return forward;
}

async function main() {
  fail(SNAPSHOT, '--snapshot is required');
  fail(CONTRACT, '--contract is required; current source has no accepted exact 3-D bridge contract');
  const snapshotRoot = absolute(SNAPSHOT);
  const sourceRegion = path.join(snapshotRoot, 'region');
  const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
  const contractPath = absolute(CONTRACT);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    fail(fs.existsSync(path.join(snapshotRoot, member)), `complete immutable source missing ${member}`);
  }
  fail(fs.existsSync(contractPath), `accepted contract not found: ${CONTRACT}`);
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  fail(capture.immutableCopy === true, 'source capture is not immutable');
  const sourceIdentity = hashSnapshotDirectory(sourceRegion);
  const contractBytes = fs.readFileSync(contractPath);
  const contract = JSON.parse(contractBytes);
  const { normalized } = assertContract(contract, sourceRegion, sourceIdentity, capturePath);

  const reader = new AnvilReader(sourceRegion);
  const stateCache = new Map();
  const sourceAt = async (point) => {
    const key = cellKey(point);
    if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
    return stateCache.get(key);
  };
  for (const operation of normalized) {
    const actual = await sourceAt(operation.point);
    fail(actual === operation.sourceState,
      `source state drift at ${cellKey(operation.point)}: ${actual}, expected ${operation.sourceState}`);
    fail(!isFluid(actual) && !isForbidden(actual), `source target is fluid/container/control at ${cellKey(operation.point)}`);
  }
  for (const clearway of lowerClearwayCells) {
    const state = await sourceAt(clearway);
    if (clearway.y === 68) fail(state === 'minecraft:gray_concrete', `lower road floor drift at ${cellKey(clearway)}: ${state}`);
    else fail(isAir(state), `lower road clearance drift at ${cellKey(clearway)}: ${state}`);
  }
  const targetByCell = new Map(normalized.map((operation) => [cellKey(operation.point), operation.targetState]));
  const finalStateAt = (point) => targetByCell.get(cellKey(point)) ?? stateCache.get(cellKey(point));
  // Populate source state only for route-dependent coordinates before validating it.
  const routes = contract.projectedDualLevelRouteProof;
  fail(routes?.sourceRegionSha256 === sourceIdentity.sha256, 'dual-level route proof is not bound to this source');
  for (const route of [routes?.elevated, routes?.lower]) {
    for (const pathPoints of [route?.forward, route?.reverse]) {
      fail(Array.isArray(pathPoints), 'dual-level route proof has no exact path');
      for (const raw of pathPoints) {
        const feet = toPoint(raw, 'route point');
        for (const point of [{ x: feet.x, y: feet.y - 1, z: feet.z }, feet, { x: feet.x, y: feet.y + 1, z: feet.z }]) await sourceAt(point);
      }
    }
  }
  const elevated = assertProjectedRoute(routes.elevated, 'elevated route', finalStateAt);
  const lower = assertProjectedRoute(routes.lower, 'lower route', finalStateAt);
  fail(elevated.some(({ x }) => x <= -265) && elevated.some(({ x }) => x >= -251),
    'elevated route does not prove both cap endpoints');
  fail(lower.some(({ x, y, z }) => x >= gap.minX && x <= gap.maxX && y === 69 && z >= gap.minZ && z <= gap.maxZ),
    'lower route does not prove passage below the complete span');

  const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
  const operationKeys = new Set(normalized.map(({ point }) => cellKey(point)));
  const storedEntities = [];
  for (const chunkKey of new Set(normalized.map(({ point }) => `${Math.floor(point.x / 16)},${Math.floor(point.z / 16)}`))) {
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const blockChunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (operationKeys.has(cellKey(point))) storedEntities.push({ kind: 'block', point });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const point = { x: Math.floor(Number(entity.Pos[0])), y: Math.floor(Number(entity.Pos[1])), z: Math.floor(Number(entity.Pos[2])) };
      if (operationKeys.has(cellKey(point))) storedEntities.push({ kind: 'saved', point });
    }
  }
  fail(storedEntities.length === 0, `stored block/entity intersection: ${JSON.stringify(storedEntities)}`);

  const forward = normalized.slice().sort((left, right) => cellKey(left.point).localeCompare(cellKey(right.point)));
  const rollback = forward.slice().reverse();
  const forwardBody = `${forward.map((operation) => replLine(operation.point, operation.sourceState, operation.targetState)).join('\n')}\n`;
  const rollbackBody = `${rollback.map((operation) => replLine(operation.point, operation.targetState, operation.sourceState)).join('\n')}\n`;
  const contractSha256 = sha256(contractBytes);
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
  const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
  const bareManifest = {
    schemaVersion: 1,
    releaseId: RELEASE_ID,
    generatedAtUtc: GENERATED_AT,
    status: 'COMPILED_FROM_ACCEPTED_EXACT_3D_BRIDGE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL',
    source: { snapshotRoot: relative(SNAPSHOT), captureManifest: relative(capturePath), regionSnapshotSha256: sourceIdentity.sha256, regionFileCount: sourceIdentity.regionFileCount },
    ownership: { contract: relative(CONTRACT), contractSha256, operationCoordinateSetSha256: hashCells(normalized.map(({ point }) => point)), protectedLowerClearwayCoordinateSetSha256: LOWER_CLEARWAY_HASH },
    target: { cells: { cellCount: normalized.length, bounds: boundsOf(normalized.map(({ point }) => point)), coordinateSetSha256: hashCells(normalized.map(({ point }) => point)) }, deck: { cellCount: deckCells.length, coordinateSetSha256: DECK_HASH }, exactInverse: true },
    invariants: { lowerRoadFloor: 'all 117 y=68 cells remain minecraft:gray_concrete', lowerRoadClearway: 'all 234 y=69..70 cells remain dry air', bareDeckFillRejected: true },
    functionalAcceptance: { projectedElevatedNormalWalkStations: elevated.length, projectedLowerNormalWalkStations: lower.length, postReleaseDualLevelQaRequired: true },
    operations: { forward: { path: relative(forwardPath), sha256: forwardSha256, commandCount: forward.length }, rollback: { path: relative(rollbackPath), sha256: rollbackSha256, commandCount: rollback.length } },
    safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, rconCalled: false, executionAuthorizedByThisManifest: false },
    executionAuthority: { authorizedByThisArtifact: false, requiredBeforeExecution: ['fresh complete immutable source and renewed exact contract', 'block-entity/protected-core and live-entity clearance', 'strict-noop parser and exact source/projected inverse preflight', 'journaled strict execution', 'fresh post snapshot, rollback preflight, and independent dual-level route QA'] },
  };
  const manifest = { ...bareManifest, manifestIdentity: sha256(`${JSON.stringify(bareManifest, null, 2)}\n`) };
  fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
  fs.writeFileSync(absolute(forwardPath), `${operationHeader('forward', SNAPSHOT, CONTRACT, contractSha256, forwardSha256)}\n${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${operationHeader('rollback', SNAPSHOT, CONTRACT, contractSha256, rollbackSha256)}\n${rollbackBody}`);
  fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ status: manifest.status, manifest: relative(manifestPath), forward: relative(forwardPath), rollback: relative(rollbackPath), liveCallsPerformed: false, worldEditsPerformed: false }, null, 2)}\n`);
}

await main();
