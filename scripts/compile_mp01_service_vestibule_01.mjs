#!/usr/bin/env node
/** Compile a dry, manual two-door restricted service boundary. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';
const ROOT = process.cwd(); const args = process.argv.slice(2);
const value = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`Missing ${flag}`); return result; };
const hash = (input) => crypto.createHash('sha256').update(input).digest('hex');
const snapshot = required('--snapshot'), outDir = value('--out-dir', 'data/buildops'), basename = value('--basename', 'mp01-service-vestibule-01');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const cells = [];
for (let y = 166; y <= 172; y += 1) for (let z = -905; z <= -894; z += 1) {
  const to = z === -894 && y === 166 ? 'minecraft:iron_door[facing=west,half=lower,hinge=left,open=false,powered=false]'
    : z === -894 && y === 167 ? 'minecraft:iron_door[facing=west,half=upper,hinge=left,open=false,powered=false]'
      : 'minecraft:white_concrete';
  const actual = stateToCommandString(await reader.blockState(2006, y, z));
  if (actual !== 'minecraft:air') throw new Error(`Service-vestibule source drift at 2006,${y},${z}: ${actual}`);
  cells.push({ x: 2006, y, z, from: 'minecraft:air', to });
}
const group = (to) => cells.filter((cell) => cell.to === to);
const wall = group('minecraft:white_concrete');
// A wall group needs separate rectangles so its door aperture is never touched.
const lines = [
  'REPL 2006 166 -905 2006 172 -895 minecraft:air minecraft:white_concrete',
  'REPL 2006 168 -894 2006 172 -894 minecraft:air minecraft:white_concrete',
  'REPL 2006 166 -894 2006 166 -894 minecraft:air minecraft:iron_door[facing=west,half=lower,hinge=left,open=false,powered=false]',
  'REPL 2006 167 -894 2006 167 -894 minecraft:air minecraft:iron_door[facing=west,half=upper,hinge=left,open=false,powered=false]',
];
if (wall.length !== 82 || cells.length !== 84) throw new Error('Vestibule target accounting drift');
const forward = `${lines.join('\n')}\n`;
const rollback = `${[...lines].reverse().map((line) => { const p = line.split(' '); return `REPL ${p.slice(1, 7).join(' ')} ${p[8]} ${p[7]}`; }).join('\n')}\n`;
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
const forwardFile = path.join(outDir, `${basename}.forward.txt`), rollbackFile = path.join(outDir, `${basename}.rollback.txt`);
fs.writeFileSync(path.join(ROOT, forwardFile), forward); fs.writeFileSync(path.join(ROOT, rollbackFile), rollback);
const manifest = { schemaVersion: 1, transactionId: basename, generatedAtUtc: new Date().toISOString(), status: 'COMPILED_AWAITING_FRESH_KERNEL', releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS', mvpScope: false, scopeIds: ['MP01-A', 'Z10'], packages: [{ key: 'service-vestibule', forward: forwardFile, rollback: rollbackFile }], executionOrder: { forward: ['service-vestibule'], rollback: ['service-vestibule'] }, scope: { releaseId: 'MP01-SERVICE-VESTIBULE-01', purpose: 'Manual two-door dry restricted service vestibule separating the corridor from the service-staging room.', accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', controlledBoundary: { outerDoor: { x: 2008, y: [166, 167], z: -894 }, innerDoor: { x: 2006, y: [166, 167], z: -894 }, interveningVestibule: { x: 2007, y: [166, 171], z: -894 }, procedure: 'Manual sequential use; no asserted powered/mechanical interlock.' }, nonClaims: ['airlock pressure control', 'emergency egress', 'public access', 'automation', 'MP01 completion'] }, source: { snapshotRoot: snapshot }, target: { operatedUnion: { cellCount: cells.length, bounds: { minX: 2006, maxX: 2006, minY: 166, maxY: 172, minZ: -905, maxZ: -894 } }, packageTargetsDisjoint: true }, operations: { 'service-vestibule': { forwardSha256: hash(forward), rollbackSha256: hash(rollback), forwardCommandCount: lines.length, rollbackCommandCount: lines.length, targetCellCount: cells.length, exactInverse: true } }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false } };
manifest.manifestIdentity = hash(JSON.stringify(manifest));
const manifestFile = path.join(outDir, `${basename}.release-manifest.json`); fs.writeFileSync(path.join(ROOT, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestFile, targetCount: cells.length, commandCount: lines.length }, null, 2));
