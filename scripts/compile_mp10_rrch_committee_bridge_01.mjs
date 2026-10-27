#!/usr/bin/env node
/**
 * Compile MP10-RRCH-COMMITTEE-BRIDGE-01 from a retained immutable snapshot.
 *
 * The Committee Room's two normal-walk components are split by the accepted
 * table/chairs at y=77.  This package adds a dry, level, one-person bridge
 * deck at y=76 through otherwise unused interior void.  It deliberately does
 * not touch the table, chairs, legacy fixtures, the x=-92 partition, or the
 * accepted upper spine.  This is an OFFLINE design compiler: a fresh live
 * source capture and the complete guarded release kernel are mandatory before
 * any execution.
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

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-moot-upper-post-20260824T161200Z');
const ENTITIES = value('--entities', path.join(SNAPSHOT, 'entities'));
const SOURCE_CLASSIFICATION = value('--source-classification', 'historical-retained');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp10-rrch-committee-bridge-01-historical-20260824');
const GENERATED_AT = value('--generated-at', '2026-08-26T06:30:00Z');
const RELEASE_ID = 'MP10-RRCH-COMMITTEE-BRIDGE-01';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const BLOCK_ENTITY_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon',
  'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(stateName(state));
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const isBlockEntityName = (state) => BLOCK_ENTITY_NAMES.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
const manifestCells = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
/* A static candidate is not safe merely because its block plane is clear.
 * Require the matching immutable entities plane before accepting the bridge:
 * a parked mob, armour stand, or item entity in the deck/halo is an execution
 * hazard that must not be deferred or silently treated as live-only evidence.
 */
fail(fs.existsSync(absolute(ENTITIES)),
  `immutable entities plane missing: ${ENTITIES}; cannot prove saved-entity clearance`);
const entityReader = new AnvilReader(absolute(ENTITIES));
fail(['historical-retained', 'complete-fresh'].includes(SOURCE_CLASSIFICATION),
  `unknown source classification: ${SOURCE_CLASSIFICATION}`);
const completeFreshSource = SOURCE_CLASSIFICATION === 'complete-fresh';
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) {
    sourceCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return sourceCache.get(key);
};

/* The verified level bridge begins at the west component (-90,77,-357), runs
 * north around the furnished table, crosses the dry y76 void, and rejoins the
 * east component at (-81,77,-357).  Every deck cell is at y76, so the actual
 * walking plane is y77 with two clear body cells y77/y78 and no grade change.
 */
const BRIDGE_CELLS = [
  [-90, -358], [-90, -359], [-90, -360], [-90, -361],
  [-89, -362], [-88, -362], [-87, -362], [-86, -362], [-85, -362], [-84, -362], [-83, -362],
  [-83, -361], [-83, -360], [-81, -358],
].map(([x, z]) => ({ x, y: 76, z }));
const ROUTE = [
  [-90, -357], [-90, -358], [-90, -359], [-90, -360], [-90, -361], [-90, -362],
  [-89, -362], [-88, -362], [-87, -362], [-86, -362], [-85, -362], [-84, -362], [-83, -362],
  [-83, -361], [-83, -360], [-83, -359], [-82, -359], [-81, -359], [-81, -358], [-81, -357],
].map(([x, z]) => ({ x, y: 77, z }));
const PROTECTED = [
  { cell: { x: -92, y: 74, z: -354 }, role: 'partition-wall-plane (x=-92, no targets permitted)' },
  { cell: { x: -89, y: 75, z: -360 }, role: 'lectern block entity retained; diagonally adjacent to bridge' },
  { cell: { x: -97, y: 75, z: -360 }, role: 'chiseled bookshelf retained outside bridge envelope' },
  { cell: { x: -87, y: 77, z: -357 }, role: 'accepted committee table retained' },
  { cell: { x: -88, y: 77, z: -357 }, role: 'accepted committee chair retained' },
  { cell: { x: -84, y: 77, z: -357 }, role: 'accepted committee chair retained' },
];
const targetKeys = new Set(BRIDGE_CELLS.map(cellKey));
fail(BRIDGE_CELLS.length === 14, `expected 14 bridge deck cells, got ${BRIDGE_CELLS.length}`);
fail(new Set(BRIDGE_CELLS.map(cellKey)).size === BRIDGE_CELLS.length, 'duplicate bridge target');
for (const cell of BRIDGE_CELLS) {
  fail(cell.x >= -91 && cell.x <= -71 && cell.y === 76 && cell.z >= -366 && cell.z <= -342,
    `target outside owned Committee Room interior: ${cellKey(cell)}`);
  fail(cell.x !== -92, `partition target forbidden: ${cellKey(cell)}`);
}

const records = [];
for (const cell of BRIDGE_CELLS) {
  const sourceState = await sourceAt(cell);
  const belowState = await sourceAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  const feetState = await sourceAt({ x: cell.x, y: cell.y + 1, z: cell.z });
  const headState = await sourceAt({ x: cell.x, y: cell.y + 2, z: cell.z });
  fail(isAir(sourceState), `target must be exact air: ${cellKey(cell)} = ${sourceState}`);
  fail(isAir(belowState), `bridge void must stay clear of legacy fixture/support: below ${cellKey(cell)} = ${belowState}`);
  fail(isAir(feetState) && isAir(headState), `two-block route headroom missing above ${cellKey(cell)}: ${feetState}; ${headState}`);
  fail(!isFluid(sourceState) && !isFluid(belowState) && !isFluid(feetState) && !isFluid(headState),
    `fluid near bridge target ${cellKey(cell)}`);
  fail(!isBlockEntityName(sourceState) && !isBlockEntityName(belowState),
    `container/control target interface ${cellKey(cell)}`);
  records.push({ cell, sourceState, targetState: 'minecraft:polished_deepslate' });
}

const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
let haloFluidCount = 0;
const nearbyBlockEntities = [];
for (const cell of halo) {
  const state = await sourceAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (isBlockEntityName(state)) nearbyBlockEntities.push({ cell, state });
}
fail(haloFluidCount === 0, `fluid in bridge interaction halo: ${haloFluidCount}`);
/* A protected lectern is intentionally adjacent to the deck at -89,75,-360;
 * its state is retained and it is not a target.  Any other block entity in
 * the halo fails closed. */
const unreviewedBlockEntities = nearbyBlockEntities.filter(({ cell }) => !(
  cell.x === -89 && cell.y === 75 && cell.z === -360
));
fail(unreviewedBlockEntities.length === 0,
  `unreviewed block entity in bridge halo: ${JSON.stringify(unreviewedBlockEntities)}`);

/* Inspect stored block-entity records rather than inferring safety solely
 * from block names.  The only permitted record is the explicitly retained
 * lectern; no target may contain a record and no other halo record is safe.
 */
const interaction = uniqueCells([...BRIDGE_CELLS, ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunkKeys = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const storedBlockEntities = [];
const savedEntities = [];
for (const chunkKey of chunkKeys) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionKeys.has(cellKey(cell))) storedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    const cell = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [x, y, z] });
  }
}
const unreviewedStoredBlockEntities = storedBlockEntities.filter(({ cell }) => !(
  cell.x === -89 && cell.y === 75 && cell.z === -360
));
fail(unreviewedStoredBlockEntities.length === 0,
  `unreviewed stored block entity in bridge envelope: ${JSON.stringify(unreviewedStoredBlockEntities)}`);
fail(savedEntities.length === 0,
  `saved entity in bridge envelope: ${JSON.stringify(savedEntities)}`);

function passable(state) {
  const name = stateName(state);
  return AIR.has(name) || name === 'minecraft:light' || name.endsWith('_carpet')
    || name.endsWith('_torch') || name.endsWith('_sign');
}
function safeFooting(state) {
  const name = stateName(state);
  return !passable(state) && !FLUID.has(name) && !name.endsWith('_wall')
    && !name.endsWith('_fence') && !name.endsWith('_pane');
}
const overlay = new Map(records.map(({ cell, targetState }) => [cellKey(cell), targetState]));
const projectedAt = async (cell) => overlay.get(cellKey(cell)) ?? sourceAt(cell);
const routeChecks = [];
for (let i = 0; i < ROUTE.length; i += 1) {
  const point = ROUTE[i];
  const feet = await projectedAt(point);
  const head = await projectedAt({ x: point.x, y: point.y + 1, z: point.z });
  const support = await projectedAt({ x: point.x, y: point.y - 1, z: point.z });
  fail(passable(feet) && passable(head) && safeFooting(support),
    `projected normal-walk station invalid at ${cellKey(point)}: feet=${feet}; head=${head}; support=${support}`);
  if (i > 0) {
    const prior = ROUTE[i - 1];
    const horizontal = Math.abs(point.x - prior.x) + Math.abs(point.z - prior.z);
    fail(horizontal === 1 && point.y === prior.y,
      `route has jump/sprint/diagonal transition ${cellKey(prior)} -> ${cellKey(point)}`);
  }
  routeChecks.push({ cell: point, feet, head, support });
}
for (const protectedCell of PROTECTED) {
  fail(!targetKeys.has(cellKey(protectedCell.cell)), `protected cell targeted: ${protectedCell.role}`);
}

const ordered = records.slice().sort((a, b) => a.cell.z - b.cell.z || a.cell.x - b.cell.x);
const rollback = ordered.slice().reverse().map(({ cell, sourceState, targetState }) => ({
  cell, sourceState: targetState, targetState: sourceState,
}));
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${rollback.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = `data/buildops/${BASENAME}.forward.txt`;
const reverse = `data/buildops/${BASENAME}.rollback.txt`;
const manifestPath = `data/buildops/${BASENAME}.release-manifest.json`;
const header = (role, hash) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# ${completeFreshSource ? 'COMPLETE FRESH SOURCE' : 'HISTORICAL OFFLINE SOURCE ONLY'}: ${SNAPSHOT}`,
  `# NOT AUTHORIZED FOR EXECUTION: ${completeFreshSource ? 'live entity clearance and remaining full guarded kernel' : 'fresh live source, entity clearance, and full guarded kernel'} required.`,
  `# operation SHA-256: ${hash}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(reverse), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: 'mp10-rrch-committee-bridge-01',
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: completeFreshSource
    ? 'COMPILED_FROM_COMPLETE_FRESH_SOURCE_AWAITING_LIVE_KERNEL'
    : 'OFFLINE_HISTORICAL_SOURCE_COMPILED_FRESH_LIVE_CAPTURE_REQUIRED',
  source: { snapshotRoot: SNAPSHOT, historicalOnly: !completeFreshSource, completeFresh: completeFreshSource },
  executionAuthority: {
    authorizedByThisArtifact: false,
    requiredBeforeExecution: [
      'fresh immutable live source snapshot', 'fresh block-entity/container and protected-interface audit',
      'fresh live-entity clearance', 'strict-noop parser forward/rollback checks',
      'exact source preflight', 'journalled execution', 'fresh post snapshot',
      'rollback post-state preflight', 'independent normal-walk route QA',
    ],
  },
  ownership: {
    owner: 'RAVENSREACH / RRCH-MOOT Committee Room interior',
    interiorBounds: { minX: -91, maxX: -71, minY: 74, maxY: 77, minZ: -366, maxZ: -342 },
    partitionAndSpineExcluded: 'x=-92 and all x<=-92',
  },
  target: {
    bridgeDeck: manifestCells(BRIDGE_CELLS),
    desiredState: 'minecraft:polished_deepslate',
    interactionHalo: manifestCells(halo),
    sourceStateCensus: { 'minecraft:air': records.length },
    exactInverse: true,
  },
  interfaces: {
    haloFluidCount,
    adjacentBlockEntitiesReviewed: nearbyBlockEntities,
    unreviewedBlockEntityCount: unreviewedBlockEntities.length,
    storedBlockEntities,
    unreviewedStoredBlockEntityCount: unreviewedStoredBlockEntities.length,
    savedEntities,
    savedEntityCount: savedEntities.length,
    protectedRetained: PROTECTED,
  },
  routeAcceptance: {
    standard: 'single-level normal walking only; no jump, sprint, dig, swim, or climb',
    route: { start: ROUTE[0], end: ROUTE.at(-1), stationCount: ROUTE.length, stations: ROUTE },
    maxVerticalDelta: 0,
    allStationsHaveTwoClearBodyBlocks: true,
    virtualResult: 'PASS',
  },
  operations: {
    forward: { path: forward, sha256: forwardSha256, commandCount: ordered.length },
    rollback: { path: reverse, sha256: rollbackSha256, commandCount: rollback.length },
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  releaseId: RELEASE_ID,
  forward, rollback: reverse, manifest: manifestPath, manifestIdentity,
  targetCells: records.length, routeStations: ROUTE.length, haloFluidCount,
  reviewedAdjacentBlockEntities: nearbyBlockEntities.length,
  virtualRoute: manifestWithoutIdentity.routeAcceptance.virtualResult,
}, null, 2));
