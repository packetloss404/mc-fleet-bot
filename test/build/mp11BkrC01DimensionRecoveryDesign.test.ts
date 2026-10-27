import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-dimension-'));
const out = path.join(temp, 'design');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 dimension-recovery whole-scope design', () => {
  it('binds the real circulation deficit but emits no physical operations', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/design_mp11_bkr_c01_dimension_recovery_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-dimension-recovery-design-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.mode).toBe('READ_ONLY_DESIGN_GATE_NO_OPERATIONS');
    expect(report.status).toBe('HOLD_SOURCE_BOUND_WHOLE_SCOPE_DESIGN_REQUIRED_BEFORE_PHYSICAL_DIMENSION_RECOVERY');
    expect(report.scopes).toHaveLength(4);
    expect(report.scopes.find((scope: { id: string }) => scope.id === 'portal').observedEnvelope).toBe('2-wide × 2-high');
    expect(report.exactServicePinchBoundary.allContainersConfirmed).toBe(true);
    expect(report.safetyEnvelope.serviceContainerCount).toBeGreaterThanOrEqual(69);
    expect(report.firstPhysicalPackageCondition.permittedPurpose).toMatch(/gravity containment/i);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-dimension-recovery-coordinate-map.svg'))).toBe(true);
  });
});
