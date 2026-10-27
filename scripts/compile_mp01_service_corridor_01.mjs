#!/usr/bin/env node
/**
 * Compile MP01-SERVICE-CORRIDOR-01 from an immutable source snapshot.
 *
 * This is a dry, restricted staff route between the north chamber aperture and
 * the reservoir causeway.  The south liner wall intentionally stays between
 * the route and RS02's contained water; the only causeway connection is a
 * closed, manual iron door.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const required = (flag) => {
  const result = value(flag);
  if (!result) throw new Error(`Missing ${flag}`);
  return result;
};
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const snapshot = required('--snapshot');
const outDir = value('--out-dir', 'data/buildops');
const basename = value('--basename', 'mp01-service-corridor-01');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const cells = new Map();
const add = (x, y, z, state) => {
  const key = `${x},${y},${z}`;
  // Structural faces meet at corners.  Coalescing an identical intended state
  // keeps the emitted operation one-cell/one-write while rejecting a real
  // design conflict.
  if (cells.has(key)) {
    if (cells.get(key).state === state) return;
    throw new Error(`Conflicting service-corridor target ${key}`);
  }
  cells.set(key, { x, y, z, state });
};
const volume = (x1, y1, z1, x2, y2, z2, state, skip = () => false) => {
  for (let x = x1; x <= x2; x += 1) for (let y = y1; y <= y2; y += 1) for (let z = z1; z <= z2; z += 1) {
    if (!skip(x, y, z)) add(x, y, z, state);
  }
};

// 18 x 8 x 5 envelope: 4-wide dry passage (z -895..-892), south retaining
// wall at -896, and a four-wide north opening (x 2009..2012) into the
// pre-existing chamber.  x=2008 is the structural west jamb.
volume(2008, 165, -896, 2025, 165, -892, 'minecraft:polished_andesite');
volume(2008, 172, -896, 2025, 172, -892, 'minecraft:white_concrete');
volume(2008, 166, -896, 2025, 171, -896, 'minecraft:white_concrete');
volume(2013, 166, -892, 2025, 171, -892, 'minecraft:white_concrete');
volume(2008, 166, -895, 2008, 171, -892, 'minecraft:white_concrete');
volume(2025, 166, -895, 2025, 171, -892, 'minecraft:white_concrete', (x, y, z) => z === -894 && (y === 166 || y === 167));
add(2025, 166, -894, 'minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]');
add(2025, 167, -894, 'minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]');
add(2013, 171, -894, 'minecraft:sea_lantern');
add(2020, 171, -894, 'minecraft:sea_lantern');

for (const { x, y, z } of cells.values()) {
  const actual = stateToCommandString(await reader.blockState(x, y, z));
  if (actual !== 'minecraft:air') throw new Error(`Service-corridor source drift at ${x},${y},${z}: ${actual}`);
}
const ordered = [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
const forward = ordered.map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} minecraft:air ${state}`).join('\n') + '\n';
const rollback = [...ordered].reverse().map(({ x, y, z, state }) => `REPL ${x} ${y} ${z} ${x} ${y} ${z} ${state} minecraft:air`).join('\n') + '\n';
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
const forwardFile = path.join(outDir, `${basename}.forward.txt`);
const rollbackFile = path.join(outDir, `${basename}.rollback.txt`);
fs.writeFileSync(path.join(ROOT, forwardFile), forward);
fs.writeFileSync(path.join(ROOT, rollbackFile), rollback);
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  generatedAtUtc: new Date().toISOString(),
  status: 'COMPILED_AWAITING_FRESH_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A', 'Z10'],
  packages: [{ key: 'service-corridor', forward: forwardFile, rollback: rollbackFile }],
  executionOrder: { forward: ['service-corridor'], rollback: ['service-corridor'] },
  scope: {
    releaseId: 'MP01-SERVICE-CORRIDOR-01',
    purpose: 'Dry restricted service circulation from the north chamber to the reservoir causeway, isolated from the RS02 water basin by a retained liner wall.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    routeInterfaces: {
      chamberOpening: { x: [2009, 2012], y: [166, 171], z: -892 },
      causewayDoor: { x: 2025, y: [166, 167], z: -894, state: 'closed manual iron door' },
      retainedReservoirBoundary: { x: [2008, 2025], y: [166, 171], z: -896 },
    },
    nonClaims: ['public access', 'public egress', 'automation', 'emergency commissioning', 'MP01 completion'],
  },
  source: { snapshotRoot: snapshot },
  target: {
    operatedUnion: { cellCount: ordered.length, bounds: { minX: 2008, maxX: 2025, minY: 165, maxY: 172, minZ: -896, maxZ: -892 } },
    packageTargetsDisjoint: true,
  },
  operations: {
    'service-corridor': {
      forwardSha256: sha256(forward), rollbackSha256: sha256(rollback),
      forwardCommandCount: ordered.length, rollbackCommandCount: ordered.length,
      targetCellCount: ordered.length, exactInverse: true,
    },
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestFile = path.join(outDir, `${basename}.release-manifest.json`);
fs.writeFileSync(path.join(ROOT, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestFile, targetCount: ordered.length, commandCount: ordered.length }, null, 2));
