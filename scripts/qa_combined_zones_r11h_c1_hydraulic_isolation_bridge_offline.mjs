#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11H. */

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
  analyzeIsland,
  blockName,
  classManifest,
  connectedComponents,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11h-c1-hydraulic-isolation-bridge-20260822T031000Z/r11h-offline-qa.json',
);
const MD_PATH = value(
  '--md-out',
  'data/world-review/combined-zones-r11h-c1-hydraulic-isolation-bridge-20260822T031000Z/r11h-offline-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T03:10:00Z');
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206',
  completeSaveSha256:
    '14f4f7a055d682d77c7e4330514c1b77bc21fc35af52cc99ea5a60bfab29f918',
  regionSha256:
    '029ba78c1de35a125f7d103c6073282b7df75de61499d7be4f4fcd318b6a6962',
  targetCount: 1666,
  dependencyCount: 3,
  structureCount: 1663,
  surfaceCount: 355,
  headroomCutCount: 667,
  selectedFoundationCount: 636,
  omittedFoundationCount: 110,
  beamCount: 5,
  retainedFluidCount: 28,
  retainedWaterCount: 9,
  retainedLavaCount: 19,
  haloCount: 7120,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H offline QA rejected: ${message}`);
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
      `${filename} contains a non-point operation`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!seen.has(cellKey(cell)), `${filename} duplicates ${cellKey(cell)}`);
    seen.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST_PATH));
const manifest = JSON.parse(manifestBytes);
const canonicalManifestPath = `data/buildops/${manifest.transactionId}.release-manifest.json`;
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.mvpScope === true
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity/schema/release state drifted');
invariant(manifest.source.completeSaveSha256 === EXPECTED.completeSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.regionSha256,
'immutable source binding drifted');
invariant(manifest.packages.length === 2
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify(manifest.executionOrder.forward.slice().reverse()),
'two-package execution order drifted');

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
let exactInverseCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
  invariant(forward.length === operation.targetCellCount
    && rollback.length === forward.length
    && bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256,
  `${pkg.key} operation identity/count drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at record ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(record.sourceState !== record.targetState,
      `${pkg.key} contains a strict-noop at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    exactInverseCount += 1;
  }
}
invariant(records.length === EXPECTED.targetCount
  && exactInverseCount === EXPECTED.targetCount
  && records.filter(({ packageKey }) => packageKey.endsWith('dependencies')).length
    === EXPECTED.dependencyCount
  && records.filter(({ packageKey }) => packageKey.endsWith('structure')).length
    === EXPECTED.structureCount
  && hashCells(records.map(({ cell }) => cell))
    === manifest.target.operatedUnion.coordinateSetSha256,
'operated union/package/inverse proof failed');

const structureRecords = records.filter(({ packageKey }) => packageKey.endsWith('structure'));
const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const surface = structureRecords.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
const headroom = structureRecords.filter(({ targetState, sourceState }) => (
  targetState === 'minecraft:air' && !isAir(sourceState)
));
const staticStone = structureRecords.filter(({ targetState }) => (
  targetState === 'minecraft:stone_bricks'
));
const beamKeys = new Set([
  '1519,66,-234', '1520,65,-233', '1522,65,-233',
  '1523,65,-233', '1523,65,-232',
]);
const beam = staticStone.filter(({ cell }) => beamKeys.has(cellKey(cell)));
const selectedFoundation = staticStone.filter(({ cell }) => !beamKeys.has(cellKey(cell)));
invariant(surface.length === EXPECTED.surfaceCount
  && headroom.length === EXPECTED.headroomCutCount
  && beam.length === EXPECTED.beamCount
  && selectedFoundation.length === EXPECTED.selectedFoundationCount
  && connectedComponents(surface.map(({ cell }) => cell)).length === 1,
'surface/headroom/foundation/beam geometry drifted');
const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]));
invariant(fullHeadroom.length === manifest.scope.fullTwoBlockHeadroom.cellCount
  && hashCells(fullHeadroom) === manifest.scope.fullTwoBlockHeadroom.coordinateSetSha256,
'full two-block headroom identity drifted');

const c1 = JSON.parse(fs.readFileSync(absolute(manifest.source.c1DesignPath), 'utf8'));
const generic = await analyzeIsland({
  key: 'qa-bridge-1189-1206', start: 1189, end: 1206,
  stations: c1.horizontalAlignment.stations, reader, priorTargetKeys: new Set(),
});
const omittedKeys = new Set(manifest.scope.affectedFluidInteractionColumns.flatMap(
  ({ omittedDeepFill }) => generic.foundationRecords.filter(({ cell }) => (
    cell.x >= omittedDeepFill.bounds.minX && cell.x <= omittedDeepFill.bounds.maxX
      && cell.z >= omittedDeepFill.bounds.minZ && cell.z <= omittedDeepFill.bounds.maxZ
  )).map(({ cell }) => cellKey(cell)),
));
const selectedFoundationKeys = new Set(selectedFoundation.map(({ cell }) => cellKey(cell)));
const actualOmitted = generic.foundationRecords.filter(
  ({ cell }) => !selectedFoundationKeys.has(cellKey(cell)),
);
invariant(generic.foundationRecords.length === 746
  && actualOmitted.length === EXPECTED.omittedFoundationCount
  && hashCells(actualOmitted.map(({ cell }) => cell))
    === manifest.scope.omittedDeepFoundationFill.coordinateSetSha256
  && omittedKeys.size >= actualOmitted.length,
'generic/omitted foundation partition drifted');

const retainedFluids = [];
for (const cell of generic.halo) {
  const state = await sourceAt(cell);
  if (isFluid(state)) retainedFluids.push({ cell, state });
}
invariant(retainedFluids.length === EXPECTED.retainedFluidCount
  && retainedFluids.filter(({ state }) => blockName(state) === 'minecraft:water').length
    === EXPECTED.retainedWaterCount
  && retainedFluids.filter(({ state }) => blockName(state) === 'minecraft:lava').length
    === EXPECTED.retainedLavaCount
  && hashCells(retainedFluids.map(({ cell }) => cell))
    === manifest.scope.retainedHydraulicGraph.coordinateSetSha256,
'retained water/lava state graph drifted');
const halo = uniqueCells(records.flatMap(({ cell }) => {
  const points = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return points;
}));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(halo.length === EXPECTED.haloCount
  && hashCells(halo) === manifest.target.interactionHalo.coordinateSetSha256
  && haloFluidCount === 0,
'operated interaction halo identity/isolation drifted');
invariant(manifest.scope.supportGraph.componentCount
    === manifest.scope.supportGraph.anchoredComponentCount
  && manifest.scope.supportGraph.affectedHaunchesConnectedToDryFoundation === true
  && manifest.scope.gravityRollbackSupportProof.length === EXPECTED.dependencyCount
  && manifest.scope.gravityRollbackSupportProof.every(
    ({ terminalSupportState }) => !isAir(terminalSupportState) && !isFluid(terminalSupportState),
  ),
'support/gravity rollback closure drifted');
const zeroIsolationFields = [
  'priorReleaseIntersectionCount', 'targetHaloFluidCount',
  'blockEntityHaloIntersectionCount', 'savedEntityHaloIntersectionCount',
  'protectedRelicHaloIntersectionCount', 'c01HaloIntersectionCount',
  'dataDistrictHaloIntersectionCount', 'reservationIntersectionCount',
  'activeMechanismMutationCount', 'containerMigrationCount', 'sheepInteractionCount',
];
invariant(zeroIsolationFields.every((field) => manifest.isolation[field] === 0),
'preservation/isolation guard drifted');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'OFFLINE_READ_ONLY_R11H_HYDRAULIC_ISOLATION_BRIDGE',
  manifest: {
    path: canonicalManifestPath,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: manifest.source,
  checks: {
    packageCount: manifest.packages.length,
    exactSourceGuardMatchCount: records.length,
    exactInverseRecordCount: exactInverseCount,
    uniqueTargetCellCount: records.length,
    surfaceCellCount: surface.length,
    surfaceComponentCount: connectedComponents(surface.map(({ cell }) => cell)).length,
    maxSurfaceStep: 1,
    fullHeadroomCellCount: fullHeadroom.length,
    headroomCutCount: headroom.length,
    selectedFoundationCount: selectedFoundation.length,
    omittedDeepFoundationCount: actualOmitted.length,
    beamCellCount: beam.length,
    retainedFluidCount: retainedFluids.length,
    retainedWaterCount: EXPECTED.retainedWaterCount,
    retainedLavaCount: EXPECTED.retainedLavaCount,
    targetHaloFluidCount: haloFluidCount,
    interactionHaloCellCount: halo.length,
    priorReleaseIntersectionCount: 0,
    entityBlockEntityContainerRelicInterfaceIntersectionCount: 0,
    routeCommissioned: false,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    surface: classManifest(surface.map(({ cell }) => cell)),
    fullHeadroom: classManifest(fullHeadroom),
    omittedDeepFoundation: classManifest(actualOmitted.map(({ cell }) => cell)),
    retainedFluidGraph: classManifest(retainedFluids.map(({ cell }) => cell)),
    interactionHalo: classManifest(halo),
  },
  safetyBoundary: manifest.safetyBoundary,
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_PATH), `# R11H offline QA\n\nStatus: **PASS**\n\nThe accepted R11F post independently matches all ${records.length.toLocaleString('en-US')} exact source guards and reverse-order inverse records. The ${surface.length}-cell, one-component, max-step-one pavement has ${fullHeadroom.length} headroom cells, ${selectedFoundation.length} selected dry foundation cells, and a ${beam.length}-cell transverse beam.\n\nAll ${retainedFluids.length} fluid cells (${EXPECTED.retainedWaterCount} water, ${EXPECTED.retainedLavaCount} lava) remain source-identical outside the ${halo.length.toLocaleString('en-US')}-cell operated halo. The ${actualOmitted.length} deep interaction cells remain untouched. Route, drainage, and hydraulic capacity are not commissioned.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed.\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
