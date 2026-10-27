#!/usr/bin/env node
/** Read-only immutable post-release QA for the C01 endpoint/opening/transition release. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const snapshot = opt('--snapshot');
const manifestPath = opt('--manifest');
const transitionManifestPath = opt('--transition-manifest');
const upperManifestPath = opt('--upper-manifest');
const returnQaPath = opt('--return-qa');
const out = opt('--out');
const abs = (v) => path.resolve(ROOT, v);
const rel = (v) => path.relative(ROOT, abs(v)).split(path.sep).join('/');
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const fileSha = (v) => sha(fs.readFileSync(abs(v)));
const read = (v) => JSON.parse(fs.readFileSync(abs(v), 'utf8'));
const fail = (ok, message) => { if (!ok) throw new Error(`C01 endpoint/opening/transition immutable post QA rejected: ${message}`); };
const key = (c) => Array.isArray(c) ? c.join(',') : `${c.x},${c.y},${c.z}`;
const name = (s) => String(s).split('[', 1)[0];
const air = (s) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(name(s));
const unsafe = (s) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(name(s)) || String(s).includes('waterlogged=true');
const matchesWall = (a, b) => a === b || (name(a) === 'minecraft:polished_deepslate_wall' && name(b) === 'minecraft:polished_deepslate_wall');

fail(snapshot && manifestPath && transitionManifestPath && upperManifestPath && returnQaPath && out, '--snapshot, --manifest, --transition-manifest, --upper-manifest, --return-qa, and --out are required');
for (const required of [path.join(snapshot, 'region'), path.join(snapshot, 'entities'), path.join(snapshot, 'poi'), path.join(snapshot, 'level.dat'), path.join(snapshot, 'combined-zones-complete-save-capture.json'), manifestPath, transitionManifestPath, upperManifestPath, returnQaPath]) fail(fs.existsSync(abs(required)), `missing ${required}`);
fail(!fs.existsSync(abs(out)), '--out must be fresh');

const manifest = read(manifestPath), transitionManifest = read(transitionManifestPath), upperManifest = read(upperManifestPath), returnQa = read(returnQaPath);
fail(manifest.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-01' && manifest.canonicalStates?.target?.length > 0, 'wrong endpoint manifest');
fail(transitionManifest.id === 'MP11-C01-MAIN-SWITCHBACK-TRANSITION-01' && transitionManifest.canonicalStates?.target?.length === 928, 'wrong main switchback transition 01 manifest');
fail(upperManifest.id === 'MP11-C01-PUBLIC-VERTICAL-UPPER-PORTION-REDESIGN-01' && upperManifest.canonicalStates?.target?.length > 0, 'wrong upper portion manifest');
fail(returnQa.status === 'PASS_C01_UPPER_PORTION_REDESIGN_01_IMMUTABLE_POST_QA' && returnQa.checks?.retainedReturn02?.passed === true, 'wrong Return-02 retained post QA');

const postStateByKey = new Map();
for (const r of manifest.canonicalStates.target) postStateByKey.set(key(r.point), r.targetState);
for (const r of transitionManifest.canonicalStates.target) postStateByKey.set(key(r.point), r.targetState);
for (const r of upperManifest.canonicalStates.target) postStateByKey.set(key(r.point), r.targetState);

const reader = new AnvilReader(path.join(abs(snapshot), 'region'));
const at = async (point) => stateToCommandString(await reader.blockState(...(Array.isArray(point) ? point : [point.x, point.y, point.z])));

const canonicalFailures = [];
for (const record of manifest.canonicalStates.target) {
  const actual = await at(record.point);
  if (!matchesWall(actual, record.targetState)) canonicalFailures.push({ point: record.point, expected: record.targetState, actual });
}

const unsafeHits = [];
for (const record of manifest.canonicalStates.target) {
  const actual = await at(record.point);
  if (unsafe(actual)) unsafeHits.push({ point: record.point, actual });
}

// Return-02 preserved
const returnCanonical = transitionManifest.retainedReturn02?.canonicalStates ?? [];
const returnFailures = [];
for (const record of returnCanonical) {
  const actual = await at(record.point);
  if (actual !== record.targetState) returnFailures.push({ point: record.point, expected: record.targetState, actual });
}

// Main switchback + upper portion preserved (sample check)
const transitionTargets = transitionManifest.canonicalStates.target;
const transitionFailures = [];
for (const record of transitionTargets) {
  const actual = await at(record.point);
  if (!matchesWall(actual, record.targetState)) transitionFailures.push({ point: record.point, expected: record.targetState, actual });
}
const upperTargets = upperManifest.canonicalStates.target;
const upperFailures = [];
for (const record of upperTargets) {
  const actual = await at(record.point);
  if (!matchesWall(actual, record.targetState)) upperFailures.push({ point: record.point, expected: record.targetState, actual });
}

const report = {
  schemaVersion: 2,
  id: 'MP11-C01-PUBLIC-VERTICAL-UPPER-LANDING-ENDPOINT-OPENING-TRANSITION-01-INDEPENDENT-POST-QA',
  status: canonicalFailures.length === 0 && unsafeHits.length === 0 && returnFailures.length === 0 && transitionFailures.length === 0 && upperFailures.length === 0
    ? 'PASS_C01_UPPER_LANDING_ENDPOINT_TRANSITION_IMMUTABLE_POST_QA'
    : 'FAIL_C01_UPPER_LANDING_ENDPOINT_TRANSITION_IMMUTABLE_POST_QA',
  mutationAuthority: false,
  readOnly: true,
  worldMutated: false,
  postSnapshot: { root: snapshot, captureId: fs.existsSync(path.join(abs(snapshot), 'combined-zones-complete-save-capture.json')) ? JSON.parse(fs.readFileSync(path.join(abs(snapshot), 'combined-zones-complete-save-capture.json'), 'utf8')).captureId : null },
  bindings: {
    manifest: { path: rel(manifestPath), sha256: fileSha(manifestPath) },
    transitionManifest: { path: rel(transitionManifestPath), sha256: fileSha(transitionManifestPath) },
    upperManifest: { path: rel(upperManifestPath), sha256: fileSha(upperManifestPath) },
    returnQa: { path: rel(returnQaPath), sha256: fileSha(returnQaPath) },
  },
  checks: {
    canonicalPostStates: { passed: canonicalFailures.length === 0, hits: canonicalFailures },
    dryGravitySafe: { passed: unsafeHits.length === 0, hits: unsafeHits },
    retainedMainSwitchbackTransition01: { passed: transitionFailures.length === 0, canonicalCount: transitionTargets.length, hits: transitionFailures.slice(0, 5) },
    retainedUpperPortionRedesign01: { passed: upperFailures.length === 0, canonicalCount: upperTargets.length, hits: upperFailures.slice(0, 5) },
    retainedReturn02: { passed: returnFailures.length === 0, canonicalCount: returnCanonical.length, hits: returnFailures },
  },
  nonClaims: [
    'Read-only post QA does not authorize retirement, closure, connection, public opening, egress, or service commissioning.',
    'No world mutation was performed by this QA.',
  ],
  reportIdentitySha256: '',
};
report.reportIdentitySha256 = sha(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  canonicalFailures: canonicalFailures.length,
  unsafeHits: unsafeHits.length,
  transitionFailures: transitionFailures.length,
  upperFailures: upperFailures.length,
  returnFailures: returnFailures.length,
}, null, 2));
