#!/usr/bin/env node
/** Read-only geometric/route QA for MP01-SERVICE-CORRIDOR-01. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`Missing ${flag}`); return result; };
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const postRoot = required('--post-root');
const manifestFile = required('--manifest');
const out = required('--out');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestFile), 'utf8'));
const expectedCount = manifest.operations?.['service-corridor']?.targetCellCount;
if (!Number.isInteger(expectedCount) || expectedCount < 1) throw new Error('Service-corridor manifest is malformed');
const reader = new AnvilReader(path.join(ROOT, postRoot, 'region'));
const at = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const mismatches = [];
const check = async (id, x, y, z, expected) => {
  const actual = await at(x, y, z);
  if (actual !== expected) mismatches.push({ id, x, y, z, expected, actual });
};
for (let x = 2008; x <= 2025; x += 1) {
  for (let z = -896; z <= -892; z += 1) { await check('floor', x, 165, z, 'minecraft:polished_andesite'); await check('roof', x, 172, z, 'minecraft:white_concrete'); }
  for (let y = 166; y <= 171; y += 1) await check('retained-reservoir-wall', x, y, -896, 'minecraft:white_concrete');
}
for (let x = 2013; x <= 2025; x += 1) for (let y = 166; y <= 171; y += 1) await check('north-control-wall', x, y, -892, 'minecraft:white_concrete');
for (let x = 2009; x <= 2012; x += 1) for (let y = 166; y <= 171; y += 1) await check('chamber-opening', x, y, -892, 'minecraft:air');
for (let y = 166; y <= 171; y += 1) for (let z = -895; z <= -892; z += 1) await check('west-wall', 2008, y, z, 'minecraft:white_concrete');
for (let y = 166; y <= 171; y += 1) for (let z = -895; z <= -892; z += 1) {
  const expected = z === -894 && y === 166 ? 'minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]'
    : z === -894 && y === 167 ? 'minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]'
      : 'minecraft:white_concrete';
  await check('east-control-wall', 2025, y, z, expected);
}
for (const [x, z] of [[2013, -894], [2020, -894]]) await check('fixed-light', x, 171, z, 'minecraft:sea_lantern');
for (let x = 2009; x <= 2024; x += 1) for (let y = 166; y <= 170; y += 1) for (let z = -895; z <= -893; z += 1) await check('dry-clear-route', x, y, z, 'minecraft:air');
if (mismatches.length) throw new Error(`MP01 service-corridor QA rejected ${mismatches.length} exact-state mismatch(es): ${JSON.stringify(mismatches.slice(0, 6))}`);
const report = {
  schemaVersion: 1, id: 'mp01-service-corridor-01-post-release-qa',
  status: 'PASS_RESTRICTED_DRY_SERVICE_CORRIDOR_VERIFIED', postRoot, manifest: { path: manifestFile, sha256: sha256(fs.readFileSync(path.join(ROOT, manifestFile))) },
  targetState: { expected: expectedCount, matched: expectedCount, mismatches: [] },
  routeQa: { dryClearRouteCells: 16 * 5 * 3, chamberOpening: '4-wide air aperture at x=2009..2012; x=2008 is the west structural jamb', causewayDoor: 'closed manual iron door', retainedReservoirBoundary: 'continuous six-high wall at z=-896' },
  accessClass: 'RESTRICTED_STAFF_INSPECTION_ONLY',
  nonClaims: ['public access', 'public egress', 'automated access control', 'emergency commissioning', 'MP01 completion'],
};
  report.payloadSha256 = sha256(JSON.stringify(report));
fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true });
fs.writeFileSync(path.join(ROOT, out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, out, targetCount: expectedCount }, null, 2));
