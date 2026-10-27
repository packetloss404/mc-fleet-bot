#!/usr/bin/env node
/**
 * MP12-GATEHEAD-ALT-ACCESS-01 — offline public-route/boundary design compiler.
 *
 * The original centreline at z=-475 cannot have a five-wide envelope because
 * it would consume the protected north stone-brick façade at z=-476.  This
 * compiler proves the existing, dry southern alignment instead: a centreline
 * at z=-473 from x=-336 through -319, with 3-wide transition portals at both
 * ends and a five-wide/five-high central public envelope z=-475..-471.
 *
 * It intentionally emits no Minecraft operations.  It is a retained-snapshot
 * design only and must be recaptured before route classification or any future
 * physical work.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-wl-gatehead-envelope-survey-20260826T041900Z');
const OUT_DIR = value('--out-dir', 'data/world-review');
const BASENAME = value('--basename', 'mp12-gatehead-alternate-access-01-historical-20260826');
const GENERATED_AT = value('--generated-at', '2026-08-26T064500Z');
const RELEASE_ID = 'MP12-GATEHEAD-ALT-ACCESS-01';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`);
};
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const BLOCK_ENTITY_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern',
  'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const nameOf = (state) => state.Name;
const isPassable = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID.has(nameOf(state)) || state.Properties?.waterlogged === 'true';
const isSafeFloor = (state) => !isPassable(state) && !isFluid(state)
  && !state.Name.endsWith('_wall') && !state.Name.endsWith('_fence') && !state.Name.endsWith('_pane');
const snapshotIdentity = (regionsDir) => {
  const hash = crypto.createHash('sha256');
  const directory = absolute(regionsDir);
  for (const file of fs.readdirSync(directory).filter((file) => file.endsWith('.mca')).sort()) {
    hash.update(file); hash.update('\0'); hash.update(fs.readFileSync(path.join(directory, file))); hash.update('\0');
  }
  return hash.digest('hex');
};

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, reader.blockState(cell.x, cell.y, cell.z));
  return cache.get(key);
};
async function normalWalk(point) {
  const [floor, feet, head] = await Promise.all([
    stateAt({ x: point.x, y: point.y - 1, z: point.z }),
    stateAt(point),
    stateAt({ x: point.x, y: point.y + 1, z: point.z }),
  ]);
  return { ok: isSafeFloor(floor) && isPassable(feet) && isPassable(head), floor: floor.Name, feet: feet.Name, head: head.Name };
}

/* Exact normal-walk witness, replacing only the obstructed central section of
 * the existing Gatehead->East Arrival path.  It makes no claim about event
 * egress or operational venue access. */
const prefix = [
  [-338, 68, -484], [-337, 68, -484], [-336, 68, -484],
  [-336, 69, -483], [-336, 69, -482], [-336, 68, -481], [-336, 68, -480],
  [-336, 68, -479], [-336, 68, -478], [-336, 68, -477], [-336, 68, -476],
];
const southernTransition = [
  [-336, 68, -475], [-336, 68, -474], [-336, 68, -473],
  ...Array.from({ length: 17 }, (_, index) => [-335 + index, 68, -473]),
  [-319, 68, -474], [-319, 68, -475],
];
const suffix = [
  [-318, 68, -475], [-317, 68, -475], [-317, 68, -476], [-317, 68, -477],
  [-317, 68, -478], [-317, 68, -479], [-317, 68, -480], [-317, 68, -481],
  [-317, 69, -482], [-317, 69, -483],
  ...Array.from({ length: 33 }, (_, index) => [-316 + index, 68, -483]),
  ...Array.from({ length: 11 }, (_, index) => [-284, 68, -484 - index]),
];
const route = [...prefix, ...southernTransition, ...suffix].map(([x, y, z]) => ({ x, y, z }));
fail(new Set(route.map(cellKey)).size === route.length, 'route repeats a station');

const routeStations = [];
for (let index = 0; index < route.length; index += 1) {
  const point = route[index];
  const result = await normalWalk(point);
  fail(result.ok, `normal-walk failure at ${cellKey(point)} (${JSON.stringify(result)})`);
  if (index > 0) {
    const previous = route[index - 1];
    const horizontal = Math.abs(point.x - previous.x) + Math.abs(point.z - previous.z);
    fail(horizontal === 1 && Math.abs(point.y - previous.y) <= 1,
      `jump/sprint/diagonal transition ${cellKey(previous)} -> ${cellKey(point)}`);
  }
  routeStations.push({ point, ...result });
}

async function clearEnvelope(label, minX, maxX, minZ, maxZ, minY = 68, height = 5) {
  const cells = [];
  let fluidCount = 0;
  let solidCount = 0;
  let unsafeFloorCount = 0;
  for (let x = minX; x <= maxX; x += 1) for (let z = minZ; z <= maxZ; z += 1) {
    const floor = await stateAt({ x, y: minY - 1, z });
    if (!isSafeFloor(floor)) unsafeFloorCount += 1;
    for (let y = minY; y < minY + height; y += 1) {
      const state = await stateAt({ x, y, z });
      cells.push({ x, y, z, state: state.Name });
      if (isFluid(state)) fluidCount += 1;
      if (!isPassable(state)) solidCount += 1;
    }
  }
  fail(fluidCount === 0 && solidCount === 0 && unsafeFloorCount === 0,
    `${label} envelope blocked (fluid=${fluidCount}, solid=${solidCount}, unsafeFloor=${unsafeFloorCount})`);
  return {
    label, bounds: { minX, maxX, minY, maxY: minY + height - 1, minZ, maxZ },
    floorY: minY - 1, cellCount: cells.length, fluidCount, solidCount, unsafeFloorCount,
  };
}

/* Central east-west route: five wide (z=-475..-471) and five clear-high.
 * The two transition portals are intentionally only three-wide because they
 * turn the route without entering the protected building line. */
const centralEnvelope = await clearEnvelope('central-5x5-public-envelope', -336, -319, -475, -471);
const westPortal = await clearEnvelope('west-3x5-transition-portal', -337, -335, -475, -473);
const eastPortal = await clearEnvelope('east-3x5-transition-portal', -320, -318, -475, -473);

const façadeCells = [];
for (let x = -334; x <= -320; x += 1) for (let y = 68; y <= 72; y += 1) {
  const state = await stateAt({ x, y, z: -476 });
  fail(!isPassable(state) && !isFluid(state),
    `protected north façade has an unsafe opening/fluid at ${x},${y},-476: ${state.Name}`);
  façadeCells.push({ x, y, z: -476, state: state.Name });
}
const façadeStateCensus = Object.fromEntries([...façadeCells.reduce((counts, cell) => {
  counts.set(cell.state, (counts.get(cell.state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort((a, b) => a[0].localeCompare(b[0])));

/* Block-entity review in the defined alternate public envelope and portals. */
const scanBounds = { minX: -337, maxX: -318, minY: 67, maxY: 72, minZ: -475, maxZ: -471 };
const nearbyBlockEntities = [];
for (let cx = Math.floor(scanBounds.minX / 16); cx <= Math.floor(scanBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(scanBounds.minZ / 16); cz <= Math.floor(scanBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const x = Number(entity.x); const y = Number(entity.y); const z = Number(entity.z);
      if (x >= scanBounds.minX && x <= scanBounds.maxX && y >= scanBounds.minY && y <= scanBounds.maxY
        && z >= scanBounds.minZ && z <= scanBounds.maxZ) nearbyBlockEntities.push({ x, y, z, id: entity.id ?? entity.Id ?? null });
    }
  }
}
fail(nearbyBlockEntities.length === 0, `block entity in alternate public envelope: ${JSON.stringify(nearbyBlockEntities)}`);

const boundaryDistance = {
  publicEnvelopeNorthEdgeZ: -475,
  protectedFacadeSouthFaceZ: -476,
  relation: 'adjacent but non-overlapping; no façade cell belongs to the public envelope',
  protectedFacadeCellCount: façadeCells.length,
};
const reportWithoutIdentity = {
  schemaVersion: 1,
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'OFFLINE_HISTORICAL_ROUTE_AND_BOUNDARY_DESIGN_FRESH_LIVE_CAPTURE_REQUIRED',
  source: {
    snapshotRoot: SNAPSHOT,
    snapshotSha256: snapshotIdentity(path.join(SNAPSHOT, 'region')),
    historicalOnly: true,
  },
  mutation: { operationCount: 0, worldEditsPerformed: false, executionAuthorized: false },
  scope: {
    purpose: 'Classify a southern Gatehead-to-East-Arrival public access alignment that avoids the protected façade; no egress or venue-operation claim.',
    publicRoute: { start: route.at(0), end: route.at(-1), stationCount: route.length, stations: route },
    centralEnvelope,
    transitionPortals: [westPortal, eastPortal],
    protectedBoundary: boundaryDistance,
  },
  routeAcceptance: {
    result: 'PASS', normalWalkingOnly: true, maxVerticalDelta: 1,
    noJump: true, noSprint: true, noDig: true, noSwim: true,
    stationChecks: routeStations,
  },
  interfaces: {
    protectedFacade: {
      bounds: { minX: -334, maxX: -320, minY: 68, maxY: 72, z: -476 },
      requiredCondition: 'all cells non-passable and non-fluid; retained façade fabric is never a public-envelope cell',
      stateCensus: façadeStateCensus, cells: façadeCells.length,
    },
    reviewedPublicEnvelopeBlockEntities: nearbyBlockEntities,
    boundaryMutation: 'none',
  },
  requiredBeforeAnyLiveClassificationOrWork: [
    'fresh immutable source capture', 're-run exact route and envelope compiler',
    'fresh public/staff ownership/interface review', 'fresh container/block-entity and live-entity checks for any future physical target',
    'if physical work is proposed: full guarded forward/rollback kernel and independent post-walk QA',
  ],
};
const manifestIdentity = sha256(JSON.stringify(reportWithoutIdentity));
const output = path.join(OUT_DIR, `${BASENAME}.json`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(output), `${JSON.stringify({ ...reportWithoutIdentity, manifestIdentity }, null, 2)}\n`);
console.log(JSON.stringify({
  status: reportWithoutIdentity.status, output: relative(output), manifestIdentity,
  routeStations: route.length, centralEnvelope: centralEnvelope.cellCount,
  portals: [westPortal.cellCount, eastPortal.cellCount], protectedFacadeCells: façadeCells.length,
}, null, 2));
