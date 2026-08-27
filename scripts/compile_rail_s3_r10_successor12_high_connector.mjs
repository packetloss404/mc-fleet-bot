#!/usr/bin/env node
/** Source-bound offline compiler for the dry 6×6 Successor-11→12 high connector. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, replLine, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag, fallback = '') => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const snapshot = option('--snapshot'); const routeSurveyPath = option('--route-survey'); const predecessorManifestPath = option('--predecessor-manifest');
const outDir = option('--out-dir', 'data/buildops'); const basename = option('--basename', 'rail-s3-r10-successor12-high-connector');
if (!snapshot || !routeSurveyPath || !predecessorManifestPath) throw new Error('usage: --snapshot <complete snapshot> --route-survey <json> --predecessor-manifest <manifest>');
const ROOT = process.cwd(); const absolute = (filename) => path.resolve(ROOT, filename);
const fail = (condition, message) => { if (condition) throw new Error(`R10 Successor-12 high connector rejected: ${message}`); };
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(!fs.existsSync(path.join(absolute(snapshot), member)), `complete source lacks ${member}`);
const point = (x, y, z) => ({ x, y, z });
const name = (state) => state.split('[', 1)[0];
const fluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(name(state)) || state.includes('waterlogged=true');
const forbidden = new Set(['minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel', 'minecraft:hopper', 'minecraft:spawner', 'minecraft:command_block', 'minecraft:lectern', 'minecraft:beacon', 'minecraft:structure_block', 'minecraft:jigsaw']);
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const parse = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { const terms = line.trim().split(/\s+/); fail(terms.length !== 9 || terms[0] !== 'REPL', `invalid predecessor operation ${line}`); return point(Number(terms[1]), Number(terms[2]), Number(terms[3])); });
const routeSurvey = JSON.parse(fs.readFileSync(absolute(routeSurveyPath), 'utf8'));
fail(routeSurvey.status !== 'ROUTE_GEOMETRY_FOUND_REQUIRES_OWNERSHIP_SET_OUT' || routeSurvey.source !== snapshot, 'route survey is not a passing exact source survey');
const stations = routeSurvey.route.stations;
fail(stations.length !== 32, `station count ${stations.length}`);
for (let index = 1; index < stations.length; index += 1) { const prior = stations[index - 1]; const current = stations[index]; const delta = Math.abs(current.x - prior.x) + Math.abs(current.y - prior.y) + Math.abs(current.z - prior.z); fail(delta !== 1, `non-adjacent station ${index}`); if (current.y !== prior.y) fail(index > 1 && stations[index - 2].y !== prior.y, `consecutive vertical station ${index}`); }
const cellsFor = (station, halo) => { const cells = []; for (let x = station.x - halo; x <= station.x + 5 + halo; x += 1) for (let y = station.y - halo; y <= station.y + 5 + halo; y += 1) for (let z = station.z - halo; z <= station.z + 5 + halo; z += 1) cells.push(point(x, y, z)); return cells; };
const union = (groups) => { const result = new Map(); for (const group of groups) for (const cell of group) result.set(cellKey(cell), cell); return result; };
const coreMap = union(stations.map((station) => cellsFor(station, 0)));
const envelopeMap = union(stations.map((station) => cellsFor(station, 1)));
const shellMap = new Map([...envelopeMap].filter(([id]) => !coreMap.has(id)));
const haloMap = new Map([...union(stations.map((station) => cellsFor(station, 2)))].filter(([id]) => !coreMap.has(id) && !shellMap.has(id)));
const core = [...coreMap.values()]; const shell = [...shellMap.values()]; const halo = [...haloMap.values()];
const predecessor = JSON.parse(fs.readFileSync(absolute(predecessorManifestPath), 'utf8'));
const predecessorTargets = new Set(predecessor.stages.flatMap(({ forward }) => parse(forward)).map(cellKey));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region')); const entityReader = new AnvilReader(path.join(absolute(snapshot), 'entities')); const cache = new Map();
const stateAt = async (cell) => { const id = cellKey(cell); if (!cache.has(id)) cache.set(id, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z))); return cache.get(id); };
const coreRecords = []; const corePdsMigration = [];
for (const cell of core) { const from = await stateAt(cell); fail(fluid(from) || from === 'minecraft:gravel' || forbidden.has(name(from)), `unsafe core ${cellKey(cell)}=${from}`); if (from === 'minecraft:polished_deepslate') { fail(!predecessorTargets.has(cellKey(cell)), `unowned core PDS ${cellKey(cell)}`); corePdsMigration.push(cell); } if (from !== 'minecraft:air') coreRecords.push({ point: cell, from, to: 'minecraft:air' }); }
const shellRecords = []; const shellPdsPreserved = [];
for (const cell of shell) { const from = await stateAt(cell); fail(fluid(from) || from === 'minecraft:gravel' || forbidden.has(name(from)), `unsafe shell ${cellKey(cell)}=${from}`); if (from === 'minecraft:polished_deepslate') { fail(!predecessorTargets.has(cellKey(cell)), `unowned shell PDS ${cellKey(cell)}`); shellPdsPreserved.push(cell); } else shellRecords.push({ point: cell, from, to: 'minecraft:polished_deepslate' }); }
const haloRecords = []; for (const cell of halo) haloRecords.push({ point: cell, state: await stateAt(cell) });
const interaction = [...core, ...shell, ...halo]; const interactionKeys = new Set(interaction.map(cellKey)); const savedEntities = [];
for (const chunkKey of new Set(interaction.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))) { const [x, z] = chunkKey.split(',').map(Number); const chunk = await entityReader.chunk(x, z); for (const entity of chunk?.Entities ?? []) { if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue; const [entityX, entityY, entityZ] = entity.Pos.map(Number); if (interactionKeys.has(cellKey(point(Math.floor(entityX), Math.floor(entityY), Math.floor(entityZ))))) savedEntities.push({ id: entity.id ?? entity.Id ?? null, position: [entityX, entityY, entityZ] }); } }
fail(savedEntities.length !== 0, `saved movable entities ${JSON.stringify(savedEntities)}`);
const emit = (id, records, compare) => { const ordered = records.slice().sort(compare); const forwardBody = `${ordered.map(({ point: cell, from, to }) => replLine(cell, from, to)).join('\n')}\n`; const rollbackBody = `${ordered.slice().reverse().map(({ point: cell, from, to }) => replLine(cell, to, from)).join('\n')}\n`; const forward = `${outDir}/${basename}.${id}.forward.txt`; const rollback = `${outDir}/${basename}.${id}.rollback.txt`; fs.writeFileSync(absolute(forward), forwardBody); fs.writeFileSync(absolute(rollback), rollbackBody); return { id, forward, rollback, count: ordered.length, sha256: sha256(forwardBody), rollbackSha256: sha256(rollbackBody), exactInverse: true }; };
fs.mkdirSync(absolute(outDir), { recursive: true });
const stages = [emit('connector-shell', shellRecords, (a, b) => a.point.y - b.point.y || a.point.x - b.point.x || a.point.z - b.point.z), emit('connector-core-top-down', coreRecords, (a, b) => b.point.y - a.point.y || a.point.x - b.point.x || a.point.z - b.point.z)];
const manifest = { schemaVersion: 1, transactionId: basename, status: 'COMPILED_OFFLINE_R10_SUCCESSOR12_HIGH_CONNECTOR_AWAITING_FRESH_KERNEL', source: { snapshot, routeSurveyPath, completeSaveCaptureManifestSha256: sha256(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))) }, route: { stations, stationCoordinateSetSha256: hashCells(stations), gradeRule: 'maximum 1:1; no consecutive vertical moves', entry: stations[0], exit: stations.at(-1) }, geometry: { core: { count: core.length, coordinateSetSha256: hashCells(core), expected: 'minecraft:air' }, shell: { count: shell.length, mutableCount: shellRecords.length, coordinateSetSha256: hashCells(shell), expected: 'minecraft:polished_deepslate' }, halo: { count: halo.length, coordinateSetSha256: hashCells(halo), exactStates: haloRecords } }, ownership: { predecessor: { manifest: predecessorManifestPath, corePdsMigration: { count: corePdsMigration.length, coordinateSetSha256: hashCells(corePdsMigration) }, shellPdsPreserved: { count: shellPdsPreserved.length, coordinateSetSha256: hashCells(shellPdsPreserved) }, unownedPds: 0 } }, interfaces: { savedEntityCount: 0, savedEntities, interactionCellCount: interaction.length }, stages, exactInverse: true, civilOnly: true, routeCommissioned: false, passengerServiceCommissioned: false, safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false } };
manifest.manifestIdentity = sha256(JSON.stringify(manifest)); const manifestPath = `${outDir}/${basename}.manifest.json`; fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ status: manifest.status, manifest: manifestPath, route: { stations: stations.length, core: core.length, shell: shell.length, halo: halo.length }, stages: Object.fromEntries(stages.map(({ id, count }) => [id, count])), ownership: manifest.ownership.predecessor, manifestIdentity: manifest.manifestIdentity }, null, 2));
