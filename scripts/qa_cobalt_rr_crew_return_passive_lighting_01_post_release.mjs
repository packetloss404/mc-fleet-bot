#!/usr/bin/env node
/** Independent QA for static lighting across the Ravensreach crew-return route. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const need = (name) => {
  const value = arg(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const ledgerPath = need('--ledger');
const out = need('--out');
const manifestPath = arg('--manifest', 'data/buildops/cobalt-rr-crew-return-passive-lighting-01.release-manifest.json');
const ID = 'COBALT-RR-CREW-RETURN-PASSIVE-LIGHTING-01';
const NODE = 'CZ-SYS03-COBALT-RR-CREW-RETURN-PASSIVE-LIGHTING';
const TX = 'cobalt-rr-crew-return-passive-lighting-01';
const abs = (value) => path.resolve(ROOT, value);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => { if (!value) throw new Error(`${ID} post-QA rejected: ${message}`); };
const fixtures = [
  { x: -176, y: 15, z: -383 }, { x: -169, y: 15, z: -383 },
  { x: -176, y: 15, z: -377 }, { x: -169, y: 15, z: -377 },
  { x: -162, y: 15, z: -383 }, { x: -162, y: 15, z: -380 },
];
const rails = [
  ...Array.from({ length: 18 }, (_, index) => ({ x: -181 + index, y: 13, z: -386 })),
  ...Array.from({ length: 18 }, (_, index) => ({ x: -181 + index, y: 13, z: -380 })),
];
const ledger = JSON.parse(fs.readFileSync(abs(ledgerPath), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(abs(manifestPath), 'utf8'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' && ledger.releaseNodeId === NODE && ledger.transactionId === TX && manifest.scope?.releaseId === ID, 'identity/status drifted');
fail(ledger.manifest?.sha256 === sha(fs.readFileSync(abs(manifestPath))), 'manifest binding drifted');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:passive-lighting']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `${stage} is not PASS`);
}
const reader = new AnvilReader(abs(ledger.postSnapshot.regions));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const [fixtureStates, railStates] = await Promise.all([Promise.all(fixtures.map(state)), Promise.all(rails.map(state))]);
fail(fixtureStates.every((value) => value === 'minecraft:sea_lantern'), 'one or more passive fixtures drifted');
fail(railStates.every((value) => value === 'minecraft:rail[shape=east_west,waterlogged=false]'), 'retained directional rail drifted');
const report = {
  schemaVersion: 1,
  id: 'cobalt-rr-crew-return-passive-lighting-01-post-release-qa',
  status: 'PASS_EXECUTED_COBALT_RR_CREW_RETURN_PASSIVE_LIGHTING_QA',
  release: { ledger: ledgerPath, manifest: manifestPath },
  postSnapshot: ledger.postSnapshot,
  geometry: { staticFixtures: fixtures.length, retainedDirectionalRailCells: rails.length },
  functionalBoundary: { crewReturnWayfindingLit: true, railPowerCommissioned: false, signalCommissioned: false, publicPlatformCommissioned: false, passengerServiceCommissioned: false },
};
report.qaPayloadSha256 = sha(JSON.stringify(report));
fs.mkdirSync(path.dirname(abs(out)), { recursive: true });
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, out }, null, 2));
