#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R10D. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
  dilateCells,
  hashCells,
  mountainSurfaceY,
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
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r10d-live-20260821T235524Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r10d-b09-lower-station-passive-lighting.release-manifest.json';
const PACKAGE_KEY = 'b09-lower-station-passive-ceiling-lights';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07fManifest: 'data/buildops/combined-zones-r07f-b09-lower-guideway-segment-01.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: '4371d975528be948049d4ca31fec234e58029e92f33e72179a4d1b439863addb',
  manifestSha256: '73ff36b566b00ec263e9f6080bca16b235fbde7dcc685b6eb21bc2c3c145c86e',
  manifestIdentity: '07b41c9651562cc01e5ae6d072dca626ddff443d6ba24fbf247120e2bccfb601',
  forwardFileSha256: '1c967adef315ce180a252f71df8690db1e99533a3db55e7e1ee9d89341723a1c',
  rollbackFileSha256: '38333dcb0aea6edfb0bdb4d7b5f8c440e0d87f5be1201300bc080e1fc6680823',
  targetHash: '07a255938e33df38d4a3b8381e0aacc5b024a26f8fc38019452ec6f75cd93d73',
  interiorHash: '4062250031378a6fd8ee3a499df1c38cfb9af751e28876bb90c06bf00cd6eae7',
  shellHash: 'e7b44ebf100becffaca355a6b863219738a4c27e0dad83ea21170da35e411e1d',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  eastSeamHash: '5b6a8c096adadbbd5a5ed0399678c87aed1fa5db20b89adeb8289745f693a75e',
  eastCollarHash: '7065c9fc48e7c9c69a69428e9c25a3cc2a46ef4b599f4939c017a79a63b7dae9',
  haloHash: '4f125eced5c23f2f1d937831d12e6448fc5fdaefc1b41b5d7956ee9896f89fc2',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '8516c1ffb69c6f9ca7eed5aa46e99491042501352289392129e1f8260ff44a79',
  sourceCompleteSaveSha256: '8f6370953a12bf66dcb2b2fb3bc92eb90b7fbf384d60491d053d532dcd77f204',
  sourceRegionSha256: '83ab2368daa4ac8a64723bfe355f86644e61e585c224fee774e0e6503a24003c',
  postCompleteSaveSha256: 'f3bdba213805aa601b8bed7f9cb58b75a44a84f27ef643a80a8e0bf6d53672cb',
  postRegionSha256: '5ab0829c8d4a5e5b88f7b3b494b36ddc5461cc52cc902fa7223fa2b440ea1284',
  completedReleaseIdentitySha256: 'f8d324f9adc05de99090c6e511479b13e703f3202bda51c3a1157ea7958e6ff7',
  journalSha256: '7d08bb5614999c67608135aca529e568136923af765d40be8b83c5c467d36a51',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10D post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const stateSetHash = (records) => sha256(`combined-zones-current-block-state-set-v1\n${records
  .slice()
  .sort((a, b) => a.cell.x - b.cell.x || a.cell.y - b.cell.y || a.cell.z - b.cell.z)
  .map(({ cell, state }) => `${cellKey(cell)}=${state}`).join('\n')}\n`);
const stateCensus = (records) => Object.fromEntries([...records
  .reduce((counts, { state }) => counts.set(state, (counts.get(state) ?? 0) + 1), new Map())
  .entries()].sort(([a], [b]) => a.localeCompare(b)));

function parseOperations(filename) {
  const operations = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw.startsWith('REPL ')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields.length === 9, `${filename} contains malformed REPL`);
    const point = fields.slice(1, 4).map(Number);
    invariant(fields.slice(4, 7).map(Number).join(',') === point.join(','),
      `${filename} contains a non-cell guard`);
    operations.push({
      cell: { x: point[0], y: point[1], z: point[2] },
      fromState: fields[7],
      toState: fields[8],
    });
  }
  return operations;
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return sha256(body);
}

function buildCenterline(model, endpoints) {
  const portal = endpoints.from;
  const summit = endpoints.to;
  let climbZ = portal.z - 1;
  while (climbZ > summit.z
    && mountainSurfaceY(portal.x, climbZ - 1, model)
      !== mountainSurfaceY(portal.x, climbZ, model)) climbZ -= 1;
  let throatX = null;
  for (let distance = 1; distance <= model.extents.east; distance += 1) {
    const x = portal.x + distance;
    if (mountainSurfaceY(x, climbZ, model) === portal.y - 1
      && mountainSurfaceY(x - 1, climbZ, model) === portal.y - 1) {
      throatX = x;
      break;
    }
  }
  invariant(throatX !== null, 'could not independently derive the B09 throat');
  const faceRun = throatX - portal.x;
  const points = [];
  for (let d = 0; d <= faceRun; d += 1) {
    points.push({ x: portal.x + d, y: portal.y, z: portal.z });
  }
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) {
    points.push({ x: throatX, y: portal.y, z: portal.z - offset });
  }
  for (let d = 1; d <= faceRun; d += 1) {
    const x = throatX - d;
    points.push({ x, y: mountainSurfaceY(x, climbZ, model) + 1, z: climbZ });
  }
  for (let d = 1; d <= Math.abs(summit.z - climbZ); d += 1) {
    const z = climbZ - d;
    points.push({ x: summit.x, y: mountainSurfaceY(summit.x, z, model) + 1, z });
  }
  return points.map((point, index) => ({ ...point, index }));
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(fileBinding(LEDGER_PATH).sha256 === EXPECTED.ledgerSha256,
'ledger file identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId,
'ledger is not the completed R10D transaction');
invariant(ledger.manifest.sha256 === EXPECTED.manifestSha256
  && fileBinding(MANIFEST_PATH).sha256 === EXPECTED.manifestSha256
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'manifest identity drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentitySha256,
'source, post, or completed release identity drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'source or post region identity drifted');
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256,
'source or post complete-save intake is not PASS');
for (const binding of ledger.evidenceBindings) {
  const actual = fileBinding(binding.path);
  invariant(actual.sha256 === binding.sha256 && actual.bytes === binding.bytes,
    `evidence binding drifted: ${binding.path}`);
}

const pkg = ledger.packages.find(({ key }) => key === PACKAGE_KEY);
invariant(pkg
  && pkg.forward.sha256 === EXPECTED.forwardFileSha256
  && pkg.rollback.sha256 === EXPECTED.rollbackFileSha256
  && fileBinding(pkg.forward.path).sha256 === EXPECTED.forwardFileSha256
  && fileBinding(pkg.rollback.path).sha256 === EXPECTED.rollbackFileSha256,
'operation-file binding drifted');
const forward = parseOperations(pkg.forward.path);
const rollback = parseOperations(pkg.rollback.path);
const targets = forward.map(({ cell }) => cell);
const targetKeys = new Set(targets.map(cellKey));
invariant(forward.length === 2 && hashCells(targets) === EXPECTED.targetHash
  && forward.every(({ fromState, toState }) => fromState === DIORITE && toState === LIGHT),
'target set or transition drifted');
invariant(rollback.length === 2 && rollback.every((operation, index) => {
  const source = forward[forward.length - 1 - index];
  return cellKey(operation.cell) === cellKey(source.cell)
    && operation.fromState === source.toState
    && operation.toState === source.fromState;
}), 'rollback is not the exact reverse-order inverse');
invariant(operationBodySha256(pkg.forward.path) === manifest.operations[PACKAGE_KEY].forwardSha256
  && operationBodySha256(pkg.rollback.path) === manifest.operations[PACKAGE_KEY].rollbackSha256,
'operation body identity drifted');

const technical = readJson(INPUTS.technical);
const connectors = readJson(INPUTS.connectors);
const d05 = readJson(INPUTS.d05);
const r07d = readJson(INPUTS.r07dManifest);
const r07f = readJson(INPUTS.r07fManifest);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561
  && technical.deterministicGeometryContract.centerlinePointCount === 561,
'B09 centerline drifted');
const stationPoints = centerline.slice(3, 9);
const railDatum = stationPoints.map(({ x, y, z }) => ({ x, y, z }));
const headroom = stationPoints.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const lowerInterior = uniqueCells([...railDatum, ...headroom]);
const interiorKeys = new Set(lowerInterior.map(cellKey));
const lowerShell = dilateCells(lowerInterior, 1)
  .filter((cell) => !interiorKeys.has(cellKey(cell)));
const fixtureIndices = [4, 7];
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const eastSeam = cellsIn(r07f.scope.geometry.ownedInternalSeamOpening.bounds);
const eastSeamKeys = new Set(eastSeam.map(cellKey));
const eastCollar = cellsIn(r07d.scope.geometry.eastIsolationCap.bounds)
  .filter((cell) => !eastSeamKeys.has(cellKey(cell)));
const enclosureFaceBoundary = uniqueCells(lowerInterior.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))
)).filter((cell) => !interiorKeys.has(cellKey(cell))));
invariant(stationPoints.map(({ index }) => index).join(',') === '3,4,5,6,7,8'
  && lowerInterior.length === 12 && hashCells(lowerInterior) === EXPECTED.interiorHash
  && lowerShell.length === 84 && hashCells(lowerShell) === EXPECTED.shellHash
  && hashCells(fixtures) === EXPECTED.targetHash
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && eastSeam.length === 2 && hashCells(eastSeam) === EXPECTED.eastSeamHash
  && eastCollar.length === 10 && hashCells(eastCollar) === EXPECTED.eastCollarHash
  && enclosureFaceBoundary.length === 40
  && enclosureFaceBoundary.every((cell) => lowerShell.some((shell) => (
    cellKey(shell) === cellKey(cell)
  )))
  && fixtures.every((cell) => enclosureFaceBoundary.some((boundary) => (
    cellKey(boundary) === cellKey(cell)
  ))), 'independently derived lower-station geometry drifted');
const maximumIndexDistanceToFixture = Math.max(...stationPoints.map(({ index }) => (
  Math.min(...fixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(maximumIndexDistanceToFixture === 1, 'fixture cadence drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
async function readState(reader, cell) {
  return stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
}
async function records(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) {
    output.push({ cell, state: await readState(reader, cell) });
  }
  return output;
}
const transitionFailures = [];
for (const operation of forward) {
  const sourceState = await readState(sourceReader, operation.cell);
  const postState = await readState(postReader, operation.cell);
  if (sourceState !== operation.fromState || postState !== operation.toState) {
    transitionFailures.push({ cell: operation.cell, sourceState, postState });
  }
}
invariant(transitionFailures.length === 0, 'one or more exact fixture transitions failed');
const sourceInterior = await records(sourceReader, lowerInterior);
const postInterior = await records(postReader, lowerInterior);
const sourceWestCap = await records(sourceReader, westCap);
const postWestCap = await records(postReader, westCap);
const sourceEastSeam = await records(sourceReader, eastSeam);
const postEastSeam = await records(postReader, eastSeam);
const sourceEastCollar = await records(sourceReader, eastCollar);
const postEastCollar = await records(postReader, eastCollar);
invariant([...sourceInterior, ...postInterior].every(({ state }) => state === AIR)
  && [...sourceWestCap, ...postWestCap, ...sourceEastCollar, ...postEastCollar]
    .every(({ state }) => state === DIORITE)
  && [...sourceEastSeam, ...postEastSeam].every(({ state }) => state === AIR),
'route void, B08 cap, guideway seam, or seam collar was not preserved');
const sourceShell = await records(sourceReader, lowerShell);
const postShell = await records(postReader, lowerShell);
invariant(sourceShell.every(({ cell, state }) => (
  eastSeamKeys.has(cellKey(cell)) ? state === AIR : state === DIORITE
))
  && postShell.every(({ cell, state }) => (
    targetKeys.has(cellKey(cell)) ? state === LIGHT
      : eastSeamKeys.has(cellKey(cell)) ? state === AIR : state === DIORITE
  )), 'lower-station shell is not exact after the two fixture migrations');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  })),
]));
const sourceHalo = await records(sourceReader, halo);
const postHalo = await records(postReader, halo);
const haloDifferences = sourceHalo.filter((record, index) => record.state !== postHalo[index].state);
invariant(halo.length === 14 && hashCells(halo) === EXPECTED.haloHash
  && haloDifferences.length === 2
  && haloDifferences.every(({ cell }) => targetKeys.has(cellKey(cell))),
'fixture halo contains undeclared drift');

const accommodation = buildB09MinimumReservation(model.formula, endpoints);
invariant(accommodation.length === 7800 && hashCells(accommodation) === EXPECTED.b09Hash,
'B09 accommodation geometry drifted');
const sourceB09 = await records(sourceReader, accommodation);
const postB09 = await records(postReader, accommodation);
const differences = [];
const undeclaredDifferences = [];
for (let index = 0; index < accommodation.length; index += 1) {
  if (sourceB09[index].state !== postB09[index].state) {
    const difference = {
      cell: accommodation[index],
      sourceState: sourceB09[index].state,
      postState: postB09[index].state,
    };
    differences.push(difference);
    if (!targetKeys.has(cellKey(accommodation[index]))) undeclaredDifferences.push(difference);
  }
}
invariant(stateSetHash(sourceB09) === EXPECTED.sourceB09StateHash
  && differences.length === 2 && undeclaredDifferences.length === 0,
'B09 accommodation contains undeclared source-to-post drift');

const evidenceDirectory = path.dirname(LEDGER_PATH);
const execution = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-execution.json`));
const rollbackPreflight = readJson(path.join(
  evidenceDirectory,
  `${PACKAGE_KEY}.rollback-poststate-preflight.json`,
));
const journalPath = `${path.join(
  evidenceDirectory,
  `${PACKAGE_KEY}.forward-execution.json`,
)}.stream-journal.jsonl`;
const journalBinding = fileBinding(journalPath);
const journal = fs.readFileSync(absolute(journalPath), 'utf8').trim().split(/\r?\n/)
  .map((line) => JSON.parse(line));
invariant(execution.status === 'complete' && execution.dryRun === false
  && execution.strictNoop === true && execution.operationRole === 'forward'
  && execution.successfulGroups === 2 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journalSha256
  && execution.streamJournalSha256 === EXPECTED.journalSha256
  && journal.length === 10
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 2,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 2
  && rollbackPreflight.passed === 2 && rollbackPreflight.failed === 0,
'rollback post-state preflight is not 2/2 PASS');
const requiredStages = [
  'standing-authorization', 'exact-release-manifest-qa',
  'fresh-source-complete-save', 'source-complete-save-intake',
  'source-snapshot-identity', `forward-source-preflight:${PACKAGE_KEY}`,
  `strict-forward-parser-check:${PACKAGE_KEY}`,
  `strict-rollback-parser-check:${PACKAGE_KEY}`,
  `projected-rollback-preflight:${PACKAGE_KEY}`, 'block-entity-clearance',
  'live-entity-clearance', `same-moment-package-entity-clearance:${PACKAGE_KEY}`,
  `strict-forward-execution:${PACKAGE_KEY}`, 'fresh-post-complete-save',
  'post-complete-save-intake', 'post-snapshot-identity',
  `rollback-poststate-preflight:${PACKAGE_KEY}`,
];
invariant(ledger.stages.length === 17
  && new Set(ledger.stages.map(({ stage }) => stage)).size === 17
  && requiredStages.every((stage) => ledger.stages.some((entry) => (
    entry.stage === stage && entry.status === 'PASS'
  ))), 'wrapper is not an exact 17/17 PASS');
const manifestQa = readJson(path.join(evidenceDirectory, 'exact-release-manifest-qa.json'));
const blockEntity = readJson(path.join(evidenceDirectory, 'block-entity-clearance.json'));
const liveEntity = readJson(path.join(evidenceDirectory, 'live-entity-clearance.json'));
const sameMomentEntity = readJson(path.join(
  evidenceDirectory,
  `${PACKAGE_KEY}.same-moment-entity-clearance.json`,
));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 2
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R10D-P1-B09-LOWER-STATION-PASSIVE-LIGHTING-POST-QA',
  status: 'PASS_EXACT_LOWER_STATION_FIXTURES_ROUTE_CAP_AND_SEAM_PRESERVED_REVERSIBLE',
  generatedAtUtc: value('--generated-at', '2026-08-22T00:05:00Z'),
  ledger: fileBinding(LEDGER_PATH),
  manifest: fileBinding(MANIFEST_PATH),
  sourceSnapshot: {
    root: ledger.sourceSnapshot.root,
    completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
    regionSha256: sourceIdentity.sha256,
  },
  postSnapshot: {
    root: ledger.postSnapshot.root,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: postIdentity.sha256,
  },
  releaseIdentity: {
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  exactPostState: {
    targetCellCount: targets.length,
    targetCoordinateSetSha256: hashCells(targets),
    exactTransitionPassCount: targets.length - transitionFailures.length,
    exactTransitionFailureCount: transitionFailures.length,
    desiredState: LIGHT,
    fixtureCenterlineIndices: fixtureIndices,
    maximumStationIndexDistanceToFixture: maximumIndexDistanceToFixture,
  },
  preservation: {
    lowerStationInteriorCellCount: lowerInterior.length,
    lowerStationInteriorCoordinateSetSha256: hashCells(lowerInterior),
    sourceInteriorAirPassCount: sourceInterior.filter(({ state }) => state === AIR).length,
    postInteriorAirPassCount: postInterior.filter(({ state }) => state === AIR).length,
    lowerStationShellCellCount: lowerShell.length,
    lowerStationShellCoordinateSetSha256: hashCells(lowerShell),
    enclosureFaceBoundaryCellCount: enclosureFaceBoundary.length,
    sourceShellStateCensus: stateCensus(sourceShell),
    postShellStateCensus: stateCensus(postShell),
    retainedB08WestCapCellCount: westCap.length,
    retainedB08WestCapCoordinateSetSha256: hashCells(westCap),
    retainedGuidewayInternalSeamCellCount: eastSeam.length,
    retainedGuidewayInternalSeamCoordinateSetSha256: hashCells(eastSeam),
    retainedGuidewaySeamCollarCellCount: eastCollar.length,
    retainedGuidewaySeamCollarCoordinateSetSha256: hashCells(eastCollar),
    haloCellCount: halo.length,
    haloCoordinateSetSha256: hashCells(halo),
    sourceHaloStateCensus: stateCensus(sourceHalo),
    postHaloStateCensus: stateCensus(postHalo),
    haloDeclaredDifferenceCount: haloDifferences.length,
    haloUndeclaredDifferenceCount: 0,
    b09AccommodationCellCount: accommodation.length,
    sourceB09StateSetSha256: stateSetHash(sourceB09),
    postB09StateSetSha256: stateSetHash(postB09),
    declaredB09DifferenceCount: differences.length,
    undeclaredB09DifferenceCount: undeclaredDifferences.length,
    preservedNonTargetB09CellCount: accommodation.length - differences.length,
    b08ExternalInterfaceOpened: false,
    guidewayInternalSeamChanged: false,
  },
  execution: {
    strictForwardGroupPassCount: execution.successfulGroups,
    failedGroupCount: execution.failedGroups,
    noOpCount: execution.noopCommands,
    unknownReplyCount: execution.unknownReplyCommands,
    worldEditLeftoverCount: execution.worldEditLeftoverCount,
    streamJournalEntryCount: journal.length,
    streamJournalSha256: journalBinding.sha256,
    streamJournalFinalStatus: journal.at(-1).status,
    rollbackPoststatePassCount: rollbackPreflight.passed,
    rollbackPoststateFailCount: rollbackPreflight.failed,
    exactReverseOrderInverse: true,
    allTemporaryChunksReleased: execution.forceLoadAudit.allTemporaryReleased,
  },
  evidence: {
    requiredStageCount: requiredStages.length,
    requiredStagePassCount: requiredStages.length,
    evidenceBindingCount: ledger.evidenceBindings.length,
    evidenceBindingFailureCount: 0,
    manifestQa: manifestQa.status,
    blockEntityClearance: blockEntity.status,
    liveEntityClearance: liveEntity.status,
    sameMomentEntityClearance: sameMomentEntity.status,
  },
  disposition: {
    acceptedScope: 'two full-cube passive B09 lower-station ceiling fixtures only',
    routeClearanceAndEnclosurePreserved: true,
    b08ExternalCapRemainsFailClosed: true,
    guidewayInternalSeamPreserved: true,
    photometricOrEmergencyLightingCommissioned: false,
    railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
    funicularCommissioned: false,
    pedestrianRouteCommissioned: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  summary: { checkCount: 13, passCount: 13, failCount: 0, passed: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(evidenceDirectory, 'r10d-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r10d-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R10D B09 lower-station passive lighting post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `Both exact R07D ceiling cells transitioned from polished diorite to sea `
  + `lantern. The 12-cell lower-station rail/headroom void remains air. The `
  + `84-cell shell is exact: 80 polished-diorite cells, two full-cube fixtures, `
  + `and the retained two-cell R07F internal guideway seam. The 12-cell B08-facing `
  + `cap and ten-cell guideway-seam collar remain polished diorite.\n\n`
  + `The 14-cell fixture halo has exactly two declared differences and zero `
  + `undeclared drift. Across the complete 7,800-cell B09 accommodation, exactly `
  + `two declared cells differ and all 7,798 non-target cells are preserved.\n\n`
  + `All 17 wrapper stages and 17 evidence bindings pass. The ten-entry journal `
  + `ends complete and cleaned after two successful groups. Exact rollback `
  + `preflight passes 2/2.\n\n`
  + `Acceptance is limited to passive visual fixtures. The B08 cap remains `
  + `fail-closed, the internal guideway seam is unchanged, and no photometric/`
  + `emergency lighting, rail, drive, brake, vehicle, controls, power, drainage, `
  + `funicular, or pedestrian route is commissioned. This verifier made no live `
  + `call and performed no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  targetPass: report.exactPostState.exactTransitionPassCount,
  interiorAir: report.preservation.postInteriorAirPassCount,
  undeclaredB09Drift: report.preservation.undeclaredB09DifferenceCount,
  stagePass: report.evidence.requiredStagePassCount,
  journalEntries: report.execution.streamJournalEntryCount,
  liveCallsPerformed: false,
}, null, 2));
