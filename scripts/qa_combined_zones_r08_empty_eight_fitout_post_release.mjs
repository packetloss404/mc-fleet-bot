#!/usr/bin/env node
/**
 * Read-only post-release QA and seal for CZ-R08A EE-PF-03 fit-out.
 *
 * The verifier independently reproduces the frozen platform geometry, reads
 * every operated and preserved state from the immutable post save, and binds
 * the terminal execution ledger, release manifest, execution reports, post
 * snapshot identity, and reverse-order rollback preflights. It performs no
 * live call and no world mutation.
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

const GENERATED_AT = value('--generated-at', '2026-08-21T16:20:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r08a-live-20260821T161558Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r08a-post-20260821T161558Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r08a-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r08a-post-release-qa.md'),
);

const INPUTS = Object.freeze({
  emptyEight: 'docs/masterplans/05-combined-zones/phase1-empty-eight-geology-design.json',
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  mechanisms: 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json',
  detailedSetout: 'docs/masterplans/05-combined-zones/phase1-d06-detailed-mechanism-setout.json',
});
const BASENAME = 'combined-zones-r08-empty-eight-platform-03-fitout';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const PLATFORM_ID = 'EE-PF-03';
const EXPECTED = Object.freeze({
  operatedCellCount: 3962,
  operatedCoordinateSetSha256: '85ebae745b64ee6d20f24f527a0e72dad935a83ffe1187466521ccae1890b91b',
  enclosureOperationCount: 1609,
  clearanceOperationCount: 2353,
  chamberCellCount: 4242,
  floorCellCount: 707,
  ceilingCellCount: 707,
  clearInteriorCellCount: 2432,
  retainedBarrierCellCount: 178,
  gateCapCellCount: 24,
  completeBarrierCellCount: 202,
  carrierCellCount: 194,
  fixtureCellCount: 7,
});
const MATERIALS = Object.freeze({
  mainFinish: 'minecraft:polished_diorite',
  darkAccent: 'minecraft:polished_deepslate',
  centralAisle: 'minecraft:smooth_stone',
  retainedBarrier: 'minecraft:polished_blackstone',
  staticGateCap: 'minecraft:polished_deepslate',
  light: 'minecraft:sea_lantern',
  clear: 'minecraft:air',
  carrier: 'minecraft:polished_blackstone',
});
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
  if (!condition) throw new Error(`R08A post-release QA rejected: ${message}`);
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
const stateCensus = (records) => {
  const census = new Map();
  for (const record of records) {
    census.set(record.state, (census.get(record.state) ?? 0) + 1);
  }
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};

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
      `${filename} contains a malformed or non-REPL operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.every(Number.isSafeInteger), `${filename} contains invalid coordinates`);
    invariant(coordinates[0] === coordinates[3]
      && coordinates[1] === coordinates[4]
      && coordinates[2] === coordinates[5],
    `${filename} contains a non-point operation`);
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
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort()
      .join('\n')),
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
    strictNoop: report.strictNoop,
    successfulGroups: report.successfulGroups,
    failedGroups: report.failedGroups,
    noopCommands: report.noopCommands,
    passed,
  };
}

function rollbackEvidence(filename, expectedCount, postRegionSha256, expectedOverlayCount) {
  const report = readJson(filename);
  const overlayArtifacts = report.sourceOverlays?.artifacts ?? [];
  const passed = report.status === 'PASS'
    && report.passed === expectedCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256
    && overlayArtifacts.length === expectedOverlayCount
    && (report.sourceOverlays?.failed ?? 0) === 0;
  return {
    ...fileBinding(filename),
    status: report.status,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    overlayArtifactCount: overlayArtifacts.length,
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
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.mode === 'EXECUTE',
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === BASENAME
  && ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === RELEASE_NODE_ID
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope does not match R08A');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'release manifest payload identity drifted');
invariant(manifest.target?.operatedUnion?.cellCount === EXPECTED.operatedCellCount
  && manifest.target?.operatedUnion?.coordinateSetSha256
    === EXPECTED.operatedCoordinateSetSha256,
'release manifest operated target identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post snapshot/intake binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256
    === ledger.postSnapshot.completeSaveSha256,
'post complete-save intake is not the ledger-bound PASS save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region')),
'post region identity binding drifted');
invariant(fs.existsSync(absolute(path.join(POST_ROOT, 'region'))),
'post region directory is missing');

const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity?.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256,
'source complete-save intake binding drifted');
const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');

// Independently reproduce exact platform geometry from the frozen upstream
// records rather than trusting the release manifest's summaries.
const platform = emptyEight.d06.platforms.find(({ id }) => id === PLATFORM_ID);
const barrierRecord = lifeSafety.d06EmptyEightLifeSafety
  .failClosedBarriersAndSmokeInterfaces.platformBarriers.find(({ id }) => id === PLATFORM_ID);
const floor = cellsIn(platform.surface.bounds);
invariant(floor.length === EXPECTED.floorCellCount
  && rawCoordinateHash(floor) === platform.surface.cellSetSha256,
'frozen platform surface identity does not reproduce');
const ceiling = cellsIn({
  minX: 1652, maxX: 1752, minY: 46, maxY: 46, minZ: 82, maxZ: 88,
});
const interior = cellsIn({
  minX: 1652, maxX: 1752, minY: 42, maxY: 45, minZ: 82, maxZ: 88,
});
const chamber = uniqueCells([...floor, ...interior, ...ceiling]);
const gateBays = [1664, 1688, 1712, 1736].flatMap((minX) => cellsIn({
  minX, maxX: minX + 2, minY: 42, maxY: 43, minZ: 82, maxZ: 82,
}));
const completeBarrier = cellsIn({
  minX: 1652, maxX: 1752, minY: 42, maxY: 43, minZ: 82, maxZ: 82,
});
const retainedBarrier = difference(completeBarrier, gateBays);
invariant(retainedBarrier.length === barrierRecord.retainedClosedBarrierReservation.cellCount
  && hashCells(retainedBarrier, 'combined-zones-d06-life-safety-cell-set-v1')
    === barrierRecord.retainedClosedBarrierReservation.coordinateSetSha256,
'retained barrier identity does not reproduce');
invariant(gateBays.length === barrierRecord.staticGateBayCap.cellCount
  && hashCells(gateBays, 'combined-zones-d06-life-safety-cell-set-v1')
    === barrierRecord.staticGateBayCap.coordinateSetSha256,
'gate-cap identity does not reproduce');
const fixtures = [1660, 1676, 1692, 1708, 1724, 1740, 1748]
  .map((x) => ({ x, y: 46, z: 88 }));
invariant(rawCoordinateHash(fixtures) === platform.emergencyLightingDesign.cellSetSha256,
'lighting fixture identity does not reproduce');

const { layers, proposalUnion } = deriveD06DetailedMechanismLayers(
  mechanisms.mechanismDevelopmentPayload,
  emptyEight,
  detailed,
);
const layerOwner = assignD06CanonicalLayers(layers, detailed);
const chamberKeys = new Set(chamber.map(cellKey));
const carriers = proposalUnion.filter((cell) => (
  chamberKeys.has(cellKey(cell))
  && ['normalCircuitCarrier', 'emergencyCircuitACarrier'].includes(layerOwner.get(cellKey(cell)))
));
invariant(carriers.length === EXPECTED.carrierCellCount,
'preserved carrier geometry drifted');
const barrierKeys = new Set(completeBarrier.map(cellKey));
const carrierKeys = new Set(carriers.map(cellKey));
const clearInterior = interior.filter((cell) => (
  !barrierKeys.has(cellKey(cell)) && !carrierKeys.has(cellKey(cell))
));
invariant(chamber.length === EXPECTED.chamberCellCount
  && clearInterior.length === EXPECTED.clearInteriorCellCount,
'chamber or clear-interior geometry drifted');
const clearConnectivity = connectedComponentManifest(clearInterior);

const packageByKey = new Map(manifest.packages.map((entry) => [entry.key, entry]));
const operationRecords = [];
for (const [key, count] of [
  ['ee-pf-03-enclosure-finish', EXPECTED.enclosureOperationCount],
  ['ee-pf-03-interior-clearance', EXPECTED.clearanceOperationCount],
]) {
  const pkg = packageByKey.get(key);
  invariant(pkg, `manifest package ${key} is missing`);
  const manifestOperation = manifest.operations[key];
  invariant(sha256(operationBody(pkg.forward)) === manifestOperation.forwardSha256,
    `${key} forward body drifted`);
  invariant(sha256(operationBody(pkg.rollback)) === manifestOperation.rollbackSha256,
    `${key} rollback body drifted`);
  const parsed = parsePointOperations(pkg.forward);
  invariant(parsed.length === count && manifestOperation.forwardCommandCount === count,
    `${key} command count drifted`);
  operationRecords.push(...parsed.map((operation) => ({ ...operation, packageKey: key })));
}
const operatedCells = uniqueCells(operationRecords.map(({ cell }) => cell));
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && hashCells(operatedCells) === EXPECTED.operatedCoordinateSetSha256,
'operation files do not reproduce the declared operated target identity');

const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
async function postRecords(cells, expectedStateFor) {
  const output = [];
  for (const cell of cells) {
    output.push({
      cell,
      expectedState: expectedStateFor(cell),
      state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
    });
  }
  return output;
}

const operatedPostRecords = await postRecords(
  operationRecords.map(({ cell }) => cell),
  (cell) => operationRecords.find((record) => cellKey(record.cell) === cellKey(cell)).toState,
);
const operatedMismatches = operatedPostRecords
  .filter(({ state, expectedState }) => state !== expectedState);
const floorRecords = await postRecords(floor, (cell) => (
  cell.z === 82 || cell.z === 88
    ? MATERIALS.darkAccent
    : cell.z === 85 ? MATERIALS.centralAisle : MATERIALS.mainFinish
));
const ceilingRecords = await postRecords(ceiling, (cell) => (
  fixtures.some((fixture) => cellKey(fixture) === cellKey(cell))
    ? MATERIALS.light : MATERIALS.mainFinish
));
const retainedBarrierRecords = await postRecords(
  retainedBarrier,
  () => MATERIALS.retainedBarrier,
);
const gateCapRecords = await postRecords(gateBays, () => MATERIALS.staticGateCap);
const clearRecords = await postRecords(clearInterior, () => MATERIALS.clear);
const carrierRecords = await postRecords(carriers, () => MATERIALS.carrier);
const fixtureRecords = await postRecords(fixtures, () => MATERIALS.light);
const mismatchCount = (records) => records
  .filter(({ state, expectedState }) => state !== expectedState).length;

const enclosureExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'ee-pf-03-enclosure-finish.forward-execution.json'),
  EXPECTED.enclosureOperationCount,
);
const clearanceExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'ee-pf-03-interior-clearance.forward-execution.json'),
  EXPECTED.clearanceOperationCount,
);
const clearanceRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'ee-pf-03-interior-clearance.rollback-poststate-preflight.json'),
  EXPECTED.clearanceOperationCount,
  postIdentity.sha256,
  0,
);
const enclosureRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'ee-pf-03-enclosure-finish.rollback-poststate-preflight.json'),
  EXPECTED.enclosureOperationCount,
  postIdentity.sha256,
  1,
);

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R08A-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} ledger stages PASS.`);
check('R08A-QA-02-RELEASE-IDENTITY-BOUND',
  ledger.manifest.sha256 === manifestBinding.sha256
    && manifest.manifestIdentity === 'f02046ae2e7ea6727ae5aaa2bf2429078544a86d36b00aafb22a26a699374362',
  `Manifest ${manifest.manifestIdentity}; ledger binding ${ledger.manifest.sha256}.`);
check('R08A-QA-03-POST-COMPLETE-SAVE-BOUND',
  postIntake.packageIdentity.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256,
  `Post complete-save ${ledger.postSnapshot.completeSaveSha256}; region ${postIdentity.sha256}.`);
check('R08A-QA-04-EXACT-OPERATED-STATES',
  operatedPostRecords.length === EXPECTED.operatedCellCount && operatedMismatches.length === 0,
  `${operatedPostRecords.length - operatedMismatches.length}/${operatedPostRecords.length} exact operated target states.`);
check('R08A-QA-05-FROZEN-CHAMBER-GEOMETRY',
  chamber.length === EXPECTED.chamberCellCount
    && floor.length === EXPECTED.floorCellCount
    && ceiling.length === EXPECTED.ceilingCellCount,
  `${chamber.length} chamber cells; ${floor.length} floor; ${ceiling.length} ceiling.`);
check('R08A-QA-06-FLOOR-AND-CEILING-FINISH',
  mismatchCount(floorRecords) === 0 && mismatchCount(ceilingRecords) === 0,
  `${floorRecords.length + ceilingRecords.length}/${floorRecords.length + ceilingRecords.length} finish states exact.`);
check('R08A-QA-07-CLEAR-INTERIOR',
  clearRecords.length === EXPECTED.clearInteriorCellCount
    && mismatchCount(clearRecords) === 0
    && clearConnectivity.componentCount === 1
    && clearConnectivity.largestComponentCellCount === EXPECTED.clearInteriorCellCount,
  `${clearRecords.length - mismatchCount(clearRecords)}/${clearRecords.length} air; ${clearConnectivity.componentCount} connected component.`);
check('R08A-QA-08-PRESERVED-CARRIERS-AND-LIGHTS',
  carrierRecords.length === EXPECTED.carrierCellCount
    && fixtureRecords.length === EXPECTED.fixtureCellCount
    && mismatchCount(carrierRecords) === 0
    && mismatchCount(fixtureRecords) === 0,
  `${carrierRecords.length}/${EXPECTED.carrierCellCount} carriers and ${fixtureRecords.length}/${EXPECTED.fixtureCellCount} lights exact.`);
check('R08A-QA-09-COMPLETE-FAIL-CLOSED-BARRIER',
  retainedBarrierRecords.length === EXPECTED.retainedBarrierCellCount
    && gateCapRecords.length === EXPECTED.gateCapCellCount
    && mismatchCount(retainedBarrierRecords) === 0
    && mismatchCount(gateCapRecords) === 0,
  `${retainedBarrierRecords.length + gateCapRecords.length}/${EXPECTED.completeBarrierCellCount} barrier states exact.`);
check('R08A-QA-10-STRICT-EXECUTION',
  enclosureExecution.passed && clearanceExecution.passed,
  `${enclosureExecution.successfulGroups + clearanceExecution.successfulGroups}/${EXPECTED.operatedCellCount} strict groups succeeded; zero no-op.`);
check('R08A-QA-11-ROLLBACK-POSTSTATE',
  enclosureRollback.passed && clearanceRollback.passed,
  `${enclosureRollback.passedGuards + clearanceRollback.passedGuards}/${EXPECTED.operatedCellCount} reverse-order rollback guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r08a-empty-eight-platform-03-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R08A_EMPTY_EIGHT_PLATFORM_03_POST_RELEASE_ACCEPTED'
    : 'FAIL_R08A_EMPTY_EIGHT_PLATFORM_03_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    executionBindingSha256: ledger.executionBindingSha256,
  },
  bindings: {
    ledger: { ...ledgerBinding, status: ledger.status },
    manifest: { ...manifestBinding, manifestIdentity: manifest.manifestIdentity },
    sourceCompleteSave: {
      root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      intake: sourceIntakeBinding,
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
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
  geometry: {
    chamber: classManifest(chamber),
    floor: classManifest(floor),
    ceiling: classManifest(ceiling),
    clearInterior: classManifest(clearInterior),
    completeBarrier: classManifest(completeBarrier),
    retainedBarrier: classManifest(retainedBarrier),
    staticGateCaps: classManifest(gateBays),
    preservedCarrierBands: classManifest(carriers),
    lightingFixtures: classManifest(fixtures),
    operatedTargets: classManifest(operatedCells),
  },
  postState: {
    operatedTargets: {
      matchingCellCount: operatedPostRecords.length - operatedMismatches.length,
      mismatchCellCount: operatedMismatches.length,
      stateCensus: stateCensus(operatedPostRecords),
      listedMismatches: operatedMismatches.slice(0, 100),
    },
    floor: {
      stateCensus: stateCensus(floorRecords),
      mismatchCellCount: mismatchCount(floorRecords),
    },
    ceiling: {
      stateCensus: stateCensus(ceilingRecords),
      mismatchCellCount: mismatchCount(ceilingRecords),
    },
    clearInterior: {
      expectedState: MATERIALS.clear,
      stateCensus: stateCensus(clearRecords),
      matchingCellCount: clearRecords.length - mismatchCount(clearRecords),
      mismatchCellCount: mismatchCount(clearRecords),
      connectivity: clearConnectivity,
    },
    preservedCarriers: {
      expectedState: MATERIALS.carrier,
      stateCensus: stateCensus(carrierRecords),
      matchingCellCount: carrierRecords.length - mismatchCount(carrierRecords),
      mismatchCellCount: mismatchCount(carrierRecords),
    },
    lightingFixtures: {
      expectedState: MATERIALS.light,
      stateCensus: stateCensus(fixtureRecords),
      matchingCellCount: fixtureRecords.length - mismatchCount(fixtureRecords),
      mismatchCellCount: mismatchCount(fixtureRecords),
    },
    failClosedBarrier: {
      retainedState: MATERIALS.retainedBarrier,
      staticGateCapState: MATERIALS.staticGateCap,
      retainedStateCensus: stateCensus(retainedBarrierRecords),
      gateCapStateCensus: stateCensus(gateCapRecords),
      matchingCellCount:
        retainedBarrierRecords.length + gateCapRecords.length
        - mismatchCount(retainedBarrierRecords) - mismatchCount(gateCapRecords),
      mismatchCellCount:
        mismatchCount(retainedBarrierRecords) + mismatchCount(gateCapRecords),
    },
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    operatedTargetMatchCount: operatedPostRecords.length - operatedMismatches.length,
    clearInteriorAirCellCount: clearRecords.filter(({ state }) => state === MATERIALS.clear).length,
    clearInteriorComponentCount: clearConnectivity.componentCount,
    preservedCarrierMatchCount: carrierRecords.length - mismatchCount(carrierRecords),
    lightingFixtureMatchCount: fixtureRecords.length - mismatchCount(fixtureRecords),
    completeBarrierMatchCount:
      retainedBarrierRecords.length + gateCapRecords.length
      - mismatchCount(retainedBarrierRecords) - mismatchCount(gateCapRecords),
    rollbackGuardPassCount: enclosureRollback.passedGuards + clearanceRollback.passedGuards,
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

const markdown = `# CZ-R08A Empty Eight EE-PF-03 post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact operated states | ${report.summary.operatedTargetMatchCount.toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} |
| Clear interior | ${report.summary.clearInteriorAirCellCount.toLocaleString()} / ${EXPECTED.clearInteriorCellCount.toLocaleString()} exact air |
| Clear-space connectivity | ${report.summary.clearInteriorComponentCount} face-connected component |
| Preserved carriers | ${report.summary.preservedCarrierMatchCount} / ${EXPECTED.carrierCellCount} exact polished blackstone |
| Preserved lights | ${report.summary.lightingFixtureMatchCount} / ${EXPECTED.fixtureCellCount} exact sea lanterns |
| Complete barrier | ${report.summary.completeBarrierMatchCount} / ${EXPECTED.completeBarrierCellCount} exact retained barrier and static caps |
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
  preservedCarriers: `${report.summary.preservedCarrierMatchCount}/${EXPECTED.carrierCellCount}`,
  lightingFixtures: `${report.summary.lightingFixtureMatchCount}/${EXPECTED.fixtureCellCount}`,
  completeBarrier: `${report.summary.completeBarrierMatchCount}/${EXPECTED.completeBarrierCellCount}`,
  rollbackGuards: `${report.summary.rollbackGuardPassCount}/${EXPECTED.operatedCellCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
