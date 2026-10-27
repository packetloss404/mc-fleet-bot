#!/usr/bin/env node
/** Reusable read-only R13 terminal physical-post acceptance verifier. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const value = (flag, fallback) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:05:00Z');
const OUT = value(
  '--out',
  'data/world-review/combined-zones-r13-terminal-post-acceptance-current/r13-terminal-post-acceptance.json',
);
const MD_OUT = value(
  '--markdown',
  'data/world-review/combined-zones-r13-terminal-post-acceptance-current/r13-terminal-post-acceptance.md',
);
const FINAL_LEDGER = value(
  '--final-ledger',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const FINAL_POST_QA = value(
  '--final-post-qa',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const R12Q_PREDECESSOR_LEDGER = value(
  '--r12q-predecessor-ledger',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const R12Q_PREDECESSOR_QA = value(
  '--r12q-predecessor-post-qa',
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const WORLD_REVIEW_ROOT = value('--world-review-root', 'data/world-review');
const RELEASE_CONTRACT = value(
  '--release-contract',
  'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const REQUIRED_NODES = Object.freeze([
  'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
  'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
  'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
  'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
  'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
  'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
]);
const DEPENDENCIES = [
  {
    id: REQUIRED_NODES[0],
    flag: '--r07-closure',
    fallback: 'data/world-review/combined-zones-r07k-live-20260821T195128Z/r07k-post-release-qa.json',
    kind: 'TERMINAL_POST_QA_WITH_BOUND_EXECUTION_LEDGER',
  },
  {
    id: REQUIRED_NODES[1],
    flag: '--r08-closure',
    fallback: 'data/world-review/combined-zones-r08ak-empty-eight-static-readiness-gap-screen-20260822T025000Z/r08ak-empty-eight-static-readiness-gap-screen.json',
    kind: 'BOUNDED_STATIC_READINESS_CLOSURE',
  },
  {
    id: REQUIRED_NODES[2],
    flag: '--r09-closure',
    fallback: 'data/world-review/combined-zones-r09j-live-20260822T025021Z/r09k-b07-bounded-upper-route-commissioning-seal.json',
    kind: 'BOUNDED_CIRCULATION_CLOSURE',
  },
  {
    id: REQUIRED_NODES[3],
    flag: '--r10-closure',
    fallback: 'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
    kind: 'BOUNDED_FITOUT_CLOSURE',
  },
  {
    id: REQUIRED_NODES[4],
    flag: '--r11-closure',
    fallback: 'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
    kind: 'BOUNDED_C1_CLOSURE',
  },
  {
    id: REQUIRED_NODES[5],
    flag: '--r12-commissioning',
    fallback: 'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json',
    kind: 'BOUNDED_TRANSPORT_COMMISSIONING',
    requireCommissioningStatus: true,
    requireTerminalPostBinding: true,
    requireActiveShuttleCommissioning: true,
  },
].map((dependency) => ({
  ...dependency,
  filename: value(dependency.flag, dependency.fallback),
}));

const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const stableHash = (valueToHash) => sha256(`${JSON.stringify(valueToHash, null, 2)}\n`);
const readJsonBytes = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { bytes, value: JSON.parse(bytes) };
};
const fileBinding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const statusPasses = (record) => (
  record && typeof record.status === 'string' && record.status.startsWith('PASS')
  && record.passed !== false && record.summary?.passed !== false
);
const getReleaseNodeId = (record) => record.releaseNodeId ?? record.release?.releaseNodeId ?? null;
const getTerminalCompleteSave = (record) => record.terminalCompleteSaveSha256
  ?? record.terminalPost?.completeSaveSha256
  ?? record.postSnapshot?.completeSaveSha256
  ?? record.post?.completeSaveSha256
  ?? null;
const getTerminalRegion = (record) => record.terminalPost?.regionSha256
  ?? record.postSnapshot?.regionSha256
  ?? record.postSnapshot?.regionSnapshotSha256
  ?? record.post?.regionSha256
  ?? record.post?.regionSnapshotSha256
  ?? null;
const getCompletedIdentity = (record) => record.completedReleaseIdentitySha256
  ?? record.releaseIdentity?.completedReleaseIdentitySha256
  ?? record.release?.completedReleaseIdentitySha256
  ?? null;

function collectDeclaredBindings(valueToScan) {
  const byIdentity = new Map();
  const visit = (current) => {
    if (!current || typeof current !== 'object') return;
    if (typeof current.path === 'string'
      && typeof current.sha256 === 'string'
      && /^[a-f0-9]{64}$/.test(current.sha256)) {
      byIdentity.set(`${relative(current.path)}\0${current.sha256}`, {
        path: current.path,
        expectedSha256: current.sha256,
      });
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) visit(child);
  };
  visit(valueToScan);
  return [...byIdentity.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function validateDeclaredBindings(record) {
  const declared = collectDeclaredBindings(record);
  const evidence = [];
  const failures = [];
  for (const item of declared) {
    if (!fs.existsSync(absolute(item.path))) {
      failures.push({ path: relative(item.path), reason: 'MISSING_DECLARED_BINDING' });
      continue;
    }
    const actual = fileBinding(item.path);
    evidence.push(actual);
    if (actual.sha256 !== item.expectedSha256) failures.push({
      path: actual.path,
      reason: 'DECLARED_SHA256_MISMATCH',
      expectedSha256: item.expectedSha256,
      actualSha256: actual.sha256,
    });
  }
  return { declaredBindingCount: declared.length, evidence, failures };
}

function validateRollbackBindings(ledger) {
  const bindings = ledger.rollbackPoststatePreflights ?? [];
  const evidence = [];
  const failures = [];
  if (!bindings.length) failures.push({ reason: 'NO_ROLLBACK_POSTSTATE_PREFLIGHTS' });
  for (const binding of bindings) {
    if (!binding?.path || !binding?.sha256 || !fs.existsSync(absolute(binding.path))) {
      failures.push({ path: binding?.path ?? null, reason: 'MISSING_ROLLBACK_BINDING' });
      continue;
    }
    const actual = fileBinding(binding.path);
    let report;
    try {
      report = readJsonBytes(binding.path).value;
    } catch (error) {
      failures.push({ path: actual.path, reason: `INVALID_ROLLBACK_JSON:${error.message}` });
      continue;
    }
    evidence.push({ ...actual, status: report.status ?? null, passed: report.passed ?? null });
    if (actual.sha256 !== binding.sha256
      || report.status !== 'PASS' || !(report.passed > 0) || report.failed !== 0) failures.push({
      path: actual.path,
      reason: 'ROLLBACK_BINDING_OR_RESULT_INVALID',
    });
  }
  return { rollbackPreflightCount: bindings.length, evidence, failures };
}

function manifestSourcePredecessor(manifest) {
  const source = manifest.source ?? {};
  const predecessor = source.predecessor ?? {};
  const executionLedger = predecessor.executionLedger ?? (
    source.sourceLedgerPath && source.sourceLedgerSha256
      ? { path: source.sourceLedgerPath, sha256: source.sourceLedgerSha256 }
      : null
  );
  const postQa = predecessor.postQa ?? (
    source.sourcePostQaPath && source.sourcePostQaSha256
      ? { path: source.sourcePostQaPath, sha256: source.sourcePostQaSha256 }
      : null
  );
  return {
    transactionId: predecessor.transactionId ?? source.sourceTransactionId ?? null,
    executionLedger,
    postQa,
    completedReleaseIdentitySha256: predecessor.completedReleaseIdentitySha256
      ?? source.sourceCompletedReleaseIdentitySha256
      ?? source.sourceLedgerCompletedReleaseIdentitySha256
      ?? null,
    postCompleteSaveSha256: predecessor.postCompleteSaveSha256
      ?? predecessor.postSnapshot?.completeSaveSha256
      ?? source.completeSaveSha256
      ?? null,
    postRegionSha256: predecessor.postRegionSha256
      ?? predecessor.postSnapshot?.regionSha256
      ?? source.regionSnapshotSha256
      ?? source.sourceRegionSha256
      ?? null,
  };
}

function validateActiveManifestLineage(ledger, passivePredecessor) {
  const failures = [];
  if (!ledger.manifest?.path || !ledger.manifest?.sha256
    || !fs.existsSync(absolute(ledger.manifest?.path ?? ''))) return {
    status: 'WAITING',
    manifest: ledger.manifest ?? null,
    predecessor: null,
    failures: [{ reason: 'ACTIVE_MANIFEST_BINDING_MISSING' }],
  };
  const bound = readJsonBytes(ledger.manifest.path);
  const actual = fileBinding(ledger.manifest.path);
  const manifest = bound.value;
  if (actual.sha256 !== ledger.manifest.sha256) {
    failures.push({ reason: 'ACTIVE_MANIFEST_LEDGER_SHA256_MISMATCH' });
  }
  if (manifest.transactionId !== ledger.transactionId) {
    failures.push({ reason: 'ACTIVE_MANIFEST_TRANSACTION_ID_MISMATCH' });
  }
  const predecessor = manifestSourcePredecessor(manifest);
  const expectedLedger = passivePredecessor.ledger;
  const expectedQa = passivePredecessor.independentPostQa;
  if (!predecessor.executionLedger
    || relative(predecessor.executionLedger.path ?? '') !== expectedLedger?.path
    || predecessor.executionLedger.sha256 !== expectedLedger?.sha256) {
    failures.push({ reason: 'ACTIVE_MANIFEST_R12Q_LEDGER_BINDING_INVALID' });
  }
  if (!predecessor.postQa
    || relative(predecessor.postQa.path ?? '') !== expectedQa?.path
    || predecessor.postQa.sha256 !== expectedQa?.sha256) {
    failures.push({ reason: 'ACTIVE_MANIFEST_R12Q_POST_QA_BINDING_INVALID' });
  }
  if (predecessor.transactionId !== passivePredecessor.transactionId
    || predecessor.completedReleaseIdentitySha256
      !== passivePredecessor.completedReleaseIdentitySha256) {
    failures.push({ reason: 'ACTIVE_MANIFEST_R12Q_RELEASE_IDENTITY_INVALID' });
  }
  if (predecessor.postCompleteSaveSha256 !== passivePredecessor.postCompleteSaveSha256
    || predecessor.postRegionSha256 !== passivePredecessor.postRegionSha256) {
    failures.push({ reason: 'ACTIVE_MANIFEST_R12Q_POST_HASH_BINDING_INVALID' });
  }
  const declared = validateDeclaredBindings(manifest);
  failures.push(...declared.failures.map(({ reason }) => ({
    reason: `ACTIVE_MANIFEST_${reason}`,
  })));
  return {
    status: failures.length ? 'WAITING' : 'PASS',
    manifest: actual,
    predecessor,
    declaredBindingCount: declared.declaredBindingCount,
    failures,
  };
}

function validateForwardSourcePreflights(ledger) {
  const evidenceByPath = new Map((ledger.evidenceBindings ?? []).map(
    (binding) => [relative(binding.path), binding],
  ));
  const evidence = [];
  const failures = [];
  for (const packageRecord of ledger.packages ?? []) {
    const stageName = `forward-source-preflight:${packageRecord.key}`;
    const stage = (ledger.stages ?? []).find(({ stage: candidate }) => candidate === stageName);
    const reportFlag = stage?.command?.indexOf('--report') ?? -1;
    const reportPath = reportFlag >= 0 ? stage.command[reportFlag + 1] : null;
    if (stage?.status !== 'PASS' || !reportPath || !fs.existsSync(absolute(reportPath))) {
      failures.push({ packageKey: packageRecord.key, reason: 'FORWARD_SOURCE_PREFLIGHT_STAGE_MISSING' });
      continue;
    }
    const bound = readJsonBytes(reportPath);
    const actual = fileBinding(reportPath);
    const report = bound.value;
    const ledgerBinding = evidenceByPath.get(actual.path);
    const exactGuardPass = report.status === 'PASS'
      && report.failurePointsComplete === true
      && report.failed === 0
      && report.operationCount > 0
      && report.passed === report.operationCount
      && report.opsSha256 === packageRecord.forward?.sha256
      && relative(report.opsPath ?? '') === relative(packageRecord.forward?.path ?? '')
      && relative(report.regions ?? '') === relative(ledger.sourceSnapshot?.regions ?? '');
    evidence.push({
      packageKey: packageRecord.key,
      ...actual,
      operationCount: report.operationCount ?? null,
      passed: report.passed ?? null,
      failed: report.failed ?? null,
      failurePointsComplete: report.failurePointsComplete ?? null,
    });
    if (!ledgerBinding || ledgerBinding.sha256 !== actual.sha256 || !exactGuardPass) {
      failures.push({ packageKey: packageRecord.key, reason: 'FORWARD_SOURCE_PREFLIGHT_INVALID' });
    }
  }
  if (!(ledger.packages?.length > 0)) failures.push({ reason: 'NO_ACTIVE_SHUTTLE_PACKAGES' });
  return {
    status: failures.length ? 'WAITING' : 'PASS',
    packageCount: ledger.packages?.length ?? 0,
    exactSourcePreflightCount: evidence.length,
    exactGuardCount: evidence.reduce((sum, item) => sum + (item.operationCount ?? 0), 0),
    evidence,
    failures,
  };
}

function evaluateFinalLedger(passivePredecessor) {
  if (!fs.existsSync(absolute(FINAL_LEDGER))) return {
    status: 'WAITING', path: relative(FINAL_LEDGER), exists: false,
    reasons: ['FINAL_EXECUTION_LEDGER_MISSING'],
  };
  try {
    const bound = readJsonBytes(FINAL_LEDGER);
    const ledger = bound.value;
    const reasons = [];
    if (ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE') {
      reasons.push('FINAL_LEDGER_NOT_EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE');
    }
    if (!REQUIRED_NODES.includes(ledger.releaseNodeId)) {
      reasons.push('FINAL_LEDGER_NOT_A_REQUIRED_R07_R12_NODE');
    }
    if (!ledger.postSnapshot?.completeSaveSha256 || !ledger.postSnapshot?.identity?.path
      || !ledger.postSnapshot?.completeSaveIntake?.path) {
      reasons.push('FINAL_LEDGER_POST_SNAPSHOT_IDENTITY_INCOMPLETE');
    }
    const declared = validateDeclaredBindings(ledger);
    const rollback = validateRollbackBindings(ledger);
    reasons.push(...declared.failures.map(({ reason }) => `FINAL_LEDGER_${reason}`));
    reasons.push(...rollback.failures.map(({ reason }) => `FINAL_LEDGER_${reason}`));
    let postRegionSha256 = null;
    if (ledger.postSnapshot?.identity?.path
      && fs.existsSync(absolute(ledger.postSnapshot.identity.path))) {
      const identity = readJsonBytes(ledger.postSnapshot.identity.path);
      postRegionSha256 = identity.value.sha256 ?? null;
      if (sha256(identity.bytes) !== ledger.postSnapshot.identity.sha256) {
        reasons.push('FINAL_POST_IDENTITY_FILE_HASH_MISMATCH');
      }
    }
    if (ledger.postSnapshot?.completeSaveIntake?.path
      && fs.existsSync(absolute(ledger.postSnapshot.completeSaveIntake.path))) {
      const intake = readJsonBytes(ledger.postSnapshot.completeSaveIntake.path);
      if (sha256(intake.bytes) !== ledger.postSnapshot.completeSaveIntake.sha256
        || intake.value.packageIdentity?.completeSaveSha256
          !== ledger.postSnapshot.completeSaveSha256) {
        reasons.push('FINAL_POST_COMPLETE_SAVE_INTAKE_MISMATCH');
      }
    }
    if (!ledger.completedReleaseIdentitySha256) {
      reasons.push('FINAL_COMPLETED_RELEASE_IDENTITY_MISSING');
    }
    let sourceRegionSha256 = null;
    if (ledger.sourceSnapshot?.identity?.path
      && fs.existsSync(absolute(ledger.sourceSnapshot.identity.path))) {
      const sourceIdentity = readJsonBytes(ledger.sourceSnapshot.identity.path);
      sourceRegionSha256 = sourceIdentity.value.sha256 ?? null;
    }
    if (ledger.transactionId === passivePredecessor.transactionId
      || !/(?:active.*shuttle|shuttle.*active)/i.test(ledger.transactionId ?? '')) {
      reasons.push('FINAL_LEDGER_IS_NOT_A_DISTINCT_ACTIVE_SHUTTLE_TRANSACTION');
    }
    const activeManifestLineage = validateActiveManifestLineage(ledger, passivePredecessor);
    const forwardSourcePreflights = validateForwardSourcePreflights(ledger);
    reasons.push(...activeManifestLineage.failures.map(({ reason }) => reason));
    reasons.push(...forwardSourcePreflights.failures.map(({ reason }) => reason));
    if (!(Date.parse(ledger.completedAtUtc ?? 0)
      > Date.parse(passivePredecessor.completedAtUtc ?? 0))) {
      reasons.push('FINAL_ACTIVE_SHUTTLE_TRANSACTION_IS_NOT_LATER_THAN_R12Q');
    }
    return {
      status: reasons.length ? 'WAITING' : 'PASS',
      ...fileBinding(FINAL_LEDGER),
      exists: true,
      reasons,
      releaseNodeId: ledger.releaseNodeId ?? null,
      transactionId: ledger.transactionId ?? null,
      completedAtUtc: ledger.completedAtUtc ?? null,
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 ?? null,
      postSnapshotRoot: ledger.postSnapshot?.root ?? null,
      postCompleteSaveSha256: ledger.postSnapshot?.completeSaveSha256 ?? null,
      postRegionSha256,
      sourceCompleteSaveSha256: ledger.sourceSnapshot?.completeSaveSha256 ?? null,
      sourceRegionSha256,
      activeManifestLineage,
      forwardSourcePreflights,
      declaredBindingCount: declared.declaredBindingCount,
      rollbackPreflightCount: rollback.rollbackPreflightCount,
      rollbackEvidence: rollback.evidence,
      ledger,
    };
  } catch (error) {
    return {
      status: 'WAITING', path: relative(FINAL_LEDGER), exists: true,
      reasons: [`FINAL_LEDGER_INVALID:${error.message}`],
    };
  }
}

function evaluateR12qPassivePredecessor() {
  if (!fs.existsSync(absolute(R12Q_PREDECESSOR_LEDGER))
    || !fs.existsSync(absolute(R12Q_PREDECESSOR_QA))) return {
    status: 'WAITING',
    ledgerPath: relative(R12Q_PREDECESSOR_LEDGER),
    qaPath: relative(R12Q_PREDECESSOR_QA),
    reasons: ['R12Q_PASSIVE_PREDECESSOR_LEDGER_OR_QA_MISSING'],
  };
  try {
    const ledgerBound = readJsonBytes(R12Q_PREDECESSOR_LEDGER);
    const qaBound = readJsonBytes(R12Q_PREDECESSOR_QA);
    const ledger = ledgerBound.value;
    const qa = qaBound.value;
    const reasons = [];
    const rollback = validateRollbackBindings(ledger);
    const ledgerDeclared = validateDeclaredBindings(ledger);
    const qaDeclared = validateDeclaredBindings(qa);
    let postRegionSha256 = null;
    if (ledger.postSnapshot?.identity?.path
      && fs.existsSync(absolute(ledger.postSnapshot.identity.path))) {
      postRegionSha256 = readJsonBytes(ledger.postSnapshot.identity.path).value.sha256 ?? null;
    }
    if (ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
      || ledger.releaseNodeId !== REQUIRED_NODES[5]
      || ledger.transactionId !== 'combined-zones-r12q-b09-lower-two-turn-rail-closure') {
      reasons.push('R12Q_LEDGER_IDENTITY_OR_STATUS_INVALID');
    }
    if (!statusPasses(qa)
      || qa.ledger?.sha256 !== sha256(ledgerBound.bytes)
      || relative(qa.ledger?.path ?? '') !== relative(R12Q_PREDECESSOR_LEDGER)
      || getTerminalCompleteSave(qa) !== ledger.postSnapshot?.completeSaveSha256
      || getTerminalRegion(qa) !== postRegionSha256
      || getCompletedIdentity(qa) !== ledger.completedReleaseIdentitySha256) {
      reasons.push('R12Q_INDEPENDENT_POST_QA_BINDING_INVALID');
    }
    reasons.push(...rollback.failures.map(({ reason }) => `R12Q_${reason}`));
    reasons.push(...ledgerDeclared.failures.map(({ reason }) => `R12Q_LEDGER_${reason}`));
    reasons.push(...qaDeclared.failures.map(({ reason }) => `R12Q_QA_${reason}`));
    return {
      status: reasons.length ? 'WAITING' : 'PASS',
      ledger: fileBinding(R12Q_PREDECESSOR_LEDGER),
      independentPostQa: fileBinding(R12Q_PREDECESSOR_QA),
      evidenceStatus: qa.status ?? null,
      transactionId: ledger.transactionId ?? null,
      completedAtUtc: ledger.completedAtUtc ?? null,
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 ?? null,
      postCompleteSaveSha256: ledger.postSnapshot?.completeSaveSha256 ?? null,
      postRegionSha256,
      rollbackPreflightCount: rollback.rollbackPreflightCount,
      reasons,
    };
  } catch (error) {
    return {
      status: 'WAITING',
      ledgerPath: relative(R12Q_PREDECESSOR_LEDGER),
      qaPath: relative(R12Q_PREDECESSOR_QA),
      reasons: [`R12Q_PASSIVE_PREDECESSOR_INVALID:${error.message}`],
    };
  }
}

function evaluateFinalQa(finalLedger) {
  if (!fs.existsSync(absolute(FINAL_POST_QA))) return {
    status: 'WAITING', path: relative(FINAL_POST_QA), exists: false,
    reasons: ['FINAL_INDEPENDENT_POST_QA_MISSING'],
  };
  try {
    const bound = readJsonBytes(FINAL_POST_QA);
    const qa = bound.value;
    const reasons = [];
    if (!statusPasses(qa)) reasons.push('FINAL_POST_QA_NOT_PASS');
    const qaLedger = qa.ledger;
    if (!qaLedger?.path || relative(qaLedger.path) !== relative(FINAL_LEDGER)
      || qaLedger.sha256 !== finalLedger.sha256) {
      reasons.push('FINAL_POST_QA_DOES_NOT_HASH_BIND_FINAL_LEDGER');
    }
    if (getTerminalCompleteSave(qa) !== finalLedger.postCompleteSaveSha256) {
      reasons.push('FINAL_POST_QA_TERMINAL_COMPLETE_SAVE_MISMATCH');
    }
    if (getTerminalRegion(qa) !== finalLedger.postRegionSha256) {
      reasons.push('FINAL_POST_QA_TERMINAL_REGION_MISMATCH');
    }
    if (getCompletedIdentity(qa) !== finalLedger.completedReleaseIdentitySha256) {
      reasons.push('FINAL_POST_QA_COMPLETED_IDENTITY_MISMATCH');
    }
    const declared = validateDeclaredBindings(qa);
    reasons.push(...declared.failures.map(({ reason }) => `FINAL_QA_${reason}`));
    return {
      status: reasons.length ? 'WAITING' : 'PASS',
      ...fileBinding(FINAL_POST_QA),
      exists: true,
      reasons,
      evidenceStatus: qa.status ?? null,
      qaPayloadSha256: qa.qaPayloadSha256 ?? null,
      terminalCompleteSaveSha256: getTerminalCompleteSave(qa),
      terminalRegionSha256: getTerminalRegion(qa),
      completedReleaseIdentitySha256: getCompletedIdentity(qa),
      declaredBindingCount: declared.declaredBindingCount,
    };
  } catch (error) {
    return {
      status: 'WAITING', path: relative(FINAL_POST_QA), exists: true,
      reasons: [`FINAL_POST_QA_INVALID:${error.message}`],
    };
  }
}

function evaluateDependency(dependency, finalLedger) {
  if (!fs.existsSync(absolute(dependency.filename))) return {
    releaseNodeId: dependency.id,
    kind: dependency.kind,
    status: 'WAITING',
    evidence: { path: relative(dependency.filename), exists: false },
    reasons: ['DEPENDENCY_CLOSURE_MISSING'],
  };
  try {
    const bound = readJsonBytes(dependency.filename);
    const record = bound.value;
    const reasons = [];
    if (!statusPasses(record)) reasons.push('DEPENDENCY_CLOSURE_NOT_PASS');
    if (dependency.requireCommissioningStatus && !record.status?.includes('COMMISSION')) {
      reasons.push('DEPENDENCY_CLOSURE_NOT_COMMISSIONING');
    }
    const activeShuttleCommissioned = record.activeShuttleCommissioned
      ?? record.disposition?.activeShuttleCommissioned
      ?? record.commissionedSystem?.activeShuttleCommissioned
      ?? false;
    if (dependency.requireActiveShuttleCommissioning && activeShuttleCommissioned !== true) {
      reasons.push('DEPENDENCY_ACTIVE_SHUTTLE_NOT_COMMISSIONED');
    }
    let resolvedNodeId = getReleaseNodeId(record);
    if (!resolvedNodeId && record.ledger?.path && fs.existsSync(absolute(record.ledger.path))) {
      const closureLedger = readJsonBytes(record.ledger.path).value;
      resolvedNodeId = closureLedger.releaseNodeId ?? null;
      const rollback = validateRollbackBindings(closureLedger);
      if (closureLedger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
        || rollback.failures.length) reasons.push('BOUND_CLOSURE_LEDGER_NOT_REVERSIBLE');
    }
    if (resolvedNodeId !== dependency.id) reasons.push('DEPENDENCY_RELEASE_NODE_MISMATCH');
    const declared = validateDeclaredBindings(record);
    reasons.push(...declared.failures.map(({ reason }) => `DEPENDENCY_${reason}`));
    const closureTerminalPost = getTerminalCompleteSave(record);
    if (dependency.requireTerminalPostBinding
      && closureTerminalPost !== finalLedger.postCompleteSaveSha256) {
      reasons.push('DEPENDENCY_COMMISSIONING_TERMINAL_POST_MISMATCH');
    }
    return {
      releaseNodeId: dependency.id,
      kind: dependency.kind,
      status: reasons.length ? 'WAITING' : 'PASS',
      evidence: { ...fileBinding(dependency.filename), exists: true },
      evidenceStatus: record.status ?? null,
      resolvedReleaseNodeId: resolvedNodeId,
      terminalCompleteSaveSha256: closureTerminalPost,
      activeShuttleCommissioned,
      declaredBindingCount: declared.declaredBindingCount,
      reasons,
    };
  } catch (error) {
    return {
      releaseNodeId: dependency.id,
      kind: dependency.kind,
      status: 'WAITING',
      evidence: { path: relative(dependency.filename), exists: true },
      reasons: [`DEPENDENCY_CLOSURE_INVALID:${error.message}`],
    };
  }
}

function findEvidenceLedgers(root) {
  if (!fs.existsSync(absolute(root))) return [];
  const pending = [absolute(root)];
  const found = [];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filename = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(filename);
      else if (entry.isFile() && entry.name === 'evidence-ledger.json') found.push(filename);
    }
  }
  return found;
}

function evaluateRequiredPhysicalLedgerOrder(finalLedger) {
  const filenames = new Set(findEvidenceLedgers(WORLD_REVIEW_ROOT).map(absolute));
  filenames.add(absolute(FINAL_LEDGER));
  const records = [];
  for (const filename of [...filenames].sort()) {
    try {
      const bound = readJsonBytes(filename);
      const ledger = bound.value;
      if (ledger.status !== 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
        || !REQUIRED_NODES.includes(ledger.releaseNodeId)) continue;
      records.push({
        ...fileBinding(filename),
        releaseNodeId: ledger.releaseNodeId,
        transactionId: ledger.transactionId ?? null,
        completedAtUtc: ledger.completedAtUtc ?? null,
        postCompleteSaveSha256: ledger.postSnapshot?.completeSaveSha256 ?? null,
      });
    } catch {
      // Unrelated malformed historical evidence is not an accepted required ledger.
    }
  }
  records.sort((left, right) => (
    Date.parse(left.completedAtUtc ?? 0) - Date.parse(right.completedAtUtc ?? 0)
      || left.path.localeCompare(right.path)
  ));
  const finalTime = Date.parse(finalLedger.completedAtUtc ?? 0);
  const later = records.filter(({ completedAtUtc, path: filename }) => (
    Date.parse(completedAtUtc ?? 0) > finalTime && filename !== relative(FINAL_LEDGER)
  ));
  return {
    status: Number.isFinite(finalTime) && later.length === 0 ? 'PASS' : 'WAITING',
    requiredPhysicalLedgerCount: records.length,
    requiredPhysicalLedgerInventorySha256: stableHash(records),
    latestRequiredPhysicalLedger: records.at(-1) ?? null,
    suppliedFinalLedgerIsLatest: later.length === 0
      && records.at(-1)?.path === relative(FINAL_LEDGER),
    laterRequiredPhysicalLedgerCount: later.length,
    laterRequiredPhysicalLedgers: later,
  };
}

const contract = readJsonBytes(RELEASE_CONTRACT);
const r13 = contract.value.releaseSequence?.find(
  ({ id }) => id === 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
);
if (JSON.stringify(r13?.dependsOn) !== JSON.stringify(REQUIRED_NODES)) {
  throw new Error('R13 terminal verifier rejected: release-contract R07-R12 dependencies drifted');
}
const r12qPassivePredecessor = evaluateR12qPassivePredecessor();
const finalLedger = evaluateFinalLedger(r12qPassivePredecessor);
const finalQa = evaluateFinalQa(finalLedger);
const dependencyClosures = DEPENDENCIES.map(
  (dependency) => evaluateDependency(dependency, finalLedger),
);
const ledgerOrder = evaluateRequiredPhysicalLedgerOrder(finalLedger);
const allDependenciesAccepted = dependencyClosures.every(({ status }) => status === 'PASS');
const g16Pass = r12qPassivePredecessor.status === 'PASS'
  && finalLedger.status === 'PASS' && ledgerOrder.status === 'PASS'
  && ledgerOrder.suppliedFinalLedgerIsLatest;
const g17Pass = finalQa.status === 'PASS' && allDependenciesAccepted;
const gates = [
  {
    id: 'G16_IMMUTABLE_TERMINAL_POST_AND_ROLLBACK_PREFLIGHT',
    status: g16Pass ? 'PASS' : 'WAITING',
    basis: g16Pass
      ? 'The supplied final required physical ledger is executed/reversible, its active manifest hash-binds R12Q, every fresh-source target guard passes, its immutable post is sealed, and no later required R07-R12 ledger exists.'
      : 'The final ledger, R12Q manifest lineage, exact-source preflight, post/rollback chain, or terminal ordering is incomplete.',
  },
  {
    id: 'G17_TERMINAL_FUNCTIONAL_POST_QA_AND_BOUNDED_DEPENDENCY_CLOSURES',
    status: g17Pass ? 'PASS' : 'WAITING',
    basis: g17Pass
      ? 'The final independent post QA and every bounded R07-R12 dependency closure pass.'
      : 'The final independent post QA or at least one R07-R12 bounded closure remains waiting.',
  },
];
const accepted = g16Pass && g17Pass;
const waitingReasons = [
  ...finalLedger.reasons.map((reason) => `final-ledger:${reason}`),
  ...r12qPassivePredecessor.reasons.map((reason) => `r12q-predecessor:${reason}`),
  ...finalQa.reasons.map((reason) => `final-post-qa:${reason}`),
  ...dependencyClosures.flatMap((dependency) => dependency.reasons.map(
    (reason) => `${dependency.releaseNodeId}:${reason}`,
  )),
  ...(ledgerOrder.status === 'PASS' ? [] : ['terminal-order:LATER_REQUIRED_PHYSICAL_LEDGER_OR_INVALID_FINAL_TIME']),
];
const reportWithoutIdentity = {
  schemaVersion: 1,
  generatedAtUtc: GENERATED_AT,
  status: accepted
    ? 'PASS_R13_TERMINAL_POST_ACCEPTED'
    : 'WAITING_R13_TERMINAL_POST_ACCEPTANCE',
  releaseNodeId: 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
  mode: 'READ_ONLY_TERMINAL_PHYSICAL_POST_ACCEPTANCE',
  r12qPassivePhysicalPredecessor: r12qPassivePredecessor,
  finalLedger: Object.fromEntries(Object.entries(finalLedger).filter(([key]) => key !== 'ledger')),
  finalIndependentPostQa: finalQa,
  dependencyClosures,
  requiredPhysicalLedgerOrder: ledgerOrder,
  gates,
  summary: {
    accepted,
    requiredDependencyCount: dependencyClosures.length,
    acceptedDependencyCount: dependencyClosures.filter(({ status }) => status === 'PASS').length,
    waitingDependencyCount: dependencyClosures.filter(({ status }) => status === 'WAITING').length,
    gateCount: gates.length,
    passedGateCount: gates.filter(({ status }) => status === 'PASS').length,
    waitingGateCount: gates.filter(({ status }) => status === 'WAITING').length,
    waitingReasonCount: waitingReasons.length,
  },
  waitingReasons,
  exclusions: {
    evaluatesG18MediaOrPublication: false,
    publishesExternalArtifacts: false,
    authorizesPhysicalMutation: false,
    acceptsR12nOrR12qPassiveRailEvidenceAsActiveCommissioning: false,
  },
  safetyBoundary: {
    readOnly: true,
    liveCallsPerformed: false,
    worldEditsPerformed: false,
    docsModified: false,
    canonicalBuildopsModified: false,
    canonicalR13ReadinessModified: false,
    serviceMutationsPerformed: false,
  },
  bindings: { releaseContract: fileBinding(RELEASE_CONTRACT) },
};
const terminalAcceptancePayloadSha256 = stableHash(reportWithoutIdentity);
const report = { ...reportWithoutIdentity, terminalAcceptancePayloadSha256 };
const rows = dependencyClosures.map((dependency) => (
  `| ${dependency.releaseNodeId} | ${dependency.status} | ${dependency.evidence.path} |`
)).join('\n');
const markdown = `# R13 terminal physical-post acceptance\n\nStatus: **${report.status}**\n\nThis verifier is separate from G18 media/publication. It performed no live call, world mutation, docs/buildops edit, service mutation, or publication.\n\n| Required dependency | Closure | Evidence |\n|---|---:|---|\n${rows}\n\nG16 terminal post/rollback: **${gates[0].status}**. G17 final post QA plus six bounded closures: **${gates[1].status}**.\n\nCurrent waits:\n\n${waitingReasons.length ? waitingReasons.map((reason) => `- ${reason}`).join('\n') : '- None.'}\n\nPayload SHA-256: \`${terminalAcceptancePayloadSha256}\`.\n`;
fs.mkdirSync(path.dirname(absolute(OUT)), { recursive: true });
fs.mkdirSync(path.dirname(absolute(MD_OUT)), { recursive: true });
fs.writeFileSync(absolute(OUT), `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(absolute(MD_OUT), markdown);
console.log(JSON.stringify({
  status: report.status,
  out: relative(OUT),
  markdown: relative(MD_OUT),
  terminalAcceptancePayloadSha256,
  summary: report.summary,
}, null, 2));
