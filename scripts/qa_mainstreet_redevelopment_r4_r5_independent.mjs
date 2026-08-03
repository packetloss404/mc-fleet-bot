#!/usr/bin/env node
/**
 * Independent release QA for the MainStreet America R4/R5 package.
 *
 * The generator report is treated as a claim. This checker reparses the
 * emitted operations, rereads exact source states from the frozen Anvil
 * snapshot using the separate shared reader, queries world-map.db read-only,
 * and independently simulates garages, driveways, alleys, headroom, grade
 * smoothness, protected assets, and import-ready database features.
 *
 * It never connects to Minecraft or RCON.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';

import yaml from 'js-yaml';

import { AnvilSnapshot } from './generate_picket_fence.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);

function argument(name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return args[index + 1];
}

function inputPath(name, fallback) {
  return path.resolve(ROOT, argument(name, fallback));
}

const BASE = argument(
  '--base',
  'data/buildops/mainstreet-redevelopment-r4-r5-2026-07-27',
);
const PLAN = inputPath(
  '--plan',
  'mainstreet-america/planning/redevelopment-r4-r5.yaml',
);
const FORWARD = inputPath('--forward', `${BASE}.txt`);
const ROLLBACK = inputPath('--rollback', `${BASE}.rollback.txt`);
const REPORT = inputPath('--report', `${BASE}.report.json`);
const PREFLIGHT = inputPath('--preflight', `${BASE}.preflight.json`);
const DRY_RUN = inputPath('--forward-dry-run', `${BASE}.forward-dry-run.json`);
const ROLLBACK_DRY_RUN = inputPath(
  '--rollback-dry-run',
  `${BASE}.rollback-dry-run.json`,
);
const RELEASE = inputPath('--release', `${BASE}.release.json`);
const DESIGN = inputPath(
  '--design',
  'data/world-review/mainstreet-redevelopment-r4-r5-design-2026-07-27.json',
);
const CAMERA_MANIFEST = inputPath(
  '--camera-manifest',
  'data/exports/redevelopment-qa-2026-07-27/mainstreet-r4-r5/'
    + 'same-camera-manifest.json',
);
const GARAGE_CAMERA_MANIFEST = inputPath(
  '--garage-camera-manifest',
  path.join(path.dirname(CAMERA_MANIFEST), 'garage-camera-manifest.json'),
);
const OUTPUT = inputPath('--output', `${BASE}.independent-qa.json`);
const REGIONS = inputPath(
  '--regions',
  'data/worldsnap-redevelopment-c9e2bf0a-20260727/region',
);
const DATABASE_PATH = inputPath('--database', 'data/world-map.db');
const EXPECTED_SNAPSHOT = argument(
  '--snapshot-sha',
  'c9e2bf0a2c8d3072d356b8db5c765622a9d367577bc4e09d077bbc58c4310654',
);
const CHECK_RUNTIME_SAFETY = args.includes('--runtime-safety');

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

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function snapshotDigest(directory) {
  const names = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.mca'))
    .sort();
  const digest = crypto.createHash('sha256');
  for (const name of names) {
    digest.update(name);
    digest.update('\0');
    digest.update(fs.readFileSync(path.join(directory, name)));
    digest.update('\0');
  }
  return {
    sha256: digest.digest('hex'),
    regionFiles: names.length,
  };
}

function normalizeBlock(block) {
  const value = String(block);
  const bracket = value.indexOf('[');
  if (bracket < 0) return value;
  const name = value.slice(0, bracket);
  const properties = value
    .slice(bracket + 1, -1)
    .split(',')
    .sort()
    .join(',');
  return `${name}[${properties}]`;
}

function splitBlockMask(mask) {
  const values = [];
  let start = 0;
  let depth = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const character = mask[index];
    if (character === '[') depth += 1;
    else if (character === ']') depth = Math.max(0, depth - 1);
    else if (character === ',' && depth === 0) {
      values.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  values.push(mask.slice(start));
  return [...new Set(values.filter(Boolean).map(normalizeBlock))];
}

function operationAllowsExpected(operation, state) {
  return operation.expectedStates.includes(normalizeBlock(state));
}

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function blockProperties(block) {
  const value = String(block);
  const start = value.indexOf('[');
  if (start < 0) return {};
  return Object.fromEntries(
    value.slice(start + 1, -1).split(',').map((entry) => {
      const separator = entry.indexOf('=');
      return separator < 0
        ? [entry, '']
        : [entry.slice(0, separator), entry.slice(separator + 1)];
    }),
  );
}

function blockWithProperties(block, properties) {
  const name = baseName(block);
  const entries = Object.entries(properties).sort(([left], [right]) => (
    left.localeCompare(right)
  ));
  return entries.length
    ? `${name}[${entries.map(([key, value]) => `${key}=${value}`).join(',')}]`
    : name;
}

const SOIL_SUPPORT = new Set([
  'minecraft:grass_block',
  'minecraft:dirt',
  'minecraft:coarse_dirt',
  'minecraft:podzol',
  'minecraft:mycelium',
  'minecraft:rooted_dirt',
  'minecraft:moss_block',
  'minecraft:mud',
  'minecraft:muddy_mangrove_roots',
]);

function supportDependency(block) {
  const name = baseName(block);
  if (name === 'minecraft:tall_grass') {
    return blockProperties(block).half === 'upper'
      ? 'tall-plant-upper'
      : 'soil-plant';
  }
  if ([
    'minecraft:short_grass',
    'minecraft:fern',
    'minecraft:large_fern',
    'minecraft:dandelion',
    'minecraft:poppy',
    'minecraft:blue_orchid',
    'minecraft:allium',
    'minecraft:azure_bluet',
    'minecraft:red_tulip',
    'minecraft:orange_tulip',
    'minecraft:white_tulip',
    'minecraft:pink_tulip',
    'minecraft:oxeye_daisy',
    'minecraft:cornflower',
    'minecraft:lily_of_the_valley',
    'minecraft:wither_rose',
  ].includes(name)) {
    return 'soil-plant';
  }
  return null;
}

function hasValidSupport(block, support) {
  const dependency = supportDependency(block);
  if (!dependency) return true;
  if (!support) return false;
  if (dependency === 'soil-plant') return SOIL_SUPPORT.has(baseName(support));
  return (
    baseName(support) === 'minecraft:tall_grass'
    && blockProperties(support).half === 'lower'
  );
}

function isFence(block) {
  return /(?:^|:)\w+_fence(?:\[|$)/.test(String(block))
    && !String(block).includes('_fence_gate');
}

function likelyConnectsToFence(block) {
  const name = baseName(block);
  if (!name || AIR.has(name) || FLUID.has(name)) return false;
  if (supportDependency(block)) return false;
  if (
    name.endsWith('_leaves')
    || name === 'minecraft:leaf_litter'
    || name.endsWith('_carpet')
    || name.endsWith('_pressure_plate')
    || name.endsWith('_button')
    || name.endsWith('_torch')
    || name === 'minecraft:snow'
  ) {
    return false;
  }
  return true;
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function key2(x, z) {
  return `${x},${z}`;
}

function parseOperations(filename) {
  const boxes = [];
  const commands = [];
  const sets = [];
  const invalid = [];
  let meta = { phase: null, scope: null, role: null };
  for (const [index, raw] of fs.readFileSync(filename, 'utf8')
    .split(/\r?\n/)
    .entries()) {
    const line = raw.trim();
    const group = line.match(/^# phase=(\d+) scope=(\S+) role=(\S+)$/);
    if (group) {
      meta = {
        phase: Number(group[1]),
        scope: group[2],
        role: group[3],
      };
      continue;
    }
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    if (fields[0] === 'SET') {
      sets.push({ line: index + 1, text: line, ...meta });
      continue;
    }
    if (fields[0] === 'CMD') {
      commands.push({ line: index + 1, text: line, ...meta });
      continue;
    }
    if (
      fields[0] !== 'REPL'
      || fields.length !== 9
      || fields.slice(1, 7).some((value) => !Number.isInteger(Number(value)))
    ) {
      invalid.push({ line: index + 1, text: line, ...meta });
      continue;
    }
    const expectedStates = splitBlockMask(fields[7]);
    boxes.push({
      line: index + 1,
      bounds: fields.slice(1, 7).map(Number),
      expected: expectedStates.join(','),
      expectedStates,
      desired: normalizeBlock(fields[8]),
      ...meta,
    });
  }
  return { boxes, commands, sets, invalid };
}

function expandOperations(parsed) {
  const cells = new Map();
  const duplicates = [];
  for (const box of parsed.boxes) {
    const [ax, ay, az, bx, by, bz] = box.bounds;
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x += 1) {
      for (let y = Math.min(ay, by); y <= Math.max(ay, by); y += 1) {
        for (let z = Math.min(az, bz); z <= Math.max(az, bz); z += 1) {
          const key = key3(x, y, z);
          if (cells.has(key)) {
            duplicates.push({
              point: [x, y, z],
              firstLine: cells.get(key).line,
              secondLine: box.line,
              firstScope: cells.get(key).scope,
              secondScope: box.scope,
            });
            continue;
          }
          cells.set(key, {
            x,
            y,
            z,
            line: box.line,
            expected: box.expected,
            expectedStates: box.expectedStates,
            desired: box.desired,
            phase: box.phase,
            scope: box.scope,
            role: box.role,
          });
        }
      }
    }
  }
  return { cells, duplicates };
}

function bounds2d(bounds) {
  return {
    minX: Math.min(Number(bounds[0]), Number(bounds[1])),
    maxX: Math.max(Number(bounds[0]), Number(bounds[1])),
    minZ: Math.min(Number(bounds[2]), Number(bounds[3])),
    maxZ: Math.max(Number(bounds[2]), Number(bounds[3])),
  };
}

function rectanglesIntersect(left, right) {
  return !(
    left.maxX < right.minX
    || left.minX > right.maxX
    || left.maxZ < right.minZ
    || left.minZ > right.maxZ
  );
}

function pointInside2d(point, bounds) {
  const box = bounds2d(bounds);
  return (
    point.x >= box.minX
    && point.x <= box.maxX
    && point.z >= box.minZ
    && point.z <= box.maxZ
  );
}

function analyzeGrade(centerline) {
  const deltas = centerline.slice(1).map((row, index) => (
    row[1] - centerline[index][1]
  ));
  const nonZero = deltas
    .map((delta, index) => ({
      direction: Math.sign(delta),
      delta,
      fromZ: centerline[index][2],
      toZ: centerline[index + 1][2],
      index,
    }))
    .filter((step) => step.direction !== 0);
  const reversals = [];
  for (let index = 1; index < nonZero.length; index += 1) {
    const prior = nonZero[index - 1];
    const current = nonZero[index];
    if (prior.direction === current.direction) continue;
    reversals.push({
      atZ: current.toZ,
      fromDirection: prior.direction,
      toDirection: current.direction,
      plateauRows: current.index - prior.index - 1,
    });
  }
  const adjacentOpposingStepPairs = deltas.slice(1).filter((delta, index) => (
    delta !== 0
    && deltas[index] !== 0
    && Math.sign(delta) !== Math.sign(deltas[index])
  )).length;
  const oneCellPeaksOrTroughs = centerline.slice(1, -1).filter((row, index) => (
    centerline[index][1] === centerline[index + 2][1]
    && row[1] !== centerline[index][1]
  )).length;
  const shortReturnExcursions = [];
  for (let start = 0; start < centerline.length - 2; start += 1) {
    for (
      let end = start + 2;
      end <= Math.min(centerline.length - 1, start + 5);
      end += 1
    ) {
      const segment = centerline.slice(start, end + 1).map((point) => point[1]);
      if (
        segment[0] === segment.at(-1)
        && segment.some((value) => value !== segment[0])
      ) {
        shortReturnExcursions.push({
          fromZ: centerline[start][2],
          toZ: centerline[end][2],
          elevations: segment,
        });
        break;
      }
    }
  }
  const directionRuns = [];
  for (const step of nonZero) {
    const prior = directionRuns.at(-1);
    if (prior?.direction === step.direction) {
      prior.endZ = step.toZ;
      prior.elevationChanges += 1;
    } else {
      directionRuns.push({
        direction: step.direction,
        startZ: step.fromZ,
        endZ: step.toZ,
        elevationChanges: 1,
      });
    }
  }
  return {
    rowCount: centerline.length,
    elevationChangeCount: nonZero.length,
    signReversalCount: reversals.length,
    maximumAdjacentStep: deltas.length
      ? Math.max(...deltas.map((delta) => Math.abs(delta)))
      : 0,
    adjacentOpposingStepPairs,
    oneCellPeaksOrTroughs,
    minimumReversalPlateauRows: reversals.length
      ? Math.min(...reversals.map((reversal) => reversal.plateauRows))
      : null,
    shortReturnExcursions,
    directionRuns,
    reversals,
  };
}

function geometryValid(geometry) {
  if (!geometry || typeof geometry !== 'object') return false;
  if (geometry.type === 'bounds') {
    const values = [
      geometry.minX,
      geometry.minY,
      geometry.minZ,
      geometry.maxX,
      geometry.maxY,
      geometry.maxZ,
    ];
    return (
      values.every(Number.isFinite)
      && geometry.minX <= geometry.maxX
      && geometry.minY <= geometry.maxY
      && geometry.minZ <= geometry.maxZ
    );
  }
  if (geometry.type === 'path') {
    return (
      Number.isFinite(geometry.width)
      && geometry.width > 0
      && Array.isArray(geometry.points)
      && geometry.points.length > 0
      && geometry.points.every((point) => (
        Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && Number.isFinite(point.z)
      ))
    );
  }
  return false;
}

for (const required of [
  PLAN,
  FORWARD,
  ROLLBACK,
  REPORT,
  PREFLIGHT,
  DRY_RUN,
  ROLLBACK_DRY_RUN,
  RELEASE,
  DESIGN,
  CAMERA_MANIFEST,
  DATABASE_PATH,
  ...(CHECK_RUNTIME_SAFETY ? [GARAGE_CAMERA_MANIFEST] : []),
]) {
  if (!fs.existsSync(required)) {
    throw new Error(`required independent-QA input is missing: ${relative(required)}`);
  }
}

const plan = yaml.load(fs.readFileSync(PLAN, 'utf8'));
const report = JSON.parse(fs.readFileSync(REPORT, 'utf8'));
const preflight = JSON.parse(fs.readFileSync(PREFLIGHT, 'utf8'));
const dryRun = JSON.parse(fs.readFileSync(DRY_RUN, 'utf8'));
const rollbackDryRun = JSON.parse(fs.readFileSync(ROLLBACK_DRY_RUN, 'utf8'));
const release = JSON.parse(fs.readFileSync(RELEASE, 'utf8'));
const cameraManifest = JSON.parse(fs.readFileSync(CAMERA_MANIFEST, 'utf8'));
const garageCameraManifest = CHECK_RUNTIME_SAFETY
  ? JSON.parse(fs.readFileSync(GARAGE_CAMERA_MANIFEST, 'utf8'))
  : null;
const forwardParsed = parseOperations(FORWARD);
const rollbackParsed = parseOperations(ROLLBACK);
const forward = expandOperations(forwardParsed);
const rollback = expandOperations(rollbackParsed);
const snapshotEvidence = snapshotDigest(REGIONS);
const snapshot = new AnvilSnapshot(REGIONS);
const sourceCache = new Map();

async function sourceAt(x, y, z) {
  const key = key3(x, y, z);
  if (sourceCache.has(key)) return sourceCache.get(key);
  const column = await snapshot.readStateColumn(x, z, y, y);
  const state = column ? normalizeBlock(column.get(y)) : null;
  sourceCache.set(key, state);
  return state;
}

async function finalAt(x, y, z) {
  return forward.cells.get(key3(x, y, z))?.desired ?? sourceAt(x, y, z);
}

async function standableAt(x, y, z, headroom = 3) {
  const support = await finalAt(x, y, z);
  if (!support || AIR.has(baseName(support)) || FLUID.has(baseName(support))) {
    return { passed: false, support, blocked: [] };
  }
  const blocked = [];
  for (let offset = 1; offset <= headroom; offset += 1) {
    const state = await finalAt(x, y + offset, z);
    if (!state || (!AIR.has(baseName(state)) && baseName(state) !== 'minecraft:light')) {
      blocked.push({ y: y + offset, state });
    }
  }
  return { passed: blocked.length === 0, support, blocked };
}

async function analyzeOperationOrder(boxes, initialAt) {
  const priorDesired = new Map();
  const supportPreconditionHazards = [];
  const doublePlantCompanionHazards = [];
  const unsupportedDesiredStates = [];
  const connectivePreconditionHazards = [];
  const finalSupportHazards = [];
  const directions = [
    { property: 'east', dx: 1, dz: 0 },
    { property: 'west', dx: -1, dz: 0 },
    { property: 'south', dx: 0, dz: 1 },
    { property: 'north', dx: 0, dz: -1 },
  ];

  async function currentAt(x, y, z) {
    const key = key3(x, y, z);
    if (priorDesired.has(key)) return priorDesired.get(key);
    return initialAt(x, y, z);
  }

  for (let index = 0; index < boxes.length; index += 1) {
    const operation = boxes[index];
    const [x, y, z] = operation.bounds;
    const dependency = supportDependency(operation.expected);
    if (dependency) {
      const support = await currentAt(x, y - 1, z);
      if (!hasValidSupport(operation.expected, support)) {
        supportPreconditionHazards.push({
          index,
          line: operation.line,
          point: [x, y, z],
          expected: operation.expected,
          currentSupport: support,
          earlierSupportOperation:
            priorDesired.has(key3(x, y - 1, z)) || false,
        });
      }
    }
    if (baseName(operation.expected) === 'minecraft:tall_grass') {
      const half = blockProperties(operation.expected).half;
      const companionY = half === 'upper' ? y - 1 : y + 1;
      const companionKey = key3(x, companionY, z);
      if (priorDesired.has(companionKey)) {
        const companion = await currentAt(x, companionY, z);
        const requiredHalf = half === 'upper' ? 'lower' : 'upper';
        if (
          baseName(companion) !== 'minecraft:tall_grass'
          || blockProperties(companion).half !== requiredHalf
        ) {
          doublePlantCompanionHazards.push({
            index,
            line: operation.line,
            point: [x, y, z],
            expected: operation.expected,
            companionPoint: [x, companionY, z],
            currentCompanion: companion,
            earlierCompanionOperation: companionKey,
          });
        }
      }
    }

    if (
      operation.expectedStates.length > 0
      && operation.expectedStates.every(isFence)
    ) {
      const baselineTarget = await initialAt(x, y, z);
      const properties = blockProperties(baselineTarget);
      for (const direction of directions) {
        const neighborKey = key3(
          x + direction.dx,
          y,
          z + direction.dz,
        );
        if (!priorDesired.has(neighborKey)) continue;
        const currentNeighbor = await currentAt(
          x + direction.dx,
          y,
          z + direction.dz,
        );
        properties[direction.property] = String(
          likelyConnectsToFence(currentNeighbor),
        );
      }
      const runtimeFence = normalizeBlock(
        blockWithProperties(baselineTarget, properties),
      );
      if (!operationAllowsExpected(operation, runtimeFence)) {
        connectivePreconditionHazards.push({
          index,
          line: operation.line,
          point: [x, y, z],
          allowedExpectedStates: operation.expectedStates,
          independentlyDerivedRuntimeState: runtimeFence,
        });
      }
    }

    if (supportDependency(operation.desired)) {
      const support = await currentAt(x, y - 1, z);
      if (!hasValidSupport(operation.desired, support)) {
        unsupportedDesiredStates.push({
          index,
          line: operation.line,
          point: [x, y, z],
          desired: operation.desired,
          currentSupport: support,
        });
      }
    }
    if (
      baseName(operation.desired) === 'minecraft:tall_grass'
      && blockProperties(operation.desired).half === 'lower'
    ) {
      const upper = await currentAt(x, y + 1, z);
      if (
        baseName(upper) !== 'minecraft:tall_grass'
        || blockProperties(upper).half !== 'upper'
      ) {
        unsupportedDesiredStates.push({
          index,
          line: operation.line,
          point: [x, y, z],
          desired: operation.desired,
          currentUpperCompanion: upper,
          reason: 'lower double plant placed without upper companion',
        });
      }
    }
    priorDesired.set(key3(x, y, z), operation.desired);
  }

  for (const operation of boxes) {
    if (!supportDependency(operation.desired)) continue;
    const [x, y, z] = operation.bounds;
    const supportKey = key3(x, y - 1, z);
    const finalSupport = priorDesired.has(supportKey)
      ? priorDesired.get(supportKey)
      : await initialAt(x, y - 1, z);
    if (!hasValidSupport(operation.desired, finalSupport)) {
      finalSupportHazards.push({
        line: operation.line,
        point: [x, y, z],
        desired: operation.desired,
        finalSupport,
      });
    }
  }

  return {
    supportPreconditionHazards,
    doublePlantCompanionHazards,
    connectivePreconditionHazards,
    unsupportedDesiredStates,
    finalSupportHazards,
    totalHazards: (
      supportPreconditionHazards.length
      + doublePlantCompanionHazards.length
      + connectivePreconditionHazards.length
      + unsupportedDesiredStates.length
      + finalSupportHazards.length
    ),
  };
}

async function orderAwareForwardGuards(boxes) {
  const priorDesired = new Map();
  const baselineMismatches = [];
  const runtimeMismatches = [];
  const directions = [
    { property: 'east', dx: 1, dz: 0 },
    { property: 'west', dx: -1, dz: 0 },
    { property: 'south', dx: 0, dz: 1 },
    { property: 'north', dx: 0, dz: -1 },
  ];
  for (let index = 0; index < boxes.length; index += 1) {
    const operation = boxes[index];
    const [x, y, z] = operation.bounds;
    const baseline = await sourceAt(x, y, z);
    if (!operationAllowsExpected(operation, baseline)) {
      baselineMismatches.push({
        index,
        line: operation.line,
        point: [x, y, z],
        allowedExpectedStates: operation.expectedStates,
        baseline,
      });
    }
    let runtime = baseline;
    if (isFence(baseline)) {
      const properties = blockProperties(baseline);
      for (const direction of directions) {
        const neighborKey = key3(
          x + direction.dx,
          y,
          z + direction.dz,
        );
        if (!priorDesired.has(neighborKey)) continue;
        properties[direction.property] = String(
          likelyConnectsToFence(priorDesired.get(neighborKey)),
        );
      }
      runtime = normalizeBlock(blockWithProperties(baseline, properties));
    }
    if (!operationAllowsExpected(operation, runtime)) {
      runtimeMismatches.push({
        index,
        line: operation.line,
        point: [x, y, z],
        allowedExpectedStates: operation.expectedStates,
        independentlyDerivedRuntimeState: runtime,
        baseline,
      });
    }
    priorDesired.set(key3(x, y, z), operation.desired);
  }
  return {
    checked: boxes.length,
    baselineMismatches,
    runtimeMismatches,
  };
}

function isLog(block) {
  const name = baseName(block);
  return (
    name.endsWith('_log')
    || name.endsWith('_wood')
    || name.endsWith('_stem')
    || name.endsWith('_hyphae')
  );
}

function isLeaves(block) {
  return baseName(block).endsWith('_leaves');
}

async function expectedLeafDistance(x, y, z) {
  const queue = [{ x, y, z, leafEdges: 0 }];
  const visited = new Set([key3(x, y, z)]);
  const directions = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy, dz] of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nz = current.z + dz;
      const state = await finalAt(nx, ny, nz);
      if (isLog(state)) return Math.min(7, current.leafEdges + 1);
      if (!isLeaves(state) || current.leafEdges >= 5) continue;
      const key = key3(nx, ny, nz);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({
        x: nx,
        y: ny,
        z: nz,
        leafEdges: current.leafEdges + 1,
      });
    }
  }
  return 7;
}

const assertions = [];
const failures = [];
function check(id, passed, evidence) {
  const assertion = { id, passed: Boolean(passed), evidence };
  assertions.push(assertion);
  if (!assertion.passed) failures.push(assertion);
}

check('snapshot-hash',
  snapshotEvidence.sha256 === EXPECTED_SNAPSHOT
  && snapshotEvidence.sha256 === report.source.snapshot.sha256, {
    independentlyComputed: snapshotEvidence,
    reported: report.source.snapshot.sha256,
  });
check('forward-syntax',
  forwardParsed.invalid.length === 0
  && forwardParsed.sets.length === 0
  && forwardParsed.commands.length === 0, {
    invalid: forwardParsed.invalid,
    setOperations: forwardParsed.sets,
    commands: forwardParsed.commands,
  });
check('rollback-syntax',
  rollbackParsed.invalid.length === 0
  && rollbackParsed.sets.length === 0
  && rollbackParsed.commands.length === 0, {
    invalid: rollbackParsed.invalid,
    setOperations: rollbackParsed.sets,
    commands: rollbackParsed.commands,
  });
check('one-cell-exact-guards',
  forwardParsed.boxes.every((operation) => (
    operation.bounds[0] === operation.bounds[3]
    && operation.bounds[1] === operation.bounds[4]
    && operation.bounds[2] === operation.bounds[5]
    && operation.expectedStates.length > 0
    && operation.expectedStates.every(Boolean)
    && operation.desired
  )), {
    operationBoxes: forwardParsed.boxes.length,
    nonOneCell: forwardParsed.boxes
      .filter((operation) => (
        operation.bounds[0] !== operation.bounds[3]
        || operation.bounds[1] !== operation.bounds[4]
        || operation.bounds[2] !== operation.bounds[5]
      ))
      .slice(0, 20),
  });
check('forward-target-uniqueness', forward.duplicates.length === 0, {
  uniqueCells: forward.cells.size,
  duplicates: forward.duplicates.slice(0, 20),
});
check('rollback-target-uniqueness', rollback.duplicates.length === 0, {
  uniqueCells: rollback.cells.size,
  duplicates: rollback.duplicates.slice(0, 20),
});
check('reported-operation-count',
  forward.cells.size === report.operations.count
  && rollback.cells.size === report.rollback.operationCount, {
    forward: forward.cells.size,
    rollback: rollback.cells.size,
    reportedForward: report.operations.count,
    reportedRollback: report.rollback.operationCount,
  });

const sourceMismatches = [];
for (const [key, operation] of forward.cells) {
  const actual = await sourceAt(operation.x, operation.y, operation.z);
  if (!operationAllowsExpected(operation, actual)) {
    sourceMismatches.push({
      point: key,
      line: operation.line,
      allowedExpectedStates: operation.expectedStates,
      actual,
    });
  }
}
const orderAwareGuards = CHECK_RUNTIME_SAFETY
  ? await orderAwareForwardGuards(forwardParsed.boxes)
  : null;
check(
  'exact-source-state-match',
  CHECK_RUNTIME_SAFETY
    ? orderAwareGuards.runtimeMismatches.length === 0
    : sourceMismatches.length === 0, {
    mode: CHECK_RUNTIME_SAFETY
      ? 'order-aware-reactive-exact-state'
      : 'immutable-source-exact-state',
    checked: forward.cells.size,
    baselineMismatches: CHECK_RUNTIME_SAFETY
      ? orderAwareGuards.baselineMismatches.slice(0, 30)
      : sourceMismatches.slice(0, 30),
    baselineMismatchCount: CHECK_RUNTIME_SAFETY
      ? orderAwareGuards.baselineMismatches.length
      : sourceMismatches.length,
    orderAwareRuntimeMismatches: CHECK_RUNTIME_SAFETY
      ? orderAwareGuards.runtimeMismatches.slice(0, 30)
      : [],
    orderAwareRuntimeMismatchCount: CHECK_RUNTIME_SAFETY
      ? orderAwareGuards.runtimeMismatches.length
      : 0,
  },
);

let runtimeSafetyEvidence = {
  enabled: false,
  forwardOrder: null,
  rollbackOrder: null,
  untrackedSupportSideEffects: [],
  leafDistanceMismatches: [],
};
if (CHECK_RUNTIME_SAFETY) {
  const forwardOrder = await analyzeOperationOrder(
    forwardParsed.boxes,
    sourceAt,
  );
  const rollbackOrder = await analyzeOperationOrder(
    rollbackParsed.boxes,
    finalAt,
  );
  const untrackedSupportSideEffects = [];
  for (const operation of forwardParsed.boxes) {
    const [x, y, z] = operation.bounds;
    const aboveKey = key3(x, y + 1, z);
    if (forward.cells.has(aboveKey)) continue;
    const above = await sourceAt(x, y + 1, z);
    if (!supportDependency(above)) continue;
    const initialSupport = await sourceAt(x, y, z);
    const completedSupport = await finalAt(x, y, z);
    if (
      hasValidSupport(above, initialSupport)
      && !hasValidSupport(above, completedSupport)
    ) {
      untrackedSupportSideEffects.push({
        supportOperationLine: operation.line,
        plantPoint: [x, y + 1, z],
        plant: above,
        initialSupport,
        completedSupport,
      });
    }
  }

  const leafDistanceMismatches = [];
  for (const operation of forwardParsed.boxes) {
    if (!isLeaves(operation.desired)) continue;
    const [x, y, z] = operation.bounds;
    const declared = Number(blockProperties(operation.desired).distance);
    const expected = await expectedLeafDistance(x, y, z);
    if (!Number.isFinite(declared) || declared !== expected) {
      leafDistanceMismatches.push({
        line: operation.line,
        point: [x, y, z],
        desired: operation.desired,
        declaredDistance: Number.isFinite(declared) ? declared : null,
        expectedDistance: expected,
      });
    }
  }

  runtimeSafetyEvidence = {
    enabled: true,
    forwardOrder,
    rollbackOrder,
    untrackedSupportSideEffects,
    leafDistanceMismatches,
  };
  check(
    'runtime-forward-neighbor-order-safety',
    forwardOrder.totalHazards === 0
      && untrackedSupportSideEffects.length === 0, {
      ...forwardOrder,
      supportPreconditionHazards:
        forwardOrder.supportPreconditionHazards.slice(0, 30),
      doublePlantCompanionHazards:
        forwardOrder.doublePlantCompanionHazards.slice(0, 30),
      connectivePreconditionHazards:
        forwardOrder.connectivePreconditionHazards.slice(0, 30),
      unsupportedDesiredStates:
        forwardOrder.unsupportedDesiredStates.slice(0, 30),
      finalSupportHazards:
        forwardOrder.finalSupportHazards.slice(0, 30),
      untrackedSupportSideEffects:
        untrackedSupportSideEffects.slice(0, 30),
    },
  );
  check(
    'runtime-rollback-neighbor-order-safety',
    rollbackOrder.totalHazards === 0, {
      ...rollbackOrder,
      supportPreconditionHazards:
        rollbackOrder.supportPreconditionHazards.slice(0, 30),
      doublePlantCompanionHazards:
        rollbackOrder.doublePlantCompanionHazards.slice(0, 30),
      connectivePreconditionHazards:
        rollbackOrder.connectivePreconditionHazards.slice(0, 30),
      unsupportedDesiredStates:
        rollbackOrder.unsupportedDesiredStates.slice(0, 30),
      finalSupportHazards:
        rollbackOrder.finalSupportHazards.slice(0, 30),
    },
  );
  check(
    'runtime-declared-state-stability',
    leafDistanceMismatches.length === 0, {
      leafPlacementsChecked: forwardParsed.boxes.filter(
        (operation) => isLeaves(operation.desired),
      ).length,
      leafDistanceMismatches: leafDistanceMismatches.slice(0, 30),
    },
  );
}

const inverseMismatches = [];
for (const [key, operation] of forward.cells) {
  const inverse = rollback.cells.get(key);
  const rollbackDestination = CHECK_RUNTIME_SAFETY
    ? await sourceAt(operation.x, operation.y, operation.z)
    : operation.expected;
  if (
    !inverse
    || !operationAllowsExpected(inverse, operation.desired)
    || inverse.desired !== rollbackDestination
  ) {
    inverseMismatches.push({ point: key, forward: operation, rollback: inverse });
  }
}
for (const key of rollback.cells.keys()) {
  if (!forward.cells.has(key)) inverseMismatches.push({ rollbackOnly: key });
}
const reverseOrderMismatches = [];
for (let index = 0; index < forwardParsed.boxes.length; index += 1) {
  const source = forwardParsed.boxes[forwardParsed.boxes.length - 1 - index];
  const inverse = rollbackParsed.boxes[index];
  const [sourceX, sourceY, sourceZ] = source.bounds;
  const rollbackDestination = CHECK_RUNTIME_SAFETY
    ? await sourceAt(sourceX, sourceY, sourceZ)
    : source.expected;
  if (
    !inverse
    || source.bounds.join(',') !== inverse.bounds.join(',')
    || inverse.desired !== rollbackDestination
    || !operationAllowsExpected(inverse, source.desired)
  ) {
    reverseOrderMismatches.push({ index, source, inverse });
  }
}
check('forward-rollback-bijection',
  inverseMismatches.length === 0 && reverseOrderMismatches.length === 0, {
    forwardCells: forward.cells.size,
    rollbackCells: rollback.cells.size,
    inverseMismatches: inverseMismatches.slice(0, 20),
    reverseOrderMismatches: reverseOrderMismatches.slice(0, 20),
  });

const expectedScopes = new Set([
  ...(plan.shared_alleys ?? []).map((item) => item.id),
  ...(plan.garages ?? []).map((item) => item.id),
  ...(plan.wayfinding_inlays ?? []).map((item) => item.id),
  'B02-FRONTAGE',
  'B03-SERVICE-IDENTITY',
  'B03-SERVICE-SCREEN',
]);
const unexpectedScopes = [...new Set(
  [...forward.cells.values()].map((operation) => operation.scope),
)].filter((scope) => !expectedScopes.has(scope));
check('operation-scope-resolution', unexpectedScopes.length === 0, {
  expectedScopeCount: expectedScopes.size,
  actualScopes: [...new Set(
    [...forward.cells.values()].map((operation) => operation.scope),
  )].sort(),
  unexpectedScopes,
});

const protectedBuildings = new Map(
  (plan.protected_buildings ?? []).map((feature) => [
    feature.id,
    bounds2d(feature.bounds),
  ]),
);
const protectedIntersections = [];
for (const operation of forward.cells.values()) {
  for (const [id, bounds] of protectedBuildings) {
    if (
      operation.x >= bounds.minX
      && operation.x <= bounds.maxX
      && operation.z >= bounds.minZ
      && operation.z <= bounds.maxZ
    ) {
      protectedIntersections.push({
        protectedId: id,
        point: [operation.x, operation.y, operation.z],
        scope: operation.scope,
        role: operation.role,
      });
    }
  }
}
check('protected-building-exclusion', protectedIntersections.length === 0, {
  protectedBuildingCount: protectedBuildings.size,
  intersections: protectedIntersections.slice(0, 30),
});

const garageBounds = (plan.garages ?? []).map((garage) => ({
  id: garage.id,
  building: garage.building,
  ...bounds2d(garage.bounds),
}));
const garagePairConflicts = [];
for (let left = 0; left < garageBounds.length; left += 1) {
  for (let right = left + 1; right < garageBounds.length; right += 1) {
    if (rectanglesIntersect(garageBounds[left], garageBounds[right])) {
      garagePairConflicts.push({
        left: garageBounds[left].id,
        right: garageBounds[right].id,
      });
    }
  }
}
check('cross-feature-conflict-exclusion',
  garagePairConflicts.length === 0
  && (report.diagnostics.operationConflicts ?? []).length === 0
  && (report.diagnostics.collisions ?? []).length === 0, {
    garagePairConflicts,
    reportedOperationConflicts: report.diagnostics.operationConflicts,
    reportedCollisions: report.diagnostics.collisions,
  });

const blockEntityCensus = JSON.parse(execFileSync(
  process.execPath,
  [
    'scripts/block_entity_census.mjs',
    '--regions',
    REGIONS,
    '--box',
    String(report.operations.bounds[0] - 1),
    String(report.operations.bounds[1] - 1),
    String(report.operations.bounds[2] - 1),
    String(report.operations.bounds[3] + 1),
    String(report.operations.bounds[4] + 1),
    String(report.operations.bounds[5] + 1),
  ],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
));
const targetedBlockEntities = blockEntityCensus.entities
  .filter((entity) => forward.cells.has(key3(entity.x, entity.y, entity.z)))
  .map((entity) => ({
    id: entity.id,
    point: [entity.x, entity.y, entity.z],
  }));
check('block-entity-exclusion', targetedBlockEntities.length === 0, {
  chunksRead: blockEntityCensus.chunksRead,
  chunksMissing: blockEntityCensus.chunksMissing,
  broadCensusCount: blockEntityCensus.count,
  targetedBlockEntities,
});

const fluidTargets = [];
for (const [key, operation] of forward.cells) {
  if (
    operation.expectedStates.some((state) => FLUID.has(baseName(state)))
    || FLUID.has(baseName(operation.desired))
    || operation.expectedStates.some(
      (state) => state.includes('waterlogged=true'),
    )
    || operation.desired.includes('waterlogged=true')
  ) {
    fluidTargets.push({
      point: key,
      expectedStates: operation.expectedStates,
      desired: operation.desired,
    });
  }
}
check('target-fluid-exclusion', fluidTargets.length === 0, {
  fluidTargets: fluidTargets.slice(0, 30),
});

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const database = new Database(DATABASE_PATH, {
  readonly: true,
  fileMustExist: true,
});
const parkingFeatures = database.prepare(`
  SELECT external_id AS externalId, min_x AS minX, max_x AS maxX,
         min_z AS minZ, max_z AS maxZ
  FROM world_features
  WHERE project_id = 'mainstreet-america'
    AND kind = 'parking'
`).all();
const parkingStalls = parkingFeatures.filter((feature) => (
  String(feature.externalId).startsWith('P01-BAY-')
));
const parkingIntersections = [];
for (const operation of forward.cells.values()) {
  for (const feature of parkingFeatures) {
    if (
      operation.x >= feature.minX
      && operation.x <= feature.maxX
      && operation.z >= feature.minZ
      && operation.z <= feature.maxZ
    ) {
      parkingIntersections.push({
        externalId: feature.externalId,
        point: [operation.x, operation.y, operation.z],
      });
    }
  }
}
check('parking-exclusion',
  parkingStalls.length === 236 && parkingIntersections.length === 0, {
    parkingFeatureCount: parkingFeatures.length,
    parkingStallCount: parkingStalls.length,
    intersections: parkingIntersections.slice(0, 30),
  });

const garageChecks = [];
for (const garage of plan.garages ?? []) {
  const bounds = bounds2d(garage.bounds);
  const building = protectedBuildings.get(garage.building);
  const centerX = Math.floor((bounds.minX + bounds.maxX) / 2);
  const centerZ = Math.floor((bounds.minZ + bounds.maxZ) / 2);
  const road = (plan.roads ?? []).find(
    (candidate) => candidate.id === (garage.access_route ?? garage.frontage),
  );
  const front = Number(road.center_x) < centerX ? 'west' : 'east';
  const frontX = front === 'west' ? bounds.minX : bounds.maxX;
  const floorY = Number(garage.floor_y);
  const placementValid = String(garage.building).startsWith('H')
    ? (
      String(garage.access_route).startsWith('ALLEY-')
      && (
        garage.side === 'west'
          ? bounds.maxX < building.minX
          : bounds.minX > building.maxX
      )
      && Math.abs(Number(garage.principal_facade_x) - frontX)
        >= Number(plan.acceptance.minimum_garage_rear_setback)
    )
    : (
      !rectanglesIntersect(bounds, building)
      && (
        bounds.maxZ < building.minZ
        || bounds.minZ > building.maxZ
      )
    );

  const floorFailures = [];
  const interiorFailures = [];
  const roofFailures = [];
  const portalFailures = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const floor = await finalAt(x, floorY, z);
      if (baseName(floor) !== baseName(plan.palette.garage_floor)) {
        floorFailures.push({ point: [x, floorY, z], state: floor });
      }
      const roof = await finalAt(x, floorY + 5, z);
      if (normalizeBlock(roof) !== normalizeBlock(plan.palette.garage_roof)) {
        roofFailures.push({ point: [x, floorY + 5, z], state: roof });
      }
      if (
        x > bounds.minX
        && x < bounds.maxX
        && z > bounds.minZ
        && z < bounds.maxZ
      ) {
        for (let y = floorY + 1; y <= floorY + 4; y += 1) {
          const state = await finalAt(x, y, z);
          if (!AIR.has(baseName(state))) {
            interiorFailures.push({ point: [x, y, z], state });
          }
        }
      }
    }
  }
  for (let z = centerZ - 1; z <= centerZ + 1; z += 1) {
    for (let y = floorY + 1; y <= floorY + 3; y += 1) {
      const state = await finalAt(frontX, y, z);
      if (!AIR.has(baseName(state))) {
        portalFailures.push({ point: [frontX, y, z], state });
      }
    }
  }

  const reportGarage = report.garages.matrix.find(
    (candidate) => candidate.garageId === garage.id,
  );
  const drivewayFailures = [];
  const drivewayProfile = reportGarage?.drivewayProfile ?? [];
  for (const point of drivewayProfile) {
    for (let z = centerZ - 1; z <= centerZ + 1; z += 1) {
      const result = await standableAt(point.x, point.y, z, 3);
      if (
        !result.passed
        || baseName(result.support) !== baseName(plan.palette.driveway)
      ) {
        drivewayFailures.push({
          point: [point.x, point.y, z],
          result,
        });
      }
    }
  }
  const drivewaySteps = drivewayProfile.slice(1).map((point, index) => ({
    horizontal: Math.abs(point.x - drivewayProfile[index].x),
    vertical: Math.abs(point.y - drivewayProfile[index].y),
  }));
  const connection = reportGarage?.roadConnection;
  const connectionStandable = connection
    ? await standableAt(connection.x, connection.y, connection.z, 3)
    : { passed: false };
  const portalToDrivewayGap = drivewayProfile.length
    ? Math.abs(frontX - drivewayProfile.at(-1).x)
    : null;
  garageChecks.push({
    garageId: garage.id,
    buildingId: garage.building,
    placement: garage.placement ?? 'side',
    placementValid,
    bounds: garage.bounds,
    exterior: [bounds.maxX - bounds.minX + 1, bounds.maxZ - bounds.minZ + 1],
    interior: [5, 5],
    front,
    floorY,
    floorFailures,
    interiorFailures,
    roofFailures,
    portalFailures,
    drivewayFailures,
    drivewayProfile,
    drivewaySteps,
    portalToDrivewayGap,
    connection,
    connectionStandable: connectionStandable.passed,
    passed: (
      placementValid
      && floorFailures.length === 0
      && interiorFailures.length === 0
      && roofFailures.length === 0
      && portalFailures.length === 0
      && drivewayFailures.length === 0
      && drivewaySteps.every((step) => (
        step.horizontal === 1 && step.vertical <= 1
      ))
      && (portalToDrivewayGap === 1 || portalToDrivewayGap === 0)
      && connectionStandable.passed
      && reportGarage?.usable === true
    ),
  });
}
check('all-garages-rear-or-side-and-usable',
  garageChecks.length === 18 && garageChecks.every((garage) => garage.passed), {
    requested: 18,
    checked: garageChecks.length,
    passed: garageChecks.filter((garage) => garage.passed).length,
    failures: garageChecks.filter((garage) => !garage.passed),
  });

const alleyChecks = [];
for (const alley of report.sharedAlleys.matrix ?? []) {
  const planAlley = (plan.shared_alleys ?? []).find((item) => item.id === alley.id);
  const surfaceFailures = [];
  const geometryFailures = [];
  for (let index = 0; index < alley.centerline.length; index += 1) {
    const [centerX, y, z] = alley.centerline[index];
    if (index > 0) {
      const [priorX, priorY, priorZ] = alley.centerline[index - 1];
      if (
        z - priorZ !== 1
        || Math.abs(centerX - priorX) > 1
        || Math.abs(y - priorY) > 1
      ) {
        geometryFailures.push({
          prior: [priorX, priorY, priorZ],
          current: [centerX, y, z],
        });
      }
    }
    for (let x = centerX - 1; x <= centerX + 1; x += 1) {
      const result = await standableAt(x, y, z, Number(planAlley.headroom));
      if (
        !result.passed
        || baseName(result.support) !== baseName(plan.palette.alley_surface)
      ) {
        surfaceFailures.push({ point: [x, y, z], result });
      }
    }
  }
  const grade = analyzeGrade(alley.centerline);
  const reportedGrade = alley.gradeAnalysis;
  const gradeMatchesReport = (
    grade.elevationChangeCount === reportedGrade.elevationChangeCount
    && grade.signReversalCount === reportedGrade.signReversalCount
    && grade.adjacentOpposingStepPairs === reportedGrade.adjacentOpposingStepPairs
    && grade.oneCellPeaksOrTroughs === reportedGrade.oneCellPeaksOrTroughs
    && grade.minimumReversalPlateauRows
      === reportedGrade.minimumReversalPlateauRows
  );
  const connections = [];
  for (const connection of alley.publicConnections ?? []) {
    const [x, y, z] = connection.point ?? [];
    const result = Number.isFinite(x)
      ? await standableAt(x, y, z, Number(planAlley.headroom))
      : { passed: false };
    connections.push({
      road: connection.road,
      point: connection.point,
      reportedConnected: connection.connected,
      independentlyStandable: result.passed,
      baselineRoad: connection.baselineRoad,
    });
  }
  const deliberateGrade = (
    grade.maximumAdjacentStep <= Number(plan.acceptance.maximum_adjacent_alley_step)
    && grade.adjacentOpposingStepPairs === 0
    && grade.oneCellPeaksOrTroughs === 0
    && (
      grade.minimumReversalPlateauRows === null
      || grade.minimumReversalPlateauRows >= 2
    )
  );
  alleyChecks.push({
    id: alley.id,
    width: alley.width,
    rows: alley.centerline.length,
    surfaceCellsChecked: alley.centerline.length * 3,
    surfaceFailures,
    geometryFailures,
    grade,
    reportedGrade,
    gradeMatchesReport,
    connections,
    passed: (
      alley.width === 3
      && alley.centerline.length
        === Number(planAlley.z_range[1]) - Number(planAlley.z_range[0]) + 1
      && surfaceFailures.length === 0
      && geometryFailures.length === 0
      && gradeMatchesReport
      && deliberateGrade
      && connections.length === (planAlley.public_connections ?? []).length
      && connections.every((connection) => (
        connection.reportedConnected && connection.independentlyStandable
      ))
    ),
  });
}
check('alleys-connected-headroom-and-deliberate-grade',
  alleyChecks.length === 2 && alleyChecks.every((alley) => alley.passed), {
    checked: alleyChecks.length,
    passed: alleyChecks.filter((alley) => alley.passed).length,
    alleys: alleyChecks,
  });

const packageFeatures = report.databaseFeatures ?? [];
const featureIds = packageFeatures.map((feature) => feature.externalId);
const packageFeatureIds = new Set(featureIds);
const existingRows = database.prepare(`
  SELECT external_id AS externalId
  FROM world_features
  WHERE project_id = 'mainstreet-america'
`).all();
database.close();
const existingFeatureIds = new Set(existingRows.map((row) => row.externalId));
const duplicateFeatureIds = featureIds.filter(
  (id, index) => featureIds.indexOf(id) !== index,
);
const existingIdConflicts = featureIds.filter((id) => existingFeatureIds.has(id));
const missingParents = packageFeatures
  .filter((feature) => (
    !existingFeatureIds.has(feature.parentExternalId)
    && !packageFeatureIds.has(feature.parentExternalId)
  ))
  .map((feature) => ({
    externalId: feature.externalId,
    parentExternalId: feature.parentExternalId,
  }));
const invalidFeatureGeometry = packageFeatures
  .filter((feature) => !geometryValid(feature.geometry))
  .map((feature) => ({
    externalId: feature.externalId,
    geometry: feature.geometry,
  }));
const garageFeatures = packageFeatures.filter(
  (feature) => feature.attributes?.featureClass === 'garage',
);
const alleyFeatures = packageFeatures.filter(
  (feature) => feature.attributes?.featureClass === 'rear-alley',
);
const garageFeatureMismatches = [];
for (const garage of plan.garages ?? []) {
  const feature = garageFeatures.find(
    (candidate) => candidate.parentExternalId === garage.building,
  );
  const bounds = bounds2d(garage.bounds);
  if (
    !feature
    || feature.attributes.parentBuildingExternalId !== garage.building
    || feature.geometry.minX !== bounds.minX
    || feature.geometry.maxX !== bounds.maxX
    || feature.geometry.minZ !== bounds.minZ
    || feature.geometry.maxZ !== bounds.maxZ
    || feature.geometry.minY !== Number(garage.floor_y)
    || feature.geometry.maxY !== Number(garage.floor_y) + 5
  ) {
    garageFeatureMismatches.push({
      garageId: garage.id,
      buildingId: garage.building,
      feature,
    });
  }
}
const alleyFeatureMismatches = [];
for (const alley of report.sharedAlleys.matrix ?? []) {
  const feature = alleyFeatures.find(
    (candidate) => candidate.externalId === `R4-${alley.id}`,
  );
  if (
    !feature
    || feature.geometry.width !== 3
    || JSON.stringify(feature.geometry.points)
      !== JSON.stringify(
        alley.centerline.map(([x, y, z]) => ({ x, y, z })),
      )
  ) {
    alleyFeatureMismatches.push({ alleyId: alley.id, feature });
  }
}
check('database-features-resolve',
  packageFeatures.length === 31
  && packageFeatureIds.size === packageFeatures.length
  && duplicateFeatureIds.length === 0
  && existingIdConflicts.length === 0
  && missingParents.length === 0
  && invalidFeatureGeometry.length === 0
  && garageFeatures.length === 18
  && alleyFeatures.length === 2
  && garageFeatureMismatches.length === 0
  && alleyFeatureMismatches.length === 0, {
    definitions: packageFeatures.length,
    uniqueDefinitions: packageFeatureIds.size,
    featureClassCounts: Object.fromEntries(
      [...new Set(packageFeatures.map(
        (feature) => feature.attributes?.featureClass,
      ))].sort().map((featureClass) => [
        featureClass,
        packageFeatures.filter(
          (feature) => feature.attributes?.featureClass === featureClass,
        ).length,
      ]),
    ),
    duplicateFeatureIds,
    existingIdConflicts,
    missingParents,
    invalidFeatureGeometry,
    garageFeatureMismatches,
    alleyFeatureMismatches,
  });

function strictDryRunValid(evidence, parsed, filename) {
  const unionGroups = parsed.boxes.filter(
    (operation) => operation.expectedStates.length > 1,
  ).length;
  const expandedCommands = parsed.boxes.reduce(
    (sum, operation) => sum + operation.expectedStates.length,
    0,
  );
  const common = (
    evidence.dryRun === true
    && evidence.strictNoop === true
    && evidence.operationSha256 === sha256File(filename)
    && evidence.sourceOperationCount === parsed.boxes.length
    && evidence.worldEditLeftoverCount === 0
    && evidence.failedCommands === 0
  );
  if (evidence.schemaVersion === 2) {
    return (
      common
      && evidence.sourceGroupCount === parsed.boxes.length
      && evidence.finiteUnionGroupCount === unionGroups
      && evidence.commandCount === expandedCommands
      && evidence.expandedCommandCount === expandedCommands
      && evidence.failedGroups === 0
      && (evidence.groupFailures ?? []).length === 0
      && evidence.unexpectedNoopCommands === 0
      && typeof evidence.expandedCommandSha256 === 'string'
      && typeof evidence.sourceGroupPlanSha256 === 'string'
    );
  }
  return common && evidence.commandCount === parsed.boxes.length;
}

check('generic-preflight',
  preflight.operationCount === forward.cells.size
  && preflight.passed === forward.cells.size
  && preflight.failed === 0
  && (preflight.partialMasks ?? []).length === 0, preflight);
check('strict-forward-dry-run',
  strictDryRunValid(dryRun, forwardParsed, FORWARD), dryRun);
check('strict-rollback-dry-run',
  strictDryRunValid(rollbackDryRun, rollbackParsed, ROLLBACK),
  rollbackDryRun);

const releaseArtifacts = release.artifacts ?? {};
const hashEvidence = {
  plan: {
    actual: sha256File(PLAN),
    report: report.source.plan?.sha256,
    release: release.source?.plan?.sha256,
  },
  forward: {
    actual: sha256File(FORWARD),
    report: report.operations.sha256,
    release: releaseArtifacts.forward?.sha256,
  },
  rollback: {
    actual: sha256File(ROLLBACK),
    report: report.rollback.sha256,
    release: releaseArtifacts.rollback?.sha256,
  },
  report: {
    actual: sha256File(REPORT),
    release: releaseArtifacts.engineeringReport?.sha256,
  },
  design: {
    actual: sha256File(DESIGN),
    release: releaseArtifacts.designDocument?.sha256,
  },
  preflight: {
    actual: sha256File(PREFLIGHT),
    release: releaseArtifacts.preflight?.sha256,
  },
  forwardDryRun: {
    actual: sha256File(DRY_RUN),
    release: releaseArtifacts.forwardDryRun?.sha256,
  },
  rollbackDryRun: {
    actual: sha256File(ROLLBACK_DRY_RUN),
    release: releaseArtifacts.rollbackDryRun?.sha256,
  },
};
check('artifact-hashes-match',
  Object.values(hashEvidence).every((entry) => (
    Object.values(entry).every((value) => (
      typeof value === 'string' && value === entry.actual
    ))
  )), hashEvidence);

check('implementation-ready-honest-status',
  report.releaseDecision.offlineGeneration === 'GO'
  && String(report.releaseDecision.liveExecution).startsWith('IMPLEMENTATION_READY')
  && report.execution.liveMutationAuthorized === true
  && report.execution.liveExecutionPerformed === false
  && release.releaseDecision.liveExecutionPerformed === false, {
    report: report.releaseDecision,
    execution: report.execution,
    release: release.releaseDecision,
  });

const cameraIds = cameraManifest.captures.map((capture) => capture.id);
const cameraKeys = cameraManifest.captures.map(
  (capture) => capture.sameCameraKey,
);
const cameraArtifactFailures = [];
for (const capture of cameraManifest.captures) {
  const artifact = capture.beforeArtifact;
  const filename = path.join(ROOT, artifact.file);
  if (
    !fs.existsSync(filename)
    || sha256File(filename) !== artifact.sha256
    || fs.statSync(filename).size !== artifact.bytes
    || artifact.nonblank !== true
    || artifact.bytes
      < cameraManifest.capturePolicy.acceptance.imageBytesMinimum
    || artifact.sampledUniqueColors
      < cameraManifest.capturePolicy.acceptance.sampledUniqueColorsMinimum
    || artifact.luminanceStandardDeviation
      <= cameraManifest.capturePolicy.acceptance
        .luminanceStandardDeviationMinimumExclusive
    || capture.afterRequired?.mustReuseSameCameraKey !== true
    || capture.afterRequired?.mustReuseLighting !== true
  ) {
    cameraArtifactFailures.push({
      id: capture.id,
      artifact,
      exists: fs.existsSync(filename),
      actualSha256: fs.existsSync(filename) ? sha256File(filename) : null,
      actualBytes: fs.existsSync(filename) ? fs.statSync(filename).size : null,
    });
  }
}
check('same-camera-before-evidence',
  cameraManifest.baseline.hashMatched === true
  && cameraManifest.baseline.observedSha256 === EXPECTED_SNAPSHOT
  && cameraManifest.capturePolicy.sameCameraAfterRequired === true
  && cameraManifest.capturePolicy.sameLightingAfterRequired === true
  && cameraManifest.capturePolicy.objectRelationRequired === true
  && cameraManifest.captures.length === 10
  && new Set(cameraIds).size === 10
  && new Set(cameraKeys).size === 10
  && cameraArtifactFailures.length === 0
  && releaseArtifacts.sameCameraManifest?.sha256
    === sha256File(CAMERA_MANIFEST), {
    captures: cameraManifest.captures.length,
    uniqueIds: new Set(cameraIds).size,
    uniqueCameraKeys: new Set(cameraKeys).size,
    manifestSha256: sha256File(CAMERA_MANIFEST),
    releaseManifestSha256: releaseArtifacts.sameCameraManifest?.sha256,
    artifactFailures: cameraArtifactFailures,
  });

let garageCameraEvidence = null;
if (CHECK_RUNTIME_SAFETY) {
  const featureById = new Map(
    garageFeatures.map((feature) => [feature.externalId, feature]),
  );
  const garageCameraIds = garageCameraManifest.cameras.map(
    (camera) => camera.id,
  );
  const garageCameraFeatureIds = garageCameraManifest.cameras.map(
    (camera) => camera.primaryFeatureId,
  );
  const garageCameraOutputs = garageCameraManifest.cameras.map(
    (camera) => camera.output,
  );
  const cameraBindingFailures = [];
  for (const camera of garageCameraManifest.cameras) {
    const feature = featureById.get(camera.primaryFeatureId);
    const [lookX, lookY, lookZ] = camera.lookAt ?? [];
    if (
      !feature
      || camera.role !== 'exact-object-garage-and-access-relationship'
      || !Array.isArray(camera.eye)
      || camera.eye.length !== 3
      || !camera.eye.every(Number.isFinite)
      || !Array.isArray(camera.lookAt)
      || camera.lookAt.length !== 3
      || !camera.lookAt.every(Number.isFinite)
      || !Number.isFinite(camera.fov)
      || !String(camera.output).startsWith('objects/')
      || lookX < feature?.geometry?.minX
      || lookX > feature?.geometry?.maxX
      || lookY < feature?.geometry?.minY
      || lookY > feature?.geometry?.maxY
      || lookZ < feature?.geometry?.minZ
      || lookZ > feature?.geometry?.maxZ
    ) {
      cameraBindingFailures.push({ camera, feature });
    }
  }
  garageCameraEvidence = {
    cameras: garageCameraManifest.cameras.length,
    uniqueIds: new Set(garageCameraIds).size,
    uniqueFeatureIds: new Set(garageCameraFeatureIds).size,
    uniqueOutputs: new Set(garageCameraOutputs).size,
    expectedFeatureIds: [...featureById.keys()].sort(),
    actualFeatureIds: [...garageCameraFeatureIds].sort(),
    bindingFailures: cameraBindingFailures,
    manifestSha256: sha256File(GARAGE_CAMERA_MANIFEST),
    releaseManifestSha256:
      releaseArtifacts.garageCameraManifest?.sha256,
  };
  check(
    'exact-object-garage-camera-bindings',
    garageCameraManifest.sourceOperationSha256 === sha256File(FORWARD)
      && garageCameraManifest.sourceReport === relative(REPORT)
      && garageCameraManifest.sourceSnapshot.sha256 === EXPECTED_SNAPSHOT
      && garageCameraManifest.sourceSnapshot.expectedSha256
        === EXPECTED_SNAPSHOT
      && garageCameraManifest.sourceSnapshot.hashMatched === true
      && garageCameraManifest.capturePolicy.exactObjectRelation === true
      && garageCameraManifest.capturePolicy.postReleaseOnly === true
      && garageCameraManifest.cameras.length === 18
      && new Set(garageCameraIds).size === 18
      && new Set(garageCameraFeatureIds).size === 18
      && new Set(garageCameraOutputs).size === 18
      && garageCameraFeatureIds.every((id) => featureById.has(id))
      && [...featureById.keys()].every(
        (id) => garageCameraFeatureIds.includes(id),
      )
      && cameraBindingFailures.length === 0
      && releaseArtifacts.garageCameraManifest?.sha256
        === sha256File(GARAGE_CAMERA_MANIFEST),
    garageCameraEvidence,
  );
}

const qa = {
  schemaVersion: 1,
  id: 'mainstreet-america-redevelopment-r4-r5-independent-qa',
  generatedAtUtc: new Date().toISOString(),
  status: failures.length === 0
    ? 'PASS_IMPLEMENTATION_READY_LIVE_QA_PENDING'
    : 'FAIL',
  independentReview: {
    generatorReportTreatedAsClaim: true,
    sourceSnapshotReread: true,
    databaseMode: 'read-only',
    liveRconUsed: false,
    liveWorldMutated: false,
  },
  runtimeSafety: runtimeSafetyEvidence,
  correctedDefectReview: {
    id: 'R4R5-ALLEY-GRADE-SAWTOOTH',
    severity: 'release-blocking',
    rejectedCandidate: {
      west: {
        elevationChanges: 48,
        signReversals: 26,
      },
      east: {
        elevationChanges: 46,
        signReversals: 13,
      },
      reason:
        'The first feasible-grade solver followed local terrain too closely '
        + 'and produced repeated one-block peaks and troughs.',
    },
    correctedCandidate: Object.fromEntries(
      alleyChecks.map((alley) => [alley.id, {
        elevationChanges: alley.grade.elevationChangeCount,
        signReversals: alley.grade.signReversalCount,
        adjacentOpposingStepPairs: alley.grade.adjacentOpposingStepPairs,
        oneCellPeaksOrTroughs: alley.grade.oneCellPeaksOrTroughs,
        minimumReversalPlateauRows: alley.grade.minimumReversalPlateauRows,
      }]),
    ),
  },
  baseline: {
    regions: relative(REGIONS),
    ...snapshotEvidence,
  },
  artifacts: {
    plan: { path: relative(PLAN), sha256: sha256File(PLAN) },
    forward: { path: relative(FORWARD), sha256: sha256File(FORWARD) },
    rollback: { path: relative(ROLLBACK), sha256: sha256File(ROLLBACK) },
    engineeringReport: { path: relative(REPORT), sha256: sha256File(REPORT) },
    design: { path: relative(DESIGN), sha256: sha256File(DESIGN) },
    preflight: { path: relative(PREFLIGHT), sha256: sha256File(PREFLIGHT) },
    forwardDryRun: { path: relative(DRY_RUN), sha256: sha256File(DRY_RUN) },
    rollbackDryRun: {
      path: relative(ROLLBACK_DRY_RUN),
      sha256: sha256File(ROLLBACK_DRY_RUN),
    },
    engineeringRelease: {
      path: relative(RELEASE),
      sha256: sha256File(RELEASE),
    },
    sameCameraManifest: {
      path: relative(CAMERA_MANIFEST),
      sha256: sha256File(CAMERA_MANIFEST),
    },
  },
  summary: {
    assertions: assertions.length,
    passed: assertions.filter((assertion) => assertion.passed).length,
    failed: failures.length,
    exactSourceCellsChecked: forward.cells.size,
    initialSnapshotGuardMismatches: sourceMismatches.length,
    orderAwareRuntimeGuardMismatches:
      orderAwareGuards?.runtimeMismatches.length ?? null,
    rollbackCellsChecked: rollback.cells.size,
    setOperations: forwardParsed.sets.length + rollbackParsed.sets.length,
    duplicateTargets:
      forward.duplicates.length + rollback.duplicates.length,
    protectedBuildingsChecked: protectedBuildings.size,
    targetedBlockEntities: targetedBlockEntities.length,
    parkingFeaturesChecked: parkingFeatures.length,
    parkingStallsChecked: parkingStalls.length,
    parkingIntersections: parkingIntersections.length,
    garagesChecked: garageChecks.length,
    garagesPassed: garageChecks.filter((garage) => garage.passed).length,
    alleysChecked: alleyChecks.length,
    alleySurfaceCellsChecked: alleyChecks.reduce(
      (sum, alley) => sum + alley.surfaceCellsChecked,
      0,
    ),
    databaseFeatureDefinitions: packageFeatures.length,
    missingDatabaseParents: missingParents.length,
    beforeCameraCaptures: cameraManifest.captures.length,
    runtimeSafetyEnabled: CHECK_RUNTIME_SAFETY,
    forwardOrderHazards:
      runtimeSafetyEvidence.forwardOrder?.totalHazards ?? null,
    rollbackOrderHazards:
      runtimeSafetyEvidence.rollbackOrder?.totalHazards ?? null,
    untrackedSupportSideEffects:
      runtimeSafetyEvidence.untrackedSupportSideEffects.length,
    leafDistanceMismatches:
      runtimeSafetyEvidence.leafDistanceMismatches.length,
  },
  garages: garageChecks,
  alleys: alleyChecks,
  database: {
    featureDefinitions: packageFeatures.length,
    parkingFeatureCount: parkingFeatures.length,
    parkingStallCount: parkingStalls.length,
    missingParents,
    existingIdConflicts,
  },
  assertions,
  failures,
  mandatoryLiveGates: [
    'fresh saved-world snapshot and exact guard revalidation',
    'same-moment free-entity and active-builder exclusion',
    'same-camera before capture for streets, garages, B02, and B03',
    'one atomic forward execution with zero failures and zero no-ops',
    'post-release immutable snapshot and exact desired-state census',
    'normal-speed two-way alley, driveway, garage-door, and road tests',
    'protected building, block-entity, parking, fluid, and route reconciliation',
    'object-matched same-camera after capture',
    'databaseFeatures import only after post-release acceptance',
  ],
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(qa, null, 2)}\n`);
console.log(
  `${path.basename(OUTPUT)}: ${qa.summary.passed}/${qa.summary.assertions} `
  + `assertions pass; ${qa.summary.failed} fail`,
);
console.log(
  `  cells ${qa.summary.exactSourceCellsChecked}; garages `
  + `${qa.summary.garagesPassed}/${qa.summary.garagesChecked}; alleys `
  + `${qa.summary.alleysChecked}; parking intersections `
  + `${qa.summary.parkingIntersections}`,
);
console.log(`  status: ${qa.status}`);
process.exit(failures.length === 0 ? 0 : 1);
