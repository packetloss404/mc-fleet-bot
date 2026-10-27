#!/usr/bin/env node
/** Read-only R08V Empty Eight fire/service-spine floor post-release QA and seal. */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader, boundsOf, cellKey, cellsIn, hashCells, sha256, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T23:25:00Z');
const EVIDENCE_DIR = value('--evidence-dir', 'data/world-review/combined-zones-r08v-live-20260821T232156Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest',
  'data/buildops/combined-zones-r08v-empty-eight-fire-service-spine-floor.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08v-post-20260821T232156Z');
const QA_CANONICAL_PATH = path.join(EVIDENCE_DIR, 'r08v-post-release-qa.json');
const OUT_PATH = value('--out', QA_CANONICAL_PATH);
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08v-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08v-bounded-spine-construction-seal.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown',
  path.join(EVIDENCE_DIR, 'r08v-bounded-spine-construction-seal.md'));
const BASENAME = 'combined-zones-r08v-empty-eight-fire-service-spine-floor';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const FLOOR_STATE = 'minecraft:polished_blackstone';
const CAP_STATE = 'minecraft:stone_bricks';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const EXPECTED = Object.freeze({
  ledgerFile: 'a0d93035f944949ba6ae1dbc237e8da738aecf713fd6facbed8967835db05110',
  manifestFile: 'fec04d98120b6321693678f45502582274a535a17ae2684f21171fa05fb12ef6',
  manifestIdentity: '354ee10ad5e1cd9b3714f67f5b9909eb20fdf2f945c3cf6cfe9c4058e8ad85c0',
  sourceSave: '89d2240ad0c7913dc21bdcb135e5de91f6bc3039b7b9fb60fc9ac7d180d915ff',
  sourceRegion: 'cffed1a9109c35eff92dba21a12902d1d253789d8782add362fb936e258d5677',
  postSave: 'b7f411e164b1f3d005d8d116085a0e258153a1388910a9e5751350cc75a6e44c',
  postRegion: '39a235a7bdd40493a848bffaf5e7ca1bb738ac9e19e2bd5c43b7248277b6d2ed',
  sourceBoundRelease: '19f103f4d801f98c83e2ee11ffc094babbd2e0ce4b3b5018f653b32a5e9d9738',
  executionBinding: 'ec70ec751665d48e74e88d407e71580f237d27fee8e2fa19df47d6c503a0bc74',
  completedRelease: '849d0c719b007c1def5e12b55aabb72776e0ebcb7fd02dbf7a404ce55dca7a5b',
  targetHash: 'd0e24bc3d10d55cb6c263a4d185c03049d1d1d591046cc090a8aa31d2da2a10b',
  floorHash: '6febdc51cfbf2d8eb55c6a9632d0b9a25e83008ba89d48a2856ce29e3660f8a2',
  haloHash: '497ac00a4ab63ebfff56346cf98f54c68e0f15563dd8f8246c8a5c8b7b4ecb6c',
  evidenceCount: 25,
  stageCount: 24,
});
const INPUTS = Object.freeze({
  lifeSafety: 'docs/masterplans/05-combined-zones/phase1-d06-life-safety-alternatives.json',
  n06Finding: 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08V post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
function parseOperations(filename) {
  const output = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9, `${filename} malformed`);
    const coordinates = fields.slice(1, 7).map(Number);
    invariant(coordinates.slice(0, 3).every((entry, index) => entry === coordinates[index + 3]),
      `${filename} is not point-exact`);
    output.push({ cell: { x: coordinates[0], y: coordinates[1], z: coordinates[2] },
      fromState: fields[7], toState: fields[8] });
  }
  return output;
}
function components(cells) {
  const remaining = new Set(uniqueCells(cells).map(cellKey));
  const sizes = [];
  while (remaining.size) {
    const first = remaining.values().next().value;
    remaining.delete(first);
    const stack = [first];
    let size = 0;
    while (stack.length) {
      const [x, y, z] = stack.pop().split(',').map(Number);
      size += 1;
      for (const [dx, dy, dz] of FACE) {
        const key = `${x + dx},${y + dy},${z + dz}`;
        if (remaining.delete(key)) stack.push(key);
      }
    }
    sizes.push(size);
  }
  sizes.sort((a, b) => b - a);
  return { componentCount: sizes.length, largestComponentCellCount: sizes[0] ?? 0 };
}

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const lifeSafety = readJson(INPUTS.lifeSafety);
const n06 = readJson(INPUTS.n06Finding);
const ledgerBinding = fileBinding(LEDGER_PATH);
const manifestBinding = fileBinding(MANIFEST_PATH);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.mode === 'EXECUTE'
  && ledger.transactionId === BASENAME && ledger.releaseNodeId === RELEASE_NODE_ID,
'terminal release identity drifted');
const manifestPayload = { ...manifest };
delete manifestPayload.manifestIdentity;
invariant(ledgerBinding.sha256 === EXPECTED.ledgerFile
  && manifestBinding.sha256 === EXPECTED.manifestFile
  && ledger.manifest.sha256 === EXPECTED.manifestFile
  && manifest.manifestIdentity === EXPECTED.manifestIdentity
  && sha256(JSON.stringify(manifestPayload)) === manifest.manifestIdentity,
'ledger/manifest binding drifted');
invariant(ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundRelease
  && ledger.executionBindingSha256 === EXPECTED.executionBinding
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedRelease,
'completed release identities drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceSave
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postSave
  && sourceIdentity.sha256 === EXPECTED.sourceRegion && postIdentity.sha256 === EXPECTED.postRegion
  && sourceIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && postIntake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && absolute(ledger.postSnapshot.root) === absolute(POST_ROOT),
'source/post immutable snapshot binding drifted');
const evidenceMismatches = ledger.evidenceBindings.filter((binding) => {
  const observed = fileBinding(binding.path);
  return observed.sha256 !== binding.sha256 || observed.bytes !== binding.bytes;
});
invariant(ledger.evidenceBindings.length === EXPECTED.evidenceCount && evidenceMismatches.length === 0,
'ledger evidence binding drifted');

const forwardOrder = manifest.executionOrder.forward;
const rollbackOrder = manifest.executionOrder.rollback;
const expectedStages = [
  'standing-authorization', 'exact-release-manifest-qa', 'fresh-source-complete-save',
  'source-complete-save-intake', 'source-snapshot-identity',
  ...forwardOrder.flatMap((key) => [`forward-source-preflight:${key}`, `strict-forward-parser-check:${key}`,
    `strict-rollback-parser-check:${key}`]),
  ...rollbackOrder.map((key) => `projected-rollback-preflight:${key}`),
  'block-entity-clearance', 'live-entity-clearance',
  ...forwardOrder.flatMap((key) => [`same-moment-package-entity-clearance:${key}`,
    `strict-forward-execution:${key}`]),
  'fresh-post-complete-save', 'post-complete-save-intake', 'post-snapshot-identity',
  ...rollbackOrder.map((key) => `rollback-poststate-preflight:${key}`),
];
invariant(expectedStages.length === EXPECTED.stageCount
  && JSON.stringify(ledger.stages.map(({ stage }) => stage)) === JSON.stringify(expectedStages)
  && ledger.stages.every(({ status }) => status === 'PASS')
  && JSON.stringify(rollbackOrder) === JSON.stringify(forwardOrder.slice().reverse()),
'execution stage or package order drifted');

const operations = [];
const executionPackages = [];
for (const [index, pkg] of manifest.packages.entries()) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  const declared = manifest.operations[pkg.key];
  invariant(sha256(operationBody(pkg.forward)) === declared.forwardSha256
    && sha256(operationBody(pkg.rollback)) === declared.rollbackSha256
    && ledger.packages[index].forward.sha256 === fileBinding(pkg.forward).sha256
    && ledger.packages[index].rollback.sha256 === fileBinding(pkg.rollback).sha256
    && JSON.stringify(rollback) === JSON.stringify(forward.slice().reverse().map((entry) => ({
      cell: entry.cell, fromState: entry.toState, toState: entry.fromState,
    }))), `${pkg.key} inverse or ledger binding drifted`);
  operations.push(...forward.map((entry) => ({ ...entry, packageKey: pkg.key })));
  const execution = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`));
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && execution.forceLoadAudit.allRequiredChunksLoadedBeforeCommands === true
    && execution.forceLoadAudit.allTemporaryReleased === true
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  `${pkg.key} strict execution or rollback evidence failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, failedCommands: execution.failedCommands,
    noopCommands: execution.noopCommands, rollbackGuardCount: rollbackPreflight.passed });
}
const targetCells = uniqueCells(operations.map(({ cell }) => cell));
const targetKeys = new Set(targetCells.map(cellKey));
const floor = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 48, minZ: 51, maxZ: 149 });
const northEnd = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 52, minZ: 50, maxZ: 50 });
const southEnd = cellsIn({ minX: 1844, maxX: 1848, minY: 48, maxY: 52, minZ: 150, maxZ: 150 });
const headroom = cellsIn({ minX: 1844, maxX: 1848, minY: 49, maxY: 51, minZ: 51, maxZ: 149 });
const markerLayer = cellsIn({ minX: 1844, maxX: 1848, minY: 52, maxY: 52, minZ: 51, maxZ: 149 });
const ceiling = cellsIn({ minX: 1844, maxX: 1848, minY: 53, maxY: 53, minZ: 51, maxZ: 149 });
const sideWalls = [1843, 1849].flatMap((x) => cellsIn({
  minX: x, maxX: x, minY: 49, maxY: 51, minZ: 51, maxZ: 149,
}));
const frozenSpine = cellsIn(manifest.scope.geometry.frozenFireServiceSpine.bounds);
const halo = uniqueCells(targetCells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
  x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
}))).filter((cell) => !targetKeys.has(cellKey(cell))));
invariant(operations.length === 525 && targetCells.length === 525
  && hashCells(targetCells) === EXPECTED.targetHash && floor.length === 495
  && hashCells(floor) === EXPECTED.floorHash && halo.length === 1271
  && hashCells(halo) === EXPECTED.haloHash && frozenSpine.length === 3025,
'operated or frozen geometry drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(POST_ROOT, 'region')));
const postEntityReader = new AnvilReader(absolute(path.join(POST_ROOT, 'entities')));
const sourceStates = new Map();
const postStates = new Map();
async function readBoth(cell) {
  const key = cellKey(cell);
  if (!sourceStates.has(key)) sourceStates.set(key,
    stateToCommandString(await sourceReader.blockState(cell.x, cell.y, cell.z)));
  if (!postStates.has(key)) postStates.set(key,
    stateToCommandString(await postReader.blockState(cell.x, cell.y, cell.z)));
}
for (const cell of uniqueCells([...frozenSpine, ...halo, ...ceiling, ...sideWalls])) await readBoth(cell);
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const nonTargetScope = frozenSpine.filter((cell) => !targetKeys.has(cellKey(cell)));
const scopeDrift = nonTargetScope.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const haloDrift = halo.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const floorMismatch = floor.filter((cell) => postStates.get(cellKey(cell)) !== FLOOR_STATE);
const endMismatch = [...northEnd, ...southEnd].filter((cell) => postStates.get(cellKey(cell)) !== CAP_STATE);
const headroomMismatch = headroom.filter((cell) => postStates.get(cellKey(cell)) !== 'minecraft:air');
const markerDrift = markerLayer.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const ceilingDrift = ceiling.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const sideWallDrift = sideWalls.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(transitionMismatch.length === 0 && scopeDrift.length === 0 && haloDrift.length === 0
  && floorMismatch.length === 0 && endMismatch.length === 0 && headroomMismatch.length === 0
  && markerDrift.length === 0 && ceilingDrift.length === 0 && sideWallDrift.length === 0,
'exact target, scope, halo, or retained geometry outcome failed');
const floorTopology = components(floor);
invariant(floorTopology.componentCount === 1 && floorTopology.largestComponentCellCount === 495,
'floor is not one connected component');

const gravityViolations = [];
const gravityDependencyCells = [];
for (const finding of manifest.isolation.retainedGravityHalo.findings) {
  for (const cell of finding.chain) {
    await readBoth(cell);
    gravityDependencyCells.push(cell);
    if (sourceStates.get(cellKey(cell)) !== 'minecraft:gravel'
      || postStates.get(cellKey(cell)) !== 'minecraft:gravel') gravityViolations.push(cell);
  }
  await readBoth(finding.terminalSupport);
  gravityDependencyCells.push(finding.terminalSupport);
  if (sourceStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || postStates.get(cellKey(finding.terminalSupport)) !== finding.terminalSupportState
    || finding.durablySupported !== true || finding.targetDependencyCount !== 0) {
    gravityViolations.push(finding.terminalSupport);
  }
}
invariant(manifest.isolation.retainedGravityHalo.count === 25 && gravityViolations.length === 0,
'retained gravity support closure drifted');

const fire = lifeSafety.d06EmptyEightLifeSafety.fireServiceAccessAlternatives;
const fireAlternative = fire.alternatives.find(({ id }) => id === 'FIRE-EG-B');
const drainage = lifeSafety.d06EmptyEightLifeSafety.drainageAlternatives.alternatives
  .find(({ id }) => id === 'DRAIN-A-EIGHT-INDEPENDENT-LOCAL-CAPS');
const vent = lifeSafety.d06EmptyEightLifeSafety.ventilationOutletAlternatives.alternatives
  .find(({ id }) => id === 'VENT-A-FOUR-INDEPENDENT-LOCAL-RISERS');
const fireCap = cellsIn(fireAlternative.normallyClosedSpineInterfaceCap.bounds);
const drainCaps = uniqueCells(drainage.localSumpInterfaceCaps.flatMap(({ cap }) => cellsIn(cap.bounds)));
const ventCaps = uniqueCells(vent.risers.flatMap(({ internalCompartmentCap, exteriorOutletCap }) => [
  ...cellsIn(internalCompartmentCap.bounds), ...cellsIn(exteriorOutletCap.bounds),
]));
const retainedCaps = uniqueCells([...fireCap, ...drainCaps, ...ventCaps]);
for (const cell of retainedCaps) await readBoth(cell);
const retainedCapDrift = retainedCaps.filter((cell) => sourceStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate'
  || postStates.get(cellKey(cell)) !== 'minecraft:polished_deepslate');
invariant(fireCap.length === 35 && drainCaps.length === 24 && ventCaps.length === 72
  && retainedCaps.length === 131 && retainedCapDrift.length === 0,
'retained passive cap state drifted');

const northSmoke = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
for (const cell of northSmoke) await readBoth(cell);
const northTargetKeys = new Set(operations.filter(({ cell }) => cell.z === 50 && cell.x <= 1847)
  .map(({ cell }) => cellKey(cell)));
const wetNorth = northSmoke.filter((cell) => /(?:water|bubble_column|lava)/
  .test(sourceStates.get(cellKey(cell))));
const wetNorthDrift = wetNorth.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const northSmokeUndeclaredDrift = northSmoke.filter((cell) => !northTargetKeys.has(cellKey(cell))
  && sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
for (const cell of n06Cells) await readBoth(cell);
const n06Drift = n06Cells.filter((cell, index) => sourceStates.get(cellKey(cell))
  !== n06.targetGravity.findings[index].state
  || postStates.get(cellKey(cell)) !== n06.targetGravity.findings[index].state);
invariant(northTargetKeys.size === 20 && wetNorth.length === 6 && wetNorthDrift.length === 0
  && northSmokeUndeclaredDrift.length === 0 && n06Cells.length === 4 && n06Drift.length === 0,
'wet north-smoke or N06 fail-closed exclusion drifted');

const r08tBoundary = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 150, maxZ: 150 });
for (const cell of r08tBoundary) await readBoth(cell);
const r08tDrift = r08tBoundary.filter((cell) => sourceStates.get(cellKey(cell)) !== postStates.get(cellKey(cell)));
invariant(r08tBoundary.length === 1372 && r08tDrift.length === 0,
'R08T south-smoke boundary drifted');

const postBlockEntities = [];
const postSavedEntities = [];
const envelopeKeys = new Set([...targetCells, ...halo].map(cellKey));
const envelopeBounds = boundsOf([...targetCells, ...halo]);
const touchedChunks = uniqueCells(targetCells.map((cell) => ({
  x: Math.floor(cell.x / 16), y: 0, z: Math.floor(cell.z / 16),
}))).map(({ x, z }) => ({ x, z }));
for (const chunkPoint of touchedChunks) {
  const chunk = await postReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(point))) postBlockEntities.push({ id: entity.id ?? null, point });
  }
  const entities = await postEntityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entities?.Entities ?? []) {
    if (!Array.isArray(entity.Pos)) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (x >= envelopeBounds.minX && x < envelopeBounds.maxX + 1
      && y >= envelopeBounds.minY && y < envelopeBounds.maxY + 1
      && z >= envelopeBounds.minZ && z < envelopeBounds.maxZ + 1) {
      postSavedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
invariant(postBlockEntities.length === 0 && postSavedEntities.length === 0,
'post interaction envelope contains a block entity or saved movable entity');

const qa = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08V_FIRE_SERVICE_SPINE_FLOOR_POST_RELEASE_ACCEPTED',
  release: {
    transactionId: BASENAME,
    releaseNodeId: RELEASE_NODE_ID,
    manifestIdentity: manifest.manifestIdentity,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    executionBindingSha256: ledger.executionBindingSha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  bindings: {
    ledger: ledgerBinding,
    manifest: manifestBinding,
    sourceCompleteSave: { root: ledger.sourceSnapshot.root,
      completeSaveSha256: ledger.sourceSnapshot.completeSaveSha256,
      regionSnapshotSha256: sourceIdentity.sha256 },
    postCompleteSave: { root: ledger.postSnapshot.root,
      completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: postIdentity.sha256 },
    ledgerEvidence: { declaredBindingCount: ledger.evidenceBindings.length,
      matchingBindingCount: ledger.evidenceBindings.length - evidenceMismatches.length,
      mismatchCount: evidenceMismatches.length },
  },
  geometry: {
    operatedUnion: exactSet(targetCells),
    connectedFloor: { ...exactSet(floor), ...floorTopology, widthCells: 5, lengthCells: 99,
      maxStepCells: 0 },
    closedStaticEnds: exactSet([...northEnd, ...southEnd]),
    minimumThreeBlockHeadroom: exactSet(headroom),
    retainedMarkerLayer: exactSet(markerLayer),
    retainedSolidCeiling: exactSet(ceiling),
    retainedSolidSideContainment: exactSet(sideWalls),
    frozenFireServiceSpine: exactSet(frozenSpine),
    interactionHalo: exactSet(halo),
  },
  postState: {
    exactTransitions: { expectedCellCount: 525, matchingCellCount: 525 - transitionMismatch.length,
      mismatchCellCount: transitionMismatch.length, containmentStoneBrickCount: 30,
      floorPolishedBlackstoneCount: 495 },
    boundedSpace: { connectedFloorCellCount: 495, connectedComponentCount: floorTopology.componentCount,
      maximumStepCells: 0, headroomAirCount: headroom.length - headroomMismatch.length,
      headroomMismatchCount: headroomMismatch.length, closedEndCellCount: 50,
      endMismatchCount: endMismatch.length },
    preservation: { unchangedNonTargetSpineCellCount: nonTargetScope.length - scopeDrift.length,
      nonTargetSpineDriftCount: scopeDrift.length, unchangedInteractionHaloCount: halo.length - haloDrift.length,
      interactionHaloDriftCount: haloDrift.length, unchangedMarkerLayerCount: markerLayer.length - markerDrift.length,
      markerLayerDriftCount: markerDrift.length, unchangedCeilingCount: ceiling.length - ceilingDrift.length,
      ceilingDriftCount: ceilingDrift.length, unchangedSideContainmentCount: sideWalls.length - sideWallDrift.length,
      sideContainmentDriftCount: sideWallDrift.length, retainedPassiveCapCount: retainedCaps.length,
      retainedPassiveCapDriftCount: retainedCapDrift.length, retainedR08TSouthBoundaryCount: r08tBoundary.length,
      retainedR08TSouthBoundaryDriftCount: r08tDrift.length, wetNorthSmokeCellCount: wetNorth.length,
      wetNorthSmokeDriftCount: wetNorthDrift.length, northSmokeUndeclaredDriftCount: northSmokeUndeclaredDrift.length,
      n06BlockedCellCount: n06Cells.length, n06DriftCount: n06Drift.length,
      postBlockEntityCount: postBlockEntities.length, postSavedEntityCount: postSavedEntities.length,
      undeclaredDriftCount: scopeDrift.length + haloDrift.length + retainedCapDrift.length
        + r08tDrift.length + northSmokeUndeclaredDrift.length + n06Drift.length },
    gravitySupport: { retainedHaloGravelCount: manifest.isolation.retainedGravityHalo.count,
      uniqueDependencyAndSupportCellCount: uniqueCells(gravityDependencyCells).length,
      violationCount: gravityViolations.length, allDurablySupportedAndUnaffected: gravityViolations.length === 0,
      exactDurableRollbackReady: gravityViolations.length === 0 },
  },
  commissioningBoundary: {
    boundedConnectedInteriorConstructionAccepted: true,
    publicRouteCommissioned: false,
    fireServiceRouteCommissioned: false,
    egBSpineInterfaceOpened: false,
    northSmokeSystemCommissioned: false,
    wetNorthSmokeCellsTouched: false,
    n06Touched: false,
    activeMechanismsTouched: false,
    tenantOpeningsTouched: false,
    drainageHeaderOrExternalDischargeOpened: false,
  },
  executionEvidence: {
    stageOrder: { expectedStageCount: expectedStages.length, actualStageCount: ledger.stages.length,
      exact: true, allPass: true },
    strictForwardExecution: { packageCount: executionPackages.length,
      successfulCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.successfulCommands, 0),
      failedCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.failedCommands, 0),
      noopCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.noopCommands, 0), passed: true },
    reverseRollbackPoststatePreflight: { packageCount: executionPackages.length,
      passedGuardCount: executionPackages.reduce((sum, pkg) => sum + pkg.rollbackGuardCount, 0),
      failedGuardCount: 0, packageOrder: rollbackOrder, passed: true },
    packages: executionPackages,
  },
  liveCallsPerformedByQa: false,
  worldEditsPerformedByQa: false,
};
qa.qaPayloadSha256 = sha256(JSON.stringify(qa));

const seal = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_R08V_BOUNDED_FIRE_SERVICE_SPINE_CONSTRUCTION_ACCEPTED',
  release: qa.release,
  qa: { canonicalPath: relative(QA_CANONICAL_PATH), qaPayloadSha256: qa.qaPayloadSha256 },
  constructionScope: { connectedFloorCellCount: 495, closedStaticEndCellCount: 50,
    minimumHeadroomAirCellCount: 1485, retainedPassiveCapCellCount: 131,
    retainedHaloGravelCellCount: 25, boundedInteriorConstructionAccepted: true,
    publicRouteCommissioned: false, fireServiceRouteCommissioned: false,
    externalInterfaceOpened: false },
  rollback: { exactGuardCount: 525, reversePackageOrder: rollbackOrder,
    poststatePreflightPassed: true },
  noLiveCallsPerformedByQa: true,
  noWorldEditsPerformedByQa: true,
};
seal.commissioningSealSha256 = sha256(JSON.stringify(seal));

const qaMarkdown = `# R08V Fire/Service Spine Floor Post-Release QA\n\n`
  + `Status: \`${qa.status}\`\n\n`
  + `- Exact transitions: 525/525.\n`
  + `- Connected floor: 495/495 polished blackstone; one 5×99 component; maximum step 0.\n`
  + `- Headroom: 1,485/1,485 air cells; static ends: 50/50 stone bricks.\n`
  + `- Unchanged non-target spine: ${nonTargetScope.length}/${nonTargetScope.length}; unchanged halo: 1,271/1,271.\n`
  + `- Retained passive caps: 131/131; retained halo gravel: 25/25 with durable support.\n`
  + `- Wet north-smoke cells: 6/6 unchanged; N06 cells: 4/4 unchanged.\n`
  + `- Strict execution: 525 successes, zero failures/no-ops; reverse rollback: 525/525 guards.\n`
  + `- Completed release identity: \`${ledger.completedReleaseIdentitySha256}\`.\n`
  + `- QA payload SHA-256: \`${qa.qaPayloadSha256}\`.\n\n`
  + `This accepts bounded static interior construction only. It does not commission a public or fire-service route, open FIRE-EG-B, or authorize any wet/mechanical/exterior interface. The QA made no live call or world edit.\n`;
const sealMarkdown = `# R08V Bounded Spine Construction Seal\n\n`
  + `Status: \`${seal.status}\`\n\n`
  + `The 495-cell connected floor, 50-cell closed end boundary, complete headroom, retained caps, and exact reverse rollback are accepted against the immutable R08V post save. Public/fire-service routing and every external or powered interface remain uncommissioned.\n\n`
  + `- QA payload SHA-256: \`${qa.qaPayloadSha256}\`\n`
  + `- Seal SHA-256: \`${seal.commissioningSealSha256}\`\n`;

for (const filename of [OUT_PATH, MARKDOWN_PATH, SEAL_PATH, SEAL_MARKDOWN_PATH]) {
  fs.mkdirSync(path.dirname(absolute(filename)), { recursive: true });
}
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(qa, null, 2)}\n`);
fs.writeFileSync(absolute(MARKDOWN_PATH), qaMarkdown);
fs.writeFileSync(absolute(SEAL_PATH), `${JSON.stringify(seal, null, 2)}\n`);
fs.writeFileSync(absolute(SEAL_MARKDOWN_PATH), sealMarkdown);
process.stdout.write(`${JSON.stringify({ status: qa.status, output: relative(OUT_PATH),
  qaPayloadSha256: qa.qaPayloadSha256, seal: relative(SEAL_PATH),
  commissioningSealSha256: seal.commissioningSealSha256, exactTransitionCount: 525,
  undeclaredDriftCount: qa.postState.preservation.undeclaredDriftCount,
  rollbackGuardCount: qa.executionEvidence.reverseRollbackPoststatePreflight.passedGuardCount,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2)}\n`);
