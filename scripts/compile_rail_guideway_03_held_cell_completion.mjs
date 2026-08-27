#!/usr/bin/env node
/** Compile the rail guideway held-cell completion (support-first + water seal).
 *
 * RAIL-S3-GUIDEWAY-02 held 17 tube-S bed cells (cave air / granite over air)
 * and one water column at (-180,-454). This package completes the tube-S bed:
 * fills the cave-air and granite bed cells to polished_deepslate (with stone
 * support fills under the unsupported ones), and seals the flowing water
 * column behind a polished_deepslate containment wall at z=-453 so it cannot
 * flow into the completed guideway bed. The water source is preserved behind
 * the wall.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T17:50:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway-post2-20260825T165100Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-guideway-03-held-cell-completion');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'rail-guideway-03-held-cell-completion';
const RELEASE_ID = 'RAIL-S3-GUIDEWAY-03';
const RELEASE_NODE_ID = 'CZ-PASSENGER-RAILWAY';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`GUIDEWAY-03 compiler rejected: ${message}`);
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

const records = [];
const targetKeys = new Set();
const addRecord = (cell, toState, role) => {
  const key = cellKey(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  records.push({ cell, role, toState });
};

// Bed cells to complete (polished_deepslate at y12). (-179,-454) is the
// water-seal east wall (excluded from the bed).
const bedCells = [
  { x: -197, z: -454 }, { x: -182, z: -454 }, // air over stone (safe fill)
  { x: -177, z: -455 }, { x: -176, z: -455 }, // granite over air
  { x: -176, z: -454 }, { x: -175, z: -454 }, // granite over air
];
for (const c of bedCells) {
  addRecord({ x: c.x, y: 12, z: c.z }, 'minecraft:polished_deepslate', 'guideway-bed');
}
// Support fills: y11 stone under the bed cells that are over air.
const unsupportedXZ = [
  [-179, -454], [-177, -455], [-176, -455], [-176, -454], [-175, -454],
];
for (const [x, z] of unsupportedXZ) {
  addRecord({ x, y: 11, z }, 'minecraft:stone', 'support-fill');
}
// Water containment wall at z=-453 (south of the tube-S bed), y11..14, x=-181..-175.
// This seals the flowing water column at (-180,-454) from the completed bed.
for (let y = 11; y <= 14; y += 1) {
  for (let x = -181; x <= -175; x += 1) {
    addRecord({ x, y, z: -453 }, 'minecraft:polished_deepslate', 'water-seal');
  }
}
// Also seal the west/east of the water column at z=-454 (x=-180) to contain it.
// Ensure the water column at (-180,-454) is fully walled: y10..14, x=-180, z=-454
// is the water; the seal at z=-453 walls it south. North wall at z=-455:
for (let y = 10; y <= 14; y += 1) {
  addRecord({ x: -180, y, z: -455 }, 'minecraft:polished_deepslate', 'water-seal');
}
// East/west containment around the water column at z=-454: x=-179 and x=-181 walls.
for (let y = 10; y <= 14; y += 1) {
  // x=-179 at y11 is already a support-fill (from unsupportedXZ); skip y11 there.
  if (y === 11) continue;
  addRecord({ x: -179, y, z: -454 }, 'minecraft:polished_deepslate', 'water-seal');
  addRecord({ x: -181, y, z: -454 }, 'minecraft:polished_deepslate', 'water-seal');
}

// Verify sources: retain gravity/fluid/forbidden (the water is preserved, not
// touched — the seal walls around it).
const safeRecords = [];
const retainedHazards = [];
for (const record of records) {
  const sourceState = await sourceAt(record.cell);
  const name = blockName(sourceState);
  if (isFluid(sourceState) || ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(name)) {
    retainedHazards.push({ cell: record.cell, sourceState: name });
    continue;
  }
  if (sourceState === record.toState) continue;
  safeRecords.push({ ...record, sourceState });
}
invariant(safeRecords.length > 5, `too few safe operations: ${safeRecords.length}`);

const ordered = safeRecords.slice().sort((a, b) => (
  a.cell.y - b.cell.y || a.cell.x - b.cell.x || a.cell.z - b.cell.z
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
const canonicalForward = `data/buildops/${BASENAME}.held-completion.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.held-completion.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (held-completion ${direction})`,
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
  status: 'COMPILED_FROM_ACCEPTED_GUIDEWAY02_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['PASSENGER-RAILWAY'],
  packages: [{ key: 'held-completion', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['held-completion'], rollback: ['held-completion'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    purpose: 'Complete the held guideway tube-S bed cells (cave air / granite over air) with polished_deepslate beds + stone support fills, and seal the flowing water column at (-180,-454) behind a polished_deepslate containment wall, preserving the water source.',
    guidewayBeds: classManifest(bedCells.map(({ x, z }) => ({ x, y: 12, z }))),
    supportFills: classManifest(unsupportedXZ.map(([x, z]) => ({ x, y: 11, z }))),
    waterSeal: classManifest(records.filter((r) => r.role === 'water-seal').map(({ cell }) => cell)),
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
    'held-completion': {
      role: 'guideway held-cell completion',
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
  bedCount: safeRecords.filter((r) => r.role === 'guideway-bed').length,
  supportCount: safeRecords.filter((r) => r.role === 'support-fill').length,
  sealCount: safeRecords.filter((r) => r.role === 'water-seal').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
