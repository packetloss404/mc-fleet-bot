#!/usr/bin/env node
/**
 * Independently verify the source-bound R11C dependency result.
 *
 * This verifier reads only immutable Anvil evidence and compiled operation
 * bytes. It performs no RCON call, service mutation, or world edit.
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
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11c-offline-20260821T184500Z/r11c-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T18:45:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11C offline QA rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const stateProperty = (state, property) => {
  const match = state.match(new RegExp(`(?:\\[|,)${property}=([^,\\]]+)`));
  return match?.[1] ?? null;
};
const isLeaf = (state) => /_leaves$/.test(blockName(state));
const isLeafSupportLog = (state) => /_(?:log|wood)$/.test(blockName(state));
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

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload)),
  'manifest identity does not bind its payload');
invariant(manifest.status === 'COMPILED_FROM_ACCEPTED_R08P_POST_AWAITING_FRESH_EXECUTION_KERNEL'
  && manifest.source.snapshotRoot
    === 'data/worldsnap-combined-zones-r08p-post-20260821T184147Z'
  && manifest.source.completeSaveSha256
    === 'bf3f03362e1c920e89cf6eadbbb46926dbf7a204acd8eeae5f0182951f1a4505',
'manifest is not bound to the accepted R08P terminal post');
invariant(manifest.packages.length === 1
  && manifest.packages[0].key === 'c1-east-at-grade-completion',
'manifest does not expose exactly one physical package');

const pkg = manifest.packages[0];
const operationPath = absolute(pkg.forward);
const records = parseOperations(operationPath);
const operationManifest = manifest.operations[pkg.key];
invariant(records.length === 1_109
  && bodySha256(operationPath) === operationManifest.forwardSha256,
'forward operation identity drifted');
const targetKeys = new Set(records.map(({ cell }) => cellKey(cell)));
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
for (const record of records) {
  const observedState = await stateAt(record.cell);
  if (observedState !== record.sourceState) {
    sourceMismatches.push({ cell: record.cell, observedState, expectedState: record.sourceState });
  }
}
invariant(sourceMismatches.length === 0,
  `operation source guards do not match R08P: ${JSON.stringify(sourceMismatches.slice(0, 10))}`);

const ownedLogRemovals = records.filter(({ sourceState, targetState }) => (
  isLeafSupportLog(sourceState) && !isLeafSupportLog(targetState)
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
      if (isLeafSupportLog(sourceState)) return distance + 1;
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
  projectedDistanceCensus[projectedDistance] = (projectedDistanceCensus[projectedDistance] ?? 0) + 1;
  if (persistent === 'false' && Number.isInteger(currentDistance)
    && currentDistance < 7 && projectedDistance >= 7) {
    provenDecayRisk.push(record);
  }
}
const leafPropertyTransitions = records.filter(({ sourceState, targetState }) => (
  isLeaf(sourceState)
  && blockName(sourceState) === blockName(targetState)
  && stateProperty(sourceState, 'persistent') !== stateProperty(targetState, 'persistent')
));

const expectedAudit = manifest.scope.geometry.retainedLeafDecayAudit;
invariant(ownedLogRemovals.length === 27
  && classManifest(ownedLogRemovals.map(({ cell }) => cell)).coordinateSetSha256
    === expectedAudit.ownedLogRemovals.coordinateSetSha256,
'owned log-removal identity drifted');
invariant(influenced.size === 235
  && classManifest([...influenced.values()].map(({ cell }) => cell)).coordinateSetSha256
    === expectedAudit.removalInfluencedRetainedLeaves.coordinateSetSha256,
'removal-influenced leaf identity drifted');
invariant(provenDecayRisk.length === 0 && leafPropertyTransitions.length === 0,
'source requires an undeclared leaf-property transition');
invariant(manifest.scope.geometry.exactGravityStabilization.cellCount === 0
  && records.every(({ sourceState }) => ![
    'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
    'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  ].includes(blockName(sourceState))),
'operation contains an undeclared gravity transition');

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
    exactSourceGuardMatches: records.length - sourceMismatches.length,
    physicalPackageCount: manifest.packages.length,
    ownedLogRemovalCount: ownedLogRemovals.length,
    removalInfluencedRetainedLeafCount: influenced.size,
    projectedRetainedLogDistanceCensus: projectedDistanceCensus,
    provenDecayRiskCount: provenDecayRisk.length,
    declaredLeafPropertyTransitionCount: leafPropertyTransitions.length,
    declaredGravityTransitionCount: 0,
    exactSourceBound: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    ownedLogRemovals: classManifest(ownedLogRemovals.map(({ cell }) => cell)),
    removalInfluencedRetainedLeaves:
      classManifest([...influenced.values()].map(({ cell }) => cell)),
    provenDecayRisk: classManifest(provenDecayRisk.map(({ cell }) => cell)),
    leafPropertyTransitions: classManifest(leafPropertyTransitions.map(({ cell }) => cell)),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify({
  ...reportWithoutIdentity,
  qaPayloadSha256,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: 'PASS',
  report: OUT_PATH,
  qaPayloadSha256,
  checks: reportWithoutIdentity.checks,
}, null, 2));
