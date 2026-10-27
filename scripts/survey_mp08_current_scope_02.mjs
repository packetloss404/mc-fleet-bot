#!/usr/bin/env node
/**
 * MP08 current-state scope screen. Read-only; emits no operation.
 *
 * The purpose is to prevent two different retained Raven Rock post snapshots
 * (C2 on 2026-08-25 and RR-Z5 on 2026-08-24) from being combined into a
 * fictional current route. It tests the newest C2 dry terminus directly and
 * records why neither it nor the older shaft evidence is a safe micro-release.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const C2_SNAPSHOT = value('--c2-snapshot', 'data/worldsnap-rr-c2-post-20260825T052631Z');
const Z5_SNAPSHOT = value('--z5-snapshot', 'data/worldsnap-rr-z5-post-20260824T190038Z');
const OUT = value('--out', 'data/world-review/mp08-raven-rock-current-scope-02-20260826T090000Z.json');
const GENERATED_AT = value('--generated-at', '2026-08-26T09:00:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID.has(nameOf(state)) || state.includes('waterlogged=true');
const c2Reader = new AnvilReader(absolute(path.join(C2_SNAPSHOT, 'region')));
const cache = new Map();
const c2At = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await c2Reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

const drySpine = [];
for (let x = -70; x >= -79; x -= 1) {
  const floor = { x, y: -12, z: -14 };
  const feet = { x, y: -11, z: -14 };
  const head = { x, y: -10, z: -14 };
  const [support, feetState, headState] = await Promise.all([c2At(floor), c2At(feet), c2At(head)]);
  drySpine.push({ floor, support, feet: feetState, head: headState, normalWalk: !isAir(support) && !isFluid(support) && isAir(feetState) && isAir(headState) });
}
const capCells = [];
for (let y = -11; y <= -4; y += 1) for (let z = -15; z <= -11; z += 1) capCells.push({ x: -80, y, z });
for (let y = -10; y <= -4; y += 1) for (let z = -18; z <= -16; z += 1) capCells.push({ x: -80, y, z });
const capDrift = [];
for (const cell of capCells) {
  const state = await c2At(cell);
  const retainedOre = cell.y === -5 && cell.z === -13;
  if (retainedOre ? nameOf(state) !== 'minecraft:deepslate_gold_ore' : nameOf(state) !== 'minecraft:stone_bricks') capDrift.push({ cell, state });
}
const c2FluidCells = [];
for (let x = -125; x <= -70; x += 1) for (let y = -25; y <= -3; y += 1) for (let z = -25; z <= -2; z += 1) {
  const cell = { x, y, z }; const state = await c2At(cell);
  if (isFluid(state)) c2FluidCells.push({ cell, state });
}
const rejectedPatch = { x: -77, y: -12, z: -12 };
const patchHalo = [];
for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
  const cell = { x: rejectedPatch.x + dx, y: rejectedPatch.y + dy, z: rejectedPatch.z + dz };
  patchHalo.push({ cell, state: await c2At(cell) });
}
const patchHaloFluids = patchHalo.filter(({ state }) => isFluid(state));
const dryEnvelope = uniqueCells(drySpine.flatMap(({ floor }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 2; dy += 1) for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: floor.x + dx, y: floor.y + dy, z: floor.z + dz });
  return cells;
}));
const dryEnvelopeKeys = new Set(dryEnvelope.map(cellKey));
const blockEntities = [];
for (const chunkKey of new Set(dryEnvelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await c2Reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (dryEnvelopeKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
}
const snapshotInfo = (snapshot) => ({
  root: relative(snapshot),
  regionPresent: fs.existsSync(absolute(path.join(snapshot, 'region'))),
  entitiesPresent: fs.existsSync(absolute(path.join(snapshot, 'entities'))),
});
const report = {
  schemaVersion: 1,
  id: 'MP08-RAVEN-ROCK-CURRENT-SCOPE-02',
  generatedAtUtc: GENERATED_AT,
  status: 'CURRENT_STATE_NO_SAFE_DISJOINT_MICRO_SCOPE',
  sourceCoverage: {
    newestC2Post: snapshotInfo(C2_SNAPSHOT),
    olderZ5Post: snapshotInfo(Z5_SNAPSHOT),
    sameMomentCompleteRavenRockSource: false,
    rule: 'Separate historical post snapshots may corroborate present accepted boundaries but cannot be joined to authorize a new route or operation.',
  },
  c2CurrentTerminus: {
    owner: 'Raven Rock / Site R (RR-C2 operational secondary)',
    dryApproach: { stationCount: drySpine.length, stationSetSha256: hashCells(drySpine.map(({ floor }) => floor)), normalWalkPass: drySpine.every(({ normalWalk }) => normalWalk), terminalX: -80 },
    containmentCap: { cellCount: capCells.length, driftCount: capDrift.length, protectedRetainedOre: { x: -80, y: -5, z: -13 }, result: capDrift.length === 0 ? 'PASS_CLOSED' : 'DRIFT' },
    c2FluidCensus: { cellCount: c2FluidCells.length, coordinateSetSha256: hashCells(c2FluidCells.map(({ cell }) => cell)) },
    dryApproachBlockEntities: blockEntities,
    rejectedPatch: { cell: rejectedPatch, oneCellHaloFluidCount: patchHaloFluids.length, oneCellHaloFluids: patchHaloFluids, result: 'REJECTED_RETAINED_WATER_ADJACENCY' },
  },
  z5CurrentScope: {
    owner: 'Raven Rock / Site R (RR-Z5 shaft)',
    condition: 'Existing 2-wide service shaft with previously repaired lighting and return sign; no current defect-backed micro-delta is evidenced.',
    boundary: 'Non-public 2-wide service shaft; not a 3-wide dry public/egress route and not combinable with C2 without one same-moment source and a new owned route design.',
  },
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_PACKAGE_EMITTED',
    exactBlockingCondition: 'The only newest-source dry C2 segment is already-built and terminates at the protected x=-80 containment cap. Its only observed patch-scale gap has retained water in the one-cell halo. Cavern C contains 6,834 fluid cells. RR-Z5 is a separate older 2-wide as-built service scope. Both retained sources lack entities/ and are not a same-moment complete Raven Rock source, so no saved-entity-safe current package can be established.',
    nextPrerequisite: 'A complete fresh Raven Rock capture (region plus entities) covering a proposed independently dry 3-wide route/room, with exact ownership and containment interfaces, before compiling any MP08 operation.',
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  dryApproachStations: drySpine.filter(({ normalWalk }) => normalWalk).length,
  capDrift: capDrift.length,
  c2FluidCells: c2FluidCells.length,
  dryApproachBlockEntities: blockEntities.length,
  rejectedPatchHaloFluids: patchHaloFluids.length,
  c2EntitiesPlane: report.sourceCoverage.newestC2Post.entitiesPresent,
  z5EntitiesPlane: report.sourceCoverage.olderZ5Post.entitiesPresent,
}, null, 2));
