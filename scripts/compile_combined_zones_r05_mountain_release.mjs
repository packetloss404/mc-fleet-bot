#!/usr/bin/env node
/**
 * T01 release compiler for CZ-R05 — the reshaped FM-01 P1-B10 mountain.
 *
 * Deterministically re-derives the reshaped composite P1-B10 construction
 * domain (14,684,824 cells): baseline FM-01 per-column added-solid intervals
 * (D05-DIRECTIONAL-RATIONAL-PYRAMID-V1 design surface over the bound save's
 * current surfaces, minus the exact relic/B08/B09 no-fill reservations)
 * minus the 2,432 south-open shipwreck-reshape no-build columns. Every
 * derived structure is verified against its committed identity (G03 P1-B10
 * baseline interval manifest, the best-choice no-build column set, and the
 * canonical-integration overlay's replacement domains) before compiling.
 *
 * Families follow the accepted D05 rules: the cell at the analytic design
 * surface of each column is exposed finish (smooth_stone below y130,
 * polished_diorite at/above); every other added-solid cell is bulk stone.
 *
 * Operations: uniform-air column Y-runs merge into guarded REPL box lines
 * (the runner converts them to `/fill … replace minecraft:air strict`);
 * the compiler proves each merged run is exactly minecraft:air in the bound
 * save. Non-air cells inside the domain are entombed with exact per-cell
 * guarded operations; fluid sources are entombed only when fully enclosed
 * (every face neighbour inside the fill footprint or solid), otherwise
 * deferred as a hash-accounted wet class; already-at-target cells are
 * accounted, never emitted. The container guard is a hard abort. Partition
 * invariant: operated + wetDeferred + alreadyTarget == frozen reshaped
 * domain, proven per column.
 *
 * Two packages, disjoint, bulk first: b10-bulk (stone) and b10-finish
 * (smooth_stone + polished_diorite). Rollback is the exact inverse (box
 * target→air; per-cell inverses for entombed cells).
 *
 * The manifest binds only upstream identities. This compiler performs no
 * live call and authorizes no world edit.
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
  faceShellIntervalMap,
  filterColumnsOutsideBounds,
  groupCellsByColumn,
  hashCells,
  inColumnBounds,
  intervalMapStats,
  mountainSurfaceY,
  noBuildColumnIdentity,
  rangesCount,
  reshapedIntervalManifests,
  sha256,
  stateToCommandString,
  subtractRanges,
  unionIntervalMaps,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const GENERATED_AT = value('--generated-at', '2026-08-07T00:45:00Z');
const SNAPSHOT = value('--snapshot', 'data/worldsnap-combined-zones-complete-save-20260807T001212Z');
const INTAKE_AUDIT = value('--intake-audit',
  'docs/masterplans/05-combined-zones/phase1-complete-save-intake-audit-20260807T001212Z.json');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r05-mountain';
const EXPECTED_COMPLETE_SAVE_SHA256 = 'd0aa5693bdd5e3de001787ba3f8c6e86dad8879e7e7ef6af186159a10cd11b98';
const FINISH_TRANSITION_Y = 130;
const STATES = Object.freeze({
  bulk: 'minecraft:stone',
  finishLow: 'minecraft:smooth_stone',
  finishHigh: 'minecraft:polished_diorite',
});
const R05_CLASS_PREAMBLE = 'combined-zones-r05-fm01-partition-class-intervals-v1';

const INPUTS = Object.freeze({
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
  r02Manifest: 'data/buildops/combined-zones-r02-d06-shell.release-manifest.json',
});

// Copied verbatim from the CZ-R01 compiler denylist.
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
const GUARD_LISTING_CAP = 50;

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));
function invariant(condition, message) {
  if (!condition) throw new Error(`R05 mountain release compiler rejected: ${message}`);
}
function assertBoundsEqual(actual, expected, message) {
  invariant(actual && expected
    && ['minX', 'maxX', 'minY', 'maxY', 'minZ', 'maxZ']
      .every((field) => actual[field] === expected[field]), message);
}

const startedAt = Date.now();
const decisionBytes = fs.readFileSync(path.join(ROOT, INPUTS.decision));
const decisionSha256 = sha256(decisionBytes);
const decisionText = decisionBytes.toString('utf8');
const d05 = readJson(INPUTS.d05FutureState);
const defaults = readJson(INPUTS.d05Defaults);
const owner = readJson(INPUTS.d05OwnerAcceptance);
const connectors = readJson(INPUTS.connectors);
const g03 = readJson(INPUTS.g03CanonicalSetout);
const relicClearance = readJson(INPUTS.protectedRelicClearance);
const bestChoice = readJson(INPUTS.bestChoice);
const overlay = readJson(INPUTS.overlay);
const registry = readJson(INPUTS.registry);
const r02Manifest = readJson(INPUTS.r02Manifest);
const intake = readJson(INTAKE_AUDIT);

invariant(decisionText.includes('OWNER_DECISION_RECORDED_R05_MOUNTAIN_BUILD')
  && decisionText.includes(EXPECTED_COMPLETE_SAVE_SHA256),
'R05 decision record is not the recorded mountain decision bound to this save');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.summary?.autonomousEngineeringMayUseAsCompleteSaveEvidence === true
  && intake.packageIdentity.completeSaveSha256 === EXPECTED_COMPLETE_SAVE_SHA256,
'fresh complete-save intake audit is not the contracted PASS save');
invariant(fs.existsSync(path.join(ROOT, SNAPSHOT, 'region')),
  'snapshot root has no region directory');
const composite = overlay.compositeCanonicalModel;
invariant(composite.baseG03CanonicalPayloadSha256 === g03.canonicalPayloadSha256
  && composite.replacedScopeId === 'P1-B10',
'canonical-integration overlay is not bound to this G03 base');
invariant(decisionText.includes(composite.compositeCanonicalPayloadSha256.slice(0, 16)),
  'decision record does not bind the composite canonical payload identity');
invariant(overlay.sourceBindings.bestChoice.sha256
  === sha256(fs.readFileSync(path.join(ROOT, INPUTS.bestChoice))),
'overlay is not bound to the best-choice analysis bytes');

// ---- Re-derive and prove the reshaped composite construction domain.
const model = d05.selectedPlanningIdentity.formula;
invariant(model.id === 'D05-DIRECTIONAL-RATIONAL-PYRAMID-V1'
  && model.center.x === 2048 && model.center.z === -828,
'FM-01 formula drift');
const p1b10 = g03.scopeRegistry.find(({ scopeId }) => scopeId === 'P1-B10');

const b08Interaction = dilateCells(deriveB08ServiceTunnelConstruction(connectors), 1);
invariant(b08Interaction.length
  === connectors.serviceTunnelCenterline.exactCellSets.interactionUnion.cellCount
  && hashCells(b08Interaction)
    === connectors.serviceTunnelCenterline.exactCellSets.interactionUnion.coordinateSetSha256,
'B08 interaction reconstruction drift');
const b09Reservation = buildB09MinimumReservation(model, owner.b09B10SystemPlan.b09Route);
invariant(b09Reservation.length
  === owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.cellCount
  && hashCells(b09Reservation)
    === owner.b09B10SystemPlan.b09Route.minimumPlanningAccommodation.coordinateSetSha256,
'B09 reservation reconstruction drift');
const relicCells = defaults.soleAuthorityRecommendations.bufferPolicy.relics
  .flatMap((relic) => cellsIn(relic.minimumPlanningExclusionShell.expandedBounds));
const noFillByColumn = groupCellsByColumn(
  uniqueCells([...relicCells, ...b08Interaction, ...b09Reservation]),
);

const reader = new SurfaceSnapshotReader(path.join(ROOT, SNAPSHOT, 'region'));
const base = await deriveFm01BaselineIntervals({ reader, model, noFillByColumn });
invariant(base.constructionCellCount === p1b10.construction.cellCount
  && base.baseSolidSha256 === p1b10.construction.sparseIntervals.intervalManifestSha256,
`baseline FM-01 construction reproduction drift (${base.constructionCellCount} cells, `
  + `${base.baseSolidSha256})`);
invariant(base.supportCellCount === p1b10.exactSupportGapEvidence.cellCount
  && base.baseSupportSha256 === p1b10.exactSupportGapEvidence.intervalManifestSha256,
'baseline FM-01 support-gap reproduction drift');

const noBuildPlan = bestChoice.analysisPayload.reshapeOptimization
  .selectedPlanningReshape.sparseNoBuildPlan;
const shipwreckCore = relicClearance.relics
  .find(({ key }) => key === 'shipwreck').declaredInclusiveBounds;
invariant(noBuildPlan.bounds.minX === shipwreckCore.minX - 2
  && noBuildPlan.bounds.maxX === shipwreckCore.maxX + 2
  && noBuildPlan.bounds.minZ === shipwreckCore.minZ - 2
  && noBuildPlan.bounds.maxZ === base.mountainBounds.maxZ,
'no-build rectangle does not reproduce the accepted south-open reshape rule');
const noBuildIdentity = noBuildColumnIdentity(noBuildPlan.bounds);
invariant(noBuildIdentity.columnCount === noBuildPlan.columnCount
  && noBuildIdentity.columnSetSha256 === noBuildPlan.columnSetSha256,
'no-build column-set identity drift');

const selectedConstruction = filterColumnsOutsideBounds(base.construction, noBuildPlan.bounds);
const selectedSupport = filterColumnsOutsideBounds(base.support, noBuildPlan.bounds);
let reshapedCellCount = 0;
for (const ranges of selectedConstruction.values()) reshapedCellCount += rangesCount(ranges);
const committedConstruction = composite.replacementDomains.construction;
invariant(reshapedCellCount === committedConstruction.cellCount
  && base.constructionCellCount - reshapedCellCount
    === committedConstruction.lostCellCountFromBase,
`reshaped construction count drift (${reshapedCellCount})`);
const reshapeManifests = reshapedIntervalManifests({
  model,
  mountainBounds: base.mountainBounds,
  currentSurface: base.currentSurface,
  selectedConstruction,
  selectedSupport,
  noBuildBounds: noBuildPlan.bounds,
});
invariant(reshapeManifests.solidIntervalManifestSha256
  === committedConstruction.intervalManifestSha256,
`reshaped solid interval manifest drift (${reshapeManifests.solidIntervalManifestSha256})`);
invariant(reshapeManifests.designSurfaceManifestSha256
  === bestChoice.analysisPayload.reshapeOptimization.selectedPlanningReshape
    .designSurfaceManifestSha256,
'reshaped design-surface manifest drift');
const constructionStats = intervalMapStats(selectedConstruction, 'P1-B10', 'construction');
assertBoundsEqual(constructionStats.bounds, committedConstruction.bounds,
  'reshaped construction bounds drift');
const interactionMap = faceShellIntervalMap(selectedConstruction);
const interactionStats = intervalMapStats(interactionMap, 'P1-B10', 'interaction');
invariant(interactionStats.cellCount === composite.replacementDomains.interaction.cellCount
  && interactionStats.intervalManifestSha256
    === composite.replacementDomains.interaction.intervalManifestSha256,
'reshaped interaction reproduction drift');
const influenceStats = intervalMapStats(
  unionIntervalMaps(interactionMap, selectedSupport), 'P1-B10', 'influence',
);
invariant(influenceStats.cellCount === composite.replacementDomains.influence.cellCount
  && influenceStats.intervalManifestSha256
    === composite.replacementDomains.influence.intervalManifestSha256,
'reshaped influence reproduction drift');
invariant(reshapeManifests.supportIntervalManifestSha256
  === composite.replacementDomains.supportGap.intervalManifestSha256,
'reshaped support-gap reproduction drift');

// ---- Classify and emit: per column, family split at the design surface,
// exact-air verification for merged boxes, anomalies handled per cell.
const sortedColumnKeys = [...selectedConstruction.keys()].sort((left, right) => {
  const [lx, lz] = left.split(',').map(Number);
  const [rx, rz] = right.split(',').map(Number);
  return lx - rx || lz - rz;
});
const columnHasY = (map, x, z, y) => (map.get(columnKey(x, z)) ?? [])
  .some(({ start, end }) => y >= start && y <= end);
const isFluidState = (state) => FLUID_BLOCKS.has(state.Name)
  || state.Properties?.waterlogged === 'true';
const familyStateFor = (y, designY) => {
  if (y !== designY) return STATES.bulk;
  return y < FINISH_TRANSITION_Y ? STATES.finishLow : STATES.finishHigh;
};

const classDigests = Object.fromEntries(['operated', 'wetDeferred', 'alreadyTarget']
  .map((name) => [name, crypto.createHash('sha256').update(`${R05_CLASS_PREAMBLE}\n${name}\n`)]));
const classCounts = { operated: 0, wetDeferred: 0, alreadyTarget: 0 };
const classBounds = { operated: null, wetDeferred: null, alreadyTarget: null };
const growBounds = (name, x, z, start, end) => {
  const bounds = classBounds[name];
  if (!bounds) {
    classBounds[name] = { minX: x, maxX: x, minY: start, maxY: end, minZ: z, maxZ: z };
  } else {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.minY = Math.min(bounds.minY, start);
    bounds.maxY = Math.max(bounds.maxY, end);
    bounds.minZ = Math.min(bounds.minZ, z);
    bounds.maxZ = Math.max(bounds.maxZ, z);
  }
};
const recordClassRanges = (name, x, z, ranges) => {
  if (!ranges.length) return;
  classDigests[name].update(`${x},${z}\t${ranges
    .map(({ start, end }) => `${start}..${end}`).join(',')}\n`);
  for (const { start, end } of ranges) {
    classCounts[name] += end - start + 1;
    growBounds(name, x, z, start, end);
  }
};

const familyCounts = { [STATES.bulk]: 0, [STATES.finishLow]: 0, [STATES.finishHigh]: 0 };
const bulkForward = [];
const bulkRollback = [];
const finishForward = [];
const finishRollback = [];
const bulkSourceCensus = new Map();
const finishSourceCensus = new Map();
const containerViolations = [];
const wetSamples = [];
const entombSamples = [];
let bulkBoxCount = 0;
let entombedCellCount = 0;

for (const key of sortedColumnKeys) {
  const [x, z] = key.split(',').map(Number);
  const ranges = selectedConstruction.get(key);
  const designY = mountainSurfaceY(x, z, model);
  const anomalies = await reader.columnNonAirCells(x, z, ranges);
  const removedYs = [];
  for (const anomaly of anomalies) {
    const targetState = familyStateFor(anomaly.y, designY);
    const fromState = stateToCommandString(anomaly.state);
    if (FORBIDDEN_SOURCE_BLOCKS.has(anomaly.state.Name)) {
      containerViolations.push({ cell: { x, y: anomaly.y, z }, sourceState: fromState });
      removedYs.push(anomaly.y);
      continue;
    }
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
        if (wetSamples.length < GUARD_LISTING_CAP) {
          wetSamples.push({ cell: { x, y: anomaly.y, z }, sourceState: fromState });
        }
        removedYs.push(anomaly.y);
        continue;
      }
    }
    // Exact per-cell entombment operation.
    const forwardLine = `REPL ${x} ${anomaly.y} ${z} ${x} ${anomaly.y} ${z} ${fromState} ${targetState}`;
    const rollbackLine = `REPL ${x} ${anomaly.y} ${z} ${x} ${anomaly.y} ${z} ${targetState} ${fromState}`;
    const isFinish = targetState !== STATES.bulk;
    (isFinish ? finishForward : bulkForward).push(forwardLine);
    (isFinish ? finishRollback : bulkRollback).push(rollbackLine);
    const census = isFinish ? finishSourceCensus : bulkSourceCensus;
    census.set(fromState, (census.get(fromState) ?? 0) + 1);
    familyCounts[targetState] += 1;
    entombedCellCount += 1;
    if (entombSamples.length < GUARD_LISTING_CAP) {
      entombSamples.push({ cell: { x, y: anomaly.y, z }, sourceState: fromState, targetState });
    }
    recordClassRanges('operated', x, z, [{ start: anomaly.y, end: anomaly.y }]);
    removedYs.push(anomaly.y);
  }
  // Uniform-air remainder, split by family (design-surface point puncture).
  const airRanges = subtractRanges(ranges, removedYs.map((y) => ({ start: y, end: y })));
  const finishIncluded = airRanges.some(({ start, end }) => designY >= start && designY <= end);
  const bulkAirRanges = finishIncluded
    ? subtractRanges(airRanges, [{ start: designY, end: designY }])
    : airRanges;
  for (const { start, end } of bulkAirRanges) {
    bulkForward.push(`REPL ${x} ${start} ${z} ${x} ${end} ${z} minecraft:air ${STATES.bulk}`);
    bulkRollback.push(`REPL ${x} ${start} ${z} ${x} ${end} ${z} ${STATES.bulk} minecraft:air`);
    bulkBoxCount += 1;
    const cellCount = end - start + 1;
    familyCounts[STATES.bulk] += cellCount;
    bulkSourceCensus.set('minecraft:air', (bulkSourceCensus.get('minecraft:air') ?? 0) + cellCount);
  }
  if (finishIncluded) {
    const finishState = designY < FINISH_TRANSITION_Y ? STATES.finishLow : STATES.finishHigh;
    finishForward.push(`REPL ${x} ${designY} ${z} ${x} ${designY} ${z} minecraft:air ${finishState}`);
    finishRollback.push(`REPL ${x} ${designY} ${z} ${x} ${designY} ${z} ${finishState} minecraft:air`);
    familyCounts[finishState] += 1;
    finishSourceCensus.set('minecraft:air', (finishSourceCensus.get('minecraft:air') ?? 0) + 1);
  }
  recordClassRanges('operated', x, z, finishIncluded
    ? airRanges
    : bulkAirRanges);
}

if (containerViolations.length) {
  console.error(JSON.stringify({
    status: 'ABORTED_FAIL_CLOSED_COMPILE_GUARDS',
    transactionId: BASENAME,
    guards: {
      forbiddenContainerSourceState: {
        violationCellCount: containerViolations.length,
        listedCells: containerViolations.slice(0, GUARD_LISTING_CAP),
      },
    },
    outputsWritten: false,
  }, null, 2));
  process.exit(1);
}

// Partition invariant: operated + wetDeferred + alreadyTarget == frozen
// reshaped domain (counts here; the class interval digests plus the exact
// per-column construction identity proven above make the partition binding).
invariant(classCounts.operated + classCounts.wetDeferred + classCounts.alreadyTarget
  === reshapedCellCount,
'partition classes do not cover the frozen reshaped domain');
invariant(familyCounts[STATES.bulk] + familyCounts[STATES.finishLow]
  + familyCounts[STATES.finishHigh] === classCounts.operated,
'family totals do not cover the operated class');

const classIdentities = Object.fromEntries(Object.keys(classCounts).map((name) => [name, {
  cellCount: classCounts[name],
  bounds: classBounds[name],
  intervalManifestSha256: classDigests[name].digest('hex'),
}]));

// ---- Prove zero intersection with the R02 operated cells.
let r02CheckedCells = 0;
for (const pkg of r02Manifest.packages) {
  const raw = fs.readFileSync(path.join(ROOT, pkg.forward), 'utf8');
  for (const line of raw.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(' ');
    const [x1, y1, z1] = parts.slice(1, 4).map(Number);
    invariant(!columnHasY(selectedConstruction, x1, z1, y1),
      `R02 operated cell ${x1},${y1},${z1} intersects the mountain domain`);
    r02CheckedCells += 1;
  }
}

// ---- Relic cores and no-build columns must contain zero operated cells.
for (const relic of relicClearance.relics) {
  const bounds = relic.declaredInclusiveBounds;
  for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
    for (let z = bounds.minZ; z <= bounds.maxZ; z += 1) {
      const ranges = selectedConstruction.get(columnKey(x, z)) ?? [];
      invariant(ranges.every(({ start, end }) => end < bounds.minY || start > bounds.maxY),
        `relic core ${relic.key} intersects the mountain domain at column ${x},${z}`);
    }
  }
}
for (const key of sortedColumnKeys) {
  const [x, z] = key.split(',').map(Number);
  invariant(!inColumnBounds(noBuildPlan.bounds, x, z),
    `no-build column ${key} unexpectedly contains domain cells`);
}

// ---- Emit the guarded operation pairs.
fs.mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
const packageArtifacts = [];
const packagesSpec = [
  {
    key: 'b10-bulk',
    forwardLines: bulkForward,
    rollbackLines: bulkRollback,
    sourceCensus: bulkSourceCensus,
    targetCensus: { [STATES.bulk]: familyCounts[STATES.bulk] },
    cellCount: familyCounts[STATES.bulk],
  },
  {
    key: 'b10-finish',
    forwardLines: finishForward,
    rollbackLines: finishRollback,
    sourceCensus: finishSourceCensus,
    targetCensus: {
      [STATES.finishLow]: familyCounts[STATES.finishLow],
      [STATES.finishHigh]: familyCounts[STATES.finishHigh],
    },
    cellCount: familyCounts[STATES.finishLow] + familyCounts[STATES.finishHigh],
  },
];
for (const spec of packagesSpec) {
  const forwardBody = `${spec.forwardLines.join('\n')}\n`;
  const rollbackBody = `${spec.rollbackLines.join('\n')}\n`;
  const forwardHash = sha256(forwardBody);
  const rollbackHash = sha256(rollbackBody);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${spec.key}.rollback.txt`);
  const header = (role, bodyHash) => [
    `# GENERATED FILE — Combined Zones CZ-R05 FM-01 mountain (${spec.key} ${role})`,
    `# source root: ${SNAPSHOT}`,
    `# complete-save SHA-256: ${intake.packageIdentity.completeSaveSha256}`,
    `# reshaped construction interval manifest SHA-256: ${reshapeManifests.solidIntervalManifestSha256}`,
    `# decision record identity: ${decisionSha256}`,
    `# operation SHA-256: ${bodyHash}`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(ROOT, forwardPath), `${header('forward', forwardHash)}${forwardBody}`);
  fs.writeFileSync(path.join(ROOT, rollbackPath), `${header('rollback', rollbackHash)}${rollbackBody}`);
  packageArtifacts.push({
    key: spec.key,
    forwardPath,
    rollbackPath,
    forwardHash,
    rollbackHash,
    commandCount: spec.forwardLines.length,
    cellCount: spec.cellCount,
    sourceCensus: Object.fromEntries([...spec.sourceCensus.entries()]
      .sort((a, b) => b[1] - a[1])),
    targetCensus: spec.targetCensus,
  });
}

const [bulkArtifact, finishArtifact] = packageArtifacts;
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_AWAITING_PRERELEASE_GATES_AND_EXPLICIT_AUTHORIZATION',
  packages: packageArtifacts.map(({ key, forwardPath, rollbackPath }) => ({
    key, forward: forwardPath, rollback: rollbackPath,
  })),
  executionOrder: {
    forward: ['b10-bulk', 'b10-finish'],
    rollback: ['b10-finish', 'b10-bulk'],
    note: 'Bulk structural fill before exposed finish; rollback reverses the order.',
  },
  scope: {
    releaseId: 'CZ-R05-PHASE1-FM01-MOUNTAIN-BUILD',
    decisionRecord: {
      path: INPUTS.decision,
      sha256: decisionSha256,
      status: 'OWNER_DECISION_RECORDED_R05_MOUNTAIN_BUILD',
    },
    domain: 'P1-B10/construction (reshaped composite)',
    frozenDomainCellCount: reshapedCellCount,
    frozenDomainBounds: constructionStats.bounds,
    frozenDomainIntervalManifestSha256: reshapeManifests.solidIntervalManifestSha256,
    baselineCellCount: base.constructionCellCount,
    noBuild: {
      bounds: noBuildPlan.bounds,
      columnCount: noBuildIdentity.columnCount,
      columnSetSha256: noBuildIdentity.columnSetSha256,
      lostCellCountFromBase: base.constructionCellCount - reshapedCellCount,
    },
  },
  partition: {
    rulePreamble: `${R05_CLASS_PREAMBLE}\\n<class>\\n`,
    record: 'x,z<TAB>startY..endY[,startY..endY]',
    operated: {
      ...classIdentities.operated,
      commandCount: bulkArtifact.commandCount + finishArtifact.commandCount,
      mergedBoxCommandCount: bulkBoxCount,
      entombedPerCellCommandCount: entombedCellCount,
      finishCommandCount: finishArtifact.commandCount,
    },
    wetDeferred: {
      ...classIdentities.wetDeferred,
      sample: wetSamples,
    },
    alreadyTarget: classIdentities.alreadyTarget,
    entombedSample: entombSamples,
    invariant: 'operated + wetDeferred + alreadyTarget == frozen reshaped domain (proven per column against the committed interval identity)',
  },
  families: {
    transitionY: FINISH_TRANSITION_Y,
    totals: {
      [STATES.bulk]: familyCounts[STATES.bulk],
      [STATES.finishLow]: familyCounts[STATES.finishLow],
      [STATES.finishHigh]: familyCounts[STATES.finishHigh],
    },
    rule: 'Design-surface cell per column is exposed finish (y<130 smooth_stone, y>=130 polished_diorite); every other added-solid cell is bulk stone.',
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    captureManifestSha256: intake.packageIdentity.captureManifestSha256,
    intakeAuditPath: INTAKE_AUDIT,
    sourceStateCensus: Object.fromEntries(packageArtifacts
      .map(({ key, sourceCensus }) => [key, sourceCensus])),
  },
  target: {
    desiredStateCensus: Object.fromEntries(packageArtifacts
      .map(({ key, targetCensus }) => [key, targetCensus])),
  },
  operations: {
    ...Object.fromEntries(packageArtifacts.map(({
      key, forwardHash, rollbackHash, commandCount, cellCount,
    }) => [key, {
      forwardSha256: forwardHash,
      rollbackSha256: rollbackHash,
      forwardCommandCount: commandCount,
      rollbackCommandCount: commandCount,
      targetCellCount: cellCount,
      exactInverse: true,
    }])),
    mergedBoxSemantics: 'REPL x y1 z x y2 z minecraft:air <family> — each merged run proven uniformly minecraft:air in the bound save; the runner executes /fill … replace minecraft:air strict with automatic block-limit splitting.',
    alreadyTargetStateCellsEmitted: false,
  },
  crossReleaseIsolation: {
    r02ManifestIdentity: r02Manifest.manifestIdentity,
    r02OperatedCellsChecked: r02CheckedCells,
    r02IntersectionCellCount: 0,
  },
  compileGuards: {
    guardBehaviour: {
      forbiddenContainerSourceState: 'HARD_ABORT_UNCHANGED',
      fluidSourceState: 'ENTOMB_ONLY_IF_FULLY_ENCLOSED_ELSE_WET_DEFERRAL',
      surfaceExposure: 'NOT_APPLICABLE_ADDING_SOLID',
    },
    forbiddenContainerSourceStateViolationCount: 0,
  },
  upstreamIdentities: {
    decisionRecordSha256: decisionSha256,
    g03CanonicalPayloadSha256: g03.canonicalPayloadSha256,
    compositeCanonicalPayloadSha256: composite.compositeCanonicalPayloadSha256,
    baselineConstructionIntervalManifestSha256: base.baseSolidSha256,
    reshapedConstructionIntervalManifestSha256: reshapeManifests.solidIntervalManifestSha256,
    designSurfaceManifestSha256: reshapeManifests.designSurfaceManifestSha256,
    noBuildColumnSetSha256: noBuildIdentity.columnSetSha256,
    completeSaveSha256: intake.packageIdentity.completeSaveSha256,
    ownershipRegistryPayloadSha256: registry.canonicalPayloadSha256,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
fs.writeFileSync(path.join(ROOT, manifestPath),
  `${JSON.stringify({ ...manifestWithoutIdentity, manifestIdentity }, null, 2)}\n`);

console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: manifestPath,
  manifestIdentity,
  wallTimeSeconds: Math.round((Date.now() - startedAt) / 100) / 10,
  packages: packageArtifacts.map(({
    key, forwardPath, forwardHash, rollbackHash, commandCount, cellCount,
  }) => ({
    key, forward: forwardPath, forwardSha256: forwardHash, rollbackSha256: rollbackHash, commandCount, cellCount,
  })),
  partition: {
    operatedCellCount: classCounts.operated,
    mergedBoxCommandCount: bulkBoxCount,
    entombedCellCount,
    wetDeferredCellCount: classCounts.wetDeferred,
    alreadyTargetCellCount: classCounts.alreadyTarget,
  },
  families: manifestWithoutIdentity.families.totals,
  r02OperatedCellsChecked: r02CheckedCells,
}, null, 2));
