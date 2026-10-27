import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-bkr-c01-liner-design-'));
const out = path.join(temp, 'design');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11/BKR C01 finite gravity liner design', () => {
  it('binds one finite dry return-disjoint component with an exact no-falling inverse but no physical authority', () => {
    const result = JSON.parse(execFileSync(process.execPath, [
      'scripts/design_mp11_bkr_c01_finite_gravity_liner_01.mjs', '--out', out,
    ], { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-bkr-c01-finite-gravity-liner-design-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.status).toBe('STATIC_DESIGN_COMPLETE_PHYSICAL_OPERATIONS_REMAIN_DENIED');
    expect(report.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
    expect(report.safetyBoundary.rollbackOperationFilesEmitted).toBe(0);
    expect(report.prerequisites.expandedFiniteComponentCount).toBe(12);
    expect(report.prerequisites.unboundedComponentCount).toBe(0);
    expect(report.prerequisites.independentReturnDisjointFromCurrentInteriorHalo).toBe(true);
    expect(report.selectedFiniteLiner.componentId).toBe('EXP-G11');
    expect(report.selectedFiniteLiner.sourceComponentCellCount).toBe(34);
    expect(report.selectedFiniteLiner.fullInteractionHalo.fluidCellCount).toBe(0);
    expect(report.selectedFiniteLiner.fullInteractionHalo.blockEntityCount).toBe(0);
    expect(report.selectedFiniteLiner.fullInteractionHalo.verifiedReturnHaloIntersectionCount).toBe(0);
    expect(report.selectedFiniteLiner.fullInteractionHalo.endpointVolumeIntersectionCount).toBe(0);
    expect(report.selectedFiniteLiner.forwardDesign.operationCount).toBe(34);
    expect(report.selectedFiniteLiner.rollbackDesign.operationCount).toBe(34);
    expect(report.selectedFiniteLiner.rollbackDesign.exactReverseOfForward).toBe(true);
    expect(report.selectedFiniteLiner.rollbackDesign.supportCheckPassCount).toBe(34);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-finite-gravity-liner-plan.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-bkr-c01-finite-gravity-liner-order.svg'))).toBe(true);
  });
});
