#!/usr/bin/env node
/**
 * Independent immutable-post QA for MP06-ENDPOINT-ELEVATED-CROSSING-01.
 *
 * This intentionally does not import the MP06 compiler.  It verifies the
 * actual guarded forward package on an immutable post capture, the retained
 * cap interfaces, and both levels of the crossing.  It never contacts RCON,
 * Minecraft, a fleet service, or a live database.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const RELEASE_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01';
const CONTRACT_ID = 'MP06-ENDPOINT-ELEVATED-CROSSING-01-EXACT-3D-CONTRACT';
const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : null;
};
const POST = option('--post');
const MANIFEST = option('--manifest');
const CONTRACT = option('--contract');
const OUT_JSON = option('--out-json');
const OUT_MD = option('--out-md');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP06 endpoint elevated-crossing independent QA rejected: ${message}`);
};
const key = ({ x, y, z }) => `${x},${y},${z}`;
const stateName = (state) => String(state).split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const HAZARDS = new Set([
  'minecraft:water', 'minecraft:bubble_column', 'minecraft:lava', 'minecraft:fire',
  'minecraft:soul_fire', 'minecraft:cactus', 'minecraft:magma_block',
  'minecraft:sweet_berry_bush', 'minecraft:powder_snow', 'minecraft:wither_rose',
]);
const PASSABLE_EXACT = new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:snow',
  'minecraft:tripwire', 'minecraft:redstone_wire', 'minecraft:light',
]);
const PASSABLE_SUFFIXES = [
  '_flower', '_sapling', '_torch', '_wall_torch', '_sign', '_wall_sign',
  '_hanging_sign', '_wall_hanging_sign', '_banner', '_wall_banner', '_button',
  '_pressure_plate', '_rail', '_carpet',
];

function properties(state) {
  const text = String(state);
  const start = text.indexOf('[');
  if (start < 0 || !text.endsWith(']')) return {};
  return Object.fromEntries(text.slice(start + 1, -1).split(',').filter(Boolean).map((entry) => {
    const index = entry.indexOf('=');
    return index < 0 ? [entry, ''] : [entry.slice(0, index), entry.slice(index + 1)];
  }));
}

function isPassable(state) {
  const name = stateName(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name) || PASSABLE_SUFFIXES.some((suffix) => name.endsWith(suffix))) return true;
  if (HAZARDS.has(name)) return false;
  const props = properties(state);
  if (name.endsWith('_door') || name.endsWith('_fence_gate') || name.endsWith('_trapdoor')) return props.open === 'true';
  return false;
}

function safeFooting(state) {
  const name = stateName(state);
  return !AIR.has(name) && !HAZARDS.has(name) && !isPassable(state)
    && !['_fence', '_wall', '_pane', '_leaves', '_chain', '_lantern'].some((suffix) => name.endsWith(suffix));
}

function parseOps(filename) {
  const operations = [];
  for (const line of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const fields = line.split(/\s+/);
    fail(fields[0] === 'REPL' && fields.length === 9, `unsupported operation line: ${line}`);
    const values = fields.slice(1, 7).map(Number);
    fail(values.every(Number.isInteger) && values[0] === values[3] && values[1] === values[4] && values[2] === values[5],
      `operation is not an exact one-cell replacement: ${line}`);
    operations.push({ point: { x: values[0], y: values[1], z: values[2] }, from: fields[7], to: fields[8] });
  }
  fail(new Set(operations.map((entry) => key(entry.point))).size === operations.length, 'operation file has duplicate target coordinates');
  return operations;
}

function operationBodyHash(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)
    .filter((line) => line.startsWith('REPL ')).join('\n')}\n`;
  return sha256(body);
}

function cells({ minX, maxX, y, minZ, maxZ }) {
  const result = [];
  for (let x = minX; x <= maxX; x += 1) for (let z = minZ; z <= maxZ; z += 1) result.push({ x, y, z });
  return result;
}

const westStructural = cells({ minX: -265, maxX: -265, y: 71, minZ: -501, maxZ: -493 });
const westTraffic = cells({ minX: -265, maxX: -265, y: 72, minZ: -501, maxZ: -493 });
const eastTraffic = cells({ minX: -251, maxX: -251, y: 71, minZ: -501, maxZ: -493 });
const eastHeadroom = cells({ minX: -251, maxX: -251, y: 72, minZ: -501, maxZ: -493 });
const lowerFloor = cells({ minX: -264, maxX: -252, y: 68, minZ: -501, maxZ: -493 });
const lowerBody = cells({ minX: -264, maxX: -252, y: 69, minZ: -501, maxZ: -493 });
const lowerHead = cells({ minX: -264, maxX: -252, y: 70, minZ: -501, maxZ: -493 });
const elevatedStations = [
  ...cells({ minX: -265, maxX: -265, y: 73, minZ: -500, maxZ: -494 }),
  ...cells({ minX: -264, maxX: -252, y: 72, minZ: -500, maxZ: -494 }),
  ...cells({ minX: -251, maxX: -251, y: 72, minZ: -500, maxZ: -494 }),
];
const lowerStations = cells({ minX: -264, maxX: -252, y: 69, minZ: -501, maxZ: -493 });

class Snapshot {
  constructor(region) {
    this.reader = new AnvilReader(region);
    this.cache = new Map();
  }

  async block(point) {
    const pointKey = key(point);
    if (!this.cache.has(pointKey)) this.cache.set(pointKey,
      stateToCommandString(await this.reader.blockState(point.x, point.y, point.z)));
    return this.cache.get(pointKey);
  }

  async standable(point) {
    const [feet, head, floor] = await Promise.all([
      this.block(point), this.block({ ...point, y: point.y + 1 }), this.block({ ...point, y: point.y - 1 }),
    ]);
    return isPassable(feet) && isPassable(head) && safeFooting(floor);
  }
}

async function exactStates(snapshot, points, expected) {
  const failures = [];
  for (const point of points) {
    const actual = await snapshot.block(point);
    if (actual !== expected) failures.push({ point, expected, actual });
  }
  return failures;
}

async function graphAudit(snapshot, stations, label) {
  const available = new Map();
  for (const point of stations) if (await snapshot.standable(point)) available.set(key(point), point);
  const adjacency = new Map([...available.keys()].map((pointKey) => [pointKey, []]));
  for (const point of available.values()) for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const y of [point.y - 1, point.y, point.y + 1]) {
      const adjacent = available.get(key({ x: point.x + dx, y, z: point.z + dz }));
      if (adjacent) adjacency.get(key(point)).push(adjacent);
    }
  }
  const component = new Set();
  const first = available.values().next().value;
  if (first) {
    const queue = [first]; component.add(key(first));
    while (queue.length) for (const next of adjacency.get(key(queue.shift())) ?? []) {
      if (!component.has(key(next))) { component.add(key(next)); queue.push(next); }
    }
  }
  const endpoints = label === 'elevated'
    ? { west: [...available.values()].filter((point) => point.x === -265), east: [...available.values()].filter((point) => point.x === -251) }
    : null;
  const reachable = (from, to) => {
    const seen = new Set([key(from)]); const queue = [from];
    while (queue.length) {
      const current = queue.shift();
      if (key(current) === key(to)) return true;
      for (const next of adjacency.get(key(current)) ?? []) if (!seen.has(key(next))) { seen.add(key(next)); queue.push(next); }
    }
    return false;
  };
  const directedPairs = endpoints ? [
    ...endpoints.west.flatMap((west) => endpoints.east.flatMap((east) => [
      { from: west, to: east, reachable: reachable(west, east) },
      { from: east, to: west, reachable: reachable(east, west) },
    ])),
  ] : [];
  return { expectedStations: stations.length, standableStations: available.size, connectedStations: component.size, directedPairs, passed: available.size === stations.length && component.size === stations.length && directedPairs.every((pair) => pair.reachable) };
}

async function main() {
  for (const [flag, value] of [['--post', POST], ['--manifest', MANIFEST], ['--contract', CONTRACT], ['--out-json', OUT_JSON], ['--out-md', OUT_MD]]) fail(value, `${flag} is required`);
  const postRoot = absolute(POST);
  for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
    fail(fs.existsSync(path.join(postRoot, member)), `immutable post is incomplete: ${member}`);
  }
  const capture = JSON.parse(fs.readFileSync(path.join(postRoot, 'combined-zones-complete-save-capture.json'), 'utf8'));
  fail(capture.immutableCopy === true, 'post capture is not immutable');
  const manifestBytes = fs.readFileSync(absolute(MANIFEST));
  const manifest = JSON.parse(manifestBytes);
  const contractBytes = fs.readFileSync(absolute(CONTRACT));
  const contract = JSON.parse(contractBytes);
  fail(manifest.releaseId === RELEASE_ID, 'manifest release id differs');
  fail(manifest.status === 'COMPILED_FROM_ACCEPTED_EXACT_3D_BRIDGE_CONTRACT_AWAITING_FRESH_LIVE_KERNEL', 'manifest is not the expected static MP06 compiler output');
  fail(contract.contractId === CONTRACT_ID && contract.status === 'ACCEPTED_EXACT_3D_BRIDGE_CONTRACT', 'contract is not accepted exact MP06 bridge contract');
  fail(manifest.ownership?.contractSha256 === sha256(contractBytes), 'manifest does not bind this exact accepted contract');
  const forwardPath = manifest.operations?.forward?.path;
  fail(forwardPath, 'manifest lacks forward operation path');
  fail(manifest.operations.forward.sha256 === operationBodyHash(forwardPath), 'manifest forward operation body hash drifted');
  const operations = parseOps(forwardPath);
  const contractCells = (contract.operationBinding?.cells ?? []).map((entry) => ({ point: { x: entry.point[0], y: entry.point[1], z: entry.point[2] }, from: entry.fromState, to: entry.toState }));
  const opIdentity = (entries) => entries.map((entry) => `${key(entry.point)}|${entry.from}|${entry.to}`).sort();
  // The compiler fixes the 117-cell deck but permits the accepted contract to
  // choose an exact finite edge/lighting treatment.  Do not silently turn a
  // current 149-cell proposal into the only valid future acceptance here.
  fail(operations.length >= 118 && contractCells.length === operations.length,
    'forward package must bind the mandatory 117-cell deck plus exact accepted edge/lighting cells');
  fail(JSON.stringify(opIdentity(operations)) === JSON.stringify(opIdentity(contractCells)), 'forward operation does not exactly match accepted contract binding');
  const snapshot = new Snapshot(path.join(postRoot, 'region'));
  const targetFailures = [];
  for (const operation of operations) {
    const actual = await snapshot.block(operation.point);
    if (actual !== operation.to) targetFailures.push({ point: operation.point, expected: operation.to, actual });
  }
  const [westStructuralFailures, westTrafficFailures, eastTrafficFailures, eastHeadroomFailures, lowerFloorFailures, lowerBodyFailures, lowerHeadFailures, elevated, lower] = await Promise.all([
    exactStates(snapshot, westStructural, 'minecraft:stone_bricks'),
    exactStates(snapshot, westTraffic, 'minecraft:gray_concrete'), exactStates(snapshot, eastTraffic, 'minecraft:gray_concrete'),
    exactStates(snapshot, eastHeadroom, 'minecraft:air'), exactStates(snapshot, lowerFloor, 'minecraft:gray_concrete'),
    exactStates(snapshot, lowerBody, 'minecraft:air'), exactStates(snapshot, lowerHead, 'minecraft:air'),
    graphAudit(snapshot, elevatedStations, 'elevated'), graphAudit(snapshot, lowerStations, 'lower'),
  ]);
  const checks = {
    immutablePostCapture: true,
    allExactAcceptedReleaseTargetsAtDesiredState: targetFailures.length === 0,
    retainedWestAndEastCapInterfaces: westStructuralFailures.length + westTrafficFailures.length + eastTrafficFailures.length + eastHeadroomFailures.length === 0,
    protectedLowerRoadFloorAndTwoBlockClearway: lowerFloorFailures.length + lowerBodyFailures.length + lowerHeadFailures.length === 0,
    all105ElevatedNormalWalkStationsConnected: elevated.passed && elevated.expectedStations === 105,
    all98DirectedElevatedEndpointPairsReachable: elevated.directedPairs.length === 98 && elevated.directedPairs.every((pair) => pair.reachable),
    all117LowerNormalWalkStationsConnected: lower.passed && lower.expectedStations === 117,
  };
  const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([name]) => name);
  const report = {
    schemaVersion: 1, id: 'mp06-endpoint-elevated-crossing-independent-post-qa', status: failures.length ? 'FAIL' : 'PASS',
    readOnly: true, liveWorldRead: false, worldMutated: false, rconCalled: false,
    bindings: { post: relative(POST), postCaptureManifestSha256: sha256(fs.readFileSync(path.join(postRoot, 'combined-zones-complete-save-capture.json'))), manifest: relative(MANIFEST), manifestSha256: sha256(manifestBytes), contract: relative(CONTRACT), contractSha256: sha256(contractBytes), forwardOperation: forwardPath, forwardOperationSha256: sha256(fs.readFileSync(absolute(forwardPath))) },
    targetVerification: { expected: contractCells.length, actual: operations.length, failures: targetFailures },
    designVerification: { acceptedContractCells: { expected: contractCells.length, exactForwardContractBinding: true } },
    retainedInterfaces: { westStructuralFailures, westTrafficFailures, eastTrafficFailures, eastHeadroomFailures, lowerFloorFailures, lowerBodyFailures, lowerHeadFailures },
    route: { elevated, lower }, checks, failures,
  };
  fs.mkdirSync(path.dirname(absolute(OUT_JSON)), { recursive: true });
  fs.writeFileSync(absolute(OUT_JSON), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(absolute(OUT_MD), `# MP06 endpoint elevated-crossing independent post QA\n\nStatus: **${report.status}**\n\n- Exact accepted release targets: ${operations.length - targetFailures.length}/${contractCells.length}.\n- Elevated normal-walk stations: ${elevated.standableStations}/105; directed endpoint pairs: ${elevated.directedPairs.filter((pair) => pair.reachable).length}/98.\n- Lower normal-walk stations: ${lower.standableStations}/117.\n- Lower road floor and two-block clearway failures: ${lowerFloorFailures.length + lowerBodyFailures.length + lowerHeadFailures.length}.\n\nThis reads only the immutable post snapshot; it makes no live-world or RCON call.\n`);
  process.stdout.write(`${JSON.stringify({ status: report.status, checks, failures, outJson: relative(OUT_JSON), outMd: relative(OUT_MD) }, null, 2)}\n`);
  process.exitCode = failures.length ? 1 : 0;
}

await main();
