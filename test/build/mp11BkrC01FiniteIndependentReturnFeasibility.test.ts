import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-feasibility-'));
const out = path.join(temp, 'feasibility');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 finite independent-return feasibility', () => {
  it('searches only hazard-free finite geometry and emits no physical authority', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/design_mp11_bkr_c01_finite_independent_return_feasibility_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-finite-independent-return-feasibility-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.corridorProfile.clearEnvelope).toMatch(/3-wide/);
    expect(report.currentReturn.interiorHaloCellCount).toBeGreaterThan(0);
    expect(report.blockEntityExclusion.blockEntityCount).toBeGreaterThan(0);
    expect(['FINITE_SOURCE_BOUND_INDEPENDENT_RETURN_FEASIBILITY_INPUT_ONLY', 'NO_FINITE_SOURCE_BOUND_INDEPENDENT_RETURN_CORRIDOR_IN_BOUNDED_DOMAIN']).toContain(report.status);
    if (report.status.startsWith('FINITE_')) {
      expect(report.feasibility.allHazardsExcluded).toBe(true);
      expect(report.feasibility.exactContractsStillRequired).toHaveLength(3);
    } else expect(report.feasibility.exactAbsence).toMatch(/No 3×3 finite corridor/);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-finite-independent-return-feasibility-map.svg'))).toBe(true);
  });
});
