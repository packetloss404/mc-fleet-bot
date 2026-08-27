#!/usr/bin/env node
/**
 * Compile MP07-RRMSA-NARROW4-HEADROOM-REPAIR-01 offline only.
 *
 * CIRC-RRCH-MSA-WIDEN-01 cleared the feet block at (-80,65,-79), but
 * retained its polished-andesite head block.  That leaves the MainStreet
 * gateway throat one normal-walk column short despite the released floor
 * clearance.  This package clears only that exact retained head block.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  AnvilReader, boundsOf, cellKey, hashCells, replLine, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-rrch-library-stair-repair-post-20260826T112133Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp07-rrmsa-narrow4-headroom-repair-01-static-20260826T112133Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T11:30:00Z');
const RELEASE_ID = 'MP07-RRMSA-NARROW4-HEADROOM-REPAIR-01';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`${RELEASE_ID} rejected: ${message}`); };
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding']);
const PROTECTED = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:chain_command_block', 'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw', 'minecraft:blast_furnace', 'minecraft:furnace', 'minecraft:smoker']);
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isProtected = (state) => PROTECTED.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
const manifestCells = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const snapshotRoot = absolute(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(fs.existsSync(path.join(snapshotRoot, member)), `complete immutable source missing ${member}`);
}
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
fail(capture.immutableCopy === true, 'source capture is not immutable');
const reader = new AnvilReader(path.join(snapshotRoot, 'region'));
const entityReader = new AnvilReader(path.join(snapshotRoot, 'entities'));
const sourceAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const target = { x: -80, y: 66, z: -79 };
const targetState = 'minecraft:air';
const sourceState = await sourceAt(target);
fail(sourceState === 'minecraft:polished_andesite', `exact source at ${cellKey(target)} is ${sourceState}`);
fail(!isFluid(sourceState) && !isGravity(sourceState) && !isProtected(sourceState), 'target is not an ordinary structural head block');
const targetKeys = new Set([cellKey(target)]);
const halo = uniqueCells(Array.from({ length: 3 }, (_, dx) => dx - 1).flatMap((dx) => (
  Array.from({ length: 3 }, (_, dy) => dy - 1).flatMap((dy) => (
    Array.from({ length: 3 }, (_, dz) => dz - 1).map((dz) => ({ x: target.x + dx, y: target.y + dy, z: target.z + dz }))
  ))
))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of halo) haloRecords.push({ cell, state: await sourceAt(cell) });
const hazards = haloRecords.filter(({ state }) => isFluid(state) || isGravity(state) || isProtected(state));
fail(hazards.length === 0, `fluid/gravity/protected state in 26-cell halo: ${JSON.stringify(hazards)}`);

const interaction = [target, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const chunkKeys = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const blockEntities = [];
const savedEntities = [];
for (const key of chunkKeys) {
  const [x, z] = key.split(',').map(Number);
  const blockChunk = await reader.chunk(x, z);
  for (const entity of blockChunk?.block_entities ?? blockChunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(x, z);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const position = entity.Pos.slice(0, 3).map(Number);
    const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0, `entity intersection ${JSON.stringify({ blockEntities, savedEntities })}`);

const normalColumns = [{ x: -81, y: 65, z: -79 }, { x: -80, y: 65, z: -79 }, { x: -79, y: 65, z: -79 }];
const normalWalk = [];
for (const feetCell of normalColumns) {
  const feet = cellKey(feetCell) === cellKey(target) ? targetState : await sourceAt(feetCell);
  const headCell = { x: feetCell.x, y: feetCell.y + 1, z: feetCell.z };
  const head = cellKey(headCell) === cellKey(target) ? targetState : await sourceAt(headCell);
  const support = await sourceAt({ x: feetCell.x, y: feetCell.y - 1, z: feetCell.z });
  const passable = (state) => AIR.has(stateName(state));
  normalWalk.push({ feetCell, feet, head, support, standable: passable(feet) && passable(head) && !isFluid(support) && !isGravity(support) && !AIR.has(stateName(support)) });
}
fail(normalWalk.every((entry) => entry.standable), `projected three-wide normal-walk throat failed: ${JSON.stringify(normalWalk)}`);

const forwardBody = `${replLine(target, sourceState, targetState)}\n`;
const rollbackBody = `${replLine(target, targetState, sourceState)}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const forward = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollback = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const header = (direction, hash) => [`# GENERATED FILE — ${RELEASE_ID} (${direction})`, `# immutable offline source: ${relative(SNAPSHOT)}`, '# NOT AUTHORIZED FOR EXECUTION: fresh same-moment source and complete guarded kernel required.', `# operation SHA-256: ${hash}`].join('\n');
fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollback), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
const base = {
  schemaVersion: 1, releaseId: RELEASE_ID, transactionId: 'mp07-rrmsa-narrow4-headroom-repair-01', generatedAtUtc: GENERATED_AT,
  status: 'STATIC_READY_FROM_COMPLETE_POST_SNAPSHOT_AWAITING_FRESH_LIVE_KERNEL',
  packages: [{ key: 'narrow4-headroom', forward: relative(forward), rollback: relative(rollback) }],
  executionOrder: { forward: ['narrow4-headroom'], rollback: ['narrow4-headroom'] },
  source: { snapshotRoot: relative(SNAPSHOT), captureManifest: relative(capturePath), captureManifestSha256: sha256(fs.readFileSync(capturePath)), completePlanes: ['region', 'entities', 'poi', 'level.dat'] },
  ownership: { owner: 'mainstreet-america / Ravensreach-MainStreet civic commute', predecessorRelease: 'CIRC-RRCH-MSA-WIDEN-01', scope: 'the remaining one-cell headroom omission in its NARROW-4 gateway throat', excluded: ['the retained gateway cap at y=67+', 'the C02 masonry facade at x=-78+', 'the blast furnace at (-76,65,-77)', 'all other route and building fabric'] },
  target: { cells: manifestCells([target]), sourceState, targetState, interactionHalo: manifestCells(halo), exactInverse: true },
  offlineSafety: { targetFluidGravityProtectedCount: 0, haloFluidGravityProtectedCount: 0, storedBlockEntityIntersectionCount: 0, savedEntityIntersectionCount: 0, liveCallsPerformed: false, worldEditsPerformed: false },
  functionalAcceptance: { type: 'projected three-adjacent-column normal-walk throat', columns: normalWalk, passed: true, limitations: 'This proves the local three-column throat only; post-release route QA must prove the full bidirectional commute.' },
  operations: { forward: { path: relative(forward), sha256: forwardSha256, commandCount: 1 }, rollback: { path: relative(rollback), sha256: rollbackSha256, commandCount: 1 } },
  executionAuthority: { authorizedByThisArtifact: false, requiredBeforeExecution: ['fresh immutable source immediately before execution', 'fresh target/halo protected-core and block-entity check', 'fresh live-entity clearance', 'strict-noop parser checks', 'exact source and projected rollback preflight', 'journalled strict execution', 'fresh complete post snapshot and rollback preflight', 'independent full bidirectional commute QA'] },
};
const manifest = { ...base, manifestIdentity: sha256(`${JSON.stringify(base, null, 2)}\n`) };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, releaseId: RELEASE_ID, forward: relative(forward), rollback: relative(rollback), manifest: relative(manifestPath), target, manifestIdentity: manifest.manifestIdentity, liveCallsPerformed: false, worldEditsPerformed: false }, null, 2));
