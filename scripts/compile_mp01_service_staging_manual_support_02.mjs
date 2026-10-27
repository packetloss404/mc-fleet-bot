#!/usr/bin/env node
/** Compile the exact two-cell manual-support fit-out inside the sealed MP01 staging room. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag, fallback = '') => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] ?? fallback : fallback; };
const snapshot = arg('--snapshot'); const outDir = arg('--out-dir', 'data/buildops'); const basename = arg('--basename', 'mp01-service-staging-manual-support-02');
if (!snapshot) throw new Error('usage: --snapshot <complete-save> [--out-dir] [--basename]');
const absolute = (file) => path.resolve(ROOT, file); const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(absolute(file)); const manifestPath = 'data/buildops/mp01-service-staging-room-01.release-manifest.json'; const ledgerPath = 'data/world-review/mp01-service-staging-room-01-live-20260826T051000Z/evidence-ledger.json';
const parentBytes = read(manifestPath); const parent = JSON.parse(parentBytes); const parentLedger = JSON.parse(read(ledgerPath));
if (parentLedger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' || parent.target?.operatedUnion?.cellCount !== 1677) throw new Error('accepted staging-room predecessor is not exact');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
const captureBytes = read(`${snapshot}/combined-zones-complete-save-capture.json`); const reader = new AnvilReader(path.join(absolute(snapshot), 'region')); const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const targets = [{ x: 2000, y: 165, z: -900, to: 'minecraft:crafting_table' }, { x: 2001, y: 165, z: -900, to: 'minecraft:cartography_table' }];
for (const { x, y, z } of targets) {
  if (await state(x, y, z) !== 'minecraft:air') throw new Error(`target drift ${x},${y},${z}`);
  if (await state(x, y - 1, z) !== 'minecraft:polished_andesite') throw new Error(`support drift ${x},${y - 1},${z}`);
  for (const headY of [y + 1, y + 2]) if (await state(x, headY, z) !== 'minecraft:air') throw new Error(`headroom drift ${x},${headY},${z}`);
}
for (let x = 1999; x <= 2002; x += 1) for (let y = 165; y <= 167; y += 1) for (let z = -899; z <= -895; z += 1) if (await state(x, y, z) !== 'minecraft:air') throw new Error(`approach drift ${x},${y},${z}`);
const blockEntities = []; for (const cx of [124, 125]) { const chunk = await reader.chunk(cx, -57); for (const entity of chunk?.block_entities ?? []) { const { x, y, z } = entity; if (x >= 1998 && x <= 2003 && y >= 164 && y <= 173 && z >= -902 && z <= -898) blockEntities.push({ x, y, z, id: entity.id ?? null }); } }
if (blockEntities.length) throw new Error(`local block-entity conflict ${JSON.stringify(blockEntities)}`);
const forward = `${targets.map(({ x, y, z, to }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${to}`).join('\n')}\n`;
const rollback = `${[...targets].reverse().map(({ x, y, z, to }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${to} minecraft:air`).join('\n')}\n`;
fs.mkdirSync(absolute(outDir), { recursive: true }); const forwardPath = `${outDir}/${basename}.forward.txt`; const rollbackPath = `${outDir}/${basename}.rollback.txt`; fs.writeFileSync(absolute(forwardPath), forward); fs.writeFileSync(absolute(rollbackPath), rollback);
const manifest = { schemaVersion: 1, transactionId: basename, generatedAtUtc: new Date().toISOString(), status: 'COMPILED_AWAITING_FRESH_KERNEL', releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS', mvpScope: false, scopeIds: ['MP01-A', 'Z10'], packages: [{ key: 'service-staging-manual-support', forward: forwardPath, rollback: rollbackPath }], executionOrder: { forward: ['service-staging-manual-support'], rollback: ['service-staging-manual-support'] }, scope: { releaseId: 'MP01-SERVICE-STAGING-MANUAL-SUPPORT-02', purpose: 'Two non-container manual service-allocation tools in the accepted restricted staging room.', parentRelease: { manifest: manifestPath, manifestSha256: sha(parentBytes), ledger: ledgerPath, ledgerStatus: parentLedger.status }, accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', preservedApproach: { x: [1999, 2002], y: [165, 167], z: [-899, -895], width: 4 }, nonClaims: ['container storage', 'automation', 'active utility control', 'public access', 'emergency egress', 'MP01 completion'] }, source: { snapshotRoot: snapshot, captureManifestSha256: sha(captureBytes), readOnly: true }, target: { operatedUnion: { cellCount: targets.length, bounds: { minX: 2000, maxX: 2001, minY: 165, maxY: 165, minZ: -900, maxZ: -900 } }, packageTargetsDisjoint: true }, operations: { 'service-staging-manual-support': { forwardSha256: sha(forward), rollbackSha256: sha(rollback), forwardCommandCount: targets.length, rollbackCommandCount: targets.length, targetCellCount: targets.length, exactInverse: true } }, staticClearance: { blockEntities, sourceFluidOrGravityHazards: [] }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false } };
manifest.manifestIdentity = sha(JSON.stringify(manifest)); const output = `${outDir}/${basename}.release-manifest.json`; fs.writeFileSync(absolute(output), `${JSON.stringify(manifest, null, 2)}\n`); console.log(JSON.stringify({ status: manifest.status, manifest: output, targetCount: targets.length, manifestIdentity: manifest.manifestIdentity }, null, 2));
