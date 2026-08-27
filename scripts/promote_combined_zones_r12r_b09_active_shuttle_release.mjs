#!/usr/bin/env node
/** Promote the source-proven R12Q active-shuttle candidate into R12R buildops. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:30:00Z');
const CANDIDATE_DIR = value(
  '--candidate-dir',
  'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12q-candidate',
);
const OUT_DIR = value('--out-dir', 'data/buildops');
const BASENAME = 'combined-zones-r12r-b09-bounded-active-shuttle';
const TRANSACTION_ID = BASENAME;
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const CANDIDATE_BASE = 'r12q-b09-bounded-active-shuttle';
const CANDIDATE = path.join(CANDIDATE_DIR, `${CANDIDATE_BASE}.candidate-manifest.json`);
const READINESS = path.join(CANDIDATE_DIR, 'offline-readiness.json');
const INTEGRATION = path.join(CANDIDATE_DIR, 'recoverable-integration-design.json');
const EXECUTOR = 'scripts/run_guarded_tagged_minecart_transaction.py';
const EXPECTED = Object.freeze({
  candidatePayload: '2b31498c9860fad29aad937c57fddc8abea180a95b87616656145eb4fb1f9ab8',
  readinessPayload: '044fb400318a2b795a7695fa21e6f0fd952cc6ea1847c69cdf9705150f9ea65b',
  integrationPayload: '9c0867502876047ae20ea653007a4a1778337869c849d914b045c692d00e361a',
  executor: 'af9e68a5bf78b29f2845cdd084e78a8e7003637a21b837f7bfaeda992b778b7c',
});

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12R active-shuttle promoter rejected: ${message}`);
};
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(absolute(filename))),
  bytes: fs.statSync(absolute(filename)).size,
});
const operationBody = (filename) => `${fs.readFileSync(absolute(filename), 'utf8')
  .split(/\r?\n/).filter((line) => line && !line.startsWith('#')).join('\n')}\n`;

const candidate = readJson(CANDIDATE);
const readiness = readJson(READINESS);
const integration = readJson(INTEGRATION);
invariant(candidate.candidatePayloadSha256 === EXPECTED.candidatePayload
  && candidate.status === 'SOURCE_PROVEN_DISPOSABLE_CANDIDATE_NOT_A_LIVE_RELEASE_MANIFEST'
  && candidate.scope.targetCells.cellCount === 19
  && candidate.packages.length === 2,
'candidate identity or scope drifted');
invariant(readiness.readinessPayloadSha256 === EXPECTED.readinessPayload
  && readiness.status
    === 'PASS_BLOCK_PACKAGES_RUNTIME_AND_TAGGED_ENTITY_EXECUTOR_BOUND_READY_FOR_PROMOTION',
'candidate readiness drifted');
invariant(integration.integrationPayloadSha256 === EXPECTED.integrationPayload
  && integration.status === 'PASS_RECOVERABLE_COMPOSITION_CONTRACT_READY_FOR_COORDINATOR_BINDING'
  && integration.oneRecoverableTransactionPossible === true,
'recoverable integration design drifted');
invariant(binding(EXECUTOR).sha256 === EXPECTED.executor,
'guarded tagged-minecart executor identity drifted');

fs.mkdirSync(absolute(OUT_DIR), { recursive: true });
const promotedPackages = [];
const promotedOperations = {};
for (const pkg of candidate.packages) {
  const forwardBody = operationBody(pkg.forward);
  const rollbackBody = operationBody(pkg.rollback);
  const forwardPath = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.forward.txt`);
  const rollbackPath = path.join(OUT_DIR, `${BASENAME}.${pkg.key}.rollback.txt`);
  const header = (role, bodyHash) => `# GENERATED FILE - CZ-R12R/${pkg.key} (${role})\n`
    + `# predecessor: ${candidate.source.predecessor.transactionId}\n`
    + `# predecessor post complete-save SHA-256: ${candidate.source.predecessor.postCompleteSaveSha256}\n`
    + `# candidate payload SHA-256: ${candidate.candidatePayloadSha256}\n`
    + `# operation body SHA-256: ${bodyHash}\n`;
  fs.writeFileSync(absolute(forwardPath), `${header('forward', sha256(forwardBody))}${forwardBody}`);
  fs.writeFileSync(absolute(rollbackPath), `${header('rollback', sha256(rollbackBody))}${rollbackBody}`);
  promotedPackages.push({
    key: pkg.key,
    forward: relative(forwardPath),
    rollback: relative(rollbackPath),
  });
  promotedOperations[pkg.key] = {
    ...candidate.operations[pkg.key],
    forwardSha256: sha256(forwardBody),
    rollbackSha256: sha256(rollbackBody),
    forwardCommandCount: candidate.operations[pkg.key].targetCellCount,
    rollbackCommandCount: candidate.operations[pkg.key].targetCellCount,
    targetCellCount: candidate.operations[pkg.key].targetCellCount,
    exactInverse: true,
    reverseOrderInverse: true,
    oneCellGuards: true,
  };
  delete promotedOperations[pkg.key].forwardBodySha256;
  delete promotedOperations[pkg.key].rollbackBodySha256;
  delete promotedOperations[pkg.key].forwardFile;
  delete promotedOperations[pkg.key].rollbackFile;
  delete promotedOperations[pkg.key].exactReverseOrderInverse;
}

const entitySpec = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  entityType: 'minecraft:minecart',
  aabb: {
    minX: 2058,
    minY: 130,
    minZ: -748,
    maxX: 2073,
    maxY: 131,
    maxZ: -747,
  },
  spawn: [2058.5, 130.0625, -747.5],
  positionTolerance: 0.05,
  tag: 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b',
  name: 'CZ R12 minecart 7464210e11d51e28',
  terminalParkAabb: candidate.requiredEntityTransaction.terminalParkEnvelope,
  rollbackPositionPolicy: 'ANY_POSITION_INSIDE_FULL_SHUTTLE_AABB',
  executor: binding(EXECUTOR),
};
const entitySpecWithoutIdentity = { ...entitySpec };
const entitySpecPayloadSha256 = sha256(JSON.stringify(entitySpecWithoutIdentity));
const entitySpecPath = path.join(OUT_DIR, `${BASENAME}.tagged-minecart-transaction.json`);
fs.writeFileSync(absolute(entitySpecPath), `${JSON.stringify({
  ...entitySpecWithoutIdentity,
  entitySpecPayloadSha256,
}, null, 2)}\n`);

const payload = {
  schemaVersion: 1,
  transactionId: TRANSACTION_ID,
  generatedAtUtc: GENERATED_AT,
  status: 'COMPILED_R12R_BOUNDED_ACTIVE_SHUTTLE_AWAITING_COMPOSED_EXECUTION_KERNEL',
  releaseNodeId: RELEASE_NODE_ID,
  mvpScope: true,
  scopeIds: ['P1-B09-BOUNDED-MAINTENANCE-ACTIVE-SHUTTLE'],
  packages: promotedPackages,
  executionOrder: {
    forward: promotedPackages.map(({ key }) => key),
    rollback: promotedPackages.slice().reverse().map(({ key }) => key),
    rationale: 'Install two fail-closed wall controls, then the isolated 17-cell track migration. The entity transaction follows both block packages; compensation removes the exact tagged UUID first, then rolls track and controls back in exact reverse order.',
  },
  source: candidate.source,
  scope: {
    releaseId: 'CZ-R12R-P1-B09-BOUNDED-MAINTENANCE-ACTIVE-SHUTTLE',
    canonicalOwner: candidate.scope.canonicalOwner,
    purpose: 'Install and functionally prove one bounded maintenance-only active minecart shuttle while leaving every public, passenger, rescue, full-funicular, and exterior claim closed.',
    geometry: candidate.scope,
    exactBlockTargetCount: 19,
    persistentVehicleCount: 1,
    failSafeTerminalState: candidate.terminalPostContract,
    staticSafety: candidate.staticSafety,
    operationalBoundary: candidate.commissioningBoundary,
  },
  operations: promotedOperations,
  entityTransaction: {
    spec: binding(entitySpecPath),
    entitySpecPayloadSha256,
    executor: binding(EXECUTOR),
    deployAfterBlockPackages: true,
    compensateBeforeBlockRollback: true,
    terminalCompleteSaveMustContainExactEntity: true,
  },
  functionalAcceptance: {
    required: true,
    exactPaperRuntimeProof: candidate.runtimeProof,
    exactPaperRuntimeProofPayloadSha256: candidate.runtimeProofPayloadSha256,
    energizeOnlyDeclaredControls: true,
    westEastWestTraversalRequired: true,
    terminalControlsOffRequired: true,
    terminalRailsUnpoweredRequired: true,
    terminalMinecartStationaryInWestParkRequired: true,
  },
  provenance: {
    candidate: binding(CANDIDATE),
    candidatePayloadSha256: candidate.candidatePayloadSha256,
    readiness: binding(READINESS),
    readinessPayloadSha256: readiness.readinessPayloadSha256,
    integrationDesign: binding(INTEGRATION),
    integrationPayloadSha256: integration.integrationPayloadSha256,
  },
  releaseBoundary: {
    composedOuterCoordinatorRequired: true,
    currentBlockOnlyWrapperAloneSufficient: false,
    fullB09FunicularCommissioned: false,
    passengerOrPublicTransportCommissioned: false,
    rescueTransportCommissioned: false,
    canonicalBuildopsPromoted: true,
  },
};
const manifestIdentity = sha256(JSON.stringify(payload));
const manifest = { ...payload, manifestIdentity };
const manifestPath = path.join(OUT_DIR, `${BASENAME}.release-manifest.json`);
fs.writeFileSync(absolute(manifestPath), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  status: manifest.status,
  manifest: relative(manifestPath),
  manifestIdentity,
  entitySpec: relative(entitySpecPath),
  entitySpecPayloadSha256,
  packageCount: promotedPackages.length,
  blockTargetCount: 19,
  persistentVehicleCount: 1,
}, null, 2)}\n`);
