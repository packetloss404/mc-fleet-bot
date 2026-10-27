#!/usr/bin/env node
/** Read-only inventory for all C1 at-grade runs after R11D. */

import fs from 'fs';
import path from 'path';

import { AnvilReader, boundsOf, cellKey } from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  classManifest,
  census,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT_PATH = value(
  '--out',
  'data/world-review/combined-zones-r11e-inventory-20260821T194000Z.json',
);
const SNAPSHOT = 'data/worldsnap-combined-zones-r11d-post-20260821T192414Z';
const RANGES = [
  ['island-548-551', 548, 551],
  ['island-564-569', 564, 569],
  ['island-606-608', 606, 608],
  ['island-627-632', 627, 632],
  ['island-792', 792, 792],
  ['island-952-1139', 952, 1139],
  ['island-1142-1183', 1142, 1183],
  ['island-1189-1206', 1189, 1206],
  ['island-1213-1215', 1213, 1215],
];
const absolute = (filename) => path.resolve(ROOT, filename);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));

function operationTargetCells(filename) {
  const cells = new Map();
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    if (fields[0] === 'CMD') {
      for (const match of raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)) {
        const cell = { x: Number(match[1]), y: Number(match[2]), z: Number(match[3]) };
        cells.set(cellKey(cell), cell);
      }
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) continue;
    const coordinates = fields.slice(1, 7).map(Number);
    for (let x = Math.min(coordinates[0], coordinates[3]); x <= Math.max(coordinates[0], coordinates[3]); x += 1) {
      for (let y = Math.min(coordinates[1], coordinates[4]); y <= Math.max(coordinates[1], coordinates[4]); y += 1) {
        for (let z = Math.min(coordinates[2], coordinates[5]); z <= Math.max(coordinates[2], coordinates[5]); z += 1) {
          const cell = { x, y, z };
          cells.set(cellKey(cell), cell);
        }
      }
    }
  }
  return [...cells.values()];
}

const priorTargetKeys = new Set();
const manifestNames = fs.readdirSync(absolute('data/buildops'))
  .filter((name) => name.startsWith('combined-zones-') && name.endsWith('.release-manifest.json'))
  .filter((name) => !name.includes('r11e-'));
for (const name of manifestNames) {
  const manifest = readJson(path.join('data/buildops', name));
  for (const pkg of manifest.packages ?? []) {
    if (!pkg.forward || !fs.existsSync(absolute(pkg.forward))) continue;
    for (const cell of operationTargetCells(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
const c1 = readJson('docs/masterplans/05-combined-zones/phase1-c1-civil-design.json');
const stations = c1.horizontalAlignment.stations;
const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SNAPSHOT, 'entities')));
const savedEntitiesForHalo = async (halo) => {
  if (!halo.length) return [];
  const extent = boundsOf(halo);
  const positions = [];
  for (let cx = Math.floor(extent.minX / 16); cx <= Math.floor(extent.maxX / 16); cx += 1) {
    for (let cz = Math.floor(extent.minZ / 16); cz <= Math.floor(extent.maxZ / 16); cz += 1) {
      const chunk = await entityReader.chunk(cx, cz);
      for (const entity of chunk?.Entities ?? []) {
        if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
        const position = entity.Pos.slice(0, 3).map(Number);
        const [x, y, z] = position;
        if (x >= extent.minX && x < extent.maxX + 1
          && y >= extent.minY && y < extent.maxY + 1
          && z >= extent.minZ && z < extent.maxZ + 1) positions.push(position);
      }
    }
  }
  return positions;
};
const analyses = [];
for (const [key, start, end] of RANGES) {
  const firstPass = await analyzeIsland({
    key, start, end, stations, reader, priorTargetKeys,
  });
  const savedEntityPositions = await savedEntitiesForHalo(firstPass.halo);
  const result = savedEntityPositions.length
    ? await analyzeIsland({
      key, start, end, stations, reader, priorTargetKeys, savedEntityPositions,
    })
    : firstPass;
  analyses.push({
    key, start, end, safe: result.safe,
    candidate: classManifest(result.candidate),
    priorConflicts: classManifest(result.priorConflicts),
    railReservationConflicts: classManifest(result.reservationConflicts.railReservation),
    utilityReservationConflicts: classManifest(result.reservationConflicts.utilityReservation),
    roadCollectionConflicts: classManifest(result.reservationConflicts.roadCollection),
    savedEntityConflicts: classManifest(result.savedEntityConflicts),
    savedEntityPositions,
    gradeShadows: classManifest(result.gradeShadows),
    exceptions: classManifest(result.exceptions),
    surface: classManifest(result.surface),
    foundation: classManifest(result.foundationRecords.map(({ cell }) => cell)),
    headroomCuts: classManifest(result.headroomRecords.map(({ cell }) => cell)),
    fullHeadroom: classManifest(result.fullHeadroom),
    gravity: classManifest(result.gravityRecords.map(({ cell }) => cell)),
    ownedLogs: classManifest(result.ownedLogRemovals.map(({ cell }) => cell)),
    influencedLeaves: classManifest(result.influencedLeaves.map(({ cell }) => cell)),
    retainedLogDistanceCensus: result.retainedLogDistanceCensus,
    leafTransitions: classManifest(result.leafRecords.map(({ cell }) => cell)),
    operated: classManifest(result.operated),
    halo: classManifest(result.halo),
    sourceHazardCount: result.sourceHazards.length,
    sourceHazardCensus: census(result.sourceHazards, 'kind'),
    sourceHazards: result.sourceHazards.slice(0, 20),
    haloHazardCount: result.haloHazards.length,
    haloHazardCensus: census(result.haloHazards, 'kind'),
    haloHazards: result.haloHazards.slice(0, 20),
    priorIntersectionCount: result.priorIntersections.length,
    operatedInterfaceIntersections: Object.fromEntries(Object.entries(
      result.operatedInterfaceIntersections,
    ).map(([name, cells]) => [name, classManifest(cells)])),
  });
}
const report = { snapshot: SNAPSHOT, priorManifestCount: manifestNames.length,
  ranges: analyses };
fs.mkdirSync(path.dirname(absolute(OUT_PATH)), { recursive: true });
fs.writeFileSync(absolute(OUT_PATH), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ output: OUT_PATH, ranges: analyses.map((range) => ({
  key: range.key,
  safe: range.safe,
  operatedCellCount: range.operated.cellCount,
  sourceHazardCount: range.sourceHazardCount,
  haloHazardCount: range.haloHazardCount,
})) }, null, 2));
