import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-scout-'));
const out = path.join(temp, 'scout');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 independent portal-return existing-geometry scout', () => {
  it('does not invent a second path when the exclusion-safe domain has none', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/scout_mp11_bkr_c01_independent_portal_return_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-independent-portal-return-scout-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.status).toBe('NO_SOURCE_VALID_INDEPENDENT_PORTAL_RETURN_CANDIDATE_IN_BOUNDED_DOMAIN');
    expect(report.exclusions.currentReturnInteriorHaloCellCount).toBeGreaterThan(0);
    expect(report.scoutResult.exactAbsence).toMatch(/No existing safe normal-walk/);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-independent-portal-return-scout-map.svg'))).toBe(true);
  });
});
