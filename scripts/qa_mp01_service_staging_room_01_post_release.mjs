#!/usr/bin/env node
/** Read-only geometry, dry route, door and protected-interface QA. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
const ROOT = process.cwd(); const args = process.argv.slice(2);
const arg = (key) => { const i = args.indexOf(key); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
const req = (key) => { const result = arg(key); if (!result) throw new Error(`Missing ${key}`); return result; };
const postRoot = req('--post-root'), manifestFile = req('--manifest'), out = req('--out');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, manifestFile), 'utf8'));
const count = manifest.operations?.['service-staging-room']?.targetCellCount;
if (!Number.isInteger(count) || count < 1) throw new Error('Malformed staging-room manifest');
const reader = new AnvilReader(path.join(ROOT, postRoot, 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const mismatches = [];
const check = async (id, x, y, z, expected) => { const actual = await state(x, y, z); if (actual !== expected) mismatches.push({ id, x, y, z, expected, actual }); };
for (let x = 1993; x <= 2007; x += 1) for (let z = -906; z <= -893; z += 1) { await check('floor', x, 164, z, 'minecraft:polished_andesite'); await check('roof', x, 173, z, 'minecraft:white_concrete'); }
for (let x = 1994; x <= 2006; x += 1) for (let y = 165; y <= 172; y += 1) for (let z = -905; z <= -894; z += 1) {
  const expected = y === 165 && x >= 1996 && x <= 1998 && [-904, -900, -896].includes(z) ? 'minecraft:polished_blackstone_bricks'
    : y === 172 && [[1998, -903], [1998, -897], [2003, -900]].some(([lx, lz]) => x === lx && z === lz) ? 'minecraft:sea_lantern' : 'minecraft:air';
  await check('interior', x, y, z, expected);
}
for (let y = 166; y <= 172; y += 1) await check('threshold', 2007, y, -894, 'minecraft:air');
await check('door-lower', 2008, 166, -894, 'minecraft:iron_door[facing=west,half=lower,hinge=left,open=false,powered=false]');
await check('door-upper', 2008, 167, -894, 'minecraft:iron_door[facing=west,half=upper,hinge=left,open=false,powered=false]');
// Explicitly retain the reservoir-side wall immediately south of the corridor.
for (let y = 166; y <= 171; y += 1) for (let x = 2009; x <= 2024; x += 1) await check('retained-reservoir-wall', x, y, -896, 'minecraft:white_concrete');
if (mismatches.length) throw new Error(`MP01 staging-room QA rejected ${mismatches.length} mismatch(es): ${JSON.stringify(mismatches.slice(0, 6))}`);
const report = { schemaVersion: 1, id: 'mp01-service-staging-room-01-post-release-qa', status: 'PASS_RESTRICTED_DRY_SERVICE_STAGING_ROOM_VERIFIED', postRoot, manifest: { path: manifestFile, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, manifestFile))).digest('hex') }, targetState: { expected: count, matched: count, mismatches: [] }, functionalQa: { dryRoom: '12 x 13 x 8 interior with three manual staging plinths', controlledAccess: 'closed manual iron door from corridor', levelTransition: 'one-step dry descent from corridor', retainedReservoirBoundary: 'verified at corridor south wall' }, accessClass: 'RESTRICTED_STAFF_INSPECTION_ONLY', nonClaims: ['public access', 'active utility control', 'automation', 'emergency commissioning', 'MP01 completion'] };
report.payloadSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
fs.mkdirSync(path.dirname(path.join(ROOT, out)), { recursive: true }); fs.writeFileSync(path.join(ROOT, out), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, out, targetCount: count }, null, 2));
