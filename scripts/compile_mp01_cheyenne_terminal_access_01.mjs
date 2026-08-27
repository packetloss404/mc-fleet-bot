#!/usr/bin/env node
/**
 * Compile MP01-CHEYENNE-TERMINAL-ACCESS-01.
 *
 * A useful first chamber/terminal component: a restricted, staff-operated
 * arrival vestibule behind B03's retained cap, a 5x5 common spine, two
 * independently gated protected-direction reservations, and an unpowered
 * physical lift analogue. It is intentionally not public access, egress,
 * secure commissioning, or a chamber completion claim.
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
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 terminal-access compiler rejected: ${message}`);
};
const cellRange = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};
const nameOf = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']
  .includes(nameOf(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg',
  'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isGravity = (state) => GRAVITY.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(nameOf(state)) || nameOf(state).endsWith('_shulker_box');
const census = (records, field) => Object.fromEntries([...records.reduce((result, record) => {
  const item = record[field]; result.set(item, (result.get(item) ?? 0) + 1); return result;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};

const SNAPSHOT = required('--snapshot');
const SURVEY = required('--survey');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp01-cheyenne-terminal-access-01');
const GENERATED_AT = value('--generated-at', new Date().toISOString());
const survey = readJson(SURVEY);
fail(survey.status === 'CURRENT_SOURCE_SURVEY_COMPLETE_NOT_A_RELEASE', 'supplied survey is not a completed current-source survey');
fail(survey.source.worldRoot === SNAPSHOT, 'survey is bound to a different snapshot root');
fail(survey.releaseReadiness?.safeCurrentSource === true, 'survey does not clear the dry terminal source');
fail(survey.geometry?.retainedB03Cap?.stateCensus?.['minecraft:stone'] === 20,
  'retained B03 cap is not exact stone before compilation');

const reader = new AnvilReader(path.join(absolute(SNAPSHOT), 'region'));
const entityReader = new AnvilReader(path.join(absolute(SNAPSHOT), 'entities'));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key,
    stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return sourceCache.get(key);
};

const desired = new Map();
const roles = new Map();
const add = (cell, toState, role) => {
  const key = cellKey(cell);
  if (desired.has(key)) {
    const previousRole = roles.get(key);
    fail(previousRole === 'clear-restricted-circulation',
      `duplicate desired state at ${key} (${previousRole} / ${role})`);
    // A fixture deliberately replaces a planned air cell in a circulation
    // volume; only this one explicit replacement is permitted.
    desired.delete(key); roles.delete(key);
  }
  desired.set(key, { cell, toState }); roles.set(key, role);
};

// 5x5, four-clear-high primary restricted spine.  The eastern 4 blocks are
// a vestibule; the cap changes as part of the complete terminal programme,
// never by itself.  The western five blocks are the common landing.
const vestibule = cellRange(2044, 2047, 166, 169, -870, -866);
const commonSpine = cellRange(2038, 2042, 166, 169, -870, -866);
const northDirection = cellRange(2038, 2042, 166, 169, -877, -871);
const southDirection = cellRange(2038, 2042, 166, 169, -865, -859);
const clearVolumes = uniqueCells([...vestibule, ...commonSpine, ...northDirection, ...southDirection]);
for (const cell of clearVolumes) add(cell, 'minecraft:air', 'clear-restricted-circulation');

// Gated interfaces: main arrival gate plus one gate at each protected
// direction. These are manually operable staff gates, so the restricted route
// remains usable without claiming an active security system.
const doors = [];
const addDoor = (x, z, facing, role) => {
  const gate = { x, y: 166, z };
  doors.push(gate);
  add(gate, `minecraft:spruce_fence_gate[facing=${facing},in_wall=false,open=false,powered=false]`, role);
};
for (const z of [-869, -868, -867]) addDoor(2043, z, 'east', 'arrival-controlled-door');
for (const x of [2039, 2040, 2041]) addDoor(x, -872, 'north', 'north-protected-door');
for (const x of [2039, 2040, 2041]) addDoor(x, -864, 'south', 'south-protected-door');

// Durable non-powered lift analogue within the north protected direction:
// a static iron frame, counterweight spine, and platform. It deliberately
// makes no active-mechanism, transport, or rescue claim. Full-state solid
// blocks are used instead of connecting blocks so parser and rollback state
// identities cannot drift when neighbouring cells change.
const liftFloor = cellRange(2039, 2041, 165, 165, -876, -874);
for (const cell of liftFloor) add(cell, 'minecraft:polished_blackstone_bricks', 'lift-analogue-platform');
for (let y = 166; y <= 169; y += 1) {
  for (const [x, z] of [[2039, -876], [2039, -874], [2041, -876], [2041, -874]]) {
    add({ x, y, z }, 'minecraft:iron_block', 'lift-analogue-cage');
  }
}
for (let y = 166; y <= 169; y += 1) add({ x: 2040, y, z: -877 }, 'minecraft:polished_blackstone', 'lift-analogue-counterweight');

// Lighting mounted in the unoccupied ceiling, never in route headroom.
for (const cell of [
  { x: 2045, y: 170, z: -868 }, { x: 2040, y: 170, z: -868 },
  { x: 2040, y: 170, z: -875 }, { x: 2040, y: 170, z: -861 },
]) add(cell, 'minecraft:sea_lantern', 'terminal-lighting');

const records = [];
for (const { cell, toState } of desired.values()) {
  const sourceState = await sourceAt(cell);
  fail(!isFluid(sourceState) && !isGravity(sourceState) && !isForbidden(sourceState),
    `target source hazard at ${cellKey(cell)}: ${sourceState}`);
  fail(sourceState !== toState, `target already at desired state ${cellKey(cell)}: ${toState}`);
  records.push({ cell, toState, sourceState, role: roles.get(cellKey(cell)) });
}

const targetCells = records.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const halo = uniqueCells(targetCells.flatMap(({ x, y, z }) => [
  { x: x - 1, y, z }, { x: x + 1, y, z }, { x, y: y - 1, z },
  { x, y: y + 1, z }, { x, y, z: z - 1 }, { x, y, z: z + 1 },
])).filter((cell) => !targetKeys.has(cellKey(cell)));
for (const cell of halo) {
  const state = await sourceAt(cell);
  fail(!isFluid(state) && !isGravity(state) && !isForbidden(state),
    `target halo hazard at ${cellKey(cell)}: ${state}`);
}

const envelope = boundsOf(uniqueCells([...targetCells, ...halo]));
const chunkIds = new Set(halo.concat(targetCells).map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const id of chunkIds) {
  const [x, z] = id.split(',').map(Number);
  const chunk = await reader.chunk(x, z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (targetKeys.has(cellKey(cell)) || halo.some((candidate) => cellKey(candidate) === cellKey(cell))) blockEntities.push({ id: entity.id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const position = entity.Pos.slice(0, 3).map(Number);
    if (position[0] >= envelope.minX && position[0] <= envelope.maxX + 1
      && position[1] >= envelope.minY && position[1] <= envelope.maxY + 1
      && position[2] >= envelope.minZ && position[2] <= envelope.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, 'snapshot target/halo contains a block entity or saved entity');

const priority = new Map([
  ['clear-restricted-circulation', 0], ['terminal-lighting', 1], ['lift-analogue-platform', 1],
  ['lift-analogue-cage', 2], ['lift-analogue-counterweight', 2], ['arrival-controlled-door', 3],
  ['north-protected-door', 3], ['south-protected-door', 3],
]);
const forward = records.slice().sort((a, b) => priority.get(a.role) - priority.get(b.role)
  || a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z);
const rollback = forward.slice().reverse().map(({ cell, toState, sourceState }) => ({ cell, sourceState: toState, toState: sourceState }));
const forwardBody = `${forward.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
const rollbackBody = `${rollback.map(({ cell, sourceState, toState }) => replLine(cell, sourceState, toState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetHash = hashCells(targetCells);
const forwardFile = path.join(OUT_DIR, `${BASENAME}.terminal-access.forward.txt`);
const rollbackFile = path.join(OUT_DIR, `${BASENAME}.terminal-access.rollback.txt`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const header = (role, operationSha256) => [
  `# GENERATED FILE — MP01-CHEYENNE-TERMINAL-ACCESS-01 ${role}`,
  `# source snapshot: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetHash}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.writeFileSync(absolute(forwardFile), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackFile), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: 'mp01-cheyenne-terminal-access-01',
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A', 'P1-B03', 'Z10'],
  packages: [{ key: 'terminal-access', forward: relative(forwardFile), rollback: relative(rollbackFile) }],
  executionOrder: { forward: ['terminal-access'], rollback: ['terminal-access'] },
  scope: {
    releaseId: 'MP01-CHEYENNE-TERMINAL-ACCESS-01', canonicalOwner: 'MP01-A/P1-B03/Z10',
    purpose: 'Restricted Cheyenne terminal arrival vestibule, 5x5 common spine, two independently gated protected-direction reservations, and unpowered lift analogue.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    nonClaims: ['public opening', 'egress', 'secure commissioning', 'active lift', 'chamber completion', 'terminal completion'],
    commonSpine: classManifest(commonSpine), protectedDirections: {
      north: classManifest(northDirection), south: classManifest(southDirection),
    }, liftAnalogue: { type: 'unpowered physical counterweight cage', platform: classManifest(liftFloor) },
    controlledBoundaries: { doorCellCount: doors.length, doorCoordinateSetSha256: hashCells(doors) },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: survey.source.completeSaveSha256,
    survey: { path: relative(SURVEY), sha256: sha256(fs.readFileSync(absolute(SURVEY))) },
  },
  target: {
    operatedUnion: classManifest(targetCells), desiredStateCensus: census(records, 'toState'),
    sourceStateCensus: census(records, 'sourceState'), interactionHalo: classManifest(halo), packageTargetsDisjoint: true,
  },
  operations: { 'terminal-access': { forwardSha256, rollbackSha256, forwardCommandCount: forward.length,
    rollbackCommandCount: rollback.length, targetCellCount: records.length, targetCoordinateSetSha256: targetHash, exactInverse: true } },
  isolation: { sourceHazardCount: 0, haloFluidCount: 0, haloGravityCount: 0, haloForbiddenCount: 0,
    snapshotBlockEntityCount: 0, snapshotSavedEntityCount: 0 },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestFile = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestFile), `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: manifestWithoutIdentity.status, manifest: relative(manifestFile),
  targetCount: records.length, targetCoordinateSetSha256: targetHash, forwardSha256, rollbackSha256, manifestIdentity }, null, 2)}\n`);
