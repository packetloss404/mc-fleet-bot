#!/usr/bin/env node
/**
 * Direct, deterministic compiler for the R10 West High Successor-10 dry
 * civil envelope. It is deliberately source-bound and does not invoke a
 * prior compiler through source rewriting or a data URL.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  replLine,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const snapshot = option('--snapshot');
const outDir = option('--out-dir', 'data/buildops');
const basename = option('--basename', 'rail-s3-r10-west-high-successor-10');
const predecessorManifestPath = option(
  '--predecessor-manifest',
  'data/buildops/rail-s3-r10-west-high-successor-09.manifest.json',
);
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const fail = (condition, message) => {
  if (condition) throw new Error(`R10 West High Successor-10 rejected: ${message}`);
};

fail(!snapshot, '--snapshot is required');
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(!fs.existsSync(path.join(absolute(snapshot), member)), `complete source lacks ${member}`);
}

const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) {
    for (let y = min.y; y <= max.y; y += 1) {
      for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
    }
  }
  return cells;
};
const stateName = (state) => state.split('[', 1)[0];
const fluid = (state) => (
  stateName(state) === 'minecraft:water'
  || stateName(state) === 'minecraft:lava'
  || stateName(state) === 'minecraft:bubble_column'
  || state.includes('waterlogged=true')
);
const forbidden = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block',
  'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const parseOperations = (filename) => fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/)
  .filter((line) => line && !line.startsWith('#'))
  .map((line) => {
    const terms = line.trim().split(/\s+/);
    fail(terms.length !== 9 || terms[0] !== 'REPL', `invalid predecessor operation: ${line}`);
    return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
  });

const reader = new AnvilReader(absolute(path.join(snapshot, 'region')));
const entityReader = new AnvilReader(absolute(path.join(snapshot, 'entities')));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) {
    stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return stateCache.get(key);
};

const predecessorManifest = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
fail(!Array.isArray(predecessorManifest.stages), 'predecessor lacks stages');
const predecessorTargets = new Set(predecessorManifest.stages
  .flatMap(({ forward }) => parseOperations(forward))
  .map(cellKey));

/* Successor-10 continues Successor-09 west by exactly one 20×6×6 core.
 * The shared face is predecessor-owned: its 56 shell cells must be PDS and
 * are a preservation interface, never a target in this package. */
const core = box(point(-174, 42, -472), point(-155, 47, -467));
const coreKeys = new Set(core.map(cellKey));
const envelope = box(point(-175, 41, -473), point(-154, 48, -466));
const shell = envelope.filter((cell) => !coreKeys.has(cellKey(cell)) && (
  cell.y === 41 || cell.y === 48 || cell.z === -473 || cell.z === -466
));
const shellKeys = new Set(shell.map(cellKey));
fail(core.length !== 720, `core cardinality ${core.length}, expected 720`);
fail(shell.length !== 616, `shell surface cardinality ${shell.length}, expected 616`);

const shellRecords = [];
const predecessorShellPds = [];
for (const cell of shell) {
  const from = await stateAt(cell);
  if (predecessorTargets.has(cellKey(cell))) {
    fail(from !== 'minecraft:polished_deepslate', `predecessor seam ${cellKey(cell)}=${from}`);
    predecessorShellPds.push(cell);
    continue;
  }
  fail(fluid(from), `fluid in shell target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:gravel', `gravity block in shell target ${cellKey(cell)}`);
  fail(forbidden.has(stateName(from)), `protected/container state in shell target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:polished_deepslate', `unowned polished-deepslate shell state ${cellKey(cell)}`);
  shellRecords.push({ point: cell, from, to: 'minecraft:polished_deepslate' });
}
fail(predecessorShellPds.length !== 56, `predecessor shell PDS ${predecessorShellPds.length}, expected 56`);
fail(shellRecords.length !== 560, `mutable shell ${shellRecords.length}, expected 560`);

const coreRecords = [];
for (const cell of core) {
  const from = await stateAt(cell);
  fail(fluid(from), `fluid in core target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:gravel', `gravity block in core target ${cellKey(cell)}`);
  fail(forbidden.has(stateName(from)), `protected/container state in core target ${cellKey(cell)}=${from}`);
  fail(from === 'minecraft:polished_deepslate', `unowned polished-deepslate core state ${cellKey(cell)}`);
  fail(from === 'minecraft:air', `core target already air; exact 720-cell successor is no longer current at ${cellKey(cell)}`);
  coreRecords.push({ point: cell, from, to: 'minecraft:air' });
}
fail(coreRecords.length !== 720, `mutable core ${coreRecords.length}, expected 720`);

/* Preserve the exact outer halo and classify predecessor-owned PDS separately
 * from any local material. This is the corrected 56/28/100/0/0 contract. */
const halo = [];
for (const cell of box(point(-176, 40, -474), point(-153, 49, -465))) {
  if (!coreKeys.has(cellKey(cell)) && !shellKeys.has(cellKey(cell))) {
    halo.push({ point: cell, state: await stateAt(cell) });
  }
}
const haloPds = halo.filter(({ state }) => state === 'minecraft:polished_deepslate');
const predecessorHaloInterface = halo.filter(({ point: cell }) => predecessorTargets.has(cellKey(cell)));
const localPds = haloPds.filter(({ point: cell }) => !predecessorTargets.has(cellKey(cell)));
const haloGravel = halo.filter(({ state }) => state === 'minecraft:gravel');
fail(halo.some(({ state }) => fluid(state)), 'fluid in preserved halo');
fail(halo.length !== 1064, `halo cardinality ${halo.length}, expected 1064`);
fail(haloPds.length !== 28, `halo PDS ${haloPds.length}, expected 28`);
fail(predecessorHaloInterface.length !== 100, `predecessor halo interface ${predecessorHaloInterface.length}, expected 100`);
fail(localPds.length !== 0, `local halo PDS ${localPds.length}, expected 0`);
fail(haloGravel.length !== 0, `halo gravel ${haloGravel.length}, expected 0 in the verified Successor-10 halo`);

/* A complete capture also supplies a persisted movable-entity plane.  It is
 * distinct from the immediate live gate, but both must be clear: no parked
 * entity may be silently accepted simply because the block source is clean. */
const interaction = [...core, ...shell, ...halo];
const interactionKeys = new Set(interaction.map(cellKey));
const entityChunks = [...new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
const savedEntities = [];
for (const chunkKey of entityChunks) {
  const [x, z] = chunkKey.split(',').map(Number);
  const chunk = await entityReader.chunk(x, z);
  for (const entity of chunk?.Entities ?? []) {
    if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
    const [entityX, entityY, entityZ] = entity.Pos.map(Number);
    const cell = point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ));
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({
      id: entity.id ?? entity.Id ?? null,
      position: [entityX, entityY, entityZ],
    });
  }
}
fail(savedEntities.length !== 0, `saved movable entities in target/halo: ${JSON.stringify(savedEntities)}`);

const emit = (id, records) => {
  const ordered = records.slice().sort((left, right) => (
    left.point.x - right.point.x || left.point.y - right.point.y || left.point.z - right.point.z
  ));
  const forwardBody = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
  const rollbackBody = `${ordered.slice().reverse()
    .map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
  const forward = `${outDir}/${basename}.${id}.forward.txt`;
  const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(absolute(forward), forwardBody);
  fs.writeFileSync(absolute(rollback), rollbackBody);
  return {
    id,
    forward,
    rollback,
    count: ordered.length,
    sha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    exactInverse: true,
  };
};

fs.mkdirSync(absolute(outDir), { recursive: true });
const stages = [emit('external-shell', shellRecords), emit('core-clear', coreRecords)];
const manifest = {
  schemaVersion: 1,
  transactionId: basename,
  status: 'COMPILED_OFFLINE_R10_WEST_HIGH_SUCCESSOR10_AWAITING_STATIC_GATES',
  source: {
    snapshot,
    completeSaveCaptureManifestSha256: sha256(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))),
    verifiedCleanSource: true,
  },
  geometry: {
    core: {
      bounds: { x: [-174, -155], y: [42, 47], z: [-472, -467] },
      count: 720,
      expected: 'minecraft:air',
      coordinateSetSha256: hashCells(core),
    },
    shell: {
      surfaceCount: 616,
      mutableCount: 560,
      expected: 'minecraft:polished_deepslate',
      coordinateSetSha256: hashCells(shell),
    },
  },
  ownership: {
    predecessor: {
      manifest: predecessorManifestPath,
      shellPds: { count: 56, coordinateSetSha256: hashCells(predecessorShellPds), immutable: true },
      haloPds: { count: 28, coordinateSetSha256: hashCells(haloPds.map(({ point: cell }) => cell)), immutable: true },
      haloInterface: { count: 100, coordinateSetSha256: hashCells(predecessorHaloInterface.map(({ point: cell }) => cell)), immutable: true },
      localPds: { count: 0, coordinateSetSha256: hashCells([]) },
      pdsMigration: { count: 0, coordinateSetSha256: hashCells([]) },
      preservationContract: '56/28/100/0/0',
    },
  },
  gravity: {
    preservedHalo: {
      count: 1064,
      gravelCount: 0,
      coordinateSetSha256: hashCells(halo.map(({ point: cell }) => cell)),
      exactStates: halo,
    },
  },
  interfaces: {
    savedEntityCount: savedEntities.length,
    savedEntities,
    targetAndHaloCellCount: interaction.length,
  },
  stages,
  exactInverse: true,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
manifest.manifestIdentity = sha256(JSON.stringify(manifest));
const manifestPath = `${outDir}/${basename}.manifest.json`;
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  source: snapshot,
  manifest: manifestPath,
  stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])),
  preservationContract: manifest.ownership.predecessor.preservationContract,
  haloGravel: manifest.gravity.preservedHalo.gravelCount,
  manifestIdentity: manifest.manifestIdentity,
}, null, 2));
