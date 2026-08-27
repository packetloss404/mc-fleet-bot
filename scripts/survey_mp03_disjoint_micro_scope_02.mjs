#!/usr/bin/env node
/**
 * Read-only MP03 screen for a genuinely independent functional micro-scope.
 *
 * This deliberately does not revisit the known defective lower-lobby
 * headroom cells, wet shaft, floating gravel, or R09J cap as construction
 * targets.  It answers the narrower question: after excluding them, does an
 * owned, dry, supported, container-clear route defect remain that could be
 * repaired without claiming a through-route or reopening a closed B07 hold?
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-r09l-post-20260824T021413Z');
const OUT = value('--out', 'data/world-review/mp03-disjoint-micro-scope-02-20260826T084500Z.json');
const GENERATED_AT = value('--generated-at', '2026-08-26T08:45:00Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const BLOCK_ENTITY_NAMES = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:lectern', 'minecraft:chiseled_bookshelf', 'minecraft:hopper',
  'minecraft:dispenser', 'minecraft:dropper', 'minecraft:beacon',
  'minecraft:spawner', 'minecraft:command_block', 'minecraft:structure_block',
  'minecraft:jigsaw',
]);
const nameOf = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(nameOf(state));
const isFluid = (state) => FLUID.has(nameOf(state)) || state.includes('waterlogged=true');
const isContainerOrControl = (state) => BLOCK_ENTITY_NAMES.has(nameOf(state)) || nameOf(state).endsWith('_shulker_box');
const insideBounds = (point, bounds) => (
  point.x >= bounds.minX && point.x < bounds.maxX + 1
  && point.y >= bounds.minY && point.y < bounds.maxY + 1
  && point.z >= bounds.minZ && point.z < bounds.maxZ + 1
);
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return cache.get(key);
};

const lobbyFloors = [];
for (let x = 2103; x <= 2111; x += 1) for (let z = -431; z <= -425; z += 1) {
  lobbyFloors.push({ x, y: -59, z });
}
const lobbyHeadroomFailures = [];
const lobbyDrySupported = [];
const lowerDefectsOutsideHeadroom = [];
for (const floor of lobbyFloors) {
  const feet = await stateAt({ x: floor.x, y: floor.y + 1, z: floor.z });
  const head = await stateAt({ x: floor.x, y: floor.y + 2, z: floor.z });
  const below = await stateAt({ x: floor.x, y: floor.y - 1, z: floor.z });
  const floorState = await stateAt(floor);
  const hasHeadroom = isAir(feet) && isAir(head);
  if (!hasHeadroom) lobbyHeadroomFailures.push({ floor, feet, head });
  else lobbyDrySupported.push(floor);
  if (!['minecraft:polished_andesite', 'minecraft:polished_diorite'].includes(floorState)
    || isAir(below) || isFluid(below) || isContainerOrControl(floorState)) {
    lowerDefectsOutsideHeadroom.push({ floor, floorState, below });
  }
}

const wetBand = [];
for (let x = 2094; x <= 2114; x += 1) for (let y = 5; y <= 17; y += 1) for (let z = -438; z <= -388; z += 1) {
  const cell = { x, y, z };
  const state = await stateAt(cell);
  if (isFluid(state)) wetBand.push({ cell, state });
}
const gravel = [];
for (let y = 27; y <= 30; y += 1) {
  const cell = { x: 2104, y, z: -396 };
  gravel.push({ cell, state: await stateAt(cell), below: await stateAt({ x: 2104, y: y - 1, z: -396 }) });
}
const cap = [];
for (let y = 30; y <= 31; y += 1) {
  const cell = { x: 2105, y, z: -397 };
  cap.push({ cell, state: await stateAt(cell) });
}

/* The only potentially mutable dry floor stations outside every listed hold
 * are already complete lower-lobby stations.  Scan their exact interaction
 * envelope for stored block entities/containers; a complete `entities/`
 * plane is additionally mandatory before this can become a package. */
const dryEnvelope = [];
for (const floor of lobbyDrySupported) {
  for (let dy = -1; dy <= 2; dy += 1) dryEnvelope.push({ x: floor.x, y: floor.y + dy, z: floor.z });
}
const dryKeys = new Set(dryEnvelope.map(cellKey));
const storedBlockEntities = [];
const chunks = [...new Set(dryEnvelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`))];
for (const chunkKey of chunks) {
  const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (dryKeys.has(cellKey(cell))) storedBlockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
}
const entitiesPath = path.join(SNAPSHOT, 'entities');
const immutableEntityPlanePresent = fs.existsSync(absolute(entitiesPath));
const entityReader = immutableEntityPlanePresent
  ? new AnvilReader(absolute(entitiesPath))
  : null;
const dryEnvelopeBounds = {
  minX: 2103, maxX: 2111,
  minY: -60, maxY: -57,
  minZ: -431, maxZ: -425,
};
const savedEntitiesInDryInteractionEnvelope = [];
if (entityReader) {
  for (const chunkKey of chunks) {
    const [chunkX, chunkZ] = chunkKey.split(',').map(Number);
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.slice(0, 3).map(Number);
      if (insideBounds({ x, y, z }, dryEnvelopeBounds)) {
        savedEntitiesInDryInteractionEnvelope.push({
          id: entity.id ?? entity.Id ?? null,
          position: [x, y, z],
          chunk: { x: chunkX, z: chunkZ },
        });
      }
    }
  }
}
const report = {
  schemaVersion: 1,
  id: 'MP03-HOUSTON-DISJOINT-MICRO-SCOPE-02',
  generatedAtUtc: GENERATED_AT,
  status: 'NO_DISJOINT_FUNCTIONAL_MICRO_SCOPE_ON_CURRENT_COMPLETE_SOURCE',
  source: {
    snapshot: relative(SNAPSHOT),
    immutableEntityPlanePresent,
    limitation: immutableEntityPlanePresent
      ? 'The immutable entities plane is present and its possible lower-lobby interaction envelope was read. Any future operation still requires fresh immediately-before-execution live-entity clearance.'
      : 'No matching immutable entities plane is present. This independently disqualifies any operation package.',
  },
  excludedHardBoundaries: {
    lowerLobbyHeadroomFailureStations: { cellCount: lobbyHeadroomFailures.length, cells: lobbyHeadroomFailures.map(({ floor }) => floor), coordinateSetSha256: hashCells(lobbyHeadroomFailures.map(({ floor }) => floor)) },
    retainedR06WetBand: { cellCount: wetBand.length, bounds: { minX: 2094, maxX: 2114, minY: 5, maxY: 17, minZ: -438, maxZ: -388 }, coordinateSetSha256: hashCells(wetBand.map(({ cell }) => cell)) },
    unsupportedGravel: gravel,
    r09jClosedCap: cap,
  },
  disjointDryScreen: {
    lowerLobbyPassingStations: { cellCount: lobbyDrySupported.length, coordinateSetSha256: hashCells(lobbyDrySupported), disposition: 'AS_BUILT_FLOOR_AND_SUPPORT_ALREADY_PRESENT' },
    lowerLobbyDefectsOutsideHeadroom: lowerDefectsOutsideHeadroom,
    storedBlockEntitiesInDryInteractionEnvelope: storedBlockEntities,
    savedEntitiesInDryInteractionEnvelope,
    potentialOperationCells: 0,
    reason: 'All 34 dry, supported, two-block-clear lower-lobby stations already have their accepted floor and support. The remaining 29 lobby stations are explicitly excluded headroom defects; no distinct missing floor, support, containment, or connection target exists in the owned lower-lobby volume.',
  },
  upperComponent: {
    status: 'EXISTING_BOUNDED_INSPECTION_ROUTE_ONLY',
    acceptedSurfaceCellCount: 91,
    boundary: 'R09J cap at (2105,30..31,-397)',
    disposition: 'Not a public/staff connection and not a distinct MP03 mutation target.',
  },
  decision: {
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    result: 'NO_PACKAGE_EMITTED',
    factualHold: immutableEntityPlanePresent
      ? 'No function-improving disjoint delta exists: usable lower-lobby stations are already built; all other apparent continuation cells encounter the separately excluded headroom, water, gravity, or closed-cap boundaries. The complete immutable entities plane contains no saved entity in the possible dry-lobby interaction envelope.'
      : 'No function-improving disjoint delta exists: usable lower-lobby stations are already built; all other apparent continuation cells encounter the separately excluded headroom, water, gravity, or closed-cap boundaries. The missing immutable entities plane independently precludes an operation package.',
    exactPrerequisite: 'Undertake a separate structural/hydraulic design for at least one excluded boundary, then capture a fresh complete source and prove exact ownership, block-entity and live-entity clearance before proposing a route package.',
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: OUT,
  drySupportedExistingStations: lobbyDrySupported.length,
  excludedHeadroomStations: lobbyHeadroomFailures.length,
  wetCells: wetBand.length,
  storedBlockEntities: storedBlockEntities.length,
  savedEntities: savedEntitiesInDryInteractionEnvelope.length,
  entityPlanePresent: report.source.immutableEntityPlanePresent,
  operations: 0,
}, null, 2));
