#!/usr/bin/env node
/**
 * Independent post-state verifier for MP08-RR-T1B-WAYFINDING-01.
 *
 * This verifier is intentionally unusable against the source snapshot: it
 * requires an operator to name a fresh immutable post-release complete save.
 * It never contacts the live server and never writes world blocks.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const snapshot = value('--snapshot');
const out = value('--out');
if (!snapshot || !out) throw new Error('usage: qa_mp08_rr_t1b_two_wall_sign_wayfinding_post_release.mjs --snapshot <complete-post-snapshot> --out <report.json>');
const absolute = (f) => path.resolve(ROOT, f);
const relative = (f) => path.relative(ROOT, absolute(f)).split(path.sep).join('/');
const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const manifestPath = 'data/buildops/mp08-rr-t1b-two-wall-sign-wayfinding.release-manifest.json';
const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
const capturePath = path.join(snapshot, 'combined-zones-complete-save-capture.json');
const capture = JSON.parse(fs.readFileSync(absolute(capturePath), 'utf8'));
if (!capture.immutableCopy || !capture.requiredMembers.some((m) => m.path === 'level.dat')
  || !['region/', 'entities/', 'poi/'].every((prefix) => capture.requiredMembers.some((m) => m.path.startsWith(prefix)))) {
  throw new Error('post-state verifier requires an immutable complete capture (region/entities/poi/level.dat)');
}
const reader = new AnvilReader(absolute(path.join(snapshot, 'region')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const findBlockEntity = async (cell) => {
  const chunk = await reader.chunk(Math.floor(cell.x / 16), Math.floor(cell.z / 16));
  return (chunk?.block_entities ?? chunk?.blockEntities ?? []).find((be) => Number(be.x) === cell.x && Number(be.y) === cell.y && Number(be.z) === cell.z) ?? null;
};
const text = (entry) => typeof entry === 'string' ? entry : JSON.stringify(entry);
const results = [];
for (const sign of manifest.scope.signs) {
  const state = await stateAt(sign.cell);
  const be = await findBlockEntity(sign.cell);
  const front = be?.front_text ?? be?.FrontText ?? null;
  const rawMessages = front?.messages ?? front?.Messages ?? [];
  const messages = Array.isArray(rawMessages) ? rawMessages.map(text) : [];
  const expectedMessages = sign.lines.map((line) => JSON.stringify({ text: line }));
  const expectedPlain = sign.lines.map((line) => `{"text":"${line}"}`);
  const messagesPass = messages.length === 4 && messages.every((message, index) => message === expectedMessages[index] || message === expectedPlain[index]);
  results.push({ id: sign.id, cell: sign.cell, expectedState: sign.desiredState, actualState: state, statePass: state === sign.desiredState, blockEntityPresent: Boolean(be), frontText: { color: front?.color ?? null, hasGlowingText: front?.has_glowing_text ?? null, messages }, messagesPass, expectedLines: sign.lines });
}
const core = manifest.scope.normalWalkRoute;
const routeSurvey = JSON.parse(fs.readFileSync(absolute(manifest.source.survey), 'utf8'));
let routePass = true;
for (const { z, floorY } of routeSurvey.routeProof.threeWideCore.profile) for (let x = -1; x <= 1; x += 1) {
  const [support, feet, head] = await Promise.all([stateAt({ x, y: floorY, z }), stateAt({ x, y: floorY + 1, z }), stateAt({ x, y: floorY + 2, z })]);
  if (support.startsWith('minecraft:air') || support.startsWith('minecraft:water') || feet !== 'minecraft:air' || head !== 'minecraft:air') routePass = false;
}
const report = { schemaVersion: 1, id: 'MP08-RR-T1B-WAYFINDING-01-POST-RELEASE-QA', generatedAtUtc: new Date().toISOString(), safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false }, manifest: { path: manifestPath, identity: manifest.manifestIdentity }, postSource: { snapshot: relative(snapshot), captureId: capture.captureId, immutableCopy: capture.immutableCopy }, signs: results, normalWalkCore: { expectedStationCount: core.stationCount, pass: routePass }, postStatePass: results.every((r) => r.statePass && r.blockEntityPresent && r.messagesPass) && routePass, requiredRemainingGates: ['fresh live-entity clearance evidence', 'journalled strict forward execution', 'strict rollback post-state preflight'], nonClaims: manifest.nonClaims };
report.status = report.postStatePass ? 'PASS_POST_RELEASE_SIGN_AND_ROUTE_QA' : 'FAIL_POST_RELEASE_SIGN_OR_ROUTE_QA';
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, report: relative(out), signPass: results.filter((r) => r.statePass && r.blockEntityPresent && r.messagesPass).length, routePass }, null, 2));
