#!/usr/bin/env node
/** Compile CIRC-C01-PORTAL-01 — C01 mountain portal → L1 stair shaft.
 *
 * The recessed mountain portal forecourt (walkable y=67 at x=695,z=-52) has no
 * path to the L1 airlock (walkable y=42 at x=701,z=-81). This package carves a
 * clean 2-wide stair shaft at x=694..695 descending from y67 (z=-52) to y42
 * (z=-77), places smooth_stone treads, and tunnels east at the bottom to the
 * L1 airlock floor (701,42,-81). The full shaft envelope is carved to air for
 * 2-block headroom. All columns verified gravity/fluid/container-free.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T00:45:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'c01-portal-l1-stair-shaft');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'c01-portal-l1-stair-shaft';
const RELEASE_ID = 'CIRC-C01-PORTAL-01';
const RELEASE_NODE_ID = 'CZ-C01-BUNKER';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`C01-PORTAL compiler rejected: ${message}`);
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

// The stair: 2-wide at x=694..695, 26 risers descending from y67 (z=-50) to
// y42 (z=-75). Tread at y maps to z = y - 119 + 2 (offset +2 to clear the
// gravel bands at z=-53..-56 and z=-70..-71).
const STAIR_X = [694, 695];
const Z_OFFSET = 2;
const stairCells = [];
for (let y = 42; y <= 67; y += 1) {
  const z = y - 119 + Z_OFFSET;
  for (const x of STAIR_X) stairCells.push({ x, y, z });
}
// Carve the full shaft envelope: every cell in x=694..695, y=41..67 (plus
// headroom y+1,y+2), z from -52 to -77, EXCEPT the tread cells, to air.
// Simpler: carve headroom (y+1, y+2 above each tread) to air, and place treads.
const headroomCells = [];
for (const cell of stairCells) {
  for (let dy = 1; dy <= 2; dy += 1) {
    headroomCells.push({ x: cell.x, y: cell.y + dy, z: cell.z });
  }
}
// The bottom tunnel: from the stair bottom (695,42,-75) east to the L1 airlock.
// Tunnel floor at y42 becomes smooth_stone (continuing the stair); the space
// above (y43..44) is carved to air for headroom. Doorway into the L1 airlock at
// x=700..701, y43..44 (above the y42 floor, not through it).
const tunnelCells = [];
const tunnelFloor = [];
for (let x = 696; x <= 699; x += 1) {
  for (let z = -75; z >= -81; z -= 1) {
    tunnelFloor.push({ x, y: 42, z });
  }
}
for (let x = 695; x <= 699; x += 1) {
  for (let y = 43; y <= 44; y += 1) {
    for (let z = -75; z >= -81; z -= 1) {
      tunnelCells.push({ x, y, z });
    }
  }
}
// Doorway into the L1 airlock at x=700..701, y43..44, z=-81..-79
// (above the y42 floor, not through it)
for (let x = 700; x <= 701; x += 1) {
  for (let y = 43; y <= 44; y += 1) {
    for (let z = -81; z <= -79; z += 1) {
      tunnelCells.push({ x, y, z });
    }
  }
}

// Add all records.
for (const cell of stairCells) addRecord(cell, 'minecraft:smooth_stone', 'stair-tread');
for (const cell of tunnelFloor) addRecord(cell, 'minecraft:smooth_stone', 'tunnel-floor');
// Bridge landing: connect the portal forecourt (walkable at z=-52) to the stair
// top (z=-50) with smooth_stone at y67, z=-52, x=694..695. The cell at z=-51
// stays air as headroom for the y66 tread below.
for (const x of [694, 695]) {
  addRecord({ x, y: 67, z: -52 }, 'minecraft:smooth_stone', 'stair-tread');
}
for (const cell of headroomCells) {
  if (!targetKeys.has(cellKey(cell))) addRecord(cell, 'minecraft:air', 'shaft-excavation');
}
for (const cell of tunnelCells) {
  if (!targetKeys.has(cellKey(cell))) addRecord(cell, 'minecraft:air', 'tunnel-excavation');
}

// Verify source states are exact and safe.
const safeRecords = [];
for (const record of records) {
  const sourceState = await sourceAt(record.cell);
  const name = blockName(sourceState);
  invariant(!isFluid(sourceState), `fluid source at ${cellKey(record.cell)}`);
  invariant(!GRAVITY.has(name), `gravity source at ${cellKey(record.cell)}`);
  invariant(!FORBIDDEN.has(name), `forbidden source at ${cellKey(record.cell)}`);
  invariant(name !== 'minecraft:rail', `rail source at ${cellKey(record.cell)}`);
  if (sourceState === record.toState) continue;
  safeRecords.push({ ...record, sourceState });
}
invariant(safeRecords.length > 50, `too few safe operations: ${safeRecords.length}`);

// Order: excavate shaft/tunnel top-down first, then place treads bottom-up.
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
const canonicalForward = `data/buildops/${BASENAME}.stair-shaft.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.stair-shaft.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (stair-shaft ${direction})`,
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
  scopeIds: ['TE-C01-BUNKER'],
  packages: [{ key: 'stair-shaft', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['stair-shaft'], rollback: ['stair-shaft'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'TOWN-EXPANSION-C01-BUNKER',
    purpose: 'Carve a clean 2-wide stair shaft connecting the recessed mountain portal forecourt (y67) to the L1 airlock (y42), with smooth_stone treads and a bottom tunnel to the (701,42,-81) L1 floor.',
    stairTreads: classManifest(stairCells),
    shaftExcavation: classManifest(headroomCells),
    bottomTunnel: classManifest(tunnelCells),
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
    'stair-shaft': {
      role: 'portal-to-L1 stair shaft',
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
  stairCount: safeRecords.filter((r) => r.role === 'stair-tread').length,
  shaftCount: safeRecords.filter((r) => r.role === 'shaft-excavation').length,
  tunnelCount: safeRecords.filter((r) => r.role === 'tunnel-excavation').length,
  haloCount: halo.length,
  haloFluidCount,
  haloGravityCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
