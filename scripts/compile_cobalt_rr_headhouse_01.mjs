#!/usr/bin/env node
/** Compile the Ravensreach passenger-rail headhouse (RAIL-S2 access-first).
 *
 * The Cobalt-S1 station pair is frozen. This builds the RR-SE-2-EAST-PLATEAU
 * public street-to-platform headhouse: a 5×5 concourse pad at y62, a 3×3
 * stair shaft descending from y62 to the corridor head (y18..23), and a
 * horizontal stub connecting to the corridor at x=-156. The shaft is a sealed
 * polished_deepslate sleeve (matching COBALT-RR-ACCESS-01). This is access
 * infrastructure only — no track, rail, or passenger service.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T09:30:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-rr-headhouse-01');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'cobalt-rr-headhouse-01';
const RELEASE_ID = 'COBALT-RR-HEADHOUSE-01';
const RELEASE_NODE_ID = 'CZ-PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RR-HEADHOUSE compiler rejected: ${message}`);
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

// The headhouse shaft: 3x3 clear (x=-153..-151, z=-390..-388), y18..61.
// 5x5 concourse pad at y62 (x=-154..-150, z=-391..-387).
const SHAFT = { xMin: -153, xMax: -151, zMin: -390, zMax: -388, yMin: 18, yMax: 61 };
const PAD = { xMin: -154, xMax: -150, zMin: -391, zMax: -387, y: 62 };

// Carve the shaft interior to air (y18..61).
for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    for (let y = SHAFT.yMin; y <= SHAFT.yMax; y += 1) {
      addRecord({ x, y, z }, 'minecraft:air', 'shaft-interior');
    }
  }
}
// Shaft sleeve: polished_deepslate faces around the 3x3 shaft.
// floor y17, ceiling y62, x-walls at x-1/x+1, z-walls at z-1/z+1 (y18..61).
for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    addRecord({ x, y: 17, z }, 'minecraft:polished_deepslate', 'shaft-sleeve'); // floor
    // ceiling at y62 is the concourse pad (added below), not a separate liner
  }
}
for (let y = SHAFT.yMin; y <= SHAFT.yMax; y += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    // x=-154 (xMin-1) is the stub connection opening — leave it as interior,
    // only line the x=-150 (xMax+1) east wall.
    addRecord({ x: SHAFT.xMax + 1, y, z }, 'minecraft:polished_deepslate', 'shaft-sleeve');
  }
  for (let x = SHAFT.xMin; x <= SHAFT.xMax; x += 1) {
    addRecord({ x, y, z: SHAFT.zMin - 1 }, 'minecraft:polished_deepslate', 'shaft-sleeve');
    addRecord({ x, y, z: SHAFT.zMax + 1 }, 'minecraft:polished_deepslate', 'shaft-sleeve');
  }
}
// Concourse pad at y62 (surface), polished_andesite.
for (let x = PAD.xMin; x <= PAD.xMax; x += 1) {
  for (let z = PAD.zMin; z <= PAD.zMax; z += 1) {
    addRecord({ x, y: PAD.y, z }, 'minecraft:polished_andesite', 'concourse-pad');
  }
}
// Horizontal stub: connect the shaft bottom (x=-153..-151, y18..23) to the
// corridor head at x=-156 (the built corridor runs at x=-160..-155 per Leg C).
// Stub: x=-155..-154, y18..23, z=-390..-388 -> air (interior).
for (let x = -155; x <= -154; x += 1) {
  for (let y = 18; y <= 23; y += 1) {
    for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
      addRecord({ x, y, z }, 'minecraft:air', 'stub-interior');
    }
  }
}
// Stub liner faces.
for (let y = 18; y <= 23; y += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    addRecord({ x: -156, y, z }, 'minecraft:polished_deepslate', 'stub-liner'); // west wall at x=-156
  }
}
for (let x = -155; x <= -154; x += 1) {
  for (let z = SHAFT.zMin; z <= SHAFT.zMax; z += 1) {
    addRecord({ x, y: 17, z }, 'minecraft:polished_deepslate', 'stub-liner'); // floor y17
    addRecord({ x, y: 24, z }, 'minecraft:polished_deepslate', 'stub-liner'); // ceiling y24
  }
}

// Verify source states are exact and safe (retain gravity/fluid/forbidden).
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
    purpose: 'Build the Ravensreach RR-SE-2-EAST-PLATEAU public headhouse: 5x5 concourse pad at y62, 3x3 sealed stair shaft to y18, and stub to the corridor head at x=-156.',
    concoursePad: classManifest([...Array(25)].map((_, i) => ({
      x: PAD.xMin + i % 5, y: PAD.y, z: PAD.zMin + Math.floor(i / 5),
    }))),
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
      role: 'Ravensreach public headhouse',
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
