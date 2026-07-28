#!/usr/bin/env node
/**
 * Read-only Ravensreach -> MainStreet citizen commute survey.
 *
 * This script reads immutable Anvil snapshots, the accepted world-feature
 * catalog, and local protection/config files. It never connects to Minecraft
 * and never writes config.yml, SQLite, services, or Anvil data.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  DetailedAnvilSnapshot,
  baseBlockName,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const { createCanvas, loadImage } = require('canvas');
const yaml = require('js-yaml');

const ROOT = process.cwd();
const ACCEPTED_REGIONS = path.resolve(
  ROOT,
  process.env.CITIZEN_ROUTE_ACCEPTED_REGIONS
    ?? 'data/worldsnap-town-expansion-postrelease-fullsource-20260728T1601Z/region',
);
const COMPARISON_REGIONS = path.resolve(
  ROOT,
  process.env.CITIZEN_ROUTE_COMPARISON_REGIONS
    ?? 'data/worldsnap-town-expansion-full-rollback-recovered-20260728T153226Z/region',
);
const OUTPUT = path.join(
  ROOT,
  process.env.CITIZEN_ROUTE_OUTPUT
    ?? 'data/world-review/citizen-ravensreach-mainstreet-route-survey-2026-07-28.json',
);
const PATCH_OUTPUT = path.join(
  ROOT,
  process.env.CITIZEN_ROUTE_PATCH_OUTPUT
    ?? 'data/world-review/citizen-ravensreach-mainstreet-config-patch-proposal-2026-07-28.json',
);
const MAP_OUTPUT = path.join(
  ROOT,
  process.env.CITIZEN_ROUTE_MAP_OUTPUT
    ?? 'data/world-review/citizen-ravensreach-mainstreet-route-map-2026-07-28.png',
);
const MEDIA_MANIFEST_PATH = path.join(
  ROOT,
  'data/exports/town-expansion-media-2026-07-28/capture-manifest.json',
);
const CONFIG_PATH = path.join(ROOT, 'config.yml');
const WORLD_DATABASE_PATH = path.join(ROOT, 'data/world-map.db');
const ZONES_PATH = path.join(ROOT, 'data/zones.json');

const ROUTE_ID = 'RR-MSA-CITIZEN-COMMUTE-01';
const TOWN_ID = 'town_mrzgshth_9d12c17d';
const TUBE_HALF_WIDTH = 3;
const MOBILITY_WIDTH = 3;
const DESTINATION = {
  name: 'mainstreet-rear-staff-staging',
  x: -82,
  z: 85,
  radius: 8,
};

// Town Expansion replaced the former diagonal civic-block crossing between
// z=-317 and z=-249. These post-release keyframes follow the new east perimeter
// and service-road surface instead. They were derived by a full bounded search
// against the immutable post-release snapshot, then split into short goals so
// the production walkTo helper never receives a long or ambiguous diagonal.
const ANCHORS = [
  [-111, 69, -332],
  [-111, 69, -322],
  [-106, 69, -317],
  [-98, 70, -315],
  [-92, 70, -311],
  [-82, 71, -311],
  [-72, 71, -311],
  [-63, 71, -310],
  [-57, 70, -310],
  [-57, 70, -306],
  [-57, 66, -296],
  [-57, 65, -286],
  [-57, 65, -276],
  [-57, 65, -266],
  [-57, 65, -256],
  [-57, 65, -246],
  [-57, 65, -236],
  [-57, 65, -232],
  [-63, 65, -232],
  [-69, 65, -228],
  [-75, 65, -224],
  [-80, 65, -219],
  [-81, 65, -219],
  [-82, 65, -219],
  // Bound the 304-block straight service-road leg to the production walkTo
  // helper's 30-second action window. These are checkpoints on the same
  // accepted exact path, not a route change.
  [-82, 65, -119],
  [-82, 65, -19],
  // The natural grade rises eight blocks around z=0. A straight x=-82
  // path is block-valid but makes Mineflayer attempt consecutive full-block
  // jumps and stall at z=-2. These exact surface-contour doglegs insert one
  // flat cardinal step between rises; they stay within one block of the road
  // centerline and require no terrain edits.
  [-82, 65, -8],
  [-81, 66, -7],
  [-82, 67, -6],
  [-81, 68, -5],
  [-82, 69, -4],
  [-81, 70, -3],
  [-82, 71, -2],
  // The west shoulder provides a symmetric staircase over the crown. Every
  // one-block transition below was exercised through the production move
  // helper in both directions; the straight centerline is only asymmetric in
  // Mineflayer's collision model.
  [-83, 72, -1],
  [-83, 73, 0],
  [-83, 72, 1],
  [-83, 71, 2],
  [-82, 70, 3],
  [-82, 69, 4],
  [-82, 68, 5],
  [-82, 68, 10],
  [-82, 69, 11],
  // South of the crown, the natural grade rolls between y68-y72.
  [-82, 70, 20],
  [-82, 71, 45],
  [-82, 70, 60],
  [-82, 70, 75],
  [-82, 65, 81],
  [-82, 65, 85],
  [-82, 65, 90],
];

const SUPERSEDED_CIVIC_BLOCK_ANCHORS = [
  [-110, 69, -317],
  [-94, 69, -305],
  [-74, 69, -294],
  [-63, 69, -279],
  [-63, 69, -261],
  [-81, 69, -249],
  [-81, 65, -219],
];

const AIR = new Set([
  'minecraft:air',
  'minecraft:cave_air',
  'minecraft:void_air',
]);
const FLUID = new Set([
  'minecraft:water',
  'minecraft:bubble_column',
  'minecraft:lava',
]);
const DEADLY = new Set([
  'minecraft:fire',
  'minecraft:soul_fire',
  'minecraft:cactus',
  'minecraft:magma_block',
  'minecraft:sweet_berry_bush',
  'minecraft:powder_snow',
  'minecraft:wither_rose',
]);
const GRAVITY = new Set([
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:short_grass',
  'minecraft:tall_grass',
  'minecraft:fern',
  'minecraft:large_fern',
  'minecraft:dead_bush',
  'minecraft:snow',
  'minecraft:tripwire',
  'minecraft:redstone_wire',
  'minecraft:light',
]);
const PASSABLE_SUFFIXES = [
  '_flower',
  '_sapling',
  '_torch',
  '_wall_torch',
  '_sign',
  '_wall_sign',
  '_hanging_sign',
  '_wall_hanging_sign',
  '_banner',
  '_wall_banner',
  '_button',
  '_pressure_plate',
  '_rail',
  '_carpet',
];

function relative(filename) {
  return path.relative(ROOT, filename);
}

function coordinateKey(point) {
  return point.join(',');
}

function parseProperties(state) {
  const source = String(state ?? '');
  const start = source.indexOf('[');
  if (start < 0 || !source.endsWith(']')) return {};
  return Object.fromEntries(source.slice(start + 1, -1).split(',')
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf('=');
      return separator < 0
        ? [entry, '']
        : [entry.slice(0, separator), entry.slice(separator + 1)];
    }));
}

function isPassable(state) {
  const name = baseBlockName(state ?? '');
  const properties = parseProperties(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name)) return true;
  if (FLUID.has(name) || DEADLY.has(name)) return false;
  if (PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) {
    return properties.open === 'true';
  }
  if (name.endsWith('_trapdoor')) return properties.open === 'true';
  return false;
}

function isSafeFooting(state) {
  const name = baseBlockName(state ?? '');
  if (AIR.has(name) || FLUID.has(name) || DEADLY.has(name) || isPassable(state)) {
    return false;
  }
  if (
    name.endsWith('_fence')
    || name.endsWith('_wall')
    || name.endsWith('_pane')
    || name.endsWith('_leaves')
    || name.endsWith('_chain')
    || name.endsWith('_lantern')
  ) {
    return false;
  }
  return true;
}

function distanceToSegment2d(point, start, end) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const denominator = dx * dx + dz * dz;
  if (denominator === 0) {
    return Math.hypot(point[0] - start[0], point[2] - start[2]);
  }
  const projected = Math.max(0, Math.min(
    1,
    ((point[0] - start[0]) * dx + (point[2] - start[2]) * dz) / denominator,
  ));
  return Math.hypot(
    point[0] - (start[0] + projected * dx),
    point[2] - (start[2] + projected * dz),
  );
}

function distanceToPath2d(point, pathPoints) {
  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < pathPoints.length; index += 1) {
    best = Math.min(
      best,
      distanceToSegment2d(
        [point[0], 0, point[2]],
        pathPoints[index - 1],
        pathPoints[index],
      ),
    );
  }
  return best;
}

class MinHeap {
  constructor() {
    this.values = [];
  }

  push(value) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].priority <= value.priority) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    if (this.values.length === 0) return null;
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length === 0) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      if (left >= this.values.length) break;
      const child = right < this.values.length
        && this.values[right].priority < this.values[left].priority
        ? right
        : left;
      if (this.values[child].priority >= last.priority) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}

class RouteSnapshot {
  constructor(directory) {
    this.directory = directory;
    this.snapshot = new DetailedAnvilSnapshot(directory);
    this.blockCache = new Map();
    this.standableCache = new Map();
  }

  async block(point) {
    const key = coordinateKey(point);
    if (!this.blockCache.has(key)) {
      this.blockCache.set(
        key,
        await this.snapshot.getBlock(point[0], point[1], point[2]),
      );
    }
    return this.blockCache.get(key);
  }

  async standable(point) {
    const key = coordinateKey(point);
    if (!this.standableCache.has(key)) {
      const feet = await this.block(point);
      const head = await this.block([point[0], point[1] + 1, point[2]]);
      const support = await this.block([point[0], point[1] - 1, point[2]]);
      this.standableCache.set(
        key,
        isPassable(feet) && isPassable(head) && isSafeFooting(support),
      );
    }
    return this.standableCache.get(key);
  }

  async neighbors(point, start, end) {
    const output = [];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (const dy of [0, 1, -1]) {
        const candidate = [point[0] + dx, point[1] + dy, point[2] + dz];
        if (candidate[1] < 40 || candidate[1] > 100) continue;
        if (distanceToSegment2d(candidate, start, end) > TUBE_HALF_WIDTH) continue;
        if (await this.standable(candidate)) {
          output.push(candidate);
        }
      }
    }
    return output;
  }

  async lateralWidth(point, dx, dz) {
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];
    let width = 1;
    for (const offset of [-1, 1]) {
      const x = point[0] + lateral[0] * offset;
      const z = point[2] + lateral[1] * offset;
      for (const dy of [0, 1, -1]) {
        if (await this.standable([x, point[1] + dy, z])) {
          width += 1;
          break;
        }
      }
    }
    return width;
  }
}

function heuristic(point, goal) {
  return Math.abs(point[0] - goal[0])
    + Math.abs(point[1] - goal[1])
    + Math.abs(point[2] - goal[2]);
}

function supportPreference(state) {
  const name = baseBlockName(state ?? '');
  if (
    name.includes('concrete')
    || name.includes('andesite')
    || name.includes('stone_brick')
    || name === 'minecraft:smooth_stone'
    || name === 'minecraft:dirt_path'
  ) return 0;
  if (name === 'minecraft:grass_block') return 0.15;
  if (name === 'minecraft:dirt' || name === 'minecraft:stone') return 0.35;
  return 0.7;
}

async function findPath(routeSnapshot, start, goal) {
  if (!(await routeSnapshot.standable(start))) {
    return { passed: false, reason: 'START_NOT_STANDABLE', start, goal };
  }
  if (!(await routeSnapshot.standable(goal))) {
    return { passed: false, reason: 'GOAL_NOT_STANDABLE', start, goal };
  }

  const queue = new MinHeap();
  const startKey = coordinateKey(start);
  const goalKey = coordinateKey(goal);
  const costs = new Map([[startKey, 0]]);
  const parents = new Map();
  const points = new Map([[startKey, start]]);
  queue.push({ key: startKey, point: start, priority: heuristic(start, goal) });
  let expanded = 0;

  while (queue.values.length > 0 && expanded < 100_000) {
    const current = queue.pop();
    if (current.key === goalKey) {
      const route = [];
      let cursor = goalKey;
      while (cursor) {
        route.push(points.get(cursor));
        cursor = parents.get(cursor);
      }
      route.reverse();
      return {
        passed: true,
        start,
        goal,
        expanded,
        cellCount: route.length,
        maximumStep: route.slice(1).reduce(
          (maximum, point, index) => Math.max(
            maximum,
            Math.abs(point[1] - route[index][1]),
          ),
          0,
        ),
        exactPath: route,
      };
    }
    const currentCost = costs.get(current.key);
    expanded += 1;
    for (const candidate of await routeSnapshot.neighbors(
      current.point,
      start,
      goal,
    )) {
      const candidateKey = coordinateKey(candidate);
      const support = await routeSnapshot.block([
        candidate[0],
        candidate[1] - 1,
        candidate[2],
      ]);
      const nextCost = currentCost
        + 1
        + Math.abs(candidate[1] - current.point[1]) * 0.08
        + supportPreference(support)
        + Math.max(
          0,
          MOBILITY_WIDTH - await routeSnapshot.lateralWidth(
            candidate,
            candidate[0] - current.point[0],
            candidate[2] - current.point[2],
          ),
        ) * 3;
      if (nextCost >= (costs.get(candidateKey) ?? Number.POSITIVE_INFINITY)) {
        continue;
      }
      costs.set(candidateKey, nextCost);
      parents.set(candidateKey, current.key);
      points.set(candidateKey, candidate);
      queue.push({
        key: candidateKey,
        point: candidate,
        priority: nextCost + heuristic(candidate, goal),
      });
    }
  }
  return {
    passed: false,
    reason: expanded >= 100_000 ? 'SEARCH_BUDGET_EXHAUSTED' : 'NO_PATH',
    start,
    goal,
    expanded,
  };
}

function sha256Json(value) {
  return crypto.createHash('sha256')
    .update(JSON.stringify(value))
    .digest('hex');
}

function appendPaths(paths) {
  const output = [];
  for (const current of paths) {
    for (const point of current) {
      if (coordinateKey(output.at(-1) ?? []) !== coordinateKey(point)) {
        output.push(point);
      }
    }
  }
  return output;
}

function pointInsideBox(point, box) {
  return point[0] >= Number(box.minX)
    && point[0] <= Number(box.maxX)
    && point[1] >= Number(box.minY ?? -64)
    && point[1] <= Number(box.maxY ?? 319)
    && point[2] >= Number(box.minZ)
    && point[2] <= Number(box.maxZ);
}

function pointInsideBounds2d(point, object) {
  return point[0] >= Number(object.min_x)
    && point[0] <= Number(object.max_x)
    && point[2] >= Number(object.min_z)
    && point[2] <= Number(object.max_z);
}

function readFeatureIntersections(exactPath) {
  const database = new Database(WORLD_DATABASE_PATH, {
    readonly: true,
    fileMustExist: true,
  });
  try {
    const features = database.prepare(`
      SELECT id, project_id, external_id, name, kind, status,
             min_x, max_x, min_z, max_z
      FROM world_features
      WHERE status = 'complete'
        AND max_x >= -120 AND min_x <= -55
        AND max_z >= -340 AND min_z <= 100
      ORDER BY kind, external_id
    `).all();
    return features
      .map((feature) => ({
        ...feature,
        exactPathCellCount: exactPath.filter(
          (point) => pointInsideBounds2d(point, feature),
        ).length,
      }))
      .filter((feature) => feature.exactPathCellCount > 0);
  } finally {
    database.close();
  }
}

async function hazardAudit(routeSnapshot, exactPath, corridorRadius = 2) {
  const pathCells = new Set(exactPath.map(coordinateKey));
  const haloCells = new Set();
  for (const point of exactPath) {
    for (let dx = -corridorRadius; dx <= corridorRadius; dx += 1) {
      for (let dz = -corridorRadius; dz <= corridorRadius; dz += 1) {
        for (let dy = -1; dy <= 2; dy += 1) {
          haloCells.add(coordinateKey([
            point[0] + dx,
            point[1] + dy,
            point[2] + dz,
          ]));
        }
      }
    }
  }

  const exactHazards = [];
  const haloHazards = [];
  const gravitySupports = [];
  for (const key of haloCells) {
    const point = key.split(',').map(Number);
    const state = await routeSnapshot.block(point);
    const name = baseBlockName(state ?? '');
    if (FLUID.has(name) || DEADLY.has(name)) {
      const row = { point, state };
      if (pathCells.has(key)) exactHazards.push(row);
      else if (haloHazards.length < 200) haloHazards.push(row);
    }
  }
  for (const point of exactPath) {
    const supportPoint = [point[0], point[1] - 1, point[2]];
    const state = await routeSnapshot.block(supportPoint);
    if (GRAVITY.has(baseBlockName(state ?? ''))) {
      gravitySupports.push({ point: supportPoint, state });
    }
  }

  const minX = Math.min(...exactPath.map((point) => point[0])) - corridorRadius;
  const maxX = Math.max(...exactPath.map((point) => point[0])) + corridorRadius;
  const minY = Math.min(...exactPath.map((point) => point[1])) - 2;
  const maxY = Math.max(...exactPath.map((point) => point[1])) + 3;
  const minZ = Math.min(...exactPath.map((point) => point[2])) - corridorRadius;
  const maxZ = Math.max(...exactPath.map((point) => point[2])) + corridorRadius;
  const blockEntities = await routeSnapshot.snapshot.blockEntitiesInBox([
    minX,
    minY,
    minZ,
    maxX,
    maxY,
    maxZ,
  ]);
  const nearbyBlockEntities = blockEntities
    .filter((entity) => distanceToPath2d(
      [Number(entity.x), Number(entity.y), Number(entity.z)],
      exactPath,
    ) <= corridorRadius)
    .map((entity) => ({
      id: entity.id ?? entity.Id ?? 'unknown',
      x: Number(entity.x),
      y: Number(entity.y),
      z: Number(entity.z),
    }));

  return {
    exactPathHazards: exactHazards,
    haloHazards,
    haloHazardCount: haloHazards.length,
    haloHazardListTruncated: haloHazards.length >= 200,
    gravitySupports,
    nearbyBlockEntities,
  };
}

async function physicalWidthAudit(routeSnapshot, exactPath) {
  const rows = [];
  for (let index = 0; index < exactPath.length; index += 1) {
    const point = exactPath[index];
    const previous = exactPath[Math.max(0, index - 1)];
    const next = exactPath[Math.min(exactPath.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dz = next[2] - previous[2];
    const lateral = Math.abs(dx) >= Math.abs(dz) ? [0, 1] : [1, 0];
    const clearOffsets = [];
    for (let offset = -2; offset <= 2; offset += 1) {
      const x = point[0] + lateral[0] * offset;
      const z = point[2] + lateral[1] * offset;
      let standable = false;
      for (const dy of [0, 1, -1]) {
        if (await routeSnapshot.standable([x, point[1] + dy, z])) {
          standable = true;
          break;
        }
      }
      if (standable) clearOffsets.push(offset);
    }
    let contiguous = 1;
    for (let offset = -1; clearOffsets.includes(offset); offset -= 1) {
      contiguous += 1;
    }
    for (let offset = 1; clearOffsets.includes(offset); offset += 1) {
      contiguous += 1;
    }
    rows.push({ point, contiguousWidth: contiguous });
  }
  const minimum = Math.min(...rows.map((row) => row.contiguousWidth));
  return {
    testedCrossSectionCells: 5,
    minimumContiguousStandableWidth: minimum,
    belowThreeWide: rows.filter((row) => row.contiguousWidth < 3).slice(0, 100),
    belowFiveWide: rows.filter((row) => row.contiguousWidth < 5).slice(0, 100),
    belowThreeWideCount: rows.filter((row) => row.contiguousWidth < 3).length,
    belowFiveWideCount: rows.filter((row) => row.contiguousWidth < 5).length,
  };
}

async function headroomAudit(routeSnapshot, exactPath) {
  const rows = [];
  for (const point of exactPath) {
    let clearBlocks = 0;
    for (let offset = 0; offset < 6; offset += 1) {
      if (!isPassable(await routeSnapshot.block([
        point[0],
        point[1] + offset,
        point[2],
      ]))) break;
      clearBlocks += 1;
    }
    rows.push({ point, clearBlocks });
  }
  const minimum = Math.min(...rows.map((row) => row.clearBlocks));
  return {
    testedVerticalCells: 6,
    requiredClearBlocks: 2,
    minimumClearBlocks: minimum,
    exactlyTwoClearCount: rows.filter((row) => row.clearBlocks === 2).length,
    belowRequired: rows.filter((row) => row.clearBlocks < 2),
  };
}

async function surveySegments(routeSnapshot, anchors) {
  const forwardSegments = [];
  const reverseSegments = [];
  for (let index = 1; index < anchors.length; index += 1) {
    const start = anchors[index - 1];
    const goal = anchors[index];
    forwardSegments.push(await findPath(routeSnapshot, start, goal));
    reverseSegments.push(await findPath(routeSnapshot, goal, start));
  }
  return { forwardSegments, reverseSegments };
}

async function checkpointEvidence(routeSnapshot, anchors) {
  const output = [];
  for (const point of anchors) {
    output.push({
      point,
      standable: await routeSnapshot.standable(point),
      feet: await routeSnapshot.block(point),
      head: await routeSnapshot.block([point[0], point[1] + 1, point[2]]),
      support: await routeSnapshot.block([point[0], point[1] - 1, point[2]]),
    });
  }
  return output;
}

async function surveySnapshot(directory, diagnoseSuperseded = false) {
  const routeSnapshot = new RouteSnapshot(directory);
  const { forwardSegments, reverseSegments } = await surveySegments(
    routeSnapshot,
    ANCHORS,
  );
  const passed = forwardSegments.every((segment) => segment.passed)
    && reverseSegments.every((segment) => segment.passed);
  const exactPath = passed
    ? appendPaths(forwardSegments.map((segment) => segment.exactPath))
    : [];
  const hazards = passed
    ? await hazardAudit(routeSnapshot, exactPath)
    : null;
  const physicalWidth = passed
    ? await physicalWidthAudit(routeSnapshot, exactPath)
    : null;
  const headroom = passed ? await headroomAudit(routeSnapshot, exactPath) : null;
  let supersededRouteDiagnosis = null;
  if (diagnoseSuperseded) {
    const superseded = await surveySegments(
      routeSnapshot,
      SUPERSEDED_CIVIC_BLOCK_ANCHORS,
    );
    const failures = [
      ...superseded.forwardSegments,
      ...superseded.reverseSegments,
    ].filter((segment) => !segment.passed);
    supersededRouteDiagnosis = {
      status: failures.length === 12
        ? 'CONFIRMED_12_DIRECTIONAL_FAILURES'
        : 'FAILURE_COUNT_DRIFT',
      reason: 'Town Expansion occupied or changed the feet elevation at former civic-block checkpoints.',
      anchors: SUPERSEDED_CIVIC_BLOCK_ANCHORS,
      checkpointEvidence: await checkpointEvidence(
        routeSnapshot,
        SUPERSEDED_CIVIC_BLOCK_ANCHORS,
      ),
      forwardSegments: superseded.forwardSegments,
      reverseSegments: superseded.reverseSegments,
      failureCount: failures.length,
      failedSegments: failures,
    };
  }
  return {
    snapshot: {
      directory: relative(directory),
      ...hashSnapshotDirectory(directory),
    },
    status: passed ? 'PASS_OFFLINE_NORMAL_WALK' : 'FAIL_OFFLINE_NORMAL_WALK',
    movementModel: {
      bodyClearanceBlocks: 2,
      cardinalMovementOnly: true,
      maximumAdjacentStep: 1,
      swimming: false,
      parkour: false,
      digging: false,
      towering: false,
      closedDoorsAndGates: false,
      segmentTubeHalfWidth: TUBE_HALF_WIDTH,
    },
    anchors: ANCHORS,
    forwardSegments,
    reverseSegments,
    exactPath,
    exactPathSha256: sha256Json(exactPath),
    exactPathCellCount: exactPath.length,
    // These are the reviewed goal checkpoints used by citizen routines. The
    // complete exact walk trace remains in exactPath; feeding every grade cell
    // to pathfinder would create needless goal churn.
    routineWaypoints: passed ? ANCHORS : [],
    hazards,
    physicalWidth,
    headroom,
    supersededRouteDiagnosis,
  };
}

function protectionAudit(exactPath, config) {
  const mining = (config.mining?.protectedZones ?? [])
    .map((zone) => ({
      name: zone.name,
      exactPathCellCount: exactPath.filter(
        (point) => pointInsideBox(point, zone),
      ).length,
    }))
    .filter((zone) => zone.exactPathCellCount > 0);
  const controlZones = JSON.parse(fs.readFileSync(ZONES_PATH, 'utf8'))
    .filter((zone) => zone.shape === 'rectangle')
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      mode: zone.mode,
      exactPathCellCount: exactPath.filter((point) => (
        point[0] >= zone.rectangle.minX
        && point[0] <= zone.rectangle.maxX
        && point[2] >= zone.rectangle.minZ
        && point[2] <= zone.rectangle.maxZ
      )).length,
    }))
    .filter((zone) => zone.exactPathCellCount > 0);
  const features = readFeatureIntersections(exactPath);
  return {
    miningProtectedZoneIntersections: mining,
    controlZoneIntersections: controlZones,
    acceptedFeatureIntersections: features,
    buildingIntersections: features.filter(
      (feature) => feature.kind === 'building',
    ),
    movementOnly: true,
    buildOrMiningAuthorizationGranted: false,
  };
}

function buildPatchProposal(acceptedSurvey) {
  const roles = [
    ['builder', 'Inspect MainStreet façades, road edges, doors, and lighting without placing or breaking blocks.'],
    ['miner', 'Inspect MainStreet service-road condition and material stockpile access without mining or moving inventory.'],
    ['lumberjack', 'Inspect MainStreet street trees, planted edges, and woodwork condition without harvesting.'],
    ['farmer', 'Inspect MainStreet landscape beds and staff food-service support without harvesting or planting.'],
    ['guard', 'Walk the reviewed commute and patrol the rear staff staging area without leaving the corridor.'],
  ];
  const routeWaypoints = acceptedSurvey.routineWaypoints.map(
    ([x, y, z]) => ({ x, y, z }),
  );
  const corridorWaypoints = routeWaypoints
    .map(({ x, z }) => ({ x, z }))
    .filter((point, index, values) => (
      index === 0
      || point.x !== values[index - 1].x
      || point.z !== values[index - 1].z
    ));
  const sharedMobility = {
    destinations: [DESTINATION],
    corridors: [{
      name: 'ravensreach-mainstreet-reviewed-commute',
      width: MOBILITY_WIDTH,
      waypoints: corridorWaypoints,
    }],
  };
  const botNames = ['Architect', 'Mason', 'Scott', 'Steward', 'Surveyor'];
  return {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    proposalId: 'CITIZEN-CROSS-CITY-PATCH-2026-07-28-01',
    status: 'PROPOSED_NOT_APPLIED',
    sourceSurvey: {
      file: relative(OUTPUT),
      acceptedSnapshotSha256: acceptedSurvey.snapshot.sha256,
      exactPathSha256: acceptedSurvey.exactPathSha256,
    },
    activationGates: [
      'Take a fresh same-moment immutable saved-world snapshot.',
      'Re-run this survey against that snapshot and require all forward/reverse segments PASS.',
      'Run one no-dig/no-tower temporary walker in both directions after coordinated service rollout.',
      `Stagger citizen departures until live acceptance confirms the offline route's ${acceptedSurvey.physicalWidth.belowThreeWideCount} sub-three-wide choke cross-sections (minimum ${acceptedSurvey.physicalWidth.minimumContiguousStandableWidth} block).`,
      'Keep every shift non-destructive until an explicit worksite contract exists.',
      'Do not label the natural-terrain endpoint an employee lounge until the lounge is built and post-verified.',
    ],
    configYmlMergeProposal: {
      leash: botNames.map((botName) => ({
        botName,
        x: -85,
        z: -370,
        radius: 50,
        caretaker: false,
        ...sharedMobility,
      })),
    },
    townConfigJsonMergeProposal: {
      townId: TOWN_ID,
      citizenRoutine: {
        shifts: roles.map(([role, activity]) => ({
          id: `mainstreet-day-shift-${role}`,
          destination: DESTINATION.name,
          role,
          phase: 'day',
          activity,
          waypoints: routeWaypoints,
          nonDestructive: true,
        })),
      },
    },
    returnRoute: {
      method: 'reverse the exact ordered waypoint list',
      waypoints: [...routeWaypoints].reverse(),
    },
    intentionallyNotIncluded: [
      'live config write',
      'town.db write',
      'service restart',
      'Minecraft movement command',
      'Minecraft block operation',
      'employee-lounge as-built claim',
    ],
  };
}

async function renderRouteMap(report) {
  const manifest = JSON.parse(fs.readFileSync(MEDIA_MANIFEST_PATH, 'utf8'));
  const source = manifest.cameras.find(
    (entry) => entry.id === 'MAP-WHOLE-WORLD-OVERVIEW-PASS-1',
  );
  if (!source) {
    throw new Error('Town Expansion post-release overview camera is missing');
  }
  const sourceFile = path.join(
    ROOT,
    'data/exports/town-expansion-media-2026-07-28',
    source.output,
  );
  if (!fs.existsSync(sourceFile)) {
    throw new Error('Town Expansion post-release overview map has not been rendered');
  }
  const sourceBytes = fs.readFileSync(sourceFile);
  const sourceSha256 = crypto.createHash('sha256').update(sourceBytes).digest('hex');
  const image = await loadImage(sourceFile);
  const crop = {
    minX: -180,
    maxX: 40,
    minZ: -380,
    maxZ: 130,
  };
  const sourceScale = Number(source.width) / Number(source.span);
  const sourceBounds = {
    minX: Number(source.center[0]) - Number(source.span) / 2,
    minZ: Number(source.center[1]) - Number(source.span) / 2,
  };
  const sourceX = (crop.minX - sourceBounds.minX) * sourceScale;
  const sourceY = (crop.minZ - sourceBounds.minZ) * sourceScale;
  const sourceWidth = (crop.maxX - crop.minX + 1) * sourceScale;
  const sourceHeight = (crop.maxZ - crop.minZ + 1) * sourceScale;
  const outputScale = 4;
  const headerHeight = 104;
  const canvas = createCanvas(
    (crop.maxX - crop.minX + 1) * outputScale,
    (crop.maxZ - crop.minZ + 1) * outputScale + headerHeight,
  );
  const context = canvas.getContext('2d');
  context.fillStyle = '#08111f';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    headerHeight,
    canvas.width,
    canvas.height - headerHeight,
  );

  const toPixel = ([x, , z]) => [
    (x - crop.minX) * outputScale + outputScale / 2,
    headerHeight + (z - crop.minZ) * outputScale + outputScale / 2,
  ];
  const exactPath = report.accepted.exactPath;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = '#32e6ff';
  context.lineWidth = 6;
  context.beginPath();
  exactPath.forEach((point, index) => {
    const [x, y] = toPixel(point);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();

  context.fillStyle = '#ffe066';
  context.strokeStyle = '#101820';
  context.lineWidth = 2;
  report.accepted.routineWaypoints.forEach((point, index) => {
    const [x, y] = toPixel(point);
    context.beginPath();
    context.arc(
      x,
      y,
      index === 0 || index === report.accepted.routineWaypoints.length - 1 ? 8 : 5,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.stroke();
  });

  context.fillStyle = '#ff5c5c';
  for (const row of report.accepted.physicalWidth?.belowThreeWide ?? []) {
    const [x, y] = toPixel(row.point);
    context.fillRect(x - 5, y - 5, 10, 10);
  }

  const destinationCenter = toPixel([-82, 0, 85]);
  context.strokeStyle = '#5df28c';
  context.lineWidth = 3;
  context.beginPath();
  context.arc(
    destinationCenter[0],
    destinationCenter[1],
    DESTINATION.radius * outputScale,
    0,
    Math.PI * 2,
  );
  context.stroke();

  const loungeA = toPixel([-94, 0, 90]);
  const loungeB = toPixel([-73, 0, 121]);
  context.strokeStyle = '#d7a7ff';
  context.lineWidth = 3;
  context.setLineDash([10, 8]);
  context.strokeRect(
    loungeA[0] - outputScale / 2,
    loungeA[1] - outputScale / 2,
    loungeB[0] - loungeA[0] + outputScale,
    loungeB[1] - loungeA[1] + outputScale,
  );
  context.setLineDash([]);

  context.fillStyle = 'rgba(8,17,31,0.93)';
  context.fillRect(0, 0, canvas.width, headerHeight);
  context.fillStyle = '#f3f7ff';
  context.font = 'bold 26px sans-serif';
  context.fillText('Ravensreach → MainStreet citizen commute', 20, 34);
  context.font = '16px sans-serif';
  context.fillText(
    'cyan exact walk · yellow checkpoints · red two-wide choke · green destination · purple planned lounge',
    20,
    62,
  );
  context.fillStyle = '#a9b8d0';
  context.fillText(
    `offline accepted snapshot ${report.accepted.snapshot.sha256.slice(0, 16)}… · north is up`,
    20,
    87,
  );

  context.fillStyle = 'rgba(8,17,31,0.82)';
  context.fillRect(14, headerHeight + 14, 182, 78);
  context.fillStyle = '#ffffff';
  context.font = 'bold 16px sans-serif';
  context.fillText('RAVENSREACH', 24, headerHeight + 38);
  context.font = '14px sans-serif';
  context.fillText('origin (-111,69,-332)', 24, headerHeight + 62);
  context.fillText(
    report.accepted.exactPathCellCount > 0
      ? `${report.accepted.exactPathCellCount} exact walk cells`
      : 'no complete route found',
    24,
    headerHeight + 82,
  );

  const destinationLabelY = destinationCenter[1] - 84;
  context.fillStyle = 'rgba(8,17,31,0.82)';
  context.fillRect(destinationCenter[0] + 30, destinationLabelY, 264, 76);
  context.fillStyle = '#ffffff';
  context.font = 'bold 16px sans-serif';
  context.fillText(
    'MAINSTREET REAR STAFF STAGING',
    destinationCenter[0] + 40,
    destinationLabelY + 26,
  );
  context.font = '14px sans-serif';
  context.fillText(
    'lounge is planned, not as-built',
    destinationCenter[0] + 40,
    destinationLabelY + 50,
  );

  fs.writeFileSync(MAP_OUTPUT, canvas.toBuffer('image/png'));
  return {
    file: relative(MAP_OUTPUT),
    bytes: fs.statSync(MAP_OUTPUT).size,
    sha256: crypto.createHash('sha256')
      .update(fs.readFileSync(MAP_OUTPUT))
      .digest('hex'),
    width: canvas.width,
    height: canvas.height,
    sourceAtlas: {
      file: relative(sourceFile),
      sha256: sourceSha256,
      captureId: source.id,
      sourceSnapshotSha256:
        manifest.postreleaseSnapshot?.sha256 ?? null,
      routeOverlaySnapshotSha256: report.accepted.snapshot.sha256,
      sourceAtlasMatchesRouteOverlaySnapshot:
        manifest.postreleaseSnapshot?.sha256
          === report.accepted.snapshot.sha256,
      provenanceNote:
        'The exact route overlay is computed from the accepted snapshot. '
        + 'The background atlas retains its own earlier immutable snapshot '
        + 'identity and is illustrative context only.',
    },
    crop,
  };
}

async function main() {
  for (const directory of [ACCEPTED_REGIONS, COMPARISON_REGIONS]) {
    if (!fs.existsSync(directory)) {
      throw new Error(`immutable snapshot directory not found: ${directory}`);
    }
  }
  const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const accepted = await surveySnapshot(ACCEPTED_REGIONS, true);
  const comparison = await surveySnapshot(COMPARISON_REGIONS);
  const protection = accepted.exactPath.length
    ? protectionAudit(accepted.exactPath, config)
    : null;
  const snapshotsAgree = accepted.status === comparison.status
    && accepted.exactPathSha256 === comparison.exactPathSha256;
  const currentRoutePasses = accepted.status === 'PASS_OFFLINE_NORMAL_WALK'
    && accepted.hazards.exactPathHazards.length === 0
    && accepted.hazards.gravitySupports.length === 0
    && accepted.hazards.nearbyBlockEntities.length === 0
    && accepted.headroom.minimumClearBlocks >= 2
    && accepted.supersededRouteDiagnosis.status
      === 'CONFIRMED_12_DIRECTIONAL_FAILURES'
    && protection.buildingIntersections.length === 0
    && protection.miningProtectedZoneIntersections.length === 0;
  const report = {
    schemaVersion: 1,
    generatedAtUtc: new Date().toISOString(),
    surveyId: 'CITIZEN-RR-MSA-ROUTE-SURVEY-2026-07-28-01',
    routeId: ROUTE_ID,
    state: currentRoutePasses
      ? 'PASS_OFFLINE_EXISTING_SURFACE_ROUTE'
      : 'BLOCKED_OR_REQUIRES_BUILD_SCHEDULE',
    status: currentRoutePasses ? 'PASS' : 'FAIL',
    acceptanceClass: currentRoutePasses
      ? 'OFFLINE_ROUTE_ONLY_LIVE_GATES_PENDING'
      : 'BLOCKED',
    acceptedPostSnapshotSha256: accepted.snapshot.sha256,
    exactPathCellCount: accepted.exactPathCellCount,
    exactPathSha256: accepted.exactPathSha256,
    sourceBoundary: {
      offlineOnly: true,
      liveWorldRead: false,
      liveWorldMutated: false,
      databaseMutated: false,
      configMutated: false,
      serviceRestarted: false,
    },
    routePurpose: 'non-destructive citizen commute from Ravensreach to MainStreet rear staff staging',
    destinationTruth: {
      currentDestination: DESTINATION,
      employeeLoungeStatus: 'PLANNED_NOT_AS_BUILT_IN_SURVEY_SNAPSHOTS',
      plannedLoungeBounds: [-94, 64, 90, -73, 76, 121],
      plannedPathDoor: [-82, 65, 90],
    },
    corridorPolicy: {
      mobilityHalfWidthBlocks: MOBILITY_WIDTH,
      physicalDesignTargetWidthBlocks: 5,
      searchTubeHalfWidthBlocks: TUBE_HALF_WIDTH,
    },
    accepted,
    comparison,
    snapshotsAgree,
    comparisonRole: 'DIAGNOSTIC_PRERELEASE_BASELINE_ONLY',
    protection,
    buildSchedule: currentRoutePasses
      ? {
        requiredForTemporaryCitizenCommute: false,
        note: 'The final five-block paved/lit employee greenway and lounge remain a separate town-expansion build and post-state acceptance scope.',
      }
      : {
        requiredForTemporaryCitizenCommute: true,
        status: 'MUST_BE_DERIVED_FROM_FAILED_SEGMENTS_BEFORE_ANY LIVE WORK',
      },
    releaseDecision: currentRoutePasses
      ? 'OFFLINE ROUTE PROPOSAL PASS; FRESH SAME-MOMENT AND LIVE WALK GATES STILL REQUIRED BEFORE ACTIVATION'
      : 'HOLD; DO NOT ADD CROSS-CITY SHIFTS',
  };
  report.evidenceMap = await renderRouteMap(report);
  const patchProposal = buildPatchProposal(accepted);
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(PATCH_OUTPUT, `${JSON.stringify(patchProposal, null, 2)}\n`);
  console.log(JSON.stringify({
    state: report.state,
    acceptedSnapshot: accepted.snapshot.sha256,
    comparisonSnapshot: comparison.snapshot.sha256,
    snapshotsAgree,
    exactPathCells: accepted.exactPathCellCount,
    routineWaypoints: accepted.routineWaypoints.length,
    minimumPhysicalWidth: accepted.physicalWidth?.minimumContiguousStandableWidth,
    exactPathHazards: accepted.hazards?.exactPathHazards.length,
    gravitySupports: accepted.hazards?.gravitySupports.length,
    buildingIntersections: protection?.buildingIntersections.length,
    miningProtectedZoneIntersections:
      protection?.miningProtectedZoneIntersections.length,
    report: relative(OUTPUT),
    patchProposal: relative(PATCH_OUTPUT),
    map: relative(MAP_OUTPUT),
  }, null, 2));
}

await main();
