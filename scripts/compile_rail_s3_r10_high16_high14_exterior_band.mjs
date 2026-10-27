#!/usr/bin/env node
/**
 * Offline-only compiler for the High-14 exterior-band continuation discovered
 * beside (not through) R10 High-15.  The sole mutable inherited interface is
 * the exact 6x6 PDS panel at z=-461; High-15 is a hard exclusion.
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
const high15Path = arg('--high15-manifest');
const high14Path = arg('--high14-manifest');
const high13Path = arg('--high13-manifest');
const cobaltPath = arg('--cobalt-manifest');
const outDir = arg('--out-dir', 'data/buildops');
const reviewDir = arg('--review-dir', 'data/world-review/rail-r10-high16-high14-exterior-band-static-20260826T112000Z');
const basename = arg('--basename', 'rail-r10-high16-high14-exterior-band-static-20260826T112000Z');
if (!snapshot || !high15Path || !high14Path || !high13Path || !cobaltPath) {
  throw new Error('usage: --snapshot <complete-post> --high15-manifest <manifest> --high14-manifest <manifest> --high13-manifest <manifest> --cobalt-manifest <manifest> [--out-dir <dir> --review-dir <dir> --basename <name>]');
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
const union = (...sets) => [...new Map(sets.flat().map((cell) => [cellKey(cell), cell])).values()];
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(blockName(state));
const forbiddenContainerCapable = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const fail = (condition, message) => {
  if (condition) throw new Error(`High-14 exterior band rejected: ${message}`);
};
const writeJson = (filename, value) => fs.writeFileSync(absolute(filename), `${JSON.stringify(value, null, 2)}\n`);

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  fail(!fs.existsSync(path.join(absolute(snapshot), member)), `source lacks ${member}`);
}
fs.mkdirSync(absolute(outDir), { recursive: true });
fs.mkdirSync(absolute(reviewDir), { recursive: true });

const parseManifestOperations = (manifestPath) => {
  const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
  const operations = [];
  for (const stage of manifest.stages ?? manifest.packages ?? []) {
    for (const line of fs.readFileSync(absolute(stage.forward), 'utf8').split(/\r?\n/).filter((entry) => entry && !entry.startsWith('#'))) {
      const terms = line.trim().split(/\s+/);
      fail(terms.length !== 9 || terms[0] !== 'REPL', `invalid predecessor operation in ${stage.forward}`);
      const cell = point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
      operations.push({ point: cell, from: terms[7], to: terms[8], stage: stage.id, manifestPath });
    }
  }
  return operations;
};
const byPoint = (operations) => new Map(operations.map((operation) => [cellKey(operation.point), operation]));
const high15ByKey = byPoint(parseManifestOperations(high15Path));
const high14ByKey = byPoint(parseManifestOperations(high14Path));
const high13ByKey = byPoint(parseManifestOperations(high13Path));
const cobaltByKey = byPoint(parseManifestOperations(cobaltPath));
const inheritedByKey = new Map([...high14ByKey, ...high13ByKey]);

const core = box(point(-240, 54, -480), point(-235, 59, -461));
const coreKeys = new Set(core.map(cellKey));
const shell = union(...core.map((cell) => directions.map(([dx, dy, dz]) => point(cell.x + dx, cell.y + dy, cell.z + dz)).filter((other) => !coreKeys.has(cellKey(other)))));
const shellKeys = new Set(shell.map(cellKey));
const halo = union(...shell.map((cell) => directions.map(([dx, dy, dz]) => point(cell.x + dx, cell.y + dy, cell.z + dz)).filter((other) => !coreKeys.has(cellKey(other)) && !shellKeys.has(cellKey(other)))));
const ingress = box(point(-240, 54, -460), point(-235, 59, -460));
const expectedMigration = box(point(-240, 54, -461), point(-235, 59, -461));
fail(core.length !== 720 || shell.length !== 552 || halo.length !== 680, `geometry count ${core.length}/${shell.length}/${halo.length}`);
fail(hashCells(core) !== 'fdc690ad837ee632a63e0883783591aab45a6e5f9511f7083389f31d596fda25', 'core geometry hash drift');
fail(hashCells(shell) !== '3f42d626c30ecaca4114a9ba90873f7bd583d70bc667cfaec7d2c7a4b5d16bfd', 'shell geometry hash drift');
fail(hashCells(halo) !== 'f0451967f419adc5b048f89a56247d29bc43ca323907b5d1fbdcff2845405eb1', 'halo geometry hash drift');
fail(hashCells(expectedMigration) !== '583301bf20df99b9459187862bbc0bdb78cc26578110bc3e1e7afbd659440faa', 'migration geometry hash drift');

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

const high15Overlap = interaction.filter((cell) => high15ByKey.has(cellKey(cell)));
const cobaltOverlap = interaction.filter((cell) => cobaltByKey.has(cellKey(cell)));
fail(high15Overlap.length !== 0, `High-15 overlap ${high15Overlap.length}`);
fail(cobaltOverlap.length !== 0, `Cobalt protected overlap ${cobaltOverlap.length}`);
const allStates = [...coreStates, ...shellStates, ...haloStates];
fail(allStates.some(({ state }) => isFluid(state)), 'fluid in core/shell/halo');
fail(allStates.some(({ state }) => isGravity(state)), 'gravity block in core/shell/halo');
fail(allStates.some(({ state }) => forbiddenContainerCapable.has(blockName(state))), 'container-capable source state in core/shell/halo');
fail(ingressStates.some(({ state }) => state !== 'minecraft:air'), 'High-14 ingress is not exactly current air');

const migration = coreStates.filter(({ point: cell }) => inheritedByKey.has(cellKey(cell)));
const migrationKeys = new Set(migration.map(({ point: cell }) => cellKey(cell)));
const expectedMigrationKeys = new Set(expectedMigration.map(cellKey));
fail(migration.length !== 36 || migration.some(({ point: cell, state }) => !expectedMigrationKeys.has(cellKey(cell)) || state !== 'minecraft:polished_deepslate'), 'migration is not the exact 36-cell PDS panel');
fail(expectedMigration.some((cell) => !migrationKeys.has(cellKey(cell))), 'migration omits an expected panel cell');
const high14Migration = migration.filter(({ point: cell }) => high14ByKey.has(cellKey(cell)));
const high13Migration = migration.filter(({ point: cell }) => high13ByKey.has(cellKey(cell)) && !high14ByKey.has(cellKey(cell)));
fail(high14Migration.length !== 30 || high13Migration.length !== 6, `migration owner split ${high14Migration.length}/${high13Migration.length}`);
fail(coreStates.some(({ point: cell, state }) => state === 'minecraft:air' || (inheritedByKey.has(cellKey(cell)) && !migrationKeys.has(cellKey(cell)))), 'core has unowned air or undeclared inherited overlap');

const inheritedOutsideMigration = [...shellStates, ...haloStates].filter(({ point: cell }) => inheritedByKey.has(cellKey(cell)));
const inheritedRouteAir = inheritedOutsideMigration.filter(({ state }) => state === 'minecraft:air');
const unownedAir = [...shellStates, ...haloStates].filter(({ point: cell, state }) => state === 'minecraft:air' && !inheritedByKey.has(cellKey(cell)));
fail(unownedAir.length !== 0, `unowned source air ${unownedAir.length}`);
fail(inheritedRouteAir.length !== 84, `inherited route-air count ${inheritedRouteAir.length}`);
const inheritedRouteAirKeys = new Set(inheritedRouteAir.map(({ point: cell }) => cellKey(cell)));
const shellRouteAir = shellStates.filter(({ point: cell, state }) => state === 'minecraft:air' && inheritedRouteAirKeys.has(cellKey(cell)));
const haloRouteAir = haloStates.filter(({ point: cell, state }) => state === 'minecraft:air' && inheritedRouteAirKeys.has(cellKey(cell)));
fail(shellRouteAir.length !== 36 || haloRouteAir.length !== 48, `route-air shell/halo split ${shellRouteAir.length}/${haloRouteAir.length}`);

const shellRecords = shellStates.filter(({ point: cell, state }) => !inheritedByKey.has(cellKey(cell)) && state !== 'minecraft:polished_deepslate').map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:polished_deepslate' }));
const coreRecords = coreStates.map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:air' }));
const mutationKeys = new Set([...shellRecords, ...coreRecords].map(({ point: cell }) => cellKey(cell)));
fail(mutationKeys.size !== shellRecords.length + coreRecords.length, 'duplicate mutable target');
fail(shellRecords.some(({ point: cell }) => inheritedByKey.has(cellKey(cell))), 'would mutate an inherited shell/halo cell');
fail(coreRecords.some(({ point: cell }) => inheritedByKey.has(cellKey(cell)) && !migrationKeys.has(cellKey(cell))), 'would mutate undeclared inherited core cell');

const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(-241 / 16); chunkX <= Math.floor(-234 / 16); chunkX += 1) for (let chunkZ = Math.floor(-481 / 16); chunkZ <= Math.floor(-460 / 16); chunkZ += 1) {
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
  emit('core-clear-top-down-with-high14-high13-panel-migration', coreRecords, topDown, bottomUp),
];
const sourceStates = { core: coreStates, shell: shellStates, halo: haloStates };
const manifest = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high16-high14-exterior-band-static-design',
  transactionId: basename,
  status: 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  source: { snapshot, completeSaveCaptureManifestSha256: sha(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))), readOnly: true },
  route: { crossSection: '6x6', continuous: true, existingIngress: { cells: ingress, coordinateSetSha256: hashCells(ingress), expected: 'minecraft:air' }, newCore: { cells: core, count: core.length, coordinateSetSha256: hashCells(core) } },
  geometry: { core: { count: core.length, coordinateSetSha256: hashCells(core), expected: 'minecraft:air' }, shell: { count: shell.length, coordinateSetSha256: hashCells(shell), expected: 'minecraft:polished_deepslate', mutableCount: shellRecords.length }, halo: { count: halo.length, coordinateSetSha256: hashCells(halo), exactStates: haloStates } },
  sourceStates,
  ownership: {
    high15Path,
    high14Path,
    high13Path,
    cobaltPath,
    high15Overlap,
    cobaltOverlap,
    migration: { count: migration.length, coordinateSetSha256: hashCells(migration.map(({ point: cell }) => cell)), cells: migration, high14Count: high14Migration.length, high13Count: high13Migration.length, exactPanel: expectedMigration },
    preservedInherited: { count: inheritedOutsideMigration.length, coordinateSetSha256: hashCells(inheritedOutsideMigration.map(({ point: cell }) => cell)), cells: inheritedOutsideMigration },
    preservedRouteAir: { count: inheritedRouteAir.length, coordinateSetSha256: hashCells(inheritedRouteAir.map(({ point: cell }) => cell)), shellCount: shellRouteAir.length, haloCount: haloRouteAir.length, cells: inheritedRouteAir },
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
console.log(JSON.stringify({ status: manifest.status, manifestPath, review: `${reviewDir}/static-source-audit.json`, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), geometry: { core: core.length, shell: shell.length, halo: halo.length }, migration: { count: migration.length, high14: high14Migration.length, high13: high13Migration.length }, preservedRouteAir: inheritedRouteAir.length, manifestIdentity: manifest.manifestIdentity }, null, 2));
