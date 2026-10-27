#!/usr/bin/env node
/**
 * Compile CZ-R11H: a bounded, fluid-preserving C1 bridge/embankment package
 * for stations 1189..1206. The four columns whose generic fill would contact
 * water or lava are reduced to three-cell deck haunches and tied to dry,
 * terrain-founded columns by a five-cell transverse beam. The entire wet
 * ravine remains outside the operated halo.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  blockName,
  census,
  classManifest,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  GRAVITY_BLOCKS,
  isAir,
  isFluid,
  selectedOffsetColumns,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T03:05:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11h-c1-hydraulic-isolation-bridge-1189-1206';
const RELEASE_ID = 'CZ-R11H-C1-HYDRAULIC-ISOLATION-BRIDGE-1189-1206';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const SNAPSHOT = 'data/worldsnap-combined-zones-r11f-post-20260821T234824Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/evidence-ledger.json';
const INTAKE_AUDIT =
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/post-complete-save-intake.json';
const SOURCE_IDENTITY =
  'data/world-review/combined-zones-r11f-live-20260821T234824Z/post-snapshot-identity.json';
const INVENTORY_PATH =
  'data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json';
const R11F_MANIFEST =
  'data/buildops/combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json';
const C1_DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const RELEASE_CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS =
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const MATERIAL_PRECEDENT =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const START = 1189;
const END = 1206;
const AFFECTED_COLUMN_TOP_DEPTH = 3;
const BEAM_CELLS = [
  { x: 1519, y: 66, z: -234 },
  { x: 1520, y: 65, z: -233 },
  { x: 1522, y: 65, z: -233 },
  { x: 1523, y: 65, z: -233 },
  { x: 1523, y: 65, z: -232 },
];
const EXPECTED = Object.freeze({
  sourceLedgerSha256:
    '2e021ad9ee6bbab97ccc5150ca240876f0e66956fc676171140084566a2deabe',
  sourceCompletedReleaseIdentitySha256:
    'a7f8c5d9f9fa81df360c146e79287ed4eba03b2128f6af428490943d3d565c86',
  sourceCompleteSaveSha256:
    '14f4f7a055d682d77c7e4330514c1b77bc21fc35af52cc99ea5a60bfab29f918',
  sourceIdentityFileSha256:
    '8aae89de8364e63ca48f6bb6bdaaebf5178659e33383470eabffd3851162b394',
  sourceRegionSha256:
    '029ba78c1de35a125f7d103c6073282b7df75de61499d7be4f4fcd318b6a6962',
  intakeSha256:
    'be1ed26c80d6e9ff8bd749fb8d3a80f8b55d6f169f26977c8f0d3a33b55b4cc0',
  inventorySha256:
    '542432912cc14ed1a1a9f3918dc9deaf64cc7a9762f0adc085e347f325f03021',
  r11fManifestSha256:
    '96dba501a6376f2e5bafde87519138cd3ffd05c75f96fee8395d4edc424ab584',
  c1DesignSha256:
    '7776e243dc24b03fa7903ecb93ec8f05e6e0cbd81aa3749e2fb52435b7dc2442',
  surfaceCellCount: 355,
  headroomCutCount: 667,
  genericFoundationCount: 746,
  selectedFoundationCount: 636,
  omittedDeepFoundationCount: 110,
  gravityDependencyCount: 3,
  beamCellCount: 5,
  structureTargetCount: 1663,
  targetCellCount: 1666,
  retainedFluidCount: 28,
  retainedWaterCount: 9,
  retainedLavaCount: 19,
  affectedColumnCount: 4,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11H hydraulic-isolation compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const inside2d = (cell, extent) => cell.x >= extent.minX && cell.x <= extent.maxX
  && cell.z >= extent.minZ && cell.z <= extent.maxZ;
const inside3d = (cell, extent) => inside2d(cell, extent)
  && cell.y >= extent.minY && cell.y <= extent.maxY;
const FACE = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(
        /(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g,
      )) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        cells.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]);
      x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]);
        y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]);
          z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          const cell = { x, y, z };
          cells.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...cells.values()];
}

function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const result = [];
  while (unvisited.size) {
    const seed = unvisited.values().next().value;
    unvisited.delete(seed);
    const queue = [seed];
    const component = [];
    while (queue.length) {
      const key = queue.pop();
      const cell = byKey.get(key);
      component.push(cell);
      for (const [dx, dy, dz] of FACE) {
        const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (unvisited.delete(next)) queue.push(next);
      }
    }
    result.push(component);
  }
  return result.sort((left, right) => right.length - left.length);
}

const ledgerBytes = fs.readFileSync(absolute(SOURCE_LEDGER));
const ledger = JSON.parse(ledgerBytes);
const intakeBytes = fs.readFileSync(absolute(INTAKE_AUDIT));
const intake = JSON.parse(intakeBytes);
const identityBytes = fs.readFileSync(absolute(SOURCE_IDENTITY));
const identity = JSON.parse(identityBytes);
const inventoryBytes = fs.readFileSync(absolute(INVENTORY_PATH));
const inventory = JSON.parse(inventoryBytes);
const r11fBytes = fs.readFileSync(absolute(R11F_MANIFEST));
const r11f = JSON.parse(r11fBytes);
const c1Bytes = fs.readFileSync(absolute(C1_DESIGN));
const c1 = JSON.parse(c1Bytes);
const releaseContract = readJson(RELEASE_CONTRACT);
const authorization = readJson(AUTHORIZATION);
const protectedRelics = readJson(PROTECTED_RELICS);
const materialPrecedent = readJson(MATERIAL_PRECEDENT);

invariant(sha256(ledgerBytes) === EXPECTED.sourceLedgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && samePath(ledger.postSnapshot.root, SNAPSHOT),
'accepted R11F source ledger drifted');
invariant(sha256(intakeBytes) === EXPECTED.intakeSha256
  && intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && samePath(intake.input.suppliedWorldRoot, SNAPSHOT),
'accepted immutable R11F post intake drifted');
invariant(sha256(identityBytes) === EXPECTED.sourceIdentityFileSha256
  && identity.sha256 === EXPECTED.sourceRegionSha256,
'accepted R11F post region identity drifted');
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256
  && inventory.inventoryPayloadSha256,
'frozen R11F inventory drifted');
invariant(sha256(r11fBytes) === EXPECTED.r11fManifestSha256
  && r11f.status === 'COMPILED_FROM_ACCEPTED_R11E_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
'accepted R11F manifest drifted');
invariant(sha256(c1Bytes) === EXPECTED.c1DesignSha256,
'accepted C1 design drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('C1-HIGHWAY')
  && materialPrecedent.materialDecision.designPrecedent.includes('gray_concrete'),
'R11 authority/material precedent drifted');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}

const priorManifestNames = [
  ...inventory.priorTargetInventory.manifestNames,
  path.basename(R11F_MANIFEST),
];
const priorTargetKeys = new Set();
const priorManifestBindings = [];
for (const name of priorManifestNames) {
  const manifestPath = path.join('data/buildops', name);
  const bytes = fs.readFileSync(absolute(manifestPath));
  const manifest = JSON.parse(bytes);
  priorManifestBindings.push({ path: manifestPath, sha256: sha256(bytes) });
  for (const pkg of manifest.packages ?? []) {
    if (!pkg.forward || !fs.existsSync(absolute(pkg.forward))) continue;
    for (const cell of operationTargetCells(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const generic = await analyzeIsland({
  key: 'bridge-1189-1206', start: START, end: END,
  stations: c1.horizontalAlignment.stations, reader, priorTargetKeys,
});
invariant(generic.surface.length === EXPECTED.surfaceCellCount
  && generic.foundationRecords.length === EXPECTED.genericFoundationCount
  && generic.headroomRecords.length === EXPECTED.headroomCutCount
  && generic.gravityRecords.length === EXPECTED.gravityDependencyCount
  && generic.priorIntersections.length === 0
  && Object.values(generic.operatedInterfaceIntersections)
    .every((cells) => cells.length === 0),
'generic source geometry/interface census drifted');

const genericFluids = [];
for (const cell of generic.halo) {
  const sourceState = await sourceAt(cell);
  if (isFluid(sourceState)) genericFluids.push({ cell, sourceState });
}
invariant(genericFluids.length === EXPECTED.retainedFluidCount
  && genericFluids.filter(({ sourceState }) => blockName(sourceState) === 'minecraft:water')
    .length === EXPECTED.retainedWaterCount
  && genericFluids.filter(({ sourceState }) => blockName(sourceState) === 'minecraft:lava')
    .length === EXPECTED.retainedLavaCount,
'retained fluid graph census drifted');
const fluidCells = genericFluids.map(({ cell }) => cell);
const fluidComponents = faceComponents(fluidCells);
invariant(fluidComponents.length === 2, 'retained fluid graph topology drifted');

const affectedColumns = new Map();
for (const record of generic.foundationRecords) {
  if (!genericFluids.some(({ cell }) => Math.max(
    Math.abs(cell.x - record.cell.x),
    Math.abs(cell.y - record.cell.y),
    Math.abs(cell.z - record.cell.z),
  ) <= 1)) continue;
  const key = `${record.cell.x},${record.cell.z}`;
  if (!affectedColumns.has(key)) affectedColumns.set(key, []);
  affectedColumns.get(key).push(record);
}
invariant(affectedColumns.size === EXPECTED.affectedColumnCount,
'fluid-interaction foundation column count drifted');
const affectedColumnKeys = new Set(affectedColumns.keys());
const selectedFoundation = [];
const omittedFoundation = [];
for (const [key, column] of [...generic.foundationRecords.reduce((map, record) => {
  const columnKey = `${record.cell.x},${record.cell.z}`;
  if (!map.has(columnKey)) map.set(columnKey, []);
  map.get(columnKey).push(record);
  return map;
}, new Map()).entries()].sort()) {
  const descending = column.slice().sort((left, right) => right.cell.y - left.cell.y);
  if (!affectedColumnKeys.has(key)) selectedFoundation.push(...descending);
  else {
    selectedFoundation.push(...descending.slice(0, AFFECTED_COLUMN_TOP_DEPTH));
    omittedFoundation.push(...descending.slice(AFFECTED_COLUMN_TOP_DEPTH));
  }
}
invariant(selectedFoundation.length === EXPECTED.selectedFoundationCount
  && omittedFoundation.length === EXPECTED.omittedDeepFoundationCount,
'hydraulic-isolation foundation partition drifted');

const beamRecords = [];
for (const cell of BEAM_CELLS) {
  const sourceState = await sourceAt(cell);
  invariant(isAir(sourceState), `beam source is not air at ${cellKey(cell)}`);
  beamRecords.push({ cell, sourceState, targetState: 'minecraft:stone_bricks' });
}
invariant(beamRecords.length === EXPECTED.beamCellCount,
'transverse beam census drifted');

const dependencyRecords = generic.gravityRecords.slice().sort((left, right) => (
  left.cell.y - right.cell.y
  || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const foundationRecords = selectedFoundation.slice().sort((left, right) => (
  left.cell.y - right.cell.y
  || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const headroomRecords = generic.headroomRecords.slice().sort((left, right) => (
  right.cell.y - left.cell.y
  || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const surfaceRecords = generic.surfaceRecords.slice().sort((left, right) => (
  left.station - right.station || left.offset - right.offset
  || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const structureRecords = [
  ...foundationRecords, ...beamRecords, ...headroomRecords, ...surfaceRecords,
];
const allRecords = [...dependencyRecords, ...structureRecords];
invariant(structureRecords.length === EXPECTED.structureTargetCount
  && allRecords.length === EXPECTED.targetCellCount,
'physical package target census drifted');
const targetKeys = new Set();
for (const record of allRecords) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target at ${key}`);
  targetKeys.add(key);
  invariant(record.sourceState !== record.targetState, `strict-noop target at ${key}`);
  invariant(await sourceAt(record.cell) === record.sourceState,
    `source guard drifted at ${key}`);
  invariant(!priorTargetKeys.has(key), `prior release overlap at ${key}`);
  invariant(!isFluid(record.sourceState), `fluid target at ${key}`);
  invariant(!FORBIDDEN_SOURCE_BLOCKS.has(blockName(record.sourceState)),
    `forbidden source target at ${key}`);
}

const operated = uniqueCells(allRecords.map(({ cell }) => cell));
const halo = uniqueCells(operated.flatMap((cell) => {
  const points = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      points.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return points;
}));
const operatedHaloFluid = [];
for (const cell of halo) {
  const sourceState = await sourceAt(cell);
  if (isFluid(sourceState)) operatedHaloFluid.push({ cell, sourceState });
}
invariant(operatedHaloFluid.length === 0,
'selected operation halo reaches retained fluid');
const minimumTargetFluidChebyshevDistance = Math.min(...operated.flatMap((target) => (
  genericFluids.map(({ cell }) => Math.max(
    Math.abs(target.x - cell.x), Math.abs(target.y - cell.y), Math.abs(target.z - cell.z),
  ))
)));
invariant(minimumTargetFluidChebyshevDistance >= 2,
'selected operation does not preserve one-cell hydraulic isolation');

const supportCells = [...foundationRecords, ...beamRecords].map(({ cell }) => cell);
const supportComponents = faceComponents(supportCells);
const supportKeys = new Set(supportCells.map(cellKey));
const anchoredSupportComponents = [];
for (const component of supportComponents) {
  const anchors = [];
  for (const cell of component) {
    const below = { x: cell.x, y: cell.y - 1, z: cell.z };
    if (supportKeys.has(cellKey(below))) continue;
    const belowState = await sourceAt(below);
    if (!isAir(belowState) && !isFluid(belowState)
      && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(belowState))) {
      anchors.push({ cell: below, sourceState: belowState });
    }
  }
  invariant(anchors.length > 0,
    `support component has no durable terrain anchor at ${cellKey(component[0])}`);
  anchoredSupportComponents.push({
    support: classManifest(component),
    anchorCount: anchors.length,
    anchors: anchors.slice(0, 20),
  });
}
for (const key of affectedColumnKeys) {
  const [x, z] = key.split(',').map(Number);
  invariant(supportComponents.some((component) => component.some(
    (cell) => cell.x === x && cell.z === z,
  ) && component.some((cell) => !affectedColumnKeys.has(`${cell.x},${cell.z}`))),
  `affected haunch ${key} is not beam-connected to a dry foundation`);
}
const surfaceComponents = connectedComponents(generic.surface);
invariant(surfaceComponents.length === 1,
'bridge pavement surface is not one step-safe component');
const surfaceKeys = new Set(generic.surface.map(cellKey));
for (const cell of generic.surface) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  invariant(supportKeys.has(cellKey(below)) || dependencyRecords.some(
    (record) => cellKey(record.cell) === cellKey(below),
  ) || (!isAir(await sourceAt(below)) && !isFluid(await sourceAt(below))),
  `pavement cell lacks projected stable support at ${cellKey(cell)}`);
}
invariant(surfaceKeys.size === EXPECTED.surfaceCellCount,
'surface coordinate uniqueness drifted');

const haloBounds = boundsOf(halo);
const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16);
  cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16);
    cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) touchedChunks.push({ x: cx, z: cz });
}
const blockEntityIntersections = [];
const savedEntityIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (halo.some((cell) => cellKey(cell) === cellKey(point))) {
      blockEntityIntersections.push({ id: entity.id ?? null, point });
    }
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [x, y, z] = entity.Pos.map(Number);
    if (halo.some((cell) => x >= cell.x && x < cell.x + 1
      && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
      savedEntityIntersections.push({ id: entity.id ?? null, position: [x, y, z] });
    }
  }
}
const protectedRelicIntersections = protectedRelics.relics.flatMap((relic) => {
  const cells = halo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ relic: relic.key, ...classManifest(cells) }] : [];
});
const c01Intersections = c1.interfaces.c01.flatMap((entry) => {
  const cells = halo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, ...classManifest(cells) }] : [];
});
const dataDistrictIntersections = halo.filter(
  ({ x }) => x === c1.interfaces.dataDistrictCrossroad.authoredCrossroadX,
);
const reservationIntersections = {};
for (const [name, from, to] of [
  ['railReservation', -30, -18], ['utilityReservation', 15, 17],
  ['roadCollection', 18, 19],
]) {
  const columns = new Set(selectedOffsetColumns(
    c1.horizontalAlignment.stations, START, END, from, to,
  ).map(({ x, z }) => `${x},${z}`));
  reservationIntersections[name] = operated.filter(
    ({ x, z }) => columns.has(`${x},${z}`),
  );
}
invariant(blockEntityIntersections.length === 0
  && savedEntityIntersections.length === 0
  && protectedRelicIntersections.length === 0
  && c01Intersections.length === 0
  && dataDistrictIntersections.length === 0
  && Object.values(reservationIntersections).every((cells) => cells.length === 0),
'selected halo reaches a block entity, entity, relic, C01, district, or reservation interface');

const definitions = [
  {
    key: 'c1-bridge-1189-1206-dependencies',
    role: 'durable gravel support dependencies', records: dependencyRecords,
  },
  {
    key: 'c1-bridge-1189-1206-structure',
    role: 'fluid-isolated foundations, transverse beam, headroom, and pavement',
    records: structureRecords,
  },
];
const packages = [];
const operations = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const definition of definitions) {
  const rollback = definition.records.slice().reverse().map(
    ({ cell, sourceState, targetState }) => ({
      cell, sourceState: targetState, targetState: sourceState,
    }),
  );
  const forwardBody = `${definition.records.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const rollbackBody = `${rollback.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetCoordinateSetSha256 = hashCells(definition.records.map(({ cell }) => cell));
  const canonicalForward = path.join(
    'data/buildops', `${BASENAME}.${definition.key}.forward.txt`,
  );
  const canonicalRollback = path.join(
    'data/buildops', `${BASENAME}.${definition.key}.rollback.txt`,
  );
  const outputForward = path.join(OUT_DIR, path.basename(canonicalForward));
  const outputRollback = path.join(OUT_DIR, path.basename(canonicalRollback));
  const header = (direction, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${definition.key} ${direction})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
    `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
  ].join('\n');
  fs.writeFileSync(absolute(outputForward), `${header('forward', forwardSha256)}\n${forwardBody}`);
  fs.writeFileSync(absolute(outputRollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
  packages.push({ key: definition.key, forward: canonicalForward, rollback: canonicalRollback });
  operations[definition.key] = {
    role: definition.role,
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: definition.records.length,
    rollbackCommandCount: rollback.length,
    targetCellCount: definition.records.length,
    targetCoordinateSetSha256,
    exactInverse: true,
  };
}

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R11F_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: definitions.map(({ key }) => key),
    rollback: definitions.map(({ key }) => key).reverse(),
    rationale: 'Replace the three durable gravel dependencies first. Build dry foundations bottom-up, add the transverse beam, clear headroom top-down, then place pavement. Rollback reverses pavement/headroom/beam/foundation before restoring gravel onto its unchanged durable supports.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Construct a bounded 18-station highway bridge/embankment island while retaining the current water and lava graph outside a one-cell no-touch isolation band.',
    stations: { start: START, end: END, count: END - START + 1 },
    treatment: 'MINECRAFT_DOMAIN_HYDRAULIC_ISOLATION_BRIDGE_STATIC_UNCOMMISSIONED',
    pavementSurface: classManifest(generic.surface),
    fullTwoBlockHeadroom: classManifest(generic.fullHeadroom),
    headroomCuts: classManifest(headroomRecords.map(({ cell }) => cell)),
    genericFoundationFill: classManifest(generic.foundationRecords.map(({ cell }) => cell)),
    selectedFoundationFill: classManifest(foundationRecords.map(({ cell }) => cell)),
    omittedDeepFoundationFill: classManifest(omittedFoundation.map(({ cell }) => cell)),
    affectedFluidInteractionColumns: [...affectedColumns.entries()].map(([key, records]) => ({
      key,
      genericFill: classManifest(records.map(({ cell }) => cell)),
      retainedTopHaunch: classManifest(foundationRecords.filter(
        ({ cell }) => `${cell.x},${cell.z}` === key,
      ).map(({ cell }) => cell)),
      omittedDeepFill: classManifest(omittedFoundation.filter(
        ({ cell }) => `${cell.x},${cell.z}` === key,
      ).map(({ cell }) => cell)),
    })),
    transverseBeam: classManifest(BEAM_CELLS),
    gravityDependencies: classManifest(dependencyRecords.map(({ cell }) => cell)),
    gravityRollbackSupportProof: generic.gravityRollbackSupportProof,
    supportGraph: {
      componentCount: supportComponents.length,
      anchoredComponentCount: anchoredSupportComponents.length,
      components: anchoredSupportComponents,
      affectedHaunchesConnectedToDryFoundation: true,
    },
    surfaceTopology: {
      componentCount: surfaceComponents.length,
      maxStep: 1,
      routeCommissioned: false,
    },
    retainedHydraulicGraph: {
      cellCount: genericFluids.length,
      stateCensus: census(genericFluids, 'sourceState'),
      materialCensus: Object.fromEntries([
        ['minecraft:water', EXPECTED.retainedWaterCount],
        ['minecraft:lava', EXPECTED.retainedLavaCount],
      ]),
      componentCount: fluidComponents.length,
      coordinateSetSha256: hashCells(fluidCells),
      minimumTargetChebyshevDistance: minimumTargetFluidChebyshevDistance,
      targetHaloFluidCount: operatedHaloFluid.length,
      preservation: 'UNCHANGED_SOURCE_STATES_AND_FACE_TOPOLOGY_OUTSIDE_OPERATED_HALO',
    },
    corridorConnectivityClaimed: false,
    externalDischargeChanged: false,
    utilityRailDrainageCommissioned: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    sourceIdentityPath: SOURCE_IDENTITY,
    sourceIdentityFileSha256: EXPECTED.sourceIdentityFileSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeAuditSha256: EXPECTED.intakeSha256,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256:
      EXPECTED.sourceCompletedReleaseIdentitySha256,
    inventoryPath: INVENTORY_PATH,
    inventorySha256: EXPECTED.inventorySha256,
    r11fManifestPath: R11F_MANIFEST,
    r11fManifestSha256: EXPECTED.r11fManifestSha256,
    c1DesignPath: C1_DESIGN,
    c1DesignSha256: EXPECTED.c1DesignSha256,
  },
  target: {
    operatedUnion: classManifest(operated),
    desiredStateCensus: census(allRecords, 'targetState'),
    interactionHalo: classManifest(halo),
    sourceStateCensus: census(allRecords, 'sourceState'),
    packageTargetsDisjoint: true,
  },
  operations,
  isolation: {
    priorManifestCount: priorManifestBindings.length,
    priorManifestBindings,
    priorTargetCellCount: priorTargetKeys.size,
    priorReleaseIntersectionCount: 0,
    targetHaloFluidCount: 0,
    retainedFluidCount: genericFluids.length,
    omittedDeepFoundationCount: omittedFoundation.length,
    blockEntityHaloIntersectionCount: blockEntityIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicIntersections.length,
    c01HaloIntersectionCount: c01Intersections.length,
    dataDistrictHaloIntersectionCount: dataDistrictIntersections.length,
    reservationIntersectionCount: Object.values(reservationIntersections)
      .reduce((sum, cells) => sum + cells.length, 0),
    activeMechanismMutationCount: 0,
    containerMigrationCount: 0,
    sheepInteractionCount: 0,
  },
  compileGuards: {
    exactAcceptedR11FPostSource: true,
    uniqueOperatedCellCount: operated.length,
    exactSourceGuardMatchCount: allRecords.length,
    exactInversePackageCount: definitions.length,
    strictNoopForwardCount: 0,
    targetHaloFluidCount: 0,
    durableSupportComponentCount: anchoredSupportComponents.length,
    unanchoredSupportComponentCount: 0,
    fullTwoBlockHeadroom: true,
    surfaceOneComponentMaxStepOne: true,
    retainedFluidStateAndTopologyPreserved: true,
    heldInterfaceMutationCount: 0,
  },
  standingAuthorization: r11f.standingAuthorization,
  upstreamIdentities: {
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256:
      EXPECTED.sourceCompletedReleaseIdentitySha256,
    r11fManifestPath: R11F_MANIFEST,
    r11fManifestSha256: EXPECTED.r11fManifestSha256,
  },
  hardSafetyKernelNext: r11f.hardSafetyKernelNext,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    routeCommissioned: false,
    hydraulicCapacityClaimed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const outputManifest = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(outputManifest), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: outputManifest,
  manifestIdentity,
  packageCount: packages.length,
  targetCellCount: operated.length,
  surfaceCellCount: generic.surface.length,
  selectedFoundationCount: foundationRecords.length,
  omittedDeepFoundationCount: omittedFoundation.length,
  headroomCutCount: headroomRecords.length,
  retainedFluidCount: genericFluids.length,
  interactionHaloCellCount: halo.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
