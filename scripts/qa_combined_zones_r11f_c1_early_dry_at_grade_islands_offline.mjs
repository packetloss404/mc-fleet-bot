#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11F early dry C1 islands. */

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
import {
  blockName,
  classManifest,
  connectedComponents,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11f-offline-20260822T000000Z/r11f-offline-qa.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T00:00:00Z');
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11f-c1-early-dry-at-grade-islands',
  manifestIdentity: 'dac26f1c94dd1abb7f00ecf18e99d88dda5d8184b290d2fb06986a4c25b5bbd2',
  inventorySha256: '542432912cc14ed1a1a9f3918dc9deaf64cc7a9762f0adc085e347f325f03021',
  sourceCompleteSaveSha256: '0079adf895179606ad64a57ad0e85351c4e6ba3dbacb82a308b84a6909013109',
  sourceRegionSha256: 'e301aa16ef0db51b313d5c7d4a6b6b2e99343dd64787645b7f872d07268d1258',
  targetCellCount: 1_639,
  targetCoordinateSetSha256: '2b4e2ee530e848107f993db8138f027b75fb6074a186c46a91d16c01ddc277b6',
  interactionHaloCellCount: 4_419,
  packageCount: 3,
  islandCount: 2,
  surfaceCellCount: 551,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11F offline QA rejected: ${message}`);
};
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);

function parseOperations(filename) {
  const records = [];
  const seen = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains an unsupported operation`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `${filename} contains a non-point target`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!seen.has(cellKey(cell)), `${filename} duplicates ${cellKey(cell)}`);
    seen.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...payload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(payload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity, transaction, or state drifted');
invariant(manifest.source.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.sourceRegionSha256
  && manifest.source.inventorySha256 === EXPECTED.inventorySha256,
'source/inventory provenance drifted');
invariant(manifest.packages.length === EXPECTED.packageCount
  && manifest.executionOrder.forward.length === EXPECTED.packageCount
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify(manifest.executionOrder.forward.slice().reverse()),
'package ordering drifted');

const inventoryBytes = fs.readFileSync(absolute(manifest.source.inventoryPath));
const inventory = JSON.parse(inventoryBytes);
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256
  && inventory.ranges.filter(({ safe }) => safe).length === EXPECTED.islandCount,
'frozen current-source inventory drifted');
const inventoryByKey = new Map(inventory.ranges.map((range) => [range.key, range]));
const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
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
let exactInverseRecordCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
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
    `${pkg.key} rollback is not reverse exact at ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, island: operation.island, packageKey: pkg.key });
    exactInverseRecordCount += 1;
  }
}
invariant(records.length === EXPECTED.targetCellCount
  && exactInverseRecordCount === EXPECTED.targetCellCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256,
'operated union/source/inverse proof failed');

const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const islandReports = [];
const allSurface = [];
for (const island of manifest.scope.includedIslands) {
  const range = inventoryByKey.get(island.key);
  const islandRecords = records.filter((record) => record.island === island.key);
  const surface = islandRecords.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
  const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  invariant(range.safe === true
    && range.sourceHazardCount === 0 && range.haloHazardCount === 0
    && range.savedEntityConflicts.cellCount === 0
    && range.priorIntersectionCount === 0
    && islandRecords.length === island.geometry.operatedUnion.cellCount
    && hashCells(islandRecords.map(({ cell }) => cell))
      === island.geometry.operatedUnion.coordinateSetSha256
    && surface.length === island.geometry.pavementSurface.cellCount
    && hashCells(surface.map(({ cell }) => cell))
      === island.geometry.pavementSurface.coordinateSetSha256
    && connectedComponents(surface.map(({ cell }) => cell)).length === 1
    && fullHeadroom.length === island.geometry.fullTwoBlockHeadroom.cellCount
    && hashCells(fullHeadroom) === island.geometry.fullTwoBlockHeadroom.coordinateSetSha256,
  `${island.key} safety/geometry/headroom proof failed`);
  allSurface.push(...surface.map(({ cell }) => cell));
  islandReports.push({
    key: island.key,
    stations: island.stations,
    targetCellCount: islandRecords.length,
    connectedSurfaceCellCount: surface.length,
    connectedSurfaceComponentCount: 1,
    fullHeadroomCellCount: fullHeadroom.length,
    gravityDependencyCount: island.geometry.gravityDependencies.cellCount,
    ownedLogRemovalCount: island.geometry.ownedLogRemovals.cellCount,
    retainedLeafCount: island.geometry.removalInfluencedRetainedLeaves.cellCount,
    retainedLogDistanceCensus: island.geometry.projectedRetainedLogDistanceCensus,
    leafPropertyTransitionCount: island.geometry.leafPropertyTransitions.cellCount,
    routeCommissioned: false,
  });
}
invariant(islandReports.length === EXPECTED.islandCount
  && allSurface.length === EXPECTED.surfaceCellCount
  && connectedComponents(allSurface).length === EXPECTED.islandCount,
'two-island surface partition drifted');
const halo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
invariant(halo.length === EXPECTED.interactionHaloCellCount
  && hashCells(halo) === manifest.target.interactionHalo.coordinateSetSha256,
'interaction-halo identity drifted');
const blocked = manifest.scope.excludedEarlyAtGradeRange;
invariant(blocked.key === 'island-0-10'
  && blocked.sourceHazardCount === 80 && blocked.haloHazardCount === 106
  && manifest.scope.preservedR11EExclusions.omittedEntityInterfaceIslands.length === 1
  && manifest.scope.preservedR11EExclusions.excludedAtGradeRanges.length === 2
  && manifest.scope.heldInterfaces.length === 3
  && manifest.scope.heldTreatmentMutationCount === 0
  && manifest.scope.corridorConnectivityClaimed === false,
'early hazard/R11E/held-treatment exclusion drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY_CURRENT_SOURCE_EARLY_DRY_AT_GRADE_BATCH',
  manifest: {
    path: MANIFEST_PATH,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: manifest.source,
  checks: {
    packageCount: manifest.packages.length,
    includedIslandCount: islandReports.length,
    exactSourceGuardMatchCount: records.length,
    exactInverseRecordCount,
    uniqueTargetCellCount: records.length,
    connectedSurfaceCellCount: allSurface.length,
    connectedSurfaceComponentCount: connectedComponents(allSurface).length,
    interactionHaloCellCount: halo.length,
    includedSourceHazardCount: 0,
    includedHaloHazardCount: 0,
    includedSavedEntityConflictCount: 0,
    includedPriorReleaseIntersectionCount: 0,
    includedInterfaceIntersectionCount: 0,
    excludedEarlySourceHazardCount: blocked.sourceHazardCount,
    excludedEarlyHaloHazardCount: blocked.haloHazardCount,
    preservedSheepIslandCount: 1,
    preservedWetRangeCount: 2,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  islands: islandReports,
  identities: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    surface: classManifest(allSurface),
    interactionHalo: classManifest(halo),
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
