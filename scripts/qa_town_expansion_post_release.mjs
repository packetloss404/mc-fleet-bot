#!/usr/bin/env node
/**
 * Read-only post-deployment acceptance for the canonical Town Expansion R1
 * package and any ordered committed supplemental packages.
 *
 * This verifier never connects to Minecraft and never mutates a world,
 * database, service, or evidence input. It binds the design report and
 * ownership manifest to the exact forward/rollback files, proves sequential
 * REPL bijection, verifies the committed transaction and live entity gate,
 * binds the immutable pre/post snapshots, requires the rollback guards to pass
 * against the post snapshot, requires route QA PASS, and optionally verifies a
 * matched media report. It emits both JSON and Markdown decisions.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { hashSnapshotDirectory } from './generate_mainstreet_redevelopment_r4_r5.mjs';
import {
  loadNaturalStateTransitionPolicy,
} from './lib/natural_state_transition_policy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_KEY = 'town-expansion-r1';
const PACKAGE_ID = 'town-expansion-r1-2026-07-28';
const RELEASE_IDENTITY_ALGORITHM =
  'sha256(JSON.stringify(releaseIdentityWithoutSha256))';

export const POST_RELEASE_CONTRACT = Object.freeze({
  package: {
    key: PACKAGE_KEY,
    id: PACKAGE_ID,
    cardinality: 1,
    baseCardinality: 1,
    supplementalCardinality:
      'zero or more ordered one-package or schema-v2 atomic-group ledgers',
  },
  requiredInputs: [
    '--pre <immutable-prerelease-region-directory>',
    '--post <immutable-postrelease-region-directory>',
    '--transaction <atomic-transaction-ledger.json>',
    '--live-entity-gate <pre-execution-live-entity-gate.json>',
    '--rollback-poststate-preflight <rollback-preflight-against-post.json>',
    '--rollback-transition-policy <exact-point-policy.json>',
    '--route-qa <post-release-route-qa.json>',
    '--design-report data/buildops/town-expansion-r1-2026-07-28.report.json',
    '--manifest data/buildops/town-expansion-r1-2026-07-28.manifest.json',
  ],
  optionalInputs: [
    '--supplemental-transaction <committed-supplement-ledger.json> (repeatable, ordered)',
    '--source-equivalence-preflight <complete-forward-preflight.json> (required when transaction pre snapshot differs from design/manifest source identity)',
    '--media-report <post-release-media-report.json>',
  ],
  command: [
    'node --max-old-space-size=8192',
    'scripts/qa_town_expansion_post_release.mjs',
    '--pre <immutable-prerelease-region-directory>',
    '--post <immutable-postrelease-region-directory>',
    '--transaction <atomic-transaction-ledger.json>',
    '--live-entity-gate <pre-execution-live-entity-gate.json>',
    '--rollback-poststate-preflight <rollback-preflight-against-post.json>',
    '--rollback-transition-policy <exact-point-policy.json>',
    '--route-qa <post-release-route-qa.json>',
    '--design-report data/buildops/town-expansion-r1-2026-07-28.report.json',
    '--manifest data/buildops/town-expansion-r1-2026-07-28.manifest.json',
    '[--supplemental-transaction <committed-supplement-ledger.json>]...',
    '[--source-equivalence-preflight <complete-forward-preflight.json>]',
    '[--media-report <post-release-media-report.json>]',
    '--out data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
    '--markdown docs/redevelopment/2026-07-28-town-expansion/post-release-qa.md',
  ].join(' '),
  passBoundary: [
    'all artifact hashes and paths agree',
    'forward and rollback REPL sequences are exact inverses',
    'the transaction is committed with strict-noop success',
    'the explicit live entity gate passed without mutation or blockers',
    'pre and post immutable snapshot identities are distinct and bound',
    'when the transaction pre snapshot differs from the design/manifest snapshot, a complete exact source-state preflight binds that transaction snapshot to every base forward REPL group',
    'every rollback guard passes against the immutable post snapshot',
    'rollback-only natural transitions are exact-point, hash, evidence, family, and property bound',
    'every logical source overlay is exact-guarded, physically materialized by one committed disjoint supplemental package, and bound into policy evidence',
    'every ordered supplemental transaction is committed, strict-noop, exact-inverse, logical-source/post snapshot chained, entity-cleared, and rollback-preflighted',
    'post-release route QA is non-projected as-built evidence, explicitly complete, and binds the post snapshot path/hash and package hash',
    'when supplied, every media capture and its hashes pass',
  ],
});

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filename) {
  return sha256(fs.readFileSync(filename));
}

function readJson(filename) {
  return JSON.parse(fs.readFileSync(filename, 'utf8'));
}

function relative(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function resolveInput(filename) {
  return path.resolve(ROOT, filename);
}

function normalizeState(state) {
  const source = String(state);
  const bracket = source.indexOf('[');
  if (bracket < 0) return source;
  if (!source.endsWith(']')) throw new Error(`malformed block state ${source}`);
  const properties = source
    .slice(bracket + 1, -1)
    .split(',')
    .filter(Boolean)
    .sort();
  return `${source.slice(0, bracket)}[${properties.join(',')}]`;
}

function splitMasks(mask) {
  const states = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < mask.length; index += 1) {
    const character = mask[index];
    if (character === '[') depth += 1;
    else if (character === ']') depth -= 1;
    else if (character === ',' && depth === 0) {
      states.push(mask.slice(start, index));
      start = index + 1;
    }
  }
  states.push(mask.slice(start));
  return states.filter(Boolean).map(normalizeState);
}

function normalizedBox(raw) {
  return [
    Math.min(raw[0], raw[3]),
    Math.min(raw[1], raw[4]),
    Math.min(raw[2], raw[5]),
    Math.max(raw[0], raw[3]),
    Math.max(raw[1], raw[4]),
    Math.max(raw[2], raw[5]),
  ];
}

function boxVolume(box) {
  return (box[3] - box[0] + 1)
    * (box[4] - box[1] + 1)
    * (box[5] - box[2] + 1);
}

export function parseOperationText(text, label = '<operations>') {
  const repl = [];
  const commands = [];
  const unsupported = [];
  for (const [index, rawLine] of String(text).split(/\r?\n/).entries()) {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith('#')) continue;
    const fields = raw.split(/\s+/);
    const line = index + 1;
    if (fields[0] === 'CMD') {
      commands.push({ line, raw });
      continue;
    }
    if (fields[0] !== 'REPL' || fields.length !== 9) {
      unsupported.push({ line, raw });
      continue;
    }
    const rawBox = fields.slice(1, 7).map(Number);
    if (rawBox.some((coordinate) => !Number.isSafeInteger(coordinate))) {
      throw new Error(`${label}:${line}: invalid REPL coordinates`);
    }
    const box = normalizedBox(rawBox);
    repl.push({
      line,
      rawBox,
      box,
      sources: splitMasks(fields[7]),
      desired: normalizeState(fields[8]),
      volume: boxVolume(box),
    });
  }
  return { repl, commands, unsupported };
}

function addBoxTargets(targets, box) {
  for (let y = box[1]; y <= box[4]; y += 1) {
    for (let z = box[2]; z <= box[5]; z += 1) {
      for (let x = box[0]; x <= box[3]; x += 1) {
        targets.add(`${x},${y},${z}`);
      }
    }
  }
}

export function verifyExactOperationBijection(
  forwardText,
  rollbackText,
  { expandTargets = true } = {},
) {
  const forward = parseOperationText(forwardText, 'forward');
  const rollback = parseOperationText(rollbackText, 'rollback');
  const failures = [];
  if (forward.unsupported.length > 0) {
    failures.push({
      reason: 'unsupported-forward-operations',
      examples: forward.unsupported.slice(0, 20),
    });
  }
  if (rollback.unsupported.length > 0) {
    failures.push({
      reason: 'unsupported-rollback-operations',
      examples: rollback.unsupported.slice(0, 20),
    });
  }
  if (forward.repl.length !== rollback.repl.length) {
    failures.push({
      reason: 'repl-group-count-mismatch',
      forward: forward.repl.length,
      rollback: rollback.repl.length,
    });
  }
  const compared = Math.min(forward.repl.length, rollback.repl.length);
  let forwardCellSteps = 0;
  let rollbackCellSteps = 0;
  for (const operation of forward.repl) forwardCellSteps += operation.volume;
  for (const operation of rollback.repl) rollbackCellSteps += operation.volume;
  for (let index = 0; index < compared; index += 1) {
    const forwardOperation = forward.repl[index];
    const inverse = rollback.repl[rollback.repl.length - index - 1];
    const boxMatched =
      JSON.stringify(forwardOperation.box) === JSON.stringify(inverse.box);
    const exactSource = forwardOperation.sources.length === 1;
    const stateMatched = (
      exactSource
      && inverse.sources.length === 1
      && inverse.sources[0] === forwardOperation.desired
      && inverse.desired === forwardOperation.sources[0]
    );
    if ((!boxMatched || !stateMatched) && failures.length < 50) {
      failures.push({
        reason: 'non-bijective-repl-pair',
        forwardIndex: index,
        rollbackIndex: rollback.repl.length - index - 1,
        forward: {
          line: forwardOperation.line,
          box: forwardOperation.box,
          sources: forwardOperation.sources,
          desired: forwardOperation.desired,
        },
        rollback: {
          line: inverse.line,
          box: inverse.box,
          sources: inverse.sources,
          desired: inverse.desired,
        },
      });
    }
  }
  const targets = expandTargets ? new Set() : null;
  if (targets) {
    for (const operation of forward.repl) addBoxTargets(targets, operation.box);
  }
  return {
    passed: failures.length === 0 && forwardCellSteps === rollbackCellSteps,
    forwardReplGroups: forward.repl.length,
    rollbackReplGroups: rollback.repl.length,
    forwardCommands: forward.commands.length,
    rollbackCommands: rollback.commands.length,
    forwardCellSteps,
    rollbackCellSteps,
    uniqueTargetCells: targets?.size ?? null,
    repeatedForwardCellSteps:
      targets ? forwardCellSteps - targets.size : null,
    failures,
  };
}

function artifact(filename) {
  return {
    path: relative(filename),
    bytes: fs.statSync(filename).size,
    sha256: sha256File(filename),
  };
}

function samePath(left, right) {
  if (!left || !right) return false;
  return resolveInput(left) === resolveInput(right);
}

function snapshotArtifact(filename, digest = hashSnapshotDirectory(filename)) {
  return {
    path: relative(filename),
    sha256: digest.sha256,
    regionFileCount: digest.regionFileCount,
    bytes: digest.members.reduce((sum, member) => sum + member.bytes, 0),
  };
}

function getAt(value, dottedPath) {
  return dottedPath.split('.').reduce(
    (current, key) => current?.[key],
    value,
  );
}

function first(value, candidates) {
  for (const candidate of candidates) {
    const result = getAt(value, candidate);
    if (result !== undefined && result !== null) return result;
  }
  return null;
}

function preflightIdentity(report) {
  return {
    operationPath: first(report, [
      'opsPath',
      'operation.path',
      'forward.file',
      'rollback.file',
    ]),
    operationSha256: first(report, [
      'opsSha256',
      'operationSha256',
      'operation.sha256',
      'forward.sha256',
      'rollback.sha256',
    ]),
    operationCount: Number(first(report, [
      'operationCount',
      'operation.operationCount',
      'summary.operationCount',
    ])),
    snapshotPath: first(report, [
      'regions',
      'snapshot.directory',
      'sourceSnapshot.directory',
      'postSnapshot.directory',
    ]),
    snapshotSha256: first(report, [
      'regionsSnapshot.sha256',
      'snapshot.sha256',
      'sourceSnapshot.sha256',
      'postSnapshot.sha256',
      'regionsSha256',
    ]),
    orderAwareProjection: first(report, [
      'orderAwareProjection',
      'checks.orderAwareProjection',
    ]),
    passed: Number(first(report, ['passed', 'summary.passed'])),
    failed: Number(first(report, ['failed', 'summary.failed'])),
    failures: first(report, ['failures', 'summary.failures']) ?? [],
  };
}

function validateEntityGateForPackage(
  entityGate,
  forwardPath,
  forwardSha256,
  expectedPackageCount = 1,
) {
  const packages = entityGate.packages ?? [];
  const packageEntry = packages.find(
    (entry) => samePath(entry.file, forwardPath),
  ) ?? (packages.length === 1 ? packages[0] : null);
  const forceLoadAudit = entityGate.forceLoadAudit ?? {};
  const forceLoadPassed = Number(entityGate.schemaVersion) < 2 || (
    forceLoadAudit.mode === 'sparse-target-halo-batched'
    && forceLoadAudit.allRequiredChunksLoadedBeforeQueries === true
    && (forceLoadAudit.missingRequiredChunks ?? []).length === 0
    && (forceLoadAudit.cleanupErrors ?? []).length === 0
    && forceLoadAudit.allTemporaryChunksReleased === true
    && forceLoadAudit.finalSetMatchesPreExistingSet === true
  );
  return {
    passed: (
      entityGate.status === 'PASS'
      && entityGate.passed === true
      && entityGate.blockOrEntityMutation === false
      && packages.length === expectedPackageCount
      && packageEntry?.passed === true
      && packageEntry.operationSha256 === forwardSha256
      && samePath(packageEntry.file, forwardPath)
      && (packageEntry.blockers ?? []).length === 0
      && (packageEntry.queryErrors ?? []).length === 0
      && forceLoadPassed
    ),
    details: {
      schemaVersion: entityGate.schemaVersion ?? null,
      status: entityGate.status ?? null,
      packageCount: packages.length,
      blockers: packageEntry?.blockers?.length ?? null,
      queryErrors: packageEntry?.queryErrors?.length ?? null,
      forceLoadPassed,
    },
  };
}

function executionGroupCount(execution) {
  return Array.isArray(execution.sourceGroups)
    ? execution.sourceGroups.length
    : Number(execution.sourceGroups);
}

function releaseIdentityHash(identity) {
  const { sha256: ignored, ...withoutHash } = identity;
  return sha256(JSON.stringify(withoutHash));
}

function operationTargetKeys(text, label) {
  const parsed = parseOperationText(text, label);
  if (parsed.unsupported.length > 0 || parsed.commands.length > 0) {
    throw new Error(`${label} contains unsupported non-REPL operations`);
  }
  const targets = new Set();
  for (const operation of parsed.repl) {
    addBoxTargets(targets, operation.box);
  }
  return targets;
}

function validateAtomicSupplementalGroup({
  transactionPath,
  transaction,
  index,
  hashSnapshot,
}) {
  const failures = [];
  const key = transaction.transactionId ?? null;
  const fail = (reason, details = {}) => {
    failures.push({ index, key, reason, ...details });
  };
  const packageEntries = transaction.packages ?? [];
  if (
    transaction.schemaVersion !== 2
    || transaction.kind !== 'committed-atomic-supplemental-group'
    || typeof key !== 'string'
    || packageEntries.length < 2
  ) {
    fail('supplemental-group-schema-failed');
    return { failures, supplement: null };
  }
  const references = {
    sourceSnapshot: transaction.source?.snapshot,
    physicalSourceSnapshot: transaction.source?.physicalExecutionSnapshot,
    provenanceBridge: transaction.source?.provenanceBridge,
    entityGate: transaction.source?.entityGate,
    atomicTransaction: transaction.atomicTransaction?.path,
    releaseManifest: transaction.releaseManifest?.path,
    postSnapshot: transaction.postState?.snapshot,
  };
  for (const [label, reference] of Object.entries(references)) {
    if (!reference) fail(`supplemental-group-${label}-reference-missing`);
  }
  if (failures.length > 0) return { failures, supplement: null };
  const resolved = Object.fromEntries(
    Object.entries(references).map(([label, reference]) => [
      label,
      resolveInput(reference),
    ]),
  );
  for (const [label, filename] of Object.entries(resolved)) {
    if (!fs.existsSync(filename)) {
      fail(`supplemental-group-${label}-missing`, { path: relative(filename) });
    }
  }
  if (failures.length > 0) return { failures, supplement: null };

  const sourceDigest = hashSnapshot(resolved.sourceSnapshot);
  const physicalSourceDigest = hashSnapshot(resolved.physicalSourceSnapshot);
  const postDigest = hashSnapshot(resolved.postSnapshot);
  const bridge = readJson(resolved.provenanceBridge);
  const entityGate = readJson(resolved.entityGate);
  const atomicTransaction = readJson(resolved.atomicTransaction);
  const releaseManifest = readJson(resolved.releaseManifest);
  const sharedChecks = {
    committed: transaction.status === 'committed',
    sourceIdentities: (
      transaction.source?.snapshotSha256 === sourceDigest.sha256
      && transaction.source?.physicalExecutionSnapshotSha256
        === physicalSourceDigest.sha256
      && transaction.postState?.snapshotSha256 === postDigest.sha256
      && sourceDigest.sha256 !== physicalSourceDigest.sha256
    ),
    declaredArtifactHashes: (
      transaction.source?.provenanceBridgeSha256
        === sha256File(resolved.provenanceBridge)
      && transaction.source?.entityGateSha256 === sha256File(resolved.entityGate)
      && transaction.atomicTransaction?.sha256
        === sha256File(resolved.atomicTransaction)
      && transaction.releaseManifest?.sha256
        === sha256File(resolved.releaseManifest)
    ),
    provenanceBridge: (
      bridge.schemaVersion === 1
      && bridge.status === 'PASS'
      && bridge.passed === true
      && bridge.scope === 'exact-package-target-source-guard-equivalence'
      && bridge.fullSnapshotEqualityClaimed === false
      && samePath(bridge.logicalSourceSnapshot?.path, resolved.sourceSnapshot)
      && bridge.logicalSourceSnapshot?.sha256 === sourceDigest.sha256
      && samePath(
        bridge.physicalExecutionSnapshot?.path,
        resolved.physicalSourceSnapshot,
      )
      && bridge.physicalExecutionSnapshot?.sha256 === physicalSourceDigest.sha256
      && bridge.packages?.length === packageEntries.length
      && bridge.crossPackageTargetOverlap === 0
    ),
    atomicTransaction: (
      atomicTransaction.schemaVersion === 1
      && atomicTransaction.transactionId === key
      && atomicTransaction.status === 'committed-pending-post-qa'
      && atomicTransaction.packages?.length === packageEntries.length
      && samePath(atomicTransaction.releaseManifest, resolved.releaseManifest)
      && atomicTransaction.releaseManifestSha256
        === sha256File(resolved.releaseManifest)
    ),
    releaseManifest: (
      releaseManifest.schemaVersion === 1
      && releaseManifest.transactionId === key
      && releaseManifest.packages?.length === packageEntries.length
    ),
    entityGate: (
      entityGate.schemaVersion === 2
      && entityGate.status === 'PASS'
      && entityGate.passed === true
      && entityGate.packages?.length === packageEntries.length
      && entityGate.forceLoadAudit?.finalSetMatchesPreExistingSet === true
    ),
  };
  for (const [check, passed] of Object.entries(sharedChecks)) {
    if (!passed) fail(`supplemental-group-${check}-failed`);
  }

  const allTargets = new Set();
  const packages = [];
  let operationCount = 0;
  for (const [packageIndex, packageEntry] of packageEntries.entries()) {
    const packageKey = packageEntry.key;
    const packageReferences = {
      forward: packageEntry.forward,
      rollback: packageEntry.rollback,
      logicalSourcePreflight: packageEntry.logicalSourcePreflight,
      sourcePreflight: packageEntry.sourcePreflight,
      execution: packageEntry.execution,
      rollbackPreflight: packageEntry.rollbackPreflight,
    };
    for (const [label, reference] of Object.entries(packageReferences)) {
      if (!reference) {
        fail('supplemental-group-package-reference-missing', {
          packageIndex,
          packageKey,
          label,
        });
      }
    }
    if (failures.some(
      (entry) => entry.packageIndex === packageIndex,
    )) continue;
    const packageResolved = Object.fromEntries(
      Object.entries(packageReferences).map(([label, reference]) => [
        label,
        resolveInput(reference),
      ]),
    );
    for (const [label, filename] of Object.entries(packageResolved)) {
      if (!fs.existsSync(filename)) {
        fail('supplemental-group-package-artifact-missing', {
          packageIndex,
          packageKey,
          label,
          path: relative(filename),
        });
      }
    }
    if (failures.some(
      (entry) => entry.packageIndex === packageIndex,
    )) continue;

    const forwardArtifact = artifact(packageResolved.forward);
    const rollbackArtifact = artifact(packageResolved.rollback);
    const logicalPreflightArtifact = artifact(
      packageResolved.logicalSourcePreflight,
    );
    const sourcePreflightArtifact = artifact(packageResolved.sourcePreflight);
    const executionArtifact = artifact(packageResolved.execution);
    const rollbackPreflightArtifact = artifact(packageResolved.rollbackPreflight);
    const exact = verifyExactOperationBijection(
      fs.readFileSync(packageResolved.forward, 'utf8'),
      fs.readFileSync(packageResolved.rollback, 'utf8'),
    );
    const currentOperationCount = exact.forwardReplGroups;
    const logicalPreflight = readJson(packageResolved.logicalSourcePreflight);
    const sourcePreflight = readJson(packageResolved.sourcePreflight);
    const execution = readJson(packageResolved.execution);
    const rollbackPreflight = readJson(packageResolved.rollbackPreflight);
    const logicalIdentity = preflightIdentity(logicalPreflight);
    const sourceIdentity = preflightIdentity(sourcePreflight);
    const rollbackIdentity = preflightIdentity(rollbackPreflight);
    const atomicPackage = atomicTransaction.packages.find(
      (entry) => entry.key === packageKey,
    );
    const manifestPackage = releaseManifest.packages.find(
      (entry) => entry.key === packageKey,
    );
    const bridgePackage = bridge.packages.find(
      (entry) => entry.key === packageKey,
    );
    const entityAcceptance = validateEntityGateForPackage(
      entityGate,
      packageResolved.forward,
      forwardArtifact.sha256,
      packageEntries.length,
    );
    let targetOverlap = 0;
    try {
      for (const target of operationTargetKeys(
        fs.readFileSync(packageResolved.forward, 'utf8'),
        packageKey,
      )) {
        if (allTargets.has(target)) targetOverlap += 1;
        allTargets.add(target);
      }
    } catch (error) {
      fail('supplemental-group-package-target-parse-failed', {
        packageIndex,
        packageKey,
        message: error.message,
      });
    }
    const checks = {
      committed: packageEntry.status === 'committed',
      packageHashes: (
        packageEntry.forwardSha256 === forwardArtifact.sha256
        && packageEntry.rollbackSha256 === rollbackArtifact.sha256
      ),
      exactInverse: exact.passed,
      operationCount: (
        currentOperationCount > 0
        && packageEntry.operationCount === currentOperationCount
        && packageEntry.sourceGroups === currentOperationCount
        && packageEntry.successfulGroups === currentOperationCount
        && packageEntry.failedGroups === 0
        && packageEntry.changedCommands === currentOperationCount
        && packageEntry.noopCommands === 0
      ),
      sourceEquivalence: (
        logicalPreflight.status === 'PASS'
        && logicalIdentity.orderAwareProjection === true
        && samePath(logicalIdentity.operationPath, packageResolved.forward)
        && logicalIdentity.operationSha256 === forwardArtifact.sha256
        && logicalIdentity.operationCount === currentOperationCount
        && logicalIdentity.passed === currentOperationCount
        && logicalIdentity.failed === 0
        && samePath(logicalIdentity.snapshotPath, resolved.sourceSnapshot)
        && logicalIdentity.snapshotSha256 === sourceDigest.sha256
        && sourcePreflight.status === 'PASS'
        && sourceIdentity.orderAwareProjection === true
        && samePath(sourceIdentity.operationPath, packageResolved.forward)
        && sourceIdentity.operationSha256 === forwardArtifact.sha256
        && sourceIdentity.operationCount === currentOperationCount
        && sourceIdentity.passed === currentOperationCount
        && sourceIdentity.failed === 0
        && samePath(
          sourceIdentity.snapshotPath,
          resolved.physicalSourceSnapshot,
        )
        && sourceIdentity.snapshotSha256 === physicalSourceDigest.sha256
      ),
      execution: (
        execution.status === 'complete'
        && execution.operationRole === 'forward'
        && execution.strictNoop === true
        && execution.operationSha256 === forwardArtifact.sha256
        && executionGroupCount(execution) === currentOperationCount
        && execution.successfulGroups === currentOperationCount
        && execution.failedGroups === 0
        && execution.failedCommands === 0
        && execution.noopCommands === 0
      ),
      rollbackPreflight: (
        rollbackPreflight.status === 'PASS'
        && rollbackIdentity.orderAwareProjection === true
        && samePath(rollbackIdentity.operationPath, packageResolved.rollback)
        && rollbackIdentity.operationSha256 === rollbackArtifact.sha256
        && rollbackIdentity.operationCount === exact.rollbackReplGroups
        && rollbackIdentity.passed === exact.rollbackReplGroups
        && rollbackIdentity.failed === 0
        && samePath(rollbackIdentity.snapshotPath, resolved.postSnapshot)
        && rollbackIdentity.snapshotSha256 === postDigest.sha256
      ),
      entityGate: entityAcceptance.passed,
      atomicPackage: (
        atomicPackage?.status === 'committed'
        && samePath(atomicPackage.forward, packageResolved.forward)
        && samePath(atomicPackage.rollback, packageResolved.rollback)
        && atomicPackage.forwardSha256 === forwardArtifact.sha256
        && atomicPackage.rollbackSha256 === rollbackArtifact.sha256
        && samePath(atomicPackage.executionReport, packageResolved.execution)
      ),
      manifestPackage: (
        samePath(manifestPackage?.forward, packageResolved.forward)
        && samePath(manifestPackage?.rollback, packageResolved.rollback)
      ),
      bridgePackage: (
        bridgePackage?.operationCount === currentOperationCount
        && bridgePackage.targetCellCount === exact.uniqueTargetCells
        && bridgePackage.forward?.sha256 === forwardArtifact.sha256
        && bridgePackage.logicalSourcePreflight?.sha256
          === logicalPreflightArtifact.sha256
        && bridgePackage.physicalSourcePreflight?.sha256
          === sourcePreflightArtifact.sha256
        && bridgePackage.logicalAndPhysicalGuardsEquivalent === true
      ),
      noCrossPackageTargetOverlap: targetOverlap === 0,
    };
    for (const [check, passed] of Object.entries(checks)) {
      if (!passed) {
        fail(`supplemental-group-package-${check}-failed`, {
          packageIndex,
          packageKey,
        });
      }
    }
    operationCount += currentOperationCount;
    packages.push({
      index: packageIndex,
      key: packageKey,
      forward: forwardArtifact,
      rollback: rollbackArtifact,
      logicalSourcePreflight: logicalPreflightArtifact,
      sourcePreflight: sourcePreflightArtifact,
      execution: executionArtifact,
      rollbackPoststatePreflight: rollbackPreflightArtifact,
      operationCount: currentOperationCount,
      exactBijection: exact,
      checks,
    });
  }
  if (
    transaction.postState?.rollbackGuardsPassed !== operationCount
    || transaction.postState?.rollbackGuardsFailed !== 0
    || transaction.acceptance?.operationCount !== operationCount
    || transaction.acceptance?.packageCount !== packages.length
    || transaction.acceptance?.crossPackageTargetOverlap !== 0
    || bridge.operationGroupCount !== operationCount
    || bridge.uniqueTargetCellCount !== allTargets.size
  ) {
    fail('supplemental-group-cardinality-failed');
  }
  return {
    failures,
    supplement: {
      index,
      key,
      kind: transaction.kind,
      transaction: artifact(transactionPath),
      atomicTransaction: artifact(resolved.atomicTransaction),
      provenanceBridge: artifact(resolved.provenanceBridge),
      releaseManifest: artifact(resolved.releaseManifest),
      liveEntityGate: artifact(resolved.entityGate),
      sourceSnapshot: snapshotArtifact(resolved.sourceSnapshot, sourceDigest),
      physicalSourceSnapshot: snapshotArtifact(
        resolved.physicalSourceSnapshot,
        physicalSourceDigest,
      ),
      postSnapshot: snapshotArtifact(resolved.postSnapshot, postDigest),
      packageCount: packages.length,
      operationCount,
      packages,
      checks: sharedChecks,
    },
  };
}

/**
 * Validate an ordered sequence of committed supplements.
 *
 * A supplement ledger is not trusted merely because it says "committed".
 * Every referenced operation, execution report, source preflight, entity gate,
 * post snapshot, and rollback preflight is re-read and hash/identity checked.
 * A schema-v2 atomic group may contain multiple disjoint packages only when it
 * also binds both sides of an explicit target-equivalence provenance bridge.
 * Adjacent logical source/post snapshot identities must still match exactly.
 */
export function validateSupplementalReleaseChain({
  transactionPaths = [],
  basePostRegions = null,
  basePostSha256 = null,
  finalPostRegions,
  finalPostSha256,
}) {
  const failures = [];
  const supplements = [];
  const seenKeys = new Set();
  const snapshotCache = new Map();
  const hashSnapshot = (directory) => {
    const resolved = resolveInput(directory);
    if (!snapshotCache.has(resolved)) {
      snapshotCache.set(resolved, hashSnapshotDirectory(resolved));
    }
    return snapshotCache.get(resolved);
  };
  const fail = (index, key, reason, details = {}) => {
    failures.push({ index, key: key ?? null, reason, ...details });
  };

  for (const [index, rawTransactionPath] of transactionPaths.entries()) {
    const transactionPath = resolveInput(rawTransactionPath);
    if (!fs.existsSync(transactionPath)) {
      fail(index, null, 'supplemental-transaction-missing', {
        path: relative(transactionPath),
      });
      continue;
    }
    const transaction = readJson(transactionPath);
    if (
      transaction.schemaVersion === 2
      && transaction.kind === 'committed-atomic-supplemental-group'
    ) {
      const grouped = validateAtomicSupplementalGroup({
        transactionPath,
        transaction,
        index,
        hashSnapshot,
      });
      failures.push(...grouped.failures);
      if (grouped.supplement) {
        if (seenKeys.has(grouped.supplement.key)) {
          fail(index, grouped.supplement.key, 'duplicate-supplemental-package-key');
        }
        seenKeys.add(grouped.supplement.key);
        supplements.push(grouped.supplement);
      }
      continue;
    }
    const packages = transaction.packages ?? [];
    const packageEntry = packages.length === 1 ? packages[0] : null;
    const key = packageEntry?.key ?? null;
    if (packages.length !== 1 || !key) {
      fail(index, key, 'supplemental-package-cardinality');
      continue;
    }
    if (seenKeys.has(key)) fail(index, key, 'duplicate-supplemental-package-key');
    seenKeys.add(key);

    const references = {
      forward: packageEntry.forward,
      rollback: packageEntry.rollback,
      execution: packageEntry.execution ?? packageEntry.executionReport,
      sourcePreflight:
        transaction.source?.preflight
        ?? transaction.preconditions?.sourcePreflight,
      entityGate:
        transaction.source?.entityGate
        ?? transaction.preconditions?.entityGate,
      rollbackPreflight: transaction.postState?.rollbackPreflight,
      sourceSnapshot:
        transaction.source?.snapshot
        ?? transaction.preconditions?.sourceSnapshot,
      postSnapshot: transaction.postState?.snapshot,
    };
    for (const [label, reference] of Object.entries(references)) {
      if (!reference && label !== 'sourceSnapshot') {
        fail(index, key, `supplemental-${label}-reference-missing`);
      }
    }
    if (failures.some((entry) => entry.index === index)) continue;

    const resolved = Object.fromEntries(
      Object.entries(references)
        .filter(([, reference]) => reference)
        .map(([label, reference]) => [
          label,
          resolveInput(reference),
        ]),
    );
    for (const [label, filename] of Object.entries(resolved)) {
      if (!fs.existsSync(filename)) {
        fail(index, key, `supplemental-${label}-missing`, {
          path: relative(filename),
        });
      }
    }
    if (failures.some((entry) => entry.index === index)) continue;

    const forwardArtifact = artifact(resolved.forward);
    const rollbackArtifact = artifact(resolved.rollback);
    const executionArtifact = artifact(resolved.execution);
    const sourcePreflightArtifact = artifact(resolved.sourcePreflight);
    const entityGateArtifact = artifact(resolved.entityGate);
    const rollbackPreflightArtifact = artifact(resolved.rollbackPreflight);
    const execution = readJson(resolved.execution);
    const sourcePreflight = readJson(resolved.sourcePreflight);
    const entityGate = readJson(resolved.entityGate);
    const rollbackPreflight = readJson(resolved.rollbackPreflight);
    const sourceIdentity = preflightIdentity(sourcePreflight);
    resolved.sourceSnapshot = resolveInput(
      references.sourceSnapshot ?? sourceIdentity.snapshotPath,
    );
    if (!sourceIdentity.snapshotPath || !fs.existsSync(resolved.sourceSnapshot)) {
      fail(index, key, 'supplemental-sourceSnapshot-missing', {
        path: sourceIdentity.snapshotPath ?? null,
      });
      continue;
    }
    const exact = verifyExactOperationBijection(
      fs.readFileSync(resolved.forward, 'utf8'),
      fs.readFileSync(resolved.rollback, 'utf8'),
    );
    const operationCount = exact.forwardReplGroups;
    const rollbackIdentity = preflightIdentity(rollbackPreflight);
    const sourceDigest = hashSnapshot(resolved.sourceSnapshot);
    const postDigest = hashSnapshot(resolved.postSnapshot);
    const declaredSourceSha256 =
      transaction.source?.snapshotSha256
      ?? transaction.preconditions?.sourceSnapshotSha256
      ?? sourceIdentity.snapshotSha256;
    const declaredPostSha256 =
      transaction.postState?.snapshotSha256
      ?? rollbackIdentity.snapshotSha256;
    const entityAcceptance = validateEntityGateForPackage(
      entityGate,
      resolved.forward,
      forwardArtifact.sha256,
    );

    const checks = {
      committed: (
        transaction.status === 'committed'
        && packageEntry.status === 'committed'
      ),
      packageHashes: (
        packageEntry.forwardSha256 === forwardArtifact.sha256
        && (
          packageEntry.rollbackSha256 == null
          || packageEntry.rollbackSha256 === rollbackArtifact.sha256
        )
        && rollbackIdentity.operationSha256 === rollbackArtifact.sha256
      ),
      exactInverse: exact.passed,
      execution: (
        execution.status === 'complete'
        && execution.operationRole === 'forward'
        && execution.strictNoop === true
        && execution.operationSha256 === forwardArtifact.sha256
        && executionGroupCount(execution) === operationCount
        && execution.successfulGroups === operationCount
        && execution.failedGroups === 0
        && execution.failedCommands === 0
        && execution.noopCommands === 0
        && packageEntry.sourceGroups === operationCount
        && packageEntry.successfulGroups === operationCount
        && packageEntry.failedGroups === 0
        && packageEntry.changedCommands === operationCount
        && packageEntry.noopCommands === 0
      ),
      sourcePreflight: (
        sourcePreflight.status === 'PASS'
        && sourceIdentity.orderAwareProjection === true
        && samePath(sourceIdentity.operationPath, resolved.forward)
        && sourceIdentity.operationSha256 === forwardArtifact.sha256
        && sourceIdentity.operationCount === operationCount
        && sourceIdentity.passed === operationCount
        && sourceIdentity.failed === 0
        && sourceIdentity.failures.length === 0
        && samePath(sourceIdentity.snapshotPath, resolved.sourceSnapshot)
        && sourceIdentity.snapshotSha256 === sourceDigest.sha256
        && declaredSourceSha256 === sourceDigest.sha256
      ),
      entityGate: entityAcceptance.passed,
      rollbackPreflight: (
        rollbackPreflight.status === 'PASS'
        && rollbackIdentity.orderAwareProjection === true
        && samePath(rollbackIdentity.operationPath, resolved.rollback)
        && rollbackIdentity.operationSha256 === rollbackArtifact.sha256
        && rollbackIdentity.operationCount === exact.rollbackReplGroups
        && rollbackIdentity.passed === exact.rollbackReplGroups
        && rollbackIdentity.failed === 0
        && rollbackIdentity.failures.length === 0
        && samePath(rollbackIdentity.snapshotPath, resolved.postSnapshot)
        && rollbackIdentity.snapshotSha256 === postDigest.sha256
        && declaredPostSha256 === postDigest.sha256
        && transaction.postState?.rollbackGuardsPassed
          === exact.rollbackReplGroups
        && transaction.postState?.rollbackGuardsFailed === 0
      ),
    };
    for (const [check, passed] of Object.entries(checks)) {
      if (!passed) fail(index, key, `supplemental-${check}-failed`);
    }
    supplements.push({
      index,
      key,
      transaction: artifact(transactionPath),
      forward: forwardArtifact,
      rollback: rollbackArtifact,
      execution: executionArtifact,
      sourcePreflight: sourcePreflightArtifact,
      liveEntityGate: entityGateArtifact,
      rollbackPoststatePreflight: rollbackPreflightArtifact,
      sourceSnapshot: snapshotArtifact(resolved.sourceSnapshot, sourceDigest),
      postSnapshot: snapshotArtifact(resolved.postSnapshot, postDigest),
      operationCount,
      exactBijection: exact,
      checks,
    });
  }

  if (supplements.length > 0) {
    const firstSupplement = supplements[0];
    if (
      !basePostRegions
      || !samePath(firstSupplement.sourceSnapshot.path, basePostRegions)
      || firstSupplement.sourceSnapshot.sha256 !== basePostSha256
    ) {
      fail(0, firstSupplement.key, 'base-to-supplement-snapshot-gap', {
        expectedPath: basePostRegions ? relative(resolveInput(basePostRegions)) : null,
        expectedSha256: basePostSha256,
        actualPath: firstSupplement.sourceSnapshot.path,
        actualSha256: firstSupplement.sourceSnapshot.sha256,
      });
    }
    for (let index = 1; index < supplements.length; index += 1) {
      const previous = supplements[index - 1];
      const current = supplements[index];
      if (
        !samePath(previous.postSnapshot.path, current.sourceSnapshot.path)
        || previous.postSnapshot.sha256 !== current.sourceSnapshot.sha256
      ) {
        fail(index, current.key, 'supplemental-snapshot-chain-gap', {
          previousPost: previous.postSnapshot,
          currentSource: current.sourceSnapshot,
        });
      }
    }
    const terminal = supplements.at(-1).postSnapshot;
    if (
      !samePath(terminal.path, finalPostRegions)
      || terminal.sha256 !== finalPostSha256
    ) {
      fail(
        supplements.length - 1,
        supplements.at(-1).key,
        'supplemental-terminal-snapshot-mismatch',
        {
          declaredTerminal: terminal,
          suppliedTerminal: {
            path: relative(resolveInput(finalPostRegions)),
            sha256: finalPostSha256,
          },
        },
      );
    }
  }

  return {
    passed: failures.length === 0,
    supplements,
    failures,
  };
}

function snapshotHash(value) {
  return first(value, [
    'postSnapshot.sha256',
    'postReleaseSnapshot.sha256',
    'snapshot.sha256',
    'sourceSnapshot.sha256',
    'snapshotSha256',
    'postSnapshotSha256',
  ]);
}

function collectPackageHashes(value) {
  const hashes = new Set();
  const candidates = [
    value?.operationSha256,
    value?.forwardSha256,
    value?.packageSha256,
  ];
  for (const candidate of candidates) {
    if (/^[a-f0-9]{64}$/.test(String(candidate ?? ''))) hashes.add(candidate);
  }
  const packageHashes = value?.packageHashes;
  if (Array.isArray(packageHashes)) {
    for (const entry of packageHashes) {
      const candidate = typeof entry === 'string' ? entry : entry?.sha256;
      if (/^[a-f0-9]{64}$/.test(String(candidate ?? ''))) hashes.add(candidate);
    }
  } else if (packageHashes && typeof packageHashes === 'object') {
    for (const entry of Object.values(packageHashes)) {
      const candidate = typeof entry === 'string' ? entry : entry?.sha256;
      if (/^[a-f0-9]{64}$/.test(String(candidate ?? ''))) hashes.add(candidate);
    }
  }
  return [...hashes];
}

function routeEntries(report) {
  return report.tests ?? report.routes ?? report.results ?? [];
}

function routeEntryPassed(entry) {
  const statusPassed = entry.passed === true
    || String(entry.status ?? '').toUpperCase() === 'PASS';
  const directions = entry.directions ?? [];
  const directionPassed = directions.length === 0 || (
    directions.length >= 2
    && directions.every((direction) => (
      direction.passed === true
      && (direction.violations ?? []).length === 0
      && (direction.movementPolicyViolations ?? []).length === 0
      && (direction.legs ?? []).every((leg) => (
        leg.reached === true
        && (leg.movementPolicyViolations ?? []).length === 0
      ))
    ))
  );
  return statusPassed && directionPassed;
}

export function evaluatePostReleaseRouteQa(
  routeQa,
  {
    postRegions,
    postSha256,
    forwardSha256,
    releaseForwardSha256s = [forwardSha256],
  },
) {
  const routes = routeEntries(routeQa);
  const routeHashes = collectPackageHashes(routeQa);
  const routePostHash = snapshotHash(routeQa);
  const routePostDirectory = first(routeQa, [
    'postSnapshot.directory',
    'postReleaseSnapshot.directory',
    'snapshot.directory',
    'postSnapshot.path',
    'postReleaseSnapshot.path',
    'snapshot.path',
  ]);
  const routeSummaryFailed = routeQa.summary?.failed;
  const projectionAbsent = routeQa.projection === null
    || routeQa.projection === undefined;
  const acceptanceClassAsBuilt = routeQa.acceptanceClass
    === 'IMMUTABLE_POST_SNAPSHOT_OFFLINE_GEOMETRY_ACCEPTED_LIVE_OBSERVATION_PENDING';
  const explicitlyComplete =
    routeQa.completeForTownExpansionOfflineAcceptance === true;
  const immutablePostIdentityBound = (
    routePostHash === postSha256
    && samePath(routePostDirectory, postRegions)
  );
  const matchedPackageHashes = releaseForwardSha256s.filter(
    (candidate) => routeHashes.includes(candidate),
  );
  const packageHashBound = matchedPackageHashes.length > 0;
  const readOnlyNoMutation = (
    routeQa.readOnly === true
    && routeQa.liveWorldMutated === false
    && routeQa.databaseMutated === false
  );
  const passed = (
    routeQa.status === 'PASS'
    && routeQa.passed !== false
    && projectionAbsent
    && acceptanceClassAsBuilt
    && explicitlyComplete
    && immutablePostIdentityBound
    && packageHashBound
    && readOnlyNoMutation
    && routes.length > 0
    && routes.every(routeEntryPassed)
    && (routeSummaryFailed === undefined || routeSummaryFailed === 0)
  );
  return {
    passed,
    routes,
    details: {
      status: routeQa.status ?? null,
      acceptanceClass: routeQa.acceptanceClass ?? null,
      projectionAbsent,
      explicitlyComplete,
      readOnlyNoMutation,
      postSnapshotDirectory: routePostDirectory ?? null,
      postSnapshotSha256: routePostHash,
      immutablePostIdentityBound,
      packageHashBound,
      matchedPackageHashes,
      routeCount: routes.length,
      passedRoutes: routes.filter(routeEntryPassed).length,
      failedSummary: routeSummaryFailed ?? null,
    },
  };
}

function captureEntries(report) {
  return report.captures
    ?? report.media?.captures
    ?? report.results
    ?? [];
}

export function resolveEvidenceOutput(reportPath, output, report = null) {
  if (!output) return null;
  const fromRoot = resolveInput(output);
  if (fs.existsSync(fromRoot)) return fromRoot;
  const rendererReference = report?.rendererReport?.path;
  if (rendererReference) {
    const rendererFromRoot = resolveInput(rendererReference);
    const rendererPath = fs.existsSync(rendererFromRoot)
      ? rendererFromRoot
      : path.resolve(path.dirname(reportPath), rendererReference);
    if (fs.existsSync(rendererPath)) {
      const fromRenderer = path.resolve(
        path.dirname(rendererPath),
        output,
      );
      if (fs.existsSync(fromRenderer)) return fromRenderer;
    }
  }
  return path.resolve(path.dirname(reportPath), output);
}

function renderDetails(details) {
  if (!details || Object.keys(details).length === 0) return '';
  return Object.entries(details)
    .filter(([, value]) => (
      ['string', 'number', 'boolean'].includes(typeof value)
      || value === null
    ))
    .map(([key, value]) => `${key}=${String(value)}`)
    .join('; ');
}

export function renderTownExpansionPostReleaseMarkdown(report) {
  const lines = [
    '# Town Expansion R1 Post-Release QA',
    '',
    `- Decision: **${report.decision.release}**`,
    `- Status: **${report.status}**`,
    `- Read-only verifier: **${report.readOnly}**`,
    `- Generated: \`${report.generatedAtUtc}\``,
    `- Pre snapshot: \`${report.snapshots.pre.sha256}\``,
    `- Post snapshot: \`${report.snapshots.post.sha256}\``,
    `- Consolidated release identity: \`${
      report.releaseIdentity?.sha256 ?? 'not emitted'
    }\``,
    `- Supplemental packages: **${
      report.totals.supplementalPackages ?? 0
    }**`,
    `- Unique target cells: **${report.totals.uniqueTargetCells}**`,
    `- REPL groups: **${report.totals.forwardReplGroups} forward / ${report.totals.rollbackReplGroups} rollback**`,
    '',
    '## Gates',
    '',
    '| Gate | Result | Details |',
    '|---|---:|---|',
    ...report.gates.map((entry) => (
      `| \`${entry.id}\` | ${entry.passed ? 'PASS' : 'FAIL'}`
      + ` | ${renderDetails(entry.details).replaceAll('|', '\\|')} |`
    )),
    '',
    '## Evidence',
    '',
    '| Artifact | SHA-256 | Path |',
    '|---|---|---|',
    ...Object.entries(report.artifacts)
      .filter(([, value]) => value)
      .map(([name, value]) => (
        `| ${name} | \`${value.sha256}\` | \`${value.path}\` |`
      )),
    '',
    '## Decision',
    '',
    report.decision.rationale,
    '',
  ];
  if (report.failures.length > 0) {
    lines.push(
      '### Failed gates',
      '',
      ...report.failures.map((entry) => `- \`${entry.id}\``),
      '',
    );
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const options = { supplementalTransactions: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--pre') options.pre = argv[++index];
    else if (arg === '--post') options.post = argv[++index];
    else if (arg === '--transaction') options.transaction = argv[++index];
    else if (arg === '--supplemental-transaction') {
      options.supplementalTransactions.push(argv[++index]);
    }
    else if (arg === '--live-entity-gate') options.liveEntityGate = argv[++index];
    else if (arg === '--rollback-poststate-preflight') {
      options.rollbackPoststatePreflight = argv[++index];
    } else if (arg === '--rollback-transition-policy') {
      options.rollbackTransitionPolicy = argv[++index];
    } else if (arg === '--route-qa') options.routeQa = argv[++index];
    else if (arg === '--design-report') options.designReport = argv[++index];
    else if (arg === '--manifest') options.manifest = argv[++index];
    else if (arg === '--source-equivalence-preflight') {
      options.sourceEquivalencePreflight = argv[++index];
    }
    else if (arg === '--media-report') options.mediaReport = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown') options.markdown = argv[++index];
    else if (arg === '--contract') options.contract = true;
    else if (arg === '--self-test') options.selfTest = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

function requiredPath(options, key, flag) {
  if (!options[key]) {
    throw new Error(`missing ${flag}; use --contract for the evidence contract`);
  }
  const filename = resolveInput(options[key]);
  if (!fs.existsSync(filename)) throw new Error(`${flag} does not exist: ${filename}`);
  return filename;
}

function runSelfTest() {
  const forward = [
    '# synthetic forward',
    'REPL 0 64 0 1 64 0 minecraft:stone minecraft:air',
    'REPL 2 64 0 2 64 0 minecraft:air minecraft:oak_planks',
    '',
  ].join('\n');
  const rollback = [
    '# synthetic rollback',
    'REPL 2 64 0 2 64 0 minecraft:oak_planks minecraft:air',
    'REPL 0 64 0 1 64 0 minecraft:air minecraft:stone',
    '',
  ].join('\n');
  const passing = verifyExactOperationBijection(forward, rollback);
  const failing = verifyExactOperationBijection(
    forward,
    rollback.replace('minecraft:stone', 'minecraft:dirt'),
  );
  const passed = (
    passing.passed
    && passing.uniqueTargetCells === 3
    && passing.forwardReplGroups === 2
    && passing.rollbackReplGroups === 2
    && !failing.passed
  );
  process.stdout.write(`${JSON.stringify({
    status: passed ? 'PASS' : 'FAIL',
    passing,
    negativeControlPassed: !failing.passed,
  }, null, 2)}\n`);
  return passed;
}

export async function verifyTownExpansionPostRelease(rawOptions) {
  const options = { ...rawOptions };
  const preRegions = requiredPath(options, 'pre', '--pre');
  const postRegions = requiredPath(options, 'post', '--post');
  const transactionPath = requiredPath(
    options,
    'transaction',
    '--transaction',
  );
  const liveEntityGatePath = requiredPath(
    options,
    'liveEntityGate',
    '--live-entity-gate',
  );
  const rollbackPreflightPath = requiredPath(
    options,
    'rollbackPoststatePreflight',
    '--rollback-poststate-preflight',
  );
  const rollbackTransitionPolicyPath = requiredPath(
    options,
    'rollbackTransitionPolicy',
    '--rollback-transition-policy',
  );
  const routeQaPath = requiredPath(options, 'routeQa', '--route-qa');
  const designReportPath = requiredPath(
    options,
    'designReport',
    '--design-report',
  );
  const manifestPath = requiredPath(options, 'manifest', '--manifest');
  const sourceEquivalencePreflightPath = options.sourceEquivalencePreflight
    ? requiredPath(
      options,
      'sourceEquivalencePreflight',
      '--source-equivalence-preflight',
    )
    : null;
  const mediaReportPath = options.mediaReport
    ? requiredPath(options, 'mediaReport', '--media-report')
    : null;
  const supplementalTransactionPaths = (
    options.supplementalTransactions ?? []
  ).map((filename, index) => {
    const resolved = resolveInput(filename);
    if (!fs.existsSync(resolved)) {
      throw new Error(
        `--supplemental-transaction ${index + 1} does not exist: ${resolved}`,
      );
    }
    return resolved;
  });

  const designReport = readJson(designReportPath);
  const manifest = readJson(manifestPath);
  const transaction = readJson(transactionPath);
  const liveEntityGate = readJson(liveEntityGatePath);
  const rollbackPreflight = readJson(rollbackPreflightPath);
  const sourceEquivalencePreflight = sourceEquivalencePreflightPath
    ? readJson(sourceEquivalencePreflightPath)
    : null;
  const routeQa = readJson(routeQaPath);
  const mediaReport = mediaReportPath ? readJson(mediaReportPath) : null;

  const forwardPath = resolveInput(
    manifest.combinedTransaction?.forward?.file
      ?? designReport.operations?.file,
  );
  const rollbackPath = resolveInput(
    manifest.combinedTransaction?.rollback?.file
      ?? designReport.rollback?.file,
  );
  if (!fs.existsSync(forwardPath)) throw new Error(`forward file missing: ${forwardPath}`);
  if (!fs.existsSync(rollbackPath)) throw new Error(`rollback file missing: ${rollbackPath}`);

  const forwardArtifact = artifact(forwardPath);
  const rollbackArtifact = artifact(rollbackPath);
  const preDigest = hashSnapshotDirectory(preRegions);
  const postDigest = hashSnapshotDirectory(postRegions);
  const baseRollbackIdentity = preflightIdentity(rollbackPreflight);
  if (
    supplementalTransactionPaths.length > 0
    && !baseRollbackIdentity.snapshotPath
  ) {
    throw new Error(
      'supplemental release chain requires the base rollback preflight '
      + 'to declare its exact accepted post snapshot directory',
    );
  }
  const basePostRegions = supplementalTransactionPaths.length > 0
    ? resolveInput(baseRollbackIdentity.snapshotPath)
    : postRegions;
  if (!fs.existsSync(basePostRegions)) {
    throw new Error(
      `base post snapshot from rollback preflight does not exist: ${basePostRegions}`,
    );
  }
  const basePostDigest = supplementalTransactionPaths.length > 0
    ? hashSnapshotDirectory(basePostRegions)
    : postDigest;
  const supplementalChain = validateSupplementalReleaseChain({
    transactionPaths: supplementalTransactionPaths,
    basePostRegions,
    basePostSha256: basePostDigest.sha256,
    finalPostRegions: postRegions,
    finalPostSha256: postDigest.sha256,
  });
  const exact = verifyExactOperationBijection(
    fs.readFileSync(forwardPath, 'utf8'),
    fs.readFileSync(rollbackPath, 'utf8'),
  );
  const rollbackParsed = parseOperationText(
    fs.readFileSync(rollbackPath, 'utf8'),
    'rollback',
  );
  const rollbackTransitionPolicy = loadNaturalStateTransitionPolicy(
    rollbackTransitionPolicyPath,
    {
      operationSha256: rollbackArtifact.sha256,
      operationPath: rollbackPath,
      operations: rollbackParsed.repl,
    },
  );

  const gates = [];
  const gate = (id, passed, details = {}) => {
    gates.push({ id, passed: Boolean(passed), details });
  };

  const manifestForward = manifest.combinedTransaction?.forward ?? {};
  const manifestRollback = manifest.combinedTransaction?.rollback ?? {};
  const reportForward = designReport.operations ?? {};
  const reportRollback = designReport.rollback ?? {};
  const manifestChecks = Object.values(manifest.checks ?? {});
  const designSafetyChecks = [
    'noMissingSnapshotCells',
    'noProtectedBlockEntityTargets',
    'noUnreviewedCrossScopeInterfaces',
    'exactStateGuards',
    'exactRollback',
    'managerValeExactModuleIntegrated',
    'managerValeZeroSharedTargetIntersections',
    'managerValeCommissionBeforeRetire',
  ];
  gate('design-report-and-manifest-hashes', (
    manifest.packageId === PACKAGE_ID
    && designReport.packageId === PACKAGE_ID
    && samePath(manifestForward.file, forwardPath)
    && samePath(manifestRollback.file, rollbackPath)
    && samePath(reportForward.file, forwardPath)
    && samePath(reportRollback.file, rollbackPath)
    && samePath(
      manifest.combinedTransaction?.report?.file,
      designReportPath,
    )
    && samePath(designReport.ownershipManifest?.file, manifestPath)
    && manifestForward.sha256 === forwardArtifact.sha256
    && manifestRollback.sha256 === rollbackArtifact.sha256
    && reportForward.sha256 === forwardArtifact.sha256
    && reportRollback.sha256 === rollbackArtifact.sha256
    && manifestChecks.length > 0
    && manifestChecks.every(Boolean)
    && designSafetyChecks.every(
      (check) => designReport.acceptance?.[check] === true,
    )
  ), {
    manifestPackageId: manifest.packageId,
    reportPackageId: designReport.packageId,
    forwardSha256: forwardArtifact.sha256,
    rollbackSha256: rollbackArtifact.sha256,
    manifestChecks: manifestChecks.length,
    requiredDesignChecks: designSafetyChecks.length,
  });

  const expectedTargetCells = Number(
    manifestForward.targetCells ?? reportForward.targetCells,
  );
  const expectedOperationGroups = Number(
    manifestForward.operationGroups ?? reportForward.operationGroups,
  );
  const ownerTargetCells = (manifest.owners ?? [])
    .reduce((sum, owner) => sum + Number(owner.targetCells ?? 0), 0);
  gate('exact-forward-rollback-target-bijection', (
    exact.passed
    && exact.uniqueTargetCells === expectedTargetCells
    && exact.forwardReplGroups === expectedOperationGroups
    && exact.rollbackReplGroups === Number(
      manifestRollback.operationGroups ?? reportRollback.operationGroups,
    )
    && reportForward.targetCells === expectedTargetCells
    && reportRollback.targetCells === expectedTargetCells
    && ownerTargetCells === expectedTargetCells
  ), {
    uniqueTargetCells: exact.uniqueTargetCells,
    expectedTargetCells,
    forwardReplGroups: exact.forwardReplGroups,
    rollbackReplGroups: exact.rollbackReplGroups,
    repeatedForwardCellSteps: exact.repeatedForwardCellSteps,
    ownerTargetCells,
    mismatchCount: exact.failures.length,
  });

  const preDesignHash = designReport.sourceSnapshot?.sha256;
  const preManifestHash = manifest.sourceSnapshot?.sha256;
  const transactionPreRegions = first(transaction, [
    'preReleaseRegions',
    'preSnapshot.directory',
    'sourceSnapshot.directory',
  ]);
  const transactionPreHash = first(transaction, [
    'preReleaseSnapshotSha256',
    'preSnapshot.sha256',
    'sourceSnapshot.sha256',
    'preSnapshotSha256',
  ]);
  const transactionPostRegions = first(transaction, [
    'postReleaseRegions',
    'postSnapshot.directory',
    'postReleaseSnapshot.directory',
  ]);
  const transactionPostHash = first(transaction, [
    'postSnapshot.sha256',
    'postReleaseSnapshot.sha256',
    'postSnapshotSha256',
  ]);
  const directSourceSnapshotIdentity = (
    preDigest.sha256 === preDesignHash
    && preDigest.sha256 === preManifestHash
  );
  const sourceEquivalenceIdentity = sourceEquivalencePreflight
    ? preflightIdentity(sourceEquivalencePreflight)
    : null;
  const sourceEquivalenceFailurePointsComplete = sourceEquivalencePreflight
    ? first(sourceEquivalencePreflight, [
      'failurePointsComplete',
      'completeness.failurePointsComplete',
    ])
    : null;
  const sourceEquivalenceProofPassed = Boolean(
    sourceEquivalencePreflight
    && Number(sourceEquivalencePreflight.schemaVersion) >= 2
    && (
      sourceEquivalencePreflight.status == null
      || sourceEquivalencePreflight.status === 'PASS'
    )
    && samePath(sourceEquivalenceIdentity.operationPath, forwardPath)
    && sourceEquivalenceIdentity.operationSha256 === forwardArtifact.sha256
    && sourceEquivalenceIdentity.operationCount === exact.forwardReplGroups
    && samePath(sourceEquivalenceIdentity.snapshotPath, preRegions)
    && sourceEquivalenceIdentity.snapshotSha256 === preDigest.sha256
    && sourceEquivalenceIdentity.orderAwareProjection === true
    && sourceEquivalenceIdentity.passed === exact.forwardReplGroups
    && sourceEquivalenceIdentity.failed === 0
    && sourceEquivalenceIdentity.failures.length === 0
    && sourceEquivalenceFailurePointsComplete === true
    && (sourceEquivalencePreflight.partialMasks ?? []).length === 0
    && (
      sourceEquivalencePreflight.projectionDependencyFailures ?? []
    ).length === 0
    && sourceEquivalencePreflight.sourceOverlays == null
    && sourceEquivalencePreflight.naturalStateTransitionPolicy == null
    && sourceEquivalencePreflight.reusableEvidenceOnly !== true
    && sourceEquivalencePreflight.satisfiesFinalConsolidatedPreflight !== false
    && sourceEquivalencePreflight.scopedEvidence == null
  );
  const sourceEquivalenceRequired = !directSourceSnapshotIdentity;
  const baseSourceStateIdentityPassed = sourceEquivalenceRequired
    ? sourceEquivalenceProofPassed
    : (
      !sourceEquivalencePreflightPath
      || sourceEquivalenceProofPassed
    );
  gate(
    'base-source-state-equivalence-bound',
    baseSourceStateIdentityPassed,
    {
      mode: sourceEquivalenceRequired
        ? 'complete-source-equivalence-preflight'
        : 'whole-snapshot-equality',
      required: sourceEquivalenceRequired,
      supplied: Boolean(sourceEquivalencePreflightPath),
      directSourceSnapshotIdentity,
      proofPassed: sourceEquivalenceProofPassed,
      proofPath: sourceEquivalencePreflightPath
        ? relative(sourceEquivalencePreflightPath)
        : null,
      proofSha256: sourceEquivalencePreflightPath
        ? sha256File(sourceEquivalencePreflightPath)
        : null,
      transactionPreSha256: preDigest.sha256,
      transactionDeclaredPreSha256: transactionPreHash,
      designPreSha256: preDesignHash,
      manifestPreSha256: preManifestHash,
      operationCount: sourceEquivalenceIdentity?.operationCount ?? null,
      expectedOperationCount: exact.forwardReplGroups,
      passed: sourceEquivalenceIdentity?.passed ?? null,
      failed: sourceEquivalenceIdentity?.failed ?? null,
      failurePointsComplete: sourceEquivalenceFailurePointsComplete,
      partialMasks:
        sourceEquivalencePreflight?.partialMasks?.length ?? 0,
      projectionDependencyFailures:
        sourceEquivalencePreflight?.projectionDependencyFailures?.length ?? 0,
      projectedSourceState: Boolean(
        sourceEquivalencePreflight?.sourceOverlays
        || sourceEquivalencePreflight?.naturalStateTransitionPolicy,
      ),
      orderAwareProjection:
        sourceEquivalenceIdentity?.orderAwareProjection ?? null,
    },
  );
  gate('immutable-snapshot-identities', (
    baseSourceStateIdentityPassed
    && preDigest.sha256 !== postDigest.sha256
    && samePath(transactionPreRegions, preRegions)
    && (!transactionPreHash || transactionPreHash === preDigest.sha256)
    && (!transactionPostRegions
      || samePath(transactionPostRegions, basePostRegions))
    && (!transactionPostHash || transactionPostHash === basePostDigest.sha256)
  ), {
    preSha256: preDigest.sha256,
    basePostSha256: basePostDigest.sha256,
    postSha256: postDigest.sha256,
    preRegionFiles: preDigest.regionFileCount,
    basePostRegionFiles: basePostDigest.regionFileCount,
    postRegionFiles: postDigest.regionFileCount,
    transactionPostIdentityPresent:
      Boolean(transactionPostRegions || transactionPostHash),
    transactionPreIdentityExact: (
      samePath(transactionPreRegions, preRegions)
      && (!transactionPreHash || transactionPreHash === preDigest.sha256)
    ),
    supplementalTransactions: supplementalTransactionPaths.length,
    directSourceSnapshotIdentity,
    sourceEquivalenceRequired,
    sourceEquivalenceProofPassed,
  });

  const transactionPackages = transaction.packages ?? [];
  const transactionPackage = transactionPackages.find(
    (entry) => entry.key === PACKAGE_KEY,
  ) ?? (transactionPackages.length === 1 ? transactionPackages[0] : null);
  const execution = transactionPackage?.execution ?? {};
  const transactionStatus = String(transaction.status ?? '').toLowerCase();
  const committedEvent = (transaction.events ?? []).some(
    (event) => event.event === 'transaction-committed',
  );
  const transactionManifestHash = first(transaction, [
    'designManifestSha256',
    'ownershipManifestSha256',
  ]);
  gate('atomic-transaction-committed', (
    ['committed', 'committed-pending-post-qa'].includes(transactionStatus)
    && transactionPackages.length === 1
    && transactionPackage
    && transactionPackage.key === PACKAGE_KEY
    && transactionPackage.status === 'committed'
    && transactionPackage.forwardSha256 === forwardArtifact.sha256
    && transactionPackage.rollbackSha256 === rollbackArtifact.sha256
    && execution.status === 'complete'
    && execution.strictNoop === true
    && execution.failedGroups === 0
    && execution.failedCommands === 0
    && execution.operationSha256 === forwardArtifact.sha256
    && committedEvent
    && (!transactionManifestHash
      || transactionManifestHash === sha256File(manifestPath))
  ), {
    transactionId: transaction.transactionId ?? null,
    status: transaction.status ?? null,
    packageCount: transactionPackages.length,
    packageStatus: transactionPackage?.status ?? null,
    strictNoop: execution.strictNoop ?? null,
    failedGroups: execution.failedGroups ?? null,
    failedCommands: execution.failedCommands ?? null,
    committedEvent,
  });

  const livePackages = liveEntityGate.packages ?? [];
  const livePackage = livePackages.find(
    (entry) => samePath(entry.file, forwardPath),
  ) ?? (livePackages.length === 1 ? livePackages[0] : null);
  const forceLoadAudit = liveEntityGate.forceLoadAudit ?? {};
  const schemaTwoLiveGate = Number(liveEntityGate.schemaVersion) >= 2;
  const schemaTwoForceLoadPassed = !schemaTwoLiveGate || (
    forceLoadAudit.mode === 'sparse-target-halo-batched'
    && forceLoadAudit.allRequiredChunksLoadedBeforeQueries === true
    && (forceLoadAudit.missingRequiredChunks ?? []).length === 0
    && (forceLoadAudit.cleanupErrors ?? []).length === 0
    && forceLoadAudit.allTemporaryChunksReleased === true
    && forceLoadAudit.finalSetMatchesPreExistingSet === true
  );
  const legacyCleanupValues = [
    liveEntityGate.allTemporaryChunksReleased,
    liveEntityGate.forceLoadStateRestored,
    liveEntityGate.forceLoadRestorationPassed,
  ].filter((value) => value !== undefined && value !== null);
  gate('live-entity-gate-pass', (
    liveEntityGate.status === 'PASS'
    && liveEntityGate.passed === true
    && liveEntityGate.blockOrEntityMutation === false
    && livePackages.length === 1
    && livePackage?.passed === true
    && livePackage.operationSha256 === forwardArtifact.sha256
    && samePath(livePackage.file, forwardPath)
    && (livePackage.blockers ?? []).length === 0
    && (livePackage.queryErrors ?? []).length === 0
    && legacyCleanupValues.every(Boolean)
    && schemaTwoForceLoadPassed
  ), {
    schemaVersion: liveEntityGate.schemaVersion ?? 1,
    status: liveEntityGate.status ?? null,
    packageCount: livePackages.length,
    blockers: livePackage?.blockers?.length ?? null,
    queryErrors: livePackage?.queryErrors?.length ?? null,
    mutation: liveEntityGate.blockOrEntityMutation ?? null,
    cleanupChecksPresent:
      legacyCleanupValues.length + (schemaTwoLiveGate ? 5 : 0),
    schemaTwoForceLoadPassed,
  });

  gate('rollback-natural-transition-policy-bound', (
    rollbackTransitionPolicy.operationSha256 === rollbackArtifact.sha256
    && rollbackTransitionPolicy.declaredPointCount > 0
    && rollbackTransitionPolicy.evidence.snapshotSha256
      === basePostDigest.sha256
    && rollbackTransitionPolicy.evidence.observedTransitionCells
      === rollbackTransitionPolicy.declaredPointCount
    && rollbackTransitionPolicy.rules.every((rule) => (
      rule.allowedActualStates.length > 0
      && rule.points.length > 0
    ))
  ), {
    policySha256: rollbackTransitionPolicy.sha256,
    rollbackSha256: rollbackArtifact.sha256,
    snapshotSha256: rollbackTransitionPolicy.evidence.snapshotSha256,
    expectedBasePostSha256: basePostDigest.sha256,
    ruleCount: rollbackTransitionPolicy.rules.length,
    declaredPointCount: rollbackTransitionPolicy.declaredPointCount,
    observedTransitionCells:
      rollbackTransitionPolicy.evidence.observedTransitionCells,
    matchMode: 'exact-declared-points',
    propertyPolicy: 'identical',
  });

  const rollbackPreflightOpsPath = first(rollbackPreflight, [
    'opsPath',
    'operation.path',
    'rollback.file',
  ]);
  const rollbackPreflightRegions = first(rollbackPreflight, [
    'regions',
    'snapshot.directory',
    'sourceSnapshot.directory',
    'postSnapshot.directory',
  ]);
  const rollbackPreflightOperationCount = Number(first(rollbackPreflight, [
    'operationCount',
    'operation.operationCount',
    'summary.operationCount',
  ]));
  const rollbackPreflightPassed = Number(first(rollbackPreflight, [
    'passed',
    'summary.passed',
  ]));
  const rollbackPreflightFailed = Number(first(rollbackPreflight, [
    'failed',
    'summary.failed',
  ]));
  const rollbackPreflightFailures = first(rollbackPreflight, [
    'failures',
    'summary.failures',
  ]) ?? [];
  const rollbackPreflightOrderAware = first(rollbackPreflight, [
    'orderAwareProjection',
    'checks.orderAwareProjection',
  ]);
  const rollbackPreflightHash = first(rollbackPreflight, [
    'operationSha256',
    'opsSha256',
    'operation.sha256',
    'rollback.sha256',
  ]);
  const rollbackPreflightSnapshotHash = first(rollbackPreflight, [
    'regionsSnapshot.sha256',
    'snapshot.sha256',
    'sourceSnapshot.sha256',
    'postSnapshot.sha256',
    'regionsSha256',
  ]);
  const schemaTwoRollbackPreflight =
    Number(rollbackPreflight.schemaVersion) >= 2;
  const policyAwareRollbackPreflight =
    rollbackPreflight.naturalStateTransitionPolicy ?? {};
  const schemaThreeRollbackPreflight =
    Number(rollbackPreflight.schemaVersion) >= 3;
  const schemaTwoRollbackIdentityPassed = !schemaTwoRollbackPreflight || (
    rollbackPreflight.status === 'PASS'
    && rollbackPreflightHash === rollbackArtifact.sha256
    && rollbackPreflightSnapshotHash === basePostDigest.sha256
  );
  gate('rollback-guards-pass-against-post-snapshot', (
    samePath(rollbackPreflightOpsPath, rollbackPath)
    && samePath(rollbackPreflightRegions, basePostRegions)
    && rollbackPreflightOrderAware === true
    && rollbackPreflightOperationCount === exact.rollbackReplGroups
    && rollbackPreflightPassed === rollbackPreflightOperationCount
    && rollbackPreflightFailed === 0
    && rollbackPreflightFailures.length === 0
    && (!rollbackPreflightHash
      || rollbackPreflightHash === rollbackArtifact.sha256)
    && (!rollbackPreflightSnapshotHash
      || rollbackPreflightSnapshotHash === basePostDigest.sha256)
    && schemaTwoRollbackIdentityPassed
    && schemaThreeRollbackPreflight
    && samePath(
      policyAwareRollbackPreflight.path,
      rollbackTransitionPolicyPath,
    )
    && policyAwareRollbackPreflight.sha256
      === rollbackTransitionPolicy.sha256
    && policyAwareRollbackPreflight.operationSha256
      === rollbackArtifact.sha256
    && policyAwareRollbackPreflight.executionRole === 'rollback'
    && policyAwareRollbackPreflight.matchMode === 'exact-declared-points'
    && policyAwareRollbackPreflight.propertyPolicy === 'identical'
    && policyAwareRollbackPreflight.declaredPointCount
      === rollbackTransitionPolicy.declaredPointCount
    && policyAwareRollbackPreflight.encounteredDeclaredPoints
      === rollbackTransitionPolicy.declaredPointCount
    && policyAwareRollbackPreflight.acceptedTransitionCells
      === rollbackTransitionPolicy.evidence.observedTransitionCells
    && policyAwareRollbackPreflight.canonicalExactCells === 0
    && policyAwareRollbackPreflight.unmatchedDeclaredPoints === 0
  ), {
    schemaVersion: rollbackPreflight.schemaVersion ?? 1,
    operationCount: rollbackPreflightOperationCount,
    passed: rollbackPreflightPassed,
    failed: rollbackPreflightFailed,
    regions: rollbackPreflightRegions,
    snapshotHashPresent: Boolean(rollbackPreflightSnapshotHash),
    schemaTwoRollbackIdentityPassed,
    schemaThreeRollbackPreflight,
    policySha256: policyAwareRollbackPreflight.sha256 ?? null,
    declaredPointCount:
      policyAwareRollbackPreflight.declaredPointCount ?? null,
    acceptedTransitionCells:
      policyAwareRollbackPreflight.acceptedTransitionCells ?? null,
    unmatchedDeclaredPoints:
      policyAwareRollbackPreflight.unmatchedDeclaredPoints ?? null,
  });

  const supplementalPackages = supplementalChain.supplements.flatMap(
    (supplement) => (
      supplement.kind === 'committed-atomic-supplemental-group'
        ? supplement.packages
        : [supplement]
    ),
  );
  const sourceOverlay = rollbackPreflight.sourceOverlays ?? null;
  let sourceOverlayPassed = sourceOverlay === null;
  const sourceOverlayFailures = [];
  if (sourceOverlay) {
    sourceOverlayPassed = (
      sourceOverlay.kind === 'exact-guarded-logical-source-overlay'
      && sourceOverlay.physicalExecutionEvidenceRequired === true
      && sourceOverlay.satisfiesImmutableSnapshotEquality === false
      && sourceOverlay.operationCount > 0
      && sourceOverlay.passed === sourceOverlay.operationCount
      && sourceOverlay.failed === 0
      && sourceOverlay.failures?.length === 0
      && sourceOverlay.artifacts?.length > 0
    );
    const policyEvidencePreflight = readJson(
      rollbackTransitionPolicy.evidence.preflightPath,
    );
    if (
      policyEvidencePreflight.sourceOverlays?.combinedPlanSha256
        !== sourceOverlay.combinedPlanSha256
      || JSON.stringify(
        policyEvidencePreflight.sourceOverlays?.artifacts?.map(
          ({ path: overlayPath, sha256: overlaySha256, operationCount }) => ({
            path: relative(resolveInput(overlayPath)),
            sha256: overlaySha256,
            operationCount,
          }),
        ),
      ) !== JSON.stringify(
        sourceOverlay.artifacts.map(
          ({ path: overlayPath, sha256: overlaySha256, operationCount }) => ({
            path: relative(resolveInput(overlayPath)),
            sha256: overlaySha256,
            operationCount,
          }),
        ),
      )
    ) {
      sourceOverlayPassed = false;
      sourceOverlayFailures.push('policy-evidence-overlay-plan-mismatch');
    }
    for (const overlay of sourceOverlay.artifacts) {
      const overlayPath = resolveInput(overlay.path);
      if (
        !fs.existsSync(overlayPath)
        || sha256File(overlayPath) !== overlay.sha256
      ) {
        sourceOverlayPassed = false;
        sourceOverlayFailures.push('overlay-artifact-identity-mismatch');
        continue;
      }
      const materializedPackages = supplementalPackages.filter(
        (candidate) => candidate.forward.sha256 === overlay.sha256,
      );
      if (
        materializedPackages.length !== 1
        || !Object.values(materializedPackages[0].checks ?? {}).every(Boolean)
      ) {
        sourceOverlayPassed = false;
        sourceOverlayFailures.push('overlay-not-bound-to-one-committed-package');
        continue;
      }
      const overlayTargets = operationTargetKeys(
        fs.readFileSync(overlayPath, 'utf8'),
        overlay.path,
      );
      for (const candidate of supplementalPackages) {
        if (candidate.forward.sha256 === overlay.sha256) continue;
        const candidateTargets = operationTargetKeys(
          fs.readFileSync(resolveInput(candidate.forward.path), 'utf8'),
          candidate.key,
        );
        if ([...overlayTargets].some((target) => candidateTargets.has(target))) {
          sourceOverlayPassed = false;
          sourceOverlayFailures.push(
            `overlay-target-overlap:${candidate.key}`,
          );
        }
      }
    }
  }
  gate('rollback-logical-source-overlay-bound', sourceOverlayPassed, {
    overlayPresent: sourceOverlay !== null,
    overlayOperationCount: sourceOverlay?.operationCount ?? 0,
    overlayPlanSha256: sourceOverlay?.combinedPlanSha256 ?? null,
    materializedSupplementalPackages: supplementalPackages.length,
    failures: sourceOverlayFailures,
  });

  const releaseIdentity = {
    schemaVersion: 1,
    algorithm: RELEASE_IDENTITY_ALGORITHM,
    packageId: PACKAGE_ID,
    base: {
      key: PACKAGE_KEY,
      transaction: artifact(transactionPath),
      forward: forwardArtifact,
      rollback: rollbackArtifact,
      rollbackPoststatePreflight: artifact(rollbackPreflightPath),
      naturalStateTransitionPolicy:
        artifact(rollbackTransitionPolicyPath),
      sourceEquivalencePreflight: sourceEquivalencePreflightPath
        ? artifact(sourceEquivalencePreflightPath)
        : null,
      acceptedPostSnapshot: snapshotArtifact(
        basePostRegions,
        basePostDigest,
      ),
    },
    supplements: supplementalChain.supplements,
    terminalPostSnapshot: snapshotArtifact(postRegions, postDigest),
  };
  releaseIdentity.sha256 = releaseIdentityHash(releaseIdentity);
  if (supplementalTransactionPaths.length > 0) {
    gate('supplemental-release-chain-bound', supplementalChain.passed, {
      supplementalTransactions: supplementalTransactionPaths.length,
      validatedSupplements: supplementalChain.supplements.length,
      packageKeys: supplementalChain.supplements.map((entry) => entry.key),
      releaseIdentitySha256: releaseIdentity.sha256,
      basePostSha256: basePostDigest.sha256,
      terminalPostSha256: postDigest.sha256,
      failureCount: supplementalChain.failures.length,
      failures: supplementalChain.failures.slice(0, 20),
    });
  }

  const routeAcceptance = evaluatePostReleaseRouteQa(routeQa, {
    postRegions,
    postSha256: postDigest.sha256,
    forwardSha256: forwardArtifact.sha256,
    releaseForwardSha256s: [
      forwardArtifact.sha256,
      ...supplementalPackages.map((entry) => entry.forward.sha256),
    ],
  });
  gate(
    'post-release-route-qa-pass',
    routeAcceptance.passed,
    routeAcceptance.details,
  );

  if (mediaReport) {
    const captures = captureEntries(mediaReport);
    const mediaHashes = collectPackageHashes(mediaReport);
    const mediaPostHash = snapshotHash(mediaReport);
    const captureChecks = captures.map((capture) => {
      const output = resolveEvidenceOutput(
        mediaReportPath,
        capture.output ?? capture.path ?? capture.file,
        mediaReport,
      );
      const exists = Boolean(output && fs.existsSync(output));
      const actualSha256 = exists ? sha256File(output) : null;
      const reportedSha256 = capture.sha256 ?? capture.outputSha256 ?? null;
      return {
        id: capture.id ?? capture.cameraId ?? null,
        exists,
        actualSha256,
        reportedSha256,
        passed: (
          capture.passed !== false
          && exists
          && (!reportedSha256 || reportedSha256 === actualSha256)
        ),
      };
    });
    gate('optional-post-release-media-pass', (
      mediaReport.status === 'PASS'
      && mediaReport.passed !== false
      && mediaPostHash === postDigest.sha256
      && mediaHashes.includes(forwardArtifact.sha256)
      && captures.length > 0
      && captureChecks.every((entry) => entry.passed)
    ), {
      supplied: true,
      status: mediaReport.status ?? null,
      postSnapshotSha256: mediaPostHash,
      packageHashBound: mediaHashes.includes(forwardArtifact.sha256),
      captures: captures.length,
      passedCaptures: captureChecks.filter((entry) => entry.passed).length,
    });
  }

  const failures = gates.filter((entry) => !entry.passed);
  const passed = failures.length === 0;
  const report = {
    schemaVersion: supplementalTransactionPaths.length > 0 ? 2 : 1,
    id: 'town-expansion-r1-post-release-qa',
    packageId: PACKAGE_ID,
    generatedAtUtc: new Date().toISOString(),
    status: passed ? 'PASS' : 'FAIL',
    passed,
    readOnly: true,
    liveWorldMutated: false,
    databaseMutated: false,
    artifacts: {
      forward: forwardArtifact,
      rollback: rollbackArtifact,
      designReport: artifact(designReportPath),
      manifest: artifact(manifestPath),
      transaction: artifact(transactionPath),
      liveEntityGate: artifact(liveEntityGatePath),
      rollbackPoststatePreflight: artifact(rollbackPreflightPath),
      naturalStateTransitionPolicy:
        artifact(rollbackTransitionPolicyPath),
      sourceEquivalencePreflight: sourceEquivalencePreflightPath
        ? artifact(sourceEquivalencePreflightPath)
        : null,
      routeQa: artifact(routeQaPath),
      mediaReport: mediaReportPath ? artifact(mediaReportPath) : null,
    },
    snapshots: {
      pre: {
        path: relative(preRegions),
        sha256: preDigest.sha256,
        regionFileCount: preDigest.regionFileCount,
        bytes: preDigest.members.reduce(
          (sum, member) => sum + member.bytes,
          0,
        ),
      },
      post: {
        path: relative(postRegions),
        sha256: postDigest.sha256,
        regionFileCount: postDigest.regionFileCount,
        bytes: postDigest.members.reduce(
          (sum, member) => sum + member.bytes,
          0,
        ),
      },
      baseAcceptedPost: supplementalTransactionPaths.length > 0
        ? snapshotArtifact(basePostRegions, basePostDigest)
        : null,
    },
    releaseIdentity,
    totals: {
      packages: 1 + supplementalPackages.length,
      supplementalPackages: supplementalPackages.length,
      supplementalTransactions: supplementalTransactionPaths.length,
      uniqueTargetCells: exact.uniqueTargetCells,
      forwardReplGroups: exact.forwardReplGroups,
      rollbackReplGroups: exact.rollbackReplGroups,
      forwardCommands: exact.forwardCommands,
      rollbackCommands: exact.rollbackCommands,
      forwardCellSteps: exact.forwardCellSteps,
      rollbackCellSteps: exact.rollbackCellSteps,
      repeatedForwardCellSteps: exact.repeatedForwardCellSteps,
      routeTests: routeAcceptance.routes.length,
      mediaCaptures: mediaReport ? captureEntries(mediaReport).length : 0,
      mediaRequired: Boolean(mediaReport),
    },
    exactBijection: exact,
    gates,
    failures,
    decision: passed
      ? {
        release: 'ACCEPTED',
        rationale:
          'The canonical Town Expansion R1 transaction, ordered supplemental '
          + 'release chain, installed snapshot, rollback guards, entity '
          + 'clearance, route evidence, design hashes, and supplied media '
          + 'evidence all pass.',
      }
      : {
        release: 'REJECTED_OR_INCOMPLETE',
        rationale:
          `Failed gates: ${failures.map((entry) => entry.id).join(', ')}`,
      },
  };
  return report;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.contract) {
    process.stdout.write(`${JSON.stringify(POST_RELEASE_CONTRACT, null, 2)}\n`);
    return;
  }
  if (options.selfTest) {
    if (!runSelfTest()) process.exitCode = 1;
    return;
  }
  const report = await verifyTownExpansionPostRelease(options);
  const outputPath = resolveInput(
    options.out
      ?? 'data/world-review/town-expansion-r1-post-release-qa-2026-07-28.json',
  );
  const markdownPath = resolveInput(
    options.markdown
      ?? 'docs/redevelopment/2026-07-28-town-expansion/post-release-qa.md',
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(markdownPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(
    markdownPath,
    renderTownExpansionPostReleaseMarkdown(report),
  );
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    decision: report.decision.release,
    readOnly: report.readOnly,
    output: relative(outputPath),
    markdown: relative(markdownPath),
    totals: report.totals,
    failedGates: report.failures.map((entry) => entry.id),
  }, null, 2)}\n`);
  if (!report.passed) process.exitCode = 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
