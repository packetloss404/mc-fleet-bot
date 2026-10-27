#!/usr/bin/env node
/**
 * WLV-STF-ACCESS-01 — compile the Westlight backstage-to-service-tower staff spine.
 *
 * The 26 Aug 2026 snapshot survey found that the lower staff component and the
 * west service tower are separated by a five-block diagonal hard-shell gap.
 * This compiler makes the smallest 3×3, three-high dogleg through that shell.
 * It refuses fluids, containers/control blocks, missing floor support, or any
 * source that does not match the exact current snapshot; it never executes.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const regionsValue = value('--regions');
const basename = value('--basename', 'wlv-staff-access-spine');
if (!regionsValue) {
  throw new Error('Usage: node scripts/compile_wlv_staff_access_spine.mjs --regions <region-dir> [--basename <data/buildops-prefix>]');
}
const REGIONS = path.resolve(ROOT, regionsValue);
const PREFIX = path.resolve(ROOT, 'data/buildops', basename);
if (!fs.existsSync(REGIONS)) throw new Error(`region directory does not exist: ${REGIONS}`);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const PROTECTED_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:shulker_box',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:furnace',
  'minecraft:blast_furnace', 'minecraft:smoker', 'minecraft:brewing_stand',
  'minecraft:lectern', 'minecraft:beacon', 'minecraft:conduit', 'minecraft:spawner',
  'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block',
]);

function hashSnapshot(directory) {
  const hash = crypto.createHash('sha256');
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  let bytes = 0;
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename));
    hash.update(filename);
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
    bytes += content.length;
  }
  return { sha256: hash.digest('hex'), regionFileCount: files.length, bytes };
}

function key(x, y, z) { return `${x},${y},${z}`; }
function cmp(left, right) { return left.x - right.x || left.y - right.y || left.z - right.z; }
function line(cell, from, to) {
  return `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${from} ${to}`;
}

// The first rectangle opens the west/east leg from the backstage component;
// the second opens the north/south leg to the existing tower base.  Both are
// three blocks wide and three clear high.  Their shared elbow remains 3×3.
const volume = new Map();
for (let x = -421; x <= -416; x += 1) {
  for (let z = -547; z <= -545; z += 1) {
    for (let y = 18; y <= 20; y += 1) volume.set(key(x, y, z), { x, y, z });
  }
}
for (let x = -422; x <= -420; x += 1) {
  for (let z = -546; z <= -541; z += 1) {
    for (let y = 18; y <= 20; y += 1) volume.set(key(x, y, z), { x, y, z });
  }
}
const cells = [...volume.values()].sort(cmp);
const reader = new AnvilReader(REGIONS);
const targets = [];
const rejected = [];
for (const cell of cells) {
  const [current, floor] = await Promise.all([
    reader.blockState(cell.x, cell.y, cell.z),
    reader.blockState(cell.x, 17, cell.z),
  ]);
  if (FLUID.has(current.Name) || FLUID.has(floor.Name)) {
    rejected.push({ cell, reason: 'fluid', current: stateToCommandString(current), floor: stateToCommandString(floor) });
    continue;
  }
  if (PROTECTED_NAMES.has(current.Name) || current.Name.endsWith('_sign')) {
    rejected.push({ cell, reason: 'protected-block-or-sign', current: stateToCommandString(current) });
    continue;
  }
  if (AIR.has(floor.Name)) {
    rejected.push({ cell, reason: 'missing-solid-floor-support', floor: stateToCommandString(floor) });
    continue;
  }
  if (!AIR.has(current.Name)) {
    targets.push({ cell, from: stateToCommandString(current), to: 'minecraft:air' });
  }
}
if (rejected.length) {
  throw new Error(`WLV-STF-ACCESS-01 rejected ${rejected.length} protected/fluid/unsupported cells: ${JSON.stringify(rejected.slice(0, 8))}`);
}
if (!targets.length) throw new Error('WLV-STF-ACCESS-01 has no source-guarded shell cells to clear');

const forward = `${PREFIX}.forward.txt`;
const rollback = `${PREFIX}.rollback.txt`;
const manifest = `${PREFIX}.release-manifest.json`;
fs.mkdirSync(path.dirname(PREFIX), { recursive: true });
fs.writeFileSync(forward, `${targets.map(({ cell, from, to }) => line(cell, from, to)).join('\n')}\n`);
fs.writeFileSync(rollback, `${[...targets].reverse().map(({ cell, from, to }) => line(cell, to, from)).join('\n')}\n`);

const identity = hashSnapshot(REGIONS);
const report = {
  schemaVersion: 1,
  id: 'wlv-stf-access-01',
  status: 'COMPILED_AWAITING_GUARDED_RELEASE',
  generatedAtUtc: new Date().toISOString(),
  sourceSnapshot: { regions: path.relative(ROOT, REGIONS), ...identity },
  ownership: {
    changedCells: 'westlight-venue staff-only lower hard-shell interface',
    publicSide: 'theatre lower lobby side at x >= -416',
    staffSide: 'west service tower side at x <= -421',
  },
  route: {
    classification: 'STAFF_ONLY',
    clearEnvelope: '3 wide × 3 high dogleg; solid source floor at y17 preserved',
    endpoints: {
      backstageComponent: [-416, 19, -546],
      westServiceBaseComponent: [-421, 19, -541],
    },
    bounds: { minX: -422, maxX: -416, minY: 17, maxY: 20, minZ: -547, maxZ: -541 },
    retainedRequirement: 'Run live bidirectional staff walk after execution before treating the public/backstage separation package as eligible.',
  },
  targetCount: targets.length,
  targetBounds: {
    minX: Math.min(...targets.map(({ cell }) => cell.x)), maxX: Math.max(...targets.map(({ cell }) => cell.x)),
    minY: Math.min(...targets.map(({ cell }) => cell.y)), maxY: Math.max(...targets.map(({ cell }) => cell.y)),
    minZ: Math.min(...targets.map(({ cell }) => cell.z)), maxZ: Math.max(...targets.map(({ cell }) => cell.z)),
  },
  exactOperationFiles: {
    forward: path.relative(ROOT, forward),
    rollback: path.relative(ROOT, rollback),
  },
  designConstraints: [
    'Clears only source-solid hard-shell cells in the exact 3×3 staff dogleg.',
    'Does not alter the y17 floor, public stairs, bowl, theatre seating, club, screen, containers, redstone, or any surface route.',
    'Does not create public access or commission an egress route.',
    'A later public/backstage separation partition remains prohibited until post-state staff continuity passes live QA.',
  ],
};
fs.writeFileSync(manifest, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: report.status,
  targets: targets.length,
  sourceSnapshotSha256: identity.sha256,
  forward: path.relative(ROOT, forward),
  rollback: path.relative(ROOT, rollback),
  manifest: path.relative(ROOT, manifest),
}, null, 2)}\n`);
