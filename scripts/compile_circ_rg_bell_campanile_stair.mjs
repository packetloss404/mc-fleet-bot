#!/usr/bin/env node
/** Compile the Bell-Gate campanile 2-wide stair (CIRC-RG-BELL-01).
 *
 * The Bell-Gate campanile (Ravensgate, x=-110..-106, z=-432..-428) has a
 * 1-wide spiral stair (x=-109..-107, z=-431..-429, y68..106) as its only
 * vertical circulation. This package adds a 2-wide parallel stair in the open
 * east space (x=-106..-105, z=-433..-429) connecting the tower floors,
 * preserving the spiral. The new stair is a 2-wide switchback with landings.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T18:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'circ-rg-bell-campanile-stair');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'circ-rg-bell-campanile-stair';
const RELEASE_ID = 'CIRC-RG-BELL-01';
const RELEASE_NODE_ID = 'CZ-RAVENSGATE';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`BELL-STAIR compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive', 'minecraft:bee_nest',
  'minecraft:decorated_pot', 'minecraft:shulker_box', 'minecraft:structure_block',
]);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, selector = (record) => record.state) => Object.fromEntries(
  [...records.reduce((counts, record) => {
    const state = selector(record);
    counts.set(state, (counts.get(state) ?? 0) + 1);
    return counts;
  }, new Map()).entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
);

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

const records = [];
const targetKeys = new Set();
const addRecord = (cell, toState, role) => {
  const key = cellKey(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  records.push({ cell, role, toState });
};

// 2-wide switchback stair in x=-106..-105, z=-433..-429.
// Floors at y70,75,80,85,90,95. Each 5-riser run connects two floors.
// Run A: z from -433 up to -429 (southward), rising y.
// Landing, Run B: z back north, rising y.
// Tread at (x, y, z): y = floorY + step, z = baseZ +- step.
const STAIR_X = [-106, -105];
const Z_NORTH = -433;
const Z_SOUTH = -429;
const FLOORS = [70, 75, 80, 85, 90, 95];
const treads = [];
for (let f = 0; f < FLOORS.length - 1; f += 1) {
  const floorY = FLOORS[f];
  const north = f % 2 === 0; // alternate run direction
  const baseZ = north ? Z_NORTH : Z_SOUTH;
  for (let step = 1; step <= 5; step += 1) {
    const z = north ? baseZ + step - 1 : baseZ - step + 1;
    const y = floorY + step;
    for (const x of STAIR_X) treads.push({ x, y, z });
  }
}
// Top landing (only cells not already treads from the last run)
for (let x of STAIR_X) for (let z = Z_NORTH; z <= Z_SOUTH; z += 1) {
  const cell = { x, y: FLOORS[FLOORS.length - 1], z };
  if (!targetKeys.has(cellKey(cell))) treads.push(cell);
}

// Dedupe treads (runs + top landing may overlap at y95).
const seen = new Set();
const uniqueTreads = [];
for (const cell of treads) {
  const key = cellKey(cell);
  if (!seen.has(key)) { seen.add(key); uniqueTreads.push(cell); }
}
const finalTreads = uniqueTreads;

for (const cell of finalTreads) {
  addRecord(cell, 'minecraft:polished_deepslate_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]', 'stair-tread');
}
// Headroom clears above the stair path where solid.
for (const cell of finalTreads) {
  for (let dy = 1; dy <= 2; dy += 1) {
    const h = { x: cell.x, y: cell.y + dy, z: cell.z };
    if (!targetKeys.has(cellKey(h))) addRecord(h, 'minecraft:air', 'headroom-clear');
  }
}

const safeRecords = [];
const retainedHazards = [];
for (const record of records) {
  const sourceState = await sourceAt(record.cell);
  const name = blockName(sourceState);
  if (isFluid(sourceState) || GRAVITY.has(name) || FORBIDDEN.has(name)) {
    retainedHazards.push({ cell: record.cell, sourceState: name });
    continue;
  }
  if (sourceState === record.toState) continue;
  safeRecords.push({ ...record, sourceState });
}
invariant(safeRecords.length > 10, `too few safe operations: ${safeRecords.length}`);

const ordered = safeRecords.slice().sort((a, b) => (
  (a.role === 'stair-tread' ? 0 : 1) - (b.role === 'stair-tread' ? 0 : 1)
  || (a.role === 'stair-tread' ? a.cell.y - b.cell.y : b.cell.y - a.cell.y)
  || a.cell.x - b.cell.x || a.cell.z - b.cell.z
));
const rollback = ordered.slice().reverse().map(
  ({ cell, sourceState, toState }) => ({ cell, sourceState: toState, targetState: sourceState }),
);
const forwardBody = `${ordered.map(
  ({ cell, sourceState, toState }) => replLine(cell, sourceState, toState),
).join('\n')}\n`;
const rollbackBody = `${rollback.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetCoordinateSetSha256 = hashCells(safeRecords.map(({ cell }) => cell));
const canonicalForward = `data/buildops/${BASENAME}.campanile-stair.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.campanile-stair.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (campanile-stair ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(canonicalForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(canonicalRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const halo = uniqueCells(safeRecords.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['RAVENSGATE'],
  packages: [{ key: 'campanile-stair', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['campanile-stair'], rollback: ['campanile-stair'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'RAVENSGATE',
    purpose: 'Add a 2-wide parallel stair to the Bell-Gate campanile so the tower has public-grade vertical circulation, preserving the existing 1-wide spiral.',
    stairTreads: classManifest(treads),
    interactionHalo: classManifest(halo),
    routeCommissioned: false,
  },
  source: { snapshotRoot: SNAPSHOT },
  target: {
    operatedUnion: classManifest(safeRecords.map(({ cell }) => cell)),
    desiredStateCensus: census(safeRecords, (r) => r.toState),
    sourceStateCensus: census(safeRecords, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'campanile-stair': {
      role: 'campanile 2-wide stair',
      forwardSha256, rollbackSha256,
      forwardCommandCount: safeRecords.length,
      rollbackCommandCount: rollback.length,
      targetCellCount: safeRecords.length,
      targetCoordinateSetSha256,
      exactInverse: true,
    },
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    retainedHazardCellCount: retainedHazards.length,
    retainedHazards,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(MANIFEST_OUT), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: relative(MANIFEST_OUT),
  manifestIdentity,
  targetCount: safeRecords.length,
  stairCount: safeRecords.filter((r) => r.role === 'stair-tread').length,
  headroomCount: safeRecords.filter((r) => r.role === 'headroom-clear').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
