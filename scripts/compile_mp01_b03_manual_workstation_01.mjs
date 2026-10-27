#!/usr/bin/env node
/** Compile the surveyed B03 manual fletching/cartography workstation. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const argument = (flag) => {
  const index = args.indexOf(flag);
  if (index < 0 || !args[index + 1]) throw new Error(`${flag} is required`);
  return args[index + 1];
};
const snapshot = argument('--snapshot');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));

async function expect(x, y, z, expected, label) {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  if (actual !== expected) throw new Error(`${label} source drift at ${x},${y},${z}: ${actual}`);
}

const targets = [
  { x: 2021, y: 168, z: -859, state: 'minecraft:fletching_table' },
  { x: 2022, y: 168, z: -859, state: 'minecraft:cartography_table' },
];
for (const target of targets) await expect(target.x, target.y, target.z, 'minecraft:air', 'B03 target');
for (const target of targets) {
  await expect(target.x, 167, target.z, 'minecraft:light_gray_concrete', 'B03 floor support');
  await expect(target.x, 169, target.z, 'minecraft:air', 'B03 head clearance');
}
for (let x = 2024; x <= 2026; x += 1) {
  for (let y = 168; y <= 169; y += 1) await expect(x, y, -859, 'minecraft:air', 'B03 preserved approach');
}
for (let x = 2018; x <= 2027; x += 1) {
  for (let y = 167; y <= 171; y += 1) {
    const actual = stateToCommandString(await reader.blockState(x, y, -859));
    if (actual.includes('water')) throw new Error(`B03 water boundary drift at ${x},${y},-859: ${actual}`);
  }
}

const releaseId = 'mp01-b03-manual-workstation-01';
const forwardLines = targets.map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${state}`);
const rollbackLines = [...targets].reverse().map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${state} minecraft:air`);
const forward = `${forwardLines.join('\n')}\n`;
const rollback = `${rollbackLines.join('\n')}\n`;
const buildops = 'data/buildops';
const forwardPath = `${buildops}/${releaseId}.forward.txt`;
const rollbackPath = `${buildops}/${releaseId}.rollback.txt`;
const sha256 = (text) => crypto.createHash('sha256').update(text).digest('hex');
fs.writeFileSync(path.join(ROOT, forwardPath), forward);
fs.writeFileSync(path.join(ROOT, rollbackPath), rollback);

const manifest = {
  schemaVersion: 1,
  transactionId: releaseId,
  generatedAtUtc: new Date().toISOString(),
  status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A'],
  packages: [{ key: 'b03-manual-workstation', forward: forwardPath, rollback: rollbackPath }],
  executionOrder: { forward: ['b03-manual-workstation'], rollback: ['b03-manual-workstation'] },
  scope: {
    releaseId: 'MP01-B03-MANUAL-WORKSTATION-01',
    purpose: 'Dry manual fletching and cartography work station in the existing B03 alcove.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    nonClaims: ['container storage', 'automation', 'active controls', 'public access', 'MP01 completion'],
  },
  source: { snapshotRoot: snapshot },
  target: {
    operatedUnion: { cellCount: targets.length, bounds: { minX: 2021, maxX: 2022, minY: 168, maxY: 168, minZ: -859, maxZ: -859 } },
    packageTargetsDisjoint: true,
  },
  operations: {
    'b03-manual-workstation': {
      forwardSha256: sha256(forward),
      rollbackSha256: sha256(rollback),
      forwardCommandCount: targets.length,
      rollbackCommandCount: targets.length,
      targetCellCount: targets.length,
      exactInverse: true,
    },
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestPath = `${buildops}/${releaseId}.release-manifest.json`;
fs.writeFileSync(path.join(ROOT, manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestPath, targetCount: targets.length, snapshot }, null, 2));
