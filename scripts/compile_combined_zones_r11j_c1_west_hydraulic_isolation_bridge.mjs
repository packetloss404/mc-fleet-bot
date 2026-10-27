#!/usr/bin/env node
/** Compile CZ-R11J: dry static support-frame bridge at C1 stations 1184..1188. */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

import {
  AnvilReader,
  cellKey,
  hashCells,
  replLine,
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
const GENERATED_AT = value('--generated-at', '2026-08-22T04:30:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188';
const RELEASE_ID = 'CZ-R11J-C1-WEST-HYDRAULIC-ISOLATION-BRIDGE-1184-1188';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const SOURCE = 'data/worldsnap-r11i-post-20260822T034802Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/evidence-ledger.json';
const INTAKE =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/post-complete-save-intake.json';
const SOURCE_IDENTITY =
  'data/world-review/combined-zones-r11i-live-20260822T034802Z/post-snapshot-identity.json';
const INVENTORY =
  'data/world-review/combined-zones-r11j-west-hydraulic-bridge-inventory-20260822T042000Z.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS =
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const MATERIAL =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const R11I =
  'data/buildops/combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212.release-manifest.json';
const START = 1184;
const END = 1188;
const BEAM_Y = 62;
const EXPECTED = Object.freeze({
  sourceLedgerSha256:
    'f05a55ea98ae032c26b9f42277d43c0884c61d8cdb0d53ee768025c27fa4d909',
  sourceCompletedIdentity:
    '2f9cebbd4bed2103d36381bce65a301023960a823ef402010e63b9cd06bb0e11',
  sourceCompleteSaveSha256:
    'c1fbb77ec91fae38e8698c8d7c6502f025890ee452b038a406755f321ab7c752',
  sourceIntakeSha256:
    '54b26b636ee615db2bd48f7c897a73179201cfe098f096f570ce783f8b986159',
  sourceIdentityFileSha256:
    '56ab6659b1aa0b961f61a74a8344e5d992b9b0206872f38b37d1c4998ee71cb5',
  sourceRegionSha256:
    'c64dd202b19d1ebbcf3f93642d339673d2051293a969f1209719d71e4375f1d2',
  inventorySha256:
    'a79a6e9616c987dc402781ce083a1ec4822c6e633b0a5051f1d56b2cabd2348a',
  inventoryPayloadSha256:
    '48b37c020da1e204f2e0c4d496af549935e02489571965699be536ed124dc19f',
  designSha256:
    '7776e243dc24b03fa7903ecb93ec8f05e6e0cbd81aa3749e2fb52435b7dc2442',
  r11iManifestSha256:
    'ff8502ee21dc50e5fc1aedd997ae5b978e562a9e86115c874323dfa41981d22f',
  surfaceCount: 94,
  surfaceHash: 'a9ee2fee1baad5d277b4e1e936986c146eee170e2023fddb3f964715d1c141e0',
  headroomCutCount: 44,
  fullHeadroomCount: 188,
  beamPlanCount: 146,
  supportFrameworkCount: 344,
  supportFrameworkHash:
    'dbd8264db71d7dee7c94647a5a2eb659275d981aa1a042dbe7e17ab1ccbeb8f5',
  supportOperationCount: 273,
  supportRetainedCount: 71,
  supportAnchorCount: 102,
  gravityCount: 4,
  structureCount: 138,
  targetCount: 411,
  targetHash: '3db1666a75e5d10577ff203a98d54d78bb27b86ae3ffe6332b687118f2ebb103',
  haloCount: 1792,
  haloHash: 'f21e73b5228a92fc79752580d49edbfa0e3f6026bb77eac8df76d42c4831346d',
  seamEdgeCount: 37,
  combinedSurfaceCount: 449,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11J compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readBoundJson = (filename, expected = null) => {
  const bytes = fs.readFileSync(absolute(filename));
  if (expected) invariant(sha256(bytes) === expected, `${filename} identity drifted`);
  return { bytes, value: JSON.parse(bytes) };
};
const inside2d = (cell, extent) => cell.x >= extent.minX && cell.x <= extent.maxX
  && cell.z >= extent.minZ && cell.z <= extent.maxZ;
const inside3d = (cell, extent) => inside2d(cell, extent)
  && cell.y >= extent.minY && cell.y <= extent.maxY;
const FACE = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function faceComponents(cells) {
  const byKey = new Map(cells.map((cell) => [cellKey(cell), cell]));
  const unvisited = new Set(byKey.keys());
  const components = [];
  while (unvisited.size) {
    const seed = unvisited.values().next().value;
    unvisited.delete(seed);
    const queue = [seed];
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

const ledgerBound = readBoundJson(SOURCE_LEDGER, EXPECTED.sourceLedgerSha256);
const intakeBound = readBoundJson(INTAKE, EXPECTED.sourceIntakeSha256);
const identityBound = readBoundJson(SOURCE_IDENTITY, EXPECTED.sourceIdentityFileSha256);
const inventoryBound = readBoundJson(INVENTORY, EXPECTED.inventorySha256);
const designBound = readBoundJson(DESIGN, EXPECTED.designSha256);
const r11iBound = readBoundJson(R11I, EXPECTED.r11iManifestSha256);
const ledger = ledgerBound.value;
const intake = intakeBound.value;
const identity = identityBound.value;
const inventory = inventoryBound.value;
const design = designBound.value;
const contract = readBoundJson(CONTRACT).value;
const authorization = readBoundJson(AUTHORIZATION).value;
const relics = readBoundJson(PROTECTED_RELICS).value;
const material = readBoundJson(MATERIAL).value;
invariant(ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompletedIdentity
  && samePath(ledger.postSnapshot.root, SOURCE)
  && ledger.postSnapshot.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && identity.sha256 === EXPECTED.sourceRegionSha256,
'accepted R11I post source drifted');
invariant(inventory.inventoryPayloadSha256 === EXPECTED.inventoryPayloadSha256,
'engineering inventory payload drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('C1-HIGHWAY')
  && material.materialDecision.designPrecedent.includes('gray_concrete'),
'R11 authority/material precedent drifted');

const priorTargetKeys = new Set();
const priorBindings = [];
for (const binding of r11iBound.value.source.priorManifestBindings) {
  const bound = readBoundJson(binding.path, binding.sha256);
  priorBindings.push(binding);
  for (const pkg of bound.value.packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
for (const pkg of r11iBound.value.packages) {
  for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
}
priorBindings.push({ path: R11I, sha256: EXPECTED.r11iManifestSha256 });

const reader = new AnvilReader(absolute(path.join(SOURCE, 'region')));
const entityReader = new AnvilReader(absolute(path.join(SOURCE, 'entities')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const analysis = await analyzeIsland({
  key: 'west-hydraulic-bridge-1184-1188', start: START, end: END,
  stations: design.horizontalAlignment.stations, reader, priorTargetKeys,
});
invariant(analysis.surface.length === EXPECTED.surfaceCount
  && hashCells(analysis.surface) === EXPECTED.surfaceHash
  && analysis.headroomRecords.length === EXPECTED.headroomCutCount
  && analysis.fullHeadroom.length === EXPECTED.fullHeadroomCount
  && connectedComponents(analysis.surface).length === 1,
'selected surface/headroom geometry drifted');

const beamPlanByKey = new Map();
for (const surface of analysis.surface) {
  const cell = { x: surface.x, y: BEAM_Y, z: surface.z };
  beamPlanByKey.set(cellKey(cell), cell);
}
for (let leftIndex = 0; leftIndex < analysis.surface.length; leftIndex += 1) {
  const left = analysis.surface[leftIndex];
  for (let rightIndex = leftIndex + 1; rightIndex < analysis.surface.length; rightIndex += 1) {
    const right = analysis.surface[rightIndex];
    if (Math.abs(left.x - right.x) === 1 && Math.abs(left.z - right.z) === 1) {
      const connector = { x: right.x, y: BEAM_Y, z: left.z };
      beamPlanByKey.set(cellKey(connector), connector);
    }
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
const supportKeys = new Set(supportFramework.map(cellKey));
const supportRecords = [];
const retainedSupport = [];
for (const cell of supportFramework) {
  const sourceState = await sourceAt(cell);
  invariant(!isFluid(sourceState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState)),
  `support hazard at ${cellKey(cell)}`);
  if (isReplaceableSupport(sourceState) || GRAVITY_BLOCKS.has(blockName(sourceState))) {
    supportRecords.push({ cell, sourceState, targetState: 'minecraft:stone_bricks' });
  } else retainedSupport.push({ cell, sourceState });
}
const anchors = retainedSupport.map((record) => ({ kind: 'retained-framework-cell', ...record }));
for (const cell of supportFramework) {
  const below = { x: cell.x, y: cell.y - 1, z: cell.z };
  if (supportKeys.has(cellKey(below))) continue;
  const sourceState = await sourceAt(below);
  if (!isAir(sourceState) && !isFluid(sourceState)
    && !GRAVITY_BLOCKS.has(blockName(sourceState))
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(sourceState))) {
    anchors.push({ kind: 'durable-below-contact', cell: below, sourceState });
  }
}
const gravityProof = [];
for (const record of supportRecords.filter(({ sourceState }) => (
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
  invariant(!isAir(supportState) && !isFluid(supportState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(supportState)),
  `gravity chain lacks durable terminal at ${cellKey(record.cell)}`);
  gravityProof.push({
    cell: record.cell, sourceState: record.sourceState,
    terminalSupportCell: support, terminalSupportState: supportState,
    interveningGravityCount,
  });
}
invariant(beamPlan.length === EXPECTED.beamPlanCount
  && supportFramework.length === EXPECTED.supportFrameworkCount
  && hashCells(supportFramework) === EXPECTED.supportFrameworkHash
  && faceComponents(supportFramework).length === 1
  && supportRecords.length === EXPECTED.supportOperationCount
  && retainedSupport.length === EXPECTED.supportRetainedCount
  && anchors.length === EXPECTED.supportAnchorCount
  && gravityProof.length === EXPECTED.gravityCount,
'static support framework/anchor/gravity geometry drifted');

const orderedSupport = supportRecords.slice().sort((left, right) => (
  left.cell.y - right.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const structure = [
  ...analysis.headroomRecords.slice().sort((left, right) => (
    right.cell.y - left.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
  )),
  ...analysis.surfaceRecords.slice().sort((left, right) => (
    left.station - right.station || left.offset - right.offset
    || left.cell.x - right.cell.x || left.cell.z - right.cell.z
  )),
];
const allRecords = [...orderedSupport, ...structure];
const targetKeys = new Set();
for (const record of allRecords) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target at ${key}`);
  targetKeys.add(key);
  invariant(await sourceAt(record.cell) === record.sourceState
    && record.sourceState !== record.targetState,
  `source/noop guard drifted at ${key}`);
  invariant(!priorTargetKeys.has(key) && !isFluid(record.sourceState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(record.sourceState)),
  `prior/hazard conflict at ${key}`);
}
invariant(structure.length === EXPECTED.structureCount
  && allRecords.length === EXPECTED.targetCount
  && hashCells(allRecords.map(({ cell }) => cell)) === EXPECTED.targetHash,
'target union drifted');
const projectedTargetByKey = new Map(allRecords.map((record) => [
  cellKey(record.cell), record.targetState,
]));
for (const surface of analysis.surface) {
  const support = { x: surface.x, y: surface.y - 1, z: surface.z };
  const state = projectedTargetByKey.get(cellKey(support)) ?? await sourceAt(support);
  invariant(!isAir(state) && !isFluid(state),
    `pavement lacks projected support at ${cellKey(surface)}`);
}

const halo = uniqueCells(allRecords.flatMap(({ cell }) => {
  const cells = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      cells.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return cells;
}));
let haloFluidCount = 0;
for (const cell of halo) if (isFluid(await sourceAt(cell))) haloFluidCount += 1;
invariant(halo.length === EXPECTED.haloCount && hashCells(halo) === EXPECTED.haloHash
  && haloFluidCount === 0,
'exact operated halo/fluid isolation drifted');
const haloBounds = classManifest(halo).bounds;
const blockEntities = [];
const savedEntities = [];
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (halo.some((point) => cellKey(point) === cellKey(cell))) {
        blockEntities.push({ id: entity.id ?? null, cell });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (halo.some((cell) => x >= cell.x && x < cell.x + 1
        && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
        savedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
const relicIntersections = relics.relics.flatMap((relic) => {
  const cells = halo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ key: relic.key, cells }] : [];
});
const c01Intersections = design.interfaces.c01.flatMap((entry) => {
  const cells = halo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, cells }] : [];
});
invariant(blockEntities.length === 0 && savedEntities.length === 0
  && relicIntersections.length === 0 && c01Intersections.length === 0,
'halo reaches entity/block-entity/relic/C01');

const r11h = readBoundJson(
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json',
).value;
const r11hSurface = r11h.packages.flatMap((pkg) => parseOperations(pkg.forward))
  .filter(({ targetState }) => [
    'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
  ].includes(targetState)).map(({ cell }) => cell);
const seamEdges = analysis.surface.reduce((count, cell) => count + r11hSurface.filter(
  (other) => Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) <= 1
    && Math.abs(cell.y - other.y) <= 1,
).length, 0);
const combinedSurface = uniqueCells([...analysis.surface, ...r11hSurface]);
invariant(seamEdges === EXPECTED.seamEdgeCount
  && combinedSurface.length === EXPECTED.combinedSurfaceCount
  && connectedComponents(combinedSurface).length === 1,
'R11J/R11H seam topology drifted');

const definitions = [
  { key: 'c1-west-bridge-support-framework', role: 'bottom-up static beam/haunch support', records: orderedSupport },
  { key: 'c1-west-bridge-deck-structure', role: 'top-down headroom then pavement deck', records: structure },
];
const packages = [];
const operations = {};
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const definition of definitions) {
  const rollback = definition.records.slice().reverse().map(
    ({ cell, sourceState, targetState }) => ({ cell, sourceState: targetState, targetState: sourceState }),
  );
  const forwardBody = `${definition.records.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const rollbackBody = `${rollback.map(
    ({ cell, sourceState, targetState }) => replLine(cell, sourceState, targetState),
  ).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetCoordinateSetSha256 = hashCells(definition.records.map(({ cell }) => cell));
  const canonicalForward = `data/buildops/${BASENAME}.${definition.key}.forward.txt`;
  const canonicalRollback = `data/buildops/${BASENAME}.${definition.key}.rollback.txt`;
  const header = (direction, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${definition.key} ${direction})`,
    `# source root: ${SOURCE}`,
    `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
    `# inventory SHA-256: ${EXPECTED.inventorySha256}`,
    `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
  ].join('\n');
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalForward))),
    `${header('forward', forwardSha256)}\n${forwardBody}`,
  );
  fs.writeFileSync(
    absolute(path.join(OUT_DIR, path.basename(canonicalRollback))),
    `${header('rollback', rollbackSha256)}\n${rollbackBody}`,
  );
  packages.push({ key: definition.key, forward: canonicalForward, rollback: canonicalRollback });
  operations[definition.key] = {
    role: definition.role,
    forwardSha256, rollbackSha256,
    forwardCommandCount: definition.records.length,
    rollbackCommandCount: rollback.length,
    targetCellCount: definition.records.length,
    targetCoordinateSetSha256,
    exactInverse: true,
  };
}

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R11I_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: definitions.map(({ key }) => key),
    rollback: definitions.map(({ key }) => key).reverse(),
    rationale: 'Install the dry support framework bottom-up, including lower-before-upper gravel replacement; clear headroom top-down and place the deck. Rollback restores deck/headroom first and removes framework top-down, restoring upper-before-lower gravel onto exact durable terminals.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Resolve the station-1184..1188 hydraulic hold with a dry, full-width, face-connected constant-elevation beam/haunch framework and bounded pavement deck while leaving the water/lava field untouched.',
    stations: { start: START, end: END, count: END - START + 1 },
    treatment: 'BRIDGE_OR_RETAINED_EMBANKMENT_GEOTECH_HOLD_RESOLVED_BY_STATIC_DRY_HYDRAULIC_ISOLATION_BRIDGE',
    pavementSurface: classManifest(analysis.surface),
    fullTwoBlockHeadroom: classManifest(analysis.fullHeadroom),
    headroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
    supportFramework: {
      ...classManifest(supportFramework),
      beamY: BEAM_Y,
      beamPlan: classManifest(beamPlan),
      faceComponentCount: 1,
      operationCells: classManifest(orderedSupport.map(({ cell }) => cell)),
      retainedCells: classManifest(retainedSupport.map(({ cell }) => cell)),
      durableAnchorCount: anchors.length,
      durableAnchors: anchors,
    },
    gravityDependencies: classManifest(gravityProof.map(({ cell }) => cell)),
    gravityRollbackSupportProof: gravityProof,
    interactionHalo: classManifest(halo),
    retainedGenericHydraulicField: {
      genericReviewCellCount: inventory.geometry.genericInteractionHalo.cellCount,
      sourceFluidCount: inventory.hazards.haloFluidCount,
      sourceFluidCoordinateSetSha256: inventory.hazards.haloFluidCoordinateSetSha256,
      operatedHaloFluidCount: haloFluidCount,
      minimumVerticalIsolationBlocks: 23,
      preservation: 'EXACT_SOURCE_FLUID_FIELD_OUTSIDE_OPERATED_HALO_NO_FLUID_OPERATION_AUTHORIZED',
    },
    acceptedR11HSeam: {
      r11hSurfaceCellCount: r11hSurface.length,
      r11jSurfaceCellCount: analysis.surface.length,
      seamEdgeCount: seamEdges,
      combinedSurfaceCellCount: combinedSurface.length,
      combinedSurfaceComponentCount: 1,
      maximumStep: 1,
      combinedCoordinateSetSha256: hashCells(combinedSurface),
    },
    westUnbuiltInterface: {
      stations: { start: 1142, end: 1183 },
      disposition: 'PRESERVED_UNTOUCHED_ENTITY_INTERFACE_NOT_CLAIMED_AS_ACCEPTED_SURFACE',
    },
    routeCommissioned: false,
    hydraulicCapacityCommissioned: false,
  },
  source: {
    snapshotRoot: SOURCE,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    sourceIdentityPath: SOURCE_IDENTITY,
    sourceIdentityFileSha256: EXPECTED.sourceIdentityFileSha256,
    intakeAuditPath: INTAKE,
    intakeAuditSha256: EXPECTED.sourceIntakeSha256,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256: EXPECTED.sourceCompletedIdentity,
    inventoryPath: INVENTORY,
    inventorySha256: EXPECTED.inventorySha256,
    inventoryPayloadSha256: EXPECTED.inventoryPayloadSha256,
    c1DesignPath: DESIGN,
    c1DesignSha256: EXPECTED.designSha256,
    priorManifestBindings: priorBindings,
  },
  target: {
    operatedUnion: classManifest(allRecords.map(({ cell }) => cell)),
    desiredStateCensus: census(allRecords, 'targetState'),
    sourceStateCensus: census(allRecords, 'sourceState'),
    interactionHalo: classManifest(halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    ...operations,
    ordering: 'Support executes bottom-up before deck; deck rollback precedes exact top-down support rollback.',
  },
  isolation: {
    sourceHazardCount: 0,
    operatedHaloFluidCount: haloFluidCount,
    savedEntityConflictCount: savedEntities.length,
    blockEntityConflictCount: blockEntities.length,
    priorReleaseIntersectionCount: 0,
    protectedRelicIntersectionCount: relicIntersections.length,
    c01IntersectionCount: c01Intersections.length,
    railUtilityReservationIntersectionCount: Object.values(
      analysis.operatedInterfaceIntersections,
    ).reduce((sum, cells) => sum + cells.length, 0),
    retainedGenericFluidMutationCount: 0,
  },
  compileGuards: {
    exactAcceptedR11IPostSource: true,
    exactSourceGuardMatchCount: allRecords.length,
    exactInverseReadyCount: allRecords.length,
    surfaceCellCount: analysis.surface.length,
    stableSurfaceCellCount: analysis.surface.length,
    fullHeadroomCellCount: analysis.fullHeadroom.length,
    supportFrameworkFaceComponentCount: 1,
    durableSupportAnchorCount: anchors.length,
    durableGravityTerminalCount: gravityProof.length,
    combinedR11HSurfaceComponentCount: 1,
    combinedR11HMaximumStep: 1,
  },
  standingAuthorization: r11iBound.value.standingAuthorization,
  hardSafetyKernelNext: r11iBound.value.hardSafetyKernelNext,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity, manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: `data/buildops/${BASENAME}.release-manifest.json`,
  manifestIdentity,
  targetCount: allRecords.length,
  supportOperationCount: orderedSupport.length,
  structureOperationCount: structure.length,
  surfaceCount: analysis.surface.length,
  headroomCount: analysis.fullHeadroom.length,
  supportFrameworkCount: supportFramework.length,
  supportAnchorCount: anchors.length,
  gravityCount: gravityProof.length,
  haloCount: halo.length,
  haloFluidCount,
  seamEdgeCount: seamEdges,
  combinedSurfaceCount: combinedSurface.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
