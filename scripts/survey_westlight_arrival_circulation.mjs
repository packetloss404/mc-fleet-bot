#!/usr/bin/env node
/**
 * CIRC-WL-ARRIVAL-01 — snapshot-bound Westlight arrival and event circulation survey.
 *
 * This is deliberately a survey/compiler, not a build operation.  It reads a
 * copied immutable Anvil snapshot and produces exact normal-walk paths and
 * cross-section failures for the Approach Road / Gatehead / Westlight district
 * / venue interface.  A path here is not an egress acceptance: public routes
 * still require owner closure, live bidirectional walks, lighting, door,
 * landing and event-mode review before they can be commissioned.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regionsValue = value('--regions');
const outValue = value('--out');

if (!regionsValue || !outValue) {
  throw new Error('Usage: node scripts/survey_westlight_arrival_circulation.mjs --regions <region-dir> --out <fresh-output-dir>');
}

const REGIONS = path.resolve(ROOT, regionsValue);
const OUT = path.resolve(ROOT, outValue);
if (!fs.existsSync(REGIONS)) throw new Error(`region directory does not exist: ${REGIONS}`);
if (fs.existsSync(OUT)) throw new Error(`output must be a fresh directory: ${OUT}`);

const AIR = new Set([
  'minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light',
]);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const LIGHT = new Set([
  'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:sea_lantern',
  'minecraft:glowstone', 'minecraft:shroomlight', 'minecraft:end_rod',
  'minecraft:ochre_froglight', 'minecraft:verdant_froglight', 'minecraft:pearlescent_froglight',
]);

function snapshotIdentity(directory) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return {
    sha256: hash.digest('hex'),
    regionFileCount: files.length,
    bytes,
    algorithm: 'sha256(filename + NUL + bytes + NUL, sorted by filename)',
  };
}

function key(point) {
  return `${point.x},${point.y},${point.z}`;
}

function coord(point) {
  return [point.x, point.y, point.z];
}

function distanceSq(point, target) {
  return (point.x - target[0]) ** 2 + (point.y - target[1]) ** 2 + (point.z - target[2]) ** 2;
}

function isPassable(state) {
  if (AIR.has(state.Name)) return true;
  if (state.Name.endsWith('_door')) return state.Properties?.open === 'true';
  if (state.Name.endsWith('_trapdoor')) return state.Properties?.open === 'true';
  return false;
}

function isFloor(state) {
  return !AIR.has(state.Name) && !FLUID.has(state.Name);
}

const reader = new AnvilReader(REGIONS);
const cache = new Map();
async function stateAt(x, y, z) {
  const id = `${x},${y},${z}`;
  if (!cache.has(id)) cache.set(id, reader.blockState(x, y, z));
  return cache.get(id);
}

async function standingAt(x, y, z) {
  const [floor, feet, head] = await Promise.all([
    stateAt(x, y - 1, z), stateAt(x, y, z), stateAt(x, y + 1, z),
  ]);
  return isFloor(floor) && isPassable(feet) && isPassable(head);
}

async function fiveHighColumn(x, y, z) {
  for (let dy = 0; dy < 5; dy += 1) {
    if (!isPassable(await stateAt(x, y + dy, z))) return false;
  }
  return true;
}

async function localLightCount(point) {
  let count = 0;
  for (let x = point.x - 3; x <= point.x + 3; x += 1) {
    for (let y = point.y - 1; y <= point.y + 4; y += 1) {
      for (let z = point.z - 3; z <= point.z + 3; z += 1) {
        const state = await stateAt(x, y, z);
        if (LIGHT.has(state.Name) || state.Name.endsWith('_torch')) count += 1;
      }
    }
  }
  return count;
}

async function findAnchor(spec) {
  const candidates = [];
  for (let x = spec.target[0] - spec.radius; x <= spec.target[0] + spec.radius; x += 1) {
    for (let y = spec.target[1] - spec.vertical; y <= spec.target[1] + spec.vertical; y += 1) {
      for (let z = spec.target[2] - spec.radius; z <= spec.target[2] + spec.radius; z += 1) {
        const point = { x, y, z };
        if (await standingAt(x, y, z)) candidates.push(point);
      }
    }
  }
  candidates.sort((left, right) => distanceSq(left, spec.target) - distanceSq(right, spec.target));
  return candidates[0] ?? null;
}

async function neighbors(point, bounds) {
  const result = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [0, 1, -1]) {
      const next = { x: point.x + dx, y: point.y + dy, z: point.z + dz };
      if (
        next.x < bounds.minX || next.x > bounds.maxX
        || next.y < bounds.minY || next.y > bounds.maxY
        || next.z < bounds.minZ || next.z > bounds.maxZ
      ) continue;
      if (await standingAt(next.x, next.y, next.z)) result.push(next);
    }
  }
  return result;
}

async function findPath(from, to, bounds) {
  const queue = [from];
  const previous = new Map([[key(from), null]]);
  let cursor = 0;
  const target = key(to);
  const maxVisited = 350_000;
  while (cursor < queue.length && queue.length <= maxVisited) {
    const point = queue[cursor++];
    if (key(point) === target) break;
    for (const next of await neighbors(point, bounds)) {
      const id = key(next);
      if (previous.has(id)) continue;
      previous.set(id, point);
      queue.push(next);
    }
  }
  if (!previous.has(target)) {
    return {
      path: null,
      visited: previous.size,
      exhaustedLimit: queue.length > maxVisited,
      reachable: [...previous.values()].filter(Boolean),
    };
  }
  const route = [];
  for (let current = to; current; current = previous.get(key(current))) route.push(current);
  route.reverse();
  return { path: route, visited: previous.size, exhaustedLimit: false };
}

function nearestComponentGap(fromPoints, toPoints, maximumStep = 12) {
  const target = new Map(toPoints.map((point) => [key(point), point]));
  for (let distance = 1; distance <= maximumStep; distance += 1) {
    for (const point of fromPoints) {
      for (let dx = -distance; dx <= distance; dx += 1) {
        for (let dy = -distance; dy <= distance; dy += 1) {
          for (let dz = -distance; dz <= distance; dz += 1) {
            if (Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dz)) !== distance) continue;
            const candidate = target.get(`${point.x + dx},${point.y + dy},${point.z + dz}`);
            if (!candidate) continue;
            return {
              chebyshevGap: distance,
              fromFrontier: coord(point),
              toFrontier: coord(candidate),
              delta: [candidate.x - point.x, candidate.y - point.y, candidate.z - point.z],
            };
          }
        }
      }
    }
  }
  return null;
}

async function crossSection(point, previous, next) {
  const inDx = point.x - previous.x;
  const inDz = point.z - previous.z;
  const outDx = next.x - point.x;
  const outDz = next.z - point.z;
  const straightEastWest = point.y === previous.y && point.y === next.y
    && Math.abs(inDx) === 1 && inDx === outDx && inDz === 0 && outDz === 0;
  const straightNorthSouth = point.y === previous.y && point.y === next.y
    && Math.abs(inDz) === 1 && inDz === outDz && inDx === 0 && outDx === 0;
  if (!straightEastWest && !straightNorthSouth) {
    return { point: coord(point), kind: 'vertical-or-turn', publicEnvelope: false, lightCount: await localLightCount(point) };
  }
  const offsets = straightEastWest
    ? [[0, -2], [0, -1], [0, 0], [0, 1], [0, 2]]
    : [[-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0]];
  const clearColumns = [];
  for (const [ox, oz] of offsets) {
    clearColumns.push(await fiveHighColumn(point.x + ox, point.y, point.z + oz));
  }
  return {
    point: coord(point),
    kind: straightEastWest ? 'east-west' : 'north-south',
    publicEnvelope: clearColumns.every(Boolean),
    clearColumns,
    lightCount: await localLightCount(point),
  };
}

const anchors = [
  { id: 'approach-road', classification: 'public-arrival', target: [-344, 69, -492], radius: 8, vertical: 6 },
  { id: 'gatehead-plaza', classification: 'public-arrival', target: [-338, 69, -484], radius: 8, vertical: 6 },
  // The existing venue arrival is on the east/north facade.  Gatehead is a
  // district anchor, not automatically the venue door; retain both anchors so
  // the survey catches a missing district-to-venue connection without inventing
  // one from nearby bounding boxes.
  { id: 'east-arrival', classification: 'public-arrival', target: [-284, 69, -495], radius: 10, vertical: 6 },
  { id: 'bowl-east-concourse', classification: 'venue-public', target: [-284, 69, -501], radius: 10, vertical: 6 },
  { id: 'bowl-main-concourse', classification: 'venue-public', target: [-394, 69, -560], radius: 14, vertical: 8 },
  { id: 'west-service-concourse', classification: 'staff', target: [-437, 66, -538], radius: 8, vertical: 6 },
  { id: 'west-service-base', classification: 'staff', target: [-437, 19, -538], radius: 8, vertical: 6 },
  { id: 'bowl-upper-concourse', classification: 'venue-public', target: [-394, 77, -560], radius: 14, vertical: 8 },
  { id: 'theatre-lower-lobby', classification: 'venue-public', target: [-390, 20, -556], radius: 12, vertical: 6 },
  { id: 'theatre-upper-lobby', classification: 'venue-public', target: [-390, 42, -556], radius: 12, vertical: 6 },
  { id: 'members-club', classification: 'controlled', target: [-412, 37, -558], radius: 6, vertical: 4 },
  { id: 'backstage-service', classification: 'staff', target: [-330, 20, -556], radius: 12, vertical: 6 },
];

const routeSpecs = [
  { id: 'arrival-to-gatehead', from: 'approach-road', to: 'gatehead-plaza', class: 'public-arrival', bounds: { minX: -354, maxX: -316, minY: 62, maxY: 90, minZ: -510, maxZ: -468 } },
  { id: 'approach-to-east-arrival', from: 'approach-road', to: 'east-arrival', class: 'public-arrival', bounds: { minX: -354, maxX: -270, minY: 62, maxY: 90, minZ: -510, maxZ: -468 } },
  { id: 'gatehead-to-east-arrival', from: 'gatehead-plaza', to: 'east-arrival', class: 'district-to-venue-interface', bounds: { minX: -354, maxX: -270, minY: 62, maxY: 90, minZ: -510, maxZ: -468 } },
  { id: 'east-arrival-to-bowl', from: 'east-arrival', to: 'bowl-east-concourse', class: 'public-arrival', bounds: { minX: -300, maxX: -270, minY: 62, maxY: 90, minZ: -520, maxZ: -470 } },
  { id: 'east-arrival-to-bowl-main', from: 'bowl-east-concourse', to: 'bowl-main-concourse', class: 'venue-public', bounds: { minX: -440, maxX: -270, minY: 52, maxY: 95, minZ: -640, maxZ: -470 } },
  { id: 'bowl-main-to-upper', from: 'bowl-main-concourse', to: 'bowl-upper-concourse', class: 'venue-public', bounds: { minX: -440, maxX: -350, minY: 52, maxY: 95, minZ: -640, maxZ: -484 } },
  { id: 'theatre-lower-to-upper', from: 'theatre-lower-lobby', to: 'theatre-upper-lobby', class: 'venue-public', bounds: { minX: -430, maxX: -350, minY: 15, maxY: 52, minZ: -620, maxZ: -490 } },
  { id: 'theatre-public-to-backstage', from: 'theatre-lower-lobby', to: 'backstage-service', class: 'boundary-test', bounds: { minX: -430, maxX: -290, minY: 15, maxY: 52, minZ: -620, maxZ: -490 } },
  { id: 'backstage-to-west-service', from: 'backstage-service', to: 'west-service-concourse', class: 'staff-service', bounds: { minX: -450, maxX: -290, minY: 15, maxY: 70, minZ: -620, maxZ: -490 } },
  { id: 'backstage-to-west-service-base', from: 'backstage-service', to: 'west-service-base', class: 'staff-service', bounds: { minX: -450, maxX: -290, minY: 15, maxY: 30, minZ: -620, maxZ: -490 } },
  { id: 'west-service-base-to-concourse', from: 'west-service-base', to: 'west-service-concourse', class: 'staff-vertical', bounds: { minX: -450, maxX: -425, minY: 15, maxY: 70, minZ: -555, maxZ: -525 } },
  { id: 'members-club-to-bowl', from: 'members-club', to: 'bowl-main-concourse', class: 'controlled-boundary-test', bounds: { minX: -430, maxX: -350, minY: 30, maxY: 95, minZ: -580, maxZ: -540 } },
];

const resolved = {};
for (const anchor of anchors) resolved[anchor.id] = await findAnchor(anchor);

const routes = [];
for (const spec of routeSpecs) {
  const from = resolved[spec.from];
  const to = resolved[spec.to];
  if (!from || !to) {
    routes.push({
      id: spec.id,
      class: spec.class,
      status: 'ANCHOR_NOT_FOUND',
      from: from ? coord(from) : null,
      to: to ? coord(to) : null,
      bounds: spec.bounds,
    });
    continue;
  }
  const result = await findPath(from, to, spec.bounds);
  if (!result.path) {
    const reverse = await findPath(to, from, spec.bounds);
    routes.push({
      id: spec.id,
      class: spec.class,
      status: result.exhaustedLimit ? 'SEARCH_LIMIT_REACHED' : 'NO_NORMAL_WALK_PATH',
      from: coord(from),
      to: coord(to),
      bounds: spec.bounds,
      visited: result.visited,
      nearestComponentGap: reverse.path
        ? null
        : nearestComponentGap(result.reachable, reverse.reachable),
    });
    continue;
  }
  const samples = [];
  const stride = Math.max(1, Math.floor(result.path.length / 120));
  for (let index = 1; index < result.path.length - 1; index += stride) {
    samples.push(await crossSection(result.path[index], result.path[index - 1], result.path[index + 1]));
  }
  const envelopeFailures = samples.filter((sample) => !sample.publicEnvelope);
  const verticalOrTurn = samples.filter((sample) => sample.kind === 'vertical-or-turn');
  const dark = samples.filter((sample) => sample.lightCount === 0);
  routes.push({
    id: spec.id,
    class: spec.class,
    status: 'NORMAL_WALK_PATH_SURVEYED_NOT_ACCEPTED',
    from: coord(from),
    to: coord(to),
    bounds: spec.bounds,
    pathStations: result.path.length,
    visited: result.visited,
    path: result.path.map(coord),
    crossSection: {
      sampledStations: samples.length,
      publicFiveByFiveFailures: envelopeFailures.length,
      verticalOrTurnStations: verticalOrTurn.length,
      zeroLocalLightStations: dark.length,
      firstPublicEnvelopeFailures: envelopeFailures.slice(0, 24),
      firstZeroLocalLightStations: dark.slice(0, 24),
    },
  });
}

const identity = snapshotIdentity(REGIONS);
const report = {
  schemaVersion: 1,
  id: 'circ-wl-arrival-01',
  generatedAtUtc: new Date().toISOString(),
  status: 'SURVEY_COMPLETE_BUILD_DESIGN_REQUIRED',
  worldMutationPerformed: false,
  sourceSnapshot: {
    regions: path.relative(ROOT, REGIONS),
    ...identity,
  },
  standards: {
    publicPrimary: '5 clear wide × 5 clear high; live bidirectional no-jump QA and owner closure still required',
    venueStair: '7 clear wide × 6 clear high with 7×7 landings and nearby lift analogue',
    staff: '3×3 at doors; separated from public egress',
  },
  anchors: anchors.map((anchor) => ({
    id: anchor.id,
    classification: anchor.classification,
    requested: anchor.target,
    resolved: resolved[anchor.id] ? coord(resolved[anchor.id]) : null,
  })),
  routes,
  nextAction: 'Compile only a route/egress package whose exact failure cells, ownership, fluid and block-entity halo, forward and inverse are derived from this snapshot; refresh source again immediately before physical execution.',
  nonClaims: [
    'No route is commissioned by this offline survey.',
    'Normal-walk connectivity does not prove event egress, accessibility, door operation, crowd capacity, fire separation, or public access.',
    'The theatre-to-backstage and club boundary probes are separation checks, not permissions to connect those areas.',
  ],
};

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'westlight-arrival-circulation-survey.json'), `${JSON.stringify(report, null, 2)}\n`);
const routeRows = routes.map((route) => [
  route.id,
  route.class,
  route.status,
  route.pathStations ?? '—',
  route.crossSection?.publicFiveByFiveFailures ?? '—',
  route.crossSection?.zeroLocalLightStations ?? '—',
].join(' | '));
fs.writeFileSync(path.join(OUT, 'westlight-arrival-circulation-survey.md'), [
  '# CIRC-WL-ARRIVAL-01 — Westlight arrival and event-circulation survey',
  '',
  'Status: **SURVEY COMPLETE — BUILD DESIGN REQUIRED**',
  '',
  `Source snapshot: \`${report.sourceSnapshot.regions}\``,
  `SHA-256: \`${identity.sha256}\` (${identity.regionFileCount} region files)`,
  '',
  'This is a read-only snapshot survey. It does not commission a public route, venue egress, staff route, or access-control boundary.',
  '',
  '## Route results',
  '',
  'Route | Class | Snapshot result | Path stations | 5×5 failures | Zero-local-light samples',
  '--- | --- | --- | ---: | ---: | ---:',
  ...routeRows,
  '',
  '## Release gate',
  '',
  'Any follow-on build must derive exact targets from a newly refreshed source, assign one owner per cell, exclude containers/block entities and fluids, provide an exact inverse, pass strict-noop parser and source preflight, clear live entities, then prove post-state route/egress behavior independently.',
].join('\n'));

process.stdout.write(`${JSON.stringify({
  status: report.status,
  out: path.relative(ROOT, OUT),
  sourceSnapshotSha256: identity.sha256,
  routes: routes.map(({ id, status }) => ({ id, status })),
}, null, 2)}\n`);
