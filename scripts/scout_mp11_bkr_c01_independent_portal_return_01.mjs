#!/usr/bin/env node
/**
 * Read-only scout for an already-walkable independent C01 portal return.
 * It intentionally searches existing safe geometry only; it does not infer a
 * tunnel, an excavation, or a physical release from solid terrain.
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
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-independent-portal-return-scout-01-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR independent portal-return scout rejected: ${message}`); };
const key = (point) => point.join(',');
const nameOf = (state) => String(state).split('[', 1)[0];
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const DOMAIN = { minX: 650, maxX: 920, minY: 20, maxY: 85, minZ: -160, maxZ: 20 };
const inside = ([x, y, z]) => x >= DOMAIN.minX && x <= DOMAIN.maxX && y >= DOMAIN.minY && y <= DOMAIN.maxY && z >= DOMAIN.minZ && z <= DOMAIN.maxZ;
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PASSABLE_EXACT = new Set(['minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:chain', 'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light', 'minecraft:flower_pot', 'minecraft:lever', 'minecraft:tripwire', 'minecraft:cobweb']);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail', '_pressure_plate', '_sapling'];
const CONTAINER_IDS = ['chest', 'barrel', 'shulker_box', 'furnace', 'smoker', 'blast_furnace', 'hopper', 'dispenser', 'dropper', 'brewing_stand', 'beehive', 'bee_nest', 'jukebox', 'campfire', 'soul_campfire'];
const isFluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const passable = (state) => {
  const name = nameOf(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name) || PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) return true;
  return name.endsWith('_trapdoor') && state.includes('open=true');
};
const footing = (state) => {
  const name = nameOf(state);
  if (AIR.has(name) || isFluid(state) || name.endsWith('_carpet') || name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) return false;
  return !passable(state) || name.endsWith('_slab') || name.endsWith('_stairs') || (name.endsWith('_trapdoor') && !state.includes('open=true'));
};
const inBox = (point, box) => point[0] >= box[0] && point[0] <= box[3] && point[1] >= box[1] && point[1] <= box[4] && point[2] >= box[2] && point[2] <= box[5];

const root = abs(SNAPSHOT); for (const required of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, required)), `missing complete source member ${required}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json'); const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
const surveyPath = abs(SURVEY); const surveyBytes = fs.readFileSync(surveyPath); const survey = JSON.parse(surveyBytes);
const topologyPath = abs(TOPOLOGY); const topologyBytes = fs.readFileSync(topologyPath); const topology = JSON.parse(topologyBytes);
fail(capture.immutableCopy === true && survey.source?.snapshot?.captureId === capture.captureId && topology.source?.captureId === capture.captureId, 'source evidence is not consistently bound');
fail(topology.expandedGravityTopology?.finiteComponentCount === 12 && topology.expandedGravityTopology?.unboundedComponentCount === 0, 'gravity-topology prerequisite has not closed');
const box = survey.namedSurveyBoxes?.find((candidate) => candidate.boxId === 'eastC01Portal'); const route = box?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
fail(route?.stationCount === 127 && route?.connectivity === 'PASS', 'current portal return absent');
const current = route.stations.map((station) => station.point);
const reader = new AnvilReader(path.join(root, 'region')); const cache = new Map();
async function block(point) { const cacheKey = key(point); if (!cache.has(cacheKey)) cache.set(cacheKey, stateToCommandString(await reader.blockState(...point))); return cache.get(cacheKey); }

// Block the current interior route's complete one-cell horizontal halo, and a
// one-cell cube around every container. The anchor volumes remain eligible.
const blockedByCurrent = new Set();
for (const point of current.slice(1, -1)) for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) blockedByCurrent.add(key([point[0] + dx, point[1], point[2] + dz]));
const containers = [];
for (let cx = Math.floor(DOMAIN.minX / 16); cx <= Math.floor(DOMAIN.maxX / 16); cx += 1) for (let cz = Math.floor(DOMAIN.minZ / 16); cz <= Math.floor(DOMAIN.maxZ / 16); cz += 1) {
  const chunk = await reader.chunk(cx, cz);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const point = [Number(entity.x), Number(entity.y), Number(entity.z)]; const id = String(entity.id ?? 'unknown');
    if (inside(point) && CONTAINER_IDS.some((container) => id.includes(container))) containers.push({ point, id });
  }
}
containers.sort((left, right) => key(left.point).localeCompare(key(right.point)) || left.id.localeCompare(right.id));
const blockedByContainer = new Set();
for (const container of containers) for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) for (let dz = -1; dz <= 1; dz += 1) blockedByContainer.add(key([container.point[0] + dx, container.point[1] + dy, container.point[2] + dz]));
const startBox = route.startAnchor; const endBox = route.endAnchor;
async function cleanStandable(point) {
  if (!inside(point)) return false;
  const pointKey = key(point); if (blockedByCurrent.has(pointKey) && !inBox(point, startBox) && !inBox(point, endBox)) return false;
  if (blockedByContainer.has(pointKey)) return false;
  const [feet, head, support] = await Promise.all([block(point), block([point[0], point[1] + 1, point[2]]), block([point[0], point[1] - 1, point[2]])]);
  if (!passable(feet) || !passable(head) || isFluid(feet) || isFluid(head) || !footing(support)) return false;
  // Require the immediate cardinal/vertical safety halo to be dry and free of containers.
  for (const neighbor of [[point[0] - 1, point[1], point[2]], [point[0] + 1, point[1], point[2]], [point[0], point[1] - 1, point[2]], [point[0], point[1] + 1, point[2]], [point[0], point[1], point[2] - 1], [point[0], point[1], point[2] + 1]]) {
    if (blockedByContainer.has(key(neighbor)) || isFluid(await block(neighbor))) return false;
  }
  return true;
}
const starts = []; const ends = [];
for (let x = startBox[0]; x <= startBox[3]; x += 1) for (let y = startBox[1]; y <= startBox[4]; y += 1) for (let z = startBox[2]; z <= startBox[5]; z += 1) if (await cleanStandable([x, y, z])) starts.push([x, y, z]);
for (let x = endBox[0]; x <= endBox[3]; x += 1) for (let y = endBox[1]; y <= endBox[4]; y += 1) for (let z = endBox[2]; z <= endBox[5]; z += 1) if (await cleanStandable([x, y, z])) ends.push([x, y, z]);
const endKeys = new Set(ends.map(key)); const queue = starts.map((point) => ({ point, previous: null })); const records = new Map(queue.map((record) => [key(record.point), record])); let candidate = null;
for (let cursor = 0; cursor < queue.length; cursor += 1) {
  const record = queue[cursor]; if (endKeys.has(key(record.point))) { candidate = []; for (let item = record; item; item = item.previous) candidate.push(item.point); candidate.reverse(); break; }
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
    const point = [record.point[0] + dx, record.point[1] + dy, record.point[2] + dz]; const pointKey = key(point);
    if (!records.has(pointKey) && await cleanStandable(point)) { const next = { point, previous: record }; records.set(pointKey, next); queue.push(next); }
  }
}
const sx = (x) => 44 + ((x - DOMAIN.minX) / (DOMAIN.maxX - DOMAIN.minX)) * 1110; const sz = (z) => 104 + ((z - DOMAIN.minZ) / (DOMAIN.maxZ - DOMAIN.minZ)) * 430;
const line = (points) => points.map((point, index) => `${index ? 'L' : 'M'}${sx(point[0]).toFixed(1)} ${sz(point[2]).toFixed(1)}`).join(' ');
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="620" viewBox="0 0 1200 620"><rect width="1200" height="620" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c7d8e7}</style><text x="34" y="40" class="head">C01 portal independent-return scout — existing safe geometry only</text><text x="34" y="66" class="sub">Domain x ${DOMAIN.minX}..${DOMAIN.maxX}, y ${DOMAIN.minY}..${DOMAIN.maxY}, z ${DOMAIN.minZ}..${DOMAIN.maxZ}; blue = current return; green = candidate if found</text><rect x="44" y="104" width="1110" height="430" fill="#142238" stroke="#5b738b"/><path d="${line(current)}" fill="none" stroke="#65c7ff" stroke-width="3"/>${candidate ? `<path d="${line(candidate)}" fill="none" stroke="#68d391" stroke-width="3"/>` : ''}<text x="44" y="565" class="sub">Current-route halo exclusion: ${blockedByCurrent.size} cells. Container safety-halo exclusion: ${blockedByContainer.size} cells from ${containers.length} containers.</text><text x="44" y="590" class="sub">Result: ${candidate ? `source-valid ${candidate.length}-station independent normal-walk candidate` : 'no source-valid independent normal-walk candidate in the exact bounded scout domain'}.</text></svg>\n`;
const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-INDEPENDENT-PORTAL-RETURN-SCOUT-01', generatedAtUtc: new Date().toISOString(),
  status: candidate ? 'SOURCE_VALID_INDEPENDENT_RETURN_CANDIDATE_NO_PHYSICAL_AUTHORITY' : 'NO_SOURCE_VALID_INDEPENDENT_PORTAL_RETURN_CANDIDATE_IN_BOUNDED_DOMAIN', mode: 'READ_ONLY_EXISTING_GEOMETRY_SCOUT_NO_OPERATIONS', mutationAuthority: false,
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, bkrSurvey: { path: rel(SURVEY), sha256: sha256(surveyBytes) }, topology: { path: rel(TOPOLOGY), sha256: sha256(topologyBytes) } },
  domain: DOMAIN,
  exclusions: { currentReturnInteriorHaloCellCount: blockedByCurrent.size, currentReturnInteriorHaloCellSetSha256: pointHash([...blockedByCurrent].map((value) => value.split(',').map(Number))), containerCount: containers.length, containerCellSetSha256: sha256(containers.map((container) => `${key(container.point)}=${container.id}`).join('\n')), containerSafetyHaloCellCount: blockedByContainer.size, containerSafetyHaloCellSetSha256: pointHash([...blockedByContainer].map((value) => value.split(',').map(Number))), fluidPolicy: 'feet, head, and each immediate cardinal/vertical safety-halo cell must be non-fluid and non-waterlogged' },
  currentReturn: { stationCount: current.length, stationSetSha256: pointHash(current), startAnchor: startBox, endAnchor: endBox },
  scoutResult: candidate ? { stationCount: candidate.length, stations: candidate, stationSetSha256: pointHash(candidate), excludesCurrentReturnHalo: true, excludesContainersAndFluidHalos: true } : { searchedStartStandableCount: starts.length, searchedEndStandableCount: ends.length, visitedSafeNormalWalkCells: records.size, exactAbsence: 'No existing safe normal-walk portal→L1 route exists in this bounded domain after the listed exclusions.' },
  nonClaims: ['No speculative excavation/tunnel is a candidate.', 'No operations, release manifest, receiver, liner, dry bypass, or mutation authority.', 'A found existing route would still need independent owner/interface acceptance and fresh live-entity evidence before any access claim.'],
};
const report = { ...base, scoutIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-independent-portal-return-scout-01.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-independent-portal-return-scout-map.svg'), map);
fs.writeFileSync(path.join(out, 'MP11-BKR-C01-INDEPENDENT-PORTAL-RETURN-SCOUT-01.md'), `# MP11 / BKR C01 independent portal-return scout 01\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only scout; no physical operations.\n\n![Coordinate map](mp11-bkr-c01-independent-portal-return-scout-map.svg)\n\nThis scout considers existing normal-walk geometry only. It excludes the current portal-to-L1 return’s interior one-cell halo, every source container’s one-cell cube halo, and all fluid/waterlogged feet/head/safety-halo cells. ${candidate ? `It found a ${candidate.length}-station candidate, which remains design input only.` : `It found no candidate in the exact bounded domain; no speculative tunnel is inferred.`}\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), mutationAuthority: false, candidateStations: candidate?.length ?? 0, visitedSafeCells: records.size, containers: containers.length }, null, 2));
