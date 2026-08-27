#!/usr/bin/env node
/** Compile the next exact manual maintenance pair inside the accepted MP01 staging room. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const arg = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] ?? fallback : fallback; };
const snapshot = arg('--snapshot');
const outDir = arg('--out-dir', 'data/buildops');
const basename = arg('--basename', 'mp01-service-staging-manual-maintenance-01');
if (!snapshot) throw new Error('usage: --snapshot <complete-save> [--out-dir] [--basename]');
const absolute = (file) => path.resolve(ROOT, file);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const read = (file) => fs.readFileSync(absolute(file));
const parentManifestPath = 'data/buildops/mp01-service-staging-room-01.release-manifest.json';
const parentLedgerPath = 'data/world-review/mp01-service-staging-room-01-live-20260826T051000Z/evidence-ledger.json';
const parentBytes = read(parentManifestPath);
const parentManifest = JSON.parse(parentBytes);
const parentLedger = JSON.parse(read(parentLedgerPath));
if (parentLedger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' || parentManifest.target?.operatedUnion?.cellCount !== 1677) throw new Error('accepted staging-room predecessor is not exact');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
const captureBytes = read(`${snapshot}/combined-zones-complete-save-capture.json`);
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const targets = [
  { x: 2002, y: 165, z: -900, to: 'minecraft:smithing_table' },
  { x: 2003, y: 165, z: -900, to: 'minecraft:grindstone[face=floor,facing=north]' },
];
for (const { x, y, z } of targets) {
  if (await state(x, y, z) !== 'minecraft:air') throw new Error(`target drift ${x},${y},${z}`);
  if (await state(x, y - 1, z) !== 'minecraft:polished_andesite') throw new Error(`support drift ${x},${y - 1},${z}`);
  for (const headY of [y + 1, y + 2]) if (await state(x, headY, z) !== 'minecraft:air') throw new Error(`headroom drift ${x},${headY},${z}`);
}
for (let x = 1999; x <= 2005; x += 1) for (let y = 165; y <= 167; y += 1) for (let z = -899; z <= -895; z += 1) {
  if (await state(x, y, z) !== 'minecraft:air') throw new Error(`approach drift ${x},${y},${z}`);
}
const blockEntities = [];
for (const cx of [124, 125]) {
  const chunk = await reader.chunk(cx, -57);
  for (const entity of chunk?.block_entities ?? []) {
    const { x, y, z } = entity;
    if (x >= 1998 && x <= 2005 && y >= 164 && y <= 173 && z >= -902 && z <= -894) blockEntities.push({ x, y, z, id: entity.id ?? null });
  }
}
if (blockEntities.length) throw new Error(`local block-entity conflict ${JSON.stringify(blockEntities)}`);
const forward = `${targets.map(({ x, y, z, to }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${to}`).join('\n')}\n`;
const rollback = `${[...targets].reverse().map(({ x, y, z, to }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${to} minecraft:air`).join('\n')}\n`;
fs.mkdirSync(absolute(outDir), { recursive: true });
const forwardPath = `${outDir}/${basename}.forward.txt`;
const rollbackPath = `${outDir}/${basename}.rollback.txt`;
fs.writeFileSync(absolute(forwardPath), forward);
fs.writeFileSync(absolute(rollbackPath), rollback);
const key = 'service-staging-manual-maintenance';
const manifest = {
  schemaVersion: 1, transactionId: basename, generatedAtUtc: new Date().toISOString(), status: 'COMPILED_AWAITING_FRESH_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS', mvpScope: false, scopeIds: ['MP01-A', 'Z10'],
  packages: [{ key, forward: forwardPath, rollback: rollbackPath }], executionOrder: { forward: [key], rollback: [key] },
  scope: { releaseId: 'MP01-SERVICE-STAGING-MANUAL-MAINTENANCE-01', purpose: 'Two non-container manual maintenance tools in the accepted restricted staging room.', parentRelease: { manifest: parentManifestPath, manifestSha256: sha(parentBytes), ledger: parentLedgerPath, ledgerStatus: parentLedger.status }, accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY', preservedApproach: { x: [1999, 2005], y: [165, 167], z: [-899, -895], width: 4 }, nonClaims: ['container storage', 'automation', 'active utility control', 'public access', 'emergency egress', 'MP01 completion'] },
  source: { snapshotRoot: snapshot, captureManifestSha256: sha(captureBytes), readOnly: true },
  target: { operatedUnion: { cellCount: targets.length, bounds: { minX: 2002, maxX: 2003, minY: 165, maxY: 165, minZ: -900, maxZ: -900 } }, packageTargetsDisjoint: true },
  operations: { [key]: { forwardSha256: sha(forward), rollbackSha256: sha(rollback), forwardCommandCount: 2, rollbackCommandCount: 2, targetCellCount: 2, exactInverse: true } },
  staticClearance: { blockEntities, sourceFluidOrGravityHazards: [] }, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha(JSON.stringify(manifest));
const output = `${outDir}/${basename}.release-manifest.json`;
fs.writeFileSync(absolute(output), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: output, targetCount: 2, manifestIdentity: manifest.manifestIdentity }, null, 2));
