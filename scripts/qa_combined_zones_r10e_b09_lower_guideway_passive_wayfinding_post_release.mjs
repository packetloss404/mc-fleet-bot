#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R10E. */

import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  buildB09MinimumReservation,
  cellKey,
  cellsIn,
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
  'data/world-review/combined-zones-r10e-live-20260822T001339Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r10e-b09-lower-guideway-passive-wayfinding.release-manifest.json';
const PACKAGE_KEY = 'b09-lower-guideway-passive-ceiling-wayfinding';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07hManifest: 'data/buildops/combined-zones-r07h-b09-lower-guideway-segment-02.release-manifest.json',
  r07iManifest: 'data/buildops/combined-zones-r07i-b09-maximal-curve-summit-return.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: 'dc97d41cce9f162920fb76813061de071f387a16a1c19672595190399dda180c',
  manifestSha256: 'fea2757a99fe42787efe422edc77a3bf5685d246a4a106104cd698d15dcb4f1f',
  manifestIdentity: '6432084e91ad29a98618059879fcd76d7098f4fa91d9bd9bbe648fe56e93874f',
  forwardFileSha256: 'd3e2ee6b19b252a71ca76fe3b462d41332ae1d40889eb1a9d1ec65cf5fb218aa',
  rollbackFileSha256: 'cb8cd40cbdb79b404a0dbfad16e04f9884e69632a5751868fef995eb7569d836',
  targetHash: '81625f2011e725b624a699ad7176ee2c3d85f065f3f9e1589ec3cd96f1cb705f',
  lowerRouteHash: '33c4566c2030f7e9f5d7cac5a65bb5579a551a2e848a3354f543ef566e969eb1',
  lowerBoundaryHash: '131169b3d54c7781fccd906c83c68d6c90ce50c8e3c0da3cd21f407dfb07b758',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  curveApertureHash: '9991feda6e953dd4e66585d7e23a61723c3319cb59c22782196fab028f2c08bb',
  curveCollarHash: '5d96ac6cef022abbbb1be498188c65b9f4032572f83980cb1460ba1e8b2e6c99',
  haloHash: 'd474cf24909f624368a26bd7daf38536375fe4936e19513f835c9b5a6a20383a',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '085b77456806ea0496343cd9eb47107da9c37872a67632ebb630a563914937ca',
  sourceCompleteSaveSha256: 'd71c13b1cf9030dca2069190ffacf89b79fa6a7e0c7c202a42b880fb189e9886',
  sourceRegionSha256: '09f9a16344be34478129eec4db3c4c8e18de4c525b9d9deb86d0565c446b93e5',
  postCompleteSaveSha256: '4705f8c8b5e25de25af862071f117573bc7c0aff9dd0edb0e0c4b7fd369c0cf0',
  postRegionSha256: '8c41238e78e061a7ac3aafd58712f81fb7c66e9a6b41b2afdaa2ac3d26848443',
  completedReleaseIdentitySha256: '6c40b77e68ae455330eab4658c0c859132f3e60570b1a98c97decd4134c192f5',
  journalSha256: 'fc70c5c6dd6ffc90ea50949a9dfcb8ff9b3fc37b0347a72ba74301889c80023c',
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
  if (!condition) throw new Error(`R10E post-release QA rejected: ${message}`);
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
'ledger is not the completed R10E transaction');
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
invariant(forward.length === 15 && hashCells(targets) === EXPECTED.targetHash
  && forward.every(({ fromState, toState }) => fromState === DIORITE && toState === LIGHT),
'target set or transition drifted');
invariant(rollback.length === 15 && rollback.every((operation, index) => {
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
const r07h = readJson(INPUTS.r07hManifest);
const r07i = readJson(INPUTS.r07iManifest);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561
  && technical.deterministicGeometryContract.centerlinePointCount === 561,
'B09 centerline drifted');
const lowerPoints = centerline.slice(3, 240);
const lowerRoute = uniqueCells(lowerPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const routeKeys = new Set(lowerRoute.map(cellKey));
const lowerBoundary = uniqueCells(lowerRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx,
    y: cell.y + dy,
    z: cell.z + dz,
  }))
)).filter((cell) => !routeKeys.has(cellKey(cell))));
const fixtureIndices = Array.from({ length: 15 }, (_, index) => 15 + index * 16);
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const curveAperture = cellsIn(r07i.scope.geometry.ownedR07hFourCellTurnAperture.bounds);
const apertureKeys = new Set(curveAperture.map(cellKey));
const curveCollar = cellsIn(r07h.scope.geometry.newFarIsolationCap.bounds)
  .filter((cell) => !apertureKeys.has(cellKey(cell)));
const acceptedFixtureIndices = [4, 7, ...fixtureIndices];
const maximumIndexDistanceToFixture = Math.max(...lowerPoints.map(({ index }) => (
  Math.min(...acceptedFixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(lowerRoute.length === 474 && hashCells(lowerRoute) === EXPECTED.lowerRouteHash
  && lowerBoundary.length === 1426 && hashCells(lowerBoundary) === EXPECTED.lowerBoundaryHash
  && hashCells(fixtures) === EXPECTED.targetHash
  && fixtures.every((cell) => lowerBoundary.some((boundary) => (
    cellKey(boundary) === cellKey(cell)
  )))
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && curveAperture.length === 4 && hashCells(curveAperture) === EXPECTED.curveApertureHash
  && curveCollar.length === 8 && hashCells(curveCollar) === EXPECTED.curveCollarHash
  && maximumIndexDistanceToFixture === 8,
'independently derived lower-guideway geometry or cadence drifted');

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
const sourceRoute = await records(sourceReader, lowerRoute);
const postRoute = await records(postReader, lowerRoute);
const sourceBoundary = await records(sourceReader, lowerBoundary);
const postBoundary = await records(postReader, lowerBoundary);
const sourceWestCap = await records(sourceReader, westCap);
const postWestCap = await records(postReader, westCap);
const sourceAperture = await records(sourceReader, curveAperture);
const postAperture = await records(postReader, curveAperture);
const sourceCollar = await records(sourceReader, curveCollar);
const postCollar = await records(postReader, curveCollar);
invariant([...sourceRoute, ...postRoute].every(({ state }) => state === AIR)
  && [...sourceWestCap, ...postWestCap, ...sourceCollar, ...postCollar]
    .every(({ state }) => state === DIORITE)
  && [...sourceAperture, ...postAperture].every(({ state }) => state === AIR),
'route, B08 cap, curve aperture, or collar was not preserved');
invariant(stateCensus(sourceBoundary)[DIORITE] === 1422
  && stateCensus(sourceBoundary)[LIGHT] === 2
  && stateCensus(sourceBoundary)[AIR] === 2
  && stateCensus(postBoundary)[DIORITE] === 1407
  && stateCensus(postBoundary)[LIGHT] === 17
  && stateCensus(postBoundary)[AIR] === 2,
'lower-route boundary state census is not exact');
const boundaryDifferences = sourceBoundary.filter((record, index) => (
  record.state !== postBoundary[index].state
));
invariant(boundaryDifferences.length === 15
  && boundaryDifferences.every(({ cell }) => targetKeys.has(cellKey(cell))),
'lower-route boundary contains undeclared drift');

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
invariant(halo.length === 105 && hashCells(halo) === EXPECTED.haloHash
  && haloDifferences.length === 15
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
  && differences.length === 15 && undeclaredDifferences.length === 0,
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
  && execution.successfulGroups === 15 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journalSha256
  && execution.streamJournalSha256 === EXPECTED.journalSha256
  && journal.length === 36
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 15,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 15
  && rollbackPreflight.passed === 15 && rollbackPreflight.failed === 0,
'rollback post-state preflight is not 15/15 PASS');
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
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 15
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R10E-P1-B09-LOWER-GUIDEWAY-PASSIVE-WAYFINDING-POST-QA',
  status: 'PASS_EXACT_LOWER_GUIDEWAY_WAYFINDING_ROUTE_BOUNDARY_AND_INTERFACES_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T00:25:00Z'),
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
    acceptedPredecessorFixtureIndices: [4, 7],
    maximumRouteIndexDistanceToAcceptedFixture: maximumIndexDistanceToFixture,
    maximumNewFixtureSpacingInIndices: 16,
  },
  preservation: {
    lowerRouteCellCount: lowerRoute.length,
    lowerRouteCoordinateSetSha256: hashCells(lowerRoute),
    sourceRouteAirPassCount: sourceRoute.filter(({ state }) => state === AIR).length,
    postRouteAirPassCount: postRoute.filter(({ state }) => state === AIR).length,
    lowerBoundaryCellCount: lowerBoundary.length,
    lowerBoundaryCoordinateSetSha256: hashCells(lowerBoundary),
    sourceBoundaryStateCensus: stateCensus(sourceBoundary),
    postBoundaryStateCensus: stateCensus(postBoundary),
    boundaryDeclaredDifferenceCount: boundaryDifferences.length,
    boundaryUndeclaredDifferenceCount: 0,
    retainedB08WestCapCellCount: westCap.length,
    retainedB08WestCapCoordinateSetSha256: hashCells(westCap),
    retainedCurveApertureCellCount: curveAperture.length,
    retainedCurveApertureCoordinateSetSha256: hashCells(curveAperture),
    retainedCurveCollarCellCount: curveCollar.length,
    retainedCurveCollarCoordinateSetSha256: hashCells(curveCollar),
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
    curveApertureChanged: false,
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
    acceptedScope: 'fifteen full-cube passive B09 lower-guideway ceiling wayfinding fixtures only',
    routeClearanceAndBoundaryPreserved: true,
    b08ExternalCapRemainsFailClosed: true,
    curveApertureAndCollarPreserved: true,
    photometricEmergencyOrLifeSafetyLightingCommissioned: false,
    railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
    funicularCommissioned: false,
    pedestrianRouteCommissioned: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  summary: { checkCount: 14, passCount: 14, failCount: 0, passed: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(evidenceDirectory, 'r10e-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r10e-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R10E B09 lower-guideway passive wayfinding post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All 15 exact R07F/R07H ceiling cells transitioned from polished diorite `
  + `to sea lantern. Together with the two accepted R10D fixtures, the regular `
  + `cadence keeps every lower-route index within eight indices of a fixture.\n\n`
  + `The complete 474-cell lower route remains air. Its 1,426-cell boundary is `
  + `exact: 1,407 polished-diorite cells, 17 accepted fixtures, and two R07I `
  + `aperture-air cells. The 12-cell B08 cap, complete four-cell curve aperture, `
  + `and eight-cell collar are preserved.\n\n`
  + `The 105-cell halo and complete 7,800-cell B09 accommodation each contain `
  + `exactly 15 declared differences and zero undeclared drift. All 7,785 B09 `
  + `non-target cells are preserved.\n\n`
  + `All 17 wrapper stages and 17 evidence bindings pass. The 36-entry journal `
  + `ends complete and cleaned after 15 successful groups. Exact rollback `
  + `preflight passes 15/15.\n\n`
  + `Acceptance is limited to passive visual wayfinding. The interfaces remain `
  + `unchanged, and no photometric/emergency/life-safety lighting, rail, drive, `
  + `brake, vehicle, controls, power, drainage, funicular, or pedestrian route `
  + `is commissioned. This verifier made no live call and no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  targetPass: report.exactPostState.exactTransitionPassCount,
  routeAir: report.preservation.postRouteAirPassCount,
  undeclaredB09Drift: report.preservation.undeclaredB09DifferenceCount,
  stagePass: report.evidence.requiredStagePassCount,
  journalEntries: report.execution.streamJournalEntryCount,
  liveCallsPerformed: false,
}, null, 2));
