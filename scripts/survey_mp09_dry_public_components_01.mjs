#!/usr/bin/env node
/**
 * Read-only MP09 Ravensgate dry/public component screen.
 *
 * This is deliberately a condition map, not a release compiler.  It examines
 * every column in the frozen district against a complete immutable source,
 * masks the accepted circulation / structure envelopes, and describes any
 * remaining physically dry three-lane-capable ground.  Physical suitability
 * does not create a public program, ownership, or authority to build.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT_DIR = value('--out-dir', 'data/world-review/mp09-dry-public-component-screen-20260826T123537Z');
const GENERATED_AT = value('--generated-at', '2026-08-26T12:35:37Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(blockName(state));
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(blockName(state)) || state.includes('waterlogged=true');
const isWalkFloor = (state) => !isAir(state) && !isFluid(state) && !new Set([
  'minecraft:short_grass', 'minecraft:tall_grass', 'minecraft:fern', 'minecraft:large_fern',
  'minecraft:seagrass', 'minecraft:kelp', 'minecraft:snow', 'minecraft:vine',
]).has(blockName(state));
const DISTRICT = { minX: -148, maxX: -64, minZ: -562, maxZ: -420 };
const inRect = (cell, rect) => cell.x >= rect.minX && cell.x <= rect.maxX && cell.z >= rect.minZ && cell.z <= rect.maxZ;
const key2 = (cell) => `${cell.x},${cell.z}`;

const acceptedOrProtected = [
  { id: 'accepted-nw-arrival-and-north-plaza', bounds: { minX: -130, maxX: -96, minZ: -457, maxZ: -448 } },
  { id: 'accepted-garden-loop-north', bounds: { minX: -86, maxX: -85, minZ: -453, maxZ: -431 } },
  { id: 'accepted-garth-statue-plaza', bounds: { minX: -93, maxX: -68, minZ: -444, maxZ: -428 } },
  { id: 'accepted-stoa-public-realm', bounds: { minX: -105, maxX: -65, minZ: -449, maxZ: -426 } },
  { id: 'protected-bell-gate', bounds: { minX: -111, maxX: -105, minZ: -433, maxZ: -428 } },
  { id: 'protected-loggia', bounds: { minX: -111, maxX: -106, minZ: -447, maxZ: -433 } },
  { id: 'protected-tempietto', bounds: { minX: -93, maxX: -77, minZ: -562, maxZ: -551 } },
  { id: 'long-water-reviewed-alignment', bounds: { minX: -93, maxX: -77, minZ: -550, maxZ: -455 } },
];

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(SNAPSHOT), member))) throw new Error(`MP09 screen requires complete immutable source member: ${member}`);
}
const reader = new AnvilReader(path.join(absolute(SNAPSHOT), 'region'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};

const cells = [];
const cellByKey = new Map();
for (let z = DISTRICT.minZ; z <= DISTRICT.maxZ; z += 1) {
  for (let x = DISTRICT.minX; x <= DISTRICT.maxX; x += 1) {
    const cell = { x, z, classification: 'no-supported-two-headroom-surface', floorY: null, floor: null };
    const protectedScope = acceptedOrProtected.find(({ bounds }) => inRect({ x, z }, bounds));
    let fluidSeen = false;
    /* MP09's public ground is authored at y67..69.  Restricting this screen
     * to that grade band prevents roofs, parapets, walls, and upper floors
     * from being misclassified as candidate public circulation. */
    for (let y = 69; y >= 64; y -= 1) {
      const [floor, feet, head, below] = await Promise.all([
        stateAt({ x, y, z }), stateAt({ x, y: y + 1, z }), stateAt({ x, y: y + 2, z }), stateAt({ x, y: y - 1, z }),
      ]);
      fluidSeen ||= isFluid(floor) || isFluid(feet) || isFluid(head) || isFluid(below);
      if (isWalkFloor(floor) && isAir(feet) && isAir(head) && !isFluid(below)) {
        cell.floorY = y;
        cell.floor = floor;
        cell.classification = protectedScope ? `accepted-or-protected:${protectedScope.id}` : 'dry-unprogrammed-ground';
        break;
      }
    }
    if (cell.floorY === null && fluidSeen) cell.classification = 'fluid-or-waterlogged-column';
    cells.push(cell);
    cellByKey.set(key2(cell), cell);
  }
}

const dryUnprogrammed = cells.filter(({ classification }) => classification === 'dry-unprogrammed-ground');
const dryKeys = new Set(dryUnprogrammed.map(key2));
const components = [];
const visited = new Set();
for (const origin of dryUnprogrammed) {
  const originKey = key2(origin);
  if (visited.has(originKey)) continue;
  const queue = [origin];
  const component = [];
  visited.add(originKey);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    component.push(current);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = cellByKey.get(`${current.x + dx},${current.z + dz}`);
      if (!next || !dryKeys.has(key2(next)) || visited.has(key2(next)) || Math.abs(next.floorY - current.floorY) > 1) continue;
      visited.add(key2(next));
      queue.push(next);
    }
  }
  const xs = component.map(({ x }) => x); const zs = component.map(({ z }) => z);
  const threeLaneCells = component.filter((candidate) => {
    const lanes = [
      [[-1, -1], [-1, 0], [-1, 1]], [[0, -1], [0, 0], [0, 1]], [[1, -1], [1, 0], [1, 1]],
      [[-1, -1], [0, -1], [1, -1]], [[-1, 0], [0, 0], [1, 0]], [[-1, 1], [0, 1], [1, 1]],
    ];
    return lanes.some((lane) => lane.every(([dx, dz]) => {
      const neighbour = cellByKey.get(`${candidate.x + dx},${candidate.z + dz}`);
      return neighbour && dryKeys.has(key2(neighbour)) && Math.abs(neighbour.floorY - candidate.floorY) <= 1;
    }));
  });
  components.push({
    componentCellCount: component.length,
    bounds: { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) },
    floorYRange: { min: Math.min(...component.map(({ floorY }) => floorY)), max: Math.max(...component.map(({ floorY }) => floorY)) },
    threeLaneCapableCellCount: threeLaneCells.length,
    sample: component.slice(0, 12).map(({ x, floorY, z, floor }) => ({ x, y: floorY, z, floor })),
  });
}
components.sort((a, b) => b.componentCellCount - a.componentCellCount);

const counts = Object.fromEntries([...new Set(cells.map(({ classification }) => classification))].sort().map((classification) => [classification, cells.filter((cell) => cell.classification === classification).length]));
const svgCells = cells.map((cell) => {
  const fill = cell.classification.startsWith('accepted-or-protected') ? '#606c76'
    : cell.classification === 'dry-unprogrammed-ground' ? '#6f9a62'
      : cell.classification === 'fluid-or-waterlogged-column' ? '#2b8cc4' : '#2a3038';
  const x = (cell.x - DISTRICT.minX) * 6; const y = (cell.z - DISTRICT.minZ) * 6;
  return `<rect x="${x}" y="${y}" width="6" height="6" fill="${fill}"/>`;
}).join('');
const gridWidth = (DISTRICT.maxX - DISTRICT.minX + 1) * 6;
const gridHeight = (DISTRICT.maxZ - DISTRICT.minZ + 1) * 6;
const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${gridWidth}" height="${gridHeight + 112}" viewBox="0 0 ${gridWidth} ${gridHeight + 112}">\n<rect width="100%" height="100%" fill="#141a20"/>${svgCells}<rect x="0" y="0" width="${gridWidth}" height="${gridHeight}" fill="none" stroke="#d8e1e8" stroke-width="2"/><text x="12" y="${gridHeight + 20}" fill="#eaf1f7" font-family="monospace" font-size="14">MP09 Ravensgate current-source condition map</text><text x="12" y="${gridHeight + 38}" fill="#eaf1f7" font-family="monospace" font-size="12">north = up / -Z; district x=-148..-64, z=-562..-420</text><text x="12" y="${gridHeight + 58}" fill="#6f9a62" font-family="monospace" font-size="12">green: dry unprogrammed; gray: accepted/protected</text><text x="12" y="${gridHeight + 76}" fill="#2b8cc4" font-family="monospace" font-size="12">blue: fluid/waterlogged; dark: no 2-headroom surface</text><text x="12" y="${gridHeight + 96}" fill="#eaf1f7" font-family="monospace" font-size="12">condition screen only — not a route/ownership claim</text></svg>\n`;

const result = {
  schemaVersion: 1,
  id: 'MP09-RAVENSGATE-DRY-PUBLIC-COMPONENT-SCREEN-01',
  generatedAtUtc: GENERATED_AT,
  readOnly: true,
  source: {
    snapshot: relative(SNAPSHOT),
    capture: JSON.parse(fs.readFileSync(path.join(absolute(SNAPSHOT), 'combined-zones-complete-save-capture.json'), 'utf8')),
    requiredMembersPresent: true,
  },
  district: DISTRICT,
  acceptedOrProtectedMasks: acceptedOrProtected,
  surfaceConditionCounts: counts,
  unprogrammedDryComponents: components,
  decision: {
    exactTargetCells: [],
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_DISTINCT_MP09_DRY_PUBLIC_COMPONENT_RELEASED_OR_QUEUED',
    reason: 'The physical screen detects dry ground outside accepted/protected envelopes, including three-lane-capable landscape patches, but no catalogued public-route defect, exact one-owner-per-cell contract, or MP09 program designates any such patch as a public component. The only named unbuilt anchor-to-anchor connection remains the Long Water alignment, which is hydrology/grade coupled and separately held. Dry ground is not a permission to pave, light, or reclassify landscape.',
    dependenciesBeforeAnySuccessor: [
      'A source-bound MP09 public-realm program naming a specific route, room, or defect rather than generic landscape.',
      'An exact ownership/interface assignment for every target and interaction-halo cell, including neighbours where the component meets a structure or district edge.',
      'For the Stoa-to-Tempietto objective, a separate closed-basin hydrology, containment, grade, landing, and inverse design; this screen does not weaken that hold.',
      'A new fresh source, live-entity clearance, guarded operation package, strict execution journal, post snapshot, and rollback preflight before any physical mutation.',
    ],
  },
  artifacts: {
    map: `${relative(path.join(OUT_DIR, 'ravensgate-dry-public-component-map.svg'))}`,
    mapLegend: 'green=dry unprogrammed ground, gray=accepted/protected mask, blue=fluid/waterlogged column, dark=no supported two-headroom surface',
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
};
result.identitySha256 = sha256(`${JSON.stringify(result, null, 2)}\n`);
const markdown = `# MP09 Ravensgate dry/public component screen\n\n**Status:** ${result.decision.result}\n\n**Bound source:** \`${result.source.snapshot}\` (complete immutable capture; read-only screen).\n\n![Current Ravensgate condition map](ravensgate-dry-public-component-map.svg)\n\nThe map uses green only for physically dry, supported, two-headroom ground **outside** accepted/protected envelopes. It is not a public-route, ownership, or release designation. Gray masks the accepted NW arrival/plaza, garden-loop north, Garth plaza, Stoa public realm, Bell-Gate, Loggia, Tempietto, and reviewed Long Water alignment; blue identifies water/waterlogged columns.\n\n## Result\n\nThere is no exact MP09 target set. The screen finds landscape that is physically dry and may locally support three side-by-side standing cells, but the Master Plan supplies no remaining named dry/public component or defect there, and the ownership contract does not allocate it for new work. The only named unbuilt anchor-to-anchor objective is Long Water, which remains a separate hydrology/grade/landing problem.\n\n## Required successor inputs\n\n${result.decision.dependenciesBeforeAnySuccessor.map((item) => `- ${item}`).join('\n')}\n\nNo live calls, RCON calls, operation files, or world edits were made.\n`;
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
fs.writeFileSync(absolute(path.join(OUT_DIR, 'ravensgate-dry-public-component-map.svg')), svg);
fs.writeFileSync(absolute(path.join(OUT_DIR, 'dry-public-component-screen.json')), `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(absolute(path.join(OUT_DIR, 'DRY-PUBLIC-COMPONENT-SCREEN.md')), markdown);
console.log(JSON.stringify({ id: result.id, source: result.source.snapshot, counts, componentCount: components.length, largestComponents: components.slice(0, 8), result: result.decision.result, outDir: OUT_DIR }, null, 2));
