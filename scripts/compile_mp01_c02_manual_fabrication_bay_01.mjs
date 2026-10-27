#!/usr/bin/env node
/** Compile an exact, dry C02 manual smithing/stonecutting fit-out. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd(); const args = process.argv.slice(2);
const arg = (flag) => { const i = args.indexOf(flag); if (i < 0 || !args[i + 1]) throw new Error(`${flag} is required`); return args[i + 1]; };
const snapshot = arg('--snapshot'); const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const expect = async (x, y, z, expected, label) => { const actual = stateToCommandString(await reader.blockState(x, y, z)); if (actual !== expected) throw new Error(`${label} drift at ${x},${y},${z}: ${actual}`); };
const targets = [{ x: 2012, y: 168, z: -873, state: 'minecraft:smithing_table' }, { x: 2013, y: 168, z: -873, state: 'minecraft:stonecutter[facing=north]' }];
for (const t of targets) { await expect(t.x, t.y, t.z, 'minecraft:air', 'C02 target'); await expect(t.x, 167, t.z, 'minecraft:light_gray_concrete', 'C02 support'); await expect(t.x, 169, t.z, 'minecraft:air', 'C02 head clearance'); }
for (let x = 2015; x <= 2017; x += 1) { await expect(x, 168, -873, 'minecraft:air', 'C02 approach'); await expect(x, 169, -873, 'minecraft:air', 'C02 approach headroom'); }
for (let x = 2009; x <= 2017; x += 1) for (let y = 167; y <= 171; y += 1) { const actual = stateToCommandString(await reader.blockState(x, y, -873)); if (actual.includes('water')) throw new Error(`C02 water boundary drift at ${x},${y},-873: ${actual}`); }
const id = 'mp01-c02-manual-fabrication-bay-01', buildops = 'data/buildops';
const forward = `${targets.map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${state}`).join('\n')}\n`;
const rollback = `${[...targets].reverse().map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${state} minecraft:air`).join('\n')}\n`;
const forwardPath = `${buildops}/${id}.forward.txt`, rollbackPath = `${buildops}/${id}.rollback.txt`, hash = (text) => crypto.createHash('sha256').update(text).digest('hex');
fs.writeFileSync(path.join(ROOT, forwardPath), forward); fs.writeFileSync(path.join(ROOT, rollbackPath), rollback);
const manifest = { schemaVersion: 1, transactionId: id, generatedAtUtc: new Date().toISOString(), status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL', releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS', mvpScope: false, scopeIds: ['MP01-A'], packages: [{ key: 'c02-manual-fabrication-bay', forward: forwardPath, rollback: rollbackPath }], executionOrder: { forward: ['c02-manual-fabrication-bay'], rollback: ['c02-manual-fabrication-bay'] }, scope: { releaseId: 'MP01-C02-MANUAL-FABRICATION-BAY-01', purpose: 'Dry manual smithing and stone-cutting station in existing C02 service alcove.', accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', nonClaims: ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'] }, source: { snapshotRoot: snapshot }, target: { operatedUnion: { cellCount: 2, bounds: { minX: 2012, maxX: 2013, minY: 168, maxY: 168, minZ: -873, maxZ: -873 } }, packageTargetsDisjoint: true }, operations: { 'c02-manual-fabrication-bay': { forwardSha256: hash(forward), rollbackSha256: hash(rollback), forwardCommandCount: 2, rollbackCommandCount: 2, targetCellCount: 2, exactInverse: true } }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false } };
manifest.manifestIdentity = hash(JSON.stringify(manifest)); const manifestPath = `${buildops}/${id}.release-manifest.json`; fs.writeFileSync(path.join(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`); console.log(JSON.stringify({ manifest: manifestPath, targetCount: 2, snapshot }, null, 2));
