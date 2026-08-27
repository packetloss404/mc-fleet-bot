#!/usr/bin/env node
/**
 * Read-only topology extension for the MP05 B07 water-bearing component.
 *
 * This deliberately produces no guarded operations.  It is a source-bound
 * hydrology map: an observed, finite trace boundary is never promoted into a
 * containment receiver, liner, ownership assignment, or construction set.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  deriveB07WestTwo,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const SNAPSHOT = value('--snapshot', 'data/worldsnap-mp10-bell-penthouse-post-20260826T123537Z');
const OUT = value('--out-dir', 'data/world-review/mp05-b07-fluid-topology-extension-01-20260826T123537Z');
const MARKDOWN = value('--markdown-out', 'docs/masterplans/05-combined-zones/MP05-B07-FLUID-TOPOLOGY-EXTENSION-01-2026-08-26.md');
const GENERATED_AT = value('--generated-at', '2026-08-26T13:40:00Z');
const MAX_EXTENDED_CELLS = Number(value('--max-extended-cells', '125000'));
const abs = (filename) => path.resolve(ROOT, filename);
const rel = (filename) => path.relative(ROOT, abs(filename)).replaceAll(path.sep, '/');
const readJson = (filename) => JSON.parse(fs.readFileSync(abs(filename), 'utf8'));
const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');
const invariant = (condition, message) => { if (!condition) throw new Error(message); };
const stateName = (state) => state.split('[')[0];
const isFluid = (state) => ['minecraft:water', 'minecraft:lava', 'minecraft:bubble_column'].includes(stateName(state)) || state.includes('waterlogged=true');
const isGravity = (state) => ['minecraft:gravel', 'minecraft:sand', 'minecraft:red_sand'].includes(stateName(state)) || stateName(state).endsWith('_concrete_powder');
const isAir = (state) => ['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air'].includes(stateName(state));
const isSolidPotentialIsolation = (state) => !isFluid(state) && !isAir(state) && !isGravity(state);
const pointSort = (left, right) => left.x - right.x || left.y - right.y || left.z - right.z;
const neighbourDirections = [
  { id: 'NEGATIVE_X', delta: { x: -1, y: 0, z: 0 } }, { id: 'POSITIVE_X', delta: { x: 1, y: 0, z: 0 } },
  { id: 'NEGATIVE_Y', delta: { x: 0, y: -1, z: 0 } }, { id: 'POSITIVE_Y', delta: { x: 0, y: 1, z: 0 } },
  { id: 'NEGATIVE_Z', delta: { x: 0, y: 0, z: -1 } }, { id: 'POSITIVE_Z', delta: { x: 0, y: 0, z: 1 } },
];
const neighbours = (cell) => neighbourDirections.map(({ id, delta }) => ({
  direction: id,
  cell: { x: cell.x + delta.x, y: cell.y + delta.y, z: cell.z + delta.z },
}));
const inside = (cell, bounds) => cell.x >= bounds.minX && cell.x <= bounds.maxX
  && cell.y >= bounds.minY && cell.y <= bounds.maxY
  && cell.z >= bounds.minZ && cell.z <= bounds.maxZ;
const isBoundary = (cell, bounds) => cell.x === bounds.minX || cell.x === bounds.maxX
  || cell.y === bounds.minY || cell.y === bounds.maxY
  || cell.z === bounds.minZ || cell.z === bounds.maxZ;
const manifest = (cells) => {
  const exact = uniqueCells(cells);
  return {
    cellCount: exact.length,
    bounds: exact.length ? boundsOf(exact) : null,
    coordinateSetSha256: hashCells(exact),
  };
};
const faceManifest = (faces) => ({
  faceCount: faces.length,
  fromFluid: manifest(faces.map(({ fromFluid }) => fromFluid)),
  toNonFluid: manifest(faces.map(({ toNonFluid }) => toNonFluid)),
  faceSetSha256: sha256(`${faces.slice().sort((left, right) => `${cellKey(left.fromFluid)}:${left.direction}:${cellKey(left.toNonFluid)}`.localeCompare(`${cellKey(right.fromFluid)}:${right.direction}:${cellKey(right.toNonFluid)}`)).map(({ fromFluid, direction, toNonFluid }) => `${cellKey(fromFluid)} ${direction} ${cellKey(toNonFluid)}`).join('\n')}\n`),
});
const stateCounts = (records) => Object.fromEntries([...records.reduce((counts, { state }) => {
  counts.set(state, (counts.get(state) ?? 0) + 1);
  return counts;
}, new Map()).entries()].sort(([left], [right]) => left.localeCompare(right)));
const directionCounts = (faces) => Object.fromEntries(neighbourDirections.map(({ id }) => [id, faces.filter(({ direction }) => direction === id).length]));
const escapeXml = (text) => String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

for (const member of ['region', 'entities', 'poi', 'level.dat', 'combined-zones-complete-save-capture.json']) {
  invariant(fs.existsSync(abs(path.join(SNAPSHOT, member))), `Missing complete immutable snapshot member: ${member}`);
}
invariant(Number.isInteger(MAX_EXTENDED_CELLS) && MAX_EXTENDED_CELLS > 0, 'max extended cells must be a positive integer');
const capture = readJson(path.join(SNAPSHOT, 'combined-zones-complete-save-capture.json'));
const mechanismsPath = 'docs/masterplans/05-combined-zones/phase1-d06-mechanisms.json';
const containmentPath = 'data/world-review/mp05-b07-containment-contract-01-20260826T123537Z/containment-contract-findings.json';
const ownershipPath = 'data/world-review/mp05-b07-ownership-interface-contract-01-20260826T123537Z/ownership-interface-contract-findings.json';
for (const input of [mechanismsPath, containmentPath, ownershipPath]) invariant(fs.existsSync(abs(input)), `Required source-bound input missing: ${input}`);
const mechanisms = readJson(mechanismsPath);
const b07 = deriveB07WestTwo(mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem);
invariant(b07.construction.length === 8134 && b07.interaction.length === 13608, 'B07 canonical geometry drift');
const constructionKeys = new Set(b07.construction.map(cellKey));
const interactionKeys = new Set(b07.interaction.map(cellKey));
const reader = new AnvilReader(abs(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(abs(path.join(SNAPSHOT, 'entities')));
const stateCache = new Map();
const stateAt = async (cell) => {
  const key = cellKey(cell);
  if (!stateCache.has(key)) stateCache.set(key, stateToCommandString(await reader.blockState(cell.x, cell.y, cell.z)));
  return stateCache.get(key);
};

const interactionFluid = [];
for (const cell of b07.interaction) {
  const state = await stateAt(cell);
  if (isFluid(state)) interactionFluid.push({ cell, state });
}
// Earlier source had 89 cells. Subsequent contained plug/receiver releases
// may legitimately reduce that count; a fresh non-zero observed set is the
// only valid seed for this read-only successor survey.
invariant(interactionFluid.length > 0, 'No current B07 interaction-fluid seed remains to survey');
const seedCells = interactionFluid.map(({ cell }) => cell).sort(pointSort);

const trace = async ({ id, bounds, maximumCells }) => {
  const queue = seedCells.map((cell) => ({ ...cell }));
  const seen = new Map(queue.map((cell) => [cellKey(cell), cell]));
  let capReached = false;
  let processedCount = queue.length;
  for (let index = 0; index < queue.length; index += 1) {
    if (queue.length >= maximumCells) { capReached = true; processedCount = index; break; }
    for (const { cell } of neighbours(queue[index])) {
      if (!inside(cell, bounds)) continue;
      const key = cellKey(cell);
      if (seen.has(key) || !isFluid(await stateAt(cell))) continue;
      seen.set(key, cell);
      queue.push(cell);
      if (queue.length >= maximumCells) { capReached = true; break; }
    }
  }
  const cells = [...seen.values()].sort(pointSort);
  const unexpandedFrontier = capReached ? queue.slice(processedCount).sort(pointSort) : [];
  const boundaryCells = cells.filter((cell) => isBoundary(cell, bounds));
  const boundaryByFace = Object.fromEntries([
    ['NEGATIVE_X', cells.filter((cell) => cell.x === bounds.minX)], ['POSITIVE_X', cells.filter((cell) => cell.x === bounds.maxX)],
    ['NEGATIVE_Y', cells.filter((cell) => cell.y === bounds.minY)], ['POSITIVE_Y', cells.filter((cell) => cell.y === bounds.maxY)],
    ['NEGATIVE_Z', cells.filter((cell) => cell.z === bounds.minZ)], ['POSITIVE_Z', cells.filter((cell) => cell.z === bounds.maxZ)],
  ].map(([face, members]) => [face, manifest(members)]));
  const sourceContact = cells.filter((cell) => interactionKeys.has(cellKey(cell)));
  return {
    id,
    bounds,
    maximumCells,
    capReached,
    component: manifest(cells),
    sourceContact: manifest(sourceContact),
    constructionContact: manifest(cells.filter((cell) => constructionKeys.has(cellKey(cell)))),
    stateCensus: stateCounts(await Promise.all(cells.map(async (cell) => ({ state: await stateAt(cell) })))),
    boundaryFluid: manifest(boundaryCells),
    boundaryByFace,
    unexpandedCapFrontier: manifest(unexpandedFrontier),
    completeWithinEnvelope: !capReached && boundaryCells.length === 0,
    disposition: capReached ? 'CELL_CAP_REACHED_TOPOLOGY_INCOMPLETE' : boundaryCells.length ? 'COMPONENT_REACHES_FINITE_ENVELOPE_BOUNDARY_TOPOLOGY_INCOMPLETE' : 'FINITE_WITHIN_EXPLICIT_ENVELOPE_ONLY_NOT_A_RECEIVER',
    cells,
  };
};

const initialBounds = { minX: 2086, maxX: 2128, minY: -64, maxY: 319, minZ: -448, maxZ: -378 };
const extendedBounds = { minX: 2048, maxX: 2303, minY: -64, maxY: 127, minZ: -640, maxZ: -256 };
const initial = await trace({ id: 'B07-TOPOLOGY-TRACE-INITIAL', bounds: initialBounds, maximumCells: 20000 });
// The historical initial trace was 4,766 cells. Do not reject a fresh source
// merely because accepted containment changed the remaining topology.
invariant(initial.component.cellCount > 0, 'Initial B07 topology trace is empty');
const extended = await trace({ id: 'B07-TOPOLOGY-TRACE-EXTENDED', bounds: extendedBounds, maximumCells: MAX_EXTENDED_CELLS });

const extendedKeys = new Set(extended.cells.map(cellKey));
const extendedFaces = [];
for (const fromFluid of extended.cells) {
  for (const { direction, cell: toNonFluid } of neighbours(fromFluid)) {
    if (extendedKeys.has(cellKey(toNonFluid))) continue;
    const toState = await stateAt(toNonFluid);
    if (isFluid(toState)) continue;
    extendedFaces.push({
      fromFluid,
      toNonFluid,
      direction,
      toState,
      toConstruction: constructionKeys.has(cellKey(toNonFluid)),
      toInteraction: interactionKeys.has(cellKey(toNonFluid)),
      fromConstruction: constructionKeys.has(cellKey(fromFluid)),
      fromInteraction: interactionKeys.has(cellKey(fromFluid)),
      sourceBoundaryFluid: isBoundary(fromFluid, extendedBounds),
      solidNonGravity: isSolidPotentialIsolation(toState),
    });
  }
}
const b07InterfaceFaces = extendedFaces.filter(({ fromInteraction }) => fromInteraction);
const b07SolidIsolationFaces = b07InterfaceFaces.filter(({ solidNonGravity }) => solidNonGravity);
const b07ConstructionSolidIsolationFaces = b07SolidIsolationFaces.filter(({ toConstruction }) => toConstruction);
const exteriorSolidIsolationFaces = extendedFaces.filter(({ solidNonGravity, toInteraction }) => solidNonGravity && !toInteraction);
const sourceBoundaryFaces = extendedFaces.filter(({ sourceBoundaryFluid }) => sourceBoundaryFluid);

const blockEntityRecords = [];
const entityRecords = [];
const tracedBounds = extended.component.bounds;
if (tracedBounds) {
  for (let chunkX = Math.floor(tracedBounds.minX / 16); chunkX <= Math.floor(tracedBounds.maxX / 16); chunkX += 1) {
    for (let chunkZ = Math.floor(tracedBounds.minZ / 16); chunkZ <= Math.floor(tracedBounds.maxZ / 16); chunkZ += 1) {
      const chunk = await reader.chunk(chunkX, chunkZ);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (inside(cell, tracedBounds)) blockEntityRecords.push({ id: entity.id ?? null, cell });
      }
      const entityChunk = await entityReader.chunk(chunkX, chunkZ);
      for (const entity of entityChunk?.Entities ?? []) {
        const position = entity.Pos?.slice(0, 3).map(Number);
        if (position?.length === 3 && position[0] >= tracedBounds.minX && position[0] <= tracedBounds.maxX && position[1] >= tracedBounds.minY && position[1] <= tracedBounds.maxY && position[2] >= tracedBounds.minZ && position[2] <= tracedBounds.maxZ) entityRecords.push({ id: entity.id ?? null, position });
      }
    }
  }
}
const blockEntityKeys = new Set(blockEntityRecords.map(({ cell }) => cellKey(cell)));
const safeGeometryFaces = b07SolidIsolationFaces.filter(({ toNonFluid }) => !blockEntityKeys.has(cellKey(toNonFluid)));
const waterloggedCells = (await Promise.all(extended.cells.map(async (cell) => ((await stateAt(cell)).includes('waterlogged=true') ? cell : null)))).filter(Boolean);
const bubbleColumnCells = (await Promise.all(extended.cells.map(async (cell) => (stateName(await stateAt(cell)) === 'minecraft:bubble_column' ? cell : null)))).filter(Boolean);

const columnFacts = new Map();
for (const cell of extended.cells) {
  const id = `${cell.x},${cell.z}`;
  const current = columnFacts.get(id) ?? { x: cell.x, z: cell.z, count: 0, minY: cell.y, maxY: cell.y, waterlogged: 0, bubble: 0 };
  current.count += 1;
  current.minY = Math.min(current.minY, cell.y);
  current.maxY = Math.max(current.maxY, cell.y);
  const state = await stateAt(cell);
  if (state.includes('waterlogged=true')) current.waterlogged += 1;
  if (stateName(state) === 'minecraft:bubble_column') current.bubble += 1;
  columnFacts.set(id, current);
}
const sliceZ = -398;
const sliceX = 2107;

const mapDirectory = abs(OUT);
fs.mkdirSync(mapDirectory, { recursive: true });
const writeSvg = (filename, content) => fs.writeFileSync(path.join(mapDirectory, filename), content);
const heat = (ratio) => {
  const bounded = Math.max(0, Math.min(1, ratio));
  return `rgb(${Math.round(236 - 165 * bounded)},${Math.round(245 - 85 * bounded)},${Math.round(252 - 24 * bounded)})`;
};
const mapPlan = () => {
  const unit = 3;
  const left = 62; const top = 50;
  const width = left + (extendedBounds.maxX - extendedBounds.minX + 1) * unit + 280;
  const height = top + (extendedBounds.maxZ - extendedBounds.minZ + 1) * unit + 46;
  const maxCount = Math.max(1, ...[...columnFacts.values()].map(({ count }) => count));
  const rects = [];
  for (let z = extendedBounds.minZ; z <= extendedBounds.maxZ; z += 1) for (let x = extendedBounds.minX; x <= extendedBounds.maxX; x += 1) {
    const item = columnFacts.get(`${x},${z}`);
    const fill = item ? heat(item.count / maxCount) : '#ffffff';
    const title = item ? `${x},${z}: ${item.count} fluid-bearing cells, y=${item.minY}..${item.maxY}, waterlogged=${item.waterlogged}, bubble=${item.bubble}` : `${x},${z}: no traced component cell`;
    rects.push(`<rect x="${left + (x - extendedBounds.minX) * unit}" y="${top + (z - extendedBounds.minZ) * unit}" width="${unit}" height="${unit}" fill="${fill}"><title>${escapeXml(title)}</title></rect>`);
  }
  const b07Outline = boundsOf(b07.interaction);
  const outline = `<rect x="${left + (b07Outline.minX - extendedBounds.minX) * unit}" y="${top + (b07Outline.minZ - extendedBounds.minZ) * unit}" width="${(b07Outline.maxX - b07Outline.minX + 1) * unit}" height="${(b07Outline.maxZ - b07Outline.minZ + 1) * unit}" fill="none" stroke="#a61b1b" stroke-width="2"><title>B07 interaction bounds only; not an ownership envelope</title></rect>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#17202a}.title{font-size:16px;font-weight:bold}.sub{font-size:9px}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="21">MP05 B07 extended fluid-component plan density</text><text class="sub" x="12" y="38">One 3px cell per X/Z column; blue intensity = count of observed fluid-bearing cells; red = B07 interaction bounding box. Boundary/cap contact means incomplete topology.</text>${rects.join('')}${outline}<text x="${left + (extendedBounds.maxX - extendedBounds.minX + 1) * unit + 20}" y="72" font-size="10">Trace: ${extended.component.cellCount.toLocaleString()} cells</text><text x="${left + (extendedBounds.maxX - extendedBounds.minX + 1) * unit + 20}" y="92" font-size="10">Bounds: x ${extendedBounds.minX}..${extendedBounds.maxX}</text><text x="${left + (extendedBounds.maxX - extendedBounds.minX + 1) * unit + 20}" y="110" font-size="10">z ${extendedBounds.minZ}..${extendedBounds.maxZ}</text><text x="${left + (extendedBounds.maxX - extendedBounds.minX + 1) * unit + 20}" y="128" font-size="10">${escapeXml(extended.disposition)}</text></svg>`;
};
const mapSection = async ({ axis, fixed, range, filename, title }) => {
  const horizontal = Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index);
  const vertical = Array.from({ length: 193 }, (_, index) => 128 - index);
  const unit = 4; const left = 56; const top = 48;
  const rects = [];
  for (let yIndex = 0; yIndex < vertical.length; yIndex += 1) for (let hIndex = 0; hIndex < horizontal.length; hIndex += 1) {
    const cell = axis === 'x' ? { x: horizontal[hIndex], y: vertical[yIndex], z: fixed } : { x: fixed, y: vertical[yIndex], z: horizontal[hIndex] };
    const state = await stateAt(cell);
    const component = extendedKeys.has(cellKey(cell));
    const b07Cell = interactionKeys.has(cellKey(cell));
    const sourceFill = isAir(state) ? '#ffffff' : isGravity(state) ? '#e2b061' : isFluid(state) ? '#8e24aa' : '#cfd8dc';
    const fill = component ? (state.includes('waterlogged=true') ? '#3d7ea6' : stateName(state) === 'minecraft:bubble_column' ? '#4dd0e1' : '#1976d2') : b07Cell ? '#f7ede4' : sourceFill;
    rects.push(`<rect x="${left + hIndex * unit}" y="${top + yIndex * unit}" width="${unit}" height="${unit}" fill="${fill}" stroke="${b07Cell ? '#b71c1c' : '#eef2f5'}" stroke-width=".2"><title>${escapeXml(`${cellKey(cell)}: ${state}; traced=${component}; B07-interaction=${b07Cell}`)}</title></rect>`);
  }
  const width = left + horizontal.length * unit + 250; const height = top + vertical.length * unit + 34;
  const labels = horizontal.filter((_, index) => index % 32 === 0).map((coordinate) => `<text x="${left + (coordinate - range.min) * unit}" y="${top - 7}" font-size="7">${coordinate}</text>`).join('') + vertical.filter((_, index) => index % 32 === 0).map((coordinate) => `<text x="${left - 30}" y="${top + (128 - coordinate) * unit + 7}" font-size="7">${coordinate}</text>`).join('');
  writeSvg(filename, `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><style>text{font-family:ui-monospace,monospace;fill:#17202a}.title{font-size:16px;font-weight:bold}</style><rect width="100%" height="100%" fill="#fff"/><text class="title" x="12" y="20">${escapeXml(title)}</text><text x="12" y="37" font-size="9">Blue=traced water; dark-blue=traced waterlogged; cyan=traced bubble column; purple=other fluid; gray=solid; ochre=gravity; red edge=B07 interaction coordinate.</text>${rects.join('')}${labels}<text x="${left + horizontal.length * unit + 20}" y="72" font-size="10">Trace is incomplete</text><text x="${left + horizontal.length * unit + 20}" y="92" font-size="10">No isolation surface selected</text></svg>`);
};
writeSvg('b07-extended-fluid-component-plan.svg', mapPlan());
await mapSection({ axis: 'x', fixed: sliceZ, range: { min: 2048, max: 2303 }, filename: 'b07-extended-fluid-component-section-z398.svg', title: `MP05 B07 extended fluid section at z=${sliceZ}` });
await mapSection({ axis: 'z', fixed: sliceX, range: { min: -640, max: -256 }, filename: 'b07-extended-fluid-component-section-x2107.svg', title: `MP05 B07 extended fluid section at x=${sliceX}` });

const priorContainment = readJson(containmentPath);
const priorOwnership = readJson(ownershipPath);
const report = {
  schemaVersion: 1,
  id: 'MP05-B07-FLUID-TOPOLOGY-EXTENSION-01',
  generatedAtUtc: GENERATED_AT,
  status: 'SOURCE_BOUND_EXTENDED_FLUID_TOPOLOGY_HELD_NO_RECEIVER_OR_ISOLATION_AUTHORITY',
  purpose: 'Read-only extension of the B07 4,766-cell diagnostic component. It characterizes observed fluid connectivity, waterlogged/bubble states, source-facing interfaces, and geometrically dry solid faces. It never emits construction operations or assigns ownership.',
  source: {
    snapshotRoot: rel(SNAPSHOT),
    captureId: capture.captureId,
    capturedAtUtc: capture.capturedAtUtc,
    captureIdentity: capture.id,
    requiredMembersPresent: ['region', 'entities', 'poi', 'level.dat'].every((member) => fs.existsSync(abs(path.join(SNAPSHOT, member)))),
  },
  sourceBindings: Object.fromEntries([mechanismsPath, containmentPath, ownershipPath].map((filename) => [filename, { sha256: sha256(fs.readFileSync(abs(filename))), bytes: fs.statSync(abs(filename)).size }])),
  canonicalB07: { construction: manifest(b07.construction), interaction: manifest(b07.interaction), candidateId: mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.candidateId, physicalOpeningAuthorized: mechanisms.mechanismDevelopmentPayload.b07WestTwoSystem.physicalOpeningAuthorized },
  topologyTraces: {
    seed: { interactionFluid: manifest(seedCells), stateCensus: stateCounts(interactionFluid) },
    initial: { ...initial, cells: undefined },
    extended: { ...extended, cells: undefined },
    continuityCheck: {
      expectedInitialDiagnosticCellCount: 4766,
      initialCellCountMatchesPriorContainmentContract: initial.component.cellCount === priorContainment.fluidTopology.components[0].diagnosticComponent.cellCount,
      initialCoordinateSetMatchesPriorContainmentContract: initial.component.coordinateSetSha256 === priorContainment.fluidTopology.components[0].diagnosticComponent.coordinateSetSha256,
      extendedAddsObservedCells: extended.component.cellCount - initial.component.cellCount,
      conclusion: 'The extension is a larger read-only observation, not a finite endpoint declaration. A trace cell cap or any envelope-boundary contact fails closed for receiver design.',
    },
  },
  waterAndStructureCharacterization: {
    extendedStateCensus: extended.stateCensus,
    waterloggedCellCount: waterloggedCells.length,
    waterloggedCells: manifest(waterloggedCells),
    bubbleColumnCells: manifest(bubbleColumnCells),
    perColumnFacts: [...columnFacts.values()].sort((left, right) => left.x - right.x || left.z - right.z),
  },
  observedExternalInterfaces: {
    allObservedNonFluidFaces: { ...faceManifest(extendedFaces), directionCounts: directionCounts(extendedFaces), toStateCensus: stateCounts(extendedFaces.map(({ toState }) => ({ state: toState })),) },
    facesFromB07InteractionFluid: { ...faceManifest(b07InterfaceFaces), directionCounts: directionCounts(b07InterfaceFaces), toStateCensus: stateCounts(b07InterfaceFaces.map(({ toState }) => ({ state: toState }))) },
    facesFromB07InteractionToSolidNonGravity: { ...faceManifest(b07SolidIsolationFaces), directionCounts: directionCounts(b07SolidIsolationFaces), toStateCensus: stateCounts(b07SolidIsolationFaces.map(({ toState }) => ({ state: toState }))) },
    b07ConstructionSolidNonGravitySubset: { ...faceManifest(b07ConstructionSolidIsolationFaces), directionCounts: directionCounts(b07ConstructionSolidIsolationFaces) },
    observedOutsideInteractionSolidFaces: { ...faceManifest(exteriorSolidIsolationFaces), directionCounts: directionCounts(exteriorSolidIsolationFaces) },
    facesAtExtendedBoundary: { ...faceManifest(sourceBoundaryFaces), directionCounts: directionCounts(sourceBoundaryFaces) },
    qualification: 'These are only source-state faces observed while tracing an incomplete component. They do not establish a sealed interface, flow direction, pressure, capacity/freeboard, overflow route, receiver terminal, or a construction boundary.',
  },
  candidateIsolationSurfaceScreen: {
    definition: 'Geometrically dry, non-gravity, non-waterlogged solid neighbours of a B07 interaction-fluid cell, excluding recorded block-entity cells. This is a conservative geometry screen only, not a selected liner/receiver surface.',
    screenedFaces: { ...faceManifest(safeGeometryFaces), directionCounts: directionCounts(safeGeometryFaces), toStateCensus: stateCounts(safeGeometryFaces.map(({ toState }) => ({ state: toState }))) },
    result: 'NO_SAFE_ISOLATION_SURFACE_CAN_BE_ACCEPTED: the connected component remains incomplete, OWN-B07 is unaccepted, no counterpart/receiver/overflow owner or source-to-future state graph exists, and a solid neighbour alone supplies neither containment nor rollback safety.',
    requiredBeforeSelection: ['complete component closure or an exact independently sealed physical boundary with a reviewed face-state manifest', 'accepted B07 and counterpart ownership on every changed/influence cell', 'directed source -> treatment -> receiver -> overflow/failure contract with capacity/freeboard', 'waterlogged and bubble-column treatment rule, including exact source/rollback states', 'block-entity and live-entity recheck from a fresh immutable snapshot immediately before a scoped compiler'],
  },
  protectedAndOwnershipConflicts: {
    acceptedOwnershipState: priorOwnership.status,
    b07OwnerState: 'UNACCEPTED_PROPOSAL_ONLY_DEFAULT_DENY',
    activeAcceptedClosedAsset: 'R07J 49-cell upward cap remains accepted and fail-closed; this survey does not reopen it.',
    b07ConstructionFluidContacts: manifest(seedCells.filter((cell) => constructionKeys.has(cellKey(cell)))),
    b07InteractionFluidContacts: manifest(seedCells),
    recordedBlockEntitiesWithinTracedComponentBounds: blockEntityRecords,
    recordedSavedEntitiesWithinTracedComponentBounds: entityRecords,
    blockEntityFacesExcludedFromGeometryScreen: b07SolidIsolationFaces.length - safeGeometryFaces.length,
    protectedConflictConclusion: 'The lack of a recorded entity/block-entity hit on a screened face would be preservation evidence only. It cannot cure the unaccepted ownership, incomplete topology, or missing receiver/overflow contract.',
  },
  receiverDisposition: {
    result: 'NO_CONTAINMENT_RECEIVER_OR_DISPLACEMENT_DESTINATION_CAN_BE_DECLARED',
    exactReasons: [
      `Extended component disposition: ${extended.disposition}.`,
      `Initial 4,766-cell diagnostic component remains connected to the extended trace from all ${seedCells.length} B07 interaction-fluid seeds.`,
      `The extended trace has ${extended.boundaryFluid.cellCount} component cells on the finite envelope boundary, ${extended.unexpandedCapFrontier.cellCount} unexpanded safety-cap frontier cells, and ${sourceBoundaryFaces.length} observed non-fluid faces originating on the finite boundary.`,
      `OWN-B07 remains unaccepted/default-deny and the B07 water receiver counterpart remains null in the current ownership record.`,
      'No exact flow, capacity/freeboard, overflow/failure, desired-state, or reverse-order rollback contract exists for water, waterlogged blocks, or bubble columns.',
    ],
  },
  maps: ['b07-extended-fluid-component-plan.svg', 'b07-extended-fluid-component-section-z398.svg', 'b07-extended-fluid-component-section-x2107.svg'].map((filename) => ({ path: `${rel(OUT)}/${filename}`, sha256: sha256(fs.readFileSync(path.join(mapDirectory, filename))) })),
  safetyBoundary: { readOnly: true, liveCallsPerformed: false, worldCapturePerformed: false, rconCallsPerformed: false, worldMutationsPerformed: false, forwardOperationFilesEmitted: 0, rollbackOperationFilesEmitted: 0 },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(path.join(mapDirectory, 'fluid-topology-extension-findings.json'), `${JSON.stringify(report, null, 2)}\n`);

const markdown = `# MP05 B07 fluid topology extension 01

**Status:** \`${report.status}\`  
**Immutable source:** \`${report.source.snapshotRoot}\` (capture \`${report.source.captureId}\`)  
**Machine findings:** [JSON](../../../${rel(path.join(OUT, 'fluid-topology-extension-findings.json'))})

This is a **read-only** hydrology/source-topology package. It made no live, capture, RCON, construction, or operation call. A mapped fluid boundary or dry solid neighbour is not a receiver, liner, ownership assignment, or permission to alter the world.

## Extended source maps

- [Horizontal component-density map](../../../${rel(path.join(OUT, 'b07-extended-fluid-component-plan.svg'))})
- [East/west section at z=-398](../../../${rel(path.join(OUT, 'b07-extended-fluid-component-section-z398.svg'))})
- [North/south section at x=2107](../../../${rel(path.join(OUT, 'b07-extended-fluid-component-section-x2107.svg'))})

## Connected-component result

The 89 immediate B07 interaction-fluid seeds reproduce the earlier **4,766-cell** component exactly inside its first diagnostic envelope. The larger trace observed **${extended.component.cellCount.toLocaleString()}** connected fluid-bearing cells across \`x=${extendedBounds.minX}..${extendedBounds.maxX}\`, \`y=${extendedBounds.minY}..${extendedBounds.maxY}\`, and \`z=${extendedBounds.minZ}..${extendedBounds.maxZ}\` (coordinate set SHA-256 \`${extended.component.coordinateSetSha256}\`). It added **${(extended.component.cellCount - initial.component.cellCount).toLocaleString()}** observed cells.

The trace disposition is **\`${extended.disposition}\`**. It has ${extended.boundaryFluid.cellCount.toLocaleString()} component cells on the explicit survey boundary${extended.capReached ? `, reached the ${MAX_EXTENDED_CELLS.toLocaleString()}-cell safety cap, and left ${extended.unexpandedCapFrontier.cellCount.toLocaleString()} cap-frontier cells unexpanded` : ''}. This is therefore an incomplete topology observation, not a finite body of water.

## Water states and interfaces

The extended component contains **${report.waterAndStructureCharacterization.waterloggedCellCount.toLocaleString()} waterlogged** cells and **${report.waterAndStructureCharacterization.bubbleColumnCells.cellCount.toLocaleString()} bubble-column** cells. Any future design must preserve or explicitly model those block states; treating only ordinary water as the fluid would be an incomplete source/rollback model.

The current source exposes ${b07InterfaceFaces.length.toLocaleString()} observed non-fluid faces from B07 interaction-fluid cells. Of those, ${b07SolidIsolationFaces.length.toLocaleString()} abut solid, non-gravity material, and ${safeGeometryFaces.length.toLocaleString()} survive the conservative block-entity geometry exclusion. They are **potential geometry observations only**. No one is selected as an isolation surface, because the component itself is incomplete and those cells have no accepted owner/counterpart contract.

## Why a containment receiver remains impossible

- The connected component still reaches the finite trace boundary; ${sourceBoundaryFaces.length.toLocaleString()} observed non-fluid faces originate at that unknown continuation boundary.
- OWN-B07 is an unaccepted proposal, while the receiver counterpart is still null/default-deny.
- No directed source → treatment → receiver → overflow/failure state graph, storage/freeboard calculation, or exact inverse exists.
- Waterlogged and bubble-column states need explicit forward and reverse treatment, not a generic “water” replacement.
- R07J’s accepted 49-cell upward cap remains closed. This survey does not reopen or repurpose it.

## Disposition

No B07 fluid isolation, liner, receiver, displacement, cap removal, excavation, or route-opening package is releaseable from this record. The next design input is either full topology closure through a larger current snapshot survey or an exact independently sealed boundary with accepted ownership and the complete directed receiver/overflow/rollback contract.
`;
fs.mkdirSync(path.dirname(abs(MARKDOWN)), { recursive: true });
fs.writeFileSync(abs(MARKDOWN), markdown);
console.log(JSON.stringify({ status: report.status, report: rel(path.join(OUT, 'fluid-topology-extension-findings.json')), markdown: rel(MARKDOWN), extendedCells: extended.component.cellCount, extendedDisposition: extended.disposition, waterloggedCells: report.waterAndStructureCharacterization.waterloggedCellCount, bubbleColumns: report.waterAndStructureCharacterization.bubbleColumnCells.cellCount, maps: report.maps.map(({ path: mapPath }) => mapPath), reportIdentitySha256: report.reportIdentitySha256 }, null, 2));
