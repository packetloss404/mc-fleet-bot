import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const TEMP = fs.mkdtempSync(path.join(os.tmpdir(), 'c01-arrival-auth-'));
const OUT = path.join(TEMP, 'out');
let report: any;

describe('C01 arrival-wayfinding authorization audit', () => {
  beforeAll(() => {
    execFileSync(process.execPath, ['scripts/audit_sys03_mp11_c01_arrival_wayfinding_authorization_02.mjs', '--out', OUT], { cwd: ROOT, stdio: 'pipe', timeout: 180_000 });
    report = JSON.parse(fs.readFileSync(path.join(OUT, 'sys03-mp11-c01-arrival-wayfinding-authorization-audit-02.json'), 'utf8'));
  }, 190_000);
  afterAll(() => fs.rmSync(TEMP, { recursive: true, force: true }));
  it('preserves exact C01-NEXT-01 fabric and validates the three bounded source sites', () => {
    expect(report.proposedSites.cells).toEqual([{ x: 744, y: 42, z: -81 }, { x: 748, y: 42, z: -81 }, { x: 760, y: 42, z: -81 }]);
    expect(report.proposedSites.localHalo).toMatchObject({ cellCount: 81, fluidOrWaterloggedCount: 0, gravityCount: 0, blockEntityCount: 0, savedEntityCount: 0 });
    expect(report.retainedProtectedInterfaces.c01Next01).toMatchObject({ acceptedTargetCount: 9, currentTargetExactCount: 9, candidateHaloOverlapCount: 0, disposition: 'PRESERVED_AND_DISJOINT' });
  });
  it('rejects inferred extension authority and emits no operation', () => {
    expect(report).toMatchObject({ status: 'NO_GO_EXECUTION_AUTHORIZATION_NOT_ESTABLISHED', mutationAuthority: false, safetyBoundary: { operationsEmitted: false, executionAuthorized: false } });
    expect(report.authorityChain).toMatchObject({ standingScopeAuthority: 'PRESENT_SCOPE_ONLY', candidateCanonicalTargetState: expect.stringMatching(/^MISSING/), candidateExactOwnerAndInterfaceAcceptance: expect.stringMatching(/^MISSING/) });
    expect(report.recommendation.decision).toBe('NO_GO');
  });
});
