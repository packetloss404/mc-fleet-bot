#!/usr/bin/env node
/** Compile CZ-R11I: the exact dry retained-cut closure at C1 stations 1207..1212. */

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
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:00:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11i-c1-retained-cut-connectivity-closure-1207-1212';
const RELEASE_ID = 'CZ-R11I-C1-RETAINED-CUT-CONNECTIVITY-CLOSURE-1207-1212';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const SOURCE = 'data/worldsnap-r11h-retry-v2-post-20260822T032627Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/evidence-ledger.json';
const INTAKE =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/post-complete-save-intake.json';
const SOURCE_IDENTITY =
  'data/world-review/combined-zones-r11h-retry-v2-live-20260822T032627Z/post-snapshot-identity.json';
const INVENTORY =
  'data/world-review/combined-zones-r11i-neighbor-closures-inventory-20260822T034500Z.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const PROTECTED_RELICS =
  'docs/masterplans/05-combined-zones/phase1-protected-relic-clearance.json';
const MATERIAL =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const R11E =
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json';
const R11H =
  'data/buildops/combined-zones-r11h-retry-v2-c1-hydraulic-isolation-bridge-1189-1206.release-manifest.json';
const START = 1207;
const END = 1212;
const EXPECTED = Object.freeze({
  sourceLedgerSha256:
    'f5c1e52b479bba19329e5b39d253d4c43f5fbff6344effefc92a43cfb89b9e85',
  sourceCompletedIdentity:
    '04f9c6e7ae2b7734da2cfbf85d5f37cd3ba15fea257ace636f601c5acdbe815e',
  sourceCompleteSaveSha256:
    'a28e318f5df40928eac351a16d7776c2ece824c33722dbf259bc0d15a6f4e185',
  sourceIntakeSha256:
    '03644b8f94fbafe87fefca18cd3ecf1ffb24461f562c0679bfeb63cda72d6852',
  sourceIdentityFileSha256:
    'ea15082a09e59d9dfe5665287521578487672e8c6ffd476361e10b19d2e9ba1c',
  sourceRegionSha256:
    'e55a9497b238c52ee5d4d6e86e844e5be0288640c468a94d8af52ea7380f9cae',
  designSha256:
    '7776e243dc24b03fa7903ecb93ec8f05e6e0cbd81aa3749e2fb52435b7dc2442',
  inventorySha256:
    '68de4dd6bbe6f9a2730796c46916fc91caab966ec17f8b7bd8c62dc1831c21e7',
  inventoryPayloadSha256:
    'aecfa5970fb72ad281b289a1f9008230ca7b1fe91a41bf4867a9b40a46bb750d',
  surfaceCount: 106,
  surfaceHash: 'd21c6accba2ef215709891c7feeb289c69523da7456c556516f701491d73596d',
  gravityCount: 15,
  separateDependencyCount: 2,
  headroomCutCount: 209,
  targetCount: 330,
  finalTargetCount: 317,
  targetHash: 'd04010044b24b7de1b7fbf7541a9e399052ba14fa83f34ae4424ba7ed093dab0',
  haloCount: 1531,
  haloHash: 'c5a6f88fae844734b84317d9a4e0f0309d66734c1fcb07743f5cc029b6948121',
  r11hSurfaceCount: 355,
  r11eEastSurfaceCount: 65,
  combinedSurfaceCount: 526,
  westSeamEdgeCount: 46,
  eastSeamEdgeCount: 60,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11I compiler rejected: ${message}`);
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
const surfaceState = (state) => [
  'minecraft:gray_concrete', 'minecraft:yellow_concrete', 'minecraft:smooth_stone',
].includes(state);

function parseOperations(filename) {
  const records = [];
  for (const raw of fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/)) {
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    invariant(fields[0] === 'REPL' && fields.length === 9,
      `${filename} contains malformed operation`);
    records.push({
      cell: { x: Number(fields[1]), y: Number(fields[2]), z: Number(fields[3]) },
      sourceState: fields[7],
      targetState: fields[8],
    });
  }
  return records;
}

const ledgerBound = readBoundJson(SOURCE_LEDGER, EXPECTED.sourceLedgerSha256);
const intakeBound = readBoundJson(INTAKE, EXPECTED.sourceIntakeSha256);
const identityBound = readBoundJson(SOURCE_IDENTITY, EXPECTED.sourceIdentityFileSha256);
const inventoryBound = readBoundJson(INVENTORY, EXPECTED.inventorySha256);
const designBound = readBoundJson(DESIGN, EXPECTED.designSha256);
const r11eBound = readBoundJson(R11E);
const r11hBound = readBoundJson(R11H);
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
  && samePath(ledger.postSnapshot.root, SOURCE), 'accepted R11H ledger drifted');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && samePath(intake.input.suppliedWorldRoot, SOURCE)
  && identity.sha256 === EXPECTED.sourceRegionSha256,
'accepted immutable post snapshot drifted');
invariant(inventory.inventoryPayloadSha256 === EXPECTED.inventoryPayloadSha256,
'candidate inventory payload drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('C1-HIGHWAY')
  && material.materialDecision.designPrecedent.includes('gray_concrete'),
'R11 authority/material precedent drifted');

const priorTargetKeys = new Set();
const priorBindings = [];
for (const binding of inventory.priorBindings) {
  const bound = readBoundJson(binding.path, binding.sha256);
  priorBindings.push(binding);
  for (const pkg of bound.value.packages ?? []) {
    for (const record of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(record.cell));
  }
}
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
  key: 'retained-cut-1207-1212', start: START, end: END,
  stations: design.horizontalAlignment.stations, reader, priorTargetKeys,
});
const selectedInventory = inventory.candidates.find(({ key }) => (
  key === 'east-retained-cut-gap'
));
const heldWest = inventory.candidates.find(({ key }) => key === 'west-bridge-gap');
invariant(selectedInventory.genericSafe === true
  && heldWest.genericSafe === false && heldWest.fluidCount === 38
  && heldWest.sourceHazardCount === 14,
'safe east/held west partition drifted');
invariant(analysis.safe && analysis.surface.length === EXPECTED.surfaceCount
  && hashCells(analysis.surface) === EXPECTED.surfaceHash
  && analysis.gravityRecords.length === EXPECTED.gravityCount
  && analysis.foundationRecords.length === 0
  && analysis.headroomRecords.length === EXPECTED.headroomCutCount
  && analysis.allRecords.length === EXPECTED.targetCount
  && hashCells(analysis.operated) === EXPECTED.targetHash
  && analysis.halo.length === EXPECTED.haloCount
  && hashCells(analysis.halo) === EXPECTED.haloHash
  && analysis.sourceHazards.length === 0 && analysis.haloHazards.length === 0
  && analysis.priorIntersections.length === 0
  && Object.values(analysis.operatedInterfaceIntersections)
    .every((cells) => cells.length === 0),
'exact dry retained-cut geometry or exclusion gates drifted');

const structureTargetKeys = new Set([
  ...analysis.headroomRecords, ...analysis.surfaceRecords,
].map(({ cell }) => cellKey(cell)));
const dependencies = analysis.gravityRecords.filter(({ cell }) => (
  !structureTargetKeys.has(cellKey(cell))
)).slice().sort((left, right) => (
  left.cell.y - right.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
));
const structure = [
  ...await Promise.all(analysis.headroomRecords.map(async (record) => ({
    ...record, sourceState: await sourceAt(record.cell),
  }))).then((records) => records.sort((left, right) => (
    right.cell.y - left.cell.y || left.cell.x - right.cell.x || left.cell.z - right.cell.z
  ))),
  ...await Promise.all(analysis.surfaceRecords.map(async (record) => ({
    ...record, sourceState: await sourceAt(record.cell),
  }))).then((records) => records.sort((left, right) => (
    left.station - right.station || left.offset - right.offset
    || left.cell.x - right.cell.x || left.cell.z - right.cell.z
  ))),
];
const allRecords = [...dependencies, ...structure];
const targetKeys = new Set();
for (const record of allRecords) {
  const key = cellKey(record.cell);
  invariant(!targetKeys.has(key), `duplicate target ${key}`);
  targetKeys.add(key);
  invariant(record.sourceState !== record.targetState
    && await sourceAt(record.cell) === record.sourceState,
  `strict source guard drifted at ${key}`);
  invariant(!priorTargetKeys.has(key) && !isFluid(record.sourceState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(record.sourceState)),
  `protected source/ownership conflict at ${key}`);
}
invariant(analysis.allRecords.length === EXPECTED.targetCount
  && dependencies.length === EXPECTED.separateDependencyCount
  && dependencies.length + structure.length === EXPECTED.finalTargetCount
  && hashCells(allRecords.map(({ cell }) => cell)) === EXPECTED.targetHash,
`ordered target union drifted (${analysis.allRecords.length}/${dependencies.length}/${structure.length}/${hashCells(allRecords.map(({ cell }) => cell))})`);
for (const proof of analysis.gravityRollbackSupportProof) {
  invariant(proof.interveningGravelCellCount >= 0
    && !isAir(proof.terminalSupportState) && !isFluid(proof.terminalSupportState)
    && !FORBIDDEN_SOURCE_BLOCKS.has(blockName(proof.terminalSupportState)),
  `non-durable gravel inverse at ${cellKey(proof.cell)}`);
}

const operatedKeys = new Set(allRecords.map(({ cell }) => cellKey(cell)));
const haloFluid = [];
const haloBlockEntities = [];
const haloSavedEntities = [];
for (const cell of analysis.halo) if (isFluid(await sourceAt(cell))) haloFluid.push(cell);
const haloBounds = classManifest(analysis.halo).bounds;
for (let cx = Math.floor(haloBounds.minX / 16); cx <= Math.floor(haloBounds.maxX / 16); cx += 1) {
  for (let cz = Math.floor(haloBounds.minZ / 16); cz <= Math.floor(haloBounds.maxZ / 16); cz += 1) {
    const chunk = await reader.chunk(cx, cz);
    for (const entity of chunk?.block_entities ?? chunk?.blockEntities ?? []) {
      const cell = { x: Number(entity.x), y: Number(entity.y), z: Number(entity.z) };
      if (analysis.halo.some((point) => cellKey(point) === cellKey(cell))) {
        haloBlockEntities.push({ id: entity.id ?? null, cell });
      }
    }
    const entityChunk = await entityReader.chunk(cx, cz);
    for (const entity of entityChunk?.Entities ?? []) {
      if (!Array.isArray(entity.Pos) || entity.Pos.length < 3) continue;
      const [x, y, z] = entity.Pos.map(Number);
      if (analysis.halo.some((cell) => x >= cell.x && x < cell.x + 1
        && y >= cell.y && y < cell.y + 1 && z >= cell.z && z < cell.z + 1)) {
        haloSavedEntities.push({ id: entity.id ?? null, position: [x, y, z] });
      }
    }
  }
}
const relicIntersections = relics.relics.flatMap((relic) => {
  const cells = analysis.halo.filter((cell) => inside3d(cell, relic.declaredInclusiveBounds));
  return cells.length ? [{ key: relic.key, cells }] : [];
});
const c01Intersections = design.interfaces.c01.flatMap((entry) => {
  const cells = analysis.halo.filter((cell) => inside2d(cell, entry.extent));
  return cells.length ? [{ feature: entry.feature, cells }] : [];
});
invariant(haloFluid.length === 0 && haloBlockEntities.length === 0
  && haloSavedEntities.length === 0 && relicIntersections.length === 0
  && c01Intersections.length === 0,
'halo reaches fluid/entity/block-entity/relic/C01');

const surfaceFrom = (manifest, packageFilter = () => true) => manifest.packages
  .filter(packageFilter).flatMap((pkg) => parseOperations(pkg.forward))
  .filter(({ targetState }) => surfaceState(targetState)).map(({ cell }) => cell);
const r11hSurface = surfaceFrom(r11hBound.value);
const r11eEastSurface = surfaceFrom(
  r11eBound.value,
  ({ key }) => key === 'c1-island-1213-1215-pavement',
);
const seamEdges = (left, right) => left.reduce((count, cell) => count + right.filter(
  (other) => Math.max(Math.abs(cell.x - other.x), Math.abs(cell.z - other.z)) <= 1
    && Math.abs(cell.y - other.y) <= 1,
).length, 0);
const westSeamEdges = seamEdges(analysis.surface, r11hSurface);
const eastSeamEdges = seamEdges(analysis.surface, r11eEastSurface);
const combinedSurface = uniqueCells([
  ...r11hSurface, ...analysis.surface, ...r11eEastSurface,
]);
invariant(r11hSurface.length === EXPECTED.r11hSurfaceCount
  && r11eEastSurface.length === EXPECTED.r11eEastSurfaceCount
  && combinedSurface.length === EXPECTED.combinedSurfaceCount
  && connectedComponents(combinedSurface).length === 1
  && westSeamEdges === EXPECTED.westSeamEdgeCount
  && eastSeamEdges === EXPECTED.eastSeamEdgeCount,
'accepted-island seam/connectivity drifted');

const definitions = [
  { key: 'c1-retained-cut-1207-1212-dependencies', role: 'durable gravel stabilization', records: dependencies },
  { key: 'c1-retained-cut-1207-1212-structure', role: 'top-down headroom then pavement', records: structure },
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
    forwardSha256,
    rollbackSha256,
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
  status: 'COMPILED_FROM_ACCEPTED_R11H_RETRY_V2_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: definitions.map(({ key }) => key),
    rollback: definitions.map(({ key }) => key).reverse(),
    rationale: 'Replace the complete 15-cell gravel dependency closure bottom-up, clear headroom top-down, place pavement in station/offset order, then reverse the exact global sequence for rollback.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Close the dry retained-cut gap between accepted R11H stations 1189..1206 and accepted R11E stations 1213..1215 as one connected, supported, reversible pavement segment.',
    stations: { start: START, end: END, count: END - START + 1 },
    treatment: 'RETAINED_CUT_CONCEPT_GEOTECH_HOLD_RESOLVED_BY_EXACT_STATIC_CUT_AND_PAVEMENT',
    pavementSurface: classManifest(analysis.surface),
    fullTwoBlockHeadroom: classManifest(analysis.fullHeadroom),
    headroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
    gravityDependencies: classManifest(dependencies.map(({ cell }) => cell)),
    gravityRollbackSupportProof: analysis.gravityRollbackSupportProof,
    interactionHalo: classManifest(analysis.halo),
    retainedSourceFluidCount: 0,
    combinedAcceptedSurface: {
      cellCount: combinedSurface.length,
      componentCount: 1,
      maximumStep: 1,
      westR11HSurfaceCount: r11hSurface.length,
      eastR11ESurfaceCount: r11eEastSurface.length,
      westSeamEdgeCount: westSeamEdges,
      eastSeamEdgeCount: eastSeamEdges,
      coordinateSetSha256: hashCells(combinedSurface),
    },
    heldWestHydraulicGap: {
      stations: { start: 1184, end: 1188 },
      sourceHazardCount: heldWest.sourceHazardCount,
      retainedFluidCount: heldWest.fluidCount,
      disposition: 'PRESERVED_UNTOUCHED_LOCAL_HYDRAULIC_DESIGN_SCOPE',
    },
    routeCommissioned: false,
    utilityRailDrainageCommissioned: false,
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
    interactionHalo: classManifest(analysis.halo),
    packageTargetsDisjoint: true,
  },
  operations: {
    ...operations,
    ordering: 'Dependencies execute bottom-up before structure; structure rollback restores every exact terrain/headroom state before dependency rollback restores gravel top-down.',
  },
  isolation: {
    sourceHazardCount: 0,
    haloHazardCount: 0,
    haloFluidCount: 0,
    savedEntityConflictCount: haloSavedEntities.length,
    blockEntityConflictCount: haloBlockEntities.length,
    priorReleaseIntersectionCount: analysis.priorIntersections.length,
    operatedInterfaceIntersectionCount: Object.values(
      analysis.operatedInterfaceIntersections,
    ).reduce((sum, cells) => sum + cells.length, 0),
    protectedRelicIntersectionCount: relicIntersections.length,
    c01IntersectionCount: c01Intersections.length,
    westHydraulicGapMutationCount: 0,
  },
  compileGuards: {
    exactAcceptedR11HRetryV2PostSource: true,
    exactSourceGuardMatchCount: allRecords.length,
    exactInverseReadyCount: allRecords.length,
    stableSurfaceCellCount: analysis.surface.length,
    fullHeadroomCellCount: analysis.fullHeadroom.length,
    durableGravitySourceCellCount: EXPECTED.gravityCount,
    separateOverburdenStabilizationCount: dependencies.length,
    connectedCombinedSurfaceComponentCount: 1,
    maximumCombinedSurfaceStep: 1,
    westSeamEdgeCount: westSeamEdges,
    eastSeamEdgeCount: eastSeamEdges,
  },
  standingAuthorization: r11hBound.value.standingAuthorization,
  hardSafetyKernelNext: r11hBound.value.hardSafetyKernelNext,
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    executionAuthorizedByThisManifest: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(manifestWithoutIdentity));
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify({
  ...manifestWithoutIdentity,
  manifestIdentity,
}, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifestWithoutIdentity.status,
  manifest: `data/buildops/${BASENAME}.release-manifest.json`,
  manifestIdentity,
  targetCount: allRecords.length,
  surfaceCount: analysis.surface.length,
  dependencyCount: dependencies.length,
  headroomCutCount: analysis.headroomRecords.length,
  haloCount: analysis.halo.length,
  combinedSurfaceCount: combinedSurface.length,
  westSeamEdgeCount: westSeamEdges,
  eastSeamEdgeCount: eastSeamEdges,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
