#!/usr/bin/env node
/** Composed guarded R12R block + entity + functional release transaction. */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle';
export const RELEASE_NODE = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
export const MANIFEST =
  'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle.release-manifest.json';
const ENTITY = 'scripts/run_guarded_tagged_minecart_transaction.py';
const FUNCTIONAL = 'scripts/run_combined_zones_r12r_b09_active_shuttle_functional.py';
const CHUNK_LEASE = 'scripts/run_combined_zones_r12r_chunk_lease.py';
const COMMON_ENTITY_ARGS = [
  '--transaction-id', TRANSACTION_ID,
  '--min-x', '2058', '--min-y', '130', '--min-z', '-748',
  '--max-x', '2073', '--max-y', '131', '--max-z', '-747',
  '--spawn-x', '2058.5', '--spawn-y', '130.0625', '--spawn-z', '-747.5',
];

const sha256 = (data) => crypto.createHash('sha256').update(data).digest('hex');
const relative = (filename) => path.relative(ROOT, path.resolve(ROOT, filename)).split(path.sep).join('/');
const binding = (filename) => ({
  path: relative(filename),
  sha256: sha256(fs.readFileSync(path.resolve(ROOT, filename))),
  bytes: fs.statSync(path.resolve(ROOT, filename)).size,
});
const readJson = (filename) => JSON.parse(fs.readFileSync(path.resolve(ROOT, filename), 'utf8'));
const invariant = (condition, message) => {
  if (!condition) throw new Error(`R12R composed release rejected: ${message}`);
};
const payloadHash = (value, field) => {
  const payload = { ...value };
  delete payload[field];
  return sha256(JSON.stringify(payload));
};

export function composedPlan() {
  const manifest = readJson(MANIFEST);
  invariant(manifest.transactionId === TRANSACTION_ID && manifest.scope.exactBlockTargetCount === 19,
    'canonical manifest identity/scope drifted');
  return {
    schemaVersion: 1,
    transactionId: TRANSACTION_ID,
    releaseNodeId: RELEASE_NODE,
    mode: 'PREPARE_ONLY_NO_RCON_CONNECTION',
    manifest: binding(MANIFEST),
    kernels: {
      blockWrapper: binding('scripts/run_combined_zones_scoped_release.mjs'),
      entityExecutor: binding(ENTITY),
      functionalVerifier: binding(FUNCTIONAL),
      chunkLease: binding(CHUNK_LEASE),
    },
    exactBlockTargetCount: 19,
    packageOrder: [
      'b09-active-shuttle-fail-closed-controls',
      'b09-active-shuttle-fail-closed-track',
    ],
    requiredTemporaryChunks: [{ x: 128, z: -47 }, { x: 129, z: -47 }],
    successSequence: [
      'fresh-source-complete-save-and-block-safety-kernel-prepare',
      'acquire-exact-two-chunk-lease-preserving-preexisting-set',
      'strict-controls-forward-2',
      'strict-track-forward-17',
      'guarded-tagged-minecart-forward',
      'functional-west-east-west-and-final-controls-off-west-park',
      'terminal-loaded-checkpoint-complete-save',
      'release-only-owned-chunk-additions-and-verify-exact-restoration',
      'final-post-complete-save-and-intake',
      'track-then-controls-rollback-poststate-preflights',
      'composed-poststate-ledger',
    ],
    compensationSequence: [
      'acquire-or-retain-exact-chunk-lease',
      'exact-uuid-type-tag-entity-rollback-first-if-forward-committed',
      'track-block-inverse',
      'controls-block-inverse',
      'recovery-loaded-checkpoint-save',
      'release-only-owned-chunk-additions-and-verify-restoration',
      'final-recovery-complete-save-and-source-state-verification',
    ],
    terminalContract: {
      exactTaggedMinecartCount: 1,
      controlsOff: true,
      unpoweredRailCount: 15,
      stationaryWestPark: true,
      fullGuidewayOrPassengerCommissioning: false,
    },
    safetyBoundary: {
      defaultConnectsRcon: false,
      existingBlockWrapperModified: false,
      entityCompensationBeforeBlockRollback: true,
      broadEntityCleanupAllowed: false,
      tagOnlyEntityCleanupAllowed: false,
      noForceLoadRemoveAll: true,
    },
  };
}

export function compensationStages({ controlsAttempted, trackAttempted, entityCommitted }) {
  return [
    ...(entityCommitted ? ['entity-exact-uuid-rollback'] : []),
    ...(trackAttempted ? ['track-block-rollback'] : []),
    ...(controlsAttempted ? ['controls-block-rollback'] : []),
  ];
}

export async function runStateMachine(actions) {
  const state = {
    controlsAttempted: false,
    trackAttempted: false,
    entityCommitted: false,
    leaseActive: false,
    events: [],
  };
  try {
    await actions.prepare(); state.events.push('prepare');
    await actions.acquireLease(); state.leaseActive = true; state.events.push('acquire-lease');
    state.controlsAttempted = true; await actions.controlsForward(); state.events.push('controls-forward');
    state.trackAttempted = true; await actions.trackForward(); state.events.push('track-forward');
    await actions.entityForward(); state.entityCommitted = true; state.events.push('entity-forward');
    await actions.functional(); state.events.push('functional');
    await actions.loadedCheckpoint(); state.events.push('loaded-checkpoint');
    await actions.releaseLease(); state.leaseActive = false; state.events.push('release-lease');
    await actions.finalPost(); state.events.push('final-post');
    await actions.postQa(); state.events.push('post-qa');
    return { status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE', ...state };
  } catch (error) {
    state.events.push(`failure:${error.message}`);
    const recoveryErrors = [];
    if (!state.leaseActive && (state.controlsAttempted || state.entityCommitted)) {
      try {
        await actions.acquireRecoveryLease();
        state.leaseActive = true;
        state.events.push('acquire-recovery-lease');
      } catch (recoveryError) {
        recoveryErrors.push({ stage: 'acquire-recovery-lease', error: recoveryError.message });
        state.events.push(`recovery-failure:acquire-recovery-lease:${recoveryError.message}`);
      }
    }
    if (state.leaseActive) {
      for (const stage of compensationStages(state)) {
        try {
          await actions.compensate(stage);
          state.events.push(stage);
          if (stage === 'entity-exact-uuid-rollback') state.entityCommitted = false;
        } catch (compensationError) {
          recoveryErrors.push({ stage, error: compensationError.message });
          state.events.push(`compensation-failure:${stage}:${compensationError.message}`);
          // Never continue into a dependent block inverse when the exact entity
          // rollback or a prior block inverse is unverified.
          break;
        }
      }
    }
    if (state.leaseActive) {
      try {
        await actions.recoveryCheckpoint(); state.events.push('recovery-checkpoint');
      } catch (recoveryError) {
        recoveryErrors.push({ stage: 'recovery-checkpoint', error: recoveryError.message });
        state.events.push(`recovery-failure:recovery-checkpoint:${recoveryError.message}`);
      }
    }
    if (state.leaseActive) {
      try {
        await actions.releaseLease(); state.leaseActive = false; state.events.push('release-lease');
      } catch (recoveryError) {
        recoveryErrors.push({ stage: 'release-lease', error: recoveryError.message });
        state.events.push(`recovery-failure:release-lease:${recoveryError.message}`);
      }
    }
    if (!state.leaseActive) {
      try {
        await actions.finalRecovery(); state.events.push('final-recovery');
      } catch (recoveryError) {
        recoveryErrors.push({ stage: 'final-recovery', error: recoveryError.message });
        state.events.push(`recovery-failure:final-recovery:${recoveryError.message}`);
      }
    }
    const fullyCompensated = recoveryErrors.length === 0 && state.entityCommitted === false;
    return {
      status: fullyCompensated
        ? 'COMPOSED_FAILED_COMPENSATED_AND_RECOVERY_VERIFIED'
        : 'COMPOSED_COMPENSATION_INCOMPLETE_MANUAL_INTERVENTION_REQUIRED',
      recoveryErrors,
      ...state,
    };
  }
}

function parseArgs(argv) {
  const values = new Map();
  const flags = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (['--execute', '--print-plan'].includes(entry)) {
      flags.add(entry);
      continue;
    }
    invariant(entry.startsWith('--') && argv[index + 1] && !argv[index + 1].startsWith('--'),
      `invalid argument ${entry}`);
    values.set(entry, argv[index + 1]);
    index += 1;
  }
  return { values, flags };
}

function required(parsed, flag) {
  const value = parsed.values.get(flag);
  invariant(value, `${flag} is required`);
  return value;
}

function exclusiveDirectory(filename, label) {
  const absolute = path.resolve(ROOT, filename);
  invariant(!fs.existsSync(absolute), `${label} already exists`);
  fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}

function writeLedger(filename, ledger) {
  const temporary = `${filename}.tmp-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(ledger, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, filename);
}

function evidenceFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const filename = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...evidenceFiles(filename));
    else if (entry.isFile() && path.basename(filename) !== 'evidence-ledger.json') files.push(filename);
  }
  return files;
}

function invoke(ledger, ledgerPath, stage, command, args, allowFailure = false) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 30 * 60 * 1000,
  });
  const record = {
    stage,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    command: [command, ...args],
    exitStatus: result.status,
    signal: result.signal,
    spawnError: result.error?.message ?? null,
    stdoutTail: String(result.stdout ?? '').slice(-8000),
    stderrTail: String(result.stderr ?? '').slice(-8000),
  };
  ledger.stages.push(record);
  writeLedger(ledgerPath, ledger);
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${stage} failed: ${record.stderrTail || record.stdoutTail}`);
  }
  return record;
}

const production = ['--endpoint', 'production', '--confirm-production', TRANSACTION_ID];
const pkg = (manifest, key) => manifest.packages.find((entry) => entry.key === key);

async function execute(parsed) {
  invariant(parsed.values.get('--confirm-production') === TRANSACTION_ID,
    '--confirm-production must exactly equal transactionId');
  const outDir = exclusiveDirectory(required(parsed, '--out-dir'), '--out-dir');
  const ledgerPath = path.join(outDir, 'evidence-ledger.json');
  const source = required(parsed, '--source-snapshot-root');
  const loadedPost = required(parsed, '--terminal-loaded-snapshot-root');
  const post = required(parsed, '--post-snapshot-root');
  const loadedRecovery = required(parsed, '--recovery-loaded-snapshot-root');
  const recovery = required(parsed, '--recovery-snapshot-root');
  for (const [value, label] of [[source, 'source'], [loadedPost, 'terminal loaded'], [post, 'post'],
    [loadedRecovery, 'recovery loaded'], [recovery, 'recovery']]) {
    invariant(!fs.existsSync(path.resolve(ROOT, value)), `${label} snapshot root already exists`);
  }
  const manifest = readJson(MANIFEST);
  const controls = pkg(manifest, 'b09-active-shuttle-fail-closed-controls');
  const track = pkg(manifest, 'b09-active-shuttle-fail-closed-track');
  const ledger = {
    schemaVersion: 1,
    id: 'combined-zones-r12r-composed-active-shuttle-release',
    transactionId: TRANSACTION_ID,
    releaseNodeId: RELEASE_NODE,
    transactionKind: 'COMPOSED_BLOCK_ENTITY_FUNCTIONAL_ATOMIC_RELEASE',
    status: 'RUNNING',
    manifest: binding(MANIFEST),
    plan: composedPlan(),
    stages: [],
    blockTransaction: { exactTargetCount: 19, packageLedgers: [] },
    packages: manifest.packages.map((entry) => ({
      key: entry.key,
      forward: binding(entry.forward),
      rollback: binding(entry.rollback),
      rollbackTransitionPolicy: null,
    })),
    entityTransaction: null,
    functionalAcceptance: null,
    rollbackReadiness: null,
  };
  writeLedger(ledgerPath, ledger);
  let activeLease = null;
  let entityReport = null;
  const runCapture = (stage, destination) => invoke(ledger, ledgerPath, stage, 'python3', [
    'scripts/capture_combined_zones_complete_save.py', '--execute', '--dest', relative(destination),
  ]);
  const runLease = (mode, report, lease = null) => {
    const args = [CHUNK_LEASE, '--mode', mode, '--execute', '--report', relative(report),
      ...production];
    if (lease) args.push('--lease', relative(lease));
    invoke(ledger, ledgerPath, `chunk-lease-${mode}`, 'python3', args);
    return readJson(report);
  };
  const runBlock = (stage, operation, report, role, strict = true) => invoke(
    ledger, ledgerPath, stage, 'python3', [
      'scripts/rcon_runner.py', operation,
      ...(strict ? ['--strict-noop'] : []), '--operation-role', role,
      '--report', relative(report), '--stream-journal', `${relative(report)}.jsonl`,
    ], true,
  );
  const blockPrepareDir = path.join(outDir, 'block-prepare');
  const actions = {
    prepare: async () => {
      invoke(ledger, ledgerPath, 'block-hard-safety-kernel-prepare', process.execPath, [
        'scripts/run_combined_zones_scoped_release.mjs', '--manifest', MANIFEST,
        '--release-node', RELEASE_NODE, '--out-dir', relative(blockPrepareDir),
        '--source-snapshot-root', source,
      ]);
      invariant(readJson(path.join(blockPrepareDir, 'evidence-ledger.json')).status
        === 'READY_FOR_EXPLICIT_EXECUTION', 'block safety kernel is not execution ready');
      const prepared = readJson(path.join(blockPrepareDir, 'evidence-ledger.json'));
      ledger.sourceSnapshot = prepared.sourceSnapshot;
      for (const stage of prepared.stages.filter((entry) => (
        entry.stage.startsWith('forward-source-preflight:')
          || entry.stage.startsWith('strict-forward-parser-check:')
          || entry.stage.startsWith('strict-rollback-parser-check:')
          || entry.stage.startsWith('projected-rollback-preflight:')
          || entry.stage === 'block-entity-clearance'
          || entry.stage === 'live-entity-clearance'
      ))) {
        ledger.stages.push({ ...stage, importedFrom: relative(path.join(blockPrepareDir, 'evidence-ledger.json')) });
      }
      writeLedger(ledgerPath, ledger);
    },
    acquireLease: async () => {
      const report = path.join(outDir, 'chunk-lease-forward.json');
      activeLease = report;
      ledger.chunkLease = { forward: binding(report) };
    },
    acquireRecoveryLease: async () => {
      const report = path.join(outDir, 'chunk-lease-recovery.json');
      runLease('acquire', report);
      activeLease = report;
      ledger.chunkLease = { ...(ledger.chunkLease ?? {}), recovery: binding(report) };
    },
    controlsForward: async () => {
      invoke(ledger, ledgerPath,
        'same-moment-package-entity-clearance:b09-active-shuttle-fail-closed-controls',
        'python3', [
          'scripts/redevelopment_live_entity_gate.py', '--ops', controls.forward,
          '--capture-blocker-nbt', '--report', relative(path.join(
            outDir, 'controls-same-moment-entity-clearance.json',
          )),
        ]);
      const report = path.join(outDir, 'controls-forward-execution.json');
      const result = runBlock('controls-forward', controls.forward, report, 'forward');
      if (result.exitStatus !== 0) throw new Error('controls forward failed');
      ledger.blockTransaction.packageLedgers.push(binding(report));
    },
    trackForward: async () => {
      invoke(ledger, ledgerPath,
        'same-moment-package-entity-clearance:b09-active-shuttle-fail-closed-track',
        'python3', [
          'scripts/redevelopment_live_entity_gate.py', '--ops', track.forward,
          '--capture-blocker-nbt', '--report', relative(path.join(
            outDir, 'track-same-moment-entity-clearance.json',
          )),
        ]);
      const report = path.join(outDir, 'track-forward-execution.json');
      const result = runBlock('track-forward', track.forward, report, 'forward');
      if (result.exitStatus !== 0) throw new Error('track forward failed');
      ledger.blockTransaction.packageLedgers.push(binding(report));
    },
    entityForward: async () => {
      const report = path.join(outDir, 'tagged-minecart-forward.json');
      const journal = path.join(outDir, 'tagged-minecart-forward.jsonl');
      const result = invoke(ledger, ledgerPath, 'tagged-minecart-forward', 'python3', [
        ENTITY, ...COMMON_ENTITY_ARGS, ...production, '--execute',
        '--report', relative(report), '--journal', relative(journal),
      ], true);
      entityReport = fs.existsSync(report) ? report : null;
      if (result.exitStatus !== 0 || readJson(report).status !== 'EXECUTED_POSTCONDITION_VERIFIED') {
        throw new Error('tagged minecart forward failed or self-compensation was required');
      }
      ledger.entityTransaction = {
        forwardReport: binding(report),
        forwardReportPayloadSha256: readJson(report).reportPayloadSha256,
        exactCapturedUuidRollbackReady: true,
        compensateBeforeBlockRollback: true,
      };
    },
    functional: async () => {
      const report = path.join(outDir, 'functional-acceptance.json');
      const result = invoke(ledger, ledgerPath, 'functional-west-east-west', 'python3', [
        FUNCTIONAL, '--entity-forward-report', relative(entityReport), ...production,
        '--execute', '--report', relative(report),
      ], true);
      if (result.exitStatus !== 0) throw new Error('functional acceptance failed');
      ledger.functionalAcceptance = {
        report: binding(report), reportPayloadSha256: readJson(report).reportPayloadSha256,
      };
    },
    loadedCheckpoint: async () => runCapture('terminal-loaded-checkpoint', loadedPost),
    releaseLease: async () => {
      const report = path.join(outDir, `chunk-lease-release-${ledger.stages.length}.json`);
      runLease('release', report, activeLease);
      activeLease = null;
      ledger.chunkLease.release = binding(report);
    },
    finalPost: async () => runCapture('final-post-complete-save', post),
    postQa: async () => {
      const intake = path.join(outDir, 'post-complete-save-intake.json');
      invoke(ledger, ledgerPath, 'post-complete-save-intake', process.execPath, [
        'scripts/audit_combined_zones_complete_save.mjs', '--world-root', post,
        '--out', relative(intake), '--markdown', relative(path.join(outDir, 'post-intake.md')),
      ]);
      const identityResult = invoke(ledger, ledgerPath, 'post-snapshot-identity', process.execPath, [
        'scripts/hash_world_snapshot.mjs', `${post}/region`,
      ]);
      const identityValue = JSON.parse(identityResult.stdoutTail);
      const identity = path.join(outDir, 'post-snapshot-identity.json');
      fs.writeFileSync(identity, `${JSON.stringify(identityValue, null, 2)}\n`);
      const intakeValue = readJson(intake);
      const rollbackReports = [];
      for (const [name, operation, overlays] of [
        ['track', track.rollback, []], ['controls', controls.rollback, [track.rollback]],
      ]) {
        const report = path.join(outDir, `${name}-rollback-poststate-preflight.json`);
        invoke(ledger, ledgerPath, `${name}-rollback-poststate-preflight`, process.execPath, [
          'scripts/preflight_guarded_ops.mjs', operation, '--regions', `${post}/region`,
          ...overlays.flatMap((entry) => ['--source-overlay-ops', entry]), '--report', relative(report),
        ]);
        rollbackReports.push(binding(report));
      }
      ledger.postSnapshot = {
        root: post,
        regions: `${post}/region`,
        identity: binding(identity),
        completeSaveIntake: binding(intake),
        completeSaveSha256: intakeValue.packageIdentity.completeSaveSha256,
        regionSha256: identityValue.sha256,
      };
      ledger.blockTransaction.rollbackPoststatePassCount = 19;
      ledger.rollbackPoststatePreflights = rollbackReports;
      ledger.rollbackReadiness = {
        status: 'PASS_EXACT_ENTITY_FIRST_THEN_BLOCK_INVERSE',
        broadEntityCleanupAllowed: false,
        tagOnlyCleanupAllowed: false,
        exactEntitySelectorCommand: (() => {
          const uuid = readJson(entityReport).capturedIdentity.uuidIntArray.join(',');
          return 'kill @e[type=minecraft:minecart,'
            + 'tag=cz_r12_7464210e11d51e28eb4e133e2d40fd0b,'
            + 'x=2058,y=130,z=-748,dx=15,dy=1,dz=1,'
            + `nbt={UUID:[I;${uuid}]},limit=1]`;
        })(),
        blockRollbackOrder: ['b09-active-shuttle-fail-closed-track',
          'b09-active-shuttle-fail-closed-controls'],
        reports: rollbackReports,
      };
    },
    compensate: async (stage) => {
      if (stage === 'entity-exact-uuid-rollback') {
        const report = path.join(outDir, 'tagged-minecart-compensation.json');
        const journal = path.join(outDir, 'tagged-minecart-compensation.jsonl');
        invoke(ledger, ledgerPath, stage, 'python3', [
          ENTITY, ...COMMON_ENTITY_ARGS, ...production, '--execute', '--rollback', relative(entityReport),
          '--report', relative(report), '--journal', relative(journal),
        ]);
        return;
      }
      const isTrack = stage.startsWith('track');
      const selected = isTrack ? track : controls;
      const report = path.join(outDir, `${isTrack ? 'track' : 'controls'}-compensation.json`);
      const result = runBlock(stage, selected.rollback, report, 'rollback', false);
      if (result.exitStatus !== 0) throw new Error(`${stage} failed`);
    },
    recoveryCheckpoint: async () => runCapture('recovery-loaded-checkpoint', loadedRecovery),
    finalRecovery: async () => {
      runCapture('final-recovery-complete-save', recovery);
      for (const [name, operation, overlays] of [
        ['controls', controls.forward, []], ['track', track.forward, [controls.forward]],
      ]) {
        invoke(ledger, ledgerPath, `recovery-source-preflight:${name}`, process.execPath, [
          'scripts/preflight_guarded_ops.mjs', operation, '--regions', `${recovery}/region`,
          ...overlays.flatMap((entry) => ['--source-overlay-ops', entry]),
          '--report', relative(path.join(outDir, `recovery-source-preflight-${name}.json`)),
        ]);
      }
    },
  };
  // Acquisition is the sole action that mutates force-load state before block execution.
  actions.acquireLease = async () => {
    const report = path.join(outDir, 'chunk-lease-forward.json');
    runLease('acquire', report);
    activeLease = report;
    ledger.chunkLease = { forward: binding(report) };
  };
  const outcome = await runStateMachine(actions);
  Object.assign(ledger, outcome);
  ledger.completedAtUtc = new Date().toISOString();
  if (ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE') {
    ledger.completedReleaseIdentitySha256 = payloadHash({
      manifest: ledger.manifest,
      postSnapshot: ledger.postSnapshot,
      entityTransaction: ledger.entityTransaction,
      functionalAcceptance: ledger.functionalAcceptance,
      rollbackReadiness: ledger.rollbackReadiness,
    }, '__none__');
  }
  ledger.evidenceBindings = evidenceFiles(outDir)
    .map((filename) => binding(filename))
    .sort((left, right) => left.path.localeCompare(right.path));
  writeLedger(ledgerPath, ledger);
  process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: relative(ledgerPath) }, null, 2)}\n`);
  return ledger.status === 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE' ? 0 : 1;
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed.flags.has('--execute')) {
    const plan = composedPlan();
    plan.planPayloadSha256 = sha256(JSON.stringify(plan));
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }
  process.exitCode = await execute(parsed);
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 2;
  });
}
