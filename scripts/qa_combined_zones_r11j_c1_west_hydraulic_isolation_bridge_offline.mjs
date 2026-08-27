#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11J. */

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
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json',
);
const CANONICAL_MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11j-offline-20260822T043500Z',
);
const CANONICAL_EVIDENCE =
  'data/world-review/combined-zones-r11j-offline-20260822T043500Z';
const OUT = value('--out', `${EVIDENCE}/r11j-offline-qa.json`);
const MD_OUT = value('--md-out', `${EVIDENCE}/r11j-offline-qa.md`);
const GENERATED_AT = value('--generated-at', '2026-08-22T04:40:00Z');
const INVENTORY =
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json';
const R11H =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188',
  sourceCompleteSaveSha256:
    'c1fbb77ec91fae38e8698c8d7c6502f025890ee452b038a406755f321ab7c752',
  sourceRegionSha256:
    'c64dd202b19d1ebbcf3f93642d339673d2051293a969f1209719d71e4375f1d2',
  inventorySha256:
    'a79a6e9616c987dc402781ce083a1ec4822c6e633b0a5051f1d56b2cabd2348a',
  inventoryPayloadSha256:
    '48b37c020da1e204f2e0c4d496af549935e02489571965699be536ed124dc19f',
  targetCount: 411,
  targetHash: '3db1666a75e5d10577ff203a98d54d78bb27b86ae3ffe6332b687118f2ebb103',
  supportOperationCount: 273,
  supportFrameworkCount: 344,
  supportFrameworkHash:
    'dbd8264db71d7dee7c94647a5a2eb659275d981aa1a042dbe7e17ab1ccbeb8f5',
  retainedSupportCount: 71,
  durableAnchorCount: 102,
  gravityCount: 4,
  structureCount: 138,
  surfaceCount: 94,
  surfaceHash: 'a9ee2fee1baad5d277b4e1e936986c146eee170e2023fddb3f964715d1c141e0',
  headroomCount: 188,
  headroomCutCount: 44,
  haloCount: 1792,
  haloHash: 'f21e73b5228a92fc79752580d49edbfa0e3f6026bb77eac8df76d42c4831346d',
  retainedFluidCount: 38,
  retainedFluidHash:
    '9420c2416b642efada997f299f1e0127636c6dbd8bed750bb10de78984c09ce8',
  minimumVerticalIsolationBlocks: 23,
  seamEdgeCount: 37,
  combinedSurfaceCount: 449,
  combinedSurfaceHash:
    '6597036935c7e06c2259491dbdbd459856f4a9b90f68ff7394a8da9b05f822e1',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11J offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const key = queue.pop();
      const cell = byKey.get(key);
      component.push(cell);
      for (const [dx, dy, dz] of FACE) {
        const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (unvisited.delete(next)) queue.push(next);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}
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
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);
const seamEdges = (left, right) => left.reduce((count, cell) => count + right.filter(
  (other) => Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) <= 1
    && Math.abs(cell.y - other.y) <= 1,
).length, 0);
function maximumSurfaceStep(cells) {
  let maximum = 0;
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) !== 1) continue;
      maximum = Math.max(maximum, Math.abs(left.y - right.y));
    }
  }
  return maximum;
}

const manifestBytes = fs.readFileSync(absolute(MANIFEST));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
const inventoryBytes = fs.readFileSync(absolute(INVENTORY));
const inventory = JSON.parse(inventoryBytes);
invariant(manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.transactionId === EXPECTED.transactionId
  && manifest.mvpScope === true
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL')
  && manifest.source.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && manifest.source.sourceRegionSha256 === EXPECTED.sourceRegionSha256,
'manifest identity/schema/source drifted');
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256
  && inventory.inventoryPayloadSha256 === EXPECTED.inventoryPayloadSha256,
'source-bound inventory drifted');

const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
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

const supportRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-west-bridge-support-framework'
));
const structureRecords = records.filter(({ packageKey }) => (
  packageKey === 'c1-west-bridge-deck-structure'
));
const surface = structureRecords.filter(({ targetState }) => surfaceState(targetState));
const cuts = structureRecords.filter(({ targetState }) => targetState === 'minecraft:air');
invariant(supportRecords.length === EXPECTED.supportOperationCount
  && supportRecords.every(({ targetState }) => targetState === 'minecraft:stone_bricks')
  && structureRecords.length === EXPECTED.structureCount
  && surface.length === EXPECTED.surfaceCount
  && hashCells(surface.map(({ cell }) => cell)) === EXPECTED.surfaceHash
  && cuts.length === EXPECTED.headroomCutCount,
'support/deck operation split drifted');

const retainedFramework = inventory.selectedStaticBridgeDesign.supportAnchors
  .filter(({ kind }) => kind === 'retained-framework-cell');
const supportFramework = uniqueCells([
  ...supportRecords.map(({ cell }) => cell),
  ...retainedFramework.map(({ cell }) => cell),
]);
invariant(retainedFramework.length === EXPECTED.retainedSupportCount
  && supportFramework.length === EXPECTED.supportFrameworkCount
  && hashCells(supportFramework) === EXPECTED.supportFrameworkHash
  && faceComponents(supportFramework).length === 1
  && inventory.selectedStaticBridgeDesign.supportAnchors.length === EXPECTED.durableAnchorCount,
'complete face-connected support framework drifted');
for (const anchor of inventory.selectedStaticBridgeDesign.supportAnchors) {
  invariant(await sourceAt(anchor.cell) === anchor.sourceState
    && !isAir(anchor.sourceState) && !isFluid(anchor.sourceState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(anchor.sourceState)),
  `durable anchor drifted at ${cellKey(anchor.cell)}`);
}

const finalByKey = new Map(records.map((record) => [cellKey(record.cell), record.targetState]));
const projectedAt = async (cell) => finalByKey.get(cellKey(cell)) ?? await sourceAt(cell);
let stableSurfaceCount = 0;
for (const { cell } of surface) {
  const supportState = await projectedAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(supportState) && !isFluid(supportState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState))) stableSurfaceCount += 1;
}
const fullHeadroom = surface.flatMap(({ cell }) => [
  { x: cell.x, y: cell.y + 1, z: cell.z },
  { x: cell.x, y: cell.y + 2, z: cell.z },
]);
let fullHeadroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await projectedAt(cell))) fullHeadroomAirCount += 1;
const surfaceCells = surface.map(({ cell }) => cell);
const surfaceComponents = connectedComponents(surfaceCells);
const maxSurfaceStep = maximumSurfaceStep(surfaceCells);
invariant(surfaceComponents.length === 1 && maxSurfaceStep === 1
  && stableSurfaceCount === EXPECTED.surfaceCount
  && fullHeadroom.length === EXPECTED.headroomCount
  && fullHeadroomAirCount === EXPECTED.headroomCount,
'projected pavement topology/support/headroom failed');

const gravityRecords = supportRecords.filter(({ sourceState }) => (
  blockName(sourceState) === 'minecraft:gravel'
));
invariant(gravityRecords.length === EXPECTED.gravityCount
  && inventory.selectedStaticBridgeDesign.gravityRollbackProof.length === EXPECTED.gravityCount
  && inventory.selectedStaticBridgeDesign.gravityRollbackProof.every(({ durable }) => durable),
'exact durable gravel inverse closure failed');

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
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash
  && haloFluidCount === 0,
'exact operated interaction halo drifted or contains fluid');

const retainedFluids = inventory.hazards.haloFluids;
for (const record of retainedFluids) invariant(
  await sourceAt(record.cell) === record.sourceState && !targetKeys.has(cellKey(record.cell)),
  `retained fluid drifted or became a target at ${cellKey(record.cell)}`,
);
const minimumVerticalIsolation = Math.min(...records.map(({ cell }) => cell.y))
  - Math.max(...retainedFluids.map(({ cell }) => cell.y)) - 1;
invariant(retainedFluids.length === EXPECTED.retainedFluidCount
  && hashCells(retainedFluids.map(({ cell }) => cell)) === EXPECTED.retainedFluidHash
  && minimumVerticalIsolation === EXPECTED.minimumVerticalIsolationBlocks,
'retained hydraulic field identity/isolation drifted');

const priorTargetKeys = new Set();
for (const binding of manifest.source.priorManifestBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} drifted`);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const record of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(record.cell));
  }
}
const priorIntersections = records.filter(({ cell }) => priorTargetKeys.has(cellKey(cell)));
invariant(priorIntersections.length === 0
  && inventory.selectedStaticBridgeDesign.savedEntityCount === 0
  && inventory.selectedStaticBridgeDesign.blockEntityCount === 0,
'prior/entity/block-entity exclusion drifted');

const r11hManifest = readJson(R11H);
const r11hSurface = r11hManifest.packages.flatMap((pkg) => parseOperations(pkg.forward))
  .filter(({ targetState }) => surfaceState(targetState)).map(({ cell }) => cell);
const seamEdgeCount = seamEdges(surfaceCells, r11hSurface);
const combinedSurface = uniqueCells([...surfaceCells, ...r11hSurface]);
invariant(seamEdgeCount === EXPECTED.seamEdgeCount
  && combinedSurface.length === EXPECTED.combinedSurfaceCount
  && hashCells(combinedSurface) === EXPECTED.combinedSurfaceHash
  && connectedComponents(combinedSurface).length === 1
  && maximumSurfaceStep(combinedSurface) === 1,
'accepted R11H seam/combined topology drifted');

const evidenceChecks = {};
for (const [name, expected] of Object.entries({
  'manifest-qa.json': { status: 'PASS' },
  'support-forward-source-preflight.json': { status: 'PASS', passed: 273, failed: 0 },
  'deck-forward-source-preflight.json': { status: 'PASS', passed: 138, failed: 0 },
  'deck-projected-rollback-preflight.json': { status: 'PASS', passed: 138, failed: 0 },
  'support-projected-rollback-preflight.json': { status: 'PASS', passed: 273, failed: 0 },
  'support-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'deck-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'deck-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'support-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
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

const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS',
  mode: 'INDEPENDENT_READ_ONLY_R11J_OFFLINE_QA',
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
    supportOperationCellCount: supportRecords.length,
    supportFrameworkCellCount: supportFramework.length,
    retainedSupportCellCount: retainedFramework.length,
    supportFrameworkFaceComponentCount: faceComponents(supportFramework).length,
    durableAnchorCount: inventory.selectedStaticBridgeDesign.supportAnchors.length,
    sourceGravityCellCount: gravityRecords.length,
    durableGravityTerminalCount: inventory.selectedStaticBridgeDesign.gravityRollbackProof.length,
    pavementSurfaceCellCount: surface.length,
    pavementSurfaceComponentCount: surfaceComponents.length,
    maximumSurfaceStep: maxSurfaceStep,
    stableSurfaceCellCount: stableSurfaceCount,
    headroomCutCount: cuts.length,
    fullHeadroomAirCount,
    interactionHaloCellCount: halo.length,
    haloFluidCount,
    retainedGenericFluidCount: retainedFluids.length,
    retainedGenericFluidMutationCount: 0,
    minimumFluidVerticalIsolationBlocks: minimumVerticalIsolation,
    savedEntityConflictCount: inventory.selectedStaticBridgeDesign.savedEntityCount,
    blockEntityConflictCount: inventory.selectedStaticBridgeDesign.blockEntityCount,
    priorIntersectionCount: priorIntersections.length,
    acceptedR11HSeamEdgeCount: seamEdgeCount,
    combinedAcceptedSurfaceCellCount: combinedSurface.length,
    combinedAcceptedSurfaceComponentCount: 1,
    westUnbuiltStationStart: 1142,
    westUnbuiltStationEnd: 1183,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    supportFrameworkCoordinateSetSha256: hashCells(supportFramework),
    pavementSurfaceCoordinateSetSha256: hashCells(surfaceCells),
    interactionHaloCoordinateSetSha256: hashCells(halo),
    retainedGenericFluidCoordinateSetSha256: hashCells(retainedFluids.map(({ cell }) => cell)),
    combinedAcceptedSurfaceCoordinateSetSha256: hashCells(combinedSurface),
  },
  evidence: evidenceChecks,
  acceptance: {
    offlineReadyForFreshExecutionKernel: true,
    boundedHydraulicIsolationBridgeSourceProven: true,
    acceptedR11HSeamConnected: true,
    routeCommissioned: false,
    hydraulicCapacityCommissioned: false,
    westStations1142To1183PreservedUntouched: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), `# R11J west hydraulic-isolation bridge offline QA\n\nStatus: **PASS / FROZEN OFFLINE**\n\nThe exact 411-cell package supplies a 344-cell face-connected static support framework beneath 94 connected max-step-one pavement cells, with 94/94 stable contacts and 188/188 air headroom cells. The four source-gravel cells have exact durable stone-terminal inverse proofs.\n\nThe operated 1,792-cell sparse interaction halo is dry. The separate 38-cell generic-review water/lava field remains exact, outside every target, and at least 23 whole blocks below the operated scope. The deck has 37 seam edges to accepted R11H, creating one 449-cell accepted max-step-one surface. Stations 1142..1183 remain untouched; no whole-route, hydraulic-capacity, drainage, rail, utility, or external-discharge commission is claimed.\n\nAll source, inverse, ownership, entity, block-entity, parser, preflight, and real wrapper-plan gates pass. QA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed.\n`);
console.log(JSON.stringify({
  status: report.status, out: OUT, qaPayloadSha256, checks: report.checks,
}, null, 2));
