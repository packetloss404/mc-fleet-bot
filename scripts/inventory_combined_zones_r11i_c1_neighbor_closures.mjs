#!/usr/bin/env node
/** Read-only exact inventory for the two C1 gaps immediately beside R11H. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  hashCells,
  stateToCommandString,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  blockName,
  census,
  connectedComponents,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T03:45:00Z');
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11i-neighbor-closures-inventory-20260822T034500Z.json',
);
const SOURCE = 'data/worldsnap-r11h-retry-v2-post-20260822T032627Z';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const PRIOR_MANIFESTS = [
  'combined-zones-r11a-c1-east-highway-pilot.release-manifest.json',
  'combined-zones-r11b-c1-west-highway-extension.release-manifest.json',
  'combined-zones-r11c-c1-east-highway-completion.release-manifest.json',
  'combined-zones-r11d-c1-at-grade-island-521-546.release-manifest.json',
  'combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json',
  'combined-zones-r11f-c1-early-dry-at-grade-islands.release-manifest.json',
  'combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json',
];
const CANDIDATES = [
  { key: 'west-bridge-gap', start: 1184, end: 1188 },
  { key: 'east-retained-cut-gap', start: 1207, end: 1212 },
];

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11I closure inventory rejected: ${message}`);
};

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    const cell = { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) };
    cells.set(cellKey(cell), { cell, targetState: fields[8] });
  }
  return [...cells.values()];
}

const designBytes = fs.readFileSync(absolute(DESIGN));
const design = JSON.parse(designBytes);
const priorTargetKeys = new Set();
const priorBindings = [];
const priorSurfaces = new Map();
const SURFACE_STATES = new Set([
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
]);
for (const name of PRIOR_MANIFESTS) {
  const manifestPath = `data/buildops/${name}`;
  const bytes = fs.readFileSync(absolute(manifestPath));
  const manifest = JSON.parse(bytes);
  priorBindings.push({ path: manifestPath, sha256: sha256(bytes) });
  for (const pkg of manifest.packages ?? []) {
    for (const record of operationTargetCells(pkg.forward)) {
      priorTargetKeys.add(cellKey(record.cell));
      if (SURFACE_STATES.has(record.targetState)) {
        if (!priorSurfaces.has(name)) priorSurfaces.set(name, []);
        priorSurfaces.get(name).push(record.cell);
      }
    }
  }
}

const reader = new AnvilReader(absolute(path.join(SOURCE, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SOURCE, 'entities')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const results = [];
for (const candidate of CANDIDATES) {
  const analysis = await analyzeIsland({
    ...candidate,
    stations: design.horizontalAlignment.stations,
    reader,
    priorTargetKeys,
  });
  const fluidRecords = [];
  for (const cell of analysis.halo) {
    const sourceState = await sourceAt(cell);
    if (isFluid(sourceState)) fluidRecords.push({ cell, sourceState });
  }
  const bounds = boundsOf(analysis.halo);
  const blockEntities = [];
  const savedEntities = [];
  for (let cx = Math.floor(bounds.minX / 16); cx <= Math.floor(bounds.maxX / 16); cx += 1) {
    for (let cz = Math.floor(bounds.minZ / 16); cz <= Math.floor(bounds.maxZ / 16); cz += 1) {
      const chunk = await reader.chunk(cx, cz);
      for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
        const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
        if (analysis.halo.some((point) => cellKey(point) === cellKey(cell))) {
          blockEntities.push({ id: entity.id ?? null, cell });
        }
      }
      const entityChunk = await entityReader.chunk(cx, cz);
      for (const entity of entityChunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const [x, y, z] = entity.Pos.map(Number);
        if (analysis.halo.some((cell) => x >= cell.x && x < cell.x + 1
          && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
          savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
        }
      }
    }
  }
  const seamCounts = Object.fromEntries([...priorSurfaces.entries()].map(([name, cells]) => [
    name,
    analysis.surface.reduce((count, cell) => count + cells.filter((prior) => (
      Math.max(Math.abs(cell.x - prior.x), Math.abs(cell.z - prior.z)) <= 1
      && Math.abs(cell.y - prior.y) <= 1
    )).length, 0),
  ]).filter(([, count]) => count > 0));
  results.push({
    ...candidate,
    treatments: [...new Set(analysis.selected.map(({ treatment }) => treatment))],
    candidateSurfaceCount: analysis.candidate.length,
    selectedSurfaceCount: analysis.surface.length,
    surfaceComponentCount: connectedComponents(analysis.surface).length,
    surfaceHash: hashCells(analysis.surface),
    acceptedSurfaceSeamEdgeCounts: seamCounts,
    priorConflictCount: analysis.priorConflicts.length,
    priorConflictHash: hashCells(analysis.priorConflicts),
    gradeShadowCount: analysis.gradeShadows.length,
    reservationConflicts: Object.fromEntries(Object.entries(
      analysis.reservationConflicts,
    ).map(([key, cells]) => [key, cells.length])),
    dependencyCount: analysis.dependencyRecords.length,
    gravityCount: analysis.gravityRecords.length,
    leafDependencyCount: analysis.leafRecords.length,
    foundationCount: analysis.foundationRecords.length,
    headroomCutCount: analysis.headroomRecords.length,
    targetCount: analysis.allRecords.length,
    targetHash: hashCells(analysis.operated),
    sourceCensus: census(analysis.allRecords, 'sourceState'),
    targetCensus: census(analysis.allRecords, 'targetState'),
    sourceHazardCount: analysis.sourceHazards.length,
    sourceHazardCensus: census(analysis.sourceHazards, 'kind'),
    sourceHazards: analysis.sourceHazards,
    haloCount: analysis.halo.length,
    haloHash: hashCells(analysis.halo),
    haloHazardCount: analysis.haloHazards.length,
    haloHazardCensus: census(analysis.haloHazards, 'kind'),
    fluidCount: fluidRecords.length,
    fluidCensus: Object.fromEntries([...fluidRecords.reduce((map, record) => (
      map.set(blockName(record.sourceState), (map.get(blockName(record.sourceState)) ?? 0) + 1)
    ), new Map()).entries()].sort()),
    fluids: fluidRecords,
    blockEntityCount: blockEntities.length,
    blockEntities,
    savedEntityCount: savedEntities.length,
    savedEntities,
    priorIntersectionCount: analysis.priorIntersections.length,
    operatedInterfaceIntersections: Object.fromEntries(Object.entries(
      analysis.operatedInterfaceIntersections,
    ).map(([key, cells]) => [key, cells.length])),
    genericSafe: analysis.safe && blockEntities.length === 0 && savedEntities.length === 0,
  });
}
const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'READ_ONLY_CANDIDATE_INVENTORY_COMPLETE',
  source: SOURCE,
  design: { path: DESIGN, sha256: sha256(designBytes) },
  priorBindings,
  priorTargetCellCount: priorTargetKeys.size,
  candidates: results,
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const report = { ...withoutIdentity, inventoryPayloadSha256: sha256(JSON.stringify(withoutIdentity)) };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
