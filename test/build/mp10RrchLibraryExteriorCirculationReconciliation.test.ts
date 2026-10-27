import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp10-exterior-reconcile-'));
const out = path.join(temp, 'report');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP10 library exterior circulation reconciliation', () => {
  it('retains the built exterior chain and rejects restoration of historic core treads', () => {
    const stdout = execFileSync(process.execPath, [
      'scripts/reconcile_mp10_rrch_library_exterior_circulation_02.mjs',
      '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
    const result = JSON.parse(stdout);
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp10-rrch-library-exterior-circulation-reconciliation-02.json'), 'utf8'));
    expect(result.status).toBe('EXTERIOR_ROUTE_RETAINS_CURRENT_FUNCTIONAL_CIRCULATION_NO_INTERNAL_CORE_MUTATION');
    expect(report.checks.exteriorTargetSummary).toEqual({ count: 245, passed: 245, failed: 0 });
    expect(report.checks.oneCellHaloFluidGravityCount).toBe(0);
    expect(report.checks.historicInternalHeadroom).toEqual({ count: 5, retainedAir: 5 });
    expect(report.checks.routeSummary).toEqual({ pairs: 6, directions: 12, passed: 12, failed: 0 });
  });
});
