#!/usr/bin/env node
/** Independent immutable-source QA for CZ-R11E. Offline/read-only only. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import { blockName, classManifest, stateProperty } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11e-c1-disjoint-at-grade-islands-batch.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-offline-20260821T195000Z/r11e-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T19:50:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E offline QA rejected: ${message}`);
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);

function parseOperations(filename) {
  const records = [];
  const keys = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `unsupported operation: ${raw}`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `operation is not one cell: ${raw}`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!keys.has(cellKey(cell)), `duplicate package target ${cellKey(cell)}`);
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
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    while (queue.length) {
      const [x, y, z] = queue.pop().split(',').map(Number);
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if (!dx && !dy && !dz) continue;
            const key = `${x + dx},${y + dy},${z + dz}`;
            if (unvisited.delete(key)) queue.push(key);
          }
        }
      }
    }
  }
  return count;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...payload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(payload)),
'manifest identity does not bind its payload');
invariant(manifest.status
    === 'COMPILED_FROM_ACCEPTED_R11D_POST_OFFLINE_BATCH_AWAITING_FRESH_EXECUTION_KERNEL'
  && manifest.source.completeSaveSha256
    === 'b18af0b34c2156c51d2cdf4e8ade401efdcfd184c35787709c7048e5ba4cebe6'
  && manifest.source.sourceLedgerCompletedReleaseIdentitySha256
    === 'e0b07df1f9f3a6d5218db91f1b5afd3b0383150cf2c0c0d5cbbfddba3c8af0eb',
'manifest is not bound to accepted R11D post');
invariant(manifest.packages.length === 12
  && manifest.executionOrder.forward.length === 12
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify(manifest.executionOrder.forward.slice().reverse()),
'package order is not exact global reverse order');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const packageReports = [];
const unionRecords = [];
const unionKeys = new Set();
let sourceMismatchCount = 0;
let exactInverseCount = 0;
for (const pkg of manifest.packages) {
  const operation = manifest.operations[pkg.key];
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(forward.length === operation.targetCellCount
    && rollback.length === forward.length
    && bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256,
  `${pkg.key} operation identity drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} rollback is not exact inverse at ${index}`);
    exactInverseCount += 1;
    const observed = await sourceAt(record.cell);
    if (observed !== record.sourceState) sourceMismatchCount += 1;
    invariant(!unionKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    unionKeys.add(cellKey(record.cell));
    unionRecords.push(record);
  }
  packageReports.push({
    key: pkg.key,
    island: operation.island,
    role: operation.role,
    targetCellCount: forward.length,
    exactInverse: true,
  });
}
invariant(sourceMismatchCount === 0 && unionRecords.length === 3_982
  && hashCells(unionRecords.map(({ cell }) => cell))
    === manifest.target.operatedUnion.coordinateSetSha256,
'source guards or operated-union identity failed');

const dependencyRecords = unionRecords.filter(({ sourceState, targetState }) => (
  (blockName(sourceState) === 'minecraft:gravel'
    && targetState === 'minecraft:stone_bricks')
  || (/_leaves$/.test(blockName(sourceState))
    && stateProperty(sourceState, 'persistent') === 'false'
    && stateProperty(targetState, 'persistent') === 'true')
));
const gravityRecords = dependencyRecords.filter(
  ({ sourceState }) => blockName(sourceState) === 'minecraft:gravel',
);
const leafRecords = dependencyRecords.filter(
  ({ sourceState }) => /_leaves$/.test(blockName(sourceState)),
);
invariant(gravityRecords.length === 10 && leafRecords.length === 140,
'dependency transition census drifted');

const islandReports = [];
for (const island of manifest.scope.includedIslands) {
  const islandRecords = packageReports
    .filter(({ island: key }) => key === island.key)
    .flatMap(({ key }) => parseOperations(manifest.packages.find((pkg) => pkg.key === key).forward));
  const surfaceNames = new Set([
    'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
  ]);
  const surface = islandRecords.filter(({ targetState }) => (
    surfaceNames.has(blockName(targetState))
  ));
  const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  invariant(surface.length === island.geometry.pavementSurface.cellCount
    && componentCount(surface.map(({ cell }) => cell)) === 1
    && fullHeadroom.length === island.geometry.fullTwoBlockHeadroom.cellCount,
  `${island.key} surface/headroom identity failed`);
  islandReports.push({
    key: island.key,
    stationRange: [island.stations.start, island.stations.end],
    targetCellCount: islandRecords.length,
    surfaceCellCount: surface.length,
    fullHeadroomCellCount: fullHeadroom.length,
    connectedSurfaceComponentCount: 1,
    dependencyTransitionCount: islandRecords.filter((record) => (
      dependencyRecords.some((dependency) => cellKey(dependency.cell) === cellKey(record.cell))
    )).length,
    routeCommissioned: false,
  });
}
invariant(manifest.scope.includedIslands.length === 7
  && manifest.scope.excludedAtGradeRanges.length === 2
  && manifest.scope.excludedAtGradeRanges.every(
    ({ disposition }) => disposition === 'PRESERVED_UNTOUCHED_LOCAL_HOLDOUT_NO_OPERATION_PACKAGE',
  )
  && manifest.scope.heldTreatmentMutationCount === 0
  && manifest.scope.corridorConnectivityClaimed === false,
'held-range or commissioning boundary drifted');

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
    completedReleaseIdentitySha256:
      manifest.source.sourceLedgerCompletedReleaseIdentitySha256,
  },
  checks: {
    physicalPackageCount: manifest.packages.length,
    exactSourceGuardMatchCount: unionRecords.length - sourceMismatchCount,
    exactInverseRecordCount: exactInverseCount,
    uniqueTargetCellCount: unionRecords.length,
    includedIslandCount: islandReports.length,
    excludedWetRangeCount: manifest.scope.excludedAtGradeRanges.length,
    gravityTransitionCount: gravityRecords.length,
    leafPropertyTransitionCount: leafRecords.length,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
    blockEntityHaloIntersectionCount:
      manifest.isolation.blockEntityHaloIntersectionCount,
    savedEntityHaloIntersectionCount:
      manifest.isolation.savedEntityHaloIntersectionCount,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  packages: packageReports,
  islands: islandReports,
  identities: {
    operatedUnion: classManifest(unionRecords.map(({ cell }) => cell)),
    gravityTransitions: classManifest(gravityRecords.map(({ cell }) => cell)),
    leafPropertyTransitions: classManifest(leafRecords.map(({ cell }) => cell)),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, report: OUT_PATH, qaPayloadSha256,
  checks: report.checks }, null, 2));
