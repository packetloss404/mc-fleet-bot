#!/usr/bin/env node
/** Read-only exact dry north-bypass setout around the Westlight headhouse. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const option = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const snapshot = option('--snapshot');
const high14ManifestPath = option('--high14-manifest');
const hydrologyPath = option('--hydrology');
const out = option('--out');
if (!snapshot || !high14ManifestPath || !hydrologyPath || !out) throw new Error('usage: --snapshot <post> --high14-manifest <manifest> --hydrology <analysis> --out <json>');
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  return cells;
};
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const parseOps = (filename) => fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
  const terms = line.trim().split(/\s+/);
  if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
  return point(Number(terms[1]), Number(terms[2]), Number(terms[3]));
});
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
const high14 = readJson(high14ManifestPath);
const high14Targets = new Set(high14.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const high13ManifestPath = high14.ownership.predecessor.manifest;
const high13 = readJson(high13ManifestPath);
const high13Targets = new Set(high13.stages.flatMap(({ forward }) => parseOps(forward)).map(cellKey));
const inheritedTargets = new Set([...high14Targets, ...high13Targets]);
const hydrology = readJson(hydrologyPath);
const fluidComponent = new Set(hydrology.components.flatMap(({ cells }) => cells.map(({ point: cell }) => cellKey(cell))));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const core = [
  ...box(point(-240, 54, -460), point(-235, 59, -430)),
  ...box(point(-274, 54, -435), point(-241, 59, -430)),
];
const coreKeys = new Set(core.map(cellKey));
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const shellByKey = new Map();
for (const cell of core) for (const [dx, dy, dz] of directions) {
  const neighbour = point(cell.x + dx, cell.y + dy, cell.z + dz);
  if (!coreKeys.has(cellKey(neighbour))) shellByKey.set(cellKey(neighbour), neighbour);
}
const shell = [...shellByKey.values()];
const shellKeys = new Set(shell.map(cellKey));
const haloByKey = new Map();
for (const cell of shell) for (const [dx, dy, dz] of directions) {
  const neighbour = point(cell.x + dx, cell.y + dy, cell.z + dz);
  if (!coreKeys.has(cellKey(neighbour)) && !shellKeys.has(cellKey(neighbour))) haloByKey.set(cellKey(neighbour), neighbour);
}
const halo = [...haloByKey.values()];
const headhouse = (cell) => cell.x >= -253 && cell.x <= -246 && cell.y >= 17 && cell.y <= 67 && cell.z >= -447 && cell.z <= -438;
const census = async (cells) => {
  const states = {};
  const result = { count: cells.length, coordinateSetSha256: hashCells(cells), fluid: [], gravel: [], pds: [], high14Targets: [], headhouseOverlap: [], fluidComponentOverlap: [], states };
  for (const cell of cells) {
    const state = await stateAt(cell);
    states[state] = (states[state] ?? 0) + 1;
    if (isFluid(state)) result.fluid.push({ point: cell, state });
    if (state === 'minecraft:gravel') result.gravel.push({ point: cell, state });
    if (state === 'minecraft:polished_deepslate') result.pds.push({ point: cell, state });
    if (high14Targets.has(cellKey(cell))) result.high14Targets.push({ point: cell, state });
    if (headhouse(cell)) result.headhouseOverlap.push(cell);
    if (fluidComponent.has(cellKey(cell))) result.fluidComponentOverlap.push(cell);
  }
  return result;
};
const [coreCensus, shellCensus, haloCensus] = await Promise.all([census(core), census(shell), census(halo)]);
const migration = coreCensus.pds.filter(({ point: cell }) => inheritedTargets.has(cellKey(cell)));
const high14Migration = migration.filter(({ point: cell }) => high14Targets.has(cellKey(cell)));
const high13Migration = migration.filter(({ point: cell }) => !high14Targets.has(cellKey(cell)) && high13Targets.has(cellKey(cell)));
const checks = {
  continuousSixBySixRoute: core.length === 2340,
  canonicalDryCoreShellHalo: coreCensus.fluid.length === 0 && shellCensus.fluid.length === 0 && haloCensus.fluid.length === 0,
  noHeadhouseInteractionOverlap: coreCensus.headhouseOverlap.length === 0 && shellCensus.headhouseOverlap.length === 0 && haloCensus.headhouseOverlap.length === 0,
  noKnown5512FluidComponentOverlap: coreCensus.fluidComponentOverlap.length === 0 && shellCensus.fluidComponentOverlap.length === 0 && haloCensus.fluidComponentOverlap.length === 0,
  exactKnownMigration: migration.length === 36 && high14Migration.length === 30 && high13Migration.length === 6,
};
const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high15-north-bypass-current-post-survey',
  status: failures.length === 0 ? 'STATIC_DRY_BYPASS_CANDIDATE_REQUIRES_GRAVITY_INTERFACE_COMPILER' : 'REJECTED_SURVEY',
  source: { snapshot, completeSaveCaptureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))).digest('hex') },
  geometry: {
    route: { crossSection: '6x6', y: [54, 59], ingress: { x: [-240, -235], z: [-460, -430] }, westbound: { x: [-274, -241], z: [-435, -430] }, existingHigh14Ingress: { x: [-240, -235], z: [-460, -455], count: 216 } },
    core: coreCensus,
    shell: shellCensus,
    halo: haloCensus,
  },
  interfaces: { high14Manifest: high14ManifestPath, high13Manifest: high13ManifestPath, coreMigration: { count: migration.length, coordinateSetSha256: hashCells(migration), high14: { count: high14Migration.length, coordinateSetSha256: hashCells(high14Migration.map(({ point: cell }) => cell)) }, high13Inherited: { count: high13Migration.length, coordinateSetSha256: hashCells(high13Migration.map(({ point: cell }) => cell)) }, cells: migration, role: 'open only the exact inherited south-shell panel after replacement-shell/inverse design' }, headhouseInteractionEnvelope: { x: [-253, -246], y: [17, 67], z: [-447, -438], overlaps: 0 }, fluidComponent: { source: hydrologyPath, overlaps: 0 } },
  checks,
  failures,
  decision: failures.length === 0 ? 'Dry disjoint alignment found; direct High-15 remains held. This bypass needs a gravity-safe shell/core compiler and an exact 36-cell predecessor-shell migration/replacement contract before any capture.' : 'No safe candidate on this exact geometry.',
  readOnly: true,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ status: result.status, core: { count: coreCensus.count, hash: coreCensus.coordinateSetSha256, fluid: coreCensus.fluid.length, gravel: coreCensus.gravel.length }, shell: { count: shellCensus.count, hash: shellCensus.coordinateSetSha256, fluid: shellCensus.fluid.length, gravel: shellCensus.gravel.length }, halo: { count: haloCensus.count, hash: haloCensus.coordinateSetSha256, fluid: haloCensus.fluid.length, gravel: haloCensus.gravel.length }, migration: migration.length, checks, failures }, null, 2));
