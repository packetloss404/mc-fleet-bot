#!/usr/bin/env node
/**
 * Read-only post-release QA for CZ-R07A P1-B03 portal tube.
 *
 * Re-derives the immutable R03 exposed-route class and its exact B03 face
 * shell, then verifies the committed post save contains one continuous
 * 8,532-cell air route and a complete 7,682-cell enclosure made only of
 * polished diorite plus the exact ten preserved stone tie-in cells.  It also
 * binds the executed ledger, release manifest, source/post complete-save
 * intake reports, execution reports, and rollback post-state preflights.
 *
 * No live service is contacted and no world state is mutated.
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

const GENERATED_AT = value('--generated-at', '2026-08-21T15:48:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r07a-live-20260821T154500Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r07a-post-20260821T154500Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r07a-post-release-qa.json'));
const MARKDOWN_PATH = value(
  '--markdown',
  path.join(EVIDENCE_DIR, 'r07a-post-release-qa.md'),
);
const B03_GEOMETRY_PATH =
  'docs/masterplans/05-combined-zones/phase1-cheyenne-jcurve-geometry.json';
const R03_MANIFEST_PATH =
  'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json';
const TARGET_ROUTE_STATE = 'minecraft:air';
const TARGET_SHELL_STATE = 'minecraft:polished_diorite';
const TIE_IN_STATE = 'minecraft:stone';
const WORLD_MAX_Y = 320;
const EXPECTED = Object.freeze({
  routeCellCount: 8532,
  routeSha256: '16bc4e50ded34ee3947005783707de1801c6147067077ef16f10952b5262da92',
  enclosureCellCount: 7682,
  enclosureSha256: 'eb2c21a45b3299ca8a5afa183d3ec4be834b5629a411c434bc95bae39845a63f',
  stoneTieInCellCount: 10,
  stoneTieInSha256: 'cb39f2cf911c140adee6f99d99ccb91320993e2e84da98c5828db47559bb1613',
  polishedDioriteCellCount: 7672,
  operatedCellCount: 7685,
});
const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const samePath = (left, right) => absolute(left) === absolute(right);
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R07A post-release QA rejected: ${message}`);
};
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const stateCensus = (records) => {
  const counts = new Map();
  for (const { state } of records) counts.set(state, (counts.get(state) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  )));
};

async function deriveSurfaceDeferral(reader, construction) {
  const columns = new Map();
  for (const cell of construction) {
    const key = `${cell.x},${cell.z}`;
    if (!columns.has(key)) columns.set(key, { x: cell.x, z: cell.z, cells: [] });
    columns.get(key).cells.push(cell);
  }
  const exposed = [];
  for (const column of columns.values()) {
    const lowestCellY = Math.min(...column.cells.map(({ y }) => y));
    let highestNonAirY = null;
    for (let y = WORLD_MAX_Y; y > lowestCellY; y -= 1) {
      const state = await reader.blockState(column.x, y, column.z);
      if (!AIR_BLOCKS.has(state.Name)) {
        highestNonAirY = y;
        break;
      }
    }
    for (const cell of column.cells) {
      if (highestNonAirY === null || highestNonAirY <= cell.y) exposed.push(cell);
    }
  }
  return uniqueCells(exposed);
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
  components.sort((left, right) => right.length - left.length
    || cellKey(left[0]).localeCompare(cellKey(right[0])));
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

function rollbackEvidence(filename, expectedCount, postRegionSha256) {
  const report = readJson(filename);
  const passed = report.status === 'PASS'
    && report.passed === expectedCount
    && report.failed === 0
    && report.regionsSnapshot?.sha256 === postRegionSha256;
  return {
    ...fileBinding(filename),
    status: report.status,
    passedGuards: report.passed,
    failedGuards: report.failed,
    regionSnapshotSha256: report.regionsSnapshot?.sha256 ?? null,
    passed,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const postIntake = readJson(POST_INTAKE_PATH);
const b03 = readJson(B03_GEOMETRY_PATH);
const r03 = readJson(R03_MANIFEST_PATH);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
const postIntakeBinding = fileBinding(POST_INTAKE_PATH);

invariant(ledger.schemaVersion === 1
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
'execution ledger is not terminally accepted');
invariant(ledger.transactionId === manifest.transactionId
  && ledger.releaseNodeId === manifest.releaseNodeId,
'execution ledger scope does not match the release manifest');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger release-manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'release-manifest payload identity drifted');
invariant(samePath(ledger.postSnapshot.root, POST_ROOT)
  && samePath(ledger.postSnapshot.completeSaveIntake.path, POST_INTAKE_PATH)
  && ledger.postSnapshot.completeSaveIntake.sha256 === postIntakeBinding.sha256
  && ledger.postSnapshot.completeSaveIntake.bytes === postIntakeBinding.bytes,
'ledger post-snapshot/intake binding drifted');
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
'post snapshot region directory is missing');

const sourceIntakePath = ledger.sourceSnapshot.completeSaveIntake.path;
const sourceIntakeBinding = fileBinding(sourceIntakePath);
const sourceIntake = readJson(sourceIntakePath);
invariant(ledger.sourceSnapshot.completeSaveIntake.sha256 === sourceIntakeBinding.sha256
  && ledger.sourceSnapshot.completeSaveIntake.bytes === sourceIntakeBinding.bytes
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity?.completeSaveSha256
    === ledger.sourceSnapshot.completeSaveSha256,
'ledger source complete-save intake binding drifted');

const allLedgerStagesPass = ledger.stages.length > 0
  && ledger.stages.every(({ status }) => status === 'PASS');
const construction = uniqueCells(b03.design.excavationReservation.cells);
const interaction = uniqueCells(b03.design.oneCellFaceInteractionShell.cells);
const constructionKeys = new Set(construction.map(cellKey));
const r03SourceReader = new AnvilReader(
  absolute(path.join(r03.source.snapshotRoot, 'region')),
);
const routeVoid = await deriveSurfaceDeferral(r03SourceReader, construction);
const routeKeys = new Set(routeVoid.map(cellKey));
const enclosure = uniqueCells(interaction.filter((cell) => (
  FACE_NEIGHBOURS.some(([dx, dy, dz]) => (
    routeKeys.has(`${cell.x + dx},${cell.y + dy},${cell.z + dz}`)
  ))
)));
const routeIdentity = classManifest(routeVoid);
const enclosureIdentity = classManifest(enclosure);

const sourceReader = new AnvilReader(
  absolute(path.join(ledger.sourceSnapshot.root, 'region')),
);
const sourceEnclosureRecords = [];
for (const cell of enclosure) {
  sourceEnclosureRecords.push({
    cell,
    state: stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const stoneTieIns = sourceEnclosureRecords
  .filter(({ state }) => state === TIE_IN_STATE)
  .map(({ cell }) => cell);
const stoneTieInKeys = new Set(stoneTieIns.map(cellKey));
const stoneTieInIdentity = classManifest(stoneTieIns);

const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const routeRecords = [];
for (const cell of routeVoid) {
  routeRecords.push({
    cell,
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const enclosureRecords = [];
for (const cell of enclosure) {
  enclosureRecords.push({
    cell,
    expectedState: stoneTieInKeys.has(cellKey(cell)) ? TIE_IN_STATE : TARGET_SHELL_STATE,
    state: stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)),
  });
}
const routeMismatches = routeRecords.filter(({ state }) => state !== TARGET_ROUTE_STATE);
const enclosureMismatches = enclosureRecords
  .filter(({ state, expectedState }) => state !== expectedState);
const routeConnectivity = connectedComponentManifest(routeVoid);

const shellExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'b03-tube-shell.forward-execution.json'),
  7632,
);
const openingsExecution = executionEvidence(
  path.join(EVIDENCE_DIR, 'b03-portal-openings.forward-execution.json'),
  53,
);
const shellRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'b03-tube-shell.rollback-poststate-preflight.json'),
  7632,
  postIdentity.sha256,
);
const openingsRollback = rollbackEvidence(
  path.join(EVIDENCE_DIR, 'b03-portal-openings.rollback-poststate-preflight.json'),
  53,
  postIdentity.sha256,
);

const checks = [];
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'PASS' : 'FAIL', detail });
check('R07A-QA-01-LEDGER-TERMINAL',
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && allLedgerStagesPass,
  `${ledger.stages.filter(({ status }) => status === 'PASS').length}/${ledger.stages.length} ledger stages PASS.`);
check('R07A-QA-02-MANIFEST-BOUND',
  ledger.manifest.sha256 === manifestBinding.sha256
    && manifest.target?.operatedUnion?.cellCount === EXPECTED.operatedCellCount,
  `Manifest ${manifest.manifestIdentity}; ${manifest.target?.operatedUnion?.cellCount} operated cells.`);
check('R07A-QA-03-POST-COMPLETE-SAVE-BOUND',
  postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
    && postIntake.packageIdentity.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256,
  `Post complete-save ${ledger.postSnapshot.completeSaveSha256}.`);
check('R07A-QA-04-GEOMETRY-REPRODUCED',
  routeIdentity.cellCount === EXPECTED.routeCellCount
    && routeIdentity.coordinateSetSha256 === EXPECTED.routeSha256
    && enclosureIdentity.cellCount === EXPECTED.enclosureCellCount
    && enclosureIdentity.coordinateSetSha256 === EXPECTED.enclosureSha256,
  `${routeIdentity.cellCount} route cells; ${enclosureIdentity.cellCount} enclosure cells.`);
check('R07A-QA-05-EXACT-STONE-TIE-INS',
  stoneTieInIdentity.cellCount === EXPECTED.stoneTieInCellCount
    && stoneTieInIdentity.coordinateSetSha256 === EXPECTED.stoneTieInSha256,
  `${stoneTieInIdentity.cellCount} source-bound stone tie-in cells.`);
check('R07A-QA-06-ROUTE-VOID-AIR',
  routeMismatches.length === 0 && routeRecords.length === EXPECTED.routeCellCount,
  `${routeRecords.length - routeMismatches.length}/${routeRecords.length} exact air cells.`);
check('R07A-QA-07-ENCLOSURE-MATERIALS',
  enclosureMismatches.length === 0
    && enclosureRecords.filter(({ state }) => state === TARGET_SHELL_STATE).length
      === EXPECTED.polishedDioriteCellCount
    && enclosureRecords.filter(({ state }) => state === TIE_IN_STATE).length
      === EXPECTED.stoneTieInCellCount,
  `${enclosureRecords.length - enclosureMismatches.length}/${enclosureRecords.length} exact enclosure states.`);
check('R07A-QA-08-ROUTE-CONTINUITY',
  routeConnectivity.componentCount === 1
    && routeConnectivity.largestComponentCellCount === EXPECTED.routeCellCount,
  `${routeConnectivity.componentCount} face-connected component; largest ${routeConnectivity.largestComponentCellCount}.`);
check('R07A-QA-09-STRICT-EXECUTION',
  shellExecution.passed && openingsExecution.passed,
  `${shellExecution.successfulGroups + openingsExecution.successfulGroups}/7685 strict groups succeeded.`);
check('R07A-QA-10-ROLLBACK-POSTSTATE',
  shellRollback.passed && openingsRollback.passed,
  `${shellRollback.passedGuards + openingsRollback.passedGuards}/7685 rollback guards PASS.`);

const failedChecks = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r07a-b03-portal-tube-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failedChecks.length === 0
    ? 'PASS_R07A_B03_PORTAL_TUBE_POST_RELEASE_ACCEPTED'
    : 'FAIL_R07A_B03_PORTAL_TUBE_POST_RELEASE',
  release: {
    transactionId: manifest.transactionId,
    releaseNodeId: manifest.releaseNodeId,
    scopeIds: manifest.scopeIds,
    manifestIdentity: manifest.manifestIdentity,
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
    packages: [shellExecution, openingsExecution],
    rollbackPoststatePreflights: [openingsRollback, shellRollback],
    strictSuccessfulGroupCount:
      shellExecution.successfulGroups + openingsExecution.successfulGroups,
    strictFailedGroupCount: shellExecution.failedGroups + openingsExecution.failedGroups,
    strictNoopCount: shellExecution.noopCommands + openingsExecution.noopCommands,
  },
  geometry: {
    routeVoid: routeIdentity,
    enclosure: enclosureIdentity,
    stoneTieIns: stoneTieInIdentity,
    constructionAndEnclosureDisjoint:
      enclosure.every((cell) => !constructionKeys.has(cellKey(cell))),
  },
  postState: {
    routeVoid: {
      expectedState: TARGET_ROUTE_STATE,
      stateCensus: stateCensus(routeRecords),
      matchingCellCount: routeRecords.length - routeMismatches.length,
      mismatchCellCount: routeMismatches.length,
      listedMismatches: routeMismatches.slice(0, 100),
      connectivity: routeConnectivity,
    },
    enclosure: {
      expectedPolishedDioriteCellCount: EXPECTED.polishedDioriteCellCount,
      expectedStoneTieInCellCount: EXPECTED.stoneTieInCellCount,
      stateCensus: stateCensus(enclosureRecords),
      matchingCellCount: enclosureRecords.length - enclosureMismatches.length,
      mismatchCellCount: enclosureMismatches.length,
      listedMismatches: enclosureMismatches.slice(0, 100),
    },
  },
  checks,
  summary: {
    passed: failedChecks.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failedChecks.length,
    failCount: failedChecks.length,
    routeAirCellCount: routeRecords.filter(({ state }) => state === TARGET_ROUTE_STATE).length,
    enclosurePolishedDioriteCellCount:
      enclosureRecords.filter(({ state }) => state === TARGET_SHELL_STATE).length,
    enclosureStoneTieInCellCount:
      enclosureRecords.filter(({ state }) => state === TIE_IN_STATE).length,
    routeComponentCount: routeConnectivity.componentCount,
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

const markdown = `# CZ-R07A B03 portal tube post-release QA

**Status:** ${report.status}  
**QA payload identity:** \`${qaPayloadSha256}\`  
**Ledger:** \`${ledgerBinding.sha256}\`  
**Post complete save:** \`${ledger.postSnapshot.completeSaveSha256}\`

## Result

| Test | Result |
|---|---:|
| Route void | ${report.summary.routeAirCellCount.toLocaleString()} / ${EXPECTED.routeCellCount.toLocaleString()} exact \`minecraft:air\` |
| Enclosure finish | ${report.summary.enclosurePolishedDioriteCellCount.toLocaleString()} / ${EXPECTED.polishedDioriteCellCount.toLocaleString()} exact \`minecraft:polished_diorite\` |
| Stone tie-ins | ${report.summary.enclosureStoneTieInCellCount} / ${EXPECTED.stoneTieInCellCount} exact \`minecraft:stone\` |
| Route connectivity | ${report.summary.routeComponentCount} face-connected component |
| Strict execution | ${report.executionEvidence.strictSuccessfulGroupCount.toLocaleString()} succeeded / ${report.executionEvidence.strictFailedGroupCount} failed / ${report.executionEvidence.strictNoopCount} no-op |
| Rollback post-state | ${(shellRollback.passedGuards + openingsRollback.passedGuards).toLocaleString()} / ${EXPECTED.operatedCellCount.toLocaleString()} guards PASS |

## Checks

| Check | Status | Detail |
|---|---|---|
${checks.map(({ id, status, detail }) => `| ${id} | **${status}** | ${detail} |`).join('\n')}

This verifier read only the sealed source/post Anvil saves and hash-bound
evidence. It made no live call and performed no world edit.
`;
fs.writeFileSync(absolute(MARKDOWN_PATH), markdown);

console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  routeAir: `${report.summary.routeAirCellCount}/${EXPECTED.routeCellCount}`,
  enclosurePolishedDiorite:
    `${report.summary.enclosurePolishedDioriteCellCount}/${EXPECTED.polishedDioriteCellCount}`,
  enclosureStoneTieIns:
    `${report.summary.enclosureStoneTieInCellCount}/${EXPECTED.stoneTieInCellCount}`,
  routeComponents: report.summary.routeComponentCount,
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
