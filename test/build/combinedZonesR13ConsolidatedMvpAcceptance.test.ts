import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/verify_combined_zones_r13_consolidated_mvp_acceptance.mjs');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'combined-zones-r13-'));
const CURRENT = path.join(temp, 'current-readiness.json');
let report: Record<string, any>;
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');
const writeJson = (filename: string, value: unknown) => {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
};

beforeAll(() => {
  execFileSync(process.execPath, [
    SCRIPT,
    '--out', CURRENT,
    '--markdown', path.join(temp, 'current-readiness.md'),
    '--publication-mode', 'prepublication',
  ], { cwd: ROOT, stdio: 'pipe' });
  report = JSON.parse(fs.readFileSync(CURRENT, 'utf8')) as Record<string, any>;
});

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('Combined Zones R13 consolidated MVP acceptance verifier', () => {
  it('reproduces current readiness byte for byte independently of output paths', () => {
    const out = path.join(temp, 'reproduced-readiness.json');
    const markdown = path.join(temp, 'reproduced-readiness.md');
    execFileSync(process.execPath, [
      SCRIPT,
      '--out', out,
      '--markdown', markdown,
      '--publication-mode', 'prepublication',
    ], {
      cwd: ROOT,
      stdio: 'pipe',
    });
    expect(sha256(out)).toBe(sha256(CURRENT));
  });

  it('binds the exact R13 node, dependency chain, G16-G19, and four exclusions', () => {
    expect(report.release).toMatchObject({
      releaseNodeId: 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
      physicalMutationAuthorized: false,
      externalPublicationPerformed: false,
    });
    expect(report.requiredDependencies.map((item: any) => item.releaseNodeId)).toEqual([
      'CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK',
      'CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT',
      'CZ-R09-PHASE4-PUBLIC-CORE-FITOUT',
      'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
      'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    ]);
    expect(report.gates.map((item: any) => item.id)).toEqual([
      'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT',
      'G17_FUNCTIONAL_POST_QA',
      'G18_MEDIA_AND_PUBLICATION',
      'G19_FINAL_ACCEPTANCE',
    ]);
    expect(report.mvpBoundary.excludedFromAcceptanceDenominator.map((item: any) => item.scope)).toEqual([
      'P1-B12',
      'C2',
      'C3',
      'eight future Empty Eight line openings',
    ]);
    expect(report.mvpBoundary.excludedFromAcceptanceDenominator.every(
      (item: any) => item.excluded === true && item.blocksR13 === false,
    )).toBe(true);
  });

  it('reports all bounded dependencies accepted while terminal publication remains pending', () => {
    expect(report.status).toBe('WAITING_R13_CONSOLIDATED_MVP_ACCEPTANCE');
    expect(report.summary).toMatchObject({
      readyForFinalAcceptance: false,
      requiredDependencyCount: 6,
      passedDependencyCount: 6,
      waitingDependencyCount: 0,
      acceptedEvidenceCount: 51,
      waitingEvidenceCount: 0,
      failedGateCount: 0,
    });
    expect(report.gates).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'G16_IMMUTABLE_POST_AND_ROLLBACK_PREFLIGHT',
        status: 'PASS',
      }),
      expect.objectContaining({ id: 'G17_FUNCTIONAL_POST_QA', status: 'PASS' }),
      expect.objectContaining({ id: 'G18_MEDIA_AND_PUBLICATION', status: 'WAITING' }),
      expect.objectContaining({ id: 'G19_FINAL_ACCEPTANCE', status: 'WAITING' }),
    ]));
    const phases = Object.fromEntries(report.requiredDependencies.map(
      (item: any) => [item.releaseNodeId, item],
    ));
    expect(phases['CZ-R07-PHASE3-SUMMIT-RETURN-FRAMEWORK'].status).toBe('PASS');
    expect(phases['CZ-R08-PHASE4-EMPTY-EIGHT-FITOUT'].status).toBe('PASS');
    expect(phases['CZ-R09-PHASE4-PUBLIC-CORE-FITOUT'].status).toBe('PASS');
    expect(phases['CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT'].closure.status).toBe('PASS');
    expect(phases['CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR'].closure.status).toBe('PASS');
    expect(phases['CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING'].closure.status).toBe('PASS');
  });

  it('binds terminal R11K execution/QA and the exact bounded C1 closure', () => {
    const r11 = report.requiredDependencies.find(
      (item: any) => item.releaseNodeId === 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
    );
    const ledger = r11.evidence.find(
      (item: any) => item.label === 'R11K execution/rollback ledger',
    );
    const qa = r11.evidence.find(
      (item: any) => item.label === 'R11K independent functional post QA',
    );
    expect(ledger).toMatchObject({
      status: 'PASS',
      evidenceStatus: 'EXECUTED_POSTSTATE_VERIFIED_REVERSIBLE',
      postCompleteSaveSha256: '5bc1c7f2b3b37ae9d817e14f5116adfe67ec869a7385dc012ff9660498b282d2',
      rollbackPoststatePreflightCount: 2,
    });
    expect(qa).toMatchObject({
      status: 'PASS',
      sha256: 'd364d1410ad0e9df75e8b2ea4d5ae3da06aae3e39366b10a88250af2dcbb2ee5',
      payloadSha256: 'aa52f2210028ce74b674666d5615bc1b94f27681a319a25fc0efe527861d5938',
    });
    expect(r11.status).toBe('PASS');
    expect(r11.closure).toMatchObject({
      status: 'PASS',
      evidence: {
        sha256: '0778632f01614e7d394a3984326f9de7122c35ec1321c37c79c46108fabde33f',
        evidenceStatus: 'PASS_R11_BOUNDED_C1_MVP_CLOSURE_ACCEPTED',
        releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
      },
    });
  });

  it('keeps historical Phase 0 maps out of G18 and identifies every missing publication input', () => {
    expect(report.bindings.historicalPhase0MapQa).toMatchObject({
      status: 'PASS_EMPTY_EIGHT_SOUTH_ANNEX_PHASE0_MAP_EVIDENCE',
      satisfiesG18: false,
    });
    expect(report.publicationEvidence).toHaveLength(5);
    expect(report.publicationEvidence.every(
      (item: any) => item.status === 'WAITING' && item.exists === false,
    )).toBe(true);
  });

  it('can reach PASS only with exact dependency closures and a cross-bound G18 package', () => {
    const future = path.join(temp, 'future-pass');
    const closures = {
      r10: path.join(future, 'r10-closure.json'),
      r11: path.join(future, 'r11-closure.json'),
      r12: path.join(future, 'r12-commissioning.json'),
    };
    writeJson(closures.r10, {
      status: 'PASS_R10_BOUNDED_MVP_CLOSURE_ACCEPTED',
      releaseNodeId: 'CZ-R10-PHASE4-SECURE-AND-SUMMIT-FITOUT',
    });
    writeJson(closures.r11, {
      status: 'PASS_R11_BOUNDED_C1_MVP_CLOSURE_ACCEPTED',
      releaseNodeId: 'CZ-R11-PHASE5-C1-MULTIMODAL-CORRIDOR',
    });
    writeJson(closures.r12, {
      status: 'PASS_R12_BOUNDED_TRANSPORT_COMMISSIONED',
      releaseNodeId: 'CZ-R12-PHASE5-INTERNAL-TRANSPORT-COMMISSIONING',
    });
    const publicationRoot = path.join(future, 'publication');
    const terminalCompleteSaveSha256 = 'a'.repeat(64);
    const inputs = [
      ['terminal-accepted-post', 'terminal-post-acceptance.json'],
      ['matched-media', 'matched-media-manifest.json'],
      ['terminal-map-qa', 'terminal-map-qa.json'],
      ['database-import-verification', 'database-import-verification.json'],
    ];
    for (const [id, filename] of inputs) {
      writeJson(path.join(publicationRoot, filename), {
        status: `PASS_TEST_${id.toUpperCase().replaceAll('-', '_')}`,
        terminalCompleteSaveSha256,
      });
    }
    const evidenceBindings = Object.fromEntries(inputs.map(([id, filename]) => [id, {
      sha256: sha256(path.join(publicationRoot, filename)),
    }]));
    writeJson(path.join(publicationRoot, 'publication-manifest.json'), {
      status: 'PASS_TEST_PUBLICATION_MANIFEST',
      terminalCompleteSaveSha256,
      evidenceBindings,
    });
    const out = path.join(future, 'result.json');
    execFileSync(process.execPath, [
      SCRIPT,
      '--out', out,
      '--markdown', path.join(future, 'result.md'),
      '--r10-closure', closures.r10,
      '--r11-closure', closures.r11,
      '--r12-commissioning', closures.r12,
      '--publication-root', publicationRoot,
    ], { cwd: ROOT, stdio: 'pipe' });
    const futureReport = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(futureReport.status).toBe('PASS_R13_CONSOLIDATED_MVP_ACCEPTED');
    expect(futureReport.summary).toMatchObject({
      readyForFinalAcceptance: true,
      passedDependencyCount: 6,
      waitingDependencyCount: 0,
      passedGateCount: 4,
      waitingGateCount: 0,
      failedGateCount: 0,
    });
    expect(futureReport.nextEvidenceTasks).toEqual([]);
  });

  it('fails closed if the contract changes the exact R13 exclusions', () => {
    const contract = JSON.parse(fs.readFileSync(
      path.join(ROOT, 'docs/masterplans/05-combined-zones/phase1-release-contract.json'),
      'utf8',
    ));
    const r13 = contract.releaseSequence.find(
      (item: any) => item.id === 'CZ-R13-FINAL-CONSOLIDATED-ACCEPTANCE',
    );
    r13.excludesDeferredScopes = r13.excludesDeferredScopes.filter((scope: string) => scope !== 'C3');
    const alteredContract = path.join(temp, 'altered-contract.json');
    writeJson(alteredContract, contract);
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--release-contract', alteredContract,
      '--out', path.join(temp, 'must-not-pass.json'),
      '--markdown', path.join(temp, 'must-not-pass.md'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });

  it('records the complete read-only safety boundary', () => {
    expect(report.safetyBoundary).toEqual({
      readOnly: true,
      liveCallsPerformed: false,
      worldEditsPerformed: false,
      canonicalBuildopsReadOrModified: false,
      serviceMutationsPerformed: false,
      publicationPerformed: false,
    });
  });
});
