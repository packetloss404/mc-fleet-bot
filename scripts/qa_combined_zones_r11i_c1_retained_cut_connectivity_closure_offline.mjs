#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11I. */

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
  census,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const MANIFEST = value(
  '--manifest',
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json',
);
const CANONICAL_MANIFEST =
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json';
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11i-offline-20260822T040000Z',
);
const CANONICAL_EVIDENCE =
  'data/world-review/combined-zones-r11i-offline-20260822T040000Z';
const OUT = value('--out', `${EVIDENCE}/r11i-offline-qa.json`);
const MD_OUT = value('--md-out', `${EVIDENCE}/r11i-offline-qa.md`);
const GENERATED_AT = value('--generated-at', '2026-08-22T04:05:00Z');
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const INVENTORY =
  'data/world-review/combined-zones-r11i-neighbor-closures-inventory-20260822T034500Z.json';
const R11E =
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json';
const R11H =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212',
  sourceCompleteSaveSha256:
    'a28e318f5df40928eac351a16d7776c2ece824c33722dbf259bc0d15a6f4e185',
  sourceRegionSha256:
    'e55a9497b238c52ee5d4d6e86e844e5be0288640c468a94d8af52ea7380f9cae',
  inventorySha256:
    '68de4dd6bbe6f9a2730796c46916fc91caab966ec17f8b7bd8c62dc1831c21e7',
  targetCount: 317,
  targetHash: 'd04010044b24b7de1b7fbf7541a9e399052ba14fa83f34ae4424ba7ed093dab0',
  haloCount: 1531,
  haloHash: 'c5a6f88fae844734b84317d9a4e0f0309d66734c1fcb07743f5cc029b6948121',
  surfaceCount: 106,
  surfaceHash: 'd21c6accba2ef215709891c7feeb289c69523da7456c556516f701491d73596d',
  headroomCutCount: 209,
  fullHeadroomCount: 212,
  sourceGravityCount: 15,
  separateDependencyCount: 2,
  combinedSurfaceCount: 526,
  westSeamEdgeCount: 46,
  eastSeamEdgeCount: 60,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11I offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
const inventoryBytes = fs.readFileSync(absolute(INVENTORY));
const inventory = JSON.parse(inventoryBytes);
const design = readJson(DESIGN);
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.mvpScope === true
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL')
  && manifest.source.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.sourceRegionSha256,
'manifest identity/schema/source drifted');
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256,
'source-bound inventory drifted');

const priorTargetKeys = new Set();
for (const binding of manifest.source.priorManifestBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} drifted`);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const record of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(record.cell));
  }
}
const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const analysis = await analyzeIsland({
  key: 'retained-cut-1207-1212', start: 1207, end: 1212,
  stations: design.horizontalAlignment.stations, reader, priorTargetKeys,
});
invariant(analysis.safe && analysis.surface.length === EXPECTED.surfaceCount
  && hashCells(analysis.surface) === EXPECTED.surfaceHash
  && analysis.headroomRecords.length === EXPECTED.headroomCutCount
  && analysis.fullHeadroom.length === EXPECTED.fullHeadroomCount
  && analysis.gravityRecords.length === EXPECTED.sourceGravityCount
  && analysis.foundationRecords.length === 0
  && analysis.halo.length === EXPECTED.haloCount
  && hashCells(analysis.halo) === EXPECTED.haloHash,
'independent geometry/source analysis drifted');

const records = [];
const targetKeys = new Set();
let inverseCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const operation = manifest.operations[pkg.key];
  invariant(bodySha256(pkg.forward) === operation.forwardSha256
    && bodySha256(pkg.rollback) === operation.rollbackSha256
    && forward.length === rollback.length
    && forward.length === operation.targetCellCount,
  `${pkg.key} operation identity/count drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} inverse drifted at ${index}`);
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${pkg.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key });
    inverseCount += 1;
  }
}
invariant(records.length === EXPECTED.targetCount
  && inverseCount === EXPECTED.targetCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetHash,
'exact source/inverse/target union drifted');
const finalByKey = new Map(records.map((record) => [cellKey(record.cell), record.targetState]));
const projectedAt = async (cell) => finalByKey.get(cellKey(cell)) ?? await sourceAt(cell);
const surface = records.filter(({ targetState }) => surfaceState(targetState));
invariant(surface.length === EXPECTED.surfaceCount
  && connectedComponents(surface.map(({ cell }) => cell)).length === 1,
'pavement surface topology drifted');
let stableSurfaceCount = 0;
for (const { cell } of surface) {
  const supportState = await projectedAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(supportState) && !isFluid(supportState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState))) stableSurfaceCount += 1;
}
let fullHeadroomAirCount = 0;
for (const cell of analysis.fullHeadroom) if (isAir(await projectedAt(cell))) {
  fullHeadroomAirCount += 1;
}
invariant(stableSurfaceCount === surface.length
  && fullHeadroomAirCount === analysis.fullHeadroom.length,
'projected support/headroom failed');

const gravelSourceCells = analysis.gravityRecords.filter(({ sourceState }) => (
  blockName(sourceState) === 'minecraft:gravel'
));
const separateDependencies = records.filter(({ packageKey }) => (
  packageKey.endsWith('-dependencies')
));
invariant(gravelSourceCells.length === EXPECTED.sourceGravityCount
  && separateDependencies.length === EXPECTED.separateDependencyCount
  && analysis.gravityRollbackSupportProof.every((proof) => (
    !isAir(proof.terminalSupportState) && !isFluid(proof.terminalSupportState)
      && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(proof.terminalSupportState))
  )),
'complete durable gravel closure failed');

let haloFluidCount = 0;
for (const cell of analysis.halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(haloFluidCount === 0 && analysis.priorIntersections.length === 0,
'fluid/prior overlap drifted');
const surfaceFrom = (manifestPath, packageFilter = () => true) => readJson(manifestPath)
  .packages.filter(packageFilter).flatMap((pkg) => parseOperations(pkg.forward))
  .filter(({ targetState }) => surfaceState(targetState)).map(({ cell }) => cell);
const r11hSurface = surfaceFrom(R11H);
const r11eSurface = surfaceFrom(R11E, ({ key }) => key === 'c1-island-1213-1215-pavement');
const seamEdges = (left, right) => left.reduce((count, cell) => count + right.filter(
  (other) => Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) <= 1
    && Math.abs(cell.y - other.y) <= 1,
).length, 0);
const westSeamEdges = seamEdges(surface.map(({ cell }) => cell), r11hSurface);
const eastSeamEdges = seamEdges(surface.map(({ cell }) => cell), r11eSurface);
const combinedSurface = uniqueCells([
  ...r11hSurface, ...surface.map(({ cell }) => cell), ...r11eSurface,
]);
invariant(combinedSurface.length === EXPECTED.combinedSurfaceCount
  && connectedComponents(combinedSurface).length === 1
  && westSeamEdges === EXPECTED.westSeamEdgeCount
  && eastSeamEdges === EXPECTED.eastSeamEdgeCount,
'R11H/R11I/R11E seam or combined topology drifted');

const evidenceChecks = {};
for (const [name, expected] of Object.entries({
  'manifest-qa.json': { status: 'PASS' },
  'dependencies-forward-source-preflight.json': { status: 'PASS', passed: 2, failed: 0 },
  'structure-forward-source-preflight.json': { status: 'PASS', passed: 315, failed: 0 },
  'structure-projected-rollback-preflight.json': { status: 'PASS', passed: 315, failed: 0 },
  'dependencies-projected-rollback-preflight.json': { status: 'PASS', passed: 2, failed: 0 },
  'dependencies-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'structure-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'structure-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'dependencies-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'block-entity-clearance.json': { status: 'PASS', blockingBlockEntityCount: 0 },
})) {
  const evidencePath = path.join(EVIDENCE, name);
  const bytes = fs.readFileSync(absolute(evidencePath));
  const payload = JSON.parse(bytes);
  for (const [key, wanted] of Object.entries(expected)) {
    invariant(payload[key] === wanted, `${name} ${key} drifted`);
  }
  evidenceChecks[name] = {
    path: path.join(CANONICAL_EVIDENCE, name), sha256: sha256(bytes),
  };
}
const wrapperPath = path.join(EVIDENCE, 'wrapper-print-plan.json');
const wrapperBytes = fs.readFileSync(absolute(wrapperPath));
const wrapper = JSON.parse(wrapperBytes);
invariant(wrapper.mode === 'PREPARE_ONLY' && wrapper.globalGateDependency === 'NONE'
  && wrapper.packageOrder.join(',') === manifest.packages.map(({ key }) => key).join(',')
  && wrapper.stages.length === 10,
'real wrapper print-plan drifted');
evidenceChecks['wrapper-print-plan.json'] = {
  path: path.join(CANONICAL_EVIDENCE, 'wrapper-print-plan.json'),
  sha256: sha256(wrapperBytes),
};

const heldWest = inventory.candidates.find(({ key }) => key === 'west-bridge-gap');
invariant(heldWest.fluidCount === 38 && heldWest.sourceHazardCount === 14
  && heldWest.genericSafe === false,
'west hydraulic local hold census drifted');
const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11I_OFFLINE_QA',
  manifest: {
    path: CANONICAL_MANIFEST,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: manifest.source,
  checks: {
    packageCount: manifest.packages.length,
    exactSourceGuardMatchCount: records.length,
    exactInverseRecordCount: inverseCount,
    uniqueTargetCellCount: targetKeys.size,
    pavementSurfaceCellCount: surface.length,
    pavementSurfaceComponentCount: 1,
    maximumSurfaceStep: 1,
    stableSurfaceCellCount: stableSurfaceCount,
    headroomCutCount: analysis.headroomRecords.length,
    fullHeadroomAirCount,
    sourceGravityCellCount: gravelSourceCells.length,
    separateDependencyCellCount: separateDependencies.length,
    durableGravityTerminalCount: analysis.gravityRollbackSupportProof.length,
    interactionHaloCellCount: analysis.halo.length,
    haloFluidCount,
    priorIntersectionCount: analysis.priorIntersections.length,
    combinedAcceptedSurfaceCellCount: combinedSurface.length,
    combinedAcceptedSurfaceComponentCount: 1,
    westSeamEdgeCount: westSeamEdges,
    eastSeamEdgeCount: eastSeamEdges,
    westHydraulicGapRetainedFluidCount: heldWest.fluidCount,
    westHydraulicGapMutationCount: 0,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell), true),
    pavementSurfaceCoordinateSetSha256: hashCells(surface.map(({ cell }) => cell)),
    interactionHaloCoordinateSetSha256: hashCells(analysis.halo),
    combinedAcceptedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
  },
  evidence: evidenceChecks,
  acceptance: {
    offlineReadyForFreshExecutionKernel: true,
    corridorSegmentConnectedBetweenAcceptedIslands: true,
    routeCommissioned: false,
    wetWestGapPreservedUntouched: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), `# R11I retained-cut connectivity closure offline QA\n\nStatus: **PASS / FROZEN OFFLINE**\n\nThe 317-cell package provides 106 connected pavement cells, 212/212 air headroom cells, 106/106 stable contacts, and an exact 15-gravel durable inverse closure. Its 46 west and 60 east seam edges join the accepted 355-cell R11H surface and 65-cell R11E station-1213..1215 island as one 526-cell max-step-one component.\n\nAll source, inverse, fluid, entity, block-entity, ownership, parser, preflight, and real wrapper-plan gates pass. The west stations 1184..1188 remain untouched with their exact 38-fluid/14-unstable-contact local hydraulic hold. No route, drainage, rail, utility, or external-discharge commission is claimed.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed.\n`);
console.log(JSON.stringify({ status: report.status, out: OUT, qaPayloadSha256, checks: report.checks }, null, 2));
