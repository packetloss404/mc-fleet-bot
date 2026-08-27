#!/usr/bin/env node
/**
 * Read-only post-release QA and seal for CZ-R10A Cheyenne secure gallery.
 *
 * Reproduces the exact frozen B03 terminal geometry, reads operated and
 * preserved cells from the immutable post save, and binds the terminal
 * ledger, manifest, strict execution, and rollback evidence. No live call or
 * world mutation is performed.
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
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-21T16:42:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r10a-live-20260821T163935Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r10a-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r10a-post-release-qa.md'),
);

const INPUTS = Object.freeze({
  b03Geometry: 'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json',
});
const BASENAME = 'combined-zones-r10-cheyenne-secure-gallery';
const RELEASE_NODE_ID = 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT';
const PACKAGE_KEY = 'cheyenne-secure-gallery-liner';
const EXPECTED = Object.freeze({
  manifestIdentity: '3f17222f3ee456833429babf50811e604bea50b3f99ab39293b8ba23ffd0fd8c',
  linerCellCount: 594,
  linerCoordinateSetSha256: 'ff2aa8d4b508943a2f65c86559dbb800bf5758835f455a62cf764f2ca67519e8',
  routeCellCount: 660,
  routeCoordinateSetSha256: 'eaeb38e78705d7ef7643fa24bb73ad4fa8cf6db2cbf17aaf39db4707e1656e67',
  capCellCount: 20,
  capCoordinateSetSha256: 'd769b5ca3cea821d9a9d5ea12270cf0946e179ba05d65b3bd312ed41e083db4b',
  sourceCompleteSaveSha256: '7d0ee0324d533bfd52fd158f7942c23311627efccd1f616083a4699ad2133c26',
  postCompleteSaveSha256: 'bb667794a20a2a580ba322eef19e60ac50bf51ff81ba5537702b26036c829486',
  postRegionSha256: 'bd4c325d66ff83ada72273c98fc7b881d9c861736df2f1a92c1aa8bd7ddb004c',
  executionBindingSha256: 'fffe0dd8d1a7cd15250976af47559752ecf00571392d3dfc18343bd499efb002',
});
const MATERIALS = Object.freeze({
  wallAndCeiling: 'minecraft:polished_granite',
  floor: 'minecraft:smooth_stone',
  securityFrame: 'minecraft:polished_blackstone_bricks',
  light: 'minecraft:sea_lantern',
  route: 'minecraft:air',
  cap: 'minecraft:stone',
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
  if (!condition) throw new Error(`R10A post-release QA rejected: ${message}`);
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
      .map((component) => `${component.length}:${hashCells(component)}`)
      .sort()
      .join('\n')),
  };
}

function stateCensus(records) {
  const census = new Map();
  for (const record of records) census.set(record.state, (census.get(record.state) ?? 0) + 1);
  return Object.fromEntries([...census.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const b03 = readJson(INPUTS.b03Geometry);
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
'ledger scope does not match R10A');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'release manifest identity drifted');
invariant(ledger.executionBindingSha256 === EXPECTED.executionBindingSha256,
'execution binding identity drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && ledger.sourceSnapshot.completeSaveSha256 !== ledger.postSnapshot.completeSaveSha256,
'source/post complete-save identity is not the completed R10A pair');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post snapshot/intake binding drifted');
invariant(postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.summary?.passed === true
  && samePath(postIntake.input?.suppliedWorldRoot, POST_ROOT)
  && postIntake.packageIdentity?.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'post complete-save intake is not the ledger-bound PASS save');

const postIdentityPath = ledger.postSnapshot.identity.path;
const postIdentityBinding = fileBinding(postIdentityPath);
const postIdentity = readJson(postIdentityPath);
invariant(ledger.postSnapshot.identity.sha256 === postIdentityBinding.sha256
  && ledger.postSnapshot.identity.bytes === postIdentityBinding.bytes
  && samePath(postIdentity.directory, path.join(POST_ROOT, 'region'))
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'post region identity binding drifted');
const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256,
'source complete-save intake binding drifted');
const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');

// Independently reproduce the exact B03 terminal gallery rather than trusting
// the manifest summaries.
const centers = b03.design.centerline.points.filter(({ index }) => index >= 768 && index <= 800);
invariant(centers.length === 33 && centers.every((point, offset) => (
  point.index === 768 + offset
  && point.x === 2080 - offset
  && point.y === 166
  && point.z === -868
  && point.phase === 'LEG-3-INSTITUTIONAL'
  && point.tangent === 'WEST'
)), 'accepted LEG-3 terminal centerline drifted');
const route = [];
const liner = [];
for (const point of centers) {
  for (let z = point.z - 2; z <= point.z + 2; z += 1) {
    for (let y = point.y; y <= point.y + 3; y += 1) route.push({ x: point.x, y, z });
    liner.push({ x: point.x, y: point.y - 1, z });
    liner.push({ x: point.x, y: point.y + 4, z });
  }
  for (let y = point.y; y <= point.y + 3; y += 1) {
    liner.push({ x: point.x, y, z: point.z - 3 });
    liner.push({ x: point.x, y, z: point.z + 3 });
  }
}
const exactRoute = uniqueCells(route);
const exactLiner = uniqueCells(liner);
const terminusCap = [];
for (let y = 166; y <= 169; y += 1) {
  for (let z = -870; z <= -866; z += 1) terminusCap.push({ x: 2047, y, z });
}
invariant(exactRoute.length === EXPECTED.routeCellCount
  && hashCells(exactRoute) === EXPECTED.routeCoordinateSetSha256,
'preserved route identity drifted');
invariant(exactLiner.length === EXPECTED.linerCellCount
  && hashCells(exactLiner) === EXPECTED.linerCoordinateSetSha256,
'liner identity drifted');
invariant(terminusCap.length === EXPECTED.capCellCount
  && hashCells(terminusCap) === EXPECTED.capCoordinateSetSha256,
'terminus-cap identity drifted');
const routeConnectivity = connectedComponentManifest(exactRoute);

const pkg = manifest.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(pkg, 'R10A package is missing from manifest');
const operationRecord = manifest.operations[PACKAGE_KEY];
invariant(sha256(operationBody(pkg.forward)) === operationRecord.forwardSha256
  && sha256(operationBody(pkg.rollback)) === operationRecord.rollbackSha256,
'operation body drifted from manifest');
const forwardOperations = parsePointOperations(pkg.forward);
const operationByPoint = new Map(forwardOperations.map((operation) => [cellKey(operation.cell), operation]));
invariant(forwardOperations.length === EXPECTED.linerCellCount
  && operationByPoint.size === EXPECTED.linerCellCount
  && hashCells(forwardOperations.map(({ cell }) => cell)) === EXPECTED.linerCoordinateSetSha256,
'forward operations do not reproduce the exact liner');

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
const linerRecords = await postRecords(
  exactLiner,
  (cell) => operationByPoint.get(cellKey(cell)).toState,
);
const routeRecords = await postRecords(exactRoute, () => MATERIALS.route);
const capRecords = await postRecords(terminusCap, () => MATERIALS.cap);
const mismatchCount = (records) => records
  .filter(({ state, expectedState }) => state !== expectedState).length;
const linerMismatchCount = mismatchCount(linerRecords);
const routeMismatchCount = mismatchCount(routeRecords);
const capMismatchCount = mismatchCount(capRecords);

const executionPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.forward-execution.json`);
const executionReport = readJson(executionPath);
const executionBinding = fileBinding(executionPath);
const strictExecutionPass = executionReport.schemaVersion === 3
  && executionReport.status === 'complete'
  && executionReport.dryRun === false
  && executionReport.strictNoop === true
  && executionReport.operationRole === 'forward'
  && executionReport.sourceOperationCount === EXPECTED.linerCellCount
  && executionReport.sourceGroupCount === EXPECTED.linerCellCount
  && executionReport.successfulGroups === EXPECTED.linerCellCount
  && executionReport.failedGroups === 0
  && executionReport.successfulCommands === EXPECTED.linerCellCount
  && executionReport.failedCommands === 0
  && executionReport.noopCommands === 0
  && executionReport.unexpectedNoopCommands === 0
  && executionReport.unknownReplyCommands === 0
  && executionReport.worldEditLeftoverCount === 0;

const rollbackPath = path.join(EVIDENCE_DIR, `${PACKAGE_KEY}.rollback-poststate-preflight.json`);
const rollbackReport = readJson(rollbackPath);
const rollbackBinding = fileBinding(rollbackPath);
const rollbackPass = rollbackReport.status === 'PASS'
  && rollbackReport.passed === EXPECTED.linerCellCount
  && rollbackReport.failed === 0
  && rollbackReport.regionsSnapshot?.sha256 === EXPECTED.postRegionSha256
  && rollbackReport.sourceOverlays === null;

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R10A-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} ledger stages PASS.`);
check('R10A-QA-02-COMPLETED-IDENTITY-BOUND',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && ledger.executionBindingSha256 === EXPECTED.executionBindingSha256,
  `Manifest ${manifest.manifestIdentity}; execution ${ledger.executionBindingSha256}.`);
check('R10A-QA-03-POST-COMPLETE-SAVE-BOUND',
  postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
    && postIdentity.sha256 === EXPECTED.postRegionSha256,
  `Post complete save ${EXPECTED.postCompleteSaveSha256}; region ${EXPECTED.postRegionSha256}.`);
check('R10A-QA-04-EXACT-LINER-STATES',
  linerRecords.length === EXPECTED.linerCellCount && linerMismatchCount === 0,
  `${linerRecords.length - linerMismatchCount}/${linerRecords.length} exact liner states.`);
check('R10A-QA-05-PRESERVED-AIR-ROUTE',
  routeRecords.length === EXPECTED.routeCellCount && routeMismatchCount === 0,
  `${routeRecords.length - routeMismatchCount}/${routeRecords.length} route cells remain air.`);
check('R10A-QA-06-ROUTE-CONNECTIVITY',
  routeConnectivity.componentCount === 1
    && routeConnectivity.largestComponentCellCount === EXPECTED.routeCellCount,
  `${routeConnectivity.componentCount} component; ${routeConnectivity.largestComponentCellCount} cells.`);
check('R10A-QA-07-FAIL-CLOSED-TERMINUS',
  capRecords.length === EXPECTED.capCellCount && capMismatchCount === 0,
  `${capRecords.length - capMismatchCount}/${capRecords.length} terminus cells remain stone.`);
check('R10A-QA-08-STRICT-EXECUTION', strictExecutionPass,
  `${executionReport.successfulGroups}/${EXPECTED.linerCellCount} strict groups; ${executionReport.failedGroups} failed; ${executionReport.noopCommands} no-op.`);
check('R10A-QA-09-ROLLBACK-POSTSTATE', rollbackPass,
  `${rollbackReport.passed}/${EXPECTED.linerCellCount} rollback guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r10a-cheyenne-secure-gallery-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE_ACCEPTED'
    : 'FAIL_R10A_CHEYENNE_SECURE_GALLERY_POST_RELEASE',
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
  geometry: {
    exteriorLiner: classManifest(exactLiner),
    preservedRoute: classManifest(exactRoute),
    preservedTerminusCap: classManifest(terminusCap),
    routeConnectivity,
  },
  postState: {
    exteriorLiner: {
      matchingCellCount: linerRecords.length - linerMismatchCount,
      mismatchCellCount: linerMismatchCount,
      stateCensus: stateCensus(linerRecords),
      listedMismatches: linerRecords
        .filter(({ state, expectedState }) => state !== expectedState).slice(0, 100),
    },
    preservedRoute: {
      expectedState: MATERIALS.route,
      matchingCellCount: routeRecords.length - routeMismatchCount,
      mismatchCellCount: routeMismatchCount,
      stateCensus: stateCensus(routeRecords),
      connectivity: routeConnectivity,
    },
    preservedTerminusCap: {
      expectedState: MATERIALS.cap,
      matchingCellCount: capRecords.length - capMismatchCount,
      mismatchCellCount: capMismatchCount,
      stateCensus: stateCensus(capRecords),
    },
  },
  executionEvidence: {
    strictForwardExecution: {
      ...executionBinding,
      status: executionReport.status,
      strictNoop: executionReport.strictNoop,
      successfulGroups: executionReport.successfulGroups,
      failedGroups: executionReport.failedGroups,
      noopCommands: executionReport.noopCommands,
      passed: strictExecutionPass,
    },
    rollbackPoststatePreflight: {
      ...rollbackBinding,
      status: rollbackReport.status,
      passedGuards: rollbackReport.passed,
      failedGuards: rollbackReport.failed,
      regionSnapshotSha256: rollbackReport.regionsSnapshot?.sha256 ?? null,
      passed: rollbackPass,
    },
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    linerMatchCount: linerRecords.length - linerMismatchCount,
    routeAirMatchCount: routeRecords.length - routeMismatchCount,
    routeComponentCount: routeConnectivity.componentCount,
    terminusStoneMatchCount: capRecords.length - capMismatchCount,
    strictExecutionPassCount: executionReport.successfulGroups,
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
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# CZ-R10A Cheyenne secure-gallery post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Execution ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Exact liner states | ${report.summary.linerMatchCount} / ${EXPECTED.linerCellCount} |
| Preserved air route | ${report.summary.routeAirMatchCount} / ${EXPECTED.routeCellCount} |
| Route connectivity | ${report.summary.routeComponentCount} face-connected component |
| Fail-closed stone terminus | ${report.summary.terminusStoneMatchCount} / ${EXPECTED.capCellCount} |
| Strict execution | ${report.summary.strictExecutionPassCount} / ${EXPECTED.linerCellCount} |
| Rollback post-state | ${report.summary.rollbackGuardPassCount} / ${EXPECTED.linerCellCount} |

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
  exactLinerStates: `${report.summary.linerMatchCount}/${EXPECTED.linerCellCount}`,
  preservedAirRoute: `${report.summary.routeAirMatchCount}/${EXPECTED.routeCellCount}`,
  routeComponents: report.summary.routeComponentCount,
  preservedStoneTerminus: `${report.summary.terminusStoneMatchCount}/${EXPECTED.capCellCount}`,
  strictExecution: `${report.summary.strictExecutionPassCount}/${EXPECTED.linerCellCount}`,
  rollbackGuards: `${report.summary.rollbackGuardPassCount}/${EXPECTED.linerCellCount}`,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
