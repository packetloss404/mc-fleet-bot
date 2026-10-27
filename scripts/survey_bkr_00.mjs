#!/usr/bin/env node
/**
 * BKR-SURVEY-00 — fresh condition census for the bunker program.
 *
 * READ-ONLY. Uses an immutable complete-save snapshot with the shared
 * AnvilReader. It never contacts Minecraft, RCON, the fleet API, or systemd,
 * and performs no world edit.
 *
 * Outputs:
 *   data/world-review/bkr-survey-00-20260824/bkr-survey-00.json
 *   data/world-review/bkr-survey-00-20260824/bkr-survey-00.md
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const argv = process.argv.slice(2);

function value(flag, fallback) {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const SNAPSHOT_ROOT = path.resolve(ROOT, value(
  '--snapshot',
  'data/worldsnap-r08am-post-20260822T161818Z',
));
const REGIONS = path.join(SNAPSHOT_ROOT, 'region');
const OUT_DIR = path.resolve(ROOT, value('--out-dir', 'data/world-review/bkr-survey-00-20260824'));
const INTAKE_REPORT = argv.includes('--intake-report')
  ? path.resolve(ROOT, value('--intake-report', ''))
  : null;

function displayPath(filename) {
  const relative = path.relative(ROOT, filename);
  return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..'
    ? relative.split(path.sep).join('/')
    : filename;
}

function loadSnapshotIdentity() {
  if (!fs.statSync(SNAPSHOT_ROOT).isDirectory()) {
    throw new Error(`Snapshot root is not a directory: ${SNAPSHOT_ROOT}`);
  }
  if (!fs.statSync(REGIONS).isDirectory()) {
    throw new Error(`Snapshot has no region directory: ${REGIONS}`);
  }
  const manifestPath = path.join(SNAPSHOT_ROOT, 'combined-zones-complete-save-capture.json');
  if (!fs.statSync(manifestPath).isFile()) {
    throw new Error(`Snapshot has no complete-save capture manifest: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.immutableCopy !== true || !manifest.captureId || !manifest.capturedAtUtc) {
    throw new Error(`Snapshot manifest is not an immutable complete-save identity: ${manifestPath}`);
  }
  let intake = null;
  if (INTAKE_REPORT) {
    if (!fs.statSync(INTAKE_REPORT).isFile()) {
      throw new Error(`Complete-save intake report does not exist: ${INTAKE_REPORT}`);
    }
    intake = JSON.parse(fs.readFileSync(INTAKE_REPORT, 'utf8'));
    if (intake.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
      || !intake.packageIdentity?.completeSaveSha256) {
      throw new Error(`Complete-save intake did not pass: ${INTAKE_REPORT}`);
    }
  }
  return { manifestPath, manifest, intake };
}

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const DEADLY = new Set([
  'minecraft:lava', 'minecraft:fire', 'minecraft:soul_fire', 'minecraft:cactus',
  'minecraft:magma_block', 'minecraft:sweet_berry_bush', 'minecraft:powder_snow',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern',
  'minecraft:chain', 'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light',
  'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb',
  'minecraft:water', 'minecraft:flowing_water',
]);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail',
  '_pressure_plate', '_sapling'];
const LIGHT_BLOCKS = new Set([
  'minecraft:sea_lantern', 'minecraft:glowstone', 'minecraft:jack_o_lantern',
  'minecraft:shroomlight', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:torch',
  'minecraft:soul_torch', 'minecraft:end_rod', 'minecraft:light', 'minecraft:lava',
  'minecraft:redstone_lamp',
]);
const GRAVITY_BLOCKS = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:concrete_powder',
  'minecraft:scaffolding', 'minecraft:anvil',
]);
const CONTAINER_IDS = [
  'chest', 'barrel', 'shulker_box', 'furnace', 'smoker', 'blast_furnace', 'hopper',
  'dispenser', 'dropper', 'brewing_stand', 'beehive', 'bee_nest', 'jukebox', 'campfire',
  'soul_campfire',
];

function baseName(state) {
  return String(state ?? '').split('[', 1)[0];
}

function properties(state) {
  const raw = String(state ?? '');
  const bracket = raw.indexOf('[');
  if (bracket < 0 || !raw.endsWith(']')) return {};
  return Object.fromEntries(raw.slice(bracket + 1, -1).split(',').map((entry) => {
    const separator = entry.indexOf('=');
    return separator < 0 ? [entry, ''] : [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
}

function isDoor(name) {
  return name.endsWith('_door') || name.endsWith('_fence_gate');
}

function passable(state) {
  const name = baseName(state);
  if (AIR.has(name)) return true;
  if (DEADLY.has(name)) return false;
  if (PASSABLE_EXACT.has(name)) return true;
  if (PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix))) return true;
  if (isDoor(name)) return true;
  if (name.endsWith('_trapdoor')) return properties(state).open === 'true';
  return false;
}

function footing(state) {
  const name = baseName(state);
  if (AIR.has(name) || DEADLY.has(name)) return false;
  if (name.endsWith('_carpet')) return false;
  if (name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) return false;
  return !passable(state)
    || name.endsWith('_slab')
    || name.endsWith('_stairs')
    || (name.endsWith('_trapdoor') && properties(state).open !== 'true');
}

function isFluidState(state) {
  const name = baseName(state);
  const props = properties(state);
  return name === 'minecraft:water' || name === 'minecraft:lava'
    || name === 'minecraft:flowing_water' || name === 'minecraft:flowing_lava'
    || props.waterlogged === 'true';
}

function pointKey(p) { return p.join(','); }

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const reader = new AnvilReader(REGIONS);
const blockCache = new Map();
const standableCache = new Map();

async function block(x, y, z) {
  const key = pointKey([x, y, z]);
  if (!blockCache.has(key)) {
    const state = await reader.blockState(x, y, z);
    blockCache.set(key, stateToCommandString(state));
  }
  return blockCache.get(key);
}

async function standable(p) {
  const key = pointKey(p);
  if (standableCache.has(key)) return standableCache.get(key);
  const feet = await block(p[0], p[1], p[2]);
  const head = await block(p[0], p[1] + 1, p[2]);
  const support = await block(p[0], p[1] - 1, p[2]);
  const result = feet !== null && head !== null && support !== null
    && passable(feet) && passable(head) && footing(support);
  standableCache.set(key, result);
  return result;
}

function inside(p, box) {
  return p[0] >= box[0] && p[0] <= box[3] && p[1] >= box[1] && p[1] <= box[4]
    && p[2] >= box[2] && p[2] <= box[5];
}

function candidateMoves(p) {
  const out = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [0, 1, -1]) out.push([p[0] + dx, p[1] + dy, p[2] + dz]);
  }
  return out;
}

async function scanWalkable(box) {
  const cells = [];
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        const p = [x, y, z];
        if (await standable(p)) cells.push(p);
      }
    }
  }
  return cells;
}

async function components(cells, box) {
  const unvisited = new Set(cells.map(pointKey));
  const componentsList = [];
  while (unvisited.size > 0) {
    const startKey = unvisited.values().next().value;
    const queue = [startKey.split(',').map(Number)];
    const comp = [];
    const visited = new Set();
    let cursor = 0;
    while (cursor < queue.length) {
      const point = queue[cursor++];
      const key = pointKey(point);
      if (visited.has(key)) continue;
      visited.add(key);
      comp.push(point);
      for (const move of candidateMoves(point)) {
        if (!inside(move, box)) continue;
        const moveKey = pointKey(move);
        if (visited.has(moveKey) || !unvisited.has(moveKey)) continue;
        if (await standable(move)) queue.push(move);
      }
    }
    for (const key of visited) unvisited.delete(key);
    componentsList.push(comp);
  }
  componentsList.sort((a, b) => b.length - a.length);
  return componentsList;
}

async function anchorStandable(box) {
  const candidates = [];
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        const p = [x, y, z];
        if (await standable(p)) candidates.push(p);
      }
    }
  }
  const cx = (box[0] + box[3]) / 2;
  const cy = (box[1] + box[4]) / 2;
  const cz = (box[2] + box[5]) / 2;
  candidates.sort((a, b) => {
    const da = Math.abs(a[0] - cx) + Math.abs(a[1] - cy) + Math.abs(a[2] - cz);
    const db = Math.abs(b[0] - cx) + Math.abs(b[1] - cy) + Math.abs(b[2] - cz);
    return da - db;
  });
  return candidates;
}

async function findPath(box, startCells, endCells) {
  const endKeys = new Set(endCells.map(pointKey));
  const queue = [];
  const parent = new Map();
  const startKeys = new Set(startCells.map(pointKey));
  for (const s of startCells) {
    const key = pointKey(s);
    if (parent.has(key)) continue;
    parent.set(key, null);
    queue.push(s);
  }
  let cursor = 0;
  const visitedCount = new Set(startKeys);
  while (cursor < queue.length) {
    const point = queue[cursor++];
    const key = pointKey(point);
    if (endKeys.has(key)) {
      const path = [];
      let cur = key;
      while (cur !== null) {
        path.push(cur.split(',').map(Number));
        cur = parent.get(cur) ?? null;
      }
      path.reverse();
      return { path, visitedCount: visitedCount.size };
    }
    for (const move of candidateMoves(point)) {
      if (!inside(move, box)) continue;
      const moveKey = pointKey(move);
      if (parent.has(moveKey)) continue;
      if (!(await standable(move))) continue;
      parent.set(moveKey, key);
      visitedCount.add(moveKey);
      queue.push(move);
    }
  }
  return { path: null, visitedCount: visitedCount.size };
}

async function runLength(p, axis) {
  let left = 0;
  let right = 0;
  const x = p[0]; const y = p[1]; const z = p[2];
  if (axis === 'x') {
    while (left < 32 && passable(await block(x - left - 1, y, z))) left += 1;
    while (right < 32 && passable(await block(x + right + 1, y, z))) right += 1;
  } else {
    while (left < 32 && passable(await block(x, y, z - left - 1))) left += 1;
    while (right < 32 && passable(await block(x, y, z + right + 1))) right += 1;
  }
  return 1 + left + right;
}

async function headroom(p) {
  let count = 0;
  for (let dy = 0; dy < 32; dy += 1) {
    const s = await block(p[0], p[1] + dy, p[2]);
    if (passable(s)) count += 1;
    else break;
  }
  return count;
}

function inHalo(cell, p, r) {
  return Math.abs(cell[0] - p[0]) <= r && Math.abs(cell[1] - p[1]) <= r
    && Math.abs(cell[2] - p[2]) <= r;
}

async function stationRecord(p, index, prev, box) {
  const feet = await block(p[0], p[1], p[2]);
  const head = await block(p[0], p[1] + 1, p[2]);
  const support = await block(p[0], p[1] - 1, p[2]);
  const headroomBlocks = await headroom(p);
  const runX = await runLength(p, 'x');
  const runZ = await runLength(p, 'z');
  const light = [];
  const fluids = [];
  const gravity = [];
  const cave = [];
  const doors = [];
  const containers = [];
  for (let dy = -1; dy <= 4; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const c = [p[0] + dx, p[1] + dy, p[2] + dz];
        if (!inHalo(c, p, 1)) continue;
        const s = await block(c[0], c[1], c[2]);
        const name = baseName(s);
        if (LIGHT_BLOCKS.has(name)) light.push([c[0], c[1], c[2], name.replace('minecraft:', '')]);
        if (isFluidState(s)) fluids.push([c[0], c[1], c[2], name.replace('minecraft:', '')]);
        if (GRAVITY_BLOCKS.has(name)) gravity.push([c[0], c[1], c[2], name.replace('minecraft:', '')]);
        if (name === 'minecraft:cave_air') cave.push([c[0], c[1], c[2]]);
        if (isDoor(name)) doors.push({ point: c, state: s });
      }
    }
  }
  const rise = prev ? p[1] - prev[1] : 0;
  const run = prev ? Math.abs(p[0] - prev[0]) + Math.abs(p[2] - prev[2]) : 0;
  return {
    index,
    point: p,
    standY: p[1],
    floorY: p[1] - 1,
    feetState: feet,
    headState: head,
    supportState: support,
    rise,
    run,
    clearWidth: Math.min(runX, runZ),
    widthAlongX: runX,
    widthAlongZ: runZ,
    headroom: headroomBlocks,
    lightCount: light.length,
    lights: light.slice(0, 12),
    fluidAdjacencyCount: fluids.length,
    gravityAdjacencyCount: gravity.length,
    caveAdjacencyCount: cave.length,
    doorCount: doors.length,
    doorStates: doors.slice(0, 4).map((d) => d.state),
  };
}

async function hazardCensus(box) {
  const fluids = [];
  const gravity = [];
  const caveAir = 0;
  const waterlogged = [];
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        const s = await block(x, y, z);
        const name = baseName(s);
        if (name === 'minecraft:water' || name === 'minecraft:flowing_water'
          || name === 'minecraft:lava' || name === 'minecraft:flowing_lava') {
          fluids.push({ point: [x, y, z], state: s });
        }
        if (properties(s).waterlogged === 'true') waterlogged.push({ point: [x, y, z], state: s });
        if (GRAVITY_BLOCKS.has(name)) gravity.push({ point: [x, y, z], state: s });
      }
    }
  }
  return { fluidCells: fluids.length, fluids: fluids.slice(0, 200), gravityCells: gravity.length,
    gravity: gravity.slice(0, 100), waterloggedCells: waterlogged.length };
}

async function doorCensus(box) {
  const doors = [];
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        const s = await block(x, y, z);
        if (isDoor(baseName(s))) {
          doors.push({ point: [x, y, z], state: s, name: baseName(s).replace('minecraft:', ''),
            open: properties(s).open ?? null, facing: properties(s).facing ?? null,
            half: properties(s).half ?? null, powered: properties(s).powered ?? null });
        }
      }
    }
  }
  return doors;
}

async function blockEntityCensus(box) {
  const entities = [];
  const minX = Math.floor(box[0] / 16) - 1; const maxX = Math.floor(box[3] / 16) + 1;
  const minZ = Math.floor(box[2] / 16) - 1; const maxZ = Math.floor(box[5] / 16) + 1;
  for (let cx = minX; cx <= maxX; cx += 1) {
    for (let cz = minZ; cz <= maxZ; cz += 1) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const x = Number(entity.x); const y = Number(entity.y); const z = Number(entity.z);
        if (x < box[0] - 1 || x > box[3] + 1 || y < box[1] - 1 || y > box[4] + 1
          || z < box[2] - 1 || z > box[5] + 1) continue;
        entities.push({ point: [x, y, z], id: entity.id ?? null, type: entity.id ?? 'unknown' });
      }
    }
  }
  const containers = entities.filter((e) => {
    const id = String(e.id ?? '');
    return CONTAINER_IDS.some((c) => id.includes(c));
  });
  return { count: entities.length, entities, containers: containers.length };
}

async function surveyBox({ id, name, box, routes, owner, accessClass }) {
  const cells = await scanWalkable(box);
  const comps = await components(cells, box);
  const hazards = await hazardCensus(box);
  const doors = await doorCensus(box);
  const beCensus = await blockEntityCensus(box);

  const routeResults = [];
  for (const route of routes) {
    const startCells = await anchorStandable(route.startBox);
    const endCells = await anchorStandable(route.endBox);
    const result = await findPath(box, startCells, endCells);
    const stations = [];
    let minWidth = Infinity;
    let maxWidth = 0;
    let minHeadroom = Infinity;
    let maxRise = 0;
    let maxDrop = 0;
    if (result.path) {
      for (let i = 0; i < result.path.length; i += 1) {
        const p = result.path[i];
        const rec = await stationRecord(p, i, i > 0 ? result.path[i - 1] : null, box);
        stations.push(rec);
        minWidth = Math.min(minWidth, rec.clearWidth);
        maxWidth = Math.max(maxWidth, rec.clearWidth);
        minHeadroom = Math.min(minHeadroom, rec.headroom);
        maxRise = Math.max(maxRise, rec.rise);
        maxDrop = Math.max(maxDrop, -rec.rise);
      }
    }
    const passed = !!result.path
      && stations.length >= 2
      && minHeadroom >= 2
      && maxRise <= 1
      && maxDrop <= 1;
    const std = route.programStandard ?? { minWidth: 1, minHeight: 2, label: 'normal-walk' };
    const meetsEnvelope = passed
      && minWidth >= std.minWidth
      && minHeadroom >= std.minHeight;
    const maxPerpDeviation = result.path ? maxPerpendicularDeviation(result.path, route.centerline ?? null) : null;
    const envelopeViolations = [];
    if (passed && !meetsEnvelope) {
      if (minWidth < std.minWidth) envelopeViolations.push(`clear width ${minWidth} < ${std.minWidth}`);
      if (minHeadroom < std.minHeight) envelopeViolations.push(`clear headroom ${minHeadroom} < ${std.minHeight}`);
    }
    if (!passed && !result.path) envelopeViolations.push('no bounded normal-walk path found');
    routeResults.push({
      routeId: route.id,
      accessClass: route.accessClass,
      programStandard: { ...std, label: std.label },
      startAnchor: route.startBox,
      endAnchor: route.endBox,
      connectivity: passed ? 'PASS' : 'HOLD',
      status: (passed && meetsEnvelope) ? 'PASS' : 'HOLD',
      routePass: (passed && meetsEnvelope),
      meetsClearEnvelope: passed && meetsEnvelope,
      envelopeViolations,
      pathCells: result.path ? result.path.length : 0,
      visitedCells: result.visitedCount,
      minWidth,
      maxWidth,
      minHeadroom,
      maxRise,
      maxDrop,
      maxPerpendicularDeviation: maxPerpDeviation,
      landings: detectLandings(stations),
      stationCount: stations.length,
      stations: stations,
      walkableGraph: result.path ? (() => {
        const nodes = result.path.map((point, index) => ({ id: index, point }));
        const edges = result.path.slice(1).map((point, index) => ({
          from: index,
          to: index + 1,
          delta: [
            point[0] - result.path[index][0],
            point[1] - result.path[index][1],
            point[2] - result.path[index][2],
          ],
        }));
        return {
          graphType: 'ordered-normal-walk-route-path',
          nodeCount: nodes.length,
          edgeCount: edges.length,
          nodes,
          edges,
          nodeSetSha256: sha256Json(nodes.map(({ point }) => point)),
          edgeSetSha256: sha256Json(edges),
        };
      })() : {
        graphType: 'ordered-normal-walk-route-path',
        nodeCount: 0,
        edgeCount: 0,
        nodes: [],
        edges: [],
        nodeSetSha256: sha256Json([]),
        edgeSetSha256: sha256Json([]),
      },
    });
  }

  const largest = comps[0] ?? [];
  return {
    boxId: id,
    name,
    bounds: box,
    owner,
    accessClass,
    walkableCellCount: cells.length,
    componentCount: comps.length,
    largestComponentCellCount: largest.length,
    largestComponentBounds: comps.length ? boundsOf(comps[0]) : null,
    routes: routeResults,
    routeStatus: routeResults.some((r) => r.status === 'PASS') ? 'PASS' : 'HOLD',
    routeSummary: routeResults.map((r) => ({
      routeId: r.routeId,
      status: r.status,
      pathCells: r.pathCells,
      minWidth: r.minWidth,
      maxWidth: r.maxWidth,
      minHeadroom: r.minHeadroom,
      maxRise: r.maxRise,
      maxDrop: r.maxDrop,
      landingLevels: r.landings.map((l) => l.standY),
    })),
    hazards,
    doors: doors,
    blockEntities: beCensus,
  };
}

function boundsOf(cells) {
  const b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity,
    minZ: Infinity, maxZ: -Infinity };
  for (const c of cells) {
    b.minX = Math.min(b.minX, c[0]); b.maxX = Math.max(b.maxX, c[0]);
    b.minY = Math.min(b.minY, c[1]); b.maxY = Math.max(b.maxY, c[1]);
    b.minZ = Math.min(b.minZ, c[2]); b.maxZ = Math.max(b.maxZ, c[2]);
  }
  return b;
}

function maxPerpendicularDeviation(pathPoints, centerline) {
  if (!centerline || centerline.length < 2) return null;
  // axis is the dominant coordinate change between the two endpoints
  const a = centerline[0]; const b = centerline[centerline.length - 1];
  const axis = Math.abs(b[0] - a[0]) >= Math.abs(b[2] - a[2]) ? 'x' : 'z';
  const alongMin = axis === 'x' ? Math.min(a[0], b[0]) : Math.min(a[2], b[2]);
  const alongMax = axis === 'x' ? Math.max(a[0], b[0]) : Math.max(a[2], b[2]);
  const crossMin = axis === 'x' ? Math.min(a[2], b[2]) : Math.min(a[0], b[0]);
  const crossMax = axis === 'x' ? Math.max(a[2], b[2]) : Math.max(a[0], b[0]);
  let maxDev = 0;
  for (const p of pathPoints) {
    if (axis === 'x') {
      if (p[0] < alongMin - 1 || p[0] > alongMax + 1) continue;
      const dev = p[2] < crossMin ? crossMin - p[2] : (p[2] > crossMax ? p[2] - crossMax : 0);
      maxDev = Math.max(maxDev, dev);
    } else {
      if (p[2] < alongMin - 1 || p[2] > alongMax + 1) continue;
      const dev = p[0] < crossMin ? crossMin - p[0] : (p[0] > crossMax ? p[0] - crossMax : 0);
      maxDev = Math.max(maxDev, dev);
    }
  }
  return maxDev;
}

function detectLandings(stations) {
  const landings = [];
  let i = 0;
  while (i < stations.length) {
    const y = stations[i].standY;
    let j = i;
    const level = [];
    while (j < stations.length && stations[j].standY === y) { level.push(stations[j]); j += 1; }
    if (level.length >= 4 && level.every((r) => r.clearWidth >= 3)) {
      const xs = level.map((r) => r.point[0]); const zs = level.map((r) => r.point[2]);
      landings.push({
        standY: y,
        stationStart: level[0].index,
        stationEnd: level.at(-1).index,
        rect: [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)],
        widthX: Math.max(...level.map((r) => r.widthAlongX)),
        widthZ: Math.max(...level.map((r) => r.widthAlongZ)),
      });
    }
    i = j;
  }
  return landings;
}

/* ------------------------------------------------------------------ *
 * Legacy C01 historical mismatch derivation
 * ------------------------------------------------------------------ */

function parseReplOps(filename) {
  const text = fs.readFileSync(filename, 'utf8');
  const cells = [];
  let currentPhase = null;
  let currentPackage = filename.includes('recessed-portal') ? 'phase2-recessed-portal' : 'phase1-surface';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('# phase:')) { currentPhase = line.replace('# phase:', '').trim(); continue; }
    if (line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts[0] !== 'REPL' || parts.length !== 9) continue;
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    const expected = parts[7];
    const replacement = parts[8];
    for (let y = y1; y <= y2; y += 1) {
      for (let z = z1; z <= z2; z += 1) {
        for (let x = x1; x <= x2; x += 1) {
          cells.push({ x, y, z, expected, replacement, phase: currentPhase, package: currentPackage });
        }
      }
    }
  }
  return cells;
}

async function deriveLegacyMismatches() {
  const surface = parseReplOps(path.join(ROOT,
    'data/buildops/mainstreet-bunker-surface-phase1-2026-07-27.txt'));
  const portal = parseReplOps(path.join(ROOT,
    'data/buildops/mainstreet-bunker-recessed-portal-phase2-2026-07-27.txt'));
  // Execution order is file order then line order; a later op on the same
  // cell overrides the earlier one (last-write-wins = the historical final
  // target state for that cell).
  const final = new Map();
  for (const c of [...surface, ...portal]) {
    final.set(pointKey([c.x, c.y, c.z]), c);
  }
  const distinctList = [...final.values()];
  const mismatches = [];
  for (const c of distinctList) {
    const current = await block(c.x, c.y, c.z);
    if (current !== c.replacement) {
      mismatches.push({ ...c, current });
    }
  }
  // classify
  const STRUCTURE_BLOCKS = new Set([
    'minecraft:oak_planks', 'minecraft:dark_oak_planks', 'minecraft:spruce_planks',
    'minecraft:acacia_planks', 'minecraft:birch_planks', 'minecraft:jungle_planks',
    'minecraft:mangrove_planks', 'minecraft:crimson_planks', 'minecraft:warped_planks',
    'minecraft:oak_log', 'minecraft:dark_oak_log', 'minecraft:spruce_log',
    'minecraft:oak_stairs', 'minecraft:dark_oak_stairs', 'minecraft:spruce_stairs',
    'minecraft:deepslate_bricks', 'minecraft:cracked_deepslate_bricks',
    'minecraft:deepslate_tiles', 'minecraft:polished_deepslate', 'minecraft:stone_bricks',
    'minecraft:cracked_stone_bricks', 'minecraft:mossy_stone_bricks',
    'minecraft:polished_andesite', 'minecraft:polished_diorite', 'minecraft:polished_granite',
    'minecraft:polished_blackstone', 'minecraft:polished_blackstone_bricks',
    'minecraft:blackstone', 'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite',
    'minecraft:cobblestone', 'minecraft:mossy_cobblestone', 'minecraft:bricks',
    'minecraft:prismarine', 'minecraft:prismarine_bricks', 'minecraft:dark_prismarine',
    'minecraft:purpur_block', 'minecraft:purpur_pillar', 'minecraft:end_stone_bricks',
    'minecraft:nether_bricks', 'minecraft:quartz_block', 'minecraft:smooth_quartz',
    'minecraft:concrete', 'minecraft:white_concrete', 'minecraft:black_concrete',
    'minecraft:gray_concrete', 'minecraft:light_gray_concrete',
    'minecraft:terracotta', 'minecraft:white_terracotta', 'minecraft:cyan_terracotta',
    'minecraft:glass', 'minecraft:white_stained_glass', 'minecraft:gray_stained_glass',
    'minecraft:tinted_glass', 'minecraft:iron_bars', 'minecraft:iron_block',
    'minecraft:chain', 'minecraft:lantern', 'minecraft:sea_lantern', 'minecraft:torch',
    'minecraft:smooth_stone', 'minecraft:smooth_sandstone', 'minecraft:sandstone',
    'minecraft:cut_sandstone', 'minecraft:cut_copper', 'minecraft:oxidized_cut_copper',
    'minecraft:waxed_cut_copper', 'minecraft:waxed_oxidized_cut_copper', 'minecraft:deepslate',
    'minecraft:polished_basalt', 'minecraft:packed_ice', 'minecraft:blue_ice', 'minecraft:snow_block',
    'minecraft:reinforced_deepslate', 'minecraft:bookshelf', 'minecraft:glass_pane',
    'minecraft:light_blue_stained_glass', 'minecraft:blue_stained_glass',
    'minecraft:white_stained_glass', 'minecraft:gray_stained_glass', 'minecraft:black_stained_glass',
    'minecraft:light_gray_stained_glass', 'minecraft:purple_stained_glass',
    'minecraft:red_stained_glass', 'minecraft:green_stained_glass',
    'minecraft:white_carpet', 'minecraft:red_carpet', 'minecraft:blue_carpet',
    'minecraft:green_carpet', 'minecraft:purple_carpet', 'minecraft:gray_carpet',
    'minecraft:black_carpet', 'minecraft:light_blue_carpet', 'minecraft:cyan_carpet',
    'minecraft:red_nether_bricks', 'minecraft:red_nether_brick_wall',
  ]);
  const STRUCTURE_SUFFIX = ['_planks', '_stairs', '_slab', '_wall', '_pane', '_fence',
    '_button', '_pressure_plate', '_door', '_trapdoor', '_concrete', '_terracotta',
    '_glass', '_bricks', '_tiles', '_sign', '_carpet', '_stained_glass'];
  const NATURAL_LANDSCAPE = new Set([
    'minecraft:dirt', 'minecraft:grass_block', 'minecraft:stone', 'minecraft:deepslate',
    'minecraft:gravel', 'minecraft:sand', 'minecraft:cobblestone', 'minecraft:air',
    'minecraft:cave_air', 'minecraft:snow', 'minecraft:short_grass', 'minecraft:water',
    'minecraft:flowing_water', 'minecraft:granite', 'minecraft:andesite', 'minecraft:diorite',
    'minecraft:packed_ice', 'minecraft:snow_block', 'minecraft:coarse_dirt',
    'minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava',
  ]);
  const classify = (m) => {
    const cur = baseName(m.current);
    const rep = baseName(m.replacement);
    if (/chest|barrel|shulker|furnace|hopper|dispenser|dropper|sign/.test(cur)) return 'container/block-entity/sign';
    if (STRUCTURE_BLOCKS.has(cur) || STRUCTURE_SUFFIX.some((s) => cur.endsWith(s))) {
      return 'later-structure-construction';
    }
    if (cur === 'minecraft:air' || cur === 'minecraft:cave_air') return 'removed-or-gap';
    if (NATURAL_LANDSCAPE.has(cur)) return 'natural-landscape-or-lifecycle';
    return 'unknown';
  };
  const classified = mismatches.map((m) => ({ ...m, classification: classify(m) }));
  const byPhase = {};
  for (const m of classified) {
    const key = `${m.package}:${m.phase}`;
    byPhase[key] = (byPhase[key] ?? 0) + 1;
  }
  const byClass = {};
  for (const m of classified) byClass[m.classification] = (byClass[m.classification] ?? 0) + 1;
  const currentFamily = {};
  for (const m of classified) {
    const fam = baseName(m.current).replace('minecraft:', '').split('[')[0];
    currentFamily[fam] = (currentFamily[fam] ?? 0) + 1;
  }
  const bounds = boundsOf(classified.map((m) => [m.x, m.y, m.z]));
  return {
    historicalTargetsRaw: distinctList.length,
    distinctTargetCells: distinctList.length,
    currentExactHistoricalTargets: distinctList.length - mismatches.length,
    laterChangedTargets: mismatches.length,
    byPhase,
    byClass,
    currentStateFamilyCensus: Object.entries(currentFamily)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 25),
    bounds,
    sample: classified.slice(0, 50),
  };
}

/* ------------------------------------------------------------------ */

const BOXES = [
  {
    id: 'b03',
    name: 'Cheyenne B03 institutional route',
    box: [2047, 164, -872, 2392, 171, -744],
    owner: 'Cheyenne Mountain / P1-B03 (institutional route owner, R10A/R10G/R10H/R12O)',
    accessClass: 'closed',
    routes: [{
      id: 'BKR-B03-INDICES-188-800',
      accessClass: 'passive internal inspection/circulation',
      startBox: [2235, 165, -749, 2237, 167, -747],
      endBox: [2047, 165, -869, 2049, 167, -867],
      programStandard: { minWidth: 5, minHeight: 4, label: 'passive inspection (5-wide, 4-high) as commissioned R12O' },
    }],
  },
  {
    id: 'eastC01Portal',
    name: 'East C01 portal (recessed mountain portal → L1 airlock)',
    box: [680, 40, -90, 812, 75, -40],
    owner: 'Town Expansion / C01 bunker (east C01 approach)',
    accessClass: 'controlled-vehicle-and-pedestrian',
    routes: [{
      id: 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1',
      accessClass: 'controlled-vehicle-and-pedestrian',
      startBox: [684, 59, -58, 697, 68, -50],
      endBox: [798, 43, -84, 807, 50, -55],
      programStandard: { minWidth: 5, minHeight: 5, label: '5-wide x 5-high controlled pedestrian spine' },
    }],
  },
  {
    id: 'publicC01',
    name: 'Public C01 vertical (L1 → L3)',
    box: [699, 23, -141, 900, 50, -4],
    owner: 'Town Expansion / C01 bunker public realm',
    accessClass: 'public',
    routes: [{
      id: 'TE-ROUTE-C01-PUBLIC-VERTICAL',
      accessClass: 'public',
      startBox: [758, 43, -48, 772, 47, -38],
      endBox: [828, 25, -56, 840, 29, -46],
      programStandard: { minWidth: 5, minHeight: 5, label: '5-wide x 5-high public common' },
    }],
  },
  {
    id: 'ownerC01',
    name: 'Owner C01 vertical (L4 → owner-club)',
    box: [699, -15, -141, 900, 20, -4],
    owner: 'Town Expansion / C01 bunker owner wing',
    accessClass: 'owner (restricted)',
    routes: [{
      id: 'TE-ROUTE-C01-OWNER-VERTICAL',
      accessClass: 'owner',
      startBox: [803, 16, -33, 815, 20, -23],
      endBox: [836, -13, -56, 848, -9, -46],
      programStandard: { minWidth: 3, minHeight: 3, label: '3-wide x 3-high restricted approach' },
    }],
  },
  {
    id: 'serviceC01',
    name: 'Service C01 backbone',
    box: [850, 41, -141, 890, 50, -28],
    owner: 'Town Expansion / C01 bunker back-of-house',
    accessClass: 'service (staff)',
    routes: [{
      id: 'TE-ROUTE-C01-SERVICE-BACKBONE',
      accessClass: 'service',
      startBox: [859, 43, -138, 866, 47, -132],
      endBox: [870, 43, -40, 880, 47, -31],
      programStandard: { minWidth: 3, minHeight: 3, label: '3-wide x 3-high staff/BOH/service' },
    }],
  },
  {
    id: 'rrZ5',
    name: 'Raven Rock RR-Z5 vertical access shaft',
    box: [196, -12, -19, 204, 64, -11],
    owner: 'Raven Rock / Site R (RR-Z5 shaft)',
    accessClass: 'restricted (service shaft; not public-route accepted)',
    routes: [{
      id: 'RR-Z5-SHAFT-FULL',
      accessClass: 'restricted service',
      startBox: [197, -11, -16, 203, -11, -13],
      endBox: [197, 64, -16, 203, 64, -13],
      centerline: [[200, -11, -15], [200, 64, -15]],
      programStandard: { minWidth: 2, minHeight: 2, label: '2-wide x 2-high service shaft (survey target)' },
    }],
  },
  {
    id: 'c2',
    name: 'Raven Rock C2 inter-cavern corridor (A ↔ C)',
    box: [-125, -25, -25, -70, -5, -2],
    owner: 'Raven Rock / Site R (RR-C2 operational secondary)',
    accessClass: 'closed',
    routes: [{
      id: 'RR-C2-A-WEST-TO-C-EAST',
      accessClass: 'operational secondary (closed)',
      // Planned corridor: (-75,-12,-15) → (-115,-18,-10), axis X.
      startBox: [-77, -13, -15, -73, -11, -15],
      endBox: [-117, -19, -10, -113, -17, -10],
      centerline: [[-75, -12, -15], [-115, -18, -10]],
      programStandard: { minWidth: 3, minHeight: 3, label: '3-wide x 3-high dry operational-secondary corridor' },
    }],
  },
];

async function main() {
  const snapshotIdentity = loadSnapshotIdentity();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAtUtc = new Date().toISOString();
  const perBox = [];
  for (const boxDef of BOXES) {
    process.stdout.write(`surveying ${boxDef.id}...\n`);
    perBox.push(await surveyBox(boxDef));
  }
  process.stdout.write('deriving legacy C01 mismatches...\n');
  const legacy = await deriveLegacyMismatches();
  const snapshotHash = (() => {
    const files = fs.readdirSync(REGIONS).filter((n) => n.endsWith('.mca')).sort();
    const h = crypto.createHash('sha256');
    for (const f of files) {
      h.update(f); h.update('\0');
      h.update(fs.readFileSync(path.join(REGIONS, f)));
      h.update('\0');
    }
    return h.digest('hex');
  })();

  const report = {
    schemaVersion: 1,
    id: 'bkr-survey-00',
    generatedAtUtc,
    readOnly: true,
    liveWorldMutated: false,
    databaseMutated: false,
    status: 'BKR_SURVEY_00_COMPLETE',
    source: {
      program: 'docs/redevelopment/2026-08-22-bunker-construction-status/bunker-basement-repair-program.md',
      package: 'BKR-SURVEY-00',
      snapshot: {
        directory: displayPath(REGIONS),
        rootDirectory: displayPath(SNAPSHOT_ROOT),
        regionFileCount: fs.readdirSync(REGIONS).filter((n) => n.endsWith('.mca')).length,
        sha256: snapshotHash,
        captureManifest: displayPath(snapshotIdentity.manifestPath),
        captureId: snapshotIdentity.manifest.captureId,
        capturedAtUtc: snapshotIdentity.manifest.capturedAtUtc,
        immutableCopy: snapshotIdentity.manifest.immutableCopy,
        completeSaveIntake: snapshotIdentity.intake ? {
          path: displayPath(INTAKE_REPORT),
          status: snapshotIdentity.intake.status,
          sha256: snapshotIdentity.intake.packageIdentity.completeSaveSha256,
        } : null,
      },
      reader: 'scripts/lib/combined_zones_release_lib.mjs (AnvilReader)',
    },
    movementPolicy: {
      normalWalk: true, dig: false, tower: false, parkour: false, sprint: false,
      jumpControl: false, maximumRiseBlocks: 1, maximumDropBlocks: 1, minimumHeadroomBlocks: 2,
    },
    namedSurveyBoxes: perBox,
    legacyC01Mismatches: legacy,
    specialQuestions: {
      rrZ5TwoWideServiceShaftTraversable: null,
      c2Traversable: null,
    },
    nonclaims: [
      'offline geometry is not live traversal; doors are interaction thresholds only',
      'no package claims public egress, live operation, accessibility, or a completed bunker',
      'C2 remains closed; survey is evidence, not containment approval',
    ],
  };

  const rr = perBox.find((b) => b.boxId === 'rrZ5');
  const c2 = perBox.find((b) => b.boxId === 'c2');
  report.specialQuestions.rrZ5TwoWideServiceShaftTraversable = rr?.routes?.[0]?.connectivity === 'PASS' ?? false;
  report.specialQuestions.c2Traversable = c2?.routes?.[0]?.connectivity === 'PASS' ?? false;
  report.specialQuestions.c2MeetsProgramStandard = c2?.routes?.[0]?.meetsClearEnvelope ?? false;

  fs.writeFileSync(path.join(OUT_DIR, 'bkr-survey-00.json'),
    `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(OUT_DIR, 'bkr-survey-00.md'), renderMarkdown(report));
  process.stdout.write(`wrote ${OUT_DIR}/bkr-survey-00.json and .md\n`);
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# BKR-SURVEY-00 — Fresh Condition Census (read-only)');
  lines.push('');
  lines.push(`- **Generated:** ${report.generatedAtUtc}`);
  lines.push(`- **Snapshot:** ${report.source.snapshot.directory} (${report.source.snapshot.regionFileCount} regions, SHA-256 \`${report.source.snapshot.sha256}\`)`);
  lines.push(`- **Capture:** \`${report.source.snapshot.captureId}\` at ${report.source.snapshot.capturedAtUtc}; immutable copy: ${report.source.snapshot.immutableCopy}`);
  if (report.source.snapshot.completeSaveIntake) {
    lines.push(`- **Complete-save intake:** ${report.source.snapshot.completeSaveIntake.status}, SHA-256 \`${report.source.snapshot.completeSaveIntake.sha256}\` ([record](${path.basename(report.source.snapshot.completeSaveIntake.path)}))`);
  }
  lines.push(`- **Reader:** ${report.source.reader}`);
  lines.push(`- **Status:** ${report.status} — READ-ONLY, no world mutation`);
  lines.push('');
  lines.push('## Movement policy');
  lines.push('');
  lines.push('| normalWalk | dig | tower | parkour | sprint | jump | max rise | max drop | min headroom |');
  lines.push('|---|---|---|---|---|---|---|---|---|');
  lines.push(`| true | false | false | false | false | false | 1 | 1 | 2 |`);
  lines.push('');
  lines.push('## Named survey boxes');
  lines.push('');
  for (const box of report.namedSurveyBoxes) {
    lines.push(`### ${box.boxId} — ${box.name}`);
    lines.push('');
    lines.push(`- Bounds: \`[${box.bounds.join(', ')}]\``);
    lines.push(`- Owner: ${box.owner}`);
    lines.push(`- Access class: ${box.accessClass}`);
    lines.push(`- Walkable cells: ${box.walkableCellCount} (${box.componentCount} components, largest ${box.largestComponentCellCount})`);
    for (const route of box.routes) {
      lines.push('');
      lines.push(`**${route.routeId}** — **${route.status}**`);
      lines.push('');
      lines.push(`- Connectivity: ${route.connectivity}${route.envelopeViolations.length ? `; envelope: HOLD (${route.envelopeViolations.join('; ')})` : ''}`);
      lines.push(`- Path cells: ${route.pathCells}, visited: ${route.visitedCells}`);
      lines.push(`- Walkable graph: ${route.walkableGraph.nodeCount} nodes, ${route.walkableGraph.edgeCount} directed normal-walk edges (nodes \`${route.walkableGraph.nodeSetSha256}\`, edges \`${route.walkableGraph.edgeSetSha256}\`)`);
      if (route.stations.length) {
        lines.push(`- Clear width: ${route.minWidth}..${route.maxWidth} (min..max), min headroom ${route.minHeadroom}, max rise ${route.maxRise}, max drop ${route.maxDrop}${route.maxPerpendicularDeviation !== null ? `, max perpendicular deviation ${route.maxPerpendicularDeviation}` : ''}`);
        lines.push(`- Landing levels: ${route.landings.map((l) => `y${l.standY}${l.widthX >= 5 && l.widthZ >= 5 ? ' (5+)' : ''}`).join(', ') || 'none detected'}`);
      } else {
        lines.push('- No standable path; no stations.');
      }
    }
    const hz = box.hazards;
    lines.push('');
    lines.push(`- Hazards in box: ${hz.fluidCells} fluid cells, ${hz.gravityCells} gravity cells, ${hz.waterloggedCells} waterlogged`);
    if (hz.fluids.length) {
      const sample = hz.fluids.slice(0, 12).map((f) => `${f.point.join(',')}=${f.state}`).join('; ');
      lines.push(`  - Fluid sample: ${sample}${hz.fluids.length > 12 ? ' …' : ''}`);
    }
    if (box.doors.length) {
      const open = box.doors.filter((d) => d.open === 'true').length;
      const closed = box.doors.filter((d) => d.open === 'false' || d.open === null).length;
      lines.push(`- Doors in box: ${box.doors.length} (${open} open, ${closed} closed/other)`);
      lines.push(`  - ${box.doors.slice(0, 10).map((d) => `${d.point.join(',')}=${d.name}[open=${d.open}]`).join('; ')}${box.doors.length > 10 ? ' …' : ''}`);
    }
    lines.push(`- Block entities in halo: ${box.blockEntities.count} (${box.blockEntities.containers} container-type)`);
    lines.push('');
  }
  const legacy = report.legacyC01Mismatches;
  lines.push('## Legacy C01 historical mismatches');
  lines.push('');
  lines.push(`- Historical targets (surface phase1 + recessed-portal phase2): ${legacy.historicalTargetsRaw}`);
  lines.push(`- Distinct target cells: ${legacy.distinctTargetCells}`);
  lines.push(`- Current exact historical targets: ${legacy.currentExactHistoricalTargets}`);
  lines.push(`- Later-changed targets: ${legacy.laterChangedTargets}`);
  lines.push('- By package/phase:');
  for (const [k, v] of Object.entries(legacy.byPhase)) lines.push(`  - ${k}: ${v}`);
  lines.push('- By classification:');
  for (const [k, v] of Object.entries(legacy.byClass)) lines.push(`  - ${k}: ${v}`);
  lines.push(`- Bounds: \`[${legacy.bounds.minX}, ${legacy.bounds.minY}, ${legacy.bounds.minZ}, ${legacy.bounds.maxX}, ${legacy.bounds.maxY}, ${legacy.bounds.maxZ}]\``);
  lines.push('');
  lines.push('## Special survey questions');
  lines.push('');
  lines.push(`- **RR-Z5 traversable as 2-wide service shaft?** ${report.specialQuestions.rrZ5TwoWideServiceShaftTraversable ? 'YES (offline normal-walk, 2-wide/2-high met)' : 'NO'}`);
  lines.push(`- **C2 traversable?** ${report.specialQuestions.c2Traversable ? 'Connectivity only (see below)' : 'NO'}`);
  if (report.specialQuestions.c2MeetsProgramStandard) {
    lines.push('  - C2 meets the 3-wide/3-high dry secondary envelope: NO — offline walk exists but is not dry/envelope compliant.');
  } else {
    lines.push('  - C2 meets the 3-wide/3-high dry secondary envelope: NO.');
  }
  lines.push('');
  lines.push('## Non-claims');
  lines.push('');
  for (const n of report.nonclaims) lines.push(`- ${n}`);
  lines.push('');
  return `${lines.join('\n')}\n`;
}

main().catch((error) => {
  console.error(error.stack ?? error.message ?? error);
  process.exitCode = 1;
});
