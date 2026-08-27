import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(
  ROOT, 'scripts/commission_combined_zones_r12_b09_bounded_transport.mjs',
);
const R13 = path.join(ROOT, 'scripts/verify_combined_zones_r13_terminal_post_acceptance.mjs');
const R12Q_LEDGER = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const R12Q_QA = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cz-r12-transport-commissioning-'));
const hash = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const rel = (filename: string) => path.relative(ROOT, filename).split(path.sep).join('/');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const bind = (filename: string) => ({ path: rel(filename), sha256: hash(filename) });
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

function fixture(name: string) {
  const root = path.join(temp, name);
  const sourceRegions = path.join(root, 'source', 'region');
  const postRoot = path.join(root, 'post');
  fs.mkdirSync(sourceRegions, { recursive: true });
  fs.mkdirSync(path.join(postRoot, 'region'), { recursive: true });
  const sourceIdentity = path.join(root, 'source-identity.json');
  const postIdentity = path.join(root, 'post-identity.json');
  const postIntake = path.join(root, 'post-intake.json');
  const controls = path.join(root, 'controls.forward.txt');
  const track = path.join(root, 'track.forward.txt');
  const controlsPreflight = path.join(root, 'controls-preflight.json');
  const trackPreflight = path.join(root, 'track-preflight.json');
  const trackRollback = path.join(root, 'track-rollback.json');
  const controlsRollback = path.join(root, 'controls-rollback.json');
  const chunkRelease = path.join(root, 'chunk-release.json');
  const entity = path.join(root, 'entity.json');
  const functional = path.join(root, 'functional.json');
  const manifest = path.join(root, 'manifest.json');
  const ledger = path.join(root, 'evidence-ledger.json');
  const qa = path.join(root, 'r12r-post-release-qa.json');
  const closure = path.join(root, 'r12-b09-commissioning.json');
  const sourceComplete = 'e'.repeat(64);
  const sourceRegion = 'f'.repeat(64);
  const postComplete = 'a'.repeat(64);
  const postRegion = 'b'.repeat(64);
  const completed = 'c'.repeat(64);
  writeJson(sourceIdentity, { sha256: sourceRegion });
  writeJson(postIdentity, { sha256: postRegion });
  writeJson(postIntake, {
    status: 'PASS_COMPLETE_IMMUTABLE_SAME_MOMENT_SAVE',
    packageIdentity: { completeSaveSha256: postComplete },
  });
  fs.writeFileSync(controls, 'REPL 1 2 3 1 2 3 minecraft:air minecraft:stone\n');
  fs.writeFileSync(track, 'REPL 2 2 3 2 2 3 minecraft:air minecraft:stone\n');
  writeJson(controlsPreflight, {
    status: 'PASS', failurePointsComplete: true, operationCount: 2, passed: 2, failed: 0,
    opsPath: rel(controls), opsSha256: hash(controls), regions: rel(sourceRegions),
  });
  writeJson(trackPreflight, {
    status: 'PASS', failurePointsComplete: true, operationCount: 17, passed: 17, failed: 0,
    opsPath: rel(track), opsSha256: hash(track), regions: rel(sourceRegions),
  });
  writeJson(trackRollback, { status: 'PASS', passed: 17, failed: 0 });
  writeJson(controlsRollback, { status: 'PASS', passed: 2, failed: 0 });
  writeJson(chunkRelease, {
    status: 'LEASE_RELEASED_PREEXISTING_SET_EXACTLY_RESTORED',
    preExistingChunks: [{ x: 1, z: 2 }], finalChunks: [{ x: 1, z: 2 }], cleanupErrors: [],
  });
  writeJson(entity, { status: 'EXECUTED_POSTCONDITION_VERIFIED' });
  writeJson(functional, { status: 'PASS_WEST_EAST_WEST_FAIL_CLOSED_PARK_VERIFIED' });
  const predecessor = JSON.parse(fs.readFileSync(R12Q_LEDGER, 'utf8'));
  const predecessorRegion = JSON.parse(fs.readFileSync(
    path.resolve(ROOT, predecessor.postSnapshot.identity.path), 'utf8',
  )).sha256;
  writeJson(manifest, {
    transactionId: 'combined-zones-r12r-b09-bounded-active-shuttle',
    source: {
      predecessor: {
        transactionId: predecessor.transactionId,
        executionLedger: bind(R12Q_LEDGER),
        postQa: bind(R12Q_QA),
        completedReleaseIdentitySha256: predecessor.completedReleaseIdentitySha256,
        postCompleteSaveSha256: predecessor.postSnapshot.completeSaveSha256,
        postRegionSha256: predecessorRegion,
      },
    },
  });
  const ledgerRecord = {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    transactionId: 'combined-zones-r12r-b09-bounded-active-shuttle',
    completedAtUtc: '2026-08-22T05:50:00.000Z',
    completedReleaseIdentitySha256: completed,
    manifest: bind(manifest),
    sourceSnapshot: {
      root: rel(path.dirname(sourceRegions)), regions: rel(sourceRegions),
      completeSaveSha256: sourceComplete, identity: bind(sourceIdentity),
    },
    postSnapshot: {
      root: rel(postRoot), regions: rel(path.join(postRoot, 'region')),
      completeSaveSha256: postComplete, identity: bind(postIdentity),
      completeSaveIntake: bind(postIntake), regionSha256: postRegion,
    },
    packages: [
      { key: 'b09-active-shuttle-fail-closed-controls', forward: bind(controls), rollback: bind(controls) },
      { key: 'b09-active-shuttle-fail-closed-track', forward: bind(track), rollback: bind(track) },
    ],
    stages: [
      { stage: 'forward-source-preflight:b09-active-shuttle-fail-closed-controls',
        status: 'PASS', command: ['node', 'preflight', '--report', rel(controlsPreflight)] },
      { stage: 'forward-source-preflight:b09-active-shuttle-fail-closed-track',
        status: 'PASS', command: ['node', 'preflight', '--report', rel(trackPreflight)] },
    ],
    evidenceBindings: [bind(controlsPreflight), bind(trackPreflight), bind(entity), bind(functional)],
    rollbackPoststatePreflights: [bind(trackRollback), bind(controlsRollback)],
    blockTransaction: { exactTargetCount: 19, rollbackPoststatePassCount: 19 },
    entityTransaction: {
      forwardReport: bind(entity), exactCapturedUuidRollbackReady: true,
      compensateBeforeBlockRollback: true,
    },
    functionalAcceptance: { report: bind(functional) },
    rollbackReadiness: {
      status: 'PASS_EXACT_ENTITY_FIRST_THEN_BLOCK_INVERSE',
      broadEntityCleanupAllowed: false, tagOnlyCleanupAllowed: false,
    },
    chunkLease: { release: bind(chunkRelease) },
  };
  writeJson(ledger, ledgerRecord);
  writeJson(qa, {
    status: 'PASS_R12R_EXACT_POSTSTATE_AND_BOUNDED_MAINTENANCE_SHUTTLE_COMMISSIONED',
    releaseNodeId: ledgerRecord.releaseNodeId,
    transactionId: ledgerRecord.transactionId,
    activeShuttleCommissioned: true,
    ledger: bind(ledger),
    summary: { passed: true, failCount: 0 },
    checks: requiredQaChecks.map((id) => ({ id, status: 'PASS' })),
    postSnapshot: { root: rel(postRoot), completeSaveSha256: postComplete, regionSha256: postRegion },
    terminalPost: { completeSaveSha256: postComplete, regionSha256: postRegion },
    terminalCompleteSaveSha256: postComplete,
    releaseIdentity: { completedReleaseIdentitySha256: completed },
    completedReleaseIdentitySha256: completed,
    commissioning: {
      boundedMaintenanceShuttleCommissioned: true,
      fullB09FunicularCommissioned: false,
      passengerOrPublicTransportCommissioned: false,
      rescueTransportCommissioned: false,
    },
    disposition: { liveCallsPerformedByQa: false, worldMutationsPerformedByQa: false },
  });
  return { root, sourceRegions, postRoot, ledger, qa, closure, postComplete, postRegion, completed };
}

function runGenerator(input: ReturnType<typeof fixture>) {
  execFileSync(process.execPath, [
    SCRIPT, '--ledger', rel(input.ledger), '--post-qa', rel(input.qa),
    '--out', rel(input.closure), '--generated-at', '2026-08-22T05:55:00Z',
  ], { cwd: ROOT, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(input.closure, 'utf8'));
}

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('R12 B09 bounded transport commissioning closure', () => {
  it('is truthfully WAITING without live ledger and independent QA', () => {
    const out = path.join(temp, 'wait.json');
    execFileSync(process.execPath, [SCRIPT, '--out', rel(out)], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(out, 'utf8'))).toMatchObject({
      status: 'WAITING_R12_B09_BOUNDED_TRANSPORT_COMMISSIONING',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      activeShuttleCommissioned: false,
      terminalCompleteSaveSha256: null,
      nonclaims: {
        publicTransportCommissioned: false,
        passengerTransportCommissioned: false,
        rescueTransportCommissioned: false,
        fullB09FunicularCommissioned: false,
      },
    });
  });

  it('passes only with the exact terminal ledger/QA/hash/rollback/lease chain', () => {
    const input = fixture('pass');
    const report = runGenerator(input);
    expect(report).toMatchObject({
      status: 'PASS_R12_B09_BOUNDED_ACTIVE_SHUTTLE_COMMISSIONED',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      activeShuttleCommissioned: true,
      terminalCompleteSaveSha256: input.postComplete,
      terminalPost: { regionSha256: input.postRegion },
      releaseIdentity: { completedReleaseIdentitySha256: input.completed },
      summary: { passed: true, waitingCount: 0 },
    });
    expect(report.checks.every(({ status }: { status: string }) => status === 'PASS')).toBe(true);
  });

  it('returns WAITING rather than overclaiming mismatched QA terminal identity', () => {
    const input = fixture('qa-drift');
    const qa = JSON.parse(fs.readFileSync(input.qa, 'utf8'));
    qa.terminalCompleteSaveSha256 = '9'.repeat(64);
    qa.terminalPost.completeSaveSha256 = '9'.repeat(64);
    qa.postSnapshot.completeSaveSha256 = '9'.repeat(64);
    writeJson(input.qa, qa);
    const report = runGenerator(input);
    expect(report.status).toBe('WAITING_R12_B09_BOUNDED_TRANSPORT_COMMISSIONING');
    expect(report.activeShuttleCommissioned).toBe(false);
    expect(report.terminalCompleteSaveSha256).toBeNull();
    expect(report.checks.find(({ id }: { id: string }) => id === 'terminal-complete-save-bound').status)
      .toBe('WAITING');
  });

  it('preserves all public/passenger/rescue/full-funicular nonclaims on PASS', () => {
    const report = runGenerator(fixture('nonclaims'));
    expect(Object.values(report.nonclaims)).toEqual([false, false, false, false, false]);
    expect(report.commissionedSystem.scope)
      .toBe('B09_BOUNDED_MAINTENANCE_SHUTTLE_INDICES_9_THROUGH_25');
  });

  it('is directly accepted as the R12 closure by the terminal R13 verifier', () => {
    const input = fixture('r13-compatible');
    runGenerator(input);
    const out = path.join(input.root, 'r13.json');
    execFileSync(process.execPath, [
      R13, '--final-ledger', rel(input.ledger), '--final-post-qa', rel(input.qa),
      '--r12-commissioning', rel(input.closure), '--world-review-root', rel(input.root),
      '--out', rel(out), '--markdown', rel(path.join(input.root, 'r13.md')),
      '--generated-at', '2026-08-22T06:00:00Z',
    ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(report.status).toBe('PASS_R13_TERMINAL_POST_ACCEPTED');
    expect(report.summary.accepted).toBe(true);
    const r12 = report.dependencyClosures.find((entry: { releaseNodeId: string }) => (
      entry.releaseNodeId === 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'
    ));
    expect(r12).toMatchObject({
      status: 'PASS', activeShuttleCommissioned: true,
      terminalCompleteSaveSha256: input.postComplete,
    });
    expect(report.finalLedger.status).toBe('PASS');
    expect(report.finalIndependentPostQa.status).toBe('PASS');
  });
});
