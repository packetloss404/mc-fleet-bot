#!/usr/bin/env node
/**
 * Offline-only design compiler for the R10 High-16 descending bypass.
 *
 * This deliberately emits no operation files unless the complete saved source
 * proves every ownership, air/fluid, entity, and gravity condition.  It is not
 * a release runner: it never contacts the world or RCON.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const arg = (flag, fallback = '') => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
};
const snapshot = arg('--snapshot');
const predecessorPath = arg('--predecessor-manifest');
const protectedPath = arg('--protected-manifest');
const outDir = arg('--out-dir', 'data/buildops');
const reviewDir = arg('--review-dir', 'data/world-review/rail-r10-high16-descending-bypass-static-20260826T100000Z');
const basename = arg('--basename', 'rail-r10-high16-descending-bypass-static-20260826T100000Z');
if (!snapshot || !predecessorPath || !protectedPath) {
  throw new Error('usage: --snapshot <complete-post> --predecessor-manifest <High-15> --protected-manifest <Cobalt-WL> [--out-dir] [--review-dir] [--basename]');
}

const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const blockName = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(blockName(state));
const FORBIDDEN_BLOCK_ENTITIES = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];

const box = (origin) => {
  const cells = [];
  for (let x = origin.x; x < origin.x + 6; x += 1) for (let y = origin.y; y < origin.y + 6; y += 1) for (let z = origin.z; z < origin.z + 6; z += 1) cells.push(point(x, y, z));
  return cells;
};
const union = (...sets) => {
  const byKey = new Map();
  for (const set of sets) for (const cell of set) byKey.set(cellKey(cell), cell);
  return [...byKey.values()];
};
const envelope = (core) => {
  const coreKeys = new Set(core.map(cellKey));
  const shellByKey = new Map();
  for (const cell of core) for (const [dx, dy, dz] of directions) {
    const other = point(cell.x + dx, cell.y + dy, cell.z + dz);
    if (!coreKeys.has(cellKey(other))) shellByKey.set(cellKey(other), other);
  }
  const shell = [...shellByKey.values()];
  const shellKeys = new Set(shell.map(cellKey));
  const haloByKey = new Map();
  for (const cell of shell) for (const [dx, dy, dz] of directions) {
    const other = point(cell.x + dx, cell.y + dy, cell.z + dz);
    if (!coreKeys.has(cellKey(other)) && !shellKeys.has(cellKey(other))) haloByKey.set(cellKey(other), other);
  }
  return { shell, halo: [...haloByKey.values()] };
};
const bounds = (cells) => ({
  x: [Math.min(...cells.map(({ x }) => x)), Math.max(...cells.map(({ x }) => x))],
  y: [Math.min(...cells.map(({ y }) => y)), Math.max(...cells.map(({ y }) => y))],
  z: [Math.min(...cells.map(({ z }) => z)), Math.max(...cells.map(({ z }) => z))],
});
const parseOperations = (manifestPath) => {
  const manifest = JSON.parse(fs.readFileSync(absolute(manifestPath), 'utf8'));
  const stages = manifest.stages ?? manifest.packages ?? [];
  return stages.flatMap(({ forward }) => fs.readFileSync(absolute(forward), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid predecessor operation: ${line}`);
    return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), from: terms[4], to: terms[8] };
  }));
};
const writeJson = (filename, value) => fs.writeFileSync(absolute(filename), `${JSON.stringify(value, null, 2)}\n`);

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
fs.mkdirSync(absolute(outDir), { recursive: true });
fs.mkdirSync(absolute(reviewDir), { recursive: true });

// Each next station overlaps its predecessor by at least a 5x5x5 volume.
// The first station reuses the already-air High-15 route as a bounded ingress.
const stations = [
  [-275, 49, -435], [-276, 48, -436], [-277, 47, -437], [-278, 46, -438], [-279, 45, -439], [-280, 44, -440],
  [-281, 43, -441], [-282, 42, -442], [-283, 41, -443], [-284, 40, -444], [-285, 39, -445], [-286, 38, -445],
  [-287, 37, -446], [-288, 36, -446], [-289, 35, -446], [-290, 34, -446], [-291, 34, -447], [-292, 34, -448],
  [-293, 34, -449], [-294, 34, -450], [-295, 34, -451], [-296, 34, -452], [-297, 34, -453], [-298, 34, -454],
  [-299, 34, -455], [-300, 34, -456], [-301, 34, -457], [-302, 34, -458], [-303, 34, -459], [-304, 34, -460],
  [-305, 34, -461], [-306, 34, -462], [-307, 34, -463], [-308, 34, -464], [-309, 34, -464], [-310, 34, -464],
  [-311, 34, -464], [-312, 34, -465], [-313, 34, -466], [-314, 34, -467], [-315, 34, -468], [-316, 34, -468],
  [-317, 34, -467], [-318, 34, -466], [-319, 34, -466], [-320, 34, -466],
].map(([x, y, z], index) => ({ id: `S${String(index + 1).padStart(2, '0')}`, origin: point(x, y, z) }));
const stationContinuity = stations.slice(1).map((station, index) => {
  const prior = stations[index].origin;
  const dx = station.origin.x - prior.x;
  const dy = station.origin.y - prior.y;
  const dz = station.origin.z - prior.z;
  return { from: stations[index].id, to: station.id, dx, dy, dz, continuous: dx === -1 && Math.abs(dy) <= 1 && Math.abs(dz) <= 1 };
});
const core = union(...stations.map(({ origin }) => box(origin)));
const { shell, halo } = envelope(core);
const allCells = union(core, shell, halo);
const coreKeys = new Set(core.map(cellKey));
const shellKeys = new Set(shell.map(cellKey));

const predecessorOps = parseOperations(predecessorPath);
const predecessorByKey = new Map(predecessorOps.map((operation) => [cellKey(operation.point), operation]));
const protectedOps = parseOperations(protectedPath);
const protectedKeys = new Set(protectedOps.map(({ point: cell }) => cellKey(cell)));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entitiesReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};
const statesFor = async (cells) => Promise.all(cells.map(async (cell) => ({ point: cell, state: await stateAt(cell) })));
const [coreStates, shellStates, haloStates] = await Promise.all([statesFor(core), statesFor(shell), statesFor(halo)]);
const sourceByKey = new Map([...coreStates, ...shellStates, ...haloStates].map((entry) => [cellKey(entry.point), entry.state]));
const failures = [];
const require = (condition, message) => { if (!condition) failures.push(message); };
require(stations.length === 46, `station count ${stations.length} != 46`);
require(stationContinuity.every(({ continuous }) => continuous), 'station sequence has a non-continuous grade step');
require(core.length > 0 && shell.length > 0 && halo.length > 0, 'empty geometry');

const protectedOverlap = allCells.filter((cell) => protectedKeys.has(cellKey(cell)));
const fluids = [...coreStates, ...shellStates, ...haloStates].filter(({ state }) => isFluid(state));
const air = [...coreStates, ...shellStates, ...haloStates].filter(({ state }) => state === 'minecraft:air');
const unknownAir = air.filter(({ point: cell }) => !predecessorByKey.has(cellKey(cell)));
const forbiddenStateCells = [...coreStates, ...shellStates].filter(({ state }) => FORBIDDEN_BLOCK_ENTITIES.has(blockName(state)));
require(protectedOverlap.length === 0, `protected target overlap ${protectedOverlap.length}`);
require(fluids.length === 0, `fluid in full envelope ${fluids.length}`);
require(unknownAir.length === 0, `unowned air in full envelope ${unknownAir.length}`);
require(forbiddenStateCells.length === 0, `protected/block-entity-capable source state ${forbiddenStateCells.length}`);

const coreOwners = coreStates.filter(({ point: cell }) => predecessorByKey.has(cellKey(cell)));
const shellOwners = shellStates.filter(({ point: cell }) => predecessorByKey.has(cellKey(cell)));
const haloOwners = haloStates.filter(({ point: cell }) => predecessorByKey.has(cellKey(cell)));
const coreOwnedNonAir = coreOwners.filter(({ state }) => state !== 'minecraft:air');
const shellOwnedAir = shellOwners.filter(({ state }) => state === 'minecraft:air');
const migration = coreOwnedNonAir.map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:air' }));
require(migration.length === 36 && migration.every(({ from }) => from === 'minecraft:polished_deepslate'), `High-15 migration contract is not the exact 36-cell PDS opening (${migration.length})`);
// These are the existing High-15 upper-route air cells.  They are preserved,
// not sealed, and are deliberately excluded from the shell operation.
require(shellOwnedAir.length === 36, `High-15 preserved-air interface is not the exact 36-cell set (${shellOwnedAir.length})`);

const shellRecords = shellStates.filter(({ point: cell, state }) => !predecessorByKey.has(cellKey(cell)) && state !== 'minecraft:polished_deepslate').map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:polished_deepslate' }));
const coreRecords = [
  ...coreStates.filter(({ point: cell, state }) => !predecessorByKey.has(cellKey(cell)) && state !== 'minecraft:air').map(({ point: cell, state: from }) => ({ point: cell, from, to: 'minecraft:air' })),
  ...migration,
];
const unownedCoreAir = coreStates.filter(({ point: cell, state }) => !predecessorByKey.has(cellKey(cell)) && state === 'minecraft:air');
require(unownedCoreAir.length === 0, `unowned pre-existing air in core ${unownedCoreAir.length}`);

const allGravel = [...coreStates, ...shellStates, ...haloStates].filter(({ state }) => isGravity(state));
const classifyGravity = (cell) => coreKeys.has(cellKey(cell)) ? 'core-target' : shellKeys.has(cellKey(cell)) ? 'shell-target' : 'halo-preserved';
const shellRecordKeys = new Set(shellRecords.map(({ point: cell }) => cellKey(cell)));
const gravityChains = [];
for (const { point: target, state } of allGravel) {
  const cells = [];
  let terminal = null;
  for (let y = target.y - 1; y >= -64; y -= 1) {
    const cell = point(target.x, y, target.z);
    const below = await stateAt(cell);
    cells.push({ point: cell, state: below, inCore: coreKeys.has(cellKey(cell)), inShell: shellKeys.has(cellKey(cell)) });
    if (isGravity(below)) continue;
    terminal = { point: cell, state: below, inCore: coreKeys.has(cellKey(cell)), inShell: shellKeys.has(cellKey(cell)) };
    break;
  }
  const kind = classifyGravity(target);
  const staticSupport = Boolean(terminal) && terminal.state !== 'minecraft:air' && !isFluid(terminal.state);
  // A halo gravel chain may originally terminate in a cell the core will
  // clear.  It remains safe only when the earlier shell stage replaces a
  // lower chain cell with non-gravity PDS, before core clearing begins.
  const shellStageSupport = cells.find(({ point: cell }) => shellRecordKeys.has(cellKey(cell))) ?? null;
  const preservedWillRemainSupported = kind !== 'halo-preserved' || (staticSupport && (!terminal.inCore || shellStageSupport !== null));
  gravityChains.push({ target, state, kind, cells, terminal, staticSupport, shellStageSupport, preservedWillRemainSupported });
}
require(gravityChains.length === 107, `gravity-chain count ${gravityChains.length} != 107`);
require(gravityChains.every(({ staticSupport, preservedWillRemainSupported }) => staticSupport && preservedWillRemainSupported), 'one or more gravity chains lacks stable source/forward support');

const interactionKeys = new Set(allCells.map(cellKey));
const blockEntities = [];
const savedEntities = [];
const interactionBounds = bounds(allCells);
for (let cx = Math.floor(interactionBounds.x[0] / 16); cx <= Math.floor(interactionBounds.x[1] / 16); cx += 1) for (let cz = Math.floor(interactionBounds.z[0] / 16); cz <= Math.floor(interactionBounds.z[1] / 16); cz += 1) {
  const regionChunk = await reader.chunk(cx, cz);
  for (const entity of regionChunk?.block_entities ?? regionChunk?.blockEntities ?? []) {
    const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
    if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell });
  }
  const entityChunk = await entitiesReader.chunk(cx, cz);
  for (const entity of entityChunk?.Entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (!position) continue;
    const cell = point(Math.floor(position[0]), Math.floor(position[1]), Math.floor(position[2]));
    if (interactionKeys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, point: cell, pos: position });
  }
}
require(blockEntities.length === 0, `block entities in interaction envelope ${blockEntities.length}`);
require(savedEntities.length === 0, `saved entities in interaction envelope ${savedEntities.length}`);

const ingressCells = coreOwners.filter(({ state }) => state === 'minecraft:air').map(({ point: cell }) => cell);
const ingress = { count: ingressCells.length, coordinateSetSha256: hashCells(ingressCells), cells: ingressCells, predecessorManifest: predecessorPath, role: 'reused High-15 current-air ingress only; never a new target' };
const preliminary = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high16-descending-bypass-static-design',
  status: failures.length ? 'HOLD__NO_OPERATIONS_EMITTED' : 'COMPILED_OFFLINE_AWAITING_FRESH_RELEASE_KERNEL',
  source: { snapshot, completeSaveCaptureManifestSha256: sha(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))), readOnly: true },
  route: { stations, stationContinuity, crossSection: '6x6', continuous: stationContinuity.every(({ continuous }) => continuous), core: { count: core.length, coordinateSetSha256: hashCells(core), bounds: bounds(core) } },
  geometry: { shell: { count: shell.length, coordinateSetSha256: hashCells(shell), bounds: bounds(shell) }, halo: { count: halo.length, coordinateSetSha256: hashCells(halo), bounds: bounds(halo) }, interaction: { count: allCells.length, coordinateSetSha256: hashCells(allCells), bounds: bounds(allCells) } },
  sourceStates: { core: coreStates, shell: shellStates, halo: haloStates },
  ownership: { predecessorPath, predecessorTargetCount: predecessorByKey.size, ingress, migration: { count: migration.length, coordinateSetSha256: hashCells(migration.map(({ point: cell }) => cell)), cells: migration, role: 'exact High-15 floor/west-shell opening after new shell lock' }, preservedHigh15RouteAir: { count: shellOwnedAir.length, coordinateSetSha256: hashCells(shellOwnedAir.map(({ point: cell }) => cell)), cells: shellOwnedAir.map(({ point: cell }) => cell) }, coreOwners: { count: coreOwners.length, coordinateSetSha256: hashCells(coreOwners.map(({ point: cell }) => cell)) }, shellOwners: { count: shellOwners.length, coordinateSetSha256: hashCells(shellOwners.map(({ point: cell }) => cell)) }, haloOwners: { count: haloOwners.length, coordinateSetSha256: hashCells(haloOwners.map(({ point: cell }) => cell)) }, protectedPath, protectedTargetCount: protectedKeys.size, protectedOverlap },
  hazards: { fluids, air, unknownAir, forbiddenStateCells, gravityChains, blockEntities, savedEntities },
  proposedOrder: { forward: ['shell-gravity-lock bottom-up', 'core-clear top-down'], rollback: ['core-restore bottom-up', 'shell-restore bottom-up'], rationale: 'The shell is locked below-to-above before any core clearing; gravel is restored below-to-above on rollback. Preserved halo gravity never loses a core support cell.' },
  failures,
  civilOnly: true,
  passengerServiceCommissioned: false,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};

if (failures.length) {
  writeJson(`${reviewDir}/design-hold.json`, preliminary);
  console.log(JSON.stringify({ status: preliminary.status, failures, hold: `${reviewDir}/design-hold.json` }, null, 2));
  process.exitCode = 2;
} else {
  const orderBottomUp = (a, b) => a.point.y - b.point.y || a.point.x - b.point.x || a.point.z - b.point.z;
  const orderTopDown = (a, b) => b.point.y - a.point.y || a.point.x - b.point.x || a.point.z - b.point.z;
  const emit = (id, records, forwardOrder, rollbackOrder) => {
    const ordered = records.slice().sort(forwardOrder);
    const rollbackRecords = records.slice().sort(rollbackOrder);
    const forwardText = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`;
    const rollbackText = `${rollbackRecords.map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`;
    const forward = `${outDir}/${basename}.${id}.forward.txt`;
    const rollback = `${outDir}/${basename}.${id}.rollback.txt`;
    fs.writeFileSync(absolute(forward), forwardText);
    fs.writeFileSync(absolute(rollback), rollbackText);
    return { id, forward, rollback, count: ordered.length, sha256: sha(forwardText), rollbackSha256: sha(rollbackText), exactInverse: true };
  };
  const stages = [
    emit('shell-gravity-lock', shellRecords, orderBottomUp, orderBottomUp),
    emit('core-clear-top-down', coreRecords, orderTopDown, orderBottomUp),
  ];
  const manifest = { ...preliminary, stages, exactInverse: true, manifestIdentity: null };
  manifest.manifestIdentity = sha(JSON.stringify(manifest));
  const manifestPath = `${outDir}/${basename}.manifest.json`;
  writeJson(manifestPath, manifest);
  writeJson(`${reviewDir}/static-design.json`, { ...manifest, sourceStates: undefined });
  console.log(JSON.stringify({ status: manifest.status, manifestPath, review: `${reviewDir}/static-design.json`, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), gravityChains: gravityChains.length, ingress: ingress.count, geometry: { core: core.length, shell: shell.length, halo: halo.length } }, null, 2));
}
