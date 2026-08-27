#!/usr/bin/env node
/** Emit a gravity-safe, staged R09 6×6 service-gallery extension. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = value('--snapshot');
const minX = Number(value('--min-x', '-95'));
const maxX = Number(value('--max-x', '-76'));
const predecessorFloorX = Number(value('--predecessor-floor-x', String(minX - 1)));
const basename = value('--basename', 'rail-s3-r09-service-gallery-01');
const outDir = value('--out-dir', 'data/buildops');
const releaseId = value('--release-id', 'RAIL-S3-R09-SERVICE-GALLERY-01');
const fail = (condition, message) => { if (!condition) throw new Error(`${releaseId} compiler rejected: ${message}`); };
fail(snapshot, '--snapshot required');
fail(Number.isInteger(minX) && Number.isInteger(maxX) && minX <= maxX && predecessorFloorX === minX - 1, 'invalid segment or seam');
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
const name = (state) => state.split('[', 1)[0];
for (let z = -462; z <= -457; z += 1) fail(await stateAt({ x: predecessorFloorX, y: 17, z }) === 'minecraft:polished_deepslate', `predecessor floor seam drift at (${predecessorFloorX},17,${z})`);

const desired = new Map();
const add = (point, to, role) => {
  const id = cellKey(point);
  const existing = desired.get(id);
  if (existing) {
    fail(existing.to === to, `conflicting target ${id}`);
    return;
  }
  desired.set(id, { point, to, role });
};
for (let x = minX; x <= maxX; x += 1) {
  for (let y = 18; y <= 23; y += 1) for (let z = -462; z <= -457; z += 1) add({ x, y, z }, 'minecraft:air', 'interior');
  for (let y = 17; y <= 24; y += 1) for (const z of [-463, -456]) add({ x, y, z }, 'minecraft:polished_deepslate', 'side-shell');
  for (const y of [17, 24]) for (let z = -463; z <= -456; z += 1) add({ x, y, z }, 'minecraft:polished_deepslate', 'floor-or-roof');
}
for (let y = 17; y <= 24; y += 1) for (let z = -463; z <= -456; z += 1) add({ x: maxX + 1, y, z }, 'minecraft:polished_deepslate', 'forward-end-shell');

const candidates = [];
for (const record of desired.values()) {
  const from = await stateAt(record.point);
  fail(!fluid(from), `fluid target ${cellKey(record.point)}=${from}`);
  fail(!forbidden.has(name(from)), `forbidden block-entity target ${cellKey(record.point)}=${from}`);
  candidates.push({ ...record, from });
}
const gravel = candidates.filter(({ from }) => from === 'minecraft:gravel');
const gravelKeys = new Set(gravel.map(({ point }) => cellKey(point)));
const support = gravel.slice().sort((left, right) => left.point.y - right.point.y || left.point.x - right.point.x || left.point.z - right.point.z).map(({ point, from }) => ({ point, from, to: 'minecraft:polished_deepslate' }));
const core = candidates.filter(({ point, from, to }) => !gravelKeys.has(cellKey(point)) && from !== to).map(({ point, from, to }) => ({ point, from, to }));
const interiorClear = gravel.filter(({ role }) => role === 'interior').map(({ point }) => ({ point, from: 'minecraft:polished_deepslate', to: 'minecraft:air' }));
const unsupportedGravel = gravel.filter(({ role }) => role !== 'interior' && role !== 'side-shell' && role !== 'floor-or-roof');
fail(unsupportedGravel.length === 0, `unexpected gravity role(s): ${unsupportedGravel.map(({ role }) => role).join(',')}`);
const stages = [['gravity-support', support], ['core-shell-and-interior', core], ['temporary-interior-support-clear', interiorClear]];
fs.mkdirSync(path.resolve(root, outDir), { recursive: true });
const emitted = [];
for (const [id, records] of stages) {
  const body = `${records.map(({ point, from, to }) => replLine(point, from, to)).join('\n')}\n`;
  const inverse = `${records.slice().reverse().map(({ point, from, to }) => replLine(point, to, from)).join('\n')}\n`;
  const forward = `${outDir}/${basename}.${id}.forward.txt`;
  const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(path.resolve(root, forward), body);
  fs.writeFileSync(path.resolve(root, rollback), inverse);
  emitted.push({ id, forward, rollback, count: records.length, sha256: crypto.createHash('sha256').update(body).digest('hex'), exactInverse: true });
}
const exact = (points) => { const cells = uniqueCells(points); return { cellCount: cells.length, bounds: cells.length ? boundsOf(cells) : null, coordinateSetSha256: hashCells(cells) }; };
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_STAGED_GRAVITY_SAFE_R09_SERVICE_GALLERY_AWAITING_COMPLETE_SAVE_EXECUTION_KERNEL',
  source: { snapshot },
  scope: { releaseId, minX, maxX, predecessorFloorX, interior: exact([...desired.values()].filter(({ role }) => role === 'interior').map(({ point }) => point)), predecessorFloorSeam: exact(Array.from({ length: 6 }, (_, index) => ({ x: predecessorFloorX, y: 17, z: -462 + index }))), routeCommissioned: false, passengerServiceCommissioned: false },
  gravity: { sourceGravel: exact(gravel.map(({ point }) => point)), temporaryInteriorSupports: exact(interiorClear.map(({ point }) => point)), releaseOrder: emitted.map(({ id }) => id) },
  stages: emitted,
  hardStops: { requiresFreshCompleteImmutableSourceImmediatelyBeforeExecution: true, requiresBlockEntityAndLiveEntityClearance: true, requiresStrictNoopForwardAndRollbackChecks: true, requiresJournaledStrictExecution: true, requiresFreshPostSnapshotAndSequentialRollbackPoststatePreflight: true },
};
manifest.manifestIdentity = crypto.createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
fs.writeFileSync(path.resolve(root, `${outDir}/${basename}.manifest.json`), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, stageCounts: Object.fromEntries(emitted.map(({ id, count }) => [id, count])), gravitySourceCount: gravel.length, temporaryInteriorSupportCount: interiorClear.length, manifestIdentity: manifest.manifestIdentity }, null, 2));
