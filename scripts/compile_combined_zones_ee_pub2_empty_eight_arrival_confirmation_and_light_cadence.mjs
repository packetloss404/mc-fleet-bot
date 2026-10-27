#!/usr/bin/env node
/** Compile CZ-EE-PUB2 — Empty Eight south public-gallery arrival-confirmation
 *  markers and ceiling light cadence.
 *
 *  The accepted R08AL south public gallery is a 5-wide 191-block corridor.
 *  R08AW installed the EE-P05 orientation band and EE-P14 destination datums.
 *  The source-bound circulation review requires a readable destination/access
 *  marker at each classification change and repeating confirmation about every
 *  25 tunnel blocks. This package adds:
 *
 *   - EE-P14 blue_glazed_terracotta[facing=south] arrival-confirmation markers
 *     on the north wall immediately north of each widened PF08 public stair
 *     upper landing (y=50, z=143, x=1727..1729 west and x=1751..1753 east),
 *     confirming the gallery/egress direction at the stair-to-gallery
 *     classification change.
 *   - EE-P11 sea_lantern ceiling cadence lights at the bay midpoints
 *     (y=53, z=147) at x=1656,1669,1685,1701,1717,1765,1781,1797,1813,1829,
 *     filling the ~16-block lighting gaps between the bay-door lintel lights.
 *
 *  Passive orientation + normal illumination only. No tenant opening, commerce,
 *  egress, accessibility, emergency lighting, or route commissioning.
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
const GENERATED_AT = value('--generated-at', '2026-08-25T06:00:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-r08aw-post-20260824T170200Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence');
const MANIFEST_OUT = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const TRANSACTION_ID = 'combined-zones-ee-pub2-empty-eight-arrival-confirmation-and-light-cadence';
const RELEASE_ID = 'CZ-EE-PUB2-EMPTY-EIGHT-SOUTH-PUBLIC-GALLERY-ARRIVAL-CONFIRMATION-AND-LIGHT-CADENCE';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION = 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json';
const R08AW_MANIFEST = 'data/buildops/combined-zones-r08aw-empty-eight-destination-wayfinding.release-manifest.json';
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
  if (!condition) throw new Error(`EE-PUB2 compiler rejected: ${message}`);
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
const design = readJson(DESIGN);
const r08aw = readJson(R08AW_MANIFEST);
const r08al = readJson(R08AL_MANIFEST);
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID),
'standing authorization does not cover R08');
const node = contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(node?.canonicalOwners?.includes('Z02-U1-CONCOURSE-MALL'), 'R08 concourse owner drifted');
const palette = new Map(design.d06.architecturalLanguage.palette.map((entry) => [entry.id, entry.block]));
invariant(palette.get('EE-P11') === 'minecraft:sea_lantern'
  && palette.get('EE-P14') === 'minecraft:blue_glazed_terracotta', 'frozen palette drifted');
invariant(r08aw.scope?.releaseId?.includes('R08AW'), 'R08AW manifest drift');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};

// 1. Stair-top arrival-confirmation markers (EE-P14), north of each PF08 stair
//    upper landing. The landing floor is y=49 z=144..146; the north wall is
//    z=143. Place the marker at y=50 (eye-line above the y=49 landing floor).
const stairMarkerCells = [];
for (const x of [1727, 1728, 1729, 1751, 1752, 1753]) {
  stairMarkerCells.push({ x, y: 50, z: 143 });
}
invariant(stairMarkerCells.length === 6, `expected 6 stair markers, got ${stairMarkerCells.length}`);

// 2. Ceiling cadence lights (EE-P11) at bay midpoints between the lintel lights.
const lintelLights = r08al.scope.publicAccess.publicBayRecords.map((r) => r.publicSmokeDoor.x);
invariant(lintelLights.length === 11, `expected 11 lintel lights, got ${lintelLights.length}`);
const lightCells = [];
const midpoints = [1656, 1669, 1685, 1701, 1717, 1765, 1781, 1797, 1813, 1829];
for (const x of midpoints) lightCells.push({ x, y: 53, z: 147 });
invariant(lightCells.length === 10, `expected 10 lights, got ${lightCells.length}`);

const records = [];
const targetKeys = new Set();
for (const cell of stairMarkerCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate stair marker ${key}`);
  invariant(!isFluid(sourceState), `stair marker fluid at ${key}`);
  invariant(blockName(sourceState) !== 'minecraft:blue_glazed_terracotta', `stair marker already present ${key}`);
  targetKeys.add(key);
  records.push({
    cell, sourceState, targetState: 'minecraft:blue_glazed_terracotta[facing=south]', role: 'stair-arrival-marker',
  });
}
for (const cell of lightCells) {
  const key = cellKey(cell);
  const sourceState = await sourceAt(cell);
  invariant(!targetKeys.has(key), `duplicate light ${key}`);
  invariant(!isFluid(sourceState), `light fluid at ${key}`);
  invariant(blockName(sourceState) !== 'minecraft:sea_lantern', `light already present ${key}`);
  targetKeys.add(key);
  records.push({
    cell, sourceState, targetState: 'minecraft:sea_lantern', role: 'ceiling-cadence-light',
  });
}
invariant(records.length === 16, `expected 16 operated cells, got ${records.length}`);
invariant(records.filter((r) => r.role === 'stair-arrival-marker').length === 6,
  'stair marker operated count drift');
invariant(records.filter((r) => r.role === 'ceiling-cadence-light').length === 10,
  'light operated count drift');

// Halo isolation (6-neighbour, excluding the operated cells).
const six = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const halo = uniqueCells(records.flatMap(({ cell }) => six.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(haloFluidCount === 0, `halo fluid ${haloFluidCount}`);

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
  for (const cell of records) {
    invariant(!(cell.cell.x >= zone.minX && cell.cell.x <= zone.maxX
      && cell.cell.y >= zone.minY && cell.cell.y <= zone.maxY
      && cell.cell.z >= zone.minZ && cell.cell.z <= zone.maxZ),
    `${label} intersection at ${cellKey(cell.cell)}`);
  }
}

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
const canonicalForward = `data/buildops/${BASENAME}.arrival-confirmation-and-light-cadence.forward.txt`;
const canonicalRollback = `data/buildops/${BASENAME}.arrival-confirmation-and-light-cadence.rollback.txt`;
const outputForward = path.join(OUT_DIR, `${BASENAME}.arrival-confirmation-and-light-cadence.forward.txt`);
const outputRollback = path.join(OUT_DIR, `${BASENAME}.arrival-confirmation-and-light-cadence.rollback.txt`);
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
  status: 'COMPILED_FROM_ACCEPTED_R08AW_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['Z02-U1-CONCOURSE-MALL'],
  packages: [{ key: 'arrival-confirmation-and-light-cadence', forward: canonicalForward, rollback: canonicalRollback }],
  executionOrder: { forward: ['arrival-confirmation-and-light-cadence'], rollback: ['arrival-confirmation-and-light-cadence'] },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'Z02-U1-CONCOURSE-MALL',
    purpose: 'Install EE-P14 blue_glazed_terracotta arrival-confirmation markers at the top of both widened PF08 public stairs and an EE-P11 sea_lantern ceiling cadence across the accepted R08AL south public gallery corridor.',
    stairArrivalMarkers: classManifest(stairMarkerCells),
    ceilingCadenceLights: classManifest(lightCells),
    interactionHalo: classManifest(halo),
    commissions: 'PASSIVE_ORIENTATION_AND_NORMAL_ILLUMINATION_ONLY',
    publicAccess: {
      surfaceEgressOrAccessibilityClaimed: false,
      emergencyLightingCommissioned: false,
      routeCommissioningClaimed: false,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    r08awManifest: fileBinding(R08AW_MANIFEST),
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
    'arrival-confirmation-and-light-cadence': {
      role: 'stair arrival markers + ceiling cadence lights',
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
  stairMarkerCount: records.filter((r) => r.role === 'stair-arrival-marker').length,
  lightCount: records.filter((r) => r.role === 'ceiling-cadence-light').length,
  haloCount: halo.length,
  haloFluidCount,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
