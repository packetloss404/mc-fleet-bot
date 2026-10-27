#!/usr/bin/env node
/** Generate the read-only R12 bounded active-shuttle commissioning closure. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle';
const RELEASE_NODE_ID = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const DEFAULT_OUT =
  'data/world-review/combined-zones-r12-b09-bounded-transport-commissioning/r12-b09-commissioning.json';
const argv = process.argv.slice(2);
const value = (flag, fallback = null) => {
  const index = argv.indexOf(flag);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};
const GENERATED_AT = value('--generated-at', '2026-08-22T05:55:00Z');
const LEDGER = value('--ledger');
const POST_QA = value('--post-qa');
const OUT = value('--out', DEFAULT_OUT);
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const payloadHash = (record) => {
  const payload = { ...record };
  delete payload.commissioningPayloadSha256;
  return sha256(JSON.stringify(payload));
};
const addCheck = (checks, id, pass, evidence) => {
  checks.push({ id, status: pass ? 'PASS' : 'WAITING', evidence });
};
const terminalCompleteSave = (record) => record.terminalCompleteSaveSha256
  ?? record.terminalPost?.completeSaveSha256
  ?? record.postSnapshot?.completeSaveSha256
  ?? null;
const terminalRegion = (record) => record.terminalPost?.regionSha256
  ?? record.postSnapshot?.regionSha256
  ?? null;
const completedIdentity = (record) => record.completedReleaseIdentitySha256
  ?? record.releaseIdentity?.completedReleaseIdentitySha256
  ?? null;

function validateDeclaredBindings(record) {
  const results = [];
  const seen = new Set();
  const visit = (current) => {
    if (!current || typeof current !== 'object') return;
    if (typeof current.path === 'string' && /^[a-f0-9]{64}$/u.test(current.sha256 ?? '')) {
      const key = `${relative(current.path)}\0${current.sha256}`;
      if (!seen.has(key)) {
        seen.add(key);
        const exists = fs.existsSync(absolute(current.path));
        const actual = exists ? binding(current.path) : null;
        results.push({
          path: relative(current.path),
          expectedSha256: current.sha256,
          actualSha256: actual?.sha256 ?? null,
          status: exists && actual.sha256 === current.sha256 ? 'PASS' : 'WAITING',
        });
      }
    }
    for (const child of Array.isArray(current) ? current : Object.values(current)) visit(child);
  };
  visit(record);
  return results.sort((left, right) => left.path.localeCompare(right.path));
}

function safeRead(filename) {
  if (!filename || !fs.existsSync(absolute(filename))) return null;
  try {
    return readJson(filename);
  } catch {
    return null;
  }
}

export function evaluateCommissioning({ ledgerPath, postQaPath }) {
  const checks = [];
  const ledger = safeRead(ledgerPath);
  const qa = safeRead(postQaPath);
  addCheck(checks, 'completed-r12r-ledger-present', ledger !== null, {
    path: ledgerPath ? relative(ledgerPath) : null,
  });
  addCheck(checks, 'independent-r12r-post-qa-present', qa !== null, {
    path: postQaPath ? relative(postQaPath) : null,
  });
  if (!ledger || !qa) return { passed: false, checks, ledger, qa };

  const ledgerBinding = binding(ledgerPath);
  const qaBinding = binding(postQaPath);
  const identityPath = ledger.postSnapshot?.identity?.path;
  const intakePath = ledger.postSnapshot?.completeSaveIntake?.path;
  const identity = safeRead(identityPath);
  const intake = safeRead(intakePath);
  const ledgerBindings = validateDeclaredBindings(ledger);
  const qaBindings = validateDeclaredBindings(qa);
  const exactQaStatus =
    'PASS_R12R_EXACT_POSTSTATE_AND_BOUNDED_MAINTENANCE_SHUTTLE_COMMISSIONED';
  const qaCheckIds = new Set((qa.checks ?? [])
    .filter(({ status }) => status === 'PASS').map(({ id }) => id));
  const requiredQaChecks = [
    'release-and-ledger-identity',
    'immutable-post-exact-19-target-states',
    'controls-off',
    'fifteen-powered-rails-unpowered',
    'entity-forward-report-authenticated',
    'functional-west-east-west-and-fail-closed-park',
    'functional-exact-uuid-selector-transcript',
    'immutable-post-exact-tagged-minecart',
    'no-broad-or-tag-only-entity-cleanup',
    'entity-first-exact-rollback-readiness',
    'block-forward-and-rollback-readiness',
    'functional-report-ledger-binding',
  ];
  const rollbackReports = (ledger.rollbackPoststatePreflights ?? []).map((item) => {
    const report = safeRead(item.path);
    return {
      bindingPass: report !== null && binding(item.path).sha256 === item.sha256,
      status: report?.status ?? null,
      passed: report?.passed ?? null,
      failed: report?.failed ?? null,
    };
  });
  addCheck(checks, 'r12r-ledger-final-executed-reversible',
    ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'
      && ledger.transactionId === TRANSACTION_ID
      && ledger.releaseNodeId === RELEASE_NODE_ID
      && /^[a-f0-9]{64}$/u.test(ledger.completedReleaseIdentitySha256 ?? ''), {
      status: ledger.status, transactionId: ledger.transactionId,
      releaseNodeId: ledger.releaseNodeId,
      completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256,
    });
  addCheck(checks, 'independent-qa-full-pass',
    qa.status === exactQaStatus && qa.summary?.passed === true
      && qa.summary?.failCount === 0 && qa.activeShuttleCommissioned === true
      && requiredQaChecks.every((id) => qaCheckIds.has(id)), {
      status: qa.status, summary: qa.summary,
      activeShuttleCommissioned: qa.activeShuttleCommissioned,
      missingRequiredCheckIds: requiredQaChecks.filter((id) => !qaCheckIds.has(id)),
    });
  addCheck(checks, 'independent-qa-hash-binds-ledger',
    qa.ledger?.path === ledgerBinding.path && qa.ledger?.sha256 === ledgerBinding.sha256,
  { expected: ledgerBinding, observed: qa.ledger ?? null });
  addCheck(checks, 'terminal-complete-save-bound',
    /^[a-f0-9]{64}$/u.test(ledger.postSnapshot?.completeSaveSha256 ?? '')
      && intake !== null
      && ledger.postSnapshot.completeSaveIntake.sha256 === binding(intakePath).sha256
      && intake.packageIdentity?.completeSaveSha256 === ledger.postSnapshot.completeSaveSha256
      && terminalCompleteSave(qa) === ledger.postSnapshot.completeSaveSha256, {
      ledger: ledger.postSnapshot?.completeSaveSha256 ?? null,
      intake: intake?.packageIdentity?.completeSaveSha256 ?? null,
      qa: terminalCompleteSave(qa),
    });
  addCheck(checks, 'terminal-region-bound',
    identity !== null && /^[a-f0-9]{64}$/u.test(identity.sha256 ?? '')
      && ledger.postSnapshot.identity.sha256 === binding(identityPath).sha256
      && terminalRegion(qa) === identity.sha256
      && fs.existsSync(absolute(path.join(ledger.postSnapshot?.root ?? '', 'region'))), {
      ledgerIdentityPath: identityPath ?? null,
      regionSha256: identity?.sha256 ?? null,
      qaRegionSha256: terminalRegion(qa),
    });
  addCheck(checks, 'completed-release-identity-bound',
    completedIdentity(qa) === ledger.completedReleaseIdentitySha256, {
      ledger: ledger.completedReleaseIdentitySha256,
      qa: completedIdentity(qa),
    });
  addCheck(checks, 'exact-block-and-rollback-readiness',
    ledger.blockTransaction?.exactTargetCount === 19
      && ledger.blockTransaction?.rollbackPoststatePassCount === 19
      && ledger.rollbackReadiness?.status === 'PASS_EXACT_ENTITY_FIRST_THEN_BLOCK_INVERSE'
      && ledger.rollbackReadiness?.broadEntityCleanupAllowed === false
      && ledger.rollbackReadiness?.tagOnlyCleanupAllowed === false
      && rollbackReports.length === 2
      && rollbackReports.every((report) => report.bindingPass
        && report.status === 'PASS' && report.failed === 0 && report.passed > 0)
      && rollbackReports.reduce((sum, report) => sum + report.passed, 0) === 19, {
      blockTransaction: ledger.blockTransaction,
      rollbackReadiness: ledger.rollbackReadiness,
      rollbackPoststatePreflightCount: ledger.rollbackPoststatePreflights?.length ?? 0,
      rollbackReports,
    });
  const leaseReleasePath = ledger.chunkLease?.release?.path;
  const leaseRelease = safeRead(leaseReleasePath);
  addCheck(checks, 'temporary-chunk-lease-restored',
    leaseRelease !== null
      && ledger.chunkLease.release.sha256 === binding(leaseReleasePath).sha256
      && leaseRelease.status === 'LEASE_RELEASED_PREEXISTING_SET_EXACTLY_RESTORED'
      && leaseRelease.cleanupErrors?.length === 0
      && JSON.stringify(leaseRelease.finalChunks)
        === JSON.stringify(leaseRelease.preExistingChunks), {
      release: ledger.chunkLease?.release ?? null,
      status: leaseRelease?.status ?? null,
      cleanupErrors: leaseRelease?.cleanupErrors ?? null,
    });
  addCheck(checks, 'all-declared-ledger-and-qa-bindings-current',
    ledgerBindings.length > 0 && qaBindings.length > 0
      && [...ledgerBindings, ...qaBindings].every(({ status }) => status === 'PASS'), {
      ledgerBindingCount: ledgerBindings.length,
      qaBindingCount: qaBindings.length,
      waiting: [...ledgerBindings, ...qaBindings].filter(({ status }) => status !== 'PASS'),
    });
  addCheck(checks, 'bounded-commissioning-nonclaims-preserved',
    qa.commissioning?.boundedMaintenanceShuttleCommissioned === true
      && qa.commissioning?.fullB09FunicularCommissioned === false
      && qa.commissioning?.passengerOrPublicTransportCommissioned === false
      && qa.commissioning?.rescueTransportCommissioned === false
      && qa.disposition?.liveCallsPerformedByQa === false
      && qa.disposition?.worldMutationsPerformedByQa === false, {
      commissioning: qa.commissioning,
      qaDisposition: qa.disposition,
    });
  return {
    passed: checks.every(({ status }) => status === 'PASS'),
    checks,
    ledger,
    qa,
    ledgerBinding,
    qaBinding,
    terminalRegionSha256: identity?.sha256 ?? null,
    terminalCompleteSaveSha256: ledger.postSnapshot?.completeSaveSha256 ?? null,
    completedReleaseIdentitySha256: ledger.completedReleaseIdentitySha256 ?? null,
    terminalPostRoot: ledger.postSnapshot?.root ?? null,
  };
}

function writeAtomic(filename, record) {
  const destination = absolute(filename);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  if (fs.existsSync(destination)) {
    const existing = safeRead(destination);
    if (existing?.id !== 'CZ-R12-B09-BOUNDED-TRANSPORT-COMMISSIONING-CLOSURE') {
      throw new Error(`refusing to overwrite non-generator artifact ${relative(destination)}`);
    }
  }
  const temporary = `${destination}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, destination);
}

export function generateCommissioning({ ledgerPath = LEDGER, postQaPath = POST_QA,
  out = OUT, generatedAt = GENERATED_AT } = {}) {
  const evaluation = evaluateCommissioning({ ledgerPath, postQaPath });
  const passed = evaluation.passed;
  const record = {
    schemaVersion: 1,
    id: 'CZ-R12-B09-BOUNDED-TRANSPORT-COMMISSIONING-CLOSURE',
    generatedAtUtc: generatedAt,
    status: passed
      ? 'PASS_R12_B09_BOUNDED_ACTIVE_SHUTTLE_COMMISSIONED'
      : 'WAITING_R12_B09_BOUNDED_TRANSPORT_COMMISSIONING',
    releaseNodeId: RELEASE_NODE_ID,
    transactionId: passed ? TRANSACTION_ID : null,
    activeShuttleCommissioned: passed,
    terminalCompleteSaveSha256: passed ? evaluation.terminalCompleteSaveSha256 : null,
    terminalPost: {
      root: passed ? evaluation.terminalPostRoot : null,
      completeSaveSha256: passed ? evaluation.terminalCompleteSaveSha256 : null,
      regionSha256: passed ? evaluation.terminalRegionSha256 : null,
    },
    releaseIdentity: {
      completedReleaseIdentitySha256:
        passed ? evaluation.completedReleaseIdentitySha256 : null,
    },
    ledger: passed ? evaluation.ledgerBinding : {
      path: ledgerPath ? relative(ledgerPath) : null, exists: Boolean(evaluation.ledger),
    },
    independentPostQa: passed ? evaluation.qaBinding : {
      path: postQaPath ? relative(postQaPath) : null, exists: Boolean(evaluation.qa),
    },
    commissionedSystem: {
      activeShuttleCommissioned: passed,
      scope: 'B09_BOUNDED_MAINTENANCE_SHUTTLE_INDICES_9_THROUGH_25',
      exactBlockTargetCount: 19,
      persistentTaggedMinecartCount: passed ? 1 : 0,
      terminalControlsOff: passed,
      terminalPoweredRailsUnpoweredCount: passed ? 15 : 0,
      terminalMinecartStationaryWestPark: passed,
    },
    nonclaims: {
      publicTransportCommissioned: false,
      passengerTransportCommissioned: false,
      rescueTransportCommissioned: false,
      fullB09FunicularCommissioned: false,
      fullGuidewayActiveTransportCommissioned: false,
    },
    checks: evaluation.checks,
    summary: {
      passed,
      checkCount: evaluation.checks.length,
      passCount: evaluation.checks.filter(({ status }) => status === 'PASS').length,
      waitingCount: evaluation.checks.filter(({ status }) => status !== 'PASS').length,
    },
    disposition: {
      generatorLiveCallsPerformed: false,
      generatorWorldMutationsPerformed: false,
      externalPublicationPerformed: false,
      canonicalBuildopsEdited: false,
    },
  };
  record.commissioningPayloadSha256 = payloadHash(record);
  writeAtomic(out, record);
  return record;
}

const invoked = path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    const report = generateCommissioning();
    process.stdout.write(`${JSON.stringify({ status: report.status,
      activeShuttleCommissioned: report.activeShuttleCommissioned,
      commissioningPayloadSha256: report.commissioningPayloadSha256,
      output: relative(OUT) }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  }
}
