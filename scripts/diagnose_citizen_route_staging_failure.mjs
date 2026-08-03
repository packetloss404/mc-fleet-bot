#!/usr/bin/env node
/**
 * Read-only reproduction of the citizen live-walk failure at the z=-32 grade.
 *
 * This uses the installed mineflayer-pathfinder A* implementation against the
 * immutable Anvil snapshot. It never connects to Minecraft or any local API
 * and never writes a file. The projected variant changes one in-memory cell.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

import {
  DetailedAnvilSnapshot,
  hashSnapshotDirectory,
} from './generate_mainstreet_redevelopment_r4_r5.mjs';

const require = createRequire(import.meta.url);
const minecraftData = require('minecraft-data')('1.21.11');
const Block = require('prismarine-block')(minecraftData);
const AStar = require('mineflayer-pathfinder/lib/astar');
const Move = require('mineflayer-pathfinder/lib/move');
const Movements = require('mineflayer-pathfinder/lib/movements');
const { GoalNear } = require('mineflayer-pathfinder/lib/goals');

const ROOT = process.cwd();
const SNAPSHOT = path.join(
  ROOT,
  'data/worldsnap-citizen-route-livegate-20260728T1649Z/region',
);
const FORWARD_OPERATION = path.join(
  ROOT,
  'data/buildops/citizen-route-live-walk-leaf-clearance-repair-2026-07-28.txt',
);
const EXPECTED_SNAPSHOT_SHA256 =
  '7a6ae13857d598457491b970c4ece8fa29f3afbdc4d47aad6f076c7a69264f48';
const EXPECTED_LEAF =
  'minecraft:oak_leaves[distance=3,persistent=false,waterlogged=false]';
const START = [-79, 68, -33];
const TARGET = [-82, 65, -19];
const BLOCKING_CORNER = [-79, 69, -32];
const EXPECTED_OPERATION =
  `REPL -79 69 -32 -79 69 -32 ${EXPECTED_LEAF} minecraft:air`;

const sha256 = (value) => (
  crypto.createHash('sha256').update(value).digest('hex')
);
const pointKey = (x, y, z) => `${x},${y},${z}`;
const tuple = (point) => [point.x, point.y, point.z];

function invariant(condition, message) {
  if (!condition) throw new Error(`citizen staging diagnosis failed: ${message}`);
}

function parseState(state) {
  if (state === null) return null;
  const match = /^minecraft:([^[]+)(?:\[(.*)\])?$/.exec(state);
  invariant(match, `invalid block state ${state}`);
  const properties = {};
  if (match[2]) {
    for (const entry of match[2].split(',')) {
      const separator = entry.indexOf('=');
      properties[entry.slice(0, separator)] = entry.slice(separator + 1);
    }
  }
  return { name: match[1], properties };
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.z - start.z);
  }
  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * dx + (point.z - start.z) * dz) / lengthSquared,
    ),
  );
  return Math.hypot(
    point.x - (start.x + projection * dx),
    point.z - (start.z + projection * dz),
  );
}

function operationLine() {
  return fs.readFileSync(FORWARD_OPERATION, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith('REPL '));
}

const snapshotIdentity = hashSnapshotDirectory(SNAPSHOT);
invariant(
  snapshotIdentity.sha256 === EXPECTED_SNAPSHOT_SHA256,
  `snapshot hash ${snapshotIdentity.sha256} does not match the incident evidence`,
);
invariant(
  operationLine() === EXPECTED_OPERATION,
  'one-cell guarded repair operation drifted',
);

const snapshot = new DetailedAnvilSnapshot(SNAPSHOT);
const sourceStates = new Map();
for (let z = -40; z <= -10; z += 1) {
  for (let x = -90; x <= -74; x += 1) {
    for (let y = 58; y <= 76; y += 1) {
      sourceStates.set(pointKey(x, y, z), await snapshot.getBlock(x, y, z));
    }
  }
}

function makeBot(states) {
  return {
    registry: minecraftData,
    inventory: { items: () => [] },
    entity: {
      effects: {},
      onGround: true,
    },
    entities: {},
    game: { minY: -64 },
    pathfinder: { bestHarvestTool: () => null },
    blockAt(position) {
      const point = position.floored();
      const state = states.get(pointKey(point.x, point.y, point.z));
      if (state === undefined || state === null) return null;
      const parsed = parseState(state);
      const block = Block.fromProperties(
        parsed.name,
        parsed.properties,
        0,
      );
      block.position = point;
      return block;
    },
  };
}

const approvedSegments = [
  [{ x: -82, z: -119 }, { x: -82, z: -19 }],
  [{ x: -82, z: -19 }, { x: -82, z: -8 }],
];

function reproduce(states) {
  const bot = makeBot(states);
  const movements = new Movements(bot);
  movements.canDig = true;
  movements.digCost = 12;
  movements.allow1by1towers = false;
  movements.allowEntityDetection = false;
  movements.exclusionAreasStep.push((block) => {
    if (!block?.position) return 100;
    const distance = Math.min(
      ...approvedSegments.map(([start, end]) => (
        distanceToSegment(block.position, start, end)
      )),
    );
    return distance <= 3 ? 0 : 100;
  });
  const astar = new AStar(
    new Move(...START, 0, 0),
    movements,
    new GoalNear(...TARGET, 1),
    30_000,
    30_000,
    96,
  );
  const result = astar.compute();
  return {
    status: result.status,
    cost: result.cost,
    visitedNodes: result.visitedNodes,
    path: result.path.map((node) => ({
      point: tuple(node),
      toBreak: node.toBreak.map(tuple),
      toPlaceCount: node.toPlace.length,
      parkour: node.parkour,
    })),
  };
}

const source = reproduce(sourceStates);
const projectedStates = new Map(sourceStates);
projectedStates.set(pointKey(...BLOCKING_CORNER), 'minecraft:air');
const projected = reproduce(projectedStates);

const blockStates = {
  sourceNodeFeet: sourceStates.get(pointKey(...START)),
  sourceNodeHead: sourceStates.get(pointKey(START[0], START[1] + 1, START[2])),
  sourceNodeSupport: sourceStates.get(pointKey(START[0], START[1] - 1, START[2])),
  destinationFeet: sourceStates.get(pointKey(-80, 68, -32)),
  destinationHead: sourceStates.get(pointKey(-80, 69, -32)),
  destinationSupport: sourceStates.get(pointKey(-80, 67, -32)),
  blockingCorner: sourceStates.get(pointKey(...BLOCKING_CORNER)),
  clearOrthogonalHead: sourceStates.get(pointKey(-80, 69, -33)),
};

invariant(source.status === 'success', `source A* status is ${source.status}`);
invariant(
  JSON.stringify(source.path[0]?.point) === JSON.stringify([-80, 68, -32]),
  'source A* no longer selects the hazardous diagonal as its first node',
);
invariant(
  source.path[0].toBreak.length === 0,
  'source diagonal unexpectedly declares a planned break',
);
invariant(
  blockStates.blockingCorner === EXPECTED_LEAF,
  `blocking corner is ${blockStates.blockingCorner}`,
);
invariant(
  blockStates.clearOrthogonalHead === 'minecraft:air',
  'west-first orthogonal side is no longer clear',
);
invariant(projected.status === 'success', `projected A* status is ${projected.status}`);
invariant(
  JSON.stringify(projected.path[0]?.point) === JSON.stringify([-79, 68, -32]),
  'one-cell projection no longer replaces the hazardous diagonal with a cardinal step',
);
invariant(
  projected.path.every(
    (node) => node.toBreak.length === 0 && node.toPlaceCount === 0,
  ),
  'projected escape requires a break or placement',
);

const output = {
  schemaVersion: 1,
  status: 'PASS_READ_ONLY_REPRODUCTION',
  sourceBoundary: {
    liveWorldRead: false,
    liveWorldMutated: false,
    networkAccess: false,
    serviceRestarted: false,
    botStarted: false,
    filesWritten: false,
  },
  snapshot: {
    directory: path.relative(ROOT, SNAPSHOT),
    sha256: snapshotIdentity.sha256,
    regionFileCount: snapshotIdentity.regionFileCount,
  },
  runtimeModel: {
    minecraftVersion: minecraftData.version.minecraftVersion,
    mineflayerPathfinderVersion:
      require('mineflayer-pathfinder/package.json').version,
    searchRadius: 96,
    canDig: true,
    digCost: 12,
    allow1by1towers: false,
    allowParkour: true,
    allowSprinting: true,
    civicCorridorHalfWidth: 3,
  },
  start: START,
  target: [...TARGET, 1],
  blockingCorner: {
    point: BLOCKING_CORNER,
    state: blockStates.blockingCorner,
  },
  blockStates,
  source,
  projection: {
    operation: EXPECTED_OPERATION,
    operationFile: path.relative(ROOT, FORWARD_OPERATION),
    operationSha256: sha256(fs.readFileSync(FORWARD_OPERATION)),
    inMemoryOnly: true,
    result: projected,
  },
};

console.log(JSON.stringify(output, null, 2));
