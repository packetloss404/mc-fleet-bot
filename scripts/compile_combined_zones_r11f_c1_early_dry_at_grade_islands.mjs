#!/usr/bin/env node
/** Compile the two source-proven early C1 dry at-grade islands for CZ-R11F. */

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
import { census, classManifest } from './lib/combined_zones_c1_at_grade_island_lib.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-21T23:55:00Z');
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r11f-c1-early-dry-at-grade-islands';
const RELEASE_ID = 'CZ-R11F-C1-EARLY-DRY-AT-GRADE-ISLANDS';
const RELEASE_NODE_ID = 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR';
const SNAPSHOT = 'data/worldsnap-combined-zones-r11e-retry-v2-post-20260821T232546Z';
const SOURCE_LEDGER =
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/evidence-ledger.json';
const INTAKE_AUDIT =
  'data/world-review/combined-zones-r11e-retry-v2-live-20260821T232546Z/post-complete-save-intake.json';
const INVENTORY_PATH =
  'data/world-review/combined-zones-r11f-inventory-20260821T235000Z.json';
const RELEASE_CONTRACT = 'docs/masterplans/05-combined-zones/phase1-release-contract.json';
const AUTHORIZATION =
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json';
const MATERIAL_PRECEDENT =
  'docs/masterplans/05-combined-zones/phase1-r01-b11-scope-and-material-decision.json';
const R11E_MANIFEST =
  'data/buildops/combined-zones-r11e-retry-v2-c1-six-island-natural-transition-rebound-batch.release-manifest.json';
const INCLUDED_KEYS = new Set(['island-46-47', 'island-75-91']);
const EXPECTED = Object.freeze({
  sourceLedgerSha256: '97b0a46b5ddd2b56c2864cf44e71746dbb186fddd5a2ccb19e5ea0cd7b2a562f',
  sourceCompletedReleaseIdentitySha256:
    '33ef91973427f9f93a5cd4af5bfa4d059979064a43fd0eb9d2fa6db4f2af3ffb',
  sourceCompleteSaveSha256:
    '0079adf895179606ad64a57ad0e85351c4e6ba3dbacb82a308b84a6909013109',
  sourceRegionSha256:
    'e301aa16ef0db51b313d5c7d4a6b6b2e99343dd64787645b7f872d07268d1258',
  inventorySha256: '542432912cc14ed1a1a9f3918dc9deaf64cc7a9762f0adc085e347f325f03021',
  r11eManifestSha256:
    'db348b7419dc6955dce857e58b3e152a58da5b93ba1167cb1a8d3b7623eff9ee',
  includedIslandCount: 2,
  packageCount: 3,
  targetCellCount: 1_639,
  surfaceCellCount: 551,
});

const absolute = (filename) => path.resolve(ROOT, filename);
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R11F early dry at-grade compiler rejected: ${message}`);
};
const samePath = (left, right) => absolute(left) === absolute(right);

const ledgerBytes = fs.readFileSync(absolute(SOURCE_LEDGER));
const ledger = JSON.parse(ledgerBytes);
const intakeBytes = fs.readFileSync(absolute(INTAKE_AUDIT));
const intake = JSON.parse(intakeBytes);
const inventoryBytes = fs.readFileSync(absolute(INVENTORY_PATH));
const inventory = JSON.parse(inventoryBytes);
const sourceIdentity = readJson(ledger.postSnapshot.identity.path);
const contract = readJson(RELEASE_CONTRACT);
const authorization = readJson(AUTHORIZATION);
const material = readJson(MATERIAL_PRECEDENT);
const r11eBytes = fs.readFileSync(absolute(R11E_MANIFEST));
const r11e = JSON.parse(r11eBytes);

invariant(sha256(ledgerBytes) === EXPECTED.sourceLedgerSha256
  && ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
  && ledger.completedReleaseIdentitySha256
    === EXPECTED.sourceCompletedReleaseIdentitySha256
  && samePath(ledger.postSnapshot.root, SNAPSHOT),
'accepted R11E terminal ledger drifted');
invariant(intake.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
  && intake.packageIdentity.completeSaveSha256 === EXPECTED.sourceCompleteSaveSha256
  && samePath(intake.input.suppliedWorldRoot, SNAPSHOT)
  && sourceIdentity.sha256 === EXPECTED.sourceRegionSha256,
'accepted immutable source snapshot drifted');
invariant(sha256(inventoryBytes) === EXPECTED.inventorySha256
  && inventory.inventoryPayloadSha256
  && samePath(inventory.source.snapshotRoot, SNAPSHOT),
'frozen R11F inventory identity drifted');
invariant(sha256(r11eBytes) === EXPECTED.r11eManifestSha256
  && r11e.scope.omittedEntityInterfaceIslands.length === 1
  && r11e.scope.excludedAtGradeRanges.length === 2,
'accepted R11E exclusion contract drifted');
invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
  && authorization.revoked === false
  && authorization.authorizedReleaseNodes.includes(RELEASE_NODE_ID)
  && contract.releaseSequence.find(({ id }) => id === RELEASE_NODE_ID)
    ?.canonicalOwners.includes('C1-HIGHWAY')
  && material.materialDecision.designPrecedent.includes('gray_concrete'),
'R11 authority/material precedent drifted');

const inventoryByKey = new Map(inventory.ranges.map((range) => [range.key, range]));
const included = [...INCLUDED_KEYS].map((key) => inventoryByKey.get(key));
const blocked = inventoryByKey.get('island-0-10');
invariant(included.length === EXPECTED.includedIslandCount
  && included.every((range) => range?.safe === true
    && range.sourceHazardCount === 0 && range.haloHazardCount === 0
    && range.savedEntityConflicts.cellCount === 0
    && range.priorIntersectionCount === 0
    && Object.values(range.operatedInterfaceIntersections)
      .every(({ cellCount }) => cellCount === 0))
  && blocked?.safe === false && blocked.sourceHazardCount === 80
  && blocked.haloHazardCount === 106,
'safe/blocked early-range partition drifted');

const reader = new AnvilReader(absolute(path.join(SNAPSHOT, 'region')));
const sourceCache = new Map();
const sourceAt = async (cell) => {
  const key = cellKey(cell);
  if (!sourceCache.has(key)) sourceCache.set(key, stateToCommandString(
    await reader.blockState(cell.x, cell.y, cell.z),
  ));
  return sourceCache.get(key);
};
const packages = [];
const operations = {};
const forwardOrder = [];
const allRecords = [];
const targetKeys = new Set();
fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
for (const range of included) {
  const definitions = [];
  if (range.records.dependencies.length) definitions.push({
    key: `c1-${range.key}-dependencies`,
    role: 'exact gravity/leaf dependencies',
    records: range.records.dependencies,
  });
  definitions.push({
    key: `c1-${range.key}-pavement`,
    role: 'foundation/headroom/pavement',
    records: range.records.pavement,
  });
  for (const definition of definitions) {
    invariant(definition.records.length > 0, `${definition.key} is empty`);
    for (const record of definition.records) {
      invariant(await sourceAt(record.cell) === record.sourceState,
        `${definition.key} source guard drifted at ${cellKey(record.cell)}`);
      invariant(!targetKeys.has(cellKey(record.cell)),
        `cross-package overlap at ${cellKey(record.cell)}`);
      targetKeys.add(cellKey(record.cell));
      allRecords.push({ ...record, island: range.key, packageKey: definition.key });
    }
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
    const forward = path.join(OUT_DIR, `${BASENAME}.${definition.key}.forward.txt`);
    const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${definition.key}.rollback.txt`);
    const header = (direction, operationSha256) => [
      `# GENERATED FILE - ${RELEASE_ID} (${definition.key} ${direction})`,
      `# source root: ${SNAPSHOT}`,
      `# complete-save SHA-256: ${EXPECTED.sourceCompleteSaveSha256}`,
      `# inventory SHA-256: ${EXPECTED.inventorySha256}`,
      `# target coordinate-set SHA-256: ${targetCoordinateSetSha256}`,
      `# operation SHA-256: ${operationSha256}`,
    ].join('\n');
    fs.writeFileSync(absolute(forward), `${header('forward', forwardSha256)}\n${forwardBody}`);
    fs.writeFileSync(absolute(rollbackPath), `${header('rollback', rollbackSha256)}\n${rollbackBody}`);
    packages.push({ key: definition.key, forward, rollback: rollbackPath });
    forwardOrder.push(definition.key);
    operations[definition.key] = {
      forwardSha256,
      rollbackSha256,
      forwardCommandCount: definition.records.length,
      rollbackCommandCount: rollback.length,
      targetCellCount: definition.records.length,
      targetCoordinateSetSha256,
      exactInverse: true,
      island: range.key,
      role: definition.role,
    };
  }
}
invariant(packages.length === EXPECTED.packageCount
  && allRecords.length === EXPECTED.targetCellCount,
'package/target totals drifted');
const halo = uniqueCells(allRecords.flatMap(({ cell }) => {
  const result = [];
  for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) {
      result.push({ x: cell.x + dx, y: cell.y + dy, z: cell.z + dz });
    }
  }
  return result;
}));
const surfaceCount = allRecords.filter(
  ({ targetState }) => ['minecraft:gray_concrete', 'minecraft:smooth_stone',
    'minecraft:yellow_concrete'].includes(targetState),
).length;
invariant(surfaceCount === EXPECTED.surfaceCellCount, 'surface total drifted');

const manifestWithoutIdentity = {
  schemaVersion: 1,
  transactionId: BASENAME,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_FROM_ACCEPTED_R11E_POST_OFFLINE_AWAITING_FRESH_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['C1-HIGHWAY'],
  packages,
  executionOrder: {
    forward: forwardOrder,
    rollback: forwardOrder.slice().reverse(),
    rationale: 'Execute the five exact gravel dependencies for stations 46..47 before that island pavement, then the disjoint stations 75..91 pavement. Rollback uses the exact global reverse. No operation spans a held treatment.',
  },
  scope: {
    releaseId: RELEASE_ID,
    releaseNodeId: RELEASE_NODE_ID,
    canonicalOwner: 'C1-HIGHWAY',
    purpose: 'Build the two remaining source-proven dry early C1 at-grade islands without opening or claiming connectivity across the surrounding hydraulic, embankment, cut, tunnel, sheep, or wet holds.',
    includedIslands: included.map((range) => ({
      key: range.key,
      stations: { ...range.stations, treatment: 'AT_GRADE_COORDINATION_PASS' },
      geometry: {
        candidate: range.candidate,
        priorReleaseConflicts: range.priorConflicts,
        reservationConflicts: range.reservationConflicts,
        savedEntityConflicts: range.savedEntityConflicts,
        disconnectedGradeShadows: range.gradeShadows,
        preservedExceptions: range.exceptions,
        pavementSurface: range.surface,
        exactFoundationFill: range.foundation,
        exactHeadroomCuts: range.headroomCuts,
        fullTwoBlockHeadroom: range.fullHeadroom,
        stableFoundationContacts: range.stableFoundationContacts,
        gravityDependencies: range.gravityDependencies,
        gravityRollbackSupportProofCount: range.gravityRollbackSupportProofCount,
        ownedLogRemovals: range.ownedLogRemovals,
        removalInfluencedRetainedLeaves: range.influencedLeaves,
        projectedRetainedLogDistanceCensus: range.retainedLogDistanceCensus,
        leafPropertyTransitions: range.leafTransitions,
        operatedUnion: range.operated,
        interactionHalo: range.halo,
        connectedSurfaceComponentCount: 1,
        routeCommissioned: false,
      },
      sourceStateCensus: census([
        ...range.records.dependencies, ...range.records.pavement,
      ], 'sourceState'),
      targetStateCensus: census([
        ...range.records.dependencies, ...range.records.pavement,
      ], 'targetState'),
    })),
    excludedEarlyAtGradeRange: {
      key: blocked.key,
      stations: blocked.stations,
      sourceHazardCount: blocked.sourceHazardCount,
      sourceHazardCensus: blocked.sourceHazardCensus,
      haloHazardCount: blocked.haloHazardCount,
      haloHazardCensus: blocked.haloHazardCensus,
      disposition: 'PRESERVED_UNTOUCHED_LOCAL_HYDRAULIC_AND_UNSTABLE_CONTACT_HOLD_NO_OPERATION_PACKAGE',
    },
    preservedR11EExclusions: {
      omittedEntityInterfaceIslands: r11e.scope.omittedEntityInterfaceIslands,
      excludedAtGradeRanges: r11e.scope.excludedAtGradeRanges,
      heldTreatments: r11e.scope.heldTreatments,
    },
    heldInterfaces: [
      { stations: { start: 11, end: 45 }, disposition: 'NO_OPERATION_NON_AT_GRADE_HOLD' },
      { stations: { start: 48, end: 74 }, disposition: 'NO_OPERATION_NON_AT_GRADE_HOLD' },
      { stations: { start: 92, end: 480 }, disposition: 'NO_OPERATION_NON_AT_GRADE_HOLD' },
    ],
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
  },
  source: {
    snapshotRoot: SNAPSHOT,
    completeSaveSha256: EXPECTED.sourceCompleteSaveSha256,
    sourceRegionSha256: EXPECTED.sourceRegionSha256,
    intakeAuditPath: INTAKE_AUDIT,
    intakeAuditSha256: sha256(intakeBytes),
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256:
      EXPECTED.sourceCompletedReleaseIdentitySha256,
    inventoryPath: INVENTORY_PATH,
    inventorySha256: EXPECTED.inventorySha256,
    inventoryPayloadSha256: inventory.inventoryPayloadSha256,
    r11eManifestPath: R11E_MANIFEST,
    r11eManifestSha256: EXPECTED.r11eManifestSha256,
  },
  target: {
    operatedUnion: classManifest(allRecords.map(({ cell }) => cell)),
    desiredStateCensus: census(allRecords, 'targetState'),
    interactionHalo: classManifest(halo),
    islandTargetsDisjoint: true,
    packageTargetsDisjoint: true,
  },
  operations: {
    ...operations,
    ordering: 'The narrow gravity dependency package executes before its pavement consumer; all rollback files are reverse-order exact inverses.',
  },
  isolation: {
    includedIslandCount: included.length,
    excludedEarlyHazardRangeCount: 1,
    preservedR11EWetRangeCount: r11e.scope.excludedAtGradeRanges.length,
    preservedSheepIslandCount: r11e.scope.omittedEntityInterfaceIslands.length,
    sourceHazardCount: 0,
    haloHazardCount: 0,
    savedEntityConflictCount: 0,
    priorReleaseIntersectionCount: 0,
    operatedInterfaceIntersectionCount: 0,
    heldTreatmentMutationCount: 0,
    routeCommissioned: false,
  },
  compileGuards: {
    exactAcceptedR11EPostSource: true,
    uniqueOperatedCellCount: allRecords.length,
    exactSourceGuardMatchCount: allRecords.length,
    exactInversePackageCount: packages.length,
    emptyPackageCount: 0,
    includedSourceHazardCount: 0,
    includedHaloHazardCount: 0,
    includedSavedEntityConflictCount: 0,
    includedPriorIntersectionCount: 0,
    includedInterfaceIntersectionCount: 0,
    heldTreatmentMutationCount: 0,
    corridorConnectivityClaimed: false,
  },
  standingAuthorization: r11e.standingAuthorization,
  upstreamIdentities: {
    sourceLedgerPath: SOURCE_LEDGER,
    sourceLedgerSha256: EXPECTED.sourceLedgerSha256,
    sourceCompletedReleaseIdentitySha256:
      EXPECTED.sourceCompletedReleaseIdentitySha256,
    inventoryPath: INVENTORY_PATH,
    inventorySha256: EXPECTED.inventorySha256,
    r11eManifestPath: R11E_MANIFEST,
    r11eManifestSha256: EXPECTED.r11eManifestSha256,
  },
  hardSafetyKernelNext: r11e.hardSafetyKernelNext,
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
  manifest: manifestPath,
  manifestIdentity,
  packages: packages.length,
  includedIslands: included.map(({ key, stations }) => ({ key, stations })),
  excludedEarlyRange: blocked.key,
  targetCellCount: allRecords.length,
  surfaceCellCount: surfaceCount,
  targetCoordinateSetSha256: hashCells(allRecords.map(({ cell }) => cell)),
  interactionHaloCellCount: halo.length,
  liveCallsPerformed: false,
  worldEditsPerformed: false,
}, null, 2));
