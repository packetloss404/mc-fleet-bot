#!/usr/bin/env node
/** Independent read-only post-release QA for the Cobalt-S1 passive rail slice. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`${flag} is required`);
  return result;
};
const LEDGER_PATH = required('--ledger');
const OUT_PATH = required('--out');
const MANIFEST_PATH = value('--manifest', 'data/buildops/cobalt-s1-westlight-ravensreach-passive-rail-01.release-manifest.json');
const RELEASE_ID = 'COBALT-S1-WESTLIGHT-RAVENSREACH-PASSIVE-RAIL-01';
const RELEASE_NODE_ID = 'CZ-SYS03-COBALT-STATION-PAIR-PASSIVE-RAIL';
const TRANSACTION_ID = 'cobalt-s1-westlight-ravensreach-passive-rail-01';
const RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const PD = 'minecraft:polished_deepslate';
const AIR = 'minecraft:air';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`);
};
const exact = (cells) => {
  const set = uniqueCells(cells);
  return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) };
};
const base = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg'].includes(base(state));
const isProtected = (state) => new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block',
]).has(base(state));
const census = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));

const ledger = JSON.parse(fs.readFileSync(abs(LEDGER_PATH), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST_PATH), 'utf8'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'scoped ledger is not executed and rollback-poststate verified');
fail(ledger.releaseNodeId === RELEASE_NODE_ID && ledger.transactionId === TRANSACTION_ID,
  'scoped ledger release identity drifted');
fail(manifest.schemaVersion === 1 && manifest.releaseNodeId === RELEASE_NODE_ID
  && manifest.transactionId === TRANSACTION_ID && manifest.scope?.releaseId === RELEASE_ID,
  'manifest release identity drifted');
fail(ledger.manifest?.sha256 === sha256(fs.readFileSync(abs(MANIFEST_PATH))), 'ledger is not bound to this exact manifest');
const packageRecord = ledger.packages?.find(({ key }) => key === 'passive-rail');
fail(packageRecord, 'scoped ledger has no passive-rail package');
const operation = manifest.operations?.['passive-rail'];
const operationBodySha256 = (artifactPath) => {
  const bytes = fs.readFileSync(abs(artifactPath), 'utf8');
  const marker = '# operation SHA-256: ';
  const declared = bytes.split('\n').find((line) => line.startsWith(marker))?.slice(marker.length);
  const bodyStart = bytes.indexOf('\nREPL ');
  fail(declared && bodyStart >= 0, `operation artifact has no canonical body hash/header: ${artifactPath}`);
  const body = bytes.slice(bodyStart + 1);
  fail(sha256(body) === declared, `operation artifact body hash is invalid: ${artifactPath}`);
  return declared;
};
fail(operation
  && operationBodySha256(packageRecord.forward?.path) === operation.forwardSha256
  && operationBodySha256(packageRecord.rollback?.path) === operation.rollbackSha256,
  'ledger package operation-body hashes drifted from manifest');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:passive-rail']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'),
    `required scoped-runner stage is not PASS: ${stage}`);
}
fail(ledger.postSnapshot?.regions && fs.existsSync(abs(ledger.postSnapshot.regions)), 'fresh post regions are unavailable');

const tracks = [
  { id: 'north-westbound', railZ: -461, interiorZ: [-461, -460], wallZ: [-462, -459] },
  { id: 'south-eastbound', railZ: -455, interiorZ: [-455, -454], wallZ: [-456, -453] },
];
const rail = [];
const support = [];
const headroom = [];
const sideLiner = [];
const diaphragm = [];
for (let x = -254; x <= -237; x += 1) {
  for (const track of tracks) {
    rail.push({ x, y: 13, z: track.railZ, track: track.id });
    support.push({ x, y: 12, z: track.railZ });
    for (let y = 14; y <= 16; y += 1) headroom.push({ x, y, z: track.railZ });
    for (const z of track.wallZ) for (let y = 13; y <= 16; y += 1) sideLiner.push({ x, y, z });
  }
}
for (const track of tracks) for (let y = 13; y <= 16; y += 1) {
  for (const z of [...track.wallZ, ...track.interiorZ]) diaphragm.push({ x: -236, y, z });
}
const interactionSet = uniqueCells([
  ...rail.map(({ x, y, z }) => ({ x, y, z })), ...support, ...headroom, ...sideLiner, ...diaphragm,
]);
fail(exact(rail).cellCount === 36 && exact(support).cellCount === 36 && exact(headroom).cellCount === 108
  && exact(diaphragm).cellCount === 32, 'compiled Cobalt geometry drifted');

const reader = new AnvilReader(abs(ledger.postSnapshot.regions));
const records = async (cells) => Promise.all(uniqueCells(cells).map(async (cell) => ({
  cell,
  state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)),
})));
const [postRail, postSupport, postHeadroom, postSideLiner, postDiaphragm, postInteraction] = await Promise.all([
  records(rail), records(support), records(headroom), records(sideLiner), records(diaphragm), records(interactionSet),
]);
fail(postRail.every(({ state }) => state === RAIL), 'not every target is exact passive east-west rail');
fail(postSupport.every(({ state }) => state === PD), 'rail support state drifted');
fail(postHeadroom.every(({ state }) => state === AIR), 'rail headroom is not fully clear');
fail(postSideLiner.every(({ state }) => state === PD), 'side liner state drifted');
fail(postDiaphragm.every(({ state }) => state === PD), 'retained x=-236 isolation diaphragm drifted');
fail(postInteraction.every(({ state }) => !isFluid(state) && !isGravity(state) && !isProtected(state)),
  'fluid, gravity, or protected block entered the local interaction set');

const qaPayload = {
  schemaVersion: 1,
  id: 'cobalt-s1-westlight-ravensreach-passive-rail-01-post-release-qa',
  status: 'PASS_EXECUTED_COBALT_S1_PASSIVE_RAIL_ISOLATION_QA',
  release: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    transactionId: TRANSACTION_ID,
    ledger: { path: rel(LEDGER_PATH), sha256: sha256(fs.readFileSync(abs(LEDGER_PATH))) },
    manifest: { path: rel(MANIFEST_PATH), sha256: sha256(fs.readFileSync(abs(MANIFEST_PATH))), manifestIdentity: manifest.manifestIdentity },
  },
  postSnapshot: ledger.postSnapshot,
  exactGeometry: {
    rail: exact(rail), support: exact(support), headroom: exact(headroom), sideLiner: exact(sideLiner),
    retainedDiaphragm: exact(diaphragm), interactionSet: exact(interactionSet),
  },
  postState: {
    rail: census(postRail), support: census(postSupport), headroom: census(postHeadroom),
    sideLiner: census(postSideLiner), retainedDiaphragm: census(postDiaphragm), interactionSet: census(postInteraction),
  },
  functionalBoundary: {
    passiveRailIsolated: true,
    retainedDiaphragmAtX: -236,
    powerCommissioned: false,
    vehicleTrialCommissioned: false,
    routeCommissioned: false,
    passengerServiceCommissioned: false,
  },
};
qaPayload.qaPayloadSha256 = sha256(JSON.stringify(qaPayload));
fs.mkdirSync(path.dirname(abs(OUT_PATH)), { recursive: true });
fs.writeFileSync(abs(OUT_PATH), `${JSON.stringify(qaPayload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: qaPayload.status, out: rel(OUT_PATH), qaPayloadSha256: qaPayload.qaPayloadSha256 }, null, 2)}\n`);
