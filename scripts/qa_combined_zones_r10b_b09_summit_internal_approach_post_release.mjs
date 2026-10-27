#!/usr/bin/env node
/** Read-only independent post-release QA for CZ-R10B. */

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
  'data/world-review/combined-zones-r10b-live-20260821T230936Z/evidence-ledger.json',
);
const MANIFEST_PATH =
  'data/buildops/combined-zones-r10b-b09-summit-internal-approach.release-manifest.json';
const PACKAGE_KEY = 'b09-summit-internal-approach-aperture';
const INPUTS = Object.freeze({
  technical: 'docs/masterplans/05-combined-zones/phase1-b09-funicular-technical-system.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  d05: 'docs/masterplans/05-combined-zones/phase1-d05-future-mountain-alternatives.json',
  r07eManifest: 'data/buildops/combined-zones-r07e-b09-summit-headhouse-shell.release-manifest.json',
});
const EXPECTED = Object.freeze({
  manifestSha256: '0afc5608b73ac59ac44425a16195cd2c603e8a068c67d1140f02faaa115777d5',
  manifestIdentity: '4de9770f03590755ffb07b51af219ef6d34fdf7a0a12f0da8990af802beaf975',
  forwardFileSha256: '3da8cd4753da75837ccd20fe96ec8c3c1601ac3aee51c61c11845a99ee76024a',
  rollbackFileSha256: '1369711bed026e5276233fa410548b697c65a72a0972d01c47808c856dd5af6a',
  targetHash: '8100289cadea36a33df57d789c17b6972124bdc65101ffa2dc439967c8ba8f75',
  routeHash: '2f808ddc7b077a2b256c56b96ba90631c0a94d26ac2b18b8e2da5e5660016855',
  summitInteriorHash: '771f8df9ee84b79c8ed5e5b2d2e1c6c828915d8d77102ea3b6d60230e681e72d',
  connectedVoidHash: 'c0e162baf89a1e57db122facfaed2d11ea7ca3263716841caeb8684b8297c4b6',
  approachCollarHash: '0f53c2e23365f1cec787382867b16d9d67b5b10c93dceba1dc60266e1cbdb624',
  externalCapHash: 'd1d52260f2285abff8bbb97c56a1bd738eb78d6a54abcec6567e8d0b55260093',
  b09Hash: 'e9e2e116f363e999151a41e4fee2ef32d2f96c1184f6432128ff31e8d9a118ca',
  sourceCompleteSaveSha256: 'e951f1c7d29f1dadee5e2ed80ad8762657f24d2ca737efb7ea7f492e50948a76',
  postCompleteSaveSha256: 'e77efef8ec56286435edce99986425028176d40b4737259e4bfc60d1c01eab80',
  postRegionSha256: 'a693c537107f172adeb54e170f20448c26c783484a9affc1c0426c12eabb9138',
  completedReleaseIdentitySha256: '3694fbd41a7312501e54940f7d46a362219706a6759950fa2d1f539963bf7474',
});
const AIR = 'minecraft:air';
const DIORITE = 'minecraft:polished_diorite';
const FACE_NEIGHBOURS = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0],
  [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R10B post-release QA rejected: ${message}`);
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

function connectedComponents(cells) {
  const remaining = new Set(cells.map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const pending = [first];
    let size = 0;
    while (pending.length) {
      const [x, y, z] = pending.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE_NEIGHBOURS) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) pending.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, componentSizes: sizes };
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
  return points;
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === manifest.transactionId,
'ledger is not the completed R10B transaction');
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
invariant(forward.length === 2
  && hashCells(targets) === EXPECTED.targetHash
  && forward.every(({ fromState, toState }) => fromState === DIORITE && toState === AIR),
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
const r07e = readJson(INPUTS.r07eManifest);
const model = d05.alternatives.find(({ modelId }) => modelId === 'FM-01-COMPACT-EAST-FACE');
const endpoints = connectors.funicularFaceComparison.designEndpoints;
const centerline = buildCenterline(model.formula, endpoints);
invariant(centerline.length === 561, 'independent B09 centerline length drifted');
const routeSeeds = uniqueCells(centerline.slice(240, 551)
  .flatMap(({ x, y, z }) => [{ x, y, z }, { x, y: y + 1, z }]));
const priorStraight = cellsIn({
  minX: 2051, maxX: 2287, minY: 130, maxY: 131, minZ: -748, maxZ: -748,
});
const guideway = uniqueCells([...priorStraight, ...routeSeeds]);
const summitInterior = [];
for (let offset = 8; offset >= 0; offset -= 1) {
  for (let dy = 0; dy <= 1; dy += 1) {
    summitInterior.push({
      x: endpoints.to.x,
      y: endpoints.to.y - offset + dy,
      z: endpoints.to.z + offset,
    });
  }
}
const seam = cellsIn({ minX: 2048, maxX: 2048, minY: 295, maxY: 296, minZ: -819, maxZ: -819 });
const seamKeys = new Set(seam.map(cellKey));
const approachCap = cellsIn(r07e.scope.geometry.guidewayApproachCap.bounds);
const approachCollar = approachCap.filter((cell) => !seamKeys.has(cellKey(cell)));
const externalCap = cellsIn(r07e.scope.geometry.summitInterfaceCap.bounds);
const withoutSeam = uniqueCells([...guideway, ...summitInterior]);
const connectedVoid = uniqueCells([...withoutSeam, ...seam]);
invariant(guideway.length === 1096 && hashCells(guideway) === EXPECTED.routeHash
  && summitInterior.length === 18 && hashCells(summitInterior) === EXPECTED.summitInteriorHash
  && hashCells(seam) === EXPECTED.targetHash
  && approachCollar.length === 10 && hashCells(approachCollar) === EXPECTED.approachCollarHash
  && externalCap.length === 12 && hashCells(externalCap) === EXPECTED.externalCapHash,
'independently derived B09 interface geometry drifted');
const negativeConnectivity = connectedComponents(withoutSeam);
const projectedConnectivity = connectedComponents(connectedVoid);
invariant(negativeConnectivity.componentCount === 2
  && negativeConnectivity.componentSizes.join(',') === '1096,18'
  && connectedVoid.length === 1116
  && hashCells(connectedVoid) === EXPECTED.connectedVoidHash
  && projectedConnectivity.componentCount === 1
  && projectedConnectivity.componentSizes[0] === 1116,
'the exact seam does not produce the required one-component internal void');

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
    transitionFailures.push({
      cell: operation.cell,
      expectedSource: operation.fromState,
      actualSource: sourceState,
      expectedPost: operation.toState,
      actualPost: postState,
    });
  }
}
invariant(transitionFailures.length === 0, 'one or more exact target transitions failed');
const postVoid = await records(postReader, connectedVoid);
invariant(postVoid.every(({ state }) => state === AIR), 'connected internal void is not exact air');
const sourceCollar = await records(sourceReader, approachCollar);
const postCollar = await records(postReader, approachCollar);
const sourceExternalCap = await records(sourceReader, externalCap);
const postExternalCap = await records(postReader, externalCap);
invariant([...sourceCollar, ...postCollar, ...sourceExternalCap, ...postExternalCap]
  .every(({ state }) => state === DIORITE),
'approach collar or exterior Z11 cap was not preserved polished diorite');

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
    if (!seamKeys.has(cellKey(accommodation[index]))) undeclaredDifferences.push(difference);
  }
}
invariant(differences.length === 2 && undeclaredDifferences.length === 0,
'B09 accommodation contains undeclared source-to-post drift');

const evidenceDirectory = path.dirname(LEDGER_PATH);
const execution = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-execution.json`));
const sourcePreflight = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.forward-source-preflight.json`));
const projectedRollback = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.projected-rollback-preflight.json`));
const rollbackPreflight = readJson(path.join(evidenceDirectory, `${PACKAGE_KEY}.rollback-poststate-preflight.json`));
invariant(execution.status === 'complete'
  && execution.dryRun === false
  && execution.strictNoop === true
  && execution.operationRole === 'forward'
  && execution.successfulGroups === 2
  && execution.failedGroups === 0
  && execution.noopCommands === 0
  && execution.unknownReplyCommands === 0
  && execution.worldEditLeftoverCount === 0
  && execution.forceLoadAudit?.allTemporaryReleased === true
  && execution.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
'strict execution evidence is incomplete or unsafe');
for (const [name, report] of [
  ['source preflight', sourcePreflight],
  ['projected rollback', projectedRollback],
  ['post-state rollback', rollbackPreflight],
]) {
  invariant(report.status === 'PASS' && report.operationCount === 2
    && report.passed === 2 && report.failed === 0,
  `${name} is not 2/2 PASS`);
}
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
  && requiredStages.every((stage) => (
    ledger.stages.some((entry) => entry.stage === stage && entry.status === 'PASS')
  )), 'wrapper is not an exact 17/17 PASS');
const manifestQa = readJson(path.join(evidenceDirectory, 'exact-release-manifest-qa.json'));
const blockEntity = readJson(path.join(evidenceDirectory, 'block-entity-clearance.json'));
const liveEntity = readJson(path.join(evidenceDirectory, 'live-entity-clearance.json'));
const sameMomentEntity = readJson(path.join(evidenceDirectory,
  `${PACKAGE_KEY}.same-moment-entity-clearance.json`));
invariant(manifestQa.status === 'PASS' && manifestQa.totals.uniqueTargetCells === 2
  && blockEntity.status === 'PASS' && blockEntity.blockingBlockEntityCount === 0
  && liveEntity.status === 'PASS' && liveEntity.totals.blockingEntityHits === 0
  && sameMomentEntity.status === 'PASS' && sameMomentEntity.totals.blockingEntityHits === 0,
'manifest, block-entity, or live-entity evidence is not PASS');

const reportWithoutIdentity = {
  schemaVersion: 1,
  qaId: 'CZ-R10B-P1-B09-SUMMIT-INTERNAL-APPROACH-POST-QA',
  status: 'PASS_EXACT_INTERNAL_SEAM_CONNECTED_EXTERNAL_CAP_RETAINED_REVERSIBLE',
  generatedAtUtc: value('--generated-at', '2026-08-21T23:20:00Z'),
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
    desiredState: AIR,
  },
  connectivity: {
    acceptedGuidewayCellCount: guideway.length,
    acceptedSummitInteriorCellCount: summitInterior.length,
    withoutSeam: negativeConnectivity,
    connectedVoidCellCount: connectedVoid.length,
    connectedVoidCoordinateSetSha256: hashCells(connectedVoid),
    withSeam: projectedConnectivity,
    postAirPassCount: postVoid.filter(({ state }) => state === AIR).length,
    postAirFailureCount: postVoid.filter(({ state }) => state !== AIR).length,
  },
  preservation: {
    retainedApproachCollarCellCount: approachCollar.length,
    retainedApproachCollarCoordinateSetSha256: hashCells(approachCollar),
    retainedExternalZ11CapCellCount: externalCap.length,
    retainedExternalZ11CapCoordinateSetSha256: hashCells(externalCap),
    b09AccommodationCellCount: accommodation.length,
    b09AccommodationCoordinateSetSha256: hashCells(accommodation),
    sourceB09StateSetSha256: stateSetHash(sourceB09),
    postB09StateSetSha256: stateSetHash(postB09),
    declaredDifferenceCount: differences.length,
    undeclaredDifferenceCount: undeclaredDifferences.length,
    preservedNonTargetB09CellCount: accommodation.length - differences.length,
    externalZ11InterfaceOpened: false,
    activeMechanismChanged: false,
  },
  execution: {
    strictForwardGroupPassCount: execution.successfulGroups,
    failedGroupCount: execution.failedGroups,
    noOpCount: execution.noopCommands,
    unknownReplyCount: execution.unknownReplyCommands,
    worldEditLeftoverCount: execution.worldEditLeftoverCount,
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
    acceptedScope: 'static two-cell internal B09 summit threshold only',
    externalZ11CapRemainsFailClosed: true,
    railDriveBrakeVehicleControlsPowerDrainageRemainDeferred: true,
    funicularCommissioned: false,
    pedestrianRouteCommissioned: false,
    liveCallsPerformedByQa: false,
    worldMutationsPerformedByQa: false,
  },
  summary: { checkCount: 12, passCount: 12, failCount: 0, passed: true },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
const out = value('--out', path.join(evidenceDirectory, 'r10b-post-release-qa.json'));
const markdownOut = value('--markdown', path.join(evidenceDirectory, 'r10b-post-release-qa.md'));
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(markdownOut), `# CZ-R10B B09 summit internal approach post-release QA\n\n`
  + `**Status:** PASS  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`  \n`
  + `**Completed release:** \`${ledger.completedReleaseIdentitySha256}\`\n\n`
  + `The immutable post snapshot contains both exact seam cells as air. The accepted `
  + `1,096-cell guideway, 18-cell summit interior, and two-cell seam form one exact `
  + `1,116-cell air component. Without the seam, the two accepted voids remain separate `
  + `components of 1,096 and 18 cells.\n\n`
  + `All ten retained approach-collar cells and all 12 exterior Z11 cap cells remain `
  + `polished diorite. Across the complete 7,800-cell B09 accommodation, the only `
  + `source-to-post differences are the two declared seam cells; 7,798 non-target cells `
  + `are preserved.\n\n`
  + `All 17 wrapper stages pass, every ledger evidence binding is intact, strict execution `
  + `changed 2/2 groups with zero failure or no-op, and the exact rollback preflight passes `
  + `2/2. The exterior interface remains fail-closed and no rail, drive, brake, vehicle, `
  + `controls, power, drainage, funicular operation, or pedestrian route is commissioned.\n\n`
  + `This verifier made no live call and performed no world mutation.\n`);
console.log(JSON.stringify({
  status: report.status,
  qaPayloadSha256,
  output: relative(out),
  markdown: relative(markdownOut),
  targetPass: report.exactPostState.exactTransitionPassCount,
  connectedVoid: report.connectivity.connectedVoidCellCount,
  undeclaredB09Drift: report.preservation.undeclaredDifferenceCount,
  stagePass: report.evidence.requiredStagePassCount,
  liveCallsPerformed: false,
}, null, 2));
