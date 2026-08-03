#!/usr/bin/env node
/**
 * Finalize the committed two-package terminal recovery as one atomic
 * supplemental group without inventing an intermediate snapshot.
 *
 * The source bridge is deliberately scoped: it proves that every exact source
 * guard for both packages passed on both the prior logical terminal snapshot
 * and the fresh physical execution snapshot. It does not claim that the two
 * snapshot directory hashes are equal.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  parseOperationText,
  verifyExactOperationBijection,
} from './qa_town_expansion_post_release.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PATHS = Object.freeze({
  logicalSourceRegions:
    'data/worldsnap-town-accessibility-citizen-final-20260728T1745Z/region',
  physicalSourceRegions:
    'data/worldsnap-town-terminal-recovery-pre-20260728T1837Z/region',
  postRegions:
    'data/worldsnap-town-terminal-recovery-post-20260728T1839Z/region',
  atomicTransaction:
    'data/world-review/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-atomic-transaction-20260728T1838Z.json',
  releaseManifest:
    'data/buildops/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-2026-07-28.manifest.json',
  liveEntityGate:
    'data/world-review/town-expansion-terminal-recovery-live-entity-gate-20260728T1838Z.json',
  bridge:
    'data/world-review/'
    + 'town-expansion-terminal-recovery-source-provenance-bridge-20260728T1839Z.json',
  ledger:
    'data/world-review/'
    + 'town-expansion-terminal-provenance-and-ridge-recovery-committed-supplement-20260728T1839Z.json',
});
const PACKAGES = Object.freeze([
  {
    key: 'red-carpet-source-recovery',
    forward:
      'data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.txt',
    rollback:
      'data/buildops/town-expansion-r1-red-carpet-source-recovery-2026-07-28.rollback.txt',
    logicalSourcePreflight:
      'data/world-review/'
      + 'town-expansion-r1-red-carpet-source-recovery-terminal-preflight-20260728.json',
    physicalSourcePreflight:
      'data/buildops/'
      + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.prerelease-preflight.json',
    execution:
      'data/buildops/'
      + 'town-expansion-r1-red-carpet-source-recovery-2026-07-28.execution.json',
    rollbackPreflight:
      'data/world-review/'
      + 'town-expansion-r1-red-carpet-source-recovery-rollback-poststate-preflight-20260728T1839Z.json',
    operationCount: 49,
  },
  {
    key: 'citizen-ridge-stair-repair',
    forward:
      'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.txt',
    rollback:
      'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.rollback.txt',
    logicalSourcePreflight:
      'data/world-review/citizen-route-ridge-stair-repair-source-preflight-20260728.json',
    physicalSourcePreflight:
      'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.prerelease-preflight.json',
    execution:
      'data/buildops/citizen-route-ridge-stair-repair-2026-07-28.execution.json',
    rollbackPreflight:
      'data/world-review/'
      + 'citizen-route-ridge-stair-repair-rollback-poststate-preflight-20260728T1839Z.json',
    operationCount: 8,
  },
]);
const EXPECTED = Object.freeze({
  logicalSource:
    '71f52acf04f4974557fcc23e7cb02d81d76ed17cbab41bcc78ff9846cba1045d',
  physicalSource:
    '8d2a7816ce142db91f274320e5b4405b9d9a0a3ecd3ce2357f591f8fe6fce19b',
  post: 'c39d0d67c9dec737aa5807cf5fa56a84f3c3d38d4b13d0f82599d3eb30fa6751',
});

function resolveRoot(filename) {
  return path.resolve(ROOT, filename);
}

function relativeRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function artifact(filename) {
  const resolved = resolveRoot(filename);
  return {
    path: relativeRoot(resolved),
    sha256: sha256(fs.readFileSync(resolved)),
    bytes: fs.statSync(resolved).size,
  };
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(resolveRoot(filename), 'utf8'));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function samePath(left, right) {
  return resolveRoot(left) === resolveRoot(right);
}

function validatePreflight(report, {
  operationPath,
  operationSha256,
  operationCount,
  snapshotPath,
  snapshotSha256,
  label,
}) {
  assert(
    report.schemaVersion >= 2
      && report.status === 'PASS'
      && report.orderAwareProjection === true
      && report.operationCount === operationCount
      && report.passed === operationCount
      && report.failed === 0
      && report.failures?.length === 0
      && samePath(report.opsPath, operationPath)
      && report.opsSha256 === operationSha256
      && samePath(report.regions, snapshotPath)
      && report.regionsSnapshot?.sha256 === snapshotSha256,
    `${label} preflight identity or result drift`,
  );
}

function targetKeys(operationText) {
  const parsed = parseOperationText(operationText);
  assert(parsed.unsupported.length === 0, 'operation file has unsupported lines');
  const keys = new Set();
  for (const operation of parsed.repl) {
    for (let y = operation.box[1]; y <= operation.box[4]; y += 1) {
      for (let z = operation.box[2]; z <= operation.box[5]; z += 1) {
        for (let x = operation.box[0]; x <= operation.box[3]; x += 1) {
          const key = `${x},${y},${z}`;
          assert(!keys.has(key), `package repeats target ${key}`);
          keys.add(key);
        }
      }
    }
  }
  return keys;
}

function validateExecution(execution, operationSha256, operationCount, label) {
  const sourceGroupCount = Array.isArray(execution.sourceGroups)
    ? execution.sourceGroups.length
    : execution.sourceGroupCount;
  assert(
    execution.schemaVersion === 3
      && execution.status === 'complete'
      && execution.operationRole === 'forward'
      && execution.strictNoop === true
      && execution.operationSha256 === operationSha256
      && sourceGroupCount === operationCount
      && execution.successfulGroups === operationCount
      && execution.failedGroups === 0
      && execution.failedCommands === 0
      && execution.noopCommands === 0
      && execution.worldEditLeftoverCount === 0,
    `${label} execution evidence drift`,
  );
}

async function main() {
  for (const filename of [PATHS.bridge, PATHS.ledger]) {
    assert(!fs.existsSync(resolveRoot(filename)), `refusing to overwrite ${filename}`);
  }
  const logicalSource = hashSnapshotDirectory(resolveRoot(PATHS.logicalSourceRegions));
  const physicalSource = hashSnapshotDirectory(resolveRoot(PATHS.physicalSourceRegions));
  const post = hashSnapshotDirectory(resolveRoot(PATHS.postRegions));
  assert(logicalSource.sha256 === EXPECTED.logicalSource, 'logical source snapshot drift');
  assert(physicalSource.sha256 === EXPECTED.physicalSource, 'physical source snapshot drift');
  assert(post.sha256 === EXPECTED.post, 'post snapshot drift');
  assert(logicalSource.sha256 !== physicalSource.sha256, 'source bridge is unnecessary');

  const atomicTransaction = readJson(PATHS.atomicTransaction);
  const releaseManifest = readJson(PATHS.releaseManifest);
  const liveEntityGate = readJson(PATHS.liveEntityGate);
  assert(
    atomicTransaction.schemaVersion === 1
      && atomicTransaction.status === 'committed-pending-post-qa'
      && atomicTransaction.packages?.length === PACKAGES.length,
    'atomic transaction is not committed as the exact two-package group',
  );
  assert(
    releaseManifest.schemaVersion === 1
      && releaseManifest.transactionId === atomicTransaction.transactionId
      && releaseManifest.packages?.length === PACKAGES.length
      && atomicTransaction.releaseManifestSha256
        === artifact(PATHS.releaseManifest).sha256,
    'atomic release manifest identity drift',
  );
  assert(
    liveEntityGate.schemaVersion === 2
      && liveEntityGate.status === 'PASS'
      && liveEntityGate.passed === true
      && liveEntityGate.packages?.length === PACKAGES.length
      && liveEntityGate.forceLoadAudit?.finalSetMatchesPreExistingSet === true,
    'shared live entity gate is not PASS',
  );

  const observedTargets = new Set();
  const packageEvidence = PACKAGES.map((definition, index) => {
    const forwardText = fs.readFileSync(resolveRoot(definition.forward), 'utf8');
    const rollbackText = fs.readFileSync(resolveRoot(definition.rollback), 'utf8');
    const forward = artifact(definition.forward);
    const rollback = artifact(definition.rollback);
    const exact = verifyExactOperationBijection(forwardText, rollbackText);
    assert(
      exact.passed
        && exact.forwardReplGroups === definition.operationCount
        && exact.rollbackReplGroups === definition.operationCount
        && exact.uniqueTargetCells === definition.operationCount,
      `${definition.key} is not an exact one-cell inverse package`,
    );
    for (const key of targetKeys(forwardText)) {
      assert(!observedTargets.has(key), `cross-package target overlap at ${key}`);
      observedTargets.add(key);
    }
    const logicalPreflight = readJson(definition.logicalSourcePreflight);
    const physicalPreflight = readJson(definition.physicalSourcePreflight);
    const rollbackPreflight = readJson(definition.rollbackPreflight);
    validatePreflight(logicalPreflight, {
      operationPath: definition.forward,
      operationSha256: forward.sha256,
      operationCount: definition.operationCount,
      snapshotPath: PATHS.logicalSourceRegions,
      snapshotSha256: logicalSource.sha256,
      label: `${definition.key} logical-source`,
    });
    validatePreflight(physicalPreflight, {
      operationPath: definition.forward,
      operationSha256: forward.sha256,
      operationCount: definition.operationCount,
      snapshotPath: PATHS.physicalSourceRegions,
      snapshotSha256: physicalSource.sha256,
      label: `${definition.key} physical-source`,
    });
    validatePreflight(rollbackPreflight, {
      operationPath: definition.rollback,
      operationSha256: rollback.sha256,
      operationCount: definition.operationCount,
      snapshotPath: PATHS.postRegions,
      snapshotSha256: post.sha256,
      label: `${definition.key} rollback-poststate`,
    });
    const execution = readJson(definition.execution);
    validateExecution(
      execution,
      forward.sha256,
      definition.operationCount,
      definition.key,
    );
    const atomicPackage = atomicTransaction.packages[index];
    const manifestPackage = releaseManifest.packages[index];
    const gatePackage = liveEntityGate.packages.find(
      (entry) => samePath(entry.file, definition.forward),
    );
    assert(
      atomicPackage?.key === definition.key
        && atomicPackage.status === 'committed'
        && samePath(atomicPackage.forward, definition.forward)
        && samePath(atomicPackage.rollback, definition.rollback)
        && atomicPackage.forwardSha256 === forward.sha256
        && atomicPackage.rollbackSha256 === rollback.sha256
        && samePath(atomicPackage.executionReport, definition.execution),
      `${definition.key} atomic package identity drift`,
    );
    assert(
      manifestPackage?.key === definition.key
        && samePath(manifestPackage.forward, definition.forward)
        && samePath(manifestPackage.rollback, definition.rollback),
      `${definition.key} release manifest entry drift`,
    );
    assert(
      gatePackage?.passed === true
        && gatePackage.operationSha256 === forward.sha256
        && gatePackage.blockers?.length === 0
        && gatePackage.queryErrors?.length === 0,
      `${definition.key} entity-gate package drift`,
    );
    return {
      key: definition.key,
      operationCount: definition.operationCount,
      targetCellCount: exact.uniqueTargetCells,
      forward,
      rollback,
      logicalSourcePreflight: artifact(definition.logicalSourcePreflight),
      physicalSourcePreflight: artifact(definition.physicalSourcePreflight),
      execution: artifact(definition.execution),
      rollbackPoststatePreflight: artifact(definition.rollbackPreflight),
      exactBijection: exact,
    };
  });

  const bridge = {
    schemaVersion: 1,
    id: 'town-expansion-terminal-recovery-source-provenance-bridge',
    status: 'PASS',
    passed: true,
    scope: 'exact-package-target-source-guard-equivalence',
    fullSnapshotEqualityClaimed: false,
    logicalSourceSnapshot: {
      path: PATHS.logicalSourceRegions,
      sha256: logicalSource.sha256,
      regionFileCount: logicalSource.regionFileCount,
    },
    physicalExecutionSnapshot: {
      path: PATHS.physicalSourceRegions,
      sha256: physicalSource.sha256,
      regionFileCount: physicalSource.regionFileCount,
    },
    operationGroupCount: packageEvidence.reduce(
      (sum, entry) => sum + entry.operationCount,
      0,
    ),
    uniqueTargetCellCount: observedTargets.size,
    crossPackageTargetOverlap: 0,
    packages: packageEvidence.map((entry) => ({
      key: entry.key,
      operationCount: entry.operationCount,
      targetCellCount: entry.targetCellCount,
      forward: entry.forward,
      logicalSourcePreflight: entry.logicalSourcePreflight,
      physicalSourcePreflight: entry.physicalSourcePreflight,
      logicalAndPhysicalGuardsEquivalent: true,
    })),
    limitations: {
      exactSnapshotIdentityReused: false,
      provesOnlyDeclaredPackageTargetCells: true,
      permitsUndeclaredWorldMutation: false,
      validOnlyWithBoundAtomicExecutionAndPoststateInverseEvidence: true,
    },
  };
  fs.mkdirSync(path.dirname(resolveRoot(PATHS.bridge)), { recursive: true });
  fs.writeFileSync(
    resolveRoot(PATHS.bridge),
    `${JSON.stringify(bridge, null, 2)}\n`,
    { flag: 'wx' },
  );

  const ledger = {
    schemaVersion: 2,
    kind: 'committed-atomic-supplemental-group',
    transactionId: atomicTransaction.transactionId,
    status: 'committed',
    scope: 'terminal provenance recovery and citizen ridge stair repair',
    source: {
      snapshot: PATHS.logicalSourceRegions,
      snapshotSha256: logicalSource.sha256,
      physicalExecutionSnapshot: PATHS.physicalSourceRegions,
      physicalExecutionSnapshotSha256: physicalSource.sha256,
      provenanceBridge: PATHS.bridge,
      provenanceBridgeSha256: artifact(PATHS.bridge).sha256,
      entityGate: PATHS.liveEntityGate,
      entityGateSha256: artifact(PATHS.liveEntityGate).sha256,
    },
    atomicTransaction: {
      path: PATHS.atomicTransaction,
      sha256: artifact(PATHS.atomicTransaction).sha256,
      status: atomicTransaction.status,
    },
    releaseManifest: artifact(PATHS.releaseManifest),
    packages: packageEvidence.map((entry) => ({
      key: entry.key,
      status: 'committed',
      operationCount: entry.operationCount,
      sourceGroups: entry.operationCount,
      successfulGroups: entry.operationCount,
      failedGroups: 0,
      changedCommands: entry.operationCount,
      noopCommands: 0,
      forward: entry.forward.path,
      forwardSha256: entry.forward.sha256,
      rollback: entry.rollback.path,
      rollbackSha256: entry.rollback.sha256,
      logicalSourcePreflight: entry.logicalSourcePreflight.path,
      sourcePreflight: entry.physicalSourcePreflight.path,
      execution: entry.execution.path,
      rollbackPreflight: entry.rollbackPoststatePreflight.path,
    })),
    postState: {
      snapshot: PATHS.postRegions,
      snapshotSha256: post.sha256,
      rollbackGuardsPassed: packageEvidence.reduce(
        (sum, entry) => sum + entry.operationCount,
        0,
      ),
      rollbackGuardsFailed: 0,
    },
    acceptance: {
      status: 'COMMITTED_POSTSTATE_INVERSES_PASS',
      packageCount: packageEvidence.length,
      operationCount: packageEvidence.reduce(
        (sum, entry) => sum + entry.operationCount,
        0,
      ),
      exactInversePackageCount: packageEvidence.length,
      crossPackageTargetOverlap: 0,
      fullSnapshotEqualityClaimedByBridge: false,
    },
  };
  fs.writeFileSync(
    resolveRoot(PATHS.ledger),
    `${JSON.stringify(ledger, null, 2)}\n`,
    { flag: 'wx' },
  );
  process.stdout.write(`${JSON.stringify({
    status: ledger.status,
    bridge: PATHS.bridge,
    bridgeSha256: artifact(PATHS.bridge).sha256,
    ledger: PATHS.ledger,
    ledgerSha256: artifact(PATHS.ledger).sha256,
    logicalSourceSha256: logicalSource.sha256,
    physicalSourceSha256: physicalSource.sha256,
    postSha256: post.sha256,
    packageCount: ledger.packages.length,
    operationCount: ledger.acceptance.operationCount,
    liveWorldMutated: false,
  }, null, 2)}\n`);
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
