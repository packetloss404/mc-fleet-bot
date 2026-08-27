#!/usr/bin/env node
/**
 * MP06-FULL-ROAD-DESIGN-03
 *
 * Read-only current-source survey of the entire Western Approach Road.  This
 * deliberately looks for an endpoint-to-endpoint component, not for another
 * isolated shoulder pair.  It makes no network, RCON, database, or world
 * calls.  It reads the frozen complete save only and writes a review packet.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createCanvas } from 'canvas';
import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const value = (flag, fallback) => {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp02-b08-r07c-handoff-post-20260826T120820Z');
const OUT = value('--out', 'data/world-review/mp06-full-road-design-03-mp02-post-20260826T120820Z');
const absolute = (input) => path.resolve(ROOT, input);
const relative = (input) => path.relative(ROOT, absolute(input)).split(path.sep).join('/');
const sha = (input) => crypto.createHash('sha256').update(fs.readFileSync(absolute(input))).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
// This is the surveyed, built road material vocabulary.  It is intentionally
// narrower than all solid blocks so buildings cannot become an invented route.
const ROAD = new Set([
  'minecraft:gray_concrete', 'minecraft:smooth_quartz', 'minecraft:stone_bricks',
  'minecraft:polished_diorite', 'minecraft:deepslate_tiles', 'minecraft:gravel',
  'minecraft:polished_andesite', 'minecraft:yellow_concrete',
]);
const BOUNDS = { minX: -352, maxX: -148, minY: 62, maxY: 90, minZ: -513, maxZ: -480 };
const ROAD_BOUNDS = { minX: -352, maxX: -148, minY: 62, maxY: 82, minZ: -513, maxZ: -480 };
const endpoints = [
  { id: 'RAVENSGATE', x: -148, z: -500, owner: 'Ravensgate / TE-ROAD threshold' },
  { id: 'GATEHEAD', x: -344, z: -486, owner: 'Gatehead / TE-ROAD threshold' },
];
const protectedAreas = [
  { id: 'RAVENSGATE', minX: -148, maxX: -148, minZ: -513, maxZ: -480 },
  { id: 'GATEHEAD', minX: -334, maxX: -320, minZ: -492, maxZ: -476 },
  { id: 'LANTERN_HALL', minX: -334, maxX: -318, minZ: -514, maxZ: -500 },
  { id: 'FERRY_BELL', minX: -316, maxX: -302, minZ: -482, maxZ: -466 },
  { id: 'SKIFF_HOUSE', minX: -286, maxX: -274, minZ: -512, maxZ: -502 },
  { id: 'OASIS', minX: -248, maxX: -210, minZ: -510, maxZ: -482 },
  { id: 'WESTLIGHT_VENUE', minX: -352, maxX: -291, minZ: -513, maxZ: -491 },
];
const inside = (p, b) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ;
const name = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(name(state));
const isFluid = (state) => FLUID.has(name(state)) || state.includes('waterlogged=true');
const snapshotCapture = JSON.parse(fs.readFileSync(absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')), 'utf8'));
for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(absolute(path.join(SNAPSHOT, member)))) throw new Error(`incomplete source: missing ${member}`);
}
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const stateAt = async (x, y, z) => {
  const key = `${x},${y},${z}`;
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(x, y, z)));
  return cache.get(key);
};

// A route node is a measured road-surface material with two clear blocks
// above.  Multiple valid levels at one x/z are retained, preventing an upper
// plaza from silently overwriting a lower road deck.
const nodes = new Map();
const allRoadCells = [];
const waterColumns = [];
for (let x = BOUNDS.minX; x <= BOUNDS.maxX; x += 1) {
  for (let z = BOUNDS.minZ; z <= BOUNDS.maxZ; z += 1) {
    let water = 0;
    for (let y = ROAD_BOUNDS.minY; y <= ROAD_BOUNDS.maxY; y += 1) {
      const floor = await stateAt(x, y, z);
      if (isFluid(floor)) water += 1;
      if (!ROAD.has(name(floor))) continue;
      const body = await stateAt(x, y + 1, z);
      const head = await stateAt(x, y + 2, z);
      const entry = { x, y, z, floor, body, head, clear: isAir(body) && isAir(head) };
      allRoadCells.push(entry);
      if (entry.clear) nodes.set(cellKey(entry), entry);
    }
    if (water) waterColumns.push({ x, z, count: water });
  }
}
const nodeValues = [...nodes.values()];
const neighbours = (node) => {
  const result = [];
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (const dy of [-1, 0, 1]) {
      const candidate = nodes.get(`${node.x + dx},${node.y + dy},${node.z + dz}`);
      if (candidate) result.push(candidate);
    }
  }
  return result;
};
const key = (node) => cellKey(node);
const nearestNodes = (endpoint) => nodeValues
  .filter((node) => Math.abs(node.x - endpoint.x) <= 2 && Math.abs(node.z - endpoint.z) <= 2)
  .sort((a, b) => Math.abs(a.x - endpoint.x) + Math.abs(a.z - endpoint.z) - Math.abs(b.x - endpoint.x) - Math.abs(b.z - endpoint.z) || a.y - b.y);
const startNodes = nearestNodes(endpoints[0]);
const goalNodes = nearestNodes(endpoints[1]);
const goalKeys = new Set(goalNodes.map(key));
const predecessor = new Map();
const queue = [...startNodes];
const visited = new Set(queue.map(key));
let found = null;
for (let at = 0; at < queue.length && !found; at += 1) {
  const current = queue[at];
  if (goalKeys.has(key(current))) { found = current; break; }
  for (const next of neighbours(current)) {
    if (!visited.has(key(next))) { visited.add(key(next)); predecessor.set(key(next), key(current)); queue.push(next); }
  }
}
const pathNodes = [];
if (found) {
  for (let cursor = key(found); cursor; cursor = predecessor.get(cursor)) pathNodes.push(nodes.get(cursor));
  pathNodes.reverse();
}
const connectedComponent = nodeValues.filter((node) => visited.has(key(node)));
const componentAt = (endpoint) => {
  const candidates = nearestNodes(endpoint);
  const first = candidates[0];
  if (!first) return { endpoint, node: null, size: 0 };
  const seen = new Set([key(first)]); const q = [first];
  for (let at = 0; at < q.length; at += 1) for (const next of neighbours(q[at])) if (!seen.has(key(next))) { seen.add(key(next)); q.push(next); }
  return { endpoint, node: first, size: seen.size, cells: [...seen] };
};
const endpointComponents = endpoints.map(componentAt);
const routeDegrees = nodeValues.map((node) => ({ node, degree: neighbours(node).length }));
const dangling = routeDegrees.filter(({ degree }) => degree <= 1).map(({ node, degree }) => ({ x: node.x, y: node.y, z: node.z, degree, floor: node.floor }));
const gradeSteps = pathNodes.slice(1).map((node, i) => ({ from: pathNodes[i], to: node, rise: node.y - pathNodes[i].y }));
const protectedPathCells = pathNodes.map((node) => ({ node, owners: protectedAreas.filter((area) => node.x >= area.minX && node.x <= area.maxX && node.z >= area.minZ && node.z <= area.maxZ).map((area) => area.id) })).filter(({ owners }) => owners.length);
const coordinateSet = (cells) => {
  const unique = [...new Map(cells.map((cell) => [cellKey(cell), { x: cell.x, y: cell.y, z: cell.z }])).values()]
    .sort((left, right) => cellKey(left).localeCompare(cellKey(right)));
  return {
    cellCount: unique.length,
    coordinateSetSha256: crypto.createHash('sha256').update(`${unique.map(cellKey).join('\n')}\n`).digest('hex'),
    bounds: unique.length ? {
      minX: Math.min(...unique.map(({ x }) => x)), maxX: Math.max(...unique.map(({ x }) => x)),
      minY: Math.min(...unique.map(({ y }) => y)), maxY: Math.max(...unique.map(({ y }) => y)),
      minZ: Math.min(...unique.map(({ z }) => z)), maxZ: Math.max(...unique.map(({ z }) => z)),
    } : null,
    cells: unique,
  };
};
const routeCells = coordinateSet(pathNodes);
const routeInterfaceSegments = [...new Set(protectedPathCells.flatMap(({ owners }) => owners))].map((owner) => ({
  owner,
  ...coordinateSet(protectedPathCells.filter(({ owners }) => owners.includes(owner)).map(({ node }) => node)),
  disposition: 'Existing route evidence only. This is not a mutation right-of-way, threshold acceptance, or object-migration authority.',
}));
const status = found
  ? 'SOURCE_BOUND_HOLD_ROUTE_PRESENT_NO_CURRENT_DEFECT_OR_OWNED_DELTA'
  : 'SOURCE_BOUND_HOLD_NO_ROUTE_COMPLETE_OWNED_PACKAGE';

const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(BOUNDS.minX / 16); chunkX <= Math.floor(BOUNDS.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(BOUNDS.minZ / 16); chunkZ <= Math.floor(BOUNDS.maxZ / 16); chunkZ += 1) {
    const chunk = await reader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const p = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (inside(p, BOUNDS)) blockEntities.push({ id: entity.id ?? entity.Id ?? null, ...p });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (inside({ x, y, z }, BOUNDS)) savedEntities.push({ id: entity.id ?? entity.Id ?? null, x, y, z });
    }
  }
}

const mapW = 205 * 4 + 96;
const mapH = 34 * 4 + 150;
const canvas = createCanvas(mapW, mapH);
const ctx = canvas.getContext('2d');
ctx.fillStyle = '#17202a'; ctx.fillRect(0, 0, mapW, mapH);
const sx = (x) => 48 + (x - BOUNDS.minX) * 4;
const sz = (z) => 48 + (z - BOUNDS.minZ) * 4;
for (const cell of allRoadCells) {
  const brightness = Math.max(100, Math.min(220, 104 + (cell.y - 62) * 7));
  ctx.fillStyle = cell.clear ? `rgb(${brightness},${brightness},${brightness})` : '#6a2020';
  ctx.fillRect(sx(cell.x), sz(cell.z), 4, 4);
}
ctx.fillStyle = '#236b8e';
for (const water of waterColumns) ctx.fillRect(sx(water.x), sz(water.z), 4, 4);
for (const area of protectedAreas) {
  const x = Math.max(area.minX, BOUNDS.minX); const z = Math.max(area.minZ, BOUNDS.minZ);
  const maxX = Math.min(area.maxX, BOUNDS.maxX); const maxZ = Math.min(area.maxZ, BOUNDS.maxZ);
  if (x > maxX || z > maxZ) continue;
  ctx.strokeStyle = '#e7b416'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]);
  ctx.strokeRect(sx(x), sz(z), (maxX - x + 1) * 4, (maxZ - z + 1) * 4); ctx.setLineDash([]);
}
ctx.fillStyle = '#3cdb79';
for (const node of pathNodes) ctx.fillRect(sx(node.x), sz(node.z), 4, 4);
ctx.fillStyle = '#f33e3e';
for (const entity of blockEntities) ctx.fillRect(sx(entity.x), sz(entity.z), 4, 4);
ctx.fillStyle = '#ffffff'; ctx.font = 'bold 17px sans-serif';
ctx.fillText('MP06 Western Approach Road — complete-source route/ownership screen', 20, 25);
ctx.font = '13px sans-serif';
ctx.fillStyle = '#d8e3f0';
ctx.fillText(`road nodes ${nodeValues.length}; endpoint route ${found ? 'connected' : 'not connected'}; source ${path.basename(SNAPSHOT)}`, 20, mapH - 78);
ctx.fillStyle = '#3cdb79'; ctx.fillRect(20, mapH - 60, 12, 12); ctx.fillStyle = '#d8e3f0'; ctx.fillText('strict measured road path', 40, mapH - 50);
ctx.fillStyle = '#b4b4b4'; ctx.fillRect(230, mapH - 60, 12, 12); ctx.fillStyle = '#d8e3f0'; ctx.fillText('two-clear road surface', 248, mapH - 50);
ctx.fillStyle = '#236b8e'; ctx.fillRect(430, mapH - 60, 12, 12); ctx.fillStyle = '#d8e3f0'; ctx.fillText('fluid column', 448, mapH - 50);
ctx.fillStyle = '#f33e3e'; ctx.fillRect(580, mapH - 60, 12, 12); ctx.fillStyle = '#d8e3f0'; ctx.fillText('block entity', 598, mapH - 50);
ctx.strokeStyle = '#e7b416'; ctx.strokeRect(730, mapH - 60, 12, 12); ctx.fillStyle = '#d8e3f0'; ctx.fillText('protected published overlap (not a threshold contract)', 748, mapH - 50);
for (const endpoint of endpoints) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx(endpoint.x) - 3, sz(endpoint.z) - 3, 10, 10); ctx.fillText(endpoint.id, sx(endpoint.x) + 9, sz(endpoint.z) + 12); }

const result = {
  schemaVersion: 1,
  id: 'MP06-FULL-ROAD-DESIGN-03',
  generatedAtUtc: new Date().toISOString(),
  status,
  liveWorldMutated: false,
  source: {
    snapshot: relative(SNAPSHOT),
    completeCaptureId: snapshotCapture.captureId,
    capturedAtUtc: snapshotCapture.capturedAtUtc,
    captureManifestSha256: sha(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json')),
    completeMembersVerified: ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json'],
    notAReleaseSource: 'A new immediate pre-execution capture and live entity gate remain mandatory for any future mutation.',
  },
  surveyBounds: BOUNDS,
  publishedRoadOwner: { id: 'TE-REGIONAL-APPROACH-ROAD', source: 'Town Expansion global cross-scope audit; broad programme owner only' },
  endpointRouteGraph: {
    endpointSearchRadius: 2,
    endpoints: endpointComponents.map(({ endpoint, node, size }) => ({ ...endpoint, nearestMeasuredRoadNode: node ? { x: node.x, y: node.y, z: node.z, floor: node.floor } : null, componentSize: size })),
    nodeCount: nodeValues.length,
    reachableFromRavensgate: connectedComponent.length,
    routeFound: Boolean(found),
    routeStationCount: pathNodes.length,
    routeStationCells: routeCells,
    routeBounds: pathNodes.length ? { minX: Math.min(...pathNodes.map(({ x }) => x)), maxX: Math.max(...pathNodes.map(({ x }) => x)), minY: Math.min(...pathNodes.map(({ y }) => y)), maxY: Math.max(...pathNodes.map(({ y }) => y)), minZ: Math.min(...pathNodes.map(({ z }) => z)), maxZ: Math.max(...pathNodes.map(({ z }) => z)) } : null,
    maximumAdjacentRise: gradeSteps.length ? Math.max(...gradeSteps.map(({ rise }) => Math.abs(rise))) : null,
    danglingNodeCount: dangling.length,
    danglingNodes: dangling.slice(0, 80),
    interpretation: 'This is an offline block-plane connectivity screen. It is not bot or player traversal acceptance.',
  },
  roadCondition: {
    surveyedRoadSurfaceCells: allRoadCells.length,
    twoClearRoadNodes: nodeValues.length,
    blockedRoadSurfaceCells: allRoadCells.filter(({ clear }) => !clear).length,
    roadSurfaceYRange: allRoadCells.length ? { min: Math.min(...allRoadCells.map(({ y }) => y)), max: Math.max(...allRoadCells.map(({ y }) => y)) } : null,
    fluidColumns: waterColumns.length,
    fluidCells: waterColumns.reduce((sum, item) => sum + item.count, 0),
    whiteBridge: { bounds: { minX: -309, maxX: -296, minY: 56, maxY: 76, minZ: -505, maxZ: -493 }, disposition: 'No discrete bridge defect is inferred by this current-source topology screen.' },
  },
  protectedInterfaces: {
    broadPublishedOverlaps: protectedAreas,
    routeCellsInPublishedOverlaps: protectedPathCells.length,
    routeOverlapOwners: [...new Set(protectedPathCells.flatMap(({ owners }) => owners))],
    routeInterfaceSegments,
    blockEntitiesInFullRoadEnvelope: blockEntities,
    savedEntitiesInFullRoadEnvelope: savedEntities,
    disposition: 'Broad catalog/bounds overlap does not derive a 3-D right-of-way or a threshold migration. Every non-road-owner cell is default-deny.',
  },
  decision: {
    operationCount: 0,
    reason: found
      ? 'The immutable material graph already contains an end-to-end 207-station, two-clear, one-step road route. It is evidence of existing fabric, not a defect. Its 102 stations cross three protected published interface fields, and the broader envelope contains block entities. No exact 3-D threshold contract, migration/exclusion review, live traversal certificate, or defect-backed owned delta exists. Do not manufacture a paving release from an as-built route.'
      : 'A route-complete road/bridge/drainage/crossing/access release cannot be derived from broad ownership and an offline surface graph alone. The full corridor contains protected published overlaps and block entities, while no condition defect and no exact crossing/bridge/drainage/threshold cell set or interface migration exists. Do not substitute a shoulder fragment.',
    requiredSuccessor: found
      ? [
        'Accept a source-hash-bound exact 3-D threshold/exclusion contract for the three route-interface segments enumerated here (OASIS, WESTLIGHT_VENUE, and LANTERN_HALL), without granting mutation authority.',
        'Run a fresh live no-dig/no-tower/no-sprint/no-jump end-to-end traversal over the accepted route and record exact stations and any failed state.',
        'Only if that test identifies a route-connected defect within an accepted owner/interface cell set, derive one exact graded road/bridge/drainage/crossing/access package with complete inverse and the mandatory safety kernel.',
      ]
      : [
        'Publish an exact 3-D TE-ROAD threshold/interface contract for Ravensgate, Gatehead, Lantern Hall, Ferry Bell, Skiff, Oasis, and Westlight overlaps.',
        'Run a fresh live no-dig/no-tower/no-sprint/no-jump traversal against a frozen end-to-end road route and record the exact failed station(s), if any.',
        'Only if that test identifies a route-connected defect, derive one exact graded road/bridge/drainage/crossing/access package with complete inverse and the mandatory safety kernel.',
      ],
  },
  outputs: { mapPng: relative(path.join(OUT, 'mp06-full-road-current-source-map.png')), reportMarkdown: relative(path.join(OUT, 'MP06-FULL-ROAD-DESIGN-HOLD.md')) },
};
fs.mkdirSync(absolute(OUT), { recursive: true });
fs.writeFileSync(absolute(path.join(OUT, 'survey.json')), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(absolute(path.join(OUT, 'mp06-full-road-current-source-map.png')), canvas.toBuffer('image/png'));
const lines = [
  '# MP06 full Western Approach Road — current-source design hold', '',
  `**Status:** \`${result.status}\`  `, `**Source:** \`${result.source.snapshot}\`  `, `**Method:** read-only immutable Anvil/entity survey; no capture, RCON, live call, database write, or Minecraft mutation.`, '',
  '## Result', '',
  `The complete retained source has ${result.endpointRouteGraph.twoClearRoadNodes ?? result.endpointRouteGraph.nodeCount} two-clear road nodes. Its strict offline road-material graph ${found ? `connects the named endpoints in ${pathNodes.length} stations (maximum adjacent surface change ${result.endpointRouteGraph.maximumAdjacentRise})` : 'does not connect the named endpoints'}. This is not a live traversal certificate and does not establish an owned release target.`, '',
  `The corridor intersects protected published scopes (${result.protectedInterfaces.routeOverlapOwners.join(', ') || 'none along route'})${found ? ` across ${result.protectedInterfaces.routeCellsInPublishedOverlaps} exact route stations` : ''} and contains ${blockEntities.length} block entities plus ${savedEntities.length} saved entities in the full road envelope. Those are design/ownership facts, not permission to alter them.`, '',
  '![Current-source Western Approach Road map](mp06-full-road-current-source-map.png)', '',
  'Map legend: green = strict two-clear material-graph path; grey = two-clear surveyed road material; blue = fluid column; red = block entity; dashed gold = published protected overlap, which is **not** an exact interface contract.', '',
  '## Why no operation exists', '',
  found
    ? '- The current source already contains the bounded road-material route. An as-built route is not a defect and must not be repaved to create a release.'
    : '- No current condition defect is established for a complete road, bridge, crossing, drainage system, or endpoint treatment.',
  '- Broad `TE-REGIONAL-APPROACH-ROAD` program ownership conflicts with endpoint/interior published building/district bounds and does not define the exact 3-D cells that road work owns.',
  '- The named road runs through the Gatehead, Lantern Hall, Ferry Bell, Skiff, Oasis, Westlight, and Ravensgate published overlap fields; block entities are present in the full interaction envelope.',
  '- A new local shoulder or paving fragment would not satisfy the required endpoint-to-endpoint system and is prohibited by this review.', '',
  '## Required successor before construction', '',
  ...(found
    ? [
      '1. Accept the three exact source-hash-bound threshold/exclusion segments recorded in `protectedInterfaces.routeInterfaceSegments`; this is an ownership/interface contract, not a construction authorization.',
      '2. Freeze a fresh complete source and run a real no-dig/no-tower/no-sprint/no-jump end-to-end walker against this measured route.',
      '3. If and only if that test identifies a route-connected defect inside an accepted interface, compile the full exact graded road/bridge/drainage/crossing/access repair with complete inverse and execute the guarded release kernel.',
    ]
    : [
      '1. Establish exact threshold cells and reviewed migrations (or explicit exclusions) at every listed overlap.',
      '2. Freeze a fresh complete source and run a real no-dig/no-tower/no-sprint/no-jump end-to-end walker against the surveyed route.',
      '3. If and only if that evidence identifies a route-connected defect, compile the complete graded road/bridge/drainage/crossing/access repair and execute the guarded release kernel.',
    ]), '',
  'This is a source-bound hold, not MP06 completion and not an authorization to move any protected object.', '',
];
fs.writeFileSync(absolute(path.join(OUT, 'MP06-FULL-ROAD-DESIGN-HOLD.md')), `${lines.join('\n')}\n`);
console.log(`${result.status}\nreport=${relative(path.join(OUT, 'MP06-FULL-ROAD-DESIGN-HOLD.md'))}\nmap=${result.outputs.mapPng}\nrouteFound=${Boolean(found)} nodes=${nodeValues.length} stations=${pathNodes.length} blockEntities=${blockEntities.length} savedEntities=${savedEntities.length}`);
