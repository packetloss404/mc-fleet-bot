#!/usr/bin/env node
/** Compile the exact dry C01 passive repair/crafting bay fit-out. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const snapshot = value('--snapshot');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const expect = async (x, y, z, expected, label) => {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  if (actual !== expected) throw new Error(`${label} drift at ${x},${y},${z}: ${actual}`);
};

const targets = [
  { x: 2012, y: 168, z: -887, state: 'minecraft:grindstone[face=floor,facing=north]' },
  { x: 2013, y: 168, z: -887, state: 'minecraft:crafting_table' },
];
for (const target of targets) {
  await expect(target.x, target.y, target.z, 'minecraft:air', 'C01 target');
  await expect(target.x, 167, target.z, 'minecraft:light_gray_concrete', 'C01 support');
  await expect(target.x, 169, target.z, 'minecraft:air', 'C01 head clearance');
}
for (let x = 2015; x <= 2017; x += 1) {
  await expect(x, 168, -887, 'minecraft:air', 'C01 approach');
  await expect(x, 169, -887, 'minecraft:air', 'C01 approach headroom');
}
for (let x = 2009; x <= 2017; x += 1) {
  for (let y = 167; y <= 171; y += 1) {
    const actual = stateToCommandString(await reader.blockState(x, y, -887));
    if (actual.includes('water')) throw new Error(`C01 water-boundary drift at ${x},${y},-887: ${actual}`);
  }
}

const id = 'mp01-c01-passive-repair-bay-01';
const forward = `${targets.map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${state}`).join('\n')}\n`;
const rollback = `${[...targets].reverse().map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${state} minecraft:air`).join('\n')}\n`;
const buildops = 'data/buildops';
const forwardPath = `${buildops}/${id}.forward.txt`;
const rollbackPath = `${buildops}/${id}.rollback.txt`;
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
fs.writeFileSync(path.join(ROOT, forwardPath), forward);
fs.writeFileSync(path.join(ROOT, rollbackPath), rollback);
const manifest = {
  schemaVersion: 1,
  transactionId: id,
  generatedAtUtc: new Date().toISOString(),
  status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A'],
  packages: [{ key: 'c01-passive-repair-bay', forward: forwardPath, rollback: rollbackPath }],
  executionOrder: { forward: ['c01-passive-repair-bay'], rollback: ['c01-passive-repair-bay'] },
  scope: {
    releaseId: 'MP01-C01-PASSIVE-REPAIR-BAY-01',
    purpose: 'Dry manual grindstone and crafting station in existing C01 service alcove.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    nonClaims: ['container storage', 'automation', 'active controls', 'utility commissioning', 'public access', 'MP01 completion'],
  },
  source: { snapshotRoot: snapshot },
  target: { operatedUnion: { cellCount: 2, bounds: { minX: 2012, maxX: 2013, minY: 168, maxY: 168, minZ: -887, maxZ: -887 } }, packageTargetsDisjoint: true },
  operations: { 'c01-passive-repair-bay': { forwardSha256: hash(forward), rollbackSha256: hash(rollback), forwardCommandCount: 2, rollbackCommandCount: 2, targetCellCount: 2, exactInverse: true } },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = hash(JSON.stringify(manifest));
const manifestPath = `${buildops}/${id}.release-manifest.json`;
fs.writeFileSync(path.join(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestPath, targetCount: targets.length, snapshot }, null, 2));
