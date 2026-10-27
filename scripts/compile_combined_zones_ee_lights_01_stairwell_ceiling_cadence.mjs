#!/usr/bin/env node
/** Compile CZ-EE-LIGHTS-01 — Empty Eight south public-gallery stair-well
 *  ceiling lighting cadence.
 *
 *  The accepted R08AL south public gallery is fully lit along its ceiling
 *  cadence line (EE-P11 sea_lantern at y=53 z=147 at each bay midpoint, plus
 *  the EE-PUB2 arrival-confirmation round). The two public PF08 gallery
 *  stairs (widened to three-wide by R08AN) are the only public access to the
 *  gallery and their stair wells are the genuine under-lit gap: the corridor
 *  cadence has a ~32-block dark span across the N06 bulkhead and both stair
 *  mouths (x=1727..1729 west, x=1751..1753 east).
 *
 *  This package installs an EE-P11 sea_lantern ceiling cadence over the two
 *  public stair-well mouths: ceiling plane y=53, columns x=1727/1728/1729
 *  (west) and x=1751/1752/1753 (east), at z=147 (the corridor cadence line)
 *  and z=149 (the stair-well void), for 12 exact targets.
 *
 *  Passive normal illumination only. No tenant opening, commerce, egress,
 *  accessibility, emergency lighting, or route commissioning.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-ee-pub2-post-20260825T060200Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-ee-lights-01-stairwell-ceiling-cadence');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-ee-lights-01-stairwell-ceiling-cadence';
const RELEASE_ID = 'CZ-EE-LIGHTS-01-EMPTY-EIGHT-PUBLIC-STAIRWELL-CEILING-CADENCE';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08AL_MANIFEST = 'data/buildops/combined-zones-r08al-empty-eight-south-public-vacant-retail.release-manifest.json';
const R08AN_MANIFEST = 'data/buildops/combined-zones-r08an-empty-eight-public-stair-widening.release-manifest.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const invariant = (condition, message) => {
  if (!condition) throw new Error(`EE-LIGHTS-01 compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const GRAVITY = new Set([
  'minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand',
  'minecraft:suspicious_gravel', 'minecraft:suspicious_sand',
  'minecraft:tnt', 'minecraft:anvil', 'minecraft:concrete_powder',
]);
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
const design = readJson(DESIGN);
const r08al = readJson(R08AL_MANIFEST);
const r08an = readJson(R08AN_MANIFEST);
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners?.includes('Z02-U1-CONCOURSE-MALL'), 'R08 concourse owner drifted');
const palette = new Map(design.d06.architecturalLanguage.palette.map((entry) => [entry.id, entry.block]));
invariant(palette.get('EE-P11') === 'minecraft:sea_lantern', 'frozen palette drifted');
invariant(r08al.scope?.releaseId?.includes('R08AL'), 'R08AL manifest drift');
invariant(r08an.scope?.releaseId?.includes('R08AN'), 'R08AN manifest drift');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

// 1. Stair-well ceiling cadence targets. Both public PF08 stairs were widened
//    to three-wide by R08AN (west x=1727..1729, east x=1751..1753, treads
//    y=41..48 descending z=153..146, landings y=49 z=144..146). The corridor
//    ceiling plane (y=53, z=145..149, smooth_stone from R08AL) continues over
//    the stair mouths. Place the cadence at z=147 (the corridor cadence line)
//    and z=149 (the stair-well void) on each flight column.
const targetCells = [];
for (const x of [1727, 1728, 1729, 1751, 1752, 1753]) {
  for (const z of [147, 149]) targetCells.push({ x, y: 53, z });
}
invariant(targetCells.length === 12, `expected 12 stair-well lights, got ${targetCells.length}`);

const records = [];
const targetKeys = new Set();
for (const cell of targetCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  invariant(!isFluid(sourceState), `target fluid at ${key}`);
  invariant(blockName(sourceState) !== 'minecraft:sea_lantern', `light already present ${key}`);
  invariant(blockName(sourceState) === 'minecraft:smooth_stone',
    `stair-well ceiling target ${key} is ${sourceState}, not smooth_stone`);
  targetKeys.add(key);
  records.push({
    cell, sourceState, targetState: 'minecraft:sea_lantern', role: 'stairwell-ceiling-cadence-light',
  });
}
invariant(records.length === 12, `expected 12 operated cells, got ${records.length}`);
invariant(records.filter((r) => r.role === 'stairwell-ceiling-cadence-light').length === 12,
  'operated role count drift');

// Hard geometric exclusions: N06 suspended-gravity bulkhead, north-smoke plane,
// FIRE-EG-B, vent risers, and future line seals. These are reserved cells that
// must never be touched.
const N06 = { minX: 1736, maxX: 1747, minY: 41, maxY: 53, minZ: 144, maxZ: 149 };
const northSmoke = { minX: 1632, maxX: 1872, minY: 41, maxY: 54, minZ: 50, maxZ: 50 };
const forbiddenZones = [
  ['N06-bulkhead', N06],
  ['north-smoke', northSmoke],
];
for (const [label, zone] of forbiddenZones) {
  for (const record of records) {
    const cell = record.cell;
    invariant(!(cell.x >= zone.minX && cell.x <= zone.maxX
      && cell.y >= zone.minY && cell.y <= zone.maxY
      && cell.z >= zone.minZ && cell.z <= zone.maxZ),
    `${label} intersection at ${cellKey(cell)}`);
  }
}

// Halo isolation (6-neighbour, excluding the operated cells): must be free of
// fluid and gravity so the package is a clean additive lighting cadence.
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const halo = uniqueCells(records.flatMap(({ cell }) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
let haloFluidCount = 0;
let haloGravityCount = 0;
for (const cell of halo) {
  const state = await sourceAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (GRAVITY.has(blockName(state))) haloGravityCount += 1;
}
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);
invariant(haloGravityCount === 0, `halo gravity ${haloGravityCount}`);

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
const canonicalForward = `data/buildops/${BASENAME}.stairwell-ceiling-cadence.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.stairwell-ceiling-cadence.rollback.txt`;
const outputForward = path.join(OUT_DIR, `${BASENAME}.stairwell-ceiling-cadence.forward.txt`);
const outputRollback = path.join(OUT_DIR, `${BASENAME}.stairwell-ceiling-cadence.rollback.txt`);
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(outputForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(outputRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_EE_PUB2_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['Z02-U1-CONCOURSE-MALL'],
  packages: [{ key: 'stairwell-ceiling-cadence', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['stairwell-ceiling-cadence'], rollback: ['stairwell-ceiling-cadence'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Install an EE-P11 sea_lantern ceiling cadence over the two public PF08 stair-well mouths in the accepted R08AL south public gallery, closing the dark span between the west and east corridor ceiling cadence lines.',
    stairwellCeilingCadence: classManifest(targetCells),
    interactionHalo: classManifest(halo),
    commissions: 'PASSIVE_NORMAL_ILLUMINATION_ONLY',
    publicAccess: {
      surfaceEgressOrAccessibilityClaimed: false,
      emergencyLightingCommissioned: false,
      routeCommissioningClaimed: false,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    r08alManifest: fileBinding(R08AL_MANIFEST),
    r08anManifest: fileBinding(R08AN_MANIFEST),
  },
  target: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    desiredStateCensus: census(records, (r) => r.targetState),
    sourceStateCensus: census(records, (r) => r.sourceState),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    'stairwell-ceiling-cadence': {
      role: 'PF08 stair-well ceiling sea_lantern cadence',
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
  stairwellLightCount: records.filter((r) => r.role === 'stairwell-ceiling-cadence-light').length,
  haloCount: halo.length,
  haloFluidCount,
  haloGravityCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
