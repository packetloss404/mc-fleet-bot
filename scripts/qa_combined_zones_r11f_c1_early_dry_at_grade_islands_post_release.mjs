#!/usr/bin/env node
/** Independent read-only post-release seal for CZ-R11F. */

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
  canonicalSurface,
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
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/evidence-ledger.json',
);
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.json',
);
const MD_PATH = value(
  '--markdown',
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/r11f-post-release-qa.md',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T00:10:00Z');
const INVENTORY_PATH =
  'data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json';
const R11E_INVENTORY_PATH =
  'data/world-review/combined-zones-r11e-inventory-20260821T194000Z.json';
const R11E_BASE_MANIFEST_PATH =
  'data/buildops/combined-zones-r11e-c1-disjoint-at-grade-islands-batch.release-manifest.json';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const EXPECTED = Object.freeze({
  transactionId: 'combined-zones-r11f-c1-early-dry-at-grade-islands',
  ledgerSha256: '2e021ad9ee6bbab97ccc5150ca240876f0e66956fc676171140084566a2deabe',
  manifestSha256: '96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584',
  manifestIdentity: 'dac26f1c94dd1abb7f00ecf18e99d88dda5d8184b290d2fb06986a4c25b5bbd2',
  sourceCompleteSaveSha256: 'e022df5aea3fa880f87a6f723cfa823034bad955ea408b29c66400c16d2a929a',
  sourceRegionSha256: '090c57ff2fc4b869dc04d76ca744afa0bec6ce299255c0a76af2e784c76701ed',
  postCompleteSaveSha256: '14f4f7a055d682d77c7e4330514c1b77bc21fc35af52cc99ea5a60bfab29f918',
  postRegionSha256: '029ba78c1de35a125f7d103c6073282b7df75de61499d7be4f4fcd318b6a6962',
  sourceBoundReleaseIdentity: '0a34486ad5e6e9186d6699588860f9421b8be481cd15374cd40d6a17e2db891a',
  completedReleaseIdentity: 'a7f8c5d9f9fa81df360c146e79287ed4eba03b2128f6af428490943d3d565c86',
  inventorySha256: '542432912cc14ed1a1a9f3918dc9deaf64cc7a9762f0adc085e347f325f03021',
  targetCellCount: 1_639,
  targetCoordinateSetSha256: '2b4e2ee530e848107f993db8138f027b75fb6074a186c46a91d16c01ddc277b6',
  interactionHaloCellCount: 4_419,
  interactionHaloCoordinateSetSha256: '7518cbdd7872a959a126da1c2b2b5ec3820a27604e3d59d6319b9d33c5e555d5',
  packageCount: 3,
  islandCount: 2,
  ledgerStageCount: 31,
  ledgerEvidenceBindingCount: 33,
  surfaceCellCount: 551,
});
const LIFECYCLE_TRANSITIONS = Object.freeze([
  { cell: { x: 515, y: 73, z: 79 }, overburden: { x: 515, y: 74, z: 79 } },
  { cell: { x: 515, y: 74, z: 68 }, overburden: { x: 515, y: 75, z: 68 } },
  { cell: { x: 518, y: 74, z: 66 }, overburden: { x: 518, y: 75, z: 66 } },
  { cell: { x: 518, y: 74, z: 74 }, overburden: { x: 518, y: 75, z: 74 } },
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11F post-release QA rejected: ${message}`);
};
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const repositoryPath = (filename) => {
  const relative = path.relative(ROOT, absolute(filename));
  return relative.startsWith('..') ? filename : relative;
};

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
'ledger identity/terminal status drifted');
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
invariant(sha256(manifestBytes) === EXPECTED.manifestSha256
  && ledger.manifest.sha256 === EXPECTED.manifestSha256
  && manifestIdentity === EXPECTED.manifestIdentity
  && manifestIdentity === sha256(JSON.stringify(manifestPayload)),
'frozen manifest binding drifted');
const sourceIdentity = readJson(ledger.sourceSnapshot.identity.path);
const postIdentity = readJson(ledger.postSnapshot.identity.path);
const sourceIntake = readJson(ledger.sourceSnapshot.completeSaveIntake.path);
const postIntake = readJson(ledger.postSnapshot.completeSaveIntake.path);
invariant(ledger.sourceSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceIntake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIntake.packageIdentity.completeSaveSha256 === EXPECTED.postCompleteSaveSha256
  && postIdentity.sha256 === EXPECTED.postRegionSha256,
'source/post snapshot identity drifted');

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
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    records.push({ ...record, packageKey: pkg.key, island: manifest.operations[pkg.key].island });
    exactInverseRecordCount += 1;
  }
  packageRecords.set(pkg.key, forward);
}
invariant(records.length === EXPECTED.targetCellCount
  && exactInverseRecordCount === EXPECTED.targetCellCount
  && hashCells(records.map(({ cell }) => cell)) === EXPECTED.targetCoordinateSetSha256,
'operated union/inverse identity drifted');
const sourceMismatches = [];
const postMismatches = [];
for (const record of records) {
  const [sourceState, postState] = await Promise.all([sourceAt(record.cell), postAt(record.cell)]);
  if (sourceState !== record.sourceState) sourceMismatches.push({ ...record, sourceState });
  if (postState !== record.targetState) postMismatches.push({ ...record, postState });
}
invariant(sourceMismatches.length === 0 && postMismatches.length === 0,
  `source/post target mismatch: ${JSON.stringify({
    source: sourceMismatches.slice(0, 3), post: postMismatches.slice(0, 3),
  })}`);

const surfaceNames = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_stone', 'minecraft:yellow_concrete',
]);
const islandReports = [];
const allSurface = [];
for (const island of manifest.scope.includedIslands) {
  const islandRecords = records.filter((record) => record.island === island.key);
  const pavement = islandRecords.filter(
    (record) => manifest.operations[record.packageKey].role === 'foundation/headroom/pavement',
  );
  const surface = islandRecords.filter(({ targetState }) => surfaceNames.has(blockName(targetState)));
  const foundation = pavement.filter(({ targetState }) => targetState === 'minecraft:stone_bricks');
  const headroomCuts = pavement.filter(({ targetState }) => targetState === 'minecraft:air');
  const fullHeadroom = uniqueCells(surface.flatMap(({ cell }) => [
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  let fullHeadroomAirCount = 0;
  for (const cell of fullHeadroom) {
    if (['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(await postAt(cell))) {
      fullHeadroomAirCount += 1;
    }
  }
  const contacts = [];
  let stableContactCount = 0;
  for (const { cell } of surface) {
    let contact = { x: cell.x, y: cell.y - 1, z: cell.z };
    let sourceState = await sourceAt(contact);
    while (isReplaceableSupport(sourceState)) {
      contact = { x: contact.x, y: contact.y - 1, z: contact.z };
      sourceState = await sourceAt(contact);
    }
    contacts.push(contact);
    const postState = await postAt(contact);
    if (!['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
      'minecraft:water', 'minecraft:lava', 'minecraft:gravel'].includes(blockName(postState))) {
      stableContactCount += 1;
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
    && hashCells(contacts) === island.geometry.stableFoundationContacts.coordinateSetSha256
    && connectedComponents(surface.map(({ cell }) => cell)).length === 1
    && fullHeadroomAirCount === fullHeadroom.length
    && stableContactCount === contacts.length,
  `${island.key} geometry/headroom/support failed`);
  allSurface.push(...surface.map(({ cell }) => cell));
  islandReports.push({
    key: island.key,
    stations: island.stations,
    exactTargetStateCount: islandRecords.length,
    connectedSurfaceCellCount: surface.length,
    connectedSurfaceComponentCount: 1,
    foundationFillCount: foundation.length,
    fullHeadroomAirCount,
    stableFoundationContactCount: stableContactCount,
    retainedLeafCount: island.geometry.removalInfluencedRetainedLeaves.cellCount,
    retainedLogDistanceCensus: island.geometry.projectedRetainedLogDistanceCensus,
    routeCommissioned: false,
  });
}
invariant(allSurface.length === EXPECTED.surfaceCellCount
  && connectedComponents(allSurface).length === EXPECTED.islandCount,
'two-island surface partition drifted');

const interactionHalo = uniqueCells(records.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
invariant(interactionHalo.length === EXPECTED.interactionHaloCellCount
  && hashCells(interactionHalo) === EXPECTED.interactionHaloCoordinateSetSha256,
'interaction-halo identity drifted');
const haloOnlyDiffs = [];
for (const cell of interactionHalo) {
  if (targetKeys.has(cellKey(cell))) continue;
  const [sourceState, postState] = await Promise.all([sourceAt(cell), postAt(cell)]);
  if (sourceState !== postState) haloOnlyDiffs.push({ cell, sourceState, postState });
}
const expectedDiffs = LIFECYCLE_TRANSITIONS.map(({ cell }) => ({
  cell, sourceState: 'minecraft:grass_block[snowy=false]', postState: 'minecraft:dirt',
}));
invariant(JSON.stringify(haloOnlyDiffs) === JSON.stringify(expectedDiffs),
'selected halo contains an undeclared lifecycle or operation drift');
for (const transition of LIFECYCLE_TRANSITIONS) {
  const overburden = records.find(
    ({ cell }) => cellKey(cell) === cellKey(transition.overburden),
  );
  invariant(overburden?.targetState === 'minecraft:stone_bricks'
    && await postAt(transition.overburden) === 'minecraft:stone_bricks',
  `shaded-grass causality drifted at ${cellKey(transition.cell)}`);
}

const inventoryBytes = fs.readFileSync(absolute(INVENTORY_PATH));
const inventory = JSON.parse(inventoryBytes);
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256,
'R11F frozen inventory drifted');
const blocked = inventory.ranges.find(({ key }) => key === 'island-0-10');
const blockedRecords = [...blocked.records.dependencies, ...blocked.records.pavement];
const blockedHalo = uniqueCells(blockedRecords.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
invariant(hashCells(blockedRecords.map(({ cell }) => cell)) === blocked.operated.coordinateSetSha256
  && hashCells(blockedHalo) === blocked.halo.coordinateSetSha256,
'excluded early range identity drifted');
let excludedEarlyDriftCount = 0;
for (const cell of blockedHalo) {
  if (await sourceAt(cell) !== await postAt(cell)) excludedEarlyDriftCount += 1;
}
invariant(excludedEarlyDriftCount === 0, 'excluded early hydraulic range changed');

const r11eInventory = readJson(R11E_INVENTORY_PATH);
const wetRangeReports = [];
for (const key of ['island-952-1139', 'island-1189-1206']) {
  const range = r11eInventory.ranges.find((candidate) => candidate.key === key);
  const bounds = range.halo.bounds;
  let reviewCellCount = 0;
  let driftCount = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        const cell = { x, y, z };
        reviewCellCount += 1;
        if (await sourceAt(cell) !== await postAt(cell)) driftCount += 1;
      }
    }
  }
  invariant(driftCount === 0, `${key} wet hold review envelope changed`);
  wetRangeReports.push({ key, frozenHalo: range.halo, reviewBounds: bounds,
    reviewCellCount, driftCount });
}

const base = readJson(R11E_BASE_MANIFEST_PATH);
const sheepDescriptor = manifest.scope.preservedR11EExclusions.omittedEntityInterfaceIslands[0];
const sheepBase = base.scope.includedIslands.find(({ key }) => key === sheepDescriptor.key);
const sheepTargets = base.packages.filter(
  ({ key }) => base.operations[key].island === sheepDescriptor.key,
).flatMap(({ forward }) => parseOperations(forward).map(({ cell }) => cell));
const sheepHalo = uniqueCells(sheepTargets.flatMap((cell) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
invariant(hashCells(sheepHalo) === sheepBase.geometry.interactionHalo.coordinateSetSha256,
'omitted sheep-island halo identity drifted');
let sheepHaloDriftCount = 0;
for (const cell of sheepHalo) {
  if (await sourceAt(cell) !== await postAt(cell)) sheepHaloDriftCount += 1;
}
invariant(sheepHaloDriftCount === 0, 'omitted sheep-island halo changed');
const expectedSheepIds = new Set(sheepDescriptor.protectedSheep.map(
  ({ uuidIntArray }) => uuidIntArray.join(','),
));
const collectSheep = async (snapshotRoot) => {
  const reader = new AnvilReader(absolute(path.join(snapshotRoot, 'entities')));
  const found = [];
  const extent = sheepBase.geometry.interactionHalo.bounds;
  for (let cx = Math.floor((extent.minX - 16) / 16);
    cx <= Math.floor((extent.maxX + 16) / 16); cx += 1) {
    for (let cz = Math.floor((extent.minZ - 16) / 16);
      cz <= Math.floor((extent.maxZ + 16) / 16); cz += 1) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        const uuid = entity.UUID?.map(Number);
        if (!expectedSheepIds.has(uuid?.join(','))) continue;
        found.push({ uuidIntArray: uuid, id: entity.id, position: entity.Pos?.map(Number),
          completeNbtSha256: sha256(JSON.stringify(entity)), serialized: JSON.stringify(entity) });
      }
    }
  }
  return found.sort((left, right) => left.uuidIntArray.join(',')
    .localeCompare(right.uuidIntArray.join(',')));
};
const sourceSheep = await collectSheep(ledger.sourceSnapshot.root);
const postSheep = await collectSheep(ledger.postSnapshot.root);
invariant(sourceSheep.length === 3 && JSON.stringify(sourceSheep) === JSON.stringify(postSheep),
'protected sheep identity/NBT changed');

const stations = readJson(C1_DESIGN).horizontalAlignment.stations;
const heldReviewReports = [];
for (const held of manifest.scope.heldInterfaces) {
  const candidate = canonicalSurface(stations, held.stations.start, held.stations.end);
  // Mirror analyzeIsland's exact prospective envelope. A rectangular bounding
  // prism is invalid on curved alignment: it includes the adjacent released
  // islands even though none of the held station-owned cells changed.
  const reviewCells = uniqueCells(candidate.flatMap((cell) => [
    cell,
    { x: cell.x, y: cell.y - 1, z: cell.z },
    { x: cell.x, y: cell.y + 1, z: cell.z },
    { x: cell.x, y: cell.y + 2, z: cell.z },
  ]));
  let reviewCellCount = 0;
  let driftCount = 0;
  let targetIntersectionCount = 0;
  for (const cell of reviewCells) {
    reviewCellCount += 1;
    if (targetKeys.has(cellKey(cell))) targetIntersectionCount += 1;
    if (await sourceAt(cell) !== await postAt(cell)) driftCount += 1;
  }
  invariant(targetIntersectionCount === 0 && driftCount === 0,
    `held treatment ${held.stations.start}..${held.stations.end} changed or intersects R11F: `
      + `${JSON.stringify({ targetIntersectionCount, driftCount })}`);
  heldReviewReports.push({ stations: held.stations, disposition: held.disposition,
    candidate: classManifest(candidate), reviewEnvelope: classManifest(reviewCells),
    reviewCellCount,
    targetIntersectionCount, driftCount });
}

const evidenceDirectory = path.dirname(LEDGER_PATH);
let successfulExecutionGroupCount = 0;
let rollbackGuardPassCount = 0;
const packageEvidence = [];
for (const pkg of manifest.packages) {
  const count = packageRecords.get(pkg.key).length;
  const executionPath = `${evidenceDirectory}/${pkg.key}.forward-execution.json`;
  const journalPath = `${executionPath}.stream-journal.jsonl`;
  const execution = readJson(executionPath);
  const rollbackPreflight = readJson(
    `${evidenceDirectory}/${pkg.key}.rollback-poststate-preflight.json`,
  );
  const entityClearance = readJson(
    `${evidenceDirectory}/${pkg.key}.same-moment-entity-clearance.json`,
  );
  const journalBytes = fs.readFileSync(absolute(journalPath));
  invariant(execution.status === 'complete' && execution.strictNoop === true
    && execution.sourceOperationCount === count && execution.successfulGroups === count
    && execution.failedGroups === 0 && execution.unexpectedNoopCommands === 0
    && execution.worldEditLeftoverCount === 0
    && execution.operationSha256 === sha256(fs.readFileSync(absolute(pkg.forward)))
    && execution.streamJournalSha256 === sha256(journalBytes),
  `${pkg.key} execution/journal evidence failed`);
  invariant(rollbackPreflight.status === 'PASS' && rollbackPreflight.passed === count
    && rollbackPreflight.failed === 0
    && rollbackPreflight.opsSha256 === sha256(fs.readFileSync(absolute(pkg.rollback))),
  `${pkg.key} rollback poststate preflight failed`);
  invariant(entityClearance.status === 'PASS' && entityClearance.passed === true
    && entityClearance.totals.blockingEntityHits === 0,
  `${pkg.key} same-moment entity clearance failed`);
  successfulExecutionGroupCount += execution.successfulGroups;
  rollbackGuardPassCount += rollbackPreflight.passed;
  packageEvidence.push({ key: pkg.key, targetCellCount: count,
    executionJournalSha256: execution.streamJournalSha256,
    successfulExecutionGroupCount: execution.successfulGroups,
    rollbackGuardPassCount: rollbackPreflight.passed });
}
invariant(successfulExecutionGroupCount === EXPECTED.targetCellCount
  && rollbackGuardPassCount === EXPECTED.targetCellCount,
'aggregate execution/rollback totals failed');
const liveEntities = readJson(`${evidenceDirectory}/live-entity-clearance.json`);
const blockEntities = readJson(`${evidenceDirectory}/block-entity-clearance.json`);
invariant(liveEntities.status === 'PASS' && liveEntities.totals.blockingEntityHits === 0
  && blockEntities.status === 'PASS' && blockEntities.operationCount === EXPECTED.targetCellCount
  && blockEntities.blockingBlockEntityCount === 0,
'aggregate entity/block-entity evidence failed');

const heldReviewCellCount = heldReviewReports.reduce(
  (sum, report) => sum + report.reviewCellCount, 0,
);
const wetReviewCellCount = wetRangeReports.reduce(
  (sum, report) => sum + report.reviewCellCount, 0,
);
const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_WITH_FOUR_EXACT_BENIGN_SHADED_GRASS_LIFECYCLE_TRANSITIONS',
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
    connectedSurfaceCellCount: allSurface.length,
    connectedSurfaceComponentCount: connectedComponents(allSurface).length,
    interactionHaloCellCount: interactionHalo.length,
    declaredNaturalLifecycleHaloTransitionCount: haloOnlyDiffs.length,
    undeclaredHaloDriftCount: 0,
    excludedEarlyHaloCellCount: blockedHalo.length,
    excludedEarlyHaloDriftCount: excludedEarlyDriftCount,
    wetRangeReviewCellCount: wetReviewCellCount,
    wetRangeReviewDriftCount: 0,
    omittedSheepIslandTargetCount: sheepTargets.length,
    omittedSheepIslandHaloCellCount: sheepHalo.length,
    omittedSheepIslandHaloDriftCount: sheepHaloDriftCount,
    protectedSheepCount: postSheep.length,
    protectedSheepNbtDriftCount: 0,
    heldTreatmentReviewCellCount: heldReviewCellCount,
    heldTreatmentReviewDriftCount: 0,
    heldTreatmentTargetIntersectionCount: 0,
    successfulExecutionGroupCount,
    executionJournalCount: packageEvidence.length,
    rollbackGuardPassCount,
    liveEntityBlockingHitCount: liveEntities.totals.blockingEntityHits,
    blockEntityBlockingHitCount: blockEntities.blockingBlockEntityCount,
    corridorConnectivityClaimed: manifest.scope.corridorConnectivityClaimed,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  acceptedNaturalLifecycleTransitions: LIFECYCLE_TRANSITIONS.map((transition) => ({
    ...transition,
    sourceState: 'minecraft:grass_block[snowy=false]',
    postState: 'minecraft:dirt',
    classification: 'BENIGN_NATURAL_GRASS_DECAY_UNDER_DECLARED_OPAQUE_FOUNDATION',
    operatedTarget: false,
    rollbackOperationReadinessAffected: false,
  })),
  packages: packageEvidence,
  islands: islandReports,
  exclusions: {
    excludedEarlyRange: { key: blocked.key, halo: blocked.halo,
      sourceHazardCount: blocked.sourceHazardCount, haloHazardCount: blocked.haloHazardCount,
      driftCount: excludedEarlyDriftCount },
    wetRanges: wetRangeReports,
    omittedSheepIsland: { key: sheepDescriptor.key, targetCellCount: sheepTargets.length,
      haloCellCount: sheepHalo.length, driftCount: sheepHaloDriftCount },
    protectedSheep: postSheep.map(({ serialized, ...sheep }) => sheep),
    heldTreatmentReviewEnvelopes: heldReviewReports,
  },
  identities: {
    operatedUnion: classManifest(records.map(({ cell }) => cell)),
    surface: classManifest(allSurface),
    interactionHalo: classManifest(interactionHalo),
    excludedEarlyHalo: classManifest(blockedHalo),
    omittedSheepIslandHalo: classManifest(sheepHalo),
  },
};
const qaPayloadSha256 = sha256(JSON.stringify(reportWithoutIdentity));
const report = { ...reportWithoutIdentity, qaPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
const markdown = `# CZ-R11F post-release QA\n\n`
  + `**Status:** ${report.status}  \n**QA payload:** \`${qaPayloadSha256}\`\n\n`
  + `- Exact target transitions: ${records.length}/${records.length} across three packages.\n`
  + `- Two internally connected, mutually isolated surfaces: ${allSurface.length} cells; full headroom and stable contacts pass.\n`
  + `- Selected halo: ${interactionHalo.length} cells, four exact shaded-grass lifecycle transitions, zero undeclared drift.\n`
  + `- Exclusions unchanged: early hydraulic halo ${blockedHalo.length} cells; wet review ${wetReviewCellCount} cells; sheep halo ${sheepHalo.length} cells and three NBT-identical sheep; held-treatment review ${heldReviewCellCount} cells.\n`
  + `- Strict execution and rollback guards: ${successfulExecutionGroupCount}/${records.length}; three journals.\n`
  + `- No connectivity or commissioning is claimed across held treatments.\n`;
fs.mkdirSync(path.dirname(absolute(MD_PATH)), { recursive: true });
fs.writeFileSync(absolute(MD_PATH), markdown);
console.log(JSON.stringify({ status: report.status, report: OUT_PATH, markdown: MD_PATH,
  qaPayloadSha256, checks: report.checks }, null, 2));
