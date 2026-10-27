#!/usr/bin/env node
/**
 * Read-only MP11/BKR C01 portal follow-up.
 *
 * Expands each gravity component that crossed the first portal study boundary
 * through the complete immutable source, then searches for a second return
 * that is disjoint from the accepted current portal-to-L1 path (except its
 * source/destination anchor volumes). It never emits world operations.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AnvilReader, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const option = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = option('--snapshot', 'data/worldsnap-cobalt-wl-controlled-rail-inspection-transfer-post-20260826T233000Z');
const SURVEY = option('--survey', 'data/world-review/bkr-survey-01-cobalt-wl-post-20260826T233000Z/bkr-survey-00.json');
const OUT = option('--out', 'data/world-review/mp11-bkr-c01-portal-topology-second-return-03-cobalt-wl-post-20260826T233000Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).split(path.sep).join('/');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const fail = (condition, message) => { if (!condition) throw new Error(`MP11/BKR portal follow-up rejected: ${message}`); };
const key = (point) => point.join(',');
const nameOf = (state) => String(state).split('[', 1)[0];
const stateHash = (items) => sha256(items.map((item) => `${key(item.point)}=${item.state}`).sort().join('\n'));
const pointHash = (points) => sha256(points.map(key).sort().join('\n'));
const INITIAL = { minX: 680, maxX: 812, minY: 40, maxY: 75, minZ: -90, maxZ: -40 };
const GRAVITY = new Set(['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel', 'minecraft:suspicious_sand',
  'minecraft:suspicious_gravel', 'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:pointed_dripstone']);
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const PASSABLE_EXACT = new Set(['minecraft:snow', 'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern',
  'minecraft:large_fern', 'minecraft:dead_bush', 'minecraft:lantern', 'minecraft:soul_lantern', 'minecraft:chain',
  'minecraft:iron_chain', 'minecraft:end_rod', 'minecraft:light', 'minecraft:flower_pot', 'minecraft:lever',
  'minecraft:tripwire', 'minecraft:cobweb']);
const PASSABLE_SUFFIX = ['_carpet', '_banner', '_sign', '_button', '_torch', '_rail', '_pressure_plate', '_sapling'];
const inside = (point, bounds = INITIAL) => point[0] >= bounds.minX && point[0] <= bounds.maxX
  && point[1] >= bounds.minY && point[1] <= bounds.maxY && point[2] >= bounds.minZ && point[2] <= bounds.maxZ;
const onInitialBoundary = ([x, y, z]) => x === INITIAL.minX || x === INITIAL.maxX || y === INITIAL.minY || y === INITIAL.maxY
  || z === INITIAL.minZ || z === INITIAL.maxZ;
const sixNeighbors = ([x, y, z]) => [[x - 1, y, z], [x + 1, y, z], [x, y - 1, z], [x, y + 1, z], [x, y, z - 1], [x, y, z + 1]];
const boundsFor = (points) => ({
  minX: Math.min(...points.map((point) => point[0])), maxX: Math.max(...points.map((point) => point[0])),
  minY: Math.min(...points.map((point) => point[1])), maxY: Math.max(...points.map((point) => point[1])),
  minZ: Math.min(...points.map((point) => point[2])), maxZ: Math.max(...points.map((point) => point[2])),
});
const isGravity = (state) => GRAVITY.has(nameOf(state)) || nameOf(state).endsWith('_concrete_powder');
const isFluid = (state) => ['minecraft:water', 'minecraft:flowing_water', 'minecraft:lava', 'minecraft:flowing_lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const isPassable = (state) => {
  const name = nameOf(state);
  if (AIR.has(name) || PASSABLE_EXACT.has(name) || PASSABLE_SUFFIX.some((suffix) => name.endsWith(suffix))) return true;
  if (name.endsWith('_door') || name.endsWith('_fence_gate')) return true;
  if (name.endsWith('_trapdoor')) return state.includes('open=true');
  return false;
};
const hasFooting = (state) => {
  const name = nameOf(state);
  if (AIR.has(name) || isFluid(state) || name.endsWith('_carpet') || name.endsWith('_fence') || name.endsWith('_wall') || name.endsWith('_pane')) return false;
  return !isPassable(state) || name.endsWith('_slab') || name.endsWith('_stairs') || (name.endsWith('_trapdoor') && !state.includes('open=true'));
};

const root = abs(SNAPSHOT);
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) fail(fs.existsSync(path.join(root, member)), `missing complete source member ${member}`);
const capturePath = path.join(root, 'combined-zones-complete-save-capture.json');
const captureBytes = fs.readFileSync(capturePath); const capture = JSON.parse(captureBytes);
fail(capture.immutableCopy === true && capture.captureId, 'source is not an immutable complete-save');
const surveyPath = abs(SURVEY); const surveyBytes = fs.readFileSync(surveyPath); const survey = JSON.parse(surveyBytes);
fail(survey.source?.snapshot?.rootDirectory === rel(SNAPSHOT) && survey.source.snapshot.captureId === capture.captureId, 'BKR survey is not source-bound to the selected snapshot');
const surveyBox = survey.namedSurveyBoxes?.find((box) => box.boxId === 'eastC01Portal');
const route = surveyBox?.routes?.find((candidate) => candidate.routeId === 'TE-ROUTE-C01-MOUNTAIN-PORTAL-L1');
// The historic source had a 127-station trace. A later independent-return
// release can legitimately change the current shortest path, so bind the
// fresh PASS inventory rather than treating the historic station count as a
// source invariant. The exact station set/hash below remains the evidence.
fail(route?.connectivity === 'PASS' && route.stationCount > 0 && Array.isArray(route.stations) && route.stations.length === route.stationCount, 'current portal return inventory absent');
const currentReturn = route.stations.map((station) => station.point);

const reader = new AnvilReader(path.join(root, 'region'));
const cache = new Map();
async function block(point) {
  const cacheKey = key(point);
  if (!cache.has(cacheKey)) cache.set(cacheKey, stateToCommandString(await reader.blockState(...point)));
  return cache.get(cacheKey);
}

// First identify the original 14 components exactly as the first-stage gate did.
const initialGravity = new Map();
for (let x = INITIAL.minX; x <= INITIAL.maxX; x += 1) for (let y = INITIAL.minY; y <= INITIAL.maxY; y += 1) for (let z = INITIAL.minZ; z <= INITIAL.maxZ; z += 1) {
  const point = [x, y, z]; const state = await block(point); if (isGravity(state)) initialGravity.set(key(point), { point, state });
}
const unseenInitial = new Set(initialGravity.keys()); const boundarySeeds = []; let initialBoundaryComponentCount = 0;
while (unseenInitial.size) {
  const first = unseenInitial.values().next().value; const stack = [initialGravity.get(first)]; const component = []; unseenInitial.delete(first);
  while (stack.length) {
    const cell = stack.pop(); component.push(cell);
    for (const point of sixNeighbors(cell.point)) { const neighborKey = key(point); if (unseenInitial.delete(neighborKey)) stack.push(initialGravity.get(neighborKey)); }
  }
  if (component.some((cell) => onInitialBoundary(cell.point))) {
    initialBoundaryComponentCount += 1;
    boundarySeeds.push(...component.filter((cell) => onInitialBoundary(cell.point)));
  }
}
fail(boundarySeeds.length > 0, 'no first-stage boundary gravity seed exists');

// Expanding sparsely via exact six-neighbor state checks discovers every
// connected gravity component without pretending that the former box was its
// natural boundary. A hard cap turns pathological topology into a hard hold.
const MAX_COMPONENT_CELLS = 100000;
const expandedVisited = new Set(); const expanded = [];
for (const seed of boundarySeeds) {
  if (expandedVisited.has(key(seed.point))) continue;
  const stack = [seed]; const cells = []; expandedVisited.add(key(seed.point)); let capped = false;
  while (stack.length) {
    const cell = stack.pop(); cells.push(cell);
    if (cells.length > MAX_COMPONENT_CELLS) { capped = true; break; }
    for (const point of sixNeighbors(cell.point)) {
      const neighborKey = key(point); if (expandedVisited.has(neighborKey)) continue;
      const state = await block(point); if (!isGravity(state)) continue;
      expandedVisited.add(neighborKey); stack.push({ point, state });
    }
  }
  const points = cells.map((cell) => cell.point);
  const initialContact = cells.filter((cell) => onInitialBoundary(cell.point)).map((cell) => cell.point);
  const halo = [];
  for (const cell of cells) for (const point of sixNeighbors(cell.point)) {
    const state = await block(point); if (isFluid(state)) halo.push({ point, state });
  }
  const uniqueHalo = [...new Map(halo.map((cell) => [key(cell.point), cell])).values()];
  expanded.push({ cellCount: cells.length, cellSetSha256: stateHash(cells), bounds: boundsFor(points),
    classification: capped ? 'UNBOUNDED_SCAN_CAP_HARD_STOP' : 'FINITE_IN_COMPLETE_IMMUTABLE_SOURCE',
    initialBoundaryContactCount: initialContact.length, initialBoundaryContactSetSha256: pointHash(initialContact), initialBoundaryContacts: initialContact,
    fluidAdjacentCellCount: uniqueHalo.length, fluidAdjacentCellSetSha256: stateHash(uniqueHalo), fluidAdjacentCells: uniqueHalo,
  });
}
expanded.sort((left, right) => left.bounds.minX - right.bounds.minX || left.bounds.minY - right.bounds.minY || left.bounds.minZ - right.bounds.minZ || left.cellCount - right.cellCount);
expanded.forEach((component, index) => { component.componentId = `EXP-G${String(index + 1).padStart(2, '0')}`; });
const finite = expanded.filter((component) => component.classification === 'FINITE_IN_COMPLETE_IMMUTABLE_SOURCE');

// Return survey: normal walk in the complete initial portal study. The second
// pass excludes the full 1-cell horizontal halo of current-return interior
// stations, leaving only differently routed paths eligible as independent.
const startBox = route.startAnchor; const endBox = route.endAnchor;
const inBox = (point, box) => point[0] >= box[0] && point[0] <= box[3] && point[1] >= box[1] && point[1] <= box[4] && point[2] >= box[2] && point[2] <= box[5];
async function standable(point) {
  if (!inside(point)) return false;
  const [feet, head, support] = await Promise.all([block(point), block([point[0], point[1] + 1, point[2]]), block([point[0], point[1] - 1, point[2]])]);
  return isPassable(feet) && !isFluid(feet) && isPassable(head) && !isFluid(head) && hasFooting(support);
}
const starts = []; const ends = [];
for (let x = startBox[0]; x <= startBox[3]; x += 1) for (let y = startBox[1]; y <= startBox[4]; y += 1) for (let z = startBox[2]; z <= startBox[5]; z += 1) if (await standable([x, y, z])) starts.push([x, y, z]);
for (let x = endBox[0]; x <= endBox[3]; x += 1) for (let y = endBox[1]; y <= endBox[4]; y += 1) for (let z = endBox[2]; z <= endBox[5]; z += 1) if (await standable([x, y, z])) ends.push([x, y, z]);
const endKeys = new Set(ends.map(key)); const routeInteriorHalo = new Set();
for (const point of currentReturn.slice(1, -1)) for (let dx = -1; dx <= 1; dx += 1) for (let dz = -1; dz <= 1; dz += 1) routeInteriorHalo.add(key([point[0] + dx, point[1], point[2] + dz]));
for (const point of [...starts, ...ends]) routeInteriorHalo.delete(key(point));
async function findIndependentReturn() {
  const queue = starts.map((point) => ({ point, previous: null })); const records = new Map(queue.map((entry) => [key(entry.point), entry]));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor]; if (endKeys.has(key(current.point))) {
      const path = []; let record = current; while (record) { path.push(record.point); record = record.previous; } return path.reverse();
    }
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      for (const dy of [-1, 0, 1]) {
        const point = [current.point[0] + dx, current.point[1] + dy, current.point[2] + dz]; const pointKey = key(point);
        if (records.has(pointKey) || routeInteriorHalo.has(pointKey) || !inside(point) || !(await standable(point))) continue;
        records.set(pointKey, { point, previous: current }); queue.push(records.get(pointKey));
      }
    }
  }
  return null;
}
const independentPath = await findIndependentReturn();
const returnResult = independentPath ? {
  status: 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND', stationCount: independentPath.length, stations: independentPath,
  stationSetSha256: pointHash(independentPath), independentFromCurrentInteriorHalo: true,
} : {
  status: 'NO_SECOND_INDEPENDENT_PORTAL_RETURN_IN_SOURCE_BOUND_STUDY', stationCount: 0,
  excludedCurrentInteriorHaloCellCount: routeInteriorHalo.size, excludedCurrentInteriorHaloCellSetSha256: pointHash([...routeInteriorHalo].map((value) => value.split(',').map(Number))),
  searchedStartStandableCount: starts.length, searchedEndStandableCount: ends.length,
  reason: 'No normal-walk path connects the portal and L1 anchors after excluding the current return’s complete 1-cell horizontal interior halo. The source therefore has no independently routed portal return in the exact study bounds.',
};

const mapRows = expanded.map((component, index) => `<rect x="${42 + (index % 3) * 292}" y="${164 + Math.floor(index / 3) * 69}" width="270" height="48" rx="6" fill="${component.classification.startsWith('FINITE') ? '#d3a854' : '#ef7168'}"/><text class="cell" x="${53 + (index % 3) * 292}" y="${185 + Math.floor(index / 3) * 69}">${component.componentId}: ${component.cellCount} cells · ${component.classification.startsWith('FINITE') ? 'finite' : 'unbounded'}</text><text class="cell" x="${53 + (index % 3) * 292}" y="${203 + Math.floor(index / 3) * 69}">x ${component.bounds.minX}..${component.bounds.maxX} · y ${component.bounds.minY}..${component.bounds.maxY} · z ${component.bounds.minZ}..${component.bounds.maxZ}</text>`).join('');
const mapHeight = 260 + Math.ceil(expanded.length / 3) * 69;
const map = `<svg xmlns="http://www.w3.org/2000/svg" width="930" height="${mapHeight}" viewBox="0 0 930 ${mapHeight}"><rect width="930" height="${mapHeight}" fill="#0d1523"/><style>.head{font:700 23px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c6d7e7}.cell{font:10px ui-monospace,monospace;fill:#152332}</style><text x="34" y="39" class="head">C01 portal gravity expansion and second-return survey</text><text x="34" y="64" class="sub">${expanded.length} former boundary components expanded through immutable source · all ${finite.length} finite · no operations</text><text x="34" y="91" class="sub">current return: ${currentReturn.length} stations · independent return: ${returnResult.status} · fluid adjacency across expanded components: ${expanded.reduce((sum, component) => sum + component.fluidAdjacentCellCount, 0)}</text><text x="34" y="117" class="sub">A later physical scope still needs exactly one chosen component, its full interaction halo, receiver/overflow proof if wet, and two independent returns.</text>${mapRows}</svg>\n`;

const planBounds = {
  minX: Math.min(INITIAL.minX, ...expanded.map((component) => component.bounds.minX), ...currentReturn.map((point) => point[0]), ...(independentPath ?? []).map((point) => point[0])),
  maxX: Math.max(INITIAL.maxX, ...expanded.map((component) => component.bounds.maxX), ...currentReturn.map((point) => point[0]), ...(independentPath ?? []).map((point) => point[0])),
  minZ: Math.min(INITIAL.minZ, ...expanded.map((component) => component.bounds.minZ), ...currentReturn.map((point) => point[2]), ...(independentPath ?? []).map((point) => point[2])),
  maxZ: Math.max(INITIAL.maxZ, ...expanded.map((component) => component.bounds.maxZ), ...currentReturn.map((point) => point[2]), ...(independentPath ?? []).map((point) => point[2])),
};
const planLeft = 78; const planTop = 120; const planWidth = 1050; const planHeight = 530;
const toPlan = ([x, , z]) => [
  planLeft + ((x - planBounds.minX) / (planBounds.maxX - planBounds.minX || 1)) * planWidth,
  planTop + ((planBounds.maxZ - z) / (planBounds.maxZ - planBounds.minZ || 1)) * planHeight,
];
const routePath = (points) => points.map((point, index) => `${index ? 'L' : 'M'}${toPlan(point).map((value) => value.toFixed(1)).join(' ')}`).join(' ');
const componentPlanBoxes = expanded.map((component) => {
  const topLeft = toPlan([component.bounds.minX, 0, component.bounds.maxZ]);
  const bottomRight = toPlan([component.bounds.maxX, 0, component.bounds.minZ]);
  const width = Math.max(4, bottomRight[0] - topLeft[0]); const height = Math.max(4, bottomRight[1] - topLeft[1]);
  return `<rect x="${topLeft[0].toFixed(1)}" y="${topLeft[1].toFixed(1)}" width="${width.toFixed(1)}" height="${height.toFixed(1)}" fill="#d6a857" fill-opacity=".55" stroke="#ffd574"/><text x="${(topLeft[0] + 3).toFixed(1)}" y="${(topLeft[1] + 13).toFixed(1)}" class="tag">${component.componentId}</text>`;
}).join('');
const studyTopLeft = toPlan([INITIAL.minX, 0, INITIAL.maxZ]); const studyBottomRight = toPlan([INITIAL.maxX, 0, INITIAL.minZ]);
const plan = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760"><rect width="1200" height="760" fill="#0d1523"/><style>.head{font:700 24px system-ui;fill:#eff7ff}.sub{font:13px ui-monospace,monospace;fill:#c6d7e7}.tag{font:10px ui-monospace,monospace;fill:#132130}</style><text x="40" y="42" class="head">C01 portal gravity expansion — coordinate plan</text><text x="40" y="68" class="sub">Immutable source · X/Z projection · gold = complete finite former-boundary component · no operations</text><rect x="${planLeft}" y="${planTop}" width="${planWidth}" height="${planHeight}" fill="#152238" stroke="#40566e"/><rect x="${studyTopLeft[0].toFixed(1)}" y="${studyTopLeft[1].toFixed(1)}" width="${(studyBottomRight[0] - studyTopLeft[0]).toFixed(1)}" height="${(studyBottomRight[1] - studyTopLeft[1]).toFixed(1)}" fill="none" stroke="#d9e6f0" stroke-dasharray="7 5"/><text x="${(studyTopLeft[0] + 4).toFixed(1)}" y="${(studyTopLeft[1] + 17).toFixed(1)}" class="sub">initial study x ${INITIAL.minX}..${INITIAL.maxX} / z ${INITIAL.minZ}..${INITIAL.maxZ}</text>${componentPlanBoxes}<path d="${routePath(currentReturn)}" fill="none" stroke="#65c7ff" stroke-width="4" stroke-linejoin="round"/><path d="${independentPath ? routePath(independentPath) : ''}" fill="none" stroke="#69d391" stroke-width="4" stroke-linejoin="round"/><text x="78" y="690" class="sub">Blue: fresh current ${currentReturn.length}-station path. Green: ${independentPath ? `${independentPath.length}-station independent path` : 'no independent path'}. Gold: ${finite.length}/${expanded.length} fully expanded finite gravity components.</text><text x="78" y="716" class="sub">All expanded components have zero fluid-adjacent cells. A later liner/bypass still needs one exact selected interaction set, ownership, protected-core/entity checks, inverse ordering, and post-state QA.</text></svg>\n`;

const base = {
  schemaVersion: 1, id: 'MP11-BKR-C01-PORTAL-TOPOLOGY-SECOND-RETURN-03', generatedAtUtc: new Date().toISOString(),
  status: returnResult.status === 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND' && finite.length === expanded.length ? 'TOPOLOGY_FINITE_AND_SECOND_RETURN_EVIDENCED_DESIGN_INPUT_ONLY' : 'HOLD_SECOND_INDEPENDENT_PORTAL_RETURN_NOT_EVIDENCED',
  mode: 'READ_ONLY_TOPOLOGY_EXPANSION_AND_RETURN_SURVEY', mutationAuthority: false,
  safetyBoundary: { liveWorldMutated: false, liveCallsPerformed: false, rconCallsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0, releaseManifestEmitted: false },
  source: { snapshot: rel(SNAPSHOT), captureManifest: rel(capturePath), captureManifestSha256: sha256(captureBytes), captureId: capture.captureId, bkrSurvey: rel(SURVEY), bkrSurveySha256: sha256(surveyBytes) },
  initialStudyBounds: INITIAL,
  expandedGravityTopology: { originalBoundaryComponentCount: initialBoundaryComponentCount, originalBoundarySeedCellCount: boundarySeeds.length, originalBoundarySeedCellSetSha256: stateHash(boundarySeeds), expandedComponentCount: expanded.length, finiteComponentCount: finite.length, unboundedComponentCount: expanded.length - finite.length, components: expanded },
  currentReturn: { stationCount: currentReturn.length, stationSetSha256: pointHash(currentReturn), startAnchor: startBox, endAnchor: endBox, normalWalkConnectivity: route.connectivity, requiredEnvelopeMet: route.meetsClearEnvelope === true },
  independentReturnSurvey: returnResult,
  physicalScopeDisposition: {
    physicalOperationMayBeCompiled: false,
    containerMigrationRequiredForPortalTopology: false,
    reason: returnResult.status === 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND'
      ? 'No physical package is emitted by this survey; choose and separately bind one finite component plus the full safety kernel.'
      : 'All expanded gravity components are finite in the immutable source, but no second genuinely independent portal return was found. This remains a hard stop for portal physical work.',
    firstNextDesign: returnResult.status === 'SECOND_INDEPENDENT_PORTAL_RETURN_FOUND'
      ? 'Select exactly one finite gravity component or one fully separated dry-bypass envelope; bind its complete interaction halo, ownership, protected-core/container/entity inventory, canonical source/target/inverse states, and no-falling rollback order before any compiler is considered.'
      : 'Survey and design a separately routed emergency/alternate portal return with no overlap with the current return’s stair/interior-halo or selected containment component; then re-run this gate from a fresh complete source.',
  },
  nonClaims: ['No physical operations or release manifest.', 'No liner, dry bypass, drainage receiver, container migration, route widening, egress opening, or commissioning.', 'No live entity clearance.'],
};
const report = { ...base, decisionIdentitySha256: sha256(`${JSON.stringify(base, null, 2)}\n`) };
const out = abs(OUT); fail(!fs.existsSync(out), '--out must be fresh'); fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-second-return-03.json'), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-second-return-map.svg'), map);
fs.writeFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-second-return-coordinate-plan.svg'), plan);
fs.writeFileSync(path.join(out, 'MP11-BKR-C01-PORTAL-TOPOLOGY-SECOND-RETURN-03.md'), `# MP11 / BKR C01 portal gravity expansion and second-return survey 03\n\n**Status:** \`${report.status}\`  \n**Authority:** read-only; no operations or release authority.\n\n![Topology and return map](mp11-bkr-c01-portal-topology-second-return-map.svg)\n\n![Coordinate plan](mp11-bkr-c01-portal-topology-second-return-coordinate-plan.svg)\n\nThe first-stage boundary gravity components were expanded through the complete immutable source. **${finite.length}/${expanded.length}** are finite. The current portal-to-L1 path has **${currentReturn.length}** stations. The independent-return search removes the complete one-cell horizontal halo of its interior stations and finds **${independentPath ? `${independentPath.length} second-return stations` : 'no second independent return'}**. Therefore no physical liner or separated dry bypass is compiled here.\n`);
console.log(JSON.stringify({ status: report.status, out: rel(out), mutationAuthority: false, expandedComponents: expanded.length, finiteComponents: finite.length, unboundedComponents: expanded.length - finite.length, secondReturn: returnResult.status, secondReturnStations: returnResult.stationCount ?? 0 }, null, 2));
