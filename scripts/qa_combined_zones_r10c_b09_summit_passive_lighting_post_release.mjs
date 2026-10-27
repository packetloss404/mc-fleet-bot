#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R10C. */

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
  'data/world-review/combined-zones-r10c-live-20260821T233530Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r10c-b09-summit-passive-lighting.release-manifest.json';
const PACKAGE_KEY = 'b09-summit-passive-ceiling-lights';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
  r10bManifest: 'data/buildops/combined-zones-r10b-b09-summit-internal-approach.release-manifest.json',
});
const EXPECTED = Object.freeze({
  manifestSha256: 'f0141a2f4d4c94f51aa8ec992b60cdfb82797efdd1c917741618c79971901698',
  manifestIdentity: 'bee65eec948fcb5c889d0398e3ea835d23b892ab33514f0c7412ebb1ec7e0144',
  forwardFileSha256: '5f89b8cd779528896f5c3d65e117385d0352444c371fed3779c89d8bd8d8d132',
  rollbackFileSha256: '288c1d10e41073dc111922e7bc9db8f95c6d077ae99a0521d680e1896e844d5e',
  targetHash: 'b06b4450bff0ddef846731cdad037966d32b4ff9819763cf93015a805e10bfe6',
  summitInteriorHash: '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  summitShellHash: '8f1cd67b0d08e1f986c21067af7ba50e1c4f3e8daa52c703309c5734d0979592',
  approachCollarHash: '0f53c2e23365f1cec787382867b16d9d67b5b10c93dceba1dc60266e1cbdb624',
  externalCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceB09StateHash: '23f8adaf3b2035ef88d1445168783f1a60f615597483e061768f4ce2c024c873',
  sourceCompleteSaveSha256: 'e317222a820f53b2f04fdd63028228a616f6dfa1b44691de5873d3eddd758bfb',
  postCompleteSaveSha256: 'e2ff106a2fc19ae8a175dc31e646eb4cd8e85ff8c5262e98ce0faecbde81b2d7',
  postRegionSha256: '3a9089869493c48a0f9dea501044b88c6bc5c271c82a03d3517e4bbd5bc46986',
  completedReleaseIdentitySha256: 'e3ac73231d641952e4c4bae22f5f54173626b15ee26dfbf2841bf9e776c3eb14',
  journalSha256: '222f3cb3037d358f29a19656cf49d1975994fdd9bf33f7b215857bcf9dae6f7f',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const LIGHT = 'minecraft:sea_lantern';
const FACE_NEIGHBOURS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10C post-release QA rejected: ${message}`);
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
  for (let d = 0; d <= faceRun; d += 1) points.push({ x: portal.x + d, y: portal.y, z: portal.z });
  for (let offset = 1; offset <= portal.z - climbZ; offset += 1) points.push({ x: throatX, y: portal.y, z: portal.z - offset });
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
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId,
'ledger is not the completed R10C transaction');
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
invariant(postIdentity.sha256 === EXPECTED.postRegionSha256, 'post region identity drifted');
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
invariant(forward.length === 3 && hashCells(targets) === EXPECTED.targetHash
  && forward.every(({ fromState, toState }) => fromState === DIORITE && toState === LIGHT),
'target set or transition drifted');
invariant(rollback.length === 3 && rollback.every((operation, index) => {
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
const r07e = readJson(INPUTS.r07eManifest);
const r10b = readJson(INPUTS.r10bManifest);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561 && technical.deterministicGeometryContract.centerlinePointCount === 561,
'B09 centerline drifted');
const stationPoints = centerline.slice(552, 561);
const railDatum = stationPoints.map(({ x, y, z }) => ({ x, y, z }));
const headroom = stationPoints.map(({ x, y, z }) => ({ x, y: y + 1, z }));
const summitInterior = uniqueCells([...railDatum, ...headroom]);
const summitShell = dilateCells(summitInterior, 1)
  .filter((cell) => !new Set(summitInterior.map(cellKey)).has(cellKey(cell)));
const fixtureIndices = [552, 556, 560];
const fixtures = fixtureIndices.map((index) => {
  const { x, y, z } = centerline[index];
  return { x, y: y + 2, z };
});
const approachCap = cellsIn(r07e.scope.geometry.guidewayApproachCap.bounds);
const internalSeam = cellsIn(r10b.scope.geometry.ownedInternalSeam.bounds);
const seamKeys = new Set(internalSeam.map(cellKey));
const approachCollar = approachCap.filter((cell) => !seamKeys.has(cellKey(cell)));
const externalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const interiorKeys = new Set(summitInterior.map(cellKey));
const enclosureFaceBoundary = uniqueCells(summitInterior.flatMap((cell) => (
  FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz }))
)).filter((cell) => !interiorKeys.has(cellKey(cell))));
invariant(summitInterior.length === 18 && hashCells(summitInterior) === EXPECTED.summitInteriorHash
  && summitShell.length === 162 && hashCells(summitShell) === EXPECTED.summitShellHash
  && hashCells(fixtures) === EXPECTED.targetHash
  && approachCollar.length === 10 && hashCells(approachCollar) === EXPECTED.approachCollarHash
  && externalCap.length === 12 && hashCells(externalCap) === EXPECTED.externalCapHash
  && enclosureFaceBoundary.length === 58
  && enclosureFaceBoundary.every((cell) => summitShell.some((shell) => cellKey(shell) === cellKey(cell)))
  && fixtures.every((cell) => enclosureFaceBoundary.some((boundary) => cellKey(boundary) === cellKey(cell))),
'independently derived summit geometry drifted');
const maximumIndexDistanceToFixture = Math.max(...stationPoints.map(({ index }) => (
  Math.min(...fixtureIndices.map((fixtureIndex) => Math.abs(index - fixtureIndex)))
)));
invariant(maximumIndexDistanceToFixture === 2, 'fixture cadence drifted');

const sourceReader = new AnvilReader(absolute(ledger.sourceSnapshot.regions));
const postReader = new AnvilReader(absolute(ledger.postSnapshot.regions));
async function readState(reader, cell) {
  return stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
}
async function records(reader, cells) {
  const output = [];
  for (const cell of uniqueCells(cells)) output.push({ cell, state: await readState(reader, cell) });
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
const sourceInterior = await records(sourceReader, summitInterior);
const postInterior = await records(postReader, summitInterior);
const sourceCollar = await records(sourceReader, approachCollar);
const postCollar = await records(postReader, approachCollar);
const sourceInternalSeam = await records(sourceReader, internalSeam);
const postInternalSeam = await records(postReader, internalSeam);
const sourceExternalCap = await records(sourceReader, externalCap);
const postExternalCap = await records(postReader, externalCap);
invariant([...sourceInterior, ...postInterior].every(({ state }) => state === AIR)
  && internalSeam.length === 2
  && [...sourceInternalSeam, ...postInternalSeam].every(({ state }) => state === AIR)
  && [...sourceCollar, ...postCollar, ...sourceExternalCap, ...postExternalCap]
    .every(({ state }) => state === DIORITE),
'route void, approach collar, or exterior cap was not preserved');
const sourceShell = await records(sourceReader, summitShell);
const postShell = await records(postReader, summitShell);
invariant(sourceShell.every(({ cell, state }) => (
  seamKeys.has(cellKey(cell)) ? state === AIR : state === DIORITE
))
  && postShell.every(({ cell, state }) => (
    targetKeys.has(cellKey(cell)) ? state === LIGHT
      : seamKeys.has(cellKey(cell)) ? state === AIR : state === DIORITE
  )), 'summit enclosure is not the exact 157-diorite/3-sea-lantern/2-owned-seam shell');

const halo = uniqueCells(fixtures.flatMap((cell) => [
  cell,
  ...FACE_NEIGHBOURS.map(([dx, dy, dz]) => ({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz })),
]));
const sourceHalo = await records(sourceReader, halo);
const postHalo = await records(postReader, halo);
const haloDifferences = sourceHalo.filter((record, index) => record.state !== postHalo[index].state);
invariant(halo.length === 21 && haloDifferences.length === 3
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
  && differences.length === 3 && undeclaredDifferences.length === 0,
'B09 accommodation contains undeclared source-to-post drift');

const evidenceDirectory = path.dirname(LEDGER_PATH);
const execution = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-execution.json`));
const rollbackPreflight = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.rollback-poststate-preflight.json`));
const journalPath = `${path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-execution.json`)}.stream-journal.jsonl`;
const journalBinding = fileBinding(journalPath);
const journal = fs.readFileSync(absolute(journalPath), 'utf8').trim().split(/\r?\n/)
  .map((line) => JSON.parse(line));
invariant(execution.status === 'complete' && execution.dryRun === false
  && execution.strictNoop === true && execution.operationRole === 'forward'
  && execution.successfulGroups === 3 && execution.failedGroups === 0
  && execution.noopCommands === 0 && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
invariant(journalBinding.sha256 === EXPECTED.journalSha256
  && execution.streamJournalSha256 === EXPECTED.journalSha256
  && journal.length === 12
  && journal.every((entry, index) => entry.sequence === index + 1)
  && journal.at(-1).status === 'complete'
  && journal.at(-1).batch.status === 'completed-cleaned'
  && journal.at(-1).batch.completedGroupCount === 3,
'stream journal is incomplete or identity-drifted');
invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.operationCount === 3
  && rollbackPreflight.passed === 3 && rollbackPreflight.failed === 0,
'rollback post-state preflight is not 3/3 PASS');
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
const sameMomentEntity = readJson(path.join(evidenceDirectory,
  `${PACKAGE_KEY}.same-moment-entity-clearance.json`));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 3
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R10C-P1-B09-SUMMIT-PASSIVE-LIGHTING-POST-QA',
  status: 'PASS_EXACT_PASSIVE_FIXTURES_ENCLOSURE_AND_CAPS_PRESERVED_REVERSIBLE',
  generatedAtUtc: value('--generated-at', '2026-08-21T23:45:00Z'),
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
    summitInteriorCellCount: summitInterior.length,
    summitInteriorCoordinateSetSha256: hashCells(summitInterior),
    sourceInteriorAirPassCount: sourceInterior.filter(({ state }) => state === AIR).length,
    postInteriorAirPassCount: postInterior.filter(({ state }) => state === AIR).length,
    summitShellCellCount: summitShell.length,
    summitShellCoordinateSetSha256: hashCells(summitShell),
    enclosureFaceBoundaryCellCount: enclosureFaceBoundary.length,
    retainedOwnedInternalSeamCellCount: internalSeam.length,
    retainedOwnedInternalSeamCoordinateSetSha256: hashCells(internalSeam),
    sourceShellStateCensus: stateCensus(sourceShell),
    postShellStateCensus: stateCensus(postShell),
    retainedApproachCollarCellCount: approachCollar.length,
    retainedApproachCollarCoordinateSetSha256: hashCells(approachCollar),
    retainedExternalZ11CapCellCount: externalCap.length,
    retainedExternalZ11CapCoordinateSetSha256: hashCells(externalCap),
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
    externalZ11InterfaceOpened: false,
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
    acceptedScope: 'three full-cube passive summit-headhouse ceiling fixtures only',
    routeClearanceAndEnclosurePreserved: true,
    externalZ11CapRemainsFailClosed: true,
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
const out = value('--out', path.join(evidenceDirectory, 'r10c-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r10c-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R10C B09 summit passive lighting post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `All three exact R07E ceiling cells transitioned from polished diorite to sea `
  + `lantern. The 18-cell summit rail/headroom void remains air. The 162-cell `
  + `enclosure is exact: 157 polished-diorite cells, three full-cube fixtures, and `
  + `the two-cell R10B owned internal seam remains air. All ten approach-collar and `
  + `12 exterior Z11 cap cells remain polished diorite.\n\n`
  + `The 21-cell fixture halo has exactly three declared differences and zero `
  + `undeclared drift. Across the complete 7,800-cell B09 accommodation, exactly `
  + `three declared cells differ and all 7,797 non-target cells are preserved.\n\n`
  + `All 17 wrapper stages and 17 evidence bindings pass. The 12-entry journal ends `
  + `complete and cleaned after three successful groups. Exact rollback preflight `
  + `passes 3/3.\n\n`
  + `Acceptance is limited to passive visual fixtures. The exterior cap remains `
  + `fail-closed, and no photometric/emergency lighting, rail, drive, brake, vehicle, `
  + `controls, power, drainage, funicular, or pedestrian route is commissioned. This `
  + `verifier made no live call and performed no world mutation.\n`);
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
