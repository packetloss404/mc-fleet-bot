#!/usr/bin/env node
/**
 * Compile MP10-RRCH-LIBRARY-STAIR-HEADROOM-REPAIR-01.
 *
 * The accepted two-wide library stair is present, but five retained legacy
 * treads occupy the headroom of the otherwise-correct spiral.  That makes the
 * six-level route descend-only at five transitions.  This compiler clears
 * only those exact stale treads and restores the missing two-cell B3 landing.
 * It is offline-only: a fresh same-moment source and full live kernel remain
 * mandatory before a physical release.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp08-rr-t1b-wayfinding-post-20260826T104858Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = value('--basename', 'mp10-rrch-library-stair-headroom-repair-01-static-20260826T104858Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T10:49:30Z');
const ROUTE_QA_OUT = value('--route-qa-out', `data/world-review/${BASENAME}.route-qa.json`);
const RELEASE_ID = 'MP10-RRCH-LIBRARY-STAIR-HEADROOM-REPAIR-01';
const TRANSACTION_ID = 'mp10-rrch-library-stair-headroom-repair-01';
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const fail = (condition, message) => {
  if (!condition) throw new Error(`${RELEASE_ID} compiler rejected: ${message}`);
};
const stateName = (state) => state.split('[', 1)[0];
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil',
  'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:dragon_egg',
  'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const BLOCK_ENTITY = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:lectern',
  'minecraft:chiseled_bookshelf', 'minecraft:hopper', 'minecraft:dispenser',
  'minecraft:dropper', 'minecraft:beacon', 'minecraft:spawner', 'minecraft:command_block',
  'minecraft:structure_block', 'minecraft:jigsaw',
]);
const isFluid = (state) => FLUID.has(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isBlockEntity = (state) => BLOCK_ENTITY.has(stateName(state)) || stateName(state).endsWith('_shulker_box');
const classManifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};

const requiredSource = [
  { cell: { x: -119, y: 46, z: -442 }, sourceState: 'minecraft:air', targetState: 'minecraft:polished_andesite', role: 'B3 landing west' },
  { cell: { x: -118, y: 46, z: -442 }, sourceState: 'minecraft:air', targetState: 'minecraft:polished_andesite', role: 'B3 landing east' },
  ...[47, 55, 63, 71, 79].map((y) => ({
    cell: { x: -118, y, z: -443 },
    sourceState: 'minecraft:polished_andesite_stairs[facing=north,half=bottom,shape=straight,waterlogged=false]',
    targetState: 'minecraft:air',
    role: 'stale headroom tread',
  })),
];
const targetKeys = new Set(requiredSource.map(({ cell }) => cellKey(cell)));
fail(targetKeys.size === requiredSource.length, 'duplicate target coordinate');
for (const { cell } of requiredSource) {
  fail(cell.x >= -120 && cell.x <= -114 && cell.y >= 44 && cell.y <= 84 && cell.z >= -445 && cell.z <= -439,
    `target outside owned library stair core: ${cellKey(cell)}`);
}

const snapshotRoot = absolute(SNAPSHOT);
const regionRoot = path.join(snapshotRoot, 'region');
const entitiesRoot = path.join(snapshotRoot, 'entities');
fail(fs.existsSync(regionRoot), `missing immutable region plane: ${relative(regionRoot)}`);
fail(fs.existsSync(entitiesRoot), `missing immutable entities plane: ${relative(entitiesRoot)}`);
const capturePath = path.join(snapshotRoot, 'combined-zones-complete-save-capture.json');
fail(fs.existsSync(capturePath), `missing complete-save capture manifest: ${relative(capturePath)}`);
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const reader = new AnvilReader(regionRoot);
const entityReader = new AnvilReader(entitiesRoot);
const sourceAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));

const records = [];
for (const expected of requiredSource) {
  const actual = await sourceAt(expected.cell);
  fail(actual === expected.sourceState,
    `exact source drift at ${cellKey(expected.cell)}: expected ${expected.sourceState}; got ${actual}`);
  fail(!isFluid(actual) && !isGravity(actual) && !isBlockEntity(actual),
    `target has fluid/gravity/container/control state: ${cellKey(expected.cell)} = ${actual}`);
  records.push({ ...expected, actualSourceState: actual });
}

const halo = uniqueCells(records.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
  }
  return cells;
})).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloStates = [];
for (const cell of halo) haloStates.push({ cell, state: await sourceAt(cell) });
const hazardHalo = haloStates.filter(({ state }) => isFluid(state) || isGravity(state) || isBlockEntity(state));
fail(hazardHalo.length === 0, `fluid/gravity/container/control in target halo: ${JSON.stringify(hazardHalo)}`);

const interaction = uniqueCells([...records.map(({ cell }) => cell), ...halo]);
const interactionKeys = new Set(interaction.map(cellKey));
const chunkKeys = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const storedBlockEntities = [];
const savedEntities = [];
for (const chunkKey of chunkKeys) {
  const [cx, cz] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (interactionKeys.has(cellKey(cell))) storedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const position = entity.Pos.slice(0, 3).map(Number);
    const cell = { x: Math.floor(position[0]), y: Math.floor(position[1]), z: Math.floor(position[2]) };
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
  }
}
fail(storedBlockEntities.length === 0, `stored block entity in interaction envelope: ${JSON.stringify(storedBlockEntities)}`);
fail(savedEntities.length === 0, `saved entity in interaction envelope: ${JSON.stringify(savedEntities)}`);

const ordered = records.slice().sort((a, b) => a.cell.y - b.cell.y || a.cell.z - b.cell.z || a.cell.x - b.cell.x);
const reverse = ordered.slice().reverse().map(({ cell, sourceState, targetState, role }) => ({
  cell, sourceState: targetState, targetState: sourceState, role,
}));
const forwardBody = `${ordered.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const rollbackBody = `${reverse.map(({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState)).join('\n')}\n`;
const forwardSha256 = sha256(forwardBody);
const rollbackSha256 = sha256(rollbackBody);
const forwardPath = path.join(OUT_DIR, `${BASENAME}.forward.txt`);
const rollbackPath = path.join(OUT_DIR, `${BASENAME}.rollback.txt`);
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const header = (role, hash) => [
  `# GENERATED FILE — ${RELEASE_ID} (${role})`,
  `# immutable offline source: ${relative(SNAPSHOT)}`,
  '# NOT AUTHORIZED FOR EXECUTION: fresh same-moment complete source and full guarded kernel required.',
  `# operation SHA-256: ${hash}`,
].join('\n');
fs.writeFileSync(absolute(forwardPath), `${header('forward', forwardSha256)}\n${forwardBody}`);
fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);

const routeQa = spawnSync(process.execPath, [
  path.resolve(ROOT, 'scripts/qa_ravensreach_ladderless_wave3.mjs'),
  '--regions', relative(path.join(SNAPSHOT, 'region')),
  '--ops', relative(forwardPath),
  '--out', relative(ROUTE_QA_OUT),
], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
if (routeQa.status !== 0) {
  throw new Error(`${RELEASE_ID} compiler rejected projected route QA:\n${routeQa.stdout}\n${routeQa.stderr}`);
}
const routeQaJson = JSON.parse(fs.readFileSync(absolute(ROUTE_QA_OUT), 'utf8'));
fail(routeQaJson.total === 7 && routeQaJson.passed === 7 && routeQaJson.failed === 0,
  `projected route acceptance failed: ${JSON.stringify({ total: routeQaJson.total, passed: routeQaJson.passed, failed: routeQaJson.failed })}`);

const sourceCounts = Object.fromEntries([...new Map(records.map(({ sourceState }) => [sourceState, 0]))].map(([state]) => [
  state, records.filter((record) => record.sourceState === state).length,
]));
const manifestBase = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  releaseId: RELEASE_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'STATIC_READY_FROM_COMPLETE_POST_SNAPSHOT_AWAITING_FRESH_LIVE_KERNEL',
  source: {
    snapshotRoot: relative(SNAPSHOT),
    captureManifest: relative(capturePath),
    captureManifestSha256: sha256(fs.readFileSync(capturePath)),
    completePlanes: ['region', 'entities', 'poi', 'level.dat'],
  },
  ownership: {
    owner: 'RAVENSREACH / RRCH-LIBRARY stair core',
    ownedCore: { minX: -120, maxX: -114, minY: 44, maxY: 84, minZ: -445, maxZ: -439 },
    excluded: ['library room programme outside core', 'all containers and block entities', 'building envelope'],
  },
  target: {
    cells: classManifest(records.map(({ cell }) => cell)),
    sourceStateCensus: sourceCounts,
    roles: {
      landing: classManifest(records.filter(({ role }) => role.startsWith('B3')).map(({ cell }) => cell)),
      staleHeadroomTreads: classManifest(records.filter(({ role }) => role === 'stale headroom tread').map(({ cell }) => cell)),
    },
    interactionHalo: classManifest(halo),
    exactInverse: true,
  },
  offlineSafety: {
    targetFluidGravityContainerControlCount: 0,
    haloFluidGravityContainerControlCount: 0,
    storedBlockEntityIntersectionCount: 0,
    savedEntityIntersectionCount: 0,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  functionalAcceptance: {
    qa: relative(ROUTE_QA_OUT),
    qaSha256: sha256(fs.readFileSync(absolute(ROUTE_QA_OUT))),
    standard: 'normal walking only; bidirectional; no jump, sprint, dig, swim, or climb',
    routeSuites: 7,
    passed: 7,
  },
  operations: {
    forward: { path: relative(forwardPath), sha256: forwardSha256, commandCount: ordered.length },
    rollback: { path: relative(rollbackPath), sha256: rollbackSha256, commandCount: reverse.length },
  },
  executionAuthority: {
    authorizedByThisArtifact: false,
    requiredBeforeExecution: [
      'fresh immutable source snapshot immediately before execution',
      'fresh target/halo block-entity and protected-core clearance',
      'fresh live-entity clearance',
      'strict-noop forward and rollback parser checks',
      'exact source and projected-rollback preflight',
      'journalled strict execution',
      'fresh complete post snapshot',
      'rollback post-state preflight',
      'independent post-release bidirectional route QA',
    ],
  },
};
const manifest = { ...manifestBase, manifestIdentity: sha256(`${JSON.stringify(manifestBase, null, 2)}\n`) };
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  releaseId: RELEASE_ID,
  forward: relative(forwardPath),
  rollback: relative(rollbackPath),
  manifest: relative(manifestPath),
  routeQa: relative(ROUTE_QA_OUT),
  targetCount: records.length,
  manifestIdentity: manifest.manifestIdentity,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
