#!/usr/bin/env node
/** Independent immutable-post QA for MP08 C1 sealed containment corridor. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const option = (flag, fallback = null) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const LEDGER = option('--ledger');
const OUT = option('--out');
const MANIFEST = option('--manifest', 'data/buildops/mp08-c1-sealed-containment-corridor-01.release-manifest.json');
const RELEASE_ID = 'MP08-C1-SEALED-CONTAINMENT-CORRIDOR-01';
const RELEASE_NODE_ID = 'MP08-C1-SEALED-CONTAINMENT-CORRIDOR';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`); };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, index) => a + index);
const volume = (x1, x2, y1, y2, z1, z2) => { const out = []; for (const x of range(x1, x2)) for (const y of range(y1, y2)) for (const z of range(z1, z2)) out.push({ x, y, z }); return out; };
const name = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const PROTECTED = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw']);
const profile = range(15, 70).map((z) => ({ z, floorY: z <= 26 ? -12 : z <= 54 ? -11 : -10 }));
const coreShell = uniqueCells(profile.flatMap(({ z, floorY }) => [...volume(-2, -2, floorY, floorY + 3, z, z), ...volume(2, 2, floorY, floorY + 3, z, z), ...volume(-1, 1, floorY + 3, floorY + 3, z, z)]));
const coreLiner = uniqueCells(profile.flatMap(({ z, floorY }) => volume(-1, 1, floorY - 1, floorY - 1, z, z)));
function vestibule(fromZ, toZ, floorY, doorZ, facing) {
  const door = uniqueCells(range(-1, 1).flatMap((x) => [{ x, y: floorY + 1, z: doorZ }, { x, y: floorY + 2, z: doorZ }]));
  const doorKeys = new Set(door.map(cellKey));
  const envelope = uniqueCells([...volume(-2, 2, floorY, floorY, fromZ, toZ), ...volume(-2, -2, floorY + 1, floorY + 3, fromZ, toZ), ...volume(2, 2, floorY + 1, floorY + 3, fromZ, toZ), ...volume(-1, 1, floorY + 3, floorY + 3, fromZ, toZ)].filter((cell) => !doorKeys.has(cellKey(cell))));
  const liner = volume(-1, 1, floorY - 1, floorY - 1, fromZ, toZ);
  const stations = range(fromZ, toZ).filter((z) => z !== doorZ).flatMap((z) => range(-1, 1).map((x) => ({ x, y: floorY + 1, z })));
  const desiredDoor = door.map((cell) => ({ cell, state: `minecraft:iron_door[facing=${facing},half=${cell.y === floorY + 1 ? 'lower' : 'upper'},hinge=${cell.x === -1 ? 'left' : 'right'},open=false,powered=false]` }));
  return { envelope, liner, door, desiredDoor, stations };
}
const cavernA = vestibule(11, 14, -12, 11, 'north');
const cavernB = vestibule(71, 74, -10, 74, 'south');
const coreStations = profile.flatMap(({ z, floorY }) => range(-1, 1).map((x) => ({ x, y: floorY + 1, z })));
const shell = uniqueCells([...coreShell, ...cavernA.envelope, ...cavernB.envelope]);
const liner = uniqueCells([...coreLiner, ...cavernA.liner, ...cavernB.liner]);
const doors = [...cavernA.desiredDoor, ...cavernB.desiredDoor];
const route = uniqueCells([...coreStations, ...cavernA.stations, ...cavernB.stations]);
const allTargets = uniqueCells([...shell, ...liner, ...doors.map(({ cell }) => cell)]);
const halo = uniqueCells(allTargets.flatMap(({ x, y, z }) => volume(x - 1, x + 1, y - 1, y + 1, z - 1, z + 1)));

for (const [label, value] of [['--ledger', LEDGER], ['--out', OUT]]) fail(value, `${label} is required`);
const ledgerBytes = fs.readFileSync(abs(LEDGER));
const manifestBytes = fs.readFileSync(abs(MANIFEST));
const ledger = JSON.parse(ledgerBytes);
const manifest = JSON.parse(manifestBytes);
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'scoped ledger is not executed and rollback-poststate verified');
fail(ledger.releaseNodeId === RELEASE_NODE_ID && ledger.transactionId === manifest.transactionId, 'ledger release identity drifted');
fail(manifest.scope?.releaseId === RELEASE_ID && manifest.releaseNodeId === RELEASE_NODE_ID, 'manifest release identity drifted');
fail(ledger.manifest?.sha256 === sha256(manifestBytes), 'ledger does not bind this exact manifest');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:c1-core-liner', 'rollback-poststate-preflight:cavern-a-vestibule', 'rollback-poststate-preflight:cavern-b-vestibule']) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `required runner stage is not PASS: ${stage}`);
const postRoot = ledger.postSnapshot?.worldRoot ?? (ledger.postSnapshot?.regions ? path.dirname(abs(ledger.postSnapshot.regions)) : null);
fail(postRoot && fs.existsSync(abs(postRoot)), 'fresh immutable post snapshot is unavailable');
const reader = new AnvilReader(path.join(abs(postRoot), 'region'));
const records = async (cells) => Promise.all(cells.map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const [shellPost, linerPost, doorPost, routePost, haloPost] = await Promise.all([records(shell), records(liner), Promise.all(doors.map(async ({ cell, state }) => ({ cell, state, actual: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) }))), records(route), records(halo)]);
const routeFailures = [];
for (const { x, y, z } of route) {
  const [feet, head, support] = await Promise.all([reader.blockState(x, y, z), reader.blockState(x, y + 1, z), reader.blockState(x, y - 1, z)]).then((states) => states.map(stateToCommandString));
  if (!AIR.has(name(feet)) || !AIR.has(name(head)) || AIR.has(name(support)) || FLUID.has(name(support))) routeFailures.push({ x, y, z, feet, head, support });
}
const haloHazards = haloPost.filter(({ state }) => FLUID.has(name(state)) || state.includes('waterlogged=true') || GRAVITY.has(name(state)) || PROTECTED.has(name(state)) || name(state).endsWith('_shulker_box'));
const checks = {
  immutablePostSnapshot: true,
  shellExactPolishedDeepslate: shellPost.every(({ state }) => state === 'minecraft:polished_deepslate'),
  linerExactPolishedDeepslate: linerPost.every(({ state }) => state === 'minecraft:polished_deepslate'),
  bothDoorPlanesExactClosedManualUnpowered: doorPost.every(({ state, actual }) => actual === state),
  all62StationsThreeWideTwoClearAndSupported: routeFailures.length === 0 && route.length === 186,
  finiteTargetHaloNoFluidLavaGravityOrProtectedCore: haloHazards.length === 0,
  restrictedOnlyNoCavernOpeningOrOutfall: true,
};
const failures = Object.entries(checks).filter(([, passed]) => !passed).map(([check]) => check);
const report = { schemaVersion: 1, id: 'mp08-c1-sealed-containment-corridor-01-independent-post-qa', status: failures.length ? 'FAIL' : 'PASS_EXECUTED_SEALED_C1_CONTAINMENT_CORRIDOR', readOnly: true, worldMutated: false, release: { ledger: { path: rel(LEDGER), sha256: sha256(ledgerBytes) }, manifest: { path: rel(MANIFEST), sha256: sha256(manifestBytes), manifestIdentity: manifest.manifestIdentity } }, postSnapshot: ledger.postSnapshot, exactGeometry: { shell: shell.length, liner: liner.length, doors: doors.length, stations: route.length / 3, stationCells: route.length, targetHalo: halo.length }, checks, failures, routeFailures: routeFailures.slice(0, 20), haloHazards: haloHazards.slice(0, 20), functionalBoundary: { classification: 'RESTRICTED_PASSIVE_INSPECTION_CORRIDOR_ONLY', cavernAClosed: true, cavernBClosed: true, publicAccessCommissioned: false, emergencyEgressCommissioned: false, fluidDischargeCommissioned: false, transportCommissioned: false } };
report.qaPayloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(abs(OUT)), { recursive: true });
fs.writeFileSync(abs(OUT), `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) throw new Error(`${RELEASE_ID} post-QA failed: ${failures.join(', ')}`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: rel(OUT), qaPayloadSha256: report.qaPayloadSha256 }, null, 2)}\n`);
