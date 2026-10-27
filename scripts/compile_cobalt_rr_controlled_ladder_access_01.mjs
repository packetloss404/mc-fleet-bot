#!/usr/bin/env node
/** Compile bounded controlled ladder access in the existing Ravensreach headhouse. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-cobalt-s1-passive-rail-post-20260826T183111Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'cobalt-rr-controlled-ladder-access-01');
const GENERATED_AT = value('--generated-at', '2026-08-26T00:00:00Z');
const RELEASE_ID = 'COBALT-RR-CONTROLLED-LADDER-ACCESS-01';
const RELEASE_NODE_ID = 'CZ-SYS03-COBALT-RR-CONTROLLED-LADDER-ACCESS';
const AUTHORIZATION_PATH = 'docs/masterplans/05-combined-zones/sys03-cobalt-rr-controlled-ladder-governor-standing-execution-authorization.json';
const AIR = 'minecraft:air';
const PD = 'minecraft:polished_deepslate';
const PA = 'minecraft:polished_andesite';
const LADDER = 'minecraft:ladder[facing=west,waterlogged=false]';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
const exact = (cells) => {
  const set = uniqueCells(cells);
  return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) };
};
const base = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(base(state)) || state.includes('waterlogged=true');
const gravity = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:dragon_egg']);
const protectedBlocks = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:spawner', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block']);
const census = (records, field) => Object.fromEntries([...records.reduce((counts, record) => {
  counts.set(record[field], (counts.get(record[field]) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));

const capturePath = abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
fail(fs.existsSync(capturePath), `complete-save capture missing: ${capturePath}`);
const captureBytes = fs.readFileSync(capturePath);
const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && Array.isArray(capture.requiredMembers) && capture.requiredMembers.length > 0, 'source is not a complete immutable save');
for (const member of capture.requiredMembers) {
  const filename = abs(path.join(SNAPSHOT, member.path));
  fail(fs.existsSync(filename) && fs.statSync(filename).size === member.bytes && sha256(fs.readFileSync(filename)) === member.sha256, `source member drifted: ${member.path}`);
}

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

// Existing RR-SE-2 headhouse: 3x3 dry shaft x=-153..-151,z=-390..-388,
// y18..61, with a y62 surface pad. The ladder uses the fully sealed east
// sleeve wall; the north sleeve's historical water pocket is not touched.
const ladderCells = [];
const attachments = [];
for (let y = 19; y <= 62; y += 1) {
  ladderCells.push({ x: -151, y, z: -390 });
  attachments.push({ x: -150, y, z: -390 });
}
const lowerLanding = [
  { x: -151, y: 18, z: -390 }, { x: -152, y: 18, z: -390 }, { x: -151, y: 18, z: -389 },
  { x: -151, y: 19, z: -389 }, { x: -152, y: 19, z: -389 },
];
const upperExit = [{ x: -151, y: 63, z: -390 }, { x: -152, y: 63, z: -390 }, { x: -151, y: 63, z: -389 }, { x: -152, y: 63, z: -389 }];
const interactionSet = uniqueCells([...ladderCells, ...attachments, ...lowerLanding, ...upperExit]);
const records = [];
for (const cell of ladderCells) {
  const sourceState = await stateAt(cell);
  fail(sourceState === AIR || (cell.y === 62 && sourceState === PA), `ladder target drift at ${cellKey(cell)} (${sourceState})`);
  records.push({ cell, sourceState, targetState: LADDER });
}
for (const cell of attachments) {
  const state = await stateAt(cell);
  fail(state === PD || (cell.y === 62 && state === PA), `north sleeve/pad attachment drift at ${cellKey(cell)} (${state})`);
}
for (const cell of lowerLanding) fail(await stateAt(cell) === AIR, `lower controlled landing is not clear at ${cellKey(cell)}`);
for (const cell of upperExit) fail(await stateAt(cell) === AIR, `surface exit is not clear at ${cellKey(cell)}`);
for (const cell of interactionSet) {
  const state = await stateAt(cell);
  fail(!fluid(state) && !gravity.has(base(state)) && !protectedBlocks.has(base(state)), `unsafe interaction state at ${cellKey(cell)} (${state})`);
}

const ordered = records.slice().sort((a, b) => a.cell.y - b.cell.y);
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${ordered.slice().reverse().map(({ cell, sourceState, targetState }) => replLine(cell, targetState, sourceState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forward = path.join(OUT_DIR, `${BASENAME}.controlled-ladder.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.controlled-ladder.rollback.txt`);
const header = (direction, operationSha256) => [`# GENERATED FILE - ${RELEASE_ID} (controlled ladder ${direction})`, `# source root: ${SNAPSHOT}`, `# target coordinate-set SHA-256: ${hashCells(records.map(({ cell }) => cell))}`, `# operation SHA-256: ${operationSha256}`].join('\n');
fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(abs(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const manifestWithoutIdentity = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_COMPLETE_HISTORICAL_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID, mvpScope: false, scopeIds: ['SYS-03', 'PASSENGER-RAILWAY'],
  packages: [{ key: 'controlled-ladder', forward: rel(forward), rollback: rel(rollback) }],
  executionOrder: { forward: ['controlled-ladder'], rollback: ['controlled-ladder'] },
  scopedRunner: { wrapper: 'scripts/run_combined_zones_scoped_release.mjs', authorization: AUTHORIZATION_PATH, releaseNodeId: RELEASE_NODE_ID, packagePathsMustRemainUnder: 'data/buildops', defaultMode: 'PREPARE_ONLY', liveExecutionOptIn: '--execute' },
  source: { snapshotRoot: SNAPSHOT, completeSaveCapture: { path: rel(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), sha256: sha256(captureBytes), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, immutableCopy: capture.immutableCopy, verifiedRequiredMemberCount: capture.requiredMembers.length } },
  scope: {
    releaseId: RELEASE_ID, canonicalOwner: 'PASSENGER-RAILWAY',
    governorDelegatedRoles: { scopeOwner: 'Passenger Railway implementation lead', counterpartOwner: 'Ravensreach civic interface lead', safetyAndRecoveryOwner: 'Passenger Railway safety/recovery lead', releaseOperator: 'Guarded-release implementation operator' },
    purpose: 'Make the existing sealed Ravensreach RR-SE-2 headhouse shaft usable for controlled staff access with one attached ladder column. It retains the north-wall water pocket and does not create a normal-walk public route or commission rail service.',
    selectedStationPair: 'Westlight (PR-W02) ↔ Ravensreach (PR-W04)', ladderCells: exact(ladderCells), retainedEastSleeveAttachments: exact(attachments), lowerControlledLanding: exact(lowerLanding), upperSurfaceExit: exact(upperExit), interactionSet: exact(interactionSet),
    waterSleeveModified: false, normalWalkRouteCommissioned: false, passengerServiceCommissioned: false,
  },
  target: { operatedUnion: exact(records.map(({ cell }) => cell)), sourceStateCensus: census(records, 'sourceState'), desiredStateCensus: census(records, 'targetState'), packageTargetsDisjoint: true },
  operations: { 'controlled-ladder': { forwardSha256, rollbackSha256, forwardCommandCount: ordered.length, rollbackCommandCount: ordered.length, targetCellCount: ordered.length, targetCoordinateSetSha256: hashCells(records.map(({ cell }) => cell)), exactInverse: true } },
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresSourceToReproveLadderAttachmentAndClearExits: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresExactSourcePreflight: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true, requiresFunctionalControlledAccessQa: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false, noExternalSignaturesRequired: true },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(
  abs(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)),
  `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`,
);
console.log(JSON.stringify({ status: manifestWithoutIdentity.status, manifest: rel(path.join(OUT_DIR, `${BASENAME}.release-manifest.json`)), targetCount: records.length, interactionSetCount: interactionSet.length, manifestIdentity, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
