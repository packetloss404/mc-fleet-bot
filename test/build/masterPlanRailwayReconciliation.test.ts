import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts/validate_master_plan_railway_reconciliation.mjs');
const INPUT = path.join(ROOT, 'docs/masterplans/master-plan-railway-report-input.json');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'master-plan-railway-'));
const sha256 = (filename: string) => crypto.createHash('sha256')
  .update(fs.readFileSync(filename)).digest('hex');

afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

function run(input: string, out: string) {
  execFileSync(process.execPath, [SCRIPT, '--input', input, '--out', out], {
    cwd: ROOT,
    stdio: 'pipe',
  });
  return JSON.parse(fs.readFileSync(out, 'utf8'));
}

describe('Master Plan Railway cross-town reconciliation', () => {
  it('accepts all thirteen plans with exact source/evidence bindings', () => {
    const report = run(INPUT, path.join(temp, 'pass.json'));
    expect(report).toMatchObject({
      status: 'PASS_MASTER_PLAN_RAILWAY_RECONCILIATION_VALID',
      valid: true,
      summary: {
        planCount: 13,
        dependencyStageCount: 10,
        errorCount: 0,
      },
      safetyBoundary: {
        readOnlyValidation: true,
        liveCallsPerformed: false,
        worldMutationPerformed: false,
        databaseMutationPerformed: false,
        serviceMutationPerformed: false,
        publicationPerformed: false,
      },
    });
    expect(report.summary.passedBindingCheckCount).toBe(report.summary.bindingCheckCount);
    expect(report.summary.passedStructuralCheckCount).toBe(report.summary.structuralCheckCount);
  });

  it('is deterministic across output paths', () => {
    const first = path.join(temp, 'deterministic-a.json');
    const second = path.join(temp, 'nested/deterministic-b.json');
    run(INPUT, first);
    run(INPUT, second);
    expect(sha256(second)).toBe(sha256(first));
  });

  it('fails closed on a stale evidence binding', () => {
    const staleInput = path.join(temp, 'stale-input.json');
    const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
    input.plans[0].sourcePlan.sha256 = '0'.repeat(64);
    fs.writeFileSync(staleInput, `${JSON.stringify(input, null, 2)}\n`);
    expect(() => execFileSync(process.execPath, [
      SCRIPT,
      '--input', staleInput,
      '--out', path.join(temp, 'must-fail.json'),
    ], { cwd: ROOT, stdio: 'pipe' })).toThrow();
  });

  it('keeps the railway and construction claims truthful', () => {
    const input = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
    expect(input.railway).toMatchObject({
      currentStatus: 'NO_CONTINUOUS_CROSS_TOWN_PASSENGER_RAILWAY_PROVEN',
      proposedDesign: { status: 'PROPOSED_NOT_SET_OUT_NOT_BUILT' },
    });
    expect(input.authority).toMatchObject({
      planningOnly: true,
      worldEditAuthorizedByThisArtifact: false,
      worldMutationPerformed: false,
      databaseMutationPerformed: false,
      publicationPerformed: false,
    });
    expect(input.plans).toHaveLength(13);
    expect(input.plans.every((plan: any) => (
      plan.built.length > 0
        && plan.unbuiltOrUnproven.length > 0
        && plan.proposedRemainingDesign.length > 0
        && plan.hardBoundary.length > 0
    ))).toBe(true);
  });
});
