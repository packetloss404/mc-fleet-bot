#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => { const index = argv.indexOf(flag); return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`Missing required ${flag}`); return result; };
const fail = (condition, message) => { if (!condition) throw new Error(`MP01 service-interior compiler rejected: ${message}`); };
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const snapshot = required('--snapshot');
const outDir = value('--out-dir', 'data/buildops');
const basename = value('--basename', 'mp01-cheyenne-service-interior-01');
const requestedBays = value('--bays', 'B02').split(',').map((id) => id.trim()).filter(Boolean);
const BAY_LOCATIONS = {
  A01: [2027, -888], A02: [2027, -874], A03: [2027, -860],
  B01: [2018, -888], B02: [2018, -874], B03: [2018, -860],
  C01: [2009, -888], C02: [2009, -874], C03: [2009, -860],
  D01: [2009, -845], D02: [2018, -845], D03: [2027, -845],
  E01: [2009, -837], E02: [2018, -837], E03: [2027, -837],
};
fail(requestedBays.length > 0 && requestedBays.every((id) => BAY_LOCATIONS[id]), `unknown bay selection ${requestedBays.join(',')}`);
const reader = new AnvilReader(path.join(path.resolve(ROOT, snapshot), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const cells = new Set();
const entries = [];
const add = async (id, x1, y1, z1, x2, y2, z2, from, to) => {
  let count = 0;
  for (let x = x1; x <= x2; x += 1) for (let y = y1; y <= y2; y += 1) for (let z = z1; z <= z2; z += 1) {
    const key = `${x},${y},${z}`;
    fail(!cells.has(key), `overlap at ${key}`);
    fail(await state(x, y, z) === from, `${id} requires ${from} at ${key}`);
    cells.add(key); count += 1;
  }
  entries.push({ id, line: `REPL ${x1} ${y1} ${z1} ${x2} ${y2} ${z2} ${from} ${to}`, count });
};
const air = 'minecraft:air';
for (const bayId of requestedBays) {
  const [minX, minZ] = BAY_LOCATIONS[bayId];
  const partitionZ = minZ + 4;
  await add(`${bayId}-partition-west`, minX + 1, 168, partitionZ, minX + 1, 172, partitionZ, air, 'minecraft:white_concrete');
  await add(`${bayId}-partition-east`, minX + 3, 168, partitionZ, minX + 4, 172, partitionZ, air, 'minecraft:white_concrete');
  await add(`${bayId}-partition-lintel`, minX + 2, 170, partitionZ, minX + 2, 172, partitionZ, air, 'minecraft:white_concrete');
  await add(`${bayId}-service-door-lower`, minX + 2, 168, partitionZ, minX + 2, 168, partitionZ, air, 'minecraft:iron_door[facing=north,half=lower,hinge=left,open=false,powered=false]');
  await add(`${bayId}-service-door-upper`, minX + 2, 169, partitionZ, minX + 2, 169, partitionZ, air, 'minecraft:iron_door[facing=north,half=upper,hinge=left,open=false,powered=false]');
  await add(`${bayId}-equipment-plinth`, minX + 1, 168, minZ + 1, minX + 2, 168, minZ + 2, air, 'minecraft:polished_andesite');
  await add(`${bayId}-alcove-light-west`, minX + 1, 172, minZ + 2, minX + 1, 172, minZ + 2, air, 'minecraft:sea_lantern');
  await add(`${bayId}-alcove-light-east`, minX + 4, 172, minZ + 2, minX + 4, 172, minZ + 2, air, 'minecraft:sea_lantern');
}
const forwardBody = `${entries.map(({ line }) => line).join('\n')}\n`;
const rollbackBody = `${[...entries].reverse().map(({ line }) => { const fields = line.split(' '); return `REPL ${fields.slice(1, 7).join(' ')} ${fields[8]} ${fields[7]}`; }).join('\n')}\n`;
const forward = path.join(outDir, `${basename}.forward.txt`), rollback = path.join(outDir, `${basename}.rollback.txt`);
fs.mkdirSync(path.resolve(ROOT, outDir), { recursive: true });
fs.writeFileSync(path.resolve(ROOT, forward), `# MP01 first service interior forward\n${forwardBody}`);
fs.writeFileSync(path.resolve(ROOT, rollback), `# MP01 first service interior rollback\n${rollbackBody}`);
const packageKey = requestedBays.length === 1 ? 'service-interior' : 'service-interiors';
const manifest = { schemaVersion: 1, transactionId: `mp01-cheyenne-${packageKey}-02`, generatedAtUtc: new Date().toISOString(), status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL', releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS', mvpScope: false, scopeIds: ['MP01-A', 'P1-B03', 'Z10'], packages: [{ key: packageKey, forward: relative(forward), rollback: relative(rollback) }], executionOrder: { forward: [packageKey], rollback: [packageKey] }, scope: { releaseId: `MP01-CHEYENNE-${packageKey.toUpperCase()}-02`, purpose: `Manually separated, lit service-control alcoves in ${requestedBays.join(', ')}.`, accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', nonClaims: ['public opening', 'public egress', 'complete service program', 'Battle Cab', 'reservoir', 'full chamber completion'] }, source: { snapshotRoot: snapshot }, target: { operatedUnion: { cellCount: cells.size, bounds: { minX: 2010, maxX: 2031, minY: 168, maxY: 172, minZ: -887, maxZ: -854 } }, packageTargetsDisjoint: true }, operations: { [packageKey]: { forwardSha256: sha256(forwardBody), rollbackSha256: sha256(rollbackBody), forwardCommandCount: entries.length, rollbackCommandCount: entries.length, targetCellCount: cells.size, exactInverse: true } }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false } };
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestPath = path.join(outDir, `${basename}.release-manifest.json`);
fs.writeFileSync(path.resolve(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: relative(manifestPath), targetCount: cells.size, commandCount: entries.length }, null, 2));
