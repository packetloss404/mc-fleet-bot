#!/usr/bin/env node
/**
 * Read-only post-release QA/seal for CZ-R11B C1 west highway extension.
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
const GENERATED_AT = value('--generated-at', '2026-08-21T17:40:00Z');
const EVIDENCE_DIR = value(
  '--evidence-dir',
  'data/world-review/combined-zones-r11b-live-20260821T173605Z',
);
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value(
  '--manifest',
  'data/buildops/combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
);
const POST_ROOT = value(
  '--post-root',
  'data/worldsnap-combined-zones-r11b-post-20260821T173605Z',
);
const POST_INTAKE_PATH = value(
  '--post-intake',
  path.join(EVIDENCE_DIR, 'post-complete-save-intake.json'),
);
const OUT_PATH = value('--out', path.join(EVIDENCE_DIR, 'r11b-post-release-qa.json'));
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r11b-post-release-qa.md'));

const BASENAME = 'combined-zones-r11b-c1-west-highway-extension';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const STABILIZATION_KEY = 'c1-west-gravity-stabilization';
const EXTENSION_KEY = 'c1-west-highway-extension';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const EXPECTED = Object.freeze({
  manifestIdentity: '92c8cd51eb303e40780a3d8714304815fd54fba693e3728f19cd16eb907f9f99',
  sourceSave: '120b79fc9b40faa026d73115fa68c4ce3c9d3dcfdc19565a5cf4cd18dc6daa9d',
  postSave: '857271dc24e4558a28e647c83f006744785d73fb45614b1c3c6c72c43b6f9757',
  sourceRegion: 'b1051bda3dc1eb77ea468a1963db97f6163bbd2c8f85e72d328bc43bc48f2b1a',
  postRegion: '7b3db9b0148f65fdc5f4c487f4df5d6c9471b28ce84849b8f1d4378928da72fa',
  completedRelease: '0529a5ffb29f00cdf1060bf2e9f51e402d0191953ac7b22a381f85b34dc0c8bc',
  executionBinding: '5d16146592fea7c6330b71c2179d6aed7ef72cc8b19007256b1a859f6203ebea',
  ledgerSha256: '756534ed19b98a3b68a5b8f9cda4f099e616c23de6030908bb02e79a3ff3d849',
  evidenceBindingCount: 25,
  stageCount: 24,
  r11aSurfaceCount: 109,
  r11aSurfaceHash: '67c334af780bdaf20db92267c5697cd601dcf85d05b31d7bad1d589b46661f16',
  r11bSurfaceCount: 164,
  r11bSurfaceHash: 'e48819e8b7e60794cf8707c4073749ab4d79a588a20f4f1ebcd811d507bd9bc1',
  candidateSurfaceCount: 184,
  inheritedFunctionalCount: 20,
  foundationCount: 31,
  foundationHash: '71d38bd9bbaaa517f19d4e036c373faebc734524640fa027c8f9ab690426b574',
  stabilizationCount: 3,
  stabilizationHash: '4f235d6c0198856e1a968519433925cfdf6ac6bd386e54b29e679cad067409db',
  extensionCount: 485,
  operatedCount: 488,
  operatedHash: '36473b2e69b1e4ca5100060ae2b3493ae5981efc8d0b85122d48ce6a026c73ee',
  newHeadroomCount: 328,
  r11aHeadroomCount: 218,
  seamPairCount: 94,
  gravityHaloCount: 25,
  residualGravityCount: 22,
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
  if (!condition) throw new Error('R11B post-release QA rejected: ' + message);
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

function deriveSurface(c1, startStation, endStation) {
  const stations = c1.horizontalAlignment.stations;
  const columns = new Map();
  for (let station = startStation; station <= endStation; station += 1) {
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

function surfaceTarget(offset) {
  if (offset <= -12 || offset >= 12) return 'minecraft:smooth_stone';
  if (offset >= -1 && offset <= 1) return 'minecraft:yellow_concrete';
  return 'minecraft:gray_concrete';
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
'ledger scope does not match R11B');
invariant(samePath(ledger.manifest.path, MANIFEST_PATH)
  && ledger.manifest.sha256 === manifestBinding.sha256
  && ledger.manifest.bytes === manifestBinding.bytes,
'ledger manifest binding drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(manifest.manifestIdentity === sha256(JSON.stringify(manifestPayload))
  && manifest.manifestIdentity === EXPECTED.manifestIdentity,
'release manifest identity drifted');
invariant(ledgerBinding.sha256 === EXPECTED.ledgerSha256
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding,
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
const sourceIdentityPath = ledger.sourceSnapshot.identity.path;
const sourceIdentityBinding = fileBinding(sourceIdentityPath);
const sourceIdentity = readJson(sourceIdentityPath);
invariant(ledger.sourceSnapshot.identity.sha256 === sourceIdentityBinding.sha256
  && samePath(sourceIdentity.directory, path.join(ledger.sourceSnapshot.root, 'region'))
  && sourceIdentity.sha256 === EXPECTED.sourceRegion,
'source region identity drifted');
const expectedStageOrder = [
  'standing-authorization',
  'exact-release-manifest-qa',
  'fresh-source-complete-save',
  'source-complete-save-intake',
  'source-snapshot-identity',
  'forward-source-preflight:' + STABILIZATION_KEY,
  'strict-forward-parser-check:' + STABILIZATION_KEY,
  'strict-rollback-parser-check:' + STABILIZATION_KEY,
  'forward-source-preflight:' + EXTENSION_KEY,
  'strict-forward-parser-check:' + EXTENSION_KEY,
  'strict-rollback-parser-check:' + EXTENSION_KEY,
  'projected-rollback-preflight:' + EXTENSION_KEY,
  'projected-rollback-preflight:' + STABILIZATION_KEY,
  'block-entity-clearance',
  'live-entity-clearance',
  'same-moment-package-entity-clearance:' + STABILIZATION_KEY,
  'strict-forward-execution:' + STABILIZATION_KEY,
  'same-moment-package-entity-clearance:' + EXTENSION_KEY,
  'strict-forward-execution:' + EXTENSION_KEY,
  'fresh-post-complete-save',
  'post-complete-save-intake',
  'post-snapshot-identity',
  'rollback-poststate-preflight:' + EXTENSION_KEY,
  'rollback-poststate-preflight:' + STABILIZATION_KEY,
];
const allStagesPass = ledger.stages.length === EXPECTED.stageCount
  && ledger.stages.every(({ status }, index) => (
    status === 'PASS' && ledger.stages[index].stage === expectedStageOrder[index]
  ));
const evidenceBindingMismatches = [];
for (const declared of ledger.evidenceBindings) {
  const observed = fileBinding(declared.path);
  if (observed.sha256 !== declared.sha256 || observed.bytes !== declared.bytes) {
    evidenceBindingMismatches.push({ declared, observed });
  }
}
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceBindingCount
  && evidenceBindingMismatches.length === 0,
'ledger evidence binding drifted');

const r11aSurface = deriveSurface(c1, 489, 493);
const candidateSurface = deriveSurface(c1, 481, 488);
const r11aHeadroom = uniqueCells(r11aSurface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z },
  { x, y: y + 2, z },
]));
const r11aSupports = r11aSurface.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const r11aFunctionalKeys = new Set([
  ...r11aSurface.map(cellKey),
  ...r11aHeadroom.map(cellKey),
  ...r11aSupports.map(cellKey),
]);
const inheritedR11AFunctional = candidateSurface.filter((cell) => (
  r11aFunctionalKeys.has(cellKey(cell))
));
const r11bSurface = candidateSurface.filter((cell) => (
  !r11aFunctionalKeys.has(cellKey(cell))
));
invariant(r11aSurface.length === EXPECTED.r11aSurfaceCount
  && hashCells(r11aSurface) === EXPECTED.r11aSurfaceHash
  && candidateSurface.length === EXPECTED.candidateSurfaceCount
  && inheritedR11AFunctional.length === EXPECTED.inheritedFunctionalCount
  && r11bSurface.length === EXPECTED.r11bSurfaceCount
  && hashCells(r11bSurface) === EXPECTED.r11bSurfaceHash,
'independently derived R11A/R11B surface geometry drifted');

const seamPairs = [];
for (const west of r11bSurface) {
  for (const east of r11aSurface) {
    if (Math.max(Math.abs(west.x - east.x), Math.abs(west.z - east.z)) === 1
      && Math.abs(west.y - east.y) <= 1) seamPairs.push({ west, east });
  }
}
const seamCells = uniqueCells(seamPairs.flatMap(({ west, east }) => [west, east]));
const seamConnectivity = connectivity(seamCells);
const combinedSurface = uniqueCells([...r11bSurface, ...r11aSurface]);
const combinedConnectivity = connectivity(combinedSurface);
const seamMaximumStep = Math.max(...seamPairs.map(({ west, east }) => (
  Math.abs(west.y - east.y)
)));
invariant(seamPairs.length === EXPECTED.seamPairCount
  && seamConnectivity.componentCount === 1
  && combinedConnectivity.componentCount === 1
  && combinedConnectivity.largestComponentCellCount === combinedSurface.length
  && seamMaximumStep <= 1,
'combined R11A/R11B route seam is not one connected step-safe component');

const manifestPackageByKey = new Map(manifest.packages.map((pkg) => [pkg.key, pkg]));
const ledgerPackageByKey = new Map(ledger.packages.map((pkg) => [pkg.key, pkg]));
invariant(JSON.stringify(manifest.executionOrder.forward)
    === JSON.stringify([STABILIZATION_KEY, EXTENSION_KEY])
  && JSON.stringify(manifest.executionOrder.rollback)
    === JSON.stringify([EXTENSION_KEY, STABILIZATION_KEY])
  && manifest.target.packageTargetsDisjoint === true,
'declared package order or disjointness drifted');

function bindPackage(key, expectedCount) {
  const manifestPackage = manifestPackageByKey.get(key);
  const ledgerPackage = ledgerPackageByKey.get(key);
  const operationRecord = manifest.operations[key];
  invariant(manifestPackage && ledgerPackage && operationRecord,
    key + ' package binding is missing');
  const forwardBinding = fileBinding(manifestPackage.forward);
  const rollbackBinding = fileBinding(manifestPackage.rollback);
  invariant(samePath(manifestPackage.forward, ledgerPackage.forward.path)
    && samePath(manifestPackage.rollback, ledgerPackage.rollback.path)
    && forwardBinding.sha256 === ledgerPackage.forward.sha256
    && forwardBinding.bytes === ledgerPackage.forward.bytes
    && rollbackBinding.sha256 === ledgerPackage.rollback.sha256
    && rollbackBinding.bytes === ledgerPackage.rollback.bytes
    && sha256(operationBody(manifestPackage.forward)) === operationRecord.forwardSha256
    && sha256(operationBody(manifestPackage.rollback)) === operationRecord.rollbackSha256,
  key + ' operation binding drifted');
  const forward = parsePointOperations(manifestPackage.forward);
  const rollback = parsePointOperations(manifestPackage.rollback);
  invariant(forward.length === expectedCount
    && rollback.length === expectedCount
    && operationRecord.forwardCommandCount === expectedCount
    && operationRecord.rollbackCommandCount === expectedCount
    && operationRecord.exactInverse === true
    && rollback.every((operation, index) => {
      const inverse = forward[forward.length - 1 - index];
      return cellKey(operation.cell) === cellKey(inverse.cell)
        && operation.fromState === inverse.toState
        && operation.toState === inverse.fromState;
    }),
  key + ' rollback is not the reverse exact inverse');
  return {
    key,
    manifestPackage,
    ledgerPackage,
    operationRecord,
    forwardBinding,
    rollbackBinding,
    forward,
    rollback,
  };
}

const stabilizationPackage = bindPackage(STABILIZATION_KEY, EXPECTED.stabilizationCount);
const extensionPackage = bindPackage(EXTENSION_KEY, EXPECTED.extensionCount);
const stabilizationOps = stabilizationPackage.forward;
const extensionOps = extensionPackage.forward;
invariant(hashCells(stabilizationOps.map(({ cell }) => cell)) === EXPECTED.stabilizationHash
  && stabilizationOps.every(({ fromState, toState }) => (
    fromState === 'minecraft:gravel' && toState === 'minecraft:stone_bricks'
  )),
'exact gravel stabilization package drifted');

const pavementOps = extensionOps.filter(({ toState }) => PAVEMENT_STATES.has(toState));
const foundationOps = extensionOps.filter(({ toState }) => toState === 'minecraft:stone_bricks');
const headroomOps = extensionOps.filter(({ toState }) => toState === 'minecraft:air');
invariant(pavementOps.length === EXPECTED.r11bSurfaceCount
  && hashCells(pavementOps.map(({ cell }) => cell)) === EXPECTED.r11bSurfaceHash
  && foundationOps.length === EXPECTED.foundationCount
  && hashCells(foundationOps.map(({ cell }) => cell)) === EXPECTED.foundationHash
  && headroomOps.length === 290,
'extension operation partition drifted');

const stabilizationKeys = new Set(stabilizationOps.map(({ cell }) => cellKey(cell)));
const extensionKeys = new Set(extensionOps.map(({ cell }) => cellKey(cell)));
invariant(stabilizationOps.every(({ cell }) => !extensionKeys.has(cellKey(cell))),
'stabilization and extension packages intersect');
const allForward = [...stabilizationOps, ...extensionOps];
const operatedCells = allForward.map(({ cell }) => cell);
invariant(operatedCells.length === EXPECTED.operatedCount
  && new Set(operatedCells.map(cellKey)).size === EXPECTED.operatedCount
  && hashCells(operatedCells) === EXPECTED.operatedHash,
'operated union identity drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const operationByKey = new Map(allForward.map((operation) => [cellKey(operation.cell), operation]));
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
const postRecordByKey = new Map(postRecords.map((record) => [cellKey(record.cell), record]));
const pavementRecords = pavementOps.map(({ cell }) => postRecordByKey.get(cellKey(cell)));
const foundationRecords = foundationOps.map(({ cell }) => postRecordByKey.get(cellKey(cell)));
const stabilizationRecords = stabilizationOps.map(({ cell }) => postRecordByKey.get(cellKey(cell)));
const extensionRecords = extensionOps.map(({ cell }) => postRecordByKey.get(cellKey(cell)));
const stabilizationTargetMismatches = mismatchCount(stabilizationRecords);
const extensionTargetMismatches = mismatchCount(extensionRecords);

const r11bHeadroom = uniqueCells(r11bSurface.flatMap(({ x, y, z }) => [
  { x, y: y + 1, z },
  { x, y: y + 2, z },
]));
const r11bHeadroomRecords = await readRecords(postReader, r11bHeadroom, () => 'minecraft:air');
const r11bHeadroomMismatches = mismatchCount(r11bHeadroomRecords);
const r11aSurfaceRecords = await readRecords(
  postReader,
  r11aSurface,
  (cell) => surfaceTarget(cell.offset),
);
const r11aSurfaceMismatches = mismatchCount(r11aSurfaceRecords);
const r11aHeadroomRecords = await readRecords(postReader, r11aHeadroom, () => 'minecraft:air');
const r11aHeadroomMismatches = mismatchCount(r11aHeadroomRecords);

const r11bSupports = r11bSurface.map(({ x, y, z }) => ({ x, y: y - 1, z }));
const supportRecords = await readRecords(postReader, r11bSupports, () => null);
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
const sourceGravity = [];
const postGravity = [];
for (const cell of halo) {
  const before = stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z));
  const after = stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z));
  if (GRAVITY.has(blockName(before))) sourceGravity.push({ cell, state: before });
  if (GRAVITY.has(blockName(after))) postGravity.push({ cell, state: after });
  if (!operatedKeys.has(cellKey(cell)) && before !== after) {
    undeclaredDrift.push({ cell, before, after });
  }
}
const residualGravity = sourceGravity.filter(({ cell }) => (
  !stabilizationKeys.has(cellKey(cell))
));
const residualGravitySupportProof = [];
const residualGravityViolations = [];
for (const record of residualGravity) {
  const after = stateToCommandString(await postReader.blockState(
    record.cell.x, record.cell.y, record.cell.z,
  ));
  let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  let supportState = stateToCommandString(await postReader.blockState(
    support.x, support.y, support.z,
  ));
  let gravityDepth = 0;
  while (GRAVITY.has(blockName(supportState))) {
    gravityDepth += 1;
    if (gravityDepth > 384) break;
    support = { x: support.x, y: support.y - 1, z: support.z };
    supportState = stateToCommandString(await postReader.blockState(
      support.x, support.y, support.z,
    ));
  }
  const passed = after === record.state
    && !operatedKeys.has(cellKey(record.cell))
    && gravityDepth <= 384
    && isStable(supportState);
  const proof = {
    cell: record.cell,
    sourceState: record.state,
    postState: after,
    terminalSupportCell: support,
    terminalSupportState: supportState,
    interveningGravityCellCount: gravityDepth,
    passed,
  };
  residualGravitySupportProof.push(proof);
  if (!passed) residualGravityViolations.push(proof);
}
invariant(halo.length === manifest.scope.geometry.interactionHalo.cellCount
  && hashCells(halo) === manifest.scope.geometry.interactionHalo.coordinateSetSha256
  && sourceGravity.length === EXPECTED.gravityHaloCount
  && sourceGravity.every(({ state }) => blockName(state) === 'minecraft:gravel')
  && residualGravity.length === EXPECTED.residualGravityCount
  && residualGravityViolations.length === 0
  && postGravity.length === EXPECTED.residualGravityCount,
'gravity dependency closure or residual support proof failed');

function strictExecutionEvidence(key, expectedCount) {
  const filename = path.join(EVIDENCE_DIR, key + '.forward-execution.json');
  const execution = readJson(filename);
  const binding = fileBinding(filename);
  const journalBinding = fileBinding(execution.streamJournal);
  const passed = execution.schemaVersion === 3
    && execution.status === 'complete'
    && execution.dryRun === false
    && execution.strictNoop === true
    && execution.operationRole === 'forward'
    && execution.sourceOperationCount === expectedCount
    && execution.sourceGroupCount === expectedCount
    && execution.successfulGroups === expectedCount
    && execution.failedGroups === 0
    && execution.successfulCommands === expectedCount
    && execution.failedCommands === 0
    && execution.noopCommands === 0
    && execution.unexpectedNoopCommands === 0
    && execution.worldEditLeftoverCount === 0;
  return {
    key,
    ...binding,
    journal: journalBinding,
    status: execution.status,
    successfulGroups: execution.successfulGroups,
    failedGroups: execution.failedGroups,
    noopCommands: execution.noopCommands,
    passed,
  };
}
const stabilizationExecution = strictExecutionEvidence(
  STABILIZATION_KEY, EXPECTED.stabilizationCount,
);
const extensionExecution = strictExecutionEvidence(EXTENSION_KEY, EXPECTED.extensionCount);

function rollbackEvidence(key, expectedCount) {
  const filename = path.join(EVIDENCE_DIR, key + '.rollback-poststate-preflight.json');
  const rollbackReport = readJson(filename);
  const binding = fileBinding(filename);
  return { filename, rollbackReport, binding, expectedCount };
}
const extensionRollback = rollbackEvidence(EXTENSION_KEY, EXPECTED.extensionCount);
const stabilizationRollback = rollbackEvidence(
  STABILIZATION_KEY, EXPECTED.stabilizationCount,
);
const extensionRollbackPass = extensionRollback.rollbackReport.status === 'PASS'
  && extensionRollback.rollbackReport.passed === EXPECTED.extensionCount
  && extensionRollback.rollbackReport.failed === 0
  && extensionRollback.rollbackReport.regionsSnapshot.sha256 === EXPECTED.postRegion
  && extensionRollback.rollbackReport.sourceOverlays === null;
const stabilizationOverlay = stabilizationRollback.rollbackReport.sourceOverlays;
const stabilizationRollbackPass = stabilizationRollback.rollbackReport.status === 'PASS'
  && stabilizationRollback.rollbackReport.passed === EXPECTED.stabilizationCount
  && stabilizationRollback.rollbackReport.failed === 0
  && stabilizationRollback.rollbackReport.regionsSnapshot.sha256 === EXPECTED.postRegion
  && stabilizationOverlay?.operationCount === EXPECTED.extensionCount
  && stabilizationOverlay?.passed === EXPECTED.extensionCount
  && stabilizationOverlay?.failed === 0
  && stabilizationOverlay?.artifacts?.length === 1
  && samePath(stabilizationOverlay.artifacts[0].path, extensionPackage.manifestPackage.rollback)
  && stabilizationOverlay.artifacts[0].sha256 === extensionPackage.rollbackBinding.sha256;
const checks = [];
const check = (id, passed, detail) => checks.push({
  id,
  status: passed ? 'PASS' : 'FAIL',
  detail,
});
check('R11B-QA-01-LEDGER-EVIDENCE-TERMINAL',
  allStagesPass && evidenceBindingMismatches.length === 0,
  ledger.stages.length + '/' + EXPECTED.stageCount + ' ordered stages PASS; '
    + ledger.evidenceBindings.length + '/' + EXPECTED.evidenceBindingCount
    + ' evidence bindings exact.');
check('R11B-QA-02-COMPLETED-IDENTITY-BOUND',
  manifest.manifestIdentity === EXPECTED.manifestIdentity
    && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease
    && ledger.executionBindingSha256 === EXPECTED.executionBinding,
  'Manifest, execution, and completed release identities are exact.');
check('R11B-QA-03-SOURCE-POST-SAVES-BOUND',
  sourceIdentity.sha256 === EXPECTED.sourceRegion
    && postIdentity.sha256 === EXPECTED.postRegion
    && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postSave,
  'Source/post complete-save and region identities are exact.');
check('R11B-QA-04-EXACT-SOURCE-GUARDS',
  sourceRecords.length === EXPECTED.operatedCount && sourceMismatches === 0,
  (sourceRecords.length - sourceMismatches) + '/' + sourceRecords.length
    + ' source states match.');
check('R11B-QA-05-EXACT-POST-TARGETS',
  postRecords.length === EXPECTED.operatedCount && targetMismatches === 0,
  (postRecords.length - targetMismatches) + '/' + postRecords.length
    + ' exact target states.');
check('R11B-QA-06-ORDERED-EXACT-INVERSES',
  stabilizationPackage.forward.length === EXPECTED.stabilizationCount
    && extensionPackage.forward.length === EXPECTED.extensionCount
    && manifest.target.packageTargetsDisjoint === true,
  EXPECTED.stabilizationCount + ' stabilization + ' + EXPECTED.extensionCount
    + ' extension targets; reverse-order exact inverses.');
check('R11B-QA-07-PAVEMENT-MATERIALS',
  pavementRecords.length === EXPECTED.r11bSurfaceCount
    && pavementRecords.every(({ state }) => PAVEMENT_STATES.has(state)),
  JSON.stringify(stateCensus(pavementRecords)));
check('R11B-QA-08-COMBINED-ROUTE-SEAM-STEP-SAFE',
  combinedConnectivity.componentCount === 1
    && seamConnectivity.componentCount === 1
    && seamPairs.length === EXPECTED.seamPairCount
    && seamMaximumStep <= 1,
  'Combined route ' + combinedConnectivity.componentCount + ' component; seam '
    + seamConnectivity.componentCount + ' component/' + seamPairs.length
    + ' pairs; max step ' + seamMaximumStep + '.');
check('R11B-QA-09-STABLE-FOUNDATION',
  foundationRecords.length === EXPECTED.foundationCount
    && foundationRecords.every(({ state }) => state === 'minecraft:stone_bricks')
    && stabilizationRecords.every(({ state }) => state === 'minecraft:stone_bricks')
    && unstableSupports.length === 0,
  foundationRecords.length + '/' + EXPECTED.foundationCount + ' fills; '
    + stabilizationRecords.length + '/' + EXPECTED.stabilizationCount
    + ' stabilized contacts; ' + (r11bSupports.length - unstableSupports.length)
    + '/' + r11bSupports.length + ' stable contacts.');
check('R11B-QA-10-FULL-HEADROOM',
  r11bHeadroomRecords.length === EXPECTED.newHeadroomCount
    && r11bHeadroomMismatches === 0
    && r11aHeadroomRecords.length === EXPECTED.r11aHeadroomCount
    && r11aHeadroomMismatches === 0,
  (r11bHeadroomRecords.length - r11bHeadroomMismatches) + '/'
    + r11bHeadroomRecords.length + ' R11B air; '
    + (r11aHeadroomRecords.length - r11aHeadroomMismatches) + '/'
    + r11aHeadroomRecords.length + ' R11A air.');
check('R11B-QA-11-R11A-FUNCTIONAL-ENVELOPE',
  r11aSurfaceMismatches === 0 && r11aHeadroomMismatches === 0,
  (r11aSurfaceRecords.length - r11aSurfaceMismatches) + '/'
    + r11aSurfaceRecords.length + ' accepted surface targets; '
    + (r11aHeadroomRecords.length - r11aHeadroomMismatches) + '/'
    + r11aHeadroomRecords.length + ' accepted headroom air.');
check('R11B-QA-12-GRAVITY-CLOSURE',
  sourceGravity.length === EXPECTED.gravityHaloCount
    && stabilizationRecords.length === EXPECTED.stabilizationCount
    && residualGravity.length === EXPECTED.residualGravityCount
    && residualGravityViolations.length === 0
    && postGravity.length === EXPECTED.residualGravityCount,
  stabilizationRecords.length + ' stabilized; ' + residualGravity.length
    + ' residual gravel cells stable and untouched; zero unresolved.');
check('R11B-QA-13-ZERO-UNDECLARED-HALO-DRIFT',
  undeclaredDrift.length === 0,
  (preservedHalo.length - undeclaredDrift.length) + '/' + preservedHalo.length
    + ' preserved halo cells unchanged.');
check('R11B-QA-14-STRICT-ORDERED-EXECUTION',
  stabilizationExecution.passed && extensionExecution.passed,
  stabilizationExecution.successfulGroups + '/' + EXPECTED.stabilizationCount
    + ' stabilization and ' + extensionExecution.successfulGroups + '/'
    + EXPECTED.extensionCount + ' extension groups.');
check('R11B-QA-15-REVERSE-ROLLBACK-POSTSTATE',
  extensionRollbackPass && stabilizationRollbackPass,
  extensionRollback.rollbackReport.passed + '/' + EXPECTED.extensionCount
    + ' extension then ' + stabilizationRollback.rollbackReport.passed + '/'
    + EXPECTED.stabilizationCount + ' stabilization rollback guards.');
check('R11B-QA-16-DECLARED-ISOLATION',
  manifest.isolation.unresolvedGravityHazardCount === 0
    && manifest.isolation.fluidHaloIntersectionCount === 0
    && manifest.isolation.blockEntityHaloIntersectionCount === 0
    && manifest.isolation.savedEntityHaloIntersectionCount === 0
    && manifest.isolation.protectedRelicHaloIntersectionCount === 0
    && manifest.isolation.undeclaredPriorReleaseIntersectionCount === 0,
  'All declared interface/hazard isolation counts remain zero.');

const failed = checks.filter(({ status }) => status !== 'PASS');
const qaPayload = {
  schemaVersion: 1,
  id: 'combined-zones-r11b-c1-west-highway-extension-post-release-qa',
  generatedAtUtc: GENERATED_AT,
  status: failed.length === 0
    ? 'PASS_R11B_C1_WEST_HIGHWAY_EXTENSION_POST_RELEASE_ACCEPTED'
    : 'FAIL_R11B_C1_WEST_HIGHWAY_EXTENSION_POST_RELEASE',
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
      regionSnapshotSha256: sourceIdentity.sha256,
      intake: sourceIntakeBinding,
      regionIdentity: sourceIdentityBinding,
    },
    postCompleteSave: {
      root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256,
      intake: postIntakeBinding,
      regionIdentity: postIdentityBinding,
    },
    ledgerEvidence: {
      declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceBindingMismatches.length,
      mismatchCount: evidenceBindingMismatches.length,
      listedMismatches: evidenceBindingMismatches.slice(0, 20),
    },
  },
  geometry: {
    candidateSurface: exactSet(candidateSurface),
    inheritedR11AFunctional: exactSet(inheritedR11AFunctional),
    r11bPavementSurface: exactSet(r11bSurface),
    acceptedR11ASurface: exactSet(r11aSurface),
    combinedSurface: exactSet(combinedSurface),
    foundationFill: exactSet(foundationOps.map(({ cell }) => cell)),
    gravityStabilization: exactSet(stabilizationOps.map(({ cell }) => cell)),
    r11bHeadroom: exactSet(r11bHeadroom),
    acceptedR11AHeadroom: exactSet(r11aHeadroom),
    operatedUnion: exactSet(operatedCells),
    interactionHalo: exactSet(halo),
    preservedHalo: exactSet(preservedHalo),
    combinedConnectivity,
    seam: {
      adjacentPairCount: seamPairs.length,
      exactCells: exactSet(seamCells),
      connectivity: seamConnectivity,
      maximumAdjacentStep: seamMaximumStep,
    },
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
      mismatchCellCount: pavementRecords
        .filter(({ state }) => !PAVEMENT_STATES.has(state)).length,
      stateCensus: stateCensus(pavementRecords),
    },
    foundation: {
      exactFillCount: foundationRecords.length,
      stabilizationCount: stabilizationRecords.length,
      stableSupportCount: r11bSupports.length - unstableSupports.length,
      unstableSupportCount: unstableSupports.length,
      supportStateCensus: stateCensus(supportRecords),
    },
    headroom: {
      r11bAirCellCount: r11bHeadroomRecords.length - r11bHeadroomMismatches,
      r11bMismatchCount: r11bHeadroomMismatches,
      acceptedR11AAirCellCount: r11aHeadroomRecords.length - r11aHeadroomMismatches,
      acceptedR11AMismatchCount: r11aHeadroomMismatches,
    },
    acceptedR11A: {
      surfaceTargetMatchCount: r11aSurfaceRecords.length - r11aSurfaceMismatches,
      surfaceMismatchCount: r11aSurfaceMismatches,
      headroomAirCount: r11aHeadroomRecords.length - r11aHeadroomMismatches,
    },
    gravityClosure: {
      sourceGravityCellCount: sourceGravity.length,
      stabilizedCellCount: stabilizationRecords.length,
      residualStableUntouchedCellCount: residualGravity.length - residualGravityViolations.length,
      residualViolationCount: residualGravityViolations.length,
      postGravityCellCount: postGravity.length,
      maximumInterveningGravityDepth: Math.max(
        0,
        ...residualGravitySupportProof.map(({ interveningGravityCellCount }) => (
          interveningGravityCellCount
        )),
      ),
      residualSupportProof: residualGravitySupportProof,
    },
    preservedHalo: {
      unchangedCellCount: preservedHalo.length - undeclaredDrift.length,
      driftCellCount: undeclaredDrift.length,
      listedDrift: undeclaredDrift.slice(0, 100),
    },
  },
  executionEvidence: {
    stageOrder: {
      expected: expectedStageOrder,
      exact: allStagesPass,
    },
    strictForwardExecution: {
      packageOrder: [STABILIZATION_KEY, EXTENSION_KEY],
      packages: [stabilizationExecution, extensionExecution],
      successfulGroupCount: stabilizationExecution.successfulGroups
        + extensionExecution.successfulGroups,
      passed: stabilizationExecution.passed && extensionExecution.passed,
    },
    rollbackPoststatePreflight: {
      packageOrder: [EXTENSION_KEY, STABILIZATION_KEY],
      packages: [
        {
          key: EXTENSION_KEY,
          ...extensionRollback.binding,
          status: extensionRollback.rollbackReport.status,
          passedGuards: extensionRollback.rollbackReport.passed,
          failedGuards: extensionRollback.rollbackReport.failed,
          logicalSourceOverlayCount: 0,
          passed: extensionRollbackPass,
        },
        {
          key: STABILIZATION_KEY,
          ...stabilizationRollback.binding,
          status: stabilizationRollback.rollbackReport.status,
          passedGuards: stabilizationRollback.rollbackReport.passed,
          failedGuards: stabilizationRollback.rollbackReport.failed,
          logicalSourceOverlayCount: stabilizationOverlay?.operationCount ?? 0,
          passed: stabilizationRollbackPass,
        },
      ],
      passedGuardCount: extensionRollback.rollbackReport.passed
        + stabilizationRollback.rollbackReport.passed,
      regionSnapshotSha256: EXPECTED.postRegion,
      passed: extensionRollbackPass && stabilizationRollbackPass,
    },
  },
  checks,
  summary: {
    passed: failed.length === 0,
    checkCount: checks.length,
    passCount: checks.length - failed.length,
    failCount: failed.length,
    exactTargetMatchCount: postRecords.length - targetMismatches,
    stabilizationMatchCount: stabilizationRecords.length - stabilizationTargetMismatches,
    extensionMatchCount: extensionRecords.length - extensionTargetMismatches,
    pavementMatchCount: pavementRecords.length,
    foundationFillMatchCount: foundationRecords.length,
    stableSupportCount: r11bSupports.length - unstableSupports.length,
    r11bHeadroomAirCount: r11bHeadroomRecords.length - r11bHeadroomMismatches,
    r11aHeadroomAirCount: r11aHeadroomRecords.length - r11aHeadroomMismatches,
    preservedHaloUnchangedCount: preservedHalo.length - undeclaredDrift.length,
    preservedHaloCellCount: preservedHalo.length,
    residualStableUntouchedGravityCount: residualGravity.length - residualGravityViolations.length,
    strictExecutionPassCount: stabilizationExecution.successfulGroups
      + extensionExecution.successfulGroups,
    rollbackGuardPassCount: extensionRollback.rollbackReport.passed
      + stabilizationRollback.rollbackReport.passed,
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
  '# CZ-R11B C1 west-highway post-release QA',
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
  '| Exact operated targets | ' + qaPayload.summary.exactTargetMatchCount + ' / 488 |',
  '| Stabilization targets | ' + qaPayload.summary.stabilizationMatchCount + ' / 3 |',
  '| Extension targets | ' + qaPayload.summary.extensionMatchCount + ' / 485 |',
  '| Pavement materials | ' + qaPayload.summary.pavementMatchCount + ' / 164 |',
  '| Combined route | ' + combinedConnectivity.componentCount
    + ' component, seam ' + seamConnectivity.componentCount + ' component / '
    + seamPairs.length + ' pairs, max step ' + seamMaximumStep + ' |',
  '| Foundation fills | ' + qaPayload.summary.foundationFillMatchCount + ' / 31 |',
  '| Stable pavement contacts | ' + qaPayload.summary.stableSupportCount + ' / 164 |',
  '| R11B two-block headroom | ' + qaPayload.summary.r11bHeadroomAirCount + ' / 328 |',
  '| Preserved R11A headroom | ' + qaPayload.summary.r11aHeadroomAirCount + ' / 218 |',
  '| Residual stable gravel | ' + qaPayload.summary.residualStableUntouchedGravityCount
    + ' / 22 |',
  '| Preserved halo unchanged | ' + qaPayload.summary.preservedHaloUnchangedCount
    + ' / ' + preservedHalo.length + ' |',
  '| Strict execution | ' + qaPayload.summary.strictExecutionPassCount + ' / 488 |',
  '| Reverse rollback post-state | ' + qaPayload.summary.rollbackGuardPassCount + ' / 488 |',
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
  exactTargets: qaPayload.summary.exactTargetMatchCount + '/488',
  stabilization: qaPayload.summary.stabilizationMatchCount + '/3',
  extension: qaPayload.summary.extensionMatchCount + '/485',
  pavementMaterials: qaPayload.summary.pavementMatchCount + '/164',
  combinedComponents: combinedConnectivity.componentCount,
  seamComponents: seamConnectivity.componentCount,
  seamPairs: seamPairs.length,
  maximumAdjacentStep: seamMaximumStep,
  foundationFills: qaPayload.summary.foundationFillMatchCount + '/31',
  stableSupports: qaPayload.summary.stableSupportCount + '/164',
  r11bHeadroomAir: qaPayload.summary.r11bHeadroomAirCount + '/328',
  r11aHeadroomAir: qaPayload.summary.r11aHeadroomAirCount + '/218',
  residualGravity: qaPayload.summary.residualStableUntouchedGravityCount + '/22',
  preservedHalo: qaPayload.summary.preservedHaloUnchangedCount + '/' + preservedHalo.length,
  strictExecution: qaPayload.summary.strictExecutionPassCount + '/488',
  rollbackGuards: qaPayload.summary.rollbackGuardPassCount + '/488',
  output: relative(OUT_PATH),
  markdown: relative(MARKDOWN_PATH),
}, null, 2));
if (failed.length) process.exitCode = 1;
