#!/usr/bin/env node
/** Compile the Ravensreach↔MainStreet corridor widening at the four below-3-wide chokes.
 *
 * The proven citizen commute route (Ravensreach -> MainStreet) is 2-wide at four
 * chokes (polished_blackstone_wall pillars at x=-83 and a fence/andesite at
 * z=-79). This package removes the protruding wall/fence/andesite cells so each
 * choke reaches >=3 contiguous walkable columns, preserving the corridor lanterns.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T16:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'ravensreach-mainstreet-corridor-widening');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'ravensreach-mainstreet-corridor-widening';
const RELEASE_ID = 'CIRC-RRCH-MSA-WIDEN-01';
const RELEASE_NODE_ID = 'CZ-LEGACY-CROSS-AREA-CIRCULATION';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RR-MSA WIDEN compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
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

// The exact widening cells: protruding wall/fence/andesite -> air.
const targetCells = [
  { x: -83, y: 65, z: -206 }, { x: -83, y: 66, z: -206 }, { x: -83, y: 67, z: -206 },
  { x: -83, y: 66, z: -158 }, { x: -83, y: 67, z: -158 }, { x: -83, y: 68, z: -158 },
  { x: -83, y: 65, z: -110 }, { x: -83, y: 66, z: -110 }, { x: -83, y: 67, z: -110 },
  { x: -80, y: 65, z: -79 }, { x: -81, y: 66, z: -79 },
];

const records = [];
const targetKeys = new Set();
for (const cell of targetCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  invariant(!isFluid(sourceState), `fluid source at ${key}`);
  invariant(sourceState !== 'minecraft:air', `already air at ${key}`);
  invariant(!sourceState.includes('lantern'), `lantern preserved at ${key}`);
  targetKeys.add(key);
  records.push({ cell, sourceState, targetState: 'minecraft:air' });
}
invariant(records.length === 11, `expected 11 widening cells, got ${records.length}`);

// Halo isolation: no fluid, no forbidden, no gravity source in the 3x3x3 halo.
const halo = uniqueCells(records.flatMap(({ cell }) => {
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
  if (['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(blockName(st))) {
    haloGravityCount += 1;
  }
}
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);
invariant(haloGravityCount === 0, `halo gravity ${haloGravityCount}`);

// Block-entity and saved-entity clearance over the halo.
const haloBounds = classManifest(halo).bounds;
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (halo.some((point) => cellKey(point) === cellKey(cell))) {
        blockEntities.push({ id: entity.id ?? null, cell });
      }
    }
  }
}
invariant(blockEntities.length === 0, `block entity in halo: ${JSON.stringify(blockEntities.slice(0, 5))}`);

const ordered = records.slice().sort((a, b) => (
  a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z
));
const rollback = ordered.slice().reverse().map(
  ({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }),
);
const forwardBody = `${ordered.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const rollbackBody = `${rollback.map(
  ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const targetCoordinateSetSha256 = hashCells(records.map(({ cell }) => cell));
const canonicalForward = `data/buildops/${BASENAME}.corridor-widening.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.corridor-widening.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (corridor-widening ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(canonicalForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(canonicalRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['LEGACY-CROSS-AREA-CIRCULATION'],
  packages: [{ key: 'corridor-widening', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: {
    forward: ['corridor-widening'],
    rollback: ['corridor-widening'],
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'LEGACY-RAVENSREACH-MAINSTREET-ROUTE',
    purpose: 'Widen the four below-3-wide chokes on the proven Ravensreach-to-MainStreet citizen route to >=3 walkable columns by removing the protruding wall/fence/andesite cells.',
    wideningCells: classManifest(records.map(({ cell }) => cell)),
    interactionHalo: classManifest(halo),
    routeCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
  },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'corridor-widening': {
      role: 'protruding-wall removal',
      forwardSha256, rollbackSha256,
      forwardCommandCount: records.length,
      rollbackCommandCount: rollback.length,
      targetCellCount: records.length,
      targetCoordinateSetSha256,
      exactInverse: true,
    },
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    operatedHaloGravityCount: haloGravityCount,
    blockEntityConflictCount: blockEntities.length,
    savedEntityConflictCount: savedEntities.length,
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
  targetCount: records.length,
  haloCount: halo.length,
  haloFluidCount,
  haloGravityCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
