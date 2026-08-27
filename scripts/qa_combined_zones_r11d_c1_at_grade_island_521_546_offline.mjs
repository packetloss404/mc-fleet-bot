#!/usr/bin/env node
/**
 * Independent offline QA for the source-bound CZ-R11D at-grade island.
 *
 * Reads immutable Anvil evidence and compiled operation bytes only. It makes
 * no RCON call, service mutation, or world edit.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11d-offline-20260821T191000Z/r11d-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T19:10:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11D offline QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
const isLeaf = (state) => /_leaves$/.test(blockName(state));
const isLog = (state) => /_(?:log|wood)$/.test(blockName(state));
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(filename, 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);

function parseOperations(filename) {
  const records = [];
  const keys = new Set();
  for (const raw of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `unsupported operation: ${raw}`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `operation is not one exact cell: ${raw}`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!keys.has(cellKey(cell)), `duplicate operation target ${cellKey(cell)}`);
    keys.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

function componentCount(cells) {
  const unvisited = new Set(cells.map(cellKey));
  let count = 0;
  while (unvisited.size) {
    count += 1;
    const start = unvisited.values().next().value;
    unvisited.delete(start);
    const queue = [start];
    while (queue.length) {
      const [x, y, z] = queue.pop().split(',').map(Number);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const neighbour = `${x + dx},${y + dy},${z + dz}`;
            if (unvisited.delete(neighbour)) queue.push(neighbour);
          }
        }
      }
    }
  }
  return count;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload)),
  'manifest identity does not bind its payload');
invariant(manifest.status
    === 'COMPILED_FROM_ACCEPTED_R11C_POST_AWAITING_FRESH_EXECUTION_KERNEL'
  && manifest.source.snapshotRoot
    === 'data/worldsnap-combined-zones-r11c-post-20260821T185813Z'
  && manifest.source.completeSaveSha256
    === 'a4e7f8a9066ef0818436b4d3c92e594daa91fb4136cd8d7603988bed565ce219',
'manifest is not bound to accepted R11C post');
invariant(manifest.packages.length === 1
  && manifest.packages[0].key === 'c1-island-521-546-at-grade-pavement',
'manifest does not expose exactly one physical package');

const pkg = manifest.packages[0];
const forwardPath = absolute(pkg.forward);
const rollbackPath = absolute(pkg.rollback);
const forward = parseOperations(forwardPath);
const rollback = parseOperations(rollbackPath);
const operationManifest = manifest.operations[pkg.key];
invariant(forward.length === 1_284 && rollback.length === 1_284,
  'operation count is not 1,284/1,284');
invariant(bodySha256(forwardPath) === operationManifest.forwardSha256
  && bodySha256(rollbackPath) === operationManifest.rollbackSha256,
'operation body identity drifted');
for (let index = 0; index < forward.length; index += 1) {
  const source = forward[index];
  const inverse = rollback[rollback.length - index - 1];
  invariant(cellKey(source.cell) === cellKey(inverse.cell)
    && source.sourceState === inverse.targetState
    && source.targetState === inverse.sourceState,
  `rollback is not the exact reverse-order inverse at record ${index}`);
}

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) {
    stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return stateCache.get(key);
};
const sourceMismatches = [];
for (const record of forward) {
  const observedState = await stateAt(record.cell);
  if (observedState !== record.sourceState) {
    sourceMismatches.push({ cell: record.cell, observedState, expectedState: record.sourceState });
  }
}
invariant(sourceMismatches.length === 0,
  `source guards do not match R11C: ${JSON.stringify(sourceMismatches.slice(0, 10))}`);

const targetByKey = new Map(forward.map((record) => [cellKey(record.cell), record.targetState]));
const projectedState = async (cell) => targetByKey.get(cellKey(cell)) ?? stateAt(cell);
const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const surface = forward.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
const foundation = forward.filter(({ targetState }) => targetState === 'minecraft:stone_bricks');
const headroomCuts = forward.filter(({ targetState }) => targetState === 'minecraft:air');
const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
const headroomFailures = [];
for (const cell of fullHeadroom) {
  const state = await projectedState(cell);
  if (state !== 'minecraft:air' && state !== 'minecraft:cave_air'
    && state !== 'minecraft:void_air') headroomFailures.push({ cell, state });
}
invariant(surface.length === 476 && componentCount(surface.map(({ cell }) => cell)) === 1,
  'projected pavement is not the exact connected 476-cell island');
invariant(foundation.length === 329 && headroomCuts.length === 479
  && fullHeadroom.length === 952 && headroomFailures.length === 0,
'projected foundation/headroom identity failed');

const targetKeys = new Set(forward.map(({ cell }) => cellKey(cell)));
const ownedLogRemovals = forward.filter(({ sourceState, targetState }) => (
  isLog(sourceState) && !isLog(targetState)
));
const DIRECTIONS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const influenced = new Map();
const influenceDepth = new Map(ownedLogRemovals.map(({ cell }) => [cellKey(cell), 0]));
const influenceQueue = ownedLogRemovals.map(({ cell }) => ({ cell, depth: 0 }));
while (influenceQueue.length) {
  const { cell, depth } = influenceQueue.shift();
  if (depth >= 6) continue;
  for (const [dx, dy, dz] of DIRECTIONS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    const key = cellKey(neighbour);
    const nextDepth = depth + 1;
    if ((influenceDepth.get(key) ?? Infinity) <= nextDepth) continue;
    const sourceState = await stateAt(neighbour);
    if (!isLeaf(sourceState)) continue;
    influenceDepth.set(key, nextDepth);
    influenceQueue.push({ cell: neighbour, depth: nextDepth });
    if (!targetKeys.has(key)) influenced.set(key, { cell: neighbour, sourceState });
  }
}
const retainedLogDistance = async (start) => {
  const visited = new Set([cellKey(start)]);
  const queue = [{ cell: start, distance: 0 }];
  while (queue.length) {
    const { cell, distance } = queue.shift();
    if (distance >= 6) continue;
    for (const [dx, dy, dz] of DIRECTIONS) {
      const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
      const key = cellKey(neighbour);
      if (targetKeys.has(key) || visited.has(key)) continue;
      const sourceState = await stateAt(neighbour);
      if (isLog(sourceState)) return distance + 1;
      if (!isLeaf(sourceState)) continue;
      visited.add(key);
      queue.push({ cell: neighbour, distance: distance + 1 });
    }
  }
  return 7;
};
const projectedDistanceCensus = {};
const provenDecayRisk = [];
for (const record of influenced.values()) {
  const currentDistance = Number(stateProperty(record.sourceState, 'distance'));
  const persistent = stateProperty(record.sourceState, 'persistent');
  const projectedDistance = await retainedLogDistance(record.cell);
  projectedDistanceCensus[projectedDistance]
    = (projectedDistanceCensus[projectedDistance] ?? 0) + 1;
  if (persistent === 'false' && Number.isInteger(currentDistance)
    && currentDistance < 7 && projectedDistance >= 7) provenDecayRisk.push(record);
}
const expectedLeafAudit = manifest.scope.geometry.retainedLeafDecayAudit;
invariant(ownedLogRemovals.length === 105
  && classManifest(ownedLogRemovals.map(({ cell }) => cell)).coordinateSetSha256
    === expectedLeafAudit.ownedLogRemovals.coordinateSetSha256,
'owned log-removal identity drifted');
invariant(influenced.size === 292
  && classManifest([...influenced.values()].map(({ cell }) => cell)).coordinateSetSha256
    === expectedLeafAudit.removalInfluencedRetainedLeaves.coordinateSetSha256,
'removal-influenced leaf identity drifted');
invariant(provenDecayRisk.length === 0
  && manifest.scope.geometry.exactGravityStabilization.cellCount === 0,
'source requires an undeclared dependency transition');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY',
  manifest: {
    path: MANIFEST_PATH,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: {
    snapshotRoot: manifest.source.snapshotRoot,
    completeSaveSha256: manifest.source.completeSaveSha256,
  },
  checks: {
    exactSourceGuardMatches: forward.length - sourceMismatches.length,
    exactForwardTargetCount: forward.length,
    exactReverseRollbackCount: rollback.length,
    connectedSurfaceCellCount: surface.length,
    connectedSurfaceComponentCount: componentCount(surface.map(({ cell }) => cell)),
    foundationFillCount: foundation.length,
    headroomCutCount: headroomCuts.length,
    fullTwoBlockHeadroomCount: fullHeadroom.length,
    headroomFailureCount: headroomFailures.length,
    preservedCandidateExceptionCount:
      manifest.scope.geometry.preservedCandidateExceptions.cellCount,
    ownedLogRemovalCount: ownedLogRemovals.length,
    removalInfluencedRetainedLeafCount: influenced.size,
    projectedRetainedLogDistanceCensus: projectedDistanceCensus,
    provenDecayRiskCount: provenDecayRisk.length,
    declaredLeafPropertyTransitionCount: 0,
    declaredGravityTransitionCount: 0,
    heldStationMutationCount: manifest.compileGuards.heldStationMutationCount,
    routeCommissioned: manifest.compileGuards.routeCommissioned,
    exactSourceBound: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    operatedUnion: classManifest(forward.map(({ cell }) => cell)),
    surface: classManifest(surface.map(({ cell }) => cell)),
    foundation: classManifest(foundation.map(({ cell }) => cell)),
    headroomCuts: classManifest(headroomCuts.map(({ cell }) => cell)),
    fullHeadroom: classManifest(fullHeadroom),
    ownedLogRemovals: classManifest(ownedLogRemovals.map(({ cell }) => cell)),
    removalInfluencedRetainedLeaves:
      classManifest([...influenced.values()].map(({ cell }) => cell)),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
