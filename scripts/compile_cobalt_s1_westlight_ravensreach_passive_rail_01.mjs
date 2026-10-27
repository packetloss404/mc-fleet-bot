#!/usr/bin/env node
/**
 * Compile Cobalt-S1's first passive-rail slice.
 *
 * The release is deliberately limited to two 18-cell, unpowered, east-west
 * rails in the already-lined Westlight approach tubes.  It is independent of
 * the R10 normal-alignment and north-turn fluid/gravity holds: neither their
 * cells nor their immediate interaction halos are in this package.
 *
 * This is an offline compiler.  It never contacts Minecraft/RCON and its
 * output is not execution authority; a fresh same-moment source and the full
 * guarded-release kernel remain mandatory immediately before mutation.
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
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-running-tube9-post-20260826T053200Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-s1-westlight-ravensreach-passive-rail-01');
const GENERATED_AT = value('--generated-at', '2026-08-26T00:00:00Z');
const RELEASE_ID = 'COBALT-S1-WESTLIGHT-RAVENSREACH-PASSIVE-RAIL-01';
const RELEASE_NODE_ID = 'CZ-SYS03-COBALT-STATION-PAIR-PASSIVE-RAIL';
const AUTHORIZATION_PATH = 'docs/masterplans/05-combined-zones/sys03-cobalt-station-pair-governor-standing-execution-authorization.json';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const exact = (cells) => {
  const set = uniqueCells(cells);
  return {
    cellCount: set.length,
    bounds: set.length ? boundsOf(set) : null,
    coordinateSetSha256: hashCells(set),
  };
};
const base = (state) => state.split('[', 1)[0];
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);
const isFluid = (state) => FLUID.has(base(state)) || state.includes('waterlogged=true');
const stateCensus = (records, field) => Object.fromEntries([...records.reduce((counts, record) => {
  const state = record[field];
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const overlaps = (left, right) => left.x >= right.minX && left.x <= right.maxX
  && left.y >= right.minY && left.y <= right.maxY
  && left.z >= right.minZ && left.z <= right.maxZ;

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), `missing complete-save capture record at ${capturePath}`);
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true, 'snapshot does not declare immutableCopy=true');
fail(Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0,
  'snapshot has no required complete-save members');
for (const member of capture.requiredMembers) {
  const memberPath = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(memberPath), `required source member missing: ${member.path}`);
  fail(fs.statSync(memberPath).size === member.bytes, `required source member size drifted: ${member.path}`);
  fail(sha256(fs.readFileSync(memberPath)) === member.sha256,
    `required source member hash drifted: ${member.path}`);
}

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

// The x=-236 diaphragm is retained; this prevents this first slice from
// becoming a through route or touching the next civil segment.
const TRACKS = [
  { id: 'north-westbound', railZ: -461, interiorZ: [-461, -460], wallZ: [-462, -459] },
  { id: 'south-eastbound', railZ: -455, interiorZ: [-455, -454], wallZ: [-456, -453] },
];
const X_MIN = -254;
const X_MAX = -237;
const RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const targetCells = [];
const supportCells = [];
const headroomCells = [];
const shellCells = [];
for (let x = X_MIN; x <= X_MAX; x += 1) {
  for (const track of TRACKS) {
    targetCells.push({ x, y: 13, z: track.railZ, track: track.id });
    supportCells.push({ x, y: 12, z: track.railZ });
    for (let y = 14; y <= 16; y += 1) headroomCells.push({ x, y, z: track.railZ });
    for (const z of track.wallZ) {
      for (let y = 13; y <= 16; y += 1) shellCells.push({ x, y, z });
    }
  }
}
const diaphragmCells = [];
for (const track of TRACKS) {
  for (let y = 13; y <= 16; y += 1) {
    for (const z of [...track.wallZ, ...track.interiorZ]) diaphragmCells.push({ x: -236, y, z });
  }
}
const interactionHalo = uniqueCells([
  ...targetCells.map(({ x, y, z }) => ({ x, y, z })),
  ...supportCells,
  ...headroomCells,
  ...shellCells,
  ...diaphragmCells,
]);

const heldEnvelopes = [
  {
    id: 'R10-NORMAL-ALIGNMENT-FLUID-GRAVITY-HOLD',
    bounds: { minX: -75, maxX: -56, minY: 12, maxY: 47, minZ: -472, maxZ: -453 },
  },
  {
    id: 'R10-NORTH-TURN-WATER-BUBBLE-HOLD',
    bounds: { minX: 25, maxX: 30, minY: 42, maxY: 47, minZ: -472, maxZ: -453 },
  },
];
const holdExclusions = heldEnvelopes.map((hold) => {
  const hits = interactionHalo.filter((cell) => overlaps(cell, hold.bounds));
  fail(hits.length === 0, `${hold.id} intersects the local interaction set`);
  return {
    id: hold.id,
    bounds: hold.bounds,
    interactionOverlapCellCount: hits.length,
    nearestXSeparation: hold.bounds.minX - X_MAX,
  };
});

const records = [];
for (const target of targetCells) {
  const cell = { x: target.x, y: target.y, z: target.z };
  const sourceState = await stateAt(cell);
  fail(sourceState === 'minecraft:air', `rail target is not dry air at ${cellKey(cell)} (${sourceState})`);
  records.push({ cell, sourceState, targetState: RAIL, track: target.track });
}
for (const cell of supportCells) {
  const state = await stateAt(cell);
  fail(state === 'minecraft:polished_deepslate', `support drift at ${cellKey(cell)} (${state})`);
}
for (const cell of headroomCells) {
  const state = await stateAt(cell);
  fail(state === 'minecraft:air', `headroom drift at ${cellKey(cell)} (${state})`);
}
for (const cell of [...shellCells, ...diaphragmCells]) {
  const state = await stateAt(cell);
  fail(state === 'minecraft:polished_deepslate', `liner/diaphragm drift at ${cellKey(cell)} (${state})`);
}
for (const cell of interactionHalo) {
  const state = await stateAt(cell);
  fail(!isFluid(state), `fluid in interaction set at ${cellKey(cell)} (${state})`);
  fail(!GRAVITY.has(base(state)), `gravity block in interaction set at ${cellKey(cell)} (${state})`);
  fail(!FORBIDDEN.has(base(state)), `protected block in interaction set at ${cellKey(cell)} (${state})`);
}

const ordered = records.slice().sort((left, right) => left.cell.x - right.cell.x
  || left.cell.z - right.cell.z);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.passive-rail.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.passive-rail.rollback.txt`);
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (passive rail ${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(records.map(({ cell }) => cell))}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(abs(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: false,
  scopeIds: ['SYS-03', 'PASSENGER-RAILWAY'],
  packages: [{ key: 'passive-rail', forward: rel(forward), rollback: rel(rollback) }],
  executionOrder: { forward: ['passive-rail'], rollback: ['passive-rail'] },
  scopedRunner: {
    wrapper: 'scripts/run_combined_zones_scoped_release.mjs',
    authorization: AUTHORIZATION_PATH,
    releaseNodeId: RELEASE_NODE_ID,
    packagePathsMustRemainUnder: 'data/buildops',
    defaultMode: 'PREPARE_ONLY',
    liveExecutionOptIn: '--execute',
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveCapture: {
      path: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
      sha256: sha256(captureBytes),
      captureId: capture.captureId,
      capturedAtUtc: capture.capturedAtUtc,
      immutableCopy: capture.immutableCopy,
      verifiedRequiredMemberCount: capture.requiredMembers.length,
    },
  },
  scope: {
    releaseId: RELEASE_ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    governorDelegatedRoles: {
      scopeOwner: 'Passenger Railway implementation lead',
      counterpartOwner: 'SYS-03 civil interface lead',
      safetyAndRecoveryOwner: 'Passenger Railway safety/recovery lead',
      releaseOperator: 'Guarded-release implementation operator',
    },
    purpose: 'Place two isolated, unpowered passive rail slices in the built Westlight approach tubes. No route, platform, cart, power, signal, passenger, or public-service operation is enabled.',
    selectedStationPair: 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)',
    tracks: TRACKS.map(({ id, railZ }) => ({ id, x: [X_MIN, X_MAX], y: 13, z: railZ, cellCount: X_MAX - X_MIN + 1 })),
    railCells: exact(records.map(({ cell }) => cell)),
    supportCells: exact(supportCells),
    headroomCells: exact(headroomCells),
    sideLinerCells: exact(shellCells),
    retainedDiaphragmCells: exact(diaphragmCells),
    interactionSet: exact(interactionHalo),
    holdsExplicitlyExcluded: holdExclusions,
    routeCommissioned: false,
    passengerServiceCommissioned: false,
  },
  target: {
    operatedUnion: exact(records.map(({ cell }) => cell)),
    sourceStateCensus: stateCensus(records, 'sourceState'),
    desiredStateCensus: stateCensus(records, 'targetState'),
    packageTargetsDisjoint: true,
  },
  operations: {
    'passive-rail': {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: ordered.length,
      rollbackCommandCount: ordered.length,
      targetCellCount: ordered.length,
      targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
      exactInverse: true,
    },
  },
  hardStops: {
    requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true,
    requiresSourceToReproveExactRailSupportHeadroomAndLinerStates: true,
    requiresBlockEntityAndLiveEntityClearance: true,
    requiresStrictNoopForwardAndRollbackChecks: true,
    requiresExactSourcePreflight: true,
    requiresJournaledStrictExecution: true,
    requiresFreshPostSnapshotAndRollbackPoststatePreflight: true,
    requiresFunctionalPassiveRailIsolationQa: true,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
    noExternalSignaturesRequired: true,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(abs(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: rel(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)),
  targetCount: records.length,
  interactionSetCount: interactionHalo.length,
  holdExclusions,
  manifestIdentity,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
