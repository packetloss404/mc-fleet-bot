#!/usr/bin/env node
/** Read-only engineering inventory for C1 west hydraulic gap 1184..1188. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  stateToCommandString,
  uniqueCells,
} from './lib/combined_zones_release_lib.mjs';
import {
  analyzeIsland,
  blockName,
  census,
  classManifest,
  connectedComponents,
  FORBIDDEN_SOURCE_BLOCKS,
  GRAVITY_BLOCKS,
  isAir,
  isFluid,
  isReplaceableSupport,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json',
);
const GENERATED_AT = value('--generated-at', '2026-08-22T04:20:00Z');
const SOURCE = 'data/worldsnap-r11i-post-20260822T034802Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/evidence-ledger.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const R11I_MANIFEST =
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json';
const BEAM_Y = 62;

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11J inventory rejected: ${message}`);
};
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const first = unvisited.values().next().value;
    unvisited.delete(first);
    const queue = [first];
    const component = [];
    while (queue.length) {
      const key = queue.pop();
      const cell = byKey.get(key);
      component.push(cell);
      for (const [dx, dy, dz] of FACE) {
        const next = `${cell.x + dx},${cell.y + dy},${cell.z + dz}`;
        if (unvisited.delete(next)) queue.push(next);
      }
    }
    components.push(component);
  }
  return components.sort((left, right) => right.length - left.length);
}
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
const manifestBytes = fs.readFileSync(absolute(R11I_MANIFEST));
const r11i = JSON.parse(manifestBytes);
const designBytes = fs.readFileSync(absolute(DESIGN));
const design = JSON.parse(designBytes);
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && path.resolve(ROOT, ledger.postSnapshot.root) === absolute(SOURCE),
'accepted R11I source ledger drifted');

const priorTargetKeys = new Set();
const priorBindings = [];
for (const binding of r11i.source.priorManifestBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} drifted`);
  priorBindings.push(binding);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
for (const pkg of r11i.packages) {
  for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
}
const reader = new AnvilReader(absolute(path.join(SOURCE, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SOURCE, 'entities')));
const sourceAt = async (cell) => stateToCommandString(
  await reader.blockState(cell.x, cell.y, cell.z),
);
const analysis = await analyzeIsland({
  key: 'west-hydraulic-gap-1184-1188', start: 1184, end: 1188,
  stations: design.horizontalAlignment.stations, reader, priorTargetKeys,
});
const fluids = [];
for (const cell of analysis.halo) {
  const sourceState = await sourceAt(cell);
  if (isFluid(sourceState)) fluids.push({ cell, sourceState });
}
const fluidCells = fluids.map(({ cell }) => cell);
const foundationByColumn = new Map();
for (const record of analysis.foundationRecords) {
  const key = `${record.cell.x},${record.cell.z}`;
  if (!foundationByColumn.has(key)) foundationByColumn.set(key, []);
  foundationByColumn.get(key).push(record);
}
const supportBySurface = new Map(analysis.supportRecords.map((record) => [
  cellKey(record.surfaceCell), record,
]));
const columnProfiles = [];
for (const cell of analysis.surface) {
  const column = foundationByColumn.get(`${cell.x},${cell.z}`) ?? [];
  const immediate = { x: cell.x, y: cell.y - 1, z: cell.z };
  const immediateState = await sourceAt(immediate);
  const terminal = supportBySurface.get(cellKey(cell));
  const minFluidDistance = fluidCells.length ? Math.min(...fluidCells.map((fluid) => Math.max(
    Math.abs(cell.x - fluid.x), Math.abs(immediate.y - fluid.y), Math.abs(cell.z - fluid.z),
  ))) : null;
  columnProfiles.push({
    surface: cell,
    immediateSupportCell: immediate,
    immediateSupportState: immediateState,
    replaceableFoundationDepth: column.length,
    foundation: classManifest(column.map(({ cell: point }) => point)),
    terminalSupportCell: terminal.cell,
    terminalSupportState: terminal.sourceState,
    terminalHazard: isAir(terminal.sourceState) || isFluid(terminal.sourceState),
    minimumImmediateSupportToFluidChebyshevDistance: minFluidDistance,
  });
}

const projectedSupportCells = analysis.surface.map((cell) => ({
  x: cell.x, y: cell.y - 1, z: cell.z,
}));
const sourceSolidSupportCount = (await Promise.all(projectedSupportCells.map(sourceAt)))
  .filter((state) => !isAir(state) && !isFluid(state)).length;
const projectedSupportComponents = faceComponents(projectedSupportCells);
const projectedSupportComponentSummary = [];
for (const component of projectedSupportComponents) {
  const retainedAnchors = [];
  for (const cell of component) {
    const sourceState = await sourceAt(cell);
    if (!isAir(sourceState) && !isFluid(sourceState)
      && blockName(sourceState) !== 'minecraft:gravel') {
      retainedAnchors.push({ cell, sourceState });
    }
  }
  projectedSupportComponentSummary.push({
    support: classManifest(component),
    retainedAnchorCount: retainedAnchors.length,
    retainedAnchors,
  });
}

// A constant-elevation beam plane avoids treating diagonal raster contacts as
// structural support. Each plan-diagonal gets one deterministic orthogonal
// connector, and every pavement column receives a vertical stone-brick haunch
// down to that plane.
const beamPlanByKey = new Map();
for (const surface of analysis.surface) {
  const cell = { x: surface.x, y: BEAM_Y, z: surface.z };
  beamPlanByKey.set(cellKey(cell), cell);
}
for (let leftIndex = 0; leftIndex < analysis.surface.length; leftIndex += 1) {
  const left = analysis.surface[leftIndex];
  for (let rightIndex = leftIndex + 1; rightIndex < analysis.surface.length; rightIndex += 1) {
    const right = analysis.surface[rightIndex];
    const dx = Math.abs(left.x - right.x);
    const dz = Math.abs(left.z - right.z);
    if (dx !== 1 || dz !== 1) continue;
    const connector = { x: right.x, y: BEAM_Y, z: left.z };
    beamPlanByKey.set(cellKey(connector), connector);
  }
}
const beamPlan = [...beamPlanByKey.values()];
const supportFramework = uniqueCells([
  ...beamPlan,
  ...analysis.surface.flatMap((surface) => {
    const cells = [];
    for (let y = BEAM_Y; y < surface.y; y += 1) {
      cells.push({ x: surface.x, y, z: surface.z });
    }
    return cells;
  }),
]);
const supportFrameworkKeys = new Set(supportFramework.map(cellKey));
const supportFrameworkComponents = faceComponents(supportFramework);
const supportOperations = [];
const supportRetained = [];
const supportHazards = [];
for (const cell of supportFramework) {
  const sourceState = await sourceAt(cell);
  if (isFluid(sourceState) || FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    supportHazards.push({ cell, sourceState });
  } else if (isReplaceableSupport(sourceState)
    || GRAVITY_BLOCKS.has(blockName(sourceState))) {
    supportOperations.push({ cell, sourceState, targetState: 'minecraft:stone_bricks' });
  } else {
    supportRetained.push({ cell, sourceState });
  }
}
const gravityRollbackProof = [];
for (const record of supportOperations.filter(({ sourceState }) => (
  GRAVITY_BLOCKS.has(blockName(sourceState))
))) {
  let support = { x: record.cell.x, y: record.cell.y - 1, z: record.cell.z };
  let supportState = await sourceAt(support);
  let interveningGravityCount = 0;
  while (GRAVITY_BLOCKS.has(blockName(supportState))) {
    interveningGravityCount += 1;
    support = { x: support.x, y: support.y - 1, z: support.z };
    supportState = await sourceAt(support);
  }
  gravityRollbackProof.push({
    cell: record.cell,
    sourceState: record.sourceState,
    terminalSupportCell: support,
    terminalSupportState: supportState,
    interveningGravityCount,
    durable: !isAir(supportState) && !isFluid(supportState)
      && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState)),
  });
}
const supportAnchorRecords = [];
for (const record of supportRetained) {
  supportAnchorRecords.push({ kind: 'retained-framework-cell', ...record });
}
for (const cell of supportFramework) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  if (supportFrameworkKeys.has(cellKey(below))) continue;
  const sourceState = await sourceAt(below);
  if (!isAir(sourceState) && !isFluid(sourceState)
    && !GRAVITY_BLOCKS.has(blockName(sourceState))
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    supportAnchorRecords.push({ kind: 'durable-below-contact', cell: below, sourceState });
  }
}
const structureOperations = [
  ...analysis.headroomRecords,
  ...analysis.surfaceRecords,
];
const designOperations = [...supportOperations, ...structureOperations];
const designTargetKeys = new Set(designOperations.map(({ cell }) => cellKey(cell)));
const designHalo = uniqueCells(designOperations.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
const designHaloFluids = [];
for (const cell of designHalo) {
  const sourceState = await sourceAt(cell);
  if (isFluid(sourceState)) designHaloFluids.push({ cell, sourceState });
}
const designPriorIntersections = designOperations.filter(({ cell }) => (
  priorTargetKeys.has(cellKey(cell))
));
const designHaloBounds = classManifest(designHalo).bounds;
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(designHaloBounds.minX / 16);
  cx <= Math.floor(designHaloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(designHaloBounds.minZ / 16);
    cz <= Math.floor(designHaloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (designHalo.some((point) => cellKey(point) === cellKey(cell))) {
        blockEntities.push({ id: entity.id ?? null, cell });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (designHalo.some((cell) => x >= cell.x && x < cell.x + 1
        && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
        savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: 'READ_ONLY_WEST_HYDRAULIC_BRIDGE_INVENTORY_COMPLETE',
  source: {
    root: SOURCE,
    ledgerPath: SOURCE_LEDGER,
    ledgerSha256: sha256(ledgerBytes),
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    completeSaveSha256: ledger.postSnapshot.completeSaveSha256,
    regionSha256: JSON.parse(fs.readFileSync(absolute(ledger.postSnapshot.identity.path))).sha256,
  },
  design: { path: DESIGN, sha256: sha256(designBytes) },
  r11iManifest: { path: R11I_MANIFEST, sha256: sha256(manifestBytes) },
  priorBindings,
  geometry: {
    stations: { start: 1184, end: 1188, count: 5 },
    treatmentCensus: census(analysis.selected, 'treatment'),
    candidateSurface: classManifest(analysis.candidate),
    priorConflicts: classManifest(analysis.priorConflicts),
    gradeShadows: classManifest(analysis.gradeShadows),
    selectedSurface: classManifest(analysis.surface),
    selectedSurfaceComponentCount: connectedComponents(analysis.surface).length,
    genericFoundationFill: classManifest(analysis.foundationRecords.map(({ cell }) => cell)),
    genericHeadroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
    fullHeadroom: classManifest(analysis.fullHeadroom),
    gravitySources: classManifest(analysis.gravityRecords.map(({ cell }) => cell)),
    gravityRollbackSupportProof: analysis.gravityRollbackSupportProof,
    genericOperatedUnion: classManifest(analysis.operated),
    genericInteractionHalo: classManifest(analysis.halo),
  },
  hazards: {
    sourceHazardCount: analysis.sourceHazards.length,
    sourceHazardCensus: census(analysis.sourceHazards, 'kind'),
    sourceHazards: analysis.sourceHazards,
    haloFluidCount: fluids.length,
    haloFluidCensus: census(fluids, 'sourceState'),
    haloFluidCoordinateSetSha256: hashCells(fluidCells),
    haloFluids: fluids,
    haloOtherHazardCount: analysis.haloHazards.length - fluids.length,
    priorIntersectionCount: analysis.priorIntersections.length,
    interfaceIntersectionCounts: Object.fromEntries(Object.entries(
      analysis.operatedInterfaceIntersections,
    ).map(([key, cells]) => [key, cells.length])),
  },
  bridgeInputs: {
    projectedUnderdeckSupportCellCount: projectedSupportCells.length,
    projectedUnderdeckSupportCoordinateSetSha256: hashCells(projectedSupportCells),
    sourceSolidImmediateSupportCount: sourceSolidSupportCount,
    sourceReplaceableImmediateSupportCount:
      projectedSupportCells.length - sourceSolidSupportCount,
    projectedUnderdeckFaceComponentCount: projectedSupportComponents.length,
    projectedUnderdeckFaceComponents: projectedSupportComponentSummary,
    columnProfiles,
  },
  selectedStaticBridgeDesign: {
    beamY: BEAM_Y,
    beamPlan: classManifest(beamPlan),
    supportFramework: classManifest(supportFramework),
    supportFrameworkFaceComponentCount: supportFrameworkComponents.length,
    supportOperations: classManifest(supportOperations.map(({ cell }) => cell)),
    supportRetained: classManifest(supportRetained.map(({ cell }) => cell)),
    supportAnchorCount: supportAnchorRecords.length,
    supportAnchors: supportAnchorRecords,
    supportHazardCount: supportHazards.length,
    supportHazards,
    sourceGravityOperationCount: gravityRollbackProof.length,
    gravityRollbackProof,
    headroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
    pavementSurface: classManifest(analysis.surface),
    operationUnion: classManifest(designOperations.map(({ cell }) => cell)),
    operationTransitionCount: designOperations.length,
    interactionHalo: classManifest(designHalo),
    haloFluidCount: designHaloFluids.length,
    haloFluids: designHaloFluids,
    priorIntersectionCount: designPriorIntersections.length,
    blockEntityCount: blockEntities.length,
    blockEntities,
    savedEntityCount: savedEntities.length,
    savedEntities,
    packageOverlapCount: designOperations.length - designTargetKeys.size,
    sourceStateCensus: census(designOperations, 'sourceState'),
    targetStateCensus: census(designOperations, 'targetState'),
  },
  safetyBoundary: { liveCallsPerformed: false, worldEditsPerformed: false },
};
const report = {
  ...withoutIdentity,
  inventoryPayloadSha256: sha256(JSON.stringify(withoutIdentity)),
};
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  status: report.status,
  out: OUT,
  inventoryPayloadSha256: report.inventoryPayloadSha256,
  geometry: report.geometry,
  hazardSummary: {
    sourceHazardCount: report.hazards.sourceHazardCount,
    haloFluidCount: report.hazards.haloFluidCount,
    haloOtherHazardCount: report.hazards.haloOtherHazardCount,
  },
  bridgeInputs: {
    projectedUnderdeckSupportCellCount:
      report.bridgeInputs.projectedUnderdeckSupportCellCount,
    sourceSolidImmediateSupportCount:
      report.bridgeInputs.sourceSolidImmediateSupportCount,
    sourceReplaceableImmediateSupportCount:
      report.bridgeInputs.sourceReplaceableImmediateSupportCount,
  },
}, null, 2));
