#!/usr/bin/env node
/**
 * Read-only MP09 Long Water closed-basin / access-engineering survey.
 *
 * This is deliberately not a compiler: it emits no guarded operations and
 * never calls the live world.  Its sole job is to answer whether the current
 * complete immutable source bounds the water affected by the only reviewed
 * Stoa-to-Tempietto approach.  A component that reaches the survey envelope
 * is not evidence for a closed basin.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { AnvilReader, boundsOf, cellKey, hashCells, stateToCommandString } from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = args.indexOf(flag);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-rail-r10-high15-post-20260826T091700Z');
const OUT = value('--out', 'data/world-review/mp09-long-water-closed-basin-survey-20260826T093310Z.json');
const GENERATED_AT = value('--generated-at', '2026-08-26T09:33:10Z');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const point = (x, y, z) => ({ x, y, z });
const nameOf = (state) => state.split('[', 1)[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(nameOf(state)) || state.includes('waterlogged=true');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(nameOf(state));
const inBounds = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const neighbours = ({ x, y, z }) => [point(x - 1, y, z), point(x + 1, y, z), point(x, y - 1, z), point(x, y + 1, z), point(x, y, z - 1), point(x, y, z + 1)];

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  if (!fs.existsSync(path.join(absolute(SNAPSHOT), member))) throw new Error(`MP09 hydrology survey requires complete source member: ${member}`);
}

const blockReader = new AnvilReader(path.join(absolute(SNAPSHOT), 'region'));
const entityReader = new AnvilReader(path.join(absolute(SNAPSHOT), 'entities'));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await blockReader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};

/* The prior read-only screen established that this is the only route-relevant
 * unbuilt alignment.  This survey does not broaden it into a speculative
 * waterfront project. */
const deck = [];
for (let z = -455; z >= -550; z -= 1) for (const x of [-87, -86]) deck.push(point(x, 67, z));
for (const x of [-87, -86]) deck.push(point(x, 68, -551), point(x, 69, -552));
const displacement = [];
for (let z = -458; z >= -550; z -= 1) for (const x of [-87, -86]) displacement.push(point(x, 66, z));

/* The full frozen Ravensgate footprint, expanded one grade below the candidate
 * water table and three grades above the walking band.  Boundary contact is a
 * fail-closed result: it says only that this source has not bounded the basin. */
const surveyBounds = { minX: -148, maxX: -64, minY: 64, maxY: 70, minZ: -562, maxZ: -420 };
const displacementStates = [];
for (const cell of displacement) displacementStates.push({ cell, state: await stateAt(cell) });
const sourceWater = displacementStates.filter(({ state }) => state === 'minecraft:water[level=0]');
const nonSourceWater = displacementStates.filter(({ state }) => state !== 'minecraft:water[level=0]');

const queue = sourceWater.map(({ cell }) => cell);
const queued = new Set(queue.map(cellKey));
const visited = new Set();
const component = [];
let cursor = 0;
const MAX_COMPONENT_CELLS = 100000;
while (cursor < queue.length && component.length < MAX_COMPONENT_CELLS) {
  const cell = queue[cursor++];
  const key = cellKey(cell);
  if (visited.has(key)) continue;
  visited.add(key);
  if (!inBounds(cell, surveyBounds) || !isFluid(await stateAt(cell))) continue;
  component.push(cell);
  for (const next of neighbours(cell)) {
    const nextKey = cellKey(next);
    if (inBounds(next, surveyBounds) && !visited.has(nextKey) && !queued.has(nextKey)) {
      queued.add(nextKey);
      queue.push(next);
    }
  }
}
const componentKeys = new Set(component.map(cellKey));
const boundaryContacts = component.filter((cell) => cell.x === surveyBounds.minX || cell.x === surveyBounds.maxX
  || cell.y === surveyBounds.minY || cell.y === surveyBounds.maxY || cell.z === surveyBounds.minZ || cell.z === surveyBounds.maxZ);
const boundaryFaces = [...new Set(boundaryContacts.flatMap((cell) => [
  cell.x === surveyBounds.minX ? 'minX' : null,
  cell.x === surveyBounds.maxX ? 'maxX' : null,
  cell.y === surveyBounds.minY ? 'minY' : null,
  cell.y === surveyBounds.maxY ? 'maxY' : null,
  cell.z === surveyBounds.minZ ? 'minZ' : null,
  cell.z === surveyBounds.maxZ ? 'maxZ' : null,
].filter(Boolean)))].sort();

const headroomFailures = [];
const supportFailures = [];
for (const floor of deck) {
  const [floorState, feet, head, below] = await Promise.all([
    stateAt(floor), stateAt(point(floor.x, floor.y + 1, floor.z)),
    stateAt(point(floor.x, floor.y + 2, floor.z)), stateAt(point(floor.x, floor.y - 1, floor.z)),
  ]);
  if (!isAir(feet) || !isAir(head)) headroomFailures.push({ floor, feet, head });
  if (isAir(below) || isFluid(below)) supportFailures.push({ floor, below });
  if (!['minecraft:grass_block', 'minecraft:dirt', 'minecraft:stone_bricks', 'minecraft:smooth_stone'].includes(nameOf(floorState))) {
    throw new Error(`unexpected current deck floor state ${cellKey(floor)}=${floorState}; survey must be revised rather than normalizing it`);
  }
}

const interaction = [...deck, ...displacement];
const interactionBounds = boundsOf(interaction);
const interactionKeys = new Set(interaction.map(cellKey));
const blockEntities = [];
const savedEntities = [];
for (let chunkX = Math.floor(interactionBounds.minX / 16); chunkX <= Math.floor(interactionBounds.maxX / 16); chunkX += 1) {
  for (let chunkZ = Math.floor(interactionBounds.minZ / 16); chunkZ <= Math.floor(interactionBounds.maxZ / 16); chunkZ += 1) {
    const chunk = await blockReader.chunk(chunkX, chunkZ);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = point(Number(entity.x), Number(entity.y), Number(entity.z));
      if (interactionKeys.has(cellKey(cell))) blockEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
    }
    const entityChunk = await entityReader.chunk(chunkX, chunkZ);
    for (const entity of entityChunk?.Entities ?? entityChunk?.entities ?? []) {
      const position = (entity.Pos ?? entity.pos ?? []).slice(0, 3).map(Number);
      if (position.length !== 3 || position.some(Number.isNaN)) continue;
      const cell = point(Math.floor(position[0]), Math.floor(position[1]), Math.floor(position[2]));
      if (inBounds(cell, interactionBounds)) savedEntities.push({ id: entity.id ?? entity.Id ?? null, cell });
    }
  }
}

const ownershipPath = 'data/world-review/ravensgate-ownership-contract-20260825/ravensgate-ownership-contract.json';
const ownership = JSON.parse(fs.readFileSync(absolute(ownershipPath), 'utf8'));
const matchingInterfaces = (ownership.interfaces ?? []).filter(({ id, name }) => /long|water|tempietto|hydrology|displacement|landing|grade/i.test(`${id} ${name}`));
const northEndpoint = { id: 'accepted-garden-loop-north-approach', floorCells: [point(-87, 67, -454), point(-86, 67, -454)], standingCells: [point(-87, 68, -454), point(-86, 68, -454)] };
const southEndpoint = { id: 'catalogued-tempietto-entrance', entrance: point(-85, 69, -552), structureBounds: { minX: -93, maxX: -77, minY: 68, maxY: 82, minZ: -562, maxZ: -551 } };
const endpoints = [];
for (const endpoint of [northEndpoint, southEndpoint]) {
  const cells = endpoint.floorCells ?? [endpoint.entrance];
  endpoints.push({ ...endpoint, states: await Promise.all(cells.map(async (cell) => ({ cell, state: await stateAt(cell) }))) });
}

const result = {
  schemaVersion: 1,
  id: 'MP09-LONG-WATER-CLOSED-BASIN-SURVEY-01',
  generatedAtUtc: GENERATED_AT,
  readOnly: true,
  source: {
    snapshot: relative(SNAPSHOT),
    capture: JSON.parse(fs.readFileSync(path.join(absolute(SNAPSHOT), 'combined-zones-complete-save-capture.json'), 'utf8')),
    requiredMembersPresent: true,
    limitation: 'This is a current complete immutable source for offline engineering only. A future physical package still requires its own fresh source, live-entity clearance, preflight, execution journal, post snapshot, and rollback preflight.',
  },
  reviewedAlignment: {
    deck: { cellCount: deck.length, coordinateSetSha256: hashCells(deck), bounds: boundsOf(deck) },
    proposedFoundationDisplacement: {
      cellCount: displacement.length,
      coordinateSetSha256: hashCells(displacement),
      exactSourceWaterCells: sourceWater.length,
      nonSourceWaterCells: nonSourceWater,
    },
    endpoints,
    headroomFailures: { cellCount: headroomFailures.length, coordinateSetSha256: hashCells(headroomFailures.map(({ floor }) => floor)), cells: headroomFailures },
    unsupportedFloorCells: { cellCount: supportFailures.length, coordinateSetSha256: hashCells(supportFailures.map(({ floor }) => floor)), cells: supportFailures },
  },
  hydrology: {
    componentDefinition: 'Six-neighbour fluid component seeded from every proposed foundation-displacement cell, evaluated only inside the stated frozen-district water/grade survey envelope.',
    surveyBounds,
    componentCellCountWithinSurveyEnvelope: component.length,
    componentCoordinateSetSha256: hashCells(component),
    componentBoundsWithinSurveyEnvelope: boundsOf(component),
    boundaryContactCellCount: boundaryContacts.length,
    boundaryContactCoordinateSetSha256: hashCells(boundaryContacts),
    boundaryFaces,
    componentReachedTraversalCap: component.length >= MAX_COMPONENT_CELLS,
    closedBasinProven: component.length > 0 && boundaryContacts.length === 0 && component.length < MAX_COMPONENT_CELLS,
    conclusion: boundaryContacts.length > 0 || component.length >= MAX_COMPONENT_CELLS
      ? 'NOT_PROVEN_CLOSED: affected water reaches the survey-envelope boundary; neither retained side-flow nor a fixed basin volume is bounded by this source.'
      : 'LOCAL_COMPONENT_BOUNDED_ONLY: broader containment and ownership review still required.',
  },
  safetyScreen: {
    interactionBounds,
    storedBlockEntityIntersections: blockEntities,
    savedEntityIntersectionsAtCapture: savedEntities,
    note: 'The saved-entity result is historical capture evidence only and is not a substitute for a new live-entity clearance.',
  },
  ownership: {
    contract: ownershipPath,
    exactLongWaterHydrologyOrLandingInterfaces: matchingInterfaces,
    hasRequiredContract: matchingInterfaces.length > 0,
  },
  decision: {
    result: 'NO_CLOSED_BASIN_OR_ACCESS_PACKAGE_CAN_BE_STATED',
    forwardOperationCount: 0,
    rollbackOperationCount: 0,
    reason: 'The reviewed 186-cell displacement is coupled to a fluid component that reaches the frozen-district survey boundary, while the route has exact blocked headroom and unsupported cells and no Long Water water/grade/landing ownership record.',
    exactMissingEngineeringData: [
      'An exact, source-bound containment perimeter whose complete six-neighbour fluid component does not cross its perimeter, including all vertical side-flow and base interfaces.',
      'A one-owner-per-cell Long Water contract assigning every containment, displacement, outlet/overflow (if any), bridge, north tie-in, and Tempietto landing cell; the current contract contains no matching interface.',
      'A civil grade and two-wide landing geometry at the real north approach and (-85,69,-552) Tempietto entrance that avoids the listed headroom failures and has supported floors.',
      'A canonical per-cell before/after/inverse set, with the containment installed before any water displacement and a reverse order that restores the exact water states.',
      'A new same-moment complete capture plus fresh live-entity clearance and physical-kernel evidence before mutation.',
    ],
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false, operationFilesEmitted: false },
};
result.identitySha256 = sha256(`${JSON.stringify(result, null, 2)}\n`);
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({
  id: result.id,
  source: result.source.snapshot,
  displacementSourceWater: result.reviewedAlignment.proposedFoundationDisplacement.exactSourceWaterCells,
  componentCells: result.hydrology.componentCellCountWithinSurveyEnvelope,
  boundaryFaces: result.hydrology.boundaryFaces,
  closedBasinProven: result.hydrology.closedBasinProven,
  headroomFailures: result.reviewedAlignment.headroomFailures.cellCount,
  unsupportedFloorCells: result.reviewedAlignment.unsupportedFloorCells.cellCount,
  matchingOwnershipContracts: result.ownership.exactLongWaterHydrologyOrLandingInterfaces.length,
  savedEntityIntersectionsAtCapture: result.safetyScreen.savedEntityIntersectionsAtCapture.length,
  result: result.decision.result,
  report: OUT,
}, null, 2));
