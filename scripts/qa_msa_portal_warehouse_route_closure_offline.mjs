#!/usr/bin/env node
/** Independent read-only offline QA for CIRC-MSA-PORTAL-01 (portal lintel clear). */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST = value(
  '--manifest',
  'data/buildops/msa-portal-warehouse-route-closure.release-manifest.json',
);
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/msa-portal-warehouse-offline-20260824T120000Z',
);
const OUT = value('--out', `${EVIDENCE}/offline-qa.json`);
const GENERATED_AT = value('--generated-at', '2026-08-24T12:00:00Z');

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`CIRC-MSA-PORTAL-01 offline QA rejected: ${message}`);
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(Buffer.from(`${JSON.stringify(manifestPayload, null, 2)}\n`))
  && manifest.transactionId === 'msa-portal-warehouse-route-closure'
  && manifest.mvpScope === true
  && manifest.scope.releaseId === 'CIRC-MSA-PORTAL-01'
  && manifest.scope.canonicalOwner === 'mainstreet-america'
  && manifest.status.includes('AWAITING_EXECUTION'),
'manifest identity/schema drifted');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);

const records = [];
const targetKeys = new Set();
let inverseCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
  invariant(bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256
    && forward.length === rollback.length
    && forward.length === operation.targetCellCount,
  `${pkg.key} operation identity/count drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    inverseCount += 1;
  }
}
invariant(records.length === 54, `expected 54 exact targets, got ${records.length}`);

// Every target must be an exact lintel -> air transition, all one cell.
const unexpected = records.filter(({ sourceState, targetState }) => (
  sourceState !== 'minecraft:polished_blackstone_bricks'
  || targetState !== 'minecraft:air'
));
invariant(unexpected.length === 0, `unexpected transition: ${JSON.stringify(unexpected.slice(0, 5))}`);

// Crown (y=71..72) retained lintel above every operated column.
for (const record of records) {
  for (const y of [71, 72]) {
    const crownState = await sourceAt({ x: record.cell.x, y, z: record.cell.z });
    invariant(crownState === 'minecraft:polished_blackstone_bricks',
      `retained crown at (${record.cell.x},${y},203) drifted: ${crownState}`);
  }
}

// Halo: 3x3x3 around every operated cell, no fluid/forbidden/gravity.
const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
let haloFluidCount = 0;
let haloForbiddenCount = 0;
let haloGravityCount = 0;
for (const cell of halo) {
  const state = await sourceAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (isForbidden(state)) haloForbiddenCount += 1;
  if (isGravity(state)) haloGravityCount += 1;
}
invariant(haloFluidCount === 0 && haloForbiddenCount === 0 && haloGravityCount === 0,
  `halo hazard: fluid=${haloFluidCount} forbidden=${haloForbiddenCount} gravity=${haloGravityCount}`);

// Block-entity and saved-entity clearance over the halo.
const entityReader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'entities')));
const blockEntityIntersections = [];
const entityIntersections = [];
const chunks = new Set(halo.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
for (const chunkKey of chunks) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (halo.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && halo.some((cell) => (
      position[0] >= cell.x && position[0] < cell.x + 1
      && position[1] >= cell.y && position[1] < cell.y + 1
      && position[2] >= cell.z && position[2] < cell.z + 1
    ))) {
      entityIntersections.push({ id: entity.id ?? null, position });
    }
  }
}
invariant(blockEntityIntersections.length === 0 && entityIntersections.length === 0,
  'halo reaches a block entity or saved movable entity');

const report = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_MSA_PORTAL_01_OFFLINE_RELEASE_READY',
  mode: 'INDEPENDENT_READ_ONLY_MSA_PORTAL_OFFLINE_QA',
  release: {
    manifestPath: MANIFEST,
    manifestIdentity,
    targetCount: records.length,
  },
  checks: {
    exactTargetCount: records.length,
    exactInverseReadyCount: inverseCount,
    portalLintelClearCount: records.filter(({ sourceState }) => sourceState === 'minecraft:polished_blackstone_bricks').length,
    retainedCrownCellCount: records.length * 2,
    interactionHaloCellCount: halo.length,
    haloFluidCount,
    haloForbiddenBlockCount: haloForbiddenCount,
    haloGravityBlockCount: haloGravityCount,
    blockEntityIntersectionCount: blockEntityIntersections.length,
    savedEntityIntersectionCount: entityIntersections.length,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    haloCoordinateSetSha256: hashCells(halo),
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(absolute(EVIDENCE), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
