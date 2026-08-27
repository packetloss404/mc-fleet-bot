import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const EVIDENCE = 'data/world-review/mp11-c01-public-independent-return-02-live-20260827T023000Z';
const SNAPSHOT = 'data/worldsnap-mp11-c01-public-independent-return-02-exec-post-20260827T023000Z';
const made: string[] = [];
const hash = (filename: string) => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
afterEach(() => made.splice(0).forEach((entry) => fs.rmSync(entry, { recursive: true, force: true })));

describe('C01 Return-02 canonical endpoint overlay correction', () => {
  it('uses canonical targets on shared contract cells and seals a separate read-only supersession record', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-post-qa-correction-'));
    made.push(temp);
    const originalQa = path.join(ROOT, EVIDENCE, 'independent-post-release-qa', 'mp11-c01-public-independent-return-02-post-qa.json');
    const ledger = path.join(ROOT, EVIDENCE, 'mp11-c01-public-independent-return-02-guarded-release-ledger.json');
    const originalQaHash = hash(originalQa);
    const ledgerHash = hash(ledger);
    const corrected = path.join(temp, 'corrected-qa');
    const correction = path.join(temp, 'correction-ledger');
    const manifest = `${EVIDENCE}/rebound/compile/mp11-c01-public-independent-return-02.manifest.json`;
    const postIntake = `${EVIDENCE}/post-complete-save-intake.json`;

    execFileSync(process.execPath, [
      'scripts/qa_mp11_c01_public_independent_return_02_post_release.mjs',
      '--snapshot', SNAPSHOT,
      '--manifest', manifest,
      '--ledger', `${EVIDENCE}/mp11-c01-public-independent-return-02-guarded-release-ledger.json`,
      '--post-intake', postIntake,
      '--out', corrected,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const correctedQa = JSON.parse(fs.readFileSync(path.join(corrected, 'mp11-c01-public-independent-return-02-post-qa.json'), 'utf8'));
    expect(correctedQa.status).toBe('PASS_C01_RETURN02_IMMUTABLE_POST_QA');
    expect(correctedQa.checks.endpointAndProtectedSwitchbackInvariants.hits).toEqual([]);
    expect(correctedQa.checks.endpointAndProtectedSwitchbackInvariants.canonicalTargetOverlayCellCount).toBe(60);
    expect(correctedQa.checks.endpointAndProtectedSwitchbackInvariants.legacyContractCellCount).toBe(60);

    execFileSync(process.execPath, [
      'scripts/finalize_mp11_c01_public_independent_return_02_post_qa_correction.mjs',
      '--original-qa', `${EVIDENCE}/independent-post-release-qa/mp11-c01-public-independent-return-02-post-qa.json`,
      '--corrected-qa', path.join(corrected, 'mp11-c01-public-independent-return-02-post-qa.json'),
      '--ledger', `${EVIDENCE}/mp11-c01-public-independent-return-02-guarded-release-ledger.json`,
      '--manifest', manifest,
      '--snapshot', SNAPSHOT,
      '--post-intake', postIntake,
      '--out', correction,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    const record = JSON.parse(fs.readFileSync(path.join(correction, 'mp11-c01-public-independent-return-02-post-qa-correction-ledger.json'), 'utf8'));
    expect(record.status).toBe('EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE_BY_CORRECTED_IMMUTABLE_QA');
    expect(record.correctionScope.originalEndpointOnlyFailureCount).toBe(10);
    expect(record.preservedOriginalEvidence.originalQa.sha256).toBe(originalQaHash);
    expect(record.preservedOriginalEvidence.guardedReleaseLedger.sha256).toBe(ledgerHash);
    expect(hash(originalQa)).toBe(originalQaHash);
    expect(hash(ledger)).toBe(ledgerHash);
  }, 60000);
});
