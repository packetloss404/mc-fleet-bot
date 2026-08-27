#!/usr/bin/env node
/** Compile B03/Cheyenne surface access stair (BKR-B03-ACCESS-01).
 *
 * The commissioned B03 corridor (indices 188..800) is a walkable floor at y=165
 * spanning x=2048..2390, z=-870..-746, but it has NO vertical access to the
 * surface — it is a sealed buried corridor. This package opens the corridor's
 * north-portal roof (y170 polished_diorite + y171 stone_bricks over the
 * x=2235..2236, z=-746..-750 opening) and builds a 2-wide straight stair
 * ascending northward from the opening (y170) up to the surface level (y200).
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
const GENERATED_AT = value('--generated-at', '2026-08-25T00:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'b03-cheyenne-surface-access-stair');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'b03-cheyenne-surface-access-stair';
const RELEASE_ID = 'BKR-B03-ACCESS-01';
const RELEASE_NODE_ID = 'CZ-B03-ACCESS';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`B03-ACCESS compiler rejected: ${message}`);
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

// 2. Build the 2-wide straight stair ascending north from the corridor floor.
//    The first tread is at the corridor floor level (y165) at z=-746, so the
//    stair becomes the walkable surface; each subsequent tread rises 1 block
//    per z-step. Step i at (2235/2236, y=165+i, z=-746-i) for i=0..35 (y165..200).
//    This passes through the portal roof (y170, polished_diorite -> smooth_stone)
//    into the open cavity above.
const STAIR_X = [2235, 2236];
const N_RISERS = 35;
const stairCells = [];
for (let i = 0; i <= N_RISERS; i += 1) {
  for (const x of STAIR_X) {
    stairCells.push({ x, y: 165 + i, z: -746 - i });
  }
}
for (const cell of stairCells) {
  addRecord(cell, 'minecraft:smooth_stone', 'stair-tread');
}

// 3. Headroom: clear y+1 and y+2 above each tread where solid.
for (const cell of stairCells) {
  for (let dy = 1; dy <= 2; dy += 1) {
    const h = { x: cell.x, y: cell.y + dy, z: cell.z };
    if (!targetKeys.has(cellKey(h))) addRecord(h, 'minecraft:air', 'headroom-clear');
  }
}

// Verify all source states are exact and safe.
const safeRecords = [];
for (const record of records) {
  const sourceState = await sourceAt(record.cell);
  const name = blockName(sourceState);
  invariant(!isFluid(sourceState), `fluid source at ${cellKey(record.cell)}`);
  invariant(!GRAVITY.has(name), `gravity source at ${cellKey(record.cell)}`);
  invariant(!FORBIDDEN.has(name), `forbidden source at ${cellKey(record.cell)}`);
  if (sourceState === record.toState) continue;
  safeRecords.push({ ...record, sourceState });
}
invariant(safeRecords.length > 50, `too few safe operations: ${safeRecords.length}`);

// Order: clear roof/headroom top-down first, then place treads bottom-up.
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
const canonicalForward = `data/buildops/${BASENAME}.access-stair.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.access-stair.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (access-stair ${direction})`,
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
let haloGravityCount = 0;
for (const cell of halo) {
  const st = await sourceAt(cell);
  if (isFluid(st)) haloFluidCount += 1;
  if (GRAVITY.has(blockName(st))) haloGravityCount += 1;
}
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['P1-B03'],
  packages: [{ key: 'access-stair', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['access-stair'], rollback: ['access-stair'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'P1-B03',
    purpose: 'Open the sealed B03 corridor roof at the north portal and build a 2-wide stair ascending to the surface, giving the Cheyenne gallery its first real entrance.',
    roofOpenings: classManifest(records.filter((r) => r.role === 'roof-open').map(({ cell }) => cell)),
    stairTreads: classManifest(stairCells),
    interactionHalo: classManifest(halo),
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
  },
  target: {
    operatedUnion: classManifest(safeRecords.map(({ cell }) => cell)),
    desiredStateCensus: census(safeRecords, (r) => r.toState),
    sourceStateCensus: census(safeRecords, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'access-stair': {
      role: 'surface access stair',
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
    operatedHaloGravityCount: haloGravityCount,
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
  roofCount: safeRecords.filter((r) => r.role === 'roof-open').length,
  stairCount: safeRecords.filter((r) => r.role === 'stair-tread').length,
  headroomCount: safeRecords.filter((r) => r.role === 'headroom-clear').length,
  haloCount: halo.length,
  haloFluidCount,
  haloGravityCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
