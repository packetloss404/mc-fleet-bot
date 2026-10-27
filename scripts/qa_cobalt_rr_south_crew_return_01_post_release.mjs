#!/usr/bin/env node
/** Independent post-release QA for the Ravensreach two-direction crew-return connection. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback = null) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const requireArg = (name) => {
  const value = arg(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const ledgerPath = requireArg('--ledger');
const out = requireArg('--out');
const manifestPath = arg('--manifest', 'data/buildops/cobalt-rr-south-crew-return-01.release-manifest.json');
const ID = 'COBALT-RR-SOUTH-CREW-RETURN-01';
const NODE = 'CZ-SYS03-COBALT-RR-SOUTH-CREW-RETURN';
const TX = 'cobalt-rr-south-crew-return-01';
const abs = (value) => path.resolve(ROOT, value);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => {
  if (!value) throw new Error(`${ID} post-QA rejected: ${message}`);
};
const box = ({ minX, maxX, minY, maxY, minZ, maxZ }) => {
  const cells = [];
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) for (let z = minZ; z <= maxZ; z++) cells.push({ x, y, z });
  return cells;
};
const ledger = JSON.parse(fs.readFileSync(abs(ledgerPath), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(abs(manifestPath), 'utf8'));
fail(
  ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
    && ledger.releaseNodeId === NODE
    && ledger.transactionId === TX
    && manifest.scope?.releaseId === ID,
  'identity/status drifted',
);
fail(ledger.manifest?.sha256 === sha(fs.readFileSync(abs(manifestPath))), 'manifest binding drifted');
for (const stage of [
  'block-entity-clearance',
  'live-entity-clearance',
  'rollback-poststate-preflight:containment',
  'rollback-poststate-preflight:return',
]) fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `${stage} is not PASS`);

const southDeck = box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -379, maxZ: -378 });
const southHeadroom = box({ minX: -181, maxX: -164, minY: 14, maxY: 16, minZ: -378, maxZ: -378 });
const southWall = box({ minX: -181, maxX: -164, minY: 13, maxY: 16, minZ: -377, maxZ: -377 });
const bridgeDeck = box({ minX: -163, maxX: -163, minY: 13, maxY: 13, minZ: -384, maxZ: -378 });
const bridgeClear = box({ minX: -163, maxX: -163, minY: 14, maxY: 16, minZ: -384, maxZ: -378 });
const bridgeWall = box({ minX: -162, maxX: -162, minY: 13, maxY: 16, minZ: -384, maxZ: -378 });
const northRail = box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -386, maxZ: -386 });
const southRail = box({ minX: -181, maxX: -164, minY: 13, maxY: 13, minZ: -380, maxZ: -380 });
const reader = new AnvilReader(abs(ledger.postSnapshot.regions));
const read = async (cells) => Promise.all(cells.map(async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))));
const [deckStates, headStates, southWallStates, bridgeDeckStates, bridgeClearStates, bridgeWallStates, northRailStates, southRailStates] = await Promise.all([
  read(southDeck), read(southHeadroom), read(southWall), read(bridgeDeck), read(bridgeClear), read(bridgeWall), read(northRail), read(southRail),
]);
const is = (states, state) => states.every((value) => value === state);
fail(is(deckStates, 'minecraft:polished_andesite'), 'south crew deck drifted');
fail(is(headStates, 'minecraft:air'), 'south crew headroom drifted');
fail(is(southWallStates, 'minecraft:polished_deepslate'), 'south outer wall drifted');
fail(is(bridgeDeckStates, 'minecraft:polished_andesite'), 'return bridge deck drifted');
fail(is(bridgeClearStates, 'minecraft:air'), 'return bridge clear path drifted');
fail(is(bridgeWallStates, 'minecraft:polished_deepslate'), 'return bridge containment wall drifted');
fail(is(northRailStates, 'minecraft:rail[shape=east_west,waterlogged=false]'), 'north retained directional rail drifted');
fail(is(southRailStates, 'minecraft:rail[shape=east_west,waterlogged=false]'), 'south retained directional rail drifted');
const report = {
  schemaVersion: 1,
  id: 'cobalt-rr-south-crew-return-01-post-release-qa',
  status: 'PASS_EXECUTED_COBALT_RR_SOUTH_CREW_RETURN_QA',
  release: { ledger: ledgerPath, manifest: manifestPath },
  postSnapshot: ledger.postSnapshot,
  geometry: {
    southCrewDeck: southDeck.length,
    southCrewHeadroom: southHeadroom.length,
    southSafetyWall: southWall.length,
    eastReturnBridgeDeck: bridgeDeck.length,
    eastReturnBridgeClear: bridgeClear.length,
    eastReturnBridgeWall: bridgeWall.length,
    northRetainedRail: northRail.length,
    southRetainedRail: southRail.length,
  },
  functionalBoundary: {
    crewReturnConnectedWithoutRailCrossing: true,
    northAndSouthDirectionalRailsRetained: true,
    publicPlatformCommissioned: false,
    passengerServiceCommissioned: false,
  },
};
report.qaPayloadSha256 = sha(JSON.stringify(report));
fs.mkdirSync(path.dirname(abs(out)), { recursive: true });
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, out }, null, 2));
