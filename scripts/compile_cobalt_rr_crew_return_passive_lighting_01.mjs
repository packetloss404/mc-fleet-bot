#!/usr/bin/env node
/** Add static, unpowered wayfinding light to the connected Ravensreach crew-return path. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const SNAPSHOT = arg('--snapshot', 'data/worldsnap-cobalt-rr-south-crew-return-post-20260826T220500Z');
const OUT = arg('--out-dir', 'data/buildops');
const BASE = arg('--basename', 'cobalt-rr-crew-return-passive-lighting-01');
const STAMP = arg('--generated-at', '2026-08-26T22:20:00.000Z');
const ID = 'COBALT-RR-CREW-RETURN-PASSIVE-LIGHTING-01';
const NODE = 'CZ-SYS03-COBALT-RR-CREW-RETURN-PASSIVE-LIGHTING';
const AUTH = 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-crew-return-passive-lighting-governor-standing-execution-authorization.json';
const PD = 'minecraft:polished_deepslate';
const LIGHT = 'minecraft:sea_lantern';
const RAIL = 'minecraft:rail[shape=east_west,waterlogged=false]';
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (value, message) => {
  if (!value) throw new Error(`${ID} compiler rejected: ${message}`);
};
const base = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const protectedBlocks = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const exact = (cells) => {
  const unique = uniqueCells(cells);
  return { cellCount: unique.length, bounds: unique.length ? boundsOf(unique) : null, coordinateSetSha256: hashCells(unique) };
};
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => {
  counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.requiredMembers?.length > 0, 'complete immutable source missing');
for (const member of capture.requiredMembers) {
  const filename = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha(fs.readFileSync(filename)) === member.sha256, `source drift ${member.path}`);
}

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const fixtures = [
  { x: -176, y: 15, z: -383, zone: 'north-platform' },
  { x: -169, y: 15, z: -383, zone: 'north-platform' },
  { x: -176, y: 15, z: -377, zone: 'south-platform' },
  { x: -169, y: 15, z: -377, zone: 'south-platform' },
  { x: -162, y: 15, z: -383, zone: 'east-return-bridge' },
  { x: -162, y: 15, z: -380, zone: 'east-return-bridge' },
];
const railRetention = [
  ...Array.from({ length: 18 }, (_, index) => ({ x: -181 + index, y: 13, z: -386 })),
  ...Array.from({ length: 18 }, (_, index) => ({ x: -181 + index, y: 13, z: -380 })),
];
const records = [];
for (const fixture of fixtures) {
  const sourceState = await stateAt(fixture);
  fail(sourceState === PD, `fixture source must retain a containment wall at ${cellKey(fixture)} (${sourceState})`);
  records.push({ cell: fixture, sourceState, targetState: LIGHT, zone: fixture.zone });
}
for (const rail of railRetention) fail(await stateAt(rail) === RAIL, `retained rail drift ${cellKey(rail)}`);
const halo = uniqueCells(fixtures.flatMap(({ x, y, z }) => [
  { x: x + 1, y, z }, { x: x - 1, y, z }, { x, y: y + 1, z }, { x, y: y - 1, z }, { x, y, z: z + 1 }, { x, y, z: z - 1 },
]));
for (const cell of halo) {
  const state = await stateAt(cell);
  fail(!fluid(state) && !gravity.has(base(state)) && !protectedBlocks.has(base(state)), `unsafe fixture halo ${cellKey(cell)} ${state}`);
}

const ordered = records.slice().sort((left, right) => left.cell.x - right.cell.x || left.cell.z - right.cell.z);
const forwardBody = `${ordered.map((record) => replLine(record.cell, record.sourceState, record.targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map((record) => replLine(record.cell, record.targetState, record.sourceState)).join('\n')}\n`;
fs.mkdirSync(abs(OUT), { recursive: true });
const forward = path.join(OUT, `${BASE}.passive-lighting.forward.txt`);
const rollback = path.join(OUT, `${BASE}.passive-lighting.rollback.txt`);
const header = (direction, operationSha256) => [
  `# GENERATED FILE - ${ID} (${direction})`,
  `# source root: ${SNAPSHOT}`,
  `# target coordinate-set SHA-256: ${hashCells(records.map((record) => record.cell))}`,
  `# operation SHA-256: ${operationSha256}`,
].join('\n');
fs.writeFileSync(abs(forward), `${header('forward', sha(forwardBody))}\n${forwardBody}`);
fs.writeFileSync(abs(rollback), `${header('rollback', sha(rollbackBody))}\n${rollbackBody}`);
const core = {
  schemaVersion: 1,
  transactionId: BASE,
  generatedAtUtc: STAMP,
  status: 'COMPILED_FROM_COMPLETE_POSTSOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: NODE,
  mvpScope: false,
  scopeIds: ['SYS-03', 'PASSENGER-RAILWAY'],
  packages: [{ key: 'passive-lighting', forward: rel(forward), rollback: rel(rollback) }],
  executionOrder: { forward: ['passive-lighting'], rollback: ['passive-lighting'] },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTH, releaseNodeId: NODE, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(capturePath), sha256: sha(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: true, verifiedRequiredMemberCount: capture.requiredMembers.length } },
  scope: {
    releaseId: ID,
    canonicalOwner: 'PASSENGER-RAILWAY',
    governorDelegatedRoles: { scopeOwner: 'Passenger Railway implementation lead', counterpartOwner: 'Ravensreach civic interface lead', safetyAndRecoveryOwner: 'Passenger Railway safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' },
    purpose: 'Add six static passive-light fixtures to the complete north-platform → east return bridge → south-platform crew return, so every connected segment has a retained-wall fixture without touching either rail.',
    fixtures: exact(fixtures),
    fixtureZones: { northPlatform: 2, eastReturnBridge: 2, southPlatform: 2 },
    retainedDirectionalRails: exact(railRetention),
    crewReturnWayfindingLit: true,
    railPowerCommissioned: false,
    signalCommissioned: false,
    publicPlatformCommissioned: false,
    passengerServiceCommissioned: false,
  },
  target: { operatedUnion: exact(records.map((record) => record.cell)), sourceStateCensus: census(records, 'sourceState'), desiredStateCensus: census(records, 'targetState'), packageTargetsDisjoint: true },
  operations: { 'passive-lighting': { forwardSha256: sha(forwardBody), rollbackSha256: sha(rollbackBody), forwardCommandCount: records.length, rollbackCommandCount: records.length, targetCellCount: records.length, targetCoordinateSetSha256: hashCells(records.map((record) => record.cell)), exactInverse: true } },
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresSourceToReproveCrewReturnAndRailRetention: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresExactSourcePreflight: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresFunctionalControlledAccessQa: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true, forbiddenClaims: ['emergency lighting system', 'rail power', 'signal operation', 'public platform', 'passenger boarding', 'passenger service'] },
};
const manifest = { ...core, manifestIdentity: sha(JSON.stringify(core)) };
const manifestPath = path.join(OUT, `${BASE}.release-manifest.json`);
fs.writeFileSync(abs(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: rel(manifestPath), targetCount: records.length, zones: manifest.scope.fixtureZones, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
