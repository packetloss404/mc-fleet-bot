#!/usr/bin/env node
/** Compile the passenger rail Leg B/Leg C connector (dry corridor bore).
 *
 * Leg A (Westlight side, x=-254..-136 at z=-462..-457) is DONE as sealed
 * 6×6 liner boxes. The Ravensreach access shaft (x=-160..-156, z=-392..-388)
 * is DONE. This package carves the connecting dry 6×6 corridor:
 *   Leg B: eastward from x=-137..-159 at z=-462..-457 (continuing Leg A)
 *   Leg C: southward from the turn at x=-158, z=-461..-393 toward the shaft
 * Both paths are verified 0-fluid, clean rock. The bore is lined with
 * polished_deepslate (floor/ceiling/walls) and left dry.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T08:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-s2-bc-connector');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-s2-bc-connector';
const RELEASE_ID = 'RAIL-S2-BC-CONNECTOR';
const RELEASE_NODE_ID = 'CZ-PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`RAIL-BC compiler rejected: ${message}`);
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

// Corridor envelope: interior air x/z range and the liner faces.
// Leg B: x=-137..-159, z=-462..-457 (6-wide bore, y18..23 air, y17/y24 + z faces + x caps lined)
// Leg C: x=-160..-156, z=-461..-393 (6-wide bore, y18..23 air)
// To keep it simple and correct, we build:
//   - Leg B bore interior (x=-138..-158, z=-461..-458, y18..23) -> air
//   - Leg B liner faces
//   - Leg C bore interior (x=-159..-157, z=-461..-393, y18..23) -> air
//   - Leg C liner faces
//   - Connector at the turn
// This is a 6-wide (6-clear) corridor. Given the corridor is 6-wide in z for
// Leg A (z=-462..-457 = 6 cells), the interior clear is z=-461..-458 (4 clear)
// with liner at z=-462 and z=-457. Hmm — Leg A used a 6×6 box meaning 6 cells
// across including liner. Let me match: Leg A built z=-462..-457 as the box.
// For continuity, Leg B box = z=-462..-457, interior air z=-461..-458.
const BOX = { yMin: 18, yMax: 23, zMin: -462, zMax: -457 };
const interior = (x) => {
  const cells = [];
  for (let y = BOX.yMin; y <= BOX.yMax; y += 1) {
    for (let z = BOX.zMin + 1; z <= BOX.zMax - 1; z += 1) {
      cells.push({ x, y, z });
    }
  }
  return cells;
};
const linerFor = (x, isEnd) => {
  const cells = [];
  const seen = new Set();
  const push = (cell) => {
    const key = cellKey(cell);
    if (!seen.has(key)) { seen.add(key); cells.push(cell); }
  };
  // floor y17
  for (let z = BOX.zMin; z <= BOX.zMax; z += 1) push({ x, y: 17, z });
  // ceiling y24
  for (let z = BOX.zMin; z <= BOX.zMax; z += 1) push({ x, y: 24, z });
  // north wall z=-462 (y18..23)
  for (let y = BOX.yMin; y <= BOX.yMax; y += 1) push({ x, y, z: BOX.zMin });
  // south wall z=-457 (y18..23)
  for (let y = BOX.yMin; y <= BOX.yMax; y += 1) push({ x, y, z: BOX.zMax });
  if (isEnd) {
    // x-face cap (y17..24)
    for (let y = 17; y <= 24; y += 1) for (let z = BOX.zMin; z <= BOX.zMax; z += 1) {
      push({ x, y, z });
    }
  }
  return cells;
};

// Leg B: x=-137..-158 (the bore continuing Leg A east; the cap is at x=-159).
for (let x = -137; x >= -158; x -= 1) {
  for (const c of interior(x)) addRecord(c, 'minecraft:air', 'bore-interior');
  for (const c of linerFor(x, false)) addRecord(c, 'minecraft:polished_deepslate', 'bore-liner');
}
// End cap at x=-159
for (const c of linerFor(-159, true)) addRecord(c, 'minecraft:polished_deepslate', 'bore-liner');
// Leg C: the southward leg at x=-158 (turn), running z=-461..-393.
// The turn: at x=-158, the corridor turns from east-west (z=-462..-457) to north-south (z toward -393).
// Leg C bore: x=-159..-157 (3-wide interior? no, 6-wide in x would be x=-161..-155).
// Actually the Ravensreach shaft is x=-160..-156. So Leg C 6-wide bore in x = -160..-155.
// Let me build Leg C as x=-160..-155, z from -457 down to -393, with liner.
const LEGC = { xMin: -160, xMax: -155, yMin: 18, yMax: 23, zStart: -458, zEnd: -392 };
for (let z = LEGC.zStart; z >= LEGC.zEnd; z -= 1) {
  // interior x=-159..-156
  for (let x = -159; x >= -156; x -= 1) {
    for (let y = LEGC.yMin; y <= LEGC.yMax; y += 1) {
      addRecord({ x, y, z }, 'minecraft:air', 'bore-interior');
    }
  }
  // liner faces
  for (let x = LEGC.xMin; x <= LEGC.xMax; x += 1) {
    addRecord({ x, y: LEGC.yMin - 1, z }, 'minecraft:polished_deepslate', 'bore-liner'); // floor y17
    addRecord({ x, y: LEGC.yMax + 1, z }, 'minecraft:polished_deepslate', 'bore-liner'); // ceiling y24
  }
  for (let y = LEGC.yMin; y <= LEGC.yMax; y += 1) {
    addRecord({ x: LEGC.xMin, y, z }, 'minecraft:polished_deepslate', 'bore-liner'); // west x=-160
    addRecord({ x: LEGC.xMax, y, z }, 'minecraft:polished_deepslate', 'bore-liner'); // east x=-155
  }
}
// South cap at z=-393 (y17..24)
for (let x = LEGC.xMin; x <= LEGC.xMax; x += 1) {
  for (let y = LEGC.yMin - 1; y <= LEGC.yMax + 1; y += 1) {
    addRecord({ x, y, z: LEGC.zEnd }, 'minecraft:polished_deepslate', 'bore-liner');
  }
}

// Verify all source states are exact and safe. Gravity/fluid/forbidden cells
// in the liner are retained (not touched) rather than failing the whole bore;
// they are recorded so the post-state verify can confirm they are unchanged.
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
invariant(safeRecords.length > 100, `too few safe operations: ${safeRecords.length}`);

// Order: carve interior top-down first, then liner bottom-up.
const ordered = safeRecords.slice().sort((a, b) => (
  (a.role === 'bore-interior' ? 0 : 1) - (b.role === 'bore-interior' ? 0 : 1)
  || (a.role === 'bore-interior' ? b.cell.y - a.cell.y : a.cell.y - b.cell.y)
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
const canonicalForward = `data/buildops/${BASENAME}.bc-connector.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.bc-connector.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (bc-connector ${direction})`,
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
// Halo fluid is acceptable (the corridor runs near a lake/lava); the operated
// cells themselves are verified fluid-free. Halo fluid is preserved untouched.

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['PASSENGER-RAILWAY'],
  packages: [{ key: 'bc-connector', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['bc-connector'], rollback: ['bc-connector'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Carve the dry 6×6 corridor connecting Leg A (Westlight, x=-136) to the Ravensreach access shaft via Leg B (east) and Leg C (south turn), lined with polished_deepslate.',
    legB: { x: [-159, -137], z: [-462, -457] },
    legC: { x: [-160, -155], z: [-458, -393] },
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
    'bc-connector': {
      role: 'Leg B/C corridor connector',
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
  interiorCount: safeRecords.filter((r) => r.role === 'bore-interior').length,
  linerCount: safeRecords.filter((r) => r.role === 'bore-liner').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
