#!/usr/bin/env node
/** Compile one dry 6×6 civil service-gallery extension with a floor-only seam. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot', '');
const minX = Number(value('--min-x', '-135'));
const maxX = Number(value('--max-x', '-116'));
const predecessorFloorX = Number(value('--predecessor-floor-x', String(minX - 1)));
const basename = value('--basename', 'rail-s3-r07-service-gallery-01');
const releaseId = value('--release-id', 'RAIL-S3-R07-SERVICE-GALLERY-01');
const outDir = value('--out-dir', 'data/buildops');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${releaseId} compiler rejected: ${message}`);
};
fail(snapshot, '--snapshot required');
fail(Number.isInteger(minX) && Number.isInteger(maxX) && minX <= maxX, 'invalid x segment');
fail(predecessorFloorX === minX - 1, 'floor-only seam must be immediately predecessor-adjacent');
const root = process.cwd();
const reader = new AnvilReader(path.resolve(root, snapshot, 'region'));
const cache = new Map();
const stateAt = async (point) => {
  const id = cellKey(point);
  if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(point.x, point.y, point.z)));
  return cache.get(id);
};
const fluid = (state) => state.startsWith('minecraft:water') || state.startsWith('minecraft:lava') || state.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon']);
const blockName = (state) => state.split('[', 1)[0];

for (let z = -462; z <= -457; z += 1) {
  fail(await stateAt({ x: predecessorFloorX, y: 17, z }) === 'minecraft:polished_deepslate', `predecessor floor-seam drift at (${predecessorFloorX},17,${z})`);
}
const proposed = [];
const add = (point, to, role) => proposed.push({ point, to, role });
for (let x = minX; x <= maxX; x += 1) {
  for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) add({ x, y, z }, 'minecraft:air', 'interior');
  for (let y = 17; y <= 24; y += 1) for (const z of [-463, -456]) add({ x, y, z }, 'minecraft:polished_deepslate', 'side-shell');
  for (const y of [17, 24]) for (let z = -463; z <= -456; z += 1) add({ x, y, z }, 'minecraft:polished_deepslate', 'floor-or-roof');
}
for (let y = 17; y <= 24; y += 1) for (let z = -463; z <= -456; z += 1) add({ x: maxX + 1, y, z }, 'minecraft:polished_deepslate', 'forward-end-shell');

const seen = new Set();
const records = [];
for (const { point, to, role } of proposed) {
  const id = cellKey(point);
  if (seen.has(id)) continue;
  seen.add(id);
  const from = await stateAt(point);
  fail(!fluid(from), `fluid target ${id}=${from}`);
  fail(!forbidden.has(blockName(from)), `forbidden block-entity target ${id}=${from}`);
  if (from !== to) records.push({ point, from, to, role });
}
const forwardBody = `${records.map(({ point, from, to }) => replLine(point, from, to)).join('\n')}\n`;
const rollbackBody = `${records.slice().reverse().map(({ point, from, to }) => replLine(point, to, from)).join('\n')}\n`;
const forward = `${outDir}/${basename}.forward.txt`;
const rollback = `${outDir}/${basename}.rollback.txt`;
fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
fs.writeFileSync(path.resolve(root, forward), forwardBody);
fs.writeFileSync(path.resolve(root, rollback), rollbackBody);
const exact = (points) => {
  const cells = uniqueCells(points);
  return { cellCount: cells.length, bounds: cells.length ? boundsOf(cells) : null, coordinateSetSha256: hashCells(cells) };
};
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_DRY_6X6_SERVICE_GALLERY_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL',
  source: { snapshot },
  scope: {
    releaseId,
    purpose: `Extend the dry, separated 6×6 Cobalt service gallery across x=${minX}..${maxX}; floor-only predecessor seam at x=${predecessorFloorX}. No rail, route, or passenger use.`,
    interior: exact(proposed.filter(({ role }) => role === 'interior').map(({ point }) => point)),
    predecessorFloorSeam: exact(Array.from({ length: 6 }, (_, index) => ({ x: predecessorFloorX, y: 17, z: -462 + index }))),
    routeCommissioned: false,
    passengerServiceCommissioned: false,
  },
  package: { forward, rollback, target: exact(records.map(({ point }) => point)), forwardCommandCount: records.length, exactInverse: true },
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndRollbackPoststatePreflight: true },
};
manifest.manifestIdentity = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.resolve(root, `${outDir}/${basename}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, targetCount: records.length, interiorCount: manifest.scope.interior.cellCount, predecessorFloorSeamCount: 6, manifestIdentity: manifest.manifestIdentity }, null, 2));
