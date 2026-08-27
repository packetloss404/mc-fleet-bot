#!/usr/bin/env node
/** Read-only independent post-release QA for Cobalt Ravensreach controlled ladder access. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

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
const MANIFEST_PATH = value('--manifest', 'data/buildops/cobalt-rr-controlled-ladder-access-01.release-manifest.json');
const RELEASE_ID = 'COBALT-RR-CONTROLLED-LADDER-ACCESS-01';
const RELEASE_NODE_ID = 'CZ-SYS03-COBALT-RR-CONTROLLED-LADDER-ACCESS';
const TRANSACTION_ID = 'cobalt-rr-controlled-ladder-access-01';
const LADDER = 'minecraft:ladder[facing=west,waterlogged=false]';
const AIR = 'minecraft:air';
const PD = 'minecraft:polished_deepslate';
const PA = 'minecraft:polished_andesite';
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} post-QA rejected: ${message}`); };
const exact = (cells) => {
  const set = uniqueCells(cells);
  return { cellCount: set.length, bounds: set.length ? boundsOf(set) : null, coordinateSetSha256: hashCells(set) };
};
const census = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const operationBodySha256 = (artifactPath) => {
  const bytes = fs.readFileSync(abs(artifactPath), 'utf8');
  const declared = bytes.split('\n').find((line) => line.startsWith('# operation SHA-256: '))?.slice('# operation SHA-256: '.length);
  const bodyStart = bytes.indexOf('\nREPL ');
  fail(declared && bodyStart >= 0 && sha256(bytes.slice(bodyStart + 1)) === declared, `invalid operation body hash: ${artifactPath}`);
  return declared;
};

const ledger = JSON.parse(fs.readFileSync(abs(LEDGER_PATH), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST_PATH), 'utf8'));
fail(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', 'ledger is not executed and rollback-poststate verified');
fail(ledger.releaseNodeId === RELEASE_NODE_ID && ledger.transactionId === TRANSACTION_ID, 'ledger identity drifted');
fail(manifest.releaseNodeId === RELEASE_NODE_ID && manifest.transactionId === TRANSACTION_ID && manifest.scope?.releaseId === RELEASE_ID, 'manifest identity drifted');
fail(ledger.manifest?.sha256 === sha256(fs.readFileSync(abs(MANIFEST_PATH))), 'ledger is not bound to this manifest');
const packageRecord = ledger.packages?.find(({ key }) => key === 'controlled-ladder');
const operation = manifest.operations?.['controlled-ladder'];
fail(packageRecord && operation && operationBodySha256(packageRecord.forward?.path) === operation.forwardSha256 && operationBodySha256(packageRecord.rollback?.path) === operation.rollbackSha256, 'ledger package hashes drifted from manifest');
for (const stage of ['block-entity-clearance', 'live-entity-clearance', 'rollback-poststate-preflight:controlled-ladder']) {
  fail(ledger.stages?.some((entry) => entry.stage === stage && entry.status === 'PASS'), `runner stage is not PASS: ${stage}`);
}
fail(ledger.postSnapshot?.regions && fs.existsSync(abs(ledger.postSnapshot.regions)), 'fresh post regions are unavailable');

const ladder = [];
const attachment = [];
for (let y = 19; y <= 62; y += 1) {
  ladder.push({ x: -151, y, z: -390 });
  attachment.push({ x: -150, y, z: -390 });
}
const lowerLanding = [
  { x: -151, y: 18, z: -390 }, { x: -152, y: 18, z: -390 }, { x: -151, y: 18, z: -389 },
  { x: -151, y: 19, z: -389 }, { x: -152, y: 19, z: -389 },
];
const upperExit = [{ x: -151, y: 63, z: -390 }, { x: -152, y: 63, z: -390 }, { x: -151, y: 63, z: -389 }, { x: -152, y: 63, z: -389 }];
const reader = new AnvilReader(abs(ledger.postSnapshot.regions));
const read = async (cells) => Promise.all(uniqueCells(cells).map(async (cell) => ({ cell, state: stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)) })));
const [postLadder, postAttachment, postLowerLanding, postUpperExit] = await Promise.all([read(ladder), read(attachment), read(lowerLanding), read(upperExit)]);
fail(postLadder.every(({ state }) => state === LADDER), 'ladder is not continuous and attached west');
fail(postAttachment.every(({ cell, state }) => state === (cell.y === 62 ? PA : PD)), 'retained east sleeve/pad attachment drifted');
fail(postLowerLanding.every(({ state }) => state === AIR), 'lower corridor-side landing is not clear');
fail(postUpperExit.every(({ state }) => state === AIR), 'surface exit is not clear');

const payload = {
  schemaVersion: 1, id: 'cobalt-rr-controlled-ladder-access-01-post-release-qa', status: 'PASS_EXECUTED_COBALT_RR_CONTROLLED_LADDER_ACCESS_QA',
  release: { releaseId: RELEASE_ID, releaseNodeId: RELEASE_NODE_ID, transactionId: TRANSACTION_ID, ledger: { path: rel(LEDGER_PATH), sha256: sha256(fs.readFileSync(abs(LEDGER_PATH))) }, manifest: { path: rel(MANIFEST_PATH), sha256: sha256(fs.readFileSync(abs(MANIFEST_PATH))), manifestIdentity: manifest.manifestIdentity } },
  postSnapshot: ledger.postSnapshot,
  exactGeometry: { ladder: exact(ladder), retainedEastSleeveAttachments: exact(attachment), lowerControlledLanding: exact(lowerLanding), upperSurfaceExit: exact(upperExit) },
  postState: { ladder: census(postLadder), attachments: census(postAttachment), lowerLanding: census(postLowerLanding), upperExit: census(postUpperExit) },
  functionalBoundary: { controlledVerticalStaffAccess: true, retainedNorthWallWaterPocket: true, headhouseLinerModified: false, normalWalkRouteCommissioned: false, railModified: false, passengerServiceCommissioned: false },
};
payload.qaPayloadSha256 = sha256(JSON.stringify(payload));
fs.mkdirSync(path.dirname(abs(OUT_PATH)), { recursive: true });
fs.writeFileSync(abs(OUT_PATH), `${JSON.stringify(payload, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: payload.status, out: rel(OUT_PATH), qaPayloadSha256: payload.qaPayloadSha256 }, null, 2)}\n`);
