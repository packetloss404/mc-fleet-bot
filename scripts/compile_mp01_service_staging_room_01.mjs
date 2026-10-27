#!/usr/bin/env node
/**
 * Compile MP01-SERVICE-STAGING-ROOM-01 from a frozen current-world source.
 *
 * The room is a manual, dry service staging/isolation area west of the
 * reservoir corridor.  It changes one existing corridor wall pair into a
 * closed door, retains all reservoir liner/water cells, and has no container,
 * redstone, fluid, or automation target.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => { const i = args.indexOf(flag); return i >= 0 && args[i + 1] ? args[i + 1] : fallback; };
const required = (flag) => { const result = value(flag); if (!result) throw new Error(`Missing ${flag}`); return result; };
const hash = (input) => crypto.createHash('sha256').update(input).digest('hex');
const snapshot = required('--snapshot');
const outDir = value('--out-dir', 'data/buildops');
const basename = value('--basename', 'mp01-service-staging-room-01');
const reader = new AnvilReader(path.join(ROOT, snapshot, 'region'));
const cells = new Map();
const put = (x, y, z, from, to, id) => {
  const key = `${x},${y},${z}`;
  // Interior finish cells deliberately replace the default carved-air target.
  // The compiler still emits exactly one guarded write per coordinate and
  // refuses any attempt to overwrite a different source state.
  if (cells.has(key)) {
    if (cells.get(key).from !== from) throw new Error(`Conflicting staging-room source target ${key} (${id})`);
    cells.set(key, { x, y, z, from, to, id });
    return;
  }
  cells.set(key, { x, y, z, from, to, id });
};
const fill = (x1, y1, z1, x2, y2, z2, from, to, id, except = () => false) => {
  for (let x = x1; x <= x2; x += 1) for (let y = y1; y <= y2; y += 1) for (let z = z1; z <= z2; z += 1) {
    if (!except(x, y, z)) put(x, y, z, from, to, id);
  }
};

// The interior is deliberately kept small and dry, retaining raw-stone side
// walls. The east threshold rises to the corridor's floor level before the
// closed manual door, making the one-block change in level explicit.
fill(1994, 165, -905, 2006, 172, -894, 'minecraft:stone', 'minecraft:air', 'dry-room-interior');
fill(1993, 164, -906, 2007, 164, -893, 'minecraft:stone', 'minecraft:polished_andesite', 'finished-room-floor');
fill(1993, 173, -906, 2007, 173, -893, 'minecraft:stone', 'minecraft:white_concrete', 'finished-room-roof');
fill(2007, 166, -894, 2007, 172, -894, 'minecraft:stone', 'minecraft:air', 'east-threshold-clearance');
put(2008, 166, -894, 'minecraft:white_concrete', 'minecraft:iron_door[facing=west,half=lower,hinge=left,open=false,powered=false]', 'controlled-door-lower');
put(2008, 167, -894, 'minecraft:white_concrete', 'minecraft:iron_door[facing=west,half=upper,hinge=left,open=false,powered=false]', 'controlled-door-upper');
for (const z of [-904, -900, -896]) fill(1996, 165, z, 1998, 165, z, 'minecraft:stone', 'minecraft:polished_blackstone_bricks', `manual-service-plinth-${z}`);
for (const [x, z] of [[1998, -903], [1998, -897], [2003, -900]]) put(x, 172, z, 'minecraft:stone', 'minecraft:sea_lantern', 'fixed-service-light');

for (const entry of cells.values()) {
  const actual = stateToCommandString(await reader.blockState(entry.x, entry.y, entry.z));
  if (actual !== entry.from) throw new Error(`Staging-room source drift at ${entry.x},${entry.y},${entry.z}: expected ${entry.from}, got ${actual}`);
}
const ordered = [...cells.values()].sort((a, b) => a.y - b.y || a.x - b.x || a.z - b.z);
// Decompose same-source/same-target cells into disjoint rectangular commands.
// This is only transport compression: the source map, exact target union, and
// one-to-one reverse remain cell-identical to the uncompressed design.
const key = (x, y, z) => `${x},${y},${z}`;
const used = new Set();
const same = (x, y, z, seed) => {
  const item = cells.get(key(x, y, z));
  return item && !used.has(key(x, y, z)) && item.from === seed.from && item.to === seed.to;
};
const groups = [];
for (const seed of ordered) {
  if (used.has(key(seed.x, seed.y, seed.z))) continue;
  let maxX = seed.x;
  while (same(maxX + 1, seed.y, seed.z, seed)) maxX += 1;
  let maxZ = seed.z;
  while ([...Array(maxX - seed.x + 1).keys()].every((offset) => same(seed.x + offset, seed.y, maxZ + 1, seed))) maxZ += 1;
  let maxY = seed.y;
  const faceMatches = (candidateY) => {
    for (let x = seed.x; x <= maxX; x += 1) for (let z = seed.z; z <= maxZ; z += 1) if (!same(x, candidateY, z, seed)) return false;
    return true;
  };
  while (faceMatches(maxY + 1)) maxY += 1;
  for (let x = seed.x; x <= maxX; x += 1) for (let y = seed.y; y <= maxY; y += 1) for (let z = seed.z; z <= maxZ; z += 1) used.add(key(x, y, z));
  groups.push({ ...seed, maxX, maxY, maxZ });
}
if (used.size !== ordered.length) throw new Error(`Staging-room decomposition lost cells (${used.size}/${ordered.length})`);
const forward = groups.map(({ x, y, z, maxX, maxY, maxZ, from, to }) => `REPL ${x} ${y} ${z} ${maxX} ${maxY} ${maxZ} ${from} ${to}`).join('\n') + '\n';
const rollback = [...groups].reverse().map(({ x, y, z, maxX, maxY, maxZ, from, to }) => `REPL ${x} ${y} ${z} ${maxX} ${maxY} ${maxZ} ${to} ${from}`).join('\n') + '\n';
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
const forwardFile = path.join(outDir, `${basename}.forward.txt`);
const rollbackFile = path.join(outDir, `${basename}.rollback.txt`);
fs.writeFileSync(path.join(ROOT, forwardFile), forward);
fs.writeFileSync(path.join(ROOT, rollbackFile), rollback);
const manifest = {
  schemaVersion: 1, transactionId: basename, generatedAtUtc: new Date().toISOString(),
  status: 'COMPILED_AWAITING_FRESH_KERNEL', releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false, scopeIds: ['MP01-A', 'Z10'],
  packages: [{ key: 'service-staging-room', forward: forwardFile, rollback: rollbackFile }],
  executionOrder: { forward: ['service-staging-room'], rollback: ['service-staging-room'] },
  scope: {
    releaseId: 'MP01-SERVICE-STAGING-ROOM-01',
    purpose: 'Restricted dry manual service-staging/isolation room connected by a closed controlled door to the existing service corridor.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    protectedInterfaces: {
      sourceDoorConversion: { x: 2008, y: [166, 167], z: -894, priorState: 'minecraft:white_concrete' },
      reservoirProtection: 'No target at z <= -896 within the corridor/reservoir interface; RS02 water and liner remain outside this package.',
      levelTransition: 'Corridor floor y=165, staging-room floor y=164; dry threshold is intentionally one step down.',
    },
    nonClaims: ['public access', 'public egress', 'active utility control', 'redstone automation', 'emergency commissioning', 'MP01 completion'],
  },
  source: { snapshotRoot: snapshot },
  target: { operatedUnion: { cellCount: ordered.length, bounds: { minX: 1993, maxX: 2008, minY: 164, maxY: 173, minZ: -906, maxZ: -893 } }, packageTargetsDisjoint: true },
  operations: { 'service-staging-room': { forwardSha256: hash(forward), rollbackSha256: hash(rollback), forwardCommandCount: groups.length, rollbackCommandCount: groups.length, targetCellCount: ordered.length, exactInverse: true } },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = hash(JSON.stringify(manifest));
const manifestFile = path.join(outDir, `${basename}.release-manifest.json`);
fs.writeFileSync(path.join(ROOT, manifestFile), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ manifest: manifestFile, targetCount: ordered.length, commandCount: groups.length }, null, 2));
