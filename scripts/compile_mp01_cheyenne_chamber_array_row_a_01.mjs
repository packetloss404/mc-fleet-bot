#!/usr/bin/env node
/**
 * Compile the first exact, terminal-connected MP01 building-array tranche.
 * This is deliberately a restricted internal-inspection component: three
 * discrete service-shell bays, their manual doors, visible isolator analogues,
 * fixed interior light, and the clear east service spine. It does not assert
 * completion of the original fifteen-building chamber program.
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
  if (!result) throw new Error(`Missing required ${flag}`);
  return result;
};
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP01 chamber-array compiler rejected: ${message}`);
};
const snapshot = required('--snapshot');
const outDir = value('--out-dir', 'data/buildops');
const basename = value('--basename', 'mp01-cheyenne-chamber-array-row-a-01');
const rowTag = value('--row', 'A').toUpperCase();
const layout = value('--layout', 'column');
fail(/^[A-Z]$/.test(rowTag), `row must be one uppercase letter, received ${rowTag}`);
const x1 = Number(value('--min-x', '2027'));
fail(Number.isInteger(x1), `min-x must be an integer, received ${value('--min-x')}`);
const x2 = x1 + 5;
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const state = async (x, y, z) => stateToCommandString(await reader.blockState(x, y, z));
const occupied = new Set();
const lines = [];
const targets = [];

const addBox = async (id, bounds, from, to) => {
  let count = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
        const key = `${x},${y},${z}`;
        fail(!occupied.has(key), `operation overlap at ${key} (${id})`);
        const actual = await state(x, y, z);
        fail(actual === from, `${id} needs ${from} at ${key}, found ${actual}`);
        occupied.add(key);
        targets.push({ x, y, z, from, to, id });
        count += 1;
      }
    }
  }
  lines.push({ id, line: `REPL ${bounds.minX} ${bounds.minY} ${bounds.minZ} ${bounds.maxX} ${bounds.maxY} ${bounds.maxZ} ${from} ${to}`, count });
};

const addPoint = async (id, x, y, z, from, to) => addBox(id, {
  minX: x, maxX: x, minY: y, maxY: y, minZ: z, maxZ: z,
}, from, to);

const buildings = layout === 'south-row' ? [
  { id: `${rowTag}01`, minX: 2009, minZ: Number(value('--south-z-min')), maxZ: Number(value('--south-z-min')) + 6, doorZ: Number(value('--south-z-min')) + 3 },
  { id: `${rowTag}02`, minX: 2018, minZ: Number(value('--south-z-min')), maxZ: Number(value('--south-z-min')) + 6, doorZ: Number(value('--south-z-min')) + 3 },
  { id: `${rowTag}03`, minX: 2027, minZ: Number(value('--south-z-min')), maxZ: Number(value('--south-z-min')) + 6, doorZ: Number(value('--south-z-min')) + 3 },
] : [
  { id: `${rowTag}01`, minZ: -888, maxZ: -881, doorZ: -885 },
  { id: `${rowTag}02`, minZ: -874, maxZ: -867, doorZ: -871 },
  { id: `${rowTag}03`, minZ: -860, maxZ: -853, doorZ: -857 },
];
fail(layout === 'column' || (layout === 'south-row' && Number.isInteger(buildings[0].minZ)), `invalid layout/south-z-min`);
const white = 'minecraft:white_concrete';
const air = 'minecraft:air';
for (const building of buildings) {
  const bx1 = building.minX ?? x1, bx2 = bx1 + 5;
  await addBox(`${building.id}-isolator-base-north`, { minX: bx1, maxX: bx2, minY: 165, maxY: 165, minZ: building.minZ + 2, maxZ: building.minZ + 2 }, air, 'minecraft:iron_block');
  await addBox(`${building.id}-isolator-base-south`, { minX: bx1, maxX: bx2, minY: 165, maxY: 165, minZ: building.maxZ - 2, maxZ: building.maxZ - 2 }, air, 'minecraft:iron_block');
  // The dark, recessed upper courses read as a visible isolator analogue.
  // They use a state-free solid block because the guarded runner rejects
  // neighbour-derived line states (such as iron bars) as noncanonical.
  await addBox(`${building.id}-isolator-coil-north`, { minX: bx1, maxX: bx2, minY: 166, maxY: 166, minZ: building.minZ + 2, maxZ: building.minZ + 2 }, air, 'minecraft:polished_blackstone_bricks');
  await addBox(`${building.id}-isolator-coil-south`, { minX: bx1, maxX: bx2, minY: 166, maxY: 166, minZ: building.maxZ - 2, maxZ: building.maxZ - 2 }, air, 'minecraft:polished_blackstone_bricks');
  await addBox(`${building.id}-floor`, { minX: bx1, maxX: bx2, minY: 167, maxY: 167, minZ: building.minZ, maxZ: building.maxZ }, air, 'minecraft:light_gray_concrete');
  await addBox(`${building.id}-roof`, { minX: bx1, maxX: bx2, minY: 173, maxY: 173, minZ: building.minZ, maxZ: building.maxZ }, air, white);
  await addBox(`${building.id}-west-wall`, { minX: bx1, maxX: bx1, minY: 168, maxY: 172, minZ: building.minZ, maxZ: building.maxZ }, air, white);
  await addBox(`${building.id}-north-wall`, { minX: bx1 + 1, maxX: bx2 - 1, minY: 168, maxY: 172, minZ: building.minZ, maxZ: building.minZ }, air, white);
  await addBox(`${building.id}-south-wall`, { minX: bx1 + 1, maxX: bx2 - 1, minY: 168, maxY: 172, minZ: building.maxZ, maxZ: building.maxZ }, air, white);
  await addBox(`${building.id}-east-lintel`, { minX: bx2, maxX: bx2, minY: 170, maxY: 172, minZ: building.minZ, maxZ: building.maxZ }, air, white);
  for (const [side, minZ, maxZ] of [
    ['north', building.minZ, building.doorZ - 1],
    ['south', building.doorZ + 1, building.maxZ],
  ]) {
    await addBox(`${building.id}-east-${side}-lower`, { minX: bx2, maxX: bx2, minY: 168, maxY: 169, minZ, maxZ }, air, white);
  }
  await addPoint(`${building.id}-manual-door-lower`, bx2, 168, building.doorZ, air, 'minecraft:iron_door[facing=east,half=lower,hinge=left,open=false,powered=false]');
  await addPoint(`${building.id}-manual-door-upper`, bx2, 169, building.doorZ, air, 'minecraft:iron_door[facing=east,half=upper,hinge=left,open=false,powered=false]');
  await addPoint(`${building.id}-fixed-light-west`, bx1 + 2, 172, building.doorZ, air, 'minecraft:sea_lantern');
  await addPoint(`${building.id}-fixed-light-east`, bx1 + 3, 172, building.doorZ, air, 'minecraft:sea_lantern');
}

const forwardBody = `${lines.map(({ line }) => line).join('\n')}\n`;
const rollbackBody = `${[...lines].reverse().map(({ line }) => {
  const fields = line.split(' ');
  return `REPL ${fields.slice(1, 7).join(' ')} ${fields[8]} ${fields[7]}`;
}).join('\n')}\n`;
const rowSuffix = `row-${rowTag.toLowerCase()}`;
const forward = path.join(outDir, `${basename}.${rowSuffix}.forward.txt`);
const rollback = path.join(outDir, `${basename}.${rowSuffix}.rollback.txt`);
fs.mkdirSync(absolute(outDir), { recursive: true });
fs.writeFileSync(absolute(forward), `# MP01 restricted chamber-array Row A forward\n${forwardBody}`);
fs.writeFileSync(absolute(rollback), `# MP01 restricted chamber-array Row A rollback\n${rollbackBody}`);
const targetDigest = sha256(JSON.stringify(targets.map(({ x, y, z, from, to }) => ({ x, y, z, from, to }))));
const targetBounds = { minX: Math.min(...targets.map(({ x }) => x)), maxX: Math.max(...targets.map(({ x }) => x)), minY: 165, maxY: 173, minZ: Math.min(...targets.map(({ z }) => z)), maxZ: Math.max(...targets.map(({ z }) => z)) };
const manifest = {
  schemaVersion: 1,
  transactionId: `mp01-cheyenne-chamber-array-row-${rowTag.toLowerCase()}-01`,
  generatedAtUtc: new Date().toISOString(),
  status: 'COMPILED_FROM_CURRENT_SOURCE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: 'CZ-MP01-CHEYENNE-TERMINAL-ACCESS',
  mvpScope: false,
  scopeIds: ['MP01-A', 'P1-B03', 'Z10'],
  packages: [{ key: `array-row-${rowTag.toLowerCase()}`, forward: relative(forward), rollback: relative(rollback) }],
  executionOrder: { forward: [`array-row-${rowTag.toLowerCase()}`], rollback: [`array-row-${rowTag.toLowerCase()}`] },
  scope: {
    releaseId: `MP01-CHEYENNE-CHAMBER-ARRAY-ROW-${rowTag}-01`,
    purpose: 'Three first-row, restricted service-shell bays with manual doors, visible isolator analogues, fixed interior lighting, and an unobstructed east service spine.',
    accessClassAfterRelease: 'RESTRICTED_STAFF_INSPECTION_ONLY',
    functionalAssertions: ['three separately door-controlled inspection bays', 'terminal-connected east service spine remains clear', 'isolator analogue is visible below each bay'],
    nonClaims: ['public opening', 'public egress', '15-building array completion', 'Battle Cab', 'reservoir', 'full chamber completion'],
  },
  source: { snapshotRoot: snapshot },
  target: {
    operatedUnion: { cellCount: targets.length, bounds: targetBounds, coordinateStateSha256: targetDigest },
    packageTargetsDisjoint: true,
  },
  operations: {
    [`array-row-${rowTag.toLowerCase()}`]: { forwardSha256: sha256(forwardBody), rollbackSha256: sha256(rollbackBody), forwardCommandCount: lines.length, rollbackCommandCount: lines.length, targetCellCount: targets.length, exactInverse: true },
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestPath = path.join(outDir, `${basename}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ manifest: relative(manifestPath), targetCount: targets.length, commandCount: lines.length, targetCoordinateStateSha256: targetDigest }, null, 2)}\n`);
