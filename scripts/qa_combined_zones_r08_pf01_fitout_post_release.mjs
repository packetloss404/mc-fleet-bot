#!/usr/bin/env node
/**
 * Independent read-only post-release QA for CZ-R08M EE-PF-01 fitout.
 *
 * Reproduces the platform/mechanism geometry, verifies every operated target,
 * proves the full clear interior is connected, checks retained liner/feed
 * boundaries and future seals, compares every non-target interaction cell to
 * the immutable source save, and binds execution plus rollback evidence.
 * No live call or world mutation is performed.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  assignD06CanonicalLayers,
  boundsOf,
  cellKey,
  cellsIn,
  deriveD06DetailedMechanismLayers,
  hashCells,
  rawCoordinateHash,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T17:49:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r08m-live-20260821T174621Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r08-empty-eight-platform-01-fitout.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r08m-post-20260821T174621Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const BASE_QA_PATH = value(
  '--base-qa',
  path.join(EVIDENCE_DIR, 'r08m-post-release-qa.json'),
);
const OUT_PATH = value(
  '--out',
  path.join(EVIDENCE_DIR, 'r08m-pf01-retention-supplement.json'),
);
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r08m-pf01-retention-supplement.md'),
);

const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  detailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
  materialDecision: 'docs/masterplans/05-combined-zones/phase1-r02-d06-scope-and-material-decision.json',
  linerManifest: 'data/buildops/combined-zones-r08-empty-eight-platform-01-partitioned-fluid-liner.release-manifest.json',
});
const BASENAME = 'combined-zones-r08-empty-eight-platform-01-fitout';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const PLATFORM_ID = 'EE-PF-01';
const ENCLOSURE_KEY = 'ee-pf-01-enclosure-finish';
const CLEARANCE_KEY = 'ee-pf-01-interior-clearance';
const EXPECTED = Object.freeze({
  manifestIdentity: '2e339c92c7505d0a1321263a6ef2d8dc1047868a74fd037b7e4659fc79d69add',
  operatedCellCount: 3859,
  operatedCoordinateSetSha256: '36d587b7cb1ace89e869f832d7e0b75eb92f5ac30c589db7468cbc8bbe95c6f1',
  enclosureOperationCount: 1609,
  clearanceOperationCount: 2250,
  chamberCellCount: 4242,
  floorCellCount: 707,
  ceilingCellCount: 707,
  clearInteriorCellCount: 2432,
  mechanismCellCount: 201,
  carrierCellCount: 194,
  fixtureCellCount: 7,
  retainedBarrierCellCount: 178,
  gateCapCellCount: 24,
  completeBarrierCellCount: 202,
  retainedLinerCellCount: 21,
  retainedLavaLinerCellCount: 16,
  retainedWaterLinerCellCount: 5,
  retainedWaterFeedCellCount: 5,
  retainedExternalLavaCellCount: 16,
  futureSealCellCount: 200,
});
const MATERIALS = Object.freeze({
  mainFinish: 'minecraft:polished_diorite',
  darkAccent: 'minecraft:polished_deepslate',
  centralAisle: 'minecraft:smooth_stone',
  retainedBarrier: 'minecraft:polished_blackstone',
  staticGateCap: 'minecraft:polished_deepslate',
  light: 'minecraft:sea_lantern',
  clear: 'minecraft:air',
});
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08M PF01 post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const insideBounds = (cell, bounds) => (
  cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ
);
const stateCensus = (records) => {
  const census = new Map();
  for (const record of records) {
    census.set(record.state, (census.get(record.state) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};
const mismatchCount = (records) => records
  .filter(({ state, expectedState }) => state !== expectedState).length;
const airMismatchCount = (records) => records
  .filter(({ state }) => !AIR_BLOCKS.has(state)).length;

function difference(left, right) {
  const rightKeys = new Set(right.map(cellKey));
  return uniqueCells(left.filter((cell) => !rightKeys.has(cellKey(cell))));
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#'))
    .join('\n')}\n`;
}

function parsePointOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger)
      && coordinates[0] === coordinates[3]
      && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5],
    `${filename} contains a non-point or invalid operation`);
    operations.push({
      cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function connectedComponentManifest(cells) {
  const remaining = new Set(cells.map(cellKey));
  const components = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    const component = [];
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      component.push({ x, y, z });
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    components.push(uniqueCells(component));
  }
  components.sort((left, right) => right.length - left.length);
  return {
    componentCount: components.length,
    largestComponentCellCount: components[0]?.length ?? 0,
    componentSetSha256: sha256(components
      .map((component) => `${component.length}:${hashCells(component)}`).sort().join('\n')),
  };
}

function executionEvidence(filename, expectedCount) {
  const report = readJson(filename);
  const passed = report.schemaVersion === 3
    && report.status === 'complete'
    && report.dryRun === false
    && report.strictNoop === true
    && report.operationRole === 'forward'
    && report.sourceOperationCount === expectedCount
    && report.sourceGroupCount === expectedCount
    && report.successfulGroups === expectedCount
    && report.failedGroups === 0
    && report.successfulCommands === expectedCount
    && report.failedCommands === 0
    && report.noopCommands === 0
    && report.unexpectedNoopCommands === 0
    && report.unknownReplyCommands === 0
    && report.worldEditLeftoverCount === 0;
  return {
    ...fileBinding(filename),
    status: report.status,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    noopCommands: report.noopCommands,
    passed,
  };
}

function rollbackEvidence(filename, expectedCount, postRegionSha256, overlayCount) {
  const report = readJson(filename);
  const overlays = report.sourceOverlays?.artifacts ?? [];
  const passed = report.status === 'PASS'
    && report.passed === expectedCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256
    && overlays.length === overlayCount
    && (report.sourceOverlays?.failed ?? 0) === 0;
  return {
    ...fileBinding(filename),
    status: report.status,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    overlayArtifactCount: overlays.length,
    passed,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const emptyEight = readJson(INPUTS.emptyEight);
const lifeSafety = readJson(INPUTS.lifeSafety);
const mechanisms = readJson(INPUTS.mechanisms);
const detailed = readJson(INPUTS.detailedSetout);
const materialDecision = readJson(INPUTS.materialDecision);
const linerManifest = readJson(INPUTS.linerManifest);
const baseQa = readJson(BASE_QA_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);
const baseQaBinding = fileBinding(BASE_QA_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE'
  && ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS'),
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === BASENAME
  && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === RELEASE_NODE_ID
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope drifted');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === EXPECTED.manifestIdentity
  && manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'manifest identity drifted');
invariant(manifest.target.operatedUnion.cellCount === EXPECTED.operatedCellCount
  && manifest.target.operatedUnion.coordinateSetSha256
    === EXPECTED.operatedCoordinateSetSha256,
'manifest operated target identity drifted');
invariant(baseQa.status === 'PASS_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE_ACCEPTED'
  && baseQa.qaPayloadSha256
    === 'ca8afa36ae6aded18aeced1c2d1ee0ed5b227357dfe86d7cf5396bd0f33f7afc'
  && baseQa.release?.manifestIdentity === EXPECTED.manifestIdentity
  && baseQa.release?.completedReleaseIdentitySha256
    === ledger.completedReleaseIdentitySha256
  && baseQa.result?.operatedTargetMatchCount === EXPECTED.operatedCellCount
  && baseQa.result?.preservedMechanismMatchCount === EXPECTED.mechanismCellCount
  && baseQa.result?.clearInteriorAirCount === EXPECTED.clearInteriorCellCount
  && baseQa.result?.rollbackGuardPassCount === EXPECTED.operatedCellCount,
'canonical generic R08M post-release QA is not the accepted bound PASS');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'post snapshot/intake ledger binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'post intake is not the ledger-bound complete save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'post region identity drifted');
const sourceRoot = ledger.sourceSnapshot.root;
const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256
  && ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256,
'source complete-save binding drifted');

const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
const floorBounds = platform.surface.bounds;
const floor = cellsIn(floorBounds);
invariant(floor.length === EXPECTED.floorCellCount
  && rawCoordinateHash(floor) === platform.surface.cellSetSha256,
'frozen PF01 floor does not reproduce');
const ceilingY = floorBounds.minY + 5;
const ceiling = cellsIn({ ...floorBounds, minY: ceilingY, maxY: ceilingY });
const interior = cellsIn({ ...floorBounds, minY: floorBounds.minY + 1, maxY: ceilingY - 1 });
const chamber = uniqueCells([...floor, ...interior, ...ceiling]);
const chamberKeys = new Set(chamber.map(cellKey));
const haloBounds = {
  minX: floorBounds.minX - 1, maxX: floorBounds.maxX + 1,
  minY: floorBounds.minY - 1, maxY: ceilingY + 1,
  minZ: floorBounds.minZ - 1, maxZ: floorBounds.maxZ + 1,
};
const gateBays = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 42, maxY: 43, minZ: 56, maxZ: 56,
}));
const completeBarrier = cellsIn({
  minX: 1652, maxX: 1752, minY: 42, maxY: 43, minZ: 56, maxZ: 56,
});
const retainedBarrier = difference(completeBarrier, gateBays);
const barrierRecord = lifeSafety.d06EmptyEightLifeSafety
  .failClosedBarriersAndSmokeInterfaces.platformBarriers.find(({ id }) => id === PLATFORM_ID);
invariant(retainedBarrier.length === EXPECTED.retainedBarrierCellCount
  && hashCells(retainedBarrier, 'combined-zones-d06-life-safety-cell-set-v1')
    === barrierRecord.retainedClosedBarrierReservation.coordinateSetSha256
  && gateBays.length === EXPECTED.gateCapCellCount,
'PF01 barrier geometry drifted');
const fixtures = [1660, 1676, 1692, 1708, 1724, 1740, 1748]
  .map((x) => ({ x, y: ceilingY, z: floorBounds.maxZ }));
invariant(fixtures.length === EXPECTED.fixtureCellCount
  && rawCoordinateHash(fixtures) === platform.emergencyLightingDesign.cellSetSha256,
'PF01 fixture geometry drifted');

const { layers, proposalUnion } = deriveD06DetailedMechanismLayers(
  mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  detailed,
);
const layerOwner = assignD06CanonicalLayers(layers, detailed);
const layerStates = materialDecision.decisionPayload.mechanismLayerStates;
const gateKeys = new Set(gateBays.map(cellKey));
const barrierKeys = new Set(completeBarrier.map(cellKey));
const fixtureKeys = new Set(fixtures.map(cellKey));
const mechanismInChamber = proposalUnion.filter((cell) => chamberKeys.has(cellKey(cell)));
const closedLiftCaps = mechanismInChamber.filter((cell) => (
  barrierKeys.has(cellKey(cell)) && layerOwner.get(cellKey(cell)) === 'egaLiftEnvelope'
));
const closedLiftKeys = new Set(closedLiftCaps.map(cellKey));
const preservedMechanisms = mechanismInChamber.filter((cell) => (
  !gateKeys.has(cellKey(cell)) && !closedLiftKeys.has(cellKey(cell))
));
const preservedKeys = new Set(preservedMechanisms.map(cellKey));
const carriers = preservedMechanisms.filter((cell) => [
  'normalCircuitCarrier', 'emergencyCircuitACarrier', 'emergencyCircuitBCarrier',
].includes(layerOwner.get(cellKey(cell))));
const clearInterior = interior.filter((cell) => (
  !barrierKeys.has(cellKey(cell)) && !preservedKeys.has(cellKey(cell))
));
const clearConnectivity = connectedComponentManifest(clearInterior);
invariant(chamber.length === EXPECTED.chamberCellCount
  && ceiling.length === EXPECTED.ceilingCellCount
  && preservedMechanisms.length === EXPECTED.mechanismCellCount
  && carriers.length === EXPECTED.carrierCellCount
  && clearInterior.length === EXPECTED.clearInteriorCellCount,
'PF01 chamber/mechanism/clear-space geometry drifted');

const packageByKey = new Map(manifest.packages.map((entry) => [entry.key, entry]));
const operationRecords = [];
for (const [key, count] of [
  [ENCLOSURE_KEY, EXPECTED.enclosureOperationCount],
  [CLEARANCE_KEY, EXPECTED.clearanceOperationCount],
]) {
  const pkg = packageByKey.get(key);
  invariant(pkg, `manifest package ${key} is missing`);
  const declared = manifest.operations[key];
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256,
  `${key} operation body drifted`);
  const forward = parsePointOperations(pkg.forward);
  const rollback = parsePointOperations(pkg.rollback);
  const exactInverse = forward.slice().reverse().every((entry, index) => {
    const inverse = rollback[index];
    return cellKey(entry.cell) === cellKey(inverse.cell)
      && entry.fromState === inverse.toState
      && entry.toState === inverse.fromState;
  });
  invariant(forward.length === count && rollback.length === count && exactInverse,
    `${key} count or exact inverse drifted`);
  operationRecords.push(...forward.map((entry) => ({ ...entry, packageKey: key })));
}
const operatedCells = uniqueCells(operationRecords.map(({ cell }) => cell));
const operatedKeys = new Set(operatedCells.map(cellKey));
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && hashCells(operatedCells) === EXPECTED.operatedCoordinateSetSha256,
'operation files do not reproduce the target identity');

const linerOperations = linerManifest.packages.flatMap((pkg) => (
  parsePointOperations(pkg.forward)
));
const retainedLiner = linerOperations.filter(({ cell }) => (
  insideBounds(cell, haloBounds) && !chamberKeys.has(cellKey(cell))
));
const retainedLavaLiner = retainedLiner.filter(({ fromState }) => (
  fromState === 'minecraft:lava[level=0]'
));
const retainedWaterLiner = retainedLiner.filter(({ fromState }) => (
  fromState.startsWith('minecraft:water[')
));
invariant(retainedLiner.length === EXPECTED.retainedLinerCellCount
  && hashCells(retainedLiner.map(({ cell }) => cell))
    === '258c990049ba981fb5cfd964dbe140b3197d24d1fdb84d84fd1f008cb8dc4ddc'
  && retainedLavaLiner.length === EXPECTED.retainedLavaLinerCellCount
  && retainedWaterLiner.length === EXPECTED.retainedWaterLinerCellCount
  && retainedLiner.every(({ cell }) => !operatedKeys.has(cellKey(cell))),
'retained PF01 liner boundary identity or target exclusion drifted');
const retainedFeedCells = linerManifest.source.retainedWaterFeed.map(({ cell }) => cell);
const retainedWaterRoot = linerManifest.source.retainedWaterRoot.cell;

const sourceReader = new AnvilReader(absolute(path.join(sourceRoot, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const stateCache = new Map();
async function statesAt(cell) {
  const key = cellKey(cell);
  if (!stateCache.has(key)) {
    stateCache.set(key, {
      source: stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)),
      post: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return stateCache.get(key);
}
async function postRecords(cells, expectedStateFor) {
  const output = [];
  for (const cell of cells) {
    output.push({
      cell,
      expectedState: expectedStateFor(cell),
      state: (await statesAt(cell)).post,
    });
  }
  return output;
}

const externalLavaSourceMap = new Map();
const retainedKeys = new Set(retainedLiner.map(({ cell }) => cellKey(cell)));
for (const { cell } of retainedLavaLiner) {
  for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
    const neighbour = { x: cell.x + dx, y: cell.y + dy, z: cell.z + dz };
    if (retainedKeys.has(cellKey(neighbour))) continue;
    if ((await statesAt(neighbour)).post === 'minecraft:lava[level=0]') {
      externalLavaSourceMap.set(cellKey(neighbour), neighbour);
    }
  }
}
const externalLavaSources = uniqueCells([...externalLavaSourceMap.values()]);
invariant(externalLavaSources.length === EXPECTED.retainedExternalLavaCellCount
  && hashCells(externalLavaSources)
    === 'a3f6aec2442f9495c37489700bc1a8bcee15dd79f11a2e802d226dbb11672368',
'retained external lava-source edge drifted');

const futureSealCells = uniqueCells(emptyEight.d06.futureInterfaces.interfaces
  .flatMap((entry) => cellsIn(entry.sealDesign.bounds)));
invariant(futureSealCells.length === EXPECTED.futureSealCellCount
  && futureSealCells.every((cell) => !operatedKeys.has(cellKey(cell))),
'future seal identity or target exclusion drifted');

const operationByKey = new Map(operationRecords.map((record) => [cellKey(record.cell), record]));
const operatedPostRecords = await postRecords(operatedCells, (cell) => (
  operationByKey.get(cellKey(cell)).toState
));
const floorRecords = await postRecords(floor, (cell) => (
  cell.z === floorBounds.minZ || cell.z === floorBounds.maxZ
    ? MATERIALS.darkAccent
    : cell.z === floorBounds.minZ + 3 ? MATERIALS.centralAisle : MATERIALS.mainFinish
));
const ceilingRecords = await postRecords(ceiling, (cell) => (
  fixtureKeys.has(cellKey(cell)) ? MATERIALS.light : MATERIALS.mainFinish
));
const clearRecords = await postRecords(clearInterior, () => MATERIALS.clear);
const mechanismRecords = await postRecords(preservedMechanisms, (cell) => (
  layerStates[layerOwner.get(cellKey(cell))].state
));
const fixtureRecords = await postRecords(fixtures, () => MATERIALS.light);
const retainedBarrierRecords = await postRecords(retainedBarrier, () => MATERIALS.retainedBarrier);
const gateCapRecords = await postRecords(gateBays, () => MATERIALS.staticGateCap);
const retainedLinerRecords = await postRecords(retainedLiner.map(({ cell }) => cell), () => (
  'minecraft:deepslate_tiles'
));
const feedStateByKey = new Map(linerManifest.source.retainedWaterFeed.map((entry) => (
  [cellKey(entry.cell), entry.observedState]
)));
const feedRecords = await postRecords(retainedFeedCells, (cell) => feedStateByKey.get(cellKey(cell)));
const rootRecords = await postRecords([retainedWaterRoot], () => (
  linerManifest.source.retainedWaterRoot.observedState
));
const externalLavaRecords = await postRecords(externalLavaSources, () => (
  'minecraft:lava[level=0]'
));

const nonTargetAuditCells = uniqueCells([
  ...cellsIn(haloBounds).filter((cell) => !operatedKeys.has(cellKey(cell))),
  ...retainedFeedCells,
  retainedWaterRoot,
  ...externalLavaSources,
  ...futureSealCells,
]);
const undeclaredDrift = [];
for (const cell of nonTargetAuditCells) {
  const states = await statesAt(cell);
  if (states.source !== states.post) undeclaredDrift.push({ cell, ...states });
}

const enclosureExecution = executionEvidence(
  path.join(EVIDENCE_DIR, `${ENCLOSURE_KEY}.forward-execution.json`),
  EXPECTED.enclosureOperationCount,
);
const clearanceExecution = executionEvidence(
  path.join(EVIDENCE_DIR, `${CLEARANCE_KEY}.forward-execution.json`),
  EXPECTED.clearanceOperationCount,
);
const clearanceRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, `${CLEARANCE_KEY}.rollback-poststate-preflight.json`),
  EXPECTED.clearanceOperationCount,
  postIdentity.sha256,
  0,
);
const enclosureRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, `${ENCLOSURE_KEY}.rollback-poststate-preflight.json`),
  EXPECTED.enclosureOperationCount,
  postIdentity.sha256,
  1,
);

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R08M-PF01-QA-00-BASE-SEAL-BOUND',
  baseQa.status === 'PASS_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE_ACCEPTED',
  `Canonical base QA ${baseQa.qaPayloadSha256} is bound and PASS.`);
check('R08M-QA-01-TERMINAL-LEDGER',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && ledger.stages.every(({ status }) => status === 'PASS'),
  `${ledger.stages.length}/${ledger.stages.length} execution stages PASS.`);
check('R08M-QA-02-RELEASE-IDENTITY',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && ledger.manifest.sha256 === manifestBinding.sha256,
  `Manifest ${manifest.manifestIdentity}; completed release ${ledger.completedReleaseIdentitySha256}.`);
check('R08M-QA-03-POST-SAVE',
  postIntake.packageIdentity.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256,
  `Post complete-save ${ledger.postSnapshot.completeSaveSha256}; region ${postIdentity.sha256}.`);
check('R08M-QA-04-EXACT-TARGET-STATES',
  operatedPostRecords.length === EXPECTED.operatedCellCount
    && mismatchCount(operatedPostRecords) === 0,
  `${operatedPostRecords.length - mismatchCount(operatedPostRecords)}/${EXPECTED.operatedCellCount} target states exact.`);
check('R08M-QA-05-CONNECTED-INTERIOR',
  clearRecords.length === EXPECTED.clearInteriorCellCount
    && airMismatchCount(clearRecords) === 0
    && clearConnectivity.componentCount === 1
    && clearConnectivity.largestComponentCellCount === EXPECTED.clearInteriorCellCount,
  `${clearRecords.length - airMismatchCount(clearRecords)}/${EXPECTED.clearInteriorCellCount} air-family cells in ${clearConnectivity.componentCount} component.`);
check('R08M-QA-06-PRESERVED-MECHANISMS',
  mechanismRecords.length === EXPECTED.mechanismCellCount
    && mismatchCount(mechanismRecords) === 0,
  `${mechanismRecords.length - mismatchCount(mechanismRecords)}/${EXPECTED.mechanismCellCount} mechanism states exact, including ${EXPECTED.carrierCellCount} carriers.`);
check('R08M-QA-07-LIGHTS-AND-BARRIER',
  mismatchCount(fixtureRecords) === 0
    && mismatchCount(retainedBarrierRecords) === 0
    && mismatchCount(gateCapRecords) === 0,
  `${fixtureRecords.length}/${EXPECTED.fixtureCellCount} lights and ${retainedBarrierRecords.length + gateCapRecords.length}/${EXPECTED.completeBarrierCellCount} barrier cells exact.`);
check('R08M-QA-08-RETAINED-LINER-AND-FEEDS',
  mismatchCount(retainedLinerRecords) === 0
    && mismatchCount(feedRecords) === 0
    && mismatchCount(rootRecords) === 0
    && mismatchCount(externalLavaRecords) === 0,
  `${retainedLinerRecords.length}/${EXPECTED.retainedLinerCellCount} liner, ${feedRecords.length}/${EXPECTED.retainedWaterFeedCellCount} feeds, root and ${externalLavaRecords.length}/${EXPECTED.retainedExternalLavaCellCount} lava sources exact.`);
check('R08M-QA-09-FUTURE-SEALS-AND-UNDECLARED-DRIFT',
  futureSealCells.length === EXPECTED.futureSealCellCount && undeclaredDrift.length === 0,
  `${futureSealCells.length}/${EXPECTED.futureSealCellCount} future seal cells preserved; ${undeclaredDrift.length} undeclared drift cells across ${nonTargetAuditCells.length} non-target cells.`);
check('R08M-QA-10-STRICT-EXECUTION',
  enclosureExecution.passed && clearanceExecution.passed,
  `${enclosureExecution.successfulGroups + clearanceExecution.successfulGroups}/${EXPECTED.operatedCellCount} strict groups succeeded with zero no-op.`);
check('R08M-QA-11-ROLLBACK-POSTSTATE',
  clearanceRollback.passed && enclosureRollback.passed,
  `${clearanceRollback.passedGuards + enclosureRollback.passedGuards}/${EXPECTED.operatedCellCount} reverse-order rollback guards PASS.`);
check('R08M-QA-12-FINISH-GEOMETRY',
  mismatchCount(floorRecords) === 0 && mismatchCount(ceilingRecords) === 0,
  `${floorRecords.length + ceilingRecords.length}/${EXPECTED.floorCellCount + EXPECTED.ceilingCellCount} floor/ceiling states exact.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r08m-empty-eight-platform-01-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE_ACCEPTED'
    : 'FAIL_R08M_EMPTY_EIGHT_PLATFORM_01_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    manifestIdentity: manifest.manifestIdentity,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    canonicalBaseQa: {
      ...baseQaBinding,
      status: baseQa.status,
      qaPayloadSha256: baseQa.qaPayloadSha256,
    },
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    sourceCompleteSave: {
      root: sourceRoot,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      intake: sourceIntakeBinding,
    },
    postCompleteSave: {
      root: POST_ROOT,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
    },
  },
  geometry: {
    chamber: classManifest(chamber),
    floor: classManifest(floor),
    ceiling: classManifest(ceiling),
    clearInterior: classManifest(clearInterior),
    preservedMechanisms: classManifest(preservedMechanisms),
    preservedCarrierBands: classManifest(carriers),
    lightingFixtures: classManifest(fixtures),
    completeBarrier: classManifest(completeBarrier),
    operatedTargets: classManifest(operatedCells),
    retainedLinerBoundary: classManifest(retainedLiner.map(({ cell }) => cell)),
    retainedOuterLavaLiner: classManifest(retainedLavaLiner.map(({ cell }) => cell)),
    retainedWaterBoundaryLiner: classManifest(retainedWaterLiner.map(({ cell }) => cell)),
    retainedWaterFeed: classManifest(retainedFeedCells),
    retainedExternalLavaSources: classManifest(externalLavaSources),
    futureSeals: classManifest(futureSealCells),
    nonTargetAuditUniverse: classManifest(nonTargetAuditCells),
  },
  postState: {
    operatedTargets: {
      matchingCellCount: operatedPostRecords.length - mismatchCount(operatedPostRecords),
      mismatchCellCount: mismatchCount(operatedPostRecords),
      stateCensus: stateCensus(operatedPostRecords),
    },
    clearInterior: {
      matchingCellCount: clearRecords.length - airMismatchCount(clearRecords),
      mismatchCellCount: airMismatchCount(clearRecords),
      stateCensus: stateCensus(clearRecords),
      connectivity: clearConnectivity,
    },
    preservedMechanisms: {
      matchingCellCount: mechanismRecords.length - mismatchCount(mechanismRecords),
      mismatchCellCount: mismatchCount(mechanismRecords),
      stateCensus: stateCensus(mechanismRecords),
    },
    retainedBoundary: {
      linerMatchCount: retainedLinerRecords.length - mismatchCount(retainedLinerRecords),
      feedMatchCount: feedRecords.length - mismatchCount(feedRecords),
      rootMatchCount: rootRecords.length - mismatchCount(rootRecords),
      externalLavaMatchCount: externalLavaRecords.length - mismatchCount(externalLavaRecords),
    },
    undeclaredDrift: {
      auditedCellCount: nonTargetAuditCells.length,
      driftCellCount: undeclaredDrift.length,
      listedDrift: undeclaredDrift.slice(0, 100),
    },
  },
  executionEvidence: {
    packages: [enclosureExecution, clearanceExecution],
    rollbackPoststatePreflights: [clearanceRollback, enclosureRollback],
    strictSuccessfulGroupCount:
      enclosureExecution.successfulGroups + clearanceExecution.successfulGroups,
    strictFailedGroupCount: enclosureExecution.failedGroups + clearanceExecution.failedGroups,
    strictNoopCount: enclosureExecution.noopCommands + clearanceExecution.noopCommands,
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    operatedTargetMatchCount: operatedPostRecords.length - mismatchCount(operatedPostRecords),
    clearInteriorAirCellCount: clearRecords.length - airMismatchCount(clearRecords),
    clearInteriorComponentCount: clearConnectivity.componentCount,
    preservedMechanismMatchCount: mechanismRecords.length - mismatchCount(mechanismRecords),
    lightingFixtureMatchCount: fixtureRecords.length - mismatchCount(fixtureRecords),
    completeBarrierMatchCount: retainedBarrierRecords.length + gateCapRecords.length
      - mismatchCount(retainedBarrierRecords) - mismatchCount(gateCapRecords),
    retainedLinerMatchCount: retainedLinerRecords.length - mismatchCount(retainedLinerRecords),
    retainedFeedAndRootMatchCount: feedRecords.length + rootRecords.length
      - mismatchCount(feedRecords) - mismatchCount(rootRecords),
    retainedExternalLavaMatchCount:
      externalLavaRecords.length - mismatchCount(externalLavaRecords),
    futureSealMatchCount: futureSealCells.length,
    undeclaredDriftCellCount: undeclaredDrift.length,
    rollbackGuardPassCount: clearanceRollback.passedGuards + enclosureRollback.passedGuards,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    readOnlyAnvilInputs: true,
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
const report = { ...qaPayload, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MARKDOWN_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R08M Empty Eight EE-PF-01 retention supplement

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`
**Canonical base QA:** \`${baseQa.qaPayloadSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact operated states | ${report.summary.operatedTargetMatchCount.toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} |
| Clear interior | ${report.summary.clearInteriorAirCellCount.toLocaleString()} / ${EXPECTED.clearInteriorCellCount.toLocaleString()} in ${report.summary.clearInteriorComponentCount} component |
| Preserved mechanisms | ${report.summary.preservedMechanismMatchCount} / ${EXPECTED.mechanismCellCount} |
| Preserved lights | ${report.summary.lightingFixtureMatchCount} / ${EXPECTED.fixtureCellCount} |
| Complete barrier | ${report.summary.completeBarrierMatchCount} / ${EXPECTED.completeBarrierCellCount} |
| Retained liner boundary | ${report.summary.retainedLinerMatchCount} / ${EXPECTED.retainedLinerCellCount} |
| Water feeds + root | ${report.summary.retainedFeedAndRootMatchCount} / ${EXPECTED.retainedWaterFeedCellCount + 1} |
| External lava sources | ${report.summary.retainedExternalLavaMatchCount} / ${EXPECTED.retainedExternalLavaCellCount} |
| Future seals | ${report.summary.futureSealMatchCount} / ${EXPECTED.futureSealCellCount} |
| Undeclared drift | ${report.summary.undeclaredDriftCellCount} / ${report.postState.undeclaredDrift.auditedCellCount} audited non-target cells |
| Strict execution | ${report.executionEvidence.strictSuccessfulGroupCount.toLocaleString()} succeeded / ${report.executionEvidence.strictFailedGroupCount} failed / ${report.executionEvidence.strictNoopCount} no-op |
| Rollback post-state | ${report.summary.rollbackGuardPassCount.toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} guards PASS |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

This verifier read only immutable source/post Anvil saves and hash-bound
evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  exactOperatedStates: `${report.summary.operatedTargetMatchCount}/${EXPECTED.operatedCellCount}`,
  clearInterior: `${report.summary.clearInteriorAirCellCount}/${EXPECTED.clearInteriorCellCount}`,
  clearInteriorComponents: report.summary.clearInteriorComponentCount,
  preservedMechanisms: `${report.summary.preservedMechanismMatchCount}/${EXPECTED.mechanismCellCount}`,
  retainedLiner: `${report.summary.retainedLinerMatchCount}/${EXPECTED.retainedLinerCellCount}`,
  retainedFeedAndRoot: `${report.summary.retainedFeedAndRootMatchCount}/${EXPECTED.retainedWaterFeedCellCount + 1}`,
  externalLava: `${report.summary.retainedExternalLavaMatchCount}/${EXPECTED.retainedExternalLavaCellCount}`,
  futureSeals: `${report.summary.futureSealMatchCount}/${EXPECTED.futureSealCellCount}`,
  undeclaredDrift: report.summary.undeclaredDriftCellCount,
  rollbackGuards: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operatedCellCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
