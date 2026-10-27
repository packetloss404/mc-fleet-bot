#!/usr/bin/env node
/** Compile the final Cobalt guideway-bed water diaphragm, without draining water. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-guideway4-post-20260826T032500Z');
const OUT = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'rail-guideway-05-water-diaphragm');
const TARGET = { x: -180, y: 12, z: -454 };
const RELEASE_ID = 'RAIL-S3-GUIDEWAY-05';
const absolute = (filename) => path.resolve(ROOT, filename);
const sha = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`); };
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetState = await stateAt(TARGET);
fail(targetState === 'minecraft:water[level=8]', `target is not the surveyed falling-water state: ${targetState}`);
for (const [label, cell] of Object.entries({
  west: { x: -181, y: 12, z: -454 }, east: { x: -179, y: 12, z: -454 },
  north: { x: -180, y: 12, z: -455 }, south: { x: -180, y: 12, z: -453 },
})) fail((await stateAt(cell)) === 'minecraft:polished_deepslate', `lateral containment drift at ${label}`);
for (const [label, cell] of Object.entries({ upper: { x: -180, y: 13, z: -454 }, lower: { x: -180, y: 11, z: -454 } })) {
  fail((await stateAt(cell)).startsWith('minecraft:water'), `${label} retained water column drift`);
}
const forwardBody = `${replLine(TARGET, targetState, 'minecraft:polished_deepslate')}\n`;
const rollbackBody = `${replLine(TARGET, 'minecraft:polished_deepslate', targetState)}\n`;
const forward = `data/buildops/${BASENAME}.water-diaphragm.forward.txt`;
const rollback = `data/buildops/${BASENAME}.water-diaphragm.rollback.txt`;
const forwardSha256 = sha(forwardBody); const rollbackSha256 = sha(rollbackBody);
const header = (direction, opHash) => `# GENERATED FILE - ${RELEASE_ID} (${direction})\n# source root: ${SNAPSHOT}\n# target coordinate-set SHA-256: ${hashCells([TARGET])}\n# operation SHA-256: ${opHash}`;
fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
const manifest = {
  schemaVersion: 1, transactionId: BASENAME, generatedAtUtc: value('--generated-at', new Date().toISOString()),
  status: 'COMPILED_FROM_FRESH_CONTAINMENT_SURVEY_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL',
  releaseNodeId: 'PASSENGER-RAILWAY', mvpScope: false, scopeIds: ['SYS-03', 'MP05-B'],
  packages: [{ key: 'water-diaphragm', forward, rollback }], executionOrder: { forward: ['water-diaphragm'], rollback: ['water-diaphragm'] }, source: { snapshotRoot: SNAPSHOT },
  scope: { releaseId: RELEASE_ID, canonicalOwner: 'PASSENGER-RAILWAY', purpose: 'Replace exactly one fully laterally-contained falling-water guideway-bed cell with a polished-deepslate diaphragm, preserving the upper and lower water column as separate contained bodies.', target: TARGET, lateralContainment: 'four polished_deepslate faces', preservedWater: [{ x: -180, y: 11, z: -454 }, { x: -180, y: 13, z: -454 }], routeCommissioned: false, passengerServiceCommissioned: false },
  target: { operatedUnion: { cellCount: 1, coordinateSetSha256: hashCells([TARGET]), bounds: { minX: -180, maxX: -180, minY: 12, maxY: 12, minZ: -454, maxZ: -454 } }, sourceStateCensus: { [targetState]: 1 }, desiredStateCensus: { 'minecraft:polished_deepslate': 1 }, packageTargetsDisjoint: true },
  operations: { 'water-diaphragm': { role: 'laterally-contained water-column diaphragm', forwardSha256, rollbackSha256, forwardCommandCount: 1, rollbackCommandCount: 1, targetCellCount: 1, targetCoordinateSetSha256: hashCells([TARGET]), exactInverse: true } },
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresExactContainmentFaces: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, executionAuthorizedByThisManifest: false },
};
manifest.manifestIdentity = sha(JSON.stringify(manifest));
fs.writeFileSync(absolute(path.join(OUT, `${BASENAME}.release-manifest.json`)), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, target: TARGET, manifestIdentity: manifest.manifestIdentity }, null, 2));
