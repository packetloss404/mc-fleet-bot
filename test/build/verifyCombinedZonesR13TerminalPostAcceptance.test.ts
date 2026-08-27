import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/verify_combined_zones_r13_terminal_post_acceptance.mjs');
const RELEASE_CONTRACT = path.join(
  ROOT, 'docs/masterplans/05-combined-zones/phase1-release-contract.json',
);
const R10_CLOSURE = path.join(
  ROOT, 'data/world-review/combined-zones-r10-mvp-closure/r10-mvp-closure.json',
);
const R12Q_LEDGER = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/evidence-ledger.json',
);
const R12Q_QA = path.join(
  ROOT, 'data/world-review/combined-zones-r12q-live-20260822T044855Z/r12q-post-release-qa.json',
);
const R11_CLOSURE = path.join(
  ROOT, 'data/world-review/combined-zones-r11-c1-mvp-closure/r11-c1-mvp-closure.json',
);
const temporaryDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'combined-zones-r13-terminal-post-'),
);
const CURRENT = path.join(temporaryDirectory, 'current-baseline.json');
const CURRENT_R10_CLOSURE = path.join(temporaryDirectory, 'current-contract-r10-closure.json');
const CURRENT_WORLD_REVIEW_ROOT = path.join(temporaryDirectory, 'current-ledger-scan');
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};
const runVerifier = (args: string[], outputName: string) => {
  const out = path.join(temporaryDirectory, `${outputName}.json`);
  const dependencyArgs = args.includes('--r10-closure')
    ? args
    : [...args, '--r10-closure', CURRENT_R10_CLOSURE];
  const isolatedArgs = dependencyArgs.includes('--world-review-root')
    ? dependencyArgs
    : [...dependencyArgs, '--world-review-root', CURRENT_WORLD_REVIEW_ROOT];
  execFileSync(process.execPath, [
    SCRIPT,
    '--out', out,
    '--markdown', path.join(temporaryDirectory, `${outputName}.md`),
    '--generated-at', '2026-08-22T05:05:00Z',
    ...isolatedArgs,
  ], { cwd: ROOT, stdio: 'pipe', timeout: 30_000 });
  return { out, report: JSON.parse(fs.readFileSync(out, 'utf8')) };
};

beforeAll(() => {
  fs.mkdirSync(CURRENT_WORLD_REVIEW_ROOT, { recursive: true });
  const closure = JSON.parse(fs.readFileSync(R10_CLOSURE, 'utf8'));
  closure.bindings.releaseContract = {
    path: RELEASE_CONTRACT,
    sha256: sha256(RELEASE_CONTRACT),
    bytes: fs.statSync(RELEASE_CONTRACT).size,
  };
  writeJson(CURRENT_R10_CLOSURE, closure);
  runVerifier([], 'current-baseline');
});

afterAll(() => fs.rmSync(temporaryDirectory, { recursive: true, force: true }));

function syntheticActiveShuttleFixture() {
  const fixture = path.join(temporaryDirectory, 'synthetic-active-shuttle');
  const scanRoot = path.join(fixture, 'ledger-scan');
  const sourceIdentity = path.join(fixture, 'source-identity.json');
  const sourceRegions = path.join(fixture, 'fresh-source-region');
  const postIdentity = path.join(fixture, 'post-identity.json');
  const postIntake = path.join(fixture, 'post-intake.json');
  const forward = path.join(fixture, 'active-shuttle.forward.txt');
  const manifest = path.join(fixture, 'active-shuttle.release-manifest.json');
  const forwardPreflight = path.join(fixture, 'active-shuttle.forward-source-preflight.json');
  const rollback = path.join(fixture, 'rollback-preflight.json');
  const ledger = path.join(fixture, 'active-shuttle-ledger.json');
  const qa = path.join(fixture, 'active-shuttle-post-qa.json');
  const commissioning = path.join(fixture, 'r12-active-shuttle-commissioning.json');
  const predecessor = JSON.parse(fs.readFileSync(R12Q_LEDGER, 'utf8'));
  const predecessorPostRegionSha256 = JSON.parse(fs.readFileSync(
    path.resolve(ROOT, predecessor.postSnapshot.identity.path), 'utf8',
  )).sha256;
  const freshSourceCompleteSaveSha256 = 'e'.repeat(64);
  const freshSourceRegionSha256 = 'f'.repeat(64);
  const finalPostCompleteSaveSha256 = 'a'.repeat(64);
  const finalPostRegionSha256 = 'b'.repeat(64);
  const completedReleaseIdentitySha256 = 'c'.repeat(64);
  fs.mkdirSync(sourceRegions, { recursive: true });
  writeJson(sourceIdentity, { sha256: freshSourceRegionSha256 });
  writeJson(postIdentity, { sha256: finalPostRegionSha256 });
  writeJson(postIntake, {
    packageIdentity: { completeSaveSha256: finalPostCompleteSaveSha256 },
  });
  fs.writeFileSync(forward, 'fill 1 2 3 1 2 3 minecraft:rail replace minecraft:air strict\n');
  writeJson(manifest, {
    transactionId: 'combined-zones-r12r-active-shuttle-commissioning',
    source: {
      completeSaveSha256: predecessor.postSnapshot.completeSaveSha256,
      regionSnapshotSha256: predecessorPostRegionSha256,
      predecessor: {
        transactionId: predecessor.transactionId,
        executionLedger: { path: R12Q_LEDGER, sha256: sha256(R12Q_LEDGER) },
        postQa: { path: R12Q_QA, sha256: sha256(R12Q_QA) },
        completedReleaseIdentitySha256: predecessor.completedReleaseIdentitySha256,
      },
    },
  });
  writeJson(forwardPreflight, {
    status: 'PASS',
    failurePointsComplete: true,
    operationCount: 1,
    passed: 1,
    failed: 0,
    opsPath: forward,
    opsSha256: sha256(forward),
    regions: sourceRegions,
  });
  writeJson(rollback, { status: 'PASS', passed: 1, failed: 0 });
  const ledgerRecord = {
    status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    transactionId: 'combined-zones-r12r-active-shuttle-commissioning',
    completedAtUtc: '2026-08-22T05:10:00.000Z',
    manifest: { path: manifest, sha256: sha256(manifest) },
    sourceSnapshot: {
      completeSaveSha256: freshSourceCompleteSaveSha256,
      regions: sourceRegions,
      identity: { path: sourceIdentity, sha256: sha256(sourceIdentity) },
    },
    postSnapshot: {
      root: path.join(fixture, 'post-snapshot'),
      completeSaveSha256: finalPostCompleteSaveSha256,
      identity: { path: postIdentity, sha256: sha256(postIdentity) },
      completeSaveIntake: { path: postIntake, sha256: sha256(postIntake) },
    },
    completedReleaseIdentitySha256,
    packages: [{
      key: 'active-shuttle',
      forward: { path: forward, sha256: sha256(forward) },
      rollback: { path: forward, sha256: sha256(forward) },
    }],
    rollbackPoststatePreflights: [{ path: rollback, sha256: sha256(rollback) }],
    evidenceBindings: [{ path: forwardPreflight, sha256: sha256(forwardPreflight) }],
    stages: [{
      stage: 'forward-source-preflight:active-shuttle',
      status: 'PASS',
      command: ['node', 'preflight', '--report', forwardPreflight],
    }],
  };
  writeJson(ledger, ledgerRecord);
  writeJson(qa, {
    status: 'PASS_SYNTHETIC_ACTIVE_SHUTTLE_POST_QA',
    ledger: { path: ledger, sha256: sha256(ledger) },
    postSnapshot: {
      completeSaveSha256: finalPostCompleteSaveSha256,
      regionSha256: finalPostRegionSha256,
    },
    releaseIdentity: { completedReleaseIdentitySha256 },
    qaPayloadSha256: 'd'.repeat(64),
    summary: { passed: true },
  });
  writeJson(commissioning, {
    status: 'PASS_R12_ACTIVE_SHUTTLE_COMMISSIONED',
    releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    activeShuttleCommissioned: true,
    terminalPost: { completeSaveSha256: finalPostCompleteSaveSha256 },
  });
  fs.mkdirSync(scanRoot, { recursive: true });
  return {
    fixture,
    scanRoot,
    ledger,
    qa,
    commissioning,
    manifest,
    freshSourceCompleteSaveSha256,
    freshSourceRegionSha256,
    finalPostCompleteSaveSha256,
  };
}

describe('Combined Zones R13 terminal physical-post acceptance verifier', () => {
  it('reproduces the current WAIT result independently of output paths', () => {
    const reproduced = runVerifier([], 'current-reproduced');
    expect(fs.readFileSync(reproduced.out)).toEqual(fs.readFileSync(CURRENT));
    expect(reproduced.report).toMatchObject({
      status: 'WAITING_R13_TERMINAL_POST_ACCEPTANCE',
      summary: {
        accepted: false,
        requiredDependencyCount: 6,
        acceptedDependencyCount: 5,
        waitingDependencyCount: 1,
      },
    });
    expect(reproduced.report.terminalAcceptancePayloadSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('binds R12Q as the exact passive predecessor and rejects it as active commissioning', () => {
    const report = JSON.parse(fs.readFileSync(CURRENT, 'utf8'));
    expect(report.r12qPassivePhysicalPredecessor).toMatchObject({
      status: 'PASS',
      transactionId: 'combined-zones-r12q-b09-lower-two-turn-rail-closure',
      postCompleteSaveSha256:
        'ff40e5e40c7f144694b80ede6e600a21ed266f0ad4b5069a36c8c78b35478e55',
      postRegionSha256:
        '1732b30ba39b6b81dd88d0985b9018ba399c41bec295d12397004e20fbe97274',
    });
    expect(report.finalLedger.reasons).toEqual(expect.arrayContaining([
      'FINAL_LEDGER_IS_NOT_A_DISTINCT_ACTIVE_SHUTTLE_TRANSACTION',
      'ACTIVE_MANIFEST_R12Q_LEDGER_BINDING_INVALID',
      'ACTIVE_MANIFEST_R12Q_POST_QA_BINDING_INVALID',
      'FINAL_ACTIVE_SHUTTLE_TRANSACTION_IS_NOT_LATER_THAN_R12Q',
    ]));
    expect(report.exclusions.acceptsR12nOrR12qPassiveRailEvidenceAsActiveCommissioning)
      .toBe(false);
  });

  it('waits only on the future R12 active-shuttle transaction and commissioning closure', () => {
    const report = JSON.parse(fs.readFileSync(CURRENT, 'utf8'));
    expect(report.dependencyClosures.map(
      ({ status }: { status: string }) => status,
    )).toEqual(['PASS', 'PASS', 'PASS', 'PASS', 'PASS', 'WAITING']);
    expect(report.requiredPhysicalLedgerOrder).toMatchObject({
      status: 'PASS',
      suppliedFinalLedgerIsLatest: true,
      laterRequiredPhysicalLedgerCount: 0,
      latestRequiredPhysicalLedger: {
        transactionId: 'combined-zones-r12q-b09-lower-two-turn-rail-closure',
      },
    });
    expect(report.safetyBoundary.canonicalR13ReadinessModified).toBe(false);
  });

  it('allows harmless fresh whole-save drift when the manifest binds R12Q and every exact source guard passes', () => {
    const fixture = syntheticActiveShuttleFixture();
    const result = runVerifier([
      '--final-ledger', fixture.ledger,
      '--final-post-qa', fixture.qa,
      '--r12-commissioning', fixture.commissioning,
      '--world-review-root', fixture.scanRoot,
    ], 'synthetic-pass');
    expect(result.report).toMatchObject({
      status: 'PASS_R13_TERMINAL_POST_ACCEPTED',
      finalLedger: {
        status: 'PASS',
        sourceCompleteSaveSha256: fixture.freshSourceCompleteSaveSha256,
        sourceRegionSha256: fixture.freshSourceRegionSha256,
        postCompleteSaveSha256: fixture.finalPostCompleteSaveSha256,
        activeManifestLineage: { status: 'PASS' },
        forwardSourcePreflights: {
          status: 'PASS',
          packageCount: 1,
          exactSourcePreflightCount: 1,
          exactGuardCount: 1,
        },
      },
      finalIndependentPostQa: { status: 'PASS' },
      summary: {
        accepted: true,
        acceptedDependencyCount: 6,
        waitingDependencyCount: 0,
        passedGateCount: 2,
        waitingGateCount: 0,
      },
    });
  });

  it('rejects a stale or missing R12Q manifest binding even when exact source guards pass', () => {
    const fixture = syntheticActiveShuttleFixture();
    const manifest = JSON.parse(fs.readFileSync(fixture.manifest, 'utf8'));
    manifest.source.predecessor.executionLedger.sha256 = '0'.repeat(64);
    writeJson(fixture.manifest, manifest);
    const ledger = JSON.parse(fs.readFileSync(fixture.ledger, 'utf8'));
    ledger.manifest.sha256 = sha256(fixture.manifest);
    writeJson(fixture.ledger, ledger);
    const qa = JSON.parse(fs.readFileSync(fixture.qa, 'utf8'));
    qa.ledger.sha256 = sha256(fixture.ledger);
    writeJson(fixture.qa, qa);
    const result = runVerifier([
      '--final-ledger', fixture.ledger,
      '--final-post-qa', fixture.qa,
      '--r12-commissioning', fixture.commissioning,
      '--world-review-root', fixture.scanRoot,
    ], 'synthetic-stale-r12q-binding');
    expect(result.report.status).toBe('WAITING_R13_TERMINAL_POST_ACCEPTANCE');
    expect(result.report.finalLedger.reasons).toEqual(expect.arrayContaining([
      'ACTIVE_MANIFEST_R12Q_LEDGER_BINDING_INVALID',
    ]));
    expect(result.report.finalLedger.forwardSourcePreflights.status).toBe('PASS');
  });

  it('fails terminal ordering when a later required physical ledger exists', () => {
    const fixture = syntheticActiveShuttleFixture();
    writeJson(path.join(fixture.scanRoot, 'later', 'evidence-ledger.json'), {
      status: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
      transactionId: 'combined-zones-later-required-test-release',
      completedAtUtc: '2026-08-22T05:11:00.000Z',
      postSnapshot: { completeSaveSha256: 'e'.repeat(64) },
    });
    const result = runVerifier([
      '--final-ledger', fixture.ledger,
      '--final-post-qa', fixture.qa,
      '--r12-commissioning', fixture.commissioning,
      '--world-review-root', fixture.scanRoot,
    ], 'synthetic-later-ledger');
    expect(result.report).toMatchObject({
      status: 'WAITING_R13_TERMINAL_POST_ACCEPTANCE',
      requiredPhysicalLedgerOrder: {
        status: 'WAITING',
        suppliedFinalLedgerIsLatest: false,
        laterRequiredPhysicalLedgerCount: 1,
      },
    });
  });

  it('fails closed on a tampered declared dependency hash', () => {
    const altered = JSON.parse(fs.readFileSync(R11_CLOSURE, 'utf8'));
    altered.bindings.r11kPostQa.sha256 = '0'.repeat(64);
    const alteredClosure = path.join(temporaryDirectory, 'altered-r11-closure.json');
    writeJson(alteredClosure, altered);
    const result = runVerifier([
      '--r11-closure', alteredClosure,
    ], 'tampered-r11-closure');
    const r11 = result.report.dependencyClosures.find(
      ({ releaseNodeId }: { releaseNodeId: string }) => (
        releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'
      ),
    );
    expect(r11.status).toBe('WAITING');
    expect(r11.reasons).toContain('DEPENDENCY_DECLARED_SHA256_MISMATCH');
  });
});
