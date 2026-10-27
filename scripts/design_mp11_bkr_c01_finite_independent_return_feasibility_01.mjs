#!/usr/bin/env node
/**
 * Read-only feasibility search for a new, finite C01 portal return corridor.
 *
 * It searches a true 3-wide × 3-high build envelope (floor + three clear
 * cells) through source-known cells only. Every
 * candidate cell must avoid current-route halo, all block-entity halos,
 * fluids/waterlogging, and gravity blocks. It is a design input, never an
 * operation compiler.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => { const index = args.indexOf(flag); return index >= 0 && args[index + 1] ? args[index + 1] : fallback; };
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-01-cobalt-wl-post-20260826T233000Z/bkr-survey-00.json');
const TOPOLOGY = option('--topology', 'data/world-review/mp11-bkr-c01-portal-topology-second-return-03-cobalt-wl-post-20260826T233000Z/mp11-bkr-c01-portal-topology-second-return-03.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-finite-independent-return-feasibility-01-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR finite independent-return feasibility rejected: ${message}`); };
const key = (point) => point.join(',');
const nameOf = (state) => String(state).split('[', 1)[0];
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const stateHash = (items) => sha256(items.map((item) => `${key(item.point)}=${item.state}`).sort().join('\n'));
const DOMAIN = { minX: 650, maxX: 920, minY: 20, maxY: 85, minZ: -160, maxZ: 20 };
const inside = ([x, y, z]) => x >= DOMAIN.minX && x <= DOMAIN.maxX && y >= DOMAIN.minY && y <= DOMAIN.maxY && z >= DOMAIN.minZ && z <= DOMAIN.maxZ;
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand', 'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil', 'minecraft:pointed_dripstone']);
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PASSABLE_EXACT = new Set(['minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:chain', 'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light', 'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb']);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail', '_pressure_plate', '_sapling'];
const fluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const gravity = (state) => GRAVITY.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const passable = (state) => { const name = nameOf(state); return AIR.has(name) || PASSABLE_EXACT.has(name) || PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix)) || name.endsWith('_door') || name.endsWith('_fence_gate') || (name.endsWith('_trapdoor') && state.includes('open=true')); };
const footing = (state) => { const name = nameOf(state); return !(AIR.has(name) || fluid(state) || name.endsWith('_carpet') || name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) && (!passable(state) || name.endsWith('_slab') || name.endsWith('_stairs') || (name.endsWith('_trapdoor') && !state.includes('open=true'))); };
const inBox = (point, box) => point[0] >= box[0] && point[0] <= box[3] && point[1] >= box[1] && point[1] <= box[4] && point[2] >= box[2] && point[2] <= box[5];

const root = abs(SNAPSHOT); for (const required of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, required)), `missing source member ${required}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
const surveyPath = abs(SURVEY); const surveyBytes = fs.readFileSync(surveyPath); const survey = JSON.parse(surveyBytes);
const topologyPath = abs(TOPOLOGY); const topologyBytes = fs.readFileSync(topologyPath); const topology = JSON.parse(topologyBytes);
fail(capture.immutableCopy === true && survey.source?.snapshot?.captureId === capture.captureId && topology.source?.captureId === capture.captureId, 'evidence source identity mismatch');
fail(topology.expandedGravityTopology?.finiteComponentCount === 12 && topology.expandedGravityTopology?.unboundedComponentCount === 0, 'finite gravity prerequisite missing');
const surveyBox = survey.namedSurveyBoxes?.find((candidate) => candidate.boxId === 'eastC01Portal'); const currentRoute = surveyBox?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
fail(currentRoute?.stationCount === 127 && currentRoute?.connectivity === 'PASS', 'current portal route absent');
const current = currentRoute.stations.map((station) => station.point); const startBox = currentRoute.startAnchor; const endBox = currentRoute.endAnchor;
const reader = new AnvilReader(path.join(root, 'region')); const cache = new Map();
async function block(point) { const cacheKey = key(point); if (!cache.has(cacheKey)) cache.set(cacheKey, stateToCommandString(await reader.blockState(...point))); return cache.get(cacheKey); }

const currentHalo = new Set();
for (const point of current.slice(1, -1)) for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) currentHalo.add(key([point[0] + dx, point[1], point[2] + dz]));
const blockEntities = [];
for (let cx = Math.floor(DOMAIN.minX / 16); cx <= Math.floor(DOMAIN.maxX / 16); cx += 1) for (let cz = Math.floor(DOMAIN.minZ / 16); cz <= Math.floor(DOMAIN.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) { const point = [Number(entity.x), Number(entity.y), Number(entity.z)]; if (inside(point)) blockEntities.push({ point, id: String(entity.id ?? 'unknown') }); }
}
blockEntities.sort((left, right) => key(left.point).localeCompare(key(right.point)) || left.id.localeCompare(right.id));
const blockEntityHalo = new Set();
for (const entity of blockEntities) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) blockEntityHalo.add(key([entity.point[0] + dx, entity.point[1] + dy, entity.point[2] + dz]));

const cubeCache = new Map();
async function clearCube(point) {
  const pointKey = key(point); if (cubeCache.has(pointKey)) return cubeCache.get(pointKey);
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 2; dy += 1) for (let dz = -1; dz <= 1; dz += 1) {
    const cell = [point[0] + dx, point[1] + dy, point[2] + dz];
    if (!inside(cell) || currentHalo.has(key(cell)) || blockEntityHalo.has(key(cell))) { cubeCache.set(pointKey, null); return null; }
    const state = await block(cell); if (fluid(state) || gravity(state)) { cubeCache.set(pointKey, null); return null; }
    cells.push({ point: cell, state });
  }
  cubeCache.set(pointKey, cells); return cells;
}
async function endpoint(point, box) {
  if (!inBox(point, box)) return false;
  const [feet, head, upperHead, support] = await Promise.all([block(point), block([point[0], point[1] + 1, point[2]]), block([point[0], point[1] + 2, point[2]]), block([point[0], point[1] - 1, point[2]])]);
  return passable(feet) && !fluid(feet) && passable(head) && !fluid(head) && passable(upperHead) && !fluid(upperHead) && footing(support) && !!(await clearCube(point));
}
const starts = []; const ends = [];
for (let x = startBox[0]; x <= startBox[3]; x += 1) for (let y = startBox[1]; y <= startBox[4]; y += 1) for (let z = startBox[2]; z <= startBox[5]; z += 1) if (await endpoint([x, y, z], startBox)) starts.push([x, y, z]);
for (let x = endBox[0]; x <= endBox[3]; x += 1) for (let y = endBox[1]; y <= endBox[4]; y += 1) for (let z = endBox[2]; z <= endBox[5]; z += 1) if (await endpoint([x, y, z], endBox)) ends.push([x, y, z]);

// Binary heap for A*; all transition costs are one normal-walk station.
class Heap {
  constructor() { this.items = []; }
  push(item) {
    let index = this.items.length;
    this.items.push(item);
    while (index) {
      const parent = (index - 1) >> 1;
      if (this.items[parent].score <= item.score) break;
      this.items[index] = this.items[parent];
      index = parent;
    }
    this.items[index] = item;
  }
  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length) {
      let index = 0;
      while (index * 2 + 1 < this.items.length) {
        let child = index * 2 + 1;
        if (child + 1 < this.items.length && this.items[child + 1].score < this.items[child].score) child += 1;
        if (this.items[child].score >= last.score) break;
        this.items[index] = this.items[child];
        index = child;
      }
      this.items[index] = last;
    }
    return first;
  }
}
const heuristic = (point) => Math.min(...ends.map((end) => Math.abs(point[0] - end[0]) + Math.abs(point[1] - end[1]) + Math.abs(point[2] - end[2])));
const endKeys = new Set(ends.map(key)); const heap = new Heap(); const records = new Map();
for (const point of starts) { const record = { point, previous: null, cost: 0, score: heuristic(point) }; records.set(key(point), record); heap.push(record); }
let candidatePath = null; let expandedStates = 0;
while (heap.items.length) {
  const record = heap.pop(); if (records.get(key(record.point)) !== record) continue; expandedStates += 1;
  if (endKeys.has(key(record.point))) { candidatePath = []; for (let cursor = record; cursor; cursor = cursor.previous) candidatePath.push(cursor.point); candidatePath.reverse(); break; }
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
    const point = [record.point[0] + dx, record.point[1] + dy, record.point[2] + dz]; if (!inside(point) || !(await clearCube(point))) continue;
    const pointKey = key(point); const cost = record.cost + 1; if (records.get(pointKey)?.cost <= cost) continue;
    const next = { point, previous: record, cost, score: cost + heuristic(point) }; records.set(pointKey, next); heap.push(next);
  }
}
const envelope = candidatePath ? [...new Map((await Promise.all(candidatePath.map(clearCube))).flat().map((cell) => [key(cell.point), cell])).values()].sort((left, right) => key(left.point).localeCompare(key(right.point))) : [];
const endpointRecords = candidatePath ? [
  { role: 'portal', point: candidatePath[0], state: await block(candidatePath[0]), anchor: startBox },
  { role: 'L1', point: candidatePath.at(-1), state: await block(candidatePath.at(-1)), anchor: endBox },
] : [];
const sx = (x) => 44 + ((x - DOMAIN.minX) / (DOMAIN.maxX - DOMAIN.minX)) * 1110; const sz = (z) => 104 + ((z - DOMAIN.minZ) / (DOMAIN.maxZ - DOMAIN.minZ)) * 430;
const line = (points) => points.map((point, index) => `${index ? 'L' : 'M'}${sx(point[0]).toFixed(1)} ${sz(point[2]).toFixed(1)}`).join(' ');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620"><rect width="1200" height="620" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c7d8e7}</style><text x="34" y="40" class="head">C01 finite independent-return feasibility — no operations</text><text x="34" y="66" class="sub">3×3 corridor envelope; excludes current-route halo, all block-entity halos, fluids/waterlogging, and gravity</text><rect x="44" y="104" width="1110" height="430" fill="#142238" stroke="#5b738b"/><path d="${line(current)}" fill="none" stroke="#65c7ff" stroke-width="3"/>${candidatePath ? `<path d="${line(candidatePath)}" fill="none" stroke="#68d391" stroke-width="3"/>` : ''}<text x="44" y="565" class="sub">Blue: current return. Green: finite candidate (${candidatePath?.length ?? 0} stations) if present. ${blockEntities.length} block entities excluded with one-cell cube halos.</text><text x="44" y="590" class="sub">Result: ${candidatePath ? 'source-valid feasibility input only; endpoint and dual-return contracts remain required.' : 'no finite dry 3×3 source-valid corridor candidate in the bounded domain.'}</text></svg>\n`;
const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-FINITE-INDEPENDENT-RETURN-FEASIBILITY-01', generatedAtUtc: new Date().toISOString(),
  status: candidatePath ? 'FINITE_SOURCE_BOUND_INDEPENDENT_RETURN_FEASIBILITY_INPUT_ONLY' : 'NO_FINITE_SOURCE_BOUND_INDEPENDENT_RETURN_CORRIDOR_IN_BOUNDED_DOMAIN', mode: 'READ_ONLY_NEW_ROUTE_FEASIBILITY_NO_OPERATIONS', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, bkrSurvey: { path: rel(SURVEY), sha256: sha256(surveyBytes) }, topology: { path: rel(TOPOLOGY), sha256: sha256(topologyBytes) } },
  domain: DOMAIN, corridorProfile: { clearEnvelope: '3-wide × 3-high conceptual carve profile (floor + three clear cells)', cellPerStation: 36, currentRouteHaloExcluded: true, allBlockEntityHalosExcluded: true, fluidAndWaterloggedExcluded: true, gravityExcluded: true },
  endpointSearch: { portalAnchor: startBox, l1Anchor: endBox, validPortalEndpointCount: starts.length, validL1EndpointCount: ends.length },
  currentReturn: { stationCount: current.length, stationSetSha256: pointHash(current), interiorHaloCellCount: currentHalo.size, interiorHaloCellSetSha256: pointHash([...currentHalo].map((value) => value.split(',').map(Number))) },
  blockEntityExclusion: { blockEntityCount: blockEntities.length, blockEntitySetSha256: sha256(blockEntities.map((entity) => `${key(entity.point)}=${entity.id}`).join('\n')), haloCellCount: blockEntityHalo.size, haloCellSetSha256: pointHash([...blockEntityHalo].map((value) => value.split(',').map(Number))) },
  feasibility: candidatePath ? { candidateStationCount: candidatePath.length, stations: candidatePath, stationSetSha256: pointHash(candidatePath), envelopeCellCount: envelope.length, envelopeCellSetSha256: stateHash(envelope), canonicalSourceStates: envelope, endpointRecords, allHazardsExcluded: true, currentRouteHaloDisjoint: true, blockEntityHaloDisjoint: true, exactContractsStillRequired: ['Portal endpoint/interface owner acceptance for the exact first station and 3×3 envelope.', 'L1 endpoint/interface owner acceptance for the exact last station and 3×3 envelope.', 'Two independent directed normal-walk return contracts and post-state proof after any separately compiled physical package.'] } : { expandedStates, exactAbsence: 'No 3×3 finite corridor station path connects a source-valid portal endpoint to a source-valid L1 endpoint in the bounded domain after all required exclusions.' },
  nonClaims: ['No forward/rollback operations, release manifest, liner, dry-bypass release, or mutation authority.', 'This feasibility does not approve an endpoint, return route, excavation, opening, public access, or commissioning.', 'A gravity/fluids-free candidate still requires a separate exact physical compiler and full safety kernel.'],
};
const report = { ...base, feasibilityIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-finite-independent-return-feasibility-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-finite-independent-return-feasibility-map.svg'), map);
fs.writeFileSync(path.join(out, 'MP11-BKR-C01-FINITE-INDEPENDENT-RETURN-FEASIBILITY-01.md'), `# MP11 / BKR C01 finite independent-return feasibility 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only feasibility; no operations.\n\n![Coordinate map](mp11-bkr-c01-finite-independent-return-feasibility-map.svg)\n\nThis search uses a 3×3 conceptual corridor envelope through exact source cells. It excludes the current return’s halo, all block-entity halos, fluids/waterlogging, and gravity. ${candidatePath ? `It identifies a ${candidatePath.length}-station finite feasibility input with ${envelope.length} canonical source cells. Endpoint and dual-return contracts are still required before any physical compiler can run.` : 'It identifies no finite source-bound corridor in the exact bounded domain, so no tunnel is inferred.'}\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), mutationAuthority: false, candidateStations: candidatePath?.length ?? 0, envelopeCells: envelope.length, validPortalEndpoints: starts.length, validL1Endpoints: ends.length, expandedStates }, null, 2));
