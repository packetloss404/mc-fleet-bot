import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-return-'));
const out = path.join(temp, 'survey');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 portal expanded topology and second return survey', () => {
  it('fully classifies former boundary components but holds without a disjoint second return', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/survey_mp11_bkr_c01_portal_topology_and_second_return_03.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-portal-topology-second-return-03.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.expandedGravityTopology.originalBoundaryComponentCount).toBe(14);
    expect(report.expandedGravityTopology.expandedComponentCount).toBe(12);
    expect(report.expandedGravityTopology.unboundedComponentCount).toBe(0);
    expect(report.currentReturn.stationCount).toBe(127);
    expect(report.independentReturnSurvey.status).toBe('NO_SECOND_INDEPENDENT_PORTAL_RETURN_IN_SOURCE_BOUND_STUDY');
    expect(report.physicalScopeDisposition.physicalOperationMayBeCompiled).toBe(false);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-portal-topology-second-return-map.svg'))).toBe(true);
  });
});
