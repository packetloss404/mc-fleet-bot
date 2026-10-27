#!/usr/bin/env node
/**
 * One-command, scope-local Combined Zones guarded release workflow.
 *
 * Preparation is the default. It captures a fresh complete same-moment source
 * save, accepts the supplied exact release through structural QA, preflights every package
 * in transaction order, verifies the projected inverse, clears block entities
 * and live entities, and writes one evidence ledger. `--execute` repeats the
 * same kernel, runs strict-noop forward operations, captures an immutable post
 * snapshot, and proves the reverse-order rollback guards against that state.
 *
 * This workflow intentionally does not read the legacy G01-G19 release graph.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_AUTHORIZATION = path.join(
  ROOT,
  'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
);
export function sha256Bytes(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function sha256File(filename) {
  return sha256Bytes(fs.readFileSync(filename));
}

function canonicalPayloadSha256(record, identityField) {
  const payload = { ...record };
  delete payload[identityField];
  return sha256Bytes(JSON.stringify(payload));
}

function invariant(condition, message) {
  if (!condition) throw new Error(`Combined Zones scoped release rejected: ${message}`);
}

function resolveFromRoot(filename) {
  return path.resolve(ROOT, filename);
}

function relativeToRoot(filename) {
  return path.relative(ROOT, filename).split(path.sep).join('/');
}

function assertInside(parent, filename, label) {
  const relative = path.relative(parent, filename);
  invariant(relative && !relative.startsWith('..') && !path.isAbsolute(relative), `${label} must be inside ${relativeToRoot(parent)}`);
}

export function validateStandingAuthorization(authorization, releaseNodeId) {
  invariant(authorization.schemaVersion === 1, 'standing authorization schemaVersion must equal 1');
  invariant(authorization.projectId === 'combined-zones-phase1', 'standing authorization projectId mismatch');
  invariant(authorization.status === 'AUTHORIZED_STANDING_SCOPED_EXECUTION', 'standing authorization is not active');
  invariant(authorization.revoked === false, 'standing authorization is revoked');
  invariant(
    authorization.authorizationPayloadSha256
      === canonicalPayloadSha256(authorization, 'authorizationPayloadSha256'),
    'standing authorization payload identity drift',
  );
  invariant(
    Array.isArray(authorization.authorizedReleaseNodes)
      && authorization.authorizedReleaseNodes.includes(releaseNodeId),
    `release node ${releaseNodeId} is outside standing authorization`,
  );
  const kernel = authorization.hardSafetyKernel ?? [];
  const requiredKernel = [
    'exact-release-and-inverse',
    'fresh-source-snapshot-and-preflight',
    'strict-forward-and-rollback-parser-checks',
    'block-and-live-entity-clearance',
    'strict-execution-with-compensating-rollback',
    'post-snapshot-and-rollback-poststate-verification',
  ];
  invariant(
    requiredKernel.every((id) => kernel.some((entry) => entry.id === id && entry.required === true)),
    'standing authorization does not preserve the complete hard safety kernel',
  );
  return true;
}

function manifestReleaseNode(manifest) {
  return manifest.releaseNodeId ?? manifest.scope?.releaseNodeId ?? null;
}

export function normalizeReleaseManifest(manifest, releaseNodeId, root = ROOT, authorization = null) {
  invariant(manifest.schemaVersion === 1, 'release manifest schemaVersion must equal 1');
  invariant(typeof manifest.transactionId === 'string' && manifest.transactionId.trim(), 'release manifest transactionId is required');
  invariant(manifestReleaseNode(manifest) === releaseNodeId, 'manifest releaseNodeId does not match requested scope');
  invariant(typeof manifest.mvpScope === 'boolean', 'release manifest mvpScope must be boolean');
  if (manifest.mvpScope !== true) {
    invariant(authorization?.allowNonMvpScopes === true,
      'non-MVP release requires an explicit expanded-scope authorization');
  }
  invariant(Array.isArray(manifest.scopeIds) && manifest.scopeIds.length > 0, 'release manifest scopeIds are required');
  const excludedScopeIds = authorization?.mvpBoundary?.excludedScopeIds ?? [];
  const excluded = manifest.scopeIds.filter((scopeId) => excludedScopeIds.includes(scopeId));
  invariant(excluded.length === 0, `release manifest enters deferred MVP scope: ${excluded.join(', ')}`);
  invariant(Array.isArray(manifest.packages) && manifest.packages.length > 0, 'release manifest has no packages');
  const buildopsRoot = path.join(root, 'data/buildops');
  const keys = new Set();
  const paths = new Set();
  return manifest.packages.map((entry, index) => {
    invariant(entry && typeof entry === 'object', `package ${index} is not an object`);
    invariant(typeof entry.key === 'string' && entry.key.trim(), `package ${index} key is required`);
    invariant(!keys.has(entry.key), `duplicate package key ${entry.key}`);
    keys.add(entry.key);
    const forward = path.resolve(root, entry.forward ?? '');
    const rollback = path.resolve(root, entry.rollback ?? '');
    assertInside(buildopsRoot, forward, `${entry.key} forward`);
    assertInside(buildopsRoot, rollback, `${entry.key} rollback`);
    invariant(forward !== rollback, `${entry.key} forward and rollback paths are identical`);
    invariant(!paths.has(forward) && !paths.has(rollback), `${entry.key} reuses an operation path`);
    paths.add(forward);
    paths.add(rollback);
    invariant(fs.existsSync(forward), `missing forward operations ${path.relative(root, forward)}`);
    invariant(fs.existsSync(rollback), `missing rollback operations ${path.relative(root, rollback)}`);
    const policy = entry.rollbackTransitionPolicy
      ? path.resolve(root, entry.rollbackTransitionPolicy)
      : null;
    if (policy) {
      assertInside(buildopsRoot, policy, `${entry.key} rollback transition policy`);
      invariant(fs.existsSync(policy), `missing rollback transition policy ${path.relative(root, policy)}`);
    }
    return { key: entry.key, forward, rollback, policy };
  });
}

function operationRegionNames(filename) {
  const regions = new Set();
  for (const raw of fs.readFileSync(filename, 'utf8').split(/\r?\n/)) {
    const fields = raw.trim().split(/\s+/);
    let coordinates = [];
    if (fields[0] === 'REPL' && fields.length === 9) {
      coordinates = [fields.slice(1, 4).map(Number), fields.slice(4, 7).map(Number)];
    } else if (fields[0] === 'CMD') {
      coordinates = [...raw.matchAll(/(?:if block|data merge block) (-?\d+) (-?\d+) (-?\d+)/g)]
        .map((match) => match.slice(1, 4).map(Number));
    }
    for (const [x, , z] of coordinates) {
      if (!Number.isSafeInteger(x) || !Number.isSafeInteger(z)) continue;
      regions.add(`r.${Math.floor(x / 512)}.${Math.floor(z / 512)}.mca`);
    }
    if (fields[0] === 'REPL' && coordinates.length === 2) {
      const [[x1, , z1], [x2, , z2]] = coordinates;
      for (let regionX = Math.floor(Math.min(x1, x2) / 512); regionX <= Math.floor(Math.max(x1, x2) / 512); regionX += 1) {
        for (let regionZ = Math.floor(Math.min(z1, z2) / 512); regionZ <= Math.floor(Math.max(z1, z2) / 512); regionZ += 1) {
          regions.add(`r.${regionX}.${regionZ}.mca`);
        }
      }
    }
  }
  return regions;
}

export function requiredRegionNames(packages) {
  const names = new Set();
  for (const pkg of packages) {
    for (const filename of [pkg.forward, pkg.rollback]) {
      for (const name of operationRegionNames(filename)) names.add(name);
    }
  }
  return [...names].sort();
}

export function projectedOverlayPlan(packages) {
  const forward = packages.map((pkg, index) => ({
    key: pkg.key,
    operations: pkg.forward,
    sourceOverlays: packages.slice(0, index).map((prior) => prior.forward),
  }));
  const rollback = [];
  const completedRollbacks = [];
  for (const pkg of [...packages].reverse()) {
    rollback.push({
      key: pkg.key,
      operations: pkg.rollback,
      sourceOverlays: [
        ...packages.map((entry) => entry.forward),
        ...completedRollbacks,
      ],
    });
    completedRollbacks.push(pkg.rollback);
  }
  return { forward, rollback };
}

function parseArgs(argv) {
  const values = new Map();
  const switches = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith('--')) throw new Error(`unexpected argument ${entry}`);
    if (['--execute', '--print-plan'].includes(entry)) {
      switches.add(entry);
      continue;
    }
    invariant(argv[index + 1] && !argv[index + 1].startsWith('--'), `${entry} requires a value`);
    values.set(entry, argv[index + 1]);
    index += 1;
  }
  return { values, switches };
}

function requiredValue(parsed, flag) {
  const result = parsed.values.get(flag);
  invariant(result, `${flag} is required`);
  return result;
}

function reportBinding(filename) {
  return {
    path: relativeToRoot(filename),
    sha256: sha256File(filename),
    bytes: fs.statSync(filename).size,
  };
}

function bindEvidenceDirectory(directory, ledgerPath) {
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && path.join(directory, entry.name) !== ledgerPath)
    .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    .map((entry) => reportBinding(path.join(directory, entry.name)));
}

function writeLedger(filename, ledger) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(ledger, null, 2)}\n`);
}

function runStage(ledger, ledgerPath, stage, command, args, options = {}) {
  const startedAtUtc = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    timeout: options.timeoutMs ?? 60 * 60 * 1000,
  });
  const record = {
    stage,
    status: result.status === 0 ? 'PASS' : 'FAIL',
    command: [command, ...args],
    startedAtUtc,
    completedAtUtc: new Date().toISOString(),
    exitStatus: result.status,
    stdoutTail: String(result.stdout ?? '').slice(-8000),
    stderrTail: String(result.stderr ?? '').slice(-8000),
  };
  ledger.stages.push(record);
  writeLedger(ledgerPath, ledger);
  if (result.status !== 0 && options.allowFailure !== true) {
    const error = new Error(`${stage} failed with exit ${result.status}: ${record.stderrTail || record.stdoutTail}`);
    error.result = result;
    throw error;
  }
  return result;
}

function preflightArgs(operations, regions, report, overlays = [], policy = null) {
  return [
    'scripts/preflight_guarded_ops.mjs', relativeToRoot(operations),
    '--regions', relativeToRoot(regions),
    ...overlays.flatMap((overlay) => ['--source-overlay-ops', relativeToRoot(overlay)]),
    ...(policy ? ['--natural-transition-policy', relativeToRoot(policy)] : []),
    '--report', relativeToRoot(report),
  ];
}

function parserArgs(operations, report, role, policy = null) {
  return [
    'scripts/rcon_runner.py', relativeToRoot(operations), '--dry-run', '--strict-noop',
    '--operation-role', role,
    ...(policy ? [
      '--natural-transition-policy', relativeToRoot(policy),
      '--policy-audit-report', `${relativeToRoot(report)}.policy-audit.json`,
    ] : []),
    '--report', relativeToRoot(report),
  ];
}

function executionArgs(pkg, report, role, strict = true) {
  const operations = role === 'forward' ? pkg.forward : pkg.rollback;
  return [
    'scripts/rcon_runner.py', relativeToRoot(operations),
    ...(strict ? ['--strict-noop'] : []),
    '--operation-role', role,
    ...(role === 'rollback' && pkg.policy ? [
      '--natural-transition-policy', relativeToRoot(pkg.policy),
      '--policy-audit-report', `${relativeToRoot(report)}.policy-audit.json`,
    ] : []),
    '--report', relativeToRoot(report),
    '--stream-journal', `${relativeToRoot(report)}.stream-journal.jsonl`,
  ];
}

function ensureFreshDestination(root, label) {
  invariant(!fs.existsSync(root), `${label} already exists; use a fresh immutable destination`);
}

function assertCompleteSaveIntake(reportPath, expectedRoot) {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  invariant(
    report.status === 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
      && report.summary?.passed === true
      && report.summary?.captureManifestValid === true
      && typeof report.packageIdentity?.completeSaveSha256 === 'string',
    `complete-save intake is not PASS: ${relativeToRoot(reportPath)}`,
  );
  invariant(
    path.resolve(ROOT, report.input?.suppliedWorldRoot ?? '') === expectedRoot,
    'complete-save intake is bound to a different world root',
  );
  return report;
}

function assertSnapshotCoverage(regions, requiredNames) {
  const missing = requiredNames.filter((name) => !fs.existsSync(path.join(regions, name)));
  invariant(missing.length === 0, `fresh snapshot is missing required region files: ${missing.join(', ')}`);
}

export function executionPlan(packages, execute) {
  return {
    mode: execute ? 'EXECUTE' : 'PREPARE_ONLY',
    globalGateDependency: 'NONE',
    packageOrder: packages.map(({ key }) => key),
    stages: [
      'standing-authorization',
      'exact-release-manifest-qa',
      'fresh-source-complete-save',
      'source-complete-save-intake-and-coverage',
      'forward-source-preflight',
      'strict-forward-parser-check',
      'strict-rollback-parser-check',
      'projected-rollback-preflight',
      'block-entity-clearance',
      'live-entity-clearance',
      ...(execute ? [
        'same-moment-package-entity-clearance',
        'strict-forward-execution',
        'fresh-post-complete-save',
        'post-complete-save-intake',
        'rollback-poststate-preflight',
      ] : []),
    ],
  };
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const manifestPath = resolveFromRoot(requiredValue(parsed, '--manifest'));
  const releaseNodeId = requiredValue(parsed, '--release-node');
  const authorizationPath = resolveFromRoot(
    parsed.values.get('--authorization') ?? DEFAULT_AUTHORIZATION,
  );
  invariant(fs.existsSync(manifestPath), `manifest does not exist: ${relativeToRoot(manifestPath)}`);
  invariant(fs.existsSync(authorizationPath), `authorization does not exist: ${relativeToRoot(authorizationPath)}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const authorization = JSON.parse(fs.readFileSync(authorizationPath, 'utf8'));
  validateStandingAuthorization(authorization, releaseNodeId);
  const packages = normalizeReleaseManifest(manifest, releaseNodeId, ROOT, authorization);
  const execute = parsed.switches.has('--execute');
  const plan = executionPlan(packages, execute);
  if (parsed.switches.has('--print-plan')) {
    process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
    return;
  }

  const outDir = resolveFromRoot(requiredValue(parsed, '--out-dir'));
  const sourceRootValue = parsed.values.get('--source-snapshot-root');
  const existingSourceValue = parsed.values.get('--existing-source-regions');
  invariant(Boolean(sourceRootValue) !== Boolean(existingSourceValue), 'provide exactly one of --source-snapshot-root or --existing-source-regions');
  invariant(!fs.existsSync(outDir), '--out-dir already exists; evidence output is append-only by destination');
  const sourceRoot = sourceRootValue ? resolveFromRoot(sourceRootValue) : null;
  const sourceRegions = sourceRoot
    ? path.join(sourceRoot, 'region')
    : resolveFromRoot(existingSourceValue);
  if (sourceRoot) {
    ensureFreshDestination(sourceRoot, '--source-snapshot-root');
  }
  if (execute) {
    invariant(sourceRoot, '--execute requires a fresh --source-snapshot-root captured in the same invocation');
  }
  invariant(sourceRoot || fs.existsSync(sourceRegions), 'existing source region directory does not exist');

  const postRootValue = parsed.values.get('--post-snapshot-root');
  const postRoot = postRootValue ? resolveFromRoot(postRootValue) : null;
  if (execute) {
    invariant(postRoot, '--execute requires --post-snapshot-root');
    ensureFreshDestination(postRoot, '--post-snapshot-root');
  }

  fs.mkdirSync(outDir, { recursive: true });
  const ledgerPath = path.join(outDir, 'evidence-ledger.json');
  const authorizationBinding = reportBinding(authorizationPath);
  const manifestBinding = reportBinding(manifestPath);
  const packageBindings = packages.map((pkg) => ({
    key: pkg.key,
    forward: reportBinding(pkg.forward),
    rollback: reportBinding(pkg.rollback),
    rollbackTransitionPolicy: pkg.policy ? reportBinding(pkg.policy) : null,
  }));
  const executionBinding = {
    projectId: 'combined-zones-phase1',
    releaseNodeId,
    transactionId: manifest.transactionId,
    authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    authorizationFileSha256: authorizationBinding.sha256,
    manifestSha256: manifestBinding.sha256,
    packages: packageBindings.map((pkg) => ({
      key: pkg.key,
      forwardSha256: pkg.forward.sha256,
      rollbackSha256: pkg.rollback.sha256,
      rollbackTransitionPolicySha256: pkg.rollbackTransitionPolicy?.sha256 ?? null,
    })),
  };
  const ledger = {
    schemaVersion: 1,
    id: 'combined-zones-scoped-guarded-release',
    generatedAtUtc: new Date().toISOString(),
    status: 'RUNNING',
    mode: plan.mode,
    projectId: 'combined-zones-phase1',
    releaseNodeId,
    transactionId: manifest.transactionId,
    globalGateDependency: 'NONE_SCOPE_LOCAL_HARD_SAFETY_KERNEL_ONLY',
    authorization: authorizationBinding,
    manifest: manifestBinding,
    executionBindingSha256: sha256Bytes(JSON.stringify(executionBinding)),
    sourceSnapshot: null,
    postSnapshot: null,
    packages: packageBindings,
    stages: [{
      stage: 'standing-authorization',
      status: 'PASS',
      completedAtUtc: new Date().toISOString(),
      authorizationPayloadSha256: authorization.authorizationPayloadSha256,
    }],
  };
  writeLedger(ledgerPath, ledger);

  try {
    const manifestQa = path.join(outDir, 'exact-release-manifest-qa.json');
    runStage(ledger, ledgerPath, 'exact-release-manifest-qa', process.execPath, [
      '--max-old-space-size=8192',
      'scripts/qa_guarded_release_manifest.mjs',
      '--manifest', relativeToRoot(manifestPath),
      '--out', relativeToRoot(manifestQa),
    ]);

    if (sourceRoot) {
      runStage(ledger, ledgerPath, 'fresh-source-complete-save', 'python3', [
        'scripts/capture_combined_zones_complete_save.py', '--execute',
        '--dest', relativeToRoot(sourceRoot),
      ]);
    } else {
      ledger.stages.push({
        stage: 'fresh-source-complete-save',
        status: 'SUPPLIED_IMMUTABLE_SOURCE_PREPARE_ONLY',
        completedAtUtc: new Date().toISOString(),
        worldRoot: relativeToRoot(path.dirname(sourceRegions)),
      });
      writeLedger(ledgerPath, ledger);
    }

    const requiredRegions = requiredRegionNames(packages);
    assertSnapshotCoverage(sourceRegions, requiredRegions);
    const sourceWorldRoot = path.dirname(sourceRegions);
    const sourceIntakeReport = path.join(outDir, 'source-complete-save-intake.json');
    runStage(ledger, ledgerPath, 'source-complete-save-intake', process.execPath, [
      'scripts/audit_combined_zones_complete_save.mjs',
      '--world-root', relativeToRoot(sourceWorldRoot),
      '--out', relativeToRoot(sourceIntakeReport),
      '--markdown', relativeToRoot(path.join(outDir, 'source-complete-save-intake.md')),
      '--generated-at', new Date().toISOString(),
    ]);
    const sourceIntake = assertCompleteSaveIntake(sourceIntakeReport, sourceWorldRoot);
    const sourceHashReport = path.join(outDir, 'source-snapshot-identity.json');
    runStage(ledger, ledgerPath, 'source-snapshot-identity', process.execPath, [
      'scripts/hash_world_snapshot.mjs', relativeToRoot(sourceRegions),
    ]);
    const sourceHashStage = ledger.stages.at(-1);
    const sourceIdentity = JSON.parse(sourceHashStage.stdoutTail);
    fs.writeFileSync(sourceHashReport, `${JSON.stringify(sourceIdentity, null, 2)}\n`);
    ledger.sourceSnapshot = {
      root: sourceRoot ? relativeToRoot(sourceRoot) : null,
      regions: relativeToRoot(sourceRegions),
      identity: reportBinding(sourceHashReport),
      completeSaveIntake: reportBinding(sourceIntakeReport),
      completeSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      requiredRegionFiles: requiredRegions,
    };
    ledger.sourceBoundReleaseIdentitySha256 = sha256Bytes(JSON.stringify({
      executionBindingSha256: ledger.executionBindingSha256,
      sourceCompleteSaveSha256: sourceIntake.packageIdentity.completeSaveSha256,
      sourceRegionSha256: sourceIdentity.sha256,
    }));
    writeLedger(ledgerPath, ledger);

    const overlays = projectedOverlayPlan(packages);
    for (const entry of overlays.forward) {
      const pkg = packages.find(({ key }) => key === entry.key);
      runStage(ledger, ledgerPath, `forward-source-preflight:${entry.key}`, process.execPath,
        preflightArgs(
          entry.operations,
          sourceRegions,
          path.join(outDir, `${entry.key}.forward-source-preflight.json`),
          entry.sourceOverlays,
        ));
      runStage(ledger, ledgerPath, `strict-forward-parser-check:${entry.key}`, 'python3',
        parserArgs(
          pkg.forward,
          path.join(outDir, `${entry.key}.forward-strict-dry-run.json`),
          'forward',
        ));
      runStage(ledger, ledgerPath, `strict-rollback-parser-check:${entry.key}`, 'python3',
        parserArgs(
          pkg.rollback,
          path.join(outDir, `${entry.key}.rollback-strict-dry-run.json`),
          'rollback',
          pkg.policy,
        ));
    }
    for (const entry of overlays.rollback) {
      const pkg = packages.find(({ key }) => key === entry.key);
      runStage(ledger, ledgerPath, `projected-rollback-preflight:${entry.key}`, process.execPath,
        preflightArgs(
          entry.operations,
          sourceRegions,
          path.join(outDir, `${entry.key}.projected-rollback-preflight.json`),
          entry.sourceOverlays,
          pkg.policy,
        ));
    }

    runStage(ledger, ledgerPath, 'block-entity-clearance', process.execPath, [
      'scripts/audit_guarded_ops_block_entities.mjs',
      '--regions', relativeToRoot(sourceRegions),
      ...packages.flatMap((pkg) => ['--ops', relativeToRoot(pkg.forward)]),
      '--report', relativeToRoot(path.join(outDir, 'block-entity-clearance.json')),
    ]);
    runStage(ledger, ledgerPath, 'live-entity-clearance', 'python3', [
      'scripts/redevelopment_live_entity_gate.py',
      ...packages.flatMap((pkg) => ['--ops', relativeToRoot(pkg.forward)]),
      '--capture-blocker-nbt',
      '--report', relativeToRoot(path.join(outDir, 'live-entity-clearance.json')),
    ]);

    if (!execute) {
      ledger.status = 'READY_FOR_EXPLICIT_EXECUTION';
      ledger.completedAtUtc = new Date().toISOString();
      ledger.evidenceBindings = bindEvidenceDirectory(outDir, ledgerPath);
      writeLedger(ledgerPath, ledger);
      process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: relativeToRoot(ledgerPath) }, null, 2)}\n`);
      return;
    }

    const completed = [];
    for (const pkg of packages) {
      runStage(ledger, ledgerPath, `same-moment-package-entity-clearance:${pkg.key}`, 'python3', [
        'scripts/redevelopment_live_entity_gate.py',
        '--ops', relativeToRoot(pkg.forward), '--capture-blocker-nbt',
        '--report', relativeToRoot(path.join(outDir, `${pkg.key}.same-moment-entity-clearance.json`)),
      ]);
      const executionReport = path.join(outDir, `${pkg.key}.forward-execution.json`);
      const result = runStage(
        ledger,
        ledgerPath,
        `strict-forward-execution:${pkg.key}`,
        'python3',
        executionArgs(pkg, executionReport, 'forward', true),
        { allowFailure: true },
      );
      if (result.status === 0) {
        completed.push(pkg);
        continue;
      }
      ledger.status = 'FORWARD_FAILED_ROLLING_BACK';
      writeLedger(ledgerPath, ledger);
      const rollbackFailures = [];
      for (const [index, rollbackPkg] of [pkg, ...completed.slice().reverse()].entries()) {
        const rollbackResult = runStage(
          ledger,
          ledgerPath,
          `compensating-rollback:${rollbackPkg.key}`,
          'python3',
          executionArgs(
            rollbackPkg,
            path.join(outDir, `${rollbackPkg.key}.compensating-rollback-execution.json`),
            'rollback',
            index !== 0,
          ),
          { allowFailure: true },
        );
        if (rollbackResult.status !== 0) rollbackFailures.push(rollbackPkg.key);
      }
      ledger.status = rollbackFailures.length === 0 ? 'ROLLED_BACK_AFTER_FORWARD_FAILURE' : 'ROLLBACK_FAILED_MANUAL_INTERVENTION_REQUIRED';
      ledger.rollbackFailures = rollbackFailures;
      if (rollbackFailures.length === 0) {
        ledger.status = 'ROLLED_BACK_PENDING_RECOVERY_VERIFICATION';
        writeLedger(ledgerPath, ledger);
        try {
          runStage(ledger, ledgerPath, 'fresh-rollback-recovery-complete-save', 'python3', [
            'scripts/capture_combined_zones_complete_save.py', '--execute',
            '--dest', relativeToRoot(postRoot),
          ]);
          const recoveryRegions = path.join(postRoot, 'region');
          assertSnapshotCoverage(recoveryRegions, requiredRegions);
          const recoveryIntakeReport = path.join(outDir, 'rollback-recovery-complete-save-intake.json');
          runStage(ledger, ledgerPath, 'rollback-recovery-complete-save-intake', process.execPath, [
            'scripts/audit_combined_zones_complete_save.mjs',
            '--world-root', relativeToRoot(postRoot),
            '--out', relativeToRoot(recoveryIntakeReport),
            '--markdown', relativeToRoot(path.join(outDir, 'rollback-recovery-complete-save-intake.md')),
            '--generated-at', new Date().toISOString(),
          ]);
          const recoveryIntake = assertCompleteSaveIntake(recoveryIntakeReport, postRoot);
          for (const entry of overlays.forward) {
            runStage(
              ledger,
              ledgerPath,
              `rollback-recovery-source-preflight:${entry.key}`,
              process.execPath,
              preflightArgs(
                entry.operations,
                recoveryRegions,
                path.join(outDir, `${entry.key}.rollback-recovery-source-preflight.json`),
                entry.sourceOverlays,
              ),
            );
          }
          ledger.postSnapshot = {
            purpose: 'ROLLBACK_RECOVERY_VERIFICATION',
            root: relativeToRoot(postRoot),
            regions: relativeToRoot(recoveryRegions),
            completeSaveIntake: reportBinding(recoveryIntakeReport),
            completeSaveSha256: recoveryIntake.packageIdentity.completeSaveSha256,
          };
          ledger.status = 'ROLLED_BACK_AND_RECOVERY_VERIFIED_AFTER_FORWARD_FAILURE';
        } catch (verificationError) {
          ledger.status = 'ROLLED_BACK_RECOVERY_VERIFICATION_FAILED_MANUAL_REVIEW';
          ledger.rollbackVerificationError = verificationError.message;
        }
      }
      ledger.completedAtUtc = new Date().toISOString();
      ledger.evidenceBindings = bindEvidenceDirectory(outDir, ledgerPath);
      writeLedger(ledgerPath, ledger);
      process.exitCode = 1;
      return;
    }

    ledger.status = 'COMMITTED_PENDING_POSTSTATE_VERIFICATION';
    writeLedger(ledgerPath, ledger);
    runStage(ledger, ledgerPath, 'fresh-post-complete-save', 'python3', [
      'scripts/capture_combined_zones_complete_save.py', '--execute',
      '--dest', relativeToRoot(postRoot),
    ]);
    const postRegions = path.join(postRoot, 'region');
    assertSnapshotCoverage(postRegions, requiredRegions);
    const postIntakeReport = path.join(outDir, 'post-complete-save-intake.json');
    runStage(ledger, ledgerPath, 'post-complete-save-intake', process.execPath, [
      'scripts/audit_combined_zones_complete_save.mjs',
      '--world-root', relativeToRoot(postRoot),
      '--out', relativeToRoot(postIntakeReport),
      '--markdown', relativeToRoot(path.join(outDir, 'post-complete-save-intake.md')),
      '--generated-at', new Date().toISOString(),
    ]);
    const postIntake = assertCompleteSaveIntake(postIntakeReport, postRoot);
    runStage(ledger, ledgerPath, 'post-snapshot-identity', process.execPath, [
      'scripts/hash_world_snapshot.mjs', relativeToRoot(postRegions),
    ]);
    const postIdentity = JSON.parse(ledger.stages.at(-1).stdoutTail);
    const postHashReport = path.join(outDir, 'post-snapshot-identity.json');
    fs.writeFileSync(postHashReport, `${JSON.stringify(postIdentity, null, 2)}\n`);
    ledger.postSnapshot = {
      root: relativeToRoot(postRoot),
      regions: relativeToRoot(postRegions),
      identity: reportBinding(postHashReport),
      completeSaveIntake: reportBinding(postIntakeReport),
      completeSaveSha256: postIntake.packageIdentity.completeSaveSha256,
    };
    writeLedger(ledgerPath, ledger);

    const postRollbackOverlays = [];
    const rollbackPoststatePreflights = [];
    for (const pkg of [...packages].reverse()) {
      const rollbackPoststateReport = path.join(outDir, `${pkg.key}.rollback-poststate-preflight.json`);
      runStage(ledger, ledgerPath, `rollback-poststate-preflight:${pkg.key}`, process.execPath,
        preflightArgs(
          pkg.rollback,
          postRegions,
          rollbackPoststateReport,
          postRollbackOverlays,
          pkg.policy,
        ));
      rollbackPoststatePreflights.push(reportBinding(rollbackPoststateReport));
      postRollbackOverlays.push(pkg.rollback);
    }

    ledger.status = 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE';
    ledger.rollbackPoststatePreflights = rollbackPoststatePreflights;
    ledger.evidenceBindings = bindEvidenceDirectory(outDir, ledgerPath);
    ledger.completedReleaseIdentitySha256 = sha256Bytes(JSON.stringify({
      sourceBoundReleaseIdentitySha256: ledger.sourceBoundReleaseIdentitySha256,
      postCompleteSaveSha256: postIntake.packageIdentity.completeSaveSha256,
      postRegionSha256: postIdentity.sha256,
      rollbackPoststatePreflights: rollbackPoststatePreflights.map(({ path: reportPath, sha256 }) => ({
        path: reportPath,
        sha256,
      })),
      evidenceBindingsSha256: sha256Bytes(JSON.stringify(ledger.evidenceBindings)),
    }));
    ledger.completedAtUtc = new Date().toISOString();
    writeLedger(ledgerPath, ledger);
    process.stdout.write(`${JSON.stringify({ status: ledger.status, ledger: relativeToRoot(ledgerPath) }, null, 2)}\n`);
  } catch (error) {
    if (ledger.status === 'RUNNING') ledger.status = 'BLOCKED_BY_SCOPE_LOCAL_SAFETY_KERNEL';
    if (ledger.status === 'COMMITTED_PENDING_POSTSTATE_VERIFICATION') {
      ledger.status = 'COMMITTED_POSTSTATE_VERIFICATION_FAILED_MANUAL_REVIEW';
    }
    ledger.error = error.message;
    ledger.completedAtUtc = new Date().toISOString();
    writeLedger(ledgerPath, ledger);
    throw error;
  }
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
