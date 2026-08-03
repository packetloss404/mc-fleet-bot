#!/usr/bin/env node
/**
 * Independent release QA for MainStreet bunker surface Phase 1.
 *
 * This checker treats the generator report as an assertion, not as evidence.
 * It expands the emitted forward and rollback files independently, re-reads
 * exact palette states from the frozen Anvil snapshot, queries the feature DB
 * read-only, and recomputes route and facade metrics.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE = 'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27';
const FORWARD = path.join(ROOT, `${BASE}.txt`);
const ROLLBACK = path.join(ROOT, `${BASE}.rollback.txt`);
const REPORT = path.join(ROOT, `${BASE}.report.json`);
const CAMERAS = path.join(ROOT, `${BASE}.before-cameras.json`);
const PREFLIGHT = path.join(ROOT, `${BASE}.preflight.root.json`);
const DRY_RUN = path.join(ROOT, `${BASE}.dry-run.root.json`);
const ROLLBACK_DRY_RUN = path.join(ROOT, `${BASE}.rollback.dry-run.root.json`);
const OUTPUT = path.join(ROOT, `${BASE}.independent-qa.json`);
const REGIONS = path.join(
  ROOT,
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);
const EXPECTED_SNAPSHOT =
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
  'minecraft:light',
]);
const FLUID = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
]);
const NATURAL_GROUND = new Set([
  'minecraft:stone',
  'minecraft:deepslate',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:podzol',
  'minecraft:gravel',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:clay',
  'minecraft:mud',
  'minecraft:moss_block',
  'minecraft:snow_block',
]);
const REPLACEABLE = new Set([
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:dead_bush',
  'minecraft:vine',
  'minecraft:glow_lichen',
  'minecraft:hanging_roots',
  'minecraft:crimson_roots',
  'minecraft:warped_roots',
  'minecraft:nether_sprouts',
  'minecraft:leaf_litter',
  'minecraft:snow',
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:brown_mushroom',
  'minecraft:red_mushroom',
  'minecraft:small_dripleaf',
  'minecraft:big_dripleaf_stem',
  'minecraft:seagrass',
  'minecraft:tall_seagrass',
  'minecraft:kelp',
  'minecraft:kelp_plant',
  'minecraft:lily_pad',
  'minecraft:sea_pickle',
  'minecraft:moss_carpet',
  'minecraft:pale_moss_carpet',
  'minecraft:pale_hanging_moss',
  'minecraft:pink_petals',
  'minecraft:wildflowers',
  'minecraft:torchflower',
  'minecraft:torchflower_crop',
  'minecraft:pitcher_crop',
  'minecraft:pitcher_plant',
]);
const FLOWERS = new Set([
  'dandelion',
  'poppy',
  'blue_orchid',
  'allium',
  'azure_bluet',
  'red_tulip',
  'orange_tulip',
  'white_tulip',
  'pink_tulip',
  'oxeye_daisy',
  'cornflower',
  'lily_of_the_valley',
  'wither_rose',
  'sunflower',
  'lilac',
  'rose_bush',
  'peony',
  'closed_eyeblossom',
  'open_eyeblossom',
  'cactus_flower',
]);
const PROTECTED_BOXES = [
  ['public-observatory-stair', [164, 98, 151, 175, 123, 166]],
  ['hangar-shell', [176, 98, 138, 234, 120, 181]],
  ['observatory-and-penthouse', [175, 119, 137, 235, 136, 182]],
  ['hangar-door-trail', [208, 88, 180, 238, 116, 191]],
  ['heliport', [238, 88, 172, 257, 91, 191]],
  ['service-shaft', [198, 24, 151, 202, 106, 156]],
  ['public-entry', [90, 64, 153, 139, 80, 205]],
  ['shelter-shell-and-interior', [148, 81, 143, 188, 92, 180]],
  ['vault-connector', [188, 66, 171, 232, 86, 196]],
  ['grand-vault', [230, 44, 184, 262, 77, 226]],
  ['southeast-rain-garden', [100, 64, 240, 119, 66, 245]],
];
const LOADED_CHESTS = new Set([
  '150,82,178',
  '154,82,178',
  '158,82,178',
  '233,45,220',
  '238,45,220',
  '255,45,220',
  '233,56,220',
  '238,56,220',
  '255,56,220',
  '233,67,220',
  '238,67,220',
  '255,67,220',
]);

function baseName(block) {
  return block.split('[', 1)[0];
}

function normalizeBlock(block) {
  const bracket = block.indexOf('[');
  if (bracket < 0) return block;
  const name = block.slice(0, bracket);
  const properties = block
    .slice(bracket + 1, -1)
    .split(',')
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function pointKey(x, y, z) {
  return `${x},${y},${z}`;
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function snapshotDigest(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const hash = crypto.createHash('sha256');
  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, name)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), regionFiles: names.length };
}

function inside([x, y, z], box) {
  const [x1, y1, z1, x2, y2, z2] = box;
  return (
    x >= Math.min(x1, x2) && x <= Math.max(x1, x2) &&
    y >= Math.min(y1, y2) && y <= Math.max(y1, y2) &&
    z >= Math.min(z1, z2) && z <= Math.max(z1, z2)
  );
}

function parseOperations(filename) {
  const boxes = [];
  const commands = [];
  const invalid = [];
  let phase = null;
  for (const [index, raw] of fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .entries()) {
    const line = raw.trim();
    if (line.startsWith('# phase: ')) {
      phase = line.slice('# phase: '.length);
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (fields[0] === 'CMD') {
      commands.push({ line: index + 1, phase, text: line });
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      invalid.push({ line: index + 1, text: line });
      continue;
    }
    boxes.push({
      line: index + 1,
      phase,
      bounds: fields.slice(1, 7).map(Number),
      expected: normalizeBlock(fields[7]),
      desired: normalizeBlock(fields[8]),
    });
  }
  return { boxes, commands, invalid };
}

function expand(parsed) {
  const cells = new Map();
  const duplicates = [];
  for (const box of parsed.boxes) {
    const [ax, ay, az, bx, by, bz] = box.bounds;
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x += 1) {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y += 1) {
        for (let z = Math.min(az, bz); z <= Math.max(az, bz); z += 1) {
          const key = pointKey(x, y, z);
          if (cells.has(key)) {
            duplicates.push({
              point: [x, y, z],
              firstLine: cells.get(key).line,
              secondLine: box.line,
            });
            continue;
          }
          cells.set(key, {
            x,
            y,
            z,
            line: box.line,
            phase: box.phase,
            expected: box.expected,
            desired: box.desired,
          });
        }
      }
    }
  }
  return { cells, duplicates };
}

function isFoliage(block) {
  const name = baseName(block);
  return /(_leaves|_log|_wood|_stem|_hyphae)$/.test(name)
    || name === 'minecraft:mangrove_roots'
    || name === 'minecraft:muddy_mangrove_roots'
    || name === 'minecraft:bamboo'
    || name === 'minecraft:cocoa';
}

function isReplaceable(block) {
  const name = baseName(block);
  const bare = name.replace(/^minecraft:/, '');
  return AIR.has(name) || REPLACEABLE.has(name) || FLOWERS.has(bare)
    || bare.endsWith('_sapling') || bare.endsWith('_propagule');
}

const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const cameras = JSON.parse(fs.readFileSync(CAMERAS, 'utf8'));
const preflight = JSON.parse(fs.readFileSync(PREFLIGHT, 'utf8'));
const dryRun = JSON.parse(fs.readFileSync(DRY_RUN, 'utf8'));
const rollbackDryRun = JSON.parse(fs.readFileSync(ROLLBACK_DRY_RUN, 'utf8'));
const forwardParsed = parseOperations(FORWARD);
const rollbackParsed = parseOperations(ROLLBACK);
const forward = expand(forwardParsed);
const rollback = expand(rollbackParsed);
const digest = snapshotDigest(REGIONS);
const snapshot = new AnvilSnapshot(REGIONS);
const sourceCache = new Map();
const materialRemovalDeclarations =
  report.runtimeSafety?.materialExactRemovalExceptions ?? [];
const materialRemovalByPoint = new Map();
let materialRemovalDeclarationSchemaPassed =
  Array.isArray(materialRemovalDeclarations);
if (Array.isArray(materialRemovalDeclarations)) {
  for (const declaration of materialRemovalDeclarations) {
    const declarationPassed = (
      declaration?.sourceMaterial === 'minecraft:birch_fence'
      && declaration?.desired === 'minecraft:air'
      && declaration?.snapshotExactSource
        === 'minecraft:birch_fence[east=true,north=false,south=false,waterlogged=false,west=true]'
      && declaration?.blockEntityCapable === false
      && declaration?.snapshotWaterlogged === false
      && Array.isArray(declaration?.fluidNeighborCells)
      && declaration.fluidNeighborCells.length === 0
      && Array.isArray(declaration?.cells)
      && declaration.cellCount === declaration.cells.length
      && declaration.cells.length > 0
      && declaration.cells.every((point) => (
        Array.isArray(point)
        && point.length === 3
        && point.every(Number.isSafeInteger)
      ))
    );
    materialRemovalDeclarationSchemaPassed =
      materialRemovalDeclarationSchemaPassed && declarationPassed;
    if (!declarationPassed) continue;
    for (const point of declaration.cells) {
      const key = point.join(',');
      if (materialRemovalByPoint.has(key)) {
        materialRemovalDeclarationSchemaPassed = false;
      }
      materialRemovalByPoint.set(key, declaration);
    }
  }
}

async function sourceAt(x, y, z) {
  const key = pointKey(x, y, z);
  if (sourceCache.has(key)) return sourceCache.get(key);
  const column = await snapshot.readStateColumn(x, z, y, y);
  if (!column) return null;
  const block = normalizeBlock(column.get(y));
  sourceCache.set(key, block);
  return block;
}

async function finalAt(x, y, z) {
  return forward.cells.get(pointKey(x, y, z))?.desired ?? sourceAt(x, y, z);
}

const assertions = [];
const failures = [];
function check(id, passed, evidence) {
  const result = { id, passed, evidence };
  assertions.push(result);
  if (!passed) failures.push(result);
}

check('snapshot-hash', digest.sha256 === EXPECTED_SNAPSHOT, digest);
check('forward-syntax', forwardParsed.invalid.length === 0, forwardParsed.invalid);
check('rollback-syntax', rollbackParsed.invalid.length === 0, rollbackParsed.invalid);
check('forward-box-count', forwardParsed.boxes.length === 766, {
  actual: forwardParsed.boxes.length,
});
check('forward-command-count', forwardParsed.commands.length === 3, {
  actual: forwardParsed.commands.length,
});
check('rollback-box-count', rollbackParsed.boxes.length === 766, {
  actual: rollbackParsed.boxes.length,
});
check('rollback-has-no-command', rollbackParsed.commands.length === 0, {
  actual: rollbackParsed.commands.length,
});
check('forward-target-uniqueness', forward.duplicates.length === 0, {
  changedCells: forward.cells.size,
  duplicates: forward.duplicates.slice(0, 20),
});
check('rollback-target-uniqueness', rollback.duplicates.length === 0, {
  changedCells: rollback.cells.size,
  duplicates: rollback.duplicates.slice(0, 20),
});
check('changed-cell-count', forward.cells.size === 28729, {
  actual: forward.cells.size,
  report: report.operations.changedCellCount,
});

const sourceMismatches = [];
const observedMaterialRemovalPoints = new Set();
for (const [key, operation] of forward.cells) {
  const actual = await sourceAt(operation.x, operation.y, operation.z);
  const declaration = materialRemovalByPoint.get(key);
  const materialRemovalMatch = (
    declaration
    && operation.expected === declaration.sourceMaterial
    && operation.desired === declaration.desired
    && actual === declaration.snapshotExactSource
  );
  if (materialRemovalMatch) observedMaterialRemovalPoints.add(key);
  if (actual !== operation.expected && !materialRemovalMatch) {
    sourceMismatches.push({
      point: key,
      line: operation.line,
      expected: operation.expected,
      actual,
    });
  }
}
const exactMaterialRemovalSetPassed = (
  observedMaterialRemovalPoints.size === materialRemovalByPoint.size
  && [...materialRemovalByPoint.keys()].every(
    (point) => observedMaterialRemovalPoints.has(point),
  )
);
check(
  'exact-source-state-match',
  sourceMismatches.length === 0
    && materialRemovalDeclarationSchemaPassed
    && exactMaterialRemovalSetPassed,
  {
  checkedCells: forward.cells.size,
  mismatches: sourceMismatches.slice(0, 30),
  materialRemovalExceptions: {
    declaredCells: materialRemovalByPoint.size,
    observedCells: observedMaterialRemovalPoints.size,
    declarationSchemaPassed: materialRemovalDeclarationSchemaPassed,
    exactDeclaredSetPassed: exactMaterialRemovalSetPassed,
  },
  },
);

const rollbackMismatches = [];
for (const [key, operation] of forward.cells) {
  const inverse = rollback.cells.get(key);
  const declaration = materialRemovalByPoint.get(key);
  const rollbackDesiredAccepted = (
    inverse?.desired === operation.expected
    || (
      declaration
      && inverse?.desired === declaration.snapshotExactSource
      && operation.expected === declaration.sourceMaterial
      && operation.desired === declaration.desired
    )
  );
  if (
    !inverse ||
    inverse.expected !== operation.desired ||
    !rollbackDesiredAccepted
  ) {
    rollbackMismatches.push({ point: key, forward: operation, rollback: inverse });
  }
}
for (const key of rollback.cells.keys()) {
  if (!forward.cells.has(key)) rollbackMismatches.push({ rollbackOnlyPoint: key });
}
check('forward-rollback-bijection', rollbackMismatches.length === 0, {
  forwardCells: forward.cells.size,
  rollbackCells: rollback.cells.size,
  mismatches: rollbackMismatches.slice(0, 30),
});

const statefulBases = new Set([
  'minecraft:birch_fence',
  'minecraft:smooth_quartz_slab',
  'minecraft:grass_block',
  'minecraft:oak_wall_sign',
]);
const incompleteStates = [];
for (const [point, operation] of forward.cells) {
  for (const [role, block] of [
    ['source', operation.expected],
    ['desired', operation.desired],
  ]) {
    const declaredMaterialRemoval = (
      role === 'source'
      && materialRemovalByPoint.get(point)?.sourceMaterial === block
      && operation.desired === materialRemovalByPoint.get(point)?.desired
    );
    if (
      statefulBases.has(baseName(block))
      && !block.includes('[')
      && !declaredMaterialRemoval
    ) {
      incompleteStates.push({
        point: [operation.x, operation.y, operation.z],
        role,
        block,
      });
    }
  }
}
check(
  'stateful-blocks-fully-specified',
  incompleteStates.length === 0
    && materialRemovalDeclarationSchemaPassed
    && exactMaterialRemovalSetPassed,
  {
  incompleteStates: incompleteStates.slice(0, 30),
  permittedMaterialRemovalCells: materialRemovalByPoint.size,
  },
);

const commandChecks = forwardParsed.commands.map((command) => {
  const match = command.text.match(
    /^CMD execute if block (-?\d+) (-?\d+) (-?\d+) (minecraft:\S+) run data merge block (-?\d+) (-?\d+) (-?\d+) /,
  );
  if (!match) return { line: command.line, passed: false, reason: 'not-guarded' };
  const first = match.slice(1, 4).map(Number);
  const second = match.slice(5, 8).map(Number);
  const guardedState = normalizeBlock(match[4]);
  const target = forward.cells.get(pointKey(...first));
  return {
    line: command.line,
    passed:
      first.join(',') === second.join(',') &&
      target?.desired === guardedState &&
      baseName(target?.expected ?? '') === 'minecraft:air',
    point: first,
    guardedState,
    forwardTarget: target?.desired,
    source: target?.expected,
  };
});
check('sign-nbt-commands-guarded', commandChecks.every((entry) => entry.passed), {
  commands: commandChecks,
});

const protectedIntersections = [];
for (const [key, operation] of forward.cells) {
  for (const [id, box] of PROTECTED_BOXES) {
    if (inside([operation.x, operation.y, operation.z], box)) {
      protectedIntersections.push({ point: key, protectedId: id });
    }
  }
  if (LOADED_CHESTS.has(key)) {
    protectedIntersections.push({ point: key, protectedId: 'loaded-chest' });
  }
}
check('protected-box-exclusion', protectedIntersections.length === 0, {
  protectedBoxes: PROTECTED_BOXES.length,
  loadedChestCoordinates: LOADED_CHESTS.size,
  intersections: protectedIntersections.slice(0, 30),
});

const blockEntityCensus = JSON.parse(execFileSync(
  process.execPath,
  [
    'scripts/block_entity_census.mjs',
    '--regions',
    REGIONS,
    '--box',
    '119',
    '44',
    '137',
    '262',
    '136',
    '245',
  ],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
));
const targetedBlockEntities = blockEntityCensus.entities
  .filter((entity) => forward.cells.has(pointKey(entity.x, entity.y, entity.z)))
  .map((entity) => ({
    id: entity.id,
    point: [entity.x, entity.y, entity.z],
  }));
check('block-entity-exclusion', targetedBlockEntities.length === 0, {
  chunksRead: blockEntityCensus.chunksRead,
  chunksMissing: blockEntityCensus.chunksMissing,
  blockEntitiesInBroadCensus: blockEntityCensus.count,
  targetedBlockEntities,
  note:
    'The broad C01 census intentionally contains protected interiors; zero '
    + 'block entities may intersect an operation target.',
});

const directFluids = [];
const landformFluidNeighbors = [];
const seenFluidNeighbor = new Set();
for (const [key, operation] of forward.cells) {
  if (
    FLUID.has(baseName(operation.expected)) ||
    FLUID.has(baseName(operation.desired)) ||
    operation.expected.includes('waterlogged=true') ||
    operation.desired.includes('waterlogged=true')
  ) {
    directFluids.push({
      point: key,
      source: operation.expected,
      desired: operation.desired,
    });
  }
  if (!operation.phase?.includes('landform')) continue;
  for (const [dx, dy, dz] of [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]) {
    const neighborKey = pointKey(operation.x + dx, operation.y + dy, operation.z + dz);
    if (seenFluidNeighbor.has(neighborKey)) continue;
    const block = await sourceAt(
      operation.x + dx,
      operation.y + dy,
      operation.z + dz,
    );
    if (FLUID.has(baseName(block)) || block.includes('waterlogged=true')) {
      landformFluidNeighbors.push({ point: neighborKey, block });
    }
    seenFluidNeighbor.add(neighborKey);
  }
}
check('target-fluid-exclusion', directFluids.length === 0, directFluids.slice(0, 30));
check('landform-fluid-halo', landformFluidNeighbors.length === 0, {
  uniqueNeighborCellsChecked: seenFluidNeighbor.size,
  hazards: landformFluidNeighbors.slice(0, 30),
});

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const database = new Database(path.join(ROOT, 'data/world-map.db'), {
  readonly: true,
});
const stalls = database.prepare(`
  SELECT external_id AS externalId, min_x AS minX, max_x AS maxX,
         min_z AS minZ, max_z AS maxZ
  FROM world_features
  WHERE project_id = 'mainstreet-america'
    AND kind = 'parking'
    AND external_id LIKE 'P01-BAY-%'
`).all();
database.close();
const stallIntersections = [];
for (const operation of forward.cells.values()) {
  for (const stall of stalls) {
    if (
      operation.x >= stall.minX && operation.x <= stall.maxX &&
      operation.z >= stall.minZ && operation.z <= stall.maxZ
    ) {
      stallIntersections.push({
        externalId: stall.externalId,
        point: [operation.x, operation.y, operation.z],
      });
    }
  }
}
check('parking-stall-count-and-nonintersection',
  stalls.length === 236 && stallIntersections.length === 0, {
    stallCount: stalls.length,
    intersectedTargets: stallIntersections.slice(0, 30),
  });

async function isStandable(x, z) {
  const support = await finalAt(x, 64, z);
  const headroom = [];
  for (const y of [65, 66, 67]) headroom.push(await finalAt(x, y, z));
  return (
    !AIR.has(baseName(support)) &&
    !FLUID.has(baseName(support)) &&
    headroom.every((block) => AIR.has(baseName(block)))
  );
}

const roadProfile = [];
for (let z = 206; z <= 245; z += 1) {
  let standable = 0;
  const blocked = [];
  for (let x = 120; x <= 125; x += 1) {
    if (await isStandable(x, z)) standable += 1;
    else blocked.push(x);
  }
  roadProfile.push({ z, standableWidth: standable, blockedX: blocked });
}
const northConnectionX = [];
const southConnectionX = [];
for (let x = 120; x <= 125; x += 1) {
  if (await isStandable(x, 205) && await isStandable(x, 206)) {
    northConnectionX.push(x);
  }
  if (await isStandable(x, 245) && await isStandable(x, 246)) {
    southConnectionX.push(x);
  }
}
const gateBlocked = [];
for (let x = 120; x <= 125; x += 1) {
  for (const y of [65, 66, 67]) {
    const block = await finalAt(x, y, 231);
    if (!AIR.has(baseName(block))) gateBlocked.push({ point: [x, y, 231], block });
  }
}
check('road-six-wide-three-high-profile',
  roadProfile.every((station) => station.standableWidth === 6), roadProfile);
check('road-north-connectivity', northConnectionX.length === 6, northConnectionX);
check('road-south-connectivity', southConnectionX.length === 6, southConnectionX);
check('authored-gate-headroom', gateBlocked.length === 0, gateBlocked);

const queue = [[120, 206]];
const visited = new Set(['120,206']);
while (queue.length > 0) {
  const [x, z] = queue.shift();
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx;
    const nz = z + dz;
    const key = `${nx},${nz}`;
    if (
      nx < 120 || nx > 125 || nz < 205 || nz > 246 ||
      visited.has(key) || !(await isStandable(nx, nz))
    ) continue;
    visited.add(key);
    queue.push([nx, nz]);
  }
}
check('road-bidirectional-geometric-connectivity',
  [...Array(6).keys()].every((offset) =>
    visited.has(`${120 + offset},205`) &&
    visited.has(`${120 + offset},246`)), {
    standableCellsReached: visited.size,
    expectedCorridorCells: 6 * 42,
  });

async function exposure(face) {
  let manufacturedFacadeCells = 0;
  let exposedBefore = 0;
  let exposedAfter = 0;
  for (let first = face.firstMin; first <= face.firstMax; first += 1) {
    for (let y = face.minY; y <= face.maxY; y += 1) {
      const x = face.axis === 'x' ? face.fixed : first;
      const z = face.axis === 'z' ? face.fixed : first;
      const wall = baseName(await sourceAt(x, y, z));
      if (AIR.has(wall) || FLUID.has(wall) || NATURAL_GROUND.has(wall)) continue;
      manufacturedFacadeCells += 1;
      const before = await sourceAt(x + face.dx, y, z + face.dz);
      const after = await finalAt(x + face.dx, y, z + face.dz);
      if (AIR.has(baseName(before)) || isFoliage(before) || isReplaceable(before)) {
        exposedBefore += 1;
      }
      if (AIR.has(baseName(after)) || isFoliage(after) || isReplaceable(after)) {
        exposedAfter += 1;
      }
    }
  }
  return {
    manufacturedFacadeCells,
    exposedBefore,
    exposedAfter,
    newlyScreened: exposedBefore - exposedAfter,
    exposureReductionPercent: exposedBefore
      ? Number((((exposedBefore - exposedAfter) / exposedBefore) * 100).toFixed(1))
      : 0,
  };
}

const exposureRecomputed = {
  west: await exposure({
    axis: 'x',
    fixed: 176,
    firstMin: 139,
    firstMax: 180,
    minY: 98,
    maxY: 118,
    dx: -1,
    dz: 0,
  }),
  east: await exposure({
    axis: 'x',
    fixed: 234,
    firstMin: 139,
    firstMax: 171,
    minY: 98,
    maxY: 118,
    dx: 1,
    dz: 0,
  }),
  southWest: await exposure({
    axis: 'z',
    fixed: 181,
    firstMin: 176,
    firstMax: 207,
    minY: 98,
    maxY: 118,
    dx: 0,
    dz: 1,
  }),
};
check('facade-exposure-recomputed',
  JSON.stringify(exposureRecomputed) ===
    JSON.stringify(report.visualEffect.exposedManufacturedFacade), {
    recomputed: exposureRecomputed,
    reported: report.visualEffect.exposedManufacturedFacade,
  });

const landformColumns = new Map();
for (const operation of forward.cells.values()) {
  if (!operation.phase?.includes('landform')) continue;
  const key = `${operation.x},${operation.z}`;
  const current = landformColumns.get(key) ?? {
    x: operation.x,
    z: operation.z,
    ys: [],
  };
  current.ys.push(operation.y);
  landformColumns.set(key, current);
}
const discontinuousLandformColumns = [];
for (const column of landformColumns.values()) {
  column.ys.sort((a, b) => a - b);
  for (
    let y = column.ys[0];
    y <= column.ys[column.ys.length - 1];
    y += 1
  ) {
    const block = await finalAt(column.x, y, column.z);
    if (AIR.has(baseName(block)) || FLUID.has(baseName(block))) {
      discontinuousLandformColumns.push({
        x: column.x,
        z: column.z,
        gapY: y,
        block,
      });
      break;
    }
  }
}
check('landform-fill-continuity', discontinuousLandformColumns.length === 0, {
  changedColumns: landformColumns.size,
  discontinuousColumns: discontinuousLandformColumns.slice(0, 20),
});

check('generic-preflight',
  preflight.passed === 766 && preflight.failed === 0 &&
    preflight.partialMasks.length === 0, preflight);
check('strict-forward-dry-run',
  dryRun.dryRun === true && dryRun.strictNoop === true &&
    dryRun.sourceOperationCount === 769 &&
    dryRun.commandCount === 769 &&
    dryRun.worldEditLeftoverCount === 0 &&
    dryRun.failedCommands === 0, dryRun);
check('strict-rollback-dry-run',
  rollbackDryRun.dryRun === true && rollbackDryRun.strictNoop === true &&
    rollbackDryRun.sourceOperationCount === 766 &&
    rollbackDryRun.commandCount === 766 &&
    rollbackDryRun.worldEditLeftoverCount === 0 &&
    rollbackDryRun.failedCommands === 0, rollbackDryRun);
check('artifact-hashes',
  sha256(fs.readFileSync(FORWARD)) === report.operations.forward.sha256 &&
    sha256(fs.readFileSync(ROLLBACK)) === report.operations.rollback.sha256, {
    forward: sha256(fs.readFileSync(FORWARD)),
    reportForward: report.operations.forward.sha256,
    rollback: sha256(fs.readFileSync(ROLLBACK)),
    reportRollback: report.operations.rollback.sha256,
  });

const cameraIds = cameras.cameras.map((camera) => camera.id);
const cameraOutputs = cameras.cameras.map((camera) => camera.output);
check('camera-contract',
  cameras.baseline.hashMatched === true &&
    cameras.baseline.observedSha256 === EXPECTED_SNAPSHOT &&
    cameras.capturePolicy.sameCameraAfterRequired === true &&
    cameras.capturePolicy.sameLightingAfterRequired === true &&
    cameras.cameras.length === 8 &&
    new Set(cameraIds).size === 8 &&
    new Set(cameraOutputs).size === 8, {
    cameraCount: cameras.cameras.length,
    uniqueIds: new Set(cameraIds).size,
    uniqueOutputs: new Set(cameraOutputs).size,
  });

const qa = {
  schemaVersion: 1,
  id: 'mainstreet-bunker-surface-phase1-independent-qa',
  generatedAtUtc: new Date().toISOString(),
  status: failures.length === 0
    ? 'PASS_OFFLINE_LIVE_GATES_PENDING'
    : 'FAIL',
  independentReview: {
    generatorReportTreatedAsClaim: true,
    sourceSnapshotReread: true,
    featureDatabaseMode: 'read-only',
    liveRconUsed: false,
    worldMutated: false,
  },
  correctedDefects: [
    {
      id: 'BSP1-EXACT-STATE-LOSS',
      severity: 'release-blocking',
      before:
        'The shared snapshot reader returned palette Name only, so fence/slab '
        + 'source properties and rollback restoration states were lost.',
      correction:
        'AnvilSnapshot now exposes full sorted palette states; Phase 1 reads '
        + 'those exact states. Grass-block desired states are also explicit.',
      verification:
        '28,729/28,729 exact source states match; stateful source/desired '
        + 'coverage and rollback bijection pass.',
    },
    {
      id: 'BSP1-UNGUARDED-SIGN-NBT',
      severity: 'release-blocking',
      before: 'Three sign data-merge commands had no desired-state guard.',
      correction:
        'Each command now uses execute if block with the exact desired wall-sign state.',
      verification: '3/3 commands match their exact forward target and coordinates.',
    },
  ],
  baseline: {
    regions: relative(REGIONS),
    ...digest,
  },
  artifacts: {
    forward: {
      path: relative(FORWARD),
      sha256: sha256(fs.readFileSync(FORWARD)),
    },
    rollback: {
      path: relative(ROLLBACK),
      sha256: sha256(fs.readFileSync(ROLLBACK)),
    },
    generatorReport: relative(REPORT),
    cameraContract: relative(CAMERAS),
    genericPreflight: relative(PREFLIGHT),
    strictDryRun: relative(DRY_RUN),
    rollbackStrictDryRun: relative(ROLLBACK_DRY_RUN),
  },
  summary: {
    assertions: assertions.length,
    passed: assertions.filter((assertion) => assertion.passed).length,
    failed: failures.length,
    forwardBoxes: forwardParsed.boxes.length,
    forwardCommands: forwardParsed.commands.length,
    forwardUniqueCells: forward.cells.size,
    rollbackBoxes: rollbackParsed.boxes.length,
    rollbackUniqueCells: rollback.cells.size,
    exactSourceCellsChecked: forward.cells.size,
    protectedBoxesChecked: PROTECTED_BOXES.length,
    loadedChestCoordinatesChecked: LOADED_CHESTS.size,
    broadCensusBlockEntities: blockEntityCensus.count,
    targetedBlockEntities: targetedBlockEntities.length,
    landformFluidHaloCellsChecked: seenFluidNeighbor.size,
    directFluidTargets: directFluids.length,
    parkingStallsChecked: stalls.length,
    parkingIntersections: stallIntersections.length,
    roadStations: roadProfile.length,
    roadMinimumStandableWidth: Math.min(
      ...roadProfile.map((station) => station.standableWidth),
    ),
    northConnectionWidth: northConnectionX.length,
    southConnectionWidth: southConnectionX.length,
    changedLandformColumns: landformColumns.size,
    cameraViews: cameras.cameras.length,
  },
  standardsDisposition: {
    phase1Road:
      'The east-edge seam is a six-wide, level connector with three-block '
      + 'headroom and full north/south connectivity.',
    finalMountainRoad:
      'Not satisfied by this package. The audit calls for a seven-wide '
      + 'terrain-following mountain access road; that remains Phase 2+ scope.',
    concealment:
      'Material improvement only: the north face, aircraft door/trail, roof '
      + 'cornice, and retained observatory remain visible. This is not final '
      + 'zero-shell or three-natural-block-cover acceptance.',
    parking:
      'All 236 recorded stalls remain outside every target.',
    entityLimitation:
      'Frozen region files prove block-entity exclusion. Free-entity data is '
      + 'not present, so the same-moment live entity gate remains mandatory.',
  },
  road: {
    profile: roadProfile,
    northConnectionX,
    southConnectionX,
    gateBlocked,
    geometricallyBidirectional: assertions.find(
      (assertion) => assertion.id === 'road-bidirectional-geometric-connectivity',
    )?.passed,
  },
  exposure: exposureRecomputed,
  assertions,
  failures,
  mandatoryLiveGates: [
    'fresh saved-world hash and 766/766 guard preflight',
    'zero free/protected entities and zero active builders in target volumes',
    'all eight before cameras captured with recorded lighting',
    'strict live runner reports zero failures and zero no-ops',
    'post-build exact target census and protected inventory reconciliation',
    'normal-speed two-way road walk',
    'all eight same-camera after images',
    'accept Phase 1 only as partial concealment, not final underground completion',
  ],
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(qa, null, 2)}\n`);
console.log(
  `${path.basename(OUTPUT)}: ${qa.summary.passed}/${qa.summary.assertions} `
  + `assertions pass; ${qa.summary.failed} fail`,
);
console.log(
  `  cells ${qa.summary.exactSourceCellsChecked}; road min width `
  + `${qa.summary.roadMinimumStandableWidth}; stalls `
  + `${qa.summary.parkingStallsChecked}; targeted block entities `
  + `${qa.summary.targetedBlockEntities}`,
);
console.log(`  status: ${qa.status}`);
process.exit(failures.length === 0 ? 0 : 1);
