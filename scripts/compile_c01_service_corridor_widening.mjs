#!/usr/bin/env node
/** Compile the C01 service-corridor widening (reroute around barrels).
 *
 * The C01 service backbone corridor at x=866 (y43) was 1-wide through the
 * barrel section (z=-115..-105) because 4 obstruction cells at x=866 blocked
 * the west column while x=868 stayed open. Clearing those 4 cells to air makes
 * x=866 AND x=868 both walkable — a 2-wide corridor routing AROUND the barrel
 * stacks (no barrel is touched).
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
const GENERATED_AT = value('--generated-at', '2026-08-25T01:15:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'c01-service-corridor-widening');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'c01-service-corridor-widening';
const RELEASE_ID = 'C01-SERVICE-CORRIDOR-WIDEN';
const RELEASE_NODE_ID = 'CZ-C01-BUNKER';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`C01-service compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
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

// The 4 remaining obstruction cells at x=866, y=43 to clear to air for full
// 2-wide (the other 4 were cleared by the first execution pass).
const targetCells = [
  { x: 866, y: 43, z: -121 },
  { x: 866, y: 43, z: -114 },
  { x: 866, y: 43, z: -104 },
  { x: 866, y: 43, z: -103 },
];

const records = [];
const targetKeys = new Set();
for (const cell of targetCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  invariant(!isFluid(sourceState), `fluid source at ${key}`);
  invariant(!GRAVITY.has(blockName(sourceState)), `gravity source at ${key}`);
  invariant(blockName(sourceState) !== 'minecraft:barrel', `barrel at ${key} — must not touch`);
  targetKeys.add(key);
  records.push({ cell, sourceState, targetState: 'minecraft:air', role: 'corridor-widen' });
}
invariant(records.length === 4, `expected 4 cells, got ${records.length}`);

const ordered = records.slice().sort((a, b) => a.cell.z - b.cell.z);
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
const canonicalForward = `data/buildops/${BASENAME}.corridor-widen.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.corridor-widen.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (corridor-widen ${direction})`,
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
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R08AM_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['TE-C01-BUNKER'],
  packages: [{ key: 'corridor-widen', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['corridor-widen'], rollback: ['corridor-widen'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'TOWN-EXPANSION-C01-BUNKER',
    purpose: 'Widen the C01 service corridor to 2-wide through the barrel section by clearing the 4 obstruction cells at x=866, routing around (never through) the barrel stacks.',
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
    'corridor-widen': {
      role: 'service corridor 2-wide widen',
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
    barrelCellsUntouched: true,
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
