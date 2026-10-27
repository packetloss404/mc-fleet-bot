#!/usr/bin/env node
/**
 * Offline-only compiler for the first dry direct successor to the accepted
 * High-14 exterior band.  It has one declared predecessor interface: the
 * exterior-band end panel at z=-481.  It never contacts the live world.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const arg = (flag, fallback = '') => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : fallback;
};
const snapshot = arg('--snapshot');
const exteriorPath = arg('--exterior-manifest');
const high15Path = arg('--high15-manifest');
const high14Path = arg('--high14-manifest');
const high13Path = arg('--high13-manifest');
const cobaltPath = arg('--cobalt-manifest');
const outDir = arg('--out-dir', 'data/buildops');
const reviewDir = arg('--review-dir', 'data/world-review/rail-r10-high14-exterior-successor-static-20260826T121500Z');
const basename = arg('--basename', 'rail-r10-high14-exterior-successor-static-20260826T121500Z');
if (!snapshot || !exteriorPath || !high15Path || !high14Path || !high13Path || !cobaltPath) {
  throw new Error('usage: --snapshot <complete-post> --exterior-manifest <manifest> --high15-manifest <manifest> --high14-manifest <manifest> --high13-manifest <manifest> --cobalt-manifest <manifest> [--out-dir <dir> --review-dir <dir> --basename <name>]');
}

const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  return cells;
};
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const union = (...sets) => [...new Map(sets.flat().map((cell) => [cellKey(cell), cell])).values()];
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(blockName(state));
const forbiddenContainerCapable = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const fail = (condition, message) => { if (condition) throw new Error(`High-14 exterior successor rejected: ${message}`); };
const writeJson = (filename, value) => fs.writeFileSync(absolute(filename), `${JSON.stringify(value, null, 2)}\n`);

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(absolute(snapshot), member)), `source lacks ${member}`);
fs.mkdirSync(absolute(outDir), { recursive: true });
fs.mkdirSync(absolute(reviewDir), { recursive: true });

const parseManifestOperations = (manifestPath) => {
  const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
  const operations = [];
  for (const stage of manifest.stages ?? manifest.packages ?? []) {
    for (const line of fs.readFileSync(absolute(stage.forward), 'utf8').split(/\r?\n/).filter((entry) => entry && !entry.startsWith('#'))) {
      const terms = line.trim().split(/\s+/);
      fail(terms.length !== 9 || terms[0] !== 'REPL', `invalid predecessor operation in ${stage.forward}`);
      operations.push({ point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[7], to: terms[8], stage: stage.id, manifestPath });
    }
  }
  return operations;
};
const byPoint = (operations) => new Map(operations.map((operation) => [cellKey(operation.point), operation]));
const exteriorByKey = byPoint(parseManifestOperations(exteriorPath));
const high15ByKey = byPoint(parseManifestOperations(high15Path));
const high14ByKey = byPoint(parseManifestOperations(high14Path));
const high13ByKey = byPoint(parseManifestOperations(high13Path));
const cobaltByKey = byPoint(parseManifestOperations(cobaltPath));

const core = box(point(-240, 54, -490), point(-235, 59, -481));
const coreKeys = new Set(core.map(cellKey));
const shell = union(...core.map((cell) => directions.map(([dx, dy, dz]) => point(cell.x + dx, cell.y + dy, cell.z + dz)).filter((other) => !coreKeys.has(cellKey(other)))));
const shellKeys = new Set(shell.map(cellKey));
const halo = union(...shell.map((cell) => directions.map(([dx, dy, dz]) => point(cell.x + dx, cell.y + dy, cell.z + dz)).filter((other) => !coreKeys.has(cellKey(other)) && !shellKeys.has(cellKey(other)))));
const ingress = box(point(-240, 54, -480), point(-235, 59, -480));
const expectedMigration = box(point(-240, 54, -481), point(-235, 59, -481));
const preservedHaloAir = box(point(-240, 54, -479), point(-235, 59, -479));
fail(core.length !== 360 || shell.length !== 312 || halo.length !== 400, `geometry count ${core.length}/${shell.length}/${halo.length}`);
fail(hashCells(core) !== 'c12357ffe58a9dbf6802d0926b726c48c8cabfd8dc98c763c5e622c81e94f8a9', 'core geometry hash drift');
fail(hashCells(shell) !== '0c770be7b24edce22731351d9476bfcb5ed4430a362c1b41218ce121219d953c', 'shell geometry hash drift');
fail(hashCells(halo) !== 'ef344efd31014271a61c80cc1a0be15d98ee6ce4fa1f6a94a05f5e908ad55097', 'halo geometry hash drift');
fail(hashCells(ingress) !== 'f4da3a01066cc4c1340d880b6a27f651204408e0ef6e1b0f4d3038ca16812fa1', 'ingress geometry hash drift');
fail(hashCells(expectedMigration) !== 'a92da07473ed53fe7b2d8153c317c07c3fd1c67dd594824ced244a7a57b9c9fd', 'migration geometry hash drift');

const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entitiesReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};
const statesFor = async (cells) => Promise.all(cells.map(async (cell) => ({ point: cell, state: await stateAt(cell) })));
const [coreStates, shellStates, haloStates, ingressStates] = await Promise.all([statesFor(core), statesFor(shell), statesFor(halo), statesFor(ingress)]);
const interaction = union(core, shell, halo);
const interactionKeys = new Set(interaction.map(cellKey));
const allStates = [...coreStates, ...shellStates, ...haloStates];

for (const [label, map] of Object.entries({ high15: high15ByKey, high14: high14ByKey, high13: high13ByKey, cobalt: cobaltByKey })) fail(interaction.some((cell) => map.has(cellKey(cell))), `${label} protected/predecessor overlap`);
fail(allStates.some(({ state }) => isFluid(state)), 'fluid in core/shell/halo');
fail(allStates.some(({ state }) => isGravity(state)), 'gravity block in core/shell/halo');
fail(allStates.some(({ state }) => forbiddenContainerCapable.has(blockName(state))), 'container-capable source state in core/shell/halo');
fail(ingressStates.some(({ state }) => state !== 'minecraft:air'), 'ingress is not exactly current air');

const migration = coreStates.filter(({ point: cell }) => exteriorByKey.has(cellKey(cell)));
const migrationKeys = new Set(migration.map(({ point: cell }) => cellKey(cell)));
const expectedMigrationKeys = new Set(expectedMigration.map(cellKey));
fail(migration.length !== 36 || migration.some(({ point: cell, state }) => !expectedMigrationKeys.has(cellKey(cell)) || state !== 'minecraft:polished_deepslate' || exteriorByKey.get(cellKey(cell)).to !== 'minecraft:polished_deepslate'), 'migration is not the exact exterior-band 36-cell PDS panel');
fail(expectedMigration.some((cell) => !migrationKeys.has(cellKey(cell))), 'migration omits an expected panel cell');
fail(coreStates.some(({ point: cell, state }) => state === 'minecraft:air' || (exteriorByKey.has(cellKey(cell)) && !migrationKeys.has(cellKey(cell)))), 'core has unowned air or undeclared inherited overlap');

const inheritedOutsideMigration = [...shellStates, ...haloStates].filter(({ point: cell }) => exteriorByKey.has(cellKey(cell)));
const inheritedAir = inheritedOutsideMigration.filter(({ state }) => state === 'minecraft:air');
const shellAir = shellStates.filter(({ point: cell, state }) => state === 'minecraft:air' && exteriorByKey.has(cellKey(cell)));
const haloAir = haloStates.filter(({ point: cell, state }) => state === 'minecraft:air' && exteriorByKey.has(cellKey(cell)));
const haloPds = haloStates.filter(({ point: cell, state }) => state === 'minecraft:polished_deepslate' && exteriorByKey.has(cellKey(cell)));
const unownedAir = allStates.filter(({ point: cell, state }) => state === 'minecraft:air' && !exteriorByKey.has(cellKey(cell)));
fail(unownedAir.length !== 0, `unowned source air ${unownedAir.length}`);
fail(inheritedAir.length !== 72 || shellAir.length !== 36 || haloAir.length !== 36, `inherited route-air split ${inheritedAir.length}/${shellAir.length}/${haloAir.length}`);
fail(hashCells(shellAir.map(({ point: cell }) => cell)) !== hashCells(ingress), 'shell inherited-air ingress drift');
fail(hashCells(haloAir.map(({ point: cell }) => cell)) !== hashCells(preservedHaloAir), 'halo inherited-air drift');
fail(haloPds.length !== 24 || haloPds.some(({ point: cell }) => exteriorByKey.get(cellKey(cell)).to !== 'minecraft:polished_deepslate'), `preserved halo PDS ${haloPds.length}`);

const shellRecords = shellStates.filter(({ point: cell, state }) => !exteriorByKey.has(cellKey(cell)) && state !== 'minecraft:polished_deepslate').map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:polished_deepslate' }));
const coreRecords = coreStates.map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:air' }));
const mutationKeys = new Set([...shellRecords, ...coreRecords].map(({ point: cell }) => cellKey(cell)));
fail(shellRecords.length !== 276 || coreRecords.length !== 360 || mutationKeys.size !== 636, `mutable record count ${shellRecords.length}/${coreRecords.length}/${mutationKeys.size}`);
fail(shellRecords.some(({ point: cell }) => exteriorByKey.has(cellKey(cell))), 'would mutate inherited exterior-band shell/halo state');

const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(-241 / 16); chunkX <= Math.floor(-234 / 16); chunkX += 1) for (let chunkZ = Math.floor(-491 / 16); chunkZ <= Math.floor(-480 / 16); chunkZ += 1) {
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell });
  }
  const entityChunk = await entitiesReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? []) {
    const pos = entity.Pos?.slice(0, 3).map(Number);
    if (!pos) continue;
    const cell = point(Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2]));
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell, pos });
  }
}
fail(blockEntities.length !== 0, `block entities in interaction ${blockEntities.length}`);
fail(savedEntities.length !== 0, `saved entities in interaction ${savedEntities.length}`);

const bottomUp = (left, right) => left.point.y - right.point.y || left.point.z - right.point.z || left.point.x - right.point.x;
const topDown = (left, right) => right.point.y - left.point.y || left.point.z - right.point.z || left.point.x - right.point.x;
const emit = (id, records, forwardOrder, rollbackOrder) => {
  const ordered = records.slice().sort(forwardOrder);
  const forwardText = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
  const rollbackText = `${records.slice().sort(rollbackOrder).map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
  const forward = `${outDir}/${basename}.${id}.forward.txt`;
  const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
  fs.writeFileSync(absolute(forward), forwardText);
  fs.writeFileSync(absolute(rollback), rollbackText);
  return { id, forward, rollback, count: ordered.length, sha256: sha(forwardText), rollbackSha256: sha(rollbackText), exactInverse: true };
};
const stages = [
  emit('shell-lock-bottom-up', shellRecords, bottomUp, topDown),
  emit('core-clear-top-down-with-exterior-panel-migration', coreRecords, topDown, bottomUp),
];
const manifest = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high14-exterior-successor-static-design',
  transactionId: basename,
  status: 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  source: { snapshot, completeSaveCaptureManifestSha256: sha(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))), readOnly: true },
  route: { crossSection: '6x6', continuous: true, existingIngress: { cells: ingress, coordinateSetSha256: hashCells(ingress), expected: 'minecraft:air' }, newCore: { cells: core, count: core.length, coordinateSetSha256: hashCells(core) }, continuousIngressAndCore: ingress.length + core.length },
  geometry: { core: { count: core.length, coordinateSetSha256: hashCells(core), expected: 'minecraft:air' }, shell: { count: shell.length, coordinateSetSha256: hashCells(shell), expected: 'minecraft:polished_deepslate', mutableCount: shellRecords.length }, halo: { count: halo.length, coordinateSetSha256: hashCells(halo), exactStates: haloStates } },
  sourceStates: { core: coreStates, shell: shellStates, halo: haloStates },
  ownership: {
    exteriorPath, high15Path, high14Path, high13Path, cobaltPath,
    forbiddenOverlap: { high15: [], high14: [], high13: [], cobalt: [] },
    migration: { count: migration.length, coordinateSetSha256: hashCells(migration.map(({ point: cell }) => cell)), cells: migration, exactPanel: expectedMigration },
    preservedRouteAir: { count: inheritedAir.length, coordinateSetSha256: hashCells(inheritedAir.map(({ point: cell }) => cell)), shellCount: shellAir.length, haloCount: haloAir.length, cells: inheritedAir },
    preservedHaloPds: { count: haloPds.length, coordinateSetSha256: hashCells(haloPds.map(({ point: cell }) => cell)), cells: haloPds },
  },
  hazards: { fluidCount: 0, gravityCount: 0, unownedAir, blockEntities, savedEntities },
  stages,
  exactInverse: true,
  civilOnly: true,
  routeCommissioned: false,
  passengerServiceCommissioned: false,
  safetyBoundary: { noLiveCalls: true, noWorldEdits: true, requiresFreshSnapshotAndLiveEntityClearanceBeforeRelease: true },
};
manifest.manifestIdentity = sha(JSON.stringify(manifest));
const manifestPath = `${outDir}/${basename}.manifest.json`;
writeJson(manifestPath, manifest);
writeJson(`${reviewDir}/static-source-audit.json`, { ...manifest, sourceStates: undefined });
console.log(JSON.stringify({ status: manifest.status, manifestPath, review: `${reviewDir}/static-source-audit.json`, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), geometry: { core: core.length, shell: shell.length, halo: halo.length }, inherited: { migration: migration.length, routeAir: inheritedAir.length, haloPds: haloPds.length }, manifestIdentity: manifest.manifestIdentity }, null, 2));
