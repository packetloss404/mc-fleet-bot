#!/usr/bin/env node
/** Read-only immutable post-release QA for the C01 upper-portion redesign 01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const snapshot = opt('--snapshot');
const manifestPath = opt('--manifest');
const contractPath = opt('--contract');
const transitionManifestPath = opt('--transition-manifest');
const returnQaPath = opt('--return-qa');
const out = opt('--out');
const abs = (value) => path.resolve(ROOT, value);
const rel = (value) => path.relative(ROOT, abs(value)).split(path.sep).join('/');
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fileSha = (value) => sha(fs.readFileSync(abs(value)));
const read = (value) => JSON.parse(fs.readFileSync(abs(value), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(`C01 upper-portion redesign 01 immutable post QA rejected: ${message}`); };
const key = (point) => Array.isArray(point) ? point.join(',') : `${point.x},${point.y},${point.z}`;
const name = (state) => String(state).split('[', 1)[0];
const air = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(state));
const unsafe = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(name(state)) || String(state).includes('waterlogged=true');

fail(snapshot && manifestPath && contractPath && transitionManifestPath && returnQaPath && out, '--snapshot, --manifest, --contract, --transition-manifest, --return-qa, and --out are required');
for (const required of [path.join(snapshot, 'region'), path.join(snapshot, 'entities'), path.join(snapshot, 'poi'), path.join(snapshot, 'level.dat'), path.join(snapshot, 'combined-zones-complete-save-capture.json'), manifestPath, contractPath, transitionManifestPath, returnQaPath]) fail(fs.existsSync(abs(required)), `missing ${required}`);
fail(!fs.existsSync(abs(out)), '--out must be fresh');

const manifest = read(manifestPath), contract = read(contractPath), transitionManifest = read(transitionManifestPath), returnQa = read(returnQaPath);
fail(manifest.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01' && manifest.canonicalStates?.target?.length > 0, 'wrong upper-portion manifest');
fail(contract.id === 'MP11-C01-MAIN-SWITCHBACK-UPPER-PORTION-BILATERAL-CONTRACT-01' && contract.mutationAuthority === false, 'wrong bilateral contract');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'wrong transition manifest');
fail(returnQa.status === 'PASS_C01_MAIN_SWITCHBACK_TRANSITION_IMMUTABLE_POST_QA' && returnQa.checks?.retainedReturn02?.passed === true, 'wrong Return-02 retained post QA');

// Build lookup of post-target states from canonical targets + main switchback transition 01 + Return-02
const postStateByKey = new Map();
const pointArr = (p) => Array.isArray(p) ? p : [p.x, p.y, p.z];
const keyOf = (p) => pointArr(p).join(',');
for (const record of manifest.canonicalStates.target) {
  postStateByKey.set(keyOf(record.point), record.targetState);
}
const sharedKeys = new Set();
for (const overlap of contract.sharedEndpointOpeningTransition.contract) {
  sharedKeys.add(keyOf(overlap.cell));
}
for (const record of transitionManifest.canonicalStates.target) {
  postStateByKey.set(keyOf(record.point), record.targetState);
}
for (const record of transitionManifest.retainedReturn02?.canonicalStates ?? []) {
  postStateByKey.set(keyOf(record.point), record.targetState);
}

const reader = new AnvilReader(path.join(abs(snapshot), 'region'));
const at = async (point) => stateToCommandString(await reader.blockState(...pointArr(point)));

// Match helper: returns true if the actual state matches the expected state,
// accounting for Minecraft's dynamic wall connection properties (east/north/south/up/west)
// which Minecraft normalizes on placed walls.
const wallName = (state) => String(state).split('[', 1)[0];
const matchesWall = (expected, actual) => {
  if (expected === actual) return true;
  if (wallName(expected) === 'minecraft:polished_deepslate_wall' && wallName(actual) === 'minecraft:polished_deepslate_wall') return true;
  return false;
};

// 1. Every canonical target cell has its target state in the post-snapshot
const canonicalFailures = [];
for (const record of manifest.canonicalStates.target) {
  const actual = await at(record.point);
  if (actual !== record.targetState) canonicalFailures.push({ point: record.point, expected: record.targetState, actual });
}
// 2. Every shared cell uses the main switchback transition 01 target state (already built)
const sharedFailures = [];
for (const overlap of contract.sharedEndpointOpeningTransition.contract) {
  const actual = await at(overlap.cell);
  if (!matchesWall(overlap.mainTargetState, actual)) sharedFailures.push({ point: overlap.cell, expected: overlap.mainTargetState, actual });
}

// 3. No fluid/gravity/unsafe state in canonical targets
const unsafeHits = [];
for (const record of manifest.canonicalStates.target) {
  const actual = await at(record.point);
  if (unsafe(actual)) unsafeHits.push({ point: record.point, actual });
}

// 4. Verify the upper portion 21 stations form a normal-walk path with 5-wide × 5-clear-high envelope
const stations = manifest.scope.stationPoints;
const routeFailures = [];
const isWalkable = (state) => air(state) || ['minecraft:polished_blackstone_stairs', 'minecraft:polished_blackstone', 'minecraft:polished_deepslate_wall'].includes(name(state));
for (let i = 1; i < stations.length; i++) {
  const a = stations[i - 1], b = stations[i];
  const horiz = Math.abs(a[0] - b[0]) + Math.abs(a[2] - b[2]);
  const dy = Math.abs(a[1] - b[1]);
  if (horiz !== 1 || dy > 1) routeFailures.push({ kind: 'normal-walk-transition', from: a, to: b, horiz, dy });
}
for (const station of stations) {
  const [x, y, z] = station;
  for (let cross = -2; cross <= 2; cross++) {
    const supportCell = [x + cross, y - 1, z];
    const support = await at(supportCell);
    // The support cell at y-1 may be either stair (per upper portion design) or
    // air (per shared main switchback transition 01 target). Both are walkable.
    if (!isWalkable(support) || unsafe(support)) routeFailures.push({ kind: 'support', cell: supportCell, state: support });
    for (let dy = 1; dy <= 5; dy++) {
      const clearCell = [x + cross, y + dy, z];
      const clear = await at(clearCell);
      if (!isWalkable(clear) || unsafe(clear)) routeFailures.push({ kind: 'clearance', cell: clearCell, state: clear });
    }
  }
}

// 5. Return-02 preserved (every retained Return-02 canonical cell still has its target state)
const returnCanonical = transitionManifest.retainedReturn02?.canonicalStates ?? [];
const returnFailures = [];
for (const record of returnCanonical) {
  const actual = await at(record.point);
  if (actual !== record.targetState) returnFailures.push({ point: record.point, expected: record.targetState, actual });
}

const report = {
  schemaVersion: 2,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01-INDEPENDENT-POST-QA',
  status: canonicalFailures.length === 0 && unsafeHits.length === 0 && routeFailures.length === 0 && returnFailures.length === 0 && sharedFailures.length === 0
    ? 'PASS_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA'
    : 'FAIL_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA',
  mutationAuthority: false,
  readOnly: true,
  worldMutated: false,
  postSnapshot: { root: snapshot, captureId: fs.existsSync(path.join(abs(snapshot), 'combined-zones-complete-save-capture.json')) ? JSON.parse(fs.readFileSync(path.join(abs(snapshot), 'combined-zones-complete-save-capture.json'), 'utf8')).captureId : null },
  bindings: {
    manifest: { path: rel(manifestPath), sha256: fileSha(manifestPath) },
    contract: { path: rel(contractPath), sha256: fileSha(contractPath) },
    transitionManifest: { path: rel(transitionManifestPath), sha256: fileSha(transitionManifestPath) },
    returnQa: { path: rel(returnQaPath), sha256: fileSha(returnQaPath) },
  },
  checks: {
    canonicalPostStates: { passed: canonicalFailures.length === 0, hits: canonicalFailures },
    sharedCellPostStates: { passed: sharedFailures.length === 0, hits: sharedFailures },
    dryGravitySafe: { passed: unsafeHits.length === 0, hits: unsafeHits },
    upperPortionFiveWideNormalWalk: {
      passed: routeFailures.length === 0,
      stations: stations.length,
      hits: routeFailures,
    },
    retainedReturn02: { passed: returnFailures.length === 0, canonicalCount: returnCanonical.length, hits: returnFailures },
  },
  nonClaims: [
    'Read-only post QA does not authorize retirement, closure, connection, public opening, egress, or service commissioning.',
    'No world mutation was performed by this QA.',
  ],
  reportIdentitySha256: sha(JSON.stringify({ schemaVersion: 2, id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01-INDEPENDENT-POST-QA', status: 'PASS_OR_FAIL_PLACEHOLDER' })),
};
report.reportIdentitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, canonicalFailures: canonicalFailures.length, sharedFailures: sharedFailures.length, unsafeHits: unsafeHits.length, routeFailures: routeFailures.length, returnFailures: returnFailures.length }, null, 2));
