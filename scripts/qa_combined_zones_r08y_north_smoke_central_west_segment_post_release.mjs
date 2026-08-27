#!/usr/bin/env node
/** Read-only R08Y north-smoke central-west-segment post-release QA and bounded construction seal. */

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
const GENERATED_AT = value('--generated-at', '2026-08-22T00:25:00Z');
const EVIDENCE_DIR = value('--evidence-dir',
  'data/world-review/combined-zones-r08y-live-20260822T002056Z');
const LEDGER_PATH = value('--ledger', path.join(EVIDENCE_DIR, 'evidence-ledger.json'));
const MANIFEST_PATH = value('--manifest',
  'data/buildops/combined-zones-r08y-empty-eight-north-smoke-central-west-segment.release-manifest.json');
const POST_ROOT = value('--post-root', 'data/worldsnap-combined-zones-r08y-post-20260822T002056Z');
const QA_CANONICAL_PATH = path.join(EVIDENCE_DIR, 'r08y-post-release-qa.json');
const OUT_PATH = value('--out', QA_CANONICAL_PATH);
const MARKDOWN_PATH = value('--markdown', path.join(EVIDENCE_DIR, 'r08y-post-release-qa.md'));
const SEAL_PATH = value('--seal-out', path.join(EVIDENCE_DIR, 'r08y-bounded-north-smoke-central-west-segment-seal.json'));
const SEAL_MARKDOWN_PATH = value('--seal-markdown',
  path.join(EVIDENCE_DIR, 'r08y-bounded-north-smoke-central-west-segment-seal.md'));
const BASENAME = 'combined-zones-r08y-empty-eight-north-smoke-central-west-segment';
const RELEASE_NODE_ID = 'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT';
const WALL_KEY = 'ee-smoke-n-central-west-compartment-wall';
const CAP_KEY = 'ee-smoke-n-central-west-static-opening-cap';
const WALL_STATE = 'minecraft:stone_bricks';
const CAP_STATE = 'minecraft:polished_deepslate';
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const FLUID = /(?:water|bubble_column|lava)/;
const GRAVITY = /(?:^|:)(?:sand|red_sand|gravel|suspicious_sand|suspicious_gravel|(?:chipped_|damaged_)?anvil|dragon_egg|pointed_dripstone|scaffolding|[a-z_]+_concrete_powder)(?:\[|$)/;
const FORBIDDEN = /(?:chest|barrel|furnace|hopper|dispenser|dropper|spawner|lectern|brewing_stand|beacon|jukebox|beehive|bee_nest|decorated_pot|shulker_box|command_block|structure_block|jigsaw|redstone|repeater|comparator|piston|observer|lever|button|pressure_plate|tripwire|rail)/;
const EXPECTED = Object.freeze({
  ledgerFile: '6320acfcb0ec92f970058166071a6cf77e0262eff320665647e2c8851d0035b0',
  manifestFile: '8ebbc9e5f300655be41b1ed72ac8e3c83cac00c7c8bbd484107a4a10bcf69a8e',
  manifestIdentity: 'e6478ea5acb3487c76e925241efbbdba0ea3432dc3942703410778a3263636a6',
  sourceSave: '70eca26deeff6d5dd76e55dcaaae18b28fa0d8f43403fb42cb51aa40c42e25a5',
  sourceRegion: '5e6c95b5bb62bc580b9eeb7382e8f1c051770eb0965bbf98bcdb3b24a9bd8ed4',
  postSave: '0c33e28a59ed52c668f3989a2db9e8b2b0a549d63e3447a1dd04f444810e7196',
  postRegion: '805a90e09710c3a045a292aeefbacb3960ac86d719191da6a563cede6cdbc1a0',
  sourceBoundRelease: '133b33361b0d5100f8c9fd88d4d2f1c35ba633f3249800856d3e724566172df8',
  executionBinding: '2aeeaba2cc39d3b1b6a2717d0eebaa09d1f91101e2edda0b2164b1c65c9f4a50',
  completedRelease: '319ca6769a42d7e809e981cdc9ae1e2cbbab86f4ca1fcb26fc7bd3390d0dacdd',
  targetHash: '5cb6cc1c0e3dbfced74768d6b7ffaeb0cef4874f796c4d5fa0fc21a8af6e620f',
  wallHash: 'ac0a08108923be72af759c17d621c326898444bcd3a41d285dce9bb0e3f26fe5',
  capHash: '719cc3bb7535916b1cf6068ca33f579af673467ee9c5d0c1eb7fdf554bd9f66e',
  haloHash: '8db77eba7b8ecf12d84c7e3aff8125594e4a8556367e014355ff306f016e2f1f',
  evidenceCount: 25,
  stageCount: 24,
});
const N06_PATH = 'data/world-review/combined-zones-r08q-n06-gravity-blocker-20260821T184800Z.json';

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename));
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R08Y post-release QA rejected: ${message}`);
};
const fileBinding = (filename) => ({ path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))), bytes: fs.statSync(absolute(filename)).size });
const exactSet = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: boundsOf(exact), coordinateSetSha256: hashCells(exact) };
};
const faceHalo = (cells) => {
  const keys = new Set(cells.map(cellKey));
  return uniqueCells(cells.flatMap((cell) => FACE.map(([dx, dy, dz]) => ({
    x: cell.x + dx, y: cell.y + dy, z: cell.z + dz,
  }))).filter((cell) => !keys.has(cellKey(cell))));
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
function journalEvidence(filename, operationSha256, commandCount) {
  const records = fs.readFileSync(absolute(filename), 'utf8').trim().split(/\r?\n/).map(JSON.parse);
  invariant(records.every((record, index) => record.sequence === index + 1
    && record.operationSha256 === operationSha256), `${filename} sequence or operation binding drifted`);
  const final = records.at(-1);
  invariant(final.status === 'complete' && final.batch.status === 'completed-cleaned'
    && final.batch.completedGroupCount === commandCount, `${filename} did not complete cleanly`);
  return { ...fileBinding(filename), eventCount: records.length,
    finalSequence: final.sequence, completedGroupCount: final.batch.completedGroupCount,
    finalStatus: final.status };
}
const isHazard = (state) => FLUID.test(state) || GRAVITY.test(state) || FORBIDDEN.test(state);

const ledger = readJson(LEDGER_PATH);
const manifest = readJson(MANIFEST_PATH);
const n06 = readJson(N06_PATH);
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
  && manifest.mvpScope === true
  && JSON.stringify(manifest.scopeIds) === JSON.stringify(['OWN-D06-SMOKE', 'Z02-U1-CONCOURSE-MALL'])
  && sha256(JSON.stringify(manifestPayload)) === manifest.manifestIdentity,
'ledger/manifest binding or required MVP contract drifted');
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
  && JSON.stringify(forwardOrder) === JSON.stringify([WALL_KEY, CAP_KEY])
  && JSON.stringify(rollbackOrder) === JSON.stringify([CAP_KEY, WALL_KEY]),
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
  const executionPath = path.join(EVIDENCE_DIR, `${pkg.key}.forward-execution.json`);
  const execution = readJson(executionPath);
  const rollbackPreflight = readJson(path.join(EVIDENCE_DIR, `${pkg.key}.rollback-poststate-preflight.json`));
  const journal = journalEvidence(`${executionPath}.stream-journal.jsonl`,
    fileBinding(pkg.forward).sha256, forward.length);
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationRole === 'forward' && execution.executedCommandCount === forward.length
    && execution.successfulCommands === forward.length && execution.failedCommands === 0
    && execution.noopCommands === 0 && execution.worldEditLeftoverCount === 0
    && execution.forceLoadAudit.allRequiredChunksLoadedBeforeCommands === true
    && execution.forceLoadAudit.allTemporaryReleased === true
    && execution.forceLoadAudit.finalSetMatchesPreExistingSet === true
    && rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === rollback.length
    && rollbackPreflight.failed === 0 && rollbackPreflight.regionsSnapshot.sha256 === EXPECTED.postRegion,
  `${pkg.key} strict execution, journal, or rollback evidence failed`);
  executionPackages.push({ key: pkg.key, commandCount: forward.length,
    successfulCommands: execution.successfulCommands, failedCommands: execution.failedCommands,
    noopCommands: execution.noopCommands, rollbackGuardCount: rollbackPreflight.passed, journal });
}

const targetCells = uniqueCells(operations.map(({ cell }) => cell));
const targetKeys = new Set(targetCells.map(cellKey));
const wallCells = operations.filter(({ packageKey }) => packageKey === WALL_KEY).map(({ cell }) => cell);
const capCells = operations.filter(({ packageKey }) => packageKey === CAP_KEY).map(({ cell }) => cell);
const selected = cellsIn({ minX: 1703, maxX: 1735, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const fullPlane = cellsIn({ minX: 1652, maxX: 1847, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
const selectedHalo = faceHalo(targetCells);
const fullPlaneHalo = faceHalo(fullPlane);
invariant(operations.length === 231 && targetCells.length === 231
  && hashCells(targetCells) === EXPECTED.targetHash && hashCells(wallCells) === EXPECTED.wallHash
  && hashCells(capCells) === EXPECTED.capHash && selected.length === 231
  && hashCells(selected) === EXPECTED.targetHash && selectedHalo.length === 542
  && hashCells(selectedHalo) === EXPECTED.haloHash && fullPlane.length === 1372
  && fullPlaneHalo.length === 3150 && components(selected).componentCount === 1
  && components(selected).largestComponentCellCount === 231,
'operated, full-height, or halo geometry drifted');
invariant(capCells.length === 9 && capCells.every((cell) => cell.x >= 1720 && cell.x <= 1722
  && cell.y >= 49 && cell.y <= 51 && cell.z === 50), 'static cap geometry drifted');

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
for (const cell of uniqueCells([...fullPlane, ...fullPlaneHalo])) await readBoth(cell);
const transitionMismatch = operations.filter(({ cell, fromState, toState }) => (
  sourceStates.get(cellKey(cell)) !== fromState || postStates.get(cellKey(cell)) !== toState
));
const materialMismatch = operations.filter(({ packageKey, cell }) => postStates.get(cellKey(cell))
  !== (packageKey === WALL_KEY ? WALL_STATE : CAP_STATE));
const nonTargetPlane = fullPlane.filter((cell) => !targetKeys.has(cellKey(cell)));
const nonTargetPlaneDrift = nonTargetPlane.filter((cell) => sourceStates.get(cellKey(cell))
  !== postStates.get(cellKey(cell)));
const selectedHaloDrift = selectedHalo.filter((cell) => sourceStates.get(cellKey(cell))
  !== postStates.get(cellKey(cell)));
const fullPlaneHaloDrift = fullPlaneHalo.filter((cell) => sourceStates.get(cellKey(cell))
  !== postStates.get(cellKey(cell)));
const wetPlane = fullPlane.filter((cell) => FLUID.test(sourceStates.get(cellKey(cell))));
const wetPlaneDrift = wetPlane.filter((cell) => sourceStates.get(cellKey(cell))
  !== postStates.get(cellKey(cell)));
const haloGravel = fullPlaneHalo.filter((cell) => sourceStates.get(cellKey(cell)) === 'minecraft:gravel');
const haloGravelDrift = haloGravel.filter((cell) => postStates.get(cellKey(cell)) !== 'minecraft:gravel');
const n06Cells = n06.targetGravity.findings.map(({ cell }) => cell);
const n06Drift = n06Cells.filter((cell, index) => sourceStates.get(cellKey(cell))
  !== n06.targetGravity.findings[index].state || postStates.get(cellKey(cell))
  !== n06.targetGravity.findings[index].state);
invariant(transitionMismatch.length === 0 && materialMismatch.length === 0
  && nonTargetPlaneDrift.length === 0 && selectedHaloDrift.length === 0
  && fullPlaneHaloDrift.length === 0 && wetPlane.length === 6 && wetPlaneDrift.length === 0
  && haloGravel.length === 68 && haloGravelDrift.length === 0
  && n06Cells.length === 4 && n06Drift.length === 0,
'exact target, non-target plane, halo, wet, gravity, or N06 preservation failed');

const cleanRuns = [];
let runStart = null;
for (let x = 1652; x <= 1848; x += 1) {
  let clean = false;
  if (x <= 1847) {
    const column = cellsIn({ minX: x, maxX: x, minY: 48, maxY: 54, minZ: 50, maxZ: 50 });
    const envelope = [...column, ...faceHalo(column)];
    clean = column.every((cell) => sourceStates.get(cellKey(cell)) === 'minecraft:air')
      && envelope.every((cell) => !isHazard(sourceStates.get(cellKey(cell))));
  }
  if (clean && runStart === null) runStart = x;
  if (!clean && runStart !== null) {
    cleanRuns.push({ minX: runStart, maxX: x - 1, widthCells: x - runStart });
    runStart = null;
  }
}
cleanRuns.sort((a, b) => b.widthCells - a.widthCells || a.minX - b.minX);
invariant(JSON.stringify(cleanRuns) === JSON.stringify(manifest.scopeSelection.rankedCleanRuns)
  && cleanRuns[0].minX === 1703 && cleanRuns[0].maxX === 1735 && cleanRuns[0].widthCells === 33,
'maximal clean full-height central-west-segment proof drifted');

const postBlockEntities = [];
const postSavedEntities = [];
const envelopeKeys = new Set([...targetCells, ...selectedHalo].map(cellKey));
const envelopeBounds = boundsOf([...targetCells, ...selectedHalo]);
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
  status: 'PASS_R08Y_NORTH_SMOKE_CENTRAL_WEST_SEGMENT_POST_RELEASE_ACCEPTED',
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
    fullFrozenNorthPlane: exactSet(fullPlane),
    maximalSelectedCentralWestSegment: { ...exactSet(selected), ...components(selected),
      widthCells: 33, heightCells: 7, fullHeight: true },
    wallField: exactSet(wallCells),
    closedStaticCap: { ...exactSet(capCells), ...components(capCells), widthCells: 3, heightCells: 3 },
    selectedInteractionHalo: exactSet(selectedHalo),
    fullPlaneInteractionHalo: exactSet(fullPlaneHalo),
    rankedCleanRuns: cleanRuns,
  },
  postState: {
    exactTransitions: { expectedCellCount: 231, matchingCellCount: 231 - transitionMismatch.length,
      mismatchCellCount: transitionMismatch.length, stoneBrickWallCount: wallCells.length,
      polishedDeepslateCapCount: capCells.length, materialMismatchCount: materialMismatch.length },
    preservation: { unchangedNonTargetPlaneCellCount: nonTargetPlane.length - nonTargetPlaneDrift.length,
      nonTargetPlaneDriftCount: nonTargetPlaneDrift.length,
      unchangedSelectedHaloCellCount: selectedHalo.length - selectedHaloDrift.length,
      selectedHaloDriftCount: selectedHaloDrift.length,
      unchangedFullPlaneHaloCellCount: fullPlaneHalo.length - fullPlaneHaloDrift.length,
      fullPlaneHaloDriftCount: fullPlaneHaloDrift.length,
      retainedWetPlaneCellCount: wetPlane.length, wetPlaneDriftCount: wetPlaneDrift.length,
      retainedFullPlaneHaloGravelCount: haloGravel.length, haloGravelDriftCount: haloGravelDrift.length,
      retainedN06BlockedCellCount: n06Cells.length, n06DriftCount: n06Drift.length,
      postBlockEntityCount: postBlockEntities.length, postSavedEntityCount: postSavedEntities.length,
      undeclaredDriftCount: nonTargetPlaneDrift.length + fullPlaneHaloDrift.length,
    },
    maximality: { exactRankedCleanRunsReproduced: true, selectedLargestRun: cleanRuns[0],
      fullHeightColumnCount: 33, excludedFluidCellCount: wetPlane.length,
      excludedHaloGravelCellCount: haloGravel.length, excludedN06CellCount: n06Cells.length },
  },
  commissioningBoundary: {
    boundedStaticCentralWestSegmentAccepted: true,
    completeNorthSmokeBoundaryBuilt: false,
    passiveNorthSmokeBoundaryCommissioned: false,
    poweredSmokeControlCommissioned: false,
    wetOrGravityInterfaceOpened: false,
    n06Touched: false,
    publicRouteCommissioned: false,
  },
  executionEvidence: {
    stageOrder: { expectedStageCount: expectedStages.length, actualStageCount: ledger.stages.length,
      exact: true, allPass: true },
    strictForwardExecution: { packageCount: executionPackages.length,
      successfulCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.successfulCommands, 0),
      failedCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.failedCommands, 0),
      noopCommandCount: executionPackages.reduce((sum, pkg) => sum + pkg.noopCommands, 0), passed: true },
    journals: { packageCount: executionPackages.length,
      totalEventCount: executionPackages.reduce((sum, pkg) => sum + pkg.journal.eventCount, 0),
      allCompleteAndOperationBound: true },
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
  status: 'PASS_R08Y_BOUNDED_NORTH_SMOKE_CENTRAL_WEST_SEGMENT_ACCEPTED',
  release: qa.release,
  qa: { canonicalPath: relative(QA_CANONICAL_PATH), qaPayloadSha256: qa.qaPayloadSha256 },
  constructionScope: { exactTransitionCount: 231, fullHeightSegmentCellCount: 231,
    widthCells: 33, heightCells: 7, stoneBrickWallCellCount: 222,
    polishedDeepslateStaticCapCellCount: 9, unchangedInteractionHaloCellCount: 542,
    boundedStaticCentralWestSegmentAccepted: true, completeNorthSmokeBoundaryBuilt: false,
    passiveNorthSmokeBoundaryCommissioned: false, poweredSmokeControlCommissioned: false },
  retainedInterfaces: { wetPlaneCellCount: 6, fullPlaneHaloGravelCellCount: 68,
    n06BlockedCellCount: 4, allUnchanged: true },
  rollback: { exactGuardCount: 231, reversePackageOrder: rollbackOrder,
    poststatePreflightPassed: true },
  noLiveCallsPerformedByQa: true,
  noWorldEditsPerformedByQa: true,
};
seal.commissioningSealSha256 = sha256(JSON.stringify(seal));

const qaMarkdown = `# R08Y North-Smoke Central-West Segment Post-Release QA\n\n`
  + `Status: \`${qa.status}\`\n\n`
  + `- Exact transitions: 231/231 (222 stone bricks and one closed 9-cell polished-deepslate cap).\n`
  + `- Geometry: one maximal 33×7 full-height central-west segment; 542/542 selected-halo cells unchanged.\n`
  + `- Full north plane preservation: 1,141/1,141 non-target cells and 3,150/3,150 full-plane halo cells unchanged.\n`
  + `- Retained hazard bands: 6/6 wet plane cells, 68/68 halo gravel cells, and 4/4 N06 exception cells unchanged.\n`
  + `- Strict execution: 231 successes, zero failures/no-ops; journals complete; reverse rollback: 231/231 guards.\n`
  + `- Completed release identity: \`${ledger.completedReleaseIdentitySha256}\`.\n`
  + `- QA payload SHA-256: \`${qa.qaPayloadSha256}\`.\n\n`
  + `This seal accepts only the bounded static central-west segment. The complete north smoke boundary and all powered smoke-control behavior remain uncommissioned. The QA made no live call or world edit.\n`;
const sealMarkdown = `# R08Y Bounded North-Smoke Central-West-Segment Seal\n\n`
  + `Status: \`${seal.status}\`\n\n`
  + `The exact 231-cell, 33×7 static central-west segment and closed 3×3 cap are accepted against the immutable R08Y post save. All wet, gravel, and N06 interface bands remain unchanged; the full north smoke plane remains incomplete and uncommissioned.\n\n`
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
  commissioningSealSha256: seal.commissioningSealSha256,
  exactTransitionCount: 231,
  undeclaredDriftCount: qa.postState.preservation.undeclaredDriftCount,
  rollbackGuardCount: qa.executionEvidence.reverseRollbackPoststatePreflight.passedGuardCount,
  liveCallsPerformed: false, worldEditsPerformed: false }, null, 2)}\n`);
