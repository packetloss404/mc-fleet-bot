#!/usr/bin/env node
/**
 * Compile MainStreet roads R02-R07 from the authored project grid against an
 * offline Anvil snapshot.
 *
 * Safety model:
 *   - exact-material, one-block REPL operations only;
 *   - no live connection or mutation;
 *   - R01, water/lava, registered buildings, and every undeclared fence column
 *     are immutable;
 *   - terrain cuts/fills are bounded and all non-natural collisions fail closed;
 *   - the report distinguishes harmless sidewalk clipping from carriageway
 *     blockers and proves grades, connectivity, gate adjacency, and target
 *     uniqueness.
 *
 * Usage:
 *   node scripts/generate_grid_roads.mjs \
 *     [plan.yaml] [snapshot/region] [world-features.json] [output.txt]
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import yaml from 'js-yaml';

import {
  AnvilSnapshot,
  findSafeSupport,
  isAirBlock,
  isFoliageBlock,
  isReplaceableBlock,
} from './generate_picket_fence.mjs';

const planPath = process.argv[2] ?? 'mainstreet-america/planning/project-grid.yaml';
const regionDir = process.argv[3] ?? 'data/worldsnap/region';
const featurePath = process.argv[4] ?? 'mainstreet-america/integration/world-features.json';
const outputPath = process.argv[5]
  ?? 'data/buildops/mainstreet-grid-roads-2026-07-26.txt';
const reportPath = outputPath.replace(/\.txt$/, '.report.json');

const TARGET_ROAD_IDS = new Set(['R02', 'R03', 'R04', 'R05', 'R06', 'R07']);
const Y_MIN = -64;
const Y_MAX = 160;
const HEADROOM = 4;
const MAX_CUT = 10;
const MAX_FILL = 8;
const R01_PROTECTED_HALF_WIDTH = 7;
const ROAD_PALETTE = {
  carriageway: 'minecraft:gray_concrete',
  centerStripe: 'minecraft:yellow_concrete',
  flushCurb: 'minecraft:stone_bricks',
  sidewalk: 'minecraft:smooth_stone',
  crosswalk: 'minecraft:white_concrete',
  intersection: 'minecraft:polished_andesite',
  foundation: 'minecraft:stone_bricks',
  flushLight: 'minecraft:sea_lantern',
  lampPost: 'minecraft:polished_blackstone_wall',
  lampHead: 'minecraft:lantern',
};

const SAFE_NATURAL = new Set([
  'minecraft:stone',
  'minecraft:dirt',
  'minecraft:grass_block',
  'minecraft:coarse_dirt',
  'minecraft:rooted_dirt',
  'minecraft:podzol',
  'minecraft:mycelium',
  'minecraft:mud',
  'minecraft:packed_mud',
  'minecraft:mud_bricks',
  'minecraft:gravel',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:sandstone',
  'minecraft:red_sandstone',
  'minecraft:clay',
  'minecraft:granite',
  'minecraft:diorite',
  'minecraft:andesite',
  'minecraft:tuff',
  'minecraft:calcite',
  'minecraft:deepslate',
  'minecraft:cobbled_deepslate',
  'minecraft:moss_block',
  'minecraft:snow_block',
]);
const SAFE_PUBLIC_REALM = new Set([
  'minecraft:smooth_stone',
  'minecraft:smooth_stone_slab',
  'minecraft:stone_bricks',
  'minecraft:stone_brick_slab',
  'minecraft:stone_brick_stairs',
  'minecraft:polished_andesite',
  'minecraft:gray_concrete',
  'minecraft:light_gray_concrete',
  'minecraft:white_concrete',
  'minecraft:yellow_concrete',
  'minecraft:packed_mud',
  'minecraft:dirt_path',
  'minecraft:sea_lantern',
]);

function baseName(block) {
  return String(block).split('[', 1)[0];
}

function key2(x, z) {
  return `${x},${z}`;
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function floorMod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  return ordered[Math.floor(ordered.length / 2)];
}

function sha256File(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
}

function pointsOnSegment(from, to) {
  const [x1, z1] = from.map(Number);
  const [x2, z2] = to.map(Number);
  if (x1 !== x2 && z1 !== z2) {
    throw new Error(`non-orthogonal segment ${from} -> ${to}`);
  }
  const dx = Math.sign(x2 - x1);
  const dz = Math.sign(z2 - z1);
  const length = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
  return Array.from({ length: length + 1 }, (_, index) => ({
    x: x1 + dx * index,
    z: z1 + dz * index,
  }));
}

function gateContains(gate, point) {
  if (gate.axis === 'x') {
    return point.z === Number(gate.fixed)
      && point.x >= Number(gate.min)
      && point.x <= Number(gate.max);
  }
  if (gate.axis === 'z') {
    return point.x === Number(gate.fixed)
      && point.z >= Number(gate.min)
      && point.z <= Number(gate.max);
  }
  throw new Error(`${gate.id} has invalid gate axis ${gate.axis}`);
}

function isWater(block) {
  const name = baseName(block);
  return name === 'minecraft:water' || name === 'minecraft:bubble_column';
}

function isLava(block) {
  return baseName(block) === 'minecraft:lava';
}

function isSafeReplace(block) {
  const name = baseName(block);
  return isAirBlock(name)
    || isReplaceableBlock(name)
    || isFoliageBlock(name)
    || SAFE_NATURAL.has(name)
    || SAFE_PUBLIC_REALM.has(name)
    || /_ore$/.test(name);
}

function groupCounts(entries, field) {
  const grouped = {};
  for (const entry of entries) {
    const value = String(entry[field] ?? 'unknown');
    grouped[value] = (grouped[value] ?? 0) + 1;
  }
  return grouped;
}

function exactDiagnostics(entries) {
  return {
    count: entries.length,
    items: entries,
  };
}

function fillMissingRaw(values, roadId, diagnostics) {
  const result = [...values];
  const valid = result
    .map((value, index) => ({ value, index }))
    .filter((entry) => Number.isInteger(entry.value));
  if (!valid.length) throw new Error(`${roadId} has no usable terrain samples`);

  for (let index = 0; index < result.length; index += 1) {
    if (Number.isInteger(result[index])) continue;
    let before = null;
    let after = null;
    for (let left = index - 1; left >= 0; left -= 1) {
      if (Number.isInteger(result[left])) {
        before = { index: left, value: result[left] };
        break;
      }
    }
    for (let right = index + 1; right < result.length; right += 1) {
      if (Number.isInteger(result[right])) {
        after = { index: right, value: result[right] };
        break;
      }
    }
    if (before && after) {
      const progress = (index - before.index) / (after.index - before.index);
      result[index] = Math.round(before.value + (after.value - before.value) * progress);
    } else {
      result[index] = before?.value ?? after.value;
    }
    diagnostics.push({ roadId, index, inferredY: result[index] });
  }
  return result;
}

function constrainedProfile(raw, anchorEntries, roadId, errors) {
  const profile = Array(raw.length).fill(null);
  const anchors = [...new Map(
    anchorEntries
      .map((entry) => [Number(entry.index), {
        index: Number(entry.index),
        y: Number(entry.y),
        source: entry.source,
      }]),
  ).values()].sort((a, b) => a.index - b.index);

  if (!anchors.length) {
    anchors.push({ index: 0, y: raw[0], source: 'raw-start' });
  }
  for (let index = 1; index < anchors.length; index += 1) {
    const left = anchors[index - 1];
    const right = anchors[index];
    const distance = right.index - left.index;
    if (Math.abs(right.y - left.y) > distance) {
      errors.push({
        type: 'infeasible_grade_anchors',
        roadId,
        left,
        right,
      });
    }
  }

  for (const anchor of anchors) profile[anchor.index] = anchor.y;

  const first = anchors[0];
  for (let index = first.index - 1; index >= 0; index -= 1) {
    profile[index] = clamp(raw[index], profile[index + 1] - 1, profile[index + 1] + 1);
  }

  for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex += 1) {
    const left = anchors[anchorIndex];
    const right = anchors[anchorIndex + 1];
    for (let index = left.index + 1; index < right.index; index += 1) {
      const remaining = right.index - index;
      const reachableMin = right.y - remaining;
      const reachableMax = right.y + remaining;
      const stepMin = profile[index - 1] - 1;
      const stepMax = profile[index - 1] + 1;
      profile[index] = clamp(
        raw[index],
        Math.max(reachableMin, stepMin),
        Math.min(reachableMax, stepMax),
      );
    }
    profile[right.index] = right.y;
  }

  const last = anchors.at(-1);
  for (let index = last.index + 1; index < profile.length; index += 1) {
    profile[index] = clamp(raw[index], profile[index - 1] - 1, profile[index - 1] + 1);
  }

  return { profile, anchors };
}

function connectedComponents(nodes) {
  const unseen = new Set(nodes.keys());
  const components = [];
  while (unseen.size) {
    const start = unseen.values().next().value;
    const queue = [start];
    unseen.delete(start);
    const component = [];
    while (queue.length) {
      const currentKey = queue.shift();
      const current = nodes.get(currentKey);
      component.push(currentKey);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const neighborKey = key2(current.x + dx, current.z + dz);
        if (!unseen.has(neighborKey)) continue;
        const neighbor = nodes.get(neighborKey);
        if (Math.abs(current.y - neighbor.y) > 1) continue;
        unseen.delete(neighborKey);
        queue.push(neighborKey);
      }
    }
    components.push(component);
  }
  return components.sort((a, b) => b.length - a.length);
}

const plan = yaml.load(fs.readFileSync(planPath, 'utf8'));
const snapshot = new AnvilSnapshot(regionDir);
const featurePayload = JSON.parse(fs.readFileSync(featurePath, 'utf8'));
const buildingFeatures = (featurePayload.features ?? [])
  .filter((feature) => feature.kind === 'building' && feature.geometry?.type === 'bounds')
  .map((feature) => ({
    externalId: feature.externalId,
    name: feature.name,
    minX: Number(feature.geometry.minX),
    maxX: Number(feature.geometry.maxX),
    minZ: Number(feature.geometry.minZ),
    maxZ: Number(feature.geometry.maxZ),
  }));
const roads = (plan.roads ?? []).filter((road) => TARGET_ROAD_IDS.has(road.id));
if (roads.length !== TARGET_ROAD_IDS.size) {
  throw new Error(`expected R02-R07; found ${roads.map((road) => road.id).join(', ')}`);
}

const site = {
  minX: Number(plan.site.bounds.min_x),
  maxX: Number(plan.site.bounds.max_x),
  minZ: Number(plan.site.bounds.min_z),
  maxZ: Number(plan.site.bounds.max_z),
};
const r01 = (plan.roads ?? []).find((road) => road.id === 'R01');
if (!r01) throw new Error('project grid is missing R01');
const r01MinZ = Math.min(...r01.centerline.map((point) => Number(point[1])));
const r01MaxZ = Math.max(...r01.centerline.map((point) => Number(point[1])));

const boundaryIndex = new Map();
const declaredGates = [];
for (const boundary of plan.boundaries ?? []) {
  const vertices = boundary.vertices ?? [];
  if (vertices.length < 4) throw new Error(`${boundary.id} has fewer than four vertices`);
  for (const gate of boundary.gates ?? []) {
    declaredGates.push({ boundaryId: boundary.id, boundaryName: boundary.name, ...gate });
  }
  for (let index = 0; index < vertices.length; index += 1) {
    for (const point of pointsOnSegment(vertices[index], vertices[(index + 1) % vertices.length])) {
      const entry = {
        boundaryId: boundary.id,
        boundaryName: boundary.name,
        gates: (boundary.gates ?? [])
          .filter((gate) => gateContains(gate, point))
          .map((gate) => gate.id),
      };
      const pointKey = key2(point.x, point.z);
      const entries = boundaryIndex.get(pointKey) ?? [];
      entries.push(entry);
      boundaryIndex.set(pointKey, entries);
    }
  }
}

const columnCache = new Map();
async function columnAt(x, z) {
  const pointKey = key2(x, z);
  if (!columnCache.has(pointKey)) {
    columnCache.set(pointKey, snapshot.readColumn(x, z, Y_MIN, Y_MAX));
  }
  return columnCache.get(pointKey);
}

async function supportAt(x, z) {
  const column = await columnAt(x, z);
  if (!column) return null;
  return findSafeSupport(column, Y_MIN, Y_MAX);
}

async function r01WalkableSurfaceAt(x, z) {
  const column = await columnAt(x, z);
  if (!column) return null;
  const roadSurface = new Set([
    'minecraft:smooth_stone',
    'minecraft:smooth_stone_slab',
    'minecraft:gray_concrete',
    'minecraft:polished_andesite',
  ]);
  for (let y = 75; y >= 55; y -= 1) {
    if (!roadSurface.has(baseName(column.get(y)))) continue;
    const aboveOne = baseName(column.get(y + 1));
    const aboveTwo = baseName(column.get(y + 2));
    const clear = (block) => (
      isAirBlock(block) || isReplaceableBlock(block) || isFoliageBlock(block)
    );
    if (clear(aboveOne) && clear(aboveTwo)) {
      return { y, block: baseName(column.get(y)), kind: 'land' };
    }
  }
  return supportAt(x, z);
}

function buildingAt(x, z) {
  return buildingFeatures.filter((feature) => (
    x >= feature.minX && x <= feature.maxX
    && z >= feature.minZ && z <= feature.maxZ
  ));
}

function fenceAt(x, z) {
  return (boundaryIndex.get(key2(x, z)) ?? []).filter((entry) => !entry.gates.length);
}

function insideR01(x, z) {
  return Math.abs(x) <= R01_PROTECTED_HALF_WIDTH && z >= r01MinZ && z <= r01MaxZ;
}

const errors = [];
const blockers = [];
const warnings = [];
const inferredGrades = [];
const roadModels = new Map();

// Horizontal streets are anchored to the preserved R01 surface. Their target
// grades then become the vertical-street anchors, making every actual grid
// crossing agree without writing a single R01 block.
for (const road of roads) {
  const [[x1, z1], [x2, z2]] = road.centerline.map((point) => point.map(Number));
  if (x1 !== x2 && z1 !== z2) throw new Error(`${road.id} centerline is not orthogonal`);
  const axis = x1 === x2 ? 'z' : 'x';
  const points = pointsOnSegment([x1, z1], [x2, z2]);
  const raw = [];
  const rawDiagnostics = [];
  for (const point of points) {
    const protectedBuildings = buildingAt(point.x, point.z);
    const protectedFences = fenceAt(point.x, point.z);
    const support = await supportAt(point.x, point.z);
    if (!support) {
      raw.push(null);
      rawDiagnostics.push({ ...point, reason: 'missing_chunk' });
      errors.push({ type: 'missing_chunk', roadId: road.id, ...point });
      continue;
    }
    if (support.kind === 'water' || support.kind === 'lava') {
      raw.push(null);
      rawDiagnostics.push({ ...point, reason: support.kind, y: support.y });
      errors.push({ type: `${support.kind}_centerline`, roadId: road.id, ...point, y: support.y });
      continue;
    }
    if (protectedBuildings.length || protectedFences.length) {
      raw.push(null);
      rawDiagnostics.push({
        ...point,
        reason: protectedBuildings.length ? 'registered_building' : 'undeclared_fence',
        features: protectedBuildings.map((feature) => feature.externalId),
        boundaries: protectedFences.map((entry) => entry.boundaryId),
      });
      continue;
    }
    raw.push(support.y);
  }
  const filledRaw = fillMissingRaw(raw, road.id, inferredGrades);
  roadModels.set(road.id, {
    id: road.id,
    name: road.name,
    width: Number(road.width),
    axis,
    points,
    raw: filledRaw,
    rawDiagnostics,
    profile: null,
    anchors: [],
  });
}

for (const model of [...roadModels.values()].filter((entry) => entry.axis === 'x')) {
  const anchorIndex = model.points.findIndex((point) => point.x === 0);
  if (anchorIndex < 0) {
    errors.push({ type: 'missing_R01_anchor', roadId: model.id });
    continue;
  }
  const anchorSupport = await r01WalkableSurfaceAt(0, model.points[anchorIndex].z);
  if (!anchorSupport || anchorSupport.kind !== 'land') {
    errors.push({ type: 'invalid_R01_anchor', roadId: model.id });
    continue;
  }
  const built = constrainedProfile(
    model.raw,
    [{ index: anchorIndex, y: anchorSupport.y, source: 'preserved-R01' }],
    model.id,
    errors,
  );
  model.profile = built.profile;
  model.anchors = built.anchors;
}

function horizontalGrade(roadId, x) {
  const model = roadModels.get(roadId);
  if (!model?.profile) throw new Error(`${roadId} profile is unavailable`);
  const index = model.points.findIndex((point) => point.x === x);
  if (index < 0) throw new Error(`${roadId} has no station at x=${x}`);
  return model.profile[index];
}

for (const model of [...roadModels.values()].filter((entry) => entry.axis === 'z')) {
  const x = model.points[0].x;
  const anchorSpecs = [
    { z: roadModels.get('R07').points[0].z, roadId: 'R07', source: 'R07 crossing' },
    { z: roadModels.get('R06').points[0].z, roadId: 'R06', source: 'R06 crossing' },
    { z: roadModels.get('R05').points[0].z, roadId: 'R05', source: 'R05 crossing' },
    { z: roadModels.get('R04').points[0].z, roadId: 'R04', source: 'R04 crossing' },
  ];
  const anchors = [];
  for (const spec of anchorSpecs) {
    const horizontal = roadModels.get(spec.roadId);
    if (!horizontal?.points.some((point) => point.x === x)) continue;
    const sharedGrade = horizontalGrade(spec.roadId, x);
    const crossingHalfWidth = Math.floor(horizontal.width / 2);
    const crossingMargin = horizontal.width > 3 ? crossingHalfWidth + 1 : crossingHalfWidth;
    for (let offset = -crossingMargin; offset <= crossingMargin; offset += 1) {
      const index = model.points.findIndex((point) => point.z === spec.z + offset);
      if (index < 0) continue;
      anchors.push({
        index,
        y: sharedGrade,
        source: `${spec.source} surface`,
      });
    }
  }
  const built = constrainedProfile(model.raw, anchors, model.id, errors);
  model.profile = built.profile;
  model.anchors = built.anchors;
}

const roadCells = new Map();
function addRoadCell(x, z, membership) {
  const pointKey = key2(x, z);
  const entry = roadCells.get(pointKey) ?? { x, z, memberships: [] };
  entry.memberships.push(membership);
  roadCells.set(pointKey, entry);
}

for (const model of roadModels.values()) {
  const half = Math.floor(model.width / 2);
  for (let index = 0; index < model.points.length; index += 1) {
    const point = model.points[index];
    for (let offset = -half; offset <= half; offset += 1) {
      addRoadCell(
        model.axis === 'z' ? point.x + offset : point.x,
        model.axis === 'x' ? point.z + offset : point.z,
        {
          roadId: model.id,
          axis: model.axis,
          station: index,
          offset,
          half,
          grade: model.profile[index],
          role: 'carriageway',
          junctionApron: false,
        },
      );
    }
    // Three-wide shared lanes are tightly framed by parcel fences and building
    // eaves. Their flush curbs are the pedestrian margins; a conventional
    // outer sidewalk would overwrite those protected edges.
    if (model.width > 3) {
      for (const offset of [-half - 1, half + 1]) {
        addRoadCell(
          model.axis === 'z' ? point.x + offset : point.x,
          model.axis === 'x' ? point.z + offset : point.z,
          {
            roadId: model.id,
            axis: model.axis,
            station: index,
            offset,
            half,
            grade: model.profile[index],
            role: 'sidewalk',
            junctionApron: false,
          },
        );
      }
    }
  }

  // One-cell aprons bridge R02/R03 to the outer sidewalk bands of R07 and R04.
  // They do not extend either authored centerline through a parcel fence.
  if (model.axis === 'z') {
    const half = Math.floor(model.width / 2);
    for (const end of [
      {
        point: { ...model.points[0], z: model.points[0].z - 1 },
        station: 0,
        grade: model.profile[0],
      },
      {
        point: { ...model.points.at(-1), z: model.points.at(-1).z + 1 },
        station: model.points.length - 1,
        grade: model.profile.at(-1),
      },
    ]) {
      for (let offset = -half; offset <= half; offset += 1) {
        addRoadCell(end.point.x + offset, end.point.z, {
          roadId: model.id,
          axis: model.axis,
          station: end.station,
          offset,
          half,
          grade: end.grade,
          role: 'carriageway',
          junctionApron: true,
        });
      }
    }
  }
}

const crossings = [];
const roadModelList = [...roadModels.values()];
for (let leftIndex = 0; leftIndex < roadModelList.length; leftIndex += 1) {
  for (let rightIndex = leftIndex + 1; rightIndex < roadModelList.length; rightIndex += 1) {
    const left = roadModelList[leftIndex];
    const right = roadModelList[rightIndex];
    if (left.axis === right.axis) continue;
    const vertical = left.axis === 'z' ? left : right;
    const horizontal = left.axis === 'x' ? left : right;
    const x = vertical.points[0].x;
    const z = horizontal.points[0].z;
    const onVertical = z >= Math.min(vertical.points[0].z, vertical.points.at(-1).z)
      && z <= Math.max(vertical.points[0].z, vertical.points.at(-1).z);
    const onHorizontal = x >= Math.min(horizontal.points[0].x, horizontal.points.at(-1).x)
      && x <= Math.max(horizontal.points[0].x, horizontal.points.at(-1).x);
    if (!onVertical || !onHorizontal) continue;
    crossings.push({
      x,
      z,
      roadIds: [vertical.id, horizontal.id],
      halfWidths: {
        [vertical.id]: Math.floor(vertical.width / 2),
        [horizontal.id]: Math.floor(horizontal.width / 2),
      },
    });
  }
}
for (const model of roadModelList.filter((entry) => entry.axis === 'x')) {
  crossings.push({
    x: 0,
    z: model.points[0].z,
    roadIds: [model.id, 'R01'],
    halfWidths: {
      [model.id]: Math.floor(model.width / 2),
      R01: Math.floor(Number(r01.width) / 2),
    },
    preservedRoad: 'R01',
  });
}

function membershipCrosswalk(membership, x, z) {
  for (const crossing of crossings) {
    if (!crossing.roadIds.includes(membership.roadId)) continue;
    const otherId = crossing.roadIds.find((roadId) => roadId !== membership.roadId);
    const otherHalf = crossing.halfWidths[otherId];
    const distance = membership.axis === 'x'
      ? Math.abs(x - crossing.x)
      : Math.abs(z - crossing.z);
    if (distance < otherHalf + 2 || distance > otherHalf + 6) continue;
    if (distance % 2 === 0) return true;
  }
  return false;
}

const protectedR01Cells = [];
const protectedFenceCells = [];
const protectedBuildingCells = [];
const clippedSidewalkCells = [];
const gradeConflicts = [];
const surfacePlan = new Map();

for (const cell of roadCells.values()) {
  const roadIds = [...new Set(cell.memberships.map((entry) => entry.roadId))].sort();
  const carriage = cell.memberships.filter((entry) => entry.role === 'carriageway');
  const sidewalks = cell.memberships.filter((entry) => entry.role === 'sidewalk');
  const fenceEntries = fenceAt(cell.x, cell.z);
  const buildings = buildingAt(cell.x, cell.z);

  if (insideR01(cell.x, cell.z)) {
    protectedR01Cells.push({ x: cell.x, z: cell.z, roadIds });
    continue;
  }
  if (fenceEntries.length) {
    const conflict = {
      x: cell.x,
      z: cell.z,
      roadIds,
      roles: [...new Set(cell.memberships.map((entry) => entry.role))],
      boundaries: [...new Set(fenceEntries.map((entry) => entry.boundaryId))],
    };
    protectedFenceCells.push(conflict);
    if (!carriage.length) clippedSidewalkCells.push(conflict);
    continue;
  }
  if (buildings.length) {
    const conflict = {
      x: cell.x,
      z: cell.z,
      roadIds,
      roles: [...new Set(cell.memberships.map((entry) => entry.role))],
      features: buildings.map((feature) => feature.externalId),
    };
    protectedBuildingCells.push(conflict);
    if (!carriage.length) clippedSidewalkCells.push(conflict);
    continue;
  }
  if (
    cell.x < site.minX || cell.x > site.maxX
    || cell.z < site.minZ || cell.z > site.maxZ
  ) {
    errors.push({ type: 'outside_site', x: cell.x, z: cell.z, roadIds });
    continue;
  }

  const grades = cell.memberships.map((entry) => entry.grade);
  const grade = median(grades);
  if (Math.max(...grades) - Math.min(...grades) > 1) {
    gradeConflicts.push({
      x: cell.x,
      z: cell.z,
      roadIds,
      grades,
    });
  }

  const carriageRoadIds = [...new Set(carriage.map((entry) => entry.roadId))];
  const isIntersection = carriageRoadIds.length > 1;
  const isCrosswalk = carriage.some((entry) => membershipCrosswalk(entry, cell.x, cell.z));
  const primary = carriage[0] ?? sidewalks[0];
  let material;
  let role;
  if (isIntersection) {
    material = ROAD_PALETTE.intersection;
    role = 'intersection';
  } else if (isCrosswalk) {
    material = ROAD_PALETTE.crosswalk;
    role = 'crosswalk';
  } else if (!carriage.length) {
    material = ROAD_PALETTE.sidewalk;
    role = 'sidewalk';
  } else if (
    primary.offset === 0
    && floorMod(primary.station, 10) < 4
    && !primary.junctionApron
  ) {
    material = ROAD_PALETTE.centerStripe;
    role = 'center_stripe';
  } else if (Math.abs(primary.offset) === primary.half) {
    material = ROAD_PALETTE.flushCurb;
    role = 'flush_curb';
  } else {
    material = ROAD_PALETTE.carriageway;
    role = primary.junctionApron ? 'junction_apron' : 'carriageway';
  }
  surfacePlan.set(key2(cell.x, cell.z), {
    x: cell.x,
    z: cell.z,
    y: grade,
    material,
    role,
    roadIds,
    memberships: cell.memberships,
  });
}

if (gradeConflicts.length) {
  errors.push({
    type: 'overlapping_profile_grade_conflicts',
    count: gradeConflicts.length,
    examples: gradeConflicts.slice(0, 20),
  });
}

const lampPlan = new Map();
const lampSkipped = [];
for (const model of roadModels.values()) {
  const half = Math.floor(model.width / 2);
  let ordinal = 0;
  for (let station = 12; station < model.points.length - 10; station += 24) {
    const point = model.points[station];
    const offset = ordinal % 2 === 0 ? -half : half;
    ordinal += 1;
    const x = model.axis === 'z' ? point.x + offset : point.x;
    const z = model.axis === 'x' ? point.z + offset : point.z;
    const surface = surfacePlan.get(key2(x, z));
    const tooCloseToCrossing = crossings.some((crossing) => (
      crossing.roadIds.includes(model.id)
      && Math.abs(x - crossing.x) + Math.abs(z - crossing.z) <= 9
    ));
    if (
      !surface
      || surface.role === 'crosswalk'
      || surface.role === 'intersection'
      || tooCloseToCrossing
    ) {
      lampSkipped.push({ roadId: model.id, station, x, z, reason: 'protected_or_junction' });
      continue;
    }
    lampPlan.set(key2(x, z), {
      x,
      z,
      y: surface.y,
      roadId: model.id,
      station,
    });
  }
}

// Low flush lights fill the long intervals without obstructing one-wide walks.
for (const surface of surfacePlan.values()) {
  if (surface.role !== 'sidewalk') continue;
  const membership = surface.memberships.find((entry) => entry.role === 'sidewalk');
  if (!membership || floorMod(membership.station, 16) !== 8) continue;
  if (lampPlan.has(key2(surface.x, surface.z))) continue;
  surface.material = ROAD_PALETTE.flushLight;
  surface.role = 'flush_light';
}

const desired = new Map();
const targetConflicts = [];
function putDesired(target) {
  const targetKey = key3(target.x, target.y, target.z);
  const existing = desired.get(targetKey);
  if (!existing || target.priority > existing.priority) {
    desired.set(targetKey, target);
    return;
  }
  if (target.priority === existing.priority && baseName(target.block) !== baseName(existing.block)) {
    targetConflicts.push({ targetKey, existing, incoming: target });
  }
}

const acceptedSurface = new Map();
const missingColumns = [];
const waterColumns = [];
const unsafeCollisions = [];
const protectedOverheadCells = [];
const excessiveCuts = [];
const excessiveFills = [];
const foliageTrimmed = [];
const columnMetrics = [];

for (const surface of surfacePlan.values()) {
  const column = await columnAt(surface.x, surface.z);
  if (!column) {
    missingColumns.push({ x: surface.x, z: surface.z, roadIds: surface.roadIds });
    continue;
  }
  const support = findSafeSupport(column, Y_MIN, Y_MAX);
  if (support.kind === 'water' || support.kind === 'lava') {
    waterColumns.push({
      x: surface.x,
      z: surface.z,
      y: support.y,
      kind: support.kind,
      roadIds: surface.roadIds,
    });
    continue;
  }
  if (support.kind !== 'land' || support.y === null) {
    missingColumns.push({
      x: surface.x,
      z: surface.z,
      reason: support.kind,
      roadIds: surface.roadIds,
    });
    continue;
  }

  const cut = Math.max(0, support.y - surface.y);
  const fill = Math.max(0, surface.y - support.y);
  if (cut > MAX_CUT) {
    excessiveCuts.push({
      x: surface.x,
      z: surface.z,
      roadIds: surface.roadIds,
      supportY: support.y,
      targetY: surface.y,
      cut,
    });
    continue;
  }
  if (fill > MAX_FILL) {
    excessiveFills.push({
      x: surface.x,
      z: surface.z,
      roadIds: surface.roadIds,
      supportY: support.y,
      targetY: surface.y,
      fill,
    });
    continue;
  }

  const lamp = lampPlan.get(key2(surface.x, surface.z));
  const localTargets = [];
  for (let y = support.y + 1; y < surface.y; y += 1) {
    localTargets.push({
      x: surface.x,
      y,
      z: surface.z,
      block: ROAD_PALETTE.foundation,
      role: 'foundation',
      phase: 0,
      priority: 10,
      roadIds: surface.roadIds,
    });
  }
  localTargets.push({
    x: surface.x,
    y: surface.y,
    z: surface.z,
    block: surface.material,
    role: surface.role,
    phase: 2,
    priority: 30,
    roadIds: surface.roadIds,
  });

  const clearanceTop = Math.max(surface.y + HEADROOM, support.y);
  for (let y = surface.y + 1; y <= clearanceTop; y += 1) {
    let block = 'minecraft:air';
    let role = 'headroom';
    let phase = 1;
    let priority = 20;
    if (lamp && y <= surface.y + 3) {
      block = ROAD_PALETTE.lampPost;
      role = 'street_lamp_post';
      phase = 3;
      priority = 40;
    } else if (lamp && y === surface.y + 4) {
      block = ROAD_PALETTE.lampHead;
      role = 'street_lamp_head';
      phase = 3;
      priority = 40;
    }
    localTargets.push({
      x: surface.x,
      y,
      z: surface.z,
      block,
      role,
      phase,
      priority,
      roadIds: surface.roadIds,
    });
  }

  let unsafe = false;
  for (const target of localTargets) {
    const current = baseName(column.get(target.y));
    if (isWater(current) || isLava(current)) {
      waterColumns.push({
        x: target.x,
        y: target.y,
        z: target.z,
        current,
        desired: target.block,
        roadIds: target.roadIds,
      });
      unsafe = true;
      break;
    }
    if (
      baseName(target.block) !== current
      && !isSafeReplace(current)
    ) {
      const collision = {
        x: target.x,
        y: target.y,
        z: target.z,
        current,
        desired: target.block,
        role: target.role,
        roadIds: target.roadIds,
      };
      if (target.role === 'headroom' && baseName(target.block) === 'minecraft:air') {
        protectedOverheadCells.push(collision);
      } else {
        unsafeCollisions.push(collision);
      }
      unsafe = true;
      break;
    }
    if (
      baseName(target.block) === 'minecraft:air'
      && !isAirBlock(current)
      && isFoliageBlock(current)
    ) {
      foliageTrimmed.push({
        x: target.x,
        y: target.y,
        z: target.z,
        current,
        roadIds: target.roadIds,
      });
    }
  }
  if (unsafe) continue;

  for (const target of localTargets) putDesired(target);
  acceptedSurface.set(key2(surface.x, surface.z), surface);
  columnMetrics.push({
    x: surface.x,
    z: surface.z,
    roadIds: surface.roadIds,
    supportY: support.y,
    targetY: surface.y,
    cut,
    fill,
  });
}

if (targetConflicts.length) {
  errors.push({
    type: 'divergent_duplicate_targets',
    count: targetConflicts.length,
    examples: targetConflicts.slice(0, 20),
  });
}
if (missingColumns.length) {
  errors.push({
    type: 'missing_or_invalid_columns',
    count: missingColumns.length,
    examples: missingColumns.slice(0, 20),
  });
}
if (waterColumns.length) {
  errors.push({
    type: 'water_or_lava_intersections',
    count: waterColumns.length,
    examples: waterColumns.slice(0, 20),
  });
}
if (unsafeCollisions.length) {
  errors.push({
    type: 'manufactured_block_collisions',
    count: unsafeCollisions.length,
    examples: unsafeCollisions.slice(0, 20),
  });
}
if (protectedOverheadCells.length) {
  warnings.push({
    type: 'road_surface_clipped_beneath_protected_overhead',
    count: protectedOverheadCells.length,
    examples: protectedOverheadCells.slice(0, 20),
  });
}
if (excessiveCuts.length) {
  errors.push({
    type: 'cut_limit_exceeded',
    limit: MAX_CUT,
    count: excessiveCuts.length,
    examples: excessiveCuts.slice(0, 20),
  });
}
if (excessiveFills.length) {
  errors.push({
    type: 'fill_limit_exceeded',
    limit: MAX_FILL,
    count: excessiveFills.length,
    examples: excessiveFills.slice(0, 20),
  });
}

const carriagewayFenceConflicts = protectedFenceCells.filter((entry) => (
  entry.roles.includes('carriageway')
));
const carriagewayBuildingConflicts = protectedBuildingCells.filter((entry) => (
  entry.roles.includes('carriageway')
));
if (carriagewayFenceConflicts.length) {
  blockers.push({
    type: 'undeclared_fence_crossings',
    count: carriagewayFenceConflicts.length,
    byBoundary: groupCounts(
      carriagewayFenceConflicts.flatMap((entry) => (
        entry.boundaries.map((boundaryId) => ({ boundaryId }))
      )),
      'boundaryId',
    ),
    examples: carriagewayFenceConflicts.slice(0, 40),
  });
}
if (carriagewayBuildingConflicts.length) {
  blockers.push({
    type: 'registered_building_intrusions',
    count: carriagewayBuildingConflicts.length,
    byFeature: groupCounts(
      carriagewayBuildingConflicts.flatMap((entry) => (
        entry.features.map((featureId) => ({ featureId }))
      )),
      'featureId',
    ),
    examples: carriagewayBuildingConflicts.slice(0, 40),
  });
}
if (clippedSidewalkCells.length) {
  warnings.push({
    type: 'sidewalk_clipped_to_preserve_fence_or_building',
    count: clippedSidewalkCells.length,
    examples: clippedSidewalkCells.slice(0, 40),
  });
}

// Add the preserved R01 surface to network topology only. It remains absent
// from desired targets and therefore cannot appear in the operations file.
const networkNodes = new Map();
for (const surface of acceptedSurface.values()) {
  networkNodes.set(key2(surface.x, surface.z), {
    x: surface.x,
    y: surface.y,
    z: surface.z,
    roadIds: surface.roadIds,
    source: 'generated',
  });
}
for (const protectedCell of protectedR01Cells) {
  const { x, z } = protectedCell;
  const support = await r01WalkableSurfaceAt(x, z);
  if (!support || support.kind !== 'land' || support.y === null) continue;
  networkNodes.set(key2(x, z), {
    x,
    y: support.y,
    z,
    roadIds: [...new Set(['R01', ...protectedCell.roadIds])],
    source: 'preserved-R01',
  });
}

const roadConnectivity = [];
for (const model of roadModels.values()) {
  const nodes = new Map(
    [...networkNodes.entries()].filter(([, node]) => node.roadIds.includes(model.id)),
  );
  const components = connectedComponents(nodes);
  roadConnectivity.push({
    roadId: model.id,
    nodes: nodes.size,
    componentCount: components.length,
    componentSizes: components.map((component) => component.length),
    continuous: components.length === 1,
  });
}
const wholeNetworkComponents = connectedComponents(networkNodes);

for (const road of roadConnectivity.filter((entry) => !entry.continuous)) {
  blockers.push({
    type: 'road_not_continuous',
    roadId: road.roadId,
    componentCount: road.componentCount,
    componentSizes: road.componentSizes,
  });
}

const gateConnectivity = [];
for (const gate of declaredGates.filter((entry) => TARGET_ROAD_IDS.has(entry.road))) {
  const roadNodes = [...networkNodes.values()].filter((node) => node.roadIds.includes(gate.road));
  const gatePoints = [];
  for (let value = Number(gate.min); value <= Number(gate.max); value += 1) {
    gatePoints.push(
      gate.axis === 'x'
        ? { x: value, z: Number(gate.fixed) }
        : { x: Number(gate.fixed), z: value },
    );
  }
  let nearest = null;
  for (const gatePoint of gatePoints) {
    for (const node of roadNodes) {
      const distance = Math.abs(gatePoint.x - node.x) + Math.abs(gatePoint.z - node.z);
      if (!nearest || distance < nearest.distance) {
        nearest = {
          distance,
          gatePoint,
          roadPoint: { x: node.x, y: node.y, z: node.z },
        };
      }
    }
  }
  const currentFenceBlocks = [];
  for (const gatePoint of gatePoints) {
    const column = await columnAt(gatePoint.x, gatePoint.z);
    if (!column) continue;
    for (let y = Y_MIN; y <= Y_MAX; y += 1) {
      const block = baseName(column.get(y));
      if (
        block === baseName(plan.appearance.field_block)
        || block === baseName(plan.appearance.post_block)
        || block === baseName(plan.appearance.post_cap)
      ) {
        currentFenceBlocks.push({ ...gatePoint, y, block });
      }
    }
  }
  const connected = Boolean(nearest && nearest.distance <= 1);
  gateConnectivity.push({
    boundaryId: gate.boundaryId,
    gateId: gate.id,
    roadId: gate.road,
    connected,
    nearest,
    currentFenceBlocks: currentFenceBlocks.slice(0, 20),
  });
}
const disconnectedGates = gateConnectivity.filter((entry) => !entry.connected);
if (disconnectedGates.length) {
  blockers.push({
    type: 'declared_gates_not_connected',
    count: disconnectedGates.length,
    gates: disconnectedGates,
  });
}

const operations = [];
let satisfiedTargets = 0;
for (const target of [...desired.values()].sort((left, right) => (
  left.phase - right.phase
  || left.x - right.x
  || left.z - right.z
  || left.y - right.y
))) {
  const column = await columnAt(target.x, target.z);
  const current = baseName(column.get(target.y));
  if (current === baseName(target.block)) {
    satisfiedTargets += 1;
    continue;
  }
  operations.push({
    ...target,
    expected: current,
    line: `REPL ${target.x} ${target.y} ${target.z} ${target.x} ${target.y} ${target.z} `
      + `${current} ${target.block}`,
  });
}

const writesR01 = operations.filter((operation) => insideR01(operation.x, operation.z));
const writesFence = operations.filter((operation) => fenceAt(operation.x, operation.z).length);
const writesBuilding = operations.filter((operation) => buildingAt(operation.x, operation.z).length);
const writesWater = operations.filter((operation) => (
  isWater(operation.expected) || isLava(operation.expected)
));
const operationTargetKeys = operations.map((operation) => (
  key3(operation.x, operation.y, operation.z)
));
const exactGuardPattern = /^REPL -?\d+ -?\d+ -?\d+ -?\d+ -?\d+ -?\d+ minecraft:[a-z0-9_]+ minecraft:[a-z0-9_]+$/;
if (writesR01.length) errors.push({ type: 'R01_write_regression', count: writesR01.length });
if (writesFence.length) errors.push({ type: 'fence_write_regression', count: writesFence.length });
if (writesBuilding.length) errors.push({ type: 'building_write_regression', count: writesBuilding.length });
if (writesWater.length) errors.push({ type: 'water_write_regression', count: writesWater.length });

const roadReports = [];
for (const model of roadModels.values()) {
  const metrics = columnMetrics.filter((entry) => entry.roadIds.includes(model.id));
  const surfaces = [...acceptedSurface.values()].filter((entry) => entry.roadIds.includes(model.id));
  const modelOperations = operations.filter((entry) => entry.roadIds.includes(model.id));
  const modelLamps = [...lampPlan.values()].filter((entry) => entry.roadId === model.id);
  const connectivity = roadConnectivity.find((entry) => entry.roadId === model.id);
  roadReports.push({
    id: model.id,
    name: model.name,
    axis: model.axis,
    width: model.width,
    sharedLane: model.id === 'R02',
    authoredCenterline: [
      [model.points[0].x, model.points[0].z],
      [model.points.at(-1).x, model.points.at(-1).z],
    ],
    stations: model.points.length,
    rawGrade: {
      min: Math.min(...model.raw),
      max: Math.max(...model.raw),
    },
    targetGrade: {
      min: Math.min(...model.profile),
      max: Math.max(...model.profile),
      maxAdjacentChange: Math.max(
        ...model.profile.slice(1).map((value, index) => Math.abs(value - model.profile[index])),
      ),
      anchors: model.anchors,
      profile: model.points.map((point, index) => ({
        x: point.x,
        z: point.z,
        y: model.profile[index],
      })),
    },
    acceptedSurfaceCells: surfaces.length,
    operations: modelOperations.length,
    lamps: modelLamps.length,
    maxCut: metrics.length ? Math.max(...metrics.map((entry) => entry.cut)) : null,
    maxFill: metrics.length ? Math.max(...metrics.map((entry) => entry.fill)) : null,
    protectedFenceCells: protectedFenceCells
      .filter((entry) => entry.roadIds.includes(model.id)).length,
    protectedBuildingCells: protectedBuildingCells
      .filter((entry) => entry.roadIds.includes(model.id)).length,
    protectedR01Cells: protectedR01Cells
      .filter((entry) => entry.roadIds.includes(model.id)).length,
    connectivity,
  });
}

const acceptance = {
  exactGuardOnly: operations.every((operation) => exactGuardPattern.test(operation.line)),
  oneBlockOperations: operations.every((operation) => (
    Number.isInteger(operation.x)
    && Number.isInteger(operation.y)
    && Number.isInteger(operation.z)
  )),
  uniqueOperationTargets: new Set(operationTargetKeys).size === operationTargetKeys.length,
  noSetOrCmd: operations.every((operation) => !/^(SET|CMD)\s/.test(operation.line)),
  noR01Writes: writesR01.length === 0,
  noUndeclaredFenceWrites: writesFence.length === 0,
  noRegisteredBuildingWrites: writesBuilding.length === 0,
  noWaterOrLavaWrites: writesWater.length === 0 && waterColumns.length === 0,
  noMissingColumns: missingColumns.length === 0,
  noManufacturedCollisions: unsafeCollisions.length === 0,
  noExcessiveCuts: excessiveCuts.length === 0,
  noExcessiveFills: excessiveFills.length === 0,
  noDivergentTargets: targetConflicts.length === 0,
  allTargetGradesStepAtMostOne: roadReports.every(
    (road) => road.targetGrade.maxAdjacentChange <= 1,
  ),
  allRoadsContinuous: roadConnectivity.every((road) => road.continuous),
  wholeNetworkConnected: wholeNetworkComponents.length === 1,
  allDeclaredGatesConnected: disconnectedGates.length === 0,
};
const executionReady = (
  errors.length === 0
  && blockers.length === 0
  && Object.values(acceptance).every(Boolean)
);

const output = [
  '# GENERATED FILE — MainStreet terrain-following grid roads R02-R07',
  `# plan: ${planPath}`,
  `# plan sha256: ${sha256File(planPath)}`,
  `# snapshot: ${regionDir}`,
  `# execution ready: ${executionReady}`,
  '# Safety: exact-material, one-block REPL only; R01, buildings, fences, water and lava are immutable.',
  `# desired targets: ${desired.size}; already satisfied: ${satisfiedTargets}; operations: ${operations.length}`,
  `# errors: ${errors.length}; blockers: ${blockers.length}; warnings: ${warnings.length}`,
  '',
  ...operations.map((operation) => operation.line),
  '',
].join('\n');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output);

const snapshotFiles = fs.readdirSync(regionDir)
  .filter((name) => /^r\.-?\d+\.-?\d+\.mca$/.test(name))
  .sort()
  .map((name) => ({
    name,
    sha256: sha256File(path.join(regionDir, name)),
  }));
const report = {
  schemaVersion: 1,
  id: 'mainstreet-america-grid-roads',
  generatedAtUtc: new Date().toISOString(),
  executionReady,
  inputs: {
    plan: planPath,
    planSha256: sha256File(planPath),
    featureInventory: featurePath,
    featureInventorySha256: sha256File(featurePath),
    snapshot: {
      regionDir,
      files: snapshotFiles,
    },
  },
  output: {
    path: outputPath,
    sha256: sha256File(outputPath),
  },
  design: {
    roads: [...TARGET_ROAD_IDS],
    palette: ROAD_PALETTE,
    maxCut: MAX_CUT,
    maxFill: MAX_FILL,
    headroom: HEADROOM,
    R01ProtectedHalfWidth: R01_PROTECTED_HALF_WIDTH,
    narrowRoadTreatment: 'three-wide shared lanes with flush edge bands; no fence- or eave-overwriting outer sidewalk',
    sidewalkTreatment: 'one-wide smooth-stone walk where the authored public corridor permits it',
    curbTreatment: 'flush stone-brick edge band so every grade remains step-safe',
    markingTreatment: 'dashed yellow centers, white approach crosswalks, polished-andesite intersections',
    lightingTreatment: 'alternating blackstone-wall lantern standards plus flush sidewalk sea lanterns',
  },
  stats: {
    roadCount: roads.length,
    authoredStations: [...roadModels.values()]
      .reduce((sum, model) => sum + model.points.length, 0),
    plannedSurfaceCells: surfacePlan.size,
    acceptedSurfaceCells: acceptedSurface.size,
    desiredTargets: desired.size,
    satisfiedTargets,
    operations: operations.length,
    byRole: groupCounts(operations, 'role'),
    streetLamps: lampPlan.size,
    lampSkipped: lampSkipped.length,
    foliageTrimmed: foliageTrimmed.length,
    inferredGradeStations: inferredGrades.length,
    protectedR01Cells: protectedR01Cells.length,
    protectedFenceCells: protectedFenceCells.length,
    protectedBuildingCells: protectedBuildingCells.length,
    clippedSidewalkCells: clippedSidewalkCells.length,
    missingColumns: missingColumns.length,
    waterColumns: waterColumns.length,
    unsafeCollisions: unsafeCollisions.length,
    protectedOverheadCells: protectedOverheadCells.length,
    excessiveCuts: excessiveCuts.length,
    excessiveFills: excessiveFills.length,
    targetConflicts: targetConflicts.length,
    networkComponentCount: wholeNetworkComponents.length,
    networkComponentSizes: wholeNetworkComponents.map((component) => component.length),
  },
  acceptance,
  roads: roadReports,
  crossings,
  gates: gateConnectivity,
  diagnostics: {
    inferredGrades,
    gradeConflicts: exactDiagnostics(gradeConflicts),
    protectedR01Cells: exactDiagnostics(protectedR01Cells),
    protectedFenceCells: exactDiagnostics(protectedFenceCells),
    protectedBuildingCells: exactDiagnostics(protectedBuildingCells),
    clippedSidewalkCells: exactDiagnostics(clippedSidewalkCells),
    missingColumns: exactDiagnostics(missingColumns),
    waterColumns: exactDiagnostics(waterColumns),
    unsafeCollisions: exactDiagnostics(unsafeCollisions),
    protectedOverheadCells: exactDiagnostics(protectedOverheadCells),
    excessiveCuts: exactDiagnostics(excessiveCuts),
    excessiveFills: exactDiagnostics(excessiveFills),
    targetConflicts: exactDiagnostics(targetConflicts),
    foliageTrimmed: exactDiagnostics(foliageTrimmed),
    lampSkipped: exactDiagnostics(lampSkipped),
  },
  errors,
  blockers,
  warnings,
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({
  output: outputPath,
  report: reportPath,
  executionReady,
  stats: report.stats,
  acceptance,
  errors: errors.slice(0, 8),
  blockers: blockers.slice(0, 8),
  warnings: warnings.slice(0, 8),
}, null, 2));
if (!executionReady) process.exitCode = 1;
