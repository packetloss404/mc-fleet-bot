#!/usr/bin/env node
/**
 * Independent offline QA for the Raven Rock S1 section pilot.
 *
 * This checker does not import the generator. It re-censuses the frozen Anvil
 * snapshot through the repository's general block/block-entity tools, verifies
 * every forward guard, proves the rollback is an exact reverse bijection, and
 * simulates the final 7-wide x 8-high section and rollback state.
 *
 * After execution, pass --observed-regions <fresh snapshot>/region. The checker
 * then requires every cell in the 1,716-cell safety buffer to equal the simulated
 * final state. After rollback, add --expect rollback instead.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const DEFAULT_BASE =
  'data/buildops/ravenrock-s1-section-pilot-2026-07-27';
const DEFAULT_REGIONS =
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region';
const EXPECTED_SNAPSHOT_SHA256 =
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654';
const BUFFER = [137, -13, -19, 149, -2, -9];

const args = process.argv.slice(2);
function value(flag, fallback) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
}
const base = path.resolve(ROOT, value('--base', DEFAULT_BASE));
const regions = path.resolve(ROOT, value('--regions', DEFAULT_REGIONS));
const out = path.resolve(
  ROOT,
  value('--out', `${base}.qa.json`),
);
const observedRegionsValue = value('--observed-regions', null);
const observedRegions = observedRegionsValue
  ? path.resolve(ROOT, observedRegionsValue)
  : null;
const expectedObservedState = value('--expect', 'final');
if (!['final', 'rollback'].includes(expectedObservedState)) {
  throw new Error('--expect must be final or rollback');
}
const opsPath = `${base}.txt`;
const rollbackPath = `${base}.rollback.txt`;
const reportPath = `${base}.report.json`;
const prestatePath = `${base}.prestate.json`;

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID_OR_GRAVITY = new Set([
  'minecraft:water',
  'minecraft:lava',
  'minecraft:bubble_column',
  'minecraft:powder_snow',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function snapshotDigest(directory) {
  const hash = crypto.createHash('sha256');
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(directory, name)));
    hash.update('\0');
  }
  return { sha256: hash.digest('hex'), regionFileCount: names.length };
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

function baseName(block) {
  return block.split('[', 1)[0];
}

function pointKey(point) {
  return point.join(',');
}

function parseOperations(filename) {
  const records = [];
  const invalid = [];
  for (const [index, raw] of fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      invalid.push({ line: index + 1, text: line });
      continue;
    }
    const box = fields.slice(1, 7).map(Number);
    records.push({
      line: index + 1,
      point: box.slice(0, 3),
      secondPoint: box.slice(3, 6),
      expected: normalizeBlock(fields[7]),
      desired: normalizeBlock(fields[8]),
    });
  }
  return { records, invalid };
}

function censusSnapshot(directory) {
  const stdout = execFileSync(
    process.execPath,
    [
      'scripts/block_census.mjs',
      '--regions',
      directory,
      '--box',
      ...BUFFER.map(String),
      '--include-air',
      '--states',
      '--list',
    ],
    { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
  );
  const blocks = new Map();
  for (const line of stdout.split(/\r?\n/)) {
    const match = line.match(
      /^\s+(-?\d+) (-?\d+) (-?\d+)\s+(minecraft:\S+)\s*$/,
    );
    if (!match) continue;
    blocks.set(
      `${match[1]},${match[2]},${match[3]}`,
      normalizeBlock(match[4]),
    );
  }
  const chunks = stdout.match(/chunks:\s+(\d+) read,\s+(\d+) absent/);
  return {
    blocks,
    chunksRead: Number(chunks?.[1] ?? -1),
    chunksMissing: Number(chunks?.[2] ?? -1),
  };
}

const failures = [];
const assertions = [];
function check(name, passed, details = undefined) {
  assertions.push({ name, passed, details });
  if (!passed) failures.push({ name, details });
}

for (const filename of [opsPath, rollbackPath, reportPath, prestatePath]) {
  check(
    `artifact exists: ${relative(filename)}`,
    fs.existsSync(filename),
  );
}
if (failures.length > 0) {
  throw new Error(`missing artifacts: ${JSON.stringify(failures)}`);
}

const digest = snapshotDigest(regions);
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const prestate = JSON.parse(fs.readFileSync(prestatePath, 'utf8'));
const forward = parseOperations(opsPath);
const rollback = parseOperations(rollbackPath);
const census = censusSnapshot(regions);
const blockEntities = JSON.parse(execFileSync(
  process.execPath,
  [
    'scripts/block_entity_census.mjs',
    '--regions',
    regions,
    '--box',
    ...BUFFER.map(String),
  ],
  { cwd: ROOT, encoding: 'utf8' },
));

check(
  'snapshot hash matches the frozen release baseline',
  digest.sha256 === EXPECTED_SNAPSHOT_SHA256 &&
    report.baseline.sha256 === EXPECTED_SNAPSHOT_SHA256 &&
    prestate.baseline.sha256 === EXPECTED_SNAPSHOT_SHA256,
  { computed: digest.sha256 },
);
const databaseFeature = report.databaseFeatures?.find(
  (feature) => feature.externalId === 'RR-S1-STANDARD-PILOT',
);
const qualityDimensions = databaseFeature?.attributes?.quality ?? {};
const qualityStatuses = [
  qualityDimensions.functional?.status,
  qualityDimensions.walkability?.status,
  qualityDimensions.legibility?.status,
  qualityDimensions.mediaCoverage?.status,
];
const qualityScores = [
  qualityDimensions.functional?.score,
  qualityDimensions.walkability?.score,
  qualityDimensions.legibility?.score,
  qualityDimensions.mediaCoverage?.score,
];
check('machine report defines the stable pilot database feature',
  report.databaseFeatures?.length === 1 &&
    databaseFeature?.kind === 'custom' &&
    databaseFeature?.parentExternalId === 'raven-rock:DISTRICT' &&
    databaseFeature?.attributes?.featureClass === 'utility',
  databaseFeature);
check('database feature carries the exact three-dimensional shell bounds',
  JSON.stringify(databaseFeature?.geometry) === JSON.stringify({
    type: 'bounds',
    minX: 138,
    minY: -12,
    minZ: -18,
    maxX: 148,
    maxY: -3,
    maxZ: -10,
  }),
  databaseFeature?.geometry);
check('quality dimensions have distinct evidence states and no default 100',
  qualityStatuses.every(Boolean) &&
    new Set(qualityStatuses).size === qualityStatuses.length &&
    qualityScores.every((score) => Number.isFinite(score) && score !== 100) &&
    databaseFeature?.conditionScore === null,
  { qualityStatuses, qualityScores, conditionScore: databaseFeature?.conditionScore });
check('all four safety-buffer chunks are present',
  census.chunksRead === 4 && census.chunksMissing === 0,
  { read: census.chunksRead, missing: census.chunksMissing });
check('forward file contains only exact REPL operations',
  forward.invalid.length === 0, forward.invalid);
check('rollback file contains only exact REPL operations',
  rollback.invalid.length === 0, rollback.invalid);
check('forward and rollback operation counts match',
  forward.records.length === rollback.records.length &&
    forward.records.length === report.operationCount,
  {
    forward: forward.records.length,
    rollback: rollback.records.length,
    report: report.operationCount,
  });

const targetKeys = forward.records.map((operation) => pointKey(operation.point));
check('all forward targets are unique',
  new Set(targetKeys).size === targetKeys.length);
check('all operations are one-cell operations',
  [...forward.records, ...rollback.records].every((operation) =>
    pointKey(operation.point) === pointKey(operation.secondPoint)));
check('all targets remain inside the approved S1 shell',
  forward.records.every(({ point: [x, y, z] }) =>
    x >= 138 && x <= 148 &&
    y >= -12 && y <= -3 &&
    z >= -18 && z <= -10));
check('T4 aquifer bulkhead cannot be targeted',
  forward.records.every(({ point: [x] }) => x > -277));

const prestateByPoint = new Map(
  prestate.cells.map((cell) => [pointKey(cell.point), normalizeBlock(cell.source)]),
);
for (const operation of forward.records) {
  const point = pointKey(operation.point);
  check(
    `source guard matches snapshot at ${point}`,
    census.blocks.get(point) === operation.expected &&
      prestateByPoint.get(point) === operation.expected,
    {
      census: census.blocks.get(point),
      prestate: prestateByPoint.get(point),
      guard: operation.expected,
    },
  );
}

for (let index = 0; index < forward.records.length; index += 1) {
  const operation = forward.records[index];
  const inverse = rollback.records[rollback.records.length - index - 1];
  check(
    `rollback bijection for forward line ${operation.line}`,
    pointKey(operation.point) === pointKey(inverse.point) &&
      operation.expected === inverse.desired &&
      operation.desired === inverse.expected,
    { operation, inverse },
  );
}

const hazardCells = [...census.blocks.entries()]
  .filter(([, block]) =>
    FLUID_OR_GRAVITY.has(baseName(block)) || block.includes('waterlogged=true'))
  .map(([point, block]) => ({ point, block }));
check('safety buffer has zero fluid, waterlogged, or gravity hazards',
  hazardCells.length === 0, hazardCells);
check('safety buffer has zero block entities',
  blockEntities.count === 0 && blockEntities.chunksMissing === 0,
  blockEntities);

const finalState = new Map(census.blocks);
for (const operation of forward.records) {
  const point = pointKey(operation.point);
  if (finalState.get(point) !== operation.expected) {
    failures.push({
      name: `simulation source drift at ${point}`,
      details: {
        actual: finalState.get(point),
        expected: operation.expected,
      },
    });
  }
  finalState.set(point, operation.desired);
}

const stationResults = [];
for (let x = 138; x <= 148; x += 1) {
  let clear = 0;
  let floor = 0;
  let ceiling = 0;
  let northWall = 0;
  let southWall = 0;
  for (let z = -17; z <= -11; z += 1) {
    if (finalState.get(`${x},-12,${z}`) === 'minecraft:stone_bricks') floor += 1;
    const ceilingBlock = finalState.get(`${x},-3,${z}`);
    if (
      ceilingBlock === 'minecraft:stone_bricks' ||
      ceilingBlock === 'minecraft:sea_lantern'
    ) ceiling += 1;
    for (let y = -11; y <= -4; y += 1) {
      if (AIR.has(baseName(finalState.get(`${x},${y},${z}`)))) clear += 1;
    }
  }
  for (let y = -11; y <= -4; y += 1) {
    const expected = y === -7
      ? 'minecraft:oxidized_copper'
      : 'minecraft:polished_deepslate';
    if (finalState.get(`${x},${y},-18`) === expected) northWall += 1;
    if (finalState.get(`${x},${y},-10`) === expected) southWall += 1;
  }
  stationResults.push({
    x,
    clearCells: clear,
    floorCells: floor,
    ceilingCells: ceiling,
    northWallCells: northWall,
    southWallCells: southWall,
    passed:
      clear === 56 &&
      floor === 7 &&
      ceiling === 7 &&
      northWall === 8 &&
      southWall === 8,
  });
}
check('all eleven stations simulate a sealed 7-wide x 8-high section',
  stationResults.every((station) => station.passed), stationResults);

const lightPoints = [];
for (const [point, block] of finalState) {
  if (block !== 'minecraft:sea_lantern') continue;
  const [x, y, z] = point.split(',').map(Number);
  if (x >= 138 && x <= 148 && y === -3 && z >= -17 && z <= -11) {
    lightPoints.push([x, y, z]);
  }
}
check('three evenly spaced ceiling lights survive the simulation',
  JSON.stringify(lightPoints.sort()) ===
    JSON.stringify([[139, -3, -15], [143, -3, -15], [147, -3, -15]].sort()),
  lightPoints);

const restored = new Map(finalState);
for (const operation of rollback.records) {
  const point = pointKey(operation.point);
  if (restored.get(point) !== operation.expected) {
    failures.push({
      name: `rollback simulation source drift at ${point}`,
      details: {
        actual: restored.get(point),
        expected: operation.expected,
      },
    });
  }
  restored.set(point, operation.desired);
}
const restorationDifferences = forward.records
  .filter((operation) =>
    restored.get(pointKey(operation.point)) !==
      census.blocks.get(pointKey(operation.point)))
  .map((operation) => ({
    point: operation.point,
    restored: restored.get(pointKey(operation.point)),
    source: census.blocks.get(pointKey(operation.point)),
  }));
check('rollback simulation restores every changed cell exactly',
  restorationDifferences.length === 0, restorationDifferences);

let observed = null;
if (observedRegions) {
  const observedDigest = snapshotDigest(observedRegions);
  const observedCensus = censusSnapshot(observedRegions);
  const expected = expectedObservedState === 'final' ? finalState : census.blocks;
  const differences = [];
  for (const [point, block] of census.blocks) {
    const actual = observedCensus.blocks.get(point);
    const desiredBlock = expected.get(point);
    if (actual !== desiredBlock) {
      differences.push({ point, expected: desiredBlock, actual });
    }
  }
  const observedBlockEntities = JSON.parse(execFileSync(
    process.execPath,
    [
      'scripts/block_entity_census.mjs',
      '--regions',
      observedRegions,
      '--box',
      ...BUFFER.map(String),
    ],
    { cwd: ROOT, encoding: 'utf8' },
  ));
  const observedHazards = [...observedCensus.blocks.entries()]
    .filter(([, block]) =>
      FLUID_OR_GRAVITY.has(baseName(block)) || block.includes('waterlogged=true'))
    .map(([point, block]) => ({ point, block }));
  check(`observed ${expectedObservedState} snapshot has all four chunks`,
    observedCensus.chunksRead === 4 && observedCensus.chunksMissing === 0,
    {
      read: observedCensus.chunksRead,
      missing: observedCensus.chunksMissing,
    });
  check(`observed ${expectedObservedState} snapshot matches every safety-buffer cell`,
    differences.length === 0, differences.slice(0, 50));
  check(`observed ${expectedObservedState} snapshot has no fluid/gravity hazard`,
    observedHazards.length === 0, observedHazards);
  check(`observed ${expectedObservedState} snapshot has no block entities`,
    observedBlockEntities.count === 0 &&
      observedBlockEntities.chunksMissing === 0,
    observedBlockEntities);
  observed = {
    state: expectedObservedState,
    regions: relative(observedRegions),
    ...observedDigest,
    chunksRead: observedCensus.chunksRead,
    chunksMissing: observedCensus.chunksMissing,
    safetyBufferCellCount: census.blocks.size,
    differences: differences.length,
    fluidOrGravityHazards: observedHazards.length,
    blockEntities: observedBlockEntities.count,
  };
}

const qa = {
  schemaVersion: 1,
  packageId: 'INF-RR-01',
  generatedAtUtc: new Date().toISOString(),
  status: failures.length > 0
    ? 'FAIL'
    : observedRegions
      ? `PASS_OBSERVED_${expectedObservedState.toUpperCase()}`
      : 'PASS_OFFLINE_LIVE_GATE_PENDING',
  offlinePassed: failures.length === 0,
  packageReadyForLiveGates: failures.length === 0,
  worldReadyForExecution: false,
  worldReadyNote:
    'Offline artifacts cannot prove same-moment entity, player, builder, or '
    + 'saved-world state. Complete the mandatory live gates immediately before '
    + 'execution.',
  mandatoryLiveGates: [
    'fresh saved-world snapshot reproduces every exact source guard',
    'free-entity query in the safety buffer returns zero protected entities',
    'no active builder or player occupies the pilot volume',
    'RCON runner reports zero failed commands',
    'post-build two-way normal walk and same-camera evidence pass',
  ],
  baseline: {
    regions: relative(regions),
    ...digest,
  },
  inputs: {
    operations: relative(opsPath),
    rollback: relative(rollbackPath),
    report: relative(reportPath),
    prestate: relative(prestatePath),
    observedRegions: observedRegions ? relative(observedRegions) : null,
    expectedObservedState: observedRegions ? expectedObservedState : null,
  },
  summary: {
    forwardOperations: forward.records.length,
    rollbackOperations: rollback.records.length,
    uniqueTargets: new Set(targetKeys).size,
    blockEntities: blockEntities.count,
    fluidOrGravityHazards: hazardCells.length,
    passingStations: stationResults.filter((station) => station.passed).length,
    totalStations: stationResults.length,
    assertionCount: assertions.length,
    failedAssertions: failures.length,
  },
  stationResults,
  observed,
  assertions,
  failures,
};

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(qa, null, 2)}\n`);
console.log(
  `${path.basename(opsPath)}: ${qa.summary.assertionCount - failures.length}/`
  + `${qa.summary.assertionCount} QA assertions pass; `
  + `${qa.summary.passingStations}/${qa.summary.totalStations} section stations pass`,
);
console.log(`  status: ${qa.status}`);
console.log(`  report: ${out}`);
process.exit(failures.length === 0 ? 0 : 1);
