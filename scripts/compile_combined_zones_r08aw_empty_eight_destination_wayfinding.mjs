#!/usr/bin/env node
/** Compile CZ-R08AW — Empty Eight south public-gallery destination wayfinding.
 *
 * The R08AL public gallery route is 191+ blocks with zero destination markers.
 * This installs:
 *  - EE-P05 red_terracotta orientation band along the gallery north floor edge
 *    (y=49, z=145, x=1653..1734 and x=1749..1842, skipping the N06 bulkhead
 *    x=1736..1747);
 *  - EE-P14 blue_glazed_terracotta destination datums on the north wall
 *    (y=50, z=144) at the EG-A egress (x=1652) and each of the eleven public
 *    bay doors.
 * Passive orientation only. No tenant opening, commerce, egress, accessibility,
 * or route commissioning.
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
const GENERATED_AT = value('--generated-at', '2026-08-24T17:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08am-post-20260822T161818Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-r08aw-empty-eight-destination-wayfinding');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-r08aw-empty-eight-destination-wayfinding';
const RELEASE_ID = 'CZ-R08AW-EMPTY-EIGHT-SOUTH-PUBLIC-GALLERY-DESTINATION-WAYFINDING';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08AL_MANIFEST = 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08AW compiler rejected: ${message}`);
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

const contract = readJson(CONTRACT);
const authorization = readJson(AUTHORIZATION);
const r08al = readJson(R08AL_MANIFEST);
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
invariant(r08al.scope?.releaseId?.includes('R08AL'), 'R08AL manifest drift');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

// Orientation band: y=49, z=145, x=1653..1734 and x=1749..1842.
const bandCells = [];
for (let x = 1653; x <= 1734; x += 1) bandCells.push({ x, y: 49, z: 145 });
for (let x = 1749; x <= 1842; x += 1) bandCells.push({ x, y: 49, z: 145 });
invariant(bandCells.length === 176, `orientation band must be 176 cells, got ${bandCells.length}`);

// Destination datums: EG-A egress (1652) + 11 bay doors.
const bayDoors = r08al.scope.publicAccess.publicBayRecords.map((b) => b.publicSmokeDoor.x);
invariant(bayDoors.length === 11, `expected 11 bay doors, got ${bayDoors.length}`);
const datumCells = [
  { x: 1652, y: 50, z: 144 },
  ...bayDoors.map((x) => ({ x, y: 50, z: 144 })),
];
invariant(datumCells.length === 12, `expected 12 datums, got ${datumCells.length}`);

const records = [];
const targetKeys = new Set();
for (const cell of bandCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate band ${key}`);
  invariant(!isFluid(sourceState), `band fluid at ${key}`);
  targetKeys.add(key);
  if (sourceState !== 'minecraft:red_terracotta') {
    records.push({ cell, sourceState, targetState: 'minecraft:red_terracotta', role: 'orientation-band' });
  }
}
for (const cell of datumCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate datum ${key}`);
  invariant(!isFluid(sourceState), `datum fluid at ${key}`);
  targetKeys.add(key);
  if (sourceState !== 'minecraft:blue_glazed_terracotta[facing=south]') {
    records.push({
      cell, sourceState, targetState: 'minecraft:blue_glazed_terracotta[facing=south]', role: 'destination-datum',
    });
  }
}
invariant(records.length === 188, `expected 188 operated cells, got ${records.length}`);
invariant(records.filter((r) => r.role === 'orientation-band').length === 176,
  'orientation band operated count drift');
invariant(records.filter((r) => r.role === 'destination-datum').length === 12,
  'destination datum operated count drift');

// Halo isolation.
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

const ordered = records.slice().sort((a, b) => (
  a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z
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
const canonicalForward = `data/buildops/${BASENAME}.destination-wayfinding.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.destination-wayfinding.rollback.txt`;
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (destination-wayfinding ${direction})`,
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
  scopeIds: ['Z02-U1-CONCOURSE-MALL'],
  packages: [{ key: 'destination-wayfinding', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['destination-wayfinding'], rollback: ['destination-wayfinding'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Install the EE-P05 red_terracotta orientation band and EE-P14 blue_glazed_terracotta destination datums on the accepted R08AL south public gallery route.',
    orientationBand: classManifest(bandCells),
    destinationDatums: classManifest(datumCells),
    interactionHalo: classManifest(halo),
    commissions: 'PASSIVE_ORIENTATION_ONLY',
  },
  source: {
    snapshotRoot: SNAPSHOT,
    r08alManifest: fileBinding(R08AL_MANIFEST),
  },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'destination-wayfinding': {
      role: 'orientation band + destination datums',
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
  bandCount: records.filter((r) => r.role === 'orientation-band').length,
  datumCount: records.filter((r) => r.role === 'destination-datum').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
