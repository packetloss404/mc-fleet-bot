import { execFileSync, spawnSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const MANIFEST = path.join(ROOT, 'data/buildops/sys03-r10-current-mp06-post-20260826T143902Z/sys03-r10-high16-descending-bypass-current-source.manifest.json');
const SNAPSHOT = 'data/worldsnap-mp06-endpoint-elevated-crossing-post-20260826T143902Z';
const GENERATOR = 'scripts/generate_sys03_r10_high16_descending_bypass_protocol.mjs';
const QA = 'scripts/qa_sys03_r10_high16_descending_bypass_independent_post.mjs';
const STATIC_QA = 'scripts/qa_sys03_r10_high16_descending_bypass_independent_static.mjs';
const FINALIZER = 'scripts/finalize_sys03_r10_high16_descending_bypass_release.mjs';
const ACCEPTANCE = 'scripts/accept_sys03_r10_high16_descending_bypass_owner_interface_renewal.mjs';
const APPROVALS = path.join(ROOT, 'data/world-review/sys03-r10-current-mp06-post-20260826T143902Z/release-protocol/sys03-r10-high16-descending-bypass-standing-authority-approvals.json');
const DIRECTORY = fs.mkdtempSync(path.join(os.tmpdir(), 'sys03-r10-high16-protocol-'));
const PROTOCOL_DIR = path.join(DIRECTORY, 'protocol');
const CONTRACT = path.join(PROTOCOL_DIR, 'sys03-r10-high16-descending-bypass-owner-interface-proposal.json');

beforeAll(() => {
  execFileSync(process.execPath, [GENERATOR, '--manifest', MANIFEST, '--out-dir', PROTOCOL_DIR], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}, 30_000);

afterAll(() => fs.rmSync(DIRECTORY, { recursive: true, force: true }));

describe('SYS-03 R10 High-16 descending bypass release protocol', () => {
  it('is an exact, source-bound owner/interface proposal with no mutation authority', () => {
    const contract = JSON.parse(fs.readFileSync(CONTRACT, 'utf8'));
    expect(contract).toMatchObject({
      status: 'PROPOSED_EXACT_OWNER_INTERFACE_RENEWAL_AWAITING_ACCEPTANCE',
      mutationAuthority: false,
      civilOnly: true,
      passengerServiceCommissioned: false,
      exactGeometry: {
        route: { crossSection: '6x6', stations: 46, core: { count: 3257 } },
        shell: { count: 1696 },
        halo: { count: 1968 },
        interaction: { count: 6921 },
      },
      gravityContract: {
        totalChains: 107,
        coreTargets: 36,
        shellTargets: 37,
        retainedHaloChains: 34,
        failureAction: 'ABORT_BEFORE_STAGE_1',
      },
    });
    expect(contract.interfaces.retainedHigh15Ingress.count).toBe(30);
    expect(contract.interfaces.high15Migration.count).toBe(36);
    expect(contract.interfaces.preservedHigh15RouteAir.count).toBe(36);
    expect(contract.interfaces.protectedCobaltWestlightHeadhouse.observedTargetOverlap).toEqual([]);
    expect(contract.stagedOperationContract).toMatchObject({
      exactInverse: true,
      forward: [{ id: 'shell-gravity-lock', count: 1638 }, { id: 'core-clear-top-down', count: 3227 }],
      rollback: [{ id: 'core-clear-top-down', count: 3227 }, { id: 'shell-gravity-lock', count: 1638 }],
    });
  });

  it('has an independent post QA that fails closed on the pre-release source', () => {
    const output = path.join(DIRECTORY, 'pre-release-qa.json');
    const markdown = path.join(DIRECTORY, 'pre-release-qa.md');
    const run = spawnSync(process.execPath, [QA, '--post', SNAPSHOT, '--manifest', MANIFEST,
      '--contract', CONTRACT, '--out-json', output, '--out-md', markdown], { cwd: ROOT, encoding: 'utf8' });
    expect(run.status).toBe(1);
    const report = JSON.parse(fs.readFileSync(output, 'utf8'));
    expect(report).toMatchObject({
      status: 'FAIL', civilOnly: true, passengerServiceCommissioned: false,
      readOnly: true, worldMutated: false, rconCalled: false,
    });
    expect(report.checks.allStageTargets).toBe(false);
  }, 30_000);

  it('independently accepts the bound source guards, interfaces, and gravity before release', () => {
    const acceptance = path.join(DIRECTORY, 'static-accepted-owner-interface-renewal.json');
    execFileSync(process.execPath, [ACCEPTANCE, '--manifest', MANIFEST, '--proposal', CONTRACT,
      '--source', SNAPSHOT, '--approvals', APPROVALS, '--accepted-at', '2026-08-26T15:16:00Z', '--out', acceptance], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    const output = path.join(DIRECTORY, 'independent-static-qa.json');
    execFileSync(process.execPath, [STATIC_QA, '--source', SNAPSHOT, '--manifest', MANIFEST,
      '--contract', acceptance, '--out', output], { cwd: ROOT, stdio: 'pipe' });
    expect(JSON.parse(fs.readFileSync(output, 'utf8'))).toMatchObject({
      status: 'PASS',
      checks: { operationCount: true, sourceGuards: true, stageInverse: true, interfaces: true, protectedOverlap: true, gravity: true },
      civilOnly: true, passengerServiceCommissioned: false, readOnly: true, worldMutated: false, rconCalled: false,
    });
  }, 30_000);

  it('rejects status-only evidence and a reused source as post-state evidence', () => {
    const evidence = path.join(DIRECTORY, 'evidence');
    fs.mkdirSync(evidence, { recursive: true });
    const contractBytes = fs.readFileSync(CONTRACT);
    const adoption = path.join(DIRECTORY, 'adoption.json');
    fs.writeFileSync(adoption, `${JSON.stringify({
      status: 'ACCEPTED_EXACT_OWNER_INTERFACE_RENEWAL',
      mutationAuthority: false,
      civilOnly: true,
      passengerServiceCommissioned: false,
      sourceBinding: {
        proposalSha256: crypto.createHash('sha256').update(contractBytes).digest('hex'),
      },
    })}\n`);
    for (const name of ['source-complete-save-intake.json', 'post-complete-save-intake.json',
      'independent-static-qa.json', 'shell-forward-source-preflight.json', 'core-forward-projected-preflight.json',
      'shell-projected-rollback-preflight.json', 'core-projected-rollback-preflight.json', 'block-entity-clearance.json',
      'shell-live-entity-clearance.json', 'core-live-entity-clearance.json', 'core-rollback-poststate-preflight.json',
      'shell-rollback-poststate-preflight.json', 'independent-post-qa.json']) {
      fs.writeFileSync(path.join(evidence, name), '{"status":"PASS"}\n');
    }
    for (const name of ['shell-forward-strict-dry-run.json', 'core-forward-strict-dry-run.json',
      'core-rollback-strict-dry-run.json', 'shell-rollback-strict-dry-run.json']) {
      fs.writeFileSync(path.join(evidence, name), '{"status":"dry_run"}\n');
    }
    for (const name of ['shell-forward-execution.json', 'core-forward-execution.json']) {
      fs.writeFileSync(path.join(evidence, name), '{"status":"complete","strictNoop":true}\n');
    }
    expect(() => execFileSync(process.execPath, [FINALIZER, '--evidence', evidence, '--manifest', MANIFEST,
      '--contract', CONTRACT, '--adoption-record', adoption, '--source', SNAPSHOT, '--post', SNAPSHOT,
      '--out', path.join(DIRECTORY, 'ledger.json')], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  }, 30_000);

  it('requires exact staged projection, entity gates, journals, and post-QA bindings before sealing', () => {
    const source = fs.readFileSync(path.join(ROOT, FINALIZER), 'utf8');
    expect(source).toContain('source and post snapshots must be different immutable captures');
    expect(source).toContain('core-forward-projected-preflight.json');
    expect(source).toContain('core-projected-rollback-preflight.json');
    expect(source).toContain('shell-projected-rollback-preflight.json');
    expect(source).toContain('shell-rollback-poststate-preflight.json');
    expect(source).toContain('sourceOverlays?.artifacts');
    expect(source).toContain('staticQa.manifest?.sha256');
    expect(source).toContain('staticQa.sourceCaptureManifestSha256 === captureHash(source)');
    expect(source).toContain('blockEntities?.inInteractionEnvelope === 0 && staticEntities.savedEntitiesAtCapture?.inInteractionEnvelope === 0');
    expect(source).toContain('staticEntities.protectedCore?.operationOverlap?.length === 0');
    expect(source).toContain('interactionCoordinateSetSha256');
    expect(source).toContain('forward-stream-journal.jsonl');
    expect(source).toContain('qa.contractSha256');
    const qa = fs.readFileSync(path.join(ROOT, QA), 'utf8');
    expect(qa).toContain('contractSha256:sha(fs.readFileSync(absolute(contractPath)))');
  });

  it('accepts only the three exact scoped approvals and remains non-authorizing', () => {
    const acceptance = path.join(DIRECTORY, 'accepted-owner-interface-renewal.json');
    execFileSync(process.execPath, [ACCEPTANCE, '--manifest', MANIFEST, '--proposal', CONTRACT,
      '--source', SNAPSHOT, '--approvals', APPROVALS, '--accepted-at', '2026-08-26T15:16:00Z', '--out', acceptance], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    expect(JSON.parse(fs.readFileSync(acceptance, 'utf8'))).toMatchObject({
      status: 'ACCEPTED_EXACT_OWNER_INTERFACE_RENEWAL',
      mutationAuthority: false,
      civilOnly: true,
      passengerServiceCommissioned: false,
      acceptedInterfaces: {
        retainedHigh15Ingress: { count: 30, disposition: 'RETAINED_NOT_TARGETED' },
        high15Migration: { count: 36, disposition: 'TRANSFER_ONLY_AFTER_SHELL_LOCK' },
        preservedHigh15RouteAir: { count: 36, disposition: 'RETAINED_NOT_TARGETED' },
        protectedCobaltWestlightOverlap: { count: 0, disposition: 'EXCLUDED' },
      },
      gravity: { chains: 107, failureAction: 'ABORT_BEFORE_STAGE_1' },
    });
    const invalid = path.join(DIRECTORY, 'invalid-approvals.json');
    const drift = JSON.parse(fs.readFileSync(APPROVALS, 'utf8'));
    drift.approvals[1].exactSets.migration.count = 35;
    fs.writeFileSync(invalid, `${JSON.stringify(drift)}\n`);
    expect(() => execFileSync(process.execPath, [ACCEPTANCE, '--manifest', MANIFEST, '--proposal', CONTRACT,
      '--source', SNAPSHOT, '--approvals', invalid, '--accepted-at', '2026-08-26T15:16:00Z',
      '--out', path.join(DIRECTORY, 'invalid-acceptance.json')], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  }, 30_000);
});
