#!/usr/bin/env node
/**
 * Read-only post-release QA/seal for CZ-R11A C1 east highway pilot.
 * No live call, RCON command, service mutation, or world edit is performed.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  sha256,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T17:12:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11a-live-20260821T170600Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r11a-post-20260821T170600Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r11a-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r11a-post-release-qa.md'));

const BASENAME = 'combined-zones-r11a-c1-east-highway-pilot';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const PACKAGE_KEY = 'c1-east-highway-pavement-pilot';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const EXPECTED = Object.freeze({
  manifestIdentity: '24489cfadb8eaedc4fc1e3d0b2b8f20656dc03b7e6d8755a6e55c74ab6c3d057',
  surfaceCount: 109,
  surfaceHash: '67c334af780bdaf20db92267c5697cd601dcf85d05b31d7bad1d589b46661f16',
  foundationCount: 16,
  foundationHash: '234aafe7012f374ad7584efde23a50dbb415acda23cb538854ba8cbe2ff87809',
  operatedCount: 313,
  operatedHash: 'db6564894b86f2c0a3c5a2889bd9ad9f75505d63cf78da3b738f367337bd1c1f',
  sourceSave: 'ce761bacacc7848c4c057df3eee84a9e55ef89475b59440275ca8033c61e71f8',
  postSave: 'a52884ed9ea7c760a9d357e5c14571a3a980ed5ff68a905cafabf79fab56243e',
  postRegion: '26215fc70ce8891bfb1ba6008f6e9a02281557c6c2c02dd498af48e22897f08e',
  completedRelease: '683bfb67927f9f71a03011e2d2e915a7169f8e947d5a6afef5a7ab101aa39b8f',
});
const PAVEMENT_STATES = new Set([
  'minecraft:gray_concrete',
  'minecraft:smooth_stone',
  'minecraft:yellow_concrete',
]);
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error('R11A post-release QA rejected: ' + message);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava'].includes(blockName(state))
  || state.includes('waterlogged=true');
const isStable = (state) => !isAir(state) && !isFluid(state)
  && !GRAVITY.has(blockName(state));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

function operationBody(filename) {
  return fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n') + '\n';
}

function parsePointOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      filename + ' contains a malformed operation');
    const values = fields.slice(1, 7).map(Number);
    invariant(values.every(Number.isSafeInteger)
      && values[0] === values[3] && values[1] === values[4] && values[2] === values[5],
    filename + ' contains a non-point operation');
    operations.push({
      cell: { x: values[0], y: values[1], z: values[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function tangentAt(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  return { x: dx / length, z: dz / length };
}

function deriveSurface(c1) {
  const stations = c1.horizontalAlignment.stations;
  const columns = new Map();
  for (let station = 489; station <= 493; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = -14; offset <= 14; offset += 1) {
      const x = reference.x + Math.round(offset * -tangent.z);
      const z = reference.z + Math.round(offset * tangent.x);
      const key = x + ',' + z;
      if (!columns.has(key)) columns.set(key, {
        x,
        y: reference.highwayReferenceY + (offset <= -5 ? 1 : offset <= 5 ? 0 : -1),
        z,
        station,
        offset,
      });
    }
  }
  return [...columns.values()];
}

function connectivity(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const remaining = new Set(byKey.keys());
  let componentCount = 0;
  let largestComponentCellCount = 0;
  let maximumAdjacentStep = 0;
  while (remaining.size) {
    componentCount += 1;
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const current = byKey.get(stack.pop());
      size += 1;
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            if ((!dx && !dy && !dz) || (!dx && !dz)) continue;
            const neighbour = cellKey({
              x: current.x + dx,
              y: current.y + dy,
              z: current.z + dz,
            });
            if (byKey.has(neighbour)) maximumAdjacentStep = Math.max(maximumAdjacentStep, Math.abs(dy));
            if (remaining.delete(neighbour)) stack.push(neighbour);
          }
        }
      }
    }
    largestComponentCellCount = Math.max(largestComponentCellCount, size);
  }
  return { componentCount, largestComponentCellCount, maximumAdjacentStep };
}

function stateCensus(records) {
  const result = new Map();
  for (const record of records) result.set(record.state, (result.get(record.state) || 0) + 1);
  return Object.fromEntries([...result.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

async function readRecords(reader, cells, expectedFor) {
  const output = [];
  for (const cell of cells) output.push({
    cell,
    expectedState: expectedFor(cell),
    state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
  });
  return output;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const c1 = readJson(C1_DESIGN);
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
'ledger scope does not match R11A');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'release manifest identity drifted');
invariant(ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'completed release identity drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && ledger.sourceSnapshot.completeSaveSha256 !== ledger.postSnapshot.completeSaveSha256,
'source/post complete-save identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256,
'ledger post snapshot binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary.passed === true
  && samePath(postIntake.input.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postSave,
'post intake is not the ledger-bound complete save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region'))
  && postIdentity.sha256 === EXPECTED.postRegion,
'post region identity drifted');
const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceSave,
'source complete-save intake binding drifted');
const allStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');

const surface = deriveSurface(c1);
invariant(surface.length === EXPECTED.surfaceCount && hashCells(surface) === EXPECTED.surfaceHash,
'independently derived pavement surface drifted');
const surfaceConnectivity = connectivity(surface);
const pkg = manifest.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(pkg, 'R11A package is missing');
const operationRecord = manifest.operations[PACKAGE_KEY];
invariant(sha256(operationBody(pkg.forward)) === operationRecord.forwardSha256
  && sha256(operationBody(pkg.rollback)) === operationRecord.rollbackSha256,
'operation body identity drifted');
const forward = parsePointOperations(pkg.forward);
const rollback = parsePointOperations(pkg.rollback);
invariant(forward.length === EXPECTED.operatedCount
  && new Set(forward.map(({ cell }) => cellKey(cell))).size === EXPECTED.operatedCount
  && hashCells(forward.map(({ cell }) => cell)) === EXPECTED.operatedHash,
'forward operation identity drifted');
invariant(rollback.length === forward.length
  && rollback.every((operation, index) => {
    const inverse = forward[forward.length - 1 - index];
    return cellKey(operation.cell) === cellKey(inverse.cell)
      && operation.fromState === inverse.toState
      && operation.toState === inverse.fromState;
  }),
'rollback is not the reverse exact inverse');

const pavementOps = forward.filter(({ toState }) => PAVEMENT_STATES.has(toState));
const foundationOps = forward.filter(({ toState }) => toState === 'minecraft:stone_bricks');
const headroomOps = forward.filter(({ toState }) => toState === 'minecraft:air');
invariant(pavementOps.length === EXPECTED.surfaceCount
  && hashCells(pavementOps.map(({ cell }) => cell)) === EXPECTED.surfaceHash,
'pavement operation partition drifted');
invariant(foundationOps.length === EXPECTED.foundationCount
  && hashCells(foundationOps.map(({ cell }) => cell)) === EXPECTED.foundationHash,
'foundation operation partition drifted');
invariant(headroomOps.length === 188, 'headroom operation partition drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const operationByKey = new Map(forward.map((operation) => [cellKey(operation.cell), operation]));
const operatedCells = forward.map(({ cell }) => cell);
const sourceRecords = await readRecords(
  sourceReader,
  operatedCells,
  (cell) => operationByKey.get(cellKey(cell)).fromState,
);
const postRecords = await readRecords(
  postReader,
  operatedCells,
  (cell) => operationByKey.get(cellKey(cell)).toState,
);
const mismatchCount = (records) => records
  .filter(({ state, expectedState }) => state !== expectedState).length;
const sourceMismatches = mismatchCount(sourceRecords);
const targetMismatches = mismatchCount(postRecords);
const pavementKeys = new Set(surface.map(cellKey));
const pavementRecords = postRecords.filter(({ cell }) => pavementKeys.has(cellKey(cell)));
const foundationKeys = new Set(foundationOps.map(({ cell }) => cellKey(cell)));
const foundationRecords = postRecords.filter(({ cell }) => foundationKeys.has(cellKey(cell)));

const headroom = uniqueCells(surface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z },
  { x, y: y + 2, z },
]));
const headroomRecords = await readRecords(postReader, headroom, () => 'minecraft:air');
const headroomMismatches = mismatchCount(headroomRecords);
const support = surface.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const supportRecords = await readRecords(postReader, support, () => null);
const unstableSupports = supportRecords.filter(({ state }) => !isStable(state));

const operatedKeys = new Set(operatedCells.map(cellKey));
const halo = uniqueCells(operatedCells.flatMap((cell) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return result;
}));
const preservedHalo = halo.filter((cell) => !operatedKeys.has(cellKey(cell)));
const undeclaredDrift = [];
for (const cell of preservedHalo) {
  const before = stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
  const after = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
  if (before !== after) undeclaredDrift.push({ cell, before, after });
}

const executionPath = path.join(EVIDENCE_DIR, PACKAGE_KEY + '.forward-execution.json');
const execution = readJson(executionPath);
const executionBinding = fileBinding(executionPath);
const strictExecutionPass = execution.schemaVersion === 3
  && execution.status === 'complete'
  && execution.dryRun === false
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.sourceOperationCount === EXPECTED.operatedCount
  && execution.sourceGroupCount === EXPECTED.operatedCount
  && execution.successfulGroups === EXPECTED.operatedCount
  && execution.failedGroups === 0
  && execution.successfulCommands === EXPECTED.operatedCount
  && execution.failedCommands === 0
  && execution.noopCommands === 0
  && execution.unexpectedNoopCommands === 0
  && execution.worldEditLeftoverCount === 0;
const rollbackPath = path.join(EVIDENCE_DIR, PACKAGE_KEY + '.rollback-poststate-preflight.json');
const rollbackReport = readJson(rollbackPath);
const rollbackBinding = fileBinding(rollbackPath);
const rollbackPass = rollbackReport.status === 'PASS'
  && rollbackReport.passed === EXPECTED.operatedCount
  && rollbackReport.failed === 0
  && rollbackReport.regionsSnapshot.sha256 === EXPECTED.postRegion
  && rollbackReport.sourceOverlays === null;

const checks = [];
const check = (id, passed, detail) => checks.push({
  id,
  status: passed ? 'PASS' : 'FAIL',
  detail,
});
check('R11A-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allStagesPass,
  ledger.stages.filter(({ status }) => status === 'PASS').length + '/' + ledger.stages.length
    + ' ledger stages PASS.');
check('R11A-QA-02-COMPLETED-IDENTITY-BOUND',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
  'Manifest and completed release identities are exact.');
check('R11A-QA-03-POST-COMPLETE-SAVE-BOUND',
  postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postSave
    && postIdentity.sha256 === EXPECTED.postRegion,
  'Post complete-save and region identities are exact.');
check('R11A-QA-04-EXACT-SOURCE-GUARDS',
  sourceRecords.length === EXPECTED.operatedCount && sourceMismatches === 0,
  (sourceRecords.length - sourceMismatches) + '/' + sourceRecords.length
    + ' source states match.');
check('R11A-QA-05-EXACT-POST-TARGETS',
  postRecords.length === EXPECTED.operatedCount && targetMismatches === 0,
  (postRecords.length - targetMismatches) + '/' + postRecords.length
    + ' exact target states.');
check('R11A-QA-06-PAVEMENT-MATERIALS',
  pavementRecords.length === EXPECTED.surfaceCount
    && pavementRecords.every(({ state }) => PAVEMENT_STATES.has(state)),
  JSON.stringify(stateCensus(pavementRecords)));
check('R11A-QA-07-SURFACE-CONNECTED-STEP-SAFE',
  surfaceConnectivity.componentCount === 1
    && surfaceConnectivity.largestComponentCellCount === EXPECTED.surfaceCount
    && surfaceConnectivity.maximumAdjacentStep <= 1,
  surfaceConnectivity.componentCount + ' component; max step '
    + surfaceConnectivity.maximumAdjacentStep + '.');
check('R11A-QA-08-STABLE-FOUNDATION',
  foundationRecords.length === EXPECTED.foundationCount
    && foundationRecords.every(({ state }) => state === 'minecraft:stone_bricks')
    && unstableSupports.length === 0,
  foundationRecords.length + '/' + EXPECTED.foundationCount + ' fills; '
    + (support.length - unstableSupports.length) + '/' + support.length + ' stable contacts.');
check('R11A-QA-09-TWO-BLOCK-HEADROOM',
  headroomRecords.length === EXPECTED.surfaceCount * 2 && headroomMismatches === 0,
  (headroomRecords.length - headroomMismatches) + '/' + headroomRecords.length + ' air.');
check('R11A-QA-10-ZERO-UNDECLARED-HALO-DRIFT',
  undeclaredDrift.length === 0,
  (preservedHalo.length - undeclaredDrift.length) + '/' + preservedHalo.length
    + ' preserved halo cells unchanged.');
check('R11A-QA-11-STRICT-EXECUTION', strictExecutionPass,
  execution.successfulGroups + '/' + EXPECTED.operatedCount + ' strict groups.');
check('R11A-QA-12-ROLLBACK-POSTSTATE', rollbackPass,
  rollbackReport.passed + '/' + EXPECTED.operatedCount + ' rollback guards.');

const failed = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r11a-c1-east-highway-pilot-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failed.length === 0
    ? 'PASS_R11A_C1_EAST_HIGHWAY_PILOT_POST_RELEASE_ACCEPTED'
    : 'FAIL_R11A_C1_EAST_HIGHWAY_PILOT_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
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
  geometry: {
    pavementSurface: exactSet(surface),
    foundationFill: exactSet(foundationOps.map(({ cell }) => cell)),
    headroom: exactSet(headroom),
    operatedUnion: exactSet(operatedCells),
    preservedHalo: exactSet(preservedHalo),
    surfaceConnectivity,
  },
  postState: {
    operatedTargets: {
      matchingCellCount: postRecords.length - targetMismatches,
      mismatchCellCount: targetMismatches,
      stateCensus: stateCensus(postRecords),
      listedMismatches: postRecords
        .filter(({ state, expectedState }) => state !== expectedState).slice(0, 100),
    },
    pavement: {
      matchingCellCount: pavementRecords.length,
      stateCensus: stateCensus(pavementRecords),
      connectivity: surfaceConnectivity,
    },
    foundation: {
      exactFillCount: foundationRecords.length,
      stableSupportCount: support.length - unstableSupports.length,
      unstableSupportCount: unstableSupports.length,
      supportStateCensus: stateCensus(supportRecords),
    },
    headroom: {
      airCellCount: headroomRecords.length - headroomMismatches,
      mismatchCellCount: headroomMismatches,
      expectedCellCount: headroomRecords.length,
    },
    preservedHalo: {
      unchangedCellCount: preservedHalo.length - undeclaredDrift.length,
      driftCellCount: undeclaredDrift.length,
      listedDrift: undeclaredDrift.slice(0, 100),
    },
  },
  executionEvidence: {
    strictForwardExecution: {
      ...executionBinding,
      status: execution.status,
      successfulGroups: execution.successfulGroups,
      failedGroups: execution.failedGroups,
      noopCommands: execution.noopCommands,
      passed: strictExecutionPass,
    },
    rollbackPoststatePreflight: {
      ...rollbackBinding,
      status: rollbackReport.status,
      passedGuards: rollbackReport.passed,
      failedGuards: rollbackReport.failed,
      regionSnapshotSha256: rollbackReport.regionsSnapshot.sha256,
      passed: rollbackPass,
    },
  },
  checks,
  summary: {
    passed: failed.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failed.length,
    failCount: failed.length,
    exactTargetMatchCount: postRecords.length - targetMismatches,
    pavementMatchCount: pavementRecords.length,
    foundationFillMatchCount: foundationRecords.length,
    stableSupportCount: support.length - unstableSupports.length,
    headroomAirCount: headroomRecords.length - headroomMismatches,
    preservedHaloUnchangedCount: preservedHalo.length - undeclaredDrift.length,
    preservedHaloCellCount: preservedHalo.length,
    strictExecutionPassCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackReport.passed,
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
fs.writeFileSync(absolute(OUT_PATH), JSON.stringify(report, null, 2) + '\n');

const markdown = [
  '# CZ-R11A C1 east-highway post-release QA',
  '',
  '**Status:** ' + report.status,
  '**QA payload identity:** ' + qaPayloadSha256,
  '**Completed release identity:** ' + ledger.completedReleaseIdentitySha256,
  '**Post complete save:** ' + ledger.postSnapshot.completeSaveSha256,
  '',
  '## Result',
  '',
  '| Test | Result |',
  '|---|---:|',
  '| Exact operated targets | ' + qaPayload.summary.exactTargetMatchCount + ' / 313 |',
  '| Pavement materials | ' + qaPayload.summary.pavementMatchCount + ' / 109 |',
  '| Surface connectivity | ' + surfaceConnectivity.componentCount
    + ' component, max step ' + surfaceConnectivity.maximumAdjacentStep + ' |',
  '| Foundation fills | ' + qaPayload.summary.foundationFillMatchCount + ' / 16 |',
  '| Stable pavement contacts | ' + qaPayload.summary.stableSupportCount + ' / 109 |',
  '| Two-block headroom | ' + qaPayload.summary.headroomAirCount + ' / 218 |',
  '| Preserved halo unchanged | ' + qaPayload.summary.preservedHaloUnchangedCount
    + ' / ' + preservedHalo.length + ' |',
  '| Strict execution | ' + qaPayload.summary.strictExecutionPassCount + ' / 313 |',
  '| Rollback post-state | ' + qaPayload.summary.rollbackGuardPassCount + ' / 313 |',
  '',
  '## Checks',
  '',
  '| Check | Status | Detail |',
  '|---|---|---|',
  ...checks.map(({ id, status, detail }) => '| ' + id + ' | **' + status + '** | ' + detail + ' |'),
  '',
  'This verifier read only immutable source/post Anvil saves and hash-bound',
  'evidence. It made no live call and performed no world edit.',
  '',
].join('\n');
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  exactTargets: qaPayload.summary.exactTargetMatchCount + '/313',
  pavementMaterials: qaPayload.summary.pavementMatchCount + '/109',
  surfaceComponents: surfaceConnectivity.componentCount,
  maximumAdjacentStep: surfaceConnectivity.maximumAdjacentStep,
  foundationFills: qaPayload.summary.foundationFillMatchCount + '/16',
  stableSupports: qaPayload.summary.stableSupportCount + '/109',
  headroomAir: qaPayload.summary.headroomAirCount + '/218',
  preservedHalo: qaPayload.summary.preservedHaloUnchangedCount + '/' + preservedHalo.length,
  strictExecution: qaPayload.summary.strictExecutionPassCount + '/313',
  rollbackGuards: qaPayload.summary.rollbackGuardPassCount + '/313',
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failed.length) process.exitCode = 1;
