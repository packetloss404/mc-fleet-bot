#!/usr/bin/env node
/** Read-only post-release seal for the executed CZ-R11E retry-v2 batch. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  blockName,
  classManifest,
  connectedComponents,
  isReplaceableSupport,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const LEDGER_PATH = value(
  '--ledger',
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/evidence-ledger.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.json',
);
const MD_PATH = value(
  '--markdown',
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/r11e-retry-v2-post-release-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-21T23:40:00Z');
const BASE_MANIFEST_PATH =
  'data/buildops/combined-zones-r11e-c1-disjoint-at-grade-islands-batch.release-manifest.json';
const EXPECTED = Object.freeze({
  transactionId:
    'combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch',
  ledgerSha256: '97b0a46b5ddd2b56c2864cf44e71746dbb186fddd5a2ccb19e5ea0cd7b2a562f',
  manifestSha256: 'db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee',
  manifestIdentity: '29b5c6fe848a1f9396de052ffda7b431357b78d676621d0307848b7b40f8f2bd',
  sourceCompleteSaveSha256: 'f7f5d8c3284de1e1f3617aa6f448f0e2362e33a57b8406d2b89615a29c007ced',
  sourceRegionSha256: '32ecfa3e5c0620a97892573b6791d059473248aab690fd1294063d9cca84d569',
  postCompleteSaveSha256: '0079adf895179606ad64a57ad0e85351c4e6ba3dbacb82a308b84a6909013109',
  postRegionSha256: 'e301aa16ef0db51b313d5c7d4a6b6b2e99343dd64787645b7f872d07268d1258',
  sourceBoundReleaseIdentity: '7fd811eecd18d14bccd5184b86435fcbac5dddeb06fc23af38e39761a110a7fa',
  completedReleaseIdentity: '33ef91973427f9f93a5cd4af5bfa4d059979064a43fd0eb9d2fa6db4f2af3ffb',
  targetCellCount: 1_593,
  targetCoordinateSetSha256: 'bfa786a846c26649358b373aa01043a037b68f423f2627e3b5739b210db79042',
  interactionHaloCellCount: 8_348,
  interactionHaloCoordinateSetSha256: 'ee8da75b55587f99b33697c169e3eb4ba61f13dfa86c0c3a2c8cd809fab98abf',
  omittedTargetCellCount: 2_389,
  omittedTargetCoordinateSetSha256: '8ed41b913bf84749d3f5bc1370fe9a1d191c48f7ddf3d3c6fc6a1a653b91cd57',
  omittedHaloCellCount: 10_238,
  omittedHaloCoordinateSetSha256: 'd931c7b05b131d2c5675b215eb8d78fb0faffed597a7999d63b6960b58a0a488',
  packageCount: 10,
  islandCount: 6,
  ledgerStageCount: 80,
  ledgerEvidenceBindingCount: 89,
});
const LIFECYCLE_POINT = Object.freeze({ x: 938, y: 96, z: 32 });
const OVERBURDEN_COLUMN = Object.freeze([
  { x: 938, y: 97, z: 32 },
  { x: 938, y: 98, z: 32 },
  { x: 938, y: 99, z: 32 },
  { x: 938, y: 100, z: 32 },
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11E retry-v2 post-release QA rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const repositoryPath = (filename) => {
  const relative = path.relative(ROOT, absolute(filename));
  return relative.startsWith('..') ? filename : relative;
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

function parseOperations(filename) {
  const records = [];
  const seen = new Set();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains an unsupported operation`);
    const from = fields.slice(1, 4).map(Number);
    const to = fields.slice(4, 7).map(Number);
    invariant(from.every((coordinate, index) => coordinate === to[index]),
      `${filename} contains a non-point target`);
    const cell = { x: from[0], y: from[1], z: from[2] };
    invariant(!seen.has(cellKey(cell)), `${filename} duplicates ${cellKey(cell)}`);
    seen.add(cellKey(cell));
    records.push({ cell, sourceState: fields[7], targetState: fields[8] });
  }
  return records;
}

const ledgerBytes = fs.readFileSync(absolute(LEDGER_PATH));
const ledger = JSON.parse(ledgerBytes);
invariant(sha256(ledgerBytes) === EXPECTED.ledgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.transactionId === EXPECTED.transactionId
  && ledger.sourceBoundReleaseIdentitySha256 === EXPECTED.sourceBoundReleaseIdentity
  && ledger.completedReleaseIdentitySha256 === EXPECTED.completedReleaseIdentity,
'ledger identity or terminal status drifted');
invariant(ledger.stages.length === EXPECTED.ledgerStageCount
  && ledger.stages.every(({ status }) => status === 'PASS')
  && ledger.evidenceBindings.length === EXPECTED.ledgerEvidenceBindingCount,
'ledger stage/evidence totals drifted');
for (const binding of ledger.evidenceBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(bytes.length === binding.bytes && sha256(bytes) === binding.sha256,
    `ledger evidence binding drifted: ${binding.path}`);
}

const manifestBytes = fs.readFileSync(absolute(ledger.manifest.path));
const manifest = JSON.parse(manifestBytes);
const { manifestIdentity, ...manifestPayload } = manifest;
invariant(ledger.manifest.sha256 === EXPECTED.manifestSha256
  && sha256(manifestBytes) === EXPECTED.manifestSha256
  && manifestIdentity === EXPECTED.manifestIdentity
  && manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'frozen manifest binding or payload identity drifted');
invariant(manifest.packages.length === EXPECTED.packageCount
  && manifest.scope.includedIslands.length === EXPECTED.islandCount
  && manifest.scope.omittedEntityInterfaceIslands.length === 1
  && manifest.scope.excludedAtGradeRanges.length === 2
  && manifest.scope.heldTreatmentMutationCount === 0
  && manifest.scope.corridorConnectivityClaimed === false,
'package/island/exclusion contract drifted');

const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
invariant(sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && samePath(sourceIdentity.directory, path.join(ledger.sourceSnapshot.root, 'region')),
'immutable source identity drifted');
invariant(postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256
  && samePath(postIdentity.directory, path.join(ledger.postSnapshot.root, 'region')),
'immutable post identity drifted');

const sourceReader = new AnvilReader(absolute(path.join(ledger.sourceSnapshot.root, 'region')));
const postReader = new AnvilReader(absolute(path.join(ledger.postSnapshot.root, 'region')));
const sourceCache = new Map();
const postCache = new Map();
const stateAt = async (reader, cache, cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return cache.get(key);
};
const sourceAt = (cell) => stateAt(sourceReader, sourceCache, cell);
const postAt = (cell) => stateAt(postReader, postCache, cell);

const records = [];
const targetKeys = new Set();
const packageRecords = new Map();
let exactInverseRecordCount = 0;
for (const pkg of manifest.packages) {
  const forward = parseOperations(pkg.forward);
  const rollback = parseOperations(pkg.rollback);
  invariant(forward.length === manifest.operations[pkg.key].targetCellCount
    && rollback.length === forward.length,
  `${pkg.key} operation count drifted`);
  for (let index = 0; index < forward.length; index += 1) {
    const record = forward[index];
    const inverse = rollback[rollback.length - index - 1];
    invariant(cellKey(record.cell) === cellKey(inverse.cell)
      && record.sourceState === inverse.targetState
      && record.targetState === inverse.sourceState,
    `${pkg.key} rollback is not reverse exact at ${index}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package target overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key, island: manifest.operations[pkg.key].island });
    exactInverseRecordCount += 1;
  }
  packageRecords.set(pkg.key, forward);
}
invariant(records.length === EXPECTED.targetCellCount
  && exactInverseRecordCount === EXPECTED.targetCellCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256,
'operated target union or inverse count drifted');

const sourceMismatches = [];
const postMismatches = [];
for (const record of records) {
  const [sourceState, postState] = await Promise.all([
    sourceAt(record.cell), postAt(record.cell),
  ]);
  if (sourceState !== record.sourceState) sourceMismatches.push({ ...record, sourceState });
  if (postState !== record.targetState) postMismatches.push({ ...record, postState });
}
invariant(sourceMismatches.length === 0 && postMismatches.length === 0,
  `exact source/post transition mismatch: ${JSON.stringify({
    source: sourceMismatches.slice(0, 3), post: postMismatches.slice(0, 3),
  })}`);

const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const islandReports = [];
const allSurface = [];
for (const island of manifest.scope.includedIslands) {
  const islandRecords = records.filter((record) => record.island === island.key);
  const surface = islandRecords.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
  const pavementRecords = islandRecords.filter((record) => (
    manifest.operations[record.packageKey].role === 'foundation/headroom/pavement'
  ));
  const foundation = pavementRecords.filter(
    ({ targetState }) => targetState === 'minecraft:stone_bricks',
  );
  const headroomCuts = pavementRecords.filter(({ targetState }) => targetState === 'minecraft:air');
  const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  const headroomFailures = [];
  for (const cell of fullHeadroom) {
    const state = await postAt(cell);
    if (!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(state)) {
      headroomFailures.push({ cell, state });
    }
  }
  const stableContacts = [];
  const stableContactFailures = [];
  for (const { cell } of surface) {
    let contact = { x: cell.x, y: cell.y - 1, z: cell.z };
    let sourceContactState = await sourceAt(contact);
    while (isReplaceableSupport(sourceContactState)) {
      contact = { x: contact.x, y: contact.y - 1, z: contact.z };
      sourceContactState = await sourceAt(contact);
    }
    stableContacts.push(contact);
    const postContactState = await postAt(contact);
    if (['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
      'minecraft:water', 'minecraft:lava', 'minecraft:gravel'].includes(blockName(postContactState))) {
      stableContactFailures.push({ cell, contact, sourceContactState, postContactState });
    }
  }
  invariant(islandRecords.length === island.geometry.operatedUnion.cellCount
    && hashCells(islandRecords.map(({ cell }) => cell))
      === island.geometry.operatedUnion.coordinateSetSha256
    && surface.length === island.geometry.pavementSurface.cellCount
    && hashCells(surface.map(({ cell }) => cell))
      === island.geometry.pavementSurface.coordinateSetSha256
    && foundation.length === island.geometry.exactFoundationFill.cellCount
    && hashCells(foundation.map(({ cell }) => cell))
      === island.geometry.exactFoundationFill.coordinateSetSha256
    && headroomCuts.length === island.geometry.exactHeadroomCuts.cellCount
    && hashCells(headroomCuts.map(({ cell }) => cell))
      === island.geometry.exactHeadroomCuts.coordinateSetSha256
    && fullHeadroom.length === island.geometry.fullTwoBlockHeadroom.cellCount
    && hashCells(fullHeadroom) === island.geometry.fullTwoBlockHeadroom.coordinateSetSha256
    && hashCells(stableContacts)
      === island.geometry.stableFoundationContacts.coordinateSetSha256
    && connectedComponents(surface.map(({ cell }) => cell)).length === 1
    && headroomFailures.length === 0
    && stableContactFailures.length === 0,
  `${island.key} post geometry/headroom/support failed: ${JSON.stringify({
    operated: classManifest(islandRecords.map(({ cell }) => cell)),
    expectedOperated: island.geometry.operatedUnion,
    surface: classManifest(surface.map(({ cell }) => cell)),
    expectedSurface: island.geometry.pavementSurface,
    foundation: classManifest(foundation.map(({ cell }) => cell)),
    expectedFoundation: island.geometry.exactFoundationFill,
    headroomCuts: classManifest(headroomCuts.map(({ cell }) => cell)),
    expectedHeadroomCuts: island.geometry.exactHeadroomCuts,
    fullHeadroom: classManifest(fullHeadroom),
    expectedFullHeadroom: island.geometry.fullTwoBlockHeadroom,
    stableContacts: classManifest(stableContacts),
    expectedStableContacts: island.geometry.stableFoundationContacts,
    surfaceComponents: connectedComponents(surface.map(({ cell }) => cell)).length,
    headroomFailureCount: headroomFailures.length,
    stableContactFailureCount: stableContactFailures.length,
  })}`);
  allSurface.push(...surface.map(({ cell }) => cell));
  islandReports.push({
    key: island.key,
    stations: island.stations,
    exactTargetStateCount: islandRecords.length,
    connectedSurfaceCellCount: surface.length,
    connectedSurfaceComponentCount: 1,
    foundationFillCount: foundation.length,
    fullHeadroomAirCount: fullHeadroom.length,
    stableFoundationContactCount: stableContacts.length,
    routeCommissioned: false,
  });
}
invariant(connectedComponents(allSurface).length === EXPECTED.islandCount,
'the six isolated pavement surfaces unexpectedly connect across a held gap');

const interactionHalo = uniqueCells(records.flatMap(({ cell }) => {
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
invariant(interactionHalo.length === EXPECTED.interactionHaloCellCount
  && hashCells(interactionHalo) === EXPECTED.interactionHaloCoordinateSetSha256,
'selected interaction-halo identity drifted');
const haloOnlyDiffs = [];
for (const cell of interactionHalo) {
  if (targetKeys.has(cellKey(cell))) continue;
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (sourceState !== postState) haloOnlyDiffs.push({ cell, sourceState, postState });
}
invariant(JSON.stringify(haloOnlyDiffs) === JSON.stringify([{
  cell: LIFECYCLE_POINT,
  sourceState: 'minecraft:grass_block[snowy=false]',
  postState: 'minecraft:dirt',
}]),
'interaction halo contains an undeclared or unexpected non-target drift');
for (const cell of OVERBURDEN_COLUMN) {
  const record = records.find((candidate) => cellKey(candidate.cell) === cellKey(cell));
  invariant(record?.sourceState === 'minecraft:air'
    && record.targetState === 'minecraft:stone_bricks'
    && await postAt(cell) === 'minecraft:stone_bricks',
  `declared opaque overburden causality drifted at ${cellKey(cell)}`);
}

const base = readJson(BASE_MANIFEST_PATH);
const omittedDescriptor = manifest.scope.omittedEntityInterfaceIslands[0];
const omittedBase = base.scope.includedIslands.find(({ key }) => key === omittedDescriptor.key);
const omittedPackages = base.packages.filter(
  ({ key }) => base.operations[key].island === omittedDescriptor.key,
);
const omittedTargets = omittedPackages.flatMap(({ forward }) => (
  parseOperations(forward).map(({ cell }) => cell)
));
const omittedTargetKeys = new Set(omittedTargets.map(cellKey));
invariant(omittedTargets.length === EXPECTED.omittedTargetCellCount
  && hashCells(omittedTargets) === EXPECTED.omittedTargetCoordinateSetSha256
  && omittedTargets.every((cell) => !targetKeys.has(cellKey(cell))),
'omitted sheep-island target identity or disjointness failed');
const omittedHalo = uniqueCells(omittedTargets.flatMap((cell) => {
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
invariant(omittedHalo.length === EXPECTED.omittedHaloCellCount
  && hashCells(omittedHalo) === EXPECTED.omittedHaloCoordinateSetSha256
  && hashCells(omittedHalo) === omittedBase.geometry.interactionHalo.coordinateSetSha256,
'omitted sheep-island interaction-halo identity drifted');
const omittedHaloDiffs = [];
for (const cell of omittedHalo) {
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (sourceState !== postState) omittedHaloDiffs.push({ cell, sourceState, postState });
}
invariant(omittedHaloDiffs.length === 0,
  `omitted sheep-island halo changed: ${JSON.stringify(omittedHaloDiffs.slice(0, 3))}`);

const expectedSheepIds = new Set(omittedDescriptor.protectedSheep.map(
  ({ uuidIntArray }) => uuidIntArray.join(','),
));
const collectProtectedSheep = async (snapshotRoot) => {
  const reader = new AnvilReader(absolute(path.join(snapshotRoot, 'entities')));
  const found = [];
  for (let cx = Math.floor((omittedBase.geometry.interactionHalo.bounds.minX - 16) / 16);
    cx <= Math.floor((omittedBase.geometry.interactionHalo.bounds.maxX + 16) / 16); cx += 1) {
    for (let cz = Math.floor((omittedBase.geometry.interactionHalo.bounds.minZ - 16) / 16);
      cz <= Math.floor((omittedBase.geometry.interactionHalo.bounds.maxZ + 16) / 16); cz += 1) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        const uuid = entity.UUID?.map(Number);
        if (!expectedSheepIds.has(uuid?.join(','))) continue;
        found.push({
          id: entity.id,
          uuidIntArray: uuid,
          position: entity.Pos?.map(Number),
          health: Number(entity.Health),
          completeNbtSha256: sha256(JSON.stringify(entity)),
          serializedNbt: JSON.stringify(entity),
        });
      }
    }
  }
  return found.sort((left, right) => (
    left.uuidIntArray.join(',').localeCompare(right.uuidIntArray.join(','))
  ));
};
const sourceSheep = await collectProtectedSheep(ledger.sourceSnapshot.root);
const postSheep = await collectProtectedSheep(ledger.postSnapshot.root);
invariant(sourceSheep.length === 3 && postSheep.length === 3
  && sourceSheep.every(({ id }) => id === 'minecraft:sheep')
  && JSON.stringify(sourceSheep) === JSON.stringify(postSheep),
'protected sheep identity/NBT changed or a sheep is missing');

const evidenceDirectory = path.dirname(LEDGER_PATH);
const packageEvidence = [];
let successfulExecutionGroupCount = 0;
let rollbackGuardPassCount = 0;
let executionJournalCount = 0;
for (const pkg of manifest.packages) {
  const expectedCount = packageRecords.get(pkg.key).length;
  const executionPath = `${evidenceDirectory}/${pkg.key}.forward-execution.json`;
  const journalPath = `${executionPath}.stream-journal.jsonl`;
  const rollbackPreflightPath = `${evidenceDirectory}/${pkg.key}.rollback-poststate-preflight.json`;
  const forwardPreflightPath = `${evidenceDirectory}/${pkg.key}.forward-source-preflight.json`;
  const entityClearancePath = `${evidenceDirectory}/${pkg.key}.same-moment-entity-clearance.json`;
  const execution = readJson(executionPath);
  const rollbackPreflight = readJson(rollbackPreflightPath);
  const forwardPreflight = readJson(forwardPreflightPath);
  const entityClearance = readJson(entityClearancePath);
  const journalBytes = fs.readFileSync(absolute(journalPath));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.operationSha256 === sha256(fs.readFileSync(absolute(pkg.forward)))
    && execution.sourceOperationCount === expectedCount
    && execution.successfulGroups === expectedCount
    && execution.failedGroups === 0
    && execution.unexpectedNoopCommands === 0
    && execution.worldEditLeftoverCount === 0
    && execution.streamJournalSha256 === sha256(journalBytes),
  `${pkg.key} strict execution/journal evidence failed`);
  invariant(forwardPreflight.status === 'PASS'
    && forwardPreflight.passed === expectedCount && forwardPreflight.failed === 0,
  `${pkg.key} forward source preflight failed`);
  invariant(rollbackPreflight.status === 'PASS'
    && rollbackPreflight.opsSha256 === sha256(fs.readFileSync(absolute(pkg.rollback)))
    && rollbackPreflight.passed === expectedCount && rollbackPreflight.failed === 0,
  `${pkg.key} rollback poststate preflight failed`);
  invariant(entityClearance.status === 'PASS'
    && entityClearance.passed === true
    && entityClearance.totals.packages === 1
    && entityClearance.totals.blockingEntityHits === 0,
  `${pkg.key} same-moment entity clearance failed`);
  successfulExecutionGroupCount += execution.successfulGroups;
  rollbackGuardPassCount += rollbackPreflight.passed;
  executionJournalCount += 1;
  packageEvidence.push({
    key: pkg.key,
    targetCellCount: expectedCount,
    successfulExecutionGroupCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackPreflight.passed,
    executionJournalSha256: execution.streamJournalSha256,
  });
}
invariant(successfulExecutionGroupCount === EXPECTED.targetCellCount
  && rollbackGuardPassCount === EXPECTED.targetCellCount
  && executionJournalCount === EXPECTED.packageCount,
'aggregate execution/rollback/journal totals failed');

const liveEntityClearance = readJson(`${evidenceDirectory}/live-entity-clearance.json`);
const blockEntityClearance = readJson(`${evidenceDirectory}/block-entity-clearance.json`);
invariant(liveEntityClearance.status === 'PASS'
  && liveEntityClearance.totals.packages === EXPECTED.packageCount
  && liveEntityClearance.totals.blockingEntityHits === 0
  && blockEntityClearance.status === 'PASS'
  && blockEntityClearance.operationCount === EXPECTED.targetCellCount
  && blockEntityClearance.blockingBlockEntityCount === 0,
'aggregate live/block-entity clearance failed');

const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_WITH_ONE_EXACT_BENIGN_SHADED_GRASS_LIFECYCLE_TRANSITION',
  mode: 'READ_ONLY_POST_RELEASE_SEAL',
  release: {
    transactionId: ledger.transactionId,
    manifestPath: ledger.manifest.path,
    manifestSha256: EXPECTED.manifestSha256,
    manifestIdentitySha256: manifestIdentity,
    ledgerPath: repositoryPath(LEDGER_PATH),
    ledgerSha256: EXPECTED.ledgerSha256,
    sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
  },
  snapshots: {
    sourceRoot: ledger.sourceSnapshot.root,
    sourceCompleteSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    postRoot: ledger.postSnapshot.root,
    postCompleteSaveSha256: EXPECTED.postCompleteSaveSha256,
    postRegionSha256: EXPECTED.postRegionSha256,
  },
  checks: {
    ledgerStageCount: ledger.stages.length,
    ledgerEvidenceBindingCount: ledger.evidenceBindings.length,
    packageCount: manifest.packages.length,
    includedIslandCount: islandReports.length,
    exactSourceStateCount: records.length - sourceMismatches.length,
    exactTargetStateCount: records.length - postMismatches.length,
    exactInverseRecordCount,
    connectedSurfaceComponentCount: connectedComponents(allSurface).length,
    interactionHaloCellCount: interactionHalo.length,
    declaredNaturalLifecycleHaloTransitionCount: haloOnlyDiffs.length,
    undeclaredHaloDriftCount: 0,
    omittedSheepIslandTargetCount: omittedTargets.length,
    omittedSheepIslandHaloCellCount: omittedHalo.length,
    omittedSheepIslandHaloDriftCount: omittedHaloDiffs.length,
    protectedSheepCount: postSheep.length,
    protectedSheepNbtDriftCount: 0,
    excludedWetRangeCount: manifest.scope.excludedAtGradeRanges.length,
    heldTreatmentMutationCount: manifest.scope.heldTreatmentMutationCount,
    successfulExecutionGroupCount,
    executionJournalCount,
    rollbackGuardPassCount,
    liveEntityBlockingHitCount: liveEntityClearance.totals.blockingEntityHits,
    blockEntityBlockingHitCount: blockEntityClearance.blockingBlockEntityCount,
    corridorConnectivityClaimed: manifest.scope.corridorConnectivityClaimed,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  acceptedNaturalLifecycleTransition: {
    cell: LIFECYCLE_POINT,
    sourceState: haloOnlyDiffs[0].sourceState,
    postState: haloOnlyDiffs[0].postState,
    classification: 'BENIGN_NATURAL_GRASS_DECAY_UNDER_DECLARED_OPAQUE_FOUNDATION',
    operatedTarget: false,
    directOverburdenCell: OVERBURDEN_COLUMN[0],
    declaredOverburdenColumn: OVERBURDEN_COLUMN,
    rollbackOperationReadinessAffected: false,
    sourceAndPostSnapshotsClaimedByteIdentical: false,
  },
  packages: packageEvidence,
  islands: islandReports,
  protectedSheep: postSheep.map(({ serializedNbt, ...sheep }) => sheep),
  exclusions: {
    omittedEntityInterfaceIsland: omittedDescriptor.key,
    omittedEntityInterfaceDisposition: omittedDescriptor.disposition,
    excludedAtGradeRanges: manifest.scope.excludedAtGradeRanges,
    noConnectivityAcrossHolds: true,
  },
  identities: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    interactionHalo: classManifest(interactionHalo),
    omittedSheepIslandTargets: classManifest(omittedTargets),
    omittedSheepIslandInteractionHalo: classManifest(omittedHalo),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const totalSurface = islandReports.reduce(
  (sum, island) => sum + island.connectedSurfaceCellCount, 0,
);
const totalHeadroom = islandReports.reduce(
  (sum, island) => sum + island.fullHeadroomAirCount, 0,
);
const markdown = `# CZ-R11E retry-v2 post-release QA\n\n`
  + `**Status:** ${report.status}  \n`
  + `**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `- Exact target transitions: ${records.length}/${records.length} across ${manifest.packages.length} packages.\n`
  + `- Six isolated connected pavement surfaces: ${totalSurface} surface cells; no connectivity claimed across holds.\n`
  + `- Full two-block headroom: ${totalHeadroom}/${totalHeadroom}; every surface has stable foundation contact.\n`
  + `- Selected interaction halo: ${interactionHalo.length} cells with one exact benign grass-to-dirt lifecycle transition beneath declared opaque foundation and zero undeclared drift.\n`
  + `- Omitted sheep island: ${omittedTargets.length} targets and ${omittedHalo.length}-cell halo unchanged; all three sheep retain byte-identical complete NBT.\n`
  + `- Strict execution: ${successfulExecutionGroupCount}/${records.length}; journaled packages: ${executionJournalCount}; rollback guards: ${rollbackGuardPassCount}/${records.length}.\n`
  + `- The two wet at-grade ranges and every deferred treatment remain untouched; the corridor remains uncommissioned across holds.\n`;
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(MD_PATH), markdown);
console.log(JSON.stringify({
  status: report.status,
  report: OUT_PATH,
  markdown: MD_PATH,
  qaPayloadSha256,
  checks: report.checks,
}, null, 2));
