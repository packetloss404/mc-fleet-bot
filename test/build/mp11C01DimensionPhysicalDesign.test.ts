import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'mp11-c01-dimension-physical-'));
const out = path.join(temp, 'design');
afterAll(() => fs.rmSync(temp, { recursive: true, force: true }));

describe('MP11 C01 dimension physical design', () => {
  it('selects only the dry public switchback as a design input and denies operations', () => {
    const result = JSON.parse(execFileSync(process.execPath, ['scripts/design_mp11_c01_dimension_physical_01.mjs', '--out', out], { cwd: ROOT, encoding: 'utf8' }));
    const report = JSON.parse(fs.readFileSync(path.join(out, 'mp11-c01-dimension-physical-01.json'), 'utf8'));
    expect(result.mutationAuthority).toBe(false);
    expect(report.status).toBe('DESIGN_INPUT_ONLY_PUBLIC_VERTICAL_SMALLEST_ISOLABLE_DEFECT');
    expect(report.safetyBoundary.forwardOperationFilesEmitted).toBe(0);
    expect(report.selectedDesignInput.defectStationCount).toBe(19);
    expect(report.selectedDesignInput.interfaceInventory.containerBoundary.excludedServiceContainerCount).toBe(78);
    expect(report.selectedDesignInput.interfaceInventory.return.independentReturnStatus).toBe('NOT_EVIDENCED');
    expect(fs.existsSync(path.join(out, 'mp11-c01-dimension-physical-01-plan.svg'))).toBe(true);
    expect(fs.existsSync(path.join(out, 'mp11-c01-dimension-physical-01-elevation.svg'))).toBe(true);
  });
});
