#!/usr/bin/env node
/**
 * MP08-FRESH-COMPLETE-SOURCE-03
 *
 * Read-only Raven Rock candidate survey against a complete immutable save.
 * It deliberately does not compile operations: it proves (or rejects) the
 * first useful current-source candidate before a fresh-live release kernel is
 * requested. Cavern C, C2, and RR-N6 are explicit exclusions.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString, uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-r10-high16-high14-band-post-20260826T120000Z');
const OUT = value('--out', 'data/world-review/mp08-fresh-complete-source-03-20260826T102731Z.json');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (valueToHash) => crypto.createHash('sha256').update(valueToHash).digest('hex');
const AIR = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);
const FLUID = new Set(['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column']);
const GRAVITY = new Set([
  'minecraft:sand', 'minecraft:red_sand', 'minecraft:gravel',
  'minecraft:suspicious_sand', 'minecraft:suspicious_gravel',
  'minecraft:anvil', 'minecraft:chipped_anvil', 'minecraft:damaged_anvil',
  'minecraft:dragon_egg', 'minecraft:pointed_dripstone', 'minecraft:scaffolding',
]);
const FORBIDDEN = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:spawner', 'minecraft:lectern', 'minecraft:brewing_stand',
  'minecraft:beacon', 'minecraft:jukebox', 'minecraft:beehive',
  'minecraft:bee_nest', 'minecraft:decorated_pot', 'minecraft:chiseled_bookshelf',
  'minecraft:command_block', 'minecraft:chain_command_block',
  'minecraft:repeating_command_block', 'minecraft:structure_block', 'minecraft:jigsaw',
]);
const blockName = (state) => state.split('[', 1)[0];
const isAir = (state) => AIR.has(blockName(state));
const isFluid = (state) => FLUID.has(blockName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => GRAVITY.has(blockName(state)) || blockName(state).endsWith('_concrete_powder');
const isForbidden = (state) => FORBIDDEN.has(blockName(state)) || blockName(state).endsWith('_shulker_box');
const fail = (condition, message) => {
  if (!condition) throw new Error(`MP08 fresh candidate rejected: ${message}`);
};

const capturePath = absolute(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const memberKinds = new Set(capture.requiredMembers.map(({ path: memberPath }) => memberPath.split('/', 1)[0]));
fail(capture.immutableCopy === true, 'capture is not immutable');
for (const kind of ['region', 'entities', 'poi']) fail(memberKinds.has(kind), `complete capture lacks ${kind}/ members`);
fail(capture.requiredMembers.some(({ path: memberPath }) => memberPath === 'level.dat'), 'complete capture lacks level.dat');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const cache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!cache.has(key)) {
    cache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  }
  return cache.get(key);
};

// RR-T1b is the authored five-wide primary tunnel from North Blast Vestibule
// N1 to Cavern A. Its three-wide centre core is independently usable and is
// disjoint from the closed C2/Cavern-C/RR-N6 system. Search the real floor at
// each station rather than inheriting a historical slope.
const profile = [];
for (let z = -120; z <= -45; z += 1) {
  const validFloors = [];
  for (let floorY = -14; floorY <= -3; floorY += 1) {
    const records = [];
    for (let x = -1; x <= 1; x += 1) {
      records.push({
        x,
        support: await stateAt({ x, y: floorY, z }),
        feet: await stateAt({ x, y: floorY + 1, z }),
        head: await stateAt({ x, y: floorY + 2, z }),
      });
    }
    if (records.every(({ support, feet, head }) => !isAir(support) && !isFluid(support)
      && isAir(feet) && isAir(head))) validFloors.push(floorY);
  }
  fail(validFloors.length === 1, `T1b station z=${z} has ${validFloors.length} valid three-wide floor elevations`);
  profile.push({ z, floorY: validFloors[0] });
}
for (let index = 1; index < profile.length; index += 1) {
  fail(Math.abs(profile[index].floorY - profile[index - 1].floorY) <= 1,
    `T1b grade exceeds one at z=${profile[index - 1].z}→${profile[index].z}`);
}

const coreCells = uniqueCells(profile.flatMap(({ z, floorY }) => {
  const cells = [];
  for (let x = -1; x <= 1; x += 1) {
    cells.push({ x, y: floorY, z }, { x, y: floorY + 1, z }, { x, y: floorY + 2, z });
  }
  return cells;
}));
const coreRecords = [];
for (const cell of coreCells) coreRecords.push({ cell, state: await stateAt(cell) });
const coreHazards = coreRecords.filter(({ state }) => isFluid(state) || isGravity(state) || isForbidden(state));
fail(coreHazards.length === 0, `T1b core contains fluid/gravity/container/control: ${JSON.stringify(coreHazards.slice(0, 8))}`);

// These are prospective wall-sign positions only. Both are deliberately in
// the outer aisle, leaving the measured x=-1..1 core untouched. They provide
// the masterplan's missing advance/confirmation wayfinding between N1 and
// Cavern A; a later compiler must still decide the final sign copy and run a
// fresh immediate pre-execution capture/kernel.
const prospectiveTargets = [
  {
    id: 'north-advance',
    cell: { x: -7, y: -4, z: -117 },
    support: { x: -8, y: -4, z: -117 },
    desiredState: 'minecraft:spruce_wall_sign[facing=east,waterlogged=false]',
    endpointFunction: 'advance confirmation from North Blast Vestibule N1 toward Cavern A',
  },
  {
    id: 'cavern-a-confirmation',
    cell: { x: 4, y: -10, z: -48 },
    support: { x: 5, y: -10, z: -48 },
    desiredState: 'minecraft:spruce_wall_sign[facing=west,waterlogged=false]',
    endpointFunction: 'return confirmation from Cavern A toward North Blast Vestibule N1 / North Portal',
  },
];
for (const target of prospectiveTargets) {
  target.sourceState = await stateAt(target.cell);
  target.supportState = await stateAt(target.support);
  fail(isAir(target.sourceState), `${target.id} target is not dry air: ${target.sourceState}`);
  fail(!isAir(target.supportState) && !isFluid(target.supportState),
    `${target.id} wall-sign support is not solid/nonfluid: ${target.supportState}`);
}
const targetCells = prospectiveTargets.map(({ cell }) => cell);
const targetKeys = new Set(targetCells.map(cellKey));
const sixDirections = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const haloCells = uniqueCells(targetCells.flatMap(({ x, y, z }) => sixDirections.map(([dx, dy, dz]) => ({
  x: x + dx, y: y + dy, z: z + dz,
})))).filter((cell) => !targetKeys.has(cellKey(cell)));
const haloRecords = [];
for (const cell of haloCells) haloRecords.push({ cell, state: await stateAt(cell) });
const haloHazards = haloRecords.filter(({ state }) => isFluid(state) || isGravity(state) || isForbidden(state));
fail(haloHazards.length === 0, `prospective target halo contains fluid/gravity/container/control: ${JSON.stringify(haloHazards)}`);

const envelope = uniqueCells([...targetCells, ...haloCells]);
const envelopeKeys = new Set(envelope.map(cellKey));
const envelopeBounds = boundsOf(envelope);
const chunkKeys = new Set(envelope.map(({ x, z }) => `${Math.floor(x / 16)},${Math.floor(z / 16)}`));
const blockEntities = [];
const savedEntities = [];
for (const key of chunkKeys) {
  const [chunkX, chunkZ] = key.split(',').map(Number);
  const chunk = await reader.chunk(chunkX, chunkZ);
  for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
    const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
    if (envelopeKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
  }
  const entityChunk = await entityReader.chunk(chunkX, chunkZ);
  for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
    const position = entity.Pos?.slice(0, 3).map(Number);
    if (position?.length === 3 && position[0] >= envelopeBounds.minX && position[0] < envelopeBounds.maxX + 1
      && position[1] >= envelopeBounds.minY && position[1] < envelopeBounds.maxY + 1
      && position[2] >= envelopeBounds.minZ && position[2] < envelopeBounds.maxZ + 1) {
      savedEntities.push({ id: entity.id ?? entity.Id ?? null, position });
    }
  }
}
fail(blockEntities.length === 0 && savedEntities.length === 0,
  `prospective targets meet a stored entity/block-entity: ${JSON.stringify({ blockEntities, savedEntities })}`);

const closedSystems = [
  { id: 'RR-C2/Cavern-C', bounds: { minX: -125, maxX: -70, minY: -25, maxY: -3, minZ: -25, maxZ: -2 } },
  { id: 'RR-N6/T4 wet interface', bounds: { minX: -292, maxX: -185, minY: -18, maxY: 14, minZ: -12, maxZ: 8 } },
];
const axisGap = (left, right) => Math.max(0, left.min - right.max - 1, right.min - left.max - 1);
const disjointSystems = closedSystems.map(({ id, bounds }) => ({
  id,
  bounds,
  axisGaps: {
    x: axisGap({ min: envelopeBounds.minX, max: envelopeBounds.maxX }, { min: bounds.minX, max: bounds.maxX }),
    y: axisGap({ min: envelopeBounds.minY, max: envelopeBounds.maxY }, { min: bounds.minY, max: bounds.maxY }),
    z: axisGap({ min: envelopeBounds.minZ, max: envelopeBounds.maxZ }, { min: bounds.minZ, max: bounds.maxZ }),
  },
}));
for (const entry of disjointSystems) {
  fail(entry.axisGaps.x > 0 || entry.axisGaps.y > 0 || entry.axisGaps.z > 0,
    `prospective target envelope touches excluded ${entry.id}`);
}

const report = {
  schemaVersion: 1,
  id: 'MP08-FRESH-COMPLETE-SOURCE-03',
  generatedAtUtc: new Date().toISOString(),
  status: 'CANDIDATE_FOUND_NO_OPERATION_COMPILED',
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
  source: {
    snapshot: relative(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    immutableCopy: capture.immutableCopy,
    requiredMemberCount: capture.requiredMembers.length,
    completePlanes: ['region', 'entities', 'poi', 'level.dat'],
    captureManifestSha256: sha256(fs.readFileSync(capturePath)),
  },
  authority: {
    canonicalOwner: 'Raven Rock / Site R',
    catalogFeatures: ['RR-T1b', 'RR-N1', 'RR-C1 / Cavern A'],
    actualFunction: 'North Blast Vestibule N1 to Cavern A primary-route advance and return wayfinding.',
    excluded: ['RR-C2', 'Cavern C', 'RR-N6', 'T4 wet interface'],
  },
  routeProof: {
    threeWideCore: { x: [-1, 1], stationCount: profile.length, profile, coordinateSetSha256: hashCells(coreCells) },
    normalWalk: {
      supportAndTwoClearCellsAtEveryStation: true,
      maximumAdjacentFloorDelta: Math.max(...profile.slice(1).map((entry, index) => Math.abs(entry.floorY - profile[index].floorY))),
      noFluidGravityContainerOrControlInCore: true,
      coreCellCount: coreCells.length,
    },
  },
  prospectiveWayfindingTreatment: {
    targets: prospectiveTargets,
    targetCoordinateSetSha256: hashCells(targetCells),
    targetCount: targetCells.length,
    candidateOnly: 'Exact operation, sign NBT, inverse, and final copy are intentionally not emitted by this survey.',
    leavesMeasuredThreeWideCoreUntouched: true,
    interactionHalo: { cellCount: haloCells.length, coordinateSetSha256: hashCells(haloCells), records: haloRecords },
  },
  clearance: {
    targetFluidGravityContainerControlCount: 0,
    haloFluidGravityContainerControlCount: 0,
    targetAndHaloBlockEntityCount: blockEntities.length,
    targetAndHaloSavedEntityCount: savedEntities.length,
    excludedSystemDisjointness: disjointSystems,
  },
  nextRequiredKernel: [
    'Fresh immutable source capture immediately before any mutation (this survey source must not be reused as the execution source).',
    'Exact final sign targets/text/NBT and inverse, including strict parser validation for CMD text writes.',
    'Fresh live-entity clearance, source preflight, journalled strict execution, fresh post snapshot, rollback post-state preflight, and bidirectional route/legibility QA.',
  ],
  nonClaims: [
    'No C2, Cavern C, RR-N6, T4, containment, excavation, public-opening, or whole-complex completion claim.',
    'This is a candidate survey, not a guarded physical release.',
  ],
};
report.identitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  report: relative(OUT),
  sourceCapture: report.source.captureId,
  coreStations: profile.length,
  candidateTargets: prospectiveTargets.length,
  sourceBlockEntities: blockEntities.length,
  sourceSavedEntities: savedEntities.length,
  identitySha256: report.identitySha256,
}, null, 2));
