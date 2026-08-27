#!/usr/bin/env node
/** Read-only post-release QA for MP01-CHEYENNE-TERMINAL-ACCESS-01. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : null;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 terminal post-QA rejected: ${message}`); };
const range = (minX, maxX, minY, maxY, minZ, maxZ) => {
  const cells = [];
  for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
    for (let z = minZ; z <= maxZ; z += 1) cells.push({ x, y, z });
  }
  return cells;
};

const POST_ROOT = required('--post-root');
const MANIFEST = required('--manifest');
const OUT = required('--out');
const manifest = JSON.parse(fs.readFileSync(path.resolve(ROOT, MANIFEST), 'utf8'));
const packageEntry = manifest.packages?.find(({ key }) => key === 'terminal-access');
fail(packageEntry, 'terminal-access package is absent');
const operations = fs.readFileSync(path.resolve(ROOT, packageEntry.forward), 'utf8').split(/\r?\n/)
  .filter((line) => line.startsWith('REPL ')).map((line) => {
    const fields = line.split(/\s+/);
    return { cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) }, expected: fields[8] };
  });
fail(operations.length === manifest.operations?.['terminal-access']?.targetCellCount,
  'forward operation count does not match manifest');
const reader = new AnvilReader(path.join(path.resolve(ROOT, POST_ROOT), 'region'));
const state = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const targetMismatches = [];
for (const operation of operations) {
  const actual = await state(operation.cell);
  if (actual !== operation.expected) targetMismatches.push({ ...operation, actual });
}
const verifyAir = async (id, cells) => {
  const mismatches = [];
  for (const cell of cells) {
    const actual = await state(cell);
    if (actual !== 'minecraft:air') mismatches.push({ cell, actual });
  }
  return { id, expected: 'minecraft:air', cells: cells.length, mismatches };
};
const commonSpine = await verifyAir('common-spine-5x5x4', range(2038, 2042, 166, 169, -870, -866));
const arrivalVestibule = await verifyAir('arrival-vestibule-before-manual-gates', range(2044, 2046, 166, 169, -870, -866));
const gateChecks = [];
for (const [x, z, facing] of [
  [2043, -869, 'east'], [2043, -868, 'east'], [2043, -867, 'east'],
  [2039, -872, 'north'], [2040, -872, 'north'], [2041, -872, 'north'],
  [2039, -864, 'south'], [2040, -864, 'south'], [2041, -864, 'south'],
]) {
  const cell = { x, y: 166, z };
  const expected = `minecraft:spruce_fence_gate[facing=${facing},in_wall=false,open=false,powered=false]`;
  gateChecks.push({ cell, expected, actual: await state(cell) });
}
const liftPlatform = range(2039, 2041, 165, 165, -876, -874);
const liftPlatformMismatches = [];
for (const cell of liftPlatform) {
  const actual = await state(cell);
  if (actual !== 'minecraft:polished_blackstone_bricks') liftPlatformMismatches.push({ cell, actual });
}
const report = {
  schemaVersion: 1,
  id: 'mp01-cheyenne-terminal-access-post-release-qa',
  status: null,
  postRoot: relative(POST_ROOT),
  manifest: { path: relative(MANIFEST), sha256: sha256(fs.readFileSync(path.resolve(ROOT, MANIFEST))) },
  targetState: { expected: operations.length, matched: operations.length - targetMismatches.length, mismatches: targetMismatches },
  restrictedRouteLayout: { commonSpine, arrivalVestibule, manualGateChecks: gateChecks, liftPlatform: { cells: liftPlatform.length, mismatches: liftPlatformMismatches } },
  accessClass: 'RESTRICTED_STAFF_INSPECTION_ONLY',
  nonClaims: ['public route', 'public egress', 'secure-system commissioning', 'active lift', 'chamber completion'],
};
const pass = targetMismatches.length === 0 && commonSpine.mismatches.length === 0
  && arrivalVestibule.mismatches.length === 0 && gateChecks.every(({ expected, actual }) => expected === actual)
  && liftPlatformMismatches.length === 0;
fail(pass, 'post-state target, common-spine, manual-gate, or lift-platform verification failed');
report.status = 'PASS_RESTRICTED_TERMINAL_LAYOUT_VERIFIED';
report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(path.resolve(ROOT, OUT)), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, OUT), `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, out: relative(OUT), targetCount: operations.length }, null, 2)}\n`);
