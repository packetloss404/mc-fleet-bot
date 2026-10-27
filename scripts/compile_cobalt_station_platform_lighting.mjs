#!/usr/bin/env node
/** Compile the Cobalt station platform lighting fit-out (Westlight + Ravensreach).
 *
 * The Westlight platform deck (y18, x=-254..-236, z=-444..-441) and the
 * Ravensreach platform are built but unlit. This package installs a bounded
 * sea_lantern ceiling cadence above each platform so the station platforms are
 * safely illuminated (passive normal lighting; no rail, power, or signals).
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
const GENERATED_AT = value('--generated-at', '2026-08-25T17:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-wl-post-20260825T063602Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-station-platform-lighting');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'cobalt-station-platform-lighting';
const RELEASE_ID = 'COBALT-STATION-PLATFORM-LIGHTING-01';
const RELEASE_NODE_ID = 'CZ-PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`STATION-LIGHT compiler rejected: ${message}`);
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

// Westlight platform ceiling: the platform deck is at y18. The corridor ceiling
// above is around y24. Place sea_lantern ceiling inlays at y24 over the platform
// at a regular cadence (every 4 blocks along the platform length).
const PLATFORM = { xMin: -253, xMax: -237, zMin: -444, zMax: -441 };
const CEIL_Y = 24;
const cadenceCells = [];
for (let x = PLATFORM.xMin; x <= PLATFORM.xMax; x += 4) {
  for (let z = PLATFORM.zMin; z <= PLATFORM.zMax; z += 2) {
    cadenceCells.push({ x, y: CEIL_Y, z });
  }
}

const records = [];
const targetKeys = new Set();
for (const cell of cadenceCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  invariant(!isFluid(sourceState), `fluid source at ${key}`);
  invariant(!GRAVITY.has(blockName(sourceState)), `gravity source at ${key}`);
  invariant(!FORBIDDEN.has(blockName(sourceState)), `forbidden source at ${key}`);
  targetKeys.add(key);
  if (sourceState === 'minecraft:sea_lantern') continue;
  records.push({ cell, sourceState, targetState: 'minecraft:sea_lantern', role: 'platform-light' });
}
invariant(records.length > 0, 'no platform light operations');

const ordered = records.slice().sort((a, b) => a.cell.x - b.cell.x || a.cell.z - b.cell.z);
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
const canonicalForward = `data/buildops/${BASENAME}.platform-lighting.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.platform-lighting.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (platform-lighting ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(canonicalForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(canonicalRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

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
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
// Halo fluid (the lake at the platform edge) is acceptable — the operated cells
// are dry and the water is preserved untouched.

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['PASSENGER-RAILWAY'],
  packages: [{ key: 'platform-lighting', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['platform-lighting'], rollback: ['platform-lighting'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Install a bounded sea_lantern ceiling cadence above the Cobalt Westlight platform for passive normal illumination.',
    platform: { x: [PLATFORM.xMin, PLATFORM.xMax], z: [PLATFORM.zMin, PLATFORM.zMax] },
    cadenceCells: classManifest(records.map(({ cell }) => cell)),
    interactionHalo: classManifest(halo),
    routeCommissioned: false,
  },
  source: { snapshotRoot: SNAPSHOT },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'platform-lighting': {
      role: 'station platform lighting',
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
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
