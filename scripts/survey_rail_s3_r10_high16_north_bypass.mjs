#!/usr/bin/env node
/**
 * Read-only grid survey for a dry, civil-only north-alignment bypass beyond
 * R10 High-15. A candidate is deliberately rejected unless its complete
 * core/shell/halo is dry, non-air, non-protected, and has only the exact
 * High-15 west-shell opening as a prior-release interaction.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : '';
};
const snapshot = value('--snapshot');
const predecessorManifestPath = value('--predecessor-manifest');
const protectedManifestPath = value('--protected-manifest');
const out = value('--out');
const mdOut = value('--md-out');
if (!snapshot || !predecessorManifestPath || !protectedManifestPath || !out || !mdOut) {
  throw new Error('usage: --snapshot <post> --predecessor-manifest <High-15 manifest> --protected-manifest <Cobalt WL headhouse manifest> --out <json> --md-out <md>');
}
const ROOT = process.cwd();
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const point = (x, y, z) => ({ x, y, z });
const box = (min, max) => {
  const cells = [];
  for (let x = min.x; x <= max.x; x += 1) for (let y = min.y; y <= max.y; y += 1) for (let z = min.z; z <= max.z; z += 1) cells.push(point(x, y, z));
  return cells;
};
const union = (...sets) => {
  const byKey = new Map();
  for (const cells of sets) for (const cell of cells) byKey.set(cellKey(cell), cell);
  return [...byKey.values()];
};
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(state.split('[', 1)[0]) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand', 'minecraft:concrete_powder'].includes(state.split('[', 1)[0]);
const parseOperations = (manifest) => {
  const stageGroups = manifest.stages ?? manifest.packages ?? [];
  return stageGroups.flatMap(({ forward }) => fs.readFileSync(absolute(forward), 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).map((line) => {
    const terms = line.trim().split(/\s+/);
    if (terms.length !== 9 || terms[0] !== 'REPL') throw new Error(`invalid operation ${line}`);
    return { point: point(Number(terms[1]), Number(terms[2]), Number(terms[3])), to: terms[8] };
  }));
};
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(snapshot), member))) throw new Error(`source lacks ${member}`);
}
const predecessor = readJson(predecessorManifestPath);
const protectedManifest = readJson(protectedManifestPath);
const predecessorTargets = new Set(parseOperations(predecessor).map(({ point: cell }) => cellKey(cell)));
const protectedTargets = new Set(parseOperations(protectedManifest).map(({ point: cell }) => cellKey(cell)));
const approvedMigration = box(point(-275, 54, -435), point(-275, 59, -430));
const approvedMigrationKeys = new Set(approvedMigration.map(cellKey));
// The route already occupies the two cells immediately east of the opened
// west-shell panel.  They are a read-only shared-route observation, not a new
// operation target.  Keeping this window exact avoids labelling the required
// High-15 ingress as an unexplained prior-release collision.
const approvedIngressObservation = box(point(-275, 53, -436), point(-273, 60, -429));
const approvedIngressObservationKeys = new Set(approvedIngressObservation.map(cellKey));
const reader = new AnvilReader(path.join(absolute(snapshot), 'region'));
const entitiesReader = new AnvilReader(path.join(absolute(snapshot), 'entities'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};
const directions = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const shellAndHalo = (core) => {
  const coreKeys = new Set(core.map(cellKey));
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
  return { shell, halo: [...haloByKey.values()] };
};
const bounds = (cells) => ({
  x: [Math.min(...cells.map(({ x }) => x)), Math.max(...cells.map(({ x }) => x))],
  y: [Math.min(...cells.map(({ y }) => y)), Math.max(...cells.map(({ y }) => y))],
  z: [Math.min(...cells.map(({ z }) => z)), Math.max(...cells.map(({ z }) => z))],
});
const entityCensus = async (cells) => {
  const keys = new Set(cells.map(cellKey));
  const b = bounds(cells);
  const blockEntities = [];
  const savedEntities = [];
  for (let cx = Math.floor(b.x[0] / 16); cx <= Math.floor(b.x[1] / 16); cx += 1) for (let cz = Math.floor(b.z[0] / 16); cz <= Math.floor(b.z[1] / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
      if (keys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? null, point: cell });
    }
    const entities = await entitiesReader.chunk(cx, cz);
    for (const entity of entities?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (!position) continue;
      const cell = point(Math.floor(position[0]), Math.floor(position[1]), Math.floor(position[2]));
      if (keys.has(cellKey(cell))) savedEntities.push({ id: entity.id ?? null, point: cell });
    }
  }
  return { blockEntities, savedEntities };
};
const census = async (cells) => {
  const states = {};
  const fluid = []; const air = []; const gravity = []; const predecessorOverlap = []; const protectedOverlap = [];
  for (const cell of cells) {
    const state = await stateAt(cell);
    states[state] = (states[state] ?? 0) + 1;
    if (isFluid(state)) fluid.push({ point: cell, state });
    if (state === 'minecraft:air') air.push({ point: cell, state });
    if (isGravity(state)) gravity.push({ point: cell, state });
    if (predecessorTargets.has(cellKey(cell))) predecessorOverlap.push({ point: cell, state });
    if (protectedTargets.has(cellKey(cell))) protectedOverlap.push({ point: cell, state });
  }
  return { count: cells.length, coordinateSetSha256: hashCells(cells), bounds: bounds(cells), states, fluid, air, gravity, predecessorOverlap, protectedOverlap };
};
const connected = (cells) => {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const seen = new Set([cellKey(cells[0])]);
  const queue = [cells[0]];
  for (let index = 0; index < queue.length; index += 1) for (const [dx, dy, dz] of directions) {
    const current = queue[index];
    const neighbour = byKey.get(cellKey(point(current.x + dx, current.y + dy, current.z + dz)));
    if (neighbour && !seen.has(cellKey(neighbour))) { seen.add(cellKey(neighbour)); queue.push(neighbour); }
  }
  return seen.size === cells.length;
};
const components = (cells) => {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const seen = new Set();
  const out = [];
  for (const root of cells) {
    if (seen.has(cellKey(root))) continue;
    const component = [root];
    seen.add(cellKey(root));
    for (let index = 0; index < component.length; index += 1) for (const [dx, dy, dz] of directions) {
      const current = component[index];
      const neighbour = byKey.get(cellKey(point(current.x + dx, current.y + dy, current.z + dz)));
      if (neighbour && !seen.has(cellKey(neighbour))) { seen.add(cellKey(neighbour)); component.push(neighbour); }
    }
    out.push({ count: component.length, coordinateSetSha256: hashCells(component), cells: component });
  }
  return out.sort((left, right) => right.count - left.count || left.coordinateSetSha256.localeCompare(right.coordinateSetSha256));
};
const candidates = [];
// Both polarities are examined: "north alignment" is a route name, not a license
// to assume Minecraft cardinal direction.  Each route opens High-15's exact west
// shell panel then moves 20 blocks west on a new six-wide z band.
for (let zMin = -486; zMin <= -378; zMin += 1) {
  if (zMin <= -435 && zMin + 5 >= -430) continue;
  const zMax = zMin + 5;
  const connector = box(point(-280, 54, Math.min(-435, zMin)), point(-275, 59, Math.max(-430, zMax)));
  const westbound = box(point(-300, 54, zMin), point(-275, 59, zMax));
  const core = union(connector, westbound);
  const { shell, halo } = shellAndHalo(core);
  const [coreCensus, shellCensus, haloCensus] = await Promise.all([census(core), census(shell), census(halo)]);
  const envelope = union(core, shell, halo);
  const entities = await entityCensus(envelope);
  const predecessorOverlap = union(coreCensus.predecessorOverlap.map(({ point: cell }) => cell), shellCensus.predecessorOverlap.map(({ point: cell }) => cell), haloCensus.predecessorOverlap.map(({ point: cell }) => cell));
  const migration = coreCensus.predecessorOverlap.filter(({ point: cell }) => approvedMigrationKeys.has(cellKey(cell)));
  const ingressObservation = predecessorOverlap.filter((cell) => approvedIngressObservationKeys.has(cellKey(cell)));
  const unexpectedPredecessor = predecessorOverlap.filter((cell) => !approvedIngressObservationKeys.has(cellKey(cell)));
  const unexpectedAir = union(coreCensus.air.map(({ point: cell }) => cell), shellCensus.air.map(({ point: cell }) => cell), haloCensus.air.map(({ point: cell }) => cell))
    .filter((cell) => !approvedIngressObservationKeys.has(cellKey(cell)));
  const fluidCells = union(coreCensus.fluid.map(({ point: cell }) => cell), shellCensus.fluid.map(({ point: cell }) => cell), haloCensus.fluid.map(({ point: cell }) => cell));
  const checks = {
    continuousSixBySixCore: connected(core),
    dryCoreShellHalo: coreCensus.fluid.length === 0 && shellCensus.fluid.length === 0 && haloCensus.fluid.length === 0,
    noAirBoundaryOutsideExactHigh15Ingress: unexpectedAir.length === 0,
    noProtectedTargetOverlap: coreCensus.protectedOverlap.length === 0 && shellCensus.protectedOverlap.length === 0 && haloCensus.protectedOverlap.length === 0,
    exactHigh15MigrationOnly: migration.length === 36 && unexpectedPredecessor.length === 0,
    noBlockEntities: entities.blockEntities.length === 0,
    noSavedEntities: entities.savedEntities.length === 0,
  };
  const failures = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
  candidates.push({
    id: `z-${zMin}-to-${zMax}`,
    geometry: { connector: { x: [-280, -275], y: [54, 59], z: [Math.min(-435, zMin), Math.max(-430, zMax)] }, westbound: { x: [-300, -275], y: [54, 59], z: [zMin, zMax] }, core: coreCensus, shell: shellCensus, halo: haloCensus },
    interface: { approvedHigh15Migration: { count: migration.length, coordinateSetSha256: hashCells(migration.map(({ point: cell }) => cell)), cells: migration }, approvedHigh15IngressObservation: { count: ingressObservation.length, coordinateSetSha256: hashCells(ingressObservation), cells: ingressObservation }, unexpectedPredecessorOverlap: unexpectedPredecessor, unexpectedAirOutsideIngress: unexpectedAir, protectedOverlap: union(coreCensus.protectedOverlap.map(({ point: cell }) => cell), shellCensus.protectedOverlap.map(({ point: cell }) => cell), haloCensus.protectedOverlap.map(({ point: cell }) => cell)) },
    topology: { fluidComponents: components(fluidCells), unexpectedAirComponents: components(unexpectedAir) },
    entityCensus: entities,
    checks,
    failures,
    status: failures.length === 0 ? 'STATIC_DRY_CANDIDATE__GRAVITY_REQUIRES_EXACT_COMPILER' : 'REJECTED',
  });
}
const accepted = candidates.filter(({ failures }) => failures.length === 0);
const result = {
  schemaVersion: 1,
  id: 'rail-s3-r10-high16-north-bypass-read-only-grid-survey',
  status: accepted.length ? 'STATIC_DRY_BYPASS_CANDIDATE_FOUND__NO_COMPILER_CREATED' : 'NO_FULLY_DRY_BYPASS_IN_SURVEY_GRID',
  source: { snapshot, captureManifestSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(absolute(snapshot), 'combined-zones-complete-save-capture.json'))).digest('hex') },
  ownership: { predecessorManifestPath, predecessorTargetCount: predecessorTargets.size, protectedManifestPath, protectedTargetCount: protectedTargets.size, approvedHigh15Migration: { count: approvedMigration.length, coordinateSetSha256: hashCells(approvedMigration), cells: approvedMigration }, approvedHigh15IngressObservation: { count: approvedIngressObservation.length, coordinateSetSha256: hashCells(approvedIngressObservation), cells: approvedIngressObservation } },
  search: { westboundX: [-300, -275], y: [54, 59], zMinRange: [-486, -378], width: 6, height: 6, requiredExclusions: ['all fluid in core/shell/halo', 'all air in core/shell/halo', 'all Cobalt-WL-Headhouse targets', 'all block entities', 'all saved entities', 'all prior targets other than exact High-15 west-shell migration'] },
  candidates,
  acceptedCandidateIds: accepted.map(({ id }) => id),
  decision: accepted.length ? 'Candidate geometry is read-only static evidence only. A separate compiler must bind fresh source, exact gravity support chains, inverse operations, and live gates before any mutation.' : 'No candidate may proceed to compiler or capture lane from this survey grid.',
  readOnly: true,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
};
fs.mkdirSync(path.dirname(absolute(out)), { recursive: true });
fs.writeFileSync(absolute(out), `${JSON.stringify(result, null, 2)}\n`);
const lines = [
  '# R10 High-16 North Bypass · Read-only Grid Survey', '',
  `Status: **${result.status}**`, '',
  `Source snapshot: \`${snapshot}\``, '',
  `Candidates tested: ${candidates.length}; fully dry candidates: ${accepted.length}.`, '',
  'A candidate is admissible only when all core, shell, and halo cells are dry and non-air outside the exact High-15 ingress observation window, have no protected Cobalt-WL target, contain no saved/block entity, and intersect prior work solely at the exact High-15 west-shell migration and its read-only ingress interface.', '',
  '| Candidate | Result | Core / shell / halo | Fluid / air / protected | Gravity (core / shell / halo) | Failures |',
  '| --- | --- | --- | --- | --- | --- |',
  ...candidates.map((candidate) => `| ${candidate.id} | ${candidate.status} | ${candidate.geometry.core.count} / ${candidate.geometry.shell.count} / ${candidate.geometry.halo.count} | ${candidate.geometry.core.fluid.length + candidate.geometry.shell.fluid.length + candidate.geometry.halo.fluid.length} / ${candidate.geometry.core.air.length + candidate.geometry.shell.air.length + candidate.geometry.halo.air.length} / ${candidate.interface.protectedOverlap.length} | ${candidate.geometry.core.gravity.length} / ${candidate.geometry.shell.gravity.length} / ${candidate.geometry.halo.gravity.length} | ${candidate.failures.join(', ') || 'none'} |`), '',
  accepted.length ? 'No compiler was created. Any candidate still requires an exact gravity/support and ownership compiler plus a fresh live release kernel.' : 'No compiler was created and no capture or world mutation is authorized by this survey.', '',
];
fs.mkdirSync(path.dirname(absolute(mdOut)), { recursive: true });
fs.writeFileSync(absolute(mdOut), `${lines.join('\n')}\n`);
console.log(JSON.stringify({ status: result.status, tested: candidates.length, accepted: accepted.map(({ id, geometry }) => ({ id, core: geometry.core.count, shell: geometry.shell.count, halo: geometry.halo.count, gravity: [geometry.core.gravity.length, geometry.shell.gravity.length, geometry.halo.gravity.length] })) }, null, 2));
