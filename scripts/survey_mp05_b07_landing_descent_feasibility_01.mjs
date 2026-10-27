#!/usr/bin/env node
/**
 * Read-only, source-bound feasibility screen for the missing B07 surface
 * landing/descent.  The four cardinal studies are diagnostic clearance prisms,
 * not proposed construction targets: they deliberately carry no desired block
 * state, no operation file, and no claim of ownership.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b07-landing-descent-feasibility-01-20260826T123537Z');
const MARKDOWN_OUT = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-LANDING-DESCENT-FEASIBILITY-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T13:28:00Z');
const SURFACE_RECEIVER_REPORT = value('--surface-receiver-report', 'data/world-review/mp05-b07-surface-receiver-survey-01-20260826T123537Z/surface-receiver-survey.json');
const OWNERSHIP_REPORT = value('--ownership-report', 'data/world-review/mp05-b07-ownership-interface-contract-01-20260826T123537Z/ownership-interface-contract-findings.json');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isWoody = (state) => /(?:_leaves|_log|_wood|_stem|_hyphae|bamboo|mangrove_roots)$/.test(stateName(state).slice('minecraft:'.length));
const NATURAL_STABLE_BLOCKS = new Set([
  'minecraft:grass_block', 'minecraft:dirt', 'minecraft:coarse_dirt', 'minecraft:podzol', 'minecraft:mycelium',
  'minecraft:stone', 'minecraft:deepslate', 'minecraft:andesite', 'minecraft:diorite', 'minecraft:granite',
  'minecraft:tuff', 'minecraft:calcite', 'minecraft:sandstone', 'minecraft:red_sandstone', 'minecraft:terracotta',
  'minecraft:clay', 'minecraft:mud', 'minecraft:netherrack', 'minecraft:end_stone',
]);
const isNaturalStable = (state) => NATURAL_STABLE_BLOCKS.has(stateName(state));
const manifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const uniqueRecords = (records) => {
  const result = new Map();
  for (const record of records) result.set(cellKey(record.cell), record);
  return [...result.values()].sort((a, b) => cellKey(a.cell).localeCompare(cellKey(b.cell)));
};
const countStates = (records) => Object.fromEntries([...records.reduce((result, { state }) => {
  result.set(state, (result.get(state) ?? 0) + 1);
  return result;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `Missing immutable snapshot member: ${member}`);
}
for (const report of [SURFACE_RECEIVER_REPORT, OWNERSHIP_REPORT]) invariant(fs.existsSync(abs(report)), `Missing prerequisite B07 report: ${report}`);
const capture = JSON.parse(fs.readFileSync(abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
const surfaceReceiver = JSON.parse(fs.readFileSync(abs(SURFACE_RECEIVER_REPORT), 'utf8'));
const ownership = JSON.parse(fs.readFileSync(abs(OWNERSHIP_REPORT), 'utf8'));
invariant(surfaceReceiver.source.captureId === capture.captureId, 'Surface-receiver report is not bound to this immutable source');
invariant(ownership.disposition?.permittedAction === 'READ_ONLY_DESIGN_AND_OWNER_ACCEPTANCE_ONLY', 'Ownership prerequisite is no longer the expected default-closed record');

const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};
const stateRecord = async (cell) => ({ cell, state: await stateAt(cell) });
const stepPoint = (study, step, lateral) => ({
  x: study.origin.x + study.vector.x * step + study.lateral.x * lateral,
  y: 0,
  z: study.origin.z + study.vector.z * step + study.lateral.z * lateral,
});
const floorAt = (step) => 72 - Math.floor((step + 1) / 2);

// These are four equal 24-station / 3-wide diagnostic studies.  Their grade
// drops at most one block between adjacent stations.  They are not a route
// selection and do not prescribe filling, excavation, doors, or materials.
const studies = [
  { id: 'B07-LANDING-DESCENT-NORTH-DIAGNOSTIC', direction: 'north', origin: { x: 2108, z: -402 }, vector: { x: 0, z: -1 }, lateral: { x: 1, z: 0 } },
  { id: 'B07-LANDING-DESCENT-SOUTH-DIAGNOSTIC', direction: 'south', origin: { x: 2108, z: -394 }, vector: { x: 0, z: 1 }, lateral: { x: 1, z: 0 } },
  { id: 'B07-LANDING-DESCENT-WEST-DIAGNOSTIC', direction: 'west', origin: { x: 2104, z: -398 }, vector: { x: -1, z: 0 }, lateral: { x: 0, z: 1 } },
  { id: 'B07-LANDING-DESCENT-EAST-DIAGNOSTIC', direction: 'east', origin: { x: 2112, z: -398 }, vector: { x: 1, z: 0 }, lateral: { x: 0, z: 1 } },
];

const terrainAt = async (x, z) => {
  for (let y = 90; y >= 36; y -= 1) {
    const state = await stateAt({ x, y, z });
    if (!isAir(state) && !isFluid(state)) return { x, y, z, state };
  }
  return { x, y: null, z, state: 'minecraft:air' };
};

const studyResults = [];
for (const study of studies) {
  const floorCells = [];
  const clearanceCells = [];
  const stations = [];
  for (let step = 0; step < 24; step += 1) {
    const floorY = floorAt(step);
    const lanes = [];
    for (const lateral of [-1, 0, 1]) {
      const base = stepPoint(study, step, lateral);
      const floor = { ...base, y: floorY };
      const feet = { ...base, y: floorY + 1 };
      const head = { ...base, y: floorY + 2 };
      floorCells.push(floor);
      clearanceCells.push(feet, head);
      lanes.push({ lateral, floor, feet, head, floorState: await stateAt(floor), feetState: await stateAt(feet), headState: await stateAt(head), terrain: await terrainAt(base.x, base.z) });
    }
    stations.push({
      step,
      floorY,
      lanes,
      naturalStableFootingAtStudyGrade: lanes.every(({ floorState }) => isNaturalStable(floorState)),
      allClearanceAirAtStudyGrade: lanes.every(({ feetState, headState }) => isAir(feetState) && isAir(headState)),
    });
  }
  const floorRecords = await Promise.all(floorCells.map(stateRecord));
  const clearanceRecords = await Promise.all(clearanceCells.map(stateRecord));
  const prism = uniqueCells([...floorCells, ...clearanceCells]);
  const constrained = uniqueRecords([...floorRecords, ...clearanceRecords].filter(({ state }) => isFluid(state) || isGravity(state) || isWoody(state)));
  const clearanceIntrusions = clearanceRecords.filter(({ state }) => !isAir(state));
  const supportVoidsOrHazards = floorRecords.filter(({ state }) => isAir(state) || isFluid(state) || isGravity(state));
  const endpointStations = stations.filter(({ naturalStableFootingAtStudyGrade, allClearanceAirAtStudyGrade }) => naturalStableFootingAtStudyGrade && allClearanceAirAtStudyGrade);
  const acceptedR07jDeckIntersection = floorCells.filter(({ x, y, z }) => x >= 2105 && x <= 2111 && y === 72 && z >= -401 && z <= -395);
  studyResults.push({
    ...study,
    diagnosticGrade: { stationCount: stations.length, firstFloorY: stations[0].floorY, lastFloorY: stations.at(-1).floorY, maximumAdjacentDrop: 1 },
    diagnosticPrism: manifest(prism),
    sourceInventory: {
      floorStateCensus: countStates(floorRecords),
      clearanceStateCensus: countStates(clearanceRecords),
      clearanceIntrusions: { ...manifest(clearanceIntrusions.map(({ cell }) => cell)), stateCensus: countStates(clearanceIntrusions) },
      supportVoidsOrFluidOrGravity: { ...manifest(supportVoidsOrHazards.map(({ cell }) => cell)), stateCensus: countStates(supportVoidsOrHazards) },
      woodyFluidGravityInteractions: { ...manifest(constrained.map(({ cell }) => cell)), records: constrained },
      acceptedR07jDeckIntersection: manifest(acceptedR07jDeckIntersection),
    },
    endpointScreen: {
      qualifyingThreeWideNaturalTerrainStations: manifest(endpointStations.flatMap(({ lanes }) => lanes.map(({ floor }) => floor))),
      stationIndexes: endpointStations.map(({ step }) => step),
      result: endpointStations.length ? 'SOURCE_GEOMETRY_HAS_A_THREE_WIDE_NATURAL_STUDY_ENDPOINT_BUT_OWNERSHIP_AND_ALL_INTERFACE_GATES_REMAIN_CLOSED' : 'NO_THREE_WIDE_NATURAL_STUDY_ENDPOINT_ON_DIAGNOSTIC_GRADE',
    },
    stations,
    ownershipDisposition: 'NO_ACCEPTED_EXTERIOR_OWNER_OR_ROUTE_OWNER: diagnostic cells beyond the accepted R07J deck have no accepted construction owner; R07J deck intersection remains accepted closed architecture.',
  });
}

const diagnosticBounds = boundsOf(studyResults.flatMap(({ diagnosticPrism }) => {
  const bounds = diagnosticPrism.bounds;
  const cells = [];
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
  return cells;
}));
const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(diagnosticBounds.minX / 16); chunkX <= Math.floor(diagnosticBounds.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(diagnosticBounds.minZ / 16); chunkZ <= Math.floor(diagnosticBounds.maxZ / 16); chunkZ += 1) {
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (point.x >= diagnosticBounds.minX && point.x <= diagnosticBounds.maxX && point.y >= diagnosticBounds.minY && point.y <= diagnosticBounds.maxY && point.z >= diagnosticBounds.minZ && point.z <= diagnosticBounds.maxZ) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3 && position[0] >= diagnosticBounds.minX && position[0] < diagnosticBounds.maxX + 1 && position[1] >= diagnosticBounds.minY && position[1] < diagnosticBounds.maxY + 1 && position[2] >= diagnosticBounds.minZ && position[2] < diagnosticBounds.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
    }
  }
}

const walkBounds = { minX: 2076, maxX: 2140, minY: 36, maxY: 76, minZ: -426, maxZ: -370 };
const walkNodes = new Map();
for (let x = walkBounds.minX; x <= walkBounds.maxX; x += 1) {
  for (let z = walkBounds.minZ; z <= walkBounds.maxZ; z += 1) {
    for (let y = walkBounds.minY; y <= walkBounds.maxY; y += 1) {
      const feet = await stateAt({ x, y, z });
      const head = await stateAt({ x, y: y + 1, z });
      const support = await stateAt({ x, y: y - 1, z });
      if (isAir(feet) && isAir(head) && !isAir(support) && !isFluid(support) && !isGravity(support)) walkNodes.set(`${x},${y},${z}`, { x, y, z, support });
    }
  }
}
const componentFrom = (starts) => {
  const queue = starts.map(cellKey).filter((key) => walkNodes.has(key));
  const visited = new Set(queue);
  while (queue.length) {
    const current = walkNodes.get(queue.shift());
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) for (const dy of [-1, 0, 1]) {
      const next = `${current.x + dx},${current.y + dy},${current.z + dz}`;
      if (walkNodes.has(next) && !visited.has(next)) { visited.add(next); queue.push(next); }
    }
  }
  return [...visited].map((key) => walkNodes.get(key));
};
const currentWalkComponent = componentFrom([{ x: 2108, y: 73, z: -402 }, { x: 2108, y: 73, z: -394 }, { x: 2104, y: 73, z: -398 }, { x: 2112, y: 73, z: -398 }]);
const naturalNodes = currentWalkComponent.filter(({ support }) => isNaturalStable(support));

const mapBounds = { minX: 2078, maxX: 2138, minZ: -424, maxZ: -372 };
const terrain = [];
for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 1) for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 1) terrain.push(await terrainAt(x, z));
const studyLabels = new Map();
for (const study of studyResults) for (const { lanes } of study.stations) for (const { floor } of lanes) {
  const key = `${floor.x},${floor.z}`;
  studyLabels.set(key, `${study.direction[0].toUpperCase()}`);
}
const renderPlan = () => {
  const unit = 9; const left = 65; const top = 52; const width = left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 195; const height = top + (mapBounds.maxZ - mapBounds.minZ + 1) * unit + 26;
  const minimum = Math.min(...terrain.filter(({ y }) => y !== null).map(({ y }) => y)); const maximum = Math.max(...terrain.filter(({ y }) => y !== null).map(({ y }) => y));
  const rects = terrain.map(({ x, y, z, state }) => {
    const amount = y === null ? 0 : (y - minimum) / Math.max(1, maximum - minimum);
    const fill = isWoody(state) ? '#4f7c3d' : stateName(state).includes('ice') ? '#9bd4e6' : `rgb(${Math.round(242 - 80 * amount)},${Math.round(246 - 56 * amount)},${Math.round(250 - 37 * amount)})`;
    const label = studyLabels.get(`${x},${z}`) ?? (x >= 2105 && x <= 2111 && z >= -401 && z <= -395 ? 'H' : '');
    return `<rect x="${left + (x - mapBounds.minX) * unit}" y="${top + (z - mapBounds.minZ) * unit}" width="${unit}" height="${unit}" fill="${fill}" stroke="#cdd8de" stroke-width=".25"><title>${escapeXml(`${x},${z}; highest non-air/non-fluid=${y}, ${state}; study=${studyLabels.get(`${x},${z}`) ?? 'none'}`)}</title></rect>${label ? `<text x="${left + (x - mapBounds.minX) * unit + 1}" y="${top + (z - mapBounds.minZ) * unit + 7}" font-size="6">${label}</text>` : ''}`;
  }).join('');
  const labels = Array.from({ length: mapBounds.maxX - mapBounds.minX + 1 }, (_, i) => mapBounds.minX + i).filter((_, i) => i % 6 === 0).map((x) => `<text x="${left + (x - mapBounds.minX) * unit}" y="${top - 7}" font-size="6">${x}</text>`).join('')
    + Array.from({ length: mapBounds.maxZ - mapBounds.minZ + 1 }, (_, i) => mapBounds.minZ + i).filter((_, i) => i % 6 === 0).map((z) => `<text x="${left - 38}" y="${top + (z - mapBounds.minZ) * unit + 7}" font-size="6">${z}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:16px;font-weight:700}.note{font-size:9px}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">MP05 B07 landing/descent diagnostic terrain plan</text><text class="note" x="12" y="37">Source top elevation; N/S/W/E label equal-width diagnostic prisms, H=accepted fail-closed headhouse. Labels are not a route selection.</text>${rects}${labels}<text x="${left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 15}" y="75" class="note">Top elevation: ${minimum}..${maximum}</text><text x="${left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 15}" y="94" class="note">Blue = lower, gray = higher</text><text x="${left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 15}" y="113" class="note">Green = woody canopy</text><text x="${left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 15}" y="132" class="note">Cyan = ice</text></svg>`;
};
const renderProfiles = () => {
  const unitX = 20; const unitY = 7; const left = 85; const top = 72; const panel = 300; const height = 690;
  const parts = [];
  for (const [index, study] of studyResults.entries()) {
    const panelLeft = left + (index % 2) * 420; const panelTop = top + Math.floor(index / 2) * panel;
    const yMax = 76; const yMin = 48;
    const ground = study.stations.map(({ lanes }) => Math.max(...lanes.map(({ terrain }) => terrain.y ?? yMin)));
    const floor = study.stations.map(({ floorY }) => floorY);
    const point = (step, y) => `${panelLeft + step * unitX / 1.25},${panelTop + (yMax - y) * unitY}`;
    const groundLine = ground.map((y, step) => point(step, y)).join(' '); const floorLine = floor.map((y, step) => point(step, y)).join(' ');
    const stationMarks = study.stations.map(({ step, floorY, allClearanceAirAtStudyGrade, naturalStableFootingAtStudyGrade }) => {
      const fill = naturalStableFootingAtStudyGrade && allClearanceAirAtStudyGrade ? '#22c55e' : allClearanceAirAtStudyGrade ? '#f59e0b' : '#ef4444';
      return `<circle cx="${panelLeft + step * unitX / 1.25}" cy="${panelTop + (yMax - floorY) * unitY}" r="2" fill="${fill}"/>`;
    }).join('');
    const yLabels = [76, 72, 68, 64, 60, 56, 52, 48].map((y) => `<text x="${panelLeft - 28}" y="${panelTop + (yMax - y) * unitY + 3}" font-size="7">${y}</text><line x1="${panelLeft}" y1="${panelTop + (yMax - y) * unitY}" x2="${panelLeft + 370}" y2="${panelTop + (yMax - y) * unitY}" stroke="#e8eef2"/>`).join('');
    parts.push(`<text x="${panelLeft}" y="${panelTop - 31}" font-size="13" font-weight="700">${study.direction.toUpperCase()} diagnostic grade</text><text x="${panelLeft}" y="${panelTop - 16}" font-size="8">station 0..23 · y = source top terrain / diagnostic floor</text>${yLabels}<polyline fill="none" stroke="#6b7280" stroke-width="2" points="${groundLine}"/><polyline fill="none" stroke="#2563eb" stroke-width="2" points="${floorLine}"/>${stationMarks}<text x="${panelLeft + 4}" y="${panelTop + 213}" font-size="8">gray source terrain · blue study floor</text><text x="${panelLeft + 4}" y="${panelTop + 226}" font-size="8">red clearance · amber support · green grade match</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="880" height="${height}" viewBox="0 0 880 ${height}"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:16px;font-weight:700}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">MP05 B07 four cardinal landing/descent diagnostic profiles</text>${parts.join('')}</svg>`;
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
const maps = [
  ['b07-landing-descent-terrain-plan.svg', renderPlan()],
  ['b07-landing-descent-profiles.svg', renderProfiles()],
];
for (const [filename, svg] of maps) fs.writeFileSync(abs(path.join(OUT_DIR, filename)), svg);

const result = {
  schemaVersion: 1,
  id: 'MP05-B07-LANDING-DESCENT-FEASIBILITY-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_NO_FULLY_OWNED_LANDING_OR_DESCENT_OPTION',
  purpose: 'Read-only terrain, normal-walk, and ownership feasibility study for the B07 missing surface receiver/descent. Diagnostic prisms do not carry desired states or construction authority.',
  source: { snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureIdentity: capture.id, requiredMembersPresent: true },
  bindings: {
    surfaceReceiverSurvey: { path: rel(SURFACE_RECEIVER_REPORT), reportIdentitySha256: surfaceReceiver.reportIdentitySha256 },
    ownershipScreen: { path: rel(OWNERSHIP_REPORT), reportIdentitySha256: ownership.reportIdentitySha256 },
  },
  studyRule: 'Each study is 24 stations, three blocks wide, and uses a diagnostic floor dropping no more than one block at a station transition. It inventories source intersections only; it is not a desired-state path, landing design, grade approval, or operation.',
  cardinalStudies: studyResults.map(({ stations, ...study }) => study),
  normalWalkTopology: {
    definition: 'Feet and head are air; support is non-air, non-fluid, and non-gravity; cardinal move with at most one Y-level transition. This is a current-state conservative topology screen, not a life-safety certification.',
    bounds: walkBounds,
    componentFromAllFourClosedFaces: { ...manifest(currentWalkComponent), normalWalkNodeCount: currentWalkComponent.length, naturalStableTerrainNodes: manifest(naturalNodes), reachesNaturalStableTerrain: naturalNodes.length > 0 },
    conclusion: naturalNodes.length ? 'CURRENT_COMPONENT_REACHES_NATURAL_TERRAIN_WITHIN_SCREEN_BOUNDS' : 'CURRENT_DECK_COMPONENT_DOES_NOT_REACH_NATURAL_TERRAIN_WITHIN_SCREEN_BOUNDS',
  },
  protectedContext: { diagnosticBounds, immutableBlockEntities: blockEntities, immutableSavedEntities: savedEntities, conclusion: 'Absence or presence in this source census is preservation evidence only; it does not grant ownership or permit migration.' },
  ownershipDecision: {
    acceptedExteriorReceiverOwner: null,
    acceptedSurfaceRouteOwner: null,
    acceptedLandingOwner: null,
    acceptedR07jClosedDeckIntersection: manifest(studyResults.flatMap(({ sourceInventory }) => {
      const bounds = sourceInventory.acceptedR07jDeckIntersection.bounds;
      if (!bounds) return [];
      const cells = [];
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) for (let y = bounds.minY; y <= bounds.maxY; y += 1) for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) cells.push({ x, y, z });
      return cells;
    })),
    fullyOwnedStudyExists: false,
    result: 'NO_FULLY_OWNED_STUDY_EXISTS. All four diagnostic descent prisms leave accepted R07J closed architecture and enter unassigned exterior terrain; neither a landing nor a reciprocal boundary/failure receiver has an accepted owner.',
  },
  releaseDisposition: {
    physicalReleaseAuthorized: false,
    prohibitedByCurrentEvidence: ['doorway or cap opening', 'landing or descent construction', 'surface excavation/fill', 'tree, gravity, fluid, block-entity, or entity migration', 'route or egress commissioning', 'forward or rollback operation compilation'],
    necessaryBeforeReconsideration: ['accepted exterior receiver, landing, and surface-route ownership with reciprocal interface/failure state', 'exact terrain/woody/fluid/gravity preservation or reviewed migration treatment', 'integrated B07 wet-transfer and gravity doctrine', 'normal-walk route/end-point, power, smoke, drainage, access-control, and independent-egress contracts', 'fresh complete source capture and scoped guarded physical-release kernel'],
  },
  maps: maps.map(([filename]) => ({ path: `${rel(OUT_DIR)}/${filename}`, sha256: sha256(fs.readFileSync(abs(path.join(OUT_DIR, filename)))) })),
  renderedMaps: maps
    .map(([filename]) => filename.replace(/\.svg$/, '.png'))
    .filter((filename) => fs.existsSync(abs(path.join(OUT_DIR, filename))) )
    .map((filename) => ({
      path: `${rel(OUT_DIR)}/${filename}`,
      sha256: sha256(fs.readFileSync(abs(path.join(OUT_DIR, filename)))),
    })),
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, capturePerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
};
result.reportIdentitySha256 = sha256(`${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'landing-descent-feasibility.json')), `${JSON.stringify(result, null, 2)}\n`);

const rows = result.cardinalStudies.map((study) => `| ${study.direction} | ${study.diagnosticPrism.cellCount} | ${study.sourceInventory.clearanceIntrusions.cellCount} | ${study.sourceInventory.supportVoidsOrFluidOrGravity.cellCount} | ${study.sourceInventory.woodyFluidGravityInteractions.cellCount} | ${study.endpointScreen.stationIndexes.length ? study.endpointScreen.stationIndexes.join(', ') : 'none'} | no |`).join('\n');
const markdown = `# MP05 B07 landing/descent feasibility 01

**Status:** \`${result.status}\`  
**Immutable source:** \`${result.source.snapshotRoot}\` (capture \`${result.source.captureId}\`)  
**Machine findings:** [JSON](../../../${rel(path.join(OUT_DIR, 'landing-descent-feasibility.json'))})

This is a read-only diagnostic study of the missing B07 surface receiver/landing/descent. It does not select a headhouse face, route, grade, material, endpoint, or operation. The terrain prisms are only equal-size source-intersection probes.

## Source maps

- Terrain and four diagnostic prisms: [SVG](../../../${rel(path.join(OUT_DIR, 'b07-landing-descent-terrain-plan.svg'))}), [rendered PNG](../../../${rel(path.join(OUT_DIR, 'b07-landing-descent-terrain-plan.png'))})
- Four cardinal terrain/grade profiles: [SVG](../../../${rel(path.join(OUT_DIR, 'b07-landing-descent-profiles.svg'))}), [rendered PNG](../../../${rel(path.join(OUT_DIR, 'b07-landing-descent-profiles.png'))})

## Four equal diagnostic studies

Each probe is three blocks wide by 24 stations, with a source-analysis-only floor that never drops more than one block between adjacent stations. “Clearance intrusion” is a non-air source block in the feet/head volume; “support hazard” is air, fluid, or gravity at the diagnostic floor. Neither column is an operation count.

| Direction | Prism cells | Clearance intrusions | Support hazards | Woody/fluid/gravity interactions | Three-wide natural-grade stations | Fully owned? |
|---|---:|---:|---:|---:|---|---|
${rows}

## Current topology and ownership result

The current normal-walk component from all four external face cells has **${result.normalWalkTopology.componentFromAllFourClosedFaces.normalWalkNodeCount}** nodes and ${result.normalWalkTopology.componentFromAllFourClosedFaces.reachesNaturalStableTerrain ? 'does' : 'does not'} reach a natural stable terrain node within the screen bounds. The headhouse remains a fail-closed R07J asset; there is no accepted exterior receiver, landing, or surface-route owner. Every study therefore intersects either accepted closed architecture or unassigned terrain before it could become a route.

The diagnostic census found **${result.protectedContext.immutableBlockEntities.length} block entities** and **${result.protectedContext.immutableSavedEntities.length} saved entities** in the combined study bounds. Those records are preservation inputs only; no migration is authorized.

**No fully owned B07 landing/descent option exists on this source.** A geometric terrain station, if present in the diagnostics, is not a classified receiver and cannot be promoted into a build target by this report.

## Disposition

No doorway, cap, landing, descent, terrain alteration, migration, route, or egress commissioning is authorized. Reconsider only after the integrated B07 ownership/interface, hydrology, gravity, access-control, lighting/power, smoke, drainage, independent-egress, and exact current-state release-kernel inputs are accepted.
`;
fs.mkdirSync(path.dirname(abs(MARKDOWN_OUT)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN_OUT), markdown);
console.log(JSON.stringify({ status: result.status, report: rel(path.join(OUT_DIR, 'landing-descent-feasibility.json')), markdown: rel(MARKDOWN_OUT), cardinalStudies: result.cardinalStudies.map(({ direction, diagnosticPrism, sourceInventory, endpointScreen }) => ({ direction, prismCells: diagnosticPrism.cellCount, clearanceIntrusions: sourceInventory.clearanceIntrusions.cellCount, supportHazards: sourceInventory.supportVoidsOrFluidOrGravity.cellCount, woodyFluidGravity: sourceInventory.woodyFluidGravityInteractions.cellCount, terrainStations: endpointScreen.stationIndexes })), normalWalk: result.normalWalkTopology.componentFromAllFourClosedFaces, fullyOwnedStudyExists: result.ownershipDecision.fullyOwnedStudyExists, reportIdentitySha256: result.reportIdentitySha256 }, null, 2));
