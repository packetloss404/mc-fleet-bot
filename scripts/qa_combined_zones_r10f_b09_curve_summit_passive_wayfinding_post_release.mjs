#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R10F. */

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
  'data/world-review/combined-zones-r10f-live-20260822T003320Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r10f-b09-curve-summit-passive-wayfinding.release-manifest.json';
const PACKAGE_KEY = 'b09-curve-summit-passive-ceiling-wayfinding';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07dManifest: 'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
});
const EXPECTED = Object.freeze({
  ledgerSha256: 'ff406dc599979d497ed4fb6f4c783f0b4a2dd6bf4689f9d9e7b8dc8f65bcc903',
  manifestSha256: '26655abd984d90b4d31c513fceecd2987cae7c70b68df3ef30e6d3d59aff741f',
  manifestIdentity: 'bccef745745555d1ae9c5dbb4ee000546feae033ad5688d021dd256f04ab9919',
  forwardFileSha256: 'a24fb54b2dd8f9ae0f924603fb8b1e0d8a8d3cabdb37f8a233ae3e5235273675',
  rollbackFileSha256: 'f8d2f1800942768987e04cba0545a05ed9f7487b78d796f585f07a83f8dbf393',
  targetHash: 'aff71953450823749a57f808f119ef333712418eb5be1755066c7bc643df61e4',
  segmentRouteHash: '6297d5963c2209e0d63d0735c7991922c4273da239189ff3e3ebe34c2839f528',
  segmentBoundaryHash: 'c9b496f220f312afa540155ae80f03e2df311d502f2467dd51da835ddb32346a',
  fullRouteHash: 'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
  fullBoundaryHash: 'ea023f34cd465cb9f54944cb92822a69ed9104b9550be047d5724a33986ac915',
  westCapHash: 'a422d177fb7f1571b8a6243fcbf014fda17a910e60e7c03f7c21051f697a3e96',
  summitCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  haloHash: 'e0af06050c1878668889aa107aa13c321b8a6b37838f38dc869b3754bd352779',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: 'c35c3de3dcfa24e3f588749aef0f8bfa09e26d6e9235a0a93c1b36afb5a4deef',
  sourceCompleteSaveSha256: 'b9347e6790d14541f7b8705955382f91445db58cd81109dd9c78d09d719914f4',
  sourceRegionSha256: '10aa3bfe714a59564cb4791ab1bfd48d01d5fa2338852ab98731d159cb6799db',
  postCompleteSaveSha256: '04007781f1a59beb3889b91210536180fe7b4aa69e68e455c873b4def901a8c2',
  postRegionSha256: '811328bde5cdff2e1140b49971236c4707b99a8a27eb8b4684696d1dce479725',
  sourceBoundReleaseIdentitySha256:
    'a2488ab9923ae51a4bf1c6d53c1662025fa8640d102f356cb4f4a6efba3b6d48',
  completedReleaseIdentitySha256:
    '480473cb39bb923fa85b28d1141e6d5344fe3908fb71d9958daabf736c46e17b',
  journalSha256: '26a4ad8d632255a25bf153096da51b0badeb2888f9842b5d35723e768c82e129',
});
const EXPECTED_CHANGED_SAVE_MEMBERS = [
  'entities/r.-1.-1.mca',
  'entities/r.-1.-2.mca',
  'entities/r.-1.0.mca',
  'entities/r.0.-1.mca',
  'entities/r.0.-2.mca',
  'entities/r.0.0.mca',
  'entities/r.4.-2.mca',
  'level.dat',
  'region/r.-1.-1.mca',
  'region/r.-1.0.mca',
  'region/r.0.-1.mca',
  'region/r.3.-2.mca',
  'region/r.4.-2.mca',
];
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
  if (!condition) throw new Error(`R10F post-release QA rejected: ${message}`);
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

function connectivity(cells) {
  const remaining = new Set(cells.map(cellKey));
  const componentSizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const key = stack.pop();
      const [x, y, z] = key.split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const neighbour = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(neighbour)) stack.push(neighbour);
      }
    }
    componentSizes.push(size);
  }
  componentSizes.sort((a, b) => b - a);
  return {
    componentCount: componentSizes.length,
    largestComponentCellCount: componentSizes[0] ?? 0,
    componentSizes,
  };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(fileBinding(LEDGER_PATH).sha256 === EXPECTED.ledgerSha256,
'ledger file identity drifted');
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId,
'ledger is not the completed R10F transaction');
invariant(ledger.manifest.sha256 === EXPECTED.manifestSha256
  && fileBinding(MANIFEST_PATH).sha256 === EXPECTED.manifestSha256
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'manifest identity drifted');
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundReleaseIdentitySha256
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

const sourceMembers = new Map(sourceIntake.requiredMembers.map((entry) => [entry.path, entry]));
const postMembers = new Map(postIntake.requiredMembers.map((entry) => [entry.path, entry]));
const allMemberPaths = [...new Set([...sourceMembers.keys(), ...postMembers.keys()])].sort();
const changedSaveMembers = allMemberPaths.filter((memberPath) => (
  sourceMembers.get(memberPath)?.sha256 !== postMembers.get(memberPath)?.sha256
  || sourceMembers.get(memberPath)?.bytes !== postMembers.get(memberPath)?.bytes
));
invariant(sourceMembers.size === 130 && postMembers.size === 130
  && allMemberPaths.length === 130
  && JSON.stringify(changedSaveMembers) === JSON.stringify(EXPECTED_CHANGED_SAVE_MEMBERS)
  && changedSaveMembers.every((memberPath) => (
    sourceMembers.get(memberPath)?.stableDuringAudit === true
    && postMembers.get(memberPath)?.stableDuringAudit === true
  )), 'complete-save member-level lifecycle accounting drifted');

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
invariant(forward.length === 19 && hashCells(targets) === EXPECTED.targetHash
  && forward.every(({ fromState, toState }) => fromState === DIORITE && toState === LIGHT),
'target set or transition drifted');
invariant(rollback.length === 19 && rollback.every((operation, index) => {
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
const r07e = readJson(INPUTS.r07eManifest);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561
  && technical.deterministicGeometryContract.centerlinePointCount === 561,
'B09 centerline drifted');
const segmentPoints = centerline.slice(240, 551);
const segmentRoute = uniqueCells(segmentPoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const segmentRouteKeys = new Set(segmentRoute.map(cellKey));
const segmentBoundary = uniqueCells(segmentRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !segmentRouteKeys.has(cellKey(cell))));
const fullRoutePoints = centerline.slice(3, 561);
const fullRoute = uniqueCells(fullRoutePoints.flatMap(({ x, y, z }) => [
  { x, y, z }, { x, y: y + 1, z },
]));
const fullRouteKeys = new Set(fullRoute.map(cellKey));
const fullBoundary = uniqueCells(fullRoute.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))
)).filter((cell) => !fullRouteKeys.has(cellKey(cell))));
const fixtureIndices = Array.from({ length: 19 }, (_, index) => 255 + index * 16);
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const r10cFixtureIndices = [552, 556, 560];
const r10dFixtureIndices = [4, 7];
const r10eFixtureIndices = Array.from({ length: 15 }, (_, index) => 15 + index * 16);
const priorFixtureIndices = [...r10cFixtureIndices, ...r10dFixtureIndices, ...r10eFixtureIndices];
const priorFixtures = priorFixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const allFixtureIndices = [...priorFixtureIndices, ...fixtureIndices];
const maximumIndexDistanceToFixture = Math.max(...fullRoutePoints.map(({ index }) => (
  Math.min(...allFixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
const westCap = cellsIn(r07d.scope.geometry.westIsolationCap.bounds);
const summitExternalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const routeConnectivity = connectivity(fullRoute);
invariant(segmentRoute.length === 622 && hashCells(segmentRoute) === EXPECTED.segmentRouteHash
  && segmentBoundary.length === 1866 && hashCells(segmentBoundary) === EXPECTED.segmentBoundaryHash
  && fullRoute.length === 1116 && hashCells(fullRoute) === EXPECTED.fullRouteHash
  && fullBoundary.length === 3346 && hashCells(fullBoundary) === EXPECTED.fullBoundaryHash
  && routeConnectivity.componentCount === 1
  && routeConnectivity.largestComponentCellCount === 1116
  && hashCells(fixtures) === EXPECTED.targetHash
  && fixtures.every((cell) => segmentBoundary.some((boundary) => (
    cellKey(boundary) === cellKey(cell)
  )))
  && westCap.length === 12 && hashCells(westCap) === EXPECTED.westCapHash
  && summitExternalCap.length === 12 && hashCells(summitExternalCap) === EXPECTED.summitCapHash
  && maximumIndexDistanceToFixture === 8,
'independently derived curve/summit geometry, connectivity, or cadence drifted');

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
const sourceSegmentRoute = await records(sourceReader, segmentRoute);
const postSegmentRoute = await records(postReader, segmentRoute);
const sourceFullRoute = await records(sourceReader, fullRoute);
const postFullRoute = await records(postReader, fullRoute);
const sourceSegmentBoundary = await records(sourceReader, segmentBoundary);
const postSegmentBoundary = await records(postReader, segmentBoundary);
const sourceFullBoundary = await records(sourceReader, fullBoundary);
const postFullBoundary = await records(postReader, fullBoundary);
const sourceWestCap = await records(sourceReader, westCap);
const postWestCap = await records(postReader, westCap);
const sourceSummitCap = await records(sourceReader, summitExternalCap);
const postSummitCap = await records(postReader, summitExternalCap);
const sourcePriorFixtures = await records(sourceReader, priorFixtures);
const postPriorFixtures = await records(postReader, priorFixtures);
invariant([...sourceSegmentRoute, ...postSegmentRoute, ...sourceFullRoute, ...postFullRoute]
  .every(({ state }) => state === AIR)
  && [...sourceWestCap, ...postWestCap, ...sourceSummitCap, ...postSummitCap]
    .every(({ state }) => state === DIORITE)
  && [...sourcePriorFixtures, ...postPriorFixtures].every(({ state }) => state === LIGHT),
'route, external cap, or prior passive fixture was not preserved');
invariant(stateCensus(sourceSegmentBoundary)[DIORITE] === 1863
  && stateCensus(sourceSegmentBoundary)[AIR] === 3
  && stateCensus(postSegmentBoundary)[DIORITE] === 1844
  && stateCensus(postSegmentBoundary)[LIGHT] === 19
  && stateCensus(postSegmentBoundary)[AIR] === 3
  && stateCensus(sourceFullBoundary)[DIORITE] === 3326
  && stateCensus(sourceFullBoundary)[LIGHT] === 20
  && stateCensus(postFullBoundary)[DIORITE] === 3307
  && stateCensus(postFullBoundary)[LIGHT] === 39,
'route-boundary state census is not exact');
const segmentBoundaryDifferences = sourceSegmentBoundary.filter((record, index) => (
  record.state !== postSegmentBoundary[index].state
));
const fullBoundaryDifferences = sourceFullBoundary.filter((record, index) => (
  record.state !== postFullBoundary[index].state
));
invariant(segmentBoundaryDifferences.length === 19
  && fullBoundaryDifferences.length === 19
  && [...segmentBoundaryDifferences, ...fullBoundaryDifferences]
    .every(({ cell }) => targetKeys.has(cellKey(cell))),
'route boundary contains undeclared drift');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  })),
]));
const sourceHalo = await records(sourceReader, halo);
const postHalo = await records(postReader, halo);
const haloDifferences = sourceHalo.filter((record, index) => record.state !== postHalo[index].state);
invariant(halo.length === 133 && hashCells(halo) === EXPECTED.haloHash
  && stateCensus(sourceHalo)[AIR] === 38 && stateCensus(sourceHalo)[DIORITE] === 95
  && stateCensus(postHalo)[AIR] === 38 && stateCensus(postHalo)[DIORITE] === 76
  && stateCensus(postHalo)[LIGHT] === 19
  && haloDifferences.length === 19
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
  && differences.length === 19 && undeclaredDifferences.length === 0,
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
  && execution.successfulGroups === 19 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unexpectedNoopCommands === 0
  && execution.unknownReplyCommands === 0 && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journalSha256
  && execution.streamJournalSha256 === EXPECTED.journalSha256
  && journal.length === 44
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 19,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 19
  && rollbackPreflight.passed === 19 && rollbackPreflight.failed === 0,
'rollback post-state preflight is not 19/19 PASS');
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
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 19
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R10F-P1-B09-CURVE-SUMMIT-PASSIVE-WAYFINDING-POST-QA',
  status: 'PASS_EXACT_CURVE_SUMMIT_WAYFINDING_COMPLETE_ROUTE_CAPS_AND_PRIOR_FIXTURES_PRESERVED',
  generatedAtUtc: value('--generated-at', '2026-08-22T00:45:00Z'),
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
    maximumCompleteRouteIndexDistanceToAcceptedFixture: maximumIndexDistanceToFixture,
    maximumNewFixtureSpacingInIndices: 16,
  },
  preservation: {
    segmentRouteCellCount: segmentRoute.length,
    segmentRouteCoordinateSetSha256: hashCells(segmentRoute),
    sourceSegmentRouteAirPassCount: sourceSegmentRoute.filter(({ state }) => state === AIR).length,
    postSegmentRouteAirPassCount: postSegmentRoute.filter(({ state }) => state === AIR).length,
    completeRouteCellCount: fullRoute.length,
    completeRouteCoordinateSetSha256: hashCells(fullRoute),
    completeRouteComponentCount: routeConnectivity.componentCount,
    completeRouteLargestComponentCellCount: routeConnectivity.largestComponentCellCount,
    sourceCompleteRouteAirPassCount: sourceFullRoute.filter(({ state }) => state === AIR).length,
    postCompleteRouteAirPassCount: postFullRoute.filter(({ state }) => state === AIR).length,
    segmentBoundaryCellCount: segmentBoundary.length,
    segmentBoundaryCoordinateSetSha256: hashCells(segmentBoundary),
    sourceSegmentBoundaryStateCensus: stateCensus(sourceSegmentBoundary),
    postSegmentBoundaryStateCensus: stateCensus(postSegmentBoundary),
    segmentBoundaryDeclaredDifferenceCount: segmentBoundaryDifferences.length,
    segmentBoundaryUndeclaredDifferenceCount: 0,
    completeBoundaryCellCount: fullBoundary.length,
    completeBoundaryCoordinateSetSha256: hashCells(fullBoundary),
    sourceCompleteBoundaryStateCensus: stateCensus(sourceFullBoundary),
    postCompleteBoundaryStateCensus: stateCensus(postFullBoundary),
    completeBoundaryDeclaredDifferenceCount: fullBoundaryDifferences.length,
    completeBoundaryUndeclaredDifferenceCount: 0,
    retainedB08WestCapCellCount: westCap.length,
    retainedB08WestCapCoordinateSetSha256: hashCells(westCap),
    retainedSummitExternalCapCellCount: summitExternalCap.length,
    retainedSummitExternalCapCoordinateSetSha256: hashCells(summitExternalCap),
    r10cFixturePreservedCount: r10cFixtureIndices.length,
    r10dFixturePreservedCount: r10dFixtureIndices.length,
    r10eFixturePreservedCount: r10eFixtureIndices.length,
    priorFixturePreservedCount: priorFixtures.length,
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
    summitExternalInterfaceOpened: false,
  },
  completeSaveDiffAccounting: {
    requiredMemberCount: allMemberPaths.length,
    unchangedMemberCount: allMemberPaths.length - changedSaveMembers.length,
    changedMemberCount: changedSaveMembers.length,
    changedMemberPaths: changedSaveMembers,
    targetRegionMember: 'region/r.4.-2.mca',
    targetRegionMemberIncluded: changedSaveMembers.includes('region/r.4.-2.mca'),
    nonTargetSaveLifecycleMemberCount: changedSaveMembers.length - 1,
    changedPoiMemberCount: changedSaveMembers.filter((entry) => entry.startsWith('poi/')).length,
    completeSaveMemberChangesDoNotAuthorizeUndeclaredBlockMutation: true,
    exactB09BlockDomainUndeclaredDifferenceCount: undeclaredDifferences.length,
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
    acceptedScope: 'nineteen full-cube passive B09 curve/summit ceiling wayfinding fixtures only',
    completeConnectedRouteAndBoundaryPreserved: true,
    bothExternalCapsRemainFailClosed: true,
    priorR10cR10dR10eFixturesPreserved: true,
    photometricEmergencyOrLifeSafetyLightingCommissioned: false,
    railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
    funicularCommissioned: false,
    pedestrianRouteCommissioned: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  summary: { checkCount: 16, passCount: 16, failCount: 0, passed: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(evidenceDirectory, 'r10f-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r10f-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R10F B09 curve/summit passive wayfinding post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All 19 exact R07I ceiling cells transitioned from polished diorite to sea `
  + `lantern. Together with the 20 accepted R10C/R10D/R10E fixtures, every `
  + `complete-route centerline index remains within eight indices of a fixture.\n\n`
  + `The complete 1,116-cell B09 route remains one connected air component. Its `
  + `3,346-cell boundary is exact: 3,307 polished-diorite cells and 39 accepted `
  + `fixtures. The 12-cell B08 cap and 12-cell exterior Z11 summit cap remain `
  + `fail-closed. All prior R10C/R10D/R10E fixtures are preserved.\n\n`
  + `The 133-cell halo and complete 7,800-cell B09 accommodation each contain `
  + `exactly 19 declared differences and zero undeclared drift. All 7,781 B09 `
  + `non-target cells are preserved.\n\n`
  + `Both complete-save inventories contain 130 stable members. Thirteen member `
  + `hashes changed between captures, including the owned target region; 117 `
  + `members are identical and no POI member changed. This member-level save `
  + `lifecycle accounting does not authorize undeclared block mutation; the exact `
  + `B09 block domain has zero undeclared differences.\n\n`
  + `All 17 wrapper stages and 17 evidence bindings pass. The 44-entry journal `
  + `ends complete and cleaned after 19 successful groups. Exact rollback `
  + `preflight passes 19/19.\n\n`
  + `Acceptance is limited to passive visual wayfinding. Both external interfaces `
  + `remain closed, and no photometric/emergency/life-safety lighting, rail, drive, `
  + `brake, vehicle, controls, power, drainage, funicular, or pedestrian route is `
  + `commissioned. This verifier made no live call and no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  targetPass: report.exactPostState.exactTransitionPassCount,
  routeAir: report.preservation.postCompleteRouteAirPassCount,
  routeComponents: report.preservation.completeRouteComponentCount,
  priorFixturesPreserved: report.preservation.priorFixturePreservedCount,
  undeclaredB09Drift: report.preservation.undeclaredB09DifferenceCount,
  changedSaveMembers: report.completeSaveDiffAccounting.changedMemberCount,
  stagePass: report.evidence.requiredStagePassCount,
  journalEntries: report.execution.streamJournalEntryCount,
  liveCallsPerformed: false,
}, null, 2));
