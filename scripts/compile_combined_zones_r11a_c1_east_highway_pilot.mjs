#!/usr/bin/env node
/**
 * Compile CZ-R11A: a dry eastern C1 highway pavement pilot.
 *
 * The package materializes the full accepted highway cross-section at C1
 * stations 1170..1175. Those six stations are in an accepted at-grade run,
 * outside every C01/default-deny and Data District interface. The operation
 * set excludes rail, utilities, drainage, fluids, entities, block entities,
 * containers, gravity blocks, protected relics, and every prior release.
 *
 * This compiler is offline. It performs no RCON call and no world edit.
 */

import fs from 'fs';
import path from 'path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
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

const GENERATED_AT = value('--generated-at', '2026-08-21T17:10:00Z');
const SNAPSHOT = value(
  '--snapshot',
  'data/worldsnap-combined-zones-r10a-post-20260821T163935Z',
);
const INTAKE_AUDIT = value(
  '--intake-audit',
  'data/world-review/combined-zones-r10a-live-20260821T163935Z/post-complete-save-intake.json',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11a-c1-east-highway-pilot';
const RELEASE_ID = 'CZ-R11A-C1-EAST-HIGHWAY-PAVEMENT-PILOT';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const PACKAGE_KEY = 'c1-east-highway-pavement-pilot';
const START_STATION = 489;
const END_STATION = 493;

const INPUTS = Object.freeze({
  c1Design: 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json',
  releaseContract: 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
  standingAuthorization: 'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
  protectedRelics: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  materialPrecedent: 'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json',
  sourceLedger: 'data/world-review/combined-zones-r10a-live-20260821T163935Z/evidence-ledger.json',
  priorManifests: [
    'data/buildops/combined-zones-r01-b11-road.release-manifest.json',
    'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
    'data/buildops/combined-zones-r03-tunnels-v2.release-manifest.json',
    'data/buildops/combined-zones-r05-mountain.release-manifest.json',
    'data/buildops/combined-zones-r06-support-liner.release-manifest.json',
    'data/buildops/combined-zones-r07-b03-portal-tube.release-manifest.json',
    'data/buildops/combined-zones-r07b-b03-viaduct-bents.release-manifest.json',
    'data/buildops/combined-zones-r07c-b08-service-tunnel-cover-recovery-20260821T161200Z.release-manifest.json',
    'data/buildops/combined-zones-r07d-b09-lower-station-shell.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-02-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-03-fitout.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-04-wet-liner.release-manifest.json',
    'data/buildops/combined-zones-r08-empty-eight-platform-08-fitout.release-manifest.json',
    'data/buildops/combined-zones-r09-b07-lower-lobby-floor.release-manifest.json',
    'data/buildops/combined-zones-r10-cheyenne-secure-gallery.release-manifest.json',
  ],
});

const EXPECTED = Object.freeze({
  c1ReferencePointCount: 1216,
  c1ReferenceRasterSha256:
    '34fb2d5b349c71421ce2959a4dc0b090f0ab2df139d06ac9d42ff71e3c39f48b',
  highwayColumnSetSha256:
    '42bbb84ced864d25bea6261d677cb14c818d07ad7b8ce290636cfb9c5c859ae8',
  surfaceCellCount: 109,
  surfaceCoordinateSetSha256:
    '67c334af780bdaf20db92267c5697cd601dcf85d05b31d7bad1d589b46661f16',
  foundationCellCount: 16,
  foundationCoordinateSetSha256:
    '234aafe7012f374ad7584efde23a50dbb415acda23cb538854ba8cbe2ff87809',
  headroomClearCellCount: 188,
  headroomClearCoordinateSetSha256:
    'd75df7e794e53d29b907d9a31c800ba013661f9096e501fb40e74afb3ffa98f5',
  operatedCellCount: 313,
  operatedCoordinateSetSha256:
    'db6564894b86f2c0a3c5a2889bd9ad9f75505d63cf78da3b738f367337bd1c1f',
  grayCellCount: 73,
  shoulderCellCount: 26,
  medianCellCount: 10,
});

const AIR_BLOCKS = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg',
  'minecraft:white_concrete_powder', 'minecraft:orange_concrete_powder',
  'minecraft:magenta_concrete_powder', 'minecraft:light_blue_concrete_powder',
  'minecraft:yellow_concrete_powder', 'minecraft:lime_concrete_powder',
  'minecraft:pink_concrete_powder', 'minecraft:gray_concrete_powder',
  'minecraft:light_gray_concrete_powder', 'minecraft:cyan_concrete_powder',
  'minecraft:purple_concrete_powder', 'minecraft:blue_concrete_powder',
  'minecraft:brown_concrete_powder', 'minecraft:green_concrete_powder',
  'minecraft:red_concrete_powder', 'minecraft:black_concrete_powder',
]);
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest', 'minecraft:decorated_pot',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]);

const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11A C1 highway compiler rejected: ${message}`);
};
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR_BLOCKS.has(blockName(state));
const isFluid = (state) => (
  FLUID_BLOCKS.has(blockName(state)) || state.includes('waterlogged=true')
);
const isReplaceableSupport = (state) => {
  const name = blockName(state);
  return isAir(state)
    || ['minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:leaf_litter',
      'minecraft:bush'].includes(name)
    || /_leaves$/.test(name);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const inside2d = (cell, extent) => cell.x >= extent.minX && cell.x <= extent.maxX
  && cell.z >= extent.minZ && cell.z <= extent.maxZ;
const inside3d = (cell, bounds) => inside2d(cell, bounds)
  && cell.y >= bounds.minY && cell.y <= bounds.maxY;
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const census = (records, field) => Object.fromEntries([...records.reduce(
  (result, record) => result.set(record[field], (result.get(record[field]) ?? 0) + 1),
  new Map(),
).entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));

function tangentAt(points, index) {
  const previous = points[Math.max(0, index - 1)];
  const next = points[Math.min(points.length - 1, index + 1)];
  const dx = next.x - previous.x;
  const dz = next.z - previous.z;
  const length = Math.hypot(dx, dz);
  invariant(length > 0, `zero tangent at station ${index}`);
  return { x: dx / length, z: dz / length };
}

function offsetPoint(point, tangent, offset) {
  return {
    x: point.x + Math.round(offset * -tangent.z),
    z: point.z + Math.round(offset * tangent.x),
  };
}

function crossfallAdjustment(offset) {
  if (offset <= -5) return 1;
  if (offset <= 5) return 0;
  return -1;
}

function surfaceTarget(offset) {
  if (offset <= -12 || offset >= 12) return 'minecraft:smooth_stone';
  if (offset >= -1 && offset <= 1) return 'minecraft:yellow_concrete';
  return 'minecraft:gray_concrete';
}

function operationBody(filename) {
  return `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
}

function priorOperationIntersections(filename, targetKeys, targetBounds) {
  const intersections = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        if (targetKeys.has(cellKey(cell))) intersections.set(cellKey(cell), cell);
      }
      continue;
    }
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains a malformed operation`);
    const coordinates = fields.slice(1, 7).map(Number);
    const bounds = {
      minX: Math.min(coordinates[0], coordinates[3]),
      maxX: Math.max(coordinates[0], coordinates[3]),
      minY: Math.min(coordinates[1], coordinates[4]),
      maxY: Math.max(coordinates[1], coordinates[4]),
      minZ: Math.min(coordinates[2], coordinates[5]),
      maxZ: Math.max(coordinates[2], coordinates[5]),
    };
    const overlap = {
      minX: Math.max(bounds.minX, targetBounds.minX),
      maxX: Math.min(bounds.maxX, targetBounds.maxX),
      minY: Math.max(bounds.minY, targetBounds.minY),
      maxY: Math.min(bounds.maxY, targetBounds.maxY),
      minZ: Math.max(bounds.minZ, targetBounds.minZ),
      maxZ: Math.min(bounds.maxZ, targetBounds.maxZ),
    };
    if (overlap.minX > overlap.maxX || overlap.minY > overlap.maxY
      || overlap.minZ > overlap.maxZ) continue;
    for (let x = overlap.minX; x <= overlap.maxX; x += 1) {
      for (let y = overlap.minY; y <= overlap.maxY; y += 1) {
        for (let z = overlap.minZ; z <= overlap.maxZ; z += 1) {
          const cell = { x, y, z };
          if (targetKeys.has(cellKey(cell))) intersections.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...intersections.values()];
}

function savedEntityInside(entity, bounds) {
  if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) return false;
  const [x, y, z] = entity.Pos.map(Number);
  return x >= bounds.minX && x < bounds.maxX + 1
    && y >= bounds.minY && y < bounds.maxY + 1
    && z >= bounds.minZ && z < bounds.maxZ + 1;
}

const c1 = readJson(INPUTS.c1Design);
const releaseContract = readJson(INPUTS.releaseContract);
const authorization = readJson(INPUTS.standingAuthorization);
const protectedRelics = readJson(INPUTS.protectedRelics);
const materialPrecedent = readJson(INPUTS.materialPrecedent);
const sourceLedger = readJson(INPUTS.sourceLedger);
const intake = readJson(INTAKE_AUDIT);

invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.passed === true
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true,
'source intake is not a complete immutable same-moment PASS');
invariant(samePath(intake.input?.suppliedWorldRoot, SNAPSHOT),
  'source intake is not bound to the requested snapshot');
for (const member of ['region', 'entities', 'poi']) {
  invariant(fs.existsSync(absolute(path.join(SNAPSHOT, member))),
    `source snapshot is missing ${member}`);
}
invariant(fs.existsSync(absolute(path.join(SNAPSHOT, 'level.dat'))),
  'source snapshot is missing level.dat');
invariant(sourceLedger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && sourceLedger.transactionId === 'combined-zones-r10-cheyenne-secure-gallery'
  && sourceLedger.postSnapshot?.completeSaveSha256 === intake.packageIdentity.completeSaveSha256,
'source ledger is not the accepted R10A post state');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes?.includes(RELEASE_NODE_ID),
'standing authorization does not cover R11');
const r11 = releaseContract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID);
invariant(r11?.status === 'ELIGIBLE_AFTER_LOCAL_DEPENDENCIES_AND_KERNEL'
  && r11.canonicalOwners.includes('C1-HIGHWAY'),
'release contract does not expose the C1 highway owner at R11');
invariant(c1.horizontalAlignment.referencePointCount === EXPECTED.c1ReferencePointCount
  && c1.horizontalAlignment.referenceCenterlineColumnSetSha256
    === EXPECTED.c1ReferenceRasterSha256,
'accepted C1 raster identity drifted');
invariant(c1.crossSection.highway.columns.columnSetSha256
  === EXPECTED.highwayColumnSetSha256
  && JSON.stringify(c1.crossSection.highway.offsetsInclusive) === '[-14,14]',
'accepted C1 highway cross-section drifted');
invariant(materialPrecedent.materialDecision.designPrecedent
  === 'town grid-road palette (gray_concrete carriageway, yellow_concrete stripe, stone_bricks curb, smooth_stone sidewalk)',
'accepted road material precedent drifted');

const stations = c1.horizontalAlignment.stations;
const selectedStations = stations.slice(START_STATION, END_STATION + 1);
invariant(selectedStations.length === 5
  && selectedStations.every(({ treatment }) => treatment === 'AT_GRADE_COORDINATION_PASS'),
'selected station slice is not exactly five accepted at-grade stations');

// Reproduce the C1 compiler's first-station-owned canonical 2D columns.
const byPlanColumn = new Map();
for (let station = START_STATION; station <= END_STATION; station += 1) {
  const reference = stations[station];
  const tangent = tangentAt(stations, station);
  for (let offset = -14; offset <= 14; offset += 1) {
    const point = offsetPoint(reference, tangent, offset);
    const key = `${point.x},${point.z}`;
    if (!byPlanColumn.has(key)) {
      byPlanColumn.set(key, {
        ...point,
        y: reference.highwayReferenceY + crossfallAdjustment(offset),
        station,
        offset,
      });
    }
  }
}
const surface = [...byPlanColumn.values()];
invariant(surface.length === EXPECTED.surfaceCellCount
  && hashCells(surface) === EXPECTED.surfaceCoordinateSetSha256,
'east highway pilot surface identity drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const surfaceRecords = [];
const headroomRecordsByCell = new Map();
const foundationRecordsByCell = new Map();
const supportRecords = [];
for (const cell of surface) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  surfaceRecords.push({
    cell: { x: cell.x, y: cell.y, z: cell.z },
    station: cell.station,
    offset: cell.offset,
    sourceState,
    targetState: surfaceTarget(cell.offset),
  });
  let supportCell = { x: cell.x, y: cell.y - 1, z: cell.z };
  let supportState = stateToCommandString(await reader.blockState(
    supportCell.x, supportCell.y, supportCell.z,
  ));
  while (isReplaceableSupport(supportState)) {
    foundationRecordsByCell.set(cellKey(supportCell), {
      cell: supportCell,
      sourceState: supportState,
      targetState: 'minecraft:stone_bricks',
    });
    supportCell = { x: supportCell.x, y: supportCell.y - 1, z: supportCell.z };
    supportState = stateToCommandString(await reader.blockState(
      supportCell.x, supportCell.y, supportCell.z,
    ));
  }
  supportRecords.push({ cell: supportCell, sourceState: supportState });
  for (let y = cell.y + 1; y <= cell.y + 2; y += 1) {
    const headCell = { x: cell.x, y, z: cell.z };
    const sourceState = stateToCommandString(await reader.blockState(
      headCell.x, headCell.y, headCell.z,
    ));
    if (!isAir(sourceState)) {
      headroomRecordsByCell.set(cellKey(headCell), {
        cell: headCell,
        sourceState,
        targetState: 'minecraft:air',
      });
    }
  }
}
const headroomRecords = [...headroomRecordsByCell.values()];
const foundationRecords = [...foundationRecordsByCell.values()];
invariant(foundationRecords.length === EXPECTED.foundationCellCount
  && hashCells(foundationRecords.map(({ cell }) => cell))
    === EXPECTED.foundationCoordinateSetSha256,
'east highway foundation identity drifted');
invariant(headroomRecords.length === EXPECTED.headroomClearCellCount
  && hashCells(headroomRecords.map(({ cell }) => cell))
    === EXPECTED.headroomClearCoordinateSetSha256,
'east highway headroom-clear identity drifted');

const supportViolations = supportRecords.filter(({ sourceState }) => (
  isAir(sourceState) || isFluid(sourceState)
  || GRAVITY_BLOCKS.has(blockName(sourceState))
  || FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))
));
invariant(supportViolations.length === 0,
  `pavement lacks stable support: ${JSON.stringify(supportViolations.slice(0, 20))}`);
const woodyTargets = [...surfaceRecords, ...headroomRecords].filter(({ sourceState }) => (
  /_(?:log|wood|leaves)(?:\[|$)/.test(sourceState)
));
invariant(woodyTargets.length === 0,
  'pilot would trigger tree decay or remove a woody feature');

const forwardRecords = [...headroomRecords, ...foundationRecords, ...surfaceRecords];
const operatedCells = uniqueCells(forwardRecords.map(({ cell }) => cell));
invariant(operatedCells.length === EXPECTED.operatedCellCount
  && hashCells(operatedCells) === EXPECTED.operatedCoordinateSetSha256,
'operated union identity drifted');
const operatedKeys = new Set(operatedCells.map(cellKey));

const halo = uniqueCells(operatedCells.flatMap((cell) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
      }
    }
  }
  return cells;
}));
const haloBounds = boundsOf(halo);
const haloViolations = [];
for (const cell of halo) {
  const sourceState = stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
  const name = blockName(sourceState);
  if (isFluid(sourceState) || GRAVITY_BLOCKS.has(name) || FORBIDDEN_SOURCE_BLOCKS.has(name)) {
    haloViolations.push({
      cell,
      sourceState,
      fluid: isFluid(sourceState),
      gravity: GRAVITY_BLOCKS.has(name),
      forbiddenContainerOrControl: FORBIDDEN_SOURCE_BLOCKS.has(name),
    });
  }
}
invariant(haloViolations.length === 0,
  `fluid/gravity/container/control state exists in the exact interaction halo: ${JSON.stringify(haloViolations.slice(0, 20))}`);

const c01HaloIntersections = c1.interfaces.c01.flatMap((entry) => {
  const cells = halo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, ...classManifest(cells) }] : [];
});
invariant(c01HaloIntersections.length === 0,
'interaction halo intersects a default-deny C01 extent');
const dataDistrict = c1.interfaces.dataDistrictCrossroad;
invariant(halo.every((cell) => cell.x !== dataDistrict.authoredCrossroadX),
'interaction halo reaches the Data District crossroad plane');

function selectedOffsetColumns(offsetFrom, offsetTo) {
  const result = new Map();
  for (let station = START_STATION; station <= END_STATION; station += 1) {
    const reference = stations[station];
    const tangent = tangentAt(stations, station);
    for (let offset = offsetFrom; offset <= offsetTo; offset += 1) {
      const point = offsetPoint(reference, tangent, offset);
      if (!result.has(`${point.x},${point.z}`)) result.set(`${point.x},${point.z}`, point);
    }
  }
  return [...result.values()];
}
const railReserveColumns = selectedOffsetColumns(-30, -18);
const railDrainColumns = selectedOffsetColumns(-30, -29);
const utilityColumns = selectedOffsetColumns(15, 17);
const roadDrainColumns = selectedOffsetColumns(18, 19);
const operatedPlanKeys = new Set(operatedCells.map(({ x, z }) => `${x},${z}`));
for (const [name, columns] of [
  ['rail reserve', railReserveColumns],
  ['rail collection', railDrainColumns],
  ['utility reserve', utilityColumns],
  ['road collection', roadDrainColumns],
]) {
  invariant(columns.every(({ x, z }) => !operatedPlanKeys.has(`${x},${z}`)),
    `operated plan intersects ${name}`);
}

const touchedChunks = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    touchedChunks.push({ x: cx, z: cz });
  }
}
const blockEntityHaloIntersections = [];
const savedEntityHaloIntersections = [];
for (const chunkPoint of touchedChunks) {
  const chunk = await reader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (inside3d(point, haloBounds)) blockEntityHaloIntersections.push({ id: entity.id, point });
  }
  const entityChunk = await entityReader.chunk(chunkPoint.x, chunkPoint.z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (savedEntityInside(entity, haloBounds)) {
      savedEntityHaloIntersections.push({
        id: entity.id ?? null,
        position: entity.Pos.slice(0, 3).map(Number),
      });
    }
  }
}
invariant(blockEntityHaloIntersections.length === 0,
'interaction halo intersects a block entity');
invariant(savedEntityHaloIntersections.length === 0,
'interaction halo intersects a saved movable entity');

const protectedRelicHaloIntersections = protectedRelics.relics.flatMap((relic) => {
  const cells = halo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ relic: relic.key, ...classManifest(cells) }] : [];
});
invariant(protectedRelicHaloIntersections.length === 0,
'interaction halo intersects a protected relic core');

const priorReleaseIntersections = [];
const operatedBounds = boundsOf(operatedCells);
for (const manifestPath of INPUTS.priorManifests) {
  const manifest = readJson(manifestPath);
  for (const pkg of manifest.packages) {
    const declaredHash = manifest.operations?.[pkg.key]?.forwardSha256;
    if (declaredHash) {
      invariant(sha256(operationBody(pkg.forward)) === declaredHash,
        `${manifest.transactionId}/${pkg.key} operation body drifted`);
    }
    const cells = priorOperationIntersections(pkg.forward, operatedKeys, operatedBounds);
    if (cells.length) priorReleaseIntersections.push({
      packageId: `${manifest.transactionId}/${pkg.key}`,
      ...classManifest(cells),
    });
  }
}
invariant(priorReleaseIntersections.length === 0,
  `pilot intersects a prior release: ${JSON.stringify(priorReleaseIntersections)}`);

// The surface is one connected 26-neighbour component and never steps more
// than one block between adjacent plan cells.
const unvisited = new Set(surface.map(({ x, y, z }) => `${x},${y},${z}`));
let componentCount = 0;
while (unvisited.size) {
  componentCount += 1;
  const queue = [unvisited.values().next().value];
  unvisited.delete(queue[0]);
  while (queue.length) {
    const current = queue.pop();
    const [x, y, z] = current.split(',').map(Number);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dz = -1; dz <= 1; dz += 1) {
          if (!dx && !dy && !dz) continue;
          const key = `${x + dx},${y + dy},${z + dz}`;
          if (unvisited.delete(key)) queue.push(key);
        }
      }
    }
  }
}
invariant(componentCount === 1, 'pavement surface is not one connected component');

const forwardBody = `${forwardRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const rollbackRecords = forwardRecords.slice().reverse().map((record) => ({
  cell: record.cell,
  sourceState: record.targetState,
  targetState: record.sourceState,
}));
const rollbackBody = `${rollbackRecords.map(({ cell, sourceState, targetState }) => (
  replLine(cell, sourceState, targetState)
)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.${PACKAGE_KEY}.rollback.txt`);
const header = (role, operationSha256) => [
  `# GENERATED FILE - ${RELEASE_ID} (${role})`,
  `# source root: ${SNAPSHOT}`,
  `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
  `# target coordinate-set SHA-256: ${EXPECTED.operatedCoordinateSetSha256}`,
  `# operation SHA-256: ${operationSha256}`,
  '',
].join('\n');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);

const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const shoulderCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:smooth_stone').map(({ cell }) => cell);
const medianCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:yellow_concrete').map(({ cell }) => cell);
const carriagewayCells = surfaceRecords.filter(({ targetState }) => targetState === 'minecraft:gray_concrete').map(({ cell }) => cell);
invariant(shoulderCells.length === EXPECTED.shoulderCellCount
  && medianCells.length === EXPECTED.medianCellCount
  && carriagewayCells.length === EXPECTED.grayCellCount,
'material partition drifted');

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R10A_POST_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages: [{ key: PACKAGE_KEY, forward, rollback }],
  executionOrder: {
    forward: [PACKAGE_KEY],
    rollback: [PACKAGE_KEY],
    rationale: 'One static pavement/headroom package with a reverse-ordered exact inverse.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Materialize the first dry, connected eastern C1 highway pavement pilot without touching rail, utilities, drainage, or held interfaces.',
    stations: {
      start: START_STATION,
      end: END_STATION,
      count: selectedStations.length,
      treatment: 'AT_GRADE_COORDINATION_PASS',
      startReference: { x: selectedStations[0].x, z: selectedStations[0].z },
      endReference: { x: selectedStations.at(-1).x, z: selectedStations.at(-1).z },
    },
    geometry: {
      pavementSurface: classManifest(surface),
      carriageway: classManifest(carriagewayCells),
      outerShoulders: classManifest(shoulderCells),
      medianSurface: classManifest(medianCells),
      exactHeadroomCuts: classManifest(headroomRecords.map(({ cell }) => cell)),
      exactFoundationFill: classManifest(foundationRecords.map(({ cell }) => cell)),
      operatedUnion: classManifest(operatedCells),
      stableFoundationContacts: {
        ...classManifest(supportRecords.map(({ cell }) => cell)),
        sourceStateCensus: census(supportRecords, 'sourceState'),
        unsupportedCellCount: supportViolations.length,
      },
      interactionHalo: classManifest(halo),
      connectedSurfaceComponentCount: componentCount,
    },
    materialDoctrine: {
      carriageway: 'minecraft:gray_concrete',
      outerShoulders: 'minecraft:smooth_stone',
      medianSurface: 'minecraft:yellow_concrete',
      precedent: INPUTS.materialPrecedent,
      note: 'Surface-only pilot; barriers, lighting, signing, drainage, rail, utilities, and route commissioning remain later disjoint packages.',
    },
    sourcePartition: {
      surfaceSourceStateCensus: census(surfaceRecords, 'sourceState'),
      foundationSourceStateCensus: census(foundationRecords, 'sourceState'),
      headroomSourceStateCensus: census(headroomRecords, 'sourceState'),
      desiredStateCensus: census(forwardRecords, 'targetState'),
      operated: classManifest(operatedCells),
      alreadyTarget: classManifest([]),
      exactPartition: forwardRecords.length === operatedCells.length,
    },
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceLedgerPath: INPUTS.sourceLedger,
    sourceLedgerCompletedReleaseIdentitySha256: sourceLedger.completedReleaseIdentitySha256,
    intakeStatus: intake.status,
    touchedChunkCount: touchedChunks.length,
  },
  target: {
    operatedUnion: classManifest(operatedCells),
    desiredStateCensus: census(forwardRecords, 'targetState'),
    packageTargetsDisjoint: true,
  },
  operations: {
    [PACKAGE_KEY]: {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: forwardRecords.length,
      rollbackCommandCount: rollbackRecords.length,
      targetCellCount: operatedCells.length,
      targetCoordinateSetSha256: hashCells(operatedCells),
      exactInverse: true,
    },
    ordering: 'Forward clears exact two-block route headroom before installing pavement; rollback reverses every transition and restores the source terrain.',
  },
  isolation: {
    fluidHaloIntersectionCount: 0,
    gravityHaloIntersectionCount: 0,
    forbiddenContainerOrControlHaloCount: 0,
    blockEntityHaloIntersectionCount: blockEntityHaloIntersections.length,
    savedEntityHaloIntersectionCount: savedEntityHaloIntersections.length,
    protectedRelicHaloIntersectionCount: protectedRelicHaloIntersections.length,
    c01DefaultDenyHaloIntersectionCount: c01HaloIntersections.length,
    dataDistrictCrossroadHaloIntersectionCount: 0,
    railReserveOperatedPlanIntersectionCount: 0,
    railCollectionOperatedPlanIntersectionCount: 0,
    utilityReserveOperatedPlanIntersectionCount: 0,
    roadCollectionOperatedPlanIntersectionCount: 0,
    woodyOperatedSourceCount: woodyTargets.length,
    priorReleaseIntersections,
    undeclaredPriorReleaseIntersectionCount: priorReleaseIntersections.length,
  },
  compileGuards: {
    exactC1RasterIdentity: EXPECTED.c1ReferenceRasterSha256,
    exactHighwayCrossSectionIdentity: EXPECTED.highwayColumnSetSha256,
    selectedTreatmentViolationCount: 0,
    unexpectedTargetStateViolationCount: 0,
    unstableFoundationViolationCount: supportViolations.length,
    fluidHaloViolationCount: 0,
    gravityHaloViolationCount: 0,
    forbiddenContainerOrControlHaloViolationCount: 0,
    blockEntityHaloViolationCount: blockEntityHaloIntersections.length,
    savedEntityHaloViolationCount: savedEntityHaloIntersections.length,
    protectedRelicHaloViolationCount: protectedRelicHaloIntersections.length,
    c01DefaultDenyHaloViolationCount: c01HaloIntersections.length,
    priorReleaseViolationCount: priorReleaseIntersections.length,
  },
  standingAuthorization: {
    path: INPUTS.standingAuthorization,
    sha256: sha256(fs.readFileSync(absolute(INPUTS.standingAuthorization))),
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    releaseNodeAuthorized: true,
  },
  upstreamIdentities: {
    c1DesignPath: INPUTS.c1Design,
    c1DesignSha256: sha256(fs.readFileSync(absolute(INPUTS.c1Design))),
    releaseContractPath: INPUTS.releaseContract,
    releaseContractIdentity: releaseContract.contractIdentitySha256,
    materialPrecedentPath: INPUTS.materialPrecedent,
    materialPrecedentSha256: sha256(fs.readFileSync(absolute(INPUTS.materialPrecedent))),
  },
  hardSafetyKernelNext: [
    'independent manifest and exact-inverse QA',
    'fresh same-invocation complete-save capture',
    'exact source preflight and strict-noop forward/rollback parser checks',
    'fresh block-entity and same-moment live-entity clearance',
    'journaled strict-noop execution',
    'fresh post snapshot, exact pavement/headroom QA, and rollback post-state preflight',
  ],
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  releaseNodeId: RELEASE_NODE_ID,
  sourceCompleteSaveSha256: intake.packageIdentity.completeSaveSha256,
  stationRange: [START_STATION, END_STATION],
  surfaceCellCount: surface.length,
  headroomClearCellCount: headroomRecords.length,
  foundationCellCount: foundationRecords.length,
  targetCellCount: operatedCells.length,
  commandCount: forwardRecords.length,
  surfaceSourceStateCensus: census(surfaceRecords, 'sourceState'),
  desiredStateCensus: census(forwardRecords, 'targetState'),
  interactionHaloCellCount: halo.length,
  fluidHaloIntersectionCount: 0,
  gravityHaloIntersectionCount: 0,
  blockEntityHaloIntersectionCount: 0,
  savedEntityHaloIntersectionCount: 0,
  protectedRelicHaloIntersectionCount: 0,
  c01DefaultDenyHaloIntersectionCount: 0,
  priorReleaseIntersectionCount: 0,
  forward,
  rollback,
  forwardSha256,
  rollbackSha256,
}, null, 2));
