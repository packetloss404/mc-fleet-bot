#!/usr/bin/env node
/**
 * Independent deterministic live-intake auditor for the composed R12R release.
 *
 * This program never connects to RCON, the fleet API, systemd, or Minecraft.
 * It validates immutable files, executes only explicit dry-run/print-plan modes,
 * and consumes separately captured health evidence. Missing or stale operational
 * evidence is a truthful WAIT, while immutable contract drift is a REJECT.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TRANSACTION_ID = 'combined-zones-r12r-b09-bounded-active-shuttle';
const RELEASE_NODE = 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING';
const BASE = 'data/buildops/combined-zones-r12r-b09-bounded-active-shuttle';
const MANIFEST = `${BASE}.release-manifest.json`;
const ENTITY_SPEC = `${BASE}.tagged-minecart-transaction.json`;
const SOURCE_ROOT = 'data/worldsnap-r12q-post-20260822T044855Z';
const SOURCE_INTAKE =
  'data/world-review/combined-zones-r12q-live-20260822T044855Z/post-complete-save-intake.json';
const GENERATED_AT_DEFAULT = '2026-08-22T05:45:00Z';
const FRESHNESS_SECONDS = 300;
const FIXED_RECOVERY_RESERVE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_COMPLETE_SAVES = 4;

const EXPECTED = Object.freeze({
  manifestIdentity: 'e3ad3ccbbc8fea853a4be2e7d747be830d04950fc5d3e7e16211b6504e3b2b16',
  files: {
    [MANIFEST]: '772edee675d75236c0cc0e9488dfa947cb1f6c615c78e7a5e7d3e2a3e76d5b8f',
    [ENTITY_SPEC]: '54ae0dc18e116e46a8b9fbd922f2f64b6b2bd66745a4e7ecba4f0856008b49c0',
    [`${BASE}.b09-active-shuttle-fail-closed-controls.forward.txt`]:
      'b9a84179b30ed8fbaf9ae871253f1add376920d2554b36bad55b538b1b4f2642',
    [`${BASE}.b09-active-shuttle-fail-closed-controls.rollback.txt`]:
      '89702f5c0442a2cba93577b8d50adb2e6c06f419dc21aaf87f21a00ef914903e',
    [`${BASE}.b09-active-shuttle-fail-closed-track.forward.txt`]:
      '0cf6b87fd80ef0402f9376b0e92d500a7b4da44457dbd7d26259e1e323ed1456',
    [`${BASE}.b09-active-shuttle-fail-closed-track.rollback.txt`]:
      'c050989493f2cd4b54f3e98e4491a8f07863e83b4d50650b0794cf77e89de38e',
    'scripts/promote_combined_zones_r12r_b09_active_shuttle_release.mjs':
      'efe71130ab795ad2dba7d054e9dfa9a1840b72d229405093ebe6a1ebb7534c2d',
    'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs':
      '251b97e390df603828dfe9551bcf59a7e5074862a234bca5c9ef559a0c021936',
    'scripts/run_guarded_tagged_minecart_transaction.py':
      'af9e68a5bf78b29f2845cdd084e78a8e7003637a21b837f7bfaeda992b778b7c',
    'scripts/run_combined_zones_r12r_b09_active_shuttle_functional.py':
      '5b476fa5913b6a770a0d73f36a233b1299a80cc4d506806de97af44d143edce2',
    'scripts/run_combined_zones_r12r_chunk_lease.py':
      'c1989c1b65107ed4f6c7646043a94154f932ed83ce7c118c737996db13fa1cc9',
    'scripts/qa_combined_zones_r12r_b09_active_shuttle_post_release.mjs':
      '251dc4a939d4b0e927678ed1d6466ce7aea4c7bdfdc393eb4a06a0eca251d55e',
    'scripts/qa_combined_zones_r12r_b09_active_shuttle_release_offline.mjs':
      'e990924afde844953c4529b05325d47317b915e17a526c67589ca90f0e143cf7',
    'scripts/probe_combined_zones_r12r_active_shuttle_functional_runtime.py':
      '1972784bb9516a713e95e7983767fa6e6e7e2dfdbecc21aaa84103cc007fee53',
    'scripts/run_combined_zones_scoped_release.mjs':
      'b28bd685f685c664c2d552ece449fa526f935a33523f8302bfe992d5d6cefd85',
    'scripts/rcon_runner.py':
      'f3c29f052cfe9f9a59e41a86c5ae6f7655c33e09962d5a47d6d5b62c1735a0da',
    'scripts/preflight_guarded_ops.mjs':
      '6d18e028553623bc855485af80dce3289e6b78672476d41f0b4bb4d21f7c802d',
    'scripts/qa_guarded_release_manifest.mjs':
      'ca44df998b1f2ee76296b2de2bac075cc5d65efcdc9036169e638e339b330317',
    'scripts/redevelopment_live_entity_gate.py':
      '8c3557ba8e84789cad47d198d4ed0ec21139c17eb03bfed6d2f3570189f25e8c',
    'scripts/capture_combined_zones_complete_save.py':
      'c2fe5e4a5afff7424309960a27b01affc74e0a96e2ad0c5e3985c52daccac09f',
    'scripts/audit_combined_zones_complete_save.mjs':
      '25050841e555a2895acb32397bfba21f5783bcfcd4c1a5a65978b7443eaa4590',
    'scripts/hash_world_snapshot.mjs':
      'b3335e78c1c38de9e079566d79440a9df5a98758db2b59fee20bdfc2f56cdfd2',
    'scripts/mc_admin.py':
      '5d4bb01b6be056c261c66d51345e99e99b6e1e15534f33630ae69cac920fdafc',
    'scripts/lib/combined_zones_release_lib.mjs':
      '2ceb604008d8c1a15501a0f7485295d4dc680962897f6834bec5902c8f8f16c8',
    'scripts/verify_combined_zones_r13_terminal_post_acceptance.mjs':
      '119268b2e0b44c3a1df8f7e4ba99ebb7793289b654986602742a7d400300791a',
    'docs/masterplans/05-combined-zones/phase1-release-contract.json':
      '0e13f4ca6a66eb5e61cb51f8845acfb0b0e7194480adeb813c2e474d2e8faa47',
    'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json':
      'd3b5f17862074080ae9db81e2932c56f6e96c926979748f8a3bcc09c22b3ad1a',
    'docs/masterplans/05-combined-zones/MASTERPLAN.md':
      'f324d89f53bb0a3e0e6bf5588d96e42df5e001b8cfb06aa6dd2998ce5c78e3c5',
    'docs/masterplans/05-combined-zones/CURRENT-STATE.md':
      '1e7d79bc481f29435c7f96a01c24780f9b024803d88f74a1c016d5d949759c8e',
    'docs/masterplans/05-combined-zones/OWNER-DIRECTIVE.md':
      '2115c07d60e148eedd260a7b3743cd49aa73396becd412c4a8de57ca9ff4e883',
    'data/world-review/combined-zones-release-contract-current.json':
      '009fca5f4fed3d8aa9367fd14f247f801e7f0fe2f81ff21ab231758f62c1c4f1',
  },
});

const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const absolute = (filename) => path.resolve(ROOT, filename);
const relative = (filename) => path.relative(ROOT, absolute(filename)).split(path.sep).join('/');
const readJson = (filename) => JSON.parse(fs.readFileSync(absolute(filename), 'utf8'));
const binding = (filename) => {
  const bytes = fs.readFileSync(absolute(filename));
  return { path: relative(filename), sha256: sha256(bytes), bytes: bytes.length };
};
const stableObject = (value) => {
  if (Array.isArray(value)) return value.map(stableObject);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stableObject(value[key])]),
  );
  return value;
};
const payloadHash = (value, field = 'readinessPayloadSha256') => {
  const payload = { ...value };
  delete payload[field];
  return sha256(JSON.stringify(stableObject(payload)));
};

function collectDeclaredBindings(value, output = new Map()) {
  if (!value || typeof value !== 'object') return output;
  if (typeof value.path === 'string' && /^[a-f0-9]{64}$/u.test(value.sha256 ?? '')) {
    output.set(`${relative(value.path)}\0${value.sha256}`, {
      path: relative(value.path), expectedSha256: value.sha256,
    });
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    collectDeclaredBindings(child, output);
  }
  return output;
}

function operationBodySha256(filename) {
  const body = `${fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/u)
    .filter((line) => line && !line.startsWith('#')).join('\n')}\n`;
  return sha256(body);
}

function parseArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!flag.startsWith('--') || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new Error(`invalid argument ${flag}`);
    }
    values.set(flag, argv[index + 1]);
    index += 1;
  }
  return values;
}

function operationRows(filename) {
  return fs.readFileSync(absolute(filename), 'utf8').split(/\r?\n/u)
    .filter((line) => line.startsWith('REPL ')).map((line) => {
      const parts = line.trim().split(/\s+/u);
      if (parts.length !== 9) throw new Error(`invalid guarded operation: ${line}`);
      const point = parts.slice(1, 4).map(Number);
      const duplicate = parts.slice(4, 7).map(Number);
      if (point.some((value, index) => value !== duplicate[index])) {
        throw new Error(`non-one-cell guarded operation: ${line}`);
      }
      return { point, from: parts[7], to: parts[8] };
    });
}

function exactInverse(forward, rollback) {
  return forward.length === rollback.length && forward.every((entry, index) => {
    const inverse = rollback[rollback.length - 1 - index];
    return JSON.stringify(entry.point) === JSON.stringify(inverse.point)
      && entry.from === inverse.to && entry.to === inverse.from;
  });
}

function directoryBytes(root) {
  let total = 0;
  for (const entry of fs.readdirSync(absolute(root), { withFileTypes: true })) {
    const child = path.join(root, entry.name);
    if (entry.isDirectory()) total += directoryBytes(child);
    else if (entry.isFile()) total += fs.statSync(absolute(child)).size;
  }
  return total;
}

function fresh(evidence, generatedAt) {
  const captured = Date.parse(evidence?.capturedAtUtc ?? evidence?.generatedAtUtc ?? '');
  const generated = Date.parse(generatedAt);
  return Number.isFinite(captured) && Number.isFinite(generated)
    && captured <= generated && generated - captured <= FRESHNESS_SECONDS * 1000;
}

function runJson(command, args) {
  return JSON.parse(execFileSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 120000,
    maxBuffer: 32 * 1024 * 1024,
  }));
}

function commandProbes(generatedAt) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12r-live-readiness-'));
  try {
    const missing = path.join(temporary, 'absent.json');
    const postQaOutput = path.join(temporary, 'post-qa-wait.json');
    const r13Output = path.join(temporary, 'r13-wait.json');
    const r13Markdown = path.join(temporary, 'r13-wait.md');
    const wrapper = runJson(process.execPath, [
      'scripts/run_combined_zones_scoped_release.mjs', '--manifest', MANIFEST,
      '--release-node', RELEASE_NODE, '--print-plan',
    ]);
    const coordinator = runJson(process.execPath, [
      'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs', '--print-plan',
    ]);
    const entity = runJson('python3', [
      'scripts/run_guarded_tagged_minecart_transaction.py',
      '--transaction-id', TRANSACTION_ID,
      '--min-x', '2058', '--min-y', '130', '--min-z', '-748',
      '--max-x', '2073', '--max-y', '131', '--max-z', '-747',
      '--spawn-x', '2058.5', '--spawn-y', '130.0625', '--spawn-z', '-747.5',
      '--generated-at', generatedAt,
    ]);
    const functional = runJson('python3', [
      'scripts/run_combined_zones_r12r_b09_active_shuttle_functional.py',
      '--generated-at', generatedAt,
    ]);
    const leaseAcquire = runJson('python3', [
      'scripts/run_combined_zones_r12r_chunk_lease.py', '--mode', 'acquire',
      '--generated-at', generatedAt,
    ]);
    const leasePayload = {
      schemaVersion: 1,
      transactionId: TRANSACTION_ID,
      generatedAtUtc: generatedAt,
      mode: 'EXECUTE_ACQUIRE',
      status: 'LEASE_ACQUIRED_EXACT_SET_VERIFIED',
      preExistingChunks: [],
      requiredChunks: [{ x: 128, z: -47 }, { x: 129, z: -47 }],
      ownedAdditions: [{ x: 128, z: -47 }, { x: 129, z: -47 }],
      acquiredChunks: [{ x: 128, z: -47 }, { x: 129, z: -47 }],
      commands: [],
      safetyBoundary: { removeAllUsed: false },
    };
    leasePayload.leasePayloadSha256 = sha256(JSON.stringify(stableObject(leasePayload)));
    const leasePath = path.join(temporary, 'synthetic-hash-bound-lease.json');
    fs.writeFileSync(leasePath, `${JSON.stringify(leasePayload)}\n`);
    const leaseRelease = runJson('python3', [
      'scripts/run_combined_zones_r12r_chunk_lease.py', '--mode', 'release',
      '--lease', leasePath, '--generated-at', generatedAt,
    ]);
    const postQa = runJson(process.execPath, [
      'scripts/qa_combined_zones_r12r_b09_active_shuttle_post_release.mjs',
      '--ledger', missing, '--entity-report', missing, '--functional-report', missing,
      '--post-snapshot', missing, '--out', postQaOutput, '--generated-at', generatedAt,
    ]);
    const r13 = runJson(process.execPath, [
      'scripts/verify_combined_zones_r13_terminal_post_acceptance.mjs',
      '--final-ledger', missing, '--final-post-qa', missing,
      '--out', r13Output, '--markdown', r13Markdown, '--generated-at', generatedAt,
    ]);
    const probes = {
      wrapper: {
        mode: wrapper.mode,
        manifest: wrapper.manifest,
        packageOrder: wrapper.packageOrder,
        releaseNode: wrapper.releaseNode,
      },
      coordinator,
      entity,
      functional,
      leaseAcquire,
      leaseRelease,
      postQa: { status: postQa.status, missingInputs: postQa.missingInputs },
      r13: {
        status: r13.status,
        accepted: r13.accepted ?? false,
        releaseNodeId: r13.releaseNodeId,
        failureCount: r13.failures?.length ?? r13.reasons?.length ?? null,
      },
    };
    const failures = [];
    if (wrapper.mode !== 'PREPARE_ONLY' || wrapper.packageOrder?.length !== 2) {
      failures.push('scoped wrapper print-plan is not exact prepare-only');
    }
    if (coordinator.mode !== 'PREPARE_ONLY_NO_RCON_CONNECTION'
      || coordinator.exactBlockTargetCount !== 19
      || coordinator.compensationSequence?.[1]
        !== 'exact-uuid-type-tag-entity-rollback-first-if-forward-committed') {
      failures.push('coordinator print-plan or entity-first recovery order drifted');
    }
    if (entity.status !== 'PLAN_VALIDATED_NO_RCON_CONNECTION'
      || entity.safetyBoundary?.rconConnected !== false) {
      failures.push('entity executor dry-run connected or drifted');
    }
    if (functional.status !== 'PLAN_VALIDATED_NO_RCON_CONNECTION'
      || functional.blockContract?.poweredRailCells?.length !== 15) {
      failures.push('functional verifier dry-run drifted');
    }
    if (leaseAcquire.status !== 'PLAN_VALIDATED_NO_RCON_CONNECTION'
      || leaseAcquire.requiredChunks?.length !== 2
      || leaseAcquire.safetyBoundary?.removeAllAllowed !== false) {
      failures.push('chunk-lease dry-run drifted');
    }
    if (leaseRelease.status !== 'PLAN_VALIDATED_NO_RCON_CONNECTION'
      || leaseRelease.mode !== 'DRY_RUN_RELEASE'
      || leaseRelease.leaseSourcePayloadSha256 !== leasePayload.leasePayloadSha256
      || leaseRelease.safetyBoundary?.removeAllAllowed !== false) {
      failures.push('chunk-lease release dry-run or hash binding drifted');
    }
    if (postQa.status !== 'WAIT_R12R_POST_RELEASE_INPUTS_ABSENT') {
      failures.push('post-release QA does not truthfully WAIT without live inputs');
    }
    if (!String(r13.status).startsWith('WAIT')) {
      failures.push('R13 verifier does not truthfully WAIT without R12R terminal inputs');
    }
    return {
      status: failures.length ? 'FAIL' : 'PASS',
      failures,
      semanticPayloadSha256: payloadHash(probes, '__none__'),
      probes,
    };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

function validateOutputPaths(pathsToValidate, waits, rejects) {
  const entries = Object.entries(pathsToValidate);
  for (const [label, filename] of entries) {
    if (!filename) {
      waits.push(`missing exact coordinator path: ${label}`);
      continue;
    }
    const resolved = absolute(filename);
    const dataRoot = `${absolute('data')}${path.sep}`;
    if (!resolved.startsWith(dataRoot) || resolved === absolute('data')) {
      rejects.push(`unsafe coordinator path outside data/: ${label}`);
    }
    if (fs.existsSync(resolved)) rejects.push(`coordinator destination already exists: ${label}`);
  }
  const supplied = entries.filter(([, filename]) => filename).map(([label, filename]) => ({
    label, resolved: absolute(filename),
  }));
  for (let left = 0; left < supplied.length; left += 1) {
    for (let right = left + 1; right < supplied.length; right += 1) {
      const a = supplied[left];
      const b = supplied[right];
      if (a.resolved === b.resolved || a.resolved.startsWith(`${b.resolved}${path.sep}`)
        || b.resolved.startsWith(`${a.resolved}${path.sep}`)) {
        rejects.push(`coordinator destinations overlap: ${a.label}/${b.label}`);
      }
    }
  }
}

function validateHealthEvidence(kind, filename, generatedAt, waits, evidenceBindings) {
  if (!filename) {
    waits.push(`missing fresh ${kind} evidence`);
    return null;
  }
  if (!fs.existsSync(absolute(filename))) {
    waits.push(`missing fresh ${kind} evidence file`);
    return null;
  }
  evidenceBindings[kind] = binding(filename);
  const evidence = readJson(filename);
  if (!fresh(evidence, generatedAt)) waits.push(`${kind} evidence is stale or future-dated`);
  if (evidence.status !== 'PASS') waits.push(`${kind} evidence status is not PASS`);
  return evidence;
}

export function auditR12RLiveReadiness(options = {}) {
  const generatedAt = options.generatedAt ?? GENERATED_AT_DEFAULT;
  const waits = [];
  const rejects = [];
  const fileBindings = {};
  for (const [filename, expectedSha256] of Object.entries(EXPECTED.files)) {
    if (!fs.existsSync(absolute(filename))) {
      rejects.push(`frozen file absent: ${filename}`);
      continue;
    }
    const actual = binding(filename);
    fileBindings[filename] = actual;
    if (actual.sha256 !== expectedSha256) rejects.push(`frozen file drifted: ${filename}`);
  }
  fileBindings[relative(fileURLToPath(import.meta.url))] = binding(fileURLToPath(import.meta.url));

  let manifest;
  let entitySpec;
  try {
    manifest = readJson(MANIFEST);
    entitySpec = readJson(ENTITY_SPEC);
    const coordinatorSource = fs.readFileSync(
      absolute('scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs'), 'utf8',
    );
    for (const literal of [
      "status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE'",
      "transactionKind: 'COMPOSED_BLOCK_ENTITY_FUNCTIONAL_ATOMIC_RELEASE'",
      "'entity-exact-uuid-rollback'",
      "'track-block-rollback'",
      "'controls-block-rollback'",
      'exactEntitySelectorCommand',
      'completedReleaseIdentitySha256',
      'evidenceBindings',
    ]) {
      if (!coordinatorSource.includes(literal)) {
        rejects.push(`coordinator standard ledger/recovery literal absent: ${literal}`);
      }
    }
    const identityPayload = { ...manifest };
    delete identityPayload.manifestIdentity;
    if (manifest.manifestIdentity !== EXPECTED.manifestIdentity
      || sha256(JSON.stringify(identityPayload)) !== EXPECTED.manifestIdentity) {
      rejects.push('manifest payload identity drifted');
    }
    if (manifest.transactionId !== TRANSACTION_ID || manifest.releaseNodeId !== RELEASE_NODE
      || manifest.scope?.exactBlockTargetCount !== 19 || manifest.packages?.length !== 2) {
      rejects.push('manifest transaction, release node, or exact scope drifted');
    }
    if (manifest.entityTransaction?.spec?.sha256 !== fileBindings[ENTITY_SPEC]?.sha256
      || manifest.entityTransaction?.executor?.sha256
        !== fileBindings['scripts/run_guarded_tagged_minecart_transaction.py']?.sha256) {
      rejects.push('manifest entity spec/executor binding drifted');
    }
    if (entitySpec.transactionId !== TRANSACTION_ID
      || entitySpec.entityType !== 'minecraft:minecart'
      || entitySpec.tag !== 'cz_r12_7464210e11d51e28eb4e133e2d40fd0b'
      || entitySpec.name !== 'CZ R12 minecart 7464210e11d51e28') {
      rejects.push('entity transaction identity drifted');
    }
    const packageOps = manifest.packages.map((pkg) => ({
      key: pkg.key,
      forward: operationRows(pkg.forward),
      rollback: operationRows(pkg.rollback),
    }));
    if (packageOps.reduce((sum, pkg) => sum + pkg.forward.length, 0) !== 19
      || packageOps.some((pkg) => !exactInverse(pkg.forward, pkg.rollback))) {
      rejects.push('operations are not exact 19-cell reverse-order inverses');
    }
    const targetKeys = packageOps.flatMap((pkg) => pkg.forward)
      .map((entry) => entry.point.join(','));
    if (new Set(targetKeys).size !== 19) rejects.push('operation target set is not 19 unique cells');
    for (const pkg of manifest.packages) {
      const declared = manifest.operations?.[pkg.key];
      if (!declared || declared.forwardSha256 !== operationBodySha256(pkg.forward)
        || declared.rollbackSha256 !== operationBodySha256(pkg.rollback)
        || declared.forwardCommandCount !== packageOps.find((item) => item.key === pkg.key)?.forward.length
        || declared.rollbackCommandCount !== packageOps.find((item) => item.key === pkg.key)?.rollback.length
        || declared.exactInverse !== true || declared.reverseOrderInverse !== true
        || declared.oneCellGuards !== true) {
        rejects.push(`manifest operation body/count/inverse binding drifted: ${pkg.key}`);
      }
    }
    for (const declared of collectDeclaredBindings(manifest).values()) {
      if (!fs.existsSync(absolute(declared.path))) {
        rejects.push(`manifest-declared binding absent: ${declared.path}`);
        continue;
      }
      const actual = binding(declared.path);
      fileBindings[declared.path] = actual;
      if (actual.sha256 !== declared.expectedSha256) {
        rejects.push(`manifest-declared binding drifted: ${declared.path}`);
      }
    }
    const finalFunctionalProofPath =
      'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/final-functional-helper-paper-proof.json';
    const finalFunctionalProof = readJson(finalFunctionalProofPath);
    fileBindings[finalFunctionalProofPath] = binding(finalFunctionalProofPath);
    if (fileBindings[finalFunctionalProofPath].sha256
      !== 'fd25b23afb0c5733d8f38433bf1f79eef1ab7626bb82d48a02be2f2c7aa82726'
      || finalFunctionalProof.status
        !== 'PASS_FINAL_FUNCTIONAL_HELPER_EXACT_PAPER_RUNTIME_AND_CLEANUP'
      || finalFunctionalProof.proofPayloadSha256
        !== 'a9203f87de1d433f5cb9d03f2b5ff7b2df0254a08b799fbcdfdd3c889933f691') {
      rejects.push('final exact-selector functional Paper proof drifted');
    }
    const offlineReadinessPath =
      'data/world-review/combined-zones-r12-b09-active-transport-readiness-20260822T050000Z/r12r-offline/offline-readiness.json';
    const offlineReadiness = readJson(offlineReadinessPath);
    fileBindings[offlineReadinessPath] = binding(offlineReadinessPath);
    if (offlineReadiness.status !== 'PASS_READY_FOR_EXPLICIT_COMPOSED_EXECUTION'
      || offlineReadiness.manifestIdentity !== EXPECTED.manifestIdentity
      || Object.entries(offlineReadiness.kernels ?? {}).some(([, kernel]) => (
        !kernel?.path || fileBindings[kernel.path]?.sha256 !== kernel.sha256
      ))) {
      rejects.push('offline safety-kernel readiness or executable bindings drifted');
    }
  } catch (error) {
    rejects.push(`manifest/operation audit failed: ${error.message}`);
  }

  try {
    const contract = readJson('docs/masterplans/05-combined-zones/phase1-release-contract.json');
    const authorization = readJson(
      'docs/masterplans/05-combined-zones/phase1-standing-build-authorization.json',
    );
    const current = readJson('data/world-review/combined-zones-release-contract-current.json');
    for (const check of current.bindingChecks ?? []) {
      if (fs.existsSync(absolute(check.path))) fileBindings[check.path] = binding(check.path);
    }
    if (contract.status !== 'ACTIVE_SCOPE_LOCAL_BUILD_AUTHORIZED'
      || contract.worldEditAuthorized !== true
      || contract.scopeLocalReleasePolicy?.standingOwnerApprovalRequiresRepeatConversation !== false) {
      rejects.push('current release contract does not carry standing scope-local authority');
    }
    if (authorization.status !== 'AUTHORIZED_STANDING_SCOPED_EXECUTION'
      || authorization.revoked !== false
      || !authorization.authorizedReleaseNodes?.includes(RELEASE_NODE)) {
      rejects.push('standing authorization is revoked or excludes the R12 node');
    }
    if (current.contractValid !== true || current.ready !== true || current.errors?.length !== 0
      || current.contractSha256
        !== fileBindings['docs/masterplans/05-combined-zones/phase1-release-contract.json']?.sha256
      || current.bindingChecks?.some((check) => !check.passed
        || check.expectedSha256 !== check.actualSha256
        || fileBindings[check.path]?.sha256 !== check.actualSha256)) {
      rejects.push('current contract validation or authority bindings are not exact PASS');
    }
  } catch (error) {
    rejects.push(`authority/contract audit failed: ${error.message}`);
  }

  const sourceRoot = options.sourceRoot ?? SOURCE_ROOT;
  const sourceIntake = options.sourceIntake ?? SOURCE_INTAKE;
  let sourceSnapshotBytes = null;
  try {
    const intake = readJson(sourceIntake);
    fileBindings[sourceIntake] = binding(sourceIntake);
    sourceSnapshotBytes = directoryBytes(sourceRoot);
    if (intake.status !== 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE'
      || intake.input?.suppliedWorldRoot !== relative(sourceRoot)
      || intake.packageIdentity?.completeSaveSha256
        !== manifest.source.candidateDerivationSnapshot.completeSaveSha256) {
      rejects.push('source complete-save intake does not bind the manifest predecessor');
    }
    if (manifest.source.candidateDerivationSnapshot.root !== relative(sourceRoot)) {
      rejects.push('source root differs from manifest candidate derivation snapshot');
    }
  } catch (error) {
    rejects.push(`source snapshot/intake audit failed: ${error.message}`);
  }

  let probes;
  try {
    probes = commandProbes(generatedAt);
    if (probes.status !== 'PASS') rejects.push(...probes.failures);
  } catch (error) {
    rejects.push(`dry-run/print-plan probe failed: ${error.message}`);
  }

  const outputPaths = {
    releaseOutDir: options.releaseOutDir,
    terminalLoadedSnapshotRoot: options.terminalLoadedSnapshotRoot,
    postSnapshotRoot: options.postSnapshotRoot,
    recoveryLoadedSnapshotRoot: options.recoveryLoadedSnapshotRoot,
    recoverySnapshotRoot: options.recoverySnapshotRoot,
  };
  validateOutputPaths(outputPaths, waits, rejects);

  const evidenceBindings = {};
  const disk = validateHealthEvidence(
    'disk', options.diskEvidence, generatedAt, waits, evidenceBindings,
  );
  const service = validateHealthEvidence(
    'service', options.serviceEvidence, generatedAt, waits, evidenceBindings,
  );
  const api = validateHealthEvidence(
    'api', options.apiEvidence, generatedAt, waits, evidenceBindings,
  );
  const liveEntity = validateHealthEvidence(
    'liveEntity', options.liveEntityEvidence, generatedAt, waits, evidenceBindings,
  );
  const minimumDiskBytes = sourceSnapshotBytes === null
    ? null : MAX_COMPLETE_SAVES * sourceSnapshotBytes + FIXED_RECOVERY_RESERVE_BYTES;
  if (disk && minimumDiskBytes !== null) {
    if (disk.path !== relative(ROOT) && absolute(disk.path ?? '') !== ROOT) {
      waits.push('disk evidence does not cover repository filesystem');
    }
    if (disk.sourceSnapshotBytes !== sourceSnapshotBytes
      || disk.minimumRequiredBytes !== minimumDiskBytes
      || !Number.isSafeInteger(disk.availableBytes)
      || disk.availableBytes < minimumDiskBytes) {
      waits.push('disk evidence does not meet exact four-save plus 2-GiB recovery minimum');
    }
  }
  if (service && (service.serviceName !== 'mc-fleet-bot.service'
    || service.activeState !== 'active' || service.subState !== 'running'
    || !Number.isInteger(service.mainPid) || service.mainPid <= 0
    || service.processCount !== 1)) {
    waits.push('service evidence is not one active/running fleet process');
  }
  if (api && (api.statusEndpoint !== 'http://127.0.0.1:3001/api/status'
    || api.statusHttpStatus !== 200 || api.statusBody?.status !== 'ok'
    || api.botsEndpoint !== 'http://127.0.0.1:3001/api/bots'
    || api.botsHttpStatus !== 200 || api.uniqueBotNames !== true
    || !Number.isInteger(api.connectedBotCount) || api.connectedBotCount < 1
    || api.statusBody?.botCount !== api.connectedBotCount)) {
    waits.push('fleet API evidence is unhealthy or does not bind both read-only endpoints');
  }
  if (liveEntity && (liveEntity.passed !== true
    || liveEntity.blockingEntityHits !== 0
    || liveEntity.entitiesReturnedInEnvelope !== 0
    || liveEntity.operationsSha256 !== sha256(Buffer.concat([
      fs.readFileSync(absolute(`${BASE}.b09-active-shuttle-fail-closed-controls.forward.txt`)),
      fs.readFileSync(absolute(`${BASE}.b09-active-shuttle-fail-closed-track.forward.txt`)),
    ])))) {
    waits.push('fresh live-entity evidence is not exact zero for the two forward packages');
  }

  const exactCoordinatorCli = [
    'node', 'scripts/run_combined_zones_r12r_b09_active_shuttle_release.mjs',
    '--execute', '--confirm-production', TRANSACTION_ID,
    '--out-dir', outputPaths.releaseOutDir ?? '<missing>',
    '--source-snapshot-root', relative(sourceRoot),
    '--terminal-loaded-snapshot-root', outputPaths.terminalLoadedSnapshotRoot ?? '<missing>',
    '--post-snapshot-root', outputPaths.postSnapshotRoot ?? '<missing>',
    '--recovery-loaded-snapshot-root', outputPaths.recoveryLoadedSnapshotRoot ?? '<missing>',
    '--recovery-snapshot-root', outputPaths.recoverySnapshotRoot ?? '<missing>',
  ];
  const ledgerContract = {
    schemaVersion: 1,
    transactionId: TRANSACTION_ID,
    releaseNodeId: RELEASE_NODE,
    transactionKind: 'COMPOSED_BLOCK_ENTITY_FUNCTIONAL_ATOMIC_RELEASE',
    successStatus: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    requiredTopLevelFields: [
      'manifest', 'plan', 'stages', 'blockTransaction', 'packages', 'sourceSnapshot',
      'chunkLease', 'entityTransaction', 'functionalAcceptance', 'postSnapshot',
      'rollbackPoststatePreflights', 'rollbackReadiness', 'evidenceBindings',
      'completedReleaseIdentitySha256',
    ],
    rollbackOrder: [
      'exact captured UUID/type/tag/AABB entity',
      'b09-active-shuttle-fail-closed-track',
      'b09-active-shuttle-fail-closed-controls',
    ],
    r13RequiredQaFields: [
      'ledger', 'releaseNodeId', 'postSnapshot.completeSaveSha256',
      'postSnapshot.regionSha256', 'completedReleaseIdentitySha256',
      'activeShuttleCommissioned',
    ],
  };
  const status = rejects.length > 0
    ? 'REJECTED_R12R_LIVE_RELEASE_STATIC_CONTRACT_DRIFT'
    : waits.length > 0
      ? 'WAIT_R12R_LIVE_RELEASE_EVIDENCE_INCOMPLETE'
      : 'PASS_R12R_LIVE_RELEASE_READY';
  const payload = {
    schemaVersion: 1,
    id: 'CZ-R12R-LIVE-RELEASE-READINESS',
    transactionId: TRANSACTION_ID,
    releaseNodeId: RELEASE_NODE,
    generatedAtUtc: generatedAt,
    status,
    passed: status.startsWith('PASS_'),
    waits: [...new Set(waits)].sort(),
    rejects: [...new Set(rejects)].sort(),
    immutableBindings: fileBindings,
    operationalEvidenceBindings: evidenceBindings,
    source: {
      root: relative(sourceRoot), intake: fileBindings[sourceIntake] ?? null,
      sourceSnapshotBytes,
    },
    diskPolicy: {
      maximumNewCompleteSaves: MAX_COMPLETE_SAVES,
      fixedRecoveryReserveBytes: FIXED_RECOVERY_RESERVE_BYTES,
      minimumRequiredBytes: minimumDiskBytes,
      rationale: 'terminal-loaded + final-post + recovery-loaded + final-recovery saves, plus 2 GiB',
    },
    exactCoordinatorCli,
    recoveryPaths: {
      terminalLoaded: outputPaths.terminalLoadedSnapshotRoot ?? null,
      finalPost: outputPaths.postSnapshotRoot ?? null,
      recoveryLoaded: outputPaths.recoveryLoadedSnapshotRoot ?? null,
      finalRecovery: outputPaths.recoverySnapshotRoot ?? null,
      entityRollbackBeforeBlocks: true,
      blockRollbackOrder: ledgerContract.rollbackOrder.slice(1),
      chunkLeaseHeldOrReacquiredUntilRecovery: true,
    },
    commandProbes: probes ?? null,
    standardLedgerContract: ledgerContract,
    safetyBoundary: {
      rconConnected: false,
      apiContacted: false,
      systemdContacted: false,
      worldMutationPerformed: false,
      serviceMutationPerformed: false,
      missingOperationalEvidenceMayPass: false,
    },
  };
  return { ...payload, readinessPayloadSha256: payloadHash(payload) };
}

export function main(argv = process.argv.slice(2)) {
  const values = parseArgs(argv);
  const get = (flag, fallback) => values.get(flag) ?? fallback;
  const report = auditR12RLiveReadiness({
    generatedAt: get('--generated-at', GENERATED_AT_DEFAULT),
    sourceRoot: get('--source-snapshot-root', SOURCE_ROOT),
    sourceIntake: get('--source-intake', SOURCE_INTAKE),
    releaseOutDir: get('--release-out-dir'),
    terminalLoadedSnapshotRoot: get('--terminal-loaded-snapshot-root'),
    postSnapshotRoot: get('--post-snapshot-root'),
    recoveryLoadedSnapshotRoot: get('--recovery-loaded-snapshot-root'),
    recoverySnapshotRoot: get('--recovery-snapshot-root'),
    diskEvidence: get('--disk-evidence'),
    serviceEvidence: get('--service-evidence'),
    apiEvidence: get('--api-evidence'),
    liveEntityEvidence: get('--live-entity-evidence'),
  });
  const output = get(
    '--out',
    'data/world-review/combined-zones-r12r-live-release-readiness-current/readiness.json',
  );
  fs.mkdirSync(path.dirname(absolute(output)), { recursive: true });
  fs.writeFileSync(absolute(output), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    passed: report.passed,
    waitCount: report.waits.length,
    rejectCount: report.rejects.length,
    readinessPayloadSha256: report.readinessPayloadSha256,
    output: relative(output),
  }, null, 2)}\n`);
  if (report.status.startsWith('REJECTED_')) process.exitCode = 1;
  return report;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      status: 'REJECTED_R12R_LIVE_RELEASE_READINESS_RUNTIME_ERROR',
      error: error.message,
    }, null, 2)}\n`);
    process.exitCode = 2;
  }
}
