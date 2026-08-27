#!/usr/bin/env node
/** Compile CZ-R11K: two exact interaction-disjoint west C1 at-grade scopes. */

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
  census,
  classManifest,
  connectedComponents,
  isAir,
  isFluid,
} from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T04:55:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11k-c1-west-disjoint-at-grade-batch-1142-1145-1172';
const RELEASE_ID = 'CZ-R11K-C1-WEST-DISJOINT-AT-GRADE-BATCH-1142-1145-1172';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const SOURCE = 'data/worldsnap-r11j-post-20260822T041217Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/evidence-ledger.json';
const INTAKE_AUDIT =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/post-complete-save-intake.json';
const SOURCE_IDENTITY =
  'data/world-review/combined-zones-r11j-live-20260822T041217Z/post-snapshot-identity.json';
const INVENTORY =
  'data/world-review/combined-zones-r11k-west-at-grade-closure-inventory-20260822T044500Z.json';
const DESIGN = 'docs/masterplans/05-combined-zones/phase1-c1-civil-design.json';
const RELEASE_CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const MATERIAL =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const MASTERPLAN = 'docs/masterplans/05-combined-zones/MASTERPLAN.md';
const CURRENT_STATE = 'docs/masterplans/05-combined-zones/CURRENT-STATE.md';
const R11J_MANIFEST =
  'data/buildops/combined-zones-r11j-c1-west-hydraulic-isolation-bridge-1184-1188.release-manifest.json';
const SCOPES = [
  { key: 'west-at-grade-1142-1145', start: 1142, end: 1145 },
  { key: 'west-at-grade-1172', start: 1172, end: 1172 },
];
const EXPECTED = Object.freeze({
  sourceLedgerSha256:
    '59128e0d2473bc1dc4a50014072fb6411c4eef4801bb0ca6617ea2fe122b91b0',
  sourceCompletedIdentity:
    '55a1d48d0573daeee857ba163a97ae24b6e9d772cd4876686ec844c25bb8e5ac',
  sourceCompleteSaveSha256:
    'f9e383308efde36f7eac1900942edeb0349fc5c98436f50b0427464e961cd4d6',
  sourceRegionSha256:
    'dc16ef0c53b2b0b9d5a46e0cc68a40fb53dc32a23ef16f170a01fbdff5bcd6ef',
  intakeSha256:
    'b0cc3343fc9febfc353428314c994588eedc1338fafdf5601cd8b16cbcf1b5df',
  sourceIdentitySha256:
    '6995019dde6ce451afafeb5e41a772f07c20b68b470e6da576375f07b9878c98',
  inventorySha256:
    '1902f7deb1f29c0140adef024275c21ba4babc660afe8ca56a76367e5b3564e7',
  inventoryPayloadSha256:
    '70824c8a344f73ef4072f5e6057d4c14adedc614524431fc503ed0303c740b2d',
  r11jManifestSha256:
    '176b16fa7c20d28aa79353dac70d436237032311b7dc0917968519a89b80ccbb',
  targetCount: 336,
  targetHash: 'fa399c790649c52c8d7b7051be63a72f50bbe662184023a596751e60e3683005',
  surfaceCount: 111,
  foundationCount: 105,
  headroomCutCount: 71,
  fullHeadroomCount: 222,
  leafTransitionCount: 49,
  haloCount: 1883,
  haloHash: '5b548cad659c5292ff23743a8110f31a9b93d8881624f4937f6fe990e6cf73a8',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11K compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
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
const boundBytes = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: filename, sha256: sha256(bytes), bytes };
};

const ledgerBound = boundBytes(SOURCE_LEDGER);
const ledger = JSON.parse(ledgerBound.bytes);
const intakeBound = boundBytes(INTAKE_AUDIT);
const intake = JSON.parse(intakeBound.bytes);
const identityBound = boundBytes(SOURCE_IDENTITY);
const identity = JSON.parse(identityBound.bytes);
const inventoryBound = boundBytes(INVENTORY);
const inventory = JSON.parse(inventoryBound.bytes);
const designBound = boundBytes(DESIGN);
const design = JSON.parse(designBound.bytes);
const contractBound = boundBytes(RELEASE_CONTRACT);
const contract = JSON.parse(contractBound.bytes);
const authorizationBound = boundBytes(AUTHORIZATION);
const authorization = JSON.parse(authorizationBound.bytes);
const materialBound = boundBytes(MATERIAL);
const material = JSON.parse(materialBound.bytes);
const masterplanBound = boundBytes(MASTERPLAN);
const currentStateBound = boundBytes(CURRENT_STATE);
const r11jBound = boundBytes(R11J_MANIFEST);
const r11j = JSON.parse(r11jBound.bytes);

invariant(ledgerBound.sha256 === EXPECTED.sourceLedgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256 === EXPECTED.sourceCompletedIdentity
  && samePath(ledger.postSnapshot.root, SOURCE),
'accepted R11J terminal ledger drifted');
invariant(intakeBound.sha256 === EXPECTED.intakeSha256
  && identityBound.sha256 === EXPECTED.sourceIdentitySha256
  && intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && identity.sha256 === EXPECTED.sourceRegionSha256,
'immutable R11J post source drifted');
invariant(inventoryBound.sha256 === EXPECTED.inventorySha256
  && inventory.inventoryPayloadSha256 === EXPECTED.inventoryPayloadSha256
  && inventory.status === 'SOURCE_PROVEN_DISJOINT_BATCH_SELECTED'
  && inventory.scope.recommendedBatch.exactInteractionDisjoint === true
  && inventory.scope.recommendedBatch.operatedUnion.cellCount === EXPECTED.targetCount,
'source-bound R11K inventory drifted');
invariant(r11jBound.sha256 === EXPECTED.r11jManifestSha256
  && r11j.manifestIdentity
    === 'a7b6a01b0bc080d9ddc77e10c92c878cd68799188788e372df6b575e0fce6cd0',
'accepted R11J manifest drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('C1-HIGHWAY')
  && material.materialDecision.designPrecedent.includes('gray_concrete'),
'R11 authority/material precedent drifted');

const priorTargetKeys = new Set();
for (const binding of inventory.priorBindings) {
  const bytes = fs.readFileSync(absolute(binding.path));
  invariant(sha256(bytes) === binding.sha256, `${binding.path} drifted`);
  for (const pkg of JSON.parse(bytes).packages ?? []) {
    for (const { cell } of parseOperations(pkg.forward)) priorTargetKeys.add(cellKey(cell));
  }
}
const reader = new AnvilReader(absolute(path.join(SOURCE, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const savedEntityPositions = inventory.scope.savedEntities.map(({ position }) => position);
const analyses = [];
for (const definition of SCOPES) {
  const analysis = await analyzeIsland({
    ...definition,
    stations: design.horizontalAlignment.stations,
    reader,
    priorTargetKeys,
    savedEntityPositions,
  });
  const reservationConflictCount = Object.values(analysis.reservationConflicts)
    .reduce((sum, cells) => sum + cells.length, 0);
  invariant(analysis.safe && analysis.savedEntityConflicts.length === 0
    && analysis.gradeShadows.length === 0 && reservationConflictCount === 0
    && analysis.sourceHazards.length === 0 && analysis.haloHazards.length === 0
    && analysis.priorIntersections.length === 0,
  `${definition.key} safety closure drifted`);
  analyses.push({ definition, analysis });
}

const targetSets = analyses.map(({ analysis }) => new Set(analysis.operated.map(cellKey)));
const haloSets = analyses.map(({ analysis }) => new Set(analysis.halo.map(cellKey)));
const intersectionCount = (left, right) => [...left].filter((key) => right.has(key)).length;
invariant(intersectionCount(targetSets[0], targetSets[1]) === 0
  && intersectionCount(haloSets[0], haloSets[1]) === 0
  && intersectionCount(targetSets[0], haloSets[1]) === 0
  && intersectionCount(targetSets[1], haloSets[0]) === 0,
'two selected scopes are not interaction-disjoint');

const packages = [];
const operations = {};
const allRecords = [];
const targetKeys = new Set();
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const { definition, analysis } of analyses) {
  const records = [...analysis.dependencyRecords, ...analysis.pavementRecords];
  invariant(records.length > 0 && records.length === analysis.operated.length,
    `${definition.key} record union drifted`);
  for (const record of records) {
    invariant(await sourceAt(record.cell) === record.sourceState,
      `${definition.key} source guard drifted at ${cellKey(record.cell)}`);
    invariant(!targetKeys.has(cellKey(record.cell)),
      `cross-package overlap at ${cellKey(record.cell)}`);
    targetKeys.add(cellKey(record.cell));
    allRecords.push({ ...record, scopeKey: definition.key });
  }
  const rollback = records.slice().reverse().map(({ cell, sourceState, targetState }) => ({
    cell, sourceState: targetState, targetState: sourceState,
  }));
  const forwardBody = `${records.map(({ cell, sourceState, targetState }) => (
    replLine(cell, sourceState, targetState)
  )).join('\n')}\n`;
  const rollbackBody = `${rollback.map(({ cell, sourceState, targetState }) => (
    replLine(cell, sourceState, targetState)
  )).join('\n')}\n`;
  const forwardSha256 = sha256(forwardBody);
  const rollbackSha256 = sha256(rollbackBody);
  const targetCoordinateSetSha256 = hashCells(records.map(({ cell }) => cell));
  const canonicalForward = `data/buildops/${BASENAME}.c1-${definition.key}.forward.txt`;
  const canonicalRollback = `data/buildops/${BASENAME}.c1-${definition.key}.rollback.txt`;
  const actualForward = path.join(OUT_DIR, path.basename(canonicalForward));
  const actualRollback = path.join(OUT_DIR, path.basename(canonicalRollback));
  const header = (direction, operationSha256) => [
    `# GENERATED FILE - ${RELEASE_ID} (${definition.key} ${direction})`,
    `# source root: ${SOURCE}`,
    `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
    `# inventory SHA-256: ${EXPECTED.inventorySha256}`,
    `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
    `# operation SHA-256: ${operationSha256}`,
    `# ordering: leaf stabilization before owned-log removal; exact global reverse rollback`,
    '',
  ].join('\n');
  fs.writeFileSync(absolute(actualForward), `${header('forward', forwardSha256)}${forwardBody}`);
  fs.writeFileSync(absolute(actualRollback), `${header('rollback', rollbackSha256)}${rollbackBody}`);
  const packageKey = `c1-${definition.key}`;
  packages.push({ key: packageKey, forward: canonicalForward, rollback: canonicalRollback });
  operations[packageKey] = {
    role: definition.start === 1142
      ? 'leaf-stabilized foundation/headroom/pavement island'
      : 'dry source-solid headroom/pavement singleton',
    forwardSha256,
    rollbackSha256,
    forwardCommandCount: records.length,
    rollbackCommandCount: rollback.length,
    targetCellCount: records.length,
    targetCoordinateSetSha256,
    exactInverse: true,
  };
}

const targetUnion = uniqueCells(allRecords.map(({ cell }) => cell));
const haloUnion = uniqueCells(analyses.flatMap(({ analysis }) => analysis.halo));
const surfaces = analyses.flatMap(({ analysis }) => analysis.surface);
const fullHeadroom = uniqueCells(analyses.flatMap(({ analysis }) => analysis.fullHeadroom));
const dependencies = analyses.flatMap(({ analysis }) => analysis.dependencyRecords);
const foundations = analyses.flatMap(({ analysis }) => analysis.foundationRecords);
const headroomCuts = analyses.flatMap(({ analysis }) => analysis.headroomRecords);
invariant(targetUnion.length === EXPECTED.targetCount
  && hashCells(targetUnion) === EXPECTED.targetHash
  && surfaces.length === EXPECTED.surfaceCount
  && foundations.length === EXPECTED.foundationCount
  && headroomCuts.length === EXPECTED.headroomCutCount
  && fullHeadroom.length === EXPECTED.fullHeadroomCount
  && dependencies.length === EXPECTED.leafTransitionCount
  && haloUnion.length === EXPECTED.haloCount
  && hashCells(haloUnion) === EXPECTED.haloHash,
'combined exact geometry/count identity drifted');

const projectedByKey = new Map(allRecords.map((record) => [
  cellKey(record.cell), record.targetState,
]));
const projectedAt = async (cell) => projectedByKey.get(cellKey(cell)) ?? await sourceAt(cell);
let stableSurfaceCount = 0;
for (const cell of surfaces) {
  const below = await projectedAt({ x: cell.x, y: cell.y - 1, z: cell.z });
  if (!isAir(below) && !isFluid(below)) stableSurfaceCount += 1;
}
let fullHeadroomAirCount = 0;
for (const cell of fullHeadroom) if (isAir(await projectedAt(cell))) {
  fullHeadroomAirCount += 1;
}
invariant(stableSurfaceCount === surfaces.length
  && fullHeadroomAirCount === fullHeadroom.length
  && analyses.every(({ analysis }) => connectedComponents(analysis.surface).length === 1),
'projected support/headroom/surface topology failed');

const manifestPath = `data/buildops/${BASENAME}.release-manifest.json`;
const actualManifestPath = path.join(OUT_DIR, path.basename(manifestPath));
const withoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  transactionId: BASENAME,
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  status: 'COMPILED_FROM_ACCEPTED_R11J_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  source: {
    snapshotRoot: SOURCE,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    sourceIdentityPath: SOURCE_IDENTITY,
    sourceIdentityFileSha256: identityBound.sha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeAuditSha256: intakeBound.sha256,
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: ledgerBound.sha256,
    sourceCompletedReleaseIdentitySha256: EXPECTED.sourceCompletedIdentity,
    inventoryPath: INVENTORY,
    inventorySha256: inventoryBound.sha256,
    inventoryPayloadSha256: inventory.inventoryPayloadSha256,
    c1DesignPath: DESIGN,
    c1DesignSha256: designBound.sha256,
    priorManifestBindings: inventory.priorBindings,
    immediatePriorManifest: { path: R11J_MANIFEST, sha256: r11jBound.sha256 },
  },
  controlBindings: {
    releaseContract: { path: RELEASE_CONTRACT, sha256: contractBound.sha256 },
    standingAuthorization: { path: AUTHORIZATION, sha256: authorizationBound.sha256 },
    materialPrecedent: { path: MATERIAL, sha256: materialBound.sha256 },
    masterplan: { path: MASTERPLAN, sha256: masterplanBound.sha256 },
    currentState: { path: CURRENT_STATE, sha256: currentStateBound.sha256 },
  },
  standingAuthorization: r11j.standingAuthorization,
  hardSafetyKernelNext: r11j.hardSafetyKernelNext,
  scopeIds: ['C1-HIGHWAY', 'C1-STATIONS-1142-1145', 'C1-STATION-1172'],
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Build the largest source-proven clean west at-grade run and the independently interaction-disjoint station-1172 singleton in one amortized exact transaction.',
    treatment: 'AT_GRADE_COORDINATION_PASS',
    includedScopes: analyses.map(({ definition, analysis }) => ({
      key: definition.key,
      stations: { start: definition.start, end: definition.end,
        count: definition.end - definition.start + 1 },
      pavementSurface: classManifest(analysis.surface),
      exactFoundationFill: classManifest(analysis.foundationRecords.map(({ cell }) => cell)),
      exactHeadroomCuts: classManifest(analysis.headroomRecords.map(({ cell }) => cell)),
      fullTwoBlockHeadroom: classManifest(analysis.fullHeadroom),
      leafStabilizationTransitions: classManifest(
        analysis.leafRecords.map(({ cell }) => cell),
      ),
      operatedUnion: classManifest(analysis.operated),
      interactionHalo: classManifest(analysis.halo),
      sourceHazardCount: analysis.sourceHazards.length,
      haloHazardCount: analysis.haloHazards.length,
      savedEntityConflictCount: analysis.savedEntityConflicts.length,
      priorIntersectionCount: analysis.priorIntersections.length,
      routeCommissioned: false,
    })),
    combinedPavementSurface: classManifest(surfaces),
    combinedFullTwoBlockHeadroom: classManifest(fullHeadroom),
    combinedInteractionHalo: classManifest(haloUnion),
    interactionDisjointness: inventory.scope.recommendedBatch,
    excludedStations: {
      entityBand: { start: 1170, end: 1174 },
      reservationAndGradeShadowBand: { start: 1175, end: 1183 },
      otherUnbuiltAtGrade: { start: 1146, end: 1169 },
      disposition: 'PRESERVED_UNTOUCHED_NOT_A_GLOBAL_R11_HOLD',
    },
    routeCommissioned: false,
  },
  target: {
    operatedUnion: classManifest(targetUnion),
    desiredStateCensus: census(allRecords, 'targetState'),
    sourceStateCensus: census(allRecords, 'sourceState'),
    interactionHalo: classManifest(haloUnion),
    packageTargetsDisjoint: true,
    packageHalosDisjoint: true,
  },
  isolation: {
    sourceHazardCount: 0,
    haloHazardCount: 0,
    gravityCellCount: 0,
    savedEntityConflictCount: 0,
    blockEntityConflictCount: 0,
    priorReleaseIntersectionCount: 0,
    protectedRelicIntersectionCount: 0,
    c01IntersectionCount: 0,
    railUtilityReservationIntersectionCount: 0,
    crossPackageTargetIntersectionCount: 0,
    crossPackageHaloIntersectionCount: 0,
  },
  packages,
  operations,
  executionOrder: {
    forward: packages.map(({ key }) => key),
    rollback: packages.map(({ key }) => key).reverse(),
    rationale: 'The scopes have disjoint targets and disjoint interaction halos. Within the first package, 49 leaf-persistence transitions precede owned-log removal; exact reverse rollback restores logs before returning leaves to source persistence.',
  },
  compileGuards: {
    exactSourceGuardCount: allRecords.length,
    exactInversePackageCount: packages.length,
    stableSurfaceCellCount: stableSurfaceCount,
    fullHeadroomAirCount,
    surfaceComponentCountPerScope: [1, 1],
    crossPackageTargetOverlapCount: 0,
    crossPackageHaloOverlapCount: 0,
    sourceHazardCount: 0,
    haloHazardCount: 0,
    fluidCellCount: 0,
    gravityCellCount: 0,
    containerOrBlockEntityCount: 0,
    savedEntityConflictCount: 0,
    priorReleaseIntersectionCount: 0,
    reservationIntersectionCount: 0,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
  },
  safetyBoundary: {
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    freshLiveEntityClearanceRequired: true,
    exactSourcePreflightRequired: true,
    journaledStrictNoopExecutionRequired: true,
    freshPostSnapshotAndRollbackPreflightRequired: true,
    wholeRouteCommissioned: false,
  },
};
const manifestIdentity = sha256(JSON.stringify(withoutIdentity));
const manifest = { ...withoutIdentity, manifestIdentity };
fs.writeFileSync(absolute(actualManifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({
  status: manifest.status,
  manifest: manifestPath,
  manifestIdentity,
  packageCount: packages.length,
  targetCount: targetUnion.length,
  surfaceCount: surfaces.length,
  foundationCount: foundations.length,
  headroomCutCount: headroomCuts.length,
  fullHeadroomCount: fullHeadroom.length,
  leafTransitionCount: dependencies.length,
  haloCount: haloUnion.length,
  crossPackageHaloOverlapCount: 0,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
