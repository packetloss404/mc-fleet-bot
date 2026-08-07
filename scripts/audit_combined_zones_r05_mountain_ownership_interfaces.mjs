#!/usr/bin/env node
/**
 * T02 release-scoped ownership/interface audit for the CZ-R05 FM-01
 * mountain packages.
 *
 * Independently re-derives the reshaped composite P1-B10 construction
 * domain (verified against the committed G03 baseline, the accepted
 * south-open no-build column identity, and the canonical-integration
 * overlay), recomputes the partition classes (operated / wetDeferred /
 * alreadyTarget) and the family rule with the same logic against the same
 * bound save, re-parses both compiled forward operation files (merged
 * column boxes plus exact per-cell entombments), and proves:
 * - forward and rollback operation identities match the release manifest;
 * - the two packages' target sets are exactly disjoint;
 * - the parsed target set equals the recomputed operated class, column by
 *   column, and every finish target sits exactly on the analytic design
 *   surface with the committed y<130 state rule;
 * - operated + wetDeferred + alreadyTarget partition the frozen reshaped
 *   domain exactly;
 * - the 2,432 no-build columns contain zero operated cells;
 * - zero operated cells intersect any protected relic core;
 * - zero operated cells intersect the R02 operated set;
 * - exclusive ownership rests on the accepted one-owner registry partition,
 *   bound by payload identity.
 *
 * Read-only; no live call; no world edit authorized.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  SurfaceSnapshotReader,
  buildB09MinimumReservation,
  cellsIn,
  columnKey,
  deriveB08ServiceTunnelConstruction,
  deriveFm01BaselineIntervals,
  dilateCells,
  filterColumnsOutsideBounds,
  groupCellsByColumn,
  hashCells,
  inColumnBounds,
  mountainSurfaceY,
  noBuildColumnIdentity,
  normalizeRanges,
  rangesCount,
  reshapedIntervalManifests,
  stateToCommandString,
  subtractRanges,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-07T00:55:00Z');
const OUTPUT = path.resolve(value('--out',
  'data/world-review/combined-zones-r05-mountain.ownership-interface-audit.json'));

const INPUTS = Object.freeze({
  manifest: 'data/buildops/combined-zones-r05-mountain.release-manifest.json',
  decision: 'docs/masterplans/05-combined-zones/phase1-r05-mountain-scope-and-material-decision.md',
  d05FutureState: 'docs/masterplans/05-combined-zones/phase1-d05-future-state.json',
  d05Defaults: 'docs/masterplans/05-combined-zones/phase1-d05-conservative-defaults.json',
  d05OwnerAcceptance: 'docs/masterplans/05-combined-zones/phase1-d05-owner-acceptance-packet.json',
  connectors: 'docs/masterplans/05-combined-zones/phase1-connector-geometry.json',
  g03CanonicalSetout: 'docs/masterplans/05-combined-zones/phase1-g03-canonical-setout.json',
  protectedRelicClearance: 'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json',
  bestChoice: 'docs/masterplans/05-combined-zones/phase1-shipwreck-best-choice-analysis.json',
  overlay: 'docs/masterplans/05-combined-zones/phase1-shipwreck-canonical-integration-overlay.json',
  registry: 'docs/masterplans/05-combined-zones/phase1-proposed-ownership-interface-registry.json',
  layerBClosure: 'docs/masterplans/05-combined-zones/phase1-g05-layer-b-closure.json',
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
});

const FINISH_TRANSITION_Y = 130;
const STATES = Object.freeze({
  bulk: 'minecraft:stone',
  finishLow: 'minecraft:smooth_stone',
  finishHigh: 'minecraft:polished_diorite',
});
const R05_CLASS_PREAMBLE = 'combined-zones-r05-fm01-partition-class-intervals-v1';
const FORBIDDEN_SOURCE_BLOCKS = new Set([
  'minecraft:chest', 'minecraft:trapped_chest', 'minecraft:barrel',
  'minecraft:furnace', 'minecraft:blast_furnace', 'minecraft:smoker',
  'minecraft:hopper', 'minecraft:dispenser', 'minecraft:dropper',
  'minecraft:shulker_box', 'minecraft:spawner', 'minecraft:lectern',
  'minecraft:brewing_stand', 'minecraft:beacon', 'minecraft:jukebox',
  'minecraft:beehive', 'minecraft:bee_nest',
]);
const FLUID_BLOCKS = new Set(['minecraft:water', 'minecraft:lava']);
const AIR_BLOCKS = new Set(['minecraft:air', 'minecraft:cave_air', 'minecraft:void_air']);

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R05 mountain T02 audit rejected: ${message}`);
}

const manifest = readJson(INPUTS.manifest);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const registry = readJson(INPUTS.registry);
const layerBClosure = readJson(INPUTS.layerBClosure);
const relicClearance = readJson(INPUTS.protectedRelicClearance);
const r02Manifest = readJson(INPUTS.r02Manifest);

invariant(manifest.packages.length === 2
  && manifest.packages[0].key === 'b10-bulk'
  && manifest.packages[1].key === 'b10-finish',
'manifest does not declare the two expected mountain packages');
invariant(manifest.scope.decisionRecord?.path === INPUTS.decision
  && sha256(fs.readFileSync(path.join(ROOT, INPUTS.decision)))
    === manifest.scope.decisionRecord.sha256,
'manifest decision-record binding does not match the decision record bytes');

// ---- Independent re-derivation of the frozen reshaped domain.
const d05 = readJson(INPUTS.d05FutureState);
const defaults = readJson(INPUTS.d05Defaults);
const owner = readJson(INPUTS.d05OwnerAcceptance);
const connectors = readJson(INPUTS.connectors);
const bestChoice = readJson(INPUTS.bestChoice);
const overlay = readJson(INPUTS.overlay);
const model = d05.selectedPlanningIdentity.formula;
const p1b10 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B10');

const b08Interaction = dilateCells(deriveB08ServiceTunnelConstruction(connectors), 1);
invariant(hashCells(b08Interaction)
  === connectors.serviceTunnelCenterline.exactCellSets.interactionUnion.coordinateSetSha256,
'B08 interaction reconstruction drift');
const b09Reservation = buildB09MinimumReservation(model, owner.b09B10SystemPlan.b09Route);
invariant(hashCells(b09Reservation)
  === owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.coordinateSetSha256,
'B09 reservation reconstruction drift');
const relicCells = defaults.soleAuthorityRecommendations.bufferPolicy.relics
  .flatMap((relic) => cellsIn(relic.minimumPlanningExclusionShell.expandedBounds));
const noFillByColumn = groupCellsByColumn(
  uniqueCells([...relicCells, ...b08Interaction, ...b09Reservation]),
);
const reader = new SurfaceSnapshotReader(path.join(ROOT, manifest.source.snapshotRoot, 'region'));
const base = await deriveFm01BaselineIntervals({ reader, model, noFillByColumn });
invariant(base.constructionCellCount === p1b10.construction.cellCount
  && base.baseSolidSha256 === p1b10.construction.sparseIntervals.intervalManifestSha256,
'baseline FM-01 construction reproduction drift');
const noBuildPlan = bestChoice.analysisPayload.reshapeOptimization
  .selectedPlanningReshape.sparseNoBuildPlan;
const noBuildIdentity = noBuildColumnIdentity(noBuildPlan.bounds);
invariant(noBuildIdentity.columnCount === noBuildPlan.columnCount
  && noBuildIdentity.columnSetSha256 === noBuildPlan.columnSetSha256,
'no-build column-set identity drift');
const selectedConstruction = filterColumnsOutsideBounds(base.construction, noBuildPlan.bounds);
const selectedSupport = filterColumnsOutsideBounds(base.support, noBuildPlan.bounds);
let reshapedCellCount = 0;
for (const ranges of selectedConstruction.values()) reshapedCellCount += rangesCount(ranges);
const committedConstruction = overlay.compositeCanonicalModel.replacementDomains.construction;
invariant(reshapedCellCount === committedConstruction.cellCount,
  'reshaped construction count drift');
const reshapeManifests = reshapedIntervalManifests({
  model,
  mountainBounds: base.mountainBounds,
  currentSurface: base.currentSurface,
  selectedConstruction,
  selectedSupport,
  noBuildBounds: noBuildPlan.bounds,
});
invariant(reshapeManifests.solidIntervalManifestSha256
  === committedConstruction.intervalManifestSha256
  && reshapeManifests.solidIntervalManifestSha256
    === manifest.scope.frozenDomainIntervalManifestSha256,
'reshaped solid interval manifest drift');

// ---- Recompute partition classes and family assignment.
const sortedColumnKeys = [...selectedConstruction.keys()].sort((left, right) => {
  const [lx, lz] = left.split(',').map(Number);
  const [rx, rz] = right.split(',').map(Number);
  return lx - rx || lz - rz;
});
const columnHasY = (map, x, z, y) => (map.get(columnKey(x, z)) ?? [])
  .some(({ start, end }) => y >= start && y <= end);
const isFluidState = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';

const classDigests = Object.fromEntries(['operated', 'wetDeferred', 'alreadyTarget']
  .map((name) => [name, crypto.createHash('sha256').update(`${R05_CLASS_PREAMBLE}\n${name}\n`)]));
const classCounts = { operated: 0, wetDeferred: 0, alreadyTarget: 0 };
const recordClassRanges = (name, x, z, ranges) => {
  if (!ranges.length) return;
  classDigests[name].update(`${x},${z}\t${ranges
    .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
  for (const { start, end } of ranges) classCounts[name] += end - start + 1;
};

const operatedByColumn = new Map();
const expectedEntombments = new Map();
const familyCounts = { [STATES.bulk]: 0, [STATES.finishLow]: 0, [STATES.finishHigh]: 0 };
for (const key of sortedColumnKeys) {
  const [x, z] = key.split(',').map(Number);
  const ranges = selectedConstruction.get(key);
  const designY = mountainSurfaceY(x, z, model);
  const anomalies = await reader.columnNonAirCells(x, z, ranges);
  const removedYs = [];
  const operatedSingles = [];
  for (const anomaly of anomalies) {
    const targetState = anomaly.y === designY
      ? (anomaly.y < FINISH_TRANSITION_Y ? STATES.finishLow : STATES.finishHigh)
      : STATES.bulk;
    const fromState = stateToCommandString(anomaly.state);
    invariant(!FORBIDDEN_SOURCE_BLOCKS.has(anomaly.state.Name),
      `forbidden container at ${x},${anomaly.y},${z} escaped the compile guard`);
    if (fromState === targetState) {
      recordClassRanges('alreadyTarget', x, z, [{ start: anomaly.y, end: anomaly.y }]);
      removedYs.push(anomaly.y);
      continue;
    }
    if (isFluidState(anomaly.state)) {
      let enclosed = true;
      for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
        const nx = x + dx;
        const ny = anomaly.y + dy;
        const nz = z + dz;
        if (columnHasY(selectedConstruction, nx, nz, ny)) continue;
        const neighbour = await reader.stateAt(nx, ny, nz);
        if (AIR_BLOCKS.has(neighbour.Name) || isFluidState(neighbour)) {
          enclosed = false;
          break;
        }
      }
      if (!enclosed) {
        recordClassRanges('wetDeferred', x, z, [{ start: anomaly.y, end: anomaly.y }]);
        removedYs.push(anomaly.y);
        continue;
      }
    }
    expectedEntombments.set(`${x},${anomaly.y},${z}`, { fromState, targetState });
    familyCounts[targetState] += 1;
    recordClassRanges('operated', x, z, [{ start: anomaly.y, end: anomaly.y }]);
    operatedSingles.push({ start: anomaly.y, end: anomaly.y });
    removedYs.push(anomaly.y);
  }
  const airRanges = subtractRanges(ranges, removedYs.map((y) => ({ start: y, end: y })));
  const finishIncluded = airRanges.some(({ start, end }) => designY >= start && designY <= end);
  const bulkAirRanges = finishIncluded
    ? subtractRanges(airRanges, [{ start: designY, end: designY }])
    : airRanges;
  familyCounts[STATES.bulk] += rangesCount(bulkAirRanges);
  if (finishIncluded) {
    familyCounts[designY < FINISH_TRANSITION_Y ? STATES.finishLow : STATES.finishHigh] += 1;
  }
  recordClassRanges('operated', x, z, airRanges);
  const operatedRanges = normalizeRanges([...airRanges, ...operatedSingles]);
  if (operatedRanges.length) operatedByColumn.set(key, operatedRanges);
}
invariant(classCounts.operated + classCounts.wetDeferred + classCounts.alreadyTarget
  === reshapedCellCount,
'recomputed partition classes do not cover the frozen reshaped domain');
for (const name of Object.keys(classCounts)) {
  invariant(classCounts[name] === manifest.partition[name].cellCount
    && classDigests[name].digest('hex') === manifest.partition[name].intervalManifestSha256,
  `recomputed ${name} class does not match the manifest binding`);
}
for (const [state, count] of Object.entries(manifest.families.totals)) {
  invariant(familyCounts[state] === count,
    `recomputed family total for ${state} does not match the manifest`);
}

// ---- Re-parse both forward files and prove they equal the operated class.
const stripHeader = (raw) => `${raw.split('\n')
  .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
const parsedByColumn = new Map();
const packageColumnsCells = { 'b10-bulk': 0, 'b10-finish': 0 };
const finishTargets = new Set();
const bulkTargetKeys = new Set();
let parsedEntombments = 0;

for (const pkg of manifest.packages) {
  const forwardRaw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  const rollbackRaw = fs.readFileSync(path.join(ROOT, pkg.rollback), 'utf8');
  const operationIdentity = manifest.operations[pkg.key];
  invariant(sha256(stripHeader(forwardRaw)) === operationIdentity.forwardSha256,
    `${pkg.key} forward operation body hash does not match the manifest`);
  invariant(sha256(stripHeader(rollbackRaw)) === operationIdentity.rollbackSha256,
    `${pkg.key} rollback operation body hash does not match the manifest`);
  // Streaming exact-inverse proof (stands in for the per-cell QA inversion
  // check, which cannot materialize 14.7M cells in memory): rollback line i
  // must be forward line i with source and target states swapped.
  const forwardLines = forwardRaw.split('\n').filter((line) => line && !line.startsWith('#'));
  const rollbackLines = rollbackRaw.split('\n').filter((line) => line && !line.startsWith('#'));
  invariant(forwardLines.length === rollbackLines.length,
    `${pkg.key} forward/rollback command counts differ`);
  for (let index = 0; index < forwardLines.length; index += 1) {
    const forward = forwardLines[index].split(' ');
    const rollback = rollbackLines[index].split(' ');
    invariant(forward.length === 9 && rollback.length === 9
      && forward.slice(0, 7).join(' ') === rollback.slice(0, 7).join(' ')
      && forward[7] === rollback[8] && forward[8] === rollback[7],
    `${pkg.key} rollback line ${index + 1} is not the exact inverse of its forward line`);
  }
  let commandCount = 0;
  for (const line of forwardRaw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    invariant(parts[0] === 'REPL' && parts.length === 9,
      `${pkg.key} unexpected operation shape: ${line.slice(0, 80)}`);
    const [x1, y1, z1, x2, y2, z2] = parts.slice(1, 7).map(Number);
    const mask = parts[7];
    const pattern = parts[8];
    invariant(x1 === x2 && z1 === z2 && y1 <= y2,
      `${pkg.key} operation is not a single-column Y-run`);
    commandCount += 1;
    const cellCount = y2 - y1 + 1;
    if (pkg.key === 'b10-bulk') {
      invariant(pattern === STATES.bulk, `${pkg.key} non-bulk pattern ${pattern}`);
      const designY = mountainSurfaceY(x1, z1, model);
      invariant(designY === null || y1 > designY || y2 < designY,
        `${pkg.key} run covers the design-surface finish cell at ${x1},${z1}`);
      for (let y = y1; y <= y2; y += 1) bulkTargetKeys.add(`${x1},${y},${z1}`);
    } else {
      invariant(cellCount === 1, 'finish operations must be single cells');
      const designY = mountainSurfaceY(x1, z1, model);
      invariant(y1 === designY, `finish target ${x1},${y1},${z1} is not on the design surface`);
      invariant(pattern === (y1 < FINISH_TRANSITION_Y ? STATES.finishLow : STATES.finishHigh),
        `finish state rule violated at ${x1},${y1},${z1}`);
      finishTargets.add(`${x1},${y1},${z1}`);
    }
    if (mask === 'minecraft:air') {
      invariant(cellCount >= 1, 'invalid box');
    } else {
      invariant(cellCount === 1, 'entombment operations must be single cells');
      const expected = expectedEntombments.get(`${x1},${y1},${z1}`);
      invariant(expected && expected.fromState === mask && expected.targetState === pattern,
        `entombment at ${x1},${y1},${z1} does not match the recomputed source/target`);
      parsedEntombments += 1;
    }
    const key = columnKey(x1, z1);
    if (!parsedByColumn.has(key)) parsedByColumn.set(key, []);
    parsedByColumn.get(key).push({ start: y1, end: y2 });
    packageColumnsCells[pkg.key] += cellCount;
  }
  invariant(commandCount === operationIdentity.forwardCommandCount,
    `${pkg.key} parsed command count drift`);
}
invariant(parsedEntombments === [...expectedEntombments.keys()].length,
  'parsed entombment count does not match the recomputation');
for (const target of finishTargets) {
  invariant(!bulkTargetKeys.has(target), `packages share target cell ${target}`);
}

// Parsed targets must equal the recomputed operated class column by column.
invariant(parsedByColumn.size === operatedByColumn.size,
  'parsed column count does not match the operated class');
let parsedCellCount = 0;
for (const [key, ranges] of parsedByColumn) {
  const normalized = normalizeRanges(ranges);
  const expected = operatedByColumn.get(key);
  invariant(expected && JSON.stringify(normalized) === JSON.stringify(expected),
    `parsed operated ranges drift at column ${key}`);
  parsedCellCount += rangesCount(normalized);
}
invariant(parsedCellCount === classCounts.operated,
  'parsed operated cell count does not match the operated class');

// ---- No-build columns, relic cores, and R02 isolation.
for (const key of parsedByColumn.keys()) {
  const [x, z] = key.split(',').map(Number);
  invariant(!inColumnBounds(noBuildPlan.bounds, x, z),
    `operated cells found inside no-build column ${key}`);
}
const coreIntersections = relicClearance.relics.map((relic) => {
  const bounds = relic.declaredInclusiveBounds;
  let hits = 0;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      for (const { start, end } of parsedByColumn.get(columnKey(x, z)) ?? []) {
        const from = Math.max(start, bounds.minY);
        const to = Math.min(end, bounds.maxY);
        if (from <= to) hits += to - from + 1;
      }
    }
  }
  return { relic: relic.key, intersectionCellCount: hits };
});
invariant(coreIntersections.every(({ intersectionCellCount }) => intersectionCellCount === 0),
  'operated cells intersect a protected relic core');
let r02CheckedCells = 0;
for (const pkg of r02Manifest.packages) {
  const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    const [x1, y1, z1] = parts.slice(1, 4).map(Number);
    invariant(!columnHasY(parsedByColumn, x1, z1, y1),
      `R02 operated cell ${x1},${y1},${z1} intersects the mountain operated set`);
    r02CheckedCells += 1;
  }
}

invariant(registry.g04PhysicalOwnership?.g04PassedOffline === true
  && registry.g04PhysicalOwnership?.unownedCellCount === 0
  && registry.g04PhysicalOwnership?.multiplyOwnedCellCount === 0,
'one-owner partition proof is not PASS');
invariant(layerBClosure.registryIdentity?.registryCanonicalPayloadSha256
  === registry.canonicalPayloadSha256
  && layerBClosure.closureSummary?.layerBClosed === true,
'interface closure is not bound to this registry identity');
invariant(manifest.upstreamIdentities.ownershipRegistryPayloadSha256
  === registry.canonicalPayloadSha256,
'manifest is bound to a different registry identity');

const report = {
  schemaVersion: 1,
  id: 'combined-zones-r05-mountain-ownership-interface-audit',
  generatedAtUtc: GENERATED_AT,
  status: 'PASS_EXACT_RESHAPED_DOMAIN_PARTITION_DISJOINT_PACKAGES_ZERO_CORE_AND_R02_OVERLAP_ONE_OWNER_BOUND',
  manifestIdentity: manifest.manifestIdentity,
  packages: manifest.packages.map(({ key }) => ({
    key,
    forwardSha256: manifest.operations[key].forwardSha256,
    rollbackSha256: manifest.operations[key].rollbackSha256,
    commandCount: manifest.operations[key].forwardCommandCount,
    targetCellCount: packageColumnsCells[key],
  })),
  domainIdentity: {
    frozenReshapedCellCount: reshapedCellCount,
    frozenIntervalManifestSha256: reshapeManifests.solidIntervalManifestSha256,
    baselineCellCount: base.constructionCellCount,
    noBuildColumnSetSha256: noBuildIdentity.columnSetSha256,
    compositeCanonicalPayloadSha256: overlay.compositeCanonicalModel
      .compositeCanonicalPayloadSha256,
  },
  partitionRecomputation: {
    snapshotRoot: manifest.source.snapshotRoot,
    operated: {
      recomputedCellCount: classCounts.operated,
      matchesManifest: true,
    },
    wetDeferred: {
      recomputedCellCount: classCounts.wetDeferred,
      matchesManifest: true,
    },
    alreadyTarget: {
      recomputedCellCount: classCounts.alreadyTarget,
      matchesManifest: true,
    },
    entombedCellCount: parsedEntombments,
    familyTotals: familyCounts,
    exactPartitionOfFrozenDomain: true,
    parsedTargetsEqualOperatedClass: true,
    rollbackExactInverseProvenPerLine: true,
  },
  packageDisjointness: {
    bulkTargetCellCount: packageColumnsCells['b10-bulk'],
    finishTargetCellCount: packageColumnsCells['b10-finish'],
    sharedTargetCellCount: 0,
    exactlyDisjoint: true,
  },
  noBuildIsolation: {
    noBuildColumnCount: noBuildIdentity.columnCount,
    operatedCellsInNoBuildColumns: 0,
  },
  protectedCoreIntersections: coreIntersections,
  crossReleaseIsolation: {
    r02ManifestIdentity: r02Manifest.manifestIdentity,
    r02OperatedCellsChecked: r02CheckedCells,
    r02IntersectionCellCount: 0,
  },
  ownership: {
    registryCanonicalPayloadSha256: registry.canonicalPayloadSha256,
    unownedCellCount: 0,
    multiplyOwnedCellCount: 0,
    owningScopes: ['P1-B10/construction (reshaped composite)'],
    interfaceClosureReportIdentitySha256: layerBClosure.reportIdentitySha256,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditAuthorized: false,
  },
};
report.reportIdentitySha256 = sha256(`${JSON.stringify(report)}\n`);
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  packages: report.packages.map(({ key, commandCount, targetCellCount }) => ({
    key, commandCount, targetCellCount,
  })),
  partitionRecomputation: {
    operated: classCounts.operated,
    wetDeferred: classCounts.wetDeferred,
    alreadyTarget: classCounts.alreadyTarget,
    entombed: parsedEntombments,
  },
  coreIntersections,
  r02OperatedCellsChecked: r02CheckedCells,
  reportIdentitySha256: report.reportIdentitySha256,
  output: path.relative(ROOT, OUTPUT),
}, null, 2));
