#!/usr/bin/env node
/** Compile the Westlight passenger-rail public headhouse with sealed water sleeve.
 *
 * The Cobalt-S1 station pair is frozen. The Westlight platform (deck y18,
 * z=-444..-441) and corridor Leg A (z=-462..-457) are built. Every descent
 * column near the platform crosses a water body around y40, so this headhouse
 * uses a sealed polished_deepslate sleeve through the water band (preserving
 * the water behind it), connecting a 5×5 surface concourse pad to the platform.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T15:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-wl-headhouse-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'cobalt-wl-headhouse-01';
const RELEASE_ID = 'COBALT-WL-HEADHOUSE-01';
const RELEASE_NODE_ID = 'CZ-PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`WL-HEADHOUSE compiler rejected: ${message}`);
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

// Headhouse shaft: 3x3 clear at x=-250..-248, z=-444..-442 (above the platform
// deck z=-444..-441). Surface pad 5x5 at y66 (x=-252..-248, z=-446..-442).
// The shaft descends y18..65 with a sealed sleeve through the water band.
const SHAFT = { xMin: -250, xMax: -248, zMin: -444, zMax: -442, yMin: 18, yMax: 65 };
const PAD = { xMin: -252, xMax: -248, zMin: -446, zMax: -442, y: 66 };

// Carve shaft interior to air (y18..65), displacing water in-place (sealed).
for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    for (let y = SHAFT.yMin; y <= SHAFT.yMax; y += 1) {
      addRecord({ x, y, z }, 'minecraft:air', 'shaft-interior');
    }
  }
}
// Sleeve faces (floor y17, ceiling y66, side walls), preserving water behind.
for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    addRecord({ x, y: 17, z }, 'minecraft:polished_deepslate', 'shaft-sleeve'); // floor
    // ceiling at y66 is the concourse pad (added below), not a separate liner
  }
}
for (let y = SHAFT.yMin; y <= SHAFT.yMax; y += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    addRecord({ x: SHAFT.xMin - 1, y, z }, 'minecraft:polished_deepslate', 'shaft-sleeve');
    addRecord({ x: SHAFT.xMax + 1, y, z }, 'minecraft:polished_deepslate', 'shaft-sleeve');
  }
  for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
    addRecord({ x, y, z: SHAFT.zMin - 1 }, 'minecraft:polished_deepslate', 'shaft-sleeve');
    addRecord({ x, y, z: SHAFT.zMax + 1 }, 'minecraft:polished_deepslate', 'shaft-sleeve');
  }
}
// Concourse pad at y66.
for (let x = PAD.xMin; x <= PAD.xMax; x += 1) {
  for (let z = PAD.zMin; z <= PAD.zMax; z += 1) {
    addRecord({ x, y: PAD.y, z }, 'minecraft:polished_andesite', 'concourse-pad');
  }
}
// Stub: connect shaft bottom (y18..23) south to the platform deck (z=-441..-440).
for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
  for (let y = 18; y <= 23; y += 1) {
    for (let z = -441; z >= -440; z -= 1) {
      addRecord({ x, y, z }, 'minecraft:air', 'stub-interior');
    }
  }
}
for (let y = 18; y <= 23; y += 1) {
  for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
    addRecord({ x, y, z: -439 }, 'minecraft:polished_deepslate', 'stub-liner');
  }
}

// Verify source states; retain (do not touch) gravity/fluid/forbidden in the
// liner path. Interior fluid displacement is handled by the exact REPL (the
// sleeve seals it). Water behind the sleeve is preserved.
const safeRecords = [];
const retainedHazards = [];
for (const record of records) {
  const sourceState = await sourceAt(record.cell);
  const name = blockName(sourceState);
  if (GRAVITY.has(name) || FORBIDDEN.has(name)) {
    retainedHazards.push({ cell: record.cell, sourceState: name });
    continue;
  }
  if (sourceState === record.toState) continue;
  safeRecords.push({ ...record, sourceState });
}
invariant(safeRecords.length > 50, `too few safe operations: ${safeRecords.length}`);

const ordered = safeRecords.slice().sort((a, b) => (
  (a.role === 'shaft-interior' || a.role === 'stub-interior' ? 0 : 1)
    - (b.role === 'shaft-interior' || b.role === 'stub-interior' ? 0 : 1)
  || (a.role === 'shaft-interior' || a.role === 'stub-interior' ? b.cell.y - a.cell.y : a.cell.y - b.cell.y)
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
const canonicalForward = `data/buildops/${BASENAME}.headhouse.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.headhouse.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (headhouse ${direction})`,
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
  scopeIds: ['PASSENGER-RAILWAY'],
  packages: [{ key: 'headhouse', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['headhouse'], rollback: ['headhouse'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Build the Westlight public headhouse: 5x5 concourse pad at y66, 3x3 sealed stair shaft to the platform (y18) with a water-sleeve through the y40 water band, and a stub to the platform deck.',
    concoursePad: classManifest(records.filter((r) => r.role === 'concourse-pad').map(({ cell }) => cell)),
    shaft: classManifest(records.filter((r) => r.role === 'shaft-interior').map(({ cell }) => cell)),
    stub: classManifest(records.filter((r) => r.role === 'stub-interior').map(({ cell }) => cell)),
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
    headhouse: {
      role: 'Westlight public headhouse',
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
  shaftCount: safeRecords.filter((r) => r.role === 'shaft-interior').length,
  sleeveCount: safeRecords.filter((r) => r.role === 'shaft-sleeve').length,
  padCount: safeRecords.filter((r) => r.role === 'concourse-pad').length,
  stubCount: safeRecords.filter((r) => r.role === 'stub-interior' || r.role === 'stub-liner').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
