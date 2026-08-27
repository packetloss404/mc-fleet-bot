#!/usr/bin/env node
/** Read-only source-bound inventory for the remaining C1 west at-grade run. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  boundsOf,
  cellKey,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  census,
  classManifest,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11k-west-at-grade-closure-inventory-20260822T044500Z.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T04:45:00Z');
const SOURCE = 'data/worldsnap-r11j-post-20260822T041217Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/evidence-ledger.json';
const R11J_MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const START = 1142;
const END = 1183;

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11K inventory rejected: ${message}`);
};
function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7], targetState: fields[8],
    });
  }
  return records;
}
const ledgerBytes = fs.readFileSync(absolute(SOURCE_LEDGER));
const ledger = JSON.parse(ledgerBytes);
const manifestBytes = fs.readFileSync(absolute(R11J_MANIFEST));
const r11j = JSON.parse(manifestBytes);
const designBytes = fs.readFileSync(absolute(DESIGN));
const design = JSON.parse(designBytes);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && path.resolve(ROOT, ledger.postSnapshot.root) === absolute(SOURCE)
  && ledger.completedReleaseIdentitySha256
    === '55a1d48d0573daeee857ba163a97ae24b6e9d772cd4876686ec844c25bb8e5ac',
'accepted R11J source ledger drifted');

const priorBindings = [...r11j.source.priorManifestBindings, {
  path: R11J_MANIFEST,
  sha256: sha256(manifestBytes),
}];
const priorTargetKeys = new Set();
const r11jSurface = [];
for (const binding of priorBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} drifted`);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const record of parseOperations(pkg.forward)) {
      priorTargetKeys.add(cellKey(record.cell));
      if (binding.path === R11J_MANIFEST && [
        'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
      ].includes(record.targetState)) r11jSurface.push(record.cell);
    }
  }
}

const stations = design.horizontalAlignment.stations;
invariant(stations.slice(START, END + 1).every(({ treatment }) => (
  treatment === 'AT_GRADE_COORDINATION_PASS'
)), 'station treatment is not uniformly at-grade');
const reader = new AnvilReader(absolute(path.join(SOURCE, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SOURCE, 'entities')));
const broad = await analyzeIsland({
  key: 'west-at-grade-1142-1183-broad', start: START, end: END,
  stations, reader, priorTargetKeys,
});
const extent = boundsOf(broad.halo);
const savedEntities = [];
for (let cx = Math.floor(extent.minX / 16); cx <= Math.floor(extent.maxX / 16); cx += 1) {
  for (let cz = Math.floor(extent.minZ / 16); cz <= Math.floor(extent.maxZ / 16); cz += 1) {
    const chunk = await entityReader.chunk(cx, cz);
    for (const entity of chunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const position = entity.Pos.slice(0, 3).map(Number);
      const [x, y, z] = position;
      if (x >= extent.minX && x < extent.maxX + 1
        && y >= extent.minY && y < extent.maxY + 1
        && z >= extent.minZ && z < extent.maxZ + 1) {
        savedEntities.push({ id: entity.id ?? null, position });
      }
    }
  }
}
const savedEntityPositions = savedEntities.map(({ position }) => position);

const stationScreen = [];
for (let station = START; station <= END; station += 1) {
  const analysis = await analyzeIsland({
    key: `station-${station}`, start: station, end: station,
    stations, reader, priorTargetKeys, savedEntityPositions,
  });
  const reservationConflictCount = Object.values(analysis.reservationConflicts)
    .reduce((sum, cells) => sum + cells.length, 0);
  const clean = analysis.safe
    && analysis.savedEntityConflicts.length === 0
    && reservationConflictCount === 0
    && analysis.gradeShadows.length === 0;
  stationScreen.push({
    station,
    clean,
    candidateCellCount: analysis.candidate.length,
    surfaceCellCount: analysis.surface.length,
    operatedCellCount: analysis.operated.length,
    priorConflictCount: analysis.priorConflicts.length,
    savedEntityConflictCount: analysis.savedEntityConflicts.length,
    reservationConflictCount,
    gradeShadowCount: analysis.gradeShadows.length,
    sourceHazardCount: analysis.sourceHazards.length,
    sourceHazardCensus: census(analysis.sourceHazards, 'kind'),
    haloHazardCount: analysis.haloHazards.length,
    haloHazardCensus: census(analysis.haloHazards, 'kind'),
  });
}

const cleanRuns = [];
let runStart = null;
for (let index = 0; index <= stationScreen.length; index += 1) {
  const current = stationScreen[index];
  if (current?.clean && runStart === null) runStart = current.station;
  if ((!current?.clean || index === stationScreen.length) && runStart !== null) {
    cleanRuns.push([runStart, stationScreen[index - 1].station]);
    runStart = null;
  }
}

const summarizeAnalysis = (analysis, start, end) => {
  const reservationConflictCount = Object.values(analysis.reservationConflicts)
    .reduce((sum, cells) => sum + cells.length, 0);
  return {
    key: analysis.key,
    stations: { start, end, count: end - start + 1 },
    safe: analysis.safe
      && analysis.savedEntityConflicts.length === 0
      && reservationConflictCount === 0
      && analysis.gradeShadows.length === 0,
    candidate: classManifest(analysis.candidate),
    surface: classManifest(analysis.surface),
    foundation: classManifest(analysis.foundationRecords.map(({ cell }) => cell)),
    headroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
    fullHeadroom: classManifest(analysis.fullHeadroom),
    gravityDependencies: classManifest(analysis.gravityRecords.map(({ cell }) => cell)),
    gravityRollbackSupportProofCount: analysis.gravityRollbackSupportProof.length,
    leafTransitions: classManifest(analysis.leafRecords.map(({ cell }) => cell)),
    operated: classManifest(analysis.operated),
    halo: classManifest(analysis.halo),
    priorConflictCount: analysis.priorConflicts.length,
    priorIntersectionCount: analysis.priorIntersections.length,
    savedEntityConflictCount: analysis.savedEntityConflicts.length,
    reservationConflictCount,
    gradeShadowCount: analysis.gradeShadows.length,
    sourceHazardCount: analysis.sourceHazards.length,
    sourceHazardCensus: census(analysis.sourceHazards, 'kind'),
    haloHazardCount: analysis.haloHazards.length,
    haloHazardCensus: census(analysis.haloHazards, 'kind'),
    sourceStateCensus: census(analysis.allRecords, 'sourceState'),
    targetStateCensus: census(analysis.allRecords, 'targetState'),
  };
};
const runAnalyses = [];
for (const [start, end] of cleanRuns) {
  const analysis = await analyzeIsland({
    key: `clean-run-${start}-${end}`, start, end,
    stations, reader, priorTargetKeys, savedEntityPositions,
  });
  runAnalyses.push(summarizeAnalysis(analysis, start, end));
}
runAnalyses.sort((left, right) => (
  right.operated.cellCount - left.operated.cellCount
    || left.stations.start - right.stations.start
));

// A long curved range can be clean station-by-station yet cross its own
// separately reserved rail/utility raster. Search longest-first within each
// entity-free station run and retain only the maximal zero-interface spans.
const maximalSafeSubruns = [];
for (const [outerStart, outerEnd] of cleanRuns) {
  const existing = runAnalyses.find(({ stations: range }) => (
    range.start === outerStart && range.end === outerEnd
  ));
  if (existing?.safe) {
    maximalSafeSubruns.push(existing);
    continue;
  }
  let foundAtLength = [];
  for (let length = outerEnd - outerStart + 1; length >= 1 && !foundAtLength.length; length -= 1) {
    for (let start = outerStart; start + length - 1 <= outerEnd; start += 1) {
      const end = start + length - 1;
      const analysis = await analyzeIsland({
        key: `maximal-safe-subrun-${start}-${end}`, start, end,
        stations, reader, priorTargetKeys, savedEntityPositions,
      });
      const summary = summarizeAnalysis(analysis, start, end);
      if (summary.safe) foundAtLength.push(summary);
    }
  }
  maximalSafeSubruns.push(...foundAtLength);
}
maximalSafeSubruns.sort((left, right) => (
  right.operated.cellCount - left.operated.cellCount
    || right.stations.count - left.stations.count
    || left.stations.start - right.stations.start
));
const seamEdges = (left, right) => left.reduce((count, cell) => count + right.filter(
  (other) => Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) <= 1
    && Math.abs(cell.y - other.y) <= 1,
).length, 0);
const eastSeamCandidates = [];
for (let start = 1175; start <= END; start += 1) {
  const analysis = await analyzeIsland({
    key: `east-seam-candidate-${start}-${END}`, start, end: END,
    stations, reader, priorTargetKeys, savedEntityPositions,
  });
  const summary = summarizeAnalysis(analysis, start, END);
  summary.r11jSeamEdgeCount = seamEdges(analysis.surface, r11jSurface);
  summary.seamSafe = analysis.safe
    && summary.savedEntityConflictCount === 0
    && summary.reservationConflictCount === 0
    && summary.r11jSeamEdgeCount > 0;
  eastSeamCandidates.push(summary);
}
eastSeamCandidates.sort((left, right) => (
  Number(right.seamSafe) - Number(left.seamSafe)
    || right.operated.cellCount - left.operated.cellCount
    || left.stations.start - right.stations.start
));
const selectedSeamClosure = eastSeamCandidates.find(({ seamSafe }) => seamSafe) ?? null;
const selectedIsolatedRun = maximalSafeSubruns.find(
  ({ operated }) => operated.cellCount > 0,
) ?? null;
const selected = selectedSeamClosure ?? selectedIsolatedRun;

const recommendedBatchAnalyses = [];
for (const [start, end] of [[1142, 1145], [1172, 1172]]) {
  const analysis = await analyzeIsland({
    key: `recommended-batch-${start}-${end}`, start, end,
    stations, reader, priorTargetKeys, savedEntityPositions,
  });
  recommendedBatchAnalyses.push({ analysis, summary: summarizeAnalysis(analysis, start, end) });
}
const [firstBatch, secondBatch] = recommendedBatchAnalyses;
const firstTargetKeys = new Set(firstBatch.analysis.operated.map(cellKey));
const firstHaloKeys = new Set(firstBatch.analysis.halo.map(cellKey));
const secondTargetKeys = new Set(secondBatch.analysis.operated.map(cellKey));
const secondHaloKeys = new Set(secondBatch.analysis.halo.map(cellKey));
const targetIntersectionCount = [...firstTargetKeys]
  .filter((key) => secondTargetKeys.has(key)).length;
const haloIntersectionCount = [...firstHaloKeys]
  .filter((key) => secondHaloKeys.has(key)).length;
const firstTargetSecondHaloIntersectionCount = [...firstTargetKeys]
  .filter((key) => secondHaloKeys.has(key)).length;
const secondTargetFirstHaloIntersectionCount = [...secondTargetKeys]
  .filter((key) => firstHaloKeys.has(key)).length;
const recommendedBatch = {
  key: 'disjoint-west-at-grade-1142-1145-and-1172',
  rationale: 'Largest safe source-proven run plus the independently safe singleton, amortized in one exact transaction while preserving every entity/reservation/grade-shadow cell.',
  scopes: recommendedBatchAnalyses.map(({ summary }) => summary),
  operatedUnion: classManifest(uniqueCells(recommendedBatchAnalyses.flatMap(
    ({ analysis }) => analysis.operated,
  ))),
  haloUnion: classManifest(uniqueCells(recommendedBatchAnalyses.flatMap(
    ({ analysis }) => analysis.halo,
  ))),
  targetIntersectionCount,
  haloIntersectionCount,
  firstTargetSecondHaloIntersectionCount,
  secondTargetFirstHaloIntersectionCount,
  exactInteractionDisjoint: targetIntersectionCount === 0
    && haloIntersectionCount === 0
    && firstTargetSecondHaloIntersectionCount === 0
    && secondTargetFirstHaloIntersectionCount === 0,
};
invariant(recommendedBatch.scopes.every(({ safe }) => safe)
  && recommendedBatch.operatedUnion.cellCount === 336
  && recommendedBatch.exactInteractionDisjoint,
'recommended disjoint batch is not independently safe');

const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: recommendedBatch.exactInteractionDisjoint
    ? 'SOURCE_PROVEN_DISJOINT_BATCH_SELECTED'
    : 'NO_CLEAN_RUN_LOCAL_BLOCKER',
  source: {
    root: SOURCE,
    ledgerPath: SOURCE_LEDGER,
    ledgerSha256: sha256(ledgerBytes),
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: JSON.parse(fs.readFileSync(
      absolute(ledger.postSnapshot.identity.path), 'utf8',
    )).sha256,
  },
  design: { path: DESIGN, sha256: sha256(designBytes) },
  priorBindings,
  scope: {
    stations: { start: START, end: END, count: END - START + 1 },
    treatment: 'AT_GRADE_COORDINATION_PASS',
    broadCandidate: classManifest(broad.candidate),
    broadHalo: classManifest(broad.halo),
    savedEntities,
    stationScreen,
    cleanRuns: runAnalyses,
    maximalSafeSubruns,
    eastSeamCandidates,
    selectedSingleScope: selected,
    recommendedBatch,
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const inventoryPayloadSha256 = sha256(JSON.stringify(withoutIdentity));
const report = { ...withoutIdentity, inventoryPayloadSha256 };
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  output: OUT,
  inventoryPayloadSha256,
  savedEntityCount: savedEntities.length,
  cleanRuns: runAnalyses.map(({ key, stations: runStations, safe, operated }) => ({
    key, stations: runStations, safe, operatedCellCount: operated.cellCount,
  })),
  maximalSafeSubruns: maximalSafeSubruns.map(({
    key, stations: runStations, operated, surface,
  }) => ({
    key, stations: runStations, operatedCellCount: operated.cellCount,
    surfaceCellCount: surface.cellCount,
  })),
  eastSeamCandidates: eastSeamCandidates.map(({
    key, stations: runStations, operated, surface, seamSafe, r11jSeamEdgeCount,
    savedEntityConflictCount, reservationConflictCount, gradeShadowCount,
  }) => ({
    key,
    stations: runStations,
    operatedCellCount: operated.cellCount,
    surfaceCellCount: surface.cellCount,
    seamSafe,
    r11jSeamEdgeCount,
    savedEntityConflictCount,
    reservationConflictCount,
    gradeShadowCount,
  })),
  selected: {
    key: recommendedBatch.key,
    scopeCount: recommendedBatch.scopes.length,
    operatedCellCount: recommendedBatch.operatedUnion.cellCount,
    haloCellCount: recommendedBatch.haloUnion.cellCount,
    exactInteractionDisjoint: recommendedBatch.exactInteractionDisjoint,
  },
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
