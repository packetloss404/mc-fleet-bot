#!/usr/bin/env node
/**
 * WLV-STF-ACCESS-02 — compile a three-wide no-jump staff bridge/ramp.
 *
 * This replaces the diagonally terraced lower-staff traversal with a supported
 * high-datum bridge, three-wide down stair, and 3×3 low landing that meets the
 * already-built WLV-STF-ACCESS-01 dogleg. It is a compiler only.
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
const basename = value('--basename', 'wlv-staff-access-ramp');
if (!regionsValue) throw new Error('Usage: --regions <region-dir> [--basename <buildops basename>]');
const REGIONS = path.resolve(ROOT, regionsValue);
const PREFIX = path.resolve(ROOT, 'data/buildops', basename);
if (!fs.existsSync(REGIONS)) throw new Error(`region directory does not exist: ${REGIONS}`);

const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air', 'minecraft:light']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const PROTECTED = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:furnace', 'minecraft:blast_furnace',
  'minecraft:smoker', 'minecraft:brewing_stand', 'minecraft:lectern', 'minecraft:beacon',
  'minecraft:conduit', 'minecraft:spawner', 'minecraft:command_block',
  'minecraft:chain_command_block', 'minecraft:repeating_command_block',
]);
const stair = 'minecraft:polished_deepslate_stairs[facing=west,half=bottom,shape=straight,waterlogged=false]';
const deck = 'minecraft:polished_deepslate';
const key = (x, y, z) => `${x},${y},${z}`;
const cellCmp = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
function snapshotHash(directory) {
  const hash = crypto.createHash('sha256'); let bytes = 0;
  const files = fs.readdirSync(directory).filter((name) => name.endsWith('.mca')).sort();
  for (const name of files) { const body = fs.readFileSync(path.join(directory, name)); hash.update(name); hash.update('\0'); hash.update(body); hash.update('\0'); bytes += body.length; }
  return { sha256: hash.digest('hex'), regionFileCount: files.length, bytes };
}
function op(cell, from, to) { return `REPL ${cell.x} ${cell.y} ${cell.z} ${cell.x} ${cell.y} ${cell.z} ${from} ${to}`; }

// High level: 3-wide deck, with a 3×9 east landing that receives the existing
// backstage component. Every cell has a retained solid source floor at y17.
const desired = new Map();
function setDesired(x, y, z, state, role) {
  const id = key(x, y, z);
  const prior = desired.get(id);
  if (prior && prior.state !== state) throw new Error(`conflicting desired state at ${id}`);
  desired.set(id, { x, y, z, state, roles: [...new Set([...(prior?.roles ?? []), role])] });
}
for (let x = -413; x <= -330; x += 1) for (let z = -541; z <= -539; z += 1) setDesired(x, 18, z, deck, 'high-datum-staff-bridge');
for (let x = -332; x <= -330; x += 1) for (let z = -547; z <= -539; z += 1) setDesired(x, 18, z, deck, 'east-landing');

// West transition: a one-cell north jog avoids the intact white-glass facade
// at x=-414/z=-540..-539.  A three-wide south-facing stair descends from the
// high bridge to a low landing, which meets the WLV-STF-ACCESS-01 dogleg at
// x=-416/z=-546.  The landing deliberately stops at x=-415, leaving that
// facade and its lighting fully intact.
setDesired(-414, 18, -541, deck, 'high-bridge-turn-landing');
for (let x = -414; x <= -412; x += 1) setDesired(x, 18, -542, 'minecraft:polished_deepslate_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', 'three-wide-descent-stair');
for (let x = -415; x <= -412; x += 1) {
  for (let z = -550; z <= -543; z += 1) {
    for (let y = 18; y <= 20; y += 1) setDesired(x, y, z, 'minecraft:air', 'low-landing-and-dogleg-interface-clearance');
  }
}
// Preserve the stair row after broad clearance assignment.
for (let x = -414; x <= -412; x += 1) setDesired(x, 18, -542, 'minecraft:polished_deepslate_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]', 'three-wide-descent-stair');

const reader = new AnvilReader(REGIONS);
const rejected = [];
const targets = [];
for (const cell of [...desired.values()].sort(cellCmp)) {
  const current = await reader.blockState(cell.x, cell.y, cell.z);
  const source = stateToCommandString(current);
  if (FLUID.has(current.Name) || PROTECTED.has(current.Name) || current.Name.endsWith('_sign')) {
    rejected.push({ cell: [cell.x, cell.y, cell.z], role: cell.roles, source, reason: 'fluid-or-protected-source' });
    continue;
  }
  // Every created floor/stair is supported by a pre-existing solid y17 base.
  if (cell.y === 18 && cell.state !== 'minecraft:air') {
    const below = await reader.blockState(cell.x, 17, cell.z);
    if (AIR.has(below.Name) || FLUID.has(below.Name)) {
      rejected.push({ cell: [cell.x, cell.y, cell.z], role: cell.roles, source, below: stateToCommandString(below), reason: 'unsupported-floor-or-stair' });
      continue;
    }
  }
  // Deck/stair headroom must already be clear. The clearance volume is explicit
  // only at the low landing, avoiding a hidden cut through the venue shell.
  if (cell.y === 18 && cell.state !== 'minecraft:air') {
    for (const y of [19, 20, 21]) {
      const above = await reader.blockState(cell.x, y, cell.z);
      if (!AIR.has(above.Name)) rejected.push({ cell: [cell.x, y, cell.z], role: cell.roles, source: stateToCommandString(above), reason: 'bridge-headroom-not-clear' });
    }
  }
  if (source !== cell.state) targets.push({ cell, from: source, to: cell.state });
}
if (rejected.length) throw new Error(`WLV-STF-ACCESS-02 rejected ${rejected.length} cells: ${JSON.stringify(rejected.slice(0, 12))}`);
if (!targets.length) throw new Error('WLV-STF-ACCESS-02 produced no guarded operations');

fs.mkdirSync(path.dirname(PREFIX), { recursive: true });
const forward = `${PREFIX}.forward.txt`; const rollback = `${PREFIX}.rollback.txt`; const manifest = `${PREFIX}.release-manifest.json`;
fs.writeFileSync(forward, `${targets.map(({ cell, from, to }) => op(cell, from, to)).join('\n')}\n`);
fs.writeFileSync(rollback, `${[...targets].reverse().map(({ cell, from, to }) => op(cell, to, from)).join('\n')}\n`);
const snapshot = snapshotHash(REGIONS);
const report = {
  schemaVersion: 1, id: 'wlv-stf-access-02', status: 'COMPILED_AWAITING_GUARDED_RELEASE', generatedAtUtc: new Date().toISOString(),
  sourceSnapshot: { regions: path.relative(ROOT, REGIONS), ...snapshot },
  classification: 'STAFF_ONLY',
  exactBounds: { minX: -415, maxX: -330, minY: 17, maxY: 21, minZ: -550, maxZ: -539 },
  design: {
    highBridge: { floorY: 18, x: [-413, -330], z: [-541, -539], clearEnvelope: '3 wide × 3 high' },
    eastLanding: { floorY: 18, x: [-332, -330], z: [-547, -539], clearEnvelope: '3×9 turn landing' },
    westDescent: { cells: [[-414, 18, -542], [-413, 18, -542], [-412, 18, -542]], facing: 'south', clearEnvelope: '3 wide stair to low datum' },
    westLowLanding: { floorY: 17, x: [-415, -412], z: [-550, -543], clearEnvelope: '4×8 low landing meeting WLV-STF-ACCESS-01 dogleg' },
  },
  targetCount: targets.length,
  operationFiles: { forward: path.relative(ROOT, forward), rollback: path.relative(ROOT, rollback) },
  requiredPostQa: [
    'exact target/halo and y17 support preservation',
    'rollback post-state preflight',
    'live entity clearance immediately before execution',
    'waypointed no-dig/no-jump/no-sprint staff walk in both directions',
    'only after that pass, a separately compiled public/backstage separation package',
  ],
};
fs.writeFileSync(manifest, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ status: report.status, targets: targets.length, snapshotSha256: snapshot.sha256, forward: path.relative(ROOT, forward), rollback: path.relative(ROOT, rollback), manifest: path.relative(ROOT, manifest) }, null, 2)}\n`);
