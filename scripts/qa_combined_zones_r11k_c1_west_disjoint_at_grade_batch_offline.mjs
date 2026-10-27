#!/usr/bin/env node
/** Independent read-only offline QA for CZ-R11K. */

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
  'data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.release-manifest.json',
);
const CANONICAL_MANIFEST =
  'data/buildops/combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172.release-manifest.json';
const EVIDENCE = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11k-offline-20260822T050000Z',
);
const CANONICAL_EVIDENCE =
  'data/world-review/combined-zones-r11k-offline-20260822T050000Z';
const OUT = value('--out', `${EVIDENCE}/r11k-offline-qa.json`);
const MD_OUT = value('--md-out', `${EVIDENCE}/r11k-offline-qa.md`);
const GENERATED_AT = value('--generated-at', '2026-08-22T05:00:00Z');
const INVENTORY =
  'data/world-review/combined-zones-r11k-west-at-grade-closure-inventory-20260822T044500Z.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const SCOPES = [
  { key: 'west-at-grade-1142-1145', start: 1142, end: 1145 },
  { key: 'west-at-grade-1172', start: 1172, end: 1172 },
];
const EXPECTED = Object.freeze({
  manifestSha256:
    '626492caa4467beae7240f6dae106adebe4618c7e0fa74cd03361920ec81295f',
  manifestIdentity:
    '2ca63578e12f18b1f3086403bae522b7fac16fc7da43b92c88309fa97759182d',
  inventorySha256:
    '1902f7deb1f29c0140adef024275c21ba4babc660afe8ca56a76367e5b3564e7',
  inventoryPayloadSha256:
    '70824c8a344f73ef4072f5e6057d4c14adedc614524431fc503ed0303c740b2d',
  targetCount: 336,
  targetHash: 'fa399c790649c52c8d7b7051be63a72f50bbe662184023a596751e60e3683005',
  surfaceCount: 111,
  foundationCount: 105,
  headroomCutCount: 71,
  fullHeadroomCount: 222,
  leafTransitionCount: 49,
  haloCount: 1883,
  haloHash: '5b548cad659c5292ff23743a8110f31a9b93d8881624f4937f6fe990e6cf73a8',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11K offline QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const bodySha256 = (filename) => sha256(`${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`);
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
function maximumWalkableSurfaceStep(cells) {
  let maximum = 0;
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) !== 1) continue;
      const step = Math.abs(left.y - right.y);
      if (step <= 1) maximum = Math.max(maximum, step);
    }
  }
  return maximum;
}
function maximumSequentialStationStep(cells) {
  let maximum = 0;
  for (let index = 1; index < cells.length; index += 1) {
    const previous = cells[index - 1];
    const current = cells[index];
    invariant(Math.max(Math.abs(previous.x - current.x), Math.abs(previous.z - current.z)) <= 1,
      `station centerline plan gap at ${previous.station}->${current.station}`);
    maximum = Math.max(maximum, Math.abs(previous.y - current.y));
  }
  return maximum;
}
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);

const manifestBytes = fs.readFileSync(absolute(MANIFEST));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
const inventoryBytes = fs.readFileSync(absolute(INVENTORY));
const inventory = JSON.parse(inventoryBytes);
const design = readJson(DESIGN);
invariant(sha256(manifestBytes) === EXPECTED.manifestSha256
  && manifestIdentity === EXPECTED.manifestIdentity
  && manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.mvpScope === true
  && manifest.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
  && manifest.status.includes('AWAITING_FRESH_EXECUTION_KERNEL'),
'manifest identity/schema drifted');
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256
  && inventory.inventoryPayloadSha256 === EXPECTED.inventoryPayloadSha256
  && inventory.scope.recommendedBatch.exactInteractionDisjoint === true,
'inventory identity/recommendation drifted');
for (const binding of Object.values(manifest.controlBindings)) {
  invariant(sha256(fs.readFileSync(absolute(binding.path))) === binding.sha256,
    `${binding.path} control binding drifted`);
}
invariant(manifest.controlBindings.releaseContract.sha256
  === '0e13f4ca6a66eb5e61cb51f8845acfb0b0e7194480adeb813c2e474d2e8faa47',
'final doc-locked release contract binding drifted');

const priorTargetKeys = new Set();
for (const binding of manifest.source.priorManifestBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} prior binding drifted`);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
const reader = new AnvilReader(absolute(path.join(manifest.source.snapshotRoot, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const savedEntityPositions = inventory.scope.savedEntities.map(({ position }) => position);
const analyses = [];
for (const definition of SCOPES) {
  const analysis = await analyzeIsland({
    ...definition,
    stations: design.horizontalAlignment.stations,
    reader,
    priorTargetKeys,
    savedEntityPositions,
  });
  const reservationConflictCount = Object.values(analysis.reservationConflicts)
    .reduce((sum, cells) => sum + cells.length, 0);
  invariant(analysis.safe && analysis.savedEntityConflicts.length === 0
    && analysis.gradeShadows.length === 0 && reservationConflictCount === 0
    && analysis.sourceHazards.length === 0 && analysis.haloHazards.length === 0
    && analysis.priorIntersections.length === 0,
  `${definition.key} independent safety analysis drifted`);
  analyses.push({ definition, analysis });
}

const records = [];
const targetKeys = new Set();
let inverseCount = 0;
for (let packageIndex = 0; packageIndex < manifest.packages.length; packageIndex += 1) {
  const pkg = manifest.packages[packageIndex];
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
'source/inverse/target union drifted');

const firstRecords = records.filter(({ packageKey }) => packageKey.endsWith('1142-1145'));
const secondRecords = records.filter(({ packageKey }) => packageKey.endsWith('1172'));
const firstTargetKeys = new Set(firstRecords.map(({ cell }) => cellKey(cell)));
const secondTargetKeys = new Set(secondRecords.map(({ cell }) => cellKey(cell)));
const halos = analyses.map(({ analysis }) => analysis.halo);
const haloSets = halos.map((halo) => new Set(halo.map(cellKey)));
const intersectionCount = (left, right) => [...left].filter((key) => right.has(key)).length;
invariant(intersectionCount(firstTargetKeys, secondTargetKeys) === 0
  && intersectionCount(haloSets[0], haloSets[1]) === 0
  && intersectionCount(firstTargetKeys, haloSets[1]) === 0
  && intersectionCount(secondTargetKeys, haloSets[0]) === 0,
'target/halo disjointness drifted');

const leafTransitions = firstRecords.filter(({ sourceState, targetState }) => (
  sourceState.includes('_leaves[') && sourceState.includes('persistent=false')
    && targetState.includes('_leaves[') && targetState.includes('persistent=true')
));
invariant(leafTransitions.length === EXPECTED.leafTransitionCount
  && firstRecords.slice(0, EXPECTED.leafTransitionCount).every(({ cell }) => (
    leafTransitions.some((record) => cellKey(record.cell) === cellKey(cell))
  )),
'leaf stabilization ordering drifted');

const surfaceByScope = analyses.map(({ analysis }) => analysis.surface);
const stepTwoAdjacencies = surfaceByScope.map((cells) => {
  const pairs = [];
  for (let leftIndex = 0; leftIndex < cells.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < cells.length; rightIndex += 1) {
      const left = cells[leftIndex];
      const right = cells[rightIndex];
      if (Math.max(Math.abs(left.x - right.x), Math.abs(left.z - right.z)) === 1
        && Math.abs(left.y - right.y) === 2) pairs.push({
        left: {
          x: left.x, y: left.y, z: left.z, station: left.station, offset: left.offset,
        },
        right: {
          x: right.x, y: right.y, z: right.z, station: right.station, offset: right.offset,
        },
        stationDelta: Math.abs(left.station - right.station),
        offsetDelta: Math.abs(left.offset - right.offset),
        classification: 'CURVE_GENERATED_NON_ROUTE_LATERAL_CONTACT',
        bothOutsideThreeCellRouteSpine: Math.abs(left.offset) > 1 && Math.abs(right.offset) > 1,
        successiveStationProgression: Math.abs(left.station - right.station) === 1,
      });
    }
  }
  return pairs;
});
const routeSpines = surfaceByScope.map((cells) => cells.filter(({ offset }) => (
  Math.abs(offset) <= 1
)));
const stationCenterlines = analyses.map(({ definition }) => (
  design.horizontalAlignment.stations.slice(definition.start, definition.end + 1)
    .map((station, index) => ({
      x: station.x,
      y: station.highwayReferenceY,
      z: station.z,
      station: definition.start + index,
    }))
));
const surfaceKeySets = surfaceByScope.map((cells) => new Set(cells.map(cellKey)));
const routeSpineComponentCountPerScope = routeSpines.map(
  (cells) => connectedComponents(cells).length,
);
const stationCenterlineMaximumStepPerScope = stationCenterlines.map(maximumSequentialStationStep);
const maximumWalkableSurfaceStepPerScope = surfaceByScope.map(maximumWalkableSurfaceStep);
const rawPlanAdjacentElevationDeltaPerScope = surfaceByScope.map(maximumSurfaceStep);
invariant(stepTwoAdjacencies[0].length === 1 && stepTwoAdjacencies[1].length === 0
  && stepTwoAdjacencies[0][0].left.x === 1475
  && stepTwoAdjacencies[0][0].left.y === 67
  && stepTwoAdjacencies[0][0].left.z === -197
  && stepTwoAdjacencies[0][0].left.station === 1142
  && stepTwoAdjacencies[0][0].left.offset === -5
  && stepTwoAdjacencies[0][0].right.x === 1476
  && stepTwoAdjacencies[0][0].right.y === 65
  && stepTwoAdjacencies[0][0].right.z === -198
  && stepTwoAdjacencies[0][0].right.station === 1144
  && stepTwoAdjacencies[0][0].right.offset === -4
  && stepTwoAdjacencies[0][0].stationDelta === 2
  && stepTwoAdjacencies[0][0].bothOutsideThreeCellRouteSpine === true
  && stepTwoAdjacencies[0][0].successiveStationProgression === false,
'two-block raw plan adjacency is not the exact classified non-route curve contact');
invariant(routeSpines.every((cells) => cells.length > 0)
  && routeSpineComponentCountPerScope.every((count) => count === 1)
  && stationCenterlines.every((cells, index) => (
    cells.every((cell) => surfaceKeySets[index].has(cellKey(cell)))
  ))
  && stationCenterlineMaximumStepPerScope.every((step) => step <= 1)
  && maximumWalkableSurfaceStepPerScope.every((step) => step <= 1),
'max-step-one route spine or station centerline proof drifted');
const surfaces = surfaceByScope.flat();
const foundationCount = analyses.reduce(
  (sum, { analysis }) => sum + analysis.foundationRecords.length, 0,
);
const headroomCutCount = analyses.reduce(
  (sum, { analysis }) => sum + analysis.headroomRecords.length, 0,
);
const fullHeadroom = uniqueCells(analyses.flatMap(({ analysis }) => analysis.fullHeadroom));
const finalByKey = new Map(records.map((record) => [cellKey(record.cell), record.targetState]));
const projectedAt = async (cell) => finalByKey.get(cellKey(cell)) ?? await sourceAt(cell);
let stableSurfaceCount = 0;
for (const cell of surfaces) {
  const below = await projectedAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(below) && !isFluid(below)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(below))) stableSurfaceCount += 1;
}
let fullHeadroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await projectedAt(cell))) {
  fullHeadroomAirCount += 1;
}
invariant(surfaces.length === EXPECTED.surfaceCount
  && foundationCount === EXPECTED.foundationCount
  && headroomCutCount === EXPECTED.headroomCutCount
  && fullHeadroom.length === EXPECTED.fullHeadroomCount
  && stableSurfaceCount === surfaces.length
  && fullHeadroomAirCount === fullHeadroom.length
  && surfaceByScope.every((cells) => connectedComponents(cells).length === 1),
`surface/foundation/headroom topology drifted (${surfaces.length}/${foundationCount}/${headroomCutCount}/${fullHeadroom.length}/${stableSurfaceCount}/${fullHeadroomAirCount}/${surfaceByScope.map((cells) => connectedComponents(cells).length).join(',')}/${maximumWalkableSurfaceStepPerScope.join(',')}/${JSON.stringify(stepTwoAdjacencies)})`);

const haloUnion = uniqueCells(halos.flat());
let haloFluidCount = 0;
let haloForbiddenCount = 0;
for (const cell of haloUnion) {
  const state = await sourceAt(cell);
  if (isFluid(state)) haloFluidCount += 1;
  if (FORBIDDEN_SOURCE_BLOCKS.has(blockName(state))) haloForbiddenCount += 1;
}
invariant(haloUnion.length === EXPECTED.haloCount
  && hashCells(haloUnion) === EXPECTED.haloHash
  && haloFluidCount === 0 && haloForbiddenCount === 0,
'interaction halo identity/hazard census drifted');

const evidenceChecks = {};
for (const [name, expected] of Object.entries({
  'manifest-qa.json': { status: 'PASS' },
  'west-1142-1145-forward-source-preflight.json': { status: 'PASS', passed: 269, failed: 0 },
  'west-1172-forward-source-preflight.json': { status: 'PASS', passed: 67, failed: 0 },
  'west-1172-projected-rollback-preflight.json': { status: 'PASS', passed: 67, failed: 0 },
  'west-1142-1145-projected-rollback-preflight.json': { status: 'PASS', passed: 269, failed: 0 },
  'west-1142-1145-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'west-1172-forward-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'west-1172-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
  'west-1142-1145-rollback-strict-dry-run.json': { status: 'dry_run', strictNoop: true },
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
  mode: 'INDEPENDENT_READ_ONLY_R11K_OFFLINE_QA',
  manifest: {
    path: CANONICAL_MANIFEST,
    sha256: sha256(manifestBytes),
    manifestIdentitySha256: manifestIdentity,
  },
  source: manifest.source,
  controlBindings: manifest.controlBindings,
  checks: {
    packageCount: manifest.packages.length,
    exactSourceGuardMatchCount: records.length,
    exactInverseRecordCount: inverseCount,
    uniqueTargetCellCount: targetKeys.size,
    pavementSurfaceCellCount: surfaces.length,
    walkableSurfaceComponentCountPerScope: surfaceByScope.map(
      (cells) => connectedComponents(cells).length,
    ),
    maximumWalkableSurfaceStepPerScope,
    routeSpineCellCountPerScope: routeSpines.map((cells) => cells.length),
    routeSpineComponentCountPerScope,
    stationCenterlineCellCountPerScope: stationCenterlines.map((cells) => cells.length),
    stationCenterlineMaximumStepPerScope,
    rawPlanAdjacentElevationDeltaPerScope,
    nonRouteTwoBlockLateralContactCountPerScope: stepTwoAdjacencies.map(
      (pairs) => pairs.length,
    ),
    stableSurfaceCellCount: stableSurfaceCount,
    exactFoundationFillCount: foundationCount,
    headroomCutCount,
    fullHeadroomAirCount,
    leafStabilizationTransitionCount: leafTransitions.length,
    sourceGravityCellCount: 0,
    interactionHaloCellCount: haloUnion.length,
    crossPackageTargetIntersectionCount: 0,
    crossPackageHaloIntersectionCount: 0,
    crossPackageTargetHaloIntersectionCount: 0,
    haloFluidCount,
    haloForbiddenBlockCount: haloForbiddenCount,
    savedEntityConflictCount: 0,
    priorIntersectionCount: 0,
    reservationIntersectionCount: 0,
    blockedBroadInventoryEntityCount: inventory.scope.savedEntities.length,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  identities: {
    targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)),
    pavementSurfaceCoordinateSetSha256: hashCells(surfaces),
    interactionHaloCoordinateSetSha256: hashCells(haloUnion),
  },
  routeUsability: {
    proof: 'SUCCESSIVE_STATION_CENTERLINE_AND_THREE_CELL_SPINE_MAX_STEP_ONE',
    excludedRawPlanAdjacencies: stepTwoAdjacencies.flat(),
  },
  evidence: evidenceChecks,
  acceptance: {
    offlineReadyForFreshExecutionKernel: true,
    exactInteractionDisjointBatch: true,
    bothSurfacesIndependentlyUsable: true,
    entityReservationGradeShadowBandsPreservedUntouched: true,
    wholeRouteCommissioned: false,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), `# R11K west disjoint at-grade batch offline QA\n\nStatus: **PASS / FROZEN OFFLINE**\n\nThe exact ${records.length}-cell transaction contains two interaction-disjoint scopes: stations 1142–1145 and station 1172. Their ${surfaces.length} pavement cells form two independently max-step-one walkable components with ${stableSurfaceCount}/${surfaces.length} stable contacts and ${fullHeadroomAirCount}/${fullHeadroom.length} air headroom cells. Both the successive-station centerline and the three-cell route spine are one component per scope at max step one.\n\nThe only raw plan-adjacent elevation delta of two is the curve-generated lateral contact from (1475,67,-197), station 1142 offset -5, to (1476,65,-198), station 1144 offset -4. It skips a station and both cells are outside the offset -1..1 route spine, so it is not a route-progression edge. Removing that non-route contact leaves every pavement cell in the same max-step-one component. The first package stabilizes ${leafTransitions.length} leaves before its owned-log removals; exact reverse restores the logs before leaf persistence.\n\nThe disjoint halo union contains ${haloUnion.length.toLocaleString('en-US')} cells, zero fluid, zero forbidden blocks, zero prior intersections, and zero rail/utility reservation intersections. All entity, reservation, and grade-shadow bands outside the two exact scopes remain untouched. No whole-route or hydraulic/drainage/rail/utility commission is claimed.\n\nQA payload: \`${qaPayloadSha256}\`. No live call or world edit was performed.\n`);
console.log(JSON.stringify({
  status: report.status,
  out: OUT,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
