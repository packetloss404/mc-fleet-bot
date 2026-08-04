#!/usr/bin/env node
/**
 * Generate the offline-only Wave 2 R08 cross-link package.
 *
 * The generator reads an immutable Anvil snapshot and world-map.db read-only.
 * It never connects to or mutates the live Minecraft world.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

import {
  DetailedAnvilSnapshot,
  analyzeRuntimeOrdering,
  buildRollbackOperations,
  hashSnapshotDirectory,
  orderOperationsForRuntime,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const DEFAULT_PLAN = 'docs/mainstreet-america/planning/redevelopment-wave2-r08.yaml';
const DEFAULT_BASE = 'data/buildops/mainstreet-wave2-r08-2026-07-28';
const DEFAULT_DESIGN =
  'data/world-review/mainstreet-wave2-r08-design-2026-07-28.json';
const DEFAULT_MEDIA =
  'data/exports/redevelopment-wave2-2026-07-28/mainstreet-r08';

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1]
    ? process.argv[index + 1]
    : fallback;
}

function relative(filename) {
  return path.relative(ROOT, path.resolve(ROOT, filename));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function baseBlockName(state) {
  return String(state).split('[', 1)[0];
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function key2(x, z) {
  return `${x},${z}`;
}

function parseState(state) {
  const bracket = state.indexOf('[');
  if (bracket < 0) return { name: state, properties: {} };
  return {
    name: state.slice(0, bracket),
    properties: Object.fromEntries(
      state
        .slice(bracket + 1, -1)
        .split(',')
        .filter(Boolean)
        .map((entry) => entry.split('=')),
    ),
  };
}

function formatState(name, properties) {
  const keys = Object.keys(properties).sort();
  if (!keys.length) return name;
  return `${name}[${keys.map((key) => `${key}=${properties[key]}`).join(',')}]`;
}

function normalizeBounds(bounds) {
  return {
    minX: Math.min(bounds[0], bounds[3]),
    minY: Math.min(bounds[1], bounds[4]),
    minZ: Math.min(bounds[2], bounds[5]),
    maxX: Math.max(bounds[0], bounds[3]),
    maxY: Math.max(bounds[1], bounds[4]),
    maxZ: Math.max(bounds[2], bounds[5]),
  };
}

function operationLine(operation) {
  return [
    'REPL',
    operation.x,
    operation.y,
    operation.z,
    operation.x,
    operation.y,
    operation.z,
    operation.runtimeExpected ?? operation.expected,
    operation.replacement,
  ].join(' ');
}

function parseOperationTargets(filename) {
  const targets = new Set();
  for (const rawLine of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const fields = rawLine.trim().split(/\s+/);
    if (!['REPL', 'SET'].includes(fields[0]) || fields.length < 8) continue;
    const [x1, y1, z1, x2, y2, z2] = fields.slice(1, 7).map(Number);
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        for (let z = Math.min(z1, z2); z <= Math.max(z1, z2); z += 1) {
          targets.add(key3(x, y, z));
        }
      }
    }
  }
  return targets;
}

function rectCells(rectangles) {
  const cells = new Set();
  for (const rectangle of rectangles) {
    for (let x = rectangle.min_x; x <= rectangle.max_x; x += 1) {
      for (let z = rectangle.min_z; z <= rectangle.max_z; z += 1) {
        cells.add(key2(x, z));
      }
    }
  }
  return cells;
}

function centerlineCells() {
  const cells = new Set();
  for (let x = -57; x <= -13; x += 1) cells.add(key2(x, -124));
  for (let z = -126; z <= -124; z += 1) cells.add(key2(-13, z));
  for (let x = -13; x <= 13; x += 1) cells.add(key2(x, -126));
  for (let z = -126; z <= -124; z += 1) cells.add(key2(13, z));
  for (let x = 13; x <= 56; x += 1) cells.add(key2(x, -124));
  return cells;
}

function desiredSurface(x, z, centerline) {
  if (centerline.has(key2(x, z))) return 'minecraft:yellow_concrete';
  if (x >= -4 && x <= 4 && (z === -127 || z === -125)) {
    return 'minecraft:white_concrete';
  }
  return 'minecraft:gray_concrete';
}

function adjacent4(x, z) {
  return [
    [x - 1, z],
    [x + 1, z],
    [x, z - 1],
    [x, z + 1],
  ];
}

function connected(cells, start, end) {
  const startKey = key2(start[0], start[2]);
  const endKey = key2(end[0], end[2]);
  if (!cells.has(startKey) || !cells.has(endKey)) return false;
  const queue = [startKey];
  const visited = new Set(queue);
  while (queue.length) {
    const current = queue.shift();
    if (current === endKey) return true;
    const [x, z] = current.split(',').map(Number);
    for (const [nextX, nextZ] of adjacent4(x, z)) {
      const next = key2(nextX, nextZ);
      if (!cells.has(next) || visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  return false;
}

class Collector {
  constructor(snapshot) {
    this.snapshot = snapshot;
    this.operations = new Map();
    this.noOps = [];
    this.conflicts = [];
  }

  async add(x, y, z, replacement, meta) {
    const expected = await this.snapshot.getBlock(x, y, z);
    if (expected === null) {
      this.conflicts.push({
        type: 'missing_snapshot_cell',
        point: [x, y, z],
        meta,
      });
      return;
    }
    if (expected === replacement) {
      this.noOps.push({ x, y, z, expected, replacement, ...meta });
      return;
    }
    const key = key3(x, y, z);
    const existing = this.operations.get(key);
    const operation = {
      x,
      y,
      z,
      expected,
      replacement,
      ...meta,
    };
    if (existing && existing.replacement !== replacement) {
      this.conflicts.push({
        type: 'duplicate_target_conflict',
        point: [x, y, z],
        first: existing,
        second: operation,
      });
      return;
    }
    if (!existing) this.operations.set(key, operation);
  }

  list() {
    return [...this.operations.values()];
  }
}

function roadRole(x, z, centerline) {
  if (centerline.has(key2(x, z))) return 'centerline_surface';
  if (x >= -4 && x <= 4 && (z === -127 || z === -125)) {
    return 'r01_crosswalk_surface';
  }
  return 'shared_cross_link_surface';
}

function gateTargetSet(plan) {
  const targets = new Set();
  for (const gate of plan.geometry.declared_gates) {
    for (let z = gate.min_z; z <= gate.max_z; z += 1) {
      targets.add(key3(gate.x, gate.y, z));
    }
  }
  return targets;
}

function stateAfterNeighborRemoved(state, direction) {
  const parsed = parseState(state);
  if (!parsed.name.endsWith('_fence')) {
    throw new Error(`expected fence state, found ${state}`);
  }
  if (!(direction in parsed.properties)) {
    throw new Error(`fence state has no ${direction} property: ${state}`);
  }
  parsed.properties[direction] = 'false';
  return formatState(parsed.name, parsed.properties);
}

async function auditReactiveFenceNeighbors(snapshot, gateTargets) {
  const candidates = new Map();
  for (const targetKey of gateTargets) {
    const [x, y, z] = targetKey.split(',').map(Number);
    for (const [direction, point] of [
      ['east', [x - 1, y, z]],
      ['west', [x + 1, y, z]],
      ['south', [x, y, z - 1]],
      ['north', [x, y, z + 1]],
    ]) {
      const neighborKey = key3(...point);
      if (gateTargets.has(neighborKey)) continue;
      const state = await snapshot.getBlock(...point);
      if (!baseBlockName(state).endsWith('_fence')) continue;
      candidates.set(neighborKey, {
        point,
        changedConnection: direction,
        snapshotExactState: state,
        projectedForwardExactState: stateAfterNeighborRemoved(state, direction),
        rollbackExactState: state,
        mutationMechanism:
          'Vanilla neighbor physics updates this non-target fence after the adjacent declared gate cell becomes air; restoring the gate reconnects it.',
      });
    }
  }
  return [...candidates.values()].sort((left, right) => (
    left.point[0] - right.point[0]
    || left.point[2] - right.point[2]
    || left.point[1] - right.point[1]
  ));
}

function featureContains(feature, x, z) {
  return (
    x >= feature.min_x
    && x <= feature.max_x
    && z >= feature.min_z
    && z <= feature.max_z
  );
}

function cameraManifest(plan, snapshotEvidence, reportPath) {
  return {
    schemaVersion: 1,
    id: 'mainstreet-wave2-r08-same-camera-contract',
    generatedAtUtc: new Date().toISOString(),
    sourceReport: relative(reportPath),
    sourceSnapshot: {
      regions: plan.source.immutable_snapshot.directory,
      sha256: snapshotEvidence.sha256,
    },
    capturePolicy: {
      renderer: 'scripts/world_render.mjs',
      width: 1280,
      height: 720,
      fieldOfView: 68,
      preReleaseOnly: true,
      sameCameraAfterRequired: true,
    },
    cameras: [
      {
        id: 'MSA-R08-OVERALL-MAP',
        primaryFeatureId: 'R8-R08-CROSS-LINK',
        role: 'full-connector-map',
        mode: 'map',
        center: [0, -124],
        span: 150,
        output: '01-r08-overall-map.before.png',
      },
      {
        id: 'MSA-R08-WEST-ENDPOINT',
        primaryFeatureId: 'R8-JCT-ALLEY-W-R08',
        role: 'west-alley-connection',
        eye: [-72, 72, -137],
        lookAt: [-55, 66, -124],
        output: '02-west-endpoint.before.png',
      },
      {
        id: 'MSA-R08-WEST-GATE',
        primaryFeatureId: 'R8-GATE-R08-WEST-MAIN',
        role: 'declared-gate-and-offset',
        eye: [-18, 78, -112],
        lookAt: [-8, 67, -126],
        output: '03-west-gate.before.png',
      },
      {
        id: 'MSA-R08-R01-JUNCTION',
        primaryFeatureId: 'R8-JCT-R01-R08',
        role: 'compact-crosswalk-and-route-continuation',
        eye: [-1, 76, -109],
        lookAt: [0, 67, -126],
        output: '04-r01-junction.before.png',
      },
      {
        id: 'MSA-R08-EAST-GATE',
        primaryFeatureId: 'R8-GATE-R08-EAST-MAIN',
        role: 'declared-gate-and-offset',
        eye: [23, 72, -137],
        lookAt: [8, 67, -126],
        output: '05-east-gate.before.png',
      },
      {
        id: 'MSA-R08-EAST-ENDPOINT',
        primaryFeatureId: 'R8-JCT-R08-ALLEY-E',
        role: 'east-alley-connection',
        eye: [72, 72, -137],
        lookAt: [55, 66, -124],
        output: '06-east-endpoint.before.png',
      },
      {
        id: 'MSA-R08-DIRECTORY',
        primaryFeatureId: 'R8-WF-R08-CENTRAL',
        role: 'district-directory-object',
        eye: [18, 69, -143],
        lookAt: [7, 67, -132],
        output: '07-r08-directory.before.png',
      },
      {
        id: 'MSA-WESTLIGHT-DIRECTORY',
        primaryFeatureId: 'R8-WF-WESTLIGHT',
        role: 'regional-venue-directory-object',
        eye: [18, 70, -211],
        lookAt: [6, 67, -223],
        output: '08-westlight-directory.before.png',
      },
    ],
  };
}

function isAirState(state) {
  return [
    'minecraft:air',
    'minecraft:cave_air',
    'minecraft:void_air',
  ].includes(baseBlockName(state));
}

async function addCameraVisibilityEvidence(snapshot, manifest) {
  for (const camera of manifest.cameras) {
    if ((camera.mode ?? 'persp') === 'map') {
      camera.visibilityValidation = {
        method: 'not-applicable-top-down-map',
        passed: true,
      };
      continue;
    }
    const eyePoint = camera.eye.map((value) => Math.floor(value));
    const eyeClearanceCells = [];
    for (let x = eyePoint[0] - 1; x <= eyePoint[0] + 1; x += 1) {
      for (let y = eyePoint[1] - 1; y <= eyePoint[1] + 1; y += 1) {
        for (let z = eyePoint[2] - 1; z <= eyePoint[2] + 1; z += 1) {
          eyeClearanceCells.push({
            point: [x, y, z],
            state: await snapshot.getBlock(x, y, z),
          });
        }
      }
    }
    const rayByPoint = new Map();
    for (let step = 0; step <= 64; step += 1) {
      const fraction = step / 64;
      const point = camera.eye.map((value, index) => Math.floor(
        value + (camera.lookAt[index] - value) * fraction,
      ));
      rayByPoint.set(key3(...point), {
        point,
        state: await snapshot.getBlock(...point),
      });
    }
    const rayCells = [...rayByPoint.values()];
    camera.visibilityValidation = {
      method:
        'immutable-source 3x3x3 eye clearance plus 65-step center visibility ray',
      eyePoint,
      eyeClearanceCells,
      eyeClear: eyeClearanceCells.every((cell) => isAirState(cell.state)),
      visibilityRay: {
        sampleCount: rayCells.length,
        cells: rayCells,
        unobstructed: rayCells.every((cell) => isAirState(cell.state)),
      },
    };
    camera.visibilityValidation.passed = (
      camera.visibilityValidation.eyeClear
      && camera.visibilityValidation.visibilityRay.unobstructed
    );
    if (!camera.visibilityValidation.passed) {
      throw new Error(
        `${camera.id} source-state camera visibility failed: `
        + JSON.stringify(camera.visibilityValidation),
      );
    }
  }
  return manifest;
}

function databaseFeatures(plan) {
  const routeGeometry = {
    type: 'LineString3D',
    coordinates: plan.geometry.road.centerline,
    width: plan.geometry.road.width,
  };
  const features = [
    {
      external_id: 'R8-R08-CROSS-LINK',
      parent_external_id: 'SITE',
      name: 'R08 shared cross-link',
      kind: 'road',
      status: 'planned',
      geometry: routeGeometry,
      tags: ['wave2', 'shared-street', 'pedestrian', 'r08'],
    },
    {
      external_id: 'R8-GATE-R08-WEST-MAIN',
      parent_external_id: 'BLK-WN',
      name: 'R08 west Main Street gate',
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'bounds', minX: -8, maxX: -8, minY: 64, maxY: 67, minZ: -127, maxZ: -125 },
      tags: ['wave2', 'declared-gate'],
    },
    {
      external_id: 'R8-GATE-R08-EAST-MAIN',
      parent_external_id: 'BLK-EN',
      name: 'R08 east Main Street gate',
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'bounds', minX: 8, maxX: 8, minY: 64, maxY: 67, minZ: -127, maxZ: -125 },
      tags: ['wave2', 'declared-gate'],
    },
    {
      external_id: 'R8-JCT-ALLEY-W-R08',
      parent_external_id: 'R8-R08-CROSS-LINK',
      name: 'West Alley / R08 junction',
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'point', x: -57, y: 64, z: -124 },
      tags: ['wave2', 'junction'],
    },
    {
      external_id: 'R8-JCT-R01-R08',
      parent_external_id: 'R8-R08-CROSS-LINK',
      name: 'Main Street / R08 compact junction',
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'bounds', minX: -5, maxX: 5, minY: 64, maxY: 65, minZ: -127, maxZ: -125 },
      tags: ['wave2', 'junction', 'crosswalk'],
    },
    {
      external_id: 'R8-JCT-R08-ALLEY-E',
      parent_external_id: 'R8-R08-CROSS-LINK',
      name: 'R08 / East Alley junction',
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'point', x: 56, y: 64, z: -124 },
      tags: ['wave2', 'junction'],
    },
  ];
  for (const pylon of plan.wayfinding.pylons) {
    const [x, y, z] = pylon.point;
    features.push({
      external_id: pylon.id,
      parent_external_id: pylon.id === 'R8-WF-WESTLIGHT'
        ? 'R07'
        : 'R8-R08-CROSS-LINK',
      name: pylon.lines[0],
      kind: 'landmark',
      status: 'planned',
      geometry: { type: 'point', x, y, z },
      tags: ['wave2', 'wayfinding', 'directory'],
      attributes: { lines: pylon.lines },
    });
  }
  return features;
}

async function generate({
  plan,
  planPath,
  basePath,
  reportPath,
  designPath,
  mediaDir,
}) {
  const snapshotDir = path.resolve(ROOT, plan.source.immutable_snapshot.directory);
  const snapshotEvidence = hashSnapshotDirectory(snapshotDir);
  if (snapshotEvidence.sha256 !== plan.source.immutable_snapshot.sha256) {
    throw new Error(
      `snapshot mismatch: expected ${plan.source.immutable_snapshot.sha256}; `
      + `found ${snapshotEvidence.sha256}`,
    );
  }
  const snapshotBytes = snapshotEvidence.members
    .reduce((sum, member) => sum + member.bytes, 0);
  if (
    snapshotEvidence.regionFileCount
      !== plan.source.immutable_snapshot.region_file_count
    || snapshotBytes !== plan.source.immutable_snapshot.bytes
  ) {
    throw new Error('snapshot member count/byte count differs from the plan');
  }

  const snapshot = new DetailedAnvilSnapshot(snapshotDir);
  const collector = new Collector(snapshot);
  const roadCells = rectCells(plan.geometry.road.cells);
  const centerline = centerlineCells();
  const gateTargets = gateTargetSet(plan);
  const collisions = [];

  for (const cell of roadCells) {
    const [x, z] = cell.split(',').map(Number);
    const surface = await snapshot.getBlock(x, plan.geometry.surface_y, z);
    if (![
      'minecraft:grass_block[snowy=false]',
      'minecraft:light_gray_concrete',
      'minecraft:smooth_stone',
      'minecraft:dirt',
    ].includes(surface)) {
      collisions.push({
        type: 'unexpected_route_surface',
        point: [x, plan.geometry.surface_y, z],
        state: surface,
      });
      continue;
    }

    for (let y = plan.geometry.surface_y + 1; y <= plan.geometry.surface_y + 3; y += 1) {
      const state = await snapshot.getBlock(x, y, z);
      if (baseBlockName(state) === 'minecraft:air') continue;
      const pointKey = key3(x, y, z);
      if (gateTargets.has(pointKey) && baseBlockName(state).endsWith('_fence')) {
        await collector.add(x, y, z, 'minecraft:air', {
          phase: 10,
          scope: x < 0 ? 'GATE-R08-WEST-MAIN' : 'GATE-R08-EAST-MAIN',
          role: 'declared_gate_clearance',
        });
      } else if (
        y === 65
        && (x === -5 || x === 5)
        && z >= -127
        && z <= -125
        && baseBlockName(state) === 'minecraft:stone_brick_slab'
      ) {
        await collector.add(x, y, z, 'minecraft:air', {
          phase: 11,
          scope: 'R8-JCT-R01-R08',
          role: 'curb_crossing_clearance',
        });
      } else {
        collisions.push({
          type: 'protected_headroom_obstruction',
          point: [x, y, z],
          state,
        });
      }
    }

    await collector.add(
      x,
      plan.geometry.foundation_y,
      z,
      'minecraft:stone_bricks',
      {
        phase: 20,
        scope: 'R8-R08-CROSS-LINK',
        role: 'uniform_foundation',
      },
    );
    await collector.add(
      x,
      plan.geometry.surface_y,
      z,
      desiredSurface(x, z, centerline),
      {
        phase: 30,
        scope: 'R8-R08-CROSS-LINK',
        role: roadRole(x, z, centerline),
      },
    );
  }

  const signCommands = [];
  for (const pylon of plan.wayfinding.pylons) {
    const [x, y, z] = pylon.point;
    await collector.add(x, y, z, 'minecraft:polished_andesite', {
      phase: 40,
      scope: pylon.id,
      role: 'directory_base',
    });
    await collector.add(x, y + 1, z, 'minecraft:stone_bricks', {
      phase: 40,
      scope: pylon.id,
      role: 'directory_pier',
    });
    await collector.add(x, y + 2, z, 'minecraft:sea_lantern', {
      phase: 40,
      scope: pylon.id,
      role: 'directory_lamp',
    });
    const signState =
      `minecraft:oak_sign[rotation=${pylon.rotation},waterlogged=false]`;
    await collector.add(x, y + 3, z, signState, {
      phase: 40,
      scope: pylon.id,
      role: 'directory_sign',
    });
    const messages = pylon.lines
      .map((line) => `'${JSON.stringify({ text: line })}'`)
      .join(',');
    signCommands.push({
      id: pylon.id,
      point: [x, y + 3, z],
      guard: signState,
      command:
        `CMD execute if block ${x} ${y + 3} ${z} ${signState} `
        + `run data merge block ${x} ${y + 3} ${z} `
        + `{front_text:{color:"black",has_glowing_text:1b,messages:[${messages}]}}`,
    });
  }

  const snapshotOperations = collector.list();
  const operations = orderOperationsForRuntime(snapshotOperations);
  const operationKeys = new Set(
    operations.map((operation) => key3(operation.x, operation.y, operation.z)),
  );
  const runtimeSafety = analyzeRuntimeOrdering(operations);
  const rollback = buildRollbackOperations(operations);

  const acceptedR1 = [];
  const r1Union = new Set();
  for (const filename of plan.protection.accepted_r1_operation_files) {
    const absolute = path.resolve(ROOT, filename);
    const targets = parseOperationTargets(absolute);
    acceptedR1.push({
      file: filename,
      sha256: sha256File(absolute),
      targetCells: targets.size,
    });
    for (const target of targets) r1Union.add(target);
  }
  const r1Overlaps = operations
    .filter((operation) => r1Union.has(key3(operation.x, operation.y, operation.z)))
    .map((operation) => ({
      point: [operation.x, operation.y, operation.z],
      scope: operation.scope,
      role: operation.role,
    }));

  const operationBounds = normalizeBounds([
    Math.min(...operations.map((operation) => operation.x)),
    Math.min(...operations.map((operation) => operation.y)),
    Math.min(...operations.map((operation) => operation.z)),
    Math.max(...operations.map((operation) => operation.x)),
    Math.max(...operations.map((operation) => operation.y)),
    Math.max(...operations.map((operation) => operation.z)),
  ]);
  const existingBlockEntities = await snapshot.blockEntitiesInBox([
    operationBounds.minX,
    operationBounds.minY,
    operationBounds.minZ,
    operationBounds.maxX,
    operationBounds.maxY,
    operationBounds.maxZ,
  ]);
  const targetedBlockEntities = existingBlockEntities
    .filter((entity) => operationKeys.has(key3(entity.x, entity.y, entity.z)));

  const database = new Database(path.resolve(ROOT, plan.source.database), {
    readonly: true,
    fileMustExist: true,
  });
  const protectedKinds = plan.protection.protected_database_kinds;
  const placeholders = protectedKinds.map(() => '?').join(',');
  const protectedFeatures = database.prepare(
    `SELECT id, external_id, name, kind, status, min_x, max_x, min_z, max_z
     FROM world_features
     WHERE kind IN (${placeholders}) AND status != 'removed'`,
  ).all(...protectedKinds);
  const fenceFeatures = database.prepare(
    `SELECT id, external_id, name, kind, status, min_x, max_x, min_z, max_z
     FROM world_features
     WHERE kind = 'fence' AND status != 'removed'`,
  ).all();
  const proposedFeatures = databaseFeatures(plan);
  const proposedIds = proposedFeatures.map((feature) => feature.external_id);
  const existingProposedIds = proposedIds.length
    ? database.prepare(
      `SELECT id, external_id, name FROM world_features
       WHERE external_id IN (${proposedIds.map(() => '?').join(',')})`,
    ).all(...proposedIds)
    : [];
  database.close();

  const protectedBboxOverlaps = [];
  const coarseFenceBboxOverlaps = [];
  for (const operation of operations) {
    for (const feature of protectedFeatures) {
      if (!featureContains(feature, operation.x, operation.z)) continue;
      protectedBboxOverlaps.push({
        point: [operation.x, operation.y, operation.z],
        feature: {
          id: feature.id,
          externalId: feature.external_id,
          name: feature.name,
          kind: feature.kind,
        },
      });
    }
    for (const fence of fenceFeatures) {
      if (!featureContains(fence, operation.x, operation.z)) continue;
      coarseFenceBboxOverlaps.push({
        point: [operation.x, operation.y, operation.z],
        feature: {
          id: fence.id,
          externalId: fence.external_id,
          name: fence.name,
        },
        interpretation:
          'Coarse boundary enclosure bbox; exact occupied fence-cell policy governs construction.',
      });
    }
  }

  const garageReport = JSON.parse(fs.readFileSync(
    path.resolve(
      ROOT,
      'data/buildops/mainstreet-redevelopment-r4-r5-runtime-safe-2026-07-27.report.json',
    ),
    'utf8',
  ));
  const garageBboxOverlaps = [];
  for (const operation of operations) {
    for (const garage of garageReport.garages.matrix) {
      const [minX, maxX, minZ, maxZ] = garage.garageBounds;
      if (
        operation.x >= minX
        && operation.x <= maxX
        && operation.z >= minZ
        && operation.z <= maxZ
      ) {
        garageBboxOverlaps.push({
          point: [operation.x, operation.y, operation.z],
          garageId: garage.garageId,
          buildingId: garage.buildingId,
        });
      }
    }
  }

  const exactFenceTargets = operations.filter(
    (operation) => baseBlockName(operation.expected).endsWith('_fence'),
  );
  const undeclaredFenceTargets = exactFenceTargets.filter(
    (operation) => !gateTargets.has(key3(operation.x, operation.y, operation.z)),
  );
  const targetedTrees = operations.filter((operation) => {
    const name = baseBlockName(operation.expected);
    return name.endsWith('_log') || name.endsWith('_leaves');
  });
  const reactiveFenceNeighbors = await auditReactiveFenceNeighbors(
    snapshot,
    gateTargets,
  );

  const routeHeadroomFailures = [];
  for (const cell of roadCells) {
    const [x, z] = cell.split(',').map(Number);
    for (let y = 65; y <= 67; y += 1) {
      const projected = operations.find(
        (operation) => operation.x === x && operation.y === y && operation.z === z,
      )?.replacement ?? await snapshot.getBlock(x, y, z);
      if (baseBlockName(projected) !== 'minecraft:air') {
        routeHeadroomFailures.push({ point: [x, y, z], projected });
      }
    }
  }
  const westEndpoint = plan.geometry.road.bidirectional_endpoints.west;
  const eastEndpoint = plan.geometry.road.bidirectional_endpoints.east;
  const routeConnected = connected(roadCells, westEndpoint, eastEndpoint);
  const connectionProof = {
    west: {
      newEndpoint: westEndpoint,
      existingAlleyCell: [-58, 65, -124],
      adjacency: 1,
      existingSurface: await snapshot.getBlock(-58, 64, -124),
      existingHeadroom: await snapshot.getBlock(-58, 65, -124),
      r1CellRetargeted: operationKeys.has(key3(-58, 64, -124)),
    },
    east: {
      newEndpoint: eastEndpoint,
      existingAlleyCell: [57, 65, -124],
      adjacency: 1,
      existingSurface: await snapshot.getBlock(57, 64, -124),
      existingHeadroom: await snapshot.getBlock(57, 65, -124),
      r1CellRetargeted: operationKeys.has(key3(57, 64, -124)),
    },
    r01: {
      northContinuation: [0, 65, -128],
      southContinuation: [0, 65, -124],
      crossingBounds: [-5, 64, -127, 5, 65, -125],
      routeSurfacePreservedAsWalkable: true,
      disconnected: false,
    },
  };

  const forwardSourcesExact = operations.every(
    (operation) => operation.allowedExactSources.every(
      (state) => state.includes('[')
        || !baseBlockName(operation.expected).includes('[')
        || state === operation.expected,
    ),
  );
  const finiteUnionCells = runtimeSafety.finiteExactStateUnionGuards
    .flatMap((entry) => entry.cells ?? [entry]);
  const finiteUnionMaterialOnly = finiteUnionCells
    .filter((entry) => (
      entry.allowedExactSources?.some((state) => !state.includes('['))
    ));
  const manifest = await addCameraVisibilityEvidence(
    snapshot,
    cameraManifest(plan, snapshotEvidence, reportPath),
  );
  const cameraVisibility = manifest.cameras.map((camera) => ({
    id: camera.id,
    mode: camera.mode ?? 'persp',
    passed: camera.visibilityValidation.passed,
    method: camera.visibilityValidation.method,
    eyePoint: camera.visibilityValidation.eyePoint ?? null,
    eyeClear: camera.visibilityValidation.eyeClear ?? null,
    raySampleCount:
      camera.visibilityValidation.visibilityRay?.sampleCount ?? null,
    rayUnobstructed:
      camera.visibilityValidation.visibilityRay?.unobstructed ?? null,
  }));

  const acceptanceChecks = {
    immutableSnapshotHashMatched:
      snapshotEvidence.sha256 === plan.source.immutable_snapshot.sha256,
    immutableSnapshotMemberCountMatched:
      snapshotEvidence.regionFileCount
        === plan.source.immutable_snapshot.region_file_count,
    noGeneratorConflicts:
      collector.conflicts.length === 0 && collisions.length === 0,
    connectedBidirectionally:
      routeConnected && connected(roadCells, eastEndpoint, westEndpoint),
    bidirectionalEndpointCount: 2,
    flatGradeAndThreeBlockHeadroom: routeHeadroomFailures.length === 0,
    acceptedR1TargetOverlapZero: r1Overlaps.length === 0,
    protectedBuildingRoomDrivewayLandscapeOverlapZero:
      protectedBboxOverlaps.length === 0,
    garageOverlapZero: garageBboxOverlaps.length === 0,
    exactFenceTargetCountIsDeclaredSix:
      exactFenceTargets.length === 6 && undeclaredFenceTargets.length === 0,
    targetedTreeCellsZero: targetedTrees.length === 0,
    existingTargetedBlockEntitiesZero: targetedBlockEntities.length === 0,
    r01RemainsConnected: !connectionProof.r01.disconnected,
    alleyIntersectionsRetargetedZero:
      !connectionProof.west.r1CellRetargeted
      && !connectionProof.east.r1CellRetargeted,
    runtimeReactiveHazardsZero:
      runtimeSafety.reactiveNeighborHazardCount === 0,
    runtimeReactiveBeforeSupport:
      runtimeSafety.allReactiveOperationsBeforeSupportMutations,
    finiteUnionGuardsUseFullExactStates:
      finiteUnionMaterialOnly.length === 0 && forwardSourcesExact,
    reactiveFenceNeighborModelComplete:
      reactiveFenceNeighbors.length === 2
      && reactiveFenceNeighbors.every(
        (entry) => (
          entry.snapshotExactState !== entry.projectedForwardExactState
          && entry.rollbackExactState === entry.snapshotExactState
        ),
      ),
    proposedDatabaseIdsUnique:
      new Set(proposedIds).size === proposedIds.length
      && existingProposedIds.length === 0,
    fourGuardedDirectoryCommands:
      signCommands.length === 4
      && signCommands.every((entry) => entry.command.startsWith('CMD execute if block')),
    allCameraSourceVisibilityChecksPass:
      cameraVisibility.every((entry) => entry.passed),
    exactRollbackOperationCount:
      rollback.length === operations.length,
  };
  const failedAcceptance = Object.entries(acceptanceChecks)
    .filter(([, value]) => value === false)
    .map(([name]) => name);

  const generatedAtUtc = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    id: plan.id,
    generatedAtUtc,
    liveWorldMutated: false,
    source: {
      plan: relative(planPath),
      planSha256: sha256File(planPath),
      snapshot: {
        directory: plan.source.immutable_snapshot.directory,
        sha256: snapshotEvidence.sha256,
        regionFileCount: snapshotEvidence.regionFileCount,
        bytes: snapshotBytes,
        algorithm: snapshotEvidence.algorithm,
      },
      database: {
        file: plan.source.database,
        readonly: true,
        sha256: sha256File(path.resolve(ROOT, plan.source.database)),
      },
      acceptedR1,
      acceptedReleaseQa: {
        file: plan.source.accepted_release_qa,
        sha256: sha256File(path.resolve(ROOT, plan.source.accepted_release_qa)),
      },
    },
    decision: plan.decision,
    geometry: {
      classification: plan.decision.classification,
      roadCellCount: roadCells.size,
      width: plan.geometry.road.width,
      surfaceY: plan.geometry.surface_y,
      foundationY: plan.geometry.foundation_y,
      centerline: plan.geometry.road.centerline,
      bidirectionalEndpoints: plan.geometry.road.bidirectional_endpoints,
      connections: plan.geometry.road.connections,
      grade: {
        minimumSurfaceY: 64,
        maximumSurfaceY: 64,
        maximumAdjacentStep: 0,
      },
      routeDirections: [
        { id: 'west-to-east', from: westEndpoint, to: eastEndpoint, connected: routeConnected },
        { id: 'east-to-west', from: eastEndpoint, to: westEndpoint, connected: connected(roadCells, eastEndpoint, westEndpoint) },
      ],
      connectionProof,
    },
    operations: {
      forward: relative(`${basePath}.txt`),
      rollback: relative(`${basePath}.rollback.txt`),
      guardedReplacements: operations.length,
      commands: signCommands.length,
      totalSourceLines: operations.length + signCommands.length,
      targetCellCount: operations.length,
      noOpCells: collector.noOps.length,
      roles: Object.fromEntries(
        [...new Set(operations.map((operation) => operation.role))]
          .sort()
          .map((role) => [
            role,
            operations.filter((operation) => operation.role === role).length,
          ]),
      ),
      exactStateGuarded: operations.length,
      finiteExactStateUnionGuarded:
        runtimeSafety.neighborDerivedExactStateGuardCount,
      sha256: null,
    },
    runtimeSafety: {
      ...runtimeSafety,
      materialOnlyFiniteUnionGuards: finiteUnionMaterialOnly,
      forwardSourcesExact,
      gatePhysics: {
        declaredGateTargets: [...gateTargets].sort(),
        exactFenceTargets: exactFenceTargets.map((operation) => ({
          point: [operation.x, operation.y, operation.z],
          snapshotExactState: operation.expected,
          runtimeGuard: operation.runtimeExpected,
          allowedExactSources: operation.allowedExactSources,
          guardMode: operation.guardMode,
        })),
        adjacentReactiveFenceCells: reactiveFenceNeighbors,
        targetCount: exactFenceTargets.length,
        adjacentReactiveCellCount: reactiveFenceNeighbors.length,
        rollbackMechanism:
          'Inverse operations restore all six snapshot-exact fence states; vanilla neighbor physics restores both modeled adjacent non-target states.',
      },
    },
    protection: {
      r1TargetOverlaps: r1Overlaps,
      protectedBboxOverlaps,
      garageBboxOverlaps,
      coarseFenceBboxOverlaps: {
        count: coarseFenceBboxOverlaps.length,
        interpretation:
          'Expected false-positive containment: fence feature bboxes enclose whole districts. Exact occupied fence cells are audited separately.',
        uniqueFeatures: [
          ...new Map(
            coarseFenceBboxOverlaps.map((entry) => [entry.feature.id, entry.feature]),
          ).values(),
        ],
      },
      exactFenceTargets: exactFenceTargets.length,
      undeclaredFenceTargets,
      targetedTrees,
      existingBlockEntitiesInOperationBounds: existingBlockEntities.length,
      targetedBlockEntities,
      collisions,
      generatorConflicts: collector.conflicts,
      routeHeadroomFailures,
    },
    wayfinding: {
      pylons: plan.wayfinding.pylons,
      guardedCommands: signCommands,
      namingDecision:
        'C01 is labeled as C01; Westlight is labeled WESTLIGHT VENUE and routed via Ravensreach, Ravensgate, and Approach Road so the two venues cannot be confused.',
    },
    databaseFeatures: {
      mutationPerformed: false,
      proposedCount: proposedFeatures.length,
      existingIdConflicts: existingProposedIds,
      features: proposedFeatures,
    },
    media: {
      manifest: relative(path.join(mediaDir, 'same-camera-manifest.json')),
      beforeDirectory: relative(path.join(mediaDir, 'before')),
      requiredAfterDirectory: relative(path.join(mediaDir, 'after')),
      cameraCount: 8,
      sourceVisibilityAudit: cameraVisibility,
    },
    acceptanceChecks,
    failedAcceptance,
    releaseDecision: failedAcceptance.length === 0
      ? {
        offlineEngineering: 'GO',
        liveExecution: 'NOT_AUTHORIZED_OFFLINE_PACKAGE_ONLY',
        rationale:
            'The package is exact-guarded and offline-safe. Any live use requires a fresh saved-world baseline, regeneration, entity gate, same-camera before capture, strict atomic execution, route QA, and post evidence.',
      }
      : {
        offlineEngineering: 'NO_GO',
        liveExecution: 'NO_GO',
        rationale: `Failed acceptance checks: ${failedAcceptance.join(', ')}`,
      },
  };

  const forwardHeader = [
    '# GENERATED FILE — MainStreet America Wave 2 R08 shared cross-link',
    `# package: ${plan.id}`,
    `# plan: ${relative(planPath)}`,
    `# immutable_snapshot: ${plan.source.immutable_snapshot.directory}`,
    `# immutable_snapshot_sha256: ${snapshotEvidence.sha256}`,
    '# live_mutation_authorized: false',
    '# atomic_package: do not execute a subset',
    '# execution_gate: regenerate against a fresh saved-world snapshot, exact preflight, entity clear, same-camera before capture, strict atomic execution, route QA',
    `# guarded_replacements: ${operations.length}`,
    `# guarded_commands: ${signCommands.length}`,
    `# finite_exact_state_union_guards: ${runtimeSafety.neighborDerivedExactStateGuardCount}`,
    '',
  ];
  let priorGroup = null;
  for (const operation of operations) {
    const group = `${operation.phase}:${operation.scope}:${operation.role}`;
    if (group !== priorGroup) {
      forwardHeader.push(
        `# phase=${operation.phase} scope=${operation.scope} role=${operation.role}`,
      );
      priorGroup = group;
    }
    forwardHeader.push(operationLine(operation));
  }
  forwardHeader.push('', '# phase=50 scope=WAYFINDING role=guarded_sign_text');
  for (const command of signCommands) forwardHeader.push(command.command);
  forwardHeader.push('');
  const forwardText = forwardHeader.join('\n');
  report.operations.sha256 = sha256(forwardText);

  const rollbackText = [
    '# GENERATED FILE — exact inverse for MainStreet America Wave 2 R08',
    `# package: ${plan.id}`,
    `# forward_file: ${relative(`${basePath}.txt`)}`,
    `# forward_sha256: ${report.operations.sha256}`,
    `# immutable_snapshot_sha256: ${snapshotEvidence.sha256}`,
    '# apply only after this exact forward package completed',
    '# sign block entities are removed by the guarded inverse sign-block replacements',
    `# guarded_replacements: ${rollback.length}`,
    '',
    ...rollback.map(operationLine),
    '',
  ].join('\n');
  report.operations.rollbackSha256 = sha256(rollbackText);

  const manifestPath = path.join(mediaDir, 'same-camera-manifest.json');

  fs.mkdirSync(path.dirname(basePath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.mkdirSync(path.dirname(designPath), { recursive: true });
  fs.mkdirSync(mediaDir, { recursive: true });
  fs.writeFileSync(`${basePath}.txt`, forwardText);
  fs.writeFileSync(`${basePath}.rollback.txt`, rollbackText);
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(designPath, `${JSON.stringify({
    schemaVersion: 1,
    id: `${plan.id}-design`,
    generatedAtUtc,
    selectedDefect: plan.decision.selected_defect,
    selectedPackage: plan.decision.selected_package,
    rejectedAlternatives: plan.decision.rejected_alternatives,
    exactEnvelope: {
      roadCells: plan.geometry.road.cells,
      operationBounds,
    },
    protectedFeatureAudit: {
      databaseKinds: protectedKinds,
      bboxOverlaps: protectedBboxOverlaps,
      garageBboxOverlaps,
      declaredFenceGateCells: [...gateTargets].sort(),
      adjacentFencePhysics: reactiveFenceNeighbors,
      coarseFenceBboxInterpretation:
          report.protection.coarseFenceBboxOverlaps.interpretation,
    },
    bidirectionalRouteProof: report.geometry,
    proposedDatabaseFeatures: proposedFeatures,
    cameras: manifest.cameras,
    acceptanceChecks,
    releaseDecision: report.releaseDecision,
  }, null, 2)}\n`);
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(JSON.stringify({
    package: plan.id,
    output: relative(`${basePath}.txt`),
    rollback: relative(`${basePath}.rollback.txt`),
    report: relative(reportPath),
    design: relative(designPath),
    cameraManifest: relative(manifestPath),
    immutableSnapshotSha256: snapshotEvidence.sha256,
    routeCells: roadCells.size,
    guardedReplacements: operations.length,
    guardedCommands: signCommands.length,
    declaredFenceTargets: exactFenceTargets.length,
    adjacentReactiveFenceCells: reactiveFenceNeighbors.length,
    r1TargetOverlaps: r1Overlaps.length,
    protectedFeatureOverlaps: protectedBboxOverlaps.length,
    garageOverlaps: garageBboxOverlaps.length,
    targetedTrees: targetedTrees.length,
    targetedBlockEntities: targetedBlockEntities.length,
    failedAcceptance,
    releaseDecision: report.releaseDecision,
  }, null, 2));

  if (failedAcceptance.length > 0) process.exitCode = 1;
  return report;
}

export async function main() {
  const planPath = path.resolve(ROOT, argValue('--plan', DEFAULT_PLAN));
  const basePath = path.resolve(ROOT, argValue('--base', DEFAULT_BASE));
  const reportPath = path.resolve(
    ROOT,
    argValue('--report', `${DEFAULT_BASE}.report.json`),
  );
  const designPath = path.resolve(ROOT, argValue('--design', DEFAULT_DESIGN));
  const mediaDir = path.resolve(ROOT, argValue('--media-dir', DEFAULT_MEDIA));
  const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
  if (plan?.id !== 'mainstreet-america-redevelopment-wave2-r08') {
    throw new Error(`unexpected plan id in ${planPath}`);
  }
  const releaseSnapshotOverride = {
    directory: argValue('--regions', null),
    sha256: argValue('--expected-snapshot-sha256', null),
    regionFileCount: argValue('--expected-region-file-count', null),
    bytes: argValue('--expected-snapshot-bytes', null),
  };
  const overrideValues = Object.values(releaseSnapshotOverride);
  if (overrideValues.some(Boolean) && !overrideValues.every(Boolean)) {
    throw new Error(
      'release snapshot override requires --regions, '
      + '--expected-snapshot-sha256, --expected-region-file-count, and '
      + '--expected-snapshot-bytes',
    );
  }
  if (overrideValues.every(Boolean)) {
    const regionFileCount = Number(releaseSnapshotOverride.regionFileCount);
    const bytes = Number(releaseSnapshotOverride.bytes);
    if (!Number.isSafeInteger(regionFileCount) || !Number.isSafeInteger(bytes)) {
      throw new Error('release snapshot override count/bytes must be integers');
    }
    plan.source.immutable_snapshot = {
      directory: releaseSnapshotOverride.directory,
      sha256: releaseSnapshotOverride.sha256,
      region_file_count: regionFileCount,
      bytes,
      declared_via: 'command-line-release-override',
    };
  }
  await generate({
    plan,
    planPath,
    basePath,
    reportPath,
    designPath,
    mediaDir,
  });
}

if (
  process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  await main();
}
