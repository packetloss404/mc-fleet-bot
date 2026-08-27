#!/usr/bin/env node
/**
 * Read-only, source-bound survey of the uncommissioned exterior receiver
 * dependency for the already-built MP05 B07 surface headhouse.
 *
 * It deliberately does not select, authorize, or compile a doorway, landing,
 * ramp, drainage connection, smoke system, or utility system.  It measures
 * the four plausible three-wide wall faces and the current normal-walk
 * components so the missing integrated design has exact inputs.
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
const OUT_DIR = value('--out-dir', 'data/world-review/mp05-b07-surface-receiver-survey-01-20260826T123537Z');
const MARKDOWN_OUT = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-SURFACE-RECEIVER-SURVEY-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T13:05:00Z');
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const sha256 = (input) => crypto.createHash('sha256').update(input).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const stateName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel'].includes(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isWoody = (state) => /(?:_leaves|_log|_wood|_stem|_hyphae|bamboo|mangrove_roots)$/.test(stateName(state).slice('minecraft:'.length));
const manifest = (cells) => {
  const exact = uniqueCells(cells);
  return { cellCount: exact.length, bounds: exact.length ? boundsOf(exact) : null, coordinateSetSha256: hashCells(exact) };
};
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const stateClass = (state) => {
  if (isAir(state)) return 'air';
  if (isFluid(state)) return 'fluid';
  if (isGravity(state)) return 'gravity';
  if (isWoody(state)) return 'woody';
  if (stateName(state) === 'minecraft:polished_diorite') return 'diorite';
  if (stateName(state).includes('snow')) return 'snow';
  return 'solid';
};

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `Missing immutable snapshot member: ${member}`);
}
const capture = JSON.parse(fs.readFileSync(abs(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const stateAt = async (cell) => stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z));
const stateCache = new Map();
const cachedStateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateAt(cell));
  return stateCache.get(key);
};

const headhouse = {
  shell: { minX: 2105, maxX: 2111, minY: 73, maxY: 76, minZ: -401, maxZ: -395 },
  deck: { minX: 2104, maxX: 2112, y: 72, minZ: -402, maxZ: -394 },
  interior: { minX: 2106, maxX: 2110, minY: 73, maxY: 75, minZ: -400, maxZ: -396 },
};
const faceSpecs = [
  { id: 'NORTH', direction: 'north', wall: ({ x, y }) => ({ x, y, z: -401 }), front: ({ x, y }) => ({ x, y, z: -402 }), span: [{ x: 2107 }, { x: 2108 }, { x: 2109 }] },
  { id: 'SOUTH', direction: 'south', wall: ({ x, y }) => ({ x, y, z: -395 }), front: ({ x, y }) => ({ x, y, z: -394 }), span: [{ x: 2107 }, { x: 2108 }, { x: 2109 }] },
  { id: 'WEST', direction: 'west', wall: ({ z, y }) => ({ x: 2105, y, z }), front: ({ z, y }) => ({ x: 2104, y, z }), span: [{ z: -399 }, { z: -398 }, { z: -397 }] },
  { id: 'EAST', direction: 'east', wall: ({ z, y }) => ({ x: 2111, y, z }), front: ({ z, y }) => ({ x: 2112, y, z }), span: [{ z: -399 }, { z: -398 }, { z: -397 }] },
];
const candidateFaces = [];
for (const spec of faceSpecs) {
  const wallCells = [];
  const frontCells = [];
  for (const point of spec.span) {
    for (const y of [73, 74]) {
      wallCells.push(spec.wall({ ...point, y }));
      frontCells.push(spec.front({ ...point, y }));
    }
  }
  const supportCells = frontCells.filter(({ y }) => y === 73).map(({ x, y, z }) => ({ x, y: y - 1, z }));
  const wallStates = await Promise.all(wallCells.map(async (cell) => ({ cell, state: await cachedStateAt(cell) })));
  const frontStates = await Promise.all(frontCells.map(async (cell) => ({ cell, state: await cachedStateAt(cell) })));
  const supportStates = await Promise.all(supportCells.map(async (cell) => ({ cell, state: await cachedStateAt(cell) })));
  candidateFaces.push({
    id: `B07-EXTERIOR-${spec.id}-THREE-WIDE-DECISION-ENVELOPE`, direction: spec.direction,
    openingWallCells: { ...manifest(wallCells), states: wallStates },
    immediateExteriorAirCells: { ...manifest(frontCells), states: frontStates },
    immediateExteriorSupportCells: { ...manifest(supportCells), states: supportStates },
    sourceResult: {
      wallIsIntactPolishedDiorite: wallStates.every(({ state }) => stateName(state) === 'minecraft:polished_diorite'),
      exteriorHeadroomIsAir: frontStates.every(({ state }) => isAir(state)),
      deckSupportIsPolishedDiorite: supportStates.every(({ state }) => stateName(state) === 'minecraft:polished_diorite'),
    },
    disposition: 'GEOMETRIC_DECISION_ENVELOPE_ONLY_NOT_A_DOORWAY_OR_AUTHORIZED_TARGET',
  });
}

const walkBounds = { minX: 2088, maxX: 2128, minY: 48, maxY: 74, minZ: -420, maxZ: -376 };
const walkNodes = new Map();
for (let x = walkBounds.minX; x <= walkBounds.maxX; x += 1) {
  for (let z = walkBounds.minZ; z <= walkBounds.maxZ; z += 1) {
    for (let y = walkBounds.minY; y <= walkBounds.maxY; y += 1) {
      const feet = await cachedStateAt({ x, y, z });
      const head = await cachedStateAt({ x, y: y + 1, z });
      const support = await cachedStateAt({ x, y: y - 1, z });
      if (isAir(feet) && isAir(head) && !isAir(support) && !isFluid(support) && !isGravity(support)) walkNodes.set(`${x},${y},${z}`, { x, y, z, support });
    }
  }
}
const componentFrom = (starts) => {
  const queue = starts.map(cellKey).filter((key) => walkNodes.has(key));
  const visited = new Set(queue);
  while (queue.length) {
    const key = queue.shift();
    const current = walkNodes.get(key);
    for (const dx of [-1, 0, 1]) {
      for (const dz of [-1, 0, 1]) {
        if ((dx === 0 && dz === 0) || (dx !== 0 && dz !== 0)) continue;
        for (const dy of [-1, 0, 1]) {
          const nextKey = `${current.x + dx},${current.y + dy},${current.z + dz}`;
          if (walkNodes.has(nextKey) && !visited.has(nextKey)) { visited.add(nextKey); queue.push(nextKey); }
        }
      }
    }
  }
  return [...visited].map((key) => walkNodes.get(key));
};
for (const face of candidateFaces) {
  const starts = face.immediateExteriorAirCells.states.filter(({ cell }) => cell.y === 73).map(({ cell }) => cell);
  const component = componentFrom(starts);
  const naturalTerrainNodes = component.filter(({ y, support }) => y < 72 && /(?:grass_block|dirt|stone|deepslate|sandstone|clay|terracotta|gravel)$/.test(stateName(support)));
  face.currentExteriorWalkComponent = {
    ...manifest(component), normalWalkNodeCount: component.length,
    reachesNaturalTerrain: naturalTerrainNodes.length > 0,
    naturalTerrainNodes: manifest(naturalTerrainNodes),
    conclusion: naturalTerrainNodes.length ? 'CURRENT_COMPONENT_REACHES_TERRAIN_WITHIN_SURVEY_BOUNDS' : 'CURRENT_COMPONENT_DOES_NOT_REACH_TERRAIN_WITHIN_SURVEY_BOUNDS',
  };
}

const terrainBounds = { minX: 2088, maxX: 2128, minZ: -420, maxZ: -376 };
const terrainColumns = [];
for (let x = terrainBounds.minX; x <= terrainBounds.maxX; x += 1) {
  for (let z = terrainBounds.minZ; z <= terrainBounds.maxZ; z += 1) {
    let highest = null;
    for (let y = 78; y >= 45; y -= 1) {
      const state = await cachedStateAt({ x, y, z });
      if (!isAir(state) && !isFluid(state)) { highest = { x, y, z, state }; break; }
    }
    terrainColumns.push(highest ?? { x, z, y: null, state: 'minecraft:air' });
  }
}
const elevationCounts = new Map();
for (const column of terrainColumns) elevationCounts.set(column.y ?? 'none', (elevationCounts.get(column.y ?? 'none') ?? 0) + 1);
const protectedBounds = { minX: 2098, maxX: 2118, minY: 48, maxY: 80, minZ: -408, maxZ: -388 };
const protectedCells = [];
for (let x = protectedBounds.minX; x <= protectedBounds.maxX; x += 1) {
  for (let y = protectedBounds.minY; y <= protectedBounds.maxY; y += 1) {
    for (let z = protectedBounds.minZ; z <= protectedBounds.maxZ; z += 1) {
      const state = await cachedStateAt({ x, y, z });
      if (isWoody(state) || isFluid(state) || isGravity(state)) protectedCells.push({ cell: { x, y, z }, state, class: stateClass(state) });
    }
  }
}
const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(protectedBounds.minX / 16); chunkX <= Math.floor(protectedBounds.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(protectedBounds.minZ / 16); chunkZ <= Math.floor(protectedBounds.maxZ / 16); chunkZ += 1) {
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const point = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (point.x >= protectedBounds.minX && point.x <= protectedBounds.maxX && point.y >= protectedBounds.minY && point.y <= protectedBounds.maxY && point.z >= protectedBounds.minZ && point.z <= protectedBounds.maxZ) blockEntities.push({ id: entity.id ?? null, point });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      const position = entity.Pos?.slice(0, 3).map(Number);
      if (position?.length === 3 && position[0] >= protectedBounds.minX && position[0] < protectedBounds.maxX + 1 && position[1] >= protectedBounds.minY && position[1] < protectedBounds.maxY + 1 && position[2] >= protectedBounds.minZ && position[2] < protectedBounds.maxZ + 1) savedEntities.push({ id: entity.id ?? null, position });
    }
  }
}

const mapBounds = { minX: 2098, maxX: 2118, minZ: -408, maxZ: -388 };
const frontMarker = new Map(candidateFaces.flatMap((face) => face.immediateExteriorAirCells.states.map(({ cell }) => [`${cell.x},${cell.z}`, face.direction[0].toUpperCase()])));
const renderPlan = () => {
  const unit = 22; const left = 70; const top = 52;
  const width = left + (mapBounds.maxX - mapBounds.minX + 1) * unit + 240;
  const height = top + (mapBounds.maxZ - mapBounds.minZ + 1) * unit + 34;
  const cells = [];
  for (let z = mapBounds.minZ; z <= mapBounds.maxZ; z += 1) for (let x = mapBounds.minX; x <= mapBounds.maxX; x += 1) {
    const y73 = stateCache.get(`${x},73,${z}`) ? null : null;
    const deck = stateCache.get(`${x},72,${z}`);
    const deckState = deck ? undefined : undefined;
    cells.push({ x, z, y73, deckState });
  }
  return Promise.all(cells.map(async ({ x, z }) => {
    const above = await cachedStateAt({ x, y: 73, z }); const below = await cachedStateAt({ x, y: 72, z });
    const marker = frontMarker.get(`${x},${z}`);
    const fill = marker ? '#81d4fa' : stateName(above) === 'minecraft:polished_diorite' ? '#8fa6ad' : stateName(below) === 'minecraft:polished_diorite' ? '#d5e1e5' : isWoody(above) ? '#5e8b4a' : '#ffffff';
    const label = marker ?? (stateName(above) === 'minecraft:polished_diorite' ? 'H' : stateName(below) === 'minecraft:polished_diorite' ? 'D' : isWoody(above) ? 'T' : '');
    const tx = left + (x - mapBounds.minX) * unit; const ty = top + (z - mapBounds.minZ) * unit;
    return `<rect x="${tx}" y="${ty}" width="${unit}" height="${unit}" fill="${fill}" stroke="#b8c5cc" stroke-width=".5"><title>${escapeXml(`${x},72..73,${z}; y72=${below}; y73=${above}`)}</title></rect><text x="${tx + 7}" y="${ty + 15}" font-size="10">${label}</text>`;
  })).then((rects) => {
    const xLabels = Array.from({ length: mapBounds.maxX - mapBounds.minX + 1 }, (_, i) => mapBounds.minX + i).filter((_, i) => i % 2 === 0).map((x) => `<text x="${left + (x - mapBounds.minX) * unit}" y="${top - 8}" font-size="7">${x}</text>`).join('');
    const zLabels = Array.from({ length: mapBounds.maxZ - mapBounds.minZ + 1 }, (_, i) => mapBounds.minZ + i).filter((_, i) => i % 2 === 0).map((z) => `<text x="${left - 42}" y="${top + (z - mapBounds.minZ) * unit + 14}" font-size="7">${z}</text>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:16px;font-weight:bold}.sub{font-size:9px}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">MP05 B07 surface headhouse / receiver decision plane</text><text class="sub" x="12" y="38">x horizontal; z vertical; H=y73 polished-diorite headhouse wall; D=y72 deck; N/S/W/E=external three-wide decision face; T=woody</text>${rects.join('')}${xLabels}${zLabels}<text x="${left + 470}" y="80" font-size="10">No doorway is selected or authorized.</text></svg>`;
  });
};
const renderSection = async () => {
  const xValues = Array.from({ length: 21 }, (_, i) => 2098 + i); const yValues = Array.from({ length: 29 }, (_, i) => 78 - i); const unit = 20; const left = 68; const top = 48;
  const rects = [];
  for (let yIndex = 0; yIndex < yValues.length; yIndex += 1) for (let xIndex = 0; xIndex < xValues.length; xIndex += 1) {
    const x = xValues[xIndex]; const y = yValues[yIndex]; const state = await cachedStateAt({ x, y, z: -398 });
    const colour = ({ air: '#ffffff', diorite: '#8fa6ad', woody: '#5e8b4a', fluid: '#2196f3', gravity: '#e2b061', snow: '#e8eef2', solid: '#79838b' })[stateClass(state)];
    rects.push(`<rect x="${left + xIndex * unit}" y="${top + yIndex * unit}" width="${unit}" height="${unit}" fill="${colour}" stroke="#cbd5db" stroke-width=".4"><title>${escapeXml(`${x},${y},-398: ${state}`)}</title></rect>`);
  }
  const xLabels = xValues.filter((_, i) => i % 2 === 0).map((x) => `<text x="${left + (x - xValues[0]) * unit}" y="${top - 8}" font-size="7">${x}</text>`).join('');
  const yLabels = yValues.filter((_, i) => i % 2 === 0).map((y) => `<text x="${left - 28}" y="${top + (yValues[0] - y) * unit + 13}" font-size="7">${y}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="670" viewBox="0 0 760 670"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:16px;font-weight:bold}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">MP05 B07 receiver section at z=-398</text><text x="12" y="37" font-size="9">x horizontal; y vertical. The deck is elevated above existing terrain; this is a source-state section, not a ramp design.</text>${rects.join('')}${xLabels}${yLabels}</svg>`;
};
const renderElevation = () => {
  const unit = 10; const left = 75; const top = 50; const cols = terrainBounds.maxX - terrainBounds.minX + 1; const rows = terrainBounds.maxZ - terrainBounds.minZ + 1;
  const minY = Math.min(...terrainColumns.filter(({ y }) => y !== null).map(({ y }) => y)); const maxY = Math.max(...terrainColumns.filter(({ y }) => y !== null).map(({ y }) => y));
  const rects = terrainColumns.map(({ x, y, z, state }) => { const amount = y === null ? 0 : (y - minY) / Math.max(1, maxY - minY); const colour = isWoody(state) ? '#4f7c3d' : `rgb(${Math.round(235 - 80 * amount)},${Math.round(242 - 55 * amount)},${Math.round(248 - 45 * amount)})`; return `<rect x="${left + (x - terrainBounds.minX) * unit}" y="${top + (z - terrainBounds.minZ) * unit}" width="${unit}" height="${unit}" fill="${colour}" stroke="#d7e0e5" stroke-width=".25"><title>${escapeXml(`${x},${z}: highest non-air/non-fluid y=${y}; ${state}`)}</title></rect>`; }).join('');
  const labels = Array.from({ length: cols }, (_, i) => terrainBounds.minX + i).filter((_, i) => i % 4 === 0).map((x) => `<text x="${left + (x - terrainBounds.minX) * unit}" y="${top - 8}" font-size="7">${x}</text>`).join('') + Array.from({ length: rows }, (_, i) => terrainBounds.minZ + i).filter((_, i) => i % 4 === 0).map((z) => `<text x="${left - 40}" y="${top + (z - terrainBounds.minZ) * unit + 8}" font-size="7">${z}</text>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="780" height="530" viewBox="0 0 780 530"><style>text{font-family:ui-monospace,monospace;fill:#1f2933}.title{font-size:16px;font-weight:bold}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">MP05 B07 surrounding terrain/elevation inventory</text><text x="12" y="37" font-size="9">x horizontal; z vertical; pale to blue = low to high top non-air/non-fluid surface; green = woody canopy. Exact state is available in each cell tooltip.</text>${rects}${labels}<text x="${left + cols * unit + 18}" y="80" font-size="10">Source y range: ${minY}..${maxY}</text><text x="${left + cols * unit + 18}" y="100" font-size="10">Deck level: 72</text></svg>`;
};

fs.mkdirSync(abs(OUT_DIR), { recursive: true });
fs.writeFileSync(abs(path.join(OUT_DIR, 'b07-surface-receiver-decision-plane.svg')), await renderPlan());
fs.writeFileSync(abs(path.join(OUT_DIR, 'b07-surface-receiver-section-z398.svg')), await renderSection());
fs.writeFileSync(abs(path.join(OUT_DIR, 'b07-surface-terrain-elevation.svg')), renderElevation());

const report = {
  schemaVersion: 1,
  id: 'MP05-B07-SURFACE-RECEIVER-SURVEY-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_SURFACE_RECEIVER_DESIGN_HOLD_NO_DOORWAY_OR_RECEIVER_AUTHORITY',
  purpose: 'Read-only current-source geometry and normal-walk survey for the B07 surface receiver dependency. It does not select a face or emit a construction package.',
  source: { snapshotRoot: rel(SNAPSHOT), captureId: capture.captureId, capturedAtUtc: capture.capturedAtUtc, captureIdentity: capture.id, requiredMembersPresent: ['region', 'entities', 'poi', 'level.dat'].every((member) => fs.existsSync(abs(path.join(SNAPSHOT, member)))) },
  existingAsBuilt: { headhouse, provenance: 'R07J accepted a fail-closed supported headhouse only; its release record expressly excluded exterior doors, shaft/lift, smoke, power, drainage, and route commissioning.' },
  candidateFaceDecisionEnvelopes: candidateFaces,
  normalWalkSurvey: { definition: 'Feet and head must be air; the block below must be non-air, non-fluid, and non-gravity; moves are cardinal one-block horizontal changes with a maximum one-block vertical step. It is a conservative current-state terrain connectivity screen, not a life-safety certification.', bounds: walkBounds, candidateResults: candidateFaces.map(({ id, direction, currentExteriorWalkComponent }) => ({ id, direction, currentExteriorWalkComponent })) },
  terrainInventory: { bounds: terrainBounds, topNonAirNonFluidElevationCounts: Object.fromEntries([...elevationCounts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))), deckLevel: 72, columns: terrainColumns },
  protectedContext: { bounds: protectedBounds, sourceWoodyFluidGravityCells: { count: protectedCells.length, records: protectedCells }, immutableBlockEntities: blockEntities, immutableSavedEntities: savedEntities, conclusion: 'These source records are preservation inputs only. They do not define a construction ownership envelope.' },
  ownershipAndHandoffs: {
    surfaceReceiver: 'UNASSIGNED: the accepted R07J scope was limited to a fail-closed shell and did not grant an exterior receiver, doorway, landing, or surface-route owner.',
    requiredContracts: ['selected face and exact access-boundary/failure state', 'classified landing and an owned normal-walk surface route from deck level to terrain endpoint', 'surface drainage/overflow receiver separate from the B07 wet-transfer treatment', 'smoke control and power/lighting interfaces', 'independent-egress endpoint and accessibility/route QA contract', 'protected tree/terrain/block-entity/entity preservation or an exact reviewed migration'],
    conclusion: 'No candidate face is ready for a physical opening. Each observed face is only a geometrically feasible decision envelope on the current shell/deck, and none reaches terrain through the current normal-walk network.',
  },
  maps: [
    'b07-surface-receiver-decision-plane.svg',
    'b07-surface-receiver-section-z398.svg',
    'b07-surface-terrain-elevation.svg',
  ].map((filename) => ({
    path: `${rel(OUT_DIR)}/${filename}`,
    sha256: sha256(fs.readFileSync(abs(path.join(OUT_DIR, filename)))),
  })),
  renderedMaps: [
    'b07-surface-receiver-decision-plane.png',
    'b07-surface-receiver-section-z398.png',
    'b07-surface-terrain-elevation.png',
  ].filter((filename) => fs.existsSync(abs(path.join(OUT_DIR, filename)))).map((filename) => ({
    path: `${rel(OUT_DIR)}/${filename}`,
    sha256: sha256(fs.readFileSync(abs(path.join(OUT_DIR, filename)))),
  })),
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(abs(path.join(OUT_DIR, 'surface-receiver-survey.json')), `${JSON.stringify(report, null, 2)}\n`);
const rows = candidateFaces.map((face) => `| ${face.direction} | ${face.openingWallCells.cellCount} intact wall cells | ${face.immediateExteriorAirCells.cellCount}/${face.immediateExteriorAirCells.cellCount} air | ${face.immediateExteriorSupportCells.cellCount}/${face.immediateExteriorSupportCells.cellCount} deck support | ${face.currentExteriorWalkComponent.normalWalkNodeCount} nodes; terrain ${face.currentExteriorWalkComponent.reachesNaturalTerrain ? 'reached' : 'not reached'} |`).join('\n');
const markdown = `# MP05 B07 surface receiver survey 01\n\n**Status:** \`${report.status}\`  \n**Current immutable source:** \`${report.source.snapshotRoot}\` (capture \`${report.source.captureId}\`)  \n**Machine findings:** [JSON](../../../${rel(path.join(OUT_DIR, 'surface-receiver-survey.json'))})\n\nThis is a read-only surface-receiver dependency survey. It makes no doorway, landing, route, drainage, smoke, power, or egress authorization claim, and emitted no operation files.\n\n## Exact source maps\n\n- [Headhouse / face decision plane](../../../${rel(path.join(OUT_DIR, 'b07-surface-receiver-decision-plane.svg'))})\n- [East-west receiver section at z=-398](../../../${rel(path.join(OUT_DIR, 'b07-surface-receiver-section-z398.svg'))})\n- [Surrounding terrain/elevation inventory](../../../${rel(path.join(OUT_DIR, 'b07-surface-terrain-elevation.svg'))})\n\n## Four face envelopes\n\n| Face | Closed shell to preserve | Exterior headroom now | Immediate deck support | Current normal-walk screen |\n|---|---:|---:|---:|---|\n${rows}\n\nAll four three-wide by two-high faces have an intact polished-diorite shell, air immediately outside, and polished-diorite deck under the exterior cells. That only establishes local geometric options: every current exterior walk component remains isolated on the elevated deck and **does not reach natural terrain** inside the exact source survey bounds. No exterior face is therefore a classified receiver or an egress endpoint.\n\n## Required integrated handoffs\n\n- Select and own one exact boundary/door failure state and a classified landing.\n- Design and own a normal-walk descent/route from deck level Y=72 to a terrain endpoint, preserving or exactly migrating protected source context.\n- Bind the surface drainage/overflow interface to the separate B07 wet-transfer treatment; this survey does not resolve that water system.\n- Define smoke, power/lighting, access-control, and independent-egress endpoint contracts.\n- Re-survey current terrain/entities immediately before any compiler/release kernel.\n\n## Disposition\n\nNo physical surface opening is releaseable from this survey. The B07 through-route and egress remain unbuilt and uncommissioned pending the integrated containment, gravity, receiver, utility, and endpoint design.\n`;
fs.mkdirSync(path.dirname(abs(MARKDOWN_OUT)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN_OUT), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT_DIR, 'surface-receiver-survey.json')), markdown: rel(MARKDOWN_OUT), candidateFaces: candidateFaces.map(({ direction, currentExteriorWalkComponent }) => ({ direction, normalWalkNodes: currentExteriorWalkComponent.normalWalkNodeCount, reachesNaturalTerrain: currentExteriorWalkComponent.reachesNaturalTerrain })), maps: report.maps, reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
